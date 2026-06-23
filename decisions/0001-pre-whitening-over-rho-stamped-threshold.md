# ADR 0001 — AR(1) pre-whitening over a rho-stamped firing threshold

- **Status:** Accepted
- **Date:** 2026-06-22

## Context

The Family A betting e-process is a valid test martingale only when the standardized observation
`z_t` is a martingale difference under H0 — i.e. when observations are temporally independent. Real
GPU counter telemetry is autocorrelated. Empirical calibration against the real engine
(`coverage-matrices/calibration-envelope.md`; harness in `scratchpad/`, 2026-06-22) shows this
failing catastrophically on the **betting-e-process path** specifically: AR(1) null streams inflate
per-shard type-I error up to ~192× nominal (rho=0.95, alpha=0.005) and drive fleet e-BH FDR to ~73%
against a 5% target. Heavy tails and heteroscedasticity pass unwhitened — the bounded-z clip absorbs
them. Autocorrelation is the load-bearing failure.

**Important correction to the first draft of this ADR** (see Ruled out / gotchas): the engine is
NOT missing pre-whitening. The engine config type `FamilyAPerSignalParams` already defines
`ar1_phi` (Yule-Walker on baseline-mean-centered residuals, clipped to [-0.95, 0.95], formula
`x_pre_whitened = x_centered − phi·x_{t-1}`), it is calibrated by `tools/fit-production-substrate.ts`,
consumed at runtime by `detectors/family-a-mixture-supermartingale.ts`, `page-cusum.ts`, `ar-p.ts`,
`seasonal.ts`, and tested (`q70-slice5-prewhiten-and-spectral.test.js`). The gap is narrow and
specific: the **betting e-process detector** (`updateBettingState`) never wired up `ar1_phi`; its
only AR(1) mitigation is the per-signal `betting_sliding_buffer_threshold`.

## Decision

Restore validity by **extending the engine's existing `ar1_phi` pre-whitening to the betting
e-process path** (upstream change in `deploysignal-engine`), rather than reimplementing whitening
Tessera-side or relying on the ρ-stamped threshold. Tessera's role is the **validator**: the
`tools/per-shard-whitening.ts` primitive mirrors the engine's `ar1_phi` formula, and
`tools/calibration-envelope.ts` quantifies the betting-path failure and demonstrates that whitening
restores `FPR <= alpha`. The actual betting-path fix lands as a separate engine PR/ADR.

## Why — and why not the alternatives

- **Chosen (ar1_phi pre-whitening, upstreamed)** because it is *rho-adaptive*: one coefficient
  estimated from each shard's own baseline restores `FPR <= alpha` across the whole autocorrelation
  range (validated PASS for all rho <= 0.9 at 100% detection power), it is the approach the engine
  *already* uses for its other detectors (consistency, not novelty), and the betting path is the one
  detector left out — so the fix belongs in the engine, not bolted onto Tessera.
- **Not the rho-stamped threshold** (`betting_sliding_buffer_threshold`, the betting path's current
  AR(1) mitigation) because it is fragile to rho misspecification: a threshold calibrated at rho=0.5
  leaves 51% / 72% FPR when the true rho is 0.9 / 0.95 (measured), and produces opaque astronomically
  large thresholds (~1e17–1e25). A single stamped threshold gives no protection once real
  autocorrelation exceeds the calibration point.
- **Not a Tessera-side reimplementation** because the engine already owns `ar1_phi` + the calibrator
  + the whitening for its other detectors. Duplicating it Tessera-side (or stamping it via the
  vendored `curate-baseline-pipeline.ts`, A12 vendored-at-pin) would fork the mechanism and rot.

## Consequences

- The detection signal shape changes: a mean ramp in `x` becomes a level shift in the innovations
  (attenuated by `(1-phi)`), still detectable — confirmed at 100% power for the tested drift.
- The betting-path fix is an upstream `deploysignal-engine` change (new ADR in that repo): consume
  `ar1_phi` in `updateBettingState`/`evaluateBettingEProcess`, mirroring the mixture-supermartingale
  pattern. Tessera then picks it up on the next pinned engine bump.
- `tools/per-shard-whitening.ts` remains in Tessera as the validator's whitening implementation, not
  as a production detector path (Tessera has no live runtime).

## Ruled out / gotchas

- **rho=0.95 near-unit-root.** Lag-1 whitening cannot fully decorrelate a near-unit-root process;
  the whitened rho=0.95 row still shows mild residual inflation (~1.8× at alpha=0.01) and is
  reported, not hidden. Fixing it needs AR(p>1) order selection or a small safety margin — future
  ADR, out of scope here.
- **OLS phi is biased downward** by ~(1+3*phi)/n; under-estimating phi leaves residual
  autocorrelation and re-inflates type-I error at high rho. The Kendall median-unbiased correction
  is mandatory, not optional — verified by the A-vs-B panels in the prior `scratchpad` run.
- Whitening on a genuinely iid stream is near-identity (estimated phi ~ 0), so it does not degrade
  the already-valid case.
- **The engine already had `ar1_phi` whitening (discovered 2026-06-22, after the first draft).** The
  first draft of this ADR claimed pre-whitening was a Tessera novelty and the engine "only" had the
  fragile threshold — false. The engine pioneered `ar1_phi` for mixture-supermartingale / Page-CUSUM
  / ar-p / seasonal; it simply never wired it into the betting e-process. Halting on that
  contradiction (Anchor Discipline 3) is what redirected the decision from "Tessera-side fix" to
  "upstream the betting-path consumption into the engine." A median-unbiased estimator note: the
  engine's calibrator uses Yule-Walker; the small-sample bias correction matters most at high rho /
  short baselines and should be checked against the engine's estimator when upstreaming.
