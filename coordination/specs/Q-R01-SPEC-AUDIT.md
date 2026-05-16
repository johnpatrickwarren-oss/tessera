# Topic 1 — Phase 1 SLICE 1 SPEC AUDIT SIDECAR (v0.2)

_Sidecar to `Q-R01-SPEC.md`. Contains discipline output, decision rationale, and amendment history — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_Reviewer reads BOTH this file and `Q-R01-SPEC.md`. Implementer reads ONLY `Q-R01-SPEC.md` (plus source files)._

---

## Q1.1 — TypeScript build configuration — full rationale

**Picked:** VENDOR DeploySignal tsconfig structure at-pin; adapt path mappings only. (Summarized in spec.)

**Why VENDORED-AT-PIN picked:** DeploySignal's `tsconfig.json` + `tsconfig.browser.json` + `tsconfig.test.json` are already validated for the vendored detector files (5 years of CI runs on the inherited engine). Reusing the structure minimizes Q1 spec-emit risk; path mappings are the only mechanical adjustment.

**Why WRITE-FROM-SCRATCH rejected:** unnecessary novelty; introduces ts-config-drift risk between Tessera and DeploySignal at re-pin time. Tessera benefits from configuration coherence with the inherited engine; deviation only at architecturally-justified points (Q1.5 vendoring-script convention).

## Q1.2 — package.json — full rationale

**Picked:** WRITE Tessera-specific `package.json` with the same dependencies as inherited DeploySignal package.json (node:* primitives only; no runtime deps).

**Why WRITE-FROM-SCRATCH picked:** package name + version + repo URL are project-specific and cannot be vendored at-pin. Per originating-context engine modularity fact ("Pure TypeScript, no native dependencies"), the dependency set is empty at runtime; `devDependencies` minimal (typescript + node:test types).

**Why VENDORED-AT-PIN rejected:** name/repo/version fields would be wrong post-vendoring; mechanical text-substitution at vendor time is more brittle than writing a fresh package.json.

## Q1.3 — signal-classes.ts vendoring — full rationale

**Picked:** VENDOR AT-PIN.

**Why VENDORED-AT-PIN picked:** Tessera Phase 1 SLICE 1 uses inherited signal classes verbatim (raw / standardized / class-mapped per `deploysignal/engine/signal-classes.ts:1-135`); no Tessera-specific signal class additions at SLICE 1. New signal classes (e.g., for hardware-topology-derived signals at Phase 2) deferred to later cycle.

**Why VENDORED-WITH-DELTAS rejected:** premature; no SLICE 1 requirement.

## Q1.4 — Detector test files vendoring — full rationale

**Picked:** VENDOR `test/betting-e-process-class-dispatch.test.ts` + `test/ville-preservation-per-profile.test.ts` AT-PIN as regression baseline; defer full test-suite vendoring.

**Why PARTIAL-VENDOR picked:** these two tests are the load-bearing pair-review-style empirical-validation regressions for Family A Ville-bound preservation (inherited from DeploySignal Q2.A acceptance #8 + REPLY-43b pair-review-concur). Vendoring them gives Tessera a smoke-test surface that detects vendoring-introduced regressions immediately. Full test suite vendoring (138 files) is overkill for SLICE 1; defer to SLICE 2-3 as test-suite-coverage work surfaces.

**Why FULL-VENDOR rejected:** ~14,000 LOC of test files; most exercise DeploySignal-gating-specific scenarios irrelevant to Tessera's per-shard observation scope. Adopting only when needed.

## Q1.5 — Vendoring tool — full rationale

**Picked:** SCRIPTED via `tessera/tools/vendor-from-deploysignal.sh`.

**Why SCRIPTED picked:** ~20 files to vendor at SLICE 1; manual `cp` per file is error-prone for header-prepending and SHA-matching. Script reduces drift risk at re-pinning (Phase 1 close-walk + Phase 2 close-walk). Per v0.3 § 9 re-pinning policy, the script must support idempotent re-vendoring with delta-detection.

**Why MANUAL rejected:** scales poorly to subsequent re-vendoring cycles; encodes header format inconsistently.

---

## Pre-route discipline application

Per anchor `skills/08-architect-six-practices.md` (P3 ten-axis spot-check) + `skills/01-pre-emit-grilling.md` (architect self-grilling) + `skills/14-prd-conjunction-cross-check.md` + `skills/15-prescription-to-AC-coverage.md`.

### P3 ten-axis verification

- **P3.1 concrete-values:** Schema-extension prescriptions use specific identifiers (`'shard_id'`, `'warm_start'`, `per_shard_cells`); no abstract magic numbers. Inherited engine SHA `5a72371` cited specifically and verified.
- **P3.2 coord-trail:** SCOPING-MEMO-v0.3 + PRE-DISPOSITION + PROJECT-CONTEXT.md grepped; no contradicting claims. v0.2 § Anti-scope clauses A1-A17 preserved.
- **P3.3 file-opened (v0.2 amendment — VIOLATION at v0.1; CONFIRMED at v0.2):** At v0.1 spec-drafting time, architect cited inherited `CellDimension` / `CellConfidence` typedefs + `'pod_id'` + `'low'` enum values from MEMORY (not from opening `config.ts`). Reviewer F1 caught the type-state mismatch. **At v0.2 amendment, architect EXPLICITLY opened `deploysignal/engine/types/config.ts` at SHA `5a72371`**: confirmed `CompiledConfig` interface at line 69; `baseline_cells?: BaselineCellsConfig` optional at line 95; `BaselineCellEntry.confidence` inline union `'strict' | 'pooled' | 'aggregate' | 'none'` at line 403 (4 values; NO `'low'`); `BaselineCellsConfig.dimensions` inline union at line 421 (6 values: `'hour_of_day' | 'day_of_week' | 'workload_class' | 'tenant_slice' | 'tenant_tier' | 'region'`; NO `'pod_id'`); no standalone `CellDimension` or `CellConfidence` typedefs exist. Schema-extension surface § Architectural mechanism + § Implementation surface > config.ts rewritten v0.2 to match. Memorial D state delta: 21V/8C → 22V/8C (5th sub-instance of 8th CONFIRMATION class, MD-F6 sub-variant, SECOND occurrence in this session — first was v0.1→v0.2 of SCOPING-MEMO).
- **P3.4 function-bodies:** SLICE 1 is mechanical vendoring; no algorithmic function bodies to scrutinize. Function-body grep applicable at SLICE 2 (runtime per-shard residual population).
- **P3.5 compiled-artifacts:** DeploySignal SHA `5a72371` is verified via `git -C deploysignal rev-parse main`; tessera SHA pin via VENDORING-MANIFEST.md.
- **P3.6 input-pipeline-alignment:** No new input pipeline at SLICE 1 (engine is consumed; not generating new inputs).
- **P3.7 compile-time-precision:** SLICE 1 schema additions don't introduce FP-precision corner cases (type-level extensions only; no runtime arithmetic).
- **P3.8 regime-coverage:** SLICE 1 doesn't introduce regimes (substrate-only); regime sweeps applicable at SLICE 2-4.
- **P3.9 wrapper-vs-algorithm-layer:** SLICE 1 doesn't touch algorithm layer (A12 enforcement via AC-7). Wrapper layer at SLICE 2-3.
- **P3.10 firing-attribution-discipline:** SLICE 1 doesn't have firing semantics; engine fires under inherited semantics. Tessera-side firing attribution at SLICE 3-4.

### Skill 14 PRD-conjunction cross-check (applied at spec-emit per overnight commitment)

The "PRD analog" for SLICE 1 is SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 1 row + § 9 vendoring policy + PRE-DISPOSITION Q-J architect-picks. Per-conjunct cross-check:

| Prescription source | Conjunct | Bound in SLICE 1? |
|---|---|---|
| v0.3 § 3 Phase 1 SLICE 1 | "Vendor engine subset from DeploySignal SHA `5a72371`" | AC-1 + AC-2 + AC-4 |
| v0.3 § 3 Phase 1 SLICE 1 | "detector implementations + Ville-bounded e-process primitives + hierarchical-pooling cell-matrix infrastructure" | AC-1 (detectors) + AC-2 (family types) + AC-4 (core + topology + types) |
| v0.3 § 3 Phase 1 SLICE 1 | "Q70 dispatch-table + self-normalized fallback" | AC-1 (self-normalized-e-process-fallback.ts vendored as part of detectors set) |
| v0.3 § 3 Phase 1 SLICE 1 | "Per-file source-SHA headers (vendoring policy § 9)" | AC-1 + AC-2 + AC-4 (all enforce header) + AC-5 (manifest) |
| v0.3 § 3 Phase 1 SLICE 1 | "Schema additions: `shard_id` cell dimension; `per_shard_cells` compiled-config field; `cell_confidence: warm_start` enum extension" | AC-3 (three conjuncts each bound) |
| v0.3 § 3 Phase 1 SLICE 1 | "Architectural-foundation-only" | SAS-2 through SAS-6 explicit anti-scope (no orchestrator; no fleet-merge logic; no per-shard predicate logic; no hardware topology; no test substrate) |
| v0.3 § 9 vendoring policy | "per-file source-SHA headers" | AC-1 + AC-2 + AC-4 enforce; `q01-vendoring-coverage.test.ts` verifies |
| v0.3 § 9 vendoring policy | "extract target: tessera-engine npm package (Phase 2 close commitment)" | Header format includes extract-target field; AC-1 enforces |
| PRE-DISPOSITION Q-J1 | "hybrid Ville + e-BH" | Out-of-scope for SLICE 1; SLICE 3 + 4 ACs will bind (forward-commitment) |
| PRE-DISPOSITION Q-J2 | "20-sample warm-start" | Out-of-scope for SLICE 1; SLICE 2 ACs will bind |
| PRE-DISPOSITION Q-J3 | "cascade at every layer" | Out-of-scope for SLICE 1; Phase 2 ACs will bind |

**Result: PRD-conjunction-cross-check PASS at SLICE 1 level.** Every v0.3 Phase 1 SLICE 1 conjunct binds to an AC OR is explicitly anti-scope. No undisclosed narrowings.

### Skill 15 prescription-to-AC coverage (applied at spec-emit)

| Prescription | AC binding | Mutation check |
|---|---|---|
| Vendor detector files | AC-1 | Mutating a vendored detector header fails `q01-vendoring-coverage`. |
| Vendor family type files | AC-2 | Same; coverage check expands. |
| Add `shard_id` to CellDimension | AC-3 | Removing `'shard_id'` from union fails type-check on `q01-schema-additions.test.ts` first assertion. |
| Add `warm_start` to CellConfidence | AC-3 | Removing fails second assertion. |
| Add `per_shard_cells` to CompiledConfig | AC-3 | Removing fails type-level test. |
| Vendor core + orchestration | AC-4 | Mutating header fails coverage check; deleting file fails. |
| Manifest enumerates files | AC-5 | Removing manifest entry fails coverage check. |
| Tessera-side tsc clean | AC-6 | Mac Claude verification gate. |
| A12 byte-identity preservation | AC-7 | Mutating detector body fails `q01-no-detector-deltas.test.ts`. |
| Vendoring script idempotent | AC-8 | Mac Claude empirical re-run test. |
| package.json + tsconfig land | AC-9 | Mac Claude file inspection. |
| Smoke-test runs | AC-10 | `npm test` failure surfaces. |

**Result: every prescription in § Architectural mechanism + § Implementation surface binds to ≥1 AC.** No uncovered prescriptions. Skill 15 PASS.

### Architect grilling pass output (anchor `skills/01-pre-emit-grilling.md` three-bucket)

#### CRITICAL: 0

No items requiring re-draft before emit.

#### LIKELY-SURFACES: 3

- **LS-Q1.1:** tsconfig path mappings need fine-tuning at Mac Claude implementation time (OQ-2). Architect-pre-prediction: yes; <0.5 hour implementer adjustment if so.
- **LS-Q1.2:** prettier / eslint conflict with header format (OQ-1). Architect-pre-prediction: <10% likelihood; if so, modify .prettierignore for engine/ subdir or adjust header.
- **LS-Q1.3:** vendored detector file has hidden runtime dependency that vendoring breaks (vanishingly small per engine-modularity originating fact, but possible). Architect-pre-prediction: <5% likelihood; if so, escalate to architect.

#### PRE-EMPTABLE: 5

- **PE-Q1.1:** Skip `_q72-trace.ts` per Q1 architect-pick OQ-3 (folded into SAS-7).
- **PE-Q1.2:** Skip `engine/agent.ts` per dormancy (folded into SAS-8).
- **PE-Q1.3:** Skip `engine/orchestrator.ts` per gating-specific (folded into SAS-2).
- **PE-Q1.4:** Smoke-test partial vendoring (Q1.4 architect-pick).
- **PE-Q1.5:** Scripted vendoring (Q1.5 architect-pick).

### Memorial application

- **Memorial D** (`feedback_vq_framework_discipline`): SLICE 1 architectural-layer-coverage at hypothesis-tree time = type-level schema layer + file-level header layer + manifest-level audit layer + smoke-test verification layer. Four-factor prior weighting applied; candidate-set enumerated.
- **Memorial F sub-rule 1** (P3.3 multiple-read-paths; compile-time substrate modifications): TRIGGERS — schema additions in `config.ts` modify compile-time substrate. Mac Claude must Step-0 grep for runtime detector code consuming `CellDimension` / `CellConfidence` / `CompiledConfig` to verify spec covers all read paths.
- **Memorial F sub-rule 2** (MERGE-vs-REPLACE substrate-stamped-fields-preservation): TRIGGERS — `CompiledConfig` gains `per_shard_cells` field; inherited fields must be preserved via MERGE (not replace) pattern.
- **Memorial F sub-rule 3** (ADR-anti-scope-preservation): walked above; all inherited LEDGER clauses preserved at SLICE 1.
- **Memorial F sub-rule 4** (Pre-existing-property-vs-new-AC coherence): the 10 SLICE 1 ACs cohere with inherited Ville-bounded property at the engine-vendoring layer; no new acceptance criterion introduces incoherence.

---

## Architect-pre-prediction on outcomes

Explicit option-space enumeration per Practice 2; probability bands sum to ~100%.

- **(a) Clean close:** ~70% prior. Vendoring is mechanical; AC-1..AC-10 binary-met-or-not. Q1.1-Q1.5 pre-resolved; OQ-1-5 architect-pre-predicted with low-friction defaults.
- **(b) LS-Q1.1 surface — tsc path mapping adjustment:** ~20% prior. Implementer iterates path mappings; minimal cycle cost (~0.5 hour).
- **(c) Tooling friction — prettier/eslint conflict with header format:** ~7% prior. Implementer adjusts .prettierignore or header comment style.
- **(d) Empirical surprise — hidden runtime dependency in vendored file:** ~3% prior. Implementer escalates; architect dispositions; SLICE 1 timeline extends ~1 cycle.

---

## Topic close framing

How Q1 resolves drives Q2 (Phase 1 SLICE 2) pick:

- **(a) Clean close:** Q2 spec drafts on Q1-validated substrate; Q2 ACs build directly on the per_shard_cells type declaration + warm_start enum value. Standard sequential flow.
- **(b) LS-Q1.1 path-mapping fix-forward:** Q2 inherits the same path-mapping infrastructure; close-in-Q1, not a Q2 deferral.
- **(c) Tooling close-with-CAVEAT:** if prettier/eslint conflict surfaces, document as inherited tooling-configuration constraint; Q2 inherits same constraint.
- **(d) Empirical-surprise architectural deeper-commitment:** unlikely; if so, escalate to architect re-disposition + delay Q2 until vendoring strategy is reaffirmed.

---

## Discipline-archive significance

1. **SLICE 1 vendoring exercise validates the vendor-first strategy mechanically.** If AC-1..AC-10 close clean, the architectural commitment to vendor-first (per John 2026-05-15 disposition + v0.3 § 9) is empirically validated as feasible at SLICE 1 scope. Future SLICEs can build on the vendoring substrate without revalidating the strategy.

2. **First explicit Skill 14 + Skill 15 pre-route gate application in Tessera coordination flow.** This spec is the first SPEC-fidelity artifact in Tessera; the Skill 14 PRD-conjunction-cross-check + Skill 15 prescription-to-AC-coverage gates fire here for the first time. Pattern-establishment for future Tessera Q-cycles. Per Anchor-memorialization principle (John 2026-05-15), if these gates surface defects at Mac Claude implementation time, those become candidate Anchor PR contributions.

3. **Q-J6 escalation precedent.** The architect declined to make Q-J6 (cross-project sequencing) unilaterally even under overnight authorization — escalating instead of guessing on a strategic Product-Manager-role-class decision. **Discipline-archive significance:** even under autonomous-run authority, architect maintains the role-boundary discipline. Strategic decisions get escalated; architecturally-derivable decisions get pre-dispositioned. Pattern worth memorialization candidate.

4. **Initial vendoring slice = ~20 files; manifest pattern crystallizes.** The VENDORING-MANIFEST.md format established here scales to ~30-40 files at full Phase 1 close, ~50-60 at Phase 2 close. Manifest-as-audit-trail pattern is a candidate methodology refinement for Anchor (any project vendoring code from another project benefits from this pattern).

5. **Memorial D state preserved at 21V/8C across SLICE 1 spec-emit.** No new violations or confirmations surface from this spec-emit; if Mac Claude implementation reveals architect-grilling-discipline gap (e.g., file-opened gap surfacing a missed dependency), Memorial D increments by 1V. Architect-pre-prediction: no increment (engine is well-isolated per originating-context modularity facts).

---

## Amendments from v0.1

Per Reviewer pass on Q1 v0.1 (`REVIEWER-REPORT-Q-01-PHASE-1-SLICE-1.md` 2026-05-16): 1 FAIL + 5 GAP findings. v0.2 amendment applies fixes:

| Finding | Class | Disposition | Sections amended |
|---|---|---|---|
| **F1** Inherited type-state mismatch | FAIL | **AMENDED — option α (in-place inline-union extension) PICKED.** Architect opened `deploysignal/engine/types/config.ts` at SHA `5a72371`; verified actual inherited types; rewrote § Architectural mechanism #3 schema-extension surface + § Implementation surface > config.ts deltas with concrete inherited-state references (line numbers cited). Memorial D state delta: 21V/8C → 22V/8C. | § Architectural mechanism #3; § Implementation surface > config.ts; AC-3 reworded; § P3.3 acknowledgment |
| **G1** File-count undercount | GAP | AMENDED. Manifest claim "20-25 vendored files" → "~32 vendored files at SLICE 1 close" with breakdown. | § Implementation surface > VENDORING-MANIFEST claim |
| **G2** AC-3 type-extension wording | GAP | AMENDED. AC-3 reworded from "byte-identical preserved" → "additively extended; inherited type definitions, union values, optional/required modifiers preserved verbatim." | AC-3 |
| **G3** AC-7 scope | GAP | AMENDED. AC-7 broadened from detectors-only → all vendored-at-pin files (detectors + family types + core + orchestration + types except config.ts). Test file renamed `q01-no-detector-deltas` → `q01-no-at-pin-deltas`. | AC-7 |
| **G4** Missing SAS for compiled-config JSON | GAP | AMENDED. SAS-9 added: "NO Tessera-specific compiled-config JSON file at SLICE 1." | § Anti-scope SAS-9 |
| **G5** Vendored smoke-test path imports | GAP | AMENDED. OQ-2 clarified: vendored-smoke-test imports must resolve via inherited relative paths; halt-and-route-back if path-mapping configuration breaks resolution. | OQ-2 |

**Memorial D state delta:** v0.1 → v0.2 increments by 1 V (single sub-instance classification per Q63 Q1 Suggestion 1 sub-instance accumulation discipline anchor). **8th CONFIRMATION class lineage extended to 6 sub-instances** post-v0.2-amendment:

| # | Cycle | Mechanism variant |
|---|---|---|
| 1 | Q60 V1 LS-1 (DeploySignal) | input-data-structure-semantic mismatch |
| 2 | Q60 LS-2 (DeploySignal) | LIKELY-SURFACES-prediction-validation multi-layer |
| 3 | Q64 Phase 4 (DeploySignal) | calibration-substrate-rationale-option-(γ) anticipation |
| 4 | Q66 SLICE 1 LS-1 (DeploySignal) | stationarity-assumption-violation-from-AR(1)-correlation |
| 5 | v0.1 → v0.2 (Tessera SCOPING-MEMO) | file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity (MD-F6 sub-variant) |
| **6** | **v0.1 → v0.2 (Tessera Q1 spec)** | **file-opened-discipline-paired-with-candidate-set-enumeration at SPEC fidelity — second occurrence in same session; demonstrates the discipline-application-gap pattern is stickier than memorialization alone** |

**Discipline-archive significance of TWO sub-instances within hours:** memorializing MD-F6 at v0.2 of SCOPING-MEMO did NOT prevent recurrence at Q1 spec-emit. Pattern is stickier than memorialization. **For Q2 (Phase 1 SLICE 2) spec drafting and all subsequent specs, architect must apply file-opened-discipline AS AN EXPLICIT CHECKLIST ITEM at brief-drafting time** — not as a mental note. Candidate Anchor-memorialization (post-stabilization-criterion): explicit checklist tooling at SPEC-emit gate.

---

_Spec v0.2 authored: 2026-05-16 (overnight same-cycle post-Reviewer-pass). Amends v0.1 per Reviewer findings F1 + G1-G5. Format: anchor `templates/Q-NN-SPEC-TEMPLATE.md` at full SPEC fidelity. Cross-references: SCOPING-MEMO-v0.3 + ARCHITECT-REPLY-v0.3-PRE-DISPOSITION + REVIEWER-REPORT-Q-01-PHASE-1-SLICE-1 + originating-context performance facts (`deploysignal/runs/benchmarks/tick-latency-baseline.json` measured 2026-04-20). Routing target: TPM packages for John; Mac Claude implementation gated on John's Q-J6 disposition AND first-review confirmation of Q-J1..Q-J5 PRE-DISPOSITION picks AND first-review confirmation of v0.2 amendments._

_Skill 14 + 15 pre-route gates at v0.2: PASS (re-checked; type references corrected). Architect grilling pass at v0.2: 0 CRITICAL, 3 LIKELY-SURFACES (unchanged), 5 PRE-EMPTABLE (unchanged). Memorial D state at v0.2: **22V/8C** (was 21V/8C; +1 V for the file-opened-discipline violation; 8th CONFIRMATION class extended to 6 sub-instances)._

_Hybrid Reviewer pair-review-style at SLICE 1 close-walk per inherited Anchor commitment: NOT MANDATORY (architectural-foundation-only; empirical-evidence-load-bearing pair-review is SLICE 3 territory). Single-Reviewer cold-context audit at SLICE 1 close-walk sufficient — demonstrated effective at v0.1 → Reviewer F1 catch._

---

_File split: this sidecar separated from `Q-R01-SPEC.md` 2026-05-16 to reduce cold-load weight on the Implementer. Reviewer reads both files; Implementer reads only the spec proper._
