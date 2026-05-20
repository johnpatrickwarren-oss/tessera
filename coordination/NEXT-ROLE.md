CURRENT-ROUND: R60
NEXT-ROLE: COORDINATOR
STATUS: READY
TIER: coordinator

## Round-scope directive (R60 — Phase 3 SLICE 3 Coordinator wave plan; PARALLEL-FAN-OUT evaluation REQUIRED)

R60 follows R59 close (`383c1e8`). Coordinator-mode round: decompose Phase 3 SLICE 3 (DS integration) into work units; build dependency DAG; produce `coordination/WAVE-PLAN-09.md`. **Operator-flagged at R59 WAVE-GATE-08: this is the first Phase 3 wave with structural parallel-fan-out opportunity; Coordinator MUST explicitly evaluate Option C (parallel-cluster fan-out) for WU-3B + WU-3C and NOT default-to-sequential without justification.**

**Round-start SHA:** `383c1e8` (chore(R59): WAVE-GATE-08 close; Phase 3 SLICE 2 closes).

### Operator decisions (carry-forward; relevant to SLICE 3)

- OQ-P3-4 RESOLVED: SLICE 3 (DS integration) sequential after SLICE 2; decoupled from cluster-rental success.
- OQ-P3-6 RESOLVED: parallel methodology + production scope (SLICE 3 may interleave with methodology if needed).
- Path B (OQ-P3-9): no real-cluster work. SLICE 3 deliverables operate on synthetic VerdictGroups for DS event-conditional attribution validation.
- Naming convention: globally-sequential WAVE-NN. SLICE 3 starts at WAVE-09.

### Primary deliverable

Produce `coordination/WAVE-PLAN-09.md` per `templates/WAVE-PLAN-TEMPLATE.md`:

1. **Work unit extraction** from `coordination/PRD.md` § Phase 3 Scope → SLICE 3 sub-section:
   - **WU-Phase3-3A:** Engine npm package extract (`@johnpatrickwarren-oss/deploysignal-engine`). Foundational. Eliminates vendoring-drift R-E6 risk row. Both Tessera + DS consume same package version post-extract.
   - **WU-Phase3-3B:** Tessera → DS bi-directional (VerdictGroup → deploy-event context). Tessera per-shard observations feed DS correlation layer.
   - **WU-Phase3-3C:** DS → Tessera (event feed gates freeze-hook against real deploy events; replaces synthetic VerdictGroups in event-conditional attribution).

2. **Dependency edge identification** via D1-D5 deterministic tests per `CLAUDE-COORDINATOR.md`:
   - **D1 Shared output ownership:** 3A writes the npm package (consumed by 3B + 3C); 3B writes Tessera→DS feed code; 3C writes DS→Tessera consumer code.
   - **D2 AC reference:** 3B + 3C both reference 3A's npm package as a dependency. 3B and 3C reference each other? Likely NOT (Tessera→DS direction is independent of DS→Tessera direction architecturally).
   - **D3 Anti-scope adjacency:** none anticipated.
   - **D4 File tree overlap:** 3A touches `package.json` + npm-package source files (likely in `engine/` for the extract; possibly new `package/` directory). 3B touches Tessera→DS feed code (location TBD by Architect; could be `engine/ds-integration/feed.ts`). 3C touches Tessera-side DS event consumer (could be `engine/ds-integration/event-consumer.ts`). File-tree overlap between 3B and 3C: LOW if they live in distinct files.
   - **D5 Schema/migration sequencing:** 3A is foundational (must complete before 3B/3C dispatch). 3B + 3C may both touch shared schema (VerdictGroup wire format; freeze-hook config surface) — Coordinator analyzes.

3. **Wave sequencing + PARALLEL-FAN-OUT evaluation:**

   **Required analysis for Option C (parallel-fan-out) for 3B + 3C:**
   - Confirm D1 LOW: 3B + 3C write to disjoint files (3B owns Tessera→DS feed; 3C owns DS→Tessera consumer)
   - Confirm D2 LOW: 3B's ACs do NOT reference 3C outputs; 3C's ACs do NOT reference 3B outputs
   - Confirm D4 LOW: file-tree overlap between 3B + 3C ≤ shared interface declarations (manageable via CLUSTER-HANDOFF)
   - Confirm D5 LOW: 3B + 3C may extend shared schema; if so, identify the shared write-target and decide bundle vs fan-out-with-handoff

   **Expected Wave structure (Coordinator confirms or adjusts):**
   - **Wave 9 (R61):** WU-Phase3-3A npm extract (single-cluster; full-tier; foundational; required before Wave 10)
   - **Wave 10 (R63+):** WU-Phase3-3B + WU-Phase3-3C **PARALLEL CLUSTERS** (full-tier per cluster; CLUSTER-HANDOFF-WAVE10-3A-3B-3C.md documents npm package contract + any shared schema deltas)

   **Default-to-sequential is REJECTED unless D-test analysis demonstrates genuine inter-WU dependency (D1/D2/D4/D5 surfacing actual conflicts).** Phase 2 Wave 2 precedent (WU-01 + WU-02 + WU-03 parallel) is the structural reference; SLICE 3 3B/3C should follow this pattern if D-test analysis confirms independence.

4. **Work unit classification (tier):**
   - WU-3A npm extract: **full-tier** (A1 + A4 + Z3 — architectural restructure; new package surface; substantial novelty)
   - WU-3B Tessera→DS: **full-tier** (A1 + A4 — new integration surface)
   - WU-3C DS→Tessera: **full-tier** (A1 + A4 — new integration surface)

5. **Wave gate criteria:**
   - **WAVE-GATE-09** (after Wave 9 / 3A): per-cluster Reviewer MERGE-READY; verify-wave-aggregate.sh exit 0; CLUSTER-HANDOFF-WAVE10-3A-3B-3C.md emitted documenting npm package contract.
   - **WAVE-GATE-10** (after Wave 10 / 3B + 3C parallel): per-cluster Reviewer MERGE-READY (BOTH clusters); verify-wave-aggregate.sh exit 0; **tier-aware consolidation Reviewer per R50: if any cluster ran solo-tier → MANDATORY; else OPTIONAL.** Both 3B and 3C are full-tier per § 4 above → consolidation Reviewer OPTIONAL per R50; Coordinator decides invoke-or-not based on cross-cluster integration concerns.

6. **CLUSTER-HANDOFF artifact emission** (at WAVE-GATE-09 close):
   - `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B-3C.md` documents npm package interface contract (3A → 3B + 3C consumers) + any shared schema deltas for 3B/3C cross-cluster coordination.

### Tier rationale

**coordinator-tier** — Coordinator-only round. Produces wave plan; cluster dispatch is separate (R61+ per plan).

### Anti-scope (R60 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files.
- NO modification of R42-R59 deliverables.
- NO modification of `CLAUDE-*.md` files.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md`.
- NO modification of `coordination/PRD.md`.
- NO modification of `coordination/SCOPING-MEMO-v0.3.md`.
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO cluster dispatch (R60 produces plan; dispatch R61+).
- NO real-cluster work (Path B).
- NO opening GitHub PRs.

ALLOWED modifications:
- `coordination/WAVE-PLAN-09.md` (NEW — primary deliverable)
- `coordination/COORDINATOR-MEMORIAL.md` (append)
- `coordination/MEMORIAL.md` (Coordinator-section append at round close)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1:** ACTIVE GATE — Coordinator cites PRD lines + DS repo references verbatim with retrieval dates.
- **Rule 2-3, 5, 7:** N/A.
- **Rule 4:** ACTIVE GATE — ALLOWED_SET above.
- **Rule 6:** ACTIVE GATE — if PRD SLICE 3 sub-section is ambiguous on WU boundary, HALT + DIAGNOSTIC.

### Halt conditions

1. **PRD § Phase 3 SLICE 3 sub-section internally inconsistent:** if FR-D1/D2/D3 wording contradicts AC-P8 or SLICE 3 sub-section, HALT + DIAGNOSTIC.
2. **D-test analysis surfaces unexpected serial dependency between 3B and 3C:** Coordinator was instructed to evaluate parallel-fan-out; if D-tests demonstrate genuine serial dependency (e.g., 3C depends on 3B's output beyond shared schema), document the analysis transparently in WAVE-PLAN-09 and pick sequential — but do NOT default-to-sequential without empirical D-test demonstration. HALT + DIAGNOSTIC if Coordinator finds itself defaulting without analysis.
3. **DS repo accessibility:** if DeploySignal repo content cannot be referenced for understanding what 3B + 3C integrate WITH, HALT + DIAGNOSTIC; operator decides defer to a later round.

### Inputs for Coordinator

1. `coordination/PRD.md` § Phase 3 Scope SLICE 3 (FR-D1 + FR-D2 + FR-D3 + AC-P8)
2. `coordination/WAVE-GATE-08.md` (R59 close; forward-flags including PARALLEL-FAN-OUT directive)
3. `coordination/WAVE-PLAN-07.md` + `WAVE-PLAN-06.md` (recent wave plan patterns)
4. `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (recent handoff pattern; R57 emit)
5. `coordination/WAVE-PLAN-02.md` (Phase 2 Wave 2 parallel-cluster precedent: WU-01 + WU-02 + WU-03 in parallel)
6. `coordination/CLUSTER-HANDOFF-2-WU0*-WU05.md` (Phase 2 handoff patterns)
7. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 A17 (DS-integration scope deferral context)
8. `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 3 (DeploySignal integration candidate framing)
9. `CLAUDE-COORDINATOR.md` (DAG construction discipline; D1-D5 tests)
10. `templates/WAVE-PLAN-TEMPLATE.md`

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R60 --coordinator
```

---

## Operator-decision flags (carry-forward; updated post-R59 close)

1. R45 CRITICAL routing.
2. Rule 7 Surface (c) HARD-GATE candidate.
3. Cross-project canonical landings (8+ items deferred).
4. Anchor PR backflog scheduling.
5. **Phase 3 SLICE 1 + SLICE 2 CLOSED; SLICE 3 (DS integration) wave-plan emission IN PROGRESS at R60.**
6. **R60 PARALLEL-FAN-OUT mandate** — Coordinator MUST evaluate Option C for 3B + 3C; default-to-sequential REJECTED without empirical D-test demonstration.
7. Prior-round findings.
