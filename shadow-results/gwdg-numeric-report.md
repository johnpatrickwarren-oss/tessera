# Tessera — GWDG real-GPU numeric-detector validation

Tessera's per-shard NUMERIC betting e-process run on REAL A100 telemetry (GWDG, Zenodo 10.5281/zenodo.19052367) with operator failure labels, observe-only. Each (file, gpu, metric) is a shard.

> **Scope:** validates the per-shard NUMERIC detector on real GPU faults. The labeled incidents are **detachment-heavy** (minimal numeric precursor), so low numeric detection is EXPECTED and quantifies the blind spot the structural detector (gap B) targets. Does NOT validate topology / common-mode / fleet (independent HPC nodes, no coupled fabric). Labels are day-level (coarse latency).

Files: 21 (15 with an in-range incident, rest normal). Unique incident windows scored (filtered to each file's time range): 15. α=0.01.

## Per-metric (numeric)

Per-metric `FP/1k` = false-positive fires per 1000 scored-normal points in incident files' **normal (pre/inter-window) regions**; the overall FP also folds in non-incident files' normal data. `detection` = the 2h post-onset incident windows (filtered to each file's time range) with ≥1 in-window fire. (The "when-good" files are healthy-GPU-**count** aggregates, not per-GPU DCGM, so they yield no numeric shards.)

| metric | incident shards | FP/1k (incident-file normal) | windows det/scored |
|---|---|---|---|
| DCGM_FI_DEV_XID_ERRORS | 60 | 27.67 | 23/56 |
| DCGM_FI_DEV_GPU_TEMP | 60 | 28.984 | 15/56 |
| DCGM_FI_DEV_MEMORY_TEMP | 60 | 29.239 | 20/56 |
| DCGM_FI_DEV_POWER_USAGE | 60 | 30.746 | 18/56 |
| DCGM_FI_DEV_GPU_UTIL | 60 | 29.89 | 16/56 |

**Overall:** detection 32.9% (92/280 windows); FP 29.683/1k on real pre-incident normal telemetry. Interpret detection against this FP (a detector firing everywhere would also "detect"). Deterministic; byte-identical on re-run.
