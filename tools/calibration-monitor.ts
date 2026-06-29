// tools/calibration-monitor.ts — the RUNTIME CALIBRATION MONITOR that makes `construction_valid`
// REVOCABLE (ADR 0019 follow-up #2; rule 1: "construction_valid is not a static stamp ... revocable at
// runtime"). Anytime-valid calibration monitoring (biblio lead: Farran 2026).
//
// WHY THIS EXISTS. A `construction_valid` emitter's increment is a valid e-value ONLY on the conditional
// null it was constructed for. The emitter-prototype proved the gap: the normalized-mixture increment is
// construction-valid *on N(0,1)* yet produced healthy mean(e) ~ 1e150 because the live residual was NOT
// N(0,1) (time-varying drift / wrong scale). A class without a live monitor manufactures false
// confidence. So Mode-B membership must be CHECKED at runtime and REVOKED the moment the conditional
// null breaks. This module is that check; it sets `EmitterContract.calibrationMonitorPassing`, which the
// validity-class gate (tools/emitter-contract.ts) already consumes — a failing monitor demotes the
// emitter B→A automatically.
//
// THE TEST (anytime-valid, Ville's inequality). Under a VALID null the emitter increment g satisfies
// E[g(r_t) | F_{t-1}] ≤ 1, so the running product W_t = ∏_{s≤t} g(r_s) is a nonnegative test
// (super)martingale with W_0 = 1 and E[W_t | H0] ≤ 1. Ville: P(sup_t W_t ≥ 1/α | H0) ≤ α. We feed W a
// stream of residuals that are SUPPOSED to be null (a concurrent control cohort in Mode B; a believed-
// healthy reference otherwise). If W ever exceeds 1/α_cal, that is anytime-valid evidence — false-alarm
// probability ≤ α_cal over ALL time — that the residual's null does NOT hold for this increment, i.e. the
// calibration is broken. We then REVOKE (passing := false, sticky): the emitter is no longer
// construction-valid for this horizon and the gate routes it to Mode A.
//
// SOUND DISTINCTION from the per-shard PREFIX AUDIT (ADR 0019 § Evidence, "NO-GO"). The prefix audit
// tried to CERTIFY FUTURE validity from a past window and failed because the breaking drift is
// time-varying (clean prefix, drifts later). This monitor makes NO claim about the future: it is a
// RUNNING revocation that watches the PRESENT and demotes the moment calibration breaks. Anytime-validity
// is exactly what lets it run forever at a controlled false-revocation rate. Revoke-on-break is sound
// even though certify-the-future is not.
//
// SCOPE (named honestly). g is the symmetric Gaussian-LR mixture (λ = ±{.5,1,2}), so W tests MARGINAL
// calibration of the increment — it catches the binding ADR 0019 failure mode (residual mean/scale wrong
// → E[g] > 1). Pure serial dependence with a perfect marginal N(0,1) is a subtler failure this marginal
// test is weak against; conditional/serial calibration testing is the harder O5 frontier. We test the
// failure that actually broke FDR, and name the boundary. Tessera-original.

import { gInc } from './mixture-evalue.js';
import type { EmitterContract } from './emitter-contract.js';

export interface CalibrationMonitorOptions {
  /** Anytime-valid level: revoke when the calibration test martingale W ≥ 1/alpha. Default 0.01 (so the
   *  false-revocation probability over ALL time is ≤ 1%). */
  alpha?: number;
  /** The emitter increment under test (E[g|H0] ≤ 1). Default: the production normalized-mixture g. */
  increment?: (r: number) => number;
}

export interface CalibrationMonitorState {
  /** log of the calibration test martingale W (log-space for numerical stability under long streams). */
  logW: number;
  /** running max of logW (the e-value evidence-so-far is exp(peakLogW)). */
  peakLogW: number;
  /** number of believed-null residuals ingested. */
  ticks: number;
  /** false once revoked — STICKY (anytime-valid evidence does not un-accumulate). */
  passing: boolean;
  /** the revocation threshold in log space, log(1/alpha). */
  threshold: number;
  /** the increment under test. */
  increment: (r: number) => number;
}

/** A fresh, passing calibration monitor. */
export function freshCalibrationMonitor(opts: CalibrationMonitorOptions = {}): CalibrationMonitorState {
  const alpha = opts.alpha ?? 0.01;
  if (!(alpha > 0 && alpha <= 1)) throw new Error(`calibration-monitor: alpha must be in (0,1], got ${alpha}`);
  return {
    logW: 0, peakLogW: 0, ticks: 0, passing: true,
    threshold: Math.log(1 / alpha), increment: opts.increment ?? gInc,
  };
}

/** Ingest ONE believed-null residual: multiply it into the calibration test martingale and revoke
 *  (sticky) if W has ever crossed 1/alpha. Mutates and returns the state. */
export function updateCalibration(state: CalibrationMonitorState, r: number): CalibrationMonitorState {
  const g = state.increment(r);
  // log-space update; g ≥ 0. A zero increment would send logW → −∞; clamp to a tiny floor so a single
  // unlucky tick cannot permanently sink the martingale (it only ever makes revocation HARDER, which is
  // conservative for the false-revocation guarantee).
  state.logW += Math.log(Math.max(g, 1e-300));
  if (state.logW > state.peakLogW) state.peakLogW = state.logW;
  state.ticks++;
  if (state.peakLogW >= state.threshold) state.passing = false;
  return state;
}

/** Ingest a batch of believed-null residuals in order. */
export function updateCalibrationBatch(state: CalibrationMonitorState, rs: ReadonlyArray<number>): CalibrationMonitorState {
  for (const r of rs) updateCalibration(state, r);
  return state;
}

export interface CalibrationVerdict {
  passing: boolean;
  ticks: number;
  /** evidence-so-far against calibration as an e-value (exp of the running-max log martingale). */
  eValue: number;
  /** the 1/alpha e-value at which the monitor revokes. */
  revokeAt: number;
}

/** The monitor's verdict (does NOT mutate). */
export function calibrationVerdict(state: CalibrationMonitorState): CalibrationVerdict {
  return {
    passing: state.passing,
    ticks: state.ticks,
    eValue: Math.exp(Math.min(state.peakLogW, 700)), // clamp exp to avoid Infinity in the report
    revokeAt: Math.exp(Math.min(state.threshold, 700)),
  };
}

/** Run the calibration monitor over a stream of believed-null REFERENCE residuals (a concurrent control
 *  cohort in Mode B; a believed-healthy reference otherwise — the CALLER owns choosing a genuinely-null
 *  feed, exactly as the prefix-audit NO-GO requires) and return the contract with
 *  `calibrationMonitorPassing` set from the monitor. For a `construction_valid` emitter this is what
 *  keeps it Mode B (passing) or demotes it B→A (revoked); for other classes the mode is unchanged but
 *  the monitor still reports.
 *
 *  `referenceNullResiduals` may be a single concatenated stream or several streams (e.g. one per control
 *  shard) — they are ingested in order into one shared martingale (pooling across the cohort gives the
 *  test power that a short per-shard prefix lacks). */
export function applyCalibrationMonitor(
  contract: EmitterContract,
  referenceNullResiduals: ReadonlyArray<number> | ReadonlyArray<ReadonlyArray<number>>,
  opts: CalibrationMonitorOptions = {},
): { contract: EmitterContract; monitor: CalibrationMonitorState; verdict: CalibrationVerdict } {
  const monitor = freshCalibrationMonitor(opts);
  const streams: ReadonlyArray<ReadonlyArray<number>> =
    Array.isArray(referenceNullResiduals[0])
      ? (referenceNullResiduals as ReadonlyArray<ReadonlyArray<number>>)
      : [referenceNullResiduals as ReadonlyArray<number>];
  for (const s of streams) updateCalibrationBatch(monitor, s);
  return {
    contract: { ...contract, calibrationMonitorPassing: monitor.passing },
    monitor,
    verdict: calibrationVerdict(monitor),
  };
}
