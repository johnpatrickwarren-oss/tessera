// test/lifecycle-monitor.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monitorLifecycle, monitorStatic, genDrift, genFault, genSlowFault, M0, ALPHA } from '../tools/lifecycle-monitor.js';
import { replayFiresAdaptive } from '../tools/adaptive-baseline.js';
import { mulberry32, scramble } from '../tools/calibration-envelope.js';

// IMPORTANT: gens call gaussian(rng), which needs a [0,1) uniform. Use mulberry32 (NOT a [-0.5,0.5]
// lcg, which gaussian's Box-Muller clamps to a spike — the C3 corruption).
const rng = (seed: number) => mulberry32(scramble(seed));
const FAULT_AT = 1200; // matches lifecycle-monitor's synthetic fault onset

test('on slow drift, the lifecycle re-records and raises FEWER alarms than a static baseline', () => {
  const v = genDrift(rng(101), 0.02);
  const life = monitorLifecycle(v, M0, ALPHA);
  const stat = monitorStatic(v, M0, ALPHA);
  assert.ok(life.reRecords > 0, 'sustained drift alarms must trigger at least one re-record');
  assert.ok(life.alarms.length < stat.length, `lifecycle alarms (${life.alarms.length}) must be fewer than static (${stat.length})`);
});

test('on a sharp fault, the lifecycle still detects it (first alarm precedes the rate trigger)', () => {
  const v = genFault(rng(202));
  const life = monitorLifecycle(v, M0, ALPHA);
  assert.ok(life.alarms.some((a) => a >= FAULT_AT && a < FAULT_AT + 200), 'the sharp fault must raise an alarm near onset');
});

test('monitorStatic never re-records (rateThresh = Infinity)', () => {
  const v = genDrift(rng(303), 0.02);
  assert.equal(monitorLifecycle(v, M0, ALPHA, { rateThresh: Infinity }).reRecords, 0, 'rateThresh Infinity must never re-record');
});

test('THE NEEDLE: on a slow fault, the lifecycle detects far more than adaptive (which masks)', () => {
  // slope 0.004 is inside adaptive's masking zone (ADR 0006). Many trials: lifecycle ≫ adaptive.
  const K = 80, slope = 0.004;
  const det = (fn: (v: number[]) => number[]) => {
    let d = 0;
    for (let s = 0; s < K; s++) {
      const v = genSlowFault(rng(900 + s * 7), slope);
      if (fn(v).some((a) => a >= FAULT_AT)) d++;
    }
    return d / K;
  };
  const lifecycle = det((v) => monitorLifecycle(v, M0, ALPHA).alarms);
  const adaptive = det((v) => replayFiresAdaptive(v, M0, ALPHA));
  assert.ok(lifecycle > adaptive + 0.2, `lifecycle slow-fault detection (${lifecycle}) must clearly beat adaptive (${adaptive})`);
});
