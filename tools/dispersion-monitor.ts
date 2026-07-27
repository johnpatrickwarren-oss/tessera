// tools/dispersion-monitor.ts — the HETEROGENEITY DESIGN-GATE MONITOR for the conformal-rank
// (canary) family: the runtime enforcement of ADR 0023 CORRECTIONS 2 + 3's pair gate
// (ICC ≲ 4% AND ς ≲ 0.15).
//
// WHY THIS EXISTS — AND WHY THE EXISTING MONITORS CANNOT DO THIS JOB. The canary family's
// accumulated guarantee rests on a DRIFT premise: no persistent unit heterogeneity beyond the
// block key, in either channel (location — ICC/θ; dispersion — ς). Correction 2 proved the
// pooled-marginal uniformity monitor is BLIND to this violation class (the pooled conformal-p
// distribution is exactly uniform at every θ — the same identity that makes per-round validity
// exact — so its miss rate is β = 1), and the marginal calibration monitor
// (tools/calibration-monitor.ts) tests the same pooled marginal. A violated drift premise is
// invisible to every per-round check BY CONSTRUCTION; the only instrument that sees it is the
// panel-level estimator pair across rounds. This module runs that pair against the design-gate
// thresholds and feeds `EmitterContract.heterogeneityGatePassing`, which the validity-class gate
// consumes: a conformal_rank emitter without a passing heterogeneity gate is NOT FDR-bearing.
//
// This also operationalises Correction 2's missing validity-class rung ("exact per round,
// drift-limited across rounds") without adding an enum member: the rung's runtime semantics are
// exactly "admitted while the measured drift preconditions hold".
//
// WHAT IT IS NOT (named honestly, mirroring calibration-monitor's scope note). This is a PLUG-IN
// gate on two estimators, not an anytime-valid test: the false-demotion rate is not controlled by
// a Ville bound. What controls it in practice: the thresholds sit far above the measured
// instrument floors (ς̂ null floor 0.034 vs the 0.15 gate; θ̂ floor ≈ 0.03 vs the ICC-4% ≈ θ 0.2
// gate), and the verdict is computed on ≥ minRounds of panel. Demotion is STICKY (a revoked gate
// stays revoked until the caller rearms with a fresh monitor) — for the same reason the
// calibration monitor is sticky: flapping availability is acceptable, a flapping GUARANTEE is not.
// The caller owns feeding a BELIEVED-HEALTHY cohort (faulted units inflate both estimators and
// cost availability, never validity — same caller-owns-the-null contract as calibration-monitor).
//
// Thresholds default to the measured design targets (a2-dispersion report § 5; icc-sweep):
// ICC ≤ 4% (breach bracketed 6.32–8.36%) and ς ≤ 0.15 (breach bracketed 0.15–0.31 for paging,
// ~0.31 for e-BH — see dispersion-ebh-boundary). Both are HALF the bracketed breach onset, and
// both are RELATIONS to re-measure per fleet, not constants of nature.

import { estimateDispersion, estimateIcc } from './heterogeneity-estimate.js';
import type { EmitterContract } from './emitter-contract.js';

export interface HeterogeneityGateOptions {
  /** Dispersion gate: demote when ς̂ exceeds this. Default 0.15 (ADR 0023 Correction 3). */
  varsigmaMax?: number;
  /** Location gate: demote when ICC exceeds this. Default 0.04 (icc-sweep). */
  iccMax?: number;
  /** Rounds of panel required before the gate can PASS. Below this the verdict is undecided and
   *  the emitter is NOT FDR-bearing — unmeasured preconditions are failed preconditions, the same
   *  rule as `calibrationMonitorPassing === undefined`. Default 20. */
  minRounds?: number;
  /** Rolling window: only the most recent windowRounds rounds enter the estimate, so a fleet whose
   *  composition improved (block-key enrichment) is not haunted forever by old panel — but note
   *  demotion is sticky regardless; the window governs the ESTIMATE, not the verdict. Default 160. */
  windowRounds?: number;
}

export interface HeterogeneityMonitorState {
  /** round-major panel: rounds[t][u] = unit u's score in round t. Unit index must be stable. */
  rounds: number[][];
  nUnits: number;
  varsigmaMax: number;
  iccMax: number;
  minRounds: number;
  windowRounds: number;
  /** total rounds ever ingested (the rolling window may hold fewer). */
  ticks: number;
  /** sticky — once the gate has failed it stays failed until the caller rearms (fresh monitor). */
  revoked: boolean;
}

export function freshHeterogeneityMonitor(opts: HeterogeneityGateOptions = {}): HeterogeneityMonitorState {
  const varsigmaMax = opts.varsigmaMax ?? 0.15;
  const iccMax = opts.iccMax ?? 0.04;
  const minRounds = opts.minRounds ?? 20;
  const windowRounds = opts.windowRounds ?? 160;
  if (!(varsigmaMax > 0) || !(iccMax > 0)) throw new Error('dispersion-monitor: thresholds must be positive');
  if (minRounds < 8) throw new Error(`dispersion-monitor: minRounds ${minRounds} too small for the χ²-corrected estimator (need ≥ 8)`);
  if (windowRounds < minRounds) throw new Error('dispersion-monitor: windowRounds must be ≥ minRounds');
  return { rounds: [], nUnits: 0, varsigmaMax, iccMax, minRounds, windowRounds, ticks: 0, revoked: false };
}

export interface HeterogeneityVerdict {
  /** false until minRounds of panel have been ingested. */
  decided: boolean;
  /** the gate: decided AND ς̂ ≤ ςmax AND ICC ≤ iccMax AND never previously revoked. */
  passing: boolean;
  varsigmaHat: number | null;
  iccHat: number | null;
  rounds: number;
  nUnits: number;
  varsigmaMax: number;
  iccMax: number;
  reason: string | null;
}

/** Round-demean the round-major panel and return it unit-major (what both estimators consume). */
function demeanedUnitMajor(state: HeterogeneityMonitorState): number[][] {
  const nR = state.rounds.length, nU = state.nUnits;
  const out: number[][] = Array.from({ length: nU }, () => new Array<number>(nR));
  for (let t = 0; t < nR; t++) {
    let m = 0;
    for (let u = 0; u < nU; u++) m += state.rounds[t][u];
    m /= nU;
    for (let u = 0; u < nU; u++) out[u][t] = state.rounds[t][u] - m;
  }
  return out;
}

/** The monitor's verdict (does NOT mutate). Estimates are computed on the current window. */
export function heterogeneityVerdict(state: HeterogeneityMonitorState): HeterogeneityVerdict {
  const base = {
    rounds: state.rounds.length, nUnits: state.nUnits,
    varsigmaMax: state.varsigmaMax, iccMax: state.iccMax,
  };
  if (state.rounds.length < state.minRounds) {
    return {
      ...base, decided: false, passing: false, varsigmaHat: null, iccHat: null,
      reason: `undecided: ${state.rounds.length}/${state.minRounds} rounds of believed-healthy panel — unmeasured drift preconditions are failed preconditions`,
    };
  }
  const resid = demeanedUnitMajor(state);
  const varsigmaHat = estimateDispersion(resid).varsigma;
  const iccHat = estimateIcc(resid).icc;
  const breaches: string[] = [];
  if (varsigmaHat > state.varsigmaMax) breaches.push(`ς̂ ${varsigmaHat.toFixed(3)} > ${state.varsigmaMax} (dispersion channel — invisible to the ICC gate AND to every pooled-marginal monitor)`);
  if (iccHat > state.iccMax) breaches.push(`ICC ${(iccHat * 100).toFixed(2)}% > ${state.iccMax * 100}% (location channel)`);
  if (state.revoked && breaches.length === 0) breaches.push('previously revoked (sticky; rearm with a fresh monitor after the design change that fixes the panel)');
  return {
    ...base, decided: true, passing: breaches.length === 0, varsigmaHat, iccHat,
    reason: breaches.length ? breaches.join('; ') : null,
  };
}

/** Ingest one round of believed-healthy per-unit scores (stable unit index across rounds).
 *  Mutates and returns the state; sticky-revokes the moment a decided verdict breaches. */
export function updateHeterogeneity(state: HeterogeneityMonitorState, roundScores: ReadonlyArray<number>): HeterogeneityMonitorState {
  if (state.nUnits === 0) {
    if (roundScores.length < 8) throw new Error(`dispersion-monitor: ${roundScores.length} units is too few for a between-unit spread estimate (need ≥ 8)`);
    state.nUnits = roundScores.length;
  }
  if (roundScores.length !== state.nUnits) {
    throw new Error(`dispersion-monitor: round has ${roundScores.length} units, panel has ${state.nUnits} — the estimator needs a stable cohort (align or rearm)`);
  }
  if (roundScores.some((v) => !Number.isFinite(v))) throw new Error('dispersion-monitor: non-finite score in round');
  state.rounds.push([...roundScores]);
  if (state.rounds.length > state.windowRounds) state.rounds.shift();
  state.ticks++;
  if (state.rounds.length >= state.minRounds && !state.revoked) {
    const v = heterogeneityVerdict(state);
    if (!v.passing) state.revoked = true;
  }
  return state;
}

/** Set `heterogeneityGatePassing` on a contract from the monitor — the wiring that makes the
 *  A2 drift premise a live, revocable precondition instead of a prose caveat. For a
 *  `conformal_rank` emitter this is what keeps it Mode B; for other families the flag is
 *  informational (the validity gate ignores it). */
export function applyHeterogeneityGate(
  contract: EmitterContract, state: HeterogeneityMonitorState,
): { contract: EmitterContract; verdict: HeterogeneityVerdict } {
  const verdict = heterogeneityVerdict(state);
  return { contract: { ...contract, heterogeneityGatePassing: verdict.passing }, verdict };
}
