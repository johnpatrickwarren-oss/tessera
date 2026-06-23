// tools/per-shard-whitening.ts — Tessera-side AR(1) pre-whitening for the per-shard
// betting e-process. See docs/SPEC-per-shard-validity-under-autocorrelation.md.
//
// WHY: the engine's betting e-process is a valid test martingale only when the
// standardized observation z_t is a martingale difference under H0 — i.e. when
// observations are temporally independent. Real GPU counter telemetry is
// autocorrelated; empirically (coverage-matrices/calibration-envelope.md) that
// breaks E[e|H0] <= 1 and inflates type-I error up to ~176x. Transforming raw
// observations x_t into AR(1) innovations r_t = x_t - phi*x_{t-1} restores the
// martingale-difference property under the AR(1) null, so the UNMODIFIED engine
// (updateBettingState) regains its Ville guarantee.
//
// ROLE (post engine >= 0.3.3-pre): the ENGINE now applies AR(1) pre-whitening
// internally on the betting path (updateBettingState's ar1Phi parameter consumes
// a stamped per-signal phi). This module is therefore the CALIBRATION + REFERENCE
// side, not a runtime transform:
//   - estimateAr1: a bias-corrected (Kendall) phi estimator. `tools/calibration-
//     envelope.ts` uses it to produce the `phi` it passes to the engine. The
//     engine's own Yule-Walker calibrator omits the bias correction; adopting it
//     upstream is a recommended future engine change.
//   - whiten: the reference closed form of the transform the engine applies
//     internally (x_centered - phi*x_{t-1,centered}); kept for documentation and
//     unit-level parity, not called on the runtime path.
// It does NOT modify the vendored engine package (A12 vendored-at-pin).
//
// Anti-scope: AR(1) only (no AR(p>1) / seasonal). The near-unit-root regime
// (phi -> 1) leaves residual autocorrelation and is a documented limitation
// (see decisions/0001-pre-whitening-over-rho-stamped-threshold.md, ruled-out).
//
// Tessera-original code. NOT vendored.

/** Result of fitting an AR(1) model to a baseline sample. */
export interface Ar1Fit {
  /** Bias-corrected lag-1 autoregressive coefficient. */
  phi: number;
  /** Innovation (residual) variance of x_t - phi*x_{t-1} on the baseline — i.e.
   *  ~ sigma^2_marginal * (1 - phi^2). This IS the quantity production passes as the
   *  engine's `sigmaSquared` when `ar1_phi` is set: fit-production-substrate stamps
   *  `baseline_sigma_squared = innovation variance`, and updateBettingState
   *  standardizes the whitened residual against it. (Passing the raw MARGINAL
   *  variance instead would over-scale and over-conservatize z — see ADR 0001.) */
  sigma2: number;
}

/**
 * Estimate an AR(1) coefficient + innovation variance from a held-out baseline
 * sample, with the Kendall median-unbiased small-sample correction applied.
 *
 * OLS lag-1 autocorrelation is biased downward by approximately (1+3*phi)/n;
 * under-estimating phi leaves residual autocorrelation after whitening, which
 * re-inflates type-I error at high phi. The correction phi* = phi_ols +
 * (1+3*phi_ols)/n removes the leading-order bias.
 *
 * Pure: does not mutate `samples`. Degenerate inputs (n < 2, zero variance)
 * return phi=0 (whitening becomes identity) and sigma2 = sample variance.
 */
export function estimateAr1(samples: ReadonlyArray<number>): Ar1Fit {
  const n = samples.length;
  if (n < 2) {
    return { phi: 0, sigma2: n === 1 ? 0 : 1 };
  }
  let mean = 0;
  for (const v of samples) mean += v;
  mean /= n;

  let num = 0;
  let den = 0;
  for (let i = 1; i < n; i++) num += (samples[i] - mean) * (samples[i - 1] - mean);
  for (let i = 0; i < n; i++) den += (samples[i] - mean) * (samples[i] - mean);

  // Zero-variance baseline: no autocorrelation structure to remove — identity whitening.
  if (!(den > 0)) return { phi: 0, sigma2: 1 };

  const phiOls = num / den;
  // Kendall median-unbiased AR(1) small-sample correction.
  let phi = phiOls + (1 + 3 * phiOls) / n;
  // Clamp to the stationary region; a phi at/above 1 is non-stationary and the
  // residual would no longer be a valid whitening target.
  if (phi >= 1) phi = 0.999;
  if (phi <= -1) phi = -0.999;

  // Innovation variance of the whitened baseline.
  let rss = 0;
  for (let i = 1; i < n; i++) {
    const r = (samples[i] - mean) - phi * (samples[i - 1] - mean);
    rss += r * r;
  }
  const sigma2 = n > 1 ? rss / (n - 1) : 1;
  return { phi, sigma2: sigma2 > 0 ? sigma2 : 1 };
}

/**
 * Whiten a single observation: return the AR(1) innovation x_t - phi*x_{t-1}.
 *
 * At the start of a stream there is no prior observation to difference against,
 * so `xPrev === null` returns `x` unchanged. Pure.
 */
export function whiten(x: number, xPrev: number | null, phi: number): number {
  return xPrev === null ? x : x - phi * xPrev;
}
