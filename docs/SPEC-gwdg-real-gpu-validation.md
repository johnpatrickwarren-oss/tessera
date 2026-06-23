# Spec — GWDG real-GPU numeric-detector validation (gap A)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** First validation of Tessera's per-shard NUMERIC detector on *real GPU faults*. The GWDG
  dataset (Zenodo 10.5281/zenodo.19052367) is real A100 telemetry with operator failure labels —
  more relevant than NAB (which is operational, not GPU). Run the production detection path
  observe-only and report real calibration (FP on real normal regions) + detection (on labeled
  incident windows), reusing the shadow-replay scoring core.

## Deliverables
- **D1 — `tools/_gwdg-loader.ts`**: parse `incident_events.csv` (labels) + `manifest.csv` (file→node)
  + the long-form tidy telemetry CSVs; pivot to per-(node,gpu,metric) `NabTrace` objects.
- **D2 — `tools/gwdg-replay.ts`** (`pnpm gwdg-replay <dir>`): iterate numeric DCGM metrics × files ×
  GPUs through `calibrateBaseline`/`replayFires`/`scoreDataset` (reused), aggregate good-vs-incident,
  report per-metric detection + FP.

## Acceptance criteria
- **AC-1** `parseIncidentDate` parses "DD Mon YYYY" as UTC midnight; `parseIncidents` maps node →
  `[incidentDay, collectEnd]` anomaly windows + category; `parseManifest` maps tidy file → node.
- **AC-2** `loadGwdgTraces` pivots long-form rows to per-(gpu,metric) series in file order, marks
  `is_anomaly` by window membership, and skips series shorter than 50 samples.
- **AC-3** Replay drives the real engine via the shared shadow-replay core (no new detector code).
- **AC-4** FP is measured on **real normal telemetry**: the incident files' pre-incident regions (the
  "when-good" files are healthy-GPU-*count* aggregates, not per-GPU DCGM, so they yield no numeric
  shards — documented, not silently treated as a clean baseline).
- **AC-5** Detection is the 2h post-onset windows with ≥1 in-window fire; the report states the FP
  rate alongside so detection is interpreted against it (honest measurement — a high-FP detector
  "detects" by firing everywhere).
- **AC-6** Deterministic / byte-idempotent. Tests cover the loader parsing + an end-to-end synthetic
  dataset run (sprag `require_tests`). ADR + STATE updated.

## Anti-scope
- **AS-1** No topology / common-mode / fleet-FDR validation — GWDG is independent HPC nodes, no
  coupled fabric.
- **AS-2** No structural-degradation detector here — that is gap B (this quantifies the numeric
  detector's blind spot that motivates it).
- **AS-3** No engine changes; reuses the exported detector + shadow-replay scoring.
- **AS-4** No in-tool bzip2 (Node lacks it; tools must not spawn) — telemetry is read as decompressed
  CSV.
