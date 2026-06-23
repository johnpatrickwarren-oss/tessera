// test/calibration-envelope.test.ts — fast unit checks on the pure helpers of
// tools/calibration-envelope.ts. The full matrix run is heavy (an on-demand
// `pnpm calibration-envelope` tool, like detector-envelope); the test suite
// exercises only the deterministic building blocks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32, scramble, gaussian, wilsonUpper, wilsonLower,
  typeIVerdict, classifyFleetSelection, runTypeICell, ar1Generator, gaussianGenerator,
} from '../tools/calibration-envelope.js';

test('mulberry32 is deterministic for a fixed seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('scramble decorrelates adjacent indices (distinct, in range)', () => {
  const s0 = scramble(0), s1 = scramble(1), s2 = scramble(2);
  assert.notEqual(s0, s1);
  assert.notEqual(s1, s2);
  for (const s of [s0, s1, s2]) assert.ok(s >= 0 && s <= 0xffffffff);
});

test('gaussian draws have ~zero mean and ~unit variance', () => {
  const rng = mulberry32(scramble(123));
  let sum = 0, sumSq = 0; const n = 20000;
  for (let i = 0; i < n; i++) { const g = gaussian(rng); sum += g; sumSq += g * g; }
  const mean = sum / n, varr = sumSq / n - mean * mean;
  assert.ok(Math.abs(mean) < 0.05, `mean=${mean}`);
  assert.ok(Math.abs(varr - 1) < 0.05, `var=${varr}`);
});

test('wilsonUpper is >= point estimate, in [0,1], and monotone in k', () => {
  const n = 4000;
  assert.equal(wilsonUpper(0, 0), 1);            // n=0 guard
  const u10 = wilsonUpper(10, n), u40 = wilsonUpper(40, n);
  assert.ok(u10 >= 10 / n && u10 <= 1);
  assert.ok(u40 > u10, 'more successes -> higher upper bound');
});

test('wilsonLower <= point estimate <= wilsonUpper, and lower is 0 at k=0', () => {
  const n = 4000, k = 40, p = k / n;
  assert.ok(wilsonLower(k, n) <= p && p <= wilsonUpper(k, n));
  assert.ok(wilsonLower(0, n) >= 0);
});

test('AC-6: typeIVerdict FAILs only when lower bound exceeds alpha (one-sided)', () => {
  assert.equal(typeIVerdict(0.02, 0.01), 'FAIL (inflated)'); // lower 2% > alpha 1%
  assert.equal(typeIVerdict(0.008, 0.01), 'PASS');           // lower below alpha
  assert.equal(typeIVerdict(0.01, 0.01), 'PASS');            // grazing == alpha -> not a violation
});

test('AC-7: classifyFleetSelection splits true/false discoveries at the K boundary', () => {
  // shards [0,K) drift; K=3, N=20. selection of {1,2,5,9} -> 2 true (1,2), 2 false (5,9).
  const r = classifyFleetSelection([1, 2, 5, 9], 3);
  assert.equal(r.trueSel, 2);
  assert.equal(r.falseSel, 2);
  assert.equal(r.fdp, 2 / 4);
  assert.equal(classifyFleetSelection([], 3).fdp, 0); // empty selection -> 0, no divide-by-zero
});

// AC-8/AC-9/AC-10: the fix actually works, asserted deterministically at small scale.
// Raw AR(0.9) must be massively inflated; whitening must restore control and keep power.
test('AC-8/9/10: whitening restores type-I control on AR(0.9) and preserves power', () => {
  const ar = ar1Generator(0.9);
  const small = { window: 120, trials: 600, powTrials: 300 };
  const raw = runTypeICell(ar, 'raw', 0.01, 1234, small);
  const whitened = runTypeICell(ar, 'whiten', 0.01, 5678, small);

  assert.ok(raw.observed_fpr > 0.3, `raw AR(0.9) FPR should be grossly inflated, got ${raw.observed_fpr}`);
  assert.equal(raw.verdict, 'FAIL (inflated)');

  assert.ok(whitened.observed_fpr < 0.05, `whitened FPR should be near alpha, got ${whitened.observed_fpr}`);
  assert.equal(whitened.verdict, 'PASS');
  assert.ok(whitened.phi !== null && whitened.phi > 0.8, `phi should track rho=0.9, got ${whitened.phi}`);
  assert.ok(whitened.power !== null && whitened.power > 0.9, `whitened power should stay high, got ${whitened.power}`);
});

test('whitening is near-identity on iid Gaussian (does not degrade the valid case)', () => {
  const g = gaussianGenerator();
  const cell = runTypeICell(g, 'raw', 0.01, 4242, { window: 120, trials: 600 });
  assert.equal(cell.verdict, 'PASS');
});
