# Q-R13-SPEC-AUDIT — Tessera Phase 1 SLICE 4: e-BH FDR operator surface

_Architect-side audit sidecar to `coordination/specs/Q-R13-SPEC.md`. Reviewer reads BOTH this file and the spec proper. Implementer reads ONLY the spec proper (Q-R13-SPEC-AUDIT.md is excluded per CLAUDE-IMPLEMENTER.md cold-implementation boundary)._

_From: Architect (R13 pipeline run; full tier per A1 + A2 + A5)._
_HEAD at spec emit: `2a3c177`._
_Date: 2026-05-17._

---

## Brainstorm

### Step 1 — Generate ≥3 distinct approaches

Per PR-F2 mandate (NEXT-ROLE.md item 2): "Brainstorm ≥3 distinct e-BH implementations with rejection rationale. Candidates per v0.3: standard fixed-α e-BH; randomized e-BH; BY-style correction. Each requires FDR-preservation analysis."

Plus an architecture-level brainstorm for R12 OQ-1 (per-shard vs fleet-level input) and the chaining-vs-parallel question.

**Algorithm candidates:**

**(A) Standard fixed-α e-BH (Ren-Barber 2024 Algorithm 1; Wang-Ramdas 2022 §4 / Vovk-Wang 2021 §4 base form)**

Procedure: sort e-values DESC; find R = max{k : k · e_(k) ≥ N/q}; reject the top-R hypotheses.

- **Strengths:**
  - Canonical procedure cited in NEXT-ROLE.md as the literature anchor (Ren-Barber 2024 Algorithm 1).
  - FDR-control theorem (Wang-Ramdas 2022 Theorem 4.1) holds under ARBITRARY DEPENDENCE between e-values — the load-bearing property for both R13 PR-F2 cells (iid + correlated).
  - Deterministic: same input → same output. Operator-facing surfaces with predictable behavior are preferable for production observability.
  - Simple to implement: O(N log N) via single sort + linear step-down.
  - Widely cited in post-2022 e-value literature; battle-tested.

- **Weaknesses:**
  - Slightly less powerful than the randomized variant (B) under independence assumptions. Power gap is small in practice.
  - Treats e-value validity as binary (each e_i either is or isn't a valid e-value); no nuance for "approximately valid" e-values.

- **Hidden assumptions:**
  - Per-shard e-values are marginally valid e-values (E[e_i | H_{0,i}] ≤ 1). The Family A betting-e-process construction guarantees this via Ville's inequality for non-negative martingales (Howard-Ramdas-McAuliffe-Sekhon 2021).
  - Non-negative inputs (e-values are ≥ 0 by definition).

- **Risks:**
  - None at the algorithmic level — canonical baseline.
  - At the integration level, the only failure mode is per-shard e-value validity breakdown (e.g., if a future code change introduces a bug into `updateBettingState` such that `state.M` no longer satisfies E[M_T] ≤ 1 under H_0). This is OUT OF SCOPE for R13 (vendored engine frozen per A12 + R13-SAS-5).

**(B) Randomized e-BH (Wang-Ramdas 2022 §4 randomized variant; Ren-Barber 2024 randomized extension)**

Procedure: introduce U[0,1] randomization variable U; modify threshold to use U · e_(k) in step-down (specific formulations vary across papers). Provably preserves FDR ≤ q at slightly higher power than (A).

- **Strengths:**
  - Higher power than (A) under independence — power gap noted in Wang-Ramdas 2022.
  - Preserves FDR-control theorem under same assumptions as (A).

- **Weaknesses:**
  - Introduces a U[0,1] random variable, breaking determinism: same input → DIFFERENT outputs depending on U.
  - Harder to attest in operator-facing surfaces: "K shards flagged" becomes "K shards flagged given seed s" with implicit dependence on the randomizer.
  - Requires high-quality U[0,1] source (additional infrastructure or argument).
  - Not the canonical R13 literature anchor in NEXT-ROLE.md (Ren-Barber 2024 Algorithm 1 is the deterministic baseline).

- **Hidden assumptions:**
  - Same as (A) plus access to a deterministic-or-seeded U[0,1] RNG; tessera does not currently expose such a primitive at the operator surface (would require new infrastructure).

- **Risks:**
  - Non-determinism violates operator-facing observability expectations: rerunning the procedure with the same per-shard e-values and same q produces different flagged sets across runs.
  - Phase 1 close is correctness/baseline scope (per SCOPING-MEMO-v0.3 + NEXT-ROLE.md framing); power optimization is future-SLICE scope.

**Rejected.** Operator-facing determinism preferred at Phase 1 close; power gap is small and addressable in a future SLICE if needed.

**(C) BY-style stepwise correction for e-values (Benjamini-Yekutieli 2001 analog)**

Procedure: apply harmonic-factor correction H_N = Σ 1/i to the threshold: e_(k) ≥ H_N · N / (k · q). Preserves FDR under arbitrary dependence among p-values (Benjamini-Yekutieli 2001). E-value analog would apply the same correction structure.

- **Strengths:**
  - Familiar to multiple-testing practitioners from the p-value BH/BY literature.
  - Conservative under all dependence regimes.

- **Weaknesses:**
  - HEAVIER correction: H_100 ≈ 5.19; H_N ≈ log(N) + 0.577 for large N. The procedure becomes ~5x more conservative than standard e-BH at N=100.
  - REDUNDANT for valid e-values: Wang-Ramdas 2022 Theorem 4.1 already establishes that STANDARD e-BH (without H_N correction) preserves FDR ≤ q under arbitrary dependence between e-values. The BY-style correction was designed for p-values where arbitrary dependence breaks the standard BH bound; e-values do not need this correction.
  - Loses the architectural advantage that motivates choosing e-values over p-values in the first place.

- **Hidden assumptions:**
  - Treats e-values like p-values (incorrect: e-values have a stronger structural property — E[e_i] ≤ 1 — that obviates the H_N correction).

- **Risks:**
  - Over-conservative: operator-facing FDR can be far less than q, reducing discovery power for no statistical gain.

**Rejected.** The harmonic correction is unnecessary for valid e-values; standard e-BH (option A) achieves FDR ≤ q under arbitrary dependence between e-values via Wang-Ramdas 2022 Theorem 4.1 without the H_N penalty.

**(Z) Conditional-gating serial chain: fleet-merge OUTPUT → e-BH INPUT**

Procedure (NOT a different algorithm — an architectural-shape variant): first run R11/R12 fleet-merge to produce a fleet-level e-process state; if `fleet_state.fired === true` (fleet-level Ville fires), THEN run e-BH at the per-shard level for attribution; if not fired, return K=0 unconditionally.

- **Strengths:**
  - Composes the R11/R12 fleet-merge primitives with R13 e-BH; a single "fire then attribute" pipeline.
  - Reduces unnecessary e-BH invocations when fleet-level signal is absent.

- **Weaknesses:**
  - **VIOLATES Q-J1 parallel-not-serial architecture.** Q-J1 hybrid disposition (`ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`) explicitly establishes the two layers as PARALLEL views: Ville at fleet-merge layer, FDR at e-BH layer. NEXT-ROLE.md "R13 does NOT ship" list flags chaining as a HALT condition: "Chaining fleet-merge OUTPUT into e-BH input — per Q-J1's hybrid framing the two layers are PARALLEL (Ville guarantee at fleet-merge layer; FDR interface at e-BH layer), NOT serial. If brainstorm surfaces a strong reason to chain them, that's a HALT + DIAGNOSTIC condition (operator-gate scope expansion)."
  - Loses the orthogonality of the two operator-facing claims: with parallel architecture, "the fleet wealth process is above α_fleet threshold" and "K shards are flagged with FDR ≤ q" are independent operator-facing surfaces, each with its own statistical guarantee. With serial chaining, the e-BH output is conditional on the fleet-level fire — the joint FDR-control statement becomes "FDR ≤ q conditional on fleet fire" which is not what the operator wants.
  - Increases the architectural coupling between R11/R12 and R13: any future change to fleet-merge would propagate into the e-BH pipeline.

- **Hidden assumptions:**
  - Implicitly assumes the fleet-level Ville fire is a necessary precondition for per-shard FDR control — false. The e-BH FDR-control theorem (Wang-Ramdas 2022 Theorem 4.1) holds unconditionally on per-shard e-values; fleet-level fire status is orthogonal.

- **Risks:**
  - Scope expansion beyond NEXT-ROLE.md R13 boundary.
  - HALT condition explicitly enumerated in NEXT-ROLE.md "Halt conditions for R13": "Chaining fleet-merge into e-BH: if brainstorm picks (α) fleet-level e-BH OR proposes a chained architecture, HALT + DIAGNOSTIC."

**Rejected.** Q-J1 parallel-not-serial architecture preserved; R13-SAS-14 fences chaining at the anti-scope layer. Brainstorm explicitly considered and rejected; documented in spec § Mechanism primitive 3 and § Anti-scope R13-SAS-14.

### Step 2-3 — Identify constraints + select

**Constraints from NEXT-ROLE.md / PR-F2 mandate that eliminate options:**

- (i) Determinism preferred at operator-facing surface → eliminates (B) randomized.
- (ii) Standard fixed-α form per Ren-Barber 2024 Algorithm 1 cited as the literature anchor → strong preference for (A).
- (iii) FDR control under arbitrary dependence between e-values is the load-bearing property (Wang-Ramdas 2022 Theorem 4.1) → standard e-BH (A) already provides this; (C) BY-style correction is unnecessary and over-conservative.
- (iv) Q-J1 parallel-not-serial architecture → eliminates (Z) chained architecture.

**Selected:** (A) Standard fixed-α e-BH.

**Decision sourcing:**
- Wang-Ramdas 2022 Theorem 4.1 (FDR ≤ q under arbitrary dependence between valid e-values) — load-bearing.
- Ren-Barber 2024 Algorithm 1 (canonical procedure form) — implementation form.
- Q-J1 hybrid disposition (ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md) — parallel-not-serial architectural framing.

---

## Decisions

### D1 — Algorithm form: standard fixed-α e-BH (selected)

Why-picked: canonical Ren-Barber 2024 Algorithm 1; FDR ≤ q under arbitrary dependence between e-values via Wang-Ramdas 2022 Theorem 4.1; deterministic; operator-facing-friendly.

Why-rejected (alternatives):
- (B) randomized e-BH — non-deterministic; not the literature anchor; power gap is small; future-SLICE scope.
- (C) BY-style correction — over-conservative for valid e-values; redundant per Wang-Ramdas 2022 Theorem 4.1.

### D2 — Default qLevel: NONE (configurable-required) (selected)

Why-picked: the operator-facing claim "E[#false-flagged-shards] ≤ q · K" directly couples operator policy (acceptable false-discovery fraction) to procedure output. A silent default risks misalignment between the operator's intended q and the value the procedure used. Canonical literature values (q=0.05 / q=0.10) are exemplars in documentation, not Tessera defaults.

Why-rejected (alternatives):
- (α) `qLevel = 0.05` default — classical Benjamini-Hochberg 1995 target; rejected as policy-decision-disguised-as-API-default.
- (β) `qLevel = 0.10` default — less conservative; rejected for same reason as (α) + arbitrary choice between 0.05/0.10.

R13-SAS-18 fences default at the API surface.

### D3 — R12 OQ-1 input architecture: per-shard e-BH (β) (selected)

Why-picked: operator-facing target per SCOPING-MEMO-v0.3 § 2.1 + Q-J1 is "K shards flagged"; discovery cardinality must be variable in N over per-shard claims. Matches Architect-pre-prediction in NEXT-ROLE.md.

Why-rejected: (α) fleet-level e-BH operates over the small fixed set of fleet-level e-values from R11/R12; discovery cardinality is fixed = number of fleet-level claims; does NOT produce a "K shards flagged" surface.

### D4 — Architectural relationship: Q-J1 parallel-not-serial (selected)

Why-picked: Q-J1 hybrid disposition; NEXT-ROLE.md explicitly fences chaining. R11/R12 fleet-merge primitives provide the formal Ville guarantee; R13 e-BH provides the operator-facing FDR surface; both consume the same per-shard e-values; neither chains into the other.

Why-rejected: (Z) conditional-gating serial chain. Violates Q-J1; HALT condition per NEXT-ROLE.md; loses operator-facing claim orthogonality.

### D5 — Output shape: wrapped `{ selected, K }` (selected)

Why-picked: mirrors R11's `FleetMergeOutput { log_fleet_e }` and R12's `FleetMergeStepResult { log_fleet_e, fleet_state }` wrapping convention. Forward-compatible: future SLICEs may add `threshold_e` field for diagnostics without breaking callers.

Why-rejected:
- Bare `ReadonlyArray<number>` (just selected indices) — less forward-compatible.
- `{ selected, K, threshold }` (include threshold) — minimal shape preferred at R13; future SLICE may add.

### D6 — Tie-breaking: deterministic by index ASC (selected)

Why-picked: standard e-BH (Wang-Ramdas 2022; Ren-Barber 2024) does NOT formally specify tie-breaking. Any deterministic rule preserves FDR-control. Index ASC chosen for caller ergonomics (preserves original input order across ties).

Why-rejected:
- Index DESC — arbitrary; no operator-facing motivation.
- Random tie-break — non-deterministic; conflicts with D1's determinism choice.

### D7 — Output sort order: ASCENDING by index in `selected` (selected)

Why-picked: operators consume shard indices in their original numeric order (log lookups, dashboard rendering, alphabetical iteration).

Why-rejected:
- DESC-by-e-value order — leaks the sort-by-strength information into the API contract; operators don't typically need this in the selected set.
- Original-input order (no re-sort) — undefined behavior across implementations; harder to test.

### D8 — Input space: linear-space e-values (selected)

Why-picked: e-BH naturally operates in linear space (threshold N/q is unit-free in e-value space). The inherited Family A `state.M` is already linear-space wealth; the operator-layer caller reads directly without log/exp conversion.

Why-rejected:
- Log-space input (would parallel R11/R12 fleet-merge convention) — requires `Math.log` conversion at caller; threshold becomes log(N/q); pseudocode more complex; no architectural gain.

### D9 — PR-F2 family scope: Family A only (selected)

Why-picked: family-agnostic claim at the API surface is structurally established by the `ReadonlyArray<number>` input type; Family A wealth process is sufficient to empirically validate FDR control. Family C would add Q72 RFF infrastructure cost without strengthening the FDR-control claim.

Why-rejected: Family A + Family C both — increases test runtime cost; family-agnostic claim already structurally established; future SLICE can add Family C empirical evidence if operator pipeline needs it.

### D10 — MD-F2: fixed-time e-BH at R13; any-time deferred (selected)

Why-picked: fixed-time e-BH is the SLICE 4 close requirement per AC-P1 + SCOPING-MEMO-v0.3 § 2.1 + Q-J1. Any-time analog (Wang-Ramdas-Vovk 2022 e-process selection under any-time FDR) requires different theoretical machinery, different operator-facing claim, and is future-SLICE candidate.

Why-rejected: any-time analog at R13 — scope expansion; HALT condition per NEXT-ROLE.md "Any-time FDR analog scope expansion."

R13-SAS-13 fences any-time at anti-scope layer. Module header in Delta 1 documents the deferral explicitly (PR-F2 mandate item 3).

### D11 — Module location: `engine/fleet/e-bh.ts` parallel to combine.ts + detectors.ts (selected)

Why-picked: future-SLICE Family-specific wrappers (parallel to R12's `fleetMergeFamilyA/C`) would live alongside the primitive. `engine/fleet/` namespace is the Tessera-fleet-layer home; e-bh.ts is the natural file name.

Why-rejected:
- `engine/per-shard/e-bh.ts` — wrong layer (e-BH is fleet-level operator surface, not per-shard).
- `engine/detectors/e-bh.ts` — would mix into the A12-anti-scope inherited-detector namespace.
- `engine/types/e-bh.ts` for the type + `engine/fleet/e-bh.ts` for the function — over-fragmented for a single-export type; R12 already established the convention of co-locating type + function in `detectors.ts`.

### D12 — Type co-location: `EBenjaminiHochbergOutput` declared inside `e-bh.ts` (selected)

Why-picked: matches R12's `FleetMergeStepResult` co-location in `detectors.ts`. Only one exported type from R13; no need for a separate `engine/types/e-bh.ts`.

Why-rejected: separate type file (would parallel R11's `engine/types/fleet.ts`) — unnecessary for single-type module.

### D13 — Empty input throw semantics (selected)

Why-picked: mirrors R11's empty-input throw at `engine/fleet/combine.ts:64-66, 88-90`. N=0 is structurally undefined for fleet-scale e-BH; silent return of `{selected:[], K:0}` would mask integration bugs at the caller layer.

Why-rejected:
- Silent return `{selected:[], K:0}` — masks bugs.
- Return `null` — type-system noise.

### D14 — Invalid qLevel throw semantics (selected)

Why-picked: input validation at API surface; conjunctive guard `qLevel > 0 && qLevel <= 1` handles NaN + undefined + negative + >1 uniformly. Throws with diagnostic message including offending value.

Why-rejected:
- Silent clamp into (0,1] — masks operator policy errors.
- Default to 0.05 when invalid — re-introduces the rejected D2 default.

---

## Architect pre-predictions

| Prediction | Confidence | Disposition |
|---|---|---|
| q13 test count = 14/0 at GREEN | HIGH | Verifiable at Implementer GREEN |
| Full regression count = 138 (prior) + 14 = 152/0 at GREEN | HIGH | Verifiable at Implementer GREEN |
| q11 + q12 unchanged at HEAD `2a3c177` | HIGH (verified at spec-emit) | q11 18/0, q12 16/0 confirmed |
| PR-F2 iid empirical FDR ≈ 0.01-0.05 at q=0.05 | MEDIUM-HIGH | Verifiable at Implementer GREEN; theory says ≤ 0.05; observed expected somewhat below |
| PR-F2 correlated empirical FDR ≈ 0.01-0.06 at q=0.05 | MEDIUM | Verifiable at Implementer GREEN; theory says ≤ q under arbitrary dependence (Wang-Ramdas 2022 Theorem 4.1); observed expected slightly higher than iid but still well below Wilson bound 0.09624 |
| Both PR-F2 cells PASS Wilson bound | HIGH | If false: HALT condition (a) for Implementer — Architect review of e-BH implementation or PR-F2 simulator |
| Zero halt conditions for Implementer | HIGH | Spec is verbatim-pseudocode; no architectural ambiguities |
| Reviewer findings: ≤ 1 MINOR / ≤ 5 OBS | MEDIUM | Based on R10/R11/R12 trajectory (R11 = 1 MINOR + 6 OBS; R12 = 0 MINOR + 4 OBS); R13 has new external-source citations + new test surface so OBS count may be elevated |
| TDD ordering = RED → GREEN (two commits) | HIGH | 11th consecutive application of R02-R12 pattern |
| q13 wall-clock runtime ≤ 6s | MEDIUM-HIGH | PR-F2 simulator estimate per § P3 Cost row |
| Architect pre-emit grilling catches at least 0 spec-side bugs before route | MEDIUM | Adversarial re-read pass; spec was authored carefully but Tessera trajectory shows ~1 spec-side issue per round caught at Reviewer cold-review |

**Conservative posture on FDR predictions:** the load-bearing question is whether observed empirical FDR exceeds the Wilson upper bound (0.09624). Theory says no; per-shard betting-e-process is well-studied; correlated-drift mechanism is the same as R11 PR-F1 (which empirically validated theory-derived bounds for combineAverage). High confidence that both PR-F2 cells PASS.

---

## Pre-route discipline application table

| Reinforcement (source) | Application count | Verification at spec-emit |
|---|---|---|
| Cross-section consistency pass (R01) | 9th consecutive | 28 checks; all PASS at spec-emit |
| Type-declaration-site discipline (R02) | 8th consecutive | BettingEProcessState.M at families/a.ts:21; FamilyCBettingEProcessState.log_S_t at families/c.ts:300; updateBettingState at betting-e-process.ts:150-156; WEALTH_FLOOR at betting-e-process.ts:65 — all sed-n-extracted |
| Re-export-chain-check (R03) | 5th consecutive | engine/types/index.ts:22 verified; updateBettingState NOT re-exported (direct import via leaf path) |
| Grep-pattern-soundness (R03) | 4th consecutive | trivially satisfied — R13 has zero grep-pattern ACs |
| Empirically-verified test counts (R03) | 4th consecutive | AC-14 directs OBSERVED reporting; Architect predicts 14 (verifiable but not pre-stated as the binding count) |
| Narrative-vs-pseudocode AC-count cross-check (R05) | 7th consecutive | 4-site check at Component inventory + Per-file pseudocode docstring + Acceptance criteria + P3 Coverage row → 14 ACs |
| JSDoc-scope-grep coverage (R06 MINOR-1) | 4th consecutive | trivially satisfied — R13 creates new files; no existing JSDoc to update |
| Public opts-field AC-coverage (R06 MINOR-3) | 5th consecutive | trivially satisfied — no opts interface; both positional parameters bound by ACs |
| Fixture-sizing exhaustive propagation (R07) | 6th consecutive | Both PR-F2 cells use identical N_TRIALS=200, Q_LEVEL=0.05, T_TICKS=100, N_SHARDS=100, ρ²=0.5; Wilson bound shared |
| OBSERVED-binding scope (R07) | 6th consecutive | AC-10 + AC-11 bind theory-derived Wilson upper bound; no OBSERVED-binding |
| Inherited-testimony empirical verification (R08) | 6th consecutive | npm typecheck exit 0; q11 18/18; q12 16/16 at HEAD 2a3c177 |
| Procedural halt-discipline (R08) | 4th consecutive | Implementer note 3 enumerates 3 HALT conditions (a/b/c) with DIAGNOSTIC + escalate guidance |
| Correction-propagation pass (R09) | 4th consecutive | trivially satisfied — R13 does not correct prior-round premise |
| File-level docblock coverage (R10 MINOR-1) | 3rd consecutive | Delta 1 verbatim file header documents full exported surface; Implementer note 6 mandates copy |
| Citation-accuracy via sed-n extraction (R11 OBS-1/-2) | 2nd consecutive | All REVIEWER-ANCHOR line ranges extracted via sed-n at spec-emit |

15 reinforcements applied; all verified at spec-emit.

---

## Open Questions (during brainstorm; all resolved before spec emission)

Each item below was an architectural question explicitly considered during brainstorm; all resolved with documented rationale and verified in spec § Open Questions to state "None — all resolved."

- **OQ-A:** R12 OQ-1 — per-shard vs fleet-level e-BH input. **Resolved D3:** per-shard (β).
- **OQ-B:** Default qLevel — 0.05 / 0.10 / configurable-required. **Resolved D2:** configurable-required.
- **OQ-C:** Algorithm form — standard fixed-α / randomized / BY-style. **Resolved D1:** standard fixed-α (Ren-Barber 2024 Algorithm 1).
- **OQ-D:** Input space — log vs linear. **Resolved D8:** linear-space.
- **OQ-E:** Output shape — bare array vs wrapped object. **Resolved D5:** wrapped `{ selected, K }`.
- **OQ-F:** Tie-breaking — index ASC / DESC / random. **Resolved D6:** index ASC.
- **OQ-G:** Output sort order — by index ASC / by e-value DESC / unsorted. **Resolved D7:** index ASC.
- **OQ-H:** PR-F2 family scope — A only / A+C. **Resolved D9:** A only.
- **OQ-I:** MD-F2 — fixed-time vs any-time. **Resolved D10:** fixed-time at R13.
- **OQ-J:** Module location — engine/fleet/ / engine/per-shard/ / engine/detectors/. **Resolved D11:** engine/fleet/.
- **OQ-K:** Type co-location — same file vs separate types file. **Resolved D12:** same file.
- **OQ-L:** Empty-input semantics — throw / return empty / return null. **Resolved D13:** throw.
- **OQ-M:** Invalid-qLevel semantics — throw / clamp / default. **Resolved D14:** throw.
- **OQ-Z:** Chained-vs-parallel architecture (Q-J1 confirmation). **Resolved D4:** parallel; rejected (Z); R13-SAS-14 fences.

No unresolved architectural ambiguity at spec emission. The PR-F2 mandate (NEXT-ROLE.md ≥3-candidate brainstorm requirement) is satisfied by OQ-C's three-candidate brainstorm at the algorithm level plus OQ-Z's chained-vs-parallel rejection at the architecture level.

---

## Amendments from prior version

None (initial version of Q-R13-SPEC).
