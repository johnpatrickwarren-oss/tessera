CURRENT-ROUND: R40
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R40 — Phase 3 candidate synthesis; audit-tier; main worktree)

R40 = third round of post-Phase-2-close safe-continuation chain per evening overnight authority [[project-overnight-authority-2026-05-18-morning]].

**This is NOT a Phase 3 entry.** R40 produces a single DRAFT inventory artifact (`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`) consolidating all TAGGED-FUTURE items across Phase 2 deliverables for operator review next session. Phase 3 SLICE scoping requires explicit operator authorization (per inherited anti-scope A17 + overnight authority).

## Primary deliverable

**`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`** — DRAFT inventory. Suggested structure:

### § 1 Vendor adapter expansion candidates (highest direct fit)

Per `coordination/SCOPING-MEMO-v0.3.md` R32 AMENDMENT vendor-fungibility section:
- AMD ROCm + Infinity Fabric / XGMI (`xgmi_peer` edge literal; `engine/topology/rocm-source.ts`)
- Google TPU + ICI (`tpu_ici_peer`; `engine/topology/tpu-source.ts`)
- AWS Trainium + Neuron Link (`neuron_link_peer`; `engine/topology/trainium-source.ts`)
- AWS Inferentia (parallel)
- Each follows established WU-03 NVLink + WU-01 Slurm + WU-02 K8s parallel-class pattern.

### § 2 Real-cluster integration candidates

Per SCOPING-MEMO § 4.2 R-E3 (TAGGED-FUTURE post-Phase-2): real-cluster integration vs synthetic-cluster substrate. Specific surfaces:
- Live DCGM/NVML telemetry ingestion (per amended A10 carve-out for measurement-domain preprocessing)
- Live Slurm/K8s/NVLink topology fetch (vs synthetic fixtures)
- Operational deployment to real GPU cluster (vs CI/synthetic)

### § 3 DeploySignal integration candidates

Per SCOPING-MEMO § 2.3 A17 (NO DeploySignal-integration scope at Phase 1+2): Phase 3+ commitment. Specific surfaces:
- engine extract to shared npm package (`@johnpatrickwarren-oss/deploysignal-engine`) per vendor-first sharing strategy + project-close success metric
- Bi-directional integration (DeploySignal consumes Tessera per-shard observations; Tessera consumes DeploySignal deploy-event feed)
- Vendoring drift resolution (R-E6 risk row)

### § 4 Infrastructure capability candidates

Per `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 4:
- **Tailscale + M4 Pro mini remote-execution** (MR-3 candidate; ~1-2 methodology rounds of setup)

Per `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (operator-scheduled PR landing):
- 4 anchor backflow PR candidates (subprocess-hang class)
- Coordinator graduation candidates from COORDINATOR-MEMORIAL

### § 5 Methodology evolution candidates

Per cross-project rules Rules 1-7 + COORDINATOR-MEMORIAL friction-surface observations:
- Rule 7 propagation mechanism implementation (Architect spec template enhancement gate; Implementer chore-A pre-commit grep gate)
- Forward-protection mechanism redesign (recurring R25 MAJOR-2 + R34 MAJOR-1 + R36 MAJOR-2 pattern across 3 rounds)
- Pipeline watchdog implementation (anchor backflow Item 3)
- Hybrid Reviewer coverage-split formalization (Opus structural vs Sonnet OBS pattern observed at R32 + R36)

### § 6 Parked operator-gate items

Per all overnight authority memories:
- OQ-1 / Q-JC1 `tools/calibrate.ts` vendoring decision
- OQ-R08-3 Phase 2 transient detector scheduling
- Anchor PR #38 review/merge (operator-owned)
- CLAUDE-IMPLEMENTER.md ongoing consolidation discipline (30-line threshold heuristic — does it scale to Phase 3 round volume?)

### § 7 Phase 3 scope-sizing analysis

Rough Q-cycle estimate per § 1-§ 6 candidates; identify which subset Phase 3 would commit to (operator decision); flag dependencies (vendor adapters depend on real-cluster integration ordering; DeploySignal integration depends on engine npm extract; etc.).

### § 8 NOT recommended for Phase 3 entry (deferred or rejected)

Items captured for completeness but NOT recommended:
- A15 multi-region / cross-cluster federation (per inherited anti-scope; out of scope)
- A13 ML-based attribution (conflicts with honest-broker stance)
- ANY new scope that would require SCOPING-MEMO v0.4

## Tier rationale

**audit-tier** — synthesis is a single-bounded-doc deliverable (S3) + tactical follow-up to Phase 2 close (S4); no novel architecture (no A1-A7); no production code. Implementer wears Architect hat with own thin spec; cold Reviewer audits doc structure + completeness.

## Anti-scope (R40 hard limits)

- NO Phase 3 entry / NO Phase 3 SLICE spec authoring (the deliverable is a DRAFT inventory for operator review)
- NO new scoping decisions (the deliverable surfaces candidates; operator decides)
- NO modification of engine/* or test/* files
- NO modification of CLAUDE-*.md reinforcement files (R39 closed consolidation)
- NO modification of SCOPING-MEMO-v0.3.md or PRD.md
- NO modification of any Phase 2 deliverable (close-walks, gates, plans, handoffs all frozen)
- NO writes to `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-7 already canonical-landed)
- NO new ANCHOR-BACKFLOW content beyond verifying existing artifact references
- NO operator-gate item dispositions (OQ-1, OQ-R08-3, anchor PR #38 stay parked)

## Apply all 7 cross-project rules UPFRONT

All 7 rules active. Especially:
- **Rule 5 (self-application gate)** — the synthesis doc itself must be useful; not just an inventory dump. Each candidate has a 1-line "why this matters for Phase 3" + dependency note.
- **Rule 7 (derived-rule-propagation)** — the inventory's § 5 includes Rule 7 propagation mechanism as a candidate, which is itself an application of Rule 7.

## Halt conditions

1. **Candidate surfaces operator-decision-class question** (e.g., "should AMD adapter precede TPU adapter in Phase 3 sequencing?") — flag as OQ in the inventory artifact; do NOT auto-decide.
2. **Inventory completeness reveals a Phase 3 candidate that contradicts an in-scope Phase 2 deliverable** (e.g., a new candidate that would require re-opening Phase 2) — HALT + DIAGNOSTIC.
3. **External-reference candidate (e.g., anchor backflow PR landing) has changed status since R36 ANCHOR-BACKFLOW compilation** — note in inventory but don't act.

## Inputs for Implementer

1. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 + R32 AMENDMENT vendor-fungibility (§ 1)
2. `coordination/SCOPING-MEMO-v0.3.md` § 4.2 risk table (R-E3 + R-E6 for §§ 2-3)
3. `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (Items 1-5; especially Item 4 for § 4)
4. `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (§ 4)
5. `coordination/COORDINATOR-MEMORIAL.md` (Wave 1-5 gate observations + Rules 1-7 derivation history for § 5)
6. `coordination/PHASE-2-CLOSE-WALK.md` (Phase 2 close state; what's deferred to Phase 3)
7. `coordination/PRD.md` (success metrics for § 3 DeploySignal integration + project close)
8. `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-7 canonical state for § 5)
9. ALL `coordination/WAVE-GATE-{01-05}.md` (Coordinator decisions referencing Phase 3 candidates)

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R40 --tier audit
```

## State at R40 entry

| Element | State |
|---|---|
| Phase 2 closed | ✅ R37 WAVE-GATE-05 stamp |
| R38 MAJOR-1 fix verified | ✅ |
| R39 consolidation | ✅ ARCH 33→25; IMPL 36→30 |
| 7 cross-project rules canonical | ✅ |
| 0-CRITICAL streak | 38+ rounds |
| Working tree | clean |
| HEAD | (current main post R39) |
| Post-Phase-2-close chain | R40 (in flight) → R41 (hygiene audit) → HARD STOP |
