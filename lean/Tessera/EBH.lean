/-
  Tessera/EBH.lean — the e-BH procedure and its FDR guarantee (Wang–Ramdas 2022, arXiv:2009.02824).

  ⚠️ BUILD STATUS: NOT MACHINE-CHECKED (no Lean toolchain in the authoring environment).

  WHY THIS FILE IS THE PRIORITY. The load-bearing content of e-BH is not measure-theoretic — it is a
  DETERMINISTIC, finite, combinatorial lemma about the threshold (`fdp_pointwise` below). Everything
  probabilistic is one application of linearity of expectation on top. So this is the part of the
  Tessera claim surface that is most nearly formalisable today, and it is the part five of the six
  CRITICAL findings in the 2026-07-02 audit were violating the hypotheses of.

  NUMERICAL VALIDATION OF THE STATEMENT (research/2026-07-26-lean-formalisation.md § 2):
  `fdp_pointwise` was checked against the SHIPPED engine implementation
  (`@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh`) over 995,245 selections spanning five
  adversarial input families (zeros+spikes, heavy tails, integer ties, values pinned at the
  threshold, log-uniform): **0 violations, worst-case slack exactly 0.0** — the inequality is
  attained with equality, as it must be at the threshold. So the statement below is the right one
  AND the shipped code satisfies it.
-/
import Tessera.EValue
import Mathlib.Data.Finset.Lattice
import Mathlib.Order.Interval.Finset.Nat

open Finset MeasureTheory

namespace Tessera
namespace EBH

variable {N : ℕ} {q : ℝ} {e : Fin N → ℝ}

/-- How many coordinates reach level `t`. -/
def count (e : Fin N → ℝ) (t : ℝ) : ℕ := (univ.filter fun i => t ≤ e i).card

/-- The self-consistent admissible set: `k` is admissible when at least `k` coordinates reach the
    level `N/(q·k)`. This is the sorting-free presentation of e-BH; it avoids order statistics
    entirely, which is what makes the Lean development tractable. -/
def admissible (q : ℝ) (e : Fin N → ℝ) : Finset ℕ :=
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
    1 / ((reject q e).card : ℝ) ≤ q * e j / N := by
  sorry

/-- False discovery proportion of a rejection set against a null index set `H₀`. -/
noncomputable def fdp (H₀ : Finset (Fin N)) (R : Finset (Fin N)) : ℝ :=
  ((H₀ ∩ R).card : ℝ) / max ((R.card : ℝ)) 1

variable {Ω : Type*} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]

/-- **e-BH controls FDR under arbitrary dependence** (P3 in RESEARCH-INDEX; Wang–Ramdas 2022).

    Only the NULL coordinates need to be e-values, and nothing whatever is assumed about the joint
    law — that is the property the whole Mode-B architecture is built on.

    Proof: `fdp = Σ_{j ∈ H₀} 1{j ∈ R}/|R| ≤ Σ_{j ∈ H₀} q·e_j/N` pointwise by `fdp_pointwise`;
    take expectations, use linearity, then `E[e_j] ≤ 1` on each null coordinate:
    `E[fdp] ≤ |H₀|·q/N ≤ q`. -/
theorem fdr_le (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (E : Fin N → Ω → ℝ)
    (hnull : ∀ j ∈ H₀, IsEValue P (E j)) :
    ∫ ω, fdp H₀ (reject q fun i => E i ω) ∂P ≤ q := by
  sorry

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
