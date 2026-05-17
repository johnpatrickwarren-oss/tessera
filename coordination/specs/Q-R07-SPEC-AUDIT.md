# Q-R07-SPEC-AUDIT — Architect ceremony sidecar

_Sidecar to `Q-R07-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked / why-rejected, pre-route discipline application, architect pre-predictions, Q-JC4/4a/4b/4c/5 disposition mapping, ≥3 e-process formulation enumeration per Memorial D pair-review-novel-literature discipline (NEXT-ROLE.md PR-F8 mandate), and Q-R07 → Q-R08+ sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_HEAD at audit-sidecar emit: `a692255` (chore(R07) NEXT-ROLE.md preparation; R06 close-state code-tree at `377fbb3` GREEN + `0689681` SHA-recording)._

---

## Brainstorm

5 distinct R07 approaches enumerated and weighed. The dominant decision axes are: (i) file structure (modify R06's pre-pass.ts vs new file); (ii) e-process formulation (sequential betting vs plug-in vs universal portfolio vs GROW); (iii) curation policy on fire (single-fire vs blockwise reset).

### Approach A — New file `tools/curate-baseline-fleet-correlated.ts` with sequential betting-adaptive e-process + single-fire-per-bundle — SELECTED

**Strengths:** 
- Clean architectural separation: R06's `curate-baseline-pre-pass.ts` preserved bit-identical at R07 (no risk of regressing R06's AC-1..AC-13).
- File-purpose discipline: each Tessera-native file owns ONE stage (R06 file = Stage 2a; R07 file = Stage 2a + Stage 2b + Stage 3b combined).
- Q-JC4 disposition (sequential e-process) directly bound to the family-c-betting-e-process.ts canonical ONS pattern — pair-review surface reduced because the inherited pair-review at family-c-betting-e-process.ts is already validated.
- Q-JC4a (β betting-adaptive) directly satisfied by ONS update mirroring the inherited pattern.
- Q-JC4b (Bayesian shrinkage with disjoint training prefix) is a closed-form computation; deterministic + testable + the disjoint-data construction makes Ville-bound martingale property hold by construction.
- Q-JC4c (separate pipe from Q-J1 e-BH) automatically satisfied: FCP-1 is calibration-time only; no runtime detector coupling.
- Q-JC5 (residual_seed_hash sentinel wire format) directly bound to a deterministic string format incorporating bundle identity + FCP-1 audit token; R03 reset semantic at warm-start.ts:74-75 will trigger when sentinel differs from any pre-FCP-1 hash.
- Single-fire-per-bundle preserves anytime-valid Ville bound at strict α_fleet.
- PR-F8 evidence matrix testable via deterministic-seed mulberry32 + Bernoulli synthesis (no MCD invocation needed for empirical FPR/power); test runtime sub-second.
- Zero new vendoring + zero new npm deps + zero pre-R07 file modification (smallest R07 surface possible).
- TDD-verifiable (RED test file → GREEN production file).
- Re-uses ALL Q-J1..Q-J5 + Q-JC1..Q-JC6 dispositions; no new architectural decisions required at R07 (only their implementation-level realizations).

**Weaknesses:** 
- Code duplication: per-run MCD screening logic appears in BOTH R06's curateBaselinePrePass AND R07's screenRunMask helper (~30 lines). The duplication is intentional but is a discipline-aware trade-off (clean architectural separation vs DRY).
- Single-fire-per-bundle cannot detect MULTIPLE distinct fleet events within one bundle (OQ-1 surfaces this for future cycles). At Phase 1 SLICE 5, this is acceptable — a single-event detector is the floor capability.
- The `output_summary: Record<string, number | string | boolean>` inherited type constraint forces fire_window to be encoded as `-1` for null + arrays to be JSON-string-encoded. Slightly awkward; documented at primitive 8 + AC-19 + AC-20.
- Architect cannot run the e-process at spec-authoring time (role boundary) → AC-11/12/13/16 architect predictions are predictions, not verified counts. Implementer reports OBSERVED at GREEN per R03 MINOR-4 reinforcement.

**Hidden assumptions:** 
- That R03's residual_seed_hash reset semantic (warm-start.ts:74-75) accepts ANY string format change. Verified by reading the reset logic: `current.residual_seed_hash !== obs.residualSeedHash` — pure string comparison; any change triggers reset.
- That `tools/calibrators/family-c.ts` exports (fastMCD + mahalanobisSqFromL + chiSqQuantile975 + FASTMCD_DEFAULT_ALPHA + FASTMCD_DEFAULT_SEED) are stable and direct (no re-export). Verified at SHA 5a72371 vendored line numbers (542, 392, 362, 455, 456) per R03-derived re-export-chain-check.
- That `tools/calibrators/_shared.ts` exports `choleskyLocal` directly. Verified at vendored line 31.
- That the inherited `BaselineCurationDecision.output_summary` type (`Record<string, number | string | boolean>`) accommodates R07's D12/D13 emissions with the `-1` for null + JSON string encoding. Verified by inspection of config.ts:245 + R07-side encoding choices.
- That ONS update on F_w ∈ [-p_base, 1 - p_base] doesn't have a numerical-stability issue under the canonical step size. Verified by reading the inherited family-c-betting-e-process.ts onsUpdate function — same step size + same numerical guard (|denom| < 1e-12 skip) suffices.
- That mulberry32 + integer-arithmetic Bernoulli sampling is cross-platform-deterministic. Verified by precedent at family-c-rff.ts (mulberry32 + Box-Muller cross-platform-deterministic per existing comments).

**Risks:** 
- Reviewer flags the code duplication (R06's per-run MCD logic vs R07's screenRunMask) as a discipline failure (DRY violation). Mitigated by explicit documentation at primitive 1 + audit sidecar (trade-off rationale: architectural separation worth ~30 lines of duplicated mechanical code).
- AC-8 / AC-16 architect-prediction fire_window values diverge from observed. Mitigated by AC-design choice to bind BEHAVIORAL properties (fired === true; fire_window !== null) rather than specific window indices (per R06 inequality-bound precedent + R06 OBS-1 spec-prediction tactical-fix precedent).
- AC-11 H₀ FPR > 0 when architect predicted 0. Mitigated by AC binding OBSERVED count; spec-prediction error tolerated as tactical fix (R06 OBS-1 precedent).
- R06 MINOR-3 reinforcement (public opts field coverage) requires every Fcp1Opts field to have either a binding AC or documented rationale. Mitigated by explicit enumeration in spec § Grilling standing-reinforcement table row 16 — every opts field accounted for.

**Verdict:** SELECTED. The clean architectural separation + reuse of vendored estimator surfaces + Q-JC disposition-binding properties dominate; the code-duplication trade-off is acknowledged and documented.

### Approach B — Refactor R06's `tools/curate-baseline-pre-pass.ts` to extract shared helper + add FCP-1 entry point to the SAME file — REJECTED

**Strengths:** 
- Eliminates the per-run MCD logic duplication.
- Single-file responsibility for "all baseline curation pre-passes."

**Weaknesses:** 
- Modifies R06's shipped public API surface (even if additively): the file's diff at R07 GREEN would include changes to R06's lines + new helper extraction. Reviewer needs to verify R06's AC-1..AC-13 still hold (additional cognitive load + regression risk).
- Refactor inherently risks behavior drift; even if functionally equivalent, subtle differences (e.g., ordering of internal counter accumulation) could break a deep test invariant.
- Violates the file-purpose principle (R06 file = Stage 2a; refactoring also makes it Stage 2b host).

**Hidden assumptions:** That R06's behavior can be PERFECTLY preserved through refactor. Counter: the R03 MINOR-1 case (R03 test fixture insufficiency due to spread-based reset) demonstrates that even "functionally equivalent" refactors can change observable test behavior in subtle ways.

**Verdict:** REJECTED. The DRY benefit doesn't outweigh the R06-regression risk. Approach A's code duplication is a fair price for surface stability.

### Approach C — Plug-in fixed-alternative likelihood ratio (no betting; explicit p_alt parameter) — REJECTED (e-process formulation level)

**Strengths:** Simplest possible formulation. e_w = L(X_w | p_alt) / L(X_w | p_base) computed directly.

**Weaknesses:** 
- Q-JC4a disposition explicitly rejects uniform-mixture (α) for power degradation reasons. Plug-in fixed p_alt is the same anti-pattern.
- Operator must pre-specify p_alt; brittleness in mid-deployment.
- Doesn't reuse the inherited family-c-betting-e-process pair-review work.

**Hidden assumptions:** That a single fixed p_alt captures the relevant alternative class. Counter: real fleet events have varying magnitudes; betting-adaptive automatically explores the alternative class.

**Verdict:** REJECTED at formulation level (Q-JC4a disposition).

### Approach D — Universal portfolio (Cover 1991-style) over the (p_alt, p_base) simplex — REJECTED (e-process formulation level)

**Strengths:** 
- Minimax-optimal regret bound (Cover 1991, Cesa-Bianchi-Lugosi 2006).
- Tighter than ONS in low-data limit (small W).

**Weaknesses:** 
- Novel literature surface (Memorial D pair-review-novel-literature trigger fires); no inherited engine pair-review to reuse.
- Substantially more complex implementation (Dirichlet integration / numerical quadrature).
- Q-JC4a explicitly picks (β) betting-adaptive ONS as the inherited-pattern reuse path.

**Hidden assumptions:** That UP's tighter regret matters for R07's W=200 scale. Counter: at W=200, ONS regret bound is already O(log W) ≈ 5.3; UP improvement is marginal.

**Verdict:** REJECTED at formulation level (Q-JC4a + novel-pair-review trigger).

### Approach E — Conditional p_base estimation (predictable update per window) — REJECTED (estimation strategy level)

**Strengths:** 
- Data-efficient: every window contributes to p_base estimation AND to the test.
- Q-JC4b disposition explicitly mentions this as one of the two valid routes (disjoint training prefix OR conditional construction).

**Weaknesses:** 
- More complex implementation: p_base evolves per window; each window's wealth update uses the current p_base estimate; martingale property requires careful F_{w-1}-measurability arguments.
- Higher novelty surface: while still satisfying Q-JC4b LOAD-BEARING constraint, the conditional construction is non-trivial to verify (martingale-property proof requires careful conditioning structure).
- For Phase 1 SLICE 5 (bounded scope), the disjoint-data approach is simpler, equally Ville-bound-valid, and easier to test.

**Hidden assumptions:** That data efficiency matters at the W=200 scale tested in PR-F8. Counter: at W=200 with K=10 (5% training cost), the data loss is minimal; the simplicity benefit dominates.

**Verdict:** REJECTED at estimation strategy level. Disjoint training prefix picked for SLICE 5 simplicity (D-R07-5 + R07-SAS-17).

### Tier-rubric verdict

Per anchor `templates/PRD-TEMPLATE.md` Round-Scaling skill 11 (CLAUDE-COMMON.md `# ── TIER SELECTION` section) walked top-down:

- **A1 (new external dependency)?** NO — zero new npm deps; only re-use of R06-vendored estimator surfaces + node-stdlib (test file only).
- **A2 (new architectural pattern with no precedent in the codebase)?** YES — first Tessera sequential e-process construction beyond the inherited per-cell betting (the inherited `family-c-betting-e-process.ts` operates on per-cell observations; FCP-1 operates on per-fleet-time-window contamination counts — different abstraction layer, same algorithmic primitive).
- **A3 (unresolved open question that this round must resolve)?** NO — all 9 Q-JC dispositions already John-confirmed at the R05 pre-disposition gate.
- **A4 (novel data model)?** NO — Fcp1State + opts interfaces are local typedefs, not schema additions.
- **A5 (critical NFR ties)?** PARTIAL — the Ville-bound FPR property is critical and depends on correct disjoint-data construction (Q-JC4b LOAD-BEARING).
- **A6 (large blast radius)?** NO — R07 modifies ZERO pre-R07 files; blast radius bounded to 2 new files.
- **A7 (first-time territory)?** YES — first Tessera fleet-correlated detection pair-review (PR-F8 mandatory per scoping memo).

A factors firing: A2 + A7 (plus A5 PARTIAL). Per the rubric, ANY A factor firing → **full tier**. NEXT-ROLE.md specifies `--tier full` per A1+A7; R07 architect-verified per A2+A7 (A1 verdict differs but full tier is correct either way).

Verdict: **full tier** (Architect + Implementer + Reviewer + Memorial Updater pipeline). NEXT-ROLE.md routing preserved.

---

## E-process formulation enumeration (per NEXT-ROLE.md PR-F8 mandate + Memorial D pair-review-novel-literature discipline)

The NEXT-ROLE.md mandate "Architect must enumerate ≥3 e-process formulations with rejection rationale" is satisfied by formulations C, D, E above PLUS the PICKED formulation A. Total = 4 formulations enumerated; 1 PICKED; 3 REJECTED with documented rationale.

**Cross-reference to inherited Memorial D state (22V/8C at v0.2 memo emit per pre-disposition artifact):** R07's enumeration confirms the betting-adaptive ONS path (Approach A) reuses the existing pair-review work at engine/detectors/family-c-betting-e-process.ts (pair-reviewed via the Q67 SPEC Phase-3.d.B cycle per the file's header docstring). No NEW novel-literature pair-review trigger fires at R07 because the e-process pattern is inherited; what's NEW at R07 is the APPLICATION of the pattern to cross-shard contamination counts (a different abstraction layer). PR-F8 evidence matrix validates this APPLICATION-LAYER novelty.

---

## Decision rationale

| Decision-ID | Decision | Why picked | Why alternatives rejected |
|---|---|---|---|
| D-R07-1 | New file `tools/curate-baseline-fleet-correlated.ts`; R06's pre-pass.ts preserved bit-identical | Architectural separation: each file owns ONE stage; R06 AC-1..AC-13 regression-risk zero; trivial Reviewer diff | Approach B (refactor R06): R06 AC-regression risk + violates file-purpose principle |
| D-R07-2 | Internal helper `screenRunMask(run, mcdAlpha, mcdSeed)` (non-exported) | Single-responsibility helper called once per run in `curateBaselineFleetCorrelated`; non-exported because no other caller needs it | Exported helper: would expand the R07 public surface unnecessarily |
| D-R07-3 | Cross-shard window alignment = MIN length across SCREENED runs | MIN ensures every aggregated window has the same N contributing shards (no zero-pad bias); SKIPPED runs excluded from N | Maximum + zero-pad: inflates clean count at tail → biases toward false-negative |
| D-R07-4 | X_w = Σ over SCREENED runs only | Skipped runs have no mask data → cannot contribute meaningful info; treating them as "all clean" or "all contaminated" both bias the test | Include skipped as all-clean: bias toward false-negative; include as all-contaminated: bias toward false-positive |
| D-R07-5 | Bayesian shrinkage `p_base` with disjoint training prefix (Q-JC4b LOAD-BEARING) | Disjoint data construction makes martingale property hold by construction; Bayesian shrinkage adds small-fleet stability per Q-JC4b | Plug-in same-data: invalidates Ville bound (CRITICAL-class); Conditional construction (Approach E): more complex without empirical demand |
| D-R07-6 | Sequential betting-adaptive e-process mirroring family-c-betting-e-process.ts ONS update | Q-JC4a (β) disposition; reuses inherited pair-review; canonical Shekhar-Ramdas-2023 pattern; well-understood numerical properties | Plug-in fixed p_alt (Approach C): brittleness; Universal portfolio (Approach D): novel pair-review trigger |
| D-R07-7 | Single-fire-per-bundle; no post-fire wealth reset | Preserves strict Ville bound: P_H₀(∃w : S_w ≥ 1/α_fleet) ≤ α_fleet | Blockwise reset: converts to Bonferroni-equivalent at k·α_fleet → FPR meaningless at large W |
| D-R07-8 | Stage 2b drops fire_window from ALL runs' signal_series (Layer 2 on top of Stage 2a Layer 1) | Per memo § 2 Stage 2b "curate that window out from ALL shards' baselines (not just the masked-out shards)" | Drop only from masked runs: defeats Stage 2b's cross-shard correlation semantic |
| D-R07-9 | curateBaselineFleetCorrelated emits D11 + D12 + D13 together | Single-pass execution; caller gets the full audit trail in one call | Caller invokes curateBaselinePrePass + curateBaselineFleetCorrelated separately: re-runs MCD twice; risk of inconsistent D11 between calls |
| D-R07-10 | D13 wire-format = `'tessera-fcp1-v1::' + version + '|' + seed + '::fcp1:fired=' + bool + ':windows=' + JSON.stringify(...)` | Deterministic; distinct prefix ensures sentinel ≠ any pre-FCP-1 hash; bundle-identity segment distinguishes different bundles; FCP-1 audit token segment distinguishes fired vs not-fired | Hash of baseline content: requires hash-algo choice (introduces new dep); UUID: non-deterministic across invocations (breaks AC-21); reuse R06 D11 token: doesn't include FCP-1 outcome |
| D-R07-11 | PR-F8 split between algorithm-binding ACs (deterministic step-trace) + empirical-evidence ACs (deterministic-seed small-N simulation) + martingale-property AC (analytic) | Allows Reviewer to verify both implementation correctness AND statistical property separately; small-N simulation runtime sub-second | Pure empirical large-N simulation: test runtime > minute; pure algorithm-binding (no empirical): fails PR-F8 mandate from NEXT-ROLE.md |

---

## Pre-route discipline application

### Skill 14 (PRD-conjunction-cross-check, symmetric)

R07 spec preamble explicitly traces to PRD AC-P1 (fleet-FPR ≤ q·K via FCP-1 Ville-bound) + AC-P2 (warm-start invalidation via Stage 3b wire format). Neither PRD AC is widened OR narrowed by R07:
- AC-P1: FCP-1 provides the FLEET-LEVEL Ville-bound that the inherited per-shard runtime e-BH (Q-J1) cannot provide alone (per-shard detectors test individual shards; FCP-1 tests cross-shard correlated contamination at the baseline-curation layer). The Q-JC4c separate-pipe disposition preserves Q-J1's role.
- AC-P2: Stage 3b wire format specifies the residualSeedHash value that downstream consumers (R08+) use to trigger the R03-shipped warm-start reset semantic. The "warm-start cell_confidence enables alerts within 20 per-shard samples" property is NOT modified by R07 (R03 substrate untouched per R07-SAS-1 / R07-SAS-19). R07 specifies the OFFLINE wire format; the runtime reset is preserved.

Symmetric check: R07 does NOT narrow any PRD conjunct. The literal numeric thresholds 20 + 60 (R03-shipped WARM_START_THRESHOLD + STRICT_UPGRADE_THRESHOLD) preserved verbatim — R07 doesn't touch per-shard runtime substrate (R07-SAS-1).

### Skill 15 (prescription-to-AC coverage)

Every prescription in § Mechanism + § Per-file pseudocode binds to ≥1 AC:
- Primitive 1 (R06 file preservation) → R07-SAS-5 + AC-24 (pre-R07 regression).
- Primitive 2 (screenRunMask helper) → AC-1 + AC-2 + AC-3 + AC-4 + AC-17.
- Primitive 3 (cross-shard alignment) → AC-17.
- Primitive 4 (X_w aggregation) → AC-15 + AC-16 + AC-17.
- Primitive 5 (Bayesian shrinkage p_base) → AC-7.
- Primitive 6 (sequential ONS e-process) → AC-5 + AC-6 + AC-8 + AC-9.
- Primitive 7 (single-fire-per-bundle) → AC-8 (fired = true) + R07-SAS-20 (no reset).
- Primitive 8 (Stage 2b curated bundle drops fire_window) → AC-15 (no drop when not fired) + AC-16 (drop when fired).
- Primitive 9 (D11 + D12 + D13 emission) → AC-18.
- Primitive 10 (D13 wire format) → AC-20 + AC-21.
- Primitive 11 (PR-F8 split) → AC-11 + AC-12 + AC-13 + AC-14.

Every AC binds to ≥1 prescription. No orphan ACs; no orphan prescriptions.

### Memorial F sub-rule application

- **F sub-rule 1** (compile-time substrate multi-read-paths): R07 D12 + D13 emissions are NEW producers for the existing `CompiledConfig.baseline_curation_pipeline_diagnostics` field (existing consumers: R06 emits D11; the inherited engine emits D1-D4 + future D5-D10 NotImplementedError stubs). The `Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>` typing accommodates additive D12 + D13 keys without modifying any existing producer or consumer. Step-0-grep of consumers: no consumer code currently reads from `baseline_curation_pipeline_diagnostics` at R07 (the field is operator-inspection only; CompiledConfig is built but the field is not read by any runtime detector). Sub-rule 1 cleanly satisfied.
- **F sub-rule 2** (MERGE-vs-REPLACE substrate-stamped-fields-preservation): R07 D11/D12/D13 are additive; no D1-D10 modification. R07's D11 emission has the SAME field shape R06's D11 emission has (verified by inspection of Delta 1 pseudocode vs R06 file lines 154-180); downstream consumers cannot distinguish R06-emitted vs R07-emitted D11.
- **F sub-rule 3** (ADR-anti-scope-preservation): all SCOPING-MEMO-v0.3 anti-scope clauses (A1-A17) preserved. All SCOPING-MEMO-BASELINE-CURATION-v0.2 anti-scope clauses (A-C1 through A-C5) preserved (R07-SAS-9 fences SR/RPCA/BOCPD; R07-SAS-2 fences schema modification of D1-D10; R07-SAS-1 / R07-SAS-7 fences runtime + inherited engine internals; R07 does NOT implement D5-D10 stubs; no UI).
- **F sub-rule 4** (Pre-existing-property-vs-new-AC coherence): Ville-bounded per-shard FPR (Q-J1 hybrid disposition) preserved. FCP-1 detection is a baseline-curation input filter (calibration-time), not a runtime detector-output filter — Q-JC4c separate-pipe disposition.

### Compilation-dependency enumeration (R01 MAJOR-3 reinforcement)

New file `tools/curate-baseline-fleet-correlated.ts` import dependencies (R07-SAS-3 zero-new-npm-deps applies):
- `engine/types/config` (3 type-only imports: BaselineBundle, BaselineCurationDecision, BaselineCurationDecisionId; all already vendored at HEAD `a692255`; verified at config.ts:399, 227, 214).
- `tools/calibrators/family-c` (5 imports: fastMCD, mahalanobisSqFromL, chiSqQuantile975, FASTMCD_DEFAULT_ALPHA, FASTMCD_DEFAULT_SEED; all R06-vendored at HEAD `a692255`; verified at family-c.ts:544, 392, 362, 455, 456).
- `tools/calibrators/_shared` (1 import: choleskyLocal; R06-vendored at HEAD `a692255`; verified at _shared.ts:31).
- Total: 9 application-identifier imports (3 type-only + 5 function/constant + 1 function); ZERO new npm dependencies.

Test file `test/q07-fleet-correlated.test.ts` imports:
- `node:test` (stdlib).
- `node:assert/strict` (stdlib).
- `../engine/types/config` (2 type-only imports: BaselineBundle, BaselineCurationDecision).
- `../tools/curate-baseline-fleet-correlated` (6 imports: 2 functions + 4 types).
- Total: 10 application-identifier imports (2 stdlib + 2 type-only engine + 6 production file); ZERO new npm dependencies.

R07-SAS-4 explicitly fences calibrate.ts dep closure (Q-JC1 carry-forward); typecheck must succeed without any additional vendoring.

---

## Architect pre-predictions (R07-specific)

For Reviewer-side adversarial verification at R07 close, the architect explicitly predicts likely Reviewer findings + their dispositions:

| # | Predicted finding class | Likely Reviewer severity | Architect disposition |
|---|---|---|---|
| 1 | Code duplication: R07's screenRunMask vs R06's curateBaselinePrePass inline MCD loop | MINOR | DOCUMENTED (primitive 1 + audit sidecar D-R07-1 trade-off rationale); not a regression |
| 2 | AC-8 / AC-16 fire_window value diverges from architect-predicted (Implementer's OBSERVED value is the authoritative) | OBS (informational) | AC binds BEHAVIORAL property (fired === true); not the specific window; spec-prediction tactical-fix precedent applies (R06 OBS-1) |
| 3 | AC-11 H₀ FPR > 0 (architect predicted 0; actual e.g., 1 or 2 fires) | OBS (informational) | AC binds OBSERVED count; spec-prediction tactical-fix |
| 4 | `lambdaMax` opts field has no DIRECT binding AC (only implicit via default-value behavior in AC-6) | MINOR | DOCUMENTED in standing-reinforcement table row 16 — implicit binding via AC-6's use of default opts.lambdaMax = 0.5 |
| 5 | `mcdAlpha` + `mcdSeed` opts fields have no direct R07-side binding ACs (inherited R06 MINOR-3 coverage gap) | MINOR | DOCUMENTED in standing-reinforcement table row 16 — sibling-of-binding-opts gap inherited from R06; not silently inherited |
| 6 | Stage 2b drop on a SKIPPED run whose original signal_series length < fire_window: edge case behavior not bound by an AC | OBS or MINOR | DOCUMENTED at primitive 8 + grilling assumption 3 — no-op for that run; behavior is safe + intentional |
| 7 | FCP-1 e-process formulation enumeration in audit sidecar may be Reviewer-flagged as insufficient pair-review evidence | MINOR or OBS | NEXT-ROLE.md mandate explicitly requires ≥3 formulations; audit sidecar enumerates 4 (1 picked + 3 rejected); Memorial D state preserved at 22V/8C (no new novel-literature trigger fires per the inherited pattern argument) |
| 8 | `output_summary` encoding of fire_window as -1 (not null) is non-idiomatic | OBS | DOCUMENTED at primitive 8 implementer note + AC-19 + grilling assumption 5 — inherited type constraint forces this encoding |
| 9 | AC-23 q07 in-file test count pre-stated at 21 | OBS (informational) | DOCUMENTED — structurally pre-determined by the spec's AC-1..AC-21 bindings (per R03 MINOR-4 reinforcement: pre-stated counts OK when structurally determined) |
| 10 | R06 MINOR-1 (stale JSDoc at config.ts:228) not closed in-passing at R07 | OBS | DOCUMENTED at R07-SAS-2 — explicitly out of scope; future-round mop-up |

Pre-prediction confidence: HIGH on items 1-3 (recoverable; spec-design intentional), MEDIUM on items 4-7 (Reviewer-discretion findings), HIGH on items 8-10 (well-documented).

---

## Memorial sweep (R07 architect-side)

Standing CLAUDE-ARCHITECT.md + CROSS-PROJECT-MEMORIAL.md reinforcements applied:

- **R01 cross-section consistency pass** (7th consecutive Tessera application): 18 resolved-decision checks; all PASS. Documented in spec § Cross-section consistency pass.
- **R02 type-declaration-site discipline** (6th consecutive Tessera application): all 9 cross-module imports (engine/types/config + tools/calibrators/family-c + tools/calibrators/_shared) opened at their DECLARATION sites; line numbers cited.
- **R02 file-creation track-state discipline** (5th consecutive Tessera application): `git ls-files` verified absence at HEAD `a692255` for both R07-created paths.
- **R03 re-export-chain-check discipline** (4th consecutive Tessera application): all 9 imports verified as direct exports (no re-export indirection).
- **R03 grep-pattern-soundness discipline** (4th consecutive Tessera application): AC-26 grep pattern soundness analyzed (executable-vs-comment distinction documented).
- **R03 empirically-verified-test-count discipline** (4th consecutive Tessera application): AC-24 directs OBSERVED reporting; AC-23 pre-stated count 21 is structurally pre-determined; AC-11/12/13/16 architect-prediction is OBSERVED-binding at GREEN.
- **R05 narrative-vs-pseudocode AC-count cross-check** (2nd Tessera application; R06 was 1st): Component inventory + per-file pseudocode + AC-23 + P3 Coverage row all agree on count===21.
- **R12 brainstorm-re-evaluation reinforcement** (2nd Tessera application; R06 was 1st): R07 does NOT re-select any R06 brainstorm-rejected approach; inherits R06's Q-JC1 narrowing (deferred calibrate.ts vendoring); no new re-evaluation block needed.
- **R06 JSDoc scope grep reinforcement** (1st Tessera application of the NEW R06-derived reinforcement): R07 modifies ZERO existing files (no delta prescriptions with line-range scope); no stale-text-in-secondary-occurrence risk.
- **R06 public opts field coverage reinforcement** (1st Tessera application of the NEW R06-derived reinforcement): all 7 Fcp1Opts + FleetCorrelatedOpts fields enumerated; coverage status explicitly documented in standing-reinforcement table row 16 (4 bound directly; 1 bound implicitly via AC-6; 2 inherit R06's MINOR-3 coverage gap with documented rationale).

---

## Q-R07 → Q-R08+ sequencing context

R07 closes Phase 1 SLICE 5 (Stage 2b + Stage 3b + PR-F8). Remaining Phase 1 work for Phase 1 close:

1. **R08+ — calibrate.ts wiring round.** Vendor `tools/calibrate.ts` + its dep closure (per R06-SAS-1 deferral / R07-SAS-4 carry-forward); wire `curateBaselineFleetCorrelated` into calibrate.ts main(); consume D13's `residual_seed_hash_sentinel` as the new `residualSeedHash` value for warm-start invalidation. Scope: ~15+ vendored files + 1 new npm dep (`js-yaml`) + significant test substrate. May need to split across multiple rounds per R01 lesson.

2. **R08+ optional — SLICE 6 SR/RPCA/BOCPD additions.** ONLY if PR-F8 evidence at R07 close shows FCP-1 + Stage 2a leave a measurable gap in real GPU-cluster traces. Q-JC6 explicitly says no speculative bundling.

3. **R08+ optional — multi-fleet-event detection.** Per OQ-1, deferred until empirical demand. Future-round options: block-wise reset (explicit Bonferroni); spend-policy variant; sliding-window e-process.

4. **R08+ optional — R06 + R07 MINOR mop-up.** R06 MINOR-1 (stale JSDoc at config.ts:228 still references "(D1-D10)" post-D11/D12/D13 union extension). R06 MINOR-2 (stale comment header at q01-no-at-pin-deltas.test.ts:7-9). R06 MINOR-3 / MINOR-4 / R07 inherited gaps. Single follow-up round can close all in <30 min.

5. **Phase 1 close walk.** Once SLICE 6 dispositioned (either shipped or deferred), Phase 1 close walk per SCOPING-MEMO-v0.3 § Success metrics: 5-SLICE aggregation; α-budget formal-property regression evidence; PR-F1 + PR-F2 + PR-F8 evidence matrices; re-pin discipline per SCOPING-MEMO § 9.

---

_Audit sidecar emit complete; spec ready for IMPLEMENTER routing. Memorial D state at R07 spec-emit time: 22V/8C (no increment — no novel-literature pair-review trigger fires per the inherited-pattern argument at § E-process formulation enumeration). PR-F8 trigger remains armed (fires at R07 close-walk when q07 test results land). All 18 applicable standing reinforcements addressed per § Memorial sweep._
