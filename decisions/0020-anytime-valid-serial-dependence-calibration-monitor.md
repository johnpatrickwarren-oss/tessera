# ADR 0020 — anytime-valid serial-dependence calibration monitor (retiring the whiteness-check crutch)

- **Date:** 2026-06-27
- **Status:** Accepted + WIRED INTO PRODUCTION. The strengthened monitor is `tools/serial-calibration.ts`
  with a validating harness + suite, and it now backs the construction-validity decision in
  `tools/mode-b-loop.ts`, `tools/clustersynth-mode-b.ts` (in-memory + streaming), and
  `tools/telemetry-source.ts` — the separate Wall-A whiteness AND-gate and the `whitenessPass` plumbing are
  GONE (whiteness survives only as an informational report column). Re-validated on the mini fixture: FDP
  stays 0.000 / recall 23/23, all counters Mode B, zero spurious revocations (the whitened healthy control
  does not trip the serial term), and a new loop test proves serial-dependence revocation end-to-end. The
  one remaining validation is a mac-mini 2-month (+ 1 Hz, to exercise the streaming path) run — see
  § Follow-ups.
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

## Consequences

- The strengthened monitor **subsumes the whiteness check for the breaks that matter**, so construction
  validity can drop the separate `calibrationPass AND whitenessPass` composition in favor of one
  anytime-valid monitor that catches both marginal mis-calibration AND serial dependence at a single
  threshold. This is the O5 "conditional/serial calibration" direction made operational.
- No change to the per-shard temporal FDR wall (N1) or the spatial-null architecture (ADR 0019). This is a
  better *revocation* test, not a new guarantee.

## Follow-ups

- **Production wiring — DONE (2026-06-27).** The conditional monitor replaced the marginal monitor +
  separate whiteness AND-gate in `tools/mode-b-loop.ts` (`updateMonitors` / `constructionValid`),
  `tools/clustersynth-mode-b.ts` (`prefixCalibrationPass` → conditional; the in-memory and streaming gates
  dropped `&& whiteFrac >= 0.5`), and the `whitenessPass` field was removed from `EmitterCycle` /
  `EmitterReport` / `windowToEmitter`. whiteFrac/white remain as informational report columns only. The 9
  mode-b-loop invariant tests were rewritten to force Mode A via broken / serially-dependent cohort
  residuals (not the removed `whitenessPass`), plus a new test proving serial-dependence revocation
  end-to-end through the loop. Mini-fixture re-validation: FDP 0.000 / recall 23/23, all counters Mode B,
  zero spurious revocations; full suite 759 pass. (`tools/mode-b-control.ts`, the synthetic #3 artifact, was
  intentionally left on its original whiteness check — it is a historical demonstration, not a pipeline.)
- **Remaining validation:** a mac-mini 2-month run (and a 1 Hz mixed-cadence run to exercise the streaming
  `calibPass` path) to confirm FDP stays 0.000 at scale with the combined monitor before declaring the
  crutch fully retired in production.
- **Lag-k extension** if real residuals show higher-order structure the lag-1 bet misses.
