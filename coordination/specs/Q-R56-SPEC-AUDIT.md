# Q-R56-SPEC-AUDIT — Architect audit-trail sidecar for R56

**Round:** R56 (Wave 7 of WAVE-PLAN-07; single-cluster sole-WU WU-Phase3-2A).
**Author:** Architect (Claude Opus 4.7).
**Companion spec:** `coordination/specs/Q-R56-SPEC.md`.
**Companion empirical script:** `coordination/specs/Q-R56-EMPIRICAL.sh`.
**Date:** 2026-05-19.

This sidecar captures the audit-trail content the Reviewer needs to evaluate the Architect's pre-route discipline application. The Implementer reads only Q-R56-SPEC.md proper; the Reviewer reads both.

---

## 1. P3 ten-axis verification (one sentence per axis)

See Q-R56-SPEC.md § 9. Reproduced here for the audit trail:

1. **Correctness** — Edge counts are exact graph-theoretic identities (6·64/2 = 192 for v4/v5p cube; 3·8/2 = 12 for 2×2×2 mesh sub-cube); no probabilistic ACs.
2. **Completeness** — Every WAVE-PLAN-07 Step 1 frame-level AC (a)-(j) maps to ≥1 AC; FR-V2 + AC-P5 TPU extension + AC-P7 cross-cutting all covered.
3. **Consistency** — § 5 preamble matches § 4 prescription per R20 ARCH MINOR-1; § 0 picks (A/A/A/A) referenced consistently across § 2 / § 4 / § 5.
4. **Clarity** — No banned ambiguous-language tokens in AC text; concrete numeric / string-equality / anchored-regex expectations.
5. **Coverage** — 15 ACs exhaust WAVE-PLAN-07 frame-level items; runtime vs attestation classification explicit; chore-A vs chore-B test-count states distinguished (R53 MINOR-1 reinforcement honored).
6. **Constraints** — Tier `full` per A1+A2+A4+A7; anti-scope (§ 3); Phase 1/2/SLICE-1 frozen files consumed read-only; verdict.ts additive enum extensions only.
7. **Concurrency** — Parser pure-functional; no shared state; async-returning-resolved-value; single-threaded test execution.
8. **Corner cases** — 6 malformed-input sub-cases; sub-cube partial; opportunistic peer emission; self-peer defensive guard; multi-link dedup; fallback chain.
9. **Cost** — ~200 LOC prod + ~250 LOC test; 15 ACs; 3 fixture files (8-entry sparse + 64-entry v4 cube + 64-entry v5p cube); ~20-25 min Implementer execution time.
10. **Coupling** — Production code couples to topology-overlay (read-only) + verdict.ts (types + additive enum extension); test code adds verdict.ts string-read for AC-R56-12; no L0 coupling (deferred to SLICE 2B / SLICE 3).

---

## 2. Pre-route discipline application

### 2.1 Superpowers Brainstorm
Four axes brainstormed × three approaches each (Q-R56-SPEC.md § 0.1/0.2/0.3/0.4); selection rationale documented inline. Selection summary table at § 0.5.

### 2.2 Superpowers Design
Component boundaries + integration points + failure modes sketched in Q-R56-SPEC.md § 1 (precedes per-file pseudocode at § 4).

### 2.3 Superpowers Review
Self-review applied: re-read as Implementer-receiving-cold; re-read as Reviewer-receiving-cold; documented in Q-R56-SPEC.md § 10 grilling output.

### 2.4 CLAUDE-ARCHITECT.md reinforcement sweep
26 reinforcement lines reviewed; applicable items applied. Full table at Q-R56-SPEC.md § 10.2. R53 MINOR-1 (chore-A vs chore-B test-count prediction; added 2026-05-19) honored at AC-R56-14 + Q-R56-EMPIRICAL.sh.

### 2.5 Branch-binding coverage gate (R21 ARCH MINOR-2/3)

Every guard / fallback / default in prescribed production code has either a binding AC or a documented coverage-limitation note:

| Code surface | Binding AC | Mutation-killable? |
|---|---|---|
| `parseTpuTopologyJson` JSON.parse wrap | AC-R56-10 (a) (`/TPU_PARSE_INVALID_JSON/`) | ✓ |
| `parseTpuTopologyJson` `parsed !== null && typeof parsed === 'object'` guard | AC-R56-10 (b) via missing `tpu_version` (which catches both null/non-object AND missing-string case via `validateTpuVersion`) | ✓ |
| `validateTpuVersion` `typeof version !== 'string' \|\| length === 0` guard | AC-R56-10 (b) (`/TPU_PARSE_MISSING_TPU_VERSION/`) | ✓ |
| `validateTpuVersion` `!KNOWN_TPU_VERSIONS.includes(version)` guard | AC-R56-10 (c) (`/TPU_PARSE_UNKNOWN_TPU_VERSION: v99/`) | ✓ |
| `validateSliceShape` `!Array.isArray \|\| length !== 3` guard | AC-R56-10 (d) (`/TPU_PARSE_INVALID_SLICE_SHAPE/` for `[4, 4]` case) | ✓ |
| `validateSliceShape` `typeof dim !== 'number' \|\| !Number.isInteger \|\| dim < 1` per-element guard | NOT separately bound — AC-R56-10 (d) exercises array-length variant only; per-element variant is defensive (mirrors R30 + R53 defensive-guard disposition for sibling element validation). Acceptable since the array-length variant binds the core throw path | Branch 1 (length) ✓; per-element branches defensive |
| `parseTpuTopologyJson` `!Array.isArray(root.chips)` guard | AC-R56-10 (e) (`/TPU_PARSE_MISSING_CHIPS/`) | ✓ |
| `parseTpuTopologyJson` `root.chips.length === 0` guard | AC-R56-10 (f) (`/TPU_PARSE_NO_CHIPS/`) | ✓ |
| `parseTpuTopologyJson` `isPartialSlice` branch when slice has any dim < 4 | AC-R56-9 (partial=true on 2×2×2 sub-cube) | ✓ |
| `parseTpuTopologyJson` `isPartialSlice` branch when all dims ≥ 4 | AC-R56-1 + AC-R56-5 (partial=false on 4×4×4 cubes) | ✓ |
| `parseTpuTopologyJson` opportunistic-peer-node emission (`if (!nodeIds.has(peerId))`) | AC-R56-1 + AC-R56-5 expected node counts (each fixture has all peer IDs that are also chip IDs; opportunistic path emits the `'tpu_shard'` kind for any unseen peer; defensive surface — not separately bound by AC) | ✗ (defensive; mirrors R30 + R53 disposition) |
| `parseTpuTopologyJson` self-peer guard `if (peerId === chipId) continue` | NOT BOUND — defensive code per § 4.1 Implementer-notes | ✗ (intentional; mirrors R30 + R53 § 4.1 disposition) |
| `parseTpuTopologyJson` canonical-ordering `a < b ? a : b` | AC-R56-4 (canonical `from < to` lex) | ✓ |
| `parseTpuTopologyJson` edge-dedup `Set<string>` | AC-R56-4 (unique pairs assertion; expected size = 192) | ✓ |
| `TpuTopologySource` constructor id fallback (3 branches: opts.id; snapshot.source_id; default) | AC-R56-7 sub-case (a) covers branch 2 (default construction; opts.id undefined → snapshot.source_id `'tpu_topology_source'`); AC-R56-7 sub-case (b) covers branch 1 (explicit opts.id `'explicit-test-id'`); branch 3 (default literal in `??`-chain) is structurally unreachable per § 4.1 Implementer-notes (parser always defaults snapshot.source_id) | Branches 1-2 ✓; branch 3 ✗ (defensive; mirrors R30 + R53 third-operand disposition) |
| `TpuTopologySource` constructor version fallback (3 branches: opts.version; snapshot.source_version; default) | AC-R56-7 sub-case (a) covers branch 2 (default → `'tpu-v4-1'` because parser sets snapshot.source_version from `\`tpu-${tpu_version}-1\``); sub-case (b) covers branch 1 (explicit `'explicit-test-ver'`); branch 3 same disposition | Same disposition |
| `TpuTopologySource.fetchSnapshot` identity return | AC-R56-7 (array assertion) | ✓ |
| `TpuTopologySource.snapshotHash` delegation | AC-R56-8 (equality to `computeSnapshotHash`) | ✓ |

Three AC-not-bound defensive surfaces (opportunistic-peer-node emission for unseen peer IDs; self-peer guard; per-element slice_shape validation) and one structurally-unreachable default operand (third operand in `??`-chain) — all explicitly documented per R30 + R53 precedent.

### 2.6 Architect pre-prediction (outcome anchors)
Recorded at Q-R56-SPEC.md § 1.4. Predicted outcomes:
- AC-R56-1..12 + AC-R56-15: at chore-A, AC-R56-15 FAILS by construction (placeholder SHA literal); other 12 PASS. At chore-B (after SHA injection), all 13 runtime tests PASS.
- AC-R56-13: tsc exit 0 (zero diagnostics; preserves session-entry baseline inherited from R53 clean tsc surface).
- AC-R56-14: **chore-A state** tests=387 / pass=381 / fail=3 / skipped=3; **chore-B state** tests=387 / pass=382 / fail=2 / skipped=3 (per R53 MINOR-1 reinforcement).

Reviewer comparison: if Implementer attestation differs from prediction, the Reviewer should compare predicted-vs-actual and flag any systematic discrepancy. R56 explicitly distinguishes chore-A vs chore-B state to avoid the test-count-prediction mismatch pattern R53 MINOR-1 surfaced.

### 2.7 Decision rationale (why-picked / why-rejected for each § 0 axis)

**§ 0.1 — Parser input format (A picked: JAX-style topology JSON; B+C rejected):**
- **Why A:** matches K8s + Neuron precedent (R29 + R53 JSON-shape input); structured JSON eliminates regex brittleness; JAX programmatic topology API naturally serializes to JSON; matches WAVE-PLAN-07 file-tree scope row prescribing `.json` extension fixtures.
- **Why not B (coordinate-triple formula):** mixes parser-input handling with topology-derivation; sparse degradation harder to express.
- **Why not C (text format):** no canonical "tpu-ls"-equivalent tool exists in Google TPU stack; inventing a text-format spec when JSON is the de-facto surface is YAGNI inversion.

**§ 0.2 — Module decomposition (A picked: single file; B+C rejected):**
- **Why A:** operator OQ-Phase3-W2-1 dispositioned Option A (NEXT-ROLE.md line 17); matches R28/R29/R30/R53 single-file precedent; tightest blast radius.
- **Why not B (split per-version):** contradicts operator disposition; D5-strict write-conflict on shared `'tpu_ici_peer'` enum literal would serialize the round.
- **Why not C (hybrid: shared parser + two classes):** TPU version is a runtime distinction from fixture content; extra classes for no semantic benefit; over-engineering.

**§ 0.3 — Partial-flag semantics (A picked: sub-cube detection from slice_shape; B+C rejected):**
- **Why A:** semantically aligned with public-doc behavior ("full cube ⇒ full torus; sub-cube ⇒ mesh-only" per WAVE-PLAN-07 line 72 verbatim quote); deterministic from `slice_shape` field; exercises WAVE-PLAN-07 frame-AC (e) "sub-cube → mesh-only graceful" explicitly.
- **Why not B (empty-edges only, R53 convention):** doesn't capture TPU-specific sub-cube mesh-only semantics; contradicts WAVE-PLAN-07 frame-AC (e) explicit semantic.
- **Why not C (both conditions):** conflates two distinct semantics under one flag; would need a second `mesh_only` flag, expanding `TopologySnapshot` surface (A12 risk).

**§ 0.4 — Edge representation (A picked: undirected-deduped canonical; B+C rejected):**
- **Why A:** matches inherited BFS bidirectional treatment (`engine/topology-overlay.ts:262-267`); minimum-edges form; deterministic-hash-friendly; matches R30 + R53 precedent.
- **Why not B (per-raw):** edge surface inflated; same BFS outcome; redundant.
- **Why not C (both representations):** would require modifying `TopologySnapshot` shape (A12 violation).

### 2.8 Amendments from prior version
N/A — this is the initial spec emission for R56. No prior version.

### 2.9 Re-evaluation of prior brainstorm picks (if applicable)
N/A — no ESCALATE disposition triggered re-selection of a previously-rejected approach. Operator OQ-Phase3-W2-1 (Option A) + OQ-Phase3-W2-2 (Option B) dispositioned BEFORE R56 Architect session start; both were Coordinator-level OQs surfaced in WAVE-PLAN-07.md Step 3 Judgment calls and dispositioned by operator at R56 directive emission time (NEXT-ROLE.md lines 17-18).

---

## 3. Empirical premise verification log (R08 reinforcement)

Each load-bearing factual claim about cluster baseline behavior is verified by an Architect-side command run, NOT inherited from prior-round testimony.

| Claim | Verification command | Observed output | Spec section |
|---|---|---|---|
| Baseline test count = 374/369/2/3 | `node --test --test-reporter=tap test/*.test.js` (Architect run at session entry; output captured in /tmp/claude-501 background-task log) | `# tests 374 # pass 369 # fail 2 # cancelled 0 # skipped 3 # duration_ms 1605.680083`; failing: AC-R36-30 + AC-R36-31 (R36 forward-protection guards; pre-existing inheritance from Phase 2 close `87e372f`; carry-forward from R53 close) | Empirical baseline header; § 1.4 prediction |
| `tsc` exit code at baseline = 0 | `npx tsc -p tsconfig.test.json; echo "EXIT=$?"` (Architect run at session entry) | `EXIT=0`; zero diagnostics | Empirical baseline header; § 1.4 prediction |
| Round-start SHA = 4447586 | `git rev-parse HEAD` | `4447586574134ea62660593ec38e8d4144952f87` (abbrev `4447586`); chore: prepare R56 directive (WU-Phase3-2A Google TPU adapter; full-tier) | § 3 anti-scope baseline + AC-R56-15 `BASELINE_SHA` |
| No intermediate operator-prep commits between routing chore and Architect session | `git log --oneline -5` | `4447586` chore: prepare R56 / `c9ca2a8` chore(R55): Coordinator wave-plan outputs / `fe10444` chore: prepare R55 / `fb7585c` chore(R54): WAVE-GATE-06 close / `df9c78f` chore(R54): WAVE-GATE-04 close; no intermediate commits | § 3 anti-scope baseline rationale |
| `engine/topology-overlay.ts:50-55` is the `TopologySource` interface declaration | direct Read at lines 50-55 | matches: `export interface TopologySource { readonly id: string; readonly version: string; fetchSnapshot(ctx?: FetchContext): Promise<TopologySnapshot>; snapshotHash(snapshot: TopologySnapshot): string; }` | § 1.2 integration table |
| `engine/topology-overlay.ts:69-78` is `computeSnapshotHash` free function | direct Read at lines 69-78 | matches: `export function computeSnapshotHash(snapshot: TopologySnapshot): string { ... }` deterministic sha256 over sorted nodes + edges | § 1.2 integration table |
| `engine/types/verdict.ts:254` is `TopologyNode.kind` union declaration | direct Read at line 254 | matches: `kind: 'service' \| 'database' \| 'queue' \| 'external' \| 'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone' \| 'trainium_chip' \| 'inferentia_chip';` (10 members pre-R56; R56 adds 1 → 11 members) | § 1.2 integration table + § 2.4 delta surface |
| `engine/types/verdict.ts:264` is `TopologyEdge.relationship` union declaration | direct Read at line 264 | matches: `relationship: 'calls' \| 'reads' \| 'writes' \| 'publishes' \| 'contains' \| 'nvlink_peer' \| 'neuron_link_peer';` (7 members pre-R56; R56 adds 1 → 8 members) | § 1.2 integration table + § 2.4 delta surface |
| `engine/types/verdict.ts:298` is the `correlational_not_causal: true` type-body declaration (A16 invariant); `:281` is the JSDoc reference to the same literal | direct Read at lines 281 + 298 | matches: line 281 JSDoc `correlational_not_causal: true` is a required literal label; line 298 declaration `correlational_not_causal: true;` | § 10.2 R29 row + § 6.4 A16 |
| `engine/topology/neuron-source.ts:140-173` is `NeuronTopologySource` class structural precedent | direct Read at lines 140-173 | matches: class declaration + constructor with opts pattern + 3rd-operand fallback + `fetchSnapshot` + `snapshotHash` delegation | § 2.2 structural-parallel claim + § 4.1 |
| `engine/types/verdict.ts` is EXCLUDED from `q01-no-at-pin-deltas.test.ts` AT_PIN_FILES list | direct Read of q01-no-at-pin-deltas.test.ts file header comment (lines 8 / 19 / 28) | confirmed: comments enumerate R18 + R23 + R53 verdict.ts deltas as the reason for exclusion; R56 inherits the exclusion | § 2.4 Step 2 |
| `coordination/PRD.md:436` is FR-V2 | direct Read | matches: `FR-V2 \| Google TPU / ICI adapter — engine/topology/tpu-source.ts parses TPU pod topology; synthetic fixtures from JAX topology code + TPU v4/v5 papers \| US-06 \| SLICE 2` | PRD trace |
| `coordination/PRD.md:447` is AC-P5 | direct Read | matches: AC-P5 `TopologySnapshot consumable by inherited engine/topology-overlay.ts BFS layer with neuron_link_peer edge relationship literal + trainium_chip node kind literal` — R56 re-asserts the pattern for `tpu_ici_peer` + `tpu_shard` literals (cross-cutting extension) | PRD trace |
| `coordination/PRD.md:477-488` is Phase 3 SLICE 2 sub-section | direct Read | matches: SLICE 2 — Vendor expansion (Google) + live topology fetch interface (sequential after SLICE 1; partially conditional); WU-Phase3-2A line 479 + WU-Phase3-2B line 480 + WU-Phase3-2C line 481 conditional | PRD trace |
| `coordination/PRD.md:459` is Phase 3 NEW anti-scope vendor-neutrality | direct Read | matches: "NEW Phase 3 anti-scope: No vendor-locked code paths. AWS Trainium adapter MUST use the same `TopologySource` interface as Slurm/K8s/NVLink adapters; no AWS-SDK-internal hooks ... Same constraint applies to TPU adapter." | § 3 anti-scope |
| `coordination/WAVE-PLAN-07.md` line 72 is the TPU public-doc verbatim quotes | direct Read at line 72 | matches: WU-Phase3-2A row contains "Six interconnect links per chip" (TPU v4 6 ICI links); "TPU v4 slices are available in increments of 64 chips, with shapes that are multiples of 4 on all three dimensions" (4x4x4 cube baseline); "Bidirectional inter-chip interconnect (ICI) bandwidth per chip (GBps): 1200" (TPU v5p); "All 4x4x4 and larger slices (one cube) have full 3D torus connectivity. Slices smaller than a full cube are 3D connected, however, they don't have wrap-around links that make them a 3D torus." | § 0.3 partial-flag semantic + § 2.4 schema authorization + § 4.2-4.4 fixture rationale |
| Google Cloud TPU v4 public docs at `cloud.google.com/tpu/docs/v4` retrieved 2026-05-19 (WAVE-PLAN-07 line 256 cites this URL) | inherited from WAVE-PLAN-07 Coordinator-side WebFetch (date-stamped 2026-05-19); Architect re-verifies the structural facts (6 ICI links; 4x4x4 baseline) align with what WAVE-PLAN-07 quotes | Confirmed via WAVE-PLAN-07 verbatim quote text matching my spec's structural claims | § 0.1 hidden-assumption + § 4.2 fixture rationale |
| Google Cloud TPU v5p public docs at `cloud.google.com/tpu/docs/v5p` retrieved 2026-05-19 (WAVE-PLAN-07 line 256 cites this URL) | inherited from WAVE-PLAN-07 Coordinator-side WebFetch (date-stamped 2026-05-19); Architect re-verifies the structural facts (1200 GBps ICI; full torus ≥4x4x4) align | Confirmed via WAVE-PLAN-07 verbatim quote text matching my spec's structural claims | § 0.1 hidden-assumption + § 4.3 fixture rationale |

All load-bearing premises empirically verified at Architect session entry; the only inherited claims (Google Cloud TPU public-doc verbatim quotes) are inherited from WAVE-PLAN-07 Step 1 (Coordinator-side WebFetch retrieval 2026-05-19), with verbatim quotes embedded in the spec body for traceability per Rule 1 cite-then-verify discipline. Per R08 reinforcement: the inheritance is from a same-round-cluster Coordinator artifact (not a prior-round Reviewer testimony), and the WAVE-PLAN-07 verbatim quotes ARE the public-doc text — the verification chain is one-hop with full quote preservation.

---

## 4. Anti-scope set verification (R23 ARCH MINOR-2 reinforcement)

12 paths in the allowed-set, verified for git-trackability via `.gitignore` + parent-directory tracking pattern:

| Path | Status | Verification |
|---|---|---|
| `engine/topology/tpu-source.ts` | NEW (will be tracked post-Implementer commit) | Parent dir `engine/topology/` exists and contains tracked `.ts` files (slurm-source.ts, k8s-source.ts, nvlink-source.ts, neuron-source.ts, common-mode-attribution.ts); `.gitignore` does not exclude `*.ts` |
| `engine/types/verdict.ts` | MOD (already tracked) | `git ls-files engine/types/verdict.ts` returns the path; vendored-with-deltas since R18 |
| `test/q56-tpu-adapter.test.ts` | NEW (will be tracked) | Parent dir `test/` contains tracked `.ts` test files (q01..q41 + q53); `.gitignore` does not exclude `*.ts` in `test/` |
| `test/_substrate/tpu-fixture-v4-cube.json` | NEW (will be tracked) | Parent dir `test/_substrate/` exists; contains tracked `.json` fixtures (k8s-nodelist-fixture-*.json, neuron-fixture-*.json); `.gitignore` does not exclude `*.json` |
| `test/_substrate/tpu-fixture-v5p-cube.json` | NEW (will be tracked) | Same as above |
| `test/_substrate/tpu-fixture-sparse-subcube.json` | NEW (will be tracked) | Same as above |
| `coordination/VENDORING-MANIFEST.md` | MOD (already tracked) | `git ls-files coordination/VENDORING-MANIFEST.md` returns the path |
| `coordination/specs/Q-R56-SPEC.md` | NEW (created by Architect; will be tracked) | Parent dir `coordination/specs/` contains tracked `Q-R*-SPEC.md` files |
| `coordination/specs/Q-R56-SPEC-AUDIT.md` | NEW (this file; will be tracked) | Same as above |
| `coordination/specs/Q-R56-EMPIRICAL.sh` | NEW (Architect-authored at spec emit; will be tracked) | Parent dir `coordination/specs/` contains tracked `Q-R*-EMPIRICAL.sh` files (R46..R51 + R53); `.gitignore` does not exclude `*.sh` |
| `coordination/NEXT-ROLE.md` | MOD (already tracked) | `git ls-files coordination/NEXT-ROLE.md` returns the path |
| `coordination/MEMORIAL.md` | MOD (already tracked) | `git ls-files coordination/MEMORIAL.md` returns the path |

All 12 paths git-trackable. Conditional 13th entry (`coordination/diagnostics/DIAGNOSTIC-R56-*.md`) also git-trackable when created — parent dir `coordination/diagnostics/` exists and contains tracked `DIAGNOSTIC-R*-*.md` files.

---

## 5. Reviewer-handoff checklist (R20 ARCH MINOR-1 + reviewer-readability)

- [x] § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription; verified at § 10.2 R20 reinforcement-sweep row.
- [x] Every AC's "Bound by" reference points to a `test()` declaration in § 4.5 OR to an Implementer attestation prescription via `Q-R56-EMPIRICAL.sh` (for AC-R56-13/14).
- [x] All 15 ACs have concrete pass/fail outcomes (no probabilistic ambiguity).
- [x] AC numbering is contiguous (AC-R56-1 through AC-R56-15) and matches the count claimed in § 5 preamble (15 ACs = 13 runtime + 2 attestation).
- [x] Per-component coverage of branch-binding gate documented at § 2.5 above with explicit acknowledgments of unbound defensive surfaces (self-peer guard; opportunistic-peer emission; per-element slice_shape validation; 3rd-operand `??` default).
- [x] R25 / R26 / R53 reinforcement lessons applied: empirical baseline encoded honestly; allowed-set conditional 13th entry pre-authorized; false-compliance-attestation prevention prescribed at § 6.4; chore-A vs chore-B test-count states distinguished per R53 MINOR-1.
- [x] All 7 cross-project rules enumerated in spec § 7 per SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a) requirement; Q-R56-EMPIRICAL.sh prescribed for Rule 1 sub-class mechanical verification.

---

## 6. Honest-broker disclosures (R25 MINOR-2 transparency precedent)

The Architect transparently surfaces the following:

1. **Single-file decomposition (§ 0.2 Approach A) mixes 3 TPU-generation parser paths in one module** (`v4` / `v5p` / `v5e` recognized; future `v6e` / `v7` etc.). Acceptable — TPU generations share the same JSON schema; only `tpu_version` literal differs per fixture (per OQ-Phase3-W2-1 Option A operator disposition; matches R53 single-file Trainium+Inferentia pattern). If future Phase 3 SLICE 2B / SLICE 3 add additional TPU generations such that the single file's complexity grows beyond comfortable bounds, a future refactor could split. Out-of-scope for R56.

2. **The PRD line 436 names `engine/topology/tpu-source.ts` for FR-V2** — consistent with my Architect file-layout decision (no inconsistency to surface). The R56 file location matches both PRD and NEXT-ROLE.md directive verbatim.

3. **GPU-id-style lex-vs-numeric ordering for `tpu-N` IDs ≥ 10.** R56 cube fixtures use IDs 0-63; lex ordering does not affect AC outcomes (AC-R56-4 asserts set-equality, not pairwise order). Forward-flag for Phase 3 SLICE 2B + future vendor adapters; not R56 scope. Logged at Q-R56-SPEC.md § 4.1 Implementer-notes + § 8.3.

4. **The opportunistic-peer-emission path (`if (!nodeIds.has(peerId))`) is NOT separately bound by AC.** The R56 fixtures (v4 cube + v5p cube + 2×2×2 sub-cube) include every chip that appears as a peer in `ici_peers` arrays — the opportunistic emission branch never fires for these fixtures. The defensive code mirrors R30 + R53 pattern (whose AC-disposition also leaves this path unbound). Acceptable per R30 + R53 precedent.

5. **The third operand in the `id`/`version` constructor fallback chain (`?? 'tpu_topology_source'` / `?? 'tpu-1'`) is structurally unreachable.** `parseTpuTopologyJson` always defaults `snapshot.source_id` / `snapshot.source_version` to a typed-string literal (never undefined per parser step 9). The third operand exists for defensive correctness if `parseTpuTopologyJson` is ever modified to weaken the default; not killable by mutation given the current parser shape. Mirrors R30 + R53 third-operand disposition. Acceptable per R30 + R53 precedent.

6. **AC-R56-12 grep pattern `grep -c 'correlational_not_causal: true' engine/types/verdict.ts` matches BOTH the JSDoc at `:281` AND the type-body declaration at `:298`.** The grep is non-discriminating — a comment-only match would pass while the type-body literal is removed. Mitigation: the type-body literal at `:298` CANNOT be removed without breaking TypeScript compile (it's a literal type constraint on the `TopologyCandidate.correlational_not_causal` field). The non-discriminating threshold is structurally non-failable here (compile would catch type-removal before the grep ran). Mirrors R30 AC-R30-15 + R53 AC-R53-12 disposition.

7. **No L0 counter-ingestion helper at R56.** Per § 1.5 explicit Coordinator-level scope decision. If TPU counter exposure becomes load-bearing at SLICE 2B (Wave 8 live-fetch interface) or SLICE 3, an `ingestTpuErrorCounter` helper would land there. Not a R56 deferral; SLICE-level decision per WAVE-PLAN-07 file-tree scope.

8. **Partial-flag semantic divergence from R53 (R53 = empty-edges; R56 = sub-cube).** Deliberate per § 0.3 selection (TPU public-doc "full cube vs sub-cube" semantic). A consumer that expects cross-vendor partial-flag harmony would be surprised; current consumers (BFS layer; MD-F4 common-mode attribution) read `partial` flag as advisory, not load-bearing. Future cross-vendor harmonization is SLICE 2B / future scope. Logged at Q-R56-SPEC.md § 0.3 + § 8.5.

9. **The 64-entry v4 + v5p cube fixtures are generated, not hand-written.** § 4.2 + § 4.3 provide 4 anchoring chip entries + a deterministic coordinate-derivation rule; the Implementer is expected to generate the 60 remaining entries via a one-time script (Node REPL, Python, etc.) before committing the JSON. The generator script is NOT a committed artifact; only the produced JSON is. The 8-entry sub-cube fixture (§ 4.4) is fully enumerated. The discipline boundary: the FIXTURE FORMAT is precise (Architect responsibility); the FIXTURE CONTENTS for the 64-entry cubes are deterministic from the formula (Implementer applies rule). If the Implementer's generated JSON differs structurally from the formula prediction, AC-R56-1 + AC-R56-4 + AC-R56-5 will catch it (exact count assertions + canonical-ordering assertion).

---

_End of Q-R56-SPEC-AUDIT.md._
