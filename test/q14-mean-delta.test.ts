// test/q14-mean-delta.test.ts — R14 AC-1 through AC-7.
//
// Binds the R14 mean_delta computation at warm_start tier and the
// extended sparse-encoding inverse-convention enforcement (mean_delta
// absent at all non-warm_start tiers).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updatePerShardResidual,
  projectTierGatedOutputs,
  type ExtendedSampleObservation,
} from '../engine/per-shard/runtime';
import { initialPerShardResidual } from '../engine/per-shard/warm-start';
import { welfordMean } from '../engine/per-shard/welford';
import { makePerShardResidual, makeBaselineCellEntry } from './_substrate/factories';

// ─── R14 AC-1 — mean_delta computed correctly at warm_start when baselineCell provided ────
test('R14 AC-1 — warm_start + baselineCell: mean_delta = welfordMean − family_C.mean_vector', () => {
  // welford_state: n=3, mean=[2,4]; baselineCell.family_C.mean_vector=[1,3]
  // expected mean_delta = [2-1, 4-3] = [1, 1]
  const residual = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 3, mean: [2, 4], m2: [[1, 0], [0, 1]] },
    residual_seed_hash: 'sha:a',
  });
  const baselineCell = makeBaselineCellEntry({
    n_samples: 100,
    confidence: 'strict',
    family_C: {
      mean_vector: [1, 3],
      covariance: [[1, 0], [0, 1]],
    },
  });
  const projected = projectTierGatedOutputs(residual, baselineCell);
  assert.ok(projected.mean_delta !== undefined, 'mean_delta should be present at warm_start with baselineCell');
  assert.deepStrictEqual(projected.mean_delta, [1, 1]);
  // Cross-check: mean_delta = welfordMean(welford_state) - baselineCell.family_C.mean_vector
  const perShardMean = welfordMean(residual.welford_state!);
  const expectedDelta = perShardMean.map((v, i) => v - baselineCell.family_C!.mean_vector[i]);
  assert.deepStrictEqual(projected.mean_delta, expectedDelta);
  // mean_vector + covariance absent at warm_start (R10 inverse-convention preserved)
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R14 AC-2 — mean_delta absent at warm_start when no baselineCell provided ──────────
test('R14 AC-2 — warm_start + no baselineCell: mean_delta absent from output', () => {
  const residual = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 3, mean: [2, 4], m2: [[1, 0], [0, 1]] },
    residual_seed_hash: 'sha:a',
  });
  // R14: no baselineCell → mean_delta absent (replaced the R10 "carry-through" behavior)
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_delta, undefined);
  assert.strictEqual('mean_delta' in projected, false);
});

// ─── R14 AC-3 — mean_delta absent when baselineCell has no family_C ─────────────────────
test('R14 AC-3 — warm_start + baselineCell without family_C: mean_delta absent', () => {
  const residual = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 3, mean: [2, 4], m2: [[1, 0], [0, 1]] },
  });
  const baselineCell = makeBaselineCellEntry({
    n_samples: 100,
    confidence: 'none',
    // family_C intentionally absent
  });
  const projected = projectTierGatedOutputs(residual, baselineCell);
  assert.strictEqual(projected.mean_delta, undefined);
  assert.strictEqual('mean_delta' in projected, false);
});

// ─── R14 AC-4 — mean_delta absent at 'none' tier (inverse-convention enforcement) ────────
test("R14 AC-4 — 'none' tier with stale mean_delta in fixture: mean_delta stripped from output", () => {
  // Stale mean_delta on a none-tier residual (malformed; should be absent per convention)
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'none',
    welford_state: { n: 5, mean: [1, 2], m2: [[1, 0], [0, 1]] },
    mean_delta: [0.5, 0.6],  // stale — convention says absent at none tier
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_delta, undefined);
  assert.strictEqual('mean_delta' in projected, false);
});

// ─── R14 AC-5 — mean_delta absent at 'strict' tier (inverse-convention enforcement) ──────
test("R14 AC-5 — 'strict' tier with stale mean_delta in fixture: mean_delta stripped from output", () => {
  // Stale mean_delta on a strict-tier residual (wrong; mean_delta is warm_start-only)
  const residual = makePerShardResidual({
    n_samples: 80,
    confidence: 'strict',
    welford_state: { n: 80, mean: [1, 2], m2: [[40, 0], [0, 40]] },
    mean_delta: [0.1, 0.2],  // stale — convention says absent at strict tier
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_delta, undefined);
  assert.strictEqual('mean_delta' in projected, false);
  // But mean_vector + covariance ARE present at strict tier (R10 behavior preserved)
  assert.ok(projected.mean_vector !== undefined);
  assert.ok(projected.covariance !== undefined);
});

// ─── R14 AC-6 — updatePerShardResidual with baselineCell populates mean_delta at warm_start ─
test('R14 AC-6 — updatePerShardResidual with baselineCell: mean_delta populated at warm_start transition', () => {
  // Advance from n=19 to n=20 (warm_start threshold) with sampleVector=[3,7]
  // baselineCell.family_C.mean_vector = [1, 3]
  // After update: welfordMean ≈ [something including [3,7]]; mean_delta = welfordMean - [1, 3]
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 19, mean: [2, 5], m2: [[10, 0], [0, 10]] },
  });
  const baselineCell = makeBaselineCellEntry({
    n_samples: 100,
    confidence: 'strict',
    family_C: {
      mean_vector: [1, 3],
      covariance: [[1, 0], [0, 1]],
    },
  });
  const obs: ExtendedSampleObservation = {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 7],
  };
  const result = updatePerShardResidual(at19, obs, baselineCell);
  assert.strictEqual(result.n_samples, 20);
  assert.strictEqual(result.confidence, 'warm_start');
  assert.ok(result.mean_delta !== undefined, 'mean_delta should be present at warm_start with baselineCell');
  // mean_delta = welfordMean(result.welford_state) - [1, 3]
  const expectedDelta = welfordMean(result.welford_state!).map((v, i) => v - [1, 3][i]);
  assert.deepStrictEqual(result.mean_delta, expectedDelta);
});

// ─── R14 AC-7 — updatePerShardResidual without baselineCell: mean_delta absent at warm_start ─
test('R14 AC-7 — updatePerShardResidual without baselineCell: mean_delta absent at warm_start', () => {
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 19, mean: [2, 5], m2: [[10, 0], [0, 10]] },
  });
  const obs: ExtendedSampleObservation = {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 7],
  };
  const result = updatePerShardResidual(at19, obs);  // no baselineCell
  assert.strictEqual(result.n_samples, 20);
  assert.strictEqual(result.confidence, 'warm_start');
  assert.strictEqual(result.mean_delta, undefined);
  assert.strictEqual('mean_delta' in result, false);
});
