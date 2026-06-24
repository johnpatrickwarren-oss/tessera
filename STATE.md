# Project state

**Last updated:** 2026-06-23 · **by:** John Warren (with Claude)

## What this is
Tessera — statistically-rigorous per-shard behavioral observation for AI clusters, built on the
DeploySignal statistical-detector engine. Current work: moving from caveated artifact toward
production by validating on REAL telemetry (Tier 2: ingestion + shadow harness), on top of the
per-shard e-process validity work and the sprag + Anchor quality stack.

## Done (this branch — shadow-rich-calibration)
- **Gap #1: production (seasonal) calibration tested on real data — hypothesis refuted, usefully.**
  Added a `rich` mode (engine `decomposeSeasonal` + AR(1), mirroring `fit-production-substrate`) +
  an α operating-point sweep to the shadow harness; ran simple-vs-rich on real NAB. Result: rich
  **improves detection** (29%→34% at α=0.01, period found in 15/36) but does **NOT** reduce FP
  (8.9→9.3/1k) — confirming the FP driver is **regime-shift / multimodal**, not seasonal (AC-15).
  Next real gap = adaptive / regime-aware baselining. See ADR 0003. +6 tests; suite 562/0/10; gate
  green; report idempotent. (Builds on the merged shadow-replay harness below.)

## Done (merged — shadow-replay-nab, PR #14)
- **First real-data validation (crosses the artifact line).** `tools/shadow-replay.ts`
  (`pnpm shadow-replay <nab-dir>`) + `tools/_nab-loader.ts` replay REAL labeled telemetry (Numenta
  Anomaly Benchmark) through the production betting e-process (engine `updateBettingState`, AR(1)
  whitening calibrated to mirror production), observe-only, and score real calibration (FP rate on
  real quiescent data) + detection (TP/latency on labeled anomalies). See ADR 0002 +
  `docs/SPEC-shadow-replay-real-telemetry.md`; report at `shadow-results/nab-shadow-report.md`.
- **Honest first numbers (36 datasets, α=0.01):** detection 29% of labeled windows; FP ≈ 8.9/1k
  normal pts. Quiet on clean data + some real signals (0 FP), detects real failures well on others
  (machine_temperature 3/3, rogue_agent 2/2), but MISCALIBRATED on real signals with non-AR(1)
  structure (regime shifts/multimodality, e.g. rds_cpu ~116 FP/1k) and misses subtle anomalies at
  default α. This is the real compass for production gaps.
- Tests +9 (NAB parsing + scoring logic); suite 557 pass / 0 fail / 10 skip; gate green; report idempotent.
- **Scope boundary (stated in the report):** validates the PER-SIGNAL detector on real telemetry
  only — NOT cluster/topology/fleet (no real multi-shard data); NAB anomalies are operational, not GPU-SDC.

## Done
- **Validity gap found + validated.** The Family A *betting e-process* loses its Ville guarantee
  under temporal autocorrelation (type-I inflation up to ~192×; fleet FDR ~73%). The engine already
  pre-whitens its OTHER detectors via `ar1_phi` (mixture-supermartingale / Page-CUSUM / ar-p /
  seasonal); the betting path is the one left out. Tessera's `tools/per-shard-whitening.ts` mirrors
  the engine's `ar1_phi` formula and the matrix tool demonstrates whitening fixes the betting path.
  See `decisions/0001-pre-whitening-over-rho-stamped-threshold.md` (incl. the corrected premise).
- **Validity-envelope matrix tool** (`tools/calibration-envelope.ts`, `pnpm calibration-envelope`):
  deterministic, idempotent; characterizes type-I + fleet-FDR across a misspecification grid and
  shows raw-vs-whitened AR rows. Output: `coverage-matrices/calibration-envelope.{json,md}`.
- Whitened AR PASSES for all rho <= 0.9 at 100% detection power; raw fails at 6.7×–192×.
- Tests: +15 (per-shard-whitening; calibration-envelope helpers + verdict rule + e-BH split + the
  fix-path end-to-end). Full suite 548 pass / 0 fail / 10 skip (documented clustersynth-fixture gates).
- sprag gate wired (`invariants.json` + `baseline.json`), migrated from the unenforced
  `arch-invariants.json` (REMEDIATION_PLAN M4); pre-commit hook installed; gate added to CI
  (`.github/workflows/ci.yml`) via `npx @johnpwarren.dev/sprag`. Gate PASSes (exit 0); verified it
  bites (require-tests 28→29 BLOCK on a removed test).
- Cold-eye review (Anchor Discipline 1) done — fresh-context adversarial audit, verdict
  SHIP-WITH-FIXES, no Critical/High. All findings addressed: added verdict/split/fix-path tests
  (M1), wired sprag into CI + fixed stale CI comment (M2/L3), documented the power-drift magnitude
  and seasonal-variance framing (L4/L5).

- **Engine betting-path fix shipped + pinned.** `deploysignal-engine` PR #16 (consume `ar1_phi`) +
  #17 (make `last_x_centered` optional — backward-compat, caught by this bump) merged; tagged
  `v0.3.3-pre`. Tessera pin bumped `v0.3.1-pre → v0.3.3-pre`. The bump also pulled the engine's
  public-hardening sweep (18 commits); its "truthful activation flag" change required aligning
  `q66 AC-R66-1` to assert honest non-activation for the unwired consumer. Suite 548/0/10-skip;
  `calibration-envelope` matrix byte-identical (the validator drives `updateBettingState` with
  phi=0, so the bump is correctly a no-op there).

- **Validator now exercises the engine's production whitening path.** `calibration-envelope`'s
  whitened mode passes the calibrated `phi` to `updateBettingState`'s `ar1Phi` param AND the matching
  innovation variance `sigma^2*(1-phi^2)` as `sigmaSquared` — exactly what `fit-production-substrate`
  stamps (`baseline_sigma_squared` = innovation variance when `ar1_phi` is set). So the validator now
  mirrors production: the whitened residual is standardized at unit scale (properly calibrated, not
  conservative). Fixes a prior validator bug that passed the marginal variance (over-conservative,
  and the basis of an incorrect "engine standardizes against marginal" claim — now corrected).
  Result: FPR ~ alpha for rho <= 0.9; rho=0.95 retains a genuine ~1.8x near-unit-root residual.
  `per-shard-whitening.ts` is now calibration/reference only. Suite 548/0/10; matrix idempotent; gate green.

- **Engine: bias-corrected phi estimator shipped.** `deploysignal-engine` PR #18 added the Kendall
  `(1+3*phi)/n` correction to `ar1Phi` + `computePerSignalAr1Phi`; merged, tagged `v0.3.4-pre`.
  Tessera pinned `v0.3.3-pre -> v0.3.4-pre` (matrix byte-identical — the validator computes phi via
  its own bias-corrected estimator, so the engine calibrator change is a no-op for it; this just
  keeps Tessera on current engine). Both queued follow-ups now closed.

- **Near-unit-root investigated + ADR'd.** Diagnosis overturned the "AR(p) / ~1.8x" framing: at the
  TRUE phi even rho=0.99 is controlled, so it is NOT a model-order problem. The failure is the phi
  CLIP ceiling (0.95) — a rho=0.99 signal is whitened with phi=0.95 and stays ~43% inflated. AR(p)
  would not help (no higher-order structure); loosening the clip is unsafe (innovation variance ->
  0). Aligned the validator's estimator clip to the engine's 0.95 and added rho=0.99 to the matrix
  so the cliff is visible. Recommended fix = route near-unit-root to the self-normalized fallback —
  engine ADR 0003 (Proposed), pending sign-off (behavior change on the betting path).

## Next
- **Gap #2 (the real FP driver): adaptive / regime-aware baselining** — rolling recalibration or
  change-point-segmented baselines, measured on real NAB via the shadow harness (with the explicit
  mask-slow-drift tradeoff). This is what the gap-#1 refutation points to.
- **DECISION NEEDED:** implement engine ADR 0003 (betting path respects the near-unit-root /
  self-normalized-fallback threshold the mixture path already uses)? Behavior change for high-phi
  signals; needs operator sign-off + threshold confirmation.
- (Still blocked on real multi-shard data) cluster / topology / fleet-FDR validation.

## Open questions / blockers
- None blocking. Whether to push the whitening fix upstream into the shared engine package (vs
  keep Tessera-side) is deferred to a later ADR if the problem proves shared with DeploySignal.

## Pointers
- Spec: `docs/SPEC-per-shard-validity-under-autocorrelation.md`
- Decisions: `decisions/` (ADR 0001)
- Architectural rules (deterministic): `invariants.json` + `baseline.json` (sprag)
- Validity evidence: `coverage-matrices/calibration-envelope.md`

## Done (this branch — gwdg-real-gpu-validation)
- **Gap A: numeric detector run on REAL GPU faults (GWDG/Zenodo).** New `tools/_gwdg-loader.ts`
  (long-form tidy CSV → per-(node,gpu,metric) traces) + `tools/gwdg-replay.ts` (reuses shadow-replay
  scoring). Honest result @ α=0.01, static baseline: detection 32.9% (92/280 window×gpu×metric shards; 15 unique windows), but
  ~30 FP/1k on real pre-incident normal — so detection is NOT clearly above-chance; static-baseline
  numeric detection over-fires on real telemetry (consistent with NAB) and isn't production-viable
  alone. Incidents are detachment-heavy (minimal numeric precursor). See ADR 0004; report
  `shadow-results/gwdg-numeric-report.md`. +5 tests; suite 568/0/10; gate green.
  Cold-eye done (SHIP-WITH-FIXES): H1/H2 window-double-count fixed (join each file to its own incident by filename date), M1 test gap closed, M2 unique-window-count added.

## Done (this branch — mit-supercloud-fp-calibration)
- **Gap #2 validated on REAL GPU fleet telemetry (MIT Supercloud).** New `tools/_mit-supercloud-loader.ts`
  + `tools/mit-replay.ts` measure FP-at-scale (null dataset; every fire = false alarm) with a STATIC
  vs ADAPTIVE (trailing-window, regime-aware) baseline. Result (11 per-job files, 36 shard×metric,
  α=0.01): **static 12.95/1k → adaptive 2.57/1k (~5×)** — regime-aware baselining cuts the over-firing
  the NAB/GWDG results demanded. CAVEAT: null dataset (no anomalies to mask); the detection tradeoff
  must be measured on labeled data before upstreaming. `replayFiresAdaptive` is a harness prototype,
  not engine code. See ADR 0005; report `shadow-results/mit-fp-report.md`. +3 tests; gate green.
  Cold-eye done (SHIP-WITH-FIXES): report prototype caveat added (H1), regime test tightened to >5x (M1), trailing-window/CJS comments (M2/L1). No correctness defects (loader, no-lookahead adaptive, apples-to-apples all confirmed).

## Done (this branch — adaptive-baseline-tradeoff)
- **Adaptive-baseline detection tradeoff measured (the gate before upstreaming).** Promoted
  `replayFiresAdaptive` to shared `tools/adaptive-baseline.ts`; built `tools/adaptive-tradeoff.ts`
  (`pnpm adaptive-tradeoff`): synthetic AR(1)+ramp drift-rate sweep + GWDG real faults, static vs
  adaptive. RESULT: adaptive cuts FP ~4× but **MASKS slow drifts** — synthetic detection 99%→76.5%
  at slope 0.003 (threshold ~0.01/step); GWDG real-fault detection collapses **33.3%→2.4%**. So the
  MIT "5× FP win" was a null-dataset artifact; on labeled data adaptive trades away detection.
  **Verdict: do NOT upstream adaptive as a static replacement — pursue a hybrid.** See ADR 0006
  (qualifies ADR 0005). +4 tests; suite 575/0/10; gate green; report idempotent. NOTE: cold-eye
  pending before merge.

## Next
- **Design a HYBRID baseline** (static for slow-drift detection + adaptive to suppress regime-shift
  FP only when no slow-drift hypothesis is active, or freeze/widen the window on suspicion) — then
  measure it on the same NAB/GWDG/MIT + synthetic-sweep substrates before any engine change.
- (Open) gap B structural-degradation detector (GWDG substrate ready); topology/fleet (needs real
  coupled-cluster faults).

## Done (this branch — structural-collapse-detector)
- **Gap B structural detector + the FP-guarantee test (the answer to "can we guarantee low FP?").**
  New `tools/_gwdg-structural-loader.ts` (per-(node,job,instance) scrape_samples_scraped) +
  `tools/structural-replay.ts` (`pnpm structural-replay`): betting e-process on the relative scrape
  level. FINDING: detection power is genuine (≈75% of full collapses caught in a 24-scrape window),
  but the per-shard FP guarantee is **NOT honored on real telemetry** — even the most stable
  high-count targets fire 100% (vs α=1%), because the anytime-valid e-process accumulates on
  persistent sub-percent level drift (P(fire)→1 under real nonstationarity). Fundamental, not tuning
  — and it mirrors the numeric over-firing (NAB/GWDG/MIT). The "guaranteed low FP" promise does not
  survive per-shard on real data; FLEET-level e-BH FDR (common-mode drift cancels in ranking) is the
  remaining hope. See ADR 0007. +5 tests; gate green.

## Next
- **Validate fleet-level e-BH FDR on real telemetry** — the one place a real guarantee could survive
  (does common-mode drift cancel so a failing shard still ranks out, bounding the false-discovery
  proportion?). Tessera's most important unvalidated claim.
- (Open) hybrid baseline (ADR 0006); real-labeled structural FD (verify SURF Lisa); topology/fleet.

## Done (this branch — fleet-fdr-validation)
- **Fleet-level e-BH FDR validated → does NOT rescue the guarantee; root cause pinned.** New
  `tools/fleet-fdr.ts` (`pnpm fleet-fdr`): e-value validity diagnostic + naive/fleet-relative e-BH on
  synthetic ground truth + real GWDG null. FINDING: the betting-e-process e-value is valid (E[e|H0]≤1,
  P(fire)≤α) ONLY with the true baseline AND iid data; plug-in baseline estimation inflates E[e]→6.6e8
  and autocorrelation→3.8e3 (compounding to 8.4e32). So e-BH (which needs valid e-values) cannot
  control FDR: real null rejects 34/55 healthy shards; synthetic naive FDP 78% / fleet-relative 74% vs
  q=10%. Fleet layer can't fix an invalid marginal e-value. VERDICT: claim detection, not a calibrated
  FP/FDR guarantee, on real telemetry. The only path: a valid e-value construction (nuisance-robust
  mixture/confidence-sequence + whitening) — a per-shard redesign. See ADR 0008. +5 tests; suite
  587/0/10; gate green; idempotent.

## Arc summary (decisions 0001–0008)
Detection works (numeric + structural); the per-shard FP guarantee (0007) AND fleet-FDR (0008) both
fail on real telemetry because the e-value is invalid under estimated baselines + autocorrelation; the
e-value is valid only in the ideal (true-baseline + iid) case. Honest claim: strong detection +
correct-under-assumptions framework; NOT a calibrated guarantee on real data. Next: valid e-value
redesign.

## Done (this branch — baseline-power-validation)
- **m≫n refinement of the guarantee failure (ADR 0009, refines 0007/0008).** New
  `tools/baseline-power.ts` (`pnpm baseline-power`). Plug-in error scales E[e]≈1/√(1−n/m). SYNTHETIC
  (stationary): m≫n restores validity (n/m≤0.5 → E[e]≤1, P(fire)=0) — so 0007/0008's failure was
  partly an under-powered-baseline artifact. REAL GWDG structural: a long FLAT baseline does NOT
  restore it — P(fire) 31–44% across m (even n/m=0.4), because real streams drift WITHIN the window.
  → Validity needs BOTH (a) m≫n (confirmed) AND (b) a baseline capturing within-window structure
  (seasonal/2D) — a flat mean fails (b). Build A (exchangeability) SHELVED — the problem is baseline
  spec + horizon, not the e-value form. Caught + guarded a vacuous-row "✅" bug in review. +2 tests;
  gate green.

## Next (the real open question)
- **Does the SEASONAL (2D) baseline restore validity on real telemetry?** Test engine
  `decomposeSeasonal` on a long window (m≫n) → E[e]≤1 / FP≤α? This validates the operator's model
  (long seasonal baseline + LSE filtering + drift-triggered re-record/shadow/cutover). Needs a long
  periodic dataset (MIT Supercloud workload seasonality is the likely substrate; GWDG scrape counts
  are near-flat-with-drift, weakly seasonal).

## Done (this branch — seasonal-baseline-validation)
- **Seasonal (2D) baseline test (ADR 0010, continues 0009).** New `tools/seasonal-power.ts`
  (`pnpm seasonal-power`) on real GWDG GPU_UTIL: flat vs fixed-daily-period seasonal (operator's 2D
  model) vs ACF-auto. RESULT (first-crossing FP): fixed-daily seasonal helps 56.7%→43.3% (real, ~⅓
  fewer FP); ACF-auto does NOT (finds short periods 10-25, not daily 144; HARMFUL where it fires: 64%).
  But not ≤α: residual is workload-driven
  non-periodic variation (legitimate GPU_UTIL swings) — irreducible at the single-shard level; handled
  by the operational lifecycle (re-record/refresh) + fleet-relative. So each piece of the operator's
  model addresses a distinct measured component. +2 tests; gate green; idempotent. (Pre-existing flaky:
  q84 worker.terminate timing test fails under full-suite load, passes 15/0 in isolation — not ours.)

## Arc convergence (decisions 0001–0010)
Detection works. Per-shard calibrated guarantee bounded by real non-stationarity, decomposed:
estimation-error → fixed by m≫n (0009); periodic within-window structure → fixed by the fixed-period
seasonal 2D baseline (0010, ~⅓ FP cut); legitimate workload change → operational refresh + fleet
(open). e-value validity needs nuisance-baseline-robustness for any tighter guarantee (0008). The
operator's model (long seasonal baseline + LSE + drift-refresh + fleet-relative) is directionally
validated piece-by-piece.

## Done (this branch — lifecycle-monitor)
- **Operational baseline lifecycle (ADR 0011, addresses the 0009/0010 residual).** New
  `tools/lifecycle-monitor.ts` (`pnpm lifecycle`). First: the per-fire drift-vs-fault discriminator
  FAILS (slow drift & sharp faults both fire at run-length ~9) → the drift trigger is epoch-level
  (sustained alarm RATE → re-record). RESULT (synthetic, 80 trials): lifecycle beats BOTH static
  (drift FP 154→51) AND adaptive (slow-fault detection 70% vs adaptive's 28% masking) — the needle —
  for DISCRETE drift. DEGENERATES on continuous within-epoch workload (re-records constantly → toward
  adaptive) → that residual needs the FLEET (+ valid e-value, 0008). Third complementary piece of the
  operator's model (m≫n / seasonal-2D / lifecycle). +3 tests; gate green; idempotent.

## Operator-model status (the convergence)
- estimation error → m≫n (ADR 0009) ✓
- periodic within-window structure → fixed seasonal 2D baseline (ADR 0010) ✓ (~⅓ FP cut)
- discrete cross-epoch drift → lifecycle re-record/shadow/cutover (ADR 0011) ✓ (beats static+adaptive)
- continuous workload / shard-specific-vs-fleet-wide → fleet-relative (OPEN; needs valid e-value, 0008)

## Done (this branch — fleet-relative-capstone)
- **Fleet-relative capstone (ADR 0012, closes the arc).** New `tools/fleet-relative-capstone.ts`
  (`pnpm capstone`). Fleet-relative (residual = value − cross-shard median) + m≫n + whitening + e-BH on
  a heavy-common-mode synthetic fleet with shard-specific faults. RESULT: SEPARATES faults (power 1.0 —
  common-mode cancels, failing shard isolated) but does NOT control FDR (FDP 0.72–0.77 ≫ q). Reason is
  NOT an invalid e-value (null-fleet residual is VALID) — the FAULTS contaminate the common-mode
  estimate (onset injects a step into the center → every healthy residual → false-fires); FDP grows
  with the fault fraction (2/60→15%, 10/60→79%); trimmed-mean center doesn't fix it. A calibrated
  guarantee needs (a) contamination-robust common-mode + (b) nuisance-robust e-value (0008). +4 tests;
  gate green; idempotent. NOTE: cold-eye pending before merge.

## ARC CLOSE (ADRs 0001–0012)
Detection/separation FULLY solvable + decomposed: estimation error→m≫n (0009); periodic→seasonal 2D
(0010); discrete drift→lifecycle (0011); fleet-wide-vs-shard-specific→fleet-relative (0012, power 1.0).
A calibrated FP/FDR GUARANTEE on real nonstationary telemetry is NOT achieved by any baseline/fleet
engineering here; it rests on two unbuilt pieces: nuisance-baseline-robust e-value (0008) +
contamination-robust fleet common-mode (0012). Honest artifact claim: strong complementary DETECTION,
not a calibrated guarantee, on real telemetry.
