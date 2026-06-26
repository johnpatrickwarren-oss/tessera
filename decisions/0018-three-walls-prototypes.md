# ADR 0018 — three-walls prototypes: e-detector (B), SupFDR adjuster (Fleet), conditional-Markov diagnostic (A)

- **Date:** 2026-06-26
- **Status:** **PROTOTYPES (Tessera-side, validated).** Three new `tools/` modules + tests implementing
  the named constructions the 2026-06-26 research passes identified for the three open walls. All
  Tessera-original; NOT vendored. Durable home for the load-bearing primitives is the ENGINE
  (`detectors/`, `fleet/`) — porting is a flagged follow-up (see § Sequencing), kept Tessera-side
  first per the established pattern (prototype → validate → port).
- **Builds on / grounded in:** RESEARCH-INDEX.md (§ 1 registry, § 2 O3/O4/O5), the two research
  reports (`research/2026-06-26-*.md`), engine ADR 0010 (UI e-value — the increment), 0016/0017
  (common-mode estimation is the lever). Reviewed by two independent cold-eye subagents (verdicts §).
- **Scope decision:** the user asked to work Wall A, Wall B, Fleet Multiplicity. Built in DEPENDENCY
  order (B → Fleet → A) because they compose: the e-detector (B) produces the per-shard running
  statistic, the SupFDR adjuster (Fleet) consumes its running max valid-at-all-times, and the
  conditional-Markov diagnostic (A) is the validity *condition* tying them to a conditional guarantee.

## The three walls and what shipped

| Wall | Construction (source) | Module | Result |
|---|---|---|---|
| **B — transient power** | E-detector: Shiryaev–Roberts `M^SR_n = Σ_j Λ^(j)_n` over candidate onsets, increment `Λ^(j)` = sequentialized UI e-value, threshold `1/α` (Shin–Ramdas–Rinaldo, arXiv:2203.03532) | `tools/e-detector.ts` | Recovers transient power the terminal UI dilutes to ~0: **~90% vs 0%** on a *favourable synthetic* regime; **1–2/4 vs 0/4** on a *real adversarial clustersynth bundle* (capped by Wall A — see § Real-bundle). ROC-matched at 5% false-alarm. |
| **Fleet — FDR-at-all-times** | √E−1 adjuster on running-max e-processes → valid all-times e-values → e-BH controls **SupFDR ≤ q** (Tavyrikov–Goeman–de Heide "Carefree", arXiv:2501.19360) | `tools/supfdr.ts` | Naive running-max e-BH leaks (≈1.08α); the adjuster controls SupFDR ≤ q. `∫_1^∞ A(e)/e² de = 1` verified. Accept-to-reject monotone. |
| **A — per-stream validity (O5)** | Operationalized **Assumption 3.1** (`Y_n ⊥ past \| X_n`) diagnostic + the demonstration that it tracks stopped-e-BH fleet-FDR (Wang–Dandapanthula–Ramdas, arXiv:2502.08539) | `tools/conditional-markov.ts` | As common-mode estimation degrades, the conditional-Markov score rises AND stopped-e-BH FDR crosses q — a GOOD common-mode estimate *earns* a conditional fleet-FDR guarantee. |

Integrated demonstration + report: `tools/walls-validation.ts` (`pnpm walls-validation`). Tests:
`test/{e-detector,supfdr,conditional-markov,walls-validation}.test.ts` (19 tests). Suite green
(677 tests; the single intermittent failure is the pre-existing q84 `worker.terminate()` flake).

## The load-bearing finding (preserve — do not re-litigate)

**Walls A and B are SEPARATE, non-interacting walls, and no construction closes both.** The e-detector
closes the transient-POWER wall (B) by mixing over candidate onsets. But its VALIDITY reduces to each
increment `Λ^(j)` being a genuine e-process under the nonstationary null — i.e. **Wall A re-enters
inside the increment** (`E[e|H0] ≤ 1` per ADR 0007/0012). On clustersynth (benign on validity — its
nonstationarity is removable common-mode, ADR 0016) the increment is valid; on real GWDG telemetry it
is not, and no amount of e-detector machinery fixes that. The SupFDR adjuster (Fleet) is provenance-
agnostic — it assumes each input is a valid e-process and does NOT touch Wall A either.

**Wall A is recoverable only CONDITIONALLY (O5):** if a good common-mode estimate makes the residual
conditionally Markov given the covariate (Assumption 3.1), the fleet inherits a *conditional* stopped-
e-BH FDR theorem. This makes "common-mode estimation is the lever" (ADR 0016/0017, a power result) ALSO
a *validity* result. The `walls-validation` sweep demonstrates the consequence empirically: removal
completeness oracle→none ⇒ diagnostic 0.06→0.60, stopped-FDR 0.02→0.55.

**Framing correction (the guarantee is AGGREGATE, never per-alert).** FDR is the expected proportion of
false discoveries *across the whole selected set* — you cannot label any individual alert as the false
one; the guarantee is on the *rate* across all alerts, capped at q (or close). There is no "per-alert
guarantee" to lose. What ADR 0007/0012 actually show is that the per-shard e-value *validity* (E[e|H0]≤1
for each input) fails on real telemetry — that validity is the *input condition* that makes the
*aggregate* FDR hold. So: the per-shard validity is the lever (and the diagnostic reads it); the
controlled quantity is always the aggregate FP/FDR rate. On real GWDG the per-shard nonstationarity is
irreducible so that input condition fails and the aggregate guarantee becomes empirical — the diagnostic
is the honest readout that says which inputs still satisfy it. For the streaming detector the right
aggregate metric is **EOP**, not worst-case FDR (RESEARCH-INDEX O1; worst-case FDR is uncontrollable at
finite ARL by the Dandapanthula–Ramdas impossibility theorem).

## Engineering decisions (and honest caveats)

1. **Tessera-side prototypes, not engine edits.** Matches the established pattern; lets the
   constructions validate against clustersynth before incurring cross-repo engine churn (engine is
   pinned at v0.6.0-pre). The increment (`Λ^(j)` = `universalInferenceMeanShiftEValue`) and the e-BH
   operator are imported from the engine unchanged.
2. **e-detector increment = the fixed-horizon UI e-value, sequentialized over onsets.** The OPEN
   question (RESEARCH-INDEX O3) is whether the UI's fixed-horizon `E[e|H0] ≤ 1` survives promotion to
   an anytime-valid `Λ^(j)` under the nonstationary null. We do NOT claim it does; we measure the
   empirical null behaviour and recommend e-SR over e-CUSUM per Remark 2.13. Strided onset/eval grids
   are conservative SUB-mixtures (valid, lower power) — a tractability choice, logged not silent.
3. **Adjuster route, not donation-e-LOND.** The √E−1 adjuster is self-contained with an exact integral
   identity. Donation/online-closure e-LOND (arXiv:2603.24792) is the alternative SupFDR route (can be
   tighter) but needs α-investing bookkeeping — left as a follow-up. The adjuster's power penalty is
   real (√ shrinkage); measured (it keeps power on clear alternatives, is conservative on FDR).
4. **Wall A is a NECESSARY-condition diagnostic, not a sufficiency proof.** Assumption 3.1 is a
   population conditional-independence statement; the diagnostic is a finite-sample lag-1 + Ljung–Box +
   partial-coefficient check. A shard that passes can still violate 3.1 at higher-order lags. The sweep
   models "estimation quality" as removal completeness `α` — an abstraction of the lever, NOT a claim
   that real estimators interpolate it linearly.

## Real clustersynth-bundle validation (the genuine end-to-end test)

`tools/walls-validation.ts` runs on FAVOURABLE synthetic data. The honest end-to-end test is against a
bundle generated by the **separate clustersynth repo** (`~/concord/clustersynth`):
`clustersynth scenario config.json --out-dir DIR` (gb200, 1 pod / 720 shards, T=256, full
nonstationarity thermal+diurnal+regime, mixed transient faults, seed 7) → fed through the instrumented
pipeline. Tool: `tools/clustersynth-edetector.ts` (`pnpm clustersynth-edetector <bundle-dir>`); smoke
test on the committed mini bundle in `test/clustersynth-edetector.test.ts`.

**Result (the two-walls thesis confirmed on real data):**

| counter | transient mean_shifts | e-detector | terminal | residual \|ρ₁\| | markov-plausible (healthy) |
|---|---|---|---|---|---|
| hbm_bw_gbps | 2 | **1/2** | 0/2 | 0.190 | 24% |
| sm_util | 1 | 0/1 | 0/1 | 0.253 | 18% |
| gpu_temp_c | 1 | 0/1 | 0/1 | 0.319 | 6% |
| **total** | **4** | **1/4** | **0/4** | ≈0.25 | ≈15% |

- The terminal mean-shift UI e-value is **fully diluted** (0/4) — Wall B, on real data.
- The e-detector **beats it** (1/4, → 2/4 at calLen=35) but falls **far short of the synthetic ~90%**.
- **Wall A explains the cap, per-counter:** the instrumented residual is NOT conditionally white (median
  lag-1 |ρ| ≈ 0.25; only ~15% of healthy shards markov-plausible), so the UI increments are not clean
  e-processes and their power collapses (ADR 0016 finding 2: power falls steeply above φ≈0.25). The
  cleanest residual (hbm, ρ=0.19, 24%) is exactly where the e-detector scores; the dirtiest (gpu_temp_c,
  ρ=0.32, 6%) is where it fails. **The Wall-A diagnostic predicts where Wall B's fix works.**
- **Conclusion:** both walls bind on real data, and no construction here closes both — the e-detector
  closes the cal/test dilution (Wall B), but per-stream validity (Wall A) re-enters inside the increment.
  Better common-mode estimation (ADR 0016/0017) is the lever that would lift it. This is a MORE honest and
  more valuable result than the synthetic 90%: the three tools compose to a coherent, self-explaining
  picture on genuine clustersynth telemetry.

## Calibration regime — these prototypes use a SHORT in-window prefix, NOT a long baseline (KNOWN GAP)

Every prototype here calibrates its null from a SHORT in-window prefix — `calLen = floor(0.1·T)` ≈ 25–30
ticks (the e-detector's `cal` window, the e-process scale σ̂, the diagnostic's reference). It is **NOT**
a 6-week+ baseline built by seeing weeks of healthy data and trimming large anomalies. The synthetic and
clustersynth bundles are themselves short (T ≤ 768 ticks), so no long history is even present in them.

**This understates how clean the null can be, and partly explains the real-bundle cap.** On a long
HEALTHY clustersynth window (T=512), lengthening the calibration transforms the residual:

| calLen | residual median \|ρ₁\| | markov-plausible (healthy shards) |
|---|---|---|
| 25 (short, what the prototypes use) | ≈0.10–0.22 | **15–40%** |
| 100 | ≈0.04 | ≈74–79% |
| 300 ("weeks") | ≈0.03 | **≈94%** |

So a longer baseline lets the instrumented common-mode estimate the per-shard loadings far better → the
residual becomes conditionally white (the Assumption-3.1 null) → the UI increments become valid and
powerful. The "Wall A caps the e-detector at 1–2/4" result above is therefore **partly a
short-calibration artifact**, not purely the validity wall. (On a longer faulted bundle, calLen 25→70
dropped residual \|ρ₁\| from ≈0.27 to ≈0.06.)

**The correct design is the engine's existing baseline kit** — `compile-baseline.ts` (per-shard
seasonal + multivariate baseline; ADR 0019) + contamination-robust trimming (Tukey, ADR 0015 — the "toss
large anomalies to get an accurate healthy null" step). The detector's calibration should be that
weeks-long, anomaly-trimmed baseline, NOT a short prefix.

### Wired and validated — `tools/baseline-monitor.ts` (`pnpm baseline-monitor <healthy-dir> <mon-dir>`)

Two same-topology bundles: a **2-month healthy baseline** (gb200, 720 shards, 1440 ticks @ hourly,
faults off) → a robust, **anomaly-trimmed** per-shard loading+scale fit (the "toss anomalies" step,
trim |resid| > 3·MAD and re-fit); applied to a **monitoring** bundle (240 ticks, faults on). Loadings
are a structural property of the topology/seed, so they transfer (0 membership mismatches). The Wall-A
diagnostic **gates** the fleet — e-BH earns its aggregate guarantee only on diagnostic-certified counters.

| counter | transient mean_shifts | e-detector | terminal | residual \|ρ₁\| | markov-plausible | gate |
|---|---|---|---|---|---|---|
| power_w | 5 | **5/5** | 1/5 | 0.039 | 96% | CERTIFIED |
| sm_util | 5 | **5/5** | 0/5 | 0.033 | 92% | CERTIFIED |
| hbm_bw_gbps | 7 | **7/7** | 1/7 | 0.052 | 94% | CERTIFIED |
| nvlink_tx_gbps | 4 | **4/4** | 0/4 | 0.047 | 88% | CERTIFIED |
| gpu_temp_c | 9 | 0/9 | 0/9 | 0.977 | 0% | **FLAGGED (abstain)** |

- **Transient recall 21/30 vs terminal 2/30** (was 1/4 with the short prefix). On the certified counters
  the residual is white (ρ≈0.04, ~90% markov-plausible) and the **aggregate fleet FDP = 0.000** (0 false
  of 21 selected) — the aggregate FDR guarantee holds.
- **gpu_temp_c is a NEAR-UNIT-ROOT I(1) counter (ADR 0003), not "irreducible".** Followed up by routing it
  through the engine seasonal baseline (`tools/seasonal-probe.ts`): the per-(hour-of-day) model whitens
  *nothing extra* (seasonal ≈ raw ≈ 0.96), because gpu_temp_c's leftover is NOT a diurnal cycle — it is a
  STOCHASTIC INTEGRATED DRIFT (a random walk): raw/seasonal/common-mode/seasonal+common-mode all ≈0.96,
  but **first-differencing whitens it** (Δ lag-1 ≈ 0.09; differenced+common-mode ≈0.06). A per-cell mean
  baseline cannot remove an integrated trend. **The catch:** differencing destroys the mean-shift SIGNAL
  (a sustained fault → two impulses), trading validity for power (ADR 0016 near-unit-root power collapse),
  and over-differences the stationary counters (their diff+CM ≈0.48, worse). So an I(1) counter needs a
  TREND/drift detector (distributionalSignature.trendT), NOT the mean-shift e-detector — and the Wall-A
  diagnostic abstaining on gpu_temp_c is exactly right (no valid stationary null for a mean-shift e-BH).
- This is the **composition of all three walls + the baseline**: the 2-month anomaly-trimmed baseline
  whitens the removable-common-mode counters; the diagnostic (A) gates which counters earn the guarantee
  and routes I(1) counters elsewhere; the e-detector (B) recovers transient recall on the certified set;
  e-BH (Fleet) controls the **aggregate** false-discovery rate there. No per-alert claim.

**Note on the seasonal model.** On clustersynth the diurnal/regime nonstationarity lives in the SHARED
FACTORS (removed by the measured-factor common-mode), so the per-(hour×day) seasonal baseline adds nothing
here (seasonal ≈ raw across all counters). It is the right tool on REAL telemetry with per-shard calendar
structure; it is NOT a fix for integration order. The remaining wall is genuinely ADR 0003 (near-unit-root)
+ ADR 0012 (irreducible per-shard nonstationarity on real data) — a per-counter/per-shard adaptive
integration-order + detector choice (mean-shift vs trend vs differenced) is the open design, gated by the
diagnostic. clustersynth's removable common-mode means the four certified counters approach the oracle.

### Metric-aware router — `tools/metric-router.ts` (`pnpm metric-router <healthy> <mon>`)

The "honest open design": no single preprocessing+detector fits every metric, so the router CHARACTERISES
each counter's integration order, routes it to a matching pipeline, and GATES the fleet with the
diagnostic (e-BH earns its aggregate guarantee only on valid-null inputs).

| counter | character | detector | recall | agg-FDP | markov-plaus | gate |
|---|---|---|---|---|---|---|
| power_w / sm_util / hbm / nvlink | stationary | mean-shift e-detector | **100%** | **0.000** | 88–97% | CERTIFIED |
| gpu_temp_c | **integrated** | difference + magnitude | 11% | N/A | 87% | **CERTIFIED** |

Findings:
- **Integration order MUST be characterised cross-window (on healthy shards of a fresh realization), not
  in-sample.** An in-sample / same-realization split-half loading fit SPURIOUSLY whitens a random walk
  (regressing it on collinear factors) — every counter then looks stationary (lag-1 ≈ 0.03). The
  cross-window residual on monitoring's healthy shards (faults excluded) is the honest signal:
  gpu_temp_c level-lag-1 = 0.98 / Δ = 0.07 → integrated; the others level-lag-1 ≈ 0.04 → stationary.
  This is a structural per-counter nuisance characterisation (not per-hypothesis selection on the
  candidate faults), so it does not leak the FDR guarantee; production decides it on a held-out healthy
  window before monitoring.
- **The router turns gpu_temp_c from FLAGGED (abstain) into CERTIFIED:** differencing restores a valid
  (white) null. Two honest limits remain on that path: (1) RECALL is low (11%) because the step faults
  here (mag ≈ 4.5) are *smaller* than the random walk's wander √(dur) ≈ 9 over the fault window —
  sub-threshold on an I(1) metric (ADR 0003/0012), not a detector bug (a step ≫ √dur is detectable);
  (2) the magnitude score is NOT yet an e-value, so e-BH carries no FDR theorem on it (FDP = N/A) — a
  valid variance/magnitude e-value is the follow-up to extend the aggregate guarantee to the integrated
  path. **The win is the architecture** — characterise → route → restore a valid null → gate → report
  honestly, never feeding e-BH a broken null (the prior baseline-monitor ran a broken-null mean-shift
  e-BH on the raw random walk → FDP 0.99; the router refuses that). Follow-ups: a variance/magnitude
  e-value for the I(1) path; a dedicated random-walk changepoint detector; per-shard (not just
  per-counter) routing; and porting the router to the engine alongside the detector families.

### Variance/scale e-value for the integrated path — `tools/ui-scale-evalue.ts`

Built the variance/magnitude e-value to give the integrated path a *valid* e-BH input (the dual of the
engine's mean-shift UI e-value, ADR 0010): `universalInferenceScaleEValue` — split cal/test each into
train/eval, ALT = separate cal/test scales (from train), NULL = common scale (MLE on eval),
`e = exp(ℓ_alt − ℓ_null)`. `E[e|H0] ≤ 1` BY CONSTRUCTION, scale-invariant, no tuning. Unit-tested:
validity across σ∈{1,5,50}, power on a 3× variance increase, and detection of the differenced step-fault's
impulse-pair signature.

**But it did NOT close the integrated-path FDR — and that is the honest payload.** On the *real*
differenced gpu_temp_c residual the iid-Gaussian null is violated: the residual is **heavy-tailed**
(excess kurtosis ≈ 11) and **heteroskedastic** (variance drifts across the window). The Gaussian scale
e-value is **unbounded**, so it **EXPLODES** — healthy-shard mean scale-e ≈ **4.5e5** (≫ 1), exactly the
safe-t catastrophe the UI mean e-value was built to avoid for the MEAN (ADR 0009/0010), now recurring for
the VARIANCE. e-BH consequently does NOT control FDR (FDP ≈ 0.99). The router's **scale-null gate**
(healthy-shard mean scale-e ≤ ~1) catches this and correctly **FLAGS** gpu_temp_c → abstain, not a false
guarantee.

**This is the second-moment layer of Wall A:** differencing whitened the MEAN (passes the conditional-
Markov gate), but the VARIANCE is still non-Gaussian / nonstationary (ADR 0012). The scale e-value made
the violation *measurable* (the readout that gates it). The gate now verifies validity PER MOMENT
(mean-whiteness AND scale-null).

### Bounded heavy-tail-robust scale e-value — `robustScaleEValue` (FDR validity SOLVED; power is the gap)

Built the bounded version (`tools/ui-scale-evalue.ts`, `robustScaleEValue`): the same UI split-LR but
scored under a **Student-t_ν** density (default ν=4) instead of Gaussian. The t tail log-density grows
only like −((ν+1)/2)·log(x²), so a single outlier contributes a BOUNDED amount to the log-LR → it cannot
explode (the same exponent-taming fix ADR 0010 applied to the mean). Unit-tested: bounded `E[e|H0]` on
heavy-tailed t(3) data where the Gaussian version explodes (max ≫ 50× the robust max); valid + powered on
a sustained variance increase.

**Wired into the router, it CLOSES the FDR story on the integrated path:** gpu_temp_c's healthy-shard mean
scale-e drops 4.5e5 → **0.18** (≤ 1), aggregate **FDP 0.99 → 0.000** → CERTIFIED = FDR-VALID. The
explosion is gone; e-BH controls FDR there.

**But this surfaced the real tension — recall ≈ 0%, even for a 100σ injected step.** The outlier-
insensitivity that makes the robust e-value FDR-safe on heavy tails ALSO makes it ignore the **sparse
impulse-pair** signature of a mean-STEP on a random walk (differencing a sustained step → +δ at onset,
−δ at offset, ≈0 between; differencing discarded the sustained-level information). The robust scale
e-value is the right detector for a **sustained variance change**, the WRONG one for a sparse mean-step.
**So: FDR VALIDITY on the integrated path is now solved (no explosion, controlled FDP); detection POWER
for the mean-step × I(1) combination is the open piece** — it needs a CHANGEPOINT detector on the LEVEL
(random-walk-aware), routed by metric character × FAULT TYPE (not character alone). "CERTIFIED" means the
FDR guarantee holds, NOT that faults are detected — the router now distinguishes the two honestly.

The architecture stands and is now demonstrated end-to-end on both moments: characterise → route → score
with a valid BOUNDED e-value → **gate on that e-value's own null (every moment it assumes)** → never emit
an uncontrolled FDR. Open follow-ups: a random-walk changepoint detector + fault-type-aware routing for
I(1) mean-step power; a time-varying-variance baseline for the heteroskedasticity; port to the engine.

## Cold-eye verdicts (two independent adversarial reviews)

- **`e-detector.ts` — SOUND.** No correctness bugs; window bounds verified end-to-end (0 UI throws
  across the default 199-call grid; aligned candidate not dropped). The absolute 1/α threshold
  empirically calibrates to ≈α false-alarm (better than the header's pessimism); the ROC-matched
  transient win is a genuine structural property (collapses on a *persistent* fault, as it should).
  *Fix applied:* the misleading `[j, n−j)` window shorthand clarified to `{start:j,len:n−j} = [j,n)`.
- **`supfdr.ts` — SOUND.** Adjuster math exact (∫=1 by hand; E[A(sup)]∈[0.28,0.83]≤1 empirically up to
  horizon 5000; raw E[sup]∈[2.9,10.4] genuinely inflated); `supFdp` correct. *Overclaim fixed:* the
  naive running-max does NOT robustly exceed q under independence (converges to ≈0.96q at sims=2000 —
  Ville is protective); the test title/prose + module header now state the honest claim — naive runs
  AT the q boundary with **no theorem**, the adjuster sits far below **with one** (the ~90× separation
  is the real, theorem-backed result). The assertion was already correctly hedged (`naive > 0.06`).
- **`conditional-markov.ts` — SOUND.** All math verified to 13 digits vs numpy/scipy (the 3×3
  normal-equations t-stat, Ljung–Box Q, autocorr, OLS). *Disclosure added:* `markovPlausible` is a
  heuristic gate (the `condLag1Tol` constant's effective σ drifts with T), not a calibrated test.
- **`walls-validation.ts` sweep — was UNSOUND, now CORRECTED.** Cold-eye caught a **confound**: the
  original sweep's FDR gradient was driven by a surviving positive-MEAN thermal ramp (a level effect =
  the already-closed plug-in-baseline leak, ADR 0012), NOT by the conditional-Markov serial dependence
  the diagnostic measures — demeaning the residual collapsed the FDR leak while leaving condLag1
  unchanged. **Fix:** the common factor is now ZERO-MEAN (ramp=0, high-persistence AR(1)), so degrading
  removal degrades ONLY the residual's serial dependence; the leak now **survives per-shard demeaning**
  (poor 0.13→0.09, none 0.32→0.23 still leak), confirming the diagnostic→FDR link is causal, not baked
  in. Also disclosed: the partial-past t-leg is inert in the X≡0 sweep config (full 3-leg path is
  exercised in unit tests); the global stopping time is the realistic fleet *decision rule*, NOT the
  leak mechanism (terminal-time leaks at least as much — stopping mitigates). The sweep is now framed
  honestly as "the diagnostic PREDICTS the known serial-dependence validity failure" (the O5
  contribution), not as new evidence of leakage.

## Sequencing (follow-ups, not done here)

- **Port the e-detector primitive to `engine/detectors/`** and the adjuster to `engine/fleet/` if the
  prototypes hold up — they are general, not Tessera-specific.
- **Quantify the e-detector detection-DELAY vs an onset-oracle** and its degradation as φ→0.9 + drift
  grows (RESEARCH-INDEX O3, still open).
- **Donation-e-LOND** as the alternative SupFDR layer (tighter; arXiv:2603.24792).
- **Wire the e-detector into the clustersynth-scenario harness** once a bundle with long-enough
  transient windows exists (the committed mini bundle is T=60 — below the UI power floor; the
  transient win is shown on synthetic transients in `walls-validation`).
- **Test Assumption 3.1 on real GWDG telemetry** (expected to FAIL — the diagnostic should report it).
