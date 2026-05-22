// test/q03-warm-start-runtime.test.ts — R03 AC-1 through AC-11 + R04 AC-12 + R04 AC-13.
//
// Binds the SLICE 2b1 warm-start confidence-tier state machine at
// engine/per-shard/warm-start.ts. Original eleven R03 test cases preserved;
// R04 adds two complementary tests (strict-tier reset + immutability) and an
// in-place clarifying comment on AC-9.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  observeSample,
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
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

// AC-9 — Delta 3c: clarifying comment added; assertions unchanged.
//
// R04 disposition note (R03 MINOR-1): this test's `next.mean_vector === undefined`
// and `next.covariance === undefined` assertions are defensive-but-vacuous under
// the R02 sparse-encoding convention for the warm-start tier (warm-start fixtures
// carry mean_delta only; mean_vector + covariance are absent by convention). The
// assertions are correct (post-reset state DOES have those fields undefined) but
// they cannot distinguish a spread-based reset regression from the explicit-
// construction reset, because the input fixture's mean_vector + covariance are
// already undefined. LOAD-BEARING coverage of mean_vector + covariance clearing
// on reset lives in R04 AC-12 below (strict-tier fixture where those fields ARE
// populated per R02 sparse encoding). The assertions remain here as defensive
// regression-resistance for the warm-start-tier path; removing them would
// unnecessarily weaken the test signature.
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

// ─── R04 additions ───────────────────────────────────────────────────────────

// Delta 3a — closes R03 OBS-2 + provides load-bearing coverage of R03 MINOR-1 intent.
test('R04 AC-12 — seed_hash mismatch resets residual from strict tier; clears mean_vector + covariance (closes R03 OBS-2)', () => {
  // Strict-tier sparse encoding (R02): mean_vector + covariance present; mean_delta absent.
  // LOAD-BEARING: if observeSample's reset branch were changed to a spread-based form
  // ({ ...current, n_samples: 1, confidence: 'none', residual_seed_hash: new, last_observed_at: new }),
  // mean_vector and covariance would propagate from input to output — these assertions
  // would catch the regression. The complement to R03 AC-9 (whose mean_vector/covariance
  // assertions are vacuous in the warm-start fixture).
  const staleStrict = makePerShardResidual({
    n_samples: 200,
    confidence: 'strict',
    mean_vector: [1.0, 2.0, 3.0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
  });
  const next = observeSample(staleStrict, { observedAt: 200, residualSeedHash: 'sha:new' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  // Load-bearing: strict-tier fixture sets these; reset must clear them.
  assert.strictEqual(next.mean_vector, undefined);
  assert.strictEqual(next.covariance, undefined);
  // Defensive (strict fixture does not set mean_delta; assertion is vacuous here).
  assert.strictEqual(next.mean_delta, undefined);
});

// Delta 3b — closes R03 MINOR-5 (observeSample mutation regression resistance).
test('R04 AC-13 — observeSample does not mutate input residual (closes R03 MINOR-5)', () => {
  // The example mutation cited in R03 MINOR-5: `current.n_samples++; return current;` —
  // produces a `next` that strict-equals `current` and would pass every existing AC-1
  // through AC-11 assertion. This test captures the input as a JSON snapshot pre-call
  // and asserts equality post-call; any in-place mutation would change the serialization.
  const before = makePerShardResidual({
    n_samples: 30,
    confidence: 'warm_start',
    mean_delta: [0.5, 0.6],
    residual_seed_hash: 'sha:a',
    last_observed_at: 50,
  });
  const snapshot = JSON.stringify(before);
  // Discard the return value — only input invariance matters here.
  observeSample(before, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(JSON.stringify(before), snapshot);
});
