// tools/_curate-baseline-fleet-correlated-helpers.ts — sibling helpers for
// tools/curate-baseline-fleet-correlated.ts. Extracted to keep that file < 500 lines
// while decomposing its ~212-line public function into < 100-line helpers WITHOUT
// changing behavior. Every helper body below is a VERBATIM contiguous block lifted
// from the original implementation; no computation is altered. The public import
// surface of curate-baseline-fleet-correlated.ts is unchanged (it re-imports these
// helpers internally and re-exports the constants).

import type {
  BaselineBundle,
  BaselineCurationDecision,
} from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  fastMCD,
  mahalanobisSqFromL,
  chiSqQuantile975,
} from './calibrators/family-c';
import { choleskyLocal } from './calibrators/_shared';
import type { Fcp1State, FleetCorrelatedOpts } from './curate-baseline-fleet-correlated';

export const DEFAULT_ALPHA_FLEET = 1e-3;
export const DEFAULT_P_BASE_PRIOR = 0.025;
export const DEFAULT_SHRINKAGE_KAPPA = 1.0;
export const DEFAULT_TRAINING_WINDOW_COUNT = 10;
export const DEFAULT_LAMBDA_MAX = 0.5;

export interface ScreenRunMaskResult {
  keptIndices: number[];
  contaminationMask: boolean[];
  totalTicks: number;
  outcome: 'screened' | 'skipped_insufficient_samples' | 'skipped_mcd_failed' | 'skipped_no_signals';
}

export function screenRunMask(
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

/** Stage 2a accumulated screening statistics, used to populate the D11 audit. */
export interface Stage2aStats {
  nRunsScreened: number;
  nRunsSkippedInsufficientSamples: number;
  nRunsSkippedMcdFailed: number;
  nTicksTotalStage2a: number;
  nTicksContaminatedStage2a: number;
}

/** Stage 2a — per-run mask materialization + accumulated screening statistics.
 *  Extracted VERBATIM from curateBaselineFleetCorrelated; no computation altered. */
export function runStage2aScreening(
  bundle: BaselineBundle,
  mcdAlpha: number,
  mcdSeed: number,
): { perRunMaskResults: ScreenRunMaskResult[]; stats: Stage2aStats } {
  // ─── Stage 2a — per-run mask materialization ────────────────────────────────
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
  }

  return {
    perRunMaskResults,
    stats: {
      nRunsScreened,
      nRunsSkippedInsufficientSamples,
      nRunsSkippedMcdFailed,
      nTicksTotalStage2a,
      nTicksContaminatedStage2a,
    },
  };
}

/** Stage 2b — cross-shard aggregation of per-run masks into per-window X_w counts.
 *  Extracted VERBATIM from curateBaselineFleetCorrelated; no computation altered. */
export function aggregateStage2bCounts(
  perRunMaskResults: ScreenRunMaskResult[],
): { N: number; W_aligned: number; xCounts: number[] } {
  // ─── Stage 2b — cross-shard aggregation + FCP-1 e-process ──────────────────
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
  return { N, W_aligned, xCounts };
}

/** Build curated bundle (Stage 2a per-tick drops + Stage 2b fire-window drop).
 *  Extracted VERBATIM from curateBaselineFleetCorrelated; no computation altered. */
export function buildCuratedBundle(
  bundle: BaselineBundle,
  perRunMaskResults: ScreenRunMaskResult[],
  fcp1State: Fcp1State,
): BaselineBundle {
  // ─── Build curated bundle (Stage 2a drops + Stage 2b fire-window drop) ──────
  const fireWindow = fcp1State.fired ? fcp1State.fire_window : null;

  const curatedRuns = bundle.runs.map((run, runIdx) => {
    const maskResult = perRunMaskResults[runIdx];
    const sortedSignals = Object.keys(run.signal_series).sort();

    let finalKept: number[];
    if (maskResult.outcome === 'screened') {
      finalKept = maskResult.keptIndices.slice();
      if (fireWindow !== null) {
        finalKept = finalKept.filter((i) => i !== fireWindow);
      }
    } else {
      const minLenThis = sortedSignals.length === 0
        ? 0
        : Math.min(...sortedSignals.map((sig) => run.signal_series[sig].length));
      finalKept = [];
      for (let i = 0; i < minLenThis; i++) {
        if (fireWindow !== null && i === fireWindow) continue;
        finalKept.push(i);
      }
    }

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
  return curatedBundle;
}

/** D11 audit (Stage 2a). Extracted VERBATIM; no computation altered. */
export function buildD11(
  bundle: BaselineBundle,
  mcdAlpha: number,
  mcdSeed: number,
  stats: Stage2aStats,
): BaselineCurationDecision {
  const {
    nRunsScreened,
    nRunsSkippedInsufficientSamples,
    nRunsSkippedMcdFailed,
    nTicksTotalStage2a,
    nTicksContaminatedStage2a,
  } = stats;
  // ─── D11 audit (Stage 2a) ──────────────────────────────────────────────────
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
  return d11;
}

/** D12 audit (Stage 2b FCP-1). Extracted VERBATIM; no computation altered. */
export function buildD12(
  opts: FleetCorrelatedOpts,
  N: number,
  W_aligned: number,
  fcp1State: Fcp1State,
): BaselineCurationDecision {
  // ─── D12 audit (Stage 2b FCP-1) ────────────────────────────────────────────
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
  return d12;
}

/** D13 audit (Stage 3b wire format). Extracted VERBATIM; no computation altered. */
export function buildD13(
  bundle: BaselineBundle,
  fcp1State: Fcp1State,
): BaselineCurationDecision {
  // ─── D13 audit (Stage 3b wire format) ──────────────────────────────────────
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
  return d13;
}
