# Tessera — does a SEASONAL (2D) baseline restore the FP guarantee on real telemetry?

ADR 0009: a long FLAT baseline still over-fires on real data (within-window variation). The operator's model is a fixed-calendar-period 2D baseline. On real GWDG `DCGM_FI_DEV_GPU_UTIL` (daily-cycle load metric) we compare FLAT vs **fixed daily-period** seasonal (P=144, the operator's model) vs ACF-auto-detected seasonal. Calibrated on [0,m) only; all healthy → every fire is a false alarm. m=800, n=200, α=0.01.

60 real per-GPU streams; the ACF auto-detector found a period in 50/60.

| baseline | fires | P(fire) | honors α? |
|---|---|---|---|
| flat (ADR 0009) | 29/60 | 48.3% | ❌ |
| seasonal · fixed daily (P=144) | 19/60 | 31.7% | ❌ |
| seasonal · ACF auto-period | 29/60 | 48.3% | ❌ |

**Partial — the seasonal baseline helps but does not reach ≤ α** (48.3% → 31.7%). Daily seasonality is part of the within-window variation, but the residual over-firing is **workload-driven, non-periodic** change (jobs starting/stopping move GPU_UTIL by real amounts) — not removable by ANY single-shard baseline. That residual is what the operational lifecycle (drift-triggered re-record → shadow → cutover) and fleet-relative comparison (other GPUs as controls) are for.

> **Reading this honestly:** GPU_UTIL is workload-driven, so much of its within-window variation is *legitimate* (a running job is not a fault). This experiment separates the variation into seasonal (a fixed baseline can absorb) vs workload/drift (only operational refresh + fleet-relative can). It does NOT by itself validate or refute the operator model — it locates where the remaining problem lives: distinguishing legitimate workload change from failure, which is an operational + fleet question, not a single-shard-baseline question.
