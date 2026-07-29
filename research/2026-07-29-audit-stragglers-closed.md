# 2026-07-29 — The 2026-07-02 audit's three stragglers, closed: sequential-UI built (engine ADR 0025), ADR-0015-v2 superseded by measurement, shadow-replay byte-identical

The math audit's STILL-OPEN list carried four research-scale items. O2 closed 2026-07-28
(robust-Catoni fit measurement → ADR 0027). This pass closes the remaining three.

## 1. Sequential-UI e-process — BUILT (engine `detectors/sequential-ui.ts`, engine ADR 0025, PR #41 → main 94fa65e)

F6's remnant: the fixed-split UI's "E ≤ 1 for any φ by construction" had a proof hole (numerator
parameters not independent of the scored fold at φ ≠ 0); the named fix was a predictable
numerator. Now built as an anytime e-process: predictable-plug-in conditional likelihood over a
profiled null sup on {Gaussian AR(1), constant mean, any φ, any σ²} —
**E[E_τ] ≤ 1 at every stopping time, any φ including near unit root, by a gapless domination
argument** (test-locked at φ up to 0.999, plus stopped-mean ≤ 1). Two properties the fixed-split
lacks: anytime validity (first-crossing action is covered; the increments are legitimate SRR
material — the O3 promotion remnant), and **self-standardization within class** (raw mis-scaled /
level-shifted feeds stay valid; audit F7's σ̂-sensitivity is profiled out — test-locked at
μ₀ = 5, σ = 2).

Honest power, measured before shipping: the free-φ composite null ABSORBS small steps — the
ORACLE-parameter numerator reaches only terminal logE ≈ 7 at a 1.5σ step (T = 300), and the
plug-in pays ~(k/2)·log t learning regret on top (~9 nats by tick 60). At 2.5σ: anytime crossing
0.55 = the fixed-split's terminal 0.55 — parity with a strictly stronger guarantee. Division of
labor recorded in both engine headers: fixed-window terminal analyses keep ADR 0010 (its ~6×
empirical slack at small shifts is real power); anytime/monitoring gets ADR 0025. Estimator
lesson worth keeping: stale-mean lag products bias the predictable φ̂ toward unit root after a
change — 0.93 → 0.17 detection — recompute against current regime means. (Engine ADR number is
0025: 0024 is claimed by an in-flight branch.)

## 2. ADR-0015-v2 (diffuse-weak group faults) — SUPERSEDED BY MEASUREMENT, no new detector needed

The audit-era claim: the locality drill-down abstains on diffuse-weak group faults by design, so
a dedicated group-vs-fleet detector (ADR 0015 v2) "remains the open detector for those." That
predates the canary group families (ADR 0023). Measured on the shipped sim (56 racks, 60 d,
whole-rack perf faults, coarse AND rack-local blocking):

| severity | budget | rack-family detection |
|---|---|---|
| 0.5–1.5 % | 0.5 % | none |
| 2 % | 0.5 % | d27.9 |
| 3 % | 0.5 % | d19.9 |
| **1 %** | **2 %** | **d21.9** |
| 1 % | 5 % | d23.9 |

The same 1 %-severity fault undetected at 0.5 % budget is detected at 2 % budget — **the gap is
COVERAGE ECONOMICS, not a missing construction**. The studentized-change cross-group conformal
family IS the group-vs-fleet detector, and group aggregation genuinely operates below the
per-unit δ₀ ≈ 1 % floor given samples. Zero false groups in every cell. Two standing caveats,
both already documented in the family's design: detection must land within the handicap masking
horizon (~12–16 d — a persistent diffuse fault older than that is progressively absorbed; the
d19.9–27.9 detections above sit inside it), and the family is EMP-CAL, not exact-finite-sample.
**Disposition: ADR-0015-v2 is closed as superseded; the open lever is probe budget/coverage
(ADR 0023's "coverage is the wall"), not detector construction.**

## 3. Shadow-replay — byte-identical under current code

`node tools/shadow-replay.js ~/concord/NAB` regenerated `shadow-results/nab-shadow-report.{json,md}`
**byte-identical to the committed canonical report** (git-clean working tree after the run) under
the full post-audit + ADR 0025/0026/0027 tree. The canonical per-signal real-telemetry numbers
(36 datasets, simple-vs-rich operating sweep) rest on current code; nothing to re-record.
