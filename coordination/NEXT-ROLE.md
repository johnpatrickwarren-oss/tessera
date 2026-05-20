CURRENT-ROUND: R56
NEXT-ROLE: ARCHITECT
STATUS: READY
TIER: full

## Round-scope directive (R56 — WU-Phase3-2A Google TPU/ICI adapter; full-tier cluster dispatch)

R56 = first SLICE 2 cluster pipeline round per `coordination/WAVE-PLAN-07.md` (R55 Coordinator wave plan). Single-cluster full-tier round implementing the Google TPU / ICI topology adapter as WAVE-07 (sole WU = WU-Phase3-2A).

**Round-start SHA:** (R55 pipeline emitted but uncommitted; recover via `git rev-parse HEAD` at session entry — should be `fb7585c` post-R54 close, OR R55 Coordinator commit if landed during pipeline).

### Operator decisions (carry-forward; relevant to R56)

- OQ-P3-1 RESOLVED at PRD authoring: Google TPU is SECOND vendor (after AWS Trainium at R53).
- OQ-P3-2 RESOLVED at PRD authoring: NO Google Cloud access; SLICE 2 TPU adapter relies on **public data only** (JAX topology code + TPU v4/v5 architectural papers).
- OQ-P3-9 RESOLVED Path B: WU-Phase3-2C NOT INCLUDED; AC-P6 DEFERRED.
- OQ-Phase3-W2-1 RESOLVED 2026-05-19: Option A (Coordinator default; operator did not override) — single unified file `engine/topology/tpu-source.ts`. Matches Phase 3 SLICE 1 + WU-03/WU-04 + WU-00 single-file precedent.
- OQ-Phase3-W2-2 RESOLVED 2026-05-19: Option B (Coordinator default; operator did not override) — defer SCOPING-MEMO § 2.3 amendments to Phase 3 SLICE-close walk per R32 MAJOR-1 carry-forward pattern.
- Naming convention: globally-sequential WAVE-NN. WU-Phase3-2A = WAVE-07.

### Primary deliverable

Implement WU-Phase3-2A Google TPU / ICI adapter per `coordination/WAVE-PLAN-07.md`:

1. **Single unified parser** `engine/topology/tpu-source.ts` — concrete `TopologySource` implementation for Google TPU pods (v4/v5 ICI topology). Architect designs the input format (likely JSON-structured topology manifest derived from JAX-style topology descriptor; Cloud TPU Resource Manager API analog NOT used since OQ-P3-2 = no Google Cloud access; public-data-only).
2. **Synthetic fixtures** at `test/_substrate/tpu-fixture-*.json` (Tessera-original) covering:
   - TPU v4 4x4 chip slice (16 chips; ICI mesh topology per JAX/TPU paper convention)
   - TPU v5 ring topology
   - Sparse/partial topology graceful handling
3. **Schema extensions** to `engine/types/verdict.ts` (vendored-with-deltas; VENDORING-MANIFEST.md refresh):
   - `TopologyEdge.relationship` += `'tpu_ici_peer'`
   - `TopologyNode.kind` += `'tpu_shard'`
4. **Test file** `test/q56-tpu-adapter.test.ts` covering:
   - Well-formed TPU fixture → expected `TopologySnapshot` structure
   - Edge-relationship literal correctness (`'tpu_ici_peer'` only)
   - Node-kind literal correctness (`'tpu_shard'`)
   - `TopologySource` interface conformance
   - Sparse-data graceful degradation
   - A16 `correlational_not_causal: true` invariant preserved
   - Phase 1+2 ACs (AC-P1 through AC-P4) hold unchanged + AC-P7 cross-cutting (full Tessera fleet works with TPU adapter activated for synthetic TPU fleet)
5. **Q-R56-EMPIRICAL.sh execution** at chore-A pre-commit (Rule 1 sub-class self-application per R46/R51).

### Tier rationale

**full-tier** — Architect (spec authoring) + Implementer (production code + tests + chore-A) + Reviewer (cold-eye) + Memorial-Updater (close). Per WAVE-PLAN-07: A1 (Google TPU vendor dependency; public-docs-based) + A2 (first TPU pattern; second vendor after Neuron at R53) + A4 (schema extensions) + A7 (parallel-class with WU-01/02/03/Neuron).

### Anti-scope (R56 hard limits)

- NO real-cluster access required or attempted (Path B; OQ-P3-2 no Google Cloud).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (OQ-Phase3-W2-2 Option B deferral).
- NO modification of `coordination/PRD.md`.
- NO modification of R42-R55 deliverables (frozen historical baseline). Specifically: no modification of R53 Neuron adapter, R54 WAVE-GATE-06, R55 WAVE-PLAN-07.
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `scripts/*` or `run-pipeline.sh`.
- NO modification of `CLAUDE-*.md` REINFORCEMENTS sections (R51 consolidation + threshold-aware rule preserved).
- NO WU-Phase3-2B work (live-fetch interface; that's R58 after WAVE-GATE-07 close).
- NO Phase 3 SLICE 3 work.
- NO real customer telemetry (A8/A11 inherited).
- NO hardware-diagnostic territory (A10 inherited).
- NO opening any GitHub PRs.

ALLOWED modifications:
- `engine/topology/tpu-source.ts` (NEW)
- `engine/types/verdict.ts` (MOD - additive enum extensions for TPU)
- `test/q56-tpu-adapter.test.ts` (NEW)
- `test/_substrate/tpu-fixture-*.json` (NEW; synthetic ICI topology fixtures)
- `coordination/VENDORING-MANIFEST.md` (MOD if vendored-file deltas added)
- `coordination/specs/Q-R56-SPEC.md` + `Q-R56-SPEC-AUDIT.md` + `Q-R56-EMPIRICAL.sh` (NEW)
- `coordination/reviews/REVIEWER-REPORT-R56.md` (Reviewer)
- `coordination/diagnostics/DIAGNOSTIC-R56-*.md` (conditional)
- `coordination/MEMORIAL.md` (appends)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Q-R56-EMPIRICAL.sh applies R47 Tightenings 1-4 + R48 corrections + R49 conventions.
- **Rule 2 (`branch-binding-coverage-gate`):** ACTIVE GATE — Architect spec enumerates TPU parser guards/defaults; Acknowledged-gap section documents unbound branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** ACTIVE GATE — discriminating assertions only (R30 MINOR-1).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — Architect ALLOWED_SET in Q-R56-SPEC.md at spec-emit time.
- **Rule 5 (`rule-derivation-without-self-application`):** N/A — no new rule derived at R56.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if JAX/TPU public-doc format ambiguity surfaces during implementation, HALT + DIAGNOSTIC + ESCALATE.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE per existing surfaces.

### Halt conditions

1. **Q-R56-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **JAX/TPU public docs insufficient for fixture design:** if Architect cannot construct synthetic ICI topology fixtures from public sources, HALT + DIAGNOSTIC + ESCALATE; operator decides defer.
3. **D5 schema conflict regression:** if Architect spec inadvertently sequences TPU + future-SLICE-2B work in ways that introduce D5 write-conflict on `engine/types/verdict.ts`, HALT + DIAGNOSTIC.
4. **Phase 1/2 ACs regress:** if test baseline changes AC-P1 through AC-P4 properties, HALT + DIAGNOSTIC per AC-P7 cross-cutting.
5. **Test baseline drift other than R56-additions:** Architect specifies expected delta in Q-R56-SPEC.md (likely 374 + ~13 = ~387 tests; mirrors R53 delta). Unexpected shift → HALT + DIAGNOSTIC.

### Inputs for Architect

1. `coordination/WAVE-PLAN-07.md` — R55 Coordinator wave plan; READ FIRST
2. `coordination/PRD.md` § Phase 3 Scope SLICE 2 (FR-V2 + AC-P5 cross-cutting)
3. `coordination/WAVE-GATE-06.md` — SLICE 1 close (forward-flags for SLICE 2)
4. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility (TPU adapter row)
5. `engine/topology-overlay.ts` — inherited BFS layer
6. `engine/types/verdict.ts` — schema target
7. `engine/topology/neuron-source.ts` (R53) — parallel-class pattern reference (Neuron precedent for TPU)
8. `engine/topology/slurm-source.ts` + `k8s-source.ts` + `nvlink-source.ts` — additional parallel-class precedents
9. `coordination/specs/Q-R53-SPEC.md` + `Q-R53-SPEC-AUDIT.md` + `Q-R53-EMPIRICAL.sh` — most-recent vendor adapter spec triad pattern
10. JAX public source code + TPU v4/v5 architectural papers (Architect reads + cites URLs)
11. `coordination/COORDINATOR-MEMORIAL.md` — R55 entries

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R56 --tier full
```

---

## Operator-decision flags (post-R55 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances).
3. Cross-project canonical landings (8+ items deferred).
4. Anchor PR backflog scheduling.
5. **Phase 3 SLICE 1 CLOSED at R54 WAVE-GATE-06; SLICE 2 wave plan emitted at R55 WAVE-PLAN-07; SLICE 2 Wave 7 cluster dispatch IN PROGRESS at R56 (this round).**
6. R49/R50/R53 prior-round findings — candidates for future rounds.
7. OQ-Phase3-W2-1 RESOLVED Option A (single tpu-source.ts).
8. OQ-Phase3-W2-2 RESOLVED Option B (defer SCOPING-MEMO § 2.3 amendments).
