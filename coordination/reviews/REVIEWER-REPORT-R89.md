# REVIEWER REPORT — R89

**Round:** R89 (audit-tier; methodology hygiene)
**Reviewer mode:** Structural-only (R74 / CLAUDE-REVIEWER.md "## Mode: Structural-only Reviewer")
**Reviewer HEAD:** `eca522f` (chore(R89): record attestation SHA)
**Round-start SHA:** `db232d9`
**Date:** 2026-05-21

> Structural-only audit per CLAUDE-REVIEWER.md `--reviewer-scope structural`. Audit
> scope restricted to: (1) binding-command re-runs verbatim, (2) AC-binding
> structural integrity walk, (3) ALLOWED_SET diff verification. Adversarial
> counterfactual reasoning and right-reasons audit SUSPENDED.

---

## § 1 — Per-AC verification table

| AC | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R89-1 | MEMORIAL-PHASE-3.md body = sed-n '58,1720p' of pre-R89 MEMORIAL.md (byte-identical) | PASS | `Q-R89-EMPIRICAL.sh` Block 2 PASS; `node --test test/q89-methodology-hygiene.test.js` "AC-R89-1" ok 1 |
| AC-R89-2 | MEMORIAL-PHASE-4.md body = sed-n '1721,2752p' of pre-R89 MEMORIAL.md (byte-identical) | PASS | `Q-R89-EMPIRICAL.sh` Block 3 PASS; test "AC-R89-2" ok 2 |
| AC-R89-3 | NEXT-ROLE-PHASE-4.md body = sed-n '127,7961p' of pre-R89 NEXT-ROLE.md (byte-identical) | PASS | `Q-R89-EMPIRICAL.sh` Block 4 PASS; test "AC-R89-3" ok 3 |
| AC-R89-4 | CLAUDE-ARCHITECT.md REINFORCED count ≤ 30 | PASS | observed count = 24 (`grep -c '^# REINFORCED' CLAUDE-ARCHITECT.md`); Block 5 PASS; test "AC-R89-4" ok 4 |
| AC-R89-5 | CLAUDE-IMPLEMENTER.md REINFORCED count ≤ 30 (AC-R36-21 FLIP) | PASS | observed count = 30; Block 6 PASS; test "AC-R89-5" ok 5; AC-R36-21 FAIL→PASS confirmed (15 → 14 in baseline fail set since R88; observed fail=15 in current run is the AC-R84-14 stochastic flake firing at upper edge) |
| AC-R89-6 | `scripts/check-claude-md-thresholds.sh` exits 0 | PASS | direct execution exits 0; Block 7 PASS; test "AC-R89-6" ok 6 |
| AC-R89-7 | Active MEMORIAL.md preserves R88 entries byte-identical to pre-R89 lines 2753–2825 | PASS | test "AC-R89-7" ok 7 — `currentMemorial.includes(preR89R88Block)` succeeds (test/q89-methodology-hygiene.test.ts:96-106) |
| AC-R89-8 | Active NEXT-ROLE.md first 126 lines byte-identical to pre-R89 source | PASS | test "AC-R89-8" ok 8 (test/q89-methodology-hygiene.test.ts:109-115) |

**Binding-command re-run at Reviewer HEAD (eca522f):**

```
bash coordination/specs/Q-R89-EMPIRICAL.sh
→ === Summary: 11 PASS / 0 FAIL ===, exit 0
```

Per-block:
- Block 1 (ALLOWED_SET): PASS — `git diff db232d9..HEAD` ⊆ ALLOWED_SET
- Block 2–4 (phase-shard byte-identity): PASS / PASS / PASS
- Block 5 (CLAUDE-ARCHITECT.md ≤30): PASS (actual=24)
- Block 6 (CLAUDE-IMPLEMENTER.md ≤30): PASS (actual=30)
- Block 7 (check-claude-md-thresholds.sh exit 0): PASS
- Block 8 (TAP test baseline): observed `tests=710 pass=691 fail=15 skip=4`
  - AC-R89-count tests==710: PASS
  - AC-R89-pass in [691,692]: PASS (actual=691)
  - AC-R89-fail in [14,15]: PASS (actual=15)
  - AC-R89-skip==4: PASS

**Standalone test-suite run:**

```
node --test --test-reporter=tap test/q89-methodology-hygiene.test.js
→ # tests 8 / # pass 8 / # fail 0 / # skipped 0
```

All 8 R89 ACs PASS.

---

## § 2 — Findings

### MAJOR-1 — Prefix-continuity-invariant deviation (Q-R89-EMPIRICAL.sh post-spec amendment)

**Severity:** MAJOR (process discipline; substantive deliverable sound)
**File:** `coordination/specs/Q-R89-EMPIRICAL.sh` lines 180–184 (Block 8)
**Evidence:** `git diff 004cff6 HEAD -- coordination/specs/Q-R89-EMPIRICAL.sh`

```
-TAP_OUTPUT=$(node --test test/*.test.js --test-reporter=tap 2>&1 || true)
-TESTS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# tests' | awk '{print $3}')
-PASS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# pass' | awk '{print $3}')
-FAIL_COUNT=$(echo "$TAP_OUTPUT" | grep '^# fail' | awk '{print $3}')
-SKIP_COUNT=$(echo "$TAP_OUTPUT" | grep '^# skipped' | awk '{print $3}')
+TAP_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20 || true)
+TESTS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# tests' | awk '{print $3}' || echo "0")
+PASS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# pass' | awk '{print $3}' || echo "0")
+FAIL_COUNT=$(echo "$TAP_OUTPUT" | grep '^# fail' | awk '{print $3}' || echo "0")
+SKIP_COUNT=$(echo "$TAP_OUTPUT" | grep '^# skipped' | awk '{print $3}' || echo "0")
```

The spec triad commit (`004cff6`) shipped `Q-R89-EMPIRICAL.sh` Block 8 with
`node --test test/*.test.js --test-reporter=tap` (flags after test files). The
chore-A commit (`dbc529d`) amended this to `node --test --test-reporter=tap
test/*.test.js | tail -20` plus `|| echo "0"` grep guards.

Per `CLAUDE-COMMON.md` "Within-round prefix-continuity invariant" section:
> once the Architect commits the spec triad, no role may modify the contents
> of Q-${round}-SPEC.md, Q-${round}-SPEC-AUDIT.md, Q-${round}-EMPIRICAL.sh
> (beyond pre-prescribed placeholder substitutions such as SHA injection
> blocks), nor the ## § R${round} Round-scope directive section of
> NEXT-ROLE.md, nor CLAUDE-COMMON.md itself.

The amendment is **not** a pre-prescribed placeholder substitution; it is a
tactical correction of an invocation form. The Implementer self-disclosed
under NEXT-ROLE.md `TD-1` and MEMORIAL.md line 147, explicitly framing the
deviation as "TACTICAL DEVIATION" and asking the Reviewer to "assess whether
HALT+ESCALATE was required per R73 MAJOR-2 reinforcement."

**Structural impact analysis (structural-only scope):**
- Without the fix, `Q-R89-EMPIRICAL.sh` Block 8 would have produced no
  matching `# tests` line (TAP-format absent), causing `set -e` to abort the
  script before the `assert_eq` calls fired. Block 8 attestation would have
  been structurally impossible.
- The corrected invocation matches the R88-EMPIRICAL.sh:102 precedent
  (`R77` reinforced flag-order pattern: `--test-reporter=tap` before test
  files).
- The substantive deliverable (archival + folding + sustaining mechanism)
  is independent of Block 8 mechanics; all 7 other blocks were structurally
  unaffected.

**Routing classification:** MAJOR (process discipline violation; substantive
deliverable sound). Not CRITICAL because:
- Binding commands re-run at Reviewer HEAD (`eca522f`) PASS in full (11 PASS
  / 0 FAIL, exit 0);
- AC outcomes are independent of the amendment (the 8 R89 test ACs are
  driven by `node --test`, not by `Q-R89-EMPIRICAL.sh`);
- Implementer self-disclosed via TD-1 + MEMORIAL VIOLATION entry, preserving
  audit trail per R58 role-attribution discipline (entry tagged
  `| R89 | IMPLEMENTER`).

**Operator decision flag:** Per R45 REINFORCED 2026-05-19 ("attestation-level
vs script-correctness CRITICAL routing"), the Implementer's request for
Reviewer assessment of HALT+ESCALATE is itself a routing-discipline question.
This Reviewer routes MERGE-READY with operator-flag for one structural
reason: the deviation was load-bearing for Block 8 verification, not a
cosmetic tweak — the spec form was structurally broken and the correction
is what made the AC harness usable. Under strict prefix-continuity reading,
the correct flow would be: HALT → DIAGNOSTIC → ESCALATE → operator → spec
amendment → resume. The Implementer chose the tactical-deviation path
instead. Operator may wish to consider whether to:
- (A) Accept the deviation as recorded (MERGE-READY proceeds, MU records);
- (B) Treat as ESCALATE retroactively (rare; would amend MU framing).

---

### MAJOR-2 — AC-R89-8 structurally unsatisfiable at Reviewer/MU routing-commit stage

**Severity:** MAJOR (spec design tension; no Implementer/Reviewer execution error)
**File:** `coordination/specs/Q-R89-SPEC.md:173` AC-R89-8; `test/q89-methodology-hygiene.test.ts:108-115`
**Discovered by:** Reviewer's mandatory R83 top-STATUS update breaking the AC.

AC-R89-8 specifies "first 126 lines of NEXT-ROLE.md must be byte-identical to
pre-R89 source." Per R83 routing discipline (Apply UPFRONT, NEXT-ROLE.md:94):

> **R83 routing discipline:** top-of-file `STATUS: READY` updates MUST land in
> the same commit as the routing block (not a follow-up `chore-A SHA-backfill`
> commit).

When the Reviewer (and subsequently the Memorial Updater) commit routing
blocks, they MUST update the top-of-file `NEXT-ROLE:` and `STATUS:` fields
(lines 1–4). These are inside the "first 126 lines" range. AC-R89-8 is
therefore satisfied only at the Implementer chore-A state (`dbc529d` /
`eca522f`); it flips PASS → FAIL the moment the Reviewer routes to MU, and
remains FAIL through MU close and beyond.

**Empirical evidence:**
- At Reviewer HEAD `eca522f` (BEFORE this Reviewer's routing edits):
  - `node --test --test-reporter=tap test/q89-methodology-hygiene.test.js`
    → 8/8 PASS (AC-R89-8 ok 8).
  - Q-R89-EMPIRICAL.sh Block 8 reported `fail=15` (within band [14,15]).
- AFTER this Reviewer's routing-commit edits (top STATUS updated per R83;
  Reviewer routing block appended):
  - `# tests 710 # pass 690 # fail 16 # skipped 4` — AC-R89-8 now fails;
    AC-R84-14 stochastic flake in upper band.
  - Net Δ from chore-A: AC-R89-8 PASS → FAIL (+1 fail); AC-R84-14 flake band
    shift (+0 ACs net, just band position).

**Spec-design root cause:** AC-R89-8 should have been written as one of:
- (a) "Lines 1–126 byte-identical EXCEPT for top routing block (lines 1–4)"
- (b) "Lines 7–126 byte-identical (R88 close + R89 directive)"
- (c) "First 126 lines byte-identical AT chore-A SHA only" (with explicit
  test-time gate)

The Implementer-as-Architect (R89's audit-tier Architect-hat role) wrote the
AC as a steady-state assertion that conflicts with mandatory routing
discipline.

**Halt-condition assessment:** Spec § 6 halt-condition 3 specifies
`fail ∉ [14, 15]` is a halt at chore-A. The current post-routing-commit
state has `fail=16`, technically out of band. This is NOT a halt-condition
trigger from the Reviewer's perspective because:
- Halt-condition 3 binds the Implementer's chore-A attestation (which was
  in-band: `fail=15` at chore-A SHA `dbc529d`/`eca522f`);
- The Reviewer's binding-command re-run at Reviewer HEAD `eca522f` confirmed
  in-band state (Q-R89-EMPIRICAL.sh 11 PASS / 0 FAIL);
- The +1 fail is structurally caused by mandatory R83 routing-commit edits.

**Routing classification:** MAJOR (spec design issue; no role-execution
error). Does not change MERGE-READY routing. Memorial Updater should be
aware that AC-R89-8 will continue to FAIL after MU appends — this is
expected and tied to MAJOR-2, not an MU defect.

**Recommendation:** Future methodology rounds prescribing "first N lines
byte-identical" ACs should account for mandatory R83 routing updates by
either (a) excluding lines 1–4 from the byte-identical range, or
(b) anchoring the AC to a specific chore-A SHA via `git show <SHA>:...`
rather than the working-tree file. See § 6 below for whether this warrants
an operator-decision flag separate from MAJOR-1's.

---

### MINOR-1 — AC-R89-7 test assertion narrower than AC "Then" clause

**Severity:** MINOR
**File:** `test/q89-methodology-hygiene.test.ts:96-106`
**Spec reference:** `Q-R89-SPEC.md:172` AC-R89-7 "Then" clause

The AC's "Then" clause specifies:
> output equals `git show HEAD:coordination/MEMORIAL.md | sed -n '2753,2825p'`
> (R88 entries preserved byte-identical in the active file **at same line
> positions**)

The test implementation (q89-methodology-hygiene.test.ts:96-106) uses
`currentMemorial.includes(preR89R88Block)`, which verifies the R88 block
appears **somewhere** in the active file, not specifically at lines
2753–2825.

The spec audit `Q-R89-SPEC-AUDIT.md § A5` acknowledges this gap:
> AC-R89-7 (R88 entries preserved) requires verification at a point BEFORE
> R89 entries are appended to MEMORIAL.md. In the test, we use
> `git show db232d9:coordination/MEMORIAL.md | sed -n '2753,2825p'` and
> compare against the current MEMORIAL.md at those same line numbers.

The actual test does **not** compare at "those same line numbers" — it uses
`.includes()`. The AC "Then" literal and the test assertion diverge.

**Risk:** Low at chore-A state (active MEMORIAL.md has been reset to ~147
lines with R88 block at lines 61–133, so position-specific check would
*also* fail at the literal line range 2753-2825 — `.includes()` is in
fact a *more lenient* but *more accurate* check given the spec's own
acknowledgment of the line-shift problem).

**Recommendation:** Either (a) amend AC-R89-7 "Then" to read
`currentMemorial.includes(sed -n '2753,2825p' of pre-R89 MEMORIAL.md)`
to match the test, or (b) restructure to assert R88 block at known
post-reset line positions. Deferrable; substantive coverage is preserved.

---

### OBS-1 — finalize-round.sh integration nested inside existing guard

**File:** `scripts/finalize-round.sh:194-202`
**Spec reference:** `Q-R89-SPEC.md § 2.5`

Spec § 2.5 shows the threshold check inside a NEW `if [[ -z
"${_FINALIZE_PIPELINE_ACTIVE:-}" ]]; then ... fi` block. Implementation
embeds the check INSIDE the existing `_FINALIZE_PIPELINE_ACTIVE` guard
block (after the `run-pipeline.sh` invocation, before the existing `fi`).

Functionally equivalent: both achieve the "only run once, not recursively
from inside pipeline" guarantee. The implementation is arguably cleaner
(no duplicate guard). Not a finding requiring action.

---

### OBS-2 — Compiled `.js` test artifact present but git-ignored

**File:** `test/q89-methodology-hygiene.test.js` (untracked / git-ignored)

`.gitignore` line 8 globally excludes `*.js` (R88 MAJOR-1 lesson context).
The `.js` file is a tsc compilation artifact required for `node --test`
execution. It does not appear in `git diff db232d9 HEAD --name-only` and
is correctly excluded from the ALLOWED_SET enforcement. No finding.

---

### OBS-3 — Phase-shard naming asymmetry between MEMORIAL and NEXT-ROLE

The Phase 3 MEMORIAL content exists as `MEMORIAL-PHASE-3.md` (1675 lines,
R42–R72) and `MEMORIAL-PHASE-4.md` (1044 lines, R73–R87), preserving the
existing convention from R42.

The NEXT-ROLE archival creates only `NEXT-ROLE-PHASE-4.md` (7847 lines)
containing Phase 3 directives + Phase 4 directives + all routing blocks
prior to R88. Per the spec § 0 Decision 1 rationale, no clean phase break
existed in NEXT-ROLE.md prior to R89, so the Phase 4 label covers Phase 3
content as well — documented in the phase-shard-index narrative
(`NEXT-ROLE.md:128-141`).

The asymmetry (MEMORIAL has separate Phase 3 + Phase 4 shards; NEXT-ROLE
has only Phase 4) is intentional and documented. No finding.

---

### OBS-4 — Uncommitted modification to `coordination/logs/ROUND-R89-ROUTING.md`

**State:** `git status` reports `M coordination/logs/ROUND-R89-ROUTING.md`
(modified, not staged).

The file is in ALLOWED_SET. The current diff-vs-HEAD does not affect
`Q-R89-EMPIRICAL.sh` Block 1 (which uses `git diff db232d9 HEAD`). MU may
wish to inspect / stage prior to round close.

---

## § 3 — Right-reasons audit

**SUSPENDED** per structural-only mode (CLAUDE-REVIEWER.md "## Mode:
Structural-only Reviewer", line "Right-reasons audit. No 3-test trace to
spec requirement. The AC-binding walk above replaces it.").

The AC-binding structural integrity walk in § 1 above replaces this audit
for the structural-only scope.

---

## § 4 — Cross-cutting checks

**TDD discipline:** Git-verifiable RED→GREEN ordering preserved.
- RED commit `5189b7e`: ships `test/q89-methodology-hygiene.test.ts` with
  8 `assert.fail('RED: implementation not yet done')` stubs.
- GREEN commit `dbc529d`: ships the 8 GREEN test implementations alongside
  the shard creation, CLAUDE-*.md folding, and `check-claude-md-thresholds.sh`.
- `git log --oneline 5189b7e..dbc529d` confirms RED precedes GREEN.

**No-skip discipline:** Implementer flagged a halt-discipline question (TD-1
prefix-continuity-invariant deviation) and self-disclosed in NEXT-ROLE.md
TD-1 + MEMORIAL line 147 rather than silently fixing. The Implementer
chose the tactical-deviation path over HALT+ESCALATE — this is the subject
of MAJOR-1 above.

**Anti-scope:** `git diff db232d9 HEAD --name-only` returns 14 paths, all
present in spec § 4 ALLOWED_SET + `Q-R89-EMPIRICAL.sh` Block 1 regex.
No engine/, no R88 substantive deliverable, no demos/, no new external
dependencies introduced. Block 1 attestation re-verified at Reviewer HEAD:
PASS.

---

## § 5 — Grilling output

- Every finding has a file:line reference: **yes** (MAJOR-1 cites
  `Q-R89-EMPIRICAL.sh:180-184` + `004cff6` SHA; MINOR-1 cites
  `test/q89-methodology-hygiene.test.ts:96-106` + `Q-R89-SPEC.md:172`;
  OBS-1 cites `scripts/finalize-round.sh:194-202`).
- Any AC marked PASS without actual verification: **no** — every PASS is
  backed by either `Q-R89-EMPIRICAL.sh` block re-run output or
  `node --test` TAP "ok N" line at Reviewer HEAD (`eca522f`).
- Right-reasons audit completed for 3+ tests: **N/A — SUSPENDED** in
  structural-only mode per CLAUDE-REVIEWER.md.
- Structural-only mode boundary respected: **yes** — no adversarial
  counterfactual reasoning ("what if the Implementer faked X"); the
  MAJOR-1 finding is grounded in an observable git diff between
  spec-commit and chore-A commit, not inferential reasoning. MINOR-1 is
  grounded in observable assertion-vs-AC textual divergence.

---

## § 6 — Routing decision

- CRITICAL findings: **0**
- MAJOR findings: **2** (MAJOR-1 prefix-continuity-invariant deviation;
  Implementer self-disclosed. MAJOR-2 AC-R89-8 structurally unsatisfiable
  at Reviewer/MU routing-commit stage due to R83 vs AC-R89-8 tension; spec
  design issue, no role-execution error.)
- MINOR findings: **1**
- OBS findings: **4**

Per CLAUDE-REVIEWER.md routing rule:
> CRITICAL exists → STATUS: ESCALATE
> MAJOR or below → STATUS: MERGE-READY

**STATUS: MERGE-READY** (no CRITICAL).

**Operator-decision flags (informational, do not change routing):**

1. **MAJOR-1 (prefix-continuity-invariant deviation):** Implementer
   self-disclosed and asked for Reviewer assessment of HALT+ESCALATE.
   Reviewer's structural-only assessment: the deviation was necessary to
   make Block 8 verification work (the spec-shipped invocation form did
   not produce TAP output), the substantive deliverable is independent of
   Block 8 mechanics, and the audit trail is preserved (TD-1 + MEMORIAL
   VIOLATION entry tagged `| R89 | IMPLEMENTER`). The operator may wish to
   weigh whether retroactive ESCALATE handling is warranted, but no
   structural correctness issue blocks merge.

2. **MAJOR-2 (AC-R89-8 vs R83 spec design tension):** The post-Reviewer-
   routing-commit state has `fail=16` (one beyond the Implementer-chore-A
   `fail=15` baseline) due to AC-R89-8 PASS → FAIL flip caused by mandatory
   R83 top-STATUS update. This is NOT an MU-stage halt condition (binding
   command-attestation at Reviewer HEAD `eca522f` PRE-routing was in-band).
   Memorial Updater should be aware AC-R89-8 will continue to FAIL through
   round close — this is expected per MAJOR-2 spec design issue, not an
   MU defect. Future methodology rounds should not write "first N lines
   byte-identical" ACs at the working-tree level.
