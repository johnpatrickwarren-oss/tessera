// tools/ui-scale-evalue.ts — a universal-inference SCALE-change e-value (the variance/magnitude dual of
// the engine's mean-shift UI e-value, ADR 0010). E[e|H0] ≤ 1 BY CONSTRUCTION, no tuning.
//
// WHY. The metric router's INTEGRATED path differences an I(1) counter to restore a valid (white) null,
// then needs a detector whose score is a VALID e-value so e-BH controls the aggregate FDR. A step fault
// on a random walk becomes onset/offset IMPULSES in the differenced series — i.e. a test-window VARIANCE
// inflation, not a mean shift. So we need a scale-change e-value. (tools/metric-router.ts previously used
// a raw magnitude SCORE, which is not an e-value → e-BH over-selects → FDP→1; this replaces it.)
//
// CONSTRUCTION (mirrors universalInferenceMeanShiftEValue, but tests σ instead of μ; iid Gaussian, since
// the differenced common-mode residual is white). Split the calibration and test windows each in time at
// their midpoint into a TRAIN half and an EVAL half.
//   • ALT params from TRAIN: a shared mean μ̂ and SEPARATE scales σ̂_cal, σ̂_test (the alternative — the
//     scale changed between cal and test).
//   • NULL params = the H0 MLE ON EVAL: a shared mean and a COMMON scale across both eval halves (the
//     null — one scale). This is a genuine sup (the exact Gaussian MLE), which is what makes e valid.
//   • e = exp( ℓ_alt(EVAL) − ℓ_null(EVAL) ), each eval half scored under its ALT scale vs the common null.
//
// VALIDITY (E[e|H0] ≤ 1). e = L(EVAL; θ̂_train) / sup_{θ∈H0} L(EVAL; θ). The eval halves are independent
// of the train halves (iid), so θ̂_train (a function of TRAIN) is ⟂ EVAL and L(EVAL; θ̂_train) is a proper
// conditional density; the denominator is the null SUP, hence ≥ L(EVAL; θ_0^true). Therefore
// E[e|H0] ≤ E[ L(EVAL; θ̂_train) / L(EVAL; θ_0^true) ] = 1. No assumption on the scale value (scale-
// invariant). The null MUST be a genuine sup (the closed-form Gaussian MLE secures it).
//
// ENVELOPE. Exact validity needs the iid-Gaussian null to contain the truth — feed it the WHITENED
// (differenced + common-mode-removed) residual, not raw telemetry. Two-sided in scale (fires on inflation
// AND collapse); for our impulse fault, inflation dominates. Power is diluted when a transient is a small
// fraction of the test window (the same dilution the e-detector mixture addresses for the mean case — an
// onset-mixture scale e-detector is the natural extension). Tessera-original; NOT vendored; prototype.

import type { Window } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/safe-t-e-value';

/** Innovation-variance floor (guards a degenerate constant segment). */
const VAR_FLOOR = 1e-9;

/** Σ (x_i − μ)² over [i0, i1). */
function sumSq(values: ReadonlyArray<number>, i0: number, i1: number, mu: number): number {
  let s = 0; for (let i = i0; i < i1; i++) { const d = values[i] - mu; s += d * d; }
  return s;
}
/** Gaussian log-likelihood of [i0, i1) under N(μ, s2). */
function logLik(values: ReadonlyArray<number>, i0: number, i1: number, mu: number, s2: number): number {
  const n = i1 - i0;
  return -0.5 * n * Math.log(2 * Math.PI * s2) - sumSq(values, i0, i1, mu) / (2 * s2);
}

/** Universal-inference SCALE-change e-value between a calibration window and a test window of an iid
 *  (whitened) series `values`. E[e|H0] ≤ 1 by construction (see header). Each window is split in time at
 *  its midpoint; the alternative (separate cal/test scales) is fit on the train halves, the null (common
 *  scale) MLE on the eval halves, and the e-value is the likelihood ratio on the eval halves.
 *
 *  @throws RangeError if windows are out of bounds, `cal.len < 4`, or `test.len < 4` (each needs ≥ 2
 *    points per train/eval half), or any in-window value is non-finite. */
export function universalInferenceScaleEValue(values: ReadonlyArray<number>, cal: Window, test: Window): number {
  validateScaleWindows(values, cal, test);
  const a0 = cal.start, n1 = cal.len, b0 = test.start, n2 = test.len;
  const h1 = n1 >> 1, h2 = n2 >> 1;
  // TRAIN halves: [a0, a0+h1), [b0, b0+h2).  EVAL halves: [a0+h1, a0+n1), [b0+h2, b0+n2).
  const cTrain0 = a0, cTrain1 = a0 + h1, cEval0 = a0 + h1, cEval1 = a0 + n1;
  const tTrain0 = b0, tTrain1 = b0 + h2, tEval0 = b0 + h2, tEval1 = b0 + n2;

  // ALT: shared mean over both train halves; separate cal/test scales from their train halves.
  const muAlt = (sumOver(values, cTrain0, cTrain1) + sumOver(values, tTrain0, tTrain1)) / ((cTrain1 - cTrain0) + (tTrain1 - tTrain0));
  const s2Cal = Math.max(sumSq(values, cTrain0, cTrain1, muAlt) / (cTrain1 - cTrain0), VAR_FLOOR);
  const s2Test = Math.max(sumSq(values, tTrain0, tTrain1, muAlt) / (tTrain1 - tTrain0), VAR_FLOOR);

  // NULL (sup): shared mean + COMMON scale, MLE over both eval halves.
  const nEval = (cEval1 - cEval0) + (tEval1 - tEval0);
  const muNull = (sumOver(values, cEval0, cEval1) + sumOver(values, tEval0, tEval1)) / nEval;
  const s2Null = Math.max((sumSq(values, cEval0, cEval1, muNull) + sumSq(values, tEval0, tEval1, muNull)) / nEval, VAR_FLOOR);

  const llAlt = logLik(values, cEval0, cEval1, muAlt, s2Cal) + logLik(values, tEval0, tEval1, muAlt, s2Test);
  const llNull = logLik(values, cEval0, cEval1, muNull, s2Null) + logLik(values, tEval0, tEval1, muNull, s2Null);
  return Math.exp(llAlt - llNull);
}

function sumOver(values: ReadonlyArray<number>, i0: number, i1: number): number {
  let s = 0; for (let i = i0; i < i1; i++) s += values[i];
  return s;
}

/** Validate the two windows (integers, length ≥ 4, in bounds, finite). @throws RangeError. */
function validateScaleWindows(values: ReadonlyArray<number>, cal: Window, test: Window): void {
  const ints = Number.isInteger(cal.start) && Number.isInteger(cal.len) && Number.isInteger(test.start) && Number.isInteger(test.len);
  if (!ints) throw new RangeError('universalInferenceScaleEValue: window start/len must be integers');
  if (cal.len < 4) throw new RangeError(`universalInferenceScaleEValue: cal.len must be >= 4; got ${cal.len}`);
  if (test.len < 4) throw new RangeError(`universalInferenceScaleEValue: test.len must be >= 4; got ${test.len}`);
  const inBounds = cal.start >= 0 && cal.start + cal.len <= values.length && test.start >= 0 && test.start + test.len <= values.length;
  if (!inBounds) throw new RangeError(`universalInferenceScaleEValue: window out of bounds (len=${values.length})`);
  assertFinite(values, cal.start, cal.start + cal.len, 'cal');
  assertFinite(values, test.start, test.start + test.len, 'test');
}
function assertFinite(values: ReadonlyArray<number>, i0: number, i1: number, label: string): void {
  for (let i = i0; i < i1; i++) if (!Number.isFinite(values[i])) throw new RangeError(`non-finite value at ${label} index ${i}`);
}
