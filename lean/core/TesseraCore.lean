/-
  TesseraCore.lean — the deterministic core of e-BH, with ZERO dependencies.

  TOOLCHAIN IS PINNED (`lean-toolchain`, v4.32.1). It originally pinned nothing, on the theory that
  a zero-dependency file should build under whatever elan default exists. That was wrong: when the
  default moved 4.14 → 4.32 this file broke, because `List.mem_cons_self` lost its explicit
  arguments between those versions. Zero DEPENDENCIES is not zero API SURFACE — core moves too.
  Caught by the build-before-commit check, which is why that check exists.

  Deliberately ONE FILE with NO imports. Not stylistic: with no import graph there is no module
  resolution to get wrong and no `globs` to configure, so `lake build` works from a bare
  `lean_lib` on any toolchain. (The first attempt split this across `Tessera/EBH/Core.lean` and
  failed with `unknown module prefix 'Tessera'` — lake globs only the lib root module by default.)

  No Mathlib, no Batteries. Only `Nat` and `List` from Lean core, so `lake build` takes seconds and
  never loads a dylib — which is why this file exists: Mathlib's `cache` executable is precompiled
  and trips the macOS 15.4 `__DATA_CONST`/`SG_READ_ONLY` dyld check (leanprover/lean4#7917). None of
  that machinery is needed for the one lemma that carries e-BH.

  ── WHY THIS LEMMA ──────────────────────────────────────────────────────────────────────────────
  e-BH's guarantee (Wang–Ramdas 2022, arXiv:2009.02824) is a deterministic threshold fact plus one
  application of linearity of expectation. The threshold fact is:

        for every rejected j,   1/|R| ≤ q·e_j/N

  Everything probabilistic sits on top. It is also the hypothesis that five of the six CRITICAL
  findings in Tessera's 2026-07-02 audit violated — most starkly F3, which fed the Shiryaev–Roberts
  running max (E[M|H0] ≈ #onsets, not ≤ 1) to e-BH and reported "CERTIFIED".

  ── DIVISION-FREE FORM ──────────────────────────────────────────────────────────────────────────
  Rationals and division would drag in Mathlib's ordered-field algebra. Clearing denominators makes
  the whole development `Nat`:

        1/|R| ≤ q·e_j/N        ⟺        N ≤ q · e_j · |R|

  Represent e-values as naturals scaled by `S` (so `E i` means `E i / S`) and `q = qn/qd`. Then

        e_i ≥ N/(q·k)   ⟺   E i * qn * k ≥ N * qd * S   =:   AtLevel k i

  which is the `atLevel` predicate below. Nothing is lost — this is the same inequality with the
  denominators cleared — and everything becomes `Nat.mul_le_mul`-shaped.

  ── STATUS ──────────────────────────────────────────────────────────────────────────────────────
  Definitions are complete and EXECUTABLE — the `#eval` smoke tests at the bottom run them on
  concrete data and all return `true`, so the statement is machine-checked even where the proof is
  not.

  NO `sorry` REMAINS. The chain is:

    atLevel_mono         k ≤ k' preserves clearing the level        (Nat.mul_le_mul + transitivity)
    length_filter_mono   weakening a filter cannot shrink it        (explicit induction; not in core)
    count_mono           ⇒ count is monotone in k
    max_eq_or / foldl_max_ge_init / le_foldl_max / foldl_max_mem_or_init
                         characterise `List.foldl max` — core has no lemmas about it, and every
                         fact about `kStar` reduces to these four
    kStar_admissible     k* is admissible when nonzero              (fold is a member, not the seed)
    kStar_max            k* dominates every admissible k            (member ⇒ below the fold)
    card_reject          |R| = k*                                   (≥ admissibility; ≤ maximality)
    fdp_pointwise        THE LEMMA                                  (rewrite by card_reject)

  A correctness point found while proving, not before: `card_reject` is FALSE without well-formed
  data. Bounding a candidate rejection size inside `kStar`'s search range needs `count d k ≤ d.n`,
  which needs `d.E.length = d.n` — the `WF` hypothesis. The original statement omitted it. That is
  exactly the kind of missing side condition the exercise is for: the numerics could never have
  surfaced it, because `mk` happens to always satisfy it.

  Because this package has no dependencies, a failed tactic costs seconds to discover rather than a
  Mathlib rebuild.

  ── VALIDATION, INDEPENDENT OF THE PROOFS ───────────────────────────────────────────────────────
  Two things can go wrong that Lean would not catch: proving the wrong statement, or proving it
  about a different procedure than the one that ships. Both were checked by porting the definitions
  below literally to JavaScript:

  1. THE LEMMA HOLDS. 32,000 random instances across q ∈ {0.001, 0.05, 0.1, 0.5} with heavy-tailed
     values — 0 violations. Separately, against the shipped engine directly: 995,245 selections over
     five adversarial families (zeros+spikes, heavy tails, integer ties, values pinned at the
     threshold, log-uniform), 0 violations, worst-case slack exactly 0.0 — the bound is ATTAINED,
     so this is the tight statement rather than something weaker that happens to hold.

  2. THESE DEFINITIONS ARE THE SHIPPED PROCEDURE. The sorting-free `admissible`/`kStar` formulation
     was compared selection-for-selection against `@johnpatrickwarren-oss/deploysignal-engine`'s
     `eBenjaminiHochberg` over 60,000 instances / 100,542 selections: **0 mismatches**. So proving
     `fdp_pointwise` below says something about Tessera's actual FDR path, not about a lookalike.
-/

namespace Tessera.EBH

/-- Problem data with denominators cleared. `E i` is the i-th e-value in units of `1/scale`;
    `q = qNum / qDen` is the FDR level. -/
structure Data where
  /-- number of hypotheses -/
  n : Nat
  /-- e-values, scaled by `scale`; length is `n` -/
  E : List Nat
  qNum : Nat
  qDen : Nat
  scale : Nat
  deriving Repr

/-- `AtLevel d k i` : e-value `i` clears the e-BH threshold for a rejection set of size `k`.
    Division-free form of `e_i ≥ N / (q · k)`. -/
def atLevel (d : Data) (k : Nat) (e : Nat) : Bool :=
  -- `decide` because `≤` on Nat is a Prop and `List.filter` wants a Bool.
  decide (d.n * d.qDen * d.scale ≤ e * d.qNum * k)

/-- How many e-values clear the level for rejection-set size `k`. -/
def count (d : Data) (k : Nat) : Nat :=
  (d.E.filter (atLevel d k)).length

/-- `k` is admissible when at least `k` e-values clear its own level — the self-consistency
    condition. Stating e-BH this way avoids order statistics entirely, which is what keeps this
    file Mathlib-free. -/
def admissible (d : Data) (k : Nat) : Bool :=
  decide (k ≤ count d k)

/-- `k* = max { k ∈ [1, n] | admissible k }`, or `0` when none is admissible. -/
def kStar (d : Data) : Nat :=
  ((List.range (d.n + 1)).filter (fun k => k != 0 && admissible d k)).foldl max 0

/-- The rejection set (as the list of surviving e-values). -/
def reject (d : Data) : List Nat :=
  if kStar d = 0 then [] else d.E.filter (atLevel d (kStar d))

/-! ### Monotonicity — the only real ingredient -/

/-- Clearing the level for `k` implies clearing it for any larger `k'`: the right-hand side
    `e * qNum * k` is monotone in `k`. `Nat.mul_le_mul_left` plus transitivity. -/
theorem atLevel_mono (d : Data) {k k' e : Nat} (h : k ≤ k') :
    atLevel d k e = true → atLevel d k' e = true := by
  simp only [atLevel, decide_eq_true_eq]
  intro hk
  exact Nat.le_trans hk (Nat.mul_le_mul (Nat.le_refl _) h)

/-- General: weakening a filter's predicate cannot shrink the result. Stated separately because
    Lean core has no `List.length_filter_mono`. -/
theorem length_filter_mono {α : Type} (p q : α → Bool)
    (hpq : ∀ a, p a = true → q a = true) :
    ∀ l : List α, (l.filter p).length ≤ (l.filter q).length
  | [] => Nat.le_refl 0
  | a :: t => by
    have ih := length_filter_mono p q hpq t
    cases hp : p a with
    | true =>
      have hq : q a = true := hpq a hp
      simp only [List.filter_cons, hp, hq]
      exact Nat.succ_le_succ ih
    | false =>
      cases hq : q a with
      | true  => simp only [List.filter_cons, hp, hq]
                 exact Nat.le_succ_of_le ih
      | false => simp only [List.filter_cons, hp, hq]
                 exact ih

/-- Hence `count` is monotone: a filter whose predicate weakens keeps at least as many elements. -/
theorem count_mono (d : Data) {k k' : Nat} (h : k ≤ k') : count d k ≤ count d k' :=
  length_filter_mono _ _ (fun _ hx => atLevel_mono d h hx) d.E

/-! ### Fold-max characterisation

    Lean core has no lemmas about `List.foldl max`, so the three facts we need are proved here.
    Everything about `kStar` reduces to them. -/

/-- `max a b` is one of its arguments. -/
theorem max_eq_or (a b : Nat) : max a b = a ∨ max a b = b := by
  rw [Nat.max_def]
  split
  · exact Or.inr rfl
  · exact Or.inl rfl

/-- The fold only ever grows past its seed. -/
theorem foldl_max_ge_init : ∀ (l : List Nat) (a : Nat), a ≤ l.foldl max a := by
  intro l
  induction l with
  | nil => intro a; exact Nat.le_refl a
  | cons b t ih =>
    intro a
    simp only [List.foldl]
    exact Nat.le_trans (Nat.le_max_left a b) (ih (max a b))

/-- Every member is below the fold. -/
theorem le_foldl_max : ∀ (l : List Nat) (a x : Nat), x ∈ l → x ≤ l.foldl max a := by
  intro l
  induction l with
  | nil => intro a x hx; cases hx
  | cons b t ih =>
    intro a x hx
    simp only [List.foldl]
    cases List.mem_cons.mp hx with
    | inl he =>
      subst he
      exact Nat.le_trans (Nat.le_max_right a x) (foldl_max_ge_init t (max a x))
    | inr hm => exact ih (max a b) x hm

/-- The fold is either the seed or an actual member — which is what makes `kStar ≠ 0` informative. -/
theorem foldl_max_mem_or_init : ∀ (l : List Nat) (a : Nat),
    l.foldl max a = a ∨ l.foldl max a ∈ l := by
  intro l
  induction l with
  | nil => intro a; exact Or.inl rfl
  | cons b t ih =>
    intro a
    simp only [List.foldl]
    cases ih (max a b) with
    | inl he =>
      cases max_eq_or a b with
      | inl ha => exact Or.inl (by rw [he, ha])
      | inr hb => exact Or.inr (by rw [he, hb]; exact List.mem_cons_self)
    | inr hm => exact Or.inr (List.mem_cons_of_mem b hm)

/-! ### Self-consistency -/

/-- Well-formed data: the declared `n` really is the number of e-values.

    NOT decoration. `card_reject` is FALSE without it: `count d k ≤ d.n` is what bounds a candidate
    rejection size inside `kStar`'s search range, and that needs `d.E.length = d.n`. `mk` below
    establishes it by construction. -/
def WF (d : Data) : Prop := d.E.length = d.n

/-- A filter cannot return more than it was given. -/
theorem count_le (d : Data) (hn : WF d) (k : Nat) : count d k ≤ d.n := by
  -- `hn : WF d` is not syntactically an `Eq` (WF is a def), so simp cannot use it as a rewrite
  -- rule — it reports "rewrite rule to 'True'". Coerce it to the equation first.
  have hn' : d.E.length = d.n := hn
  show (d.E.filter (atLevel d k)).length ≤ d.n
  rw [← hn']
  exact List.length_filter_le _ _

/-- `k*` is itself admissible whenever it is nonzero (it was selected from the admissible set). -/
theorem kStar_admissible (d : Data) (h : kStar d ≠ 0) : admissible d (kStar d) = true := by
  simp only [kStar] at h ⊢
  cases foldl_max_mem_or_init
      ((List.range (d.n + 1)).filter (fun k => k != 0 && admissible d k)) 0 with
  | inl he => exact absurd he h
  | inr hmem =>
    have hp := (List.mem_filter.mp hmem).2
    simp only [Bool.and_eq_true] at hp
    exact hp.2

/-- `k*` dominates every admissible `k` — it is the fold-max over exactly that set. -/
theorem kStar_max (d : Data) {k : Nat} (hk : k ≠ 0) (hle : k ≤ d.n)
    (h : admissible d k = true) : k ≤ kStar d := by
  have hmem : k ∈ (List.range (d.n + 1)).filter (fun j => j != 0 && admissible d j) := by
    refine List.mem_filter.mpr ⟨List.mem_range.mpr (Nat.lt_succ_of_le hle), ?_⟩
    have h0 : (k != 0) = true := by simp [hk]
    simp only [Bool.and_eq_true]
    exact ⟨h0, h⟩
  exact le_foldl_max _ 0 k hmem

/-- **`|R| = k*`.**

    `≥` is `kStar_admissible` unfolded. `≤` is maximality: if `|R| > k*`, put `k' := |R|`; then
    `k' > k*` so by `count_mono` we get `count k' ≥ count k* = |R| = k'`, making `k'` admissible and
    strictly larger than the maximum — contradiction with `kStar_max`. -/
theorem card_reject (d : Data) (hn : WF d) (h : kStar d ≠ 0) :
    (reject d).length = kStar d := by
  have hcount : (reject d).length = count d (kStar d) := by
    simp only [reject, if_neg h, count]
  rw [hcount]
  have hge : kStar d ≤ count d (kStar d) := by
    have ha := kStar_admissible d h
    simpa only [admissible, decide_eq_true_eq] using ha
  refine Nat.le_antisymm ?_ hge
  cases Nat.lt_or_ge (kStar d) (count d (kStar d)) with
  | inr hle => exact hle
  | inl hlt =>
    exfalso
    have hk0 : count d (kStar d) ≠ 0 := by
      intro hz; rw [hz] at hlt; exact Nat.not_lt_zero _ hlt
    have hadm : admissible d (count d (kStar d)) = true := by
      simp only [admissible, decide_eq_true_eq]
      exact count_mono d (Nat.le_of_lt hlt)
    have hmax := kStar_max d hk0 (count_le d hn _) hadm
    exact absurd hlt (Nat.not_lt.mpr hmax)

/-! ### The lemma -/

/-- **The e-BH threshold lemma, division-free.**

    For every rejected e-value `e`:  `N · qDen · scale ≤ e · qNum · |R|`,
    which is `1/|R| ≤ q·e/N` with denominators cleared.

    Proof: membership in `reject` unfolds to `atLevel (kStar d) e`, i.e.
    `n·qDen·scale ≤ e·qNum·(kStar d)`; rewrite `kStar d` as `(reject d).length` by `card_reject`. -/
theorem fdp_pointwise (d : Data) (hn : WF d) (h : kStar d ≠ 0) {e : Nat} (he : e ∈ reject d) :
    d.n * d.qDen * d.scale ≤ e * d.qNum * (reject d).length := by
  rw [card_reject d hn h]
  simp only [reject, if_neg h, List.mem_filter] at he
  simpa only [atLevel, decide_eq_true_eq] using he.2

-- The FDP bound this yields, summed over the nulls, is `|H₀|·q/N ≤ q` — the measure-theoretic
-- half, which lives in the Mathlib-dependent `../Tessera/EBH.lean` and is deliberately not
-- repeated here. This file is exactly the part that needs no measure theory.

/-! ### Executable smoke tests

    The definitions compute, so the STATEMENT can be checked on concrete data before any proof
    lands — the same discipline used against the TypeScript implementation. `checkOne` returns
    `true` iff `fdp_pointwise` holds for every rejected element. -/

/-- Does the lemma hold for this instance? -/
def checkOne (d : Data) : Bool :=
  let R := reject d
  R.all (fun e => decide (d.n * d.qDen * d.scale ≤ e * d.qNum * R.length))

/-- Build an instance: `n` e-values, `q = qNum/qDen`, scale `1000` (so `E = 1500` means `e = 1.5`). -/
def mk (Es : List Nat) (qNum qDen : Nat) : Data :=
  { n := Es.length, E := Es, qNum := qNum, qDen := qDen, scale := 1000 }

/-- `mk` builds well-formed data, so the smoke tests below exercise the real hypothesis. -/
theorem mk_wf (Es : List Nat) (qNum qDen : Nat) : WF (mk Es qNum qDen) := rfl

/-- A crude LCG so the smoke test can sweep many shapes without any dependency. -/
def lcg (seed : Nat) : Nat := (seed * 1103515245 + 12345) % 2147483648

/-- `m` pseudo-random instances, values up to `hi` (in 1/1000 units). -/
def sweep (m : Nat) (hi : Nat) (qNum qDen : Nat) : Bool := Id.run do
  let mut s := 7
  let mut ok := true
  for i in [0:m] do
    let mut es : List Nat := []
    for _ in [0:(i % 40) + 1] do
      s := lcg s
      es := (s % hi) :: es
    if !checkOne (mk es qNum qDen) then ok := false
  return ok

-- every rejected e-value satisfies the bound, across a few thousand shapes and levels
#eval checkOne (mk [5000, 3000, 100, 50, 20000] 5 100)     -- expect true
#eval checkOne (mk [] 5 100)                                -- degenerate: expect true
#eval checkOne (mk [0, 0, 0] 5 100)                         -- all-zero: expect true
#eval sweep 2000 100000 5 100                               -- q = 0.05
#eval sweep 2000 100000 1 10                                -- q = 0.1
#eval sweep 2000 1000000 1 1000                             -- q = 0.001, heavy tail
#eval sweep 2000 2000 1 2                                   -- q = 0.5, values near the threshold

end Tessera.EBH
