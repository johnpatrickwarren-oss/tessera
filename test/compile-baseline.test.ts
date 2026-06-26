// test/compile-baseline.test.ts — engine-backed per-shard baseline compiler
// (tools/compile-baseline.ts). Binds the context-axis derivation, the per-metric
// seasonal + joint multivariate output shape, the `none` (single-bin) fallback,
// and clean-null robustness to an injected outlier.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BaselineBundle } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  compileBaselineSet,
  axisFromBundle,
  nBinsForAxis,
} from '../tools/compile-baseline';

/** Two shards × 48 ticks (2 per hour bin) × 2 signals, hour_of_day context.
 *  Clean values are small zero-mean; one optional outlier at the last tick. */
function makeHourlyBundle(outlier = false): BaselineBundle {
  const mkRun = (tenant: string, seed: number): BaselineBundle['runs'][number] => {
    const a: number[] = [], b: number[] = [], hod: number[] = [];
    for (let t = 0; t < 48; t++) {
      const v = ((t * 7 + seed) % 11) / 11 - 0.5;   // deterministic small spread in [-0.5, 0.5)
      a.push(v);
      b.push(-v + ((t * 3 + seed) % 5) / 25);
      hod.push(t % 24);
    }
    if (outlier) { a[47] = 100; b[47] = 100; }
    return { tenant_id: tenant, signal_series: { a, b }, hour_of_day: hod };
  };
  return {
    version: 'compile-hourly-v1',
    generated_at: '2026-06-25T00:00:00Z',
    seed: 1,
    cell_dim: 'hour_of_day',
    runs: [mkRun('s0', 0), mkRun('s1', 3)],
  };
}

test('axisFromBundle + nBinsForAxis: hour_of_day → 24, none fallback → 1', () => {
  assert.strictEqual(axisFromBundle(makeHourlyBundle()), 'hour_of_day');
  assert.strictEqual(nBinsForAxis('hour_of_day'), 24);
  assert.strictEqual(nBinsForAxis('hour_of_day_x_day_of_week'), 168);
  assert.strictEqual(nBinsForAxis('none'), 1);
  const noDim: BaselineBundle = { version: 'v', generated_at: 't', seed: 0, runs: [] };
  assert.strictEqual(axisFromBundle(noDim), 'none');
});

test('compileBaselineSet: per-shard seasonal (per metric) + joint multivariate over 24 bins', () => {
  const set = compileBaselineSet(makeHourlyBundle());
  assert.strictEqual(set.context_axis, 'hour_of_day');
  assert.strictEqual(set.n_bins, 24);
  assert.strictEqual(set.shards.length, 2);

  const s0 = set.shards.find((s) => s.shard_id === 's0')!;
  assert.ok(s0, 'shard s0 present');
  // Per-metric seasonal baselines for both signals, each with 24 bins + an aggregate.
  assert.deepStrictEqual(s0.signal_order, ['a', 'b']);
  for (const sig of ['a', 'b']) {
    const sb = s0.seasonal[sig];
    assert.ok(sb, `seasonal baseline for ${sig}`);
    assert.strictEqual(sb.bins.length, 24);
    assert.ok(Number.isFinite(sb.aggregate.mean) && sb.aggregate.variance >= 0);
  }
  // Joint multivariate baseline: dim 2, 24 cells, finite aggregate mean vector.
  assert.ok(s0.multivariate, 'multivariate baseline present');
  assert.strictEqual(s0.multivariate!.dim, 2);
  assert.strictEqual(s0.multivariate!.cells.length, 24);
  assert.strictEqual(s0.multivariate!.aggregate.mean.length, 2);
});

test('compileBaselineSet: none axis (no cell_dim) collapses to a single bin', () => {
  const bundle = makeHourlyBundle();
  delete bundle.cell_dim;
  for (const run of bundle.runs) delete run.hour_of_day;
  const set = compileBaselineSet(bundle);
  assert.strictEqual(set.context_axis, 'none');
  assert.strictEqual(set.n_bins, 1);
  assert.strictEqual(set.shards[0].seasonal.a.bins.length, 1);
});

test('compileBaselineSet: aggregate clean-null is robust to an injected outlier', () => {
  const clean = compileBaselineSet(makeHourlyBundle(false));
  const dirty = compileBaselineSet(makeHourlyBundle(true));
  const cleanMean = clean.shards.find((s) => s.shard_id === 's0')!.seasonal.a.aggregate.mean;
  const dirtyMean = dirty.shards.find((s) => s.shard_id === 's0')!.seasonal.a.aggregate.mean;
  // The clean-null aggregate mean must not be dragged toward the 100 outlier — the
  // robust trim (MAD-σ) rejects it, so the two aggregates stay close.
  assert.ok(Math.abs(dirtyMean - cleanMean) < 0.5,
    `aggregate mean shifted ${Math.abs(dirtyMean - cleanMean)} under a single 100 outlier (expected robust)`);
});

test('compileBaselineSet: override axis via opts', () => {
  const set = compileBaselineSet(makeHourlyBundle(), { axis: 'none' });
  assert.strictEqual(set.context_axis, 'none');
  assert.strictEqual(set.n_bins, 1);
});
