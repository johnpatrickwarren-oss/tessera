// test/tail-probability.test.ts — A2-tail: the first-passage replacement for the α·Λ bound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { driftAt, lundbergKappa, crossProb, driftReversalDelta, fleetPageRate, driftReversalClosedForm, A0 } from '../tools/tail-probability.js';

test('δ₀ closed form tracks the numerical solve across the operating range', () => {
  assert.ok(Math.abs(driftReversalDelta(0, 30) - A0) < 0.01, 'a₀ constant must match the solve');
  for (const [th, tol] of [[0, 0.001], [0.1, 0.01], [0.12, 0.01], [0.25, 0.03], [0.42, 0.07]] as const) {
    const num = driftReversalDelta(th, 30), cf = driftReversalClosedForm(th);
    assert.ok(Math.abs(cf - num) / num <= tol, `θ=${th}: closed form ${cf} vs numerical ${num}`);
  }
});

test('δ₀ is the KELLY BREAK-EVEN shift: μ(δ₀) = 0 and μ is the log-growth rate', () => {
  assert.ok(Math.abs(driftAt(0, A0, 30).mu) < 0.01, 'drift must vanish at δ₀');
  assert.ok(driftAt(0, 0, 30).mu < -0.4, 'a centred unit is a losing bet (fixed-split dilution)');
  assert.ok(driftAt(0, 1.5, 30).mu > 0.3, 'a 1.5σ shift compounds fast');
});

test('δ₀ equals the detection floor — the identifiability result', () => {
  // canary-sim: σ_exec = √(0.010² + 0.005²). δ₀ in relative-degradation units.
  const sigmaExec = Math.sqrt(0.010 ** 2 + 0.005 ** 2);
  const pct = A0 * sigmaExec * 100;
  assert.ok(pct > 0.9 && pct < 1.2, `δ₀ should be ≈1% degradation, got ${pct}%`);
  // E2 measured the rack detection floor between 1% (4/8) and 2% (7/8) — independently.
  // If this test ever fails, either the calibrator changed or the two are no longer the same object.
});

test('the typical unit drifts AWAY from the paging threshold', () => {
  // E[log f(U)] < 0 under a uniform p — the fixed-split dilution. This is why paging is rare at all.
  assert.ok(driftAt(0, 0, 30).mu < 0, 'zero-offset drift must be negative');
  assert.ok(driftAt(0.4, 0, 30).mu < 0, 'and still negative at the population centre');
});

test('drift is increasing in the persistent offset, and reverses at δ₀', () => {
  let prev = -Infinity;
  for (const d of [-0.5, 0, 0.5, 1, 1.5]) { const m = driftAt(0.4, d, 30).mu; assert.ok(m > prev); prev = m; }
  const d0 = driftReversalDelta(0.4, 30);
  assert.ok(driftAt(0.4, d0 - 0.05, 30).mu < 0 && driftAt(0.4, d0 + 0.05, 30).mu > 0, 'δ₀ must bracket the sign change');
});

test('MAIN INVARIANT: δ₀ ≈ 1 execution-noise SD, near-independent of θ', () => {
  const ds = [0, 0.12, 0.25, 0.42].map((th) => driftReversalDelta(th, 30));
  for (const d of ds) assert.ok(d > 0.8 && d < 1.2, `δ₀ should sit near 1σ_exec, got ${ds.join(', ')}`);
  assert.ok(Math.max(...ds) / Math.min(...ds) < 1.25, 'and vary little across θ — this is what makes it a design target');
});

test('Lundberg exponent ranks the three regimes and is bounded below by 0', () => {
  const k0 = lundbergKappa(0, 0, 30);          // g < 1 ⇒ κ > 1 ⇒ page prob < α
  const kHi = lundbergKappa(0.42, 0.84, 30);   // g > 1 ⇒ κ < 1 ⇒ page prob > α
  assert.ok(k0 > 1, `centred unit should be conservative (κ=${k0} > 1)`);
  assert.ok(kHi > 0 && kHi < 1, `offset unit should be inflated but bounded (κ=${kHi})`);
  // the point of κ: per-unit page probability α^κ is bounded by 1, unlike α·Λ which is unbounded
  assert.ok(Math.pow(0.001, kHi) <= 1);
});

test('first-passage probability is monotone in T and in drift', () => {
  const p1 = crossProb(-0.2, 0.6, 7.6, 10), p2 = crossProb(-0.2, 0.6, 7.6, 320);
  assert.ok(p2 >= p1, 'more horizon cannot reduce crossing probability');
  assert.ok(crossProb(0.1, 0.6, 7.6, 320) > crossProb(-0.1, 0.6, 7.6, 320), 'positive drift crosses more');
  assert.ok(crossProb(0, 0.6, 7.6, 10) <= 1 && crossProb(5, 0.6, 7.6, 320) <= 1, 'probabilities stay in [0,1]');
});

test('the new estimate is orders of magnitude tighter than α·Λ, and matches at short T', () => {
  const rows = fleetPageRate(0.419, 30, 2016, 0.001, [10, 320]);
  // measured in A2-E1b at the same N/K/α: 0.25 pages/run at T=10
  assert.ok(rows[0].expectedPages > 0.05 && rows[0].expectedPages < 1.0,
    `T=10 prediction ${rows[0].expectedPages} should bracket the measured 0.25`);
  // and the α·Λ bound is useless by comparison (it saturates at N)
  assert.ok(rows[1].boundPages / rows[1].expectedPages > 50, 'the old bound should be ≥50× looser');
});

test('the iid control predicts essentially zero pages at every horizon', () => {
  for (const r of fleetPageRate(0, 30, 2016, 0.001, [10, 320, 1280])) {
    assert.ok(r.expectedPages < 0.05, `θ=0 must predict ≈0 pages, got ${r.expectedPages} at T=${r.T}`);
  }
});
