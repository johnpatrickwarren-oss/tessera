# Tessera — MIT Supercloud FP-at-scale (static vs adaptive baseline)

Tessera's per-shard detector on REAL MIT Supercloud GPU telemetry (nvidia-smi @100ms), observe-only. **No GPU-fault labels → every fire is a false alarm**, so this is a pure false-alarm (null) calibration. `static` = single baseline from the first 15%; `adaptive` = trailing-window recalibration (gap #2, regime-aware).

> **Scope:** per-shard NUMERIC FP calibration on a real GPU fleet sample. NOT detection (no faults) and NOT topology/fleet. On a null dataset adaptive baselining has no anomalies to mask; on labeled data it would risk masking slow drifts (a tradeoff to measure later).

Files: 11 per-job GPU traces. α=0.01; adaptive window=500, recal every 100.

| metric | static FP/1k | adaptive FP/1k | shards |
|---|---|---|---|
| utilization_gpu_pct | 5.07 | 0.141 | 12 |
| temperature_gpu | 28.471 | 5.204 | 12 |
| power_draw_W | 5.318 | 2.35 | 12 |

**Overall:** static 12.953/1k vs adaptive 2.565/1k across 36 shards. Adaptive (regime-aware) baselining reduces false alarms — the gap #2 question, answered on real fleet telemetry. Deterministic; byte-identical on re-run.
