// test/q04-welford-stats.test.ts — R04 AC-1 through AC-11.
//
// Binds the SLICE 2b2 Welford online statistics module at
// engine/per-shard/welford.ts. Eleven test cases; each maps to one R04 AC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WelfordState,
  initialWelfordState,
  updateWelford,
  welfordMean,
  welfordCovariance,
} from '../engine/per-shard/welford';

// Naive two-pass reference for cross-checking Welford (sample covariance, n−1 divisor).
// Kept inline (not in test/_substrate/) because it is q04-specific and serves the
// right-reasons audit goal of preventing self-confirming tests against the Welford
// implementation itself.
function naiveMean(samples: number[][]): number[] {
  const d = samples[0].length;
  const n = samples.length;
  const sum = new Array(d).fill(0);
  for (const s of samples) for (let i = 0; i < d; i++) sum[i] += s[i];
  return sum.map(v => v / n);
}
function naiveSampleCovariance(samples: number[][]): number[][] {
  const d = samples[0].length;
  const n = samples.length;
  const mean = naiveMean(samples);
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const s of samples) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += (s[i] - mean[i]) * (s[j] - mean[j]);
      }
    }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= (n - 1);
  return cov;
}
function welfordOf(samples: number[][]): WelfordState {
  let s = initialWelfordState(samples[0].length);
  for (const x of samples) s = updateWelford(s, x);
  return s;
}
function maxAbs(a: number[][], b: number[][]): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      const e = Math.abs(a[i][j] - b[i][j]);
      if (e > m) m = e;
    }
  }
  return m;
}

test('R04 AC-1 — initialWelfordState(d) returns zero-mean + zero-M2 of correct shape', () => {
  const s = initialWelfordState(3);
  assert.strictEqual(s.n, 0);
  assert.deepStrictEqual(s.mean, [0, 0, 0]);
  assert.deepStrictEqual(s.m2, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

test('R04 AC-2 — updateWelford first-sample (n=0 → n=1) sets mean=sample, m2=zeros', () => {
  const s0 = initialWelfordState(2);
  const s1 = updateWelford(s0, [5, 7]);
  assert.strictEqual(s1.n, 1);
  assert.deepStrictEqual(s1.mean, [5, 7]);
  // At n=1, M2 contribution is (x − 0)(x − x) = 0 component-wise; m2 stays zeros.
  assert.deepStrictEqual(s1.m2, [[0, 0], [0, 0]]);
});

test('R04 AC-3 — updateWelford second-sample (n=1 → n=2) averages two samples', () => {
  let s = initialWelfordState(2);
  s = updateWelford(s, [0, 0]);
  s = updateWelford(s, [2, 4]);
  assert.strictEqual(s.n, 2);
  assert.deepStrictEqual(s.mean, [1, 2]);
  // For two samples (0,0) and (2,4): centered = [(−1,−2), (1,2)]; M2 = [[2,4],[4,8]].
  assert.deepStrictEqual(s.m2, [[2, 4], [4, 8]]);
});

test('R04 AC-4 — Welford mean equals naive mean for n=10 samples', () => {
  const samples: number[][] = [
    [1.0, 2.0], [1.5, 2.5], [2.0, 3.0], [2.5, 3.5], [3.0, 4.0],
    [3.5, 4.5], [4.0, 5.0], [4.5, 5.5], [5.0, 6.0], [5.5, 6.5],
  ];
  const w = welfordOf(samples);
  const expected = naiveMean(samples);
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(w.mean[i] - expected[i]) < 1e-12, `mean[${i}]: ${w.mean[i]} vs ${expected[i]}`);
  }
});

test('R04 AC-5 — Welford sample covariance equals naive two-pass for n=20 samples', () => {
  const samples: number[][] = [];
  for (let i = 0; i < 20; i++) {
    samples.push([
      Math.sin(i),
      Math.cos(i),
      Math.sin(i) + Math.cos(i),
    ]);
  }
  const w = welfordOf(samples);
  const cov = welfordCovariance(w);
  assert.notStrictEqual(cov, null);
  const expected = naiveSampleCovariance(samples);
  const err = maxAbs(cov!, expected);
  assert.ok(err < 1e-10, `max-abs error ${err} >= 1e-10`);
});

test('R04 AC-6 — Welford is numerically stable vs naive two-pass on shifted data', () => {
  // Samples around 1e8 with O(1) noise — naive two-pass catastrophically loses
  // precision in this regime; Welford preserves it.
  const SHIFT = 1e8;
  const samples: number[][] = [];
  for (let i = 0; i < 50; i++) {
    samples.push([SHIFT + Math.sin(i), SHIFT + Math.cos(i)]);
  }
  const w = welfordOf(samples);
  const wCov = welfordCovariance(w);
  assert.notStrictEqual(wCov, null);
  // Reference: subtract SHIFT from samples (perfect re-centering), naive on
  // re-centered data is numerically clean. Welford on shifted data should
  // closely match this reference.
  const reCentered = samples.map(s => [s[0] - SHIFT, s[1] - SHIFT]);
  const refCov = naiveSampleCovariance(reCentered);
  const err = maxAbs(wCov!, refCov);
  // The numerical-stability claim: Welford error << 1.0 in this regime; naive
  // two-pass error in this regime is typically O(SHIFT² × eps_machine) ≈ O(1)
  // or worse for double-precision. We assert Welford << 1.0; we do NOT assert
  // naive's failure (no naive comparison here — that would add complexity for
  // a property that is well-documented in Welford's literature).
  assert.ok(err < 1e-4, `Welford max-abs error ${err} >= 1e-4 on shifted data`);
});

test('R04 AC-7 — welfordCovariance returns null for n < 2', () => {
  assert.strictEqual(welfordCovariance(initialWelfordState(3)), null);
  const s1 = updateWelford(initialWelfordState(3), [1, 2, 3]);
  assert.strictEqual(welfordCovariance(s1), null);
});

test('R04 AC-8 — welfordCovariance divides by (n−1) for n=10', () => {
  // For 10 samples of identity-ish data: variance = sum((x−mean)²) / 9, not / 10.
  // Construct samples [0..9] in a single dimension; mean = 4.5; sum((x−4.5)²) = 82.5.
  // Sample variance = 82.5 / 9 ≈ 9.1666... NOT 82.5 / 10 = 8.25.
  const samples: number[][] = [];
  for (let i = 0; i < 10; i++) samples.push([i]);
  const w = welfordOf(samples);
  const cov = welfordCovariance(w);
  assert.notStrictEqual(cov, null);
  // Expect 82.5 / 9 ≈ 9.166666...
  assert.ok(Math.abs(cov![0][0] - (82.5 / 9)) < 1e-10, `expected 82.5/9, got ${cov![0][0]}`);
  // Sanity that population convention is NOT used: would give 82.5 / 10 = 8.25.
  assert.ok(Math.abs(cov![0][0] - 8.25) > 0.5, 'covariance must NOT equal population variance 8.25');
});

test('R04 AC-9 — welfordMean returns the running mean as a defensive copy', () => {
  const s = updateWelford(initialWelfordState(2), [3, 5]);
  const m = welfordMean(s);
  assert.deepStrictEqual(m, [3, 5]);
  // Mutate the returned array; state's internal mean must be unaffected.
  m[0] = 999;
  assert.strictEqual(s.mean[0], 3);
});

test('R04 AC-10 — updateWelford throws on dimension-mismatch', () => {
  const s = initialWelfordState(3);
  assert.throws(() => updateWelford(s, [1, 2]), /dimension mismatch/);
  assert.throws(() => updateWelford(s, [1, 2, 3, 4]), /dimension mismatch/);
  assert.throws(() => updateWelford(s, []), /dimension mismatch/);
});

test('R04 AC-11 — updateWelford does not mutate input state', () => {
  const s0 = initialWelfordState(2);
  // Capture snapshot BEFORE any updateWelford call — captures first-call mutations.
  const snapshot0 = JSON.stringify(s0);
  const s1 = updateWelford(s0, [1, 2]);
  // First-call mutation check: s0 unchanged after first updateWelford.
  assert.strictEqual(JSON.stringify(s0), snapshot0);
  // Run a second update from s0 (the original) — must not mutate s0 OR s1.
  updateWelford(s0, [10, 20]);
  // Second-call mutation check: s0 still unchanged.
  assert.strictEqual(JSON.stringify(s0), snapshot0);
  // s1 must also not be mutated by the second update on s0 (catches shared-
  // reference bugs between s1's internal arrays and s0's internal arrays).
  assert.strictEqual(s1.n, 1);
  assert.deepStrictEqual(s1.mean, [1, 2]);
});
