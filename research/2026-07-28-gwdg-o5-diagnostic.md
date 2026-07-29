# 2026-07-28 — O5 on real telemetry: the Assumption-3.1 diagnostic FAILS on GWDG, as predicted — and says so

- **Artifacts:** `tools/gwdg-o5-diagnostic.ts` (+3 tests: parser/aligner invariants + a
  dataset-gated smoke). Dataset: Zenodo 10.5281/zenodo.19052367 (gitignored,
  `runs/gwdg-data/`; 15.7 MB — 21 incident windows + one healthy multi-node file, 10-min DCGM
  telemetry, 4 GPUs/node). Readout JSON: `runs/gwdg-data/o5-diagnostic.json`.
  Reproduce: `pnpm build && node tools/gwdg-o5-diagnostic.js <dataset-dir>`.
- **Closes:** RESEARCH-INDEX § 2 **O5**'s open item — "test on real GWDG (expected to FAIL; the
  diagnostic should say so)." It fails; it says so.

## The readout

Per (file, metric, gpu) cell: Y = the GPU's series on the node's common timestamp grid (last
4 h of incident files trimmed — predominantly-healthy segments), X = the leave-one-out mean of
the node's other three GPUs (the ADR 0016/P5 covariate form), verdict =
`conditionalMarkovDiagnostic` (ADR 0018's necessary-condition gate for the stopped-e-BH
conditional fleet-FDR theorem, Wang–Dandapanthula–Ramdas Cor 3.4).

| metric | cells | markov-plausible | median \|rawLag1\| | median \|condLag1\| |
|---|---|---|---|---|
| GPU_TEMP | 64 | 0 (0 %) | 0.946 | 0.834 |
| MEMORY_TEMP | 64 | 0 (0 %) | 0.922 | 0.825 |
| POWER_USAGE | 64 | 0 (0 %) | 0.896 | 0.506 |
| SM_CLOCK | 64 | 0 (0 %) | 0.930 | 0.846 |
| MEM_COPY_UTIL | 64 | 0 (0 %) | 0.859 | 0.459 |
| GPU_UTIL | 64 | 0 (0 %) | 0.858 | 0.645 |
| **TOTAL** | **384** | **0 (0 %)** | | |

## What this settles, and what it does not

1. **The LOO common-mode covariate does real work and is nowhere near enough.** Conditioning
   halves the serial dependence on the workload-driven counters (POWER 0.90 → 0.51, COPY_UTIL
   0.86 → 0.46) and barely dents the thermal/clock ones (TEMP 0.95 → 0.83). No cell reaches
   conditional whiteness. On this substrate, with this covariate, **Assumption 3.1 is not
   satisfied and no conditional fleet-FDR theorem is earned — the fleet claim stays empirical**,
   which is what the two-mode architecture already assumes (N1; ADR 0019). The value here is the
   diagnostic behaving exactly as designed on first contact with real data: a necessary-condition
   gate that fails loudly instead of letting a theorem be quoted.
2. **The residual gap is the forecast-as-X_n upside, quantified.** What the LOO mean cannot
   condition away (job phases per GPU, thermal state) is exactly what ADR 0024's gated
   forecaster-as-covariate path would try to supply. These numbers are the baseline any such X_n
   must beat: condLag1 medians 0.46–0.85 per counter.
3. **Named limits:** 10-min cadence and ≤ days-long windows (GWDG cannot serve long-window null
   gates — ADR 0022/0024; this is a diagnostic readout, not a calibration claim); the covariate
   is the 3-peer LOO mean (small-peer noise inflates condLag1 somewhat — but 0.5–0.85 medians
   are not borderline); incident files are predominantly-healthy segments, not certified nulls.
