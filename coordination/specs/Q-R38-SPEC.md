# Q-R38-SPEC — latest_event_ts MAJOR-1 Remediation

**Round:** R38  
**Tier:** audit  
**Role:** IMPLEMENTER (wears Architect hat)  
**Date:** 2026-05-19

---

## § 1 Goal

Fix the `latest_event_ts` semantic regression introduced by the R26 MINOR-2 dedup
fix. Line 195 of `engine/topology/common-mode-attribution.ts` compares
`shardEarliest` against `latest` (the max accumulator), so
`CommonModeCandidate.latest_event_ts` reports `max(per-shard earliest event_ts)`
instead of `max(per-shard latest event_ts)`. The fix is a targeted 3-line code
change at lines 188-196 plus docstring corrections at the
`earliest_event_ts` and `latest_event_ts` fields. A new test file
`test/q38-verification.test.ts` delivers two behavioral ACs plus a chore-B
forward-protection AC.

---

## § 2 Mechanism

### § 2.1 Brainstorm (inline per Superpowers Execute discipline)

Three approaches considered:

| # | Approach | Strengths | Weaknesses |
|---|---|---|---|
| A | Add `shardLatest = Math.max(...touches.filter(...))` alongside existing `shardEarliest` without extracting `sidTouches` | Minimal diff | Runs the same filter twice (minor inefficiency; also harder to read) |
| B | Extract `sidTouches` variable, compute both `shardEarliest` and `shardLatest` from it | One filter pass; matches NEXT-ROLE.md wording exactly ("introduce `shardLatest` … alongside existing `shardEarliest`"); clean | Slightly more lines than A but clearer |
| C | Extract a named helper `computeShardRange(touches, sid)` | Cleaner abstraction | More lines than needed for a 3-line fix; abstraction overhead not warranted at this scope |

**Selected: Approach B.** Matches operator spec text verbatim; single filter pass; no unnecessary abstraction.

**Rejected:** A (double-filter, harder to read). C (premature abstraction).

### § 2.2 Component inventory and ALLOWED_SET

| File | Action | Git-trackable |
|---|---|---|
| `engine/topology/common-mode-attribution.ts` | Modified (fix + docstrings) | Yes |
| `test/q38-verification.test.ts` | Created (new) | Yes |
| `coordination/specs/Q-R38-SPEC.md` | Created (this file) | Yes |
| `coordination/reviews/REVIEWER-REPORT-R38.md` | Created by Reviewer | Yes |
| `coordination/MEMORIAL.md` | Appended (pending diff already present; further appends at round close) | Yes |
| `coordination/NEXT-ROLE.md` | Updated at round close | Yes |
| `coordination/logs/ROUND-R38-SUMMARY.md` | Created at round close | Yes |
| `coordination/diagnostics/DIAGNOSTIC-R38-baseline-mismatch.md` | Committed (untracked at spec time) | Yes |

**ALLOWED_SET (verbatim; used by AC-R38-4 anti-scope guard; written pre-RED-commit):**
```
engine/topology/common-mode-attribution.ts
test/q38-verification.test.ts
coordination/specs/Q-R38-SPEC.md
coordination/reviews/REVIEWER-REPORT-R38.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/logs/ROUND-R38-SUMMARY.md
coordination/diagnostics/DIAGNOSTIC-R38-baseline-mismatch.md
```

### § 2.3 Code fix (lines 188-196)

Current (buggy):
```typescript
let earliest = Number.POSITIVE_INFINITY;
let latest = Number.NEGATIVE_INFINITY;
for (const sid of distinct) {
  const shardEarliest = Math.min(
    ...touches.filter((t) => t.member_shard_id === sid).map((t) => t.event_ts),
  );
  if (shardEarliest < earliest) earliest = shardEarliest;
  if (shardEarliest > latest) latest = shardEarliest;   // BUG: shardEarliest used in max path
}
```

Fixed:
```typescript
let earliest = Number.POSITIVE_INFINITY;
let latest = Number.NEGATIVE_INFINITY;
for (const sid of distinct) {
  const sidTouches = touches.filter((t) => t.member_shard_id === sid);
  const shardEarliest = Math.min(...sidTouches.map((t) => t.event_ts));
  const shardLatest = Math.max(...sidTouches.map((t) => t.event_ts));
  if (shardEarliest < earliest) earliest = shardEarliest;
  if (shardLatest > latest) latest = shardLatest;
}
```

### § 2.4 Docstring corrections

`earliest_event_ts` field (lines 68-71): remove "iteration over all touches, not
per-distinct-shard dedup" (the post-R26-MINOR-2 correction phrase is now itself
incorrect because the implementation IS doing per-distinct-shard dedup). Replace
with accurate description naming per-distinct-shard semantics explicitly.
Docstring MUST NOT contain: "iteration over all touches".
Docstring MUST contain: a phrase that includes "per-distinct-shard".

`latest_event_ts` field (line 73): current text "Max event_ts across the same set
of records" is vague and does not describe the per-shard-latest semantics after
the MAJOR-1 fix. Replace with accurate description.
New docstring MUST contain: a phrase that includes "per-distinct-shard".

### § 2.5 Integration points and failure modes

- `attributeCommonMode()` is the only consumer of the loop at lines 188-196.
  No external callers of `shardEarliest`/`shardLatest` (local variables).
- `correlational_not_causal: true` at line 205 MUST NOT be touched (A16).
- Docstring lines 68-71 are in the public `CommonModeCandidate` interface; the
  fix is textual only — no type-shape change.
- Failure mode: if `shardLatest` is not introduced (revert), multi-event-per-shard
  fixtures where max(ts) > min(ts) will produce `latest_event_ts = min(ts)` instead
  of `max(ts)`. AC-R38-1 structurally catches this (mutation test mandated).

---

## § 3 Acceptance criteria

### AC-R38-1 (FIXTURE — mandatory behavioral)

**Given** a `CommonModeAttributionInput` where shard `gpu-0` contributes two
`fired_events` at `event_ts=1000` and `event_ts=1050`, shard `gpu-1` contributes
one `fired_events` at `event_ts=900`, both shards connect to shared node `psu-1`
(kind `'psu'`) within hop distance 1, and `min_member_count=2`.

**When** `attributeCommonMode(input)` is called.

**Then** `result.candidates` has exactly 1 entry; `candidates[0].latest_event_ts
=== 1050` (not 1000, not 900); `candidates[0].earliest_event_ts === 900`.

**Mutation requirement:** reverting line 195 to `if (shardEarliest > latest) latest
= shardEarliest;` MUST cause this AC to FAIL (latest_event_ts becomes 1000, not
1050). The test uses `strictEqual`.

### AC-R38-2 (DOCSTRING — mandatory behavioral)

**Given** the file content of `engine/topology/common-mode-attribution.ts` read at
runtime.

**When** the `earliest_event_ts` docstring section is inspected AND the
`latest_event_ts` docstring section is inspected.

**Then:**
- `earliest_event_ts` docstring: `content` DOES NOT contain `'iteration over all
  touches'` (the pre-fix misleading phrase); AND the `earliest_event_ts` jsdoc block
  DOES contain `'per-distinct-shard'`.
- `latest_event_ts` docstring: the `latest_event_ts` jsdoc block DOES contain
  `'per-distinct-shard'`.

Both assertions use `strictEqual(result, true)` against boolean predicates derived
from `content.includes(...)` — NOT vacuous checks against strings absent from the
file.

### AC-R38-3 (COUNT — infrastructure)

**Given** chore-A SHA `0b4d79f` (GREEN commit; `engine/topology/common-mode-attribution.ts`
fix + `test/q38-verification.test.ts` GREEN state).

**When** `node --test test/*.test.js` is run at this SHA.

**Then** output contains `tests 357`, `pass 351`, `fail 4`, `skip 2`.  
`npx tsc -p tsconfig.test.json` exits 0.

*(Baseline entering R38: 355 tests, 349 pass, 4 fail, 2 skip. R38 adds 2 new test()
calls in `test/q38-verification.test.ts`. Empirically verified at GREEN commit.)*

### AC-R38-4 (ANTISCOPE — infrastructure)

**Given** `git diff <RED-commit-SHA>..HEAD --name-only -- . ':!*.js'` at chore-A.

**When** the diff output is compared against the ALLOWED_SET (§ 2.2).

**Then** every path in the diff output is a member of the ALLOWED_SET; no paths
outside the ALLOWED_SET appear.

*(RED-commit SHA encoded in chore-B forward-protection test at q38-verification.ts
— NOT expanded post-implementation per Rule 4.)*

---

## § 4 Anti-scope

- NO modification of inherited vendored-at-pin engine internals beyond the
  carved-out scope at `engine/topology/common-mode-attribution.ts:188-196` and
  docstrings at :68-71 and `latest_event_ts` field.
- NO modification of any pre-R36 test file (q01..q36 frozen).
- NO modification of `CLAUDE-*.md` reinforcement files.
- NO modification of `coordination/SCOPING-MEMO-v0.3.md`.
- NO optional R36 carry-forward items (MINOR-2, -3, -4, -5, -6, OBS-3) scoped this
  round — deferred to R39/R41 per operator disposition in NEXT-ROLE.md.
- NO Phase 3 territory; NO type extension at `engine/types/verdict.ts` (if needed,
  HALT + DIAGNOSTIC + ESCALATE per halt condition 2).
- `correlational_not_causal: true` literal at line ~205 preserved (A16).

---

## § 5 Open questions

None — all resolved. Operator disposition: Option A (accept actual baseline; proceed
with new test file). No architectural decisions deferred.

---

## § 6 Pre-emit grilling (self-review per Superpowers Review phase)

1. **Verifiability:** every AC has a specific verifiable outcome (strictEqual values,
   exact string assertions, exact test counts). No "appropriately" or "correctly" language.
2. **Unstated assumptions:** (a) `gpu-0`/`gpu-1`/`psu-1` node IDs don't collide with
   other fixture state — fixture is self-contained in new test file; (b) `'iteration
   over all touches'` IS currently in the earliest_event_ts docstring (verified at
   lines 68-71 during spec authoring — "iteration over all touches" appears at line 70).
   (c) "per-distinct-shard" is NOT currently in either docstring (the fix will add it).
3. **Scope audit:** only mandatory items scoped; optional items explicitly excluded.
4. **Implementer-actionability:** Reviewer can verify all 4 ACs cold with file reads +
   node --test invocation. Zero clarifying questions required.
5. **ALLOWED_SET written pre-RED-commit:** § 2.2 enumerates all paths before any code
   is written. Rule 4 gate: PASSED.
6. **Mutation test requirement:** AC-R38-1 explicitly requires that reverting the fix
   causes the test to fail. Rule 2 (branch-binding-coverage) gate: PASSED.
7. **Docstring absence check legitimacy:** "iteration over all touches" IS present in
   current line 70 (verified by reading engine/topology/common-mode-attribution.ts:68-71
   at spec authoring time). NOT a vacuous check per Rule 3 + R36 reinforcement #3.
