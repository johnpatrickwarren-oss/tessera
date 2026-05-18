# Q-R29-SPEC — WU-02 Kubernetes Node-Label Adapter (Wave 2 / R29)

**Phase:** Tessera Phase 2 SLICE 3.B
**Cluster:** `wu-02-k8s-adapter` (CL-02-B; Wave 2 cluster 2 of 3)
**Tier:** `full` (per PRD verdict; A1 + A2 + parallel-class with WU-01/03)
**Branch:** `cluster/wu-02-k8s-adapter-R29`
**Round-start SHA:** `e714703` (last commit before Architect work — `R29 routing: cluster wu-02-k8s-adapter`)
**Architect commit (this spec):** to be assigned at commit; references `<SPEC-COMMIT-SHA>`
**Chore-A SHA:** to be assigned at Implementer GREEN commit; referenced as `<CHORE-A-SHA>` in count + anti-scope ACs
**Audit-trail sidecar:** `coordination/specs/Q-R29-SPEC-AUDIT.md`
**Author:** ARCHITECT (Opus 4.7) — 2026-05-18

---

## § 0. Scope summary

Implement `engine/topology/k8s-source.ts` — a concrete `TopologySource` implementation (per inherited Addition #26 `engine/topology-overlay.ts:50-55`) that consumes K8s `corev1.NodeList` JSON metadata and produces `TopologySnapshot` objects. Uses **existing `TopologyNode.kind` literals only** (`cooling_zone`, `rack`, `gpu_shard`) so this round adds **zero** vendored-with-deltas transitions — PRD halt condition #2 is pre-empted by architectural choice, not deferred to Implementer halt-time judgment.

Parallel-class with `engine/topology/common-mode-attribution.ts` (WU-04 R26, Wave 1). Sister-cluster scopes (WU-01 SLURM at `engine/topology/slurm-source.ts`; WU-03 NVLINK at `engine/topology/nvlink-source.ts`) are independent and OUT of this round's anti-scope.

The K8s adapter is **interface-only** with the L0 contract (`engine/l0/counter-rate-transform.ts`); K8s NodeList JSON is metadata, not counter-typed telemetry, so `transformPair` is NOT invoked in this round's code (per CLUSTER-HANDOFF-1-WU00-WU02.md §Dependency edge).

---

## § 1. Mechanism

### § 1.1. Inputs and outputs at the adapter boundary

**Input shape — `K8sNodeList`** (structural subset of upstream `corev1.NodeList`; only fields this adapter reads):

```typescript
interface K8sNodeList {
  items: K8sNode[];
}
interface K8sNode {
  metadata: {
    name?: string;
    labels?: Record<string, string>;
  };
}
```

Rationale for the structural-subset shape: K8s `corev1.NodeList` carries dozens of fields (`status`, `spec`, `kind`, `apiVersion`, etc.). The adapter consumes only `.items[].metadata.name` and `.items[].metadata.labels`; modeling the whole API is anti-scope (A8 — out-of-band integration). The structural-subset TypeScript interface is exported so callers (tests + future ingestion-path code) construct fixtures without needing the full corev1 types package.

**Output** — `TopologySnapshot` per `engine/types/verdict.ts:260-269` (vendored-at-pin; not modified).

### § 1.2. Well-known K8s topology labels consumed

| Label key | Semantic | Mapping |
|---|---|---|
| `topology.kubernetes.io/zone` | K8s availability zone | → `TopologyNode` with `kind: 'cooling_zone'`; one per distinct zone value |
| `topology.kubernetes.io/region` | K8s region | → `metadata.region` on the host node (NOT a separate TopologyNode) |
| `node.kubernetes.io/instance-type` | EC2 / GCP / Azure machine type | → `metadata.instance_type` on the host node |
| `nvidia.com/gpu.count` | GPU count on the host | → load-bearing: produces N `gpu_shard` nodes per host |
| `nvidia.com/gpu.product` | NVIDIA GPU product string | → `metadata.gpu_product` on each `gpu_shard` node |
| `metadata.name` | K8s node name (the host) | → `TopologyNode` with `kind: 'rack'`; id = `host:<name>` |

All other labels are silently ignored. The adapter never throws on unrecognized labels.

### § 1.3. Why these existing `kind` literals (A1 mapping; avoids halt condition #2)

The vendored `engine/types/verdict.ts:245` `TopologyNode.kind` union is the inherited at-pin literal set `'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`. The K8s adapter cannot introduce new literals without triggering PRD halt condition #2 (vendored-with-deltas pattern UPFRONT) — a high-blast-radius modification that would also need cross-cluster coordination because WU-01 SLURM and WU-03 NVLINK run in parallel and could disagree on naming.

Mapping decisions and trade-offs:

- **K8s zone → `'cooling_zone'`.** K8s availability zones are typically aligned with thermal / power domains within a datacenter; `cooling_zone` is the closest pre-existing literal. The semantic stretch is small: both refer to a physical correlation zone for fault attribution. Documented limitation: a future Tessera reader querying "K8s topology" by `kind` must know that K8s zones surface as `cooling_zone`. This is acceptable for Phase 2; if Tessera ever needs distinct K8s-vs-cooling semantics, that's a Phase 3 vendored-with-deltas decision.
- **K8s host (node) → `'rack'`.** A K8s node is a single physical host (typically) containing N GPUs. The `'rack'` literal already denotes "a containment unit for GPUs" in the inherited topology model (v9Y substrate uses `kind: 'rack'` for host-grouping; see `test/_substrate/v9Y-multi-rack-cluster.ts`). One-host-per-rack is a defensible specialization; a multi-host rack would need a separate literal but is out of scope here.
- **GPU → `'gpu_shard'`.** Exact match. `gpu_shard` is the inherited literal for per-GPU TopologyNodes.
- **Region → metadata only.** K8s regions are higher-level than zones; the PRD does NOT require BFS-walkable region structure (common-mode attribution at WU-04 R26 walks rack / PSU / cooling-zone level, not region). Carrying region as metadata on host nodes preserves the information for non-BFS queries without expanding the kind union.
- **Instance-type + gpu_product → metadata only.** Both are descriptive strings, not topology-graph entities. Native metadata fields on host / gpu_shard nodes carry them.

### § 1.4. Containment hierarchy and edges

The adapter emits two edge relationships, both using existing `TopologyEdge.relationship` literals (`'contains'` from the inherited union at `engine/types/verdict.ts:255`):

- **zone → host:** for each host with a `topology.kubernetes.io/zone` label, emit `{ from: 'zone:<value>', to: 'host:<name>', relationship: 'contains' }`.
- **host → gpu_shard:** for each gpu_shard node attached to a host, emit `{ from: 'host:<name>', to: 'gpu:<name>:<index>', relationship: 'contains' }`.

No region edges (region is metadata only).
No inter-host edges (no NVLink peering inferred at the K8s layer — that's WU-03's scope).
No inter-zone edges (zones are top-level).

### § 1.5. Deterministic id formats

- **Host node:** `id = 'host:<metadata.name>'`; `service_name = metadata.name`; `kind = 'rack'`.
- **Zone node:** `id = 'zone:<topology.kubernetes.io/zone value>'`; `service_name = <zone value>`; `kind = 'cooling_zone'`. One zone node per distinct zone value across all hosts (deduplicated).
- **GPU-shard node:** `id = 'gpu:<host-name>:<zero-based-index>'` for `index ∈ [0, count-1]`; `service_name = '<host-name>/gpu-<index>'`; `kind = 'gpu_shard'`. The id is deterministic given (host-name, count): index 0 through count-1 in lex-ascending order.

ID-format rationale: prefixing by kind (`host:`, `zone:`, `gpu:`) keeps id-namespaces disjoint, preventing accidental id collisions if a K8s zone value coincidentally matches a host name. `computeSnapshotHash` sorts nodes lex-asc by id; the prefix scheme produces a stable lex ordering by kind (gpu < host < zone, alphabetically) that is hash-input-deterministic.

### § 1.6. Metadata population rules

- **Host node `metadata`:**
  - `instance_type`: set if `node.kubernetes.io/instance-type` is present and non-empty.
  - `region`: set if `topology.kubernetes.io/region` is present and non-empty.
  - Field is OMITTED (not set to empty string or undefined) when label is absent.
- **Zone node `metadata`:** empty `{}` (no fields populated). Zones are pure containment grouping; they do not carry region (region is host-level).
- **GPU-shard node `metadata`:**
  - `host`: set to the source host name (cross-reference for traceability).
  - `gpu_product`: set if `nvidia.com/gpu.product` is present and non-empty.

### § 1.7. GPU-shard inference rule (conservative)

`nvidia.com/gpu.count` is the **single load-bearing** label for GPU-shard inference:

- Parse via `parseInt(value, 10)`.
- If parse yields integer `count >= 1`: emit `count` gpu_shard nodes (indices 0..count-1) and `count` host→gpu_shard containment edges.
- If parse yields `NaN`, `count <= 0`, or label absent: emit ZERO gpu_shard nodes for that host; gracefully proceed. The host node is still emitted regardless.

`nvidia.com/gpu.product` is purely metadata; its presence/absence does NOT affect shard inference. If `gpu.product` is present without `gpu.count`, no gpu_shard nodes are emitted and the product label is dropped (no GPU exists to attach it to).

Rationale: this is the conservative inference rule the PRD asks the Architect to pick. Count is the ground truth for "how many GPUs exist"; product is descriptive only.

### § 1.8. Sparse-label graceful degradation

Per the four PRD-mandated sparse cases:

- **Full-label fixture** (`k8s-nodelist-fixture-full.json`): all labels present → full snapshot with zones + hosts + gpu_shards + containment edges + all metadata fields.
- **Sparse no-region** (`k8s-nodelist-fixture-sparse-no-region.json`): hosts have zone but no region → snapshot includes zones + hosts + gpu_shards + edges; host nodes have NO `region` metadata field; no error thrown.
- **Sparse no-GPU** (`k8s-nodelist-fixture-sparse-no-gpu.json`): hosts have no `nvidia.com/*` labels → snapshot includes zones + hosts + ZERO gpu_shard nodes + ZERO host→gpu containment edges; host nodes still present with `instance_type` metadata; no error thrown.
- **Empty fixture** (`k8s-nodelist-fixture-empty.json`): `{ items: [] }` → snapshot has `nodes: []`, `edges: []`, valid `fetched_at_ts`, `source_id`, `source_version`; no error thrown.

A host whose `metadata.name` is missing or empty is silently skipped (no host node emitted; nor any gpu_shards). Such records have no usable id and would corrupt id determinism.
A host with a zone label but no labels at all (i.e., `labels: undefined`): treated as "no zone, no GPUs"; emit the host node only if `metadata.name` is present.

### § 1.9. TopologySource interface implementation

Class name: **`K8sNodeLabelSource`** (matches handoff naming convention; parallel-class with `HardwareTopologySource` from R23).

```typescript
class K8sNodeLabelSource implements TopologySource {
  readonly id: string;            // default 'k8s_node_label_source'
  readonly version: string;       // default 'k8s-1'
  // Constructor parses NodeList into TopologySnapshot once, at construction time.
  // fetchSnapshot returns the same parsed snapshot reference on every call.
  // snapshotHash delegates to computeSnapshotHash (shared determinism per Addition #26 D6).
}
```

The "parse-at-construction, return-pre-parsed-on-every-fetch" pattern mirrors `HardwareTopologySource` (R23) and `StaticTopologySource` (vendored). It makes `fetchSnapshot` synchronous in effect (the Promise resolves immediately to a stable reference) and ensures `snapshotHash` is deterministic across calls without internal caching machinery.

### § 1.10. `fetched_at_ts` injection

Constructor accepts optional `opts.now?: () => number` for deterministic-test injection. Default: `() => Math.floor(Date.now() / 1000)`. Called ONCE at construction; the value populates `TopologySnapshot.fetched_at_ts` and is not refreshed on subsequent `fetchSnapshot` calls (consistent with the parse-once pattern). Tests inject a fixed `now: () => 1700000000` to make snapshots byte-identical across runs.

### § 1.11. Determinism guarantees

Given identical inputs `(nodeList, opts)`:
- `fetchSnapshot()` returns the same TopologySnapshot reference on every call.
- `snapshotHash(snapshot)` returns the same sha256 string regardless of input array order in `nodeList.items[]` (because `computeSnapshotHash` sorts nodes by id and edges by `(from, to, relationship)` before hashing).
- Two independently-constructed `K8sNodeLabelSource` instances over the same NodeList JSON produce snapshots with the same `computeSnapshotHash` value (provided `now` injection is consistent or `fetched_at_ts` is not hash-input — it is not; see `engine/topology-overlay.ts:69-78`).

---

## § 2. Component inventory

### § 2.1. Exists (read-only consumers; NOT modified)

| Path | Why this round reads it | Modification status |
|---|---|---|
| `engine/topology-overlay.ts` | Imports `TopologySource` interface (lines 50-55), `FetchContext` (57-60), `computeSnapshotHash` (69-78). | READ-ONLY. A12 anti-scope. |
| `engine/types/verdict.ts` | Imports `TopologyNode`, `TopologyEdge`, `TopologySnapshot` (lines 240-269); `TopologyNode.kind` union at :245; `TopologyEdge.relationship` union at :255. | READ-ONLY. Vendored-at-pin frozen this round (avoids halt #2). |
| `engine/hardware-topology-source.ts` | Parallel-class reference for class shape + `id` / `version` opt pattern. NOT imported at runtime; only referenced for design symmetry. | READ-ONLY. R23 frozen. |
| `engine/l0/counter-rate-transform.ts` | NOT imported (K8s NodeList JSON is metadata, not counter telemetry; per CLUSTER-HANDOFF-1-WU00-WU02 §Dependency edge: interface-only). | READ-ONLY. Wave-1 frozen. |

### § 2.2. Created (new this round)

| Path | Author | Description |
|---|---|---|
| `engine/topology/k8s-source.ts` | Implementer | The K8s NodeList adapter module. Exports `K8sNodeLabelSource` class + `K8sNodeList` / `K8sNode` input type interfaces. |
| `test/q29-k8s-adapter.test.ts` | Implementer | Runtime tests binding AC-R29-1..12; chore-B appends AC-R29-13 forward-protection. |
| `test/_substrate/k8s-nodelist-fixture-full.json` | Implementer | Full-label NodeList fixture (all 5 well-known labels present on every host). |
| `test/_substrate/k8s-nodelist-fixture-sparse-no-region.json` | Implementer | Hosts with zone but no region. |
| `test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json` | Implementer | Hosts with no `nvidia.com/*` labels. |
| `test/_substrate/k8s-nodelist-fixture-empty.json` | Implementer | `{ "items": [] }`. |
| `coordination/specs/Q-R29-SPEC.md` | Architect (this file) | This spec. |
| `coordination/specs/Q-R29-SPEC-AUDIT.md` | Architect | Audit-trail sidecar (P3 verification + pre-route discipline applications + pre-prediction). |

### § 2.3. Changed (existing files modified)

| Path | Why modified | Modification surface |
|---|---|---|
| `coordination/NEXT-ROLE.md` | Architect routing update at end of Architect role; Implementer attestation at end of Implementer role. | Per existing convention. |
| `coordination/MEMORIAL.md` | Each role appends its own CONFIRMATION/VIOLATION section. | Append-only. |

### § 2.4. Deleted

None.

### § 2.5. Allowed-set (chore-A and beyond)

The exact path-set the post-chore-A diff (`git diff <CHORE-A-SHA>..HEAD --name-only`) may contain. Used by AC-R29-13 forward-protection runtime test:

1. `coordination/specs/Q-R29-SPEC.md`
2. `coordination/specs/Q-R29-SPEC-AUDIT.md`
3. `coordination/NEXT-ROLE.md`
4. `coordination/MEMORIAL.md`
5. `engine/topology/k8s-source.ts`
6. `test/q29-k8s-adapter.test.ts`
7. `test/_substrate/k8s-nodelist-fixture-full.json`
8. `test/_substrate/k8s-nodelist-fixture-sparse-no-region.json`
9. `test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json`
10. `test/_substrate/k8s-nodelist-fixture-empty.json`

**Conditional 11th entry — DIAGNOSTIC files on halt-fire:** if any halt condition fires before chore-A, the corresponding DIAGNOSTIC file at `coordination/diagnostics/DIAGNOSTIC-R29-<topic>.md` is committed at HALT and IS in the round-start-to-chore-A diff range (per R25 MAJOR-2 reinforcement; CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18). AC-R29-13's allowed-set check MUST therefore accept any path matching the regex `^coordination/diagnostics/DIAGNOSTIC-R29-.+\.md$` in addition to the 10 literal entries above. This avoids the R25 MAJOR-2 trap (allowed-set silently widened post-hoc when DIAGNOSTIC file lands).

**`.gitignore` audit (R23 MINOR-2 reinforcement; verified via `git check-ignore` at spec-emit):** all 10 literal entries are git-trackable (zero phantom entries). The `.gitignore` rules `*.js`, `*.js.map`, `*.tsbuildinfo` exclude only compiled artifacts; none match any allowed-set entry. Spec § 9.7 row 8 records the verification command output.

### § 2.6. Architect commit sequence (R21 ARCH MINOR-1 reinforcement)

The Architect commits this spec + the audit sidecar in a **separate commit BEFORE writing the NEXT-ROLE.md routing block**. Sequence:

- **Architect-commit-A** (this spec + audit sidecar): `coordination/specs/Q-R29-SPEC.md` + `coordination/specs/Q-R29-SPEC-AUDIT.md`.
- **Architect-commit-B** (routing + ceremony): `coordination/NEXT-ROLE.md` (routing block) + `coordination/MEMORIAL.md` (Architect ceremony append).

Both Architect commits land BEFORE chore-A. The chore-A SHA is the Implementer's GREEN commit.

### § 2.7. Implementer commit sequence (R23 TDD reinforcement)

Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 (R23 separate-RED-commit rule):

- **RED commit:** `test/q29-k8s-adapter.test.ts` (stub bodies for AC-R29-1..12 with `assert.fail` or imports from non-existent module); 4 fixture JSON files NOT yet created OR created as empty `{}` stubs. Production file `engine/topology/k8s-source.ts` NOT yet created. The RED commit must produce: `tests ≥ 243 + 12` (the 12 new tests added) with `fail ≥ 12 + 2` (12 new failures + 2 pre-existing environmental failures: q01 AC-7 + AC-R26-16).
- **GREEN commit (= chore-A):** Full `engine/topology/k8s-source.ts` + complete bodies in `test/q29-k8s-adapter.test.ts` for AC-R29-1..12 + 4 substrate fixture JSON files + ceremony updates to `coordination/NEXT-ROLE.md` + `coordination/MEMORIAL.md`. All 12 new tests pass; pre-existing 2 env failures unchanged. Chore-A SHA = this commit.
- **chore-B commit:** append AC-R29-13 forward-protection runtime test to `test/q29-k8s-adapter.test.ts` with the literal `CHORE_A_SHA = '<actual chore-A SHA>'` substituted; references the 10-entry ALLOWED_SET + DIAGNOSTIC regex.

The Implementer empirically substitutes the actual chore-A SHA into the chore-B test literal. Spec text uses the placeholder `<CHORE-A-SHA>` everywhere; AC-R29-12 (test count) + AC-R29-13 (anti-scope diff) both reference this placeholder.

---

## § 3. Per-file pseudocode

### § 3.1. `engine/topology/k8s-source.ts`

```
// engine/topology/k8s-source.ts — Tessera Phase 2 SLICE 3.B (R29).
//
// K8sNodeLabelSource — concrete impl of the inherited Addition #26
// TopologySource interface (engine/topology-overlay.ts:50-55) for K8s
// node-label metadata. Consumes a `corev1.NodeList`-structurally-subset
// JSON object (just .items[].metadata.{name,labels}) and produces a
// TopologySnapshot with three node kinds (cooling_zone for K8s zones,
// rack for K8s hosts, gpu_shard for inferred GPUs) plus 'contains'
// containment edges between them.
//
// Why existing kind literals (no vendored-with-deltas this round):
//   K8s zone → 'cooling_zone' (semantic stretch — K8s availability zones
//     correlate with thermal/power domains; closest pre-existing literal).
//   K8s host → 'rack' (single host as containment unit for its GPUs;
//     symmetric with v9Y multi-rack-cluster substrate convention).
//   GPU → 'gpu_shard' (exact match).
//   Region → metadata-only on host node (not BFS-walkable structure;
//     reflects R29 PRD scope which does not require region-level BFS).
//
// snapshotHash() delegates to inherited computeSnapshotHash; every
// TopologySource impl shares identical hash semantics per Addition #26 D6.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyEdge, TopologyNode, TopologySnapshot } from './../types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from './../topology-overlay';

// Structural-subset input shape — only the fields this adapter reads from
// upstream K8s corev1.NodeList JSON. Importing the full corev1 types is
// out-of-scope (A8). Exported so callers + tests can type-check fixtures.
export interface K8sNodeList { items: K8sNode[]; }
export interface K8sNode {
  metadata: {
    name?: string;
    labels?: Record<string, string>;
  };
}

// Well-known label keys (exported as constants for readability + test reuse).
export const LABEL_ZONE = 'topology.kubernetes.io/zone';
export const LABEL_REGION = 'topology.kubernetes.io/region';
export const LABEL_INSTANCE_TYPE = 'node.kubernetes.io/instance-type';
export const LABEL_GPU_COUNT = 'nvidia.com/gpu.count';
export const LABEL_GPU_PRODUCT = 'nvidia.com/gpu.product';

export interface K8sNodeLabelSourceOpts {
  id?: string;
  version?: string;
  now?: () => number;
}

export class K8sNodeLabelSource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(nodeList: K8sNodeList, opts: K8sNodeLabelSourceOpts = {}) {
    this.id = opts.id ?? 'k8s_node_label_source';
    this.version = opts.version ?? 'k8s-1';
    const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
    this.snapshot = parseNodeListToSnapshot(nodeList, this.id, this.version, now());
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}

// Pure parsing helper. Exported for unit-test surface independent of class.
export function parseNodeListToSnapshot(
  nodeList: K8sNodeList,
  source_id: string,
  source_version: string,
  fetched_at_ts: number,
): TopologySnapshot {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const zoneNodesByZone = new Map<string, true>();  // dedup tracker (not stored on node)

  for (const item of nodeList.items) {
    const name = item.metadata.name;
    if (typeof name !== 'string' || name.length === 0) continue;  // skip nameless hosts

    const labels = item.metadata.labels ?? {};
    const hostId = `host:${name}`;

    // Host node — always emitted when name is present.
    const hostMeta: Record<string, string> = {};
    const instType = labels[LABEL_INSTANCE_TYPE];
    if (typeof instType === 'string' && instType.length > 0) hostMeta.instance_type = instType;
    const region = labels[LABEL_REGION];
    if (typeof region === 'string' && region.length > 0) hostMeta.region = region;
    nodes.push({
      id: hostId,
      service_name: name,
      kind: 'rack',
      metadata: hostMeta,
    });

    // Zone node + zone→host edge (if zone label present).
    const zoneVal = labels[LABEL_ZONE];
    if (typeof zoneVal === 'string' && zoneVal.length > 0) {
      const zoneId = `zone:${zoneVal}`;
      if (!zoneNodesByZone.has(zoneVal)) {
        zoneNodesByZone.set(zoneVal, true);
        nodes.push({
          id: zoneId,
          service_name: zoneVal,
          kind: 'cooling_zone',
          metadata: {},
        });
      }
      edges.push({ from: zoneId, to: hostId, relationship: 'contains' });
    }

    // GPU shards — gated by gpu.count parse.
    const countRaw = labels[LABEL_GPU_COUNT];
    if (typeof countRaw === 'string') {
      const count = parseInt(countRaw, 10);
      if (Number.isInteger(count) && count >= 1) {
        const productRaw = labels[LABEL_GPU_PRODUCT];
        const product = typeof productRaw === 'string' && productRaw.length > 0 ? productRaw : undefined;
        for (let i = 0; i < count; i++) {
          const gpuId = `gpu:${name}:${i}`;
          const gpuMeta: Record<string, string> = { host: name };
          if (product !== undefined) gpuMeta.gpu_product = product;
          nodes.push({
            id: gpuId,
            service_name: `${name}/gpu-${i}`,
            kind: 'gpu_shard',
            metadata: gpuMeta,
          });
          edges.push({ from: hostId, to: gpuId, relationship: 'contains' });
        }
      }
    }
  }

  return {
    nodes,
    edges,
    fetched_at_ts,
    source_id,
    source_version,
  };
}
```

**Why this exact algorithm:**

- The iteration is **single-pass over items[]** for clarity and to keep the parsing deterministic in input order.
- Zone deduplication via a `Map<string, true>` (not a Set, to mirror existing engine code style; either works) emits a single zone node per distinct zone value even if N hosts share it.
- `parseInt` (not `Number` or `+countRaw`) is the conservative integer parser — handles leading whitespace, ignores trailing non-digits gracefully, returns NaN cleanly for malformed input. `Number.isInteger(count) && count >= 1` is the gate for shard emission (rejects NaN, 0, negative, fractional).
- The `parseNodeListToSnapshot` helper is exported so AC-R29-9 (interface conformance) can test the class while substrate ACs can call the helper directly without instantiating the class — keeps test surface decoupled.
- Importing both types and the helper from explicit relative paths (`./../types/verdict`, `./../topology-overlay`) is one valid form; the Implementer may use `../types/verdict` (no leading `./..`) — equivalent. Choose whichever the project's existing style favors (look at `engine/topology/common-mode-attribution.ts:1-10` for the established convention).

### § 3.2. `test/q29-k8s-adapter.test.ts` — algorithmic prescription only

The Implementer authors test() blocks 1:1 with AC-R29-1 through AC-R29-12 in chore-A; chore-B appends AC-R29-13. The Implementer chooses test() titles, assertion library calls, and fixture-loading helper structure.

Per-AC test prescriptions:

- **AC-R29-1 / Empty:** Load `k8s-nodelist-fixture-empty.json`; construct `new K8sNodeLabelSource(fixture, { now: () => 1700000000 })`; await `fetchSnapshot()`; assert `nodes.length === 0`, `edges.length === 0`, `fetched_at_ts === 1700000000`, `source_id === 'k8s_node_label_source'`, `source_version === 'k8s-1'`.

- **AC-R29-2 / Full-label parse:** Load `k8s-nodelist-fixture-full.json`. Architect prescribes the fixture must contain at least: 4 hosts (named `host-01`..`host-04`), distributed across 2 zones (`zone-A` carries hosts 1+2; `zone-B` carries hosts 3+4), all 4 hosts in region `region-X`, all 4 hosts with `instance-type=p4d.24xlarge`, all 4 hosts with `gpu.count=8` + `gpu.product=A100-SXM4-40GB`. Expected counts: hosts=4 + zones=2 + gpu_shards=32 = 38 nodes total; zone→host edges=4 + host→gpu_shard edges=32 = 36 edges total. Test asserts each count by `kind` and `relationship` via filter + length.

- **AC-R29-3 / Zone containment edges:** Using the full-label fixture, assert exactly 4 edges with `relationship === 'contains'` and `from.startsWith('zone:')`. Assert each such edge's `(from, to)` matches the expected zone→host mapping `[(zone:zone-A, host:host-01), (zone:zone-A, host:host-02), (zone:zone-B, host:host-03), (zone:zone-B, host:host-04)]`.

- **AC-R29-4 / GPU-shard inference from gpu.count:** Using the full-label fixture, assert exactly 32 nodes with `kind === 'gpu_shard'`. Assert each gpu_shard id matches the pattern `gpu:host-<NN>:<INDEX>` for `NN ∈ {01,02,03,04}` and `INDEX ∈ {0..7}`. Negation: removing the `count >= 1` gate in production would emit 0 shards if count parses correctly but fails the gate, so the count-32 assertion is bound to the gate.

- **AC-R29-5 / Host→gpu_shard containment edges:** Assert exactly 32 edges with `relationship === 'contains'` and `from.startsWith('host:')`. Assert each `(from, to)` pair matches `(host:host-NN, gpu:host-NN:INDEX)` for the expected (NN, INDEX) combinations.

- **AC-R29-6 / Metadata preservation:** Using the full-label fixture: each host node has `metadata.instance_type === 'p4d.24xlarge'` AND `metadata.region === 'region-X'`. Each gpu_shard node has `metadata.gpu_product === 'A100-SXM4-40GB'` AND `metadata.host` set to the source host name. Each zone node has `metadata` equal to `{}` (empty object, not undefined).

- **AC-R29-7 / Sparse no-region:** Load `k8s-nodelist-fixture-sparse-no-region.json` (Architect prescribes: 2 hosts in `zone-A`, no region label on either, no GPU labels). Expected: 2 host nodes (rack) + 1 zone node (cooling_zone) + 0 gpu_shard nodes; 2 zone→host edges + 0 host→gpu edges. Assert no host node has a `metadata.region` field. Assert no error thrown during construction.

- **AC-R29-8 / Sparse no-GPU:** Load `k8s-nodelist-fixture-sparse-no-gpu.json` (Architect prescribes: 2 hosts in `zone-A`, region `region-Y`, instance-type `m5.large`, no nvidia labels). Expected: 2 host nodes + 1 zone node + 0 gpu_shard nodes; 2 zone→host edges + 0 host→gpu edges. Host nodes carry `metadata.region` and `metadata.instance_type`. No error thrown.

- **AC-R29-9 / TopologySource interface conformance + delegation + determinism:** Construct `K8sNodeLabelSource(fixture-full, { now: () => 1700000000 })`. Assert: `typeof src.id === 'string' && src.id.length > 0`; `typeof src.version === 'string' && src.version.length > 0`; `await src.fetchSnapshot()` returns the same reference twice (`Object.is(a, b) === true`); `src.snapshotHash(snap) === computeSnapshotHash(snap)` (import `computeSnapshotHash` from topology-overlay and compare); two distinct instances constructed with identical inputs produce identical `snapshotHash` strings.

- **AC-R29-10 / A16 preservation (static check):** Use `fs.readFileSync(require.resolve('../engine/topology/k8s-source.ts'))` (or analogous path resolution) to load `engine/topology/k8s-source.ts` as a string; assert it contains exactly zero occurrences of the substring `correlational_not_causal`. This binds the architectural invariant that the K8s adapter operates UPSTREAM of the A16 wire-format boundary (`correlational_not_causal: true` is emitted by `engine/topology-overlay.ts:312` and `engine/topology/common-mode-attribution.ts`, not by upstream snapshot producers).

- **AC-R29-11 / typecheck binding-command:** Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 (R26 false-compliance-attestation reinforcement; threshold-derived rule), the AC literal text encodes the **actual** environment outcome at this cluster worktree, NOT a re-framed "exit 0" claim. Empirical at session start: `npx tsc -p tsconfig.test.json` exits with code 2; emits exactly two diagnostics: TS2688 (`@types/node` missing) and TS5107 (`moduleResolution=node10` deprecation). Both pre-existing infra issues (verified by stashing R29 source and re-running at round-start SHA `e714703` — same exit + same diagnostics).
  - AC text: "Given chore-A SHA <CHORE-A-SHA>, when running `npx tsc -p tsconfig.test.json` at that SHA, then the command exits with code 2 AND the emitted diagnostic set is exactly `{TS2688, TS5107}` (set equality; no R29-introduced diagnostic codes)."
  - Implemented as a chore-A runtime test using `execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json'], { encoding: 'utf8' })` wrapped in try/catch (non-zero exit throws). Parse the captured stdout/stderr; extract all `error TS\d+:` codes via regex; assert `Set(codes) === Set(['TS2688', 'TS5107'])`; assert the thrown error's `.status === 2`. If the Implementer observes a different exit code OR additional diagnostic codes at chore-A SHA, HALT per § 7.1 scenario (a) — do NOT re-frame as compliance.

- **AC-R29-12 / node --test count binding-command (anchored to chore-A SHA per R22 IMPL MINOR-1):** Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 (R25 MINOR-1 derived rule), empirically measured baseline at session start (pre-R29, at round-start SHA `e714703`): `node --test --test-reporter=tap test/*.test.js` yields exactly `tests=243`, `pass=241`, `fail=2`, `skipped=0`. The 2 failures are pre-existing environmental: (a) `q01-no-at-pin-deltas` AC-7 (ENOENT for missing `../deploysignal` sibling — cluster worktree gap acknowledged by CLUSTER-HANDOFF-1-WU00-WU02.md Pre-flags); (b) R26 AC-R26-16 forward-protection (catches post-R26-chore-A modification of `CLAUDE-ARCHITECT.md` by post-Wave-1 Memorial-Updater accretion — pre-existing across the cluster's checkout of main HEAD `3308681`).
  - **AC literal text:** "Given chore-A SHA <CHORE-A-SHA>, when running `node --test --test-reporter=tap` via `execFileSync` AT chore-A SHA on the file set `test/*.test.js` MINUS `test/q29-k8s-adapter.test.js` (i.e., the pre-R29 test files only), then the TAP summary reports exactly `tests=243`, `pass=241`, `fail=2`. The 2 failures are the pre-existing environmental failures named above; no R29-introduced failure."
  - **Why the filtered subset and not the full suite:** AC-R29-12's own test() block is one of the 12 new tests added in chore-A. If the AC asserted full-suite totals (e.g., `tests=255`), the test would be self-referential — running `node --test` on the full suite from inside `node --test` would be infinite recursion. By filtering out `q29-k8s-adapter.test.js`, the subprocess runs only on pre-R29 files; the pre-R29 test surface is invariant across this round (no pre-R29 test modified per § 5 anti-scope; no q29-file failure can affect this subset). This binds the property "no pre-R29 test modifications + no new failures introduced into pre-R29 surface" and avoids the count-AC self-reference paradox.
  - **Implementation prescription:** Use `execFileSync('node', ['--test', '--test-reporter=tap', ...preR29Files], { encoding: 'utf8' })` wrapped in try/catch (the subprocess exits non-zero due to the 2 environmental failures; `execFileSync` throws on non-zero exit, and the test captures stdout from the thrown error's `.stdout` property). Build `preR29Files` from a directory read of `test/` (e.g., `readdirSync('test').filter(f => f.endsWith('.test.js') && f !== 'q29-k8s-adapter.test.js').map(f => 'test/' + f)`). Parse the TAP summary lines (`# tests N`, `# pass N`, `# fail N`) via regex. Assert: `tests === 243`, `pass === 241`, `fail === 2`. If observed counts differ, HALT per § 7.1 scenario (b); do NOT silently amend the literal.
  - **Predicted full-suite count at chore-A (for Reviewer cross-reference, NOT bound by this AC):** `tests = 243 + 12 = 255`, `pass = 241 + 12 = 253`, `fail = 2` — the 12 new tests are AC-R29-1..12 each contributing one test() block; AC-R29-13 lands in chore-B and is not counted at chore-A. This prediction is recorded in `Q-R29-SPEC-AUDIT.md § 6` for Reviewer prediction-vs-actual; AC-R29-12's binding test asserts only the filtered-subset invariant 243/241/2.

- **AC-R29-13 / Anti-scope forward-protection (chore-B):** Per R20 / R21 / R22 / R23 / R25 / R26 precedent. Added in chore-B with the literal `CHORE_A_SHA` substituted to the actual chore-A commit SHA. The test:
  - Runs `execFileSync('git', ['diff', `${CHORE_A_SHA}..HEAD`, '--name-only'], { encoding: 'utf8' })` (NOT `execSync` shell-string form — per R26 MINOR-1 reinforcement).
  - Parses the diff into a path list (split by `\n`, filter empty).
  - Asserts each path is either (a) a literal member of the 10-entry `ALLOWED_SET` or (b) matches the regex `^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$` (conditional DIAGNOSTIC carve-out per § 2.5 + R25 MAJOR-2 reinforcement).
  - Asserts ZERO violations.

### § 3.3. Substrate fixture JSON files

Architect prescribes minimum content per fixture. Implementer may add fields not specified (e.g., empty `status: {}` for K8s parity) so long as the prescribed labels are present.

**`test/_substrate/k8s-nodelist-fixture-full.json`:** 4 items (named `host-01`..`host-04`); each item's `metadata.labels` contains exactly:
- `topology.kubernetes.io/zone`: `zone-A` for hosts 1+2; `zone-B` for hosts 3+4
- `topology.kubernetes.io/region`: `region-X` for all 4
- `node.kubernetes.io/instance-type`: `p4d.24xlarge` for all 4
- `nvidia.com/gpu.count`: `8` for all 4
- `nvidia.com/gpu.product`: `A100-SXM4-40GB` for all 4

**`test/_substrate/k8s-nodelist-fixture-sparse-no-region.json`:** 2 items (`host-01`, `host-02`); each label set contains exactly `topology.kubernetes.io/zone`: `zone-A`. No region, no instance-type, no nvidia.* labels.

**`test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json`:** 2 items (`host-01`, `host-02`); each label set contains: `topology.kubernetes.io/zone`: `zone-A`; `topology.kubernetes.io/region`: `region-Y`; `node.kubernetes.io/instance-type`: `m5.large`. NO `nvidia.com/*` labels.

**`test/_substrate/k8s-nodelist-fixture-empty.json`:** Exact content `{"items":[]}` (or formatted equivalent).

---

## § 4. Acceptance criteria

### § 4.1. AC-table preamble (R20 ARCH MINOR-1 cross-check)

AC classification by attestation type:

- **AC-R29-1 through AC-R29-10:** chore-A runtime tests (committed in `test/q29-k8s-adapter.test.ts` at chore-A SHA; each is one `test(` declaration block).
- **AC-R29-11 and AC-R29-12:** chore-A runtime tests, each an `execFileSync`-based binding-command runtime test inside `test/q29-k8s-adapter.test.ts`.
- **AC-R29-13:** chore-B runtime test appended to `test/q29-k8s-adapter.test.ts` with literal `CHORE_A_SHA` substituted after the chore-A commit lands.

Total AC count: **13**. PRD target was 10-14. Within range. Each AC binds at least one failure mode from § 1; each failure mode in § 1 has at least one AC (see § 8.4 branch-binding-coverage table).

### § 4.2. AC table

| AC | Given | When | Then | Binds (§ 1 ref) |
|---|---|---|---|---|
| AC-R29-1 | The K8s empty-NodeList fixture `{"items":[]}` | `K8sNodeLabelSource(fixture, { now: () => 1700000000 })` is constructed; `fetchSnapshot()` is awaited | The returned snapshot has `nodes.length === 0`, `edges.length === 0`, `fetched_at_ts === 1700000000`, `source_id === 'k8s_node_label_source'`, `source_version === 'k8s-1'` | § 1.1, § 1.8 (empty case) |
| AC-R29-2 | The full-label fixture (4 hosts in 2 zones in 1 region, all GPU-labelled) | Constructed + fetched | The snapshot contains exactly: 4 nodes with `kind === 'rack'`, 2 nodes with `kind === 'cooling_zone'`, 32 nodes with `kind === 'gpu_shard'` (38 nodes total); 4 edges with `from.startsWith('zone:')` AND `relationship === 'contains'`, 32 edges with `from.startsWith('host:')` AND `relationship === 'contains'` (36 edges total) | § 1.2, § 1.4, § 1.5 |
| AC-R29-3 | The full-label fixture | Constructed + fetched | The 4 zone→host edges are exactly: `(zone:zone-A, host:host-01)`, `(zone:zone-A, host:host-02)`, `(zone:zone-B, host:host-03)`, `(zone:zone-B, host:host-04)` — each as `{from, to, relationship: 'contains'}` | § 1.4 |
| AC-R29-4 | The full-label fixture (all hosts have `nvidia.com/gpu.count: '8'`) | Constructed + fetched | Exactly 32 gpu_shard nodes; for each `NN ∈ {01,02,03,04}` and `INDEX ∈ {0..7}`, exactly one node with `id === 'gpu:host-NN:INDEX'` and `kind === 'gpu_shard'` exists | § 1.7 |
| AC-R29-5 | The full-label fixture | Constructed + fetched | The 32 host→gpu_shard edges are exactly the 32 `(host:host-NN, gpu:host-NN:INDEX)` pairs for `NN ∈ {01,02,03,04}` and `INDEX ∈ {0..7}`, each as `{from, to, relationship: 'contains'}` | § 1.4 |
| AC-R29-6 | The full-label fixture | Constructed + fetched | Every host node has `metadata.instance_type === 'p4d.24xlarge'` AND `metadata.region === 'region-X'`; every gpu_shard node has `metadata.gpu_product === 'A100-SXM4-40GB'` AND `metadata.host` equal to the source host name; every zone node has `metadata` deep-equal `{}` | § 1.6 |
| AC-R29-7 | The sparse-no-region fixture (2 hosts in `zone-A`, no region label, no GPU labels) | Constructed + fetched | The snapshot contains exactly 2 rack nodes + 1 cooling_zone node + 0 gpu_shard nodes; 2 zone→host edges + 0 host→gpu edges; no host node has a `metadata.region` field set; no error thrown during construction | § 1.8 (sparse no-region) |
| AC-R29-8 | The sparse-no-gpu fixture (2 hosts in `zone-A`, region `region-Y`, instance-type `m5.large`, no nvidia labels) | Constructed + fetched | The snapshot contains exactly 2 rack nodes + 1 cooling_zone node + 0 gpu_shard nodes; 2 zone→host edges + 0 host→gpu edges; each host node has `metadata.region === 'region-Y'` AND `metadata.instance_type === 'm5.large'`; no error thrown | § 1.8 (sparse no-GPU) |
| AC-R29-9 | A `K8sNodeLabelSource` instance constructed with the full-label fixture and `now: () => 1700000000` | The TopologySource interface is exercised | `typeof src.id === 'string' && src.id.length > 0`; `typeof src.version === 'string' && src.version.length > 0`; two `await src.fetchSnapshot()` calls return the same reference (`Object.is(a, b) === true`); `src.snapshotHash(snap)` equals `computeSnapshotHash(snap)` imported from `engine/topology-overlay`; two independently-constructed instances with identical inputs produce identical `snapshotHash` strings | § 1.9, § 1.11 |
| AC-R29-10 | The source file `engine/topology/k8s-source.ts` read as raw text | The text is searched | The text contains exactly zero occurrences of the substring `correlational_not_causal` | § 1 (A16 preservation — wire-format invariant operates downstream of this adapter) |
| AC-R29-11 | Chore-A SHA `<CHORE-A-SHA>` committed | `npx tsc -p tsconfig.test.json` is run via `execFileSync` at chore-A HEAD | The command exits with code 2; the captured diagnostic codes (extracted via regex `error TS(\d+):`) form a set equal to `{TS2688, TS5107}` (set equality; no R29-introduced codes) | § 9.1 baseline; CROSS-PROJECT-MEMORIAL R26 false-compliance-attestation reinforcement |
| AC-R29-12 | Chore-A SHA `<CHORE-A-SHA>` committed | `node --test --test-reporter=tap` is run via `execFileSync` ON the pre-R29 test files only (glob `test/*.test.js` filtered to exclude `q29-k8s-adapter.test.js`) | The TAP summary reports exactly `tests=243`, `pass=241`, `fail=2`; the 2 failures are `q01-no-at-pin-deltas AC-7` (ENOENT for missing `../deploysignal` sibling) and `q-md-f4 AC-R26-16` (forward-protection — pre-existing environmental) | § 9.1 baseline; CROSS-PROJECT-MEMORIAL R25 MINOR-1 derived rule |
| AC-R29-13 | Chore-A SHA `<CHORE-A-SHA>` committed; chore-B appends this test | `execFileSync('git', ['diff', '<CHORE-A-SHA>..HEAD', '--name-only'])` is run at chore-B HEAD | Every emitted path is either (a) a member of the 10-entry literal `ALLOWED_SET` per § 2.5 OR (b) matches the regex `^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$`; ZERO paths violate this constraint | § 2.5, § 2.7 |

### § 4.3. Failure-mode-to-AC binding map (R21 ARCH MINOR-2/3 branch-binding coverage)

For each § 1 mechanism / failure-mode point, the AC that exercises it:

| Mechanism / failure mode | Bound by AC |
|---|---|
| Empty NodeList (§ 1.8) | AC-R29-1 |
| Full-label parse — host nodes (§ 1.2, § 1.5) | AC-R29-2 |
| Full-label parse — zone nodes (§ 1.2, § 1.5) | AC-R29-2, AC-R29-3 |
| Full-label parse — gpu_shard inference (§ 1.7) | AC-R29-2, AC-R29-4 |
| Zone→host containment edge (§ 1.4) | AC-R29-3 |
| Host→gpu_shard containment edge (§ 1.4) | AC-R29-5 |
| Zone dedup (§ 1.5 — single zone node for N hosts) | AC-R29-2 (4 hosts in 2 zones produces 2 zone nodes) |
| Metadata `instance_type` (§ 1.6) | AC-R29-6, AC-R29-8 |
| Metadata `region` on host (§ 1.6) | AC-R29-6, AC-R29-8 |
| Metadata `gpu_product` on gpu_shard (§ 1.6) | AC-R29-6 |
| Metadata `host` on gpu_shard (§ 1.6) | AC-R29-6 |
| Metadata `{}` on zone node (§ 1.6) | AC-R29-6 |
| Sparse: missing region → no `metadata.region` (§ 1.8) | AC-R29-7 |
| Sparse: missing nvidia labels → 0 gpu_shards (§ 1.8) | AC-R29-7, AC-R29-8 |
| GPU count parse: `parseInt`, `>= 1`, integer (§ 1.7) | AC-R29-4 (positive case); AC-R29-7 + AC-R29-8 (absent case) |
| Nameless host skip (§ 1.8) | NOT bound by current AC set — see § 9.13 grilling note (G2; deferred to in-scope-but-low-risk Implementer judgment; if observed in fixture, host is silently skipped) |
| TopologySource interface conformance (§ 1.9) | AC-R29-9 |
| `snapshotHash` delegation to `computeSnapshotHash` (§ 1.9) | AC-R29-9 |
| `fetchSnapshot` returns same reference (§ 1.11) | AC-R29-9 |
| Two-instance hash determinism (§ 1.11) | AC-R29-9 |
| A16 wire-format invariant preservation | AC-R29-10 |
| Typecheck no regressions | AC-R29-11 |
| Test-count no unexpected drift | AC-R29-12 |
| Anti-scope diff bound to allowed-set | AC-R29-13 |

Every § 1 mechanism point has a bound AC; one edge case (nameless host) is not bound and is documented in § 9.13.

---

## § 5. Anti-scope

This round MUST NOT modify (read-only):

- **Vendored-at-pin engine files** (A12):
  - `engine/topology-overlay.ts` — TopologySource interface, FetchContext, computeSnapshotHash consumed via import only.
  - `engine/types/verdict.ts` — TopologyNode, TopologyEdge, TopologySnapshot, kind union, relationship union consumed via import only. (Explicitly NOT modified to add K8s-specific kind literals — that's halt condition #2.)
  - `engine/core.ts` — TrendBuffer body untouched.
  - `engine/l0/schema-continuity.ts` — vendored-at-pin; not modified.
  - All `engine/detectors/*` files — out of scope for any topology work.

- **Wave 1 deliverables** (Wave-1-frozen):
  - `engine/l0/counter-rate-transform.ts` — Wave-1 frozen per WAVE-GATE-01.
  - `engine/topology/common-mode-attribution.ts` — Wave-1 frozen per WAVE-GATE-01.

- **R23 frozen artifacts:**
  - `engine/hardware-topology-source.ts` — R23 frozen; read-only reference for class shape.

- **R20 / R21 / R23 frozen artifacts:**
  - `engine/verdict-groups.ts` — R20 frozen.
  - `engine/fleet/verdict-consumer.ts` — R21 frozen.
  - `test/_substrate/v9X-cluster.ts` — R18 frozen.
  - `test/_substrate/v9Y-multi-rack-cluster.ts` — R23 frozen.

- **All pre-R29 test files** — `test/q01-*.test.ts` through `test/q-md-f4-common-mode-injection.test.ts`, plus `test/_substrate/factories.ts` and `test/_substrate/synthetic-counter-generator.ts`. R29 creates only new q29 + new K8s NodeList JSON fixtures.

- **Sister-cluster parallel scopes** (Wave 2 parallel):
  - `engine/topology/slurm-source.ts` — WU-01 cluster's scope; NOT touched here.
  - `engine/topology/nvlink-source.ts` — WU-03 cluster's scope; NOT touched here.

- **Coordination policy artifacts:**
  - `coordination/VENDORING-MANIFEST.md` — no vendored-with-deltas this round (avoids halt #2), so no manifest amendment.
  - `coordination/SCOPING-MEMO-v0.3.md` — out of scope.
  - `coordination/PRD.md` — out of scope (already set by Coordinator R28).

- **PRD anti-scope carry:**
  - A8/A11: NO real customer cluster telemetry; substrate-only JSON fixtures.
  - A10: NO hardware-diagnostic territory.
  - A16: `correlational_not_causal: true` wire-format invariant preserved (AC-R29-10 binds this).

- **No new vendored-with-deltas transitions this round.** This is the architecturally-significant choice (Approach A1 — see § 1.3). It is enforced by AC-R29-13 (forward-protection diff): no path outside the 10-entry allowed-set (+ conditional DIAGNOSTIC regex) may appear in the chore-A→HEAD diff. The `engine/types/verdict.ts` path is NOT in the allowed-set; any modification would surface as an anti-scope diff violation.

---

## § 6. Open questions

**None — all resolved.**

The five architectural sub-decisions (kind-literal mapping, container-id format, gpu-count parse rule, sparse-handling policy, constructor pattern) are all resolved in this spec body. The one cross-cluster coordination risk (WU-01 SLURM running in parallel may choose different kind literals; cross-cluster merge could surface naming conflicts) is mitigated by Approach A1 itself — each cluster maps to existing literals, so no cross-cluster vocabulary contention exists.

---

## § 7. Halt conditions for the Implementer

Per CLAUDE-COMMON.md halt-discipline + PRD § Halt conditions. The Implementer HALTs (writes a `coordination/diagnostics/DIAGNOSTIC-R29-<topic>.md`; sets `STATUS: ESCALATE` in NEXT-ROLE.md; commits the DIAGNOSTIC at the HALT commit before chore-A) when any of:

### § 7.1. Pre-anticipated halt scenarios

- **(a) Typecheck regression at chore-A.** `npx tsc -p tsconfig.test.json` at chore-A SHA emits any diagnostic code OTHER than TS2688 + TS5107, OR exits with a code OTHER than 2. Write `DIAGNOSTIC-R29-typecheck-regression.md` with the actual diagnostic output, the AC literal it contradicts (AC-R29-11), bounded options (fix the introduced diagnostic; amend AC text via DIAGNOSTIC; escalate to Architect). Do NOT re-frame the failure as compliance (per R26 MAJOR-1 / CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 false-compliance-attestation rule).

- **(b) Test-count drift at chore-A.** Filtered `node --test` on pre-R29 files at chore-A SHA reports counts other than `tests=243 / pass=241 / fail=2`. Write `DIAGNOSTIC-R29-baseline-drift.md` quoting AC-R29-12 literal, the observed counts, and bounded options (root-cause the drift; amend AC if a benign Wave 2 sister-cluster merge introduced an off-by-one; escalate). Do NOT silently amend the literal.

- **(c) AC scenario produces output conflicting with spec prescription.** Any AC-R29-1..10 produces output that contradicts the spec's `Then` text. Write `DIAGNOSTIC-R29-<ac>-<topic>.md` quoting the spec claim, the observed output, the relevant pseudocode line, and bounded options. Do NOT silently mutate the test to pass.

- **(d) Spec files uncommitted at chore-A.** If `coordination/specs/Q-R29-SPEC.md` or `coordination/specs/Q-R29-SPEC-AUDIT.md` is absent from the round-start-to-chore-A diff range, that is an Architect-attributable violation (R21 ARCH MINOR-1 reinforcement). Implementer HALTs and routes back rather than proceeding to chore-A.

- **(e) Anti-scope file modification surface.** If any file outside the 10-entry allowed-set (+ DIAGNOSTIC regex) appears in the round-start-to-chore-A diff, that is an anti-scope violation. Implementer HALTs with `DIAGNOSTIC-R29-anti-scope.md` BEFORE chore-A; do NOT tactically expand the allowed-set in the chore-B test literal (R25 MAJOR-2 reinforcement — silent expansion sets a precedent).

- **(f) `TopologyNode.kind` or `TopologyEdge.relationship` literal needed beyond the existing union.** If the K8s parsing pseudocode in § 3.1 cannot be implemented without a new kind/relationship literal (e.g., the Implementer discovers a K8s scenario where `'cooling_zone'`/`'rack'`/`'gpu_shard'`/`'contains'` is structurally unworkable), HALT per PRD halt condition #2. Write `DIAGNOSTIC-R29-kind-literal-needed.md` with the specific scenario + bounded options (escalate to Coordinator for cross-cluster vendored-with-deltas application). Do NOT silently modify `engine/types/verdict.ts`.

- **(g) `engine/topology-overlay.ts` body modification appears load-bearing.** Per PRD halt condition #1. If K8s parsing requires modifying inherited BFS body, HALT.

### § 7.2. Non-halt tactical adjustments allowed

- The Implementer may choose any equivalent JS/TS idiom for the algorithm in § 3.1 (e.g., `Set` vs `Map<string, true>` for dedup; `for...of` vs `forEach`; relative-import path style).
- The Implementer chooses test() titles, fixture-loading helper structure, and assertion-library style (`assert.strictEqual` vs `assert.deepStrictEqual`; both fine).
- The Implementer chooses whether to load fixtures via `JSON.parse(readFileSync(...))` or `import` with JSON module resolution. Either is fine.
- The Implementer's RED commit may stub the helper as `export function parseNodeListToSnapshot() { throw new Error('not implemented'); }` OR via `assert.fail` in test bodies — both are R23-acceptable RED state patterns.

---

## § 8. Pseudocode-to-AC traceability (cross-check)

Every line of § 3.1 pseudocode is reachable from at least one AC:

| § 3.1 pseudocode reference | AC binding |
|---|---|
| `K8sNodeLabelSource` class shape (lines `class K8sNodeLabelSource implements TopologySource`) | AC-R29-9 |
| `id` / `version` defaults | AC-R29-1 (default value visible in returned snapshot), AC-R29-9 |
| Constructor calls `parseNodeListToSnapshot(...)` once at construction | AC-R29-9 (`Object.is` reference equality on repeated fetch) |
| `now` default + injection | AC-R29-1, AC-R29-9 (deterministic timestamp asserted) |
| `parseNodeListToSnapshot` iteration over items[] | AC-R29-1 (empty case), AC-R29-2 (full case) |
| Nameless-host skip (`typeof name !== 'string' || name.length === 0`) | NOT directly bound; § 9.13 (G2) records as low-risk edge |
| Host node emission | AC-R29-2, AC-R29-7, AC-R29-8 |
| `hostMeta.instance_type` conditional assignment | AC-R29-6, AC-R29-8 |
| `hostMeta.region` conditional assignment | AC-R29-6, AC-R29-7 (absence check), AC-R29-8 (presence) |
| Zone dedup via `zoneNodesByZone` map | AC-R29-2 (4 hosts → 2 zones) |
| Zone node emission with `kind: 'cooling_zone'` | AC-R29-2, AC-R29-7, AC-R29-8 |
| Zone→host edge emission | AC-R29-3, AC-R29-7, AC-R29-8 |
| GPU count `parseInt` + `Number.isInteger` + `>= 1` gate | AC-R29-4 (positive), AC-R29-7 + AC-R29-8 (absent) |
| GPU-shard node emission with deterministic ids | AC-R29-4 |
| `gpuMeta.host` always set | AC-R29-6 |
| `gpuMeta.gpu_product` conditional assignment | AC-R29-6 |
| Host→gpu_shard edge emission | AC-R29-5 |
| Snapshot return shape (`{nodes, edges, fetched_at_ts, source_id, source_version}`) | AC-R29-1 |
| `K8sNodeLabelSource.snapshotHash` delegates to `computeSnapshotHash` | AC-R29-9 |

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| **correctness** | Pseudocode in § 3.1 produces TopologySnapshot conforming to inherited `engine/types/verdict.ts:260-269` shape; every emitted node uses a kind from the inherited at-pin union (`engine/types/verdict.ts:245`); every emitted edge uses `relationship: 'contains'` from the inherited union (`engine/types/verdict.ts:255`). No new literals introduced. |
| **completeness** | All 13 ACs map to specific failure modes; all failure modes have bound ACs (§ 4.3 branch-binding table); all 4 PRD-required fixture cases are exercised (full / sparse-no-region / sparse-no-GPU / empty). |
| **consistency** | Token consistency verified across 6 spec sections (Mechanism § 1, Component inventory § 2, Pseudocode § 3, ACs § 4, Anti-scope § 5, Pseudocode-to-AC § 8) for: identifiers (`K8sNodeLabelSource`, `parseNodeListToSnapshot`, `K8sNodeList`, `K8sNode`, `LABEL_*` constants, kind literals `'rack'`/`'cooling_zone'`/`'gpu_shard'`, edge `'contains'`); paths (`engine/topology/k8s-source.ts`, `test/q29-k8s-adapter.test.ts`, fixture file names); SHAs (`e714703` round-start, `3308681` main HEAD, `<CHORE-A-SHA>` placeholder); count claims (`243` baseline, `255` chore-A predicted, `13` AC count, `10` allowed-set entries, `2` env failures). No identifier drift; no token mismatch detected. |
| **clarity** | Pseudocode in § 3.1 is full-form TypeScript syntax (close-to-implementation); rationale paragraphs follow each algorithm sub-section explaining the WHY. AC `Given/When/Then` text avoids "correctly" / "appropriately" / "as needed" banned phrasing. |
| **coverage** | Every § 1 mechanism point has an AC binding it (§ 4.3); pre-emit branch-binding coverage gate (R21 ARCH MINOR-2/3) verified by independent table at § 4.3. |
| **constraints** | A12 anti-scope (no vendored engine modifications) preserved by Approach A1 architectural choice + AC-R29-13 forward-protection. A16 preserved by AC-R29-10 static check. Halt conditions #1 (BFS body) and #2 (kind literal) pre-empted; halt condition #3 (binding-command vs AC literal) pre-anticipated in § 7.1 (a)/(b). |
| **concurrency** | N/A — `K8sNodeLabelSource` is single-threaded; constructor synchronously parses + caches; `fetchSnapshot` returns the cached reference. No locking, no async race surface. The `now` injection is called once at construction time. |
| **corner cases** | (a) Empty NodeList (AC-R29-1). (b) Nameless host (silently skipped; § 1.8 + § 9.13 G2 — low-risk). (c) `gpu.count` malformed/zero/negative (AC-R29-7/AC-R29-8 + § 1.7 conservative gate). (d) Zone with no hosts (no zone node emitted; emerges naturally from iteration order — no host triggers zone emission). (e) Region label without zone label (region carried on host metadata only; no zone-level metadata field). (f) `metadata.labels` undefined (treated as `{}`; `?? {}` fallback in pseudocode). (g) Single-instance vs two-instance hash equality (AC-R29-9). |
| **cost** | Parse cost O(N) in nodeList items + O(G) GPUs per host = O(N + Σ count_i). Memory cost O(N + Σ count_i) for node + edge arrays. Single-pass; no nested loops over the same data. No expected hot-path call (K8s topology snapshots refresh on the order of seconds, not per-tick). |
| **coupling** | Couples to inherited `engine/topology-overlay.ts` types (TopologySource interface, FetchContext, computeSnapshotHash) and `engine/types/verdict.ts` types (TopologyNode, TopologyEdge, TopologySnapshot). Does NOT couple to `engine/l0/counter-rate-transform.ts` (interface-only per CLUSTER-HANDOFF). Does NOT couple to `engine/topology/common-mode-attribution.ts` (downstream consumer; reads but does not call). Couples test infrastructure to 4 new substrate JSON fixtures + the inherited `node --test` runner. |

### § 9.1. Empirical baseline (R25 MINOR-1 + R26 MAJOR-1 reinforcements; ALL verified by direct command at session start)

The 7 load-bearing factual claims of this spec are verified by command output at session start in **this cluster worktree** (not inherited from cross-round attestations):

1. **Round-start SHA `e714703`.** Verified by `git rev-parse HEAD` → `e714703ff5272c7f99b7ee025fa8022c4ab69ff8`.
2. **Pre-R29 test count = 243 / pass = 241 / fail = 2 / skipped = 0.** Verified by `node --test --test-reporter=tap test/*.test.js` at HEAD `e714703`. The 2 failures: `q01-no-at-pin-deltas` AC-7 (ENOENT for `../deploysignal/engine/detectors/_linalg.ts`) and `q-md-f4-common-mode-injection` AC-R26-16 (post-chore-A modification outside R26 allowed-set: `CLAUDE-ARCHITECT.md` — caused by post-R26 Memorial-Updater accretion).
3. **`npx tsc -p tsconfig.test.json` exits with code 2; emits exactly TS2688 + TS5107.** Verified directly. Both are pre-existing infra issues independent of R29.
4. **`engine/topology/k8s-source.ts` does not yet exist; will be created this round.** Verified by `ls engine/topology/` returning only `common-mode-attribution.ts`.
5. **`TopologyNode.kind` union at `engine/types/verdict.ts:245` is exactly `'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`.** Verified by direct file read (sed -n '245p' equivalent).
6. **`TopologyEdge.relationship` union at `engine/types/verdict.ts:255` is exactly `'calls' | 'reads' | 'writes' | 'publishes' | 'contains' | 'nvlink_peer'`.** Verified by direct file read.
7. **All 10 allowed-set paths are git-trackable per `.gitignore`.** Verified by `git check-ignore <path>` for each — every path returns no output (not gitignored).

### § 9.2. Cross-section identifier-consistency table (R01 + R20 ARCH MINOR-1)

| Identifier / value | § 1 Mechanism | § 2 Inventory | § 3 Pseudocode | § 4 ACs | § 5 Anti-scope | § 7 Halt | § 8 Trace | § 9 Verification |
|---|---|---|---|---|---|---|---|---|
| `K8sNodeLabelSource` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| `parseNodeListToSnapshot` | — | — | ✓ | — | — | ✓ | ✓ | — |
| `engine/topology/k8s-source.ts` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| `test/q29-k8s-adapter.test.ts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `k8s-nodelist-fixture-{full,sparse-no-region,sparse-no-gpu,empty}.json` | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| `'cooling_zone'` / `'rack'` / `'gpu_shard'` literals | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `'contains'` edge relationship | ✓ | — | ✓ | ✓ | — | — | — | ✓ |
| Round-start SHA `e714703` | ✓ | ✓ | — | ✓ | — | — | — | ✓ |
| `<CHORE-A-SHA>` placeholder | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — |
| ALLOWED_SET size = 10 + DIAGNOSTIC regex | — | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |
| Baseline 243 / 241 / 2 | — | — | ✓ | ✓ | — | ✓ | — | ✓ |
| Predicted chore-A 255 / 253 / 2 (full-suite, AUDIT-only) | — | — | ✓ | — | — | — | — | — |
| AC count = 13 | — | — | — | ✓ | — | — | — | ✓ |

No identifier or value drifts across sections.

### § 9.3. `.gitignore` audit on the 10-entry allowed-set (R23 MINOR-2)

Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 (R23 phantom-entry rule): each allowed-set path verified via `git check-ignore`:

```
$ for p in <each of 10 entries>; do git check-ignore "$p" 2>/dev/null && echo "$p GITIGNORED" || echo "$p trackable"; done
coordination/specs/Q-R29-SPEC.md                                  trackable
coordination/specs/Q-R29-SPEC-AUDIT.md                            trackable
engine/topology/k8s-source.ts                                     trackable
test/q29-k8s-adapter.test.ts                                      trackable
test/_substrate/k8s-nodelist-fixture-full.json                    trackable
test/_substrate/k8s-nodelist-fixture-sparse-no-region.json        trackable
test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json           trackable
test/_substrate/k8s-nodelist-fixture-empty.json                   trackable
coordination/NEXT-ROLE.md                                         trackable
coordination/MEMORIAL.md                                          trackable
```

**Phantom-entry count: 0.** No `.js` artifact paths in the allowed-set (the K8s adapter is `.ts` source; compiled `.js` is gitignored by `*.js` rule). DIAGNOSTIC regex carve-out `^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$` — `coordination/diagnostics/` is not gitignored.

### § 9.4. Spec-internal-contradiction scan (R20 ARCH MINOR-1 / R25 MAJOR-3)

Cross-checked sections for any mutually-incompatible prescriptions:

- **GPU-shard inference rule:** § 1.7 says "parseInt; `count >= 1` integer gate"; § 3.1 pseudocode implements `Number.isInteger(count) && count >= 1`; AC-R29-4 + AC-R29-7 + AC-R29-8 exercise both arms. CONSISTENT.
- **Allowed-set size:** § 2.5 says "10 literal entries + conditional DIAGNOSTIC regex"; § 4.2 AC-R29-13 references "10-entry literal ALLOWED_SET + regex carve-out"; § 9.3 audit shows 10 trackable entries. CONSISTENT.
- **Baseline test count:** § 1 (no claim), § 4.2 AC-R29-12 "tests=243 / pass=241 / fail=2", § 9.1 row 2 "243 / 241 / 2", § 7.1 (b) "tests=243 / pass=241 / fail=2". CONSISTENT.
- **AC count:** § 4.1 preamble "13"; § 4.2 table has 13 rows (AC-R29-1..13); § 4.3 has 13 distinct ACs referenced. CONSISTENT.
- **Tier verdict:** § 0 says `full`; PRD says `full`. CONSISTENT.

Zero spec-internal contradictions detected.

### § 9.5. Verification-command-soundness (R03 MINOR-2)

ACs that use grep / regex / set-equality patterns verified for false-positive risk:

- **AC-R29-10 grep:** "exactly zero occurrences of the substring `correlational_not_causal`" — this substring is unique and unambiguous; the K8s adapter operates upstream of A16 wire-format boundary, so any occurrence in `engine/topology/k8s-source.ts` would be a defect. No false-positive risk (the substring is not a TypeScript keyword or common identifier fragment that could appear innocently).
- **AC-R29-11 regex:** `error TS(\d+):` captures `error TS5107:`, `error TS2688:`; will NOT match TypeScript-emitted `warning TS...:` (warnings use a different prefix in tsc output, though tsc does not currently emit warnings; relevant since CROSS-PROJECT-MEMORIAL R26 false-compliance-attestation rule warned against reframing errors as warnings). Confirmed sound.
- **AC-R29-13 regex:** `^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$` — anchored to start (`^`) and end (`$`); enforces "starts with `coordination/diagnostics/DIAGNOSTIC-R29-`" and "ends with `.md`". Cannot match a DIAGNOSTIC for a different round (`DIAGNOSTIC-R28-*` is excluded). Cannot match a stray file at the diagnostics root (`coordination/diagnostics/notes.md` does not match because it lacks `DIAGNOSTIC-R29-`). Sound.

### § 9.6. Architect commit-sequencing audit (R21 ARCH MINOR-1)

This spec MUST be committed in its own commit BEFORE the NEXT-ROLE.md routing block is committed. Sequence:

1. **Architect-commit-A** (after writing this spec + the audit sidecar): `git add coordination/specs/Q-R29-SPEC.md coordination/specs/Q-R29-SPEC-AUDIT.md && git commit -m "spec(R29): WU-02 K8s adapter — Architect commit A"`.
2. **Architect-commit-B** (after appending MEMORIAL ceremony + updating NEXT-ROLE.md): `git add coordination/NEXT-ROLE.md coordination/MEMORIAL.md && git commit -m "route(R29): Architect → Implementer; STATUS: READY"`.

Both commits land before chore-A. Verified at Architect-role-close — Architect-commit-A SHA recorded in NEXT-ROLE.md routing notes.

### § 9.7. Empirical-premise-verification table (R02 + R23 + R25 MINOR-1)

Each load-bearing factual claim verified by the appropriate verification category (NOT by proxy commands):

| Claim | Verification category | Command / location | Result |
|---|---|---|---|
| Round-start SHA `e714703` | git command | `git rev-parse HEAD` | `e714703ff5272c7f99b7ee025fa8022c4ab69ff8` ✓ |
| Pre-R29 baseline counts | test-suite run | `node --test --test-reporter=tap test/*.test.js \| tail` | `tests=243 / pass=241 / fail=2 / skipped=0` ✓ |
| tsc exit code + diagnostic set | typecheck run | `npx tsc -p tsconfig.test.json 2>&1; echo $?` | `EXIT=2; codes={TS2688, TS5107}` ✓ |
| 2 failing tests' identity | TAP run + grep | `node --test --test-reporter=tap test/*.test.js \| grep "^not ok"` | `q01-no-at-pin-deltas AC-7 + q-md-f4 AC-R26-16` ✓ |
| `TopologyNode.kind` union | file-content read | `engine/types/verdict.ts:245` | matches § 9.1 row 5 ✓ |
| `TopologyEdge.relationship` union | file-content read | `engine/types/verdict.ts:255` | matches § 9.1 row 6 ✓ |
| `TopologySource` interface signature | file-content read | `engine/topology-overlay.ts:50-55` | matches § 1.9 ✓ |
| `computeSnapshotHash` semantics + signature | file-content read | `engine/topology-overlay.ts:69-78` | matches § 1.11 + § 3.1 import ✓ |
| `engine/topology/k8s-source.ts` does not exist | directory listing | `ls engine/topology/` → only `common-mode-attribution.ts` | ✓ |
| Allowed-set gitignore-trackability | git check-ignore per path | each of 10 paths | trackable (phantom count = 0) ✓ |
| CLUSTER-HANDOFF interface contract | file-content read | `coordination/CLUSTER-HANDOFF-1-WU00-WU02.md` | matches § 0 + § 1 + § 5 ✓ |
| HardwareTopologySource pattern | file-content read | `engine/hardware-topology-source.ts` | confirms parse-once + fetch-cached pattern referenced in § 1.9 ✓ |

12 verification rows; all PASS at session start in cluster worktree.

### § 9.8. Halt-discipline coverage (CROSS-PROJECT R26 false-compliance-attestation reinforcement)

For each pre-anticipated halt scenario in § 7.1, the prescribed action is HALT + DIAGNOSTIC + ESCALATE — NOT silent reframing of failing binding-command output as compliance. The PRD-mandated halt conditions #1 (`engine/topology-overlay.ts` body) and #2 (kind literal needed) are individually mapped to § 7.1 (g) and (f) respectively.

The R26 MAJOR-1 trap (attesting `tsc` exit 0 when actual exit is 2) is pre-empted at the spec layer: AC-R29-11's literal explicitly says "exits with code 2" — the AC text matches reality. Similarly AC-R29-12's literal explicitly encodes the empirically-measured 243/241/2 baseline (not the handoff's predicted 230/229/1, which is empirically refuted at session start — see § 9.1 row 2). If at chore-A the Implementer observes counts outside the AC literal, § 7.1 (a)/(b) prescribe HALT, not silent absorption.

### § 9.9. AC-table preamble cross-check (R20 ARCH MINOR-1)

§ 4.1 preamble classifies:
- AC-R29-1..10: chore-A runtime tests (committed in `test/q29-k8s-adapter.test.ts` at chore-A SHA).
- AC-R29-11, AC-R29-12: chore-A runtime tests, each a binding-command runtime test inside `test/q29-k8s-adapter.test.ts`.
- AC-R29-13: chore-B runtime test appended to `test/q29-k8s-adapter.test.ts`.

Cross-checked against § 3.2 per-AC prescription:
- AC-R29-1..10 → bullet "Per-AC test prescriptions" lists 10 runtime test bodies (matches).
- AC-R29-11 → "execFileSync('npx', ['tsc', ...])" wrapper test (matches; chore-A; runtime).
- AC-R29-12 → "execFileSync('node', ['--test', ...filtered])" wrapper test (matches; chore-A; runtime).
- AC-R29-13 → chore-B append (matches; § 2.7 documents the chore-B step).

Cross-checked against § 2 component inventory:
- § 2.2 lists `test/q29-k8s-adapter.test.ts` as Implementer-created in chore-A → matches AC-R29-1..12 classification.
- § 2.7 prescribes chore-B as a separate commit appending AC-R29-13 to the same file → matches AC-R29-13 classification.

No preamble-vs-prescription mismatch.

### § 9.10. Branch-binding coverage gate (R21 ARCH MINOR-2/3)

Per § 4.3 table, every mechanism point in § 1 has a bound AC. One edge case (nameless host skip at § 1.8 / § 3.1) is NOT bound; documented in § 9.13 G2 as low-risk (no test fixture is prescribed to contain a nameless host; the silent skip is defensive code; mutating its guard would only affect malformed input that no AC exercises). The branch-binding coverage gate PASSES with one documented G2 carve-out.

### § 9.11. Count-AC chore-A-SHA anchoring (R22 IMPL MINOR-1)

AC-R29-11, AC-R29-12, AC-R29-13 all explicitly anchor to `<CHORE-A-SHA>` placeholder (substituted at Implementer chore-A time). No relative phrasing ("after R29 implementation commits") — each AC says "at chore-A SHA `<CHORE-A-SHA>`". Per the R22 MINOR-1 reinforcement that count-ACs avoid ambiguous relative wording.

### § 9.12. Line-citation-drift prevention (R03 / R18 / R21 MINOR-4)

This spec does not cite specific line numbers in the (yet-to-be-written) `engine/topology/k8s-source.ts` or `test/q29-k8s-adapter.test.ts`. All line citations point to **pre-existing files** at specific verified line ranges (§ 9.1 row 5/6 — `engine/types/verdict.ts:245` and `:255`; § 1.9 references `engine/topology-overlay.ts:50-55`). Each cited line range was verified by direct file read at session start. The Implementer's chore-A attestation will produce line citations for the new test() declarations; per the line-citation-drift reinforcement, those citations must be grep-verified before chore-A is committed.

### § 9.13. Grilling-and-mitigated items (G1, G2)

- **G1 — Predicted chore-A count `tests=255 / pass=253 / fail=2` is a prediction, not a measurement.** The 12 new tests at chore-A (AC-R29-1..12) are predicted to pass; if the Implementer's implementation diverges from § 3.1 pseudocode such that one or more new tests fail, the chore-A count drifts. § 7.1 (b) prescribes HALT in this case. The risk: if the Implementer's GREEN-state still has bugs, halt fires correctly per § 7.1 (b). No mitigation needed beyond the halt rule.

- **G2 — Nameless host edge case is NOT directly bound by AC.** The `typeof name !== 'string' || name.length === 0` guard in § 3.1 is defensive (skips malformed input). No AC exercises a fixture with a nameless host. Mutation removing the guard would produce nodes with id `host:` (empty name) which would still pass AC-R29-1 through AC-R29-8 (because none of those ACs feed a nameless host). This is documented as a low-risk edge: malformed K8s NodeList JSON is out-of-scope for AC enumeration; the guard is defensive and any in-the-wild nameless host (if it ever arrived) would produce a defensive skip. Mitigation: documented in this section + § 4.3 + § 7 not required since no halt scenario could trigger from this edge.

---

## § 10. Reviewer cold-read posture

This section anticipates the cold-Reviewer pass.

A cold reader landing on this spec should be able to:

- Determine the file location, class name, and interface contract of the new adapter (§ 0, § 1.9, § 3.1).
- Trace each AC to a specific § 1 mechanism point AND a specific § 3.1 pseudocode line (§ 4.3, § 8).
- Verify the AC literal text matches empirical reality (§ 9.1, § 9.7, § 9.8) by re-running the same commands at chore-A SHA.
- Audit the anti-scope diff via AC-R29-13's literal ALLOWED_SET (§ 2.5) which is gitignore-trackable (§ 9.3).
- Recognize the Approach A1 architectural choice that avoids halt condition #2 (§ 1.3) and the trade-off accepted (semantic stretch on `'cooling_zone'`-for-K8s-zone).

Anticipated Reviewer surfaces (low-risk; documented for transparency):
- **OBS-class:** The semantic stretch of `'cooling_zone'` for K8s zones is documentable but a future Tessera reader querying topology by `kind` may need cross-reference to § 1.3 to understand. Acceptable per Approach A1 rationale.
- **OBS-class:** The nameless-host defensive skip is unbound (G2 in § 9.13). Documented; low-risk.
- **OBS-class:** The Implementer's `parseNodeListToSnapshot` is exported as a helper alongside the class. This decouples test surface from class instantiation; an alternative would be private + class-only access. Either choice is defensible; the exported pattern matches `engine/l0/counter-rate-transform.ts` (where `transformPair` is exported alongside the not-needed class wrapper). No invalid pattern.

---

## § 11. Round-close routing

When Architect role completes:
- This spec is committed in Architect-commit-A.
- `Q-R29-SPEC-AUDIT.md` is committed in the same Architect-commit-A.
- `coordination/NEXT-ROLE.md` is updated in Architect-commit-B with:
  ```
  CURRENT-ROUND: R29
  NEXT-ROLE: IMPLEMENTER
  STATUS: READY
  Inputs: coordination/specs/Q-R29-SPEC.md
  ```
- `coordination/MEMORIAL.md` is appended in Architect-commit-B with this round's Architect CONFIRMATION/VIOLATION entries.

The Implementer reads this spec + this round's PRD + CLUSTER-HANDOFF-1-WU00-WU02 as primary inputs.

---

_End of Q-R29-SPEC.md._
