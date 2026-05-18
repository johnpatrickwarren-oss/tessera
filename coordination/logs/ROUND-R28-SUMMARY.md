# ROUND-R28-SUMMARY — WU-01 SLURM-ADAPTER (Wave 2 / R28 / cluster CL-02-A)

**Round-start SHA:** `ad024af`
**Chore-A SHA:** `6e5cc691bd6027056948e10179700bc99d16917a`
**Chore-B HEAD:** `161e7c1`
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Deliverable:** `engine/topology/slurm-source.ts` — Slurm `topology.conf` adapter (WU-01, Phase 2 SLICE 3.B)
**Findings:** 0 CRITICAL · 0 MAJOR · 2 MINOR · 4 OBS → STATUS: MERGE-READY

---

## What worked

**Architect pre-emit grilling caught real spec-drift before routing.** The 17-gate grilling caught two defects that would have broken binding-command attestation: (a) AC-R28-11 pseudocode used a non-existent `detector_verdicts` VerdictGroup field and an invalid `event_type: 'firmware_push'` union literal; (b) AC-R28-12 pseudocode used `import { join } from 'node:path'` + `__dirname` which would have introduced TS2304-class diagnostics beyond the asserted {TS2688, TS5107} baseline. Both caught before spec commit; neither escaped to Implementer.

**Implementer halt-discipline attestation was correct.** `npx tsc -p tsconfig.test.json` exit=2 was attested verbatim — not reframed as exit 0 or "warnings only." This is the correct application of the R26 MAJOR-1 reinforcement (false-compliance-attestation prohibition). The distinction between "no new R28 regressions" and "exit code is 0" was maintained precisely.

**TDD 5-commit audit trail clean and Reviewer-verified.** Spec commit (`8f7e797`) → RED (`7783a89`: tests + fixtures, no impl, MODULE_NOT_FOUND confirmed by `git show --stat`) → GREEN (`6e5cc69`) → chore-B RED (`0cef44d`: placeholder SHA → parse failure) → chore-B GREEN (`161e7c1`: SHA substituted). Reviewer independently verified git log ordering. Two-commit chore-B RED→GREEN cycle per R23 IMPL MINOR-1.

**Anti-scope clean across all three verification methods.** AC-R28-12 runtime self-check, Implementer-side diff attestation, and Reviewer-side round-start-to-HEAD supplementary diff (`git diff ad024af..161e7c1`) all agree: exactly the 8-path mandatory allowed-set + MEMORIAL.md. No vendored-at-pin file modified; no pre-R28 test file modified; no L0 contract import.

**Reviewer right-reasons audit strong.** 3 sampled tests (AC-R28-3 zero-padding, AC-R28-5 sparse auto-create, AC-R28-11 correlational_not_causal) all have strong counterfactuals; none self-confirming. AC-R28-5 uses an external `.conf` fixture; AC-R28-11 uses TypeScript literal-type as a compile-time double-bind.

**All 7 architectural decisions (D1-D7) resolved in spec with no Implementer judgment calls.** Implementation required only near-verbatim transcription of spec § 4.1 pseudocode; zero disambiguation needed.

---

## What violated discipline (role, discipline, what happened)

**IMPLEMENTER — MINOR-1 — spec-test-assertion-coverage:**
`test/q28-slurm-adapter.test.ts:158-166` (AC-R28-9, empty-input path) asserts `nodes`, `edges`, `fetched_at_ts` but NOT `source_id` or `source_version`. Spec § 5.2 line 764 AC-R28-9 explicitly lists all five fields. The implementation emits the fields unconditionally (no separate empty-input code path), so AC-R28-10 covers them on the populated path. But the empty-input AC is a distinct test with distinct coverage obligations.

**ARCHITECT — OBS-1 — branch-binding-coverage (acknowledged-gap exhaustiveness):**
`engine/topology/slurm-source.ts:164-166` implements a multi-bracket reject branch. Spec § 1.2 enumerates multi-bracket as out-of-scope and the pseudocode § 4.1 implements the rejection. But spec § 1.6 F-table (F1-F12) does not enumerate this branch, and spec § 5.3 acknowledged-gap section acknowledges only the cross-set-inconsistency branch. The multi-bracket branch is a second acknowledged-gap-class branch missing from both the F-table and § 5.3. Implementation is faithful; the gap is in the spec's coverage-acknowledgment documentation.

---

## Root cause analysis

**MINOR-1 root cause:** The Implementer implemented what the spec's pseudocode (§ 4.1) encodes — which is correct. The miss was at the AC-assertion level: when writing test assertions for AC-R28-9, the Implementer checked that the test exercises the empty-input behavior (nodes/edges empty) but did not cross-check the spec AC text field-by-field. The spec AC text (`source_id: META.sourceId, source_version: META.sourceVersion`) was present at spec § 5.2 line 764 but not referenced during test authoring. Root cause: insufficient field-by-field AC-text-to-assertion mapping during test writing.

**OBS-1 root cause:** The Architect's § 5.3 acknowledged-gap section was written with the cross-set-inconsistency branch in mind (the branch that the Architect noticed while walking the algorithm). The multi-bracket rejection branch is specified in § 1.2's out-of-scope list and implemented in the pseudocode — but the loop from "out-of-scope item in grammar section" to "unbound branch in coverage-acknowledgment section" was not closed. The § 1.6 F-table and § 5.3 were written from memory of "interesting branches" rather than from a systematic scan of every `if`/`throw`/`return` in the § 4.1 pseudocode.

---

## Reinforcements added (file path + line summary)

**CLAUDE-ARCHITECT.md** (+1 REINFORCED line, now at 27 total):
- Branch-binding coverage acknowledged-gap exhaustiveness: scan every `if`/`throw`/`return` guard in § 4.1 pseudocode and either map to § 1.6 F-table or enumerate in § 5.3 as acknowledged-not-bound. Detected R28 OBS-1 (multi-bracket branch absent from § 5.3).

**CLAUDE-IMPLEMENTER.md** (+1 REINFORCED line, now at 43 total):
- AC assertion field completeness: for each AC in spec § 5.2, count explicitly listed fields and assert all of them in the test block — even if sibling ACs cover those fields on a different code path. Detected R28 MINOR-1 (AC-R28-9 omits source_id/source_version from empty-input assertions).

**CROSS-PROJECT-MEMORIAL.md** — new section "Tessera R28 entries (2026-05-18) — wu-01-slurm-adapter cluster" added with per-discipline per-role entries, plus "Reinforcement rules derived (branch-binding-coverage, Architect — 3+ threshold crossed)" combining R25 MINOR-2 + R28 OBS-1 + R30 MINOR-2 into a composite rule covering three failure modes: mutation-reachability (R25), acknowledged-gap exhaustiveness (R28), data-flow unreachability (R30).

---

## Watch list for next round

1. **spec-test-assertion-coverage for AC-R28-9**: The source_id/source_version gap on the empty-input path remains open. If a future round touches `parseSlurmTopologyConf` (e.g., WU-05 close-walk), the closing-round Implementer should verify AC-R28-9 asserts all 5 spec-required fields.
2. **AC-R28-8 multi-bracket sub-case**: OBS-1 notes that multi-bracket inputs are not covered by AC-R28-8. If a future round extends the Slurm adapter (e.g., to support multi-bracket), the gap becomes load-bearing. Until then, the slurm-source.ts:164-166 throw is correct and the gap is purely documentary.
3. **OBS-3 dead code at slurm-source.ts:170**: `suffix.indexOf('[') !== -1` is structurally unreachable because the multi-bracket check at line 164-166 fires first. Future cleanup rounds should remove the unreachable half of the guard; currently benign.
4. **CLAUDE-IMPLEMENTER.md consolidation**: now at 43 REINFORCED lines — 4th consecutive round above the 30-line threshold. Operator should run `./scripts/consolidate-reinforcements.sh` before the next Implementer-role session.
5. **AC-R26-16 cross-round path-drift**: The pre-existing fail=2 (q01 ENOENT + AC-R26-16 path-drift) continues. WU-05 close-walk is the intended remediation target per spec § 9.2 cross-flag. Watch for WU-05 scope to include this.

---

## Emerging cross-project patterns

- **R28 completes the Wave 2 Slurm adapter (WU-01).** The three Wave 2 parallel cluster rounds (R28 WU-01 Slurm, R29 WU-02 K8S, R30 WU-03 NVLink) all share: 0-CRITICAL / MERGE-READY / clean-attestation-layer (exit-2 correctly attested, not reframed). The R26 MAJOR-1 false-compliance-attestation lesson has propagated correctly to all Wave 2 clusters.

- **Branch-binding-coverage 3+ threshold crossed (ARCHITECT cross-project).** R25 MINOR-2 (wu-00-l0-contract) + R28 OBS-1 (wu-01-slurm-adapter) + R30 MINOR-2 (wu-03-nvlink-adapter) = 3 Architect branch-binding-coverage violations across 3 different cluster rounds. A composite reinforcement rule was added to CROSS-PROJECT-MEMORIAL.md covering three failure modes: mutation-reachability, acknowledged-gap exhaustiveness, and data-flow unreachability.

- **spec-test-assertion-coverage is an emerging IMPLEMENTER violation class.** R28 MINOR-1 (source_id/source_version omitted from AC-R28-9) and R30 MINOR-1 (weak substring assertion in AC-R30-15) both represent tests that pass but under-bind the spec's stated assertions. The root cause in both cases is the Implementer asserting "load-bearing" fields without cross-checking the spec AC text field-by-field. A REINFORCED line was added to CLAUDE-IMPLEMENTER.md.

---

## Recommend reinforcement consolidation

- **CLAUDE-IMPLEMENTER.md is at 43 REINFORCED lines** (threshold 30; +1 this round). This is the **fourth consecutive round** above the threshold (R26=40, R28=43, R30=44 per cross-project entry). Operator should run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days and restore navigability. The script is operator-triggered, not auto-run.
