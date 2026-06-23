# ADR 0005 — regime-aware baselining cuts false alarms ~5× on real GPU telemetry (gap #2)

- **Status:** Accepted
- **Date:** 2026-06-23

## Context

Three real-data results (NAB, GWDG, and now MIT Supercloud) converged on the same finding: Tessera's
**static-baseline** numeric detector over-fires on real telemetry (~1–3% FP), driven by regime
shifts a single fixed baseline can't absorb. MIT Supercloud — real GPU fleet telemetry (nvidia-smi
@100ms, no GPU-fault labels → pure null) — is the substrate to (a) confirm this at fleet scale and
(b) test the proposed fix: an **adaptive (regime-aware) baseline** that recalibrates from a trailing
window.

## Decision / result

Ship the MIT FP-at-scale harness (`tools/_mit-supercloud-loader.ts` + `tools/mit-replay.ts`) and a
prototype adaptive replay (`replayFiresAdaptive`). On a real GPU sample (11 per-job files, 36
shard×metric, α=0.01):

| metric | static FP/1k | adaptive FP/1k | reduction |
|---|---|---|---|
| utilization_gpu_pct | 5.07 | 0.14 | ~36× |
| temperature_gpu | 28.47 | 5.20 | ~5.5× |
| power_draw_W | 5.32 | 2.35 | ~2.3× |
| **overall** | **12.95** | **2.57** | **~5×** |

**Regime-aware baselining cuts the false-alarm rate ~5× on real GPU telemetry** (~1.3% → ~0.26%).
This is the fix the NAB/GWDG over-firing pointed to, now demonstrated on real fleet data.

## Why — and why not

- **Chosen (trailing-window recalibration)** — directly targets the measured cause (regime shifts),
  reuses `calibrateBaseline`, and the real-data effect is large and consistent across metrics.
- **Not adopt it blindly into production yet** — MIT is a NULL dataset, so adaptive baselining had
  **no anomalies to mask**; its FP win here is "free." On labeled data it trades FP for the risk of
  **masking slow drifts** (the very anomalies). That tradeoff must be measured (e.g., on GWDG /
  injected drifts) before promoting it into the engine detector.

## Consequences

- Gap #2 now has an evidence-backed, sizeable fix on real data. Next: measure its **detection
  tradeoff** on labeled data (GWDG, or synthetic ramps via `calibration-envelope`) — does adaptive
  baselining keep detection while cutting FP, and at what drift-rate does it start masking? Then
  decide on upstreaming an adaptive-baseline mode to the engine.
- `replayFiresAdaptive` is a harness prototype (AS-3), not yet engine code.

## Ruled out / gotchas

- ~0.26% adaptive FP is lower but not zero; production would tune window/recal-cadence/α.
- Small sample (11 files); rerun on a larger draw before quoting as a fleet-wide figure.
- MIT has no GPU-fault labels — this is FP/null only, not detection.
