# 2026-07-26 — A2-disp: persistent dispersion heterogeneity, H8's actual mechanism — and where the location analysis stops protecting you

- **Artifacts:** `tools/dispersion-drift.ts` (theory + A/A validation harness),
  `estimateDispersion`/`nullFloorDispersion` in `tools/heterogeneity-estimate.ts`;
  tests `test/dispersion-drift.test.ts` (10, all relations-not-levels).
  Reproduce: `pnpm build && node tools/dispersion-drift.js --harness --seeds 4 [--json out.json]`.
- **Closes:** open item **A2-disp** from `research/2026-07-25-theta-tau-measurement.md` § 8 (its
  § 7 threat "dispersion heterogeneity is out of model").
- **Statement lineage:** the A2 machinery — `g(δ)`, the tilt `A`, `δ₀`, the ICC target — was
  derived for a persistent LOCATION offset `Y = δ + Z`. H8's `heteroRackSd` gives units a
  persistently larger noise SCALE at equal mean: `Y = λ·Z`, `λ = e^ν` lognormal. The location
  estimator is blind to that channel by construction (a scale multiplier moves no unit mean), so
  H8's published θ̂ captured only its incidental `rackStaticSd` and its horizon was overstated —
  a hole in the STATEMENT, the same species as A2-host was.
- **Lean connection:** the accumulation identity this analysis instantiates —
  `E[M_T] = E[g(state)^T]`, per-round validity exact, Jensen ≥ 1 — is machine-checked for an
  ARBITRARY persistent state (`Conformal.lean` § 2, the mixing-law + Markov-kernel model). The
  state here is ν; nothing in the proved identity is location-specific. What is new below is the
  CHANNEL-specific quantitative structure: tilts, floors, and where the operational failure lands.

---

## 1. The model, and the identity that survives unchanged

Unit scale multipliers `λ_u = e^{ν_u}`, `ν ~ N(0, ς²)` (median-1, matching canary-sim's
`exp(rng.norm()·heteroRackSd)`), persistent across rounds. The peer score law is the scale
MIXTURE `F(y) = E_ν[Φ(y/e^ν)]` — not any single Gaussian; the location analysis could use one
only because a Gaussian location-mixture of Gaussians is Gaussian, and a scale mixture is not.
The finite-block rank machinery (rank cells, binomial mixing) carries over unchanged with
exceedance map `π̄(y) = 1 − F(y)`.

Per-round validity is EXACT at every ς — `E_ν[g(e^ν)] = 1.00000` measured at K = 30 and 100
(test 1) — and per-test FPR in the A/A harness is nominal and variant-independent at every
horizon (§ 4). Exactly as in the location case, **nothing is wrong per round; the failure is
serial.** A noisy unit occupies BOTH rank extremes more often at equal mean; the calibrator is
antitone, so the small-p extreme wins and `g(λ) > 1` for λ above ~1.

## 2. What is different from location — three structural facts

**(a) Dispersion tilts ~5× harder per unit of parameter, in the ∞-block limit.** The dispersion
tilt is `B = d log g/dν|₀ = ∫₀¹ f(p)(Φ⁻¹(p)² − 1) dp = 9.627` against the location tilt
`A = 1.989`. Same small-drift law with B in place of A: `Λ(T) ≈ exp(B²ς²T²/2)`,
`T* ≈ √(2 ln 2)/(Bς)`. Worse: in the ∞-block limit `g(λ)` itself DIVERGES once λ exceeds the
peer mixture's effective tail scale — for location only `Λ` diverged, never `g`.

**(b) But the finite block defends against dispersion far more effectively.** The K = 30
effective tilt is 1.468 — a 6.6× cap versus the ~2× the location tilt loses. Dispersion lives in
the extreme rank cells, which are exactly what a finite block truncates. The § 2.3
block-size trade-off from the location analysis is therefore SHARPER here, in both directions
(see the λ₀ table).

**(c) The floor is a RATIO, and small blocks are immune.** The dispersion drift-reversal point
λ₀ — noise inflation above which a unit's log-accumulator drifts toward the paging threshold:

| K | g_max | λ₀ (homosked peers) | λ₀ (peers ς = 0.5) |
|---|---|---|---|
| 10 | 5.6 | **∞ — immune** | ∞ |
| 30 | 12.9 | **4.14** | 6.26 |
| 100 | 34.8 | 2.38 | 3.67 |
| 300 | 89.4 | 1.76 | 2.31 |

At K = 10 the top-cell log-gain never beats the bottom-cell log-loss: a K = 10 block CANNOT page
a pure-dispersion unit at any inflation, ever. By the N7 identifiability duality, λ₀ is
simultaneously the false-page boundary for a persistently noisy healthy unit AND the detection
floor for a genuinely noisy fault: **at K = 30 the unit family has no power against
variance-inflating faults below ~4× noise** (SDC-style noisy degradation, thermal instability).
Block size is the power dial for this fault class, and it costs validity exactly as it pays.

**(d) The κ_min lever points the OPPOSITE way.** For location, raising κ_min raises δ₀ (N7:
"costing exactly the power you blind yourself to"). For dispersion, raising κ_min 0.05 → 0.2
LOWERS λ₀ from 4.14 to 2.19: dropping the aggressive small-p arm shrinks the bottom-cell
log-penalty (`f(p≈1)` rises from 0.36 to 0.5) faster than it shrinks the top-cell gain. The
A2-κ recommendation ("raise κ_min, it roughly doubles the location horizon") therefore has a
dispersion COST nobody had computed: it increases both false-page risk from noisy-healthy units
and power against noisy faults. The two channels price the same knob in opposite directions.

## 3. ς is estimable, and the ICC gate cannot see it

`estimateDispersion`: per-unit within-variance across rounds (unit-demeaned, so location does
not leak in), then `ς̂² = (Var_u(log v̂_u) − ψ₁((n−1)/2))/4` — the trigamma term is the EXACT χ²
sampling variance of log v̂ and is not small (0.0526 at n = 40, the same order as H2's raw
spread). Backstopped by a measured null floor (0.034), which doubles as the check on the
Gaussian assumption. τ_disp from the lag-autocorrelation of the (un-centred) squared-residual
panel, same machinery as τ.

| scenario | ς̂ | τ_disp | θ̂ (location) | T\*loc | T\*disp | T\* combined |
|---|---|---|---|---|---|---|
| H1 | 0.000 | — | at floor | ∞ | ∞ | ∞ |
| H2 | 0.024 | — | 0.365 | 3 | ∞ | 3 |
| **H8** | **0.308** | **∞** | 0.250 | 5 | **3** | **3** |
| H12 | 0.000 | — | 0.155 | 7 | ∞ | 7 |
| H14 | 0.022 | — | 0.334 | 3 | ∞ | 3 |

- **H8 is confirmed as a genuine two-channel scenario**: its `rackStaticSd` location component
  is real (the pure-dispersion variant's θ̂ falls to the floor, 0.033 — so the published
  θ̂ ≈ 0.2 was location, not leakage), and its dispersion component ς̂ = 0.31 (the 0.5 rack
  knob diluted by the other noise sources) has τ_disp = ∞, set once at init. H8's corrected
  horizon is **T\* ≈ 3, not the published 6** — the understatement the theta-tau report § 7
  predicted, now quantified.
- The location ICC reads a pure-dispersion panel at < 0.05 (leakage via heteroskedastic unit
  means — small, but nonzero; test 6c pins the relation). **A fleet can pass ICC ≲ 4% with
  arbitrary ς.** The design gate needs both numbers.

## 4. First-passage validation (N10: paging, never Λ-by-MC) — and the finding that matters

A/A sweep on the shipped primitives (`horizon-experiment.scoreRound` → `conformalP`,
`calibrator`, onset mixture, `eBhSelect`), all-healthy, every page and selection false. K = 30,
N = 2016, α = 0.001 (Ville budget 2.0), 4 seeds; ς̂/θ̂ measured on each variant's own panel:

| variant | ς̂ | θ̂ | T=40 pages | T=160 | T=320 | eBH sel/run (T=320) | per-test FPR |
|---|---|---|---|---|---|---|---|
| control (no dispersion) | 0.023 | 0.028 | 0.3 | 0.3 | 0.3 | 0.0 | 0.0093–0.0108 |
| H8-disp ς 0.15 | 0.153 | — | — | 0.5 | 0.5 | 0.0 | 0.0099 |
| **H8-dispersion-only** | **0.305** | **0.033 (floor)** | 3.0 | 9.0 | **12.0** | 0.3–0.5 | 0.0093–0.0097 |
| H8-dispersion-2× | 0.607 | 0.035 | 15.5 | 37.8 | **47.3** | **14.8** | 0.0094–0.0100 |

1. **The P1 ∧ P3 signature, channel-isolated.** Per-test FPR is nominal and
   variant-INDEPENDENT everywhere; the dispersion-only fleet — whose location θ̂ sits at the
   estimator floor, so the entire published A2 model predicts NOTHING — breaches its Ville
   budget 6× by T = 320. That is the dispersion drift, measured on the shipped code with the
   location channel physically removed.
2. **The measured breach boundary is ς̂ ∈ (0.15, 0.31)** at T = 320 (0.5 pages vs 12 against a
   budget of 2) — the dispersion analogue of the ICC 6.32–8.36% band. **Design target:
   ς ≲ 0.15**, alongside ICC ≲ 4%.
3. **⚠️ e-BH IS NOT PROTECTED AGAINST THIS CHANNEL.** P8's comfort — "paging fails before FDR;
   e-BH false selections 0.00 in every cell while paging breached 3.3×" — is LOCATION-specific.
   Under dispersion ς̂ = 0.61 the harness measures **14.8 false e-BH selections per run**
   (5.8 already at T = 40), and first nonzero selections appear at ς̂ = 0.31. The mechanism:
   location heterogeneity at realistic θ spreads mild inflation across many units, none reaching
   e-BH's single-rejection threshold N/q; a persistently noisy unit CONCENTRATES its inflation —
   it revisits the extreme cell round after round and its product crosses N/q individually. Put
   the horizon qualifier on BOTH claims for this channel, and treat dispersion as the harder
   threat to Mode-B FDR even though it needs a larger parameter to get there.
4. **The steady-state form under-predicts; the finite-T bulk form is the right one.** P(λ ≥ λ₀)
   predicts 0.00 drift-positive units for the ς̂ = 0.31 fleet, which nevertheless pages 12/run:
   sub-threshold units carry volatility so large (their increments swing between BOTH extreme
   cells) that finite-horizon Lundberg crossings dominate — exactly the bulk term P7 warned the
   steady-state form drops, and it matters far more here than for location. The finite-T
   first-passage prediction (`predictedPagesPerRun`, plain-product barrier) reproduces the 2×
   fleet within 2–4× with exact ordering; it under-predicts the ς̂ = 0.31 fleet ~20× — the
   scalar-ς lognormal compresses the true rack-diluted effective-λ distribution, whose upper
   tail is heavier. Orderings are trustworthy; absolute rates are order-of-magnitude.

## 5. What this changes, operationally

1. **The design target is now a PAIR: ICC ≲ 4% AND ς ≲ 0.15.** Block-key enrichment remains the
   lever for both (same-SKU/firmware/cooling bins homogenise noise scale too), but the two
   numbers are measured by different estimators and the second was previously not measured at
   all. `estimateDispersion` is the fleet instrument, ready for A2-θ-real's probe pilot.
2. **H8's row in every A2 table**: T\* 6 → 3; τ/T\* margin 6× → ~12× (τ_disp = ∞ for the binding
   channel). The N8 conclusion (reversion rescues nothing) gets STRONGER.
3. **Block size and κ_min must now be priced on both channels**, and they point opposite ways:
   small K is immune to dispersion paging but blind to dispersion faults; κ_min up helps
   location validity and hurts dispersion validity. Any retuning of either knob must quote both
   floors (δ₀, λ₀).
4. **The Mode-B FDR claim needs the dispersion qualifier** — this is the first mechanism
   measured anywhere in the program that produces false e-BH selections from HEALTHY units at
   scale. ADR 0023's § 5 residual-risk list should name it.

## 6. Threats to validity

- **The scalar ς compresses a shape.** Real effective-λ distributions (rack-clustered,
  dilution-mapped) are not lognormal; the theory's absolute rates inherited a ~20× tail error at
  ς̂ = 0.31. All conclusions above rest on orderings and on directly-measured paging, not on the
  predicted rates.
- **Trigamma correction assumes Gaussian within-unit noise.** Backstopped by the measured null
  floor (0.034 — if canary-sim's healthy noise were heavy-tailed the floor would be large, and
  a real fleet's floor must be re-measured the same way).
- **Location–dispersion cross-terms are treated as independent** (T\*combined via 1/T\*² sums —
  small-drift logic). H8's channels are on different knobs so this is mild there; a fleet where
  hot units are also noisy units would need the joint g(δ, ν) surface, which the machinery can
  tabulate but nothing here exercises.
- **The substrate is the simulator.** Same status as every A2 number: characterisation of the
  substrate the E1–E5 evidence was produced on, not a fleet measurement.

## 7. Open items after this pass

| id | item | priority |
|---|---|---|
| A2-disp-real | measure ς̂ of real probe scores (same probe pilot as A2-θ-real; the estimator is ready) | high — gated on the 56-day baseline (~08-29) |
| A2-disp-ebh | quantify the e-BH dispersion failure boundary properly (selections vs ς at fixed N, q — the FDR analogue of the ς paging bracket) | medium — the paging bracket already bounds the safe region |
| A2-joint | the joint g(δ, ν) surface for fleets where location and dispersion correlate | low — no current scenario exercises it |
