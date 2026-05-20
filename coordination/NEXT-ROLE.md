CURRENT-ROUND: R54
NEXT-ROLE: COORDINATOR
STATUS: READY
TIER: coordinator-wave-gate

## Round-scope directive (R54 — WAVE-GATE-Phase3-01 close + SLICE 2 wave plan)

R54 is the WAVE-GATE-Phase3-01 close for Phase 3 SLICE 1. R53 (`4978e9b`) closed the sole WU in the wave (WU-Phase3-1 AWS Neuron adapter; MERGE-READY per Reviewer cold-eye). Coordinator-mode wave-gate-close round per pipeline `--coordinator --wave-gate WAVE-Phase3-01` invocation.

**Round-start SHA:** `4978e9b` (chore(R53): Memorial-Updater outputs).

### Operator decision — OQ-P3-9 RESOLVED 2026-05-19: **Path B (DEFER cluster rental)**

Per PRD § Phase 3 Scope SLICE 1/2 gating moment, operator selected Path B at WAVE-GATE-Phase3-01 close:

- **US-07 DEFERRED.** AC-P6 (rented-GPU DCGM L0 contract validation) marked DEFERRED at Phase 3 close (not failing; not blocking).
- **FR-V3 (rental scaffolding) DEFERRED.** No `scripts/rent-gpu-validation.sh` or similar artifacts authored at SLICE 2.
- **FR-V4 (live cluster topology fetch) partial.** SLICE 2 ships INTERFACE design + sparse-data resilience tests (synthetic partial-topology fixtures); real-cluster-fetch validation portion DEFERRED.
- **WU-Phase3-2C** (real-cluster L0 contract validation) NOT included in SLICE 2 wave plan.
- Phase 3 progresses to SLICE 3 (DS integration) without further gating on rental decision per PRD OQ-P3-4 resolution (decoupled from rental success).

### Primary deliverable

Produce two Coordinator artifacts:

1. **`coordination/WAVE-GATE-Phase3-01.md`** per `templates/WAVE-GATE-TEMPLATE.md`:
   - Wave 1 close attestation (WU-Phase3-1 MERGE-READY per Reviewer)
   - `scripts/verify-wave-aggregate.sh WAVE-Phase3-01` execution + result
   - Per R50 tier-aware consolidation Reviewer logic: WU-Phase3-1 ran full-tier with cluster-internal Reviewer (3 MINOR + 2 OBS findings already audited) → consolidation Reviewer is OPTIONAL; Coordinator decides invoke-or-not based on cross-cluster integration concerns (none, since single-cluster wave)
   - Operator decision Path B recorded (OQ-P3-9 RESOLVED)
   - Pre-flag forward-flags for SLICE 2 work
2. **`coordination/WAVE-PLAN-Phase3-02.md`** per `templates/WAVE-PLAN-TEMPLATE.md` for SLICE 2:
   - WU-Phase3-2A: Google TPU / ICI adapter (full-tier; parallel-class with Neuron; synthetic fixtures from JAX + TPU v4/v5 papers)
   - WU-Phase3-2B: Live topology fetch INTERFACE design — extends Slurm/K8s/NVLink/Neuron/TPU adapters with `TopologySource.fetchSnapshot(ctx)` interface + sparse-data resilience tests (no real-cluster validation; Path B)
   - WU-Phase3-2C: NOT INCLUDED (Path B deferral)
   - DAG construction via D1-D5 tests; 2A + 2B dependency analysis (2A introduces `'tpu_ici_peer'` literal + `'tpu_shard'` kind; 2B extends interface across all 6 adapter sources — D1 write-conflict risk warrants single-cluster bundle OR sequential dispatch decision per Coordinator)
   - Wave sequencing
   - WAVE-GATE-Phase3-02 criteria

### Tier rationale

**coordinator-wave-gate** — `--coordinator --wave-gate WAVE-Phase3-01` mode per pipeline. Produces wave-gate close + next wave plan; cluster dispatch happens in R55+ rounds per the new plan.

### Anti-scope (R54 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files (Coordinator role does not implement code).
- NO modification of R53 deliverables (`engine/topology/neuron-source.ts`, `test/q53-neuron-adapter.test.ts`, `test/_substrate/neuron-fixture-*.json`, `engine/types/verdict.ts` deltas, R53 spec/audit/empirical files) — frozen historical baseline.
- NO modification of `CLAUDE-*.md` files.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `coordination/PRD.md` (Phase 3 scope already authored; Coordinator reads, doesn't amend).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (OQ-Phase3-W1-2 Option B deferral preserved; SLICE-close walk pattern).
- NO modification of `coordination/WAVE-PLAN-Phase3-01.md` (R52 deliverable; frozen).
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO cluster dispatch (Coordinator produces wave-gate + next plan; dispatch happens R55+).
- NO real-cluster work (Path B deferral honored).
- NO opening GitHub PRs.

ALLOWED modifications:
- `coordination/WAVE-GATE-Phase3-01.md` (NEW — primary deliverable 1)
- `coordination/WAVE-PLAN-Phase3-02.md` (NEW — primary deliverable 2)
- `coordination/CLUSTER-HANDOFF-Phase3-2A-2B.md` (NEW conditional — only if 2A/2B sub-WUs require explicit handoff per D-test analysis)
- `coordination/COORDINATOR-MEMORIAL.md` (append)
- `coordination/MEMORIAL.md` (Coordinator-section append at round close)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Coordinator's WAVE-GATE attestation cites specific R53 Reviewer findings (counts; SHAs; AC PASS counts) via empirical re-derivation. SLICE 2 wave plan cites PRD lines + JAX/TPU SDK URLs verbatim with retrieval dates.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — Coordinator stage.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — Coordinator stage.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET above; no invented files outside list.
- **Rule 5 (`rule-derivation-without-self-application`):** N/A — no new rule derived.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if WU-Phase3-2A + 2B D-test analysis surfaces an unexpected dependency edge (e.g., 2B's interface extension to 6 sources structurally serializes with 2A's new TPU source addition), HALT + DIAGNOSTIC.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** N/A as derivation; existing surfaces (R44 SPEC-AUTHORING-CHECKLIST.md + R45 pre-commit-rule-sweep + R50 wave-aggregate verifier) apply at downstream Architect dispatch.

### Halt conditions

1. **`scripts/verify-wave-aggregate.sh WAVE-Phase3-01` exits non-zero:** HALT + DIAGNOSTIC. Wave-aggregate verifier surfaces inter-cluster contract drift, aggregate scope creep, or MEMORIAL semantic-conflict — operator decides resolution.
2. **R53 Reviewer findings include any CRITICAL on re-read:** Coordinator re-reads `coordination/reviews/REVIEWER-REPORT-R53.md` at wave-gate close; if any CRITICAL surfaces, HALT + DIAGNOSTIC + ESCALATE (would change wave-gate close routing).
3. **D-test edge surfaces unexpected SLICE 2 cross-WU dependency:** if WU-Phase3-2A (TPU) and WU-Phase3-2B (interface extension across all 6 sources) have D1-write-conflict on `engine/types/verdict.ts` (both extending enum) OR D2-AC-reference (2B's AC references 2A's TPU source), HALT + DIAGNOSTIC; Coordinator decides bundle-or-split.
4. **JAX or TPU public docs unavailable / topology spec ambiguous:** if Coordinator cannot determine via public docs how to construct synthetic TPU ICI fixtures from JAX topology code + TPU v4/v5 papers, HALT + DIAGNOSTIC; operator decides defer TPU adapter to a later SLICE.

### Inputs for Coordinator

1. `coordination/WAVE-PLAN-Phase3-01.md` — R52 wave plan (Wave 1 = WU-Phase3-1 single-cluster bundled)
2. `coordination/reviews/REVIEWER-REPORT-R53.md` — R53 cold-eye Reviewer report (15 ACs PASS; 3 MINOR + 2 OBS; MERGE-READY)
3. `coordination/MEMORIAL.md` § R53 entries (Architect + Implementer + Reviewer + MU subsections)
4. `coordination/specs/Q-R53-SPEC.md` + `Q-R53-SPEC-AUDIT.md` + `Q-R53-EMPIRICAL.sh` — R53 spec triad
5. `engine/topology/neuron-source.ts` + `test/q53-neuron-adapter.test.ts` + `test/_substrate/neuron-fixture-*.json` — R53 deliverables (Coordinator reads for wave-gate attestation, doesn't modify)
6. `engine/types/verdict.ts` — schema extensions at R53 (Coordinator reads for SLICE 2 contract verification)
7. `coordination/PRD.md` § Phase 3 Scope (esp. SLICE 2 sub-section + FR-V2 + FR-V4)
8. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility table (TPU adapter row reference)
9. `CLAUDE-COORDINATOR.md` (full)
10. `templates/WAVE-GATE-TEMPLATE.md` + `templates/WAVE-PLAN-TEMPLATE.md`
11. `scripts/verify-wave-aggregate.sh` (R50; invoke at wave-gate close)
12. Public JAX topology source code + TPU v4/v5 architectural papers (Coordinator reads + cites URLs in WAVE-PLAN-Phase3-02.md for synthetic fixture design)
13. `coordination/COORDINATOR-MEMORIAL.md` — R52 + R54 Coordinator entries

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R54 --coordinator --wave-gate WAVE-Phase3-01
```

(Per pipeline help: `--wave-gate WAVE-NN` is the Coordinator wave-gate close flow; combined with `--coordinator`. Pipeline overrides tier-derived roles; runs wave-aggregate verifier + tier-aware consolidation Reviewer logic + emits wave-gate doc + next wave plan.)

---

## Operator-decision flags (updated post-R53 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R53 contributions).
5. **Phase 3 SLICE 1 substantively complete at R53 close.** WAVE-GATE-Phase3-01 (R54) close + SLICE 2 dispatch (R55+) are next.
6. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
7. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.
8. R53 3 MINOR + 2 OBS findings — Memorial-Updater appends documented; standalone fix-round candidate IF operator chooses.
9. **OQ-P3-9 RESOLVED 2026-05-19: Path B (DEFER cluster rental).** AC-P6 + FR-V3 + WU-Phase3-2C all marked DEFERRED at Phase 3 close.
10. OQ-P3-11 SCOPING-MEMO v0.4 carry-forward — default extend v0.3 at SLICE-close walks.
11. OQ-Phase3-W1-1 RESOLVED 2026-05-19 (Option A single neuron-source.ts).
12. OQ-Phase3-W1-2 RESOLVED 2026-05-19 (Option B defer SCOPING-MEMO § 2.3 amendments to SLICE-close walk).
