# 2026-07-25 — Conjecture A2, resolved: persistent heterogeneity gives the canary guarantee a finite validity horizon

- **Artifacts:** `tools/exchangeability-drift.ts`; tests `test/exchangeability-drift.test.ts` (11).
  Reproduce with `pnpm build && node tools/exchangeability-drift.js --json runs/2026-07-25-a2/a2-drift.json`
  (`runs/` is gitignored — the *tests* are what pin the numbers, including the tilt coefficient, the
  divergence bracket, and the Monte-Carlo agreement).
- **Follows:** `research/2026-07-25-formal-statements-adaptivity-and-gating.md` § 1.4 (Conjecture A2).
- **Verdict:** the conjecture as stated is the **wrong question**. The right statement is sharper,
  provable in a few lines, and considerably less comfortable.
- **⚠️ CORRECTION (2026-07-25, same-day — A2-E1b horizon experiment,
  `research/2026-07-25-a2-e1b-horizon-experiment.md`):** the identity (★) and every claim about the
  *bound* below stand and were directly confirmed (per-test FPR nominal at horizons out to T=320;
  paging grows with T only where θ > 0, zero at every horizon in the iid control). But **§ 2 and § 3
  below read as though Λ(T) were the realised error rate, and it is not.** Λ is dominated by δ-tail
  mass at probabilities far below 1/N, so no fleet-sized sample can realise it: measured on an A/A
  fleet at ICC 15%, the anytime paging rate breaches its Ville budget from T ≈ 100 rounds and reaches
  3.3× at T = 320 — against a bound of >10⁶. e-BH's FDR bound is simply not tight under this failure
  mode, and per-family FDR selections stayed at **zero** in every cell. `T* ≈ 0.592/θ` is the horizon
  at which the BOUND doubles; the operational horizon is ~30× longer. Read § 4 of the E1b report for
  the corrected statement.

---

## 1. The reframing

A2 was posed as *approximate exchangeability ⇒ bounded e-value inflation, `E[f(p)] ≤ 1 + cε`*.
That premise does not describe the failure.

Under the canary design — iid persistent offsets, peers freshly randomised every round — the round-`t`
block is **exactly** exchangeable and the shipped randomised rank
`p = (#{peers > y} + U·(1 + #ties))/(K+1)` (canary-sim.ts:374) is **exactly** `Unif[0,1]`. Measured:
`Λ(1) = 1.0000` at every heterogeneity level tested, for `K ∈ {30, 100, ∞}` (test 1). Nothing is
approximate per round. There is no `ε`.

The failure is **entirely serial**. Write `δ` for a unit's persistent offset in per-execution-noise
units, and

```
g(δ) = E[ f(p) | δ ]          the conditional increment mean
```

Then `E_δ[g(δ)] = 1` — that *is* the per-round validity — but the accumulator's null mean is

> **(★)   E[M_T] = E_δ[ g(δ)^T ] =: Λ(T)**

and by Jensen `Λ(T) > 1` **strictly** for `T ≥ 2` unless `g` is a.s. constant, i.e. unless there is
no persistent heterogeneity at all. The increments are marginally valid and conditionally invalid,
and the product accumulates precisely that gap.

This is the mechanism the program report measured at **group** level (§ 3.1 item 3: persistently
tilted racks occupy the extreme rank daily, `E[increment | past] > 1`, ~4 false racks/run) and
asserted benign at **unit** level (*"per-exec noise dominates unit-level benign heterogeneity, so
mild persistent unit offsets do not compound"*). (★) makes the unit-level claim checkable, and the
answer is that it compounds — just on a timescale nobody had computed.

### 1.1 The theorem (model-free)

> **Proposition A2.** Let `δ_u` be `u`'s persistent state and suppose that, conditional on `δ_u`, the
> per-round calibrated increments `f(p_{t,u})` are i.i.d. (fresh randomisation, fresh peers, fresh
> execution noise). Let `g(δ) = E[f(p)|δ]`. Then
>
> 1. **per-round validity** `E_δ[g] = ∫₀¹ f = 1` whenever the unconditional score law is exchangeable
>    across units;
> 2. **accumulation** `E[M_T] = E_δ[g(δ)^T] = Λ(T)`;
> 3. `Λ` is non-decreasing in `T` and `Λ(T) ≥ 1`, strictly for `T ≥ 2` unless `Var(g) = 0`;
> 4. **FDR** — feeding `M_T` to e-BH controls `FDR ≤ q·Λ(T)`, by e-BH's scale invariance
>    (`e-BH(e/μ,q) ≡ e-BH(e,q/μ)`, N3);
> 5. **paging** `P(∃t ≤ T : M_t ≥ 1/α) ≤ α·E_δ[max(1,g(δ))^T]`, via conditional Ville on the
>    martingale `M_t/g(δ)^t`.

Point 4 is the useful one: `Λ(T)` is not a bound, it is the **exact inflation factor**, and it can be
pre-deflated — run e-BH at `q/Λ(T)` and the guarantee is restored at a power cost.

**The shipped ½/½ accumulator is covered.** `E[½∏_{1..T} + ½Σ_j w_j ∏_{j..T}] = ½Λ(T) + ½Σ_j w_j Λ(T−j+1)`,
and `Λ(k)` is non-decreasing in `k` for `k ≥ 1` by Lyapunov (given `E[g] = 1`), so `Λ(T)` is a valid
upper bound for the ADR 0023 accumulator, not just for the plain product.

---

## 2. A worked model, and the numbers

`Y = δ + Z`, `Z ~ N(0,1)`; peers freshly drawn with offsets `~ N(0,θ²)`, so a peer score is `N(0,s²)`,
`s² = 1+θ²`; one-sided high-is-bad rank against `K` peers exactly as shipped. **`θ = σ_pers/σ_exec`** —
the persistent idiosyncratic share after block-keying, the single quantity § 1.3 of the
formal-statements doc identified as the thing both Gap A and Gap A2 reduce to.

`θ` is estimable: the intraclass correlation of healthy scores is `ICC = θ²/(1+θ²)`.

| θ | ICC | Λ(1) | T_div (κ_min=.05) | T\* (K=30) | T\* (K=100) | T\* (K=∞) |
|---|---|---|---|---|---|---|
| 0.02 | 0.04% | 1.0000 | 132.6 | 57 | 49 | 29 |
| 0.05 | 0.25% | 1.0000 | 22.1 | 22 | 19 | 11 |
| **0.10** | **0.99%** | **1.0000** | **6.3** | **11** | **10** | **5** |
| 0.15 | 2.20% | 1.0000 | 3.4 | 7 | 6 | 3 |
| 0.20 | 3.85% | 1.0000 | 2.4 | 6 | 5 | 2 |
| 0.30 | 8.26% | 1.0000 | 1.6 | 4 | 3 | 1 |

`T*` = largest `T` with `Λ(T) ≤ 2` (i.e. before the FDR guarantee has silently doubled).

**The headline: a 1% intraclass correlation in healthy canary scores buys about ten rounds.** At
daily rounds that is a ten-day validity horizon, after which the unit family's "EXACT-FS" label is
false by a factor that keeps growing. Getting a *month* of horizon requires ICC ≲ 0.25%.

Validation: an independent Monte-Carlo of the shipped rank construction reproduces `Λ(T)` to within
3% (test 5). That MC has to be Rao-Blackwellised over the tie/jitter draw, because the raw increment
has **infinite variance** — `E[f(U)²] = ∫p^{2κ−2}dp` diverges for `κ < 0.5`, so a naive Monte-Carlo of
`f(p)` does not converge at all. Worth knowing before anyone tries to measure this empirically the
obvious way.

### 2.1 Small-θ law

For small `θ`, `log g(δ) ≈ Aδ` with the tilt coefficient `A = ∫f(p)Φ⁻¹(1−p)dp = 1.9893`, so

```
Λ(T) ≈ exp(A²θ²T²/2)        T* ≈ √(2 ln 2)/(A θ) = 0.592/θ
```

**quadratic in `T` in the exponent** — the drift is not a slow per-round leak, it is a `T²` blow-up.
Predicted vs numeric agrees to <2% (test: θ=0.02,T=12 → 1.1207 vs 1.1133). Note `T* ∝ 1/θ`, not `1/θ²`.

### 2.2 Divergence in the large-block limit

For large `δ` the calibrator's smallest arm dominates and `log g(δ) ~ aδ²/(2(1−a))`,
`a = (1−κ_min)/(1+θ²)`. Against a Gaussian prior on `δ` the integral in (★) **diverges outright**:

```
T_div = κ_min/((1−κ_min)θ²) + 1/(1−κ_min)
```

So with unbounded heterogeneity and the `κ = 0.05` arm, `E[M_T] = +∞` after ~6 rounds at `θ = 0.1`.
Bracketed numerically in test 3 (finite just below, divergent just above).

This is a large-block idealisation — see § 2.3 — but it is the right diagnosis of *why* the growth is
so violent: the calibrator's most aggressive arm is exactly the one that converts a Gaussian tail on
`δ` into a divergent moment.

### 2.3 Finite blocks cap it — and the min-p floor is a validity property after all

With `K` peers the conditional increment mean is bounded:

```
g(δ) ≤ g_max(K) = (K+1)·mean_κ (K+1)^{−κ}
K=10: 5.6   K=30: 12.9   K=100: 34.8   K=300: 89.4   K=1000: 257.4
```

so `Λ(T) ≤ g_max(K)^T` — always finite, no divergence, and **smaller blocks are safer** (test 4:
`T*(K=30) ≥ T*(K=100) ≥ T*(K=∞)`, and the gap is roughly 2× at θ=0.1).

This inverts a standing framing. Program report § 3.1 item 4 says *"the min-p floor is a power law,
not a validity law."* It is **both**, and in opposite directions: pooling more contemporaneous
executions buys resolution in the tail and costs validity horizon. The block-size choice is a genuine
two-sided trade-off, not a one-way power dial.

---

## 3. What to do about it

Four levers, in descending order of how much I would trust them:

1. **Enrich the block key** — this is what block keys are *for* (SKU/firmware bins), and it now has a
   quantitative target rather than a qualitative one: drive ICC below 0.25% for a month of horizon.
   The report already names block-key enrichment as the answer to H12 hidden strata; this says how
   much enrichment is enough.
2. **Raise `κ_min`.** Dropping the 0.05 arm roughly doubles the horizon (θ=0.1, K=∞: `T*` 5 → 12 as
   `κ_min` goes 0.05 → 0.2; `T_div` 6.3 → 26.2). The cost is power against very extreme single-round
   `p`, which at sentinel coverage is not where the program's power comes from anyway — E2 showed
   power comes from *aggregation over rounds*, and that is precisely what the drift attacks. This
   looks like a favourable trade and it is a one-line change.
3. **Cap block size** rather than pooling maximally, accepting the min-p resolution cost.
4. **Publish the horizon.** Rotate or reset accumulators every `T*` rounds and state the guarantee as
   horizon-limited: *FDR ≤ q for `T ≤ T*(θ̂, K, κ_min)`, `θ̂` re-estimated from A/A runs.* This is
   weaker than the current text and it is true.

**What not to do:** studentise unit scores against their own lagged reference. It is the obvious fix
(it is what rescued the group families) and it is closed — § 8b Finding 4 measured that an estimated
per-unit reference reintroduces the N1/ADR-0013 pathologies from both ends (masking at sparse
coverage, plug-in `σ̂` compounding at dense). The group families paid for that fix by becoming
EMP-CAL; the unit family cannot pay the same price without losing the thing that makes it valuable.

---

## 4. Consequences for the rest of the programme

- **Gap A (adaptivity) is quantitatively bounded by the same number.** § 1.3 of the formal-statements
  doc argued that suspect-enriched drafting breaks conditional exchangeability *only via* persistent
  components — if `θ = 0`, enrichment is harmless. `θ` is now measured-and-computable, so the
  adaptivity risk and the accumulation risk share one estimable parameter.
- **The E4 result is explained.** Suspect-enriched drafts showed per-test rate 0.0082 (conservative)
  with FDP 0.144 (≈3q). Exactly the (★) signature: per-round calibration intact or better, damage
  entirely in the accumulator.
- **Gap B interacts badly.** The runtime uniformity monitor tests the pooled *marginal* `p`
  distribution, which under (★) is **exactly uniform at every θ**. So the monitor is provably blind to
  this failure mode — not weakly powered, blind, by the same identity that makes Λ(1) = 1. The
  monitor's miss rate `β` against persistent-heterogeneity drift is 1. That is a stronger statement
  than § 2.3 of the formal-statements doc conjectured, and it means the `max(q, β)` guarantee gives
  nothing here.
- **ADR 0023's EXACT-FS label needs a horizon qualifier.** The unit family is exact per round and
  horizon-limited across rounds. The class lattice has no rung for that.

---

## 5. Lean-readiness

Proposition A2 (1)–(3) is now a much better formalisation target than the original conjecture: it is
finite-dimensional, needs no approximate-exchangeability machinery, and reduces to Jensen plus the
tower property. (4) needs the e-BH scale-invariance lemma, which is on the § 4 list of the
formal-statements doc anyway. (5) needs conditional Ville — `Filtration` + `Supermartingale` +
`maximal_ineq`, all present in Mathlib.

Estimate: (1)–(3) is a week on top of the e-value/calibrator definitions; it does not need the
supermartingale chain. Recommend doing it *before* the Prop A4 work, since it is smaller and it is
the statement that actually changed the product claim.

---

## 6. Threats to validity of this analysis

- **Gaussian location model.** (★) is model-free; every *number* in § 2 is not. Heavier-tailed
  persistent offsets make it worse (fatter `g` tail); bounded offsets make it better.
- **`δ` is treated as constant over the horizon.** If persistent offsets mean-revert on timescale
  `τ`, the effective exponent is `min(T, τ)`, not `T` — a real mitigation that the model omits and
  that would *lengthen* the true horizon. Measuring the autocorrelation timescale of unit-level
  score offsets is the obvious follow-up, and it is cheap.
- **Peers assumed freshly drawn each round.** Availability constraints correlate peer sets across
  rounds; direction of the effect not analysed.
- **Single probe channel.** The shipped calibrator averages across channels
  (`0.5·(calibrator(p) + calibrator(pErr))`), which reduces per-round variance and therefore the
  spread of `g` — likely mildly favourable, not modelled.
- **`θ` for the real fleet is unknown.** Everything above is a function of a number nobody has
  measured. That measurement is the open item.

## 7. Open items

| id | item | priority |
|---|---|---|
| A2-θ | measure ICC of healthy canary scores after block-keying (A/A runs); derive `T*` | **high — every number here is a function of it** |
| A2-τ | measure the autocorrelation timescale of unit offsets; replaces `T` by `min(T,τ)` | high — the one plausible reason the horizon is longer than computed |
| A2-κ | evaluate `κ_min = 0.2` end-to-end: horizon vs detection delay on the E2 fault grid | high — cheap, likely favourable |
| A2-B | retire the "monitor catches design breaks" claim for this failure mode (β = 1 by (★)) | high — it is currently load-bearing in ADR 0023 § 5 |
| A2-K | fold the validity-horizon cost into the block-size/window choice (currently power-only) | medium |
| A2-cls | add a horizon-limited rung to the validity-class lattice | medium |
