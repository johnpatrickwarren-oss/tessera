/-
  Tessera/EBH.lean — the e-BH procedure and its FDR guarantee (Wang–Ramdas 2022, arXiv:2009.02824).

  BUILD STATUS (Lean 4.32.1 + Mathlib v4.32.1):
    THE FDR CHAIN IS CLOSED. `fdr_le` — e-BH controls FDR under arbitrary dependence — has NO
    `sorry` anywhere beneath it. Proved here, bottom to top:

      count_antitone        lowering the threshold can only admit more coordinates
      kStar_mem / le_kStar  `k*` is admissible, and dominates every admissible `k`
      card_reject           |R| = k*                     (≥ admissibility; ≤ maximality)
      fdp_pointwise         THE THRESHOLD LEMMA: 1/|R| ≤ q·e_j/N for every rejected j
      fdp_le_sum            FDP ≤ Σ over the nulls       (both branches of the k*=0 split)
      fdr_le_of_pointwise   the expectation step; e-BH's independence-freeness lives here
      fdr_le                a 2-line derivation from the last two

    READ THE SCOPE PRECISELY. `fdr_le` still CARRIES HYPOTHESES — stated, not hidden: each null
    coordinate is an e-value, all coordinates are nonnegative, and the FDP is integrable (`hFint`,
    a regularity condition). What it does NOT assume is anything about their JOINT law. That is the
    property the whole Mode-B architecture rests on, and it is now machine-checked.

    It says nothing about whether TESSERA's quantities satisfy the hypothesis. That is the A2
    question. As of 2026-07-26, `Conformal.lean` § 1 DISCHARGES it for the canary construction:
    `Conformal.calibrated_rank_isEValue` (exchangeable block + independent Unif[0,1] jitter ⇒ the
    calibrated conformal rank is an e-value) composes with `fdr_le` into a machine-checked chain
    with no informal step. § 2 of that file (the A2 accumulation results, incl. the NEGATIVE
    result that per-round validity does not survive serial products) is proved as well — the
    whole `lean/` tree is sorry-free.

    THIS FILE IS SORRY-FREE (since 2026-07-26): `supAdjuster_integral` — ∫₁^∞ (√e−1)/e² de = 1,
    the √E−1 adjuster's calibration — is now proved as well (an rpow computation; it is separate
    from, and nothing in, the e-BH FDR chain).

    TWO MISSING SIDE CONDITIONS SURFACED BY PROVING, both invisible to testing because every
    constructor happens to establish them:
      `fdp_le_sum` needs `0 ≤ e j`. Without it the empty-rejection branch has FDP = 0 on the left
      and a possibly-NEGATIVE sum on the right — the lemma is FALSE as first stated.
      `WF` (`d.E.length = d.n`) in `lean/core`, without which `card_reject` is false.

    `kStar` uses `WithBot.unbotD`, not `Option.getD` — see the definition. The `getD` spelling
    reaches through the `WithBot = Option` synonym, so the `unbotD_bot`/`unbotD_coe` simp lemmas
    never fire and every step about `k*` degenerates into a defeq argument.

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

/-- `k* = max` of the admissible set, `0` when it is empty (reject nothing).

    `WithBot.unbotD`, not `Option.getD`. Same function — Mathlib documents `unbotD` as
    "specialization of `Option.getD` to values in `WithBot α` that respects API boundaries" — but
    `getD` reaches through the `WithBot = Option` synonym, so the simp set (`unbotD_bot`,
    `unbotD_coe`) does not fire on it and every step about `k*` turns into a defeq argument.
    Switching to the idiomatic spelling is what made `kStar_mem` and `le_kStar` short. -/
noncomputable def kStar (q : ℝ) (e : Fin N → ℝ) : ℕ := (admissible q e).max.unbotD 0

/-- The rejection set. -/
noncomputable def reject (q : ℝ) (e : Fin N → ℝ) : Finset (Fin N) :=
  if kStar q e = 0 then ∅ else univ.filter fun i => (N : ℝ) / (q * kStar q e) ≤ e i

/-- **`count` is antitone in the threshold.** Lowering the bar can only admit more coordinates.
    This is the only monotonicity fact the whole development needs.

    API validated against the pinned checkout (`.lake/packages/mathlib`, rev `520045ab14`):
    `Finset.monotone_filter_right (s) ⦃p q⦄ [DecidablePred p] [DecidablePred q]
      (h : ∀ a ∈ s, p a → q a) : s.filter p ⊆ s.filter q`  — note the hypothesis is a pointwise
    implication ON THE SET, not `p ≤ q`; and `Finset.card_le_card : s ⊆ t → #s ≤ #t`. -/
theorem count_antitone (e : Fin N → ℝ) {t t' : ℝ} (h : t' ≤ t) : count e t ≤ count e t' :=
  Finset.card_le_card (Finset.monotone_filter_right _ fun _ _ hi => le_trans h hi)

/-- `k*` is itself admissible whenever it is nonzero — the fold is a member, not the seed. -/
theorem kStar_mem (hk : kStar q e ≠ 0) : kStar q e ∈ admissible q e := by
  by_cases hs : admissible q e = ∅
  · rw [kStar, hs, Finset.max_empty, WithBot.unbotD_bot] at hk
    exact absurd rfl hk
  · obtain ⟨a, ha⟩ := Finset.max_of_nonempty (Finset.nonempty_iff_ne_empty.mpr hs)
    have hka : kStar q e = a := by rw [kStar, ha, WithBot.unbotD_coe]
    rw [hka]
    exact Finset.mem_of_max ha

/-- `k*` dominates every admissible `k`: it is the maximum. -/
theorem le_kStar {k : ℕ} (hmem : k ∈ admissible q e) : k ≤ kStar q e := by
  obtain ⟨a, ha⟩ := Finset.max_of_nonempty ⟨k, hmem⟩
  -- Rewrite FORWARD, into the hypothesis. `rw [← ha]` on the goal asks Lean to find `↑a`, and the
  -- coercion it elaborates there is not syntactically the one in `ha`; rewriting into `hka`
  -- matches `(admissible q e).max` literally instead.
  have hka := Finset.le_max hmem
  rw [ha] at hka
  have hks : kStar q e = a := by rw [kStar, ha, WithBot.unbotD_coe]
  rw [hks]
  exact WithBot.coe_le_coe.mp hka

/-- **Self-consistency: `|R| = k*`.**

    `≥` is admissibility of `k*` unfolded. `≤` is maximality: if `|R| > k*` then `k' := |R|` gives
    `N/(q k') ≤ N/(q k*)`, so `count (N/(q k')) ≥ count (N/(q k*)) = |R| = k'`, making `k'`
    admissible and strictly larger than the maximum — contradiction.

    Note the `≤` direction needs only `≤` on the levels, not `<`: `count_antitone` is enough, so
    no strictness argument about the division is required. -/
theorem card_reject (hq : 0 < q) (hk : kStar q e ≠ 0) :
    (reject q e).card = kStar q e := by
  have hmem := kStar_mem hk
  simp only [admissible, Finset.mem_filter, Finset.mem_Icc] at hmem
  obtain ⟨⟨hk1, _hkN⟩, hadm⟩ := hmem
  -- `|R|` is literally the count at `k*`'s own level.
  have hcount : (reject q e).card = count e ((N : ℝ) / (q * kStar q e)) := by
    simp only [reject, if_neg hk, count]
  have hkR : (0 : ℝ) < kStar q e := by exact_mod_cast Nat.pos_of_ne_zero hk
  have hNR : (0 : ℝ) ≤ N := Nat.cast_nonneg N
  -- (≥) admissibility of k*.
  have hge : kStar q e ≤ (reject q e).card := by rw [hcount]; exact_mod_cast hadm
  -- (≤) maximality.
  have hle : (reject q e).card ≤ kStar q e := by
    by_contra hcon
    -- `omega` reads the negated `≤` directly; `push_neg` is deprecated at this toolchain.
    have hlt : kStar q e < (reject q e).card := by omega
    have hk'N : (reject q e).card ≤ N := by
      simp only [reject, if_neg hk]
      calc (univ.filter fun i => (N : ℝ) / (q * kStar q e) ≤ e i).card
          ≤ (univ : Finset (Fin N)).card := Finset.card_filter_le _ _
        _ = N := Finset.card_fin N
    have hk'R : (kStar q e : ℝ) ≤ ((reject q e).card : ℝ) := by exact_mod_cast le_of_lt hlt
    -- a bigger candidate set means a LOWER bar, so the count can only rise
    have hlevel : (N : ℝ) / (q * (reject q e).card) ≤ (N : ℝ) / (q * kStar q e) :=
      div_le_div_of_nonneg_left hNR (mul_pos hq hkR)
        (mul_le_mul_of_nonneg_left hk'R (le_of_lt hq))
    have hk'adm : (reject q e).card ∈ admissible q e := by
      simp only [admissible, Finset.mem_filter, Finset.mem_Icc]
      refine ⟨⟨by omega, hk'N⟩, ?_⟩
      calc (((reject q e).card : ℕ) : ℝ)
          = (count e ((N : ℝ) / (q * kStar q e)) : ℝ) := by rw [hcount]
        _ ≤ (count e ((N : ℝ) / (q * (reject q e).card)) : ℝ) := by
            exact_mod_cast count_antitone e hlevel
    exact absurd (le_kStar hk'adm) (by omega)
  omega

/-- **THE LEMMA.** For every rejected coordinate, `1/|R| ≤ q·e_j/N`.

    Two lines on paper: `j ∈ R` unfolds to `e j ≥ N/(q·k*)`, and `k* = |R|` by `card_reject`.
    Rearranging gives the claim. No measure theory, no order statistics, no independence.

    This is the inequality that makes e-BH work under ARBITRARY dependence, and it is the property
    that audit findings F1–F5 silently violated by feeding quantities that were not e-values. The
    `EValue` type in `tools/e-value.ts` exists to make its hypothesis unrepresentable-if-false. -/
theorem fdp_pointwise (hq : 0 < q) (hN : 0 < N) {j : Fin N} (hj : j ∈ reject q e) :
    1 / ((reject q e).card : ℝ) ≤ q / N * e j := by
  -- something was rejected, so the threshold is real
  have hk : kStar q e ≠ 0 := by
    intro h
    simp only [reject, if_pos h] at hj
    exact Finset.notMem_empty j hj
  have hlevel : (N : ℝ) / (q * kStar q e) ≤ e j := by
    simp only [reject, if_neg hk, Finset.mem_filter] at hj
    exact hj.2
  have hNR : (0 : ℝ) < N := by exact_mod_cast hN
  have hkR : (0 : ℝ) < kStar q e := by exact_mod_cast Nat.pos_of_ne_zero hk
  have hq0 : q ≠ 0 := ne_of_gt hq
  have hN0 : (N : ℝ) ≠ 0 := ne_of_gt hNR
  have hk0 : (kStar q e : ℝ) ≠ 0 := ne_of_gt hkR
  -- scale the threshold inequality by q/N > 0; the left side collapses to 1/k*
  have hmul : q / N * ((N : ℝ) / (q * kStar q e)) ≤ q / N * e j :=
    mul_le_mul_of_nonneg_left hlevel (le_of_lt (div_pos hq hNR))
  have hsimp : q / N * ((N : ℝ) / (q * kStar q e)) = 1 / (kStar q e : ℝ) := by
    field_simp
  rw [card_reject hq hk, ← hsimp]
  exact hmul

/-- False discovery proportion of a rejection set against a null index set `H₀`. -/
noncomputable def fdp (H₀ : Finset (Fin N)) (R : Finset (Fin N)) : ℝ :=
  ((H₀ ∩ R).card : ℝ) / max ((R.card : ℝ)) 1

variable {Ω : Type*} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]

/-- **The pointwise step**, isolated: FDP is bounded by the sum of the per-null e-value bounds.

    Purely combinatorial — `fdp_pointwise` for the rejected nulls, and `0` for the rest. NO measure
    theory. Independently machine-checked in `lean/core` over `Nat`/`List` (zero dependencies), over
    definitions verified selection-for-selection against the shipped engine; the two developments
    now agree, which is a real cross-check rather than a restatement. -/
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
/-- **e-BH controls FDR under arbitrary dependence** — honest hypothesis set (Wang–Ramdas 2022).

    NULL coordinates are e-values; non-null coordinates need only be NONNEGATIVE. Nothing whatever
    is assumed about the joint law — that is the property the whole Mode-B architecture is built on.
    A detector behaving correctly under the alternative has `E[e] > 1` and still satisfies this
    statement, which `fdr_le` below (requiring `IsEValue` of every coordinate) does not permit.

    NO `sorry` ANYWHERE BENEATH IT — a two-line derivation from `fdp_le_sum` (combinatorial, proved
    above) and `fdr_le_of_pointwise` (the expectation step, proved below).

    `hFint` is a regularity hypothesis: the FDP is a bounded function of finitely many e-values, so
    it is integrable whenever they are measurable; carrying it explicitly is cheaper than proving
    measurability of the rejection set here. -/
theorem fdr_le_nonneg (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (E : Fin N → Ω → ℝ)
    (hnull : ∀ j ∈ H₀, IsEValue P (E j))
    (hpos : ∀ j, ∀ ω, 0 ≤ E j ω)
    (hFint : Integrable (fun ω => fdp H₀ (reject q fun i => E i ω)) P) :
    ∫ ω, fdp H₀ (reject q fun i => E i ω) ∂P ≤ q :=
  fdr_le_of_pointwise (P := P) hq hN H₀ E hnull _ hFint (fun ω => fdp_le_sum hq hN H₀ (fun j => hpos j ω))

omit [IsProbabilityMeasure P] in
/-- `fdr_le_nonneg` specialised to the historical hypothesis set: every coordinate an e-value.

    CORRECTED 2026-08-03: this theorem's docstring previously said "Only the NULL coordinates need
    to be e-values" — the statement below has always required `hnullAll : ∀ j, IsEValue P (E j)`,
    i.e. null mean ≤ 1 for ALTERNATIVES too, and used it only through `.nonneg`. The 2026-07-31
    concept-layer audit recorded this as the development's sixth statement-level defect: three wiki
    pages inherited the docstring rather than the signature. The honest statement is
    `fdr_le_nonneg` above; this form is kept for callers and for the historical record. -/
theorem fdr_le (hq : 0 < q) (hN : 0 < N) (H₀ : Finset (Fin N)) (E : Fin N → Ω → ℝ)
    (hnull : ∀ j ∈ H₀, IsEValue P (E j))
    (hnullAll : ∀ j, IsEValue P (E j))
    (hFint : Integrable (fun ω => fdp H₀ (reject q fun i => E i ω)) P) :
    ∫ ω, fdp H₀ (reject q fun i => E i ω) ∂P ≤ q :=
  fdr_le_nonneg (P := P) hq hN H₀ E hnull (fun j ω => (hnullAll j).nonneg ω) hFint


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
  have hcong : ∀ x ∈ Set.Ioi (1:ℝ),
      supAdjuster x / x ^ 2 = x ^ (-(3:ℝ)/2) - x ^ (-2:ℝ) := by
    intro x hx
    have hx1 : (1:ℝ) < x := hx
    have hx0 : (0:ℝ) < x := lt_trans zero_lt_one hx1
    calc supAdjuster x / x ^ 2
        = (x ^ ((1:ℝ)/2) - 1) / x ^ ((2:ℝ)) := by
          rw [supAdjuster, if_neg (not_le.2 hx1), Real.sqrt_eq_rpow, ← Real.rpow_natCast x 2]
          norm_num
      _ = x ^ ((1:ℝ)/2) / x ^ ((2:ℝ)) - 1 / x ^ ((2:ℝ)) := sub_div _ _ _
      _ = x ^ ((1:ℝ)/2 - 2) - x ^ (-(2:ℝ)) := by
          rw [← Real.rpow_sub hx0, one_div (x ^ ((2:ℝ))), ← Real.rpow_neg hx0.le]
      _ = x ^ (-(3:ℝ)/2) - x ^ (-2:ℝ) := by norm_num
  rw [setIntegral_congr_fun measurableSet_Ioi fun x hx => hcong x hx]
  rw [integral_sub (integrableOn_Ioi_rpow_of_lt (by norm_num) zero_lt_one)
    (integrableOn_Ioi_rpow_of_lt (by norm_num) zero_lt_one)]
  rw [integral_Ioi_rpow_of_lt (by norm_num) zero_lt_one,
    integral_Ioi_rpow_of_lt (by norm_num) zero_lt_one]
  norm_num [Real.one_rpow]

end EBH
end Tessera
