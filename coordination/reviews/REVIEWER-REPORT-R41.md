# REVIEWER-REPORT-R41 — Repo Hygiene Audit (audit-tier)

**Round:** R41 | 2026-05-19 | audit-tier
**Spec:** `coordination/specs/Q-R41-SPEC.md`
**Round-start SHA:** `622164c` (chore(R41-prep))
**Chore-A SHA:** `ae7c438`
**HEAD SHA at review:** `a2e6d8e`
**Reviewer mode:** cold, single (Opus); read spec + Q-R41 test + hygiene stamp + edited artifacts; did NOT read NEXT-ROLE.md routing summary before initial sweep; did NOT read diagnostics/ or .prompt-*.md files (cold-context discipline).
**Adversarial mandate:** active. Assumed at least one mistake. Found a structurally-significant claim/evidence mismatch on AC-R41-7.

---

## § 1 — Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R41-1 | Session-entry baseline: 358 tests / 352 pass / 3 fail / 3 skip; tsc exit=0; failures = AC-R36-21/30/31; skips = AC-R29-12/R34-21/R38-4 | PASS | Spec § 3 encodes baseline with empirical claim. Cross-checked: at HEAD `node --test test/*.test.js` yields 361/355/3/3 — exactly 358+3 = 361 (q41 file adds 3 GREEN tests). Failing tests at HEAD (`^✖` in /tmp/r41-test-output.log) = exactly AC-R36-21 + AC-R36-30 + AC-R36-31. Skipped tests = AC-R29-12, AC-R34-21, AC-R38-4. Math consistent. tsc exit confirmed empirically: `npx tsc -p tsconfig.test.json` → 0. Baseline back-derivation: 361 − 3 = 358 (matches). Note: AC-R41-1 is a self-attestation of pre-impl state; back-derivation from post-impl state is structurally sound here because q41's 3 tests are additive-pass-only. |
| AC-R41-2 | 40/40 vendored files carry `VENDORED FROM DeploySignal main@5a72371` header; 7 anchor methodology files exist | PASS | Spot-checked 5 vendored files (`engine/detectors/_linalg.ts`, `engine/types/agent.ts`, `engine/topology-overlay.ts`, `test/betting-e-process-class-dispatch.test.ts`, `tools/curate-baseline-pipeline.ts`) — all carry the expected first-line header. Anchor methodology files: `CLAUDE-COORDINATOR.md`, `templates/{WAVE-PLAN,CLUSTER-HANDOFF,WAVE-GATE,COORDINATOR-MEMORIAL,PROJECT-ROLES}-TEMPLATE.md`, `templates/README.md` — all 7 exist (verified `ls`). |
| AC-R41-3 | All grep'd relative paths exist or documented in hygiene stamp with disposition; zero unresolved broken paths silently | PARTIAL | Hygiene stamp § 7 Surface 1 documents 4 categories (Type A/B/C/D) of broken-path dispositions. Spot-verified Type C: `coordination/PHASE-2-CLOSE-WALK.md:152` does reference `Q-R24-SPEC.md` (which doesn't exist; expected — Coordinator role). BUT the underlying audit was non-exhaustive: MEMORIAL R41 CONFIRMATION `artifact-link-surface1` admits "Grepped ~15 key Phase 2 coordination artifacts" — spec § 3 prescribes "~25 Phase 2 coordination artifacts". 40% scope reduction not disclosed in the hygiene stamp itself. See MINOR-2. |
| AC-R41-4 | PHASE-3-CANDIDATES-PRELIMINARY.md § 5.1, § 6 table, OQ-P3-5 updated to reflect Rule 7 canonical; phrase "Status unknown at R40 entry" absent from § 6 Rule 7 row | PASS | `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:252-257` (§ 5.1 dependency note + OQ-P3-5 RESOLVED line); `:326` (§ 6 table Rule 7 row, "CONFIRMED" with citation to `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`); `:379` (OQ summary table, strikethrough + RESOLVED). Verified canonical landing at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` (Rule 7 reference line) and `:3474-3478` (full Rule 7 reinforcement text). `q41-hygiene-audit.test.ts:13-25` GREEN. |
| AC-R41-5 | 5 STAGED items annotated with `**Status at R41:**` headings | PASS | `coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md` — 5 `**Status at R41:**` markers present at lines 9 (Item 1 CLOSED-AT-R39), 109 (Item 2 CLOSED-AT-R36), 125 (Item 3 CLOSED/FORWARDED), 176 (Item 4 FORWARDED-TO-PHASE-3-CANDIDATES), 211 (Item 5 CLOSED-AT-R39). Test `q41-hygiene-audit.test.ts:49-66` GREEN (counts exactly 5). |
| AC-R41-6 | File renamed STAGED-FOR-PHASE-2-CLOSE.md → STAGED-PHASE-2-CLOSED-2026-05-19.md (original gone) | PASS | `git diff --stat -M 622164c ae7c438` shows `…LOSE.md => STAGED-PHASE-2-CLOSED-2026-05-19.md` (rename detected). Old path `coordination/STAGED-FOR-PHASE-2-CLOSE.md` does not exist (`ls` returns "No such file"). New path exists with 5 lifecycle annotations. |
| AC-R41-7 | Every `coordination/*.md` file is either (a) referenced in ≥1 other artifact, or (b) listed in hygiene stamp as potentially-orphaned with disposition. No files silently unaccounted | FAIL | The hygiene stamp `:173-174` asserts: "No genuine orphans found. All coordination/*.md files checked have at least one reference in another coordination artifact, spec, review, or MEMORIAL." This is the load-bearing claim. The R41 MEMORIAL CONFIRMATION `orphan-detection-surface2` (added in chore-A diff) admits: "Checked 9 potentially-orphaned coordination files for cross-references." Only 9 of ~50 `coordination/*.md` files were empirically referenced-checked; the remaining files are claimed-but-not-empirically-shown to have references. The blanket claim "All ... checked have at least one reference" overreaches the evidence base. See MAJOR-1. |
| AC-R41-8 | Hygiene stamp file exists with all 7 required sections | PASS | `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md` exists. Sections § 1 (chain duration), § 2 (rounds+tasks), § 3 (7 rules lineage), § 4 (Phase 2 deliverable inventory), § 5 (cluster fan-out statistics), § 6 (methodology friction), § 7 (operator wakes to...) — all present. Test `q41-hygiene-audit.test.ts:28-46` GREEN. (Test substring checks are weak — see MINOR-3 — but the sections themselves are structurally present on visual review.) Note: § 4 contains a count discrepancy — see MINOR-1. |
| AC-R41-9 | `git diff 622164c ae7c438 --name-only` ⊆ ALLOWED_SET; zero engine/* paths; zero pre-existing test/*.test.{ts,js} modifications | PASS | `git diff 622164c ae7c438 --name-only` = {`coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md`, `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`, `coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md`, `coordination/specs/Q-R41-SPEC.md`, `test/q41-hygiene-audit.test.ts`}. All 7 paths ⊆ ALLOWED_SET enumerated in spec § 4 AC-R41-9. No `engine/*`; no modification of pre-existing test files (only new q41 file added). Post-chore-A diff (`ae7c438..HEAD`) modifies NEXT-ROLE.md, Q-R41-SPEC.md (SHA backfill), test/q41-hygiene-audit.test.ts (SHA-comment backfill), PHASE-2-CLOSED-HYGIENE-STAMP.md (count formatting) — all still ⊆ ALLOWED_SET. |
| AC-R41-10 | At chore-A SHA: tests=358+3=361, pass=352+3=355, fail=3 (AC-R36-21/30/31), skip=3; tsc exit=0 | PASS | Empirically re-ran `node --test test/*.test.js` at HEAD (post-backfill commits are doc-only and do not change test logic between chore-A and HEAD): tests=361, pass=355, fail=3, cancelled=0, skipped=3, todo=0 (`/tmp/r41-test-output.log`). Failing tests by name: AC-R36-21, AC-R36-30, AC-R36-31 (exact match). Skipped tests by name: AC-R29-12, AC-R34-21, AC-R38-4 (exact match). `npx tsc -p tsconfig.test.json` → exit 0. All four count fields match the AC's prescription verbatim. |

**Verdict line:** 1 FAIL (AC-R41-7) + 1 PARTIAL (AC-R41-3) + 8 PASS. The FAIL is structural (load-bearing claim contradicts evidence base) but does not affect any production code or block Phase 3 entry-prep — see § 2 MAJOR-1 disposition.

---

## § 2 — Findings

### MAJOR-1 — Hygiene stamp orphan-detection claim overreaches the evidence base

**File:** `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md:173-174` vs `coordination/MEMORIAL.md` R41 CONFIRMATION `orphan-detection-surface2` (added in chore-A commit `ae7c438`).

**The contradiction:**
- Hygiene stamp claim (load-bearing morning-of artifact for the operator): *"No genuine orphans found. **All coordination/\*.md files checked** have at least one reference in another coordination artifact, spec, review, or MEMORIAL."*
- MEMORIAL CONFIRMATION (the empirical attestation underlying the claim): *"AC-R41-7: **Checked 9** potentially-orphaned coordination files for cross-references. All files have ≥1 reference in other coordination artifacts (PROJECT-CONTEXT: referenced by ARCHITECT-REPLY + MEMORIAL; STAGED-FOR-WU-05-SCOPE: referenced by WAVE-GATE-02 + wu-05-slice-3-close-walk.md; etc.)."*

`ls coordination/*.md | wc -l` ≈ 30 top-level + many more under `coordination/specs/`, `coordination/reviews/`, `coordination/logs/`, `coordination/diagnostics/`. The MEMORIAL admits the audit empirically covered "9 potentially-orphaned" files — a small subset. The hygiene stamp generalizes to "all ... checked." Spec AC-R41-7 verdict line says "No files **silently unaccounted**"; the ~40+ unchecked files are precisely "silently unaccounted" insofar as the hygiene stamp's blanket claim does not document them individually.

**Why this matters now:** The hygiene stamp IS the operator's morning-of-2026-05-19+ read-on-wake artifact (spec § 1 + spec § 3 Surface 7). Its claims are routed to operator decision-making without the MEMORIAL cross-reference. The pattern is the cross-project Rule 1 (`false-compliance-attestation`) class: reframing a limited-scope audit as a comprehensive one is the named anti-pattern.

**Severity rationale (MAJOR, not CRITICAL):**
- No production code affected (R41 ships zero engine/* changes).
- The audit *did* check the higher-risk candidates (one-off historical artifacts: OVERNIGHT-LOG-*, PR-F5-INVESTIGATION-R16, SCOPING-MEMO-BASELINE-CURATION-v0.2, etc.); I independently verified those have references (Grep `PROJECT-CONTEXT.md|SCOPING-MEMO-BASELINE-CURATION` returned 18 hit-files; `OVERNIGHT-LOG-2026-05-17` returned 17 hit-files). So the *substantive* conclusion ("no genuine orphans") is plausible.
- BUT the verifiability gap stands: the hygiene stamp itself does not enumerate which 9 files were checked, so a future reader cannot reproduce the audit from the stamp alone.

**Recommended disposition (Reviewer, not Implementer authority):** Operator-route. Either (a) tighten the hygiene stamp § 7 Surface 2 sentence to "9 potentially-orphaned candidates spot-checked; all have references — see MEMORIAL `orphan-detection-surface2` for the per-file evidence" (factual reframe), or (b) close out the audit by enumerating every `coordination/*.md` and stamping referenced-by per file (the literal AC-R41-7 deliverable). Option (a) is the lower-cost true claim; option (b) is the full literal-spec close. Either way: do NOT leave the load-bearing morning-of artifact with an overreaching attestation.

### MINOR-1 — Hygiene stamp § 4 CLUSTER-HANDOFF count is wrong

**File:** `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md:95` ("CLUSTER-HANDOFF artifacts | `coordination/CLUSTER-HANDOFF-*.md` | ✅ (11 files) | multi-cluster chain").

**Evidence:** `ls coordination/CLUSTER-HANDOFF-*.md | wc -l` → **15**, not 11. Enumerated: 3 × Wave-1 handoffs (WU00-WU01/02/03) + 5 × Wave-2-to-WU05 (WU00/01/02/03/04 → WU05) + 6 × Wave-3-to-WU06 (WU00/01/02/03/04/05 → WU06) + 1 × Wave-4 (WU06 → WU07) = 15.

**Why it matters:** § 4 is the "Phase 2 deliverable inventory cross-check" — load-bearing for the morning-of "all deliverables on-disk" assertion at line 103. An off-by-4 count in this table is the kind of arithmetic the morning-of artifact is supposed to certify. Same hygiene round's spec § 7 grilling claims "every AC has a verifiable outcome" — and yet this table cell is verifiable and got it wrong.

**Recommended fix (operator-routed; low risk):** update the table cell to "(15 files)" before Phase 3 entry-prep. No code or logic change.

### MINOR-2 — Surface 1 artifact-link audit scope reduction undisclosed in hygiene stamp

**Files:** `coordination/specs/Q-R41-SPEC.md:82` (spec § 3 Surface 1+2 prescribes "~25 Phase 2 coordination artifacts") vs `coordination/MEMORIAL.md` R41 `artifact-link-surface1` CONFIRMATION (admits "Grepped ~15 key Phase 2 coordination artifacts").

**Evidence:** The MEMORIAL CONFIRMATION explicitly narrows the scope from ~25 → ~15 ("~15 key"). Hygiene stamp § 7 Surface 1 findings classify dispositions but do not name or enumerate which 15-of-25 artifacts were actually grep'd. The 10 unchecked artifacts are not listed. The "Type A through Type D" classification is presented as if exhaustive over the full ~25.

**Why MINOR (not MAJOR):** Same class of finding as MAJOR-1 but lower-blast-radius — broken-path documentation is a less load-bearing surface than orphan detection (broken paths surface to humans at read-time; missed orphan-references do not).

**Recommended fix:** disclose the scope reduction in hygiene stamp § 7 Surface 1 OR complete the remaining ~10 artifacts before Phase 3 entry-prep.

### MINOR-3 — Test AC-R41-8 keyword-substring checks are weak (self-confirming risk)

**File:** `test/q41-hygiene-audit.test.ts:33-46` (AC-R41-8 test).

**Evidence:** The test loops over 7 lowercase keyword markers ("chain duration", "rounds", "cross-project rules", "Phase 2 deliverable", "cluster", "friction", "Operator wakes") and asserts `content.toLowerCase().includes(marker.toLowerCase())`. Two of the seven — "rounds" and "cluster" — are generic words that appear throughout the document outside their dedicated sections:
  - "rounds" appears in § 1, § 2, § 4 (deliverable notes), § 5, § 6. A hygiene stamp missing § 2 entirely would still pass this test.
  - "cluster" appears in § 4 deliverable rows ("Common-mode attribution", "cluster substrate"), § 5, § 7. A hygiene stamp missing § 5 cluster fan-out section would still pass this test.

**Right-reasons-audit consequence:** the test does not structurally enforce the 7-sections AC. It is the kind of substring-presence check that is satisfied incidentally by the wider document rather than by the section's actual presence. The substantive AC ("all 7 required sections") is verified by visual review (which I did do — sections present), but the *test* itself is not load-bearing.

**Recommended fix:** strengthen substring patterns to section-identifying anchors (e.g., `## § 5 — Cluster fan-out`) or use a regex over heading lines. No need to re-fire R41 over this — record for next round.

### MINOR-4 — Test AC-R41-4 "RESOLVED" check is weak (self-confirming risk)

**File:** `test/q41-hygiene-audit.test.ts:24` (`assert.ok(content.includes('RESOLVED'), 'OQ-P3-5 not marked RESOLVED')`).

**Evidence:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` contains "RESOLVED" at multiple locations (§ 5.1 line 256, § 6 table line 326, OQ summary table line 379, others). The test passes if any "RESOLVED" appears anywhere — it does not anchor to OQ-P3-5 specifically. If a future edit removed only the OQ-P3-5 RESOLVED marker but left others, the test would still pass and silently miss the regression.

**Recommended fix:** anchor the assertion to OQ-P3-5 by searching for the joint pattern `OQ-P3-5.*RESOLVED` (regex) or the literal "OQ-P3-5: RESOLVED" substring.

### MINOR-5 — TDD letter (assert.fail stubs) not met; spirit met

**Files:** `coordination/specs/Q-R41-SPEC.md:91-92` (spec § 3 mandate: "RED commit with 3 stub tests (assert.fail stubs) before any implementation") vs `test/q41-hygiene-audit.test.ts` at RED commit `2a5e3ba` (`git show 2a5e3ba:test/q41-hygiene-audit.test.ts | grep -c assert.fail` → 0).

**Evidence:** The RED commit's test file is identical to the final test file modulo the chore-A SHA backfill comment. No `assert.fail` stubs were ever written; the RED commit landed real assertions that happened to fail at RED because preconditions (hygiene stamp existence, file rename, "Status unknown" replacement) were not yet met.

**Spirit-vs-letter analysis:** TDD spirit (red commit precedes green; tests genuinely fail at red) is met empirically — verified by `git cat-file -e 2a5e3ba:coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md` returning DOES_NOT_EXIST, `git show 2a5e3ba:coordination/PHASE-3-CANDIDATES-PRELIMINARY.md | grep -c "Status unknown at R40 entry"` → 1, and `git cat-file -e 2a5e3ba:coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md` returning DOES_NOT_EXIST. All 3 q41 tests would have failed at RED. So TDD discipline is substantively met. But the spec's literal mandate ("assert.fail stubs") was bypassed without disclosure.

**Recommended fix:** none required this round (spirit met). For future rounds: either (a) drop the literal "assert.fail stubs" requirement from the audit-tier TDD section of role files (since real-assertion-against-unmet-precondition is a stronger RED than `assert.fail`), or (b) actually use `assert.fail` stubs when spec mandates it.

### OBS-1 — AC test-code coverage is sparse (audit-tier shape)

**File:** `test/q41-hygiene-audit.test.ts` (3 tests covering AC-R41-4, AC-R41-5/6, AC-R41-8).

**Observation:** 6 of 10 ACs (AC-R41-1, -2, -3, -7, -9, -10) have NO test-code coverage; they are verified by spec attestation + Reviewer audit only. This is the expected shape of an audit-tier doc-content round (spec § 3 "TDD for q41 test file: RED commit with 3 stub tests"), but it shifts the verification load entirely onto cold-eye Reviewer.

**No action required.** Noted for round-shape transparency.

### OBS-2 — `.js` file in ALLOWED_SET is gitignored and never appears in any diff

**File:** `coordination/specs/Q-R41-SPEC.md:108` (AC-R41-9 ALLOWED_SET includes `test/q41-hygiene-audit.test.js`).

**Observation:** `*.js` is gitignored per `.gitignore`. The compiled `.js` file exists on disk (Glob found it) but never appears in `git diff`. Including it in the ALLOWED_SET is harmless but redundant — the AC verification (a name-only diff) cannot produce a `.js` path to match against. No incorrectness, just a load-bearing-vs-decorative path mix.

**No action required.**

### OBS-3 — Forward-protection guards (AC-R36-21/30/31) failures correctly characterized as pre-existing

**Observation:** All 3 failing tests (AC-R36-21 CLAUDE-IMPLEMENTER.md count guard, AC-R36-30 R36-round-start-to-chore-A diff, AC-R36-31 chore-A-to-HEAD diff) are R36 forward-protection guards that fail because R37-R41 added files & modified CLAUDE-IMPLEMENTER.md. This is the designed behavior of forward-protection — and the R41 spec acknowledges it (AC-R41-1 + AC-R41-10 both bake in "fail=3" with these exact names). Empirical re-run confirms exact-match: failing test names are AC-R36-21/30/31, no others.

**No action required.**

---

## § 3 — Right-reasons audit (3 tests)

I picked the 3 tests in `test/q41-hygiene-audit.test.ts` since that file is the entire R41-authored test surface.

### Test 1 — `AC-R41-4: PHASE-3-CANDIDATES-PRELIMINARY.md acknowledges Rule 7 canonical status` (`test/q41-hygiene-audit.test.ts:13-25`)

**Spec requirement traced:** Q-R41-SPEC.md AC-R41-4 (Surface 6 fix — § 5.1 + § 6 table + OQ-P3-5 row updated to reflect Rule 7 canonical landing at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`).

**Three assertions in the test:**
1. **Negative substring check:** `!content.includes('Status unknown at R40 entry')`. **Right reasons:** this is structurally tight — it tests the exact pre-fix string that the spec § 3 Surface 6 explicitly cites as needing replacement. If the fix were partially-applied (e.g., § 5.1 fixed but § 6 not), this would catch it because the § 6 cell was the originator of the "Status unknown at R40 entry" wording.
2. **Positive substring check:** `content.includes('CROSS-PROJECT-MEMORIAL.md:3470')`. **Right reasons:** strong — the spec-named canonical landing location. Independent of where the citation appears in the file.
3. **Positive substring check:** `content.includes('RESOLVED')`. **Self-confirming risk: HIGH.** Generic substring — the file contains multiple "RESOLVED" instances unrelated to OQ-P3-5. See MINOR-4. The test passes for the *right* reason (OQ-P3-5 row line 379 IS RESOLVED) but the *test* would also pass for wrong reasons if any other "RESOLVED" remained.

**Overall verdict:** Test passes because the code is correct. The first two assertions are not self-confirming; the third is.

### Test 2 — `AC-R41-8: PHASE-2-CLOSED-HYGIENE-STAMP.md exists with required sections` (`test/q41-hygiene-audit.test.ts:28-46`)

**Spec requirement traced:** Q-R41-SPEC.md AC-R41-8 (Surface 7 hygiene stamp exists with 7 sections per spec § 3 Surface 7 / NEXT-ROLE.md § Surface 7).

**Assertion shape:** file existence + 7 lowercase-keyword substring checks.

**Right-reasons analysis:** The file-existence check is strong. The 7 substring checks are weak — particularly "rounds" and "cluster" — see MINOR-3 for analysis. Verifying that the test passes for the *right* reason required me to visually open the hygiene stamp and check that all 7 sections (§ 1 wall-clock chain duration, § 2 rounds+tasks, § 3 7-rules lineage, § 4 deliverable cross-check, § 5 cluster fan-out, § 6 friction surfaces, § 7 operator wakes to...) are structurally present with the expected headings. They are. So the test passes for the right reason, but the *test* wouldn't have caught a missing § 2 or § 5.

**Overall verdict:** Test passes for the right reason but the assertion shape is self-confirming. The substantive AC is met; the test design is weak.

### Test 3 — `AC-R41-5/6: STAGED-FOR-PHASE-2-CLOSE.md annotated and renamed` (`test/q41-hygiene-audit.test.ts:49-66`)

**Spec requirement traced:** Q-R41-SPEC.md AC-R41-5 (5 lifecycle annotations on STAGED items) + AC-R41-6 (rename condition met).

**Assertion shape:** disjunctive (renamed-file-exists OR original-file-still-has-annotations); strict count = 5 on `**Status at R41:**` markers.

**Right-reasons analysis:** Strict count assertion is structurally tight. If 4 items were annotated (one missed), the test fails. If 6 (one duplicate), the test fails. Independent verification: grep showed 5 markers at lines 9, 109, 125, 176, 211 of the renamed file. Items: 1 (CLOSED-AT-R39), 2 (CLOSED-AT-R36), 3 (CLOSED/FORWARDED), 4 (FORWARDED-TO-PHASE-3-CANDIDATES), 5 (CLOSED-AT-R39). All five items have substantive disposition rationale. Rename: `git diff --stat -M 622164c ae7c438` shows rename detected → AC-R41-6 verified.

**Overall verdict:** Test passes for the right reason; assertion is not self-confirming.

**Summary of right-reasons audit:** 2 of 3 tests pass for the right reason without self-confirming risk; 1 of 3 (AC-R41-4) has a partial self-confirming risk (third assertion); 1 of 3 (AC-R41-8) is structurally self-confirming on 2 of 7 keywords. No test is *traceably wrong*, but the test design has weakness recorded in MINOR-3 and MINOR-4.

---

## § 4 — Cross-cutting checks

### TDD discipline
**Evidence:** git history shows separate spec / RED / GREEN commits with monotonic timestamps and intent-clear messages:
- `74d3fed` `spec(R41-spec): Q-R41-SPEC.md — repo hygiene audit (audit-tier)` (spec only; no test or impl).
- `2a5e3ba` `feat(R41-red): test/q41-hygiene-audit.test.ts — RED stubs for 3 ACs` (test file only, 66 lines).
- `f5616c5` `feat(R41-green): surfaces 5,6,7 — hygiene stamp + staged lifecycle + Rule 7 fix` (impl: hygiene stamp + Rule 7 fix + STAGED rename, no test changes).
- `ae7c438` `chore(R41): coordination artifacts — NEXT-ROLE REVIEWER + MEMORIAL entries` (chore-A; coordination only).

RED was empirically failing (preconditions structurally unmet at RED — see MINOR-5 evidence chain). Spirit met. Letter (assert.fail stubs) not met — MINOR-5.

### No-skip discipline
No new skips introduced in R41. The 3 pre-existing skips (AC-R29-12, AC-R34-21, AC-R38-4) are subprocess-hang guards correctly inherited from R29/R34/R38 mitigations. Audit-tier doc round; no statistical-invariant tests touched.

### Anti-scope
`git diff 622164c ae7c438 --name-only` = 7 paths, all ⊆ ALLOWED_SET as listed in spec § 4 AC-R41-9. Zero `engine/*` paths. Zero modification of any pre-existing `test/*.test.ts` file. Post-chore-A backfills (`ae7c438..a2e6d8e`) touch only ALLOWED_SET paths.

**Anti-scope leak audit:** none found. The rename of STAGED-FOR-PHASE-2-CLOSE.md → STAGED-PHASE-2-CLOSED-2026-05-19.md is enumerated in the ALLOWED_SET (both old and new path are functionally accounted for via the git rename detection); the ALLOWED_SET listing of the new path is correct.

### Halt-discipline
Spec § 6 names 4 halt conditions (orphan reveals missing deliverable; vendoring drift; baseline drift > ±3 fails; STAGED item disposition reveal); spec § 1 + spec § 6 + NEXT-ROLE.md § Halt conditions enumerate the trigger surface. No halt fired. The substantive deviations from spec (~25 → ~15 artifact scope; "all checked" claim vs 9 checked) are not halt-condition-triggers per the spec's literal list — they are completeness gaps that surfaced at Reviewer time, which is the designed audit-tier shape.

### Rule 1 (false-compliance-attestation) cross-project compliance
MAJOR-1 IS a Rule 1 sub-class: the hygiene stamp's "All ... checked" attestation contradicts the MEMORIAL's "Checked 9". This is precisely the named anti-pattern. Surfacing it here.

---

## § 5 — Pre-emit grilling on this report

| Gate | Verdict |
|---|---|
| Every finding has a file:line reference? | YES. MAJOR-1 cites `:173-174` + MEMORIAL R41 entry. MINOR-1 cites `:95`. MINOR-2 cites Q-R41-SPEC.md `:82` + MEMORIAL R41. MINOR-3 cites `test/q41-hygiene-audit.test.ts:33-46`. MINOR-4 cites `:24`. MINOR-5 cites spec `:91-92` + RED SHA `2a5e3ba`. |
| Any AC marked PASS without actual verification? | NO. Every PASS row has concrete file-content evidence, empirical test-run evidence (`/tmp/r41-test-output.log`), or git-diff evidence. AC-R41-1 self-attestation is back-derived from at-HEAD empirical math (with reasoning stated). |
| Right-reasons audit completed for 3+ tests? | YES. 3 tests audited (the entire q41 test file). 1 has structural self-confirming risk (MINOR-3); 1 has partial self-confirming risk (MINOR-4); 1 is structurally tight. |
| Adversarial mandate honored (≥1 finding)? | YES. 1 MAJOR + 5 MINOR + 3 OBS = 9 findings. Zero rubber-stamp. |
| Scope boundary respected (no fixes by Reviewer)? | YES. All findings record recommendations; none applied. |
| Did I read the load-bearing artifacts cold? | YES. Read Q-R41-SPEC.md, all R41-modified `coordination/*.md` files, the q41 test file, and a representative slice of source/test deliverables for AC-R41-2 cross-check. Did NOT read coordination/diagnostics/, coordination/logs/, .prompt-*.md, or REVIEWER-REPORT-R40.md (cold-eye discipline). |

All gates pass.

---

## § 6 — Routing

**STATUS:** MERGE-READY

**Disposition:** Zero CRITICAL findings. The MAJOR-1 finding is structural-claim accuracy in a doc-only artifact (hygiene stamp); it does not block Phase 3 entry-prep but should be cleaned up by operator before the operator routes Phase 3. The 5 MINOR + 3 OBS are improvement notes for future-round design (test assertion sharpening; count-correctness in summary artifacts; TDD literal-vs-spirit clarification) and do not block routing.

**Memorial Updater inputs:**
- MAJOR-1 (orphan-detection overreach; Rule 1 sub-class candidate — 2nd-or-3rd tessera instance? Memorial Updater verifies threshold)
- MINOR-1..MINOR-5 (each individually below 3-instance threshold; aggregate)
- OBS-1..OBS-3 (round-shape transparency only)
- Confirmations: TDD spirit met; anti-scope clean; baseline encoding verbatim; vendoring intact; right-reasons audit independently completed.

---

_Reviewer: Opus 4.7 (cold-eye, single-pass; HYBRID_REVIEWER=false for audit-tier per established discipline). Report sealed at 2026-05-19._
