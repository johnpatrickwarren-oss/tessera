# Q-R95-SPEC-AUDIT.md — Architect Ceremony Sidecar
**Round:** R95 | **Tier:** audit (Implementer = Architect; self-audit) | **Date:** 2026-05-22

This file is the Architect-ceremony sidecar for Q-R95-SPEC.md, as required by the coordination
audit trail convention. In audit-tier, the Implementer wears the Architect hat and this sidecar
documents the self-audit walk before routing to the Reviewer.

---

## Audit walk

### 1. § 0 empirical state completeness

**Verified:** `node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'` run at R95 round-start SHA `e535a53`. 70 not-ok lines captured verbatim. Suite summary tests=758/pass=679/fail=75/skip=4 recorded. Cross-referenced against DIAGNOSTIC-R94-engine-source-tests.md — 3 new failures identified (R36-21, R89-5, R94-11) vs DIAGNOSTIC's 67 items; root causes documented. All 20 pre-R94 carry-forward items confirmed present. R91 MAJOR-4 lesson applied.

### 2. § 4 per-file AC table completeness

**Verification method:** grep run against each test file for each not-ok AC ID. Line citations confirmed via `grep -n "test('AC-ID" <file>`. Not-ok items 19, 344, 346, 409, 410, 519, 522, 535, 536, 544, 550, 564, 578, 592, 604, 607, 624, 644, 665, 668, 681, 694 classified as carry-forward (NOT defunct) — none appear in §4 DELETE column.

**Cross-check:** 48 failing ACs in DELETE column + 3 passing ACs in DELETE column = 51 total deletions. 70 not-ok lines − 48 defunct failing = 22 carry-forward failing items. Confirmed: 22 items are carry-forward in §4.

**AC-R36-3 status:** grep of `test/q36-phase2-close-walk.test.ts:71` confirms: `// ── AC-R36-3 dropped at R93 (2026-05-21)`. No carve-out update needed for q95 test file.

### 3. § 5 ALLOWED_SET completeness

**Verified:** All 19 test files containing defunct ACs enumerated (matches §4 file list exactly). New files (q95, SPEC-AUTHORING-CHECKLIST.md) included. Coordination artifacts (MEMORIAL.md, NEXT-ROLE.md, VENDORING-MANIFEST.md, specs/, reviews/, logs/) included. CLAUDE-*.md NOT in ALLOWED_SET (R89 sustaining mechanism; MU is the only role permitted to append). No tool or production source files in ALLOWED_SET (correct — zero production code changes in R95).

**ALLOWED_REGEX** in §5 covers all ALLOWED_SET entries. Verified each entry has a corresponding regex branch.

### 4. § 9 band derivation

**Verified:** Arithmetic checks out (714 = 683 + 27 + 4). Deletion counts match §4 summary table (51 total = 28+13+6+4). R84-14 stochastic ±1 acknowledged. Band [24, 30] = base 27 ± 3. Conservative but grounded.

Note: The R95 directive stated "~21" as the expected post-cleanup floor. The empirical pre-R95 baseline (fail=75) is 3 higher than the DIAGNOSTIC's fail=72 (R36-21 + R89-5 new carry-forward + R94-11 new Category D). After deleting R94-11 (Category D), the effective carry-forward adds 2 vs the directive's estimate (R36-21, R89-5). Combined with the stochastic band width, [24, 30] is the correct empirical derivation; the directive's "~21" was an estimate from an older fail count.

### 5. § 6 AC design review

**AC-R95-1 (Category A absent, 5 files):** Test() declaration prefix pattern `test('AC-ID:` is unique-per-test. Discriminating — cannot match a comment. Five files span 5 different Category A rounds (R18, R20, R29, R30, R38), providing distributed coverage.

**AC-R95-2 (Category B+C absent):** R90-1 and R90-12 check two different ends of the B range; R91-3 and R91-5 check two C items. Non-overlapping with AC-R95-1 coverage.

**AC-R95-3 (Category D absent, 4 checks):** Covers all 4 Category D deletions — AC-R93-7, AC-R94-9, AC-R94-10, AC-R94-11.

**AC-R95-4 (carry-forward present):** Verifies R90-13 and R91-12 are NOT accidentally over-deleted. Counter-examples to the deletion pattern. Essential cold-eye check.

**AC-R95-5 (VENDORING-MANIFEST.md heading):** `^## R95 defunct AC cleanup note` with `/m` flag. Unique heading — not likely to match anything else in the file.

**AC-R95-6 (SPEC-AUTHORING-CHECKLIST.md text):** The exact phrase from the R94 MAJOR-3 reinforcement is discriminating (long enough to be unique; won't match incidentally).

**AC-R95-7 (NEXT-ROLE.md flag):** `"tag immutable; options: live-with vs delete+re-tag"` — verbatim from line 15 of current NEXT-ROLE.md. Verified present at round-start.

**No subprocess ACs:** Intentional per §10 acknowledged coverage gap. EMPIRICAL.sh Block 7 handles fail-count band verification.

### 6. Anti-scope review

No production code in ALLOWED_SET. No engine/ modifications. No package.json/tsconfig.json/pnpm-lock.yaml. No CLAUDE-*.md beyond MU appends. No new external dependencies (q95 uses only `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:child_process` — all built-in).

### 7. Halt-condition coverage

All 9 halt conditions in §8 are mechanically checkable: 1 = EMPIRICAL.sh exit code; 2 = tsc exit code; 3 = test-runner fail count; 4-5 = diff path check; 6-9 = preconditions that would require ESCALATE.

### 8. Pre-routing gate (spec-amendment-ALL-gate-artifacts-propagation)

ALLOWED_SET in §5 spec prose matches ALLOWED_REGEX in §5 code block — both cover the same 30 paths (19 test files + 11 coordination/templates paths). No gap between narrative and machine-checkable form.

---

## Verdict

Spec is complete and actionable for cold-eye Reviewer. §4 table is the implementation contract; §6 ACs are the verification contract; §5 ALLOWED_SET is the anti-scope contract. No open questions. All design decisions documented in §2 brainstorm with rejection rationale.

**Architect sign-off (audit-tier self-audit):** ✓ Route to Implementer phase.
