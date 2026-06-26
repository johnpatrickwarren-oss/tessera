// test/gaussian-lr-evalue.test.ts — the self-contained Gaussian-LR mean-shift e-value
// + closed-form null survival (tools/gaussian-lr-evalue.ts) used for the conditional-
// calibration boosting experiment. Asserts the e-value validity bound and the survival
// (deterministic), plus a light Monte-Carlo consistency check. The null MEAN is genuinely
// heavy-tailed (a≈0.48), so E[e|H0] is MC-unstable — we assert the survival/Ville bound
// (P(e≥x)≤1/x), which is the property the FDR path actually relies on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gaussianLrEValue,
  gaussianLrNullSurvival,
  normalCdf,
  DEFAULT_EFFECT_PRIOR_VAR,
} from '../tools/gaussian-lr-evalue';

test('normalCdf: standard reference points', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-3);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
  assert.ok(Math.abs(normalCdf(-1.96) - 0.025) < 1e-3);
});

test('null survival: monotone, ≤1, and respects the Ville/Markov bound S(x) ≤ 1/x', () => {
  const S = gaussianLrNullSurvival();
  const floor = Math.pow(1 + DEFAULT_EFFECT_PRIOR_VAR, -0.5);
  assert.strictEqual(S(floor * 0.99), 1, 'below the e-value floor the survival is 1');
  let prev = 1;
  for (const x of [2, 5, 10, 20, 100, 1000]) {
    const s = S(x);
    assert.ok(s >= 0 && s <= 1, `S(${x})=${s} in [0,1]`);
    assert.ok(s <= 1 / x + 1e-12, `S(${x})=${s} must respect the e-value bound 1/x=${1 / x}`);
    assert.ok(s <= prev, `survival monotone non-increasing at x=${x}`);
    prev = s;
  }
  // At the 1/q = 20 threshold the survival is ≤ q = 0.05 (the FP guarantee).
  assert.ok(S(20) <= 0.05, `S(20)=${S(20)} ≤ 0.05`);
});

test('e-value: ~floor with no shift, large under a clear mean shift', () => {
  const floor = Math.pow(1 + DEFAULT_EFFECT_PRIOR_VAR, -0.5);
  // No shift: cal and test share the same distribution → e near the floor (< 1).
  let s = 7; const rnd = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  const g = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const flat = Array.from({ length: 200 }, () => g());
  const eFlat = gaussianLrEValue(flat, { start: 0, len: 100 }, { start: 100, len: 100 });
  assert.ok(eFlat >= floor && eFlat < 5, `no-shift e-value ${eFlat} near floor ${floor.toFixed(3)}`);
  // Clear +4σ shift in the test window → very large e.
  const shifted = flat.map((x, i) => (i >= 100 ? x + 4 : x));
  const eShift = gaussianLrEValue(shifted, { start: 0, len: 100 }, { start: 100, len: 100 });
  assert.ok(eShift > 1e3, `+4σ shift e-value ${eShift} should be ≫ 1`);
});

test('survival matches the empirical null tail (light Monte-Carlo consistency)', () => {
  const S = gaussianLrNullSurvival();
  let s = 42; const rnd = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  const g = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 6000;
  let ge3 = 0;
  for (let t = 0; t < N; t++) {
    const r = Array.from({ length: 200 }, () => g());
    if (gaussianLrEValue(r, { start: 0, len: 100 }, { start: 100, len: 100 }) >= 3) ge3++;
  }
  const emp = ge3 / N;
  // The exact survival should be in the right ballpark (and conservative ≥ empirical is fine).
  assert.ok(Math.abs(emp - S(3)) < 0.05, `empirical P(e≥3)=${emp.toFixed(4)} vs S(3)=${S(3).toFixed(4)}`);
});
