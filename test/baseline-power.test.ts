// test/baseline-power.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eValueWindow, rowHonorsAlpha, ALPHA, MIN_STREAMS } from '../tools/baseline-power.js';

function lcg(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; }; }

test('eValueWindow: a long stationary baseline keeps P(fire) low (probabilistic, M1)', () => {
  // n/m = 0.1, stationary -> the guarantee should hold: fires must be rare across many trials.
  let fired = 0; const K = 200;
  for (let k = 0; k < K; k++) {
    const rng = lcg(101 + k * 7);
    const v = Array.from({ length: 2200 }, () => 1000 + 2 * rng());
    if (eValueWindow(v, 2000, 200) >= 1 / ALPHA) fired++;
  }
  assert.ok(fired / K <= 0.03, `long-baseline stationary P(fire)=${fired / K} must be ≲ α-ish, not luck of one seed`);
});

test('eValueWindow: an under-powered baseline + persistent offset yields an INFLATED e-value (M2)', () => {
  const v: number[] = [];
  for (let i = 0; i < 700; i++) v.push(i < 100 ? 1000 : 1003); // small persistent shift after a short baseline
  const flat: number[] = new Array(700).fill(1000);
  const offsetE = eValueWindow(v, 100, 600);
  assert.ok(offsetE > 1 / ALPHA, `under-powered persistent offset must inflate the e-value past 1/α; got ${offsetE}`);
  assert.ok(offsetE > eValueWindow(flat, 100, 600), 'and exceed the flat-continuation baseline');
});

test('rowHonorsAlpha: a vacuous row (too few streams) does NOT read as honoring α (M3)', () => {
  assert.equal(rowHonorsAlpha(MIN_STREAMS - 1, 0), false, 'too few streams + P(fire)=0 must NOT honor α (the vacuous-row bug)');
  assert.equal(rowHonorsAlpha(MIN_STREAMS, 0), true, 'enough streams + P(fire)=0 honors α');
  assert.equal(rowHonorsAlpha(100, 0.5), false, 'enough streams but high P(fire) does not honor α');
});
