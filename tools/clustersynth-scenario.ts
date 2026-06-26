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
import * as path from 'node:path';
import { instrumentedCommonModeResiduals } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/instrumented-common-mode';
import { universalInferenceMeanShiftEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/universal-inference-e-value';
import { nuisanceRobustBFEValue, MIN_CALIBRATION_FOR_VALIDITY } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/nuisance-robust-bf-e-value';
import { distributionalSignature } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/distributional-signature';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { eBHConditionalCalibration } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh-conditional-calibration';
import { gaussianLrEValue, gaussianLrNullSurvival } from './gaussian-lr-evalue.js';

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
  shardIds: string[];
  counters: CounterSpec[];
  factors: Record<string, FactorEntry>;
  membership: Record<string, Record<string, string>>; // shard → kind → factor instance id
  faults: FaultLabel[];
  /** (shard, counter) → counter series. */
  series: Map<string, number[]>;
}

/** Load a scenario bundle directory (factors.json + labels.json + counters.ndjson). */
export function loadScenarioBundle(dir: string): ScenarioBundle {
  const factorsDoc = JSON.parse(fs.readFileSync(path.join(dir, 'factors.json'), 'utf8'));
  const faults: FaultLabel[] = JSON.parse(fs.readFileSync(path.join(dir, 'labels.json'), 'utf8')).faults;
  const series = new Map<string, number[]>();
  const shardSet = new Set<string>();
  const ndjson = fs.readFileSync(path.join(dir, 'counters.ndjson'), 'utf8').trim().split('\n');
  for (const line of ndjson) {
    const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
    series.set(`${row.shard}\0${row.counter}`, row.v);
    shardSet.add(row.shard);
  }
  return {
    T: factorsDoc.T,
    shardIds: [...shardSet].sort(),
    counters: factorsDoc.counters,
    factors: factorsDoc.factors,
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

/** Render an honest per-counter + per-fault-type report. */
export function renderScenario(dir: string, q = 0.05): string {
  const { bundle, scores } = scoreBundle(dir, q);
  const lines: string[] = [];
  lines.push(`clustersynth SCENARIO bundle — adversarial, labeled telemetry. dir=${dir}`);
  lines.push(`${bundle.shardIds.length} shards, T=${bundle.T}, ${bundle.counters.length} counters, ${bundle.faults.length} faults. FDR q=${q}.`);
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

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const dir = process.argv[2];
  if (!dir) { process.stderr.write('usage: node tools/clustersynth-scenario.js <bundle-dir> [q]\n'); process.exit(2); }
  const q = process.argv[3] ? Number(process.argv[3]) : 0.05;
  process.stdout.write(renderScenario(dir, q) + '\n');
  process.exit(0);
}
