# The Lean formalisation: the validity chain is machine-checked end to end

**2026-07-26.** This is the report the `lean/` file headers cite. It records (§ 1) what is now
proved and how the proof is shaped, (§ 2) how each STATEMENT was validated numerically against the
shipped implementations before being proved — the part Lean does not protect against, (§ 3) the
statement-level bugs that proving found and simulation had passed, and (§ 4) what remains open.

Build state as of this report: **the whole `lean/` tree is SORRY-FREE** — `lean/core`,
`Tessera/EValue.lean`, `Tessera/EBH.lean`, and `Tessera/Conformal.lean` §§ 1–2 (Proposition A2
included, proved the same day in a third pass on the honest kernel model; see § 1b below).
Toolchain Lean 4.32.1 + Mathlib v4.32.1, `cd lean && lake build`.

## § 1 — What is proved

The headline is the composition, not any single lemma:

```
exchangeable block scores  +  independent Unif[0,1] jitter        (design hypotheses, H-EX)
  → the randomised conformal rank is EXACTLY Unif[0,1]            Conformal.rank_uniform
  → super-uniform                                                  Conformal.rank_superUniform
  → an antitone calibrator of it is an e-value                     EValue.calibrate_isEValue
      (composed: Conformal.calibrated_rank_isEValue)
  → mixtures of such e-values are e-values                         EValue.convexMean / tsum_convexMean
  → e-BH over them controls FDR ≤ q under ARBITRARY dependence     EBH.fdr_le
```

No step between the design hypotheses and the FDR bound is informal any more. The scope that must
travel with the claim shrinks accordingly: what is NOT machine-checked is (a) that the probe
scheduler actually delivers exchangeability — H-EX is a contract about the system, deliberately not
formalised (see `lean/README.md`, deliberate omissions); and (b) the A2 accumulation question
(§ 2 of `Conformal.lean`): per-round validity does not survive serial products under persistent
heterogeneity, which remains prose + simulation (N7/P6–P8).

### The shape of the `rank_uniform` proof

Distribution-free, tie-robust, no continuity assumption anywhere — the jitter does all the work,
which is the design's whole point. Two layers:

1. **Deterministic core** (`sum_clamp_eq` → `sum_vol01_looRank`): for EVERY fixed score vector
   `y` and level `α`, the jitter measures of the K+1 leave-one-out sublevel events sum EXACTLY to
   the clamped level: `Σⱼ λ{u ∈ [0,1] | looRank j y u ≤ α} = clamp₍₀,K+1₎(α(K+1))`. Per tie-class
   the jitter mass is an affine clamp; the classes' rank blocks `[Eᵥ, Eᵥ+Cᵥ)` tile `[0, K+1)`
   exactly (disjointness = the exceedance counts of distinct values nest; coverage = a counting
   bijection); unit clamps telescope (`clamp_add`). Pure `Finset` combinatorics plus 1-D Lebesgue
   measure.
2. **Exchangeability transport** (`prod_looRank_mass`): on the canonical space
   `(Fin (K+1) → ℝ) × ℝ` with any permutation-invariant score law ν, each leave-one-out sublevel
   event has the same mass — transport along `(y, u) ↦ (y ∘ swap 0 j, u)` — so `(K+1)·P(rank ≤ α)`
   equals the deterministic identity integrated over ν, which is constant. Divide by K+1; the CDF
   is `clamp₍₀,1₎(α)` for every real α, hence the law is exactly `Unif[0,1]` (`ext_of_Iic`).

The `looRank` family is defined with the peer list threaded through `Equiv.swap 0 j` precisely so
that `looRank j y u = looRank 0 (y ∘ swap 0 j) u` holds definitionally-up-to-`swap_self`, which is
the form the measure transport consumes.

### `calibrate_isEValue`

Layer-cake on BOTH sides: `E[f(p)] = ∫₀^∞ P(f(p) > t) dt`; for each level `t > 0`, with
`s_t := sSup {x ∈ [0,1] | f x > t}`, antitonicity gives `{f(p) > t} ⊆ {p ≤ s_t}`, super-uniformity
caps that by `s_t`, and `[0, s_t) ⊆ {x ∈ [0,1] | f x > t}` turns `s_t` into the Lebesgue measure of
the same level set of `f` — integrate to recover `∫₀¹ f = 1`. Two structural points worth keeping:
integrability of `f` is not assumed but FORCED by `∫₀¹ f = 1` (Mathlib's interval integral of a
non-integrable function is the junk value 0 ≠ 1), and the argument runs in `ℝ≥0∞` throughout,
returning to `ℝ` once finiteness is established — the same junk-value-safe pattern as
`tsum_convexMean_isEValue`.

### `supAdjuster_integral`

`∫₁^∞ (√e−1)/e² de = 1` — an `rpow` computation (`x^(−3/2) − x^(−2)` integrated by
`integral_Ioi_rpow_of_lt`). With it, `EBH.lean` is sorry-free; it was never part of the FDR chain.

### § 1b — Proposition A2 (Conformal § 2): the accumulation results, including the negative one

The original § 2 carried a placeholder `g` that was CONSTANT in the persistent state (marked as
such in the source), which made its three statements contentless — the fifth statement-level
repair of the day. The honest model: persistent unit state `d` in a measurable type `δ` with
mixing law `ρ`; conditional on the state, per-round p-values i.i.d. with law `κ d` (a Markov
kernel); `gE κ f d := ∫⁻ f(p) d(κ d)` the conditional increment mean. Everything in `ℝ≥0∞`, which
eliminates every integrability side condition (under the alternative the accumulator's mean is
genuinely infinite, so this is also the honest register).

- **`marginal_validity` (A2(1)):** `∫ gE dρ` IS the increment mean under the mixture round-law
  `ρ.bind κ` — the law § 1 calibrates. Per-round validity is a property of the mixture, not of
  any unit: `gE d ≤ 1` may hold for no state at all.
- **`accumulator_mean` (A2(2)):** `E[M_T] = E[g(Δ)^T]` — an EQUALITY, via Tonelli over
  `ρ ⊗ₘ η` where `η d` is the `T`-fold product of `κ d`, plus a `lintegral` product identity
  over `Measure.pi` proved by `piFinSuccAbove` induction (Mathlib ships only the
  integrability-gated Bochner version).
- **`accumulator_ge_one` (A2(3)):** if `E[g(Δ)] = 1` — all § 1 gives — then `E[g(Δ)^T] ≥ 1`:
  **per-round validity does not survive accumulation**, machine-checked. Proved by Hölder with
  exponents `(T, T/(T−1))` rather than Bochner-Jensen: in `ℝ≥0∞` this needs no side conditions.
  Strictness under heterogeneity (the drift RATES, `T* ≈ 0.592/θ`, P6–P8) deliberately stays
  numerical; the bound's direction is what kills the product claim.

## § 2 — Statement validation (numerical, against the SHIPPED implementations)

Formalising the wrong statement is the failure mode Lean does not protect against, so each
statement was validated against the shipped code before proving. (These are the checks the file
headers and `LEAN_QUEUE` in `tools/e-value.ts` cite; reproduce via `test/e-value.test.ts`,
`test/exchangeability-drift.test.ts`, and the e-BH replay harness of ADR 0025.)

| theorem | check | result |
|---|---|---|
| `EBH.fdp_pointwise` | 995,245 selections from the shipped engine e-BH, five adversarial input families | 0 violations; worst slack exactly 0.0 (attained at the threshold) |
| `Conformal.rank_uniform` | exhaustive over all permutations of `S_{K+1}`, K = 2, 3, 4, against shipped `conformalP` (canary-sim.ts:374), jitter integrated out | `E[p] = 0.500000`, `E[p²] = 0.333333` — exactly Unif[0,1] |
| `EValue.IsCalibrator` (shipped κ-grid) | `∫f = 1` by substitution quadrature; antitonicity over 2×10⁵ points | holds; the `p ≥ 1e-12` floor is strictly conservative |
| `EValue.min_isEValue` / `convexMean_isEValue` | MC on perfectly correlated inputs (worst case for a min rule) | `E[min] = 0.864 ≤ 1`, `E[mean] = 0.864 ≤ 1` |
| `Conformal.accumulator_mean` | MC vs the shipped rank construction, Rao-Blackwellised over the jitter | matches `Λ(T)` to 3% |

## § 3 — What proving found that simulation had passed

Five statement-level bugs, all the same species: **simulation instantiates the intended objects;
only proving reads the whole quantifier (or notices there isn't one).** Every numerical check
above ran against summable weights, measurable ranks, and α ∈ [0,1] — and so could not see that
the formal statements quantified over more (or, in the fifth case, over nothing).

1. **`tsum_convexMean_isEValue` was FALSE as stated.** `∑' j, w j ≤ 1` is vacuous for
   non-summable `w` (Mathlib's junk-value `∑' = 0`), and `w ≡ 1` with `X j := const 2⁻ʲ` gives a
   "mixture" of mean 2. `Summable w` added; the geometric prior satisfies it, so the shipped
   instance was never at risk — but the theorem was.
2. **`calibrate_isEValue` was unprovable as stated**: super-uniformity constrains only sublevel-set
   measures, so without `Measurable p` the composite `f ∘ p` need not be a.e.-measurable and
   `Integrable` is not derivable. `Measurable p` added (free at every call site).
3. **`EValue.SuperUniform` was UNSATISFIABLE**: it quantified over ALL real α, but
   `(P s).toReal ≥ 0 > α` for negative α — so every theorem CONCLUDING it was unprovable and every
   theorem consuming it was vacuously true. Now guarded by `0 ≤ α`.
4. **`rank_superUniform` as first written was FALSE**: it had a uniform-marginal hypothesis and NO
   independence (the `hindep : True` placeholder lived only in `rank_uniform`). Counterexample:
   couple the jitter to the scores — uniform marginal, but squeezed into the low half of its rank
   cell — and `P(p ≤ 1/4) = 1/2` at K = 1. Both theorems now take the product-form joint law
   `hjoint`, which IS "Unif[0,1] jitter independent of the scores".
5. **The § 2 statements were CONTENTLESS**: the conditional mean `g` they quantified over was a
   placeholder constant in the state (so `accumulator_mean` reduced to `E[∏] = (E[f(p)])^T`,
   which is false for the intended model and trivial for the placeholder one, and `hiid : True`
   carried the entire conditional-i.i.d. assumption). Rebuilt on the mixing-law + Markov-kernel
   model, where the assumption is structure, not a `True`-typed comment.

This quadruples the evidence for the ADR 0025 thesis: the opaque-`EValue`-type layer stops unnamed
QUANTITIES from reaching e-BH, and the Lean layer is what checks the named ARGUMENTS — including
the arguments' fine print, which is exactly where all four bugs lived.

## § 4 — Open

- ~~`Conformal.lean` § 2~~ — DONE (see § 1b): no disintegration needed once the conditional-i.i.d.
  structure is modelled directly as a kernel. The Lean queue is EMPTY.
- **A2-disp** (not Lean): the drift identity and δ₀ are derived for persistent LOCATION shifts;
  H8's mechanism is persistent dispersion. Statement-level hole, same species as A2-host was.
  With the queue empty this is now the top open item on the whole A2 line.
- **Strictness of A2(3)** (`E[g^T] > 1` unless `g` a.s. constant) and the drift RATES — numerical
  by design; formalise only if a consumer needs the strict inequality as a statement.
- **H-EX as a scheduler contract** — deliberately not formalised until the contract is written.
