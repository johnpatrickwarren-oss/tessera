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

// ── Heavy-tail-robust (Student-t) scale e-value ──────────────────────────────────────────────────
//
// The Gaussian scale e-value above is UNBOUNDED: its −(x−μ)²/2σ² term makes a single heavy-tailed
// outlier blow the likelihood ratio up, so on real heavy-tailed residuals (excess kurtosis ≫ 0)
// E[e|H0] explodes (≈1e5 on the differenced gpu_temp_c residual) and e-BH loses FDR control. This is
// the same catastrophe the safe-t BF had for the MEAN, which ADR 0010 fixed by dropping the fragile
// exponent. Here the fix is a HEAVIER-TAILED null model: score with a Student-t_ν density instead of a
// Gaussian. The t tail log-density grows only like −((ν+1)/2)·log(x²) for large x, so a single outlier
// contributes a BOUNDED amount to the log-LR — the e-value cannot explode. With ν small (default 4) the
// t null contains real heavy tails (ADR 0010/0011 noted robustness to t(df=4) innovations); if the truth
// is lighter-tailed it is merely conservative. Validity is the same universal-inference argument: ALT
// scales come from TRAIN (⟂ EVAL → a proper density), the NULL is a genuine t-MLE SUP on EVAL.
//
// CAVEAT (what this does and does NOT fix). It fixes the HEAVY-TAIL explosion. It does NOT fix
// HETEROSKEDASTICITY — a legitimate cal-vs-test scale difference under H0 (the second-moment
// nonstationarity) still inflates the cal-vs-test scale ratio; that needs a time-varying-variance
// baseline (standardise the residual by its baseline-expected local scale before this e-value). The two
// are orthogonal; this is the tail half.

/** Median of [i0, i1). */
function median(values: ReadonlyArray<number>, i0: number, i1: number): number {
  const s = Array.prototype.slice.call(values, i0, i1).sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Robust scale (MAD about the median / 0.6745), floored. */
function robustSigma(values: ReadonlyArray<number>, i0: number, i1: number): number {
  const med = median(values, i0, i1);
  const ad = Array.prototype.slice.call(values, i0, i1).map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  const m = ad.length >> 1;
  const mad = ad.length % 2 ? ad[m] : (ad[m - 1] + ad[m]) / 2;
  return Math.max(mad / 0.6745, Math.sqrt(VAR_FLOOR));
}
/** Student-t log-likelihood of [i0, i1) under t_ν(μ, σ), MINUS the per-point constant (which cancels in
 *  the e-value ratio since ν and the eval point count are shared). */
function tLogLikCore(values: ReadonlyArray<number>, i0: number, i1: number, mu: number, sigma: number, nu: number): number {
  let s = 0; const k = (nu + 1) / 2;
  for (let i = i0; i < i1; i++) { const d = (values[i] - mu) / sigma; s += -Math.log(sigma) - k * Math.log(1 + (d * d) / nu); }
  return s;
}
/** BOUNDED, heavy-tail-robust universal-inference SCALE-change e-value (Student-t_ν). E[e|H0] ≤ 1 by
 *  construction for the t_ν model; unlike the Gaussian version it does NOT explode on heavy-tailed
 *  residuals. See the section header for the construction, validity, and the heteroskedasticity caveat.
 *  @param nu Student-t degrees of freedom (default 4 — heavy tails). @throws RangeError as the Gaussian version. */
export function robustScaleEValue(values: ReadonlyArray<number>, cal: Window, test: Window, nu = 4): number {
  validateScaleWindows(values, cal, test);
  const a0 = cal.start, n1 = cal.len, b0 = test.start, n2 = test.len;
  const h1 = n1 >> 1, h2 = n2 >> 1;
  const cTrain0 = a0, cTrain1 = a0 + h1, cEval0 = a0 + h1, cEval1 = a0 + n1;
  const tTrain0 = b0, tTrain1 = b0 + h2, tEval0 = b0 + h2, tEval1 = b0 + n2;

  // ALT (from TRAIN, ⟂ EVAL): one shared robust center + SEPARATE cal/test robust scales.
  const muAlt = medianOfSegments(values, [[cTrain0, cTrain1], [tTrain0, tTrain1]]);
  const sCal = robustSigma(values, cTrain0, cTrain1);
  const sTest = robustSigma(values, tTrain0, tTrain1);
  // NULL (genuine sup on EVAL): joint t-MLE of one common (μ, σ) over both eval halves.
  const nul = tMLEPair(values, cEval0, cEval1, tEval0, tEval1, nu);

  const llAlt = tLogLikCore(values, cEval0, cEval1, muAlt, sCal, nu) + tLogLikCore(values, tEval0, tEval1, muAlt, sTest, nu);
  const llNull = tLogLikCore(values, cEval0, cEval1, nul.mu, nul.sigma, nu) + tLogLikCore(values, tEval0, tEval1, nul.mu, nul.sigma, nu);
  return Math.exp(llAlt - llNull);
}

/** Median over a union of disjoint segments. */
function medianOfSegments(values: ReadonlyArray<number>, segs: Array<[number, number]>): number {
  const arr: number[] = [];
  for (const [i0, i1] of segs) for (let i = i0; i < i1; i++) arr.push(values[i]);
  arr.sort((a, b) => a - b);
  const m = arr.length >> 1;
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

/** Joint t-MLE over two disjoint segments [a0,a1) ∪ [b0,b1) (the two eval halves). */
function tMLEPair(values: ReadonlyArray<number>, a0: number, a1: number, b0: number, b1: number, nu: number): { mu: number; sigma: number } {
  const n = (a1 - a0) + (b1 - b0);
  let mu = (sumOver(values, a0, a1) + sumOver(values, b0, b1)) / n;
  let sigma = Math.max(Math.sqrt((sumSq(values, a0, a1, mu) + sumSq(values, b0, b1, mu)) / n), Math.sqrt(VAR_FLOOR));
  for (let it = 0; it < 25; it++) {
    let sw = 0, swx = 0;
    for (const [i0, i1] of [[a0, a1], [b0, b1]]) for (let i = i0; i < i1; i++) { const d = (values[i] - mu) / sigma; const w = (nu + 1) / (nu + d * d); sw += w; swx += w * values[i]; }
    mu = sw > 0 ? swx / sw : mu;
    let s2 = 0;
    for (const [i0, i1] of [[a0, a1], [b0, b1]]) for (let i = i0; i < i1; i++) { const d = (values[i] - mu) / sigma; const w = (nu + 1) / (nu + d * d); s2 += w * (values[i] - mu) * (values[i] - mu); }
    sigma = Math.max(Math.sqrt(s2 / n), Math.sqrt(VAR_FLOOR));
  }
  return { mu, sigma };
}
