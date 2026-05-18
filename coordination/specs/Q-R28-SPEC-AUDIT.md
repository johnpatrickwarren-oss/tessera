# Q-R28-SPEC-AUDIT — Architect ceremony sidecar

**Architect:** Claude (Opus 4.7) — R28 / cluster CL-02-A (WU-01 SLURM-ADAPTER)
**Spec:** `coordination/specs/Q-R28-SPEC.md`
**Date:** 2026-05-18

This sidecar carries the audit-trail content (brainstorm + design phases + decision rationale + ten-axis verification + grilling) that the spec proper delegates here per CLAUDE-ARCHITECT.md role boundary. The Reviewer reads both files; the Implementer reads only Q-R28-SPEC.md.

---

## 1. Superpowers Brainstorm — 3 distinct approaches

### Approach A: Reuse existing `'rack'` + `'gpu_shard'` literals, parser-as-class, edge convention parent→child

**Strengths:**
- No `engine/types/verdict.ts` mutation (vendored-at-pin file stays at pin).
- Parallels R23 `HardwareTopologySource` interface conformance pattern + v9Y substrate convention exactly.
- Smallest blast radius: zero anti-scope risk, zero VENDORING-MANIFEST.md update needed, zero AT_PIN_FILES touch.
- BFS-on-undirected works unchanged (BFS treats edges bidirectionally regardless of relationship literal).
- Sparse-degrade trivially supported via undeclared-child auto-create.

**Weaknesses:**
- `'rack'` literal stretches semantically when applied to a Slurm switch (the kind is named `rack` but holds Slurm switches). Future readers may find this surprising.
- All hierarchical layers (top switch + mid switches + leaf switches) collapse to a single kind `'rack'`. If WU-03 NVLINK or WU-05 close-walk needs to distinguish "rack vs PSU-vs-switch" by kind, this adapter cannot help.

**Hidden assumptions:**
- BFS attribution does not consume kind information (kind is metadata, not BFS-visible). Verified at `engine/topology-overlay.ts:265-285` (BFS walks adjacency only; doesn't read kind).
- TopologyEnricher's candidate-emission also doesn't dispatch on kind (it emits a per-candidate `service_name` + `topology_distance` + ratio, no kind-based filtering). Verified at `engine/topology-overlay.ts:287-327`.

**Risks:**
- If a downstream attribution layer (WU-05 close-walk) ever wants "switch-only" attribution, this collapse forecloses that.
- If a Slurm topology has 3+ hierarchical levels and operators want to see "top switch" vs "mid switch" in candidate output, they see all as `service_name: 'rack-*'` (no differentiation by depth).

### Approach B: Extend `engine/types/verdict.ts` to add new `'switch'` kind literal

**Strengths:**
- Semantically precise: Slurm switches are `'switch'`-kind, leaves are `'gpu_shard'`.
- Distinguishes Slurm-domain from R23 hardware-topology domain in the kind union (better archaeology for future readers).
- If WU-05 close-walk wants per-kind attribution, the kind is now load-bearing.

**Weaknesses:**
- Triggers a **vendored-with-deltas transition for `engine/types/verdict.ts`** (high-blast-radius change to a vendored-at-pin file).
- Requires synchronous maintenance of `coordination/VENDORING-MANIFEST.md` (manifest row update) + `test/q01-vendoring-coverage.test.ts` AT_PIN_FILES adjustment (R03 lessons: vendored-with-deltas transition pattern).
- All WAVE-PLAN-02 anti-scope clauses explicitly fence `engine/types/verdict.ts` per R23 frozen status; per PRD halt-condition #2, this is an ESCALATE path.
- 2nd-order effect: WU-02 K8S and WU-03 NVLINK (parallel clusters in Wave 2) would each have to coordinate on the new kind literal. If WU-02 lands first and adds `'k8s_node'`, that's a merge conflict in verdict.ts.
- Adds R28 spec scope: vendored-with-deltas two-step maintenance (R02 reinforcement pattern), test/q01-*-coverage.test.ts update, VENDORING-MANIFEST.md update — 3 additional commit-inventory entries.

**Hidden assumptions:**
- BFS attribution would benefit from per-kind information. **Not verified** — BFS doesn't read kind; TopologyEnricher doesn't dispatch on kind; only consumer-side attribution UI would surface this — out of WU-01 scope.
- WU-02 / WU-03 parallel clusters won't conflict on the verdict.ts surface. **Cannot verify** without seeing their specs (which I'm anti-scoped from reading per PRD).

**Risks:**
- Cross-cluster merge conflict at Wave 2 gate (WU-02 / WU-03 may also want kind extensions).
- Anti-scope breach perception (the PRD explicitly says "if new kind needed, ESCALATE rather than absorb silently"). The PRD does pre-authorize this via halt-condition #2 with "apply two-step maintenance UPFRONT" — but the operator override implied "only if load-bearing for parsing."
- WU-05 close-walk re-pin discipline disrupted: re-pinning vendored-at-pin files every round creates noise.

### Approach C: Use `'rack'` for switches + `'gpu_shard'` for leaves (same as A), BUT factor the parser as a free function only (no class)

**Strengths:**
- Smallest API surface; no class allocation overhead.
- Avoids the duplicated `id`/`version`/`fetched_at_ts` defaults between `SlurmTopologySourceOpts` and parser meta.
- Direct: `parseSlurmTopologyConf(text, meta)` returns a `TopologySnapshot`; caller wraps in `StaticTopologySource` if interface conformance is needed.

**Weaknesses:**
- Breaks the established pattern: `StaticTopologySource` (engine/topology-overlay.ts:83) + `OtelServiceGraphV1` (engine/topology-overlay.ts:111) + `HardwareTopologySource` (engine/hardware-topology-source.ts:26) are all **classes implementing TopologySource**. Pattern-matched callers expect `new SlurmTopologySource(...)`.
- PRD scope item 2 explicitly says "Implements `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)` per `engine/topology-overlay.ts:50-55`" — interface conformance is a first-class deliverable, not a "caller can wrap." Forcing the caller to wrap loses the interface conformance from the adapter surface.
- Loss of `id` + `version` opts-resolution-at-construction-time; harder to test custom `id` + `version` per AC-R28-10.

**Hidden assumptions:**
- Callers always want a wrapper. Verified false: `StaticTopologySource` + `OtelServiceGraphV1` + `HardwareTopologySource` all expose class-based contracts.

**Risks:**
- Reviewer report likely flags as inconsistent with established pattern (R22-class finding).
- Breaks WAVE-PLAN-02 § Wave 2 dispatch authorization "parallel-class convention" wording.

### Brainstorm decision

**Selected: Approach A.**

**Rationale:** Approach A has the smallest blast radius (no verdict.ts mutation, no manifest update, no AT_PIN_FILES touch) and matches the established pattern exactly (R23 HardwareTopologySource sibling). Approach B's semantic precision is not load-bearing for BFS or TopologyEnricher (verified by direct file-read of topology-overlay.ts:265-327: neither dispatches on kind), so its costs (cross-cluster conflict risk + halt-condition #2 ESCALATE path + vendored-with-deltas maintenance + 3-file commit-inventory expansion) are not justified by its benefits. Approach C breaks the parallel-class convention WAVE-PLAN-02 mandates.

**Why-rejected paragraphs:**

- **Approach B rejected** because (a) the kind information is non-load-bearing for BFS + TopologyEnricher (verified), (b) cross-cluster verdict.ts conflict risk with WU-02/WU-03 parallel Wave 2 dispatch is non-trivial (cannot verify their specs from anti-scope), (c) the operator override at PRD halt-condition #2 reads "if new kind NEEDED" — not "if would be nicer" — and the kind is not needed (Approach A satisfies all 14 ACs); (d) avoiding vendored-with-deltas maintenance lowers Wave 2 gate cycle-load.
- **Approach C rejected** because (a) PRD scope item 2 explicitly requires interface conformance from the adapter surface (not from a downstream wrapper), (b) breaks established class-based TopologySource impl pattern across StaticTopologySource + OtelServiceGraphV1 + HardwareTopologySource, (c) loses per-construction `id`/`version` overrides that AC-R28-10 needs.

---

## 2. Superpowers Design phase — component-boundary sketch

### 2.1 Boundaries

**Exists (unmodified, READ-ONLY consumer):**

- `engine/types/verdict.ts` — type unions `TopologyNode.kind` (line 245) + `TopologyEdge.relationship` (line 255) + `TopologySnapshot` (line 260).
- `engine/topology-overlay.ts` — `TopologySource` interface (line 50-55), `FetchContext` (line 57), `computeSnapshotHash` (line 69-78), `TopologyEnricher` class (line 197+), `defaultDeployNodeResolver` (line 174-179). BFS body at line 262-285. Candidate emission at line 287-327 (carries `correlational_not_causal: true` literal at line 312).
- `engine/hardware-topology-source.ts` — R23 sibling impl (pattern reference; not modified).
- `engine/l0/counter-rate-transform.ts` — Wave-1-frozen L0 contract; NOT imported (D7).
- `test/_substrate/v9Y-multi-rack-cluster.ts` — R23 fixture (pattern reference for synthetic snapshot construction).
- `.gitignore` — `*.js` rule confirms .js artifacts gitignored (R23 ARCH MINOR-2 cross-check).

**Created:**

- `engine/topology/slurm-source.ts` — the SlurmTopologySource + parseSlurmTopologyConf + expandSlurmHostlist trio.
- `test/q28-slurm-adapter.test.ts` — AC-R28-1 through AC-R28-12 runtime tests.
- `test/_substrate/slurm-fixture-canonical.conf` — single-switch + 3 leaves.
- `test/_substrate/slurm-fixture-hierarchical.conf` — 2-level switch tree.
- `test/_substrate/slurm-fixture-sparse.conf` — undeclared child switch reference.
- `coordination/specs/Q-R28-SPEC.md` — the spec.
- `coordination/specs/Q-R28-SPEC-AUDIT.md` — this file.

**Changed:**

- `coordination/NEXT-ROLE.md` — Architect updates to route ARCHITECT → IMPLEMENTER; Implementer subsequently updates to IMPLEMENTER → REVIEWER.

**Deleted:**

- None.

### 2.2 Integration points + PRD verification

| Integration point | PRD requirement | Verification |
|---|---|---|
| `TopologySource` interface conformance | PRD § Scope item 2 + AC-R28-10 | Verified by reading `engine/topology-overlay.ts:50-55` — interface signature: `{ id, version, fetchSnapshot(ctx?), snapshotHash(s) }`. SlurmTopologySource implements all 4. |
| `computeSnapshotHash` delegation | PRD § Scope item 2 + Addition #26 D6 | Verified by reading `engine/topology-overlay.ts:69-78` — function exported. SlurmTopologySource.snapshotHash delegates exactly per R23 precedent. |
| BFS-on-undirected (read-only consumer) | PRD § Anti-scope A12 + § Scope item 3 | Verified by reading `engine/topology-overlay.ts:265-267` — BFS adjacency builds bidirectionally regardless of relationship literal. Adapter's `'contains'`-only edges work unchanged. |
| TopologyEnricher wire-format invariant | PRD § Scope item 1 (correlational_not_causal preservation) + AC-R28-11 | Verified by reading `engine/topology-overlay.ts:312` — literal `correlational_not_causal: true` hard-coded in candidate emission. AC-R28-11 asserts the literal at the wire boundary. |
| L0 contract boundary (D2 MEDIUM) | CLUSTER-HANDOFF line 27 | Verified by D7 architectural decision: NO import of `engine/l0/counter-rate-transform.ts` in `engine/topology/slurm-source.ts`. |

### 2.3 Failure modes at each integration point

| Integration point | Failure mode | Spec response |
|---|---|---|
| TopologySource interface | Implementation drops a method (`.id`/`.version`/`.fetchSnapshot`/`.snapshotHash`) | AC-R28-10 conformance check asserts all 4 are functions/strings; structurally bound. |
| computeSnapshotHash delegation | Adapter computes hash differently → archaeological-render breaks (Addition #26 D6 violated) | AC-R28-10 asserts `src.snapshotHash(snap) === computeSnapshotHash(snap)` — bit-equal check. |
| BFS-on-undirected | Adapter emits an edge with a relationship literal not in the existing union (`calls`/`reads`/`writes`/`publishes`/`contains`/`nvlink_peer`) | TypeScript compile-time rejection (TopologyEdge.relationship is a string-literal union). If `as any` cast attempted, AC-R28-7 catches it at runtime. |
| TopologyEnricher invariant | Adapter forks the enricher or emits TopologyCandidate without the literal | Adapter doesn't fork enricher (anti-scope; A12); enricher hard-codes the literal at line 312. AC-R28-11 verifies at wire boundary defensively. |
| L0 contract boundary | Adapter imports counter-rate-transform | Caught at code review (Reviewer will grep for `counter-rate-transform` import in slurm-source.ts); spec § 1.1 D7 prohibits explicitly. |

### 2.4 Failure modes within the parser (not at integration points)

| Failure mode | Spec response |
|---|---|
| Slurm format extension not in scope (`node[1-10:2]` step ranges, multi-bracket like `r[1-2]n[1-4]`, mid-line comments, `LinkSpeed=`) | Throws SLURM_TOPOLOGY_PARSE_ERROR (AC-R28-8(c) regex covers step-range; AC-R28-8(d) covers unclosed; "unsupported clause" handles LinkSpeed). |
| Real-Slurm `topology.conf` formats with whitespace inside values | Throws (whitespace tokenized, so unknown second token → "unsupported clause"). |
| Empty topology.conf | Empty snapshot (AC-R28-9). |
| Switch + leaf name collision | Throws (D8 tail check; not bound by AC — acknowledged at § 5.3 of spec). |
| Operator's `.conf` file has CRLF line endings | Tolerated (parser strips trailing `\r`; § 1.3 algorithm step 1). |

---

## 3. Architect pre-prediction on outcomes

- **AC-R28-1 through AC-R28-11:** all expected to PASS at chore-A SHA. Test logic is deterministic against the spec'd algorithm; fixtures hand-traced.
- **AC-R28-12 (anti-scope diff):** expected to PASS at chore-B SHA. The 8-entry mandatory allowed-set covers all spec'd commit paths; DIAGNOSTIC glob covers contingent halt-fires.
- **AC-R28-13 (tsc baseline):** expected to PASS at chore-A SHA. Empirically verified baseline = exit 2 + {TS2688, TS5107}. No R28 file (`engine/topology/slurm-source.ts`, `test/q28-slurm-adapter.test.ts`) introduces a new diagnostic — both files use existing imports + existing types only.
  - Possible new-diagnostic source: `as any` cast or strict-null violation in SlurmTopologySource. **Mitigation:** § 4.1 pseudocode uses no `as any` casts; explicit `string | undefined` handling in `expandSlurmHostlist`.
- **AC-R28-14 (node test count baseline):** expected to PASS at chore-A SHA with `tests = 254 / pass = 252 / fail = 2`. Pre-existing fails (q01 AC-7 ENOENT + AC-R26-16 chore-B path-drift) unchanged.
  - Possible new-fail source: an R28 test that empirically fails (e.g., AC-R28-11's TopologyEnricher integration test has a subtle data-shape mismatch). **Mitigation:** § 4.2 test code traces through Inherited TopologyEnricher logic + AC-R28-11 expected outputs hand-derived from § 1.5 integration semantics.

**Pre-prediction risk areas:**

1. **`tsconfig.test.json` strict-null + `expandSlurmHostlist`'s `m[1]`/`m[2]` after regex match.** If tsc is in strict-null mode, `m[1]` is `string | undefined`. § 4.1 uses `const startStr = m[1];` which would be `string | undefined`. The subsequent `parseInt(startStr, 10)` then errors as "argument of type 'string | undefined' is not assignable to parameter of type 'string'." **Mitigation:** Implementer may need to assert non-null via `m[1]!` or destructure: `const [, startStr, endStr] = m;` — both pseudocode-equivalent. Spec § 4.1 acknowledges Implementer may format-adjust.

2. **Iteration order of `Set<string>` for `nodes[]` array.** ES2015+ guarantees insertion order, which is deterministic but parser-order-dependent. AC-R28-1 asserts via `.sort()` so iteration order doesn't matter; AC-R28-2 likewise. Snapshot hash is computed via `computeSnapshotHash` which sorts by `id` before hashing — so iteration order doesn't affect hash either. **Safe.**

3. **AC-R28-11 TopologyEnricher integration: `defaultDeployNodeResolver` resolution.** `engine/topology-overlay.ts:174-179`: resolver tries `metadata.deploy_id`, then `id`, then `service_name`. SlurmTopologySource emits nodes without `metadata`, with `id === service_name === 'node1'`. So `deploy_id === 'node1'` resolves to the `'node1'` leaf via the id-match path. **Safe.**

4. **AC-R28-11 candidate emission: event must overlap group window AND BFS-reach.** Group window: `[1700000000, 1700000600]`. Event `ev-1` at `event_ts = 1700000300` (mid-window). BFS: `node1` is start; `node2` is hop=2 (`node1` → `sw` → `node2`) within max_hop_distance=3. ✅ Candidate emitted with `correlational_not_causal: true`.

---

## 4. Decision rationale (each architectural decision: why-picked + why-rejected)

### D1 — `'rack'` for switches; `'gpu_shard'` for leaves (NOT new `'switch'` kind)

**Why picked:** Smallest blast radius (no `engine/types/verdict.ts` mutation; no manifest update; no parallel-cluster conflict risk). BFS + TopologyEnricher do not consume kind for attribution (verified by direct file-read), so semantic precision via a new literal is not load-bearing. PRD halt-condition #2 explicitly authorizes ESCALATE for new-kind needs; the kind is not needed.

**Why rejected (new `'switch'` literal):** Vendored-with-deltas transition cost (3-file maintenance per R02/R03 pattern) is non-trivial; cross-cluster Wave 2 verdict.ts conflict risk with WU-02/WU-03 (anti-scoped from reading their specs); kind information non-load-bearing for any current consumer.

### D2 — `'contains'` for all edges (switch→switch + switch→leaf)

**Why picked:** Existing literal; matches v9Y substrate convention exactly (`test/_substrate/v9Y-multi-rack-cluster.ts:39-46`); BFS doesn't dispatch on relationship literal (verified at line 265-267).

**Why rejected (separate literal for switch→switch hierarchy):** Would require new literal; no consumer benefits; v9Y convention already established the same simplification at R23.

### D3 — Edge direction parent → child

**Why picked:** Matches v9Y exactly (`{ from: 'rack-0', to: 'shard-0', ... }`); `computeSnapshotHash` canonicalizes via sort on `(from, to, relationship)` so direction doesn't affect hash determinism, but consistency aids audit-readability.

**Why rejected (child → parent):** Breaks v9Y convention; readers comparing v9Y + SlurmTopologySource outputs would see inconsistent direction.

### D4 — Three exports: class + 2 free functions

**Why picked:** Class for TopologySource interface conformance (per established pattern); `parseSlurmTopologyConf` free function for direct parser testing (so tests + alternative wrappers don't need class instantiation); `expandSlurmHostlist` free function so tests + adapters can pre-validate hostlist tokens without parsing a full topology.conf.

**Why rejected (class only):** Forces test patterns to instantiate the class for every parser test; awkward for unit-testing the hostlist expansion in isolation.

**Why rejected (free functions only — Approach C):** Breaks established TopologySource class pattern (R23 HardwareTopologySource sibling); PRD scope item 2 requires interface conformance from the adapter surface, not from a downstream wrapper.

### D5 — `opts.fetchedAtTs ?? Math.floor(Date.now() / 1000)` default

**Why picked:** Matches HardwareTopologySource non-snapshot pattern; deterministic tests can pass explicit timestamp; production callers don't need to compute clock.

**Why rejected (no default; required):** Forces test boilerplate; differs from established sibling pattern.

### D6 — `id` / `version` two-step default chain (no snapshot fallback)

**Why picked:** SlurmTopologySource owns snapshot construction (parses from text); the snapshot's `source_id`/`source_version` are written from `this.id`/`this.version`, not read into them. The HardwareTopologySource three-step chain (opts → snapshot → constant) is for cases where the snapshot is constructed externally and the constructor needs to resolve identity from either source. Here, identity flows constructor → snapshot, not the other way around.

**Why rejected (mirror HardwareTopologySource three-step chain):** Would create a chicken-and-egg: snapshot identity is determined by constructor opts → parser → snapshot, so the snapshot can't be a fallback source for its own identity.

### D7 — D2 MEDIUM L0 contract boundary: NO import of counter-rate-transform

**Why picked:** Per CLUSTER-HANDOFF line 27: "Slurm topology.conf is configuration data, not counter-typed telemetry — Slurm parser does NOT call transformPair() directly." Preserves the interface-only D2 MEDIUM stance. The adapter knows-of-but-does-not-call the L0 contract.

**Why rejected (opportunistic call to close R25 MINOR-3):** WAVE-GATE-01 explicitly marks R25 MINOR-3 closure as "welcome but not required" + "advisory only"; closing it would require importing transformPair, which would breach the D2 MEDIUM interface-only stance. WU-02 / WU-03 have closer L0-contract exercise paths (WU-03 in particular is the "primary consumer for 32-bit wrap path"); leave R25 MINOR-3 closure to them.

---

## 5. P3 ten-axis verification (one sentence per axis — cross-referenced from spec § 8)

(Duplicated for audit completeness — Q-R28-SPEC.md § 8 carries the same content; this section is the Architect's archaeological-render copy.)

- **Correctness:** § 1.3 algorithm traced manually against 3 fixtures + 4 malformed inputs + 1 empty input; deterministic by-construction.
- **Completeness:** 6 PRD AC families × 2 binding-command attestation ACs = 14 ACs, at the PRD 10-14 target cap.
- **Consistency:** kind/relationship/direction/export-names/round-start-SHA cross-checked across 5 spec sections.
- **Clarity:** ACs use Given/When/Then form; no "correctly"/"appropriately" banned phrasing.
- **Coverage:** § 1.6 F1-F12 table + § 5.3 mutation-test reasoning; one acknowledged-not-bound gap (D8 tail check).
- **Constraints:** PRD anti-scope A10/A11/A12/A16 + WAVE-GATE-01 pre-flag baselines + R23/R26 frozen-files all enumerated.
- **Concurrency:** single-forward-pass parser; eager-parse-in-constructor; cached snapshot identity across `fetchSnapshot` calls.
- **Corner cases:** empty input + whitespace-only + comment-only + sparse-undeclared + zero-padding + multi-token brackets + 4 malformed classes all bound.
- **Cost:** O(text size) parse; ~12 new tests / ~250-300 LOC test file; negligible vs 243-test baseline.
- **Coupling:** read-only consumer of vendored-at-pin `engine/types/verdict.ts` + `engine/topology-overlay.ts`; NO coupling to L0 contract (D7).

---

## 6. Pre-emit discipline application

### 6.1 Reinforcements scanned + applied

From CLAUDE-COMMON.md + CLAUDE-ARCHITECT.md REINFORCEMENTS (concatenated to system prompt):

| Reinforcement | Application in Q-R28-SPEC.md |
|---|---|
| R21 ARCH MINOR-1 (spec commits BEFORE chore-A) | Architect commits Q-R28-SPEC.md + Q-R28-SPEC-AUDIT.md in own commit before writing NEXT-ROLE.md routing block. Tracked in § Commit-sequencing below. |
| R23 ARCH MINOR-2 (.gitignore-aware inventories) | Spec § 3.2 allowed-set contains only .ts paths; .js gitignored entries explicitly excluded. § 2 Component inventory + § 3.2 spec text both call this out. Verified via `.gitignore` read at session entry. |
| R20 ARCH MINOR-1 (§ 5 AC-table preamble cross-check) | Spec § 5.1 preamble classifies AC-R28-1..-12 as runtime tests + AC-R28-13/14 as binding-command attestations; § 4.x prescriptions match exactly. |
| R22 IMPL MINOR-1 (count-AC chore-A SHA anchoring) | Spec § 4.4 routing block + § 5.2 AC-R28-13/14 anchor to chore-A SHA explicitly; not "after R28 implementation commits." |
| R21 ARCH MINOR-2/3 (branch-binding coverage gate) | Spec § 1.6 F1-F12 table + § 5.3 mutation-test reasoning + § 9.6 checklist line. |
| R25 MINOR-2 (branch-binding by mutation logic, not structural) | § 5.3 explicitly walks each default's mutation behavior (remove `??` default → test fails). |
| R25 MINOR-1 (empirical baseline at session start) | § 9.1 + § 9.2 baselines verified empirically in cluster worktree via `node --test` + `npx tsc -p tsconfig.test.json` at session entry. |
| R25 MAJOR-1 (do NOT cite cross-round attestations) | Spec § 9.2 explicitly notes the WAVE-GATE-01 pre-flag was 230/229/1 but cluster worktree empirical = 243/241/2; the spec encodes the empirical baseline. |
| R25 MAJOR-2 (DIAGNOSTIC path in allowed-set) | Spec § 3.2 entry 9 conditional glob `coordination/diagnostics/DIAGNOSTIC-R28-*.md`. |
| R25 MAJOR-3 (spec amendment in lockstep with operator ESCALATE Option A disposition) | Spec § 6 halt condition 4: Implementer HALTs + DIAGNOSTIC for spec amendment; does NOT silently expand allowed-set. |
| R26 MAJOR-1 (false-compliance-attestation; halt-discipline 3-occurrence threshold rule) | Spec § 5.2 AC-R28-13 encodes ACTUAL exit code 2 + actual diagnostic set; AC-R28-14 encodes ACTUAL counts. Halt condition 3 prescribes HALT not reframe. |
| R21 MINOR-4 (line-citation-drift via cite-then-verify-grep) | AC-R28-14 prescribes `grep -c "^test(" test/q28-slurm-adapter.test.ts` at chore-A SHA — empirical count not from memory. |
| R10 MINOR-1 (file-level docblock coverage) | Spec § 4.1 pseudocode includes full file-level docblock prescription for engine/topology/slurm-source.ts (round, purpose, hash-delegation note, L0-contract-boundary note). |
| R11 MINOR-1/MINOR-2 (line-citation verbatim extraction) | Spec § 2 + § 8 cite specific line ranges (engine/types/verdict.ts:245 / :255 / :260; engine/topology-overlay.ts:50-55 / :69-78 / :265-267 / :312); verified via Grep + Read at session entry. |
| R01 (cross-section consistency pass) | Spec § 8 Consistency axis enumerates: D1 kind tokens, D2 relationship tokens, D3 direction, D4 export names, D5/D6 defaults, round-start SHA, allowed-set entries — all identical across spec sections. |
| R02 (type-declaration-site reading) | Verified `TopologyNode`/`TopologyEdge`/`TopologySnapshot` definitions at `engine/types/verdict.ts:240-262` via direct file-read (lines included in input list at spec preamble). |
| R03 (re-export chain verification) | Verified that `engine/types/verdict.ts` is the declaration site for `TopologyNode` + `TopologyEdge` (no intermediate re-export needed); SlurmTopologySource imports directly from `../types/verdict`. |
| R05 (Component inventory AC range cross-check) | Component inventory § 2 binds each file to specific AC ranges: slurm-source.ts → AC-R28-1..-11; q28-slurm-adapter.test.ts → AC-R28-1..-12; fixture files → specific ACs; spec files → no ACs; NEXT-ROLE.md → no ACs; conditional DIAGNOSTIC → no ACs. |
| R07/R08 (empirical-premise verification) | Spec § 9.2 + AC-R28-13/14 baselines verified empirically in cluster worktree via direct command runs at session entry; not inherited from CLUSTER-HANDOFF or WAVE-GATE-01 testimony. |
| R15 MINOR-1 (round-start SHA baseline) | Round-start SHA = `ad024af` (verified via `git rev-parse HEAD` at session entry); not the prior round's attestation HEAD. |
| R15 MINOR-3 (no conflicting prescriptions) | Spec § 6 halt conditions enumerated; each condition triggers HALT + DIAGNOSTIC consistently; no parenthetical "proceed-with-DIAGNOSTIC" contradictions. |
| R20 MINOR-1 (AC-table preamble cross-check) | § 5.1 ↔ § 4.2 ↔ § 4.4 ↔ § 5.2 cross-check verified inline. |
| R26-derived sub-class rule (false-compliance-attestation) | Spec § 5.2 AC-R28-13/14 + § 6 halt condition 3 explicitly prescribe HALT + DIAGNOSTIC for binding-command output contradicting AC literal; do NOT reframe. |
| R23 IMPL MINOR-1 (TDD separate-RED-commit) | Spec § 4.2 substitution-points block (2) + § 4.4 routing block prescribe TDD-RED first then GREEN for AC-R28-12 chore-B work. |
| R18 OBS-2 (vendored-with-deltas pre-disposition for body-identity tests) | D1 chose existing `'rack'` + `'gpu_shard'` literals to AVOID vendored-with-deltas transition for verdict.ts; q01 body-identity tests stay green. |
| R28-derived (NEW; predicted) `cross-round-test-failure-attribution-encoding` | Spec § 9.2 documents how to encode failures that are pre-existing per Coordinator pre-flag table but require finer attribution than the pre-flag provided. Proposed cross-project pattern for Coordinator pre-flag updates to anticipate test-design-friction with cross-round chore drift. |

### 6.2 Skill 14 / Skill 15 application

- **Brainstorm (Superpowers Skill 14):** § 1 of this audit — 3 distinct approaches with strengths/weaknesses/assumptions/risks + rationale.
- **Design (Superpowers Skill 14):** § 2 of this audit — component-boundary sketch + integration-point + failure-mode inventory.
- **Pre-emit grilling (Superpowers Skill 15):** spec § 9.1-9.6 walked through inline.
- **Pre-emit review (Superpowers Skill 15 read-as-Implementer pass):** spec § 9.5 spot-checks confirm zero Implementer clarifying-question burden.

---

## 7. Commit-sequencing log (Architect-emit)

Order of operations the Architect executes after this audit sidecar is written:

1. **(NOW)** Commit `coordination/specs/Q-R28-SPEC.md` + `coordination/specs/Q-R28-SPEC-AUDIT.md` in a single Architect commit. Per R21 ARCH MINOR-1: spec commit precedes chore-A.
2. Overwrite `coordination/NEXT-ROLE.md` with the routing block per Q-R28-SPEC.md § 4.4. NEXT-ROLE.md remains uncommitted (the Implementer's chore-A will commit it as part of the chore-A allowed-set entry 8).
3. Append CONFIRMATION lines to `coordination/MEMORIAL.md` per CLAUDE-ARCHITECT.md step 9.

---

## 8. Amendments from prior version

None — initial emission of Q-R28-SPEC.md + this sidecar.

---

_Architect: Claude (Opus 4.7), R28 / cluster CL-02-A. Spec + sidecar emit 2026-05-18._
