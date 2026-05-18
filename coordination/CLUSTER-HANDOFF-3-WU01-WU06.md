# CLUSTER-HANDOFF-3-WU01-WU06 — WU-01 SLURM-ADAPTER → WU-06 EVENT-CONDITIONAL ATTRIBUTION

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-A (Wave 2) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 Step 2 inbound edges; `coordination/reviews/REVIEWER-REPORT-R28.md`; `WAVE-GATE-03.md`
**Type:** cross-cluster dependency contract (D2 MEDIUM — interface-only; event-conditional attribution may topology-condition; reads `TopologySource` interface NOT vendor parser)

---

## Purpose

WU-06's event-conditional attribution layer may topology-condition (e.g., "drift correlated with deployment event X in topology-localized region Y"). The topology side of WU-06 reads the abstract `TopologySource` interface + `TopologySnapshot` shape from inherited `engine/topology-overlay.ts:40-43`. WU-06 does NOT import SLURM-specific parser (`engine/topology/slurm-source.ts`) directly — adapter selection happens at operator/orchestrator layer (caller passes a `TopologySource` impl to attribution layer). The edge is INTERFACE-ONLY; analogous in shape to all three Wave 2 adapter → WU-06 edges.

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-2→Wave-4 cross-wave edge is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch.

---

## Dependency edge

- **Source cluster:** CL-02-A
- **Source work unit:** WU-01 — SLURM-ADAPTER (Tessera Phase 2 SLICE 3.B; R28)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (event-conditional attribution layer may topology-condition; reads TopologySource interface, NOT SLURM parser directly)
- **Dependency test that fired:** D2 (AC reference / interface contract)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** WU-06 attribution-layer ACs may reference topology-conditioning (event X drift in rack Y) — reads `TopologySnapshot` shape + `TopologyNode.kind` enum (`'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`) + `TopologyEdge.relationship` enum (`'contains' | 'nvlink_peer'`). Does NOT import `SlurmTopologySource` class directly. If WU-06 spec includes a topology-conditioning AC that exercises a Slurm-specific topology fixture, the dependency strengthens — but the primary integration is at the interface boundary, not the impl.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `slurm-source.ts` | `engine/topology/slurm-source.ts` (~230 lines; Tessera-original) | `SlurmTopologySource implements TopologySource`. Parses `topology.conf` with bracket-range expansion, hierarchical trees, sparse-subtree placeholders. Emits `TopologySnapshot` with `TopologyNode.kind = 'rack' | 'gpu_shard'` + `TopologyEdge.relationship = 'contains'`. |
| `q28-slurm-adapter.test.ts` | `test/q28-slurm-adapter.test.ts` | 14 ACs PASS. R28 MINOR-1 (AC-R28-9 source_id/source_version under-assertion at empty-input sub-case) CLOSED at R32 (snap1 fixed; snap2 carries forward as R32 MINOR-3 cosmetic gap). |
| `slurm-fixture-*.conf` | `test/_substrate/slurm-fixture-*.conf` | Synthetic `topology.conf` fixtures for canonical + sparse topology cases. |
| `Q-R28-SPEC.md` | `coordination/specs/Q-R28-SPEC.md` | R28 Architect spec. |
| `REVIEWER-REPORT-R28.md` | `coordination/reviews/REVIEWER-REPORT-R28.md` | R28 Reviewer report: 0 CRITICAL / 0 MAJOR / 2 MINOR (MINOR-1 CLOSED at R32; MINOR-2 procedural self-discharged at R28 close) / 4 OBS. |

### Interface contract (the interface WU-06 reads, NOT the impl)

WU-06 reads ONLY:
- `TopologySource` interface from `engine/topology-overlay.ts:40-55`
- `TopologySnapshot` shape from inherited `engine/topology-overlay.ts` types
- `TopologyNode.kind` enum from `engine/types/verdict.ts` (Wave 2-extended at R18/R23/R28: `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`)
- `TopologyEdge.relationship` enum from `engine/types/verdict.ts` (Wave 2-extended at R18/R23/R28: `'contains' | 'nvlink_peer'`)

WU-06 does NOT read:
- `SlurmTopologySource` class implementation details
- Slurm `topology.conf` format specifics
- `parseSlurmTopologyConf` internal parsing logic

If WU-06 spec needs a topology fixture for testing, it uses the abstract `TopologySource` mock OR loads a vendor-neutral synthetic snapshot OR loads v9Y multi-rack cluster fixture (Wave 1 frozen).

---

## Verification status

Per `REVIEWER-REPORT-R28.md` + R32 closure of R28 MINOR-1 + `WAVE-GATE-02.md`:

- [x] Output artifact (`slurm-source.ts`) exists at the stated location; verified at gate via main HEAD `c503edb` (bit-identical to R28 merge HEAD `44e397b`; unchanged across Wave 3).
- [x] Interface contract matches Reviewer per-AC verification (14 ACs PASS; AC-R28-9 source_id/source_version coverage tightened at R32 AC-R32-11).
- [x] TopologySource interface conformance verified (R28 AC suite).
- [x] Sparse-topology graceful degradation verified.
- [x] Parallel-class architecture preserved (zero imports from k8s-source, nvlink-source, common-mode-attribution per PHASE-2-SLICE-3-CLOSE-WALK § 3.1).

---

## What the target cluster must not assume

- WU-01 did NOT consume the L0 contract surface at runtime (D2 MEDIUM with WU-00; zero L0 imports verified by grep at R28 Reviewer cross-cutting checks). WU-06 inherits the same interface-only stance for topology adapters.
- WU-01 did NOT implement event-conditional attribution — that's WU-06's job. WU-01 produces topology snapshot; WU-06 reads it.
- WU-01 did NOT modify `engine/topology-overlay.ts` body (parallel-class architecture). WU-06 inherits the same constraint.
- WU-01's `topology.conf` parser is Slurm-specific. WU-06 MUST NOT design event-feed schema in a Slurm-specific way; event-feed is operator-level event abstraction independent of topology source.
- WU-01's R28 MINOR-3 cosmetic snap2 gap (carry-forward from R32) is NOT a WU-06 deliverable.

---

## Pre-flags from wave gate (WAVE-GATE-03 § Pre-flags to Wave 4 cluster)

- **All three Wave 2 adapter surfaces stable at parallel-class locations.** WU-06 reads only the abstract `TopologySource` interface; vendor adapter selection is at orchestrator layer.
- **Parallel-class architecture confirmed at R32 (PHASE-2-SLICE-3-CLOSE-WALK § 3.1).** WU-06 inherits the same architectural constraint: NO modification of `slurm-source.ts` body; NO direct imports between WU-06 and any vendor adapter.

---

## Halt conditions for target cluster

1. WU-06 event-conditional attribution requires modification of `engine/topology/slurm-source.ts` body — HALT; Wave-2-frozen. WU-06 reads at interface only.
2. WU-06 event-conditional attribution requires extending `TopologySource` interface (a new method beyond `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)`) — HALT; ESCALATE to Coordinator for cross-wave impact assessment (vendored-with-deltas transition for `engine/topology-overlay.ts` interface body).
3. WU-06 requires a new `TopologyNode.kind` or `TopologyEdge.relationship` enum literal — HALT; vendored-with-deltas transition for `engine/types/verdict.ts`; apply two-step maintenance pattern UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern + R18/R23/R28 enum-extension precedent.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | DEFERRED | Cross-wave edge timing. |
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff emitted at Wave 3 gate authorizing Wave 4 dispatch. SLURM adapter surface verified at main HEAD `c503edb` (bit-identical to R28 merge HEAD `44e397b`). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation (deferred from Wave 2 gate per cross-wave handoff timing convention) | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
