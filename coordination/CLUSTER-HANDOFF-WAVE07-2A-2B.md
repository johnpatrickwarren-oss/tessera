# CLUSTER-HANDOFF-WAVE07-2A-2B — TpuTopologySource interface contract for WU-Phase3-2B consumption

**Producer:** WU-Phase3-2A (closed R56; chore-A `93d3689`; MU `f75f3f9`)
**Consumer:** WU-Phase3-2B (R58 dispatch; live-fetch interface extension across 5 sources)
**Emitted at:** WAVE-GATE-07 close (R57)
**Date:** 2026-05-19

---

## Purpose

WU-Phase3-2B will extend ALL 6 `TopologySource` implementations (Slurm + K8s + NVLink + Neuron Trainium + Neuron Inferentia (within Neuron source) + TPU) with the `fetchSnapshot(ctx?)` interface method + sparse-data resilience tests. This handoff documents the TPU adapter's contract as it landed at R56, so R58's Architect can spec the interface extension against a stable surface.

---

## TPU adapter contract (R56 deliverable; do NOT modify at R58)

**Module:** `engine/topology/tpu-source.ts`

**Exports:**

1. **`parseTpuTopologyJson(input: string): NeuronParseResult-equivalent`** — pure function. Parses TPU topology JSON (synthetic-fixture format derived from JAX `mesh_utils` + TPU v4/v5 papers).
2. **`TpuTopologySource` (class)** — concrete `TopologySource` implementation. Implements:
   - `fetchSnapshot(ctx?: unknown): Promise<TopologySnapshot>` — currently a stub returning the result of `parseTpuTopologyJson` on a constructor-provided fixture string. **R58 work:** extend with real-context-aware semantics (interface-design only; no real cluster fetch per Path B).
   - `snapshotHash(snapshot: TopologySnapshot): string` — delegates to inherited `computeSnapshotHash()` per Addition #26 D6 archaeological-render.
3. **Type exports:** `TpuParseOpts`, `TpuParseResult` (mirror Neuron source export shape).

---

## Schema state at R56 close

`engine/types/verdict.ts` enum extensions (additive only; no breaking changes):

```typescript
// TopologyEdge.relationship:
type TopologyEdgeRelationship =
  | 'contains'              // pre-Phase-2 (Slurm hierarchical)
  | 'k8s_zone_peer'         // K8s adapter R29
  | 'nvlink_peer'           // NVLink adapter R30
  | 'neuron_link_peer'      // R53 — Neuron Trainium + Inferentia2
  | 'tpu_ici_peer'          // R56 — Google TPU/ICI ✓ landed
  // (R58 WU-Phase3-2B does NOT add new literals — interface extension only)
  ;

// TopologyNode.kind:
type TopologyNodeKind =
  | 'rack' | 'host' | 'switch'   // Phase 1/2
  | 'gpu_shard'                   // existing NVIDIA
  | 'trainium_chip'               // R53
  | 'inferentia_chip'             // R53
  | 'tpu_shard'                   // R56 ✓ landed
  // (R58 does NOT add new kinds — interface extension only)
  ;
```

---

## Cross-cluster contract for R58 (WU-Phase3-2B) consumption

**What R58 inherits stable:**
1. `engine/topology/tpu-source.ts` exists, exports `TpuTopologySource` class + `parseTpuTopologyJson` pure function.
2. `engine/types/verdict.ts` contains `'tpu_ici_peer'` + `'tpu_shard'` literals.
3. `engine/topology-overlay.ts` BFS layer consumes `TopologySnapshot` produced by `TpuTopologySource`.

**What R58 extends (interface addition):**
1. `TopologySource.fetchSnapshot(ctx?)` method gets richer semantics — real-cluster-fetch-aware context parameter (auth tokens; API endpoints; timeout budgets). However, NO actual real-cluster fetch implementation per Path B; interface design + sparse-data resilience tests only.
2. Each of 5 sources (Slurm + K8s + NVLink + Neuron + TPU) implements `fetchSnapshot(ctx)` consistently per the new contract.
3. Sparse-data resilience tests validate partial-fetch handling across all 5 sources using synthetic partial-topology fixtures.

**Schema-write-conflict risk: LOW.** R58 does NOT modify `engine/types/verdict.ts` (no new literals); only adds method bodies to existing adapter classes. D5 test should pass clean.

**R58 architect-spec verification (recommended):**
1. Read `engine/topology/tpu-source.ts:1-50` to confirm class signature + interface conformance.
2. Read `engine/topology-overlay.ts` to confirm `TopologySource` interface definition (single source of truth for `fetchSnapshot(ctx?)` signature).
3. Read parallel-class sources (`slurm-source.ts`, `k8s-source.ts`, `nvlink-source.ts`, `neuron-source.ts`) to confirm interface consistency before R58 extension.

---

## Anti-scope for R58 with respect to this handoff

- R58 MUST NOT modify `engine/topology/tpu-source.ts` core parser logic (handoff contract; only the interface method body in the class may be extended).
- R58 MUST NOT modify `engine/types/verdict.ts` (no new literals; no D5 conflict).
- R58 MUST NOT add real-cluster-fetch implementation (Path B; per Phase 3 anti-scope; FR-V4 interface design + sparse-data resilience tests only).

---

## Version history

| Date | Change |
|---|---|
| 2026-05-19 | CLUSTER-HANDOFF-WAVE07-2A-2B.md emitted at R57 (WAVE-GATE-07 close); documents TPU adapter (R56 deliverable) contract for R58 WU-Phase3-2B consumption. |
