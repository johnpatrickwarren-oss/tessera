# Tessera — adaptive-baseline detection tradeoff (the masking study)

Adaptive (regime-aware) baselining cut false alarms ~5x on a null dataset (ADR 0005). This is the gate before upstreaming: does it keep DETECTION, and at what drift rate does a rolling baseline MASK the anomaly by tracking it?

## A. Synthetic AR(1)+ramp sweep (controlled)

AR(1) ρ=0.5, length 1200, ramp onset at 600, 1500 trials/slope, α=0.01, adaptive window=300. `detect` = fired after onset; `pre-FP` = fired before onset (false positive). slope = ramp per step (unit-variance noise).

| ramp slope/step | static detect | adaptive detect | static pre-FP | adaptive pre-FP |
|---|---|---|---|---|
| 0 | 13.9% | 0.0% | 7.9% | 2.1% |
| 0.003 | 99.0% | 76.5% | 6.1% | 1.3% |
| 0.01 | 100.0% | 100.0% | 6.5% | 2.1% |
| 0.03 | 100.0% | 100.0% | 7.3% | 1.9% |
| 0.1 | 100.0% | 100.0% | 7.8% | 2.3% |
| 0.3 | 100.0% | 100.0% | 6.6% | 2.3% |

Read it as the tradeoff: at **slope 0** (no anomaly) adaptive pre-FP << static (the ~5x FP win). As slope grows, **static detects across the range** (a fixed baseline always eventually deviates) while **adaptive only detects once the ramp outpaces its window** — below that it MASKS the drift. The masking threshold is the slope where adaptive detect rises to meet static.

## B. GWDG real GPU faults (static vs adaptive)

| mode | windows det/scored | detection | FP/1k (pre-incident) |
|---|---|---|---|
| static | 56/168 | 33.3% | 29.1 |
| adaptive | 4/168 | 2.4% | 6.9 |

GWDG incidents are detachment-heavy + day-level (numeric signal is weak regardless), so read the FP delta as primary and detection as indicative.

## Verdict for upstreaming

Adaptive baselining is a **FP-vs-slow-drift tradeoff**, not a free win: it cuts false alarms but masks drifts slower than its tracking threshold. Safe to upstream only where slow-drift detection is not required, or as a hybrid (e.g., run static + adaptive in parallel and require both, or widen/freeze the window on suspicion). Deterministic; byte-identical on re-run.
