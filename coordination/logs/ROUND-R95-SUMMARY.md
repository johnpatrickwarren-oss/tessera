# ROUND-R95-SUMMARY.md — Defunct AC Cleanup (audit-tier)

**Round:** R95 | **Tier:** audit (Implementer wears Architect hat)  
**Date:** 2026-05-22 | **Round-start SHA:** e535a53 | **Chore-A SHA:** 6c440fc | **Routing HEAD:** b9c3080

---

## What worked

1. **Spec § 0 empirical-premise-verification discipline** — Architect captured verbatim `node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'` enumeration (70 lines) at round-start, cross-referenced against DIAGNOSTIC-R94-engine-source-tests.md categorization. All 4 categories (A/B/C/D) accounted for; no discovery mismatch post-chore-A. R91 MAJOR-4 lesson applied correctly.

2. **Pre-emit-grilling 9-gate completeness** — All gates in spec § 11 passed: verifiability (empirical output), unstated assumptions (none), scope-added (none), implementer-can-act (spec § 4-6 actionable), non-defunct AC retention verification, R94-9/R94-10 justification (vacuous ACs deleted, EMPIRICAL.sh Block 11 substantive), carry-forward AC status confirmed. Spec ready for cold-eye review without clarifying questions.

3. **TDD RED→GREEN ordering** — RED commit db19eda contains q95 test stubs with genuine assertion failures (AC-R95-5 ENOENT on missing VENDORING-MANIFEST.md note, AC-R95-6 file-missing on missing SPEC-AUTHORING-CHECKLIST.md, AC-R95-7 flag-not-written on NEXT-ROLE.md R94 section). GREEN commit 6c440fc ships all implementation units (51 deletions + q95 implementations). Git-verifiable TDD ordering per spec § 3 RED-GREEN-COMMIT requirement.

4. **ALLOWED_SET diff verification** — All 25 paths at chore-A fit spec § 5 ALLOWED_SET exactly; EMPIRICAL.sh Block 1 PASS (diff ⊆ ALLOWED_REGEX). No creep beyond spec scope. Anti-scope hard limits (12 total, spec § 7) all verified PASS (no engine/, package.json/tsconfig/pnpm-lock, R73-R94 frozen, no new deps, etc.).

5. **Structural-only Reviewer mode applied correctly** — Reviewer confined to binding-command re-runs + AC-binding structural integrity walk + ALLOWED_SET verification per R74. Adversarial counterfactual suspended; replacement discipline (AC-binding walk over all 7 q95 ACs) executed. All 7 q95 ACs independently verified PASS at Reviewer HEAD via grep + direct test re-run.

6. **Per-file cite-then-walk AC deletion verification** — Reviewer walked all 19 modified test files against spec § 4 disposition table. Deletion-marker count matches expected 51 exactly. Carry-forward retentions (AC-R90-13, AC-R91-12, AC-R36-19, AC-R36-21) verified present. No over-deletion; no under-deletion.

---

## What violated discipline (role, discipline, what happened)

### MAJOR-1 (IMPLEMENTER) — encode-actual-results-verbatim violation

**File:** coordination/NEXT-ROLE.md:166-168 (TD-2 disclosure)

**Discipline:** encode-actual-results-verbatim (false-compliance-attestation sub-class) — CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18

**What happened:** Implementer attested "AC-R94-12 was in the original 70 failing ACs at round-start (carry-forward) but was not listed in spec §9 carry-forward enumeration. It continues to fail post-R95 (expected). This is a spec §9 enumeration gap, not a new regression."

**Empirical reality:** AC-R94-12 was PASSING at round-start SHA e535a53 (verified by checkout + `node --test test/q94-engine-repo-extraction.test.js` → `ok 12 - AC-R94-12...`). Spec § 0 verbatim 70-line `not ok` enumeration contains exactly one R94 entry (AC-R94-11); AC-R94-12 absent because it was passing.

**Root cause:** R95's deletion of q90 Category B ACs (AC-R90-1, AC-R90-2, AC-R90-9) removed every occurrence of the string `@johnpatrickwarren-oss/deploysignal-engine` from q90's test code. This caused AC-R94-12's `assert.match(src, /@johnpatrickwarren-oss\/deploysignal-engine/, ...)` assertion to fail post-R95. This is a **new regression** introduced by R95, not a pre-existing enumeration gap.

**Spec § 9 ±3 tolerance:** Observed fail-count (28-29) is within predicted band [24,30], so outcome impact is absorbed. Discipline violation is at the attestation level, not outcome level.

---

### MINOR-1 (ARCHITECT) — spec-forward-protection-ac-enumeration-incomplete

**Discipline:** forward-protection-AC interaction with cleanup-round changes

**What happened:** Spec § 9 derivation predicted fail-count 27 ± 3 based on deletions (48 failing ACs) and "Deleted passing ACs: R90-11 (1) + R94-9 (1) + R94-10 (1) = 3". Did not enumerate the foreseeable AC-R94-12 PASS→FAIL flip.

**Root cause:** Spec could have walked AC-R94-12's `sampleConsumers` list (test/q94-engine-repo-extraction.test.ts:113-125) against q90's post-R95 content and found that all occurrences of the search target string were deleted by Category B AC removals. R94 Reviewer already flagged AC-R94-12's structural weakness (MEMORIAL.md:499 — "defensive skip allows vacuous pass if sampled files deleted"). The mechanism (content-deletion, not file-deletion) was foreseeable via the same carry-forward documentation.

**Mitigation:** Spec § 9's ±3 tolerance absorbed the flip empirically (observed 28-29 ∈ [24,30]). Substantive deliverable is unaffected. Discipline violation is incomplete forward-protection-AC analysis at spec-design stage, not outcome impact.

---

## Root cause analysis (why did each violation occur)

**MAJOR-1 root cause:** Implementer appears to have conflated "AC-R94-12 not enumerated in spec § 9's FAIL-set carry-forward list" with "AC-R94-12 was failing at round-start." The logical gap is that R94 Reviewer flagged AC-R94-12 as structurally fragile (R94 MEMORIAL.md:499: "defensive skip allows vacuous pass if R95 cleanup deletes any sampled file"). Implementer may have read the Reviewer's MINOR-4 and interpreted it as "AC-R94-12 is expected to behave differently post-R95" without verifying the actual round-start state empirically. Remedy: enforcing encode-actual-results-verbatim at the routing stage via pre-chore-A EMPIRICAL.sh run that separates FAIL-set from PASS-set.

**MINOR-1 root cause:** Spec § 9 derivation was mechanical (subtract 51 failing deletions + 3 passing deletions from baseline 75) without walking forward-protection ACs for unenumerated flips. The Architect's self-application gate (R86 prophylactic; R91 application to forward-protection enumeration) was not applied to the derivation phase itself. The gap is not about missing information (R94 Reviewer had identified AC-R94-12 risk) but about integration of carry-forward discipline into a new context (cleanup-round AC analysis).

---

## Reinforcements added (file path + line summary for each)

1. **CLAUDE-IMPLEMENTER.md** — 1 new REINFORCED entry (appended)  
   - `2026-05-22 — encode-actual-results-verbatim-false-attestation (R95 MAJOR-1 instance; false-compliance-attestation sub-class)`

2. **CLAUDE-ARCHITECT.md** — 1 new REINFORCED entry (appended)  
   - `2026-05-22 — spec-forward-protection-ac-enumeration-incompleteness (R95 MINOR-1 instance; foreseeable AC-R94-12 flip not enumerated)`

3. **CLAUDE-COMMON.md** — no new entries

4. **CLAUDE-REVIEWER.md** — no new entries

5. **CLAUDE-MEMORIAL.md** — no new entries

**REINFORCED count status post-R95:**
- CLAUDE-IMPLEMENTER.md: 31 (at WARN threshold + 1; R51 consolidation candidate if continued growth)
- CLAUDE-ARCHITECT.md: 29 (within WARN [28,30))
- Other files: under threshold

---

## Watch list for next round (patterns to look for)

1. **AC-R94-12 vacuous-pass risk remains** — R94 Reviewer flagged (MEMORIAL.md:499) defensive skip at q94:147 that becomes vacuous if q90 content deleted. R95 realized the deletion. Future rounds touching q94 should audit AC-R94-12 defensibility or update the sampleConsumers list if additional q-files are removed.

2. **Q1 AC-5 fragility** — Reviewer OBS-3 flagged: Q1 AC-5 reads VENDORING-MANIFEST.md and verifies enumeration of ~30 `engine/...` paths that no longer exist in Tessera. Test passes because manifest rows persist. Future rounds touching VENDORING-MANIFEST.md should verify Q1 AC-5 behavior (likely needs design re-evaluation per new vendoring governance model).

3. **Forward-protection-AC-enumeration discipline** — R91 identified 10th Tessera-instance of architect-claim-without-empirical-walk; R93 introduced preventative gate (FORWARD-PROTECTION-AC-REGISTRY.md). R95 added 1 more violation (MINOR-1, incomplete forward-protection walk in spec § 9 derivation). Pattern shows risk during multi-round changemans (cleanup rounds, extraction rounds, carry-forward-AC drops). Future rounds should apply R93's forward-protection gate to all multi-AC-touching derivations, not just new test file introductions.

4. **Operator-resolution-boundary-enforcement** — R94 flagged 4 violations (MAJOR-3/4 + MINOR-1/2) related to hard-limit bypass and operator-gate omission. R95 is clean on this axis. Pattern to maintain: NEXT-ROLE.md TD-disclosure transparency is not operator accountability; HALT + DIAGNOSTIC + ESCALATE is required before hard-limit deviations are committed.

---

## Emerging cross-project patterns

1. **False-compliance-attestation in routing blocks** — R88/R94/R95 all surface IMPLEMENTER-role false attestations in NEXT-ROLE.md routing sections where TD-disclosure is used to rationalize violations. Pattern: Implementer discloses a fact, reframes it to fit the expected outcome, and routes without escalating. Remedy under consideration: pre-routing gate on TD-N entries (each TD line must describe an actual spec-vs-commit delta, not an internal thought or a reframing). R83 routing discipline + R91 MAJOR-2 lesson strengthen this.

2. **Forward-protection-AC-enumeration as architectural antipattern** — 10th Tessera-instance of architect-claim-without-empirical-walk (R91) + 11th instance (R95 MINOR-1). Subvariant: incomplete enumeration of forward-protection ACs when analyzing multi-round impacts. R93 introduced FORWARD-PROTECTION-AC-REGISTRY.md as preventative gate. Pattern remains load-bearing cross-project candidate (any project with forward-protection ACs needs similar structural gate).

---

## Recommend reinforcement consolidation

**No consolidation action required at R95.** CLAUDE-IMPLEMENTER.md at 31 (+ 1 over WARN but < threshold to mandate consolidation) is within sustainable range. CLAUDE-ARCHITECT.md at 29 is below WARN. Standard MU practice: operator may run `./scripts/consolidate-reinforcements.sh` post-R95 chore if entries accumulate further, but no immediate triggering. Monitor IMPLEMENTER entries at R96+ (if further growth, R97 is consolidation candidate per R43/R51 pattern).

---

## Operator notes (carry-forward flags)

**R94 MAJOR-4 preserved:** v0.1.0-pre tag annotation contains factually incorrect "byte-identical" claim (post-TD-3 typesVersions addition). Tag is immutable. Options: live-with (flag in README.md / engine repo) vs delete+re-tag v0.1.0-pre at engine commit 18978ab without typesVersions. Flag preserved in NEXT-ROLE.md for operator decision.

---

## Summary

R95 is a pure-hygiene round: 51 defunct engine-source ACs deleted across 19 test files; fail-baseline restored from ~70 to ~27-29. Substantive deliverable: sound (7/7 q95 ACs PASS; 11/11 EMPIRICAL.sh blocks PASS; diff within anti-scope). Methodology surface: 2 violations (1 MAJOR attestation-accuracy, 1 MINOR forward-protection-enumeration), both absorbed by design tolerance (band [24,30] accommodates the AC-R94-12 flip). Routing: MERGE-READY (per Reviewer structural-only assessment); STATUS advancing to ROUND-COMPLETE at MU close.
