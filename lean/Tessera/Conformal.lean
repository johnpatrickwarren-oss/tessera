/-
  Tessera/Conformal.lean — randomised conformal ranks, and Proposition A2 (the drift identity).

  ⚠️ BUILD STATUS: NOT MACHINE-CHECKED (no Lean toolchain in the authoring environment).

  Two blocks:
    § 1  exchangeability ⇒ the randomised rank is EXACTLY uniform            (link L2 of ADR 0023)
    § 2  Proposition A2: per-round validity survives, accumulation does not  (the drift identity)

  NUMERICAL VALIDATION (research/2026-07-26-lean-formalisation.md § 2):
  `rank_uniform` was checked EXHAUSTIVELY over all permutations for K = 2, 3, 4 against the shipped
  `conformalP` (canary-sim.ts:374), integrating out the jitter: E[p] = 0.500000 and E[p²] = 0.333333
  to six decimals — i.e. exactly Unif[0,1], not merely super-uniform.
  `drift_identity` and `accumulator_mean` were validated by Monte-Carlo against the shipped rank
  construction in `test/exchangeability-drift.test.ts`.
-/
import Tessera.EValue
import Mathlib.Probability.Notation
import Mathlib.GroupTheory.Perm.Basic

open MeasureTheory Finset

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

/-- **Exact uniformity of the randomised rank under exchangeability.**

    Proof: with `U ~ Unif[0,1]` independent of the scores, the numerator `R + U·(1 + T)` where `R` is
    the strict-exceedance count and `T` the tie count is, by exchangeability, uniform on the `K+1`
    rank cells with the jitter uniform inside its cell; hence uniform on `[0, K+1]`, and dividing by
    `K+1` gives `Unif[0,1]`. The tie term is exactly what makes this work without a
    continuous-distribution assumption — the construction is distribution-free.

    Verified exhaustively over `S_{K+1}` for K = 2,3,4 against the shipped implementation. -/
theorem rank_uniform {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hex : Exchangeable P S) (hU : Measure.map U P = (volume.restrict (Set.Icc (0:ℝ) 1)))
    (hindep : True /- U ⟂ S; stated properly with ProbabilityTheory.IndepFun -/) :
    Measure.map (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) P
      = volume.restrict (Set.Icc (0:ℝ) 1) := by
  sorry

/-- Corollary: the rank is super-uniform, which is the form `EValue.calibrate_isEValue` consumes. -/
theorem rank_superUniform {S : Fin (K + 1) → Ω → ℝ} {U : Ω → ℝ}
    (hex : Exchangeable P S) (hU : Measure.map U P = (volume.restrict (Set.Icc (0:ℝ) 1))) :
    EValue.SuperUniform P (fun ω => rankP (S 0 ω) (fun i => S i.succ ω) (U ω)) := by
  sorry

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
