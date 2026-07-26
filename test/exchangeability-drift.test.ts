// test/exchangeability-drift.test.ts — locks in the Conjecture A2 resolution.
//
// The claims under test, in order of importance:
//   1. Λ(1) = 1 EXACTLY at every θ — per-round conformal validity is unharmed by persistent
//      heterogeneity. (So A2 is not an approximate-exchangeability problem.)
//   2. Λ(T) > 1 strictly for T ≥ 2 whenever θ > 0, and Λ ≡ 1 when θ = 0. (Jensen on (★).)
//   3. The closed-form divergence threshold agrees with where the numerical δ-integral blows up.
//   4. A finite block CAPS the conditional increment mean at g_max(K), which is what keeps Λ finite.
//   5. An independent Monte-Carlo of the ACTUAL rank construction in canary-sim.ts reproduces Λ(T).
//      This is the load-bearing check: it is what ties the analysis to the shipped code rather than
//      to a convenient idealisation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gCurve, lambda, validityHorizon, divergenceThreshold, gMax, tiltCoefficient,
  calibratorWith, rankCellMeans, iccOf, thetaOfIcc, report,
} from '../tools/exchangeability-drift.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number): number => {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

test('1. per-round validity is EXACT at every θ: Λ(1) = 1', () => {
  for (const th of [0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5]) {
    for (const K of [30, 100, Infinity]) {
      const L1 = lambda(gCurve(th, K), 1);
      assert.ok(Math.abs(L1 - 1) < 2e-3, `Λ(1) should be 1 at θ=${th}, K=${K}; got ${L1}`);
    }
  }
});

test('2. Jensen: Λ(T) grows strictly for θ > 0, and is flat at θ = 0', () => {
  const flat = gCurve(0, Infinity);
  for (const T of [1, 5, 50, 500]) assert.ok(Math.abs(lambda(flat, T) - 1) < 2e-3, 'θ=0 ⇒ no drift, ever');

  for (const th of [0.05, 0.1, 0.2]) {
    const c = gCurve(th, 30);
    let prev = lambda(c, 1);
    for (const T of [2, 3, 5, 10]) {
      const L = lambda(c, T);
      assert.ok(L > prev, `Λ must increase in T (θ=${th}, T=${T})`);
      assert.ok(L > 1, 'Λ(T) > 1 strictly for T ≥ 2 when θ > 0');
      prev = L;
    }
  }
});

test('2b. the drift is monotone in θ — more heterogeneity, shorter horizon', () => {
  const hs = [0.05, 0.1, 0.15, 0.2, 0.3].map((th) => validityHorizon(gCurve(th, 30)));
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i] <= hs[i - 1], `T* must be non-increasing in θ: ${hs.join(',')}`);
  assert.ok(hs[0] > hs[hs.length - 1], 'and strictly shorter across the range');
});

test('3. closed-form divergence threshold brackets the numerical blow-up (large-block limit)', () => {
  for (const th of [0.1, 0.15, 0.2]) {
    const c = gCurve(th, Infinity);
    const tDiv = divergenceThreshold(th, 0.05);
    // finite strictly below the threshold …
    const below = lambda(c, Math.max(1, Math.floor(tDiv) - 1));
    assert.ok(Number.isFinite(below) && below < 1e8, `Λ should be finite below T_div at θ=${th}, got ${below}`);
    // … and numerically divergent a little above it
    const above = lambda(c, Math.ceil(tDiv) + 2);
    assert.ok(!Number.isFinite(above) || above > 1e8, `Λ should blow up above T_div at θ=${th}, got ${above}`);
  }
});

test('3b. T_div scales as κ_min/θ², so κ_min is a real design lever', () => {
  assert.ok(divergenceThreshold(0.1, 0.2) > 3 * divergenceThreshold(0.1, 0.05));
  // quadrupling θ should cut T_div by ~16×
  const ratio = divergenceThreshold(0.05, 0.05) / divergenceThreshold(0.2, 0.05);
  assert.ok(ratio > 8 && ratio < 12, `expected ≈ (0.2/0.05)² = 16 attenuated by the +1/(1−κ) term; got ${ratio}`);
  // and raising κ_min lengthens the measured horizon too
  assert.ok(validityHorizon(gCurve(0.1, Infinity, 0.2)) > validityHorizon(gCurve(0.1, Infinity, 0.05)));
});

test('4. a finite block caps the conditional increment mean at g_max(K)', () => {
  for (const K of [10, 30, 100]) {
    const cap = gMax(K);
    assert.ok(Math.abs(cap - rankCellMeans(K)[0]) < 1e-9, 'g_max is the r=0 rank-cell mean');
    const c = gCurve(0.3, K);
    for (const g of c.g) assert.ok(g <= cap + 1e-9, `g(δ) must not exceed g_max(${K}) = ${cap}`);
  }
  assert.ok(gMax(10) < gMax(30) && gMax(30) < gMax(1000), 'smaller blocks cap harder');
  // ⇒ smaller blocks buy a LONGER validity horizon (the min-p floor as a validity cushion)
  assert.ok(validityHorizon(gCurve(0.2, 30)) >= validityHorizon(gCurve(0.2, 100)));
  assert.ok(validityHorizon(gCurve(0.2, 100)) >= validityHorizon(gCurve(0.2, Infinity)));
});

test('5. Monte-Carlo of the SHIPPED rank construction reproduces Λ(T)', () => {
  // p = (#{peers > y} + U·(1 + #ties))/(K+1), one-sided high-is-bad — canary-sim.ts:374.
  // Rao-Blackwellised over the tie/jitter draw U (the raw increment has INFINITE variance, since
  // E[f(U)²] = ∫p^{2κ−2}dp diverges for κ < 0.5 — a plain MC of f(p) simply does not converge).
  const K = 30, theta = 0.2, T = 3, UNITS = 400_000;
  const cell = rankCellMeans(K);
  const r = rng(4242);
  let acc = 0;
  for (let u = 0; u < UNITS; u++) {
    const delta = theta * gauss(r);
    let m = 1;
    for (let t = 0; t < T; t++) {
      const y = delta + gauss(r);
      let above = 0;
      for (let j = 0; j < K; j++) if (theta * gauss(r) + gauss(r) > y) above++;
      m *= cell[above];
    }
    acc += m;
  }
  const mc = acc / UNITS;
  const analytic = lambda(gCurve(theta, K), T);
  assert.ok(Math.abs(mc - analytic) / analytic < 0.03,
    `MC of the real construction (${mc.toFixed(4)}) should match Λ(${T}) = ${analytic.toFixed(4)}`);
  assert.ok(analytic > 1.05, 'and the effect must be large enough that the agreement means something');
});

test('5b. MC also confirms the T = 1 identity against the same substrate', () => {
  const K = 30, theta = 0.3, UNITS = 300_000;
  const cell = rankCellMeans(K);
  const r = rng(99);
  let acc = 0;
  for (let u = 0; u < UNITS; u++) {
    const y = theta * gauss(r) + gauss(r);
    let above = 0;
    for (let j = 0; j < K; j++) if (theta * gauss(r) + gauss(r) > y) above++;
    acc += cell[above];
  }
  assert.ok(Math.abs(acc / UNITS - 1) < 0.01, `single-round mean must be 1, got ${acc / UNITS}`);
});

test('small-θ law Λ(T) ≈ exp(A²θ²T²/2) with A ≈ 1.99', () => {
  const A = tiltCoefficient();
  assert.ok(Math.abs(A - 1.9893) < 0.01, `tilt coefficient drifted: ${A}`);
  for (const [th, T] of [[0.02, 5], [0.02, 12], [0.05, 5]] as const) {
    const pred = Math.exp((A * A * th * th * T * T) / 2);
    const num = lambda(gCurve(th, Infinity), T);
    assert.ok(Math.abs(pred - num) / num < 0.02, `θ=${th},T=${T}: predicted ${pred}, numeric ${num}`);
  }
  // the horizon law T* ≈ 0.592/θ
  assert.ok(Math.abs(Math.sqrt(2 * Math.LN2) / A - 0.592) < 0.005);
});

test('ICC round-trip — the estimable form of θ', () => {
  for (const th of [0.02, 0.1, 0.5]) assert.ok(Math.abs(thetaOfIcc(iccOf(th)) - th) < 1e-12);
  assert.ok(Math.abs(iccOf(0.1) - 0.00990099) < 1e-6, 'θ=0.1 is a ~1% intraclass correlation');
});

test('report() runs and returns the committed table', () => {
  const { lines, data } = report();
  assert.ok(lines.length > 10);
  const rows = data.rows as Array<{ theta: number; lambda1: number; tStar30: number }>;
  assert.ok(rows.every((r) => Math.abs(r.lambda1 - 1) < 2e-3));
  assert.ok(rows.every((r) => r.tStar30 > 0));
});
