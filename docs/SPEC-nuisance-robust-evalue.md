# Spec — nuisance-baseline-robust e-value (the ADR 0008 fix)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0008 identified the plug-in baseline as the root cause of e-value invalidity (E[e|H0]≫1)
  that no baseline/fleet engineering fixed. Build an e-value that integrates the unknown baseline OUT
  and measure whether it is valid where the plug-in fails, while retaining detection.

## Deliverables
- **D1 — `tools/nuisance-robust-evalue.ts`** (`pnpm evalue [gwdg-dir]`): `nuisanceRobustEValue` — a
  two-sample sequential Bayes factor (separate vs common mean) on whitened residuals (whiten by AR(1)
  φ, no centering; integrate both means out under a proper N(0,τ²) prior). `pluginEValue` for the
  side-by-side. Validity report: BF vs plug-in E[e], P(fire), detection across a well-powered and an
  under-powered (plug-in-failure) regime; plus a real-GWDG terminal-e-value comparison across
  calibration sizes.

## Acceptance criteria
- **AC-1** `nuisanceRobustEValue` never freezes a point baseline (the mean is integrated out); whitening
  uses the prefix φ; recentering by the calibration mean is a common shift the BF is invariant to.
- **AC-2** The BF is valid (E[e]≤1, P(e≥1/α)≤α) in BOTH regimes including under-powered, where the
  plug-in is invalid (E[e]≫1, P(fire)≫α), AND detects a real shift (power high).
- **AC-3** Honest real-data framing: on GWDG structural the BF ≈ terminal plug-in (benign-change-
  dominated, not estimation error) — the e-value fix is decisive for *validity* but not a real-data
  silver bullet; the fair comparison is terminal-vs-terminal, NOT vs the structural ADR's first-crossing
  ~100%.
- **AC-4** Deterministic / byte-idempotent. Tests pin: valid even under-powered (vs plug-in); detects a
  shift; location-invariance (common offset → identical e-value). ADR 0013 + STATE.

## Anti-scope
- **AS-1** No engine change (a harness e-value; engine promotion is later, after the lifecycle/fleet
  integration).
- **AS-2** Does not implement BF+lifecycle integration or the contamination-robust fleet common-mode —
  it removes the e-value blocker and identifies those as the remaining composition steps.
- **AS-3** φ is plug-in (whitening); the BF handles the mean nuisance, not a misspecified φ (second order).
