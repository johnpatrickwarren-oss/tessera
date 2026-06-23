# Tessera — GWDG real-GPU numeric-detector validation

Tessera's per-shard NUMERIC betting e-process run on REAL A100 telemetry (GWDG, Zenodo 10.5281/zenodo.19052367) with operator failure labels, observe-only. Each (file, gpu, metric) is a shard.

> **Scope:** validates the per-shard NUMERIC detector on real GPU faults. The labeled incidents are **detachment-heavy** (minimal numeric precursor), so low numeric detection is EXPECTED and quantifies the blind spot the structural detector (gap B) targets. Does NOT validate topology / common-mode / fleet (independent HPC nodes, no coupled fabric). Labels are day-level (coarse latency).

Files: 21 (16 incident, rest "when-good"). α=0.01.

## Per-metric (numeric)

`FP/1k` = false-positive fires per 1000 scored-normal points in the incident files' **pre-incident regions** (real normal GPU telemetry). `detection` = the 2h post-onset incident windows with ≥1 in-window fire. (The "when-good" files are healthy-GPU-**count** aggregates, not per-GPU DCGM metrics — so they yield no numeric shards; FP is measured from the incident files' own normal regions instead.)

| metric | incident shards | FP/1k (pre-incident) | windows det/scored |
|---|---|---|---|
| DCGM_FI_DEV_XID_ERRORS | 64 | 27.774 | 25/69 |
| DCGM_FI_DEV_GPU_TEMP | 64 | 28.786 | 19/68 |
| DCGM_FI_DEV_MEMORY_TEMP | 64 | 30.174 | 24/68 |
| DCGM_FI_DEV_POWER_USAGE | 64 | 30.853 | 22/68 |
| DCGM_FI_DEV_GPU_UTIL | 64 | 30.853 | 20/68 |

**Overall:** detection 32.3% (110/341 windows); FP 29.688/1k on real pre-incident normal telemetry. Interpret detection against this FP (a detector firing everywhere would also "detect"). Deterministic; byte-identical on re-run.
