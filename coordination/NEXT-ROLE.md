CURRENT-ROUND: R58
NEXT-ROLE: REVIEWER
STATUS: READY
TIER: full

## Implementer → Reviewer routing block (R58; implementation SHA `3bf33ca`)

**Implementer attestations at GREEN SHA `3bf33ca` (pre-chore-A-coordination):**
- `npx tsc -p tsconfig.test.json` exit = 0 ✓
- `node --test test/*.test.js` = `tests=399 / pass=393 / fail=3 / skipped=3` (chore-A pre-SHA-injection; 3 fails = R36-30 + R36-31 + AC-R58-14 placeholder; pre-documented two-state per § 6.1 carve-out ✓)
- `bash coordination/specs/Q-R58-EMPIRICAL.sh` = 18 PASS / 1 FAIL (AC-R58-13 chore-A two-state FAIL pre-documented; all 18 other ACs PASS ✓)
- `git diff 7e9d399..HEAD --name-only` = 12 paths; all ⊆ 12-entry ALLOWED_SET ✓

**Chore-A coordination SHA:** `7368dcd` (this coordination commit; HEAD at routing time after chore-B).

**Implementer tactical deviations (TACTICAL AUTONOMY clause):**
- TD-1: Spec pseudocode used `{ fetched_at_ts: 1_700_000_000 }` for `SlurmTopologySource`; actual `SlurmTopologySourceOpts` uses camelCase `fetchedAtTs`. Test uses `{ fetchedAtTs: 1_700_000_000 }` per actual interface.
- TD-2: Spec pseudocode `AdapterEntry.snapshotHash: (s: unknown) => string` rejected by tsc (function parameter contravariance). Changed to `snapshotHash(snapshot: TopologySnapshot): string` per actual covariance constraint.
- TD-3: OQ-R58-1 (Approach A vs B): followed Architect-recommended Approach A per spec § 4 — new `engine/topology/fetch-context.ts`. A12 (`engine/topology-overlay.ts`) preserved unmodified.

**Spec-deviance section:** None (all deviations covered by TACTICAL AUTONOMY clause above).

---

## Architect → Implementer routing block (R58; chore-A SHA `a751a76`)

**Inputs for Implementer:**
- `coordination/specs/Q-R58-SPEC.md` (full spec)
- `coordination/specs/Q-R58-SPEC-AUDIT.md` (ceremony sidecar; Reviewer also reads this)
- `coordination/specs/Q-R58-EMPIRICAL.sh` (Rule 1 sub-class verifier)
- `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (TPU contract; READ FIRST for R58 context)
- `coordination/WAVE-PLAN-07.md` Wave 8 section
- `engine/topology-overlay.ts` (TopologySource interface declaration; READ-ONLY)
- `engine/topology/{slurm,k8s,nvlink,neuron,tpu}-source.ts` (5 MOD targets)
- `engine/types/verdict.ts` (READ-ONLY; R56-frozen)

**Architect attestations at chore-A SHA `a751a76`:**
- `git rev-parse HEAD` = `a751a76` (spec-triad commit; verified via Bash at session entry)
- Round-start SHA (anti-scope diff lower bound) = `7e9d399`
- `node --test --test-reporter=tap test/*.test.js` at `7e9d399` = `tests=387 / pass=382 / fail=2 / skipped=3` (verified via Bash at session entry; 2 fails = R36-30 + R36-31 pre-existing carry-forward from R56 close)
- `npx tsc -p tsconfig.test.json` at `7e9d399` = exit 0 (verified via Bash at session entry)
- Spec triad written + committed in dedicated commit `a751a76` BEFORE NEXT-ROLE.md update per R21 ARCH MINOR-1 reinforcement.

**Predicted test counts at chore-A (Implementer's chore-A SHA after RED+GREEN commits):**
- 12 new R58 runtime tests added (AC-R58-1 through AC-R58-11 + AC-R58-14) → baseline + 12 = 399 tests.
- Pre-AC-R58-14-SHA-injection: `399/393/3/3` (3 fails = R36-30 + R36-31 + AC-R58-14 placeholder per R53 MINOR-1 two-state).
- Post-chore-B SHA-injection: `399/394/2/3`.

**Halt-condition carve-out (R56 MINOR-1):** AC-R58-13 block FAILs by construction at chore-A pre-SHA-injection (Q-R58-EMPIRICAL.sh asserts chore-B predicted value). This is NOT a halt trigger. Implementer encodes ACTUAL observed value verbatim per Rule 1 sub-class `empirical-command-attestation`.

**Operator-decision flag — OQ-R58-1 (Architect-recommended Approach A; non-blocking):** Spec § 0.1 PICKED Approach A (NEW Tessera-original `engine/topology/fetch-context.ts`) over Approach B (MOD `engine/topology-overlay.ts` per NEXT-ROLE.md literal directive). Architect rationale: preserves A12 vendored-at-pin discipline; honors WAVE-PLAN-07 line 73 frame-AC (a) "design pattern adapters CAN use without modifying interface." Implementer disposition if not pre-resolved by operator: apply Approach A per spec § 4. If Reviewer flags substantive, route ESCALATE; operator picks A or B. See Q-R58-SPEC.md § 8 OQ-R58-1.

---

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
