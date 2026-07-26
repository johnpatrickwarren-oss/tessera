# 2026-07-25 — θ and τ measured: E1's scenario family does not contain the failure mode A2 identifies

- **Artifacts:** `tools/heterogeneity-estimate.ts`; tests `test/heterogeneity-estimate.test.ts` (8).
  Reproduce: `pnpm build && node tools/heterogeneity-estimate.js --json runs/2026-07-25-a2/theta-tau.json`.
- **Closes:** open items **A2-θ** and **A2-τ** from `research/2026-07-25-conjecture-a2-resolution.md` § 7.
- **Substrate:** canary-sim's own healthy DGP, per scenario, one block key, round-demeaned.
  **This is not a fleet measurement** — no real probe data exists (ADR 0023: "no production probe
  runner exists"). It characterises the substrate every E1–E5 number was produced on.

---

## 1. Results

Estimator noise floor θ̂ = 0.0447 (all persistent knobs zeroed, max over 8 seeds; the ICC estimator
clamps at 0 and is upward-biased under the null, so a single draw is not a usable floor).

| scenario | ICC | θ̂ | τ̂ (rounds) | T\*(K=30) | Λ(5) | Λ(60) | Λ(180) |
|---|---|---|---|---|---|---|---|
| H1 stationary-iid | 0.076% | 0.028 | 0.0 | — | — | — | — |
| **H2 correlated** | **11.13%** | **0.354** | **4802** | **3** | **3.83** | >1e6 | >1e6 |
| H3 delayed-slow-drift | 0.076% | 0.028 | 0.0 | — | — | — | — |
| H4 diurnal | 0.073% | 0.027 | 1.0 | — | — | — | — |
| H5 abrupt-benign-step | 0.076% | 0.028 | 0.0 | — | — | — | — |
| H6 workload-mix-change | 0.076% | 0.028 | 0.0 | — | — | — | — |
| H7 scheduler-change | 0.076% | 0.028 | 0.0 | — | — | — | — |
| **H8 heteroskedastic** | **3.97%** | **0.203** | **∞** | **6** | **1.57** | >1e6 | >1e6 |
| H9 missing-irregular | 0.076% | 0.028 | 0.0 | — | — | — | — |
| H10 placement-bias | 0.076% | 0.028 | 0.0 | — | — | — | — |
| H11 interference | 0.076% | 0.028 | 0.0 | — | — | — | — |
| **H12 hidden-stratum** | **1.41%** | **0.120** | **∞** | **9** | **1.17** | >1e6 | >1e6 |
| H13 common-mode-slowdown | 0.076% | 0.028 | 0.0 | — | — | — | — |
| **H14 aging** | **8.08%** | **0.297** | **83** | **4** | **2.61** | >1e6 | >1e6 |

"—" = at or below the noise floor. τ̂ = 0 means the residual has no lag-1 autocorrelation at all,
i.e. the apparent ICC is sampling error, not a persistent component.

---

## 2. Finding 1 — ten of fourteen healthy scenarios contain **no** unit-level persistent heterogeneity

H1, H3, H4, H5, H6, H7, H9, H10, H11, H13 are at the floor with τ̂ ≈ 0. Looking at the knobs, that is
by construction rather than by accident: the E1 family varies `globalDriftPerDay`, `regimeStepDay`,
`commonModeStepDay`, `missingRate`, `placementBias`, `schedulerChangeDay` — every one of which is a
**round-common or fleet-common** effect, and a within-round rank cancels those exactly. Only four
scenarios put a persistent term on an individual unit: `rackStaticSd` (H2, H8, H14),
`hiddenStratumOffset` (H12), `agingSdPerDay` (H14).

So E1's headline — *exact calibration in every scenario, every quarter* — is doing less work than it
appears. For ten of the fourteen there is nothing for the accumulator to compound, and the per-round
result (Λ(1) = 1 exactly) is guaranteed by the A2 identity regardless of θ. **The scenario family was
designed to stress drift and common-mode, which the design defeats by construction. It was not
designed to stress unit-level persistence, which is the thing that breaks the accumulator.**

That is a threat to validity of the E1 table as a whole, not of any individual cell.

## 3. Finding 2 — where persistence exists it is large, and the horizon is short

H2 is ICC 11.1% (θ = 0.354). The A2 resolution's target for a month of horizon was ICC ≲ 0.25%; H2 is
**44× that**, giving T\*(K=30) = 3 rounds. H14 is ICC 8.1%, T\* = 4. H8 and H12 give 6 and 9.

These are not exotic scenarios. H2 is "rack-correlated" — a persistent rack thermal tilt, the most
ordinary heterogeneity a real fleet has.

## 4. Finding 3 — τ ≫ T\* everywhere, so the hoped-for mitigation is absent

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
| A2-host | export canary-sim's host-load state so the interference channel enters θ̂ | high |
| A2-disp | extend the A2 model to persistent *dispersion* heterogeneity (H8's real mechanism) | medium |
| A2-scen | add unit-level-persistence scenarios to the E1 family (it currently has four, all incidental) | medium |
