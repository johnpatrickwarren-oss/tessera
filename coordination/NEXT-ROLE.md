CURRENT-ROUND: R56
NEXT-ROLE: REVIEWER
STATUS: READY
TIER: full

## Architect attestation (R56 — 2026-05-19)

**Architect (Claude Opus 4.7) routing IMPLEMENTER:**

- **Spec triad committed at SHA `167dcd4`** (commit `spec(R56): Q-R56 Phase 3 SLICE 2 WU-Phase3-2A Google TPU topology adapter`) BEFORE this NEXT-ROLE.md routing block per R21 ARCH MINOR-1 reinforcement.
- **Inputs for IMPLEMENTER:**
  1. `coordination/specs/Q-R56-SPEC.md` (spec proper; 15 ACs; § 4 per-file pseudocode for Implementer mechanical translation)
  2. `coordination/specs/Q-R56-SPEC-AUDIT.md` (Architect ceremony sidecar; Reviewer reads both)
  3. `coordination/specs/Q-R56-EMPIRICAL.sh` (Rule 1 sub-class self-application; chore-A vs chore-B test-count distinction per R53 MINOR-1)
- **Round-start SHA (anti-scope diff baseline):** `4447586` (chore: prepare R56 directive; HEAD at Architect session entry per `git rev-parse HEAD`).
- **Empirical baselines verified at session entry** (NOT inherited from prior-round attestation per R08 + R25 MAJOR-1):
  - `node --test --test-reporter=tap test/*.test.js` → `# tests 374 # pass 369 # fail 2 # skipped 3` (2 fails = R36-30 + R36-31 pre-existing inheritance from Phase 2 close `87e372f`; carry-forward from R53 close)
  - `npx tsc -p tsconfig.test.json; echo "EXIT=$?"` → `EXIT=0` (zero diagnostics; clean tsc surface inherited from R53)
- **Anti-scope ALLOWED_SET (12 entries enumerated at spec-emit time per Rule 4):** see Q-R56-SPEC.md § 3. Conditional 13th entry (`coordination/diagnostics/DIAGNOSTIC-R56-*.md`) IFF a HALT fires.
- **Open questions:** 0 unresolved at routing. OQ-Phase3-W2-1 (file layout single-file) + OQ-Phase3-W2-2 (SCOPING-MEMO amendment timing defer) both dispositioned by operator at R56 directive emission time per NEXT-ROLE.md original lines 17-18.
- **Halt conditions for Implementer** (from Q-R56-SPEC.md § 6): 8 triggers; on any fire → DIAGNOSTIC + STATUS: ESCALATE + 13th ALLOWED_SET entry.
- **TDD discipline (R23 IMPL MINOR-1):** RED commit prefix REQUIRED before combined test+impl commit. AC-R56-15 placeholder `<INJECTED-AT-CHORE-B>` is substituted at chore-B.

The Implementer's chore-A commit picks up this NEXT-ROLE.md routing block + MEMORIAL.md appends below.

---

## Implementer attestation (R56 — 2026-05-19)

**Implementer (Claude Sonnet 4.6) routing REVIEWER:**

### Chore-A attestation

- **Chore-A commit SHA:** `93d3689`
- **Branch:** `main`

**AC-R56-13 (typecheck):** `npx tsc -p tsconfig.test.json` → EXIT=0 (zero diagnostics; R53 clean surface preserved). Source: `Q-R56-EMPIRICAL.sh` AC-R56-13 block PASS actual=0.

**AC-R56-14 (test count — chore-A state):** `node --test --test-reporter=tap test/*.test.js` → `tests=387 / pass=381 / fail=3 / skipped=3`. Actual observed verbatim (NOT reframed). 3 fails = AC-R36-30 (pre-existing R36 forward-protection) + AC-R36-31 (pre-existing R36 forward-protection) + AC-R56-15 (fails by construction: `<INJECTED-AT-CHORE-B>` placeholder SHA not a valid git ref). Per two-state distinction R53 MINOR-1 / AC-R56-14 spec: this is the predicted chore-A state; chore-B SHA injection brings this to 387/382/2/3.

**Q-R56-EMPIRICAL.sh run at chore-A:**
- FILE-1 through FILE-5: PASS (5/5 file-existence checks)
- SCHEMA-1 ('tpu_shard' in verdict.ts): PASS (actual=1 >= 1)
- SCHEMA-2 ('tpu_ici_peer' in verdict.ts): PASS (actual=1 >= 1)
- AC-R56-12 (A16 literal): PASS (actual=2 >= 1)
- AC-R56-13 (tsc exit): PASS (actual=0)
- AC-R56-14 (test count): FAIL — actual=387/381/3/3 vs expected=387/382/2/3 (expected at chore-A per two-state; halt condition § 6.1 #1 does NOT fire — this mismatch is pre-documented)
- AC-R56-15 (anti-scope): ADVISORY PASS
- Summary: 10 PASS, 1 FAIL (the 1 FAIL is the expected chore-A count mismatch)

**Anti-scope diff (AC-R56-15 manual verification at chore-A):**
`git diff 4447586..HEAD --name-only` produces 10 paths (NEXT-ROLE.md + MEMORIAL.md not yet committed at this point; chore-A will bring total to 12). All 10 in ALLOWED_SET:
  - engine/topology/tpu-source.ts ✓
  - engine/types/verdict.ts ✓
  - test/q56-tpu-adapter.test.ts ✓
  - test/_substrate/tpu-fixture-v4-cube.json ✓
  - test/_substrate/tpu-fixture-v5p-cube.json ✓
  - test/_substrate/tpu-fixture-sparse-subcube.json ✓
  - coordination/VENDORING-MANIFEST.md ✓
  - coordination/specs/Q-R56-SPEC.md ✓
  - coordination/specs/Q-R56-SPEC-AUDIT.md ✓
  - coordination/specs/Q-R56-EMPIRICAL.sh ✓
No unexpected paths. After chore-A commit, total = 12 (adds NEXT-ROLE.md + MEMORIAL.md). No halt fires.

**Halt conditions (§ 6):** 0 halts fired. All 8 halt-condition triggers checked — none apply.

**TDD discipline:** RED commit `1d57c23` (test file; imports from non-existent module, all tests fail by construction) → GREEN commit `292bebc` (tpu-source.ts + verdict.ts deltas + 3 fixture files + VENDORING-MANIFEST.md note refresh).

**Tactical deviations from spec pseudocode:** None — implementation matches § 4.1 verbatim. Fixture chip entry peer ordering differs slightly from spec samples (generator emits x+1/x-1/y+1/y-1/z+1/z-1 order; spec samples show an alternate order for chip 1 and chip 5) — this is equivalent since `ici_peers` is treated as a set; the dedup produces 192 undirected edges as confirmed by generator output.

### Inputs for REVIEWER

- Spec: `coordination/specs/Q-R56-SPEC.md` + `coordination/specs/Q-R56-SPEC-AUDIT.md`
- Test file: `test/q56-tpu-adapter.test.ts` (13 runtime ACs; AC-R56-15 will pass after chore-B SHA injection)
- Implementation: `engine/topology/tpu-source.ts`
- Schema deltas: `engine/types/verdict.ts` (lines 254 + 264, additive enum extensions)
- Fixtures: 3 JSON files in `test/_substrate/`
- Manifest note: `coordination/VENDORING-MANIFEST.md` (verdict.ts row note refresh)
- Empirical: `coordination/specs/Q-R56-EMPIRICAL.sh`

### Chore-B attestation

- **Chore-A SHA injected into AC-R56-15 CHORE_A_SHA literal:** `93d3689`
- **Post-chore-B test count (actual verbatim):** `tests=387 / pass=382 / fail=2 / skipped=3`
  - 2 persistent fails = AC-R36-30 + AC-R36-31 (pre-existing R36 forward-protection guards; carry-forward from Phase 2 close)
  - AC-R56-15 NOW PASSES (SHA injection effective; `git diff 4447586..93d3689 --name-only` ⊆ 12-entry ALLOWED_SET confirmed)
- **Chore-B SHA (attested HEAD for Reviewer):** `15d6ae7`

---

## Round-scope directive (R56 — WU-Phase3-2A Google TPU/ICI adapter; full-tier cluster dispatch)

_Preserved verbatim from R56 directive at chore `4447586`; informational for Implementer + Reviewer + Memorial-Updater downstream._

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
