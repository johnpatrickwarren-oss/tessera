// test/q03-warm-start-runtime.test.ts — R03 AC-1 through AC-11.
//
// Binds the SLICE 2b1 warm-start confidence-tier state machine at
// engine/per-shard/warm-start.ts. Eleven test cases; each maps to one R03 AC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  observeSample,
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '../engine/per-shard/warm-start';
import { makePerShardResidual } from './_substrate/factories';

test('R03 AC-1 — initialPerShardResidual returns cold-start state', () => {
  const r = initialPerShardResidual();
  assert.strictEqual(r.n_samples, 0);
  assert.strictEqual(r.confidence, 'none');
  assert.strictEqual(r.residual_seed_hash, undefined);
  assert.strictEqual(r.last_observed_at, undefined);
  assert.strictEqual(r.mean_vector, undefined);
  assert.strictEqual(r.covariance, undefined);
  assert.strictEqual(r.mean_delta, undefined);
});

test('R03 AC-2 — observeSample increments n_samples and refreshes seed/timestamp', () => {
  const current = initialPerShardResidual();
  const next = observeSample(current, { observedAt: 1000, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.last_observed_at, 1000);
  assert.strictEqual(next.residual_seed_hash, 'sha:a');
  assert.strictEqual(next.confidence, 'none');  // below WARM_START_THRESHOLD
});

test('R03 AC-3 — WARM_START_THRESHOLD equals 20 (PRD AC-P2 literal)', () => {
  assert.strictEqual(WARM_START_THRESHOLD, 20);
});

test('R03 AC-4 — STRICT_UPGRADE_THRESHOLD equals 60 (PRD AC-P2 literal)', () => {
  assert.strictEqual(STRICT_UPGRADE_THRESHOLD, 60);
});

test('R03 AC-5 — confidence transitions none → warm_start at n=20 boundary', () => {
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at19, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 20);
  assert.strictEqual(next.confidence, 'warm_start');
});

test('R03 AC-6 — confidence stays none below WARM_START_THRESHOLD', () => {
  const at18 = makePerShardResidual({
    n_samples: 18,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at18, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 19);
  assert.strictEqual(next.confidence, 'none');
});

test('R03 AC-7 — confidence transitions warm_start → strict at n=60 boundary', () => {
  const at59 = makePerShardResidual({
    n_samples: 59,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at59, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 60);
  assert.strictEqual(next.confidence, 'strict');
});

test('R03 AC-8 — strict tier preserved on subsequent samples (no demotion)', () => {
  const at200 = makePerShardResidual({
    n_samples: 200,
    confidence: 'strict',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at200, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 201);
  assert.strictEqual(next.confidence, 'strict');
});

test('R03 AC-9 — seed_hash mismatch resets residual + clears statistical fields', () => {
  const stale = makePerShardResidual({
    n_samples: 50,
    confidence: 'warm_start',
    mean_delta: [0.1, 0.2],
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
  });
  const next = observeSample(stale, { observedAt: 200, residualSeedHash: 'sha:new' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  // Stale statistics MUST be cleared on reset.
  assert.strictEqual(next.mean_delta, undefined);
  assert.strictEqual(next.mean_vector, undefined);
  assert.strictEqual(next.covariance, undefined);
});

test('R03 AC-10 — first-time seed assignment does not trigger reset', () => {
  const fresh = initialPerShardResidual();  // no seed yet
  const next = observeSample(fresh, { observedAt: 100, residualSeedHash: 'sha:first' });
  assert.strictEqual(next.n_samples, 1);  // normal increment, not reset
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:first');
});

test('R03 AC-11 — statistical fields preserved across observeSample under stable seed', () => {
  const withStats = makePerShardResidual({
    n_samples: 30,
    confidence: 'warm_start',
    mean_delta: [0.5, 0.6, 0.7],
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(withStats, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 31);
  assert.strictEqual(next.confidence, 'warm_start');
  // Statistical-residual fields preserved verbatim (SLICE 2b1 does not compute
  // them; R04's Welford runtime layers on top).
  assert.deepStrictEqual(next.mean_delta, [0.5, 0.6, 0.7]);
});
