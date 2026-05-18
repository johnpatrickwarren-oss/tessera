# Q-R23-SPEC — Phase 2 SLICE 3.A: HardwareTopologySource scaffold + type-layer enum extensions

**Round:** R23 (full tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Phase / SLICE:** Phase 2 SLICE 3.A (first round of SLICE 3; SLICE 3.B = R24 ingestion adapters; SLICE 3.C = R25 MD-F4 + common-mode injection + hybrid Reviewer; SLICE 3 close-walk = R26)
**Scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 Extension 3 (line 198+); § 3 SLICE 3 row (line 346); `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` § 3 (line 124+); `coordination/NEXT-ROLE.md` R23 round-scope directive
**PRD trace:** FR-E3b (cross-shard correlation: topology-aware spatial attribution; HardwareTopologySource impl against Addition #26 TopologySource interface) · US-02 (topology-aware common-mode failure attribution) · AC-P4 (long-horizon)
**Baseline SHA (anti-scope diff lower bound):** `2946b13` (R23-prep chore; HEAD at R23 session entry)
**Pre-R23 baseline test count:** 204 / 0 (per `coordination/NEXT-ROLE.md` § "Phase 2 SLICE 3 readiness state at R23 entry")

---

## § 0 Brainstorm phase (Superpowers — inline)

### § 0.1 Sub-scope split (R23 vs R24 vs R25 vs R26)

**Approach A — NEXT-ROLE-recommended split (PICKED).** R23 = type-layer enum extensions + HardwareTopologySource scaffold (Static-style constructor) + v9Y multi-rack synthetic-cluster fixture + AC suite. R24 = real ingestion adapters (Slurm topology / K8s node-label / NVIDIA NVLink-topology). R25 = MD-F4 topology-aware spatial attribution + common-mode failure-injection empirical test + PR-F6 hybrid Reviewer. R26 = SLICE 3 close-walk.
- **Strengths:** ≤ 15 ACs target met; each sub-round reviewable in one Reviewer pass; respects close-walk § 3 architectural sketch; preserves R22 round-size precedent (R20: 15 ACs; R21: 11 ACs; R22: 8 ACs).
- **Weaknesses:** four sub-rounds for one SLICE (≥ predicted upper bound 4 cycles); cross-round contract surface between R23 (scaffold class API) and R24 (ingestion adapters) needs to stay stable.
- **Hidden assumptions:** R24 ingestion adapters can be designed to coexist with the R23 Static constructor signature (operationally: R24 will either (i) subclass R23's class or (ii) ship parallel concrete classes against the same `TopologySource` interface — R23 spec does not constrain this).
- **Risks:** low; matches inherited DeploySignal SLICE 1-vs-SLICE 2 separation pattern (StaticTopologySource at SLICE 1, fetch-based OtelServiceGraphV1 at SLICE 2 within the same `engine/topology-overlay.ts` file).

**Approach B — Single round bundling scaffold + ingestion + MD-F4.**
- **Strengths:** single round; no cross-round contract surface.
- **Weaknesses:** projected AC count exceeds 25+ (3 ingestion adapters × ~5 ACs each + scaffold + MD-F4 + common-mode injection); blows past R20-R22 reviewable-budget precedent; PR-F6 hybrid Reviewer would have to fire at this round; spec authoring time exceeds session budget.
- **Risks:** high spec drift; high Reviewer cognitive load; likely to surface multiple MAJORs.

**Approach C — R23 = scaffold + R24-merged: scaffold + ingestion in one round; R25 = MD-F4 (3-round split instead of 4).**
- **Strengths:** one less round.
- **Weaknesses:** R24 ingestion adapters require Slurm / K8s / NVLink schema enumeration (genuinely novel surface per NEXT-ROLE.md A1) — that alone is ~3 ACs per format × 3 formats ≈ 9 ACs; adding scaffold ACs (~7) yields ~16+ ACs; tight against reviewable-budget.
- **Risks:** medium; cleaner than B but R24 still likely to bloat past reviewable bound.

**Selection rationale:** Approach A. The 4-round split for a 3-4-Q-cycle SLICE matches SCOPING-MEMO § 3 line 350 estimate ("~2-3 architect-pre-predicted iterative-refinement cycles concentrated in SLICE 3"). Each sub-round has a clear architectural boundary (scaffold / ingestion / empirical-evidence / close-walk). Cross-round contract surface (R23 → R24) is the `HardwareTopologySource` class API which is small and stable.

### § 0.2 Type-layer enum extensions

**Approach A — Three node-kind extensions + one new edge-relationship literal (PICKED).** Extend `TopologyNode.kind` with `'psu' | 'cooling_zone'` (the two remaining v0.3 enumerations from SCOPING-MEMO § 2.3 line 205). Extend `TopologyEdge.relationship` with `'nvlink_peer'` only (one new literal).
- **Strengths:** minimal enum surface; `'contains'` (R18) already supports hierarchical containment from PSU/cooling_zone to gpu_shards (BFS at `engine/topology-overlay.ts:265-267` is bidirectional regardless of relationship literal, so containment-from-PSU and containment-from-rack are structurally equivalent); only the genuinely-different semantic (NVLink peer-to-peer) gets a new literal.
- **Weaknesses:** if R25 common-mode injection wants to distinguish "rack-localized" from "PSU-localized" co-occurrence at the relationship-label level, the spatial-attribution layer must read the `from`-node's `kind` rather than the edge's `relationship`. Acceptable: BFS attribution layer at R25 reads node-kind anyway for "rack-localized vs PSU-localized vs cooling-zone-localized" framing.
- **Hidden assumptions:** lexicographic sort within `computeSnapshotHash` (`engine/topology-overlay.ts:73-74`) handles the new `'nvlink_peer'` literal correctly. Verified: `'calls' < 'contains' < 'nvlink_peer' < 'publishes' < 'reads' < 'writes'` lexicographically — new literal slots between `'contains'` and `'publishes'` without breaking inherited sort order.
- **Risks:** low; both deltas are additive-only to type unions; preserves Addition #26 D4 (literal `correlational_not_causal: true` unchanged); preserves Addition #25 D2/D5 (no VerdictGroup shape change).

**Approach B — Three node-kind extensions + three new edge-relationship literals (`'nvlink_peer' | 'shares_psu' | 'shares_cooling_zone'`).**
- **Strengths:** explicit relationship-level labeling for each common-mode class; SCOPING-MEMO § 2.3 line 213 architect-pre-prediction example used these labels.
- **Weaknesses:** redundant with `'contains'` semantics (PSU/cooling_zone "containment" of shards IS the "shares_psu" / "shares_cooling_zone" relationship; the SAME edge with the SAME `from`-node would carry redundant labels); inflates AC count without information gain; ambiguates the BFS hop-distance interpretation (is `'shares_psu'` a 1-hop or 2-hop relation from one shard to another?).
- **Risks:** medium; relationship-labeling sprawl that R25 has to navigate.

**Approach C — No new edge-relationship literal; reuse `'contains'` for everything including NVLink-peer (would need from/to to express direction, but NVLink is undirected so this breaks).**
- **Strengths:** zero edge-relationship enum surface change.
- **Weaknesses:** NVLink peer-to-peer is fundamentally NOT containment semantics; calling a peer-to-peer edge "contains" is semantically wrong; consumers reading the edge to attribute behavior would mis-classify.
- **Risks:** high; architectural truth violation.

**Selection rationale:** Approach A. One new edge-relationship literal (`'nvlink_peer'`) suffices because (1) hierarchical containment (rack→shard, PSU→shard, cooling_zone→shard) is structurally containment and reuses inherited `'contains'`; (2) peer-to-peer NVLink is genuinely different semantics and warrants its own literal; (3) common-mode classification at R25 reads node-kind ("rack" vs "psu" vs "cooling_zone") not edge-relationship, so the relationship label is informational, not load-bearing for attribution.

### § 0.3 HardwareTopologySource class shape

**Approach A — Single concrete class `HardwareTopologySource` (Static-style at R23) (PICKED).** Mirrors `StaticTopologySource` (`engine/topology-overlay.ts:83-101`): constructor takes a pre-resolved `TopologySnapshot` plus optional `{ id?: string; version?: string }`. `fetchSnapshot()` returns the constructor-provided snapshot. `snapshotHash()` delegates to inherited `computeSnapshotHash`. No fetch I/O at R23.
- **Strengths:** minimal class surface; testable without fetch I/O; mirrors inherited Static* precedent at the same file site; R24 can decide subclass-vs-parallel-class expansion (`SlurmHardwareTopologySource extends HardwareTopologySource` OR `SlurmHardwareTopologySource implements TopologySource` directly).
- **Weaknesses:** if R24 picks "subclass" expansion, the R23 constructor signature is locked-in (snapshot in constructor); not a problem at R24 because subclasses get to define their own constructor.
- **Hidden assumptions:** the class API is stable across R23 → R24 → R25 contract surfaces.
- **Risks:** low; matches inherited architectural pattern.

**Approach B — Abstract base class `HardwareTopologySource` + concrete `StaticHardwareTopologySource`.**
- **Strengths:** explicit OO-style inheritance hierarchy; PRD nomenclature ("HardwareTopologySource") preserved as abstract umbrella.
- **Weaknesses:** TypeScript `abstract class` boilerplate without meaningful shared code; the only shared method is `snapshotHash` which is a 1-liner; over-engineering for R23 scope.
- **Risks:** low but adds gratuitous complexity.

**Approach C — Single class `StaticHardwareTopologySource`; PRD "HardwareTopologySource" stays conceptual.**
- **Strengths:** explicit naming.
- **Weaknesses:** drifts from PRD FR-E3b nomenclature ("HardwareTopologySource impl"); future R24 parallel classes (`SlurmHardwareTopologySource`) would be named-as-parallel even though they share no inheritance with R23's class.
- **Risks:** medium; naming drift from PRD.

**Selection rationale:** Approach A. Honor PRD nomenclature with the simplest possible class shape. `engine/hardware-topology-source.ts` ships ONE class named `HardwareTopologySource` with Static-style constructor. R24 inherits the architectural decision tree (subclass vs parallel) at its own spec time.

### § 0.4 Test substrate (v9X extend vs v9Y new)

**Approach A — Create new v9Y multi-rack fixture file (PICKED).** New file `test/_substrate/v9Y-multi-rack-cluster.ts` with `makeV9YMultiRackCluster(opts?: ...): TopologySnapshot` — 2 racks × 2 shards per rack + 1 PSU per rack + 1 cooling_zone per rack + `'nvlink_peer'` within-rack edges. ADD-NEW-FILE only; no v9X modification.
- **Strengths:** preserves R18 v9X invariants byte-identical (AC-R18-4/5 unchanged); future-proofs SLICE 3.C common-mode injection (multi-rack topology needed for "rack-localized PSU event" injection); aligns with R22 audit-tier pre-authorization pattern (ADD-NEW-FILE = no file-granularity pre-auth needed).
- **Weaknesses:** small code duplication (the v9X single-rack fixture pattern is similar); two fixture files coexist.
- **Hidden assumptions:** R25 common-mode injection uses v9Y (multi-rack) rather than v9X (single-rack); v9X stays in service for R18 substrate ACs.
- **Risks:** low; the duplication is design-intentional (v9X = single-rack baseline; v9Y = multi-rack for common-mode).

**Approach B — Extend v9X in-place with optional `withPsuCooling?: boolean` and `nRacks?: number` opts.**
- **Strengths:** one fixture file.
- **Weaknesses:** R18 v9X is named "single-rack"; adding multi-rack semantics breaks the file's naming contract; per NEXT-ROLE.md R22 reinforcement: "if R23 includes any test-file touches beyond ADD-NEW-TEST-FILE (e.g., extending v9X), spec MUST pre-authorize at file granularity with explicit scope" — adding scope to spec to enable extension; the optional-flag approach forces conditional branches inside the fixture function (extra cognitive load for SLICE 3.C consumers).
- **Risks:** medium; mutates R18 deliverable.

**Approach C — Inline the multi-rack fixture into the q23 test file directly; no separate substrate file.**
- **Strengths:** no new substrate file.
- **Weaknesses:** breaks `test/_substrate/` conventions (factories.ts and v9X-cluster.ts are the precedent); future SLICE 3.C consumers (q25 tests) would need to either copy-paste OR import from a test file — both anti-patterns.
- **Risks:** medium; convention drift.

**Selection rationale:** Approach A. ADD-NEW-FILE matches `test/_substrate/` convention (factories.ts + v9X-cluster.ts already establish the pattern); preserves R18 invariants; future-proofs SLICE 3.C without forcing a v9X-style retrofit.

### § 0.5 BFS-on-undirected adaptation

**Approach A — NO topology-overlay.ts changes; rely on inherited bidirectional BFS (PICKED).** BFS at `engine/topology-overlay.ts:262-285` already builds adjacency in both directions (`adjacency.get(e.from)?.add(e.to); adjacency.get(e.to)?.add(e.from);` at lines 266-267). New `'nvlink_peer'` and inherited `'contains'` are treated identically (BFS is relationship-agnostic at adjacency-construction time). No body modification required; topology-overlay.ts stays vendored-at-pin.
- **Strengths:** zero modification of inherited file; preserves vendored-at-pin policy for topology-overlay.ts; no vendoring-with-deltas two-step maintenance needed; q01-no-at-pin-deltas.test.ts AT_PIN_FILES entry for `engine/topology-overlay.ts` (line 51) stays intact.
- **Weaknesses:** if SLICE 3.C MD-F4 attribution requires relationship-aware BFS (e.g., "BFS only across `'nvlink_peer'` edges" or "BFS distinguishes hop-cost by relationship"), R25 will need to either (i) add a sibling BFS function in `engine/hardware-topology-source.ts` (Tessera-original) or (ii) transition topology-overlay.ts to vendored-with-deltas at R25. R23 spec does not commit either way; R25 architects decide.
- **Hidden assumptions:** BFS bidirectional semantic is sufficient for R23 scope (which is data-layer only; no consumer-layer attribution at R23).
- **Risks:** low; the bidirectional BFS handles the R23 substrate correctly (verified by reading the BFS body).

**Approach B — Transition topology-overlay.ts to vendored-with-deltas at R23 + amend BFS for relationship-aware semantics.**
- **Strengths:** sets up R25 with relationship-aware BFS.
- **Weaknesses:** R23 scope is data-layer only; modifying inherited BFS body without a consumer at R23 is pure-overhead refactoring; triggers the full vendored-with-deltas two-step maintenance (manifest row update + q01-no-at-pin-deltas AT_PIN_FILES removal); inflates scope past 15-AC budget.
- **Risks:** high scope inflation; speculative future-fitting.

**Selection rationale:** Approach A. R23 anti-scope explicitly prohibits topology-overlay.ts body modification per NEXT-ROLE.md anti-scope clause: "A12 — NO modification of inherited BFS internals in `engine/topology-overlay.ts` beyond architecturally-anchored extension points." The BFS-on-undirected requirement is already satisfied by inherited bidirectional adjacency construction. R25 reconsiders if MD-F4 attribution needs relationship-aware BFS.

### § 0.6 Sparse-topology degradation contract

**Approach A — No additional validation in `HardwareTopologySource`; defer graceful-degradation contract to consumer-layer at R25 (PICKED).** The R23 class accepts any `TopologySnapshot` per the inherited type shape (`nodes: TopologyNode[]`, `edges: TopologyEdge[]`). Sparse snapshots (isolated nodes; edges referring to absent node ids) flow through to BFS at consumer time, where adjacency map's `?.add()` no-ops on missing keys — BFS returns subset. computeSnapshotHash sorts what's there, deterministic regardless of sparsity.
- **Strengths:** no constructor-time validation overhead; existing BFS handles sparsity gracefully per inherited code; R23 AC verifies snapshot-hash determinism on the v9Y fixture, which exercises the sparse-then-merge path implicitly.
- **Weaknesses:** if R24 ingestion produces a malformed snapshot (e.g., `edges` referring to non-existent node ids), the error surfaces at consumer time (BFS hop traversal returns subset hops) rather than at construction; R25 attribution layer must enumerate this as a failure mode.
- **Hidden assumptions:** the inherited BFS `adjacency.get(e.from)?.add(e.to)` line at `engine/topology-overlay.ts:266` correctly no-ops when `e.from` is not a node id in the snapshot (verified: `adjacency` is initialized only for nodes via `adjacency.set(n.id, new Set())` at line 264; `.get()` returns undefined for absent keys; `?.add()` no-ops).
- **Risks:** low at R23; deferred risk-shift to R25 acceptable per scope split.

**Approach B — Constructor-time validation rejecting malformed snapshots (throw on absent node ids in edges).**
- **Strengths:** fail-fast at construction.
- **Weaknesses:** inherited `StaticTopologySource` constructor does NOT validate; diverging at HardwareTopologySource creates inconsistent validation surfaces across `TopologySource` impls.
- **Risks:** medium; consistency drift.

**Selection rationale:** Approach A. Match the inherited validation contract (zero); defer graceful-degradation enforcement to consumer-layer at R25.

### § 0.7 Snapshot-hash semantics under new relationship literal

**Verification:** `computeSnapshotHash` at `engine/topology-overlay.ts:69-78` sorts nodes by `id` (line 70) and edges by `(from, to, relationship)` triplet (lines 71-75) before JSON-stringify + sha256. The new `'nvlink_peer'` relationship slots lexicographically between `'contains'` and `'publishes'`. Pre-existing edges with inherited relationships still sort in the same lexicographic order relative to each other (their relative order doesn't depend on the new literal's existence). Determinism preserved; inherited semantics preserved for inherited-only snapshots.

---

## § 1 Design phase sketch (Superpowers — inline)

### § 1.1 Component boundaries

| Component | Exists at R23 entry | Created at R23 | Changed at R23 | Deleted at R23 | Touch type |
|---|---|---|---|---|---|
| `engine/topology-overlay.ts` (TopologySource interface, computeSnapshotHash, StaticTopologySource, OtelServiceGraphV1, TopologyEnricher) | ✅ vendored-at-pin (`5a72371`) | — | — | — | READ-ONLY (consumed via type-import + computeSnapshotHash delegation) |
| `engine/types/verdict.ts` | ✅ vendored-with-deltas (R18) | — | ✅ `TopologyNode.kind` union extension; `TopologyEdge.relationship` union extension; file-level docblock R18 → R18+R23 amendment update | — | Additive enum-literal extensions to existing unions (NOT a new transition; already vendored-with-deltas) |
| `engine/hardware-topology-source.ts` | ❌ | ✅ NEW Tessera-original file | — | — | NEW class `HardwareTopologySource` |
| `engine/types/verdict.js` / `engine/hardware-topology-source.js` | (compiled) | ✅ (regenerated by typecheck/build) | ✅ (regenerated) | — | Compiled outputs |
| `test/_substrate/v9X-cluster.ts` (R18) | ✅ | — | — | — | UNCHANGED (R18 deliverable frozen per NEXT-ROLE.md anti-scope: "NO modification of pre-R22 AC bindings"; analog applied at R23) |
| `test/_substrate/v9Y-multi-rack-cluster.ts` | ❌ | ✅ NEW Tessera-original file | — | — | NEW fixture `makeV9YMultiRackCluster` |
| `test/q23-hardware-topology-source.test.ts` | ❌ | ✅ NEW | — | — | NEW test file (12 runtime tests at chore-A; +1 chore-B anti-scope test) |
| `test/q01-no-at-pin-deltas.test.ts` | ✅ | — | — | — | UNCHANGED (topology-overlay.ts not modified at R23; AT_PIN_FILES list unchanged) |
| `test/q01-vendoring-coverage.test.ts` | ✅ | — | — | — | UNCHANGED (header-check; first-line vendoring header preserved on verdict.ts and topology-overlay.ts) |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | ✅ | — | — | — | UNCHANGED (R18 deliverable frozen; v9X-cluster.ts unchanged) |
| `test/q20-…` / `test/q21-…` / `test/q22-…` | ✅ | — | — | — | UNCHANGED (R20/R21/R22 deliverables frozen per NEXT-ROLE.md anti-scope) |
| `engine/verdict-groups.ts` | ✅ vendored-with-deltas (R20) | — | — | — | UNCHANGED (R20 deliverable frozen) |
| `engine/fleet/verdict-consumer.ts` | ✅ Tessera-original (R21) | — | — | — | UNCHANGED (R21 deliverable frozen) |
| `coordination/VENDORING-MANIFEST.md` | ✅ | — | ✅ row 29 notes string updated (verdict.ts: R23 adds `'psu' \| 'cooling_zone'` to `TopologyNode.kind`; adds `'nvlink_peer'` to `TopologyEdge.relationship`); no row-state transition (already vendored-with-deltas) | — | Notes-column-only update |
| `coordination/specs/Q-R23-SPEC.md` | ❌ | ✅ this file (committed in own commit BEFORE chore-A per R21 ARCH MINOR-1 reinforcement) | — | — | Routing artifact |
| `coordination/specs/Q-R23-SPEC-AUDIT.md` | ❌ | ✅ sidecar (committed alongside spec) | — | — | Audit-trail artifact |
| `coordination/NEXT-ROLE.md` | ✅ | — | ✅ routing block updated at chore-A (NEXT-ROLE: REVIEWER; STATUS: READY; Implementer attestation block appended) | — | Coordination |
| `coordination/MEMORIAL.md` | ✅ | — | ✅ append-only (Architect/Implementer/Reviewer/Memorial-Updater ceremony sections) | — | Coordination |

### § 1.2 Integration points + data flow

1. **`engine/types/verdict.ts` enum extension → `HardwareTopologySource` consumption.** `HardwareTopologySource` constructor takes `TopologySnapshot` whose nodes have `kind ∈ {'service', 'database', 'queue', 'external', 'gpu_shard', 'rack', 'psu', 'cooling_zone'}` and edges have `relationship ∈ {'calls', 'reads', 'writes', 'publishes', 'contains', 'nvlink_peer'}`. The union extension is purely type-level; the class does not switch on `kind` or `relationship` at runtime.
2. **`engine/topology-overlay.ts:computeSnapshotHash` ← `HardwareTopologySource.snapshotHash`.** The class delegates `snapshotHash(snapshot)` to the inherited free function. No body modification of topology-overlay.ts.
3. **`test/_substrate/v9Y-multi-rack-cluster.ts:makeV9YMultiRackCluster` → `HardwareTopologySource` constructor.** Test code instantiates the class with a fixture-built snapshot. No cross-substrate dependencies (v9Y stands alone; does not import or extend v9X).
4. **`test/q23-…test.ts` → both modules.** Runtime tests instantiate `HardwareTopologySource`, call methods, assert outcomes. Compile-time literal-acceptance tests reference `TopologyNode['kind']` and `TopologyEdge['relationship']` union members.
5. **`coordination/VENDORING-MANIFEST.md` notes-column ← R18 R23 amendment trace.** The notes string for the `engine/types/verdict.ts` row (manifest row 29) updates to mention R23 enum-literal additions. Already-`vendored-with-deltas` (R18); no row-state transition.
6. **Inherited preservation surfaces (read-only assertions at R23):**
   - `engine/verdict-groups.ts` group_id format regex (Addition #25 D5)
   - `engine/types/verdict.ts` literal `correlational_not_causal: true;` type token (Addition #26 D4)
   - All 40 vendored files' first-line SHA-pin header (`5a72371`)

### § 1.3 PRD / scope-memo verification

| Spec section | PRD requirement | Verification |
|---|---|---|
| § 0.2 enum extensions | FR-E3b (HardwareTopologySource impl) | SCOPING-MEMO § 2.3 line 205 enumerates the four target node kinds (`'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone'`); R18 landed two; R23 lands the remaining two. |
| § 0.3 class shape | FR-E3b ("HardwareTopologySource concrete impl") | SCOPING-MEMO § 2.3 line 217 specifies "New concrete impl against existing TopologySource interface — NOT a new abstract interface"; spec ships ONE concrete class. |
| § 0.4 v9Y substrate | NEXT-ROLE Q6 ("v9X-or-v9Y test substrate decision") | New file matches PHASE-2-SLICE-2-CLOSE-WALK § 3 line 150 ("v9X fixture as test substrate" extended at R23 via parallel v9Y fixture; v9X-cluster.ts unchanged). |
| § 0.5 BFS-on-undirected | NEXT-ROLE Q5 ("BFS handles `'contains'` + `'nvlink_peer'` correctly with current code?") | YES — BFS at `engine/topology-overlay.ts:265-267` is relationship-agnostic bidirectional. No body modification needed. |
| § 0.7 snapshot-hash semantics | NEXT-ROLE Q8 ("new relationship literals must sort lexicographically without breaking inherited semantics") | YES — `'nvlink_peer'` slots between `'contains'` and `'publishes'` lexicographically; inherited edges sort identically to before. |

### § 1.4 Failure mode enumeration (consumer-side; R23 substrate-only round catches these architecturally)

1. **Snapshot with `kind: 'psu'` or `'cooling_zone'` flows through computeSnapshotHash without runtime error** — verified by AC-R23-9 (v9Y fixture contains both kinds; hash is deterministic 64-char hex).
2. **Snapshot with `relationship: 'nvlink_peer'` flows through computeSnapshotHash and sorts correctly** — verified implicitly by AC-R23-9 (v9Y fixture contains nvlink_peer edges; hash determinism implies sort stability).
3. **`HardwareTopologySource.fetchSnapshot()` returns the exact constructor-provided snapshot (no deep clone)** — verified by AC-R23-7 (identity-equal reference check via `assert.strictEqual(returned, snapshot)`).
4. **Constructor `opts.id` / `opts.version` fallback chain semantics preserved across all three branches** — verified by AC-R23-5 (id branches) + AC-R23-6 (version branches). Removing any fallback step causes at least one sub-assertion in those ACs to fail (branch-binding per R21 ARCH+IMPL MINOR-2/3 reinforcement).
5. **Manifest notes string is accurate** — verified by AC-R23-3 (manifest grep for R23 enum-literal mention on verdict.ts row).
6. **Inherited Addition #25 D5 + Addition #26 D4 preserved** — verified by AC-R23-10 + AC-R23-11.
7. **All 40 vendored files retain SHA-pin header** — verified by AC-R23-12 (manifest-driven cross-check).
8. **Typecheck passes** — AC-R23-13.
9. **Full test suite passes at chore-A SHA with count = 216** — AC-R23-14.
10. **Anti-scope diff ⊆ allowed-set** — AC-R23-15 at chore-B (SHA substitution per TQ-4 γ pattern).

---

## § 2 Mechanism (every design decision made here; nothing deferred to Implementer)

### § 2.1 `engine/types/verdict.ts` — type-union extensions

Two additive deltas:

**Delta 1 — `TopologyNode.kind` extension at line 236.** Current union (R18):
```
kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack';
```
R23 union:
```
kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack' | 'psu' | 'cooling_zone';
```
Two new literals appended at the end of the union. Order matters only for readability; TypeScript treats union members as a set.

**Delta 2 — `TopologyEdge.relationship` extension at line 246.** Current union (R18):
```
relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains';
```
R23 union:
```
relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains' | 'nvlink_peer';
```
One new literal appended at the end of the union.

**Delta 3 — file-level docblock update at lines 6-16.** The R18 amendment block currently reads (line 8-9):
```
//   1. TopologyNode.kind union extends to include 'gpu_shard' | 'rack' (subset of v0.3 list;
//      'psu' | 'cooling_zone' deferred to later Phase 2 SLICE).
```
and (line 10-12):
```
//   2. TopologyEdge.relationship union extends to include 'contains' (hierarchical containment;
//      BFS at engine/topology-overlay.ts treats edges bidirectionally regardless of relationship,
//      inherited semantic accepted at SLICE 1).
```
The Implementer rewrites this block to reflect the R18+R23 cumulative deltas with an explicit "R23 (2026-05-18) — Phase 2 SLICE 3.A amendments:" sub-section appended after the existing R18 block (NOT replacing the R18 block). The rewrite MUST preserve all inherited annotations (the vendoring header at lines 1-5; the R18 section's structural intent). Implementer-time wording is left to the Implementer subject to two content requirements: (a) the words `'psu'` and `'cooling_zone'` must appear in the new R23 sub-section in the context of `TopologyNode.kind`; (b) the word `'nvlink_peer'` must appear in the new R23 sub-section in the context of `TopologyEdge.relationship`. No AC binds the exact wording; the docblock is documentation, not load-bearing. Per the file-level documentation coverage check reinforcement (R10 MINOR-1).

### § 2.2 `engine/hardware-topology-source.ts` — NEW Tessera-original file

**File-level docblock (prescription):**
```
// engine/hardware-topology-source.ts — Tessera-original Phase 2 SLICE 3.A (R23).
//
// HardwareTopologySource — concrete impl of the inherited Addition #26
// TopologySource interface (engine/topology-overlay.ts:50-55) for hardware
// topology data (NVLink / rack / PSU / cooling-zone). At R23 (SLICE 3.A),
// constructor accepts a pre-resolved TopologySnapshot — analogous to
// inherited StaticTopologySource at engine/topology-overlay.ts:83-101.
// SLICE 3.B (R24) adds concrete ingestion adapters (Slurm topology /
// Kubernetes node-label / NVIDIA NVLink-topology) against the same
// interface; the R23 class's API is the contract surface for that
// expansion.
//
// snapshotHash() delegates to the inherited computeSnapshotHash free
// function — every TopologySource impl shares identical hash semantics
// per Addition #26 D6 archaeological-render requirement.
//
// Tessera-original code (NOT vendored from DeploySignal).
```

**Class definition:**
```typescript
import type { TopologySnapshot } from './types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from './topology-overlay';

export class HardwareTopologySource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(snapshot: TopologySnapshot, opts: { id?: string; version?: string } = {}) {
    this.snapshot = snapshot;
    this.id = opts.id ?? snapshot.source_id ?? 'hardware_topology_source';
    this.version = opts.version ?? snapshot.source_version ?? 'hardware-1';
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}
```

The class shape mirrors `StaticTopologySource` at `engine/topology-overlay.ts:83-101` exactly with three identifier substitutions: class name (`HardwareTopologySource`), default id literal (`'hardware_topology_source'`), default version literal (`'hardware-1'`). All three identifiers are spec-prescribed; no other naming variants are valid.

**Branch-binding semantics (per R21 ARCH+IMPL MINOR-2/3 reinforcement).** Each fallback step in the `id` and `version` initializers is exercised by an AC that fails when the step is removed:

| Branch | Trigger | AC | Removal failure mode |
|---|---|---|---|
| `opts.id ?? …` (first fallback) | opts.id provided; snapshot.source_id also provided; expect this.id === opts.id | AC-R23-5 sub-case (a) | If `opts.id ??` removed, this.id = snapshot.source_id ≠ opts.id; sub-case (a) FAILS |
| `… ?? snapshot.source_id ?? …` (second fallback) | opts.id undefined; snapshot.source_id provided; expect this.id === snapshot.source_id | AC-R23-5 sub-case (b) | If `snapshot.source_id ??` removed, this.id = default literal ≠ snapshot.source_id; sub-case (b) FAILS |
| `… ?? 'hardware_topology_source'` (default literal) | opts.id undefined; snapshot.source_id undefined; expect this.id === 'hardware_topology_source' | AC-R23-5 sub-case (c) | If `'hardware_topology_source'` literal replaced with anything else, sub-case (c) FAILS |

Same structural binding for `version` via AC-R23-6 (sub-cases (a)/(b)/(c) mirror the id table with `'hardware-1'` as the default literal).

### § 2.3 `test/_substrate/v9Y-multi-rack-cluster.ts` — NEW Tessera-original fixture

**File-level docblock (prescription):**
```
// test/_substrate/v9Y-multi-rack-cluster.ts — Phase 2 SLICE 3.A synthetic-cluster substrate (R23).
//
// Multi-rack fixture with PSU + cooling-zone + nvlink_peer relationships
// per Q-R23-SPEC.md § 2.3. Default topology: 2 racks × 2 shards per rack
// + 1 PSU per rack + 1 cooling-zone per rack; nvlink_peer edges within
// each rack.
//
// Naming convention parallels test/_substrate/v9X-cluster.ts:
//   make<TypeName>(opts?) → TypeName; defaults are deterministic-test
//   friendly; opts are shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).
```

**Function signature:**
```typescript
import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../../engine/types/verdict';

export interface MakeV9YMultiRackClusterOpts {
  fetchedAtTs?: number;
}

export function makeV9YMultiRackCluster(
  opts: MakeV9YMultiRackClusterOpts = {},
): TopologySnapshot {
  // ... see § 2.4 for exact node/edge enumeration
}
```

R23 does NOT parametrize on `nRacks` or `nShardsPerRack` — the default topology is fixed at 2 racks × 2 shards per rack. SLICE 3.C (R25) common-mode injection adds parametrization if needed.

### § 2.4 v9Y default topology — exact node and edge enumeration

**Nodes (10 total):**

| id | service_name | kind |
|---|---|---|
| `rack-0` | `rack-0` | `'rack'` |
| `rack-1` | `rack-1` | `'rack'` |
| `psu-0` | `psu-0` | `'psu'` |
| `psu-1` | `psu-1` | `'psu'` |
| `cz-0` | `cz-0` | `'cooling_zone'` |
| `cz-1` | `cz-1` | `'cooling_zone'` |
| `shard-0` | `shard-0` | `'gpu_shard'` |
| `shard-1` | `shard-1` | `'gpu_shard'` |
| `shard-2` | `shard-2` | `'gpu_shard'` |
| `shard-3` | `shard-3` | `'gpu_shard'` |

**Edges (14 total):**

| # | from | to | relationship |
|---|---|---|---|
| 1 | `rack-0` | `shard-0` | `'contains'` |
| 2 | `rack-0` | `shard-1` | `'contains'` |
| 3 | `rack-1` | `shard-2` | `'contains'` |
| 4 | `rack-1` | `shard-3` | `'contains'` |
| 5 | `psu-0` | `shard-0` | `'contains'` |
| 6 | `psu-0` | `shard-1` | `'contains'` |
| 7 | `psu-1` | `shard-2` | `'contains'` |
| 8 | `psu-1` | `shard-3` | `'contains'` |
| 9 | `cz-0` | `shard-0` | `'contains'` |
| 10 | `cz-0` | `shard-1` | `'contains'` |
| 11 | `cz-1` | `shard-2` | `'contains'` |
| 12 | `cz-1` | `shard-3` | `'contains'` |
| 13 | `shard-0` | `shard-1` | `'nvlink_peer'` |
| 14 | `shard-2` | `shard-3` | `'nvlink_peer'` |

**Snapshot fields:**
- `fetched_at_ts`: `opts.fetchedAtTs ?? 1700000000` (mirrors v9X default)
- `source_id`: `'v9Y_synthetic_multi_rack'`
- `source_version`: `'v9Y.1'`

Implementer emits these as a static array literal in declaration order matching the table above; the v9Y substrate is deterministic by construction.

### § 2.5 `coordination/VENDORING-MANIFEST.md` — row 29 notes-column update

Current row 29 (verdict.ts) notes string includes:
> "R18 Phase 2 SLICE 1 deltas: VerdictGroup `cluster_event_id?: string` (Phase 2 outer-aggregator hook); TopologyNode.kind union extends with `\| 'gpu_shard' \| 'rack'`; TopologyEdge.relationship union extends with `\| 'contains'`. Additive optional field + additive union members (preserves Addition #25 D2/D5 + Addition #26 D4)."

R23 amendment (append to the existing R18 notes; do NOT replace):
> "R23 Phase 2 SLICE 3.A deltas: TopologyNode.kind union extends with `\| 'psu' \| 'cooling_zone'`; TopologyEdge.relationship union extends with `\| 'nvlink_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."

The Implementer concatenates the R23 note onto the existing R18 note within the same row's notes-column cell. No row-state transition (already `vendored-with-deltas`).

### § 2.6 `test/q23-hardware-topology-source.test.ts` — NEW test file (12 runtime test() declarations at chore-A; + 1 chore-B anti-scope test)

**File-level docblock (prescription):**
```
// test/q23-hardware-topology-source.test.ts — Phase 2 SLICE 3.A bindings (R23).
//
// Binds AC-R23-1 through AC-R23-12 (runtime) per Q-R23-SPEC.md § 5.
// AC-R23-13 (typecheck) and AC-R23-14 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
// AC-R23-15 (anti-scope diff) is a runtime test added at chore-B with
// the chore-A SHA substituted into the diff baseline literal.
//
// Covers: TopologyNode.kind extension (psu + cooling_zone);
// TopologyEdge.relationship extension (nvlink_peer); HardwareTopologySource
// interface conformance + fallback-chain branch binding + fetchSnapshot
// identity + snapshotHash delegation; v9Y multi-rack fixture default shape +
// hash determinism; inherited Addition #25 D5 + #26 D4 preservation;
// vendored-at-pin SHA preservation; manifest notes-column accuracy.
```

**Per-AC test() prescriptions (one test() declaration per AC; assertions inside the body match the AC text in § 5).** The Implementer authors each test body to satisfy the AC's "Given X, when Y, then Z" form in § 5 and the failure-mode bindings in § 2.2 (for branch-binding ACs).

### § 2.7 Commit ordering (per R21 ARCH MINOR-1 reinforcement)

1. **Commit A (spec).** `coordination/specs/Q-R23-SPEC.md` + `coordination/specs/Q-R23-SPEC-AUDIT.md` committed in a single Architect-authored commit BEFORE chore-A.
2. **Commit B (implementation).** `engine/types/verdict.ts` + `engine/types/verdict.js` + `engine/hardware-topology-source.ts` + `engine/hardware-topology-source.js` + `test/_substrate/v9Y-multi-rack-cluster.ts` + `test/_substrate/v9Y-multi-rack-cluster.js` + `test/q23-hardware-topology-source.test.ts` + `test/q23-hardware-topology-source.test.js` + `coordination/VENDORING-MANIFEST.md`. Implementer-authored.
3. **Commit C (chore-A).** `coordination/NEXT-ROLE.md` (routing block) + `coordination/MEMORIAL.md` (ceremony append). Implementer-authored. Chore-A SHA recorded in the NEXT-ROLE.md attestation block.
4. **Commit D (chore-B).** AC-R23-15 anti-scope runtime test appended to `test/q23-hardware-topology-source.test.ts`; the chore-A SHA substituted into the test's diff-baseline literal (TQ-4 γ end-bound pattern).

---

## § 3 Component inventory

(Cross-references § 1.1; restated here in the canonical AC-routing form.)

| Path | State | Touch type | Bound ACs |
|---|---|---|---|
| `engine/types/verdict.ts` | CHANGED | TopologyNode.kind extension + TopologyEdge.relationship extension + file-level docblock R23 amendment | AC-R23-1, AC-R23-2 (compile-time literal acceptance); docblock change not AC-bound (per § 2.1 Delta 3) |
| `engine/types/verdict.js` | CHANGED (compiled output) | regenerated by typecheck/build | AC-R23-13 |
| `engine/hardware-topology-source.ts` | CREATED | NEW Tessera-original; class `HardwareTopologySource` + fallback chains + snapshotHash delegation | AC-R23-4, AC-R23-5, AC-R23-6, AC-R23-7 |
| `engine/hardware-topology-source.js` | CREATED | compiled output | AC-R23-13, AC-R23-14 |
| `test/_substrate/v9Y-multi-rack-cluster.ts` | CREATED | NEW Tessera-original; fixture `makeV9YMultiRackCluster` per § 2.4 enumeration | AC-R23-8, AC-R23-9 |
| `test/_substrate/v9Y-multi-rack-cluster.js` | CREATED | compiled output | AC-R23-13, AC-R23-14 |
| `test/q23-hardware-topology-source.test.ts` | CREATED | NEW; 12 runtime test() at chore-A + 1 chore-B anti-scope test | AC-R23-1 through -12 (chore-A); AC-R23-15 (chore-B) |
| `test/q23-hardware-topology-source.test.js` | CREATED | compiled output | AC-R23-14 |
| `coordination/VENDORING-MANIFEST.md` | CHANGED | row 29 (verdict.ts) notes-column updated per § 2.5 | AC-R23-3 |
| `engine/topology-overlay.ts` | UNCHANGED | (anti-scope; BFS already bidirectional; class is consumed via type-import + computeSnapshotHash delegation only) | (anti-scope) |
| `engine/verdict-groups.ts` | UNCHANGED | (anti-scope; R20 frozen) | AC-R23-10 (read-only inherited preservation grep) |
| `engine/fleet/verdict-consumer.ts` | UNCHANGED | (anti-scope; R21 frozen) | (anti-scope) |
| `test/_substrate/v9X-cluster.ts` | UNCHANGED | (R18 frozen; NEXT-ROLE.md anti-scope) | (anti-scope) |
| `test/q01-…` / `test/q18-…` / `test/q20-…` / `test/q21-…` / `test/q22-…` | UNCHANGED | (anti-scope; pre-R23 deliverables frozen) | (anti-scope) |
| `coordination/specs/Q-R23-SPEC.md` | CREATED | this file (Commit A; per R21 ARCH MINOR-1) | (routing artifact) |
| `coordination/specs/Q-R23-SPEC-AUDIT.md` | CREATED | sidecar (Commit A) | (audit-trail) |
| `coordination/NEXT-ROLE.md` | CHANGED | routing block update at chore-A | (coordination) |
| `coordination/MEMORIAL.md` | CHANGED (append-only) | ceremony sections per role at chore-A | (coordination) |

**Anti-scope verification path-set (allowed entries in `git diff 2946b13..<MERGE-READY-CHORE-A-SHA> --name-only` at Implementer GREEN attestation):**

```
engine/types/verdict.ts
engine/types/verdict.js
engine/hardware-topology-source.ts
engine/hardware-topology-source.js
test/_substrate/v9Y-multi-rack-cluster.ts
test/_substrate/v9Y-multi-rack-cluster.js
test/q23-hardware-topology-source.test.ts
test/q23-hardware-topology-source.test.js
coordination/VENDORING-MANIFEST.md
coordination/specs/Q-R23-SPEC.md
coordination/specs/Q-R23-SPEC-AUDIT.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

13 entries. AC-R23-15 binds (runtime test added at chore-B; chore-A SHA substituted at chore-B time per TQ-4 γ + R15 MINOR-1 + R19 MAJOR-3).

**Halt-condition pre-amendment to allowed-set.** Per R15 MINOR-1 reinforcement (anti-scope allowed-set must include any spec-mandated DIAGNOSTIC path), if a halt fires per § 7 and the Implementer authors `coordination/diagnostics/DIAGNOSTIC-R23-<topic>.md`, that path is added to the allowed-set at operator-disposition time (ESCALATE → operator amendment, mirroring R18 precedent). No pre-emptive DIAGNOSTIC path is listed in the AC-R23-15 allowed-set because no halt is anticipated at spec-emit time.

---

## § 4 Per-file pseudocode (only where algorithm IS the architectural decision)

Per CLAUDE-ARCHITECT.md spec-depth guidance: "Per-file pseudocode is appropriate only when the algorithm IS the architectural decision — not for routine wiring." R23 has no algorithmic decisions — the class is a wrapper with deterministic-fallback initializers and a delegating `snapshotHash`; the fixture is a static-data literal; the test file is one-test()-per-AC straight-line code. All architectural decisions are captured in § 0 (brainstorm rationale), § 2 (mechanism with exact identifiers + line-targets + branch-binding tables), and § 2.4 (exact 10-node × 14-edge enumeration). Routine wiring (TypeScript syntax, import statements, JSDoc paraphrase, .js compiled output) is left to the Implementer.

The single non-trivial location-pin is the file-level docblock update at `engine/types/verdict.ts:6-16` per § 2.1 Delta 3 — the Implementer rewrites the R18 amendment block to append an R23 sub-section (see § 2.1 Delta 3 for content requirements).

---

## § 5 Acceptance criteria

**Classification preamble (cross-checked against § 4.x / § 2.x prescriptions per R20 ARCH MINOR-1 reinforcement):**
- **AC-R23-1 through AC-R23-12 are runtime tests.** Bound to `test/q23-hardware-topology-source.test.ts` at chore-A.
- **AC-R23-13 and AC-R23-14 are binding-command attestations** reported by the Implementer at GREEN in `coordination/NEXT-ROLE.md`; NOT runtime-bound.
- **AC-R23-15 is a runtime test added at chore-B**; the chore-A SHA is substituted into the test literal per the TQ-4 γ pattern.

The preamble above is verified to match the § 2.6 file-level docblock prescription AND the § 2.2 / § 2.3 / § 2.4 / § 2.5 / § 3 component-inventory binding columns. No classification drift between this preamble and the prescriptions.

---

**AC-R23-1** — Given the Tessera TypeScript surface, when a type literal `'psu'` is assigned to a `TopologyNode['kind']`-typed variable AND a type literal `'cooling_zone'` is assigned to a `TopologyNode['kind']`-typed variable AND the test runs at runtime, then both literals compile-time-accept (typecheck PASS per AC-R23-13) AND the runtime values are strict-equal to `'psu'` and `'cooling_zone'` respectively.

**AC-R23-2** — Given the Tessera TypeScript surface, when a type literal `'nvlink_peer'` is assigned to a `TopologyEdge['relationship']`-typed variable AND the test runs at runtime, then the literal compile-time-accepts (typecheck PASS per AC-R23-13) AND the runtime value is strict-equal to `'nvlink_peer'`.

**AC-R23-3** — Given `coordination/VENDORING-MANIFEST.md`, when the file is read and the row containing `engine/types/verdict.ts` is located, then the notes-column cell contains ALL THREE substrings: (a) `'psu'`, (b) `'cooling_zone'`, (c) `'nvlink_peer'`. (Asserts the R23 amendment per § 2.5 was applied to the manifest notes-column.)

**AC-R23-4** — Given `engine/hardware-topology-source.ts` exports a class named `HardwareTopologySource`, when an instance is constructed via `new HardwareTopologySource(snapshot, { id: 'h-test-1', version: 'h-test-v1' })` with a v9Y-derived snapshot, then the instance satisfies the inherited `TopologySource` interface at runtime: (a) `typeof instance.id === 'string'`; (b) `typeof instance.version === 'string'`; (c) `instance.fetchSnapshot()` returns a `Promise` that resolves to a `TopologySnapshot` (verified by `(await instance.fetchSnapshot()).nodes` being an array); (d) `instance.snapshotHash(snapshot)` returns a non-empty `string`.

**AC-R23-5** — Given `engine/hardware-topology-source.ts`, when the `HardwareTopologySource` constructor is invoked under three scenarios, then the `id` fallback chain resolves as follows (each sub-case structurally binds one fallback branch per § 2.2 branch-binding table):
- (a) opts.id provided AND snapshot.source_id provided AND opts.id !== snapshot.source_id → instance.id === opts.id (first `??` branch; removing `opts.id ??` causes this sub-case to FAIL because instance.id would become snapshot.source_id).
- (b) opts.id undefined AND snapshot.source_id provided → instance.id === snapshot.source_id (second `??` branch; removing `snapshot.source_id ??` causes this sub-case to FAIL because instance.id would become the default literal).
- (c) opts.id undefined AND snapshot.source_id undefined → instance.id === `'hardware_topology_source'` (default literal; replacing the literal with anything else causes this sub-case to FAIL).

**AC-R23-6** — Given `engine/hardware-topology-source.ts`, when the `HardwareTopologySource` constructor is invoked under three scenarios, then the `version` fallback chain resolves as follows (structural parallel to AC-R23-5 with `'hardware-1'` as the default literal):
- (a) opts.version provided AND snapshot.source_version provided AND opts.version !== snapshot.source_version → instance.version === opts.version (first branch).
- (b) opts.version undefined AND snapshot.source_version provided → instance.version === snapshot.source_version (second branch).
- (c) opts.version undefined AND snapshot.source_version undefined → instance.version === `'hardware-1'` (default literal).

**AC-R23-7** — Given a `HardwareTopologySource` instance constructed with a fixed `TopologySnapshot` reference, when `fetchSnapshot()` is awaited, then the returned value is identity-equal (`===`) to the constructor-provided snapshot AND when `snapshotHash(snapshot)` is invoked on that same snapshot, the result is strict-equal to a direct call of the inherited `computeSnapshotHash(snapshot)` (delegation verified by both calls producing the same 64-char hex string).

**AC-R23-8** — Given `test/_substrate/v9Y-multi-rack-cluster.ts` exports `makeV9YMultiRackCluster`, when `makeV9YMultiRackCluster()` is invoked with no opts, then the returned `TopologySnapshot` has: (a) `nodes.length === 10`; (b) `edges.length === 14`; (c) `nodes.filter(n => n.kind === 'rack').length === 2`; (d) `nodes.filter(n => n.kind === 'psu').length === 2`; (e) `nodes.filter(n => n.kind === 'cooling_zone').length === 2`; (f) `nodes.filter(n => n.kind === 'gpu_shard').length === 4`; (g) `edges.filter(e => e.relationship === 'contains').length === 12`; (h) `edges.filter(e => e.relationship === 'nvlink_peer').length === 2`; (i) `source_id === 'v9Y_synthetic_multi_rack'`; (j) `source_version === 'v9Y.1'`. (Counts exactly match § 2.4 enumeration.)

**AC-R23-9** — Given `makeV9YMultiRackCluster()` snapshot, when `computeSnapshotHash` (imported from `engine/topology-overlay`) is invoked twice on the same snapshot reference, then the two hashes are strict-equal AND match the regex `/^[0-9a-f]{64}$/` (mirrors AC-R18-6 pattern; verifies determinism under R23 enum extensions).

**AC-R23-10** — Given `engine/verdict-groups.ts`, when the file contents are read, then the regex `/group-\$\{deployId\}-\$\{window_start_ts\}/` matches the source. (Inherited Addition #25 D5 group_id format preserved — mirrors AC-R18-7.)

**AC-R23-11** — Given `engine/types/verdict.ts`, when the file contents are read, then the regex `/correlational_not_causal:\s*true;/` matches the source. (Inherited Addition #26 D4 literal-true type token preserved — mirrors AC-R18-8.)

**AC-R23-12** — Given `coordination/VENDORING-MANIFEST.md`, when the file is parsed for every row with sync policy `vendored-at-pin` or `vendored-with-deltas` whose target path ends in `.ts`, then the count is exactly 40 AND every such file's first line contains the substring `VENDORED FROM DeploySignal main@5a72371`. (Mirrors AC-R18-9 pattern; manifest count unchanged from R18 baseline because R23 ADDS no new vendored file.)

**AC-R23-13** — Given the Tessera TypeScript project, when `npx tsc -p tsconfig.test.json` runs at chore-A SHA, then exit code is 0. (Binding-command attestation; reported by Implementer in NEXT-ROLE.md attestation block.)

**AC-R23-14** — Given the full test suite after R23 implementation commits, when `node --test test/*.test.js` runs at MERGE-READY chore-A SHA `<MERGE-READY-CHORE-A-SHA>` (recorded in NEXT-ROLE.md attestation block at chore-A time), then `tests = 216 AND pass = 216 AND fail = 0`. (Baseline 204 + 12 new AC-R23-1 through AC-R23-12 runtime tests. AC-R23-15 anti-scope runtime test added at chore-B brings total to 217 post-chore-B; AC-R23-14 measures AT chore-A SHA only.)

**AC-R23-15** — Given the git diff from baseline `2946b13` to chore-A SHA `<MERGE-READY-CHORE-A-SHA>` (substituted into the test literal at chore-B time per TQ-4 γ pattern), when `git diff 2946b13..<MERGE-READY-CHORE-A-SHA> --name-only` runs, then every output path is in the allowed-set (13 entries enumerated in § 3 "Anti-scope verification path-set"). (Runtime test committed at chore-B; chore-A SHA substituted at chore-B time.)

---

## § 6 Anti-scope (explicit; HALT if any temptation actioned)

- **NO modification of `engine/topology-overlay.ts`** — BFS is already bidirectional; class is consumed via type-import + computeSnapshotHash delegation only; the file stays vendored-at-pin. Touching its body triggers vendored-with-deltas two-step maintenance (manifest + AT_PIN_FILES removal) which IS out of R23 scope. **HALT condition.**
- **NO modification of `engine/verdict-groups.ts`** — R20 deliverable frozen.
- **NO modification of `engine/fleet/verdict-consumer.ts`** — R21 deliverable frozen.
- **NO modification of `test/_substrate/v9X-cluster.ts`** — R18 deliverable frozen; v9Y is a parallel new fixture, not an extension.
- **NO modification of any pre-R23 test file** (`test/q01-…`, `test/q18-…`, `test/q20-…`, `test/q21-…`, `test/q22-…`, `test/betting-e-process-class-dispatch.test.ts`, etc.) — all pre-R23 deliverables frozen at file granularity.
- **NO modification of `engine/types/verdict.ts` outside the three deltas in § 2.1** (TopologyNode.kind extension at line 236; TopologyEdge.relationship extension at line 246; file-level docblock R23 amendment at lines 6-16). Any other modification = ESCALATE.
- **NO deployment-event-feed ingestion** — SLICE 4 (R-E3a/c).
- **NO MD-F4 empirical evidence / common-mode failure-injection test at R23** — SLICE 3.C (R25).
- **NO PR-F6 hybrid Reviewer at R23** — fires at SLICE 3.C close (R25 per close-walk § 3 line 165).
- **NO real-cluster integration / Slurm or K8s or NVLink ingestion adapters** — SLICE 3.B (R24).
- **NO Addition #25 D2/D5 reversal**; **NO Addition #26 D1/D4/D5 reversal** — all preserved through R18+R20+R21+R22+R23.
- **NO new `HardwareTopologySource` subclass at R23** — R24 decides subclass-vs-parallel-class expansion.
- **NO parametrization of `makeV9YMultiRackCluster` on nRacks/nShardsPerRack at R23** — fixed default at R23; R25 adds parametrization if needed.
- **NO CLAUDE-IMPLEMENTER.md consolidation** — operator-triggered, not R23 scope.
- **NO inherited detector internal changes** (A12/A5).

---

## § 7 Open questions

None — all resolved by NEXT-ROLE.md directives, § 0 brainstorm rationale, and § 2 mechanism prescriptions:

- Q1 sub-scope split → § 0.1 Approach A (confirms NEXT-ROLE.md recommendation).
- Q2 enum extensions → § 0.2 Approach A (two node-kinds + one edge-relationship literal; identifiers `'psu'`, `'cooling_zone'`, `'nvlink_peer'` final).
- Q3 class shape → § 0.3 Approach A (single concrete class `HardwareTopologySource`; Static-style constructor).
- Q4 file placement → `engine/hardware-topology-source.ts` (per close-walk § 3 line 152; Tessera-original; no AT_PIN_FILES entry needed).
- Q5 BFS-on-undirected → § 0.5 Approach A (inherited BFS handles; NO topology-overlay.ts modification).
- Q6 test substrate → § 0.4 Approach A (v9Y new file; v9X unchanged).
- Q7 sparse-topology degradation → § 0.6 Approach A (deferred to R25 consumer-layer; R23 data-layer accepts any valid snapshot per inherited shape).
- Q8 snapshot-hash semantics → § 0.7 (verified: `'nvlink_peer'` slots lexicographically between `'contains'` and `'publishes'`; inherited semantics preserved).

### § 7.1 Halt-condition pre-anticipation (per R08 + R19 + R22 reinforcements)

| Scenario | Pre-anticipation | Prescribed response |
|---|---|---|
| (a) Implementer's RED-first compile-time literal test for `'psu'` / `'cooling_zone'` / `'nvlink_peer'` fails because the union extension was applied incorrectly. | Low probability (the deltas are simple union appends per § 2.1). | RED expected before Delta 1 + Delta 2 applied; transition to GREEN after applying the spec-prescribed union extensions. Standard RED→GREEN; not a HALT. |
| (b) Implementer's RED-first runtime test for `HardwareTopologySource.fetchSnapshot()` identity (`assert.strictEqual(returned, snapshot)`) fails after class implementation because the class implementation accidentally deep-clones or mutates the snapshot. | Low probability (the spec § 2.2 prescribes `return this.snapshot;` directly). | Fix at Implementer-time per spec § 2.2; not a HALT. |
| (c) `node --test test/*.test.js` at chore-A reports tests != 216 / pass != 216 / fail != 0 because a pre-R23 test broke under the union extension. | Low probability (the unions are additive-only; pre-R23 tests don't switch on absent literals). | DIAGNOSTIC + ESCALATE with bounded options: (i) revert the breaking enum extension and ESCALATE for operator disposition (likely option Q-J-style architect call); (ii) extend the failing test to acknowledge the new literal — note this requires modifying a pre-R23 test file, which is anti-scope; default disposition is (i) ESCALATE. |
| (d) Typecheck fails because of an unintended type-error in the new class or fixture file. | Low probability (the class mirrors StaticTopologySource line-for-line). | Fix at Implementer-time; not a HALT. |
| (e) `computeSnapshotHash` produces non-deterministic output on v9Y because the sort comparison is unstable under the new `'nvlink_peer'` literal. | Very low probability (lexicographic ordering verified in § 0.7). | If observed: DIAGNOSTIC + ESCALATE; pre-anticipated as exceedingly unlikely; if surfaced would require sort-stability fix in topology-overlay.ts which is anti-scope → ESCALATE for operator disposition. |
| (f) Some path in the actual implementation diff lands outside the 13-entry allowed-set (e.g., a forgotten import line auto-touches an inherited file). | Low probability (path-set is explicit). | DIAGNOSTIC + ESCALATE; operator amends allowed-set if the touch is justified (R18 precedent for ESCALATE-unblock at the diff layer). |

No halt expected at spec-emit time; pre-anticipation covers the unlikely cases.

---

## § 8 P3 ten-axis verification (one sentence per axis)

- **correctness** — Type union extensions in § 2.1 are additive-only over R18 unions; class implementation in § 2.2 mirrors `StaticTopologySource` line-for-line at `engine/topology-overlay.ts:83-101` with three identifier substitutions (class name + two default literals); fixture in § 2.4 enumerates exact 10-node × 14-edge content with deterministic node ordering. No correctness ambiguity.
- **completeness** — Every PRD FR-E3b requirement and US-02 user story line maps to at least one AC (interface conformance: AC-R23-4; data-layer enum: AC-R23-1 + AC-R23-2; substrate: AC-R23-8; preservation: AC-R23-10 + AC-R23-11). Every § 2 prescription has at least one AC binding it (or is documentation per § 2.1 Delta 3 docblock, explicitly noted as non-AC-bound).
- **consistency** — Cross-section consistency pass run: identifiers (`'psu'`, `'cooling_zone'`, `'nvlink_peer'`, `HardwareTopologySource`, `makeV9YMultiRackCluster`, `'hardware_topology_source'`, `'hardware-1'`, `'v9Y_synthetic_multi_rack'`, `'v9Y.1'`) appear identically in § 0, § 2, § 3, § 5, § 6, § 7. AC classification preamble (§ 5) matches § 2.6 file docblock prescription matches § 3 binding column.
- **clarity** — ACs use "Given X, when Y, then Z" form with specific assertion-form prescriptions ("strict-equal", "regex match", "count exactly N", "identity-equal `===`"). Banned phrases ("correctly", "appropriately", "as needed") audited — none present.
- **coverage** — 15 ACs (12 runtime + 2 binding-command + 1 chore-B anti-scope) cover: type-layer extensions (3 ACs), class shape (4 ACs), substrate (2 ACs), inherited preservation (3 ACs), build-time + suite-pass + anti-scope (3 ACs). Branch-binding coverage gate applied to id+version fallback chains (AC-R23-5 + AC-R23-6 each enumerate 3 sub-cases per § 2.2 binding table).
- **constraints** — R23 anti-scope (§ 6) enumerates 14 hard prohibitions; HALT-condition pre-anticipation (§ 7.1) prescribes responses for 6 unlikely scenarios. NEXT-ROLE.md anti-scope (lines 64-76) absorbed into § 6.
- **concurrency** — N/A; class is single-threaded data-layer wrapper; no concurrent access patterns introduced. Inherited `TopologyEnricher` (consumer-layer) is async but not touched at R23.
- **corner cases** — Snapshot with no edges (only nodes): computeSnapshotHash still deterministic (empty edge array sorts trivially). Snapshot with empty `source_id` / `source_version`: fallback chain in § 2.2 picks default literal. Empty-string semantics for opts (e.g., `opts.id === ''`): `??` operator treats empty-string as truthy → instance.id would be `''` (intentional; mirrors `StaticTopologySource` semantics; not a hidden behavior).
- **cost** — Test suite delta +12 runtime tests at chore-A → +1 chore-B = +13 total; CPU budget at fleet scale unaffected (R23 ships data-layer scaffold; no per-tick latency impact); storage delta zero (no new per-shard or per-instance data).
- **coupling** — R23 takes R18 (TopologyNode.kind + TopologyEdge.relationship at verdict.ts:236/246) as frozen-with-extension; takes topology-overlay.ts (TopologySource interface, computeSnapshotHash) as read-only inherited; produces a class API surface that R24 ingestion adapters consume. R20 + R21 + R22 deliverables untouched.

---

## § 9 Grilling output (Superpowers Review phase — adversarial self-review, inline)

### § 9.1 Every claim verifiable?
**YES.** Each AC references specific file:line or specific identifier. Branch-binding tables in § 2.2 map removable code to specific failing sub-cases. Cross-section identifier consistency verified by direct grep (token list above). PRD mapping in § 1.3 cites specific scoping-memo line numbers + R18 antecedents.

### § 9.2 Any unstated assumptions the Implementer or Reviewer cannot verify?
- (a) **`'nvlink_peer'` lexicographic position within the relationship sort space.** STATED in § 0.7 with verification reasoning (`'calls' < 'contains' < 'nvlink_peer' < 'publishes' < 'reads' < 'writes'`). The Reviewer can independently verify by inspection. Sub-assumption: V8 `String#localeCompare` vs `<`/`>` operators produce the same lexicographic order for ASCII-only relationship literals. Verified: all six literals are ASCII; `<` operator yields the same order as `localeCompare`.
- (b) **BFS at `engine/topology-overlay.ts:265-267` is relationship-agnostic.** STATED in § 0.5. The Reviewer can verify by re-reading lines 262-285 of the inherited file.
- (c) **`adjacency.get(e.from)?.add(e.to)` no-ops when `e.from` is absent from adjacency.** STATED in § 0.6. Standard JavaScript optional-chaining behavior; not assumption-load-bearing for R23 ACs (no R23 AC exercises sparse-from-edge degradation).
- (d) **R18 v9X invariants (AC-R18-4/5) remain valid after R23.** STATED in § 1.1 (v9X-cluster.ts UNCHANGED row). v9Y is a parallel new file; does not import or extend v9X.

All four assumptions are documented and Reviewer-verifiable by direct file-read.

### § 9.3 Scope added beyond request?
**NO.** Cross-checked against NEXT-ROLE.md round-scope directive (lines 7-34):
- ✅ "type-layer deltas (PSU + cooling-zone + nvlink_peer enums)" → § 2.1 Deltas 1/2.
- ✅ "HardwareTopologySource scaffold class + StaticHardwareTopologySource impl (analogous to StaticTopologySource)" → § 2.2 with class shape decision in § 0.3.
- ✅ "v9X-or-v9Y test substrate decision" → § 0.4 Approach A; § 2.3 + § 2.4.
- ✅ "basic snapshot-hash + fetchSnapshot binding" → § 2.2 class methods + AC-R23-7 + AC-R23-9.
- ✅ Round-size budget ≤ 12-15 ACs → 15 ACs.

No items added beyond directive; no items dropped from directive.

### § 9.4 Implementer can act without guessing?
**YES.** Every architectural decision is captured in spec:
- Class name: `HardwareTopologySource` (§ 2.2).
- Default id literal: `'hardware_topology_source'` (§ 2.2).
- Default version literal: `'hardware-1'` (§ 2.2).
- Fixture file name: `test/_substrate/v9Y-multi-rack-cluster.ts` (§ 2.3).
- Fixture function name: `makeV9YMultiRackCluster` (§ 2.3).
- Fixture default topology: 10 nodes × 14 edges, exact content enumerated (§ 2.4).
- Test file name: `test/q23-hardware-topology-source.test.ts` (§ 2.6).
- Test count assertion at chore-A: 216 (§ 5 AC-R23-14).
- Allowed-set: 13 entries (§ 3).
- Baseline SHA: `2946b13` (file-header + § 3 + § 5 AC-R23-15).

### § 9.5 Verification-command-soundness pass (per R03 MINOR-2 reinforcement)
- AC-R23-3 manifest grep for `'psu'`, `'cooling_zone'`, `'nvlink_peer'` substrings: the Implementer writes the R23 notes-string per § 2.5 which contains all three. Reviewer can independently verify by `grep -n "psu\|cooling_zone\|nvlink_peer" coordination/VENDORING-MANIFEST.md`.
- AC-R23-10 / AC-R23-11 regex patterns mirror AC-R18-7 / AC-R18-8 (verified to pass against R18 baseline; R23 doesn't touch the asserted surfaces).
- AC-R23-12 manifest-row count = 40: matches R18 AC-R18-9 invariant (R23 ADDS no new vendored row).

### § 9.6 Spec-internal contradiction pass (per R15 MINOR-3 + R20 MINOR-1 reinforcements)
- AC § 5 classification preamble (12 runtime / 2 binding-command / 1 chore-B) MATCHES § 2.6 file-docblock prescription MATCHES § 3 binding column. No mismatch.
- Halt-condition (b) in § 7.1 prescribes "ESCALATE for operator disposition (likely option Q-J-style architect call)" for the unlikely scenario of pre-R23 test break under union extension — consistent with the spec § 6 anti-scope "NO modification of any pre-R23 test file" and the response prescription.
- Anti-scope baseline SHA = `2946b13` consistent across § 3, § 5 AC-R23-15, file-level header. No drift.

### § 9.7 Empirical-premise verification (per R08 MAJOR-2 + R20 ARCH MINOR-1 reinforcements)
Load-bearing claims verified by direct file-read at session start (not inherited from memory or prior testimony):

| Claim | File + line | Verified at session start |
|---|---|---|
| `TopologySource` interface at engine/topology-overlay.ts:50-55 | `engine/topology-overlay.ts:50-55` | ✅ read full body lines 1-394 |
| `computeSnapshotHash` at engine/topology-overlay.ts:69-78 | `engine/topology-overlay.ts:69-78` | ✅ read |
| `StaticTopologySource` template at engine/topology-overlay.ts:83-101 | `engine/topology-overlay.ts:83-101` | ✅ read |
| BFS at engine/topology-overlay.ts:262-285 builds bidirectional adjacency | `engine/topology-overlay.ts:265-267` | ✅ read; confirmed `adjacency.get(e.from)?.add(e.to); adjacency.get(e.to)?.add(e.from);` |
| `TopologyNode.kind` union at engine/types/verdict.ts:236 (R18 post-state) | `engine/types/verdict.ts:236` | ✅ read; confirmed `'service' \| 'database' \| 'queue' \| 'external' \| 'gpu_shard' \| 'rack'` |
| `TopologyEdge.relationship` union at engine/types/verdict.ts:246 (R18 post-state) | `engine/types/verdict.ts:246` | ✅ read; confirmed `'calls' \| 'reads' \| 'writes' \| 'publishes' \| 'contains'` |
| `TopologyCandidate.correlational_not_causal: true` at engine/types/verdict.ts:280 | `engine/types/verdict.ts:280` | ✅ read in surrounding context |
| Addition #25 D5 group_id format regex at engine/verdict-groups.ts | `engine/verdict-groups.ts` (regex referenced) | ✅ verified via AC-R18-7 precedent (regex matched on R18+R20+R21+R22 HEAD); R23 doesn't touch this file |
| v9X-cluster.ts default invariants (11 nodes, 10 contains-edges) | `test/_substrate/v9X-cluster.ts:30-58` | ✅ read full body |
| q18 AC-R18-9 manifest 40-file pattern | `test/q18-phase2-slice1-topology-substrate.test.ts:119-140` | ✅ read |
| q01-no-at-pin-deltas.test.ts AT_PIN_FILES at 36 entries; topology-overlay.ts at line 51 | `test/q01-no-at-pin-deltas.test.ts:29-76` | ✅ read |
| q01-vendoring-coverage.test.ts VENDORED_AT_PIN_PATHS at 36 entries including topology-overlay.ts (line 36) + verdict.ts (line 40) | `test/q01-vendoring-coverage.test.ts:14-61` | ✅ read |
| VENDORING-MANIFEST row 26 (topology-overlay.ts: vendored-at-pin) | `coordination/VENDORING-MANIFEST.md:26` | ✅ read |
| VENDORING-MANIFEST row 29 (verdict.ts: vendored-with-deltas; R18 notes) | `coordination/VENDORING-MANIFEST.md:29` | ✅ read |
| HEAD SHA = `2946b13` (R23-prep) | `git rev-parse HEAD` | ✅ run |
| Test count at HEAD = 204 | NEXT-ROLE.md § "Phase 2 SLICE 3 readiness state at R23 entry" | ✅ read (testimonial, not direct measure; consistent with R22 chore-B = 203+1 = 204) |

All load-bearing claims have a file-read or command-run anchor at session start. No claim is inherited from prior testimony without independent verification — except the test count of 204 (testimonial; if Implementer re-measures and finds different baseline, that is a halt-condition for ESCALATE per § 7.1 scenario (c)).

### § 9.8 Vendored-file-delta assertion-surface enumeration (per R18 OBS-2 + R20 ARCH application reinforcement)

The vendored-with-deltas file `engine/types/verdict.ts` gets two new enum-literal extensions at R23. Every test file that opens or asserts byte-identity on this file must be enumerated and pre-traced:

| Consumer test | Assertion surface | R23 impact |
|---|---|---|
| `test/q01-no-at-pin-deltas.test.ts` | AT_PIN_FILES byte-identity check; verdict.ts EXCLUDED from list (already vendored-with-deltas since R18, line 54 comment "verdict.ts excluded — vendored-with-deltas at R18") | UNAFFECTED — no list change |
| `test/q01-vendoring-coverage.test.ts` | first-line SHA-pin header check; verdict.ts INCLUDED at line 40 | UNAFFECTED — header line preserved |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | AC-R18-1: literal `'gpu_shard'` + `'rack'` accept (compile-time); AC-R18-2: literal `'contains'` accept; AC-R18-7/8: D5 + D4 grep | UNAFFECTED — R23 extends the unions, preserves R18 literals + D5 + D4 surfaces |
| `test/q23-…` (R23 NEW) | new ACs per § 5 | EXERCISES the R23 deltas (intended) |
| Any other test reading verdict.ts content | (none — grep verified) | N/A |

Three consumer tests of `engine/types/verdict.ts` enumerated; all UNAFFECTED by R23 deltas; only the R23 NEW test exercises the deltas. Pre-handling per the R18 OBS-2 lesson: no ESCALATE risk at R23 from union-extension.

For the vendored-with-deltas file `engine/types/verdict.ts` row in the manifest (row 29), the notes-column update at § 2.5 is the ONLY manifest mutation. No row-state transition; no AT_PIN_FILES list mutation. Pre-handling per the R20 application reinforcement.

### § 9.9 File-level documentation coverage (per R10 MINOR-1 reinforcement)

The R23 deltas to `engine/types/verdict.ts` modify the file's exported type surface (two enum literals added). The file-level docblock at lines 6-16 (R18 amendment block) currently says: "1. TopologyNode.kind union extends to include 'gpu_shard' | 'rack' (subset of v0.3 list; 'psu' | 'cooling_zone' deferred to later Phase 2 SLICE)" — R23 lands the deferred portion. Per the R10 MINOR-1 reinforcement, the spec § 2.1 Delta 3 prescribes a docblock update. Implementer-time wording is left to the Implementer subject to two content requirements (presence of `'psu'`/`'cooling_zone'` in `TopologyNode.kind` context; presence of `'nvlink_peer'` in `TopologyEdge.relationship` context). The docblock change is documentation, not AC-bound — explicitly noted in § 3 binding column.

### § 9.10 Cross-spec-section identifier consistency pass (per R01 + R02 + R03 reinforcements)

Token list verified across § 0, § 2, § 3, § 5, § 6, § 7:

| Token | § 0 | § 2 | § 3 | § 5 | § 6 | § 7 |
|---|---|---|---|---|---|---|
| `'psu'` | § 0.2 | § 2.1, § 2.4 | § 3 | AC-R23-1, AC-R23-3, AC-R23-8 | § 6 | § 7 Q2 |
| `'cooling_zone'` | § 0.2 | § 2.1, § 2.4 | § 3 | AC-R23-1, AC-R23-3, AC-R23-8 | § 6 | § 7 Q2 |
| `'nvlink_peer'` | § 0.2, § 0.7 | § 2.1, § 2.4 | § 3 | AC-R23-2, AC-R23-3, AC-R23-8 | § 6 | § 7 Q2 |
| `HardwareTopologySource` | § 0.3 | § 2.2 | § 3 | AC-R23-4, AC-R23-5, AC-R23-6, AC-R23-7 | § 6 | § 7 Q3 |
| `makeV9YMultiRackCluster` | § 0.4 | § 2.3, § 2.4 | § 3 | AC-R23-8, AC-R23-9 | § 6 | § 7 Q6 |
| `'hardware_topology_source'` | — | § 2.2 | — | AC-R23-5 sub-case (c) | — | — |
| `'hardware-1'` | — | § 2.2 | — | AC-R23-6 sub-case (c) | — | — |
| `'v9Y_synthetic_multi_rack'` | — | § 2.4 | — | AC-R23-8 sub-case (i) | — | — |
| `'v9Y.1'` | — | § 2.4 | — | AC-R23-8 sub-case (j) | — | — |
| baseline SHA `2946b13` | — | — | § 3 path-set introduction | AC-R23-15 | — | — |
| Allowed-set size = 13 | — | — | § 3 | AC-R23-15 | — | § 7.1 |
| Test count at chore-A = 216 | — | — | — | AC-R23-14 | — | § 7.1 (c) |
| AC-R23-15 chore-B substitution | — | § 2.7 step 4 | § 3 | AC-R23-14, AC-R23-15 | — | — |

No identifier drift across sections. No naming-convention inconsistencies.

### § 9.11 Halt-discipline coverage (per R08 + R19 reinforcements)

Six halt scenarios pre-anticipated in § 7.1 with prescribed responses. Each scenario names the trigger condition and the Implementer's prescribed action (transition vs HALT vs DIAGNOSTIC+ESCALATE). No spec-internal contradictions between halt prescriptions and AC consequences (verified per R15 MINOR-3 pre-emit pattern).

### § 9.12 Memorial-self-exoneration guard (per R08 MAJOR-1 reinforcement)

This spec's MEMORIAL ceremony content (sidecar in Q-R23-SPEC-AUDIT.md § 7) does NOT characterize any anticipated discipline deviation as "correct" or "acceptable" — only describes the disciplines applied at spec-emit time. Any post-routing violation discovered by the Reviewer is the Reviewer's call to classify; the Architect's MEMORIAL entry does not pre-claim correctness.

### § 9.13 Branch-binding coverage gate (per R21 ARCH+IMPL MINOR-2/3 reinforcement)

Every guard/branch/short-circuit in `engine/hardware-topology-source.ts` is enumerated in § 2.2 branch-binding table with the AC sub-case that structurally exercises it. No guard is shipped without a binding AC sub-case. (The class is wrapper-thin; the only branches are the two fallback chains in the constructor; both are exercised by AC-R23-5 and AC-R23-6.)

### § 9.14 Count-AC anchored to chore-A SHA (per R22 IMPL MINOR-1 reinforcement)

AC-R23-14 explicitly says "at MERGE-READY chore-A SHA `<MERGE-READY-CHORE-A-SHA>` (recorded in NEXT-ROLE.md attestation block at chore-A time)". Not anchored to "after R23 implementation commits" generically. Implementer substitutes the actual SHA at chore-A time. Pattern matches R22 MINOR-1 reinforcement.

### § 9.15 Cross-project line-citation-drift rule (per R21 cross-project derivation)

Every test() declaration line cited in NEXT-ROLE.md attestation block at chore-A MUST match the actual `test()` declaration line via grep-verification, NOT recalled from memory. This is an Implementer-time discipline, not an Architect-time discipline; included here as a CARRY-FORWARD reminder for the Implementer to apply at chore-A authoring.

### § 9.16 Reviewer can act with zero clarifying questions?
**YES.** Every AC is "Given X, when Y, then Z" with specific assertion forms. Every spec section cross-references concrete file:line locations. Branch-binding sub-cases enumerate the failure mode under guard-removal. Allowed-set is explicit (13 entries). Test count is explicit (216 at chore-A). Spec is internally consistent (§ 9.6, § 9.10).

### § 9.17 Final pre-route gate

All 16 grilling gates above PASS. Spec is READY for routing to Implementer.

---

_End of Q-R23-SPEC.md._
