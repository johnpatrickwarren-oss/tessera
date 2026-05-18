CURRENT-ROUND: R24
NEXT-ROLE: OPERATOR (wave-plan review)
STATUS: WAVE-PLAN-READY

## Round-scope directive (R24 — Coordinator emission complete)

**R24 Coordinator invocation complete.** Wave plan emitted at `coordination/WAVE-PLAN-01.md` decomposing remaining Phase 2 work (post-R23) into 7 work units across 4 waves. Wave 1 is a recommended **4-cluster fan-out** (3 ingestion adapters + 1 MD-F4 empirical validation cluster); Waves 2/3/4 are single-cluster (SLICE 3 close-walk → SLICE 4 → Phase 2 close-walk).

## Inputs for next role (Operator — wave-plan review)

**Primary review artifact:**
1. **`coordination/WAVE-PLAN-01.md`** — full DAG + wave sequencing + tier classifications + 6 open questions

**Supporting artifacts:**
2. **`coordination/COORDINATOR-MEMORIAL.md`** (NEW) — first Coordinator memorial; pre-Wave-1 confirmations + cross-project pattern watch-list
3. **`coordination/PRD.md`** + **`coordination/SCOPING-MEMO-v0.3.md`** § 2.3 + § 3 (source of WU decomposition)
4. **`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`** § 3 (SLICE 3 entry framing the Coordinator decomposed against)

## Coordinator's headline finding

**Wave 1 fan-out is recommended (4 parallel clusters).** D1/D2/D5 dependency tests fire zero edges between WU-01/02/03/04. D4 file-tree contention is resolvable via parallel-class architecture (see OQ-W1-1 — load-bearing operator decision).

## Open questions (operator gates before Wave 1 dispatch)

**Blocking (Wave 1 cannot dispatch until answered):**

- **OQ-W1-1** — Adapter file-layout convention. Option A: Coordinator pre-declares parallel-class (recommended; mirrors `engine/topology-overlay.ts:83-160`). Option B: defer to cluster Architects (latent drift risk; mitigation in WU-05 close-walk).

**Non-blocking (defaults apply if no answer):**

- **OQ-W1-2** — WU-07 (Phase 2 close-walk) tier classification: audit (default; close-walk pattern) vs full (treats Hybrid Reviewer pair-review as architecturally novel).
- **OQ-W1-3** — SLICE 4 decomposition timing: defer to follow-up Coordinator invocation post-WU-05 (recommended) vs pre-decompose now (violates Step 1 discipline).

**Forward-looking (may surface mid-Wave-1):**

- **OQ-W1-6** — LS-4 sparse-topology degradation: WU-04 cluster Architect may need inherited BFS body modification at `engine/topology-overlay.ts`. If load-bearing, escalates to Coordinator wave-plan-v2 emission.

**Carry-forward (still parked; not blocking):**

- **OQ-W1-4** — OQ-1 (Q-JC1) `tools/calibrate.ts` vendoring (parked from Phase 1 close-walk)
- **OQ-W1-5** — OQ-R08-3 Phase 2 transient detector scheduling (parked)

## Operator action items

1. Read `coordination/WAVE-PLAN-01.md` in full (Plan summary → Steps 1-6 → Open questions → Wave 1 dispatch authorization).
2. **Answer OQ-W1-1** (mandatory before Wave 1 dispatch). OQ-W1-2 and OQ-W1-3 are non-blocking; Coordinator defaults apply otherwise.
3. (Optional) Author per-cluster scope blocks at `coordination/cluster-scopes/wave-1/wu-01-slurm-adapter.md`, `wu-02-k8s-adapter.md`, `wu-03-nvlink-adapter.md`, `wu-04-md-f4-common-mode.md` per `coordination/cluster-scopes/README.md` layout. Coordinator did NOT author these in R24 — they were not enumerated in the R24 expected deliverables list. Operator may author directly OR re-invoke Coordinator for a focused scope-block-authoring pass.
4. Wave 1 dispatch (after OQ-W1-1 is answered + scope blocks exist):
   - 4 invocations of `scripts/multi-track-cluster-setup.sh` (one per cluster) with the `--scope <PATH>` flag pointing at each cluster-scope file.
   - Inside each cluster worktree, run `scripts/run-pipeline.sh --tier full`.
5. After all four Wave 1 clusters reach MERGE-READY: re-invoke Coordinator for Wave 1 gate (merges per-cluster MEMORIAL fragments, writes `coordination/WAVE-GATE-01.md`, authorizes Wave 2).

## Tier (R24 Coordinator-mode invocation)

N/A — Coordinator ran solo (no Architect/Implementer/Reviewer for the wave-plan emission itself). Each Wave 1 cluster carries its own tier classification per WAVE-PLAN-01.md Step 6.

## Authority

Operator authorized "let's move forward with slice 3" + MR-1 vendoring authorization. MR-1 closed structurally at HEAD `7890b36`; this R24 invocation was the first Coordinator dispatch and emitted WAVE-PLAN-01.md cleanly (zero halt conditions; zero violations; OQs surfaced rather than auto-resolved per role boundary).

## State at R24 close

| Element | State |
|---|---|
| MR-1 methodology vendoring | ✅ HEAD `7890b36` |
| R24 Coordinator invocation | ✅ WAVE-PLAN-01.md emitted; COORDINATOR-MEMORIAL.md initialized |
| Phase 2 SLICE 3.A scaffold | ✅ HEAD `f8dde4b` (R23 MERGE-READY) |
| Wave plan version | v1 (initial decomposition) |
| WUs decomposed | 7 (WU-01 through WU-07) |
| Waves planned | 4 (Wave 1: 4-cluster fan-out; Waves 2/3/4: single-cluster) |
| Open questions surfaced | 3 new (OQ-W1-1/2/3); 1 forward-looking (OQ-W1-6); 2 carry-forward (OQ-W1-4/5) |
| HEAD at R24 close | (pending commit_coordinator_outputs hook) |

## Routing notes

- No overnight authority active. Operator returns; reviews wave plan; answers OQ-W1-1; dispatches Wave 1 (multi-track) or re-invokes Coordinator for scope-block authoring first.
- Coordinator's recommendations are recommendations; operator's choice governs.
- If operator selects OQ-W1-1 Option A (parallel-class — recommended): standard 4-cluster fan-out dispatch.
- If operator selects OQ-W1-1 Option B (defer to cluster Architects): Wave 1 still 4-cluster fan-out, but WU-05 close-walk scope expands to include convention-drift audit.
- If operator deems the entire plan infeasible (e.g., wants different decomposition or different fan-out judgment): re-invoke Coordinator with operator-supplied directive amendment; Coordinator emits WAVE-PLAN-02.md.

## Auto-commit

`commit_coordinator_outputs` hook (added at MR-1B) commits coordinator artifacts (WAVE-PLAN-01.md, COORDINATOR-MEMORIAL.md, NEXT-ROLE.md) on clean completion.
