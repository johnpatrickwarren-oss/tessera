/-
  Tessera/EValue.lean — e-values and their closure properties.

  BUILD STATUS (Lean 4.32.1 + Mathlib v4.32.1): SORRY-FREE (since 2026-07-26).
    PROVED:  `min_isEValue`          → discharges CERT.MIN_RULE    (ADR 0022; repairs audit F4)
             `convexMean_isEValue`   → discharges CERT.CONVEX_MEAN
             `tsum_convexMean_isEValue` → the countable-mixture STEP of
               CERT.GEOMETRIC_ONSET_MIXTURE (the supermartingale part remains a construction)
               (`Summable w` ADDED — the statement as first written was FALSE; see docstring)
             `calibrate_isEValue`    → discharges CERT.CALIBRATOR
               (`Measurable p` ADDED — required for integrability; see docstring)
    AMENDED: `SuperUniform` now quantifies over `0 ≤ α` only. The original (all real `α`) was
             UNSATISFIABLE — `(P s).toReal ≥ 0 > α` at any negative `α` — so any theorem
             CONCLUDING SuperUniform was unprovable and any theorem consuming it was vacuous.
             Found while proving `Conformal.rank_superUniform`. Three statement-level bugs in
             this file were caught by proving, none by simulating: simulation instantiates the
             intended objects (summable weights, measurable ranks, α in [0,1]) and cannot see
             that the FORMAL statement quantifies over more.

  Both proofs hold for an ARBITRARY measure — `IsProbabilityMeasure` is `omit`ted, which the unused-
  variable linter surfaced and which is slightly stronger than the statements as first written.

  RULE FOR THIS FILE: no Mathlib API name may appear in a TACTIC BLOCK unless it has been read from
  mathlib4 source at the pinned tag (raw.githubusercontent.com/leanprover-community/mathlib4/<tag>/…)
  and its signature recorded. Recalled names are how `Integrable.min` — which does not exist — ended
  up here. Statements may use names not yet validated, since a wrong statement fails loudly at build;
  a wrong tactic silently looks like progress.

  What IS verified: the statements themselves, numerically, against the shipped implementations.
  See `research/2026-07-26-lean-formalisation.md` § 2 for the checks and their results.

  These correspond to the certificates in `tools/e-value.ts`:
    CERT.MIN_RULE        ↔ `EValue.min_isEValue`
    CERT.CONVEX_MEAN     ↔ `EValue.convexMean_isEValue`
    CERT.SUP_ADJUSTED    ↔ `EValue.supAdjuster_integral` (in EBH.lean)
-/
-- Import Mathlib wholesale rather than naming submodules. Mathlib reorganises constantly
-- (`Mathlib.MeasureTheory.Integral.Bochner` became a DIRECTORY between v4.14 and v4.32, so the
-- original narrow imports 404), and with `lake exe cache get` the cost is import time, not build
-- time. Not worth the maintenance for a development this size.
import Mathlib
-- autoImplicit turns an unknown identifier into a silently-bound implicit variable: `IsEValue P`
-- elaborated as an opaque metavariable instead of erroring. That is exactly the failure mode this
-- file is meant to avoid, so it is off. Mathlib itself disables it for the same reason.
set_option autoImplicit false

open MeasureTheory
open scoped ENNReal

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

-- `omit ... in` must precede the DOCSTRING, not sit between it and the theorem.
-- The linter was right that `IsProbabilityMeasure P` is unused: the min rule and the convex-mean
-- rule both hold for ANY measure. Recording that rather than silencing the warning.
omit [IsProbabilityMeasure P] in
/-- **The min rule** (ADR 0022; repairs audit finding F4, where flag-then-substitute triad routing
    had no covering theorem). Unconditional — no independence, no assumption on the joint law.

    Proof: `min X Y ≤ X` pointwise, so `∫ min X Y ≤ ∫ X ≤ 1` by monotonicity of the integral.
    Nonnegativity and integrability are immediate from those of `X`.

    ── API, VALIDATED BY THE COMPILER (`exact?` at v4.32.1), not recalled ──
      `min = ⊓`              closes by `rfl` — pointwise `min` IS the lattice inf, definitionally.
                             So the "bridge lemma" I hunted for in source (`inf_eq_min`,
                             `Pi.inf_apply`) was never needed; grepping source found the absence of
                             `Integrable.min` but could not tell me what to use instead. `exact?`
                             searches BY TYPE and answers that question directly.
      `Integrable.inf`       `(hf) (hg) : Integrable (f ⊓ g) μ`
      `Std.min_le_left`      note the `Std` namespace, and implicit arguments
      `integral_mono`        `(hf) (hg) (h : f ≤ g)` — confirmed from source, Bochner/Basic.lean:635

    Record of the error this replaced: `Integrable.min` was written here from recall. It does not
    exist. -/
theorem min_isEValue {X Y : Ω → ℝ} (hX : IsEValue P X) (hY : IsEValue P Y) :
    IsEValue P (fun ω => min (X ω) (Y ω)) := by
  have hmin : (fun ω => min (X ω) (Y ω)) = X ⊓ Y := rfl
  have hint : Integrable (fun ω => min (X ω) (Y ω)) P := by
    rw [hmin]; exact hX.integrable.inf hY.integrable
  refine ⟨fun ω => le_min (hX.nonneg ω) (hY.nonneg ω), hint, ?_⟩
  calc ∫ ω, min (X ω) (Y ω) ∂P
      ≤ ∫ ω, X ω ∂P := integral_mono hint hX.integrable (fun _ => Std.min_le_left)
    _ ≤ 1 := hX.mean_le_one

omit [IsProbabilityMeasure P] in
/-- **Sub-convex combination.** Weights nonnegative summing to at most one. The `≤ 1` rather than
    `= 1` matters: a sub-convex combination is still an e-value and is the conservative choice, and
    `tools/e-value.ts` enforces exactly this (weights summing above one are the N3 rescaling error,
    not a mixture, and are refused at runtime). -/
theorem convexMean_isEValue {ι : Type*} [Fintype ι] {X : ι → Ω → ℝ} {w : ι → ℝ}
    (hX : ∀ i, IsEValue P (X i)) (hw : ∀ i, 0 ≤ w i) (hsum : ∑ i, w i ≤ 1) :
    IsEValue P (fun ω => ∑ i, w i * X i ω) := by
  -- ∫ Σ wᵢ Xᵢ = Σ wᵢ ∫ Xᵢ ≤ Σ wᵢ · 1 = Σ wᵢ ≤ 1. Every Mathlib term below came from `exact?`:
  -- `Integrable.const_mul`, `integrable_finsetSum`, `integral_finsetSum`, `integral_const_mul`.
  have hi : ∀ i, Integrable (fun ω => w i * X i ω) P :=
    fun i => (hX i).integrable.const_mul (w i)
  have hint : Integrable (fun ω => ∑ i, w i * X i ω) P :=
    integrable_finsetSum Finset.univ (fun i _ => hi i)
  refine ⟨fun ω => Finset.sum_nonneg (fun i _ => mul_nonneg (hw i) ((hX i).nonneg ω)), hint, ?_⟩
  rw [integral_finsetSum Finset.univ (fun i _ => hi i)]
  have hpull : ∀ i, ∫ ω, w i * X i ω ∂P = w i * ∫ ω, X i ω ∂P :=
    fun i => integral_const_mul (w i) (X i)
  simp only [hpull]
  calc ∑ i, w i * ∫ ω, X i ω ∂P
      ≤ ∑ i, w i * 1 :=
        Finset.sum_le_sum (fun i _ => mul_le_mul_of_nonneg_left (hX i).mean_le_one (hw i))
    _ = ∑ i, w i := by simp
    _ ≤ 1 := hsum

omit [IsProbabilityMeasure P] in
/-- **Countable convex combination** — the form the onset mixture actually needs, since the
    geometric prior `w_j = (1−γ)γ^(j−1)` ranges over all onsets. Needs monotone convergence rather
    than plain linearity, which is why it is stated separately from the finite case.

    `Summable w` was ADDED to the statement as first written, which was FALSE without it: for a
    non-summable `w` Mathlib's `∑' j, w j` is the junk value `0`, so `hsum` held vacuously for
    `w ≡ 1`, and `X j := const 2⁻ʲ` then gave a "mixture" `∑' j, 2⁻ʲ = 2` with mean 2 > 1. The
    junk value that BREAKS the hypothesis happens to also SAVE the divergent-sum cases the
    conclusion would otherwise hit, which is why the statement elaborated and simulated clean —
    the counterexample needs summable products of non-summable weights. Geometric weights are
    summable; the shipped instance is unaffected.

    Proof: work in `ℝ≥0∞`, where every rearrangement is unconditional: `lintegral_tsum` swaps
    `∫⁻` and `∑'`, each term integrates to `≤ w j`, and the total is `≤ ∑ w ≤ 1`. Finiteness of
    that bound pulls the whole computation back to `ℝ` through `toReal`. -/
theorem tsum_convexMean_isEValue {X : ℕ → Ω → ℝ} {w : ℕ → ℝ}
    (hX : ∀ j, IsEValue P (X j)) (hw : ∀ j, 0 ≤ w j) (hws : Summable w)
    (hsum : ∑' j, w j ≤ 1) :
    IsEValue P (fun ω => ∑' j, w j * X j ω) := by
  -- ── the ℝ≥0∞ shadow of each term, a.e.-measurable ──
  have hterm_meas : ∀ j, AEMeasurable (fun ω => ENNReal.ofReal (w j * X j ω)) P := fun j =>
    ENNReal.measurable_ofReal.comp_aemeasurable
      (((hX j).integrable.aestronglyMeasurable.aemeasurable).const_mul (w j))
  -- the ℝ≥0∞ mixture is a.e.-measurable: upgrade each term to its measurable representative and
  -- push the (countable) a.e.-agreement through the tsum
  have hGmeas : AEMeasurable (fun ω => ∑' j, ENNReal.ofReal (w j * X j ω)) P := by
    -- `AEMeasurable.ennreal_tsum` is deprecated at this pin and its suggested replacement
    -- (`AEMeasurable.tsum`, Polish/Basic) does not exist yet at v4.32.1, so its two-line proof is
    -- inlined here: an ℝ≥0∞ tsum is the iSup of finite partial sums.
    simp_rw [ENNReal.tsum_eq_iSup_sum]
    exact .iSup fun s => Finset.aemeasurable_fun_sum s fun i _ => hterm_meas i
  -- ── the lintegral bound: ∫⁻ Σ = Σ ∫⁻ ≤ Σ w ≤ 1 ──
  have hGlint : ∫⁻ ω, ∑' j, ENNReal.ofReal (w j * X j ω) ∂P ≤ 1 := by
    have hterm_int : ∀ j, Integrable (fun ω => w j * X j ω) P := fun j =>
      (hX j).integrable.const_mul (w j)
    have hterm_lint : ∀ j,
        ∫⁻ ω, ENNReal.ofReal (w j * X j ω) ∂P = ENNReal.ofReal (∫ ω, w j * X j ω ∂P) := fun j =>
      (ofReal_integral_eq_lintegral_ofReal (hterm_int j)
        (Filter.Eventually.of_forall fun ω => mul_nonneg (hw j) ((hX j).nonneg ω))).symm
    have hmean_j : ∀ j, ∫ ω, w j * X j ω ∂P ≤ w j := fun j => by
      rw [integral_const_mul]
      calc w j * ∫ ω, X j ω ∂P
          ≤ w j * 1 := mul_le_mul_of_nonneg_left (hX j).mean_le_one (hw j)
        _ = w j := mul_one _
    calc ∫⁻ ω, ∑' j, ENNReal.ofReal (w j * X j ω) ∂P
        = ∑' j, ∫⁻ ω, ENNReal.ofReal (w j * X j ω) ∂P := lintegral_tsum hterm_meas
      _ ≤ ∑' j, ENNReal.ofReal (w j) := ENNReal.tsum_le_tsum fun j => by
            rw [hterm_lint j]; exact ENNReal.ofReal_le_ofReal (hmean_j j)
      _ = ENNReal.ofReal (∑' j, w j) := (ENNReal.ofReal_tsum_of_nonneg hw hws).symm
      _ ≤ ENNReal.ofReal 1 := ENNReal.ofReal_le_ofReal hsum
      _ = 1 := ENNReal.ofReal_one
  have hne : ∫⁻ ω, ∑' j, ENNReal.ofReal (w j * X j ω) ∂P ≠ ∞ :=
    (lt_of_le_of_lt hGlint ENNReal.one_lt_top).ne
  -- ── pull back to ℝ: the real tsum IS `toReal` of the ℝ≥0∞ tsum, POINTWISE — on the divergent
  --    set both sides are the junk value 0, which is the one place the junk convention helps ──
  have hFeq : ∀ ω, (∑' j, w j * X j ω) = (∑' j, ENNReal.ofReal (w j * X j ω)).toReal := fun ω => by
    rw [ENNReal.tsum_toReal_eq fun j => ENNReal.ofReal_ne_top]
    exact tsum_congr fun j => (ENNReal.toReal_ofReal (mul_nonneg (hw j) ((hX j).nonneg ω))).symm
  refine ⟨fun ω => tsum_nonneg fun j => mul_nonneg (hw j) ((hX j).nonneg ω),
    (integrable_toReal_of_lintegral_ne_top hGmeas hne).congr
      (Filter.Eventually.of_forall fun ω => (hFeq ω).symm), ?_⟩
  calc ∫ ω, (∑' j, w j * X j ω) ∂P
      = ∫ ω, (∑' j, ENNReal.ofReal (w j * X j ω)).toReal ∂P :=
        integral_congr_ae (Filter.Eventually.of_forall hFeq)
    _ = (∫⁻ ω, ∑' j, ENNReal.ofReal (w j * X j ω) ∂P).toReal :=
        integral_toReal hGmeas (ae_lt_top' hGmeas hne)
    _ ≤ (1 : ℝ≥0∞).toReal := ENNReal.toReal_mono ENNReal.one_ne_top hGlint
    _ = 1 := ENNReal.toReal_one

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

/-- `p` is super-uniform under `P`: `P(p ≤ α) ≤ α` for every `α ≥ 0`. This is what a randomised
    conformal rank delivers exactly (see `Conformal.lean`).

    The `0 ≤ α` guard is NOT cosmetic: without it the definition is unsatisfiable
    (`(P s).toReal ≥ 0 > α` for `α < 0`), which would make every downstream theorem consuming
    `SuperUniform` vacuously true and every theorem concluding it unprovable. -/
def SuperUniform (p : Ω → ℝ) : Prop := ∀ α : ℝ, 0 ≤ α → (P {ω | p ω ≤ α}).toReal ≤ α

/-- **Calibration**: an antitone density applied to a super-uniform p-value is an e-value.

    Proof: layer-cake on BOTH sides. `E[f(p)] = ∫₀^∞ P(f(p) > t) dt`; for each level `t > 0`, with
    `s_t := sSup {x ∈ [0,1] | f x > t}`, antitonicity gives `{f(p) > t} ⊆ {p ≤ s_t}`, so
    super-uniformity caps the level measure at `s_t` — which is in turn `≤ λ{x ∈ [0,1] | f x > t}`,
    because that set contains `[0, s_t)`. Integrating the levels of `f` under `λ` on `[0,1]`
    recovers `∫₀¹ f = 1`. (This IS the stochastic-dominance proof, level set by level set.)

    Two things the original statement left implicit, made explicit here:
    * `Measurable p` was ADDED: super-uniformity constrains only the measure of sublevel sets, so
      without it `f ∘ p` need not be a.e.-measurable and `Integrable (f ∘ p)` is not derivable.
      Every intended `p` is a finite arithmetic expression in measurable scores (the conformal
      rank), so the hypothesis is free at the call sites.
    * Integrability of `f` itself is NOT a hypothesis — it is forced by `∫₀¹ f = 1`, because
      Mathlib's interval integral of a non-integrable function is the junk value `0 ≠ 1`.
    A clamp (`max 0 (min 1 ·)`) upgrades `AntitoneOn f (Icc 0 1)` to a globally antitone function
    agreeing with `f` wherever it is ever evaluated, which is what makes `f ∘ p` measurable. -/
theorem calibrate_isEValue {f : ℝ → ℝ} {p : Ω → ℝ}
    (hf : IsCalibrator f) (hpm : Measurable p) (hp : SuperUniform P p)
    (hp01 : ∀ ω, p ω ∈ Set.Icc (0:ℝ) 1) :
    IsEValue P (fun ω => f (p ω)) := by
  -- ── the clamp, and measurability of everything in sight ──
  have hcmem : ∀ x : ℝ, max 0 (min 1 x) ∈ Set.Icc (0:ℝ) 1 :=
    fun x => ⟨le_max_left _ _, max_le zero_le_one (min_le_left _ _)⟩
  have hcid : ∀ x ∈ Set.Icc (0:ℝ) 1, max 0 (min 1 x) = x := fun x hx => by
    rw [min_eq_right hx.2, max_eq_right hx.1]
  have hfc_anti : Antitone fun x => f (max 0 (min 1 x)) := fun x y hxy =>
    hf.antitone (hcmem x) (hcmem y) (max_le_max le_rfl (min_le_min le_rfl hxy))
  have hfp_meas : Measurable fun ω => f (p ω) := by
    have h : (fun ω => f (p ω)) = fun ω => f (max 0 (min 1 (p ω))) :=
      funext fun ω => by rw [hcid _ (hp01 ω)]
    rw [h]; exact hfc_anti.measurable.comp hpm
  have hf_meas01 : AEMeasurable f (volume.restrict (Set.Icc (0:ℝ) 1)) := by
    refine hfc_anti.measurable.aemeasurable.congr ?_
    filter_upwards [ae_restrict_mem measurableSet_Icc] with x hx
    rw [hcid _ hx]
  -- ── the level-measure comparison, the heart of the argument ──
  have hkey : ∀ t ∈ Set.Ioi (0:ℝ),
      P {ω | t < f (p ω)} ≤ (volume.restrict (Set.Icc (0:ℝ) 1)) {x | t < f x} := by
    intro t _
    rw [Measure.restrict_apply' measurableSet_Icc]
    by_cases hA : ({x | t < f x} ∩ Set.Icc (0:ℝ) 1).Nonempty
    · have hbdd : BddAbove ({x | t < f x} ∩ Set.Icc (0:ℝ) 1) := ⟨1, fun x hx => hx.2.2⟩
      have hs0 : 0 ≤ sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1) := by
        obtain ⟨x₀, hx₀⟩ := hA
        exact hx₀.2.1.trans (le_csSup hbdd hx₀)
      -- P-side: f(p) > t puts p in the level set, hence below its sup; super-uniformity caps it
      have hsub : {ω | t < f (p ω)} ⊆ {ω | p ω ≤ sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1)} :=
        fun ω hω => le_csSup hbdd ⟨hω, hp01 ω⟩
      have hP : P {ω | t < f (p ω)} ≤ ENNReal.ofReal (sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1)) :=
        (measure_mono hsub).trans
          ((ENNReal.le_ofReal_iff_toReal_le (measure_ne_top P _) hs0).2 (hp _ hs0))
      -- λ-side: [0, sSup) sits inside the level set, by antitonicity
      have hsup : Set.Ico 0 (sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1))
          ⊆ {x | t < f x} ∩ Set.Icc (0:ℝ) 1 := by
        intro x hx
        obtain ⟨y, hy, hxy⟩ := exists_lt_of_lt_csSup hA hx.2
        have hx1 : x ∈ Set.Icc (0:ℝ) 1 := ⟨hx.1, hxy.le.trans hy.2.2⟩
        exact ⟨lt_of_lt_of_le hy.1 (hf.antitone hx1 hy.2 hxy.le), hx1⟩
      calc P {ω | t < f (p ω)}
          ≤ ENNReal.ofReal (sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1)) := hP
        _ = volume (Set.Ico 0 (sSup ({x | t < f x} ∩ Set.Icc (0:ℝ) 1))) := by
              rw [Real.volume_Ico, sub_zero]
        _ ≤ volume ({x | t < f x} ∩ Set.Icc (0:ℝ) 1) := measure_mono hsup
    · -- the level set misses [0,1] entirely, so f(p) > t is impossible
      have h0 : {ω | t < f (p ω)} = ∅ :=
        Set.eq_empty_iff_forall_notMem.2 fun ω hω => hA ⟨p ω, hω, hp01 ω⟩
      simp [h0]
  -- ── integrability of f on [0,1] is forced by ∫₀¹ f = 1 (junk-value convention) ──
  have hii : IntegrableOn f (Set.Icc (0:ℝ) 1) volume := by
    rw [integrableOn_Icc_iff_integrableOn_Ioc,
      ← intervalIntegrable_iff_integrableOn_Ioc_of_le zero_le_one]
    by_contra h
    have h0 := intervalIntegral.integral_undef h
    rw [hf.integral_eq_one] at h0
    exact one_ne_zero h0
  -- ── the bound, level set by level set ──
  have hbound : ∫⁻ ω, ENNReal.ofReal (f (p ω)) ∂P ≤ 1 := by
    rw [lintegral_eq_lintegral_meas_lt P
      (Filter.Eventually.of_forall fun ω => hf.nonneg (p ω)) hfp_meas.aemeasurable]
    calc ∫⁻ t in Set.Ioi (0:ℝ), P {ω | t < f (p ω)}
        ≤ ∫⁻ t in Set.Ioi (0:ℝ), (volume.restrict (Set.Icc (0:ℝ) 1)) {x | t < f x} := by
          refine lintegral_mono_ae ?_
          filter_upwards [ae_restrict_mem measurableSet_Ioi] with t ht
          exact hkey t ht
      _ = ∫⁻ x in Set.Icc (0:ℝ) 1, ENNReal.ofReal (f x) :=
          (lintegral_eq_lintegral_meas_lt (volume.restrict (Set.Icc (0:ℝ) 1))
            (Filter.Eventually.of_forall fun x => hf.nonneg x) hf_meas01).symm
      _ = ENNReal.ofReal (∫ x in Set.Icc (0:ℝ) 1, f x) :=
          (ofReal_integral_eq_lintegral_ofReal hii
            (Filter.Eventually.of_forall fun x => hf.nonneg x)).symm
      _ = ENNReal.ofReal 1 := by
          rw [integral_Icc_eq_integral_Ioc, ← intervalIntegral.integral_of_le zero_le_one,
            hf.integral_eq_one]
      _ = 1 := ENNReal.ofReal_one
  -- ── pull back to ℝ, exactly as in `tsum_convexMean_isEValue` ──
  have hne : ∫⁻ ω, ENNReal.ofReal (f (p ω)) ∂P ≠ ∞ := (lt_of_le_of_lt hbound ENNReal.one_lt_top).ne
  have hmeasE : AEMeasurable (fun ω => ENNReal.ofReal (f (p ω))) P :=
    ENNReal.measurable_ofReal.comp_aemeasurable hfp_meas.aemeasurable
  have hFeq : ∀ ω, f (p ω) = (ENNReal.ofReal (f (p ω))).toReal :=
    fun ω => (ENNReal.toReal_ofReal (hf.nonneg (p ω))).symm
  refine ⟨fun ω => hf.nonneg (p ω),
    (integrable_toReal_of_lintegral_ne_top hmeasE hne).congr
      (Filter.Eventually.of_forall fun ω => (hFeq ω).symm), ?_⟩
  calc ∫ ω, f (p ω) ∂P
      = ∫ ω, (ENNReal.ofReal (f (p ω))).toReal ∂P :=
        integral_congr_ae (Filter.Eventually.of_forall hFeq)
    _ = (∫⁻ ω, ENNReal.ofReal (f (p ω)) ∂P).toReal := integral_toReal hmeasE (ae_lt_top' hmeasE hne)
    _ ≤ (1 : ℝ≥0∞).toReal := ENNReal.toReal_mono ENNReal.one_ne_top hbound
    _ = 1 := ENNReal.toReal_one

end EValue
end Tessera
