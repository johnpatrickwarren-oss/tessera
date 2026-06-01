# Detector tuning recommendations — Tessera detection envelope (R77)

This document is the operator-facing companion to the empirical envelope
matrix at `coverage-matrices/R77-detection-envelope-matrix.json` and
`coverage-matrices/R77-detection-envelope.md`.

## Empirical envelope

The R77 sweep characterizes Family A (GRAPA/ONS-fallback) detection probability
across 14 drift magnitudes (0.050–0.375), 6 window counts (30–200), 3 α thresholds
(0.001, 0.005, 0.010), and 2 detector families (A and C). At the default settings
(α=0.005, window_count=200, Family A), detection rate is 5/5 (100%) for **all 14
magnitudes** from 0.050 to 0.375 — the 200-window accumulation budget is sufficient
to saturate detection well into the low-magnitude regime.

The transitional band where detection is uncertain lies at **window_count=30 with
magnitude < 0.10**. Specifically:
- `(mag=0.050, win=30, α=0.005, Family A)`: 3/5 detections (60%)
- `(mag=0.075, win=30, α=0.005, Family A)`: 2/5 detections (40%)
- `(mag=0.100, win=30, α=0.005, Family A)`: 5/5 detections (100%)

At window_count ≥ 50, Family A achieves 5/5 detection for virtually all magnitudes
(≥ 0.050) across all α thresholds tested. The detection difficulty is therefore
concentrated at the minimum-window, very-low-magnitude corner of the parameter space.

## Tuning levers

Three levers are operator-visible with no engine modification required:

**1. Lengthen window count (more accumulation)**

Lengthen the window count from 30 to 50 to eliminate the transitional band at
low magnitudes. At `(mag=0.075, α=0.005, Family A)`: win=30 gives 2/5, but win=50
gives 5/5. For magnitudes ≥ 0.10, even win=30 gives 5/5. Operationally: if your
deployment monitoring window can tolerate a longer accumulation period, increasing
from 30 to 50 windows removes essentially all detection uncertainty at low magnitudes.

**2. Adjust α threshold (detection sensitivity vs false-positive rate)**

A higher α (e.g., 0.010 vs 0.005) lowers the wealth threshold (1/α = 100 vs 200),
making the detector fire more easily — this increases true-positive rate at boundary
cells. A lower α (e.g., 0.001) increases the threshold to 1000, making the detector
more conservative. At `(mag=0.075, win=30)`: α=0.010 gives 5/5 vs α=0.005 gives 2/5.
However, Ville's inequality fixes the Type-I error guarantee: P(false alarm | H₀) ≤ α,
so relaxing α directly inflates the false-alarm budget. Choose α based on the
acceptable false-alarm rate in your deployment context.

**3. Switch detector family (Family A vs Family C)**

Family A (GRAPA/ONS-fallback dual betting, M_t multiplicative wealth) outperforms
Family C (ONS-only, log_S_t additive wealth) in the low-magnitude/short-window regime:
- `(mag=0.050, win=30, α=0.005)`: A=3/5 vs C=0/5
- `(mag=0.075, win=30, α=0.005)`: A=2/5 vs C=0/5

At window_count ≥ 50, both families achieve 5/5 for magnitudes ≥ 0.075. Family C's
pure-ONS bet is theoretically cleaner but achieves lower practical detection at the
short-window boundary because it starts from ons_lambda=0 with no prior-period
adaptation. Family A's GRAPA bet adapts from running moments accumulated during
the window, giving it an early-window advantage. **Recommendation: retain Family A
as the default.**

## Theoretical Ville-bound floor (cannot cross)

Ville's inequality gives: P(sup_t M_t ≥ 1/α | H₀) ≤ α. This is the floor of the
false-positive rate; no operator tuning can reduce it. The inverse implication:
at H₁, the log-wealth grows at rate ≈ KL(H₁ ‖ H₀) per tick under the optimal
betting strategy. Below a magnitude that produces positive KL-divergence-per-tick
× window_count > log(1/α), the detector CANNOT reliably fire — no operator lever
moves this theoretical boundary.

With α=0.005 and window_count=30, log(1/α) ≈ 5.3 nats. A drift magnitude of 0.05
produces very small per-tick KL divergence on a standard-normal baseline; the empirical
3/5 detection rate at (mag=0.050, win=30) reflects that this cell sits near the
Ville-bound floor where even the GRAPA bet cannot accumulate wealth quickly enough.

## Operational tuning margin (where tuning helps)

Above the Ville-bound floor, operators have real margin. The R77 matrix documents
where this margin exists:

- **Reliable detection (5/5)**: All magnitudes ≥ 0.050 with window_count ≥ 50 (Family A,
  any α). Tune α freely within [0.001, 0.010] here — detection is saturated regardless.

- **Transitional band (2–4/5)**: magnitudes [0.050, 0.075] with window_count=30.
  Tuning levers have real effect here: increase window_count to 50, or use α=0.010
  (detection threshold 100 vs 200) to push into the reliable band.

- **Essentially unreachable (0–1/5 with any lever combination)**: Family C at
  (mag ≤ 0.075, win=30). No α adjustment recovers this — the ONS-only strategy
  accumulates insufficient wealth before the window closes.

## How to use this document

1. **Identify your typical drift magnitude.** If you know from R72 saturation-matrix
   analysis that your deployment produces SDC drifts in the 0.20–0.30 range, the
   default settings (α=0.005, window=200, Family A) already provide 100% coverage —
   no tuning needed.

2. **For low-magnitude regimes (< 0.10):** Consult the matrix at your target magnitude.
   If your deployment monitoring window allows 50+ observations, keep window_count ≥ 50
   and default α. If you are constrained to 30 observations, consider α=0.010 (accepting
   a 2× higher false-alarm budget) or accept the 40–60% detection rate as the floor.

3. **For Family selection:** Use Family A (default). Family C provides equivalent coverage
   at window_count ≥ 50 but has no advantage over Family A in the short-window regime
   where tuning choices matter most.

4. **Consult `coverage-matrices/R77-detection-envelope-matrix.json`** for the full
   504-cell grid. The matrix is deterministic — re-run `pnpm detector-envelope` to
   regenerate and verify byte-identical output.
