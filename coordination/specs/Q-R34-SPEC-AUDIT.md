# Q-R34-SPEC-AUDIT — Architect audit sidecar (decision rationale + P3 ten-axis + brainstorm)

**Round:** R34 (Wave 4, single cluster, full tier; main worktree).
**Architect:** Claude (Opus 4.7).
**Companion:** `Q-R34-SPEC.md` (the spec proper; Implementer reads only that).
**Audience:** Reviewer (reads both files) + future close-walk auditors. Not consumed by Implementer.

---

## 1. Superpowers Brainstorm — full audit

### 1.1 Approaches enumerated (5)

**Approach A — Wrapper-only.** New `engine/events/freeze-hook.ts` (Tessera-original); no `engine/types/config.ts` Delta 5.
- *Strengths*: minimal blast radius; cleanest A12 strict preservation; no two-step manifest/AT_PIN_FILES maintenance overhead; wrapper is pure-function testable in isolation.
- *Weaknesses*: misses the SCOPING-MEMO § 1.7 narrative ("Phase 1 ships with `freeze_hook_enabled: false`; Phase 2 activation promotes to `enabled: true`"); the inherited Phase 1 substrate has no touchpoint for the activation flag.
- *Hidden assumption*: `updatePerShardResidual` has no inherited engine callers (verified empirically — see § 0.2 of spec).
- *Risk*: WU-07 Phase 2 close-walk ADR cannot stamp the activation transition because no inherited substrate field tracks the flag state.

**Approach B — Vendored-with-deltas on `engine/per-shard/runtime.ts`.** Modify `updatePerShardResidual` body to add a freeze branch.
- *Strengths*: complete integration at the call-site (no caller can bypass); matches OQ-W3-2 default A literally.
- *Weaknesses*: **premise invalid** — `runtime.ts` is Tessera-original (no `VENDORED FROM` header; not on VENDORING-MANIFEST.md). Vendored-with-deltas does not apply to Tessera-original files; there are no inherited "deltas" to track. The vendored-with-deltas pattern is an inherited-file framework.
- *Hidden assumption*: runtime.ts is vendored-at-pin (FALSE — empirically refuted).
- *Risk*: applying vendored-with-deltas semantics to a Tessera-original file creates a manifest entry with no inherited source, polluting the manifest's semantic.

**Approach C — Config-only vendored-with-deltas.** Add `freeze_hook_enabled?: boolean` to `engine/types/config.ts` (Delta 5); no execution surface.
- *Strengths*: minimal vendored-with-deltas delta; preserves SCOPING-MEMO § 1.7 narrative.
- *Weaknesses*: pure plumbing; the freeze logic still has to live somewhere; flag with no consumer is decorative.
- *Hidden assumption*: callers will eventually consume the flag (deferred indefinitely; weak architectural claim).
- *Risk*: shipping a flag with no consumer is the "feature flag without feature" anti-pattern.

**Approach D — Combined: wrapper + config-flag (PICKED).** NEW `engine/events/freeze-hook.ts` + `engine/types/config.ts` Delta 5.
- *Strengths*: wrapper provides freeze execution at the call-site boundary; config flag is the inherited-substrate touchpoint for Phase 1+2 activation semantics. Matches SCOPING-MEMO § 1.7 + § 2.4 narrative. Two-step maintenance on config.ts is established (R18/R20 precedent); AT_PIN_FILES already excludes config.ts (vendored-with-deltas since R01).
- *Weaknesses*: touches 2 files instead of 1; AC count slightly higher (3 wrapper-branch ACs + 1 config-field AC = 4 vs Approach A's 3).
- *Hidden assumption*: same as A — `updatePerShardResidual` has no inherited engine callers (verified).
- *Risk*: minimal; established R18+R20+R32 vendored-with-deltas precedent for config.ts; AC density manageable within target 18-24.

**Approach E — Defer Surface 3 to Phase 3+.** Drop freeze-hook from R34; ship S1+S2+S4 only.
- *Strengths*: lowest blast radius; cleanest scope-bounding.
- *Weaknesses*: violates round directive (scope block § 4 architectural surfaces; WAVE-GATE-03 explicit mandate). This is a halt-scope-reduce decision, not Architect spec-time discretion.
- *Hidden assumption*: operator authority permits dropping mandated surfaces (FALSE — overnight authority is "extended through Phase 2 close"; not "drop freeze-hook").
- *Risk*: would require Coordinator-driven WAVE-PLAN-v4 emission; multi-round cost.

### 1.2 PRD/spec constraints that eliminate options

- **Constraint: scope block § 4 architectural surfaces mandates Surface 3.** Eliminates E.
- **Constraint: `engine/per-shard/runtime.ts` is Tessera-original (manifest § 41 + file header).** Eliminates B's premise.
- **Constraint: SCOPING-MEMO § 1.7 + § 2.4 narrative requires inherited-substrate touchpoint for the `freeze_hook_enabled` activation flag.** Eliminates A (no flag) and C (no consumer); D satisfies both surfaces.
- **Constraint: target AC count 18-24.** All non-eliminated approaches (A, C, D) fit within target; D produces 21 (within), A produces 18 (within), C produces 17 (just under). All viable.

### 1.3 Selection rationale

**Selected: D (combined wrapper + config-flag).**

Why over A: D's config flag provides the inherited-substrate touchpoint that A lacks. SCOPING-MEMO § 1.7 narrative is load-bearing for WU-07 Phase 2 close-walk ADR ("activates Phase 1 freeze-hook coupling" per SCOPING-MEMO § 3 Phase 2 close-walk row). Without the flag, WU-07 cannot stamp the activation transition.

Why over C: D adds execution surface (wrapper) that C lacks. A flag with no consumer is decorative; D's wrapper consumes the flag.

Why over B: B's premise is empirically invalid. D achieves B's architectural intent (freeze branch on the per-shard update path) via wrapper, which is sound for the current call surface (verified zero inherited callers).

Why over E: E is a scope-reduction outside Architect authority.

### 1.4 What was rejected and why (audit-trail completeness)

- **Wrapper-only A**: rejected because the inherited substrate needs a flag touchpoint per SCOPING-MEMO narrative; WU-07 ADR depends on it.
- **Body-modification B**: rejected because the target file is Tessera-original (premise invalidity).
- **Config-only C**: rejected because flag-without-consumer is decorative.
- **Drop-Surface-3 E**: rejected because the round directive mandates Surface 3.

## 2. Superpowers Design — full audit

### 2.1 Component boundaries

| Boundary | Side | Contract |
|---|---|---|
| Event-feed substrate / consumer | Tessera-original NEW | `EventFeed.fetchSince(ts) → readonly ClusterEvent[]` |
| Event-conditional attribution / consumer | Tessera-original NEW | `attributeEventConditional(input) → result` pure function |
| Wrapper / inherited per-shard runtime | Tessera-original NEW | `freezeAwareUpdatePerShardResidual(...)` decorates `updatePerShardResidual(...)` |
| Config / inherited compiled-config surface | Vendored-with-deltas Delta 5 | `CompiledConfig.freeze_hook_enabled?: boolean` |
| PR-F7 evidence package / test consumer | NEW | Markdown with structured citation blocks; consumed by AC-R34-17 test |

### 2.2 Integration points + PRD verification

| # | Integration | Verified vs PRD | Failure mode at boundary |
|---|---|---|---|
| 1 | `ClusterEvent.event_id` → `EventConditionalCandidate.cluster_event_id` (identity threading) | PRD FR-E3c + R20 `VerdictGroup.cluster_event_id?` (line 218 of verdict.ts) — same string scope | F1 in spec § 1.3 (typo silently drops attribution) |
| 2 | `EventConditionalCandidate.correlational_not_causal: true` literal at wire boundary | PRD FR-E3c + Addition #26 D4 (engine/types/verdict.ts:287-289) — must preserve | F7 in spec § 1.3 (three-way binding: type + JSON + two-sided absence) |
| 3 | `freezeAwareUpdatePerShardResidual` wraps `updatePerShardResidual` (engine/per-shard/runtime.ts:82) | PRD § 1.7 + § 2.4 circular-coupling — flag-gated execution surface | F9-F12 in spec § 1.3 (branch-binding coverage) |
| 4 | `CompiledConfig.freeze_hook_enabled?: boolean` Delta 5 on inherited config | SCOPING-MEMO § 1.7 narrative; R18+R20 vendored-with-deltas pattern | F13 in spec § 1.3 |
| 5 | PR-F7 evidence package — 3 citations × URL + date + verbatim quote | SCOPING-MEMO § 4.4 PR-F7 trigger + WU-04→WU-06 handoff § External literature | F21 in spec § 1.3; halt condition #3 if URL dead at chore-A SHA |

### 2.3 Component inventory pre-pseudocode

Identical to spec § 2.1 / 2.2 / 2.3 / 2.4. See spec.

### 2.4 Failure-mode catalog

See spec § 1.3 (F1-F21 + A21 acknowledged gap). Cold-Reviewer audit-trail discipline: each failure mode mapped to a binding AC OR explicit non-load-bearing rationale (none required).

## 3. Architect pre-predictions (for Reviewer cold-audit verification at GREEN)

| # | Prediction | Rationale | Falsified by |
|---|---|---|---|
| 1 | All 21 R34 ACs PASS at chore-B SHA | Spec pseudocode is exhaustive at the algorithm + emit-site layer; Implementer faithful execution should produce literal-binding-match. | Any AC RED at chore-B; would indicate a spec gap OR Implementer judgment-call divergence. |
| 2 | `tsc` exits 0 at chore-B | Baseline tsc exits 0 at `e7547a0`; new code in `engine/events/*` does not import any unstable / dynamic-property type; literal-typed `correlational_not_causal: true` field is TS-supported. | `tsc` exit non-zero. Would indicate a type-system issue (e.g., import path; circular dep). Halt condition #4 (false-compliance-attestation) fires; Implementer must surface verbatim per Rule 1. |
| 3 | Anti-scope diff is clean (AC-R34-19 PASS) at chore-B HEAD | ALLOWED_SET enumeration in § 5 is exhaustive vs the Implementer's expected modification set; regex carve-outs cover Reviewer + MEMORIAL + DIAGNOSTIC. | Anti-scope violation. Would indicate scope-creep OR Memorial-Updater CLAUDE-*.md append (acknowledged in § 9.9). |
| 4 | R26 MINOR-2 carries forward to WU-07 | WU-06 ships no FusedVerdict → FiredShardEvent adapter site per § 0.6; the deferral is conditional on that adapter shipping (it does not). | If R34 implementation accidentally introduces the adapter, MINOR-2 closes opportunistically. Architect predicts NO. |
| 5 | Implementer halt count: 0 | Spec is exhaustive at the algorithm + emit-site layer; halt conditions § 7 cover the surfaces where Architect judgment is preferable to Implementer judgment; expectation is faithful execution. | Halt fires. Would indicate spec gap; Architect-attributable. |
| 6 | Reviewer findings: 0 CRITICAL / 0 MAJOR / 0-2 MINOR / 0-5 OBS | R34 is a substantively novel architectural cluster but the cold-Reviewer surfaces caught by R32 (structural-doc-integrity + rule-derivation-without-self-application) are pre-empted by § 0.2 empirical-premise correction + § 9.5 Rule 5 sweep at spec-emit time. | Any CRITICAL OR ≥1 MAJOR. Would indicate a load-bearing audit surface the Architect's pre-emit grilling missed. |
| 7 | PR-F7 Cell 4 confounding-discrimination correctly excludes unrelated post-window shards | Spec § 1.1 Surface 2 step 4 enforces the discriminator at the candidate-construction layer; AC-R34-7 verifies via deepStrictEqual on member_shard_ids. | Cell 4 AC RED OR Reviewer-flagged structural false-positive. Halt condition #5 fires. |

## 4. P3 ten-axis verification

Per CLAUDE-ARCHITECT.md Architect role + Anchor `templates/Q-NN-SPEC-TEMPLATE.md` P3 axis convention (correctness | completeness | consistency | clarity | coverage | constraints | concurrency | corner cases | cost | coupling). One sentence per axis.

| # | Axis | Verification |
|---|---|---|
| 1 | **Correctness** | The ITS pre/post window comparison primitive is mathematically sound: pre-window count vs post-window correlated count is a standard interrupted-time-series elevation statistic; the spec'ies non-overlap (pre ends at event_ts; post starts at event_ts) eliminates double-counting; correlation_window_seconds discriminator separates event-correlated from latent-fault-revealed shards per SCOPING-MEMO § 4.2 R-S5 explicit hazard. |
| 2 | **Completeness** | All 4 PR-F7 cells have Reviewer-verified ACs (AC-R34-4..7; per R32 MINOR-4 reinforcement — avoid the Cell 4 gap class); A16 wire-format invariant has three-way binding (type-decl regex + JSON round-trip + two-sided absence; AC-R34-10..12); wrapper has all 3 branch-binding ACs (FREEZE / flag-false / state-inactive; AC-R34-13..15); Delta 5 has type-shape AC (AC-R34-16) + manifest sync AC (AC-R34-18); evidence package has citation-shape AC (AC-R34-17). |
| 3 | **Consistency** | Cross-section identifier check in § 9.6 of spec passed for all 8 load-bearing identifiers; default constant values (300/300/60/2/1) are consistent across § 1.1 / § 3.2 / § 4. OQ-W3-2 refinement rationale documented at § 0.2 + § 0.3; no silent narrowing of scope-block defaults. |
| 4 | **Clarity** | Every AC's Then-clause names a verifiable property at a specific assertion shape (strictEqual / deepStrictEqual / regex.test / two-sided present-AND-absent); no ambiguous language ("appropriately", "as needed") used. The 6 halt conditions § 7 are bounded and each specifies the DIAGNOSTIC option space. |
| 5 | **Coverage** | F-table § 1.3 enumerates 21 failure modes mapped 1:1 to ACs; A21 (interval-shaped event handling) explicitly acknowledged as non-load-bearing per Phase 3+ forward-extensibility. Branch-binding coverage (Rule 2) verified inline; Rule 5 self-application sweep at § 9.5 verified all 21 ACs use strong-binding patterns. |
| 6 | **Constraints** | A10/A11/A12/A13/A16/A17 anti-scope clauses enumerated at § 5.2 with explicit per-file READ-ONLY enumeration at § 2.4. A16 (HIGHEST RELEVANCE) bound three ways at AC layer. Vendored-with-deltas two-step maintenance UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern; AT_PIN_FILES exclusion verified; manifest update enumerated in § 3.5. |
| 7 | **Concurrency** | All R34 surfaces are pure-function (no shared mutable state); SyntheticEventFeed is constructor-frozen (copy-on-construct); attributeEventConditional is pure; freezeAwareUpdatePerShardResidual is pure (composed of pure inputs). No concurrent-write surfaces in R34 scope. |
| 8 | **Corner cases** | Empty event-feed → empty candidates (AC-R34-9); singleton post-window fire → no candidate (AC-R34-6); event with no correlated fires → no candidate (AC-R34-5); event with mixed correlated/unrelated → only correlated subset surfaces (AC-R34-7); freeze flag absent (undefined) → equivalent to false (covered by AC-R34-14 strict-false path; absent treated same as explicit-false). |
| 9 | **Cost** | LOC estimate ~1250 (engine/events 380 + tests 600 + substrate 150 + evidence 120). AC count 21 within target 18-24. No CRITICAL-class blast-radius surfaces (engine/topology-overlay.ts BFS body and engine/types/verdict.ts both READ-ONLY); R32 0-CRITICAL streak (32 rounds) preservation expected. |
| 10 | **Coupling** | Surface 1 (event-feed) and Surface 2 (attribution) coupled via `ClusterEvent` shape contract; Surface 3 (wrapper) and Surface 2 NOT coupled at R34 (production callers are TAGGED-FUTURE; both surfaces operate independently); Surface 4 (PR-F7 evidence) loosely coupled to Surface 2 via the 4-cell scenario builders in v9Z substrate. WU-04 D1 HIGH inbound edge: R34 imports `FiredShardEvent` type from `engine/topology/common-mode-attribution.ts` — single import, read-only consumer. WU-00 / WU-01-03 D2 MEDIUM inbound edges: interface-only references (event-feed schema may evolve to consume L0 contract metadata in Phase 3+; not required at R34). |

## 5. Brainstorm decision audit (for future close-walk)

R34's brainstorm rejected Approach B not on tradeoff grounds but on **empirical premise invalidity** (the target file is Tessera-original, not vendored-at-pin). This is a different brainstorm-rejection class than the "weaker tradeoff" rejections in WU-04 / WU-00 etc. Future close-walks should note: rejecting an approach on premise-invalidity grounds is stronger than rejecting on tradeoff grounds, and warrants a "Brainstorm re-evaluation" subsection if a later fix-cycle considers re-selecting the rejected approach (per CLAUDE-ARCHITECT.md § Fix-cycle considerations).

R34's OQ-W3-2 refinement (default A → D combined) is a **partial-override** of the Coordinator default — neither pure acceptance nor pure rejection. The refinement is documented at § 0.1 + § 0.2 + § 0.3 of the spec. Future close-walks should treat this as a precedent for "default + empirical-correction → refined approach" rather than "default-override-without-rationale" (the latter would be a methodology violation per CLAUDE-ARCHITECT.md spec-emit discipline).

## 6. Pre-emit self-grilling summary

The 9 grilling-sweep sections at spec § 9.1-9.9 produced these flags surfaced inline:

- § 9.2 unstated assumption (a) baseline carry-forward depends on chore-A SHA being downstream of `e7547a0` — mitigated by § 0.5 explicit verification + halt condition #4.
- § 9.9 caveat — Memorial-Updater CLAUDE-*.md REINFORCED append is OUT-OF-SCOPE at R34; explicit anti-scope per § 5.2 hard limit "NO modification of CLAUDE-IMPLEMENTER.md (operator-triggered MR-2 staged)". This places a routing constraint on the Memorial-Updater that did NOT apply at R32 (where CLAUDE-IMPLEMENTER.md grew 47→51 lines).

Both flags are documented inline at spec level; cold-Reviewer audit can verify.

## 7. Architect post-emit checklist

- [x] Spec passes Brainstorm → Design → spec-write → Review → grilling cycle in this session.
- [x] All 5 cross-project rules applied UPFRONT (Rule 1 via § 0.5 + AC-R34-20; Rule 2 via § 1.3 F-table; Rule 3 via § 4 strong-binding ACs; Rule 4 via § 5 ALLOWED_SET + regex; Rule 5 via § 9.5 grep + mutation sweep at spec-emit time).
- [x] Architect pre-predictions recorded (§ 3) for Reviewer cold-audit.
- [x] Brainstorm enumeration complete (5 approaches; selection rationale; what was rejected and why).
- [x] Premise-correction documented at § 0.2 (empirical method recorded; no silent absorption).
- [x] OQ refinement rationale documented at § 0.1 + § 0.3 (D over default A).
- [x] Component inventory cross-referenced with .gitignore awareness per R23 MINOR-2 (§ 2.5).
- [x] Forward-coverage ALLOWED_SET regex carve-outs include REVIEWER-REPORT-R34 + MEMORIAL.md + DIAGNOSTIC-R34 + ROUND-R34-SUMMARY per Rule 4 + R25 MAJOR-2 + R29 MINOR-2.
- [x] Cross-section consistency pass run at § 9.6 (no identifier drift).
- [x] Spec-internal-contradiction sweep at § 9.8 (no conflicting prescriptions).

## 8. Audit-trail discipline note

Per CLAUDE-ARCHITECT.md role boundary: the audit content (decision rationale + P3 + pre-predictions + brainstorm enumeration) is in this sidecar; the spec proper (Q-R34-SPEC.md) is Implementer-only at routing. Reviewer reads both files per CLAUDE-COMMON.md § Audit trail.

The pre-emit grilling output (spec § 9) is duplicated in form with this audit's § 4 P3 + § 6 self-grilling summary — by design: the spec proper records the grilling output INLINE (per CLAUDE-ARCHITECT.md role block step 5), and the audit records the cross-axis verification + pre-predictions that the Reviewer cold-audits against GREEN.

---

_End of Q-R34-SPEC-AUDIT.md. Companion to Q-R34-SPEC.md._
