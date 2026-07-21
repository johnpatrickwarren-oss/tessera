import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wilson, median, fmtRate } from '../tools/canary-experiments.js';

test('wilson interval covers the point estimate and stays in [0,1]', () => {
  const { lo, hi } = wilson(5, 100);
  assert.ok(lo > 0 && hi < 1 && lo < 0.05 && hi > 0.05, `[${lo},${hi}]`);
  // extremes
  assert.deepEqual(wilson(0, 0), { lo: 0, hi: 1 });
  const z = wilson(0, 50);
  assert.equal(z.lo, 0);
  assert.ok(z.hi > 0 && z.hi < 0.15);
  const o = wilson(50, 50);
  assert.equal(o.hi, 1);
  assert.ok(o.lo > 0.85);
});

test('wilson interval narrows with n', () => {
  const a = wilson(10, 100), b = wilson(100, 1000);
  assert.ok(b.hi - b.lo < a.hi - a.lo);
});

test('median handles empty, odd, even', () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 3); // upper-median convention (floor(n/2) after sort)
  assert.equal(median([7]), 7);
});

test('fmtRate formats rate with CI and dashes on empty', () => {
  assert.equal(fmtRate(0, 0), '—');
  const s = fmtRate(1, 100);
  assert.match(s, /^0\.0100 \[0\.\d{4},0\.\d{4}\]$/);
});
