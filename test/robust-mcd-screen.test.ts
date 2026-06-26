// test/robust-mcd-screen.test.ts — the Tessera-side adapter over the engine
// robust-covariance kit (tools/robust-mcd-screen.ts). Binds the screen defaults
// and the null-returning contract that the contamination-screen callers rely on
// (the prior fastMCD()===null behaviour), plus robustness to an outlier row.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  robustScreenCov,
  FASTMCD_DEFAULT_ALPHA,
  FASTMCD_DEFAULT_SEED,
} from '../tools/robust-mcd-screen';

test('screen defaults match the vendored-at-pin constants', () => {
  assert.strictEqual(FASTMCD_DEFAULT_ALPHA, 0.75);
  assert.strictEqual(FASTMCD_DEFAULT_SEED, 0xFA5DA >>> 0);
});

test('robustScreenCov returns a {mean,cov} of the right shape for well-conditioned rows', () => {
  const rows: number[][] = [];
  for (let i = 0; i < 40; i++) rows.push([(i % 7) - 3, ((i * 3) % 5) - 2]);
  const r = robustScreenCov(rows, FASTMCD_DEFAULT_ALPHA, FASTMCD_DEFAULT_SEED);
  assert.ok(r, 'expected a non-null estimate');
  assert.strictEqual(r!.mean.length, 2);
  assert.strictEqual(r!.cov.length, 2);
  assert.strictEqual(r!.cov[0].length, 2);
  assert.ok(r!.mean.every(Number.isFinite));
});

test('robustScreenCov returns null on empty input (engine RangeError → skip contract)', () => {
  assert.strictEqual(robustScreenCov([], 0.75, 1), null);
});

test('robustScreenCov returns null on ragged input', () => {
  assert.strictEqual(robustScreenCov([[1, 2], [3]], 0.75, 1), null);
});

test('robustScreenCov mean is robust to a gross outlier row', () => {
  const clean: number[][] = [];
  for (let i = 0; i < 40; i++) clean.push([(i % 7) - 3, ((i * 3) % 5) - 2]);
  const dirty = clean.map((r) => r.slice());
  dirty[39] = [1000, 1000];
  const a = robustScreenCov(clean, 0.75, FASTMCD_DEFAULT_SEED)!;
  const b = robustScreenCov(dirty, 0.75, FASTMCD_DEFAULT_SEED)!;
  // The MCD subset rejects the (1000,1000) row, so the robust mean barely moves.
  assert.ok(Math.abs(a.mean[0] - b.mean[0]) < 1, `mean[0] moved ${Math.abs(a.mean[0] - b.mean[0])} under an outlier`);
  assert.ok(Math.abs(a.mean[1] - b.mean[1]) < 1, `mean[1] moved ${Math.abs(a.mean[1] - b.mean[1])} under an outlier`);
});
