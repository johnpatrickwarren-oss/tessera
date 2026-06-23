# Spec — shadow-replay: validate the per-signal detector on REAL telemetry

- **Date:** 2026-06-23
- **Status:** Draft (pre cold-eye)
- **Need:** Every Tessera efficacy number to date is measured against data Tessera generated
  (synthetic generators / `calibration-envelope`). That is the artifact→product ceiling. This is the
  first step across it: run **real, labeled** public telemetry through Tessera's production detection
  path (observe-only, no action) and report **real** calibration (false-positive rate on real
  quiescent data) and **real** detection (true positives + latency on labeled anomalies). Real source
  = the Numenta Anomaly Benchmark (NAB): real operational time series (`realKnownCause`,
  `realAWSCloudwatch`, …) with ground-truth anomaly windows, exhibiting the exact hard structure
  (φ≈0.95 autocorrelation, heavy tails, regime shifts) our whitening work targets.

## Deliverables

- **D1 — NAB ingestion adapter** (`tools/_nab-loader.ts`): parse a NAB CSV (`timestamp,value`) and the
  `combined_windows.json` label file into a typed `{ values, timestamps, isAnomaly[] }` trace. Pure
  (no detection); the real-telemetry intake.
- **D2 — shadow-replay harness** (`tools/shadow-replay.ts`, `pnpm shadow-replay <nab-dir>`): for each
  dataset, calibrate a baseline on the NAB probationary window, replay the rest through the engine's
  betting e-process (with production-mirroring AR(1) whitening), and score fires against the labels.
  Observe-only. Emits per-dataset + aggregate JSON + Markdown report.

## Acceptance criteria

### Ingestion (D1)
- **AC-1** Parses NAB CSV rows to `{ts, value}` in file order; tolerates the fractional-second
  timestamp format; ignores blank trailing lines. Pure, no mutation of inputs.
- **AC-2** `isAnomaly[i]` is true iff row `i`'s timestamp falls within any `[start,end]` window for
  that dataset key in `combined_windows.json` (inclusive). Empty window list ⇒ all false.
- **AC-3** A dataset with no label entry, or a missing NAB directory, yields a clear skip/error — the
  harness never silently treats unlabeled data as all-normal.

### Replay + scoring (D2)
- **AC-4** Baseline calibration uses only the **probationary** prefix (NAB convention: first 15% of
  rows, capped at 5000), excluded from scoring. Calibrates `(mean, σ², φ)`; φ is **clipped to
  [-0.95, 0.95]** to mirror the engine's `ar1Phi` (NOT loosened — near-unit-root is a known boundary).
- **AC-5** Replay drives the **real engine** `updateBettingState` (whitening via the engine's `ar1Phi`
  param + innovation variance `σ²·(1-φ²)`, mirroring production) — NOT a Tessera-side transform.
- **AC-6** Continuous-monitoring semantics: on a fire, record it and **reset** the e-process state
  (restart), then continue — so multi-window datasets can register multiple detections and the FP
  measure is "spurious alerts per unit of normal data," the operationally meaningful rate.
- **AC-7** Scoring vs ground truth: a fire whose index is inside an anomaly window = detection (record
  earliest-in-window latency); a fire in the scored-normal region = false positive. Reports
  per-dataset and aggregate: **FP rate** (fires per scored-normal-point) + **detection** (windows with
  ≥1 in-window fire / total windows) + **median detection latency**.
- **AC-8** Deterministic: same NAB inputs ⇒ byte-identical report (the detector is deterministic; no
  RNG in the replay path).

### Honest measurement & trail
- **AC-9** The report header states the scope boundary verbatim: this validates the **per-signal
  detector** (calibration + detection on real autocorrelated telemetry); it does **NOT** validate the
  cluster / topology / common-mode / fleet-FDR layers (no real multi-shard data), and NAB anomalies
  are operational, not GPU-SDC. A green report must not imply cluster-level validation.
- **AC-10** Report records provenance: NAB source **name** (basename, not the absolute path — the
  committed report is a public artifact and must not embed a local home directory), the categories +
  dataset count, and the α / probationary / φ-clip settings, so a reader knows exactly what was run
  and can reproduce it from their own NAB checkout.
- **AC-11** ADR + STATE updated; sprag gate green; new modules carry tests (sprag `require_tests`).

## Anti-scope
- **AS-1** No cluster/topology/fleet validation (NAB is univariate single-signal). No `fetchSnapshot`
  / topology adapter work (NAB has no topology).
- **AS-2** No NAB-weighted scoring reimplementation — a plain, honest FP-rate / detection-rate /
  latency report is clearer for the calibration question than NAB's idiosyncratic weighting.
- **AS-3** No engine changes; consumes the engine's exported betting detector only.
- **AS-4** Does not claim SDC/common-mode detection — NAB anomalies are a proxy for "calibrates +
  detects on real autocorrelated operational telemetry," nothing more.
- **AS-5** No live/streaming production runtime — replay of recorded traces only (the shadow step).

## Traceability
- AC-1..AC-3 ← real-telemetry intake (replaces synthetic generators).
- AC-4..AC-8 ← real calibration + detection numbers via the production detection path.
- AC-9..AC-10 ← Anchor honest-measurement (the scope boundary is the whole point).
- AC-11 ← Anchor durable trail + sprag gate.
