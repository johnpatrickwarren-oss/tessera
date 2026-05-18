# REVIEWER-REPORT-R21 — Phase 2 SLICE 2.B (fleet-merge consumption layer)

**Round:** R21 (full tier)
**Reviewer cold-state HEAD:** `d313e80` (chore-B: AC-R21-11 anti-scope test + chore-A SHA substituted + spec files)
**MERGE-READY chore-A SHA (per Implementer attestation):** `a5cae6d`
**Baseline SHA (per spec § 0 preamble):** `62e28d7`
**Pre-R21 baseline tests (per R20 Reviewer attestation):** 192 / 0
**Post-R21 OBSERVED tests (Reviewer cold re-run):** 201 / 0
**Binding-command results (Reviewer cold-verified):**
- `npx tsc --noEmit` → exit 0 ✓
- `node --test test/*.test.js` → tests 201 / pass 201 / fail 0 ✓

**Cold-review boundary held.** Did NOT read: `coordination/diagnostics/`, `coordination/logs/`, `.prompt-*.md`. DID read: `coordination/PRD.md`, `coordination/specs/Q-R21-SPEC.md`, `coordination/specs/Q-R21-SPEC-AUDIT.md`, `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md` (Architect + Implementer R21 sections), `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section greps), all source + test files in scope.

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line / test name / Reviewer cold-verify) |
|---|---|---|---|
| AC-R21-1 | `fleetTickIngest` returns FleetTickIngestResult with `ingest_results.length === N` AND each attributed_group non-null | PASS | `test/q21-fleet-verdict-consumer.test.ts:34-50`; cold `node --test` output line "✔ AC-R21-1: …" |
| AC-R21-2 | `cluster_event_id` propagated to every per-shard ingest; group_id starts with `group-evt-X-` | PASS | `test/q21-…test.ts:53-70`; impl propagates via `grouper.ingest(verdict, ts, { cluster_event_id, terminal })` at `engine/fleet/verdict-consumer.ts:56-59` |
| AC-R21-3 | Absent `cluster_event_id` → legacy mode (undefined; inherited group_id format) | PASS | `test/q21-…test.ts:73-82`; verifies `attributed_group.cluster_event_id === undefined` AND `group_id === 'group-deploy-A-1700000000'` |
| AC-R21-4 | Empty `per_shard_verdicts` → empty `ingest_results`, no throw | PASS | `test/q21-…test.ts:85-94`; impl loop at `verdict-consumer.ts:55-61` is empty-array-safe; returns `{ ingest_results: [] }` |
| AC-R21-5 | `input.terminal=true` closes every per-shard attributed_group on the same tick | PASS | `test/q21-…test.ts:97-115`; verifies `attributed_group.closed === true` AND `r.closed !== null` for each shard |
| AC-R21-6 | `ingest_results[i]` corresponds to `per_shard_verdicts[i]` (index-order preservation) | PASS | `test/q21-…test.ts:118-130`; impl iterates `for (const verdict of input.per_shard_verdicts) { … results.push(r); }` at `verdict-consumer.ts:55-61` |
| AC-R21-7 | `rollupByClusterEvent` returns N distinct VerdictGroups for N distinct deploys under one cluster_event_id | PASS-WITH-MINOR | `test/q21-…test.ts:133-152`; verifies `rollup.groups.length === 3`, `rollup.deploy_ids.length === 3`, sorted equality, `Set(group_ids).size === 3`. **Dedup branch not exercised — see MINOR-2** |
| AC-R21-8 | `rollupByClusterEvent('')` short-circuits to no-match | PASS-WITH-MINOR | `test/q21-…test.ts:155-166`; verifies empty arrays. **Short-circuit not disambiguated from strict-equality branch — see MINOR-3** |
| AC-R21-9 | `npx tsc --noEmit` → exit 0 (binding-command attestation) | PASS | Reviewer cold re-ran `npx tsc --noEmit` → exit 0 (no output) |
| AC-R21-10 | `node --test test/*.test.js` → OBSERVED total === baseline + q21 GREEN count; fail === 0 | PASS | Reviewer cold re-ran `node --test test/*.test.js` → `tests 201 / pass 201 / fail 0`. Matches post-chore-B prediction (192 baseline + 9 q21) per spec § 4.6 |
| AC-R21-11 | `git diff 62e28d7..a5cae6d --name-only` ⊆ 8-entry allowed-set | PASS-WITH-MINOR | `test/q21-…test.ts:169-187`; Reviewer cold re-ran the diff: 4 paths returned (`coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `engine/fleet/verdict-consumer.ts`, `test/q21-fleet-verdict-consumer.test.ts`); all 4 ∈ allowed-set. **But spec files NOT in this diff range — see MINOR-1** |

All 11 ACs PASS (3 carry MINOR caveats).

---

## 2. Findings

### CRITICAL — none.

### MAJOR — none.

### MINOR

**MINOR-1 — Architect ceremony files (Q-R21-SPEC.md, Q-R21-SPEC-AUDIT.md) were not committed before Implementer chore-A; they entered git only at chore-B.**

- Evidence: `git diff 62e28d7..a5cae6d --name-only` → 4 paths (no spec files); `git diff 62e28d7..d313e80 --name-only` → 6 paths (spec files added at d313e80).
- `git show d313e80` commit message: "Also commits Q-R21-SPEC.md + Q-R21-SPEC-AUDIT.md (Architect outputs; previously untracked; in 8-entry allowed-set per spec § 3)."
- Deviation from R20 precedent: `git diff cecd677..23a497e --name-only` (R20 chore-A) DID include `coordination/specs/Q-R20-SPEC.md` and `Q-R20-SPEC-AUDIT.md`.
- Effect: at MERGE-READY SHA `a5cae6d` (the SHA the Implementer attested in chore-A NEXT-ROLE.md and that AC-R21-11 pins to), the Architect spec files do NOT exist in git history. A Reviewer doing a strict `git checkout a5cae6d && read spec` would not find them.
- Mitigation already in place: the spec § 3 8-entry allowed-set includes the spec paths, and the Reviewer (this report) can read them at HEAD `d313e80`. Cold-review boundary held using the working-tree state.
- Severity rationale: procedural drift from R20 convention; does NOT affect any AC verdict; does NOT introduce a correctness issue. The Architect MEMORIAL CONFIRMATION `role-boundary` (line 1944) said "ARCHITECT wrote ONLY: … Q-R21-SPEC.md, Q-R21-SPEC-AUDIT.md, NEXT-ROLE.md, MEMORIAL.md"; "wrote" was truthful (files created) but the implicit commit-discipline expectation was not met.

**MINOR-2 — AC-R21-7 does not exercise the dedup-by-group_id branch in `rollupByClusterEvent`.**

- Evidence: `test/q21-…test.ts:133-152`. Scenario: 3 distinct `deploy_ref` values under one `cluster_event_id`. R20 keying produces 3 distinct group_ids (one per deploy). Each `IngestResult.attributed_group` references a unique group → `seen_group_ids.has(g.group_id)` is always false → dedup branch never short-circuits.
- The dedup code path at `engine/fleet/verdict-consumer.ts:87-94` (the `if (!seen_group_ids.has(...))` and `if (!seen_deploy_ids.has(...))` guards) is structurally untested. Removing those guards (i.e., always pushing) would not change AC-R21-7's outcome because every group_id is already unique.
- Spec § 1 failure-mode 6 enumerates the dedup requirement ("Multiple IngestResults can point to the same VerdictGroup (e.g., 3 per-shard verdicts all attributed to one open group). The rollup MUST dedupe by `group_id` to avoid double-counting.") — this scenario is described but never bound.
- Right-reasons consequence: the test PASSes for the right reasons in the sense that the AC's literal predicate holds; but the test is not a regression gate against an accidental dedup removal.
- Suggested R22 watch: add an AC scenario where ≥2 verdicts attribute to the same open group (e.g., 2 verdicts for same `deploy_ref` under same `cluster_event_id` and same tick window) and assert `rollup.groups.length === 1`.

**MINOR-3 — AC-R21-8 does not disambiguate the empty-string short-circuit branch from the strict-equality filter branch.**

- Evidence: `test/q21-…test.ts:155-166`. Scenario: legacy mode (no `cluster_event_id`) → each `attributed_group.cluster_event_id === undefined`; query is `''`.
- The implementation has two distinct mechanisms that could produce the no-match outcome:
  1. The short-circuit at `verdict-consumer.ts:77-79`: `if (cluster_event_id === '') return { groups: [], deploy_ids: [] };`
  2. The strict-equality filter at `verdict-consumer.ts:86`: `if (g.cluster_event_id !== cluster_event_id) continue;` — under legacy mode, `undefined !== ''` is true → skipped.
- Removing the short-circuit (lines 77-79) would NOT break this test because path (2) also returns empty. The short-circuit is therefore structurally unbound by AC-R21-8.
- Spec § 2.4 prescribes the short-circuit deliberately ("the rollup interface deliberately rejects empty-string queries"; "consistency outweighs convenience") — this is a load-bearing semantic choice, but it has no regression gate.
- Partial mitigation: under R20 § 2.6 falsy-collapse, no group can have explicit `cluster_event_id === ''` (it gets stored as `''` raw but is keyed as legacy; cf. `engine/verdict-groups.ts:157-159`, `:183`). However, the `cluster_event_id: cluster_event_id` storage at `:183` does store the raw `''`. A test exercising `input.cluster_event_id = ''` would create groups with `attributed_group.cluster_event_id === ''`, and `rollupByClusterEvent('')` — with vs without the short-circuit — would diverge: WITH short-circuit, returns `[]`; WITHOUT, would match and return the group. This branch is not tested.
- Suggested R22 watch: add a test where `input.cluster_event_id = ''` is passed (a "don't-do-this" but legal input), and verify the rollup returns `[]` via the short-circuit (not via strict-equality coincidence).

**MINOR-4 — Implementer attestation line citations have minor drift from actual `test()` declarations.**

- Evidence (`coordination/NEXT-ROLE.md:27-34` Implementer attestation block):
  - AC-R21-1 attested `test/q21:35` — actual `test('AC-R21-1: …')` at line 34
  - AC-R21-3 attested `test/q21:74` — actual at line 73
  - AC-R21-4 attested `test/q21:89` — actual at line 85
  - AC-R21-5 attested `test/q21:100` — actual at line 97
  - AC-R21-8 attested `test/q21:152` — actual at line 155
  - (AC-R21-2 @ 53, AC-R21-6 @ 118, AC-R21-7 @ 133 are exact)
- Citations point near (not at) the test declarations. Each is within ±5 lines.
- Per R03 MINOR-4 / R18 MINOR-2 reinforcement spirit, OBSERVED-binding citation should pin to the test declaration, not body. Discrepancy is small but the discipline is "cite exactly where the binding is."

### OBS

**OBS-1 — AC-R21-11 inherits the `execSync`-throws-on-missing-SHAs pattern from R20's AC-R20-12.**

- `test/q21-…test.ts:170-173` uses `execSync('git diff 62e28d7..a5cae6d --name-only', …)`. If either SHA is missing (e.g., shallow clone, archive checkout), `git diff` exits non-zero and `execSync` throws, crashing the test rather than failing it with a clear assertion message.
- This is a known established pattern in the project (R20 used it; R19 OBS noted similar). Not new to R21; flagged for context.

**OBS-2 — Empty-string `input.cluster_event_id` consumer-layer behavior is not directly AC-bound.**

- Spec § 8 corner-cases acknowledges the gap: "Empty-string `input.cluster_event_id` propagated to VerdictGrouper.ingest is interpreted by R20 § 2.6 as semantically equivalent to undefined (legacy mode); AC-R21-3 covers the undefined case; the empty-string-on-input edge is left to R20's existing AC-R20-6 sub-case (b) coverage."
- But R20 AC-R20-6 binds the VerdictGrouper layer, not the `fleetTickIngest` consumer-layer. If a caller does `fleetTickIngest({ ..., cluster_event_id: '' }, grouper)`, the resulting `attributed_group.cluster_event_id` will be `''` (raw stored value per `engine/verdict-groups.ts:183`), not `undefined`. AC-R21-3 does not catch this — it tests the absent case only.
- Not load-bearing for R21 deliverables (no caller is known to pass `''`), but the gap is real.

**OBS-3 — File-header documentation of e-BH orthogonality (Q4 disposition) is present and accurate but not AC-bound.**

- `engine/fleet/verdict-consumer.ts:14-16` documents Q4 disposition. Per spec § 3.2 audit sidecar, the Architect explicitly classified this as "expected-but-unbinding" — Reviewer verifies content matches spec § 2.8 ✓. No further action required.

**OBS-4 — `engine/fleet/verdict-consumer.ts` correctly re-imports `VerdictGrouper` as a type-only import.**

- `engine/fleet/verdict-consumer.ts:23`: `import type { IngestResult, VerdictGrouper } from '../verdict-groups';`
- Per `fleetTickIngest(input, grouper: VerdictGrouper)`, the `VerdictGrouper` reference is structural (parameter type annotation), not a runtime instantiation. The `import type` keyword erases the import at compile time. ✓
- This is correct per spec § 4.1 pseudocode but worth flagging — a future maintainer migrating to `import { VerdictGrouper } from '../verdict-groups'` (without `type`) would introduce a runtime cycle (verdict-consumer would force verdict-groups load on import, which is fine here but a discipline note for future-proofing).

---

## 3. Right-reasons audit

3 tests audited for spec traceability AND self-confirming-pattern detection.

**Test 1 — AC-R21-2 (`test/q21-…test.ts:53-70`): "cluster_event_id propagated to every per-shard ingest call"**

- Spec requirement: spec § 2.1 mechanism prescribes `grouper.ingest(verdict, ts, { cluster_event_id, terminal })` propagation; AC-R21-2 binds via the observable property `attributed_group.cluster_event_id === 'evt-X'`.
- Self-confirming check: if the Implementer mutated `fleetTickIngest` to drop `cluster_event_id` (e.g., passed `{ cluster_event_id: undefined, terminal }` instead of the input value), each `attributed_group.cluster_event_id` would be `undefined`, and the test would FAIL at the first assertion. The test's expected value (`'evt-X'`) is the input string literal — it does not come from production code.
- **NOT self-confirming.** Strong regression test.

**Test 2 — AC-R21-6 (`test/q21-…test.ts:118-130`): "ingest_results[i] corresponds to per_shard_verdicts[i] (index-order preservation)"**

- Spec requirement: spec § 2.1 prescribes "iterates `input.per_shard_verdicts` in array order, calling `grouper.ingest`… for each. Collects results into a new array."
- Self-confirming check: if `fleetTickIngest` reordered results (e.g., reversed, sorted by deploy_id), the assertion `out.ingest_results[i].attributed_group.deploy_id === per_shard_verdicts[i].deploy_ref` would fail at the first index. The expected `deploys` array is a test-local literal.
- **NOT self-confirming.** Strong regression test.

**Test 3 — AC-R21-11 (`test/q21-…test.ts:169-187`): "git diff baseline..chore-A only contains allowed-set paths"**

- Spec requirement: spec § 5 binds AC-R21-11 to "every line of output is a member of the 8-entry allowed-set."
- Self-confirming check: the SHAs `62e28d7` and `a5cae6d` are pinned (historical), as is the allowed-set literal. The test cannot be "rewritten to match production" because both inputs are external (git history) and frozen. The test would fail if a future R21 chore-A had added an off-allowed-set path.
- **NOT self-confirming.** Strong forward-protection (with the known historical-lock caveat per R19 MAJOR-3 reinforcement: after R21 merges, this test continues to assert about historical SHAs and cannot catch future modifications to the R21 deliverables; that's per design, not a defect).
- Caveat noted: the diff has only 4 paths (not the 6 expected post-chore-B), because the spec files weren't yet committed at `a5cae6d`. This is captured in MINOR-1.

**13th consecutive Tessera Reviewer right-reasons audit (R08–R21).** No self-confirming test found.

---

## 4. Cross-cutting checks

**TDD discipline.** ✓
- RED commit `4274d9f`: `git show 4274d9f:engine/fleet/verdict-consumer.ts` → "fatal: path 'engine/fleet/verdict-consumer.ts' exists on disk, but not in '4274d9f'" — confirmed production module did NOT exist at RED.
- RED test body: `git show 4274d9f:test/q21-fleet-verdict-consumer.test.ts` shows 8 `assert.fail('RED: AC-R21-N pending')` placeholders + imports + helper. No real assertions.
- GREEN commit `78fa38b`: introduces `engine/fleet/verdict-consumer.ts` AND replaces RED placeholders with real bodies. 8 ACs pass.
- Order: RED (4274d9f) precedes GREEN (78fa38b) in git log. ✓

**Halt-discipline (no-skip).** ✓
- No `DIAGNOSTIC-R21-*.md` files (spec § 9.10 enumerated 5 halt scenarios, all preventable). Implementer MEMORIAL CONFIRMATION at line 1956: "No halt conditions encountered. Zero spec/reality conflicts. No architectural decisions required beyond what spec § 0/2 prescribed."
- Reviewer cross-check: no obvious spec-reality conflict surfaced during the work. All ACs PASS with literal-prescribed expected values. No silent in-line resolution risk surfaced.

**Anti-scope.** ✓ with MINOR-1 caveat
- `git diff 62e28d7..HEAD --name-only` → 6 paths: `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/specs/Q-R21-SPEC-AUDIT.md`, `coordination/specs/Q-R21-SPEC.md`, `engine/fleet/verdict-consumer.ts`, `test/q21-fleet-verdict-consumer.test.ts`.
- All 6 ∈ 8-entry allowed-set per spec § 3.
- `git diff 62e28d7..HEAD --name-only -- src/ test/ engine/ tools/` → 2 paths (`engine/fleet/verdict-consumer.ts`, `test/q21-fleet-verdict-consumer.test.ts`). Per CROSS-PROJECT-MEMORIAL REINFORCED 2026-05-17 "coordination-chore-sequence verification" cross-check: round-start-to-HEAD scoped diff is the correct completeness gate. Result clean. ✓
- Production code anti-scope items honored: `engine/verdict-groups.ts` UNCHANGED at R21 (no diff); `engine/types/verdict.ts` UNCHANGED; `engine/fleet/{combine,detectors,e-bh}.ts` UNCHANGED; `test/q20-…test.ts` UNCHANGED; `test/_substrate/v9X-cluster.ts` UNCHANGED; `test/q01-no-at-pin-deltas.test.ts` UNCHANGED; `coordination/VENDORING-MANIFEST.md` UNCHANGED.

**Inherited-testimony / direct verification.** ✓
- Reviewer independently verified pre-R21 baseline by re-running `node --test test/*.test.js` cold: 201 / 0 (post-R21 total). The 192-baseline claim is from R20 Reviewer's attestation; Reviewer did not re-checkout HEAD `7eb3a63` to re-verify the baseline (consistent with R20 attestation chain; no R20 Reviewer report contradiction).
- Reviewer independently verified all 4 paths in AC-R21-11's diff range AND all 6 paths in the full R21 diff.
- Reviewer independently re-ran the typecheck and full suite.

**Architect ceremony (cold-spot check).** ✓ with MINOR-1 caveat
- Architect MEMORIAL CONFIRMATIONs at lines 1920-1944 enumerate Superpowers discipline (brainstorm, design-phase-sketch, pre-emit-grilling 13-gate sweep, cross-section consistency 17-token, empirical-premise-verification, anti-scope-baseline-and-end-bound, halt-condition-pre-anticipation, narrative-vs-prescription cross-check, skill-14 PRD-conjunction, skill-15 prescription-to-AC coverage, split-decision-not-triggered, role-boundary).
- Spec body cross-check: § 0 has 3 distinct approaches with strengths/weaknesses/hidden-assumptions/risks per Superpowers; § 1 has 18-row component inventory + 6 integration points + 7 failure modes; § 5 has 11 ACs in Given/When/Then; § 9 has 13 grilling gates (modulo 9.12 N/A). All advertised content present.

---

## 5. Grilling output (on this report, before routing)

| Gate | Result |
|---|---|
| Every finding has a `file:line` reference? | YES — MINOR-1/2/3/4 + OBS-1/2/3/4 all cite specific paths and lines |
| Any AC marked PASS without actual verification? | NO — every PASS row in § 1 cites either the runtime test (cold-verified by `node --test`) or a binding-command re-run by the Reviewer |
| Right-reasons audit completed for 3+ tests? | YES — 3 tests audited (AC-R21-2, AC-R21-6, AC-R21-11); all NOT self-confirming |
| Adversarial mandate honored (≥1 substantive finding despite 0 CRITICAL / 0 MAJOR)? | YES — MINOR-1 (Architect-commit drift) is a substantive procedural finding not in the Implementer's attestation; MINOR-2 + MINOR-3 surface test-coverage gaps the Implementer did not flag |
| Cold-review boundary held? | YES — did not read `coordination/diagnostics/`, `coordination/logs/`, or `.prompt-*.md` |
| CROSS-PROJECT-MEMORIAL Reviewer-section issue-class scan applied? | YES — checked "coordination-chore-sequence" reinforcement (REINFORCED 2026-05-17 line 16): round-start-to-HEAD scoped diff verified clean (§ 4 anti-scope); checked self-confirming patterns (§ 3 right-reasons audit) — none found |

All gates PASS.

---

## 6. Routing

**0 CRITICAL — STATUS: MERGE-READY.**

Findings summary: 0 CRITICAL / 0 MAJOR / 4 MINOR / 4 OBS.

`coordination/NEXT-ROLE.md` to be updated by Reviewer-side routing pass after this report is finalized:
- `NEXT-ROLE: MEMORIAL-UPDATER`
- `STATUS: READY`
- Inputs: this report + Implementer-side attestation block.

Reviewer ceremony append to `coordination/MEMORIAL.md` follows in the same chore commit.
