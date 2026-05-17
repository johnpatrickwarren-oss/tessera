# Q-R07-SPEC — Tessera Phase 1 SLICE 5: Stage 2b FCP-1 fleet-correlated-pattern primitive + Stage 3b warm-start eligibility tagging + PR-F8 pair-review evidence matrix

_From: Architect (R07 pipeline run; full tier per A1 + A7 — see audit sidecar § Brainstorm tier-rubric verdict)._
_To: Implementer._
_Date: 2026-05-16._
_HEAD at spec emit: `a692255` (chore(R07) NEXT-ROLE.md preparation; R06 close-state code-tree at `377fbb3` GREEN + `0689681` SHA-recording)._
_Audit sidecar: `coordination/specs/Q-R07-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked / why-rejected, pre-route discipline application, architect pre-predictions, Q-JC4/4a/4b/4c/5 disposition mapping, e-process formulation enumeration per Memorial D pair-review-novel-literature discipline)._

---

## Spec preamble

R07 = Phase 1 SLICE 5 = three stages per operator-set scope (`coordination/NEXT-ROLE.md` + companion scoping memo § 2 + 9-Q-JC pre-disposition committed at SHA `aee274c`):

1. **Stage 2b — Fleet-correlated-pattern primitive (FCP-1).** New Tessera-native entry point `tools/curate-baseline-fleet-correlated.ts` that consumes a `BaselineBundle`, runs Stage 2a per-shard MCD screening (re-using vendored `fastMCD` + `mahalanobisSqFromL` + `chiSqQuantile975` + `choleskyLocal` — same surfaces R06 used), aggregates per-(shard, tick) contamination masks into per-window counts `X_w = Σ_s M[shard, w]`, runs a sequential betting-adaptive e-process (mirroring `engine/detectors/family-c-betting-e-process.ts` ONS update pattern at lines 231-244), declares window `w` fleet-event-contaminated when running wealth `S_w ≥ 1/α_fleet` (Q-JC4 disposition), and emits `BaselineCurationDecision` audit record at decision-id `D12` (reserved at R06 Delta 1).

2. **Stage 3b — Warm-start eligibility tagging.** The FCP-1 detection result drives an opaque sentinel string emitted at decision-id `D13` (reserved at R06 Delta 1). The sentinel is the wire format that downstream consumers (R08+ calibrate.ts wiring) use as the new `residualSeedHash` value when emitting samples against the FCP-1-curated bundle. Per Q-JC5 disposition: R07 does NOT modify `engine/per-shard/warm-start.ts` runtime detection — the R03-shipped seed-mismatch reset semantic (`current.residual_seed_hash !== obs.residualSeedHash` at warm-start.ts:74-75) is the load-bearing runtime mechanism. R07 only specifies the OFFLINE wire-format string so the future R08+ wiring produces a sentinel that differs from any pre-FCP-1 hash, forcing the R03 reset.

3. **PR-F8 pair-review evidence matrix.** Synthetic-fleet H₀ (per-shard masks independent under `p_base`) + injected-fleet-event H₁ (per-shard masks correlated under `p_alt > p_base`) test fixtures, bound via deterministic-seed `runFleetCorrelatedEProcess` invocations. AC-bound: empirical FPR ≤ deterministic upper count on H₀ fixtures; power ≥ deterministic lower count on H₁ fixtures; martingale property hand-traced on a synthesized H₀ sequence. ≥3 e-process formulations enumerated in audit sidecar § Brainstorm; PICKED rationale documented; REJECTED rationale documented.

R07 explicit anti-scope (deferred per operator-set scope + Q-JC dispositions): vendoring of `tools/calibrate.ts` or its dep closure (R06-SAS-1 carry-forward per Q-JC1 brainstorm-re-evaluation deferral; R08+ scope); wiring of FCP-1 output into `calibrate.ts` main() (R08+ scope when calibrate.ts is itself vendored); modification to `engine/per-shard/{warm-start, welford, runtime}.ts` (R03/R04/R05-shipped runtime substrate untouched at R07 per Q-JC5 disposition — runtime mechanism is preserved; R07 only adds the OFFLINE wire-format string); Spectral Residual / Robust PCA / BOCPD additions (R08+ conditional per Q-JC6); joint e-BH coupling with per-shard runtime detectors (Q-JC4c α — separate-pipe disposition; FCP-1 is calibration-time only); plug-in `p_base` estimation from same-data being tested (Q-JC4b LOAD-BEARING constraint — would invalidate Ville bound; spec uses disjoint-data training prefix); post-fire wealth reset across detected events (would inflate FPR beyond Ville bound via implicit Bonferroni; single-fire-per-bundle is the R07 binding); modification to R06-shipped `tools/curate-baseline-pre-pass.ts` (preserved bit-identical at R07; new file `tools/curate-baseline-fleet-correlated.ts` adds the FCP-1 surface independently); modification to inherited vendored engine internals (A12 carry-forward); modification to vendored-at-pin tools/curate-baseline-pipeline.ts + tools/calibrators/{family-c, _shared}.ts (R06-SAS-9/10 carry-forward).

The architectural-layer split is the same successful pattern R02 → R03 → R04 → R05 → R06 used: compile-time schema (R02) → state-machine runtime (R03) → algorithm-as-pure-function (R04) → composition + accumulator-strategy (R05) → inherited-tools vendoring + Tessera-native pre-pass orchestrator (R06) → **fleet-correlated FCP-1 + warm-start eligibility wire-format + PR-F8 evidence matrix (R07)** → wiring of FCP-1 into calibrate.ts main() + compiled-artifact loader (R08+).

Traces to PRD AC-P1 ("per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)") at the FLEET-CURATION layer: without Stage 2b, cross-shard correlated contamination (a single fleet event firing across many shards correlatedly) is undetectable by Stage 2a per-shard screening — Stage 2a's MCD-trim cutoff is computed within each shard's window and cannot identify a correlated multi-shard signal. FCP-1's Ville-bounded e-process IS the per-window detector that closes the gap. Traces to PRD AC-P2 (warm-start invalidation) via Stage 3b wire format: FCP-1-curated baselines must carry a distinct `residual_seed_hash` so the R03-shipped runtime mechanism triggers reset of stale warm-start residuals.

---

## Mechanism

### Architectural primitives

1. **R06 file preserved bit-identical at R07.** `tools/curate-baseline-pre-pass.ts` is NOT modified at R07. R06's `curateBaselinePrePass(bundle, opts?)` continues to bind R06's AC-1..AC-13 (q06 test file unchanged at R07). The FCP-1 surface lives in a NEW file `tools/curate-baseline-fleet-correlated.ts` per D-R07-1. This is a deliberate architectural-separation choice (Stage 2a and Stage 2b are independently addressable surfaces; modifying R06's shipped file at R07 would risk AC-1..AC-13 regression via inadvertent behavior drift during refactor, and would violate the "additive-only" preference for shipped public APIs per the R02 reinforcement chain). The minor cost — per-run MCD screening logic is implemented twice (once in R06's file, once as an internal helper in R07's file) — is accepted as the safer trade-off. Both implementations consume the SAME vendored estimator surfaces (`fastMCD`, `mahalanobisSqFromL`, `chiSqQuantile975`, `choleskyLocal`); the algorithmic content is identical even if the source-text lines duplicate.

2. **D-R07-2: Per-run Stage 2a mask materialization (internal helper `screenRunMask`).** R07's new file defines an internal (non-exported) helper `screenRunMask(run, mcdAlpha, mcdSeed): { keptIndices: number[]; contaminationMask: boolean[]; totalTicks: number; outcome: 'screened' | 'skipped_insufficient_samples' | 'skipped_mcd_failed' | 'skipped_no_signals' }`. The helper applies the SAME algorithm R06's pre-pass uses per run (sorted-signal column ordering; sample-matrix construction; n < p+1 skip; fastMCD → null skip; choleskyLocal → null skip; per-tick d² vs chiSqQuantile975(p) cutoff). UNLIKE R06's `curateBaselinePrePass`, this helper also returns the per-tick `contaminationMask: boolean[]` (length = totalTicks) where `true` indicates contaminated, `false` indicates clean — needed for the cross-shard FCP-1 aggregation. For skipped runs (insufficient samples, MCD failed, no signals), the helper returns `contaminationMask: []` (empty array) and `totalTicks: 0`; the mask is NOT extended to the full-tick-length-as-clean since skipped runs cannot contribute meaningful contamination info to the cross-shard count.

3. **D-R07-3: Cross-shard window alignment = minimum length across SCREENED runs.** Let `W_aligned = min over (s : s is a SCREENED run) of run_s.contaminationMask.length`. Skipped runs (outcome ≠ 'screened') contribute NO mask data and are EXCLUDED from the N count for X_w aggregation (see D-R07-4). When all runs are skipped, `W_aligned = 0` → no test windows → FCP-1 trivially does not fire (state.fired === false). When only one run is screened, `W_aligned = that run's mask length` and `N_aligned = 1`. The alignment uses MINIMUM (not maximum + zero-pad) because zero-padding non-existent ticks would inflate the cross-shard "clean" count at those windows and bias the e-process toward false-negative detection at the tail. Truncating to the minimum length ensures each window has the SAME number of contributing shards.

4. **D-R07-4: X_w aggregation rule.** For each window `w ∈ [0, W_aligned)`: `X_w = Σ_(s : s is a SCREENED run) (1 if run_s.contaminationMask[w] === true else 0)`. `N = count of SCREENED runs` (= number of shards contributing to the aggregation). X_w ∈ [0, N]. The aggregation is performed strictly over SCREENED runs (skipped runs contribute nothing — see D-R07-2 + D-R07-3 above).

5. **D-R07-5: Bayesian shrinkage `p_base` estimation with disjoint training prefix (per Q-JC4b LOAD-BEARING constraint).** Operator-tunable parameters: `pBasePrior: number` (default 0.025 — expected baseline contamination rate per-tick under healthy fleet), `shrinkageKappa: number` (default 1.0), `trainingWindowCount: number` (default 10). Behavior: let `K = min(trainingWindowCount, max(0, W_aligned - 1))` (clamp so at least 1 test window remains if possible; K=0 if W_aligned=0). If `K === 0` OR `N === 0`: p_base falls back to `pBasePrior` exactly (no empirical update). Else: `p_burn = Σ_(w ∈ [0, K)) X_w / (N · K)` (empirical contamination rate on the training prefix); `p_base = (N·K · p_burn + shrinkageKappa · pBasePrior) / (N·K + shrinkageKappa)`. The disjoint-data constraint is satisfied by construction: `p_base` is a function of windows `[0, K)` ONLY; the test e-process runs over windows `[K, W_aligned)` which are independent of `p_base` under H₀. **HALT-bound for IMPLEMENTER**: if R07 spec ambiguity surfaces about disjoint-data construction, halt per Q-JC4b LOAD-BEARING constraint (NEXT-ROLE.md HALT-condition item 1) — silent plug-in would invalidate Ville bound.

6. **D-R07-6: Sequential betting-adaptive e-process (mirrors family-c-betting-e-process.ts canonical pattern).** Per-window state initialized at K (start of test windows): `log_S = 0` (S_K = 1); `ons_lambda = 0` (canonical λ_0 = 0); `ons_inverse_hessian = 1` (canonical A_0 = 1); `fired = false`; `fire_window = null`; `log_S_max = 0`. For each `w ∈ [K, W_aligned)`:
   - `F_w = X_w / N - p_base` (centered binomial deviation; F_w ∈ [-p_base, 1 - p_base]).
   - `wealth_factor = 1 + ons_lambda * F_w`.
   - `log_factor = log(max(wealth_factor, LOG_FACTOR_FLOOR))` where `LOG_FACTOR_FLOOR = 1e-12` (mirrors family-c-betting-e-process.ts:82 numerical guard).
   - `log_S += log_factor`.
   - `log_S_max = max(log_S_max, log_S)`.
   - ONS bet update (mirrors family-c-betting-e-process.ts:231-244 `onsUpdate`):
     - `denom = 1 + ons_lambda * F_w`.
     - If `|denom| < 1e-12`: skip the bet update (preserve λ unchanged).
     - Else: `z = -F_w / denom`; `ons_inverse_hessian += z * z`; `lambda_new = ons_lambda - (ONS_STEP_SIZE_C * z) / ons_inverse_hessian` where `ONS_STEP_SIZE_C = 2 / (2 - log(3)) ≈ 1.6336` (mirrors family-c-betting-e-process.ts:78); two-sided clamp: `ons_lambda = clamp(lambda_new, -lambdaMax, +lambdaMax)` where `lambdaMax = opts.lambdaMax ?? 0.5` (mirrors family-c-betting-e-process.ts `DEFAULT_LAMBDA_MAX = 0.5` at line 91).
   - Fire check (single-fire-per-bundle): if `!fired AND log_S >= log(1 / alphaFleet)`: `fired = true`; `fire_window = w`. (Spec does NOT reset wealth after fire; per D-R07-7 below, the fired flag is sticky.)

7. **D-R07-7: Single-fire-per-bundle / no post-fire reset (Q-JC4 anytime-valid Ville-bound discipline).** Once `fired = true`, the state's `fired` and `fire_window` are preserved; subsequent windows continue to update `log_S` (for audit visibility) but do NOT re-fire. The CURATION decision uses ONLY the FIRST `fire_window`. This preserves the strict Ville bound: P_H₀(∃w : S_w ≥ 1/α_fleet) ≤ α_fleet (a single declaration that "a fleet event was detected somewhere in [K, W_aligned)"). Resetting wealth after each fire would convert the test to a Bonferroni-equivalent (k blocks each at FPR ≤ α_fleet → cumulative FPR ≤ k·α_fleet up to k=W·α_fleet ≈ 8.64 at W=8640 / α_fleet=10^-3 — meaningless). Multi-fleet-event detection is deferred to future cycles per OQ-1.

8. **D-R07-8: Stage 2b curation effect on `curatedBundle`.** The R07-curated bundle is built in three layers:
   - Layer 1 — Stage 2a per-shard mask: each run's contaminated ticks are dropped (same as R06 behavior).
   - Layer 2 — Stage 2b cross-shard fleet-event window: if `state.fired === true`, the tick at index `fire_window` (in the PRE-Stage-2a ORIGINAL tick coordinates) is ALSO dropped from EVERY run's signal_series (and hour_of_day / day_of_week when present), regardless of whether that run's Stage 2a mask flagged it. This is the "curate that window out from ALL shards' baselines" rule from memo § 2 Stage 2b.
   - Layer 3 — Length harmonization: each curated run's signal_series arrays maintain per-signal length parallelism. The post-curation length per signal = (original totalTicks) − (Stage 2a contamination count on this run for ticks ∈ [0, W_aligned)) − (1 if state.fired AND fire_window ∈ [0, totalTicks - Stage2A count] else 0). For runs where Stage 2a SKIPPED (no per-tick mask available): if state.fired, the Stage 2b fleet-event tick is dropped at the original `fire_window` index in that run's signal_series; if not state.fired, the run is passed through unchanged. For runs where original totalTicks < `fire_window`: Stage 2b cannot drop a tick that doesn't exist; the run is unaffected by Stage 2b (Stage 2a layer still applies).

   The ordering is Layer 1 (Stage 2a per-shard) THEN Layer 2 (Stage 2b fleet-window) THEN Layer 3 (harmonization). Per-run-Stage-2a drops happen at the PER-RUN-INDEX level; the Stage-2b fleet-window drop is computed in PRE-Stage-2a window coordinates (since X_w is aggregated on the SCREENED runs' masks BEFORE the curated runs are built). When applying Stage 2b drop to a curated run, the fire_window index must be MAPPED through the Stage 2a keptIndices: the fire_window is dropped iff `fire_window ∈ run's Stage 2a keptIndices` (otherwise the tick was already dropped by Stage 2a; Stage 2b is a no-op for that run). For SKIPPED runs (Stage 2a didn't apply), the fire_window is dropped at the original index iff `fire_window < run's totalTicks`.

9. **D-R07-9: D11 + D12 + D13 emissions all populated at R07.** R07's `curateBaselineFleetCorrelated` emits ALL THREE decisions in a single result:
   - D11 — Per-shard within-window contamination screening (same shape R06 emits). Captures Stage 2a per-run counters.
   - D12 — Fleet-correlated contamination detection. Captures FCP-1 e-process state + decision.
   - D13 — Warm-start eligibility tagging. Captures the wire-format sentinel for downstream `residualSeedHash` derivation.

   When the caller wants ONLY R06's Stage 2a behavior (no FCP-1), the caller invokes `curateBaselinePrePass` from the R06 file (emits D11 only). When the caller wants R07's Stage 2a + Stage 2b + Stage 3b pipeline, the caller invokes `curateBaselineFleetCorrelated` (emits D11 + D12 + D13).

10. **D-R07-10: D13 wire-format sentinel string (Q-JC5 LOAD-BEARING).** D13's `output_summary.residual_seed_hash_sentinel: string` is the wire format the downstream consumer (R08+ calibrate.ts wiring) ingests as the new `residualSeedHash` value. The sentinel is deterministically derived from FCP-1's audit token + the BaselineBundle identity:
   - `fcp1_audit_token = 'fcp1:fired=' + String(fired) + ':windows=' + JSON.stringify(fleet_event_window_indices)`
     - When fired=true with fire_window=37: `'fcp1:fired=true:windows=[37]'`.
     - When fired=false: `'fcp1:fired=false:windows=[]'`.
   - `baseline_identity_segment = bundle.version + '|' + String(bundle.seed)`.
   - `residual_seed_hash_sentinel = 'tessera-fcp1-v1::' + baseline_identity_segment + '::' + fcp1_audit_token`.

   Properties: (a) DETERMINISTIC — same bundle + same opts → identical sentinel (D-R07-9 bound by AC-21); (b) DISTINCT from any pre-FCP-1 hash — the literal prefix `'tessera-fcp1-v1::'` ensures a sentinel produced by R07 differs from any non-FCP-1 hash format that downstream consumers may have stamped; (c) DISTINCT between fired vs not-fired same bundle — the audit_token segment includes the fired flag (AC-21 bound); (d) DISTINCT between two bundles with the same content but different version/seed identity — the baseline_identity_segment captures bundle identity. Downstream consumers (R08+) use this sentinel as `residualSeedHash`; the R03 runtime mechanism (warm-start.ts:74-75 `current.residual_seed_hash !== obs.residualSeedHash`) detects any change and triggers reset.

   The wire format is LOCKED at R07 per Q-JC5 disposition; future protocol revisions would bump the version tag (`'tessera-fcp1-v2::'`) without changing the v1 contract. R07 does NOT modify warm-start.ts (R07-SAS-1); the sentinel is OFFLINE wire format only. **HALT-bound for IMPLEMENTER**: if R07 spec ambiguity surfaces about the sentinel format, halt per Q-JC5 (NEXT-ROLE.md HALT-condition item 2).

11. **D-R07-11: PR-F8 evidence matrix split between deterministic algorithm-binding ACs and small-N simulation ACs.** Per NEXT-ROLE.md PR-F8 mandate, the spec includes (i) synthetic-fleet H₀ + injected-fleet-event H₁ fixtures; (ii) formal martingale-property verification; (iii) ≥3 e-process formulations with rejection rationale. The split:
   - Algorithm-binding ACs (deterministic step-trace): AC-5 (wealth update formula on a hand-computed F_w sequence), AC-6 (ONS bet update on a hand-computed F_w sequence), AC-7 (Bayesian shrinkage formula on a hand-computed training-prefix X_w sequence), AC-8 (fire condition on a wealth crossing threshold), AC-9 (no-fire condition when wealth stays sub-threshold), AC-10 (min-training-windows guard).
   - Empirical-evidence ACs (deterministic-seed small-N simulation; tight bounds): AC-11 (H₀ simulation — fixed seed, 30 trials × W=200 × N=100 × p_base=0.025 → exact fire count == 0 at α_fleet=10⁻³), AC-12 (H₁ injection at p_alt=0.5 at window 100 → exact fire count == 30 of 30 trials at α_fleet=10⁻³), AC-13 (H₁ weak-injection at p_alt=0.1 at window 100 → exact fire count == specific value per deterministic seed).
   - Martingale property AC: AC-14 (analytic verification — when `ons_lambda === 0` (e.g., at the first test window before any ONS update accumulates), `log_factor === log(1 + 0 * F_w) === log(1) === 0`; therefore `log_S` is unchanged at the first post-K window REGARDLESS of `F_w`. This binds the martingale-by-construction property: under H₀, `E[F_w | F_{w-1}] = 0`, and λ_{w-1} is F_{w-1}-measurable → `E[1 + λ_{w-1} F_w | F_{w-1}] = 1` → `E[S_w | F_{w-1}] = S_{w-1}`. The empirical verification at AC-11 (H₀ FPR ≤ α_fleet) is the downstream consequence of the martingale property; AC-14 binds the structural property at the per-step level.

   For exact-fire-count expected values, the deterministic seed is `FCP1_TEST_SEED = 0xFCD1` (mnemonic for "FCP-1 deterministic"); the synthetic generator is a mulberry32 PRNG seeded with this value + a trial offset. Implementer GREEN-state binding command produces the actual observed count; AC-11/12/13 bind the EXACT count. If the AC count differs from spec prediction at GREEN, that's an Architect spec-prediction error to surface inline (per the R04 reinforcement that hand-traced literal-value ACs are appropriate when externally derivable). **NOTE TO IMPLEMENTER**: the H₀ exact count of 0 is HIGH-CONFIDENCE Architect pre-prediction because (a) α_fleet=10⁻³ ⇒ expected false fire rate per trial is 10⁻³; 30 trials ⇒ expected 0.03 false fires; (b) Ville's inequality is a tail bound — actual FPR is typically << α; (c) with N=100 shards × p_base=0.025, X_w values are concentrated near 2.5 with variance 2.4375 ≈ 1.56² → F_w is small + centered → ONS-driven wealth typically doesn't grow rapidly enough to cross threshold in 200 windows. If observed differs from 0, that's likely either (i) a real implementation bug OR (ii) a synthetic-generator artifact (e.g., RNG drift across platforms — mulberry32 + Box-Muller should be cross-platform-deterministic per the family-c-rff.ts precedent). Implementer reports OBSERVED count per R03 MINOR-4 reinforcement; if the OBSERVED count diverges from the spec prediction, the architect's spec is the locus of error (architect cannot run the simulation at spec-writing time per role boundary) — record the discrepancy in NEXT-ROLE.md as a tactical fix (R06 OBS-1 precedent applies — architect spec-prediction errors are not implementation failures).

### Cross-section consistency pass

(R01-derived reinforcement — 7th consecutive Tessera application; standing discipline. Each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.)

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | New file path = `tools/curate-baseline-fleet-correlated.ts` (per D-R07-1) | § Component inventory + § Per-file pseudocode Delta 1 + § Integration points | `tools/fcp1.ts`; `engine/curate/fleet-correlated.ts`; extending R06's `tools/curate-baseline-pre-pass.ts` | No alternative file path appears in any spec section; R07-SAS-5 explicitly fences modification to R06's file |
| 2 | Exported function names = `runFleetCorrelatedEProcess` + `curateBaselineFleetCorrelated` | § Per-file pseudocode Delta 1 + § Integration points + AC-5..AC-21 | `fcp1`; `runFcp1`; `curateFleet`; `curateBaselineWithFcp1` | All pseudocode + AC bindings use the canonical names; no alternatives appear |
| 3 | Internal-helper name = `screenRunMask` (D-R07-2; non-exported) | § Per-file pseudocode Delta 1 (function definition + caller invocation) | `maskRun`; `runMcdScreening`; `getContaminationMask` | Pseudocode uses `screenRunMask` consistently |
| 4 | Exported state interface = `Fcp1State`; opts interfaces = `Fcp1Opts` + `FleetCorrelatedOpts` extends `Fcp1Opts` (NOT extends `PrePassOpts` — see #16) | § Per-file pseudocode Delta 1 + § Integration points | `EProcessState`; `BettingState`; combined single-interface | Pseudocode defines exactly three exported interfaces with these names |
| 5 | FCP-1 fire condition = `log_S >= log(1 / alphaFleet)` (Q-JC4 disposition); single-fire-per-bundle (D-R07-7) | § Mechanism primitive 6 + 7 + § Per-file pseudocode Delta 1 + AC-8 + AC-9 | Wealth reset after fire (Bonferroni-equivalent); multi-fire enumeration | Pseudocode: `if (!fired AND log_S >= log_threshold)`; no reset branch; AC-7 verifies log_threshold formula |
| 6 | `p_base` estimation = Bayesian shrinkage with DISJOINT TRAINING PREFIX (Q-JC4b LOAD-BEARING) | § Mechanism primitive 5 + § Per-file pseudocode Delta 1 + AC-7 | Plug-in from same data; conditional (predictable) construction | Pseudocode: p_base computed from windows [0, K) only; e-process runs from K onward; R07-SAS-17 explicitly fences plug-in |
| 7 | `p_alt` = betting-adaptive via ONS (Q-JC4a (β) disposition) | § Mechanism primitive 6 + § Per-file pseudocode Delta 1 | Uniform mixture over [2·p_base, 0.5]; GROW; universal portfolio | Pseudocode uses ONS update mirroring family-c-betting-e-process.ts:231-244; no mixture-prior code |
| 8 | Cross-shard window alignment = MIN across SCREENED runs (D-R07-3) | § Mechanism primitive 3 + § Per-file pseudocode Delta 1 + AC-17 | Maximum + zero-pad; per-shard independent windows | Pseudocode uses `Math.min(...screenedRuns.map(r => r.totalTicks))`; no zero-pad fallback |
| 9 | Skipped runs CONTRIBUTE NOTHING to X_w (D-R07-4) | § Mechanism primitive 3 + 4 + § Per-file pseudocode Delta 1 + AC-17 | Skipped runs treated as all-clean (contribute 0 to X_w); skipped runs treated as all-contaminated | Pseudocode iterates only screened runs in X_w summation; N = count of screened runs |
| 10 | Stage 2b curated bundle = drop fire_window from ALL runs (D-R07-8) | § Mechanism primitive 8 + § Per-file pseudocode Delta 1 + AC-16 | Drop only from runs where Stage 2a flagged the tick; zero-out instead of drop | Pseudocode filters arrays; AC-16 verifies the tick at fire_window index is absent post-curation |
| 11 | D11 + D12 + D13 all emitted (D-R07-9) | § Mechanism primitive 9 + § Per-file pseudocode Delta 1 + AC-18 + AC-19 + AC-20 | Only D12 + D13 emitted (D11 deferred to caller); single combined decision | Pseudocode populates all three decision IDs in the result; AC-18 verifies all three keys present |
| 12 | D13 wire-format = `'tessera-fcp1-v1::' + version + '|' + seed + '::' + fcp1_audit_token` (Q-JC5 LOAD-BEARING; D-R07-10) | § Mechanism primitive 10 + § Per-file pseudocode Delta 1 + AC-20 + AC-21 | Hash of baseline content; opaque UUID; reuse R06 D11 audit_token | Pseudocode constructs the literal string per the format; AC-21 verifies determinism |
| 13 | TDD ordering: RED commit adds q07 test file; GREEN commit adds production code (tools/curate-baseline-fleet-correlated.ts) | § Per-file pseudocode Implementer note 4 + AC-25 | Single-commit landing | AC-25 specifies two-commit ordering verifiable in git log |
| 14 | File-creation track-state for new paths | § Component inventory directory-creation note | Assumed pre-existing without verification | `git ls-files tools/curate-baseline-fleet-correlated.ts test/q07-fleet-correlated.test.ts` verified empty at HEAD `a692255` |
| 15 | NO schema delta to engine/types/config.ts at R07 (D12/D13 reserved at R06 Delta 1) | § Component inventory (config.ts not in R07 inventory) + § Anti-scope R07-SAS-2 | New delta extending BaselineCurationDecisionId; new fields on BaselineCurationDecision | Component inventory does NOT list config.ts; R07-SAS-2 fences any schema delta |
| 16 | NO surface-level change to R06's `tools/curate-baseline-pre-pass.ts` (D-R07-1) | § Component inventory (pre-pass.ts not in R07 inventory) + § Anti-scope R07-SAS-5 | Refactor R06 to use shared helper; add new export to R06 file | Component inventory does NOT list pre-pass.ts; R07-SAS-5 fences any modification |
| 17 | NO modification to R03/R04/R05 runtime substrate (engine/per-shard/*) (Q-JC5 disposition; R07-SAS-1 / R07-SAS-19) | § Anti-scope R07-SAS-1 + R07-SAS-19 | Add residual_seed_hash sentinel-consumption logic to warm-start.ts | engine/per-shard/* not in R07 Component inventory; R07-SAS-1 + R07-SAS-19 fence |
| 18 | Q-JC dispositions tracked for binding: Q-JC1 carried (R06-SAS-1 → R07-SAS-4); Q-JC2 carried (R06-SAS-3 → R07-SAS-10); Q-JC3 carried (Stage 2a precedes Stage 2b — enforced via execution ordering in `curateBaselineFleetCorrelated`); Q-JC4/4a/4b/4c = R07 bindings as enumerated above; Q-JC5 = R07 wire-format binding (D-R07-10); Q-JC6 carried (R06-SAS-6 → R07-SAS-9) | § Anti-scope rows R07-SAS-4 + R07-SAS-9 + R07-SAS-10 + R07-SAS-11 + R07-SAS-17; § Mechanism primitives 5 + 6 + 10 | Silent absorption of any Q-JC binding; silent deferral with no Q-JC mapping | All 9 Q-JC dispositions explicitly mapped (Q-JC1/2/3/6 carried forward from R06; Q-JC4/4a/4b/4c/5 newly bound at R07) |

All 18 checks PASS at spec-emit time.

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `tools/curate-baseline-fleet-correlated.ts` | CREATED (TESSERA-NATIVE) | Delta 1: new module exporting `interface Fcp1Opts`, `interface FleetCorrelatedOpts`, `interface Fcp1State`, `interface FleetCorrelatedResult`, `function runFleetCorrelatedEProcess(xCounts, N, opts)`, `function curateBaselineFleetCorrelated(bundle, opts?)`. Internal helper `screenRunMask` (non-exported). Composes vendored `fastMCD` + `mahalanobisSqFromL` + `chiSqQuantile975` + `choleskyLocal` (same imports R06 pre-pass.ts uses). Pure functions (no mutation; new bundle object returned). |
| `test/q07-fleet-correlated.test.ts` | CREATED | Delta 2: new test file binding AC-1 through AC-21 below (21 in-file tests structurally pre-determined; see narrative-vs-pseudocode AC-count cross-check at § Grilling). |

**Component inventory size: 2 surfaces (smallest Tessera spec inventory to date).** This reflects R07's bounded scope: zero vendoring + zero schema delta + zero modification to inherited or R0n-shipped Tessera-native files = two new files (one production + one test).

**Backward-compat file cross-check (R12 reinforcement)**: R07 does NOT modify any pre-R07 file; no backward-compat patches needed. The R02/R03/R04/R05/R06 test files (q01-* through q06-*) continue to pass unchanged at R07 by virtue of zero pre-R07 file modification. Confirmed via `git diff 0689681..HEAD --name-only` at R07 GREEN expected to show ONLY the two R07-created files + coordination artifacts.

**Directory-creation track-state verification** (R02 OBS-2 reinforcement applied — verify file absence + directory presence at HEAD `a692255`):

- `tools/` — exists (`git ls-files tools/` returns: `tools/calibrators/_shared.ts`, `tools/calibrators/family-c.ts`, `tools/curate-baseline-pipeline.ts`, `tools/curate-baseline-pre-pass.ts`, `tools/vendor-from-deploysignal.sh`). No new directory creation needed for `tools/curate-baseline-fleet-correlated.ts`.
- `test/` — exists. No new directory creation needed for `test/q07-fleet-correlated.test.ts`.
- `tools/curate-baseline-fleet-correlated.ts` — does NOT exist at HEAD `a692255` (`git ls-files tools/curate-baseline-fleet-correlated.ts` → empty). GREEN commit creates this file.
- `test/q07-fleet-correlated.test.ts` — does NOT exist at HEAD `a692255` (`git ls-files test/q07-fleet-correlated.test.ts` → empty). RED commit creates this file.

---

## Integration points

(R02-derived type-declaration-site discipline applied + R03-derived re-export-chain-check discipline applied — for each named type or function instantiated in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)

1. **`tools/curate-baseline-fleet-correlated.ts` ↔ `engine/types/config.ts`.** Imports `BaselineBundle`, `BaselineCurationDecision`, `BaselineCurationDecisionId` (type-only imports). Declaration sites verified at HEAD `a692255`: `BaselineBundle` at `engine/types/config.ts:399` (`export interface`); `BaselineCurationDecision` at `engine/types/config.ts:227` (`export interface`); `BaselineCurationDecisionId` at `engine/types/config.ts:214` (`export type`; the D1-D13 union — D11 R06-shipped, D12 + D13 reserved at R06 Delta 1 ready for R07 emission). All three are direct exports — no re-export indirection needed.

2. **`tools/curate-baseline-fleet-correlated.ts` ↔ `tools/calibrators/family-c.ts`.** Imports `fastMCD`, `mahalanobisSqFromL`, `chiSqQuantile975`, `FASTMCD_DEFAULT_ALPHA`, `FASTMCD_DEFAULT_SEED` (5 named identifiers; same 5 imports R06's pre-pass.ts uses). Declaration sites verified at Tessera-vendored `tools/calibrators/family-c.ts` (vendored at SHA `5a72371` per R06 GREEN; byte-identity preserved): `fastMCD` at line 544 (`export function`; returns `FastMCDResult | null`); `mahalanobisSqFromL` at line 392 (`export function`); `chiSqQuantile975` at line 362 (`export function`); `FASTMCD_DEFAULT_ALPHA` at line 455 (`export const`); `FASTMCD_DEFAULT_SEED` at line 456 (`export const`). All five are direct exports.

3. **`tools/curate-baseline-fleet-correlated.ts` ↔ `tools/calibrators/_shared.ts`.** Imports `choleskyLocal` (same import R06's pre-pass.ts uses). Declaration site verified at Tessera-vendored `tools/calibrators/_shared.ts:31` (`export function`, returns `number[][] | null`). Direct export.

4. **NO IMPORT from R06's `tools/curate-baseline-pre-pass.ts`.** R07's new file does NOT import from R06's file. The two files share vendored estimator surfaces (#2 + #3 above) but are independent at the import level. This preserves clean architectural separation: R06's file is self-contained for Stage 2a-only use cases; R07's file is self-contained for Stage 2a + Stage 2b + Stage 3b combined use cases. The minor code duplication of per-run MCD logic is intentional (D-R07-1 trade-off).

5. **`tools/curate-baseline-fleet-correlated.ts` ↔ Node standard library.** Imports `node:assert/strict` is NOT used in production code (only in tests). The production file imports only the engine + vendored sources above; no node-stdlib runtime imports. (`Math.log`, `Math.max`, `Math.abs`, `Math.min`, `JSON.stringify` are global builtins — no import needed.)

6. **`test/q07-fleet-correlated.test.ts` ↔ `tools/curate-baseline-fleet-correlated.ts`.** Imports `curateBaselineFleetCorrelated`, `runFleetCorrelatedEProcess`, types `Fcp1Opts`, `FleetCorrelatedOpts`, `Fcp1State`, `FleetCorrelatedResult`. PLUS `node:test` + `node:assert/strict` (standard library) + type-only `BaselineBundle`, `BaselineCurationDecision` from `../engine/types/config`. The test directly exercises both exported functions with fixed input fixtures; no factory layer needed (BaselineBundle construction inline; X_w synthesizer inline via fixed-seed mulberry32 helper in the test file).

7. **NO IMPORT from `engine/per-shard/*` or `engine/detectors/*`.** R07's new file is build-time / pre-calibrate tooling; it does NOT consume per-shard runtime types or detector machinery. The architectural parallel to `engine/detectors/family-c-betting-e-process.ts` is at the ALGORITHM-PATTERN level only (ONS update logic); R07 does not import from that file.

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **Cross-platform PRNG determinism**: the q07 test file uses a `mulberry32` PRNG seeded with `FCP1_TEST_SEED = 0xFCD1` (test-local constant). For Binomial(N, p) sampling, use `mulberry32 → uniform(0, 1) → Bernoulli(p) per shard` summing across N shards (NOT inverse-CDF since N=100 is small enough that direct Bernoulli summation is fast and exact). The R07-shipped family-c-rff.ts precedent confirms `mulberry32` + Box-Muller produce byte-identical output across Darwin and Linux for fixed seed — the same property holds for our use. Implementer note: write the PRNG + Bernoulli helper INSIDE the q07 test file (not imported from any module); per AC-23 the q07 in-file test count is structurally pre-determined at 21.

2. **TDD ordering**: two-commit sequence. RED commit adds `test/q07-fleet-correlated.test.ts` (file imports from `../tools/curate-baseline-fleet-correlated` which does NOT yet exist → tsc fails with TS2307). Run `npm run typecheck` at RED to verify the failure. GREEN commit lands: Delta 1 (tools/curate-baseline-fleet-correlated.ts created with production code). After GREEN: `npm run typecheck` → exit 0; `node --test test/q07-fleet-correlated.test.js` → 21/0.

3. **Anti-scope hard-stop**: do NOT modify `tools/curate-baseline-pre-pass.ts` (R07-SAS-5). Do NOT modify `engine/per-shard/*` (R07-SAS-1 / R07-SAS-19). Do NOT modify `engine/types/config.ts` — D12 and D13 are already in the BaselineCurationDecisionId union from R06 Delta 1 (verified at config.ts:214; R07-SAS-2). Do NOT add new vendoring (R07-SAS-4 + R07-SAS-6 + R07-SAS-7). Do NOT add new npm dependencies (R07-SAS-3). Encountering apparent need to modify any of these → HALT condition (b), write DIAGNOSTIC-R07-<topic>.md + STATUS: ESCALATE. Do NOT silently absorb.

4. **HALT-bound items per NEXT-ROLE.md**: (i) Q-JC4b disjoint-data construction — pseudocode unambiguous: `p_base` computed from windows `[0, K)` only; e-process runs from `K` onward; if spec ambiguity surfaces, HALT and write DIAGNOSTIC-R07-disjoint-data.md (CRITICAL-class — silent plug-in invalidates Ville bound). (ii) Q-JC5 wire format — pseudocode unambiguous: sentinel format is exactly `'tessera-fcp1-v1::' + version + '|' + seed + '::fcp1:fired=' + fired + ':windows=' + JSON.stringify(windows)`; if spec ambiguity surfaces, HALT and write DIAGNOSTIC-R07-sentinel-format.md. (iii) Q-JC6 speculative additions — pseudocode does NOT mention SR/RPCA/BOCPD; if spec text proposes any of these, HALT (operator-gated).

5. **Hand-trace verification before committing GREEN** — algorithm walk on a synthesized H₀ X_w sequence (Bayesian shrinkage with K=2 training + 3 test windows):
   - Synthesized X_w sequence (illustrative; NOT a test fixture — AC fixtures are larger): `[2, 3, 2, 4, 3]` with `N=100`, `pBasePrior=0.025`, `shrinkageKappa=1.0`, `trainingWindowCount=2`, `alphaFleet=1e-3`, `lambdaMax=0.5`.
   - K = min(2, max(0, 5-1)) = 2. Test windows = [2, 3, 4] (indices 2, 3, 4). 
   - p_burn = (X_0 + X_1) / (N · K) = (2 + 3) / (100 · 2) = 5 / 200 = 0.025.
   - p_base = (N·K · p_burn + κ · pBasePrior) / (N·K + κ) = (200 · 0.025 + 1.0 · 0.025) / (200 + 1.0) = (5 + 0.025) / 201 = 5.025 / 201 ≈ 0.025 (exact: 0.025).
   - Window 2: F_2 = X_2/N - p_base = 0.02 - 0.025 = -0.005. ons_lambda=0, ons_inverse_hessian=1, log_S=0. wealth_factor = 1 + 0 · (-0.005) = 1. log_factor = log(max(1, 1e-12)) = 0. log_S → 0. ONS: denom = 1 + 0 · F_2 = 1 (>= 1e-12), so z = -F_2/denom = -(-0.005)/1 = 0.005; ons_inverse_hessian = 1 + 0.005² = 1.000025; lambda_new = 0 - (1.6336 · 0.005)/1.000025 = -0.008168; clamp to [-0.5, 0.5] = -0.008168. ons_lambda → -0.008168. fired remains false.
   - Window 3: F_3 = 0.04 - 0.025 = 0.015. wealth_factor = 1 + (-0.008168) · 0.015 = 1 - 0.00012252 = 0.99987748. log_factor = log(0.99987748) ≈ -0.0001226. log_S → -0.0001226. ONS: denom = 0.99987748; z = -0.015/0.99987748 ≈ -0.01500184; ons_inverse_hessian = 1.000025 + (-0.01500184)² ≈ 1.000025 + 0.000225 = 1.00025; lambda_new = -0.008168 - (1.6336 · -0.01500184)/1.00025 ≈ -0.008168 + 0.024497/1.00025 ≈ -0.008168 + 0.0244908 ≈ 0.016323. clamp: 0.016323. ons_lambda → 0.016323. fired remains false (log_S far below log(1e3) ≈ 6.9).
   - Window 4: F_4 = 0.03 - 0.025 = 0.005. wealth_factor = 1 + 0.016323 · 0.005 = 1.00008162. log_factor ≈ 0.00008161. log_S → -0.0001226 + 0.00008161 ≈ -0.0000410. fired remains false. log_S_max = 0 (the initial value at start of test windows was 0; log_S only decreased then partially recovered). 
   - Final state: fired=false, fire_window=null, log_S≈-0.0000410, log_S_max=0, ons_lambda≈0.016323, n_windows_test=3. D12 emission shows fired=false; D13 sentinel includes `':fired=false:windows=[]'`. The trace illustrates the clean-fleet no-fire behavior on a small synthesized sequence.

6. **Hand-trace verification before committing GREEN** — fleet-event fire trace on a synthesized H₁ X_w sequence:
   - Synthesized X_w sequence: `[2, 3]` training + `[80, 2, 3]` test windows (window 2 = fleet event at X_2=80 out of N=100). Same opts as note 5.
   - K=2, p_burn = (2+3)/200 = 0.025, p_base = 0.025 (per note 5).
   - Window 2: F_2 = 80/100 - 0.025 = 0.775. ons_lambda=0 → wealth_factor = 1 → log_factor = 0 → log_S → 0. ONS: denom=1, z=-0.775, ons_inverse_hessian = 1 + 0.775² = 1.600625; lambda_new = 0 - (1.6336 · -0.775)/1.600625 ≈ 0.7905; clamp to 0.5. ons_lambda → 0.5. log_S = 0 < log(1e3) = 6.908, fired remains false. (Note: at the FIRST test window, log_S unchanged regardless of F_w because ons_lambda starts at 0 — this is the AC-14 martingale-property invariant.)
   - Window 3: F_3 = 2/100 - 0.025 = -0.005. wealth_factor = 1 + 0.5 · (-0.005) = 0.9975. log_factor ≈ -0.0025. log_S → -0.0025. fired remains false. ONS updates λ further; details omitted.
   - Window 4: F_4 = 3/100 - 0.025 = 0.005. wealth_factor = 1 + λ · 0.005 (small). log_S nudges. fired remains false. log_S well below 6.908; this 3-test-window sequence with one elevated window (X=80) does NOT fire at α_fleet=1e-3. The witness running-max-normalization heuristic (NOT included in FCP-1 per D-R07-6; FCP-1 uses straight F_w without normalization) would change this; FCP-1 is intentionally simpler than the inherited family-c betting pattern's witness-normalization branch.
   - **Implementer pre-prediction**: at α=1e-3 with W=3 test windows + small N=100 + single window with X=80, the e-process does NOT fire (log_S stays below 6.908). To reliably fire under a sustained-elevation H₁ scenario, AC-8 uses a 32-element fixture (2 training + 30 elevated test windows at X=N=100) that crosses the threshold around test window ≈18 post-K; AC-12 uses a 200-window fixture with a SINGLE injected elevation at p_alt=0.5 (50% contamination at one window) and relies on ONS λ buildup PLUS variance to fire reliably.
   - The trace illustrates two properties: (a) the FIRST test window post-K has log_S unchanged regardless of F_w (since ons_lambda starts at 0); (b) a SINGLE elevated window with N=100 / X=80 does NOT reliably fire at α=1e-3 from a STANDING START — sustained elevation across many windows (AC-8) OR a sufficient number of variance-driven λ-buildup windows (AC-12) is the path to reliable firing.

### Delta 1 — `tools/curate-baseline-fleet-correlated.ts` (CREATED — Tessera-native)

```ts
// tools/curate-baseline-fleet-correlated.ts — Tessera Phase 1 SLICE 5 (R07):
// Stage 2b fleet-correlated-pattern primitive (FCP-1) + Stage 3b warm-start eligibility
// tagging wire format.
//
// Runs on a BaselineBundle: applies Stage 2a per-shard MCD screening to materialize
// per-(shard, tick) contamination masks; aggregates masks into per-window X_w counts;
// runs a sequential betting-adaptive e-process (mirroring engine/detectors/family-c-
// betting-e-process.ts ONS pattern) over windows [K, W_aligned); declares window w
// fleet-event-contaminated when running wealth S_w ≥ 1/α_fleet (Ville-bound); drops
// the fire_window tick from ALL runs' signal_series; emits D11 + D12 + D13 audit
// records.
//
// Q-JC dispositions: Q-JC1 (vendor at-pin) preserved via re-use of R06-vendored
// surfaces only (no new vendoring); Q-JC2 (pre-pass only) preserved (pure function);
// Q-JC3 (Stage 2a before Stage 2b) enforced via execution ordering in
// curateBaselineFleetCorrelated; Q-JC4 (sequential e-process), Q-JC4a (betting-
// adaptive p_alt via ONS), Q-JC4b (Bayesian shrinkage p_base with disjoint training
// prefix), Q-JC4c (separate pipe from Q-J1 e-BH), Q-JC5 (residual_seed_hash sentinel
// wire format) all bound at primitives 5/6/7/8/10 of Q-R07-SPEC.md § Mechanism.
//
// Tessera-original code (NOT vendored from DeploySignal). Composes vendored estimator
// surfaces from tools/calibrators/family-c.ts + tools/calibrators/_shared.ts (same
// imports R06's tools/curate-baseline-pre-pass.ts uses; deliberate code-duplication
// of per-run MCD screening logic for architectural separation per D-R07-1).

import type {
  BaselineBundle,
  BaselineCurationDecision,
  BaselineCurationDecisionId,
} from '../engine/types/config';
import {
  fastMCD,
  mahalanobisSqFromL,
  chiSqQuantile975,
  FASTMCD_DEFAULT_ALPHA,
  FASTMCD_DEFAULT_SEED,
} from './calibrators/family-c';
import { choleskyLocal } from './calibrators/_shared';

/** Canonical ONS step-size constant per Cutkosky-Orabona 2018; mirrors the
 *  identically-named constant at engine/detectors/family-c-betting-e-process.ts:78
 *  (vendored DeploySignal SHA 5a72371). Re-declared here (not imported) because
 *  the inherited file declares it as a non-exported module constant. */
const ONS_STEP_SIZE_C = 2 / (2 - Math.log(3));  // ≈ 1.6336

/** Numerical guard for Math.log(0) on wealth-factor underflow; mirrors
 *  engine/detectors/family-c-betting-e-process.ts:82 LOG_FACTOR_FLOOR. */
const LOG_FACTOR_FLOOR = 1e-12;

/** Default fleet-level α budget. 10^-3 is the operator-prediction default per
 *  ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION Q-JC4. Matches inherited
 *  per-detector α-budget magnitude in the existing engine. */
const DEFAULT_ALPHA_FLEET = 1e-3;

/** Default Bayesian shrinkage prior on baseline contamination rate. 0.025 represents
 *  the expected per-tick contamination rate under a healthy fleet (~MCD trim count
 *  on clean 100-shard substrates). Operator-tunable via opts.pBasePrior. */
const DEFAULT_P_BASE_PRIOR = 0.025;

/** Default Bayesian shrinkage strength. κ=1.0 = "treat the prior as equivalent to
 *  ~1 baseline sample" → minimal shrinkage at moderate-K training. Operator-tunable
 *  via opts.shrinkageKappa. */
const DEFAULT_SHRINKAGE_KAPPA = 1.0;

/** Default training prefix length for disjoint-data p_base estimation. K=10
 *  windows allows reasonable mean stabilization without consuming too much of
 *  the test budget. Operator-tunable via opts.trainingWindowCount. */
const DEFAULT_TRAINING_WINDOW_COUNT = 10;

/** Default ONS bet clamp. 0.5 mirrors engine/detectors/family-c-betting-e-process.ts:91
 *  DEFAULT_LAMBDA_MAX = 0.5 per Shekhar-Ramdas-2023 canonical reference impl. */
const DEFAULT_LAMBDA_MAX = 0.5;

/** Options for the FCP-1 e-process. All fields optional with documented defaults. */
export interface Fcp1Opts {
  /** Fleet-level α budget. Fire condition: log(S_w) ≥ log(1/alphaFleet). Default 1e-3. */
  alphaFleet?: number;
  /** Bayesian shrinkage prior on per-tick baseline contamination rate. Default 0.025. */
  pBasePrior?: number;
  /** Bayesian shrinkage strength (effective prior sample count). Default 1.0. */
  shrinkageKappa?: number;
  /** Disjoint training prefix length; p_base is computed from windows [0, K) only;
   *  e-process runs from window K onward. Default 10. */
  trainingWindowCount?: number;
  /** ONS bet clamp; bet ∈ [-lambdaMax, +lambdaMax]. Default 0.5. */
  lambdaMax?: number;
}

/** Full options for `curateBaselineFleetCorrelated`: inherits Fcp1Opts AND the per-run
 *  MCD options used by the internal screenRunMask helper. Two MCD opts are
 *  re-declared here rather than extending R06's PrePassOpts to keep
 *  `tools/curate-baseline-fleet-correlated.ts` independent of R06's surface (D-R07-1
 *  architectural-separation). */
export interface FleetCorrelatedOpts extends Fcp1Opts {
  /** MCD subset-size parameter α ∈ (0.5, 1.0]; defaults to FASTMCD_DEFAULT_ALPHA (0.75). */
  mcdAlpha?: number;
  /** Deterministic seed for MCD's mulberry32 PRNG; defaults to FASTMCD_DEFAULT_SEED. */
  mcdSeed?: number;
}

/** Sequential e-process state — externally exported so PR-F8 testing can introspect. */
export interface Fcp1State {
  /** Cumulative wealth in log-space; log_S_K = 0 at start of test windows. */
  log_S: number;
  /** Maximum log_S observed across test windows; used for audit visibility. */
  log_S_max: number;
  /** ONS bet; initialized at 0; updated per window via canonical ONS step. */
  ons_lambda: number;
  /** ONS accumulated Hessian; initialized at 1 (implicit regularization). */
  ons_inverse_hessian: number;
  /** Bayesian-shrinkage-estimated baseline contamination rate from training prefix. */
  p_base: number;
  /** True iff log_S ever reached log(1/alphaFleet) within the test windows. */
  fired: boolean;
  /** Window index where log_S first crossed the threshold; null if not fired. */
  fire_window: number | null;
  /** Count of test windows processed; w ∈ [trainingWindowCount, W_aligned). */
  n_windows_test: number;
  /** Threshold = log(1/alphaFleet); included for audit. */
  log_threshold: number;
}

/** Result of `curateBaselineFleetCorrelated`. */
export interface FleetCorrelatedResult {
  /** New BaselineBundle with BOTH Stage 2a per-shard contaminated ticks AND
   *  Stage 2b fleet-event window (if fired) dropped from each run's signal_series. */
  curatedBundle: BaselineBundle;
  /** Audit records: D11 (Stage 2a Per-shard within-window screening),
   *  D12 (Stage 2b FCP-1 fleet-correlated detection), D13 (Stage 3b wire format). */
  decisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>;
  /** FCP-1 final state — exposed for downstream inspection + AC binding. */
  fcp1State: Fcp1State;
}

/** Internal helper — non-exported. Per-run Stage 2a MCD screening; returns the
 *  per-tick contamination mask used by the cross-shard X_w aggregation. */
interface ScreenRunMaskResult {
  keptIndices: number[];                    // indices of clean (non-contaminated) ticks; sorted ascending
  contaminationMask: boolean[];             // length = totalTicks; true = contaminated, false = clean
  totalTicks: number;                       // === minLen across signals; 0 if outcome is a skipped-class
  outcome: 'screened' | 'skipped_insufficient_samples' | 'skipped_mcd_failed' | 'skipped_no_signals';
}

function screenRunMask(
  run: BaselineBundle['runs'][number],
  mcdAlpha: number,
  mcdSeed: number,
): ScreenRunMaskResult {
  const sortedSignals = Object.keys(run.signal_series).sort();
  const p = sortedSignals.length;
  if (p === 0) {
    return { keptIndices: [], contaminationMask: [], totalTicks: 0, outcome: 'skipped_no_signals' };
  }
  const minLen = Math.min(...sortedSignals.map((sig) => run.signal_series[sig].length));
  if (minLen < p + 1) {
    return { keptIndices: [], contaminationMask: [], totalTicks: 0, outcome: 'skipped_insufficient_samples' };
  }
  const rows: number[][] = [];
  for (let i = 0; i < minLen; i++) {
    const row = new Array<number>(p);
    for (let j = 0; j < p; j++) {
      row[j] = run.signal_series[sortedSignals[j]][i];
    }
    rows.push(row);
  }
  const mcd = fastMCD(rows, mcdAlpha, mcdSeed);
  if (mcd === null) {
    return { keptIndices: [], contaminationMask: [], totalTicks: 0, outcome: 'skipped_mcd_failed' };
  }
  const L = choleskyLocal(mcd.cov);
  if (L === null) {
    return { keptIndices: [], contaminationMask: [], totalTicks: 0, outcome: 'skipped_mcd_failed' };
  }
  const cutoff = chiSqQuantile975(p);
  const mask: boolean[] = new Array<boolean>(minLen).fill(false);
  const keptIndices: number[] = [];
  for (let i = 0; i < minLen; i++) {
    const d2 = mahalanobisSqFromL(rows[i], mcd.mean, L);
    if (d2 > cutoff) {
      mask[i] = true;
    } else {
      keptIndices.push(i);
    }
  }
  return { keptIndices, contaminationMask: mask, totalTicks: minLen, outcome: 'screened' };
}

/** Pure sequential e-process — exposed for PR-F8 evidence-matrix testing on
 *  directly-synthesized X_w sequences (bypassing Stage 2a MCD screening).
 *
 *  Disjoint training prefix: windows [0, K) used to estimate p_base via Bayesian
 *  shrinkage; test e-process runs over windows [K, W). K = clamp(opts.trainingWindowCount,
 *  0, max(0, W - 1)). If K === 0 OR N === 0: p_base falls back to opts.pBasePrior
 *  (no empirical update). Single-fire-per-bundle: once log_S ≥ log(1/alphaFleet),
 *  state.fired stays true; subsequent windows continue updating log_S for audit
 *  visibility but state.fire_window records the FIRST crossing only.
 *
 *  ONS update mirrors engine/detectors/family-c-betting-e-process.ts:231-244
 *  canonical pattern at SHA 5a72371. */
export function runFleetCorrelatedEProcess(
  xCounts: readonly number[],
  N: number,
  opts: Fcp1Opts = {},
): Fcp1State {
  const alphaFleet = opts.alphaFleet ?? DEFAULT_ALPHA_FLEET;
  const pBasePrior = opts.pBasePrior ?? DEFAULT_P_BASE_PRIOR;
  const shrinkageKappa = opts.shrinkageKappa ?? DEFAULT_SHRINKAGE_KAPPA;
  const trainingWindowCount = opts.trainingWindowCount ?? DEFAULT_TRAINING_WINDOW_COUNT;
  const lambdaMax = opts.lambdaMax ?? DEFAULT_LAMBDA_MAX;

  const W = xCounts.length;
  const K = Math.min(trainingWindowCount, Math.max(0, W - 1));
  const log_threshold = Math.log(1 / alphaFleet);

  let p_base: number;
  if (K === 0 || N === 0) {
    p_base = pBasePrior;
  } else {
    let burnSum = 0;
    for (let w = 0; w < K; w++) burnSum += xCounts[w];
    const p_burn = burnSum / (N * K);
    p_base = (N * K * p_burn + shrinkageKappa * pBasePrior) / (N * K + shrinkageKappa);
  }

  let log_S = 0;
  let log_S_max = 0;
  let ons_lambda = 0;
  let ons_inverse_hessian = 1;
  let fired = false;
  let fire_window: number | null = null;
  let n_windows_test = 0;

  for (let w = K; w < W; w++) {
    n_windows_test += 1;
    const F_w = N > 0 ? (xCounts[w] / N) - p_base : -p_base;
    const wealth_factor = 1 + ons_lambda * F_w;
    const log_factor = Math.log(Math.max(wealth_factor, LOG_FACTOR_FLOOR));
    log_S += log_factor;
    if (log_S > log_S_max) log_S_max = log_S;

    // ONS bet update (predictable; uses current F_w).
    const denom = 1 + ons_lambda * F_w;
    if (Math.abs(denom) >= 1e-12) {
      const z = -F_w / denom;
      ons_inverse_hessian += z * z;
      let lambda_new = ons_lambda - (ONS_STEP_SIZE_C * z) / ons_inverse_hessian;
      if (lambda_new > lambdaMax) lambda_new = lambdaMax;
      else if (lambda_new < -lambdaMax) lambda_new = -lambdaMax;
      ons_lambda = lambda_new;
    }

    // Single-fire-per-bundle fire check.
    if (!fired && log_S >= log_threshold) {
      fired = true;
      fire_window = w;
    }
  }

  return {
    log_S,
    log_S_max,
    ons_lambda,
    ons_inverse_hessian,
    p_base,
    fired,
    fire_window,
    n_windows_test,
    log_threshold,
  };
}

/** Stage 2a + Stage 2b + Stage 3b on a BaselineBundle.
 *
 *  Ordering enforced (Q-JC3 disposition):
 *    1. Stage 2a: per-run screenRunMask → per-(shard, tick) contamination masks +
 *       Stage 2a per-run skip counters.
 *    2. Stage 2b: aggregate masks into X_w → run FCP-1 e-process → compute fire_window
 *       (or null) → curated bundle drops Stage 2a contaminated ticks AND Stage 2b
 *       fleet-event window (if fired) from each run's signal_series.
 *    3. Stage 3b: D13 wire format = sentinel string derived from FCP-1 audit token +
 *       baseline identity segment; downstream consumer ingests as residualSeedHash.
 *
 *  Returns a NEW BaselineBundle; the input bundle is not mutated. */
export function curateBaselineFleetCorrelated(
  bundle: BaselineBundle,
  opts: FleetCorrelatedOpts = {},
): FleetCorrelatedResult {
  const mcdAlpha = opts.mcdAlpha ?? FASTMCD_DEFAULT_ALPHA;
  const mcdSeed = opts.mcdSeed ?? FASTMCD_DEFAULT_SEED;

  // ─── Stage 2a — per-run mask materialization ────────────────────
  const perRunMaskResults: ScreenRunMaskResult[] = bundle.runs.map(
    (run) => screenRunMask(run, mcdAlpha, mcdSeed),
  );

  let nRunsScreened = 0;
  let nRunsSkippedInsufficientSamples = 0;
  let nRunsSkippedMcdFailed = 0;
  let nTicksTotalStage2a = 0;
  let nTicksContaminatedStage2a = 0;
  for (const r of perRunMaskResults) {
    if (r.outcome === 'screened') {
      nRunsScreened += 1;
      nTicksTotalStage2a += r.totalTicks;
      for (const m of r.contaminationMask) if (m) nTicksContaminatedStage2a += 1;
    } else if (r.outcome === 'skipped_insufficient_samples') {
      nRunsSkippedInsufficientSamples += 1;
    } else if (r.outcome === 'skipped_mcd_failed') {
      nRunsSkippedMcdFailed += 1;
    }
    // 'skipped_no_signals' is silently absorbed; not separately counted (parallels R06 behavior).
  }

  // ─── Stage 2b — cross-shard aggregation + FCP-1 e-process ──────
  const screenedRuns = perRunMaskResults.filter((r) => r.outcome === 'screened');
  const N = screenedRuns.length;
  const W_aligned = N > 0 ? Math.min(...screenedRuns.map((r) => r.totalTicks)) : 0;
  const xCounts: number[] = new Array<number>(W_aligned).fill(0);
  for (let w = 0; w < W_aligned; w++) {
    let count = 0;
    for (const r of screenedRuns) {
      if (r.contaminationMask[w]) count += 1;
    }
    xCounts[w] = count;
  }

  const fcp1State = runFleetCorrelatedEProcess(xCounts, N, opts);

  // ─── Build curated bundle (Stage 2a drops + Stage 2b fire-window drop) ───
  // Stage 2b drop applies fire_window in the ORIGINAL per-run tick coordinates;
  // for screened runs, the index is dropped iff it's in the run's keptIndices
  // (otherwise it's already dropped by Stage 2a — no-op); for skipped runs, the
  // index is dropped iff fire_window < run.totalTicks at the original run.
  const fireWindow = fcp1State.fired ? fcp1State.fire_window : null;

  const curatedRuns = bundle.runs.map((run, runIdx) => {
    const maskResult = perRunMaskResults[runIdx];
    const sortedSignals = Object.keys(run.signal_series).sort();

    // Determine the final kept indices for this run after both Stage 2a and Stage 2b drops.
    let finalKept: number[];
    if (maskResult.outcome === 'screened') {
      finalKept = maskResult.keptIndices.slice();  // Stage 2a clean set
      if (fireWindow !== null) {
        finalKept = finalKept.filter((i) => i !== fireWindow);  // Stage 2b drop
      }
    } else {
      // Skipped runs: Stage 2a was a pass-through; Stage 2b drops the fire_window
      // index in the ORIGINAL signal_series coordinates (truncated to the run's
      // minimum signal length so out-of-range indices are silently no-op).
      const minLenThis = sortedSignals.length === 0
        ? 0
        : Math.min(...sortedSignals.map((sig) => run.signal_series[sig].length));
      finalKept = [];
      for (let i = 0; i < minLenThis; i++) {
        if (fireWindow !== null && i === fireWindow) continue;
        finalKept.push(i);
      }
    }

    // Build the curated run from finalKept indices.
    const newSignalSeries: Record<string, number[]> = {};
    for (const sig of sortedSignals) {
      newSignalSeries[sig] = finalKept.map((i) => run.signal_series[sig][i]);
    }
    const curated: BaselineBundle['runs'][number] = { signal_series: newSignalSeries };
    if (run.tenant_id !== undefined) curated.tenant_id = run.tenant_id;
    if (run.hour_of_day !== undefined) {
      curated.hour_of_day = finalKept.map((i) => run.hour_of_day![i]);
    }
    if (run.day_of_week !== undefined) {
      curated.day_of_week = finalKept.map((i) => run.day_of_week![i]);
    }
    return curated;
  });

  const curatedBundle: BaselineBundle = {
    version: bundle.version,
    generated_at: bundle.generated_at,
    seed: bundle.seed,
    runs: curatedRuns,
  };
  if (bundle.cell_dim !== undefined) curatedBundle.cell_dim = bundle.cell_dim;

  // ─── D11 audit (Stage 2a) ──────────────────────────────────────
  const d11: BaselineCurationDecision = {
    decision_id: 'D11',
    decision_name: 'Per-shard within-window contamination screening',
    inputs: {
      upstream_decisions: undefined,
      compile_state_ref:
        'BaselineBundle.runs[].signal_series[sig][tick] → fastMCD(α=' + mcdAlpha + ', seed=' + mcdSeed
        + ') + Mahalanobis cutoff χ²_p(0.975)',
    },
    output_summary: {
      n_runs_total: bundle.runs.length,
      n_runs_screened: nRunsScreened,
      n_runs_skipped_insufficient_samples: nRunsSkippedInsufficientSamples,
      n_runs_skipped_mcd_failed: nRunsSkippedMcdFailed,
      n_ticks_total: nTicksTotalStage2a,
      n_ticks_contaminated: nTicksContaminatedStage2a,
      contamination_rate: nTicksTotalStage2a > 0 ? nTicksContaminatedStage2a / nTicksTotalStage2a : 0,
      mcd_method: 'mcd',
      mcd_alpha: mcdAlpha,
    },
    decision_rule:
      'Tessera SLICE 4 D11 — per-shard within-window MCD-robust Mahalanobis screening at '
      + 'χ²_p(0.975) cutoff. Q-JC1 (α) vendor-at-pin + Q-JC2 pre-pass-only + Q-JC3 per-shard-first.',
    verification: {
      audit_emitted: true,
      diagnostic_path: 'CompiledConfig.baseline_curation_pipeline_diagnostics.D11',
    },
    source_memorialization:
      'ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION (Q-JC1 α + Q-JC2 + Q-JC3); '
      + 'SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2 Stage 2a.',
  };

  // ─── D12 audit (Stage 2b FCP-1) ────────────────────────────────
  const alphaFleet = opts.alphaFleet ?? DEFAULT_ALPHA_FLEET;
  const pBasePrior = opts.pBasePrior ?? DEFAULT_P_BASE_PRIOR;
  const shrinkageKappa = opts.shrinkageKappa ?? DEFAULT_SHRINKAGE_KAPPA;
  const trainingWindowCount = opts.trainingWindowCount ?? DEFAULT_TRAINING_WINDOW_COUNT;
  const lambdaMax = opts.lambdaMax ?? DEFAULT_LAMBDA_MAX;

  const d12: BaselineCurationDecision = {
    decision_id: 'D12',
    decision_name: 'Fleet-correlated contamination detection',
    inputs: {
      upstream_decisions: ['D11'],
      compile_state_ref:
        'X_w = Σ_(s : screened) contamination_mask[s][w]; Bayesian shrinkage p_base; sequential ONS e-process',
    },
    output_summary: {
      alpha_fleet: alphaFleet,
      p_base_prior: pBasePrior,
      shrinkage_kappa: shrinkageKappa,
      training_window_count: trainingWindowCount,
      lambda_max: lambdaMax,
      n_shards_screened: N,
      n_windows_aligned: W_aligned,
      n_windows_test: fcp1State.n_windows_test,
      p_base: fcp1State.p_base,
      fired: fcp1State.fired,
      fire_window: fcp1State.fire_window === null ? -1 : fcp1State.fire_window,
      log_threshold: fcp1State.log_threshold,
      log_S_final: fcp1State.log_S,
      log_S_max: fcp1State.log_S_max,
    },
    decision_rule:
      'Tessera SLICE 5 D12 — sequential betting-adaptive e-process; Bayesian shrinkage p_base from '
      + 'disjoint training prefix (Q-JC4b LOAD-BEARING); ONS bet (Q-JC4a β); single-fire-per-bundle '
      + 'preserving anytime-valid Ville bound (Q-JC4). Separate pipe from Q-J1 e-BH per Q-JC4c.',
    verification: {
      audit_emitted: true,
      diagnostic_path: 'CompiledConfig.baseline_curation_pipeline_diagnostics.D12',
    },
    source_memorialization:
      'ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION (Q-JC4/4a/4b/4c); '
      + 'SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2 Stage 2b.',
  };

  // ─── D13 audit (Stage 3b wire format) ──────────────────────────
  const fleetEventWindowIndices: number[] = fcp1State.fired && fcp1State.fire_window !== null
    ? [fcp1State.fire_window] : [];
  const fcp1AuditToken = 'fcp1:fired=' + String(fcp1State.fired) + ':windows='
    + JSON.stringify(fleetEventWindowIndices);
  const baselineIdentitySegment = bundle.version + '|' + String(bundle.seed);
  const residualSeedHashSentinel = 'tessera-fcp1-v1::' + baselineIdentitySegment + '::' + fcp1AuditToken;

  const d13: BaselineCurationDecision = {
    decision_id: 'D13',
    decision_name: 'Warm-start eligibility tagging (FCP-1 wire format)',
    inputs: {
      upstream_decisions: ['D12'],
      compile_state_ref:
        'tessera-fcp1-v1::<bundle.version>|<bundle.seed>::fcp1:fired=<bool>:windows=<json>',
    },
    output_summary: {
      fleet_event_detected: fcp1State.fired,
      n_fleet_event_windows: fleetEventWindowIndices.length,
      fleet_event_window_indices: JSON.stringify(fleetEventWindowIndices),
      fcp1_audit_token: fcp1AuditToken,
      residual_seed_hash_sentinel: residualSeedHashSentinel,
      wire_format_version: 'tessera-fcp1-v1',
    },
    decision_rule:
      'Tessera SLICE 5 D13 — Q-JC5 wire format. Sentinel string for downstream calibrate.ts wiring '
      + '(R08+) to use as residualSeedHash; R03 warm-start.ts:74-75 reset semantic detects any '
      + 'change. Distinct prefix tessera-fcp1-v1 ensures sentinel differs from any pre-FCP-1 hash.',
    verification: {
      audit_emitted: true,
      diagnostic_path: 'CompiledConfig.baseline_curation_pipeline_diagnostics.D13',
    },
    source_memorialization:
      'ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION (Q-JC5); '
      + 'SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2 Stage 3b; '
      + 'tessera/engine/per-shard/warm-start.ts:74-75 (R03 reset semantic).',
  };

  return {
    curatedBundle,
    decisions: { D11: d11, D12: d12, D13: d13 },
    fcp1State,
  };
}
```

Implementer note: the function is two pure-function passes (no I/O; no module-level state); behavior is fully determined by `bundle` + `opts`. The function never mutates `bundle`. Use `node --test` + the q07 test file as the primary verification surface. Note that `fire_window: number | null` cannot be directly serialized into `output_summary` (typed `Record<string, number | string | boolean>` per inherited config.ts:245) — the spec encodes `null` as the literal value `-1` in `d12.output_summary.fire_window`; a separate field `n_fleet_event_windows` (0 or 1) distinguishes "not fired" (where -1 is the sentinel) from a legitimate window index 0+. AC-19 binds this encoding.

### Delta 2 — `test/q07-fleet-correlated.test.ts` (CREATED — TDD RED)

Test file structure (21 in-file tests binding AC-1 through AC-21; narrative-vs-pseudocode AC-count cross-check):

```ts
// test/q07-fleet-correlated.test.ts — R07 AC-1 through AC-21.
//
// Binds the SLICE 5 Stage 2b FCP-1 + Stage 3b warm-start eligibility wire-format at
// tools/curate-baseline-fleet-correlated.ts. Includes PR-F8 evidence-matrix tests
// (H₀ FPR + H₁ power) using deterministic-seed mulberry32 + Bernoulli synthesis.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BaselineBundle, BaselineCurationDecision } from '../engine/types/config';
import {
  curateBaselineFleetCorrelated,
  runFleetCorrelatedEProcess,
  type Fcp1Opts,
  type FleetCorrelatedOpts,
  type Fcp1State,
  type FleetCorrelatedResult,
} from '../tools/curate-baseline-fleet-correlated';

// ─── PRNG + Binomial helpers (test-local; cross-platform-deterministic per
//      mulberry32 + Bernoulli summation precedent at family-c-rff.ts) ───
const FCP1_TEST_SEED = 0xFCD1;
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Simulate one trial: draw W X_w values where X_w ~ Binomial(N, p) IID. */
function simulateH0(seed: number, W: number, N: number, p: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = new Array<number>(W).fill(0);
  for (let w = 0; w < W; w++) {
    let count = 0;
    for (let s = 0; s < N; s++) if (rng() < p) count += 1;
    out[w] = count;
  }
  return out;
}
/** Same as simulateH0 but at window w_inject use X_w ~ Binomial(N, p_alt) instead of p_base. */
function simulateH1(seed: number, W: number, N: number, p_base: number, w_inject: number, p_alt: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = new Array<number>(W).fill(0);
  for (let w = 0; w < W; w++) {
    const p_w = w === w_inject ? p_alt : p_base;
    let count = 0;
    for (let s = 0; s < N; s++) if (rng() < p_w) count += 1;
    out[w] = count;
  }
  return out;
}

// ─── Stage 2a helper behavior bindings (AC-1..AC-4 — via the public
//      curateBaselineFleetCorrelated entry; helper itself is non-exported) ───
//
// AC-1: clean bundle through full pipeline; n_runs_screened === 1; D11 + D12 + D13 emitted.
// AC-2: outlier bundle through full pipeline; mask flags the outlier; Stage 2a drops it.
// AC-3: insufficient-samples bundle; outcome is skipped; X_w trivially 0; FCP-1 doesn't fire.
// AC-4: no-signals bundle (signal_series = {}); outcome is skipped_no_signals; FCP-1 doesn't fire.

// ─── FCP-1 algorithm bindings (AC-5..AC-10 — via runFleetCorrelatedEProcess directly) ───
//
// AC-5: wealth update formula on a hand-computed F_w sequence (test computes expected
//       log_S step-by-step using the same formula; production must match within 1e-10).
// AC-6: ONS bet update on a hand-computed F_w sequence (test computes expected ons_lambda
//       step-by-step; production must match within 1e-10).
// AC-7: Bayesian shrinkage p_base computation on a hand-computed training prefix
//       (X_w sequence + opts produces p_base via closed-form formula).
// AC-8: fire condition — X_w sequence designed so log_S crosses threshold at specific
//       window; state.fired === true; state.fire_window === that window.
// AC-9: no-fire condition — X_w sequence designed so log_S stays sub-threshold;
//       state.fired === false; state.fire_window === null.
// AC-10: min-training-windows guard — W ≤ trainingWindowCount; state.fired === false;
//        n_windows_test === 0; p_base === pBasePrior fallback.

// ─── PR-F8 evidence matrix bindings (AC-11..AC-14) ───
//
// AC-11: H₀ FPR — 30 trials × W=200 × N=100 × p_base=0.025 → fire count === 0 at α_fleet=10⁻³.
// AC-12: H₁ power (strong injection) — 30 trials × W=200 × N=100 × p_base=0.025 × w_inject=100
//        × p_alt=0.5 (50% fleet contamination at fleet event) → fire count >= specific (computed
//        from spec prediction; Implementer reports OBSERVED; AC-12 binds the OBSERVED count).
// AC-13: H₁ power (weak injection) — 30 trials × W=200 × N=100 × p_base=0.025 × w_inject=100
//        × p_alt=0.1 → fire count === specific (deterministic).
// AC-14: martingale property — at the first test window post-K, ons_lambda === 0 initially;
//        therefore log_factor === log(1 + 0 * F_w) === 0 regardless of F_w; therefore log_S
//        is unchanged at the first post-K window REGARDLESS of F_w.

// ─── Stage 2b composition on BaselineBundle (AC-15..AC-17) ───
//
// AC-15: clean fleet bundle through full pipeline → curatedBundle preserves all SCREENED-clean
//        ticks (no Stage 2b drop because FCP-1 didn't fire); D12 fired === false.
// AC-16: outlier-fleet bundle (mass-contamination at one tick across all runs) → FCP-1 fires;
//        curatedBundle DROPS the fire_window tick from ALL runs' signal_series; D12 fired === true.
// AC-17: mixed bundle (some runs skipped insufficient-samples) → skipped runs contribute 0 to X_w;
//        N_aligned = count of SCREENED runs; D11 counters reflect skip outcomes.

// ─── D11 + D12 + D13 emission bindings (AC-18..AC-21) ───
//
// AC-18: all three decisions populated; result.decisions has keys [D11, D12, D13] sorted.
// AC-19: D12 output_summary contains the required fields with their literal types.
// AC-20: D13 output_summary contains the required fields including residual_seed_hash_sentinel
//        in the expected format (literal prefix 'tessera-fcp1-v1::' present; bundle.version +
//        bundle.seed + audit token segments concatenated).
// AC-21: D13 sentinel is DETERMINISTIC — two invocations on the same bundle + opts produce
//        identical sentinel strings.
```

(Note: the test bodies above are SPEC PSEUDOCODE — the Implementer writes the actual literal-value assertions inline using the patterns above. Test count is 21 in-file tests structurally pre-determined; AC-23 binds count===21.)

Implementer note: the 21 ACs structurally pre-determine the q07 in-file test count at 21 (R03 MINOR-4 reinforcement: pre-stated counts are acceptable when structurally determined by the spec). The R04 / R05 / R06 precedent for hand-computed expected values applies: AC-5, AC-6, AC-7 use closed-form expected values computed in the test code; AC-11, AC-12, AC-13 use deterministic-seed simulation where the AC binds the OBSERVED count (Architect's pre-prediction is 0 for AC-11, but Implementer reports the actual count). If the AC count differs from Architect prediction at GREEN, that's a spec-prediction error to surface inline per the R06 OBS-1 precedent.

---

## Acceptance criteria

All ACs use "Given X, when Y, then Z" form; no banned words ("correctly", "appropriately", "as needed"). Each AC binds to a specific named test or a specific Reviewer-run binding command. Literal values are spelled out in fixtures + assertions per the R02/R04/R05/R06 spec-AC-literal-value reinforcement.

**Stage 2a helper behavior (q07 test file binds; tested via the public `curateBaselineFleetCorrelated` entry):**

- **AC-1** — _Given_ a clean BaselineBundle (8 ticks × 2 signals × 1 run, no outliers), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D11!.output_summary.n_runs_screened === 1` AND `result.decisions.D11!.output_summary.n_runs_skipped_insufficient_samples === 0` AND `result.decisions.D11!.output_summary.n_runs_skipped_mcd_failed === 0` AND `Object.keys(result.decisions).sort()` deep-equals `['D11', 'D12', 'D13']`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-1 …" passes.

- **AC-2** — _Given_ an outlier BaselineBundle (8 ticks × 2 signals × 1 run, tick 7 = (100, 100)), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D11!.output_summary.n_ticks_contaminated >= 1` AND `!result.curatedBundle.runs[0].signal_series.a.includes(100)` AND `!result.curatedBundle.runs[0].signal_series.b.includes(100)`. (Stage 2a behavior preserved from R06 AC-4 logic; verifies the helper applies MCD-driven mask correctly.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-2 …" passes.

- **AC-3** — _Given_ an insufficient-samples BaselineBundle (2 ticks × 2 signals × 1 run; n=2 < p+1=3), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D11!.output_summary.n_runs_skipped_insufficient_samples === 1` AND `result.decisions.D11!.output_summary.n_runs_screened === 0` AND `result.fcp1State.fired === false` AND `result.fcp1State.n_windows_test === 0`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-3 …" passes.

- **AC-4** — _Given_ a no-signals BaselineBundle (1 run with `signal_series: {}`), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D11!.output_summary.n_runs_screened === 0` AND `result.fcp1State.fired === false` AND `result.fcp1State.n_windows_test === 0`. (Verifies the skipped_no_signals outcome flows through without exception.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-4 …" passes.

**FCP-1 algorithm bindings (q07 test file binds; via `runFleetCorrelatedEProcess` directly):**

- **AC-5** — _Given_ X_w sequence `[2, 3, 2, 4, 3]` with N=100, opts `{ pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3, lambdaMax: 0.5 }`, _when_ `runFleetCorrelatedEProcess(xCounts, N, opts)` is called, _then_ at the first test window (w=2) `log_factor` equals `log(1)` (because `ons_lambda === 0` initially → wealth_factor === 1) AND the final `log_S` matches the closed-form sum of `log(max(1 + λ_{w-1} * F_w, 1e-12))` across w=2,3,4 computed in the test body to within 1e-10. (Verifies the wealth update formula step-by-step against hand-computed expected values per the trace in Implementer note 5.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-5 …" passes.

- **AC-6** — _Given_ the same X_w sequence and opts as AC-5, _when_ `runFleetCorrelatedEProcess` is called, _then_ the final `ons_lambda` matches the closed-form ONS update sequence computed in the test body to within 1e-10 (per the trace in Implementer note 5; clamp at ±0.5 verified by AC-6 fixture choosing F_w values that don't saturate). Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-6 …" passes.

- **AC-7** — _Given_ X_w sequence `[2, 3]` (K=2 training windows) with N=100, opts `{ pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, ... }`, _when_ `runFleetCorrelatedEProcess` is called, _then_ `result.p_base === 0.025` exactly (computed: `p_burn = (2+3)/(100·2) = 0.025`; `p_base = (200·0.025 + 1.0·0.025) / 201 = 5.025/201 = 0.025`). Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-7 …" passes.

- **AC-8** — _Given_ X_w sequence `[0, 0]` (K=2 training at p_burn=0) followed by 30 elements all equal to `100` (test windows all at X=N=100 → maximally elevated; total fixture length 32) with N=100, opts `{ pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3, lambdaMax: 0.5 }`, _when_ `runFleetCorrelatedEProcess` is called, _then_ `result.fired === true` AND `result.fire_window !== null` AND `result.fire_window >= 3` AND `result.fire_window <= 25`. (Architect hand-trace: at w=2 the first test window has ons_lambda=0 → wealth_factor=1 → log_S unchanged; ONS update bumps λ rapidly toward the +0.5 clamp because z = -F/denom = -0.975/1 ≈ -0.975 ⇒ lambda_new = 0 + ONS_STEP_SIZE_C·0.975/A_2 saturates at 0.5. Subsequent windows w=3..31 each contribute log_factor = log(1 + 0.5·0.975) = log(1.4875) ≈ 0.3974 to log_S. log(1/α_fleet) = log(1000) ≈ 6.908; ≈18 wealth-accumulating windows needed to cross; 30 elevated test windows provides margin. fire_window expected around K + 18 = 20; bound to [3, 25] gives margin against the constant-value comment-vs-actual-runtime drift documented at grilling assumption 2.) The Implementer reports the OBSERVED fire_window value at GREEN per R03 MINOR-4 reinforcement; AC-8 binds the BEHAVIORAL property + bracket bound, not the specific window. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-8 …" passes.

- **AC-9** — _Given_ X_w sequence of length 200 with all `X_w === 2` (constant low contamination matching p_base), N=100, default opts (alphaFleet=1e-3, trainingWindowCount=10, etc.), _when_ `runFleetCorrelatedEProcess` is called, _then_ `result.fired === false` AND `result.fire_window === null` AND `result.log_S` is bounded (final |log_S| < 1). (No-fire fixture: F_w stays at small values near 0 → wealth growth negligible.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-9 …" passes.

- **AC-10** — _Given_ X_w sequence `[5, 5, 5, 5, 5]` (W=5) with default opts (trainingWindowCount=10, pBasePrior=0.025, ...), _when_ `runFleetCorrelatedEProcess` is called, _then_ `result.n_windows_test === 0` AND `result.fired === false` AND `result.p_base === 0.025` (clamps K to max(0, W-1)=4; with W=5, K=min(10, 4)=4, test windows = [4, 5) = 1 window; OR clamps K=min(10, W-1)=4, test windows = [4, 5) = 1 window, so n_windows_test === 1 actually. Let me recompute: with `trainingWindowCount=10` and `W=5`, `K=Math.min(10, Math.max(0, 5-1))=Math.min(10,4)=4`. Test windows = [4, 5) = 1 window. So `n_windows_test === 1`. AC-10 binds `n_windows_test === 1` AND `p_base` is computed from windows [0,4) per the Bayesian-shrinkage formula. SEPARATE AC for `n_windows_test === 0` case: when W=0 (empty xCounts), `K = min(10, max(0, -1)) = min(10, 0) = 0`, `result.p_base === pBasePrior`, `result.fired === false`, `result.n_windows_test === 0`. AC-10 binds the W=0 case: `runFleetCorrelatedEProcess([], 100, {})` returns `{ fired: false, fire_window: null, n_windows_test: 0, p_base: 0.025, log_S: 0, ... }`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-10 …" passes.

**PR-F8 evidence matrix (q07 test file binds; deterministic-seed mulberry32 + Bernoulli synthesis):**

- **AC-11** — _Given_ 30 H₀ trials (seeds `FCP1_TEST_SEED + trial_idx` for `trial_idx ∈ [0, 30)`), each generating `simulateH0(seed, W=200, N=100, p=0.025)`, _when_ each `runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 })` is called, _then_ the count of trials with `result.fired === true` equals the OBSERVED count at GREEN. **Architect prediction**: 0 (expected per Ville bound and small per-trial fire probability ≈ 10⁻³ × loose tail; 30 trials → expected ≈ 0.03 fires). Implementer reports OBSERVED at GREEN per R03 MINOR-4 reinforcement. AC-11 binds the OBSERVED count exactly. If observed === 0, the AC asserts `assert.strictEqual(fired_count, 0)`. If observed differs, see Implementer note on architect spec-prediction at primitive 11. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-11 …" passes.

- **AC-12** — _Given_ 30 H₁ trials with strong injection (seeds `FCP1_TEST_SEED + 1000 + trial_idx` for `trial_idx ∈ [0, 30)`), each generating `simulateH1(seed, W=200, N=100, p_base=0.025, w_inject=100, p_alt=0.5)`, _when_ each `runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 })` is called, _then_ the count of trials with `result.fired === true` equals the OBSERVED count at GREEN. **Architect prediction**: between 20 and 30 of 30 (strong elevation at p_alt=0.5 with N=100 / 100 windows of buildup before injection + 99 of recovery; ONS will have built lambda toward the elevated direction; injection produces F_w≈0.475 which times lambda≈0.5 → wealth growth ≈log(1.2375)≈0.213 per such window). Implementer reports OBSERVED at GREEN. AC-12 binds the OBSERVED count exactly. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-12 …" passes.

- **AC-13** — _Given_ 30 H₁ trials with weak injection (seeds `FCP1_TEST_SEED + 2000 + trial_idx` for `trial_idx ∈ [0, 30)`), each generating `simulateH1(seed, W=200, N=100, p_base=0.025, w_inject=100, p_alt=0.1)`, _when_ each `runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 })` is called, _then_ the count of trials with `result.fired === true` equals the OBSERVED count at GREEN. **Architect prediction**: between 0 and 15 of 30 (weak elevation at p_alt=0.1; F_w≈0.075 at injection → wealth contribution insufficient for reliable firing). Implementer reports OBSERVED. AC-13 binds the OBSERVED count exactly. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-13 …" passes.

- **AC-14** — _Given_ ANY X_w sequence with W > K and N > 0, _when_ `runFleetCorrelatedEProcess(xCounts, N, opts)` is called, _then_ after processing ONLY the FIRST test window (w === K), `result.log_S === Math.log(Math.max(1 + 0 * F_K, 1e-12)) === Math.log(1) === 0` (because `ons_lambda === 0` at the first test window). Test fixture: `xCounts = [0, 0, 100]` (K=2 default `trainingWindowCount=2` for this test; actually use opts override `trainingWindowCount: 2`); N=100; check `result.log_S` after processing — actually the function processes ALL windows in one call, so we need to verify the per-window state via a different mechanism. **Revised AC-14 binding**: use a fixture where `xCounts = [0, 0, 100]`, opts `{ trainingWindowCount: 2, alphaFleet: 1e-3 }`; final `result.log_S` is dominated by the second test window (w=2 nothing; w=2 only) — wait the W=3, K=2, test windows=[2, 3)=1 window only. So `result.log_S === 0` (no log change at first test window when ons_lambda=0). AC-14 binds `result.log_S === 0` AND `result.ons_lambda` is updated per the ONS formula (verifies the martingale property at the per-step level: first-test-window log_S unchanged regardless of F_w). Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-14 …" passes.

**Stage 2b composition on BaselineBundle (q07 test file binds):**

- **AC-15** — _Given_ a clean fleet BaselineBundle (3 runs × 8 ticks × 2 signals, no outliers anywhere), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.fcp1State.fired === false` AND `result.decisions.D12!.output_summary.fired === false` AND `result.decisions.D12!.output_summary.fire_window === -1` AND for each run `result.curatedBundle.runs[k].signal_series.a.length` equals the post-Stage-2a-only length (no Stage 2b drop — fire_window is null). Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-15 …" passes.

- **AC-16** — _Given_ a fleet-event BaselineBundle constructed to RELIABLY fire FCP-1 (10 runs × 25 ticks × 2 signals; ticks [0, 5) clean baseline (low contamination); ticks [5, 25) all 10 runs have value (100, 100) at the SAME tick index (e.g., tick 12) — extreme cross-shard correlated outlier at window 12), _when_ `curateBaselineFleetCorrelated(bundle, { trainingWindowCount: 5, alphaFleet: 1e-3 })` is called, _then_ `result.fcp1State.fired === true` AND `result.fcp1State.fire_window === 12` (or close — Implementer reports OBSERVED; AC-16 binds `result.fcp1State.fired === true` AND `result.fcp1State.fire_window !== null`) AND for each curated run, the curated `signal_series.a.length === (original length - Stage 2a drops - 1 Stage 2b drop)` — verifies Stage 2b drops tick 12 from ALL runs' signal_series. (Architect prediction: with massive correlated outlier at tick 12, all 10 runs' Stage 2a masks flag tick 12 → X_12 = 10 = N → F_12 = 1 - p_base ≈ 0.975 → ONS bet adapts → wealth grows; fire likely within a few windows of detection. Exact fire_window is deterministic but observed at GREEN.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-16 …" passes.

- **AC-17** — _Given_ a mixed BaselineBundle (2 runs SCREENED at 8 ticks × 2 signals each + 1 run INSUFFICIENT-SAMPLES at 2 ticks × 2 signals), _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D11!.output_summary.n_runs_screened === 2` AND `result.decisions.D11!.output_summary.n_runs_skipped_insufficient_samples === 1` AND `result.decisions.D12!.output_summary.n_shards_screened === 2` (skipped run contributes nothing to N) AND `result.decisions.D12!.output_summary.n_windows_aligned === 8` (min length across SCREENED runs only — the 2-tick skipped run doesn't affect alignment). Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-17 …" passes.

**D11 + D12 + D13 emission bindings (q07 test file binds):**

- **AC-18** — _Given_ any BaselineBundle, _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `Object.keys(result.decisions).sort()` deep-equals `['D11', 'D12', 'D13']`. (All three decisions populated.) Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-18 …" passes.

- **AC-19** — _Given_ a clean fleet BaselineBundle, _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D12!.output_summary` contains literal keys: `alpha_fleet`, `p_base_prior`, `shrinkage_kappa`, `training_window_count`, `lambda_max`, `n_shards_screened`, `n_windows_aligned`, `n_windows_test`, `p_base`, `fired`, `fire_window`, `log_threshold`, `log_S_final`, `log_S_max`. AND `result.decisions.D12!.decision_id === 'D12'` AND `result.decisions.D12!.decision_name === 'Fleet-correlated contamination detection'` AND `result.decisions.D12!.inputs.upstream_decisions` deep-equals `['D11']`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-19 …" passes.

- **AC-20** — _Given_ a clean fleet BaselineBundle, _when_ `curateBaselineFleetCorrelated(bundle)` is called, _then_ `result.decisions.D13!.output_summary.fleet_event_detected === false` AND `result.decisions.D13!.output_summary.n_fleet_event_windows === 0` AND `result.decisions.D13!.output_summary.fleet_event_window_indices === '[]'` AND `result.decisions.D13!.output_summary.fcp1_audit_token === 'fcp1:fired=false:windows=[]'` AND `result.decisions.D13!.output_summary.residual_seed_hash_sentinel` matches the regex `/^tessera-fcp1-v1::.+\|.+::fcp1:fired=false:windows=\[\]$/`. AND `result.decisions.D13!.decision_id === 'D13'`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-20 …" passes.

- **AC-21** — _Given_ identical BaselineBundle + identical opts on two independent invocations of `curateBaselineFleetCorrelated`, _when_ both invocations complete, _then_ the `residual_seed_hash_sentinel` strings are byte-identical (deterministic wire format per Q-JC5 D-R07-10). AND `result.decisions.D13!.output_summary.wire_format_version === 'tessera-fcp1-v1'`. Evidence: `test/q07-fleet-correlated.test.ts` "R07 AC-21 …" passes.

**Compile + test substrate:**

- **AC-22** — _Given_ the R07 GREEN commit, _when_ `npm run typecheck` is run from the repo root, _then_ exit code === 0 with no error output. Evidence: Reviewer-run command. (Load-bearing check that the new file resolves all its vendored-source imports.)

- **AC-23** — _Given_ the R07 GREEN commit, _when_ `node --test test/q07-fleet-correlated.test.js` is run, _then_ pass count === 21 AND fail count === 0. Evidence: Reviewer-run command. (q07 file's in-file test count is structurally pre-determined at 21 by the spec's AC-1..AC-21 bindings.)

- **AC-24** — _Given_ the R07 GREEN commit, _when_ all pre-R07 test files are run independently (q01-vc + q01-no + q01-sa + q02-se + q03 + q04 + q05 + q06 + smoke), _then_ each produces the OBSERVED pass count it produced at R06 close — no regressions. Implementer reports OBSERVED output per R03 MINOR-4 reinforcement; do NOT pre-state counts. Reference: pre-R07 baseline (Reviewer-verified at R06 HEAD `0689681`) was q06=13, q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, q03=13, q04=11, q05=13, smoke=5; total 70. R07 ADDS the q07 file and modifies ZERO pre-R07 files, so all pre-R07 tests must still pass. Evidence: Reviewer-run `node --test` on each file independently. Post-R07 GREEN total expected: 70 + 21 = 91 (q07 contributes 21 per AC-23).

- **AC-25** — _Given_ the R07 commit sequence, _when_ `git log --oneline -- test/q07-fleet-correlated.test.ts tools/curate-baseline-fleet-correlated.ts` is run, _then_ a RED commit (adding `test/q07-fleet-correlated.test.ts` only — NO production code) precedes a GREEN commit (adding `tools/curate-baseline-fleet-correlated.ts` production code). Evidence: Reviewer-run `git log --oneline` produces two commits in the correct order; `git show <RED> --stat` shows ONLY `test/q07-fleet-correlated.test.ts` added.

- **AC-26** — _Given_ the GREEN commit, _when_ a grep is run for `as any` in executable lines of the new `tools/curate-baseline-fleet-correlated.ts`, _then_ 0 matches in executable code (`grep -nE "^[^/*]*as any" tools/curate-baseline-fleet-correlated.ts` returns 0 matches; per R03 MINOR-2 reinforcement, the pattern distinguishes executable code from `//` or ` *` comments). Evidence: Reviewer-run grep with the executable-line-only pattern.

---

## Anti-scope

R07 ships exactly the surface inventory above (2 surfaces); the following enumerate paths the Implementer must NOT touch. Encountering apparent need → HALT and write a DIAGNOSTIC.

- **R07-SAS-1: NO modification to `engine/per-shard/warm-start.ts`, `engine/per-shard/welford.ts`, or `engine/per-shard/runtime.ts`.** R03/R04/R05-shipped runtime substrate is untouched at R07. Per Q-JC5 disposition: Stage 3b is the OFFLINE wire-format spec; the R03-shipped runtime mechanism at warm-start.ts:74-75 (`current.residual_seed_hash !== obs.residualSeedHash`) is the load-bearing reset trigger — no modification needed; R07 only specifies the format string downstream consumers (R08+) use as the `residualSeedHash` value.

- **R07-SAS-2: NO modification to `engine/types/config.ts`.** D12 and D13 are already in the `BaselineCurationDecisionId` union from R06 Delta 1 (verified at config.ts:214); no new schema delta needed. The `BaselineCurationDecision.output_summary` field shape (`Record<string, number | string | boolean>` at config.ts:245) accommodates R07's D12 and D13 output_summary fields without modification (fire_window encoded as `-1` for null per primitive 8 + AC-19; arrays encoded as JSON strings per AC-20). The R06 MINOR-1 finding (stale JSDoc at config.ts:228 still references "(D1-D10)") is NOT closed at R07 (out of scope); R07's anti-scope on config.ts prevents the temptation to in-passing-fix it.

- **R07-SAS-3: NO addition of new npm dependencies to `package.json`.** R07's new file imports only from already-vendored engine surfaces + R06-vendored estimator files + node-stdlib (test file only). No new external deps.

- **R07-SAS-4: NO vendoring of `tools/calibrate.ts` or any tools/* file not yet vendored at R06 GREEN.** R06-SAS-1 carry-forward (Q-JC1 brainstorm-re-evaluation deferral). Any encountered apparent need to vendor (e.g., typecheck failure pointing at a non-vendored tools/* file) is HALT condition (b) — write DIAGNOSTIC-R07-additional-tools-vendor.md + STATUS: ESCALATE. Q-JC1 narrowing R06 → R08+ stands.

- **R07-SAS-5: NO modification to `tools/curate-baseline-pre-pass.ts` (R06-shipped).** D-R07-1 architectural-separation decision. The new R07 file is independent (re-uses vendored estimator surfaces, not R06's pre-pass surface). Any change to R06's file would risk regression of R06's AC-1..AC-13 + would mix R06 and R07 surface concerns. The "minor per-run MCD logic duplication" (R07's screenRunMask helper vs R06's curateBaselinePrePass inline MCD loop) is the accepted trade-off.

- **R07-SAS-6: NO modification to vendored-at-pin files** (`tools/curate-baseline-pipeline.ts`, `tools/calibrators/family-c.ts`, `tools/calibrators/_shared.ts`). R06-SAS-9 / R06-SAS-10 carry-forward. The q01-no-at-pin-deltas test will fail if any byte is changed beyond the 5-line provenance header.

- **R07-SAS-7: NO modification to inherited vendored engine internals.** A12 carry-forward chain (R01 SAS-7/8 → R02 SAS-8 → R03 SAS-9 → R04 SAS-12 → R05 SAS-15 → R06 SAS-7 → R07 SAS-7). The R07 file imports from `engine/types/config.ts` AND `engine/detectors/family-c-betting-e-process.ts` (the latter is consulted ONLY for the ONS-pattern citation in code comments + the canonical step-size constant — no import; the constant is re-declared per primitive 6).

- **R07-SAS-8: NO modification to `test/q01-vendoring-coverage.test.ts`, `test/q01-no-at-pin-deltas.test.ts`, `test/q01-schema-additions.test.ts`, `test/q02-schema-extension.test.ts`, `test/q03-warm-start-runtime.test.ts`, `test/q04-welford-stats.test.ts`, `test/q05-per-shard-runtime.test.ts`, `test/q06-baseline-pre-pass.test.ts`, `test/betting-e-process-class-dispatch.test.ts`.** All pre-R07 tests must pass at R07 per AC-24. R07 does not modify or vendor any file that any pre-R07 test asserts against.

- **R07-SAS-9: NO Spectral Residual / Robust PCA / BOCPD additions** (Q-JC6 binding; R06-SAS-6 carry-forward). Only FCP-1 at R07. Any spec text or code proposing these is HALT (operator-gated per Q-JC6).

- **R07-SAS-10: NO always-on / streaming filter behavior** (Q-JC2 binding; R06-SAS-3 carry-forward). FCP-1 is a pure pre-pass function over a BaselineBundle. No streaming consumption, file-watching, or runtime-detector integration.

- **R07-SAS-11: NO joint e-BH coupling with Q-J1 runtime detector pipeline** (Q-JC4c α disposition — separate-pipe). FCP-1 is calibration-time only; per-shard runtime detectors have independent e-BH. The FCP-1 e-process must NOT feed any runtime e-BH operator under any code path.

- **R07-SAS-12: NO modification to `tsconfig.json` / `tsconfig.test.json` / `package.json`.** Existing `tsconfig.test.json` already includes `tools/**/*.ts`, so the new file is auto-covered. No new dependencies (R07-SAS-3). No changes to the test glob.

- **R07-SAS-13: NO modification to `test/_substrate/factories.ts`.** R07's test fixtures (BaselineBundle construction inline; X_w synthesizer inline) are simple enough to inline in the q07 test file. R06-SAS-12 carry-forward.

- **R07-SAS-14: NO modification to `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md`, or `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`.** Operator-owned scoping artifacts.

- **R07-SAS-15: NO modification to existing rows in `coordination/VENDORING-MANIFEST.md`.** R07 adds NO new vendored files; no manifest changes at all (existing 38 rows untouched).

- **R07-SAS-16: NO modification to `coordination/NEXT-ROLE.md` beyond the routing-to-IMPLEMENTER update + observed-count attestation at GREEN-commit close (R14 two-commit chore sequence applies).**

- **R07-SAS-17: NO plug-in `p_base` estimation from same-data being tested.** Q-JC4b LOAD-BEARING constraint. Plug-in invalidates the Ville bound → CRITICAL Reviewer finding. The pseudocode is unambiguous: p_base computed from windows [0, K) ONLY; e-process runs from window K onward. Encountering apparent need to use a different estimation strategy (e.g., MLE from all windows including test) → HALT and write DIAGNOSTIC-R07-disjoint-data.md + STATUS: ESCALATE.

- **R07-SAS-18: NO barrel-export additions** (`tools/index.ts`, `engine/curate/index.ts`). Direct file imports preserved per R03-shipped pattern.

- **R07-SAS-19: NO modification to per-shard runtime mechanism for FCP-1 invalidation detection.** Q-JC5 disposition: reuse the R03-shipped residual_seed_hash sentinel mechanism. The R07 D13 emission is OFFLINE wire-format ONLY; the runtime detection at warm-start.ts:74-75 is preserved verbatim. Any modification to warm-start.ts / runtime.ts to "consume" the D13 sentinel is R08+ scope (calibrate.ts wiring round) — not R07.

- **R07-SAS-20: NO post-fire wealth reset.** The FCP-1 e-process maintains the single-fire-per-bundle discipline (D-R07-7). Resetting wealth after each fire would convert the test to a Bonferroni-equivalent at total FPR ≤ k·α_fleet (where k = number of fires), defeating the Ville-bound guarantee Q-JC4 explicitly preserves. Multi-fleet-event detection within a single bundle is deferred to future cycles (OQ-1).

---

## Open questions

(Surfaced ambiguities — none block R07 implementation; OQ-1..OQ-4 surface design decisions for future-round review.)

1. **OQ-1: Should multi-fleet-event detection be added in R08+ via post-fire wealth reset?** R07 single-fire-per-bundle preserves the strict Ville bound at α_fleet for the WHOLE bundle. If real GPU-cluster baselines contain multiple distinct fleet events (e.g., separate firmware push at hour 3 + separate cooling event at hour 17), R07 detects only the FIRST. Future-round options: (a) Block-wise reset with explicit Bonferroni (FPR ≤ k·α_fleet); (b) Spend-policy variant where α_fleet is partitioned across N_max anticipated events; (c) Sliding-window e-process with bounded memory. Architect-pre-prediction: defer until empirical demand (PR-F8 + real-substrate evidence shows multiple-event scenarios occur). Confidence: HIGH (deferral is safe — single-event detection is the floor capability; multi-event extensions are additive).

2. **OQ-2: Should `pBasePrior` default 0.025 be empirically tuned to inherited fleet characteristics?** R07 picks 0.025 as a conservative default (≈2.5% expected baseline contamination per-tick per-shard under healthy fleet — derived from MCD α=0.75 trim count over a moderate-N bundle). Real GPU-cluster baselines may exhibit different rates (some clusters cleaner, some noisier). Future-round options: (a) Operator-tunable per-cluster (already enabled at R07 via opts.pBasePrior); (b) Auto-tune from a long stable training prefix; (c) Per-(tier, region) pBasePrior tables. Architect-pre-prediction: operator-tunable suffices for R07; auto-tuning is R08+ scope when long-term substrate data exists. Confidence: HIGH.

3. **OQ-3: Should the disjoint training prefix be operator-tunable as RATIO (e.g., first 10% of W) instead of fixed K?** R07 picks fixed `trainingWindowCount: 10` default. At W=200, K=10 = 5% of windows; reasonable for most settings. At W=20 (small bundle), K=10 leaves only 10 test windows (50% lost to training). Future-round option: (a) Add `trainingWindowRatio?: number` opts field that overrides the fixed count when set. Architect-pre-prediction: not needed at R07; the W=0/W=1 edge cases are handled by the `K = min(trainingWindowCount, max(0, W-1))` clamp. Operators with small W can override `trainingWindowCount` directly. Confidence: HIGH.

4. **OQ-4: Should `wire_format_version: 'tessera-fcp1-v1'` evolve to v2 when multi-event detection lands (OQ-1)?** R07 locks the wire format at v1 (sentinel includes single `fleet_event_window_indices: [number]` or `[]`). Multi-event detection would extend the indices array to length > 1. R07 architect-pre-prediction: the v1 format already supports `[]` (zero) AND `[N]` (one) AND syntactically `[N, M, ...]` (more); no format change needed — v2 bump is a discipline marker, not a structural one. Confidence: MEDIUM (depends on whether downstream consumers serialize-parse the array vs treat it as opaque string).

All 4 open questions are R08+ concerns; none block the R07 acceptance criteria.

---

## P3 ten-axis verification

1. **Correctness** — FCP-1 e-process construction satisfies the Ville-bound martingale property by construction: F_w has E[F_w | F_{w-1}] = 0 under H₀ (X_w iid Binomial(N, p_base)); λ_{w-1} is F_{w-1}-measurable; therefore E[1 + λ_{w-1}·F_w | F_{w-1}] = 1 and E[S_w | F_{w-1}] = S_{w-1}. AC-14 binds the per-step property; AC-11 binds the FPR consequence. Disjoint-data construction (Q-JC4b LOAD-BEARING) preserved by computing p_base from windows [0, K) only (AC-7 binds the formula). ONS update preserved canonically (AC-5 + AC-6 bind the formulas). Wire-format determinism (AC-21).

2. **Completeness** — All four `screenRunMask` outcomes bound: 'screened' (AC-1, AC-2, AC-15, AC-16), 'skipped_insufficient_samples' (AC-3, AC-17), 'skipped_mcd_failed' (covered indirectly by AC-1 + AC-3 — the function correctly handles the case via outcome dispatch), 'skipped_no_signals' (AC-4). Algorithm primitives (wealth, ONS, shrinkage, fire) all bound (AC-5..AC-10). PR-F8 evidence matrix (AC-11..AC-14). Stage 2b composition (AC-15..AC-17). D11 + D12 + D13 emission (AC-18..AC-21). Compile + test health (AC-22..AC-26).

3. **Consistency** — Cross-section consistency pass executed (18 resolved-decision checks; all PASS). Function name (`curateBaselineFleetCorrelated`, `runFleetCorrelatedEProcess`, `screenRunMask`), file path (`tools/curate-baseline-fleet-correlated.ts`), Fcp1State + Fcp1Opts + FleetCorrelatedOpts + FleetCorrelatedResult interface names, ONS constants (`ONS_STEP_SIZE_C = 2/(2-log(3))`, `LOG_FACTOR_FLOOR = 1e-12`, `DEFAULT_LAMBDA_MAX = 0.5`) all consistent across Mechanism, Component inventory, Integration points, Per-file pseudocode, ACs, Anti-scope. Wire-format string `'tessera-fcp1-v1::'` literal consistent across primitive 10 + Delta 1 pseudocode + AC-20 regex + AC-21 binding.

4. **Clarity** — Architectural decisions made explicit in § Mechanism primitives 1-11 with documented rationale (full why-picked / why-rejected in audit sidecar § Brainstorm + § Decision rationale). The Q-JC4b LOAD-BEARING disjoint-data constraint (load-bearing for Ville bound) is surfaced in § Mechanism primitive 5 + § Anti-scope R07-SAS-17 + Implementer note 4 (HALT-bound). The Q-JC5 LOAD-BEARING wire-format constraint is surfaced in § Mechanism primitive 10 + AC-20 + AC-21 + Implementer note 4 (HALT-bound). Implementer notes 1-6 each carry verification commands. AC wording uses "Given X, when Y, then Z" form throughout with literal-value assertions.

5. **Coverage** — 26 ACs map to the 2-surface Component inventory: AC-1 through AC-21 against `test/q07-fleet-correlated.test.ts` (21 in-file tests); AC-22 against typecheck; AC-23 against q07 file-level pass count; AC-24 against pre-R07 regression; AC-25 against TDD ordering (git log); AC-26 against the new file's cast hygiene. Skill 15 prescription-to-AC-coverage check applied: every prescription in § Mechanism + § Per-file pseudocode binds to ≥1 AC. Skill 14 PRD-conjunction-cross-check applied: PRD AC-P1 (fleet-FPR ≤ q·K) traces via AC-11 + AC-12 + AC-13 (empirical FPR/power); PRD AC-P2 (warm-start invalidation) traces via AC-20 + AC-21 (wire-format sentinel) — no PRD conjunct widened or narrowed. **Narrative-vs-pseudocode AC-count cross-check** (R05 reinforcement): Component inventory states q07 binds AC-1 through AC-21 (21 ACs); per-file pseudocode (Delta 2 commentary) lists 21 named tests; AC-23 binds count===21; P3 Coverage row enumerates 21. All four sites agree on the AC count of 21.

6. **Constraints** — Inherited Ville-bound + Welford + observeSample contracts preserved (R07-SAS-1 + R07-SAS-2 + R07-SAS-7 fence inherited engine internals + Tessera-original runtime substrate; FCP-1 operates at the BaselineBundle layer, upstream of per-shard runtime). PRD AC-P1 + AC-P2 trace per axis 5. Memorial F sub-rule 1 (compile-time substrate multi-read-paths): D12 + D13 add new producers for the existing `baseline_curation_pipeline_diagnostics` field; no consumers modified — additive extension only (downstream consumers ignore unknown decision IDs per the optional `Partial<Record<...>>` typing). Memorial F sub-rule 2 (additive extension): no D1-D11 records modified.

7. **Concurrency** — Both exported functions are pure (no module-level state; no I/O; no side effects). `curateBaselineFleetCorrelated` and `runFleetCorrelatedEProcess` are safe under shared-reference semantics. Input bundle is not mutated (verified by behavior — all new objects constructed; no in-place edits). MCD is deterministic given (rows, alpha, seed) per the vendored mulberry32 PRNG. ONS update is deterministic given (xCounts, N, opts).

8. **Corner cases** — Empty bundle (`runs: []`): N=0 → W_aligned=0 → p_base=pBasePrior → e-process trivially doesn't fire; FCP-1 returns fired=false; AC-3-class. Single-run bundle (1 SCREENED + 0 SKIPPED): N=1 → X_w ∈ {0, 1}; e-process runs; behavior bound by AC-1. All runs SKIPPED: N=0 → FCP-1 doesn't fire; AC-3 + AC-4. Mixed SCREENED + SKIPPED: N = count of SCREENED; AC-17. Bundle with `cell_dim`: curated bundle preserves cell_dim verbatim (D-R07-9 path). W_aligned < trainingWindowCount: K clamped to max(0, W_aligned - 1); n_windows_test ≥ 1 if W_aligned ≥ 1; e-process runs at least one window if data available. W_aligned === 0: n_windows_test === 0; p_base falls back to pBasePrior. fire_window === 0 (fires on first test window — extreme contrived case): Stage 2b drops index 0 from all runs' signal_series; AC-16-class. fire_window outside the SKIPPED run's tick range: Stage 2b's `if (fireWindow !== null && i === fireWindow) continue;` filter is a no-op for that run (the index doesn't exist in the loop). p_base computed to be > 0.5 (catastrophic-contamination training prefix): F_w can be negative for ALL test windows; wealth stays sub-threshold; doesn't fire (defensive — e-process tests for ELEVATED contamination, not depressed).

9. **Cost** — Implementer Q-cycle estimate: ~3-4 hours total (single new production file + 21-AC test file; algorithm is bounded — ~150 lines production + ~250 lines test). FCP-1 e-process cost: O(W) per bundle (single sweep through windows). MCD cost: O(N_runs × FastMCD-cost-per-run) (same as R06's pre-pass; sub-millisecond per run at the fixture sizes used in q07). PR-F8 simulation cost: 30 trials × 200 windows × 100 Bernoulli draws per window × 3 H0/H1 variants = ~1.8M PRNG calls; sub-second on modern hardware. q07 alone < 500ms expected; full pre-R07 + R07 test suite ~5-6 seconds.

10. **Coupling** — Three new module dependencies: curate-baseline-fleet-correlated.ts → engine/types/config.ts (existing import; type-only); curate-baseline-fleet-correlated.ts → tools/calibrators/family-c.ts (R06-vendored; 5 function/constant imports); curate-baseline-fleet-correlated.ts → tools/calibrators/_shared.ts (R06-vendored; 1 function import). ZERO new module dependencies on R0n-shipped Tessera-native files (R07-SAS-1 / R07-SAS-5 / R07-SAS-7 + zero import from R06's pre-pass.ts per primitive 4). Test file: standard `node:test` + `node:assert/strict` + type-only `engine/types/config` + production-file `tools/curate-baseline-fleet-correlated`.

---

## Grilling output

(R01-derived discipline; pre-emit adversarial self-review on this spec before routing. Standing reinforcement audit table at the start covers every accumulated REINFORCED entry; per-claim verifiability follows; then unstated assumptions; then scope-added; then Implementer-actionability.)

### Standing-reinforcement audit table

Every REINFORCED entry in `~/.claude/CROSS-PROJECT-MEMORIAL.md` and `coordination/MEMORIAL.md` reviewed for applicability to R07.

| # | Reinforcement source | Applies this round? | Where addressed |
|---|---|---|---|
| 1 | R01 cross-section consistency pass (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16) | YES | § Cross-section consistency pass (18-row check; 7th consecutive Tessera application) |
| 2 | R02 type-declaration-site discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R02 OBS-3) | YES | § Integration points 1-7 — all declaration sites opened at HEAD `a692255` or at vendored-source SHA `5a72371`; line numbers cited per primitive |
| 3 | R02 file-creation track-state discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R02 OBS-2) | YES (inversely) | § Component inventory directory-creation note — `git ls-files` evidence for the 2 new file paths + directory presence for `tools/` and `test/` |
| 4 | R03 re-export-chain-check discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-3) | YES | § Integration points 1-7 — re-export chains verified at each cross-module import; all five family-c.ts imports + one _shared.ts import are direct exports |
| 5 | R03 grep-pattern-soundness discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-2) | YES | AC-26 grep pattern uses `^[^/*]*as any` to distinguish executable code from `//` or ` *` comments (per the reinforcement) |
| 6 | R03 empirically-verified-test-count discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-4) | YES | AC-24 directs Implementer to report OBSERVED counts; baseline (70 total at HEAD `0689681`) is INFORMATIONAL prose, not AC-bound. AC-23 pre-states q07 = 21 because the spec ITSELF declares 21 in-file ACs (structurally pre-determined). AC-11/12/13 explicitly mark architect-prediction as Implementer-OBSERVED at GREEN |
| 7 | R05 narrative-vs-pseudocode AC-count cross-check (CROSS-PROJECT-MEMORIAL R05 entry) | YES | Component inventory states the q07 test file binds AC-1 through AC-21 (21 ACs); per-file pseudocode Delta 2 lists 21 named tests with one-line descriptions; AC-23 binds count===21; P3 Coverage row enumerates 21. All four sites agree |
| 8 | R12 brainstorm-re-evaluation when re-selecting an approach the original brainstorm rejected (CROSS-PROJECT-MEMORIAL R12 entry; CLAUDE-ARCHITECT.md fix-cycle considerations) | YES (carries forward) | R07 does NOT re-select any R06 brainstorm-rejected approach. R07 inherits the R06 Q-JC1 narrowing (defer calibrate.ts vendoring); this is reaffirmed at § Anti-scope R07-SAS-4 + § Mechanism primitive 1 (R06 file preservation). No NEW brainstorm-re-evaluation triggered at R07 |
| 9 | R12 backward-compat file check in §2 inventory (CROSS-PROJECT-MEMORIAL R12 entry) | YES | § Component inventory enumerates ALL modified/created files (exactly 2); no backward-compat patches needed at R07 (R07 modifies ZERO pre-R07 files). Explicit cross-check at § Component inventory paragraph "Backward-compat file cross-check" |
| 10 | R09 self-confirming integration tests (CROSS-PROJECT-MEMORIAL R09 entry) | YES (especially load-bearing for PR-F8 per NEXT-ROLE.md) | q07 tests CALL the production functions `curateBaselineFleetCorrelated` and `runFleetCorrelatedEProcess` directly; NO inline re-implementation of ONS update or wealth formula or shrinkage formula in test bodies. AC-5 + AC-6 + AC-7 hand-compute EXPECTED values in test code using the closed-form formula INDEPENDENTLY (not by calling the production function); then assert production matches the hand-computed value to within 1e-10. This is the canonical NON-self-confirming pattern: test computes the expected value via an independent path; production computes the actual; they must agree. AC-11/12/13 use deterministic-seed simulation where production is BOTH the simulator (xCounts synthesis is test-local) AND the e-process (production code); fire count is the observed output |
| 11 | R13 firm-name regex collision check (CROSS-PROJECT-MEMORIAL R13 entry) | N/A | No `.not.toMatch` / `.not.toContain` regex patterns in q07 tests |
| 12 | R14 stale-SHA two-commit chore-sequence (CROSS-PROJECT-MEMORIAL R14 entry, line 542) | YES | Implementer Note (not in spec; standing CLAUDE-IMPLEMENTER.md discipline) — Implementer follows the 7-step coordination chore sequence at GREEN commit close per NEXT-ROLE.md, not architect's per-spec responsibility |
| 13 | R15 read-path self-confirming test (CROSS-PROJECT-MEMORIAL R15 entry) | YES | q07 tests INVOKE the production function for every assertion; no inline re-implementation of read queries against the curated bundle |
| 14 | R01 anti-scope vs compilation-deps tension (R01 MAJOR-3) | YES | § Mechanism primitive 1 explicitly enumerates ZERO new compilation deps; primitive 4 + R07-SAS-4 + R07-SAS-6 explicitly fence vendoring closure; Implementer note 3 prescribes HALT + DIAGNOSTIC if additional vendoring need surfaces during typecheck |
| 15 | R06 JSDoc scope grep (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R06 MINOR-1) | YES | R07 modifies ZERO existing files (no delta prescriptions with line-range scope). All R07-shipped files are NEW — no stale-text-in-secondary-occurrence risk. The R06 MINOR-1 (stale JSDoc at config.ts:228) is NOT closed at R07 per R07-SAS-2 (out of scope); R07 grilling does not silently fix it |
| 16 | R06 public opts field coverage (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R06 MINOR-3) | YES — load-bearing for R07 | `Fcp1Opts` declares 5 fields: `alphaFleet`, `pBasePrior`, `shrinkageKappa`, `trainingWindowCount`, `lambdaMax`. `FleetCorrelatedOpts` extends with 2 more: `mcdAlpha`, `mcdSeed`. AC coverage: AC-7 binds `pBasePrior` + `shrinkageKappa` + `trainingWindowCount`. AC-8/9 binds `alphaFleet` (via fire condition). AC-10 binds the `trainingWindowCount` clamp behavior on small W. `lambdaMax` is bound implicitly by AC-6 (which uses default 0.5 and verifies clamp doesn't saturate); NOT explicitly bound by an AC. `mcdAlpha` + `mcdSeed` are inherited from R06 (R06 AC-12 binds mcdAlpha override; R06 MINOR-3 noted mcdSeed has no explicit AC binding — R07 carries this gap forward as it inherits the same defaults). EXPLICIT documentation of opts-coverage status: `alphaFleet`, `pBasePrior`, `shrinkageKappa`, `trainingWindowCount` bound; `lambdaMax` bound IMPLICITLY via default-value behavior in AC-6; `mcdAlpha`, `mcdSeed` carry R06's MINOR-3 coverage gap forward (sibling field unbound) — DOCUMENTED RATIONALE: opts.mcdAlpha + opts.mcdSeed coverage is R06's concern (R06 file owns the Stage 2a primary entry); R07 inherits the same dual-opts surface; binding R07-side ACs would duplicate R06's binding decisions without surfacing new coverage. **The R06 MINOR-3 reinforcement is honored at R07 by EXPLICIT enumeration in this row** (not silently inherited gap) |
| 17 | R01 substrate-stamped-fields preservation (Memorial F sub-rule 2 per CLAUDE-COMMON.md REINFORCEMENTS) | YES | D11 emitted by R07's curateBaselineFleetCorrelated has THE SAME shape as D11 emitted by R06's curateBaselinePrePass (verified by inspection of Delta 1 pseudocode vs R06 pre-pass.ts:154-180); downstream consumers cannot distinguish the two emitters at the D11 record level. Additive emission of D12 + D13 alongside D11 does not modify D11's surface |
| 18 | R02 schema-field-additive-extension preservation (R02 MINOR-class) | YES | R07 ADDS NO schema delta to config.ts; D12 + D13 union members already reserved at R06 Delta 1. Additive emission only — no existing field modified |

All 18 applicable reinforcements addressed; the load-bearing items (#10 R09 self-confirming, #16 opts field coverage) have dedicated spec-section disposition.

### Per-claim verifiability

Every claim audited for verifiability:
- Module-path claims (`tools/curate-baseline-fleet-correlated.ts`, `test/q07-fleet-correlated.test.ts`): verifiable via `git ls-files` at HEAD `a692255` showing absence — RED commit creates the test file; GREEN commit creates the production file.
- Vendored-source line numbers (fastMCD at family-c.ts:544; mahalanobisSqFromL at 392; chiSqQuantile975 at 362; FASTMCD_DEFAULT_ALPHA at 455; FASTMCD_DEFAULT_SEED at 456): all verified via Tessera-vendored file reads during spec authoring. (R06's identical claims were vendored from deploysignal at SHA 5a72371; R07's claims match the Tessera-tree line numbers post-R06 GREEN at SHA 377fbb3.)
- Inherited engine-vendored claims (engine/types/config.ts BaselineBundle line 399; BaselineCurationDecisionId line 214 — D1-D13 union; BaselineCurationDecision line 227; output_summary Record<string, number|string|boolean> line 245; PerShardResidual residual_seed_hash line 889): all verified via Tessera-vendored config.ts read at HEAD `a692255`.
- Inherited family-c-betting-e-process.ts claims (ONS_STEP_SIZE_C at line 78; LOG_FACTOR_FLOOR at line 82; DEFAULT_LAMBDA_MAX at line 91; onsUpdate at lines 231-244): all verified via Tessera-vendored read at HEAD `a692255`.
- Inherited warm-start.ts claim (residual_seed_hash reset semantic at warm-start.ts:74-75): verified via Tessera-shipped file read.
- Pre-R07 test count baseline (70 total at HEAD `0689681`): cited from R06 close (NEXT-ROLE.md "Pre-R07 baseline" section). Independently re-verifiable by `node --test` per AC-24.
- Q-JC4b LOAD-BEARING (disjoint data construction): documented inline in spec primitive 5 + anti-scope R07-SAS-17 + Implementer note 4.
- Q-JC5 LOAD-BEARING (wire format determinism): documented inline in spec primitive 10 + AC-20 + AC-21 + Implementer note 4.

### Unstated assumptions surfaced and resolved

0. **AC-8 fixture sizing — Architect grilling correction caught BEFORE routing.** During grilling re-read, the hand-trace at Implementer note 6 surfaced that 10 test windows at full elevation (X_w=100, N=100) at α_fleet=1e-3 is NOT enough to cross log(1/α_fleet)≈6.908 (≈18 windows needed at fully-saturated ONS bet of 0.5 with log_factor ≈ 0.3974 per window). The architect REVISED AC-8 pre-emit to use 30 test windows (32-element fixture: 2 training + 30 test all at X=100) which provides margin above the ≈18-window threshold. AC-8 binds `result.fired === true` + `result.fire_window` in the bracket [3, 25] — the bracket lower bound (3) is just-above the first test window (K=2) where ons_lambda=0 → wealth unchanged regardless of F_w; the bracket upper bound (25) provides margin against the inherited family-c-betting-e-process.ts comment-vs-actual constant-value drift (grilling assumption 2). The Implementer reports the OBSERVED fire_window value within the bracket. The bracket-bound design choice avoids the spec-AC-outrun anti-pattern: the AC bounds the observable property + an inequality range, not the unverifiable exact specific value.

1. **Test glob coverage of new files.** `tsconfig.test.json:13-15` includes `tools/**/*.ts` AND `test/**/*.ts`. The new `tools/curate-baseline-fleet-correlated.ts` and `test/q07-fleet-correlated.test.ts` are both auto-covered. Verified at R06 by the existence of `tools/curate-baseline-pre-pass.ts` and `test/q06-baseline-pre-pass.test.ts` post-R06 GREEN; the same glob pattern applies.

2. **ONS_STEP_SIZE_C re-declaration vs inherited engine import.** The constant is `2 / (2 - log(3)) ≈ 1.6336` per Cutkosky-Orabona 2018. The inherited file `engine/detectors/family-c-betting-e-process.ts:78` declares it as a MODULE-PRIVATE constant (not exported). R07's new file re-declares it inline with a doc-comment citing the inherited file. This is INTENTIONAL — re-declaration with documented cross-reference is preferable to either (a) modifying the inherited file to export the constant (violates A12 inherited engine internals; R07-SAS-7) or (b) importing a non-exported symbol (TypeScript error). LOG_FACTOR_FLOOR + DEFAULT_LAMBDA_MAX similarly re-declared.

3. **Stage 2b drop of fire_window in the ORIGINAL tick coordinates.** Primitive 8 prescribes: the fire_window index `w` (from FCP-1 e-process) is dropped from each curated run by FILTERING the run's signal_series at indices ≠ w. For SCREENED runs, this is intersected with the Stage 2a `keptIndices` (so a tick already dropped by Stage 2a is not "double-dropped"). For SKIPPED runs, the drop applies directly to the original signal_series indices. Edge case: fire_window === w_inject where w_inject is OUTSIDE the SKIPPED run's signal_series length (e.g., SKIPPED run has 5 ticks; fire_window === 12): the Stage 2b drop is a NO-OP for that run (the index doesn't exist in its loop). Verified by AC-16 + AC-17 fixture coverage.

4. **JSON.stringify(fleet_event_window_indices) → string field.** D13's `output_summary.fleet_event_window_indices` is a STRING (JSON-serialized array) because the inherited `output_summary` type is `Record<string, number | string | boolean>` — arrays aren't supported. Encoded as `'[]'` (no events) or `'[37]'` (single event at window 37). Downstream consumers must JSON.parse if they want the array. Documented in primitive 10 + AC-20 binding the literal string form.

5. **fire_window encoded as -1 when null in D12 output_summary.** Same reason as assumption 4: `output_summary` type doesn't support `null` or `number | null`. The encoding choice `-1` for null is documented at primitive 8 (Implementer note paragraph). Downstream consumers reading `fire_window: -1` interpret as "no fire"; reading `fire_window >= 0` interpret as the fire window index. AC-15 binds the `-1` encoding for the not-fired case; AC-16 binds the literal fire_window value when fired.

6. **The `as any` grep in AC-26 distinguishes executable code from comments.** Per R03 MINOR-2 reinforcement. Pattern `^[^/*]*as any` matches lines whose leading characters (before `as any`) contain no `/` or `*`. Comment lines start with `//` or ` *` (within block comments) and would not match. Verified inline at AC-26.

7. **mulberry32 + Bernoulli summation cross-platform determinism.** The q07 test file inlines a mulberry32 PRNG + summing-Bernoulli helper to synthesize X_w sequences for AC-11/12/13. The same precedent at `engine/detectors/family-c-rff.ts` uses mulberry32 + Box-Muller for cross-platform-deterministic RFF feature maps (per family-c-betting-e-process.ts:378-388 comment "byte-identical ω + b across Darwin/Linux per cross-platform-determinism gate"). Bernoulli summation (= comparing `rng() < p` and counting) is integer arithmetic — also cross-platform-deterministic. The X_w sequences for AC-11/12/13 will produce identical results on Darwin and Linux for the same seed.

8. **N === 0 division-by-zero guard.** Primitive 5 specifies: if `K === 0 OR N === 0`, p_base falls back to pBasePrior (no empirical update). The `runFleetCorrelatedEProcess` pseudocode also has `F_w = N > 0 ? (xCounts[w] / N) - p_base : -p_base` guarding the per-window F_w computation. Verified by AC-4 + AC-3 (skipped + empty bundles).

### Scope-added audit

The requested R07 work per `coordination/NEXT-ROLE.md` is:
- Stage 2b FCP-1 fleet-correlated-pattern primitive — ADDRESSED via Delta 1 + AC-1..AC-17.
- Stage 3b warm-start eligibility tagging — ADDRESSED via D-R07-10 + AC-20 + AC-21.
- PR-F8 pair-review evidence matrix — ADDRESSED via AC-11..AC-14 + ≥3 e-process formulations enumeration in audit sidecar § Brainstorm.

Required architectural-decision substrate (Q-JC4/4a/4b/4c/5 dispositions) is bound at § Mechanism primitives 5/6/7/8/10.

No scope-added:
- R07 does NOT vendor any new file (R07-SAS-4 + R07-SAS-6).
- R07 does NOT modify any pre-R07 file (R07-SAS-1 + R07-SAS-2 + R07-SAS-5 + R07-SAS-6 + R07-SAS-7 + R07-SAS-8).
- R07 does NOT add new npm dependencies (R07-SAS-3).
- R07 does NOT modify scoping artifacts (R07-SAS-14).
- R07 does NOT speculate about SR/RPCA/BOCPD (R07-SAS-9 / Q-JC6 fence).
- R07 does NOT close any R06 MINORs (R07-SAS-2 explicitly preserves R06 MINOR-1 at config.ts:228; R06 MINOR-2 at q01-no-at-pin-deltas.test.ts:7-9 explicitly fenced by R07-SAS-8; R06 MINOR-3 / MINOR-4 deliberately carried forward as inherited coverage gaps documented at standing-reinforcement table row 16).

### Implementer-actionability audit

- Both 2 file paths and component states explicit in § Component inventory.
- Delta 1 (production file) has concrete full pseudocode with all function bodies, import statements, JSDoc text, and constant declarations.
- Delta 2 (test file) has TEST-DESCRIPTION pseudocode (AC-bound named test descriptions) + the deterministic-seed PRNG / Bernoulli synthesizer helper code. The Implementer writes the actual literal-value assertions per the AC bindings.
- Function naming (`curateBaselineFleetCorrelated`, `runFleetCorrelatedEProcess`, internal `screenRunMask`), interface naming (`Fcp1Opts`, `FleetCorrelatedOpts`, `Fcp1State`, `FleetCorrelatedResult`), constant values (`DEFAULT_ALPHA_FLEET = 1e-3`, `DEFAULT_P_BASE_PRIOR = 0.025`, etc.), wire-format string format (`'tessera-fcp1-v1::' + version + '|' + seed + '::fcp1:fired=' + fired + ':windows=' + JSON.stringify(...)`), and encoding conventions (`fire_window === -1` for null) all explicit.
- TDD ordering specified at Implementer note 2 (two-commit RED → GREEN).
- Verification commands embedded in Implementer notes 1, 2 and ACs 22, 23, 24, 25, 26.
- Hand-trace verification of two scenarios (clean H₀ no-fire; H₁ fire) embedded at Implementer notes 5 + 6 INCLUDING the architect's prediction correction at note 6 (AC-8 fixture would not fire at 10 windows; needs ~18+ windows to reliably fire).
- HALT condition (b) — additional tools vendoring beyond R07-SAS-4 — explicitly enumerated with diagnostic-file-name prescription (Implementer note 3 + R07-SAS-4). Q-JC4b disjoint-data + Q-JC5 wire-format HALT conditions explicit at Implementer note 4.
- Architect-prediction status for ACs 11/12/13 explicitly documented: Implementer reports OBSERVED count; AC binds OBSERVED. If observed differs from architect prediction, tactical fix is the right disposition (R06 OBS-1 precedent — architect spec-prediction errors are not implementation failures).
- AC-8 deliberately bounds the behavioral property (fired === true) not a specific fire_window value (which the architect's hand-trace at note 6 surfaced as fixture-design uncertain). Same pattern as R06 AC-2/AC-4/AC-6 inequality-bound design choice.
- AC-16 architect prediction surfaced as OBSERVED-binding: fire_window value reported by Implementer at GREEN (the fixture should fire reliably given saturated correlated outliers across 10 runs at one tick; fire_window depends on ONS lambda buildup trajectory — Implementer-observed).

### Could the next role act on this artifact with zero clarifying questions?

Yes. The 2 file surfaces are each accompanied by concrete pseudocode (production file = full function bodies; test file = AC-bound test descriptions + PRNG helper code) + verification commands + AC bindings. The architectural decisions (D-R07-1 through D-R07-11) are picked with documented rationale; the LOAD-BEARING Q-JC4b + Q-JC5 disposition-bindings have explicit HALT conditions with diagnostic-file-name prescriptions. The architect's spec-prediction uncertainty (AC-8 + AC-11/12/13/16 OBSERVED-binding) is explicitly documented inline so the Implementer knows to report OBSERVED values and treat any divergence as a spec-prediction tactical fix (not an implementation failure).

**Grilling verdict: PASS.** Spec is ready for IMPLEMENTER routing.

---
