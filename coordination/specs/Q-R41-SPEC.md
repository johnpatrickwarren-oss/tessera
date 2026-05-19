# Q-R41-SPEC — Repo Hygiene Audit (audit-tier)
# Round: R41 | 2026-05-19 | IMPLEMENTER = spec author

---

## § 1 — Goal

Deliver a comprehensive post-Phase-2-close repo hygiene audit covering 7 surfaces defined in
`coordination/NEXT-ROLE.md`: artifact link validation, orphan-file detection, test baseline
encoding, vendoring-manifest cross-check, STAGED lifecycle audit, Rule 7 content fix in the
Phase 3 candidates inventory, and a final hygiene-stamp commit. Fix-as-you-go for low-risk
doc issues (Surface 6 Rule 7 fix; Surface 5 lifecycle annotations); flag structurally uncertain
items for operator. This is the last safe-continuation round before HARD STOP; NEXT-ROLE post-R41
is Reviewer.

---

## § 2 — Brainstorm

Three approaches considered before selecting:

**Option A — Linear surface-by-surface** (SELECTED): Execute Surfaces 3→4→6→5→1+2→7 sequentially.
Strengths: one open thread at a time; easy audit trail; Reviewer can follow the record. Weakness:
slower than parallelized batching. Risk: low.

**Option B — Batch by category**: group "file-existence checks", "content checks", "lifecycle checks"
and batch-run grep passes. Strengths: efficient tooling re-use. Weakness: more cognitive overhead;
harder to record findings per surface. Risk: interleaved findings blur the audit record.

**Option C — Priority-by-impact-first**: doc fixes (Surface 6) → lifecycle (Surface 5) → everything
else. Strengths: high-value changes land early. Weakness: surfaces 1+2 could reveal issues that
require revisiting earlier fixes. Risk: minimal but non-zero.

**Rejection rationale**: Option B adds bookkeeping cost without speed benefit in this sequential
interactive session. Option C is reasonable but Surface 3 (baseline encoding) and Surface 4
(vendoring) are mechanical passes that belong before doc fixes so the spec encodes reality. Option A
with the reorder (3→4→6→5→1+2→7) preserves traceability.

---

## § 3 — Mechanism

**Surface 3 — Baseline encoding (at spec-authoring time — empirically observed, not cited from prior rounds):**

`node --test test/*.test.js` → **tests 358 / pass 352 / fail 3 / skip 3 / cancelled 0**.  
Failing tests: AC-R36-21 (IMPLEMENTER count guard), AC-R36-30 (round-start→chore-A diff guard), AC-R36-31 (chore-A→HEAD diff guard) — all pre-existing R36 forward-protection guards triggered by R38–R40 additions; no regression.  
Skipped tests: AC-R29-12, AC-R34-21, AC-R38-4 — subprocess-spawn guards (transitive-hang risk).

`npx tsc -p tsconfig.test.json` → **exit code 0** (TypeScript 5.9.3). DEVIATION FROM PRIOR EXPECTATION:
prior rounds (WU-01 spec, WAVE-GATE-01) expected exit code 2 (TS5107 moduleResolution + TS2688
@types/node). TypeScript upgrade to 5.9.3 resolved those issues. The load-bearing property "no NEW
typecheck regressions" is satisfied; literal exit-code claim is now strictly better.

**Surface 4 — Vendoring manifest verification:** For each of the 40 on-disk files in VENDORING-MANIFEST.md,
verify `grep -l "VENDORED FROM DeploySignal main@5a72371" <file>` returns hit. The Phase 1 close-walk
(R15) verified all 40/40; Phase 2 anti-scope forbade modification of vendored-at-pin files; result is
expected to hold. Anchor methodology files (CLAUDE-COORDINATOR.md + 6 templates) verified to exist at
their declared paths.

**Surface 6 — Rule 7 canonical landing fix (CROSS-PROJECT-MEMORIAL.md:3470):** Line 3470 reads "Rule 7
(`derived-rule-propagation-mechanism-required`) canonically lands at R38 Memorial-Updater stage per
OQ-W5-1 Option A authorization." Lines 3474-3478 contain the full Rule 7 text. Three references in
`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` treat Rule 7 status as unknown/conditional:
- § 5.1 "Dependency note": conditional phrasing "If operator selects Option A…"
- § 6 table "Rule 7 canonical landing": cell says "Status unknown at R40 entry"
- OQ-P3-5 table row: asks "Has Rule 7 canonical text landed?"

Fix: replace the three references with factual statements citing `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`.
Mark OQ-P3-5 as RESOLVED.

**Surface 5 — STAGED lifecycle audit:** Annotate each of the 5 items in `coordination/STAGED-FOR-PHASE-2-CLOSE.md`
with "**Status at R41:**" block. Expected dispositions per NEXT-ROLE.md directive + verification:
- Item 1 (MR-2 consolidation): CLOSED at R39 per MR-2 execution.
- Item 2 (R32 carry-forwards to WU-07): CLOSED at R36 per WU-07 close-walk execution.
- Item 3 (anchor backflow): FORWARDED — anchor portion to ANCHOR-BACKFLOW-2026-05-18.md; Tessera-local
  items CLOSED at R36 per WU-07.
- Item 4 (Tailscale MR-3): FORWARDED to PHASE-3-CANDIDATES-PRELIMINARY.md § 4.1 — Phase 3 candidate.
- Item 5 (R34 reinforcement staging): CLOSED at R39 (applied in MR-2 consolidation passes).

If all Items are CLOSED or FORWARDED: rename file to `coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md`.

**Surfaces 1+2 — Artifact link validation + orphan detection:** For each Phase 2 coordination artifact
(~25 files), grep for relative paths (`coordination/...`; `engine/...`; `test/...`). Verify each on
disk. Flag broken paths as FIX-AS-YOU-GO (doc-only) or HALT (structural). For orphan detection, list
all `coordination/*.md` files and cross-reference against known artifact chains; document findings in
hygiene stamp.

**Surface 7 — Hygiene stamp:** Emit `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md` with all 7 sections
required by NEXT-ROLE.md § Surface 7.

**TDD for q41 test file:** RED commit with 3 stub tests (assert.fail stubs) before any implementation.
GREEN achieved when doc fixes + stamp emit complete.

---

## § 4 — Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-R41-1 | R41 session-entry baseline | `node --test test/*.test.js` and `npx tsc -p tsconfig.test.json` run at spec-authoring time (empirical, not cited from prior round) | tests=358, pass=352, fail=3, skip=3; tsc exit=0. Fail tests named as AC-R36-21/30/31 (R36 forward-protection guards); skip tests named as AC-R29-12/R34-21/R38-4 (subprocess-hang guards). tsc exit=0 is a DEVIATION from WAVE-GATE-01 expectation of exit=2 — TypeScript 5.9.3 resolved TS5107/TS2688; load-bearing property "no new regressions" is met. |
| AC-R41-2 | VENDORING-MANIFEST.md 40 on-disk rows | `grep -c "VENDORED FROM DeploySignal main@5a72371"` run per file | All 40 on-disk files return hit count ≥ 1. Anchor methodology files (CLAUDE-COORDINATOR.md + 6 templates in templates/) confirmed to exist at declared paths. |
| AC-R41-3 | ~25 Phase 2 coordination artifacts | Grep each for `coordination/`, `engine/`, `test/` relative paths; check disk existence | All resolved paths exist OR are documented in hygiene stamp with fix-applied / orphan-for-review label. Zero unresolved broken paths left silently. |
| AC-R41-4 | `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` §§ 5.1, 6, OQ-P3-5 treat Rule 7 status as unknown/conditional | Surface 6 fix applied | § 5.1 "Dependency note" states Rule 7 IS canonical (no conditional); § 6 table "Rule 7 canonical landing" cell changed from "Status unknown at R40 entry" to "CONFIRMED: canonically landed at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` per R38 Memorial-Updater stage"; OQ-P3-5 row in OQ summary table marked RESOLVED with citation to CROSS-PROJECT-MEMORIAL.md:3470. The phrase "Status unknown" does NOT appear in the Rule 7 row of the § 6 table after the fix. |
| AC-R41-5 | `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Items 1-5 | Status annotation pass applied | Each Item has a `**Status at R41:**` heading with disposition: CLOSED-AT-[round], FORWARDED-TO-[artifact], or ACTIVE. |
| AC-R41-6 | All 5 STAGED items are CLOSED or FORWARDED after AC-R41-5 verification | File rename condition met | File renamed to `coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md`; original path `coordination/STAGED-FOR-PHASE-2-CLOSE.md` no longer exists on disk. |
| AC-R41-7 | All `coordination/*.md` files found by `ls coordination/*.md` | Orphan detection pass: cross-reference each file against known artifact chains (referenced-by scan) | Every coordination/*.md file is either (a) referenced in at least one other coordination artifact or NEXT-ROLE.md/MEMORIAL.md/VENDORING-MANIFEST.md, or (b) listed in PHASE-2-CLOSED-HYGIENE-STAMP.md as potentially-orphaned with disposition. No files silently unaccounted. |
| AC-R41-8 | `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md` does not exist at round start | Surface 7 executed | File exists with all 7 required sections: (1) wall-clock chain duration, (2) total rounds+tasks, (3) 7 cross-project rules lineage, (4) Phase 2 deliverable inventory cross-check, (5) cluster fan-out statistics, (6) methodology friction surfaces count, (7) "operator wakes to..." startup snapshot. |
| AC-R41-9 | Chore-A SHA = `ae7c438` | `git diff 622164c HEAD --name-only` at chore-A | All paths ⊆ ALLOWED_SET: `coordination/specs/Q-R41-SPEC.md`, `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md`, `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md`, `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`, `coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md`, `test/q41-hygiene-audit.test.ts`, `test/q41-hygiene-audit.test.js`, `coordination/reviews/REVIEWER-REPORT-R41.md` (Reviewer-created; in set), `coordination/logs/ROUND-R41-SUMMARY.md` (pipeline log; in set). Zero engine/* paths; zero modification of pre-existing test/*.test.{ts,js} files. |
| AC-R41-10 | Chore-A SHA `ae7c438` | `node --test test/*.test.js` at chore-A | tests=358+N_q41 (N_q41=3 if q41 test file added), pass=(352+N_q41), fail=3 (AC-R36-21/30/31 unchanged), skip=3; tsc exit=0. Actual counts encoded verbatim from the run at chore-A SHA. |

---

## § 5 — Anti-scope

- NO Phase 3 entry
- NO modification of engine/* (zero production code changes)
- NO modification of pre-existing test/*.test.{ts,js} files (only NEW test/q41-hygiene-audit.test.ts allowed)
- NO modification of CLAUDE-*.md files
- NO modification of SCOPING-MEMO-v0.3.md or PRD.md
- NO writes to `~/.claude/CROSS-PROJECT-MEMORIAL.md`
- NO modification of `coordination/VENDORING-MANIFEST.md` (verification only; drift findings → HALT, not auto-fix)
- NO auto-deletion of orphaned files (document for operator review)
- NO operator-gate item dispositions
- NO GitHub PRs

## § 6 — Open questions

None — all resolved. Halt conditions per NEXT-ROLE.md apply; if vendoring drift or structural orphan is found, emit DIAGNOSTIC-R41-[topic].md + STATUS: ESCALATE.

---

## § 7 — Pre-emit grilling

1. Every AC has a verifiable outcome (file existence, string presence/absence, command exit code, count match). ✅
2. No unstated assumptions: tsc exit=0 deviation documented; STAGED dispositions reference NEXT-ROLE.md directive + verification. ✅
3. Scope check: AC count = 10; within 10-14 target. Surface 6 fix is single-file doc edit with clear correctness criterion (cite CROSS-PROJECT-MEMORIAL.md:3470). ✅
4. Reviewer can act on this with zero clarifying questions: ALLOWED_SET spelled out in AC-R41-9; all halt conditions named. ✅
5. ALLOWED_SET authored now (pre-RED-commit). ✅
