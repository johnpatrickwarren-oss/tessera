CURRENT-ROUND: R55
NEXT-ROLE: COORDINATOR
STATUS: READY
TIER: coordinator

## Round-scope directive (R55 — Phase 3 SLICE 2 Coordinator wave plan)

R55 follows R54 close (`fb7585c`). Coordinator-mode round: decompose Phase 3 SLICE 2 scope from PRD into work units; build dependency DAG; produce `coordination/WAVE-PLAN-07.md` for WAVE-07.

**Round-start SHA:** `fb7585c` (chore(R54): WAVE-GATE-06 close emit).

### Operator decisions (carry-forward; relevant to SLICE 2)

- OQ-P3-1 RESOLVED at PRD authoring: vendor sequencing AWS Trainium FIRST (R53 ✓), Google TPU SECOND (this slice).
- OQ-P3-2 RESOLVED at PRD authoring: operator does not have Google Cloud access; SLICE 2 TPU adapter relies on public data only (JAX topology code + TPU v4/v5 architectural papers).
- OQ-P3-9 RESOLVED at R54 close: **Path B (DEFER cluster rental).** WU-Phase3-2C NOT INCLUDED in SLICE 2 wave plan.
- OQ-Phase3-W1-1 RESOLVED at R53: Coordinator empirically confirmed unified-parser pattern (single-file precedent). Analogous decision may apply for TPU + live-fetch interface (Coordinator decides at WAVE-PLAN-07 emit).
- Naming convention: **globally-sequential WAVE-NN per R54-acknowledged drift fix.** Phase 3 SLICE 2 = WAVE-07; plan = `WAVE-PLAN-07.md`; future gate = `WAVE-GATE-07.md`.

### Primary deliverable

Produce `coordination/WAVE-PLAN-07.md` per `templates/WAVE-PLAN-TEMPLATE.md` containing:

1. **Work unit extraction** from `coordination/PRD.md` § Phase 3 Scope → SLICE 2 sub-section:
   - WU-Phase3-2A: Google TPU / ICI adapter (`engine/topology/tpu-source.ts` + synthetic fixtures from JAX + TPU v4/v5 papers)
   - WU-Phase3-2B: Live cluster topology fetch INTERFACE design — extends Slurm/K8s/NVLink/Neuron/TPU adapters with `TopologySource.fetchSnapshot(ctx)` interface + sparse-data resilience tests (NO real-cluster validation per Path B)
   - WU-Phase3-2C: NOT INCLUDED (Path B operator decision at WAVE-GATE-06)

2. **Dependency edge identification** via D1-D5 deterministic tests per `CLAUDE-COORDINATOR.md`:
   - D1 Shared output ownership: WU-Phase3-2A writes new TPU source + verdict.ts enum extension; WU-Phase3-2B extends existing 4 adapter sources (Slurm/K8s/NVLink/Neuron) with new method signature → D5 write-conflict on `engine/types/verdict.ts` for 2A + write-overlap risk on existing adapter source files for 2B
   - D2 AC reference: does 2B's AC reference 2A's TPU source for the interface coverage? Likely yes (Coordinator confirms at extraction).
   - D5 Schema serialization: 2A and 2B both touch verdict.ts → same merge-conflict risk that drove R52 Trainium+Inferentia bundle decision.

3. **Wave sequencing** + **bundle-or-split decision** for 2A + 2B:
   - **Option A (bundle):** single WU-Phase3-2 cluster combining TPU adapter + interface extension. Mirrors R52 Trainium+Inferentia bundling (D5-strict avoidance + sequential-internal-work). Recommend if 2A and 2B share substantial setup.
   - **Option B (split with sequential):** 2A first (TPU adapter standalone); 2B second (interface extension after TPU adapter ships, so 2B can include TPU source). Sequential single-cluster waves.
   - **Option C (parallel-cluster fan-out):** 2A and 2B in parallel clusters with explicit CLUSTER-HANDOFF on verdict.ts enum coordination. More complex; only if Coordinator confirms zero schema-conflict possible (e.g., 2A and 2B touch disjoint sections of verdict.ts).

4. **Work unit classification**:
   - WU-Phase3-2A TPU: parallel-class with WU-01/02/03/Neuron. Novelty: new vendor (Google); new edge relationship literal (`'tpu_ici_peer'`); new node kind literal (`'tpu_shard'`). Tier expected: **full** (A2 first-vendor pattern; A3 + S2 schema additions).
   - WU-Phase3-2B Live fetch interface: cross-cutting interface extension across 5 sources. Novelty: new method signature (`fetchSnapshot(ctx)`); per-adapter implementation; sparse-data resilience tests against synthetic partial-topology fixtures (NO real cluster). Tier expected: **full** (A4 schema-class interface change; A7 cross-cutting impact).

5. **Wave gate criteria** for WAVE-GATE-07:
   - Per-cluster Reviewer reports MERGE-READY at cluster close (if bundled: single cluster Reviewer; if split: per-cluster Reviewers)
   - `scripts/verify-wave-aggregate.sh WAVE-07` exit 0
   - Tier-aware consolidation Reviewer per R50 (OPTIONAL if all clusters full-tier with cluster-internal Reviewer)
   - Phase 3 SLICE 2 anti-scope honored (NO real-cluster access; NO Phase 3 SLICE 3 work)

6. **Cross-cluster handoff artifacts** if 2A/2B split: document the interface contract at `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md`.

### Tier rationale

**coordinator-tier** — Coordinator-only round per pipeline `--coordinator` mode. Produces wave plan; cluster dispatch is separate (R56+ per wave plan).

### Anti-scope (R55 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files.
- NO modification of R42-R54 deliverables (frozen historical baseline).
- NO modification of `CLAUDE-*.md` files.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `coordination/PRD.md` (Coordinator reads, doesn't amend).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md`.
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO cluster dispatch (Coordinator produces plan; dispatch R56+).
- NO Phase 3 SLICE 3 territory (DS integration is a separate slice; sequential after SLICE 2 close).
- NO real-cluster work (Path B honored).
- NO opening GitHub PRs.

ALLOWED modifications:
- `coordination/WAVE-PLAN-07.md` (NEW — primary deliverable)
- `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (NEW conditional — only if 2A/2B split)
- `coordination/COORDINATOR-MEMORIAL.md` (append)
- `coordination/MEMORIAL.md` (Coordinator-section append at round close)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Coordinator's WU extraction + dependency edge findings must cite specific PRD lines + JAX/TPU SDK doc URLs verbatim with retrieval dates. No memorized claims about TPU ICI topology.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — Coordinator stage.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — Coordinator stage.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET above.
- **Rule 5 (`rule-derivation-without-self-application`):** N/A — no new rule derived at R55. (Note: globally-sequential WAVE-NN convention surfaced at R54 → R55 honors it from emit time.)
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if JAX/TPU public docs ambiguous on ICI topology format, HALT + DIAGNOSTIC.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** N/A — Coordinator applies existing surfaces.

### Halt conditions

1. **JAX/TPU public docs ambiguous on ICI topology format:** if Coordinator cannot determine synthetic fixture design from JAX topology code + TPU v4/v5 papers, HALT + DIAGNOSTIC; operator decides defer TPU adapter to a later SLICE.
2. **D5 write-conflict on verdict.ts cannot be resolved by bundle/split decision:** if 2A and 2B both need to extend verdict.ts in ways that cannot be sequenced cleanly, HALT + DIAGNOSTIC.
3. **PRD Phase 3 SLICE 2 internally inconsistent:** if FR-V2/FR-V4 wording contradicts AC-P5 cross-cutting expectations, HALT + DIAGNOSTIC.

### Inputs for Coordinator

1. `coordination/PRD.md` § Phase 3 Scope (esp. SLICE 2 sub-section + FR-V2 + FR-V4 + AC-P5).
2. `coordination/WAVE-PLAN-06.md` — R52 wave plan for SLICE 1 (pattern reference).
3. `coordination/WAVE-GATE-06.md` — R54 wave-gate close (forward-flags for SLICE 2).
4. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility table (TPU adapter row).
5. `engine/topology/neuron-source.ts` (R53) — parallel-class pattern reference.
6. `engine/topology-overlay.ts` — inherited BFS layer; `TopologySource` interface definition.
7. `engine/topology/slurm-source.ts`, `k8s-source.ts`, `nvlink-source.ts` — adapters that 2B's interface extension will modify.
8. `engine/types/verdict.ts` — schema-extension target (D5 risk).
9. `CLAUDE-COORDINATOR.md` (full).
10. `templates/WAVE-PLAN-TEMPLATE.md`.
11. Public JAX source code + TPU v4/v5 architectural papers (Coordinator reads + cites URLs).
12. `coordination/COORDINATOR-MEMORIAL.md` — Coordinator memorial state through R54.

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R55 --coordinator
```

---

## Operator-decision flags (updated post-R54 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R54 contributions).
5. **Phase 3 SLICE 1 CLOSED at R54 WAVE-GATE-06; SLICE 2 IN PROGRESS at R55 (this round).**
6. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
7. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.
8. R53 3 MINOR + 2 OBS findings — Memorial-Updater appended; standalone fix-round candidate IF operator chooses.
9. R54 naming-convention drift documented; 1st-tessera Rule 5 self-application precedent.
10. OQ-P3-9 RESOLVED Path B (DEFER cluster rental); AC-P6 + FR-V3 + WU-Phase3-2C all DEFERRED.
11. OQ-P3-11 SCOPING-MEMO v0.4 carry-forward.
12. OQ-Phase3-W1-1/W1-2 RESOLVED at R53.
