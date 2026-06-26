// tools/curate-baseline-pre-pass.ts — Tessera Phase 1 SLICE 4 (R06):
// per-shard within-window contamination screening pre-pass for baseline bundles.
//
// Runs BEFORE tools/calibrate.ts reads the BaselineBundle: identifies samples whose
// Mahalanobis distance under the MCD-robust subset exceeds the 0.975 χ²ₚ quantile,
// drops contaminated ticks from the bundle output, emits a BaselineCurationDecision
// audit record at decision-id D11.
//
// Stage 2a per SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2; Q-JC1..Q-JC6 dispositions
// confirmed in ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md.
//
// Stage 3a handoff = format compatibility with BaselineBundle (R06 ships structural-
// typed handoff; wired handoff into tools/calibrate.ts main() deferred to R08+ when
// calibrate.ts is itself vendored — see Q-R06-SPEC § Mechanism primitive 2).
//
// Tessera-original code (NOT vendored from DeploySignal). Composes the engine's
// robust-covariance estimator surface (@…/deploysignal-engine/baseline/robust-covariance)
// via the tools/robust-mcd-screen.ts adapter.

import type {
  BaselineBundle,
  BaselineCurationDecision,
  BaselineCurationDecisionId,
} from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  choleskyLocal,
  mahalanobisSqFromL,
  chiSqQuantile975,
} from '@johnpatrickwarren-oss/deploysignal-engine/baseline/robust-covariance';
import {
  robustScreenCov,
  FASTMCD_DEFAULT_ALPHA,
  FASTMCD_DEFAULT_SEED,
} from './robust-mcd-screen';

/** Options for `curateBaselinePrePass`. All fields are optional; defaults
 *  mirror the inherited family-c.ts MCD constants. */
export interface PrePassOpts {
  /** MCD subset-size parameter α ∈ (0.5, 1.0]; defaults to FASTMCD_DEFAULT_ALPHA (0.75). */
  mcdAlpha?: number;
  /** Deterministic seed for MCD's mulberry32 PRNG; defaults to FASTMCD_DEFAULT_SEED. */
  mcdSeed?: number;
}

/** Result of `curateBaselinePrePass`. The curated bundle is structurally a BaselineBundle
 *  (same field set, same shape — Stage 3a format compatibility). The decision audit record
 *  is keyed at D11 (R06-shipped decision-id; see config.ts Delta 1). */
export interface PrePassResult {
  /** New BaselineBundle with contaminated ticks dropped from each run's signal_series
   *  (and hour_of_day / day_of_week when present). All non-screened fields preserved verbatim. */
  curatedBundle: BaselineBundle;
  /** Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>> with the
   *  D11 entry populated; consumers can spread into a CompiledConfig's
   *  baseline_curation_pipeline_diagnostics field (R07+ wiring). */
  decisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>;
}

/** Mutable accumulator threaded through per-run screening. Each `screenRun` call
 *  reads `opts` and updates these counters in place; the totals feed the D11 audit. */
interface ScreenCounters {
  nRunsScreened: number;
  nRunsSkippedInsufficientSamples: number;
  nRunsSkippedMcdFailed: number;
  nTicksTotal: number;            // counts only ticks that were SCREENED (not pass-through ticks)
  nTicksContaminated: number;
}

/** Screen a single run for within-window contamination.
 *
 *    - Collect signal names by sorted Object.keys for deterministic column ordering.
 *    - Form an N×p sample matrix where N = min length across the run's signal_series and p = number of signals.
 *    - If N < p + 1 (insufficient for MCD): pass run through unchanged, increment skip counter.
 *    - Else: run robustScreenCov(rows, α, seed) (engine robust-covariance MCD). If it fails (null result, non-PD): pass through, increment skip counter.
 *    - Else: compute Mahalanobis d² per tick under (mcd.mean, mcd.cov); flag ticks where d² > chiSqQuantile975(p).
 *    - Build curated run: filter signal_series / hour_of_day / day_of_week at non-contaminated indices.
 *
 *  Counters in `c` are mutated in place; returns the (possibly pass-through) run. */
function screenRun(
  run: BaselineBundle['runs'][number],
  mcdAlpha: number,
  mcdSeed: number,
  c: ScreenCounters,
): BaselineBundle['runs'][number] {
  const sortedSignals = Object.keys(run.signal_series).sort();
  const p = sortedSignals.length;
  if (p === 0) {
    // Run carries no signals; pass through; no screening.
    return run;
  }
  const minLen = Math.min(...sortedSignals.map((sig) => run.signal_series[sig].length));
  if (minLen < p + 1) {
    // Insufficient samples for MCD.
    c.nRunsSkippedInsufficientSamples += 1;
    return run;
  }
  // Form rows: rows[i][j] = run.signal_series[sortedSignals[j]][i] for i ∈ [0, minLen), j ∈ [0, p).
  const rows: number[][] = [];
  for (let i = 0; i < minLen; i++) {
    const row = new Array<number>(p);
    for (let j = 0; j < p; j++) {
      row[j] = run.signal_series[sortedSignals[j]][i];
    }
    rows.push(row);
  }
  const mcd = robustScreenCov(rows, mcdAlpha, mcdSeed);
  if (mcd === null) {
    c.nRunsSkippedMcdFailed += 1;
    return run;
  }
  const L = choleskyLocal(mcd.cov);
  if (L === null) {
    // MCD produced a non-PD cov (defensive; should not normally happen since the
    // engine robust-covariance internally Choleskys the candidate covs — but the
    // explicit check here is the belt-and-suspenders against a marginal-PD result).
    c.nRunsSkippedMcdFailed += 1;
    return run;
  }
  const cutoff = chiSqQuantile975(p);
  const keptIndices: number[] = [];
  for (let i = 0; i < minLen; i++) {
    const d2 = mahalanobisSqFromL(rows[i], mcd.mean, L);
    if (d2 <= cutoff) {
      keptIndices.push(i);
    } else {
      c.nTicksContaminated += 1;
    }
  }
  c.nRunsScreened += 1;
  c.nTicksTotal += minLen;

  // Build the curated run: filter each signal_series + hour_of_day + day_of_week at keptIndices.
  const newSignalSeries: Record<string, number[]> = {};
  for (const sig of Object.keys(run.signal_series)) {
    newSignalSeries[sig] = keptIndices.map((i) => run.signal_series[sig][i]);
  }
  const curated: BaselineBundle['runs'][number] = {
    signal_series: newSignalSeries,
  };
  if (run.tenant_id !== undefined) curated.tenant_id = run.tenant_id;
  if (run.hour_of_day !== undefined) {
    curated.hour_of_day = keptIndices.map((i) => run.hour_of_day![i]);
  }
  if (run.day_of_week !== undefined) {
    curated.day_of_week = keptIndices.map((i) => run.day_of_week![i]);
  }
  return curated;
}

/** Assemble the D11 BaselineCurationDecision audit record from the run totals. */
function buildD11Decision(
  bundle: BaselineBundle,
  mcdAlpha: number,
  mcdSeed: number,
  c: ScreenCounters,
): BaselineCurationDecision {
  return {
    decision_id: 'D11',
    decision_name: 'Per-shard within-window contamination screening',
    inputs: {
      upstream_decisions: undefined,
      compile_state_ref:
        'BaselineBundle.runs[].signal_series[sig][tick] → robustCovariance MCD(α=' + mcdAlpha + ', seed=' + mcdSeed
        + ') + Mahalanobis cutoff χ²_p(0.975)',
    },
    output_summary: {
      n_runs_total: bundle.runs.length,
      n_runs_screened: c.nRunsScreened,
      n_runs_skipped_insufficient_samples: c.nRunsSkippedInsufficientSamples,
      n_runs_skipped_mcd_failed: c.nRunsSkippedMcdFailed,
      n_ticks_total: c.nTicksTotal,
      n_ticks_contaminated: c.nTicksContaminated,
      contamination_rate: c.nTicksTotal > 0 ? c.nTicksContaminated / c.nTicksTotal : 0,
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
}

/** Stage 2a per-shard within-window screening.
 *
 *  For each run in `bundle.runs`, delegates to `screenRun` (deterministic column
 *  ordering, MCD-robust Mahalanobis screening, curated-run rebuild), accumulating
 *  per-run counts that `buildD11Decision` packages into the D11 audit summary.
 *
 *  Returns a NEW BaselineBundle; the input bundle is not mutated. */
export function curateBaselinePrePass(
  bundle: BaselineBundle,
  opts: PrePassOpts = {},
): PrePassResult {
  const mcdAlpha = opts.mcdAlpha ?? FASTMCD_DEFAULT_ALPHA;
  const mcdSeed = opts.mcdSeed ?? FASTMCD_DEFAULT_SEED;

  const c: ScreenCounters = {
    nRunsScreened: 0,
    nRunsSkippedInsufficientSamples: 0,
    nRunsSkippedMcdFailed: 0,
    nTicksTotal: 0,
    nTicksContaminated: 0,
  };

  const curatedRuns = bundle.runs.map((run) => screenRun(run, mcdAlpha, mcdSeed, c));

  const curatedBundle: BaselineBundle = {
    version: bundle.version,
    generated_at: bundle.generated_at,
    seed: bundle.seed,
    runs: curatedRuns,
  };
  if (bundle.cell_dim !== undefined) curatedBundle.cell_dim = bundle.cell_dim;

  const d11 = buildD11Decision(bundle, mcdAlpha, mcdSeed, c);

  return {
    curatedBundle,
    decisions: { D11: d11 },
  };
}
