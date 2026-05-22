// test/q10-per-shard-emission.test.ts — R10 AC-1 through AC-11.
//
// Binds the SLICE 2b4 strict-tier mean_vector + covariance emission AND the
// sparse-encoding inverse-convention enforcement at non-strict tiers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updatePerShardResidual,
  projectTierGatedOutputs,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import {
  welfordMean,
  welfordCovariance,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/welford';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import { makePerShardResidual } from './_substrate/factories';

// ─── R10 AC-1 — projectTierGatedOutputs at strict tier emits mean_vector + covariance with closed-form values ─
test('R10 AC-1 — strict tier with valid welford_state: emits mean_vector and covariance from welfordMean + welfordCovariance', () => {
  // Hand-trace fixture (matches Implementer note 5):
  // welford_state.n=3, mean=[1,2], m2=[[2,1],[1,8]] → covariance = m2/(n-1) = m2/2 = [[1, 0.5], [0.5, 4]].
  const residual = makePerShardResidual({
    n_samples: 3,
    confidence: 'strict',
    welford_state: { n: 3, mean: [1, 2], m2: [[2, 1], [1, 8]] },
    residual_seed_hash: 'sha:a',
    last_observed_at: 100,
  });
  const projected = projectTierGatedOutputs(residual);
  // Emission: mean_vector deep-equals welfordMean output; covariance deep-equals welfordCovariance output.
  assert.deepStrictEqual(projected.mean_vector, [1, 2]);
  assert.deepStrictEqual(projected.covariance, [[1, 0.5], [0.5, 4]]);
  // Cross-check against welford.ts helpers directly:
  assert.deepStrictEqual(projected.mean_vector, welfordMean(residual.welford_state!));
  assert.deepStrictEqual(projected.covariance, welfordCovariance(residual.welford_state!));
  // welford_state preserved on output (NOT subject to sparse-encoding convention).
  assert.deepStrictEqual(projected.welford_state, residual.welford_state);
  // State-machine fields preserved:
  assert.strictEqual(projected.n_samples, 3);
  assert.strictEqual(projected.confidence, 'strict');
  assert.strictEqual(projected.residual_seed_hash, 'sha:a');
  assert.strictEqual(projected.last_observed_at, 100);
});

// ─── R10 AC-2 — covariance properties at strict tier: d×d symmetric ─
test('R10 AC-2 — emitted covariance is d×d (length matches mean_vector.length) and symmetric (cov[i][j] === cov[j][i])', () => {
  // d=3 fixture with non-trivial cross-covariance.
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'strict',
    welford_state: {
      n: 5,
      mean: [1, 2, 3],
      m2: [
        [8, 2, 4],
        [2, 12, 6],
        [4, 6, 16],
      ],
    },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.ok(projected.mean_vector !== undefined);
  assert.ok(projected.covariance !== undefined);
  const d = projected.mean_vector!.length;
  assert.strictEqual(d, 3);
  // Outer dimension d.
  assert.strictEqual(projected.covariance!.length, d);
  // Inner dimensions all d AND symmetry.
  for (let i = 0; i < d; i++) {
    assert.strictEqual(projected.covariance![i].length, d);
    for (let j = 0; j < d; j++) {
      assert.strictEqual(
        projected.covariance![i][j],
        projected.covariance![j][i],
        `covariance asymmetric at [${i}][${j}] vs [${j}][${i}]`,
      );
    }
  }
});

// ─── R10 AC-3 — inverse-convention at 'none' tier: mean_vector + covariance absent ─
test("R10 AC-3 — at 'none' tier: projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'none',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  // Key-absence form (stronger than undefined): not just value-undefined, key not present.
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
  // welford_state still present (not subject to inverse-convention).
  assert.ok(projected.welford_state !== undefined);
});

// ─── R10 AC-4 — inverse-convention at 'warm_start' tier: mean_vector + covariance absent ─
test("R10 AC-4 — at 'warm_start' tier: projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 25, mean: [1, 2], m2: [[24, 0], [0, 24]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-5 — inverse-convention at 'pooled' tier (synthetic fixture; observeSample cannot emit this tier) ─
test("R10 AC-5 — at 'pooled' tier (synthetic fixture): projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'pooled',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-6 — inverse-convention at 'aggregate' tier (synthetic fixture; observeSample cannot emit this tier) ─
test("R10 AC-6 — at 'aggregate' tier (synthetic fixture): projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'aggregate',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-7 — atomic gate at strict tier with welford_state undefined: no emission ─
test('R10 AC-7 — strict tier with welford_state undefined: no emission (atomic gate)', () => {
  const residual = makePerShardResidual({
    n_samples: 80,
    confidence: 'strict',
    // welford_state intentionally absent — malformed-fixture case.
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-8 — atomic gate at strict tier with welford_state.n=1: no emission (welfordCovariance returns null) ─
test('R10 AC-8 — strict tier with welford_state.n=1: no emission (welfordCovariance returns null at n<2)', () => {
  const residual = makePerShardResidual({
    n_samples: 80,
    confidence: 'strict',
    welford_state: { n: 1, mean: [5, 7], m2: [[0, 0], [0, 0]] },
  });
  // Pre-check: welfordCovariance returns null at n=1 (cross-binding to R04 contract).
  assert.strictEqual(welfordCovariance(residual.welford_state!), null);
  const projected = projectTierGatedOutputs(residual);
  // Atomic gate: even though welfordMean would succeed at n=1, NEITHER field emits.
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
});

// ─── R10 AC-9 — updatePerShardResidual cold-start walk to strict emits mean_vector + covariance ─
test('R10 AC-9 — updatePerShardResidual: cold-start walk of 60 samples [1,0] yields strict tier with mean_vector=[1,0] and covariance=[[0,0],[0,0]]', () => {
  let r = initialPerShardResidual();
  for (let i = 0; i < 60; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 1000 + i,
      residualSeedHash: 'sha:a',
      sampleVector: [1, 0],
    });
  }
  assert.strictEqual(r.n_samples, 60);
  assert.strictEqual(r.confidence, 'strict');
  // Zero-variance samples: mean=[1,0]; m2=0 → covariance=0.
  assert.deepStrictEqual(r.mean_vector, [1, 0]);
  assert.deepStrictEqual(r.covariance, [[0, 0], [0, 0]]);
});

// ─── R10 AC-10 — stale-spread strip: malformed warm_start input with leftover mean_vector → output strips them ─
// R14 update: mean_delta now also stripped when no baselineCell provided (R14 closes R10 SAS-4 "R11+ scope").
test('R10 AC-10 — projectTierGatedOutputs strips stale mean_vector / covariance / mean_delta from a malformed warm_start input (no baselineCell)', () => {
  const malformed = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 25, mean: [1, 2], m2: [[24, 0], [0, 24]] },
    mean_vector: [99, 99],         // stale — convention says these should NOT be present at warm_start.
    covariance: [[99, 99], [99, 99]],  // stale
    mean_delta: [0.5, 0.6],         // stale — R14 strips this; replaces with fresh computation from baselineCell.
  });
  const projected = projectTierGatedOutputs(malformed);  // no baselineCell → mean_delta cannot be computed
  // Stale mean_vector + covariance stripped (keys absent on output).
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
  // R14: mean_delta also absent when no baselineCell (fresh computation replaces passthrough).
  assert.strictEqual(projected.mean_delta, undefined);
  assert.strictEqual('mean_delta' in projected, false);
});

// ─── R10 AC-11 — defensive copy: mutating returned mean_vector does not affect welford_state.mean ─
test('R10 AC-11 — emitted mean_vector is a defensive copy (mutation does not propagate to welford_state.mean)', () => {
  const residual = makePerShardResidual({
    n_samples: 3,
    confidence: 'strict',
    welford_state: { n: 3, mean: [1, 2], m2: [[2, 0], [0, 2]] },
  });
  const projected = projectTierGatedOutputs(residual);
  // Mutate the returned mean_vector.
  projected.mean_vector![0] = 999;
  // Original welford_state.mean is unchanged (welfordMean defensive copy semantic; q04 AC-9 carry-forward).
  assert.deepStrictEqual(residual.welford_state!.mean, [1, 2]);
  // projected.welford_state shares the same reference as residual.welford_state in this implementation;
  // verify the underlying mean array is unchanged via the residual side (load-bearing assertion).
  assert.strictEqual(residual.welford_state!.mean[0], 1);
});
