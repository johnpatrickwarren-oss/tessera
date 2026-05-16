CURRENT-ROUND: R01
NEXT-ROLE: IMPLEMENTER
STATUS: ESCALATE

## Inputs for next role

When STATUS becomes READY (after escalation resolution below), the Implementer reads:

- `coordination/specs/Q-R01-SPEC.md` — full SPEC fidelity per anchor `templates/Q-NN-SPEC-TEMPLATE.md`. Vendor engine subset from DeploySignal main @ SHA `5a72371` + 3 schema additions (shard_id cell dimension; per_shard_cells field; warm_start confidence enum). 10 ACs; ~32 vendored files + 4 project-config files + 3 new test files; ~6h focused / 1-2 days wall-clock.
- `coordination/reviews/REVIEWER-REPORT-R01-pre-implementation.md` — pre-implementation Reviewer audit of the spec (1 FAIL + 5 GAP all AMENDED at spec v0.2). No outstanding Reviewer findings against the spec.
- `coordination/SCOPING-MEMO-v0.3.md` — canonical Tessera scope; § 1.6 Existing architectural surface (12 grep-evidenced citations at SHA `5a72371`) is the inherited-engine anchor.
- `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` — Q-J1..Q-J5 architect-pre-prediction picks (subject to John override on first review).
- `coordination/ARCHITECT-REPLY-Q-01-DISPOSITION.md` — Memorial D state 22V/8C stamp; Reviewer finding dispositions.
- `coordination/PROJECT-CONTEXT.md` — project-relationship diagram; Memorial D state lineage; conventions.

## Escalation items

R01 IMPLEMENTER fire is **gated** on five conditions, three of which are John-actionable + two of which are anchor-PR-merge-actionable:

### John-actionable

1. **Q-J6 disposition required** (per `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` § Q-J6). Strategic cross-project sequencing between Tessera Phase 1+2 and DeploySignal Phase E. Architect cannot reliably pre-predict (probability bands span 15-35% across 4 options: (i) DS Phase E first / (ii) Tessera first / (iii) parallel tracks / (iv) DS Phase E indefinitely deferred). **Highest severity escalation; cannot proceed without John's call.**

2. **Q-J1..Q-J5 confirmation or amendment** (per `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`). Architect pre-dispositioned with HIGH confidence × 4 + MEDIUM × 1 under overnight autonomy; John override surface explicit per Q-J. **Lower severity; if no amendment requested, default = picks confirmed.**

3. **Q-R01-SPEC.md v0.2 acceptance** (per `ARCHITECT-REPLY-Q-01-DISPOSITION.md`). Architect amendments post Reviewer F1 + G1-G5 applied; John's review confirms or amends. **Lower severity; if no amendment requested, default = accepted.**

### Anchor-PR-merge-actionable

4. **Anchor PR #34** ([README install fix](https://github.com/johnpatrickwarren-oss/anchor/pull/34)) merge. Updates `claude mcp add superpowers` → `/plugin install superpowers@claude-plugins-official` in anchor README install instructions. Not load-bearing for R01 implementation; cosmetic for documentation discoverability.

5. **Anchor PR #35** ([MD-F6 structural fix](https://github.com/johnpatrickwarren-oss/anchor/pull/35)) merge. Adds `## Existing architectural surface (REVIEWER-ANCHOR)` mandatory section to `templates/Q-NN-SPEC-TEMPLATE.md` + `integrations/superpowers-claude-code/scripts/verify-citations.sh` script. **Useful for R01 Implementer to verify citation evidence at Step 0** but not load-bearing — R01 Implementer can use the feature branch (`~/concord/anchor/feat/md-f6-existing-architectural-surface`) directly if PR unmerged at pipeline-run time; document branch-dependency in R01 close-walk artifact.

## Routing notes

**Pipeline run procedure (when STATUS becomes READY):**

```
cd ~/concord/tessera
./run-pipeline.sh --round R01 --start-at IMPLEMENTER --tier full
```

`--start-at IMPLEMENTER` is correct because:
- Architect work for R01 is **already complete** (Q-R01-SPEC.md emitted; 10 ACs; v0.2 post-Reviewer-amendment).
- Pre-implementation Reviewer pass already complete (REVIEWER-REPORT-R01-pre-implementation.md; 1 FAIL + 5 GAP all AMENDED).
- Pipeline IMPLEMENTER → reads spec → invokes superpowers:writing-plans + superpowers:using-git-worktrees + superpowers:test-driven-development + superpowers:verification-before-completion → emits implementation diff + close-walk artifact.
- Pipeline REVIEWER → cold-context audit of implementation against spec; emits `coordination/reviews/REVIEWER-REPORT-R01.md`. (Note: pre-implementation Reviewer pass at `REVIEWER-REPORT-R01-pre-implementation.md` is a SEPARATE artifact; do not confuse.)
- Pipeline MEMORIAL-UPDATER → updates `coordination/MEMORIAL.md` + `~/.claude/CROSS-PROJECT-MEMORIAL.md` with R01 reinforcement learnings.

**On escalation during pipeline run:** any role that hits a halt-condition writes a `coordination/diagnostics/DIAGNOSTIC-R01-<topic>.md` and updates this NEXT-ROLE.md with STATUS: ESCALATE + new escalation item. Pipeline exits with code 2. Resume via `./run-pipeline.sh --round R01 --start-at <ROLE> --tier full` after John resolves.

**State after R01 close (architect-pre-prediction; clean-close ~70%):**

- `coordination/specs/Q-R02-SPEC.md` emitted by Architect for Phase 1 SLICE 2 (per-shard residual schema + warm-start cold-start mechanism + empirical P6 storage profile via PR-F5).
- NEXT-ROLE rolled to R02 ARCHITECT (or R02 IMPLEMENTER if architect-skip per --tier audit).
- Memorial D state stamp re-evaluated (no-increment vs increment-with-reason at R01 close).

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | Mode 2 retrofit. Tessera scaffolded with anchor pipeline structure; NEXT-ROLE.md initialized with R01 IMPLEMENTER STATUS: ESCALATE (5 gating items). |

---

_State machine per anchor `integrations/superpowers-claude-code/README.md` § Mode 2 automated pipeline. Status values: READY (next role can fire) | ESCALATE (one or more escalation items require resolution) | RUNNING (pipeline mid-execution) | DONE (round complete; ready for next round). Pipeline reads this file to determine fire behavior._
