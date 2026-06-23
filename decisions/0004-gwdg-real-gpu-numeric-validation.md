# ADR 0004 — Tessera's numeric detector on real GPU faults (GWDG): the honest result

- **Status:** Accepted
- **Date:** 2026-06-23

## Context

The GWDG dataset (Zenodo 10.5281/zenodo.19052367) is real A100 telemetry with operator GPU-failure
labels — the first chance to run Tessera's per-shard NUMERIC detector on *real GPU faults* (gap A).
`tools/_gwdg-loader.ts` + `tools/gwdg-replay.ts` pivot the long-form tidy CSVs to per-(node,gpu,metric)
traces and reuse the shadow-replay scoring core. 16 incident files (detachment-heavy) + 5
"when-good" files.

## Decision / finding

Ship the GWDG validation harness and record the result honestly. At α=0.01 with a static baseline,
over 5 numeric DCGM metrics (XID, temps, power, util) on 64 GPU-shards:

- **Detection: 32.9%** of the per-(window×gpu×metric) shards (92/280; 15 unique incident windows).
- **False positives: ~30/1000** (~3%) on real normal GPU telemetry (incident files' pre/inter-window
  regions + non-incident files).

(Cold-eye H1/H2 fix: each file is joined to only its own incident — matched by the file's date in its
name — so a window is scored in exactly one file. Read 32.9% as fraction of (window×gpu×metric)
detection opportunities, NOT fraction of incident events.)

**Interpreting honestly:** a detector firing ~3% of the time will hit many 2h windows by chance, so
the 32% detection is **not clearly above-chance** given that FP rate. The conclusion is consistent
with the NAB result: **a static-baseline numeric detector over-fires on real telemetry and is not
production-viable on its own.**

Two structural facts reinforce this:
- The incidents are **detachment-heavy** — minimal numeric precursor by construction (the paper's
  thesis), so numeric detection is inherently limited here.
- The "when-good" files turned out to be healthy-GPU-**count** aggregates (not per-GPU DCGM), so
  numeric FP had to be measured from incident files' own normal regions (and they cannot serve as a
  clean numeric baseline). Notably, that GPU-count signal *is* a structural-collapse signal — useful
  for gap B.

## Why — and why not

- **Chosen (run it, report the honest mixed result)** — the value is the real-GPU measurement, even
  (especially) when it's unflattering. It triangulates with NAB.
- **Not claim numeric detection "works" on GPU faults** — the FP context forbids that framing
  (honest-measurement discipline).
- **Not validate topology/fleet** — GWDG is independent HPC nodes, no coupled fabric; out of scope.

## Consequences

Empirically, across NAB and real GPU telemetry, the two needed directions are now both evidence-backed:
1. **Gap #2 — regime-aware / adaptive baselining** (the ~3% FP is regime-shift-driven, not α-driven).
2. **Gap B — structural-degradation detector** for detachment (the failure class numeric is blind to;
   the GWDG GPU-count + scrape signals are the substrate to validate it on).

## Ruled out / gotchas

- Day-level labels → 2h windows are the best-available onset proxy; latency is coarse.
- Many numeric series are flat-when-idle; XID/ECC are the most fault-bearing.
- Telemetry read from decompressed CSV (Node has no bzip2; tools must not spawn) — `bunzip2` the
  archive first.
