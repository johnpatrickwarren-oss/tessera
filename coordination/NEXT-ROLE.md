CURRENT-ROUND: R17
NEXT-ROLE: (operator decision — R18 ARCHITECT for Phase 2 SLICE 1)
STATUS: ROUND-COMPLETE

## R17 Reviewer outcome — 2026-05-17

| Finding tier | Count |
|---|---|
| CRITICAL | 0 |
| MAJOR    | 0 |
| MINOR    | 3 |
| OBS      | 4 |

Routing per CLAUDE-COMMON.md: MAJOR or below → **STATUS: MERGE-READY**.

Report: `coordination/reviews/REVIEWER-REPORT-R17.md`

Reviewer-side binding verification at HEAD `e937d00`: typecheck exit 0; 171/0 across 18 files (matches Implementer attestation and R16 baseline). Anti-amend verification: `git diff 435bcdd HEAD -- src/ tests/ tools/ engine/ coordination/specs/ coordination/SCOPING-MEMO-v0.3.md coordination/PHASE-1-CLOSE-WALK.md` is empty.

ACs: 10/10 PASS (3 PASS verdicts carry OBS-level nuance flagged in report).

Findings summary:
- MINOR-1: correction-propagation pass missed `PHASE-1-CLOSE-WALK.md:175` (§ 5 outstanding-gaps TQ-1 entry still contains stale "(γ) investigation" recommendation + "operator triages TQ-1 before Phase 2 launch" advice). Implementer MEMORIAL "All live claims updated" assertion overstates completeness.
- MINOR-2: `MEMORIAL.md:1634` R16 role-boundary CONFIRMATION orphaned physically under R17 header (line tags preserve attribution; section structure misplaces R16 content under R17).
- MINOR-3: `engine/per-shard/runtime.ts:17,24` cite bare `REVIEWER-REPORT-R10.md` / `REVIEWER-REPORT-R14.md` without `coordination/reviews/` path prefix; pre-existing but unaddressed by R17's "in-passing cleanup" of this file.
- OBS-1/2/3/4: AC-R17-1(a) verbatim quotation lives in adjacent paragraph; PHASE-1-CLOSE-WALK § 1.2:49 historical narrative borderline; § 4.2 R-E1 historical-quote literal-string preserved; halt-condition site-counting interpretive flexibility.

Operator next action: trigger Memorial Updater to record R17 outcomes; future-round Implementer addresses MINOR-1/MINOR-2/MINOR-3 in next in-passing cleanup window if desired.

---

## R17 Implementer close — attestation

| Item | Result |
|------|--------|
| typecheck | exit 0 |
| test/q01-vendoring-coverage.test.js | 3/0 |
| test/q01-no-at-pin-deltas.test.js | 1/0 |
| test/q01-schema-additions.test.js | 5/0 |
| test/q02-schema-extension.test.js | 6/0 |
| test/q03-warm-start-runtime.test.js | 13/0 |
| test/q04-welford-stats.test.js | 11/0 |
| test/q05-per-shard-runtime.test.js | 13/0 |
| test/q06-baseline-pre-pass.test.js | 13/0 |
| test/q07-fleet-correlated.test.js | 23/0 |
| test/q10-per-shard-emission.test.js | 11/0 |
| test/q11-hierarchical-e-value-combination.test.js | 18/0 |
| test/q12-fleet-merged-detector-surfaces.test.js | 16/0 |
| test/q13-e-bh-fdr.test.js | 14/0 |
| test/q14-compiled-config-loader.test.js | 6/0 |
| test/q14-mean-delta.test.js | 7/0 |
| test/q14-pr-f5-storage.test.js | 4/0 |
| test/q16-pr-f5-investigation.test.js | 2/0 |
| test/betting-e-process-class-dispatch.test.js | 5/0 |
| **Total** | **171/0** (identical to R16 baseline) |

Attestation SHA: `435bcdd` (coordination chore commit)

---

## Inputs (artifacts the Memorial Updater should read)

- `coordination/specs/Q-R17-SPEC.md` (Implementer self-spec; audit-tier round)
- `coordination/reviews/REVIEWER-REPORT-R17.md` (this Reviewer report)
- `coordination/MEMORIAL.md` (R17 Implementer + R17 Reviewer entries appended this round)
- `coordination/diagnostics/` (verified empty for R17; no halt conditions triggered)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (tessera-R17 additions to be written)

---

## R17 round scope (preserved for Memorial Updater context)

**R17 = TQ-1 disposition (β) execution: pitch-revise + shard definition addition + TQ-1 closure + R10 MINOR-1 in-passing.** Audit tier per evening-overnight authority. First round of the post-Phase-1 evening chain (R17 → R18-R19 Phase 2 SLICE 1 → STOP).

R16 investigation refuted the d-mismatch hypothesis: at d=100 the ratio is 1006.5× (not 1.2-1.5×); ratio converges to N as d→∞; welford_state is load-bearing for persistence; diagonal-only would help marginally but breaks Family C T² semantics. Conclusion: 1.2-1.5× is structurally incompatible with N-shard per-shard observation. Operator dispositioned (β) pitch-revise.

R17 also addresses a vocabulary gap surfaced during TQ-1 discussion: the project never defined "1 shard = ? GPUs" explicitly. NVIDIA FSDP / tensor-parallelism / pipeline-parallelism documentation unambiguously uses `shard = 1 GPU`. Tessera's PRD US-01 ("shard 47 has a bad GPU") implicitly matches this. R17 makes it explicit so the storage-claim revision lands with a precise unit.

## Five items in scope

### Item 1 — SCOPING-MEMO-v0.3 § 2.2 storage-claim revision

Replace the predicted `1.2-1.5× single-instance footprint` claim with the empirically-validated N-scaling truth:

- The current text in v0.3 § 2.2 predicts: *"at N=10000 with sparse residual encoding, total ≈ 1.2-1.5× single-instance footprint."*
- The corrected text should document: per-shard observation is per-shard storage; storage scales linearly with N (≈N × single-instance baseline); R16 PR-F5-INVESTIGATION confirms this at multiple d values; mitigation paths (diagonal-only Family C variant; cross-shard sharing in Phase 2) deferred as candidates if real-cluster footprint at target N becomes operationally infeasible.
- Provenance note: cite R16 investigation + R14 PR-F5 measurement; preserve historical context.

Memo version bump to v0.4 (or in-place amendment with §1.x revision note; Implementer's brainstorm picks).

### Item 2 — Shard definition addition

Add a new sub-section to SCOPING-MEMO-v0.3 (location: § 1 or new § 1.1; Implementer's brainstorm picks) defining:

- `1 shard = 1 GPU rank` per NVIDIA FSDP / tensor-parallelism / pipeline-parallelism convention
- Cite NVIDIA's NeMo Framework Parallelisms documentation and Megatron-Core FSDP documentation
- Topology hierarchy: `gpu_shard < dgx_node (8 shards) < rack (32-128 shards) < scalable_unit (256 shards) < superpod (1K-8K+ shards)`
- Inference caveat: training uses canonical per-GPU shard; inference may use coarser granularity (e.g., serving worker per N>1 GPUs for large-model partition) — Tessera's per-shard observation maps to per-GPU by default but is granularity-agnostic at the detector layer

This addresses an oversight in v0.3: the storage-claim discussion (Item 1) needs a precise unit-of-storage to be operationally meaningful.

### Item 3 — PHASE-1-CLOSE-WALK.md Phase 2 TAGGED-FUTURE update

Add storage-mitigation paths to the Phase 2 TAGGED-FUTURE activation criteria section:

- Phase 2 candidate: diagonal-only Family C covariance variant (R16 Item 3 finding: would reduce ratio ~40× at d=100 but breaks Hotelling T² semantics — needs Architect-level pair-review)
- Phase 2 candidate: cross-shard sharing of common patterns (under Extension 3 cross-shard correlation infrastructure)
- Trigger: real-cluster footprint at target N becoming operationally infeasible (>10K GPUs with default cell+signal configs ≈ 800 MB+; investigate when concrete demand surfaces)

### Item 4 — TQ-1 closure in OVERNIGHT-LOG-2026-05-17.md morning triage queue

Update the TQ-1 entry in `coordination/OVERNIGHT-LOG-2026-05-17.md` morning triage queue:
- Mark disposition: **(β) pitch-revise** confirmed by operator 2026-05-17 evening
- Cross-reference: R17 commit SHA + v0.3 memo amendment file path + PHASE-1-CLOSE-WALK.md update line range
- Keep entry visible (don't delete) — closed-with-disposition state for audit trail

### Item 5 — R10 MINOR-1 in-passing cleanup

`engine/per-shard/runtime.ts` file-level docblock still says "Tessera SLICE 2b3: per-shard runtime composition" — needs to mention R10 `projectTierGatedOutputs` + R14 mean_delta injection contributions. One-paragraph docblock update. Apply in-passing if Implementer's brainstorm naturally encounters; not blocking if it doesn't fit cleanly.

## Tier and audit-tier specifics

**Tier: audit** per operator pre-approval. S4 (tactical follow-up to R14/R16) + S2 (R16 findings document describes Items 1-4 directly).

Implementer self-specs + executes; Reviewer cold-audits; Memorial Updater records.

**Split condition:** if Item 2 (shard definition) surfaces unexpected architectural debate (e.g., inference granularity needs more than a caveat — needs a formal model), HALT + DIAGNOSTIC + log to morning triage queue. Operator-gate decision; do not silently pick.

## Active REINFORCED lines Implementer MUST apply (17 IMPL + 1 COMMON + 1 REVIEWER)

R17 Implementer applies all 17 IMPL reinforcements per CLAUDE-IMPLEMENTER.md; particularly:

- **Procedural halt-discipline (R08 MAJOR-1):** if spec premise failures or architectural ambiguity surfaces, HALT + DIAGNOSTIC.
- **Attestation-accuracy (R03 MINOR-4 + R05 MINOR-3):** OBSERVED counts AND narrative tactical-choice forms.
- **Inherited-testimony empirical verification (R08 MAJOR-2):** for any claim about R14/R16 behavior, verify by reading the actual file/test; don't summarize from prior NEXT-ROLE.md or REVIEWER-REPORT.
- **Correction-propagation pass (R09 MAJOR-1):** Item 1 (memo amendment) MUST enumerate all sibling sites that cite the old 1.2-1.5× claim. Likely sites:
  - SCOPING-MEMO-v0.3 § 2.2 (primary)
  - PHASE-1-CLOSE-WALK.md (any reference)
  - SCOPING-MEMO-BASELINE-CURATION-v0.2/v0.3 if they cite the storage prediction
  - Any spec or audit-sidecar that cites the prediction (q14 spec; q14 test header)
  - OVERNIGHT-LOG-2026-05-17.md TQ-1 entry

R17 Reviewer applies the new R16-derived reinforcement:
- **Reviewer MEMORIAL.md violation entries** (R16): for any finding at MINOR severity or above, ALSO append a corresponding VIOLATION entry to coordination/MEMORIAL.md (don't leave audit trail to Memorial Updater reconstruction).

## Halt conditions for R17

- **Memo amendment scope expansion:** if Item 1 surfaces additional architectural revisions beyond pitch-claim correction (e.g., v0.3 § 2.2 has more empirically-wrong predictions), HALT + DIAGNOSTIC; log additions to morning triage queue.
- **Shard definition architectural debate:** if Item 2 surfaces a formal model question (inference granularity model; training-vs-inference shard divergence), HALT + DIAGNOSTIC.
- **Correction-propagation surface count > 5:** if Item 1's sibling-site enumeration finds >5 sites needing update, HALT + DIAGNOSTIC; log for operator confirmation on scope.
- **R10 MINOR-1 docblock revision touches more than the file header:** if the docblock update requires substantive in-body documentation changes, defer to a future round; stay in-passing only.

## Coordination chore sequence (R14 final revision; same as R06-R16)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R17): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R17): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/ coordination/SCOPING-MEMO-v0.3.md coordination/PHASE-1-CLOSE-WALK.md` is empty.

## Pre-R17 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R16 HEAD `7a7d596`:
- test/q01-vendoring-coverage.test.js: 3/0
- test/q01-no-at-pin-deltas.test.js: 1/0
- test/q01-schema-additions.test.js: 5/0
- test/q02-schema-extension.test.js: 6/0
- test/q03-warm-start-runtime.test.js: 13/0
- test/q04-welford-stats.test.js: 11/0
- test/q05-per-shard-runtime.test.js: 13/0
- test/q06-baseline-pre-pass.test.js: 13/0
- test/q07-fleet-correlated.test.js: 23/0
- test/q10-per-shard-emission.test.js: 11/0
- test/q11-hierarchical-e-value-combination.test.js: 18/0
- test/q12-fleet-merged-detector-surfaces.test.js: 16/0
- test/q13-e-bh-fdr.test.js: 14/0
- test/q14-compiled-config-loader.test.js: 6/0
- test/q14-mean-delta.test.js: 7/0
- test/q14-pr-f5-storage.test.js: 4/0
- test/q16-pr-f5-investigation.test.js: 2/0
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 171/0**

R17 expected at GREEN: prior 18 file counts UNCHANGED (documentation round; no production code changes beyond R10 MINOR-1 docblock). No new test file expected. Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R17 --tier audit
```

`--tier audit` per operator pre-approval.

## Post-R17 chain (per evening-overnight authority)

- **R18 = Phase 2 SLICE 1** architect spec + RED + GREEN (enum extensions + VerdictGroup scope contract + v9X fixture). Full tier per A2 (new architectural pattern — first Phase 2 work) + A4 (novel data model — TopologyNode.kind extension).
- **R19 = Phase 2 SLICE 1 close** (refinement if needed; consolidation if SLICE 1 needs 2 cycles per v0.3 § 3). Full tier.
- **STOP at R19** for operator review of Phase 2 entry milestone. ~5-round budget honored (R17-R21 max).

## Operator gate items (preserved for morning triage)

- **PR #38** anchor (operator-owned)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring (parked per operator confirmation; Phase 2 SLICE 1 doesn't need it)
- **OQ-R08-3** Phase 2 transient detector scheduling (parked)
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R11/R12/R13/R14/R15/R16 MINORs + OBS** non-load-bearing

## R17 Attestation

**SHA-A (coordination chore):** `435bcdd`
**Observed test counts at GREEN:** 171/0 across 18 files (all counts identical to R16 baseline).
**Reviewer verification command:** `git diff 435bcdd HEAD -- src/ tests/ tools/ engine/ coordination/specs/ coordination/SCOPING-MEMO-v0.3.md coordination/PHASE-1-CLOSE-WALK.md`

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R16 closed: TQ-1 (γ) investigation complete; d-mismatch hypothesis refuted; (β) pitch-revise becomes natural disposition. NVIDIA documentation research confirmed `1 shard = 1 GPU` as canonical convention. |
| 2026-05-17 | Operator dispositioned (β) on TQ-1 + authorized evening overnight chain with Phase 2 entry permitted. R17 launched. |
| 2026-05-17 | R17 completed: TQ-1 closed with (β) pitch-revise; shard definition added; PHASE-1-CLOSE-WALK updated; R10 MINOR-1 docblock resolved. Routing to REVIEWER. |
