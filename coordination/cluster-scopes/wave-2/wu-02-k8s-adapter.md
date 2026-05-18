# Cluster scope — WU-02 K8S-ADAPTER (Wave 2 / R29)

_PRD scope block for cluster `wu-02-k8s-adapter`, planted into the worktree's `coordination/PRD.md` by `scripts/multi-track-cluster-setup.sh --scope`. Cluster's Architect reads this + the CLUSTER-HANDOFF-1-WU00-WU02 contract + SCOPING-MEMO-v0.3 § 2.3 + § 3 SLICE 3.B row + WAVE-GATE-01 Pre-flags as primary inputs._

## Tier verdict

**`full`** (Architect + Implementer + Reviewer + Memorial-Updater per cluster).

Justification: A1 (new dependency on K8s `corev1.NodeList` JSON shape ingestion) + A2 (first K8s-source TopologySource concrete impl in Tessera tree) + parallel-class pattern with WU-01 SLURM + WU-03 NVLINK.

## PRD source

- `coordination/PRD.md` FR-E3b (cross-shard correlation: topology-aware spatial attribution; HardwareTopologySource concrete impl)
- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) "Cluster topology (HardwareTopologySource concrete impl)" + § 3 SLICE 3.B row
- `coordination/CLUSTER-HANDOFF-1-WU00-WU02.md` — L0 contract interface dependency (D2 MEDIUM); read FIRST as primary Architect input
- `coordination/WAVE-GATE-01.md` § Pre-flags to Wave 2 clusters — environmental pre-flags applicable

## Scope

Implement the **Kubernetes node-label adapter**: a concrete `TopologySource` implementation that parses K8s `corev1.NodeList` JSON (well-known topology labels: `topology.kubernetes.io/zone`, `topology.kubernetes.io/region`, `node.kubernetes.io/instance-type`, vendor-specific NVIDIA labels like `nvidia.com/gpu.product`, etc.) and produces `TopologySnapshot` objects.

**Architecturally novel surfaces:**

1. **K8s `corev1.NodeList` parser.** Input: standard K8s `kubectl get nodes -o json` shape (or `corev1.NodeList` from the K8s API client). Parser reads `.items[*].metadata.labels` extracting topology hierarchy from well-known labels (zone → region; instance-type; GPU vendor labels for shard identification). Produces `TopologyNode` per node + per topology-grouping (zone, region) + `TopologyEdge` with `'contains'` for the hierarchical containment.
2. **TopologySource interface conformance.** Implements `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)` per `engine/topology-overlay.ts:50-55`. Delegates hash to `computeSnapshotHash`.
3. **Vendor-label heuristics for shard identification.** K8s doesn't expose per-GPU shards directly — uses node-label conventions (`nvidia.com/gpu.count`, etc.) to infer per-node GPU shards. Architect picks the conservative inference rule (e.g., "treat each `nvidia.com/gpu.count=N` annotation as N gpu_shard nodes attached to the node").
4. **Sparse / partial label graceful handling.** Some K8s clusters expose only zone labels (no region); others expose only nvidia.com/gpu.product (no count). Adapter produces subset topology rather than throwing.

**L0 contract dependency: D2 MEDIUM (interface-only).** K8s `NodeList` JSON is configuration/metadata, not counter-typed telemetry — K8s parser does NOT call `transformPair()` directly. The adapter knows the L0 contract exists but does not import the transform function in its hot path.

**File location** (parallel-class per WAVE-PLAN-02 OQ-W1-1 Option A):

- **Primary module:** `engine/topology/k8s-source.ts` (Tessera-original).
- **Test:** `test/q29-k8s-adapter.test.ts`.
- **Substrate:** NEW `test/_substrate/k8s-nodelist-fixture-*.json` (Tessera-original; one or more synthetic NodeList fixtures covering: full-label, sparse-label, GPU-vendor-label-present, GPU-vendor-label-absent cases).

## Acceptance criteria

**AC enumeration is the Architect's job.** The Architect should enumerate ACs covering:

- Parser ACs: well-formed `NodeList` JSON → expected `TopologySnapshot` structure
- Well-known topology label extraction: `topology.kubernetes.io/zone` + `topology.kubernetes.io/region` → containment hierarchy (zone-in-region; node-in-zone)
- GPU-shard inference from `nvidia.com/gpu.count`-class labels (or equivalent vendor labels Architect identifies as canonical)
- TopologySource interface conformance
- Sparse-label graceful degradation: missing region produces zone-only topology; missing GPU vendor labels produces topology without gpu_shard nodes
- `correlational_not_causal: true` invariant preserved at output wire boundary (A16)
- Anti-scope diff AC (TQ-4 γ; SHA-pinned to chore-A)
- Typecheck + test count ACs (R22 IMPL MINOR-1; **anchored to chore-A SHA explicitly**; **must encode actual `tsc` exit code and actual `node --test` pass/fail counts empirically** per WAVE-GATE-01 pre-flags + R26 MAJOR-1 / R25 MAJOR-1 reinforcement)

Target AC count: 10-14.

## Anti-scope

Same anti-scope structure as WU-01 (A12, A10, A11, A16; pre-R29 test files frozen; WU-00/04 deliverables frozen; WU-01/WU-03 parallel-cluster scopes untouched; no new vendored-with-deltas transitions without upfront pattern application).

## Reinforcements in scope (apply during cluster work)

Same set as WU-01:

- **NEW R26-derived false-compliance-attestation sub-class** of halt-discipline.
- Line-citation-drift rule (R21 MINOR-4).
- Architect spec-commit-sequencing (R21 ARCH MINOR-1).
- AC-table preamble cross-check (R20 ARCH MINOR-1).
- Count-AC chore-A SHA anchoring (R22 IMPL MINOR-1).
- Branch-binding coverage gate (R21 ARCH+IMPL MINOR-2/3).
- TDD separate-RED-commit (R23 IMPL MINOR-1).
- `.gitignore`-aware spec inventories (R23 ARCH MINOR-2).
- **NEW R25-derived coordinator-applied-disposition-spec-amendment-omission** pattern (first VIOLATION at Wave 1 gate; threshold 3).

**Cluster-worktree pre-flags from WAVE-GATE-01:** same as WU-01 — actual baseline test count + actual `tsc` exit code must be encoded empirically; do NOT reframe as compliance.

## Cluster context

**Wave 2 of 5 (parallel to WU-01 SLURM + WU-03 NVLINK).** Zero D-edges with WU-01/03. Parallel-class architecture confirmed at WAVE-PLAN-02 Step 2 pairwise check.

**Downstream dependencies:**

- WU-05 SLICE 3 close-walk (D1 HIGH — close-walk reads `engine/topology/k8s-source.ts` + Reviewer report)

## Halt conditions for this cluster

1. K8s parsing requires modifying inherited `engine/topology-overlay.ts` BFS body — A12; route back.
2. K8s vendor labels require new `TopologyNode.kind` literal — vendored-with-deltas pattern UPFRONT.
3. Binding-command output contradicts AC literal text — HALT + DIAGNOSTIC per cross-project halt-discipline rule.

## Round

`R29` (Wave 2, cluster 2 of 3).

## Branch

`cluster/wu-02-k8s-adapter-R29`.
