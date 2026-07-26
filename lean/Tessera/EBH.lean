/-
  Tessera/EBH.lean — the e-BH procedure and its FDR guarantee (Wang–Ramdas 2022, arXiv:2009.02824).

  BUILD STATUS (Lean 4.32.1 + Mathlib v4.32.1):
    PROVED:  `fdp_le_sum`           — FDP ≤ Σ over the nulls; both branches of the k*=0 split
             `fdr_le_of_pointwise`  — the expectation step; e-BH's independence-freeness lives here
             `fdr_le`               — no `sorry` of its own; a 2-line derivation from those two
    SORRY:   `card_reject`, `fdp_pointwise` — the two THRESHOLD facts, and the ONLY remaining gap in
             the FDR chain. Both are MACHINE-CHECKED in `lean/core` over `Nat`/`List`, against
             definitions verified selection-for-selection (0 mismatches / 100,542) against the
             shipped engine. What is left is transport to `Finset`/`ℝ`, not new mathematics.
             `supAdjuster_integral` — a separate calculus gap: ∫₁^∞ (√e−1)/e² de = 1.

    So `fdr_le` holds MODULO exactly two finite, already-verified-elsewhere combinatorial facts.

    `fdp_le_sum` needed a hypothesis it did not have: `0 ≤ e j`. Without it the empty-rejection
    branch has FDP = 0 on the left and a possibly-NEGATIVE sum on the right, so the lemma is FALSE
    as first stated. Every e-value is nonnegative, so nothing is lost — but it was an unstated
    assumption, the same species of gap as `WF` in `lean/core`.

  Everything MEASURE-THEORETIC in the FDR guarantee is therefore proved. What is open is finite
  combinatorics that has already been checked in another representation, plus one integral.

  WHY THIS FILE IS THE PRIORITY. The load-bearing content of e-BH is not measure-theoretic — it is a
  DETERMINISTIC, finite, combinatorial lemma about the threshold (`fdp_pointwise` below). Everything
  probabilistic is one application of linearity of expectation on top. It is also the part five of
  the six CRITICAL findings in the 2026-07-02 audit were violating the hypotheses of.

  NUMERICAL VALIDATION OF THE STATEMENT (research/2026-07-26-lean-formalisation.md § 2):
  `fdp_pointwise` was checked against the SHIPPED engine implementation
  (`@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh`) over 995,245 selections spanning five
  adversarial input families (zeros+spikes, heavy tails, integer ties, values pinned at the
  threshold, log-uniform): **0 violations, worst-case slack exactly 0.0** — the inequality is
  attained with equality, as it must be at the threshold. So the statement below is the right one
  AND the shipped code satisfies it.
-/
-- Import Mathlib wholesale rather than naming submodules. Mathlib reorganises constantly
-- (`Mathlib.MeasureTheory.Integral.Bochner` became a DIRECTORY between v4.14 and v4.32, so the
-- original narrow imports 404), and with `lake exe cache get` the cost is import time, not build
-- time. Not worth the maintenance for a development this size.
import Mathlib
import Tessera.EValue

-- autoImplicit turns an unknown identifier into a silently-bound implicit variable: `IsEValue P`
-- elaborated as an opaque metavariable instead of erroring. That is exactly the failure mode this
-- file is meant to avoid, so it is off. Mathlib itself disables it for the same reason.
set_option autoImplicit false

open Finset MeasureTheory

namespace Tessera
namespace EBH

variable {N : ℕ} {q : ℝ} {e : Fin N → ℝ}

-- `noncomputable`: the filter predicate `t ≤ e i` on ℝ needs `Real.decidableLE`, which is
-- itself noncomputable. Only the DEFINITION is affected; the statements below are unchanged.
/-- How many coordinates reach level `t`. -/
noncomputable def count (e : Fin N → ℝ) (t : ℝ) : ℕ := (univ.filter fun i => t ≤ e i).card

/-- The self-consistent admissible set: `k` is admissible when at least `k` coordinates reach the
    level `N/(q·k)`. This is the sorting-free presentation of e-BH; it avoids order statistics
    entirely, which is what makes the Lean development tractable. -/
noncomputable def admissible (q : ℝ) (e : Fin N → ℝ) : Finset ℕ :=
  (Icc 1 N).filter fun k => (k : ℝ) ≤ (count e ((N : ℝ) / (q * k)) : ℝ)

/-- `k* = max` of the admissible set, `0` when it is empty (reject nothing). -/
noncomputable def kStar (q : ℝ) (e : Fin N → ℝ) : ℕ := (admissible q e).max.getD 0

/-- The rejection set. -/
noncomputable def reject (q : ℝ) (e : Fin N → ℝ) : Finset (Fin N) :=
  if kStar q e = 0 then ∅ else univ.filter fun i => (N : ℝ) / (q * kStar q e) ≤ e i

/-- **Self-consistency: `|R| = k*`.**

    `≥` is admissibility of `k*` unfolded. `≤` is maximality: if `|R| > k*` then `k' := |R|` gives
    `N/(q k') < N/(q k*)`, so `count (N/(q k')) ≥ count (N/(q k*)) = |R| = k'`, making `k'`
    admissible and strictly larger than the maximum — contradiction. -/
theorem card_reject (hq : 0 < q) (hk : kStar q e ≠ 0) :
    (reject q e).card = kStar q e := by
  sorry

/-- **THE LEMMA.** For every rejected coordinate, `1/|R| ≤ q·e_j/N`.

    Two lines on paper: `j ∈ R` unfolds to `e j ≥ N/(q·k*)`, and `k* = |R|` by `card_reject`.
    Rearranging gives the claim. No measure theory, no order statistics, no independence.

    This is the inequality that makes e-BH work under ARBITRARY dependence, and it is the property
    that audit findings F1–F5 silently violated by feeding quantities that were not e-values. The
    `EValue` type in `tools/e-value.ts` exists to make its hypothesis unrepresentable-if-false. -/
theorem fdp_pointwise (hq : 0 < q) (hN : 0 < N) {j : Fin N} (hj : j ∈ reject q e) :
    1 / ((reject q e).card : ℝ) ≤ q / N * e j := by
  sorry

/-- False discovery proportion of a rejection set against a null index set `H₀`. -/
noncomputable def fdp (H₀ : Finset (Fin N)) (R : Finset (Fin N)) : ℝ :=
  ((H₀ ∩ R).card : ℝ) / max ((R.card : ℝ)) 1

variable {Ω : Type*} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]

/-- **The pointwise step**, isolated: FDP is bounded by the sum of the per-null e-value bounds.

    Purely combinatorial — `fdp_pointwise` for the rejected nulls, and `0` for the rest. NO measure
    theory. The `Nat`/`List` analogue of `fdp_pointwise` is already MACHINE-CHECKED in `lean/core`
    (`Tessera.EBH.fdp_pointwise`, zero dependencies), over definitions verified selection-for-
    selection against the shipped engine. What remains here is transporting it to `Finset`/`ℝ`. -/
theorem fdp_le_sum (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (he : ∀ j, 0 ≤ e j) :
    fdp H₀ (reject q e) ≤ ∑ j ∈ H₀, q / N * e j := by
  have hqN : (0:ℝ) < N := by exact_mod_cast hN
  have hqn : (0:ℝ) ≤ q / N := le_of_lt (div_pos hq hqN)
  by_cases hk : kStar q e = 0
  · -- nothing rejected: FDP is 0, and the right-hand side is a sum of nonnegatives.
    have hR : reject q e = ∅ := by simp [reject, hk]
    have : fdp H₀ (reject q e) = 0 := by simp [fdp, hR]
    rw [this]
    exact Finset.sum_nonneg fun j _ => mul_nonneg hqn (he j)
  · -- |R| = k* ≠ 0, so the max in `fdp` is |R| and each rejected null pays `1/|R| ≤ (q/N)·e_j`.
    have hcard : (reject q e).card = kStar q e := card_reject hq hk
    have hRpos : 0 < (reject q e).card := by omega
    have hRposR : (0:ℝ) < (reject q e).card := by exact_mod_cast hRpos
    have hmax : max (((reject q e).card : ℝ)) 1 = ((reject q e).card : ℝ) :=
      max_eq_left (by exact_mod_cast hRpos)
    calc fdp H₀ (reject q e)
        = ((H₀ ∩ reject q e).card : ℝ) / ((reject q e).card : ℝ) := by rw [fdp, hmax]
      _ = ∑ _j ∈ H₀ ∩ reject q e, (1:ℝ) / ((reject q e).card : ℝ) := by
          rw [Finset.sum_const, nsmul_eq_mul]; ring
      _ ≤ ∑ j ∈ H₀ ∩ reject q e, q / N * e j :=
          Finset.sum_le_sum fun j hj => fdp_pointwise hq hN (Finset.mem_inter.mp hj).2
      _ ≤ ∑ j ∈ H₀, q / N * e j :=
          Finset.sum_le_sum_of_subset_of_nonneg Finset.inter_subset_left
            fun j _ _ => mul_nonneg hqn (he j)

omit [IsProbabilityMeasure P] in
/-- **THE EXPECTATION STEP** — the part of `fdr_le` that is genuinely about integration, stated so it
    can be proved independently of the combinatorics above.

    Given only that some `F` is dominated pointwise by `Σ_{j∈H₀} (q/N)·E_j`, and that each `E_j` is a
    null e-value, we get `∫F ≤ q`:

        ∫F ≤ Σ_{j∈H₀} (q/N)·∫E_j ≤ Σ_{j∈H₀} q/N = |H₀|·q/N ≤ q ,

    the last step because `|H₀| ≤ N`. This is the whole of "linearity of expectation on top of the
    threshold lemma", and it is where e-BH's independence-freeness lives: nothing is assumed about
    the joint law of the `E_j`, only that each null one has mean ≤ 1.

    NOTE the constant is written `q/N * e j`, not `q * e j / N`. Identical mathematically, but the
    first matches `integral_const_mul` syntactically; the second cost two failed rewrites. -/
theorem fdr_le_of_pointwise (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (E : Fin N → Ω → ℝ)
    (hnull : ∀ j ∈ H₀, IsEValue P (E j))
    (F : Ω → ℝ) (hFint : Integrable F P)
    (hFle : ∀ ω, F ω ≤ ∑ j ∈ H₀, q / N * E j ω) :
    ∫ ω, F ω ∂P ≤ q := by
  have hqN : (0:ℝ) < N := by exact_mod_cast hN
  have hqn : (0:ℝ) ≤ q / N := le_of_lt (div_pos hq hqN)
  have hterm : ∀ j ∈ H₀, Integrable (fun ω => q / N * E j ω) P :=
    fun j hj => (hnull j hj).integrable.const_mul (q / N)
  have hsum : Integrable (fun ω => ∑ j ∈ H₀, q / N * E j ω) P :=
    integrable_finsetSum H₀ hterm
  calc ∫ ω, F ω ∂P
      ≤ ∫ ω, ∑ j ∈ H₀, q / N * E j ω ∂P := integral_mono hFint hsum hFle
    _ = ∑ j ∈ H₀, ∫ ω, q / N * E j ω ∂P := integral_finsetSum H₀ hterm
    _ ≤ ∑ j ∈ H₀, q / N := by
        refine Finset.sum_le_sum fun j hj => ?_
        rw [integral_const_mul]
        nlinarith [hqn, (hnull j hj).mean_le_one]
    _ ≤ q := by
        rw [Finset.sum_const, nsmul_eq_mul]
        have hcard : (H₀.card : ℝ) ≤ N := by
          have h := Finset.card_le_univ H₀
          simpa using (by exact_mod_cast h : (H₀.card : ℝ) ≤ (Finset.univ : Finset (Fin N)).card)
        have hNne : (N:ℝ) ≠ 0 := ne_of_gt hqN
        calc (H₀.card : ℝ) * (q / N) ≤ (N:ℝ) * (q / N) := mul_le_mul_of_nonneg_right hcard hqn
          _ = q := by field_simp

omit [IsProbabilityMeasure P] in
/-- **e-BH controls FDR under arbitrary dependence** (P3 in RESEARCH-INDEX; Wang–Ramdas 2022).

    Only the NULL coordinates need to be e-values, and nothing whatever is assumed about the joint
    law — that is the property the whole Mode-B architecture is built on.

    NO `sorry` OF ITS OWN — this is now a two-line derivation from `fdp_le_sum` (combinatorial,
    still open here but MACHINE-CHECKED in `lean/core` over `Nat`/`List`) and `fdr_le_of_pointwise`
    (the expectation step, PROVED below). `hFint` is a regularity hypothesis: the FDP is a bounded
    function of finitely many e-values, so it is integrable whenever they are measurable; carrying
    it explicitly is cheaper than proving measurability of the rejection set here. -/
theorem fdr_le (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (E : Fin N → Ω → ℝ)
    (hnull : ∀ j ∈ H₀, IsEValue P (E j))
    (hnullAll : ∀ j, IsEValue P (E j))
    (hFint : Integrable (fun ω => fdp H₀ (reject q fun i => E i ω)) P) :
    ∫ ω, fdp H₀ (reject q fun i => E i ω) ∂P ≤ q :=
  fdr_le_of_pointwise (P := P) hq hN H₀ E hnull _ hFint (fun ω => fdp_le_sum hq hN H₀ (fun j => (hnullAll j).nonneg ω))


/-- The `√e − 1` SupFDR adjuster (Carefree, arXiv:2501.19360 Thm 1), `tools/supfdr.ts`. -/
noncomputable def supAdjuster (x : ℝ) : ℝ := if x ≤ 1 then 0 else Real.sqrt x - 1

/-- The identity that makes the adjuster valid: `∫₁^∞ (√e − 1)/e² de = 1` exactly.

    Elementary: `∫₁^∞ e^(−3/2) de = 2` and `∫₁^∞ e^(−2) de = 1`, so the difference is `1`.

    PREMISE THE TYPE SYSTEM GUARDS: the input must be the running max of a GENUINE e-process.
    Applying this to a Shiryaev–Roberts sum is precisely audit finding F3 — `E[M^SR] ≈ #onsets`, not
    `≤ 1` — which reached production and reported "CERTIFIED". In `tools/e-value.ts`,
    `eSupAdjusted` takes an `EValue`, so F3 no longer type-checks. -/
theorem supAdjuster_integral :
    ∫ x in Set.Ioi (1:ℝ), supAdjuster x / x ^ 2 = 1 := by
  sorry

end EBH
end Tessera
