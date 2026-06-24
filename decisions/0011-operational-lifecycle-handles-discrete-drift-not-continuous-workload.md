# ADR 0011 — the operational lifecycle beats static AND adaptive on discrete drift; continuous workload needs the fleet

- **Status:** Accepted (builds the operator's lifecycle; addresses the ADR 0009/0010 residual)
- **Date:** 2026-06-23

## Context

ADR 0009/0010 left the residual over-firing (cross-epoch drift + legitimate workload change) to the
operator's lifecycle: detect drift → re-record → shadow → cutover. `tools/lifecycle-monitor.ts` builds
and measures it against static (ADR 0009) and continuous-adaptive (ADR 0006).

First, a negative that shaped the design: **the per-fire drift-vs-fault discriminator does NOT work** —
slow drift and sharp faults fire with the same run-length (median ~9), because once a drift is
established it re-fires as fast as a fault. So the drift trigger must be EPOCH-level: a sustained high
**alarm rate** ⇒ baseline stale ⇒ re-record.

## Finding (synthetic ground truth, 80 trials, α=0.01)

| scenario | static | adaptive | **lifecycle** |
|---|---|---|---|
| slow drift (no fault) — FP | 154 alarms | 35 | **51** |
| sharp fault — detection | 100% | 100% | **100%** |
| **slow fault (adaptive's masking zone) — detection** | 70% | **28% (masks)** | **70%** |
| continuous workload (no fault) — FP | 116 alarms | 15 | **21** |

- **Drift FP:** the lifecycle re-records the stale baseline → ~3× fewer false alarms than static
  (toward adaptive) — *without* continuous adaptation.
- **The needle:** on a SLOW fault (slope inside adaptive's masking zone), **adaptive masks (28%) but the
  lifecycle keeps 70% = static.** A slow fault's *occasional* alarms don't trip the rate trigger (it
  barely re-records), so the lifecycle stays static-like and detects what adaptive adapts away. This is
  the value the lifecycle adds over continuous adaptation (ADR 0006).
- **The limit:** on CONTINUOUS within-epoch workload variability, the alarm rate is permanently high, so
  the lifecycle re-records constantly and collapses toward adaptive (and would then mask). A single-shard
  lifecycle cannot separate legitimate continuous change from faults.

## Decision

Adopt the lifecycle (alarm-rate-triggered re-record + shadow→cutover) as the handler for **discrete
cross-epoch drift** — it dominates both static (far fewer drift false alarms) and adaptive (retains
slow-fault detection adaptive masks). It is the third complementary piece of the operator's model:
m≫n (ADR 0009) for estimation error, the seasonal 2D baseline (ADR 0010) for periodic structure, and
the lifecycle for discrete drift.

## Why — and the boundary

- **Chosen (epoch-level rate trigger, not per-fire)** — the per-fire run-length discriminator is
  empirically useless (verified); the alarm rate is the available drift signal.
- **The residual (continuous within-epoch workload variability) is NOT solved here** and is irreducible
  at the single-shard level: distinguishing a fleet-wide workload swing from a shard-specific fault
  needs the **fleet** (shard-specific vs fleet-wide concordance) — which in turn needs the
  nuisance-baseline-robust e-value (ADR 0008) for fleet e-BH to control FDR.

## Consequences

- The operator's full model is now validated piece-by-piece on its applicable regime; the one remaining
  open lever is fleet-relative comparison + the valid e-value (ADR 0008).
- Shadow→cutover's validation oracle (is a candidate baseline healthy?) is modeled as immediate cutover;
  the real oracle is operator/fleet — the same external signal the continuous-workload case needs.

## Ruled out / gotchas

- Synthetic ground truth (FP/detection need labels); the continuous-workload limit was already shown on
  REAL data in ADR 0010 (GPU_UTIL). The slow-fault slope (0.004) is chosen inside adaptive's masking
  zone (ADR 0006) to make the needle visible; at faster slopes all three detect.
