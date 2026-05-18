CURRENT-ROUND: R24
NEXT-ROLE: OPERATOR (wave-plan-v2 review)
STATUS: WAVE-PLAN-READY

## Round-scope directive (R24 — operator review of WAVE-PLAN-02)

**R24 Coordinator re-invocation emitted WAVE-PLAN-02.md** (clean; 2-cluster Wave 1 fan-out + 3-cluster Wave 2 fan-out; 5 waves total). WAVE-PLAN-01.md preserved on disk per Coordinator versioning discipline.

**Plan shape (v2):**

| Wave | Cluster count | Work units | Tier (Coordinator prior) |
|---|---|---|---|
| 1 | 2 (parallel) | WU-00 L0-CONTRACT (NEW; SLICE 3.B foundation) + WU-04 MD-F4 + PR-F6 | full + full |
| 2 | 3 (parallel) | WU-01 SLURM + WU-02 K8S + WU-03 NVLINK adapters | full + full + full |
| 3 | 1 | WU-05 SLICE 3 close-walk | audit |
| 4 | 1 | WU-06 SLICE 4 event-conditional attribution | full |
| 5 | 1 | WU-07 Phase 2 close-walk | audit (OQ-W1-2 carry-forward) |

**What changed v1 → v2:**

1. **NEW WU-00 L0-CONTRACT** (full-tier; SLICE 3.B foundation per SCOPING-MEMO MR-1 amendment Extension 3 (b) + § 3 SLICE 3.A.5 row + § 4.2 R-E7 row).
2. **D1/D2 edges added** from WU-00 to adapters (asymmetric: D1 HIGH → NVLINK; D2 MEDIUM → SLURM/K8S per Step 3 Judgment call 1).
3. **Wave 1 re-shaped** from v1's 4-cluster (adapters + MD-F4) to v2's 2-cluster (WU-00 + MD-F4). MD-F4 placement in Wave 1 (not Wave 2 with adapters) per Step 3 Judgment call 2 — preserves operator fan-out preference + lands PR-F6 evidence parallel to L0-contract.
4. **Wave 2 introduced** as 3-cluster adapter fan-out (was v1's Wave 1).
5. **Total waves grew from 4 → 5** (cost of L0-contract precondition; surfaced honestly in plan summary).

## Operator review action items (in dispatch-order priority)

**BLOCKING for Wave 1 dispatch:**

1. **Answer OQ-W2-1** (L0-contract module location) — Coordinator default A applies if no answer. Options:
   - **A (Recommended):** `engine/l0/counter-rate-transform.ts` — matches existing `engine/l0/schema-continuity.ts` neighbor convention.
   - **B:** `engine/l0/contract.ts` — closer to "L0 contract" terminology in SCOPING-MEMO.
   - **C:** `engine/l0/transform/index.ts` + subdirectory — anticipates per-source transforms.

**NOT BLOCKING for Wave 1; defer until Wave 1 → 2 gate:**

2. **Answer OQ-W1-1** (adapter file-layout convention; carry-forward from v1) — Coordinator default A (parallel-class) applies if no answer.

**NOT BLOCKING; defaults sufficient:**

3. **OQ-W1-2** (WU-07 tier classification) — default audit.
4. **OQ-W1-3** (SLICE 4 decomposition timing) — default: defer to follow-up Coordinator invocation after WU-05.
5. **OQ-W1-4 / OQ-W1-5** (carry-forward parked items: calibrate.ts vendoring; Phase 2 transient detector scheduling) — orthogonal.
6. **OQ-W1-6** (forward-looking: WU-04 LS-4 sparse-topology) — surfaces during WU-04 cluster; operator should expect potential mid-Wave-1 escalation.

## Wave 1 dispatch protocol (post-OQ-W2-1)

Per WAVE-PLAN-02.md § Wave 1 dispatch authorization:

1. (Recommended) Author per-cluster scope blocks at `coordination/cluster-scopes/wave-1/wu-00-l0-contract.md` and `coordination/cluster-scopes/wave-1/wu-04-md-f4-common-mode.md`.
2. Invoke `scripts/multi-track-cluster-setup.sh` once per Wave-1 cluster (2 invocations: branch `r24-l0-contract`, branch `r24-md-f4-common-mode`).
3. Cd into each worktree; run `scripts/run-pipeline.sh --tier full` (2 pipeline runs; can be staggered or simultaneous).

## Inputs for operator review

Read in order:

1. **`coordination/WAVE-PLAN-02.md`** — current wave plan (this round's primary Coordinator deliverable).
2. **`coordination/WAVE-PLAN-01.md`** — v1 for diff reference; what changed is documented in v2's version-history table.
3. **`coordination/COORDINATOR-MEMORIAL.md`** — Coordinator-level CONFIRMATION/VIOLATION entries for this re-invocation (appended; not overwritten).
4. **`coordination/SCOPING-MEMO-v0.3.md`** §§ 2.3 (Extension 3 (b) MR-1 amendment block lines 219-228, 254-256), 3 (SLICE 3.A.5 row line 364), 4.2 (R-E7 row line 416) — the amendment surface that drove v2.

## Anti-scope (Coordinator hard limits — observed)

- ✅ No engine/* modification (Coordinator emitted no code).
- ✅ No test/* modification.
- ✅ No drafting of cluster-level specs (per-cluster Architect's job post-dispatch).
- ✅ No modification of NEXT-ROLE.md in cluster worktrees (none exist yet).
- ✅ No pre-resolution of OQs by Coordinator assumption — OQ-W2-1 surfaced to operator; OQ-W1-1 through OQ-W1-6 carried forward.
- ✅ No invention of WUs not traceable to PRD/SCOPING-MEMO — WU-00 traces to MR-1 amendment surface.

Auto-commit via `commit_coordinator_outputs` hook on clean completion.

## Escalation items

(none active; all OQs are operator-decidable rather than blocking escalations)

## Routing notes

- WAVE-PLAN-02.md is READY-TO-DISPATCH conditional on OQ-W2-1 (with Coordinator default A available if operator defers).
- If operator accepts the plan as-is: proceed to Wave 1 dispatch protocol above.
- If operator surfaces architectural concerns about the plan: Coordinator re-invocation produces WAVE-PLAN-03.md.
- If operator wants to merge WU-00 into WU-03 (NVLINK) cluster (collapsing the L0-contract into NVLINK's spec): that's a v3 amendment requiring re-invocation; do not collapse silently — the Coordinator placed WU-00 as a separate WU because the operator-amended SCOPING-MEMO carved it as a SLICE 3.A.5 row distinct from SLICE 3.B.

## State at v2 emission

| Element | State |
|---|---|
| MR-1 methodology vendoring | ✅ HEAD `7890b36` |
| SCOPING-MEMO MR-1 amendment (L0 contract) | ✅ HEAD `4a4869e` |
| R23 SLICE 3.A scaffold | ✅ HEAD `f8dde4b` |
| R24 Coordinator first invocation (WAVE-PLAN-01) | ✅ HEAD `ffdba44` |
| R24 Coordinator re-invocation NEXT-ROLE refresh | ✅ HEAD `65ddb8a` |
| R24 Coordinator WAVE-PLAN-02 emit | ✅ (pending current commit) |
| 0-CRITICAL streak | 22 rounds (R02-R23) |
| 0-MAJOR streak | 4 rounds (R20-R23) |
| Working tree | will be clean after this commit |
| Test count | 217 / 0 |
