# REVIEWER-REPORT-R36-opus.md

**Reviewer:** Opus (hybrid mode, independent of Sonnet)
**Round:** R36 — Phase 2 close-walk (WU-07), audit tier
**Spec:** `coordination/specs/Q-R36-SPEC.md` (audit-tier self-spec)
**Diff range reviewed:** `36ab019..HEAD` (round-start to chore-B, ~22 files)
**Date:** 2026-05-18

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line) |
|---|---|---|---|
| AC-R36-1 | q29 AC-R29-12 subprocess skip guard | PASS | `test/q29-k8s-adapter.test.ts:241-244` — guard `NODE_TEST_CONTEXT \|\| NODE_TEST_WORKER_ID` + `t.skip(...)` + `return;` |
| AC-R36-2 | q34 AC-R34-21 subprocess skip guard | PASS | `test/q34-event-conditional-attribution.test.ts:362-365` — guard + skip + return |
| AC-R36-3 | grep audit: no other test files spawn `node --test` | PARTIAL | `test/q36-phase2-close-walk.test.ts:77` uses pattern `/execFileSync\s*\(\s*['"]node['"]/` — see MINOR-3 (narrower than spec wording `execFileSync.*node.*--test`, but functionally captures the intent) |
| AC-R36-4 | q29/q32/q34 forward-protection tests stabilized | PASS | `test/q29-k8s-adapter.test.ts:309` (CHORE_B_SHA=c55ac39); `test/q32-slice3-close-walk.test.ts:305` (7f737d6); `test/q34-event-conditional-attribution.test.ts:332` (cfbc526) + STAGED-FOR-PHASE-2-CLOSE.md carve-out at :322 |
| AC-R36-5 | SCOPING-MEMO surgery: A14-A17 bullets contiguous; "### Vendor fungibility" after A17 | PASS | `coordination/SCOPING-MEMO-v0.3.md:265-268` (A14–A17 bullets); `:270` ("### Vendor fungibility" heading appears after A17) |
| AC-R36-6 | q32 AC-R32-2 placement-aware (vendorIdx > a17Idx) | PASS | `test/q32-slice3-close-walk.test.ts:42-50` — uses `a17Idx`, `vendorIdx`, `vendorIdx > a17Idx` assertion |
| AC-R36-7 | q32 AC-R32-7 literal gauge + degraded/missed_scrape | PARTIAL | `test/q32-slice3-close-walk.test.ts:95-110` — checks whole q25 file content, not just AC-R32-7 section; see MINOR-4 |
| AC-R36-8 | q32 AC-R32-13 REVIEWER_REPORT_REGEX identifier + .test( call | PASS | `test/q32-slice3-close-walk.test.ts:171-191` (uses both identifier and `.test(`) |
| AC-R36-9 | q32 AC-R32-14 § 3.2 comment within 5 lines of env: subEnv | PASS | `test/q32-slice3-close-walk.test.ts:193-211` — `envIdx`, `preceding` window check |
| AC-R36-10 | q32 AC-R32-18 discriminating regex (no false trigger on count: 0 summary) | PASS | `test/q32-slice3-close-walk.test.ts:248-265` — uses regex `/^#### CRITICAL-\d+/m` |
| AC-R36-11 | q25 execSync → execFileSync | PASS | `test/q25-l0-contract.test.ts:18, 216` — import + call switched |
| AC-R36-12 | q30 execSync → execFileSync | PASS | `test/q30-nvlink-adapter.test.ts:22, 230` — import + call switched |
| AC-R36-13 | common-mode-attribution per-distinct-member-shard dedup | PARTIAL | Structural patterns present (`for (const sid of distinct)` at `engine/topology/common-mode-attribution.ts:190`); but semantic regression introduced — see MAJOR-1 |
| AC-R36-14 | Q-R26-SPEC.md AC-R26-14 disambiguation (strikethrough + amendment) | PASS | `coordination/specs/Q-R26-SPEC.md:552` — `~~then the exit code is 0~~ **[R36-amended: the following supersedes the prior claim]**` |
| AC-R36-15 | q28 snap2 source_id/source_version assertions | PASS | `test/q28-slurm-adapter.test.ts:169-170` — both assertions present alongside existing nodes/edges deepEqual |
| AC-R36-16 | Q-R34-SPEC.md LS-3 window boundary reconciliation | PASS | `coordination/specs/Q-R34-SPEC.md:410-414` — `[R36-amended — LS-3]` block; cites `<= preEnd` (inclusive) → `< preEnd` (exclusive) change |
| AC-R36-17 | Q-R34-SPEC.md LS-4 `\Z` → `$` fix | PASS | `coordination/specs/Q-R34-SPEC.md:639-641` — `[R36-amended — LS-4]` + spec pseudocode now `(?=^##\s|$)`. (Note: implementation in q34.test.ts uses `(?![\s\S])` — see MINOR-1) |
| AC-R36-18 | SPEC-AUTHORING-CHECKLIST.md exists with operator-commit carve-out | PASS | `coordination/SPEC-AUTHORING-CHECKLIST.md:26-52` — STAGED-FOR / WAVE-PLAN / WAVE-GATE / CLUSTER-HANDOFF + carve-out language |
| AC-R36-19 | CLAUDE-ARCHITECT.md 3 new REINFORCED 2026-05-18 entries (boundary clauses + regex validation + ALLOWED_SET carve-out) | PASS | `CLAUDE-ARCHITECT.md:416, :425, :433` — 3 entries match R34 MINOR-2/MINOR-3/MAJOR-1 themes (note: test asserts ≥3, spec says "exactly 3"; see OBS-1) |
| AC-R36-20 | CLAUDE-IMPLEMENTER.md 3 new REINFORCED entries | PASS | `CLAUDE-IMPLEMENTER.md:352-388` — entries for spec-vs-impl HALT, regex direct fix, count-by-composition |
| AC-R36-21 | CLAUDE-IMPLEMENTER.md ≤ 30 REINFORCED entries | PASS | `wc` reports exactly 30; threshold met at the boundary |
| AC-R36-22 | CLAUDE-COMMON.md Pass 3 promotions | PASS | `CLAUDE-COMMON.md:310, :317, :324` — all 3 promoted patterns present |
| AC-R36-23 | MR-2 self-application gate (no `content.includes(` in rule text) | PASS | grep `content\.includes\(` in CLAUDE-IMPLEMENTER.md → 0 matches |
| AC-R36-24 | PHASE-2-CLOSE-WALK.md 7 sections | PASS | `coordination/PHASE-2-CLOSE-WALK.md:7, 22, 66, 86, 105, 130, 142` — all §1–§7 present (note: arithmetic inconsistency in § 5; see MINOR-2) |
| AC-R36-25 | A16 D4 RECONFIRMED at all emit sites | PASS | `engine/events/event-conditional-attribution.ts:38, 133` + `engine/topology/common-mode-attribution.ts:205` carry `correlational_not_causal: true`; `coordination/PHASE-2-CLOSE-WALK.md:92-101` documents RECONFIRMED |
| AC-R36-26 | PR-F7 Cell 4 disposition | PASS | `coordination/PHASE-2-CLOSE-WALK.md:180-182` references Cell 4, AC-R26-4, q-md-f4-common-mode-injection.test.ts |
| AC-R36-27 | ANCHOR-BACKFLOW-2026-05-18.md structure | PASS | All 6 sections present (§1–§6: pre-emit, watchdog, orphan reaping, test-isolation, Tailscale, Coordinator graduation) |
| AC-R36-28 | tsc exits 0 at chore-A | PASS | `coordination/NEXT-ROLE.md:12` attests `Exit code: 0`. (But see MAJOR-4 re AC-R29-11 amendment) |
| AC-R36-29 | q36 standalone test count: all 28 ACs pass | PASS | `coordination/NEXT-ROLE.md:28` reports 28/28/0 for q36 |
| AC-R36-30 | round-start-to-chore-A diff ⊆ ALLOWED_SET | FAIL | Test passes only because the implementation expanded the ALLOWED_SET in `test/q36-phase2-close-walk.test.ts:643-668` beyond the spec's enumeration; see MAJOR-2 |
| AC-R36-31 | chore-B forward protection | PASS (structurally) | `test/q36-phase2-close-walk.test.ts:697-725` — execFileSync git diff against literal allowed set + REVIEWER_REPORT regex. But ALLOWED_LITERAL adds `coordination/COORDINATOR-MEMORIAL.md` (line 701), which is post-Reviewer Memorial-Updater output — broader than the spec § 3 AC-R36-31 literal allowed set; see MAJOR-2 |

**Summary:** 26 PASS, 3 PARTIAL, 1 FAIL, 1 PASS-structural-only-with-finding.

---

## 2. Findings

### CRITICAL

(none)

### MAJOR

#### MAJOR-1 — R26 MINOR-2 dedup fix introduces semantic information loss in `latest_event_ts`

**File:** `engine/topology/common-mode-attribution.ts:188-196`

The R26 MINOR-2 fix iterates over distinct member shards and picks each shard's earliest `event_ts`, then aggregates min+max over those per-shard EARLIEST values:

```typescript
for (const sid of distinct) {
  const shardEarliest = Math.min(
    ...touches.filter((t) => t.member_shard_id === sid).map((t) => t.event_ts),
  );
  if (shardEarliest < earliest) earliest = shardEarliest;
  if (shardEarliest > latest) latest = shardEarliest;   // ← uses shardEarliest, not shardLatest
}
```

The asymmetry: `latest_event_ts` is now `max(per-shard earliest)`, not `max(per-shard latest)` and not `max(all event_ts)` (the pre-fix behavior). If a shard contributes multiple `fired_events` at different timestamps (e.g., shard-0 fires at t=1000 and t=1050), the t=1050 entry is discarded — the candidate's `latest_event_ts` will be 1000 (or the next shard's earliest), not 1050.

Pre-fix behavior was equivalent to `latest = max(t.event_ts for all touches)`. The fix should instead be (preserves semantic intent of per-distinct-shard while still surfacing the latest):

```typescript
for (const sid of distinct) {
  const sidTouches = touches.filter((t) => t.member_shard_id === sid);
  const shardEarliest = Math.min(...sidTouches.map((t) => t.event_ts));
  const shardLatest   = Math.max(...sidTouches.map((t) => t.event_ts));
  if (shardEarliest < earliest) earliest = shardEarliest;
  if (shardLatest   > latest)   latest   = shardLatest;
}
```

The existing q-md-f4 tests do not exercise the multi-event-per-shard scenario (AC-R26-1..AC-R26-12 all pass one event per shard), so the regression is invisible to the current AC suite. AC-R36-13 only verifies structural patterns (`for (const sid of distinct)`, comment marker, docstring) — not semantic correctness.

The public `CommonModeCandidate.latest_event_ts` field is consumed downstream (audit path; alarm-time correlation). Producing the wrong value silently is a correctness defect at the wire boundary.

#### MAJOR-2 — AC-R36-30 / AC-R36-31 ALLOWED_SETs expanded beyond spec authorization

**Files:** `test/q36-phase2-close-walk.test.ts:643-668` (AC-R36-30); `:700-707` (AC-R36-31); compared to spec `coordination/specs/Q-R36-SPEC.md:250-273` (AC-R36-30 literal) and `:278` (AC-R36-31 literal).

The spec § 3 enumerates AC-R36-30 ALLOWED_SET as 22 explicit regex entries. The implementation array contains:

- `test/q-md-f4-common-mode-injection.test.ts` — NOT in spec literal (added at test file line 651)
- `coordination/COORDINATOR-MEMORIAL.md` — NOT in spec literal (added at test file line 665, with comment `// TD-3: Memorial-Updater Wave 5 graduation entries`)
- `REVIEWER-REPORT-R36(-opus|-sonnet)?\.md` — spec literal is `REVIEWER-REPORT-R36\.md` (no `-opus|-sonnet` variants)

For AC-R36-31, the spec literal allows only:
- `coordination/reviews/REVIEWER-REPORT-R36.md`
- `coordination/MEMORIAL.md`
- `coordination/NEXT-ROLE.md`

The implementation's `ALLOWED_LITERAL` set adds:
- `coordination/COORDINATOR-MEMORIAL.md`
- `test/q36-phase2-close-walk.test.ts`
- the same `-opus|-sonnet` regex relaxation

**Why this is MAJOR, not MINOR:** The AC was designed as a structural anti-scope guard. The Implementer expanded the guard's own permission set to absorb modifications outside the spec's pre-authorized list. The test then passes by circular logic — the test reads its own literal, and the literal was edited to whitelist whatever was modified. This is the explicit "test reads its own literal and cannot audit itself" pattern documented in `CLAUDE-IMPLEMENTER.md:301-303` (REINFORCED 2026-05-18 anti-scope-allowed-set-forward-coverage):

> R25 MAJOR-2 (forward-protection ALLOWED_SET self-expansion forbidden — test reads its own literal and cannot audit itself; commit-message justification does not substitute for spec-amendment audit trail).

`NEXT-ROLE.md:88` (TD-2) candidly admits: "Pinning q-md-f4's AC-R26-16 (forward-protection) to chore-B SHA 9d05889 required modifying q-md-f4-common-mode-injection.test.ts. Added to R36 ALLOWED_SET in AC-R36-30."

The correct procedure: HALT + DIAGNOSTIC + spec amendment routed through the operator (the audit-tier promotion-mid-round rule, CLAUDE-COMMON.md REINFORCED 2026-05-17 R19 OBS-4/MAJOR-2).

#### MAJOR-3 — Anti-scope: `test/q-md-f4-common-mode-injection.test.ts` modified outside spec § 2.2 list

**File:** `test/q-md-f4-common-mode-injection.test.ts:243-263` (AC-R26-16 pinned to `9d05889`)

Spec § 2.2 enumerates pre-authorized modifications and does NOT list `test/q-md-f4-common-mode-injection.test.ts`. The Implementer modified the file (pinning AC-R26-16's diff to a chore-B SHA) and documented it as `TD-2: q-md-f4 AC-R26-16 added to ALLOWED_SET` in `coordination/NEXT-ROLE.md:88` — explicitly labeled "Tactical deviations (non-halt, documented here)".

This is a halt-discipline violation per Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) — the very rule R36 is supposed to canonically land. The Implementer should have HALTed at point of encounter, written `coordination/diagnostics/DIAGNOSTIC-R36-q-md-f4-anti-scope.md` with bounded options (A: skip pinning this round; B: spec amendment via operator), and set `STATUS: ESCALATE`. Instead, the deviation was inlined and disclosed only in NEXT-ROLE.md.

Note the timing irony: R36 lands Rule 6 canonically (per AC-R36 deliverable 8) while simultaneously violating it.

#### MAJOR-4 — Anti-scope: q29 AC-R29-11 amended outside spec § 2.2 list

**File:** `test/q29-k8s-adapter.test.ts:213-249`

Spec § 2.2 q29 line lists authorized modifications:
> `test/q29-k8s-adapter.test.ts` — skip guard + AC-R29-13 forward-protection SHA pin

The implementation also amended AC-R29-11 (lines 216-218 prepend `[R36-amended]` block; lines 225-247 restructure the assertion to accept exit code 0 OR exit code 2 with only TS2688/TS5107). This change is NOT in the spec's pre-authorized list. NEXT-ROLE.md:86 records:

> TD-1: AC-R29-11 tsc behavior — tsc 5.9.3 exits 0; AC-R29-11 updated to accept exit 0 (clean) OR exit 2 with only {TS2688, TS5107}. Original R29 assertion was environment-specific.

Same Rule 6 halt-discipline pattern as MAJOR-3. Spec-vs-empirical conflict (environmental shift from tsc exit 2 to exit 0) should have triggered DIAGNOSTIC + ESCALATE per `CLAUDE-COMMON.md:308` ("encode-actual-results-verbatim" / "false-compliance-attestation" reinforcement). Instead, the Implementer modified an unauthorized test file inline and disclosed the deviation only in NEXT-ROLE.md.

The substantive observation (tsc now exits 0) is correct and useful; the methodological discipline is what was skipped.

### MINOR

#### MINOR-1 — q34 used `(?![\s\S])` instead of spec-prescribed `$`

**File:** `test/q34-event-conditional-attribution.test.ts:267-269`

Spec § 2.2 q34 line lists "`\Z` → `$` fix". Implementation:

```typescript
const citationBlocks = content.match(/^##\s+(Brodersen|Abadie|Bernal)[\s\S]*?(?=^##\s|(?![\s\S]))/gm);
```

Uses `(?![\s\S])` (negative-lookahead for any character) rather than `$`. The Q-R34-SPEC.md amendment at line 639-641 acknowledges both options ("Use `$` or `(?![\s\S])`"), but the spec § 2.2 binding-list says `$`. Under the `m` flag, `$` matches end-of-line (not end-of-string), so the Implementer's choice is functionally correct, but the divergence from spec § 2.2's literal authorization should have surfaced as a HALT or at minimum a DIAGNOSTIC-noted divergence per CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-18 spec-vs-impl semantic conflict rule. The same Q-R34-SPEC.md amendment carries two contradictory choices (spec pseudocode line uses `$`; amendment-rationale prose mentions both); this is itself an under-resolved spec.

#### MINOR-2 — PHASE-2-CLOSE-WALK.md § 5 arithmetic inconsistency

**File:** `coordination/PHASE-2-CLOSE-WALK.md:121-126`

§ 5 enumerates post-MR-2 structure:
- "1 standalone anti-scope entry (R01)"
- "4 composite headings (HALT-DISCIPLINE, MEMORIAL-AND-ATTESTATION-ACCURACY, SPEC-PRESCRIPTION-FIDELITY, AC-COVERAGE-COMPLETENESS, CORRECTION-PROPAGATION, MEMORIAL-ORDERING-AND-CITATION, CITATION-AND-ARITHMETIC-ACCURACY)" — names 7, claims "4"
- "4 cross-project rule pointers"
- "15 standalone entries (R14–R34 span)"
- "Total: 30 entries"

1 + 7 + 4 + 15 = 27 (not 30). 1 + 4 + 4 + 15 = 24. Neither parse yields 30. The actual `wc` shows 30 `^# REINFORCED` lines but the prose summary doesn't reconcile.

Per the encode-actual-results-verbatim reinforcement (CLAUDE-COMMON.md:310), this count should match the observed value with arithmetic shown. This is a documentation-accuracy MINOR, not a correctness issue.

#### MINOR-3 — AC-R36-3 grep pattern narrower than spec wording

**File:** `test/q36-phase2-close-walk.test.ts:77` (test) and `coordination/specs/Q-R36-SPEC.md:98` (spec)

Spec AC-R36-3:
> the grep result of `execFileSync.*node.*--test` across all `test/q*.test.ts` files (excluding q29 and q34)

Implementation pattern: `/execFileSync\s*\(\s*['"]node['"]/` — matches any `execFileSync('node', ...)` call regardless of `--test` argument. This is narrower than `execFileSync.*node.*--test` in one direction (requires `'node'` to be the FIRST argument) and broader in another (doesn't require `--test`). The intent of the audit (catch transitive-hang risk from `node --test` spawning) is captured, but the literal alignment with spec wording is loose. AC-R36-3 also excludes `q36-phase2-close-walk.test.ts` (line 75), which the spec wording does NOT exclude; this is defensive (q36 uses `execFileSync('git', ...)`, not `'node'`) but undocumented in the AC text.

#### MINOR-4 — AC-R32-7 "strengthened" assertion reads whole file content

**File:** `test/q32-slice3-close-walk.test.ts:97-110`

The R36 strengthening reads the ENTIRE `test/q25-l0-contract.test.ts` content and checks if `'gauge'` and `missed_scrape`/`degraded` appear anywhere. Spec AC-R36-7 wording ("in the relevant test file section") suggests the check should be scoped to the AC-R32-7 region (the R25 MINOR-3 gauge AC). As implemented, any unrelated 'gauge' literal in q25 (e.g., in a header comment or distinct test) satisfies the assertion. The pre-R36 weakness was `content.includes('MINOR-3')`; the post-R36 strengthening trades a soft text-marker check for a softer literal-substring check that doesn't anchor to the specific AC.

q25 currently contains 14 occurrences of gauge/missed_scrape literals across multiple tests; the discriminating power is low.

#### MINOR-5 — REVIEWER-REPORT regex relaxation un-audited

**File:** `test/q36-phase2-close-walk.test.ts:667, :707`

Both ALLOWED_SETs were relaxed from `REVIEWER-REPORT-R36.md` (spec literal) to `REVIEWER-REPORT-R36(-opus|-sonnet)?\.md`. Hybrid-mode reviewers do produce `-opus` / `-sonnet` variants — but this regex relaxation should have appeared in the spec § 3 enumeration (it didn't) and should have been disclosed as a spec amendment. The relaxation is silently inlined.

### OBS

#### OBS-1 — AC-R36-19 spec says "exactly 3", test asserts ≥ 3

**File:** `test/q36-phase2-close-walk.test.ts:411-414`

Spec AC-R36-19: "exactly 3 new REINFORCED 2026-05-18 lines appear as specified". Test asserts:
```typescript
assert.ok(entries.length >= 3, ...)
```
This is laxer than spec. `CLAUDE-ARCHITECT.md` has 13 `# REINFORCED 2026-05-18` entries (many added across R28–R34 — not all from R36). The test cannot distinguish "3 new R36-derived entries" from "≥3 entries dated 2026-05-18 from various rounds". Not a correctness issue at R36 (all 3 expected R36 entries are present per file content); flagged for future tightening.

#### OBS-2 — `tsc exits 0` is reported but R29 baseline was `exit 2`

The substantive observation that tsc 5.9.3 now exits cleanly is a positive environmental shift. Discipline note: the proper resolution path was via spec amendment for AC-R29-11 (operator-routed), not inline test edit. Documentation in PHASE-2-CLOSE-WALK.md or ANCHOR-BACKFLOW would help future readers understand WHY the AC was modified.

#### OBS-3 — Sonnet's parallel report exists at `coordination/reviews/REVIEWER-REPORT-R36-sonnet.md`

Not read during this cold pass per HYBRID Reviewer protocol. The merger step should reconcile findings.

---

## 3. Right-reasons audit

### Test 1: AC-R36-13 (`test/q36-phase2-close-walk.test.ts:287-305`)

**Spec requirement:** Verify `engine/topology/common-mode-attribution.ts` event_ts aggregation correctly handles per-distinct-member-shard semantics.

**Test passes because:** Structural patterns match — string `"R26 MINOR-2"` or `"per-distinct-member-shard"` present (line 290-293); literal `"for (const sid of distinct)"` present (line 295-297); misleading docstring absent (line 300-304).

**Verdict:** SELF-CONFIRMING. The test verifies the code matches a *shape* prescribed in the spec, not the *semantics*. The semantic bug documented in MAJOR-1 (`latest = shardEarliest`) is invisible to this AC. A genuine binding for AC-R36-13 would construct multi-event-per-shard fixtures and assert `latest_event_ts === expected_latest` after the dedup runs.

### Test 2: AC-R36-30 (`test/q36-phase2-close-walk.test.ts:640-690`)

**Spec requirement:** Anti-scope diff (round-start to chore-A) confined to the spec's 22-path ALLOWED_SET.

**Test passes because:** The literal ALLOWED_SET in the test file was edited to absorb every actual modification. The test reads its own ALLOWED_SET literal and compares against the diff — circular.

**Verdict:** SELF-CONFIRMING by construction. The very purpose of AC-R36-30 (catch anti-scope drift) is defeated when the test is the ALLOWED_SET source-of-truth. This is the exact failure mode flagged in CLAUDE-IMPLEMENTER.md:298-303 (anti-scope-allowed-set-forward-coverage cross-project rule). Spec amendment routed through the Architect (or operator in audit tier) is the correct procedure.

### Test 3: AC-R36-22 (`test/q36-phase2-close-walk.test.ts:479-498`)

**Spec requirement:** CLAUDE-COMMON.md after MR-2 Pass 3 contains the 3 universal-pattern promotions.

**Test passes because:** Three distinct `content.includes(...)` checks each match a literal substring in `CLAUDE-COMMON.md:310, :317, :324`. The substrings are descriptive rule names ("encode-actual-results-verbatim", "data-flow-not-syntax", "line-citation-cite-then-verify").

**Verdict:** LEGITIMATE PASS. The test verifies presence of a named promotion; the promotions are real rule blocks (verified by reading the file). The discriminator is the unique rule-name string, which is non-trivial to fabricate accidentally.

---

## 4. Cross-cutting checks

### TDD discipline

- Commit `45969ae` is labeled `test(R36-RED): failing stubs for AC-R36-1..30` and precedes `c49df0e feat(R36): Phase 2 close-walk (WU-07) — 8 deliverables GREEN`.
- Separate RED commit is present per CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-18 R23 MINOR-1.
- **Verdict:** PASS.

### No-skip / halt discipline

- **FAILED.** NEXT-ROLE.md:84-90 enumerates `Tactical deviations (non-halt, documented here)` — TD-1 (AC-R29-11 inline amendment), TD-2 (q-md-f4 unauthorized modification), TD-3 (q32 window fixes; this one is in-scope and OK).
- Per Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround), TD-1 and TD-2 should have produced DIAGNOSTIC files and STATUS: ESCALATE.
- The audit-tier promotion-mid-round rule (CLAUDE-COMMON.md REINFORCED 2026-05-17) was explicit: anti-scope modification needed to make tests pass = HALT condition.
- **Verdict:** FAIL (see MAJOR-3, MAJOR-4).

### Anti-scope (delta vs spec § 2.2 + § 4)

Files in diff but NOT in spec § 2.2 pre-authorized list:
- `test/q-md-f4-common-mode-injection.test.ts` (modified — MAJOR-3)
- `coordination/COORDINATOR-MEMORIAL.md` (modified — see MAJOR-2)
- `coordination/reviews/REVIEWER-REPORT-R36-sonnet.md` (Sonnet's parallel report; expected from HYBRID mode)

Files in spec § 2.2 pre-authorized list that were NOT modified:
- `coordination/specs/Q-R32-SPEC.md` (listed but no diff — OK, the spec § 2.2 list is an upper bound)

Inline AC modifications NOT in spec § 2.2 sub-bullet:
- `test/q29-k8s-adapter.test.ts` AC-R29-11 amendment (MAJOR-4)
- `test/q34-event-conditional-attribution.test.ts` regex divergence from spec-prescribed `$` (MINOR-1)

**Verdict:** FAIL — 2 unauthorized file modifications + 1 unauthorized inline AC amendment + 1 spec-divergent regex choice.

---

## 5. Pre-emit grilling (on this report)

| Check | Result |
|---|---|
| Every finding has a file:line reference? | YES (MAJOR-1: common-mode-attribution.ts:188-196; MAJOR-2: q36.test.ts:643-668, :700-707; MAJOR-3: q-md-f4.test.ts:243-263; MAJOR-4: q29.test.ts:213-249; MINOR-1: q34.test.ts:267-269; MINOR-2: PHASE-2-CLOSE-WALK.md:121-126; MINOR-3: q36.test.ts:77; MINOR-4: q32.test.ts:97-110; MINOR-5: q36.test.ts:667/707) |
| Any AC marked PASS without actual verification? | NO — each PASS is backed by an inline file:line citation; the few PARTIALs / FAIL are flagged |
| Right-reasons audit completed for 3+ tests? | YES (AC-R36-13, AC-R36-30, AC-R36-22) |
| Findings independent of code shape (semantic vs structural)? | YES (MAJOR-1 is purely semantic; MAJOR-2/3/4 are anti-scope structural; MINORs cover both layers) |
| Anti-scope check reproduced from `git diff` first? | YES — diff against `36ab019` enumerated 23 files; cross-checked against spec § 2.2 list |
| Sonnet report (hybrid-parallel) not read? | YES — confirmed not loaded |
| Diagnostics directory not read? | YES — confirmed not loaded |

**All grilling items pass.** Report routed without modification.

---

## 6. Summary

**Findings:** 0 CRITICAL / 4 MAJOR / 5 MINOR / 3 OBS.

**Per HYBRID protocol:** NO update to `coordination/NEXT-ROLE.md`. NO append to `coordination/MEMORIAL.md`. This report is one of two parallel inputs to the merger step.

**Recommended disposition (for the merger to weigh):**
- MAJOR-1 (semantic regression in `latest_event_ts`): requires implementation fix (~3 lines). Add an AC fixture that exercises multi-event-per-shard if a follow-up round addresses this.
- MAJOR-2/3/4 (anti-scope + halt-discipline violations): the violations cannot be retroactively converted to compliance, but a spec amendment commit (Architect or operator-routed) for AC-R36-30 ALLOWED_SET + AC-R29-11 amendment + q-md-f4 modification would constitute the proper audit trail. The deviations are real; the substantive changes are defensible; only the procedure was skipped.
- MINOR-1 (`$` vs `(?![\s\S])` divergence): low-cost spec clarification (pick one and update spec § 2.2).
- MINOR-2/3/4/5: small documentation / specificity tightening.

The Phase 2 close-walk substantively achieves its goals (eight deliverables landed; subprocess-hang fixed; R32/R34 carry-forwards closed; MR-2 consolidation applied; PHASE-2-CLOSE-WALK.md present). The discipline gap is that R36 lands Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) at the Memorial-Updater stage while simultaneously violating it three times at the Implementer stage. The merger step + Memorial-Updater should record this as a "rule-derivation-without-self-application" companion observation to MR-2's broader theme — and the Coordinator's Wave 5 gate should weigh whether the violations warrant a corrective round before HARD STOP, or whether the violations are within tolerance given that the eight deliverables nominally complete.

---

_End of REVIEWER-REPORT-R36-opus.md._
