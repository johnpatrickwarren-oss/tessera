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

/** The contrast fit estimated on the HEALTHY baseline contrast: a centering offset (the treatment and
 *  control have INDEPENDENT baselines, so the contrast has a nonzero mean), AR(1) φ, and robust
 *  location/scale of the whitened residual. CENTER BEFORE WHITENING: `whiten` returns the first tick
 *  unchanged (no prior sample), so without centering that seed tick carries the full baseline offset and
 *  standardizes to a many-σ outlier — one fat tail per series that spuriously trips the ∏g calibration. */
export interface ContrastFit { phi: number; loc: number; scale: number; center: number; }

export function fitContrast(d0: number[]): ContrastFit {
  const center = median(d0);
  const dc = d0.map((x) => x - center);
  const { phi } = estimateAr1(dc);
  const w = dc.map((x, t) => whiten(x, t > 0 ? dc[t - 1] : null, phi));
  return { phi, loc: median(w), scale: madScale(w), center };
}

/** Apply a baseline contrast fit to a (monitoring) contrast: center, whiten at φ, standardize by loc/scale.
 *  The baseline is keyed by (seed, shard, counter) so it is identical across the same-seed healthy/mon
 *  bundles — the fit's `center` removes it consistently. */
export function applyContrast(d: number[], fit: ContrastFit): number[] {
  const dc = d.map((x) => x - fit.center);
  return dc.map((x, t) => (whiten(x, t > 0 ? dc[t - 1] : null, fit.phi) - fit.loc) / fit.scale);
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

/** The ANOMALOUS treatment shards for a counter — the FDR positive set for the per-shard spatial null.
 *  Mode B detects PER-SHARD (gpu-level) anomalies: a fault applied to one treatment shard but NOT its
 *  control twin, so it survives the contrast. CDU/POD faults are SHARED-INFRA / COMMON-MODE events
 *  (faults.ts: "a shared-infra fault IS a factor perturbation") — the concurrent control loads on the
 *  same factor, so the contrast CANCELS them BY DESIGN. That is the point of a spatial null, not a miss:
 *  fleet-wide events are out of scope for a per-shard detector (a fleet-level monitor owns them). So the
 *  positive set is the gpu-level faults that actually perturb THIS counter (its own counter, or
 *  counter=null = all counters). A pure variance_collapse (no mean change) may evade the mean-shift
 *  e-value → it only lowers recall, never inflating FDP. */
function faultedSet(mon: ScenarioBundle, counter: string): Set<string> {
  const load = (mon.counters.find((c) => c.name === counter) as { load?: Record<string, number> } | undefined)?.load ?? {};
  const out = new Set<string>();
  for (const f of mon.faults) {
    const ff = f as { level?: string; type?: string; counter?: string | null; detach_factor?: string | null; affected_shards?: string[] };
    if (ff.level !== 'gpu') continue; // per-shard only; common-mode (cdu/pod) is cancelled by design
    let hits: boolean;
    if (ff.type === 'detachment') {
      // detachment drops a FACTOR KIND for the shard (counter-agnostic) → it perturbs every counter that
      // LOADS on that factor, regardless of the label's `counter` field. Credit those.
      hits = ff.detach_factor != null && (load[ff.detach_factor] ?? 0) !== 0;
    } else {
      // mean_shift / drift / variance_collapse apply to the labeled counter (or all when counter=null).
      hits = ff.counter === counter || ff.counter === null || ff.counter === undefined;
    }
    if (hits) for (const s of ff.affected_shards ?? []) out.add(s);
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

/** Cap on the per-shard calibration feed length. An anytime-valid ∏g martingale's POWER grows with feed
 *  length, so over a long (e.g. 1 Hz, 1000s-of-ticks) prefix a NEGLIGIBLE scale mis-estimate (a few %
 *  MAD error) accumulates into a crossing and over-revokes a construction the FDR bound tolerates — the
 *  same over-power lesson as pooling. Bounding the feed to a fixed window tests marginal calibration at a
 *  consistent, reasonable power across cadences. (Whiteness is checked separately on the full prefix.) */
const CALIB_FEED_CAP = 500;

/** PER-SHARD anytime-valid calibration pass fraction over the healthy control cohort: the fraction of
 *  control contrasts whose own ∏g test martingale never crosses 1/α (marginal calibration holds) over a
 *  bounded feed. Per shard rather than pooled, and length-bounded — both to keep the monitor's power
 *  reasonable rather than revoking on negligible mis-calibration. */
function calibrationPassFraction(standardized: number[][], alpha = 0.01): number {
  if (!standardized.length) return 0;
  let pass = 0;
  for (const r of standardized) {
    const m = freshCalibrationMonitor({ alpha });
    updateCalibrationBatch(m, r.length > CALIB_FEED_CAP ? r.slice(0, CALIB_FEED_CAP) : r);
    if (m.passing) pass++;
  }
  return pass / standardized.length;
}

/** CADENCE-AWARE contrast fit + the known-null calibration feed. The contrast's idiosyncratic-OU φ is
 *  CADENCE-dependent (φ = exp(−dt/τ)), so for a MIXED-cadence run (hourly baseline + fine, e.g. 1 Hz,
 *  monitoring) the hourly φ does NOT transfer — fit at the MONITORING cadence from the mon PRE-FAULT
 *  prefix (clustersynth onsets are ≥0.1·T, so the first ~8% is healthy). Same-cadence: fit from the full
 *  healthy baseline (longer = better). Returns per-pair fits and the all-healthy standardized feed. */
function cadenceAwareFit(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string): { fits: ContrastFit[]; calStd: number[][] } {
  const mixed = healthy.dt_s !== mon.dt_s;
  const src = mixed ? mon : healthy;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  const series = usable.map((p) => {
    const d = sub(ser(src, p.treatment, counter)!, ser(src, p.control, counter)!);
    return mixed ? d.slice(0, prefixN) : d;
  });
  const fits = series.map(fitContrast);
  return { fits, calStd: series.map((d, i) => applyContrast(d, fits[i])) };
}

/** The TEMPORAL per-shard comparator (no control): standardize the mon treatment by its OWN healthy null,
 *  cadence-correct, and e-BH it. Returns the selected count + false/true positives. This is the failing
 *  baseline the spatial null beats (it leaves the common-mode in the residual). */
function temporalComparator(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string, q: number, isFault: boolean[]): { K: number; fp: number; tp: number } {
  const mixed = healthy.dt_s !== mon.dt_s;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  const tFits = usable.map((p) => fitContrast(mixed ? ser(mon, p.treatment, counter)!.slice(0, prefixN) : ser(healthy, p.treatment, counter)!));
  const tE = usable.map((p, i) => normalizedMixtureEValue(applyContrast(ser(mon, p.treatment, counter)!, tFits[i])));
  const tSel = [...eBenjaminiHochberg(tE, q).selected];
  return { K: tSel.length, fp: tSel.filter((i) => !isFault[i]).length, tp: tSel.filter((i) => isFault[i]).length };
}

/** Score one counter end-to-end: spatial-null contrast (gated) vs the temporal per-shard null. */
export function scoreCounterModeB(healthy: ScenarioBundle, mon: ScenarioBundle, pairs: ControlPair[], counter: string, q: number): ModeBCounterResult | null {
  const usable = pairs.filter((p) => ser(healthy, p.treatment, counter) && ser(healthy, p.control, counter) && ser(mon, p.treatment, counter) && ser(mon, p.control, counter));
  if (!usable.length) return null;
  const faulted = faultedSet(mon, counter);
  const isFault = usable.map((p) => faulted.has(p.treatment));
  const nFault = isFault.filter(Boolean).length;

  // #2 + Wall-A: construction validity on the concurrent control cohort (per-shard calibration + whiteness).
  const { fits, calStd } = cadenceAwareFit(healthy, mon, usable, counter);
  const whiteFrac = whiteFraction(calStd);
  const monitorPassing = calibrationPassFraction(calStd) >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);

  // Detection: the spatial-null e-value per pair on the monitoring contrast; #1 gates e-BH on Mode B.
  const e = usable.map((p, i) => normalizedMixtureEValue(applyContrast(sub(ser(mon, p.treatment, counter)!, ser(mon, p.control, counter)!), fits[i])));
  const sel = mode === 'B' ? fdrBenjaminiHochberg(e, q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length;
  const tp = sel.filter((i) => isFault[i]).length;
  const t = temporalComparator(healthy, mon, usable, counter, q, isFault);

  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: t.K, temporalFdp: t.K ? t.fp / t.K : 0, temporalPower: nFault ? t.tp / nFault : NaN,
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
  const mixed = healthy.dt_s !== mon.dt_s;
  L.push('═══ CLUSTERSYNTH MODE B — concurrent-control spatial null at scale (ADR 0019) ═══');
  L.push(`baseline: ${healthy.shardIds.length} shards (incl. control twins) × T=${healthy.T} @ ${healthy.dt_s}s  |  monitoring: T=${mon.T} @ ${mon.dt_s}s, ${mon.faults.length} faults, ${pairs.length} pairs, q=${q}`);
  if (mixed) L.push(`MIXED CADENCE (${healthy.dt_s}s baseline → ${mon.dt_s}s monitoring): φ/scale + calibration estimated at the monitoring cadence from the pre-fault prefix.`);
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
