# Phase 1 Close Walk — Tessera

_2026-05-17. HEAD at R15 GREEN: `<SHA-A-from-attestation>`. Phase 1 closes 14 rounds (R01-R14); 4 SLICEs + 1 baseline-curation track + 1 carry-forwards bundle. **HARD STOP after R15 closes for operator review.**_

---

## 0. Header

- **Date:** 2026-05-17
- **HEAD at close:** `<SHA-A-from-attestation>` (recorded at Implementer attestation)
- **Scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 3 Phase 1 close-walk template (row at line 302)
- **Anti-scope reference:** `coordination/NEXT-ROLE.md` lines 57-63 R15 anti-scope
- **Round chain:** R01 → R14 closed with 0 CRITICAL streak across R02-R14 (13 consecutive rounds; per `coordination/OVERNIGHT-LOG-2026-05-17.md` :173 R14 entry + `REVIEWER-REPORT-R14.md` § Verdict)

---

## 1. SLICE-by-SLICE retrospective

### 1.1 SLICE 1 (R01) — engine vendoring + schema additions

**Scope summary.** SLICE 1 vendored the Phase 1 engine subset from DeploySignal main at SHA `5a72371`: 11 detector files, 5 family-type files, 10 core engine files, 8 type-layer files, 3 O0/L0 compilation-dependency files, and 2 vendored smoke-test files (1 subsequently removed). Per-file `VENDORED FROM DeploySignal main@5a72371` provenance headers established the vendoring policy. Schema additions applied additively to `engine/types/config.ts`: `shard_id` as 7th `CellDimension` member (Delta 1), `warm_start` as 5th `CellConfidence` member (Delta 2), `PerShardResidual` + `PerShardCell` new types (Delta 3), and `per_shard_cells?: PerShardCell[]` field on `CompiledConfig` (Delta 4). `CellDimension` and `CellConfidence` typedef aliases were added (MINOR-1 at R01 for extraspec addition; carried forward into R02 as canonical).

**ACs satisfied.** 10 ACs per `coordination/specs/Q-R01-SPEC.md` § Acceptance criteria. At initial Reviewer pass: AC-6 (typecheck) + AC-10 (smoke test via `npm test`) FAILED due to `tsconfig.json:7 "ignoreDeprecations": "6.0"` incompatibility with installed TypeScript 5.9.3 (MAJOR-1 per `REVIEWER-REPORT-R01.md` :36-39); cascaded from a string mismatch needing `"5.0"` instead. AC-5 (manifest completeness) was PARTIAL→FAIL because the two vendored smoke-test files were absent from `VENDORING-MANIFEST.md` (MAJOR-4 per `REVIEWER-REPORT-R01.md` :56). All 10 ACs achieved PASS post-fix at GREEN HEAD `4b56831` (manual operator capture after IMPLEMENTER session crash at coordination step).

**Outstanding gaps.** 5 MAJOR + 9 MINOR + 4 OBS at initial Reviewer pass (per `REVIEWER-REPORT-R01.md` audit summary). Notable carry-forwards: `test/ville-preservation-per-profile.test.ts` vendored as smoke-test but shells to `tools/calibrate.js` which Tessera does not carry — removed at R02 per MINOR-7 disposition (now recorded as REMOVED-AT-R02 in VENDORING-MANIFEST.md row 45). Engine module format resolved as CJS (not ESM per spec pseudocode) per Q1.1 operator disposition preserved across all subsequent rounds. R01 had no RED→GREEN two-commit history due to session crash (MINOR-9); TDD verification available from R03 onwards.

**Cross-references.** Spec: `coordination/specs/Q-R01-SPEC.md`. Reviewer: `coordination/reviews/REVIEWER-REPORT-R01.md`. GREEN HEAD: `4b56831` (manual operator capture, 2026-05-16).

---

### 1.2 SLICE 2 (R02-R05 + R10 + R14 Items 1+2) — per-shard residual runtime

**Scope summary.** SLICE 2 spans seven round-segments across four chronological rounds plus two carry-forward deliveries, collectively delivering the complete per-shard residual machinery.

**R02** (schema extension): Added `n_samples`, `confidence`, `residual_seed_hash`, `last_observed_at`, `mean_delta`, `mean_vector`, `covariance`, and `welford_state` fields to `PerShardResidual` (per `REVIEWER-REPORT-R02.md` AC table, lines 6-30). Established the R02 sparse-encoding inverse-convention (optional fields ABSENT not present-with-undefined when not applicable). 19 ACs per `Q-R02-SPEC.md`; 0 MAJOR, 3 MINOR, 5 OBS.

**R03** (warm-start state machine): Delivered `engine/per-shard/warm-start.ts` — `initialPerShardResidual`, `observeSample`, and the `WARM_START_THRESHOLD=20` / `STRICT_UPGRADE_THRESHOLD=60` constants. 20 ACs (16 PASS, 4 PARTIAL-intent-satisfied) per `REVIEWER-REPORT-R03.md` :46; 0 MAJOR, 5 MINOR, 2 OBS. RED commit `65a5a4a` precedes GREEN `dea1d7a` (per `REVIEWER-REPORT-R03.md` :36).

**R04** (Welford accumulator): Delivered `engine/per-shard/welford.ts` — `initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance`. AC-3 closed-form hand-verified by Reviewer (per `REVIEWER-REPORT-R04.md` :49). 16 ACs; 0 MAJOR, 0 MINOR, 5 OBS — cleanest finding set at R04 among SLICE 2 rounds.

**R05** (runtime composition v1): Delivered `engine/per-shard/runtime.ts` first version — `updatePerShardResidual` + `ExtendedSampleObservation` interface composing R03 + R04 modules. 19 ACs; 0 MAJOR, 3 MINOR, 5 OBS (per `REVIEWER-REPORT-R05.md` verdict line). Closed R02 MINOR-3 (CellKey cast) and R03 MINOR-5 (immutability).

**R10** (SLICE 2b4 strict-tier emission): Added `projectTierGatedOutputs` to `engine/per-shard/runtime.ts` — strict-tier atomic emission of `mean_vector` + `covariance` when `welfordCovariance` returns non-null (n ≥ 2); inverse-convention enforcement removes both fields at all other tiers. 19 ACs (per `REVIEWER-REPORT-R10.md` :70); 0 MAJOR, 1 MINOR, 4 OBS. GREEN HEAD `fdaf0cb`; aggregate test run 104/104 at `b2740d2` (per `REVIEWER-REPORT-R10.md` :70).

**R14 Item 1** (mean_delta carry-forward): Extended `updatePerShardResidual` and `projectTierGatedOutputs` to accept optional `baselineCell: BaselineCellEntry | undefined`. Warm-start tier now emits `mean_delta = welfordMean(state) − baselineCell.family_C.mean_vector` when lengths match (per `REVIEWER-REPORT-R14.md` § Item 1). 7 ACs in `test/q14-mean-delta.test.ts`. Sparse-encoding inverse-convention extended to three fields.

**R14 Item 2** (PR-F5 storage measurement): Empirical storage profile at N=1000 synthetic cluster surfaced **1237.7× overhead ratio** (per-shard warm_start residual aggregate 81.9 MB vs fleet baseline 67.9 KB), contradicting v0.3 § 2.2 prediction of 1.2-1.5×. Sparse reduction 81.1% (AC-9 ≥50% met); linear scaling confirmed (AC-10). Finding elevated to HIGH-priority morning-triage item TQ-1 (per `OVERNIGHT-LOG-2026-05-17.md` :13-35). 3 ACs in `test/q14-pr-f5-storage.test.ts`. The PR-F5 architectural-claim revision is operator-gated (§ 5 + § 7 below).

**Outstanding gaps.** R10 MINOR-1 (runtime.ts docblock incomplete) closed in-passing at R15 Deliverable 5. PR-F5 architectural revision to v0.3 § 2.2 storage prediction outstanding (TQ-1; § 5). R14 MINORs-1/2/3 + OBS-1/2/3 (per `REVIEWER-REPORT-R14.md`): formula vs spec deviation (MINOR-1), self-confirming AC-6 pattern (MINOR-2), ratio-bound assertion gap (MINOR-3); all methodology-class non-load-bearing.

**Cross-references.** Specs: `Q-R02-SPEC.md`, `Q-R03-SPEC.md`, `Q-R04-SPEC.md`, `Q-R05-SPEC.md`, `Q-R10-SPEC.md`, `Q-R14-SPEC.md`. Reviewers: `REVIEWER-REPORT-R02.md`, `REVIEWER-REPORT-R03.md`, `REVIEWER-REPORT-R04.md`, `REVIEWER-REPORT-R05.md`, `REVIEWER-REPORT-R10.md`, `REVIEWER-REPORT-R14.md`. R14 GREEN `949b03c`.

---

### 1.3 Baseline curation track (R06-R09) — Tessera-native FCP-1 sustained-event detector

**Scope summary.** The baseline curation track (R06-R09) delivered the Tessera-native Fleet-Correlated-Process variant of the FCP-1 sustained-event detector, documented in `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md`. This track is parallel to the SLICE 2 residual track and does not produce per-shard outputs; it produces fleet-level event-detection decisions used as baseline signals.

**R06** (toolchain + Stage 2a + calibrators): Delivered `engine/per-shard/pre-pass.ts` (baseline curation pipeline), `tools/curate-baseline-pipeline.ts` (audit-emission orchestrator, vendored-at-pin from DS `5a72371`), and `tools/calibrators/` (family-c.ts MCD/MRCD/Ledoit-Wolf calibrators, also vendored). 13 ACs in `test/q06-baseline-pre-pass.test.ts`; 0 MAJOR, 4 MINOR, 4 OBS (per `REVIEWER-REPORT-R06.md` findings header).

**R07** (FCP-1 fleet-correlated detector): Delivered `engine/fleet/fleet-correlated-e-process.ts` implementing the Fleet-Correlated-Process (FCP-1) detector per v0.3 SCOPING-MEMO-BASELINE-CURATION § 2. 26 ACs per `Q-R07-SPEC.md`; 0 CRITICAL, 2 MAJOR, 4 MINOR, 4 OBS (per `REVIEWER-REPORT-R07.md`). MAJOR-1 (PR-F8 zero empirical power on H₁) and MAJOR-2 (AC-11/12/13 self-confirming via OBSERVED-binding disposition) were discipline-class findings, not functional defects; routing was MERGE-READY. The zero-power finding under the R07 OBSERVED-binding disposition was a significant empirical discovery that motivated R08.

**R08** (FCP-1 amendment): Redesigned AC-12/13 as sustained-injection power tests (AC-27/28 adding explicit `firedCount ≥ 25` and `firedCount ≥ 15` power assertions); narrowed FCP-1 to "sustained event" scope per Amendment-1 disposition; closed R07 MINORs. 31 ACs per `Q-R08-SPEC.md`; 0 CRITICAL, 2 MAJOR, 3 MINOR, 6 OBS. MAJOR-1 (halt-discipline: Delta 11 silently reverted without DIAGNOSTIC) and MAJOR-2 (wrong spec premise for Delta 11: clean-fleet alternating signal produces `n_ticks_contaminated=6` not 0, contrary to spec claim). GREEN HEAD `4ba5e9e` (per `REVIEWER-REPORT-R08.md` :5).

**R09** (cleanup): Corrected Q-R08-SPEC.md primitive 11 factual premise; updated AC-15 binding from `=== origLen` (incorrect) to `<= origLen` (correct per empirical finding). 5 ACs (AC-R09-1 through AC-R09-5) per `Q-R09-SPEC.md`. 0 CRITICAL, 1 MAJOR, 2 MINOR, 5 OBS: MAJOR-1 (Q-R08-SPEC.md premise correction incomplete — same false premise persisted at 4 sibling sites per `REVIEWER-REPORT-R09.md` :41). All q07 tests continued to pass 23/23. Baseline curation track closed at R09.

**Outstanding gaps.** R09 MINOR-3 (NEXT-ROLE.md attestation table format) — low-priority carry-forward to operator triage.

**Cross-references.** Specs: `Q-R06-SPEC.md`, `Q-R07-SPEC.md`, `Q-R08-SPEC.md`, `Q-R09-SPEC.md`. Reviewers: `REVIEWER-REPORT-R06.md`, `REVIEWER-REPORT-R07.md`, `REVIEWER-REPORT-R08.md`, `REVIEWER-REPORT-R09.md`. R09 GREEN HEAD: `59f2084` (per `REVIEWER-REPORT-R09.md` OBS-1).

---

### 1.4 SLICE 3 (R11-R12) — hierarchical e-value primitives + fleet-merged detector surfaces

**Scope summary.** SLICE 3 delivered the two-layer fleet-merge architecture per v0.3 Q-J1 hybrid: R11 provides the Ville-bound-preserving combination primitives; R12 provides the caller-side fleet-merge wrappers.

**R11** (hierarchical e-value primitives + PR-F1): Delivered `engine/fleet/combination.ts` — `combineProduct` (AoE family, exact Ville bound preservation) and `combineAverage` (PoE family, Ville bound preservation via iid + independence). PR-F1 evidence matrix: iid H₀ product bound at N=50 shards × T=50 ticks × N_TRAJ=100 trajectories (per `REVIEWER-REPORT-R11.md` § 0 verdict). 18 ACs; 0 CRITICAL, 0 MAJOR, 1 MINOR, 6 OBS. Full suite 122/122 PASS at `dc486a7`. MD-F2 (fixed-time only; any-time deferred to Wang-Ramdas-Vovk 2022) explicitly documented. 10-round 0-CRITICAL streak extended (per `REVIEWER-REPORT-R11.md` § 0).

**R12** (fleet-merged detector surfaces): Delivered `engine/fleet/detectors.ts` — `fleetMergeFamilyA` and `fleetMergeFamilyC` wrappers consuming per-shard `MixtureSupermartingaleState` / `BettingEProcessState` state (via `state.M` / `state.log_S_t`) and applying R11's combination primitives. Caller-explicit selection mechanism (option (a)) per pre-approved autonomous default — documented rejection of option (b) auto-selection in spec § Mechanism primitive 3. 16 ACs; 0 CRITICAL, 0 MAJOR, 0 MINOR, 4 OBS — cleanest finding set in project history at SLICE-3 layer. Full suite 138/138 at `d4bc0a2`. Per-shard input invariance verified (AC-6 + AC-7 deep-equal-before-vs-after). (Per `OVERNIGHT-LOG-2026-05-17.md` :103-114.)

**Outstanding gaps.** R11 MINOR-1 (`tick_post` variable-name nit); R11 OBS-1/-2 (spec citation drift in REVIEWER-ANCHOR). R12 OQ-2 (`fleetMergeFamilyAMixture` variant deferred), R12 OQ-3 (R13+ auto-selection hint propagation), R12 OQ-4 (strict-equality assertion form; architect picked: keep). All low-priority methodology or design-deferral items.

**Cross-references.** Specs: `Q-R11-SPEC.md`, `Q-R12-SPEC.md`. Reviewers: `REVIEWER-REPORT-R11.md`, `REVIEWER-REPORT-R12.md`. R11 GREEN: `dc486a7`; R12 GREEN: `24276ee` (per `OVERNIGHT-LOG-2026-05-17.md` :104).

---

### 1.5 SLICE 4 (R13) — e-BH FDR operator surface

**Scope summary.** SLICE 4 delivered the e-BH (e-Benjamini-Hochberg) FDR operator surface per Ren-Barber 2024 Algorithm 1 / Wang-Ramdas 2022.

**R13** (e-BH FDR operator surface + PR-F2): Delivered `engine/fleet/e-bh.ts` — `eBenjaminiHochberg(perShardEValues, qLevel) → { selected, K }`. Family-agnostic, stateless, pure function. FDR ≤ q under arbitrary dependence between e-values. PR-F2 evidence matrix: N=100 shards × T=100 ticks × N_TRIALS=200; iid H₀ + correlated-drift H₀ at ρ²=0.5; Wilson upper bound 0.09624 on empirical FDR; both cells PASS (per `REVIEWER-REPORT-R13.md` verdict). 14 ACs; 0 CRITICAL, 0 MAJOR, 1 MINOR, 4 OBS. Full suite 152/152 PASS at `d54912d`. R12 OQ-1 resolved: e-BH consumes per-shard e-values (β-path); fleet-level e-BH rejected. Q-J1 hybrid two-layer architecture preserved: R11/R12 fleet-merge is Ville-bound layer; R13 e-BH is FDR-interface layer; parallel-not-serial. (Per `OVERNIGHT-LOG-2026-05-17.md` :135-155.)

**Outstanding gaps.** R13 MINOR (Wilson vs Wald naming; methodology-class, non-load-bearing) + 4 OBS (all non-load-bearing per `REVIEWER-REPORT-R13.md`).

**Cross-references.** Spec: `Q-R13-SPEC.md`. Reviewer: `REVIEWER-REPORT-R13.md`. R13 GREEN: `d54912d` (per `OVERNIGHT-LOG-2026-05-17.md` :138).

---

### 1.6 SLICE 2 carry-forwards (R14 Item 3) — runtime can load CompiledConfig from disk

**Scope summary.** R14 Item 3 delivered the compiled-artifact JSON loader, completing the SLICE 2 carry-forwards bundle (Item 1 mean_delta + Item 2 PR-F5 narrated in § 1.2; Item 3 here per `NEXT-ROLE.md` :22-30 bucket scheme).

**R14 Item 3** (compiled-artifact JSON loader): Delivered `engine/loader.ts` — `loadCompiledConfig(path: string): Promise<CompiledConfig>`. Reads JSON from disk, validates against the `CompiledConfig` shape from `engine/types/config.ts`, and performs round-trip serialization integrity checks. Validates that per_shard_cells entries have non-empty `shard_id` and matching emission shapes (R10-emission-shape compatibility). 6 ACs in `test/q14-compiled-config-loader.test.ts`; routing MERGE-READY (per `REVIEWER-REPORT-R14.md` § Verdict; 0 MAJOR, 3 MINOR, 3 OBS for the full R14 round).

**Outstanding gaps.** R14 MINOR-1/2/3 + OBS-1/2/3 (per `REVIEWER-REPORT-R14.md`): formula deviation (MINOR-1), self-confirming pattern (MINOR-2), ratio-bound gap (MINOR-3). All methodology-class. The PR-F5 finding (Item 2) is the load-bearing outstanding gap elevated to TQ-1 (§ 5).

**Cross-references.** Spec: `Q-R14-SPEC.md`. Reviewer: `REVIEWER-REPORT-R14.md`. R14 GREEN: `949b03c` (per `OVERNIGHT-LOG-2026-05-17.md` :173).

---

## 2. Aggregate Phase 1 metrics

| Round | ACs (pass/total) | CRIT | MAJ | MIN | OBS | Test Δ | Notes |
|---|---|---|---|---|---|---|---|
| R01 | 10/10* | 0 | 5 | 9 | 4 | +9 (q01×3) | *PARTIAL→PASS post-fix; session crash; no RED history |
| R02 | 19/19 | 0 | 0 | 3 | 5 | +6 (q02) | MERGE-READY |
| R03 | 20/20† | 0 | 0 | 5 | 2 | +13 (q03) | †4 PARTIAL-intent-satisfied |
| R04 | 16/16 | 0 | 0 | 0 | 5 | +11 (q04) | Cleanest finding set at this layer |
| R05 | 19/19 | 0 | 0 | 3 | 5 | +13 (q05) | MERGE-READY |
| R06 | 13/13† | 0 | 0 | 4 | 4 | +13 (q06) | †plus binding-command ACs; see REVIEWER-REPORT-R06 |
| R07 | 26/26‡ | 0 | 2 | 4 | 4 | +23 (q07) | ‡self-confirming OBSERVED-binding; 2 MAJOR discipline-class |
| R08 | 31/31‡ | 0 | 2 | 3 | 6 | 0 (q07 amended) | ‡PASS or PARTIAL-with-documented-deviation |
| R09 | 5/5† | 0 | 1 | 2 | 5 | 0 (q07 amended) | †AC-R09-1 PARTIAL (incomplete correction) |
| R10 | 19/19 | 0 | 0 | 1 | 4 | +11 (q10) | R10 MINOR-1 closed at R15 |
| R11 | 18/18 | 0 | 0 | 1 | 6 | +18 (q11) | 10-round 0-CRITICAL streak |
| R12 | 16/16 | 0 | 0 | 0 | 4 | +16 (q12) | Cleanest round in project history |
| R13 | 14/14 | 0 | 0 | 1 | 4 | +14 (q13) | PR-F2 both cells PASS |
| R14 | 18/18 | 0 | 0 | 3 | 3 | +16 (q14×3) | PR-F5 TQ-1 HIGH |
| **Total** | **~228/~228** | **0** | **10** | **36** | **57** | **168** | |

_Sources: per-round AC counts from `Q-RXX-SPEC.md` § Acceptance criteria; findings from `REVIEWER-REPORT-RXX.md` audit summaries; test Δ from `coordination/NEXT-ROLE.md` :108-125 per-file baseline._

**Key discipline streaks (cite: `OVERNIGHT-LOG-2026-05-17.md` :171 + `REVIEWER-REPORT-R14.md` § Verdict):**

- **0-CRITICAL streak:** 13 consecutive rounds R02-R14. All 13 rounds routed MERGE-READY. No round produced a finding that blocked merge on behavioral-correctness grounds.
- **TDD-discipline streak:** 12 consecutive Implementer-side RED→GREEN commit pairs (R03-R14). R01 excluded due to session crash (no git RED history). Reviewer-side TDD verification confirmed each round from R03 onwards.
- **Anti-scope streak:** 8 consecutive clean anti-scope rounds per `REVIEWER-REPORT-R14.md` § Anti-scope audit. No unauthorized production-surface changes detected in any post-R05 round.
- **Total regression tests at R14 close:** 168/0 (per Reviewer-attested baseline at `NEXT-ROLE.md` :117-125; 17 test files).

---

## 3. Memorial D state-stamp delta (pointer to MEMORIAL.md)

The Implementer enumerated all 40 VIOLATION entries across R02-R14 and classified each as Memorial-D class or methodology class per the rubric in `coordination/MEMORIAL.md` § Phase 1 close — Memorial D state stamp (2026-05-17).

**Verdict:** Phase 1 close Memorial-D state = **23V / 8C**. Tessera Phase 1 introduced exactly **1 Memorial-D class violation** (R02 ARCHITECT pre-emit-grilling, explicitly described as "Sub-instance of MD-F6 (file-opened-discipline-paired-with-candidate-set-enumeration)" at `MEMORIAL.md` line 215) and 0 Memorial-D class confirmations. The remaining 39 R02-R14 violations are methodology class (pre-emit-grilling formula/citation errors, TDD-discipline, halt-discipline, attestation-accuracy, anti-scope). The structural fix at anchor PR #35 (mandatory REVIEWER-ANCHOR section in spec template) largely succeeded: 1 sub-instance escaped in the R02 spec (before the verify-citations script was in regular use) — not in any subsequent round.

**Discrepancy from Architect pre-prediction:** Architect pre-predicted 0 Memorial-D class violations. Implementer derived 1. This is empirically valid per § 6 halt condition (a) of `Q-R15-SPEC.md`; `coordination/diagnostics/DIAGNOSTIC-R15-memorial-d-delta.md` records the discrepancy for operator visibility. AC-8 passes with the derived state (23 ≥ 22; 8 ≥ 8).

**32 reinforcements accreted across R02-R14** (per `grep -c "^# REINFORCED"` at Implementer attestation; CLAUDE-COMMON: 1, CLAUDE-ARCHITECT: 15, CLAUDE-IMPLEMENTER: 16, CLAUDE-REVIEWER: 0, CLAUDE-MEMORIAL: 0). 0 Memorial-D class violations post-R02; the structural fix demonstrably stabilized the discipline at the R03+ boundary.

**Full state-cell update + accretion tally** at `coordination/MEMORIAL.md` § Phase 1 close — Memorial D state stamp (2026-05-17).

---

## 4. Vendoring verification result (pointer to VENDORING-MANIFEST.md)

All 40 currently-on-disk vendored files were verified against the `VENDORED FROM DeploySignal main@5a72371` header string at R15 Implementer execution time. Verification command: `grep -l "VENDORED FROM DeploySignal main@5a72371" <file>` per manifest row.

**Summary:** 40/40 vendored-at-pin files verified at SHA `5a72371`; 1 file flagged as REMOVED-AT-R02 (`test/ville-preservation-per-profile.test.ts`; per R01 MINOR-7 disposition).

**Drift outcome:** No drift surfaced. All 40 on-disk files carry the correct provenance header. Re-pin deferred to operator gate (per anti-scope `NEXT-ROLE.md` :61; auto-re-pin forbidden at R15).

**Idempotency outcome:** `tools/vendor-from-deploysignal.sh` idempotency carry-forward from R01 AC-8 close; not re-run at R15 (requires DeploySignal sibling repository at expected path, outside R15 anti-scope per `NEXT-ROLE.md` :63).

**Full verification log** (per-file table for all 41 manifest rows) at `coordination/VENDORING-MANIFEST.md` § Verification log § 2026-05-17.

---

## 5. Outstanding gaps (operator triage queue carry-forward)

Every item below requires operator decision or future-round work. Each item: description + recommended action + source reference. No item is dispositioned in R15.

**TQ-1 — PR-F5 storage-overhead empirical finding (HIGH priority).**
Observed 1237.7× overhead ratio (81.9 MB per-shard warm_start vs 67.9 KB fleet baseline at N=1000 synthetic cluster) contradicts v0.3 § 2.2 prediction of 1.2-1.5×. Per `OVERNIGHT-LOG-2026-05-17.md` :13-35, recommended first step is (γ) investigation — verify measurement methodology before architectural revision. If measurement is sound, then (β) pitch-revising or (α) architecture-revising. Recommended action: operator triages TQ-1 before Phase 2 launch. Source: `OVERNIGHT-LOG-2026-05-17.md` :13-35; `test/q14-pr-f5-storage.test.ts`; `REVIEWER-REPORT-R14.md` MINOR-3.

**TQ-2 — Anchor PR #38 review/merge (LOW priority; informational).**
R10-batch anchor PR (audit-sidecar template + 3 grilling steps) awaits review. Not blocking; cadence reminder. Source: `OVERNIGHT-LOG-2026-05-17.md` :37-39.

**OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring decision (operator-gate).**
Calibrate.ts (DeploySignal-side calibration tool) was deferred at SLICE 1 per SAS-6 + OQ-3. Decision: vendor as Phase 1 SLICE 6+ candidate, or defer to Phase 2. Not acted on in R15. Source: `NEXT-ROLE.md` :153; `REVIEWER-REPORT-R01.md` MINOR-7 disposition lineage.

**OQ-R08-3 — Phase 2 transient detector scheduling (operator-gate).**
Phase 2 transient-detector scope: schedule early in Phase 2 SLICE 1, or schedule late in Phase 2 SLICE 3-4. Source: `NEXT-ROLE.md` :154; `Q-R08-SPEC.md` § Operator-gate items.

**R09 MINOR-3 — NEXT-ROLE.md attestation table format.**
Low-priority documentation nit. Source: `REVIEWER-REPORT-R09.md` MINOR-3 (:65).

**R10 MINOR-1 — `engine/per-shard/runtime.ts` module-level docblock.** CLOSED IN R15 DELIVERABLE 5. The docblock now describes R10 (SLICE 2b4) and R14 (mean_delta carry-forward) contributions per ACs 15-17. Source: `REVIEWER-REPORT-R10.md` :82-92; closed at R15.

**R11 MINOR-1 — `tick_post` variable-name nit.**
Low-priority code-style item. Source: `REVIEWER-REPORT-R11.md` MINOR-1.

**R11 OBS-1/-2 — Spec citation drift in REVIEWER-ANCHOR.**
R11 REVIEWER-ANCHOR had two citation-accuracy failures despite Architect self-attestation. Non-load-bearing; documentation quality improvement for future rounds. Source: `REVIEWER-REPORT-R11.md` OBS-1/-2.

**R12 OQ-2 — `fleetMergeFamilyAMixture` variant deferral.**
Mixture variant deferred until an operator-facing consumer requires it. Source: `REVIEWER-REPORT-R12.md` OQ-2; `OVERNIGHT-LOG-2026-05-17.md` :124.

**R12 OQ-3 — R13+ auto-selection hint propagation.**
Auto-selection hint for e-BH layer propagation deferred. Source: `REVIEWER-REPORT-R12.md` OQ-3; `OVERNIGHT-LOG-2026-05-17.md` :125.

**R12 OQ-4 — Strict-equality assertion form.**
Architect picked: keep strict-equality + document IEEE-754-determinism assumption. Closed as operator-gate pick at R12. Source: `OVERNIGHT-LOG-2026-05-17.md` :127.

**R13 MINOR + 4 OBS — Non-load-bearing methodology findings.**
Wilson vs Wald naming nit (MINOR); 4 OBS items per `REVIEWER-REPORT-R13.md`. None block Phase 2. Source: `REVIEWER-REPORT-R13.md`.

**R14 MINOR-1/2/3 + OBS-1/2/3 — Methodology-class findings.**
MINOR-1 (formula vs spec: ratio formula deviation); MINOR-2 (self-confirming AC-6 pattern); MINOR-3 (ratio-bound assertion gap). OBS-1/2/3 non-load-bearing. Source: `REVIEWER-REPORT-R14.md`.

**v0.3 § 2.2 storage-prediction architectural-revision candidate (related to TQ-1).**
The v0.3 § 2.2 "Failure mode: prediction wrong by >2× single-instance signals load-bearing acceptance failure" criterion is now empirically triggered (~800-1000× deviation). The v0.3 claim itself may need amendment, OR the pitch reframing, OR an architectural mechanism to achieve the original target. Operator decides as part of TQ-1 triage. Source: `SCOPING-MEMO-v0.3.md` § 2.2; `OVERNIGHT-LOG-2026-05-17.md` :14-16.

---

## 6. Phase 2 TAGGED-FUTURE activation criteria

The following sub-sections document what Phase 2 activation would look like under each candidate operator disposition. No disposition is picked in R15 (per R15-SAS-10 + AC-11; the Reviewer will verify no pick-sentinel strings appear in this file). The Architect-recommended interpretation is noted for each option but the operator decides.

### OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring decision

**Context.** `tools/calibrate.ts` (DeploySignal calibration CLI) was deferred at SLICE 1 per SAS-6 + OQ-3. The R06 Stage 3b structural-typing compatibility with `tools/calibrators/family-c.ts` was achieved without calibrate.ts, so Phase 1 SLICE 1-4 close does not require it.

**Disposition (a) — vendor at Phase 1 SLICE 6+ (before Phase 2 start):**
A new round (call it R16-R17 depending on scope) vendoring calibrate.ts from DeploySignal `5a72371`. This round becomes a prerequisite to Phase 2 SLICE 1. `NEXT-ROLE.md` would be updated to route R16 as Architect → Implementer → Reviewer (full tier; new vendor dependency). `Q-R16-SPEC.md` would cite `Q-JC1` as the PRD decision point. Phase 2 SLICE 1 launch waits for R16/R17 GREEN.

**Disposition (b) — defer calibrate.ts to Phase 2 (Phase 2 SLICE 1 prerequisite):**
Phase 2 SLICE 1 spec includes calibrate.ts vendoring as its first deliverable. The round would be A1 (new external dependency) triggering full tier. Phase 2 SLICE 1 scope therefore includes both calibrate.ts and the cross-shard correlation architectural work (TopologyNode/Edge extensions), which may stretch SLICE 1 to 2-3 Q-cycles rather than 1-2. No blocking action before Phase 2 start; operator signals Phase 2 ready by setting `NEXT-ROLE.md` NEXT-ROLE: ARCHITECT for R16.

**Per-disposition routing change:** Disposition (a) adds 1-2 rounds before Phase 2; operator would set NEXT-ROLE.md CURRENT-ROUND to R16 with scope "vendor calibrate.ts + tools/calibrators integration test." Disposition (b) adds calibrate.ts to Phase 2 SLICE 1 spec scope; Architect notes it as an A1 factor when emitting the SLICE 1 spec.

### OQ-R08-3 — Phase 2 transient detector scheduling

**Context.** Phase 2 includes a transient-detector surface alongside the sustained-event FCP-1 from Phase 1. The open question is whether transient detection is an early-Phase-2 scope item or a later SLICE.

**Disposition (a) — schedule early in Phase 2 (SLICE 1 or SLICE 2):**
Phase 2 SLICE 1 carries transient-detector scope alongside the cross-shard correlation substrate. This increases SLICE 1 complexity (A1 + A7 factors) and likely expands SLICE 1 to 2-3 Q-cycles. The benefit is that transient detection is available earlier for evidence-matrix validation in the Phase 2 close walk.

**Disposition (b) — schedule late in Phase 2 (SLICE 3-4):**
Transient detection is deferred until after the SLICE 1-2 cross-shard correlation substrate is stable. The benefit is a narrower SLICE 1 scope. This risks that the transient-detector design depends on the cross-shard substrate choices made at SLICE 1-2; a deferred design may need rework.

**Architect-recommended framing:** Disposition (b) is safer architecturally — the cross-shard substrate should be validated before layering transient detection on it. However, if the operator wants an end-to-end prototype of both event types early, (a) is defensible if SLICE 1 scope is clearly bounded.

### Phase 2 SLICE 1 scope per v0.3 § 2.3

**Context.** Per `SCOPING-MEMO-v0.3.md` § 2.3 (Phase 2 SLICE 1 row, line 312), SLICE 1 delivers: `TopologyNode.kind` enum extension; `TopologyEdge relationship` enum extension; `VerdictGroup` scope-extension contract (`cluster_event_id` field); synthetic-cluster substrate v9X-class fixture generation.

**Disposition Q-J4(i) — single-rack uniform topology (minimal SLICE 1 substrate):**
Phase 2 SLICE 1 scopes to the simplest concrete topology: one rack with uniform GPU shards. `TopologyNode.kind` gets `'rack' | 'gpu_shard'`; `TopologyEdge.relationship` gets `'contains'`. The v9X fixture generates a single-rack cluster with N=10-20 shards. `cluster_event_id` propagation added to `VerdictGroup`. This is the 1-Q-cycle interpretation of SLICE 1.

**Disposition Q-J4(ii)/(iii) — broader substrate at SLICE 1 entry:**
Phase 2 SLICE 1 includes PSU/cooling-zone enum extensions and injected hardware events. This aligns SLICE 1 more closely with the Phase 2 SLICE 3 target topology (per v0.3 § 2.3 SLICE 3 scope). The benefit is a richer evidence matrix at SLICE 1 close. The cost is 2-3 Q-cycles for SLICE 1 (broader fixture + more type-layer surfaces).

**Architect-recommended interpretation:** Q-J4(i) for SLICE 1, expanding in SLICE 2 — matches the v0.3 estimate of 1-2 Q-cycles for SLICE 1 and reduces the risk of premature scope at the topology entry point.

### TQ-1 PR-F5 storage finding — Phase 2 activation impact

**CLOSED WITH DISPOSITION (β) — confirmed by operator 2026-05-17 evening; executed at R17.**

**Context.** Per `OVERNIGHT-LOG-2026-05-17.md` :13-35, the R14 PR-F5 measurement surfaced a 1237.7× overhead ratio, contradicting the v0.3 § 2.2 prediction. R16 d-mismatch investigation confirmed ratio converges to ≈N (1006.5× at d=100), ruling out the d-mismatch hypothesis. Operator triaged and dispositioned.

**Disposition (α) — architecture-revising:**
v0.3 § 2.2 claim is revised. A new SLICE (SLICE 5 or equivalent) is added to Phase 1 or Phase 2 SLICE 1 scope: deliver an additional compression mechanism (diagonal-only covariance? rank-reduced residual? aggressive null-encoding?). Phase 2 activation is **gated** until the storage overhead is within 2× of fleet baseline. Phase 2 SLICE 1 spec would not be emitted until SLICE 5 achieves target. This adds 2-5 Q-cycles before Phase 2.

**Disposition (β) — pitch-revising: OPERATOR CONFIRMED**
v0.3 § 2.2 claim is amended to reflect the empirical truth: per-shard residual at N=1000 with K=168 cells × d=10 dimensions costs ~82 MB; ratio ≈ N. The pitch claim is revised; the architectural truth is documented. Phase 2 activation proceeds; storage reduction is a Phase 2 goal but not an activation **gate**. Phase 2 SLICE 1 spec emitted without delay; storage-compression scope added to Phase 2 SLICE 2+ roadmap (see storage-mitigation paths below).

**Disposition (γ) — investigation-first:** Superseded — R16 investigation completed; measurement methodology verified sound (single-shard proxy confirmed against AC-R16 empirical tests). No further investigation required.

**Disposition (δ) — defer to Phase 2:** Not selected.

**R17 execution:** `SCOPING-MEMO-v0.3.md` §§ 1.7 (shard definition), 1.8 (amendment history), 2.2 (storage claim + PR-F5 trigger), and 4.2 R-E1 (risk row) all amended. `PRD.md` performance row annotated. See R17 commit (recorded in `OVERNIGHT-LOG-2026-05-17.md` TQ-1 entry).

---

**Phase 2 storage-mitigation paths (SLICE 2+ roadmap; NOT Phase 2 activation gates):**

**Candidate 1 — Diagonal-only Family C covariance variant.**
R16 Item 3 finding: at d=100, full covariance (d×d matrix) dominates the per-cell footprint. A diagonal-only variant (store d scalars instead of d² entries) would reduce ratio ~40× at d=100 (from 1006.5× to approximately 25×) — a tractable floor. Tradeoff: breaks Hotelling T² semantics for the Family C MMD betting-e-process (T² requires full covariance for the test statistic). Requires Architect-level pair-review (PR-F9 candidate) before activation. Implementation changes `PerShardResidual.welford_state` from `WelfordState` (d×d `m2`) to a diagonal variant; semantics impact requires Reviewer scrutiny on inherited Family C correctness. Trigger: real-cluster footprint at target N becoming operationally infeasible (>10K GPUs × default cell+signal configs ≈ 800 MB+ aggregate across fleet; shard definition: 1 shard = 1 GPU rank per `SCOPING-MEMO-v0.3.md` § 1.7).

**Candidate 2 — Cross-shard sharing of common fleet baseline.**
Under Extension 3 cross-shard correlation infrastructure (Phase 2), the fleet-aggregate portion of each per-shard baseline may be de-duplicated: instead of N copies of the same fleet prior, shards reference a single shared structure. In the current compiled-config schema, `per_shard_cells` stores full `PerShardResidual` per shard (including fleet-aggregate fallback fields). Phase 2 SLICE 2+ could restructure to store shared fleet prior once + per-shard deltas only. Reduction: eliminates N-1 copies of the fleet-prior portion; saves roughly fleet-baseline-size × (N-1) ≈ 67.9 KB × 999 ≈ 68 MB at N=1000. Tradeoff: requires schema migration + more complex deserialization. Trigger: same as Candidate 1.

**Activation classification under (β):** Both candidates are Phase 2 SLICE 2+ roadmap items. Neither is a Phase 2 activation gate. Phase 2 SLICE 1 proceeds with the empirically-measured storage profile (≈N× per-shard, linear scaling confirmed by AC-R14-10). If real-cluster deployment at N > 1000 surfaces operational infeasibility, a future round activates one or both candidates via Architect-gated spec.

---

## 7. Open for operator (R15 close-walk surfaced)

The following temptations surfaced during R15 close-walk authoring. Each entry: (a) temptation, (b) halt rationale, (c) deferral.

**PR-F5 v0.3 § 2.2 architectural-revision temptation.** During § 1.2 SLICE 2 narrative and § 5 outstanding-gaps enumeration, the Implementer was tempted to amend `SCOPING-MEMO-v0.3.md` § 2.2's storage-prediction claim ("at N=10000 with sparse residual encoding, total ≈ 1.2-1.5× single-instance footprint") to reflect the empirical 1237.7× finding. Halt rationale: R15-SAS-11 explicitly forbids SCOPING-MEMO-v0.3.md modification; `NEXT-ROLE.md` :82-83 identifies this as a halt temptation. Deferral: TQ-1 documented in § 5 + § 6 above; the architectural revision is operator-gated.

**Memorial-D state-stamp accounting drift (partially surfaced).** During § 3 close-walk narrative and Deliverable 2 tally, the Implementer encountered the R02 ARCHITECT violation labeled "pre-emit-grilling" but with description explicitly stating "Sub-instance of MD-F6." The classification was resolvable without ambiguity (the sub-instance designation is explicit), but the finding contradicts the Architect's pre-prediction of 0 MD-class violations. Halt rationale: per § 6 halt condition (a), ≥1 MD-class finding requires a DIAGNOSTIC for operator visibility. Deferral: `DIAGNOSTIC-R15-memorial-d-delta.md` written; R15 proceeds per the "empirically valid, AC-8 still passes" parenthetical in halt condition (a).

**Vendored-at-pin SHA drift.** No drift surfaced. All 40 on-disk files verified YES at SHA `5a72371`. This temptation entry confirms the expected no-drift outcome per § 6 halt condition (b) pre-prediction; no deferral needed.

_None beyond the architect-pre-predicted entries above._
