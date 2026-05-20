CURRENT-ROUND: R52
NEXT-ROLE: COORDINATOR
STATUS: READY
TIER: coordinator

## Round-scope directive (R52 — Phase 3 SLICE 1 Coordinator wave plan)

R52 is the first Phase 3 round, following R51 close (`711b04b`) and Phase 3 PRD authoring (`620d0e2`). Coordinator-mode round: decompose Phase 3 SLICE 1 scope from PRD into work units; build dependency DAG; produce wave plan; output to `coordination/WAVE-PLAN-Phase3-01.md`.

**Round-start SHA:** `620d0e2` (chore: Phase 3 PRD authored).

### Primary deliverable

Produce `coordination/WAVE-PLAN-Phase3-01.md` per `templates/WAVE-PLAN-TEMPLATE.md` containing:

1. **Work unit extraction** from `coordination/PRD.md` § Phase 3 Scope → SLICE 1 sub-section. Default expectation per OQ-P3-10: WU-Phase3-1A (Trainium) + WU-Phase3-1B (Inferentia) bundled into single cluster IF Neuron Link topology is shared across both chip families. Coordinator confirms via read of Neuron SDK public docs at WU extraction time; splits if Inferentia topology materially differs.
2. **Dependency edge identification** via D1-D5 deterministic tests per `CLAUDE-COORDINATOR.md` § DAG construction discipline:
   - D1 Shared output ownership: does any WU write to a file/schema/interface another reads from?
   - D2 AC reference: does one WU's ACs reference another's outputs?
   - D3 Anti-scope adjacency: any implicit-assumption edges?
   - D4 File tree overlap: any contention risks?
   - D5 Schema/migration sequencing: any serial gates?
3. **Wave sequencing** from the DAG. Expected: SLICE 1 = single wave with 1 or 2 parallel clusters (WU-Phase3-1A + WU-Phase3-1B; bundled or split per default).
4. **Work unit classification** (tier per `CLAUDE-COMMON.md` tier rubric A1-A7 / S1-S5 / Z1-Z5):
   - WU-Phase3-1A Trainium adapter: parallel-class with WU-01/02/03 Slurm/K8s/NVLink. Novelty: new vendor (AWS); new edge-relationship literal (`neuron_link_peer`); new node-kind literal (`trainium_chip`). Inherited architecture: `TopologySource` interface; `engine/topology-overlay.ts` BFS layer. Tier expected: **full** (A2 first-vendor pattern; A3 + S2 schema additions).
   - WU-Phase3-1B Inferentia adapter: bundled with 1A or sequential. If bundled and Neuron Link topology shared: novelty reduces to vendor-name-only; **audit-tier** sufficient. If split: own tier verdict.
5. **Wave gate criteria** for WAVE-GATE-Phase3-01:
   - Per-cluster Reviewer reports MERGE-READY at cluster close
   - `scripts/verify-wave-aggregate.sh WAVE-Phase3-01` exit 0 (aggregate ALLOWED_SET union + cross-cluster contract verification + MEMORIAL fragment semantic-conflict detection)
   - Tier-aware consolidation Reviewer per R50: if all clusters ran full-tier with cluster-internal Reviewer, consolidation Reviewer is OPTIONAL; operator may invoke via `--consolidation-reviewer` flag if integration concerns surface
   - Phase 3 anti-scope items honored (NO real-cluster access required for SLICE 1; vendor-neutral interface; A10 carve-out)
6. **Cross-cluster handoff artifacts** if applicable: if 1A + 1B split, document the Neuron Link topology contract between them at `coordination/CLUSTER-HANDOFF-Phase3-1A-1B.md`.

### Tier rationale

**coordinator-tier** — Coordinator-only round per pipeline `--coordinator` mode. Produces wave plan; cluster dispatch is separate (sequential WU rounds R53+ per wave plan).

### Anti-scope (R52 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files (Coordinator role does not implement code).
- NO modification of `CLAUDE-*.md` files (Coordinator authors WAVE-PLAN, not role-discipline updates).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `coordination/PRD.md` (Phase 3 scope already authored; Coordinator reads, doesn't amend).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (Coordinator reads).
- NO modification of R42-R51 specs / empirical files (preserve historical baseline).
- NO modification of `scripts/*` or `run-pipeline.sh` (Coordinator does not modify pipeline tools).
- NO cluster dispatch (Coordinator produces plan; dispatch happens in separate R53+ rounds per plan).

ALLOWED modifications:
- `coordination/WAVE-PLAN-Phase3-01.md` (NEW — primary deliverable)
- `coordination/CLUSTER-HANDOFF-Phase3-1A-1B.md` (NEW conditional — only if 1A/1B split)
- `coordination/COORDINATOR-MEMORIAL.md` (append per CLAUDE-COORDINATOR.md memorial discipline)
- `coordination/MEMORIAL.md` (Coordinator-section append at round close)
- `coordination/NEXT-ROLE.md` (this file; STATUS update at round close)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Coordinator's WU extraction + dependency edge findings must cite specific PRD lines + Neuron SDK doc URLs. No memorized claims about Trainium / Inferentia topology — Coordinator reads + cites at wave-plan emit time.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored at Coordinator stage.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated above; Coordinator does not invent files outside the list.
- **Rule 5 (`rule-derivation-without-self-application`):** N/A — no new rule derived at R52. (Coordinator is applying existing framework; not deriving discipline.)
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if PRD Phase 3 scope is ambiguous on a WU boundary, HALT + DIAGNOSTIC; do NOT silently re-interpret.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** N/A — Coordinator applies existing surfaces (Rule 7 (a) checklist + (b) pre-commit-sweep + R50 wave-aggregate verifier); does not derive new propagation surfaces.

### Halt conditions

1. **Neuron SDK public docs ambiguous on Inferentia topology relationship to Trainium:** if Coordinator cannot determine via public docs whether Neuron Link topology is shared (default-bundled per OQ-P3-10) or distinct (split), HALT + DIAGNOSTIC; operator decides.
2. **PRD Phase 3 SLICE 1 sub-section internally inconsistent:** if `coordination/PRD.md` Phase 3 SLICE 1 description contradicts FR-V1a/b or AC-P5 wording, HALT + DIAGNOSTIC; operator amends PRD or Coordinator escalates.
3. **D-test edge surfaces unexpected cross-WU dependency:** if D1-D5 tests identify a hidden serial dependency between Trainium adapter and existing Slurm/K8s/NVLink adapters (e.g., shared `engine/types/verdict.ts` enum extension serializes work), HALT + DIAGNOSTIC; operator decides whether to split into 2-wave SLICE 1 or amend PRD.

### Inputs for Coordinator

1. `coordination/PRD.md` § Phase 3 Scope (especially SLICE 1 sub-section + FR-V1a/b + AC-P5 + Phase 3 anti-scope).
2. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (vendor fungibility row) — relevant existing scope-memo coverage of vendor adapter pattern.
3. `CLAUDE-COORDINATOR.md` (full) — Coordinator role discipline; DAG construction; wave gate semantics.
4. `templates/WAVE-PLAN-TEMPLATE.md` — wave plan format.
5. `coordination/WAVE-PLAN-01.md`, `WAVE-PLAN-02.md`, `WAVE-PLAN-03.md` — Phase 2 wave plans for pattern reference.
6. `coordination/CLUSTER-HANDOFF-1-WU00-WU01.md` (and siblings) — cluster handoff format reference if 1A/1B split.
7. Public Neuron SDK docs (Coordinator reads at wave-plan emit time; cite URLs in WAVE-PLAN-Phase3-01.md).
8. `coordination/COORDINATOR-MEMORIAL.md` — Coordinator role memorial state from Phase 2.

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R52 --coordinator
```

(Coordinator mode overrides tier-derived roles; produces wave plan; cluster dispatch is separate via R53+ rounds per the wave plan.)

---

## Operator-decision flags (carried forward; updated post-R51 + Phase 3 PRD authoring)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R51 contributions).
5. **Phase 3 PRD authored 2026-05-19** — Phase 3 entry IN PROGRESS at R52 (this round). HARD STOP on Phase 3 *scope* lifted; Phase 3 SLICE 1 execution proceeds.
6. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
7. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.
8. **NEW post-Phase-3-PRD:** OQ-P3-9 gating moment between SLICE 1 close and SLICE 2 dispatch (operator decision Path A vs Path B on cluster rental).
9. **NEW post-Phase-3-PRD:** OQ-P3-10 Inferentia bundling — Coordinator decides at R52 wave plan based on Neuron SDK doc read.
10. **NEW post-Phase-3-PRD:** OQ-P3-11 SCOPING-MEMO v0.4 needed — default to extending v0.3; escalate if SLICE 1 Reviewer flags scope-creep.
