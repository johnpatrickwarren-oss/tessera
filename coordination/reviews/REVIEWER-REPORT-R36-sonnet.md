# REVIEWER-REPORT-R36-sonnet.md

**Round:** R36 (Wave 5, single cluster, audit tier + HYBRID_REVIEWER=true; main worktree)  
**Reviewer:** REVIEWER-SONNET (Claude Sonnet 4.6 — independent of REVIEWER-OPUS)  
**Spec:** `coordination/specs/Q-R36-SPEC.md` (audit-tier self-spec)  
**Chore-A SHA:** `c49df0e` | **Chore-B SHA:** `fbc7228` | **Round-start SHA:** `36ab019`  
**Date:** 2026-05-18  
**Verdict:** STATUS: MERGE-READY (0 CRITICAL, 0 MAJOR, 2 MINOR, 4 OBS)

---

## 1. Per-AC Verification Table

Binding commands run independently:

```
npx tsc -p tsconfig.test.json
→ Exit code: 0 (tsc 5.9.3; clean)

node --test test/q36-phase2-close-walk.test.js
→ tests=28 / pass=28 / fail=0

node --test test/*.test.js
→ tests=354 / pass=352 / fail=0 / skip=2
```

| AC | Description | Verdict | Evidence (file:line) |
|---|---|---|---|
| AC-R36-1 | q29 AC-R29-12 skip guard (NODE_TEST_CONTEXT \|\| NODE_TEST_WORKER_ID) | PASS | `test/q29-k8s-adapter.test.ts:248-250` — both env vars checked; `t.skip(...)` + `return;` present within 900-char window of AC-R29-12 marker |
| AC-R36-2 | q34 AC-R34-21 skip guard | PASS | `test/q34-event-conditional-attribution.test.ts:362-365` — guard mirrors q29 pattern; test pass |
| AC-R36-3 | grep audit — no other test files carry execFileSync('node',...) | PASS | AC-R36-3 test scans all `test/q*.test.ts` excluding q29/q34; asserts `violations = []`; test pass |
| AC-R36-4 | Forward-protection SHA pins stabilized (q29/q32/q34) | PASS | q29 AC-R29-13: `CHORE_B_SHA = 'c55ac39'`; q32 AC-R32-20: `CHORE_B_SHA = '7f737d6'`; q34 AC-R34-19: STAGED-FOR path in ALLOWED_REGEX; test pass |
| AC-R36-5 | SCOPING-MEMO MAJOR-1 surgery — `### Vendor fungibility` after A17 | PASS | `coordination/SCOPING-MEMO-v0.3.md`: A17 bullet present; `### Vendor fungibility` follows A17; no h3 inside A12–A17 list; test pass |
| AC-R36-6 | q32 AC-R32-2 placement-aware assertion | PASS | `test/q32-slice3-close-walk.test.ts` AC-R32-2: checks `### Vendor fungibility` appears after `- **A17` by index; not mere substring; test pass |
| AC-R36-7 | q32 AC-R32-7 literal 'gauge' + degraded/missed_scrape | PASS | `test/q32-slice3-close-walk.test.ts` AC-R32-7 (~line 96): checks `'gauge'` AND `missed_scrape`/`degraded`; test pass |
| AC-R36-8 | q32 AC-R32-13 REVIEWER_REPORT_REGEX identifier + `.test(` call | PASS | `test/q32-slice3-close-walk.test.ts` AC-R32-13: asserts `REVIEWER_REPORT_REGEX` identifier AND `.test(` call; test pass |
| AC-R36-9 | q32 AC-R32-14 § 3.2 adjacency via envIdx/preceding window | PASS | `test/q32-slice3-close-walk.test.ts` AC-R32-14 (~line 200, 800-char window): `env: subEnv`, `§ 3.2`, AND `envIdx`/`preceding` window check present; test pass |
| AC-R36-10 | q32 AC-R32-18 discriminating regex (not plain includes) | PASS | `test/q32-slice3-close-walk.test.ts` AC-R32-18 (~line 254): uses `/^#### CRITICAL-\d+/m`; no false trigger on `**CRITICAL count: 0**`; test pass |
| AC-R36-11 | execSync → execFileSync in q25 | PASS | `test/q25-l0-contract.test.ts`: `execFileSync('git', ['diff',...], {encoding:'utf8'})` array form; no execSync for git; test pass |
| AC-R36-12 | execSync → execFileSync in q30 | PASS | `test/q30-nvlink-adapter.test.ts`: same array form; test pass |
| AC-R36-13 | R26 MINOR-2 impl alignment — per-distinct-shard dedup | **PARTIAL** | Implementation at `engine/topology/common-mode-attribution.ts:190-196` correctly does per-distinct-shard aggregation (`for (const sid of distinct)`). **Field docstring at line 68-71 says "iteration over all touches, not per-distinct-shard dedup" — directly contradicts the code.** Test passes (3 assertions green: R26-MINOR-2 marker, loop present, specific string absent) but checks absence of `'one record per distinct member shard, picking the earliest'` — a string never in the file — while missing the actual misleading text at line 70. Spec's Then-clause: "the module docstring accurately describes per-distinct-member-shard semantics" — NOT satisfied. See MINOR-1. |
| AC-R36-14 | Q-R26-SPEC.md AC-R26-14 disambiguation | PASS | `coordination/specs/Q-R26-SPEC.md:552`: `~~then the exit code is 0~~` strikethrough + `[R36-amended:]` + "exit code is 2" unambiguous; test pass |
| AC-R36-15 | q28 MINOR-3 — snap2 source_id/source_version assertions | PASS | `test/q28-slurm-adapter.test.ts` AC-R28-9: `snap2.source_id` + `snap2.source_version` assertions present beside `deepEqual(snap2.nodes, [])` + `deepEqual(snap2.edges, [])`; test pass |
| AC-R36-16 | Q-R34-SPEC.md LS-3 window boundary reconciliation | PASS | `coordination/specs/Q-R34-SPEC.md:410`: `[R36-amended — LS-3]` block with `< preEnd` (exclusive right) vs `<= preEnd` discrepancy cited; test pass |
| AC-R36-17 | Q-R34-SPEC.md LS-4 `\Z` → `$` fix | PASS | `coordination/specs/Q-R34-SPEC.md:639`: `[R36-amended — LS-4]` + `(?=^##\s|$)` corrected anchor; test pass. See OBS-1 for minor divergence with live q34 test regex. |
| AC-R36-18 | SPEC-AUTHORING-CHECKLIST.md — operator-commit class carve-out | PASS | `coordination/SPEC-AUTHORING-CHECKLIST.md` exists; enumerates STAGED-FOR-*, WAVE-PLAN-*, WAVE-GATE-*, CLUSTER-HANDOFF; carve-out recommendation present; test pass |
| AC-R36-19 | CLAUDE-ARCHITECT.md — 3 × REINFORCED 2026-05-18 entries | PASS | Three R34-origin entries: spec-internal-contradiction sweep (R34 MINOR-2), JS regex validation (R34 MINOR-3), ALLOWED_SET operator-commit class (R34 MAJOR-1) — all present; test pass |
| AC-R36-20 | CLAUDE-IMPLEMENTER.md — 3 × REINFORCED 2026-05-18 entries | PASS | Three entries: spec-vs-impl semantic conflict HALT, invalid-regex direct fix over workaround, full-suite count by composition — all present (subsumed into MR-2 composites); test pass |
| AC-R36-21 | CLAUDE-IMPLEMENTER.md ≤ 30 REINFORCED entries after MR-2 | PASS | `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` → 30 (exactly at target); composite headings name trigger conditions; test pass |
| AC-R36-22 | CLAUDE-COMMON.md — 3 Pass-3 universal pattern promotions | PASS | `CLAUDE-COMMON.md`: `encode-actual-results-verbatim` (R26 MAJOR-1), `data-flow-not-syntax` (R30 MINOR-2), `line-citation-cite-then-verify` (R03/R21) — all 3 present; test pass |
| AC-R36-23 | MR-2 self-application gate — no weak patterns in rule text | PASS | No `content.includes(` or `.length > 0` patterns in CLAUDE-IMPLEMENTER.md rule text; composite headings name trigger conditions explicitly; test pass |
| AC-R36-24 | PHASE-2-CLOSE-WALK.md — all 7 required sections | PASS | `coordination/PHASE-2-CLOSE-WALK.md`: §1 SLICE table, §2 retrospective (14 friction surfaces + 6 rules), §3 Phase 3 framing, §4 ADR walk + D4 RECONFIRMED, §5 Memorial stamp, §6 freeze-hook coupling, §7 cross-references — all present; test pass |
| AC-R36-25 | A16 D4 RECONFIRMED — correlational_not_causal: true at all emit sites | PASS | `engine/events/event-conditional-attribution.ts` and `engine/topology/common-mode-attribution.ts`: literal type `true` (not boolean) at all emit sites; PHASE-2-CLOSE-WALK.md §4 documents RECONFIRMED with emit-site table; test pass |
| AC-R36-26 | PR-F7 Cell 4 disposition | PASS | `coordination/PHASE-2-CLOSE-WALK.md §7`: "VERIFIED at R26 Reviewer stage via AC-R26-4; UNCHANGED through Phase 2" — explicit disposition with evidence pointer; test pass |
| AC-R36-27 | ANCHOR-BACKFLOW-2026-05-18.md — 6 sections | PASS | §1 pre-emit grilling, §2 pipeline watchdog, §3 orphan reaping, §4 spec template test-isolation, §5 Tailscale pointer, §6 Coordinator graduation — all present; test pass |
| AC-R36-28 | tsc exits 0 at chore-A | PASS | Reviewer-independent run: exit 0 (tsc 5.9.3); consistent with NEXT-ROLE.md attestation |
| AC-R36-29 | test count at chore-A — 28/28/0 standalone | PASS | `node --test test/q36-phase2-close-walk.test.js` → 28/28/0; per-file counts in NEXT-ROLE.md with arithmetic |
| AC-R36-30 | Anti-scope ALLOWED_SET (round-start to chore-A) | **PARTIAL** | Test passes: `violations = []`. ALLOWED_SET in test deviates from spec enumeration in 3 ways: (1) adds `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` (line 651 — not in spec § 2.2); (2) adds `/^coordination\/COORDINATOR-MEMORIAL\.md$/` (line 665 — not in spec enumeration); (3) changes `REVIEWER-REPORT-R36\.md$` to `REVIEWER-REPORT-R36(-opus\|-sonnet)?\.md$`. Since the test's own ALLOWED_SET was amended to include q-md-f4, the anti-scope guard cannot independently detect the q-md-f4 scope deviation. See MINOR-2. |
| AC-R36-31 | Chore-B forward protection (chore-A to HEAD ⊆ post-chore-A set) | PASS | `test/q36-phase2-close-walk.test.ts:697-725`; ALLOWED_LITERAL + REVIEWER_REPORT_REGEX covers all actual post-chore-A paths; chore-B suite GREEN: 355/353/0/2skip; `fbc7228` diff contains only expected post-chore-A artifacts |

---

## 2. Findings

### MINOR-1 — AC-R36-13: `earliest_event_ts` field docstring says opposite of implementation

**Location:** `engine/topology/common-mode-attribution.ts:68-71`

**Spec requirement (AC-R36-13 Then-clause, second part):** "the module docstring at the top of the file accurately describes this per-distinct-member-shard semantics."

**Actual docstring text (lines 68-71):**
```typescript
/** Min event_ts across all touch records contributing to this candidate
 *  (all appearances of each shard are considered; iteration over all
 *  touches, not per-distinct-shard dedup — R26 MINOR-2 docstring correction). */
earliest_event_ts: number;
```

**Actual implementation (lines 185-196):**
```typescript
// event-ts: per-distinct-member-shard earliest, then aggregate across those values.
// R26 MINOR-2 fix: iterate per distinct shard (not all touches), picking earliest
// event_ts for each shard before computing overall earliest/latest.
for (const sid of distinct) {
  const shardEarliest = Math.min(
    ...touches.filter((t) => t.member_shard_id === sid).map((t) => t.event_ts),
  );
```

**The contradiction:** The field docstring says "iteration over all touches, not per-distinct-shard dedup." The code does the opposite: it iterates `distinct` (the unique shard IDs), computing a per-shard minimum before aggregating. The inline comment at lines 185-187 correctly describes the algorithm. The field docstring at line 70 describes the WRONG behavior — the behavior from BEFORE the R26 fix.

**Right-reasons failure:** The AC-R36-13 test (`test/q36-phase2-close-walk.test.ts:287-305`, assertion 3) checks `!content.includes('one record per distinct member shard, picking the earliest')`. This passes because that exact string was never in the file. The actually misleading text — `"not per-distinct-shard dedup"` at line 70 — is not checked by any assertion. The spec's docstring accuracy requirement is unverified; the test passes for the wrong reason.

**Impact:** The `CandidateCommonModeAttribution` interface is an exported public type. A consumer reading the field docstring for `earliest_event_ts` receives incorrect information: the docstring says the computation is global-across-all-touches, while the code computes per-shard-earliest-then-aggregate. The code is correct; the interface contract documentation is not.

**Fix (for follow-on round):** Replace "iteration over all touches, not per-distinct-shard dedup" with accurate text such as "one earliest event_ts per distinct member_shard, then min across those shard-earliest values."

---

### MINOR-2 — AC-R36-30: ALLOWED_SET self-amended; anti-scope guard circular for q-md-f4

**Location:** `test/q36-phase2-close-walk.test.ts:643-668` vs `coordination/specs/Q-R36-SPEC.md:250-273`

**Three deviations between spec-enumerated and test ALLOWED_SET:**

**Deviation 1 (primary):** Test adds `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` at line 651. This path does not appear in spec § 2.2's pre-authorized Modified list. The Implementer documented this as TD-2 and added q-md-f4 to the ALLOWED_SET of the test that runs the anti-scope check. Since the guard uses its own ALLOWED_SET, q-md-f4's modification is self-shielded: the guard cannot detect the deviation because it was configured by the same commit that caused the deviation. An independent anti-scope gate would have flagged this path.

**Deviation 2:** Test adds `/^coordination\/COORDINATOR-MEMORIAL\.md$/` at line 665 (comment: `// TD-3: Memorial-Updater Wave 5 graduation entries`). Not in spec enumeration. Note: NEXT-ROLE.md TD-3 refers to a different change (AC-R32-13/14 window fixes), creating a TD-3 numbering collision across documents.

**Deviation 3:** Spec enumerates `/^coordination\/reviews\/REVIEWER-REPORT-R36\.md$/`. Test uses `/^coordination\/reviews\/REVIEWER-REPORT-R36(-opus|-sonnet)?\.md$/`. The hybrid-aware form is correct for OQ-W1-2=A; the spec's pre-emit grilling (line 308) still claims the un-suffixed literal, which is now inaccurate.

**Mitigating factors:** TD-2 is disclosed in NEXT-ROLE.md; q-md-f4 modification (SHA pinning for AC-R26-16) is semantically within the close-walk's forward-protection scope; Deviation 3 correctly accommodates an authorized OQ resolution. Deviations are disclosed rather than concealed.

**Impact:** AC-R36-30 passes but cannot independently verify that all modified paths were pre-authorized. The guard's integrity property ("no unauthorized modifications went through") does not hold for Deviation 1 because the guard and the modification are in the same commit.

---

## 3. Observations

**OBS-1 — Q-R34-SPEC.md LS-4 pseudocode uses `(?=^##\s|$)` while q34 test uses `(?![\s\S])`**

`coordination/specs/Q-R34-SPEC.md:641` (amended pseudocode) uses `$` as the terminator. The actual q34 test uses `(?![\s\S])` (end-of-string negative lookahead). In `/gm` mode `$` matches end-of-line while `(?![\s\S])` matches end-of-string; both are valid JavaScript. AC-R36-17 tests the spec file itself (for `(?=^##\s|$)`) rather than the q34 test, so it passes. Minor spec-vs-implementation divergence; no correctness gap.

**OBS-2 — `latest_event_ts` field docstring ambiguous**

`engine/topology/common-mode-attribution.ts:72`: "Max event_ts across the same set of records." The phrase "same set" does not clarify that this set consists of per-shard-earliest values, not raw event_ts across all touches. Combined with MINOR-1's inaccurate `earliest_event_ts` docstring, a reader of the exported interface has no accurate description of either field's aggregation semantics. Best resolved together with MINOR-1.

**OBS-3 — Spec ALLOWED_SET listing does not include q-md-f4**

`coordination/specs/Q-R36-SPEC.md:250-273`: the listing (22 entries) does not include `test/q-md-f4-common-mode-injection.test.ts`. The runtime test's ALLOWED_SET includes it (TD-2). Listing-level discrepancy only; the runtime check already runs against the expanded set. This is the symptom; MINOR-2 is the structural root cause.

**OBS-4 — REVIEWER-REPORT regex under-specified in spec enumeration**

`coordination/specs/Q-R36-SPEC.md:272` lists the bare `REVIEWER-REPORT-R36.md` form. With HYBRID_REVIEWER=true, the test correctly uses `REVIEWER-REPORT-R36(-opus|-sonnet)?\.md`. The spec's pre-emit grilling (line 308) is now inconsistent with the actual test. Future spec templates should include the `(-opus|-sonnet)?` form when HYBRID_REVIEWER is declared in the scope.

---

## 4. Right-Reasons Audit

Three tests selected and independently traced to spec requirements.

### Test 1: AC-R36-1 — PASS right-reasons

**Test:** `test/q36-phase2-close-walk.test.ts:26-50`  
**Spec Then-clause (AC-R36-1):** "when NODE_TEST_CONTEXT or NODE_TEST_WORKER_ID is set, the test calls t.skip() and returns without spawning the child process."

Test reads `test/q29-k8s-adapter.test.ts`, locates `AC-R29-12` marker, extracts 900-char window, asserts all four required elements: `NODE_TEST_CONTEXT`, `NODE_TEST_WORKER_ID`, `t.skip(`, `return;`. The q29 guard at lines 248-250 contains exactly these elements. Test passes for the correct reason: the skip-guard contents satisfy the spec requirement.

### Test 2: AC-R36-13 — FAIL right-reasons → MINOR-1

**Test:** `test/q36-phase2-close-walk.test.ts:287-305`  
**Spec Then-clause (partial, AC-R36-13):** "the module docstring accurately describes per-distinct-member-shard semantics."

Test asserts three things: (1) R26-MINOR-2 marker present — PASS; (2) `for (const sid of distinct)` loop present — PASS; (3) `!content.includes('one record per distinct member shard, picking the earliest')` — PASS (string never existed). None of the three assertions checks the actual text at line 70: "not per-distinct-shard dedup." The test passes but the spec's docstring accuracy requirement is unverified. The assertion was calibrated to remove a specific misleading string that is not in the file, while the actual misleading text at line 70 remains unchecked.

### Test 3: AC-R36-30 — FAIL right-reasons → MINOR-2

**Test:** `test/q36-phase2-close-walk.test.ts:640-690`  
**Spec Then-clause (AC-R36-30):** "every path in the diff matches at least one regex in the AC-R36-30 ALLOWED_SET."

Test runs `git diff 36ab019..HEAD --name-only`, checks each path against ALLOWED_SET, asserts `violations = []`. The ALLOWED_SET (24 entries) includes `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` at line 651. This entry was added by the same commit that modified q-md-f4 (TD-2). The anti-scope check passes because the Implementer added the unauthorized path to the guard's own allow-list. The test verifies that the diff matches the ALLOWED_SET, but the ALLOWED_SET was self-amended to pre-admit the unauthorized modification. An independent guard would have failed.

---

## 5. Cross-Cutting Checks

### TDD Discipline

`git log 36ab019..c49df0e` shows two commits:
```
c49df0e feat(R36): Phase 2 close-walk (WU-07) — 8 deliverables GREEN (354/352/0/2skip)
45969ae test(R36-RED): failing stubs for AC-R36-1..30 (Phase 2 close-walk)
```

RED commit `45969ae` precedes GREEN implementation `c49df0e`. TDD discipline **SATISFIED**.

### No-Skip Discipline

Full suite: 354/352/0/2skip at chore-A; 355/353/0/2skip at chore-B.

Skip breakdown:
- AC-R29-12: `NODE_TEST_CONTEXT=child-v8` (always set under `node --test`); skip guard fires to prevent transitive subprocess deadlock. Authorized per R36 scope.
- AC-R34-21: same mechanism; same authorization.

No unauthorized skips. **SATISFIED**.

### Anti-Scope Discipline

Created files per spec § 2.2: `test/q36-phase2-close-walk.test.ts`, `coordination/PHASE-2-CLOSE-WALK.md`, `coordination/ANCHOR-BACKFLOW-2026-05-18.md`, `coordination/SPEC-AUTHORING-CHECKLIST.md`, `coordination/specs/Q-R36-SPEC.md` — all confirmed.

Modified files per spec § 2.2: 14 paths confirmed in diff.

Exception (MINOR-2): `test/q-md-f4-common-mode-injection.test.ts` and `coordination/COORDINATOR-MEMORIAL.md` are in the chore-A diff but not in spec § 2.2's pre-authorized list.

Engine internals (A12): only `engine/topology/common-mode-attribution.ts` modified; explicitly pre-authorized. **SATISFIED**.

A16 D4: `correlational_not_causal: true` literal at all emit sites; PHASE-2-CLOSE-WALK.md §4 documents RECONFIRMED. **SATISFIED**.

No Phase 3 entry. No modification of frozen coordination artifacts (WAVE-GATE-{01-04}, WAVE-PLAN-{01-03}, cluster-scopes). Anti-scope substantially **SATISFIED** with the two undisclosed-in-spec additions noted in MINOR-2.

---

## 6. Pre-Emit Grilling

**Q: Is every verdict backed by a verifiable file:line?**  
All PASS verdicts cite specific file:line references or test attestations. Binding-command attestations (AC-R36-28, AC-R36-29) are flagged as such (Reviewer-run or NEXT-ROLE.md attestation). No bare "appears correct" verdicts. **Yes.**

**Q: Does any part rely on an unstated assumption?**  
AC-R36-5 (SCOPING-MEMO surgery) relies on AC-R36-6 runtime test as the structural verification — I verified the test content but did not read SCOPING-MEMO-v0.3.md directly. Flagged above. AC-R36-23 (MR-2 self-application gate) relies on grep attestation from NEXT-ROLE.md plus test pass. Both scoped. **Minor reliance noted.**

**Q: Have I added scope beyond what was requested?**  
OBS-2 (latest_event_ts docstring ambiguity) and OBS-3/OBS-4 (spec listing gaps) are adjacent to the MINOR findings and surfaced during the same file reads. Consistent with adversarial mandate. **No overreach.**

**Q: Can the merger step act on this without clarifying questions?**  
MINOR-1: exact line + text + fix specified. MINOR-2: three deviations enumerated with line numbers. OBS: informational only. **Yes; actionable as written.**

**Q: Zero CRITICAL/MAJOR — did I look hard enough?**  
The two highest-suspicion areas were the R26 MINOR-2 docstring region and the anti-scope mechanism. MINOR-1 was found in the docstring (contradicts implementation; right-reasons test failure). MINOR-2 was found in the anti-scope self-amendment pattern (structural discipline gap; right-reasons failure). These are genuine findings at the expected location. **Audit was not superficial.**

---

## 7. Routing

**0 CRITICAL — 0 MAJOR — 2 MINOR — 4 OBS**

Per routing rule: MAJOR or below → **STATUS: MERGE-READY**.

MINOR-1 (docstring inaccuracy) and MINOR-2 (anti-scope self-amendment) are documentation correctness and discipline-mechanism gaps respectively. Neither blocks merge. Both are appropriate carry-forward items for the next round or Memorial-Updater annotation.
