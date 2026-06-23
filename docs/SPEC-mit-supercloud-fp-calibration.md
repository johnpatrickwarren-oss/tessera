# Spec — MIT Supercloud FP-at-scale + regime-aware baselining (gap #2)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** NAB and GWDG both showed Tessera's static-baseline detector over-fires on real
  telemetry (~1–3% FP). MIT Supercloud is real GPU fleet telemetry (nvidia-smi @100ms) with **no
  GPU-fault labels** — every fire is a false alarm — i.e. a clean fleet-scale **null calibration**
  substrate. Use it to (1) measure FP at scale, and (2) test gap #2: does an **adaptive
  (regime-aware) baseline** cut the over-firing?

## Deliverables
- **D1 — `tools/_mit-supercloud-loader.ts`**: parse per-job GPU CSVs (`timestamp,gpu_index,…,
  temperature_gpu,…,power_draw_W,…`, epoch-seconds @100ms) → per-(job,gpu,metric) `NabTrace`
  (windows empty: no faults → all normal).
- **D2 — `tools/mit-replay.ts`** (`pnpm mit-replay <dir>`): for each shard×metric, measure FP with a
  **static** baseline (`replayFires`) vs an **adaptive** baseline (`replayFiresAdaptive`: recompute
  `(mean,σ²,φ)` from a trailing window every N ticks), reusing the shadow-replay scoring core; report
  static-vs-adaptive FP/1k per metric.

## Acceptance criteria
- **AC-1** Loader pivots per-job GPU CSV to per-(gpu,metric) traces (epoch-sec→ms), `windows=[]`,
  `is_anomaly` all false; skips series < 200 samples.
- **AC-2** `replayFiresAdaptive` recalibrates from a trailing window (regime-aware), restart-on-fire,
  reusing `calibrateBaseline`.
- **AC-3** Report measures FP (= all fires, since no labels) per metric for static and adaptive, and
  states the overall direction — honestly, including the null-dataset caveat (adaptive has no
  anomalies to mask here; on labeled data it would risk masking slow drifts).
- **AC-4** Deterministic / byte-idempotent. Tests cover the loader + the gap-#2 mechanism (adaptive
  fires less than static on a sustained regime shift; neither fires on a flat series). ADR + STATE.

## Anti-scope
- **AS-1** No detection / fault validation (MIT has no GPU-fault labels) — this is FP/null only.
- **AS-2** No topology / fleet-FDR (per-job GPU telemetry, no coupled fabric).
- **AS-3** `replayFiresAdaptive` is a gap-#2 **prototype** scoped to this harness — not yet promoted
  into the engine/production detector (its drift-masking tradeoff must be measured on labeled data
  first).
- **AS-4** A sample of per-job GPU files (the full set is ~42 GB); not the whole fleet.
