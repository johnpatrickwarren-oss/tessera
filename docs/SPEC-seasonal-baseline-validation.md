# Spec — seasonal-baseline validation (does a 2D baseline restore the FP guarantee?)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0009 showed a long FLAT baseline still over-fires on real telemetry (within-window
  variation). The operator's model is a fixed-calendar-period 2D baseline (day-of-week × time-of-day).
  Test whether capturing that structure restores E[e]≤1 / FP≤α on a real seasonal metric.

## Deliverables
- **D1 — `tools/seasonal-power.ts`** (`pnpm seasonal-power <gwdg-dir>`): on real GWDG `GPU_UTIL`
  (daily-cycle load metric), compare three baselines — FLAT (ADR 0009), **fixed daily-period seasonal**
  (the operator's 2D model: `seasonalMeans` on [0,m) + `deseasonalize`), and ACF-auto-detected seasonal
  (engine `decomposeSeasonal`) — by realized FP on healthy streams (every fire = false alarm).

## Acceptance criteria
- **AC-1** Seasonal baselines calibrate on [0,m) only (no lookahead); deseasonalize the bounded horizon
  [m, m+n) using the [0,m) per-phase means.
- **AC-2** The fixed daily period (P=144 @10-min) is the operator's model; the ACF-auto arm is reported
  for contrast (it finds short-range autocorrelation, not the daily cycle).
- **AC-3** Report states honestly whether the seasonal baseline restores FP≤α; if only partial,
  attributes the residual to workload-driven (non-periodic) variation — an operational/fleet concern,
  not a single-shard-baseline one.
- **AC-4** Deterministic / byte-idempotent. Tests pin the deseasonalize mechanism (fixed-period
  seasonal ≪ flat on a seasonal high-phase window; valid residual) + ACF-auto period-0 fallback.
  ADR 0010 + STATE.

## Anti-scope
- **AS-1** No engine change.
- **AS-2** Healthy streams only (FP); single metric (GPU_UTIL) / dataset (GWDG).
- **AS-3** Does not implement the operational lifecycle (re-record → shadow → cutover) or fleet-relative
  comparison — those are where the residual (legitimate workload variation) is addressed; this only
  measures how much of the over-firing the seasonal baseline removes.
