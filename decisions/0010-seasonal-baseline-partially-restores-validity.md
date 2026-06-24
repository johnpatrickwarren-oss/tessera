# ADR 0010 — a seasonal (2D) baseline partially restores validity; the residual is legitimate workload variation

- **Status:** Accepted (continues ADR 0009; tests the operator's 2D-baseline model)
- **Date:** 2026-06-23

## Context

ADR 0009: a long FLAT baseline still over-fires on real telemetry because streams vary WITHIN the
window. The operator's model uses a fixed-calendar-period 2D baseline (day × time-of-day) to capture
that structure. `tools/seasonal-power.ts` tests it on real GWDG `GPU_UTIL` (a daily-cycle load metric),
comparing flat vs fixed-daily-period seasonal vs ACF-auto-detected seasonal, by realized FP on healthy
streams.

## Finding

P(fire) is the **first-crossing** rate (Ville / production: did the e-process ever cross 1/α in the
horizon, restart-on-fire — corrected from terminal-e-value in review):

| baseline | P(fire) | honors α? |
|---|---|---|
| flat (ADR 0009) | 56.7% | ❌ |
| **seasonal · fixed daily (P=144) — the operator's model** | **43.3%** | ❌ |
| seasonal · ACF auto-period | 56.7% | ❌ |

- **The operator's fixed daily-period 2D baseline genuinely helps: 56.7% → 43.3%** (~⅓ fewer false
  alarms) — it captures real within-window structure a flat mean misses.
- **The engine's ACF auto-detection does NOT help in aggregate (56.7%) and is HARMFUL where it fires:**
  on the 50/60 streams where it detected a (short) period it fired 64% — *worse* than flat — because
  its first ACF peak is short-range autocorrelation (periods 10–25), not the daily cycle (144), and
  deseasonalizing a spurious period contaminates the residual. So a *fixed calendar period* (the
  operator's approach) is not just better but ACF auto-detection actively hurts; whitening (not seasonal
  decomposition) is the right tool for short-range AR structure.
- **But it does not reach ≤ α.** The residual over-firing is **workload-driven, non-periodic**: GPU_UTIL
  legitimately swings as jobs start/stop, and within the baseline window those level shifts contaminate
  the per-phase seasonal-mean estimates themselves. No single-shard baseline (flat, seasonal, or
  otherwise) can remove a *real* level change — it is not estimation error and not seasonality.

## Decision

The seasonal 2D baseline is a real, partial improvement and the right richer-baseline choice (fixed
calendar period, not ACF auto-detection). It does not, by itself, deliver a per-shard FP guarantee on
workload-driven metrics, because part of the within-window variation is **legitimate workload change,
not a fault** — the genuinely hard, irreducible-at-the-single-shard-level problem.

## Why — and where the residual goes

- **Chosen (fixed-period seasonal as the baseline; not ACF-auto)** — measured: fixed-daily helps, auto
  doesn't.
- **The residual (legitimate workload variation) is an operational + fleet problem, not a baseline one:**
  - **operational lifecycle** — drift/level-shift triggers re-record → shadow → cutover, so a sustained
    legitimate shift becomes a new baseline epoch rather than a sustained alarm (the operator's model);
  - **fleet-relative comparison** — other GPUs running similar workloads act as controls, so a
    shard-specific failure stands out from fleet-wide workload swings (note: fleet-relative e-BH still
    needs a valid e-value per ADR 0008 — the nuisance-baseline issue compounds here).

## Consequences

- The whole arc converges: **m≫n** (ADR 0009) removes estimation error; the **fixed seasonal 2D
  baseline** (this ADR) removes periodic within-window structure; the **operational lifecycle + fleet**
  must handle legitimate workload change. Each piece of the operator's model addresses a distinct,
  measured component — none alone gives a clean per-shard guarantee on workload-driven signals.
- Honest claim unchanged: strong detection; calibrated per-shard error control is bounded by legitimate
  non-stationarity, mitigated (not eliminated) by richer baselines + operational refresh.

## Ruled out / gotchas

- Single metric (GPU_UTIL, workload-driven by nature) / single dataset; a more stable seasonal metric
  (e.g. ambient/thermal) might deseasonalize more cleanly. The qualitative split (seasonal helps
  partially; workload residual remains) is the load-bearing result.
- ACF auto-detection finding short periods is a property of load metrics' autocorrelation; whitening
  (not seasonal decomposition) is the right tool for short-range AR structure.
