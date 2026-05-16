// test/q01-schema-additions.test.ts — R01 AC-3 (R02-updated for Delta 6+7; R03: factory + Pick revert)
//
// R03 changes:
//   - Replace `as any` casts on CellKey literals with makeCellKey factory (closes R02 MINOR-3).
//   - Revert `as CompiledConfig` widening to `Pick<CompiledConfig, 'per_shard_cells'>`
//     (closes R02 MINOR-4 — preserves tsc's required-field check on unrelated CompiledConfig members).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  CompiledConfig,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';
import { makePerShardCell, makeCellKey } from './_substrate/factories';

test('Q1 AC-3 Delta-1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

test('Q1 AC-3 Delta-2 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts sparse encoding', () => {
  const sparse: PerShardResidual = { n_samples: 0, confidence: 'warm_start' };
  assert.strictEqual(sparse.mean_vector, undefined);
  assert.strictEqual(sparse.covariance, undefined);
  assert.strictEqual(sparse.confidence, 'warm_start');
  assert.strictEqual(sparse.n_samples, 0);
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts strict-upgraded encoding', () => {
  const full: PerShardResidual = {
    n_samples: 60,
    mean_vector: [0, 0, 0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    confidence: 'strict',
  };
  assert.deepStrictEqual(full.mean_vector, [0, 0, 0]);
  assert.strictEqual(full.confidence, 'strict');
});

test('Q1 AC-3 Delta-4 — CompiledConfig accepts per_shard_cells field (R03: factory + Pick revert)', () => {
  // R03 closes R02 MINOR-3 (factory) + MINOR-4 (Pick<…> revert).
  const cells: PerShardCell[] = [
    makePerShardCell({
      shard_id: 'shard-0',
      key: makeCellKey({ hour_of_day: 0 }),
      residual: { n_samples: 0, confidence: 'warm_start' },
    }),
    makePerShardCell({
      shard_id: 'shard-1',
      key: makeCellKey({ hour_of_day: 1 }),
      residual: { n_samples: 60, confidence: 'strict', mean_vector: [1, 2] },
    }),
  ];
  // Pick<…> narrows the test object's required-field surface to just per_shard_cells,
  // restoring the R01-shipped binding precision after R02's incidental `as CompiledConfig` widening.
  const cfg: Pick<CompiledConfig, 'per_shard_cells'> = { per_shard_cells: cells };
  assert.strictEqual(cfg.per_shard_cells?.length, 2);
  assert.strictEqual(cfg.per_shard_cells?.[0]?.key !== undefined, true);
});
