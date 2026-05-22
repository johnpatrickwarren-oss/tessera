// test/q05-per-shard-runtime.test.ts — R05 AC-1 through AC-13 + AC-19.
//
// Binds the SLICE 2b3 per-shard runtime composition at engine/per-shard/runtime.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updatePerShardResidual,
  type ExtendedSampleObservation,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import {
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import { welfordMean } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/welford';
import { makePerShardResidual } from './_substrate/factories';

// ─── R05 AC-1 — cold-start composition produces correct merged residual ─────
test('R05 AC-1 — cold-start: initialPerShardResidual + first sample produces correct merged state', () => {
  const initial = initialPerShardResidual();
  const next = updatePerShardResidual(initial, {
    observedAt: 1000,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 5],
  });
  // State-machine fields (R03 contract):
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:a');
  assert.strictEqual(next.last_observed_at, 1000);
  // Accumulator (R04 first-sample contract: mean=sample, m2=zeros at n=1):
  assert.ok(next.welford_state !== undefined);
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [3, 5]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0], [0, 0]]);
});

// ─── R05 AC-2 — two-sample composition produces R04 AC-3 closed-form post-state ─
test('R05 AC-2 — second sample threads accumulator forward; closed-form mean and m2', () => {
  const after1 = updatePerShardResidual(initialPerShardResidual(), {
    observedAt: 1000,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],
  });
  const after2 = updatePerShardResidual(after1, {
    observedAt: 1001,
    residualSeedHash: 'sha:a',
    sampleVector: [2, 4],
  });
  // R04 AC-3 closed-form: samples [[0,0],[2,4]] → mean=[1,2], m2=[[2,4],[4,8]].
  assert.strictEqual(after2.welford_state!.n, 2);
  assert.deepStrictEqual(after2.welford_state!.mean, [1, 2]);
  assert.deepStrictEqual(after2.welford_state!.m2, [[2, 4], [4, 8]]);
  // State-machine fields preserved:
  assert.strictEqual(after2.n_samples, 2);
  assert.strictEqual(after2.confidence, 'none');  // below WARM_START_THRESHOLD
});

// ─── R05 AC-3 — n_samples + confidence transitions preserved from R03 contract ─
test('R05 AC-3 — confidence transitions at n=20 and welford_state stays threaded', () => {
  // Walk from n=19 → n=20 under stable seed.
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 19, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  const next = updatePerShardResidual(at19, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],  // zero sample to keep mean/m2 trivial
  });
  assert.strictEqual(next.n_samples, 20);
  assert.strictEqual(next.confidence, 'warm_start');
  assert.strictEqual(next.welford_state!.n, 20);
});

// ─── R05 AC-4 — baseline-refresh (seed_hash mismatch) resets accumulator ──────
test('R05 AC-4 — baseline-refresh resets welford_state: new accumulator at d=2 with first sample', () => {
  // Stale state with populated accumulator.
  const stale = makePerShardResidual({
    n_samples: 50,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
    welford_state: { n: 50, mean: [10, 20], m2: [[100, 0], [0, 200]] },
    mean_delta: [0.5, 0.6],  // OUTPUT field that observeSample also clears on reset
  });
  const next = updatePerShardResidual(stale, {
    observedAt: 200,
    residualSeedHash: 'sha:new',
    sampleVector: [7, 9],
  });
  // State-machine reset (R03 AC-9 contract carries through):
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  assert.strictEqual(next.mean_delta, undefined);
  // Accumulator reset: fresh d=2 init then first-sample update.
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [7, 9]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0], [0, 0]]);
});

// ─── R05 AC-5 — first-time seed assignment from cold-start (no prior welford_state) ──
test('R05 AC-5 — first-time seed assignment initializes welford_state on the normal-increment path', () => {
  // initialPerShardResidual produces { n_samples: 0, confidence: 'none' } — no welford_state.
  const fresh = initialPerShardResidual();
  const next = updatePerShardResidual(fresh, {
    observedAt: 100,
    residualSeedHash: 'sha:first',
    sampleVector: [4, 6, 8],
  });
  // R03 AC-10: first-time seed is NORMAL increment, not reset.
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:first');
  // welford_state initialized at d=3 with first sample.
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [4, 6, 8]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

// ─── R05 AC-6 — dimension mismatch under stable seed propagates updateWelford throw ──
test('R05 AC-6 — dimension mismatch under stable seed throws (propagates from updateWelford)', () => {
  // Accumulator established at d=2.
  const after1 = updatePerShardResidual(initialPerShardResidual(), {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [1, 2],
  });
  // Stable-seed sample with d=3 — should throw.
  assert.throws(
    () => updatePerShardResidual(after1, {
      observedAt: 200,
      residualSeedHash: 'sha:a',
      sampleVector: [1, 2, 3],
    }),
    /dimension mismatch/,
  );
});

// ─── R05 AC-7 — input residual is not mutated ─────────────────────────────────
test('R05 AC-7 — updatePerShardResidual does not mutate input residual', () => {
  const before = makePerShardResidual({
    n_samples: 5,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 5, mean: [1, 2], m2: [[10, 5], [5, 20]] },
  });
  const snapshot = JSON.stringify(before);
  // Discard return value — only input invariance matters here.
  updatePerShardResidual(before, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 4],
  });
  assert.strictEqual(JSON.stringify(before), snapshot);
});

// ─── R05 AC-8 — welford_state present across confidence-tier transitions ──────
test('R05 AC-8 — welford_state remains populated across confidence-tier transitions', () => {
  // Walk a residual from n=18 (none) through n=20 (warm_start) under stable seed.
  let r = makePerShardResidual({
    n_samples: 18,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 18, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  for (let i = 0; i < 3; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 100 + i,
      residualSeedHash: 'sha:a',
      sampleVector: [0, 0],
    });
  }
  assert.strictEqual(r.n_samples, 21);
  assert.strictEqual(r.confidence, 'warm_start');
  // welford_state IS NOT subject to the sparse-encoding convention; remains present at warm_start tier.
  assert.ok(r.welford_state !== undefined);
  assert.strictEqual(r.welford_state!.n, 21);
});

// ─── R05 AC-9 — welford_state present at strict tier (n >= 60) ────────────────
test('R05 AC-9 — welford_state remains populated at strict tier (no sparse-encoding gate)', () => {
  const at59 = makePerShardResidual({
    n_samples: 59,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 59, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  const at60 = updatePerShardResidual(at59, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],
  });
  assert.strictEqual(at60.n_samples, 60);
  assert.strictEqual(at60.confidence, 'strict');
  // welford_state remains populated at strict tier.
  assert.ok(at60.welford_state !== undefined);
  assert.strictEqual(at60.welford_state!.n, 60);
});

// ─── R05 AC-10 — welfordMean(threaded accumulator) equals expected running mean ─
test('R05 AC-10 — welfordMean over composed updates equals expected running mean', () => {
  // Apply samples [1,1], [3,3], [5,5] in sequence; expected mean is [3, 3].
  const samples = [[1, 1], [3, 3], [5, 5]];
  let r = initialPerShardResidual();
  for (let i = 0; i < samples.length; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 100 + i,
      residualSeedHash: 'sha:a',
      sampleVector: samples[i],
    });
  }
  assert.strictEqual(r.welford_state!.n, 3);
  assert.deepStrictEqual(welfordMean(r.welford_state!), [3, 3]);
});

// ─── R05 AC-11 — welford_state survives JSON serialization round-trip ─────────
test('R05 AC-11 — welford_state survives JSON.stringify + JSON.parse round-trip', () => {
  const after2 = updatePerShardResidual(
    updatePerShardResidual(initialPerShardResidual(), {
      observedAt: 100,
      residualSeedHash: 'sha:a',
      sampleVector: [0, 0],
    }),
    {
      observedAt: 200,
      residualSeedHash: 'sha:a',
      sampleVector: [2, 4],
    },
  );
  const restored: typeof after2 = JSON.parse(JSON.stringify(after2));
  assert.deepStrictEqual(restored.welford_state, after2.welford_state);
  assert.strictEqual(restored.welford_state!.n, 2);
});

// ─── R05 AC-12 — cold-start initialPerShardResidual remains welford_state-undefined ─
test('R05 AC-12 — initialPerShardResidual still produces welford_state === undefined (R03 cold-start preserved)', () => {
  const r = initialPerShardResidual();
  assert.strictEqual(r.welford_state, undefined);
});

// ─── R05 AC-13 — observeSample contract unchanged (no welford_state side-effect) ──
test('R05 AC-13 — direct observeSample (without sampleVector) does not produce welford_state', async () => {
  // observeSample (R03-shipped) is composed by updatePerShardResidual but is itself unchanged.
  // A direct observeSample call from outside runtime.ts should NOT yield a welford_state field.
  const { observeSample } = await import('../engine/per-shard/warm-start');
  const next = observeSample(initialPerShardResidual(), {
    observedAt: 100,
    residualSeedHash: 'sha:a',
  });
  // welford_state must be absent — observeSample does not add accumulator state.
  assert.strictEqual(next.welford_state, undefined);
  assert.strictEqual(next.n_samples, 1);
});

// ─── R05 AC-19 — welford.ts JSDoc references R05 integration site ─────────────
// (Binding command form per R03 MINOR-2 grep-pattern-soundness reinforcement: target
//  whole-file content rather than a comment-pattern grep; see AC-19 evidence command
//  in § Acceptance criteria below.)
