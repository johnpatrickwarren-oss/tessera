// test/emitter-prototype.test.ts — unit checks for the research prototype's pure pieces
// (tools/emitter-prototype.ts, behind ADR 0019). Not a findings test; verifies the building
// blocks: the Gaussian-LR mixture increment is a valid e-increment (E[g|N(0,1)] ≤ 1, capped),
// and the SR recursion produces finite, ordered statistics.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gInc, shardEvals } from '../tools/emitter-prototype.js';

// E[g|N(0,1)] ≤ 1 holds BY CONSTRUCTION (each exp(λZ−λ²/2) is an e-value; a uniform mixture
// preserves it; the cap only lowers it). We verify the FORMULA deterministically rather than
// Monte-Carlo it — the λ=2 term is lognormal with huge variance, so an MC mean estimate is
// unreliable and would make the test flaky.
test('gInc: exact value at r=0 = mean_λ exp(−λ²/2)', () => {
  const expected = (Math.exp(-0.125) + Math.exp(-0.5) + Math.exp(-2)) / 3; // ±λ pairs, ≈0.541
  assert.ok(Math.abs(gInc(0) - expected) < 1e-9, `gInc(0)=${gInc(0)} vs ${expected}`);
});

test('gInc: symmetric (±λ pairs) and bounded by the per-tick cap', () => {
  assert.ok(Math.abs(gInc(1.3) - gInc(-1.3)) < 1e-9, 'mixture is symmetric in r');
  assert.ok(gInc(1e6) <= 100, 'capped at G_CAP=100');
  assert.ok(gInc(0) < 1, 'increment at the null centre is < 1');
});

test('shardEvals: finite stats; a sustained shift grows the e-value vs a null series', () => {
  const T = 400, prefix = 40;
  const nullSeries = Array.from({ length: T }, (_, t) => Math.sin(t)); // bounded, ~null
  const faultSeries = nullSeries.map((v, t) => v + (t > 200 ? 3 : 0)); // sustained +3 shift
  const e0 = shardEvals(nullSeries, prefix);
  const e1 = shardEvals(faultSeries, prefix);
  for (const e of [e0, e1]) {
    assert.ok(Number.isFinite(e.rawPeak) && Number.isFinite(e.mixPeakAdj) && Number.isFinite(e.termE));
    assert.ok(e.rawPeak >= 0 && e.mixPeakAdj >= 0);
  }
  assert.ok(e1.mixPeakAdj > e0.mixPeakAdj, 'a sustained shift should raise the mixture e-value');
});
