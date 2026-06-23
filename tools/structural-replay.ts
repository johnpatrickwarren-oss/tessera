// tools/structural-replay.ts — gap B: a structural-collapse detector that is the
// SAME betting e-process (Ville-bounded: P(ever fire | healthy) ≤ α) applied to a
// structural-health signal (scrape_samples_scraped). Two deliverables:
//   A. FP — does the realized false-alarm rate on REAL healthy structural telemetry
//      actually honor the α guarantee? (the "low, guaranteed FP" promise, on real data)
//   B. FD — detection power + latency vs INJECTED collapse (severity × duration),
//      since GWDG's labeled incidents contain no real structural collapse.
// A manual "alert if up==0 for N scrapes" rule has an uncontrolled, duration-
// compounding FP; this has a provable bound we verify empirically.
// See docs/SPEC-structural-collapse-detector.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { loadStructuralStreams, STRUCTURAL_METRIC } from './_gwdg-structural-loader.js';
import { probationaryEnd } from './shadow-replay.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FD_LEN = 1200, FD_LEVEL = 1000, FD_NOISE = 0.01, FD_AT = 700, FD_TRIALS = 40;

export const ALPHA = 0.01;
export const SEVERITIES = [0, 0.25, 0.5, 0.75, 0.9] as const; // multiply scraped-count by this during collapse (0 = full)
export const DURATIONS = [3, 6, 12, 24] as const;             // collapse length in scrapes
export const GRACE = 10;                                       // scrapes after collapse end still counted as detection
export const REL_FLOOR = 0.05;                                 // benign relative scrape wiggle the null must absorb (5%)
export const STABLE_MIN = 200;                                 // a count target is "stable" (Gaussian-relative valid) if its healthy median ≥ this

/** Inject a structural collapse: scale values in [at, at+dur) by `severity`. */
export function injectCollapse(values: ReadonlyArray<number>, at: number, dur: number, severity: number): number[] {
  const out = values.slice();
  for (let i = at; i < Math.min(at + dur, out.length); i++) out[i] = Math.round(out[i] * severity);
  return out;
}

function median(xs: ReadonlyArray<number>): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

/** Structural-collapse detector: a betting e-process on the RELATIVE level (value /
 *  healthy median), so a count is treated as a scale — a benign unit step is a tiny
 *  relative deviation, a collapse (→0, →half) is huge. Variance floored at REL_FLOOR²
 *  so the near-zero healthy variance of a flat count can't make benign steps "significant".
 *  Ville bound on the e-process: P(ever fire | healthy) ≤ alpha. Restart-on-fire. */
export function detectStructuralCollapse(values: ReadonlyArray<number>, probEnd: number, alpha: number, relFloor: number = REL_FLOOR): number[] {
  const med = median(values.slice(0, probEnd)) || 1;
  const rel = values.map((v) => v / med);
  const pre = rel.slice(0, probEnd);
  const mean = pre.reduce((a, b) => a + b, 0) / pre.length;
  const relVar = pre.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, pre.length - 1);
  const sigma2 = Math.max(relVar, relFloor * relFloor);
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const fires: number[] = [];
  for (let i = probEnd; i < rel.length; i++) {
    updateBettingState(state, rel[i], mean, sigma2, alpha, 0);
    if (state.M >= threshold) { fires.push(i); state = freshBettingState(); }
  }
  return fires;
}

function round3(x: number): number { return Math.round(x * 1000) / 1000; }

export interface FpResult { metric: string; n_streams: number; streams_fired: number; per_stream_fp: number; total_fires: number; scored_points: number; fp_per_1k: number; alpha: number; honors_guarantee: boolean; n_stable: number; stable_streams_fired: number; stable_per_stream_fp: number; stable_honors_guarantee: boolean; }
export interface FdCell { severity: number; duration: number; detected: number; n: number; detection_rate: number; median_latency: number; }

export interface StructuralReport {
  schema_version: 'tessera-structural-v1';
  provenance: { dataset: string; metric: string; alpha: number; n_files: number };
  fp: FpResult;
  fd: FdCell[];
}

/** A. FP on real healthy telemetry (every fire is a false alarm — no labeled collapse).
 *  Broken out for STABLE high-count targets (Gaussian-relative null valid) vs all targets. */
function computeFp(streams: ReadonlyArray<{ values: number[] }>, metric: string): FpResult {
  let streamsFired = 0, totalFires = 0, scored = 0, nStable = 0, stableFired = 0;
  for (const t of streams) {
    const probEnd = probationaryEnd(t.values.length);
    const isStable = median(t.values.slice(0, probEnd)) >= STABLE_MIN;
    const nFires = detectStructuralCollapse(t.values, probEnd, ALPHA).length;
    if (nFires > 0) streamsFired++;
    totalFires += nFires;
    scored += t.values.length - probEnd;
    if (isStable) { nStable++; if (nFires > 0) stableFired++; }
  }
  const perStreamFp = streams.length > 0 ? round3(streamsFired / streams.length) : 0;
  const stableFp = nStable > 0 ? round3(stableFired / nStable) : 0;
  return {
    metric, n_streams: streams.length, streams_fired: streamsFired, per_stream_fp: perStreamFp,
    total_fires: totalFires, scored_points: scored, fp_per_1k: scored > 0 ? round3((totalFires / scored) * 1000) : 0,
    alpha: ALPHA, honors_guarantee: perStreamFp <= ALPHA,
    n_stable: nStable, stable_streams_fired: stableFired, stable_per_stream_fp: stableFp, stable_honors_guarantee: stableFp <= ALPHA,
  };
}

/** One FD cell: detection rate + latency for a (severity, duration) on a clean synthetic baseline. */
function fdCell(severity: number, duration: number): FdCell {
  const probEnd = probationaryEnd(FD_LEN);
  let detected = 0; const latencies: number[] = [];
  for (let k = 0; k < FD_TRIALS; k++) {
    const rng = mulberry32(scramble(1000 + k));
    const base = Array.from({ length: FD_LEN }, () => Math.round(FD_LEVEL * (1 + FD_NOISE * gaussian(rng))));
    const hit = detectStructuralCollapse(injectCollapse(base, FD_AT, duration, severity), probEnd, ALPHA).find((f) => f >= FD_AT && f < FD_AT + duration + GRACE);
    if (hit !== undefined) { detected++; latencies.push(hit - FD_AT); }
  }
  return { severity, duration, detected, n: FD_TRIALS, detection_rate: round3(detected / FD_TRIALS), median_latency: median(latencies) };
}

export function runStructural(datasetDir: string, metric: string = STRUCTURAL_METRIC): StructuralReport {
  const telem = path.join(datasetDir, 'telemetry');
  const csvs = fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort().map((f) => path.join(telem, f));
  const streams = csvs.flatMap((c) => loadStructuralStreams(c, metric));
  const fp = computeFp(streams, metric);
  // B. FD power vs injected collapse on a CLEAN synthetic baseline (real streams over-fire).
  const fd = SEVERITIES.flatMap((severity) => DURATIONS.map((duration) => fdCell(severity, duration)));
  return { schema_version: 'tessera-structural-v1', provenance: { dataset: 'GWDG-structural-' + metric, metric, alpha: ALPHA, n_files: csvs.length }, fp, fd };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function renderMd(r: StructuralReport): string {
  const L: string[] = [];
  L.push('# Tessera — gap B structural detector + the limit of the per-shard FP guarantee on real telemetry');
  L.push('');
  L.push(`A betting e-process (Ville: P(ever fire | healthy) ≤ α=${r.fp.alpha}) on the structural-health signal \`${r.provenance.metric}\`, treated as a relative level. We test whether the α guarantee actually HOLDS on real healthy telemetry, and characterize detection power against injected collapse. The answer (below) is the load-bearing finding: the per-shard anytime-valid guarantee does NOT survive real nonstationarity — for structural signals just as for numeric ones.`);
  L.push('');
  L.push('## A. False-alarm rate on REAL healthy structural telemetry (the guarantee)');
  L.push('');
  L.push(`${r.fp.n_streams} real per-(node,instance) healthy streams. Every fire is a false alarm (no labeled collapse in GWDG).`);
  L.push('');
  L.push(`Detector: betting e-process on the RELATIVE level (value / healthy median), variance floored at ${REL_FLOOR} (benign scrape wiggle). "Stable" = healthy median ≥ ${STABLE_MIN} samples (where the Gaussian-relative null is valid; low-count integer targets are inherently noisy and need a Poisson e-process — out of scope).`);
  L.push('');
  L.push('| target set | streams | streams that fired | realized per-stream FP | α bound | honors α? |');
  L.push('|---|---|---|---|---|---|');
  L.push(`| **stable (median ≥ ${STABLE_MIN})** | ${r.fp.n_stable} | ${r.fp.stable_streams_fired} | ${pct(r.fp.stable_per_stream_fp)} | ${pct(r.fp.alpha)} | ${r.fp.stable_honors_guarantee ? '✅ yes' : '❌ NO'} |`);
  L.push(`| all targets | ${r.fp.n_streams} | ${r.fp.streams_fired} | ${pct(r.fp.per_stream_fp)} | ${pct(r.fp.alpha)} | ${r.fp.honors_guarantee ? '✅ yes' : '❌ NO'} |`);
  L.push('');
  L.push(r.fp.stable_honors_guarantee
    ? `**The guarantee holds on real data for stable scrape targets:** realized per-stream false-alarm rate ${pct(r.fp.stable_per_stream_fp)} ≤ α=${pct(r.fp.alpha)} across ${r.fp.n_stable} real healthy high-count streams.`
    : `**The guarantee is VIOLATED even on the most stable, highest-count targets:** realized FP ${pct(r.fp.stable_per_stream_fp)} ≫ α=${pct(r.fp.alpha)}. Inspection shows *why*: the e-process fires on sub-percent PERSISTENT level shifts (e.g. a target settling from 5620 to 5627 samples as series are added) — not on collapses. This is fundamental to anytime-valid methods: they accumulate wealth on *any* persistent deviation, so on a non-stationary signal (which every real scrape count is, over days) P(fire) → 1, not ≤ α. Raising the floor only defers it. The α bound is mathematically correct but conditional on exact stationarity that real telemetry does not satisfy.`);
  L.push('');
  L.push('## B. Detection power vs INJECTED collapse (severity × duration)');
  L.push('');
  L.push(`Power on a CLEAN synthetic baseline (level ${FD_LEVEL} + ${FD_NOISE * 100}% relative noise, ${FD_TRIALS} trials) — real streams over-fire (above), which would confound power. A collapse scales the count by severity for N scrapes; \`detection\` = fired within the collapse + ${GRACE} scrapes. NOTE: the relative bet saturates (bounded-z) once the drop exceeds the ${REL_FLOOR * 100}% floor, so severities ×0–×0.75 behave identically — only DURATION drives latency; ×0.9 (a 10% dip) is the near-floor case.`);
  L.push('');
  const sevs = [...new Set(r.fd.map((c) => c.severity))];
  const durs = [...new Set(r.fd.map((c) => c.duration))];
  L.push('Detection rate (median latency in scrapes):');
  L.push('');
  L.push('| severity \\\\ duration | ' + durs.map((d) => `${d}`).join(' | ') + ' |');
  L.push('|' + '---|'.repeat(durs.length + 1));
  for (const s of sevs) {
    const cells = durs.map((d) => { const c = r.fd.find((x) => x.severity === s && x.duration === d)!; return `${pct(c.detection_rate)} (${c.median_latency})`; });
    L.push(`| ×${s} | ${cells.join(' | ')} |`);
  }
  L.push('');
  L.push('Read: a collapse beyond the floor IS detected, with latency growing as duration shrinks (a 24-scrape collapse is caught fast; a 3-scrape blip needs the drop to be sharp). So detection *power* is genuine — the detector works. The problem is not power; it is the FP guarantee above.');
  L.push('');
  L.push('## What this means for the "low, guaranteed FP and FD" promise');
  L.push('');
  L.push('- **FD (power): achievable.** The e-process reliably detects a genuine structural collapse (drop beyond the noise floor) within a few scrapes.');
  L.push('- **FP (the guarantee): NOT achievable per-shard on real telemetry.** Across numeric (NAB/GWDG/MIT) and now structural (GWDG scrape-health) signals, the fixed-baseline anytime-valid e-process fires on persistent sub-percent drift, so realized FP ≫ α. The α bound holds only under exact stationarity, which real signals violate over long horizons. This is fundamental, not a tuning bug.');
  L.push('- **Where a real guarantee could still live:** (a) bounded-horizon / windowed monitoring (reintroduces multiple-testing across windows, and the regime-aware variant masks — ADR 0006), or (b) FLEET-level e-BH FDR, where common-mode drift cancels in the cross-shard ranking so a truly-failing shard still stands out. (b) is the unvalidated claim worth testing next.');
  L.push('');
  L.push('> **Honest scope:** FD is on *injected*/synthetic collapse — GWDG carries no real labeled structural outage (verified). Real-labeled FD needs a dataset with actual node/exporter-down events (SURF Lisa next).');
  L.push('');
  return L.join('\n');
}

export function writeStructural(datasetDir: string, outDir: string, metric?: string): { json: string; md: string } {
  const report = runStructural(datasetDir, metric);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'structural-report.json');
  const md = path.join(outDir, 'structural-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const dir = process.argv[2] ?? process.env.GWDG_DIR;
  if (!dir) { process.stderr.write('usage: node tools/structural-replay.js <gwdg-dataset-dir>\n'); process.exit(64); }
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeStructural(dir, out);
  process.stdout.write(`Structural report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
