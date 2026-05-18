# Q-R18-SPEC — Phase 2 SLICE 1 (minimum-viable topology substrate + VerdictGroup cluster_event_id + v9X fixture)

**Round:** R18 (full tier — A2 new architectural pattern, A4 novel data model)
**Inputs to Implementer:** this file (Q-R18-SPEC.md) + coordination/NEXT-ROLE.md (operator round scope) + coordination/PRD.md (FR-E3a) + coordination/SCOPING-MEMO-v0.3.md (§ 2.3 + § 9.4 vendoring policy) + existing engine/types/verdict.ts + existing test/_substrate/factories.ts + existing engine/topology-overlay.ts + existing engine/verdict-groups.ts (read-only references; do NOT modify either non-verdict.ts engine file).

**Sidecar:** coordination/specs/Q-R18-SPEC-AUDIT.md (Architect ceremony content; Implementer is NOT required to read).

**R18 baseline SHA:** `b640c6c` (HEAD at session start; last commit before R18 work).

---

## 0. Brainstorm phase (Superpowers — documented inline per session prompt)

### Problem framing

Deliver Phase 2 SLICE 1's minimum-viable substrate per `PHASE-1-CLOSE-WALK.md:250` 1-cycle interpretation of v0.3 § 2.3: extend the inherited `TopologyNode.kind` and `TopologyEdge.relationship` unions, add `cluster_event_id` to `VerdictGroup`, build a deterministic `v9X` single-rack synthetic-cluster fixture, and bind everything in a new `q18` test file. Inherited Addition #25 D2 + D5 + Addition #26 D4 clauses must be preserved (preserved-vs-amended walk; preservation chosen for all three at SLICE 1).

### Three distinct approaches

**Approach A — In-place vendored-file deltas in `engine/types/verdict.ts` only (no separate Tessera-fixture module).**

Edit `engine/types/verdict.ts` to extend both unions + add `cluster_event_id?: string`. Put the v9X fixture either inline in the test file or appended to `test/_substrate/factories.ts`.

- **Strengths.** Single edit site (verdict.ts) + zero new substrate file; minimal LoC diff.
- **Weaknesses.** Either crowds the test file with fixture logic (poor reuse) or crowds `factories.ts` (currently cell/baseline/residual-focused — different domain). v9X fixture is conceptually a topology substrate, not a cell-domain factory.
- **Hidden assumptions.** That future SLICEs (2+) will not extend v9X to deployment-event injection / multi-rack — if they will (per v0.3 § 2.3 SLICE 3 + § 2.3 line 218 deployment-event surface), a dedicated module is cleaner.
- **Risks.** Late-SLICE fixture growth forces a refactor out of `factories.ts`. Cost asymmetric with Approach C.

**Approach B — Tessera-fork extension types (parallel hierarchy in a new file, `engine/types/tessera-extensions.ts`).**

Leave `engine/types/verdict.ts` byte-identical; define `TopologyNodeTessera`, `TopologyEdgeTessera`, `VerdictGroupTessera` in a new sibling file as Tessera-fork variants.

- **Strengths.** Vendored files untouched; re-pin against DeploySignal SHA is trivial.
- **Weaknesses.** Type-fork creates a parallel hierarchy. Inherited engine code (verdict-groups.ts factory, topology-overlay.ts BFS, etc.) operates on `VerdictGroup` not `VerdictGroupTessera`. To get `cluster_event_id` to flow through the inherited factory at all, you would need to modify verdict-groups.ts anyway (defeating the "vendored untouched" goal) or accept that Tessera-only callers must inject the field by widening the type at the boundary (verbose and error-prone).
- **Hidden assumptions.** That Phase 2 SLICE 2 outer aggregator (which extends `VerdictGroup` scope to `(cluster_event_id, …)` per v0.3 § 2.3 line 221) can cleanly consume a Tessera-fork type. In practice it cannot without either widening or re-modifying the inherited factory.
- **Risks.** Compounds across SLICE 2+; doesn't match the explicit v0.3 § 9.4 vendoring-policy directive ("vendored-with-deltas at Phase 2; SLICE 1 of Phase 2 adds cluster_event_id to VerdictGroup; per-file header notes 'vendored at SHA 5a72371 + Tessera-specific extensions per Phase 2 SLICE 1'").

**Approach C — Hybrid: in-place deltas in `engine/types/verdict.ts` + dedicated `test/_substrate/v9X-cluster.ts` for the fixture.**

Edit `engine/types/verdict.ts` per Approach A (three deltas + header amendment annotation). Put the v9X fixture in a new dedicated module at `test/_substrate/v9X-cluster.ts` paralleling the `make<TypeName>(overrides?)` convention of `factories.ts`.

- **Strengths.** Matches v0.3 § 9.4 vendoring policy verbatim. Cleanly separates the vendored-type-surface delta (verdict.ts) from the Tessera-specific test substrate (v9X-cluster.ts). Forward-compatible: v9X grows to multi-rack / event-injection / etc. in SLICE 2+ without churning factories.ts.
- **Weaknesses.** Two locations to touch. (Minimal cost.)
- **Hidden assumptions.** That v9X is a topology-fixture domain (separate from cell/baseline/residual factories.ts domain). Confirmed by reading v0.3 § 2.3 + factories.ts header comment scope ("CellKey + PerShardResidual + PerShardCell + BaselineCellEntry — none topology-related").
- **Risks.** Negligible.

### Constraint elimination

- v0.3 § 9.4 (line 557) prescribes in-place deltas with header amendment annotation: this eliminates **Approach B**.
- v0.3 § 2.3 (line 344) lists "synthetic-cluster substrate v9X-class fixture generation" as a SLICE 1 deliverable distinct from the type-surface deltas — this prefers a separate fixture module over inlining into the test file or crowding factories.ts: this prefers **Approach C** over Approach A.

### Selection: Approach C

**Why picked.** Compliant with v0.3 § 9.4 vendoring policy (in-place deltas in verdict.ts with header annotation). Cleanly separates type-surface delta from test substrate, paralleling the existing `test/_substrate/factories.ts` convention. Forward-compatible for Phase 2 SLICE 2-4 extensions (multi-rack, peer edges, event injection). Single-purpose modules.

**Why rejected — Approach A.** Either crowds the test file with fixture logic or stretches `factories.ts` beyond its cell-domain scope. Approach C is strictly more modular at no functional cost.

**Why rejected — Approach B.** Violates v0.3 § 9.4 ("vendored-with-deltas at Phase 2"). Type-fork hierarchy compounds Phase 2 SLICE 2+ surface-area work; inherited factory at `verdict-groups.ts:147` cannot ergonomically construct a Tessera-fork type without modifying the factory itself.

---

## 1. Design phase sketch (Superpowers — documented inline)

### Component boundaries

| What | State | Where |
|---|---|---|
| `TopologyNode` / `TopologyEdge` / `TopologySnapshot` / `TopologyCandidate` | EXISTS — modified at unions only | `engine/types/verdict.ts:212-262` |
| `VerdictGroup` interface | EXISTS — additive optional field added | `engine/types/verdict.ts:170-194` |
| `engine/topology-overlay.ts` (BFS, `computeSnapshotHash`, `TopologyEnricher`) | EXISTS — UNTOUCHED | `engine/topology-overlay.ts` |
| `engine/verdict-groups.ts` (`VerdictGroupAggregator` factory) | EXISTS — UNTOUCHED | `engine/verdict-groups.ts` |
| `test/_substrate/factories.ts` (cell/baseline/residual factories) | EXISTS — UNTOUCHED | `test/_substrate/factories.ts` |
| `test/_substrate/v9X-cluster.ts` (synthetic single-rack cluster fixture) | CREATED | new |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | CREATED | new |
| `coordination/specs/Q-R18-SPEC.md` + `Q-R18-SPEC-AUDIT.md` | CREATED | this file + sidecar |

### Integration points (each verified against PRD/spec)

1. **`engine/types/verdict.ts` ← TopologyNode.kind extension.** Consumers: `engine/topology-overlay.ts` (computeSnapshotHash sorts on node id only, not kind; BFS sorts on neighbor id, not kind). Verified by grep over `engine/`, `tools/`, `src/`, `test/`: **no exhaustive switches on `node.kind`** anywhere. Additive union extension is safe.
2. **`engine/types/verdict.ts` ← TopologyEdge.relationship extension.** Consumers: `engine/topology-overlay.ts:71-75` (lex-sort on `relationship` for hash determinism — participates additively); `engine/topology-overlay.ts:262-285` (BFS — does NOT switch on relationship; adds both directions unconditionally for every edge). Verified by grep: **no exhaustive switches on `edge.relationship`**. Additive union extension is safe.
3. **`engine/types/verdict.ts` ← VerdictGroup.cluster_event_id?: string.** Consumers: `engine/verdict-groups.ts:147` (factory constructs VerdictGroup literal with all required fields enumerated; an additive **optional** field defaults to undefined when omitted; **no factory modification required**); `engine/topology-overlay.ts:213/288/333` (read-only access to existing fields; additive field doesn't affect); `engine/types/agent.ts:81` + `engine/types/orchestration.ts:182` (parameter typing only). Verified by grep: **no exhaustive object-literal constructions of VerdictGroup elsewhere**. Additive optional field is safe.
4. **`test/_substrate/v9X-cluster.ts` → `test/q18-*.test.ts`.** Imports `makeV9XSingleRackCluster`. Naming convention parallels `test/_substrate/factories.ts` (`make<TypeName>(overrides?)`).
5. **`test/q18-*.test.ts` → `engine/types/verdict` + `engine/topology-overlay`.** Imports types + `computeSnapshotHash` for determinism check.

### Integration-point verification against PRD/spec

- **FR-E3a (Phase 2; US-01 cluster oncall per-shard fault attribution).** SLICE 1 delivers the substrate (enum extensions + cluster_event_id field) that SLICE 2's outer aggregator consumes. ✓
- **AC-P4 (Phase 2 close).** Output shape preserves Addition #26 D4 `correlational_not_causal: true` wire-format. SLICE 1 leaves this contract untouched (AC-R18-8 binds). ✓
- **Anti-scope A12/A5 (no modification to vendored detector internals).** SLICE 1 deltas land at the **type-surface extension points** explicitly enumerated by v0.3 § 9.4. No modification to detector internals or to engine/topology-overlay.ts or engine/verdict-groups.ts. ✓
- **Anti-scope A16 (no Addition #26 D4 reversal).** AC-R18-8 binds the literal-`true` type. ✓
- **Inherited Addition #25 D2 (window-based close at `(deploy_id, window_start_ts)` scope).** Additive optional `cluster_event_id` does NOT change close semantics (close-trigger at `verdict-groups.ts:88` reads `window_start_ts` only). PRESERVED. (SLICE 2 may amend D2 if outer aggregator changes close scope; that is later.)
- **Inherited Addition #25 D5 (group_id format `group-{deploy_id}-{window_start_ts}`).** AC-R18-7 binds verbatim. PRESERVED. (SLICE 2 may amend D5 if outer aggregator changes id format; that is later.)

### Failure modes (per integration point)

1. **Enum extension breaks an exhaustive switch.** Verified-absent; no failure mode.
2. **`computeSnapshotHash` returns non-deterministic value for v9X.** Lex sort over the extended union is deterministic (string comparison); AC-R18-6 binds determinism empirically.
3. **VerdictGroup factory misses cluster_event_id.** By design — additive optional defaults to undefined. AC-R18-3 binds both code paths (set + omit).
4. **BFS treats `'contains'` as bidirectional when callers expected directional traversal.** ACCEPTED at SLICE 1 (architectural decision; see § 2 below). Directional / parent→child traversal is deferred to Phase 2 SLICE 3+ HardwareTopologySource ADR (PR-F6 pair-review).
5. **Header annotation breaks `q01-vendoring-coverage` test.** Mitigated: annotation ADDS lines below the existing 5-line vendoring header block; the canonical first-line `// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` is byte-identical. AC-R18-9 binds.

---

## 2. Mechanism (§ Mechanism — every design decision made here; nothing deferred to Implementer)

R18 ships four artifacts:

### 2.1 `engine/types/verdict.ts` — three additive deltas + header annotation

**Delta 1 — TopologyNode.kind union extension at line 217:**

```
// BEFORE (vendored at SHA 5a72371):
kind: 'service' | 'database' | 'queue' | 'external';

// AFTER (Tessera Phase 2 SLICE 1):
kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack';
```

Decision rationale: minimum-viable subset of v0.3 § 2.3's full list `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`. `'psu'` and `'cooling_zone'` deferred to a later Phase 2 SLICE per v0.3 § 2.3 line 312 (1-cycle interpretation). Order within the union: append after the inherited four; preserves stable lex-sort ordering of pre-existing values.

**Delta 2 — TopologyEdge.relationship union extension at line 227:**

```
// BEFORE (vendored at SHA 5a72371):
relationship: 'calls' | 'reads' | 'writes' | 'publishes';

// AFTER (Tessera Phase 2 SLICE 1):
relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains';
```

Decision rationale: SLICE 1 minimum-viable adds **only** `'contains'` (hierarchical containment). Peer-relationship values `'nvlink_peer'`, `'shares_psu'`, `'co_located_in_rack'` are deferred per NEXT-ROLE.md (peer semantics need BFS-on-undirected adaptation evaluation; that is Phase 2 SLICE 3 HardwareTopologySource pair-review work).

**Architectural decision on `'contains'` BFS semantics (HALT-condition (c) disposition):** The inherited BFS at `engine/topology-overlay.ts:262-285` unconditionally adds both `e.from → e.to` and `e.to → e.from` to the adjacency map for every edge (lines 265-268); it does NOT switch on `e.relationship`. Therefore the new `'contains'` value is automatically **bidirectional in BFS visit order**. **R18 accepts this inherited bidirectional semantic for SLICE 1.** Rationale: keeps `engine/topology-overlay.ts` byte-identical (A12/A5 anti-scope); SLICE 1's purpose is the type-surface extension, not BFS-traversal refinement. Directional / parent-of-aware traversal becomes a Phase 2 SLICE 3+ ADR when HardwareTopologySource lands and PR-F6 pair-reviews BFS-on-undirected semantics. This decision is documented here, not deferred. No HALT.

**Delta 3 — VerdictGroup additive optional field inserted into the interface body (lines 170-194):**

Insert immediately before the existing `closed: boolean;` line (currently line 191 → new line ~192):

```
  /** Phase 2 SLICE 1 (R18) — cluster-event scope-extension. Optional;
   *  populated by Phase 2 outer aggregator (SLICE 2+) when a fleet-level
   *  cluster event (firmware push / config change / deploy) is the
   *  attribution scope for this group. SLICE 1 ships the field; SLICE 2
   *  wires the aggregator. Preserves Addition #25 D2 (window-based close
   *  at (deploy_id, window_start_ts) scope is unchanged at SLICE 1) and
   *  D5 (group_id format `group-{deploy_id}-{window_start_ts}` retained
   *  at SLICE 1; potential D5 amendment is SLICE 2 work). */
  cluster_event_id?: string;
```

Decision rationale: **additive OPTIONAL** — does not modify any required-field shape; `engine/verdict-groups.ts:147` factory continues to construct VerdictGroup with the same required-field set; the optional field defaults to undefined when omitted. **No modification to engine/verdict-groups.ts required or permitted at R18.** Insertion position: immediately before `closed:` for grouping with other state fields; comment block explicitly notes D2 + D5 preservation per v0.3 § 2.3 preserved-vs-amended walk requirement.

**Delta 4 — File header amendment annotation (per v0.3 § 9.4 vendoring policy line 557).**

The existing lines 1-5 (the canonical `VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` block) remain **byte-identical**. Insert AFTER line 5 (before the existing line 6 comment `// engine/types/verdict.ts —`) a new block:

```
// Tessera Phase 2 SLICE 1 amendments (R18, 2026-05-17) — three additive extensions
// per SCOPING-MEMO-v0.3.md § 2.3 + § 9.4:
//   1. TopologyNode.kind union extends to include 'gpu_shard' | 'rack' (subset of v0.3 list;
//      'psu' | 'cooling_zone' deferred to later Phase 2 SLICE).
//   2. TopologyEdge.relationship union extends to include 'contains' (hierarchical containment;
//      BFS at engine/topology-overlay.ts treats edges bidirectionally regardless of relationship,
//      inherited semantic accepted at SLICE 1).
//   3. VerdictGroup adds optional `cluster_event_id?: string` (Phase 2 outer-aggregator hook;
//      preserves Addition #25 D2 + D5 at SLICE 1; SLICE 2 may amend D5).
// All three extensions are additive-only; Addition #25 D2 + D5 and Addition #26 D4 preserved.
```

Decision rationale: amendments live below the canonical SHA-pin line so any vendoring-coverage test that reads the first line continues to pass; placement is between the 5-line vendoring header and the module-purpose comment.

### 2.2 `test/_substrate/v9X-cluster.ts` — new fixture module

Creates the v9X synthetic-cluster substrate per v0.3 § 2.3 Q-J4(i) disposition (single-rack uniform topology + injected events deferred). Convention parallels `test/_substrate/factories.ts` (`make<TypeName>(overrides?)` with shallow-merged opts).

**Exports:** `makeV9XSingleRackCluster(opts?: MakeV9XSingleRackClusterOpts): TopologySnapshot`.

**Default cluster shape:**
- 1 `TopologyNode` with `kind: 'rack'`, `id: 'rack-0'`, `service_name: 'rack-0'`.
- 10 `TopologyNode` entries with `kind: 'gpu_shard'`, `id: 'shard-0'..'shard-9'`, `service_name` matching `id`.
- 10 `TopologyEdge` entries with `relationship: 'contains'`, `from: 'rack-0'`, `to: 'shard-0'..'shard-9'`.
- `fetched_at_ts: 1700000000` (deterministic constant; epoch-seconds in the same range as other test fixtures).
- `source_id: 'v9X_synthetic_single_rack'`, `source_version: 'v9X.1'`.

**Opts (all optional):**
- `nShards?: number` — default 10. Range NOT enforced at module level (the AC binds nShards=10 and nShards=20; the helper accepts any positive integer; the Implementer does NOT add range guards).
- `rackId?: string` — default `'rack-0'`.
- `shardIdPrefix?: string` — default `'shard-'` (so shard ids are `'shard-0'..'shard-${N-1}'`).
- `fetchedAtTs?: number` — default 1700000000.

**Edge ordering:** edges are emitted in shard-index order (shard-0 first, shard-(N-1) last). Hash determinism is provided by `computeSnapshotHash` (which sorts internally), so input edge order doesn't affect hash; specifying emit order keeps the helper deterministic for direct-array-equality assertions.

### 2.3 `test/q18-phase2-slice1-topology-substrate.test.ts` — new test file

Binds AC-R18-1 through AC-R18-10 as runtime tests + AC-R18-11/-12 as binding-command attestations (Implementer-reported, not runtime-bound). Uses `node:test` + `node:assert/strict` per existing q*-test convention. AC counts: 10 runtime tests in the file + 2 attestation ACs = 12 ACs total. The `node --test test/*.test.js` total at GREEN is expected: 171 (pre-R18 baseline per NEXT-ROLE.md:74-94) + 10 = **181 passing**.

### 2.4 `coordination/NEXT-ROLE.md` — routing block updated

Architect routes to Implementer:
- `NEXT-ROLE: IMPLEMENTER`
- `STATUS: READY`
- `Inputs: coordination/specs/Q-R18-SPEC.md` (added under routing block; the scope/halt/coordination-chore sections below are preserved verbatim — they were operator-authored and remain load-bearing for Implementer + Reviewer + Memorial-Updater).

---

## 3. Component inventory

| Path | State | Touch type | Bound ACs |
|---|---|---|---|
| `engine/types/verdict.ts` | CHANGED | 3 additive deltas to interfaces (lines 170-194, 217, 227) + 1 header-annotation block insertion (after line 5) | AC-R18-1, -2, -3, -8, -9, -11 |
| `engine/types/verdict.js` | CHANGED (compiled output) | regenerated by typecheck/build | AC-R18-11 |
| `engine/topology-overlay.ts` | UNCHANGED | (read-only reference) | AC-R18-6 (consumed at runtime), AC-R18-10 (verified absent from diff) |
| `engine/topology-overlay.js` | UNCHANGED | (no source change) | (anti-scope) |
| `engine/verdict-groups.ts` | UNCHANGED | (read-only reference) | AC-R18-7 (grep verifies group_id format string still present), AC-R18-10 (verified absent from diff) |
| `engine/verdict-groups.js` | UNCHANGED | (no source change) | (anti-scope) |
| `test/_substrate/factories.ts` | UNCHANGED | (read-only reference) | (no AC binding) |
| `test/_substrate/v9X-cluster.ts` | CREATED | new file (~50 LoC) | AC-R18-4, -5, -6 |
| `test/_substrate/v9X-cluster.js` | CREATED | compiled output | (anti-scope allow-set) |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | CREATED | new file (~120 LoC, 10 runtime tests) | AC-R18-1 through -10 |
| `test/q18-phase2-slice1-topology-substrate.test.js` | CREATED | compiled output | AC-R18-12 |
| `coordination/specs/Q-R18-SPEC.md` | CREATED | this file | (routing artifact) |
| `coordination/specs/Q-R18-SPEC-AUDIT.md` | CREATED | sidecar | (audit-trail) |
| `coordination/NEXT-ROLE.md` | CHANGED | routing block update + (Implementer adds attestation block at chore time) | (coordination) |
| `coordination/MEMORIAL.md` | CHANGED (append-only) | Architect / Implementer / Reviewer / Memorial-Updater each append their ceremony sections | (coordination) |
| `coordination/VENDORING-MANIFEST.md` | UNCHANGED | (consulted for AC-R18-9 — 40 vendored paths; no rows added) | AC-R18-9 |

**Anti-scope verification path-set (allowed entries in `git diff b640c6c..HEAD --name-only` at Implementer GREEN attestation):** the union of the CREATED + CHANGED rows above. See AC-R18-10 for the explicit list.

---

## 4. Per-file pseudocode (Implementer-actionable; design decisions all made here)

### 4.1 `engine/types/verdict.ts` — apply Deltas 1-4 from § 2.1

Apply the four deltas described in § 2.1 verbatim. Specifically:

1. **Header annotation (Delta 4).** Locate the existing lines 1-5 (the `VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` block). After line 5 and before the existing `// engine/types/verdict.ts — Scenario, orchestrator return,` comment (currently line 7), insert the Tessera-amendment block from § 2.1 Delta 4 verbatim. Keep lines 1-5 byte-identical.

2. **VerdictGroup additive optional field (Delta 3).** Locate the existing `VerdictGroup` interface body (currently lines 170-194). Immediately BEFORE the `closed: boolean;` line (currently line 191), insert the comment block + field declaration from § 2.1 Delta 3 verbatim. Do not modify any other field. The grown interface body has the field count rise from 11 to 12 (10 required + 1 optional + the original `closed_at_ts` nullable required = 12 declared positions).

3. **TopologyNode.kind union (Delta 1).** Locate the existing `TopologyNode` interface body (currently lines 212-219). Modify the `kind:` line (currently line 217) from `kind: 'service' | 'database' | 'queue' | 'external';` to `kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack';`. Do not reorder existing values.

4. **TopologyEdge.relationship union (Delta 2).** Locate the existing `TopologyEdge` interface body (currently lines 222-229). Modify the `relationship:` line (currently line 227) from `relationship: 'calls' | 'reads' | 'writes' | 'publishes';` to `relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains';`. Do not reorder existing values.

**Do not modify anything else in the file.** No reordering of interfaces, no comment edits beyond Delta 4, no formatting changes. The diff against `b640c6c` for this file is exactly the union of the four deltas.

### 4.2 `test/_substrate/v9X-cluster.ts` — full file pseudocode

```typescript
// test/_substrate/v9X-cluster.ts — Phase 2 SLICE 1 synthetic-cluster substrate (R18).
//
// Single-rack uniform-shard fixture per SCOPING-MEMO-v0.3.md § 2.3 Q-J4(i)
// disposition. Builds a TopologySnapshot with 1 rack node + N gpu_shard
// nodes + N 'contains' edges. Default N=10.
//
// Naming convention parallels test/_substrate/factories.ts:
//   make<TypeName>(overrides?) → TypeName; defaults are deterministic-test
//   friendly; opts are shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../../engine/types/verdict';

export interface MakeV9XSingleRackClusterOpts {
  nShards?: number;
  rackId?: string;
  shardIdPrefix?: string;
  fetchedAtTs?: number;
}

export function makeV9XSingleRackCluster(
  opts: MakeV9XSingleRackClusterOpts = {},
): TopologySnapshot {
  const nShards = opts.nShards ?? 10;
  const rackId = opts.rackId ?? 'rack-0';
  const shardIdPrefix = opts.shardIdPrefix ?? 'shard-';
  const fetchedAtTs = opts.fetchedAtTs ?? 1700000000;

  const rackNode: TopologyNode = {
    id: rackId,
    service_name: rackId,
    kind: 'rack',
  };

  const shardNodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  for (let i = 0; i < nShards; i++) {
    const shardId = `${shardIdPrefix}${i}`;
    shardNodes.push({
      id: shardId,
      service_name: shardId,
      kind: 'gpu_shard',
    });
    edges.push({
      from: rackId,
      to: shardId,
      relationship: 'contains',
    });
  }

  return {
    nodes: [rackNode, ...shardNodes],
    edges,
    fetched_at_ts: fetchedAtTs,
    source_id: 'v9X_synthetic_single_rack',
    source_version: 'v9X.1',
  };
}
```

The file is to be written exactly as above. Imports come from `../../engine/types/verdict` (the relative path the existing `test/_substrate/factories.ts` uses for its own type imports).

### 4.3 `test/q18-phase2-slice1-topology-substrate.test.ts` — file pseudocode

The file is structured as 10 `node:test` runtime tests bound to AC-R18-1 through AC-R18-10. Imports + helper structure:

```typescript
// test/q18-phase2-slice1-topology-substrate.test.ts — Phase 2 SLICE 1 bindings (R18).
//
// Binds AC-R18-1 through AC-R18-10 (runtime) per Q-R18-SPEC.md § 5.
// AC-R18-11 (typecheck) and AC-R18-12 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
//
// Covers: TopologyNode.kind extension (gpu_shard + rack); TopologyEdge.relationship
// extension (contains); VerdictGroup.cluster_event_id optional field; v9X
// synthetic-cluster fixture (default + nShards=20); computeSnapshotHash
// determinism on v9X; inherited Addition #25 D5 + #26 D4 preservation;
// vendored-at-pin preservation; anti-scope diff verification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type {
  TopologyNode,
  TopologyEdge,
  VerdictGroup,
  FusedVerdict,
} from '../engine/types/verdict';
import { computeSnapshotHash } from '../engine/topology-overlay';
import { makeV9XSingleRackCluster } from './_substrate/v9X-cluster';
```

**AC-R18-1 test body:**

```typescript
test('AC-R18-1: TopologyNode.kind union accepts "gpu_shard" and "rack" literals', () => {
  const gpuShardKind: TopologyNode['kind'] = 'gpu_shard';
  const rackKind: TopologyNode['kind'] = 'rack';
  assert.strictEqual(gpuShardKind, 'gpu_shard');
  assert.strictEqual(rackKind, 'rack');
});
```

**AC-R18-2 test body:**

```typescript
test('AC-R18-2: TopologyEdge.relationship union accepts "contains" literal', () => {
  const containsRelationship: TopologyEdge['relationship'] = 'contains';
  assert.strictEqual(containsRelationship, 'contains');
});
```

**AC-R18-3 test body:** construct a `VerdictGroup` literal with `cluster_event_id` set and another with it omitted; assert behavior:

```typescript
test('AC-R18-3: VerdictGroup adds optional cluster_event_id (set + omit both typecheck at compile; behave correctly at runtime)', () => {
  const groupWith: VerdictGroup = {
    group_id: 'group-deploy-x-1700000000',
    deploy_id: 'deploy-x',
    window_start_ts: 1700000000,
    window_end_ts: 1700000300,
    verdicts: [] as FusedVerdict[],
    firing_verdicts: [] as FusedVerdict[],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [] as FusedVerdict[],
    closed: false,
    closed_at_ts: null,
    cluster_event_id: 'cluster-firmware-push-2026-05-17',
  };
  assert.strictEqual(groupWith.cluster_event_id, 'cluster-firmware-push-2026-05-17');

  const groupWithout: VerdictGroup = {
    group_id: 'group-deploy-y-1700000000',
    deploy_id: 'deploy-y',
    window_start_ts: 1700000000,
    window_end_ts: 1700000300,
    verdicts: [] as FusedVerdict[],
    firing_verdicts: [] as FusedVerdict[],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [] as FusedVerdict[],
    closed: false,
    closed_at_ts: null,
  };
  assert.strictEqual(groupWithout.cluster_event_id, undefined);
});
```

**AC-R18-4 test body:**

```typescript
test('AC-R18-4: makeV9XSingleRackCluster() default = 1 rack + 10 gpu_shards + 10 contains edges', () => {
  const snapshot = makeV9XSingleRackCluster();
  assert.strictEqual(snapshot.nodes.length, 11);
  assert.strictEqual(snapshot.edges.length, 10);
  const rackNodes = snapshot.nodes.filter((n) => n.kind === 'rack');
  const shardNodes = snapshot.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.strictEqual(rackNodes.length, 1);
  assert.strictEqual(shardNodes.length, 10);
  assert.strictEqual(rackNodes[0].id, 'rack-0');
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(shardNodes[i].id, `shard-${i}`);
    assert.strictEqual(shardNodes[i].kind, 'gpu_shard');
  }
  for (const e of snapshot.edges) {
    assert.strictEqual(e.relationship, 'contains');
    assert.strictEqual(e.from, 'rack-0');
  }
  assert.strictEqual(snapshot.source_id, 'v9X_synthetic_single_rack');
  assert.strictEqual(snapshot.source_version, 'v9X.1');
});
```

**AC-R18-5 test body:**

```typescript
test('AC-R18-5: makeV9XSingleRackCluster({ nShards: 20 }) = 1 rack + 20 gpu_shards + 20 contains edges', () => {
  const snapshot = makeV9XSingleRackCluster({ nShards: 20 });
  assert.strictEqual(snapshot.nodes.length, 21);
  assert.strictEqual(snapshot.edges.length, 20);
  const shardNodes = snapshot.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.strictEqual(shardNodes.length, 20);
  assert.strictEqual(shardNodes[19].id, 'shard-19');
});
```

**AC-R18-6 test body:**

```typescript
test('AC-R18-6: computeSnapshotHash on v9X fixture is deterministic across two invocations', () => {
  const snapshot = makeV9XSingleRackCluster();
  const h1 = computeSnapshotHash(snapshot);
  const h2 = computeSnapshotHash(snapshot);
  assert.strictEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});
```

**AC-R18-7 test body** — grep verifies inherited D5 group_id format string still present in `engine/verdict-groups.ts` at the byte-equality level (line number not asserted; just presence of the template literal substring):

```typescript
test('AC-R18-7: Inherited Addition #25 D5 — group_id format `group-${deployId}-${window_start_ts}` retained at engine/verdict-groups.ts', () => {
  const src = readFileSync('engine/verdict-groups.ts', 'utf-8');
  assert.match(src, /group-\$\{deployId\}-\$\{window_start_ts\}/);
});
```

**AC-R18-8 test body** — grep verifies inherited Addition #26 D4 literal-`true` type retained in `TopologyCandidate`:

```typescript
test('AC-R18-8: Inherited Addition #26 D4 — TopologyCandidate.correlational_not_causal literal true type retained', () => {
  const src = readFileSync('engine/types/verdict.ts', 'utf-8');
  assert.match(src, /correlational_not_causal:\s*true;/);
});
```

Note: the trailing-semicolon pattern matches only the interface field declaration, not the inline comment `correlational_not_causal: true is a required literal label` at the preamble (that comment line has no trailing semicolon). Verification-command-soundness per R03 reinforcement.

**AC-R18-9 test body** — verify all 40 vendored files retain SHA pin in first-line header. Use existing q01-vendoring-coverage pattern: parse `coordination/VENDORING-MANIFEST.md` to enumerate the 40 destination paths under `tessera/` and assert each on-disk file's first line contains `VENDORED FROM DeploySignal main@5a72371`:

```typescript
test('AC-R18-9: All 40 vendored files retain SHA pin 5a72371 in first-line header', () => {
  // Parse VENDORING-MANIFEST.md for destination paths under engine/. Each row
  // has cells separated by `|`; column 2 is the tessera-side path (e.g.,
  // `tessera/engine/types/verdict.ts`). Strip leading `tessera/` to obtain
  // repo-relative path. For each path, read first line of the on-disk file
  // and assert it contains the canonical SHA pin string.
  const manifest = readFileSync('coordination/VENDORING-MANIFEST.md', 'utf-8');
  const paths: string[] = [];
  for (const line of manifest.split('\n')) {
    const m = line.match(/\|\s*(tessera\/engine\/[^|`\s]+\.ts)\s*\|/);
    if (m) paths.push(m[1].replace(/^tessera\//, ''));
  }
  assert.strictEqual(paths.length, 40, `expected 40 vendored paths in manifest, got ${paths.length}`);
  for (const p of paths) {
    const firstLine = readFileSync(p, 'utf-8').split('\n')[0];
    assert.match(
      firstLine,
      /VENDORED FROM DeploySignal main@5a72371/,
      `vendored file ${p} first line does not contain SHA pin: ${firstLine}`
    );
  }
});
```

If the manifest's exact parsing pattern (regex above) needs adjustment based on the actual manifest table format, the Implementer adapts the regex to match the existing q01-vendoring-coverage parsing approach. The AC binds the **outcome** (40 paths × first-line SHA pin), not the parsing implementation. **Open-question protection:** if the manifest enumeration yields a count != 40, the Implementer halts with DIAGNOSTIC (per NEXT-ROLE.md halt condition discipline) — the spec assumes 40 per the pre-R18 baseline.

**AC-R18-10 test body** — anti-scope diff verification:

```typescript
test('AC-R18-10: Anti-scope — git diff b640c6c..HEAD --name-only ⊆ allowed-set', () => {
  const allowed = new Set([
    'engine/types/verdict.ts',
    'engine/types/verdict.js',
    'test/_substrate/v9X-cluster.ts',
    'test/_substrate/v9X-cluster.js',
    'test/q18-phase2-slice1-topology-substrate.test.ts',
    'test/q18-phase2-slice1-topology-substrate.test.js',
    'coordination/specs/Q-R18-SPEC.md',
    'coordination/specs/Q-R18-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
  ]);
  const diff = execSync('git diff b640c6c..HEAD --name-only', { encoding: 'utf-8' });
  const touched = diff.split('\n').filter((p) => p.length > 0);
  for (const p of touched) {
    assert.ok(allowed.has(p), `Unexpected file in R18 diff vs b640c6c: ${p}`);
  }
});
```

Baseline `b640c6c` is HEAD at R18 session start (per `git log --oneline` first row at session start). The allowed-set covers Architect-authored artifacts (Q-R18-SPEC.md + audit + NEXT-ROLE.md routing block) and Implementer-authored artifacts (verdict.ts deltas + v9X-cluster.ts + q18 test file + their compiled .js siblings + NEXT-ROLE.md attestation block + MEMORIAL.md ceremony append). Memorial-Updater + Reviewer artifacts land AFTER Implementer GREEN attestation; they are out of scope for AC-R18-10's binding-time check.

### 4.4 RED → GREEN cycle (TDD discipline; required at every round per R03 reinforcement)

1. **RED commit.** Write `test/q18-phase2-slice1-topology-substrate.test.ts` with `assert.fail('RED: AC-R18-N pending')` in the body of each of the 10 tests. Do NOT yet write `test/_substrate/v9X-cluster.ts`. Do NOT yet apply the verdict.ts deltas. Compile (`npx tsc --noEmit` will fail; that is expected — `assert.fail` in test bodies + missing imports). RED state: `node --test test/q18-*.test.js` shows 10 failing tests; `npm test` total = 171 + 10 fails = 171 pass / 10 fail (or similar pattern). Commit message: `chore(R18): RED — q18 placeholders`.
2. **GREEN commit.** Apply the four deltas to `engine/types/verdict.ts` (§ 2.1). Write `test/_substrate/v9X-cluster.ts` (§ 4.2). Replace each `assert.fail('RED: ...')` with the real test body (§ 4.3). Compile. Verify `npx tsc --noEmit` exits 0. Run `node --test test/*.test.js`; expect **181 pass / 0 fail** (171 prior + 10 new). Commit message: `feat(R18): GREEN — Phase 2 SLICE 1 topology substrate + cluster_event_id`.
3. **Coordination chore commits** per NEXT-ROLE.md "Coordination chore sequence" lines 64-71: SHA-A `chore(R18): coordination artifacts`; SHA-B `chore(R18): record attestation SHA <SHA-A>`. The Reviewer's verification at step 7 is `git diff SHA-A..HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty (chore-B does not touch those paths).

### 4.5 NEXT-ROLE.md routing block update (Architect-side, applied now during this session)

Update the top three lines of `coordination/NEXT-ROLE.md` from:

```
CURRENT-ROUND: R18
NEXT-ROLE: ARCHITECT
STATUS: READY
```

To:

```
CURRENT-ROUND: R18
NEXT-ROLE: IMPLEMENTER
STATUS: READY
Inputs: coordination/specs/Q-R18-SPEC.md (+ Q-R18-SPEC-AUDIT.md sidecar)
```

Leave **all subsequent sections of NEXT-ROLE.md byte-identical** (the operator-authored scope, halt conditions, pre-R18 baseline, coordination chore sequence, post-R18 chain, operator gate items, and update history are load-bearing for downstream roles).

---

## 5. Acceptance criteria

All ACs verified at Implementer GREEN attestation. Counts (AC-R18-12) are OBSERVED, not predicted. Per R03 MINOR-4 reinforcement, Implementer reports the count it actually measures.

| AC | Given / When / Then |
|---|---|
| **AC-R18-1** | Given `engine/types/verdict.ts` after Delta 1 is applied, when `node --test test/q18-*.test.js` runs the AC-R18-1 test, then both `const k: TopologyNode['kind'] = 'gpu_shard'` and `const k: TopologyNode['kind'] = 'rack'` typecheck AND `assert.strictEqual(gpuShardKind, 'gpu_shard')` + `assert.strictEqual(rackKind, 'rack')` pass. |
| **AC-R18-2** | Given `engine/types/verdict.ts` after Delta 2 is applied, when `node --test test/q18-*.test.js` runs the AC-R18-2 test, then `const r: TopologyEdge['relationship'] = 'contains'` typechecks AND `assert.strictEqual(containsRelationship, 'contains')` passes. |
| **AC-R18-3** | Given `engine/types/verdict.ts` after Delta 3 is applied, when `node --test test/q18-*.test.js` runs the AC-R18-3 test, then the VerdictGroup literal with `cluster_event_id` set AND the literal with it omitted both typecheck; the set literal reports `cluster_event_id === 'cluster-firmware-push-2026-05-17'` AND the omitted literal reports `cluster_event_id === undefined`. |
| **AC-R18-4** | Given `test/_substrate/v9X-cluster.ts` after creation, when `node --test test/q18-*.test.js` runs the AC-R18-4 test, then `makeV9XSingleRackCluster()` returns a `TopologySnapshot` with `nodes.length === 11`, `edges.length === 10`, exactly one node of `kind: 'rack'` with `id: 'rack-0'`, exactly ten nodes of `kind: 'gpu_shard'` with `id ∈ {'shard-0',…,'shard-9'}`, ten edges all of `relationship: 'contains'` and `from: 'rack-0'`, `source_id === 'v9X_synthetic_single_rack'`, `source_version === 'v9X.1'`. |
| **AC-R18-5** | Given `test/_substrate/v9X-cluster.ts` after creation, when `node --test test/q18-*.test.js` runs the AC-R18-5 test, then `makeV9XSingleRackCluster({ nShards: 20 })` returns a `TopologySnapshot` with `nodes.length === 21` AND `edges.length === 20` AND the 20th shard has `id: 'shard-19'`. |
| **AC-R18-6** | Given `test/_substrate/v9X-cluster.ts` after creation, when `node --test test/q18-*.test.js` runs the AC-R18-6 test, then `computeSnapshotHash(makeV9XSingleRackCluster())` returns a 64-hex-char string AND two consecutive invocations on the same input yield byte-identical results. |
| **AC-R18-7** | Given `engine/verdict-groups.ts` is byte-identical at HEAD vs `b640c6c`, when `node --test test/q18-*.test.js` runs the AC-R18-7 test, then `readFileSync('engine/verdict-groups.ts', 'utf-8')` matches `/group-\$\{deployId\}-\$\{window_start_ts\}/` (the inherited D5 group_id template literal substring is present). |
| **AC-R18-8** | Given Delta 3 has been applied (VerdictGroup now has the optional field) but the `TopologyCandidate` interface is otherwise byte-identical, when `node --test test/q18-*.test.js` runs the AC-R18-8 test, then `readFileSync('engine/types/verdict.ts', 'utf-8')` matches `/correlational_not_causal:\s*true;/` (the inherited Addition #26 D4 literal-`true` field declaration is present, distinguished from the preamble comment by the trailing semicolon). |
| **AC-R18-9** | Given `coordination/VENDORING-MANIFEST.md` enumerates 40 vendored paths (per pre-R18 baseline at `b640c6c`), when `node --test test/q18-*.test.js` runs the AC-R18-9 test, then 40 paths are parsed AND each on-disk file's first line matches `/VENDORED FROM DeploySignal main@5a72371/`. (Delta 4's amendment annotation lives below the first line; first-line byte-identicality is preserved.) |
| **AC-R18-10** | Given the Implementer GREEN attestation commit (post-coordination-chore SHA-B), when `node --test test/q18-*.test.js` runs the AC-R18-10 test, then `git diff b640c6c..HEAD --name-only` yields a path-set that is a subset of the 10-entry allowed-set enumerated in § 4.3 AC-R18-10 test body. |
| **AC-R18-11** | Given Deltas 1-4 applied + v9X-cluster.ts + q18-*.test.ts created, when the Implementer runs `npx tsc --noEmit`, then exit code is 0 (Implementer reports OBSERVED). |
| **AC-R18-12** | Given the GREEN state, when the Implementer runs `node --test test/*.test.js`, then total pass = 171 (pre-R18 baseline per NEXT-ROLE.md:74-94) + 10 (new q18 runtime tests) = **181 pass / 0 fail expected**; the per-file q18 count is **10/0**. Implementer reports per-file OBSERVED counts (per R03 MINOR-4 reinforcement); if observed total differs from 181 the Implementer halts with DIAGNOSTIC (likely cause: a prior file's count drifted unexpectedly). |

---

## 6. Anti-scope (explicit; HALT if any temptation actioned)

R18 does NOT do any of the following — each is explicitly out of scope and (most) named in NEXT-ROLE.md halt conditions:

| Item | Why out-of-scope | If tempted: HALT condition |
|---|---|---|
| HardwareTopologySource concrete impl | Phase 2 SLICE 3 per v0.3 § 2.3 + § 3 line 346 | NEXT-ROLE.md halt (e) |
| Deployment-event-feed ingestion | Phase 2 SLICE 4 per v0.3 § 3 | NEXT-ROLE.md halt (e) |
| `TopologyNode.kind` values `'psu'` / `'cooling_zone'` | Deferred to later Phase 2 SLICE per NEXT-ROLE.md line 12 | NEXT-ROLE.md halt (e) |
| `TopologyEdge.relationship` peer values `'nvlink_peer'` / `'shares_psu'` / `'co_located_in_rack'` | Need BFS-on-undirected adaptation eval at PR-F6; Phase 2 SLICE 3 work | NEXT-ROLE.md halt (e) |
| Cross-shard correlation logic | Phase 2 SLICE 2+ work per v0.3 § 3 line 345 | NEXT-ROLE.md halt (e) |
| Modification of inherited engine internals beyond the four deltas in `engine/types/verdict.ts` | A12/A5 anti-scope per PRD; v0.3 § 9 vendoring policy | spec-internal HALT (any non-verdict.ts engine file change is forbidden) |
| Modification of `engine/topology-overlay.ts` (BFS / hash / Enricher) | A12/A5 anti-scope | spec-internal HALT |
| Modification of `engine/verdict-groups.ts` (factory / aggregator) | A12/A5 anti-scope; additive optional doesn't force factory change | spec-internal HALT |
| Modification of any other file under `engine/types/` (beyond verdict.ts) | A12/A5 anti-scope | spec-internal HALT |
| Modification of any prior-round test file (q01-q17, betting-e-process-class-dispatch) | Existing 18 test files preserved verbatim per pre-R18 baseline | spec-internal HALT |
| Modification of `tools/` or `src/` | A12/A5 anti-scope | spec-internal HALT |
| Modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md` | Operator-authored; R17 TQ-1 closed | NEXT-ROLE.md halt (d) (PR-F5 amendment temptation analog) |
| Disposition of any operator-gate item (PR #38, OQ-1, OQ-R08-3, prior MINOR/OBS) | Operator triage scope | NEXT-ROLE.md halt (f) (analog from prior rounds) |
| Phase 2 SLICE 2+ work | HARD STOP at SLICE 1 close per evening-overnight authority | NEXT-ROLE.md scope-fence |
| Bundling `test/q18-*.test.ts` AC count beyond 10 runtime tests | Round size discipline; NEXT-ROLE.md "AC count target: 6-12 (small, focused round)" | spec-internal HALT |
| Renaming or relocating `test/_substrate/v9X-cluster.ts` | Spec prescribes the path explicitly | spec-internal HALT |

---

## 7. Open questions

**None — all resolved.**

The following potential ambiguities were considered and explicitly dispositioned inline:

1. **Should `'contains'` BFS treat edges as directional (parent→child) or bidirectional?** Resolved: **bidirectional**, inheriting the existing `engine/topology-overlay.ts:262-285` semantic. Directional-traversal needs are deferred to Phase 2 SLICE 3 HardwareTopologySource ADR + PR-F6 pair-review. See § 2.1 Delta 2 architectural-decision paragraph.
2. **Should the verdict.ts header annotation modify the canonical SHA-pin line or add new lines?** Resolved: **add new lines AFTER line 5**, leaving lines 1-5 byte-identical so any vendoring-coverage first-line check continues to pass. See § 2.1 Delta 4.
3. **Should `cluster_event_id` participate in the Addition #25 D5 group_id format at SLICE 1?** Resolved: **no**, group_id format stays inherited (`group-{deploy_id}-{window_start_ts}`); potential D5 amendment is Phase 2 SLICE 2 outer-aggregator work. AC-R18-7 binds D5 preservation. See § 2.1 Delta 3 comment block.
4. **Where should the v9X fixture live?** Resolved: dedicated module `test/_substrate/v9X-cluster.ts`, paralleling `test/_substrate/factories.ts` convention. See Approach C in § 0.
5. **What baseline SHA does AC-R18-10 anti-scope use?** Resolved: **`b640c6c`** — HEAD at R18 session start, per R15 MINOR-1 reinforcement (last commit immediately before round work begins). See § 4.3 AC-R18-10 test body.
6. **What is the AC-R18-9 vendored-file count?** Resolved: **40**, per pre-R18 baseline at `b640c6c` (carried over from R15-R17). If the Implementer observes a count != 40 from the manifest, halt with DIAGNOSTIC.

---

## 8. P3 ten-axis verification (one sentence per axis)

- **Correctness.** Each delta in § 2.1 is type-additive and verified-additive against the actual `engine/types/verdict.ts` declaration sites (lines 170-194, 212-219, 222-229) — confirmed by file open at session start, not from memory or prior-round testimony.
- **Completeness.** All five NEXT-ROLE.md R18-SHIPS items map 1:1 to spec deliverables (TopologyNode.kind → Delta 1; TopologyEdge.relationship → Delta 2; VerdictGroup.cluster_event_id → Delta 3; v9X fixture → § 4.2; new test file → § 4.3); all five NEXT-ROLE.md halt conditions are dispositioned (D2/D5 preserved via additive optional + no factory modification; kind switch verified-absent via grep; contains BFS semantics explicitly dispositioned inherited-bidirectional; v9X format specified in detail; peer/HardwareTopologySource scope expansion explicitly anti-scoped).
- **Consistency.** Cross-section consistency pass (R02 reinforcement, 11th application): the tokens `'gpu_shard'`, `'rack'`, `'contains'`, `cluster_event_id`, `makeV9XSingleRackCluster`, `b640c6c`, `v9X_synthetic_single_rack`, and AC-R18-N numbering are byte-identical across § Mechanism + § Component inventory + § Per-file pseudocode + § Acceptance criteria + § Anti-scope; the Q-R18-SPEC-AUDIT.md sidecar carries the cross-check log.
- **Clarity.** Each delta carries an explicit BEFORE/AFTER block in § 2.1; each AC carries a Given/When/Then with the exact assertion form; the Implementer can act without re-reading the inherited engine source (declarations are quoted inline).
- **Coverage.** AC-R18-1 through -5 bind the four code-shaped deliverables (3 deltas + 1 fixture); AC-R18-6 binds runtime integration (computeSnapshotHash determinism on v9X); AC-R18-7 through -9 bind the three preserved-inheritance contracts (D5, D4, vendoring-SHA pin); AC-R18-10 binds anti-scope; AC-R18-11 binds typecheck; AC-R18-12 binds the per-file test-count regression surface.
- **Constraints.** v0.3 § 9.4 in-place-with-header-annotation policy honored (Delta 4); A12/A5 detector-internals anti-scope honored (no non-verdict.ts engine file changes); Addition #25 D2 + D5 + Addition #26 D4 all preserved at SLICE 1; NEXT-ROLE.md "AC count target: 6-12" honored (10 runtime + 2 binding-command = 12).
- **Concurrency.** No concurrency surface introduced; v9X fixture builder is synchronous + deterministic; `computeSnapshotHash` is pure-functional; tests use `node:test` standard runner with no fixture-shared state.
- **Corner cases.** `cluster_event_id` set vs omitted both covered (AC-R18-3); `nShards` default vs override both covered (AC-R18-4 + AC-R18-5); `computeSnapshotHash` determinism on the 'contains'-edge-bearing snapshot covered (AC-R18-6); vendoring-header annotation does not break first-line SHA-pin check covered (AC-R18-9 + Delta 4 placement); negative-case "out-of-union literal" cases (e.g., `'psu'`) are NOT included as runtime tests (TypeScript compile-time-only; would require `@ts-expect-error` annotations that bloat the file beyond the round-size budget).
- **Cost.** Round size: 4 code-shaped deliverables (3 deltas + 2 new files + 1 routing-block update) + 12 ACs, well within NEXT-ROLE.md target; expected total LoC delta ≈ 200 (≈ 20 in verdict.ts + ≈ 50 in v9X-cluster.ts + ≈ 120 in q18-*.test.ts + ≈ 10 in NEXT-ROLE.md).
- **Coupling.** SLICE 1 deliberately couples only at the type-surface extension points (vendoring-policy-prescribed); zero non-verdict.ts engine file modified; the v9X fixture decoupled into its own module so SLICE 2-4 growth doesn't churn factories.ts; preserved D2/D5/D4 contracts ensure SLICE 2+ outer aggregator wiring is a strict additive extension.

---

## 9. Grilling output (Superpowers Review phase — adversarial self-review, inline)

Per the session prompt's "Confirm no scope beyond the request was added" + the pre-emit-grilling reinforcements at R02 / R03 / R05 / R10 / R13 / R15 / R17.

### 9.1 Every claim verifiable?

| Claim | Verifiable how? | Verdict |
|---|---|---|
| `TopologyNode.kind` declared at verdict.ts:217 with union `'service' | 'database' | 'queue' | 'external'` | File opened at session start; line 217 read | PASS |
| `TopologyEdge.relationship` declared at verdict.ts:227 with union `'calls' | 'reads' | 'writes' | 'publishes'` | File opened; line 227 read | PASS |
| `VerdictGroup` declared at verdict.ts:170-194 (NOT 141-188 as NEXT-ROLE.md cites) | File opened; interface body read | PASS (NEXT-ROLE.md citation is ~30 lines off; note in audit sidecar) |
| `TopologyCandidate.correlational_not_causal: true;` at verdict.ts:261 | File opened; line 261 read | PASS |
| BFS at topology-overlay.ts:262-285 is unconditionally bidirectional (no switch on relationship) | File opened; BFS body read at lines 265-268 | PASS |
| `computeSnapshotHash` lex-sorts on `relationship` field at topology-overlay.ts:71-75 | File opened; sort body read | PASS |
| `VerdictGroup` factory at verdict-groups.ts:147 enumerates required fields by name | File opened; factory body read at lines 145-163 | PASS |
| Group_id format at verdict-groups.ts:142 is `group-${deployId}-${window_start_ts}` | File opened; line 142 read | PASS |
| No exhaustive switch on `TopologyNode.kind` anywhere in repo | Grep over `engine/`, `tools/`, `src/`, `test/` for `.kind ===`, `\.kind\b` — only matches are on unrelated types (ConformalParams in detectors/conformal.ts, weighted-e-value in families/e.ts) | PASS |
| No exhaustive switch on `TopologyEdge.relationship` anywhere in repo | Grep over same dirs for `.relationship ===`, `\.relationship\b` — only matches are the BFS hash-sort and TopologyCandidateEvent context (no exhaustive switch) | PASS |
| Pre-R18 baseline 171/0 test count | NEXT-ROLE.md:74-94 enumeration; sum = 3+1+5+6+13+11+13+13+23+11+18+16+14+6+7+4+2+5 = 171 | PASS (arithmetic verified) |
| 40 vendored files | NEXT-ROLE.md halt condition (b) "vendored SHA drift" + AC-R18-9 inherited pattern from R15 | PASS (inherited) |
| Baseline SHA `b640c6c` is HEAD at session start | `git log --oneline -5` first row at session start | PASS |

### 9.2 Unstated assumptions?

- **Assumption A:** `engine/types/verdict.js` will be regenerated by the Implementer's `npx tsc` compile step and is therefore expected in the AC-R18-10 allowed-set. Mitigation: explicitly listed in § 4.3 AC-R18-10 allowed-set + § 3 component inventory. PASS.
- **Assumption B:** `q01-vendoring-coverage.test.js` checks only the canonical first-line SHA pin (not subsequent header lines). Mitigation: Delta 4 is structured to leave lines 1-5 byte-identical regardless; AC-R18-9 independently re-verifies first-line content. If a hidden check on subsequent lines exists, AC-R18-12 (total test count) catches the regression. PASS (defensive).
- **Assumption C:** The Tessera test pipeline compiles `.ts` → `.js` before `node --test test/*.test.js` runs. Mitigation: confirmed by inspection of existing parallel `test/_substrate/factories.ts` + `factories.js`. PASS.
- **Assumption D:** No other process between session start and Implementer GREEN will commit unrelated files that broaden the `git diff b640c6c..HEAD` set beyond the allowed-set. Mitigation: AC-R18-10 binds at GREEN attestation time; if an unexpected file appears, the Implementer halts with DIAGNOSTIC per NEXT-ROLE.md halt-discipline (R08 reinforcement). PASS.
- **No unstated assumptions remain.**

### 9.3 Scope added beyond request?

NEXT-ROLE.md R18 SHIPS list (5 items): TopologyNode.kind extension; TopologyEdge.relationship extension; VerdictGroup.cluster_event_id additive field; v9X synthetic-cluster fixture; new test file with 6-12 ACs.

Spec deliverables (5 corresponding items): Delta 1 (TopologyNode.kind); Delta 2 (TopologyEdge.relationship); Delta 3 (VerdictGroup.cluster_event_id) + Delta 4 (header annotation, vendoring-policy-mandated companion); § 4.2 v9X-cluster.ts; § 4.3 q18-*.test.ts (10 runtime + 2 binding-command = 12 ACs).

Mapping: 1:1 (Delta 4 is the v0.3 § 9.4 vendoring-policy companion of Deltas 1-3, not a new feature). **No scope added beyond request.** PASS.

### 9.4 Implementer can act without guessing?

| Decision point | Resolved here? |
|---|---|
| What lines of verdict.ts to modify and how | YES — § 2.1 Deltas 1-4 with BEFORE/AFTER blocks |
| Where to insert the header annotation | YES — § 2.1 Delta 4 explicitly says "AFTER line 5, before existing line 7" |
| Where to insert the cluster_event_id field inside VerdictGroup | YES — § 2.1 Delta 3 "immediately BEFORE the `closed: boolean;` line" |
| Default `nShards` value | YES — 10 (§ 2.2) |
| What `'contains'` BFS semantics R18 commits to | YES — bidirectional, inherited; deferred-decision-deferred-explicitly (§ 2.1 Delta 2 architectural-decision paragraph) |
| Whether to modify verdict-groups.ts factory for the new optional field | YES — NO, optional field defaults to undefined; factory untouched (§ 2.1 Delta 3 + § 6 anti-scope) |
| Whether the cluster_event_id participates in the D5 group_id format at SLICE 1 | YES — NO, format unchanged at SLICE 1; AC-R18-7 binds preservation (§ 7 open-question 3) |
| What test count to expect at GREEN | YES — 171 + 10 = 181 expected; Implementer reports OBSERVED per R03 MINOR-4 (§ 5 AC-R18-12) |
| What baseline SHA to use for anti-scope diff | YES — `b640c6c` (§ 4.3 AC-R18-10 + § 7 open-question 5) |
| What AC-R18-9 manifest-count to assert | YES — 40 (§ 4.3 AC-R18-9 + § 7 open-question 6) |
| RED → GREEN commit boundary | YES — § 4.4 |
| Where to put the v9X fixture | YES — `test/_substrate/v9X-cluster.ts` (§ 4.2) |
| What `q01-vendoring-coverage` first-line invariant looks like | YES — preserved by Delta 4 placement (§ 2.1) |

**Implementer can act with zero clarifying questions.** PASS.

### 9.5 Verification-command-soundness pass (per R03 MINOR-2 reinforcement)

- AC-R18-7 pattern `/group-\$\{deployId\}-\$\{window_start_ts\}/`: the literal `${...}` template syntax does not appear in JSDoc / inline comments anywhere in verdict-groups.ts (verified by full-file grep at session start). Pattern matches only the template-literal source at line 142. **Sound.**
- AC-R18-8 pattern `/correlational_not_causal:\s*true;/`: trailing semicolon distinguishes the interface field declaration (verdict.ts:261, `correlational_not_causal: true;`) from the preamble comment (verdict.ts:244, `correlational_not_causal: true is a required literal label` — no semicolon). The pattern does not match anywhere else in the file. **Sound.**
- AC-R18-9 pattern `/VENDORED FROM DeploySignal main@5a72371/`: first-line-only check (`readFileSync(p).split('\n')[0]`) excludes subsequent header lines including the new Tessera amendment block. **Sound.**

### 9.6 Spec-internal-contradiction pass (per R15 MINOR-3 reinforcement)

Cross-checked each (NEXT-ROLE.md halt condition, spec disposition) pair:

- Halt (a) "D2/D5 violation" ↔ Spec § 2.1 Delta 3 + AC-R18-7: both prescribe preservation; AC binds D5 verbatim; D2 preserved structurally (verdict-groups.ts untouched). **Consistent.**
- Halt (b) "kind switch break" ↔ Spec § 1 + § 8 correctness axis + grilling § 9.1: grep verified no exhaustive switches. **Consistent.**
- Halt (c) "contains semantics ambiguity" ↔ Spec § 2.1 Delta 2 architectural-decision: explicitly accept inherited bidirectional; no HALT. **Consistent.**
- Halt (d) "v9X fixture format" ↔ Spec § 2.2 + § 4.2: specified fully. **Consistent.**
- Halt (e) "scope expansion" ↔ Spec § 6 anti-scope: explicit list of all expansion temptations. **Consistent.**

No spec-internal contradictions detected.

### 9.7 Empirical-premise-verification pass (per R08 MAJOR-2 reinforcement)

- Premise "no exhaustive switch on `TopologyNode.kind`": **verified by grep at session start**, not inherited testimony.
- Premise "BFS at topology-overlay.ts:262-285 is unconditionally bidirectional": **verified by file open + body read at session start**, not inherited testimony.
- Premise "VerdictGroup factory at verdict-groups.ts:147 enumerates required fields": **verified by file open at session start**, not inherited testimony.
- Premise "40 vendored files at SHA 5a72371": **inherited from R15-R17 testimony** (NEXT-ROLE.md baseline + halt condition (b) "no drift surfaced at R15"). Mitigated: AC-R18-9 re-verifies empirically at Implementer GREEN. **PASS via inheritance + AC re-check.**

### 9.8 Final verdict

All 7 grilling gates PASS. Spec is ready to route.

---

---

## Amendments (post-Reviewer)

### Amendment R18-A1 — AC-R18-10 allowed-set expansion (R18 MINOR-1 disposition)

**Background.** Spec § 4.3 prescribed a 10-entry AC-R18-10 allowed-set. At implementation time, the `q01-no-at-pin-deltas.test.js` byte-identity check failed when Deltas 1-3 modified the `engine/types/verdict.ts` body (see `coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md`). Anti-scope prohibited modifying the q01 test file unilaterally.

**Operator disposition.** Option A dispositioned at commit `5aa8cf0`: approve targeted exception to update `test/q01-no-at-pin-deltas.test.js` AT_PIN_FILES list and `coordination/VENDORING-MANIFEST.md` row status, analogous to the R01 `engine/types/config.ts` vendored-with-deltas precedent.

**Amendment to AC-R18-10 allowed-set.** The 10-entry list in spec § 4.3 is superseded by the 15-entry list in `test/q18-phase2-slice1-topology-substrate.test.ts:143-161`. The 5 added entries are:
1. `coordination/OVERNIGHT-LOG-2026-05-17.md` — operator triage log written during ESCALATE cycle
2. `coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md` — DIAGNOSTIC written at ESCALATE
3. `test/q01-no-at-pin-deltas.test.ts` — AT_PIN_FILES update (Option A); was spec § 6 anti-scope, became permissible via operator disposition
4. `test/q01-no-at-pin-deltas.test.js` — compiled companion (gitignored; consistent with policy)
5. `coordination/VENDORING-MANIFEST.md` — manifest row update (Option A); was spec § 3 "UNCHANGED", became permissible via operator disposition

All 5 entries are documented in the Implementer unblock commit message at `5aa8cf0`. The AC-R18-10 contract (all changed files are within the allowed-set) remains binding at the expanded boundary.

**Surfaced by:** `coordination/reviews/REVIEWER-REPORT-R18.md` MINOR-1.

---

_End of Q-R18-SPEC.md._
