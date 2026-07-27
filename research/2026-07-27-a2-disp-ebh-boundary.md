# 2026-07-27 — A2-disp-ebh: the e-BH failure boundary under persistent dispersion — and the cascade that reverses the fleet-size protection

- **Artifacts:** `tools/dispersion-ebh-boundary.ts` (sweep harness + first-passage prediction at the
  e-BH barrier), `tools/dispersion-monitor.ts` (the runtime pair-gate monitor this finding makes
  mandatory), the `constructionFamily`/`heterogeneityGatePassing` wiring in
  `tools/emitter-contract.ts`; tests `test/dispersion-ebh-boundary.test.ts` (5),
  `test/dispersion-monitor.test.ts` (9). Sweep artifacts: `runs/2026-07-27-a2-disp-ebh/`.
  Reproduce: `pnpm build && node tools/dispersion-ebh-boundary.js --seeds 4 --nsweep`.
- **Closes:** open item **A2-disp-ebh** from `research/2026-07-26-a2-dispersion.md` § 7. Opens
  **A2-disp-ebh-scale** (below).
- **Method:** A/A only, shipped primitives only (`scoreRound` → `conformalP` → calibrator → ½/½
  accumulator → `eBhSelect` run EVERY round, so first-selection rounds are observed, not
  interpolated). N = 2016, K = 30, q = 0.05, 4 seeds, T to 320. Every selection below is false.

## 1. The boundary, measured

| knob | ς̂ | first sel round (seeds w/ sel) | T=320 sel/run | T=320 pages/run (budget 2.0) |
|---|---|---|---|---|
| 0 | 0.023 | ∞ (0/4) | 0.0 | 0.5 |
| 0.25 | 0.153 | ∞ (0/4) | 0.0 | 0.5 |
| 0.30 | 0.183 | ∞ (0/4) | 0.0 | 0.5 |
| 0.35 | 0.213 | ∞ (0/4) | 0.0 | 1.0 |
| 0.40 | 0.244 | ∞ (0/4) | 0.0 | 1.3 |
| 0.50 | 0.305 | ∞ (0/4) | 0.0 | 2.3 |
| 0.70 | 0.427 | 102.8 (4/4) | 0.3 | 11.3 |
| 1.00 | 0.607 | 37.8 (4/4) | 1.8 | 37.8 |

1. **The e-BH breach onset sits at ς̂ ≈ 0.31–0.43, and at the onset it is a rare event.** This
   seed set: zero selections through ς̂ = 0.305 and all-seeds failure from ς̂ = 0.427. The
   a2-dispersion harness (different seeds, same ς̂ = 0.305 variant) measured 0.3–0.5 sel/run.
   Honest statement: **first false selections appear around ς̂ ≈ 0.31 and are seed-dependent
   (0–0.5/run); failure is robust from ς̂ ≈ 0.43.**
2. **The paging bracket narrows: ς̂ ∈ (0.244, 0.305)** — pages 1.3 vs budget 2.0 at ς̂ = 0.244,
   2.3 at 0.305 (supersedes the (0.15, 0.31) bracket, which had no grid points between).
3. **Rates are burst-dominated.** At ς̂ = 0.607, N = 2016, T = 320, three independent seed sets
   give 1.8 / 3.0 / 14.8 sel/run. Orderings and brackets are stable; any single rate is not. This
   is the § 3 mechanism showing up as variance: the count is set by whether an extreme RACK was
   drawn, not by an accumulation of independent unit events.

The design gate **ς ≲ 0.15 stays comfortably safe at every measured point** — an ~2× margin to the
paging onset and ~2–3× to the e-BH onset, mirroring the ICC gate's margin structure (4% vs
6.32–8.36%).

## 2. The barrier prediction: two orderings hold, kept honest

e-BH's first selection needs max_u e_u ≥ N/q — the paging first-passage problem with barrier
ln(N/q) ≈ 10.6 in place of ln(1/α) ≈ 6.9. So `predictedPagesPerRun(ς, K, N, q/N, T)` predicts the
first-crossing count with no new machinery, and its two orderings are measured facts: predicted
crossings grow with ς, and at equal ς the e-BH wall admits strictly fewer crossings than the paging
wall — which is exactly why P8's location-era "e-BH selections 0.00 everywhere" held as long as it
did. Both are test-locked as relations.

## 3. ⚠️ The fleet-size sweep REFUTES the scalar theory — e-BH's protection weakens with N

The scalar-ς iid first-passage theory says the ln N barrier growth beats the ×N chances: per-unit
and total selections should FALL as the fleet grows. Measured (knob 1.0, ς̂ = 0.607, T = 320):

| N | N/q | first sel round | sel/run | per 1000 units |
|---|---|---|---|---|
| 1008 | 20,160 | 137 | 0.0 | 0.00 |
| 2016 | 40,320 | 31 | 3.0 | 1.49 |
| 4032 | 80,640 | 22.5 | 26.5 | 6.57 |

Selections grow **superlinearly** in N; even the per-unit rate grows; the first selection comes
*earlier*. The iid-λ assumption is false in the shipped substrate — and, per E5/H8's construction,
in real fleets: **λ is a per-rack multiplier shared by all `GPUS_PER_RACK` units.** Two effects
compound:

1. **More units ⇒ more rack draws ⇒ higher P(at least one extreme rack).** The fleet maximum of
   the rack multipliers is an extreme-value statistic in the number of RACKS; the barrier grows
   only like ln N against it.
2. **The step-up cascade.** Once one unit of an extreme rack crosses N/q, e-BH's k-th threshold
   drops to N/(q·k) — and that rack's ~71 same-λ rack-mates are precisely the units queued just
   below the wall. One crossing opens the gate for the whole rack. The "single-rejection threshold
   N/q" framing (P8) understates the failure the moment it is first breached: the protective
   threshold is only as strong as the no-first-crossing event.

The location channel has the OPPOSITE fleet-size behavior (P8: the protective gap widens with N,
because location heterogeneity at realistic θ spreads inflation across many units none of which
approach N/q). For dispersion, **scale is not protection; scale is exposure.** Operationally: never
argue "our fleet is large, so N/q is far away." The ς ≲ 0.15 gate is the protection, and it must be
*enforced*, which is what `tools/dispersion-monitor.ts` now does (§ 4).

Threat to validity, named: the N-sweep is 2 seeds per point and burst-dominated (§ 1.3), so the
superlinear *magnitudes* are order-of-magnitude; the reversal itself (0 → 3 → 26.5, monotone, with
first-selection time falling) and its mechanism (rack-shared λ + step-up, both structural facts of
the substrate) are the finding. The prediction column keeps its ς/barrier orderings and is marked
wrong in the N direction — the a2-dispersion report's § 6 "scalar ς compresses a shape" threat, now
with a measured consequence.

## 4. Operational consequence: the pair gate is now enforced in code

`EmitterContract` gains `constructionFamily` ('contrast' | 'conformal_rank') and
`heterogeneityGatePassing`. A `conformal_rank` emitter — **in either FDR-bearing class, including
theorem_valid**, since the Lean-proved per-round rank e-value says nothing about accumulation — is
FDR-bearing only with a currently-passing heterogeneity gate; undefined means unmeasured means not
passing, the same rule as the calibration monitor. `tools/dispersion-monitor.ts` computes the gate:
round-demeaned believed-healthy panel → `estimateIcc` + `estimateDispersion` against the pair
targets (ICC ≤ 4%, ς ≤ 0.15), decided after ≥ 20 rounds, sticky demotion, rearm = fresh monitor.
This is a PLUG-IN gate (false-demotion not Ville-controlled — thresholds sit 4–5× above the
measured instrument floors), and it is the runtime semantics of Correction 2's missing
validity-class rung: *admitted while the measured drift preconditions hold*. The contrast family
is untouched. The pooled-marginal monitors remain provably blind to this premise (β = 1); this
panel estimator pair is the only instrument that sees it.

## 5. Open after this pass

| id | item | priority |
|---|---|---|
| A2-disp-ebh-scale | the e-BH onset ς̂ vs fleet size: at 10k–100k GPUs the extreme-rack statistics can only pull the onset DOWN from 0.31 — bracket it at ≥ 10k units (needs the big-run budget; the ς ≲ 0.15 gate's ~2× margin is the interim protection) | medium |
| A2-disp-real | ς̂ of real probe scores — the probe pilot measures BOTH gate numbers (`estimateDispersion` + `estimateIcc`) on real telemetry | high — gated on the 56-day baseline (~09-21 after the mini outage found 2026-07-27) |
| A2-joint | joint g(δ, ν) surface | low — unchanged |
