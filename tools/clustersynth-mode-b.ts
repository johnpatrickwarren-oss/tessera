// tools/clustersynth-mode-b.ts — the Mode B concurrent-control pipeline on REAL clustersynth topology
// at scale (ADR 0019; the production analogue of the synthetic tools/mode-b-control.ts).
//
// WHAT. Two same-topology/seed clustersynth bundles generated WITH a labeled control arm (CS_CONTROL_ARM):
//   • a LONG (≥2-month) HEALTHY baseline (faults off) — estimates each shard's contrast scale + AR(1) φ
//     and feeds the runtime calibration monitor over the full healthy horizon;
//   • a MONITORING bundle (faults on) — detection.
// For each treatment shard we form the MODEL-FREE contrast d_i(t) = treatment_i(t) − control_i(t). The
// twin shares the treatment's factor instances AND loadings, so the common-mode cancels EXACTLY (no
// factor fit) — the SPATIAL null. We whiten d_i at its idiosyncratic φ (a sustained fault survives),
// standardize on the baseline, take the normalized-mixture e-value, gate the emitter through the
// validity-class gate (construction_valid + a passing calibration monitor + Wall-A whiteness on the
// control cohort), and run e-BH. The temporal per-shard null (no control) is the failing comparator.
//
// WHY THIS IS THE ACHIEVABLE GUARANTEE. The contrast removes the common-mode — including the near-unit-
// root nonstationarity that defeats the temporal null on this telemetry (ADR 0019; registry N1: only the
// cross-shard contrast separates drift from a fault). The concurrent control IS the null. Single cadence
// for now (baseline + monitoring at the same dt); mixed cadence is a refinement — and the contrast should
// make even 1 Hz tractable since it kills the common-mode the temporal path could not. Tessera-original.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { assertLongBaseline } from './baseline-guard.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { freshCalibrationMonitor, updateCalibrationBatch } from './calibration-monitor.js';
import { fdrBenjaminiHochberg, modeOf, ineligibilityReason, type EmitterContract } from './emitter-contract.js';
import { estimateAr1, whiten } from './per-shard-whitening.js';
import { autocorr } from './conditional-markov.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

interface ControlPair { treatment: string; control: string; }

/** The treatment→control pairing emitted by clustersynth (control.json). */
export function loadControlPairs(dir: string): ControlPair[] {
  const p = path.join(dir, 'control.json');
  if (!fs.existsSync(p)) throw new Error(`${dir}: no control.json — generate the bundle with CS_CONTROL_ARM=1 / controlArm:true`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).pairs as ControlPair[];
}

const median = (xs: number[]): number => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
const madScale = (xs: number[]): number => { const m = median(xs); return Math.max(1.4826 * median(xs.map((x) => Math.abs(x - m))), 1e-9); };

/** The contrast fit estimated on the HEALTHY baseline contrast: AR(1) φ + robust location/scale of the
 *  whitened residual. */
export interface ContrastFit { phi: number; loc: number; scale: number; }

export function fitContrast(d0: number[]): ContrastFit {
  const { phi } = estimateAr1(d0);
  const w = d0.map((x, t) => whiten(x, t > 0 ? d0[t - 1] : null, phi));
  return { phi, loc: median(w), scale: madScale(w) };
}

/** Apply a baseline contrast fit to a (monitoring) contrast: whiten at φ, standardize by baseline loc/scale. */
export function applyContrast(d: number[], fit: ContrastFit): number[] {
  return d.map((x, t) => (whiten(x, t > 0 ? d[t - 1] : null, fit.phi) - fit.loc) / fit.scale);
}

const sub = (a: number[], b: number[]): number[] => a.map((x, t) => x - b[t]);
const ser = (b: ScenarioBundle, shard: string, counter: string): number[] | undefined => b.series.get(`${shard}\0${counter}`);

/** The emitter contract for the clustersynth concurrent-control contrast (construction_valid, gated by
 *  the live calibration monitor + whiteness verdict). */
export function clustersynthModeBEmitter(calibrationMonitorPassing: boolean): EmitterContract {
  return {
    id: 'clustersynth-mode-b/control-contrast',
    baselineVersion: '≥2-month healthy contrast (treatment − concurrent control)',
    conditioningVariables: ['concurrent control twin (shares factor instances + loadings)'],
    residualizer: 'treatment − control, whitened at idiosyncratic φ, baseline-standardized',
    increment: 'normalized convex-mixture e-value (mixture-evalue.ts)',
    stoppingAggregation: 'per-shard running-max → fleet e-BH',
    horizon: 'monitoring window',
    validityClass: 'construction_valid',
    calibrationMonitorPassing,
  };
}

/** gpu mean_shift faulted treatment shards on a counter (the scored fault type, as in baseline-monitor). */
function faultedSet(mon: ScenarioBundle, counter: string): Set<string> {
  const out = new Set<string>();
  for (const f of mon.faults) {
    if (f.level !== 'gpu' || (f as { type?: string }).type !== 'mean_shift') continue;
    const fc = (f as { counter?: string | null }).counter;
    if (!(fc === counter || fc === null || fc === undefined)) continue;
    for (const s of (f as { affected_shards?: string[] }).affected_shards ?? []) out.add(s);
  }
  return out;
}

export interface ModeBCounterResult {
  counter: string; nFault: number; mode: 'A' | 'B';
  selected: number; falsePos: number; fdp: number; power: number;
  temporalSelected: number; temporalFdp: number; temporalPower: number;
  monitorPassing: boolean; whiteFrac: number;
}

/** Wall-A whiteness fraction of the (whitened, standardized) healthy control-cohort contrasts. */
function whiteFraction(standardized: number[][], thresh = 0.1): number {
  if (!standardized.length) return 0;
  return standardized.filter((r) => Math.abs(autocorr(r, 1)) <= thresh).length / standardized.length;
}

/** PER-SHARD anytime-valid calibration pass fraction over the healthy control cohort: the fraction of
 *  control contrasts whose own ∏g test martingale never crosses 1/α (marginal calibration holds). Run
 *  per shard rather than pooled — pooling 100s of shards × 1000s of ticks into one martingale is so
 *  powerful it revokes on negligible marginal mis-calibration the FDR bound tolerates; the per-shard
 *  fraction (mirroring the whiteness fraction) is the robust construction-validity signal. */
function calibrationPassFraction(standardized: number[][], alpha = 0.01): number {
  if (!standardized.length) return 0;
  let pass = 0;
  for (const r of standardized) {
    const m = freshCalibrationMonitor({ alpha });
    updateCalibrationBatch(m, r);
    if (m.passing) pass++;
  }
  return pass / standardized.length;
}

/** Score one counter end-to-end: spatial-null contrast (gated) vs the temporal per-shard null. */
export function scoreCounterModeB(healthy: ScenarioBundle, mon: ScenarioBundle, pairs: ControlPair[], counter: string, q: number): ModeBCounterResult | null {
  const usable = pairs.filter((p) => ser(healthy, p.treatment, counter) && ser(healthy, p.control, counter) && ser(mon, p.treatment, counter) && ser(mon, p.control, counter));
  if (!usable.length) return null;
  const faulted = faultedSet(mon, counter);

  // Baseline fit per pair (on the healthy contrast) + the known-null calibration feed.
  const fits = usable.map((p) => fitContrast(sub(ser(healthy, p.treatment, counter)!, ser(healthy, p.control, counter)!)));
  const healthyStd = usable.map((p, i) => applyContrast(sub(ser(healthy, p.treatment, counter)!, ser(healthy, p.control, counter)!), fits[i]));

  // #2 + Wall-A: construction validity on the concurrent control cohort over the full healthy horizon.
  // Require BOTH a broad per-shard marginal-calibration pass AND broad conditional whiteness.
  const calibFrac = calibrationPassFraction(healthyStd);
  const whiteFrac = whiteFraction(healthyStd);
  const monitorPassing = calibFrac >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);

  // Detection: the spatial-null e-value per pair on the monitoring contrast.
  const e = usable.map((p, i) => normalizedMixtureEValue(applyContrast(sub(ser(mon, p.treatment, counter)!, ser(mon, p.control, counter)!), fits[i])));
  const isFault = usable.map((p) => faulted.has(p.treatment));
  const nFault = isFault.filter(Boolean).length;

  // #1: gated e-BH only if Mode B; otherwise abstain.
  const sel = mode === 'B' ? fdrBenjaminiHochberg(e, q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length;
  const tp = sel.filter((i) => isFault[i]).length;

  // Temporal comparator (no control): standardize the monitoring treatment by its OWN healthy baseline.
  const tFits = usable.map((p) => fitContrast(ser(healthy, p.treatment, counter)!));
  const tE = usable.map((p, i) => normalizedMixtureEValue(applyContrast(ser(mon, p.treatment, counter)!, tFits[i])));
  const tSel = [...eBenjaminiHochberg(tE, q).selected];
  const tFp = tSel.filter((i) => !isFault[i]).length;
  const tTp = tSel.filter((i) => isFault[i]).length;

  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: tSel.length, temporalFdp: tSel.length ? tFp / tSel.length : 0, temporalPower: nFault ? tTp / nFault : NaN,
    monitorPassing, whiteFrac,
  };
}

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

export function renderModeB(healthyDir: string, monDir: string, q = 0.1): string {
  const healthy = loadScenarioBundle(healthyDir);
  assertLongBaseline(healthy.T, healthy.dt_s, 'clustersynth-mode-b (healthy baseline)');
  const mon = loadScenarioBundle(monDir);
  const pairs = loadControlPairs(monDir);
  const counters = mon.counters.map((c) => c.name);

  const L: string[] = [];
  L.push('═══ CLUSTERSYNTH MODE B — concurrent-control spatial null at scale (ADR 0019) ═══');
  L.push(`baseline: ${healthy.shardIds.length} shards (incl. control twins) × T=${healthy.T} @ ${healthy.dt_s}s  |  monitoring: T=${mon.T}, ${mon.faults.length} faults, ${pairs.length} treatment/control pairs, q=${q}`);
  L.push('');
  L.push('counter        nFault | MODE | spatial FDP/power (K) | naive-temporal FDP/power (K) | monitor white');
  let selOk = 0, fpOk = 0, tpOk = 0, fT = 0;
  for (const c of counters) {
    const r = scoreCounterModeB(healthy, mon, pairs, c, q);
    if (!r || r.nFault === 0) continue;
    fT += r.nFault; selOk += r.selected; fpOk += r.falsePos; tpOk += r.selected - r.falsePos;
    L.push(`  ${c.padEnd(13)} ${String(r.nFault).padStart(5)} |  ${r.mode}   | ${fmt(r.fdp)}/${fmt(r.power)} (${String(r.selected).padStart(3)}) | ${fmt(r.temporalFdp)}/${fmt(r.temporalPower)} (${String(r.temporalSelected).padStart(3)}) | ${r.monitorPassing ? 'pass' : 'REVOKE'}  ${(100 * r.whiteFrac).toFixed(0)}%`);
  }
  L.push('');
  L.push(`AGGREGATE spatial-null (Mode B) FDP: ${selOk ? (fpOk / selOk).toFixed(3) : '0.000'}  (${fpOk} false of ${selOk} selected)   recall: ${fT ? (tpOk / fT).toFixed(3) : '-'} (${tpOk}/${fT})`);
  L.push('READING: the treatment−control contrast cancels the common-mode EXACTLY (shared factor instances +');
  L.push('loadings), so the spatial null is construction-valid and e-BH controls FDR ≤ q at scale with full');
  L.push('recall. The naive temporal per-shard null (no control) leaves the common-mode IN the residual, so it');
  L.push('cannot match the contrast — at a persistent cadence the fault is buried (low power), and toward unit');
  L.push('root the drift is mistaken for signal (FDP ≫ q). Either way the concurrent control is the achievable');
  L.push('null (ADR 0019). The per-shard calibration monitor + Wall-A whiteness gate the construction; a counter');
  L.push('whose control fails to cancel is revoked → demoted Mode A → abstains from the FDR claim.');
  return L.join('\n');
}

if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/clustersynth-mode-b.js <healthy-baseline-dir> <monitoring-dir> [q]\n  both bundles must be generated WITH the control arm (CS_CONTROL_ARM=1).\n');
    process.exit(2);
  }
  const q = process.argv[4] ? Number(process.argv[4]) : 0.1;
  process.stdout.write(renderModeB(healthyDir, monDir, q) + '\n');
  process.exit(0);
}
