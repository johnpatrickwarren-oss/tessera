// test/mixture-evalue.test.ts — the default fleet-e-BH e-value object (ADR 0019).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gInc, normalizedMixtureEValue } from '../tools/mixture-evalue.js';

test('gInc: exact at r=0, symmetric, capped', () => {
  const expected = (Math.exp(-0.125) + Math.exp(-0.5) + Math.exp(-2)) / 3; // ±λ pairs, ≈0.541
  assert.ok(Math.abs(gInc(0) - expected) < 1e-9);
  assert.ok(Math.abs(gInc(1.3) - gInc(-1.3)) < 1e-9, 'symmetric in r');
  assert.ok(gInc(1e6) <= 100, 'capped at 100');
});

test('normalizedMixtureEValue: near-zero on a bounded null, large on a sustained shift', () => {
  const T = 400;
  const nullSeries = Array.from({ length: T }, (_, t) => Math.sin(t)); // bounded ~null
  const faultSeries = nullSeries.map((v, t) => v + (t > 200 ? 3 : 0)); // sustained +3
  const e0 = normalizedMixtureEValue(nullSeries);
  const e1 = normalizedMixtureEValue(faultSeries);
  assert.ok(Number.isFinite(e0) && e0 >= 0);
  assert.ok(e1 > e0, 'a sustained shift raises the e-value');
  assert.ok(e1 > 5, `fault e-value should be clearly large; got ${e1}`);
});

test('normalizedMixtureEValue: empty series → 0', () => {
  assert.equal(normalizedMixtureEValue([]), 0);
});