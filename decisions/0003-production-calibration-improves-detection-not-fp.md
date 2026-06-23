# ADR 0003 — production (seasonal) calibration improves detection, does not fix FP

- **Status:** Accepted
- **Date:** 2026-06-23

## Context

The first shadow-replay run (ADR 0002) used a simple static `(mean, σ², φ)` baseline and over-fired
on real NAB signals with non-AR(1) structure (e.g. `rds_cpu` ~116 FP/1k). The hypothesis was that
the engine's fuller **production calibration** — seasonal decomposition + AR — would reduce that.
Gap #1 tested it: a `rich` calibration mode composing the engine's importable production primitives
(`detectors/seasonal:decomposeSeasonal` + AR(1), mirroring `fit-production-substrate`'s seasonal
path), run side-by-side with `simple` across an α-sweep on the same real NAB data.

## Decision / finding

Keep the `rich` mode and the operating-point sweep in the harness; **the hypothesis was wrong, and
that is the result worth recording.** Real-data measurement (36 datasets; period detected in 15):

| mode | α=0.05 | α=0.01 | α=0.001 |
|---|---|---|---|
| simple detection | 38.7% | 29.0% | 25.8% |
| **rich** detection | **40.3%** | **33.9%** | **30.6%** |
| simple FP/1k | 12.8 | 8.9 | 6.2 |
| **rich** FP/1k | 13.1 | 9.3 | 6.4 |

- **Seasonal calibration IMPROVES detection** (+5pp at α=0.01): deseasonalizing surfaces anomalies
  that were hidden under the periodic component.
- **It does NOT reduce false positives** (FP/1k is flat-to-slightly-up). This **confirms AC-15's
  prediction**: the FP problem is *not* periodicity. It is **regime shifts / multimodality** —
  sustained level changes a single stationary baseline (seasonal or not) cannot absorb.

## Why — and why not the alternatives

- **Chosen (measure, then record the refutation)** because the shadow harness exists precisely to
  let real data refute plausible hypotheses cheaply. It did: "richer calibration fixes FP" is false.
- **Not adopt rich as *the* FP fix** — the numbers don't support it; claiming so would be the kind of
  favorable-framing the honest-measurement discipline forbids. (Rich is still worth keeping for the
  detection gain.)
- **Not AR(p) / more seasonal modeling** — same reason; the residual FP is non-periodic,
  non-stationary structure.

## Consequences — the next real gap

The FP driver is **regime shift / non-stationary baseline**, not seasonality. The next
production step is therefore **adaptive / regime-aware baselining** (rolling recalibration, or
change-point-segmented baselines) — with the explicit tradeoff that an adaptive baseline can mask
slow drifts (the very anomalies). That tradeoff is itself a measurement the shadow harness can make.
Cluster-layer validation remains blocked on real multi-shard data (unchanged).

## Ruled out / gotchas

- `fit-production-substrate` is not importable (tools/ not exported); `rich` composes the same
  importable primitives (`detectors/seasonal`) it uses — faithful, not a reimplementation.
- Deseasonalization is phase-0-anchored (tick 0 = phase 0) consistently between probationary
  calibration and full-series replay; `probEnd` need not be a period multiple (phase is `index mod
  period` throughout). Fire indices are positions in the original series (deseasonalize does not
  reindex), so detection scoring against ground-truth windows is unaffected.
