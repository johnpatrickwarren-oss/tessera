# ADR 0020 — anytime-valid serial-dependence calibration monitor (sound mechanism; whiteness retained — negative result at 1 Hz)

- **Date:** 2026-06-27
- **Status:** Accepted as a sound, validated MECHANISM (`tools/serial-calibration.ts` + harness + suite),
  but **NOT wired into the production gate** — the attempt to retire the Wall-A whiteness AND-gate was
  tried and **reverted** after a mac-mini 1 Hz run showed it regresses FDR (commit `25452f7` →
  reverted `2bf76f2`). The whiteness check is RETAINED. See § "Production wiring — attempted + reverted".
  This is a useful negative result: the anytime-valid serial monitor does not *subsume* whiteness at
  production cadence.
- **Builds on:** ADR 0019 (two-mode architecture; the runtime calibration monitor, follow-up #2, that
  makes `construction_valid` revocable) and its documented blind spot; RESEARCH-INDEX O5 (conditional /
  serial calibration is the named frontier; Farran 2026 — anytime-valid calibration monitoring). This is
  NOT registry N1 (the per-shard *temporal* FDR wall): it strengthens the runtime MONITOR, not the
  per-shard guarantee.

## Problem

The runtime calibration monitor (`tools/calibration-monitor.ts`, ADR 0019 #2) tests `E[g(r_t)|F_{t-1}] ≤ 1`
with `g` the symmetric Gaussian-LR mixture — **a function of the single current residual**. It catches a
wrong mean/scale, but it is provably **blind to pure serial dependence**: a unit-marginal AR(1)
`x_t = ρ·x_{t-1} + √(1−ρ²)·ε_t` is marginally *exactly* N(0,1), so `E[g(x_t)] = 1` and the marginal
martingale never grows — yet the serial dependence breaks the e-process validity that whitening was
supposed to deliver. ADR 0019 #3 patched the gap *outside* the monitor with a fixed-threshold lag-1
whiteness check (`|ρ̂(r,1)| ≤ 0.1`) ANDed into construction validity. That check is the crutch: a
non-anytime-valid heuristic with a magic constant and no accumulating power (catch was ~76% on a broken
integrated-drift control).

## Decision

Test serial dependence **inside an anytime-valid martingale** by betting on the next residual using the
previous one as the predictor. For an F_{t-1}-measurable bet `λ_t = c·r_{t-1}`,

```
g_c(r_{t-1}, r_t) = exp( c·r_{t-1}·r_t − ½·c²·r_{t-1}² )
```

is a conditional e-value: under H0 (`r_t ⊥ past`, `r_t ~ N(0,1)`), `E[g_c | F_{t-1}] = exp(λ_t²/2 − λ_t²/2)
= 1` for ANY `c` and ANY past (exactly Ville). Under positive serial dependence
`E[r_t r_{t-1} | F_{t-1}] = ρ·r_{t-1}² > 0`, so the bet earns and `∏ g_c` grows; under negative ρ the
opposite-sign bet earns. A **sign-and-magnitude mixture** over `c ∈ ±{0.3, 0.6}` is therefore a single
e-value that detects lag-1 dependence of either sign with **no threshold** — the same quantity the
whiteness check tests, but as an accumulating anytime-valid test.

**Composition: average two martingales, don't mix the bets within a step.** The strengthened monitor runs
the marginal martingale `W_marg = ∏ g(r_t)` and the serial martingale `W_serial = ∏ g_serial(r_{t-1}, r_t)`
and combines them as `W = (W_marg + W_serial)/2`. The average of two e-processes is an e-process, so Ville
gives `P(sup_t W ≥ 1/α) ≤ α` at the same single threshold. Averaging (not a within-step mixture of all
bets into one increment) is the right choice for **power**: each component keeps its full per-tick growth
*rate* — which compounds over the stream — and pays only a one-time additive `−log 2` when the dominant
component crosses. A within-step mixture instead dilutes the serial growth rate by the (flat) marginal
bets *every* tick, which compounds catastrophically — empirically it collapsed the ρ=0.6 catch from 92% to
8%. Multiplying `g·g_serial` in one step is outright invalid (both depend on `r_t`). The two components are
also the natural attribution (which failure mode revoked).

## Evidence (`tools/serial-calibration.ts`, 500 trials × 600 ticks, α=0.01)

| scenario | marginal-only | COMBINED | whiteness `|ρ̂|>0.1` |
|---|---|---|---|
| iid N(0,1) (true null) | 0% | **0%** | 1% |
| AR(1) ρ=0.3 (mild) | 2% | 12% | 100% |
| AR(1) ρ=0.6 | 5% | **92%** | 100% |
| AR(1) ρ=0.9 (near-unit-root) | 22% | **100%** | 100% |
| AR(1) ρ=−0.5 | 4% | 69% | 100% |
| **integrated drift (random walk)** | 52% | **100%** | 100% |
| marginal break: mean +0.4 | 3% | 7% | 1% |
| marginal break: scale ×1.4 | 100% | **100%** | 2% |

- **Headline.** The unit-marginal AR(1) is invisible to the marginal monitor at every ρ; the combined
  monitor catches it, with power rising in |ρ|. On the **breaks that actually matter** — near-unit-root and
  integrated drift, exactly the broken-construction mode #3 used whiteness to catch — it revokes ~fully
  (100%), **beating the ~76% whiteness baseline**, anytime-validly, with no magic threshold.
- **Validity preserved.** True iid null: 0% (≤ α). The serial term adds no false revocations
  (test: mean `W_serial` ≈ 1 on the null; false-revocation ≤ α + slack).
- **Marginal breaks still caught.** A scale break is 100%; a mean break is carried by the marginal
  component — and the combined monitor actually *beats* marginal-only on mean shifts, because a mean shift μ
  induces `E[r_{t-1}r_t] = μ² > 0`, so the serial term contributes there too (a valid bonus).

## Honest tradeoffs (named, not hidden)

- **Mild serial dependence (ρ≈0.3) has low anytime-valid power (12%).** This is by design, and the *right*
  behavior: the fixed whiteness cutoff over-flags ρ=0.3 at 100% with no notion of whether the dependence is
  strong enough to threaten calibration. The anytime-valid monitor spends power where dependence actually
  accumulates as evidence. If a deployment wants to be conservative about mild dependence, keep whiteness as
  a *complementary* gate rather than replacing it — the two are not mutually exclusive.
- **Negative dependence is weaker than positive at equal |ρ|** (ρ=−0.5 → 69%, ρ=−0.6 → 98%): the bet
  `c·r_{t-1}` predicts `r_t` with the same/opposite sign as `r_{t-1}`, an asymmetry of the betting
  construction. Strong negative dependence is still caught.
- **Lag-1 only.** Matches the lag the whiteness check uses; the construction extends to lag k by predicting
  with `r_{t-k}`, mixed over lags (a knob, not built).
- **Averaging factor-2.** A one-time `−log 2`, negligible against the compounding growth rate.

## Production wiring — ATTEMPTED + REVERTED (the negative result)

The synthetic harness above (600-tick streams) made the serial monitor look like it *subsumes* whiteness.
It does NOT in production. The monitor was wired into the construction-validity gate (replacing the
marginal monitor + whiteness AND-gate) across `mode-b-loop.ts` / `clustersynth-mode-b.ts` (in-memory +
streaming) / `telemetry-source.ts` (commit `25452f7`), then **reverted** (`2bf76f2`) after a mac-mini run.

- **Mini fixture (hourly) passed** — FDP 0.000 / recall 23/23, all counters Mode B; and at scale (2-month
  hourly, RACKS 8/16 → 2304 shards) FDP 0.000, no spurious revocations. So the wiring is non-regressive at
  the cadences where the contrast residual is well-whitened.
- **1 Hz REGRESSED.** With whiteness retired, `gpu_temp_c` (idiosyncratic τ=120 s → near-unit-root φ≈0.99
  whose residual single-φ whitening only partly flattens) **stayed Mode B and over-fired: FDP 0.971, 511/576
  selected** → aggregate FDP **0.869**. With whiteness retained it correctly **abstains** (Mode A, whiteFrac
  41% < 50%) → aggregate FDP **0.000**. The serial monitor passed `gpu_temp_c`'s calibration feed even
  **uncapped** (feed cap 500 → 1728 → 100000 all identical: still Mode B).

**Why it cannot subsume whiteness (the mechanism).** Whiteness *estimates the lag-1 autocorrelation
coefficient* `ρ̂` from the calibration prefix and thresholds it — sensitive to mild dependence from a short
sample. The betting monitor must *accumulate sequential evidence*, and its power scales with feed length.
The destructive quantity at 1 Hz is **mild-per-tick** residual autocorrelation (ρ̂≈0.1–0.2) that becomes
ruinous only because the **detection horizon is long** (21 600 ticks). But the healthy calibration feed is
the pre-fault prefix — only ≤1728 ticks — far shorter than the detection horizon, so the monitor never
accumulates enough to revoke, while the detection e-value accumulates enough to over-fire. Uncapping does
not help because the prefix length, not the cap, is the binding limit. Whiteness sidesteps this entirely by
estimating a parameter rather than accumulating a martingale.

## Consequences

- **The whiteness check is RETAINED** as the construction-validity serial guard. The serial monitor is a
  sound, validated anytime-valid mechanism (it does beat whiteness on *strong* breaks in the synthetic
  harness) but it does **not** replace whiteness at production cadence, and offers no clear complementary
  gain in an AND-composition (whiteness already catches everything the capped monitor catches, plus the
  mild-but-binding 1 Hz case). So it is kept as a research artifact, not in the gate.
- No change to the per-shard temporal FDR wall (N1) or the spatial-null architecture (ADR 0019).

## Follow-ups

- **Always-on-loop accumulation (the one regime where it might still pay off).** The mac-mini finding is for
  the ONE-SHOT harness (`clustersynth-mode-b.ts`), where the calibration feed is a single short prefix. The
  always-on loop (`mode-b-loop.ts`) instead ACCUMULATES the per-cycle control cohort across the whole
  monitoring duration — i.e. a feed as long as the detection horizon. There the serial monitor could plausibly
  reach the power to catch a `gpu_temp_c`-style residual. Validating that needs a multi-cycle loop replay on a
  long 1 Hz bundle (not done). Until then, whiteness stays everywhere.
- **A calibration feed at the detection cadence/length** (a continuously-updated concurrent-control reference,
  not just the pre-fault prefix) would remove the feed-length mismatch — the deeper fix if the loop route
  doesn't suffice.
- **Lag-k extension** if real residuals show higher-order structure the lag-1 bet misses.
