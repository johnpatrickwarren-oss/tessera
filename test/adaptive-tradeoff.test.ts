// test/adaptive-tradeoff.test.ts — the synthetic sweep helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ar1Ramp, ONSET, N, RHO } from '../tools/adaptive-tradeoff.js';
import { replayFires, calibrateBaseline, probationaryEnd } from '../tools/shadow-replay.js';
import { replayFiresAdaptive } from '../tools/adaptive-baseline.js';

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
  // pre-onset identical to flat (same noise stream, no ramp yet) — FULL slice (M1)
  assert.deepEqual(ramped.slice(0, ONSET), flat.slice(0, ONSET));
  // post-onset strongly elevated (slope 0.3 over (N-ONSET) steps -> large)
  const rPost = ramped.slice(N - 50).reduce((a, b) => a + b, 0) / 50;
  assert.ok(rPost > 50, `ramped tail should be far above baseline; got ${rPost}`);
  assert.ok(RHO > 0 && RHO < 1);
});

test('masking direction (L2): on a SLOW ramp, adaptive detects fewer in-horizon fires than static', () => {
  // 300 flat + a slow ramp (slope 0.005 < ~0.01 threshold) over the rest.
  const onset = 300, total = 1200;
  const v: number[] = [];
  for (let i = 0; i < total; i++) v.push(i < onset ? 0.01 * (i % 3) : 0.005 * (i - onset) + 0.01 * (i % 3));
  const probEnd = probationaryEnd(total);
  const cal = calibrateBaseline(v.slice(0, probEnd), 'simple');
  const staticAfter = replayFires(v, probEnd, cal, 0.01).filter((f) => f >= onset).length;
  const adaptiveAfter = replayFiresAdaptive(v, probEnd, 0.01, { window: 300, recalEvery: 50 }).filter((f) => f >= onset).length;
  assert.ok(staticAfter > 0, `static must fire on the slow ramp; got ${staticAfter}`);
  assert.ok(adaptiveAfter < staticAfter, `adaptive (${adaptiveAfter}) must mask vs static (${staticAfter}) on a slow ramp`);
});
