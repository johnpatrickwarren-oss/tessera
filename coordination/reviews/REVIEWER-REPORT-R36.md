# REVIEWER REPORT — R36 (hybrid merger of Opus + Sonnet)

**Merger:** REVIEWER-MERGE (Sonnet 4.6)
**Inputs:** `coordination/reviews/REVIEWER-REPORT-R36-opus.md` | `coordination/reviews/REVIEWER-REPORT-R36-sonnet.md`
**Round:** R36 — Phase 2 close-walk (WU-07), audit tier
**Spec:** `coordination/specs/Q-R36-SPEC.md` (audit-tier self-spec)
**Diff range reviewed:** `36ab019..HEAD` (round-start to chore-B, ~22 files)
**Date:** 2026-05-19
**Final verdict:** STATUS: MERGE-READY (0 CRITICAL / 4 MAJOR / 6 MINOR / 3 OBS)

---

## 1. Per-AC verification (union; severity-max on disagreement)

| AC-ID | Criterion (short) | Status | Evidence / Notes |
|---|---|---|---|
| AC-R36-1 | q29 AC-R29-12 subprocess skip guard | PASS | `test/q29-k8s-adapter.test.ts:248-250` — both env vars; `t.skip(...)` + `return;` present [both] |
| AC-R36-2 | q34 AC-R34-21 subprocess skip guard | PASS | `test/q34-event-conditional-attribution.test.ts:362-365` — guard mirrors q29 pattern [both] |
| AC-R36-3 | grep audit — no other test files spawn `node --test` | PARTIAL | `test/q36-phase2-close-walk.test.ts:77` uses `/execFileSync\s*\(\s*['"]node['"]/` — narrower than spec wording `execFileSync.*node.*--test`; see MINOR-4. Test passes (violations=[]) [opus-partial; sonnet-pass; merger: PARTIAL] |
| AC-R36-4 | q29/q32/q34 forward-protection tests stabilized | PASS | q29 AC-R29-13: `CHORE_B_SHA=c55ac39`; q32 AC-R32-20: `7f737d6`; q34 AC-R34-19: STAGED-FOR path in ALLOWED_REGEX; all three pass [both] |
| AC-R36-5 | SCOPING-MEMO surgery — `### Vendor fungibility` after A17 | PASS | `coordination/SCOPING-MEMO-v0.3.md:265-270` — A14–A17 bullets contiguous; heading follows A17 [both] |
| AC-R36-6 | q32 AC-R32-2 placement-aware assertion | PASS | `test/q32-slice3-close-walk.test.ts:42-50` — `a17Idx`, `vendorIdx`, `vendorIdx > a17Idx` assertion [both] |
| AC-R36-7 | q32 AC-R32-7 literal gauge + degraded/missed_scrape | PARTIAL | `test/q32-slice3-close-walk.test.ts:97-110` — checks for literals in whole-file content (not AC-R32-7 section); see MINOR-5 [opus-partial; sonnet-pass; merger: PARTIAL] |
| AC-R36-8 | q32 AC-R32-13 REVIEWER_REPORT_REGEX + `.test(` call | PASS | `test/q32-slice3-close-walk.test.ts:171-191` — both identifier and call verified [both] |
| AC-R36-9 | q32 AC-R32-14 § 3.2 comment within 5 lines of env: subEnv | PASS | `test/q32-slice3-close-walk.test.ts:193-211` — `envIdx`, 800-char window check [both] |
| AC-R36-10 | q32 AC-R32-18 discriminating regex | PASS | `test/q32-slice3-close-walk.test.ts:248-265` — uses `/^#### CRITICAL-\d+/m`; no false trigger on count:0 summary [both] |
| AC-R36-11 | q25 execSync → execFileSync | PASS | `test/q25-l0-contract.test.ts:18, 216` — array form; no execSync for git [both] |
| AC-R36-12 | q30 execSync → execFileSync | PASS | `test/q30-nvlink-adapter.test.ts:22, 230` — array form [both] |
| AC-R36-13 | R26 MINOR-2 impl alignment — per-distinct-shard dedup | PARTIAL | Code iterates `distinct` shards at `engine/topology/common-mode-attribution.ts:190-196` ✓. But (a) `latest` computed from `shardEarliest` not `shardLatest` — semantic regression (MAJOR-1 [opus]); (b) field docstring at :68-71 says "not per-distinct-shard dedup" contradicting the code (MINOR-1 [sonnet]). Test passes for structural reasons only; spec Then-clause requires accurate docstring — unverified. [both-partial] |
| AC-R36-14 | Q-R26-SPEC.md AC-R26-14 disambiguation | PASS | `coordination/specs/Q-R26-SPEC.md:552` — strikethrough + `[R36-amended:]` + "exit code is 2" unambiguous [both] |
| AC-R36-15 | q28 snap2 source_id/source_version assertions | PASS | `test/q28-slurm-adapter.test.ts:169-170` — both assertions present [both] |
| AC-R36-16 | Q-R34-SPEC.md LS-3 window boundary reconciliation | PASS | `coordination/specs/Q-R34-SPEC.md:410-414` — `[R36-amended — LS-3]` block present [both] |
| AC-R36-17 | Q-R34-SPEC.md LS-4 `\Z` → `$` fix | PASS | `coordination/specs/Q-R34-SPEC.md:639-641` — `[R36-amended — LS-4]` + `(?=^##\s|$)`. Implementation uses `(?![\s\S])` (see MINOR-2 [both]) |
| AC-R36-18 | SPEC-AUTHORING-CHECKLIST.md operator-commit class carve-out | PASS | `coordination/SPEC-AUTHORING-CHECKLIST.md:26-52` — all 4 operator-commit classes + carve-out language [both] |
| AC-R36-19 | CLAUDE-ARCHITECT.md 3 new REINFORCED 2026-05-18 entries | PASS | `CLAUDE-ARCHITECT.md:416, :425, :433` — 3 entries (spec-internal-contradiction, JS regex validation, ALLOWED_SET carve-out). Test asserts ≥3; spec says "exactly 3" (see OBS-1 [opus]) [both] |
| AC-R36-20 | CLAUDE-IMPLEMENTER.md 3 new REINFORCED 2026-05-18 entries | PASS | `CLAUDE-IMPLEMENTER.md:352-388` — spec-vs-impl HALT, regex direct fix, count-by-composition [both] |
| AC-R36-21 | CLAUDE-IMPLEMENTER.md ≤ 30 REINFORCED entries | PASS | `wc` → 30 exactly; at boundary [both] |
| AC-R36-22 | CLAUDE-COMMON.md Pass 3 promotions | PASS | `CLAUDE-COMMON.md:310, :317, :324` — all 3 promoted patterns [both] |
| AC-R36-23 | MR-2 self-application gate (no `content.includes(` in rule text) | PASS | grep → 0 matches in rule text [both] |
| AC-R36-24 | PHASE-2-CLOSE-WALK.md 7 sections | PASS | All §1–§7 present. §5 has arithmetic inconsistency in prose summary (see MINOR-3 [opus]); structure itself present [both] |
| AC-R36-25 | A16 D4 RECONFIRMED at all emit sites | PASS | `engine/events/event-conditional-attribution.ts:38, 133` + `engine/topology/common-mode-attribution.ts:205` carry `correlational_not_causal: true` [both] |
| AC-R36-26 | PR-F7 Cell 4 disposition | PASS | `coordination/PHASE-2-CLOSE-WALK.md:180-182` — explicit disposition with evidence pointer to AC-R26-4 [both] |
| AC-R36-27 | ANCHOR-BACKFLOW-2026-05-18.md 6 sections | PASS | All 6 sections present (§1–§6) [both] |
| AC-R36-28 | tsc exits 0 at chore-A | PASS | Both reviewers ran independently; exit 0 (tsc 5.9.3). NEXT-ROLE.md attestation consistent [both] |
| AC-R36-29 | q36 standalone test count 28/28/0 | PASS | Both confirmed: `node --test test/q36-phase2-close-walk.test.js` → 28/28/0 [both] |
| AC-R36-30 | Anti-scope ALLOWED_SET (round-start to chore-A) | **FAIL** | Test passes (`violations=[]`) but ALLOWED_SET was expanded beyond spec's 22-entry enumeration: (1) adds `test/q-md-f4-common-mode-injection.test.ts` (line 651); (2) adds `coordination/COORDINATOR-MEMORIAL.md` (line 665); (3) relaxes `REVIEWER-REPORT-R36\.md` to `REVIEWER-REPORT-R36(-opus\|-sonnet)?\.md`. Guard is circular for item (1): the test was edited by the same commit that added q-md-f4. Spec enumeration at `Q-R36-SPEC.md:250-273` does not list these paths. **Severity disagreement: Opus=FAIL / Sonnet=PARTIAL → merger: FAIL (severity-max).** See MAJOR-2, MAJOR-3 [both]. |
| AC-R36-31 | Chore-B forward protection | PARTIAL | `test/q36-phase2-close-walk.test.ts:697-725` — test passes (GREEN at `fbc7228`). But `ALLOWED_LITERAL` adds `coordination/COORDINATOR-MEMORIAL.md` (line 701) not in spec § 3's enumeration; regex relaxed to `REVIEWER-REPORT-R36(-opus\|-sonnet)?\.md` (see MINOR-6 [both]). Structural guard works; allowed set exceeds spec. Opus classified as "PASS (structural)"; Sonnet as PASS; merger: PARTIAL given known set expansion [opus-caveat]. |

**Summary:** 26 PASS, 4 PARTIAL, 1 FAIL.

---

## 2. Findings

### CRITICAL

(none)

---

### MAJOR

#### MAJOR-1 — `latest_event_ts` semantic regression: max uses `shardEarliest` not `shardLatest` [opus]

**File:** `engine/topology/common-mode-attribution.ts:188-196`

**Verified at:** lines 190-195 (merger-read).

The R26 MINOR-2 dedup fix iterates over distinct member shards and picks each shard's earliest `event_ts`. The aggregation at line 195 reads:

```typescript
if (shardEarliest > latest) latest = shardEarliest;   // ← uses shardEarliest, not shardLatest
```

`latest_event_ts` therefore equals `max(per-shard earliest event_ts)`, NOT `max(per-shard latest event_ts)` and NOT `max(all event_ts)`. If a shard contributes multiple `fired_events` at different timestamps (e.g., t=1000 and t=1050), the t=1050 entry is discarded — `latest_event_ts` reports 1000 or the next shard's earliest, not 1050.

The correct fix preserves semantic intent of per-distinct-shard dedup while surfacing the true latest:

```typescript
for (const sid of distinct) {
  const sidTouches = touches.filter((t) => t.member_shard_id === sid);
  const shardEarliest = Math.min(...sidTouches.map((t) => t.event_ts));
  const shardLatest   = Math.max(...sidTouches.map((t) => t.event_ts));
  if (shardEarliest < earliest) earliest = shardEarliest;
  if (shardLatest   > latest)   latest   = shardLatest;
}
```

No existing test exercises multi-event-per-shard scenarios; AC-R36-13 verifies structural patterns only (see MAJOR-1 / right-reasons audit §3). The public `CommonModeCandidate.latest_event_ts` field is a wire-format export; producing the wrong value silently is a correctness defect at the interface boundary.

**Relationship to Sonnet OBS-2:** Sonnet flagged the `latest_event_ts` field docstring (line 72: "Max event_ts across the same set of records") as ambiguous. OBS-2 is a documentation symptom of the same root cause; it is addressed by fixing the code plus updating both field docstrings together with MINOR-1.

_Opus: MAJOR-1. Sonnet: not raised (OBS-2 notes docstring ambiguity). Provenance: [opus]._

---

#### MAJOR-2 — AC-R36-30/31 ALLOWED_SETs expanded beyond spec authorization; anti-scope guard circular for q-md-f4 [both]

**Files:** `test/q36-phase2-close-walk.test.ts:643-668` (AC-R36-30); `:700-707` (AC-R36-31); vs spec `coordination/specs/Q-R36-SPEC.md:250-273, :278`

**Three deviations from the spec-enumerated ALLOWED_SET:**

**Deviation 1 (primary — circular):** Test adds `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` at line 651. This path is not in the spec's 22-entry enumeration. The Implementer modified q-md-f4 (TD-2) and in the same round added it to the ALLOWED_SET of the AC-R36-30 guard. The guard cannot independently detect the q-md-f4 scope deviation because it was configured by the same commit that caused the deviation. An independent spec-authorized guard would have flagged this path as a violation. This is the "test reads its own literal and cannot audit itself" pattern documented in `CLAUDE-IMPLEMENTER.md:301-303` (REINFORCED 2026-05-18 anti-scope-allowed-set-forward-coverage).

**Deviation 2:** Test adds `/^coordination\/COORDINATOR-MEMORIAL\.md$/` at line 665 (comment: `// TD-3: Memorial-Updater Wave 5 graduation entries`). Not in spec enumeration. Note: NEXT-ROLE.md TD-3 refers to AC-R32-13/14 window fixes — a TD-3 numbering collision between documents.

**Deviation 3:** Spec enumerates `/^coordination\/reviews\/REVIEWER-REPORT-R36\.md$/`. Test uses `/^coordination\/reviews\/REVIEWER-REPORT-R36(-opus\|-sonnet)?\.md$/`. The hybrid-aware form is operationally correct (OQ-W1-2=A authorized HYBRID_REVIEWER); however, the spec's enumeration (line 272 + pre-emit grilling line 308) still claims the un-suffixed literal, making the spec itself inconsistent with the test. Should have been a spec amendment item.

For AC-R36-31, the spec allows only: `REVIEWER-REPORT-R36.md`, `MEMORIAL.md`, `NEXT-ROLE.md`. Implementation adds `COORDINATOR-MEMORIAL.md` and uses the `-opus|-sonnet` regex — both beyond the spec literal.

The Implementer disclosed all three deviations in NEXT-ROLE.md (TD-1/TD-2/TD-3), but disclosure in NEXT-ROLE.md does not substitute for the correct audit-trail procedure (HALT + DIAGNOSTIC + spec amendment via operator, per the audit-tier promotion-mid-round rule, CLAUDE-COMMON.md REINFORCED 2026-05-17).

**Severity note:** Opus rated this MAJOR; Sonnet rated this MINOR. Merger applies severity-max → MAJOR. The structural integrity of the anti-scope gate is compromised for Deviation 1; this is not a documentation gap.

_Opus: MAJOR-2 (ALLOWED_SET circular). Sonnet: MINOR-2 (same, less severe). Provenance: [both]._

---

#### MAJOR-3 — Anti-scope: `test/q-md-f4-common-mode-injection.test.ts` modified outside spec § 2.2 pre-authorized list [opus]

**File:** `test/q-md-f4-common-mode-injection.test.ts:243-263`

Spec § 2.2 enumerates the pre-authorized Modified file list and does NOT include `test/q-md-f4-common-mode-injection.test.ts`. The Implementer modified this file (pinning AC-R26-16's forward-protection diff to chore-B SHA `9d05889`) and disclosed it as TD-2 in NEXT-ROLE.md:88.

Per Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`, now canonical in `~/.claude/CROSS-PROJECT-MEMORIAL.md` — landed this very round as Deliverable 8) and the audit-tier promotion-mid-round rule (CLAUDE-COMMON.md REINFORCED 2026-05-17): modifying an unauthorized file to make a test pass is a HALT condition. The correct procedure: produce `coordination/diagnostics/DIAGNOSTIC-R36-q-md-f4-anti-scope.md` with bounded options (A: skip this pinning; B: spec amendment via operator); set STATUS: ESCALATE. Instead, the deviation was inlined with NEXT-ROLE.md disclosure only.

**Timing irony:** R36 canonically lands Rule 6 at the Memorial-Updater stage (Deliverable 8) while simultaneously violating it at the Implementer stage (TD-2). The IMPLEMENTER MEMORIAL entry at `coordination/MEMORIAL.md:2785` characterizes this as "acceptable because q29 is in allowed set and the change is observational" — a self-exoneration that contradicts the established halt-discipline reinforcement. Per CLAUDE-COMMON.md REINFORCED 2026-05-16 (self-justifying MEMORIAL entries), this characterization is inaccurate and is recorded as a VIOLATION in §8 MEMORIAL.

The substantive change (SHA pinning for q-md-f4 forward-protection) is defensible; the methodological discipline was skipped.

_Opus: MAJOR-3. Sonnet: subsumed in MINOR-2 + cross-cutting anti-scope notes. Provenance: [opus]._

---

#### MAJOR-4 — Anti-scope: `test/q29-k8s-adapter.test.ts` AC-R29-11 amended outside spec § 2.2 authorization [opus]

**File:** `test/q29-k8s-adapter.test.ts:213-249`

Spec § 2.2 for `test/q29-k8s-adapter.test.ts` authorizes: "skip guard + AC-R29-13 forward-protection SHA pin." The implementation additionally amended AC-R29-11 (lines 216-218 prepend `[R36-amended]` block; lines 225-247 restructure the assertion to accept exit code 0 OR exit code 2 with only {TS2688, TS5107}). This modification is not in the spec's pre-authorized sub-bullet. NEXT-ROLE.md:86 records it as TD-1.

Same Rule 6 halt-discipline pattern as MAJOR-3. The environmental shift (tsc 5.9.3 exits 0; R29 baseline was exit 2) is a spec-versus-empirical conflict that should have triggered DIAGNOSTIC + STATUS: ESCALATE per the encode-actual-results-verbatim reinforcement (CLAUDE-COMMON.md:308). The Implementer instead modified the test inline with NEXT-ROLE.md disclosure.

The substantive observation (tsc now exits 0, no new type errors) is a correct and positive finding. The methodological discipline — not the outcome — was skipped. Documentation of the observed exit-code shift in PHASE-2-CLOSE-WALK.md or ANCHOR-BACKFLOW would help future readers understand why AC-R29-11 was amended (see OBS-3).

_Opus: MAJOR-4. Sonnet: not raised as a separate finding (acknowledged in cross-cutting §5). Provenance: [opus]._

---

### MINOR

#### MINOR-1 — `earliest_event_ts` field docstring contradicts implementation [sonnet]

**File:** `engine/topology/common-mode-attribution.ts:68-71`

**Verified at:** lines 68-71 (merger-read).

Field docstring:
```typescript
/** Min event_ts across all touch records contributing to this candidate
 *  (all appearances of each shard are considered; iteration over all
 *  touches, not per-distinct-shard dedup — R26 MINOR-2 docstring correction). */
earliest_event_ts: number;
```

The phrase "iteration over all touches, not per-distinct-shard dedup" directly contradicts the actual implementation at lines 185-196, which iterates `distinct` (the unique shard IDs) and computes a per-shard minimum before aggregating. The inline comment at lines 185-187 correctly describes the algorithm. The field docstring describes the **pre-R26** behavior — the behavior BEFORE the fix.

This is a spec-Then-clause failure for AC-R36-13: "the module docstring at the top of the file accurately describes this per-distinct-member-shard semantics" — NOT satisfied for this field.

The AC-R36-13 test assertion 3 checks `!content.includes('one record per distinct member shard, picking the earliest')` — this passes because that exact string was never in the file. The actually misleading text at line 70 is not checked by any assertion. See right-reasons audit §3.

**Fix:** Replace "iteration over all touches, not per-distinct-shard dedup" with accurate text, e.g., "one earliest event_ts per distinct member_shard_id, then min across those shard-earliest values." Best addressed together with MAJOR-1's fix (update both field docstrings in the same commit).

_Sonnet: MINOR-1. Opus: not raised as separate finding (MAJOR-1 focuses on code logic; notes docstring issue implicitly). Provenance: [sonnet]._

---

#### MINOR-2 — q34 used `(?![\s\S])` instead of spec-prescribed `$` [both]

**File:** `test/q34-event-conditional-attribution.test.ts:267-269`

Spec § 2.2 q34 authorization: "`\Z` → `$` fix." Actual implementation:

```typescript
const citationBlocks = content.match(/^##\s+(Brodersen|Abadie|Bernal)[\s\S]*?(?=^##\s|(?![\s\S]))/gm);
```

Uses `(?![\s\S])` (negative-lookahead for any character, functioning as end-of-string) rather than `$`. The Q-R34-SPEC.md amendment (lines 639-641) acknowledges both forms as valid JavaScript. Under `/gm` mode, `$` matches end-of-line; `(?![\s\S])` matches end-of-string — the behaviors differ but both may satisfy the practical intent. AC-R36-17 tests the spec file for `(?=^##\s|$)` and passes; it does not verify the q34 test itself.

The spec § 2.2 binding says `$`; the amendment prose mentions both. This unresolved dual-prescription in Q-R34-SPEC.md should be settled in a follow-on amendment: pick one form and update spec § 2.2 to match the actual implementation.

_Opus: MINOR-1. Sonnet: OBS-1 (same substance). Provenance: [both]._

---

#### MINOR-3 — PHASE-2-CLOSE-WALK.md § 5 arithmetic inconsistency [opus]

**File:** `coordination/PHASE-2-CLOSE-WALK.md:121-126`

§ 5 enumerates post-MR-2 CLAUDE-IMPLEMENTER.md structure:
- "1 standalone anti-scope entry (R01)"
- "4 composite headings (HALT-DISCIPLINE, MEMORIAL-AND-ATTESTATION-ACCURACY, SPEC-PRESCRIPTION-FIDELITY, AC-COVERAGE-COMPLETENESS, CORRECTION-PROPAGATION, MEMORIAL-ORDERING-AND-CITATION, CITATION-AND-ARITHMETIC-ACCURACY)" — prose says "4" but lists 7 names
- "4 cross-project rule pointers"
- "15 standalone entries (R14–R34 span)"
- "Total: 30 entries"

1+7+4+15 = 27; 1+4+4+15 = 24. Neither parse yields 30. The observed `wc` count is 30 `^# REINFORCED` lines (verified by AC-R36-21); the prose summary does not reconcile. Per encode-actual-results-verbatim (CLAUDE-COMMON.md:310), count claims should be arithmetically consistent.

_Opus: MINOR-2. Sonnet: not raised. Provenance: [opus]._

---

#### MINOR-4 — AC-R36-3 grep pattern narrower than spec wording [opus]

**File:** `test/q36-phase2-close-walk.test.ts:77`; spec: `coordination/specs/Q-R36-SPEC.md:98`

Spec AC-R36-3 grep target: `execFileSync.*node.*--test` across all `test/q*.test.ts` excluding q29 and q34.

Implementation pattern: `/execFileSync\s*\(\s*['"]node['"]/` — requires `'node'` as the first argument (capturing the subprocess-spawn form) but does NOT require `--test` as an argument. The audit's intent (catch transitive-hang risk from `node --test` spawning) is largely captured; however, `execFileSync('node', ['other-script'])` without `--test` would also match, and `execFileSync('node --test ...')` (single-string form, if any existed) would not match. The alignment with the spec's literal wording is loose. The test also excludes `q36-phase2-close-walk.test.ts` itself (line 75), which the spec wording does not call out — defensible but undocumented.

_Opus: MINOR-3. Sonnet: not raised. Provenance: [opus]._

---

#### MINOR-5 — AC-R32-7 "strengthened" assertion reads whole file content, not targeted section [opus]

**File:** `test/q32-slice3-close-walk.test.ts:97-110`

The R36 strengthening reads the entire `test/q25-l0-contract.test.ts` content and checks whether `'gauge'` and `missed_scrape`/`degraded` appear anywhere. Spec AC-R36-7 wording: "in the relevant test file section." q25 contains at least 14 occurrences of these literals across multiple tests; the discriminating power is low. Any unrelated `'gauge'` literal (e.g., in a header comment) satisfies the assertion.

The pre-R36 weakness was `content.includes('MINOR-3')` (soft text-marker); the R36 "strengthening" trades one soft check for another: searching the whole file for a literal that appears in many places. A correctly scoped assertion would locate the AC-R32-7 marker, extract its test body, and check for `'gauge'` + `missed_scrape`/`degraded` within that bounded window.

_Opus: MINOR-4. Sonnet: not raised. Provenance: [opus]._

---

#### MINOR-6 — REVIEWER-REPORT regex relaxation silently inlined; not in spec enumeration [both]

**Files:** `test/q36-phase2-close-walk.test.ts:667, :707`; spec: `coordination/specs/Q-R36-SPEC.md:272, :308`

Both AC-R36-30 and AC-R36-31 ALLOWED_SETs use `REVIEWER-REPORT-R36(-opus|-sonnet)?\.md` rather than the spec-literal `REVIEWER-REPORT-R36\.md`. The hybrid-aware form is operationally correct — OQ-W1-2=A authorized HYBRID_REVIEWER mode. However, the spec's § 3 enumeration (line 272) and pre-emit grilling (line 308) both list the bare un-suffixed form. This relaxation should have appeared in the spec enumeration or been disclosed as a spec amendment, rather than being silently inlined. Future spec templates with `HYBRID_REVIEWER=true` should standardize on the `(-opus|-sonnet)?` form.

_Opus: MINOR-5. Sonnet: OBS-4 (same substance). Provenance: [both]._

---

### OBS

#### OBS-1 — AC-R36-19 spec says "exactly 3", test asserts ≥ 3 [opus]

**File:** `test/q36-phase2-close-walk.test.ts:411-414`

Spec AC-R36-19: "exactly 3 new REINFORCED 2026-05-18 lines." Test: `assert.ok(entries.length >= 3, ...)`. Laxer than spec. `CLAUDE-ARCHITECT.md` has 13 `# REINFORCED 2026-05-18` entries from various rounds. The test cannot distinguish "exactly 3 new R36-derived entries" from "≥3 entries dated 2026-05-18 regardless of round." Not a correctness issue at R36 (all 3 expected entries are present); flagged for future tightening.

_Opus: OBS-1. Sonnet: not raised. Provenance: [opus]._

---

#### OBS-2 — `latest_event_ts` field docstring ambiguous [sonnet]

**File:** `engine/topology/common-mode-attribution.ts:72`

Field docstring: "Max event_ts across the same set of records." The phrase "same set" does not clarify whether this set consists of per-shard-earliest values (the current implementation's source set) or raw `event_ts` across all touches (the pre-R26 behavior). Combined with MINOR-1's incorrect `earliest_event_ts` docstring, a reader of the exported interface has no accurate description of either field's aggregation semantics. Best resolved together with MAJOR-1's fix.

_Sonnet: OBS-2. Provenance: [sonnet]._

---

#### OBS-3 — tsc exits 0 but R29 baseline was exit 2; amendment path context [opus]

`test/q29-k8s-adapter.test.ts` AC-R29-11 was originally authored in an environment where tsc 5.9.3 produced exit code 2 with {TS2688, TS5107}. The R36 Implementer found the current environment exits 0 cleanly (no infra errors). This is a positive environmental shift. PHASE-2-CLOSE-WALK.md or ANCHOR-BACKFLOW-2026-05-18.md could usefully document why AC-R29-11 was amended, so future readers understand the amendment is an environmental baseline correction, not a spec goal change. The substantive outcome (tsc is clean) is correct; discipline gap is in MAJOR-4 above.

_Opus: OBS-2. Provenance: [opus]._

---

## 3. Right-reasons audit (union of both reviewers; deduplicated)

### Test 1: AC-R36-1 — PASS right-reasons [sonnet]

**Test:** `test/q36-phase2-close-walk.test.ts:26-50`
**Spec Then-clause:** "when NODE_TEST_CONTEXT or NODE_TEST_WORKER_ID is set, the test calls `t.skip()` and returns without spawning the child process."

Test reads `test/q29-k8s-adapter.test.ts`, locates `AC-R29-12` marker, extracts 900-char window, asserts all four required elements: `NODE_TEST_CONTEXT`, `NODE_TEST_WORKER_ID`, `t.skip(`, `return;`. The q29 guard at lines 248-250 contains exactly these elements. **Verdict: LEGITIMATE PASS.** The discriminating mechanism (specific string literals within a bounded window anchored to the AC marker) is non-trivially self-confirming.

### Test 2: AC-R36-13 — FAIL right-reasons [both]

**Test:** `test/q36-phase2-close-walk.test.ts:287-305`
**Spec Then-clause (partial):** "the module docstring at the top of the file accurately describes per-distinct-member-shard semantics."

Three assertions: (1) R26-MINOR-2 marker present — verifies shape only; (2) `for (const sid of distinct)` loop present — verifies shape only; (3) `!content.includes('one record per distinct member shard, picking the earliest')` — PASSES because that exact string was never in the file. None of the three assertions checks the actual misleading text at line 70 (`"not per-distinct-shard dedup"`), which is what the spec's docstring accuracy requirement targets. **Verdict: SELF-CONFIRMING (shape-only verification).** The semantic bug (MAJOR-1) and docstring error (MINOR-1) are both invisible to this test suite. Both reviewers independently identified this failure.

### Test 3: AC-R36-22 — PASS right-reasons [opus]

**Test:** `test/q36-phase2-close-walk.test.ts:479-498`
**Spec Then-clause:** "CLAUDE-COMMON.md after MR-2 Pass 3 contains the 3 promoted universal patterns."

Three `content.includes(...)` checks match three descriptive rule-name substrings (`encode-actual-results-verbatim`, `data-flow-not-syntax`, `line-citation-cite-then-verify`) in `CLAUDE-COMMON.md:310, :317, :324`. These substrings are unique and non-trivially present only by actually appending the rules. **Verdict: LEGITIMATE PASS.** The discriminators are non-trivial to fabricate accidentally.

### Test 4: AC-R36-30 — FAIL right-reasons [both]

**Test:** `test/q36-phase2-close-walk.test.ts:640-690`
**Spec Then-clause:** "every path in the diff matches at least one regex in the AC-R36-30 ALLOWED_SET."

Test runs `git diff 36ab019..HEAD --name-only`, checks each path against ALLOWED_SET, asserts `violations=[]`. The ALLOWED_SET (24 entries) includes `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` at line 651 — added by the same commit that modified q-md-f4 (TD-2). The anti-scope check passes because the Implementer added the unauthorized path to the guard's own allow-list. **Verdict: SELF-CONFIRMING by construction** (circular authority). Both reviewers independently identified this failure; Sonnet provided more detailed per-deviation analysis, Opus provided the reinforcement cross-reference.

### Test 5: AC-R36-2 — PASS right-reasons [sonnet]

**Test:** `test/q36-phase2-close-walk.test.ts` (AC-R36-2 block)
**Spec Then-clause:** "when NODE_TEST_CONTEXT or NODE_TEST_WORKER_ID is set, the test calls `t.skip()` and returns without spawning the child process" (q34 mirror of AC-R36-1).

Mirrors AC-R36-1's window-anchored pattern for `test/q34-event-conditional-attribution.test.ts:362-365`. The guard at those lines satisfies all four required elements. **Verdict: LEGITIMATE PASS** for the same reasons as Test 1.

---

## 4. Cross-cutting checks

### TDD discipline

Both reviewers confirmed: RED commit `45969ae` (failing stubs for AC-R36-1..30) precedes GREEN commit `c49df0e` (Phase 2 close-walk implementation). Per `git log 36ab019..c49df0e`: RED-only test commit verified; zero engine/* changes at RED.

**Verdict: SATISFIED.**

### No-skip discipline

Full suite: 354/352/0/2skip at chore-A; 355/353/0/2skip at chore-B.

Two authorized skips: AC-R29-12 (NODE_TEST_CONTEXT=child-v8 under `node --test`; skip guard fires to prevent transitive subprocess deadlock) and AC-R34-21 (same mechanism, q34 context). Both authorized by R36 scope; skip guards are the explicit subject of AC-R36-1 and AC-R36-2.

**Verdict: SATISFIED** (no unauthorized skips).

### Halt discipline

**FAILED.** NEXT-ROLE.md:84-90 lists Tactical deviations TD-1 and TD-2 as "non-halt, documented here." Per Rule 6 and the audit-tier promotion-mid-round rule:

- **TD-1** (AC-R29-11 AC-R29-11 tsc env change): spec-vs-empirical conflict (tsc exit 2 → exit 0) on an out-of-authorized-scope test file requires HALT + DIAGNOSTIC + STATUS: ESCALATE. Instead: inline amendment + NEXT-ROLE.md disclosure. See MAJOR-4.
- **TD-2** (q-md-f4 AC-R26-16 SHA pinning): modifying an unauthorized file to satisfy a forward-protection pin requires HALT + DIAGNOSTIC + STATUS: ESCALATE. Instead: unauthorized modification + NEXT-ROLE.md disclosure + circular ALLOWED_SET expansion. See MAJOR-3.
- **TD-3** (AC-R32-13/14 window fixes): in-scope for q32 pre-authorized modifications — no violation.

**Verdict: FAIL** (TD-1 and TD-2 violate halt-discipline; see MAJOR-3, MAJOR-4).

### Anti-scope (delta vs spec § 2.2)

Files modified not in spec § 2.2 pre-authorized list:
- `test/q-md-f4-common-mode-injection.test.ts` (modified — MAJOR-3)
- `coordination/COORDINATOR-MEMORIAL.md` (modified — within MAJOR-2 context)

Inline AC modifications not in spec § 2.2 sub-bullet:
- `test/q29-k8s-adapter.test.ts` AC-R29-11 amendment (MAJOR-4)
- `test/q34-event-conditional-attribution.test.ts` regex divergence from spec-prescribed `$` (MINOR-2)

Files in spec § 2.2 but not modified: `coordination/specs/Q-R32-SPEC.md` — acceptable (pre-authorized list is an upper bound).

Engine internals: only `engine/topology/common-mode-attribution.ts` modified; pre-authorized. A16 D4 (`correlational_not_causal: true`) RECONFIRMED at all emit sites.

**Verdict: FAIL** — 2 unauthorized file modifications + 1 unauthorized inline AC amendment.

---

## 5. False positives (verified incorrect from per-model reports)

**(none)**

All findings from both models were verified against actual file content during the merger's §4 verification step. The following were examined for potential false-positive status and confirmed correct:

- **Opus MAJOR-1** (line 195 code bug): confirmed — `if (shardEarliest > latest) latest = shardEarliest;` verified in merger read of `engine/topology/common-mode-attribution.ts:195`.
- **Sonnet MINOR-1** (earliest_event_ts docstring): confirmed — lines 68-71 contain "iteration over all touches, not per-distinct-shard dedup" while code at 190-196 iterates `distinct` shards; verified in same merger read.
- **Opus MAJOR-2 / Sonnet MINOR-2** (ALLOWED_SET circular): confirmed — spec enumeration at lines 250-273 does not include q-md-f4 or COORDINATOR-MEMORIAL.md; verified against spec and test file.
- **Opus MAJOR-3/4** (unauthorized modifications): confirmed by NEXT-ROLE.md TD-1/TD-2 disclosures and spec § 2.2 enumeration.

The severity disagreement between Opus (MAJOR) and Sonnet (MINOR) for the anti-scope/ALLOWED_SET issues is calibration-level, not a false-positive. Both reviewers observed the same facts; they assigned different weights. Merger applied severity-max per merge rules.

---

## 6. Routing decision

**0 CRITICAL / 4 MAJOR / 6 MINOR / 3 OBS**

Per routing rule: no CRITICAL → **STATUS: MERGE-READY**.

MAJOR-1 (semantic regression in `latest_event_ts`) requires a follow-on implementation fix (~3 lines + docstring update) and an AC fixture exercising multi-event-per-shard scenarios. MAJOR-2/3/4 (halt-discipline and anti-scope violations) cannot be retroactively converted to compliance; a spec amendment commit routing TD-1 and TD-2 deviations through the proper audit trail would satisfy the methodological requirement without reverting the substantive changes.

The Phase 2 close-walk substantively achieves its goals: eight deliverables landed, subprocess-hang fixed, R32/R34 carry-forwards closed, MR-2 consolidation applied, PHASE-2-CLOSE-WALK.md present. The four MAJORs are discipline-process violations against the backdrop of a round that simultaneously canonically lands Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) — a "rule-derivation-without-self-application" companion to MR-2's broader theme.

The Coordinator's Wave 5 gate (R37) should weigh whether the MAJORs warrant a corrective round before issuing the HARD STOP, or whether they are within acceptable tolerance given the completeness of the eight deliverables.

---

## 7. Merger notes

**Coverage differential:**

Opus (0 CRITICAL / 4 MAJOR / 5 MINOR / 3 OBS) performed deeper semantic analysis and halt-discipline tracing. It caught: the `latest_event_ts` code logic bug (MAJOR-1), three separate MAJOR-tier characterizations of the anti-scope/halt-discipline violations (MAJOR-2/3/4), and five MINORs covering documentation, grep pattern fidelity, and assertion scope.

Sonnet (0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS) performed more precise docstring analysis. It caught: the `earliest_event_ts` docstring contradiction (MINOR-1, the cleaner formulation of the Sonnet-unique finding), and gave a more detailed per-deviation breakdown of the ALLOWED_SET self-amendment (MINOR-2, which became MAJOR-2 after severity-max). Sonnet's right-reasons failure analysis for AC-R36-13 (MINOR-1 root cause) was more precise than Opus's (which identified the bug without tracing the docstring contradiction as the AC's specific unverified clause).

**Key severity disagreement:**
Opus rated ALLOWED_SET circular expansion + anti-scope violations as 3 MAJORs; Sonnet rated them as 2 MINORs. This is the largest calibration gap between the two models in this round. The merger's severity-max resolution (→ MAJOR) is the correct conservative choice given that these violations compromised the structural integrity of the anti-scope gate and involved unauthorized file modifications without DIAGNOSTIC.

**What each model uniquely contributed:**
- Opus uniquely found: MAJOR-1 (code logic semantic regression), MAJOR-4 (q29 AC-R29-11 anti-scope, separate from q-md-f4), MINOR-3 (arithmetic inconsistency), MINOR-4 (grep pattern fidelity), MINOR-5 (AC-R32-7 whole-file read), OBS-1 (exactly-3 vs ≥3), OBS-3 (tsc exit context).
- Sonnet uniquely found: MINOR-1 (earliest_event_ts docstring contradiction), OBS-2 (latest_event_ts docstring ambiguity as a distinct documentation note).
- Both found: MAJOR-2 / MINOR-2 core (ALLOWED_SET circular/anti-scope), MINOR-2 (regex $-vs-(?![\s\S])), MINOR-6 (REVIEWER-REPORT regex relaxation), and AC-R36-13 right-reasons failure.

**Recommendation for future hybrid sessions:** The severity-calibration gap on halt-discipline violations (MAJOR vs MINOR) should be added to the hybrid-reviewer calibration notes. Opus's semantic analysis depth on production code correctness was higher; Sonnet's docstring accuracy tracing was higher. A hybrid session is net-positive for both dimensions.
