# Q-R53-SPEC — Phase 3 SLICE 1 WU-Phase3-1: AWS Neuron (Trainium + Inferentia) topology adapter

**Round:** R53 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 1 of WAVE-PLAN-Phase3-01.md; bundled per OQ-P3-10 + OQ-Phase3-W1-1 Option A).
**Phase / SLICE:** Phase 3 SLICE 1 — first non-NVIDIA vendor `TopologySource` impl in Tessera; parallel-class with R28 SLURM / R29 K8S / R30 NVLINK.
**Scope reference:** `coordination/PRD.md` § Phase 3 (FR-V1a + FR-V1b + AC-P5 + AC-P7; lines 411-510) + `coordination/WAVE-PLAN-Phase3-01.md` (Step 1 WU table; Step 3 Judgment calls 1 + 2) + `coordination/NEXT-ROLE.md` R53 round-scope directive (operator dispositions OQ-Phase3-W1-1 Option A + OQ-Phase3-W1-2 Option B).
**PRD trace:** FR-V1a + FR-V1b (PRD:434-435; AWS Trainium + Inferentia adapters) · US-05 (AWS Trainium per-shard observation) · AC-P5 (`TopologySnapshot` consumable by inherited `engine/topology-overlay.ts` BFS layer with `neuron_link_peer` edge relationship literal + Trainium / Inferentia node kind literals).
**Round-start SHA (anti-scope diff lower bound):** `3744012` (chore: prepare R53 round directive; HEAD at Architect session entry — verified `git rev-parse HEAD`).
**Empirical baseline at session entry (verified by Architect via `node --test test/*.test.js`):** `tests=361 / pass=356 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)`. Both are R36 forward-protection guards whose CHORE_A_SHA literal (`87e372f` Phase 2 close) is structurally older than HEAD; the 2 fails are pre-existing inheritance, NOT introduced by this round.
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. (Materially cleaner than the R30-era TS2688 + TS5107 baseline — those have been resolved during Phase 2; R53 inherits a clean tsc surface and must preserve it.)

---

## § 0 Brainstorm phase (Superpowers — inline)

Three architectural axes have genuine multi-option choices. Each is brainstormed below with three distinct approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 Parser input format (which Neuron SDK output to parse)

**Approach A — Parse `neuron-ls --json-output` JSON (PICKED).** Fixture is a JSON file. Parser uses `JSON.parse` → reads `instance_type` (for chip-family discrimination) and `neuron_devices[]` array; each device entry has `neuron_device` (integer id) and `connected_to` (array of peer device ids). Emits nodes (kind from instance_type) + edges from `connected_to` lists.

- **Strengths:** Neuron SDK explicitly exposes `--json-output` (`-j`) for machine consumption (per `awsdocs-neuron.readthedocs-hosted.com/en/latest/tools/neuron-sys-tools/neuron-ls.html` retrieved 2026-05-19); structured JSON eliminates regex brittleness; parser is ~30 LOC; matches K8s adapter precedent (R29 `K8sNodeLabelSource` consumes JSON-shape input via `K8sNodeList` typed surface).
- **Weaknesses:** assumes production scrape loop invokes `neuron-ls -j` rather than the default text-columns invocation. Acceptable — production scrape wiring is out-of-scope per WAVE-PLAN § Risk row "Wave-2 production scrape loop ... lives outside the adapter file"; the R53 adapter ships the unit operations and Implementer notes prescribe `-j` invocation for production.
- **Hidden assumptions:** Neuron SDK's JSON output schema is stable across Neuron 2.x releases. Acceptable — AWS docs commit to `connected_to` as the canonical peer-list field.
- **Risks:** low.

**Approach B — Parse `neuron-ls --topology` Unicode-arrow diagram (`*––►[ 0 ]◄––►[ 1 ]◄–…`).**

- **Strengths:** matches the human-readable topology visualization.
- **Weaknesses:** Unicode characters (`–`, `►`, `◄`) make regex brittle and platform-dependent; the topology diagram is human-readable not machine-readable; AWS docs explicitly provide `-j` for machine consumption — choosing the diagram parser when JSON is available is YAGNI inversion.
- **Risks:** medium; format brittleness.

**Approach C — Parse `neuron-ls` default text-column table (columns NEURON DEVICE / NEURON CORES / CONNECTED DEVICES / …).**

- **Strengths:** matches default invocation; no flag required.
- **Weaknesses:** column widths vary; the `CONNECTED DEVICES` field is comma-separated text within a column requiring two-level parsing (column extraction + CSV split); same conceptual issue as the R30 NVLink text parser but worse since text-column parsing adds a layer of spacing-dependence the NVLink format avoids.
- **Risks:** medium-high.

**Selection rationale:** Approach A. The Neuron SDK exposes `--json-output` precisely for machine consumption. Aligns with K8s adapter precedent (JSON-shape input). The R28 Slurm + R30 NVLink adapters parse text formats because those tools don't expose a JSON alternative; Neuron SDK does.

### § 0.2 Module decomposition (single vs split vs hybrid)

**Approach A — Single module `engine/topology/neuron-source.ts` (PICKED).** One Tessera-original file with:
- `parseNeuronLsJson(jsonText, opts) → { snapshot, partial, chip_family }` (pure function).
- `class NeuronTopologySource implements TopologySource` (thin wrapper).
- Chip-family discrimination happens at parse time via `instance_type` field (`trn*` → `'trainium'` → node kind `'trainium_chip'`; `inf*` → `'inferentia'` → node kind `'inferentia_chip'`).

- **Strengths:** matches operator OQ-Phase3-W1-1 Option A explicit disposition; matches R30 NVLink + R26 MD-F4 single-file precedent; tightest blast radius (~150 LOC); single file maintenance.
- **Weaknesses:** single file mixes two chip families. Acceptable — they share the same `connected_to` JSON schema; only the node-kind literal differs (discriminated by `instance_type` prefix mapping).
- **Risks:** low.

**Approach B — Two files `trainium-source.ts` + `inferentia-source.ts` + shared parser helper.**

- **Strengths:** per-chip-family file granularity at the file system; matches PRD:434 explicit `trainium-source.ts` filename for FR-V1a.
- **Weaknesses:** operator OQ-Phase3-W1-1 dispositioned Option A; splitting now would re-litigate the operator decision; per-family `parseNeuron*` functions would duplicate ~80% of parsing logic (both consume the same `neuron-ls -j` JSON schema); D5-strict write-conflict on shared enum literal (`'neuron_link_peer'` added once at verdict.ts; two files needing it serializes the round into pseudo-waves).
- **Risks:** medium; contradicts operator disposition.

**Approach C — Hybrid: shared `parseNeuronLsJson` + two thin source classes (`TrainiumTopologySource` + `InferentiaTopologySource`).**

- **Strengths:** classes carry chip-family identity at the type level.
- **Weaknesses:** the chip family is a runtime distinction inferred from fixture content, not a compile-time class choice; production scrape loop (out-of-scope) would still need to inspect `instance_type` to choose which class to instantiate — same runtime dispatch shifted up a layer; extra classes for no semantic benefit.
- **Risks:** low-medium; over-engineering.

**Selection rationale:** Approach A. Aligns with operator disposition OQ-Phase3-W1-1 Option A.

### § 0.3 Chip-family discrimination mechanism

**Approach A — Map `instance_type` JSON field prefix (PICKED).** Fixture JSON has `"instance_type": "trn1.32xlarge"` or `"instance_type": "inf2.24xlarge"`. Parser reads `instance_type` (required field), maps:
- `instance_type.startsWith('trn')` → chip_family `'trainium'` → node kind `'trainium_chip'`.
- `instance_type.startsWith('inf')` → chip_family `'inferentia'` → node kind `'inferentia_chip'`.
- otherwise → throws `NEURON_PARSE_UNKNOWN_INSTANCE_TYPE`.

- **Strengths:** `instance_type` is a real field in `neuron-ls --json-output` (per docs structure showing `instance_type` per device); future-proofs to additional Trainium/Inferentia generations (`trn2.*`, `inf3.*`) via prefix match; production scrape loop reads the same field; explicit + testable; resilient to sparse fixtures (where peer count alone wouldn't disambiguate).
- **Weaknesses:** prefix-match assumes AWS naming convention is stable. Acceptable — `trn`/`inf` instance-type prefixes are public AWS naming conventions documented since Trn1 launch.
- **Hidden assumptions:** Neuron SDK's `neuron-ls --json-output` exposes `instance_type` as a string field. The R53 fixture format ASSUMES this; if production wiring discovers Neuron SDK does not include `instance_type` in `-j` output, the production wrapper would source it from EC2 metadata (`/latest/meta-data/instance-type`) and inject — out-of-scope wiring detail.
- **Risks:** low.

**Approach B — Infer from device count or peer count.** Trainium ≈ 16 chips × 4 peers; Inferentia ≈ variable × 2 peers.

- **Strengths:** no fixture-format augmentation needed.
- **Weaknesses:** fragile; sparse fixtures break the heuristic (a sparse Trainium fixture with no peers looks like nothing); Trn2 instances vary by chip count (8 or 16 depending on size); Inferentia2 inf2.* sizes range from 1 to 12 chips. A 4-chip Trainium subset fixture would be indistinguishable from a 4-chip Inferentia fixture by peer count alone if peers happen to be 2.
- **Risks:** high.

**Approach C — Constructor argument to parser/class.** `parseNeuronLsJson(jsonText, { chip_family: 'trainium', ... })`.

- **Strengths:** explicit at the call site.
- **Weaknesses:** moves the chip-family information out of the fixture, requiring caller to know it; doesn't match production (where you'd want to discover from system state, not pass in); creates a coupling where the fixture and call-site can disagree silently.
- **Risks:** medium.

**Selection rationale:** Approach A. Instance-type prefix discriminator is explicit, future-proof to sparse fixtures, and matches production reality (EC2 instance metadata is always available).

### § 0.4 Edge representation (one edge per raw peer entry vs undirected-deduped vs both)

**Approach A — Undirected-deduped, one canonical edge per peer pair (PICKED; matches R30 precedent).** `neuron-ls --json-output` `connected_to` arrays may list peers in both directions (device 0 has `connected_to: [1, 5]`; device 1 has `connected_to: [0, 2]` → dedup the (0,1) pair). Emit one canonical edge `{from: min(id_a, id_b), to: max(...), relationship: 'neuron_link_peer'}` per unique pair. Use lex comparison on `neuron-N` string-id form (same convention as R30 NVLink `gpu-N`).

- **Strengths:** matches inherited `engine/topology-overlay.ts:262-267` BFS bidirectional adjacency build; undirected-deduped representation eliminates double-counting; canonical ordering enables deterministic `computeSnapshotHash`; matches the R30 NVLink precedent line-for-line.
- **Weaknesses:** loses any per-link info if Neuron exposed it. Acceptable — `neuron-ls --json-output` `connected_to` is a per-peer-pair listing, not per-link; no per-link info to lose at the JSON layer.
- **Hidden assumptions:** `connected_to` symmetry holds (if device 0 lists 1, device 1 lists 0). True by NeuronLink fabric construction. The parser dedup handles asymmetric input gracefully (one-sided peer entry still produces a deduped edge).
- **Risks:** low.

**Approach B — One edge per raw peer entry (no dedup).** Device 0 ↔ device 1 → 2 edges (0→1 and 1→0).

- **Strengths:** preserves directional symbology.
- **Weaknesses:** BFS treats edges bidirectionally regardless, so direction-preservation has no consumer; edge surface inflated; `computeSnapshotHash` would have to sort over a larger edge list; same pattern R30 rejected.
- **Risks:** medium.

**Approach C — Both representations exposed via separate fields.**

- **Strengths:** none beyond Approach A.
- **Weaknesses:** introduces a non-canonical field on `TopologySnapshot`; A12 anti-scope (no modification of `engine/types/verdict.ts` `TopologySnapshot` shape beyond enum additions).
- **Risks:** high; A12 violation.

**Selection rationale:** Approach A. Matches R30 precedent line-for-line and BFS-consumed semantics.

### § 0.5 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| § 0.1 Parser input | A — `neuron-ls --json-output` JSON | B (Unicode-arrow diagram), C (text columns) | Machine-readable; future-proof; K8s precedent |
| § 0.2 Module decomp | A — single file | B (split), C (hybrid) | OQ-Phase3-W1-1 Option A operator disposition; R30 precedent |
| § 0.3 Chip-family discriminator | A — `instance_type` prefix | B (peer-count heuristic), C (constructor arg) | Explicit; testable; resilient to sparse; matches EC2 metadata |
| § 0.4 Edge representation | A — undirected-deduped canonical | B (per-raw), C (both) | Matches BFS bidirectional; deterministic hash; R30 precedent |

All four picks are independent; no pick contradicts PRD/anti-scope.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Component | Status | Concern |
|---|---|---|
| `engine/topology/neuron-source.ts` | NEW | JSON parser + `NeuronTopologySource` class + chip-family discrimination helper |
| `engine/types/verdict.ts` | MODIFIED | `TopologyNode.kind` union extended with `'trainium_chip'` + `'inferentia_chip'`; `TopologyEdge.relationship` union extended with `'neuron_link_peer'`. Vendored-with-deltas (already established at R18 + R23 — see `coordination/VENDORING-MANIFEST.md`). |
| `test/q53-neuron-adapter.test.ts` | NEW | AC bindings for R53 (parser ACs + chip-family discrimination + interface conformance + sparse degradation + A16 + anti-scope diff) |
| `test/_substrate/neuron-fixture-trainium-2d-torus.json` | NEW | Synthetic Trn1.32xlarge 4×4 2D Torus fixture (16 Trainium chips; 4 NeuronLinks each; 32 deduped edges) |
| `test/_substrate/neuron-fixture-inferentia-ring.json` | NEW | Synthetic inf2.24xlarge-style ring fixture (6 Inferentia chips; 2 NeuronLinks each; 6 deduped edges) |
| `test/_substrate/neuron-fixture-sparse.json` | NEW | Synthetic sparse fixture (Trainium instance type; chips present; `connected_to` empty for all → partial=true graceful degradation) |
| `coordination/VENDORING-MANIFEST.md` | MODIFIED | `engine/types/verdict.ts` row note column extended to enumerate R53 Phase 3 SLICE 1 deltas alongside R18 + R23 entries (single-row note refresh; same two-step pattern as R23) |
| `coordination/specs/Q-R53-SPEC.md` | NEW | This spec |
| `coordination/specs/Q-R53-SPEC-AUDIT.md` | NEW | Architect ceremony sidecar |
| `coordination/specs/Q-R53-EMPIRICAL.sh` | NEW | Rule 1 sub-class `empirical-command-attestation` self-application (R46 canonical landing pattern) |
| `engine/topology-overlay.ts` | UNCHANGED | `TopologySource` interface (lines 50-55) + `computeSnapshotHash` (lines 69-78) consumed read-only (vendored-at-pin) |
| `engine/topology/{slurm,k8s,nvlink}-source.ts` | UNCHANGED | Phase 2 parallel-class precedent files consulted for structural shape; not modified |
| `engine/hardware-topology-source.ts` | UNCHANGED | R23 frozen (consulted for class shape only) |
| `engine/l0/counter-rate-transform.ts` | UNCHANGED | Out-of-scope for R53 (no Neuron counter helper; per WAVE-PLAN Step 1 file-tree scope which does NOT include `ingestNeuron*Counter`) |

### § 1.2 Integration points (with PRD requirement verification)

| Integration point | Direction | PRD requirement | Verification AC |
|---|---|---|---|
| `NeuronTopologySource` → `TopologySource` interface (`engine/topology-overlay.ts:50-55`) | Implementation conformance | AC-P5 + WAVE-PLAN Step 1 (f) ("`TopologySource` interface conformance") | AC-R53-7 + AC-R53-8 |
| `NeuronTopologySource.snapshotHash` → `computeSnapshotHash` (`engine/topology-overlay.ts:69-78`) | Delegation | WAVE-PLAN Step 1 (f) ("hash delegates to `computeSnapshotHash` per shared semantics") | AC-R53-8 |
| `parseNeuronLsJson` → `TopologyNode.kind = 'trainium_chip'` (R53 enum addition at `engine/types/verdict.ts:245`) | Type literal | AC-P5 + WAVE-PLAN Step 1 (d) ("`'trainium_chip'` + `'inferentia_chip'` `TopologyNode.kind` literals added") | AC-R53-2 (Trainium subset) |
| `parseNeuronLsJson` → `TopologyNode.kind = 'inferentia_chip'` (R53 enum addition at `engine/types/verdict.ts:245`) | Type literal | Same as above | AC-R53-6 (Inferentia subset) |
| `parseNeuronLsJson` → `TopologyEdge.relationship = 'neuron_link_peer'` (R53 enum addition at `engine/types/verdict.ts:255`) | Type literal | AC-P5 + WAVE-PLAN Step 1 (c) ("`'neuron_link_peer'` `TopologyEdge.relationship` literal added") | AC-R53-3 (Trainium) + AC-R53-6 (Inferentia) |
| `parseNeuronLsJson` → `instance_type`-prefix discriminator | Internal helper | § 0.3 selection (chip-family from instance_type prefix; matches EC2 metadata convention) | AC-R53-11 |
| Sparse-data degradation (Trainium instance_type, empty `connected_to`) | Runtime path | WAVE-PLAN Step 1 (e) ("Sparse / partial topology graceful handling (LS-4 carry-forward)") | AC-R53-9 |
| Malformed input (missing instance_type, missing neuron_devices, unknown prefix) | Runtime path | § 0.3 + § 0.1 selection (fail-fast on malformed input) | AC-R53-10 |
| `engine/types/verdict.ts` A16 literal preservation (`'correlational_not_causal: true'`) | Read-only invariant | WAVE-PLAN Step 1 (g) ("`correlational_not_causal: true` invariant preserved at any wire boundary (A16 defensive)") | AC-R53-12 |
| Anti-scope file-set diff against round-start baseline `3744012` | Runtime test | WAVE-PLAN Step 1 (h) ("Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A)") | AC-R53-15 |
| Binding-command attestation (`tsc` exit + `node --test` counts) at chore-A SHA | Attestation in NEXT-ROLE.md + AC-evidence + `Q-R53-EMPIRICAL.sh` | WAVE-PLAN Step 1 (i) + Rule 1 sub-class `empirical-command-attestation` (R46 canonical landing) | AC-R53-13 + AC-R53-14 |
| Cross-cutting AC-P7 (Phase 1 + Phase 2 ACs hold unchanged) | Baseline-preservation invariant | PRD line 449 (AC-P7) | AC-R53-14 (test count baseline preserved at 361 modulo R53 additions) |

### § 1.3 Failure modes (each integration point)

| Integration point | Failure mode | Handling |
|---|---|---|
| Parser ← input text | Not valid JSON (`JSON.parse` throws) | Wrap-and-rethrow as `Error('NEURON_PARSE_INVALID_JSON: ...')` (AC-R53-10 sub-case a) |
| Parser ← parsed object | `instance_type` field missing or not string | Throw `Error('NEURON_PARSE_MISSING_INSTANCE_TYPE')` (AC-R53-10 sub-case b) |
| Parser ← parsed object | `instance_type` prefix neither `trn` nor `inf` | Throw `Error('NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: <value>')` (AC-R53-10 sub-case c) |
| Parser ← parsed object | `neuron_devices` field missing or not array | Throw `Error('NEURON_PARSE_MISSING_NEURON_DEVICES')` (AC-R53-10 sub-case d) |
| Parser ← parsed object | `neuron_devices` is empty array | Throw `Error('NEURON_PARSE_NO_DEVICES')` (mirrors R30 NVLink `NVLINK_PARSE_NO_GPU_BLOCKS`; AC-R53-10 sub-case e) |
| Parser ← parsed object | Well-formed instance_type, neuron_devices present, every device has `connected_to: []` (or `connected_to` omitted) | Emit nodes only, edges = []; `partial = true` (AC-R53-9) |
| Parser ← parsed object | A device's `connected_to` references a peer id that has no matching `neuron_device` entry | Emit the peer node opportunistically (mirrors R30 NVLink behavior at `engine/topology/nvlink-source.ts:74-81`); peer node uses the same kind as the parent chip family |
| Parser ← parsed object | Multiple `connected_to` arrays mention the same pair | Canonical (min, max) dedup; emit ONE edge (AC-R53-4) |
| Parser ← parsed object | Self-peer (`neuron_devices[i].connected_to` includes `neuron_devices[i].neuron_device`) | `if (a === b) continue` defensive guard (mirrors R30 `engine/topology/nvlink-source.ts:93`); not exercised by AC; defensive code |
| `NeuronTopologySource` ← Constructor opts.id/version undefined | Constructor opts undefined | Fall back to `snapshot.source_id`/`snapshot.source_version`; if undefined, fall back to default literal `'neuron_topology_source'` / `'neuron-1'` (AC-R53-7 sub-cases) |
| Binding-command attestation | Actual `tsc` exit ≠ 0 | Encode actual exit empirically in `Q-R53-EMPIRICAL.sh`; do NOT reframe (Rule 1 sub-class `false-compliance-attestation` R26 MAJOR-1 reinforcement) |
| Binding-command attestation | Actual `node --test` fail count ≠ 2 | Encode actual fail count empirically in `Q-R53-EMPIRICAL.sh`; do NOT reframe (Rule 1 sub-class `empirical-command-attestation` R46 canonical landing) |

### § 1.4 Architect pre-prediction (outcome anchors)

| AC range | Predicted outcome at chore-A |
|---|---|
| AC-R53-1..4 (Trainium parser) | All PASS; 4 runtime tests; Trainium fixture produces 16 `trainium_chip` nodes + 32 deduped `neuron_link_peer` edges (4-neighbor 4×4 2D torus → 4·16/2 = 32 undirected edges); chip_family=`'trainium'`; partial=false |
| AC-R53-5..6 (Inferentia parser) | All PASS; 2 runtime tests; Inferentia ring fixture produces 6 `inferentia_chip` nodes + 6 deduped `neuron_link_peer` edges (2-neighbor 6-chip ring → 2·6/2 = 6 undirected edges); chip_family=`'inferentia'`; partial=false |
| AC-R53-7..8 (interface conformance) | PASS; 2 runtime tests; `NeuronTopologySource` constructed from Trainium fixture; `snapshotHash === computeSnapshotHash` |
| AC-R53-9 (sparse degradation) | PASS; 1 runtime test; sparse fixture (Trainium instance_type, 4 devices, all `connected_to: []`) produces 4 nodes + 0 edges + partial=true |
| AC-R53-10 (malformed input) | PASS; 1 runtime test (5 sub-assertions covering invalid JSON, missing instance_type, unknown prefix, missing neuron_devices, empty neuron_devices) |
| AC-R53-11 (chip-family discriminator) | PASS; 1 runtime test; mapping `'trn1.32xlarge'`→`'trainium'`→`'trainium_chip'` AND `'inf2.24xlarge'`→`'inferentia'`→`'inferentia_chip'` |
| AC-R53-12 (A16 verdict.ts literal) | PASS; 1 runtime test; verdict.ts contains `'correlational_not_causal: true'` literal |
| AC-R53-13 (typecheck attestation) | `npx tsc -p tsconfig.test.json` exits 0; zero diagnostics; ATTESTED in NEXT-ROLE.md + `Q-R53-EMPIRICAL.sh`, not runtime-bound |
| AC-R53-14 (test count attestation) | `node --test test/*.test.js` reports `tests=361+N / pass=356+N / fail=2 / skipped=3` where N = 13 new R53 runtime tests (AC-R53-1..12 + AC-R53-15; AC-R53-13/14 are attestation-only). Predicted: `tests=374 / pass=369 / fail=2 / skipped=3`. ATTESTED in NEXT-ROLE.md + `Q-R53-EMPIRICAL.sh`. |
| AC-R53-15 (anti-scope diff runtime test) | PASS; round-start-to-chore-A diff ⊆ 12-entry allowed-set (§ 3); 13th entry only if HALT-DIAGNOSTIC fires |

### § 1.5 Counter-ingestion intentionally out-of-scope

Unlike R30 NVLink (which exported `ingestNvlinkErrorCounter` to exercise the L0 contract's 32-bit wraparound path), R53 does NOT export a Neuron-specific counter-ingestion helper. Rationale: the WAVE-PLAN Step 1 file-tree scope row does NOT enumerate an L0-helper or `engine/l0/counter-rate-transform.ts` consumer; Phase 3 SLICE 1 is explicitly synthetic-fixture-based vendor-expansion, not L0 contract extension. If Trainium or Inferentia expose 32-bit counters that warrant a `transformPair` wrapper, that lands at SLICE 2 alongside `WU-Phase3-2C` real-cluster L0 validation (Path A conditional). Out-of-scope for R53; not a halt condition.

---

## § 2 Mechanism

The Neuron topology adapter is a Tessera-original concrete `TopologySource` impl that parses `neuron-ls --json-output` JSON into a `TopologySnapshot` of `trainium_chip`-or-`inferentia_chip` nodes + `neuron_link_peer` edges, with chip-family discriminated by the `instance_type` prefix.

### § 2.1 Parser (`parseNeuronLsJson`)

Pure function. Input: raw JSON text (`neuron-ls --json-output` stdout). Output: `{ snapshot: TopologySnapshot, partial: boolean, chip_family: 'trainium' | 'inferentia' }`.

Steps:
1. **Parse JSON.** Call `JSON.parse(rawText)`. Wrap any throw as `Error('NEURON_PARSE_INVALID_JSON: ' + originalMessage)`.
2. **Validate `instance_type` field.** Read `parsed.instance_type`. If not a string → throw `NEURON_PARSE_MISSING_INSTANCE_TYPE`. If `startsWith('trn')` → `chip_family = 'trainium'`, `nodeKind = 'trainium_chip'`. Else if `startsWith('inf')` → `chip_family = 'inferentia'`, `nodeKind = 'inferentia_chip'`. Else → throw `NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: <value>`.
3. **Validate `neuron_devices` field.** Read `parsed.neuron_devices`. If not an Array → throw `NEURON_PARSE_MISSING_NEURON_DEVICES`. If empty → throw `NEURON_PARSE_NO_DEVICES`.
4. **Emit nodes.** For each `device` in `parsed.neuron_devices`: compute `id = \`neuron-${device.neuron_device}\``; emit `TopologyNode { id, service_name: id, kind: nodeKind }`. Track in `nodeIds: Set<string>` for opportunistic peer-emission dedup.
5. **Emit edges (undirected-deduped).** For each `device`, read `device.connected_to` (default `[]` if undefined/null). For each `peerNumericId`: compute `peerId = \`neuron-${peerNumericId}\``; if `peerId === device.id` → skip (self-peer defensive guard); if `peerId` not in `nodeIds` → emit a peer node opportunistically (mirrors R30 NVLink line 74-81; uses the same chip-family `nodeKind`); record raw edge pair `(deviceId, peerId)`.
6. **Canonical dedup.** For each raw pair `(a, b)`: compute `from = min(a, b)`, `to = max(a, b)` via lex compare; insert key `${from}|${to}` into `edgeKeys: Set<string>` for dedup; emit `TopologyEdge { from, to, relationship: 'neuron_link_peer' }` if new.
7. **Compute `partial` flag.** `partial = (edges.length === 0)`.
8. **Build snapshot.** `nodes` and `edges` per above; `fetched_at_ts = opts.fetched_at_ts ?? Math.floor(Date.now() / 1000)`; `source_id = opts.source_id ?? 'neuron_topology_source'`; `source_version = opts.source_version ?? 'neuron-1'`.

Output: `{ snapshot, partial, chip_family }`.

### § 2.2 TopologySource class (`NeuronTopologySource`)

Class implementing `TopologySource` interface (`engine/topology-overlay.ts:50-55`). Structurally parallel to `NvlinkTopologySource` (`engine/topology/nvlink-source.ts:115-147`).

Constructor:
- Input: `jsonText: string, opts?: { id?: string; version?: string; fetched_at_ts?: number; source_id?: string; source_version?: string }`.
- Calls `parseNeuronLsJson(jsonText, opts)` and stores `this.snapshot = snapshot`.
- `this.id = opts.id ?? snapshot.source_id ?? 'neuron_topology_source'`.
- `this.version = opts.version ?? snapshot.source_version ?? 'neuron-1'`.

Methods:
- `async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot>` → returns `this.snapshot`.
- `snapshotHash(snapshot: TopologySnapshot): string` → delegates to `computeSnapshotHash(snapshot)`.

Notes:
- The `chip_family` field is NOT exposed on the class — it's a parser-only artifact. Callers who need it call `parseNeuronLsJson` directly.
- Constructor does NOT swallow parser errors. Truly malformed input (per § 1.3) throws and propagates.

### § 2.3 Chip-family discriminator helper

Implementation detail of `parseNeuronLsJson` (NOT a separately exported function — keeps surface minimal):

```typescript
// inline helper inside parseNeuronLsJson
function chipFamilyFromInstanceType(instanceType: string):
  { chip_family: 'trainium' | 'inferentia'; node_kind: 'trainium_chip' | 'inferentia_chip' } {
  if (instanceType.startsWith('trn')) return { chip_family: 'trainium', node_kind: 'trainium_chip' };
  if (instanceType.startsWith('inf')) return { chip_family: 'inferentia', node_kind: 'inferentia_chip' };
  throw new Error(`NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: ${instanceType}`);
}
```

Future Trainium/Inferentia generations (`trn2.*`, `trn3.*`, `inf3.*`) match the prefix automatically; no parser change required when AWS announces new instance sizes.

### § 2.4 verdict.ts schema deltas (vendored-with-deltas; two-step maintenance)

Two enum additions to the existing vendored-with-deltas file `engine/types/verdict.ts`. Both are additive (do not remove or rename existing members; preserve Addition #25 D2/D5 + Addition #26 D4):

1. **`TopologyNode.kind` union extension at `engine/types/verdict.ts:245`:**
   ```typescript
   kind: 'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack' | 'psu' | 'cooling_zone' | 'trainium_chip' | 'inferentia_chip';
   ```
   (R53 adds `| 'trainium_chip' | 'inferentia_chip'` to the existing 8-member union.)

2. **`TopologyEdge.relationship` union extension at `engine/types/verdict.ts:255`:**
   ```typescript
   relationship: 'calls' | 'reads' | 'writes' | 'publishes' | 'contains' | 'nvlink_peer' | 'neuron_link_peer';
   ```
   (R53 adds `| 'neuron_link_peer'` to the existing 6-member union.)

Two-step maintenance (per PHASE-2-SLICE-1-CLOSE-WALK § 2.1):
- **Step 1:** `engine/types/verdict.ts` row in `coordination/VENDORING-MANIFEST.md` note column extended to enumerate the R53 deltas (single-row note refresh). Existing note text:
  > "R18 Phase 2 SLICE 1 deltas: ...; R23 Phase 2 SLICE 3.A deltas: TopologyNode.kind union extends with `\| 'psu' \| 'cooling_zone'`; TopologyEdge.relationship union extends with `\| 'nvlink_peer'`. ..."

  R53 appends:
  > "R53 Phase 3 SLICE 1 deltas: TopologyNode.kind union extends with `\| 'trainium_chip' \| 'inferentia_chip'`; TopologyEdge.relationship union extends with `\| 'neuron_link_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."
- **Step 2:** `engine/types/verdict.ts` already EXCLUDED from `test/q01-no-at-pin-deltas.test.ts` `AT_PIN_FILES` list per the comment at `test/q01-no-at-pin-deltas.test.ts:54-55` ("verdict.ts excluded — vendored-with-deltas at R18 for cluster_event_id + TopologyNode.kind + TopologyEdge.relationship"). No test list maintenance needed at R53 — Step 2 was permanently completed at R18.

---

## § 3 Anti-scope (allowed-set for round-start-to-chore-A diff)

`git diff 3744012..chore-A-SHA --name-only` must produce a subset of:

```
engine/topology/neuron-source.ts
engine/types/verdict.ts
test/q53-neuron-adapter.test.ts
test/_substrate/neuron-fixture-trainium-2d-torus.json
test/_substrate/neuron-fixture-inferentia-ring.json
test/_substrate/neuron-fixture-sparse.json
coordination/VENDORING-MANIFEST.md
coordination/specs/Q-R53-SPEC.md
coordination/specs/Q-R53-SPEC-AUDIT.md
coordination/specs/Q-R53-EMPIRICAL.sh
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

**12 entries.** Verified git-trackable per R23 ARCH MINOR-2 reinforcement (Q-R53-SPEC-AUDIT.md § 4 contains the per-path `git ls-files` / `.gitignore` audit). All NEW files have parent directories that already contain tracked content of the same extension (`.ts` / `.json` / `.md` / `.sh`); no path is gitignored.

**Conditional 13th entry** (per R25 MAJOR-2 reinforcement at CLAUDE-COMMON.md REINFORCED 2026-05-17 — HALT-fire scenarios commit DIAGNOSTIC BEFORE chore-A; therefore the DIAGNOSTIC path enters the chore-A diff range):

```
coordination/diagnostics/DIAGNOSTIC-R53-*.md
```

If any halt condition (§ 6) fires mid-round and produces a `coordination/diagnostics/DIAGNOSTIC-R53-<topic>.md`, the AC-R53-15 `ALLOWED_SET` literal must include the specific DIAGNOSTIC path as its 13th entry. The Implementer adds the literal to the test ONLY if a HALT fires; otherwise the test ships with 12 entries.

**Anti-scope inheritance from NEXT-ROLE.md R53 directive + Phase 2/3 PRD:**
- A12: NO modification of inherited vendored-at-pin engine internals (`engine/topology-overlay.ts`, `engine/core.ts`, `engine/l0/counter-rate-transform.ts`, `engine/l0/schema-continuity.ts`, `engine/hardware-topology-source.ts`, `engine/topology/{slurm,k8s,nvlink}-source.ts`, `engine/topology/common-mode-attribution.ts`). `engine/types/verdict.ts` is the sole modified engine file (vendored-with-deltas; additive enum extensions only — no removal of existing members).
- A10: NO hardware diagnosis (adapter parses topology config; does NOT diagnose per-chip faults).
- A11: NO live AWS/Neuron endpoints (synthetic fixtures only; production scrape loop wiring is out-of-scope per WAVE-PLAN).
- A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` literal preserved; AC-R53-12).
- A17: NO DeploySignal integration (Phase 3 SLICE 3 scope).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (OQ-Phase3-W1-2 Option B operator disposition: defer § 2.3 amendments to Phase 3 SLICE-close walk).
- NO modification of `coordination/PRD.md` Phase 3 sub-section.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing deferred — no new derivation expected this round).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of any pre-R52 test file (Phase 1 + Phase 2 test suite frozen).
- NO modification of `scripts/*` (R45-R51 deliverables stable).
- NO modification of `run-pipeline.sh` (R49-R51 deliverables stable).
- NO modification of `CLAUDE-*.md` REINFORCEMENTS sections (R51 consolidation + re-accretion guard; the Memorial-Updater stage at round close applies the threshold-aware rule, NOT this Architect spec).
- NO real customer telemetry (A8/A11 inherited).
- NO Phase 3 SLICE 2+ work (TPU adapter, live cluster fetch, etc.) — strictly SLICE 1.
- NO opening any GitHub PRs.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/topology/neuron-source.ts` (NEW; Tessera-original)

```typescript
// engine/topology/neuron-source.ts — Phase 3 SLICE 1 WU-Phase3-1 AWS Neuron topology adapter (R53).
//
// Three exports:
//   1. parseNeuronLsJson(jsonText, opts) — pure JSON parser for `neuron-ls --json-output`
//      stdout. Produces a TopologySnapshot with chip-family-discriminated node kinds
//      (`trainium_chip` or `inferentia_chip` per R53 enum addition) and `neuron_link_peer`
//      edges (R53 enum addition). Chip family is determined by `instance_type` prefix:
//      `trn*` → trainium, `inf*` → inferentia. Edges are undirected-deduped (canonical
//      from = min(a, b) lex order on `neuron-N` id form); self-peer entries are skipped;
//      peer ids referenced in `connected_to` but absent from `neuron_devices` are emitted
//      opportunistically as nodes. Sparse handling: input with devices but no `connected_to`
//      entries → nodes only, edges = [], partial = true. Failure modes throw one of:
//      NEURON_PARSE_INVALID_JSON, NEURON_PARSE_MISSING_INSTANCE_TYPE,
//      NEURON_PARSE_UNKNOWN_INSTANCE_TYPE, NEURON_PARSE_MISSING_NEURON_DEVICES,
//      NEURON_PARSE_NO_DEVICES.
//   2. NeuronTopologySource — thin TopologySource impl wrapping the parser.
//      Structurally parallel to NvlinkTopologySource (R30) and SlurmTopologySource (R28).
//      snapshotHash delegates to computeSnapshotHash per Addition #26 D6.
//   3. (No L0 counter-ingestion helper at R53; counter ingestion is deferred to SLICE 2
//      conditional on Path A operator disposition at WAVE-GATE-Phase3-01 close.)
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from '../topology-overlay';

export interface NeuronParseOpts {
  /** Epoch-seconds timestamp for the produced snapshot. Defaults to current wall clock. */
  fetched_at_ts?: number;
  /** Source-id literal for the produced snapshot. Defaults to 'neuron_topology_source'. */
  source_id?: string;
  /** Source-version literal for the produced snapshot. Defaults to 'neuron-1'. */
  source_version?: string;
}

export interface NeuronParseResult {
  snapshot: TopologySnapshot;
  /** true iff devices were parsed but no `connected_to` entries yielded edges. */
  partial: boolean;
  /** Chip family inferred from the fixture's `instance_type` prefix. */
  chip_family: 'trainium' | 'inferentia';
}

interface NeuronLsJsonDevice {
  neuron_device: number;
  connected_to?: number[];
}

interface NeuronLsJsonRoot {
  instance_type: string;
  neuron_devices: NeuronLsJsonDevice[];
}

function chipFamilyFromInstanceType(instanceType: string):
  { chip_family: 'trainium' | 'inferentia'; node_kind: 'trainium_chip' | 'inferentia_chip' } {
  if (instanceType.startsWith('trn')) return { chip_family: 'trainium', node_kind: 'trainium_chip' };
  if (instanceType.startsWith('inf')) return { chip_family: 'inferentia', node_kind: 'inferentia_chip' };
  throw new Error(`NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: ${instanceType}`);
}

export function parseNeuronLsJson(jsonText: string, opts: NeuronParseOpts = {}): NeuronParseResult {
  // Step 1: JSON parse with wrap-and-rethrow
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`NEURON_PARSE_INVALID_JSON: ${msg}`);
  }

  // Step 2: validate top-level shape
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('NEURON_PARSE_MISSING_INSTANCE_TYPE');
  }
  const root = parsed as Partial<NeuronLsJsonRoot>;
  if (typeof root.instance_type !== 'string') {
    throw new Error('NEURON_PARSE_MISSING_INSTANCE_TYPE');
  }
  const { chip_family, node_kind } = chipFamilyFromInstanceType(root.instance_type);

  if (!Array.isArray(root.neuron_devices)) {
    throw new Error('NEURON_PARSE_MISSING_NEURON_DEVICES');
  }
  if (root.neuron_devices.length === 0) {
    throw new Error('NEURON_PARSE_NO_DEVICES');
  }

  // Step 3: emit nodes + collect raw edge pairs
  const nodes: TopologyNode[] = [];
  const nodeIds: Set<string> = new Set();
  const rawEdgePairs: Array<[string, string]> = [];

  for (const device of root.neuron_devices) {
    const id = `neuron-${device.neuron_device}`;
    if (!nodeIds.has(id)) {
      nodes.push({ id, service_name: id, kind: node_kind });
      nodeIds.add(id);
    }
    const peers: number[] = Array.isArray(device.connected_to) ? device.connected_to : [];
    for (const peerNumericId of peers) {
      const peerId = `neuron-${peerNumericId}`;
      if (peerId === id) continue; // self-peer defensive guard
      if (!nodeIds.has(peerId)) {
        nodes.push({ id: peerId, service_name: peerId, kind: node_kind });
        nodeIds.add(peerId);
      }
      rawEdgePairs.push([id, peerId]);
    }
  }

  // Step 4: canonical undirected dedup
  const edgeKeys = new Set<string>();
  const edges: TopologyEdge[] = [];
  for (const [a, b] of rawEdgePairs) {
    const from = a < b ? a : b;
    const to   = a < b ? b : a;
    const key  = `${from}|${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ from, to, relationship: 'neuron_link_peer' });
  }

  const partial = edges.length === 0;

  const snapshot: TopologySnapshot = {
    nodes,
    edges,
    fetched_at_ts: opts.fetched_at_ts ?? Math.floor(Date.now() / 1000),
    source_id:     opts.source_id     ?? 'neuron_topology_source',
    source_version: opts.source_version ?? 'neuron-1',
  };

  return { snapshot, partial, chip_family };
}

export class NeuronTopologySource implements TopologySource {
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
    const { snapshot } = parseNeuronLsJson(jsonText, {
      fetched_at_ts: opts.fetched_at_ts,
      source_id: opts.source_id,
      source_version: opts.source_version,
    });
    this.snapshot = snapshot;
    // Third operands ('neuron_topology_source' / 'neuron-1') are structurally unreachable:
    // parseNeuronLsJson always defaults snapshot.source_id / source_version (typed string,
    // never undefined). Retained for defensive correctness if parseNeuronLsJson is ever
    // modified — mirrors R30 NvlinkTopologySource constructor pattern.
    this.id      = opts.id      ?? snapshot.source_id     ?? 'neuron_topology_source';
    this.version = opts.version ?? snapshot.source_version ?? 'neuron-1';
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
- Use lex compare `a < b` on `neuron-N` ids for canonical ordering. R53 fixtures use single-digit IDs (0-15 for Trainium; 0-5 for Inferentia). Lex ordering for `neuron-0`..`neuron-9` matches numeric ordering. For `neuron-10`..`neuron-15`, lex `neuron-1` < `neuron-10` differs from numeric `1 < 10`. The AC-R53-4 dedup test asserts set-equality (not pairwise ordering), so the lex-vs-numeric distinction does NOT affect AC outcomes. Documented as forward-flag for future Wave-3+ rounds using ≥16-chip fixtures (parser would need zero-padded IDs if numeric ordering becomes load-bearing).
- The `if (peerId === id) continue` self-peer guard is defensive; `neuron-ls --json-output` should never list a device as its own peer; the guard avoids creating malformed edges if a future fixture has this shape. NOT exercised by R53 ACs; documented as defensive code (mirrors R30 NvlinkSource line-by-line).

### § 4.2 `test/_substrate/neuron-fixture-trainium-2d-torus.json` (NEW; Tessera-original)

Canonical Trn1.32xlarge representation: 16 Trainium chips in a 4×4 2D Torus with wraparound; each chip has 4 NeuronLink-v2 peers (left, right, up, down with wraparound). UTF-8 text, LF line endings.

Layout (row, col) → chip id = row × 4 + col:
- Chip (0,0) = id 0: peers (0,1)=1, (0,3)=3, (1,0)=4, (3,0)=12
- Chip (0,1) = id 1: peers (0,0)=0, (0,2)=2, (1,1)=5, (3,1)=13
- ... (analogous for all 16 chips)

```json
{
  "instance_type": "trn1.32xlarge",
  "neuron_devices": [
    { "neuron_device": 0,  "connected_to": [1, 3, 4, 12] },
    { "neuron_device": 1,  "connected_to": [0, 2, 5, 13] },
    { "neuron_device": 2,  "connected_to": [1, 3, 6, 14] },
    { "neuron_device": 3,  "connected_to": [0, 2, 7, 15] },
    { "neuron_device": 4,  "connected_to": [0, 5, 7, 8]  },
    { "neuron_device": 5,  "connected_to": [1, 4, 6, 9]  },
    { "neuron_device": 6,  "connected_to": [2, 5, 7, 10] },
    { "neuron_device": 7,  "connected_to": [3, 4, 6, 11] },
    { "neuron_device": 8,  "connected_to": [4, 9, 11, 12] },
    { "neuron_device": 9,  "connected_to": [5, 8, 10, 13] },
    { "neuron_device": 10, "connected_to": [6, 9, 11, 14] },
    { "neuron_device": 11, "connected_to": [7, 8, 10, 15] },
    { "neuron_device": 12, "connected_to": [0, 8, 13, 15] },
    { "neuron_device": 13, "connected_to": [1, 9, 12, 14] },
    { "neuron_device": 14, "connected_to": [2, 10, 13, 15] },
    { "neuron_device": 15, "connected_to": [3, 11, 12, 14] }
  ]
}
```

Expected parse: 16 nodes (all kind `trainium_chip`); 32 undirected-deduped edges (4 neighbors × 16 chips / 2 = 32 unique pairs); partial=false; chip_family=`trainium`.

### § 4.3 `test/_substrate/neuron-fixture-inferentia-ring.json` (NEW; Tessera-original)

Synthetic 6-chip Inferentia2 ring (matches inf2.24xlarge chip count; 2 NeuronLink-v2 peers per chip). UTF-8 text, LF line endings.

Ring: 0 — 1 — 2 — 3 — 4 — 5 — 0 (wraparound).

```json
{
  "instance_type": "inf2.24xlarge",
  "neuron_devices": [
    { "neuron_device": 0, "connected_to": [1, 5] },
    { "neuron_device": 1, "connected_to": [0, 2] },
    { "neuron_device": 2, "connected_to": [1, 3] },
    { "neuron_device": 3, "connected_to": [2, 4] },
    { "neuron_device": 4, "connected_to": [3, 5] },
    { "neuron_device": 5, "connected_to": [4, 0] }
  ]
}
```

Expected parse: 6 nodes (all kind `inferentia_chip`); 6 undirected-deduped edges; partial=false; chip_family=`inferentia`.

### § 4.4 `test/_substrate/neuron-fixture-sparse.json` (NEW; Tessera-original)

Sparse Trainium fixture exercising the LS-4 graceful-degradation path. 4 devices present but no `connected_to` entries. UTF-8 text, LF line endings.

```json
{
  "instance_type": "trn1.32xlarge",
  "neuron_devices": [
    { "neuron_device": 0, "connected_to": [] },
    { "neuron_device": 1, "connected_to": [] },
    { "neuron_device": 2, "connected_to": [] },
    { "neuron_device": 3, "connected_to": [] }
  ]
}
```

Expected parse: 4 nodes (all kind `trainium_chip`); 0 edges; partial=true; chip_family=`trainium`.

### § 4.5 `test/q53-neuron-adapter.test.ts` (NEW; Tessera-original)

```typescript
// test/q53-neuron-adapter.test.ts — Phase 3 SLICE 1 WU-Phase3-1 bindings (R53).
//
// Binds AC-R53-1 through AC-R53-12 + AC-R53-15 (13 runtime tests) per Q-R53-SPEC.md § 5.
// AC-R53-13 (typecheck) and AC-R53-14 (test count) are binding-command attestations
// reported by the Implementer at chore-A; not runtime-bound. They are mechanically
// verified by coordination/specs/Q-R53-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation` (R46 canonical landing).
//
// AC-R53-15 (anti-scope diff) is a runtime test that the Implementer appends in
// chore-B with the chore-A SHA substituted into the diff baseline literal.
//
// Covers: neuron-ls --json-output parser (Trainium 2D Torus + Inferentia ring + sparse);
// instance_type chip-family discrimination (trn* → trainium_chip; inf* → inferentia_chip);
// edge relationship = 'neuron_link_peer' (R53 enum addition); undirected-deduped canonical
// ordering; NeuronTopologySource interface conformance; snapshotHash delegation; id/version
// fallback chain; sparse-partial detection; throw on 5 malformed-input shapes; A16
// verdict.ts literal preservation; anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseNeuronLsJson,
  NeuronTopologySource,
} from '../engine/topology/neuron-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

const TRAINIUM   = readFileSync('test/_substrate/neuron-fixture-trainium-2d-torus.json', 'utf8');
const INFERENTIA = readFileSync('test/_substrate/neuron-fixture-inferentia-ring.json',   'utf8');
const SPARSE     = readFileSync('test/_substrate/neuron-fixture-sparse.json',            'utf8');

// AC-R53-1: Trainium fixture parses to 16 trainium_chip nodes + 32 neuron_link_peer edges
test('AC-R53-1: parseNeuronLsJson on Trainium 4x4 2D Torus → 16 nodes + 32 edges + chip_family=trainium', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 16);
  assert.strictEqual(snapshot.edges.length, 32);
  assert.strictEqual(partial, false);
  assert.strictEqual(chip_family, 'trainium');
});

// AC-R53-2: every Trainium fixture node has kind === 'trainium_chip'
test("AC-R53-2: every node from Trainium fixture has kind === 'trainium_chip'", () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'trainium_chip');
  }
});

// AC-R53-3: every Trainium fixture edge has relationship === 'neuron_link_peer'
test("AC-R53-3: every edge from Trainium fixture has relationship === 'neuron_link_peer'", () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'neuron_link_peer');
  }
});

// AC-R53-4: Trainium edges are canonical undirected-deduped (from < to lex); unique pairs
test('AC-R53-4: Trainium edges are canonical undirected-deduped (from < to); 32 unique pairs', () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  assert.strictEqual(keys.length, 32, 'exactly 32 deduped edges');
});

// AC-R53-5: Inferentia fixture parses to 6 inferentia_chip nodes + 6 neuron_link_peer edges
test('AC-R53-5: parseNeuronLsJson on Inferentia 6-chip ring → 6 nodes + 6 edges + chip_family=inferentia', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(INFERENTIA, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 6);
  assert.strictEqual(snapshot.edges.length, 6);
  assert.strictEqual(partial, false);
  assert.strictEqual(chip_family, 'inferentia');
});

// AC-R53-6: every Inferentia fixture node has kind === 'inferentia_chip' AND every edge has 'neuron_link_peer'
test("AC-R53-6: every node from Inferentia fixture has kind === 'inferentia_chip' and edges have 'neuron_link_peer'", () => {
  const { snapshot } = parseNeuronLsJson(INFERENTIA);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'inferentia_chip');
  }
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'neuron_link_peer');
  }
});

// AC-R53-7: NeuronTopologySource implements TopologySource interface
// AND id/version fallback chain branches are observable
test('AC-R53-7: NeuronTopologySource implements TopologySource + id/version fallback', async () => {
  // (a) default construction — exercises branch 2 of `??`-chain
  //     (opts.id undefined → snapshot.source_id default literal 'neuron_topology_source')
  const src = new NeuronTopologySource(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(src.id, 'neuron_topology_source');
  assert.strictEqual(src.version, 'neuron-1');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);

  // (b) explicit opts.id + opts.version — exercises branch 1 of `??`-chain
  const srcExplicit = new NeuronTopologySource(TRAINIUM, {
    id: 'explicit-test-id',
    version: 'explicit-test-ver',
    fetched_at_ts: 1_700_000_000,
  });
  assert.strictEqual(srcExplicit.id, 'explicit-test-id');
  assert.strictEqual(srcExplicit.version, 'explicit-test-ver');
});

// AC-R53-8: snapshotHash delegates to computeSnapshotHash
test('AC-R53-8: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new NeuronTopologySource(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R53-9: sparse fixture (no peer info) → nodes only, 0 edges, partial=true
test('AC-R53-9: sparse fixture (empty connected_to) → nodes only, 0 edges, partial=true', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(SPARSE);
  assert.strictEqual(snapshot.nodes.length, 4);
  assert.strictEqual(snapshot.edges.length, 0);
  assert.strictEqual(partial, true);
  assert.strictEqual(chip_family, 'trainium');
});

// AC-R53-10: malformed input throws one of the documented error names (5 sub-cases)
test('AC-R53-10: malformed input throws NEURON_PARSE_* (5 sub-cases)', () => {
  // (a) invalid JSON
  assert.throws(() => parseNeuronLsJson('not-json'), /NEURON_PARSE_INVALID_JSON/);
  // (b) missing instance_type
  assert.throws(() => parseNeuronLsJson(JSON.stringify({ neuron_devices: [] })), /NEURON_PARSE_MISSING_INSTANCE_TYPE/);
  // (c) unknown instance_type prefix
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'p4d.24xlarge', neuron_devices: [{ neuron_device: 0 }] })),
    /NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/,
  );
  // (d) missing neuron_devices
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'trn1.32xlarge' })),
    /NEURON_PARSE_MISSING_NEURON_DEVICES/,
  );
  // (e) empty neuron_devices
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'trn1.32xlarge', neuron_devices: [] })),
    /NEURON_PARSE_NO_DEVICES/,
  );
});

// AC-R53-11: chip-family discriminator maps instance_type prefix correctly
test('AC-R53-11: chip-family discriminator maps trn* → trainium_chip and inf* → inferentia_chip', () => {
  const { chip_family: cf_trn, snapshot: snap_trn } = parseNeuronLsJson(TRAINIUM);
  assert.strictEqual(cf_trn, 'trainium');
  assert.strictEqual(snap_trn.nodes[0].kind, 'trainium_chip');

  const { chip_family: cf_inf, snapshot: snap_inf } = parseNeuronLsJson(INFERENTIA);
  assert.strictEqual(cf_inf, 'inferentia');
  assert.strictEqual(snap_inf.nodes[0].kind, 'inferentia_chip');
});

// AC-R53-12: A16 — engine/types/verdict.ts retains the 'correlational_not_causal: true' literal
test("AC-R53-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal", () => {
  const text = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(
    text.includes('correlational_not_causal: true'),
    "verdict.ts must contain literal 'correlational_not_causal: true' per Addition #26 D4",
  );
});

// AC-R53-15: anti-scope file-set diff against round-start baseline 3744012
// (Appended by Implementer at chore-B with chore-A SHA substituted.)
test('AC-R53-15: round-start-to-chore-A diff ⊆ R53 allowed-set (chore-A SHA pinned)', () => {
  const BASELINE_SHA = '3744012';
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/neuron-source.ts',
    'engine/types/verdict.ts',
    'test/q53-neuron-adapter.test.ts',
    'test/_substrate/neuron-fixture-trainium-2d-torus.json',
    'test/_substrate/neuron-fixture-inferentia-ring.json',
    'test/_substrate/neuron-fixture-sparse.json',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/specs/Q-R53-SPEC.md',
    'coordination/specs/Q-R53-SPEC-AUDIT.md',
    'coordination/specs/Q-R53-EMPIRICAL.sh',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 13th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R53 path in chore-A diff: ${p}`);
  }
});
```

**Implementer notes:**
- AC-R53-13 and AC-R53-14 are NOT runtime tests; they are binding-command attestations mechanically verified by `coordination/specs/Q-R53-EMPIRICAL.sh` (per Rule 1 sub-class `empirical-command-attestation` R46 canonical landing). The Implementer attests in NEXT-ROLE.md by quoting the script's verbatim output.
- The CHORE_A_SHA placeholder `<INJECTED-AT-CHORE-B>` is substituted with the actual SHA after chore-A is committed; AC-R53-15 is appended in a chore-B commit per the R23 / R25 / R30 precedent.
- TDD discipline (R23 IMPL MINOR-1): RED commit prefix before combined test+impl commit. The TypeScript imports + assertion blocks fail at RED because `parseNeuronLsJson` / `NeuronTopologySource` / the schema literals do not yet exist; GREEN commit lands implementation + verdict.ts deltas + fixture files together.

### § 4.6 `coordination/specs/Q-R53-EMPIRICAL.sh` (NEW; Tessera-original; Rule 1 sub-class self-application)

Executable bash file (`chmod +x`) housing one labeled block per empirical AC. Each block exits non-zero on mismatch; aggregate exit code reported by `scripts/verify-empirical-acs.sh R53`. Convention mirrors `coordination/specs/Q-R46-EMPIRICAL.sh` (canonical R46 landing).

Required blocks:
- **AC-R53-13** (tsc exit): `npx tsc -p tsconfig.test.json`; assert `EXIT=0`.
- **AC-R53-14** (test summary): `node --test --test-reporter=tap test/*.test.js`; parse `# tests N`, `# pass N`, `# fail N`, `# skipped N`; assert summary `tests/pass/fail/skipped = 374/369/2/3` (predicted; if actual differs, the Implementer attests the actual value verbatim per false-compliance-attestation prevention).
- **AC-R53-15** (anti-scope advisory): manual `git diff ${ROUND_START_SHA}..${CHORE_A_SHA} --name-only` ⊆ ALLOWED_SET; advisory PASS (Implementer attests at chore-A).
- **AC-R53-12** (A16 literal): `grep -c 'correlational_not_causal: true' engine/types/verdict.ts`; assert count ≥ 1.
- **File-existence checks** (one block each): `[ -f engine/topology/neuron-source.ts ]`, `[ -f test/q53-neuron-adapter.test.ts ]`, `[ -f test/_substrate/neuron-fixture-trainium-2d-torus.json ]`, `[ -f test/_substrate/neuron-fixture-inferentia-ring.json ]`, `[ -f test/_substrate/neuron-fixture-sparse.json ]`.
- **Schema-extension verification** (one block each):
  - `grep -c "'trainium_chip'" engine/types/verdict.ts` ≥ 1
  - `grep -c "'inferentia_chip'" engine/types/verdict.ts` ≥ 1
  - `grep -c "'neuron_link_peer'" engine/types/verdict.ts` ≥ 1

Aggregate: exit 0 iff all blocks PASS; exit 1 otherwise. Invocation at chore-A: `bash coordination/specs/Q-R53-EMPIRICAL.sh`. (Implementer may run via `scripts/verify-empirical-acs.sh R53` per R46/R51 harness convention.)

### § 4.7 `coordination/VENDORING-MANIFEST.md` (MODIFIED; one row's note column refresh)

The `engine/types/verdict.ts` row in the "DeploySignal engine vendoring" table is the only row touched. Its current note text:

> "R18 Phase 2 SLICE 1 deltas: VerdictGroup `cluster_event_id?: string` (Phase 2 outer-aggregator hook); TopologyNode.kind union extends with `\| 'gpu_shard' \| 'rack'`; TopologyEdge.relationship union extends with `\| 'contains'`. Additive optional field + additive union members (preserves Addition #25 D2/D5 + Addition #26 D4). R23 Phase 2 SLICE 3.A deltas: TopologyNode.kind union extends with `\| 'psu' \| 'cooling_zone'`; TopologyEdge.relationship union extends with `\| 'nvlink_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."

R53 appends to the same note cell (single newline-separated extension; no other row touched):

> "R53 Phase 3 SLICE 1 deltas: TopologyNode.kind union extends with `\| 'trainium_chip' \| 'inferentia_chip'`; TopologyEdge.relationship union extends with `\| 'neuron_link_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4."

No other manifest column or row is modified.

---

## § 5 Acceptance criteria

**Preamble — Attestation classification:**
- **Runtime ACs:** AC-R53-1 through AC-R53-12 + AC-R53-15 (13 runtime tests in `test/q53-neuron-adapter.test.ts`).
- **Binding-command attestation ACs (mechanically verified by `Q-R53-EMPIRICAL.sh`; reported in NEXT-ROLE.md at chore-A; NOT runtime-bound):** AC-R53-13 (typecheck), AC-R53-14 (test count).
- **Total ACs:** 15.

Verified per R20 ARCH MINOR-1 reinforcement (AC-table preamble cross-check): each preamble classification claim matches § 4 prescription — AC-R53-13/14 are described as binding-command attestations and § 4.5 + § 4.6 prescribe them as `Q-R53-EMPIRICAL.sh` blocks + NEXT-ROLE.md attestations, NOT as `test()` declarations. AC-R53-1..12 + AC-R53-15 are described as runtime tests and § 4.5 prescribes them as `test()` declarations.

| AC | Given / When / Then | Bound by |
|---|---|---|
| AC-R53-1 | Given `test/_substrate/neuron-fixture-trainium-2d-torus.json` text, when `parseNeuronLsJson(text)` runs, then `snapshot.nodes.length === 16` AND `snapshot.edges.length === 32` AND `partial === false` AND `chip_family === 'trainium'`. | `test/q53-neuron-adapter.test.ts` `test('AC-R53-1: ...')` |
| AC-R53-2 | Given the Trainium fixture, when iterating `snapshot.nodes`, then every node's `kind` is exactly `'trainium_chip'` (R53 enum addition). | `test('AC-R53-2: ...')` |
| AC-R53-3 | Given the Trainium fixture, when iterating `snapshot.edges`, then every edge's `relationship` is exactly `'neuron_link_peer'` (R53 enum addition). | `test('AC-R53-3: ...')` |
| AC-R53-4 | Given the Trainium fixture, when iterating `snapshot.edges`, then (a) every edge has `from < to` (lex); (b) edge pair-keys are unique; (c) total deduped edge count = 32. | `test('AC-R53-4: ...')` |
| AC-R53-5 | Given `test/_substrate/neuron-fixture-inferentia-ring.json` text, when `parseNeuronLsJson(text)` runs, then `snapshot.nodes.length === 6` AND `snapshot.edges.length === 6` AND `partial === false` AND `chip_family === 'inferentia'`. | `test('AC-R53-5: ...')` |
| AC-R53-6 | Given the Inferentia fixture, when iterating `snapshot.nodes` and `snapshot.edges`, then every node's `kind === 'inferentia_chip'` AND every edge's `relationship === 'neuron_link_peer'`. | `test('AC-R53-6: ...')` |
| AC-R53-7 | Given the Trainium fixture text, when constructing `new NeuronTopologySource(text, opts)` (a) with default opts (no `id`/`version` provided) and (b) with explicit `{ id: 'explicit-test-id', version: 'explicit-test-ver' }`, then (a) `instance.id === 'neuron_topology_source'` AND `instance.version === 'neuron-1'` (branch 2 of `??`-chain: parser-default snapshot.source_id flows through); `await instance.fetchSnapshot()` returns a `TopologySnapshot` with array `nodes` + `edges`; `instance.snapshotHash(snapshot)` returns a non-empty string; (b) `instance.id === 'explicit-test-id'` AND `instance.version === 'explicit-test-ver'` (branch 1 of `??`-chain: explicit opts override). | `test('AC-R53-7: ...')` |
| AC-R53-8 | Given a `NeuronTopologySource` instance and its snapshot, when comparing `instance.snapshotHash(snapshot)` to `computeSnapshotHash(snapshot)`, then the two strings are equal. | `test('AC-R53-8: ...')` |
| AC-R53-9 | Given `test/_substrate/neuron-fixture-sparse.json` (Trainium instance_type, 4 devices, all `connected_to: []`), when `parseNeuronLsJson(text)` runs, then `snapshot.nodes.length === 4` AND `snapshot.edges.length === 0` AND `partial === true` AND `chip_family === 'trainium'`. | `test('AC-R53-9: ...')` |
| AC-R53-10 | Given 5 malformed inputs — (a) invalid JSON `'not-json'`, (b) JSON with no `instance_type`, (c) JSON with `instance_type: 'p4d.24xlarge'` (unknown prefix), (d) JSON with `instance_type: 'trn1.32xlarge'` but no `neuron_devices`, (e) JSON with `instance_type: 'trn1.32xlarge'` and empty `neuron_devices: []` — when `parseNeuronLsJson(text)` runs, then each throws matching `/NEURON_PARSE_INVALID_JSON/`, `/NEURON_PARSE_MISSING_INSTANCE_TYPE/`, `/NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/`, `/NEURON_PARSE_MISSING_NEURON_DEVICES/`, `/NEURON_PARSE_NO_DEVICES/` respectively. | `test('AC-R53-10: ...')` |
| AC-R53-11 | Given the Trainium fixture and the Inferentia fixture, when each is parsed, then chip-family discriminator maps `trn*`-prefix `instance_type` → `chip_family === 'trainium'` AND every emitted node `kind === 'trainium_chip'`; and `inf*`-prefix `instance_type` → `chip_family === 'inferentia'` AND every emitted node `kind === 'inferentia_chip'`. | `test('AC-R53-11: ...')` |
| AC-R53-12 | Given `engine/types/verdict.ts` at HEAD, when reading the file as a string, then it contains the literal `'correlational_not_causal: true'` (preserving Addition #26 D4 per A16). | `test('AC-R53-12: ...')` |
| AC-R53-13 | Given the round-end working tree at chore-A SHA, when running `npx tsc -p tsconfig.test.json`, then exit code = 0 (the empirical R53-baseline) AND no new diagnostics reference `engine/topology/neuron-source.ts`, `test/q53-neuron-adapter.test.ts`, or `engine/types/verdict.ts` deltas. Attestation recorded in NEXT-ROLE.md verbatim via `coordination/specs/Q-R53-EMPIRICAL.sh` execution output — do NOT reframe as compliance (Rule 1 sub-class `false-compliance-attestation` R26 MAJOR-1 prevention). | NEXT-ROLE.md attestation (Implementer at chore-A) + `Q-R53-EMPIRICAL.sh` AC-R53-13 block |
| AC-R53-14 | Given the round-end working tree at chore-A SHA, when running `node --test --test-reporter=tap test/*.test.js`, then the output reports `tests=374 / pass=369 / fail=2 / skipped=3` (predicted; baseline 361/356/2/3 + 13 new R53 runtime tests; AC-R53-13/14 are attestation-only and add no `test()` block to the runtime suite). The 2 failures are: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set` (pre-existing inheritance — R36 CHORE_A_SHA literal `87e372f` predates Phase 3 routing); (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set` (same root cause). Attestation recorded in NEXT-ROLE.md verbatim via `Q-R53-EMPIRICAL.sh` execution output. If actual differs from predicted, the Implementer attests the actual value, not the predicted (Rule 1 sub-class `empirical-command-attestation` R46 canonical landing). | NEXT-ROLE.md attestation (Implementer at chore-A) + `Q-R53-EMPIRICAL.sh` AC-R53-14 block |
| AC-R53-15 | Given baseline SHA `3744012` and chore-A SHA (substituted at chore-B), when running `git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, then every output path is a member of the 12-entry allowed-set (§ 3) OR the 13th entry IFF a HALT fired mid-round. | `test('AC-R53-15: ...')` |

---

## § 6 Halt conditions (NEXT-ROLE.md-mandated + spec-prescribed procedure)

### § 6.1 NEXT-ROLE.md halt conditions (per R53 directive lines 87-91)

1. **Q-R53-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **Neuron SDK fixture format ambiguity:** if Architect-prescribed fixture format is empirically incompatible with the Neuron SDK actual output, HALT + DIAGNOSTIC. Mitigated by Architect using AWS public docs at `awsdocs-neuron.readthedocs-hosted.com` retrieved 2026-05-19 (§ 0.1).
3. **D5 schema-write-conflict regression:** if Architect spec inadvertently re-introduces split-adapter pattern (creating two separate `engine/topology/*-source.ts` files both extending `engine/types/verdict.ts`), HALT + DIAGNOSTIC per OQ-Phase3-W1-1 Option A resolution. Mitigated by § 0.2 Approach A pick (single file).
4. **Phase 1/2 ACs regress:** if test baseline changes any of AC-P1 through AC-P4 properties, HALT + DIAGNOSTIC per AC-P7 cross-cutting. Mitigated by AC-R53-14 (predicted 361 baseline preserved).
5. **Test baseline drift other than R53 additions:** any unexpected shift beyond +13 (the R53 runtime test additions) → HALT + DIAGNOSTIC.

### § 6.2 Spec-prescribed halt conditions (mirrors R30 § 6.1)

6. **JSON parsing requires modifying inherited `engine/topology-overlay.ts` BFS body** — A12 violation; HALT + DIAGNOSTIC + ESCALATE to Coordinator.
7. **Neuron format requires a node-kind or edge-relationship literal beyond the three R53 additions** — vendored-with-deltas re-amendment; HALT + DIAGNOSTIC + ESCALATE.
8. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per cross-project Rule 1 sub-class `false-compliance-attestation` (R26 MAJOR-1 reinforcement). DO NOT reframe; do NOT silently absorb.

### § 6.3 Halt procedure

On any halt condition firing:
1. STOP work on the current task.
2. Write `coordination/diagnostics/DIAGNOSTIC-R53-<topic>.md` describing: trigger (which halt condition + quoted actual mismatch); bounded resolution options (Option A / B / C with consequences); recommended option + rationale.
3. Commit the DIAGNOSTIC.
4. Update `coordination/NEXT-ROLE.md`: `NEXT-ROLE: ARCHITECT` (or COORDINATOR for cross-cluster issues); `STATUS: ESCALATE`; reference the DIAGNOSTIC by path.
5. Append the 13th entry `coordination/diagnostics/DIAGNOSTIC-R53-<topic>.md` to AC-R53-15 ALLOWED_SET when implementing the test (per § 3 conditional clause).

Per R25 MAJOR-2 reinforcement (CLAUDE-COMMON.md REINFORCED 2026-05-17): the DIAGNOSTIC file commit lands BEFORE chore-A; therefore the DIAGNOSTIC path enters the round-start-to-chore-A diff. The 13th-entry provision in § 3 is the spec's explicit pre-authorization for this case. If the Implementer is uncertain whether expanding the ALLOWED_SET to include the DIAGNOSTIC path is authorized, HALT for spec amendment rather than expand silently.

### § 6.4 R26 MAJOR-1 false-compliance-attestation prevention (sub-class)

If `npx tsc -p tsconfig.test.json` produces a NEW diagnostic referencing `engine/topology/neuron-source.ts`, `test/q53-neuron-adapter.test.ts`, or the `engine/types/verdict.ts` R53 deltas, the Implementer MUST:
- NOT reframe the diagnostic as a "warning" or attribute it to pre-existing infra.
- NOT silently extend the spec's `tsc` AC text to accommodate the new diagnostic.
- HALT and write a DIAGNOSTIC enumerating: the new diagnostic verbatim, the source line, the resolution options.
- ESCALATE to Architect.

The baseline empirical `tsc` exit 0 (verified at session entry) is the load-bearing property; any new diagnostic from R53 code is a regression, not an inheritance.

---

## § 7 Apply all 7 cross-project rules UPFRONT (per SPEC-AUTHORING-CHECKLIST § Rule 7 gate)

Per `coordination/SPEC-AUTHORING-CHECKLIST.md` "Spec § 7 enumeration directive" + `~/.claude/CROSS-PROJECT-MEMORIAL.md:3474-3478` Rule 7 canonical landing.

| Rule | Sub-class / pattern | R53 status | Round-specific check |
|---|---|---|---|
| 1 | `false-compliance-attestation` / `empirical-command-attestation` | **ACTIVE GATE** | `coordination/specs/Q-R53-EMPIRICAL.sh` runs at chore-A; reports per-AC pass/fail via `scripts/verify-empirical-acs.sh R53`. AC-R53-13 (tsc exit), AC-R53-14 (test count), AC-R53-12 (A16 literal), file-existence + schema-extension grep blocks. All numeric values cited as ACTUAL output of running the command at chore-A SHA — NOT memorized from spec text. § 4.6 prescribes the script. |
| 2 | `architect-branch-binding-coverage` | **ACTIVE GATE** | Q-R53-SPEC-AUDIT.md § 2.5 enumerates every guard / default / fallback in `engine/topology/neuron-source.ts` with binding AC or non-load-bearing rationale: 5 throw paths (AC-R53-10), opportunistic-peer-emission (AC-R53-1 + AC-R53-5), self-peer guard (defensive; not bound; documented), id/version fallback chain (3 branches in §2.2; binding TBD — single AC-R53-7 covers the happy-path; remaining branches documented in Q-R53-SPEC-AUDIT.md § 2.5 as defensive). |
| 3 | `implementer-spec-test-assertion-coverage` | **ACTIVE GATE** | Each AC Then-clause field uses discriminating assertions: `strictEqual` for counts/literals (AC-R53-1..5..9..11), `deepStrictEqual`-equivalent set comparisons for dedup keys (AC-R53-4), `assert.throws` with anchored regex for error names (AC-R53-10 — five separate regex per sub-case anchored to a distinguishing literal `: <value>` segment per R30 MINOR-1 reinforcement). |
| 4 | `anti-scope-allowed-set-forward-coverage` | **ACTIVE GATE** | ALLOWED_SET enumerated in § 3 at spec-emit time; 12 base entries + conditional 13th. AC-R53-15 reads its own literal (one source of truth in `test/q53-neuron-adapter.test.ts`); spec amendment required FIRST before any ALLOWED_SET expansion (no silent expansion at chore-A). |
| 5 | `self-application-gate` | **N/A** | No new rule is derived at R53. R52 was Coordinator-only (no rule derivation); R53 is single-cluster vendor expansion. The Memorial-Updater stage at round close does not anticipate new rule derivation; if any surfaces, Surface (c) re-application gate fires (per SPEC-AUTHORING-CHECKLIST § Round-of-derivation Surface (c) special case). |
| 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | **ACTIVE GATE** | § 6.1 + § 6.2 enumerate 8 halt-condition triggers; each carries a HALT + DIAGNOSTIC + ESCALATE prescription. The Implementer at chore-A MUST verify: if any halt-condition trigger fires during implementation (especially § 6.2 trigger 8 binding-command-vs-AC mismatch), DIAGNOSTIC file MUST exist in `coordination/diagnostics/DIAGNOSTIC-R53-<topic>.md` AND `STATUS: ESCALATE` in NEXT-ROLE.md. If no halt fires: mark N/A in MEMORIAL.md attestation. |
| 7 | `derived-rule-propagation-mechanism-required` | **ACTIVE GATE per Surface (a)** | Spec § 7 enumeration directive honored: this section enumerates all 7 rules with active-gate / N/A / already-validated dispositions per `SPEC-AUTHORING-CHECKLIST.md:130-143`. Surface (b) (`scripts/pre-commit-rule-sweep.sh`) fires at chore-A pre-commit. Surface (c) (round-of-derivation self-application) is N/A — no derivation expected this round. |

---

## § 8 Open questions

### § 8.1 PRD:434 file-naming inconsistency (resolved by OQ-Phase3-W1-1 disposition; documented for transparency)

PRD line 434 ("FR-V1a | AWS Trainium / Neuron Link adapter — `engine/topology/trainium-source.ts` parses...") explicitly names `trainium-source.ts` as the FR-V1a deliverable filename. Operator OQ-Phase3-W1-1 dispositioned Option A on 2026-05-19 (single unified `engine/topology/neuron-source.ts`), which supersedes the PRD's specific filename. Per OQ-Phase3-W1-2 disposition (Option B: defer SCOPING-MEMO § 2.3 amendments to SLICE-close walk), no PRD amendment lands at R53 — the FR-V1a / file-name inconsistency is logged in `coordination/MEMORIAL.md` at round close and resolved at the Phase 3 SLICE-close walk (Coordinator round after WAVE-GATE-Phase3-01).

**No halt** — operator-dispositioned ambiguity.

### § 8.2 GPU-id-style lex-vs-numeric ordering for `neuron-N` IDs ≥ 10

For single-digit IDs (`neuron-0`..`neuron-9`), lex order matches numeric. The R53 Trainium fixture uses IDs 0-15; the comparison `neuron-1` < `neuron-10` is lex-true but numeric-false (1 < 10). AC-R53-4 asserts (a) `from < to` lex and (b) set-equality on dedup keys; the dedup correctness does not depend on lex-vs-numeric matching (any consistent ordering deduplicates symmetric pairs). The forward-flag mirrors R30 § 7.2: if a future round needs ≥10 neuron IDs to be numeric-ordered, parser would need zero-padding (`neuron-00`..`neuron-15`). Tracked for Phase 3 SLICE 2 + future vendor adapters; not R53 scope.

**No halt** — ordering convention works for R53 ACs; documented for forward-flag.

### § 8.3 L0 counter-ingestion deferred (intentional, not OQ)

Per § 1.5: no `ingestNeuronErrorCounter` helper at R53. Trainium / Inferentia counter exposure (if any 32-bit wraparound paths exist in Neuron error counters) is deferred to SLICE 2 WU-Phase3-2C (Path A conditional on operator OQ-P3-9 disposition at WAVE-GATE-Phase3-01 close). Out-of-scope per WAVE-PLAN file-tree scope.

**No halt** — explicit Coordinator-level scope decision; not an Architect deferral.

### § 8.4 All other items resolved

No other open questions. All PRD requirements (FR-V1a, FR-V1b, AC-P5, AC-P7 cross-cutting) map to ACs; all integration points (§ 1.2) are verified against PRD requirements; all failure modes (§ 1.3) have prescribed handling.

---

## § 9 P3 ten-axis verification

Each axis verified with a one-sentence statement; supporting evidence in the spec body.

1. **Correctness** — All ACs produce binary pass/fail outcomes from observable function behavior; no probabilistic or threshold-based ambiguity. Edge counts (32 for 4×4 Torus; 6 for 6-chip ring) derive from exact graph-theoretic identities `(4·16)/2 = 32` and `(2·6)/2 = 6`.
2. **Completeness** — Every PRD requirement maps to ≥1 AC: FR-V1a (parser + interface + Trainium fixture ACs 1-4 + 7-8); FR-V1b (Inferentia fixture ACs 5-6 + 11); AC-P5 (consumable by inherited BFS layer; verified at runtime via `await src.fetchSnapshot()` + interface-shape assertion in AC-R53-7); AC-P7 cross-cutting (test baseline preserved at AC-R53-14); WAVE-PLAN Step 1 frame items (a)-(i) each map to ≥1 AC.
3. **Consistency** — § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription per R20 ARCH MINOR-1 cross-check; § 0 selected approaches (A/A/A/A) referenced consistently in § 2 / § 4 / § 5; AC numbering contiguous AC-R53-1 through AC-R53-15.
4. **Clarity** — No banned ambiguous-language tokens ("correctly", "appropriately", "as needed") appear in AC text. AC text uses concrete numeric / string-equality / regex-anchored expectations.
5. **Coverage** — 15 ACs binding 15 distinct concerns (4 Trainium parser ACs, 2 Inferentia parser ACs, 2 interface ACs, 1 sparse degradation, 1 5-sub-case malformed-input, 1 chip-family discriminator, 1 A16 literal, 1 typecheck attestation, 1 test-count attestation, 1 anti-scope diff); coverage exhausts the WAVE-PLAN Step 1 frame-level ACs (a) through (i).
6. **Constraints** — Tier verdict (`full`) applied per WAVE-PLAN Step 6 (A1 + A2 + A4 + A7); anti-scope respected (§ 3); Phase 1/2 frozen files consumed only, never modified (§ 1.1 inventory); the single `engine/types/verdict.ts` modification is additive enum extension (vendored-with-deltas precedent established at R18 + R23).
7. **Concurrency** — Parser is pure-functional (no shared state); `NeuronTopologySource.fetchSnapshot` is async-returning-resolved-value (no race); no concurrency surface in R53 (single-threaded test execution).
8. **Corner cases** — Invalid JSON (AC-R53-10 (a)); missing instance_type (AC-R53-10 (b)); unknown instance_type prefix (AC-R53-10 (c)); missing neuron_devices (AC-R53-10 (d)); empty neuron_devices (AC-R53-10 (e)); sparse fixture all-empty connected_to (AC-R53-9); multi-link dedup (AC-R53-4); opportunistic peer-node emission for peer ids absent from `neuron_devices` (covered by AC-R53-1 + AC-R53-5 expected counts); self-peer line (§ 4.1 implementation-note defensive guard).
9. **Cost** — ~180 LOC of production code (parser + class + helper) + ~200 LOC of test code; 15 ACs; 3 fixture files (~20-30 lines each JSON); ~15-20 min estimated Implementer execution time; full-tier rationale per WAVE-PLAN.
10. **Coupling** — Production code couples to (a) `engine/topology-overlay.ts` (`TopologySource` interface + `computeSnapshotHash`; read-only consumer); (b) `engine/types/verdict.ts` (TopologyNode / TopologyEdge / TopologySnapshot types; read-only consumer plus additive enum extension at the same file). Test code adds couplings to (c) `engine/types/verdict.ts` direct file-read for AC-R53-12 (read-only string match). No coupling to `engine/topology/{slurm,k8s,nvlink}-source.ts` (Phase 2 deliverables — consulted for structural shape only, not imported); no coupling to `engine/l0/*` (no L0 helper this round per § 1.5).

---

## § 10 Grilling output (pre-emit adversarial self-review)

Per CLAUDE-ARCHITECT.md "Pre-emit grilling" + Superpowers Review phase, the Architect adversarially re-reads the spec from Implementer + Reviewer perspectives.

### § 10.1 Self-questions (each answered)

**Q1: Is every claim in this spec backed by something verifiable?**
- A: Yes.
  - (a) Empirical baseline counts (`361 / 356 / 2 / 3` + `tsc exit 0`) recorded from `node --test --test-reporter=tap` + `npx tsc` runs at session entry — verifiable by re-running.
  - (b) File-reference line numbers (`engine/topology-overlay.ts:50-55` for TopologySource interface; `engine/topology-overlay.ts:69-78` for `computeSnapshotHash`; `engine/types/verdict.ts:245` for `kind` union; `engine/types/verdict.ts:255` for `relationship` union; `engine/topology/nvlink-source.ts:74-81` for opportunistic peer emission; `engine/topology/nvlink-source.ts:93` for self-peer guard; `engine/topology/nvlink-source.ts:115-147` for class structural parallel) verified by direct file Read at spec authoring time (R11 OBS-1/2 + R02 type-declaration-site-check reinforcement).
  - (c) PRD line references (`coordination/PRD.md:434-435` for FR-V1a/b; `:447` for AC-P5; `:449` for AC-P7; `:459` for vendor-neutral anti-scope; `:463-466` for SLICE 1 structure) verified by direct file Read.
  - (d) WAVE-PLAN-Phase3-01 references (Step 1 frame-level AC bullets (a)-(i); Step 3 Judgment call 1 + 2; Step 6 tier rationale) verified by direct file Read.
  - (e) Neuron SDK doc URLs (4 URLs from WAVE-PLAN Step 1 merge reasoning + 1 additional `neuron-ls.html` URL retrieved 2026-05-19) verified by Architect WebFetch; structural facts (Trainium 2D Torus; Inferentia ring; NeuronLink-v2 shared family; `--json-output` flag; `connected_to` array per device) are documented in retrieved content.

**Q2: Are there unstated assumptions?**
- A: Four documented + accepted:
  - (a) GPU-id-style lex-vs-numeric ordering for IDs ≥ 10. Documented at § 4.1 Implementer-notes + § 8.2 OQ; R53 fixtures use IDs 0-15; lex ordering does not affect AC outcomes; forward-flagged.
  - (b) `connected_to` symmetry in `neuron-ls --json-output`. Documented at § 0.4 hidden-assumptions; true by NeuronLink fabric construction; parser dedup handles asymmetric input.
  - (c) Production scrape loop is out-of-scope. Documented at § 0.1 + § 0.2 hidden-assumptions; the adapter exposes unit operations; production loop wiring is SLICE 2+ scope.
  - (d) `instance_type` is exposed in `neuron-ls --json-output`. Documented at § 0.3 hidden-assumptions; if production wiring discovers Neuron SDK does not include `instance_type`, production wrapper sources it from EC2 metadata service — out-of-scope wiring detail.

**Q3: Has scope been added beyond what the PRD / WAVE-PLAN requested?**
- A: No. (a) No new external dependencies (built-in `JSON.parse`, no parser library). (b) Schema extensions to `engine/types/verdict.ts` are exactly the three literals WAVE-PLAN Step 1 (c) + (d) prescribe (`'neuron_link_peer'` + `'trainium_chip'` + `'inferentia_chip'`); no additional literals added. (c) No L0 counter helper (per § 1.5 explicit Coordinator-level scope decision). (d) No new files beyond the 6 prescribed by WAVE-PLAN file-tree scope (`neuron-source.ts` + 3 fixtures + test file + verdict.ts modification + manifest note refresh + 3 coordination artifacts = 12 ALLOWED_SET entries).

**Q4: Can the Implementer act on this spec without making design decisions or asking clarifying questions?**
- A: Yes.
  - (a) Exact function signatures (§ 4.1 with parameter types and return types).
  - (b) Exact parser algorithm (8 steps in § 2.1; full TypeScript source in § 4.1).
  - (c) Exact chip-family discriminator helper (§ 2.3 + inlined in § 4.1).
  - (d) Exact fixture file contents (§ 4.2 + § 4.3 + § 4.4 character-precise JSON).
  - (e) Exact AC bodies (§ 4.5 ships full TypeScript test source).
  - (f) Exact baseline SHA + chore-A SHA placeholder substitution timing (§ 4.5 anti-scope test).
  - (g) Exact attestation format for AC-R53-13/14 (§ 4.6 `Q-R53-EMPIRICAL.sh` blocks; § 5 table prescribes verbatim recording in NEXT-ROLE.md).
  - (h) Exact `coordination/VENDORING-MANIFEST.md` row-note refresh text (§ 4.7 single-row append).
  - (i) Exact verdict.ts delta surface (§ 2.4 quoted union forms).

### § 10.2 Reinforcement sweep (CLAUDE-ARCHITECT.md REINFORCED lines applied)

Each Architect REINFORCED line that applies to R53 is enumerated and verified.

| Reinforcement | Application |
|---|---|
| R01 cross-spec-section consistency pass | § 0 picks (A/A/A/A) referenced consistently across § 2 / § 4 / § 5; no contradictions surfaced |
| R02 type-declaration-site check | Every named type in § 4 pseudocode (`TopologyNode`, `TopologyEdge`, `TopologySnapshot`, `FetchContext`, `TopologySource`) verified at declaration site by direct Read; import prescribed at § 4.1 |
| R02 git-tracked-vs-gitignored for `git rm` | N/A — R53 prescribes no file deletion |
| R03 re-export chain | N/A — R53 imports types from declaration site (`engine/types/verdict.ts` + `engine/topology-overlay.ts`); does not rely on re-export chains |
| R03 grep verification command soundness | AC-R53-12 grep `'correlational_not_causal: true'` matches in declaration body at `engine/types/verdict.ts:289` AND in JSDoc at `:287`; intentional, since the literal is present in the declared type body (line 289), but pattern is non-discriminating (matches both occurrences). Discriminability note: AC text says "the file contains the literal" — both occurrences satisfy; semantically equivalent to "verdict.ts retains the wire-format invariant." Mirrors R30 AC-R30-15 disposition. The Implementer cannot remove the type-body literal without breaking compile; comment-only removal would not change the file's wire-format guarantee. Acceptable per R30 precedent |
| R03 AC test-count per-file | AC-R53-14 prescribes `tests=374 / pass=369 / fail=2 / skipped=3`; per-file delta = +13 runtime tests in q53-neuron-adapter.test.ts (AC-R53-1..12 + AC-R53-15; AC-R53-13/14 are attestation-only); empirically anchored to baseline `361/356/2/3` |
| R05 component-inventory AC-range cross-check | § 1.1 inventory + § 5 AC table both reference AC-R53-1..15 consistently; no count drift |
| R06 delta-grep all-occurrences | The only file edit is `engine/types/verdict.ts` (2 enum union additions at lines 245 + 255) plus `coordination/VENDORING-MANIFEST.md` (1 row note refresh). Grep `'gpu_shard'` / `'rack'` / `'psu'` / `'cooling_zone'` / `'nvlink_peer'` in verdict.ts: 1 occurrence each (the type declaration line) — no secondary occurrence to keep in sync. The kind+relationship unions are referenced ONLY at lines 245 + 255 (verified via `grep -n` in pre-emit grilling); no JSDoc enumeration of union members exists separately |
| R06 opts/options interface field coverage | `NeuronParseOpts` has 3 fields (`fetched_at_ts`, `source_id`, `source_version`); constructor opts has 5 (`id`, `version`, `fetched_at_ts`, `source_id`, `source_version`). AC-R53-7 exercises the happy path for `id`/`version`; the alternative branches of the `??`-chain (snapshot.source_id fallback; default literal) are NOT separately bound by AC. Per R30 § 9.2 (R06 opts/options field coverage), the third operand in the `??`-chain is structurally unreachable (`parseNeuronLsJson` always sets `snapshot.source_id`/`source_version` to a defaulted typed string). Documented as defensive code in § 4.1 Implementer-notes; not a coverage gap. `fetched_at_ts` is exercised by AC-R53-1 (deterministic timestamp `1_700_000_000` passed) |
| R07 fixture accumulation requirement | N/A — no e-process / statistical-detector ACs in R53 |
| R07 OBSERVED-binding scope | N/A — all R53 ACs are deterministic |
| R08 empirical premise verification | Baseline empirical claims (`361/356/2/3` test summary; `tsc exit 0`; `git rev-parse HEAD = 3744012`) verified by Architect-side command runs at session entry, NOT inherited from prior round attestations. Recorded in Q-R53-SPEC-AUDIT.md § 3 with verification commands |
| R10 file-level documentation coverage | § 4.1 prescribes full file docblock for `engine/topology/neuron-source.ts`; § 4.5 prescribes full docblock for `test/q53-neuron-adapter.test.ts`; both describe complete exported surface |
| R11 REVIEWER-ANCHOR cited-line extraction | Every cited line range in this spec re-verified by direct Read during spec authoring: `engine/topology-overlay.ts:50-55` matches `export interface TopologySource { ... }`; `engine/types/verdict.ts:245` matches `kind: 'service' | ... | 'cooling_zone';`; `engine/types/verdict.ts:255` matches `relationship: 'calls' | ... | 'nvlink_peer';`. R30 NVLink line references (`:74-81` opportunistic; `:93` self-peer; `:115-147` class) verified by direct Read |
| R13 named statistical bound | N/A — R53 has no statistical-bound terminology |
| R15 anti-scope diff baseline | Baseline `3744012` is the R53 routing commit and the most-recent commit before Architect spec commit; no intermediate operator-prep commits (verified by `git log --oneline -5` at session entry). The 13th-entry conditional clause (DIAGNOSTIC) is explicitly authorized in § 3 per R25 MAJOR-2 reinforcement |
| R15 spec-internal-contradiction | The halt-condition prescriptions in § 6.1 #4 (Phase 1/2 regression → HALT) and § 6.4 (false-compliance prevention → HALT) align: both prescribe HALT + DIAGNOSTIC on binding-command output contradicting AC literal text. No conflicting prescriptions for the same trigger state |
| R18 test-byte-identity vendored-with-deltas | `engine/types/verdict.ts` is vendored-with-deltas since R18 (verified via `coordination/VENDORING-MANIFEST.md`); `q01-no-at-pin-deltas.test.ts:54-55` EXCLUDES verdict.ts from `AT_PIN_FILES`. R53 adds enum literals without re-introducing it to AT_PIN_FILES; no test maintenance needed. Vendored-file delta assertion-surface check (R18 reinforcement): the only existing test that opens `engine/types/verdict.ts` is the AC-R30-15-style A16 literal check (now AC-R53-12) — `grep -l "engine/types/verdict.ts" test/*.test.ts test/*.test.js` confirms `q30-nvlink-adapter.test.ts` (existing R30 AC-R30-15) + the new q53 file (AC-R53-12). Neither test does body-level byte comparison; both do substring `.includes(...)` only. No test assertion-surface conflict |
| R20 § 5 AC-table preamble cross-check | § 5 preamble classifies AC-R53-13/14 as "binding-command attestations (NOT runtime-bound)" and AC-R53-1..12 + AC-R53-15 as "runtime tests"; verified against § 4 prescription — § 4.5 ships `test()` declarations for AC-R53-1..12 + AC-R53-15 only; AC-R53-13/14 have no `test()` declaration and are prescribed as `Q-R53-EMPIRICAL.sh` blocks + Implementer NEXT-ROLE.md attestations |
| R21 every-failure-mode-AC-bound | § 1.3 failure-mode table cross-referenced against AC table: parser failure modes (JSON parse error → AC-R53-10 sub-a; missing instance_type → AC-R53-10 sub-b; unknown prefix → AC-R53-10 sub-c; missing neuron_devices → AC-R53-10 sub-d; empty neuron_devices → AC-R53-10 sub-e; well-formed but no peers → AC-R53-9; opportunistic peer emission → covered by AC-R53-1 + AC-R53-5 expected counts; multi-link dedup → AC-R53-4). Defensive `if (peerId === id) continue` self-peer guard at § 4.1 is documented as defensive-not-AC-bound (mirrors R30 disposition; Q-R53-SPEC-AUDIT.md § 2.5 records). Id/version fallback chain: AC-R53-7 covers happy path; defensive 3rd `??` operand documented as structurally unreachable per R06 opts-field coverage row above |
| R21 ARCH MINOR-1 spec-commit-sequencing | Architect WILL commit spec files (Q-R53-SPEC.md + Q-R53-SPEC-AUDIT.md + Q-R53-EMPIRICAL.sh) BEFORE writing NEXT-ROLE.md routing block — committed in a dedicated commit; verified by the routing sequence in § 11 below |
| R23 .gitignore-aware spec inventories | All 12 allowed-set entries verified git-trackable in Q-R53-SPEC-AUDIT.md § 4: 7 NEW files (will be git-trackable post-Implementer commit; parent dirs hold tracked files of same extension) + 2 MOD-only (verdict.ts + VENDORING-MANIFEST.md; already tracked) + 3 coordination artifacts (NEXT-ROLE.md + MEMORIAL.md + spec dir already tracked). No path is in `.gitignore` |
| R25 MAJOR-1 empirical baseline | AC-R53-14 prescribes attesting actual `node --test` counts in NEXT-ROLE.md via `Q-R53-EMPIRICAL.sh` execution; predicted `tests=374/pass=369/fail=2/skipped=3` is the spec's expectation but the Implementer attests the ACTUAL counts (per Rule 1 sub-class `empirical-command-attestation`); if actual differs structurally, the Implementer HALTs per § 6.1 #5 |
| R25 MAJOR-2 allowed-set conditional 13th entry | § 3 explicitly authorizes the 13th entry (`coordination/diagnostics/DIAGNOSTIC-R53-*.md`) IFF a HALT fires; AC-R53-15 ALLOWED_SET literal at § 4.5 includes the conditional commentary |
| R25 MAJOR-3 spec-amendment-post-disposition | N/A — no ESCALATE disposition yet for R53; if one occurs, this spec must be amended (not just the test path), per the reinforcement; § 6.3 procedure step 5 captures this |
| R26 MAJOR-1 false-compliance-attestation prevention | § 6.4 explicitly prohibits reframing `tsc` errors as "warnings" or fail-counts as compliance; AC-R53-13/14 attestation classification at § 5 reinforces with verbatim-recording via `Q-R53-EMPIRICAL.sh` |
| R28 OBS-2 / R18 vendored-file delta assertion-surface check | Verified above (R18 row): the two tests that open `engine/types/verdict.ts` (R30 AC-R30-15 inherited + R53 AC-R53-12 new) both do `.includes(...)` checks, NOT byte-level comparison. The R18 OBS-2 pattern (which forced a vendored-at-pin → vendored-with-deltas transition) does NOT apply since verdict.ts is ALREADY vendored-with-deltas |
| R29 empirical-AC threshold binding | AC-R53-12 grep is `grep -c 'correlational_not_causal: true'` with `≥ 1` threshold; matches at 2 occurrences in verdict.ts (line 287 JSDoc + line 289 declaration). Per R44 MINOR-3 + R46 MINOR-1/2 reinforcement (empirical-AC threshold binding tightness), `≥ 1` is incidentally satisfied — a comment-only match would PASS while the type-body literal is removed. Mitigation: the type-body literal CANNOT be removed without breaking TypeScript compile (it's a literal type constraint at `:289`); the JSDoc at `:287` is also load-bearing as documentation. The non-discriminating threshold is structurally non-failable here (compile would catch type-removal first); acceptable per R30 AC-R30-15 precedent which uses the same shape |
| R30 MINOR-1 grep discriminability | AC-R53-10 throw-regex patterns include the distinguishing literal `: <value>` segment where applicable (e.g., `/NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/` includes the offending instance type) so the assertion would FAIL if the throw message lost its value-bearing suffix. The non-suffixed errors (`NEURON_PARSE_INVALID_JSON`, `NEURON_PARSE_MISSING_INSTANCE_TYPE`, `NEURON_PARSE_MISSING_NEURON_DEVICES`, `NEURON_PARSE_NO_DEVICES`) are anchored by their full error name string — each name is unique to one parser branch |
| R34 MINOR-2 boundary-clause cross-section consistency | N/A — R53 has no boundary clauses (no pre-window/post-window distinction; no interval endpoints) |
| R34 MINOR-3 regex literal validity in pseudocode | All regex literals in § 4.5 are valid JavaScript (anchored by `/pattern/` literal; no `\Z`-class invalid metacharacters; no language-specific anchors): `/NEURON_PARSE_INVALID_JSON/`, `/NEURON_PARSE_MISSING_INSTANCE_TYPE/`, `/NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/` (escaped `.`), `/NEURON_PARSE_MISSING_NEURON_DEVICES/`, `/NEURON_PARSE_NO_DEVICES/`. Verified by mentally walking each through the JS regex engine grammar |
| R44 MINOR-3 / R46 MINOR-1/2 empirical-AC threshold tightness | AC-R53-14 test count is exact equality (`374/369/2/3`); AC-R53-13 tsc exit is exact equality (`0`). File-existence checks in Q-R53-EMPIRICAL.sh use binary existence (`[ -f path ]`); schema-extension greps use `≥ 1` threshold — the threshold is structurally non-failable (the literal is required for the parser to compile and is enforced by AC-R53-2/3/6). Acceptable per the precedent at R30 AC-R30-15 |

### § 10.3 Cross-section consistency pass

Per R01 reinforcement: for every resolved § 0 decision, verify all subsequent sections use a consistent surface.

| § 0 decision | Surface in § 2 | Surface in § 4 | Surface in § 5 | Consistent? |
|---|---|---|---|---|
| § 0.1 — `neuron-ls --json-output` JSON parser | "JSON.parse" in § 2.1 step 1 | `JSON.parse(jsonText)` in § 4.1 step 1 | AC-R53-10 sub-case (a) exercises JSON.parse error path | ✓ |
| § 0.2 — single module `engine/topology/neuron-source.ts` | Single file in § 2.1 + § 2.2 + § 2.3 | § 4.1 prescribes one file with 3 exports (function + class + inline helper) | AC table imports from one module | ✓ |
| § 0.3 — `instance_type` prefix discriminator | `chipFamilyFromInstanceType` helper § 2.3 | Inlined helper in § 4.1 with explicit `startsWith('trn')` / `startsWith('inf')` | AC-R53-11 exercises both prefix branches | ✓ |
| § 0.4 — undirected-deduped canonical | "from = min(a, b), to = max(a, b)" + Set dedup in § 2.1 step 6 | `a < b ? a : b` + `edgeKeys` Set in § 4.1 step 4 | AC-R53-4 asserts canonical ordering + unique pairs | ✓ |

### § 10.4 Pre-route checklist

- [x] Spec covers every WAVE-PLAN frame-level AC (verified § 1.2 + § 5).
- [x] Spec depth: WHAT and WHY prescribed; tactical detail in § 4 because mechanical translation is the contract (matches R30 precedent).
- [x] Anti-scope explicit (§ 3) + halt conditions explicit (§ 6).
- [x] No banned ambiguous-language tokens in AC text.
- [x] All cited line numbers re-verified at declaration site (§ 10.2 R11 row).
- [x] Empirical baselines (`361/356/2/3`, `tsc exit 0`) verified by running binding commands in this worktree at session entry, NOT inherited from prior rounds (R25 MAJOR-1 / R08 reinforcement).
- [x] § 5 preamble attestation classification matches § 4 prescription (R20 ARCH MINOR-1).
- [x] Component inventory consistent across § 1.1 / § 4 / § 5 (R05 reinforcement).
- [x] Branch-binding coverage gate applied (R21 ARCH MINOR-2/3): every guard / fallback / default has a binding AC where observable, or a defensive-code disposition in Q-R53-SPEC-AUDIT.md § 2.5.
- [x] File-level documentation coverage check (R10 reinforcement): § 4.1 docblock describes full exported surface; § 4.5 docblock describes test file's coverage.
- [x] Spec § 7 enumerates all 7 cross-project rules with active-gate / N/A dispositions (SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a) requirement).
- [x] Q-R53-EMPIRICAL.sh prescribed per § 4.6 (Rule 1 sub-class self-application; R46 canonical landing pattern).

---

## § 11 Architect routing sequence (post-grilling)

Per R21 ARCH MINOR-1 reinforcement (spec-commit-sequencing) + R23 / R25 / R30 precedent:

1. **Spec commit (Architect):** commit `coordination/specs/Q-R53-SPEC.md` + `coordination/specs/Q-R53-SPEC-AUDIT.md` + `coordination/specs/Q-R53-EMPIRICAL.sh` (set executable bit `chmod +x`) in a dedicated commit (`spec(R53): Q-R53 Phase 3 SLICE 1 WU-Phase3-1 AWS Neuron topology adapter`).
2. **NEXT-ROLE.md update (Architect; uncommitted at this stage):** update `coordination/NEXT-ROLE.md` to route IMPLEMENTER `STATUS: READY` with this spec as input. The Implementer's chore-A commit picks this up.
3. **MEMORIAL.md update (Architect; uncommitted at this stage):** append CONFIRMATION entries for disciplines applied this round.
4. **Implementer takes over:** RED commit (TDD per R23 IMPL MINOR-1) → GREEN commit (production code + test + fixtures + verdict.ts deltas + VENDORING-MANIFEST.md note refresh) → chore-A commit (sweeps NEXT-ROLE.md + MEMORIAL.md updates + runs `Q-R53-EMPIRICAL.sh` for AC-R53-13/14 attestation).
5. **Chore-B commit (Implementer):** appends AC-R53-15 with chore-A SHA literal substituted into `<INJECTED-AT-CHORE-B>` placeholder.

---

## § 12 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

(Per R49 pipeline-mandatory discipline; full-tier auto-routes Architect → Implementer → Reviewer → Memorial-Updater across fresh subprocess Claude sessions per role. R52 Coordinator wave-plan dispatch recommendation. R51 MU re-accretion guard applies at round close.)

---

_End of Q-R53-SPEC.md._
