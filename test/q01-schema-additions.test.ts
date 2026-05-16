// test/q01-schema-additions.test.ts — R01 AC-3 (R02-updated for SLICE 2a Delta 6 + 7)
//
// Verifies the four Tessera SLICE 1 schema deltas to engine/types/config.ts:
//   Delta 1: 'shard_id' added to BaselineCellsConfig.dimensions (via CellDimension typedef)
//   Delta 2: 'warm_start' added to BaselineCellEntry.confidence (via CellConfidence typedef)
//   Delta 3: PerShardResidual + PerShardCell type declarations
//   Delta 4: CompiledConfig.per_shard_cells?: PerShardCell[] optional field

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  CompiledConfig,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';

test('Q1 AC-3 Delta-1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

test('Q1 AC-3 Delta-2 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts sparse encoding', () => {
  // Sparse: mean_vector + covariance absent. n_samples + confidence mandatory.
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

test('Q1 AC-3 Delta-4 — CompiledConfig accepts per_shard_cells field', () => {
  // R02 Delta 6 restructure: PerShardCell now requires `key: CellKey`.
  // Stub a CellKey-shaped object inline (CellKey is inherited; shape preserved verbatim).
  const cells: PerShardCell[] = [
    { shard_id: 'shard-0', key: { hour_of_day: 0 } as any, residual: { n_samples: 0, confidence: 'warm_start' } },
    { shard_id: 'shard-1', key: { hour_of_day: 1 } as any, residual: { n_samples: 60, confidence: 'strict', mean_vector: [1, 2] } },
  ];
  const cfg: CompiledConfig = { per_shard_cells: cells } as CompiledConfig;
  assert.strictEqual(cfg.per_shard_cells?.length, 2);
  assert.strictEqual(cfg.per_shard_cells?.[0]?.key !== undefined, true);
});
