// test/q16-pr-f5-investigation.test.ts — R16 AC-R16-3 and AC-R16-4.
//
// Verifies welford_state persistence requirement for compiled-config round-trip
// (AC-R16-3) and cold-start accumulator reset behavior (AC-R16-4).
// RED state: placeholder failures pending implementation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// RED: welford_state investigation tests not yet implemented.
test('R16 AC-R16-3 — welford_state survives JSON round-trip', () => {
  assert.fail('RED: welford_state round-trip test not yet implemented');
});

test('R16 AC-R16-4 — welford_state is load-bearing: cold-start without it resets accumulator', () => {
  assert.fail('RED: welford_state cold-start test not yet implemented');
});
