// test/adaptive-tradeoff.test.ts — the synthetic sweep helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ar1Ramp, ONSET, N, RHO } from '../tools/adaptive-tradeoff.js';

test('ar1Ramp: flat (slope 0) before AND after onset has no trend; slope>0 ramps only after onset', () => {
  // determinism: same seed -> same series
  const mk = () => { let s = 999; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };
  const flat = ar1Ramp(mk(), 0);
  assert.equal(flat.length, N);
  // slope 0: the post-onset mean should be ~ pre-onset mean (no ramp added)
  const preMean = flat.slice(100, ONSET).reduce((a, b) => a + b, 0) / (ONSET - 100);
  const postMean = flat.slice(ONSET, N).reduce((a, b) => a + b, 0) / (N - ONSET);
  assert.ok(Math.abs(preMean - postMean) < 1.0, `slope0 pre/post means should be close (${preMean} vs ${postMean})`);

  const ramped = ar1Ramp(mk(), 0.3);
  // pre-onset identical to flat (same noise stream, no ramp yet)
  assert.equal(ramped[ONSET - 1], flat[ONSET - 1]);
  // post-onset strongly elevated (slope 0.3 over (N-ONSET) steps -> large)
  const rPost = ramped.slice(N - 50).reduce((a, b) => a + b, 0) / 50;
  assert.ok(rPost > 50, `ramped tail should be far above baseline; got ${rPost}`);
  assert.ok(RHO > 0 && RHO < 1);
});
