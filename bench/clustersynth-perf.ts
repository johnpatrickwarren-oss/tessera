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
  BASELINE_POOL_SIZE,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/sequential-mmd';
import { attributeCommonMode } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import type { FiredShardEvent } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

// ── Config ───────────────────────────────────────────────────────────
const BENCH_P = 11;
const MMD_POOL = BASELINE_POOL_SIZE;
const ALPHA_BETTING = 0.005;
const Q_FDR = 0.05;
const MAX_HOP_DISTANCE = 2;
const N_FIRES = 10;
const WARMUP_ITERS = 3;
const MEASURE_ITERS = 10;

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
  mmd_us_per_shard: number;
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

function mmdRbfCrossSum(pool: number[][], live: number[], bw: number): number {
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += rbf(live, pool[i]!, bw);
  }
  return acc / pool.length;
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

  // Attribution: end-to-end against the real fixture
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

  // Per-shard primitives ────────────────
  const N = shardIds.length;
  const pool = syntheticBaselinePool(BENCH_P, MMD_POOL);
  const live = new Float64Array(BENCH_P);
  for (let i = 0; i < BENCH_P; i++) live[i] = Math.cos(i * 0.7);
  const liveArr = Array.from(live);

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

  // MMD primitive — rbf cross-terms over a pool of m=500 per shard per window
  const bw = 1.0;
  let mmd_total_us = 0;
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const tm = performance.now();
    for (let s = 0; s < N; s++) mmdRbfCrossSum(pool, liveArr, bw);
    const dt_us = (performance.now() - tm) * 1000;
    if (it >= WARMUP_ITERS) mmd_total_us += dt_us;
  }
  const mmd_us_per_shard = mmd_total_us / N / MEASURE_ITERS;

  // Fleet e-BH
  const eValues = new Array(N).fill(0).map((_, i) => 1 + (i % 7) * 0.5);
  const ebh_samples: number[] = [];
  for (let it = 0; it < WARMUP_ITERS + MEASURE_ITERS; it++) {
    const te = performance.now();
    eBenjaminiHochberg(eValues, Q_FDR);
    const dt = performance.now() - te;
    if (it >= WARMUP_ITERS) ebh_samples.push(dt);
  }
  ebh_samples.sort((a, b) => a - b);
  const ebh_ms_p50 = ebh_samples[Math.floor(MEASURE_ITERS / 2)]!;

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
    mmd_us_per_shard,
    ebh_ms_p50,
    peak_rss_mb_delta,
  };
}

// ── Report ───────────────────────────────────────────────────────────
function renderCsv(rows: Measurement[]): string {
  const hdr = 'fixture,n_gpu_shards,n_nodes,n_edges,parse_ms,attribution_ms_p50,attribution_ms_p99,welford_us_per_shard,betting_ns_per_shard,mmd_us_per_shard,ebh_ms_p50,peak_rss_mb_delta';
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
        r.mmd_us_per_shard.toFixed(2),
        r.ebh_ms_p50.toFixed(3),
        r.peak_rss_mb_delta.toFixed(1),
      ].join(','),
    )
    .join('\n');
  return hdr + '\n' + body + '\n';
}

function renderCadenceTable(rows: Measurement[]): string {
  const hdr =
    '| Fixture | Shards | 1s cadence (cores) | 5s cadence | 15s cadence | No MMD, 1s |\n|---|---:|---:|---:|---:|---:|';
  const body = rows
    .map((r) => {
      const per_shard_ms_with_mmd =
        r.welford_us_per_shard / 1000 +
        r.betting_ns_per_shard / 1_000_000 +
        r.mmd_us_per_shard / 1000;
      const per_shard_ms_no_mmd =
        r.welford_us_per_shard / 1000 + r.betting_ns_per_shard / 1_000_000;
      const total_with_mmd =
        per_shard_ms_with_mmd * r.n_gpu_shards + r.attribution_ms_p50 + r.ebh_ms_p50;
      const total_no_mmd =
        per_shard_ms_no_mmd * r.n_gpu_shards + r.attribution_ms_p50 + r.ebh_ms_p50;
      return `| \`${r.fixture}\` | ${r.n_gpu_shards.toLocaleString()} | ${(total_with_mmd / 1000).toFixed(3)} | ${(total_with_mmd / 5000).toFixed(4)} | ${(total_with_mmd / 15000).toFixed(4)} | ${(total_no_mmd / 1000).toFixed(4)} |`;
    })
    .join('\n');
  return hdr + '\n' + body;
}

function renderMarkdown(
  rows: Measurement[],
  meta: { engine_pkg: string; ts: string; host: string },
): string {
  const tableHdr =
    '| Fixture | Shards | Parse ms | Attribution p50 ms | Attribution p99 ms | Welford µs/shard | Betting ns/shard | MMD µs/shard | e-BH ms | RSS Δ MB |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|';
  const tableBody = rows
    .map(
      (r) =>
        `| \`${r.fixture}\` | ${r.n_gpu_shards.toLocaleString()} | ${r.parse_ms.toFixed(1)} | ${r.attribution_ms_p50.toFixed(2)} | ${r.attribution_ms_p99.toFixed(2)} | ${r.welford_us_per_shard.toFixed(2)} | ${r.betting_ns_per_shard.toFixed(0)} | ${r.mmd_us_per_shard.toFixed(1)} | ${r.ebh_ms_p50.toFixed(2)} | ${r.peak_rss_mb_delta.toFixed(0)} |`,
    )
    .join('\n');

  return `# Tessera per-window cost — clustersynth bench

- Engine: \`${meta.engine_pkg}\`
- Host: \`${meta.host}\`
- Date: ${meta.ts}
- Config: \`{ p: ${BENCH_P}, mmd_pool: ${MMD_POOL}, α_betting: ${ALPHA_BETTING}, α_fdr: ${Q_FDR}, max_hop_distance: ${MAX_HOP_DISTANCE}, n_fires: ${N_FIRES}, warmup: ${WARMUP_ITERS}, iters: ${MEASURE_ITERS} }\`

## Per-window primitives

${tableHdr}
${tableBody}

## Steady-state cores at common cadences

${renderCadenceTable(rows)}

> Cores formula: \`per_window_ms / cadence_ms\` where
> \`per_window_ms = welford_us·N + betting_ns·N + mmd_us·N + attribution_p50 + ebh_p50\`.
> Assumes detector mix (betting + Welford + MMD every window) on a single Node event-loop thread.

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

The cadence table assumes MMD evaluates **every shard every window**. In practice, sparse sampling (see clustersynth R05) materially changes the cores number — for fixtures where MMD dominates, sampling 1-in-10 reduces the steady-state cost by ~10× on the MMD term. R05 is the empirical follow-up.
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
      `OK   ${f.name}: attribution p50 ${r.attribution_ms_p50.toFixed(2)} ms; MMD ${r.mmd_us_per_shard.toFixed(1)} µs/shard\n`,
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
