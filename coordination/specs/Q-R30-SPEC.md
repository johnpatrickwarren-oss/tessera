# Q-R30-SPEC — Phase 2 SLICE 3.B WU-03: NVLink topology adapter + L0-contract D1 HIGH consumer

**Round:** R30 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster:** `wu-03-nvlink-adapter` (Wave 2 of WAVE-PLAN-02; parallel to `wu-01-slurm-adapter` + `wu-02-k8s-adapter`).
**Phase / SLICE:** Phase 2 SLICE 3.B — concrete `TopologySource` impl #2 + canonical L0-contract D1 HIGH consumer (R-E7 mitigation evidence).
**Scope reference:** `coordination/PRD.md` (cluster scope block — WU-03 section) + `coordination/CLUSTER-HANDOFF-1-WU00-WU03.md` (D1 HIGH dependency contract) + `coordination/WAVE-GATE-01.md` (§ Pre-flags to Wave 2 clusters) + `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) + § 4.2 R-E7 + § 2.3 L0-contract MR-1 amendment.
**PRD trace:** FR-E3b (cross-shard correlation: topology-aware spatial attribution) · US-02 (topology-aware common-mode failure attribution) · R-E7 mitigation (32-bit wraparound / missed-scrape / variable-interval / reset-vs-wrap).
**Baseline SHA (anti-scope diff lower bound):** `5bb427c` (R30 routing commit; HEAD at Architect session entry — verified via `git rev-parse HEAD`).
**Empirical baseline at session entry (verified by Architect via `node --test test/*.test.js`):** tests=243 / pass=241 / fail=2. Known fails: (a) `Q1 AC-7 — every vendored-at-pin file is byte-identical to source modulo header` — ENOENT on `../deploysignal/engine/detectors/_linalg.ts` (cluster-worktree DS-sibling unavailable per Wave-Gate-01 pre-flag); (b) `AC-R26-16: anti-scope forward-protection (chore-B)` — `git diff 9b78a19..HEAD --name-only` reports 25 paths beyond the R26 7-entry allowed-set because Wave-1 merge commits + Wave-2 routing chore + this cluster's routing chore all post-date R26's CHORE_A_SHA literal (`9b78a19`). Both fails are pre-existing cluster-worktree environmental inheritance, NOT introduced by this round's code.
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 2; diagnostics TS2688 (`@types/node` missing) and TS5107 (`moduleResolution=node10` deprecated). Pre-existing infra per Wave-Gate-01 pre-flag; NOT introduced by this round.

---

## § 0 Brainstorm phase (Superpowers — inline)

Three architectural axes have genuine multi-option choices. Each is brainstormed below with three distinct approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 Module decomposition (single class vs class + helper module vs three modules)

**Approach A — Single module `engine/topology/nvlink-source.ts` exporting parser function + `NvlinkTopologySource` class + `ingestNvlinkErrorCounter` helper (PICKED).** One Tessera-original file holds:
- `parseNvlinkStatus(rawText, opts) → { snapshot, partial }` (pure function).
- `class NvlinkTopologySource implements TopologySource` (thin wrapper analogous to `HardwareTopologySource` at `engine/hardware-topology-source.ts:26-44`).
- `ingestNvlinkErrorCounter(prev, next, opts) → RateSample` (thin wrapper around `transformPair` baking in `counter_width: 32`).

- **Strengths:** matches the R23 single-file precedent for `HardwareTopologySource`; cohesive — all NVLink-specific knowledge in one location; small surface (~3 exports + 4 types); PRD file-location prescription is a single primary module (`engine/topology/nvlink-source.ts`); test file imports one module.
- **Weaknesses:** mixes "topology parsing" and "counter ingestion" concerns. Acceptable — both are NVLink-specific adapter responsibilities; both consume Wave-1 frozen substrate (synthetic counter generator + TopologySource interface); separating across files would impose import-coupling without semantic benefit.
- **Hidden assumptions:** Wave-2 ingestion code path (production-side scraping loop) lives outside the adapter file — outside R30 scope. The R30 adapter exposes the *unit operations* (parse, ingest one counter pair) and tests exercise them; the production scrape loop wiring is downstream (and out-of-scope per PRD scope).
- **Risks:** low; matches R23 precedent.

**Approach B — Three modules: `nvlink-parser.ts` + `nvlink-source.ts` + `nvlink-counter-ingest.ts`.** Each concern in its own file.

- **Strengths:** separates parsing from class wrapping from L0 consumption.
- **Weaknesses:** three new files for ~100 LOC of code; over-decomposition for R30's scope; departs from R23 precedent (`HardwareTopologySource` is one file); inflates VENDORING-MANIFEST.md row count.
- **Risks:** medium; YAGNI violation (premature abstraction without a demand driver).

**Approach C — Two modules: parser + class in one file, ingestion helper in `engine/l0/`.** The L0-side helper lives in `engine/l0/nvlink-counter-ingest.ts` (alongside `counter-rate-transform.ts`).

- **Strengths:** L0-related code under `engine/l0/`.
- **Weaknesses:** the helper is NVLink-specific (bakes in counter_width=32 for NVLink error counters); placing it under `engine/l0/` would invite a future `engine/l0/dcgm-counter-ingest.ts`, `engine/l0/<other>-counter-ingest.ts`, polluting the L0 layer with adapter-specific glue. Better to keep adapter-specific glue under `engine/topology/<adapter>/` or `engine/topology/<adapter>-source.ts`.
- **Risks:** medium; layering smell.

**Selection rationale:** Approach A. Single file is the cleanest decomposition that matches the R23 precedent and the PRD's prescribed file location. Adapter-specific concerns (parsing + topology wrapping + L0 ingestion) live together; L0 layer (`engine/l0/counter-rate-transform.ts`) remains agnostic to which adapter calls it.

### § 0.2 Parser strategy (regex line-pattern vs state-machine vs structured-parser)

**Approach A — Regex line-pattern parser (PICKED).** Iterate input by line; classify each line via regex; collect GPU node + per-link peer edges. Simple, no dependency, ~20 LOC.

- **Strengths:** minimal; no parser library dependency; matches the ad-hoc text-output shape of `nvidia-smi nvlink --status` (which is human-readable, not structured); easy to make deterministic; easy to test against fixed fixtures.
- **Weaknesses:** brittle if NVIDIA changes the output format. Acceptable — Tessera vendors a frozen fixture format for Wave 1+2 scope; production resilience to NVIDIA-side format drift is a Phase 3+ concern (post-Tessera scope per WAVE-PLAN-02 v2 + § Project goal of Tessera).
- **Hidden assumptions:** input text is well-formed ASCII; line endings are `\n` (LF). Spec prescribes both fixture files use LF endings.
- **Risks:** low.

**Approach B — Hand-written state machine over tokens.** Lexer + parser layers.

- **Strengths:** extensible.
- **Weaknesses:** 5× the LOC for the same R30 scope; no extensibility demand within R30.
- **Risks:** medium; over-engineering.

**Approach C — Pull in a parser combinator library (e.g., `parsimmon`).**

- **Strengths:** declarative grammar.
- **Weaknesses:** new npm dependency — falls under PRD Tier verdict A1 (new dependency) and would force a halt-condition cycle for evaluation; A11 anti-scope explicitly excludes live NVIDIA endpoints but does NOT exclude parser libs; still, adds dependency weight to package.json + lockfile (which is out-of-allowed-set).
- **Risks:** high; spec scope expansion.

**Selection rationale:** Approach A. The regex line-pattern parser is appropriate for the ~10 line synthetic fixture format; matches the level of rigor at the WU-03 scope; avoids dependency expansion.

### § 0.3 Edge representation (one edge per raw link line vs undirected-deduped vs both)

**Approach A — Undirected-deduped, one canonical edge per peer pair (PICKED).** When GPU 0 has `Link 0: ... Peer GPU 1` and GPU 1 has `Link 0: ... Peer GPU 0`, emit one edge `{from: 'gpu-0', to: 'gpu-1', relationship: 'nvlink_peer'}` (using canonical `from = min(gpuA, gpuB)`, `to = max(gpuA, gpuB)`). Multi-link aggregation: if GPU 0 has Links 0/1/2 all peering with GPU 1, still emit ONE edge.

- **Strengths:** matches `engine/topology-overlay.ts:262-267` BFS which treats edges bidirectionally — undirected representation aligns with downstream consumption; no double-counting in BFS distance; canonical ordering enables deterministic `computeSnapshotHash` output without further sort work; multi-link aggregation reduces edge surface from O(links) to O(peer pairs).
- **Weaknesses:** loses per-link bandwidth info. Acceptable — R30 scope is topology + R-E7 mitigation; bandwidth per link is out-of-scope (no PRD AC binds it; no Wave-2 cluster consumer reads it).
- **Hidden assumptions:** `nvidia-smi nvlink --status` peer info is symmetric (if GPU A links to GPU B as peer, GPU B also links to GPU A as peer — true for NVLink fabric by construction); the parser dedups by canonical (min, max) ordering and aggregates duplicate pair occurrences.
- **Risks:** low.

**Approach B — One edge per raw link line (no dedup).** GPU 0 ↔ GPU 1 with 3 links → 6 edges (3 in each direction).

- **Strengths:** preserves link-count info implicitly.
- **Weaknesses:** BFS treats this as bidirectional anyway, so the dedup happens conceptually in the BFS; edge surface inflated; `computeSnapshotHash` would need to sort over a larger edge list; redundant data.
- **Risks:** medium; downstream BFS double-counts peer hops if dedup isn't applied somewhere.

**Approach C — Two directed edges per pair (both directions).** GPU 0 → GPU 1 + GPU 1 → GPU 0 (matches raw output but no within-pair multi-link aggregation).

- **Strengths:** preserves direction symbology.
- **Weaknesses:** TopologyEdge has `from` / `to` but the inherited BFS at `engine/topology-overlay.ts:265-267` treats both as bidirectional adjacency, so direction-preservation has no consumer; doubles edge count for no benefit.
- **Risks:** medium; same as Approach B.

**Selection rationale:** Approach A. Undirected-deduped representation is the minimum-edges form that preserves BFS-consumed semantics. Spec prescribes canonical ordering: `from = min(gpu-A, gpu-B)`, `to = max(...)`, via lexicographic comparison of node ids.

### § 0.4 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| Module decomp | A — single file | B (3 files), C (split across `engine/l0/`) | Matches R23 precedent; small surface; PRD file location |
| Parser strategy | A — regex line-pattern | B (state machine), C (parser combinator) | Minimum scope for synthetic fixture; no dependency |
| Edge representation | A — undirected-deduped canonical | B (raw per-link), C (two directed) | Matches BFS bidirectional consumption; deterministic hash |

No brainstormed option is structurally rejected by PRD/anti-scope; all three picks are independent.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Component | Status | Concern |
|---|---|---|
| `engine/topology/nvlink-source.ts` | NEW | Parser + TopologySource class + L0-ingestion helper |
| `test/q30-nvlink-adapter.test.ts` | NEW | AC bindings for R30 (parser ACs + R-E7 mitigation ACs + interface conformance + L0 default-fallback opportunistic close + anti-scope diff + binding-command attestation evidence) |
| `test/_substrate/nvlink-fixture-well-formed.txt` | NEW | Synthetic 4-GPU complete-NVLink-peer-mesh fixture |
| `test/_substrate/nvlink-fixture-sparse.txt` | NEW | Synthetic 2-GPU summary-only-no-peer-info fixture (graceful-degradation path) |
| `engine/topology-overlay.ts` | UNCHANGED | TopologySource interface + computeSnapshotHash free function (vendored-at-pin; read-only consumer) |
| `engine/types/verdict.ts` | UNCHANGED | TopologyNode.kind + TopologyEdge.relationship enums (R18 + R23 frozen extensions — consume only) |
| `engine/l0/counter-rate-transform.ts` | UNCHANGED | transformPair + CounterMetadata / CounterSample / RateSample / TransformOpts (Wave-1 frozen; consume only) |
| `test/_substrate/synthetic-counter-generator.ts` | UNCHANGED | makeWrap32Pair / makeMissedScrapePair / makeResetPair / makeVariableIntervalSequence (R25 frozen; import + consume only) |
| `engine/hardware-topology-source.ts` | UNCHANGED | R23 frozen; class signature consulted as the structural precedent for R30's class shape but not modified |

### § 1.2 Integration points (with PRD requirement verification)

| Integration point | Direction | PRD requirement | Verification |
|---|---|---|---|
| `NvlinkTopologySource` → `TopologySource` interface (`engine/topology-overlay.ts:50-55`) | Implementation conformance | PRD Part 1 #2 ("Implements `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)`") | AC-R30-5 + AC-R30-6 |
| `NvlinkTopologySource.snapshotHash` → `computeSnapshotHash` (`engine/topology-overlay.ts:69-78`) | Delegation | PRD Part 1 #2 ("Delegates hash to `computeSnapshotHash`") | AC-R30-6 |
| `parseNvlinkStatus` → `TopologyNode.kind = 'gpu_shard'` (R18 enum at `engine/types/verdict.ts:245`) | Type literal | PRD Part 1 AC bullet ("Node-kind literal: `'gpu_shard'` for GPUs per R18 enum") | AC-R30-2 |
| `parseNvlinkStatus` → `TopologyEdge.relationship = 'nvlink_peer'` (R23 enum at `engine/types/verdict.ts:255`) | Type literal | PRD Part 1 AC bullet ("Edge-relationship literal: `'nvlink_peer'` per R23 enum extension") | AC-R30-3 |
| `ingestNvlinkErrorCounter` → `transformPair` (`engine/l0/counter-rate-transform.ts:94-157`) | Function call with `counter_width: 32` baked in | PRD Part 2 #4 ("The adapter MUST call `transformPair()` with `meta = { semantic_type: 'counter', counter_width: 32 }`") | AC-R30-10..13 |
| `ingestNvlinkErrorCounter` ← `makeWrap32Pair` / `makeMissedScrapePair` / `makeResetPair` / `makeVariableIntervalSequence` (R25 frozen at `test/_substrate/synthetic-counter-generator.ts`) | Test-substrate import | PRD Part 2 #5 (each R-E7 mitigation AC consumes the corresponding factory) | AC-R30-10..13 |
| Direct `transformPair` call (no `counter_width`) — opportunistic R25 MINOR-2 close | Test-only direct invocation | PRD Part 2 #5 bullet (R25 MINOR-2 opportunistic close) | AC-R30-14 |
| Anti-scope file-set diff against round-start baseline | Runtime test | PRD Cross-cutting ("Anti-scope diff AC; SHA-pinned to chore-A") + WAVE-GATE-01 pre-flag (R22 IMPL MINOR-1 anchored to chore-A SHA) | AC-R30-18 |
| Binding-command attestation (`tsc` exit + `node --test` counts) at chore-A SHA | Attestation in NEXT-ROLE.md + AC-evidence | PRD Cross-cutting ("Typecheck + test count ACs; anchored to chore-A SHA explicitly; must encode actual `tsc` exit code and actual `node --test` pass/fail counts empirically") | AC-R30-16 + AC-R30-17 |

### § 1.3 Failure modes (each integration point)

| Integration point | Failure mode | Handling |
|---|---|---|
| Parser ← input text | Empty / no `GPU N:` lines | Throw `Error('NVLINK_PARSE_NO_GPU_BLOCKS')` — fail fast (AC-R30-8) |
| Parser ← input text | Well-formed but no `Peer GPU` lines | Emit nodes only, edges = []; `partial = true` (AC-R30-7) |
| Parser ← input text | Multiple raw links per peer pair | Dedup to single canonical edge per pair (AC-R30-4) |
| TopologySource | Constructor opts.id undefined | Fall back to `snapshot.source_id`; if undefined, fall back to default literal `'nvlink_topology_source'` (AC-R30-9) |
| TopologySource | Constructor opts.version undefined | Fall back to `snapshot.source_version`; if undefined, fall back to default literal `'nvlink-1'` (AC-R30-9 sibling subcase) |
| `ingestNvlinkErrorCounter` ← `makeWrap32Pair` | Wrap path correctly detects prev > 0.9 × UINT32_MAX | Returns `wraparound_handled: true` + corrected rate (AC-R30-10) |
| `ingestNvlinkErrorCounter` ← `makeMissedScrapePair` | Interval > 1.5 (default jitter) | Returns `slope_quality: 'degraded'` + `missed_scrape_inferred: true` (AC-R30-11) |
| `ingestNvlinkErrorCounter` ← `makeResetPair` | prev below wrap threshold; next < prev | Returns `reset_detected: true` + `value: null` (AC-R30-12) |
| `ingestNvlinkErrorCounter` ← `makeVariableIntervalSequence` | Variable intervals; clean increasing counter | Mean rate ≈ rate_per_second (tol 0.001); slopeNorm < 0.01 (AC-R30-13) |
| Direct `transformPair` (no width) ← `makeResetPair` | counter_width omitted | `width = undefined ?? 64` → `width === 32` false → reset arm → `reset_detected: true` + `value: null` (AC-R30-14) |
| Binding-command attestation | Actual `tsc` exit ≠ 0 (pre-existing infra) | Encode actual exit (= 2) in AC text + attestation; do NOT reframe as compliance (R26 MAJOR-1 reinforcement; WAVE-GATE-01 pre-flag) |
| Binding-command attestation | Actual `node --test` fail count ≠ 0 (pre-existing inheritance: q01 ENOENT + AC-R26-16 forward-protection) | Encode actual fail count empirically in AC text + attestation (R25 MAJOR-1 reinforcement; WAVE-GATE-01 pre-flag) |

### § 1.4 Architect pre-prediction (Outcome anchors)

For each AC range, the Architect records the predicted Implementer attestation output so Reviewer can compare predicted-vs-actual.

| AC range | Predicted outcome at chore-A |
|---|---|
| AC-R30-1..9 (parser + source) | All PASS; 9 tests; well-formed fixture produces 4 nodes + 6 edges; sparse fixture produces 2 nodes + 0 edges with `partial=true` |
| AC-R30-10..14 (R-E7 mitigation + opportunistic close) | All PASS; 5 tests; wraparound rate = (UINT32_MOD − 4_200_000_000 + 50) / 1 = 94_967_346; variable-interval mean ≈ 10 within 0.001 |
| AC-R30-15 (A16 preservation structural sanity) | PASS; verdict.ts retains `correlational_not_causal: true` literal |
| AC-R30-16 (typecheck attestation) | `npx tsc -p tsconfig.test.json` exits 2 with TS2688 + TS5107 (pre-existing) + ZERO new diagnostics from R30 files; ATTESTED IN NEXT-ROLE.md, not runtime-bound |
| AC-R30-17 (test count attestation) | `node --test test/*.test.js` reports tests=243+N / pass=241+N / fail=2 where N = 16 new R30 runtime tests (AC-R30-1..15 + AC-R30-18; AC-R30-16/17 are attestations, no `test()` block); ATTESTED IN NEXT-ROLE.md, not runtime-bound. Predicted: tests=259 / pass=257 / fail=2 |
| AC-R30-18 (anti-scope diff runtime test at chore-B) | PASS; round-start-to-chore-A diff is exactly the 8-entry allowed-set (or 9 if HALT-DIAGNOSTIC fires) |

### § 1.5 Per-link bandwidth + status (deferred from edge representation)

The `nvidia-smi nvlink --status` output includes per-link bandwidth (e.g., `25.000 GB/s`) and status (`Active` / `Inactive`). R30 does NOT propagate these into TopologyEdge — out-of-scope (no PRD AC binds; no Wave-2 cluster consumer reads). If a future round needs them, edge `metadata` (optional `Record<string, string>` at `engine/types/verdict.ts:256`) is the natural carrier.

---

## § 2 Mechanism

The NVLink topology adapter is a Tessera-original concrete `TopologySource` impl that parses `nvidia-smi nvlink --status` text output into a `TopologySnapshot` of `gpu_shard` nodes + `nvlink_peer` edges, plus a thin L0-ingestion helper that wraps `transformPair` with NVLink-specific `counter_width: 32`.

### § 2.1 Parser (`parseNvlinkStatus`)

Pure function. Input: raw text (`nvidia-smi nvlink --status` stdout). Output: `{ snapshot: TopologySnapshot, partial: boolean }`.

Iteration: split input by `\n`; for each line:
- Match `/^GPU\s+(\d+):/` → start a new "current GPU" with id `gpu-${match[1]}`; emit one node `{id: gpu-${id}, service_name: gpu-${id}, kind: 'gpu_shard'}`.
- Match `/^\s*Link\s+\d+:.*?Peer\s+GPU\s+(\d+)/i` → if a current GPU exists, emit a raw edge `(current_gpu_id, gpu-${match[1]})`; otherwise ignore (orphan line).
- Otherwise ignore.

Edge dedup (post-iteration): for each raw edge `(a, b)`, normalize to `(min(a, b), max(a, b))` (lex comparison of `gpu-NN` ids works because all peers are `gpu-N` form and the comparator is lexicographic; the spec relies on the convention that all GPU ids are zero-padded uniformly — see § 4.1 for the implementation-level guarantee). Insert into `Set<string>` keyed by `${from}|${to}` for dedup. Emit one canonical `TopologyEdge {from, to, relationship: 'nvlink_peer'}` per unique pair.

`partial` flag: `true` iff at least one `GPU N:` block was parsed AND zero edges resulted from peer-line scanning; `false` otherwise.

Failure: if zero `GPU N:` blocks parsed, throw `Error('NVLINK_PARSE_NO_GPU_BLOCKS')`.

Output `TopologySnapshot`:
- `nodes`: emitted in order of first encounter (sort happens at `computeSnapshotHash` time per `engine/topology-overlay.ts:70-71`).
- `edges`: emitted in canonical `(min, max)` ordering (sort happens at hash time anyway; canonical-form-at-emit produces stable test output without test-side sorting).
- `fetched_at_ts`: `opts.fetched_at_ts ?? Math.floor(Date.now() / 1000)`.
- `source_id`: `opts.source_id ?? 'nvlink_topology_source'`.
- `source_version`: `opts.source_version ?? 'nvlink-1'`.

### § 2.2 TopologySource class (`NvlinkTopologySource`)

Class implementing `TopologySource` interface (`engine/topology-overlay.ts:50-55`). Structurally parallel to `HardwareTopologySource` (`engine/hardware-topology-source.ts:26-44`).

Constructor:
- Input: `rawText: string, opts?: { id?: string; version?: string; fetched_at_ts?: number; source_id?: string; source_version?: string }`.
- Calls `parseNvlinkStatus(rawText, opts)` to compute `this.snapshot`.
- `this.id`: `opts.id ?? snapshot.source_id ?? 'nvlink_topology_source'`.
- `this.version`: `opts.version ?? snapshot.source_version ?? 'nvlink-1'`.

Methods:
- `fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot>` → returns `this.snapshot`.
- `snapshotHash(snapshot: TopologySnapshot): string` → delegates to `computeSnapshotHash(snapshot)`.

Notes:
- `partial` flag is NOT exposed on the class — it's a parser-only artifact. Callers who care about partial topology can call `parseNvlinkStatus` directly and inspect the flag, OR inspect the snapshot's edge count (zero edges with non-empty nodes ⇒ partial).
- Constructor does NOT swallow parser errors. If `parseNvlinkStatus` throws, the constructor propagates the throw. PRD halt-condition coverage: "Sparse/partial NVLink topology graceful handling" means the parser handles the "no peer info" case gracefully (emit nodes only, set `partial: true`); it does NOT mean every input shape produces a snapshot. Truly malformed input (no `GPU N:` blocks) is an exception.

### § 2.3 L0-ingestion helper (`ingestNvlinkErrorCounter`)

Pure function. Input: `(prev: CounterSample, next: CounterSample, opts: TransformOpts) → RateSample`.

Body: returns `transformPair(prev, next, { semantic_type: 'counter', counter_width: 32 }, opts)`.

Rationale: NVLink error counters are 32-bit (per SCOPING-MEMO § 2.3 invariant 4 + CLUSTER-HANDOFF-1-WU00-WU03.md). Baking `counter_width: 32` into the helper ensures every NVLink error-counter call invokes the wraparound path correctly. Downstream Wave-2 production scrape loop (out-of-scope for R30) wires this helper into the per-counter ingestion path; the helper's signature matches what such a loop needs.

### § 2.4 Six invariants from L0 contract — consumed by `ingestNvlinkErrorCounter`

The L0 contract's six invariants (per `coordination/CLUSTER-HANDOFF-1-WU00-WU03.md` § "Behavioral guarantees") are consumed by `ingestNvlinkErrorCounter` via the underlying `transformPair`. Adapter tests verify each at the wire boundary:

| Invariant | Consumed by | AC |
|---|---|---|
| 1 — Rate-domain for counters | `ingestNvlinkErrorCounter` (counter_width=32 baked) | AC-R30-10 (wrap rate), AC-R30-13 (clean variable-interval rate) |
| 2 — `actual_elapsed_seconds` first-class | every `RateSample` returned from `ingestNvlinkErrorCounter` | AC-R30-10..13 (implicitly via `out.actual_elapsed_seconds` field reads) |
| 3 — Missed-scrape detection | `ingestNvlinkErrorCounter` ← `makeMissedScrapePair` | AC-R30-11 |
| 4 — 32-bit wraparound | `ingestNvlinkErrorCounter` ← `makeWrap32Pair` (counter_width=32) | AC-R30-10 |
| 5 — Reset-vs-wrap disambiguation | `ingestNvlinkErrorCounter` ← `makeResetPair` (counter_width=32; prev below threshold) | AC-R30-12 |
| 6 — Metadata propagation (4 flags on every RateSample) | every output | AC-R30-10..13 implicitly via field reads; not separately bound (this invariant is bound at q25 layer per AC-R25-7) |

---

## § 3 Anti-scope (allowed-set for round-start-to-chore-A diff)

`git diff 5bb427c..chore-A-SHA --name-only` must produce a subset of:

```
engine/topology/nvlink-source.ts
test/q30-nvlink-adapter.test.ts
test/_substrate/nvlink-fixture-well-formed.txt
test/_substrate/nvlink-fixture-sparse.txt
coordination/specs/Q-R30-SPEC.md
coordination/specs/Q-R30-SPEC-AUDIT.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

**8 entries.** Verified git-trackable via `git ls-files` per R23 ARCH MINOR-2 reinforcement: of these 8, the first 6 are NEW files (will exist post-Implementer commit; not yet tracked at spec emit) and the last 2 are MOD-only (already tracked).

**Conditional 9th entry** (per R25 MAJOR-2 reinforcement at CLAUDE-COMMON.md REINFORCED 2026-05-18 — HALT-fire scenarios commit DIAGNOSTIC BEFORE chore-A; therefore the DIAGNOSTIC path enters the chore-A diff range):

```
coordination/diagnostics/DIAGNOSTIC-R30-*.md
```

If any halt condition fires mid-round and produces a `coordination/diagnostics/DIAGNOSTIC-R30-<topic>.md`, the test's `ALLOWED_SET` literal must include the specific DIAGNOSTIC path as its 9th entry. The Implementer adds the literal to the test only if a HALT fires; if no HALT fires, the test ships with 8 entries.

**A12 / A10 / A11 / A16 anti-scope inheritance** (PRD):
- A12: NO modification of inherited vendored-at-pin engine internals (engine/topology-overlay.ts, engine/core.ts, engine/types/verdict.ts beyond R18+R23 enums already landed, engine/l0/schema-continuity.ts, engine/l0/counter-rate-transform.ts (R25 frozen — consume only), engine/hardware-topology-source.ts (R23 frozen — consult only), engine/topology/common-mode-attribution.ts (R26 frozen)).
- A10: NO hardware diagnosis (adapter ingests counters + topology; does NOT diagnose per-GPU SDC).
- A11: NO live NVIDIA endpoints (synthetic fixtures only).
- A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` literal preserved).
- NO modification of `test/_substrate/synthetic-counter-generator.ts` (R25 frozen).
- NO modification of `test/_substrate/v9X-cluster.ts` or `test/_substrate/v9Y-multi-rack-cluster.ts` (R18 + R23 frozen).
- NO modification of any pre-R30 test file (q01..q26 + betting-e-process frozen).
- NO modification of `coordination/VENDORING-MANIFEST.md` (R30 adds Tessera-original files only; manifest tracks DeploySignal vendored files).

---

## § 4 Per-file pseudocode

### § 4.1 `engine/topology/nvlink-source.ts` (NEW; Tessera-original)

```typescript
// engine/topology/nvlink-source.ts — Phase 2 SLICE 3.B WU-03 NVLink topology adapter (R30).
//
// Three exports:
//   1. parseNvlinkStatus(rawText, opts) — pure regex-based parser for
//      `nvidia-smi nvlink --status` text output. Produces a TopologySnapshot
//      with `gpu_shard` nodes (per R18 enum) and `nvlink_peer` edges (per R23
//      enum). Edges are undirected-deduped: one canonical edge per peer pair
//      with from = min(gpu-A, gpu-B) (lex order on the `gpu-N` id form).
//      Multi-link aggregation: if GPU 0 has multiple Link entries to GPU 1,
//      one canonical edge is emitted (not one per link). Sparse handling:
//      input with GPU blocks but no `Peer GPU` lines → nodes only, edges = [],
//      partial = true. Empty / no `GPU N:` blocks → throws
//      `NVLINK_PARSE_NO_GPU_BLOCKS`.
//   2. NvlinkTopologySource — thin TopologySource impl wrapping the parser.
//      Structurally parallel to HardwareTopologySource (R23).
//      snapshotHash delegates to computeSnapshotHash per Addition #26 D6.
//   3. ingestNvlinkErrorCounter — thin wrapper around transformPair baking
//      in NVLink-specific counter_width: 32. Adapter glue for L0-contract
//      consumption per CLUSTER-HANDOFF-1-WU00-WU03.md.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from '../topology-overlay';
import {
  transformPair,
  type CounterMetadata,
  type CounterSample,
  type RateSample,
  type TransformOpts,
} from '../l0/counter-rate-transform';

export interface NvlinkParseOpts {
  /** Epoch-seconds timestamp for the produced snapshot. Defaults to current wall clock. */
  fetched_at_ts?: number;
  /** Source-id literal for the produced snapshot. Defaults to 'nvlink_topology_source'. */
  source_id?: string;
  /** Source-version literal for the produced snapshot. Defaults to 'nvlink-1'. */
  source_version?: string;
}

export interface NvlinkParseResult {
  snapshot: TopologySnapshot;
  /** true iff GPU blocks were parsed but no Peer-GPU lines yielded edges. */
  partial: boolean;
}

const GPU_HEADER_RE = /^GPU\s+(\d+):/;
const LINK_PEER_RE  = /^\s*Link\s+\d+:.*?Peer\s+GPU\s+(\d+)/i;

export function parseNvlinkStatus(rawText: string, opts: NvlinkParseOpts = {}): NvlinkParseResult {
  const nodes: TopologyNode[] = [];
  const nodeIds: Set<string> = new Set();
  const rawEdgePairs: Array<[string, string]> = [];
  let currentGpuId: string | null = null;

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine; // do NOT trim — header pattern relies on leading-anchored regex
    const gpuMatch = GPU_HEADER_RE.exec(line);
    if (gpuMatch) {
      const id = `gpu-${gpuMatch[1]}`;
      currentGpuId = id;
      if (!nodeIds.has(id)) {
        nodes.push({ id, service_name: id, kind: 'gpu_shard' });
        nodeIds.add(id);
      }
      continue;
    }
    const linkMatch = LINK_PEER_RE.exec(line);
    if (linkMatch && currentGpuId !== null) {
      const peerId = `gpu-${linkMatch[1]}`;
      rawEdgePairs.push([currentGpuId, peerId]);
      // peer GPU may not yet have its own GPU N: header parsed — emit its node opportunistically
      if (!nodeIds.has(peerId)) {
        nodes.push({ id: peerId, service_name: peerId, kind: 'gpu_shard' });
        nodeIds.add(peerId);
      }
      continue;
    }
  }

  if (nodes.length === 0) {
    throw new Error('NVLINK_PARSE_NO_GPU_BLOCKS');
  }

  const edgeKeys = new Set<string>();
  const edges: TopologyEdge[] = [];
  for (const [a, b] of rawEdgePairs) {
    if (a === b) continue; // ignore self-peer (shouldn't occur but defend)
    const from = a < b ? a : b;
    const to   = a < b ? b : a;
    const key  = `${from}|${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ from, to, relationship: 'nvlink_peer' });
  }

  const partial = edges.length === 0;

  const snapshot: TopologySnapshot = {
    nodes,
    edges,
    fetched_at_ts: opts.fetched_at_ts ?? Math.floor(Date.now() / 1000),
    source_id:     opts.source_id     ?? 'nvlink_topology_source',
    source_version: opts.source_version ?? 'nvlink-1',
  };

  return { snapshot, partial };
}

export class NvlinkTopologySource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(rawText: string, opts: {
    id?: string;
    version?: string;
    fetched_at_ts?: number;
    source_id?: string;
    source_version?: string;
  } = {}) {
    const { snapshot } = parseNvlinkStatus(rawText, {
      fetched_at_ts: opts.fetched_at_ts,
      source_id: opts.source_id,
      source_version: opts.source_version,
    });
    this.snapshot = snapshot;
    this.id      = opts.id      ?? snapshot.source_id     ?? 'nvlink_topology_source';
    this.version = opts.version ?? snapshot.source_version ?? 'nvlink-1';
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}

export function ingestNvlinkErrorCounter(
  prev: CounterSample,
  next: CounterSample,
  opts: TransformOpts,
): RateSample {
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 32 };
  return transformPair(prev, next, meta, opts);
}
```

**Implementation notes (Implementer guidance, not deferred decisions):**
- Use lex comparison `a < b` (string compare) on `gpu-N` ids for canonical ordering. Spec-prescribed: all GPU ids are `gpu-${digits}` form; the `digits` are emitted verbatim from the regex match. For single-digit GPU counts (0-9), lex order matches numeric order. For double-digit (0-99), `gpu-1` < `gpu-10` lexically but `1 < 10` numerically — different orderings. The R30 synthetic fixtures use single-digit IDs (0-3); the canonical-ordering test (AC-R30-4) exercises 4-GPU fixture. If a future Wave-3+ fixture uses ≥10 GPUs, the test will need adjustment OR the parser will need zero-padding. Tracked as forward-flag, not OQ.
- The `if (a === b) continue` self-peer guard is a defensive check; `nvidia-smi nvlink --status` should never emit a self-peer line on real hardware, but the guard avoids creating malformed edges if a future fixture or real output does. Branch-binding: not exercised by R30 ACs; documented as defensive code.

### § 4.2 `test/_substrate/nvlink-fixture-well-formed.txt` (NEW; Tessera-original)

ASCII text file, LF line endings, no trailing whitespace. Content:

```
GPU 0: NVIDIA A100-SXM4-80GB (UUID: GPU-aaaa)
	 Link 0: 25.000 GB/s  Peer GPU 1
	 Link 1: 25.000 GB/s  Peer GPU 2
	 Link 2: 25.000 GB/s  Peer GPU 3
GPU 1: NVIDIA A100-SXM4-80GB (UUID: GPU-bbbb)
	 Link 0: 25.000 GB/s  Peer GPU 0
	 Link 1: 25.000 GB/s  Peer GPU 2
	 Link 2: 25.000 GB/s  Peer GPU 3
GPU 2: NVIDIA A100-SXM4-80GB (UUID: GPU-cccc)
	 Link 0: 25.000 GB/s  Peer GPU 0
	 Link 1: 25.000 GB/s  Peer GPU 1
	 Link 2: 25.000 GB/s  Peer GPU 3
GPU 3: NVIDIA A100-SXM4-80GB (UUID: GPU-dddd)
	 Link 0: 25.000 GB/s  Peer GPU 0
	 Link 1: 25.000 GB/s  Peer GPU 1
	 Link 2: 25.000 GB/s  Peer GPU 2
```

Expected parse: 4 nodes (gpu-0, gpu-1, gpu-2, gpu-3 — all kind `gpu_shard`); 6 undirected-deduped edges (every unordered pair {i, j} for 0 ≤ i < j ≤ 3); partial=false.

### § 4.3 `test/_substrate/nvlink-fixture-sparse.txt` (NEW; Tessera-original)

ASCII text file, LF line endings, no trailing whitespace. Content (no `Peer GPU` lines, only summary):

```
GPU 0: NVIDIA A100-SXM4-80GB (UUID: GPU-eeee)
	 Link 0: 25.000 GB/s  Active
	 Link 1: 25.000 GB/s  Active
GPU 1: NVIDIA A100-SXM4-80GB (UUID: GPU-ffff)
	 Link 0: 25.000 GB/s  Active
	 Link 1: 25.000 GB/s  Active
```

Expected parse: 2 nodes (gpu-0, gpu-1); 0 edges; partial=true.

### § 4.4 `test/q30-nvlink-adapter.test.ts` (NEW; Tessera-original)

```typescript
// test/q30-nvlink-adapter.test.ts — Phase 2 SLICE 3.B WU-03 bindings (R30).
//
// Binds AC-R30-1 through AC-R30-15 (runtime) per Q-R30-SPEC.md § 5.
// AC-R30-16 (typecheck) and AC-R30-17 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
// AC-R30-18 (anti-scope diff) is a runtime test added at chore-B with the
// chore-A SHA substituted into the diff baseline literal.
//
// Covers: nvidia-smi nvlink --status parser (4-GPU mesh + sparse); node kind
// = 'gpu_shard' (R18 enum); edge relationship = 'nvlink_peer' (R23 enum);
// undirected-deduped canonical ordering; NvlinkTopologySource interface
// conformance; snapshotHash delegation; id/version fallback chain; sparse-
// partial detection; throw on no-GPU-blocks input; ingestNvlinkErrorCounter
// R-E7 mitigation suite (wrap/missed-scrape/reset/variable-interval) using
// synthetic counter generator (R25 frozen); R25 MINOR-2 opportunistic close
// (direct transformPair call with omitted counter_width); A16 verdict.ts
// literal preservation; anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseNvlinkStatus,
  NvlinkTopologySource,
  ingestNvlinkErrorCounter,
} from '../engine/topology/nvlink-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import {
  transformPair,
  UINT32_MOD,
  type CounterMetadata,
} from '../engine/l0/counter-rate-transform';
import {
  makeWrap32Pair,
  makeMissedScrapePair,
  makeResetPair,
  makeVariableIntervalSequence,
} from './_substrate/synthetic-counter-generator';
import { TrendBuffer } from '../engine/core';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

const WELL_FORMED = readFileSync('test/_substrate/nvlink-fixture-well-formed.txt', 'utf8');
const SPARSE      = readFileSync('test/_substrate/nvlink-fixture-sparse.txt',      'utf8');

// AC-R30-1: well-formed fixture parses to 4 gpu_shard nodes + 6 nvlink_peer edges
test('AC-R30-1: parseNvlinkStatus on well-formed fixture produces 4 nodes + 6 edges', () => {
  const { snapshot, partial } = parseNvlinkStatus(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 4);
  assert.strictEqual(snapshot.edges.length, 6);
  assert.strictEqual(partial, false);
});

// AC-R30-2: every parsed node has kind === 'gpu_shard' (R18 enum binding)
test("AC-R30-2: every node from parser has kind === 'gpu_shard'", () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'gpu_shard');
  }
});

// AC-R30-3: every parsed edge has relationship === 'nvlink_peer' (R23 enum binding)
test("AC-R30-3: every edge from parser has relationship === 'nvlink_peer'", () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'nvlink_peer');
  }
});

// AC-R30-4: edges are undirected-deduped with from < to lex order; multi-link aggregation
test('AC-R30-4: edges are canonical undirected-deduped (from < to); multi-link aggregation', () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  // (c) expected pair set: {0,1},{0,2},{0,3},{1,2},{1,3},{2,3}
  const expected = new Set(['gpu-0|gpu-1', 'gpu-0|gpu-2', 'gpu-0|gpu-3', 'gpu-1|gpu-2', 'gpu-1|gpu-3', 'gpu-2|gpu-3']);
  assert.deepStrictEqual(new Set(keys), expected);
});

// AC-R30-5: NvlinkTopologySource implements TopologySource interface
test('AC-R30-5: NvlinkTopologySource implements TopologySource', async () => {
  const src = new NvlinkTopologySource(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(typeof src.id, 'string');
  assert.strictEqual(typeof src.version, 'string');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);
});

// AC-R30-6: snapshotHash delegates to computeSnapshotHash (matches free-function output)
test('AC-R30-6: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new NvlinkTopologySource(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R30-7: sparse fixture produces nodes only, 0 edges, partial=true
test('AC-R30-7: sparse fixture (no peer info) → nodes only, 0 edges, partial=true', () => {
  const { snapshot, partial } = parseNvlinkStatus(SPARSE);
  assert.strictEqual(snapshot.nodes.length, 2);
  assert.strictEqual(snapshot.edges.length, 0);
  assert.strictEqual(partial, true);
});

// AC-R30-8: empty / malformed input (no GPU blocks) throws NVLINK_PARSE_NO_GPU_BLOCKS
test('AC-R30-8: empty / no-GPU-blocks input throws NVLINK_PARSE_NO_GPU_BLOCKS', () => {
  assert.throws(() => parseNvlinkStatus(''),    /NVLINK_PARSE_NO_GPU_BLOCKS/);
  assert.throws(() => parseNvlinkStatus('garbage with no GPU header\nanother line\n'), /NVLINK_PARSE_NO_GPU_BLOCKS/);
});

// AC-R30-9: id/version fallback chains — each sub-case binds one branch
test('AC-R30-9: NvlinkTopologySource id/version fallback chain', () => {
  // (a) opts.id and opts.version take priority over source_id / source_version
  const a = new NvlinkTopologySource(WELL_FORMED, { id: 'explicit-id', version: 'explicit-ver', source_id: 'src-id', source_version: 'src-ver' });
  assert.strictEqual(a.id, 'explicit-id');
  assert.strictEqual(a.version, 'explicit-ver');
  // (b) opts.id / opts.version undefined → falls back to source_id / source_version
  const b = new NvlinkTopologySource(WELL_FORMED, { source_id: 'src-id-b', source_version: 'src-ver-b' });
  assert.strictEqual(b.id, 'src-id-b');
  assert.strictEqual(b.version, 'src-ver-b');
  // (c) opts.id / opts.version undefined AND source_id / source_version undefined → defaults
  const c = new NvlinkTopologySource(WELL_FORMED, {});
  assert.strictEqual(c.id, 'nvlink_topology_source');
  assert.strictEqual(c.version, 'nvlink-1');
});

// AC-R30-10: ingestNvlinkErrorCounter on makeWrap32Pair → wraparound_handled=true + corrected rate
test('AC-R30-10: ingestNvlinkErrorCounter on makeWrap32Pair fires the wraparound path', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, true);
  assert.strictEqual(out.reset_detected, false);
  const expected_rate = (UINT32_MOD - 4_200_000_000 + 50) / 1.0;
  assert.strictEqual(out.value, expected_rate);
});

// AC-R30-11: ingestNvlinkErrorCounter on makeMissedScrapePair → degraded + missed_scrape_inferred
test('AC-R30-11: ingestNvlinkErrorCounter on makeMissedScrapePair flags degraded + missed_scrape_inferred', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.slope_quality, 'degraded');
  assert.strictEqual(out.missed_scrape_inferred, true);
  assert.strictEqual(out.actual_elapsed_seconds, 2.0);
});

// AC-R30-12: ingestNvlinkErrorCounter on makeResetPair → reset_detected=true + value=null
test('AC-R30-12: ingestNvlinkErrorCounter on makeResetPair (counter_width=32 baked) → reset_detected', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.value, null);
});

// AC-R30-13: ingestNvlinkErrorCounter on makeVariableIntervalSequence integrates with TrendBuffer
test('AC-R30-13: variable-interval ingestion produces comparable per-second rates via TrendBuffer', () => {
  const samples = makeVariableIntervalSequence({
    intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0],
    rate_per_second: 10,
  });
  const tb = new TrendBuffer(20);
  for (let i = 1; i < samples.length; i++) {
    const out = ingestNvlinkErrorCounter(samples[i - 1], samples[i], { expected_scrape_interval_seconds: 1.0 });
    assert.strictEqual(out.slope_quality, 'normal', `pair ${i}: not degraded`);
    assert.notStrictEqual(out.value, null);
    tb.push('nvlink_test_signal', out.value!);
  }
  const snap = tb.get('nvlink_test_signal');
  // Tolerances per § 1.8 R25 disposition (Option A): 0.001 / 0.01. NOT 1e-9 (empirically infeasible per R25 MAJOR-3).
  assert.ok(Math.abs(snap.mean - 10) < 0.001, `mean=${snap.mean} expected ≈10 (tol 0.001)`);
  assert.ok(Math.abs(snap.slopeNorm) < 0.01,  `slopeNorm=${snap.slopeNorm} expected near zero (tol 0.01)`);
});

// AC-R30-14: R25 MINOR-2 opportunistic close — transformPair with counter_width omitted
// Calls transformPair directly (NOT through ingestNvlinkErrorCounter which bakes counter_width=32)
// to exercise the `width = meta.counter_width ?? 64` default fallback at counter-rate-transform.ts:119.
// With prev > next AND prev below wrap threshold, the reset arm fires regardless of width — this
// AC is a coverage-AC for the omitted-counter_width input shape (the `?? 64` default produces
// width=64; mutation-removing the `?? 64` produces width=undefined; behavioral outcome on the
// reset arm is identical because the wrap branch requires `width === 32`). The AC closes the
// R25 MINOR-2 coverage gap (input shape exercised) but does not mutation-kill the `?? 64`
// expression — see § 7 OQ for the structural-limitation discussion.
test('AC-R30-14: transformPair with counter_width omitted routes makeResetPair to reset arm via default-64', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  const metaNoWidth: CounterMetadata = { semantic_type: 'counter' }; // counter_width OMITTED
  const out = transformPair(prev, next, metaNoWidth, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.value, null);
});

// AC-R30-15: A16 — engine/types/verdict.ts retains `correlational_not_causal: true` literal
test('AC-R30-15: A16 preservation — verdict.ts retains correlational_not_causal: true literal', () => {
  const verdict = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(verdict.includes('correlational_not_causal: true'),
    'verdict.ts retains correlational_not_causal: true literal per Addition #26 D4');
});

// AC-R30-18: anti-scope diff at chore-A SHA ⊆ allowed-set
// Chore-A SHA literal committed by Implementer at chore-B. If a HALT fires mid-round and
// produces coordination/diagnostics/DIAGNOSTIC-R30-<topic>.md, the Implementer adds the specific
// DIAGNOSTIC path as a 9th allowed-set entry per spec § 3 conditional clause.
test('AC-R30-18: round-start-to-chore-A diff path-set ⊆ R30 allowed-set', () => {
  const BASELINE_SHA = '5bb427c';     // R30 routing commit (round-start)
  const CHORE_A_SHA  = '<INJECTED-AT-CHORE-B>';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/nvlink-source.ts',
    'test/q30-nvlink-adapter.test.ts',
    'test/_substrate/nvlink-fixture-well-formed.txt',
    'test/_substrate/nvlink-fixture-sparse.txt',
    'coordination/specs/Q-R30-SPEC.md',
    'coordination/specs/Q-R30-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 9th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R30 path in chore-A diff: ${p}`);
  }
});
```

**Implementer notes:**
- AC-R30-16 and AC-R30-17 are NOT runtime tests; they are binding-command attestations. The Implementer reports them in NEXT-ROLE.md at chore-A:
  - AC-R30-16 attestation: `npx tsc -p tsconfig.test.json`; record exit code + diagnostic lines verbatim; assert NO new diagnostics referencing `engine/topology/nvlink-source.ts` or `test/q30-nvlink-adapter.test.ts`.
  - AC-R30-17 attestation: `node --test test/*.test.js`; record `tests=N / pass=P / fail=F` verbatim. Expected: tests=259 / pass=257 / fail=2 (baseline 243/241/2 + 16 new R30 runtime tests; AC-R30-16/17 are attestation-only).
- The CHORE_A_SHA placeholder `<INJECTED-AT-CHORE-B>` is substituted with the actual SHA after chore-A is committed; AC-R30-18 is appended in a chore-B commit (or amended into chore-A as the file's final pre-route line) per the R23 / R25 / R26 precedent.

---

## § 5 Acceptance criteria

**Preamble — Attestation classification:**
- **Runtime ACs:** AC-R30-1 through AC-R30-15 + AC-R30-18 (16 runtime tests in `test/q30-nvlink-adapter.test.ts`).
- **Binding-command attestation ACs (reported in NEXT-ROLE.md at chore-A, NOT runtime-bound):** AC-R30-16 (typecheck), AC-R30-17 (test count).
- **Total ACs:** 18.

Verified per R20 ARCH MINOR-1 reinforcement (AC-table preamble cross-check): each preamble classification claim matches § 4 prescription — AC-R30-16/17 are described as binding-command attestations and § 4 prescribes them as attestation-only, NOT as runtime tests. AC-R30-1..15 + AC-R30-18 are described as runtime tests and § 4 prescribes them as `test()` declarations.

| AC | Given / When / Then | Bound by |
|---|---|---|
| AC-R30-1 | Given the well-formed fixture text, when `parseNvlinkStatus(text)` runs, then `snapshot.nodes.length === 4` AND `snapshot.edges.length === 6` AND `partial === false`. | `test/q30-nvlink-adapter.test.ts` `test('AC-R30-1: ...')` |
| AC-R30-2 | Given the well-formed fixture, when iterating `snapshot.nodes`, then every node's `kind` is exactly `'gpu_shard'` (R18 enum). | `test('AC-R30-2: ...')` |
| AC-R30-3 | Given the well-formed fixture, when iterating `snapshot.edges`, then every edge's `relationship` is exactly `'nvlink_peer'` (R23 enum). | `test('AC-R30-3: ...')` |
| AC-R30-4 | Given the well-formed fixture, when iterating `snapshot.edges`, then (a) every edge has `from < to` (lex); (b) edge pair-keys are unique; (c) the pair-key set equals `{gpu-0\|gpu-1, gpu-0\|gpu-2, gpu-0\|gpu-3, gpu-1\|gpu-2, gpu-1\|gpu-3, gpu-2\|gpu-3}`. | `test('AC-R30-4: ...')` |
| AC-R30-5 | Given the well-formed fixture, when constructing `new NvlinkTopologySource(text)`, then `instance.id` and `instance.version` are strings AND `await instance.fetchSnapshot()` returns a `TopologySnapshot` with array `nodes` and `edges` AND `instance.snapshotHash(snapshot)` returns a non-empty string. | `test('AC-R30-5: ...')` |
| AC-R30-6 | Given an `NvlinkTopologySource` instance and its snapshot, when comparing `instance.snapshotHash(snapshot)` to `computeSnapshotHash(snapshot)`, then the two strings are equal. | `test('AC-R30-6: ...')` |
| AC-R30-7 | Given the sparse fixture text, when `parseNvlinkStatus(text)` runs, then `snapshot.nodes.length === 2` AND `snapshot.edges.length === 0` AND `partial === true`. | `test('AC-R30-7: ...')` |
| AC-R30-8 | Given an empty string or a string with no `GPU N:` lines, when `parseNvlinkStatus(text)` runs, then it throws an `Error` matching `/NVLINK_PARSE_NO_GPU_BLOCKS/`. | `test('AC-R30-8: ...')` |
| AC-R30-9 | Given (a) opts with explicit id/version + non-empty source_id/source_version, (b) opts with both undefined + non-empty source_id/source_version, (c) opts with both undefined + source_id/source_version undefined, when constructing `NvlinkTopologySource`, then (a) `instance.id === 'explicit-id'` AND `instance.version === 'explicit-ver'`; (b) `instance.id === 'src-id-b'` AND `instance.version === 'src-ver-b'`; (c) `instance.id === 'nvlink_topology_source'` AND `instance.version === 'nvlink-1'`. | `test('AC-R30-9: ...')` |
| AC-R30-10 | Given `makeWrap32Pair({expected_interval_seconds: 1.0})`, when `ingestNvlinkErrorCounter(prev, next, {expected_scrape_interval_seconds: 1.0})` runs, then `out.wraparound_handled === true` AND `out.reset_detected === false` AND `out.value === (UINT32_MOD - 4_200_000_000 + 50) / 1.0`. | `test('AC-R30-10: ...')` |
| AC-R30-11 | Given `makeMissedScrapePair({expected_interval_seconds: 1.0})`, when `ingestNvlinkErrorCounter(prev, next, {expected_scrape_interval_seconds: 1.0})` runs, then `out.slope_quality === 'degraded'` AND `out.missed_scrape_inferred === true` AND `out.actual_elapsed_seconds === 2.0`. | `test('AC-R30-11: ...')` |
| AC-R30-12 | Given `makeResetPair({expected_interval_seconds: 1.0})`, when `ingestNvlinkErrorCounter(prev, next, {expected_scrape_interval_seconds: 1.0})` runs (with `counter_width: 32` baked in), then `out.reset_detected === true` AND `out.wraparound_handled === false` AND `out.value === null`. | `test('AC-R30-12: ...')` |
| AC-R30-13 | Given `makeVariableIntervalSequence({intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0], rate_per_second: 10})`, when each consecutive pair is passed through `ingestNvlinkErrorCounter(... , {expected_scrape_interval_seconds: 1.0})` and the `value` is pushed into a `TrendBuffer(20)`, then `Math.abs(snap.mean - 10) < 0.001` AND `Math.abs(snap.slopeNorm) < 0.01` AND every pair's `slope_quality === 'normal'`. | `test('AC-R30-13: ...')` |
| AC-R30-14 | Given `makeResetPair({expected_interval_seconds: 1.0})` AND `meta = { semantic_type: 'counter' }` (counter_width OMITTED), when `transformPair(prev, next, meta, {expected_scrape_interval_seconds: 1.0})` runs directly (NOT via the NVLink helper), then `out.reset_detected === true` AND `out.wraparound_handled === false` AND `out.value === null`. | `test('AC-R30-14: ...')` |
| AC-R30-15 | Given `engine/types/verdict.ts` at HEAD, when reading the file as a string, then it contains the literal `'correlational_not_causal: true'` (preserving Addition #26 D4 per A16). | `test('AC-R30-15: ...')` |
| AC-R30-16 | Given the round-end working tree at chore-A SHA, when running `npx tsc -p tsconfig.test.json`, then the exit code matches the documented pre-existing-infra baseline (= 2; diagnostics TS2688 + TS5107 only) AND no new diagnostics reference `engine/topology/nvlink-source.ts` or `test/q30-nvlink-adapter.test.ts`. Attestation recorded in NEXT-ROLE.md verbatim — do NOT reframe as compliance (R26 MAJOR-1 false-compliance-attestation prevention). | NEXT-ROLE.md attestation (Implementer at chore-A) |
| AC-R30-17 | Given the round-end working tree at chore-A SHA, when running `node --test test/*.test.js`, then the output reports `tests=259 / pass=257 / fail=2` (predicted; baseline 243/241/2 + 16 new R30 runtime tests; AC-R30-16 and AC-R30-17 are attestation-only and add no `test()` block to the runtime suite). The 2 failures are: (a) `Q1 AC-7 — every vendored-at-pin file is byte-identical to source modulo header` (q01 ENOENT — cluster-worktree DS-sibling unavailable; pre-existing per WAVE-GATE-01 pre-flag); (b) `AC-R26-16: anti-scope forward-protection (chore-B)` (pre-existing inheritance — R26's CHORE_A_SHA literal predates Wave-1 merge + Wave-2 routing chores). Attestation recorded in NEXT-ROLE.md verbatim with actual counts (R25 MAJOR-1 empirical-baseline reinforcement). Predicted-but-attested-empirically; if actual differs the Implementer attests the actual value, not the predicted. | NEXT-ROLE.md attestation (Implementer at chore-A) |
| AC-R30-18 | Given baseline SHA `5bb427c` and chore-A SHA (substituted at chore-B), when running `git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, then every output path is a member of the 8-entry allowed-set (§ 3) OR the 9th entry IFF a HALT fired mid-round. | `test('AC-R30-18: ...')` |

---

## § 6 Halt conditions (PRD-mandated + spec-prescribed procedure)

### § 6.1 PRD-mandated halt conditions (from cluster scope block):
1. **L0 contract surface gap during R-E7 mitigation exercises** — e.g., a wraparound or missed-scrape scenario where `transformPair` produces unexpected output. HALT + DIAGNOSTIC + ESCALATE to Coordinator (would route back for L0-contract amendment via re-decomposition).
2. **NVLink parsing requires modifying inherited `engine/topology-overlay.ts` BFS body** — A12 violation; route back.
3. **NVLink format requires new `TopologyNode.kind` or `TopologyEdge.relationship` literal** beyond R18+R23 enums — vendored-with-deltas transition for `engine/types/verdict.ts`; apply two-step maintenance pattern UPFRONT; if scope exceeds standard pattern, ESCALATE.
4. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per cross-project halt-discipline rule.

### § 6.2 Halt procedure
On any halt condition firing:
1. STOP work on the current task.
2. Write `coordination/diagnostics/DIAGNOSTIC-R30-<topic>.md` describing:
   - Trigger (which halt condition fired; quote the actual mismatch).
   - Bounded resolution options (Option A / B / C, each with consequence).
   - Recommended option + rationale.
3. Commit the DIAGNOSTIC.
4. Update `coordination/NEXT-ROLE.md`:
   - `NEXT-ROLE: ARCHITECT` (or COORDINATOR for cross-cluster issues).
   - `STATUS: ESCALATE`.
   - Reference the DIAGNOSTIC by path.
5. Append the 9th entry `coordination/diagnostics/DIAGNOSTIC-R30-<topic>.md` to AC-R30-18 ALLOWED_SET when implementing the test (per § 3 conditional clause).

Per R25 MAJOR-2 reinforcement (CLAUDE-COMMON.md REINFORCED 2026-05-18): the DIAGNOSTIC file commit lands BEFORE chore-A; therefore the DIAGNOSTIC path enters the round-start-to-chore-A diff. The allowed-set's 9th-entry provision is the spec's explicit pre-authorization for this case. If the Implementer is uncertain whether expanding the ALLOWED_SET to include the DIAGNOSTIC path is authorized, they should HALT for spec amendment rather than expand silently (per audit-tier promotion-mid-round rule analog applied to full-tier here).

### § 6.3 R26 MAJOR-1 false-compliance-attestation prevention
If `npx tsc -p tsconfig.test.json` produces a NEW diagnostic referencing `engine/topology/nvlink-source.ts` or `test/q30-nvlink-adapter.test.ts` (i.e., a NEW typecheck error introduced by this round's code), the Implementer MUST:
- NOT reframe the diagnostic as a "warning" or attribute it to pre-existing infra.
- HALT and write a DIAGNOSTIC enumerating: the new diagnostic verbatim, the source line, the resolution options.
- ESCALATE to Architect.

The pre-existing diagnostics TS2688 + TS5107 are environmental-baseline; attesting their persistence is honest. NEW diagnostics from R30 code are not.

---

## § 7 Open questions

### § 7.1 R25 MINOR-2 structural limitation (NOT a halt condition — documented for transparency)

The PRD prescribes AC-R30-14 to close R25 MINOR-2 (branch-binding coverage gap for `width = meta.counter_width ?? 64` default fallback at `engine/l0/counter-rate-transform.ts:119`). AC-R30-14 exercises the omitted-counter_width input shape and asserts the reset arm fires correctly, which closes the **coverage** portion of R25 MINOR-2.

However, AC-R30-14 does NOT mutation-kill the `?? 64` expression. Analysis: removing `?? 64` produces `width = undefined`; the only branch testing `width` is `if (width === 32 && ...)` at counter-rate-transform.ts:124; both `width === 64` and `width === undefined` fail this strict equality; the reset arm fires in both cases; AC-R30-14 passes regardless. The `?? 64` expression is genuinely unkillable from a branch-binding-mutation perspective without modifying `counter-rate-transform.ts` (which is anti-scoped — A12 / Wave-1 frozen).

This is honest documentation: AC-R30-14 closes the AC-coverage gap (input shape exercised; arm produces correct output) but cannot close the mutation-coverage gap given the current `counter-rate-transform.ts` shape. The structural fix (introducing a 64-bit-arm code path) is out-of-scope per A12.

**No halt** — this is a known limitation, surfaced to the Reviewer for confirmation, not a blocking ambiguity.

### § 7.2 GPU-id zero-padding convention

Lex comparison `gpu-N` < `gpu-M` matches numeric `N < M` for single-digit IDs (0-9). For double-digit IDs (10+), `gpu-1` < `gpu-10` lex but `1 < 10` numerically. R30 fixtures use IDs 0-3 (single-digit); the canonical-ordering AC (AC-R30-4) is exercised on the 4-GPU fixture only. If a future round needs ≥10 GPUs, the parser would need numeric-aware ordering OR zero-padded IDs. Tracked as forward-flag for Wave-3+ (not R30 scope).

**No halt** — R30 scope is bounded to single-digit-GPU fixtures; the ambiguity does not affect R30 correctness.

### § 7.3 All other items resolved
No other open questions. All PRD requirements are mapped to ACs; all integration points are verified against PRD requirements (§ 1.2 table); all failure modes have prescribed handling (§ 1.3 table).

---

## § 8 P3 ten-axis verification

Each axis verified with a one-sentence statement, followed by the supporting evidence in the spec.

1. **Correctness** — All ACs produce binary pass/fail outcomes from observable function behavior; no probabilistic or threshold-based ambiguity; the wraparound rate is an exact arithmetic identity `(UINT32_MOD − 4_200_000_000 + 50) / 1.0 = 94_967_346` (§ 1.4 + AC-R30-10).
2. **Completeness** — Every PRD requirement maps to at least one AC: Part 1 (parser ACs 1-9), Part 2 (R-E7 mitigation ACs 10-14, including R25 MINOR-2 opportunistic close), Cross-cutting (A16 AC-15, anti-scope AC-18, binding-command attestations AC-16+17); § 1.2 integration-point table cross-checks all (§ 2 PRD scope).
3. **Consistency** — § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription per R20 ARCH MINOR-1 cross-check; § 0 selected approaches (A/A/A) are referenced unambiguously in § 2 / § 4 / § 5; AC numbering is contiguous AC-R30-1 through AC-R30-18.
4. **Clarity** — No banned ambiguous-language tokens ("correctly", "appropriately", "as needed") appear in AC text except § 6.3 ("fires correctly") which describes spec-prescribed behavior, not test assertion language; AC text uses concrete numeric expectations or string-equality.
5. **Coverage** — 18 ACs binding 18 distinct concerns (parser shape, node kind, edge relationship, dedup, source interface, hash delegation, sparse degradation, throw path, fallback chain, 4 R-E7 mitigation paths, R25 MINOR-2 coverage close, A16 literal, typecheck attestation, test-count attestation, anti-scope diff); coverage exhausts the PRD AC bullets exactly.
6. **Constraints** — Tier verdict (`full`) applied per PRD justification (A1 + A2 + A4 + A6); anti-scope respected (§ 3); Wave-1-frozen files consumed only, never modified (§ 1.1 inventory); R25 MAJOR-3 tolerance prescription (0.001 / 0.01) applied at AC-R30-13 per WAVE-GATE-01 pre-flag.
7. **Concurrency** — Parser is pure-functional (no shared state); `NvlinkTopologySource.fetchSnapshot` is async-returning-resolved-value (no race); no concurrency surface in R30 (single-threaded test execution).
8. **Corner cases** — Empty input (AC-R30-8 throws); sparse input (AC-R30-7 partial=true); multi-link aggregation (AC-R30-4 dedup); self-peer line (§ 4.1 implementation-note defensive guard); fallback-chain undefined-undefined (AC-R30-9 (c)); reset path with omitted width (AC-R30-14).
9. **Cost** — ~120 LOC of production code + ~150 LOC of test code; 18 ACs; 2 fixture files (~20 lines each); ~15 min estimated Implementer execution time; full-tier rationale per PRD A1+A2+A4+A6.
10. **Coupling** — Production code couples to (a) `engine/topology-overlay.ts` (TopologySource interface + computeSnapshotHash; read-only consumer); (b) `engine/types/verdict.ts` (TopologyNode/TopologyEdge/TopologySnapshot types; read-only consumer); (c) `engine/l0/counter-rate-transform.ts` (transformPair + 4 types + UINT32_MOD; read-only consumer); test code adds couplings to (d) `engine/core.ts` (TrendBuffer; for AC-R30-13 only); (e) `test/_substrate/synthetic-counter-generator.ts` (factory imports). No coupling to `engine/hardware-topology-source.ts` or `engine/topology/common-mode-attribution.ts` (R23/R26 deliverables — consulted as structural precedent, not imported).

---

## § 9 Grilling output (pre-emit adversarial self-review)

Per CLAUDE-ARCHITECT.md "Pre-emit grilling" + Superpowers Review phase, the Architect adversarially re-reads the spec from the Implementer's perspective and the Reviewer's perspective and records the audit below.

### § 9.1 Self-questions (each answered)

**Q1: Is every claim in this spec backed by something verifiable?**
- A: Yes. (a) Empirical baseline counts (243/241/2 + tsc exit 2) recorded from `node --test` + `npx tsc` runs at session entry — verified by re-running. (b) File-reference line numbers (`engine/topology-overlay.ts:50-55`, `engine/hardware-topology-source.ts:26-44`, `engine/types/verdict.ts:245`, `engine/types/verdict.ts:255`, `engine/l0/counter-rate-transform.ts:94-157`, `engine/l0/counter-rate-transform.ts:119`) verified by `sed -n` / direct `Read` during spec authoring per R11 OBS-1/2 reinforcement. (c) PRD/handoff/wave-gate cross-references resolve to actual lines in those files (verified during spec authoring).

**Q2: Are there unstated assumptions?**
- A: Three documented + accepted:
  - (a) GPU-id zero-padding convention: lex == numeric only for single-digit IDs. Documented at § 4.1 implementation-note + § 7.2 OQ; R30 fixtures bounded to single-digit; forward-flagged.
  - (b) Peer-info symmetry in `nvidia-smi nvlink --status`: if GPU A peers with GPU B, GPU B also peers with GPU A. Documented at § 0.3 hidden-assumptions; true by NVLink fabric construction.
  - (c) Wave-2 production scrape loop is out-of-scope: the adapter exposes unit operations (parse, ingest one counter pair); the production loop wiring is downstream. Documented at § 0.1 hidden-assumptions.

**Q3: Has scope been added beyond what the PRD requested?**
- A: No. (a) No new dependencies (regex line-parser, no parser library). (b) No new type extensions to `engine/types/verdict.ts` (R18+R23 enums sufficient). (c) No new files beyond the 4 prescribed by PRD (`engine/topology/nvlink-source.ts`, `test/q30-nvlink-adapter.test.ts`, 2 fixture files). (d) The `ingestNvlinkErrorCounter` helper is in the same module per § 0.1 picked approach (Approach A — single file).

**Q4: Can the Implementer act on this spec without making design decisions or asking clarifying questions?**
- A: Yes. (a) Exact function signatures (§ 4.1 with parameter types and return types). (b) Exact regex patterns (`GPU_HEADER_RE`, `LINK_PEER_RE`) with full source. (c) Exact edge-dedup algorithm (canonical-ordering via lex compare; Set-based dedup keyed by `${from}|${to}`). (d) Exact fixture file contents (§ 4.2 + § 4.3 with character-precise text). (e) Exact AC bodies (§ 4.4 ships full TypeScript test source). (f) Exact tolerances (0.001 / 0.01 per § 1.8-class disposition; documented inline at AC-R30-13). (g) Exact baseline SHA + chore-A SHA placeholder substitution timing (§ 4.4 anti-scope test). (h) Exact attestation format for AC-R30-16/17 (§ 5 table prescribes verbatim recording in NEXT-ROLE.md).

### § 9.2 Reinforcement sweep (CLAUDE-ARCHITECT.md REINFORCED lines applied)

Each reinforcement that applies to R30 work is enumerated and verified:

| Reinforcement | Application in this spec |
|---|---|
| R01 cross-spec-section consistency pass | § 0 picks (A/A/A) referenced consistently across § 2 / § 4 / § 5; no contradictions surfaced |
| R02 type-declaration-site check | Every named type in § 4 pseudocode (`CounterMetadata`, `CounterSample`, `TopologyNode`, etc.) verified at declaration site (`engine/l0/counter-rate-transform.ts:48-58`, `engine/types/verdict.ts:240-247`); imports prescribed at § 4.1 + § 4.4 |
| R02 git-tracked-vs-gitignored for `git rm` | N/A — R30 prescribes no file deletion |
| R03 re-export chain | N/A — R30 imports types from declaration site (`engine/types/verdict.ts`); does not rely on re-export chains |
| R03 grep verification command soundness | AC-R30-15 reads `engine/types/verdict.ts` and tests `.includes('correlational_not_causal: true')` — pattern matches in comments too (`engine/types/verdict.ts:289`); intentional, since the literal is in the type declaration body, not a comment. Verified by direct file read |
| R03 AC test-count per-file | AC-R30-17 prescribes `tests=259 / pass=257 / fail=2`; per-file delta = +16 runtime tests in q30-nvlink-adapter.test.ts (AC-R30-1..15 + AC-R30-18; AC-R30-16/17 are attestation-only and add no `test()` block); empirically anchored to baseline 243/241/2 |
| R05 component-inventory AC-range cross-check | § 1.1 inventory + § 5 AC table both reference AC-R30-1..18 consistently |
| R06 delta-grep all-occurrences | N/A — R30 creates new files; no edits to existing files outside coordination/ |
| R06 opts/options interface field coverage | `NvlinkParseOpts` has 3 fields (`fetched_at_ts`, `source_id`, `source_version`); `NvlinkTopologySource` constructor opts has 5 (`id`, `version`, `fetched_at_ts`, `source_id`, `source_version`); AC-R30-9 binds id/version fallback chains for 3 sub-cases (a/b/c) covering all branches; `fetched_at_ts` is exercised by AC-R30-1 (deterministic timestamp passed); `source_id`/`source_version` are exercised by AC-R30-9 sub-cases (b) and (c) (the fallback assertions transit through them); all opts fields covered |
| R07 fixture accumulation requirement | N/A — no e-process / statistical-detector ACs in R30 |
| R07 OBSERVED-binding scope | N/A — all R30 ACs are deterministic, not OBSERVED-binding |
| R08 empirical premise verification | § Empirical baseline at session entry: verified by running `node --test test/*.test.js` AND `npx tsc -p tsconfig.test.json` in this cluster worktree (NOT inherited from R25/R26/R27 attestations). Recorded as `tests=243 / pass=241 / fail=2` + `tsc exit 2` empirically |
| R10 file-level documentation coverage | § 4.1 prescribes full file docblock for `engine/topology/nvlink-source.ts`; § 4.4 prescribes full docblock for `test/q30-nvlink-adapter.test.ts`; both describe the module's complete exported surface |
| R11 REVIEWER-ANCHOR cited-line extraction | Every cited line range in this spec re-verified by direct file read during spec authoring: `engine/topology-overlay.ts:50-55` (TopologySource interface — verified line 50 starts `export interface TopologySource`); `engine/hardware-topology-source.ts:26-44` (HardwareTopologySource class — verified); `engine/types/verdict.ts:245` (`kind` union — verified contains `'gpu_shard'`); `engine/types/verdict.ts:255` (`relationship` union — verified contains `'nvlink_peer'`); `engine/l0/counter-rate-transform.ts:94-157` (transformPair function — verified); `engine/l0/counter-rate-transform.ts:119` (`width = ... ?? 64` — verified) |
| R13 named statistical bound | N/A — R30 has no statistical-bound terminology |
| R15 anti-scope diff baseline | Baseline `5bb427c` is the R30 routing commit and the most-recent commit before Architect spec commit; no intermediate operator-prep commits; verified by `git log --oneline -5`. The 9th-entry conditional clause (DIAGNOSTIC) is explicitly authorized in § 3 per R25 MAJOR-2 reinforcement |
| R15 spec-internal-contradiction | The two halt-condition prescriptions in § 6.1 #4 and § 6.3 (false-compliance prevention) align: both prescribe HALT + DIAGNOSTIC on binding-command output contradicting AC literal text. No conflicting prescriptions for the same trigger state |
| R18 test-byte-identity vendored-with-deltas | N/A — R30 does NOT create new vendored-with-deltas files; only Tessera-original files |
| R20 § 5 AC-table preamble cross-check | § 5 preamble classifies AC-R30-16/17 as "binding-command attestations (NOT runtime-bound)" and AC-R30-1..15 + AC-R30-18 as "runtime tests"; verified against § 4 prescription — § 4.4 ships `test()` declarations for AC-R30-1..15 + AC-R30-18 only; AC-R30-16/17 have no `test()` declaration and are described as Implementer attestations in NEXT-ROLE.md |
| R21 every-failure-mode-AC-bound (§ 1 enumerations have bindings) | § 1.3 failure-mode table cross-referenced against AC table: every listed failure mode has a binding AC (parser → 1, 7, 8; constructor → 9; helper → 10, 11, 12, 13; direct transformPair → 14; binding-command → 16, 17). Defensive `if (a === b) continue` self-peer guard at § 4.1 is documented as defensive-not-AC-bound |
| R21 ARCH MINOR-1 spec-commit-sequencing | Architect WILL commit spec files (Q-R30-SPEC.md + Q-R30-SPEC-AUDIT.md) BEFORE writing NEXT-ROLE.md routing block — committed in a dedicated commit; verified by the spec-commit sequence in § 10 below |
| R23 .gitignore-aware spec inventories | All 8 allowed-set entries verified git-trackable: 6 NEW files (will be git-trackable post-Implementer commit; not in .gitignore); 2 MOD-only (already tracked); verified .gitignore does not exclude any of these paths |
| R25 MAJOR-1 empirical baseline | AC-R30-17 prescribes attesting actual `node --test` counts in NEXT-ROLE.md; predicted `tests=261/pass=259/fail=2` is the spec's expectation but the Implementer attests the ACTUAL counts (per Empirical-baseline reinforcement); if the actual differs, the Implementer attests the actual value and (if the difference is structural — not just the predicted +18) HALTs per § 6.1 #4 |
| R25 MAJOR-2 allowed-set conditional 9th entry | § 3 explicitly authorizes the 9th entry (`coordination/diagnostics/DIAGNOSTIC-R30-*.md`) IFF a HALT fires; AC-R30-18 ALLOWED_SET literal at § 4.4 includes the conditional commentary |
| R25 MAJOR-3 spec-amendment-post-disposition | N/A — no ESCALATE disposition yet for R30; if one occurs, this spec must be amended (not just the test path), per the reinforcement; § 6.2 procedure step 5 captures this |
| R25 MINOR-2 branch-binding mutation-killing | § 7.1 transparently documents that AC-R30-14 closes the coverage gap but not the mutation-kill gap; this is honest documentation, not a hidden limitation |
| R26 MAJOR-1 false-compliance-attestation prevention | § 6.3 explicitly prohibits reframing `tsc` errors as "warnings" or reframing fail-counts as compliance; AC-R30-16/17 attestation classification at § 5 reinforces this with verbatim-recording prescription |

### § 9.3 Cross-section consistency pass

Per R01 reinforcement: for every resolved § 0 decision, verify all subsequent sections use a consistent surface.

| § 0 decision | Surface in § 2 | Surface in § 4 | Surface in § 5 | Consistent? |
|---|---|---|---|---|
| § 0.1 — single module | `engine/topology/nvlink-source.ts` (3 exports) | § 4.1 prescribes single file with 3 exports | AC table imports from one module | ✓ |
| § 0.2 — regex line-pattern parser | "regex line-pattern" referenced in § 2.1 | § 4.1 ships GPU_HEADER_RE + LINK_PEER_RE | AC-R30-1 + AC-R30-8 exercise regex behavior | ✓ |
| § 0.3 — undirected-deduped canonical | "from = min(...), to = max(...)" in § 2.1 + edge dedup mechanism | § 4.1 ships canonical-ordering algorithm | AC-R30-4 binds canonical ordering | ✓ |

### § 9.4 Pre-route checklist

- [x] Spec covers every PRD requirement (verified § 1.2 + § 5).
- [x] Spec depth: WHAT and WHY prescribed; tactical-detail prescription only where load-bearing (§ 4 pseudocode is full because the Implementer's mechanical translation is the contract).
- [x] Anti-scope explicit (§ 3) + halt conditions explicit (§ 6).
- [x] No banned ambiguous-language tokens in AC text.
- [x] All cited line numbers re-verified at declaration site.
- [x] Empirical baselines (test count, tsc exit) verified by running the binding commands in this cluster worktree, not inherited from prior rounds (R25 MAJOR-1 / R08 reinforcement).
- [x] § 5 preamble attestation classification matches § 4 prescription (R20 ARCH MINOR-1).
- [x] Component inventory consistent across § 1.1 / § 4 / § 5 (R05 reinforcement).
- [x] Branch-binding coverage gate applied (R21 ARCH MINOR-2/3): every guard / fallback / default has a binding AC where the underlying code path is observably bound. R25 MINOR-2 limitation documented at § 7.1.
- [x] File-level documentation coverage check (R10 reinforcement): § 4.1 docblock describes full exported surface.

---

## § 10 Architect routing sequence (post-grilling)

Per R21 ARCH MINOR-1 reinforcement (spec-commit-sequencing) + R23 / R25 precedent:

1. **Spec commit (Architect):** commit `coordination/specs/Q-R30-SPEC.md` + `coordination/specs/Q-R30-SPEC-AUDIT.md` in a dedicated commit (`spec(R30): Q-R30 Phase 2 SLICE 3.B WU-03 NVLink topology adapter + L0 D1 consumer`).
2. **NEXT-ROLE.md update (Architect; uncommitted):** update `coordination/NEXT-ROLE.md` to route IMPLEMENTER STATUS: READY with this spec as input. Implementer's chore-A commit picks this up.
3. **MEMORIAL.md update (Architect; uncommitted):** append CONFIRMATION entries for disciplines applied this round.
4. **Implementer takes over:** RED commit → GREEN commit → chore-A commit (which sweeps NEXT-ROLE.md + MEMORIAL.md updates).
5. **Chore-B commit (Implementer):** appends AC-R30-18 with chore-A SHA literal substituted.

---

_End of Q-R30-SPEC.md._
