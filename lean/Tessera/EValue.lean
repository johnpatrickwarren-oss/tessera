/-
  Tessera/EValue.lean — e-values and their closure properties.

  ⚠️ BUILD STATUS: NOT MACHINE-CHECKED. Written in an environment with no Lean toolchain
  (`leanprover.github.io` is outside the network allowlist). Definitions and STATEMENTS are the
  deliverable; every `sorry` carries the paper proof in a comment. Do not read an absent `sorry`
  as "checked" — read it as "the author believed the tactic block, and nothing verified it".

  What IS verified: the statements themselves, numerically, against the shipped implementations.
  See `research/2026-07-26-lean-formalisation.md` § 2 for the checks and their results.

  These correspond to the certificates in `tools/e-value.ts`:
    CERT.MIN_RULE        ↔ `EValue.min_isEValue`
    CERT.CONVEX_MEAN     ↔ `EValue.convexMean_isEValue`
    CERT.SUP_ADJUSTED    ↔ `EValue.supAdjuster_integral` (in EBH.lean)
-/
import Mathlib.MeasureTheory.Integral.Bochner
import Mathlib.MeasureTheory.Function.L1Space

open MeasureTheory

namespace Tessera

variable {Ω : Type*} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]

/-- `X` is an e-value for the null `P`: nonnegative, integrable, with mean at most one.

    This is the proposition that `tools/e-value.ts`'s opaque `EValue` type stands in for. The
    TypeScript brand cannot check it; it can only force every producer to NAME the argument. The
    point of this file is to make those arguments discharge-able one at a time. -/
structure IsEValue (X : Ω → ℝ) : Prop where
  nonneg : ∀ ω, 0 ≤ X ω
  integrable : Integrable X P
  mean_le_one : ∫ ω, X ω ∂P ≤ 1

namespace EValue

/-- **The min rule** (ADR 0022; repairs audit finding F4, where flag-then-substitute triad routing
    had no covering theorem). Unconditional — no independence, no assumption on the joint law.

    Proof: `min X Y ≤ X` pointwise, so `∫ min X Y ≤ ∫ X ≤ 1` by monotonicity of the integral.
    Nonnegativity and integrability are immediate from those of `X`. -/
theorem min_isEValue {X Y : Ω → ℝ} (hX : IsEValue P X) (hY : IsEValue P Y) :
    IsEValue P (fun ω => min (X ω) (Y ω)) := by
  refine ⟨fun ω => le_min (hX.nonneg ω) (hY.nonneg ω), ?_, ?_⟩
  · exact hX.integrable.min hY.integrable
  · calc ∫ ω, min (X ω) (Y ω) ∂P
        ≤ ∫ ω, X ω ∂P := by
          apply integral_mono (hX.integrable.min hY.integrable) hX.integrable
          intro ω; exact min_le_left _ _
      _ ≤ 1 := hX.mean_le_one

/-- **Sub-convex combination.** Weights nonnegative summing to at most one. The `≤ 1` rather than
    `= 1` matters: a sub-convex combination is still an e-value and is the conservative choice, and
    `tools/e-value.ts` enforces exactly this (weights summing above one are the N3 rescaling error,
    not a mixture, and are refused at runtime). -/
theorem convexMean_isEValue {ι : Type*} [Fintype ι] {X : ι → Ω → ℝ} {w : ι → ℝ}
    (hX : ∀ i, IsEValue P (X i)) (hw : ∀ i, 0 ≤ w i) (hsum : ∑ i, w i ≤ 1) :
    IsEValue P (fun ω => ∑ i, w i * X i ω) := by
  -- ∫ Σ wᵢ Xᵢ = Σ wᵢ ∫ Xᵢ ≤ Σ wᵢ · 1 = Σ wᵢ ≤ 1, by linearity of the integral and monotonicity.
  sorry

/-- **Countable convex combination** — the form the onset mixture actually needs, since the
    geometric prior `w_j = (1−γ)γ^(j−1)` ranges over all onsets. Needs monotone convergence rather
    than plain linearity, which is why it is stated separately from the finite case. -/
theorem tsum_convexMean_isEValue {X : ℕ → Ω → ℝ} {w : ℕ → ℝ}
    (hX : ∀ j, IsEValue P (X j)) (hw : ∀ j, 0 ≤ w j) (hsum : ∑' j, w j ≤ 1) :
    IsEValue P (fun ω => ∑' j, w j * X j ω) := by
  sorry

/-- A calibrator: `f : [0,1] → [0,∞)` with `∫₀¹ f = 1` and `f` antitone. The shipped instance is
    `f(p) = mean_κ κ p^(κ−1)` over `κ ∈ {0.05, 0.1, 0.2, 0.4, 0.6, 0.8}` (`tools/e-value.ts`
    `calibrate`), whose integral identity is `mean_κ [p^κ]₀¹ = 1` exactly.

    `Antitone` is load-bearing and is why the κ-grid is capped at 1: it is what upgrades
    *super*-uniformity of `p` to `E[f(p)] ≤ 1`. With an increasing `f`, super-uniform `p` gives
    nothing. -/
structure IsCalibrator (f : ℝ → ℝ) : Prop where
  nonneg : ∀ p, 0 ≤ f p
  antitone : AntitoneOn f (Set.Icc 0 1)
  integral_eq_one : ∫ p in (0:ℝ)..1, f p = 1

/-- `p` is super-uniform under `P`: `P(p ≤ α) ≤ α` for every `α`. This is what a randomised
    conformal rank delivers exactly (see `Conformal.lean`). -/
def SuperUniform (p : Ω → ℝ) : Prop := ∀ α : ℝ, (P {ω | p ω ≤ α}).toReal ≤ α

/-- **Calibration**: an antitone density applied to a super-uniform p-value is an e-value.

    Proof: for antitone `f ≥ 0`, `E[f(p)] = ∫₀^∞ P(f(p) > t) dt` and `{f(p) > t} ⊆ {p ≤ f⁻¹(t)}` by
    antitonicity, so `P(f(p) > t) ≤ f⁻¹(t)` by super-uniformity; integrating the inverse recovers
    `∫₀¹ f = 1`. (Equivalently: super-uniform `p` is stochastically dominated by `U`, and antitone
    `f` reverses the order, so `E[f(p)] ≤ E[f(U)] = 1`.) -/
theorem calibrate_isEValue {f : ℝ → ℝ} {p : Ω → ℝ}
    (hf : IsCalibrator f) (hp : SuperUniform P p) (hp01 : ∀ ω, p ω ∈ Set.Icc (0:ℝ) 1) :
    IsEValue P (fun ω => f (p ω)) := by
  sorry

end EValue
end Tessera
