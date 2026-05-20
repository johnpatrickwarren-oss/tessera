CURRENT-ROUND: R58
NEXT-ROLE: ARCHITECT
STATUS: READY
TIER: full

## Round-scope directive (R58 — WU-Phase3-2B live-cluster topology fetch INTERFACE; full-tier cluster dispatch)

R58 = second SLICE 2 cluster pipeline round per `coordination/WAVE-PLAN-07.md` (Wave 8). WU-Phase3-2B: `TopologySource.fetchSnapshot(ctx?)` interface extension + sparse-data resilience tests across all 5 adapter sources (Slurm + K8s + NVLink + Neuron + TPU). Per Path B: NO real-cluster validation — interface design + sparse-data resilience tests only.

**Round-start SHA:** `3fe8f76` (chore(R57): WAVE-GATE-07 close + CLUSTER-HANDOFF emit).

### Operator decisions + handoff context

- OQ-P3-9 Path B: NO real-cluster fetch implementation; interface design + sparse-data resilience tests only.
- WAVE-PLAN-07 Option B (split-sequential): WU-2A (R56 ✓) preceded WU-2B (this round) per D1 HIGH dependency.
- CLUSTER-HANDOFF-WAVE07-2A-2B.md (R57; `3fe8f76`): TPU adapter contract documented; R58 inherits stable TpuTopologySource + verdict.ts schema state.
- D5 write-conflict risk LOW per CLUSTER-HANDOFF: R58 does NOT add new enum literals to `engine/types/verdict.ts`; interface extension only (method body additions).

### Primary deliverable

Implement WU-Phase3-2B per WAVE-PLAN-07 Wave 8 + CLUSTER-HANDOFF-WAVE07-2A-2B:

1. **`TopologySource.fetchSnapshot(ctx?)` interface enrichment** in `engine/topology-overlay.ts` (or wherever the interface is declared):
   - Add `ctx?: TopologyFetchContext` parameter shape (with `authToken?: string`; `apiEndpoint?: string`; `timeoutMs?: number`; type-only — no enum extensions).
   - Document semantics: ctx parameter enables future real-cluster-fetch (deferred per Path B); current implementation falls back to constructor-provided fixture if ctx is undefined.

2. **Per-adapter `fetchSnapshot(ctx?)` implementations** — 5 files modified:
   - `engine/topology/slurm-source.ts` — currently parses `topology.conf` from constructor; extend to accept ctx; if ctx undefined or ctx.apiEndpoint undefined → fall back to constructor fixture; sparse-data resilience: handle partial `topology.conf` gracefully.
   - `engine/topology/k8s-source.ts` — same pattern; sparse-data resilience: handle partial K8s nodelist.
   - `engine/topology/nvlink-source.ts` — same pattern; sparse-data resilience: handle sparse NVLink connectivity.
   - `engine/topology/neuron-source.ts` (R53) — same pattern; sparse-data resilience: handle empty `connected_to` arrays (already partly tested).
   - `engine/topology/tpu-source.ts` (R56) — same pattern; sparse-data resilience: handle sparse subcube.

3. **Synthetic partial-topology fixtures** for sparse-data resilience (where missing):
   - Re-use existing sparse fixtures where present (R26/R53/R56 already shipped sparse fixtures for K8s, Neuron, TPU)
   - Add sparse fixtures for adapters missing them (likely Slurm + NVLink need new sparse-data fixtures)

4. **Test file** `test/q58-live-fetch-interface.test.ts` covering:
   - Each adapter implements `fetchSnapshot(ctx?)` signature correctly
   - ctx-undefined falls back to constructor fixture (existing behavior preserved)
   - ctx-provided-but-apiEndpoint-undefined falls back to constructor fixture (Path B; no real-cluster fetch attempted)
   - Sparse-data resilience: each adapter handles partial topology gracefully (no throws on missing fields)
   - Interface conformance across all 5 sources (parametrized test)
   - Phase 1+2 ACs (AC-P1 through AC-P4) hold unchanged + AC-P7 cross-cutting

5. **Q-R58-EMPIRICAL.sh** at chore-A pre-commit (Rule 1 sub-class).

### Tier rationale

**full-tier** — Architect (cross-cutting spec; 5-source interface change) + Implementer + Reviewer + MU. Per WAVE-PLAN-07: A4 (schema-class interface change; cross-cutting impact) + A7 (5 sources modified atomically).

### Anti-scope (R58 hard limits)

- NO real-cluster fetch implementation (Path B; only ctx parameter design + sparse-data resilience tests against synthetic fixtures).
- NO modification of `engine/types/verdict.ts` (no new enum literals; D5 risk LOW per CLUSTER-HANDOFF; only interface in `engine/topology-overlay.ts` if that's where TopologySource lives).
- NO modification of R42-R57 deliverables EXCEPT the 5 adapter source files (which need interface method body additions per the contract; this is the intended R58 scope).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md`.
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO modification of `CLAUDE-*.md` REINFORCEMENTS sections.
- NO modification of R57 wave-gate-07 / CLUSTER-HANDOFF-WAVE07-2A-2B (frozen).
- NO Phase 3 SLICE 3 work (DS integration).
- NO opening GitHub PRs.

ALLOWED modifications:
- `engine/topology-overlay.ts` (MOD - TopologySource interface enrichment; ctx parameter)
- `engine/topology/slurm-source.ts` (MOD - fetchSnapshot(ctx?) implementation)
- `engine/topology/k8s-source.ts` (MOD - same)
- `engine/topology/nvlink-source.ts` (MOD - same)
- `engine/topology/neuron-source.ts` (MOD - same)
- `engine/topology/tpu-source.ts` (MOD - same)
- `test/q58-live-fetch-interface.test.ts` (NEW)
- `test/_substrate/*-sparse-*.{conf,json,txt}` (NEW conditional — only for adapters lacking sparse fixtures)
- `coordination/VENDORING-MANIFEST.md` (MOD if any vendored file deltas)
- `coordination/specs/Q-R58-SPEC.md` + `Q-R58-SPEC-AUDIT.md` + `Q-R58-EMPIRICAL.sh` (NEW)
- `coordination/reviews/REVIEWER-REPORT-R58.md` (Reviewer)
- `coordination/diagnostics/DIAGNOSTIC-R58-*.md` (conditional)
- `coordination/MEMORIAL.md` (appends)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1:** Q-R58-EMPIRICAL.sh applies R47-R51 Tightenings.
- **Rule 2:** ACTIVE GATE — Architect enumerates ctx-undefined / ctx-partial / ctx-full branch guards; Acknowledged-gap section documents.
- **Rule 3:** ACTIVE GATE — discriminating assertions per R30 MINOR-1.
- **Rule 4:** ACTIVE GATE — ALLOWED_SET above.
- **Rule 5:** N/A.
- **Rule 6:** ACTIVE GATE — if ctx parameter design surfaces real-cluster-fetch dependency that breaks Path B anti-scope, HALT + DIAGNOSTIC.
- **Rule 7:** ACTIVE GATE per existing surfaces.

### Halt conditions

1. **Q-R58-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **Cross-cutting interface change breaks Phase 1/2 ACs:** if any of AC-P1 through AC-P4 regresses due to interface enrichment, HALT + DIAGNOSTIC per AC-P7 cross-cutting.
3. **Sparse-data resilience requirement surfaces dependency on real-cluster behavior:** if a sparse-data test needs ground-truth from a real cluster to validate, HALT + DIAGNOSTIC; Path B deferral.
4. **D5 conflict regression on verdict.ts:** if Architect spec inadvertently requires new enum literals, HALT + DIAGNOSTIC per CLUSTER-HANDOFF anti-scope.
5. **Test baseline drift other than R58-additions:** Architect specifies expected delta in Q-R58-SPEC.md. Unexpected shift → HALT + DIAGNOSTIC.

### Inputs for Architect

1. `coordination/WAVE-PLAN-07.md` — Wave 8 section
2. `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` — TPU adapter contract (READ FIRST for R58 starting context)
3. `coordination/WAVE-GATE-07.md` — Wave 7 close + forward-flags
4. `coordination/PRD.md` § Phase 3 Scope SLICE 2 (FR-V4 + AC-P5)
5. `engine/topology-overlay.ts` — TopologySource interface declaration
6. `engine/topology/slurm-source.ts`, `k8s-source.ts`, `nvlink-source.ts`, `neuron-source.ts`, `tpu-source.ts` — 5 files to extend
7. `coordination/specs/Q-R53-SPEC.md` + `Q-R56-SPEC.md` — recent spec triad patterns

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R58 --tier full
```

---

## Operator-decision flags (carry-forward post-R57)

1. R45 CRITICAL routing (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate.
3. Cross-project canonical landings (8+ items deferred).
4. Anchor PR backflog scheduling.
5. **Phase 3 SLICE 2 Wave 7 (TPU) CLOSED at R57 WAVE-GATE-07; Wave 8 (live-fetch interface) IN PROGRESS at R58.**
6. Prior-round findings (R49/R50/R53/R56).
