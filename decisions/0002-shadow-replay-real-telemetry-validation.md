# ADR 0002 — validate on real telemetry via NAB shadow-replay

- **Status:** Accepted
- **Date:** 2026-06-23

## Context

Every Tessera efficacy number to date was measured against data Tessera generated (synthetic
generators; `calibration-envelope`). That is the artifact→product ceiling: the detector and the
data generator share assumptions, so the numbers cannot speak to real-world behavior. Real GPU
cluster telemetry is unavailable (no cluster access). The realistic real source is **public traces**
— the Numenta Anomaly Benchmark (NAB): real operational time series with ground-truth anomaly
windows, exhibiting the exact hard structure (φ≈0.95 autocorrelation, heavy tails, regime shifts)
the whitening work targets.

## Decision

Add a **shadow-replay** harness (`tools/shadow-replay.ts`, `pnpm shadow-replay`) that runs real NAB
traces through the **production** detection path (engine `updateBettingState` with AR(1) whitening,
calibrated to mirror production: φ clipped to 0.95, innovation variance as `sigmaSquared`),
observe-only, and reports **real** calibration (false-positive rate on real quiescent data) +
detection (TP / latency on labeled anomalies), scored against ground-truth labels. A NAB ingestion
adapter (`tools/_nab-loader.ts`) is the real-telemetry intake.

## Why — and why not the alternatives

- **Chosen (NAB shadow-replay)** because it is the cheapest credible *real-data* validation
  available without a cluster: real telemetry, real labels, and the same statistical hardness our
  fixes target. It produces the honest numbers that replace "validated against synthetic fixtures."
- **Not more synthetic envelopes** — they cannot cross the artifact line; they only confirm the
  estimator on its own null.
- **Not reuse the engine's NAB tooling** — it is CLI-bin only (not importable) and produces the
  engine's internal QA score; this is the *product's* operator-facing real-data harness on the
  importable detector surface.
- **Not NAB's weighted scoring** — a plain FP-rate / detection-rate / latency report answers the
  calibration question more honestly than NAB's idiosyncratic weighting.

## Consequences — and the honest result

- **This validates the PER-SIGNAL detector only**, on real autocorrelated telemetry. It does NOT
  validate the cluster / topology / common-mode / fleet-FDR layers (no real multi-shard data), and
  NAB anomalies are operational, not GPU-SDC. The report states this boundary in its header; a green
  report must not be read as cluster-level validation.
- **First real-data numbers (36 datasets, α=0.01):** detection 29% of labeled windows; aggregate
  FP ≈ 8.9 / 1000 normal points. Honestly mixed and far more credible than the synthetic
  100%-detection tables: the detector is quiet on clean data (artificialNoAnomaly: 0 FP) and on some
  real signals, detects real failures well on others (machine_temperature 3/3, rogue_agent 2/2), but
  is **miscalibrated on real signals with non-AR(1) structure** (regime shifts / multimodality —
  e.g. rds_cpu ~116 FP/1k), and misses many subtle anomalies at the default operating point.
- This is the production roadmap's empirical compass: it shows the real gaps are (a) baseline
  modeling for non-AR(1) real structure and (b) operating-point / sensitivity tuning — not more
  synthetic work.

## Ruled out / gotchas

- The report is generated from a local NAB checkout (not vendored); it is committed as evidence with
  provenance (dataset list + settings), regenerated via `pnpm shadow-replay <nab-dir>`. Tests do not
  depend on NAB (pure-helper fixtures).
- Restart-on-fire (continuous-monitoring) is used so multi-window datasets register multiple
  detections and FP is "spurious alerts per unit of normal data" — the operational rate.
