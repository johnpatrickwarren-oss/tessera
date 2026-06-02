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
} from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  FASTMCD_DEFAULT_ALPHA,
  FASTMCD_DEFAULT_SEED,
} from './calibrators/family-c';
import {
  DEFAULT_ALPHA_FLEET,
  DEFAULT_P_BASE_PRIOR,
  DEFAULT_SHRINKAGE_KAPPA,
  DEFAULT_TRAINING_WINDOW_COUNT,
  DEFAULT_LAMBDA_MAX,
  runStage2aScreening,
  aggregateStage2bCounts,
  buildCuratedBundle,
  buildD11,
  buildD12,
  buildD13,
} from './_curate-baseline-fleet-correlated-helpers';

/** Canonical ONS step-size constant per Cutkosky-Orabona 2018; mirrors the
 *  identically-named constant at engine/detectors/family-c-betting-e-process.ts:78
 *  (vendored DeploySignal SHA 5a72371). Re-declared here (not imported) because
 *  the inherited file declares it as a non-exported module constant. */
const ONS_STEP_SIZE_C = 2 / (2 - Math.log(3));

/** Numerical guard for Math.log(0) on wealth-factor underflow; mirrors
 *  engine/detectors/family-c-betting-e-process.ts:82 LOG_FACTOR_FLOOR. */
const LOG_FACTOR_FLOOR = 1e-12;

/** Options for the FCP-1 e-process. All fields optional with documented defaults. */
export interface Fcp1Opts {
  /** Fleet-level α budget. Fire condition: log(S_w) ≥ log(1/alphaFleet). Default 1e-3. */
  alphaFleet?: number;
  /** Bayesian shrinkage prior on per-tick baseline contamination rate. Default 0.025. */
  pBasePrior?: number;
  /** Bayesian shrinkage strength (effective prior sample count). Default 1.0. */
  shrinkageKappa?: number;
  /** Disjoint training prefix length; p_base computed from windows [0, K) only;
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

    const denom = 1 + ons_lambda * F_w;
    if (Math.abs(denom) >= 1e-12) {
      const z = -F_w / denom;
      ons_inverse_hessian += z * z;
      let lambda_new = ons_lambda - (ONS_STEP_SIZE_C * z) / ons_inverse_hessian;
      if (lambda_new > lambdaMax) lambda_new = lambdaMax;
      else if (lambda_new < -lambdaMax) lambda_new = -lambdaMax;
      ons_lambda = lambda_new;
    }

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
 *    1. Stage 2a: per-run screenRunMask → per-(shard, tick) contamination masks.
 *    2. Stage 2b: aggregate masks into X_w → run FCP-1 e-process → compute fire_window
 *       (or null) → curated bundle drops Stage 2a contaminated ticks AND Stage 2b
 *       fleet-event window (if fired) from each run's signal_series.
 *    3. Stage 3b: D13 wire format = sentinel string derived from FCP-1 audit token +
 *       baseline identity segment.
 *
 *  Returns a NEW BaselineBundle; the input bundle is not mutated.
 *
 *  Body delegates to extracted helpers (each a verbatim contiguous block of the
 *  original implementation) without altering computation. */
export function curateBaselineFleetCorrelated(
  bundle: BaselineBundle,
  opts: FleetCorrelatedOpts = {},
): FleetCorrelatedResult {
  const mcdAlpha = opts.mcdAlpha ?? FASTMCD_DEFAULT_ALPHA;
  const mcdSeed = opts.mcdSeed ?? FASTMCD_DEFAULT_SEED;

  const { perRunMaskResults, stats } = runStage2aScreening(bundle, mcdAlpha, mcdSeed);

  const { N, W_aligned, xCounts } = aggregateStage2bCounts(perRunMaskResults);

  const fcp1State = runFleetCorrelatedEProcess(xCounts, N, opts);

  const curatedBundle = buildCuratedBundle(bundle, perRunMaskResults, fcp1State);

  const d11 = buildD11(bundle, mcdAlpha, mcdSeed, stats);
  const d12 = buildD12(opts, N, W_aligned, fcp1State);
  const d13 = buildD13(bundle, fcp1State);

  return {
    curatedBundle,
    decisions: { D11: d11, D12: d12, D13: d13 },
    fcp1State,
  };
}
