CURRENT-ROUND: R18
NEXT-ROLE: OPERATOR
STATUS: ESCALATE
Inputs: coordination/specs/Q-R18-SPEC.md (+ coordination/specs/Q-R18-SPEC-AUDIT.md sidecar; Architect ceremony, optional read for Implementer)

## Escalation items

- coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md

**Bounded question:** `q01-no-at-pin-deltas.test.ts` includes `engine/types/verdict.ts` in its byte-identity AT_PIN_FILES list; the R18 deltas to verdict.ts break that test (observed 180/1, not 181/0). Anti-scope prohibits modifying prior-round test files. The config.ts precedent (remove from AT_PIN_FILES + update VENDORING-MANIFEST.md row to `vendored-with-deltas`) resolves this cleanly (Option A in DIAGNOSTIC). Option B accepts the regression and proceeds with 180/1.

**Which disposition?**
- Option A: Approve targeted exception — update q01-no-at-pin-deltas.test.ts + VENDORING-MANIFEST.md (analogous to config.ts); Implementer re-runs to GREEN at 181/0.
- Option B: Accept 1-test regression; Reviewer audits as MAJOR/MINOR; Implementer completes with 180/1.

## Round scope — operator-set (do NOT auto-redirect)

**R18 = Phase 2 SLICE 1 (1-cycle interpretation per PHASE-1-CLOSE-WALK.md:250).**

This is the FIRST Phase 2 round. Per v0.3 § 3 Phase 2 SLICE 1 was estimated 1-2 cycles; the R15 close-walk artifact at line 250 simplified to a tighter 1-cycle interpretation: minimum-viable topology surface + cluster_event_id propagation + minimal v9X fixture. R18 ships that 1-cycle interpretation; R19 (if needed) handles refinement or closes the SLICE.

R18 SHIPS (per PHASE-1-CLOSE-WALK.md:250 1-cycle interpretation):
- **TopologyNode.kind enum extension:** add `'gpu_shard' | 'rack'` (minimum-viable subset of full v0.3 § 2.3 list `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`). PSU + cooling_zone deferred to later Phase 2 SLICE.
- **TopologyEdge.relationship enum extension:** add `'contains'` (hierarchical containment only). Peer semantics (`'nvlink_peer'`, `'shares_psu'`, `'co_located_in_rack'`) deferred per v0.3 § 2.3 architect-pre-prediction (BFS undirected adaptation work is later SLICE).
- **VerdictGroup scope-extension contract:** add `cluster_event_id?: string` optional field. Preserved-vs-amended walk of inherited Addition #25 D2 + D5 clauses (per v0.3 § 2.3 + § 9 vendoring policy).
- **Synthetic-cluster substrate v9X-class fixture generation:** single-rack cluster with N=10-20 GPU shards. Used as test fixture for the topology + VerdictGroup contract.
- **New test file** binding the enum extensions + VerdictGroup contract + v9X fixture usage. AC count target: 6-12 (small, focused round).

R18 does NOT ship (explicit anti-scope):
- **HardwareTopologySource concrete impl** — Phase 2 SLICE 3 per v0.3 § 3. R18 extends the enum; consumer impl is later.
- **Deployment-event-feed ingestion** — Phase 2 SLICE 4 per v0.3 § 3.
- **PSU / cooling_zone TopologyNode.kind values** — deferred to later Phase 2 SLICE.
- **Undirected/peer TopologyEdge relationships** — deferred per architect-pre-prediction; first need empirical evidence that hierarchical+containment is insufficient.
- **Cross-shard correlation logic** — Phase 2 SLICE 2+ work.
- **Modification to inherited Addition #25 / #26 internals** — preserved-vs-amended walk only; no internals change.
- **Phase 2 SLICE 2+ work** — HARD STOP at SLICE 1 close per evening-overnight authority.

## Architectural pre-dispositions

Per `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:
- **Q-J1 through Q-J5** — all preserved.
- **Q-JC1 through Q-JC6** + Q-JC4a/b/c — all preserved (baseline curation track is Phase 1 work; Phase 2 enum extensions are orthogonal).

Per `coordination/SCOPING-MEMO-v0.3.md` § 2.3:
- **Extension 3 architecture** — R18 lands minimum-viable surface (enum extensions only); HardwareTopologySource concrete impl deferred to SLICE 3; deployment-event ingestion deferred to SLICE 4.
- **Inherited Addition #25 D2 + D5 clauses** — preserved-vs-amended walk per § 2.3 requirement.
- **Inherited Addition #26 D4 (correlational-not-causal wire-format)** — A16 anti-scope; preserved.

## Active REINFORCED lines architect MUST apply (17 ARCH + 23 IMPL + 1 COMMON + 1 REVIEWER)

R18 Architect applies all 17 ARCH reinforcements; particularly:
- **Cross-section consistency pass** (R02; 11th consecutive standing application).
- **Type-declaration-site discipline** (R02) — open inherited Addition #25 VerdictGroup declaration site at `engine/types/verdict.ts:141-188` (per v0.3 § 1.6 REVIEWER-ANCHOR) + Addition #26 TopologyNode/TopologyEdge at `engine/topology-overlay.ts:40-43` + `engine/types/verdict.ts:237-240` (TopologyCandidate context).
- **Inherited-testimony empirical verification** (R08; anchor PR #38) — verify Addition #25 D2 + D5 clauses by READING the inherited source at `engine/types/verdict.ts:141-188`; don't summarize from v0.3 § 1.6 text alone.
- **Correction-propagation pass** (R09; anchor PR #38) — VerdictGroup interface change must propagate to all sibling sites (any spec or test that constructs VerdictGroup instances).
- **OBSERVED-binding scope** (R07; anchor PR #38) — use theory-derived bounds for empirical ACs; v9X fixture should be deterministic + theory-bound, not OBSERVED-bound.

R18 Implementer applies all 23 IMPL reinforcements per CLAUDE-IMPLEMENTER.md; particularly:
- **Procedural halt-discipline (R08 MAJOR-1):** spec premise failures require DIAGNOSTIC.
- **Attestation-accuracy (R03 MINOR-4):** OBSERVED, not predicted.
- **Correction-propagation pass (R09 MAJOR-1):** VerdictGroup consumers might exist in inherited engine; check before modifying interface shape.

R18 Reviewer applies the new R16-derived reinforcement:
- **Reviewer MEMORIAL.md violation entries** (R16): MEMORIAL.md gets VIOLATION entries for every MINOR+ finding (not just REVIEWER-REPORT).

## Halt conditions for R18

- **Addition #25 D2 / D5 clause violation:** if VerdictGroup `cluster_event_id` field addition affects inherited D2/D5 semantics (additive optional should be safe; verify), HALT + DIAGNOSTIC.
- **TopologyNode.kind enum extension breaks inherited consumers:** the inherited engine has consumers of TopologyNode.kind at certain sites; verify additive extension doesn't break exhaustive-switch handling. If it does, HALT + DIAGNOSTIC.
- **TopologyEdge.relationship `'contains'` semantics ambiguity:** if BFS visit logic at `engine/topology-overlay.ts` requires directional handling for `'contains'`, that's an architectural decision (treat as directed parent→child? bidirectional?); HALT + DIAGNOSTIC.
- **v9X fixture format question:** if synthetic-cluster substrate needs to match a specific format that's not architecturally specified, HALT + DIAGNOSTIC.
- **Scope expansion to peer relationships or HardwareTopologySource:** explicit anti-scope; HALT if architect's brainstorm pulls toward bundling.

## Coordination chore sequence (R14 final revision; same as R06-R17)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R18): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R18): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R18 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R17 HEAD `e937d00`:
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

R18 expected at GREEN: prior 18 file counts unchanged + new q18 file (likely +6 to +12 ACs covering: TopologyNode.kind extension; TopologyEdge.relationship extension; VerdictGroup cluster_event_id additive field; v9X fixture build; Addition #25 D2/D5 preservation; Addition #26 D4 preservation). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R18 --tier full
```

`--tier full` per A2 (new architectural pattern — first Phase 2 work) + A4 (novel data model — TopologyNode.kind + TopologyEdge.relationship enum extensions + VerdictGroup interface change).

## Post-R18 chain (per evening-overnight authority)

- **R19 = Phase 2 SLICE 1 close** (refinement if R18 doesn't fully close; consolidation if SLICE 1 needs the 2-cycle interpretation per v0.3 § 3). Full tier.
- **HARD STOP at SLICE 1 milestone** for operator review of Phase 2 entry quality.

If R18 closes SLICE 1 cleanly in 1 cycle (per PHASE-1-CLOSE-WALK.md:250 interpretation), R19 becomes optional and the chain stops earlier.

## Operator gate items (preserved for morning triage)

- **PR #38** anchor (operator-owned; stays parked)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring (parked)
- **OQ-R08-3** Phase 2 transient detector scheduling (parked; could surface at Phase 2 SLICE 2+ scoping)
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10/R11/R12/R13/R14/R15/R16/R17 MINORs + OBS** non-load-bearing; tactical cleanup deferrable
- **R17 MINOR-1** correction-propagation gap at PHASE-1-CLOSE-WALK.md:175 (TQ-1 stale γ recommendation; tactical cleanup)
- **R17 MINOR-2** MEMORIAL.md:1634 R16 entry orphaned under R17 header
- **R17 MINOR-3** runtime.ts file-path-prefix on REVIEWER-REPORT citations

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R17 closed audit-tier: TQ-1 (β) pitch-revise + shard definition + R10 MINOR-1 docblock + PHASE-1-CLOSE-WALK Phase 2 TAGGED-FUTURE storage-mitigation paths. |
| 2026-05-17 | R18 launched evening-overnight chain: first Phase 2 work; SLICE 1 minimum-viable topology surface + cluster_event_id propagation. |
