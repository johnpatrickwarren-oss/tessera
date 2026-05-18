# CLUSTER-HANDOFF-3-WU02-WU06 — WU-02 K8S-ADAPTER → WU-06 EVENT-CONDITIONAL ATTRIBUTION

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-B (Wave 2) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 Step 2 inbound edges; `coordination/reviews/REVIEWER-REPORT-R29.md`; `WAVE-GATE-03.md`
**Type:** cross-cluster dependency contract (D2 MEDIUM — interface-only; same shape as WU-01 → WU-06)

---

## Purpose

WU-06's event-conditional attribution layer may topology-condition. The topology side reads the abstract `TopologySource` interface + `TopologySnapshot` shape from inherited `engine/topology-overlay.ts:40-43`. WU-06 does NOT import K8s-specific parser (`engine/topology/k8s-source.ts`) directly — adapter selection happens at operator/orchestrator layer. Same INTERFACE-ONLY edge shape as WU-01 → WU-06.

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-2→Wave-4 cross-wave edge is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch.

---

## Dependency edge

- **Source cluster:** CL-02-B
- **Source work unit:** WU-02 — K8S-ADAPTER (Tessera Phase 2 SLICE 3.B; R29)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (interface-only — same shape as WU-01 → WU-06)
- **Dependency test that fired:** D2 (AC reference / interface contract)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** Same as WU-01 → WU-06: WU-06 reads `TopologySource` interface + `TopologySnapshot` shape, NOT K8s-specific parser. K8s `corev1.NodeList` JSON parsing is encapsulated in `K8sNodeLabelSource implements TopologySource`.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `k8s-source.ts` | `engine/topology/k8s-source.ts` (155 lines; Tessera-original) | `K8sNodeLabelSource implements TopologySource`. Parses K8s `corev1.NodeList` JSON, consuming well-known node labels. Emits `TopologyNode.kind = 'rack' | 'cooling_zone' | 'gpu_shard'`. |
| `q29-k8s-adapter.test.ts` | `test/q29-k8s-adapter.test.ts` | 13 ACs PASS. R29 MINOR-1 (AC-R29-6 host equality) CLOSED at R32 (AC-R32-12). R29 MINOR-2 (REVIEWER-REPORT carve-out) CLOSED at R32 (regex carve-out added; AC-R32-13). R29 MINOR-3 (AC-R29-12 env-strip transparency) CLOSED at R32 (inline comment; AC-R32-14). |
| `k8s-nodelist-fixture-*.json` | `test/_substrate/k8s-nodelist-fixture-*.json` | Synthetic K8s NodeList JSON fixtures. |
| `Q-R29-SPEC.md` | `coordination/specs/Q-R29-SPEC.md` | R29 Architect spec. |
| `REVIEWER-REPORT-R29.md` | `coordination/reviews/REVIEWER-REPORT-R29.md` | R29 Reviewer report: 0 CRITICAL / 0 MAJOR / 3 MINOR (all CLOSED at R32). |

### Interface contract

Same as WU-01 → WU-06 handoff (see that artifact). WU-06 reads only the abstract `TopologySource` interface + `TopologySnapshot` shape; does NOT import K8s parser or K8s-specific types.

---

## Verification status

Per `REVIEWER-REPORT-R29.md` + R32 closure of all 3 R29 MINORs + `WAVE-GATE-02.md`:

- [x] Output artifact (`k8s-source.ts`) exists at the stated location; verified at gate via main HEAD `c503edb` (bit-identical to R29 merge HEAD `b88dea7`; unchanged across Wave 3).
- [x] Interface contract matches Reviewer per-AC verification (13 ACs PASS).
- [x] All 3 R29 MINORs CLOSED at R32 (per PHASE-2-SLICE-3-CLOSE-WALK § 4 table).
- [x] Parallel-class architecture preserved.

---

## What the target cluster must not assume

Same as WU-01 → WU-06 handoff (interface-only stance; no impl-detail imports; parallel-class architecture). WU-02's K8s-specific JSON parsing internals are NOT WU-06's concern.

---

## Pre-flags from wave gate

Same as WU-01 → WU-06 handoff. All three Wave 2 adapter surfaces stable at parallel-class locations.

---

## Halt conditions for target cluster

Same shape as WU-01 → WU-06 handoff:
1. WU-06 requires modification of `k8s-source.ts` body — HALT; Wave-2-frozen.
2. WU-06 requires extending `TopologySource` interface — HALT; ESCALATE.
3. WU-06 requires a new `TopologyNode.kind` or `TopologyEdge.relationship` enum literal — HALT; vendored-with-deltas transition.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | DEFERRED | Cross-wave edge timing. |
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff emitted at Wave 3 gate authorizing Wave 4 dispatch. K8S adapter surface verified at main HEAD `c503edb` (bit-identical to R29 merge HEAD `b88dea7`). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation (deferred from Wave 2 gate per cross-wave handoff timing convention) | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
