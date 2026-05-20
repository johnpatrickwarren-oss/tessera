# Q-R53-SPEC-AUDIT — Architect audit-trail sidecar for R53

**Round:** R53 (Wave 1 of WAVE-PLAN-Phase3-01; single-cluster bundled).
**Author:** Architect (Claude Opus 4.7).
**Companion spec:** `coordination/specs/Q-R53-SPEC.md`.
**Companion empirical script:** `coordination/specs/Q-R53-EMPIRICAL.sh`.
**Date:** 2026-05-19.

This sidecar captures the audit-trail content the Reviewer needs to evaluate the Architect's pre-route discipline application. The Implementer reads only Q-R53-SPEC.md proper; the Reviewer reads both.

---

## 1. P3 ten-axis verification (one sentence per axis)

See Q-R53-SPEC.md § 9. Reproduced here for the audit trail:

1. **Correctness** — Edge counts are exact graph-theoretic identities (4·16/2 = 32; 2·6/2 = 6); no probabilistic ACs.
2. **Completeness** — Every WAVE-PLAN Step 1 frame-level AC (a)-(i) maps to ≥1 AC; FR-V1a + FR-V1b + AC-P5 + AC-P7 all covered.
3. **Consistency** — § 5 preamble matches § 4 prescription per R20 ARCH MINOR-1; § 0 picks (A/A/A/A) referenced consistently across § 2 / § 4 / § 5.
4. **Clarity** — No banned ambiguous-language tokens in AC text; concrete numeric / string-equality / anchored-regex expectations.
5. **Coverage** — 15 ACs exhaust WAVE-PLAN frame-level items; runtime vs attestation classification explicit.
6. **Constraints** — Tier `full` per A1+A2+A4+A7; anti-scope (§ 3); Phase 1/2 frozen files consumed read-only; verdict.ts additive enum extensions only.
7. **Concurrency** — Parser pure-functional; no shared state; async-returning-resolved-value; single-threaded test execution.
8. **Corner cases** — 5 malformed-input sub-cases; sparse fixture; opportunistic peer emission; self-peer defensive guard; multi-link dedup; fallback chain.
9. **Cost** — ~180 LOC prod + ~200 LOC test; 15 ACs; 3 fixture files; ~15-20 min Implementer execution time.
10. **Coupling** — Production code couples to topology-overlay (read-only) + verdict.ts (types + additive enum extension); test code adds verdict.ts string-read for AC-R53-12; no L0 coupling (deferred to SLICE 2).

---

## 2. Pre-route discipline application

### 2.1 Superpowers Brainstorm
Four axes brainstormed × three approaches each (Q-R53-SPEC.md § 0.1/0.2/0.3/0.4); selection rationale documented inline. Selection summary table at § 0.5.

### 2.2 Superpowers Design
Component boundaries + integration points + failure modes sketched in Q-R53-SPEC.md § 1 (precedes per-file pseudocode at § 4).

### 2.3 Superpowers Review
Self-review applied: re-read as Implementer-receiving-cold; re-read as Reviewer-receiving-cold; documented in Q-R53-SPEC.md § 10 grilling output.

### 2.4 CLAUDE-ARCHITECT.md reinforcement sweep
26 reinforcement lines reviewed; applicable items applied. Full table at Q-R53-SPEC.md § 10.2.

### 2.5 Branch-binding coverage gate (R21 ARCH MINOR-2/3)

Every guard / fallback / default in prescribed production code has either a binding AC or a documented coverage-limitation note:

| Code surface | Binding AC | Mutation-killable? |
|---|---|---|
| `parseNeuronLsJson` JSON.parse wrap | AC-R53-10 (a) (`/NEURON_PARSE_INVALID_JSON/`) | ✓ |
| `parseNeuronLsJson` `typeof instance_type !== 'string'` guard | AC-R53-10 (b) (`/NEURON_PARSE_MISSING_INSTANCE_TYPE/`) | ✓ |
| `chipFamilyFromInstanceType` `startsWith('trn')` branch | AC-R53-11 (trn1.32xlarge case) + AC-R53-1..4 (Trainium fixture) | ✓ |
| `chipFamilyFromInstanceType` `startsWith('inf')` branch | AC-R53-11 (inf2.24xlarge case) + AC-R53-5..6 (Inferentia fixture) | ✓ |
| `chipFamilyFromInstanceType` else-throw branch | AC-R53-10 (c) (`/NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/`) | ✓ |
| `parseNeuronLsJson` `!Array.isArray(root.neuron_devices)` guard | AC-R53-10 (d) (`/NEURON_PARSE_MISSING_NEURON_DEVICES/`) | ✓ |
| `parseNeuronLsJson` `root.neuron_devices.length === 0` guard | AC-R53-10 (e) (`/NEURON_PARSE_NO_DEVICES/`) | ✓ |
| `parseNeuronLsJson` opportunistic-peer-node emission (`if (!nodeIds.has(peerId))`) | AC-R53-1 + AC-R53-5 expected node counts (each fixture has all peer IDs that are also device IDs; opportunistic path emits the parent-chip-kind for any unseen peer; defensive surface — not separately bound by AC) | ✗ (defensive; mirrors R30 disposition) |
| `parseNeuronLsJson` self-peer guard `if (peerId === id) continue` | NOT BOUND — defensive code per § 4.1 Implementer-notes | ✗ (intentional; mirrors R30 § 4.1 disposition) |
| `parseNeuronLsJson` canonical-ordering `a < b ? a : b` | AC-R53-4 (canonical `from < to` lex) | ✓ |
| `parseNeuronLsJson` edge-dedup `Set<string>` | AC-R53-4 (unique pairs assertion; expected size = 32) | ✓ |
| `parseNeuronLsJson` `partial = edges.length === 0` | AC-R53-9 (partial=true on sparse) + AC-R53-1/5 (partial=false) | ✓ |
| `NeuronTopologySource` constructor id fallback (3 branches: opts.id; snapshot.source_id; default) | AC-R53-7 sub-case (a) covers branch 2 (default construction; opts.id undefined → snapshot.source_id `'neuron_topology_source'`); AC-R53-7 sub-case (b) covers branch 1 (explicit opts.id `'explicit-test-id'`); branch 3 (default literal in `??`-chain) is structurally unreachable per § 4.1 Implementer-notes (parser always defaults snapshot.source_id) | Branches 1-2 ✓; branch 3 ✗ (defensive; mirrors R30 third-operand disposition) |
| `NeuronTopologySource` constructor version fallback (3 branches: opts.version; snapshot.source_version; default) | AC-R53-7 sub-case (a) covers branch 2 (default → `'neuron-1'`); sub-case (b) covers branch 1 (explicit `'explicit-test-ver'`); branch 3 same disposition | Same disposition |
| `NeuronTopologySource.fetchSnapshot` identity return | AC-R53-7 (array assertion) | ✓ |
| `NeuronTopologySource.snapshotHash` delegation | AC-R53-8 (equality to `computeSnapshotHash`) | ✓ |

Two AC-not-bound defensive surfaces (opportunistic-peer-node emission for unseen peer IDs; self-peer guard) and one structurally-unreachable default operand (third operand in `??`-chain) — all explicitly documented per R30 precedent.

### 2.6 Architect pre-prediction (outcome anchors)
Recorded at Q-R53-SPEC.md § 1.4. Predicted outcomes:
- AC-R53-1..12 + AC-R53-15: all PASS (13 runtime tests at chore-A).
- AC-R53-13: tsc exit 0 (zero diagnostics; preserves session-entry baseline).
- AC-R53-14: tests=374 / pass=369 / fail=2 / skipped=3 (361/356/2/3 baseline + 13 new R53 runtime tests; AC-R53-13/14 are attestation-only).
- AC-R53-15: round-start-to-chore-A diff ⊆ 12-entry allowed-set.

Reviewer comparison: if Implementer attestation differs from prediction, the Reviewer should compare predicted-vs-actual and flag any systematic discrepancy.

### 2.7 Decision rationale (why-picked / why-rejected for each § 0 axis)

**§ 0.1 — Parser input format (A picked: `neuron-ls --json-output`; B+C rejected):**
- **Why A:** Neuron SDK exposes `--json-output` (`-j`) for machine consumption (per AWS public docs); structured JSON eliminates regex brittleness; matches K8s adapter (R29) JSON-shape precedent.
- **Why not B (Unicode-arrow diagram):** Unicode characters make regex brittle and platform-dependent; choosing the diagram parser when JSON is available is YAGNI inversion.
- **Why not C (text columns):** two-level parsing (column extraction + CSV split); spacing-dependent; worse than NVLink text parser.

**§ 0.2 — Module decomposition (A picked: single file; B+C rejected):**
- **Why A:** operator OQ-Phase3-W1-1 dispositioned Option A; matches R30 NVLink + R26 MD-F4 single-file precedent; tightest blast radius.
- **Why not B (split into trainium-source.ts + inferentia-source.ts):** contradicts operator disposition; D5-strict write-conflict on shared `'neuron_link_peer'` enum literal would serialize the round.
- **Why not C (hybrid: shared parser + two classes):** chip family is a runtime distinction from fixture content, not a compile-time class choice; extra classes for no semantic benefit.

**§ 0.3 — Chip-family discriminator (A picked: `instance_type` prefix; B+C rejected):**
- **Why A:** `instance_type` is a real field in `neuron-ls --json-output`; prefix-match future-proofs to Trn2/Trn3/Inf3 generations; matches EC2 metadata convention; resilient to sparse fixtures.
- **Why not B (peer-count heuristic):** fragile; sparse fixtures break the heuristic; Trn2 chip counts vary; small Trainium and Inferentia fixtures could be indistinguishable.
- **Why not C (constructor arg):** moves chip-family info out of fixture; doesn't match production discovery pattern; creates a fixture-vs-call-site coupling that can disagree silently.

**§ 0.4 — Edge representation (A picked: undirected-deduped canonical; B+C rejected):**
- **Why A:** matches inherited BFS bidirectional treatment (`engine/topology-overlay.ts:262-267`); minimum-edges form; deterministic-hash-friendly; matches R30 precedent.
- **Why not B (per-raw):** edge surface inflated; same BFS outcome; redundant; pattern R30 rejected.
- **Why not C (both representations):** would require modifying `TopologySnapshot` shape (A12 violation).

### 2.8 Amendments from prior version
N/A — this is the initial spec emission for R53. No prior version.

### 2.9 Re-evaluation of prior brainstorm picks (if applicable)
N/A — no ESCALATE disposition triggered re-selection of a previously-rejected approach. Operator OQ-Phase3-W1-1 (Option A) + OQ-Phase3-W1-2 (Option B) dispositioned BEFORE R53 Architect session start; both were Coordinator-level OQs surfaced in WAVE-PLAN-Phase3-01.md Step 3 Judgment calls and dispositioned by operator at R53 directive emission time.

---

## 3. Empirical premise verification log (R08 reinforcement)

Each load-bearing factual claim about cluster baseline behavior is verified by an Architect-side command run, NOT inherited from prior-round testimony.

| Claim | Verification command | Observed output | Spec section |
|---|---|---|---|
| Baseline test count = 361/356/2/3 | `node --test --test-reporter=tap test/*.test.js` (Architect run at session entry; output written to `/tmp/r53_baseline_tests.txt`) | `# tests 361 # pass 356 # fail 2 # skipped 3 # duration_ms 1342.441542`; failing: AC-R36-30 + AC-R36-31 (R36 forward-protection guards; pre-existing inheritance from Phase 2 close `87e372f`) | Empirical baseline header; § 1.4 prediction |
| `tsc` exit code at baseline = 0 | `npx tsc -p tsconfig.test.json; echo "EXIT=$?"` (Architect run at session entry) | `EXIT=0`; zero diagnostics | Empirical baseline header; § 1.4 prediction |
| Round-start SHA = 3744012 | `git rev-parse HEAD` | `3744012b2f113d32668160e5a9816323bd7ac901` (abbrev `3744012`); chore: prepare R53 round directive | § 3 anti-scope baseline + AC-R53-15 `BASELINE_SHA` |
| No intermediate operator-prep commits between routing chore and Architect session | `git log --oneline -5` | `3744012 chore: prepare R53 ...` / `f6fd482 chore(R52): Coordinator wave-plan outputs` / `ac58acf chore: prepare R52 ...` / `620d0e2 chore: Phase 3 PRD ...` / `711b04b chore(R51): MU outputs`; no intermediate commits | § 3 anti-scope baseline rationale |
| `engine/topology-overlay.ts:50-55` is the `TopologySource` interface declaration | direct Read at lines 50-55 | matches: `export interface TopologySource { readonly id: string; readonly version: string; fetchSnapshot(ctx?: FetchContext): Promise<TopologySnapshot>; snapshotHash(snapshot: TopologySnapshot): string; }` | § 1.2 integration table |
| `engine/topology-overlay.ts:69-78` is `computeSnapshotHash` free function | direct Read at lines 69-78 | matches: `export function computeSnapshotHash(snapshot: TopologySnapshot): string { ... }` deterministic sha256 over sorted nodes + edges | § 1.2 integration table |
| `engine/types/verdict.ts:245` is `TopologyNode.kind` union declaration | direct Read at line 245 | matches: `kind: 'service' \| 'database' \| 'queue' \| 'external' \| 'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone';` (8 members pre-R53; R53 adds 2 → 10 members) | § 1.2 integration table + § 2.4 delta surface |
| `engine/types/verdict.ts:255` is `TopologyEdge.relationship` union declaration | direct Read at line 255 | matches: `relationship: 'calls' \| 'reads' \| 'writes' \| 'publishes' \| 'contains' \| 'nvlink_peer';` (6 members pre-R53; R53 adds 1 → 7 members) | § 1.2 integration table + § 2.4 delta surface |
| `engine/types/verdict.ts:289` is the `correlational_not_causal: true` type-body declaration (A16 invariant); `:287` is the JSDoc reference to the same literal | direct Read at lines 287-289 | matches: line 287 JSDoc `Literal \`true\` per D4; ...` + line 289 declaration `correlational_not_causal: true;` | § 10.2 R03/R29 rows + § 6.4 A16 |
| `engine/topology/nvlink-source.ts:74-81` is opportunistic-peer-emission pattern (`if (!nodeIds.has(peerId)) { nodes.push(...) }`) | direct Read at lines 74-81 | matches: opportunistic peer node emission inside link-match branch | § 1.3 failure-mode table + § 4.1 reference |
| `engine/topology/nvlink-source.ts:93` is self-peer defensive guard (`if (a === b) continue`) | direct Read at line 93 | matches: `if (a === b) continue; // ignore self-peer (shouldn't occur but defend)` | § 1.3 + § 4.1 |
| `engine/topology/nvlink-source.ts:115-147` is `NvlinkTopologySource` class structural precedent | direct Read at lines 115-147 | matches: class declaration + constructor with opts pattern + 3rd-operand fallback + `fetchSnapshot` + `snapshotHash` delegation | § 2.2 structural-parallel claim + § 4.1 |
| `coordination/PRD.md:434-435` are FR-V1a + FR-V1b | direct Read | matches: `FR-V1a` (Trainium adapter) + `FR-V1b` (Inferentia adapter) | PRD trace |
| `coordination/PRD.md:447` is AC-P5 | direct Read | matches: AC-P5 = `TopologySnapshot consumable by inherited engine/topology-overlay.ts BFS layer with neuron_link_peer edge relationship literal + trainium_chip node kind literal` | PRD trace |
| `coordination/PRD.md:463-466` is Phase 3 SLICE 1 sub-section | direct Read | matches: SLICE 1 — Vendor expansion (AWS), synthetic-fixture-based | PRD trace |
| `coordination/SCOPING-MEMO-v0.3.md:285-286` pre-anticipate `'neuron_link_peer'` + `'trainium_chip'` literals | direct Read at lines 285-286 | matches: line 285 mentions `'neuron_link_peer'` as straightforward extension; line 286 mentions `'trainium_chip'` as straightforward extension | § 2.4 + parallel-class authorization |
| Neuron SDK `--json-output` exposes `instance_type` + `neuron_devices[].connected_to` | WebFetch `awsdocs-neuron.readthedocs-hosted.com/en/latest/tools/neuron-sys-tools/neuron-ls.html` (Architect at session entry; retrieved 2026-05-19) | Confirmed: `-j` flag → JSON with `neuron_device`, `bdf`, `connected_to` (array of peer device IDs), `neuroncore_ids`, `neuron_processes` fields per device; topology mode `-t` shows text diagram | § 0.1 hidden-assumption + § 2.1 step 2 |
| Neuron SDK confirms shared NeuronCore-v2 + NeuronLink-v2 across Trainium + Inferentia2 | WAVE-PLAN-Phase3-01.md Step 1 merge reasoning (4 URLs cited and verbatim-quoted; retrieval date 2026-05-19) + Architect re-WebFetch of `trainium_inferentia2_arch.html` at session entry | Confirmed: "2 (Inferentia2) or 4 (Trainium) NeuronLink-v2 for device-to-device collective communication" + Trn1.32xlarge "2D Torus topology" + Inferentia2 ring | § 0.2/0.3 selection rationale |

All load-bearing premises empirically verified at Architect session entry; no inherited-attestation premises load-bear in this spec.

---

## 4. Anti-scope set verification (R23 ARCH MINOR-2 reinforcement)

12 paths in the allowed-set, verified for git-trackability via `.gitignore` + parent-directory tracking pattern:

| Path | Status | Verification |
|---|---|---|
| `engine/topology/neuron-source.ts` | NEW (will be tracked post-Implementer commit) | Parent dir `engine/topology/` exists and contains tracked `.ts` files (slurm-source.ts, k8s-source.ts, nvlink-source.ts, common-mode-attribution.ts); `.gitignore` does not exclude `*.ts` |
| `engine/types/verdict.ts` | MOD (already tracked) | `git ls-files engine/types/verdict.ts` returns the path; vendored-with-deltas since R18 |
| `test/q53-neuron-adapter.test.ts` | NEW (will be tracked) | Parent dir `test/` contains tracked `.ts` test files (q01..q41); `.gitignore` does not exclude `*.ts` in `test/` |
| `test/_substrate/neuron-fixture-trainium-2d-torus.json` | NEW (will be tracked) | Parent dir `test/_substrate/` exists; contains tracked `.json` fixtures (k8s-nodelist-fixture-*.json); `.gitignore` does not exclude `*.json` |
| `test/_substrate/neuron-fixture-inferentia-ring.json` | NEW (will be tracked) | Same as above |
| `test/_substrate/neuron-fixture-sparse.json` | NEW (will be tracked) | Same as above |
| `coordination/VENDORING-MANIFEST.md` | MOD (already tracked) | `git ls-files coordination/VENDORING-MANIFEST.md` returns the path |
| `coordination/specs/Q-R53-SPEC.md` | NEW (created by Architect; will be tracked) | Parent dir `coordination/specs/` contains tracked `Q-R*-SPEC.md` files |
| `coordination/specs/Q-R53-SPEC-AUDIT.md` | NEW (this file; will be tracked) | Same as above |
| `coordination/specs/Q-R53-EMPIRICAL.sh` | NEW (Architect-authored at spec emit; will be tracked) | Parent dir `coordination/specs/` contains tracked `Q-R*-EMPIRICAL.sh` files (R46..R51); `.gitignore` does not exclude `*.sh` |
| `coordination/NEXT-ROLE.md` | MOD (already tracked) | `git ls-files coordination/NEXT-ROLE.md` returns the path |
| `coordination/MEMORIAL.md` | MOD (already tracked) | `git ls-files coordination/MEMORIAL.md` returns the path |

All 12 paths git-trackable. Conditional 13th entry (`coordination/diagnostics/DIAGNOSTIC-R53-*.md`) also git-trackable when created — parent dir `coordination/diagnostics/` exists and contains tracked `DIAGNOSTIC-R*-*.md` files.

---

## 5. Reviewer-handoff checklist (R20 ARCH MINOR-1 + reviewer-readability)

- [x] § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription; verified at § 10.2 R20 reinforcement-sweep row.
- [x] Every AC's "Bound by" reference points to a `test()` declaration in § 4.5 OR to an Implementer attestation prescription via `Q-R53-EMPIRICAL.sh` (for AC-R53-13/14).
- [x] All 15 ACs have concrete pass/fail outcomes (no probabilistic ambiguity).
- [x] AC numbering is contiguous (AC-R53-1 through AC-R53-15) and matches the count claimed in § 5 preamble (15 ACs = 13 runtime + 2 attestation).
- [x] Per-component coverage of branch-binding gate documented at § 2.5 above with explicit acknowledgments of unbound defensive surfaces (self-peer guard; opportunistic-peer emission; 3rd-operand `??` default).
- [x] R25 / R26 reinforcement lessons applied: empirical baseline encoded honestly; allowed-set conditional 13th entry pre-authorized; false-compliance-attestation prevention prescribed at § 6.4.
- [x] All 7 cross-project rules enumerated in spec § 7 per SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a) requirement; Q-R53-EMPIRICAL.sh prescribed for Rule 1 sub-class mechanical verification.

---

## 6. Honest-broker disclosures (R25 MINOR-2 transparency precedent)

The Architect transparently surfaces the following:

1. **Single-file decomposition (§ 0.2 Approach A) mixes 2 chip-family parser paths in one module.** Acceptable — chip families share the same JSON schema; only the node-kind literal differs; per OQ-Phase3-W1-1 Option A operator disposition. If Phase 3 SLICE 2 + SLICE 3 add additional Neuron generations (Trn3, Inf3, Trn2 ...) such that the single file's complexity grows beyond comfortable bounds, a future refactor could split. Out-of-scope for R53.

2. **PRD:434 names `engine/topology/trainium-source.ts` for FR-V1a, but R53 ships `engine/topology/neuron-source.ts`.** Operator-dispositioned ambiguity (OQ-Phase3-W1-1 Option A). PRD amendment deferred to Phase 3 SLICE-close walk (OQ-Phase3-W1-2 Option B). Logged at Q-R53-SPEC.md § 8.1.

3. **GPU-id-style lex-vs-numeric ordering for `neuron-N` IDs ≥ 10.** R53 Trainium fixture uses IDs 0-15; lex ordering does not affect AC outcomes (AC-R53-4 asserts set-equality, not pairwise order). Forward-flag for Phase 3 SLICE 2+ vendor adapters; not R53 scope. Logged at Q-R53-SPEC.md § 4.1 Implementer-notes + § 8.2.

4. **The opportunistic-peer-emission path (`if (!nodeIds.has(peerId))`) is NOT separately bound by AC.** The R53 fixtures (Trainium 4×4 Torus + Inferentia 6-chip ring) include every device that appears as a peer in `connected_to` arrays — the opportunistic emission branch never fires for these fixtures. The defensive code mirrors R30 NvlinkSource line 78-81 pattern (whose AC-R30-disposition also leaves this path unbound). Acceptable per R30 precedent.

5. **The third operand in the `id`/`version` constructor fallback chain (`?? 'neuron_topology_source'` / `?? 'neuron-1'`) is structurally unreachable.** `parseNeuronLsJson` always defaults `snapshot.source_id` / `snapshot.source_version` to a typed-string literal (never undefined per parser step 8). The third operand exists for defensive correctness if `parseNeuronLsJson` is ever modified to weaken the default; not killable by mutation given the current parser shape. Mirrors R30 NvlinkSource third-operand disposition (R30 § 9.2 R06 row). Acceptable per R30 precedent.

6. **AC-R53-12 grep pattern `grep -c 'correlational_not_causal: true' engine/types/verdict.ts` matches BOTH the JSDoc at `:287` AND the type-body declaration at `:289`.** The grep is non-discriminating — a comment-only match would pass while the type-body literal is removed. Mitigation: the type-body literal at `:289` CANNOT be removed without breaking TypeScript compile (it's a literal type constraint on the `TopologyCandidate.correlational_not_causal` field). The non-discriminating threshold is structurally non-failable here (compile would catch type-removal before the grep ran). Mirrors R30 AC-R30-15 disposition.

7. **No L0 counter-ingestion helper at R53.** Per § 1.5 explicit Coordinator-level scope decision. If Trainium / Inferentia counter exposure becomes load-bearing at SLICE 2 (Path A real-cluster validation), an `ingestNeuronErrorCounter` helper would land alongside WU-Phase3-2C. Not a R53 deferral; SLICE-level decision per WAVE-PLAN file-tree scope.

---

_End of Q-R53-SPEC-AUDIT.md._
