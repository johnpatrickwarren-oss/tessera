# REVIEWER REPORT — R38 (latest_event_ts MAJOR-1 remediation)

**Round:** R38 (audit-tier; Implementer wears Architect hat; cold Reviewer)
**Date:** 2026-05-19
**Reviewer mandate:** find what the Implementer got wrong, assume ≥1 mistake exists.
**Inputs cold-read:** PRD.md, Q-R38-SPEC.md, engine/topology/common-mode-attribution.ts, test/q38-verification.test.ts, NEXT-ROLE.md, ~/.claude/CROSS-PROJECT-MEMORIAL.md (Reviewer section grep + R26/R36 entries), git log/show for RED/GREEN/chore-A/chore-B commits.
**Inputs NOT read:** coordination/diagnostics/ contents (existence verified via git log only), coordination/logs/ROUND-R38-SUMMARY.md, .prompt-*.md, Q-R38-SPEC-AUDIT.md (audit-tier — none expected), prior Reviewer reports R02–R37.

---

## § 1 Per-AC verification table

| AC-ID    | Criterion (short)                                                            | Status  | Evidence (file:line or empirical)                                                                                                                                                                                                                          |
|----------|------------------------------------------------------------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-R38-1 | latest_event_ts = max(per-shard latest), mutation revert → 1000              | PASS    | `test/q38-verification.test.ts:36-78` asserts `cand.latest_event_ts === 1050` for fixture (gpu-0@1000,1050; gpu-1@900). Production fix at `engine/topology/common-mode-attribution.ts:197,199` introduces `shardLatest` + uses it in max-path. Reverting line 199 to `if (shardEarliest > latest) latest = shardEarliest;` yields 1000 ≠ 1050 → test fails. Strong mutation discrimination. |
| AC-R38-2 | Both jsdoc blocks contain `'per-distinct-shard'`; absence of `'iteration over all touches'` (spec literal) | **PARTIAL** | `test/q38-verification.test.ts:91-95` checks absence of `'not per-distinct-shard dedup'` — **different phrase** from spec § 2.4 / AC-R38-2 literal `'iteration over all touches'`. `test:101-111` checks `'per-distinct-shard'` in **latest_event_ts** jsdoc only — spec literal requires checking the **earliest_event_ts** jsdoc as well. Substantive intent (no misleading docstring; both jsdocs accurate) is met by the source at `engine/topology/common-mode-attribution.ts:68-77`, but the test does not assert the AC literal. See MINOR-1. |
| AC-R38-3 | At chore-A SHA `0b4d79f`: tests=357, pass=351, fail=4, skip=2; tsc exit=0    | PASS at spec'd SHA / drifts at HEAD | At `0b4d79f` (RED 41c1ff1 + GREEN 0b4d79f → +2 q38 test() calls): baseline 355 + 2 = 357 ✓. `npx tsc -p tsconfig.test.json` empirically exits 0 at HEAD (verified). At HEAD post chore-B `577b551` the actual count is **358/351/4/3** (AC-R38-4 adds +1 test +1 skip post-chore-A). NEXT-ROLE.md:188-193 correctly attests both. Spec § 3 AC-R38-3 wording references SHA `0b4d79f` only; NEXT-ROLE.md uses chore-A SHA `8bf0247` for the same 357/351/4/2 count (no new tests landed 0b4d79f→8bf0247). See MINOR-2 (SHA terminology) and MINOR-3 (post-chore-B count not specified). |
| AC-R38-4 | `git diff RED..HEAD --name-only -- . ':!*.js'` ⊆ ALLOWED_SET                  | PASS    | `test/q38-verification.test.ts:116-137` runs the diff and filters against the 8-entry `ALLOWED_SET`. Manual reproduction: `git diff 41c1ff1..HEAD --name-only -- . ':!*.js'` → 6 paths (MEMORIAL.md, NEXT-ROLE.md, ROUND-R38-SUMMARY.md, Q-R38-SPEC.md, common-mode-attribution.ts, q38-verification.test.ts) — all in ALLOWED_SET. ALLOWED_SET written at RED-commit time and not expanded post-implementation (Rule 4 honored — verified by comparing spec § 2.2 ALLOWED_SET to test ALLOWED_SET byte-for-byte). |

---

## § 2 Findings

### CRITICAL
None.

### MAJOR
None.

### MINOR

**MINOR-1 — AC-R38-2 spec-literal divergence (`test/q38-verification.test.ts:91-111`).**
Spec § 2.4 declares: "Docstring MUST NOT contain: 'iteration over all touches'. Docstring MUST contain: a phrase that includes 'per-distinct-shard'." Spec § 3 AC-R38-2 expands: "`content` DOES NOT contain `'iteration over all touches'` … AND the `earliest_event_ts` jsdoc block DOES contain `'per-distinct-shard'` … AND the `latest_event_ts` jsdoc block DOES contain `'per-distinct-shard'`."

The implemented test diverges in two ways:
1. Absence check uses `'not per-distinct-shard dedup'` (line 92), NOT the spec-literal `'iteration over all touches'`. The pre-fix docstring contains BOTH phrases (`git show aa0f7aa:engine/topology/common-mode-attribution.ts` line 68-70: `"... iteration over all touches, not per-distinct-shard dedup ..."`), so the test is non-vacuous, but it does not implement the AC literal text.
2. Presence check covers only the `latest_event_ts` jsdoc (lines 101-111). The `earliest_event_ts` jsdoc presence-of-`'per-distinct-shard'` clause is unimplemented; symmetric coverage missing.

Substantive intent (post-fix file contains accurate per-distinct-shard text in both jsdocs and no misleading legacy phrase) is met — verified at `engine/topology/common-mode-attribution.ts:68-77` (line 69 `per-distinct-shard dedup` for earliest; line 74 `per-distinct-shard dedup` for latest). The risk: a future regression that reintroduces `'iteration over all touches'` without also reintroducing `'not per-distinct-shard dedup'` would silently pass the absence check; a regression that strips `'per-distinct-shard'` from `earliest_event_ts` while keeping it in `latest_event_ts` would silently pass the presence check. R36 MINOR-1 reinforcement #3 (`docstring-accuracy-positive-assertion`) explicitly targets this risk class.

**MINOR-2 — Chore-A SHA terminology contradiction (Q-R38-SPEC.md § 3 AC-R38-3 vs NEXT-ROLE.md:183, vs `test/q38-verification.test.ts:8` header).**
- Spec § 3 AC-R38-3: "Given chore-A SHA `0b4d79f`" (the GREEN/fix commit).
- NEXT-ROLE.md:183: "Chore-A SHA (implementation complete): `8bf0247`" (the coordination commit).
- `test/q38-verification.test.ts:8` comment: "Chore-A SHA: 8bf0247. Count at 8bf0247: 357 tests, 351 pass, 4 fail, 2 skip."

Substantively benign because no new tests landed between `0b4d79f` and `8bf0247`, so both SHAs share the 357/351/4/2 attestation. But three artifacts in the same round describe "chore-A" inconsistently, weakening audit-trail traceability. Tessera precedent at R26/R28/R29/R30 uses chore-A = the GREEN/impl commit; R38's commit-message convention `chore(R38): chore-A coordination artifacts` (commit `8bf0247`) introduces a separate naming. The spec § 3 reference to `0b4d79f` is internally consistent with the spec but contradicts both the commit-message convention and the Implementer attestation.

**MINOR-3 — AC-R38-3 baseline count under-specified for post-chore-B state (`Q-R38-SPEC.md:158-168`).**
Spec § 3 AC-R38-3 prescribes a single SHA-pinned count `tests 357 / pass 351 / fail 4 / skip 2` at `0b4d79f`. At HEAD post-chore-B `577b551`, the empirical count is `tests 358 / pass 351 / fail 4 / skipped 3` because AC-R38-4 (added in chore-B) adds one test that self-skips in the `node --test` worker context. NEXT-ROLE.md:190-194 correctly captures both SHAs and their distinct counts, but spec § 3 itself does not include a chore-B count AC. Per R22 IMPL MINOR-1 reinforcement (count-AC chore-A SHA anchoring) the spec correctly anchors to a specific SHA — but the missing chore-B count means there is no AC binding the post-forward-protection attestation. The forward-protection test (AC-R38-4) auto-skipping under node's test runner means the AC literal count `fail=4` survives even if AC-R38-4 itself were broken, because skip ≠ fail.

### OBS

**OBS-1 — GREEN commit modified the test file alongside the production code (`git show 0b4d79f --stat`).**
GREEN commit `0b4d79f` (`fix(R38): MAJOR-1 latest_event_ts ...`) touched both `engine/topology/common-mode-attribution.ts` (+26/-15) and `test/q38-verification.test.ts` (+1/-1; window 300 → 500). The test-side change was needed because the new (longer, 317-char) `latest_event_ts` jsdoc would not fit in the 300-char window from the RED commit, causing `lastDocStart = -1` and `latestTsDoc = ''` to silently fail the presence check. The Implementer disclosed this in the GREEN commit message and in NEXT-ROLE.md:206 tactical deviation #4.

Strict-reading consequence: if production code had been applied without the test-side window expansion, AC-R38-2 would have failed at GREEN for a test-side bug, not a production-side bug. This is a mild form of the Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) anti-pattern — the test was modified to accommodate the spec-prescribed docstring length. Justification for OBS-not-MINOR: the test-side change is a window-size bug-fix in the Reviewer-orthogonal extraction logic, not a substantive divergence from spec AC text; both RED commit assertions still failed at RED for the substantively correct reasons (line 199 bug + pre-fix misleading phrase presence + absent `'per-distinct-shard'` post-extraction with the original short docstring). RED→GREEN audit-trail integrity preserved.

**OBS-2 — Spec § 2.4 docstring-content prescription has weak structural binding.**
Spec § 2.4 prescribes "Docstring MUST contain: a phrase that includes 'per-distinct-shard'" — case-sensitive lowercase. NEXT-ROLE.md:206 tactical deviation #5 records that the Implementer initially wrote `Per-distinct-shard` (capital P) in the docstring and changed to lowercase to match the test's case-sensitive `includes()` check. The same risk class as MINOR-1: case-sensitive string-presence assertions on free-form documentation are brittle. A future docstring rewrite that uses "Per-distinct-shard dedup" capitalization would silently fail AC-R38-2 even though substantively correct.

**OBS-3 — R36 forward-protection AC-R36-31 fails post-R38 (expected; documented).**
`node --test` shows `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set` failing with R38's modifications appearing in the diff. This is expected R38 behavior — R38 is a legitimate fix-cycle for R26 MAJOR-1 and its modifications fall outside R36's frozen post-chore-A allowed set. NEXT-ROLE.md:45 + DIAGNOSTIC-R38-baseline-mismatch.md (per spec § 2.2 and git log `aa0f7aa`) correctly diagnosed and operator-dispositioned as Option A pre-session. Mentioned for trail-completeness only — no action.

**OBS-4 — AC-R38-4 self-skips under `node --test test/*.test.js` (`test/q38-verification.test.ts:117-122`).**
The skip-guard (`process.env['NODE_TEST_CONTEXT'] != null || process.env['NODE_TEST_WORKER_ID'] != null`) is the R34 incident discipline — preventing subprocess-spawn hangs in the worker context. Acceptable application of the discipline. Note that AC-R38-4 thereby contributes 0 to `pass`/`fail` and 1 to `skip` under the standard binding command, which is why NEXT-ROLE.md:194 also runs `node test/q38-verification.test.js` directly to exercise the AC. The direct-run attestation `3 pass, 0 fail` is recorded in NEXT-ROLE.md but not bound by any AC. Same audit-trail observation as MINOR-3.

---

## § 3 Right-reasons audit (3-test sample)

**Test (a): AC-R38-1 — `test/q38-verification.test.ts:36-78`.**
- Requirement covered: spec § 3 AC-R38-1 fixture + mutation requirement.
- Self-confirming risk: NONE. Expected value `1050` is computed externally from the spec-prescribed fixture (`max(1000, 1050)` for gpu-0). The fixture deliberately gives gpu-0 two events with `t2 > t1`, exercising the multi-event-per-shard path that the bug at pre-fix line 195 silently mishandled. Mutation reverting line 199 to `if (shardEarliest > latest) latest = shardEarliest;` yields `latest = max(1000, 900) = 1000 ≠ 1050` — test fails. Strong counterfactual.

**Test (b): AC-R38-2 — `test/q38-verification.test.ts:82-112`.**
- Requirement covered: spec § 3 AC-R38-2 docstring accuracy (partially — see MINOR-1).
- Self-confirming risk: PARTIAL. The absence check on `'not per-distinct-shard dedup'` is non-vacuous because the pre-fix file at `git show aa0f7aa:engine/topology/common-mode-attribution.ts:68-70` empirically contains that exact phrase. The presence check on `'per-distinct-shard'` in latest_event_ts jsdoc is non-vacuous because the pre-fix `latest_event_ts` docstring (`Max event_ts across the same set of records.`) does NOT contain the phrase. However, the AC literal text is not honored — see MINOR-1.

**Test (c): AC-R38-4 — `test/q38-verification.test.ts:116-137`.**
- Requirement covered: spec § 3 AC-R38-4 anti-scope diff.
- Self-confirming risk: NONE in principle (external `git diff` command + ALLOWED_SET written at RED-commit time = test cannot fabricate its own pass condition). The Implementer wrote the spec § 2.2 ALLOWED_SET pre-RED, then mirrored it byte-for-byte into the test `ALLOWED_SET` at chore-B. Per R36 MAJOR-2 ("anti-scope-allowed-set-self-expansion"), the structural risk is that the same role writes both the spec and the test ALLOWED_SET; in R38's audit-tier model this is unavoidable but the spec § 2.2 enumeration is git-frozen at the spec commit `aa0f7aa` (before RED `41c1ff1`), so any post-spec expansion would be detectable. Spot-check: spec § 2.2 lists 8 paths matching test:23-32 — no drift. The skip-under-worker behavior (OBS-4) reduces coverage but doesn't make the test self-confirming.

None of the three tests are self-confirming. The AC-R38-2 weakness is spec-literal-fidelity, not self-confirmation.

---

## § 4 Cross-cutting checks

**TDD discipline:**
- RED commit `41c1ff1` precedes GREEN commit `0b4d79f` (git log verified). RED message: "AC-R38-1 + AC-R38-2 failing before fix". RED commit contains 2 q38 test() calls (AC-R38-1 + AC-R38-2; AC-R38-4 not yet added). At RED with bug intact, both ACs fail for substantively correct reasons (line 195 bug → latest=1000; pre-fix docstring contains `'not per-distinct-shard dedup'` and lacks `'per-distinct-shard'` in latest_event_ts).
- GREEN commit modifies both production code AND test (window 300→500) — see OBS-1.
- chore-B `577b551` adds AC-R38-4 with the RED-commit SHA pinned and ALLOWED_SET mirroring spec § 2.2. No post-implementation ALLOWED_SET expansion.

**No-skip / halt-discipline:**
Pre-session, the Implementer correctly halted on baseline mismatch (expected 353 pass / 0 fail per NEXT-ROLE.md baseline directive vs actual 349 pass / 4 fail) and wrote `coordination/diagnostics/DIAGNOSTIC-R38-baseline-mismatch.md` per Rule 6. ESCALATE was operator-dispositioned to Option A (accept actual baseline; new test file). No further halt conditions fired during R38 work. Tactical deviations 1-5 in NEXT-ROLE.md:201-206 (field name corrections; module-system idiom; window size; case sensitivity) are local implementation idiom corrections, not spec-vs-empirical conflicts — Rule 6 not implicated.

**Anti-scope:**
`git diff 41c1ff1..HEAD --name-only -- . ':!*.js'` → 6 paths, all ⊆ ALLOWED_SET. No frozen A12-anchored files modified beyond the carved-out scope at `engine/topology/common-mode-attribution.ts:68-77, 188-200`. A16 (`correlational_not_causal: true` literal) preserved at line 209 (verified). `engine/topology-overlay.ts`, `engine/types/verdict.ts`, `engine/core.ts`, `engine/hardware-topology-source.ts`, all `test/_substrate/*` substrates, all R36 deliverable test files, and `CLAUDE-*.md` reinforcement files all unmodified by R38 (verified by enumerating the 6-path diff).

---

## § 5 Pre-route grilling

| Check | Result |
|---|---|
| Every finding has file:line reference? | YES (MINOR-1: q38-verification.test.ts:91-111; MINOR-2: Q-R38-SPEC.md § 3 + NEXT-ROLE.md:183 + q38-verification.test.ts:8; MINOR-3: Q-R38-SPEC.md:158-168; OBS-1: git show 0b4d79f; OBS-2: NEXT-ROLE.md:206; OBS-3: q36-phase2-close-walk.test.ts AC-R36-31; OBS-4: q38-verification.test.ts:117-122) |
| Any AC marked PASS without direct verification? | NO (AC-R38-1 mutation traced through the code; AC-R38-2 partial verdict justified by line-by-line comparison; AC-R38-3 empirically verified at HEAD + reasoned at spec'd SHA; AC-R38-4 empirically reproduced via independent `git diff`) |
| Right-reasons audit completed for 3+ tests? | YES (AC-R38-1, AC-R38-2, AC-R38-4) |
| Cold-review boundary held (no diagnostics/logs/.prompt-* read)? | YES |
| Adversarial mandate honored (≥1 finding)? | YES (3 MINOR + 4 OBS) |
| Findings reproducible by re-running this report's commands cold? | YES (all `git show`, `node --test`, `npx tsc`, `git diff` commands documented inline) |

All grilling gates PASS.

---

## § 6 Verdict + routing

| Class | Count | Items |
|---|---|---|
| CRITICAL | 0 | — |
| MAJOR    | 0 | — |
| MINOR    | 3 | MINOR-1 (AC-R38-2 spec-literal divergence); MINOR-2 (chore-A SHA terminology contradiction); MINOR-3 (count AC under-specified for chore-B state) |
| OBS      | 4 | OBS-1 (test+prod modified at GREEN); OBS-2 (case-sensitive docstring binding); OBS-3 (R36 forward-protection legitimately fails post-R38); OBS-4 (AC-R38-4 self-skip under node --test) |

**STATUS: MERGE-READY.** 0 CRITICAL; the substantive MAJOR-1 fix is correctly implemented and structurally bound by AC-R38-1's mutation requirement; A16 preserved; anti-scope clean. The 3 MINORs are spec-fidelity / audit-trail issues, not behavioral defects. The 36th consecutive 0-CRITICAL round (R02–R38).
