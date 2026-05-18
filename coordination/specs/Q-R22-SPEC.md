# Q-R22-SPEC — Phase 2 SLICE 2 Close-Walk + R20/R21 MINOR Cleanup

**Round:** R22 (audit tier — Implementer authors spec + executes)
**Scope reference:** `SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 SLICE 2 row; NEXT-ROLE.md R22 round-scope directive
**Baseline SHA:** `f7111c9` (HEAD at R22 session start — R22-prep chore commit)
**Pre-R22 baseline test count:** 201 / 0 (per REVIEWER-REPORT-R21.md + NEXT-ROLE.md)

---

## § 0 Brainstorm phase (Superpowers discipline — inlined)

### Three distinct approaches

**Approach A — Execute all 5 deliverables exactly as NEXT-ROLE.md directs**
- Strengths: zero scope ambiguity; all decisions pre-made by operator in NEXT-ROLE.md; no architectural choices required.
- Weaknesses: close-walk doc writing is content-intensive.
- Hidden assumptions: dedup-guard test will pass immediately on current production code; short-circuit test will correctly disambiguate the two mechanisms.
- Risks: low; test scenarios are well-specified by REVIEWER-REPORT-R21.md MINOR-2/3.

**Approach B — Merge close-walk and MINOR table into a smaller doc, skip per-section depth**
- Strengths: faster to produce.
- Weaknesses: violates NEXT-ROLE.md explicit instruction to mirror PHASE-2-SLICE-1-CLOSE-WALK.md structure exactly; Reviewer would flag.
- Risks: structural mismatch with SLICE 1 close-walk; downstream reference breakage.

**Approach C — Create a new q22 test file for AC-R22-3/4/8 instead of appending to q21**
- Strengths: clean per-round test file separation.
- Weaknesses: violates NEXT-ROLE.md pre-authorization scope ("test/q21-fleet-verdict-consumer.test.ts — ADD new test row(s)"); anti-scope risk.
- Risks: creating an unauthorized file = ESCALATE per R19 precedent.

**Selection: Approach A.** Approach B violates the structural template requirement; Approach C violates pre-authorization scope. Approach A is the only valid choice given operator NEXT-ROLE.md directives.

---

## § 1 Design phase (Superpowers discipline — inlined)

### Component boundaries

| Component | Status | Notes |
|---|---|---|
| `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` | CREATED | Close-walk doc; mirrors SLICE 1 structure; 6 sections |
| `coordination/specs/Q-R22-SPEC.md` | CREATED | This file; committed before chore-A per R21 MINOR-1 reinforcement |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts:4-6` | CHANGED (header only) | Remove AC-R20-12 from binding-command list; acknowledge it as runtime test |
| `test/q21-fleet-verdict-consumer.test.ts` | CHANGED (add rows) | Append AC-R22-3 + AC-R22-4 tests; chore-B adds AC-R22-8 |
| `test/q01-no-at-pin-deltas.test.ts:7-8` | CHANGED (header only) | Refresh stale formula: 30 → 36; update addend list |
| `coordination/NEXT-ROLE.md` | CHANGED (routing) | Update routing block at chore-A |
| `coordination/MEMORIAL.md` | CHANGED (append) | R22 ceremony entries at chore-A |
| `engine/**` | UNCHANGED | R22 anti-scope; all engine files frozen |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts` (test logic) | UNCHANGED | Pre-auth scope: header lines 4-6 only |
| `test/q01-no-at-pin-deltas.test.ts` (AT_PIN_FILES) | UNCHANGED | Pre-auth scope: header lines 7-8 only |

### Integration points

1. **AC-R22-3 dedup scenario → rollupByClusterEvent → seen_group_ids guard**: Two verdicts with same `deploy_ref` under same `cluster_event_id` + `ts_seconds` produce two `IngestResult`s attributed to the SAME VerdictGroup (same `group_id`). `rollupByClusterEvent` must dedupe: `rollup.groups.length === 1`. Failure mode: guard removed → `groups.length === 2`.

2. **AC-R22-4 short-circuit scenario → fleetTickIngest with `cluster_event_id: ''` → groups have `.cluster_event_id === ''` → rollupByClusterEvent short-circuits**: Passing `cluster_event_id: ''` to `fleetTickIngest` stores `''` raw on the VerdictGroup (per R20 § 2.6). `rollupByClusterEvent('', results)` must short-circuit at `verdict-consumer.ts:77-79` and return `[]`. Failure mode: short-circuit removed → strict equality `'' !== ''` is false → group IS pushed → `rollup.groups.length === 1` ≠ expected 0.

3. **q01 header fix → comment only, no behavioral change**: Lines 7-8 are a comment block. Test logic (AT_PIN_FILES array) is unchanged; the array already has 36 entries. The comment just needs to accurately describe them.

4. **q20 header fix → comment only, no behavioral change**: Lines 4-6 describe AC ownership. AC-R20-12 is a runtime test at `:186-205`, not a binding-command attestation. Fix removes AC-R20-12 from the attestation list.

5. **Close-walk doc → cross-references to R20+R21 artifacts**: Must cite correct file paths and SHAs. All paths verified by reading REVIEWER-REPORT-R20.md, REVIEWER-REPORT-R21.md, ROUND-R20-SUMMARY.md, ROUND-R21-SUMMARY.md.

### PRD / scope-memo verification

All deliverables are bookkeeping and close-walk documentation. No PRD FR-E3x behavioral change. AC-P4 remains unaffected. A12/A16/A17 anti-scopes preserved.

---

## § 2 Goal

R22 delivers the Phase 2 SLICE 2 close-walk document and five in-passing fixes: (1) `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` mirrors the SLICE 1 structure; (2) the q20 file-header corrects the AC-R20-12 classification from "binding-command attestation" to "runtime test"; (3) a new q21 test row structurally exercises the `seen_group_ids` dedup guard in `rollupByClusterEvent`; (4) a new q21 test row structurally exercises the empty-string short-circuit in `rollupByClusterEvent`; (5) the q01 file-header refreshes the stale 30-file formula to the accurate 36-file tally. No production code changes.

---

## § 3 Mechanism

### Deliverable 1 — PHASE-2-SLICE-2-CLOSE-WALK.md

Structure mirrors `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` exactly:

- **§ 1 Scope summary** — R18+R20+R21 contribution to SLICE 2 (type substrate → aggregator-contract re-keying → fleet-merge consumer layer); HEAD SHA at SLICE 2 close; 3 substantive rounds (R18 SLICE 1 substrate; R20 SLICE 2.A; R21 SLICE 2.B); test count 201; 0-CRITICAL streak 20 rounds (R02–R21).

- **§ 2 Architectural-assessment retrospective** — Four themes:
  1. Vendoring-with-deltas at scale: 3rd application of the two-step pattern (R01 config.ts; R18 verdict.ts; R20 verdict-groups.ts). Pre-handling in spec; no ESCALATE needed at R20.
  2. Split-decision retrospective: NEXT-ROLE.md directed split if ACs > 12. R20 = 15 ACs (aggregator-contract-only); R21 = 11 ACs (fleet-merge consumer). Both within budget; fleet-merge clean deferred scope.
  3. 0-MAJOR streak: R20 first tessera full-tier round with 0 MAJOR. R21 continues: 2 consecutive 0-MAJOR full-tier rounds (R20–R21). 20-round 0-CRITICAL streak extends through SLICE 2.
  4. Line-citation-drift pattern: 3rd tessera occurrence at R21 MINOR-4 (R03, R18, R21). Cross-project reinforcement rule derived at 3-occurrence threshold; R22 attestation citations verified at `test()` declaration line per the rule.

- **§ 3 SLICE 3 entry framing** — HardwareTopologySource concrete impl (PRD FR-E3b); entry dependencies; architectural sketch (TopologySource interface; v9X substrate; BFS-on-undirected extension); expected surfaces; 3-4 Q-cycle estimate; open questions (OQ-1, OQ-R08-3, LS-4); Hybrid Reviewer pair-review at SLICE 3 close.

- **§ 4 R20+R21 MINOR disposition table** — 8 rows covering all MINOR findings from R20 + R21 Reviewer reports, each with R22 disposition (CLOSED / REINFORCEMENT-ONLY / CARRY-FORWARD).

- **§ 5 Memorial state stamp** — REINFORCED counts empirically verified via `grep -c "^# REINFORCED"` on each CLAUDE-*.md file at R22 session start. Values: COMMON:3, ARCH:21, IMPL:35, REVIEWER:1, MEMORIAL:0, Total:60.

- **§ 6 Cross-references** — Specs, review reports, SCOPING-MEMO, commit chain.

### Deliverable 2 — q20 header fix (lines 4-6)

Current lines 4-6 include "AC-R20-12 (anti-scope diff)" in the binding-command attestation list. AC-R20-12 is a SHA-pinned runtime test committed in the file body at `:186-205` per spec § 4.7. Fix: remove AC-R20-12 from the binding-command list; assert it is a runtime test per § 4.7 in its own sentence.

### Deliverable 3 — AC-R22-3 dedup-guard test (appended to q21)

Scenario: `fleetTickIngest` called with 2 verdicts sharing the same `deploy_ref: 'deploy-A'` under the same `cluster_event_id: 'evt-X'` and `ts_seconds`. Both are attributed to the SAME VerdictGroup (same composite key → same `group_id`). `rollupByClusterEvent(results, 'evt-X')` MUST return `rollup.groups.length === 1` (dedupe fires on 2nd result). Failure gate: removing `seen_group_ids.has()` at `engine/fleet/verdict-consumer.ts:87-94` → test FAILS at `rollup.groups.length === 1` (actual would be 2).

### Deliverable 4 — AC-R22-4 short-circuit test (appended to q21)

Scenario: `fleetTickIngest` called with `cluster_event_id: ''`. Per R20 § 2.6, VerdictGroup stores `cluster_event_id === ''` raw. `rollupByClusterEvent('', results)` MUST short-circuit at `engine/fleet/verdict-consumer.ts:77-79` and return `{ groups: [], deploy_ids: [] }`. Failure gate: removing lines 77-79 → strict equality `g.cluster_event_id !== ''` is false for the empty-string group → group IS pushed → `rollup.groups.length === 1` FAILS assertion `deepStrictEqual(rollup.groups, [])`.

### Deliverable 5 — q01 header lines 7-8 fix

Current: `// type files at-pin (8 excl config.ts) + compilation deps (2) = 30 files.`

Correct (per actual AT_PIN_FILES array at `:29-76`; 36 entries):
- detectors: 11
- family types: 5
- core orchestration: 4
- type files at-pin: 7 (excl config.ts [R01] + verdict.ts [R18])
- compilation deps: 6
- SLICE 4 tools: 3
- Total: 36

New line 8: `// type files at-pin (7 excl config.ts, verdict.ts) + compilation deps (6) + SLICE 4 tools (3) = 36 files.`

### Commit ordering

1. **Commit A (spec)**: `coordination/specs/Q-R22-SPEC.md` — per R21 MINOR-1: spec committed before chore-A.
2. **Commit B (implementation)**: `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` + `test/q20-*:4-6` fix + `test/q21-*` 2 new test rows + `test/q01-*:7-8` fix.
3. **Commit C (chore-A)**: `coordination/NEXT-ROLE.md` (routing) + `coordination/MEMORIAL.md` (ceremony). Chore-A SHA recorded in NEXT-ROLE.md attestation block.
4. **Commit D (chore-B)**: AC-R22-8 anti-scope runtime test appended to `test/q21-*.ts`; chore-A SHA substituted in the test literal.

---

## § 4 Acceptance criteria

**AC-R22-1** — Given `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` exists, when the document is read, then it contains: (a) a § 1 header block naming R18/R20/R21 as the contributing rounds and citing the HEAD SHA at SLICE 2 close; (b) a § 2 retrospective with at least one paragraph each on vendoring-with-deltas pattern application, split-decision retrospective, 0-MAJOR streak emergence, and line-citation-drift pattern (3rd occurrence); (c) a § 3 SLICE 3 entry framing that names HardwareTopologySource, the TopologySource interface at `engine/topology-overlay.ts`, and at least one open question (OQ-1 or OQ-R08-3 or LS-4); (d) a § 4 MINOR disposition table with ≥6 rows covering R20 MINOR-1/2/3, R21 MINOR-1/2/3; (e) a § 5 Memorial state stamp table with empirically-verified REINFORCED counts for all five CLAUDE-*.md files summing to 60; (f) a § 6 cross-references section citing Q-R20-SPEC.md, Q-R21-SPEC.md, REVIEWER-REPORT-R20.md, REVIEWER-REPORT-R21.md.

**AC-R22-2** — Given `test/q20-verdict-grouper-cluster-event-scope.test.ts`, when lines 4-6 are read, then: (a) the string "AC-R20-12" does NOT appear in any sentence containing "binding-command attestations"; (b) the string "AC-R20-12" DOES appear in a sentence describing it as a runtime test committed in the file body per § 4.7.

**AC-R22-3** — Given `test/q21-fleet-verdict-consumer.test.ts` contains a new test exercising the dedup-guard path, when `node --test test/q21-fleet-verdict-consumer.test.js` runs on the current codebase, then the test PASSES; when the `seen_group_ids.has(g.group_id)` guard is removed from `engine/fleet/verdict-consumer.ts:87`, the test FAILS (`rollup.groups.length` would be 2 but assertion expects 1).

**AC-R22-4** — Given `test/q21-fleet-verdict-consumer.test.ts` contains a new test exercising the empty-string short-circuit path, when `node --test test/q21-fleet-verdict-consumer.test.js` runs on the current codebase, then the test PASSES; when lines 77-79 of `engine/fleet/verdict-consumer.ts` are removed, the test FAILS (`rollup.groups` would be non-empty but assertion expects `[]`).

**AC-R22-5** — Given `test/q01-no-at-pin-deltas.test.ts`, when lines 7-8 are read, then: (a) line 8 contains "36 files"; (b) line 8 contains both "7" (type-files-at-pin count) and "6" (compilation-deps count); (c) the arithmetic within the comment sums to 36 (verifiable by the Reviewer reading the addends).

**AC-R22-6** — Given the Tessera TypeScript project, when `npx tsc -p tsconfig.test.json` runs, then exit code is 0.

**AC-R22-7** — Given the full test suite after R22 implementation commits, when `node --test test/*.test.js` runs, then pass count = 203 and fail count = 0. (Baseline 201 + 2 new AC-R22-3 + AC-R22-4 tests.)

**AC-R22-8** — Given the git diff from baseline `f7111c9` to the chore-A SHA `<MERGE-READY-SHA>`, when `git diff f7111c9..<MERGE-READY-SHA> --name-only` runs, then every output path is in the allowed-set: {`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`, `coordination/specs/Q-R22-SPEC.md`, `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md`, `test/q20-verdict-grouper-cluster-event-scope.test.ts`, `test/q21-fleet-verdict-consumer.test.ts`, `test/q21-fleet-verdict-consumer.test.js`, `test/q01-no-at-pin-deltas.test.ts`}. (Runtime test committed in q21 chore-B; chore-A SHA substituted at chore-B time per TQ-4 γ + R15 MINOR-1 + R19 MAJOR-3.)

---

## § 5 Anti-scope

- **NO modification of any `engine/*.ts` file** — R18+R20+R21 deliverables frozen at SLICE 2 close.
- **NO modification of `test/_substrate/v9X-cluster.ts`** — R18 substrate frozen.
- **NO modification of pre-R22 AC bindings** in any test file — only ADD new test rows in q21 and EDIT file-header comment lines in q20 (lines 4-6) and q01 (lines 7-8).
- **NO `HardwareTopologySource` concrete impl** — SLICE 3 scope.
- **NO deployment-event-feed ingestion** — SLICE 4.
- **NO new vendored-with-deltas transitions** — no eligible files.
- **NO CLAUDE-IMPLEMENTER.md consolidation** — operator-triggered, not R22 scope.
- **NO modification of VENDORING-MANIFEST.md** — no vendoring changes this round.
- **NO modification of existing q20 test bodies** (`:13`–end test logic frozen).
- **NO modification of existing q21 test bodies** (`:33-187` frozen).

---

## § 6 Open questions

None — all resolved by NEXT-ROLE.md directives and REVIEWER-REPORT-R21.md MINOR-2/3 suggestions.

---

## § 7 Pre-emit grilling (self-review before routing to Reviewer)

| Gate | Assessment |
|---|---|
| Every AC backed by verifiable source? | YES — AC-R22-1 references specific § sections; AC-R22-2/5 reference specific file:line; AC-R22-3/4 reference specific production file:line guards; AC-R22-6/7 cite binding commands; AC-R22-8 cites git diff command |
| Any unstated assumptions the Reviewer cannot verify? | AC-R22-3/4 assume that the VerdictGrouper groups-by-deploy_ref and two same-deploy_ref ingest calls produce the same group_id. Verifiable: engine/verdict-groups.ts:155-169 composite key construction. AC-R22-4 assumes `cluster_event_id: ''` is stored raw. Verifiable: engine/verdict-groups.ts:183. |
| Scope added beyond request? | NO — all 5 deliverables are enumerated in NEXT-ROLE.md |
| Reviewer can act with zero clarifying questions? | YES — AC-R22-3/4 cite exact production file:line for the guards; the allowed-set for AC-R22-8 is explicit; line:column ranges for header fixes are specific |
| Correction-propagation pass? | N/A for spec document (no prior-round claim being corrected); close-walk § 5 REINFORCED counts verified empirically via grep before writing |
| Formula vs implementation (for AC-R22-3/4)? | Verified: AC-R22-3 failure scenario uses `rollup.groups.length === 1` vs 2; AC-R22-4 uses `deepStrictEqual(groups, [])` — both deterministic under the failure modes described |
| Halt-condition pre-anticipation? | If `cluster_event_id: ''` triggers unexpected behavior in VerdictGrouper (e.g., throws rather than storing raw ''), HALT condition (b). Verifiable empirically by running AC-R22-4 at RED. No halt expected based on R20 § 2.6 analysis. |
