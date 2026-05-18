CURRENT-ROUND: R32
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R32 — Wave 3 / WU-05 SLICE 3 close-walk)

**R32 = Wave 3 single-cluster dispatch: WU-05 SLICE 3 close-walk; audit tier; hybrid Reviewer enabled.**

Per WAVE-GATE-02 § Wave 3 dispatch routing: this cluster runs in main worktree (no `multi-track-cluster-setup.sh`). Audit tier means **no separate Architect** — Implementer authors thin spec inline + executes 5 deliverables. Hybrid Reviewer (Opus + Sonnet + Merger per `run-pipeline.sh:1079-1115`) audits the consolidated SLICE 3 deliverable.

After this cluster + Coordinator Wave 3 gate (R33), **HARD STOP at SLICE 3 milestone per overnight authority** [[project-overnight-authority-2026-05-18-morning]]. SLICE 4 entry requires operator return.

## Inputs for next role (Implementer at audit tier)

**Primary inputs (read in order):**

1. **`coordination/cluster-scopes/wave-3/wu-05-slice-3-close-walk.md`** — full scope block with 5 deliverables enumeration + 13 MINOR cleanup items + halt conditions. **This is your primary scope artifact.**
2. **`coordination/STAGED-FOR-WU-05-SCOPE.md`** — Item 1: vendor-fungibility SCOPING-MEMO amendment (Deliverable 2). **Operator-authorized 2026-05-18 morning; MUST land as a WU-05 deliverable per task #22.**
3. **`coordination/WAVE-GATE-02.md`** — Wave 2 gate outcomes + 4 derived cross-project rules + Wave 3 routing authorization.
4. **5 CLUSTER-HANDOFF-2 artifacts** at `coordination/CLUSTER-HANDOFF-2-WU{00,01,02,03,04}-WU05.md` — upstream dependency contracts; each handoff enumerates what Wave 1/2 produced + what WU-05 close-walk must close.
5. **`coordination/WAVE-PLAN-02.md`** — plan being closed; § Wave 3 row + § Step 6 tier classification.
6. **`coordination/SCOPING-MEMO-v0.3.md`** — § 3 SLICE 3.C row (close-walk + hybrid Reviewer mandate); § 2.3 [MR-1 AMENDMENT] block (vendor-fungibility amendment generalizes this language).
7. **`coordination/PHASE-2-SLICE-1-CLOSE-WALK.md`** + **`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`** — structural templates for the new `PHASE-2-SLICE-3-CLOSE-WALK.md` (Deliverable 1).
8. **`coordination/COORDINATOR-MEMORIAL.md`** — Wave 1 + Wave 2 gate entries (for § 5 Memorial state stamp reference).
9. **`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`** — 4 cross-project rules derived this session (all active).

**Wave 1 + Wave 2 outputs to reference (READ-ONLY):**

- `engine/l0/counter-rate-transform.ts` (R25 deliverable)
- `engine/topology/{slurm,k8s,nvlink}-source.ts` (R28/R29/R30 deliverables)
- `engine/topology/common-mode-attribution.ts` (R26 deliverable — but **AUTHORIZED EDIT** per Deliverable 3 R26 MINOR-2 cleanup)
- `test/_substrate/synthetic-counter-generator.ts` (R25 substrate; frozen)
- All Q-R{25,26,28,29,30}-SPEC.md (Wave 1 + Wave 2 specs; **AUTHORIZED EDITS** per Deliverable 3 R25 MAJORs + R26 MAJOR-1 cleanups)

## Five deliverables (per scope block)

1. **`coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`** — NEW close-walk doc mirroring R19/R22 structure.
2. **Vendor-fungibility SCOPING-MEMO amendment** — operator-reviewable artifact; 5 amendment items per STAGED-FOR-WU-05-SCOPE.md.
3. **13 Wave 1 + Wave 2 MINOR cleanup items** — surgical edits at file granularity per scope block § Deliverable 3 table (pre-authorized to avoid R19 close-walk-anti-scope-incident).
4. **PR-F6 hybrid Reviewer pair-review audit** of consolidated SLICE 3 deliverable (executed by hybrid Reviewer; landed in REVIEWER-REPORT-R32.md).
5. **COORDINATOR-MEMORIAL.md augmentation** — deferred to Coordinator R33 gate; WU-05 Implementer does NOT touch.

## Tier (audit) + Hybrid Reviewer invocation

```bash
cd /Users/johnwarren/concord/tessera
HYBRID_REVIEWER=true ./run-pipeline.sh --round R32 --tier audit
```

Audit-tier means: Implementer authors thin Q-R32-SPEC.md inline (per CLAUDE-IMPLEMENTER.md audit-tier protocol) + executes deliverables + Hybrid Reviewer audits.

Hybrid Reviewer dispatches Opus + Sonnet in parallel + Merger consolidates findings into REVIEWER-REPORT-R32.md per `run-pipeline.sh:1079-1115` `dispatch_hybrid_reviewer`.

## Apply all 4 cross-project rules UPFRONT

1. **`false-compliance-attestation`** — actual `tsc` exit code + actual `node --test` pass/fail counts encoded verbatim; no reframing.
2. **`architect-branch-binding-coverage`** — for every branch enumerated in the thin spec, trace data-flow reachability not just syntax.
3. **`implementer-spec-test-assertion-coverage`** — for each AC, every Then-column field asserted one-for-one.
4. **`anti-scope-allowed-set-forward-coverage`** — chore-A allowed-set MUST include `^coordination\/reviews\/REVIEWER-REPORT-R32\.md$` regex carve-out for the hybrid-Reviewer-merger commit + `^coordination\/MEMORIAL\.md$` for the Memorial-Updater append.

## Anti-scope (R32 hard limits)

Per scope block § Anti-scope:

- A12 (engine internals frozen)
- A10 (hardware diagnosis fenced; amendment generalizes language but does not change intent)
- Wave 1 + Wave 2 deliverables frozen OUTSIDE the 13 pre-authorized cleanup items
- NO SLICE 4 work
- NO vendor adapter code (TAGGED-FUTURE)
- NO multi-track-cluster-setup.sh modification
- NO CLAUDE-IMPLEMENTER.md consolidation
- NO cluster-scopes/wave-{1,2}/ modification
- NO COORDINATOR-MEMORIAL.md write (Coordinator-only)
- NO CLUSTER-HANDOFF-2-* modification (frozen at Wave 2 gate)

## Halt conditions (escalate to Coordinator)

1. Hybrid Reviewer dispatch fails — HALT + DIAGNOSTIC.
2. Vendor-fungibility amendment scope blows up beyond the 5 enumerated items — HALT + ESCALATE.
3. MINOR cleanup requires editing a frozen file beyond pre-authorized scope — HALT + DIAGNOSTIC.
4. Binding-command output contradicts AC literal — HALT (false-compliance-attestation rule).
5. PR-F6 hybrid audit reveals CRITICAL gap — HALT + ESCALATE.

## Escalation items

(none active)

## Routing notes

- Per overnight authority full SLICE 3 chain authorization. WU-05 close + Coordinator R33 Wave 3 gate = HARD STOP at SLICE 3 milestone.
- Wave 3 gate (R33; Coordinator invocation post-WU-05) authors WAVE-GATE-03.md + SLICE 3 milestone stamp + morning hand-off log section in OVERNIGHT-LOG.
- After R33 HARD STOP: operator returns; reviews vendor-fungibility amendment for approval; decides SLICE 4 entry timing.

## State at R32 entry

| Element | State |
|---|---|
| Wave 1 + Wave 2 deliverables | ✅ all merged to main; HEAD `39ed5d9` (Coordinator R31 outputs) |
| WAVE-GATE-02.md + 5 CLUSTER-HANDOFF-2 artifacts | ✅ emitted |
| STAGED-FOR-WU-05-SCOPE.md (vendor-fungibility amendment) | ✅ ready for Deliverable 2 pickup |
| 4 cross-project rules derived this session | ✅ all in CROSS-PROJECT-MEMORIAL.md |
| 0-CRITICAL streak | 28+ rounds |
| 0-MAJOR streak | 7 rounds |
| Working tree | clean |
| HEAD | `39ed5d9` (pre-WU-05 scope-block commit imminent) |
| HARD STOP queued | after Wave 3 gate (R33) |
