// test/conditional-markov.test.ts — Wall A. The Assumption-3.1 diagnostic must distinguish the two
// regimes that decide whether a *conditional* fleet-FDR guarantee is earned (O5):
//   (a) the residual's temporal dependence is fully explained by the common-mode covariate X → after
//       conditioning the residual is white → Assumption 3.1 plausible → markovPlausible = true;
//   (b) the residual depends on its own past BEYOND X → conditioning does not whiten → 3.1 fails →
//       markovPlausible = false.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conditionalMarkovDiagnostic, residualizeOn, autocorr, ljungBox,
} from '../tools/conditional-markov.js';

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
function ar1(T: number, phi: number, r: () => number): number[] {
  const x = [gauss(r)]; const s = Math.sqrt(1 - phi * phi);
  for (let t = 1; t < T; t++) x.push(phi * x[t - 1] + s * gauss(r));
  return x;
}

const T = 300;

test('white residual with an unrelated covariate ⇒ Assumption 3.1 plausible', () => {
  const r = rng(1);
  const Y = Array.from({ length: T }, () => gauss(r));
  const X = Array.from({ length: T }, () => gauss(r));
  const d = conditionalMarkovDiagnostic(Y, X);
  assert.ok(Math.abs(d.condLag1) < 0.15, `white residual should have ~0 conditional lag-1; got ${d.condLag1}`);
  assert.ok(d.markovPlausible, 'white iid residual should be markov-plausible');
});

test('GOOD covariate (residual = βX + iid) ⇒ conditioning whitens ⇒ 3.1 earned', () => {
  // Y inherits ALL its temporal dependence from a nonstationary common-mode covariate X.
  const r = rng(2);
  const X = ar1(T, 0.8, r);              // autocorrelated common-mode signal
  const eps = Array.from({ length: T }, () => 0.5 * gauss(r));
  const Y = X.map((x, i) => 1.3 * x + eps[i]);
  const d = conditionalMarkovDiagnostic(Y, X);
  assert.ok(Math.abs(d.rawLag1) > 0.4, `Y should inherit X's autocorrelation (raw lag-1 high); got ${d.rawLag1}`);
  assert.ok(Math.abs(d.condLag1) < 0.15, `conditioning on X should whiten the residual; got ${d.condLag1}`);
  assert.ok(Math.abs(d.partialPastT) < 2.5, `no direct past-leakage beyond X; got t=${d.partialPastT}`);
  assert.ok(d.markovPlausible, 'a good covariate should earn Assumption 3.1');
});

test('PAST LEAKS beyond X (Y is genuinely AR(1)) ⇒ 3.1 fails', () => {
  // Y_n depends on its OWN past; the covariate X is unrelated → conditioning cannot whiten it.
  const r = rng(3);
  const Y = ar1(T, 0.7, r);
  const X = Array.from({ length: T }, () => gauss(r)); // unrelated covariate
  const d = conditionalMarkovDiagnostic(Y, X);
  assert.ok(Math.abs(d.condLag1) > 0.4, `residual should retain its own autocorrelation; got ${d.condLag1}`);
  assert.ok(Math.abs(d.partialPastT) > 3, `Y_{n-1} should predict Y_n beyond X; got t=${d.partialPastT}`);
  assert.ok(!d.markovPlausible, 'genuine AR(1) past-dependence should fail Assumption 3.1');
});

test('a POOR covariate (under-removes a heterogeneous nonstationary factor) leaves leakage ⇒ 3.1 fails', () => {
  // The classic ADR 0017 failure: the covariate is the RIGHT factor but the loading is mis-estimated,
  // so a fraction of the nonstationary factor leaks into the residual as serial structure.
  // residualizeOn re-fits β, so a perfectly collinear covariate would be fully removed. A REALISTIC
  // poor estimate is a NOISY factor signal the regression cannot fully exploit → the true factor's
  // autocorrelation leaks into the residual.
  const r = rng(4);
  const F = ar1(T, 0.85, r);                 // nonstationary common factor
  const Y = F.map((f) => 1.5 * f + 0.4 * gauss(r));
  const Xnoisy = F.map((f) => 0.5 * f + 0.8 * gauss(r)); // poor/noisy common-mode estimate
  const d = conditionalMarkovDiagnostic(Y, Xnoisy);
  assert.ok(Math.abs(d.condLag1) > 0.2, `a noisy/poor covariate should leave residual autocorrelation; got ${d.condLag1}`);
  assert.ok(!d.markovPlausible, 'a poor common-mode estimate should NOT earn Assumption 3.1');
});

test('helpers: residualizeOn recovers the slope; autocorr and Ljung–Box behave', () => {
  const X = Array.from({ length: 100 }, (_, i) => i % 7 - 3);
  const Y = X.map((x) => 2.5 * x + 4);
  const { beta, intercept, resid } = residualizeOn(Y, X);
  assert.ok(Math.abs(beta - 2.5) < 1e-6 && Math.abs(intercept - 4) < 1e-6, `slope/intercept off: ${beta},${intercept}`);
  assert.ok(resid.every((e) => Math.abs(e) < 1e-6), 'exact linear data should have ~0 residual');
  // Ljung–Box on white noise should be modest; on a strong AR(1) it should be large.
  const r = rng(9);
  const white = Array.from({ length: 300 }, () => gauss(r));
  const ar = ar1(300, 0.8, r);
  assert.ok(ljungBox(white, 5).Q < ljungBox(ar, 5).Q, 'AR(1) should have a larger Ljung–Box Q than white noise');
  assert.ok(Math.abs(autocorr(white, 1)) < 0.2 && autocorr(ar, 1) > 0.5, 'autocorr should separate white from AR(1)');
});
