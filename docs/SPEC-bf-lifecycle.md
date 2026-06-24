# Spec — BF + lifecycle integration (does the nuisance-robust e-value improve the lifecycle?)

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0013 built a nuisance-robust BF e-value; ADR 0011 the lifecycle. Test whether
  BF + lifecycle beats the EXISTING production detector + lifecycle. (Prompted by the observation that
  the production Family-A detector already IS a mixture e-value, the Howard-Ramdas Gaussian mixture
  supermartingale — so "use a mixture/BF e-value" is not itself the novelty.)

## Deliverables
- **D1 — `tools/bf-lifecycle.ts`** (`pnpm bf-lifecycle [gwdg-dir]`): windowed production mixture e-value
  (`mixWin`, delegating to the engine `computeGaussianMixtureSupermartingale`) vs windowed nuisance-robust
  BF (`bfWin`). Two components: (A) a horizon sweep — single e-value, no restart, fixed calibration,
  growing test horizon n — FP + detection for mixSM vs BF; (B) real GWDG with fresh calibration + small
  fixed test blocks (the lifecycle's small-n regime) — FP for mixSM vs BF.

## Acceptance criteria
- **AC-1** `mixWin` matches the production path (center by plug-in cal mean, whiten by cal φ, Howard-Ramdas
  Gaussian mixture); `bfWin` is the ADR 0013 two-sample BF; both over arbitrary cal/test windows, no
  lookahead (cal precedes test).
- **AC-2** Horizon sweep shows mixSM FP rises and becomes invalid (≫α) as n grows past m, while the BF
  stays ≤α; both retain detection where the window has enough points.
- **AC-3** Real-GWDG small-n (fresh-cal) blocks show mixSM ≈ BF (BF no better) — the lifecycle's regime.
- **AC-4** Honest verdict: BF and lifecycle are SUBSTITUTES (BF=valid-at-large-n; lifecycle=keep-n-small),
  so BF+lifecycle does not beat mixSM+lifecycle; the BF's niche is long-horizon/no-re-record.
- **AC-5** Deterministic / byte-idempotent. Tests pin the sweep (mixSM invalid + rising, BF valid, both
  detect) and BF location-invariance. ADR 0014 + STATE.

## Anti-scope
- **AS-1** No engine change.
- **AS-2** Part A synthetic; Part B real but FP-only (healthy). σ²_prior = innovation variance for mixSM.
- **AS-3** Not building a restart-based merged monitor — the two components establish the substitute
  relationship and the regime boundary, which is the decision-relevant result.
