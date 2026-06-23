# Tessera — gap B structural detector + the limit of the per-shard FP guarantee on real telemetry

A betting e-process (Ville: P(ever fire | healthy) ≤ α=0.01) on the structural-health signal `scrape_samples_scraped`, treated as a relative level. We test whether the α guarantee actually HOLDS on real healthy telemetry, and characterize detection power against injected collapse. The answer (below) is the load-bearing finding: the per-shard anytime-valid guarantee does NOT survive real nonstationarity — for structural signals just as for numeric ones.

## A. False-alarm rate on REAL healthy structural telemetry (the guarantee)

55 real per-(node,instance) healthy streams. Every fire is a false alarm (no labeled collapse in GWDG).

Detector: betting e-process on the RELATIVE level (value / healthy median), variance floored at 0.05 (benign scrape wiggle). "Stable" = healthy median ≥ 200 samples (where the Gaussian-relative null is valid; low-count integer targets are inherently noisy and need a Poisson e-process — out of scope).

| target set | streams | streams that fired | realized per-stream FP | α bound | honors α? |
|---|---|---|---|---|---|
| **stable (median ≥ 200)** | 16 | 16 | 100.0% | 1.0% | ❌ NO |
| all targets | 55 | 36 | 65.5% | 1.0% | ❌ NO |

**The guarantee is VIOLATED even on the most stable, highest-count targets:** realized FP 100.0% ≫ α=1.0%. Inspection shows *why*: the e-process fires on sub-percent PERSISTENT level shifts (e.g. a target settling from 5620 to 5627 samples as series are added) — not on collapses. This is fundamental to anytime-valid methods: they accumulate wealth on *any* persistent deviation, so on a non-stationary signal (which every real scrape count is, over days) P(fire) → 1, not ≤ α. Raising the floor only defers it. The α bound is mathematically correct but conditional on exact stationarity that real telemetry does not satisfy.

## B. Detection power vs INJECTED collapse (severity × duration)

Power on a CLEAN synthetic baseline (level 1000 + 1% relative noise, 40 trials) — real streams over-fire (above), which would confound power. A collapse scales the count by severity for N scrapes; `detection` = fired within the collapse + 10 scrapes. NOTE: the relative bet saturates (bounded-z) once the drop exceeds the 5% floor, so severities ×0–×0.75 behave identically — only DURATION drives latency; ×0.9 (a 10% dip) is the near-floor case.

Detection rate (median latency in scrapes):

| severity \\ duration | 3 | 6 | 12 | 24 |
|---|---|---|---|---|
| ×0 | 2.5% (0) | 22.5% (5) | 35.0% (5) | 75.0% (12) |
| ×0.25 | 2.5% (0) | 22.5% (5) | 35.0% (5) | 75.0% (12) |
| ×0.5 | 2.5% (0) | 22.5% (5) | 35.0% (5) | 75.0% (12) |
| ×0.75 | 2.5% (0) | 22.5% (5) | 35.0% (5) | 75.0% (12) |
| ×0.9 | 2.5% (1) | 7.5% (5) | 32.5% (7) | 87.5% (18) |

Read: a collapse beyond the floor IS detected, with latency growing as duration shrinks (a 24-scrape collapse is caught fast; a 3-scrape blip needs the drop to be sharp). So detection *power* is genuine — the detector works. The problem is not power; it is the FP guarantee above.

## What this means for the "low, guaranteed FP and FD" promise

- **FD (power): achievable.** The e-process reliably detects a genuine structural collapse (drop beyond the noise floor) within a few scrapes.
- **FP (the guarantee): NOT achievable per-shard on real telemetry.** Across numeric (NAB/GWDG/MIT) and now structural (GWDG scrape-health) signals, the fixed-baseline anytime-valid e-process fires on persistent sub-percent drift, so realized FP ≫ α. The α bound holds only under exact stationarity, which real signals violate over long horizons. This is fundamental, not a tuning bug.
- **Where a real guarantee could still live:** (a) bounded-horizon / windowed monitoring (reintroduces multiple-testing across windows, and the regime-aware variant masks — ADR 0006), or (b) FLEET-level e-BH FDR, where common-mode drift cancels in the cross-shard ranking so a truly-failing shard still stands out. (b) is the unvalidated claim worth testing next.

> **Honest scope:** FD is on *injected*/synthetic collapse — GWDG carries no real labeled structural outage (verified). Real-labeled FD needs a dataset with actual node/exporter-down events (SURF Lisa next).
