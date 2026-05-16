// test/q02-schema-extension.test.ts — R02 AC-1 through AC-5 (R03-updated for MINOR-1/3/5 closures)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';
import { makePerShardCell, makeCellKey } from './_substrate/factories';

test('R02 AC-1 — PerShardResidual.n_samples is mandatory and typed number', () => {
  const r: PerShardResidual = { n_samples: 42, confidence: 'warm_start' };
  assert.strictEqual(r.n_samples, 42);
  assert.strictEqual(typeof r.n_samples, 'number');
});

test('R02 AC-1 sibling — PerShardResidual literal omitting n_samples fails tsc (closes R02 MINOR-1)', () => {
  // @ts-expect-error — n_samples is mandatory; omission must fail tsc.
  const _missing: PerShardResidual = { confidence: 'warm_start' };
  void _missing;
  // Load-bearing check is the @ts-expect-error directive: if n_samples were made
  // optional, tsc would error "Unused @ts-expect-error directive."
  assert.ok(true);
});

test('R02 AC-2 — PerShardResidual sparse encoding by confidence tier (warm_start)', () => {
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

test('R02 AC-3 — PerShardCell carries shard_id + key + residual (R03: factory call)', () => {
  // R03 closes R02 MINOR-3: factory call instead of `as any` cast.
  const cell: PerShardCell = makePerShardCell({
    shard_id: 'shard-42',
    key: makeCellKey({ hour_of_day: 14, day_of_week: 3 }),
    residual: { n_samples: 100, confidence: 'strict', mean_vector: [1.0, 2.0] },
  });
  assert.strictEqual(cell.shard_id, 'shard-42');
  assert.strictEqual(cell.residual.n_samples, 100);
  assert.notStrictEqual(cell.key, undefined);
});

// R03 closes R02 MINOR-5 — bidirectional cardinality binding.
// Member removal: any key dropped from the literal → "Property 'X' does not exist on type ...".
// Member addition: any new CellDimension/CellConfidence member without a corresponding
// key here → "Property 'newMember' is missing in type ... but required in type ...".
const CELL_DIMENSION_EXHAUSTIVE: Record<CellDimension, true> = {
  hour_of_day: true,
  day_of_week: true,
  workload_class: true,
  tenant_slice: true,
  tenant_tier: true,
  region: true,
  shard_id: true,
};

test('R02 AC-4 — CellDimension typedef is exhaustively bound to 7 members', () => {
  const members = Object.keys(CELL_DIMENSION_EXHAUSTIVE) as CellDimension[];
  assert.strictEqual(members.length, 7);
  assert.strictEqual(members.includes('shard_id'), true);
});

const CELL_CONFIDENCE_EXHAUSTIVE: Record<CellConfidence, true> = {
  strict: true,
  pooled: true,
  aggregate: true,
  none: true,
  warm_start: true,
};

test('R02 AC-5 — CellConfidence typedef is exhaustively bound to 5 members', () => {
  const members = Object.keys(CELL_CONFIDENCE_EXHAUSTIVE) as CellConfidence[];
  assert.strictEqual(members.length, 5);
  assert.strictEqual(members.includes('warm_start'), true);
});
