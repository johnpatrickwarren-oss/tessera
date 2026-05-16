# Q-R04-SPEC AUDIT SIDECAR (v0.1)

_Sidecar to `Q-R04-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, and Q-R04 → Q-R05 sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_Reviewer reads BOTH this file and `Q-R04-SPEC.md`. Implementer reads ONLY `Q-R04-SPEC.md` (plus source files)._

---

## Brainstorm (Superpowers Brainstorm phase output)

Five distinct approaches were generated and evaluated before R04 spec authoring began. Each evaluated against strengths / weaknesses / hidden assumptions / risks; selection rationale documented at the end.

### Approach A — Full SLICE 2b2 per R03 audit-sidecar projection

**Scope:** Welford algorithm + observeSample integration + accumulator-strategy decision (pick one of options a/b/c) + extended SampleObservation (sampleVector field) + mean_delta computation (requires baseline injection) + R02 MINOR-2 sparse-encoding enforcement (discriminated-union OR runtime assertion) + R03 carry-forwards (MINOR-1, MINOR-5, OBS-2). Six-to-eight architectural decisions in one round.

**Strengths:** Closes Phase 1 SLICE 2b atomically. Delivers AC-P2 user-facing capability at the integrated runtime layer. Maximally satisfying for operator-level "Phase 1 SLICE 2 done."

**Weaknesses:** Six-to-eight architectural decisions in one round is the exact pattern R03 successfully rejected (R03 narrowed to "state machine only" precisely to avoid algorithm-design + integration-design + accumulator-strategy conflation). Each decision (Welford vs. naive vs. Kahan; integration timing within observeSample branches; accumulator-strategy a/b/c; baseline injection mechanism; sparse-encoding enforcement option) has its own architect-grilling surface; bundling dilutes per-decision rigor. The accumulator-strategy decision (a) breaks R02-shipped schema (adds `_accumulator?` field); option (b) violates R02 sparse encoding convention; option (c) requires orchestrator scope (R03-SAS-2). Each option has structural costs that warrant deliberate weighing.

**Hidden assumptions:** That the per-role CLAUDE.md split + R02/R03 right-sizing precedents are sufficient mitigation for the multi-decision context load. That mean_delta = welfordMean - baseline is the only viable formulation (it isn't — alternatives include incremental delta accumulation, two-stage residual, etc.).

**Risks:** Session-crash recurrence (R01-class pattern); multi-layer scope-creep; algorithm-design + integration-design conflation; one architectural decision absorbing another (e.g., picking sparse-encoding option (a) forces accumulator strategy (a) by coupling, dilution of independent reasoning).

### Approach B — Pure R03 fix-cycle (MINOR-1 + MINOR-5 + OBS-2 only; defer all SLICE 2b2 to R05+)

**Scope:** Address R03 MINOR-1 (in-place AC-9 comment) + MINOR-5 (immutability test) + OBS-2 (strict-tier reset test); no new production code; defer Welford + integration + accumulator-strategy to subsequent rounds.

**Strengths:** Smallest scope. Discipline-clean: R03 carry-forwards closed before new behavioral work. Validates the cross-round bundling pattern on a small surface.

**Weaknesses:** R03 was MERGE-READY at MINOR/OBS count 5+5; no blocking debt. Pure fix-cycle work is ceremonial — the R03 q03-surface MINOR/OBS items are best closed opportunistically alongside the work that touches q03, which is precisely what Approach E does. Approach B produces no architectural progress and wastes a pipeline run.

**Hidden assumptions:** That R03 MINOR/OBS items require ceremonial closure rounds. (They don't — bundling opportunistically is the discipline-correct path per R02 → R03 and R03 → R04 precedent.)

**Risks:** Pipeline overhead for ceremonial work; same anti-pattern R03 brainstorm Approach C rejected.

### Approach C — Welford module + extended SampleObservation + new schema field `_accumulator?` (option (a)) + observeSample integration at strict tier only (init fresh at strict-entry; no warm-start tier integration; no mean_delta) + R03 carry-forwards

**Scope:** Adds the schema change AND a partial integration without the full accumulator-strategy commitment.

**Strengths:** Lands more than just the algorithm; demonstrates schema-evolution discipline.

**Weaknesses:** "Init fresh at strict-entry" semantic is INCOMPATIBLE with PRD AC-P2 "preserves inherited single-instance behavior" requirement — inherited single-instance accumulates from sample 1; fresh-init at strict tier means the first 60 samples are not used in strict-tier statistics. This is a substantive architectural mis-step that PRD-conjunction-cross-check (Skill 14) catches. Also: adding `_accumulator?` to the schema is a R02 schema change (violates R02-SAS-9 carry-forward chain) and conflates the algorithm round (R04) with the accumulator-strategy round (R05).

**Hidden assumptions:** That PRD AC-P2's "single-instance behavior preserved" language is satisfied by tier-segregated statistics. (It isn't — single-instance means "from sample 1 onward.")

**Risks:** PRD-conjunction violation; conflated decisions; schema thrash.

### Approach D — Welford module + extended SampleObservation (sampleVector field added) + tests against the algorithm + R03 carry-forwards. NO integration into observeSample. NO new schema fields.

**Scope:** Algorithm only, with the data-flow interface extended to carry sampleVector (anticipating R05's needs). q04 tests bind the algorithm.

**Strengths:** Lands the data-flow interface extension (SampleObservation acquires sampleVector field) alongside the algorithm; R05 integration would consume the extended observation without further interface work.

**Weaknesses:** Extending SampleObservation at R04 without an observeSample modification means the new field is read by nobody. It would be a no-op at R04 and would force R05 to retroactively decide what observeSample does with it. The extension is premature — better to land the interface and the consumer in the same round (R05) so the interface design is informed by the integration use cases.

**Hidden assumptions:** That the SampleObservation interface should be extended at the algorithm round rather than the integration round. (It shouldn't — interface design is best done at consumer-binding time.)

**Risks:** Premature interface design; R05 architect re-litigating the interface shape; cross-round inconsistency if R05 needs to reshape SampleObservation differently than R04 predicted.

### Approach E — Welford module (pure-function, standalone, zero inherited imports, no schema or SampleObservation changes) + new q04 test file + R03 carry-forward closures (MINOR-1 in-place comment + MINOR-5 immutability test + OBS-2 strict-tier reset test) opportunistic bundle

**Scope:** Create `engine/per-shard/welford.ts` (Welford pure-function module with `WelfordState` local interface + initializer + update + emit accessors); create `test/q04-welford-stats.test.ts` (eleven algorithm tests); update `test/q03-warm-start-runtime.test.ts` to add AC-12 (strict-tier reset) + AC-13 (immutability) + in-place AC-9 clarifying comment. Defer integration with observeSample to R05; defer accumulator-strategy decision to R05; defer mean_delta computation to R05; defer R02 MINOR-2 sparse-encoding enforcement to R05; defer extended SampleObservation to R05; defer compiled-artifact loader to R06+; defer PR-F5 measurement to R06+.

**Strengths:** Mirrors R03's successful right-sized + co-located-MINOR-close pattern (R03 = state machine only + R02 MINOR closures). The algorithm-vs-integration split is a clean architectural-layer ladder; R04 ships the algorithm without coupling, R05 ships the integration after deliberately picking the accumulator-strategy (a/b/c). Three surfaces of change (down from Approach A's ~8), well under the R01 context-load threshold. The Welford module has ZERO inherited imports — no integration-point spec error risk (eliminates R02 OBS-3 / R03 MINOR-3 class of finding by construction). The three R03 carry-forwards bundle naturally with the q03 test file (already adjacent to R04's q04 test work; same factory imports). Numerical-stability + sample-covariance-convention bindings (AC-6, AC-8) catch the most common Welford reimplementation bugs.

**Weaknesses:** Welford module has no immediate engine-side consumer (loader-without-consumers criticism from R03 Approach D). Mitigation: precedent established at R03 by factories.ts (test-substrate without engine consumers, justified by "amortizes substrate for R04/R05+"); Welford has stronger justification (algorithm choice + numerical-stability commitment is architecturally non-trivial; landing it standalone separates algorithm-design from integration-design). Adds a fourth sub-slice to SLICE 2b (2b1 state machine + 2b2 algorithm + 2b3 integration + 2b4 compiled-artifact); operator cognitive overhead grows. PRD AC-P2 user-capability ("alerts within 20 samples") is not yet delivered at the alert-emission layer (orchestrator anti-scope).

**Hidden assumptions:** That R04 has appetite for the fourth sub-slice split. That standalone Welford is genuinely architecturally significant (not just plumbing). That Welford-vs-naive numerical-stability is load-bearing for downstream consumers (likely YES per SCOPING-MEMO § 4.1 R-S2 framing; fleet-scale magnitudes do shift).

**Risks:** Operator may want fuller SLICE 2b close in one round; mitigated by R04 spec explicit anti-scope and § Open questions OQ-5 documenting the R05 architect's design space. Reviewer may flag the consumer-less Welford module as dead-code; mitigated by § Mechanism primitive 3 + 4 framing (substrate landing precedent from R03; algorithm-design separation rationale).

### Selection — Approach E

**Rationale for selection:** Defense-in-depth from R02 → R03 wins for the third consecutive round. The R03 brainstorm's selection rationale (Approach E in R03 spec audit) explicitly anticipated R04 = statistical-residual computation; the R04 question is how tightly to scope that work. Three signals point to "tightest viable":
1. R01's failure mode (session crash from too-broad scope) is the dominant risk signal, and R02 + R03's successful narrowing prove right-sizing works.
2. The architectural-layer split (compile-time schema → state-machine runtime → algorithm-as-pure-function → integration → compiled-artifact) is natural and matches the inherited DeploySignal Q66 iterative-refinement precedent; splitting along this axis produces clean cross-round handoffs.
3. The accumulator-strategy decision (a/b/c) is genuinely substantive (each option has structural costs documented in R03 sidecar); bundling it with algorithm-design dilutes both decisions.

Approach E delivers the highest-information-content portion of SLICE 2b2 (Welford algorithm with numerical-stability commitment + sample-covariance convention pinning + immutability + dimension-mismatch error semantics — five real architectural decisions consolidated in one small module) while leaving the integration question + accumulator-strategy + sparse-encoding enforcement + mean_delta computation to a dedicated R05 round with its own architect-grilling discipline. The R03 carry-forwards (MINOR-1 + MINOR-5 + OBS-2) co-locate naturally with q03 (the q03 file is naturally adjacent to q04 in the test directory; the same factory imports serve both); bundling is opportunistic, not forced.

**Rejection rationales:**
- A rejected: 6-8 architectural decisions in one round = R01-class failure mode + multi-decision dilution. Accumulator-strategy + integration timing are substantive enough each to warrant their own grilling pass.
- B rejected: R03 was MERGE-READY; ceremonial fix-cycle wastes pipeline overhead. Closures bundle better opportunistically with the natural next-round work.
- C rejected: PRD-conjunction violation (fresh-init at strict entry doesn't preserve inherited single-instance behavior); schema thrash without commitment.
- D rejected: premature interface design; SampleObservation extension is best done by the integration consumer at R05.

**Tier rubric verdict:** **full** tier. Factors fired:
- **A2** (new architectural pattern with no precedent in the codebase) — Welford pure-function statistical module is the second Tessera-original engine module (warm-start.ts was the first at R03); establishes the "Tessera-original algorithm-as-pure-function" pattern as recurring. Numerical-stability commitment (Welford over naive) is a deliberate architectural choice with downstream implications.
- **A4** (novel data model) — `WelfordState` interface is a new data-model surface, intentionally module-local; the choice to NOT integrate with PerShardResidual at R04 is itself an architectural commitment that R05 builds on.
- **A7** (first-time territory) — Tessera Phase 1 SLICE 2b2 has no precedent; the algorithm-vs-integration split is novel cross-round handoff.

A2 + A4 + A7 firing is identical to R02's and R03's tier verdicts; the "first novel piece of layer N" justification holds at R04.

**Q-cycle estimate:** ~3-4 hours of focused Implementer work. ~45 min creating welford.ts (algorithm + JSDoc + four exports); ~60 min creating q04-welford-stats.test.ts (11 tests including AC-3 + AC-8 hand-traceable + AC-6 numerical-stability fixture); ~30 min updating q03 (Delta 3a strict-tier reset + Delta 3b immutability + Delta 3c clarifying comment); ~30 min coordination artifacts + binding-command attestation; ~15 min hand-trace verification (Implementer note 5). Comfortably under R01's 2-day budget; on par with R02's ~3 hour actual and R03's similar.

---

## Q-R04 → Q-R05 sequencing context

R05 (SLICE 2b3) scope inferred from R04's narrowing:

- **Integration of Welford into observeSample.** Layered on top of R04's `engine/per-shard/welford.ts` + R03's `engine/per-shard/warm-start.ts`. The integration decision is architectural: does `observeSample` internally call `updateWelford`? Or does a NEW orchestration function compose both? Architect-pre-prediction (HIGH confidence): a new `engine/per-shard/per-shard-runtime.ts` (or similar) module composes observeSample + updateWelford, keeping both pure modules unchanged. The composition function's signature would be something like `updatePerShardCell(cell: PerShardCell, observation: ExtendedObservation): PerShardCell` where `ExtendedObservation = SampleObservation & { sampleVector: number[] }`.

- **Accumulator-strategy decision (a/b/c).** R04 surfaces the three options in R04-SAS-4; R05 architect picks. Architect-pre-prediction (MEDIUM confidence): option (a) — extend PerShardResidual with `_accumulator?: WelfordState` field that runs through all tiers; emit mean_vector/covariance at strict tier ONLY (sparse encoding preserved); emit mean_delta at warm_start tier ONLY (computed from accumulator + baseline). The architectural cost of (a) is the schema change (breaking-ish, but compatible — `_accumulator?` is optional so existing serialized state stays valid); the benefit is clean separation of OUTPUT (sparse-encoded per-tier) from INTERNAL STATE (accumulator agnostic to tier). The R05 architect may pick differently — (a)'s leading position is the architect-pre-prediction's bias, not a binding commitment.

- **mean_delta computation.** Requires fleet-aggregate baseline injection. Architect-pre-prediction: baseline arrives via the orchestration function's signature (e.g., `updatePerShardCell(cell, observation, baseline: BaselineCellEntry)`); `mean_delta = welfordMean(cell.residual._accumulator) - baselineMean(baseline)`. The mean_delta computation is a one-liner once accumulator + baseline are both available — the architectural work is the strategy decision, not the arithmetic.

- **Sparse-encoding inverse-convention enforcement (R02 MINOR-2).** Two enforcement options (discriminated-union refactor vs. runtime-invariant assertion). Architect-pre-prediction: (b) runtime-invariant assertion via a helper function called at the orchestration boundary. The assertion checks: warm_start tier residuals have mean_delta defined AND mean_vector === undefined AND covariance === undefined; strict tier residuals have mean_vector AND covariance defined AND mean_delta === undefined; none tier residuals have all three undefined. Non-breaking (no schema refactor); load-bearing once integration emits these fields per tier.

- **Extended SampleObservation.** Add `sampleVector: number[]` field. Architect-pre-prediction: extension via TypeScript interface intersection at the orchestration layer (`ExtendedObservation = SampleObservation & { sampleVector: number[] }`) rather than modifying the R03-shipped SampleObservation interface; preserves R03-SAS chain.

R06+ (SLICE 2b3 close / SLICE 2c open) scope:

- **Compiled-artifact JSON loader.** Reads a synthetic-cluster Tessera-side compiled-config JSON; verifies serialization round-trip; minimal schema-version handling.
- **PR-F5 empirical storage profile.** Measures populated `per_shard_cells` footprint vs single-instance baseline at N=1000 synthetic shards. Validates SCOPING-MEMO § 2.2 architect-pre-prediction ~1.2-1.5× single-instance.
- **P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet.** Pulls together loader + state machine + Welford + integration end-to-end.

R04 will NOT be a separate fix-cycle: the R03 carry-forwards bundled at R04 close out three of five R03 q03-surface findings; the remaining MINOR-2/3/4 are architect-discipline reinforcements (no test surface to repair, consumed at R04 spec-authoring time); OBS-1/3/4/5 are orthogonal-concern items deferred to whatever round touches each respective surface naturally.

The R01 MINOR-3/4/5/6/8/9 unbundled fence (R02-SAS-9 → R03-SAS-11 → R04-SAS-21 carry-forward chain) is also preserved: these were unbundled at R02 to keep scope tight and remain unbundled through R04 for the same reason.

---

## Pre-route discipline application

### Skill 14 — PRD-conjunction-cross-check (symmetric)

PRD AC-P2 conjuncts: (i) "warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold)" + (ii) "strict-upgrade at 60 samples preserves inherited single-instance behavior."

R04 narrows AC-P2 delivery to the ALGORITHM-SUBSTRATE layer (Welford supplies the accumulator substrate that an R05+ integration uses to populate strict-tier mean_vector + covariance from sample 1 onward). The PRD conjunct "preserves inherited single-instance behavior" requires accumulating from sample 1 — Welford accumulates from sample 1 by construction. The PRD conjunct "enables ALERTS within 20 samples" requires alert-emission machinery that is orchestrator scope (R04-SAS-6). The narrowing is explicit in three independent locations: § Spec preamble final paragraph; § Anti-scope R04-SAS-2 / R04-SAS-3 / R04-SAS-4; § Open questions OQ-5. **Symmetric application:** R04 does NOT widen any PRD conjunct; the literal numeric thresholds 20 and 60 (R03-shipped via WARM_START_THRESHOLD + STRICT_UPGRADE_THRESHOLD constants) are preserved without modification. PR-F4 pair-review derivation is acknowledged in the R04 audit sidecar but is not load-bearing at R04 (the literals are taken as given from R03). **NEW at R04:** the brainstorm explicitly rejected Approach C precisely because its "init fresh at strict entry" semantic would VIOLATE the "preserves inherited single-instance behavior" conjunct — Skill 14 caught the conjunction violation at brainstorm time.

PASS — no silent narrowing or widening; Skill 14 caught one approach's PRD-conjunction violation at brainstorm time.

### Skill 15 — Prescription-to-AC-coverage

Every § Mechanism Delta binds to one or more AC; every 'Created' entry in § Component inventory has an AC binding. Per the R57 + R61 prescription-to-AC reinforcement:

- Delta 1 (`engine/per-shard/welford.ts`) → AC-1 (initializer), AC-2 + AC-3 (update first/second sample), AC-4 + AC-5 (Welford vs naive correctness), AC-6 (numerical stability), AC-7 (insufficient-samples null), AC-8 (n−1 divisor), AC-9 (defensive copy emit), AC-10 (dimension-mismatch throw), AC-11 (immutability). Eleven ACs bind eleven semantic surfaces of the algorithm.
- Delta 2 (`test/q04-welford-stats.test.ts`) → AC-17 (test file passes 11/0).
- Delta 3a (`test/q03-warm-start-runtime.test.ts` strict-tier reset) → AC-12 (load-bearing reset binding) + closes R03 OBS-2.
- Delta 3b (`test/q03-warm-start-runtime.test.ts` immutability) → AC-13 (immutability binding) + closes R03 MINOR-5.
- Delta 3c (`test/q03-warm-start-runtime.test.ts` AC-9 clarifying comment) → no separate AC (prose disposition); referenced in carry-forward block as R03 MINOR-1 disposition record.

Every R03 MINOR/OBS disposition cited in § Mechanism traces to a specific AC OR an architect-discipline reinforcement:
- MINOR-1 → Delta 3c (in-place comment) + complementary load-bearing AC-12.
- MINOR-2 → architect-discipline reinforcement consumed (no grep-evidence ACs in R04 spec; spec authored avoiding the AC class entirely).
- MINOR-3 → architect-discipline reinforcement consumed (R04 module has ZERO inherited imports; no re-export-chain to verify, applies trivially-by-absence).
- MINOR-4 → architect-discipline reinforcement consumed (no per-file test counts pre-stated in AC-16; Implementer reports OBSERVED counts).
- MINOR-5 → AC-13 (immutability test).
- OBS-1 → no R04 surface (cosmetic warm-start.ts annotation; outside R04-SAS-2).
- OBS-2 → AC-12 (strict-tier reset test).
- OBS-3 → no R04 surface (JSDoc in warm-start.ts; outside R04-SAS-2).
- OBS-4 → no R04 surface (void _missing in q02; outside R04-SAS-18).
- OBS-5 → no R04 surface (operator/architect policy question).

Per the R59 + R64 anti-self-confirming-test reinforcement: each AC binding is checked for self-confirming risk.
- AC-1: binds shape of zero-init; not self-confirming (assertion specifies concrete values; mutation of initializer body would fail).
- AC-2 + AC-3: closed-form hand-computed targets ([5,7] mean + [[0,0],[0,0]] m2 for AC-2; [1,2] mean + [[2,4],[4,8]] m2 for AC-3); not self-confirming.
- AC-4 + AC-5: cross-check against an INDEPENDENT inline naive implementation; not fully self-confirming (a "both implementations have the same bug" failure mode is still possible but AC-3's closed-form binding catches the most common bugs independently).
- AC-6: cross-check against naive on re-centered (numerically-stable) data; not self-confirming (the naive on re-centered data is provably correct in that regime; if Welford's shifted-data result diverged, the comparison fails).
- AC-7: binds null return for n < 2; not self-confirming (mutation to return zeros or undefined would fail).
- AC-8: explicit closed-form target (82.5/9 ≈ 9.166...) AND explicit not-equal target (8.25 = 82.5/10); not self-confirming (bidirectional convention bind).
- AC-9: tests defensive copy by mutating return value and checking input unchanged; not self-confirming (a shared-reference implementation would propagate the mutation and fail the test).
- AC-10: tests three different dimension-mismatch cases; not self-confirming (a no-throw implementation would fail all three).
- AC-11: tests immutability via JSON.stringify snapshot; not self-confirming (a mutating implementation would change the serialization).
- AC-12 + AC-13: closed-form post-state targets; not self-confirming (spread-based reset / in-place mutation would fail respective assertions).
- AC-14 through AC-18: binding-command / git-history evidence; not self-confirming by construction.

Per the R64 handler-code-path-unexercised reinforcement (body-content-gap sub-variant): the Welford "body content" includes the update formula (mean + m2 recurrences). AC-3 asserts M2 directly (4 entries: [[2,4],[4,8]]) — covers the M2 update body. AC-2 asserts m2 zeros at n=1 — covers the M2-stays-zero-at-n=1 edge case. AC-5 asserts full covariance for n=20 — exercises sustained updates. The "200-empty-body-equivalent mutation" here would be `return state;` (returns input verbatim) — AC-2 + AC-3 + AC-4 + AC-5 all fail on this mutation. The "fresh-state mutation" (return `initialWelfordState(d)`) would fail AC-2 (mean=[5,7] expected). Body-content gap closed.

PASS — every prescription binds; no self-confirming or empty-body gap.

### Memorial sweep

Inherited active memorials + R03 carry-forwards + cross-project reinforcements applied:

- **Memorial D** (architectural-layer-coverage at hypothesis-tree time): brainstorm enumerated 5 candidates; 3 rejected with explicit weakness rationale (A multi-decision; B ceremonial; C PRD-conjunction-violating; D premature-interface); 1 selected (E); 1 weighed against E and rejected (D). Documented above. **Memorial D state delta:** no new violation expected at R04 close; brainstorm-discipline application is canonical, Skill 14 caught Approach C's conjunction-violation at brainstorm time (which is itself a Memorial D CONFIRMATION at the architect-grilling layer).

- **Memorial F** (4 sub-rules at brief-drafting time): applies to compile-time substrate changes. R04 modifies `test/q03-warm-start-runtime.test.ts` (R03-shipped, exercises compile-time substrate via PerShardResidual fixtures). Sub-rules 1+2+3+4 consulted:
  - File-opened: Welford module has zero inherited imports; q03 file's imports unchanged from R03 verification. PerShardResidual at config.ts:860-880 was opened at R03 spec time (cited in `Q-R03-SPEC.md` § P3.3); no new types instantiated by R04 changes.
  - Inherited type-state cited: PerShardResidual (R03-verified); no new external type instantiations.
  - Candidate-set enumeration: 5 approaches above.
  - No narrowing of stakeholder requirements: SCOPING-MEMO SLICE 2 → SLICE 2b2 narrowing is explicitly documented (§ Spec preamble + § Mechanism Spec narrowing rationale + § Anti-scope R04-SAS-1/2/3/4/5 + § Open questions OQ-5). PRD AC-P2 literal thresholds 20 + 60 preserved (R03-shipped). No silent narrowing.

- **No-skip-policy on statistical-invariant tests**: R04 adds statistical-algorithm tests (AC-4/5/6/8 numerical accuracy bounds). These are deterministic property tests on numerical accuracy — NOT Ville / martingale / e-value invariants. The no-skip policy specifically targets statistical-invariant tests (Ville bound; martingale-property; e-value-non-negativity). R04 introduces no such tests, so the policy is preserved by absence-of-violation. No `.skip` / `xfail` / `it.todo` in any R04 test.

- **R01 ARCHITECT cross-section consistency reinforcement** (from `CLAUDE-ARCHITECT.md` REINFORCED 2026-05-16): executed in dedicated § Cross-section consistency pass section of the spec, 12 resolved-decision checks all PASS. Fourth consecutive application after R02's 9 + R03's 13. The cross-section pass is now well-established standing discipline at Tessera.

- **R02 ARCHITECT type-declaration-site reinforcement** (REINFORCED 2026-05-16 from R02 OBS-3): executed in P3.3 — applied trivially-by-absence (Welford module has zero inherited type imports; operates on `number[]` / `number[][]` primitives only). The q03 test file's imports are R03-shipped and were declaration-site-verified at R03 spec time. Second post-R02-reinforcement application; first was R03 (which caught CellKey at primitives.ts:44); R04 applies-by-absence (no external types to check).

- **R02 ARCHITECT file-deletion track-state reinforcement** (REINFORCED 2026-05-16 from R02 OBS-2): R04 has no deletions. The parallel discipline (verify file existence before prescribing creation paths) was applied — `git ls-files engine/per-shard test/q04-welford-stats.test.ts` → only `engine/per-shard/warm-start.ts` matches at HEAD `2160b7e`, verified before spec emission. `engine/per-shard/` directory exists (R03-created). Documented in § Component inventory directory-creation note and § Cross-section consistency pass file-creation-track-state row.

- **R03 ARCHITECT re-export-chain-check reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-3): applied trivially-by-absence (Welford module has ZERO inherited imports). No re-export claims to verify. Documented in carry-forward block (R03 MINOR-3 disposition: architect-discipline reinforcement consumed).

- **R03 ARCHITECT grep-pattern-soundness reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-2): applied at AC-design time. R04 spec contains NO grep-evidence ACs (the class of AC vulnerable to comment-line matching is avoided entirely). One candidate AC ("no `as any` casts in q04 test file" regression guard) was drafted and dropped per this reinforcement — the factory-based test-writing discipline from R03 self-enforces. Documented in carry-forward block (R03 MINOR-2 disposition: architect-discipline reinforcement consumed).

- **R03 ARCHITECT empirically-verified-test-count reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-4): applied at AC-design time. R04 AC-16 ("all R01 + R02 + R03 tests still pass") explicitly states "Implementer reports OBSERVED output; do NOT pre-state counts" and provides the pre-R04 baseline (3+1+5+6+11+5 = 31 at HEAD `2160b7e`, per R03 Reviewer-verified at HEAD `e698c20`, no code changes since) as INFORMATIONAL, not AC-bound. Documented in carry-forward block (R03 MINOR-4 disposition: architect-discipline reinforcement consumed).

### Compilation-dependency enumeration (R01 MAJOR-3 lesson — applied this round)

Per R01 MAJOR-3 the Architect must enumerate compilation dependencies before declaring anti-scope on a target file. R04 creates `engine/per-shard/welford.ts` + `test/q04-welford-stats.test.ts`. Compilation dependencies enumerated:

- `engine/per-shard/welford.ts` imports: NONE (zero external imports; module operates on `number[]` / `number[][]` primitives only). No transitive compile-time concerns introduced.
- `test/q04-welford-stats.test.ts` imports: `WelfordState`, `initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance` from `../engine/per-shard/welford` (five identifiers from one Tessera-original module). PLUS `node:test` and `node:assert/strict` (Node standard library; same as all other test files). No engine internals consumed; no factory imports (Welford operates on raw arrays).
- `test/q03-warm-start-runtime.test.ts` Delta 3 changes: NO new imports (the new tests use the existing `observeSample` + `initialPerShardResidual` + `makePerShardResidual` imports from R03).

No new dependencies on inherited vendored detector code, vendored l0 / o0 modules, or any external package. No anti-scope-vs-compilation-deps tension at R04. PASS.

### MEMORIAL.md attestation discipline

Per the R49 + R61 reinforcement "MEMORIAL.md is not an attestation artifact — tactical deviations must be in NEXT-ROLE.md." R04 spec does not pre-write Implementer MEMORIAL entries; those are emitted at IMPLEMENTER coordination time. The post-R04 MEMORIAL accretion is the MEMORIAL-UPDATER's responsibility.

### TDD discipline (per R57/R59/R62 reinforcements)

R04 prescribes two-commit TDD ordering (§ Per-file pseudocode Implementer note 4 + AC-14). The commit boundary is explicit:
- Commit 1 (RED): test/q04-welford-stats.test.ts (welford.ts doesn't exist; test imports fail with TS2307).
- Commit 2 (GREEN): engine/per-shard/welford.ts + test/q03-warm-start-runtime.test.ts Delta 3 updates (all imports resolve; all assertions pass; q03 has new AC-12 + AC-13 + clarifying comment).

This matches the R03 successful pattern. The bundling concern (R55 + R59 + R62 test-modification-bundling 8-occurrence pattern) is anticipated: q03 Delta 3 changes are bundled into GREEN because the new q03 tests (AC-12 + AC-13) depend on R03-shipped observeSample (not on R04 production code); they pass before AND after the GREEN commit. The "schema-before-RED" R62 reinforcement applies-by-absence (R04 has no schema change). Bundling matches R03's "q01/q02 updates in GREEN" precedent (R03 q01/q02 closures were similarly bundled into GREEN because they exercised the new R03 factory module).

### Anti-self-confirming-test (per R57/R59/R64 reinforcements)

Each AC's anti-self-confirming-mutation analysis is recorded in the Skill 15 prescription-to-AC-coverage section above. Summary: 11 ACs against new code, all non-self-confirming (closed-form targets for AC-1/2/3/7/8/9/10/11; cross-check + closed-form combination for AC-4/5; absolute-bound + reference-comparison for AC-6); 2 ACs against R03 code closures, both non-self-confirming (AC-12 closed-form post-state; AC-13 JSON-snapshot equality). The strongest bindings are AC-3 (multi-axis closed-form on mean + m2) and AC-8 (bidirectional convention bind: equals n−1-divisor target AND not-equals n-divisor target).

---

## Architect pre-predictions on outcomes

Each prediction is committed before the round runs so the post-round Memorial Updater can grade prediction accuracy.

1. **AC outcome:** All 18 ACs PASS at first IMPLEMENTER pass (no fix-cycle required). The algorithm is mechanical and bounded; pure-function form makes test assertions deterministic; the hand-traceable cases (AC-3 closed-form M2; AC-8 explicit 82.5/9 numeric) verify both formula correctness and convention. The most likely failure surface is the M2 update formula (Implementer note 2 cautions against the two common wrong simplifications); if wrong, AC-3 catches in <30 seconds via tsc + node --test.

2. **Halt conditions:** zero — schema unchanged from R02/R03; pseudocode is line-by-line for the M2 update (the only non-trivial algorithmic surface); Implementer notes are mandatory with verification commands; numerical-stability fixture (AC-6) is concrete with absolute bounds. The most likely surprise (Implementer note 5: hand-trace verification on samples [0,0]+[2,0]+[0,2] yields M2 [[8/3,−4/3],[−4/3,8/3]]) is architect-pre-predicted as "Implementer should run this hand-trace before committing GREEN" — explicit anti-shortcut guidance.

3. **TDD ordering:** verifiable via two-commit sequence (RED commit = test/q04-welford-stats.test.ts; GREEN commit = engine/per-shard/welford.ts + test/q03-warm-start-runtime.test.ts Delta 3 updates). 3rd consecutive Reviewer-side TDD verification opportunity for Tessera (R02 = 1st; R03 = 2nd; R04 = 3rd — establishes the pattern as standing discipline).

4. **Implementer Q-cycle:** ~3-4 hours total (per Q-cycle estimate above). Comfortably under the 2-day budget; on par with R02/R03 actuals.

5. **Reviewer findings:** ≤3 MINOR + 0 MAJOR + 0 CRITICAL expected. The Welford module is small + textbook; findings will likely be hygiene-class (e.g., JSDoc references to West 1979 should cite a more specific section; `welfordCovariance` returning `null` should perhaps return `undefined` for TypeScript-idiom alignment; the q04 inline naive helpers should perhaps be extracted to `test/_substrate/`). Substrate is sound; findings will not block merge.

6. **Memorial state delta:** No new Memorial D violations expected. Three CONFIRMATIONs expected: (a) fourth consecutive cross-section-consistency-pass application; (b) third successful "narrow architectural-layer scope" round (R02/R03/R04 streak); (c) Skill 14 PRD-conjunction-cross-check catching Approach C's "preserves inherited single-instance behavior" violation at brainstorm time. One CONFIRMATION expected for Memorial F compile-time-substrate-change sub-rule application (q03 fixture additions).

7. **Session-crash risk:** low. Per-role CLAUDE.md split active; spec is right-sized at 3 file surfaces (1 production created + 1 test created + 1 test modified); pseudocode is concrete; the only algorithmic complexity (Welford M2 update) is line-by-line in pseudocode with hand-traceable verification. Defense-in-depth via narrow architectural-layer scope is the load-bearing mitigation. Same risk-class as R02 and R03 (neither crashed).

8. **Bundled MINOR closure success:** all three R03 q03-surface findings (MINOR-1 + MINOR-5 + OBS-2) close at R04. AC-12 + AC-13 + Delta 3c make this Implementer-attestable and Reviewer-verifiable mechanically. The bundling pattern (R03 q03-surface findings into R04 algorithm-adjacent work) demonstrates the discipline pays off across rounds; expect Memorial-Updater confirmation.

9. **R03 MINOR-2/3/4 architect-discipline consumption validation:** the R03 MINOR-2 (grep-pattern-soundness) and MINOR-3 (re-export-chain-check) and MINOR-4 (empirically-verified-counts) reinforcements were applied at R04 spec-authoring time without producing test surface. R04 Reviewer will independently verify that no grep-evidence ACs exist in R04 spec; that the Welford module has zero inherited imports (no re-export chain to verify); that AC-16 does not pre-state per-file counts. If all three Reviewer checks PASS, the reinforcements have compounded positively (architect spec quality improving round-over-round).

10. **R05 architectural decision space:** R04 explicitly defers the accumulator-strategy decision (a/b/c) and the sparse-encoding enforcement decision (discriminated-union vs runtime-invariant assertion). R05 architect will pick both. Architect-pre-prediction for R05: accumulator-strategy (a) `_accumulator?: WelfordState` schema extension; sparse-encoding enforcement (b) runtime-invariant assertion at the orchestration boundary. Confidence: MEDIUM for accumulator; MEDIUM for enforcement; both are R05 architect's calls and may differ from the prediction.

11. **Tessera-original-engine-code pattern reinforcement:** R03 established `engine/per-shard/` as the canonical directory for Tessera-original engine code. R04 adds the second module to the directory (`welford.ts` sibling to `warm-start.ts`). The pattern is now mature; R05+ will extend (likely with `per-shard-runtime.ts` or `accumulator.ts`). The "Tessera-original under engine/per-shard/" convention is the established naming pattern.

---

## Decision rationale (per resolved decision)

### D1 — Algorithm choice: Welford vs. naive two-pass vs. Kahan-summed vs. parallel pairwise

**Picked:** Welford's online algorithm (single-pass; mean + M2 recurrence; sample covariance via M2 / (n − 1)).

**Why Welford picked:** Standard online-statistics algorithm (Welford 1962; multivariate via West 1979); preferred over naive two-pass when sample magnitudes are large relative to inter-sample variance (SCOPING-MEMO § 4.1 R-S2 regime: fleet-scale shard residuals where absolute magnitudes may shift). Numerical stability is the load-bearing property — without it, strict-tier covariance estimates degrade under magnitude shifts, which would cascade into false-positive alerts at the inherited DeploySignal detector layer (Family C MMD via `engine/detectors/family-c-rff.ts` consumes covariance). Single-pass is also a requirement (R05 integration will call updateWelford per-sample; we cannot afford a two-pass over a buffer at runtime).

**Why naive two-pass rejected:** Sum-of-squares minus square-of-sum suffers catastrophic cancellation for samples around 1e8 with O(1) noise (the regime AC-6 explicitly tests). Welford's per-sample recurrence avoids this entirely. Naive's appeal is simplicity, but the simplicity isn't compelling enough to risk the numerical regression.

**Why Kahan-summed naive rejected:** Kahan summation patches naive's accumulation precision but doesn't address the squared-deviation cancellation. Adds complexity without solving the core problem.

**Why parallel pairwise rejected:** Parallel pairwise Welford (Chan-Golub-LeVeque) is the parallelizable extension for fleet-pooling — but R04 ships single-shard Welford; parallel merge is R04-SAS-13 (Phase 1 SLICE 3 fleet-pooling scope). The single-shard Welford is the right primitive at R04.

### D2 — Sample covariance convention (n − 1 divisor) vs. population (n divisor)

**Picked:** Sample covariance with `M2 / (n − 1)` divisor for n ≥ 2; null for n < 2.

**Why sample covariance picked:** Standard frequentist hypothesis-testing convention. Matches the inherited DeploySignal detectors' covariance use (Family C MMD per-cell covariance under sample-cov convention per engine/detectors/family-c-rff.ts vendored code). The "single-instance behavior preserved" PRD AC-P2 conjunct constrains R04 to match the inherited convention.

**Why population covariance rejected:** Population covariance (n divisor) is appropriate when the full population is observed; for finite-sample inference, n−1 unbiased estimator is the standard. AC-8 explicitly verifies n−1 AND explicitly NOT-equals n to bind the convention bidirectionally.

**Why "configurable divisor" rejected:** YAGNI; one convention chosen and bound. If a future use case needed population covariance, an explicit `welfordCovariancePopulation` function could be added cheaply.

### D3 — WelfordState as module-local interface vs. PerShardResidual integration

**Picked:** Module-local `WelfordState` interface; NOT integrated with PerShardResidual at R04.

**Why module-local picked:** Decouples algorithm-design from integration-design. The accumulator-strategy decision (a/b/c per R03 sidecar) has structural costs that warrant its own deliberate round (R05). Coupling Welford to PerShardResidual at R04 would force a premature commitment to one of the three options without architect-grilling on the integration decision.

**Why integration-at-R04 rejected:** Approach A above; multi-decision dilution + risk of conflating algorithm-bugs with integration-bugs during Implementer work.

**Why "abstract base interface that PerShardResidual could implement" rejected:** Over-engineered; YAGNI. The R05 architect picks integration shape; R04 doesn't pre-shape it.

### D4 — Module location: `engine/per-shard/welford.ts` vs. alternatives

**Picked:** `engine/per-shard/welford.ts` (sibling to warm-start.ts under the R03-established `engine/per-shard/` directory).

**Why `engine/per-shard/welford.ts` picked:** Mirrors R03's Tessera-original-engine-code convention (`engine/per-shard/` is the canonical home; warm-start.ts is the first sibling; welford.ts is the second). Extracts cleanly to the npm package at Phase 2 close.

**Why `engine/statistics/welford.ts` rejected:** Would create a new top-level directory for one file. R03 established `engine/per-shard/` as the convention; departing would split Tessera-original code across two directories without architectural benefit.

**Why `engine/welford.ts` rejected:** Top-level engine modules are reserved for inherited Q70-style orchestration (engine/core.ts, engine/topology-overlay.ts, etc.); a new top-level for Tessera-original work would violate the inherited convention.

**Why filename `welford.ts` vs `residual-stats.ts` vs `online-stats.ts`:** Welford-specific name is honest about the algorithm choice; if a future round swaps to a different algorithm, the filename should change too (which is correct — the change would be a deliberate architectural choice, not an invisible swap). Generic names (`residual-stats.ts`, `online-stats.ts`) advertise broader scope than the file delivers.

### D5 — Function naming convention: `updateWelford` vs `welford.update`

**Picked:** Top-level function exports with `updateWelford` / `initialWelfordState` / `welfordMean` / `welfordCovariance` (verb-noun for actions; noun for queries).

**Why top-level functions picked:** Matches R03's `observeSample` + `initialPerShardResidual` convention (no namespace object; tree-shakeable named exports; consumers import only what they use). Standard TypeScript pattern.

**Why namespace object `welford.update(...)` rejected:** Adds an import-time aliasing surface (consumers would write `import * as welford from '...';`) without binding-strength benefit. Tree-shaking is less reliable with namespace re-exports.

**Why "Welford" capitalization in function names:** `Welford` is a proper noun (mathematician's surname); standard programming convention is PascalCase for type names + camelCase for function names with embedded proper nouns capitalized (`welfordMean`, `welfordCovariance`, `initialWelfordState`). Matches the convention used by libraries like NumPy (`np.welford` would be lowercased; class names like `WelfordRunner` capitalize). The interface `WelfordState` uses PascalCase per TypeScript type convention.

### D6 — Emit accessor returns: defensive copy vs. shared reference

**Picked:** `welfordMean` returns a shallow copy (spread); `welfordCovariance` returns a deep copy (new arrays); `null` for insufficient samples.

**Why defensive copy picked:** Prevents external mutation of WelfordState's internal arrays (which would corrupt subsequent `updateWelford` calls in a way that's hard to debug). AC-9 explicitly tests the defensive-copy property for `welfordMean` (mutating returned array; checking state unchanged).

**Why shared-reference return rejected:** Optimization-leaning but bug-prone. A caller writing `const m = welfordMean(state); m[0] = 99;` would silently corrupt state for the next updateWelford call. Defensive copy is the safer default.

**Why "freeze the returned arrays via Object.freeze" rejected:** Adds runtime overhead; defensive copy already achieves the safety goal; the freezing approach would prevent legitimate caller mutation (a caller wanting to compute `mean - baseline` may want to mutate the returned array in place to save allocations — defensive copy permits this; freezing would force always-allocate).

### D7 — Dimension-mismatch error semantics: throw vs. silent NaN vs. return null

**Picked:** Throw Error with descriptive message; AC-10 binds for `updateWelford`; spec mentions for `initialWelfordState(d < 1)` (not AC-bound; corner case).

**Why throw picked:** Loud failure; deterministic. Dimension-mismatch is a programmer error (not a runtime data condition); throwing immediately surfaces the bug at the call site rather than propagating NaN through downstream consumers.

**Why silent NaN propagation rejected:** Subtle bug surface; corrupts downstream statistics silently. Standard "garbage in, garbage out" anti-pattern.

**Why "return null on mismatch" rejected:** Forces every caller to null-check the return of updateWelford, polluting consumer code. Throwing is the standard JavaScript/TypeScript pattern for invariant violations.

### D8 — Naive reference for tests: inline vs. extracted to test/_substrate/

**Picked:** Inline in `test/q04-welford-stats.test.ts` (top-of-file helpers).

**Why inline picked:** Naive helpers are q04-specific; their purpose is right-reasons-audit defense (Welford's correctness cross-checked against an independent implementation). Extracting them to `test/_substrate/factories.ts` (which is meant for schema-instance factories, not algorithm-references) would pollute the substrate module's scope. A dedicated `test/_substrate/naive-stats.ts` would create a new submodule for one consumer — YAGNI.

**Why module-level export (from engine/per-shard/welford.ts) rejected:** Production module should expose only the Welford API; advertising the naive implementation would (a) imply we recommend it (we don't), (b) increase API surface for zero benefit. OQ-3 documents this disposition explicitly.

### D9 — q03 clarifying comment: in-place prose vs. JSDoc on test function

**Picked:** Multi-line prose comment above the AC-9 test (in-place; not as JSDoc).

**Why prose comment picked:** Documents the rationale for the defensive-but-vacuous assertions in a place a reader encounters when reading the test. JSDoc on the test function would be inappropriate (test names are descriptive; JSDoc on `test(...)` calls is unidiomatic).

**Why "delete the vacuous assertions" rejected:** Would weaken the test signature (removing assertions is a Reviewer-flag-able regression). The assertions are correct; documenting their defensive-but-vacuous nature preserves them with explanation.

**Why "split AC-9 into two tests, one per assertion class" rejected:** Over-engineered for the closure; the in-place comment + complementary AC-12 (strict-tier) closure is the discipline-clean path.

---

## Amendments from prior version

v0.1 — initial R04 spec emit, 2026-05-16. No prior version.
