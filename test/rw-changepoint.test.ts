// test/rw-changepoint.test.ts — the random-walk (I(1)) changepoint detector for a sustained LEVEL step.
// The construction is sound and BOUNDED: E[e|H0] ≈ 1 on Gaussian I(1) and stays bounded on heavy-tailed
// (t) I(1) where an unclipped betting e-value would explode; ROC-matched it detects super-threshold steps
// and degrades gracefully as the step approaches the random walk's own local wander.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rwChangepointEValue, levelContrasts } from '../tools/rw-changepoint.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r: () => number): number { const u = Math.max(r(), 1e-12), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function tDraw(r: () => number, nu: number): number { let w = 0; for (let k = 0; k < nu; k++) { const z = gauss(r); w += z * z; } return gauss(r) / Math.sqrt(w / nu); }
function walk(T: number, r: () => number, innov: (r: () => number) => number): number[] { const y = [0]; for (let t = 1; t < T; t++) y.push(y[t - 1] + innov(r)); return y; }
function inject(y: number[], on: number, off: number, d: number): number[] { const a = y.slice(); for (let t = on; t < off; t++) a[t] += d; return a; }
function quantile(xs: number[], q: number): number { return xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))]; }

test('E[e|H0] ≈ 1 and BOUNDED on Gaussian I(1)', () => {
  const N = 2000; let sum = 0, maxE = 0;
  for (let s = 0; s < N; s++) { const e = rwChangepointEValue(walk(240, rng(s + 1), gauss), { window: 15 }); sum += e; maxE = Math.max(maxE, e); }
  assert.ok(sum / N <= 1.2, `E[e|H0] should be ≈1 on Gaussian I(1); got ${(sum / N).toFixed(3)}`);
  assert.ok(maxE < 20, `e should be bounded (clipped); got max ${maxE.toFixed(1)}`);
});

test('stays BOUNDED on heavy-tailed t(3) I(1) — the clip prevents the explosion', () => {
  const N = 2000; let sum = 0, maxE = 0;
  for (let s = 0; s < N; s++) { const e = rwChangepointEValue(walk(240, rng(s + 5), (r) => tDraw(r, 3)), { window: 15 }); sum += e; maxE = Math.max(maxE, e); }
  assert.ok(sum / N <= 1.5, `E[e|H0] should stay near 1 on t(3) I(1); got ${(sum / N).toFixed(3)}`);
  assert.ok(maxE < 50, `e must stay bounded on heavy tails; got max ${maxE.toFixed(1)}`);
});

test('ROC-matched: detects a super-threshold step, degrades to sub-threshold', () => {
  const N = 120;
  const recallAt = (step: number) => {
    const hn: number[] = [], fn: number[] = [];
    for (let i = 0; i < N; i++) {
      hn.push(rwChangepointEValue(walk(240, rng(i + 1), gauss), { window: 15 }));
      fn.push(rwChangepointEValue(inject(walk(240, rng(i + 1), gauss), 90, 140, step), { window: 15 }));
    }
    const thr = quantile(hn, 0.95);
    return fn.filter((v) => v >= thr).length / N;
  };
  assert.ok(recallAt(25) >= 0.8, `should detect a super-threshold step (25σ); got ${recallAt(25).toFixed(2)}`);
  assert.ok(recallAt(6) <= 0.3, `a sub-threshold step (6σ, < random-walk wander) should mostly evade; got ${recallAt(6).toFixed(2)}`);
});

test('levelContrasts computes the windowed post−pre mean; guards a too-short series', () => {
  const ramp = Array.from({ length: 60 }, (_, t) => (t >= 30 ? 10 : 0)); // a clean level step at t=30
  const c = levelContrasts(ramp, 10, 10, 1);
  assert.ok(Math.max(...c) > 5, 'the contrast should peak at the step');
  assert.equal(rwChangepointEValue([1, 2, 3], { window: 15 }), 0); // too short → no candidates → 0
});
