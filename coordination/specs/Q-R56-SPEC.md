# Q-R56-SPEC — Phase 3 SLICE 2 WU-Phase3-2A: Google TPU / ICI topology adapter

**Round:** R56 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 7 of `coordination/WAVE-PLAN-07.md`; sole WU = WU-Phase3-2A per Step 3 Judgment call 1 Option B split-with-sequential).
**Phase / SLICE:** Phase 3 SLICE 2 — second non-NVIDIA vendor `TopologySource` impl in Tessera; parallel-class with R28 SLURM / R29 K8S / R30 NVLINK / R53 NEURON.
**Scope reference:** `coordination/PRD.md` § Phase 3 (FR-V2 + AC-P5 cross-cutting + AC-P7; lines 436 + 447 + 479) + `coordination/WAVE-PLAN-07.md` (Step 1 WU-Phase3-2A row; Step 3 Judgment calls 1 + 2) + `coordination/NEXT-ROLE.md` R56 round-scope directive (operator dispositions OQ-Phase3-W2-1 Option A + OQ-Phase3-W2-2 Option B).
**PRD trace:** FR-V2 (PRD:436; Google TPU / ICI adapter) · US-06 (Google-stack AI infrastructure operator per-shard observation on TPU pods) · AC-P5 (re-asserted for TPU; `TopologySnapshot` consumable by inherited `engine/topology-overlay.ts` BFS layer with `tpu_ici_peer` edge relationship literal + `tpu_shard` node kind literal).
**Round-start SHA (anti-scope diff lower bound):** `4447586` (chore: prepare R56 directive (WU-Phase3-2A Google TPU adapter; full-tier); HEAD at Architect session entry — verified `git rev-parse HEAD`).
**Empirical baseline at session entry (verified by Architect via `node --test --test-reporter=tap test/*.test.js`):** `tests=374 / pass=369 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)`. Both are R36 forward-protection guards whose CHORE_A_SHA literal (`87e372f` Phase 2 close) is structurally older than HEAD; the 2 fails are pre-existing inheritance, NOT introduced by this round (carry-forward from R53 close).
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. R56 inherits a clean tsc surface and must preserve it.

---

## § 0 Brainstorm phase (Superpowers — inline)

Four architectural axes have genuine multi-option choices. Each is brainstormed below with three distinct approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 Parser input format (which TPU topology-descriptor surface to parse)

**Approach A — Parse JAX-style topology JSON manifest (PICKED).** Fixture is a JSON file with fields `tpu_version` (string discriminator: `'v4'` / `'v5p'` / `'v5e'` / ...), `slice_shape` (integer triple `[x_dim, y_dim, z_dim]` matching public TPU slice descriptors), `topology_type` (`'torus'` for full cube or `'mesh'` for sub-cube), `chips` (array of `{ chip: string, ici_peers: string[] }` entries). Parser uses `JSON.parse` → reads `tpu_version` (for generation discrimination) and walks `chips[]` array; each chip entry's `ici_peers` array lists peer chip IDs. Emits nodes (kind always `'tpu_shard'` per WAVE-PLAN-07 line 72 frame-level AC (d): one new `TopologyNode.kind` literal `'tpu_shard'` shared across TPU generations) + edges from `ici_peers` lists.

- **Strengths:** matches K8s + Neuron precedent (R29 + R53; both consume JSON-shape input via typed surface); structured JSON eliminates regex brittleness; parser is ~40 LOC; the JAX programmatic topology API (`jax.devices()` / `jax.local_devices()` returning per-device `coords` triples + `core_on_chip`) naturally serializes to this JSON shape; matches the file-tree scope row in WAVE-PLAN-07 Step 1 which prescribes `test/_substrate/tpu-fixture-*.json` (JSON-extension fixtures).
- **Weaknesses:** the canonical Google TPU production-fetch path is NOT `neuron-ls`-equivalent — TPU topology metadata in production comes from either (a) Cloud TPU Resource Manager API (out-of-scope per OQ-P3-2: no Google Cloud access) OR (b) JAX programmatic introspection at runtime. The synthetic JSON manifest is a parser input contract, not a verbatim production-fetched format. Acceptable per the same reasoning R53 applied: WU-Phase3-2A ships unit operations consuming a documented JSON schema; the production-fetch wrapper (which translates JAX `jax.devices()` → this JSON shape) is SLICE 2B / Phase 3 SLICE 3 scope per WAVE-PLAN-07 line 73 anti-scope row.
- **Hidden assumptions:** the JSON schema is Architect-defined for Tessera (no upstream-canonical JAX JSON manifest exists for topology). The chosen schema follows the JAX `jax.devices()` per-device shape pattern (each device has `coords` + neighbor info) at the JSON layer. Acceptable — the schema is internal to Tessera's adapter contract; production wrapper translates JAX runtime objects to this JSON shape.
- **Risks:** low.

**Approach B — Parse TPU v4/v5p architectural paper coordinate-triple format directly.** Fixture has only `tpu_version` + `slice_shape` + the parser computes all chip coordinates + ICI peers from the slice shape mathematically (3D torus / mesh formula).

- **Strengths:** the fixture is tiny (~5 lines per fixture); no explicit `ici_peers` arrays needed.
- **Weaknesses:** parser logic conflates input-validation with topology-derivation; testing the parser's input handling becomes tangled with testing the topology-derivation formula; sparse/partial degradation becomes hard to express in the fixture (you'd need fixture-level overrides on the formula). This pattern would make the parser less faithful to the K8s + Neuron precedent of "consumes an explicit JSON shape; produces a snapshot".
- **Risks:** medium; mixes two concerns; harder to evolve.

**Approach C — Parse TPU `neuron-ls`-equivalent CLI tool output text.**

- **Strengths:** matches a hypothetical "tpu-ls" tool format.
- **Weaknesses:** no such canonical tool exists in Google TPU stack (the closest is `jax.devices()` programmatic introspection or `gcloud compute tpus tpu-vm describe` JSON output from Cloud TPU Resource Manager API — but Cloud TPU API access is out-of-scope per OQ-P3-2). Inventing a text-format spec when JSON is the de-facto surface is YAGNI-inversion (same reason R53 § 0.1 rejected text-column parsing).
- **Risks:** high.

**Selection rationale:** Approach A. Matches K8s (R29) + Neuron (R53) JSON-shape precedent; cleanly separates parser input handling from topology-derivation; supports sparse/partial fixtures naturally (sub-cube fixture has explicit smaller `ici_peers` arrays); future production-wrapper that consumes `jax.devices()` returns this JSON shape after a thin marshalling layer.

### § 0.2 Module decomposition (single vs split vs hybrid)

**Approach A — Single module `engine/topology/tpu-source.ts` (PICKED).** One Tessera-original file with:
- `parseTpuTopologyJson(jsonText, opts) → { snapshot, partial, tpu_version }` (pure function).
- `class TpuTopologySource implements TopologySource` (thin wrapper).
- TPU-version discrimination at parse time via `tpu_version` field (`'v4'` / `'v5p'` / future generations → node kind always `'tpu_shard'` per WAVE-PLAN-07 line 72 single-kind decision).
- Partial-flag computation discriminates "full cube" (all `slice_shape` dims ≥ 4) from "sub-cube" (any dim < 4 → mesh-only; partial=true).

- **Strengths:** matches operator OQ-Phase3-W2-1 Option A explicit disposition (recorded in NEXT-ROLE.md line 17); matches R28/R29/R30/R53 single-file precedent; tightest blast radius (~150 LOC); single file maintenance; no D5-strict write-conflict on the new `'tpu_ici_peer'` enum literal (single file adds it once).
- **Weaknesses:** single file mixes v4 + v5p (and future v5e / v6 / ...) parser paths. Acceptable — they share the same JSON schema; only `tpu_version` literal differs per fixture; no per-generation behavior branching at parse time other than the discriminator (analogous to R53's single-file Trainium + Inferentia: both share `neuron-ls --json-output` schema).
- **Risks:** low.

**Approach B — Multi-file `tpu-v4-source.ts` + `tpu-v5p-source.ts` + shared `tpu-common.ts`.**

- **Strengths:** per-TPU-version file granularity at the file system.
- **Weaknesses:** operator OQ-Phase3-W2-1 dispositioned Option A; splitting now re-litigates operator decision; per-version files would duplicate ~80% of parsing logic (both consume the same JSON schema); D5-strict write-conflict on shared `'tpu_ici_peer'` enum literal (one literal added once at verdict.ts; two files needing it serializes the round).
- **Risks:** medium; contradicts operator disposition.

**Approach C — Hybrid: shared `parseTpuTopologyJson` + two thin source classes (`TpuV4TopologySource` + `TpuV5pTopologySource`).**

- **Strengths:** classes carry TPU-version identity at the type level.
- **Weaknesses:** TPU version is a runtime distinction inferred from fixture content, not a compile-time class choice; same shifted-runtime-dispatch issue R53 § 0.2 Approach C identified; extra classes for no semantic benefit; would also need future class additions for every new TPU generation (v5e, v6e, v7, ...).
- **Risks:** low-medium; over-engineering.

**Selection rationale:** Approach A. Aligns with operator disposition OQ-Phase3-W2-1 Option A + R28/R29/R30/R53 precedent.

### § 0.3 Partial-flag semantics (when does `partial=true` fire?)

**Approach A — Partial fires on sub-cube slices that lack full torus wraparound (PICKED).** Per Google Cloud TPU v5p public docs (retrieved 2026-05-19 via WAVE-PLAN-07 line 72): "All 4x4x4 and larger slices (one cube) have full 3D torus connectivity. Slices smaller than a full cube are 3D connected, however, they don't have wrap-around links that make them a 3D torus." Partial-detection rule: `partial = slice_shape.some(dim => dim < 4)`. Sub-cube fixtures (any dimension < 4) → partial=true (mesh-only behavior; no wraparound). Full cubes (all dims ≥ 4) → partial=false (full 3D torus connectivity).

- **Strengths:** semantically aligned with public-doc behavior ("full cube ⇒ full torus; sub-cube ⇒ mesh-only"); deterministic from `slice_shape` field; exercises WAVE-PLAN-07 line 72 frame-level AC (e) "Sparse / partial topology graceful handling (sub-cube slices that lack wraparound links → graceful 3D-mesh-only snapshot)"; no fixture-content inspection needed (one field check).
- **Weaknesses:** assumes the fixture's `topology_type` matches its `slice_shape` semantically — a fixture with `slice_shape: [4,4,4]` but `ici_peers` arrays that explicitly omit wraparound edges would still report `partial=false` despite being mesh-only in content. Acceptable — fixtures are Architect-controlled inputs; the partial flag derives from the slice-shape contract, not from edge-list inspection. Future cross-validation between `topology_type` and `slice_shape` is a SLICE 2B / future-vendor scope.
- **Hidden assumptions:** Google's "full cube = ≥4 in each dim" cutoff applies to TPU v4 + v5p both. Verified at WAVE-PLAN-07 line 72: v4 cube baseline = 4x4x4; v5p threshold for full 3D torus also 4x4x4. Future TPU generations may have different cutoffs (e.g., v5e ring topology has different shape constraints); Architect-flag for future-revisitation.
- **Risks:** low.

**Approach B — Partial fires on empty edge list (matches R53 Neuron semantics).** `partial = (edges.length === 0)`.

- **Strengths:** matches R53 precedent line-for-line.
- **Weaknesses:** doesn't capture TPU-specific "sub-cube mesh-only" semantics — a sub-cube fixture with 12 mesh edges would report partial=false despite being structurally mesh-only (no wraparound). This contradicts WAVE-PLAN-07 line 72 frame-level AC (e) explicit semantic "sub-cube slices that lack wraparound → graceful 3D-mesh-only snapshot" (which implies sub-cube = partial).
- **Risks:** medium; semantic mismatch with WAVE-PLAN intent.

**Approach C — Partial fires on either condition (sub-cube OR empty edges).**

- **Strengths:** covers both cases.
- **Weaknesses:** conflates two distinct semantics under one flag; future consumers can't distinguish "sub-cube mesh-only" from "fully empty topology"; would need a second flag (`mesh_only`?) to disambiguate, expanding the snapshot surface beyond what `TopologySnapshot` provides.
- **Risks:** medium-high; surface bloat.

**Selection rationale:** Approach A. Sub-cube-based partial semantics aligns with TPU public-doc "full cube vs sub-cube" topology distinction. The semantic shift from R53 (where `partial = edges.length === 0`) is intentional and documented — TPU's partial flag captures torus-vs-mesh, not empty-vs-non-empty.

### § 0.4 Edge representation (one edge per raw peer entry vs undirected-deduped vs both)

**Approach A — Undirected-deduped, one canonical edge per peer pair (PICKED; matches R30 + R53 precedent).** TPU `ici_peers` arrays list peers in both directions (chip A has `ici_peers: [B, ...]`; chip B has `ici_peers: [A, ...]` → dedup the (A,B) pair). Emit one canonical edge `{from: min(id_a, id_b), to: max(...), relationship: 'tpu_ici_peer'}` per unique pair. Use lex comparison on `tpu-N` string-id form (same convention as R30 NVLink `gpu-N` and R53 Neuron `neuron-N`).

- **Strengths:** matches inherited `engine/topology-overlay.ts:262-267` BFS bidirectional adjacency build; undirected-deduped representation eliminates double-counting; canonical ordering enables deterministic `computeSnapshotHash`; matches R30 + R53 precedent line-for-line.
- **Weaknesses:** loses per-link bandwidth info (TPU v5p ICI links carry 1200 GBps each; v4 ICI bandwidth differs). Acceptable — `TopologyEdge` does not carry bandwidth metadata in the current vendored-with-deltas surface; SLICE 2B / future vendor scope.
- **Hidden assumptions:** `ici_peers` symmetry holds (if chip A lists B, chip B lists A). True by TPU ICI fabric construction. Parser dedup handles asymmetric input gracefully (one-sided peer entry still produces a deduped edge).
- **Risks:** low.

**Approach B — One edge per raw peer entry (no dedup).** Same downside as R30/R53 Approach B; edge surface inflated; BFS already treats edges bidirectionally.

**Approach C — Both representations exposed via separate fields.** Same A12 violation as R30/R53 Approach C.

**Selection rationale:** Approach A. Matches R30 + R53 precedent.

### § 0.5 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| § 0.1 Parser input | A — JAX-style topology JSON manifest | B (coordinate-triple formula), C (text-format tpu-ls) | JSON-shape K8s+Neuron precedent; clean separation of parser-input vs topology-derivation |
| § 0.2 Module decomp | A — single file | B (split), C (hybrid) | OQ-Phase3-W2-1 Option A operator disposition; R28/R29/R30/R53 precedent |
| § 0.3 Partial semantics | A — slice_shape sub-cube detection | B (empty-edges only), C (both) | WAVE-PLAN-07 frame-AC (e) "sub-cube → mesh-only graceful"; matches public-doc semantic |
| § 0.4 Edge representation | A — undirected-deduped canonical | B (per-raw), C (both) | Matches BFS bidirectional; deterministic hash; R30+R53 precedent |

All four picks are independent; no pick contradicts PRD/WAVE-PLAN/anti-scope.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Component | Status | Concern |
|---|---|---|
| `engine/topology/tpu-source.ts` | NEW | JSON parser + `TpuTopologySource` class + partial-flag helper |
| `engine/types/verdict.ts` | MODIFIED | `TopologyNode.kind` union extended with `'tpu_shard'`; `TopologyEdge.relationship` union extended with `'tpu_ici_peer'`. Vendored-with-deltas (already established at R18 + R23 + R53 — see `coordination/VENDORING-MANIFEST.md`). |
| `test/q56-tpu-adapter.test.ts` | NEW | AC bindings for R56 (parser ACs + TPU-version discrimination + interface conformance + sub-cube partial degradation + A16 + anti-scope diff) |
| `test/_substrate/tpu-fixture-v4-cube.json` | NEW | Synthetic TPU v4 4×4×4 cube fixture (64 chips; full 3D torus per Google Cloud TPU v4 public docs; 6 ICI peers per chip; 192 undirected-deduped edges) |
| `test/_substrate/tpu-fixture-v5p-cube.json` | NEW | Synthetic TPU v5p 4×4×4 cube fixture (64 chips; full 3D torus per Google Cloud TPU v5p public docs; 6 ICI peers per chip; 192 undirected-deduped edges) |
| `test/_substrate/tpu-fixture-sparse-subcube.json` | NEW | Synthetic v5p 2×2×2 sub-cube fixture (8 chips; 3D-mesh-only per public-doc "sub-cube lacks wraparound"; 3 ICI peers per chip; 12 undirected-deduped edges; partial=true) |
| `coordination/VENDORING-MANIFEST.md` | MODIFIED | `engine/types/verdict.ts` row note column extended to enumerate R56 Phase 3 SLICE 2 deltas alongside R18 + R23 + R53 entries (single-row note refresh; same two-step pattern as R23 + R53) |
| `coordination/specs/Q-R56-SPEC.md` | NEW | This spec |
| `coordination/specs/Q-R56-SPEC-AUDIT.md` | NEW | Architect ceremony sidecar |
| `coordination/specs/Q-R56-EMPIRICAL.sh` | NEW | Rule 1 sub-class `empirical-command-attestation` self-application (R46 canonical landing pattern) |
| `engine/topology-overlay.ts` | UNCHANGED | `TopologySource` interface (lines 50-55) + `computeSnapshotHash` (lines 69-78) consumed read-only (vendored-at-pin) |
| `engine/topology/{slurm,k8s,nvlink,neuron}-source.ts` | UNCHANGED | Phase 2 + Phase 3 SLICE 1 parallel-class precedent files consulted for structural shape; not modified |
| `engine/hardware-topology-source.ts` | UNCHANGED | R23 frozen (consulted for class shape only) |
| `engine/l0/counter-rate-transform.ts` | UNCHANGED | Out-of-scope for R56 (no TPU counter helper; per WAVE-PLAN-07 line 73 file-tree scope which does NOT enumerate L0 helper; matches R53 § 1.5 deferral pattern) |

### § 1.2 Integration points (with PRD requirement verification)

| Integration point | Direction | PRD/WAVE-PLAN requirement | Verification AC |
|---|---|---|---|
| `TpuTopologySource` → `TopologySource` interface (`engine/topology-overlay.ts:50-55`) | Implementation conformance | AC-P5 + WAVE-PLAN-07 Step 1 (f) ("`TopologySource` interface conformance") | AC-R56-7 + AC-R56-8 |
| `TpuTopologySource.snapshotHash` → `computeSnapshotHash` (`engine/topology-overlay.ts:69-78`) | Delegation | WAVE-PLAN-07 Step 1 (f) ("hash delegates to `computeSnapshotHash` per shared semantics") | AC-R56-8 |
| `parseTpuTopologyJson` → `TopologyNode.kind = 'tpu_shard'` (R56 enum addition at `engine/types/verdict.ts:254`) | Type literal | AC-P5 + WAVE-PLAN-07 Step 1 (d) ("`'tpu_shard'` `TopologyNode.kind` literal added") | AC-R56-2 (v4 fixture) + AC-R56-6 (v5p fixture) |
| `parseTpuTopologyJson` → `TopologyEdge.relationship = 'tpu_ici_peer'` (R56 enum addition at `engine/types/verdict.ts:264`) | Type literal | AC-P5 + WAVE-PLAN-07 Step 1 (c) ("`'tpu_ici_peer'` `TopologyEdge.relationship` literal added") | AC-R56-3 (v4) + AC-R56-6 (v5p) |
| `parseTpuTopologyJson` → `tpu_version` discriminator | Internal field exposure | § 0.3 selection (partial computed from slice_shape; tpu_version exposed for downstream attribution) | AC-R56-11 |
| Sub-cube partial degradation (slice_shape with any dim < 4 → partial=true; 3D-mesh-only behavior) | Runtime path | WAVE-PLAN-07 Step 1 (e) ("Sparse / partial topology graceful handling (LS-4 carry-forward + TPU-specific sub-cube semantics per public-doc quote)") | AC-R56-9 |
| Malformed input (missing tpu_version, missing slice_shape, missing chips, unknown tpu_version, empty chips) | Runtime path | § 0.1 + § 0.2 selection (fail-fast on malformed input; mirrors R53 § 1.3 malformed-input failure modes) | AC-R56-10 |
| `engine/types/verdict.ts` A16 literal preservation (`'correlational_not_causal: true'`) | Read-only invariant | WAVE-PLAN-07 Step 1 (g) ("`correlational_not_causal: true` invariant preserved at any wire boundary (A16 defensive)") | AC-R56-12 |
| Anti-scope file-set diff against round-start baseline `4447586` | Runtime test | WAVE-PLAN-07 Step 1 (h) ("Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A)") | AC-R56-15 |
| Binding-command attestation (`tsc` exit + `node --test` counts) at chore-A SHA | Attestation in NEXT-ROLE.md + AC-evidence + `Q-R56-EMPIRICAL.sh` | WAVE-PLAN-07 Step 1 (i) + Rule 1 sub-class `empirical-command-attestation` (R46 canonical landing) | AC-R56-13 + AC-R56-14 |
| Cross-cutting AC-P7 (Phase 1 + Phase 2 + Phase 3 SLICE 1 ACs hold unchanged) | Baseline-preservation invariant | PRD line 449 (AC-P7); R53 carry-forward (R53 test baseline 374/369/2/3 preserved) | AC-R56-14 (test count baseline preserved at 374 modulo R56 additions) |

### § 1.3 Failure modes (each integration point)

| Integration point | Failure mode | Handling |
|---|---|---|
| Parser ← input text | Not valid JSON (`JSON.parse` throws) | Wrap-and-rethrow as `Error('TPU_PARSE_INVALID_JSON: ...')` (AC-R56-10 sub-case a) |
| Parser ← parsed object | `tpu_version` field missing or not string | Throw `Error('TPU_PARSE_MISSING_TPU_VERSION')` (AC-R56-10 sub-case b) |
| Parser ← parsed object | `tpu_version` is a non-empty string but not a known generation (`v4` / `v5p` / `v5e`) | Throw `Error('TPU_PARSE_UNKNOWN_TPU_VERSION: <value>')` (AC-R56-10 sub-case c) |
| Parser ← parsed object | `slice_shape` field missing, not an Array, length ≠ 3, or any element not a positive integer | Throw `Error('TPU_PARSE_INVALID_SLICE_SHAPE')` (AC-R56-10 sub-case d) |
| Parser ← parsed object | `chips` field missing or not Array | Throw `Error('TPU_PARSE_MISSING_CHIPS')` (AC-R56-10 sub-case e — combined into single sub-test with sub-case f) |
| Parser ← parsed object | `chips` is empty array | Throw `Error('TPU_PARSE_NO_CHIPS')` (AC-R56-10 sub-case f) |
| Parser ← parsed object | All chips present + `ici_peers` arrays present + slice_shape has any dim < 4 | Emit nodes + edges; `partial = true` (sub-cube mesh-only per § 0.3 semantic; AC-R56-9) |
| Parser ← parsed object | All chips present + slice_shape all dims ≥ 4 | Emit nodes + edges; `partial = false` (full cube full-torus; AC-R56-1 + AC-R56-5) |
| Parser ← parsed object | A chip's `ici_peers` references a peer id that has no matching `chips[].chip` entry | Emit the peer node opportunistically with kind `'tpu_shard'` (mirrors R30 + R53 opportunistic-peer pattern; defensive surface — not separately bound by AC) |
| Parser ← parsed object | Multiple `ici_peers` arrays mention the same pair | Canonical (min, max) dedup; emit ONE edge (AC-R56-4) |
| Parser ← parsed object | Self-peer (`chips[i].ici_peers` includes `chips[i].chip`) | `if (peerId === chipId) continue` defensive guard (mirrors R30 + R53); not exercised by AC; defensive code |
| `TpuTopologySource` ← Constructor opts.id/version undefined | Constructor opts undefined | Fall back to `snapshot.source_id`/`snapshot.source_version`; if undefined, fall back to default literal `'tpu_topology_source'` / `'tpu-1'` (AC-R56-7 sub-cases) |
| Binding-command attestation | Actual `tsc` exit ≠ 0 | Encode actual exit empirically in `Q-R56-EMPIRICAL.sh`; do NOT reframe (Rule 1 sub-class `false-compliance-attestation` R26 MAJOR-1 reinforcement) |
| Binding-command attestation | Actual `node --test` fail count ≠ 2 (at post-chore-B state) or ≠ 3 (at chore-A pre-SHA-injection state) | Encode actual fail count empirically in `Q-R56-EMPIRICAL.sh`; distinguish chore-A vs chore-B state explicitly per R53 MINOR-1 reinforcement |

### § 1.4 Architect pre-prediction (outcome anchors)

| AC range | Predicted outcome at chore-A | Predicted outcome at chore-B |
|---|---|---|
| AC-R56-1..4 (v4 cube parser) | All PASS; 4 runtime tests; v4 fixture produces 64 `tpu_shard` nodes + 192 deduped `tpu_ici_peer` edges (6-neighbor 4×4×4 3D torus → 6·64/2 = 192 undirected edges); tpu_version=`'v4'`; partial=false | unchanged |
| AC-R56-5..6 (v5p cube parser) | All PASS; 2 runtime tests; v5p fixture produces 64 `tpu_shard` nodes + 192 deduped `tpu_ici_peer` edges; tpu_version=`'v5p'`; partial=false | unchanged |
| AC-R56-7..8 (interface conformance) | PASS; 2 runtime tests; `TpuTopologySource` constructed from v4 fixture; `snapshotHash === computeSnapshotHash` | unchanged |
| AC-R56-9 (sub-cube partial degradation) | PASS; 1 runtime test; sparse-subcube fixture (v5p, slice_shape=[2,2,2], 8 chips, 3 peers per chip mesh-only) produces 8 nodes + 12 edges + partial=true | unchanged |
| AC-R56-10 (malformed input) | PASS; 1 runtime test (6 sub-assertions covering invalid JSON, missing tpu_version, unknown tpu_version, invalid slice_shape, missing chips, empty chips) | unchanged |
| AC-R56-11 (tpu_version discriminator) | PASS; 1 runtime test; mapping `'v4'` → `partial=false` for cube fixture AND `'v5p'` → `partial=false` for cube fixture; both yield kind=`'tpu_shard'` | unchanged |
| AC-R56-12 (A16 verdict.ts literal) | PASS; 1 runtime test; verdict.ts contains `'correlational_not_causal: true'` literal | unchanged |
| AC-R56-13 (typecheck attestation) | `npx tsc -p tsconfig.test.json` exits 0; zero diagnostics; ATTESTED in NEXT-ROLE.md + `Q-R56-EMPIRICAL.sh`, not runtime-bound | unchanged |
| AC-R56-14 (test count attestation) | **Chore-A state:** `node --test test/*.test.js` reports `tests=387 / pass=381 / fail=3 / skipped=3` where the 3 fails = R36-30 + R36-31 (pre-existing R36 forward-protection inheritance) + AC-R56-15 (failing at chore-A because `CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'` is not a valid git ref). | **Chore-B state:** after Implementer injects actual chore-A SHA into `CHORE_A_SHA` literal at AC-R56-15, that test PASSES → summary returns to `tests=387 / pass=382 / fail=2 / skipped=3`. Per R53 MINOR-1 reinforcement, the two states are distinguished explicitly in the AC text + `Q-R56-EMPIRICAL.sh` blocks. |
| AC-R56-15 (anti-scope diff runtime test) | At chore-A: FAILS by construction (placeholder SHA literal not a valid git ref). At chore-B (after SHA injection): PASS; round-start-to-chore-A diff ⊆ 12-entry allowed-set (§ 3); 13th entry only if HALT-DIAGNOSTIC fires. | unchanged after chore-B |

### § 1.5 Counter-ingestion intentionally out-of-scope

Per R53 § 1.5 precedent. R56 does NOT export a TPU-specific counter-ingestion helper. Rationale: the WAVE-PLAN-07 Step 1 file-tree scope row for WU-Phase3-2A does NOT enumerate an L0-helper or `engine/l0/counter-rate-transform.ts` consumer; Phase 3 SLICE 2 is explicitly synthetic-fixture-based vendor-expansion (per Path B operator decision at WAVE-GATE-06; OQ-P3-9 RESOLVED 2026-05-19). If TPU exposes 32-bit counters that warrant a `transformPair` wrapper, that lands at Wave 8 (WU-Phase3-2B live-fetch interface) or Phase 3 SLICE 3. Out-of-scope for R56; not a halt condition.

---

## § 2 Mechanism

The TPU topology adapter is a Tessera-original concrete `TopologySource` impl that parses a JAX-style topology JSON manifest into a `TopologySnapshot` of `tpu_shard` nodes + `tpu_ici_peer` edges, with TPU generation discriminated by the `tpu_version` field and torus-vs-mesh partial-flag semantics derived from `slice_shape`.

### § 2.1 Parser (`parseTpuTopologyJson`)

Pure function. Input: raw JSON text. Output: `{ snapshot: TopologySnapshot, partial: boolean, tpu_version: 'v4' | 'v5p' | 'v5e' }`.

Steps:
1. **Parse JSON.** Call `JSON.parse(rawText)`. Wrap any throw as `Error('TPU_PARSE_INVALID_JSON: ' + originalMessage)`.
2. **Validate `tpu_version` field.** Read `parsed.tpu_version`. If not a non-empty string → throw `TPU_PARSE_MISSING_TPU_VERSION`. If not in the known set `{'v4', 'v5p', 'v5e'}` → throw `TPU_PARSE_UNKNOWN_TPU_VERSION: <value>`.
3. **Validate `slice_shape` field.** Read `parsed.slice_shape`. If not Array OR length ≠ 3 OR any element not a positive integer → throw `TPU_PARSE_INVALID_SLICE_SHAPE`. Cast to `[number, number, number]`.
4. **Validate `chips` field.** Read `parsed.chips`. If not Array → throw `TPU_PARSE_MISSING_CHIPS`. If empty → throw `TPU_PARSE_NO_CHIPS`.
5. **Compute partial flag.** `partial = slice_shape.some(dim => dim < 4)` per § 0.3 selection (sub-cube mesh-only semantics).
6. **Emit nodes.** For each `chip` in `parsed.chips`: `id = chip.chip` (string; canonical form `tpu-N`); emit `TopologyNode { id, service_name: id, kind: 'tpu_shard' }`. Track in `nodeIds: Set<string>` for opportunistic peer-emission dedup.
7. **Emit raw edge pairs.** For each `chip`, read `chip.ici_peers` (default `[]` if undefined/null). For each `peerId`: if `peerId === chip.chip` → skip (self-peer defensive guard); if `peerId` not in `nodeIds` → emit a peer node opportunistically with kind `'tpu_shard'` (mirrors R30 + R53 opportunistic-peer pattern); record raw edge pair `(chip.chip, peerId)`.
8. **Canonical dedup.** For each raw pair `(a, b)`: compute `from = (a < b ? a : b)`, `to = (a < b ? b : a)` via lex compare; insert key `${from}|${to}` into `edgeKeys: Set<string>` for dedup; emit `TopologyEdge { from, to, relationship: 'tpu_ici_peer' }` if new.
9. **Build snapshot.** `nodes` and `edges` per above; `fetched_at_ts = opts.fetched_at_ts ?? Math.floor(Date.now() / 1000)`; `source_id = opts.source_id ?? 'tpu_topology_source'`; `source_version = opts.source_version ?? \`tpu-${tpu_version}-1\`` (e.g., `'tpu-v4-1'` for v4 fixtures).

Output: `{ snapshot, partial, tpu_version }`.

### § 2.2 TopologySource class (`TpuTopologySource`)

Class implementing `TopologySource` interface (`engine/topology-overlay.ts:50-55`). Structurally parallel to `NeuronTopologySource` (`engine/topology/neuron-source.ts:140-173`) which is itself parallel to `NvlinkTopologySource` (`engine/topology/nvlink-source.ts:115-147`).

Constructor:
- Input: `jsonText: string, opts?: { id?: string; version?: string; fetched_at_ts?: number; source_id?: string; source_version?: string }`.
- Calls `parseTpuTopologyJson(jsonText, opts)` and stores `this.snapshot = snapshot`.
- `this.id = opts.id ?? snapshot.source_id ?? 'tpu_topology_source'`.
- `this.version = opts.version ?? snapshot.source_version ?? 'tpu-1'`.

Methods:
- `async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot>` → returns `this.snapshot`.
- `snapshotHash(snapshot: TopologySnapshot): string` → delegates to `computeSnapshotHash(snapshot)`.

Notes:
- The `tpu_version` field is NOT exposed on the class — it's a parser-only artifact. Callers who need it call `parseTpuTopologyJson` directly. Matches R53 `chip_family` non-exposure pattern.
- Constructor does NOT swallow parser errors. Truly malformed input (per § 1.3) throws and propagates.

### § 2.3 TPU-version discriminator + partial computation

Implementation detail of `parseTpuTopologyJson` (NOT a separately exported function — keeps surface minimal):

```typescript
// inline helpers inside parseTpuTopologyJson
const KNOWN_TPU_VERSIONS = ['v4', 'v5p', 'v5e'] as const;
type TpuVersion = (typeof KNOWN_TPU_VERSIONS)[number];

function validateTpuVersion(version: unknown): TpuVersion {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('TPU_PARSE_MISSING_TPU_VERSION');
  }
  if (!(KNOWN_TPU_VERSIONS as readonly string[]).includes(version)) {
    throw new Error(`TPU_PARSE_UNKNOWN_TPU_VERSION: ${version}`);
  }
  return version as TpuVersion;
}

function isPartialSlice(sliceShape: [number, number, number]): boolean {
  return sliceShape.some((dim) => dim < 4);
}
```

Future TPU generations (`v6e`, `v7`, ...) join the known-set via single-line addition to `KNOWN_TPU_VERSIONS`.

### § 2.4 verdict.ts schema deltas (vendored-with-deltas; two-step maintenance)

Two enum additions to the existing vendored-with-deltas file `engine/types/verdict.ts`. Both are additive (do not remove or rename existing members; preserve Addition #25 D2/D5 + Addition #26 D4):

1. **`TopologyNode.kind` union extension at `engine/types/verdict.ts:254`:**
   ```typescript
   kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack' | 'psu' | 'cooling_zone' | 'trainium_chip' | 'inferentia_chip' | 'tpu_shard';
   ```
   (R56 adds `| 'tpu_shard'` to the existing 10-member union — pre-R56 members: service / database / queue / external / gpu_shard / rack / psu / cooling_zone / trainium_chip / inferentia_chip; R56 yields 11-member union.)

2. **`TopologyEdge.relationship` union extension at `engine/types/verdict.ts:264`:**
   ```typescript
   relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains' | 'nvlink_peer' | 'neuron_link_peer' | 'tpu_ici_peer';
   ```
   (R56 adds `| 'tpu_ici_peer'` to the existing 7-member union — pre-R56 members: calls / reads / writes / publishes / contains / nvlink_peer / neuron_link_peer; R56 yields 8-member union.)

Two-step maintenance (per PHASE-2-SLICE-1-CLOSE-WALK § 2.1 + R23 + R53 precedent):
- **Step 1:** `engine/types/verdict.ts` row in `coordination/VENDORING-MANIFEST.md` note column extended to enumerate the R56 deltas (single-row note refresh). Existing note text already concatenates R18 + R23 + R53 deltas. R56 appends:
  > "R56 Phase 3 SLICE 2 deltas: TopologyNode.kind union extends with `\| 'tpu_shard'`; TopologyEdge.relationship union extends with `\| 'tpu_ici_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."
- **Step 2:** `engine/types/verdict.ts` already EXCLUDED from `test/q01-no-at-pin-deltas.test.ts` `AT_PIN_FILES` list per file-header comment lines 8 / 19 / 28 (R18 + R23 + R53 deltas already exclude verdict.ts from at-pin checks). No test list maintenance needed at R56 — Step 2 was permanently completed at R18.

---

## § 3 Anti-scope (allowed-set for round-start-to-chore-A diff)

`git diff 4447586..chore-A-SHA --name-only` must produce a subset of:

```
engine/topology/tpu-source.ts
engine/types/verdict.ts
test/q56-tpu-adapter.test.ts
test/_substrate/tpu-fixture-v4-cube.json
test/_substrate/tpu-fixture-v5p-cube.json
test/_substrate/tpu-fixture-sparse-subcube.json
coordination/VENDORING-MANIFEST.md
coordination/specs/Q-R56-SPEC.md
coordination/specs/Q-R56-SPEC-AUDIT.md
coordination/specs/Q-R56-EMPIRICAL.sh
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

**12 entries.** Verified git-trackable per R23 ARCH MINOR-2 reinforcement (Q-R56-SPEC-AUDIT.md § 4 contains the per-path `git ls-files` / `.gitignore` audit). All NEW files have parent directories that already contain tracked content of the same extension (`.ts` / `.json` / `.md` / `.sh`); no path is gitignored.

**Conditional 13th entry** (per R25 MAJOR-2 reinforcement at CLAUDE-COMMON.md REINFORCED 2026-05-17 — HALT-fire scenarios commit DIAGNOSTIC BEFORE chore-A; therefore the DIAGNOSTIC path enters the chore-A diff range):

```
coordination/diagnostics/DIAGNOSTIC-R56-*.md
```

If any halt condition (§ 6) fires mid-round and produces a `coordination/diagnostics/DIAGNOSTIC-R56-<topic>.md`, the AC-R56-15 `ALLOWED_SET` literal must include the specific DIAGNOSTIC path as its 13th entry. The Implementer adds the literal to the test ONLY if a HALT fires; otherwise the test ships with 12 entries.

**Anti-scope inheritance from NEXT-ROLE.md R56 directive + Phase 2/3 PRD:**
- A12: NO modification of inherited vendored-at-pin engine internals (`engine/topology-overlay.ts`, `engine/core.ts`, `engine/l0/counter-rate-transform.ts`, `engine/l0/schema-continuity.ts`, `engine/hardware-topology-source.ts`, `engine/topology/{slurm,k8s,nvlink,neuron}-source.ts`, `engine/topology/common-mode-attribution.ts`). `engine/types/verdict.ts` is the sole modified engine file (vendored-with-deltas; additive enum extensions only — no removal of existing members).
- A10: NO hardware diagnosis (adapter parses topology config; does NOT diagnose per-chip faults).
- A11: NO live Google Cloud TPU endpoints (per OQ-P3-2: no Google Cloud access). Synthetic fixtures only.
- A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` literal preserved; AC-R56-12).
- A17: NO DeploySignal integration (Phase 3 SLICE 3 scope).
- A13: NO ML-based attribution.
- NEW Phase 3 anti-scope per PRD:459: NO Google-Cloud-SDK-internal hooks; vendor-neutral `TopologySource` interface only.
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (OQ-Phase3-W2-2 Option B operator disposition: defer § 2.3 amendments to Phase 3 SLICE-close walk).
- NO modification of `coordination/PRD.md` Phase 3 sub-section.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing deferred — no new derivation expected this round per NEXT-ROLE.md R56 directive Rule 5 N/A row).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen historical shards).
- NO modification of any pre-R55 test file (Phase 1 + Phase 2 + Phase 3 SLICE 1 test suite frozen; q01..q41 + q-md-f4 + betting-e-process + q53 frozen).
- NO modification of `engine/topology/neuron-source.ts` (R53 frozen — read-only reference for parallel-class pattern).
- NO modification of `scripts/*` (R45-R51 deliverables stable).
- NO modification of `run-pipeline.sh` (R49-R51 deliverables stable).
- NO modification of `CLAUDE-*.md` REINFORCEMENTS sections (R51 consolidation + re-accretion guard; the Memorial-Updater stage at round close applies the threshold-aware rule, NOT this Architect spec).
- NO real customer telemetry (A8/A11 inherited).
- NO Phase 3 SLICE 2B (live-fetch interface) work (Wave 8 scope; future R58 round after WAVE-GATE-07 close).
- NO Phase 3 SLICE 3 work (DS integration; future Coordinator round emits WAVE-PLAN-09).
- NO opening any GitHub PRs.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/topology/tpu-source.ts` (NEW; Tessera-original)

```typescript
// engine/topology/tpu-source.ts — Phase 3 SLICE 2 WU-Phase3-2A Google TPU/ICI topology adapter (R56).
//
// Three exports:
//   1. parseTpuTopologyJson(jsonText, opts) — pure JSON parser for the JAX-style
//      TPU topology manifest. Produces a TopologySnapshot with `tpu_shard` nodes
//      (R56 enum addition) and `tpu_ici_peer` edges (R56 enum addition). TPU
//      generation is determined by the `tpu_version` field (known set:
//      'v4' | 'v5p' | 'v5e'); single node kind 'tpu_shard' shared across all
//      generations per WAVE-PLAN-07 frame-AC (d) single-literal decision.
//      Edges are undirected-deduped (canonical from = min(a, b) lex order on
//      `tpu-N` id form); self-peer entries are skipped; peer ids referenced in
//      `ici_peers` but absent from `chips` are emitted opportunistically as
//      nodes. Partial-flag semantics: `partial = slice_shape.some(dim < 4)`
//      (sub-cube mesh-only per Google Cloud TPU public docs retrieved
//      2026-05-19: "Slices smaller than a full cube ... don't have wrap-around
//      links that make them a 3D torus"). Failure modes throw one of:
//      TPU_PARSE_INVALID_JSON, TPU_PARSE_MISSING_TPU_VERSION,
//      TPU_PARSE_UNKNOWN_TPU_VERSION, TPU_PARSE_INVALID_SLICE_SHAPE,
//      TPU_PARSE_MISSING_CHIPS, TPU_PARSE_NO_CHIPS.
//   2. TpuTopologySource — thin TopologySource impl wrapping the parser.
//      Structurally parallel to NeuronTopologySource (R53), NvlinkTopologySource (R30),
//      and SlurmTopologySource (R28). snapshotHash delegates to
//      computeSnapshotHash per Addition #26 D6.
//   3. (No L0 counter-ingestion helper at R56; counter ingestion deferred to
//      Phase 3 SLICE 2B or SLICE 3 per WAVE-PLAN-07 file-tree scope.)
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from '../topology-overlay';

const KNOWN_TPU_VERSIONS = ['v4', 'v5p', 'v5e'] as const;
export type TpuVersion = (typeof KNOWN_TPU_VERSIONS)[number];

export interface TpuParseOpts {
  /** Epoch-seconds timestamp for the produced snapshot. Defaults to current wall clock. */
  fetched_at_ts?: number;
  /** Source-id literal for the produced snapshot. Defaults to 'tpu_topology_source'. */
  source_id?: string;
  /** Source-version literal for the produced snapshot. Defaults to `tpu-${version}-1`. */
  source_version?: string;
}

export interface TpuParseResult {
  snapshot: TopologySnapshot;
  /** true iff slice_shape has any dimension < 4 (sub-cube mesh-only; no full torus). */
  partial: boolean;
  /** TPU generation inferred from the fixture's `tpu_version` field. */
  tpu_version: TpuVersion;
}

interface TpuChipEntry {
  chip: string;
  ici_peers?: string[];
}

interface TpuTopologyRoot {
  tpu_version: string;
  slice_shape: number[];
  chips: TpuChipEntry[];
  /** Optional descriptive field; not load-bearing for the parser. */
  topology_type?: 'torus' | 'mesh';
}

function validateTpuVersion(version: unknown): TpuVersion {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('TPU_PARSE_MISSING_TPU_VERSION');
  }
  if (!(KNOWN_TPU_VERSIONS as readonly string[]).includes(version)) {
    throw new Error(`TPU_PARSE_UNKNOWN_TPU_VERSION: ${version}`);
  }
  return version as TpuVersion;
}

function validateSliceShape(sliceShape: unknown): [number, number, number] {
  if (!Array.isArray(sliceShape) || sliceShape.length !== 3) {
    throw new Error('TPU_PARSE_INVALID_SLICE_SHAPE');
  }
  for (const dim of sliceShape) {
    if (typeof dim !== 'number' || !Number.isInteger(dim) || dim < 1) {
      throw new Error('TPU_PARSE_INVALID_SLICE_SHAPE');
    }
  }
  return [sliceShape[0], sliceShape[1], sliceShape[2]];
}

function isPartialSlice(sliceShape: [number, number, number]): boolean {
  return sliceShape.some((dim) => dim < 4);
}

export function parseTpuTopologyJson(jsonText: string, opts: TpuParseOpts = {}): TpuParseResult {
  // Step 1: JSON parse with wrap-and-rethrow
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`TPU_PARSE_INVALID_JSON: ${msg}`);
  }

  // Step 2: validate top-level shape
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('TPU_PARSE_MISSING_TPU_VERSION');
  }
  const root = parsed as Partial<TpuTopologyRoot>;

  // Step 3: validate tpu_version
  const tpu_version = validateTpuVersion(root.tpu_version);

  // Step 4: validate slice_shape
  const slice_shape = validateSliceShape(root.slice_shape);

  // Step 5: validate chips array
  if (!Array.isArray(root.chips)) {
    throw new Error('TPU_PARSE_MISSING_CHIPS');
  }
  if (root.chips.length === 0) {
    throw new Error('TPU_PARSE_NO_CHIPS');
  }

  // Step 6: compute partial flag
  const partial = isPartialSlice(slice_shape);

  // Step 7: emit nodes + collect raw edge pairs
  const nodes: TopologyNode[] = [];
  const nodeIds: Set<string> = new Set();
  const rawEdgePairs: Array<[string, string]> = [];

  for (const chip of root.chips) {
    const id = chip.chip;
    if (!nodeIds.has(id)) {
      nodes.push({ id, service_name: id, kind: 'tpu_shard' });
      nodeIds.add(id);
    }
    const peers: string[] = Array.isArray(chip.ici_peers) ? chip.ici_peers : [];
    for (const peerId of peers) {
      if (peerId === id) continue; // self-peer defensive guard
      if (!nodeIds.has(peerId)) {
        nodes.push({ id: peerId, service_name: peerId, kind: 'tpu_shard' });
        nodeIds.add(peerId);
      }
      rawEdgePairs.push([id, peerId]);
    }
  }

  // Step 8: canonical undirected dedup
  const edgeKeys = new Set<string>();
  const edges: TopologyEdge[] = [];
  for (const [a, b] of rawEdgePairs) {
    const from = a < b ? a : b;
    const to   = a < b ? b : a;
    const key  = `${from}|${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ from, to, relationship: 'tpu_ici_peer' });
  }

  // Step 9: build snapshot
  const snapshot: TopologySnapshot = {
    nodes,
    edges,
    fetched_at_ts: opts.fetched_at_ts ?? Math.floor(Date.now() / 1000),
    source_id:     opts.source_id     ?? 'tpu_topology_source',
    source_version: opts.source_version ?? `tpu-${tpu_version}-1`,
  };

  return { snapshot, partial, tpu_version };
}

export class TpuTopologySource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(jsonText: string, opts: {
    id?: string;
    version?: string;
    fetched_at_ts?: number;
    source_id?: string;
    source_version?: string;
  } = {}) {
    const { snapshot } = parseTpuTopologyJson(jsonText, {
      fetched_at_ts: opts.fetched_at_ts,
      source_id: opts.source_id,
      source_version: opts.source_version,
    });
    this.snapshot = snapshot;
    // Third operands ('tpu_topology_source' / 'tpu-1') are structurally
    // unreachable: parseTpuTopologyJson always defaults snapshot.source_id /
    // source_version (typed string, never undefined). Retained for defensive
    // correctness if parseTpuTopologyJson is ever modified — mirrors R53
    // NeuronTopologySource constructor pattern.
    this.id      = opts.id      ?? snapshot.source_id     ?? 'tpu_topology_source';
    this.version = opts.version ?? snapshot.source_version ?? 'tpu-1';
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}
```

**Implementer notes (no design decisions deferred):**
- Use lex compare `a < b` on `tpu-N` ids for canonical ordering. R56 fixtures use IDs `tpu-0`..`tpu-63` (v4 + v5p cube fixtures: 64 chips with 2-digit IDs); the lex-vs-numeric mismatch for `tpu-1` < `tpu-10` does not affect AC outcomes since AC-R56-4 asserts set-equality on dedup keys (not pairwise ordering). Documented as forward-flag for future Wave 8+ rounds using ≥10-chip subset fixtures where numeric ordering becomes load-bearing (parser would need zero-padded IDs).
- The `if (peerId === chipId) continue` self-peer guard is defensive; well-formed JAX topology output should never list a chip as its own peer; the guard avoids creating malformed edges if a future fixture has this shape. NOT exercised by R56 ACs; documented as defensive code (mirrors R30 + R53 pattern).
- The `KNOWN_TPU_VERSIONS` array uses TypeScript `as const` + indexed-access type for compile-time exhaustiveness on the `TpuVersion` literal type. Future TPU generations (`v6e`, `v7`, ...) join via single-line addition to this constant; the rest of the parser handles new generations without code change (single-kind `'tpu_shard'` per WAVE-PLAN-07 frame-AC (d)).

### § 4.2 `test/_substrate/tpu-fixture-v4-cube.json` (NEW; Tessera-original)

Synthetic TPU v4 4×4×4 cube fixture per Google Cloud TPU v4 public docs (retrieved 2026-05-19): "Six interconnect links per chip" + "3D mesh and torus" + "TPU v4 slices are available in increments of 64 chips, with shapes that are multiples of 4 on all three dimensions". The 4×4×4 cube is the canonical baseline (64 chips minimum for full 3D torus). UTF-8 text, LF line endings.

**Coordinate convention:** chip at position `(x, y, z)` for `x, y, z ∈ {0, 1, 2, 3}` has `chip_index = x + y*4 + z*16` and `chip_id = \`tpu-${chip_index}\``. Chip IDs run `tpu-0` through `tpu-63`.

**Peer derivation rule (full 3D torus with wraparound on all axes):** chip at `(x, y, z)` has 6 ICI peers at:
- `((x+1) mod 4, y, z)`, `((x+3) mod 4, y, z)` — X-axis +1 / -1 with wrap
- `(x, (y+1) mod 4, z)`, `(x, (y+3) mod 4, z)` — Y-axis +1 / -1 with wrap
- `(x, y, (z+1) mod 4)`, `(x, y, (z+3) mod 4)` — Z-axis +1 / -1 with wrap

(Using `(d+3) mod 4` is equivalent to `(d-1+4) mod 4` = `(d-1) mod 4` for d ∈ {0,1,2,3} — modular -1 step.)

**Expected parse counts:** 64 nodes (all kind `tpu_shard`); 64 × 6 / 2 = **192 undirected-deduped edges**; partial=false (full cube, all dims ≥ 4); tpu_version=`'v4'`.

**Fixture JSON structure (Implementer generates 64 chip entries per the rule above):**

```json
{
  "tpu_version": "v4",
  "slice_shape": [4, 4, 4],
  "topology_type": "torus",
  "chips": [
    { "chip": "tpu-0",  "ici_peers": ["tpu-1",  "tpu-3",  "tpu-4",  "tpu-12", "tpu-16", "tpu-48"] },
    { "chip": "tpu-1",  "ici_peers": ["tpu-0",  "tpu-2",  "tpu-5",  "tpu-13", "tpu-17", "tpu-49"] },
    { "chip": "tpu-2",  "ici_peers": ["tpu-1",  "tpu-3",  "tpu-6",  "tpu-14", "tpu-18", "tpu-50"] },
    { "chip": "tpu-3",  "ici_peers": ["tpu-0",  "tpu-2",  "tpu-7",  "tpu-15", "tpu-19", "tpu-51"] },
    { "chip": "tpu-4",  "ici_peers": ["tpu-0",  "tpu-5",  "tpu-7",  "tpu-8",  "tpu-20", "tpu-52"] },
    "...remaining 59 entries follow the same coordinate-derivation rule above..."
  ]
}
```

**Implementer task:** generate the 64 chip entries by applying the peer-derivation rule to every `(x, y, z) ∈ {0,1,2,3}^3`. The Implementer MAY write a one-time generator script in any language (e.g., Node REPL one-liner, Python script) to produce the JSON, then commits the JSON file. The generator script itself is NOT a committed artifact; only the produced JSON file is. The 4 chip entries above are provided as anchoring samples — verify the rule by extending: `tpu-5` at `(1,1,0)` has peers `[tpu-4, tpu-6, tpu-1, tpu-9, tpu-21, tpu-53]` per `((0,1,0), (2,1,0), (1,0,0), (1,2,0), (1,1,1), (1,1,3))`.

### § 4.3 `test/_substrate/tpu-fixture-v5p-cube.json` (NEW; Tessera-original)

Synthetic TPU v5p 4×4×4 cube fixture per Google Cloud TPU v5p public docs (retrieved 2026-05-19): "Bidirectional inter-chip interconnect (ICI) bandwidth per chip (GBps): 1200" + "All 4x4x4 and larger slices (one cube) have full 3D torus connectivity". UTF-8 text, LF line endings.

**Identical topology shape to § 4.2** (4×4×4 full torus, 64 chips, 6 peers each, 192 undirected edges). The only differing field is `tpu_version`. The Implementer MAY reuse the v4 fixture's chip entries verbatim and change only the `tpu_version` literal (this is the canonical "different generation, same topology shape" path — v4 and v5p both have 4×4×4 as the cube baseline).

**Expected parse counts:** 64 nodes (all kind `tpu_shard`); 192 undirected-deduped edges; partial=false; tpu_version=`'v5p'`.

```json
{
  "tpu_version": "v5p",
  "slice_shape": [4, 4, 4],
  "topology_type": "torus",
  "chips": [
    { "chip": "tpu-0",  "ici_peers": ["tpu-1",  "tpu-3",  "tpu-4",  "tpu-12", "tpu-16", "tpu-48"] },
    "...remaining 63 entries follow the same coordinate-derivation rule as v4 cube..."
  ]
}
```

### § 4.4 `test/_substrate/tpu-fixture-sparse-subcube.json` (NEW; Tessera-original)

Synthetic v5p 2×2×2 sub-cube fixture per Google Cloud TPU v5p public docs (retrieved 2026-05-19): "Slices smaller than a full cube are 3D connected, however, they don't have wrap-around links that make them a 3D torus." UTF-8 text, LF line endings.

**Coordinate convention:** chip at position `(x, y, z)` for `x, y, z ∈ {0, 1}` has `chip_index = x + y*2 + z*4` and `chip_id = \`tpu-${chip_index}\``. Chip IDs run `tpu-0` through `tpu-7`.

**Peer derivation rule (3D mesh; NO wraparound — sub-cube per public-doc semantic):** chip at `(x, y, z)` has up to 3 ICI peers at:
- `(x+1, y, z)` if `x < 1` (no wraparound)
- `(x-1, y, z)` if `x > 0`
- `(x, y+1, z)` if `y < 1`
- `(x, y-1, z)` if `y > 0`
- `(x, y, z+1)` if `z < 1`
- `(x, y, z-1)` if `z > 0`

In a 2×2×2 grid, each position has exactly 3 in-range neighbors (one +1 step in each axis from the corner) → 3 peers per chip.

**Expected parse counts:** 8 nodes (all kind `tpu_shard`); 8 × 3 / 2 = **12 undirected-deduped edges**; partial=true (slice_shape has dims < 4 → sub-cube per § 0.3 semantic); tpu_version=`'v5p'`.

```json
{
  "tpu_version": "v5p",
  "slice_shape": [2, 2, 2],
  "topology_type": "mesh",
  "chips": [
    { "chip": "tpu-0", "ici_peers": ["tpu-1", "tpu-2", "tpu-4"] },
    { "chip": "tpu-1", "ici_peers": ["tpu-0", "tpu-3", "tpu-5"] },
    { "chip": "tpu-2", "ici_peers": ["tpu-0", "tpu-3", "tpu-6"] },
    { "chip": "tpu-3", "ici_peers": ["tpu-1", "tpu-2", "tpu-7"] },
    { "chip": "tpu-4", "ici_peers": ["tpu-0", "tpu-5", "tpu-6"] },
    { "chip": "tpu-5", "ici_peers": ["tpu-1", "tpu-4", "tpu-7"] },
    { "chip": "tpu-6", "ici_peers": ["tpu-2", "tpu-4", "tpu-7"] },
    { "chip": "tpu-7", "ici_peers": ["tpu-3", "tpu-5", "tpu-6"] }
  ]
}
```

(8 chip entries; fully enumerated.)

### § 4.5 `test/q56-tpu-adapter.test.ts` (NEW; Tessera-original)

```typescript
// test/q56-tpu-adapter.test.ts — Phase 3 SLICE 2 WU-Phase3-2A bindings (R56).
//
// Binds AC-R56-1 through AC-R56-12 + AC-R56-15 (13 runtime tests) per
// Q-R56-SPEC.md § 5. AC-R56-13 (typecheck) and AC-R56-14 (test count) are
// binding-command attestations reported by the Implementer at chore-A;
// not runtime-bound. They are mechanically verified by
// coordination/specs/Q-R56-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation` (R46 canonical landing).
//
// AC-R56-15 (anti-scope diff) is a runtime test that the Implementer
// appends in chore-B with the chore-A SHA substituted into the diff
// baseline literal.
//
// Covers: JAX-style TPU topology JSON parser (v4 4x4x4 cube + v5p 4x4x4
// cube + 2x2x2 sub-cube); tpu_version discrimination (v4 / v5p both →
// tpu_shard node kind); edge relationship = 'tpu_ici_peer' (R56 enum
// addition); undirected-deduped canonical ordering; TpuTopologySource
// interface conformance; snapshotHash delegation; id/version fallback
// chain; sub-cube partial detection (slice_shape.some(dim < 4)); throw on
// 6 malformed-input shapes; A16 verdict.ts literal preservation;
// anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseTpuTopologyJson,
  TpuTopologySource,
} from '../engine/topology/tpu-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

const V4_CUBE       = readFileSync('test/_substrate/tpu-fixture-v4-cube.json',          'utf8');
const V5P_CUBE      = readFileSync('test/_substrate/tpu-fixture-v5p-cube.json',         'utf8');
const SPARSE_SUBCUBE = readFileSync('test/_substrate/tpu-fixture-sparse-subcube.json',  'utf8');

// AC-R56-1: v4 cube fixture parses to 64 tpu_shard nodes + 192 tpu_ici_peer edges
test('AC-R56-1: parseTpuTopologyJson on v4 4x4x4 cube → 64 nodes + 192 edges + tpu_version=v4 + partial=false', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 64);
  assert.strictEqual(snapshot.edges.length, 192);
  assert.strictEqual(partial, false);
  assert.strictEqual(tpu_version, 'v4');
});

// AC-R56-2: every v4 fixture node has kind === 'tpu_shard'
test("AC-R56-2: every node from v4 fixture has kind === 'tpu_shard'", () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'tpu_shard');
  }
});

// AC-R56-3: every v4 fixture edge has relationship === 'tpu_ici_peer'
test("AC-R56-3: every edge from v4 fixture has relationship === 'tpu_ici_peer'", () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'tpu_ici_peer');
  }
});

// AC-R56-4: v4 edges are canonical undirected-deduped (from < to lex); 192 unique pairs
test('AC-R56-4: v4 edges are canonical undirected-deduped (from < to); 192 unique pairs', () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  assert.strictEqual(keys.length, 192, 'exactly 192 deduped edges');
});

// AC-R56-5: v5p cube fixture parses to 64 tpu_shard nodes + 192 tpu_ici_peer edges
test('AC-R56-5: parseTpuTopologyJson on v5p 4x4x4 cube → 64 nodes + 192 edges + tpu_version=v5p + partial=false', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(V5P_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 64);
  assert.strictEqual(snapshot.edges.length, 192);
  assert.strictEqual(partial, false);
  assert.strictEqual(tpu_version, 'v5p');
});

// AC-R56-6: every v5p fixture node has kind === 'tpu_shard' AND every edge has 'tpu_ici_peer'
test("AC-R56-6: every node from v5p fixture has kind === 'tpu_shard' and edges have 'tpu_ici_peer'", () => {
  const { snapshot } = parseTpuTopologyJson(V5P_CUBE);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'tpu_shard');
  }
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'tpu_ici_peer');
  }
});

// AC-R56-7: TpuTopologySource implements TopologySource interface
// AND id/version fallback chain branches are observable
test('AC-R56-7: TpuTopologySource implements TopologySource + id/version fallback', async () => {
  // (a) default construction — exercises branch 2 of `??`-chain
  //     (opts.id undefined → snapshot.source_id default literal 'tpu_topology_source')
  const src = new TpuTopologySource(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(src.id, 'tpu_topology_source');
  assert.strictEqual(src.version, 'tpu-v4-1');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);

  // (b) explicit opts.id + opts.version — exercises branch 1 of `??`-chain
  const srcExplicit = new TpuTopologySource(V4_CUBE, {
    id: 'explicit-test-id',
    version: 'explicit-test-ver',
    fetched_at_ts: 1_700_000_000,
  });
  assert.strictEqual(srcExplicit.id, 'explicit-test-id');
  assert.strictEqual(srcExplicit.version, 'explicit-test-ver');
});

// AC-R56-8: snapshotHash delegates to computeSnapshotHash
test('AC-R56-8: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new TpuTopologySource(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R56-9: sparse sub-cube fixture (slice_shape=[2,2,2]) → 8 nodes + 12 edges + partial=true
test('AC-R56-9: sparse sub-cube fixture (2x2x2 mesh-only) → 8 nodes + 12 edges + partial=true', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(SPARSE_SUBCUBE);
  assert.strictEqual(snapshot.nodes.length, 8);
  assert.strictEqual(snapshot.edges.length, 12);
  assert.strictEqual(partial, true);
  assert.strictEqual(tpu_version, 'v5p');
});

// AC-R56-10: malformed input throws one of the documented error names (6 sub-cases)
test('AC-R56-10: malformed input throws TPU_PARSE_* (6 sub-cases)', () => {
  // (a) invalid JSON
  assert.throws(() => parseTpuTopologyJson('not-json'), /TPU_PARSE_INVALID_JSON/);
  // (b) missing tpu_version
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ slice_shape: [4, 4, 4], chips: [] })),
    /TPU_PARSE_MISSING_TPU_VERSION/,
  );
  // (c) unknown tpu_version
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v99', slice_shape: [4, 4, 4], chips: [{ chip: 'tpu-0' }] })),
    /TPU_PARSE_UNKNOWN_TPU_VERSION: v99/,
  );
  // (d) invalid slice_shape (not array of 3 positive integers)
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4], chips: [{ chip: 'tpu-0' }] })),
    /TPU_PARSE_INVALID_SLICE_SHAPE/,
  );
  // (e) missing chips
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4, 4] })),
    /TPU_PARSE_MISSING_CHIPS/,
  );
  // (f) empty chips
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4, 4], chips: [] })),
    /TPU_PARSE_NO_CHIPS/,
  );
});

// AC-R56-11: tpu_version discriminator: v4 and v5p both → tpu_shard nodes
test('AC-R56-11: tpu_version discriminator maps v4 + v5p both → tpu_shard node kind', () => {
  const { tpu_version: tv_v4,  snapshot: snap_v4  } = parseTpuTopologyJson(V4_CUBE);
  assert.strictEqual(tv_v4, 'v4');
  assert.strictEqual(snap_v4.nodes[0].kind, 'tpu_shard');

  const { tpu_version: tv_v5p, snapshot: snap_v5p } = parseTpuTopologyJson(V5P_CUBE);
  assert.strictEqual(tv_v5p, 'v5p');
  assert.strictEqual(snap_v5p.nodes[0].kind, 'tpu_shard');
});

// AC-R56-12: A16 — engine/types/verdict.ts retains the 'correlational_not_causal: true' literal
test("AC-R56-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal", () => {
  const text = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(
    text.includes('correlational_not_causal: true'),
    "verdict.ts must contain literal 'correlational_not_causal: true' per Addition #26 D4",
  );
});

// AC-R56-15: anti-scope file-set diff against round-start baseline 4447586
// (Appended by Implementer at chore-B with chore-A SHA substituted.)
test('AC-R56-15: round-start-to-chore-A diff ⊆ R56 allowed-set (chore-A SHA pinned)', () => {
  const BASELINE_SHA = '4447586';
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/tpu-source.ts',
    'engine/types/verdict.ts',
    'test/q56-tpu-adapter.test.ts',
    'test/_substrate/tpu-fixture-v4-cube.json',
    'test/_substrate/tpu-fixture-v5p-cube.json',
    'test/_substrate/tpu-fixture-sparse-subcube.json',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/specs/Q-R56-SPEC.md',
    'coordination/specs/Q-R56-SPEC-AUDIT.md',
    'coordination/specs/Q-R56-EMPIRICAL.sh',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 13th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R56 path in chore-A diff: ${p}`);
  }
});
```

**Implementer notes:**
- AC-R56-13 and AC-R56-14 are NOT runtime tests; they are binding-command attestations mechanically verified by `coordination/specs/Q-R56-EMPIRICAL.sh` (per Rule 1 sub-class `empirical-command-attestation` R46 canonical landing). The Implementer attests in NEXT-ROLE.md by quoting the script's verbatim output.
- The CHORE_A_SHA placeholder `<INJECTED-AT-CHORE-B>` is substituted with the actual SHA after chore-A is committed; AC-R56-15 is appended in a chore-B commit per R23 / R25 / R30 / R53 precedent. **Per R53 MINOR-1 reinforcement (recently added 2026-05-19):** at chore-A, AC-R56-15 FAILS by construction (placeholder is not a valid git ref); after chore-B SHA injection, AC-R56-15 PASSES. AC-R56-14 test-count prediction (§ 5) distinguishes the two states explicitly.
- TDD discipline (R23 IMPL MINOR-1): RED commit prefix before combined test+impl commit. The TypeScript imports + assertion blocks fail at RED because `parseTpuTopologyJson` / `TpuTopologySource` / the schema literals do not yet exist; GREEN commit lands implementation + verdict.ts deltas + fixture files together.

### § 4.6 `coordination/specs/Q-R56-EMPIRICAL.sh` (NEW; Tessera-original; Rule 1 sub-class self-application)

Executable bash file (`chmod +x`) housing one labeled block per empirical AC. Each block exits non-zero on mismatch; aggregate exit code reported by `scripts/verify-empirical-acs.sh R56`. Convention mirrors `coordination/specs/Q-R53-EMPIRICAL.sh` (R53 precedent).

Required blocks:
- **File-existence checks** (one block each): `[ -f engine/topology/tpu-source.ts ]`, `[ -f test/q56-tpu-adapter.test.ts ]`, `[ -f test/_substrate/tpu-fixture-v4-cube.json ]`, `[ -f test/_substrate/tpu-fixture-v5p-cube.json ]`, `[ -f test/_substrate/tpu-fixture-sparse-subcube.json ]`.
- **Schema-extension verification** (one block each):
  - `grep -c "'tpu_shard'" engine/types/verdict.ts` ≥ 1
  - `grep -c "'tpu_ici_peer'" engine/types/verdict.ts` ≥ 1
- **AC-R56-12** (A16 literal): `grep -c 'correlational_not_causal: true' engine/types/verdict.ts`; assert count ≥ 1.
- **AC-R56-13** (tsc exit): `npx tsc -p tsconfig.test.json`; assert `EXIT=0`.
- **AC-R56-14** (test summary): `node --test --test-reporter=tap test/*.test.js`; parse `# tests N`, `# pass N`, `# fail N`, `# skipped N`; assert summary `tests/pass/fail/skipped = 387/382/2/3` (post-chore-B predicted; if actual differs, the Implementer attests the actual value verbatim per false-compliance-attestation prevention). **At chore-A pre-SHA-injection state**, expected summary is `387/381/3/3` (AC-R56-15 fails by construction); the script's assert should be marked with a comment noting the two-state distinction per R53 MINOR-1 reinforcement.
- **AC-R56-15** (anti-scope advisory): manual `git diff ${ROUND_START_SHA}..${CHORE_A_SHA} --name-only` ⊆ ALLOWED_SET; advisory PASS (Implementer attests at chore-A).

Aggregate: exit 0 iff all blocks PASS; exit 1 otherwise. Invocation at chore-A: `bash coordination/specs/Q-R56-EMPIRICAL.sh`. (Implementer may run via `scripts/verify-empirical-acs.sh R56` per R46/R51 harness convention.)

### § 4.7 `coordination/VENDORING-MANIFEST.md` (MODIFIED; one row's note column refresh)

The `engine/types/verdict.ts` row in the "DeploySignal engine vendoring" table at line 31 is the only row touched. Its current note text concatenates R18 + R23 + R53 deltas:

> "R18 Phase 2 SLICE 1 deltas: ... R23 Phase 2 SLICE 3.A deltas: ... R53 Phase 3 SLICE 1 deltas: TopologyNode.kind union extends with `\| 'trainium_chip' \| 'inferentia_chip'`; TopologyEdge.relationship union extends with `\| 'neuron_link_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."

R56 appends to the same note cell (single newline-separated extension; no other row touched):

> "R56 Phase 3 SLICE 2 deltas: TopologyNode.kind union extends with `\| 'tpu_shard'`; TopologyEdge.relationship union extends with `\| 'tpu_ici_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."

No other manifest column or row is modified.

---

## § 5 Acceptance criteria

**Preamble — Attestation classification:**
- **Runtime ACs:** AC-R56-1 through AC-R56-12 + AC-R56-15 (13 runtime tests in `test/q56-tpu-adapter.test.ts`). AC-R56-15 fails by construction at chore-A (placeholder SHA literal); passes at chore-B (after Implementer injects actual chore-A SHA into the `CHORE_A_SHA` literal).
- **Binding-command attestation ACs (mechanically verified by `Q-R56-EMPIRICAL.sh`; reported in NEXT-ROLE.md at chore-A; NOT runtime-bound):** AC-R56-13 (typecheck), AC-R56-14 (test count).
- **Total ACs:** 15.

Verified per R20 ARCH MINOR-1 reinforcement (AC-table preamble cross-check): each preamble classification claim matches § 4 prescription — AC-R56-13/14 are described as binding-command attestations and § 4.5 + § 4.6 prescribe them as `Q-R56-EMPIRICAL.sh` blocks + NEXT-ROLE.md attestations, NOT as `test()` declarations. AC-R56-1..12 + AC-R56-15 are described as runtime tests and § 4.5 prescribes them as `test()` declarations.

| AC | Given / When / Then | Bound by |
|---|---|---|
| AC-R56-1 | Given `test/_substrate/tpu-fixture-v4-cube.json` text, when `parseTpuTopologyJson(text)` runs, then `snapshot.nodes.length === 64` AND `snapshot.edges.length === 192` AND `partial === false` AND `tpu_version === 'v4'`. | `test/q56-tpu-adapter.test.ts` `test('AC-R56-1: ...')` |
| AC-R56-2 | Given the v4 cube fixture, when iterating `snapshot.nodes`, then every node's `kind` is exactly `'tpu_shard'` (R56 enum addition). | `test('AC-R56-2: ...')` |
| AC-R56-3 | Given the v4 cube fixture, when iterating `snapshot.edges`, then every edge's `relationship` is exactly `'tpu_ici_peer'` (R56 enum addition). | `test('AC-R56-3: ...')` |
| AC-R56-4 | Given the v4 cube fixture, when iterating `snapshot.edges`, then (a) every edge has `from < to` (lex); (b) edge pair-keys are unique; (c) total deduped edge count = 192. | `test('AC-R56-4: ...')` |
| AC-R56-5 | Given `test/_substrate/tpu-fixture-v5p-cube.json` text, when `parseTpuTopologyJson(text)` runs, then `snapshot.nodes.length === 64` AND `snapshot.edges.length === 192` AND `partial === false` AND `tpu_version === 'v5p'`. | `test('AC-R56-5: ...')` |
| AC-R56-6 | Given the v5p cube fixture, when iterating `snapshot.nodes` and `snapshot.edges`, then every node's `kind === 'tpu_shard'` AND every edge's `relationship === 'tpu_ici_peer'`. | `test('AC-R56-6: ...')` |
| AC-R56-7 | Given the v4 cube fixture text, when constructing `new TpuTopologySource(text, opts)` (a) with default opts (no `id`/`version` provided) and (b) with explicit `{ id: 'explicit-test-id', version: 'explicit-test-ver' }`, then (a) `instance.id === 'tpu_topology_source'` AND `instance.version === 'tpu-v4-1'` (branch 2 of `??`-chain: parser-default snapshot.source_id / source_version flow through); `await instance.fetchSnapshot()` returns a `TopologySnapshot` with array `nodes` + `edges`; `instance.snapshotHash(snapshot)` returns a non-empty string; (b) `instance.id === 'explicit-test-id'` AND `instance.version === 'explicit-test-ver'` (branch 1 of `??`-chain: explicit opts override). | `test('AC-R56-7: ...')` |
| AC-R56-8 | Given a `TpuTopologySource` instance and its snapshot, when comparing `instance.snapshotHash(snapshot)` to `computeSnapshotHash(snapshot)`, then the two strings are equal. | `test('AC-R56-8: ...')` |
| AC-R56-9 | Given `test/_substrate/tpu-fixture-sparse-subcube.json` (v5p, slice_shape=[2,2,2], 8 chips, 3 mesh peers each), when `parseTpuTopologyJson(text)` runs, then `snapshot.nodes.length === 8` AND `snapshot.edges.length === 12` AND `partial === true` (sub-cube mesh-only per § 0.3 semantic) AND `tpu_version === 'v5p'`. | `test('AC-R56-9: ...')` |
| AC-R56-10 | Given 6 malformed inputs — (a) invalid JSON `'not-json'`, (b) JSON with no `tpu_version`, (c) JSON with `tpu_version: 'v99'` (unknown), (d) JSON with `slice_shape: [4, 4]` (length ≠ 3), (e) JSON with `tpu_version: 'v4'` + `slice_shape: [4,4,4]` but no `chips`, (f) JSON with `tpu_version: 'v4'` + `slice_shape: [4,4,4]` + empty `chips: []` — when `parseTpuTopologyJson(text)` runs, then each throws matching `/TPU_PARSE_INVALID_JSON/`, `/TPU_PARSE_MISSING_TPU_VERSION/`, `/TPU_PARSE_UNKNOWN_TPU_VERSION: v99/`, `/TPU_PARSE_INVALID_SLICE_SHAPE/`, `/TPU_PARSE_MISSING_CHIPS/`, `/TPU_PARSE_NO_CHIPS/` respectively. | `test('AC-R56-10: ...')` |
| AC-R56-11 | Given the v4 cube fixture and the v5p cube fixture, when each is parsed, then v4 fixture → `tpu_version === 'v4'` AND first node `kind === 'tpu_shard'`; v5p fixture → `tpu_version === 'v5p'` AND first node `kind === 'tpu_shard'`. (Verifies both generations produce the same node kind.) | `test('AC-R56-11: ...')` |
| AC-R56-12 | Given `engine/types/verdict.ts` at HEAD, when reading the file as a string, then it contains the literal `'correlational_not_causal: true'` (preserving Addition #26 D4 per A16). | `test('AC-R56-12: ...')` |
| AC-R56-13 | Given the round-end working tree at chore-A SHA, when running `npx tsc -p tsconfig.test.json`, then exit code = 0 (the empirical R56 baseline; inherits R53 clean tsc surface) AND no new diagnostics reference `engine/topology/tpu-source.ts`, `test/q56-tpu-adapter.test.ts`, or `engine/types/verdict.ts` R56 deltas. Attestation recorded in NEXT-ROLE.md verbatim via `coordination/specs/Q-R56-EMPIRICAL.sh` execution output — do NOT reframe as compliance (Rule 1 sub-class `false-compliance-attestation` R26 MAJOR-1 prevention). | NEXT-ROLE.md attestation (Implementer at chore-A) + `Q-R56-EMPIRICAL.sh` AC-R56-13 block |
| AC-R56-14 | Given the round-end working tree, when running `node --test --test-reporter=tap test/*.test.js`: **(chore-A state)** output reports `tests=387 / pass=381 / fail=3 / skipped=3` where the 3 fails = AC-R36-30 (pre-existing) + AC-R36-31 (pre-existing) + AC-R56-15 (failing by construction due to `<INJECTED-AT-CHORE-B>` placeholder SHA); **(chore-B state, after SHA injection)** output reports `tests=387 / pass=382 / fail=2 / skipped=3` (AC-R56-15 now passes). The 2 persistent failures are the R36 forward-protection guards (CHORE_A_SHA literal `87e372f` predates Phase 3 routing; pre-existing inheritance from Phase 2 close). Per R53 MINOR-1 reinforcement: the two states are distinguished explicitly in `Q-R56-EMPIRICAL.sh` blocks. If actual differs from predicted, the Implementer attests the actual value, not the predicted (Rule 1 sub-class `empirical-command-attestation` R46 canonical landing). | NEXT-ROLE.md attestation (Implementer at chore-A AND chore-B) + `Q-R56-EMPIRICAL.sh` AC-R56-14 block |
| AC-R56-15 | Given baseline SHA `4447586` and chore-A SHA (substituted at chore-B), when running `git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, then every output path is a member of the 12-entry allowed-set (§ 3) OR the 13th entry IFF a HALT fired mid-round. | `test('AC-R56-15: ...')` |

---

## § 6 Halt conditions (NEXT-ROLE.md-mandated + spec-prescribed procedure)

### § 6.1 NEXT-ROLE.md halt conditions (per R56 directive lines 87-91)

1. **Q-R56-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **JAX/TPU public docs insufficient for fixture design:** if Architect-prescribed fixture format is empirically incompatible with JAX programmatic topology output, HALT + DIAGNOSTIC + ESCALATE. Mitigated by Architect using Google Cloud TPU v4 + v5p public docs at `cloud.google.com/tpu/docs/v4` + `cloud.google.com/tpu/docs/v5p` (retrieved 2026-05-19 via WAVE-PLAN-07 Step 1 evidence; § 0.1 + § 4.2-4.4).
3. **D5 schema-write-conflict regression:** if Architect spec inadvertently sequences TPU + future-SLICE-2B work in ways that introduce D5 write-conflict on `engine/types/verdict.ts`, HALT + DIAGNOSTIC. Mitigated by § 0.2 Approach A pick (single file) and SLICE 2B explicitly being a Wave 8 future round (no concurrent verdict.ts modification by R56).
4. **Phase 1/2 ACs regress:** if test baseline changes any of AC-P1 through AC-P4 properties (R36 + earlier ACs), HALT + DIAGNOSTIC per AC-P7 cross-cutting. Mitigated by AC-R56-14 (predicted 374 baseline preserved modulo R56 additions).
5. **Test baseline drift other than R56 additions:** any unexpected shift beyond +13 (the R56 runtime test additions) → HALT + DIAGNOSTIC.

### § 6.2 Spec-prescribed halt conditions (mirrors R53 § 6.2)

6. **JSON parsing requires modifying inherited `engine/topology-overlay.ts` BFS body or `TopologySource` interface declaration** — A12 violation; HALT + DIAGNOSTIC + ESCALATE to Coordinator.
7. **TPU format requires a node-kind or edge-relationship literal beyond the two R56 additions** — vendored-with-deltas re-amendment; HALT + DIAGNOSTIC + ESCALATE.
8. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per cross-project Rule 1 sub-class `false-compliance-attestation` (R26 MAJOR-1 reinforcement). DO NOT reframe; do NOT silently absorb.

### § 6.3 Halt procedure

On any halt condition firing:
1. STOP work on the current task.
2. Write `coordination/diagnostics/DIAGNOSTIC-R56-<topic>.md` describing: trigger (which halt condition + quoted actual mismatch); bounded resolution options (Option A / B / C with consequences); recommended option + rationale.
3. Commit the DIAGNOSTIC.
4. Update `coordination/NEXT-ROLE.md`: `NEXT-ROLE: ARCHITECT` (or COORDINATOR for cross-cluster issues); `STATUS: ESCALATE`; reference the DIAGNOSTIC by path.
5. Append the 13th entry `coordination/diagnostics/DIAGNOSTIC-R56-<topic>.md` to AC-R56-15 ALLOWED_SET when implementing the test (per § 3 conditional clause).

Per R25 MAJOR-2 reinforcement (CLAUDE-COMMON.md REINFORCED 2026-05-17): the DIAGNOSTIC file commit lands BEFORE chore-A; therefore the DIAGNOSTIC path enters the round-start-to-chore-A diff. The 13th-entry provision in § 3 is the spec's explicit pre-authorization for this case. If the Implementer is uncertain whether expanding the ALLOWED_SET to include the DIAGNOSTIC path is authorized, HALT for spec amendment rather than expand silently.

### § 6.4 R26 MAJOR-1 false-compliance-attestation prevention (sub-class)

If `npx tsc -p tsconfig.test.json` produces a NEW diagnostic referencing `engine/topology/tpu-source.ts`, `test/q56-tpu-adapter.test.ts`, or the `engine/types/verdict.ts` R56 deltas, the Implementer MUST:
- NOT reframe the diagnostic as a "warning" or attribute it to pre-existing infra.
- NOT silently extend the spec's `tsc` AC text to accommodate the new diagnostic.
- HALT and write a DIAGNOSTIC enumerating: the new diagnostic verbatim, the source line, the resolution options.
- ESCALATE to Architect.

The baseline empirical `tsc` exit 0 (verified at session entry) is the load-bearing property; any new diagnostic from R56 code is a regression, not an inheritance.

---

## § 7 Apply all 7 cross-project rules UPFRONT (per SPEC-AUTHORING-CHECKLIST § Rule 7 gate)

Per `coordination/SPEC-AUTHORING-CHECKLIST.md` "Spec § 7 enumeration directive" + `~/.claude/CROSS-PROJECT-MEMORIAL.md:3474-3478` Rule 7 canonical landing.

| Rule | Sub-class / pattern | R56 status | Round-specific check |
|---|---|---|---|
| 1 | `false-compliance-attestation` / `empirical-command-attestation` | **ACTIVE GATE** | `coordination/specs/Q-R56-EMPIRICAL.sh` runs at chore-A; reports per-AC pass/fail via `scripts/verify-empirical-acs.sh R56`. AC-R56-13 (tsc exit), AC-R56-14 (test count with explicit chore-A / chore-B state distinction per R53 MINOR-1), AC-R56-12 (A16 literal), file-existence + schema-extension grep blocks. All numeric values cited as ACTUAL output of running the command at chore-A SHA — NOT memorized from spec text. § 4.6 prescribes the script. |
| 2 | `architect-branch-binding-coverage` | **ACTIVE GATE** | Q-R56-SPEC-AUDIT.md § 2.5 enumerates every guard / default / fallback in `engine/topology/tpu-source.ts` with binding AC or non-load-bearing rationale: 6 throw paths (AC-R56-10), opportunistic-peer-emission (covered by AC-R56-1 + AC-R56-5 expected counts), self-peer guard (defensive; not bound; documented), partial-flag boolean computation (AC-R56-1 + AC-R56-5 partial=false; AC-R56-9 partial=true), id/version fallback chain (3 branches in §2.2; binding via AC-R56-7 sub-cases for branches 1+2). |
| 3 | `implementer-spec-test-assertion-coverage` | **ACTIVE GATE** | Each AC Then-clause field uses discriminating assertions: `strictEqual` for counts/literals (AC-R56-1..6..9..11), set-equality for dedup keys (AC-R56-4), `assert.throws` with anchored regex for error names (AC-R56-10 — six separate regex per sub-case anchored to distinguishing literal `: <value>` segment per R30 MINOR-1 reinforcement where applicable). |
| 4 | `anti-scope-allowed-set-forward-coverage` | **ACTIVE GATE** | ALLOWED_SET enumerated in § 3 at spec-emit time; 12 base entries + conditional 13th. AC-R56-15 reads its own literal (one source of truth in `test/q56-tpu-adapter.test.ts`); spec amendment required FIRST before any ALLOWED_SET expansion (no silent expansion at chore-A). |
| 5 | `rule-derivation-without-self-application` (`self-application-gate`) | **N/A** | No new rule is derived at R56. R56 is single-cluster vendor expansion (Wave 7 of Phase 3 SLICE 2). The Memorial-Updater stage at round close does not anticipate new rule derivation; if any surfaces, Surface (c) re-application gate fires (per SPEC-AUTHORING-CHECKLIST § Round-of-derivation Surface (c) special case). NEXT-ROLE.md R56 directive line 81 marks Rule 5 N/A explicitly. |
| 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | **ACTIVE GATE** | § 6.1 + § 6.2 enumerate 8 halt-condition triggers; each carries a HALT + DIAGNOSTIC + ESCALATE prescription. The Implementer at chore-A MUST verify: if any halt-condition trigger fires during implementation (especially § 6.2 trigger 8 binding-command-vs-AC mismatch), DIAGNOSTIC file MUST exist in `coordination/diagnostics/DIAGNOSTIC-R56-<topic>.md` AND `STATUS: ESCALATE` in NEXT-ROLE.md. If no halt fires: mark N/A in MEMORIAL.md attestation. |
| 7 | `derived-rule-propagation-mechanism-required` | **ACTIVE GATE per Surface (a)** | Spec § 7 enumeration directive honored: this section enumerates all 7 rules with active-gate / N/A / already-validated dispositions per `SPEC-AUTHORING-CHECKLIST.md:130-143`. Surface (b) (`scripts/pre-commit-rule-sweep.sh`) fires at chore-A pre-commit. Surface (c) (round-of-derivation self-application) is N/A — no derivation expected this round per NEXT-ROLE.md directive Rule 5 N/A row. |

---

## § 8 Open questions

### § 8.1 OQ-Phase3-W2-1 (resolved by operator disposition; documented for transparency)

WAVE-PLAN-07 Step 3 Judgment call 2 surfaced OQ-Phase3-W2-1 (file layout for TPU adapter under `engine/topology/`). Operator dispositioned Option A on 2026-05-19 per NEXT-ROLE.md line 17 (single unified `engine/topology/tpu-source.ts`). Per § 0.2 Approach A selection. No halt; no PRD amendment.

### § 8.2 OQ-Phase3-W2-2 (resolved by operator disposition; documented for transparency)

WAVE-PLAN-07 Step 3 Judgment call 3 surfaced OQ-Phase3-W2-2 (SCOPING-MEMO § 2.3 amendment timing for Phase 3 SLICE 2). Operator dispositioned Option B on 2026-05-19 per NEXT-ROLE.md line 18 (defer to Phase 3 SLICE-close walk). No amendment lands at R56 — the SCOPING-MEMO Vendor fungibility table line 287 update ("Parallel-class — future `tpu-source.ts` slot in beside it" → "TPU shipped at R56") is deferred to the future Coordinator close-walk round after WAVE-GATE-08. Logged at MEMORIAL.md at round close.

**No halt** — operator-dispositioned ambiguity.

### § 8.3 GPU-id-style lex-vs-numeric ordering for `tpu-N` IDs ≥ 10

For single-digit IDs (`tpu-0`..`tpu-9`), lex order matches numeric. The R56 cube fixtures use IDs `tpu-0`..`tpu-63`; the comparison `tpu-1` < `tpu-10` is lex-true but numeric-false (1 < 10). AC-R56-4 asserts (a) `from < to` lex and (b) set-equality on dedup keys; the dedup correctness does not depend on lex-vs-numeric matching (any consistent ordering deduplicates symmetric pairs). The forward-flag mirrors R30 § 7.2 + R53 § 8.2: if a future round needs ≥10 TPU IDs to be numeric-ordered, parser would need zero-padding (`tpu-00`..`tpu-63`). Tracked for Phase 3 SLICE 2B + future vendor adapters; not R56 scope.

**No halt** — ordering convention works for R56 ACs; documented for forward-flag.

### § 8.4 L0 counter-ingestion deferred (intentional, not OQ)

Per § 1.5: no `ingestTpuErrorCounter` helper at R56. TPU counter exposure (if any 32-bit wraparound paths exist in TPU error counters; HBM ECC counters etc.) is deferred to Phase 3 SLICE 2B (live-fetch interface; Wave 8) or SLICE 3 (DS integration). Out-of-scope per WAVE-PLAN-07 file-tree scope row.

**No halt** — explicit Coordinator-level scope decision; not an Architect deferral.

### § 8.5 Partial-flag semantic divergence from R53 (documented; not an OQ)

R53 Neuron partial semantic: `partial = (edges.length === 0)`. R56 TPU partial semantic: `partial = slice_shape.some(dim => dim < 4)`. The divergence is intentional and documented per § 0.3 Approach A selection (WAVE-PLAN-07 frame-AC (e) "sub-cube → mesh-only" semantic for TPU). A sub-cube fixture with 12 mesh edges would report partial=true (R56) but partial=false (R53 convention). This is not a contradiction; TPU's partial captures torus-vs-mesh, Neuron's partial captures empty-vs-non-empty. Future cross-vendor harmonization (if any consumer cares about the distinction) is SLICE 2B / future scope.

**No halt** — semantic divergence is deliberate per public-doc behavioral semantics.

### § 8.6 All other items resolved

No other open questions. All PRD requirements (FR-V2, AC-P5 TPU extension, AC-P7 cross-cutting) map to ACs; all integration points (§ 1.2) are verified against PRD/WAVE-PLAN requirements; all failure modes (§ 1.3) have prescribed handling.

---

## § 9 P3 ten-axis verification

Each axis verified with a one-sentence statement; supporting evidence in the spec body.

1. **Correctness** — All ACs produce binary pass/fail outcomes from observable function behavior; no probabilistic or threshold-based ambiguity. Edge counts (192 for 4×4×4 full torus; 12 for 2×2×2 mesh sub-cube) derive from exact graph-theoretic identities `(6·64)/2 = 192` and `(3·8)/2 = 12`.
2. **Completeness** — Every PRD/WAVE-PLAN requirement maps to ≥1 AC: FR-V2 (parser + interface + v4 + v5p fixture ACs 1-6 + 7-8); AC-P5 cross-cutting (consumable by inherited BFS layer; verified at runtime via `await src.fetchSnapshot()` + interface-shape assertion in AC-R56-7); AC-P7 cross-cutting (test baseline preserved at AC-R56-14); WAVE-PLAN-07 Step 1 frame items (a)-(i) each map to ≥1 AC.
3. **Consistency** — § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription per R20 ARCH MINOR-1 cross-check; § 0 selected approaches (A/A/A/A) referenced consistently in § 2 / § 4 / § 5; AC numbering contiguous AC-R56-1 through AC-R56-15.
4. **Clarity** — No banned ambiguous-language tokens ("correctly", "appropriately", "as needed") appear in AC text. AC text uses concrete numeric / string-equality / regex-anchored expectations.
5. **Coverage** — 15 ACs binding 15 distinct concerns (4 v4 parser ACs, 2 v5p parser ACs, 2 interface ACs, 1 sub-cube partial degradation, 1 6-sub-case malformed-input, 1 tpu_version discriminator, 1 A16 literal, 1 typecheck attestation, 1 test-count attestation with chore-A vs chore-B state distinction, 1 anti-scope diff); coverage exhausts the WAVE-PLAN-07 Step 1 frame-level ACs (a) through (i).
6. **Constraints** — Tier verdict (`full`) applied per WAVE-PLAN-07 Step 6 (A1 + A2 + A4 + A7); anti-scope respected (§ 3); Phase 1/2/SLICE-1 frozen files consumed only, never modified (§ 1.1 inventory); the single `engine/types/verdict.ts` modification is additive enum extension (vendored-with-deltas precedent established at R18 + R23 + R53).
7. **Concurrency** — Parser is pure-functional (no shared state); `TpuTopologySource.fetchSnapshot` is async-returning-resolved-value (no race); no concurrency surface in R56 (single-threaded test execution).
8. **Corner cases** — Invalid JSON (AC-R56-10 (a)); missing tpu_version (AC-R56-10 (b)); unknown tpu_version (AC-R56-10 (c)); invalid slice_shape (AC-R56-10 (d)); missing chips (AC-R56-10 (e)); empty chips (AC-R56-10 (f)); sub-cube partial (AC-R56-9); multi-link dedup (AC-R56-4); opportunistic peer-node emission for peer ids absent from `chips` (covered by AC-R56-1 + AC-R56-5 expected counts); self-peer line (§ 4.1 implementation-note defensive guard).
9. **Cost** — ~200 LOC of production code (parser + class + helpers) + ~250 LOC of test code; 15 ACs; 3 fixture files (8-entry sparse + 64-entry v4 + 64-entry v5p); ~20-25 min estimated Implementer execution time (slightly more than R53 due to fixture generation); full-tier rationale per WAVE-PLAN-07 Step 6.
10. **Coupling** — Production code couples to (a) `engine/topology-overlay.ts` (`TopologySource` interface + `computeSnapshotHash`; read-only consumer); (b) `engine/types/verdict.ts` (TopologyNode / TopologyEdge / TopologySnapshot types; read-only consumer plus additive enum extension at the same file). Test code adds couplings to (c) `engine/types/verdict.ts` direct file-read for AC-R56-12 (read-only string match). No coupling to `engine/topology/{slurm,k8s,nvlink,neuron}-source.ts` (Phase 2 + Phase 3 SLICE 1 deliverables — consulted for structural shape only, not imported); no coupling to `engine/l0/*` (no L0 helper this round per § 1.5).

---

## § 10 Grilling output (pre-emit adversarial self-review)

Per CLAUDE-ARCHITECT.md "Pre-emit grilling" + Superpowers Review phase, the Architect adversarially re-reads the spec from Implementer + Reviewer perspectives.

### § 10.1 Self-questions (each answered)

**Q1: Is every claim in this spec backed by something verifiable?**
- A: Yes.
  - (a) Empirical baseline counts (`374 / 369 / 2 / 3` + `tsc exit 0`) recorded from `node --test --test-reporter=tap` + `npx tsc` runs at session entry — verifiable by re-running (commands documented in Q-R56-SPEC-AUDIT.md § 3).
  - (b) File-reference line numbers (`engine/topology-overlay.ts:50-55` for TopologySource interface; `engine/topology-overlay.ts:69-78` for `computeSnapshotHash`; `engine/types/verdict.ts:254` for `kind` union; `engine/types/verdict.ts:264` for `relationship` union; `engine/topology/neuron-source.ts:140-173` for class structural parallel) verified by direct file Read at spec authoring time (R11 OBS-1/2 + R02 type-declaration-site-check reinforcement).
  - (c) PRD line references (`coordination/PRD.md:436` for FR-V2; `:447` for AC-P5; `:449` for AC-P7; `:459` for vendor-neutral anti-scope; `:477-488` for SLICE 2 structure) verified by direct file Read.
  - (d) WAVE-PLAN-07 references (Step 1 frame-level AC bullets (a)-(j); Step 3 Judgment call 1 + 2; Step 6 tier rationale) verified by direct file Read.
  - (e) Google Cloud TPU public-doc claims (TPU v4 "Six interconnect links per chip", "4x4x4 increments multiples of 4"; TPU v5p "1200 GBps ICI", "All 4x4x4 and larger slices ... full 3D torus connectivity") inherited from WAVE-PLAN-07 line 72 verbatim quotes (retrieved 2026-05-19); structural facts (cube baseline = 4x4x4; 6 ICI peers in full torus; sub-cube mesh-only) cross-checked against the verbatim quotes.

**Q2: Are there unstated assumptions?**
- A: Five documented + accepted:
  - (a) JAX-style topology JSON schema is Architect-defined (no upstream-canonical JAX JSON manifest exists for topology). Documented at § 0.1 hidden-assumptions; the schema is internal to Tessera's adapter contract; production wrapper translates `jax.devices()` runtime objects to this JSON shape (out-of-scope wiring).
  - (b) `ici_peers` symmetry in JAX topology output. Documented at § 0.4 hidden-assumptions; true by TPU ICI fabric construction; parser dedup handles asymmetric input.
  - (c) Production scrape loop / live-fetch wrapper is out-of-scope. Documented at § 0.1 + § 1.5; Phase 3 SLICE 2B (Wave 8) scope.
  - (d) GPU-id-style lex-vs-numeric ordering for IDs ≥ 10. Documented at § 4.1 Implementer-notes + § 8.3 OQ; cube fixtures use IDs 0-63; lex ordering does not affect AC outcomes; forward-flagged.
  - (e) Partial-flag semantic divergence from R53 is deliberate. Documented at § 0.3 + § 8.5; no shared cross-vendor consumer currently depends on the harmonized semantic.

**Q3: Has scope been added beyond what the PRD / WAVE-PLAN requested?**
- A: No. (a) No new external dependencies (built-in `JSON.parse`, no parser library). (b) Schema extensions to `engine/types/verdict.ts` are exactly the two literals WAVE-PLAN-07 Step 1 (c) + (d) prescribe (`'tpu_ici_peer'` + `'tpu_shard'`); no additional literals added. (c) No L0 counter helper (per § 1.5 explicit Coordinator-level scope decision). (d) No new files beyond the 7 prescribed by WAVE-PLAN-07 file-tree scope (`tpu-source.ts` + 3 fixtures + test file + verdict.ts modification + manifest note refresh + 3 coordination artifacts = 12 ALLOWED_SET entries).

**Q4: Can the Implementer act on this spec without making design decisions or asking clarifying questions?**
- A: Yes.
  - (a) Exact function signatures (§ 4.1 with parameter types and return types).
  - (b) Exact parser algorithm (9 steps in § 2.1; full TypeScript source in § 4.1).
  - (c) Exact tpu_version validator + partial-flag helper (§ 2.3 + inlined in § 4.1).
  - (d) Exact fixture file contents (§ 4.2 sparse-anchor + coordinate-derivation rule for the 64-entry fixtures; § 4.4 fully enumerated 8-entry sub-cube fixture).
  - (e) Exact AC bodies (§ 4.5 ships full TypeScript test source).
  - (f) Exact baseline SHA + chore-A SHA placeholder substitution timing (§ 4.5 anti-scope test).
  - (g) Exact attestation format for AC-R56-13/14 (§ 4.6 `Q-R56-EMPIRICAL.sh` blocks; § 5 table prescribes verbatim recording in NEXT-ROLE.md with chore-A vs chore-B state distinction).
  - (h) Exact `coordination/VENDORING-MANIFEST.md` row-note refresh text (§ 4.7 single-row append).
  - (i) Exact verdict.ts delta surface (§ 2.4 quoted union forms).

### § 10.2 Reinforcement sweep (CLAUDE-ARCHITECT.md REINFORCED lines applied)

Each Architect REINFORCED line that applies to R56 is enumerated and verified.

| Reinforcement | Application |
|---|---|
| R01 cross-spec-section consistency pass | § 0 picks (A/A/A/A) referenced consistently across § 2 / § 4 / § 5; no contradictions surfaced (e.g., `tpu_shard` literal appears identically at § 1.1 / § 1.2 / § 2.4 / § 4.1 / § 4.2-4.4 / § 5 ACs / § 4.6 grep) |
| R02 type-declaration-site check | Every named type in § 4 pseudocode (`TopologyNode`, `TopologyEdge`, `TopologySnapshot`, `FetchContext`, `TopologySource`) verified at declaration site by direct Read; import prescribed at § 4.1 |
| R02 git-tracked-vs-gitignored for `git rm` | N/A — R56 prescribes no file deletion |
| R03 re-export chain | N/A — R56 imports types from declaration site (`engine/types/verdict.ts` + `engine/topology-overlay.ts`); does not rely on re-export chains |
| R03 grep verification command soundness | AC-R56-12 grep `'correlational_not_causal: true'` matches in declaration body at `engine/types/verdict.ts:298` AND in JSDoc at `:281`; intentional, since the literal is present in the declared type body, but pattern is non-discriminating (matches both occurrences). Discriminability note: AC text says "the file contains the literal" — both occurrences satisfy; semantically equivalent to "verdict.ts retains the wire-format invariant." Mirrors R30 + R53 disposition. The Implementer cannot remove the type-body literal without breaking compile; comment-only removal would not change the file's wire-format guarantee. Acceptable per R30 + R53 precedent |
| R03 AC test-count per-file | AC-R56-14 prescribes `tests=387 / pass=382 / fail=2 / skipped=3` post-chore-B (vs `387 / pass=381 / fail=3 / skipped=3` at chore-A pre-injection); per-file delta = +13 runtime tests in q56-tpu-adapter.test.ts (AC-R56-1..12 + AC-R56-15; AC-R56-13/14 are attestation-only); empirically anchored to baseline `374/369/2/3` |
| R05 component-inventory AC-range cross-check | § 1.1 inventory + § 5 AC table both reference AC-R56-1..15 consistently; no count drift |
| R06 delta-grep all-occurrences | The only file edit is `engine/types/verdict.ts` (2 enum union additions at lines 254 + 264) plus `coordination/VENDORING-MANIFEST.md` (1 row note refresh). Grep `'gpu_shard'` / `'rack'` / `'psu'` / `'cooling_zone'` / `'nvlink_peer'` / `'neuron_link_peer'` / `'trainium_chip'` / `'inferentia_chip'` in verdict.ts: 1 occurrence each (the type declaration line) — no secondary occurrence to keep in sync. The kind+relationship unions are referenced ONLY at lines 254 + 264 (verified via `grep -n` in pre-emit grilling); no JSDoc enumeration of union members exists separately |
| R06 opts/options interface field coverage | `TpuParseOpts` has 3 fields (`fetched_at_ts`, `source_id`, `source_version`); constructor opts has 5 (`id`, `version`, `fetched_at_ts`, `source_id`, `source_version`). AC-R56-7 exercises the happy path for `id`/`version`; the alternative branches of the `??`-chain (snapshot.source_id fallback; default literal) are NOT separately bound by AC. Per R30 + R53 precedent, the third operand in the `??`-chain is structurally unreachable (`parseTpuTopologyJson` always sets `snapshot.source_id`/`source_version` to a defaulted typed string). Documented as defensive code in § 4.1 Implementer-notes; not a coverage gap. `fetched_at_ts` is exercised by AC-R56-1 (deterministic timestamp `1_700_000_000` passed) |
| R07 fixture accumulation requirement | N/A — no e-process / statistical-detector ACs in R56 |
| R07 OBSERVED-binding scope | N/A — all R56 ACs are deterministic |
| R08 empirical premise verification | Baseline empirical claims (`374/369/2/3` test summary; `tsc exit 0`; `git rev-parse HEAD = 4447586`) verified by Architect-side command runs at session entry, NOT inherited from prior round attestations. Recorded in Q-R56-SPEC-AUDIT.md § 3 with verification commands |
| R10 file-level documentation coverage | § 4.1 prescribes full file docblock for `engine/topology/tpu-source.ts`; § 4.5 prescribes full docblock for `test/q56-tpu-adapter.test.ts`; both describe complete exported surface |
| R11 REVIEWER-ANCHOR cited-line extraction | Every cited line range in this spec re-verified by direct Read during spec authoring: `engine/topology-overlay.ts:50-55` matches `export interface TopologySource { ... }`; `engine/types/verdict.ts:254` matches `kind: 'service' \| ... \| 'inferentia_chip';`; `engine/types/verdict.ts:264` matches `relationship: 'calls' \| ... \| 'neuron_link_peer';`; `engine/types/verdict.ts:298` matches `correlational_not_causal: true;` |
| R13 named statistical bound | N/A — R56 has no statistical-bound terminology |
| R15 anti-scope diff baseline | Baseline `4447586` is the R56 routing commit and the most-recent commit before Architect spec commit; no intermediate operator-prep commits (verified by `git log --oneline -5` at session entry; chain: `4447586` chore: prepare R56 / `c9ca2a8` chore(R55): Coordinator outputs / `fe10444` chore: prepare R55 / `fb7585c` chore(R54): WAVE-GATE-06 / `df9c78f` chore(R54): WAVE-GATE-04). The 13th-entry conditional clause (DIAGNOSTIC) is explicitly authorized in § 3 per R25 MAJOR-2 reinforcement |
| R15 spec-internal-contradiction | The halt-condition prescriptions in § 6.1 #4 (Phase 1/2 regression → HALT) and § 6.4 (false-compliance prevention → HALT) align: both prescribe HALT + DIAGNOSTIC on binding-command output contradicting AC literal text. No conflicting prescriptions for the same trigger state |
| R18 vendored-with-deltas + AT_PIN_FILES check | `engine/types/verdict.ts` is vendored-with-deltas since R18 (verified via `coordination/VENDORING-MANIFEST.md`); `q01-no-at-pin-deltas.test.ts` file-header comment (lines 8/19/28) confirms verdict.ts EXCLUDED from at-pin-byte-identity check since R18+R23+R53. R56 adds enum literals without re-introducing it to AT_PIN_FILES; no test maintenance needed. Vendored-file delta assertion-surface check: the tests that open `engine/types/verdict.ts` are R30 AC-R30-15 + R53 AC-R53-12 + new R56 AC-R56-12 — all do `.includes(...)` substring checks, NOT byte-level comparison. No test assertion-surface conflict |
| R20 § 5 AC-table preamble cross-check | § 5 preamble classifies AC-R56-13/14 as "binding-command attestations (NOT runtime-bound)" and AC-R56-1..12 + AC-R56-15 as "runtime tests"; verified against § 4 prescription — § 4.5 ships `test()` declarations for AC-R56-1..12 + AC-R56-15 only; AC-R56-13/14 have no `test()` declaration and are prescribed as `Q-R56-EMPIRICAL.sh` blocks + Implementer NEXT-ROLE.md attestations |
| R21 every-failure-mode-AC-bound | § 1.3 failure-mode table cross-referenced against AC table: parser failure modes (JSON parse error → AC-R56-10 sub-a; missing tpu_version → AC-R56-10 sub-b; unknown tpu_version → AC-R56-10 sub-c; invalid slice_shape → AC-R56-10 sub-d; missing chips → AC-R56-10 sub-e; empty chips → AC-R56-10 sub-f; sub-cube partial → AC-R56-9; full-cube partial=false → AC-R56-1 + AC-R56-5; multi-link dedup → AC-R56-4). Defensive `if (peerId === chipId) continue` self-peer guard at § 4.1 is documented as defensive-not-AC-bound (mirrors R30 + R53 disposition; Q-R56-SPEC-AUDIT.md § 2.5 records). Id/version fallback chain: AC-R56-7 covers happy path (branches 1+2); defensive 3rd `??` operand documented as structurally unreachable per R06 opts-field coverage row above |
| R21 ARCH MINOR-1 spec-commit-sequencing | Architect WILL commit spec files (Q-R56-SPEC.md + Q-R56-SPEC-AUDIT.md + Q-R56-EMPIRICAL.sh) BEFORE writing NEXT-ROLE.md routing block — committed in a dedicated commit; verified by the routing sequence in § 11 below |
| R23 .gitignore-aware spec inventories | All 12 allowed-set entries verified git-trackable in Q-R56-SPEC-AUDIT.md § 4: 7 NEW files (will be git-trackable post-Implementer commit; parent dirs hold tracked files of same extension) + 2 MOD-only (verdict.ts + VENDORING-MANIFEST.md; already tracked) + 3 coordination artifacts (NEXT-ROLE.md + MEMORIAL.md + spec dir already tracked). No path is in `.gitignore` |
| R25 MAJOR-1 empirical baseline | AC-R56-14 prescribes attesting actual `node --test` counts in NEXT-ROLE.md via `Q-R56-EMPIRICAL.sh` execution; predicted post-chore-B `tests=387/pass=382/fail=2/skipped=3` is the spec's expectation but the Implementer attests the ACTUAL counts (per Rule 1 sub-class `empirical-command-attestation`); if actual differs structurally, the Implementer HALTs per § 6.1 #5 |
| R25 MAJOR-2 allowed-set conditional 13th entry | § 3 explicitly authorizes the 13th entry (`coordination/diagnostics/DIAGNOSTIC-R56-*.md`) IFF a HALT fires; AC-R56-15 ALLOWED_SET literal at § 4.5 includes the conditional commentary |
| R25 MAJOR-3 spec-amendment-post-disposition | N/A — no ESCALATE disposition yet for R56; if one occurs, this spec must be amended (not just the test path), per the reinforcement; § 6.3 procedure step 5 captures this |
| R26 MAJOR-1 false-compliance-attestation prevention | § 6.4 explicitly prohibits reframing `tsc` errors as "warnings" or fail-counts as compliance; AC-R56-13/14 attestation classification at § 5 reinforces with verbatim-recording via `Q-R56-EMPIRICAL.sh` |
| R29 empirical-AC threshold binding | AC-R56-12 grep is `grep -c 'correlational_not_causal: true'` with `≥ 1` threshold; matches at 2 occurrences in verdict.ts (line 281 JSDoc + line 298 declaration). Per R44 MINOR-3 + R46 MINOR-1/2 reinforcement (empirical-AC threshold binding tightness), `≥ 1` is incidentally satisfied — a comment-only match would PASS while the type-body literal is removed. Mitigation: the type-body literal CANNOT be removed without breaking TypeScript compile (it's a literal type constraint at `:298`); the JSDoc at `:281` is also load-bearing as documentation. The non-discriminating threshold is structurally non-failable here (compile would catch type-removal first); acceptable per R30 + R53 precedent which use the same shape |
| R30 MINOR-1 grep discriminability | AC-R56-10 throw-regex patterns include the distinguishing literal `: <value>` segment where applicable (e.g., `/TPU_PARSE_UNKNOWN_TPU_VERSION: v99/` includes the offending tpu_version) so the assertion would FAIL if the throw message lost its value-bearing suffix. The non-suffixed errors (`TPU_PARSE_INVALID_JSON`, `TPU_PARSE_MISSING_TPU_VERSION`, `TPU_PARSE_INVALID_SLICE_SHAPE`, `TPU_PARSE_MISSING_CHIPS`, `TPU_PARSE_NO_CHIPS`) are anchored by their full error name string — each name is unique to one parser branch |
| R34 MINOR-2 boundary-clause cross-section consistency | The partial-flag boundary clause (`dim < 4`) appears in 4 places: § 0.3 selection text, § 2.1 step 5, § 4.1 `isPartialSlice` function body, AC-R56-9 expectation (slice_shape=[2,2,2] → all dims=2 < 4 → partial=true). All four use the same `dim < 4` (strict less-than) convention; no boundary-clause drift |
| R34 MINOR-3 regex literal validity in pseudocode | All regex literals in § 4.5 are valid JavaScript (anchored by `/pattern/` literal; no `\Z`-class invalid metacharacters; no language-specific anchors): `/TPU_PARSE_INVALID_JSON/`, `/TPU_PARSE_MISSING_TPU_VERSION/`, `/TPU_PARSE_UNKNOWN_TPU_VERSION: v99/`, `/TPU_PARSE_INVALID_SLICE_SHAPE/`, `/TPU_PARSE_MISSING_CHIPS/`, `/TPU_PARSE_NO_CHIPS/` — all single-character class with no special regex metacharacters requiring escape (the `:` in pattern (c) is a literal colon; valid in JS regex without escape). Verified by mentally walking each through the JS regex engine grammar |
| R41 self-confirming-test-assertion-specificity | AC-R56-12 substring check `text.includes('correlational_not_causal: true')` — the substring is structurally unique to the A16 invariant (appears only in `correlational_not_causal: true` literal context; not a generic word like "rounds" or "RESOLVED"). Acceptable per R41 reinforcement |
| R44 MINOR-3 / R46 MINOR-1/2 empirical-AC threshold tightness | AC-R56-14 test count is exact equality (with chore-A `387/381/3/3` and chore-B `387/382/2/3` distinguished); AC-R56-13 tsc exit is exact equality (`0`). File-existence checks in Q-R56-EMPIRICAL.sh use binary existence (`[ -f path ]`); schema-extension greps use `≥ 1` threshold — the threshold is structurally non-failable (the literal is required for the parser to compile and is enforced by AC-R56-2/3/6). Acceptable per R30 + R53 precedent |
| R53 MINOR-1 chore-A vs chore-B test-count prediction | AC-R56-14 row in § 5 explicitly distinguishes chore-A state (`387/381/3/3` — AC-R56-15 fails due to placeholder SHA) from chore-B state (`387/382/2/3` — AC-R56-15 passes after SHA injection); Q-R56-EMPIRICAL.sh § 4.6 prescription mirrors the two-state distinction. Recently-added reinforcement (2026-05-19) honored |

### § 10.3 Cross-section consistency pass

Per R01 reinforcement: for every resolved § 0 decision, verify all subsequent sections use a consistent surface.

| § 0 decision | Surface in § 2 | Surface in § 4 | Surface in § 5 | Consistent? |
|---|---|---|---|---|
| § 0.1 — JAX-style topology JSON parser | "JSON.parse" in § 2.1 step 1 | `JSON.parse(jsonText)` in § 4.1 step 1 | AC-R56-10 sub-case (a) exercises JSON.parse error path | ✓ |
| § 0.2 — single module `engine/topology/tpu-source.ts` | Single file in § 2.1 + § 2.2 + § 2.3 | § 4.1 prescribes one file with 3 exports (function + class + inline helpers) | AC table imports from one module | ✓ |
| § 0.3 — partial = slice_shape.some(dim < 4) | `partial = slice_shape.some(d => d < 4)` in § 2.1 step 5 | `isPartialSlice` helper + step 6 in § 4.1 | AC-R56-1 + AC-R56-5 partial=false (cubes); AC-R56-9 partial=true (sub-cube) | ✓ |
| § 0.4 — undirected-deduped canonical | "from = (a<b?a:b), to = (a<b?b:a)" + Set dedup in § 2.1 step 8 | `a < b ? a : b` + `edgeKeys` Set in § 4.1 step 8 | AC-R56-4 asserts canonical ordering + unique pairs | ✓ |

### § 10.4 Pre-route checklist

- [x] Spec covers every WAVE-PLAN-07 frame-level AC (verified § 1.2 + § 5).
- [x] Spec depth: WHAT and WHY prescribed; tactical detail in § 4 because mechanical translation is the contract (matches R30 + R53 precedent).
- [x] Anti-scope explicit (§ 3) + halt conditions explicit (§ 6).
- [x] No banned ambiguous-language tokens in AC text.
- [x] All cited line numbers re-verified at declaration site (§ 10.2 R11 row).
- [x] Empirical baselines (`374/369/2/3`, `tsc exit 0`, round-start SHA `4447586`) verified by running binding commands in this worktree at session entry, NOT inherited from prior rounds (R25 MAJOR-1 / R08 reinforcement).
- [x] § 5 preamble attestation classification matches § 4 prescription (R20 ARCH MINOR-1).
- [x] Component inventory consistent across § 1.1 / § 4 / § 5 (R05 reinforcement).
- [x] Branch-binding coverage gate applied (R21 ARCH MINOR-2/3): every guard / fallback / default has a binding AC where observable, or a defensive-code disposition in Q-R56-SPEC-AUDIT.md § 2.5.
- [x] File-level documentation coverage check (R10 reinforcement): § 4.1 docblock describes full exported surface; § 4.5 docblock describes test file's coverage.
- [x] Spec § 7 enumerates all 7 cross-project rules with active-gate / N/A dispositions (SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a) requirement).
- [x] Q-R56-EMPIRICAL.sh prescribed per § 4.6 (Rule 1 sub-class self-application; R46 canonical landing pattern).
- [x] AC-R56-14 distinguishes chore-A vs chore-B test count (R53 MINOR-1 reinforcement; recently added 2026-05-19).
- [x] Partial-flag semantic divergence from R53 documented honestly at § 0.3 + § 8.5 (not a contradiction; deliberate per WAVE-PLAN-07 frame-AC (e)).

---

## § 11 Architect routing sequence (post-grilling)

Per R21 ARCH MINOR-1 reinforcement (spec-commit-sequencing) + R23 / R25 / R30 / R53 precedent:

1. **Spec commit (Architect):** commit `coordination/specs/Q-R56-SPEC.md` + `coordination/specs/Q-R56-SPEC-AUDIT.md` + `coordination/specs/Q-R56-EMPIRICAL.sh` (set executable bit `chmod +x`) in a dedicated commit (`spec(R56): Q-R56 Phase 3 SLICE 2 WU-Phase3-2A Google TPU topology adapter`).
2. **NEXT-ROLE.md update (Architect; uncommitted at this stage):** update `coordination/NEXT-ROLE.md` to route IMPLEMENTER `STATUS: READY` with this spec as input. The Implementer's chore-A commit picks this up.
3. **MEMORIAL.md update (Architect; uncommitted at this stage):** append CONFIRMATION entries for disciplines applied this round.
4. **Implementer takes over:** RED commit (TDD per R23 IMPL MINOR-1) → GREEN commit (production code + test + fixtures + verdict.ts deltas + VENDORING-MANIFEST.md note refresh) → chore-A commit (sweeps NEXT-ROLE.md + MEMORIAL.md updates + runs `Q-R56-EMPIRICAL.sh` for AC-R56-13/14 attestation).
5. **Chore-B commit (Implementer):** appends AC-R56-15 with chore-A SHA literal substituted into `<INJECTED-AT-CHORE-B>` placeholder; backfills NEXT-ROLE.md chore-B SHA reference.

---

## § 12 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

(Per R49 pipeline-mandatory discipline; full-tier auto-routes Architect → Implementer → Reviewer → Memorial-Updater across fresh subprocess Claude sessions per role. R55 Coordinator wave-plan dispatch recommendation [WAVE-PLAN-07.md line 31]. R51 MU re-accretion guard applies at round close.)

---
