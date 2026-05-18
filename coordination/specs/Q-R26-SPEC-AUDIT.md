# Q-R26 Spec Audit Sidecar — Phase 2 SLICE 3.C MD-F4 (cluster wu-04-md-f4-common-mode)

_Audit-trail content per CLAUDE-ARCHITECT.md: brainstorm phase, decision rationale, P3 sub-claim detail, empirical-premise-verification table, pre-emit grilling appendix, Architect pre-prediction on outcomes._

_Implementer reads `Q-R26-SPEC.md` only. Reviewer at R26 close reads both files. Hybrid Reviewer at WU-05 SLICE 3 close reads `coordination/evidence/PR-F6-EVIDENCE.md` + this sidecar + the spec proper._

---

## 1. Empirical-premise-verification table

Direct file-open at session start; each load-bearing factual claim in the spec is anchored to a verifiable source.

| # | Claim | Source / how verified | Verdict |
|---|---|---|---|
| 1 | `engine/topology-overlay.ts:262-285` private BFS treats edges as bidirectional. | Direct Read of file (lines 262-285); adjacency build at lines 264-268: `for (const e of snapshot.edges) { adjacency.get(e.from)?.add(e.to); adjacency.get(e.to)?.add(e.from); }`. | VERIFIED. |
| 2 | `computeSnapshotHash` at `engine/topology-overlay.ts:69-78` is an exported free function (not method). | Direct Read lines 69-78: `export function computeSnapshotHash(snapshot: TopologySnapshot): string { … }`. Also imported by `engine/hardware-topology-source.ts:21-24`. | VERIFIED. |
| 3 | `TopologyNode.kind` union at `engine/types/verdict.ts:245` includes 'psu' and 'cooling_zone'. | Direct Read line 245: `kind: 'service' \| 'database' \| 'queue' \| 'external' \| 'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone';`. | VERIFIED. |
| 4 | `TopologyEdge.relationship` union at `engine/types/verdict.ts:255` includes 'nvlink_peer'. | Direct Read line 255: `relationship: 'calls' \| 'reads' \| 'writes' \| 'publishes' \| 'contains' \| 'nvlink_peer';`. | VERIFIED. |
| 5 | `TopologySnapshot` interface at `engine/types/verdict.ts:260-269` has nodes / edges / fetched_at_ts / source_id / source_version. | Direct Read lines 260-269. | VERIFIED. |
| 6 | `TopologyCandidate.correlational_not_causal` at `engine/types/verdict.ts:289` is typed as the literal `true` (not `boolean`). | Direct Read line 289: `correlational_not_causal: true;`. | VERIFIED. The R26 `CommonModeCandidate` reuses this literal-type convention. |
| 7 | v9Y default geometry: 10 nodes (2 rack + 2 psu + 2 cz + 4 gpu_shard) + 14 edges (8 contains psu/rack/cz → shards + 4 contains rack → shards + 2 nvlink_peer shard ↔ shard). | Direct Read of `test/_substrate/v9Y-multi-rack-cluster.ts` (full 62 lines). Verified at lines 25-36 (nodes) + 38-53 (edges). | VERIFIED. **Correction:** the 14 edges break down as 4 rack→shard contains + 4 psu→shard contains + 4 cz→shard contains + 2 nvlink_peer. Total 14 confirmed at AC-R23-8 (R23 memorial). |
| 8 | PSU-0 contains shard-0 and shard-1; PSU-1 contains shard-2 and shard-3. | Direct Read v9Y lines 43-46. | VERIFIED. |
| 9 | rack-0 contains shard-0 and shard-1; rack-1 contains shard-2 and shard-3. | Direct Read v9Y lines 39-42. | VERIFIED. |
| 10 | cz-0 contains shard-0 and shard-1; cz-1 contains shard-2 and shard-3. | Direct Read v9Y lines 47-50. | VERIFIED. |
| 11 | nvlink_peer edges: shard-0 ↔ shard-1; shard-2 ↔ shard-3. | Direct Read v9Y lines 51-52. | VERIFIED. |
| 12 | Round-start SHA is `71224e7` (last commit before R26 Architect work begins). | `git rev-parse HEAD` from worktree root + `git log --oneline -10`. | VERIFIED. |
| 13 | `.gitignore:6` declares `*.js` (compiled outputs excluded from git tracking). | Direct Read of `.gitignore`. Phantom-entry check per R23 MINOR-2 reinforcement applied to spec § 2.1: 0 `.js` paths listed. | VERIFIED. |
| 14 | `.gitignore` does NOT exclude any of the 7 paths in spec § 2.1 anti-scope allowed-set. | Direct line-by-line read of `.gitignore`: rules `node_modules/`, `*.log`, `*.bak`, `runs/`, `*.js`, `*.js.map`, `dist/`, `.auto-memory/`, `.env`, `.env.local`, `coverage/`, `*.tsbuildinfo`, `coordination/.prompt-*.md`, `coordination/.pipeline-*.lock`, `coordination/.role-stamp`, `coordination/clusters/`, `coordination/multi-track-status.json` — none match the 7 allowed-set entries. | VERIFIED. |
| 15 | Existing test files use the convention `test/q<ID>-<description>.test.ts`. | `ls test/` output: `q01-…` through `q23-…` + `betting-e-process-class-dispatch.test.ts` + `_substrate/`. R26 uses `test/q-md-f4-common-mode-injection.test.ts` per PRD § File location prescription. | VERIFIED (PRD prescribes the filename verbatim). |
| 16 | `engine/hardware-topology-source.ts` (R23-frozen) returns `TopologySnapshot` directly via `fetchSnapshot()` async, but R26 tests construct snapshots via `makeV9YMultiRackCluster()` directly (no async). | Direct Read of `engine/hardware-topology-source.ts` (44 lines). `makeV9YMultiRackCluster()` is a sync factory returning `TopologySnapshot`. Tests use the sync factory and pass the result directly to `attributeCommonMode`. | VERIFIED. |

Baseline test count at `71224e7`: NOT empirically measureable at Architect session (per spec § 8.1 row 11 + § 8.2 row 5). Implementer empirically measures at RED commit; substitutes into AC-R26-15 at chore-A authoring.

External-literature URLs (Citations 2-4 in evidence package): MEDIUM-confidence canonical patterns; NOT cold-fetched at Architect session. Surfaced as OQ-R26-1 + OQ-R26-2; hybrid Reviewer cold-verifies at WU-05.

---

## 2. Brainstorm phase (Superpowers § Brainstorm)

### 2.1 Three distinct approaches for the algorithm

**Approach A — Forward BFS from fired shards, Map-keyed by shared hardware node.**

Mechanism: for each `FiredShardEvent`, BFS-bounded from the shard node; for every reachable candidate-kind node, append the fired shard to a per-shared-node touch list. Aggregate by shared_node_id. Filter by `min_member_count`. Sort by (kind, id).

Strengths:
- Linear in `|fired_events|` × graph cost. Sparse-firing (the typical case) is fast.
- Symmetric with the inherited `engine/topology-overlay.ts` BFS pattern (which also fires forward from a single deploy-resolved start node).
- Natural decoupling: doesn't enumerate the snapshot's hardware nodes until they are reached.

Weaknesses:
- Re-walks the graph once per fired event (no amortization across events).
- For dense firing (all shards fire), this is O(N²) vs O(N) for Approach B.

Hidden assumptions:
- The set of fired events is sparse in steady state. PRD US-01 + PR-F6 cells imply 2-3 fired shards per simulated event.
- BFS bound (max_hop=1) keeps per-event cost O(degree) — cheap regardless.

Risks: none load-bearing at Phase 2 SLICE 3.C scale.

**Approach B — Reverse walk from every hardware-substrate node.**

Mechanism: for each `TopologyNode` of kind PSU/rack/cooling_zone, enumerate contained shards (BFS-bounded inward); intersect with `fired_events.map(e => e.shard_node_id)`; emit candidate if intersection size ≥ `min_member_count`.

Strengths:
- O(|hardware_nodes|) outer loop; O(degree) per inner BFS. Stable cost regardless of fired-event count.
- Conceptually symmetric — easier for some readers to reason about ("for each candidate, how many of its shards fired?").

Weaknesses:
- Walks every hardware node even when no shards have fired. Wasteful for the typical sparse case.
- Requires an additional pass to derive a Set<shard_node_id> from fired_events.

Hidden assumptions:
- Caller has already partitioned `fired_events` into a Set (or the implementation does it up-front).

Risks:
- Symmetric to Approach A on output — both produce the same candidate set mathematically. Choice is implementation cost only.

**Approach C — Reuse `TopologyEnricher.enrich()` per VerdictGroup; aggregate candidates downstream.**

Mechanism: for each per-shard VerdictGroup, call the inherited `engine/topology-overlay.ts` `TopologyEnricher.enrich(group, [])`. Collect resulting `VerdictGroupWithTopology` records; aggregate `candidates` arrays by `topology_distance`-bounded clustering.

Strengths:
- Reuses inherited code path (no new BFS implementation needed).

Weaknesses:
- `TopologyEnricher.enrich` is keyed by `deploy_id → start_node` resolver and emits `TopologyCandidate` records (different shape from R26's `CommonModeCandidate`).
- The existing enricher operates per-`VerdictGroup`, not across a fired-shard batch — no cross-group aggregation surface.
- To enable cross-shard aggregation we'd need to modify `TopologyEnricher` body or wrap it in a new module that pre-resolves cross-group correlations. The wrap option re-implements the algorithm anyway.
- DIRECT MODIFICATION of `engine/topology-overlay.ts` body = **A12 violation** per PRD § Anti-scope and Q-R23-SPEC § 0.5 precedent.

Hidden assumptions: none load-bearing.

Risks: HIGH — Approach C requires either touching A12-protected vendored code or building a thin wrapper that reimplements the BFS anyway (collapsing to Approach A or B).

### 2.2 Selection rationale

**Chosen: Approach A.**

Why-picked: (1) symmetric with inherited topology-overlay BFS pattern, lowest cognitive cost for cold readers; (2) cheap in the sparse-firing case which is the steady-state operational mode (PRD US-01 distinguishes "shard 47 has a bad GPU" from "all shards drift" — the latter is rare); (3) decoupled from `FusedVerdict` and `VerdictGroup` shapes via the lean `FiredShardEvent` input.

Why-rejected (B): symmetric output, but wasteful in the steady-state sparse case. If profiling later shows dense firing dominates, swap to B with no API change. Cost-neutral now, future-flexible.

Why-rejected (C): A12 violation, OR a thin wrapper that ends up being Approach A in disguise. Worst of both worlds.

### 2.3 Three distinct approaches for the test-substrate of AC-R26-9 (sparse-topology)

**Approach X — New substrate file `test/_substrate/v9Y-rack-only.ts`.**

Strengths: explicit; easy for cold reader to reason about.
Weaknesses: adds a new file to the inventory; per PRD § Substrate "extends but does NOT modify" — creating a NEW substrate is "extending" rather than modifying, so allowed, but operationally heavier.

**Approach Y — Inline filter in the test (call `makeV9YMultiRackCluster()` then filter nodes/edges by kind).**

Strengths: zero new substrate file; test-locality keeps the fixture variation co-located with the AC; PRD § Anti-scope NO modification of v9Y substrate is preserved.
Weaknesses: filter logic lives in the test body — risk of accidental coupling with attribution logic if the filter is too clever.

**Approach Z — Hand-construct a minimal rack-only snapshot literal in the test (no substrate import).**

Strengths: explicit; smallest possible fixture for the AC.
Weaknesses: drifts from v9Y geometry; if v9Y semantics change post-R23 the test wouldn't track them.

**Selected: Approach Y (inline filter).** Why-picked: zero new substrate file; test-local; provably derived from v9Y (no semantic drift). Why-rejected (X): operational overhead not justified for one AC. Why-rejected (Z): unanchored from v9Y semantics — future v9Y changes would not propagate.

### 2.4 Three distinct approaches for the chore-B forward-protection pattern

**Approach P — `child_process.execFileSync('git', [...])` runtime test reading the chore-A SHA as a string constant.**

Strengths: established pattern at R20 / R21 / R22 / R23 (AC-R23-15 + AC-R22-8). Cold reader / Reviewer can re-derive the assertion by running the same command.
Weaknesses: requires git binary at test-runtime; brittle if the test is run outside a git worktree (rare).

**Approach Q — Read `.git/index` directly (via `simple-git` or libgit2 bindings).**

Strengths: no external command dependency.
Weaknesses: new dependency; bigger blast radius; not established precedent.

**Approach R — Snapshot the chore-A diff into a fixture file and assert against it.**

Strengths: deterministic; no runtime git invocation.
Weaknesses: doesn't forward-protect — the fixture file is committed alongside, no fresh diff is taken at test-runtime; defeats the purpose.

**Selected: Approach P** (consistent with R20/R21/R22/R23 precedent). Why-picked: established; cold-reproducible by Reviewer running the same command. Why-rejected (Q): no precedent + new dependency. Why-rejected (R): structurally doesn't forward-protect.

### 2.5 Three distinct approaches for evidence-package structure

**Approach S — Architect-authored at spec-emit time (committed in Architect commit A).**

Strengths: PRD explicitly says "cited at architect time"; hybrid Reviewer at WU-05 cold-verifies; no Implementer involvement in citation selection.
Weaknesses: Architect's URL confidence may be MEDIUM for some entries (no cold-fetch at session); surfaced as OQ.

**Approach T — Implementer-authored at chore-A time.**

Strengths: Implementer can cold-fetch URLs during the round.
Weaknesses: violates PRD prescription ("at architect time"); shifts citation-selection authority to Implementer.

**Approach U — Architect drafts skeleton with placeholders; Implementer fills in URLs.**

Strengths: hybrid distribution.
Weaknesses: ambiguous authority; placeholders may not be filled in if Implementer judgment differs.

**Selected: Approach S.** Why-picked: PRD-mandated. Why-rejected (T+U): PRD prescription overrides cost optimization.

### 2.6 Three distinct approaches for the AC count budget

**Approach α — Minimum (12 ACs):** 4 PR-F6 cells + 1 BFS-undirected + 2 aggregation + 1 correlational-not-causal + 1 sparse-topology + 1 anti-scope + 1 typecheck + 1 test-count.

**Approach β — Mid (14 ACs):** add 1 evidence-package + 1 forward-protection.

**Approach γ — Ceiling (16 ACs):** add 1 singleton-and-unknown-shard guard + 1 determinism-and-kind-filter.

**Selected: Approach γ (16 ACs).** Why-picked: branch-binding coverage gate (R21 MINOR-2/3 reinforcement) demands every load-bearing failure mode have an AC. F2 + F4 + F7-style determinism are load-bearing per § 1.5. PRD's 12-16 range explicitly permits 16. Why-rejected (α): would create a R21 MINOR-2/3 class repeat at R26 close. Why-rejected (β): leaves F2/F4 and ordering structurally unbound.

---

## 3. Design phase (Superpowers § Design)

### 3.1 Component boundaries sketch

```
+----------------------------------------------------------------+
|  engine/topology/common-mode-attribution.ts  (NEW — Tessera)   |
|                                                                |
|  Imports:                                                      |
|    - TopologyNode, TopologySnapshot from ../types/verdict     |
|    - computeSnapshotHash from ../topology-overlay              |
|                                                                |
|  Exports:                                                      |
|    - attributeCommonMode (function)                            |
|    - FiredShardEvent, CommonModeCandidate, ...Opts, ...Input,  |
|      ...Result (types)                                         |
|    - DEFAULT_MAX_HOP_DISTANCE, DEFAULT_MIN_MEMBER_COUNT,        |
|      DEFAULT_CANDIDATE_NODE_KINDS (constants)                  |
|                                                                |
|  Private:                                                      |
|    - bfsBounded (function)                                     |
|    - KIND_SORT_ORDER (constant)                                |
+----------------------------------------------------------------+
              ▲                          ▲
              │                          │
              │ (consumed by tests)      │ (consumed downstream
              │                          │   at WU-05 + Phase 2 close)
              │                          │
+-------------┴-----------+   +---------┴-----------+
| test/q-md-f4-common-   |   | (future Phase 2     |
|   mode-injection.test  |   |  close audit-       |
|     .ts (NEW)          |   |  emission path)     |
+------------------------+   +---------------------+
              ▲
              │ (reads as artifact)
              │
+-------------┴------------------+
| coordination/evidence/        |
|   PR-F6-EVIDENCE.md (NEW)     |
+-------------------------------+

Inherited (UNCHANGED):
  - engine/topology-overlay.ts   (at-pin; reads computeSnapshotHash only)
  - engine/hardware-topology-source.ts   (R23 frozen)
  - engine/types/verdict.ts   (R23 + R18 frozen at deltas; reads types only)
  - test/_substrate/v9Y-multi-rack-cluster.ts   (R23 frozen)
```

### 3.2 Integration points + data flows

| Integration point | Direction | Data type | PRD requirement traced |
|---|---|---|---|
| Caller → `attributeCommonMode` | inbound | `CommonModeAttributionInput` (fired_events + snapshot + opts) | PRD § Architecturally novel surfaces #2 |
| `attributeCommonMode` → `computeSnapshotHash` | call | `TopologySnapshot` | Inherited Addition #26 D6 (hash determinism) |
| `attributeCommonMode` → result | outbound | `CommonModeAttributionResult` (candidates + snapshot_hash + attributed_at_ts) | PRD § Architecturally novel surfaces #1 + #3 |
| Test → `makeV9YMultiRackCluster` | call | () → `TopologySnapshot` | PRD § Substrate (v9Y; R23 frozen) |
| Test → `attributeCommonMode` | call | `CommonModeAttributionInput` | All AC-R26-1 through AC-R26-12 + AC-R26-16 |
| Test → `fs.readFileSync('coordination/evidence/PR-F6-EVIDENCE.md')` | call (FS read) | string | AC-R26-10 |
| Chore-B test → `execFileSync('git', ['diff', ...])` | call (subprocess) | string list | AC-R26-16 |

### 3.3 Failure mode per integration point

| Integration point | Failure mode | Module response |
|---|---|---|
| Caller → `attributeCommonMode` (bad `fired_events`) | Empty array | Return empty candidates (F1). |
| Caller → `attributeCommonMode` (`fired_events[i].shard_node_id` unknown) | Unknown shard id | Silently skip (F4). |
| Caller → `attributeCommonMode` (empty snapshot) | snapshot.nodes = [] | Return empty candidates (F5); BFS adjacency empty → BFS returns hop-0-only map → no candidate touches. |
| Caller → `attributeCommonMode` (sparse snapshot — rack-only) | Some candidate kinds absent | Return only candidates of present kinds (F6). |
| `attributeCommonMode` → `computeSnapshotHash` | Underlying free function throws? | Inherited function is pure deterministic sha256; cannot throw at runtime barring system-level failures. Module passes the throw upward. |
| Test → `makeV9YMultiRackCluster` | Always returns the canonical 10-node / 14-edge geometry | No failure mode in test context. |
| Test → `attributeCommonMode` | Module-throw on unknown input shape? | TypeScript would have caught any unknown input shape at typecheck (AC-R26-14). |
| Test → `fs.readFileSync('coordination/evidence/PR-F6-EVIDENCE.md')` | ENOENT | AC-R26-10 fails — surface as Reviewer finding. |
| Chore-B test → `execFileSync('git')` | git binary missing | Test throws; surface as environment-mismatch. Reviewer catches at chore-B audit. |

---

## 4. P3 ten-axis verification (sub-claim detail)

### Correctness — sub-claims

- BFS adjacency build is correct: nodes added to adjacency map first (line 1 of build loop), then edges add both directions (line 2). A self-loop edge would add the node id to its own neighbor set, but BFS skips already-visited (the `hops.has(n)` guard at line 5 of BFS body), so no infinite loop.
- Min hop semantics: BFS records the first time a node is reached (line 4 of BFS body: `if (hops.has(n)) continue`). Since BFS explores in hop-distance order, the first record is the min hop.
- Distinct member shard computation: `Array.from(new Set(touches.map(t => t.member_shard_id))).sort()` produces lex-sorted distinct ids.
- `topology_distance = max over distinct shards of min-hop-from-that-shard-to-shared-node`: matches § 1.2 algorithm step 4.
- Sort key precedence: (kind canonical-order, then id lex asc). Matches § 1.3 + AC-R26-12 subcase (a).

### Completeness — sub-claims

- F1: AC-R26-2 + spec § 1.5 row F1.
- F2: AC-R26-11 subcase (a) + spec § 1.5 row F2.
- F3: AC-R26-3 + AC-R26-7 + spec § 1.5 row F3.
- F4: AC-R26-11 subcase (b) + spec § 1.5 row F4.
- F5: AC-R26-9 (rack-only is a subset; truly-empty snapshot is a subset of rack-only) + spec § 1.5 row F5.
- F6: AC-R26-9 + spec § 1.5 row F6.
- F7-F9: degenerate cases sharing code paths with F1 + F2.

### Consistency — sub-claims

Token consistency across spec sections (per R01 + R20 ARCH MINOR-1 reinforcement; CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 cross-section consistency pass):

| Token | § 1 | § 2 | § 3 | § 4 | § 5 | § 7 | § 8 |
|---|---|---|---|---|---|---|---|
| `attributeCommonMode` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `CommonModeCandidate` | ✓ | (implicit) | ✓ | ✓ | (n/a) | (implicit) | (implicit) |
| `FiredShardEvent` | (implicit) | (implicit) | ✓ | ✓ | (n/a) | (implicit) | (implicit) |
| `engine/topology/common-mode-attribution.ts` | ✓ | ✓ | ✓ | (n/a) | ✓ | (implicit) | (implicit) |
| `test/q-md-f4-common-mode-injection.test.ts` | ✓ | ✓ | ✓ | (n/a) | (n/a) | (implicit) | (implicit) |
| `coordination/evidence/PR-F6-EVIDENCE.md` | ✓ | ✓ | ✓ | ✓ | (n/a) | (implicit) | (implicit) |
| `correlational_not_causal: true` | ✓ | (n/a) | ✓ | ✓ | ✓ | (implicit) | (implicit) |
| Round-start SHA `71224e7` | (n/a) | ✓ | (n/a) | ✓ | (n/a) | (n/a) | ✓ |
| 7-path allowed-set | (n/a) | ✓ | (n/a) | ✓ | (n/a) | (n/a) | ✓ |
| Default constants (1/2/['psu','rack','cooling_zone']) | ✓ | (n/a) | ✓ | ✓ | (n/a) | (n/a) | (n/a) |

No identifier drift detected. No name-convention inconsistency.

### Clarity — sub-claims

- ACs use "Given X, when Y, then Z" form per § 4.
- Banned words ("correctly", "appropriately", "as needed") not present in AC text. Manual grep confirms.
- Failure modes named F1-F9 with prescribed responses (§ 1.5).
- File paths cited with absolute identifiers (e.g., `engine/topology-overlay.ts:262-285`, not "the topology BFS").

### Coverage — sub-claims

| Required by PRD § Acceptance criteria | Bound by |
|---|---|
| Per-cell PR-F6 evidence ACs (4 separate ACs) | AC-R26-1 + AC-R26-2 + AC-R26-3 + AC-R26-4 |
| BFS-on-undirected ACs | AC-R26-5 |
| Common-mode candidate aggregation (PSU-grouped + cross-rack-not-grouped) | AC-R26-6 + AC-R26-7 |
| `correlational_not_causal: true` wire-format AC | AC-R26-8 |
| Sparse-topology degradation AC (LS-4) | AC-R26-9 |
| Anti-scope diff AC (TQ-4 γ; SHA-pinned to chore-A) | AC-R26-13 + AC-R26-16 (forward-protection) |
| Typecheck + test count ACs | AC-R26-14 + AC-R26-15 |

Plus supplementary (not strictly PRD-required but bound to spec-prescribed failure modes per R21 reinforcement):

- AC-R26-10 (evidence package presence; PRD § Architecturally novel surfaces #5)
- AC-R26-11 (singleton + unknown-shard guard; F2 + F4)
- AC-R26-12 (determinism + kind-filter; F-class for sort/filter logic)

### Constraints — sub-claims

PRD § Anti-scope constraints mapped to spec § 5.1 per-file rules:

- A12 / A5 (no detector-internal mods) → `engine/detectors/` UNCHANGED rule.
- A12 (no BFS body mods) → `engine/topology-overlay.ts` UNCHANGED rule.
- A13 (no ML) → rule-based + statistical only (BFS + count + kind filter).
- A16 (preserve correlational_not_causal: true) → spec § 1.2 emit + AC-R26-8 enforce.
- R20 freeze on verdict-groups.ts; R21 freeze on verdict-consumer.ts; R23 freeze on hardware-topology-source.ts + v9Y substrate; R18 freeze on v9X substrate — all enumerated in § 5.1.

### Concurrency — sub-claims

- Module is pure (no shared state, no async, no I/O).
- Multiple concurrent `attributeCommonMode` calls on independent inputs do not interfere.
- Multiple concurrent calls on the SAME snapshot return identical results (referential transparency).
- No race conditions possible.

### Corner cases — sub-claims

| Corner case | Behavior | Verified by |
|---|---|---|
| Single fired event (singleton) | Empty candidates (F2) | AC-R26-11(a) |
| Empty fired events | Empty candidates (F1) | AC-R26-2 |
| Unknown shard_node_id | Silently skipped (F4) | AC-R26-11(b) |
| Empty snapshot | Empty candidates (F5) | (sub-claim of AC-R26-9) |
| Rack-only snapshot | Only rack candidates (F6) | AC-R26-9 |
| max_hop = 0 | Empty candidates (F8 degenerate) | code review (self-exclusion + hop-0 only) |
| min_member_count = 0 | All shared nodes with ≥1 member become candidates | code review (filter is `< minMembers`; 0 admits all) |
| Self-loop edge in snapshot | BFS doesn't infinite loop (hops.has guard) | code review |
| Snapshot with duplicate edges (e.g., {from:a, to:b} twice) | Set-based adjacency deduplicates; no double-count | code review |
| Snapshot with duplicate nodes (same id twice) | kindById Map gets last wins (later override); adjacency Map gets last wins | code review; not an AC; trust caller to provide unique-id snapshots |

### Cost — sub-claims

- Time: O(|fired_events| × (|V| + |E|)) where V = nodes count, E = edges count. For v9Y (V=10, E=14, |fired_events| ≤ 4 in PR-F6 cells) this is sub-millisecond on any modern hardware.
- Memory: O(|V| + |E|) for adjacency + kindById; O(|fired_events| × max_hop_neighbors) for touchesByNode; O(|candidates|) for output. Bounded.
- No allocation pressure beyond Map / Set / Array primitives.

### Coupling — sub-claims

- Two engine imports (one type re-export, one value import). No circular dependency.
- No dependency on `engine/fleet/`, `engine/verdict-groups`, `engine/detectors/`, `engine/o0/`, `engine/l0/`.
- No external library dependency (no `crypto` direct import; uses inherited `computeSnapshotHash`).
- Output type `CommonModeCandidate` is consumed only by tests at R26; downstream consumers at WU-05 SLICE 3 close + Phase 2 close audit-emission path (out of scope here).

---

## 5. Architect pre-prediction on outcomes

| Outcome | Prediction | Confidence | If wrong |
|---|---|---|---|
| AC-R26-1 PR-F6 Cell 1 passes (PSU-0 candidate with members=[shard-0, shard-1]) | YES | HIGH | If FAIL — likely a `member_shard_ids` sort or `correlational_not_causal` field-omit bug; Implementer diagnostic. |
| AC-R26-2 PR-F6 Cell 2 (empty events → empty candidates) | YES | HIGH | If FAIL — empty-input branch missing; trivial fix. |
| AC-R26-3 PR-F6 Cell 3 (cross-rack singletons → empty) | YES | HIGH | If FAIL — min_member_count filter missing or wrong direction. |
| AC-R26-4 PR-F6 Cell 4 (mixed signal: psu-0 surfaces, psu-1 does not) | YES | HIGH | If FAIL — aggregation pre-filter logic edge case; specifically the singleton shard-3 not being grouped into any candidate. |
| AC-R26-5 BFS-undirected reachability (shard-a → psu-p ← shard-b, both reach psu-p) | YES | HIGH | If FAIL — adjacency build only added one direction; spec § 1.2 step 1 explicit. |
| AC-R26-6 Aggregation (exactly one psu candidate, not two per-shard) | YES | HIGH | If FAIL — implemented as list-per-event rather than Map-by-shared-node. |
| AC-R26-7 Cross-rack false positive guard at hop=1 | YES | HIGH | If FAIL — default max_hop misconfigured or transitive walk. |
| AC-R26-8 `correlational_not_causal: true` literal | YES | HIGH | If FAIL — field omitted from one or more candidates. |
| AC-R26-9 Sparse-topology degradation | YES | HIGH | If FAIL — module throws on missing PSU; or surfaces candidates referencing absent nodes. |
| AC-R26-10 Evidence package present with 7 required fields × ≥3 citations | YES | HIGH (Architect authors verbatim per § 3.3) | If FAIL — file not committed, or Implementer modifies the structure. |
| AC-R26-11 Singleton + unknown-shard graceful | YES | HIGH | If FAIL — F2 or F4 logic missing. |
| AC-R26-12 Determinism + kind filter | YES | HIGH | If FAIL — sort order incorrect or candidate_node_kinds opt ignored. |
| AC-R26-13 Anti-scope diff ⊆ 7-path allowed-set | YES | HIGH | If FAIL — Implementer modified an out-of-scope file; Reviewer escalates. |
| AC-R26-14 Typecheck exit 0 | YES | HIGH | If FAIL — type error in new module; trivial fix. |
| AC-R26-15 Test count = baseline + 12 | YES | HIGH (mod baseline measurement) | If FAIL — some pre-existing test broke or baseline was wrong. |
| AC-R26-16 Chore-B forward-protection | YES | HIGH | If FAIL — Implementer regresses post-chore-A. |
| **PR-F6 hybrid Reviewer at WU-05 SLICE 3 close** | URLs cold-verified; quotes confirmed | MEDIUM | If FAIL — operator-mediated escalation; replace citations as needed. |
| **TDD audit-trail (R23 MINOR-1 carry-forward)** | Implementer ships a separate RED commit before any production code | HIGH (R23 reinforcement now in CLAUDE-IMPLEMENTER.md) | If FAIL — Reviewer audits via `git log <architect-routing>..<chore-A>` and surfaces. |
| **Reviewer findings at R26 close** | 0 CRITICAL / 0 MAJOR / ≤ 2 MINOR / ≤ 3 OBS | MEDIUM (mod cold-eye discovery) | If higher severity — Architect-attributable findings would name spec ambiguity in this audit sidecar. |

### 5.1 Streak predictions

- 0-CRITICAL streak (currently 22 rounds R02–R23) → extends to 23 if AC-R26 close is MERGE-READY.
- RED→GREEN TDD streak (broken at R23; structurally distinct at R22; 16 consecutive R04–R21) → can restart at R26 with the R23 reinforcement applied (separate RED commit before production code).
- Reviewer cold-review-boundary streak (currently 21 rounds R02–R23) → extends to 22 at R26 close.
- Reviewer pre-emit grilling streak (currently 22 rounds R02–R23) → extends to 23.
- Right-reasons audit streak (currently 16 rounds R08–R23) → extends to 17.

---

## 6. Amendments from prior version

This is the v1.0 of Q-R26-SPEC. No prior version. No amendments.

---

## 7. Decision rationale (one paragraph per major choice)

- **Why a new subdirectory `engine/topology/` rather than placing the module at `engine/common-mode-attribution.ts`?** Per PRD § File location explicit prescription. The subdirectory anticipates SLICE 4 / WU-06 additions (event-conditional attribution) — keeping topology-related Tessera-original modules co-located. R23's `engine/hardware-topology-source.ts` predates this subdirectory convention; future re-organization is a separate operational concern.

- **Why a lean `FiredShardEvent` input type rather than `FusedVerdict[]`?** Decoupling. The attribution layer is logically downstream of any per-shard verdict shape; pinning to `FusedVerdict` would lock R26 to the vendored type and cause manifest drift at any future schema change. The lean type is also easier for tests to synthesize (no need to construct full FusedVerdict objects with all required fields).

- **Why max_hop_distance=1 default rather than 3 (inherited topology-overlay default)?** Different semantic. The inherited TopologyEnricher walks from a deploy_id-resolved node looking for *any* event in the neighborhood — hop=3 is appropriate for distant service correlation. The R26 attribution layer is looking for *shared hardware-substrate ancestors* — hop=1 captures direct shard→PSU/rack/cooling_zone adjacency. Higher hops would surface transitive correlations (rack-of-racks) which aren't load-bearing at this slice.

- **Why min_member_count=2 default?** "Common mode" semantically requires ≥2 shards. A singleton is a per-shard alarm — covered by other detection paths (Family A/C/D/E per-shard). The threshold could be tuned higher (e.g., 3) for noisier fleet states; left as 2 default for the conservative case.

- **Why `correlational_not_causal: true` as a literal type rather than a boolean?** Inherited convention from `engine/types/verdict.ts:289`. The literal type prevents any code path from setting the field to `false` (TypeScript catches at compile time). PRD § A16 mandates preservation; literal-type enforcement is stronger than runtime assertion.

- **Why architect-authored evidence package?** PRD § Architecturally novel surfaces #5 explicit: "cited at architect time." Shifting to Implementer-authored would weaken PR-F6 audit chain.

- **Why inline rack-only filter for AC-R26-9 rather than a new substrate file?** Lower operational overhead; test-locality; explicit derivation from v9Y (no semantic drift risk). The filter is small enough to keep in the test body.

- **Why two Architect commits?** R21 MINOR-1 reinforcement: spec artifacts committed BEFORE the routing block so the chore-A diff baseline window does not include them as untracked files. R23 applied this pattern; R26 follows.

---

_End of Q-R26-SPEC-AUDIT.md._
