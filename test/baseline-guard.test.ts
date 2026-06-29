// test/baseline-guard.test.ts — the short-window guard must FIRE. This enforces the
// invariant "e-betting requires a ~2-month baseline" in code, so it cannot regress to the
// recurring short-window mistake silently. If someone weakens the guard, this test fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLongBaseline, MIN_BASELINE_DAYS } from '../tools/baseline-guard.js';

test('throws on a short window (hourly): 60 ticks × 3600s ≈ 2.5 days', () => {
  delete process.env.CS_ALLOW_SHORT;
  assert.throws(() => assertLongBaseline(60, 3600, 'unit'), /below the .* minimum/);
});

test('throws on a short window (1Hz): 1000 ticks × 1s ≈ 0.01 days', () => {
  delete process.env.CS_ALLOW_SHORT;
  assert.throws(() => assertLongBaseline(1000, 1, 'unit'), /e-betting does NOT work on short/);
});

test('passes a ~2-month baseline at hourly cadence (1440 ticks × 3600s = 60 days)', () => {
  delete process.env.CS_ALLOW_SHORT;
  assert.doesNotThrow(() => assertLongBaseline(1440, 3600, 'unit'));
});

test('passes a ~2-month baseline at 1Hz (5,184,000 ticks × 1s = 60 days)', () => {
  delete process.env.CS_ALLOW_SHORT;
  assert.doesNotThrow(() => assertLongBaseline(5_184_000, 1, 'unit'));
});

test('CS_ALLOW_SHORT=1 overrides (plumbing only) — does not throw on a short window', () => {
  process.env.CS_ALLOW_SHORT = '1';
  try {
    assert.doesNotThrow(() => assertLongBaseline(60, 3600, 'unit'));
  } finally {
    delete process.env.CS_ALLOW_SHORT;
  }
});

test('the floor is ~2 months', () => {
  assert.ok(MIN_BASELINE_DAYS >= 56 && MIN_BASELINE_DAYS <= 62);
});
