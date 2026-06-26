// test/ui-scale-evalue.test.ts — the universal-inference SCALE-change e-value. The load-bearing property
// is validity: E[e|H0] ≤ 1 (the e-BH input contract) for ANY true scale. We also check power on a
// genuine variance increase, scale-invariance, and a few guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { universalInferenceScaleEValue } from '../tools/ui-scale-evalue.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CAL = 40, TEST = 60;
const calW = { start: 0, len: CAL }, testW = { start: CAL, len: TEST };

test('E[e|H0] ≤ 1 on white noise — and is scale-invariant', () => {
  for (const sigma of [1, 5, 50]) {
    const N = 4000;
    let sum = 0, maxE = 0;
    for (let s = 0; s < N; s++) {
      const r = rng(s * 7 + 1);
      const series = Array.from({ length: CAL + TEST }, () => sigma * gauss(r));
      const e = universalInferenceScaleEValue(series, calW, testW);
      sum += e; maxE = Math.max(maxE, e);
    }
    const mean = sum / N;
    assert.ok(mean <= 1.15, `E[e|H0] should be ≤ 1 (σ=${sigma}); got ${mean.toFixed(3)} (max ${maxE.toFixed(1)})`);
  }
});

test('fires on a genuine test-window variance increase', () => {
  const N = 300;
  let fired = 0;
  for (let s = 0; s < N; s++) {
    const r = rng(s * 13 + 5);
    const series: number[] = [];
    for (let t = 0; t < CAL; t++) series.push(gauss(r));        // cal: σ=1
    for (let t = 0; t < TEST; t++) series.push(3 * gauss(r));   // test: σ=3 (variance ×9)
    if (universalInferenceScaleEValue(series, calW, testW) >= 20) fired++;
  }
  assert.ok(fired / N >= 0.7, `should fire on a 3× scale increase; got ${(fired / N).toFixed(2)}`);
});

test('detects an impulse pair in the test window (the differenced step-fault signature)', () => {
  // The integrated path's fault signature: a level step on a random walk → onset/offset impulses in the
  // differenced series. Inject two large impulses into an otherwise-white test window.
  const N = 200;
  let fired = 0;
  for (let s = 0; s < N; s++) {
    const r = rng(s * 17 + 3);
    const series = Array.from({ length: CAL + TEST }, () => gauss(r));
    series[CAL + 15] += 12; series[CAL + 40] -= 12; // onset/offset impulses
    if (universalInferenceScaleEValue(series, calW, testW) >= 20) fired++;
  }
  assert.ok(fired / N >= 0.6, `should detect a strong impulse pair; got ${(fired / N).toFixed(2)}`);
});

test('guards short windows and non-finite values', () => {
  const ok = Array.from({ length: 20 }, (_, i) => Math.sin(i));
  assert.throws(() => universalInferenceScaleEValue(ok, { start: 0, len: 3 }, { start: 3, len: 10 }), /cal\.len/);
  assert.throws(() => universalInferenceScaleEValue(ok, { start: 0, len: 6 }, { start: 6, len: 3 }), /test\.len/);
  const bad = ok.slice(); bad[5] = NaN;
  assert.throws(() => universalInferenceScaleEValue(bad, { start: 0, len: 6 }, { start: 6, len: 6 }), /non-finite/);
});
