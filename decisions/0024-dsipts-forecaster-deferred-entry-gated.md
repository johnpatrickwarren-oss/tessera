# ADR 0024 — DSIPTS / learned-forecaster residualization: DEFERRED, entry-gated (decision recorded 2026-07-22)

- **Date:** 2026-07-22
- **Status:** DEFERRED — no build now. This ADR records the evaluation, the reasons NOT to proceed
  today, and the explicit gates under which the question reopens. **Trigger to revisit: the mac
  mini 1 Hz real-telemetry baseline clearing its 56-day gate (~2026-08-29)** — the first
  baseline-guard-legal real 1 Hz substrate for the null-calibration tests any of this requires.
- **Source evaluation:** "DSIPTS as a Forecasting and Baseline-Generation Component for Tessera
  and DeploySignal" (Google Doc, 2026-07-22) — verdict there: Architecture D (baseline lifecycle)
  now, A (forecast residuals → detectors) as gated experiment, C (DSIPTS-native anomaly scores)
  rejected. Feedback pass (this session) agreed with the analysis but **reordered the plan**.
- **Builds on:** ADR 0019 (two modes; validity = emitter contract), ADR 0022/0023 (spatial /
  design-based contemporaneous null validated; comparability & controlled workload are the
  load-bearing elements), ADR 0006/0008-engine (masking/absorption), ADR 0020 (monitor weakness
  under mild serial dependence), N1 (temporal per-unit certification dead), O5 (conditional
  fleet-FDR via Assumption 3.1 — the one theorem-path a good forecaster could serve).

## What is preserved from the evaluation (reference for ANY future forecaster work)

1. **The correct framing:** Tessera feeds residuals, not raw metrics. A forecaster is a candidate
   *residualizer*; the question is marginal value over the AR(p)+seasonal+factor stack, confined
   to nonlinear temporal structure, cross-metric interactions, and covariate-conditional variation.
2. **Filtration discipline (doc § 3):** frozen weights per baseline epoch trained only on
   pre-epoch data; **one-step-ahead residuals only** for anything feeding an e-value (h-step
   residuals are MA(h−1) by construction); residual whiteness verified and residual ar1_phi
   supplied; standardization via the substrate calibrator. Validity is a property of the residual
   process, not a gift of the forecaster.
3. **Covariate allowlist strictly exogenous** (scheduler intent, workload class, planned events)
   — never system-state responses (temperature, clocks): a forecaster conditioned on health-adjacent
   signals *correctly predicts the incident* and drives the residual to zero. Lint-level control.
4. **Mode mapping:** Mode A admissible under the discipline above; Mode B untouched (the spatial
   null cancels predictable structure by subtraction); C forfeits the entire validity architecture
   and is rejected without experiment.

## Why NOT proceed now (the decision)

1. **Wrong sequencing — the cheap arm first.** The most likely winner is an in-engine
   **covariate-augmented statistical residualizer** (AR(p)+seasonal + exogenous-covariate
   regression, TypeScript, zero new dependencies). Standing up DSIPTS to discover whether a
   regression term sufficed is backwards; the cheap arm is also the mandatory fair comparator for
   any deep model. DSIPTS enters only if the cheap arm leaves ≥~10% additional headroom.
2. **Architecture D's benefit is asserted, not measured.** No one has quantified how often the
   current baseline lifecycle mis-promotes or spuriously re-records. A ~1-day measurement from
   existing logs precedes any weeks-scale build. D also carries the FIRST Python dependency into
   the stack permanently, and creates foot-in-the-door pressure ("the model's already wired") on
   the detection path.
3. **A's ceiling is low where it matters.** Post-ADR 0023, the forecaster's niche is contexts with
   no contemporaneous peer/control — exactly where N1 says no guarantee is recoverable. Best case
   = better Mode-A ranking in the least defensible corner. The same effort on job-aware peer
   selection (ADR 0022 lever) or the canary MVP grows the guarantee-bearing surface instead.
4. **Stage-1 MASE is not detection value.** A 10–15% MASE win (on GWDG incident windows that
   overstate covariate benefit) can green-light Stage-2 work that Stage 2 then kills; expected
   cost of "proceed" is ~5 weeks in most passing worlds.
5. **Priority collision** with the canary MVP and the mini pilot (~Aug 29). Nothing here is
   time-sensitive; the decision improves with real 1 Hz data in hand.

## Entry gates (ALL must hold before DSIPTS work starts; apply to any Tessera testing/changes once 1 Hz data lands)

- **G1 (measure first):** quantify baseline-lifecycle failure/re-record rates from existing logs.
  Architecture D proceeds only against a measured pain, not an asserted one.
- **G2 (cheap arm first):** implement + benchmark the in-engine covariate-augmented residualizer.
  Two-sided kill criterion for any deep model: it must beat plain AR(p)+seasonal by ≥10–15% MASE
  **and** beat the covariate-augmented statistical arm by a margin worth a Python sidecar (≥~10%).
- **G3 (amended Stage 2, only if G2 leaves headroom):** race THREE arms — statistical residual,
  forecast residual, and the spatial/contemporaneous null wherever a peer or control is
  constructible; include a **σ̂-perturbation probe** (±10% mis-scaled standardization must be
  caught by the live calibration monitor — the 2026-07-02 audit measured null-mean 0.52→7.6 at
  10% σ̂ error and the 2026-07-21 cross-check reproduced the compounding empirically); null-fire
  gate ONLY on long-window substrates (clustersynth ≥56 d bundles; the mini 1 Hz feed post-gate —
  GWDG is ≤10-day incident windows and cannot serve the null gate, ADR 0022); comparisons must
  respect the abstention machinery (converting an abstain into a fire is not a win unless the
  validity gates still pass); masking probe per ADR 0006/0008 with alarm-gated training exclusion.
- **G4 (dependency hygiene):** no DSIPTS dependency — even vendored — before G1+G2 justify it;
  if it enters, vendor pinned per the SCOPING-MEMO § 9 policy (pre-2.0 instability + the 2026
  Lightning supply-chain incident).
- **Monitor honesty:** ADR 0020 applies — the calibration monitor catches gross residual
  miscalibration quickly and mild-but-accumulating serial dependence slowly; size the exposure
  window, don't claim the guardrail closes it.

## Upside worth pursuing if gates open (the doc's missed argument)

A well-calibrated forecast is a candidate conditioning covariate X_n for **O5** (Assumption 3.1 /
stopped-e-BH): if it renders per-shard residuals conditionally Markov, it is the one known path to
a *theorem-backed* conditional fleet-FDR for the temporal path — a stronger prize than power, and
testable with the existing `conditional-markov.ts` diagnostic. Position any Stage-2 pass against
this, not just delay metrics. Also position the lifecycle "drift vs workload variation" split
against ADR 0016's benign-change discriminator (complementary mechanism, not a re-derivation).
