/-
  Tessera/Conformal.lean — randomised conformal ranks, and Proposition A2 (the drift identity).

  BUILD STATUS (Lean 4.32.1 + Mathlib v4.32.1):
    § 1 PROVED, sorry-free (2026-07-26): `rank_uniform` (the randomised rank is EXACTLY Unif[0,1]),
        `rank_superUniform`, and the end-to-end corollary `calibrated_rank_isEValue` — which,
        composed with `EBH.fdr_le`, closes the validity chain:
          exchangeable block + independent jitter → exact conformal rank → calibrator → e-value
          → e-BH → FDR ≤ q under arbitrary dependence.
    § 2 still `sorry`: the A2 drift identity and accumulation bound remain prose plus simulation.

  STATEMENT REPAIRS made while proving § 1 (the statements as first written were wrong):
    * `rank_uniform`'s `hindep : True` placeholder and separate `hU` marginal are replaced by one
      honest joint-law hypothesis `hjoint`: the pair (scores, jitter) pushes forward to
      (score law) × Unif[0,1]. This IS independence-plus-marginal, stated as a product law.
    * `rank_superUniform` as first written had NO independence hypothesis at all and was FALSE:
      couple the jitter adversarially to the scores (U | rank-cell scaled into the low half of its
      cell) and P(p ≤ 1/4) = 1/2 at K = 1 while both marginals are as hypothesised.
    * Both gained `Measurable (S i)` / `Measurable U` — same reason as `calibrate_isEValue`.
    * `EValue.SuperUniform` itself was UNSATISFIABLE (quantified over negative α); fixed in
      EValue.lean, see its header.

  Two blocks:
    § 1  exchangeability ⇒ the randomised rank is EXACTLY uniform            (link L2 of ADR 0023)
    § 2  Proposition A2: per-round validity survives, accumulation does not  (the drift identity)

  PROOF SHAPE for § 1 (no continuity or distinctness assumption anywhere — ties are handled by the
  jitter, which is the whole point of the construction):
    (a) deterministic core: for every FIXED score vector y and level α,
          Σⱼ λ{u ∈ [0,1] | looRank j y u ≤ α} = clamp₍₀,K+1₎(α(K+1))
        — per tie-class the jitter measure is an affine clamp, the classes' rank blocks
        [Eᵥ, Eᵥ+Cᵥ) tile [0, K+1) exactly, and unit clamps telescope.
    (b) exchangeability: each leave-one-out sublevel event has the same product-measure mass
        (transport along (y,u) ↦ (y ∘ swap 0 j, u)), so (K+1)·P(rank ≤ α) equals the jitter sum
        integrated over the score law — which is constant in y. Divide.

  NUMERICAL VALIDATION (research/2026-07-26-lean-formalisation.md § 2):
  `rank_uniform` was checked EXHAUSTIVELY over all permutations for K = 2, 3, 4 against the shipped
  `conformalP` (canary-sim.ts:374), integrating out the jitter: E[p] = 0.500000 and E[p²] = 0.333333
  to six decimals — i.e. exactly Unif[0,1], not merely super-uniform.
  `drift_identity` and `accumulator_mean` were validated by Monte-Carlo against the shipped rank
  construction in `test/exchangeability-drift.test.ts`.
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

open MeasureTheory Finset
open scoped ENNReal

namespace Tessera
namespace Conformal

/-! ## § 1 — the randomised conformal rank -/

variable {K : ℕ}

/-- The shipped randomised rank, one-sided high-is-bad:
    `p = (#{peers > y} + u·(1 + #{peers = y})) / (K+1)`  (canary-sim.ts:374).

    The jitter `u` is not decoration. Without it the rank is only *super*-uniform, floored at
    `1/(K+1)`; with it, `p` is exactly `Unif[0,1]` — which is why ADR 0023 can claim EXACT-FS. -/
noncomputable def rankP (y : ℝ) (peers : Fin K → ℝ) (u : ℝ) : ℝ :=
  (((univ.filter fun i => y < peers i).card : ℝ)
    + u * (1 + ((univ.filter fun i => peers i = y).card : ℝ))) / (K + 1)

variable {Ω : Type*} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]

/-- The scores of the block are exchangeable under `P`: their joint law is invariant under every
    permutation of the members.

    THIS IS HYPOTHESIS (H-EX) of Proposition A1, and it is where all the risk lives. It is
    conditional on the block having been FIXED AT THE DESIGN STAGE — the half-step filtration
    `F_{t−½}` of `research/2026-07-25-formal-statements-adaptivity-and-gating.md` § 1.1 — and it is
    what suspect-enriched escalation drafting violates (measured: E4 FDP 0.144 ≈ 3q). -/
def Exchangeable (S : Fin (K + 1) → Ω → ℝ) : Prop :=
  ∀ σ : Equiv.Perm (Fin (K + 1)), Measure.map (fun ω i => S (σ i) ω) P = Measure.map (fun ω i => S i ω) P

/-! ### § 1a — the deterministic core

  Everything below is about a FIXED score vector `y`; randomness enters only in § 1b. The chain:
  clamp algebra → the leave-one-out rank family `looRank` → the jitter measure of one sublevel set
  (`vol01_looRank_le`) → the exact jitter-sum identity (`sum_vol01_looRank`):

      Σⱼ λ{u ∈ [0,1] | looRank j y u ≤ α}  =  clamp₍₀,K+1₎(α·(K+1))     for EVERY y.

  Ties, duplicates, adversarial spacing — the identity is exact for every `y` whatsoever, which is
  why no continuity assumption appears in § 1b. -/

/-- The strict-exceedance count of the VALUE `v` in the block: `#{l | v < y l}`. -/
private noncomputable def eCnt (y : Fin (K + 1) → ℝ) (v : ℝ) : ℕ :=
  (univ.filter fun l => v < y l).card

/-- The tie-class size of the VALUE `v` in the block, including the member itself: `#{l | y l = v}`. -/
private noncomputable def cCnt (y : Fin (K + 1) → ℝ) (v : ℝ) : ℕ :=
  (univ.filter fun l => y l = v).card

/-- Two adjacent clamps merge: `clamp₍₀,a₎(x) + clamp₍₀,b₎(x−a) = clamp₍₀,a+b₎(x)`. -/
private lemma clamp_add (x a b : ℝ) (ha : 0 ≤ a) (hb : 0 ≤ b) :
    max 0 (min x a) + max 0 (min (x - a) b) = max 0 (min x (a + b)) := by
  rcases le_total x a with hxa | hxa
  · rw [min_eq_left hxa, min_eq_left (hxa.trans (le_add_of_nonneg_right hb)),
      min_eq_left (by linarith : x - a ≤ b), max_eq_left (by linarith : x - a ≤ 0), add_zero]
  · rw [min_eq_right hxa, max_eq_right ha]
    rcases le_total x (a + b) with hxab | hxab
    · rw [min_eq_left hxab, min_eq_left (by linarith : x - a ≤ b),
        max_eq_right (by linarith : (0:ℝ) ≤ x - a), max_eq_right (ha.trans hxa)]
      ring
    · rw [min_eq_right hxab, min_eq_right (by linarith : b ≤ x - a), max_eq_right hb,
        max_eq_right (add_nonneg ha hb)]

/-- Unit clamps telescope: `Σ_{k<n} clamp₍₀,1₎(x−k) = clamp₍₀,n₎(x)`. -/
private lemma sum_range_clamp (x : ℝ) (n : ℕ) :
    ∑ k ∈ Finset.range n, max 0 (min (x - (k : ℝ)) 1) = max 0 (min x (n : ℝ)) := by
  induction n with
  | zero => rw [Finset.range_zero, Finset.sum_empty, Nat.cast_zero,
      max_eq_left (min_le_right x 0)]
  | succ n ih =>
      rw [Finset.sum_range_succ, ih, Nat.cast_succ]
      exact clamp_add x n 1 (Nat.cast_nonneg n) zero_le_one

/-- Scaling a unit clamp by the class size: `c · clamp₍₀,1₎(x/c) = clamp₍₀,c₎(x)`. -/
private lemma card_smul_clamp (x : ℝ) (c : ℕ) (hc : 0 < c) :
    (c : ℝ) * max 0 (min (x / (c : ℝ)) 1) = max 0 (min x (c : ℝ)) := by
  have hc' : (0:ℝ) < c := Nat.cast_pos.2 hc
  rw [mul_max_of_nonneg _ _ hc'.le, mul_zero, mul_min_of_nonneg _ _ hc'.le, mul_one,
    mul_comm (c : ℝ) (x / (c : ℝ)), div_mul_cancel₀ x hc'.ne']

/-- A tie-class block of unit clamps re-sums to one class clamp. -/
private lemma sum_block_clamp (x : ℝ) (R c : ℕ) :
    ∑ k ∈ Finset.Ico R (R + c), max 0 (min (x - (k : ℝ)) 1)
      = max 0 (min (x - (R : ℝ)) (c : ℝ)) := by
  rw [← sum_range_clamp (x - (R : ℝ)) c, Finset.sum_Ico_eq_sum_range]
  refine Finset.sum_congr (by rw [Nat.add_sub_cancel_left]) fun k _ => ?_
  push_cast
  rw [← sub_sub]

/-- The leave-one-out rank of member `j`: `rankP` applied to `y j` against the other `K` members,
    with the peer list threaded through `Equiv.swap 0 j` so that
    `looRank j y u = looRank 0 (y ∘ swap 0 j) u` (`looRank_comp_swap`) — the form exchangeability
    can consume. -/
private noncomputable def looRank (j : Fin (K + 1)) (y : Fin (K + 1) → ℝ) (u : ℝ) : ℝ :=
  rankP (y j) (fun i => y (Equiv.swap 0 j i.succ)) u

private lemma looRank_zero (y : Fin (K + 1) → ℝ) (u : ℝ) :
    looRank 0 y u = rankP (y 0) (fun i => y i.succ) u := by
  simp [looRank, Equiv.swap_self]

private lemma looRank_comp_swap (j : Fin (K + 1)) (y : Fin (K + 1) → ℝ) (u : ℝ) :
    looRank j y u = looRank 0 (y ∘ Equiv.swap 0 j) u := by
  simp [looRank, Equiv.swap_self, Function.comp, Equiv.swap_apply_left]

/-- Transport a peer count over `i ↦ swap 0 j i.succ`, whose image is exactly `{j}ᶜ`. -/
private lemma card_filter_swap_succ (j : Fin (K + 1)) (p : Fin (K + 1) → Prop) [DecidablePred p] :
    (univ.filter fun i : Fin K => p (Equiv.swap 0 j i.succ)).card
      = ((univ.filter p).erase j).card := by
  refine Finset.card_bij (fun i _ => Equiv.swap 0 j i.succ) ?_ ?_ ?_
  · intro i hi
    refine Finset.mem_erase.2 ⟨fun h => ?_, Finset.mem_filter.2
      ⟨Finset.mem_univ _, (Finset.mem_filter.1 hi).2⟩⟩
    have h2 := congrArg (Equiv.swap 0 j) h
    rw [Equiv.swap_apply_self, Equiv.swap_apply_right] at h2
    exact Fin.succ_ne_zero i h2
  · intro a₁ _ a₂ _ h
    exact Fin.succ_injective _ ((Equiv.swap 0 j).injective h)
  · intro l hl
    have hlj : l ≠ j := (Finset.mem_erase.1 hl).1
    have hswl : Equiv.swap 0 j l ≠ 0 := fun h => hlj (by
      have h2 := congrArg (Equiv.swap 0 j) h
      rwa [Equiv.swap_apply_self, Equiv.swap_apply_left] at h2)
    obtain ⟨i, hi⟩ := Fin.exists_succ_eq.2 hswl
    refine ⟨i, Finset.mem_filter.2 ⟨Finset.mem_univ _, ?_⟩, ?_⟩
    · rw [hi, Equiv.swap_apply_self]
      exact (Finset.mem_filter.1 (Finset.mem_erase.1 hl).2).2
    · rw [hi, Equiv.swap_apply_self]

private lemma exceed_count_eq (y : Fin (K + 1) → ℝ) (j : Fin (K + 1)) :
    (univ.filter fun i : Fin K => y j < y (Equiv.swap 0 j i.succ)).card = eCnt y (y j) := by
  rw [card_filter_swap_succ j (fun l => y j < y l), eCnt]
  congr 1
  exact Finset.erase_eq_of_notMem (by simp)

private lemma tie_count_eq (y : Fin (K + 1) → ℝ) (j : Fin (K + 1)) :
    (univ.filter fun i : Fin K => y (Equiv.swap 0 j i.succ) = y j).card + 1 = cCnt y (y j) := by
  rw [card_filter_swap_succ j (fun l => y l = y j), cCnt]
  exact Finset.card_erase_add_one (Finset.mem_filter.2 ⟨Finset.mem_univ _, rfl⟩)

/-- The uniform jitter measure of a half-line, clamped to the unit interval. -/
private lemma vol01_Iic (c : ℝ) :
    (volume.restrict (Set.Icc (0:ℝ) 1)) {u | u ≤ c} = ENNReal.ofReal (max 0 (min c 1)) := by
  rw [Measure.restrict_apply' measurableSet_Icc]
  have hset : {u : ℝ | u ≤ c} ∩ Set.Icc 0 1 = Set.Icc 0 (min c 1) := by
    ext u
    simp only [Set.mem_inter_iff, Set.mem_setOf_eq, Set.mem_Icc, le_min_iff]
    tauto
  rw [hset, Real.volume_Icc, sub_zero]
  rcases le_total (min c 1) 0 with h | h
  · rw [max_eq_left h, ENNReal.ofReal_eq_zero.2 h, ENNReal.ofReal_zero]
  · rw [max_eq_right h]

/-- The jitter measure of one leave-one-out sublevel event, in closed form. -/
private lemma vol01_looRank_le (y : Fin (K + 1) → ℝ) (j : Fin (K + 1)) (α : ℝ) :
    (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α}
      = ENNReal.ofReal (max 0 (min
          ((α * ((K:ℝ) + 1) - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)) 1)) := by
  have hCpos : (0:ℝ) < (cCnt y (y j) : ℝ) := by
    have h : 0 < cCnt y (y j) := Finset.card_pos.2 ⟨j, Finset.mem_filter.2 ⟨Finset.mem_univ _, rfl⟩⟩
    exact_mod_cast h
  have hset : {u : ℝ | looRank j y u ≤ α}
      = {u : ℝ | u ≤ (α * ((K:ℝ) + 1) - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)} := by
    ext u
    simp only [Set.mem_setOf_eq, looRank, rankP]
    rw [exceed_count_eq]
    have hC : (1:ℝ) + ((univ.filter fun i : Fin K => y (Equiv.swap 0 j i.succ) = y j).card : ℝ)
        = (cCnt y (y j) : ℝ) := by
      have h := tie_count_eq y j
      push_cast [← h]
      ring
    rw [hC, div_le_iff₀ (by positivity : (0:ℝ) < (K:ℝ) + 1), le_div_iff₀ hCpos]
    constructor <;> intro h <;> linarith
  rw [hset, vol01_Iic]

/-- THE combinatorial identity: the leave-one-out clamps sum to the global clamp, for every fixed
    score vector. Fiberwise over tie classes, each class of size `C` at exceedance level `E`
    contributes `clamp₍₀,C₎(β−E)`; the blocks `[E, E+C)` tile `[0, K+1)`; unit clamps telescope. -/
private lemma sum_clamp_eq (y : Fin (K + 1) → ℝ) (β : ℝ) :
    ∑ j : Fin (K + 1), max 0 (min ((β - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)) 1)
      = max 0 (min β ((K : ℝ) + 1)) := by
  classical
  have hmaps : ∀ j ∈ (univ : Finset (Fin (K + 1))), y j ∈ univ.image y := fun j hj =>
    Finset.mem_image_of_mem y hj
  rw [← Finset.sum_fiberwise_of_maps_to hmaps
    (fun j => max 0 (min ((β - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)) 1))]
  -- each fiber is constant of size cCnt y v
  have hfib : ∀ v ∈ univ.image y,
      (∑ j ∈ univ.filter fun j => y j = v,
        max 0 (min ((β - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)) 1))
      = max 0 (min (β - (eCnt y v : ℝ)) (cCnt y v : ℝ)) := by
    intro v hv
    obtain ⟨j₀, _, hj₀⟩ := Finset.mem_image.1 hv
    have hcpos : 0 < cCnt y v := Finset.card_pos.2
      ⟨j₀, Finset.mem_filter.2 ⟨Finset.mem_univ _, hj₀⟩⟩
    calc (∑ j ∈ univ.filter fun j => y j = v,
            max 0 (min ((β - (eCnt y (y j) : ℝ)) / (cCnt y (y j) : ℝ)) 1))
        = ∑ _j ∈ univ.filter fun j => y j = v,
            max 0 (min ((β - (eCnt y v : ℝ)) / (cCnt y v : ℝ)) 1) :=
          Finset.sum_congr rfl fun j hj => by rw [(Finset.mem_filter.1 hj).2]
      _ = (univ.filter fun j => y j = v).card •
            max 0 (min ((β - (eCnt y v : ℝ)) / (cCnt y v : ℝ)) 1) := Finset.sum_const _
      _ = (cCnt y v : ℝ) * max 0 (min ((β - (eCnt y v : ℝ)) / (cCnt y v : ℝ)) 1) := by
          rw [nsmul_eq_mul]; rfl
      _ = max 0 (min (β - (eCnt y v : ℝ)) (cCnt y v : ℝ)) := card_smul_clamp _ _ hcpos
  rw [Finset.sum_congr rfl hfib]
  -- the blocks [E_v, E_v + C_v) are disjoint and tile [0, K+1)
  have hblock_le : ∀ v w : ℝ, w < v → eCnt y v + cCnt y v ≤ eCnt y w := by
    intro v w hwv
    have hd : Disjoint (univ.filter fun l => v < y l) (univ.filter fun l => y l = v) := by
      rw [Finset.disjoint_left]
      intro l h1 h2
      have hlt := (Finset.mem_filter.1 h1).2
      rw [(Finset.mem_filter.1 h2).2] at hlt
      exact lt_irrefl _ hlt
    calc eCnt y v + cCnt y v
        = ((univ.filter fun l => v < y l) ∪ (univ.filter fun l => y l = v)).card :=
          (Finset.card_union_of_disjoint hd).symm
      _ ≤ eCnt y w := by
          apply Finset.card_le_card
          intro l hl
          rcases Finset.mem_union.1 hl with h | h
          · exact Finset.mem_filter.2 ⟨Finset.mem_univ _, hwv.trans (Finset.mem_filter.1 h).2⟩
          · exact Finset.mem_filter.2 ⟨Finset.mem_univ _, by
              rw [(Finset.mem_filter.1 h).2]; exact hwv⟩
  have hdisj : Set.PairwiseDisjoint ↑(univ.image y)
      (fun v => Finset.Ico (eCnt y v) (eCnt y v + cCnt y v)) := by
    intro v _ w _ hvw
    rcases lt_or_gt_of_ne hvw with h | h
    · have hle := hblock_le w v h
      refine Finset.disjoint_left.2 fun k hk hk' => ?_
      have h1 := Finset.mem_Ico.1 hk
      have h2 := Finset.mem_Ico.1 hk'
      omega
    · have hle := hblock_le v w h
      refine Finset.disjoint_left.2 fun k hk hk' => ?_
      have h1 := Finset.mem_Ico.1 hk
      have h2 := Finset.mem_Ico.1 hk'
      omega
  have hbounded : ∀ v ∈ univ.image y, eCnt y v + cCnt y v ≤ K + 1 := by
    intro v _
    have hd : Disjoint (univ.filter fun l => v < y l) (univ.filter fun l => y l = v) := by
      rw [Finset.disjoint_left]
      intro l h1 h2
      have hlt := (Finset.mem_filter.1 h1).2
      rw [(Finset.mem_filter.1 h2).2] at hlt
      exact lt_irrefl _ hlt
    calc eCnt y v + cCnt y v
        = ((univ.filter fun l => v < y l) ∪ (univ.filter fun l => y l = v)).card :=
          (Finset.card_union_of_disjoint hd).symm
      _ ≤ (univ : Finset (Fin (K + 1))).card := Finset.card_le_card (Finset.subset_univ _)
      _ = K + 1 := by rw [Finset.card_univ, Fintype.card_fin]
  have hcover : (univ.image y).biUnion (fun v => Finset.Ico (eCnt y v) (eCnt y v + cCnt y v))
      = Finset.range (K + 1) := by
    apply Finset.eq_of_subset_of_card_le
    · intro k hk
      obtain ⟨v, hv, hkv⟩ := Finset.mem_biUnion.1 hk
      exact Finset.mem_range.2 (lt_of_lt_of_le (Finset.mem_Ico.1 hkv).2 (hbounded v hv))
    · rw [Finset.card_biUnion hdisj, Finset.card_range]
      refine le_of_eq ?_
      calc K + 1 = (univ : Finset (Fin (K + 1))).card := by
            rw [Finset.card_univ, Fintype.card_fin]
        _ = ∑ v ∈ univ.image y, (univ.filter fun j => y j = v).card :=
            Finset.card_eq_sum_card_fiberwise hmaps
        _ = ∑ v ∈ univ.image y, (Finset.Ico (eCnt y v) (eCnt y v + cCnt y v)).card :=
            Finset.sum_congr rfl fun v _ => by rw [Nat.card_Ico]; simp only [cCnt]; omega
  calc ∑ v ∈ univ.image y, max 0 (min (β - (eCnt y v : ℝ)) (cCnt y v : ℝ))
      = ∑ v ∈ univ.image y, ∑ k ∈ Finset.Ico (eCnt y v) (eCnt y v + cCnt y v),
          max 0 (min (β - (k : ℝ)) 1) :=
        Finset.sum_congr rfl fun v _ => (sum_block_clamp β (eCnt y v) (cCnt y v)).symm
    _ = ∑ k ∈ (univ.image y).biUnion (fun v => Finset.Ico (eCnt y v) (eCnt y v + cCnt y v)),
          max 0 (min (β - (k : ℝ)) 1) := (Finset.sum_biUnion hdisj).symm
    _ = ∑ k ∈ Finset.range (K + 1), max 0 (min (β - (k : ℝ)) 1) := by rw [hcover]
    _ = max 0 (min β ((K:ℝ) + 1)) := by rw [sum_range_clamp]; push_cast; ring_nf

/-- For every fixed score vector, the jitter masses of the K+1 leave-one-out sublevel events sum
    EXACTLY to the clamped level. This is conformal calibration with the randomness of the scores
    not yet touched. -/
private lemma sum_vol01_looRank (y : Fin (K + 1) → ℝ) (α : ℝ) :
    ∑ j : Fin (K + 1), (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α}
      = ENNReal.ofReal (max 0 (min (α * ((K:ℝ) + 1)) ((K:ℝ) + 1))) := by
  simp_rw [vol01_looRank_le]
  rw [← ENNReal.ofReal_sum_of_nonneg fun j _ => le_max_left _ _]
  exact congrArg ENNReal.ofReal (sum_clamp_eq y (α * ((K:ℝ) + 1)))

/-! ### § 1b — the randomised statement -/

private lemma measurable_looRank (j : Fin (K + 1)) :
    Measurable fun z : (Fin (K + 1) → ℝ) × ℝ => looRank j z.1 z.2 := by
  have h : (fun z : (Fin (K + 1) → ℝ) × ℝ => looRank j z.1 z.2)
      = fun z => (((∑ i : Fin K, if z.1 j < z.1 (Equiv.swap 0 j i.succ) then (1:ℝ) else 0))
          + z.2 * (1 + (∑ i : Fin K, if z.1 (Equiv.swap 0 j i.succ) = z.1 j then (1:ℝ) else 0)))
          / ((K:ℝ) + 1) := by
    funext z
    simp only [looRank, rankP, Finset.card_filter]
    push_cast
    ring
  rw [h]
  have h1 : Measurable fun z : (Fin (K + 1) → ℝ) × ℝ =>
      ∑ i : Fin K, if z.1 j < z.1 (Equiv.swap 0 j i.succ) then (1:ℝ) else 0 :=
    Finset.measurable_sum _ fun i _ =>
      Measurable.ite (measurableSet_lt ((measurable_pi_apply j).comp measurable_fst)
        ((measurable_pi_apply _).comp measurable_fst)) measurable_const measurable_const
  have h2 : Measurable fun z : (Fin (K + 1) → ℝ) × ℝ =>
      ∑ i : Fin K, if z.1 (Equiv.swap 0 j i.succ) = z.1 j then (1:ℝ) else 0 :=
    Finset.measurable_sum _ fun i _ =>
      Measurable.ite (measurableSet_eq_fun ((measurable_pi_apply _).comp measurable_fst)
        ((measurable_pi_apply j).comp measurable_fst)) measurable_const measurable_const
  exact (h1.add (measurable_snd.mul (measurable_const.add h2))).div_const _

private lemma measurableSet_looRank_le (j : Fin (K + 1)) (α : ℝ) :
    MeasurableSet {z : (Fin (K + 1) → ℝ) × ℝ | looRank j z.1 z.2 ≤ α} :=
  measurableSet_le (measurable_looRank j) measurable_const

private lemma measurable_eCnt_cast (j : Fin (K + 1)) :
    Measurable fun y : Fin (K + 1) → ℝ => (eCnt y (y j) : ℝ) := by
  have h : (fun y : Fin (K + 1) → ℝ => (eCnt y (y j) : ℝ))
      = fun y => ∑ l : Fin (K + 1), if y j < y l then (1:ℝ) else 0 := by
    funext y
    rw [eCnt, Finset.card_filter]
    push_cast
    rfl
  rw [h]
  exact Finset.measurable_sum _ fun l _ =>
    Measurable.ite (measurableSet_lt (measurable_pi_apply j) (measurable_pi_apply l))
      measurable_const measurable_const

private lemma measurable_cCnt_cast (j : Fin (K + 1)) :
    Measurable fun y : Fin (K + 1) → ℝ => (cCnt y (y j) : ℝ) := by
  have h : (fun y : Fin (K + 1) → ℝ => (cCnt y (y j) : ℝ))
      = fun y => ∑ l : Fin (K + 1), if y l = y j then (1:ℝ) else 0 := by
    funext y
    rw [cCnt, Finset.card_filter]
    push_cast
    rfl
  rw [h]
  exact Finset.measurable_sum _ fun l _ =>
    Measurable.ite (measurableSet_eq_fun (measurable_pi_apply l) (measurable_pi_apply j))
      measurable_const measurable_const

private lemma measurable_levelMass (j : Fin (K + 1)) (α : ℝ) :
    Measurable fun y : Fin (K + 1) → ℝ =>
      (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α} := by
  simp_rw [vol01_looRank_le]
  exact ENNReal.measurable_ofReal.comp
    (Measurable.max measurable_const (Measurable.min
      (Measurable.div (Measurable.sub measurable_const (measurable_eCnt_cast j))
        (measurable_cCnt_cast j)) measurable_const))

private lemma measurable_pairMap {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) :
    Measurable fun ω => ((fun i => S i ω : Fin (K + 1) → ℝ), U ω) :=
  (measurable_pi_lambda _ fun i => hSm i).prodMk hUm

/-- The rank statistic itself is measurable — needed both here and by `calibrate_isEValue`. -/
lemma measurable_rank {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) :
    Measurable fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω) := by
  have h : (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω))
      = (fun z : (Fin (K + 1) → ℝ) × ℝ => looRank 0 z.1 z.2)
        ∘ (fun ω => ((fun i => S i ω : Fin (K + 1) → ℝ), U ω)) :=
    funext fun ω => (looRank_zero (fun i => S i ω) (U ω)).symm
  rw [h]
  exact (measurable_looRank 0).comp (measurable_pairMap hSm hUm)

/-- The canonical-space computation: for ANY permutation-invariant probability law `ν` of the
    score block, taking the product with an independent Unif[0,1] jitter gives the rank sublevel
    mass `clamp₍₀,1₎(α)` EXACTLY. Stated over an abstract `ν` so the terms stay small; `rank_cdf`
    instantiates it at the pushforward score law. -/
private lemma prod_looRank_mass (ν : Measure (Fin (K + 1) → ℝ)) [IsProbabilityMeasure ν]
    (hinv : ∀ σ : Equiv.Perm (Fin (K + 1)), Measure.map (fun y => y ∘ σ) ν = ν) (α : ℝ) :
    (ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank 0 z.1 z.2 ≤ α}
      = ENNReal.ofReal (max 0 (min α 1)) := by
  classical
  -- every leave-one-out index has the same sublevel mass, by transport along (y,u) ↦ (y∘σ, u)
  have hswap : ∀ j : Fin (K + 1),
      (ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank j z.1 z.2 ≤ α}
        = (ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank 0 z.1 z.2 ≤ α} := by
    intro j
    have hTm : Measurable fun y : Fin (K + 1) → ℝ => y ∘ (Equiv.swap 0 j) :=
      measurable_pi_lambda _ fun i => measurable_pi_apply _
    have hpre2 : (Prod.map (fun y : Fin (K + 1) → ℝ => y ∘ (Equiv.swap 0 j)) (id : ℝ → ℝ)) ⁻¹'
        {z : (Fin (K + 1) → ℝ) × ℝ | looRank 0 z.1 z.2 ≤ α}
        = {z | looRank j z.1 z.2 ≤ α} := by
      ext z
      simp only [Set.mem_preimage, Set.mem_setOf_eq, Prod.map_fst, Prod.map_snd, id_eq]
      rw [← looRank_comp_swap]
    rw [← hpre2,
      ← Measure.map_apply (hTm.prodMap measurable_id) (measurableSet_looRank_le 0 α),
      ← Measure.map_prod_map _ _ hTm measurable_id, hinv (Equiv.swap 0 j), Measure.map_id]
  -- Fubini + the deterministic per-y identity give the sum of all K+1 masses
  have hsum : ((K : ℝ≥0∞) + 1) *
      ((ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank 0 z.1 z.2 ≤ α})
      = ENNReal.ofReal (max 0 (min (α * ((K:ℝ) + 1)) ((K:ℝ) + 1))) := by
    have hfub : ∀ j : Fin (K + 1),
        (ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank j z.1 z.2 ≤ α}
          = ∫⁻ y, (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α} ∂ν := by
      intro j
      rw [Measure.prod_apply (measurableSet_looRank_le j α)]
      exact lintegral_congr fun y => rfl
    calc ((K : ℝ≥0∞) + 1) *
          ((ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank 0 z.1 z.2 ≤ α})
        = ∑ j : Fin (K + 1),
            (ν.prod (volume.restrict (Set.Icc (0:ℝ) 1))) {z | looRank j z.1 z.2 ≤ α} := by
          rw [Finset.sum_congr rfl fun j _ => hswap j, Finset.sum_const, Finset.card_univ,
            Fintype.card_fin, nsmul_eq_mul]
          push_cast
          ring
      _ = ∑ j : Fin (K + 1),
            ∫⁻ y, (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α} ∂ν :=
          Finset.sum_congr rfl fun j _ => hfub j
      _ = ∫⁻ y, ∑ j : Fin (K + 1),
            (volume.restrict (Set.Icc (0:ℝ) 1)) {u | looRank j y u ≤ α} ∂ν :=
          (lintegral_finsetSum _ fun j _ => measurable_levelMass j α).symm
      _ = ∫⁻ _y, ENNReal.ofReal (max 0 (min (α * ((K:ℝ) + 1)) ((K:ℝ) + 1))) ∂ν :=
          lintegral_congr fun y => sum_vol01_looRank y α
      _ = ENNReal.ofReal (max 0 (min (α * ((K:ℝ) + 1)) ((K:ℝ) + 1))) := by
          rw [lintegral_const, measure_univ, mul_one]
  -- divide by K+1 and simplify the clamp
  have hne0 : ((K : ℝ≥0∞) + 1) ≠ 0 := (lt_of_lt_of_le zero_lt_one le_add_self).ne'
  have hnetop : ((K : ℝ≥0∞) + 1) ≠ ∞ := by finiteness
  rw [(ENNReal.eq_div_iff hne0 hnetop).2 hsum]
  have hscale : max 0 (min (α * ((K:ℝ) + 1)) ((K:ℝ) + 1)) = ((K:ℝ) + 1) * max 0 (min α 1) := by
    rw [mul_max_of_nonneg _ _ (by positivity : (0:ℝ) ≤ (K:ℝ) + 1), mul_zero,
      mul_min_of_nonneg _ _ (by positivity : (0:ℝ) ≤ (K:ℝ) + 1), mul_one,
      mul_comm ((K:ℝ) + 1) α]
  have hcast : ENNReal.ofReal ((K:ℝ) + 1) = (K : ℝ≥0∞) + 1 := by
    rw [show (K:ℝ) + 1 = ((K + 1 : ℕ) : ℝ) by push_cast; ring, ENNReal.ofReal_natCast]
    push_cast
    ring
  rw [hscale, ENNReal.ofReal_mul (by positivity : (0:ℝ) ≤ (K:ℝ) + 1), hcast, mul_comm,
    ENNReal.mul_div_cancel_right hne0 hnetop]

/-- The exact CDF of the randomised rank: `P(rank ≤ α) = clamp₍₀,1₎(α)`, from which both
    `rank_uniform` and `rank_superUniform` follow. The hypothesis `hjoint` is the honest form of
    "the jitter is Unif[0,1] independent of the scores": the joint law is the product law. -/
private lemma rank_cdf {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) (hex : Exchangeable P S)
    (hjoint : Measure.map (fun ω => ((fun i => S i ω), U ω)) P
      = (Measure.map (fun ω i => S i ω) P).prod (volume.restrict (Set.Icc (0:ℝ) 1)))
    (α : ℝ) :
    P {ω | rankP (S 0 ω) (fun i => S i.succ ω) (U ω) ≤ α}
      = ENNReal.ofReal (max 0 (min α 1)) := by
  have hSvec : Measurable fun ω (i : Fin (K + 1)) => S i ω :=
    measurable_pi_lambda _ fun i => hSm i
  haveI : IsProbabilityMeasure (Measure.map (fun ω (i : Fin (K + 1)) => S i ω) P) :=
    Measure.isProbabilityMeasure_map hSvec.aemeasurable
  have hinv : ∀ σ : Equiv.Perm (Fin (K + 1)),
      Measure.map (fun y => y ∘ σ) (Measure.map (fun ω i => S i ω) P)
        = Measure.map (fun ω i => S i ω) P := by
    intro σ
    have hTm : Measurable fun y : Fin (K + 1) → ℝ => y ∘ σ :=
      measurable_pi_lambda _ fun i => measurable_pi_apply _
    rw [Measure.map_map hTm hSvec]
    exact hex σ
  have hpre : (fun ω => ((fun i => S i ω), U ω)) ⁻¹'
      {z : (Fin (K + 1) → ℝ) × ℝ | looRank 0 z.1 z.2 ≤ α}
      = {ω | rankP (S 0 ω) (fun i => S i.succ ω) (U ω) ≤ α} := by
    ext ω
    simp only [Set.mem_preimage, Set.mem_setOf_eq, looRank_zero]
  rw [← hpre, ← Measure.map_apply (measurable_pairMap hSm hUm) (measurableSet_looRank_le 0 α),
    hjoint]
  exact prod_looRank_mass (Measure.map (fun ω i => S i ω) P) hinv α

/-- **Exact uniformity of the randomised rank under exchangeability.**

    The tie term is exactly what makes this work without a continuous-distribution assumption —
    the construction is distribution-free.

    STATEMENT REPAIR (2026-07-26): the original carried `hU` (jitter marginal) plus a placeholder
    `hindep : True`; both are replaced by `hjoint`, the product-form joint law, which IS
    "Unif[0,1] jitter independent of the scores" and is what any real jitter generator satisfies.
    `Measurable` hypotheses added (they were implicit in prose, and are free at the call sites).

    Verified exhaustively over `S_{K+1}` for K = 2,3,4 against the shipped implementation. -/
theorem rank_uniform {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) (hex : Exchangeable P S)
    (hjoint : Measure.map (fun ω => ((fun i => S i ω), U ω)) P
      = (Measure.map (fun ω i => S i ω) P).prod (volume.restrict (Set.Icc (0:ℝ) 1))) :
    Measure.map (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) P
      = volume.restrict (Set.Icc (0:ℝ) 1) := by
  have hrank := measurable_rank hSm hUm
  haveI : IsProbabilityMeasure
      (Measure.map (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) P) :=
    Measure.isProbabilityMeasure_map hrank.aemeasurable
  refine Measure.ext_of_Iic _ _ fun a => ?_
  rw [Measure.map_apply hrank measurableSet_Iic]
  calc P ((fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) ⁻¹' Set.Iic a)
      = P {ω | rankP (S 0 ω) (fun i => S i.succ ω) (U ω) ≤ a} := rfl
    _ = ENNReal.ofReal (max 0 (min a 1)) := rank_cdf P hSm hUm hex hjoint a
    _ = (volume.restrict (Set.Icc (0:ℝ) 1)) (Set.Iic a) := (vol01_Iic a).symm

/-- Corollary: the rank is super-uniform — the form `EValue.calibrate_isEValue` consumes.

    STATEMENT REPAIR (2026-07-26): as first written this had NO independence hypothesis and was
    FALSE — couple the jitter adversarially to the scores (uniform marginal, but squeezed into the
    low half of its rank cell) and `P(p ≤ 1/4) = 1/2` at K = 1. Independence is not decoration;
    it enters through `hjoint` exactly as in `rank_uniform`. -/
theorem rank_superUniform {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) (hex : Exchangeable P S)
    (hjoint : Measure.map (fun ω => ((fun i => S i ω), U ω)) P
      = (Measure.map (fun ω i => S i ω) P).prod (volume.restrict (Set.Icc (0:ℝ) 1))) :
    EValue.SuperUniform P (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) := by
  intro α hα
  calc (P {ω | rankP (S 0 ω) (fun i => S i.succ ω) (U ω) ≤ α}).toReal
      = (ENNReal.ofReal (max 0 (min α 1))).toReal := by rw [rank_cdf P hSm hUm hex hjoint α]
    _ = max 0 (min α 1) := ENNReal.toReal_ofReal (le_max_left _ _)
    _ ≤ α := max_le hα (min_le_left _ _)

/-- The rank lands in `[0,1]` whenever the jitter does — pointwise, no measure theory. -/
lemma rankP_mem_Icc {y : ℝ} {peers : Fin K → ℝ} {u : ℝ} (hu : u ∈ Set.Icc (0:ℝ) 1) :
    rankP y peers u ∈ Set.Icc (0:ℝ) 1 := by
  obtain ⟨hu0, hu1⟩ := hu
  have hRT : (univ.filter fun i => y < peers i).card
      + (univ.filter fun i => peers i = y).card ≤ K := by
    have hd : Disjoint (univ.filter fun i => y < peers i) (univ.filter fun i => peers i = y) := by
      rw [Finset.disjoint_left]
      intro i h1 h2
      have hlt := (Finset.mem_filter.1 h1).2
      rw [← (Finset.mem_filter.1 h2).2] at hlt
      exact lt_irrefl _ hlt
    calc (univ.filter fun i => y < peers i).card + (univ.filter fun i => peers i = y).card
        = ((univ.filter fun i => y < peers i) ∪ (univ.filter fun i => peers i = y)).card :=
          (Finset.card_union_of_disjoint hd).symm
      _ ≤ (univ : Finset (Fin K)).card := Finset.card_le_card (Finset.subset_univ _)
      _ = K := by rw [Finset.card_univ, Fintype.card_fin]
  have hT0 : (0:ℝ) ≤ 1 + ((univ.filter fun i => peers i = y).card : ℝ) := by positivity
  constructor
  · apply div_nonneg _ (by positivity : (0:ℝ) ≤ (K:ℝ) + 1)
    have := mul_nonneg hu0 hT0
    positivity
  · rw [rankP, div_le_one (by positivity : (0:ℝ) < (K:ℝ) + 1)]
    have h1 : u * (1 + ((univ.filter fun i => peers i = y).card : ℝ))
        ≤ 1 + ((univ.filter fun i => peers i = y).card : ℝ) := mul_le_of_le_one_left hT0 hu1
    have h2 : ((univ.filter fun i => y < peers i).card : ℝ)
        + ((univ.filter fun i => peers i = y).card : ℝ) ≤ (K : ℝ) := by exact_mod_cast hRT
    linarith

/-- **The validity chain, end to end**: under exchangeability of the block scores and an
    independent Unif[0,1] jitter, the calibrated conformal rank IS an e-value. Composes § 1 with
    `EValue.calibrate_isEValue`; feeding these e-values to `certifiedFdrBenjaminiHochberg` is what
    `EBH.fdr_le`'s "GIVEN valid e-values" scope condition asks for, so for the canary construction
    the whole chain
      exchangeability → exact rank → calibrator → e-value → e-BH → FDR ≤ q
    is now machine-checked with no informal step. `hU01` (the jitter lands in [0,1] pointwise, not
    just in law) is free for every real jitter generator. -/
theorem calibrated_rank_isEValue {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ} {f : ℝ → ℝ}
    (hf : EValue.IsCalibrator f)
    (hSm : ∀ i, Measurable (S i)) (hUm : Measurable U) (hU01 : ∀ ω, U ω ∈ Set.Icc (0:ℝ) 1)
    (hex : Exchangeable P S)
    (hjoint : Measure.map (fun ω => ((fun i => S i ω), U ω)) P
      = (Measure.map (fun ω i => S i ω) P).prod (volume.restrict (Set.Icc (0:ℝ) 1))) :
    IsEValue P (fun ω => f (rankP (S 0 ω) (fun i => S i.succ ω) (U ω))) :=
  EValue.calibrate_isEValue P hf (measurable_rank hSm hUm)
    (rank_superUniform P hSm hUm hex hjoint) (fun ω => rankP_mem_Icc (hU01 ω))

/-! ## § 2 — Proposition A2: the drift identity

  The statement that changed the product claim. Posed originally as "approximate exchangeability ⇒
  bounded drift", which was the wrong question: under the canary design the per-round rank is
  EXACTLY uniform (§ 1), so nothing is approximate per round. The failure is purely serial.
-/

variable {δ : Type*} [MeasurableSpace δ]

/-- `g(d) = E[f(p) | Δ = d]`, the conditional increment mean given a unit's persistent state. -/
noncomputable def g (P : Measure Ω) (f : ℝ → ℝ) (p : Ω → ℝ) (Δ : Ω → δ) (d : δ) : ℝ :=
  ∫ ω, f (p ω) ∂(P) -- placeholder: the conditional law given Δ = d; `condExp`/disintegration in the real development

/-- **A2(1) — per-round validity.** `E[g(Δ)] = 1` whenever the unconditional score law is
    exchangeable. This is exactly § 1 composed with the calibrator identity, and it is what the
    A2-E1b experiment confirmed empirically: per-test FPR stayed at nominal 0.01 at every horizon
    out to T = 320, in every scenario. -/
theorem marginal_validity {f : ℝ → ℝ} {p : Ω → ℝ} {Δ : Ω → δ}
    (hf : EValue.IsCalibrator f) (hp : EValue.SuperUniform P p) :
    ∫ d, g P f p Δ d ∂(Measure.map Δ P) ≤ 1 := by
  sorry

/-- **A2(2) — the accumulation identity.** Conditional on `Δ`, the increments are i.i.d., so
    `E[M_T] = E_Δ[g(Δ)^T]`.

    This is the whole content of the A2 line. Note it is an EQUALITY, not a bound: `Λ(T)` is the
    exact null mean of the accumulator. -/
theorem accumulator_mean {f : ℝ → ℝ} {p : ℕ → Ω → ℝ} {Δ : Ω → δ} (T : ℕ)
    (hiid : True /- conditionally i.i.d. given Δ -/) :
    ∫ ω, (∏ t ∈ range T, f (p t ω)) ∂P = ∫ d, (g P f (p 0) Δ d) ^ T ∂(Measure.map Δ P) := by
  sorry

/-- **A2(3) — Jensen.** `Λ(T) ≥ 1`, strictly for `T ≥ 2` unless `g` is a.s. constant (⇔ no
    persistent heterogeneity). Per-round validity does NOT survive accumulation.

    Elementary once A2(2) is available: `x ↦ x^T` is strictly convex on `[0,∞)` for `T ≥ 2`, and
    `E[g] ≤ 1`. -/
theorem accumulator_ge_one {f : ℝ → ℝ} {p : ℕ → Ω → ℝ} {Δ : Ω → δ} (T : ℕ) (hT : 2 ≤ T)
    (hmean : ∫ d, g P f (p 0) Δ d ∂(Measure.map Δ P) = 1) :
    1 ≤ ∫ d, (g P f (p 0) Δ d) ^ T ∂(Measure.map Δ P) := by
  sorry

/-- **A2 corollary — the FDR consequence.** Feeding `M_T` to e-BH controls `FDR ≤ q·Λ(T)`, by e-BH's
    scale invariance (`e-BH(e/μ, q) ≡ e-BH(e, q/μ)`, the N3 observation).

    ⚠️ SCOPE, from the A2-E1b experiment: this bound is TRUE and OPERATIONALLY VACUOUS. `Λ(T)` is
    dominated by tail mass at probabilities far below `1/N`, so it saturates at `N` while the
    realised degradation was 3.3×. The quantity the product should carry is the first-passage rate
    of `research/2026-07-25-a2-tail-probability.md`, not this. Formalise it for completeness, do not
    quote it as a guarantee. -/
theorem fdr_inflated {q lam : ℝ} (hq : 0 < q) : True := trivial

end Conformal
end Tessera
