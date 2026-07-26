# 2026-07-25 — Formal statements: adaptive-design validity (Gap A) and monitor-gated selection (Gap B)

- **Purpose:** write the two load-bearing links of the ADR 0023 canary guarantee as precise
  mathematical statements with explicit hypotheses — the step before any Lean formalization.
  Neither is currently stated as a theorem anywhere in the repo; both are asserted in prose and
  verified by simulation.
- **Scope:** statements + proof sketches + counterexample mechanisms + what is Lean-ready.
  NO new empirical claims. Where a step is unproven it is marked **[OPEN]**.
- **Reads:** ADR 0023, ADR 0019, ADR 0022, `research/2026-07-21-canary-guarantee-program.md`
  (§ 3, § 4, § 6), `research/2026-07-02-math-audit.md` (F5, F7), RESEARCH-INDEX § 2 (O4/O5).
- **Status:** DRAFT for review. Statements A1/A2/B/C are proposed, not established.

---

## 0. Why these two

The ADR 0023 guarantee is a five-link chain:

| link | claim | status |
|---|---|---|
| L1 | randomized placement ⇒ within-block exchangeability of healthy scores | **prose only — Gap A** |
| L2 | exchangeability ⇒ randomized rank `p` exactly super-uniform (finite-sample) | known theorem, formalizable |
| L3 | calibrator + `½·product + ½·onset-mixture` ⇒ nonneg supermartingale | E=1 argued; index set **[OPEN]** — Gap C |
| L4 | global-filtration validity ⇒ stopped e-BH sound (2502.08539 Asm 3.1) | **prose only — Gap A** |
| L5 | e-BH ⇒ per-family FDR ≤ q under arbitrary dependence | known theorem (P3), formalizable |

L2 and L5 are settled mathematics we merely have not formalized. L1 and L4 rest on a single
sentence in ADR 0023 — *"increments are conditionally valid given the entire past, because each
round's randomization is fresh"* — and everything the canary program claims beyond per-test
calibration depends on it. § 1 states it properly. § 2 states the separate problem created by
running the guarantee behind a revocable runtime monitor.

### 0.1 A localization the existing evidence already forces

E4 (`e4-adaptive.json`) measured suspect-enriched escalation drafts at:

- per-test healthy rate **0.0082** at α=0.01 — *conservative*, i.e. **more** calibrated than nominal;
- gpu-family **FDP 0.144 ≈ 3q**, and ~33% more false pages.

Per-test calibration did not degrade. It improved. Therefore the E4 failure is **not** a failure of
L1/L2 (rank super-uniformity holds; the enrichment even helps it, exactly as the report's footnote 1
explains). **The failure is in L3/L4 — accumulation and stopping.**

This matters for where to spend effort: the exchangeability argument is in better shape than the
filtration argument, and the repo currently treats them as one claim. They are two claims and only
one of them is measurably broken.

---

## 1. Gap A — validity of the design under adaptivity

### 1.1 Setup

Rounds `t = 1, 2, …`. Finite unit population `U`. Let `H ⊆ U` be the healthy (null) units; for the
statements below `H` is fixed, and the time-varying case is a remark in § 1.6.

Each round has two stages, and the two-stage structure is load-bearing:

1. **Design stage.** A block `S_t ⊆ U` is drawn: `S_t = δ_t(F_{t−1}, ξ_t)` where `δ_t` is a
   deterministic (measurable) rule and `ξ_t` is fresh randomness independent of everything observed
   so far and of all round-`t` scores.
2. **Observation stage.** Scores `(Y_{t,v})_{v ∈ S_t}` are revealed. Higher = worse.

Define the **half-step filtration**

```
F_{t−1}          = σ(S_1, Y_1, …, S_{t−1}, Y_{t−1})            (post-observation, round t−1)
F_{t−½}          = F_{t−1} ∨ σ(S_t, ξ_t)                        (post-design, pre-observation)
F_t              = F_{t−½} ∨ σ((Y_{t,v})_{v ∈ S_t})
```

`F_{t−½}` does not appear anywhere in the repo and is the object several of the arguments actually
need (see § 3).

For `u ∈ S_t`, with `K_t = |S_t|` and `V_t ~ Unif[0,1]` fresh:

```
p_{t,u} = ( #{v ∈ S_t : Y_{t,v} > Y_{t,u}} + V_t·(1 + #{v ∈ S_t\{u} : Y_{t,v} = Y_{t,u}}) + 1 ) / K_t   (†)
```

### 1.2 Statement A1 — conditional super-uniformity under an ignorable design

> **Proposition A1.** Fix `u ∈ H`. Suppose
>
> **(H-EX)** conditional on `F_{t−½}` and on the event `{u ∈ S_t}`, the vector
> `(Y_{t,v})_{v ∈ H ∩ S_t}` is exchangeable; and
>
> **(H-MON)** conditional on the same, `Y_{t,w}` for `w ∈ S_t \ H` is stochastically ≥ each
> `Y_{t,v}, v ∈ H ∩ S_t`, jointly (faulty peers are not better than healthy ones);
>
> then `p_{t,u}` defined by (†) satisfies, for all `α ∈ [0,1]`,
> `P(p_{t,u} ≤ α | F_{t−½}) ≤ α` on `{u ∈ S_t}`.

**Proof sketch.** Under (H-EX) the rank of `Y_{t,u}` among `H ∩ S_t` is uniform on
`{1,…,|H ∩ S_t|}`, and the randomized tie-break in (†) makes the within-`H` randomized rank exactly
`Unif[0,1]` conditionally. (H-MON) says each unit of `S_t \ H` can only increase the count
`#{v : Y_{t,v} > Y_{t,u}}` relative to its position under exchangeability, which increases `p_{t,u}`
pointwise. Super-uniformity is preserved under pointwise increase. ∎

Both hypotheses are conditional on **`F_{t−½}`, not `F_{t−1}`** — the block must be known before the
scores are. That is a fact about the design's information order, and it is true in production
(you know which GPUs are running the probe before you get their runtimes). It should be an explicit
contract obligation on the probe scheduler, alongside the existing "log the randomization" rule.

(H-MON) is the formal content of the E3 contamination result: contamination is one-sided, so it can
only make `p` larger. It also explains why the test must stay one-sided; a two-sided variant of (†)
loses (H-MON) and with it the contamination-robustness that E3 measured to 20%.

### 1.3 Where suspect-enriched drafting breaks A1

Enrichment sets `δ_t` to draw peers from `{v : e_{t−1,v} large}`. Then `S_t` is a function of
`F_{t−1}` — which is allowed, `δ_t` may depend on the past — but (H-EX) asks for exchangeability of
the healthy members' **round-`t`** scores *conditional on the realized `S_t`*. Membership in an
enriched `S_t` is determined by past scores; past scores are correlated with current scores whenever
units carry persistent idiosyncratic components; therefore conditioning on `S_t` tilts the
conditional law of the healthy members' current scores non-exchangeably. (H-EX) fails.

**This is the whole mechanism, and note what it depends on.** If units had *no* persistent
idiosyncratic component, past scores would carry no information about current ones, `S_t` would be
conditionally ignorable however it was drafted, and enrichment would be harmless. So:

> **The adaptivity gap (A1) is dangerous only to the extent the population-homogeneity gap (A2,
> below) is real. They are one quantity, not two.**

That is the most useful structural fact in this document. It says the single thing worth measuring
and bounding is the **persistent idiosyncratic component of healthy unit scores after block-keying**
— call it `σ_pers²` relative to per-execution noise `σ_exec²`. Everything adaptive is safe when that
ratio is 0 and progressively unsafe as it grows.

The report already asserts the unit-level version of this informally: *"per-exec noise dominates
unit-level benign heterogeneity, so mild persistent unit offsets do not compound."* That is exactly
a claim about `σ_pers²/σ_exec²` — currently unmeasured and unbounded.

### 1.4 Statement A2 — the exchangeability hypothesis is known false, mildly

(H-EX) requires healthy units within a block key to be exchangeable *given the past*. The fleet
violates this: H12 hidden strata, H8 heteroskedasticity, persistent rack thermal tilt. § 3.1 item 3
of the program report **measured** the group-level version of the resulting failure — persistently
tilted racks occupy the extreme rank daily, `E[increment | past] > 1`, ~4 false racks/run — and
responded by studentizing group statistics against their own lagged reference, which is why group
families are honestly labelled EMP-CAL.

The unit family did not get the same treatment, and is labelled EXACT-FS.

The unit-level exemption is defensible *in magnitude* (per-exec noise is larger) but it is the same
mathematical situation, and "EXACT-FS" is a claim of exactness. The two honest routes are:

- **(i) Studentize at unit level too.** Rejected on evidence: § 8b Finding 4 measured that an
  estimated per-unit reference reintroduces the N1/ADR-0013 pathologies from both ends (masking at
  sparse coverage; plug-in σ̂ compounding at dense coverage). This route is closed.
- **(ii) Prove a quantitative relaxation.** State and prove an *approximate*-exchangeability bound:
  if the healthy sub-block's law is within `ε` of exchangeable (in a likelihood-ratio or TV sense),
  then the e-process drifts by at most a controlled factor.

> **[OPEN — the one genuinely new theorem this program needs] Conjecture A2.** Let the healthy
> sub-block law `Q` satisfy `dQ/dQ^sym ≤ 1 + ε` for the exchangeable symmetrization `Q^sym`. Then
> the per-round calibrated increment satisfies `E[f(p_{t,u}) | F_{t−½}] ≤ 1 + c(f)·ε`, and the
> `T`-round accumulator satisfies `E[M_T] ≤ (1 + c(f)·ε)^T`.
>
> Consequences if true: (a) Ville paging at `1/α` degrades to `α·(1+cε)^T`, giving an explicit
> **validity horizon** `T* ≈ log(2)/(cε)` — the number of rounds an emitter may remain
> `construction_valid` before its accumulated drift eats the budget; (b) `ε` becomes an estimable
> fleet quantity (from A/A runs) rather than an act of faith; (c) e-BH inherits `q·(1+cε)^T` by
> scale-invariance (N3), so the FDR target can be pre-deflated to absorb it.

A horizon-limited guarantee is a much better fit for the actual product than an unlimited one, and
it converts "the unit family is exact" into "the unit family is exact for `T*` rounds at fleet
heterogeneity `ε`," which is both true and operationally useful. The `(1+cε)^T` form also predicts
the group-level failure the program already measured, which is a free consistency check.

### 1.5 Statement A4 — what fresh randomization actually buys (the L4 claim)

> **Proposition A4.** Suppose for every round `t` and every `u ∈ H`, A1's hypotheses hold at
> `F_{t−½}`. Let `f: [0,1] → [0,∞)` satisfy `∫₀¹ f = 1` and be non-increasing. Define
> `M_{t,u} = ½·∏_{s≤t} f(p_{s,u}) + ½·Σ_j (1−γ)γ^{j−1} ∏_{s=j}^{t} f(p_{s,u})`.
> Then `(M_{t,u})` is a nonnegative supermartingale w.r.t. `(F_t)` with `M_0 = 1`.
>
> **Corollary A4.1 (Ville).** `P(∃t: M_{t,u} ≥ 1/α) ≤ α`.
>
> **Corollary A4.2.** With `(M_{t,u})_{u}` all `(F_t)`-supermartingales, Assumption 3.1 of
> arXiv:2502.08539 holds for the family, so e-BH applied at any `(F_t)`-stopping time controls that
> family's FDR ≤ q.

**Proof sketch.** A1 gives `P(p_{t,u} ≤ α | F_{t−½}) ≤ α`, so `E[f(p_{t,u}) | F_{t−½}] ≤ ∫₀¹ f = 1`
for non-increasing `f` (super-uniformity + monotone `f` ⇒ the standard e-value property; the
non-increasing requirement is why the calibrator family `κp^{κ−1}` is restricted to `κ ≤ 1`).
Tower to `F_{t−1}`. Each `∏_{s=j}^{t}` is then a supermartingale; a countable convex combination of
nonnegative supermartingales is a supermartingale; the plain product is the `j=1` term, so the
½/½ average is a convex combination of convex combinations. ∎

The `½/½` step is genuinely trivial — the ADR 0023 correction note is right. **All the risk in
Proposition A4 is inherited from A1**, which is the point: L3 and L4 are not independent claims to
be checked, they are corollaries of the design hypothesis. Formalizing them without A1 proves
nothing.

### 1.6 Remarks / smaller open items

- **Time-varying `H`.** Faults arrive; units get repaired. `H` should be `H_t`, and the null
  hypothesis for the FDR statement is "`u ∈ H_t` at the stopping time." Whether a unit that becomes
  faulty mid-accumulation and is then repaired re-enters the null set is a *definitional* question
  the repo has not answered, and it changes what FDP counts. **[OPEN]**
- **The closed remediation loop.** Discoveries drive drains, repairs, re-images. That makes `H_t`
  itself a function of `F_{t−1}`, and it changes which units are *available* for future blocks.
  Availability correlated with health is precisely a violation of (H-EX). The simulator has no
  remediation loop, so no evidence exists either way. **[OPEN — and this is the highest-risk
  untested item in the program, because it only appears in production.]**
- **Multiple blocks per round.** A1 is stated per block. Cross-block dependence within a round is
  absorbed by e-BH's arbitrary-dependence property (L5/P3), so no extra hypothesis is needed —
  worth stating explicitly since it is a rare place where the repo has *more* slack than it uses.

---

## 2. Gap B — the guarantee behind a revocable monitor

### 2.1 The problem

`emitter-contract.ts` makes a `construction_valid` emitter FDR-bearing **only while**
`calibrationMonitorPassing === true`. So the reported discovery set is the one produced in rounds
where the monitor passed. The monitor is computed from the same data.

This is not covered by "e-BH at any stopping time controls FDR" even though the demotion time is a
stopping time. The circularity is:

> The monitor exists *because* we doubt A1/A2. The stopped-e-BH theorem's conclusion is conditional
> on A1/A2. Using the theorem to bless the gated output assumes what the gate was built to check.

Conditional on the monitor passing, what you have is: a theorem that holds if the assumptions hold,
plus a diagnostic that failed to reject them. The correct statement is disjunctive.

### 2.2 Statement B — the gated guarantee

Work per-distribution rather than per-event (the assumptions are properties of the law, not events
in the sample space). Let `P₀` be the set of laws satisfying A1's hypotheses at every round, and let
`M` denote the event that the monitor never revokes up to the reporting time.

> **Proposition B.** Let `FDP_gated = FDP · 1_M` (no discoveries are reported when revoked). Then
>
> - for `P ∈ P₀`: `E_P[FDP_gated] ≤ E_P[FDP] ≤ q`;
> - for `P ∉ P₀`: `E_P[FDP_gated] ≤ P_P(M) =: β(P)`, the monitor's **miss probability** at `P`.
>
> Hence `sup_P E_P[FDP_gated] ≤ max(q, sup_{P ∉ P₀} β(P))`.

**Proof.** First bullet: `1_M ≤ 1` and Corollary A4.2. Second: `FDP ≤ 1` pointwise, so
`E_P[FDP·1_M] ≤ P_P(M)`. ∎

One line. The content is entirely in what it exposes: **the gated guarantee is
`max(q, β)`, and `β` has never been measured.** All 280 healthy runs produced 0 revocations, which
measures the monitor's *size*, not its power. `β` is a Type-II probability against the violation
classes that matter, and it is estimable by exactly the method R79 already used for the detector —
run the monitor against a catalogue of null-violating DGPs and count passes.

### 2.3 Why I expect `β` to be large where it hurts

The violation classes that F7 identifies as destructive are *mild and accumulating*: a 10% σ̂
under-estimate driving `E[e|H0]` from 0.52 to 7.6; near-unit-root residual serial dependence. The
monitor is a betting/martingale construction over pooled conformal `p`'s. ADR 0020 established, and
the literature corroborates (SKIT detection time `~log(1/α)/√HSIC`, arXiv:2212.07383; PITMonitor
delay under *local* drift, arXiv:2603.13156), that anytime-valid monitors have long delay in exactly
the mild regime. ADR 0020's own negative result is this failure, measured: the healthy prefix was
too short for the betting monitor to accumulate against a mild residual that was destructive over
the detection horizon.

So the monitor's blind spot and the failure mode's magnitude sit in the same place. That is a
structural concern, not a tuning problem, and Proposition B is the statement that makes it visible.
It is also the reason the design's *deliberate* blindness to sparse faults — correct, you do not
want revocation on true positives — cannot be traded for sensitivity without thought: the same
knob controls blindness to sparse null violations.

### 2.4 What Proposition B implies for the product claim

The honest guarantee text becomes something like:

> Per-family FDR ≤ q under (H-EX)/(H-MON) at every round; when those fail, FDR ≤ β, the runtime
> monitor's measured miss rate against the catalogued violation classes.

with `β` a published number per violation class, refreshed like R79. That is weaker than the current
text and considerably more defensible — and, notably, it is the same shape as the guarantee the
repo already gives for `empirically_audited` emitters, which suggests the validity-class lattice
wants a fifth rung: *theorem-valid conditional on a hypothesis with a measured monitor miss rate.*

---

## 3. Gap C — accumulation over a data-dependent index set

Smaller, and probably true, but the repo's version is stated at the wrong filtration.

Units skip rounds (no probe scheduled); blocks starve below the `K` floor and abstain; `γ^{j−1}` is
indexed by **round**, not by **participation**.

> **Proposition C.** Let `χ_{t,u} ∈ {0,1}` indicate that `u` is scored in round `t` and its block
> clears the `K` floor. If `χ_{t,u}` is `F_{t−½}`-measurable, then
> `M_{t,u} = M_{t−1,u}·(χ_{t,u} f(p_{t,u}) + (1 − χ_{t,u}))` is an `(F_t)`-supermartingale.

`χ` is **not** `F_{t−1}`-measurable — the `K` floor depends on who actually ran in round `t`. It
*is* `F_{t−½}`-measurable, because block composition is fixed at the design stage. So the
proposition holds, but only with the half-step filtration of § 1.1, and the production contract must
guarantee the abstention decision is taken from block composition alone and **never** from the
scores. Written today, nothing forbids a future "abstain if the block's score spread looks wrong"
rule, which would silently void this.

**Indexing.** `∏_{s=j}^{t}` over rounds with skips is fine by the above. Indexing `γ^{j−1}` by
participation count instead would also be valid but is a *different* e-process with different power;
the two are conflated in the current code comments. Pin one. **[OPEN — minor]**

---

## 4. What is Lean-ready, and in what order

| target | depends on | Mathlib support | estimate |
|---|---|---|---|
| **e-BH FDP lemma** (L5): `1{j∈R}/|R| ≤ q·e_j/N` at the e-BH threshold | nothing | none needed — deterministic, combinatorial | 1–2 wk |
| **e-BH FDR ≤ q** | above + linearity of `E` | `MeasureTheory.integral` basics | +1 wk |
| **Conformal rank super-uniformity** (L2 / Prop A1) | finite exchangeability | `Equiv.Perm`, counting | 1–2 wk |
| **Calibrator/combinator closure**: `∫f=1` ⇒ e-value; `min`, convex mean, product, onset mixture | above | none deep | 1 wk |
| **Prop A4** (supermartingale + Ville + stopped e-BH) | A1 as hypothesis | `Filtration`, `Supermartingale`, `Submartingale.maximal_ineq`, optional stopping — **all present** | 4–8 wk |
| **Prop B** | A4 | trivial once A4 exists | days |
| **Conjecture A2** | — | — | unknown; prove on paper first |

Nothing in the first four rows needs measure theory beyond linearity of expectation, and none of it
exists in Mathlib today — e-values, e-processes, FDR, BH/e-BH, conformal prediction, exchangeability
are all absent. They are definitional, not deep. To my knowledge a Lean formalization of e-BH would
be the first, which makes rows 1–4 both useful here and publishable (CPP/ITP).

### 4.1 Sketch signatures

Illustrative Lean 4 / Mathlib flavour; not claimed to compile.

```lean
/-- An e-value for `H₀ = P`: nonnegative with mean at most one. -/
structure EValue (Ω : Type*) [MeasurableSpace Ω] (P : Measure Ω) where
  val        : Ω → ℝ≥0∞
  measurable : Measurable val
  mean_le_one : ∫⁻ ω, val ω ∂P ≤ 1

/-- L5, deterministic core. `R` is the e-BH rejection set at level `q` over `N` hypotheses. -/
theorem ebh_fdp_pointwise
    (N : ℕ) (q : ℝ) (hq : 0 < q) (e : Fin N → ℝ≥0∞) (j : Fin N)
    (hj : j ∈ ebhReject N q e) :
    (1 : ℝ) / (ebhReject N q e).card ≤ q * (e j).toReal / N := by
  sorry

/-- L5. Requires only that null coordinates are e-values; arbitrary dependence elsewhere. -/
theorem ebh_fdr_le
    {Ω} [MeasurableSpace Ω] (P : Measure Ω) [IsProbabilityMeasure P]
    (N : ℕ) (q : ℝ) (H₀ : Finset (Fin N)) (e : Fin N → Ω → ℝ≥0∞)
    (hnull : ∀ j ∈ H₀, ∫⁻ ω, e j ω ∂P ≤ 1) :
    ∫ ω, fdp H₀ (ebhReject N q (fun j => e j ω)) ∂P ≤ q := by
  sorry

/-- Prop A1. `exchOn s Y` = the restriction of `Y` to `s` is exchangeable. -/
theorem conformal_rank_superuniform
    {Ω} [MeasurableSpace Ω] (P : Measure Ω) (𝓖 : MeasurableSpace Ω)   -- 𝓖 = F_{t−½}
    (S : Finset ι) (Y : ι → Ω → ℝ) (Hset : Finset ι) (u : ι)
    (hu : u ∈ Hset) (hsub : Hset ⊆ S)
    (hex  : exchOn (Hset) Y P[·|𝓖])                                   -- (H-EX)
    (hmon : ∀ w ∈ S \ Hset, ∀ v ∈ Hset, stochGE (Y w) (Y v) P[·|𝓖])  -- (H-MON)
    (α : ℝ) :
    P[ {ω | randRank S Y u ω ≤ α} | 𝓖 ] ≤ ENNReal.ofReal α := by
  sorry

/-- Prop A4. The ½/½ accumulator is a supermartingale w.r.t. the *global* filtration. -/
theorem accumulator_supermartingale
    {Ω} [MeasurableSpace Ω] (P : Measure Ω) (F : Filtration ℕ _)
    (p : ℕ → Ω → ℝ) (f : ℝ → ℝ≥0∞) (γ : ℝ) (hγ : γ ∈ Set.Ioo 0 1)
    (hf_int : ∫⁻ x in (0:ℝ)..1, f x = 1) (hf_anti : Antitone f)
    (hsu : ∀ t, condSuperUniform (p t) (F.halfStep t) P) :          -- A1 at F_{t−½}
    Supermartingale (fun t => halfHalf γ f p t) F P := by
  sorry
```

The `halfStep` field is the § 1.1 point: the filtration object needs the design-stage refinement, and
that is a design decision to make at the start of the formalization rather than retrofit.

### 4.2 The statement is the deliverable

Rows 1–4 above are proofs of things we already believe. Their value is not reassurance — it is that
`EValue` becomes a *type* with a construction obligation. Five of the six CRITICAL findings in the
2026-07-02 audit (F1–F5) are one bug: a quantity that is not an e-value entering the e-BH path, most
starkly F3 (`eDetector(...).peak`, `E[M|H0] ≈ #onsets`, passed to `eBenjaminiHochberg`, reported
CERTIFIED). `EmitterContract.validityClass` is a runtime string tag doing a type's job.

**Recommended before any Lean work:** brand `EValue` as an opaque TypeScript type constructible only
by certified constructors (`safeT`, `mixtureCalibrator`, `conformalRankCalibrator`) and closed under
certified combinators (`min`, `convexMean`, `product`, `onsetMixture`), each carrying a citation —
a Lean theorem name once one exists, otherwise a named admitted with its ADR and evidence class.
Change `eBenjaminiHochberg` to take `readonly EValue[]`. F1–F5 become compile errors. ~1 week, and
it gives the Lean effort an ordered work queue: discharge admitteds, highest-risk first.

---

## 5. Summary of open items created by this document

| id | item | kind | priority |
|---|---|---|---|
| A2-C | approximate-exchangeability ⇒ bounded e-process drift; validity horizon `T*` | **new theorem** | high — the only genuinely new math the program needs |
| A-σ | measure `σ_pers²/σ_exec²` (persistent idiosyncratic share after block-keying) on A/A data | measurement | high — it is the single quantity A1 and A2 both reduce to |
| B-β | measure monitor miss rate `β` per violation class (R79 methodology) | measurement | high — the gated guarantee is `max(q, β)` and `β` is unknown |
| A-loop | remediation feedback (drain/repair/re-image) as a violation of (H-EX) | simulation + statement | high — untested, production-only |
| A-Ht | define the null set under time-varying health; what FDP counts | definitional | medium |
| C-idx | pin round-indexed vs participation-indexed onset mixture | definitional | low |
| L-type | brand `EValue` with certified constructors/combinators | engineering | do first |

## 6. What this document does not address

Per the § 0 framing, "FDR over discoveries ≠ FDR over faults" is untouched and untouchable: the
theorem attaches to the exchangeability null, and a discovery means "relatively deviant within
block." The translation to "is a fault" is the taxonomy's job and no formal system closes it. It
belongs permanently in the guarantee's preamble, as the program report already has it.
