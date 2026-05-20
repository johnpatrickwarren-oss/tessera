CURRENT-ROUND: R53
NEXT-ROLE: ARCHITECT
STATUS: READY
TIER: full

## Round-scope directive (R53 — WU-Phase3-1 AWS Neuron adapter; full-tier cluster dispatch)

R53 is the first Phase 3 SLICE 1 cluster pipeline round per `coordination/WAVE-PLAN-Phase3-01.md` (R52 Coordinator wave plan emission at `f6fd482`). Single-cluster full-tier round implementing the bundled AWS Trainium + AWS Inferentia adapter.

**Round-start SHA:** `f6fd482` (chore(R52): Coordinator wave-plan outputs).

### Operator resolutions (R52 OQ-Phase3-W1 questions)

- **OQ-Phase3-W1-1 RESOLVED:** Option A — single unified `engine/topology/neuron-source.ts` parser. Per Coordinator-empirical confirmation that Trainium + Inferentia2 share NeuronCore-v2 + NeuronLink-v2 architecture, single-file precedent (WU-03 NVLink, WU-04 common-mode) is the structurally correct shape. PRD:434 explicit FR-V1a filename (`trainium-source.ts`) was over-specific drafting; Coordinator's empirical reading supersedes.
- **OQ-Phase3-W1-2 RESOLVED:** Option B — defer SCOPING-MEMO § 2.3 amendments to Phase 3 SLICE-close walk per R32 MAJOR-1 carry-forward pattern. Architect does NOT amend SCOPING-MEMO during WU-Phase3-1 spec authoring.

### Primary deliverable

Implement WU-Phase3-1 AWS Neuron adapter as specified in `coordination/WAVE-PLAN-Phase3-01.md`:

1. **Single unified parser** `engine/topology/neuron-source.ts` — concrete `TopologySource` implementation for AWS Neuron family (Trainium + Inferentia2). Parses Neuron Link topology output (format per Neuron SDK public docs) producing `TopologySnapshot` consumable by `engine/topology-overlay.ts` BFS layer.
2. **Synthetic fixtures** at `test/_substrate/neuron-fixture-*.{txt,json}` (Tessera-original) covering:
   - Trainium 2D Torus topology (4 NeuronLinks per chip)
   - Inferentia2 ring topology (2 NeuronLinks per chip)
   - Sparse/partial topology graceful handling (matches WU-04 LS-4 pre-cleared pattern)
3. **Schema extensions** to `engine/types/verdict.ts` (vendored-with-deltas pattern; AT_PIN_FILES + VENDORING-MANIFEST.md maintenance):
   - `TopologyEdge.relationship` += `'neuron_link_peer'`
   - `TopologyNode.kind` += `'trainium_chip'` + `'inferentia_chip'` (distinct per Coordinator wave-plan; Trainium and Inferentia differ in topology shape despite shared interconnect family)
4. **Test file** `test/q53-neuron-adapter.test.ts` covering AC enumeration:
   - Well-formed Neuron topology fixture → expected `TopologySnapshot` structure
   - Edge-relationship literal correctness (`'neuron_link_peer'` only)
   - Node-kind literal correctness (both `'trainium_chip'` and `'inferentia_chip'`)
   - `TopologySource` interface conformance (`fetchSnapshot(ctx?)` + `snapshotHash(s)` delegates to `computeSnapshotHash`)
   - Sparse-data graceful degradation
   - `correlational_not_causal: true` invariant preserved at `TopologyCandidate` wire boundary (A16 defensive)
   - Phase 1 + Phase 2 ACs (AC-P1 through AC-P4) hold unchanged (AC-P7 cross-cutting)
5. **PRD/spec consistency** — Architect notes the PRD:434 `trainium-source.ts` mention is superseded by operator OQ-Phase3-W1-1 Option A resolution. No PRD amendment in this round (OQ-Phase3-W1-2 Option B defers).

### Tier rationale

**full-tier** — Architect (spec authoring) + Implementer (production code + tests + chore-A) + Reviewer (cold-eye) + Memorial-Updater (close). Per Coordinator wave-plan: A1 (new vendor dependency: AWS Neuron) + A2 (first-vendor Neuron pattern; AWS first per OQ-P3-1 RESOLVED) + A4 (schema extensions to `engine/types/verdict.ts`) + A7 (parallel-class with WU-01/02/03 Slurm/K8s/NVLink — pattern leverage).

### Anti-scope (R53 hard limits)

- NO real-cluster access required or attempted (Phase 3 SLICE 1 is synthetic-fixture-based per Phase 3 PRD; US-07 path A/B gated at WAVE-GATE-Phase3-01 close).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (OQ-Phase3-W1-2 Option B deferral).
- NO modification of `coordination/PRD.md` Phase 3 sub-section (Architect cites it; doesn't amend).
- NO modification of R42-R52 deliverables (frozen historical baseline). Specifically: no modification of R52 Coordinator artifacts (WAVE-PLAN-Phase3-01.md, COORDINATOR-MEMORIAL.md).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `scripts/*` (R45-R51 deliverables stable).
- NO modification of `run-pipeline.sh` (R49-R51 deliverables stable).
- NO modification of `CLAUDE-*.md` files in REINFORCEMENTS sections (R51 consolidation + re-accretion guard preserved). MU stage applies the new threshold-aware rule.
- NO Phase 3 SLICE 2+ work (TPU adapter, live cluster fetch, etc.) — strictly SLICE 1.
- NO real customer telemetry (A8/A11 inherited).
- NO hardware-diagnostic territory (A10 inherited; live DCGM gated to SLICE 2 conditional).
- NO opening any GitHub PRs.

ALLOWED modifications:
- `engine/topology/neuron-source.ts` (NEW — primary deliverable per Option A)
- `engine/types/verdict.ts` (modify — vendored-with-deltas; add `'neuron_link_peer'` + `'trainium_chip'` + `'inferentia_chip'`)
- `test/q53-neuron-adapter.test.ts` (NEW — Implementer authors per Architect spec)
- `test/_substrate/neuron-fixture-*.{txt,json}` (NEW — synthetic Neuron Link topology fixtures)
- `coordination/VENDORING-MANIFEST.md` (modify if vendored-file deltas added to `engine/types/verdict.ts`)
- `coordination/specs/Q-R53-SPEC.md` (NEW — Architect-authored spec)
- `coordination/specs/Q-R53-SPEC-AUDIT.md` (NEW — Architect ceremony sidecar)
- `coordination/specs/Q-R53-EMPIRICAL.sh` (NEW — Rule 1 sub-class self-application per R46/R51)
- `coordination/reviews/REVIEWER-REPORT-R53.md` (Reviewer)
- `coordination/diagnostics/DIAGNOSTIC-R53-*.md` (conditional; only if HALT fires)
- `coordination/MEMORIAL.md` (Implementer + Reviewer + MU appends)
- `coordination/NEXT-ROLE.md` (this file; pipeline updates)

### Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Q-R53-EMPIRICAL.sh applies R47 Tightenings 1-4 + R48 corrections + R49 conventions to all empirical claims (test counts, file existence, schema extension verification). No memorized values from spec text.
- **Rule 2 (`branch-binding-coverage-gate`):** ACTIVE GATE — Architect spec must enumerate Neuron Link parser guards/defaults/fallbacks; Acknowledged-gap section documents any unbound branches with non-load-bearing rationale.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** ACTIVE GATE — for each AC Then-clause field, test file uses discriminating assertions (strictEqual / deepStrictEqual / regex with line anchoring; not broad substring matches per R30 MINOR-1).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — Architect ALLOWED_SET in Q-R53-SPEC.md at spec-emit time; must include the ALLOWED list above + standard carve-outs (REVIEWER-REPORT + DIAGNOSTIC paths).
- **Rule 5 (`rule-derivation-without-self-application`):** N/A — no new rule derived at R53.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if Neuron SDK doc-format ambiguity surfaces during implementation (e.g., fixture format unclear), HALT + DIAGNOSTIC + ESCALATE.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE per existing surfaces — SPEC-AUTHORING-CHECKLIST.md § Rule 7 gate applies at Architect spec emit; pre-commit-rule-sweep.sh at chore-A; wave-aggregate verifier at WAVE-GATE-Phase3-01.

### Halt conditions

1. **Q-R53-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **Neuron SDK fixture format ambiguity:** if public docs don't clearly specify the topology output format the adapter parses, HALT + DIAGNOSTIC.
3. **D5 schema-write-conflict regression:** if Architect spec inadvertently re-introduces split-adapter pattern (creating Trainium + Inferentia source files that both extend `engine/types/verdict.ts`), HALT + DIAGNOSTIC per OQ-Phase3-W1-1 Option A resolution.
4. **Phase 1/2 ACs regress:** if test baseline changes any of AC-P1 through AC-P4 properties (Ville bound; warm-start; freeze-hook; topology-attribution), HALT + DIAGNOSTIC per AC-P7 cross-cutting.
5. **Test baseline drift other than R53-additions:** expected baseline shift = R51 baseline + R53 test count delta (Architect specifies expected delta in Q-R53-SPEC.md). Any unexpected shift → HALT + DIAGNOSTIC.

### Inputs for Architect

1. `coordination/WAVE-PLAN-Phase3-01.md` — Coordinator wave plan; READ FIRST as primary input
2. `coordination/PRD.md` § Phase 3 Scope (esp. FR-V1a/b + AC-P5 + SLICE 1 sub-section)
3. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility table (parallel-class pattern authorization)
4. `engine/topology-overlay.ts` — inherited BFS layer the adapter feeds into
5. `engine/types/verdict.ts` — schema target for delta extensions
6. `engine/topology/slurm-source.ts` + `engine/topology/k8s-source.ts` + `engine/topology/nvlink-source.ts` — parallel-class adapter precedent
7. `coordination/specs/Q-R28-SPEC.md` (Slurm adapter spec) + `Q-R29-SPEC.md` (K8s) + `Q-R30-SPEC.md` (NVLink) — spec authoring pattern reference
8. Neuron SDK public docs (Architect reads + cites URLs in Q-R53-SPEC.md):
   - `https://awsdocs-neuron.readthedocs-hosted.com/en/v2.26.0/general/nki/arch/trainium_inferentia2_arch.html`
   - `https://awsdocs-neuron.readthedocs-hosted.com/en/latest/general/arch/neuron-hardware/trn1-arch.html`
9. `coordination/COORDINATOR-MEMORIAL.md` — R52 Coordinator entries
10. `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 1.3 + § 1.4 (AWS Trainium + Inferentia candidate framing)

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

(Per R49 pipeline-mandatory discipline; full-tier auto-routes Architect → Implementer → Reviewer → Memorial-Updater across fresh subprocess Claude sessions per role. R52 Coordinator wave plan dispatch recommendation.)

---

## Operator-decision flags (carried forward; updated post-R52 Coordinator close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R52 contributions).
5. **Phase 3 IN PROGRESS at SLICE 1 — R53 first cluster pipeline round.**
6. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
7. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.
8. **OQ-P3-9 gating moment at WAVE-GATE-Phase3-01 close** — operator decision Path A vs Path B on cluster rental for US-07.
9. **OQ-P3-11 SCOPING-MEMO v0.4** — default to extending v0.3; escalate if SLICE 1 Reviewer flags scope-creep.
10. OQ-Phase3-W1-1 RESOLVED 2026-05-19 (Option A single neuron-source.ts).
11. OQ-Phase3-W1-2 RESOLVED 2026-05-19 (Option B defer SCOPING-MEMO § 2.3 amendments to SLICE-close walk).
