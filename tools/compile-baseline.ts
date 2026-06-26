// tools/compile-baseline.ts — engine-backed per-shard baseline compiler.
//
// The original DeploySignal weeks-of-data baseline COMPILER (per-(hour×day)-cell
// μ/Σ, robust clean-null, sparse-bin pooling) was never vendored into the engine;
// Tessera only ever carried the per-shard state machine + curation pre-pass. The
// engine L1 baseline kit (engine ADRs 0013–0021) now owns the compiler surface, so
// this tool is the thin Tessera-side seam: it takes a BaselineBundle (per-shard
// observation windows with calendar context) and produces, per shard, a per-metric
// seasonal clean-null baseline (compileSeasonalBaseline) plus a joint multivariate
// Family-C baseline (compileMultivariateBaseline) — the per-cell reference + clean-
// null the less-robust detectors (Page-CUSUM / Hotelling) need and the multivariate
// correlation surface. Output persists as a Tessera-native CompiledBaselineSet.
//
// Tessera-original; NOT vendored.

import {
  compileSeasonalBaseline,
  type SeasonalBaseline,
  type SeasonalBaselineOptions,
} from '@johnpatrickwarren-oss/deploysignal-engine/baseline/seasonal-baseline';
import {
  compileMultivariateBaseline,
  type MultivariateBaseline,
  type MultivariateBaselineOptions,
} from '@johnpatrickwarren-oss/deploysignal-engine/baseline/multivariate-baseline';
import type { BaselineBundle } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';

/** Tessera's L2 context axis: the timestamp → integer-bin mapping the seasonal
 *  compiler bins on. Mirrors the bundle's `cell_dim` domain (plus `none` for the
 *  single-bin, level-only case when no calendar context is present). */
export type ContextAxis = 'none' | 'hour_of_day' | 'hour_of_day_x_day_of_week';

/** Bin count for each context axis. `none` collapses to a single bin (level-only,
 *  no seasonal structure) so the compiler still produces a usable clean-null. */
export function nBinsForAxis(axis: ContextAxis): number {
  switch (axis) {
    case 'none': return 1;
    case 'hour_of_day': return 24;
    case 'hour_of_day_x_day_of_week': return 168;
  }
}

/** Resolve the context axis from a bundle's `cell_dim`. An unset `cell_dim`
 *  falls back to `none` (single-bin, level-only). */
export function axisFromBundle(bundle: BaselineBundle): ContextAxis {
  switch (bundle.cell_dim) {
    case 'hour_of_day': return 'hour_of_day';
    case 'hour_of_day_x_day_of_week': return 'hour_of_day_x_day_of_week';
    default: return 'none';
  }
}

/** Per-tick integer bin label for a run under `axis`, in `0..nBins-1`.
 *  @throws RangeError if a required calendar label is missing or out of range. */
function contextForRun(run: BaselineBundle['runs'][number], axis: ContextAxis, nTicks: number): number[] {
  if (axis === 'none') return new Array<number>(nTicks).fill(0);
  const hod = run.hour_of_day;
  const dow = run.day_of_week;
  const ctx = new Array<number>(nTicks);
  for (let i = 0; i < nTicks; i++) {
    let bin: number;
    if (axis === 'hour_of_day') {
      if (hod === undefined) throw new RangeError('axis hour_of_day requires run.hour_of_day');
      bin = hod[i];
    } else {
      if (hod === undefined || dow === undefined) {
        throw new RangeError('axis hour_of_day_x_day_of_week requires run.hour_of_day and run.day_of_week');
      }
      bin = dow[i] * 24 + hod[i];
    }
    if (!Number.isInteger(bin) || bin < 0 || bin >= nBinsForAxis(axis)) {
      throw new RangeError(`context bin ${bin} out of range for axis ${axis} at tick ${i}`);
    }
    ctx[i] = bin;
  }
  return ctx;
}

/** A shard's compiled baselines: one seasonal clean-null per metric + the joint
 *  multivariate (Family-C) baseline when the shard carries ≥2 signals. */
export interface CompiledShardBaseline {
  shard_id: string;
  /** Metric (signal) name → per-bin seasonal clean-null baseline. */
  seasonal: Record<string, SeasonalBaseline>;
  /** Sorted signal names defining the multivariate column order; empty when no joint baseline. */
  signal_order: string[];
  /** Joint per-cell multivariate baseline (null when <2 signals, or the compiler rejected the input). */
  multivariate: MultivariateBaseline | null;
}

export interface CompiledBaselineSet {
  version: string;
  /** Carried through from the source bundle for provenance. */
  source_generated_at: string;
  context_axis: ContextAxis;
  n_bins: number;
  shards: CompiledShardBaseline[];
}

export interface CompileBaselineOpts {
  /** Override the context axis (defaults to `axisFromBundle`). */
  axis?: ContextAxis;
  /** Forwarded to compileSeasonalBaseline (minStrict/minPooled/zCut/varFloorRel/poolRadius/cyclic). */
  seasonal?: Omit<SeasonalBaselineOptions, 'nBins'>;
  /** Forwarded to compileMultivariateBaseline (minStrict/minPooled/poolRadius/cyclic + robustCovariance opts). */
  multivariate?: Omit<MultivariateBaselineOptions, 'nBins'>;
}

/** Group a bundle's runs by shard id (`tenant_id`, else a positional id). */
function groupRunsByShard(bundle: BaselineBundle): Map<string, BaselineBundle['runs']> {
  const byShard = new Map<string, BaselineBundle['runs']>();
  bundle.runs.forEach((run, idx) => {
    const id = run.tenant_id ?? `shard_${idx}`;
    const list = byShard.get(id) ?? [];
    list.push(run);
    byShard.set(id, list);
  });
  return byShard;
}

/** Min length across a run's signal series (the screenable tick count). */
function runMinLen(run: BaselineBundle['runs'][number], signals: string[]): number {
  if (signals.length === 0) return 0;
  return Math.min(...signals.map((s) => run.signal_series[s].length));
}

/** Compile one shard's seasonal (per-metric) + multivariate (joint) baselines. */
function compileShard(
  shardId: string,
  runs: BaselineBundle['runs'],
  axis: ContextAxis,
  nBins: number,
  opts: CompileBaselineOpts,
): CompiledShardBaseline {
  // Union of signal names across the shard's runs, sorted for deterministic column order.
  const signalSet = new Set<string>();
  for (const run of runs) for (const s of Object.keys(run.signal_series)) signalSet.add(s);
  const signalOrder = [...signalSet].sort();

  // Per-metric seasonal: concatenate (value, context) across the shard's runs.
  const seasonal: Record<string, SeasonalBaseline> = {};
  for (const sig of signalOrder) {
    const values: number[] = [];
    const context: number[] = [];
    for (const run of runs) {
      const series = run.signal_series[sig];
      if (series === undefined) continue;
      const ctx = contextForRun(run, axis, series.length);
      for (let i = 0; i < series.length; i++) { values.push(series[i]); context.push(ctx[i]); }
    }
    if (values.length === 0) continue;
    try {
      seasonal[sig] = compileSeasonalBaseline(values, context, { nBins, ...opts.seasonal });
    } catch {
      // Degenerate metric (all-constant / non-finite / too sparse): skip — lookups fall back elsewhere.
    }
  }

  // Joint multivariate: rows are the full signal vector per tick (runs with all signals present).
  const multivariate = signalOrder.length >= 2
    ? compileMultivariate(runs, signalOrder, axis, nBins, opts)
    : null;

  return { shard_id: shardId, seasonal, signal_order: signalOrder, multivariate };
}

/** Assemble joint rows + context for a shard and compile the multivariate baseline. */
function compileMultivariate(
  runs: BaselineBundle['runs'],
  signalOrder: string[],
  axis: ContextAxis,
  nBins: number,
  opts: CompileBaselineOpts,
): MultivariateBaseline | null {
  const rows: number[][] = [];
  const context: number[] = [];
  for (const run of runs) {
    // Only runs carrying every signal contribute joint rows (ragged rows are rejected by the compiler).
    if (!signalOrder.every((s) => run.signal_series[s] !== undefined)) continue;
    const minLen = runMinLen(run, signalOrder);
    const ctx = contextForRun(run, axis, minLen);
    for (let i = 0; i < minLen; i++) {
      rows.push(signalOrder.map((s) => run.signal_series[s][i]));
      context.push(ctx[i]);
    }
  }
  if (rows.length === 0) return null;
  try {
    return compileMultivariateBaseline(rows, context, { nBins, ...opts.multivariate });
  } catch {
    return null;
  }
}

/** Compile a full per-shard baseline set from a BaselineBundle using the engine
 *  L1 compilers. Each shard (grouped by `tenant_id`) gets per-metric seasonal
 *  clean-nulls and a joint multivariate baseline; the context axis is derived from
 *  the bundle's `cell_dim` (override via `opts.axis`). */
export function compileBaselineSet(bundle: BaselineBundle, opts: CompileBaselineOpts = {}): CompiledBaselineSet {
  const axis = opts.axis ?? axisFromBundle(bundle);
  const nBins = nBinsForAxis(axis);
  const byShard = groupRunsByShard(bundle);

  const shards: CompiledShardBaseline[] = [];
  for (const [shardId, runs] of byShard) {
    shards.push(compileShard(shardId, runs, axis, nBins, opts));
  }

  return {
    version: bundle.version,
    source_generated_at: bundle.generated_at,
    context_axis: axis,
    n_bins: nBins,
    shards,
  };
}
