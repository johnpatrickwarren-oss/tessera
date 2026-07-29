// test/o2-robust-eprocess.test.ts — the robust Catoni construction (arXiv:2301.09573 Lemma 3).
//
// Locked: (1) φ satisfies Catoni's sandwich (14) and |φ| ≤ log 2; (2) the supermartingale
// property numerically — E[increment] ≤ 1 under the CLEAN null AND under adversarial
// contamination within the assumed ε (the theorem's whole point), with the ε = 0 denominator
// recovering non-robust Catoni; (3) mis-specified ε (ε_true > ε_assumed) BREAKS the mean bound
// — the premise is real, not decorative.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { catoniPhi, robustCatoniIncrement } from '../tools/o2-robust-eprocess.js';

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

test('catoniPhi: |φ| ≤ log 2 and the sandwich −log(1−x+x²/2) ≤ φ(x) ≤ log(1+x+x²/2)', () => {
  for (let x = -3; x <= 3; x += 0.01) {
    const p = catoniPhi(x);
    assert.ok(Math.abs(p) <= Math.LN2 + 1e-12, `|φ(${x})| > log2`);
    const upper = Math.log(1 + x + x * x / 2);
    assert.ok(p <= upper + 1e-12, `φ(${x})=${p} above upper ${upper}`);
    const inner = 1 - x + x * x / 2;
    if (inner > 0) assert.ok(p >= -Math.log(inner) - 1e-12, `φ(${x}) below lower`);
  }
  assert.equal(catoniPhi(5), Math.LN2);
  assert.equal(catoniPhi(-5), -Math.LN2);
});

test('supermartingale mean ≤ 1: clean null, and adversarial +spike contamination within assumed ε', () => {
  const r = rng(31);
  const N = 400000, lambda = 0.35, eps = 0.05;
  let clean = 0, contam = 0, nonRobustClean = 0;
  for (let i = 0; i < N; i++) {
    clean += robustCatoniIncrement(gauss(r), { sigma: 1, eps, lambda });
    // adversarial: ε_true = ε_assumed, all contamination at +∞-ish (φ caps it at log 2)
    const x = r() < eps ? 1e6 : gauss(r);
    contam += robustCatoniIncrement(x, { sigma: 1, eps, lambda });
    nonRobustClean += robustCatoniIncrement(gauss(r), { sigma: 1, eps: 0, lambda });
  }
  assert.ok(clean / N <= 1 + 0.005, `clean mean ${clean / N}`);
  assert.ok(contam / N <= 1 + 0.005, `contaminated-within-ε mean ${contam / N} — Lemma 3 violated`);
  assert.ok(nonRobustClean / N <= 1 + 0.005, `ε=0 (plain Catoni) clean mean ${nonRobustClean / N}`);
});

test('mis-specified ε breaks the bound: ε_true = 0.1 against ε_assumed = 0.01 has mean > 1', () => {
  const r = rng(47);
  const N = 200000, lambda = 0.35;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const x = r() < 0.1 ? 1e6 : gauss(r);
    sum += robustCatoniIncrement(x, { sigma: 1, eps: 0.01, lambda });
  }
  assert.ok(sum / N > 1.02, `under-assumed ε should leak (mean ${sum / N}) — if this passes, the premise is decorative`);
});
