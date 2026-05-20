CURRENT-ROUND: R57
NEXT-ROLE: (operator decision; R58 = WU-Phase3-2B live-fetch interface dispatch)
STATUS: WAVE-COMPLETE
TIER: coordinator-wave-gate

## Round-scope directive (R57 — WAVE-GATE-07 close + CLUSTER-HANDOFF-WAVE07-2A-2B.md emit)

R57 is the WAVE-GATE-07 close for Phase 3 SLICE 2 Wave 7. R56 (`f75f3f9`) closed WU-Phase3-2A Google TPU adapter (MERGE-READY per Reviewer cold-eye 0C/0M/3m/5O). Coordinator-mode wave-gate-close round per pipeline `--coordinator --wave-gate WAVE-07`.

**Round-start SHA:** `f75f3f9` (chore(R56): Memorial-Updater outputs).

### Primary deliverables (two)

1. **`coordination/WAVE-GATE-07.md`** per `templates/WAVE-GATE-TEMPLATE.md`:
   - Wave 7 close attestation (WU-Phase3-2A MERGE-READY per R56 Reviewer)
   - `scripts/verify-wave-aggregate.sh WAVE-07` execution + result
   - Per R50 tier-aware consolidation Reviewer logic: WU-Phase3-2A ran full-tier with cluster-internal Reviewer (3M + 5O audited) → consolidation Reviewer OPTIONAL; Coordinator recommendation: SKIP (single-cluster wave; no cross-cluster integration concerns)
   - Pre-flag forward-flags for Wave 8 work (WU-Phase3-2B live-fetch interface across 5 adapter sources)
   - 0-CRITICAL streak preserved (R02-R56 = 41 consecutive; 42nd at R57 close)

2. **`coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md`** documenting:
   - TPU adapter interface contract: `TpuTopologySource` class signature + `parseTpuTopologyJson()` pure function signature + `'tpu_ici_peer'` + `'tpu_shard'` schema literals
   - Consumption point for WU-Phase3-2B: `fetchSnapshot(ctx)` interface extension across Slurm/K8s/NVLink/Neuron/TPU = 5 adapter sources (TPU just landed at R56; live-fetch interface extends ALL of them at R58)
   - Schema-write-conflict avoidance: WU-Phase3-2B does NOT add new enum literals to verdict.ts (interface extension only; no D5 conflict expected)
   - File reference: `engine/topology/tpu-source.ts` (R56 chore-A `93d3689`)

### Tier rationale

**coordinator-wave-gate** — `--coordinator --wave-gate WAVE-07` mode. Pipeline runs aggregate-verifier + tier-aware-Reviewer-check; Coordinator authors WAVE-GATE-07.md + CLUSTER-HANDOFF-WAVE07-2A-2B.md; STATUS: WAVE-COMPLETE set at round close.

### Anti-scope (R57 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files.
- NO modification of R42-R56 deliverables (frozen historical baseline). Specifically: no modification of R56 TPU adapter, R55 WAVE-PLAN-07, R54 WAVE-GATE-06, R53 Neuron adapter.
- NO modification of `CLAUDE-*.md` files.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `coordination/PRD.md`.
- NO modification of `coordination/SCOPING-MEMO-v0.3.md`.
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO cluster dispatch (R57 produces wave-gate + handoff; dispatch R58+).
- NO Phase 3 SLICE 3 territory.
- NO opening GitHub PRs.

ALLOWED modifications:
- `coordination/WAVE-GATE-07.md` (NEW — primary deliverable 1)
- `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (NEW — primary deliverable 2)
- `coordination/COORDINATOR-MEMORIAL.md` (append)
- `coordination/MEMORIAL.md` (Coordinator-section append)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Coordinator cites R56 Reviewer findings (counts; SHAs; AC PASS counts) via empirical re-derivation. R56 SHA `f75f3f9` and verify-wave-aggregate.sh exit cited from actual command outputs.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — Coordinator stage.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET above (5 files only).
- **Rule 5 (`rule-derivation-without-self-application`):** N/A.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if verify-wave-aggregate.sh exits non-zero for content reasons, HALT + DIAGNOSTIC.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** N/A.

### Halt conditions

1. **`scripts/verify-wave-aggregate.sh WAVE-07` exits non-zero for content reasons:** HALT + DIAGNOSTIC.
2. **R56 Reviewer findings include any CRITICAL on re-read:** Coordinator re-reads REVIEWER-REPORT-R56.md; CRITICAL surfaces → HALT + DIAGNOSTIC + ESCALATE.
3. **WAVE-GATE-07.md OR CLUSTER-HANDOFF emit fails:** HALT + DIAGNOSTIC.

### Inputs for Coordinator

1. `coordination/WAVE-PLAN-07.md` — R55 wave plan
2. `coordination/reviews/REVIEWER-REPORT-R56.md` — R56 Reviewer (15 ACs PASS; 0C/0M/3m/5O)
3. `coordination/MEMORIAL.md` § R56 entries
4. `coordination/specs/Q-R56-SPEC.md` + `Q-R56-SPEC-AUDIT.md` + `Q-R56-EMPIRICAL.sh`
5. `engine/topology/tpu-source.ts` — R56 deliverable; primary input for CLUSTER-HANDOFF contract documentation
6. `engine/types/verdict.ts` — schema state at R56 close (post-`'tpu_ici_peer'` + `'tpu_shard'` additions)
7. `coordination/WAVE-GATE-06.md` — pattern reference (R54 wave-gate-close precedent)
8. `CLAUDE-COORDINATOR.md`
9. `templates/WAVE-GATE-TEMPLATE.md` + `templates/CLUSTER-HANDOFF-TEMPLATE.md`
10. `scripts/verify-wave-aggregate.sh`
11. `coordination/COORDINATOR-MEMORIAL.md` — Coordinator state through R55

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R57 --coordinator --wave-gate WAVE-07
```

---

## Operator-decision flags (carry-forward; updated post-R56 close)

1. R45 CRITICAL routing (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances).
3. Cross-project canonical landings (8+ items deferred).
4. Anchor PR backflog scheduling.
5. **Phase 3 SLICE 2 Wave 7 (TPU adapter) CLOSED at R56; WAVE-GATE-07 close at R57 (this round); Wave 8 dispatch (WU-Phase3-2B live-fetch interface) at R58+.**
6. R49/R50/R53 prior findings.
7. R56 3 MINOR + 5 OBS findings — Memorial-Updater appended; standalone fix-round candidate IF operator chooses.
8. R56 MINOR-2 `self-confirming-test-assertion-specificity` sub-class count incremented to 4 instances per Reviewer note (3 + R56 = 4); R51 MU threshold-aware rule keeps it as composite rollup.
