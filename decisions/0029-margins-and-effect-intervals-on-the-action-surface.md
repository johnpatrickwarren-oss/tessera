# ADR 0029 — e-BH margins and e-BY effect intervals on the Mode-B action surface

- **Date:** 2026-09-03
- **Status:** PROPOSED, gated on study `2026-09-action-surface`
  (`research/2026-09-action-surface/PREREGISTRATION.md` §4); the results append records the outcome.
- **Builds on:** ADR 0019 (the Mode-B loop and its calibration gate), ADR 0025 (proof-carrying
  e-values and the certified e-BH entry point), ADR 0027 (the 'gaussian' increment the monitors
  test), ADR 0028 (the engine calibration monitor); engine ADR 0027 (`log_threshold_e`,
  `log_margin`), engine ADR 0030 (`fleet/e-by.ts`, the level-free confidence sequence);
  tessera-rng ADR-0066/0067 (the same two fields on its fleet surface); knowledge
  `stats/e-by-surface-2026-09-03`, `stats/e-by-fcr-2026-09-03`, `stats/ramdas-wang-2025` §4, §7.

## Problem

The loop dispatches a shard with `{emitter, shard, cycle, eValue, q}` and the audit sink records
the same. A reader of the action or the trail cannot see how far the shard sat from the e-BH
threshold nor how large the shift behind the dispatch is. Both are available: the engine's e-BH
already returns the threshold and per-input margins, and the standardized residual window the
seam already computes carries the level-free inputs of a confidence sequence.

## Decision

1. `CertifiedSelection` carries `logThresholdE` and `logMargins` from the engine output it already
   has. DIAGNOSTIC (Proposition 9.12): a margin ≥ 0 means selected in THIS cycle; the threshold
   moves with K; no claim beyond the selection's FDR.
2. `EmitterCycle.csInputs?` (per shard `{S_t, t} | null`, aligned with `shards`): the seam fills it
   from `applyContrast(d, fit)` when a baseline fit was used, `null` when it self-fitted (a self-fit
   centers on the window's own median, so an interval would be degenerate).
3. The loop computes, for the discovered shards that carry inputs, e-BY intervals at
   `α_i = fcrDelta·|S'|/K` (`K = shards.length`, `fcrDelta` defaults to `q`,
   `ρ = CS_SIGMA_SQUARED_PRIOR = 1`) through the engine's `eBenjaminiYekutieli`, and puts
   `logMargin`, `logThresholdE` and `effect` on the `FleetAction`; `EmitterReport` gains
   `logThresholdE`; the audit sink writes the fields when present.
4. Nothing else moves. Selection, α, the Mode gate, reconcile, sink effects, demo bundles: unchanged.
   A cycle without `csInputs` yields actions and records byte-identical to today's.

## What the interval means, and its premise

The window-mean contrast shift from the baseline fit, in standardized units, over this cycle's
window — not the post-onset shift the SR onset mixture detects. Under a constant contrast shift
Δ the residual shift is `Δ/scale` on the first tick and `Δ(1−φ)/scale` after (the whitening). Its
premise — an un-shifted residual is conditionally mean-zero sub-Gaussian(1) — is exactly what
the per-shard 'gaussian' calibration monitors test on the known-null cohort, so the interval is
licensed by the same gate that licenses the dispatch and vanishes with it. FCR ≤ fcrDelta holds
for any selection rule under any dependence (Theorem 13.7) given that premise.

## Anti-scope

Cross-cycle accumulation (the loop's running e-value is one e-process across cycles; the CS here
is per window); the 'bounded' increment kind (no CS is built for it here); clustersynth
harnesses, which call the engine's e-BH directly under `anchor:allow` and are not on this path.

## Results append

(Filled after the registered run.)
