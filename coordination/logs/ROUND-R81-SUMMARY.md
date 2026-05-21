# ROUND-R81-SUMMARY.md — SLICE 2 close (scrubber UI + animation polish + DEMO-SCRIPT.md)

**Round:** R81  
**Tier:** full  
**Status:** ROUND-COMPLETE  
**Round-start SHA:** `0eb371f`  
**Implementer chore-A SHA:** `2b8c778`  
**Reviewer HEAD:** `438a218`  
**Reviewer verdict:** MERGE-READY (0 CRITICAL, 3 MAJOR, 3 MINOR, 4 OBS)

---

## What worked

- **All 14 AC-R81-* tests PASS** at Reviewer HEAD. Empirical re-run of Q-R81-EMPIRICAL.sh: ALL BLOCKS PASS (tsc exit 0; tests=622/pass=607/fail=11/skipped=4; 11 files in diff ⊆ ALLOWED_SET). Fail count matches Architect prediction exactly.
- **TDD discipline unbroken**: RED commit `ca94ce5` (14 × assert.fail stubs) precedes GREEN commit `2b8c778` (scrubber + keyboard + collapsible receipts + DEMO-SCRIPT.md). Independently verified by Reviewer via git log.
- **Architect spec discipline strong**: 3 brainstorm approaches with documented rationale; 13 files cite-then-walk at session entry; EMPIRICAL.sh probe-run at spec-emit per R77 reinforcement; 9 pre-emit grilling sub-sections; 7 acknowledged AC gaps each paired with specific Reviewer mitigation.
- **Implementer core deliverables correct**: scrubber UI (AC-R81-1/2), keyboard shortcuts (AC-R81-3), 200ms CSS transitions (AC-R81-4), scrubbing-class override (AC-R81-5), per-firing collapsible `<details>` receipts (AC-R81-6), DEMO-SCRIPT.md structural minima (AC-R81-8/9/10/11), R79+R80 anti-regression composite (AC-R81-12), anti-scope (AC-R81-14). All substantive deliverables correct.
- **Reviewer cold-read discipline**: independent empirical re-run before authoring report; right-reasons audit on 3 tests; role-boundary held (document only, no fixes); adversarial mandate honored (3 MAJOR findings emitted, not zero-finding routed).
- **SLICE 2 closed**: SLICE 2 dashboard trajectory R71 MVP → R79 (+41%) → R80 (+23%) → R81 (polish + scrubber + DEMO-SCRIPT.md). DS commensurability achieved.

---

## What violated discipline

| Severity | Role | Discipline | What happened |
|---|---|---|---|
| MAJOR-1 | IMPLEMENTER | narrative-empirical-verification | DEMO-SCRIPT.md:115 cites `engine/ds-integration/event-feed.ts` — non-existent; actual path is `engine/events/event-feed.ts`. Copied spec § 4.2 placeholder verbatim without grepping. |
| MAJOR-2 | IMPLEMENTER | encode-actual-results-verbatim | DEMO-SCRIPT.md:114 fabricates `cluster_event_id: EV-01`; actual scenario JSON has `event_id: evt-demo-firmware-push` with no `cluster_event_id` field. |
| MAJOR-3 | ARCHITECT + IMPLEMENTER | spec-application-target-document-pre-verify | README.md duplicate `## Quick demo` headings at lines 73 + 194. Architect spec § 2.7 didn't check README for existing heading collision; Implementer followed spec verbatim without halting on the structural collision. |
| MINOR-1 | IMPLEMENTER | narrative-accuracy-wrong-location | DEMO-SCRIPT.md:124 locates `correlational_not_causal: true` "in the scenario JSON"; field exists in engine output shape only. |
| MINOR-2 | ARCHITECT | AC-design-too-loose | AC-R81-7 global regex passes vacuously across duplicate `## Quick demo` headings; section-cohesion not enforced. |
| MINOR-3 | IMPLEMENTER | encode-actual-results-verbatim (attestation) | NEXT-ROLE.md attestation claims `renderAuditForWindow` "still appears in IIFE" — function was renamed to `rebuildAuditUpToCurrentWindow`; grep returns 0 matches. |

---

## Root cause analysis

**MAJOR-1 + MINOR-1 (narrative-empirical-verification / narrative-accuracy-wrong-location):**
Root cause: Implementer treated Architect spec § 4.2 skeleton placeholder text as verified facts rather than starting-point instructions to be empirically verified. The spec's bracketed instructions explicitly said "[Implementer] is responsible for narrative accuracy" and § 5.3 #6 required Reviewer end-to-end read as the mitigation — but the Implementer didn't independently verify the cited engine paths. Pattern: narrative content is easier to author from memory/spec-template than from live `ls` + `grep` output; the R71 MAJOR-1/2 lesson was applied at the Architect layer (spec pseudocode) but not internalized at the Implementer layer (published demo docs).

**MAJOR-2 (fabricated literal):**  
Root cause: Implementer synthesized `cluster_event_id: EV-01` from the domain model (event-conditional scenario implies an event with an ID) rather than opening `demos/scenarios/event-conditional.json` and reading the actual field. The encode-actual-results-verbatim discipline was applied to TAP test counts but not to narrative field-value citations.

**MAJOR-3 (duplicate README heading, split attribution):**  
- Architect root cause: spec § 0 brainstorm read the DS DEMO-SCRIPT-10MIN.md as the analogue template but did NOT read tessera's own README.md to check for heading collisions. The cite-then-walk discipline was applied to engine files (13 files verified) but README.md was not in the session-entry read list.  
- Implementer root cause: did not recognize the duplicate-heading collision as a § 6.1.4 R61-class architectural-reality discovery requiring halt + ESCALATE. The permissive reading ("instruction was followable") is defensible, but a halt + ESCALATE to the operator would have produced a cleaner artifact.

**MINOR-2 (AC-design too loose):**  
Root cause: Architect § 9.6 self-application gate verified the three global-match patterns against the spec's own prescribed pseudocode (which includes a single `## Quick demo` section), but did not simulate the adversarial case of a README with two same-named sections. Rule 3 self-application gate is applied against the NOMINAL case but not the ADVERSARIAL case.

**MINOR-3 (attestation wrong function name):**  
Root cause: Implementer ultimately chose the "rename" option for `renderAuditForWindow → rebuildAuditUpToCurrentWindow` (spec § 4.1.3 "Preferred per architect" option), but the NEXT-ROLE.md "Tactical deviations" prose was written as if the "in-place body change" option had been chosen. The attestation captured an earlier decision state, not the final committed state.

---

## Reinforcements added

| File | Change | Summary |
|---|---|---|
| `CLAUDE-ARCHITECT.md` | Updated `EMPIRICAL-PREMISE-VERIFICATION` composite: 12 → 14 sub-variants | Sub-variant 13: spec-prescribed document-mutation must verify target document state (README heading collision); Sub-variant 14: AC structural-boundary verification for sectioned documents |
| `CLAUDE-IMPLEMENTER.md` | Updated `IMPLEMENTER-DOC-ACCURACY` composite: 2 → 4 sub-variants | Sub-variant 3: narrative-empirical-verification — grep engine paths before citing; Sub-variant 4: narrative-location-accuracy — verify WHERE a field exists, not just THAT it exists |
| `CLAUDE-IMPLEMENTER.md` | Updated `ATTESTATION-SCOPE-FIDELITY` composite: 10 → 12 sub-variants | Sub-variant 11: narrative content must cite verbatim field-values from actual source data; Sub-variant 12: coordination-artifact source-state claims must be verified by command output |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | Appended tessera R81 additions + Haiku-MU 3rd-instance cross-project promotion | pre-emit-grilling violations × 2; halt-discipline violations × 2; role-boundary summary; Haiku-MU promotion with reinforcement rule derived |

All R81 violations rolled into existing composites per re-accretion guard (ARCHITECT at 43 entries, IMPLEMENTER at 38 entries — both above 28-entry threshold). No standalone REINFORCED lines added.

---

## Watch list for next round (R82 / SLICE 3 start)

1. **Narrative-empirical-verification at Implementer layer**: MAJOR-1 + MINOR-1 + MAJOR-2 are all variations of the same pattern — Implementer not grepping the actual source before writing narrative claims. SLICE 3 will involve live-browser engine integration; any narrative content about engine behavior will need explicit `grep`/`ls` verification before commit.

2. **README section-cohesion**: MAJOR-3 leaves a duplicate `## Quick demo` section in README.md. Operator should decide whether to merge the two sections before SLICE 3 begins. Future README ACs should use section-bounded regex patterns.

3. **AC global-regex vs section-bounded regex (MINOR-2 pattern)**: Any future spec that checks content in a sectioned document (README, DEMO-SCRIPT.md) should use bounded-extraction regex, not three independent global matches.

4. **Coordination-artifact attestation verification (MINOR-3 pattern)**: NEXT-ROLE.md "Tactical deviations" prose should be written after the final committed state, not during mid-implementation. Procedure: draft NEXT-ROLE.md routing block AFTER the chore-A commit, then verify each factual claim by running the relevant grep/ls before routing.

5. **Haiku-MU process-discipline-miss (cross-project pattern)**: R81 MU (this session) must verify STATUS: ROUND-COMPLETE is set as the final action. Cross-project reinforcement rule now promoted.

---

## Emerging cross-project patterns

**Narrative-empirical-verification migrated to Implementer layer**: The R71 MAJOR-1/2 reinforcement captured the Architect layer (don't pre-author spec pseudocode with unverified empirical claims). R81 surfaces the Implementer layer: demo scripts and public-facing documents require the same empirical verification discipline that spec pseudocode requires. The R71 reinforcement in CLAUDE-ARCHITECT.md (EMPIRICAL-PREMISE-VERIFICATION sub-variant 5) now has a counterpart in CLAUDE-IMPLEMENTER.md (IMPLEMENTER-DOC-ACCURACY sub-variants 3 + 4).

**Haiku-MU process-discipline-miss (3 instances → cross-project rule)**: R75 + R78 + R80 established the pattern; R81 MU is responsible for setting STATUS: ROUND-COMPLETE correctly. Rule now cross-project promoted.

**AC structural-boundary gap**: MINOR-2 introduces a new AC design failure mode not previously codified: a regex that correctly matches the intended content IN ISOLATION but passes vacuously when the target document has structural duplication (same section heading in two places). The reinforcement is now in CLAUDE-ARCHITECT.md sub-variant 14.

---

## Recommend reinforcement consolidation

- **CLAUDE-ARCHITECT.md** is at 43 REINFORCED lines (> 30 threshold). Recommend: `./scripts/consolidate-reinforcements.sh CLAUDE-ARCHITECT.md` to archive standalone lines older than 180 days. Composite sub-variants should be preserved intact. Operator-triggered; script does not auto-run.
- **CLAUDE-IMPLEMENTER.md** is at 38 REINFORCED lines (> 30 threshold). Recommend: `./scripts/consolidate-reinforcements.sh CLAUDE-IMPLEMENTER.md` similarly. Composites (ATTESTATION-SCOPE-FIDELITY at 12 sub-variants; PRE-EMIT-GRILLING-COMPLETENESS-GATE at 6 sub-variants; IMPLEMENTER-DOC-ACCURACY at 4 sub-variants) should be preserved intact.
