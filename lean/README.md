# Tessera — Lean 4 formalisation

**Build status, split by package:**

- **`core/` — BUILDS CLEAN, NO `sorry`.** `Tessera.EBH.fdp_pointwise`, the deterministic threshold
  lemma that carries e-BH, is fully machine-checked (Lean 4.32.1, zero dependencies). This is the
  first proven link in the ADR 0023 chain — L5, the one audit findings F1–F5 violated.
- **`Tessera/` (the Mathlib layer) — BUILDS on Lean 4.32.1 + Mathlib v4.32.1.**

  **`fdr_le` — e-BH controls FDR under arbitrary dependence — is PROVED, with no `sorry` anywhere
  beneath it.** The full chain: `count_antitone` → `kStar_mem`/`le_kStar` → `card_reject` →
  `fdp_pointwise` (the threshold lemma) → `fdp_le_sum` → `fdr_le_of_pointwise` → `fdr_le`.

  Also proved: `min_isEValue` (→ CERT.MIN_RULE, ADR 0022 / audit F4) and `convexMean_isEValue`
  (→ CERT.CONVEX_MEAN). Both hold for an ARBITRARY measure — `IsProbabilityMeasure` is `omit`ted,
  surfaced by the unused-variable linter each time. The e-BH bound never leans on normalisation.

  **What `fdr_le` assumes, stated not hidden:** each null coordinate is an e-value, all coordinates
  are nonnegative, and the FDP is integrable. What it does *not* assume is anything about the joint
  law — which is the property the Mode-B architecture is built on.

  **THE VALIDITY CHAIN IS CLOSED (2026-07-26).** `EValue.lean` and `EBH.lean` are now SORRY-FREE:
  `tsum_convexMean_isEValue`, `calibrate_isEValue`, and `supAdjuster_integral` are proved. So is
  `Conformal.lean` § 1: `rank_uniform` (the randomised rank is EXACTLY Unif[0,1] under
  exchangeability + independent jitter — ties and all, no continuity assumption),
  `rank_superUniform`, and the composition `calibrated_rank_isEValue`. Chained with `fdr_le`:

      exchangeable block + independent Unif[0,1] jitter
        → conformal rank exactly uniform → calibrator → e-value → e-BH → FDR ≤ q
          under arbitrary dependence — machine-checked end to end, no informal step.

  **§ 1c (2026-07-28) — the ADR 0026 rack-local premise:** `exchangeable_comp` and
  `exchangeable_shared_affine` prove that block-shared transforms — including a RANDOM shared
  affine pair `(Λ, C)`, the rack noise multiplier and offset — preserve exchangeability, given
  joint exchangeability with the shared pair (the joint form is necessary: a `Λ := G 0` coupling
  at K = 1 breaks the marginal-only version; counterexample in the section header). Composed with
  the chain above, rack-shared scale/location are cancelled by a theorem rather than a gate;
  within-block heterogeneity remains the gate's job (`accumulator_ge_one` + scope='rack' monitor).

  **Proving § 1 found FOUR statement-level bugs that simulation had validated as fine** (the
  numerical checks below instantiate the intended objects and cannot see over-general quantifiers):
  `tsum_convexMean_isEValue` was FALSE as stated (junk-value `∑'` made `hsum` vacuous for
  non-summable weights; `Summable w` added); `calibrate_isEValue` lacked the measurability needed
  for integrability (`Measurable p` added); `SuperUniform` was UNSATISFIABLE (quantified over
  negative α; toReal ≥ 0); `rank_superUniform` had NO independence hypothesis and was FALSE
  (adversarial jitter coupling, `P(p ≤ 1/4) = 1/2` at K = 1). Details in each file's header.

  **NOTHING IS `sorry` ANY MORE.** `Conformal.lean` § 2 — the A2 accumulation results — is proved
  too (same day, third pass), on the honest conditional-i.i.d. model (persistent state `d` ~ mixing
  law `ρ`; per-round p-value law a Markov kernel `κ d`): `marginal_validity` (the state-average
  increment mean IS the mixture-round mean — validity per round is a property of the mixture, not
  of any unit), `accumulator_mean` (`E[M_T] = E[g(Δ)^T]`, an EQUALITY, via a `lintegral` Tonelli
  over the `T`-fold product proved here by `piFinSuccAbove` induction), and `accumulator_ge_one`
  (Jensen by Hölder in `ℝ≥0∞`, side-condition-free: if `E[g(Δ)] = 1` then `E[g(Δ)^T] ≥ 1` — the
  machine-checked form of "per-round validity does NOT survive accumulation"). The § 2 statements
  as first written sat on a placeholder `g` CONSTANT in the state and were contentless — a fifth
  statement-level repair. Strictness of A2(3) under heterogeneity (the drift rates, P6–P8) stays
  numerical by design.

  **Read this precisely.** The guarantee holds GIVEN the design hypotheses: exchangeability of the
  block scores (H-EX — a claim about the probe scheduler, deliberately not formalised, see
  omissions) and an independent uniform jitter. What is discharged is everything from those
  hypotheses to FDR control, plus the accumulation NEGATIVE result; what is not is whether the
  scheduler delivers the hypotheses, and the quantitative drift rates.

## Build

**Start here — zero dependencies, seconds, no Mathlib:**

```
cd lean/core && lake build
```

`core/` is a self-contained package holding the deterministic heart of e-BH (`fdp_pointwise`) over
`Nat` and `List` from Lean core only. No Mathlib, no Batteries, no `cache`, no dylibs — which also
means it sidesteps the macOS 15.4 `__DATA_CONST`/`SG_READ_ONLY` dyld failure
([leanprover/lean4#7917](https://github.com/leanprover/lean4/issues/7917)) that makes
`lake exe cache get` fail on Sequoia with older toolchains.

**It pins `lean-toolchain` to v4.32.1, the same as the Mathlib layer.** It originally pinned
nothing, on the reasoning that a zero-dependency file should build under whatever elan default is
installed. That was wrong, and it broke: when the default moved 4.14 → 4.32, `List.mem_cons_self`
lost its explicit arguments and `core/` stopped compiling — while still being described as proved.
**Zero *dependencies* is not zero *API surface*.** Lean core moves too, so the toolchain is pinned
and both packages move together.

The `#eval`s at the bottom of `TesseraCore.lean` execute the
definitions and check the lemma on concrete data, so the statement is testable before any proof
lands.

**The Mathlib-dependent layer** (measure theory: `fdr_le`, the supermartingale chain, conformal
uniformity) is the outer package:

```
cd lean && lake update && lake exe cache get && lake build
```

`cache get` is not optional — without it Mathlib builds from source (~1 hr). If it fails with the
dyld error above, adopt Mathlib's own toolchain
(`cp .lake/packages/mathlib/lean-toolchain lean-toolchain`, then `lake update` again) or just work
in `core/`, which needs none of it.

## Rule: validate API names against source, never from recall

Every Mathlib name used in a **tactic block** must be read from mathlib4 source at the pinned tag
before it is written:

```
curl -s https://raw.githubusercontent.com/leanprover-community/mathlib4/v4.32.1/Mathlib/<path> | grep -n "<name>"
```

(`raw.githubusercontent.com` is reachable; the Mathlib doc site and `lakecache` are not.)

This is not procedural fussiness — it caught a real error. `Integrable.min` was written into
`min_isEValue` from recall. **It does not exist.** The lattice lemma is `Integrable.inf`
(`Mathlib/MeasureTheory/Function/L1Space/Integrable.lean:556`) and its conclusion is
`Integrable (f ⊓ g) μ` — the *pointwise* inf, not `fun ω => min (f ω) (g ω)`, so it needs a bridge
that plain `.min` would have hidden. `integral_mono` by contrast checked out exactly
(`Integral/Bochner/Basic.lean:635`, argument order `(hf) (hg) (h : f ≤ g)`).

**Better still, once Mathlib builds: ask the compiler.** `exact?` searches the library BY TYPE, so
it answers "what should I use here?" — which grepping source cannot. It found `Std.min_le_left`
(namespaced), `integrable_finsetSum`, `integral_finsetSum`, `integral_const_mul`,
`Integrable.const_mul`, and settled the `⊓`/`min` question outright: they are DEFINITIONALLY equal,
so the bridge lemma I hunted for in source never needed to exist. Source-reading is the fallback for
when there is no compiler.

`exact?` only closes goals a SINGLE lemma matches, so decompose the goal to one step per probe.
Compound goals return nothing and look like a missing API when the goal was simply too big.

**Statements** are held to a weaker bar than tactics: a wrong statement fails loudly at build time,
whereas a wrong tactic can look like work.

## Why this exists

`tools/e-value.ts` makes the e-value an opaque type whose every producer must NAME the argument it
relies on (a `Certificate`). The type cannot check those arguments — it can only stop unnamed
quantities reaching e-BH, which is what audit findings F1–F5 all did. This directory is the other
half: the queue of named arguments, one Lean theorem at a time. `LEAN_QUEUE` in `tools/e-value.ts`
holds the mapping; a certificate's `lean` field stays `undefined` until the corresponding theorem
actually builds.

## What is here

| file | content |
|---|---|
| `core/TesseraCore.lean` | **PROVED.** e-BH in sorting-free form; `fdp_pointwise`; supporting `List.foldl max` characterisation (absent from core) |
| `Tessera/EValue.lean` | **SORRY-FREE.** `IsEValue`; `min_isEValue`, `convexMean_isEValue`, `tsum_convexMean_isEValue`, `calibrate_isEValue` |
| `Tessera/EBH.lean` | **SORRY-FREE.** e-BH sorting-free; `card_reject`, `fdp_pointwise`, `fdp_le_sum`, `fdr_le_of_pointwise`, `fdr_le`; `supAdjuster_integral` |
| `Tessera/Conformal.lean` | **SORRY-FREE.** § 1: `rank_uniform` (exact), `rank_superUniform`, `calibrated_rank_isEValue`; § 2: `marginal_validity`, `accumulator_mean`, `accumulator_ge_one` on the conditional-i.i.d. kernel model |

## Priority order

1. ~~**`EBH.fdp_pointwise`**~~ — **DONE** in BOTH representations: `core/` over `Nat`/`List`, and
   `Tessera/` over `Finset`/`ℝ`. Proving it surfaced a missing side condition (`WF`:
   `d.E.length = d.n`), without which `card_reject` is false. No amount of numerical testing could
   have found it, because the constructor always happens to establish it.
2. ~~**`EBH.fdr_le`**~~ — **DONE, chain closed.** `fdp_le_sum` and `fdr_le_of_pointwise` are both
   proved, so `fdr_le` has no `sorry` beneath it. Integrability of the FDP is carried as an explicit
   hypothesis rather than proved — it is a bounded function of finitely many e-values, so it holds
   whenever they are measurable.
3. ~~**`EValue.min_isEValue`, `convexMean_isEValue`**~~ — **DONE.** Both discharge their
   certificates, and both turned out to hold for an ARBITRARY measure (`IsProbabilityMeasure`
   omitted) — surfaced by the unused-variable linter, not by me.
4. ~~**`Conformal.rank_uniform`**~~ — **DONE (2026-07-26), exact uniformity, not merely
   super-uniformity.** The deterministic core is the jitter-sum identity: for EVERY fixed score
   vector, tie-class blocks `[E_v, E_v+C_v)` tile `[0, K+1)` and unit clamps telescope. Statement
   repaired en route (the `hindep : True` placeholder became a real product-law hypothesis;
   the independence-free `rank_superUniform` was refutable).
5. ~~**`EValue.calibrate_isEValue`**~~ — **DONE (2026-07-26)**, layer-cake on both sides;
   `Measurable p` added to the statement; integrability of `f` is FORCED by `∫₀¹ f = 1` via the
   junk-value convention rather than assumed. Composition shipped as
   `Conformal.calibrated_rank_isEValue`.
6. ~~**`Conformal.accumulator_mean`**~~ — **DONE (2026-07-26, third pass), and it did NOT need
   disintegration:** modelling the conditional-i.i.d. structure directly (mixing law + Markov
   kernel + `T`-fold product kernel) turns the accumulation identity into Tonelli over
   `ρ ⊗ₘ η` plus an induction over `Measure.pi`, all in `ℝ≥0∞` with no integrability side
   conditions. The placeholder-`g` statements it replaced were contentless (constant in the
   state). THE QUEUE IS EMPTY — every planned theorem is proved.

## Statement validation (the part that IS checked)

Formalising the wrong statement is the failure mode Lean does not protect against, so each statement
was validated numerically against the **shipped** implementations before being written down:

| theorem | check | result |
|---|---|---|
| `EBH.fdp_pointwise` | 995,245 selections from the shipped engine e-BH, five adversarial input families (zeros+spikes, heavy tails, integer ties, values pinned at the threshold, log-uniform) | **0 violations; worst slack exactly 0.0** — the bound is attained, as it must be at the threshold |
| `Conformal.rank_uniform` | exhaustive over all permutations of `S_{K+1}`, K = 2,3,4, against shipped `conformalP`, jitter integrated out | `E[p] = 0.500000`, `E[p²] = 0.333333` — exactly `Unif[0,1]`, not merely super-uniform |
| `EValue.IsCalibrator` for the shipped grid | `∫f = 1` by substitution quadrature; antitonicity over 2×10⁵ points | holds; the shipped `p ≥ 1e-12` floor makes it strictly conservative |
| `EValue.min_isEValue` / `convexMean_isEValue` | Monte-Carlo on perfectly correlated inputs (worst case for a min rule) | `E[min] = 0.864 ≤ 1`, `E[mean] = 0.864 ≤ 1` |
| `Conformal.accumulator_mean` | Monte-Carlo against the shipped rank construction, Rao-Blackwellised over the jitter (the raw increment has infinite variance) | matches `Λ(T)` to 3% |

Reproduce: `test/e-value.test.ts`, `test/exchangeability-drift.test.ts`, and
`research/2026-07-26-lean-formalisation.md` § 2.

## Deliberate omissions

- **No `product(EValue[])`.** The product of e-values is an e-value only when they are sequentially
  conditional; a free-standing product over a list cannot express that and would re-create audit
  finding F5. Accumulation appears only as a supermartingale over a filtration.
- **Gap A (adaptive design validity) is not formalised.** Its hypothesis (H-EX) is a claim about the
  probe scheduler, not about mathematics; formalising it before the scheduler contract is written
  down would just relocate the assumption. See
  `research/2026-07-25-formal-statements-adaptivity-and-gating.md` § 1.
- **`Λ(T)` is formalised for completeness only.** The A2-E1b experiment showed it is true and
  operationally vacuous; the guarantee the product should carry is the first-passage rate in
  `research/2026-07-25-a2-tail-probability.md`, which is not yet formalised.
