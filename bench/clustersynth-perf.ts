#!/usr/bin/env node
// bench/clustersynth-perf.ts — Per-window cost benchmark for the Tessera engine
// against clustersynth-emitted TopologySnapshot fixtures.
//
// Drives the load-bearing engine primitives at each scale tier:
//   - attributeCommonMode (end-to-end against the fixture topology)
//   - updateBettingState (per-shard, Family A betting e-process)
//   - multivariate Welford (per-shard at p=11)
//   - MMD primitive (rbf cross-terms over a pool of m=500)
//   - eBenjaminiHochberg (fleet-level e-BH FDR)
//
// Output: CSV + Markdown under bench/results/<ISO-timestamp>.{csv,md}.
//
// Usage:
//   pnpm bench:clustersynth                          # S0/S1/S2/C0 by default
//   pnpm bench:clustersynth --include-s3             # adds S3
//   pnpm bench:clustersynth --out <dir>              # override output directory
//
// See clustersynth coordination/specs/Q-R04-SPEC.md for full design + acceptance.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { TopologySnapshot } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import {
  freshBettingState,
  updateBettingState,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import {
  rbf,
  computeUt,
  BASELINE_POOL_SIZE,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/sequential-mmd';
import { attributeCommonMode } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import type { FiredShardEvent } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

// ── Config ───────────────────────────────────────────────────────────
const BENCH_P = 11;
const MMD_POOL = BASELINE_POOL_SIZE;     // m = 500
const MMD_WINDOW_B = 30;                 // engine default streaming window size
const MMD_BANDWIDTH = Math.sqrt(2 * 11); // median-heuristic equivalent for p=11 unit-Gaussian (R05.M1)
const ALPHA_BETTING = 0.005;
const Q_FDR = 0.05;
const MAX_HOP_DISTANCE = 2;
const N_FIRES = 10;
const WARMUP_ITERS = 3;
const MEASURE_ITERS = 10;
// At S3 the full-computeUt loop runs N=72,000 × ~50 µs × 13 iters ≈ 47 s/fixture.
// Cut measurement iterations at S3-class scale to keep wall time tractable.
const FULL_MMD_MEASURE_ITERS_LARGE = 3;
const FULL_MMD_WARMUP_ITERS_LARGE = 1;
const LARGE_THRESHOLD = 20_000; // shards above which we use the reduced iter count

// ── Fixture catalog ──────────────────────────────────────────────────
const SUBSTRATE = join(__dirname, '..', 'test', '_substrate');
interface FixtureSpec { name: string; path: string; required: boolean }
const FIXTURES: FixtureSpec[] = [
  { name: 'gb200-s0-72', path: 'clustersynth-gb200-s0.json', required: true },
  { name: 'gb200-s1-720', path: 'clustersynth-gb200-s1.json', required: true },
  { name: 'gb200-s2-7200', path: 'clustersynth-gb200-s2.json', required: true },
  { name: 'gb200-c0-28800', path: 'clustersynth-gb200-c0.json', required: false },
  { name: 'gb200-s3-72000', path: 'clustersynth-gb200-s3.json', required: false },
];

interface Measurement {
  fixture: string;
  n_gpu_shards: number;
  n_nodes: number;
  n_edges: number;
  parse_ms: number;
  attribution_ms_p50: number;
  attribution_ms_p99: number;
  welford_us_per_shard: number;
  betting_ns_per_shard: number;
  mmd_floor_us_per_shard: number;   // m=500 rbf cross-terms only (~500 evals/shard) — lower bound
  mmd_full_us_per_shard: number;    // full computeUt at b=30, m=500 (~15,870 evals/shard) — production cost class
  ebh_ms_p50: number;
  peak_rss_mb_delta: number;
}

// ── Bench primitives ─────────────────────────────────────────────────
function multivariateWelfordUpdate(
  mean: Float64Array, M2: Float64Array, n: number, x: Float64Array, p: number,
): void {
  const newN = n + 1;
  const delta = new Float64Array(p);
  for (let i = 0; i < p; i++) {
    delta[i] = x[i]! - mean[i]!;
    mean[i] = mean[i]! + delta[i]! / newN;
  }
  for (let i = 0; i < p; i++) {
    const d_post_i = x[i]! - mean[i]!;
    for (let j = 0; j < p; j++) {
      M2[i * p + j] = M2[i * p + j]! + delta[i]! * d_post_i;
    }
  }
}

// MMD cross-term floor — m baseline cross-terms only, NOT the b² xx term or
// the full b·m xy iteration. Lower bound; preserved from R04 for comparison.
function mmdRbfCrossSumFloor(pool: number[][], live: number[], bw: number): number {
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += rbf(live, pool[i]!, bw);
  }
  return acc / pool.length;
}

// Full computeUt — drives the engine's actual U-statistic over a b-window
// against the baseline pool. Per-shard cost class is ~b² + b·m kernel evals
// (~15,870 at b=30, m=500). This is the production cost class.
function syntheticWindow(p: number, b: number, seed: number): number[][] {
  // Deterministic synthetic window — values change per seed offset, shape is fixed.
  const w: number[][] = [];
  for (let i = 0; i < b; i++) {
    const row: number[] = new Array(p);
    for (let j = 0; j < p; j++) row[j] = Math.sin(seed * 0.13 + i * 0.07 + j * 0.31);
    w.push(row);
  }
  return w;
}

function baselineBaselineSum(pool: number[][], bw: number): number {
  let s = 0;
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length; j++) {
      if (i !== j) s += rbf(pool[i]!, pool[j]!, bw);
    }
  }
  return s;
}

function syntheticBaselinePool(p: number, m: number): number[][] {
  const pool: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < p; j++) row.push(Math.sin(i * 0.1 + j * 0.3));
    pool.push(row);
  }
  return pool;
}

function syntheticFires(shardIds: string[], n: number, baseTs: number): FiredShardEvent[] {
  return shardIds.slice(0, n).map((id, i) => ({ shard_node_id: id, event_ts: baseTs + i }));
}

// ── Measurement helpers ──────────────────────────────────────────────
// Attribution: end-to-end against the real fixture. Returns p50/p99 wall time.
function measureAttribution(
  snap: TopologySnapshot,
  fires: FiredShardEvent[],
): { attribution_ms_p50: number; attribution_ms_p99: number } {
  const attribution_samples: number[] = [];
  for (let i = 0; i < WARMUP_ITERS + MEASURE_ITERS; i++) {
    const ta = performance.now();
    attributeCommonMode({
      fired_events: fires,
      snapshot: snap,
      opts: { max_hop_distance: MAX_HOP_DISTANCE },
    });
    const dt = performance.now() - ta;
    if (i >= WARMUP_ITERS) attribution_samples.push(dt);
  }
  attribution_samples.sort((a, b) => a - b);
  const attribution_ms_p50 = attribution_samples[Math.floor(MEASURE_ITERS / 2)]!;
  const attribution_ms_p99 = attribution_samples[
    Math.min(attribution_samples.length - 1, Math.floor(MEASURE_ITERS * 0.99))
  ]!;
  return { attribution_ms_p50, attribution_ms_p99 };
}

// Welford + betting per-shard primitive costs.
function measureWelfordBetting(
  N: number,
  live: Float64Array,
): { welford_us_per_shard: number; betting_ns_per_shard: number } {
  // Welford
  let welford_total_ns = 0;
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const mean = new Float64Array(BENCH_P);
    const M2 = new Float64Array(BENCH_P * BENCH_P);
    const tw = performance.now();
    for (let s = 0; s < N; s++) multivariateWelfordUpdate(mean, M2, s, live, BENCH_P);
    const dt_ns = (performance.now() - tw) * 1_000_000;
    if (it >= WARMUP_ITERS) welford_total_ns += dt_ns;
  }
  const welford_us_per_shard = welford_total_ns / 1000 / N / MEASURE_ITERS;

  // Betting
  let betting_total_ns = 0;
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const states = Array.from({ length: N }, () => freshBettingState());
    const tb = performance.now();
    for (let s = 0; s < N; s++) {
      updateBettingState(states[s]!, 1.0, 0.0, 1.0, ALPHA_BETTING);
    }
    const dt_ns = (performance.now() - tb) * 1_000_000;
    if (it >= WARMUP_ITERS) betting_total_ns += dt_ns;
  }
  const betting_ns_per_shard = betting_total_ns / N / MEASURE_ITERS;
  return { welford_us_per_shard, betting_ns_per_shard };
}

// MMD floor + full per-shard costs.
function measureMmd(
  N: number,
  pool: number[][],
  liveArr: number[],
): { mmd_floor_us_per_shard: number; mmd_full_us_per_shard: number } {
  // MMD floor — m=500 rbf cross-terms only (~500 evals/shard). Bandwidth=1
  // matches the R04 measurement (kept verbatim for back-compat with the floor
  // column; the floor's responsiveness to drift is not at issue here — only
  // its CPU cost on the kernel-call hot path is).
  const bw_floor = 1.0;
  let mmd_floor_total_us = 0;
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const tm = performance.now();
    for (let s = 0; s < N; s++) mmdRbfCrossSumFloor(pool, liveArr, bw_floor);
    const dt_us = (performance.now() - tm) * 1000;
    if (it >= WARMUP_ITERS) mmd_floor_total_us += dt_us;
  }
  const mmd_floor_us_per_shard = mmd_floor_total_us / N / MEASURE_ITERS;

  // MMD full — full computeUt over a b=30 window vs the baseline pool.
  // Production cost class (~15,870 evals/shard at b=30, m=500). Bandwidth uses
  // the median-heuristic equivalent (R05.M1) so the U-stat is non-degenerate.
  const bw_full = MMD_BANDWIDTH;
  const bb_sum = baselineBaselineSum(pool, bw_full);
  const mmdParams = {
    kernel: 'gaussian_rbf' as const,
    bandwidth: bw_full,
    window_size: MMD_WINDOW_B,
    baseline_baseline_sum: bb_sum,
    null_quantile: Number.POSITIVE_INFINITY,
    null_quantile_bootstraps: 0,
    alpha: ALPHA_BETTING,
  };
  // Pre-build N synthetic windows (one per shard); reuse across iterations so
  // we time computeUt only, not window construction.
  const windows: number[][][] = [];
  for (let s = 0; s < N; s++) windows.push(syntheticWindow(BENCH_P, MMD_WINDOW_B, s));

  // S3-class measurement loops dominate wall time — cut iter counts at scale.
  const full_warmup = N > LARGE_THRESHOLD ? FULL_MMD_WARMUP_ITERS_LARGE : WARMUP_ITERS;
  const full_iters = N > LARGE_THRESHOLD ? FULL_MMD_MEASURE_ITERS_LARGE : MEASURE_ITERS;
  let mmd_full_total_us = 0;
  for (let it = 0; it < full_warmup + full_iters; it++) {
    const tm = performance.now();
    for (let s = 0; s < N; s++) computeUt(windows[s]!, pool, mmdParams);
    const dt_us = (performance.now() - tm) * 1000;
    if (it >= full_warmup) mmd_full_total_us += dt_us;
  }
  const mmd_full_us_per_shard = mmd_full_total_us / N / full_iters;
  return { mmd_floor_us_per_shard, mmd_full_us_per_shard };
}

// Fleet e-BH cost (p50 over MEASURE_ITERS).
function measureEbh(N: number): number {
  const eValues = new Array(N).fill(0).map((_, i) => 1 + (i % 7) * 0.5);
  const ebh_samples: number[] = [];
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const te = performance.now();
    eBenjaminiHochberg(eValues, Q_FDR);
    const dt = performance.now() - te;
    if (it >= WARMUP_ITERS) ebh_samples.push(dt);
  }
  ebh_samples.sort((a, b) => a - b);
  return ebh_samples[Math.floor(MEASURE_ITERS / 2)]!;
}

// ── Measurement loop ─────────────────────────────────────────────────
function measure(spec: FixtureSpec): Measurement | null {
  const fullPath = join(SUBSTRATE, spec.path);
  if (!existsSync(fullPath)) {
    if (spec.required) throw new Error(`required fixture missing: ${fullPath}`);
    process.stderr.write(`SKIP ${spec.name}: ${fullPath} not present\n`);
    return null;
  }
  const rss0 = process.memoryUsage().rss;

  const t0 = performance.now();
  const snap: TopologySnapshot = JSON.parse(readFileSync(fullPath, 'utf8'));
  const parse_ms = performance.now() - t0;

  const shardIds = snap.nodes
    .filter((n) => (n.kind as string) === 'gpu_shard')
    .map((n) => n.id);
  const fires = syntheticFires(shardIds, N_FIRES, 1_700_000_000);

  const { attribution_ms_p50, attribution_ms_p99 } = measureAttribution(snap, fires);

  // Per-shard primitives ────────────────
  const N = shardIds.length;
  const pool = syntheticBaselinePool(BENCH_P, MMD_POOL);
  const live = new Float64Array(BENCH_P);
  for (let i = 0; i < BENCH_P; i++) live[i] = Math.cos(i * 0.7);
  const liveArr = Array.from(live);

  const { welford_us_per_shard, betting_ns_per_shard } = measureWelfordBetting(N, live);
  const { mmd_floor_us_per_shard, mmd_full_us_per_shard } = measureMmd(N, pool, liveArr);
  const ebh_ms_p50 = measureEbh(N);

  const rss1 = process.memoryUsage().rss;
  const peak_rss_mb_delta = (rss1 - rss0) / (1024 * 1024);

  return {
    fixture: spec.name,
    n_gpu_shards: N,
    n_nodes: snap.nodes.length,
    n_edges: snap.edges.length,
    parse_ms,
    attribution_ms_p50,
    attribution_ms_p99,
    welford_us_per_shard,
    betting_ns_per_shard,
    mmd_floor_us_per_shard,
    mmd_full_us_per_shard,
    ebh_ms_p50,
    peak_rss_mb_delta,
  };
}

// ── Report ───────────────────────────────────────────────────────────
function renderCsv(rows: Measurement[]): string {
  const hdr = 'fixture,n_gpu_shards,n_nodes,n_edges,parse_ms,attribution_ms_p50,attribution_ms_p99,welford_us_per_shard,betting_ns_per_shard,mmd_floor_us_per_shard,mmd_full_us_per_shard,ebh_ms_p50,peak_rss_mb_delta';
  const body = rows
    .map((r) =>
      [
        r.fixture,
        r.n_gpu_shards,
        r.n_nodes,
        r.n_edges,
        r.parse_ms.toFixed(3),
        r.attribution_ms_p50.toFixed(3),
        r.attribution_ms_p99.toFixed(3),
        r.welford_us_per_shard.toFixed(3),
        r.betting_ns_per_shard.toFixed(0),
        r.mmd_floor_us_per_shard.toFixed(2),
        r.mmd_full_us_per_shard.toFixed(2),
        r.ebh_ms_p50.toFixed(3),
        r.peak_rss_mb_delta.toFixed(1),
      ].join(','),
    )
    .join('\n');
  return hdr + '\n' + body + '\n';
}

function renderCadenceTable(rows: Measurement[]): string {
  const hdr =
    '| Fixture | Shards | 1s — no MMD | 1s — MMD floor | **1s — MMD full** | 5s — MMD full | 15s — MMD full | 1s — MMD@k=10 |\n|---|---:|---:|---:|---:|---:|---:|---:|';
  const body = rows
    .map((r) => {
      const base_per_shard_ms =
        r.welford_us_per_shard / 1000 + r.betting_ns_per_shard / 1_000_000;
      const base_total_ms =
        base_per_shard_ms * r.n_gpu_shards + r.attribution_ms_p50 + r.ebh_ms_p50;
      const floor_total_ms =
        base_total_ms + (r.mmd_floor_us_per_shard / 1000) * r.n_gpu_shards;
      const full_total_ms =
        base_total_ms + (r.mmd_full_us_per_shard / 1000) * r.n_gpu_shards;
      const full_k10_total_ms =
        base_total_ms + (r.mmd_full_us_per_shard / 1000) * r.n_gpu_shards / 10;
      return `| \`${r.fixture}\` | ${r.n_gpu_shards.toLocaleString()} | ${(base_total_ms / 1000).toFixed(4)} | ${(floor_total_ms / 1000).toFixed(4)} | **${(full_total_ms / 1000).toFixed(3)}** | ${(full_total_ms / 5000).toFixed(3)} | ${(full_total_ms / 15000).toFixed(4)} | ${(full_k10_total_ms / 1000).toFixed(3)} |`;
    })
    .join('\n');
  return hdr + '\n' + body;
}

function renderMarkdown(
  rows: Measurement[],
  meta: { engine_pkg: string; ts: string; host: string },
): string {
  const tableHdr =
    '| Fixture | Shards | Parse ms | Attribution p50 ms | Attribution p99 ms | Welford µs/shard | Betting ns/shard | MMD floor µs/shard | MMD full µs/shard | Full/floor ratio | e-BH ms | RSS Δ MB |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|';
  const tableBody = rows
    .map(
      (r) => {
        const ratio = r.mmd_floor_us_per_shard > 0 ? r.mmd_full_us_per_shard / r.mmd_floor_us_per_shard : 0;
        return `| \`${r.fixture}\` | ${r.n_gpu_shards.toLocaleString()} | ${r.parse_ms.toFixed(1)} | ${r.attribution_ms_p50.toFixed(2)} | ${r.attribution_ms_p99.toFixed(2)} | ${r.welford_us_per_shard.toFixed(2)} | ${r.betting_ns_per_shard.toFixed(0)} | ${r.mmd_floor_us_per_shard.toFixed(1)} | **${r.mmd_full_us_per_shard.toFixed(1)}** | ${ratio.toFixed(1)}× | ${r.ebh_ms_p50.toFixed(2)} | ${r.peak_rss_mb_delta.toFixed(0)} |`;
      }
    )
    .join('\n');

  return `# Tessera per-window cost — clustersynth bench

- Engine: \`${meta.engine_pkg}\`
- Host: \`${meta.host}\`
- Date: ${meta.ts}
- Config: \`{ p: ${BENCH_P}, mmd_pool: ${MMD_POOL}, mmd_window_b: ${MMD_WINDOW_B}, mmd_bandwidth: ${MMD_BANDWIDTH.toFixed(3)}, α_betting: ${ALPHA_BETTING}, α_fdr: ${Q_FDR}, max_hop_distance: ${MAX_HOP_DISTANCE}, n_fires: ${N_FIRES}, warmup: ${WARMUP_ITERS}, iters: ${MEASURE_ITERS} }\`

## Per-window primitives

${tableHdr}
${tableBody}

**MMD floor** = m=${MMD_POOL} rbf cross-terms only (~${MMD_POOL} kernel evals/shard). Lower bound; underestimates production cost by ~30× by construction.
**MMD full** = engine's actual \`computeUt\` at b=${MMD_WINDOW_B}, m=${MMD_POOL} (~${MMD_WINDOW_B * MMD_WINDOW_B - MMD_WINDOW_B + MMD_WINDOW_B * MMD_POOL} kernel evals/shard via xx + xy terms). Production cost class.

## Steady-state cores at common cadences

${renderCadenceTable(rows)}

> **Read this carefully:**
> - \`1s — no MMD\` is the floor with only cheap detectors (betting + Welford + attribution + e-BH). Single-thread comfortable at every scale.
> - \`1s — MMD floor\` is what R04 originally published. **Over-optimistic by ~30×** because it only counts the xy cross-term floor (~500 evals/shard) rather than full computeUt (~15,000 evals/shard).
> - **\`1s — MMD full\` is the realistic production cost** with MMD running on every shard every window. Past a single core at S2+; needs Web Worker sharding or sparse sampling.
> - \`1s — MMD@k=10\` applies the R05-validated sparse-sampling strategy (1-in-10 evaluations) to the full MMD cost. Brings even S3 back to ~1 core territory while preserving α (R05 confirmed empirically).
>
> Per-window total: \`welford·N + betting·N + mmd·N + attribution + e-BH\`. Single Node event-loop thread; not parallelized.

## What this measures vs. doesn't

**Measured** (against the committed clustersynth fixtures):

- Per-shard cost of the load-bearing detector primitives at fixed config (p=${BENCH_P}, MMD pool=${MMD_POOL})
- End-to-end \`attributeCommonMode\` wall time on the real topology graphs
- Fleet-level \`eBenjaminiHochberg\` cost as a function of N
- Snapshot parse time (JSON load → engine TopologySnapshot)

**NOT measured** (out of scope by Q-R04-SPEC § Anti-scope):

- DCGM / NVML ingestion cost from a real cluster — requires real hardware
- Full \`evaluateEMmd\` end-to-end with a CompiledConfig — primitive-level only
- Baseline curation (MCD-Mahalanobis offline batch) — separate workload, not steady state
- Inter-machine comparison — these numbers reflect the bench host's hardware only

## Caveats on composition

The cadence table emits **both** the cross-term floor (the R04 column R05 still uses) AND the full-\`computeUt\` ceiling. Read \`MMD full\` for production cost; the floor exists for the lower-bound reference and to document what's possible if MMD is sharded onto Web Workers or restricted to flagged shards (adaptive cascade — R07+ candidate).

R05's sparse-sampling envelope showed empirically that α is preserved at k=10 and detection latency scales ~linearly; the \`1s — MMD@k=10\` column applies that strategy to the full cost. For SDC-class drift on rare shards, the recommended pipeline is: cheap detectors on every shard every window → MMD only on the small subset flagged by betting → full computeUt on that subset. At realistic flag rates (~1% of shards), even S3 stays well under 1 core.
`;
}

// ── Main ─────────────────────────────────────────────────────────────
const includeS3 = process.argv.includes('--include-s3');
const outDir = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1]! : join(__dirname, 'results');
})();

mkdirSync(outDir, { recursive: true });
const fixtures = FIXTURES.filter((f) => includeS3 || !f.name.includes('-s3-'));

const rows: Measurement[] = [];
for (const f of fixtures) {
  const r = measure(f);
  if (r) {
    rows.push(r);
    process.stderr.write(
      `OK   ${f.name}: attribution p50 ${r.attribution_ms_p50.toFixed(2)} ms; MMD floor ${r.mmd_floor_us_per_shard.toFixed(1)} µs/shard; MMD full ${r.mmd_full_us_per_shard.toFixed(1)} µs/shard (${(r.mmd_full_us_per_shard / Math.max(r.mmd_floor_us_per_shard, 0.001)).toFixed(1)}×)\n`,
    );
  }
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const enginePkg = (() => {
  try {
    const eng = JSON.parse(
      readFileSync(
        join(
          __dirname,
          '..',
          'node_modules',
          '@johnpatrickwarren-oss',
          'deploysignal-engine',
          'package.json',
        ),
        'utf8',
      ),
    );
    return `${eng.name}@${eng.version}`;
  } catch {
    return 'unknown';
  }
})();
const host = (() => {
  try {
    const os = require('node:os');
    return `${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length} cores, ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(0)} GB RAM, ${process.platform} ${process.arch}`;
  } catch {
    return 'unknown';
  }
})();

writeFileSync(join(outDir, `${ts}.csv`), renderCsv(rows));
writeFileSync(join(outDir, `${ts}.md`), renderMarkdown(rows, { engine_pkg: enginePkg, ts, host }));
process.stderr.write(`Reports: ${outDir}/${ts}.csv + .md\n`);
