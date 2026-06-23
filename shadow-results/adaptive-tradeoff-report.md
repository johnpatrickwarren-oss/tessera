# Tessera — adaptive-baseline detection tradeoff (the masking study)

Adaptive (regime-aware) baselining cut false alarms ~5x on a null dataset (ADR 0005). This is the gate before upstreaming: does it keep DETECTION, and at what drift rate does a rolling baseline MASK the anomaly by tracking it?

## A. Synthetic AR(1)+ramp sweep (controlled)

AR(1) ρ=0.5, length 1200, ramp onset at 600, 1500 trials/slope, α=0.01, adaptive window=300. `detect` = fired **within the 600-step post-onset horizon** (so it captures both detection AND latency); `pre-FP` = fired before onset. slope = ramp per step (unit-variance noise). The slope=0 row's "detect" is the cumulative type-I rate over 600 steps, not the per-step α.

| ramp slope/step | static detect | adaptive detect | static pre-FP | adaptive pre-FP |
|---|---|---|---|---|
| 0 | 13.9% | 0.0% | 7.9% | 2.1% |
| 0.003 | 99.0% | 76.5% | 6.1% | 1.3% |
| 0.01 | 100.0% | 100.0% | 6.5% | 2.1% |
| 0.03 | 100.0% | 100.0% | 7.3% | 1.9% |
| 0.1 | 100.0% | 100.0% | 7.8% | 2.3% |
| 0.3 | 100.0% | 100.0% | 6.6% | 2.3% |

Read it as the tradeoff: at **slope 0** (no anomaly) adaptive pre-FP << static (the ~4-5x FP win). As slope grows, **static detects across the range** (a fixed baseline always eventually deviates) while **adaptive only detects once the ramp outpaces its window** — below that it tracks the drift into "normal". The shortfall (e.g. 76.5% vs 99% at slope 0.003) is *within-horizon* detection, so it bundles **permanent masking AND detection delayed past the horizon** — both operationally bad for monitoring (a fault caught much later is nearly as costly as one missed). The threshold is the slope where adaptive detect rises to meet static (~0.01/step here).

## B. GWDG real GPU faults (static vs adaptive)

Metrics: XID_ERRORS, GPU_TEMP, POWER_USAGE (a 3-metric subset of gwdg-replay's 5). FP/1k denominator = normal regions of **incident files only** (non-incident files skipped), so it is NOT directly comparable to gwdg-replay's full-dataset FP — read the static-vs-adaptive DELTA, not the absolute.

| mode | windows det/scored | detection | FP/1k (incident-file normal) |
|---|---|---|---|
| static | 56/168 | 33.3% | 29.1 |
| adaptive | 4/168 | 2.4% | 6.9 |

GWDG incidents are detachment-heavy + day-level (numeric signal is weak regardless), so read the FP delta as primary and detection as indicative.

## Verdict for upstreaming

Adaptive baselining is a **FP-vs-slow-drift tradeoff**, not a free win: it cuts false alarms but masks drifts slower than its tracking threshold. Safe to upstream only where slow-drift detection is not required, or as a hybrid (e.g., run static + adaptive in parallel and require both, or widen/freeze the window on suspicion). Deterministic; byte-identical on re-run.
