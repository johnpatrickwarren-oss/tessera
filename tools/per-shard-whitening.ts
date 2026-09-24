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

// ── Served by the engine since engine v0.6.12-pre (Tessera ADR 0030, engine ADR 0033 step 2) ──
//
// `estimateAr1` and `whiten` were ported into the engine's per-shard/contrast.ts line for line as
// `estimateContrastAr1` / `whitenContrast` (engine ADR 0032) and held in lockstep by the engine's
// test/contrast.test.ts. Verified body-identical again on 2026-09-23 before this file became a
// re-export. The names here are unchanged so every caller path and every citation stays valid.
export {
  estimateContrastAr1 as estimateAr1,
  whitenContrast as whiten,
  type ContrastAr1Fit as Ar1Fit,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/contrast';
