# 2026-07-25 — θ and τ measured: E1's scenario family does not contain the failure mode A2 identifies

> ## ⚠️ SUPERSEDED IN PART, 2026-07-26 (A2-host closed). READ THIS FIRST.
>
> Every θ̂ and ICC figure below was produced by an estimator that **mirrored** `canary-sim.execScore`
> instead of calling it, and the mirror was wrong in **two** independent ways, both biasing θ̂ DOWN:
>
> 1. it omitted `interferenceCoef · hostLoad(...)` entirely (this report's own § 7 threat, now
>    confirmed and closed);
> 2. it used `GEN_SIGMA = 0.010` — generation **one**'s noise scale — for a generation-**zero**
>    block, overstating within-unit noise by 25% and so deflating the ICC denominator.
>
> `healthyPanel` now delegates to `canary-sim.healthyScorePanel`, which calls the real `execScore`.
> **What changed, and what did not:**
>
> | | old (mirrored) | corrected |
> |---|---|---|
> | original-family scenarios with persistence | 4 (H2/H8/H12/H14) | **6** — H10 and H11 join, the two largest `interferenceCoef` |
> | H16 "mild" ICC | 1.0% | **1.49%** |
> | H15 "at-target" ICC | 9.3% | **12.40%** |
> | H17 "severe" ICC | 26.5% | **32.97%** |
> | H8 margin τ/T\* | > 10× | **6×** (host load adds a fast-reverting component) |
>
> **The DGP did not move and no paging result changed** — the simulation always included
> interference. What was wrong is the ICC *axis* those results were plotted against; it was
> compressed by ~1.3–1.5×. The figures were internally consistent, so the conclusions below survive
> in shape. The risk was never internal: it was that anyone comparing these ICCs against a fleet
> number measured with a correct estimator would have been misled by ~1.4× — which is exactly what
> the still-open A2-θ-real would have run into.
>
> § 2's headline ("ten of fourteen"), § 4's "τ ≫ T\*" margin, and every ICC in § 1 are the parts to
> distrust. § 5 (horizon) and § 6 (what this licenses) are unaffected.

- **Artifacts:** `tools/heterogeneity-estimate.ts`; tests `test/heterogeneity-estimate.test.ts` (8).
  Reproduce: `pnpm build && node tools/heterogeneity-estimate.js --json runs/2026-07-25-a2/theta-tau.json`.
- **Closes:** open items **A2-θ** and **A2-τ** from `research/2026-07-25-conjecture-a2-resolution.md` § 7.
- **Substrate:** canary-sim's own healthy DGP, per scenario, one block key, round-demeaned.
  **This is not a fleet measurement** — no real probe data exists (ADR 0023: "no production probe
  runner exists"). It characterises the substrate every E1–E5 number was produced on.

---

## 1. Results

**TABLE REPLACED 2026-07-26 (N11).** These are the figures from the CORRECTED estimator, which calls
`canary-sim.execScore` instead of mirroring it. The originally-published table is preserved in git
history at the commit that added this report; it should not be quoted.

Estimator noise floor θ̂ = 0.0442 (all persistent knobs zeroed, max over 8 seeds; the ICC estimator
clamps at 0 and is upward-biased under the null, so a single draw is not a usable floor).

| scenario | ICC | θ̂ | τ̂ (rounds) | T\*(K=30) | Λ(5) | Λ(60) | Λ(180) |
|---|---|---|---|---|---|---|---|
| H1 stationary-iid | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| **H2 correlated** | **10.81%** | **0.348** | **400.9** | **3** | **3.68** | >1e6 | >1e6 |
| H3 delayed-slow-drift | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| H4 diurnal | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| H5 abrupt-benign-step | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| H6 workload-mix-change | 0.461% | 0.068 | 1.0 | — | — | — | — |
| H7 scheduler-change | 0.436% | 0.066 | 1.0 | — | — | — | — |
| **H8 heteroskedastic** | **3.94%** | **0.203** | **37.0** | **6** | **1.57** | >1e6 | >1e6 |
| H9 missing-irregular | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| **H10 placement-bias** | **0.81%** | **0.091** | **∞** | **12** | **1.09** | >1e6 | >1e6 |
| **H11 interference** | **1.27%** | **0.114** | **∞** | **10** | **1.15** | >1e6 | >1e6 |
| **H12 hidden-stratum** | **1.98%** | **0.142** | **38.2** | **8** | **1.25** | >1e6 | >1e6 |
| H13 common-mode-slowdown | 0.000% | 0.0000 | 0.0 | — | — | — | — |
| **H14 aging** | **9.42%** | **0.322** | **46.7** | **4** | **3.09** | >1e6 | >1e6 |

"—" = at or below the noise floor (θ̂ ≤ 1.5·floor, or τ̂ ≤ 2). **H6 and H7 sit above the θ floor
(0.068, 0.066) but fail on τ̂ = 1.0** — interference-driven heterogeneity with no persistence is
exactly what a fast-reverting host-load channel produces, and it is correctly excluded. H10 and H11,
with the same channel at larger `interferenceCoef`, do persist.

---

## 2. Finding 1 — ten of fourteen healthy scenarios contain **no** unit-level persistent heterogeneity

> ⚠️ **SUPERSEDED — it is EIGHT of fourteen.** H10 and H11 cross the floor on the corrected axis (see
> the banner at the top). They are the two scenarios with the largest `interferenceCoef`, i.e. exactly
> the ones § 7's threat-to-validity predicted. The rest of this section's reasoning stands.

**H1, H3, H4, H5, H6, H7, H9, H13** are at the floor (H6/H7 clear the θ floor but fail on τ̂ = 1.0 —
fast-reverting host load, no persistence). Looking at the knobs, that is by construction rather than
by accident: the E1 family varies `globalDriftPerDay`, `regimeStepDay`, `commonModeStepDay`,
`missingRate`, `placementBias`, `schedulerChangeDay` — every one of which is a **round-common or
fleet-common** effect, and a within-round rank cancels those exactly.

Six scenarios put a persistent term on an individual unit: `rackStaticSd` (H2, H8, H14),
`hiddenStratumOffset` (H12), `agingSdPerDay` (H14), and — via `interferenceCoef · hostLoad`, which
carries a persistent per-HOST component the original analysis overlooked — **H10 and H11**.

So E1's headline — *exact calibration in every scenario, every quarter* — is doing less work than it
appears. For eight of the fourteen (ten as first measured — see the § 2 banner) there is nothing for
the accumulator to compound, and the per-round
result (Λ(1) = 1 exactly) is guaranteed by the A2 identity regardless of θ. **The scenario family was
designed to stress drift and common-mode, which the design defeats by construction. It was not
designed to stress unit-level persistence, which is the thing that breaks the accumulator.**

That is a threat to validity of the E1 table as a whole, not of any individual cell.

## 3. Finding 2 — where persistence exists it is large, and the horizon is short

> ⚠️ **HALF-SUPERSEDED (N11).** "The horizon is short" survives everywhere. "It is large" does NOT:
> H10 (0.81%) and H11 (1.27%) are real but modest, and they are the two scenarios the corrected
> estimator added. Persistence at the 1% level is now known to exist in the family, and it is the
> level the design target sits at — so this section's reassurance that persistence is either absent
> or unmistakable is the part to drop.

H2 is ICC 10.8% (θ = 0.348). The A2 resolution's target for a month of horizon was ICC ≲ 0.25%; H2 is
**43× that**, giving T\*(K=30) = 3 rounds. H14 is ICC 9.4%, T\* = 4. H8 and H12 give 6 and 8;
H10 and H11 give 12 and 10.

These are not exotic scenarios. H2 is "rack-correlated" — a persistent rack thermal tilt, the most
ordinary heterogeneity a real fleet has.

## 4. Finding 3 — τ > T\* everywhere, so the hoped-for mitigation is absent

> ⚠️ **MARGIN NARROWED (N11).** Still true, by less. On the corrected axis the binding case is H8 at
> **τ/T\* = 6×** (37 vs 6), not the ≥ 20× reported below — host load contributes a fast-reverting
> component that pulls the fitted τ of a mixed-channel scenario down. The conclusion is unchanged;
> the headroom is not. Corrected τ̂: H2 400.9, H8 37.0, H10 ∞, H11 ∞, H12 38.2, H14 46.7.

The one plausible reason the true horizon might be longer was mean reversion: if offsets revert on
timescale τ, the exponent in `E[g^T]` is `min(T,τ)` rather than `T`. Measured, τ̂ is 4802 rounds (H2),
∞ (H8, H12) and 83 (H14) — in every case ≥ 20× the corresponding T\*. `rackStatic`, the hidden
stratum and the aging slope are all set once at initialisation and never revert; H2's mean-reverting
`rackOu` component (τ = 8 h) is swamped by the static one.

**A2-τ closes negative.** The exponent is T.

## 5. Finding 4 — E1 ran just inside the horizon, and production does not

At the sentinel budget a unit receives ~0.09 probe executions/day, so its e-process accumulates:

| β | 60 d | 1 year | 3 years |
|---|---|---|---|
| 0.05% | **5.4** | 33 | 99 |
| 0.1% | 10.8 | 66 | 197 |
| 0.2% | 21.6 | 131 | 394 |
| 1.0% | 108 | 657 | 1971 |

E1's entire 60-day horizon is **T ≈ 5 rounds per unit**. Compare T\*: H2 = 3, H14 = 4, H8 = 6,
H12 = 9. E1 ran at or just past the horizon in its worst scenarios — Λ(5) = 3.8 in H2, meaning the
FDR guarantee was already inflated ~4× — and the experiment had almost no power to notice, because
the paging threshold is 1/α = 1000 and a 5-increment product essentially never reaches it. The
measured "0.2–0.8 false pages/run vs a Ville budget of 10.4" is a coverage-limited number, not a
calibration result.

Extend to a year at the same budget and it is 33 rounds, where Λ > 10⁶ in all four scenarios.

**This reverses the direction of the E1 evidence.** It is not that calibration held under
nonstationarity; it is that the experiment was too short, on a substrate too homogeneous, to test the
thing that breaks. And the design pressure runs the wrong way: everything that improves the
program — higher β, escalation (E4 concentrates executions precisely on suspect units), longer
deployment — increases T and therefore the inflation.

---

## 6. What this does and does not license

**Does:** retire "exact finite-sample conformal validity held in all 14 nonstationarity scenarios" as
evidence for the *accumulated* guarantee. It is evidence for the per-round guarantee, which was never
in doubt and which the A2 identity proves unconditionally.

**Does not:** claim the real fleet has H2-like ICC. Nobody knows. What it does say is that the
smallest ICC in the four scenarios that model unit persistence at all (H12, 1.4%) is already 5× the
level that would give a month of horizon.

## 7. Threats to validity of this measurement

- **The interference channel is not modelled.** `interferenceCoef · hostLoad(...)` has a persistent
  per-host component; canary-sim's host-load process is not exported. Every θ̂ here is a **lower
  bound**, and specifically for H6/H7/H10/H11 — which are four of the ten scenarios reporting no
  measurable heterogeneity. Closing this needs canary-sim to export its host-load state.
  → **CONFIRMED AND CLOSED 2026-07-26.** This threat was correctly identified and correctly aimed:
  H10 and H11 did cross the floor once the channel entered (H6/H7 did not — they fail on τ, not θ).
  Worth noting what the threat statement missed, though: it framed the problem as an unexported
  *state*, when the actual problem was a *duplicated model*. Fixing the framing found a second bias
  in the same file that nobody had suspected.
- **Dispersion heterogeneity is out of model.** H8's `rackNoiseMult` makes some units persistently
  *noisier* at equal mean. The A2 analysis covers location offsets only; a persistently noisier unit
  occupies rank extremes more often by a different mechanism (the program report names this at group
  level, § 3.1 item 3). H8's θ̂ = 0.203 captures only its `rackStaticSd = 0.003` component, so H8 is
  understated by an unknown amount.
- **Execution timing.** Round spacing is the measured β=0.05% median revisit (132 h) with uniform
  jitter. A first version used 24 h spacing, which pins every execution to the same diurnal phase and
  silently reported θ(H4) = 0; the jitter is now load-bearing and tested.
- **The substrate is the simulator, not a fleet.** Stated at the top, restated here.

## 8. Open items after this pass

| id | item | priority |
|---|---|---|
| A2-θ-real | ICC of real probe scores after block-keying — needs the probe pilot; nothing here substitutes | **high** |
| A2-E1b | re-run E1 at T ≫ T\* (extend horizon or raise β) and check the predicted Λ inflation appears | **high — the decisive experiment, and it is cheap** |
| ~~A2-host~~ | ~~export canary-sim's host-load state so the interference channel enters θ̂~~ — **CLOSED 2026-07-26.** Resolved by deleting the mirror rather than exporting the state: `healthyPanel` now calls the real `execScore` via `canary-sim.healthyScorePanel`. Found a second, independent downward bias in the process (gen-1 noise scale used for a gen-0 block). See the banner at the top of this report. | ~~high~~ done |
| A2-disp | extend the A2 model to persistent *dispersion* heterogeneity (H8's real mechanism) | medium |
| A2-scen | add unit-level-persistence scenarios to the E1 family (it currently has four, all incidental) | medium |
