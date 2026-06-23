// test/per-shard-whitening.test.ts — ACs for tools/per-shard-whitening.ts.
// See docs/SPEC-per-shard-validity-under-autocorrelation.md (AC-1..AC-4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateAr1, whiten } from '../tools/per-shard-whitening.js';

// Deterministic AR(1) sample generator (scrambled mulberry32; matches the
// calibration-envelope tool's PRNG so behavior is comparable).
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function ar1Sample(rng: () => number, rho: number, n: number): number[] {
  const innov = Math.sqrt(1 - rho * rho);
  const out: number[] = [];
  let prev = gaussian(rng);
  for (let i = 0; i < n; i++) { prev = rho * prev + innov * gaussian(rng); out.push(prev); }
  return out;
}

test('AC-2: whiten returns x_0 unchanged at stream start, innovation thereafter', () => {
  assert.equal(whiten(2.5, null, 0.8), 2.5);                 // t=0: no prior sample
  assert.equal(whiten(2.5, 1.0, 0.8), 2.5 - 0.8 * 1.0);      // t>=1: x - phi*x_prev
  assert.equal(whiten(-1.0, 2.0, 0.5), -1.0 - 0.5 * 2.0);
});

test('AC-1: estimateAr1 recovers phi on AR(1) data, with bias correction applied', () => {
  const samples = ar1Sample(mulberry32(12345), 0.7, 4000);
  const fit = estimateAr1(samples);
  assert.ok(Math.abs(fit.phi - 0.7) < 0.05, `phi=${fit.phi} not within 0.05 of 0.7`);
  assert.ok(fit.sigma2 > 0, 'innovation variance must be positive');

  // Bias correction must move phi strictly above the raw OLS estimate
  // (phi* = phi_ols + (1+3*phi_ols)/n, a positive increment for phi_ols > -1/3).
  const n = samples.length;
  let mean = 0; for (const v of samples) mean += v; mean /= n;
  let num = 0, den = 0;
  for (let i = 1; i < n; i++) num += (samples[i] - mean) * (samples[i - 1] - mean);
  for (let i = 0; i < n; i++) den += (samples[i] - mean) * (samples[i] - mean);
  const phiOls = num / den;
  assert.ok(fit.phi > phiOls, `bias-corrected phi=${fit.phi} should exceed OLS phi=${phiOls}`);
});

test('AC-3: estimateAr1 returns phi ~ 0 on iid Gaussian (whitening is near-identity)', () => {
  const samples: number[] = [];
  const rng = mulberry32(99);
  for (let i = 0; i < 4000; i++) samples.push(gaussian(rng));
  const fit = estimateAr1(samples);
  assert.ok(Math.abs(fit.phi) < 0.05, `iid phi=${fit.phi} should be within 0.05 of 0`);
});

test('AC-4: estimateAr1 is pure — does not mutate its input', () => {
  const samples = ar1Sample(mulberry32(7), 0.5, 200);
  const copy = samples.slice();
  estimateAr1(samples);
  assert.deepEqual(samples, copy);
});

test('AC-1 (edge): degenerate inputs return identity-whitening phi=0', () => {
  assert.equal(estimateAr1([]).phi, 0);
  assert.equal(estimateAr1([3.0]).phi, 0);
  assert.equal(estimateAr1([2, 2, 2, 2]).phi, 0); // zero variance
});

test('estimateAr1 clamps near-unit-root phi into the stationary region', () => {
  const samples = ar1Sample(mulberry32(555), 0.98, 2000);
  const fit = estimateAr1(samples);
  assert.ok(fit.phi < 1 && fit.phi > -1, `phi=${fit.phi} must be inside (-1, 1)`);
});
