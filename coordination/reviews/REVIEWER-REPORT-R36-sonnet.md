# REVIEWER-REPORT-R36-sonnet — Tessera Phase 2 Close-Walk (WU-07)

**Round:** R36 (Wave 5, single cluster, audit tier + HYBRID_REVIEWER=true; main worktree).
**Reviewer:** Claude Sonnet 4.6.
**Date:** 2026-05-18.
**Inputs consulted:** `coordination/specs/Q-R36-SPEC.md`; `coordination/PHASE-2-CLOSE-WALK.md`; `coordination/ANCHOR-BACKFLOW-2026-05-18.md`; `coordination/SPEC-AUTHORING-CHECKLIST.md`; `coordination/NEXT-ROLE.md`; `coordination/MEMORIAL.md`; `coordination/SCOPING-MEMO-v0.3.md`; `engine/topology/common-mode-attribution.ts`; `engine/events/event-conditional-attribution.ts`; `test/q36-phase2-close-walk.test.ts`; `test/q29-k8s-adapter.test.ts`; `test/q34-event-conditional-attribution.test.ts`; `test/q32-slice3-close-walk.test.ts`; `test/q-md-f4-common-mode-injection.test.ts`; `CLAUDE-IMPLEMENTER.md`; `CLAUDE-COMMON.md`; `CLAUDE-ARCHITECT.md`; `coordination/specs/Q-R26-SPEC.md`; `coordination/specs/Q-R34-SPEC.md`; git log `36ab019..82eb468`.
**NOT consulted:** Any prior Reviewer session logs; `.prompt-*.md` files; `coordination/diagnostics/`.
**Binding commands run independently:**

```
npx tsc -p tsconfig.test.json
→ Exit code: 0 (tsc 5.9.3; no TS2688/TS5107 errors in current environment)
```

```
node --test test/q36-phase2-close-walk.test.js
→ tests=28 / pass=28 / fail=0
```

```
node --test test/*.test.js
→ tests=354 / pass=352 / fail=0 / skip=2 (AC-R29-12, AC-R34-21 skip guards under NODE_TEST_CONTEXT)
```

```
git diff 36ab019..82eb468 --name-only
→ 21 paths (see ALLOWED_SET verification below)
```

---

## 1. Per-AC Verification Table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R36-1 | q29 AC-R29-12 skip guard (NODE_TEST_CONTEXT\|NODE_TEST_WORKER_ID) | PASS | `test/q29-k8s-adapter.test.ts:240-243`; test pass |
| AC-R36-2 | q34 AC-R34-21 skip guard | PASS | `test/q34-event-conditional-attribution.test.ts` (line ~362-366); test pass |
| AC-R36-3 | grep audit — no other test files carry execFileSync node --test | PASS | Independent grep: `grep -l "execFileSync.*'node'" test/q*.test.ts` → q29, q34, q36 only (q36 excluded by test); test pass |
| AC-R36-4 | Forward-protection SHA pins (q29/q32/q34) | PASS | q29:`c55ac39` = R29 chore-B ✓; q32:`7f737d6` = R32 chore-B ✓; q34:`cfbc526` = R34 Memorial-Updater ✓; q-md-f4:`9d05889` = R26 chore-B ✓ |
| AC-R36-5 | SCOPING-MEMO A14 rationale contiguous; `### Vendor fungibility` after A17 | PASS | `coordination/SCOPING-MEMO-v0.3.md:268-270`: A17 at line 268, `### Vendor fungibility` at line 270; no h3 between A14 (line ~234) and A15 (line ~242); test pass |
| AC-R36-6 | q32 AC-R32-2 placement-aware (vendorIdx > a17Idx) | PASS | `test/q32-slice3-close-walk.test.ts:160-171`: checks `vendorIdx > a17Idx` with `'### Vendor fungibility'` prefix; test pass |
| AC-R36-7 | q32 AC-R32-7 gauge + degraded literals | PASS | `test/q32-slice3-close-walk.test.ts:174-194`: checks `'gauge'` AND `missed_scrape`/`degraded`; test pass |
| AC-R36-8 | q32 AC-R32-13 REVIEWER_REPORT_REGEX identifier + `.test(` call | PASS | `test/q32-slice3-close-walk.test.ts:174`: uses `indexOf("test('AC-R29-13:")` (header false-match fix); test pass |
| AC-R36-9 | q32 AC-R32-14 § 3.2 comment within window of env: subEnv | PASS | `test/q32-slice3-close-walk.test.ts:201`: window expanded to 800 chars; `§ 3.2` at q29 line 249, `env: subEnv` at line 259 (~700 chars apart); test pass |
| AC-R36-10 | q32 AC-R32-18 discriminating regex (not plain includes) | PASS | `test/q32-slice3-close-walk.test.ts:237-249`: checks `/^#### CRITICAL-\d+/m` pattern; test pass |
| AC-R36-11 | execSync → execFileSync in q25 | PASS | `test/q25-l0-contract.test.ts`: `execFileSync('git', ['diff',...])` array form; no execSync for git; test pass |
| AC-R36-12 | execSync → execFileSync in q30 | PASS | `test/q30-nvlink-adapter.test.ts`: same pattern; test pass |
| AC-R36-13 | R26 MINOR-2 per-distinct-shard dedup | PASS | `engine/topology/common-mode-attribution.ts:180,190`: two `for (const sid of distinct)` loops; docstring corrected at :70 (`R26 MINOR-2 docstring correction`); test pass |
| AC-R36-14 | Q-R26-SPEC.md AC-R26-14 disambiguation | PASS | `coordination/specs/Q-R26-SPEC.md:552`: `~~then the exit code is 0~~` + `[R36-amended: the following supersedes the prior claim]`; test pass |
| AC-R36-15 | q28 snap2 source_id/source_version assertions | PASS | `test/q28-slurm-adapter.test.ts`: `snap2.source_id` + `snap2.source_version` assertions present; test pass |
| AC-R36-16 | Q-R34-SPEC.md LS-3 window boundary reconciliation | PASS | `coordination/specs/Q-R34-SPEC.md`: `[R36-amended]` block with boundary reconciliation; test pass |
| AC-R36-17 | Q-R34-SPEC.md LS-4 `\Z` → `$` | PASS | `coordination/specs/Q-R34-SPEC.md`: `[R36-amended — LS-4]` + corrected `(?=^##\s|$)`; test pass |
| AC-R36-18 | SPEC-AUTHORING-CHECKLIST.md exists with operator-commit class | PASS | `coordination/SPEC-AUTHORING-CHECKLIST.md` present; contains STAGED-FOR, WAVE-PLAN, WAVE-GATE, CLUSTER-HANDOFF; carve-out recommendation present; test pass |
| AC-R36-19 | CLAUDE-ARCHITECT.md 3× REINFORCED 2026-05-18 | PASS | Lines 416/425/433: boundary clause (R34 MINOR-2), JS regex validation (R34 MINOR-3), ALLOWED_SET operator-commit class (R34 MAJOR-1); test pass |
| AC-R36-20 | CLAUDE-IMPLEMENTER.md 3× REINFORCED 2026-05-18 | PASS | Three 2026-05-18 entries present (spec-vs-impl HALT, regex fix over workaround, count by composition); test pass |
| AC-R36-21 | CLAUDE-IMPLEMENTER.md ≤30 REINFORCED entries | PASS | Independent count: `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` → 30 (exactly at target); test pass |
| AC-R36-22 | CLAUDE-COMMON.md Pass-3 promotions (3 universal patterns) | PASS | `CLAUDE-COMMON.md:310-330`: encode-actual, data-flow-not-syntax, line-citation; test pass |
| AC-R36-23 | MR-2 self-application gate (no `content.includes(` in rule text) | PASS | `grep -c "content\.includes(" CLAUDE-IMPLEMENTER.md` → 0; composite headings name trigger conditions explicitly; test pass |
| AC-R36-24 | PHASE-2-CLOSE-WALK.md §1-§7 complete | PASS | All 7 sections present; §1 4-SLICE table; §2 14 friction surfaces + 6 cross-project rules; §3 TAGGED-FUTURE; §4 ADR walk + RECONFIRMED; §5 memorial stamp; §6 freeze-hook coupling; §7 cross-references; test pass |
| AC-R36-25 | A16 D4 RECONFIRMED — correlational_not_causal: true at all emit sites | PASS | `engine/events/event-conditional-attribution.ts:38` (type decl) + `:133` (emit); `engine/topology/common-mode-attribution.ts:205`; both are string literal `true`, not boolean; PHASE-2-CLOSE-WALK.md §4 documents RECONFIRMED; test pass |
| AC-R36-26 | PR-F7 Cell 4 disposition | PASS | `coordination/PHASE-2-CLOSE-WALK.md:182`: Cell 4 verified at R26 Reviewer stage via AC-R26-4 in `test/q-md-f4-common-mode-injection.test.ts`; UNCHANGED through Phase 2; explicit disposition note present; test pass |
| AC-R36-27 | ANCHOR-BACKFLOW-2026-05-18.md structure (4 PR candidates + Tailscale + Coordinator) | PASS | §1 pre-emit grilling; §2 pipeline watchdog; §3 orphan reaping; §4 spec template anti-scope; §5 Tailscale; §6 Coordinator graduation; test pass |
| AC-R36-28 | tsc exits 0 at chore-A SHA | PASS | Reviewer-run: exit 0 (tsc 5.9.3); consistent with NEXT-ROLE.md attestation |
| AC-R36-29 | q36 28/0 standalone | PASS | `node --test test/q36-phase2-close-walk.test.js` → 28/28/0; per-file counts in NEXT-ROLE.md with arithmetic |
| AC-R36-30 | Anti-scope allowed-set gate (round-start to chore-A) | PASS | `git diff 36ab019..82eb468 --name-only` → 21 paths; all match ALLOWED_SET in test; test pass. See MINOR-1 and MINOR-2 below. |

---

## 2. Findings

### MINOR-1 — spec ALLOWED_SET listing does not include q-md-f4 (TD-2)

**File:** `coordination/specs/Q-R36-SPEC.md:251-273` (ALLOWED_SET listing) vs `test/q36-phase2-close-walk.test.ts:643` (`/^test\/q-md-f4-common-mode-injection\.test\.ts$/` regex).

**Observation:** The spec's ALLOWED_SET listing (22 regexes at §3 AC-R36-30) does not include `test/q-md-f4-common-mode-injection.test.ts`. The test file's runtime ALLOWED_SET includes it (added as TD-2 — q-md-f4 AC-R26-16 forward-protection pinning). Per REINFORCED 2026-05-18 R32 MINOR-2 (spec AC amendment without disambiguation), spec amendments should be marked — the listing should reflect the actual file set.

**Severity:** MINOR. The runtime gate (AC-R36-30 test) passes with the expanded set. TD-2 is well-documented in NEXT-ROLE.md. The discrepancy is listing-level only; no correctness or safety gap.

**Remediation:** A subsequent coord-only commit could append `— [R36-amended: q-md-f4 added as TD-2; close-walk forward-protection pinning]` to the ALLOWED_SET listing in Q-R36-SPEC.md, or alternatively a note in § 3 prose. Not required for Phase 2 close.

---

### MINOR-2 — REVIEWER-REPORT regex form: spec literal vs test hybrid-aware form

**File:** `coordination/specs/Q-R36-SPEC.md:272` (`/^coordination\/reviews\/REVIEWER-REPORT-R36\.md$/`) vs `test/q36-phase2-close-walk.test.ts:664` (`/^coordination\/reviews\/REVIEWER-REPORT-R36(-opus|-sonnet)?\.md$/`).

**Observation:** The spec lists the literal form without the optional `-opus|-sonnet` suffix. The test uses the HYBRID_REVIEWER-aware form that also permits `-opus.md` and `-sonnet.md` variants. Since HYBRID_REVIEWER=true is declared in the round scope, the test form is the correct one. The spec listing is under-specified for the declared hybrid mode.

**Severity:** MINOR. The runtime check (test) is correct for the declared HYBRID_REVIEWER=true scope. The spec listing inaccuracy was inherited from the pre-hybrid template. No correctness gap; the test correctly allows both variant names.

**Remediation:** Not required for Phase 2 close. Future spec templates should include the `(-opus|-sonnet)?` form when HYBRID_REVIEWER is declared.

---

## 3. Observations (OBS)

**OBS-1 — AC-R36-9 window size reasoning:** The AC-R32-14 check uses a 800-char window to find `§ 3.2` comment before `env: subEnv`. The measured distance is ~700 chars (q29 lines 249–259). The window size is adequate but tight. A future edit to q29 AC-R29-12 that adds lines between the § 3.2 comment and the execFileSync call could break this check. Recommend: the § 3.2 comment should be placed immediately before the `env: subEnv` line in a future q29 cleanup pass for cleaner locality.

**OBS-2 — AC-R29-11 tsc behavior change:** tsc 5.9.3 exits 0 where older environments produced TS2688/TS5107. The AC-R29-11 test was updated (NEXT-ROLE.md TD-1) to accept both exit 0 (current) and exit 2 with only {TS2688, TS5107}. This is a correct and well-documented environmental adaptation.

**OBS-3 — Skip guard semantics under NODE_TEST_CONTEXT:** AC-R29-12 and AC-R34-21 skip whenever `NODE_TEST_CONTEXT` is set (which is always true under `node --test`, even for standalone invocations). These ACs are effectively standalone-only checks now. This is documented in PHASE-2-CLOSE-WALK.md §2 as the "frozen historical check" pattern and is consistent with REINFORCED 2026-05-17 R19 MAJOR-3.

**OBS-4 — Phase 2 HARD STOP confirmed:** PHASE-2-CLOSE-WALK.md §3 correctly enumerates TAGGED-FUTURE items and states Phase 3 requires separate operator authorization. No Phase 3 work is present in the chore-A diff. A16 (DeploySignal-integration scope) and A17 (same) are preserved at Phase 2 close.

---

## 4. Executive Summary

R36 Phase 2 close-walk delivers all 8 planned deliverables with full GREEN test suite (354/352/0/2skip). The two MINORs are both spec-listing level (ALLOWED_SET listing does not reflect TD-2 expansion; REVIEWER-REPORT regex under-specified for HYBRID mode). No correctness, safety, or methodology-gap issues found.

**Addition #26 D4 wire-format invariant confirmed:** `correlational_not_causal: true` as string literal at both Phase 2 emit sites (`engine/events/event-conditional-attribution.ts:38,133`; `engine/topology/common-mode-attribution.ts:205`). No D4 reversal or weakening.

**Phase 2 HARD STOP condition confirmed:** No Phase 3 work in diff. All TAGGED-FUTURE items enumerated in PHASE-2-CLOSE-WALK.md §3.

**MR-2 consolidation confirmed:** CLAUDE-IMPLEMENTER.md = 30 REINFORCED entries (at target); no weak patterns (`content.includes(`) in rule text; 3 universal patterns promoted to CLAUDE-COMMON.md.

**Verdict: PASS**

---

## 5. Reviewer Routing Note

Post-review:
- NEXT: Memorial-Updater — Rule 6 canonical landing in `~/.claude/CROSS-PROJECT-MEMORIAL.md`; COORDINATOR-MEMORIAL graduation entries per ANCHOR-BACKFLOW §6
- Then: chore-B (AC-R36-31 forward protection runtime test)
- Then: Coordinator R37 Wave 5 gate → HARD STOP
