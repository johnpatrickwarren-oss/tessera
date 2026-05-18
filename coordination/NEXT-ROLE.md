CURRENT-ROUND: R24
NEXT-ROLE: COORDINATOR
STATUS: READY

## Round-scope directive

**R24 (Coordinator-mode invocation) = first use of vendored Coordinator role for SLICE 3.B and beyond planning.**

This is the test of MR-1 (the methodology round that vendored the Coordinator role + 5 templates + pipeline integration + cluster-scopes scaffold). Operator's intent: use anchor's Coordinator to decide whether SLICE 3.B (HardwareTopologySource ingestion adapters: Slurm + K8s + NVLink) should fan out into parallel clusters or proceed sequentially. Same evaluation applied to SLICE 3.C, SLICE 3 close-walk, SLICE 4, and Phase 2 close.

The Coordinator emits a WAVE-PLAN-01.md decomposing the remaining Phase 2 work. The wave plan MAY legitimately recommend all single-cluster waves — that's a valid outcome meaning the existing single-pipeline mode is the right fit. The Coordinator does NOT force fan-out; it surfaces where fan-out is naturally available per D1-D5 dependency tests and where it isn't.

After the Coordinator emits the plan, operator reviews:
- If plan recommends single-cluster waves → operator runs standard `./run-pipeline.sh --round R24 --tier full` for SLICE 3.B (or whichever round is up next)
- If plan recommends ≥2 clusters in any wave → operator invokes `scripts/multi-track-cluster-setup.sh` per cluster + dispatches per wave plan

**Tier (Coordinator-mode invocation):** N/A — Coordinator runs solo (no Architect/Implementer/Reviewer for the wave-plan emission itself). Each cluster the wave plan dispatches will receive its own tier classification per `CLAUDE-COMMON.md` rubric + the Coordinator's prior.

**Authority:** Operator authorized "let's move forward with slice 3" + MR-1 vendoring authorization ("I want anchor to be used to decide whether or not it makes sense to scale out implementers, and if we run into problems with it, to continue to optimize anchor"). MR-1 closed structurally at HEAD `7890b36`; this is the first Coordinator dispatch.

## Inputs for next role (Coordinator)

**Read in order:**

1. **`CLAUDE-COMMON.md`** + **`CLAUDE-COORDINATOR.md`** — your role discipline (loaded as system prompt; for reference if needed).
2. **`coordination/PRD.md`** — FR-E3a (R20+R21 ✅), **FR-E3b (HardwareTopologySource — SLICE 3 in flight, R23 ✅ scaffold)**, **FR-E3c (event-conditional attribution — SLICE 4 pending)**, AC-P4.
3. **`coordination/SCOPING-MEMO-v0.3.md`** — canonical scope; especially:
   - § 2.3 Phase 2 Extension 3 — full scope of FR-E3a/b/c
   - § 3 Q-cycle table — Phase 2 SLICE 3 row (line 346, 3-4 cycles); SLICE 4 row (event-conditional attribution); Phase 2 close
   - § 4.2 R-E3 (synthetic-cluster substrate decouples Phase 2 from real-cluster integration — applies to SLICE 3.B adapters)
4. **`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`** § 3 — explicit SLICE 3 entry framing + open questions (OQ-1, OQ-R08-3, LS-4) + hybrid-Reviewer mandate at SLICE 3 close.
5. **`coordination/specs/Q-R23-SPEC.md`** + **`coordination/reviews/REVIEWER-REPORT-R23.md`** + **`coordination/logs/ROUND-R23-SUMMARY.md`** — R23 SLICE 3.A scaffold outcome (HardwareTopologySource + v9Y fixture + type-union extensions; 0/0/3/3; 217/0 tests).
6. **`engine/hardware-topology-source.ts`** + **`test/_substrate/v9Y-multi-rack-cluster.ts`** — R23 deliverables; the contract surface SLICE 3.B ingestion adapters will consume.
7. **`engine/topology-overlay.ts`** — inherited interfaces (`TopologySource` line 50-55; `StaticTopologySource` line 83-101; `OtelServiceGraphV1` line 111-180; BFS line 257+).
8. **`templates/WAVE-PLAN-TEMPLATE.md`** — your primary deliverable scaffold. Fill EVERY section.
9. **`templates/README.md`** — Tessera-local path-reference adaptation table.
10. **`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`** — cross-project rules; apply "Reinforcement rules derived" sections.

## Scope of work units to decompose

The Coordinator should extract candidate work units from the PRD/SCOPING-MEMO covering at minimum:

**Remaining Phase 2 work (post-R23):**
- **SLICE 3.B (ingestion adapters)** — three candidate WUs:
  - SLURM-ADAPTER: parse Slurm topology format → TopologySnapshot
  - K8S-ADAPTER: parse K8s node-label API → TopologySnapshot
  - NVLINK-ADAPTER: parse NVIDIA NVLink-topology output → TopologySnapshot
- **SLICE 3.C (empirical validation)** — likely single WU:
  - MD-F4 / PR-F6 hybrid Reviewer / common-mode failure-injection test on v9Y
- **SLICE 3 close-walk** — single WU (audit tier; mirrors R19/R22 pattern)
- **SLICE 4 (event-conditional attribution)** — TBD work units per FR-E3c; possibly fan-out candidates if event-feed has multiple producer types (firmware/deploy/config)
- **Phase 2 close-walk** — single WU; hybrid Reviewer fires per SCOPING-MEMO § 4.4

**The Coordinator's headline question for the operator:** which of these fan out into parallel clusters, and which are sequential? Each decision must trace to D1-D5 tests.

## Anti-scope (Coordinator hard limits)

- **NO modification of engine/* files** — Coordinator does not write code.
- **NO modification of test/* files** — Coordinator does not write tests.
- **NO drafting of cluster-level specs** — that's the per-cluster Architect's job after dispatch.
- **NO modifying NEXT-ROLE.md in any cluster worktree** — wave plan is the dispatch artifact, not direct NEXT-ROLE.md updates per cluster.
- **NO pre-resolving operator OQs by assumption** — surface as `## Open questions for operator` at end of WAVE-PLAN-01.md.
- **NO inventing work units not traceable to PRD or SCOPING-MEMO** — extraction per CLAUDE-COORDINATOR.md §DAG Step 1.

## Expected deliverables

1. **`coordination/WAVE-PLAN-01.md`** — primary output. Fill all sections of `templates/WAVE-PLAN-TEMPLATE.md`:
   - Plan summary (1-3 sentences; total WUs; total waves; foundations)
   - PRD provenance (PRD source + version + anti-scope referenced)
   - Step 1: deterministic work unit extraction (table with WU IDs, source PRD ref, ACs, anti-scope, file tree scope)
   - Step 2: dependency edge identification (table with D1-D5 test that fired; confidence; reasoning)
   - Step 3: Claude judgment calls (if any; format per template)
   - Step 4: DAG validation checks (cycle / island / foundation)
   - Step 5: wave sequencing (table with wave # / WUs / rationale)
   - Step 6: tier classifications (table with WU / Coordinator tier / matched criteria)
   - Cluster handoff inventory (forward-looking; one row per directed edge)
   - Pre-emit grilling checklist (6 items per template; check all)
   - Open questions for operator (if any)
   - Wave 1 dispatch authorization (READY or HOLD)
2. **`coordination/COORDINATOR-MEMORIAL.md`** (NEW; initialize from `templates/COORDINATOR-MEMORIAL-TEMPLATE.md` since this is first Coordinator invocation in this project).
3. **`coordination/NEXT-ROLE.md`** update at end:
   - `NEXT-ROLE: OPERATOR (wave-plan review)`
   - `STATUS: WAVE-PLAN-READY`
   - `Inputs: coordination/WAVE-PLAN-01.md`

Auto-commit happens via `commit_coordinator_outputs` on clean completion (MR-1B added this hook).

## Escalation items

(none active; all SLICE 2 carry-forwards closed at R22)

## Routing notes

- No overnight authority active. Operator returns after Coordinator emits the wave plan; reviews; decides on cluster fan-out vs sequential R24 execution.
- The Coordinator's decision is a recommendation; operator's choice governs.
- If wave plan recommends single-cluster waves, operator subsequently runs `./run-pipeline.sh --round R24 --tier full` for SLICE 3.B (per the Architect's R23 split decision identifying R24 as the deferred ingestion-adapters round).
- If wave plan recommends ≥2 clusters in Wave 1, operator follows multi-track dispatch protocol per `scripts/multi-track-cluster-setup.sh`.

## State at R24 entry

| Element | State |
|---|---|
| MR-1 methodology vendoring | ✅ HEAD `7890b36` (templates + CLAUDE-COORDINATOR + pipeline + scaffold) |
| R23 SLICE 3.A scaffold | ✅ HEAD `528b5b9` (HardwareTopologySource + v9Y fixture + type-union extensions; 0/0/3/3; 217/0 tests) |
| 0-CRITICAL streak | 22 rounds (R02-R23) |
| 0-MAJOR streak | 4 rounds (R20-R23) |
| Working tree clean | ✅ |
| HEAD | `7890b36` (MR-1C scaffold commit) |
| Test count | 217 / 0 |
| Phase 2 SLICE 3 completion estimate | ~3-4 rounds (R24-R27?) per SCOPING-MEMO § 3 |
