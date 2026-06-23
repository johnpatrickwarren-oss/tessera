# Spec — baseline-power validation (does m≫n restore the FP guarantee?)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0007/0008 concluded the per-shard e-value is invalid on real telemetry, but measured it
  with a badly under-powered baseline (calibration m≈120 vs test horizon n≈680, n/m≈5.7). The plug-in
  error scales as E[e]≈1/√(1−n/m). Test whether an adequately long baseline (m≫n) — the user's 8-week
  baseline model — restores validity, on the SAME real GWDG structural shards that fired 100%.

## Deliverables
- **D1 — `tools/baseline-power.ts`** (`pnpm baseline-power <gwdg-dir>`): `eValueWindow` (whitened
  plug-in e-value over [m, m+n)); sweep baseline window m at fixed bounded horizon n on real healthy
  structural shards; report realized FP vs α, guarding against vacuous (too-few-stream) rows.

## Acceptance criteria
- **AC-1** `eValueWindow` calibrates mean/var + AR(1) φ on [0,m), runs the betting e-process for n
  points (whitened).
- **AC-2** Sweep over `M_GRID` at fixed `N_TEST`; a row counts as evidence only with ≥ `MIN_STREAMS`
  real streams (no vacuous "✅" on empty rows — the bug caught in review).
- **AC-3** Report states honestly whether m≫n restores FP≤α on real data, and — if not — why
  (within-window drift defeats a flat long-window mean → the seasonal/2D baseline is required).
- **AC-4** Deterministic / byte-idempotent. Tests pin eValueWindow (long stationary baseline → valid;
  post-baseline persistent offset → inflated). ADR 0009 + STATE.

## Anti-scope
- **AS-1** No engine change.
- **AS-2** Flat-mean baseline only — the seasonal (2D) baseline is the NEXT experiment, not this one.
- **AS-3** Single metric / single real dataset (GWDG structural); the result is a refinement signal,
  not a fleet-wide guarantee.
