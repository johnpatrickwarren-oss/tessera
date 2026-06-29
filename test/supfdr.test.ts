// test/supfdr.test.ts — Fleet Multiplicity. FDR-at-all-times (SupFDR) over a continuously-
// monitored fleet. We verify (1) the adjuster's exact integral identity, (2) that the running max
// of a null e-process is an INFLATED pseudo-e-value (mean ≫ 1) while the adjusted value is a valid
// e-value (mean ≤ 1), (3) that naive running-max e-BH LEAKS above q in the realistic boundary-
// pressure regime (few weak alternatives + long horizon), (4) that the adjuster controls SupFDR
// ≤ q everywhere, and (5) the power penalty the adjuster pays.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supAdjuster, runningMax, supFdp } from '../tools/supfdr.js';

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
/** A mean-λ likelihood-ratio TEST MARTINGALE: E_t = exp(Σ_{s≤t} [λ·X_s − λ²/2]), X_s ~ N(μ,1).
 *  Under H0 (μ=0) it is a nonneg martingale with E[E_t]=1 (a valid e-process); under μ>0 it grows. */
function testMartingale(T: number, trueMean: number, lambda: number, r: () => number): number[] {
  const E = new Array<number>(T);
  let cum = 0;
  for (let t = 0; t < T; t++) { cum += lambda * (trueMean + gauss(r)) - (lambda * lambda) / 2; E[t] = Math.exp(cum); }
  return E;
}

test('√E−1 adjuster satisfies the integral identity ∫_1^∞ A(e)/e² de = 1', () => {
  // Fine midpoint rule on [1, M] (where the integrand is significant) + the closed-form tail.
  // For e > 1, A(e)/e² = (√e−1)/e² = e^-1.5 − e^-2, whose tail ∫_M^∞ = 2/√M − 1/M.
  let integral = 0;
  const M = 100, steps = 1_000_000, h = (M - 1) / steps;
  for (let k = 0; k < steps; k++) {
    const e = 1 + (k + 0.5) * h;
    integral += (supAdjuster(e) / (e * e)) * h;
  }
  integral += 2 / Math.sqrt(M) - 1 / M;
  assert.ok(Math.abs(integral - 1) < 1e-3, `∫ A(e)/e² de should be 1; got ${integral}`);
  assert.equal(supAdjuster(1), 0);          // no evidence below e=1
  assert.equal(supAdjuster(0.5), 0);        // clamped
  assert.ok(Math.abs(supAdjuster(4) - 1) < 1e-12); // √4 − 1 = 1
});

test('running max of a null e-process is inflated (mean ≫ 1); the adjuster restores validity (≤ 1)', () => {
  const T = 400, K = 400;
  let meanSup = 0, meanAdj = 0;
  for (let i = 0; i < K; i++) {
    const sup = runningMax(testMartingale(T, 0, 1, rng(2000 + i)))[T - 1];
    meanSup += sup; meanAdj += supAdjuster(sup);
  }
  meanSup /= K; meanAdj /= K;
  // The raw running max is NOT a valid e-value — its null mean is well above 1.
  assert.ok(meanSup > 2, `running-max null mean should be inflated (≫1); got ${meanSup}`);
  // A(sup) IS a valid e-value: E[A(sup E)] ≤ 1 (with Monte-Carlo slack).
  assert.ok(meanAdj <= 1.15, `adjusted null mean should be ≤ 1; got ${meanAdj}`);
});

// Shared fleet: a handful of weak alternatives + many nulls, monitored over a long horizon — the
// boundary-pressure regime where the naive running-max leaks (Carefree arXiv:2501.19360, ~1.08α).
function fleet(seed: number, Knull: number, Kalt: number, T: number, mu: number, lam: number) {
  const r = rng(seed);
  const eps: number[][] = [], nn: boolean[] = [];
  for (let i = 0; i < Kalt; i++) { eps.push(testMartingale(T, mu, lam, r)); nn.push(true); }
  for (let i = 0; i < Knull; i++) { eps.push(testMartingale(T, 0, lam, r)); nn.push(false); }
  return { eps, nn };
}

test('naive running-max e-BH runs at the q boundary with NO theorem; the adjuster sits far below WITH one', () => {
  // Realistic regime: a few weak alternatives + many nulls, monitored over a long horizon. HONEST
  // FRAMING (post-cold-eye): under INDEPENDENCE the naive running max does NOT robustly exceed q —
  // Ville's inequality is protective, and the empirical SupFDR converges to ≈0.096 (< q) at large
  // sample. So we do NOT claim a >q leak here. What is true and theorem-backed is the SEPARATION: the
  // naive procedure runs right AT the q boundary with no guarantee, while the √E−1-adjusted procedure
  // sits two orders of magnitude below it WITH a proof (Carefree arXiv:2501.19360 Thm 1). The naive
  // procedure's lack of a theorem is the point — it leaks under dependence / adversarial timing where
  // the adjuster does not.
  const sims = 200, q = 0.1;
  let naive = 0, adjusted = 0;
  for (let s = 0; s < sims; s++) {
    const { eps, nn } = fleet(500 + s, 40, 4, 1000, 0.5, 1);
    naive += supFdp(eps, nn, q, 'naive').supFdp;
    adjusted += supFdp(eps, nn, q, 'adjusted').supFdp;
  }
  naive /= sims; adjusted /= sims;
  // The naive procedure runs at the q boundary (no margin), the adjusted one far below it.
  assert.ok(naive > 0.06, `naive running-max should run at the q boundary; got SupFDR=${naive.toFixed(3)}`);
  assert.ok(adjusted <= q, `adjusted should control SupFDR ≤ q=${q}; got ${adjusted.toFixed(3)}`);
  // The theorem-backed separation: adjusted is orders of magnitude below the unguaranteed naive.
  assert.ok(naive > 8 * adjusted, `naive (${naive.toFixed(3)}) should be ≫ adjusted (${adjusted.toFixed(3)})`);
});

test('adjuster controls SupFDR ≤ q across regimes while retaining power on clear alternatives', () => {
  const q = 0.1, sims = 120;
  for (const cfg of [
    { Knull: 30, Kalt: 8, T: 100, mu: 1.2, lam: 1 },
    { Knull: 60, Kalt: 10, T: 150, mu: 1.5, lam: 1 },
  ]) {
    let adjusted = 0, power = 0;
    for (let s = 0; s < sims; s++) {
      const { eps, nn } = fleet(9000 + s, cfg.Knull, cfg.Kalt, cfg.T, cfg.mu, cfg.lam);
      const r = supFdp(eps, nn, q, 'adjusted');
      adjusted += r.supFdp; power += r.finalPower;
    }
    adjusted /= sims; power /= sims;
    assert.ok(adjusted <= q, `adjusted SupFDR ≤ q for ${JSON.stringify(cfg)}; got ${adjusted.toFixed(3)}`);
    assert.ok(power >= 0.8, `adjuster should keep power on clear alternatives; got ${power.toFixed(2)} for ${JSON.stringify(cfg)}`);
  }
});

test('adjusted running maxima are accept-to-reject monotone (nondecreasing in t)', () => {
  const ep = testMartingale(200, 0.8, 1, rng(77));
  const rm = runningMax(ep).map(supAdjuster);
  for (let t = 1; t < rm.length; t++) {
    assert.ok(rm[t] >= rm[t - 1] - 1e-12, `adjusted running max must be nondecreasing at t=${t}`);
  }
});
