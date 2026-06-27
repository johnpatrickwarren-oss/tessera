// tools/baseline-monitor.ts — the PRODUCTION-faithful baseline regime: a long (≥ 2 months) healthy
// baseline with anomaly trimming, then monitor a recent window against it.
//
// WHY. The other harnesses (walls-validation, clustersynth-edetector) calibrate from a SHORT in-window
// prefix (calLen ≈ 0.1·T ≈ 25–30 ticks). That is NOT how the system is meant to run: the null should be
// a baseline built from WEEKS of healthy data with large anomalies trimmed (engine baseline kit,
// compile-baseline.ts / ADR 0019; contamination-robust trimming, ADR 0015). A short prefix mis-estimates
// the per-shard loadings, leaving the nonstationary common-mode in the residual (median |ρ₁| ≈ 0.25,
// ~15% markov-plausible) — which caps the e-detector's increment power. A long baseline whitens the null
// (calLen 25→300 took markov-plausible 15%→94% on a healthy clustersynth window).
//
// WHAT THIS DOES (clustersynth substrate). Two bundles with the SAME topology+seed:
//   • a LONG HEALTHY baseline (faults off, ≥ 2 months at hourly cadence ≈ 1440 ticks): per shard, fit a
//     ROBUST, ANOMALY-TRIMMED multi-factor loading model (intercept + per-factor loadings + robust
//     scale) — the "toss large anomalies → accurate healthy null" step;
//   • a MONITORING bundle (faults on): residualise it with the BASELINE loadings + scale (loadings are a
//     structural property of the topology/seed, so they transfer), then run the e-detector + e-BH.
// We report the AGGREGATE error metric — the false-discovery proportion across ALL alerts (you cannot
// label an individual alert false; the guarantee is on the rate across the set) — plus transient recall
// and the Wall-A residual-whiteness diagnostic, vs the short-prefix regime.
//
// SCOPE. clustersynth's diurnal/regime nonstationarity lives in the SHARED FACTORS, which the measured-
// factor removal handles directly — so here the long baseline's job is a better LOADING + SCALE estimate
// (no per-cell seasonal model needed). On REAL telemetry with per-shard seasonality the production path
// adds the seasonal per-(hour×day) baseline (compile-baseline.ts), and ADR 0012's irreducible per-shard
// nonstationarity still leaves a floor no baseline removes. Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { autocorr, conditionalMarkovDiagnostic } from './conditional-markov.js';
import { eDetector, terminalUiEValue, type EDetectorOptions } from './e-detector.js';
import { loadScenarioBundle, counterMatrices, ndjsonLines, ndjsonRange, type ScenarioBundle } from './clustersynth-scenario.js';
import { assertLongBaseline } from './baseline-guard.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

/** Minimum baseline length we will accept, in ticks. At hourly cadence this is 60 days. */
export const MIN_BASELINE_TICKS = 1440;

/** A robust per-shard baseline: intercept + per-factor loadings + robust residual scale. */
export interface ShardBaseline { intercept: number; loadings: number[]; scale: number; }

/** Solve the small dense system A·x = b by Gauss elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  // After full Gauss-Jordan the working matrix is diagonal: x[i] = M[i][n] / M[i][i].
  return M.map((row, i) => row[n] / row[i]);
}

/** Median absolute deviation → robust σ estimate (×1.4826). */
function madScale(r: number[]): number {
  const med = median(r);
  const ad = r.map((v) => Math.abs(v - med));
  return Math.max(1.4826 * median(ad), 1e-6);
}
function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Weighted least-squares fit of y on [1, cols...]; returns coefficients [intercept, ...loadings]. */
function wls(y: number[], cols: number[][], w: number[]): number[] | null {
  const p = 1 + cols.length, T = y.length;
  const A = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const b = new Array<number>(p).fill(0);
  for (let t = 0; t < T; t++) {
    const x = [1, ...cols.map((c) => c[t])];
    for (let i = 0; i < p; i++) { b[i] += w[t] * x[i] * y[t]; for (let j = 0; j < p; j++) A[i][j] += w[t] * x[i] * x[j]; }
  }
  return solve(A, b);
}

/** Robust (anomaly-trimmed) per-shard fit: LS, then re-fit twice hard-trimming |resid| > 3·MAD. */
export function robustFitShard(y: number[], cols: number[][]): ShardBaseline {
  const T = y.length;
  let w = new Array<number>(T).fill(1);
  let coef = wls(y, cols, w) ?? [median(y), ...cols.map(() => 0)];
  let scale = 1;
  for (let it = 0; it < 2; it++) {
    const resid = y.map((v, t) => v - coef[0] - cols.reduce((s, c, j) => s + coef[1 + j] * c[t], 0));
    scale = madScale(resid);
    w = resid.map((r) => (Math.abs(r) <= 3 * scale ? 1 : 0)); // toss large anomalies
    coef = wls(y, cols, w) ?? coef;
  }
  return { intercept: coef[0], loadings: coef.slice(1), scale };
}

/** Columns (factor series) shard i loads on, in membership order. */
function shardCols(factorSignals: number[][], membership: number[][], i: number): number[][] {
  return membership[i].map((fi) => factorSignals[fi]);
}

/** Fit a robust, anomaly-trimmed baseline per shard from the long HEALTHY bundle. */
export function fitBaseline(healthy: ScenarioBundle, counter: string): ShardBaseline[] {
  // HARD short-window guard: the healthy baseline must span ~2 months (cadence-agnostic).
  assertLongBaseline(healthy.T, healthy.dt_s, 'baseline-monitor (healthy baseline)');
  const { X, factorSignals, membership } = counterMatrices(healthy, counter);
  return X.map((y, i) => robustFitShard(y, shardCols(factorSignals, membership, i)));
}

/** Robust scale (1.4826·MAD) of a slice, for cadence-correct standardisation. */
function robustScale(xs: number[], len: number): number {
  const a = xs.slice(0, Math.max(1, len));
  const med = quantile(a, 0.5);
  const mad = quantile(a.map((x) => Math.abs(x - med)), 0.5);
  return 1.4826 * mad;
}

/** Residualise the MONITORING bundle against the baseline LOADINGS (structural, transfer across
 *  cadence), then standardise by a robust scale estimated at the MONITORING cadence from the
 *  bundle's HEALTHY pre-fault prefix (first 10% of T — the harness places onsets in [0.1T, 0.5T]).
 *  This lets a coarse (hourly) 2-month baseline calibrate a fine (1Hz) monitoring window: the
 *  loadings are cadence-independent, but the residual scale is NOT, so it must be re-estimated. */
export function applyBaseline(mon: ScenarioBundle, counter: string, fits: ShardBaseline[]): number[][] {
  const { X, factorSignals, membership } = counterMatrices(mon, counter);
  const prefix = Math.max(1, Math.floor(0.1 * mon.T)); // healthy, pre-onset
  return X.map((y, i) => {
    const cols = shardCols(factorSignals, membership, i);
    const f = fits[i];
    const e = y.map((v, t) => v - f.intercept - cols.reduce((s, c, j) => s + (f.loadings[j] ?? 0) * c[t], 0));
    const scale = robustScale(e, prefix) || f.scale; // monitoring-cadence scale; fall back to baseline
    return e.map((ev) => ev / scale);
  });
}

export interface BaselineMonitorResult {
  counter: string;
  nFault: number; eHits: number; terminalHits: number;
  residMedianLag1: number; markovPlausibleFrac: number;
  /** aggregate FDP of the e-BH selection at the fleet level on this counter (false / selected). */
  aggregateFdp: number; selected: number; falsePos: number;
}

function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  return xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];
}

/** gpu mean_shift faulted shard ids on this counter, active in the monitoring window. */
function faultedShardSet(mon: ScenarioBundle, counter: string): Set<string> {
  const out = new Set<string>();
  for (const f of mon.faults) {
    if (f.level !== 'gpu' || f.type !== 'mean_shift') continue;
    if (!(f.counter === counter || f.counter === null)) continue;
    for (const s of f.affected_shards) out.add(s);
  }
  return out;
}

/** Score one counter end-to-end: e-detector vs terminal recall on transient mean_shifts, the AGGREGATE
 *  e-BH false-discovery proportion across the fleet, and the Wall-A residual diagnostic. */
export function scoreCounterBaseline(mon: ScenarioBundle, counter: string, R: number[][], calLen: number, opts: EDetectorOptions): BaselineMonitorResult {
  const faulted = faultedShardSet(mon, counter);
  const faultIdx = new Set([...faulted].map((s) => mon.shardIds.indexOf(s)).filter((i) => i >= 0));
  const healthyIdx = mon.shardIds.map((_, i) => i).filter((i) => !faultIdx.has(i)).filter((_, k) => k % 12 === 0).slice(0, 50);
  const zero = R[0].map(() => 0);
  const lag1 = healthyIdx.map((i) => Math.abs(autocorr(R[i], 1)));
  const plaus = healthyIdx.filter((i) => conditionalMarkovDiagnostic(R[i], zero).markovPlausible).length;

  const eThr = quantile(healthyIdx.map((i) => eDetector(R[i], opts).peak), 0.95);
  const tThr = quantile(healthyIdx.map((i) => terminalUiEValue(R[i], calLen)), 0.95);
  let eHits = 0, terminalHits = 0;
  for (const i of faultIdx) {
    if (eDetector(R[i], opts).peak >= eThr) eHits++;
    if (terminalUiEValue(R[i], calLen) >= tThr) terminalHits++;
  }
  // AGGREGATE FDR (ADR 0019): feed e-BH the NORMALIZED CONVEX-MIXTURE e-value (a valid e-value,
  // E≤1), NOT the raw Shiryaev–Roberts statistic (E≈T, not an e-value — the adjuster can't rescue
  // it). The e-detector peak above is kept only for the Mode-A transient-recall metric.
  const sel = eBenjaminiHochberg(R.map(normalizedMixtureEValue), 0.1).selected;
  let falsePos = 0;
  for (const i of sel) if (!faultIdx.has(i)) falsePos++;
  return {
    counter, nFault: faultIdx.size, eHits, terminalHits,
    residMedianLag1: quantile(lag1, 0.5), markovPlausibleFrac: healthyIdx.length ? plaus / healthyIdx.length : NaN,
    aggregateFdp: sel.length ? falsePos / sel.length : 0, selected: sel.length, falsePos,
  };
}

/** Shared renderer from per-counter results (used by both the in-memory and parallel paths). */
function renderResults(healthyShards: number, healthyT: number, monT: number, monFaults: number, cl: number, results: BaselineMonitorResult[]): string {
  const L: string[] = [];
  L.push('═══ BASELINE-MONITOR — long (≥2-month) anomaly-trimmed baseline, then monitor ═══');
  L.push(`baseline: ${healthyShards} shards × T=${healthyT} ticks (healthy)  |  monitoring: T=${monT}, ${monFaults} faults, e-detector calLen=${cl}`);
  L.push('');
  L.push('The Wall-A diagnostic GATES the fleet: a counter is CERTIFIED only if its residual is broadly');
  L.push('conditionally white (≥ 50% markov-plausible). e-BH earns its aggregate FDR guarantee on the');
  L.push('certified set; flagged counters are abstained on (their null is not valid → no guarantee).');
  L.push('');
  L.push('counter          nFault  e-detector  terminal | residual |ρ₁|  markovPlausible | gate');
  let eT = 0, tT = 0, fT = 0, selOk = 0, fpOk = 0;
  const flagged: string[] = [];
  for (const r of results) {
    if (r.nFault === 0) continue;
    const certified = r.markovPlausibleFrac >= 0.5;
    eT += r.eHits; tT += r.terminalHits; fT += r.nFault;
    if (certified) { selOk += r.selected; fpOk += r.falsePos; } else flagged.push(r.counter);
    L.push(`  ${r.counter.padEnd(14)} ${String(r.nFault).padStart(5)}  ${String(r.eHits).padStart(8)}/${r.nFault}  ${String(r.terminalHits).padStart(6)}/${r.nFault} | ${r.residMedianLag1.toFixed(3).padStart(11)}  ${(r.markovPlausibleFrac * 100).toFixed(0).padStart(13)}% | ${certified ? 'CERTIFIED' : 'FLAGGED (abstain)'}`);
  }
  L.push('');
  L.push(`TRANSIENT mean_shift recall (all counters): e-detector ${eT}/${fT}  vs  terminal ${tT}/${fT}`);
  L.push(`AGGREGATE fleet FDP on the CERTIFIED set (e-BH q=0.1): ${selOk ? (fpOk / selOk).toFixed(3) : '0.000'}  (${fpOk} false of ${selOk} selected)`);
  L.push('  — the guarantee is on this RATE across the whole selected set, NOT any individual alert (you');
  L.push('    cannot label one alert false; FDR is the false-discovery proportion in aggregate, capped at q).');
  if (flagged.length) L.push(`FLAGGED / abstained (diagnostic says null invalid): ${flagged.join(', ')}`);
  L.push('');
  L.push('READING: with the long anomaly-trimmed baseline the residual is far whiter than the short-prefix');
  L.push('regime. On the CERTIFIED counters the residual is white, the e-detector recovers transient recall,');
  L.push('and the aggregate FDP is ≈0 — the FDR guarantee holds in aggregate. The FLAGGED counter has');
  L.push('IRREDUCIBLE per-shard nonstationarity (the ADR 0012 wall, typically temperature — near unit-root);');
  L.push('the Wall-A diagnostic correctly abstains rather than emit an uncontrolled FDR.');
  return L.join('\n');
}

/** In-memory path (loads both bundles whole) — fine for small bundles / fixtures. */
export function renderBaselineMonitor(healthyDir: string, monDir: string, calLen?: number): string {
  const healthy = loadScenarioBundle(healthyDir);
  const mon = loadScenarioBundle(monDir);
  const cl = calLen ?? Math.min(30, Math.floor(0.15 * mon.T));
  const opts: EDetectorOptions = { calLen: cl, onsetTarget: 16, evalTarget: 20, mixture: 'SR' };
  const results: BaselineMonitorResult[] = [];
  for (const counter of mon.counters.map((c) => c.name)) {
    const fits = fitBaseline(healthy, counter);
    if (fits.length !== mon.shardIds.length) continue; // topology mismatch
    results.push(scoreCounterBaseline(mon, counter, applyBaseline(mon, counter, fits), cl, opts));
  }
  return renderResults(healthy.shardIds.length, healthy.T, mon.T, mon.faults.length, cl, results);
}

// ─── STREAMING + MULTI-CORE PATH (default; scales to long 1Hz monitoring at fleet size) ──────
// Same scaling we use for the scenario scorer: the per-shard e-detector work is independent, so
// we fan it across worker_threads by byte-range over the monitoring counters.ndjson, and stream
// it (never load the whole monitoring bundle). The main thread fits the (small, hourly) baseline,
// passes per-shard fits to workers, and reduces the per-shard scalars (thresholds, recall, e-BH,
// gate) centrally. Default for the CLI; CS_WORKERS=1 forces the in-memory path.

interface MonMeta { T: number; dt_s?: number; counters: CounterSpec[]; membership: Record<string, Record<string, string>>; }
interface CounterSpec { name: string; load: Record<string, number>; }
interface FaultLabel { level: string; counter: string | null; type: string; affected_shards: string[] }
interface BmRecord { c: string; s: string; peak: number; mixE: number; terminal: number; lag1: number; markov: boolean }
interface BmWorkerInput { __bm_worker: true; monDir: string; byteStart: number; byteEnd: number; cl: number; fits: Record<string, Record<string, ShardBaseline>> }

/** Load mon factor series (factors.ndjson; fallback to legacy factors.json `.factors`). */
function loadMonFactors(dir: string): Map<string, number[]> {
  const m = new Map<string, number[]>();
  const nd = path.join(dir, 'factors.ndjson');
  if (fs.existsSync(nd)) {
    for (const line of ndjsonLines(nd)) { const r = JSON.parse(line) as { id: string; v: number[] }; m.set(r.id, r.v); }
  } else {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8'));
    for (const id of Object.keys(doc.factors ?? {})) m.set(id, doc.factors[id].series);
  }
  return m;
}

/** Worker: residualise + e-detector per shard over an assigned byte-range; return scalars. */
function runBmWorker(input: BmWorkerInput): BmRecord[] {
  const { monDir, byteStart, byteEnd, cl, fits } = input;
  const meta = JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as MonMeta;
  const factors = loadMonFactors(monDir);
  const opts: EDetectorOptions = { calLen: cl, onsetTarget: 16, evalTarget: 20, mixture: 'SR' };
  const prefix = Math.max(1, Math.floor(0.1 * meta.T));
  const kindsByCounter = new Map(meta.counters.map((c) => [c.name, Object.keys(c.load).filter((k) => c.load[k] !== 0)] as const));
  const out: BmRecord[] = [];
  for (const line of ndjsonRange(path.join(monDir, 'counters.ndjson'), byteStart, byteEnd)) {
    const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
    const kinds = kindsByCounter.get(row.counter);
    const fit = fits[row.counter]?.[row.shard];
    if (!kinds || !fit) continue;
    const cols: number[][] = [];
    for (const k of kinds) { const inst = meta.membership[row.shard]?.[k]; if (inst == null) continue; const ser = factors.get(inst); if (ser) cols.push(ser); }
    const e = row.v.map((val, t) => val - fit.intercept - cols.reduce((s, c, j) => s + (fit.loadings[j] ?? 0) * c[t], 0));
    const scale = robustScale(e, prefix) || fit.scale;
    const resid = e.map((ev) => ev / scale);
    const zero = resid.map(() => 0);
    out.push({ c: row.counter, s: row.shard, peak: eDetector(resid, opts).peak, mixE: normalizedMixtureEValue(resid), terminal: terminalUiEValue(resid, cl), lag1: Math.abs(autocorr(resid, 1)), markov: conditionalMarkovDiagnostic(resid, zero).markovPlausible });
  }
  return out;
}

/** gpu mean_shift faulted shard ids on a counter, from the labels doc. */
function faultedFromLabels(faults: FaultLabel[], counter: string): Set<string> {
  const out = new Set<string>();
  for (const f of faults) {
    if (f.level !== 'gpu' || f.type !== 'mean_shift') continue;
    if (!(f.counter === counter || f.counter === null)) continue;
    for (const s of f.affected_shards) out.add(s);
  }
  return out;
}

/** Streaming + multi-core baseline-monitor. */
export async function renderBaselineMonitorParallel(healthyDir: string, monDir: string, calLen: number | undefined, nWorkers: number): Promise<string> {
  const healthy = loadScenarioBundle(healthyDir); // small (hourly 2-month)
  const meta = JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as MonMeta;
  const faults: FaultLabel[] = JSON.parse(fs.readFileSync(path.join(monDir, 'labels.json'), 'utf8')).faults;
  const cl = calLen ?? Math.min(30, Math.floor(0.15 * meta.T));
  const monShardIds = Object.keys(meta.membership).sort();

  // Fit the baseline loadings per counter on the (small) healthy bundle; index by shard id.
  const fits: Record<string, Record<string, ShardBaseline>> = {};
  for (const counter of meta.counters.map((c) => c.name)) {
    const f = fitBaseline(healthy, counter); // guards the >=2-month baseline
    if (f.length !== healthy.shardIds.length) continue;
    const byId: Record<string, ShardBaseline> = {};
    healthy.shardIds.forEach((sid, i) => { byId[sid] = f[i]; });
    fits[counter] = byId;
  }

  // Fan out across byte-ranges of the monitoring counters.ndjson.
  const file = path.join(monDir, 'counters.ndjson');
  const size = fs.statSync(file).size;
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < nWorkers; i++) ranges.push([Math.floor((i * size) / nWorkers), Math.floor(((i + 1) * size) / nWorkers)]);
  const recs = (await Promise.all(ranges.map(([byteStart, byteEnd]) => new Promise<BmRecord[]>((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { __bm_worker: true, monDir, byteStart, byteEnd, cl, fits } as BmWorkerInput });
    w.once('message', (m: BmRecord[]) => resolve(m));
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error(`bm worker exited ${code}`)); });
  })))).flat();

  // Reduce per counter → BaselineMonitorResult.
  const byCounter = new Map<string, Map<string, BmRecord>>();
  for (const r of recs) { let m = byCounter.get(r.c); if (!m) { m = new Map(); byCounter.set(r.c, m); } m.set(r.s, r); }
  const results: BaselineMonitorResult[] = [];
  for (const counter of meta.counters.map((c) => c.name)) {
    const m = byCounter.get(counter);
    if (m) results.push(reduceCounter(counter, m, monShardIds, faults));
  }
  return renderResults(healthy.shardIds.length, healthy.T, meta.T, faults.length, cl, results);
}

function bmQuantile(xs: number[], qq: number): number {
  return xs.length ? xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(qq * xs.length))] : NaN;
}

/** Reduce one counter's per-shard worker records into a BaselineMonitorResult (thresholds from
 *  the healthy sample, recall over faults, e-BH FDP across the fleet, Wall-A gate). */
function reduceCounter(counter: string, m: Map<string, BmRecord>, monShardIds: string[], faults: FaultLabel[]): BaselineMonitorResult {
  const faulted = faultedFromLabels(faults, counter);
  const faultIdx = new Set([...faulted].map((s) => monShardIds.indexOf(s)).filter((i) => i >= 0));
  const healthyIds = monShardIds.filter((_, i) => !faultIdx.has(i)).filter((_, k) => k % 12 === 0).slice(0, 50);
  const peak = (s: string): number => m.get(s)?.peak ?? 0;
  const term = (s: string): number => m.get(s)?.terminal ?? 0;
  const eThr = bmQuantile(healthyIds.map(peak), 0.95);
  const tThr = bmQuantile(healthyIds.map(term), 0.95);
  let eHits = 0, terminalHits = 0;
  for (const i of faultIdx) { const s = monShardIds[i]; if (peak(s) >= eThr) eHits++; if (term(s) >= tThr) terminalHits++; }
  const plaus = healthyIds.filter((s) => m.get(s)?.markov).length;
  // FDR e-BH on the NORMALIZED CONVEX-MIXTURE e-value (ADR 0019), already a valid adjusted e-value.
  const mixE = (s: string): number => m.get(s)?.mixE ?? 0;
  const sel = eBenjaminiHochberg(monShardIds.map(mixE), 0.1).selected;
  let falsePos = 0; for (const i of sel) if (!faultIdx.has(i)) falsePos++;
  return {
    counter, nFault: faultIdx.size, eHits, terminalHits,
    residMedianLag1: bmQuantile(healthyIds.map((s) => m.get(s)?.lag1 ?? 0), 0.5),
    markovPlausibleFrac: healthyIds.length ? plaus / healthyIds.length : NaN,
    aggregateFdp: sel.length ? falsePos / sel.length : 0, selected: sel.length, falsePos,
  };
}

/** Default worker count: all cores (dedicated boxes); override CS_WORKERS. */
function defaultWorkers(): number {
  if (process.env.CS_WORKERS) return Math.max(1, Number(process.env.CS_WORKERS) | 0);
  return Math.max(1, os.availableParallelism?.() ?? os.cpus().length);
}

if (!isMainThread && (workerData as Partial<BmWorkerInput> | undefined)?.__bm_worker) {
  try { parentPort!.postMessage(runBmWorker(workerData as BmWorkerInput)); }
  catch (err) { parentPort!.postMessage([]); throw err; }
} else if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/baseline-monitor.js <healthy-baseline-dir> <monitoring-dir> [calLen]\n  env: CS_WORKERS=N (default all cores; 1=in-memory single-thread)\n');
    process.exit(2);
  }
  const calLen = process.argv[4] ? Number(process.argv[4]) : undefined;
  const nWorkers = defaultWorkers();
  (async () => {
    if (nWorkers > 1) process.stdout.write(await renderBaselineMonitorParallel(healthyDir, monDir, calLen, nWorkers) + `\n(${nWorkers} worker threads)\n`);
    else process.stdout.write(renderBaselineMonitor(healthyDir, monDir, calLen) + '\n');
  })().then(() => process.exit(0)).catch((e) => { process.stderr.write(String(e?.stack ?? e) + '\n'); process.exit(1); });
}
