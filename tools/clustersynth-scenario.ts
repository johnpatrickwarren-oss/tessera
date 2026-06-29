// tools/clustersynth-scenario.ts — run the detection pipeline against a clustersynth
// SCENARIO BUNDLE: the adversarial, labeled, fleet-scale telemetry the scenario harness
// emits (`clustersynth scenario config.json --out-dir DIR`). Unlike tools/clustersynth-
// telemetry.ts (which we generate ourselves in the favourable regime — scalar loadings,
// stationary common-mode), the bundle is deliberately hard:
//   - HETEROGENEOUS per-shard×counter loadings on the common-mode factors;
//   - NONSTATIONARY factor processes (thermal ramp / diurnal / regime change);
//   - a labeled fault taxonomy: mean_shift, drift, variance_collapse (+ detachment),
//     at gpu / cdu / pod levels, transient (onset→offset), ~1% gpu density.
//
// The bundle provides the MEASURED factor signals (factors.json) and ground-truth labels
// (labels.json), so this is the honest end-to-end test: feed factors.json as the measured
// common-mode, residualise per counter, and score per-shard detection against the labels.
//
// HONEST FINDING (see the report this prints): the instrumented common-mode removal is
// clean (no spurious FPs), but a single MEAN-SHIFT e-value only catches mean_shift faults —
// it MISSES drift and variance_collapse by construction (a ramp/variance change is not a
// mean step). That is why the engine ships detector FAMILIES: distributionalSignature
// (trendT for drift, fRatio for variance) recovers exactly what the mean-shift e-value
// misses. The per-shard pipeline targets IDIOSYNCRATIC (gpu-level) faults; cdu/pod faults
// are common-mode events it is meant to remove, not flag per-shard.
//
// Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { instrumentedCommonModeResiduals } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/instrumented-common-mode';
import { universalInferenceMeanShiftEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/universal-inference-e-value';
import { nuisanceRobustBFEValue, MIN_CALIBRATION_FOR_VALIDITY } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/nuisance-robust-bf-e-value';
import { distributionalSignature } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/distributional-signature';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { eBHConditionalCalibration } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh-conditional-calibration';
import { gaussianLrEValue, gaussianLrNullSurvival } from './gaussian-lr-evalue.js';
import { assertLongBaseline } from './baseline-guard.js';

export type FaultType = 'mean_shift' | 'drift' | 'variance_collapse' | 'detachment';
export type FaultLevel = 'gpu' | 'cdu' | 'pod';

interface CounterSpec { name: string; load: Record<string, number>; }
interface FactorEntry { kind: string; series: number[]; }
interface FaultLabel {
  level: FaultLevel; counter: string | null; type: FaultType;
  t_onset: number; t_offset: number; affected_shards: string[];
}

export interface ScenarioBundle {
  T: number;
  /** Cadence (seconds per tick) — needed by the short-window guard to compute baseline days. */
  dt_s: number;
  shardIds: string[];
  counters: CounterSpec[];
  factors: Record<string, FactorEntry>;
  membership: Record<string, Record<string, string>>; // shard → kind → factor instance id
  faults: FaultLabel[];
  /** (shard, counter) → counter series. */
  series: Map<string, number[]>;
}

/** Yield complete lines from a file via chunked reads — never materialises the whole file
 *  as one JS string, so it is immune to V8's ~512 MB max-string-length cap. This matters for
 *  long-duration high-cadence (1 Hz) bundles whose counters.ndjson runs to multiple GB. */
export function* ndjsonLines(filePath: string): Generator<string> {
  const fd = fs.openSync(filePath, 'r');
  try {
    const CHUNK = 1 << 22; // 4 MB
    const buf = Buffer.allocUnsafe(CHUNK);
    const decoder = new StringDecoder('utf8');
    let leftover = '';
    let bytes: number;
    while ((bytes = fs.readSync(fd, buf, 0, CHUNK, null)) > 0) {
      leftover += decoder.write(buf.subarray(0, bytes));
      let nl: number;
      while ((nl = leftover.indexOf('\n')) >= 0) {
        const line = leftover.slice(0, nl);
        leftover = leftover.slice(nl + 1);
        if (line.length) yield line;
      }
    }
    leftover += decoder.end();
    if (leftover.trim().length) yield leftover;
  } finally {
    fs.closeSync(fd);
  }
}

/** Load a scenario bundle directory (factors.json + labels.json + counters.ndjson).
 *  `counterFilter`, when given, loads only those counter rows into memory (the rest are
 *  parsed-and-dropped) — keeps RAM flat when a bundle holds counters you will not score. */
export function loadScenarioBundle(dir: string, counterFilter?: ReadonlySet<string>): ScenarioBundle {
  const factorsDoc = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8'));
  const faults: FaultLabel[] = JSON.parse(fs.readFileSync(path.join(dir, 'labels.json'), 'utf8')).faults;
  // Factor series: stream factors.ndjson (new format; factors.json is meta-only), else fall back
  // to the legacy factors.json `.factors` field (old committed fixtures).
  const factors: Record<string, FactorEntry> = {};
  const ndFactors = path.join(dir, 'factors.ndjson');
  if (fs.existsSync(ndFactors)) {
    for (const line of ndjsonLines(ndFactors)) {
      const row = JSON.parse(line) as { id: string; kind: string; v: number[] };
      factors[row.id] = { kind: row.kind, series: row.v };
    }
  } else if (factorsDoc.factors) {
    for (const id of Object.keys(factorsDoc.factors)) factors[id] = factorsDoc.factors[id];
  }
  const series = new Map<string, number[]>();
  const shardSet = new Set<string>();
  for (const line of ndjsonLines(path.join(dir, 'counters.ndjson'))) {
    const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
    shardSet.add(row.shard);
    if (counterFilter && !counterFilter.has(row.counter)) continue;
    series.set(`${row.shard}\0${row.counter}`, row.v);
  }
  return {
    T: factorsDoc.T,
    dt_s: factorsDoc.dt_s ?? 1,
    shardIds: [...shardSet].sort(),
    counters: factorsDoc.counters,
    factors,
    membership: factorsDoc.membership,
    faults,
    series,
  };
}

/** Assemble, for one counter, the shard×tick matrix + measured factor signals + per-shard
 *  membership (only the factor KINDS this counter loads on, via each shard's membership). */
export function counterMatrices(b: ScenarioBundle, counterName: string): {
  X: number[][]; factorSignals: number[][]; membership: number[][];
} {
  const spec = b.counters.find((c) => c.name === counterName)!;
  const kinds = Object.keys(spec.load).filter((k) => spec.load[k] !== 0);
  const instIndex = new Map<string, number>();
  const factorSignals: number[][] = [];
  const membership = b.shardIds.map((sid) => {
    const m = b.membership[sid];
    const idxs: number[] = [];
    for (const k of kinds) {
      const inst = m?.[k];
      if (inst == null) continue;
      let fi = instIndex.get(inst);
      if (fi === undefined) { fi = factorSignals.length; instIndex.set(inst, fi); factorSignals.push(b.factors[inst].series); }
      idxs.push(fi);
    }
    return idxs;
  });
  const X = b.shardIds.map((sid) => b.series.get(`${sid}\0${counterName}`)!);
  return { X, factorSignals, membership };
}

/** A shard is a per-shard (idiosyncratic) positive for a counter if a GPU-level fault of a
 *  given type, matching the counter (or counter-agnostic), is active in the test window. */
function failedShardsByType(b: ScenarioBundle, counterName: string, calLen: number, type: FaultType): Set<string> {
  const out = new Set<string>();
  for (const f of b.faults) {
    if (f.level !== 'gpu' || f.type !== type) continue;
    if (!(f.counter === null || f.counter === counterName)) continue;
    if (!(f.t_offset > calLen && f.t_onset < b.T)) continue; // active in [calLen, T)
    for (const s of f.affected_shards) out.add(s);
  }
  return out;
}

export interface FdrPathScore { nFault: number; K: number; power: number; fdp: number; }

export interface CounterScore {
  counter: string;
  /** e-BH on the plug-in UI mean-shift e-value, vs mean_shift gpu faults. */
  meanShift: FdrPathScore;
  /** e-BH on the NUISANCE-ROBUST BF e-value (baseline mean integrated out; E[BF|H0]≤1 by
   *  construction). NaN/zeroed when cal < the validity floor (cal must be ≥ MIN_CALIBRATION). */
  bf: FdrPathScore & { valid: boolean };
  /** Gaussian-LR mean-shift e-value: plain e-BH vs Lee–Ren conditional-calibration BOOSTING
   *  (engine ADR 0006). Boosting is a deterministic superset at the same FDR target — the
   *  free-power lever. K_boosted ≥ K_plain always. */
  glr: { plain: FdrPathScore; boosted: FdrPathScore };
  /** Per fault type: detection recall by the mean-shift e-value vs distributionalSignature. */
  byType: Record<FaultType, { nFault: number; uiHits: number; sigHits: number }>;
  /** distributionalSignature on shards with NO gpu fault — the nuisance false-positive rate.
   *  (Without this, the per-type recall above is meaningless: the signature also fires on the
   *  nonstationary common-mode residual.) */
  sigHealthy: { nHealthy: number; sigFP: number };
}

const FAULT_TYPES: FaultType[] = ['mean_shift', 'drift', 'variance_collapse', 'detachment'];

/** Indices of shards with a mean_shift gpu fault active in the test window. */
function meanShiftIdx(b: ScenarioBundle, counterName: string, calLen: number): Set<number> {
  const failed = failedShardsByType(b, counterName, calLen, 'mean_shift');
  return new Set(b.shardIds.map((s, i) => (failed.has(s) ? i : -1)).filter((i) => i >= 0));
}

/** Score an e-BH selection set against the mean_shift fault indices. */
function scoreSelection(idx: Set<number>, selected: ReadonlyArray<number>): FdrPathScore {
  let tp = 0;
  for (const i of selected) if (idx.has(i)) tp++;
  const K = selected.length;
  return { nFault: idx.size, K, power: idx.size ? tp / idx.size : NaN, fdp: K ? (K - tp) / K : 0 };
}

/** Per-fault-type recall: mean-shift e-value (e>1) vs distributionalSignature.hasSignature. */
function recallByType(b: ScenarioBundle, counterName: string, calLen: number, uiE: number[], sig: boolean[]): CounterScore['byType'] {
  const byType = {} as CounterScore['byType'];
  for (const type of FAULT_TYPES) {
    const failed = failedShardsByType(b, counterName, calLen, type);
    let uiHits = 0, sigHits = 0;
    for (const s of failed) {
      const i = b.shardIds.indexOf(s);
      if (i < 0) continue;
      if (uiE[i] > 1) uiHits++;
      if (sig[i]) sigHits++;
    }
    byType[type] = { nFault: failed.size, uiHits, sigHits };
  }
  return byType;
}

/** distributionalSignature false positives on shards carrying NO gpu fault. */
function signatureHealthyFP(b: ScenarioBundle, counterName: string, calLen: number, sig: boolean[]): CounterScore['sigHealthy'] {
  const anyFaulted = new Set<string>();
  for (const type of FAULT_TYPES) for (const s of failedShardsByType(b, counterName, calLen, type)) anyFaulted.add(s);
  let nHealthy = 0, sigFP = 0;
  for (let i = 0; i < b.shardIds.length; i++) {
    if (anyFaulted.has(b.shardIds[i])) continue;
    nHealthy++;
    if (sig[i]) sigFP++;
  }
  return { nHealthy, sigFP };
}

/** Run the instrumented pipeline + the detectors on one counter and score by fault type. */
export function scoreCounter(b: ScenarioBundle, counterName: string, calLen: number, q: number): CounterScore {
  assertLongBaseline(calLen, b.dt_s, `scoreCounter(${counterName})`);
  const { X, factorSignals, membership } = counterMatrices(b, counterName);
  const R = instrumentedCommonModeResiduals(X, calLen, factorSignals, membership);
  const cal = { start: 0, len: calLen };
  const test = { start: calLen, len: b.T - calLen };
  const uiE = R.map((r) => safeUi(r, cal, test));
  const sig = R.map((r) => safeSig(r, cal, test));
  // Nuisance-robust BF e-value (baseline mean integrated out) — only valid for cal ≥ the floor.
  const bfValid = calLen >= MIN_CALIBRATION_FOR_VALIDITY;
  const bfE = bfValid ? R.map((r) => safeBf(r, cal, test)) : R.map(() => 0);
  // Gaussian-LR e-value (known null survival) — plain e-BH vs conditional-calibration boosting.
  const glrE = R.map((r) => gaussianLrEValue(r, cal, test));
  const survival = gaussianLrNullSurvival();
  const idx = meanShiftIdx(b, counterName, calLen);
  return {
    counter: counterName,
    meanShift: scoreSelection(idx, eBenjaminiHochberg(uiE, q).selected),
    bf: { ...scoreSelection(idx, eBenjaminiHochberg(bfE, q).selected), valid: bfValid },
    glr: {
      plain: scoreSelection(idx, eBenjaminiHochberg(glrE, q).selected),
      boosted: scoreSelection(idx, eBHConditionalCalibration(glrE, q, (_j, x) => survival(x)).selected),
    },
    byType: recallByType(b, counterName, calLen, uiE, sig),
    sigHealthy: signatureHealthyFP(b, counterName, calLen, sig),
  };
}

function safeUi(r: number[], cal: { start: number; len: number }, test: { start: number; len: number }): number {
  try { return universalInferenceMeanShiftEValue(r, cal, test); } catch { return 0; }
}
function safeBf(r: number[], cal: { start: number; len: number }, test: { start: number; len: number }): number {
  try { return nuisanceRobustBFEValue(r, cal, test); } catch { return 0; }
}
function safeSig(r: number[], cal: { start: number; len: number }, test: { start: number; len: number }): boolean {
  try { return distributionalSignature(r, cal, test).hasSignature; } catch { return false; }
}

/** Score every counter in a bundle. `calLen` defaults to 10% of T (the clean prefix before
 *  the earliest fault onset, which the harness places in [0.1·T, 0.5·T]). */
export function scoreBundle(dir: string, q = 0.05, calLen?: number): { bundle: ScenarioBundle; scores: CounterScore[] } {
  const bundle = loadScenarioBundle(dir);
  const cl = calLen ?? Math.floor(0.1 * bundle.T);
  return { bundle, scores: bundle.counters.map((c) => scoreCounter(bundle, c.name, cl, q)) };
}

/** Header facts shared by the in-memory and streaming render paths. */
interface ReportMeta { dir: string; nShards: number; T: number; nCounters: number; nFaults: number; }

/** Render an honest per-counter + per-fault-type report from pre-computed scores. */
export function renderReport(meta: ReportMeta, scores: CounterScore[], q = 0.05): string {
  const lines: string[] = [];
  lines.push(`clustersynth SCENARIO bundle — adversarial, labeled telemetry. dir=${meta.dir}`);
  lines.push(`${meta.nShards} shards, T=${meta.T}, ${meta.nCounters} counters, ${meta.nFaults} faults. FDR q=${q}.`);
  lines.push('');
  const bfValid = scores.some((s) => s.bf.valid);
  lines.push('Valid-FDR path (mean-shift e-value → e-BH), scored vs gpu mean_shift faults.');
  lines.push(`  ui = plug-in UI e-value;  bf = NUISANCE-ROBUST BF e-value (baseline integrated out, cal≥${MIN_CALIBRATION_FOR_VALIDITY})${bfValid ? '' : ' — SKIPPED: cal below validity floor'}`);
  lines.push('  counter           nFault  ui:K power  FDP   bf:K power  FDP');
  for (const s of scores) {
    const m = s.meanShift, bf = s.bf;
    const bfCols = bf.valid ? `${String(bf.K).padStart(3)} ${fmt(bf.power)} ${fmt(bf.fdp)}` : ' (cal<floor)';
    lines.push(`  ${s.counter.padEnd(16)} ${String(m.nFault).padStart(5)}  ${String(m.K).padStart(3)} ${fmt(m.power)} ${fmt(m.fdp)}   ${bfCols}`);
  }
  lines.push('');
  lines.push('Conditional-calibration BOOSTING (Lee–Ren, ADR 0006) on the Gaussian-LR e-value — free power at same q:');
  lines.push('  counter           nFault  plain:K power  FDP   boost:K power  FDP');
  for (const s of scores) {
    const p = s.glr.plain, bo = s.glr.boosted;
    lines.push(`  ${s.counter.padEnd(16)} ${String(p.nFault).padStart(5)}  ${String(p.K).padStart(5)} ${fmt(p.power)} ${fmt(p.fdp)}  ${String(bo.K).padStart(5)} ${fmt(bo.power)} ${fmt(bo.fdp)}`);
  }
  lines.push('');
  lines.push('Per-fault-type recall — mean-shift e-value (ui) vs distributionalSignature (sig), summed over counters:');
  const agg: Record<string, { n: number; ui: number; sig: number }> = {};
  for (const s of scores) for (const t of FAULT_TYPES) {
    const x = s.byType[t]; const a = (agg[t] ??= { n: 0, ui: 0, sig: 0 });
    a.n += x.nFault; a.ui += x.uiHits; a.sig += x.sigHits;
  }
  lines.push('  fault type          nFault  ui-hits  sig-hits');
  for (const t of FAULT_TYPES) {
    const a = agg[t]; if (!a || a.n === 0) continue;
    lines.push(`  ${t.padEnd(18)} ${String(a.n).padStart(5)}  ${String(a.ui).padStart(7)}  ${String(a.sig).padStart(8)}`);
  }
  // The recall above is only meaningful next to the signature's HEALTHY false-positive rate.
  let nHealthy = 0, sigFP = 0;
  for (const s of scores) { nHealthy += s.sigHealthy.nHealthy; sigFP += s.sigHealthy.sigFP; }
  const fpRate = nHealthy ? sigFP / nHealthy : 0;
  lines.push('');
  lines.push(`distributionalSignature on HEALTHY shards: ${sigFP}/${nHealthy} flagged = ${(100 * fpRate).toFixed(1)}% false-positive rate.`);
  lines.push('');
  lines.push('HONEST READING. On this adversarial regime (heterogeneous loadings + NONSTATIONARY factors +');
  lines.push('transient mixed-type faults) neither detector gives clean, FDR-controlled detection:');
  lines.push('  • the UI mean-shift e-value is VALID but UNDERPOWERED — it selects ~nothing (transient faults');
  lines.push('    diluted over a fixed test window; it cannot see drift or variance changes by construction);');
  lines.push(`  • distributionalSignature has high raw recall but a ~${(100 * fpRate).toFixed(0)}% nuisance FP rate — the nonstationary`);
  lines.push('    residual trips its thresholds, so the recall is not usable as an FDR-controlled discovery set;');
  lines.push('  • Lee–Ren BOOSTING does what it promises (K_boosted ≥ K_plain, a deterministic superset) — but it');
  lines.push('    is a POWER lever, NOT an FDR fix: the Gaussian-LR base e-value\'s null is already violated by the');
  lines.push('    nonstationarity, so the boost amplifies true AND false positives together (FDP rises). Free power');
  lines.push('    holds only at the STATED FDR, which nonstationarity has already broken. Orthogonal to the problem.');
  lines.push('This is the project\'s core finding at scale (ADR 0011/0012): the guarantee that holds on stationary');
  lines.push('synthetic data does NOT transfer to nonstationary telemetry — and no detector tuning (nuisance-robust');
  lines.push('BF, boosting) closes it; the φ-integration + cross-sectional-recalibration routes are documented WALLS');
  lines.push('(ADR 0009/0013). The instrumented common-mode REMOVAL stays clean — the gap is the per-shard NULL.');
  return lines.join('\n');
}

/** In-memory render path (loads the whole bundle; fine for small/committed fixtures). */
export function renderScenario(dir: string, q = 0.05): string {
  const { bundle, scores } = scoreBundle(dir, q);
  return renderReport(
    { dir, nShards: bundle.shardIds.length, T: bundle.T, nCounters: bundle.counters.length, nFaults: bundle.faults.length },
    scores, q);
}

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

// ─── STREAMING PATH (memory-lean, scales to many racks) ──────────────────────
// The in-memory path above holds every shard's series PLUS a full residual copy
// (~6 GB per NVL72 rack at a 2-month 1 Hz window). The streaming path instead keeps
// only the shared measured factor series in RAM, then processes one shard at a time:
// read its counter row, remove the instrumented common-mode against just that shard's
// factors, compute the per-shard e-values/signature, keep the scalars, drop the series.
// Peak RAM ≈ the factor sidecar (~0.4 GB per rack) + one shard's working set, so the
// rack ceiling rises ~16× versus the in-memory path. Output is byte-identical.

interface FactorsMeta { T: number; dt_s?: number; counters: CounterSpec[]; membership: Record<string, Record<string, string>>; }

/** Load the measured factor series: stream factors.ndjson when present (no string cap),
 *  else fall back to the legacy factors.json `.factors` field (old committed fixtures). */
function loadFactorSeries(dir: string): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const nd = path.join(dir, 'factors.ndjson');
  if (fs.existsSync(nd)) {
    for (const line of ndjsonLines(nd)) {
      const row = JSON.parse(line) as { id: string; v: number[] };
      map.set(row.id, row.v);
    }
  } else {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8'));
    for (const id of Object.keys(doc.factors ?? {})) map.set(id, doc.factors[id].series);
  }
  return map;
}

/** The four per-shard detector scalars (ui mean-shift e-value, signature flag, nuisance-robust
 *  BF e-value, Gaussian-LR e-value) after removing the shard's instrumented common-mode. */
interface ShardScalars { ui: number; sig: boolean; bf: number; glr: number; }

/** Window spec. */
interface Span { start: number; len: number; }

/** Residualise one shard against its measured factors and compute the four detector scalars.
 *  This is the per-shard unit of work — independent across shards, hence trivially parallel. */
function shardScalars(
  v: number[], kinds: string[], membership: Record<string, string>,
  factorSeries: Map<string, number[]>, cl: number, cal: Span, test: Span, bfValid: boolean,
): ShardScalars {
  const sigs: number[][] = [];
  for (const k of kinds) {
    const inst = membership[k];
    if (inst == null) continue;
    const ser = factorSeries.get(inst);
    if (ser) sigs.push(ser);
  }
  const r = instrumentedCommonModeResiduals([v], cl, sigs, [sigs.map((_, i) => i)])[0];
  return {
    ui: safeUi(r, cal, test),
    sig: safeSig(r, cal, test),
    bf: bfValid ? safeBf(r, cal, test) : 0,
    glr: gaussianLrEValue(r, cal, test),
  };
}

/** Per-counter accumulators of the per-shard scalars, indexed by shard. */
interface Acc { ui: number[]; bf: number[]; glr: number[]; sig: boolean[]; }
function emptyAcc(n: number): Acc {
  return { ui: new Array<number>(n).fill(0), bf: new Array<number>(n).fill(0), glr: new Array<number>(n).fill(0), sig: new Array<boolean>(n).fill(false) };
}

/** Run e-BH + per-fault-type scoring from filled accumulators (the cheap fleet-level combine). */
function scoreFromAcc(
  dir: string, T: number, shardIds: string[], counters: CounterSpec[], faults: FaultLabel[],
  cl: number, q: number, acc: Acc[], bfValid: boolean,
): { meta: ReportMeta; scores: CounterScore[] } {
  const b: ScenarioBundle = { T, dt_s: 1, shardIds, counters, factors: {}, membership: {}, faults, series: new Map() };
  const survival = gaussianLrNullSurvival();
  const scores: CounterScore[] = counters.map((c, ci) => {
    const a = acc[ci];
    const idx = meanShiftIdx(b, c.name, cl);
    return {
      counter: c.name,
      meanShift: scoreSelection(idx, eBenjaminiHochberg(a.ui, q).selected),
      bf: { ...scoreSelection(idx, eBenjaminiHochberg(a.bf, q).selected), valid: bfValid },
      glr: {
        plain: scoreSelection(idx, eBenjaminiHochberg(a.glr, q).selected),
        boosted: scoreSelection(idx, eBHConditionalCalibration(a.glr, q, (_j, x) => survival(x)).selected),
      },
      byType: recallByType(b, c.name, cl, a.ui, a.sig),
      sigHealthy: signatureHealthyFP(b, c.name, cl, a.sig),
    };
  });
  return { meta: { dir, nShards: shardIds.length, T, nCounters: counters.length, nFaults: faults.length }, scores };
}

/** Score every counter in a bundle WITHOUT materialising all series at once (single core). */
export function scoreBundleStreaming(dir: string, q = 0.05, calLen?: number): { meta: ReportMeta; scores: CounterScore[] } {
  const fmeta = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8')) as FactorsMeta & { factors?: unknown };
  const faults: FaultLabel[] = JSON.parse(fs.readFileSync(path.join(dir, 'labels.json'), 'utf8')).faults;
  const factorSeries = loadFactorSeries(dir);
  const shardIds = Object.keys(fmeta.membership).sort();
  const shardIndex = new Map(shardIds.map((s, i) => [s, i] as const));
  const T = fmeta.T;
  const cl = calLen ?? Math.floor(0.1 * T);
  assertLongBaseline(cl, fmeta.dt_s ?? 1, 'scoreBundleStreaming');
  const cal = { start: 0, len: cl };
  const test = { start: cl, len: T - cl };
  const bfValid = cl >= MIN_CALIBRATION_FOR_VALIDITY;
  const counters = fmeta.counters;
  const counterIndex = new Map(counters.map((c, i) => [c.name, i] as const));
  const kindsByCounter = counters.map((c) => Object.keys(c.load).filter((k) => c.load[k] !== 0));
  const acc = counters.map(() => emptyAcc(shardIds.length));

  for (const line of ndjsonLines(path.join(dir, 'counters.ndjson'))) {
    const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
    const ci = counterIndex.get(row.counter);
    if (ci === undefined) continue;
    const si = shardIndex.get(row.shard);
    if (si === undefined) continue;
    const sc = shardScalars(row.v, kindsByCounter[ci], fmeta.membership[row.shard] ?? {}, factorSeries, cl, cal, test, bfValid);
    acc[ci].ui[si] = sc.ui; acc[ci].sig[si] = sc.sig; acc[ci].bf[si] = sc.bf; acc[ci].glr[si] = sc.glr;
  }
  return scoreFromAcc(dir, T, shardIds, counters, faults, cl, q, acc, bfValid);
}

/** Streaming render path (single core). */
export function renderScenarioStreaming(dir: string, q = 0.05, calLen?: number): string {
  const { meta, scores } = scoreBundleStreaming(dir, q, calLen);
  return renderReport(meta, scores, q);
}

// ─── MULTI-CORE PATH ─────────────────────────────────────────────────────────
// The per-shard work is independent, so we fan it out across worker_threads and reduce
// the (tiny) scalar e-values centrally. counters.ndjson is split into byte RANGES; each
// worker owns the lines whose start offset falls in its range (lines are written in shard
// order, so this cleanly partitions shards). Speedup ≈ cores−1; results are identical.

interface WorkerRecord { c: string; s: string; ui: number; sig: boolean; bf: number; glr: number; }
interface WorkerInput { __cs_worker: true; dir: string; byteStart: number; byteEnd: number; cl: number; bfValid: boolean; }

/** Yield lines whose START byte offset is in [byteStart, byteEnd). ASCII (offset == char). */
export function* ndjsonRange(filePath: string, byteStart: number, byteEnd: number): Generator<string> {
  const fd = fs.openSync(filePath, 'r');
  try {
    const CHUNK = 1 << 22;
    const buf = Buffer.allocUnsafe(CHUNK);
    let filePos = byteStart;        // next byte to read from disk
    let lineStart = byteStart;      // file offset of the start of `pending`
    let pending = Buffer.alloc(0);
    let skipFirst = byteStart > 0;  // first partial line belongs to the previous range
    let bytes: number;
    while ((bytes = fs.readSync(fd, buf, 0, CHUNK, filePos)) > 0) {
      filePos += bytes;
      const chunk = pending.length ? Buffer.concat([pending, buf.subarray(0, bytes)]) : Buffer.from(buf.subarray(0, bytes));
      let off = 0;
      let nl: number;
      while ((nl = chunk.indexOf(10, off)) >= 0) {
        const lineLen = nl - off + 1;            // include newline
        const thisStart = lineStart;
        lineStart += lineLen;
        const line = chunk.subarray(off, nl);
        off = nl + 1;
        if (skipFirst) { skipFirst = false; continue; }
        if (thisStart >= byteEnd) return;        // past our range
        if (line.length) yield line.toString('utf8');
      }
      pending = chunk.subarray(off);             // tail; lineStart already points at it
    }
    if (!skipFirst && pending.length && lineStart < byteEnd) yield pending.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

/** Worker body: process an assigned byte range and return the per-shard scalars it computed. */
function runWorker(input: WorkerInput): WorkerRecord[] {
  const { dir, byteStart, byteEnd, cl, bfValid } = input;
  const fmeta = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8')) as FactorsMeta;
  const factorSeries = loadFactorSeries(dir);
  const cal = { start: 0, len: cl };
  const test = { start: cl, len: fmeta.T - cl };
  const kindsByCounter = new Map(fmeta.counters.map((c) => [c.name, Object.keys(c.load).filter((k) => c.load[k] !== 0)] as const));
  const out: WorkerRecord[] = [];
  for (const line of ndjsonRange(path.join(dir, 'counters.ndjson'), byteStart, byteEnd)) {
    const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
    const kinds = kindsByCounter.get(row.counter);
    if (!kinds) continue;
    const sc = shardScalars(row.v, kinds, fmeta.membership[row.shard] ?? {}, factorSeries, cl, cal, test, bfValid);
    out.push({ c: row.counter, s: row.shard, ui: sc.ui, sig: sc.sig, bf: sc.bf, glr: sc.glr });
  }
  return out;
}

/** Score every counter using a pool of `nWorkers` worker threads. */
export async function scoreBundleParallel(dir: string, q = 0.05, calLen: number | undefined, nWorkers: number): Promise<{ meta: ReportMeta; scores: CounterScore[] }> {
  const fmeta = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8')) as FactorsMeta;
  const faults: FaultLabel[] = JSON.parse(fs.readFileSync(path.join(dir, 'labels.json'), 'utf8')).faults;
  const shardIds = Object.keys(fmeta.membership).sort();
  const shardIndex = new Map(shardIds.map((s, i) => [s, i] as const));
  const T = fmeta.T;
  const cl = calLen ?? Math.floor(0.1 * T);
  assertLongBaseline(cl, fmeta.dt_s ?? 1, 'scoreBundleParallel');
  const bfValid = cl >= MIN_CALIBRATION_FOR_VALIDITY;
  const counters = fmeta.counters;
  const counterIndex = new Map(counters.map((c, i) => [c.name, i] as const));
  const acc = counters.map(() => emptyAcc(shardIds.length));

  const file = path.join(dir, 'counters.ndjson');
  const size = fs.statSync(file).size;
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < nWorkers; i++) ranges.push([Math.floor((i * size) / nWorkers), Math.floor(((i + 1) * size) / nWorkers)]);

  const results = await Promise.all(ranges.map(([byteStart, byteEnd]) => new Promise<WorkerRecord[]>((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { __cs_worker: true, dir, byteStart, byteEnd, cl, bfValid } as WorkerInput });
    w.once('message', (m: WorkerRecord[]) => resolve(m));
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  })));

  for (const recs of results) for (const rec of recs) {
    const ci = counterIndex.get(rec.c); const si = shardIndex.get(rec.s);
    if (ci === undefined || si === undefined) continue;
    acc[ci].ui[si] = rec.ui; acc[ci].sig[si] = rec.sig; acc[ci].bf[si] = rec.bf; acc[ci].glr[si] = rec.glr;
  }
  return scoreFromAcc(dir, T, shardIds, counters, faults, cl, q, acc, bfValid);
}

/** Default worker count: cores−1, capped, overridable via CS_WORKERS. */
function defaultWorkers(): number {
  if (process.env.CS_WORKERS) return Math.max(1, Number(process.env.CS_WORKERS) | 0);
  const cores = (os.availableParallelism?.() ?? os.cpus().length);
  return Math.max(1, cores - 1);
}

if (!isMainThread && (workerData as Partial<WorkerInput> | undefined)?.__cs_worker) {
  // Running inside a worker thread: compute the assigned range and post results back.
  try {
    parentPort!.postMessage(runWorker(workerData as WorkerInput));
  } catch (err) {
    parentPort!.postMessage([]); // surface as an empty slice; main reports missing shards as 0
    throw err;
  }
} else if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const dir = process.argv[2];
  if (!dir) { process.stderr.write('usage: node tools/clustersynth-scenario.js <bundle-dir> [q] [calLen]\n  env: CS_WORKERS=N (parallel, default cores-1; 1=single-core), CS_INMEMORY=1 (legacy)\n'); process.exit(2); }
  const q = process.argv[3] ? Number(process.argv[3]) : 0.05;
  const calLen = process.argv[4] ? Number(process.argv[4]) : undefined;
  process.stderr.write(
    '\nNOTE: this is the DIAGNOSTIC scorer (terminal mean-shift only — no e-detector, no Wall-A gate).\n' +
    'For findings use the production pipeline: tools/baseline-monitor.ts (+ clustersynth-e2e for localization).\n\n');
  (async () => {
    if (process.env.CS_INMEMORY === '1') { process.stdout.write(renderScenario(dir, q) + '\n'); return; }
    const nWorkers = defaultWorkers();
    if (nWorkers > 1) {
      const { meta, scores } = await scoreBundleParallel(dir, q, calLen, nWorkers);
      process.stdout.write(renderReport(meta, scores, q) + `\n(${nWorkers} worker threads)\n`);
    } else {
      process.stdout.write(renderScenarioStreaming(dir, q, calLen) + '\n');
    }
  })().then(() => process.exit(0)).catch((e) => { process.stderr.write(String(e?.stack ?? e) + '\n'); process.exit(1); });
}
