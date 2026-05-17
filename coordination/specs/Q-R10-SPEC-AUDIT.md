# Q-R10-SPEC-AUDIT — Architect audit sidecar for Q-R10-SPEC

_From: Architect (R10 pipeline run; full tier per A3 + A2)._
_Date: 2026-05-17._
_Spec: `coordination/specs/Q-R10-SPEC.md` (full)._
_Contains: brainstorm rationale, decision rationale, pre-route discipline application, architect pre-predictions, brainstorm re-evaluation, Q-R10 → Q-R11 sequencing._

---

## Brainstorm

### Approach 1 — Inline emission in `updatePerShardResidual` (no helper extraction)

Modify `updatePerShardResidual` to inspect the post-observeSample confidence and, at strict tier, populate `mean_vector` and `covariance` directly in the final return literal.

**Strengths:**
- Smallest possible diff (one function changed; one new import; no new exported symbol).
- Single entry point; no surface-area expansion.

**Weaknesses:**
- The `'pooled'` / `'aggregate'` inverse-convention cases (which NEXT-ROLE.md explicitly requires "Tests bind the inverse at all 4 non-strict tiers") become UNTESTABLE — `observeSample` cannot produce these tiers per warm-start.ts:91-94 (newConfidence is always one of 'none'/'warm_start'/'strict'). Tests would have to mock observeSample or construct outputs by hand, both invasive.
- Conflates accumulation responsibility with emission responsibility inside one function (the R05 architect's OQ-2 read-time pre-prediction flagged this concern).

**Hidden assumptions:** That the operator's "all 4 non-strict tiers" wording was loose (only meant the tiers updatePerShardResidual can produce). Per the literal NEXT-ROLE.md wording, this assumption is likely WRONG.

**Risks:** Reviewer flags incomplete coverage of pooled/aggregate inverse-convention; round needs a fix-cycle to extract a helper anyway.

### Approach 2 — Separate emission function, called by future orchestrator (read-time projection)

Add a standalone `projectTierGatedOutputs(residual)` helper. `updatePerShardResidual` continues to return un-projected residuals; downstream consumers (future orchestrator) call the helper at read time.

**Strengths:**
- Clean separation of concerns; matches R05 OQ-2 architect-pre-prediction (read-time).
- Future orchestrator surface ready.

**Weaknesses:**
- R10 has no orchestrator caller yet — the helper would land as dead code at the runtime entry point (consumers calling `updatePerShardResidual` would get un-projected residuals; they would not magically know to call projectTierGatedOutputs).
- Pre-R10 tests (q05 et al.) would not exercise the projected form; the substrate gains a function nobody yet calls.
- Operator wording in NEXT-ROLE.md: "populate both fields on the returned PerShardResidual" — clearly expects the returned PerShardResidual from `updatePerShardResidual` to have the emission, NOT a separately-projected residual.

**Hidden assumptions:** That an orchestrator caller will materialize soon enough to make the helper non-dead. R10 scope explicitly fences mean_delta + baseline-injection (which would be the orchestrator's main responsibility) to R11+.

**Risks:** Helper lands; nothing calls it from production paths; semantic regression — the "strict tier emits mean_vector" property is invisible at the runtime entry point.

### Approach 3 (PICKED) — Hybrid: extract helper + call it inside `updatePerShardResidual`

Add an exported helper `projectTierGatedOutputs(residual)` in `engine/per-shard/runtime.ts`. `updatePerShardResidual` calls the helper as its final step. Tests can either (a) test through `updatePerShardResidual` end-to-end (AC-9) OR (b) test the helper directly with synthetic fixtures (AC-1 through AC-8 + AC-10 + AC-11).

**Strengths:**
- Single entry point preserved (consumers of `updatePerShardResidual` get the projected form; matches operator wording).
- Inverse-convention testable at all 4 non-strict tiers via direct helper calls with synthetic 'pooled'/'aggregate' fixtures (matches "Tests bind the inverse at all 4 non-strict tiers" wording).
- Helper is pure + small + reusable; a future orchestrator can call it directly without re-extraction (R05 OQ-2's read-time use case is not foreclosed).
- Coincidentally closes R05 OBS-3 (welfordCovariance unread in q05) via q10 AC-1 cross-check.

**Weaknesses:**
- One additional exported symbol in `engine/per-shard/runtime.ts`. Marginal.
- Slightly more code than Approach 1 (the helper extraction adds ~30 LOC of pseudocode vs the inline form's ~15 LOC).
- Slightly less pure than Approach 2 (the helper extraction is good; the calling-it-from-updatePerShardResidual partly negates the read-time-vs-write-time separation R05 OQ-2 anticipated).

**Hidden assumptions:** None material. The helper's input contract (a `PerShardResidual` from any source) is documented; the output contract (well-formed sparse-encoded residual) is bound by ACs.

**Risks:** Low. The destructure-then-spread enforcement form is a slight novelty vs the two R02 OQ-2 options (discriminated-union refactor, runtime-invariant assertion); it's documented as a "third option" at OQ-R10-5.

### Selection rationale

**Approach 3 picked** because:
1. It correctly handles the operator's "Tests bind the inverse at all 4 non-strict tiers" requirement — `'pooled'` / `'aggregate'` are reachable via direct helper calls.
2. It matches the operator's "populate both fields on the returned PerShardResidual" wording — `updatePerShardResidual` consumers see the projected form.
3. It preserves future orchestrator flexibility — the helper is reusable.
4. The cost (one extra exported symbol; ~30 LOC of helper code) is small.

**Approach 1 rejected** because the testability gap for 'pooled'/'aggregate' would force a fix-cycle (Reviewer would flag the coverage gap).

**Approach 2 rejected** because the helper would land as dead code at the runtime entry point; the substrate would ship a function that no production caller invokes, AND the runtime entry point's returned residual would NOT match operator scope wording.

---

## Brainstorm re-evaluation: R05 OQ-2 (read-time vs write-time projection)

R05 architect-pre-prediction at OQ-2: "READ time — the orchestration boundary is where the tier-gate + baseline injection happens; the runtime.ts function should stay focused on accumulator maintenance, not output projection. Confidence: MEDIUM; R06 architect's call."

R10 architect (this spec) picks **WRITE-time emission via helper-called-from-runtime**.

This is a partial supersession of the R05 architect's MEDIUM-confidence pre-prediction. The trade-offs the R05 architect documented:

- **R05's pro for read-time**: "runtime.ts function should stay focused on accumulator maintenance" — R10 picks Approach 3 which extracts emission into a helper, partially honoring the separation concern (the helper IS focused on emission; the original `updatePerShardResidual` still calls it at the end so its responsibilities grow by exactly one line).
- **R05's hidden assumption**: that an orchestrator caller exists at R06 to wire the read-time helper into. The orchestrator caller did NOT materialize at R06 / R07 / R08 / R09 (the SLICE 4/5 baseline-curation arc consumed those rounds instead). At R10 there is still no orchestrator caller.

R10's deviation from R05's pre-prediction is justified by:
1. Operator scope wording in NEXT-ROLE.md ("populate both fields on the returned PerShardResidual") explicitly expects WRITE-time projection.
2. The helper extraction (Approach 3) preserves the option to call the helper at read-time later — no architectural commitment is foreclosed.
3. The MEDIUM confidence on R05's pre-prediction was explicit; R10 architect's WRITE-time pick is itself MEDIUM confidence and documented for future supersession if a read-time orchestrator surface emerges.

**Compensating control**: OQ-R10-4 documents the supersession and the deferred read-time option. Future architect can walk back R10's pick if/when an orchestrator emerges that prefers un-projected residuals.

**Memorial classification**: this is an "operator-chosen approach with documented prior pre-prediction" — accepted trade-off, not a violation of architect-pre-prediction discipline.

---

## Decision rationale

### D1 — Helper extraction vs inline emission

**Picked: Helper extraction (Approach 3).**

**Why:** Testability requirement for 'pooled'/'aggregate' inverse-convention. Inline-only design would force Tests-bind-the-inverse-at-all-4-non-strict-tiers to be unsatisfiable (observeSample cannot produce those tiers).

**Why-rejected (inline):** Coverage gap for 'pooled'/'aggregate' would be detected by Reviewer; fix-cycle would extract the helper anyway. Better to extract proactively.

**Why-rejected (separate-only):** Helper-without-runtime-call would land as dead code; consumers of `updatePerShardResidual` would not see the projected form.

### D2 — Atomic gate (three-clause AND) vs split gate

**Picked: Atomic gate (`confidence === 'strict' && welford_state !== undefined && welfordCovariance(state) !== null`).**

**Why:** PRD AC-P2 + inherited FamilyCPerCell contract expect mean_vector AND covariance together at strict tier. A partial emission (mean_vector populated, covariance absent due to n<2) would violate consumer expectation. Atomic gate enforces "both or neither" at the emission site.

**Why-rejected (split gate):** Split form (emit mean_vector when welfordMean returns; emit covariance when welfordCovariance returns non-null) would produce partial outputs at the n=1 edge case (mean_vector=[sample], covariance absent). Downstream consumers would have to defensively check covariance separately.

**Why-rejected (gate on `n_samples >= STRICT_UPGRADE_THRESHOLD`):** Couples the emission gate to the state-machine's threshold integer (warm-start.ts's STRICT_UPGRADE_THRESHOLD constant), which is fine in production but breaks defensive handling of malformed fixtures where `n_samples` and `welford_state.n` can diverge.

### D3 — Inverse-convention enforcement via destructure-spread vs set-to-undefined vs delete-mutation

**Picked: Destructure-then-spread (`const { mean_vector: _, covariance: __, ...rest } = residual; return rest;`).**

**Why:** Produces output with keys ABSENT (not present-with-undefined). Stronger semantic: `'mean_vector' in result === false`; `JSON.stringify(result)` omits the keys. Pure-functional (no mutation of input). AC-3 + AC-4 + AC-5 + AC-6 bind the `'mean_vector' in projected === false` form to make the semantic explicit.

**Why-rejected (set-to-undefined):** Keys remain present with value undefined. `'mean_vector' in result === true`. Confusing — consumers checking for key presence get surprising results.

**Why-rejected (delete mutation):** Mutates the spread output object; reasonable in TS but mixes paradigms with the otherwise-pure-functional pattern in welford.ts + warm-start.ts.

### D4 — `mean_delta` untouched vs `mean_delta` also stripped at non-warm_start tiers

**Picked: `mean_delta` untouched at R10.**

**Why:** R10 scope is explicitly bounded to mean_vector + covariance per NEXT-ROLE.md. mean_delta emission is R11+ (requires baseline injection). If R10 stripped mean_delta at non-warm_start tiers, R11+ would have to add mean_delta back to the destructure-then-RE-spread path, which is fragile.

**Why-rejected (strip mean_delta too):** Premature enforcement; would require coordination with R11+ to re-introduce the field in the warm_start emission path. R10's anti-scope (R10-SAS-4 + R10-SAS-5) explicitly defers this. AC-10 second assertion binds the untouched-mean_delta semantic.

### D5 — Helper placement: `engine/per-shard/runtime.ts` vs new file

**Picked: Co-locate in `engine/per-shard/runtime.ts`.**

**Why:** R10-SAS-9 fences new files. The helper is tightly coupled to `updatePerShardResidual` (called as its final step + tests import both from the same module). One module per concern.

**Why-rejected (new file `emission.ts`):** Adds an import edge for marginal organizational benefit; consumers would need to remember two import paths.

### D6 — Schema docstring update vs no doc change

**Picked: Update PerShardResidual JSDoc (Delta 1).**

**Why:** The current docstring says "Full runtime population semantics deferred to SLICE 2b." R10 IS SLICE 2b4 and lands part of that deferral. Leaving the docstring stale would be misleading to downstream readers. AC-19 binds the JSDoc grep so the update lands verifiably.

**Why-rejected (no doc change):** Stale documentation rot.

---

## Pre-route discipline application

### Skill 14 — Memorial sweep + active reinforcements (12 ARCHITECT + 13 IMPLEMENTER + 1 COMMON per NEXT-ROLE.md)

Architect reinforcements applied this round:
1. **Cross-section consistency pass** (R01, 6th application) — 16 row checks executed; all PASS.
2. **Type-declaration-site discipline** (R02 OBS-3, 7th application) — welfordMean@93, welfordCovariance@100, WelfordState@32, PerShardResidual@873, FamilyCPerCell@22-25, observeSample@69-94, all verified by file reads at spec-emit time.
3. **Re-export-chain check** (R03, 3rd application) — direct imports only; no re-export chain.
4. **File track-state check** (R02 OBS-2) — q10 file verified absent at HEAD `4869f65` via `git ls-files`.
5. **Grep-pattern soundness** (R03 MINOR-2, 3rd application) — Delta 2c grep relaxed to ≥-form to avoid docstring-inflation; AC-17 (a) uses unambiguous multi-word literal; AC-19 intentionally targets JSDoc content per intent-alignment clause.
6. **AC verification-command soundness** (R03 MINOR-2 follow-up) — all binding commands run by Architect at spec-emit time where empirically verifiable.
7. **Empirically-verified test count** (R03 MINOR-4, 3rd application) — AC-13 baseline (93) verified by Architect's own `node --test` run, not inherited from NEXT-ROLE.md.
8. **Inherited-testimony empirical verification** (R08 MAJOR-2, 2nd application) — all claims about R05 production behavior (welford defensive copy; covariance null at n<2; updatePerShardResidual output shape; q05 test bindings) verified by direct file/code read.
9. **Correction-propagation pass** (R09 MAJOR-1, 2nd application) — R10 supersedes R05 OQ-2 architect-pre-prediction; documented at OQ-R10-4 + brainstorm re-evaluation section above + Open Questions OQ-R10-5.
10. **Component-inventory AC-range arithmetic cross-check** (R06 MINOR-1, 2nd application) — three sites (Component inventory, q10 docstring head, Coverage axis) agree on 11 in-file ACs.
11. **JSDoc secondary-occurrence grep** (R06 MINOR-1 follow-up) — Delta 1 prescribes the exact JSDoc text replacement; `grep -n "Full runtime population semantics" engine/types/config.ts` verified at spec-emit to find single occurrence (no secondary sibling JSDoc with the same stale text).
12. **OBSERVED-binding scope** (R07 MAJOR-2) — AC-9 binds theory-derived OBSERVED values; "would future FIX matching prediction FAIL?" check verbalized in grilling.

Implementer reinforcements (preserved at the spec layer for Implementer awareness; documented in spec § Grilling):
1. **Procedural halt-discipline** (R08, 2nd) — spec premise failures must HALT regardless of resolution clarity.
2. **Attestation-accuracy** (R03) — OBSERVED, not predicted.
3. **MEMORIAL tactical-choice verification** (R05) — narrative claims about committed code must be verified.

### Skill 15 — Halt conditions enumerated

Per NEXT-ROLE.md R10 halt conditions:
- **Q-JC re-disposition**: No Q-J or Q-JC architectural decision required at R10. Spec resolves all open architectural questions via the brainstorm + decision rationale above. No HALT triggered.
- **Scope drift to compiled-artifact loader or mean_delta**: Fenced explicitly at R10-SAS-4 + R10-SAS-5 + R10-SAS-6. No drift; no HALT triggered.
- **Inherited testimony about R03/R04/R05 behavior**: All such claims empirically verified at spec-emit time per discipline 8 above. No HALT triggered.
- **New OBSERVED-binding without "would future FIX matching prediction FAIL?" check**: AC-9 is theory-derived (closed-form mean + zero-variance covariance); no future-FIX-failure risk. No HALT triggered.

### Grilling (pre-route adversarial self-review)

Five gates: (1) every claim verifiable; (2) no unstated assumptions; (3) no scope creep; (4) Implementer can act without guessing; (5) reinforcement-specific checks. All five PASS per spec § Grilling output above.

### Tier-rubric verdict

Full tier picked per A3 (resolving deferred open questions from R02 + R05) + A2 (new architectural pattern — first runtime-emission surface at strict-tier transitions). Tier rubric does not justify a downshift. Per NEXT-ROLE.md "Routing" section.

---

## Architect pre-predictions on outcomes

(For Reviewer-side grading post-implementation; Architect commits to these predictions at spec-emit time.)

1. **All 19 ACs PASS at first IMPLEMENTER pass**. The spec is pseudocode-complete; no design decisions left to Implementer. Confidence: HIGH.

2. **Zero halt conditions encountered by Implementer.** All HALT conditions are pre-fenced in R10-SAS-* with explicit "no" prescriptions. Confidence: HIGH.

3. **TDD ordering verifiable via two-commit RED→GREEN.** RED commit creates q10 test file → tsc fails at TS2305 (no exported member `projectTierGatedOutputs`). GREEN commit modifies runtime.ts + config.ts. Confidence: HIGH.

4. **Implementer Q-cycle ~1.5-2 hours.** Smaller than R05 because (a) no new external types, (b) no schema changes, (c) the projection logic is mechanically prescribed in Delta 2 pseudocode. Confidence: MEDIUM (timing is empirically unverifiable from artifact).

5. **≤2 MINOR + ≤4 OBS surfaced by Reviewer; 0 MAJOR + 0 CRITICAL.** Likely findings:
   - **(a) Atomic gate edge-case test coverage** — Reviewer may flag that AC-7 + AC-8 cover the two malformed-fixture edges but not the negative case "strict tier with welford_state.n=0" (which is welford_state.mean.length=0, a different edge). Unlikely to be load-bearing — the spec architecture handles this case implicitly (welfordMean would return empty array; welfordCovariance returns null at n<2 including n=0).
   - **(b) Stale-spread test could parameterize more tiers** — AC-10 binds the stale-spread strip at warm_start only; Reviewer may suggest parameterizing across all 4 non-strict tiers. Cosmetic; AC-3 through AC-6 already verify the non-strict tier inverse on clean fixtures.
   - **(c) JSDoc grep at AC-19 has intent-alignment-but-comment-match nuance** — Reviewer may flag that the (a) sub-clause grep `"R10 (SLICE 2b4) emission contract"` would also match if the literal text appeared in any other file (R10-SAS-1 limits the modification scope to config.ts, but the grep itself doesn't verify file-bounded match). Cosmetic.
   - **(d) Delta 2c grep relaxation from exact-count to ≥-count** — Reviewer may note that the Delta 2c verification's relaxed form `≥ 2` is less precise than R05's exact-count form. Trade-off documented in spec § Grilling output reinforcement 5; intentional to avoid docstring-inflation false-positives.
   Confidence: MEDIUM.

6. **Memorial Updater CONFIRMATIONs expected:** at least 3 — cross-section consistency pass (6th consecutive); type-declaration-site discipline (7th consecutive); empirically-verified test count (3rd consecutive). Plus correction-propagation pass (R09 reinforcement, 2nd consecutive) and inherited-testimony empirical verification (R08 reinforcement, 2nd consecutive).

7. **Session-crash risk: low.** No long-running computations; spec is short and bounded; Implementer's primary work is one helper extraction + two integration edits.

8. **R05 OBS-3 coincidental closure** — q10 AC-1 reads `welfordCovariance(residual.welford_state!)` directly for cross-check. Reviewer should detect that R05 OBS-3 (welfordCovariance unread in q05) is now closed by R10's natural AC design. Confidence: HIGH; closes a known coverage gap as a side effect.

9. **R02 MINOR-2 closure** — R10 lands the sparse-encoding inverse-convention enforcement for mean_vector + covariance. R11+ will close the remaining mean_delta dimension. Reviewer should note that R02 MINOR-2 is now PARTIALLY-closed (mean_vector + covariance enforcement landed; mean_delta enforcement pending). Confidence: HIGH.

10. **R11 architect picks: mean_delta computation + emission + inverse-convention enforcement.** Future round; non-falsifiable here.

11. **Helper naming divergence flag**: Reviewer may suggest `projectTierGatedEmission` (verb-noun-noun-noun) or `emitTierGatedFields` (different verb). Pre-emptive defense in spec text + cross-section consistency check (rows 2 + 3) should absorb this if Reviewer raises.

12. **Atomic-gate "no throw on malformed input" choice**: Reviewer may suggest throwing instead. Pre-emptive defense at OQ-R10-3 + R10-SAS-22 explicit fences.

---

## Q-R10 → Q-R11 sequencing context

R11 architect will likely scope: `mean_delta` computation at warm_start tier + inverse-convention enforcement for mean_delta at non-warm_start tiers + (optionally) the orchestrator boundary that injects BaselineCellEntry into the per-shard runtime.

R11 entry conditions (post-R10):
- R10 helper `projectTierGatedOutputs` is exported and consumed by `updatePerShardResidual`.
- The destructure-then-spread enforcement pattern is established; R11 extends it to also destructure-out `mean_delta` and re-introduce at warm_start tier (when baseline injection produces the residual).
- `updatePerShardResidual` signature is unchanged at R10; R11 will likely extend it to accept a `BaselineCellEntry` parameter for fleet-aggregate mean injection.

R11 entry sequencing:
- Open question OQ-R10-1: should `projectTierGatedOutputs` be extended to also gate `mean_delta`, or should a separate `projectMeanDelta` helper be added? R10 architect-pre-prediction is "extend `projectTierGatedOutputs`"; R11 architect picks.
- Open question OQ-R10-4: WRITE-time vs READ-time projection — R11 architect may walk back R10's pick if an orchestrator caller emerges.

R11 anti-scope (preserved from R10):
- No compiled-artifact JSON loader (R12+).
- No PR-F5 empirical storage measurement (R12+).
- No mergeWelfordStates / Chan-Golub-LeVeque combination (Phase 1 SLICE 3).
- No modification to inherited vendored engine internals.

---

_End of Q-R10-SPEC-AUDIT.md._
