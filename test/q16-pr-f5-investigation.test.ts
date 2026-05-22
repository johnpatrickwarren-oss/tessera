// test/q16-pr-f5-investigation.test.ts — R16 AC-R16-3 and AC-R16-4.
//
// Verifies welford_state persistence requirement for compiled-config:
//   AC-R16-3: welford_state survives JSON round-trip (persistence layer soundness).
//   AC-R16-4: welford_state is load-bearing — absent welford_state resets accumulator
//             to n=1 on the next call to updatePerShardResidual (cold-start loss).
//
// Static trace: engine/per-shard/runtime.ts:100-103
//   const accumulatorBase: WelfordState =
//     seedChanged || current.welford_state === undefined
//       ? initialWelfordState(obs.sampleVector.length)
//       : current.welford_state;
// When welford_state is undefined: fresh accumulator; first sample gives n=1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import { updatePerShardResidual, type ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';

// ─── R16 AC-R16-3 — welford_state survives JSON round-trip ───────────────────────────────
test('R16 AC-R16-3 — welford_state survives JSON round-trip', () => {
  const residual: PerShardResidual = {
    n_samples: 25,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:baseline-v1',
    last_observed_at: 1000000,
    welford_state: { n: 25, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  };

  // Simulate compiled-config round-trip: serialize → deserialize (as loadCompiledConfig does)
  const roundTripped = JSON.parse(JSON.stringify(residual)) as PerShardResidual;

  // welford_state must survive exactly — this is what cold-start depends on
  assert.deepStrictEqual(roundTripped.welford_state, residual.welford_state);
  assert.strictEqual(roundTripped.welford_state!.n, 25);
  assert.deepStrictEqual(roundTripped.welford_state!.mean, [1, 2]);
  assert.deepStrictEqual(roundTripped.welford_state!.m2, [[4, 0], [0, 4]]);
});

// ─── R16 AC-R16-4 — welford_state is load-bearing: cold-start without it resets ─────────
test('R16 AC-R16-4 — welford_state is load-bearing: cold-start without it resets accumulator', () => {
  const obs: ExtendedSampleObservation = {
    observedAt: 2000000,
    residualSeedHash: 'sha:baseline-v1',
    sampleVector: [0.1, 0.2],
  };

  // Case A: residual WITH welford_state populated at n=25 (warm_start tier loaded from compiled-config)
  const withWelford: PerShardResidual = {
    n_samples: 25,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:baseline-v1',
    last_observed_at: 1000000,
    welford_state: { n: 25, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  };
  const resultWith = updatePerShardResidual(withWelford, obs);

  // Accumulator continues from n=25 → n=26 (one new sample added)
  assert.strictEqual(resultWith.welford_state!.n, 26);

  // Case B: identical residual but welford_state absent (compiled-config did NOT persist it)
  const withoutWelford: PerShardResidual = {
    n_samples: 25,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:baseline-v1',
    last_observed_at: 1000000,
    // welford_state intentionally absent — simulates cold-start from compiled-config without it
  };
  const resultWithout = updatePerShardResidual(withoutWelford, obs);

  // Accumulator resets to fresh state: first new sample gives n=1 (25 samples of history lost)
  assert.strictEqual(resultWithout.welford_state!.n, 1);

  // Load-bearing determination: WITH preserves history; WITHOUT discards it
  assert.ok(
    resultWith.welford_state!.n > resultWithout.welford_state!.n,
    `WITH welford_state n=${resultWith.welford_state!.n} should > WITHOUT n=${resultWithout.welford_state!.n}`,
  );
});
