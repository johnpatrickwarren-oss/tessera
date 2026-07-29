# 2026-07-28 — A2-disp-ebh-horizon: dispersion first-passage risk is FRONT-LOADED in T; the within-rack gate threshold grounded; no N13 at rack count

- **Artifacts:** sweeps in `runs/2026-07-28-a2-disp-ebh-scale/` — `horizon-n2016.*` (fleet scope,
  T → 2560), `horizon-n20160.*` (safe region × horizon), `horizon-withinrack.*`
  (`withinRackHorizon` in `tools/rack-local-conformal.ts` — hand-built iid unit-λ panel over the
  SHIPPED scoring primitives, flagged: the substrate has no within-rack ς knob),
  `n13-rackcount.*` (group channel to 2240 racks). 6 seeds/point (3 for rack count).
- **Closes:** A2-disp-ebh-horizon (scale note § 5) + the rack-scope threshold question ADR 0026
  left as "fleet targets as a first cut" + N13-at-rack-count.

## 1. Horizon: the risk does not keep accumulating (fleet scope, N = 2016)

Seeds with ≥1 false e-BH selection by T (first-selection rounds recorded per seed):

| ς̂ | T=320 | T=640 | T=1280 | T=2560 |
|---|---|---|---|---|
| ≤0.244 | 0/6 | 0/6 | 0/6 | 0/6 |
| 0.305 | 1/6 | 2/6 | 2/6 | 2/6 |

The two events occur at rounds 107 and 410; nothing new appears out to T = 2560. Same shape at
N = 20160: the safe region ς̂ ≤ 0.123 is clean at 4× the original horizon (0/6 at T = 1280,
every low knob). **First-passage risk is FRONT-LOADED**: the ½·geometric-onset prior (γ = 0.99)
gives late onsets vanishing mass, and the product component only decays under the null, so a
fleet that survives its early rounds keeps surviving. Two consequences, honestly bounded:
1. The N13 fleet-size collapse is the ONLY direction that erodes the safe region — horizon
   extension at fixed N does not. The scale note's brackets are T-stable.
2. This is a property of THIS accumulator. An emitter that restarts accumulators, or uses a
   flatter onset prior, re-exposes late-onset risk — re-run this sweep before changing either.

## 2. The within-rack gate threshold, grounded (rack scope, K = 71, N = 2016)

Rack-local blocks cancel rack-SHARED λ; per-unit λ spread within racks is the surviving premise.
Measured (iid unit λ, shipped primitives, T → 2560 — curves are T-flat here too):

| ς_within | seeds w/ e-BH sel (any T) | pages @ T=2560 (budget 2.0) |
|---|---|---|
| 0.10 | 0/6 | 0.8 |
| 0.15 | 0/6 | 1.8 |
| 0.20 | 2/6 | 4.2 |
| 0.30 | 6/6 | 14.0 |

**Both walls sit in (0.15, 0.2] for the within-rack channel at K = 71** — so the rack-scope
monitor's default pair (ICC ≤ 4 %, ς ≤ 0.15) is validated as the right first cut, with a THIN
paging margin (1.8 of 2.0 at the threshold). The tolerance is tighter than the fleet channel's
N = 2016 bracket because whole-rack blocks amplify the dispersion tilt (λ₀ falls with K — P9's
block-dependence, K = 71 vs 30). **K is the relief lever:** if A2-disp-real measures within-rack
ς̂ above ~0.15, drop Krack (K = 23 costs ~0.05 recall at δ = 0.01 per the K-sensitivity table and
buys back dispersion tolerance). That measurement is now explicitly on A2-disp-real's list.

## 3. No N13 at rack count (group channel, A/A, heteroRackSd = 1.0, rack-local blocking)

False groups per run at 280 / 560 / 1120 / 2240 racks (3 seeds each): 0/0/0 · 0/0/0 · 1/0/0 ·
0/1/0 — two runs of twelve show a single false RACK at ≥1120 racks; no growth, no cascade,
false pages well under the Ville budget at every size (worst 20 of 161.3). The rack-shared-λ
mechanism has no analogue one level up here: rack draws are iid ACROSS racks in this substrate
(nothing above the rack shares a multiplier at these knobs), so the extreme-value-with-sharing
structure that reverses the unit channel is absent. Caveat named: leaf/pod-shared effects at
knobs this sweep does not exercise could recreate sharing at group level; the group families
stay EMP-CAL with the studentized-change defenses either way.

## 4. Open after this pass

| id | item | priority |
|---|---|---|
| A2-disp-real | now measures THREE numbers at the gate (~09-21): fleet pair, within-rack pair, and the K decision (drop Krack if within-rack ς̂ ≳ 0.15) | high, gated |
| onset-prior sensitivity | § 1's front-loading is accumulator-specific — sweep alternative onset priors / restart policies before any emitter changes them | low until proposed |
