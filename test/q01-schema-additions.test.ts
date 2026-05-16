// test/q01-schema-additions.test.ts — R01 AC-3
//
// Verifies the four Tessera SLICE 1 schema deltas to engine/types/config.ts:
//   Delta 1: 'shard_id' added to BaselineCellsConfig.dimensions inline union
//   Delta 2: 'warm_start' added to BaselineCellEntry.confidence inline union
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

// Delta 1 — shard_id is a valid CellDimension (type-level assertion)
test('Q1 AC-3 Delta-1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

// Delta 2 — warm_start is a valid CellConfidence (type-level assertion)
test('Q1 AC-3 Delta-2 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

// Delta 3 — PerShardResidual accepts sparse encoding (mean_vector + covariance absent)
test('Q1 AC-3 Delta-3 — PerShardResidual accepts sparse encoding', () => {
  const sparse: PerShardResidual = { confidence: 'warm_start' };
  assert.strictEqual(sparse.mean_vector, undefined);
  assert.strictEqual(sparse.covariance, undefined);
  assert.strictEqual(sparse.confidence, 'warm_start');
});

// Delta 3 — PerShardResidual accepts strict-upgraded encoding (all fields present)
test('Q1 AC-3 Delta-3 — PerShardResidual accepts strict-upgraded encoding', () => {
  const full: PerShardResidual = {
    mean_vector: [0, 0, 0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    confidence: 'strict',
  };
  assert.deepStrictEqual(full.mean_vector, [0, 0, 0]);
  assert.strictEqual(full.confidence, 'strict');
});

// Delta 4 — CompiledConfig has optional per_shard_cells field (type-level assertion)
test('Q1 AC-3 Delta-4 — CompiledConfig accepts per_shard_cells field', () => {
  const cells: PerShardCell[] = [
    { shard_id: 'shard-0', residual: { confidence: 'warm_start' } },
    { shard_id: 'shard-1', residual: { confidence: 'strict', mean_vector: [1, 2] } },
  ];
  // Type-level: per_shard_cells is optional on CompiledConfig
  const cfg = { per_shard_cells: cells } as Pick<CompiledConfig, 'per_shard_cells'>;
  assert.strictEqual(cfg.per_shard_cells?.length, 2);
  assert.strictEqual(cfg.per_shard_cells?.[0].shard_id, 'shard-0');
});
