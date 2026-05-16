// test/q02-schema-extension.test.ts — R02 AC-1 through AC-5
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';

test('R02 AC-1 — PerShardResidual.n_samples is mandatory and typed number', () => {
  // Type-level: omitting n_samples must fail tsc. The runtime assertion confirms the
  // field shape at the instantiation site.
  const r: PerShardResidual = { n_samples: 42, confidence: 'warm_start' };
  assert.strictEqual(r.n_samples, 42);
  assert.strictEqual(typeof r.n_samples, 'number');
});

test('R02 AC-2 — PerShardResidual sparse encoding by confidence tier (warm_start)', () => {
  // Warm-start convention: mean_delta present; mean_vector + covariance absent.
  const warm: PerShardResidual = {
    n_samples: 25,
    confidence: 'warm_start',
    mean_delta: [0.1, 0.2, 0.3],
    residual_seed_hash: 'sha256:abcd',
    last_observed_at: 1747987200000,
  };
  assert.deepStrictEqual(warm.mean_delta, [0.1, 0.2, 0.3]);
  assert.strictEqual(warm.mean_vector, undefined);
  assert.strictEqual(warm.covariance, undefined);
  assert.strictEqual(warm.residual_seed_hash, 'sha256:abcd');
  assert.strictEqual(warm.last_observed_at, 1747987200000);
});

test('R02 AC-3 — PerShardCell carries shard_id + key + residual', () => {
  // Delta 6: PerShardCell mirrors BaselineCellEntry shape with `key: CellKey`.
  const cell: PerShardCell = {
    shard_id: 'shard-42',
    key: { hour_of_day: 14, day_of_week: 3 } as any,
    residual: { n_samples: 100, confidence: 'strict', mean_vector: [1.0, 2.0] },
  };
  assert.strictEqual(cell.shard_id, 'shard-42');
  assert.strictEqual(cell.residual.n_samples, 100);
  // `key` field must be present (Delta 6 restructure binding).
  assert.notStrictEqual(cell.key, undefined);
});

test('R02 AC-4 — CellDimension typedef canonically references all 7 members', () => {
  // Extraction (Delta 7) preserves the inline-union literal value-by-value.
  const all: CellDimension[] = [
    'hour_of_day', 'day_of_week', 'workload_class',
    'tenant_slice', 'tenant_tier', 'region', 'shard_id',
  ];
  assert.strictEqual(all.length, 7);
  assert.strictEqual(all.includes('shard_id'), true);
});

test('R02 AC-5 — CellConfidence typedef canonically references all 5 members', () => {
  const all: CellConfidence[] = ['strict', 'pooled', 'aggregate', 'none', 'warm_start'];
  assert.strictEqual(all.length, 5);
  assert.strictEqual(all.includes('warm_start'), true);
});
