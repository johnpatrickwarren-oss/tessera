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
import * as os from 'node:os';
import * as path from 'node:path';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { assertLongBaseline } from './baseline-guard.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';

// Mode B increment (2026-07-02 audit F7/F9 — MEASURED trade-off). The distribution-robust linear
// bounded-bet increment ('bounded', mixture-evalue.ts) is EXACTLY valid under any residual law with a
// conditionally mean-zero clipped residual — but it is VARIANCE-BLIND (E[1+λc] = 1 under any symmetric
// law), and a scale re-run showed that blindness halves recall on this DGP's detachment/variance-signal
// faults (clean R=8 recall 0.987 → 0.539). The Gaussian-LR increment's scale-error fragility and its
// power on variance faults are the SAME sensitivity — one increment cannot drop one and keep the other.
// DECISION: Mode B stays on the GAUSSIAN increment (scale-validated power), and the fragility is managed
// where it arises: (a) the F8 sibling-null fit estimates σ̂ from the FULL mon-cadence window (12×+ the old
// prefix → scale error ~√12 smaller than the regime that produced the ×15 null-mean inflation), and
// (b) the ∏g calibration monitor audits exactly this premise on the full-horizon sibling feed. Deployments
// monitoring mean-shift-only faults under distribution doubt can pass 'bounded' explicitly.
const MODE_B_INCREMENT: import('./mixture-evalue.js').IncrementKind = 'gaussian';
const normalizedMixtureEValue_H = (r: number[]): number => normalizedMixtureEValue(r, MODE_B_INCREMENT);
import { freshCalibrationMonitor, updateCalibrationBatch } from './calibration-monitor.js';
import { fdrBenjaminiHochberg, modeOf, ineligibilityReason, type EmitterContract } from './emitter-contract.js';
import { fitContrast, fitContrastFast, applyContrast, composeFit, type ContrastFit } from './contrast.js';
import { autocorr } from './conditional-markov.js';
// re-export so existing importers (mode-b-loop, telemetry-source) keep their import site.
export { fitContrast, applyContrast, type ContrastFit } from './contrast.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

interface ControlPair { treatment: string; control: string; control2?: string; } // control2 = ADR 0022 triad twin

/** The treatment→control pairing emitted by clustersynth (control.json). */
export function loadControlPairs(dir: string): ControlPair[] {
  const p = path.join(dir, 'control.json');
  if (!fs.existsSync(p)) throw new Error(`${dir}: no control.json — generate the bundle with CS_CONTROL_ARM=1 / controlArm:true`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).pairs as ControlPair[];
}

/** Shards whose TREATMENT must be scored as HEALTHY because clustersynth's 'control' contamination
 *  mode MOVED their fault into the control twin (control.json `.contamination`; the generator's
 *  contract says "the scorer must drop these from the positive set"). Without this the aggregate
 *  under-counts recall (labels still list the shard as faulted, but the treatment carries no fault)
 *  and — worse — a contaminated shard that fired would be scored a TRUE positive, understating FDP
 *  (2026-07-02 fix; the triad test always applied this correction, the harness aggregate did not).
 *  'both' mode duplicates the fault (treatment genuinely faulted) → NOT dropped. */
export function loadContaminatedHealthyTreatments(dir: string): Set<string> {
  const p = path.join(dir, 'control.json');
  if (!fs.existsSync(p)) return new Set();
  const doc = JSON.parse(fs.readFileSync(p, 'utf8')) as { contamination?: { mode?: string | null; shards?: string[] } };
  return doc.contamination?.mode === 'control' ? new Set(doc.contamination.shards ?? []) : new Set();
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
    increment: 'normalized convex-mixture e-value, Gaussian-LR increments (mixture-evalue.ts; σ̂ premise monitored)',
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
interface CounterLoad { name: string; load?: Record<string, number> }
function faultedSet(mon: ScenarioBundle, counter: string, drop?: ReadonlySet<string>): Set<string> {
  return faultedSetFrom(mon.faults, mon.counters as unknown as CounterLoad[], counter, drop);
}
/** As faultedSet, from raw labels + counter specs (so the streaming path can reuse it without a bundle).
 *  `drop` = control-contaminated shards whose treatment is healthy (loadContaminatedHealthyTreatments)
 *  — excluded from the positive set per the clustersynth 'control'-mode scoring contract. */
function faultedSetFrom(faults: ReadonlyArray<unknown>, counterSpecs: CounterLoad[], counter: string, drop?: ReadonlySet<string>): Set<string> {
  const load = counterSpecs.find((c) => c.name === counter)?.load ?? {};
  const out = new Set<string>();
  for (const f of faults) {
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
  if (drop) for (const s of drop) out.delete(s);
  return out;
}

export interface ModeBCounterResult {
  counter: string; nFault: number; mode: 'A' | 'B';
  selected: number; falsePos: number; fdp: number; power: number;
  temporalSelected: number; temporalFdp: number; temporalPower: number;
  monitorPassing: boolean; whiteFrac: number;
  /** controls flagged contaminated this counter via the c1−c2 sibling null (ADR 0022 triad; 0 if no triad). */
  flaggedControls: number;
}

/** Wall-A whiteness threshold: an EFFECT-SIZE gate (|ρ₁| ≤ 0.1 — the level at which serial dependence
 *  starts to threaten the e-BH budget over Mode B horizons) with a NOISE FLOOR of 2 Bartlett SEs
 *  (2/√n), so short series are not flagged on estimation noise (2026-07-02 audit F7 calibration fix:
 *  the fixed 0.1 was ≈2.2 SEs at n=500 but ≈250 SEs at 5M ticks — the floor documents which regime
 *  the gate is operating in; at large n it is deliberately an effect-size test, not a significance test). */
function whitenessThresh(n: number): number {
  return Math.max(0.1, 2 / Math.sqrt(Math.max(1, n)));
}

/** Wall-A whiteness fraction of the (whitened, standardized) healthy control-cohort contrasts. */
function whiteFraction(standardized: number[][]): number {
  if (!standardized.length) return 0;
  return standardized.filter((r) => Math.abs(autocorr(r, 1)) <= whitenessThresh(r.length)).length / standardized.length;
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
/** One control contrast's anytime-valid ∏g calibration verdict over a bounded feed. The CAP exists
 *  for feeds standardized by an EXTERNAL fit (a prefix fit applied to a long horizon): there a
 *  negligible σ̂ error accumulates into a spurious crossing. See fullCalibrationPass for the
 *  in-sample case where the cap must NOT apply. */
function prefixCalibrationPass(standardized: number[], alpha = 0.01): boolean {
  const m = freshCalibrationMonitor({ alpha });
  updateCalibrationBatch(m, standardized.length > CALIB_FEED_CAP ? standardized.slice(0, CALIB_FEED_CAP) : standardized);
  return m.passing;
}

/** FULL-horizon ∏g calibration verdict — for feeds standardized IN-SAMPLE (the F8 sibling-null path:
 *  the c1−c2 sibling is fit on itself, so scale error cannot trip the monitor) run the anytime-valid
 *  martingale over the ENTIRE detection-length horizon. This is ADR 0020's named "deeper fix" (feed a
 *  calibration reference at the detection length): mild-but-accumulating serial dependence — which a
 *  capped/prefix feed is provably too short to catch, and which better sibling φ̂ fits let slip past
 *  the lag-1 whiteness gate — accumulates here and revokes. Without this, the full-window sibling fit
 *  ACCIDENTALLY WEAKENED the gate (measured: gpu_temp_c at 1 Hz went Mode B → FDP 0.779). */
function fullCalibrationPass(standardized: number[], alpha = 0.01): boolean {
  const m = freshCalibrationMonitor({ alpha });
  updateCalibrationBatch(m, standardized);
  return m.passing;
}

function calibrationPassFraction(standardized: number[][], alpha = 0.01, fullHorizon = false): number {
  if (!standardized.length) return 0;
  const pass = fullHorizon ? fullCalibrationPass : prefixCalibrationPass;
  return standardized.filter((r) => pass(r, alpha)).length / standardized.length;
}

/** CADENCE-AWARE contrast fit + the known-null calibration feed. The contrast's idiosyncratic-OU φ is
 *  CADENCE-dependent (φ = exp(−dt/τ)), so for a MIXED-cadence run (hourly baseline + fine, e.g. 1 Hz,
 *  monitoring) the hourly φ does NOT transfer — fit at the MONITORING cadence from the mon PRE-FAULT
 *  prefix (clustersynth onsets are ≥0.1·T, so the first ~8% is healthy). Same-cadence: fit from the full
 *  healthy baseline (longer = better). Returns per-pair fits and the all-healthy standardized feed. */
function cadenceAwareFit(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string): { fits: ContrastFit[]; calStd: number[][]; fullHorizonFeed: boolean } {
  const mixed = healthy.dt_s !== mon.dt_s;
  if (!mixed) {
    const series = usable.map((p) => sub(ser(healthy, p.treatment, counter)!, ser(healthy, p.control, counter)!));
    const fits = series.map(fitContrast);
    return { fits, calStd: series.map((d, i) => applyContrast(d, fits[i])), fullHorizonFeed: false };
  }
  // MIXED cadence + triad (2026-07-02 audit F8 fix): NO pre-fault-prefix fit. The CENTER comes from
  // the ≥2-month baseline contrast (a mean offset is cadence-independent — the guard finally guards
  // the feed actually used), and the cadence-dependent DYNAMICS (φ/loc/scale) come from the
  // FULL-window monitoring-cadence c1−c2 sibling contrast — a known null under gpu-level treatment
  // faults, 12×+ more data than the old 8% prefix and NO "onsets ≥ 0.1·T" assumption. The
  // calibration/whiteness feed becomes the FULL-horizon standardized sibling null (also closing the
  // prefix-only-feed exposure: a construction break anywhere in the horizon is now visible). A
  // contaminated c1 corrupts its own shard's sibling fit toward a LARGER scale → deflated e-values →
  // conservative for FDR (and the flag path still reports it). Pair-only bundles keep the prefix fit
  // (assumption unavoidable without a second twin; disclosed in the report).
  const hasTriad = usable.every((p) => p.control2 && ser(healthy, p.control2, counter) && ser(mon, p.control2, counter));
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  if (!hasTriad) {
    const series = usable.map((p) => sub(ser(mon, p.treatment, counter)!, ser(mon, p.control, counter)!).slice(0, prefixN));
    const fits = series.map(fitContrast);
    return { fits, calStd: series.map((d, i) => applyContrast(d, fits[i])), fullHorizonFeed: false };
  }
  const fits: ContrastFit[] = [];
  const calStd: number[][] = [];
  for (const p of usable) {
    const centerFit = fitContrast(sub(ser(healthy, p.treatment, counter)!, ser(healthy, p.control, counter)!));
    const sib = sub(ser(mon, p.control, counter)!, ser(mon, p.control2!, counter)!);
    const dynFit = fitContrast(sib); // full-window mon-cadence known-null dynamics
    fits.push(composeFit(centerFit, dynFit));
    calStd.push(applyContrast(sib, dynFit)); // full-horizon known-null calibration/whiteness feed
  }
  return { fits, calStd, fullHorizonFeed: true };
}

/** The TEMPORAL per-shard comparator (no control): standardize the mon treatment by its OWN healthy null,
 *  cadence-correct, and e-BH it. Returns the selected count + false/true positives. This is the failing
 *  baseline the spatial null beats (it leaves the common-mode in the residual). */
function temporalComparator(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string, q: number, isFault: boolean[]): { K: number; fp: number; tp: number } {
  const mixed = healthy.dt_s !== mon.dt_s;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  const tFits = usable.map((p) => fitContrast(mixed ? ser(mon, p.treatment, counter)!.slice(0, prefixN) : ser(healthy, p.treatment, counter)!));
  const tE = usable.map((p, i) => normalizedMixtureEValue_H(applyContrast(ser(mon, p.treatment, counter)!, tFits[i])));
  const tSel = [...eBenjaminiHochberg(tE, q).selected];
  return { K: tSel.length, fp: tSel.filter((i) => !isFault[i]).length, tp: tSel.filter((i) => isFault[i]).length };
}

/** Cadence-aware e-value of the contrast pickA − pickB (fit on the healthy/prefix feed, applied to the mon
 *  window). Generalizes the detection e-value to any member pairing — used by the ADR 0022 triad to score
 *  the c1−c2 sibling null and the t−c2 alternate contrast. */
export function contrastEValuesFor(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string, pickA: (p: ControlPair) => string, pickB: (p: ControlPair) => string): number[] {
  const mixed = healthy.dt_s !== mon.dt_s;
  const src = mixed ? mon : healthy;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  return usable.map((p) => {
    const d0 = sub(ser(src, pickA(p), counter)!, ser(src, pickB(p), counter)!);
    const fit = fitContrast(mixed ? d0.slice(0, prefixN) : d0);
    return normalizedMixtureEValue_H(applyContrast(sub(ser(mon, pickA(p), counter)!, ser(mon, pickB(p), counter)!), fit));
  });
}

/** ADR 0022 control triad — MIN RULE (2026-07-02 audit correction; see ADR 0022 § Correction).
 *  The previous routing (flag contaminated controls via the c1−c2 sibling e-BH, then OVERWRITE a flagged
 *  shard's detection e-value with the clean-sibling contrast t−c2) was a DATA-DEPENDENT selection with no
 *  covering theorem: the flag statistic (c1−c2) and the substituted statistic (t−c2) share c2's
 *  idiosyncratic noise (corr ≈ ½ under matched twins), so conditioning on {flagged} — including FALSE
 *  flags, which the flag e-BH produces at rate ~q by construction — up-tilts the substituted e-value;
 *  E[e_routed|H0] ≤ 1 was never established (the measured FDP 0.000 was empirics, not a theorem).
 *  The deployable rule validated in tools/peer-availability.ts IS theorem-valid and is used instead:
 *  e = min(e_{t−c1}, e_{t−c2}) UNCONDITIONALLY (E[min|H0] ≤ min E[e_i] ≤ 1, valid whenever ≥1 sibling
 *  contrast is a clean null; a single contaminated control fires only one contrast → not selected).
 *  Known cost: recall in the corner where a fault and same-sign control contamination partially cancel
 *  inside t−c1 (peer-availability measured recall ~0.87 there); FDR validity takes priority.
 *  The c1−c2 sibling null is RETAINED for REPORTING only (flaggedControls — operators still learn which
 *  controls look contaminated); it no longer influences which e-value enters e-BH. Mutates `e` in place;
 *  returns the flagged-control count (0 when there is no triad). */
function applyTriadRouting(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string, q: number, e: number[]): number {
  const hasTriad = usable.every((p) => p.control2 && ser(healthy, p.control2, counter) && ser(mon, p.control2, counter));
  if (!hasTriad) return 0;
  const eC2 = contrastEValuesFor(healthy, mon, usable, counter, (p) => p.treatment, (p) => p.control2!);
  for (let i = 0; i < e.length; i++) e[i] = Math.min(e[i], eC2[i]);
  const flagE = contrastEValuesFor(healthy, mon, usable, counter, (p) => p.control, (p) => p.control2!);
  return eBenjaminiHochberg(flagE, q).selected.length; // reporting only — never routes the detection e-value
}

/** Score one counter end-to-end: spatial-null contrast (gated) vs the temporal per-shard null. */
export function scoreCounterModeB(healthy: ScenarioBundle, mon: ScenarioBundle, pairs: ControlPair[], counter: string, q: number, dropContaminated?: ReadonlySet<string>): ModeBCounterResult | null {
  const usable = pairs.filter((p) => ser(healthy, p.treatment, counter) && ser(healthy, p.control, counter) && ser(mon, p.treatment, counter) && ser(mon, p.control, counter));
  if (!usable.length) return null;
  const faulted = faultedSet(mon, counter, dropContaminated);
  const isFault = usable.map((p) => faulted.has(p.treatment));
  const nFault = isFault.filter(Boolean).length;

  // #2 + Wall-A: construction validity on the concurrent control cohort (per-shard calibration + whiteness).
  const { fits, calStd, fullHorizonFeed } = cadenceAwareFit(healthy, mon, usable, counter);
  const whiteFrac = whiteFraction(calStd);
  const monitorPassing = calibrationPassFraction(calStd, 0.01, fullHorizonFeed) >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);

  // Detection: the spatial-null e-value per pair on the monitoring contrast; #1 gates e-BH on Mode B.
  const e = usable.map((p, i) => normalizedMixtureEValue_H(applyContrast(sub(ser(mon, p.treatment, counter)!, ser(mon, p.control, counter)!), fits[i])));
  // ADR 0022 control triad (min rule): e = min(t−c1, t−c2) — both siblings must agree; c1−c2 flags report only.
  const flaggedControls = applyTriadRouting(healthy, mon, usable, counter, q, e);

  const sel = mode === 'B' ? fdrBenjaminiHochberg(e, q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length;
  const tp = sel.filter((i) => isFault[i]).length;
  const t = temporalComparator(healthy, mon, usable, counter, q, isFault);

  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: t.K, temporalFdp: t.K ? t.fp / t.K : 0, temporalPower: nFault ? t.tp / nFault : NaN,
    monitorPassing, whiteFrac, flaggedControls,
  };
}

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

/** Header facts for the report (shared by the in-memory and streaming paths). */
export interface ModeBHeader { healthyShards: number; healthyT: number; healthyDt: number; monT: number; monDt: number; faults: number; pairs: number; }

/** Render the report from per-counter results (shared by both paths). */
function renderModeBReport(h: ModeBHeader, results: ModeBCounterResult[], q: number): string {
  const L: string[] = [];
  const mixed = h.healthyDt !== h.monDt;
  L.push('═══ CLUSTERSYNTH MODE B — concurrent-control spatial null at scale (ADR 0019) ═══');
  L.push(`baseline: ${h.healthyShards} shards (incl. control twins) × T=${h.healthyT} @ ${h.healthyDt}s  |  monitoring: T=${h.monT} @ ${h.monDt}s, ${h.faults} faults, ${h.pairs} pairs, q=${q}`);
  if (mixed) L.push(`MIXED CADENCE (${h.healthyDt}s baseline → ${h.monDt}s monitoring): φ/scale + calibration estimated at the monitoring cadence from the pre-fault prefix.`);
  L.push('');
  L.push('counter        nFault | MODE | spatial FDP/power (K) | naive-temporal FDP/power (K) | monitor white');
  let selOk = 0, fpOk = 0, tpOk = 0, fT = 0;
  for (const r of results) {
    if (r.nFault === 0) continue;
    fT += r.nFault; selOk += r.selected; fpOk += r.falsePos; tpOk += r.selected - r.falsePos;
    L.push(`  ${r.counter.padEnd(13)} ${String(r.nFault).padStart(5)} |  ${r.mode}   | ${fmt(r.fdp)}/${fmt(r.power)} (${String(r.selected).padStart(3)}) | ${fmt(r.temporalFdp)}/${fmt(r.temporalPower)} (${String(r.temporalSelected).padStart(3)}) | ${r.monitorPassing ? 'pass' : 'REVOKE'}  ${(100 * r.whiteFrac).toFixed(0)}%${r.flaggedControls ? `  triad⚑${r.flaggedControls}` : ''}`);
  }
  L.push('');
  const flagged = results.reduce((s, r) => s + r.flaggedControls, 0);
  L.push(`AGGREGATE spatial-null (Mode B) FDP: ${selOk ? (fpOk / selOk).toFixed(3) : '0.000'}  (${fpOk} false of ${selOk} selected)   recall: ${fT ? (tpOk / fT).toFixed(3) : '-'} (${tpOk}/${fT})${flagged ? `   contaminated controls flagged (triad, ADR 0022): ${flagged}` : ''}`);
  L.push('READING: the treatment−control contrast cancels the common-mode EXACTLY (shared factor instances +');
  L.push('loadings), so the spatial null is construction-valid and e-BH controls FDR ≤ q at scale with full');
  L.push('recall. The naive temporal per-shard null (no control) leaves the common-mode IN the residual, so it');
  L.push('cannot match the contrast — at a persistent cadence the fault is buried (low power), and toward unit');
  L.push('root the drift is mistaken for signal (FDP ≫ q). Either way the concurrent control is the achievable');
  L.push('null (ADR 0019). The per-shard calibration monitor + Wall-A whiteness gate the construction; a counter');
  L.push('whose control fails to cancel is revoked → demoted Mode A → abstains from the FDR claim.');
  return L.join('\n');
}

/** In-memory path (loads both bundles whole) — fine for same-cadence / hourly scale. */
export function renderModeB(healthyDir: string, monDir: string, q = 0.1): string {
  const healthy = loadScenarioBundle(healthyDir);
  assertLongBaseline(healthy.T, healthy.dt_s, 'clustersynth-mode-b (healthy baseline)');
  const mon = loadScenarioBundle(monDir);
  const pairs = loadControlPairs(monDir);
  const dropContaminated = loadContaminatedHealthyTreatments(monDir);
  const results = mon.counters.map((c) => scoreCounterModeB(healthy, mon, pairs, c.name, q, dropContaminated)).filter((r): r is ModeBCounterResult => r != null);
  const h: ModeBHeader = { healthyShards: healthy.shardIds.length, healthyT: healthy.T, healthyDt: healthy.dt_s, monT: mon.T, monDt: mon.dt_s, faults: mon.faults.length, pairs: pairs.length };
  return renderModeBReport(h, results, q);
}

// ─── STREAMING + MULTI-CORE PATH (for LONG, e.g. multi-day 1 Hz, monitoring windows) ────────────────
// The in-memory path loads every (shard×counter) series into RAM — fine at hourly scale but a multi-day
// 1 Hz window (millions of ticks × thousands of shards) does not fit. This path NEVER materialises the
// whole bundle: worker_threads each stream a BYTE RANGE of the monitoring counters.ndjson, pairing each
// treatment row with its adjacent control row (clustersynth emits them consecutively), computing the
// contrast e-value + per-shard calibration/whiteness scalars, and discarding the row arrays. The main
// thread reduces the scalars (e-BH per counter, gate). Memory is O(2 rows × T) per worker, flat in fleet
// size. The contrast fit is taken from each pair's OWN mon pre-fault prefix (cadence-correct and
// self-contained), so the healthy baseline is only read for the ≥2-month guard (its meta, not its series).
// Mirrors tools/baseline-monitor.ts's worker pattern; default for the CLI (CS_WORKERS=1 → in-memory).

interface Row { shard: string; counter: string; v: number[] }
interface CmbWorkerInput { __cmb_worker: true; monDir: string; byteStart: number; byteEnd: number;
  /** F8 fix: per `counter\0shard` baseline-contrast CENTERS (cadence-independent; from the ≥2-month
   *  baseline). Present only for triad bundles; workers then fit dynamics from the full-window
   *  c1−c2 sibling instead of the pre-fault prefix. */
  centersTC1?: Record<string, number>; centersTC2?: Record<string, number> }
/** Per-pair streaming scalar record. `flagE`/`eC2` are present ONLY when a triad twin (#ctrl2) exists for
 *  the pair (ADR 0022): flagE = the c1−c2 sibling-null e-value (REPORTING only — flags a contaminated
 *  control), eC2 = the t−c2 second-sibling detection e-value. reduceCmbCounter applies the MIN RULE
 *  e = min(e_{t−c1}, e_{t−c2}) (2026-07-02 audit correction — see applyTriadRouting's header for why the
 *  old flag-then-substitute routing was invalid). Absent ⇒ no triad ⇒ the bare t−c1 contrast as before. */
interface CmbRecord { c: string; s: string; e: number; tE: number; calibPass: boolean; white: boolean; flagE?: number; eC2?: number }

/** Yield [line, startOffset] for complete lines from byteStart to EOF (skipping a partial leading line that
 *  STRADDLES byteStart). Does NOT stop at any byteEnd — the pair state machine decides ownership/stopping.
 *  A line that starts EXACTLY at byteStart is NOT skipped: the previous range stops at this same offset
 *  (start ≥ byteEnd), so that line is owned here. Skipping it unconditionally (the old behavior) dropped a
 *  pair whenever a byte boundary aligned to a line start — benign at scale where row lengths vary, but a
 *  latent correctness bug the byte-range pairing relies on NOT having. */
function* linesFrom(filePath: string, byteStart: number): Generator<[string, number]> {
  const fd = fs.openSync(filePath, 'r');
  try {
    const CHUNK = 1 << 22;
    const buf = Buffer.allocUnsafe(CHUNK);
    let filePos = byteStart, lineStart = byteStart;
    let pending = Buffer.alloc(0);
    // Skip a leading partial line only when byteStart lands MID-line — i.e. the preceding byte is not a
    // newline. When byteStart sits right after a '\n' (or at file start), the first line is whole and ours.
    let skipFirst = false;
    if (byteStart > 0) {
      const prev = Buffer.allocUnsafe(1);
      skipFirst = !(fs.readSync(fd, prev, 0, 1, byteStart - 1) === 1 && prev[0] === 10);
    }
    let bytes: number;
    while ((bytes = fs.readSync(fd, buf, 0, CHUNK, filePos)) > 0) {
      filePos += bytes;
      const chunk = pending.length ? Buffer.concat([pending, buf.subarray(0, bytes)]) : Buffer.from(buf.subarray(0, bytes));
      let off = 0, nl: number;
      while ((nl = chunk.indexOf(10, off)) >= 0) {
        const thisStart = lineStart;
        lineStart += nl - off + 1;
        const line = chunk.subarray(off, nl);
        off = nl + 1;
        if (skipFirst) { skipFirst = false; continue; }
        if (line.length) yield [line.toString('utf8'), thisStart];
      }
      pending = chunk.subarray(off);
    }
    if (!skipFirst && pending.length) yield [pending.toString('utf8'), lineStart];
  } finally { fs.closeSync(fd); }
}

/** Yield [treatmentRow, controlRow] pairs whose TREATMENT line starts in [byteStart, byteEnd). Reads
 *  past byteEnd to complete a boundary-straddling pair (treatment and control are adjacent), and skips a
 *  leading orphan control (its treatment belongs to — and is completed by — the previous range). So each
 *  pair is owned by exactly one worker. */
export function* monPairs(filePath: string, byteStart: number, byteEnd: number): Generator<[Row, Row]> {
  let pending: { row: Row; start: number } | null = null;
  for (const [line, start] of linesFrom(filePath, byteStart)) {
    const row = JSON.parse(line) as Row;
    if (row.shard.endsWith('#ctrl')) {
      if (pending && row.shard === `${pending.row.shard}#ctrl` && row.counter === pending.row.counter) yield [pending.row, row];
      pending = null;
    } else {
      if (start >= byteEnd) return; // this treatment is owned by the next range
      pending = { row, start };
    }
  }
}

/** Like monPairs, but also captures the ADR 0022 triad's SECOND twin (#ctrl2). clustersynth emits, per
 *  (gpu,counter), the three rows treatment → #ctrl → #ctrl2 consecutively (scenario.ts streamCounters), so
 *  the triple is contiguous. Yields [treatment, control, control2|null] — control2 is null when the bundle
 *  has no triad (the #ctrl2 row simply never appears, and the pair is flushed when the next treatment, or
 *  EOF, is reached). Same byte-range ownership as monPairs: a triple is owned by the worker whose range
 *  contains its TREATMENT row; c1/c2 are read past byteEnd to complete it, and a leading orphan c1/c2 (whose
 *  treatment was completed by the previous range) is skipped. */
export function* monTriples(filePath: string, byteStart: number, byteEnd: number): Generator<[Row, Row, Row | null]> {
  // True iff `row` is the twin of pending treatment `t` carrying the given suffix (#ctrl / #ctrl2).
  const twinOf = (t: { row: Row } | null, row: Row, suffix: string): boolean =>
    t != null && row.shard === `${t.row.shard}${suffix}` && row.counter === t.row.counter;
  let t: { row: Row; start: number } | null = null;
  let c1: Row | null = null;
  for (const [line, start] of linesFrom(filePath, byteStart)) {
    const row = JSON.parse(line) as Row;
    if (row.shard.endsWith('#ctrl2')) {
      if (c1 && twinOf(t, row, '#ctrl2')) yield [t!.row, c1, row];
      t = null; c1 = null; // triple complete (or an orphan c2) → reset
    } else if (row.shard.endsWith('#ctrl')) {
      if (twinOf(t, row, '#ctrl')) c1 = row; // hold for a possible c2
      else { t = null; c1 = null; }
    } else {
      if (c1) yield [t!.row, c1, null]; // previous pair had no #ctrl2 (no triad) → flush it
      t = null; c1 = null;
      if (start >= byteEnd) return; // this treatment is owned by the next range
      t = { row, start };
    }
  }
  if (c1) yield [t!.row, c1, null]; // trailing no-triad pair at EOF
}

/** Worker: stream a byte range, pair rows, emit per-pair scalars (contrast + temporal e-values + the
 *  construction-validity flags). TRIAD bundles (2026-07-02 audit F8 fix): the detection fits take their
 *  CENTER from the ≥2-month baseline (passed in via centersTC1/centersTC2 — cadence-independent) and
 *  their DYNAMICS from the FULL-window mon-cadence c1−c2 sibling (a known null; no pre-fault-prefix /
 *  "onsets ≥ 0.1·T" assumption), and the calibration/whiteness feed is the FULL-horizon standardized
 *  sibling. Pair-only bundles keep the prefix fit (no second twin to fit from; disclosed). */
function runCmbWorker(input: CmbWorkerInput): CmbRecord[] {
  const meta = JSON.parse(fs.readFileSync(path.join(input.monDir, 'factors.json'), 'utf8')) as { T: number };
  const prefixN = Math.max(50, Math.floor(0.08 * meta.T));
  // The prefix-fit e-value of a contrast a−b (fit on its own pre-fault prefix, applied to the full window).
  const prefixContrastE = (a: number[], b: number[]): number => {
    const d = a.map((x, i) => x - b[i]);
    return normalizedMixtureEValue_H(applyContrast(d, fitContrast(d.slice(0, prefixN))));
  };
  const out: CmbRecord[] = [];
  for (const [t, c, c2] of monTriples(path.join(input.monDir, 'counters.ndjson'), input.byteStart, input.byteEnd)) {
    const key = `${t.counter}\0${t.shard}`;
    const d = t.v.map((x, i) => x - c.v[i]); // the model-free spatial-null contrast
    const tFit = fitContrast(t.v.slice(0, prefixN)); // temporal comparator (no control)
    let rec: CmbRecord;
    const cTC1 = input.centersTC1?.[key], cTC2 = input.centersTC2?.[key];
    if (c2 && cTC1 !== undefined && cTC2 !== undefined) {
      // F8 path: baseline center + full-window sibling dynamics; full-horizon sibling null feed.
      const sib = c.v.map((x, i) => x - c2.v[i]);
      const dynFit = fitContrast(sib);
      const sibStd = applyContrast(sib, dynFit);
      rec = {
        c: t.counter, s: t.shard,
        e: normalizedMixtureEValue_H(applyContrast(d, composeFit({ ...dynFit, center: cTC1 }, dynFit))),
        tE: normalizedMixtureEValue_H(applyContrast(t.v, tFit)),
        calibPass: fullCalibrationPass(sibStd), // in-sample sibling feed → detection-length monitor (no cap)
        white: Math.abs(autocorr(sibStd, 1)) <= whitenessThresh(sibStd.length),
        flagE: prefixContrastE(c.v, c2.v), // flag stays prefix-fit (reporting-only; its own contrast IS the sibling)
        eC2: normalizedMixtureEValue_H(applyContrast(t.v.map((x, i) => x - c2.v[i]), composeFit({ ...dynFit, center: cTC2 }, dynFit))),
      };
    } else {
      const fit = fitContrast(d.slice(0, prefixN));
      const std = applyContrast(d, fit);
      const prefixStd = std.slice(0, prefixN);
      rec = {
        c: t.counter, s: t.shard,
        e: normalizedMixtureEValue_H(std),
        tE: normalizedMixtureEValue_H(applyContrast(t.v, tFit)),
        calibPass: prefixCalibrationPass(prefixStd),
        white: Math.abs(autocorr(prefixStd, 1)) <= whitenessThresh(prefixStd.length),
      };
      if (c2) { // triad without baseline centers (caller didn't supply) → legacy prefix fits
        rec.flagE = prefixContrastE(c.v, c2.v);
        rec.eC2 = prefixContrastE(t.v, c2.v);
      }
    }
    out.push(rec);
  }
  return out;
}

/** Reduce one counter's per-pair records → a ModeBCounterResult (gate → e-BH → FDP/recall vs temporal). */
function reduceCmbCounter(counter: string, recs: CmbRecord[], faults: ReadonlyArray<unknown>, specs: CounterLoad[], q: number, dropContaminated?: ReadonlySet<string>): ModeBCounterResult | null {
  if (!recs.length) return null;
  const faulted = faultedSetFrom(faults, specs, counter, dropContaminated);
  const isFault = recs.map((r) => faulted.has(r.s));
  const nFault = isFault.filter(Boolean).length;
  const whiteFrac = recs.filter((r) => r.white).length / recs.length;
  const monitorPassing = recs.filter((r) => r.calibPass).length / recs.length >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);

  // ADR 0022 control triad — MIN RULE (2026-07-02 audit correction; see applyTriadRouting's header):
  // when every pair carries a second twin (#ctrl2), the detection e-value is min(e_{t−c1}, e_{t−c2}) —
  // unconditionally a valid conservative e-value (both siblings must agree; a single contaminated control
  // fires only one contrast → not selected). The c1−c2 sibling e-BH is REPORTING only. Mirrors the
  // in-memory applyTriadRouting, here over the streamed scalars (so the mixed-cadence AND long-baseline
  // streaming paths, which both reduce through here, get the identical rule).
  const e = recs.map((r) => r.e);
  const hasTriad = recs.every((r) => r.flagE !== undefined && r.eC2 !== undefined);
  let flaggedControls = 0;
  if (hasTriad) {
    for (let i = 0; i < e.length; i++) e[i] = Math.min(e[i], recs[i].eC2!);
    flaggedControls = eBenjaminiHochberg(recs.map((r) => r.flagE!), q).selected.length;
  }

  const sel = mode === 'B' ? fdrBenjaminiHochberg(e, q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length, tp = sel.filter((i) => isFault[i]).length;
  const tSel = [...eBenjaminiHochberg(recs.map((r) => r.tE), q).selected];
  const tFp = tSel.filter((i) => !isFault[i]).length, tTp = tSel.filter((i) => isFault[i]).length;
  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: tSel.length, temporalFdp: tSel.length ? tFp / tSel.length : 0, temporalPower: nFault ? tTp / nFault : NaN,
    monitorPassing, whiteFrac, flaggedControls,
  };
}

/** Streaming + multi-core path. For TRIAD bundles the healthy baseline's SERIES are now consumed
 *  (per-shard contrast CENTERS — the F8 fix makes the ≥2-month guard guard the feed actually used);
 *  for pair-only bundles it is read for the guard + header only (prefix fit, disclosed). */
export async function renderModeBStreaming(healthyDir: string, monDir: string, q: number, nWorkers: number): Promise<string> {
  const hMeta = JSON.parse(fs.readFileSync(path.join(healthyDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; membership: Record<string, unknown> };
  assertLongBaseline(hMeta.T, hMeta.dt_s ?? 1, 'clustersynth-mode-b (healthy baseline)');
  const meta = JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; counters: CounterLoad[] };
  const faults: unknown[] = JSON.parse(fs.readFileSync(path.join(monDir, 'labels.json'), 'utf8')).faults;
  const pairs = loadControlPairs(monDir);

  // F8 fix: for triad bundles, per-(counter,shard) baseline-contrast centers (t−c1 and t−c2) from the
  // (small, coarse-cadence) healthy bundle — a mean offset transfers across cadence; dynamics do not.
  let centersTC1: Record<string, number> | undefined;
  let centersTC2: Record<string, number> | undefined;
  if (pairs.some((p) => p.control2)) {
    const healthy = loadScenarioBundle(healthyDir);
    centersTC1 = {}; centersTC2 = {};
    const med = (xs: number[]): number => { const t = xs.slice().sort((a, b) => a - b); return t[t.length >> 1]; };
    for (const cs of meta.counters) {
      for (const p of pairs) {
        if (!p.control2) continue;
        const t = ser(healthy, p.treatment, cs.name), c1 = ser(healthy, p.control, cs.name), c2 = ser(healthy, p.control2, cs.name);
        if (!t || !c1 || !c2) continue;
        centersTC1[`${cs.name}\0${p.treatment}`] = med(sub(t, c1));
        centersTC2[`${cs.name}\0${p.treatment}`] = med(sub(t, c2));
      }
    }
  }

  const file = path.join(monDir, 'counters.ndjson');
  const size = fs.statSync(file).size;
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < nWorkers; i++) ranges.push([Math.floor((i * size) / nWorkers), Math.floor(((i + 1) * size) / nWorkers)]);
  const recs = (await Promise.all(ranges.map(([byteStart, byteEnd]) => new Promise<CmbRecord[]>((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { __cmb_worker: true, monDir, byteStart, byteEnd, centersTC1, centersTC2 } as CmbWorkerInput });
    w.once('message', (m: CmbRecord[]) => resolve(m));
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error(`cmb worker exited ${code}`)); });
  })))).flat();

  const byCounter = new Map<string, CmbRecord[]>();
  for (const r of recs) { let a = byCounter.get(r.c); if (!a) { a = []; byCounter.set(r.c, a); } a.push(r); }
  const dropContaminated = loadContaminatedHealthyTreatments(monDir);
  const results = meta.counters.map((c) => reduceCmbCounter(c.name, byCounter.get(c.name) ?? [], faults, meta.counters, q, dropContaminated)).filter((r): r is ModeBCounterResult => r != null);
  const h: ModeBHeader = { healthyShards: Object.keys(hMeta.membership ?? {}).length, healthyT: hMeta.T, healthyDt: hMeta.dt_s ?? 1, monT: meta.T, monDt: meta.dt_s ?? 1, faults: faults.length, pairs: pairs.length };
  return renderModeBReport(h, results, q);
}

// ─── STREAMING SAME-CADENCE LONG-BASELINE PATH (ADR 0022: consume a 2-month 1 Hz baseline at scale) ──
// The mixed-cadence streaming path above fits from the mon PRE-FAULT PREFIX (~minutes) — the short-baseline
// shortcut. To actually fit from a long fine-cadence (e.g. 60d @ 1 Hz) baseline, that baseline must be the
// fit feed. It does not fit in memory at scale (47 GB at 8 racks), so we stream it too, in two phases:
//   Phase 1 — stream the BASELINE counters.ndjson, pair treatment↔control rows, compute each shard's
//             ContrastFit from its FULL baseline contrast via fitContrastFast (O(n), no sort) + the
//             calibration/whiteness verdict on the baseline-standardized contrast. Memory O(2 rows × T).
//   Phase 2 — stream the MON counters.ndjson, apply each shard's baseline fit to the monitoring contrast,
//             emit the detection (+ temporal) e-values.
// The per-shard fit map (4 floats/shard) is tiny and passes to the Phase-2 workers via workerData.

interface LbFitRecord { c: string; s: string; fit: ContrastFit; calibPass: boolean; white: boolean; fitC1C2?: ContrastFit; fitTC2?: ContrastFit }
interface LbFitInput { __cmb_lb: 'fit'; baseDir: string; byteStart: number; byteEnd: number }
interface LbDetectInput { __cmb_lb: 'detect'; monDir: string; byteStart: number; byteEnd: number; prefixN: number; fits: Record<string, ContrastFit>; fitsC1C2: Record<string, ContrastFit>; fitsTC2: Record<string, ContrastFit> }
interface LbDetectRecord { c: string; s: string; e: number; tE: number; flagE?: number; eC2?: number }

/** Phase 1 worker: per-shard fit + calibration/whiteness from the FULL (long) baseline contrast. When a
 *  triad twin is present, ALSO fit the c1−c2 and t−c2 contrasts from the baseline (ADR 0022) — the fits the
 *  Phase-2 detector applies to score the sibling-null + clean-sibling on the monitoring window. */
function runLbFitWorker(input: LbFitInput): LbFitRecord[] {
  const out: LbFitRecord[] = [];
  for (const [t, c, c2] of monTriples(path.join(input.baseDir, 'counters.ndjson'), input.byteStart, input.byteEnd)) {
    const d = t.v.map((x, i) => x - c.v[i]);
    const fit = fitContrastFast(d); // mean/SD, O(n) no sort — the long-baseline fit feed
    const std = applyContrast(d, fit);
    const calFeed = std.length > CALIB_FEED_CAP ? std.slice(0, CALIB_FEED_CAP) : std;
    const rec: LbFitRecord = { c: t.counter, s: t.shard, fit, calibPass: prefixCalibrationPass(calFeed), white: Math.abs(autocorr(calFeed, 1)) <= whitenessThresh(calFeed.length) };
    if (c2) {
      rec.fitC1C2 = fitContrastFast(c.v.map((x, i) => x - c2.v[i]));
      rec.fitTC2 = fitContrastFast(t.v.map((x, i) => x - c2.v[i]));
    }
    out.push(rec);
  }
  return out;
}

/** Phase 2 worker: apply each shard's baseline fit to the monitoring contrast → detection + temporal e-values.
 *  When triad baseline fits are present, also emit the c1−c2 (flagE) + t−c2 (eC2) e-values for the reducer. */
function runLbDetectWorker(input: LbDetectInput): LbDetectRecord[] {
  const out: LbDetectRecord[] = [];
  for (const [t, c, c2] of monTriples(path.join(input.monDir, 'counters.ndjson'), input.byteStart, input.byteEnd)) {
    const key = `${t.counter}\0${t.shard}`;
    const fit = input.fits[key];
    if (!fit) continue; // no baseline fit for this shard (shouldn't happen for a matched bundle)
    const dMon = t.v.map((x, i) => x - c.v[i]);
    const tFit = fitContrastFast(t.v.slice(0, input.prefixN)); // temporal comparator (no control), mon prefix
    const rec: LbDetectRecord = { c: t.counter, s: t.shard, e: normalizedMixtureEValue_H(applyContrast(dMon, fit)), tE: normalizedMixtureEValue_H(applyContrast(t.v, tFit)) };
    const fitC1C2 = input.fitsC1C2[key], fitTC2 = input.fitsTC2[key];
    if (c2 && fitC1C2 && fitTC2) {
      rec.flagE = normalizedMixtureEValue_H(applyContrast(c.v.map((x, i) => x - c2.v[i]), fitC1C2));
      rec.eC2 = normalizedMixtureEValue_H(applyContrast(t.v.map((x, i) => x - c2.v[i]), fitTC2));
    }
    out.push(rec);
  }
  return out;
}

function byteRanges(file: string, nWorkers: number): Array<[number, number]> {
  const size = fs.statSync(file).size;
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < nWorkers; i++) ranges.push([Math.floor((i * size) / nWorkers), Math.floor(((i + 1) * size) / nWorkers)]);
  return ranges;
}
function runWorkers<T>(input: object, ranges: Array<[number, number]>): Promise<T[]> {
  return Promise.all(ranges.map(([byteStart, byteEnd]) => new Promise<T[]>((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { ...input, byteStart, byteEnd } });
    w.once('message', (m: T[]) => resolve(m));
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  }))).then((rs) => rs.flat());
}

/** Streaming SAME-CADENCE long-baseline path: fit from the streamed long baseline (Phase 1), detect on the
 *  streamed monitoring window (Phase 2). The fit finally consumes the full 2-month fine-cadence baseline. */
export async function renderModeBLongBaseline(baseDir: string, monDir: string, q: number, nWorkers: number): Promise<string> {
  const hMeta = JSON.parse(fs.readFileSync(path.join(baseDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; membership?: Record<string, unknown> };
  assertLongBaseline(hMeta.T, hMeta.dt_s ?? 1, 'clustersynth-mode-b (long-baseline streaming)');
  const meta = JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; counters: CounterLoad[] };
  const faults: unknown[] = JSON.parse(fs.readFileSync(path.join(monDir, 'labels.json'), 'utf8')).faults;
  const pairs = loadControlPairs(monDir);
  const prefixN = Math.max(50, Math.floor(0.08 * meta.T));

  // Phase 1: fits from the long baseline (+ the triad sibling fits when a #ctrl2 twin is present).
  const fitRecs = await runWorkers<LbFitRecord>({ __cmb_lb: 'fit', baseDir }, byteRanges(path.join(baseDir, 'counters.ndjson'), nWorkers));
  const fits: Record<string, ContrastFit> = {};
  const fitsC1C2: Record<string, ContrastFit> = {};
  const fitsTC2: Record<string, ContrastFit> = {};
  const gateByKey = new Map<string, { calibPass: boolean; white: boolean }>();
  for (const r of fitRecs) {
    const k = `${r.c}\0${r.s}`; fits[k] = r.fit; gateByKey.set(k, { calibPass: r.calibPass, white: r.white });
    if (r.fitC1C2 && r.fitTC2) { fitsC1C2[k] = r.fitC1C2; fitsTC2[k] = r.fitTC2; }
  }

  // Phase 2: detect on the monitoring window using the baseline fits (+ triad sibling e-values).
  const detRecs = await runWorkers<LbDetectRecord>({ __cmb_lb: 'detect', monDir, prefixN, fits, fitsC1C2, fitsTC2 }, byteRanges(path.join(monDir, 'counters.ndjson'), nWorkers));

  const byCounter = new Map<string, CmbRecord[]>();
  for (const r of detRecs) {
    const g = gateByKey.get(`${r.c}\0${r.s}`);
    if (!g) continue;
    let a = byCounter.get(r.c); if (!a) { a = []; byCounter.set(r.c, a); }
    a.push({ c: r.c, s: r.s, e: r.e, tE: r.tE, calibPass: g.calibPass, white: g.white, flagE: r.flagE, eC2: r.eC2 });
  }
  const dropContaminated = loadContaminatedHealthyTreatments(monDir);
  const results = meta.counters.map((c) => reduceCmbCounter(c.name, byCounter.get(c.name) ?? [], faults, meta.counters, q, dropContaminated)).filter((r): r is ModeBCounterResult => r != null);
  const h: ModeBHeader = { healthyShards: Object.keys(hMeta.membership ?? {}).length, healthyT: hMeta.T, healthyDt: hMeta.dt_s ?? 1, monT: meta.T, monDt: meta.dt_s ?? 1, faults: faults.length, pairs: pairs.length };
  return renderModeBReport(h, results, q);
}

/** Default worker count: all cores; CS_WORKERS=N overrides (1 = in-memory single-thread). */
function defaultWorkers(): number {
  if (process.env.CS_WORKERS) return Math.max(1, Number(process.env.CS_WORKERS) | 0);
  return Math.max(1, os.availableParallelism?.() ?? os.cpus().length);
}

if (!isMainThread && (workerData as Partial<CmbWorkerInput> | undefined)?.__cmb_worker) {
  try { parentPort!.postMessage(runCmbWorker(workerData as CmbWorkerInput)); }
  catch (err) { parentPort!.postMessage([]); throw err; }
} else if (!isMainThread && (workerData as { __cmb_lb?: string } | undefined)?.__cmb_lb) {
  const wd = workerData as LbFitInput | LbDetectInput;
  try { parentPort!.postMessage(wd.__cmb_lb === 'fit' ? runLbFitWorker(wd as LbFitInput) : runLbDetectWorker(wd as LbDetectInput)); }
  catch (err) { parentPort!.postMessage([]); throw err; }
} else if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/clustersynth-mode-b.js <healthy-baseline-dir> <monitoring-dir> [q]\n  both bundles must be generated WITH the control arm (CS_CONTROL_ARM=1).\n  env: CS_WORKERS=N (default all cores; 1 = in-memory single-thread). Streaming is required for long 1 Hz windows.\n');
    process.exit(2);
  }
  const q = process.argv[4] ? Number(process.argv[4]) : 0.1;
  const nWorkers = defaultWorkers();
  // Streaming is for LONG MIXED-cadence windows (the multi-day 1 Hz case): there the fit comes from the
  // mon pre-fault prefix, so it is self-contained and equivalent to the in-memory mixed path. For
  // SAME-cadence the in-memory path fits from the (small) healthy baseline — a different, longer
  // calibration window — so streaming would NOT match; keep same-cadence on the in-memory path.
  const baseDt = (JSON.parse(fs.readFileSync(path.join(healthyDir, 'factors.json'), 'utf8')) as { dt_s?: number }).dt_s ?? 1;
  const monDt = (JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as { dt_s?: number }).dt_s ?? 1;
  const baseSize = fs.statSync(path.join(healthyDir, 'counters.ndjson')).size;
  // SAME-cadence + a big baseline (e.g. 60d @ 1 Hz) → the long-baseline streaming path (fit from the full
  // streamed baseline; ADR 0022). Small same-cadence (hourly) stays in-memory. MIXED-cadence → the prefix-fit
  // streaming path. CS_LONG_BASELINE=1 forces the long-baseline path.
  const longBaseline = nWorkers > 1 && baseDt === monDt && (process.env.CS_LONG_BASELINE === '1' || baseSize > (1 << 30));
  const useStream = nWorkers > 1 && baseDt !== monDt;
  (async () => {
    if (longBaseline) process.stdout.write(await renderModeBLongBaseline(healthyDir, monDir, q, nWorkers) + `\n(${nWorkers} worker threads, long-baseline streaming)\n`);
    else if (useStream) process.stdout.write(await renderModeBStreaming(healthyDir, monDir, q, nWorkers) + `\n(${nWorkers} worker threads, streaming)\n`);
    else process.stdout.write(renderModeB(healthyDir, monDir, q) + '\n');
  })().then(() => process.exit(0)).catch((e) => { process.stderr.write(String(e?.stack ?? e) + '\n'); process.exit(1); });
}
