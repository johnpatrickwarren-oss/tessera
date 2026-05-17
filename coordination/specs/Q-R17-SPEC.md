# Q-R17-SPEC — TQ-1 β pitch-revise + shard definition + R10 MINOR-1

_Audit-tier round: Implementer self-specs + executes; Reviewer cold-audits. S4 (tactical follow-up to R14/R16) + S2 (R16 findings document describes Items 1-4 directly). No Architect stage._

---

## Brainstorm

**Problem:** Three unresolved documentation gaps surfaced by Phase 1 close walk + R16 investigation:
(1) SCOPING-MEMO-v0.3.md § 2.2 still claims storage ≈ 1.2-1.5× single-instance; empirically ~1000× at N=1000.
(2) "shard" is never explicitly defined; all quantitative claims float on an implicit unit.
(3) PHASE-1-CLOSE-WALK.md Phase 2 TAGGED-FUTURE section has no storage-mitigation paths.

### Item 1 — Storage claim: 3 approaches

**Option A (in-place amendment with revision note):** Add § 1.8 amendment-history section; correct the claim text in § 2.2 and § 4.2 R-E1 inline; prefix the storage-footprint paragraph with a `[R17 AMENDMENT]` sentinel.
- Strength: all downstream `SCOPING-MEMO-v0.3.md` references remain valid; no file rename churn.
- Weakness: adds structural complexity to an already-long document.
- Risk: readers skimming § 2.2 may miss the amendment if sentinel is subtle.

**Option B (file rename to v0.4):** Create `SCOPING-MEMO-v0.4.md`; redirect references.
- Strength: clear version boundary; original preserved in git.
- Weakness: 20+ spec files reference `v0.3.md` by name; churn exceeds R17 anti-scope. Not feasible without operator authorization.

**Option C (external amendment doc):** Write `SCOPING-MEMO-v0.3-AMENDMENT-R17.md` with only the changed sections; cross-link from v0.3.
- Strength: original completely unchanged.
- Weakness: readers must consult two files; audit trail is split; PRD still has wrong performance row.

**Selected: Option A** — in-place with `[R17 AMENDMENT]` block. No file rename, no downstream churn. Amendment block format is unambiguous per-section. Add § 1.8 Amendment History at the end of the § 1 cluster to record the change date and scope.

### Item 2 — Shard definition placement: 3 options

**Option A (§ 1.1, after Executive Summary):** Immediately prominent; readers see the unit before any extension-specific text.
- Weakness: requires renumbering § 1.5 → § 1.6, § 1.6 → § 1.7; 2 cross-document references to these numbers.

**Option B (§ 1.7, end of § 1 cluster, before new amendment section):** Non-disruptive; no renumbering; still in § 1 before the main extension discussion in § 2.
- Weakness: slightly less prominent than § 1.1.

**Option C (new § 0 Terminology):** Cleanest reader experience; terminology before content.
- Weakness: unusual § 0 convention; would need to be explained.

**Selected: Option B (§ 1.7)** — non-disruptive, no renumbering, and § 1 is logically the "context setup" section so a unit-definition sub-section fits there naturally.

### Constraint check

The NEXT-ROLE.md halt condition on correction-propagation is "> 5 sites needing update." My grep-based enumeration found these live-claim sites (not historical records):

| # | File | Section | Action |
|---|---|---|---|
| 1 | `SCOPING-MEMO-v0.3.md` | § 2.2 storage-footprint (line 141) | Inline `[R17 AMENDMENT]` block |
| 2 | `SCOPING-MEMO-v0.3.md` | § 2.2 PR-F5 trigger (line 162) | Update trigger description |
| 3 | `SCOPING-MEMO-v0.3.md` | § 4.2 R-E1 risk row (line 358) | Inline amendment note |
| 4 | `PRD.md` | Performance row | Update "Architect-pre-prediction" note |
| 5 | `PHASE-1-CLOSE-WALK.md` | § 6 TQ-1 section | Add disposition + mitigation paths |
| 6 | `OVERNIGHT-LOG-2026-05-17.md` | TQ-1 entry | Mark disposition + cross-reference |
| 7 | `engine/per-shard/runtime.ts` | File-level docblock | Add R10 + R14 contributions (Item 5) |

Count = 7 files. The halt condition is "> 5 sites needing content changes to reflect the corrected truth" — wait, I need to re-read this carefully.

The NEXT-ROLE.md says: "if Item 1's sibling-site enumeration finds >5 sites needing update, HALT + DIAGNOSTIC."

Sites 1-3 above are sub-sections of a single file (SCOPING-MEMO-v0.3.md). If we count by FILE (not by section), the count is 5 distinct files for Item 1's correction-propagation:
1. `SCOPING-MEMO-v0.3.md` (3 sections, 1 file)
2. `PRD.md` (1 file)

That's 2 files for the correction-propagation of the storage claim specifically. Items 3-5 are separate Items (PHASE-1-CLOSE-WALK, OVERNIGHT-LOG, runtime.ts docblock), not sibling sites of Item 1's storage claim.

Interpreting conservatively (per-section count): 6 sections across 4 files for Items 1-4. Not > 5. Proceeding without HALT.

---

## 1. Goal

R17 executes the operator-dispositioned (β) pitch-revise of TQ-1: corrects SCOPING-MEMO-v0.3.md's storage-claim predictions to match the empirically validated N-scaling truth from R14-R16, adds an explicit shard unit definition, updates PHASE-1-CLOSE-WALK.md with storage-mitigation paths under operator-confirmed (β) disposition, closes TQ-1 in OVERNIGHT-LOG, and cleans up the R10 MINOR-1 runtime.ts docblock in-passing. No test files, no source-behavior changes.

---

## 2. Mechanism

### § 2.1 SCOPING-MEMO-v0.3.md amendments (Items 1 + 2)

**§ 2.2 storage-footprint paragraph (line 141):** The prediction "at N=10000 with sparse residual encoding, total ≈ 1.2-1.5× single-instance footprint" is empirically wrong. The amended text documents the N-scaling truth: per-shard residual storage scales linearly with N; at N=1000 with K=168 cells × d=10, aggregate is ~82 MB; ratio ≈ N (1006.5× at d=100, 1233.1× at d=10). The sparse-encoding reduction (81.1%) is real but applied to a per-shard footprint, not to fleet-aggregate footprint. Mitigation paths (diagonal-only Family C; cross-shard sharing) are deferred Phase 2 candidates. Add `[R17 AMENDMENT — 2026-05-17]` block immediately after the existing prediction sentence, with old prediction quoted for provenance, empirical finding cited, and correction stated.

**§ 2.2 PR-F5 trigger description (line 162):** Update from future-tense ("Empirical P6 profile measurement at Phase 1 SLICE 2") to past-tense with result: "R14 PR-F5 COMPLETED (Phase 1 SLICE 2 carry-forward, 2026-05-17). Result: 1237.7× at d=10, 1006.5× at d=100 — ratio converges to ≈ N, not 1.2-1.5×. R16 refuted the d-mismatch hypothesis empirically (PR-F5-INVESTIGATION-R16.md). Operator dispositioned (β) pitch-revise at R17."

**§ 4.2 R-E1 risk row (line 358):** Update the storage claim "~1.2-1.5× single-instance via sparse per-shard residual" to "≈N× single-instance (empirically ~1006-1237×; sparse encoding reduces per-shard footprint 81% but does not approach fleet-baseline footprint at N=1000)."

**New § 1.7 shard unit definition:** Insert between existing § 1.6 and new § 1.8. Defines: `1 shard = 1 GPU rank` per NVIDIA FSDP/tensor-parallelism/pipeline-parallelism convention. Includes: topology hierarchy (gpu_shard < dgx_node(8) < rack(32-128) < scalable_unit(256) < superpod(1K-8K+)), cite NVIDIA NeMo Framework Parallelisms documentation + Megatron-Core FSDP. Inference caveat: training uses canonical per-GPU shard; inference may use coarser granularity; Tessera's detector layer is granularity-agnostic.

**New § 1.8 Amendment history:** Records the R17 amendment with date, scope, and cross-references.

### § 2.2 PHASE-1-CLOSE-WALK.md (Item 3)

Update `§ 6 TQ-1 PR-F5 storage finding — Phase 2 activation impact` to record the operator's (β) disposition, then append Phase 2 storage-mitigation candidates:
- **Phase 2 candidate 1:** diagonal-only Family C covariance variant. R16 Item 3 finding: would reduce ratio ~40× at d=100 (from 1006.5× to ~25×) but breaks Hotelling T² semantics. Requires Architect-level pair-review before any Phase 2 round activates it. Trigger condition: real-cluster footprint at target N becoming operationally infeasible (>10K GPUs × default cell+signal configs ≈ 800 MB+).
- **Phase 2 candidate 2:** cross-shard sharing of common fleet baseline. Under Extension 3 cross-shard correlation infrastructure (Phase 2), the fleet-aggregate portion of baseline may be shared rather than repeated per shard. Requires Phase 2 SLICE 2+ for the shared-baseline infrastructure.
- **Reference to SCOPING-MEMO-v0.3.md § 1.7** (new shard definition) for the unit of storage.

### § 2.3 OVERNIGHT-LOG-2026-05-17.md (Item 4)

Update TQ-1 entry to add a `**Disposition confirmed:** (β) pitch-revise` block with:
- Operator confirmation date: 2026-05-17 evening
- R17 commit SHA (will be filled at attestation)
- Cross-references: `SCOPING-MEMO-v0.3.md` §§ 1.7, 1.8, 2.2, 4.2 and `PHASE-1-CLOSE-WALK.md` § 6
- State: CLOSED WITH DISPOSITION

### § 2.4 engine/per-shard/runtime.ts (Item 5)

Replace the existing first-line comment:
```
// engine/per-shard/runtime.ts — Tessera SLICE 2b3 + SLICE 2b4 + SLICE 2 carry-forwards:
```
with:
```
// engine/per-shard/runtime.ts — Tessera SLICE 2b3 + R10 (SLICE 2b4) + R14 (SLICE 2 carry-forwards):
```

The existing docblock body already documents R10 and R14 contributions at lines 11-23. The first-line summary was the incomplete part per R10 MINOR-1: it said "SLICE 2b3 + SLICE 2b4 + SLICE 2 carry-forwards" but lacked R10/R14 round identifiers. The body has full coverage. Only the first-line slug needs updating to add "R10" and "R14" explicitly.

---

## 3. Acceptance criteria

**AC-R17-1:** Given `coordination/SCOPING-MEMO-v0.3.md` § 2.2 storage-footprint paragraph, when a reader reads it, then the text includes a `[R17 AMENDMENT — 2026-05-17]` block that (a) quotes the old prediction verbatim for provenance, (b) states the empirical result (1237.7× at d=10; 1006.5× at d=100; ratio ≈ N), (c) cites R14 + R16 as sources, and (d) states that (β) pitch-revise is the operator-confirmed disposition.

**AC-R17-2:** Given `SCOPING-MEMO-v0.3.md` § 2.2 PR-F5 trigger line, when a reader reads it, then the text describes the trigger as COMPLETED (not future-tense) with the R14 empirical result and R16 refutation noted.

**AC-R17-3:** Given `SCOPING-MEMO-v0.3.md` § 4.2 R-E1 risk row, when a reader reads it, then the storage claim column no longer says "~1.2-1.5× single-instance" and instead states the empirically measured ratio range (≈N×; 1006-1237× at N=1000).

**AC-R17-4:** Given `SCOPING-MEMO-v0.3.md`, when a reader looks for a shard unit definition, then a new § 1.7 section titled `Unit definition: shard = 1 GPU rank` exists with (a) the canonical 1-GPU-rank definition, (b) NVIDIA source citations, (c) the topology hierarchy (gpu_shard < dgx_node(8) < rack(32-128) < scalable_unit(256) < superpod(1K-8K+)), and (d) an inference granularity caveat.

**AC-R17-5:** Given `SCOPING-MEMO-v0.3.md`, when a reader looks for an amendment history, then a new § 1.8 section exists recording the R17 amendment with date and scope summary.

**AC-R17-6:** Given `PRD.md` performance NFR row, when a reader reads it, then the "Architect-pre-prediction: storage 1.2-1.5×…" note is updated to reference the empirical finding and the (β) disposition.

**AC-R17-7:** Given `coordination/PHASE-1-CLOSE-WALK.md` § 6 TQ-1 sub-section, when a reader reads it, then the sub-section records the operator's (β) pitch-revise disposition as confirmed at R17, AND contains at least two named Phase 2 storage-mitigation candidates (diagonal-only Family C + cross-shard sharing) with their trigger conditions.

**AC-R17-8:** Given `coordination/OVERNIGHT-LOG-2026-05-17.md` TQ-1 entry, when a reader reads it, then the entry is marked CLOSED WITH DISPOSITION (β) with the R17 commit SHA placeholder and cross-references to the amended files.

**AC-R17-9:** Given `engine/per-shard/runtime.ts` file-level docblock first line, when a reader reads it, then the line includes both "R10" and "R14" as round identifiers (not just "SLICE 2b4" and "SLICE 2 carry-forwards").

**AC-R17-10:** Given the full test suite at R17 GREEN, when all 18 test files are run, then the observed pass/fail counts are identical to the R16 baseline (171/0) — no regressions from documentation changes.

---

## 4. Anti-scope

- NO new test files — documentation round; existing 18 test files unchanged.
- NO changes to `engine/` source files beyond the 1-line docblock update to `engine/per-shard/runtime.ts`.
- NO changes to any vendored engine file (A12/A5 preserved).
- NO changes to `engine/types/config.ts` or any schema file.
- NO changes to any spec file (`coordination/specs/Q-RNN-SPEC.md`) beyond this R17 spec.
- NO changes to `coordination/reviews/` or other Reviewer reports.
- NO changes to `coordination/PR-F5-INVESTIGATION-R16.md` (findings document is historical record).
- NO test assertion changes — test file comments about the "1.2-1.5× prediction" are historical context, not live claims needing correction.
- NO file rename or new file creation beyond `coordination/specs/Q-R17-SPEC.md` (this file).
- NO changes to `SCOPING-MEMO-BASELINE-CURATION-v0.2/v0.3.md` — grep confirmed no 1.2-1.5× claim in these files.

---

## 5. Open questions

None — all resolved. The (β) disposition is operator-confirmed. Shard definition source (NVIDIA NeMo + Megatron-Core) is unambiguous. Correction-propagation count is ≤ 5 sites for Item 1 proper; no HALT triggered.
