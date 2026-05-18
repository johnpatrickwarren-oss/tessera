CURRENT-ROUND: R24
NEXT-ROLE: COORDINATOR
STATUS: READY

## Round-scope directive (R24 — Coordinator re-invocation for WAVE-PLAN-02)

**R24 Coordinator first invocation emitted WAVE-PLAN-01.md** (clean; 4-cluster Wave 1 fan-out recommended; ready conditional on OQ-W1-1). Operator-raised architectural concern same session about L0 counter-semantic preprocessing (DCGM-class cumulative counters → TrendBuffer artifact-firing); SCOPING-MEMO-v0.3 amended at HEAD `4a4869e` (MR-1 amendment block) carving out L0 preprocessing from A10 anti-scope and adding a new "L0 contract for Tessera" sub-extension + new Q-cycle row "Phase 2 SLICE 3.A.5 — L0 contract" + new R-E7 risk row.

**This re-invocation produces WAVE-PLAN-02.md** incorporating the new L0-contract WU. WAVE-PLAN-01.md remains on disk as v1 (do not delete — Coordinator versioning discipline per CLAUDE-COORDINATOR.md).

The expected effect on the wave plan:
- **New WU added: L0-CONTRACT** (Tessera L0 ingestion contract; counter→rate transformation policy + invariants downstream consumers can rely on)
- **D1 edge fires:** `L0-CONTRACT → WU-01/02/03 (Slurm/K8s/NVLink adapters)` — adapters consume the L0 contract surface by interface; the contract must exist before adapters can be built against it
- **Wave 1 likely re-sequences:** L0-CONTRACT becomes Wave 1 foundation (single cluster); the 3 adapters + MD-F4 validation drop to Wave 2 (4-cluster fan-out preserved)
- **OR alternative wave shape:** L0-CONTRACT runs in parallel with MD-F4 (which doesn't depend on adapter ingestion); 2-cluster Wave 1, 3-cluster Wave 2 (adapters fan-out). Coordinator decides per DAG.
- **Tier classification:** L0-CONTRACT is full-tier per A1 (new dependency on counter-semantic metadata flow) + A2 (new architectural pattern — first L0 contract in Tessera's tree) + A4 (novel data model for `slope_quality` / `missed_scrape_inferred` / `wraparound_handled` metadata)

**Operator preference still applies:** prefer fan-out when D1-D5 tests show clean independence; collapse only when dependence is proven.

## Inputs for next role (Coordinator)

**Read in order:**

1. **`CLAUDE-COMMON.md`** + **`CLAUDE-COORDINATOR.md`** — role discipline (loaded as system prompt).
2. **`coordination/PRD.md`** — FR-E3a (R20+R21 ✅), FR-E3b (HardwareTopologySource — SLICE 3.A scaffold ✅, SLICE 3.A.5 + 3.B + 3.C in-flight per amended scope), FR-E3c (SLICE 4 pending), AC-P4.
3. **`coordination/SCOPING-MEMO-v0.3.md`** — **MR-1 AMENDMENT block at § 2.3 A10 + new Extension 3 (b) "L0 contract for Tessera" sub-extension + § 3 new SLICE 3.A.5 row + § 4.2 new R-E7 risk row**. Read the amendment carefully — it changes the work-unit decomposition since R24 first invocation.
4. **`coordination/WAVE-PLAN-01.md`** — your prior emission (v1; still valid as a starting point; v2 incorporates the L0-contract WU + re-sequences). Reference for what changed.
5. **`coordination/COORDINATOR-MEMORIAL.md`** — prior Coordinator memorial (your prior session's entries; append-only).
6. **`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`** § 3 SLICE 3 entry framing.
7. **`coordination/specs/Q-R23-SPEC.md`** + **`coordination/reviews/REVIEWER-REPORT-R23.md`** + **`coordination/logs/ROUND-R23-SUMMARY.md`** — R23 SLICE 3.A scaffold outcome.
8. **`engine/hardware-topology-source.ts`** + **`test/_substrate/v9Y-multi-rack-cluster.ts`** — R23 deliverables.
9. **`engine/topology-overlay.ts`** — inherited interfaces.
10. **`engine/core.ts`** + **`engine/types/metrics.ts`** — TrendBuffer (the consumer the L0 contract serves).
11. **`engine/l0/schema-continuity.ts`** — existing L0 layer (SchemaDescriptor with `semantic_type` classification at line 44 — the metadata is present; the transformation companion is what SLICE 3.A.5 adds).
12. **`templates/WAVE-PLAN-TEMPLATE.md`** — your v2 deliverable scaffold.
13. **`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`** — cross-project rules.

## Updated scope of work units to decompose (post-amendment)

The Coordinator extracts candidate WUs covering at minimum (PRD + amended SCOPING-MEMO references in parentheses):

**Phase 2 SLICE 3 remainder (post-R23):**
- **L0-CONTRACT** — Tessera L0 ingestion contract; counter→rate transformation policy + invariants (rate-domain output; per-sample `actual_elapsed_seconds`; missed-scrape-catchup detection; DCGM 32-bit wrap handling; metadata propagation). NEW per SCOPING-MEMO § 2.3 Extension 3 (b) L0 contract sub-extension + § 3 SLICE 3.A.5 row. Precondition for adapters.
- **SLURM-ADAPTER** — Slurm topology format → TopologySnapshot. Consumes L0 contract by interface.
- **K8S-ADAPTER** — K8s node-label API → TopologySnapshot. Consumes L0 contract by interface.
- **NVLINK-ADAPTER** — NVIDIA NVLink-topology output → TopologySnapshot. Consumes L0 contract by interface. **DCGM 32-bit wrap handling is the spec exemplar here** (NVLink error counters are the primary 32-bit-wrap surface).
- **MD-F4-EMPIRICAL** — MD-F4 / PR-F6 hybrid Reviewer / common-mode failure-injection on v9Y cluster substrate. Does NOT depend on adapters or L0 contract directly (synthetic substrate is value-domain by construction); may run parallel to adapter cluster.
- **SLICE-3-CLOSE-WALK** — audit-tier; aggregates Wave-2 / Wave-3 outputs.

**Phase 2 SLICE 4:**
- **SLICE-4-EVENT-FEED** — event-conditional correlational attribution. (Coordinator may defer decomposition to a follow-up invocation per OQ-W1-3 from prior plan; not blocking.)

**Phase 2 close:**
- **PHASE-2-CLOSE-WALK** — audit-tier; mirrors R19/R22 pattern; hybrid Reviewer per SCOPING-MEMO § 4.4.

## Anti-scope (Coordinator hard limits — unchanged from prior invocation)

- NO modification of engine/* files
- NO modification of test/* files
- NO drafting of cluster-level specs (per-cluster Architect's job post-dispatch)
- NO modifying NEXT-ROLE.md in cluster worktrees
- NO pre-resolving operator OQs by assumption (surface them at end of WAVE-PLAN-02.md)
- NO inventing WUs not traceable to PRD or SCOPING-MEMO

## Expected deliverables

1. **`coordination/WAVE-PLAN-02.md`** (NEW; do NOT overwrite WAVE-PLAN-01.md). Fill all sections of `templates/WAVE-PLAN-TEMPLATE.md`. Document in the version-history table what changed from v1 → v2 (L0-CONTRACT WU added; D1 edges from L0-CONTRACT to adapters; wave re-sequencing).
2. **`coordination/COORDINATOR-MEMORIAL.md`** append (do NOT overwrite). New CONFIRMATION/VIOLATION entries for the re-invocation + cross-project rule (if any).
3. **`coordination/NEXT-ROLE.md`** update at end:
   - `NEXT-ROLE: OPERATOR (wave-plan-v2 review)`
   - `STATUS: WAVE-PLAN-READY`
   - `Inputs: coordination/WAVE-PLAN-02.md`

Auto-commit via `commit_coordinator_outputs` hook on clean completion.

## Escalation items

(none active; the prior plan's OQ-W1-1 / OQ-W1-2 / OQ-W1-3 carry forward unless re-decomposition changes them)

## Routing notes

- Operator authorization for L0-contract scope amendment: "OK to draft and authorized to address the concerns I raised in the best path you can recommend" (2026-05-18 morning).
- The Coordinator's wave-plan-v2 may re-arrange the OQ surface from v1; that's expected (e.g., OQ-W1-1 adapter file-layout convention still applies but at a different wave number).
- If wave-plan-v2 also recommends fan-out (likely, since adapter independence is unchanged), operator follows multi-track dispatch protocol; if foundation+fan-out, operator dispatches L0-CONTRACT first (single cluster) then adapters (fan-out) after the L0-CONTRACT cluster's wave gate.

## State at re-invocation

| Element | State |
|---|---|
| MR-1 methodology vendoring | ✅ HEAD `7890b36` |
| SCOPING-MEMO MR-1 amendment (L0 contract) | ✅ HEAD `4a4869e` |
| R23 SLICE 3.A scaffold | ✅ HEAD `f8dde4b` |
| R24 Coordinator first invocation (WAVE-PLAN-01) | ✅ HEAD `ffdba44` (v1 emitted; v2 in-flight) |
| 0-CRITICAL streak | 22 rounds (R02-R23) |
| 0-MAJOR streak | 4 rounds (R20-R23) |
| Working tree | will be clean after this commit |
| HEAD at re-invocation | (pending current commit) |
| Test count | 217 / 0 |
