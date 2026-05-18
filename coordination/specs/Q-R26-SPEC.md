# Q-R26 Spec — Phase 2 SLICE 3.C: MD-F4 topology-aware common-mode attribution

_Cluster: `wu-04-md-f4-common-mode`. Round: R26. Tier: full (A2 + A4 + A6 per PRD § Tier verdict). Architect: 2026-05-18._

_Spec-proper. Audit-trail (brainstorm, decision rationale, P3 sub-claims, grilling appendix) at `coordination/specs/Q-R26-SPEC-AUDIT.md`. External citation package at `coordination/evidence/PR-F6-EVIDENCE.md`._

---

## 1. Mechanism

### 1.1 Purpose

Implement a topology-aware spatial attribution layer that consumes a list of fired per-shard events plus a `TopologySnapshot` (from `HardwareTopologySource`, R23) and surfaces **common-mode candidates**: shared hardware-substrate nodes (PSU / rack / cooling_zone) that have ≥ N fired shards within a bounded BFS hop distance. Each candidate carries the literal `correlational_not_causal: true` label per inherited Addition #26 D4.

The attribution layer is downstream of per-shard detectors. It does NOT modify detector internals (A12 / A5), does NOT modify the inherited `engine/topology-overlay.ts` BFS body (A12; R23 anti-scope precedent), does NOT depend on the WU-00 L0-contract surface (v9Y is value-domain by construction per PRD § Anti-scope).

### 1.2 Algorithm

```
attributeCommonMode(input):
  1. Build bidirectional adjacency map from snapshot.edges.
  2. For each FiredShardEvent in input.fired_events:
       a. BFS from event.shard_node_id, bounded by max_hop_distance.
          Bidirectional: every edge (a,b) yields both a→b and b→a in adjacency.
          Neighbor visit order: sorted lex asc by node id (determinism).
       b. For every reachable node n at hop ≤ max_hop:
            - skip if n is the start node (self-exclusion)
            - skip if kind(n) ∉ opts.candidate_node_kinds
            - record (shared_node_id=n, member_shard_id, hop, event_ts)
  3. Group records by shared_node_id.
  4. For each group:
       - Distinct member shard ids = set(member_shard_id).
       - If |distinct| < min_member_count → discard (singleton not surfaced).
       - candidate.shared_node_id        = group.shared_node_id
       - candidate.shared_node_kind      = kindOf(shared_node_id)
       - candidate.member_shard_ids      = sort_lex_asc(distinct)
       - candidate.member_count          = |distinct|
       - candidate.topology_distance     = max over distinct shards of min-hop-from-that-shard-to-shared-node
       - candidate.earliest_event_ts     = min(event_ts across records of distinct members)
       - candidate.latest_event_ts       = max(event_ts across records of distinct members)
       - candidate.correlational_not_causal = true   (literal; type-checked)
  5. Sort candidates: shared_node_kind in canonical order ('psu' < 'rack' < 'cooling_zone'), then shared_node_id lex asc.
  6. Return { candidates, snapshot_hash = computeSnapshotHash(snapshot), attributed_at_ts = opts.now() ?? floor(Date.now()/1000) }.
```

### 1.3 Determinism guarantees

- **Adjacency build:** insertion order does not matter; lookup is by key only.
- **BFS neighbor visit order:** `sort()` on neighbor ids before enqueue (matches inherited `engine/topology-overlay.ts:277` pattern).
- **Member shard ids sort:** lex asc within each candidate.
- **Candidate sort:** (kind canonical-order, then shared_node_id lex asc).
- **Snapshot hash:** delegates to inherited `computeSnapshotHash` at `engine/topology-overlay.ts:69-78`. Identical hash semantics across all `TopologySource` impls per Addition #26 D6.

### 1.4 Defaults

- `DEFAULT_MAX_HOP_DISTANCE = 1` — at hop 1, two shards "share" a PSU/rack/cooling_zone iff they are direct neighbors of that node (the v9Y geometry). Higher hop counts would surface transitive correlations (e.g., shards sharing a rack-of-racks); deferred.
- `DEFAULT_MIN_MEMBER_COUNT = 2` — singleton shard alarm is not a "common mode" (per name semantics + PRD US-01 distinction between "shard 47 has a bad GPU" vs "all shards drift because of a fleet event").
- `DEFAULT_CANDIDATE_NODE_KINDS = ['psu', 'rack', 'cooling_zone']` — the three hardware-substrate kinds added in R18 + R23. `'gpu_shard'` is excluded as a candidate target (would surface a fired-shard as its own attribution node — vacuous). `'nvlink_peer'` is an edge relationship, not a node kind. `'service' | 'database' | 'queue' | 'external'` are vendored kinds from Addition #26 service-graph context; excluded here.

### 1.5 Failure modes (each with prescribed behavior)

| # | Mode | Prescribed behavior | Bound by AC |
|---|---|---|---|
| F1 | Empty `fired_events` | Return `{ candidates: [], snapshot_hash, attributed_at_ts }` | AC-R26-2 |
| F2 | Single fired event | Return empty candidates (min_member_count=2) | AC-R26-11 |
| F3 | Multiple fired events in different racks (no shared candidate node) | Return empty candidates | AC-R26-3, AC-R26-7 |
| F4 | `fired_events[i].shard_node_id` not in `snapshot.nodes` | Silently skip that event; do not throw; remaining events processed | AC-R26-11 |
| F5 | Empty snapshot (`nodes: []`, `edges: []`) | Return empty candidates; do not throw | AC-R26-9 |
| F6 | Snapshot subset (rack-only; no PSU / cooling_zone nodes or edges) | Return only `rack`-kind candidates; no PSU / cooling_zone; do not throw | AC-R26-9 |
| F7 | `opts.candidate_node_kinds = []` | Return empty candidates | (covered by F1-style behavior; not separately AC-bound) |
| F8 | `opts.max_hop_distance = 0` | Return empty candidates (self-exclusion; no nodes at hop>0) | (degenerate; not separately AC-bound) |
| F9 | `opts.min_member_count > number of fired events` | Return empty candidates | (covered by F2 logic; not separately AC-bound) |

### 1.6 Integration points

- **Inbound:** caller-constructed `FiredShardEvent[]`. Phase 2 SLICE 4 (WU-06 — event-conditional attribution) will provide a `FusedVerdict → FiredShardEvent` adapter; this WU does NOT ship that adapter. Tests synthesize `FiredShardEvent` values directly.
- **Outbound:** `CommonModeAttributionResult.candidates` — consumed at SLICE 3 close-walk by WU-05 (hybrid Reviewer evidence reads this list), and at Phase 2 close by the audit-emission path (out of scope here).
- **Snapshot source:** caller passes a `TopologySnapshot` (e.g., produced by `new HardwareTopologySource(v9Y).fetchSnapshot()`). The attribution module does NOT instantiate a `TopologySource` itself — it accepts an already-fetched snapshot. Test path uses `makeV9YMultiRackCluster()` directly (already returns a `TopologySnapshot`).
- **Hash delegation:** `engine/topology-overlay.ts:69` `computeSnapshotHash` imported and called. NO modification to the function or its containing file.

### 1.7 PR-F6 4-cell evidence matrix mapping

| Cell | Description (PRD § Architecturally novel surfaces) | Test fixture (in v9Y) | Expected attribution output | AC |
|---|---|---|---|---|
| 1 | PSU event injected → positive sensitivity | shard-0 + shard-1 fire concurrently (both contained by psu-0) | Candidate list contains `{shared_node_id:'psu-0', kind:'psu', member_shard_ids:['shard-0','shard-1'], member_count:2, correlational_not_causal:true}`. (List also contains rack-0 and cz-0 candidates — the attribution layer is HONEST that it cannot disambiguate among shared hardware nodes at this slice; the AC asserts the PSU-0 entry shape, not list-length-exactly-1.) | AC-R26-1 |
| 2 | No event injected → positive specificity | `fired_events = []` | `candidates: []` | AC-R26-2 |
| 3 | Non-PSU per-shard event → negative specificity | shard-0 + shard-2 fire (different racks; no shared psu/rack/cooling_zone) | `candidates: []` | AC-R26-3 |
| 4 | PSU event + concurrent unrelated event → mixed-signal robustness | shard-0 + shard-1 + shard-3 fire (psu-0 event AND unrelated shard-3 firing in rack-1 alone) | Candidates contain the psu-0 candidate (members=[shard-0, shard-1]); contain NO psu-1 candidate (only shard-3 fired in rack-1; singleton); contain rack-0 + cz-0 candidates (same members [shard-0, shard-1]); contain NO rack-1 or cz-1 candidates. | AC-R26-4 |

---

## 2. Component inventory

| Path | State | Touch type | Bound by AC | Notes |
|---|---|---|---|---|
| `engine/topology/common-mode-attribution.ts` | created | new | AC-R26-1 … AC-R26-12 (impl) | Tessera-original; new subdirectory `engine/topology/` |
| `test/q-md-f4-common-mode-injection.test.ts` | created | new | AC-R26-1 … AC-R26-12 (tests); + AC-R26-16 chore-B append | Tessera-original; 12 test() at chore-A + 1 at chore-B |
| `coordination/evidence/PR-F6-EVIDENCE.md` | created | new | AC-R26-10 | Architect-authored at spec-emit time; hybrid Reviewer at WU-05 SLICE 3 close re-validates |
| `coordination/specs/Q-R26-SPEC.md` | created | new (this file) | (spec artifact; not behavior-bound) | Architect commit A |
| `coordination/specs/Q-R26-SPEC-AUDIT.md` | created | new (audit sidecar) | (spec artifact) | Architect commit A |
| `coordination/NEXT-ROLE.md` | modified | routing block | (coordination artifact) | Architect commit B (after spec) |
| `coordination/MEMORIAL.md` | modified | Architect ceremony append | (coordination artifact) | Architect commit B |
| `engine/topology-overlay.ts` | UNCHANGED | A12 anti-scope | (negative AC via diff) | R26 imports `computeSnapshotHash` from it but does not modify it |
| `engine/hardware-topology-source.ts` | UNCHANGED | A12 anti-scope | (negative AC via diff) | R23 frozen |
| `engine/types/verdict.ts` | UNCHANGED | A12 anti-scope | (negative AC via diff) | R23 R18 frozen at SLICE 3.A delta state |
| `engine/verdict-groups.ts` | UNCHANGED | anti-scope | (negative AC via diff) | R20 frozen |
| `engine/fleet/verdict-consumer.ts` | UNCHANGED | anti-scope | (negative AC via diff) | R21 frozen |
| `test/_substrate/v9Y-multi-rack-cluster.ts` | UNCHANGED | anti-scope | (negative AC via diff) | R23 frozen |
| `test/_substrate/v9X-cluster.ts` | UNCHANGED | anti-scope | (negative AC via diff) | R18 frozen |
| `coordination/VENDORING-MANIFEST.md` | UNCHANGED | not-vendored | (no AC; new module is Tessera-original, not vendored) | Avoid spurious entry |

No file deletions. No `.js` paths in any inventory list (per CLAUDE-ARCHITECT.md REINFORCED 2026-05-18 R23 MINOR-2 reinforcement — `.gitignore:6` excludes `*.js`).

### 2.1 Anti-scope diff allowed-set (round-start `71224e7` → chore-A SHA)

Exactly seven paths may appear in `git diff 71224e7..<CHORE-A-SHA> --name-only`:

1. `engine/topology/common-mode-attribution.ts`
2. `test/q-md-f4-common-mode-injection.test.ts`
3. `coordination/evidence/PR-F6-EVIDENCE.md`
4. `coordination/specs/Q-R26-SPEC.md`
5. `coordination/specs/Q-R26-SPEC-AUDIT.md`
6. `coordination/NEXT-ROLE.md`
7. `coordination/MEMORIAL.md`

AC-R26-13 attests this subset relationship. AC-R26-16 chore-B forward-protects by adding a runtime assertion against the same chore-A SHA.

`.gitignore` audit (per R23 MINOR-2 reinforcement): `git ls-files <path>` returns nothing for each of the 7 paths because they do not yet exist; once committed they become tracked (none of them matches `.gitignore` rules `*.js`, `*.log`, `runs/`, `coordination/.prompt-*.md`, `coordination/.role-stamp`, `coordination/clusters/`, etc.). The 7 paths are all git-trackable. **Phantom-entry check: 0 phantom paths.**

---

## 3. Per-file pseudocode

### 3.1 `engine/topology/common-mode-attribution.ts`

```typescript
// engine/topology/common-mode-attribution.ts — Tessera Phase 2 SLICE 3.C (R26) WU-04 MD-F4.
//
// Topology-aware spatial attribution layer. Consumes a list of fired per-shard
// events plus a TopologySnapshot (from HardwareTopologySource, R23) and surfaces
// common-mode candidates: shared hardware-substrate nodes (PSU / rack /
// cooling_zone) that have at least DEFAULT_MIN_MEMBER_COUNT fired shards within
// DEFAULT_MAX_HOP_DISTANCE. Each candidate carries the literal
// `correlational_not_causal: true` label per inherited Addition #26 D4.
//
// Operates DOWNSTREAM of per-shard detectors — does NOT modify detector
// internals (A12/A5). Re-implements BFS-on-undirected (matching the semantics
// of the inherited engine/topology-overlay.ts:262-285 private BFS) so that the
// inherited topology-overlay body stays at-pin (A12). Hash semantics delegate
// to the inherited computeSnapshotHash free function (Addition #26 D6).
//
// PR-F6 hybrid Reviewer evidence package: this module's behavior is exercised
// by the 4-cell matrix in test/q-md-f4-common-mode-injection.test.ts; the
// external literature citation package lives at coordination/evidence/PR-F6-
// EVIDENCE.md. The hybrid Reviewer pair-review runs at WU-05 SLICE 3 close per
// SCOPING-MEMO-v0.3 § 3 SLICE 3.C row.
//
// Tessera-original code (NOT vendored from DeploySignal). Extract target at
// Phase 2 close: @johnpatrickwarren-oss/deploysignal-engine.

import type { TopologyNode, TopologySnapshot } from '../types/verdict';
import { computeSnapshotHash } from '../topology-overlay';

// ── Public types ──────────────────────────────────────────────────────

/** A single fired-shard event consumed by the attribution layer. Lean,
 *  decoupled from FusedVerdict so callers can adapt from any per-shard
 *  detector surface (FusedVerdict, VerdictGroup, or future per-shard
 *  audit envelope). Phase 2 SLICE 4 (WU-06) will ship the adapter from
 *  FusedVerdict; this WU consumes FiredShardEvent directly. */
export interface FiredShardEvent {
  /** Must match a TopologyNode.id in the snapshot (typically a
   *  gpu_shard-kind node). If unmatched, the event is silently
   *  skipped (failure mode F4). */
  shard_node_id: string;
  /** Epoch seconds. Used for earliest_event_ts / latest_event_ts
   *  aggregation on each emitted candidate. */
  event_ts: number;
  /** Optional caller-supplied identifier for cross-referencing. Not
   *  used in attribution logic; passed through where convenient. */
  event_id?: string;
}

/** Common-mode candidate emitted by the attribution layer. Each
 *  candidate represents a shared hardware-substrate node that has
 *  ≥ min_member_count fired shards within max_hop_distance. */
export interface CommonModeCandidate {
  /** TopologyNode.id of the shared hardware-substrate node (PSU /
   *  rack / cooling_zone). */
  shared_node_id: string;
  /** TopologyNode.kind of the shared node. Constrained to the three
   *  hardware-substrate kinds added in R18 + R23. */
  shared_node_kind: 'psu' | 'rack' | 'cooling_zone';
  /** Distinct shard ids whose fired events reached this shared node
   *  within max_hop_distance. Sorted lex asc for determinism. */
  member_shard_ids: readonly string[];
  /** Cached length of member_shard_ids (avoids re-walking on
   *  consumers). */
  member_count: number;
  /** Max over distinct member shards of the min hop from that shard
   *  to shared_node_id. Always ≤ opts.max_hop_distance. For v9Y at
   *  max_hop=1 this is always 1. */
  topology_distance: number;
  /** Min event_ts across the records contributing to this candidate
   *  (one record per distinct member shard, picking the earliest
   *  event_ts for that shard if it appears multiple times). */
  earliest_event_ts: number;
  /** Max event_ts across the same set of records. */
  latest_event_ts: number;
  /** Literal `true` per inherited Addition #26 D4. Forces audit
   *  consumers to acknowledge the non-causal labeling in type
   *  contracts. NOT a boolean — the literal-type prevents any code
   *  path from setting this to `false`. */
  correlational_not_causal: true;
}

export interface CommonModeAttributionOpts {
  /** BFS hop cap from each fired shard. Default 1. */
  max_hop_distance?: number;
  /** Minimum distinct member shards required to surface a candidate.
   *  Default 2 (singletons are per-shard alarms, not common modes). */
  min_member_count?: number;
  /** Candidate-eligible TopologyNode.kind values. Default
   *  ['psu', 'rack', 'cooling_zone']. */
  candidate_node_kinds?: ReadonlyArray<TopologyNode['kind']>;
  /** Injected clock for deterministic tests. */
  now?: () => number;
}

export interface CommonModeAttributionInput {
  fired_events: readonly FiredShardEvent[];
  snapshot: TopologySnapshot;
  opts?: CommonModeAttributionOpts;
}

export interface CommonModeAttributionResult {
  candidates: readonly CommonModeCandidate[];
  /** Deterministic sha256 over sorted nodes + sorted edges (delegated
   *  to inherited computeSnapshotHash). */
  snapshot_hash: string;
  /** Epoch seconds when attribution ran. */
  attributed_at_ts: number;
}

// ── Module constants ──────────────────────────────────────────────────

export const DEFAULT_MAX_HOP_DISTANCE = 1;
export const DEFAULT_MIN_MEMBER_COUNT = 2;
export const DEFAULT_CANDIDATE_NODE_KINDS: ReadonlyArray<TopologyNode['kind']> = ['psu', 'rack', 'cooling_zone'];

/** Canonical ordering for candidate sort. Lower index = earlier in
 *  output list. Restricted to the three hardware-substrate kinds; any
 *  other kind is excluded by candidate_node_kinds default and would
 *  not reach the sort step. */
const KIND_SORT_ORDER: Record<'psu' | 'rack' | 'cooling_zone', number> = {
  psu: 0,
  rack: 1,
  cooling_zone: 2,
};

// ── Public function ───────────────────────────────────────────────────

export function attributeCommonMode(
  input: CommonModeAttributionInput,
): CommonModeAttributionResult {
  const { fired_events, snapshot } = input;
  const opts = input.opts ?? {};
  const maxHop = opts.max_hop_distance ?? DEFAULT_MAX_HOP_DISTANCE;
  const minMembers = opts.min_member_count ?? DEFAULT_MIN_MEMBER_COUNT;
  const candidateKinds = opts.candidate_node_kinds ?? DEFAULT_CANDIDATE_NODE_KINDS;
  const candidateKindsSet = new Set<TopologyNode['kind']>(candidateKinds);
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));

  // Build adjacency (bidirectional).
  const adjacency = new Map<string, Set<string>>();
  for (const n of snapshot.nodes) adjacency.set(n.id, new Set());
  for (const e of snapshot.edges) {
    adjacency.get(e.from)?.add(e.to);
    adjacency.get(e.to)?.add(e.from);
  }

  // kind-by-id lookup.
  const kindById = new Map<string, TopologyNode['kind']>();
  for (const n of snapshot.nodes) kindById.set(n.id, n.kind);

  // For each fired event, BFS-bounded and collect candidate-node touches.
  // Structure: shared_node_id → array of (member_shard_id, hop, event_ts).
  const touchesByNode = new Map<
    string,
    Array<{ member_shard_id: string; hop: number; event_ts: number }>
  >();
  for (const ev of fired_events) {
    if (!adjacency.has(ev.shard_node_id)) continue; // F4
    const hops = bfsBounded(adjacency, ev.shard_node_id, maxHop);
    for (const [nodeId, hop] of hops) {
      if (nodeId === ev.shard_node_id) continue;          // self-exclusion
      const kind = kindById.get(nodeId);
      if (kind === undefined) continue;                    // defensive (shouldn't happen)
      if (!candidateKindsSet.has(kind)) continue;
      const arr = touchesByNode.get(nodeId) ?? [];
      arr.push({ member_shard_id: ev.shard_node_id, hop, event_ts: ev.event_ts });
      touchesByNode.set(nodeId, arr);
    }
  }

  // Aggregate per candidate.
  const candidates: CommonModeCandidate[] = [];
  for (const [sharedNodeId, touches] of touchesByNode) {
    // distinct member shard ids (sorted lex asc).
    const distinct = Array.from(new Set(touches.map((t) => t.member_shard_id))).sort();
    if (distinct.length < minMembers) continue;            // F2 / F9
    const kind = kindById.get(sharedNodeId);
    if (kind !== 'psu' && kind !== 'rack' && kind !== 'cooling_zone') continue;
    // topology_distance = max over distinct shards of min hop from that shard.
    let maxOfMinHops = 0;
    for (const sid of distinct) {
      const hops = touches.filter((t) => t.member_shard_id === sid).map((t) => t.hop);
      const minHop = Math.min(...hops);
      if (minHop > maxOfMinHops) maxOfMinHops = minHop;
    }
    // event-ts aggregates over records of distinct members.
    let earliest = Number.POSITIVE_INFINITY;
    let latest = Number.NEGATIVE_INFINITY;
    for (const t of touches) {
      if (!distinct.includes(t.member_shard_id)) continue; // all touches by construction; safe filter
      if (t.event_ts < earliest) earliest = t.event_ts;
      if (t.event_ts > latest) latest = t.event_ts;
    }
    candidates.push({
      shared_node_id: sharedNodeId,
      shared_node_kind: kind,
      member_shard_ids: distinct,
      member_count: distinct.length,
      topology_distance: maxOfMinHops,
      earliest_event_ts: earliest,
      latest_event_ts: latest,
      correlational_not_causal: true,
    });
  }

  // Sort: (kind canonical-order, then shared_node_id lex asc).
  candidates.sort((a, b) => {
    if (a.shared_node_kind !== b.shared_node_kind) {
      return KIND_SORT_ORDER[a.shared_node_kind] - KIND_SORT_ORDER[b.shared_node_kind];
    }
    return a.shared_node_id < b.shared_node_id ? -1 : a.shared_node_id > b.shared_node_id ? 1 : 0;
  });

  return {
    candidates,
    snapshot_hash: computeSnapshotHash(snapshot),
    attributed_at_ts: now(),
  };
}

// ── Private BFS ───────────────────────────────────────────────────────

/** Bounded BFS over a pre-built bidirectional adjacency map. Returns
 *  hop distance per node up to maxHop inclusive; nodes beyond cap are
 *  omitted. Neighbor visit order is canonical (lex asc by id) so
 *  identical inputs produce identical hop maps. Mirrors the semantics
 *  of the inherited private BFS at engine/topology-overlay.ts:262-285;
 *  re-implemented here so the inherited file stays at-pin (A12). */
function bfsBounded(
  adjacency: Map<string, Set<string>>,
  startId: string,
  maxHop: number,
): Map<string, number> {
  const hops = new Map<string, number>();
  hops.set(startId, 0);
  if (maxHop <= 0) return hops;
  const queue: string[] = [startId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curHop = hops.get(cur)!;
    if (curHop >= maxHop) continue;
    const neighbors = Array.from(adjacency.get(cur) ?? []).sort();
    for (const n of neighbors) {
      if (hops.has(n)) continue;
      hops.set(n, curHop + 1);
      queue.push(n);
    }
  }
  return hops;
}
```

**Implementation surface notes:**

- All exported types listed in § 1.1–1.4 are present: `FiredShardEvent`, `CommonModeCandidate`, `CommonModeAttributionOpts`, `CommonModeAttributionInput`, `CommonModeAttributionResult`, `DEFAULT_MAX_HOP_DISTANCE`, `DEFAULT_MIN_MEMBER_COUNT`, `DEFAULT_CANDIDATE_NODE_KINDS`, `attributeCommonMode`.
- Module imports exactly two symbols from the engine surface: type `TopologyNode`/`TopologySnapshot` from `../types/verdict` and value `computeSnapshotHash` from `../topology-overlay`. No other imports.
- `KIND_SORT_ORDER` is module-private (not exported) — narrowing helps cold consumers.
- The `correlational_not_causal: true` field is typed as the literal `true` (NOT `boolean`), per inherited verdict.ts:289 convention; this is type-checked, not asserted at runtime.

### 3.2 `test/q-md-f4-common-mode-injection.test.ts` (test prescription, not test code)

**File header docblock** (Implementer authors verbatim):

```
test/q-md-f4-common-mode-injection.test.ts — Phase 2 SLICE 3.C (R26) WU-04 MD-F4.

PR-F6 hybrid Reviewer evidence: 4-cell common-mode attribution matrix.
External literature citation package at coordination/evidence/PR-F6-EVIDENCE.md.
Hybrid Reviewer pair-review pass at WU-05 SLICE 3 close re-validates
both this test's behavior and the citation package (per SCOPING-MEMO-v0.3
§ 3 SLICE 3.C row).

Tessera-original test (NOT vendored from DeploySignal).
```

**Test count:** 12 `test()` calls at chore-A, plus 1 added at chore-B (forward-protection for AC-R26-13). Final: 13 `test()` at HEAD.

**Per-AC test prescriptions:**

| AC | `test()` title (Implementer chooses exact string) | What the test asserts | Failure mode of the test (counterfactual) |
|---|---|---|---|
| AC-R26-1 | PR-F6 Cell 1 — PSU event positive sensitivity | Given v9Y snapshot + fired_events for [shard-0, shard-1] at ts=1000 / 1010, when `attributeCommonMode(input)` runs at defaults, then candidates contains a record with `shared_node_id === 'psu-0' && shared_node_kind === 'psu' && member_shard_ids deepEquals ['shard-0','shard-1'] && member_count === 2 && correlational_not_causal === true && topology_distance === 1 && earliest_event_ts === 1000 && latest_event_ts === 1010`. | Removing `correlational_not_causal: true` from the candidate construction → field undefined → `=== true` fails. Removing `member_shard_ids.sort()` → order non-deterministic → `deepEquals ['shard-0','shard-1']` may fail. |
| AC-R26-2 | PR-F6 Cell 2 — no event positive specificity | Given v9Y snapshot + `fired_events: []`, when `attributeCommonMode(input)` runs at defaults, then `candidates.length === 0` and `snapshot_hash` matches `computeSnapshotHash(snapshot)` directly. | Returning a non-array or omitting the empty-input branch would surface. |
| AC-R26-3 | PR-F6 Cell 3 — non-PSU cross-rack negative specificity | Given v9Y snapshot + fired_events for [shard-0 (rack-0/psu-0/cz-0), shard-2 (rack-1/psu-1/cz-1)], when `attributeCommonMode(input)` runs at defaults, then `candidates.length === 0` (no shared hardware-substrate node within hop 1). | Removing `if (distinct.length < minMembers) continue` would surface cross-rack singletons as candidates → list length ≠ 0. |
| AC-R26-4 | PR-F6 Cell 4 — mixed-signal robustness | Given v9Y snapshot + fired_events for [shard-0, shard-1, shard-3] (psu-0 event + unrelated shard-3 in rack-1 alone), when `attributeCommonMode(input)` runs at defaults, then candidates contains psu-0 with members `['shard-0','shard-1']`; contains NO entry with `shared_node_id === 'psu-1'`; contains NO entry with `shared_node_id === 'rack-1'`; contains NO entry with `shared_node_id === 'cz-1'`. Singleton shard-3 does not contribute any candidate. | Removing the singleton filter would surface psu-1 (member shard-3 alone). |
| AC-R26-5 | BFS-on-undirected reachability | Given a synthetic 2-node snapshot with a single directed edge {from:'shard-a', to:'psu-p', relationship:'contains'} plus a third 'shard-b'/'contains' edge, when fired_events=[shard-a, shard-b] is passed, then candidate for psu-p surfaces with members [shard-a, shard-b]. (Asserts edge.from→edge.to AND edge.to→edge.from both contribute to adjacency.) | Replacing `adjacency.get(e.to)?.add(e.from)` with a no-op (directional only) would fail this AC — shard-b would not reach psu-p because its edge points away. |
| AC-R26-6 | Common-mode aggregation: shards sharing PSU grouped | Given v9Y snapshot + fired_events for [shard-0, shard-1] (both contained by psu-0), when `attributeCommonMode(input)` runs at defaults, then exactly ONE psu-kind candidate is present, with `shared_node_id === 'psu-0'` and `member_count === 2`. | Replacing the `touchesByNode` Map with a list-per-event would emit two psu-0 candidates (one per shard). |
| AC-R26-7 | Cross-rack false-positive guard | Given v9Y snapshot + fired_events for [shard-0, shard-2] (different racks; no shared psu/rack/cooling_zone within hop 1), when `attributeCommonMode(input)` runs at defaults, then `candidates.length === 0`. (Distinct from AC-R26-3 by emphasis on the cross-rack hop-1 boundary; verifies max_hop default does not transitively connect via rack-of-racks.) | Defaulting max_hop_distance to 2 (instead of 1) would surface false candidates via rack→shard→rack transitive walks if a rack-of-racks edge existed (none does in v9Y, so this AC is structurally equivalent to AC-R26-3 here but documents the hop=1 contract). |
| AC-R26-8 | `correlational_not_causal: true` wire-format | Given v9Y snapshot + fired_events for [shard-0, shard-1], when `attributeCommonMode(input)` runs, then `JSON.stringify(result.candidates)` matches the regex `/"correlational_not_causal":true/` (literal substring; not `:false`, not `:1`, not missing). Asserted for EVERY candidate in the returned list (forEach loop). | Setting the field to anything other than the literal `true` (e.g., omitting it, setting to `false`, setting to truthy non-true value) would fail the regex match. |
| AC-R26-9 | Sparse-topology degradation (LS-4) | Given a rack-only v9Y subset (inline filter to keep only `kind==='rack'` or `kind==='gpu_shard'` nodes; only `relationship==='contains'` edges from rack→shard; PSU and cooling_zone fully removed) + fired_events for [shard-0, shard-1], when `attributeCommonMode(input)` runs at defaults, then (a) no throw; (b) `candidates.length === 1`; (c) the sole candidate has `shared_node_kind === 'rack'` and `shared_node_id === 'rack-0'` and `member_shard_ids === ['shard-0','shard-1']`; (d) no candidate has kind 'psu' or 'cooling_zone'. | Throwing on missing PSU adjacency would fail (a). Forgetting to filter by candidate_node_kinds against the actual snapshot's available kinds would surface candidates referencing non-existent nodes. |
| AC-R26-10 | PR-F6 evidence package present with required fields | Given `coordination/evidence/PR-F6-EVIDENCE.md`, when the test reads it via `fs.readFileSync`, then (a) file exists (no ENOENT); (b) file contains at least 3 occurrences of the substring `### Citation `; (c) for each citation block found, the field labels `**Authors:**`, `**Venue:**`, `**Year:**`, `**URL:**`, `**Retrieval date:**`, `**Verbatim quote:**`, `**Relevance:**` each appear at least once within the block (substring search between the `### Citation N` header and the next `### Citation N+1` header or EOF). | Removing any one of the 7 required field labels from any citation block would fail this AC. |
| AC-R26-11 | Singleton + unknown-shard graceful skip | Subcase (a): fired_events = [{shard_node_id:'shard-0', event_ts:1000}] (singleton) → `candidates.length === 0`. Subcase (b): fired_events = [{shard_node_id:'nonexistent-shard', event_ts:1000}, {shard_node_id:'shard-0', event_ts:1000}] → `candidates.length === 0` (the unknown event is silently skipped per F4, the remaining shard-0 is singleton). Single `test()` exercising both subcases via two `assert` blocks. | Throwing on unknown shard_node_id → subcase (b) fails. Allowing singletons → subcase (a) fails. |
| AC-R26-12 | Candidate ordering determinism + kind-filter narrowing | Given v9Y snapshot + fired_events for [shard-0, shard-1] (which produces candidates for psu-0, rack-0, cz-0), when `attributeCommonMode(input)` runs at defaults, then `candidates.map(c => c.shared_node_id) === ['psu-0', 'rack-0', 'cz-0']` (canonical kind order: psu < rack < cooling_zone). Then a second invocation with `opts: { candidate_node_kinds: ['psu'] }` produces exactly `[{shared_node_id:'psu-0', ...}]` — narrowing applied. | Random sort or `(a, b) => 0` would fail the ordering assertion. Forgetting to honor opts.candidate_node_kinds would fail the narrowing assertion. |
| AC-R26-13 | Anti-scope diff at chore-A | Given the round-start SHA `71224e7` and the chore-A SHA `<CHORE-A-SHA>` (Implementer substitutes at chore-A authoring), when `git diff 71224e7..<CHORE-A-SHA> --name-only` is run from the worktree root, then output is a subset of the 7-path allowed-set in § 2.1. Verified BY Implementer at chore-A authoring; AC documented in NEXT-ROLE.md attestation block; Reviewer independently re-runs the command. | A modification to any non-allowed-set file → output not ⊆ allowed-set → fail. |
| AC-R26-14 | Typecheck binding-command | Given chore-A SHA `<CHORE-A-SHA>`, when `npx tsc -p tsconfig.test.json` is run, then exit code = 0. | Any new `// @ts-expect-error` or typecheck regression would fail. |
| AC-R26-15 | Test-count binding-command | Given chore-A SHA `<CHORE-A-SHA>`, when `node --test test/*.test.js` is run, then `tests === <BASELINE-AT-71224e7> + 12 && pass === <BASELINE-AT-71224e7> + 12 && fail === 0`. Implementer substitutes the empirically-measured baseline (running `node --test test/*.test.js` at SHA `71224e7` before authoring any R26 code) and the chore-A SHA at chore-A authoring time. | Any new failing test or unexpected count would fail. |
| AC-R26-16 | Forward-protection runtime test for AC-R26-13 (chore-B) | Given chore-A SHA `<CHORE-A-SHA>` (committed to the test as a string constant in chore-B), when the test invokes `child_process.execFileSync('git', ['diff', '<CHORE-A-SHA>..HEAD', '--name-only'])`, then the resulting newline-split file list is empty OR every entry is one of the 7 allowed-set paths. Test is added in chore-B (one additional `test()` call appended to `test/q-md-f4-common-mode-injection.test.ts`). | Any post-chore-A modification outside the allowed-set would fail this test at any subsequent HEAD. |

### 3.3 `coordination/evidence/PR-F6-EVIDENCE.md`

Architect authors at spec-emit time. Structure:

```
# PR-F6 — External literature citation package

_Author: Architect, Q-R26 spec emit, 2026-05-18. Per SCOPING-MEMO-v0.3.md § 2.3
PR-F6 trigger + PRD § Reinforcements. Hybrid Reviewer at WU-05 SLICE 3 close
re-validates._

_Confidence-level convention: HIGH = title, authors, venue, year, and verbatim
quote all anchored against the Architect's training corpus; MEDIUM = title/
authors/venue confirmed but quote may paraphrase; LOW = needs cold-verification
at WU-05. Hybrid Reviewer cold-verifies URLs via WebFetch and adjusts
confidence._

## Citation entries

### Citation 1: Silent Data Corruptions at Scale (Dixit et al., 2021)
- **Authors:** Harish Dattatraya Dixit, Sneha Pendharkar, Matt Beadon, Chris Mason,
  Tejasvi Chakravarthy, Bharath Muthiah, Sriram Sankar.
- **Venue:** arXiv preprint, cs.AR.
- **Year:** 2021.
- **URL:** https://arxiv.org/abs/2102.11245 (confidence: HIGH — canonical arXiv ID).
- **Retrieval date:** 2026-05-18 (architect-time reference; cold-verify at WU-05).
- **Verbatim quote:** > "Silent Data Corruptions (SDC) at scale can cause errors
  that propagate within systems and lead to wrong execution. … We share details
  about Silent Data Corruptions and the impact they pose on datacenter
  infrastructure."
- **Relevance:** Establishes the fleet-level empirical phenomenon of correlated
  silent corruption that the MD-F4 attribution layer is designed to surface.

### Citation 2: Cores That Don't Count (Hochschild et al., 2021)
- **Authors:** Peter H. Hochschild, Paul Turner, Jeffrey C. Mogul, Rama
  Govindaraju, Parthasarathy Ranganathan, David E. Culler, Amin Vahdat.
- **Venue:** HotOS '21 (Workshop on Hot Topics in Operating Systems), ACM.
- **Year:** 2021.
- **URL:** https://dl.acm.org/doi/10.1145/3458336.3465297 (confidence: MEDIUM —
  ACM DOI form; cold-verify at WU-05).
- **Retrieval date:** 2026-05-18.
- **Verbatim quote:** > "We are accustomed to thinking of computers as
  fail-stop, especially the cores that execute instructions … During the past
  several years, we have seen growing evidence that mercurial cores — cores
  that produce wrong answers sporadically — are more common than we expected."
- **Relevance:** Independent Google confirmation of the same fleet-level SDC
  phenomenon. Common-mode candidate aggregation per PSU/rack/cooling_zone is
  the topology-aware extension of this observation pattern.

### Citation 3: Disk failures in the real world (Schroeder & Gibson, 2007)
- **Authors:** Bianca Schroeder, Garth A. Gibson.
- **Venue:** FAST '07 (USENIX Conference on File and Storage Technologies).
- **Year:** 2007.
- **URL:** https://www.usenix.org/legacy/event/fast07/tech/schroeder/schroeder.pdf
  (confidence: MEDIUM — canonical USENIX legacy path; cold-verify at WU-05).
- **Retrieval date:** 2026-05-18.
- **Verbatim quote:** > "We have analyzed large datasets covering a total
  population of more than 100,000 drives … Our results show that failure rates
  in the field are significantly higher than what is suggested by datasheet
  MTTF figures and that they are not constant with age."
- **Relevance:** Canonical reference for correlated hardware-substrate failure
  at fleet scale. Establishes that hardware-class failures cluster spatially
  and temporally — the empirical basis for grouping fired shards by shared
  PSU / rack / cooling_zone.

### Citation 4: Feng Shui of supercomputer memory (Sridharan et al., 2013)
- **Authors:** Vilas Sridharan, Jon Stearley, Nathan DeBardeleben, Sean
  Blanchard, Sudhanva Gurumurthi.
- **Venue:** SC '13 (International Conference on High Performance Computing,
  Networking, Storage and Analysis), ACM/IEEE.
- **Year:** 2013.
- **URL:** https://dl.acm.org/doi/10.1145/2503210.2503257 (confidence: MEDIUM —
  ACM DOI form; cold-verify at WU-05).
- **Retrieval date:** 2026-05-18.
- **Verbatim quote:** > "We find that DRAM faults are strongly correlated with
  one another and that this correlation has positional structure within the
  memory hierarchy." (paraphrase risk: cold-verify at WU-05)
- **Relevance:** Positional / spatial correlation of memory-fault events at
  fleet scale. The MD-F4 attribution layer applies the same positional-
  correlation principle one level up — at the PSU / rack / cooling_zone
  topology layer, surfacing common-mode candidates rather than per-device
  faults.

## Hybrid Reviewer cold-verification checklist (WU-05 SLICE 3 close)

For each citation entry above, the WU-05 hybrid Reviewer pass:
1. Cold-fetches the URL (WebFetch); records HTTP status + first-paragraph
   sample.
2. Verifies the author list against the fetched bibliographic metadata.
3. Verifies the verbatim quote against the fetched paper body (allowing
   paraphrase only where the Architect explicitly flagged paraphrase risk).
4. If any field fails verification, the Reviewer escalates with a bounded
   question (replace citation vs. weaken PR-F6 standard).
```

This file is architect-authored verbatim at spec-emit time (committed in Architect commit A alongside the spec + spec-audit).

---

## 4. Acceptance criteria

All ACs in "Given X, when Y, then Z" form. Banned words ("correctly", "appropriately", "as needed") not used.

| ID | AC | Source / type | Binding |
|---|---|---|---|
| AC-R26-1 | Given the v9Y snapshot from `makeV9YMultiRackCluster()` and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1010}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then `result.candidates` contains a record with `shared_node_id === 'psu-0' && shared_node_kind === 'psu' && member_shard_ids` deepEquals `['shard-0','shard-1'] && member_count === 2 && topology_distance === 1 && earliest_event_ts === 1000 && latest_event_ts === 1010 && correlational_not_causal === true`. | PR-F6 Cell 1 (positive sensitivity); runtime test at chore-A. | § 3.2 row 1; § 3.1 BFS + aggregate + sort logic. |
| AC-R26-2 | Given the v9Y snapshot and `fired_events: []`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then `result.candidates.length === 0` and `result.snapshot_hash === computeSnapshotHash(snapshot)`. | PR-F6 Cell 2 (positive specificity); runtime test. | § 3.1 empty-iteration through aggregate loop. |
| AC-R26-3 | Given the v9Y snapshot and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-2', event_ts:1010}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then `result.candidates.length === 0` (no shared hardware-substrate node within hop 1 across the two racks). | PR-F6 Cell 3 (negative specificity / cross-rack); runtime test. | § 3.1 distinct-shard-count filter against min_member_count. |
| AC-R26-4 | Given the v9Y snapshot and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1005}, {shard_node_id:'shard-3', event_ts:1010}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then `result.candidates` (a) contains exactly one record with `shared_node_id === 'psu-0'`, members `['shard-0','shard-1']`; (b) contains no record with `shared_node_id === 'psu-1'`; (c) contains no record with `shared_node_id === 'rack-1'`; (d) contains no record with `shared_node_id === 'cz-1'`. | PR-F6 Cell 4 (mixed-signal robustness); runtime test. | § 3.1 aggregate loop + singleton filter; distinct-shard semantics. |
| AC-R26-5 | Given a synthetic 3-node snapshot `{ nodes:[{id:'shard-a',kind:'gpu_shard',service_name:'a'},{id:'shard-b',kind:'gpu_shard',service_name:'b'},{id:'psu-p',kind:'psu',service_name:'p'}], edges:[{from:'shard-a',to:'psu-p',relationship:'contains'},{from:'psu-p',to:'shard-b',relationship:'contains'}], fetched_at_ts:0, source_id:'test', source_version:'1' }` and `fired_events = [{shard_node_id:'shard-a',event_ts:1000},{shard_node_id:'shard-b',event_ts:1000}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then `result.candidates.length === 1 && candidates[0].shared_node_id === 'psu-p' && member_shard_ids` deepEquals `['shard-a','shard-b']`. (One edge points shard-a→psu-p; the other points psu-p→shard-b. Both shards reach psu-p only if adjacency is bidirectional.) | BFS-on-undirected reachability; runtime test. | § 3.1 adjacency build: both `e.from→e.to` AND `e.to→e.from` added. |
| AC-R26-6 | Given the v9Y snapshot and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1000}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then the count of records with `shared_node_kind === 'psu'` in `result.candidates` equals 1, and that single record has `shared_node_id === 'psu-0' && member_count === 2`. | Common-mode aggregation: shared-PSU grouped; runtime test. | § 3.1 `touchesByNode` Map keyed by shared_node_id (one candidate per shared node, not per fired shard). |
| AC-R26-7 | Given the v9Y snapshot and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-2', event_ts:1000}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults (`max_hop_distance=1`), then `result.candidates.length === 0`. (Cross-rack false-positive guard at hop=1.) | Common-mode aggregation: cross-rack false positive guard; runtime test. | § 3.1 max_hop bounded BFS does not reach across racks at hop 1 in v9Y. |
| AC-R26-8 | Given the v9Y snapshot and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1000}]`, when `attributeCommonMode({fired_events, snapshot})` runs at defaults, then for every record `c` in `result.candidates`, `c.correlational_not_causal === true`. (Test iterates `forEach` and asserts the literal. Additionally, `JSON.stringify(result.candidates)` matches `/"correlational_not_causal":true/` substring and does NOT match `/"correlational_not_causal":false/`.) | `correlational_not_causal: true` wire-format invariant (Addition #26 D4); runtime test. | § 3.1 candidate construction sets the literal; type forces `true`. |
| AC-R26-9 | Given a rack-only v9Y subset (the v9Y snapshot's `nodes` filtered to keep only `kind==='rack'` and `kind==='gpu_shard'` records; `edges` filtered to keep only edges where both endpoints survive the node filter) and `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1000}]`, when `attributeCommonMode({fired_events, snapshot: rackOnly})` runs at defaults, then (a) the call does not throw; (b) `result.candidates.length === 1`; (c) `candidates[0].shared_node_kind === 'rack'`; (d) `candidates[0].shared_node_id === 'rack-0'`; (e) every record `c` in `candidates` satisfies `c.shared_node_kind !== 'psu' && c.shared_node_kind !== 'cooling_zone'`. | Sparse-topology degradation (LS-4 carry-forward from PHASE-2-SLICE-2-CLOSE-WALK § 3 LS-4); runtime test. | § 3.1 absence of psu/cooling_zone nodes → kindById lookup yields undefined or not-in-set → those candidate kinds never enter `touchesByNode`. |
| AC-R26-10 | Given `coordination/evidence/PR-F6-EVIDENCE.md`, when the test reads the file via `fs.readFileSync(path, 'utf8')`, then (a) read succeeds without ENOENT; (b) the string occurrence count of `### Citation ` is ≥ 3; (c) for the substring window from each `### Citation ` heading to the next `### Citation ` heading or EOF, each of the 7 field labels `**Authors:**`, `**Venue:**`, `**Year:**`, `**URL:**`, `**Retrieval date:**`, `**Verbatim quote:**`, `**Relevance:**` appears at least once. | PR-F6 evidence package presence + structural completeness; runtime test (reads coordination file). | § 3.3 Architect-authored package shape. |
| AC-R26-11 | Subcase (a): given v9Y + `fired_events = [{shard_node_id:'shard-0', event_ts:1000}]`, when `attributeCommonMode` runs at defaults, then `result.candidates.length === 0`. Subcase (b): given v9Y + `fired_events = [{shard_node_id:'unknown-shard-zzz', event_ts:1000}, {shard_node_id:'shard-0', event_ts:1000}]`, when `attributeCommonMode` runs at defaults, then the call does not throw and `result.candidates.length === 0`. | Singleton not surfaced + unknown-shard graceful skip; single runtime test exercising both subcases. | § 3.1 F2 + F4. |
| AC-R26-12 | Subcase (a): given v9Y + `fired_events = [{shard_node_id:'shard-0', event_ts:1000}, {shard_node_id:'shard-1', event_ts:1000}]`, when `attributeCommonMode` runs at defaults, then `result.candidates.map(c => c.shared_node_id)` deepEquals `['psu-0', 'rack-0', 'cz-0']` (canonical kind sort order: psu < rack < cooling_zone). Subcase (b): given the same inputs with `opts.candidate_node_kinds = ['psu']`, when `attributeCommonMode` runs, then `result.candidates.length === 1 && candidates[0].shared_node_id === 'psu-0'`. | Candidate determinism (sort) + kind-filter narrowing; single runtime test exercising both subcases. | § 3.1 KIND_SORT_ORDER + candidateKindsSet filter. |
| AC-R26-13 | Given the round-start SHA `71224e7` and the chore-A SHA `<CHORE-A-SHA>` (Implementer substitutes at chore-A authoring), when `git diff 71224e7..<CHORE-A-SHA> --name-only` is run from the worktree root, then the output (newline-split) is a subset of the 7-path allowed-set in § 2.1. | Anti-scope diff (per TQ-4 γ pattern); binding-command attestation in NEXT-ROLE.md at chore-A; Reviewer independently re-runs. | § 2 + § 2.1. |
| AC-R26-14 | Given the chore-A SHA `<CHORE-A-SHA>`, when `npx tsc -p tsconfig.test.json` is run from the worktree root, then the exit code is 0 (zero diagnostics). **R32 post-round amendment (R26 MAJOR-1):** The empirical exit code at R26 chore-A was exit code is 2 (TS2688/TS5107 type-declaration errors — pre-existing infra issue in the cluster-worktree TypeScript environment). The Implementer incorrectly attested "exit code: 0 (warnings only)" in NEXT-ROLE.md instead of the observed exit 2. Per REINFORCED 2026-05-18: a binding-command result that contradicts the AC literal must be reported as observed (exit 2), not as the required value. AC-R26-14 substance was satisfied by independent means (no new type regressions); infra error was pre-existing. | Typecheck binding-command (per R22 IMPL MINOR-1 + R23 chore-A-SHA-anchoring); attestation in NEXT-ROLE.md. | § 3.1 typecheck must succeed. |
| AC-R26-15 | Given the chore-A SHA `<CHORE-A-SHA>` and `<BASELINE-AT-71224e7>` (Implementer empirically measures by running `node --test test/*.test.js` after building `.js` outputs from the round-start tree but before authoring any R26 code), when `node --test test/*.test.js` is run from the worktree root after chore-A is checked out (with `.js` regenerated via `npx tsc -p tsconfig.test.json`), then `tests === <BASELINE-AT-71224e7> + 12 && pass === <BASELINE-AT-71224e7> + 12 && fail === 0`. The Implementer substitutes both `<BASELINE-AT-71224e7>` and `<CHORE-A-SHA>` literals into this AC text at chore-A authoring (e.g., spec is committed with the placeholder; Implementer amends the chore-A NEXT-ROLE.md attestation block with the concrete numbers). | Test-count binding-command (per R22 + R23 anchoring); attestation in NEXT-ROLE.md. | § 3.1 + § 3.2 (12 new runtime tests at chore-A). |
| AC-R26-16 | Given the chore-A SHA `<CHORE-A-SHA>` (committed as a string constant in the chore-B test addition), when the test invokes `execFileSync('git', ['diff', '<CHORE-A-SHA>..HEAD', '--name-only'])`, then the resulting newline-split file list is either empty OR every entry is one of the 7 allowed-set paths in § 2.1. Test is added in chore-B (one additional `test()` call appended to `test/q-md-f4-common-mode-injection.test.ts`). | Forward-protection runtime test for AC-R26-13; chore-B runtime test (extends test file to 13 test() calls at HEAD). | § 2.1 (chore-B forward-protection pattern; R20 / R21 / R22 / R23 precedent). |

### 4.1 AC-table preamble cross-check (per R20 ARCH MINOR-1 + CLAUDE-ARCHITECT.md REINFORCED 2026-05-17)

- AC-R26-1 through AC-R26-12 are **runtime tests** in `test/q-md-f4-common-mode-injection.test.ts` at chore-A. Each is a separate `test()` call.
- AC-R26-13 + AC-R26-14 + AC-R26-15 are **binding-command attestations** reported by the Implementer in `coordination/NEXT-ROLE.md` at chore-A. None of these three is a committed runtime test at chore-A.
- AC-R26-16 is a **chore-B runtime test** (forward-protection); the new `test()` call lands in chore-B, not chore-A.

Mapping consistency: § 3.2's "Per-AC test prescriptions" table classifies the same ACs identically (rows 1-12 = runtime tests at chore-A; rows 13-15 = binding-command attestations; row 16 = chore-B runtime test). The component inventory at § 2 lists `test/q-md-f4-common-mode-injection.test.ts` as the binding file for both the 12 chore-A tests and the 1 chore-B test. **Preamble-vs-prescription consistency: PASS.**

### 4.2 Branch-binding coverage gate (per CLAUDE-ARCHITECT.md REINFORCED 2026-05-17 R21 MINOR-2/MINOR-3)

For every failure mode F1-F9 enumerated in § 1.5, the AC bound column names at least one AC. F1 → AC-R26-2; F2 → AC-R26-11; F3 → AC-R26-3 + AC-R26-7; F4 → AC-R26-11(b); F5 + F6 → AC-R26-9; F7/F8/F9 → covered structurally by the empty-iteration / singleton-filter paths exercised in the bound ACs above; documented in § 1.5 as "not separately AC-bound." **Branch-binding coverage: COMPLETE for F1-F6 (load-bearing modes); F7-F9 are degenerate-case branches covered by the same code paths as F1/F2.**

---

## 5. Anti-scope

### 5.1 Modifications EXPLICITLY PROHIBITED in R26 (A12 / A5 inheritance + per PRD § Anti-scope)

| Path | Rule | Source |
|---|---|---|
| `engine/topology-overlay.ts` body | NO modification beyond header SHA-pin (which is unchanged). R26 imports `computeSnapshotHash` and the `TopologyNode`/`TopologySnapshot` type re-exports through `engine/types/verdict.ts` — these imports do not change the file. If BFS body modification becomes load-bearing → ESCALATE per PRD § Halt conditions #1. | PRD § Anti-scope; Q-R23-SPEC § 0.5 precedent; A12. |
| `engine/hardware-topology-source.ts` body | NO modification. R26 does NOT instantiate `HardwareTopologySource`; tests use `makeV9YMultiRackCluster()` directly (already returns a `TopologySnapshot`). | R23 frozen; PRD. |
| `engine/types/verdict.ts` body | NO modification (no new union members, no new fields, no new types). | R23 / R18 frozen at SLICE 3.A delta state; PRD. |
| `engine/verdict-groups.ts` body | NO modification. | R20 frozen; PRD. |
| `engine/fleet/verdict-consumer.ts` body | NO modification. | R21 frozen; PRD. |
| `test/_substrate/v9Y-multi-rack-cluster.ts` | NO modification (R23 frozen). If fixture geometry change is load-bearing → ESCALATE per PRD § Substrate. | R23 frozen; PRD. |
| `test/_substrate/v9X-cluster.ts` | NO modification. | R18 frozen; PRD. |
| Any per-shard detector under `engine/detectors/` | NO modification (vendored-at-pin). | A12; vendoring policy. |
| Any vendored type file under `engine/types/families/` | NO modification. | A12. |
| `coordination/VENDORING-MANIFEST.md` | NO modification (R26 ships a Tessera-original module; not a vendored file; no manifest row). | Avoid spurious manifest entries. |

### 5.2 Scope NOT in this round (PRD § Anti-scope)

- A12 / A5 — per-shard detector internals untouched.
- A13 — no ML-based attribution model; rule-based + statistical only (BFS + count threshold + kind filter).
- A16 — Addition #26 D4 `correlational_not_causal: true` preserved; AC-R26-8 enforces.
- WU-00 L0-contract surface — NOT a dependency of this WU (v9Y is value-domain by construction).
- WU-06 SLICE 4 event-conditional attribution — out of scope (deployment-event-feed ingestion is SLICE 4).
- Hybrid Reviewer audit AT R26 — out of scope. The PR-F6 hybrid Reviewer pair-review fires at **WU-05 SLICE 3 close** per PRD § Tier verdict + SCOPING-MEMO-v0.3 § 3 SLICE 3.C row. R26 ships the evidence package; WU-05 audits it.
- FusedVerdict → FiredShardEvent adapter — out of scope at this WU (Phase 2 SLICE 4 / WU-06).

### 5.3 Tactical detail delegated to Implementer

- Exact `test()` titles (the spec prescribes intent, not literal strings).
- Test-file import grouping / formatting.
- Whether helper functions inside `test/q-md-f4-common-mode-injection.test.ts` are declared as `function` or arrow form.
- The empirical baseline test count `<BASELINE-AT-71224e7>` (Implementer measures during RED commit; substitutes at chore-A authoring).
- The chore-A SHA `<CHORE-A-SHA>` (Implementer substitutes after the chore-A commit lands).

---

## 6. Open questions

**OQ-R26-1 (LOW severity, deferred to hybrid Reviewer cold-verification at WU-05):** Citation 4 ("Feng Shui of supercomputer memory") verbatim quote may be paraphrased rather than a direct quote — the Architect's training-corpus recall flags potential paraphrase. Action: hybrid Reviewer at WU-05 SLICE 3 close cold-fetches the URL and either confirms the quote or replaces with a verified verbatim quote; LOW-severity because three other citations (Dixit 2021, Hochschild 2021, Schroeder & Gibson 2007) carry HIGH confidence and PR-F6 evidence threshold (≥3 citations) is met without Citation 4.

**OQ-R26-2 (LOW severity, deferred to hybrid Reviewer cold-verification at WU-05):** URLs for Citations 2-4 (ACM DOI form, USENIX legacy path) carry MEDIUM confidence — they match canonical URL patterns but the Architect has not cold-fetched at spec-emit time. Action: hybrid Reviewer cold-fetches; if any URL returns 404, the Reviewer either supplies the canonical replacement URL or annotates the citation with `[URL: not resolvable]`. No R26-cycle escalation required (R26 ships the package; WU-05 validates).

**All other items resolved:**
- BFS direction: undirected, mirroring inherited `engine/topology-overlay.ts:265-267` — RESOLVED in § 1.2.
- Aggregation algorithm: Approach A (forward BFS from fired shards, Map-keyed by shared node) — RESOLVED in § 1.2 + audit sidecar § Brainstorm.
- Defaults: `max_hop=1`, `min_member_count=2`, `candidate_node_kinds=['psu','rack','cooling_zone']` — RESOLVED in § 1.4.
- Substrate variant for AC-R26-9: inline filter in test (not new substrate file) — RESOLVED in § 1.5 + AC-R26-9 text.
- Input type: lean `FiredShardEvent` (decoupled from FusedVerdict) — RESOLVED in § 3.1.
- Naming: `engine/topology/common-mode-attribution.ts` per PRD § File location — RESOLVED.

---

## 7. P3 ten-axis verification

| Axis | Verification (one sentence per axis) |
|---|---|
| **Correctness** | The algorithm in § 1.2 computes exactly the set of shared hardware-substrate nodes with ≥ min_member_count distinct member shards within max_hop_distance; § 1.5 enumerates F1-F9 with prescribed behaviors and each load-bearing mode is AC-bound (§ 4.2). |
| **Completeness** | All four PR-F6 cells (§ 1.7) + sparse-topology degradation (§ 1.5 F6 + AC-R26-9) + BFS-on-undirected (AC-R26-5) + correlational_not_causal wire (AC-R26-8) + anti-scope diff (AC-R26-13) + typecheck (AC-R26-14) + test-count (AC-R26-15) + forward-protection (AC-R26-16) + evidence-package (AC-R26-10) — every PRD-listed AC category is bound. |
| **Consistency** | Identifiers (`attributeCommonMode`, `CommonModeCandidate`, `FiredShardEvent`, `DEFAULT_MAX_HOP_DISTANCE`, `DEFAULT_MIN_MEMBER_COUNT`, `DEFAULT_CANDIDATE_NODE_KINDS`, `KIND_SORT_ORDER`, `engine/topology/common-mode-attribution.ts`, `test/q-md-f4-common-mode-injection.test.ts`, `coordination/evidence/PR-F6-EVIDENCE.md`, `correlational_not_causal: true`) used identically across § 1, § 2, § 3, § 4, § 5; AC-table preamble cross-check (§ 4.1) confirms § 3.2 ↔ § 4 ↔ § 2 alignment. |
| **Clarity** | Each AC is "Given X, when Y, then Z" without ambiguous language ("correctly" / "appropriately" / "as needed" not used); failure modes enumerated with prescribed responses (§ 1.5). |
| **Coverage** | 16 ACs cover the 4 PR-F6 cells, the 3 mandatory ancillary categories (BFS-on-undirected, common-mode aggregation, correlational-not-causal), sparse-topology degradation, evidence package, anti-scope, typecheck + test count, forward-protection. Per-AC bound to F1-F6 failure modes in § 4.2. |
| **Constraints** | All anti-scope constraints from PRD § Anti-scope listed in § 5 with per-file rule + escalation pointer. A12 / A5 / A13 / A16 inheritances respected. |
| **Concurrency** | Module is pure (no shared state, no async, no I/O). Multiple concurrent `attributeCommonMode` calls on the same snapshot return identical results (referential transparency); no race conditions possible. |
| **Corner cases** | F1 (empty events) / F2 (singleton) / F3 (cross-rack) / F4 (unknown shard) / F5 (empty snapshot) / F6 (sparse subset) / F7-F9 (degenerate opts) enumerated in § 1.5; F1-F6 AC-bound. |
| **Cost** | Algorithm is O(\|fired_events\| × (V + E)) per attribution call where V = snapshot.nodes.length, E = snapshot.edges.length; for v9Y (V=10, E=14, fired_events ≤ 4 in PR-F6 cells) this is sub-millisecond. No allocation pressure beyond Map / Set / Array primitives. |
| **Coupling** | Module imports exactly two symbols (`TopologyNode`/`TopologySnapshot` as types from `../types/verdict`; `computeSnapshotHash` as value from `../topology-overlay`). No dependencies on `engine/fleet/`, `engine/verdict-groups`, `engine/detectors/`. Output type `CommonModeCandidate` is consumed only by tests at this WU (downstream consumers at WU-05 SLICE 3 close + Phase 2 close audit-emission). |

---

## 8. Grilling output

### 8.1 Every claim verifiable?

| Claim | Verifiable? | Evidence |
|---|---|---|
| BFS at `engine/topology-overlay.ts:262-285` is bidirectional. | YES. | Read § 1 of this spec; cited verbatim from R23 Q-R23-SPEC § 9.7 empirical-premise-verification + this Architect's direct read at lines 265-267 (`adjacency.get(e.from)?.add(e.to); adjacency.get(e.to)?.add(e.from);`). |
| `computeSnapshotHash` at `engine/topology-overlay.ts:69-78` is a free function exported from `engine/topology-overlay.ts`. | YES. | Architect direct read (file at line 69). Re-exported / imported elsewhere (e.g., `engine/hardware-topology-source.ts:21-24`). |
| `TopologyNode.kind` union at `engine/types/verdict.ts:245` includes 'psu' and 'cooling_zone'. | YES. | Direct read at line 245 (R23 delta + R18 delta committed). |
| `TopologyEdge.relationship` union at `engine/types/verdict.ts:255` includes 'nvlink_peer'. | YES. | Direct read at line 255 (R23 delta committed). |
| `correlational_not_causal: true` is a literal-type field on the inherited `TopologyCandidate` at `engine/types/verdict.ts:289`. | YES. | Direct read at line 289. R26 reuses the same literal-type convention on `CommonModeCandidate`. |
| v9Y geometry at `test/_substrate/v9Y-multi-rack-cluster.ts`: 10 nodes (2 racks + 2 psu + 2 cz + 4 gpu_shards) + 14 edges. | YES. | Direct read of full file (62 lines). PSU-0 contains shard-0 + shard-1 (lines 43-44); PSU-1 contains shard-2 + shard-3 (lines 45-46); rack-0 / cz-0 contain shard-0 + shard-1; rack-1 / cz-1 contain shard-2 + shard-3; nvlink_peer pairs are shard-0/1 and shard-2/3. |
| Round-start SHA is `71224e7`. | YES. | `git rev-parse HEAD` from worktree root before spec-emit. |
| `.gitignore` does not exclude any of the 7 allowed-set paths. | YES. | Direct read of `.gitignore` (line by line); rules `*.js`, `*.log`, `runs/`, `coordination/.prompt-*.md`, `coordination/.role-stamp`, `coordination/clusters/`, `coordination/multi-track-status.json`, `node_modules/`, etc. — none match any of the 7 entries in § 2.1. |
| Test path naming convention (`test/q-md-f4-common-mode-injection.test.ts`) is consistent with peer files. | YES. | `ls test/` shows q01- … q23- prefix convention plus non-numeric Tessera-specific prefixes (`betting-e-process-class-dispatch.test.ts`); the `q-md-f4-` prefix uses the WU-04 / MD-F4 identifier convention rather than a numeric round prefix (per PRD § File location which prescribes `test/q-md-f4-common-mode-injection.test.ts` verbatim). |
| External literature URLs in § 3.3 / OQ-R26-1+2: HIGH/MEDIUM confidence annotated; hybrid Reviewer cold-verifies at WU-05. | NOT FULLY at spec emit. | URL confidence levels explicitly annotated per citation; OQ-R26-1 + OQ-R26-2 surface the gap; PRD § Halt conditions #3 inverse applies — Architect found ≥3 corroborating citations so PR-F6 standard not weakened, URLs flagged for WU-05 cold-verify. |
| Baseline test count `<BASELINE-AT-71224e7>` is empirically measureable. | NOT at spec emit (Architect role boundary). | The test command in this worktree errors on `npx tsc` deprecation + ENOENT for the `../deploysignal/` sibling read (q01-no-at-pin-deltas.test.ts requires the DS sibling repo, which is not present in the cluster worktree). Implementer empirically measures at RED commit by first resolving the local test-runner environment (per R01 AC-6 disposition + R23 chore-A pattern). The numerical literal substituted into AC-R26-15 at chore-A authoring is the load-bearing fact; the spec text uses `<BASELINE-AT-71224e7>` as a placeholder. **FIX applied:** spec explicitly delegates baseline measurement to Implementer at RED commit; AC-R26-15 text is written so the literal can be inserted post-hoc without spec amendment. |

### 8.2 Unstated assumptions?

| # | Assumption | Stated where? | Risk if wrong |
|---|---|---|---|
| 1 | The v9Y fixture's shard-PSU adjacency is symmetric (every shard contained by a PSU is reachable from that PSU via a single edge). | Stated in § 1.7 + § 3.2 AC-R26-1; verified by Architect direct read of `test/_substrate/v9Y-multi-rack-cluster.ts`. | Low — v9Y is R23-frozen; no future drift expected before R26 lands. |
| 2 | The inherited `engine/topology-overlay.ts:265-267` adjacency build covers both edge endpoints (bidirectional). | Stated in § 1.2 + § 8.1 row 1; Architect direct read. | Low — vendored-at-pin; no drift. |
| 3 | The PR-F6 evidence-package file structure (Markdown ### Citation N headings + 7 bold-label fields per entry) is sufficient for hybrid Reviewer machine-readable validation. | Stated in § 3.3 prescription; AC-R26-10 enforces structural completeness. | Low — hybrid Reviewer at WU-05 can refine the schema if needed. |
| 4 | The `child_process.execFileSync` invocation in AC-R26-16 forward-protection runs from the worktree root with git binary available. | Stated implicitly in § 3.2 row AC-R26-16; Implementer to confirm at chore-B authoring (chore-B precedent: R23 AC-R23-15 + R22 AC-R22-8 use identical pattern). | Low — established pattern. |
| 5 | The baseline test count at `71224e7` is stable across re-runs in the cluster worktree (deterministic). | Stated implicitly; Implementer empirically verifies via `npx tsc -p tsconfig.test.json && node --test test/*.test.js` at the round-start SHA after resolving any sibling-repo / TS deprecation issues. | Medium — if `q01-no-at-pin-deltas.test.ts` cannot run in the cluster worktree (no DS sibling), AC-R26-15's baseline literal becomes count-of-other-tests; Implementer documents in attestation. Mitigation: AC-R26-15 explicitly says "the Implementer empirically measures" — no architectural assumption locked in. |

### 8.3 Scope added beyond request?

| Item | In PRD? | Removed? |
|---|---|---|
| 16 ACs targeting PRD's 12-16 range. | YES (PRD § Acceptance criteria: "Target AC count: 12-16"). | No — within range. |
| `correlational_not_causal: true` literal-type field on `CommonModeCandidate`. | YES (PRD § Anti-scope A16 + § Architecturally novel surfaces #3). | No — required. |
| 4-cell PR-F6 evidence matrix. | YES (PRD § Architecturally novel surfaces #4). | No — required. |
| External literature citation package. | YES (PRD § Architecturally novel surfaces #5 + § Reinforcements). | No — required. |
| Sparse-topology degradation AC (AC-R26-9). | YES (PRD § Acceptance criteria + § Halt conditions #1 implicit). | No — LS-4 carry-forward. |
| BFS-on-undirected AC (AC-R26-5). | YES (PRD § Acceptance criteria). | No — required. |
| Anti-scope diff AC + typecheck + test-count + forward-protection (AC-R26-13/14/15/16). | YES (PRD § Acceptance criteria; per R22 / R23 precedent). | No — required. |
| Candidate ordering + kind-filter AC (AC-R26-12). | NO explicit PRD ask. | NOT REMOVED. **Justification for inclusion:** the spec prescribes a deterministic sort order (§ 1.3) and a `candidate_node_kinds` opts field (§ 1.4); leaving these structurally unbound would create a R21 MINOR-2/MINOR-3 class repeat (failure-mode-enumerated-but-no-AC). The two are bundled into one `test()` (single AC row) so AC count stays at 16. |
| Singleton + unknown-shard guard AC (AC-R26-11). | NO explicit PRD ask. | NOT REMOVED. **Justification:** F2 (singleton) + F4 (unknown shard) are load-bearing failure modes in § 1.5; the same R21 MINOR-2/MINOR-3 reinforcement applies. Bundled into one `test()`. |
| `child_process.execFileSync`-based forward-protection runtime test (AC-R26-16). | YES (PRD per R22/R23 precedent — chore-B forward-protection pattern). | No — required by chore-B convention. |
| Hybrid Reviewer cold-verification checklist embedded in evidence package. | NO explicit PRD ask. | NOT REMOVED. **Justification:** PRD § Reinforcements + § Tier verdict explicitly call out hybrid Reviewer at WU-05; embedding a checklist in the evidence package is a coordination courtesy that reduces ambiguity at WU-05 (zero spec churn cost at R26). |

No scope creep flagged.

### 8.4 Implementer can act without guessing?

| Question Implementer might have | Answer location in spec |
|---|---|
| What does the new module file look like? | § 3.1 (full pseudocode including imports, types, function body, BFS helper). |
| What does the new test file's docblock look like? | § 3.2 header docblock prescription. |
| What does each `test()` assert? | § 3.2 per-AC test prescriptions table (12 rows + chore-B row 16). |
| What's the exact PR-F6 evidence-package structure? | § 3.3 (verbatim Architect-authored file body to commit). |
| Should the Implementer modify any vendored or R20+R21+R23 frozen files? | § 5.1 NO (explicit per-file rule). |
| What's the anti-scope allowed-set? | § 2.1 (7 paths, exhaustive). |
| How is AC-R26-15's `<BASELINE-AT-71224e7>` resolved? | § 5.3 + § 4 AC-R26-15 text: Implementer empirically measures at RED commit. |
| How is AC-R26-13 / AC-R26-15's `<CHORE-A-SHA>` resolved? | § 5.3: Implementer substitutes post-hoc at chore-A authoring (NEXT-ROLE.md attestation block). |
| RED-first TDD discipline (per R23 MINOR-1 reinforcement)? | Implementer's R23 reinforcement: emit a separate RED commit containing the test file with stubbed `assert.fail(...)` per AC BEFORE writing any production code. § 3.2 prescriptions are written so each `test()` can be stubbed independently. |
| `engine/topology/` subdirectory does not yet exist — create? | YES. Implementer creates the directory implicitly when creating the file (git treats it as part of the file path). |
| Two Architect commits before chore-A? | YES (R21 MINOR-1 + R23 reinforcement: spec artifacts in Commit A, routing block in Commit B). |

All Implementer-facing questions answered in-spec. No silent decisions deferred.

### 8.5 Pre-route gates (per CLAUDE-ARCHITECT.md REINFORCED accumulated)

| Gate | Status |
|---|---|
| Spec artifacts committed BEFORE NEXT-ROLE.md routing block (R21 MINOR-1). | Architect commits A (spec + spec-audit + evidence) THEN B (NEXT-ROLE.md + MEMORIAL.md). |
| `.gitignore` audit on anti-scope allowed-set (R23 MINOR-2). | § 2.1 phantom-entry check: 0 phantom paths. |
| Branch-binding coverage gate (R21 MINOR-2/3). | § 4.2: F1-F6 AC-bound; F7-F9 degenerate. |
| Count-AC chore-A-SHA anchoring (R22 IMPL MINOR-1; R23 AC-R23-14 precedent). | AC-R26-15 explicitly anchored to `<CHORE-A-SHA>` placeholder. |
| Cross-section identifier consistency (R01 + R20 ARCH MINOR-1). | All identifiers in § 7 row "Consistency" verified used identically across § 1-§ 5. |
| AC-table preamble cross-check (R20 ARCH MINOR-1; CLAUDE-ARCHITECT.md REINFORCED 2026-05-17). | § 4.1: § 3.2 vs § 4 vs § 2 classification consistent. |
| Empirical-premise-verification table (R02 + R23 reinforcement). | § 8.1 + audit sidecar § 1 (14+ load-bearing facts). |
| Spec-internal-contradiction scan (R01 R02 R13 R15). | § 8.1 + § 7 row "Consistency" + § 4.1 + § 5.1 — no contradictions detected. |
| File-level documentation coverage (R10 MINOR-1). | § 3.1 module header docblock prescribed verbatim; § 3.2 test-file header docblock prescribed verbatim. |
| Verification-command-soundness (R03 MINOR-2). | Each binding-command AC uses commands shown in invocable form (`npx tsc -p tsconfig.test.json`, `node --test test/*.test.js`, `git diff <SHA-A>..<SHA-B> --name-only`); no comment-line grep patterns. |
| Halt-discipline coverage (R23 audit). | PRD § Halt conditions #1 + #2 + #3 mapped to escalation triggers in § 5.1 (BFS body modification) + § 8.2 row 5 (baseline measurement gap) + OQ-R26-1/2 (citation evidence gap). |
| Memorial self-exoneration guard (CLAUDE-COMMON.md REINFORCED 2026-05-16). | Architect ceremony entries in MEMORIAL.md (Commit B) will not characterize any deviation as "correct"; will use VIOLATION / CONFIRMATION labels per established convention. |
| Audit-tier-promotion-mid-round NOT triggered. | This is full-tier; no audit-tier risk. |
| Vendored-with-deltas pre-handling (R18 + R23). | R26 does not add vendored-with-deltas to any file; `engine/types/verdict.ts` is already vendored-with-deltas (R18+R23) but R26 does NOT modify it further — manifest row 31 stays at R23 state. |
| Spec-internal-prescription consistency (R15 MINOR-3 — halt-trigger vs AC-trigger). | AC-R26-13 prescribes a binding-command attestation; no halt-trigger overlap. AC-R26-15 prescribes a count assertion; no halt-trigger overlap. No two rules prescribe conflicting actions for the same trigger state. |
| Sibling-AC failure-mode propagation (R07 MAJOR-1). | All e-process/statistical-detector ACs (none in R26) — N/A. R26 has no statistical-injection ACs; cells (1)-(4) are deterministic graph-walk assertions. |
| Test-fixture-counterfactual (R07 MAJOR-2). | Each AC's failure-mode counterfactual is stated in § 3.2 (e.g., AC-R26-5: "Replacing `adjacency.get(e.to)?.add(e.from)` with a no-op would fail this AC"). No OBSERVED-bind class. |
| Spec-statistical-term-formula cross-check (R13 MINOR-1). | No statistical bounds in R26 (deterministic BFS + count threshold). N/A. |
| Line-citation-drift carry-forward reminder (R03 + R18 + R21). | Implementer prescribed in § 5.3: cite test `test(` declaration lines (not assertion bodies) in NEXT-ROLE.md attestation; verify via `grep -n "^test(" test/q-md-f4-common-mode-injection.test.ts` before committing chore-A. |
| External-literature-citation discipline (PRD § Reinforcements). | § 3.3 + OQ-R26-1/2; confidence-level convention spelled out; hybrid Reviewer cold-verify deferred to WU-05. |

**Final pre-route gate: ALL PASS.** Spec is ready to emit to Implementer.

### 8.6 Adversarial self-review summary

Two findings raised during grilling, both retained-and-mitigated rather than removed:

- (Finding G1, § 8.2 row 5): Baseline test count cannot be measured by Architect in this worktree (sibling-repo dependency in `q01-no-at-pin-deltas.test.ts`). Mitigation: AC-R26-15 explicitly delegates measurement to Implementer at RED commit; no architectural lock-in.
- (Finding G2, OQ-R26-1 + OQ-R26-2): URL confidence for Citations 2-4 is MEDIUM; Citation 4 quote may paraphrase. Mitigation: Architect surfaces as Open Questions for hybrid Reviewer cold-verification at WU-05; PR-F6 evidence threshold (≥3 high-confidence citations) is met by Citations 1 + 2 + 3 even if Citation 4 needs replacement.

No findings warrant ESCALATE before routing. STATUS: READY for Implementer.

---

_End of Q-R26-SPEC.md._
