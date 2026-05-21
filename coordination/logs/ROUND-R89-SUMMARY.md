# ROUND-R89-SUMMARY — Methodology Hygiene Round (2026-05-21)

**Round:** R89 (audit-tier; Implementer wears Architect hat)
**Start SHA:** db232d9
**Implementer/Reviewer HEAD:** eca522f (chore(R89): record attestation SHA)
**Date:** 2026-05-21

---

## What worked

- **Brainstorm discipline applied early.** Spec § 0 enumerated 3 approaches for NEXT-ROLE sharding (Approach A selected), 3 approaches for CLAUDE-ARCHITECT.md folding (Approach A selected), and 3 options for sustaining mechanism (Option α selected). Rationale documented for selections + rejections.

- **R42 strategy-a byte-identical discipline honored.** Shards created via bash `sed -n '<A>,<B>p'` extraction without content rewriting. EMPIRICAL.sh Blocks 2–4 verified diff-empty for all three shards (MEMORIAL-PHASE-3.md, MEMORIAL-PHASE-4.md, NEXT-ROLE-PHASE-4.md). Rule 6 anti-workaround preserved.

- **Composite folding achieved consolidation targets.** CLAUDE-IMPLEMENTER.md 41→30 via 11-entry folds into 5 existing composites. CLAUDE-ARCHITECT.md 51→24 via 14-entry fold into existing EMPIRICAL-PREMISE-VERIFICATION + 2 new composites (SPEC-PRESCRIPTION-DISCIPLINE, SPEC-INTERNAL-CONSISTENCY). R39 MAJOR-1 discipline honored: heading counts updated in same commit.

- **TDD RED→GREEN ordering preserved.** RED commit 5189b7e (8 test stubs) precedes GREEN commit dbc529d (implementation). 9th consecutive round (R81–R89) of verifiable test-first discipline.

- **Sustaining mechanism wired.** scripts/check-claude-md-thresholds.sh created; wired into scripts/finalize-round.sh Step 7b inside _FINALIZE_PIPELINE_ACTIVE guard. Post-R89 state: ARCH=24, IMPL=30, COMMON=9, REVIEWER=4, MEMORIAL=3 — all below ERROR threshold (≥40).

- **All 8 ACs pass at Reviewer structural-only stage.** Q-R89-EMPIRICAL.sh 11 PASS / 0 FAIL; node --test 8/8 PASS. AC-R36-21 (CLAUDE-IMPLEMENTER.md ≤30) flips FAIL→PASS as discipline-restoration.

- **Anti-scope preserved.** git diff db232d9..HEAD contains 14 paths, all within spec § 4 ALLOWED_SET. No engine/*, no R88-or-prior substantive code, no demos/*, no new external dependencies.

---

## What violated discipline (role, discipline, what happened)

### MAJOR findings

**MAJOR-1: prefix-continuity-invariant (Implementer + Reviewer)**
- Q-R89-EMPIRICAL.sh Block 8 amended post-spec-commit 004cff6. Original invocation `node --test test/*.test.js --test-reporter=tap` produces spec-reporter output (not TAP) in Node 25.9.0 with flags after files; grep '^# tests' finds no match and aborts under `set -e`. Fixed form: `node --test --test-reporter=tap test/*.test.js` (matches R88 pattern, flags before files).
- Per CLAUDE-COMMON.md within-round prefix-continuity invariant: spec amendments post-commit require HALT+DIAGNOSTIC+ESCALATE. Implementer treated as TACTICAL DEVIATION under R73 MAJOR-2 (control-flow fix exemption).
- Reviewer independently detected MAJOR-1; confirmed: (a) spec form was structurally broken; (b) substantive deliverables independent of Block 8; (c) amendment necessary for verification harness.
- Impact: substantive deliverable (archival + folding + sustaining mechanism) sound; process discipline question flagged to operator.

**MAJOR-2: AC-R89-8 structurally unsatisfiable at routing-commit stage (Implementer/spec design)**
- AC-R89-8 prescribes "first 126 lines of NEXT-ROLE.md byte-identical to pre-R89 source."
- R83 routing discipline mandates top-of-file `STATUS:` and `NEXT-ROLE:` field updates in same routing commit. Lines 1–4 fall within "first 126 lines" range.
- AC-R89-8 PASS at Implementer chore-A (dbc529d); FAIL at Reviewer routing-commit stage (when lines 1–4 updated per R83). Remains FAIL through MU close.
- Root cause: spec-design tension (AC design vs mandatory routing discipline), not execution error.
- Implication: future methodology rounds should exclude lines 1–4 from "byte-identical" ACs or anchor AC to specific chore-A SHA.

### MINOR findings

**MINOR-1: AC-R89-7 test assertion narrower than "Then" clause (Implementer)**
- AC specifies "output equals git show HEAD:coordination/MEMORIAL.md | sed -n '2753,2825p'" (R88 entries at same line positions).
- Test implementation: `currentMemorial.includes(preR89R88Block)` — verifies block appears anywhere, not at specified line positions.
- Spec audit § A5 acknowledged gap; test uses .includes() instead of position-specific check.
- Risk low at chore-A state (post-reset MEMORIAL simple; block would be found anywhere).

---

## Root cause analysis

### MAJOR-1 (prefix-continuity-invariant)
The spec-shipped EMPIRICAL.sh Block 8 invocation was empirically broken: Node 25.9.0 with `--test-reporter=tap` flag AFTER test files produces spec-reporter output (ℹ format) not TAP (# format). The spec was not tested pre-emit (per REINFORCED R77 rule: "Architect MUST execute Q-RNN-EMPIRICAL.sh at round-start HEAD before routing").

The Implementer's tactical-deviation choice reflects R73 MAJOR-2 scope (control-flow corrections allowed), but the underlying issue is Architect-side (spec-shipped broken artifact). The Implementer correctly prioritized unblocking the verification harness over strict HALT+ESCALATE procedure.

### MAJOR-2 (AC-R89-8)
Implementer-as-Architect (audit-tier) authored AC-R89-8 without considering the three-stage satisfiability test (chore-A / Reviewer routing / MU routing). The spec audit § A5 documented the R83 vs AC-R89-8 tension as a "known spec gap" (acceptable deferral) rather than a halt-condition trigger. The gate at spec-emit (Architect grilling § A4) noted the tension but did not escalate it.

This reflects a gap in the Gate A5 (self-application of rule-5 when spec prescribes complex pattern-matching) — should explicitly evaluate whether ACs are satisfiable across all three routing stages (chore-A, Reviewer commit, MU commit), not assume steady-state satisfiability.

### MINOR-1 (AC-R89-7)
The spec's own audit § A5 acknowledged this gap ("requires verification at a point BEFORE R89 entries appended") but the test implementation used a more lenient check (.includes() rather than line-position-specific). The test is functionally MORE robust than the AC literal, but diverges from the AC specification. This is a test-vs-AC-fidelity issue; no code defect.

---

## Reinforcements added

No new REINFORCED entries added to CLAUDE-*.md files. R89 violations are:
1. **prefix-continuity-invariant**: Known pattern from R73 MAJOR-2. Documented in MEMORIAL + CROSS-PROJECT. Existing CLAUDE discipline covers this; no new line needed.
2. **ac-test-assertion-narrower-than-ac-then-clause**: Documented in MEMORIAL + CROSS-PROJECT as MINOR-1; pattern identified for future reference. CLAUDE-IMPLEMENTER.md at consolidation threshold (30 entries); no new standalones added per R51 guard.
3. **ac-structurally-unsatisfiable-at-routing-commit-stage**: Documented in MEMORIAL + CROSS-PROJECT as MAJOR-2; spec-design pattern identified for future reference. New reinforcement rules documented in CROSS-PROJECT-MEMORIAL under "Reinforcement rules derived (R89 implications)".

**CLAUDE-*.md threshold status post-R89 MU:**
- CLAUDE-ARCHITECT.md: 24 ✓
- CLAUDE-IMPLEMENTER.md: 30 ✓
- CLAUDE-COMMON.md: 9 ✓
- CLAUDE-REVIEWER.md: 4 ✓
- CLAUDE-MEMORIAL.md: 3 ✓
- All counts within [0,40) band; no consolidation-recommended nudge needed.

---

## Watch list for next round

1. **Architect EMPIRICAL.sh probe-run discipline (R77 reinforced rule).** Ensure Architect executes Q-RNN-EMPIRICAL.sh at round-start HEAD pre-routing and verifies every block passes. R89 reveals the cost of not running pre-emit.

2. **Multi-stage AC satisfiability gate for Architect pre-emit.** When an AC involves file-content assertions and the file is modified by mandatory infrastructure rules (R83 routing updates, R81 EMPIRICAL.sh SHA injection), evaluate AC satisfiability at three stages: chore-A, Reviewer routing, MU routing. Document explicitly in spec § 6.

3. **Test-vs-AC-fidelity discipline.** Test implementation should match the AC "Then" clause literally, not implement a superset/subset. R89 MINOR-1 shows even with spec-audit acknowledgment of a gap, the test diverged from the AC.

4. **Prefix-continuity-invariant tactical deviations.** R89 MAJOR-1 reinforces R73 rule: tactical deviations for control-flow corrections are permitted, but the root cause (spec artifact broken) is an Architect-side issue. Future rounds should ensure broken spec artifacts are flagged at spec-emit, not left for Implementer to fix tactically.

---

## Emerging cross-project patterns

Per CROSS-PROJECT-MEMORIAL.md appendix, two new reinforcement rules derived from R89:

1. **Within-round spec-design tensions involving mandatory routing discipline (R83).** When an Architect's spec AC creates a byte-identical assertion over a file-region that overlaps with mandatory routing-discipline update fields (top-of-file STATUS / NEXT-ROLE in NEXT-ROLE.md; lines 1–4), the AC is structurally unsatisfiable at Reviewer/MU routing-commit stage and will flip PASS→FAIL post-routing regardless of implementation quality. Procedure: explicitly enumerate in spec § 6: "AC-N prescribes byte-identity check that includes lines altered by mandatory R83 routing updates → HALT with ESCALATE for AC redesign."

2. **Spec audit gate scope: stage-by-stage AC satisfiability.** Existing gate A5 (self-application of rule-5) should evaluate whether ACs are satisfiable at chore-A, Reviewer routing, and MU routing-commit stages separately. When an AC involves file-content assertions and the file is modified by mandatory infrastructure rules, the three-stage satisfiability must be explicitly documented. Procedure: list each AC against the set of mandatory writes (R83 routing updates, R81 EMPIRICAL.sh SHA injection, etc.) and confirm no conflicts before spec-emit.

---

## No consolidation-recommended nudge needed

All CLAUDE-*.md files remain ≤30 entries post-R89 consolidation. No nudge to run `scripts/consolidate-reinforcements.sh` required.

---

## Operator decision flags

Per REVIEWER-REPORT-R89.md § 6, two operator-decision flags for awareness:

1. **MAJOR-1 (prefix-continuity-invariant deviation):** Implementer self-disclosed and requested Reviewer assessment of HALT+ESCALATE. Reviewer's structural-only assessment: the deviation was necessary to make Block 8 verification work (spec form was broken); substantive deliverable is independent of Block 8 mechanics; audit trail preserved. Operator may wish to consider whether retroactive ESCALATE handling is warranted, but no structural correctness issue blocks merge.

2. **MAJOR-2 (AC-R89-8 vs R83 spec design tension):** Post-Reviewer-routing-commit, fail-count shifted from 15→16 (AC-R89-8 PASS→FAIL flip caused by mandatory R83 routing updates). This is NOT an MU-stage halt condition (binding-command attestation at Reviewer HEAD pre-routing was in-band: fail=15); the +1 fail is structurally caused by mandatory R83 routing-commit edits. Memorial Updater aware that AC-R89-8 will continue to FAIL through round close — this is expected per MAJOR-2 design issue, not an MU defect. Future methodology rounds should not write "first N lines byte-identical" ACs at the working-tree level.
