// test/shadow-replay.test.ts — ACs for the shadow-replay harness (AC-4, AC-6, AC-7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  probationaryEnd, calibrateBaseline, replayFires, scoreDataset, PHI_CLIP,
} from '../tools/shadow-replay.js';
import type { NabTrace } from '../tools/_nab-loader.js';

test('AC-4: probationaryEnd = first 15%, capped at 5000', () => {
  assert.equal(probationaryEnd(1000), 150);
  assert.equal(probationaryEnd(100000), 5000); // cap
});

test('AC-4: calibrateBaseline clips phi to engine parity + derives innovation variance', () => {
  // Strongly autocorrelated ramp-ish series -> phi estimate would exceed 0.95 -> clipped.
  const vals: number[] = [];
  let prev = 0;
  for (let i = 0; i < 500; i++) { prev = 0.99 * prev + 0.1 * Math.sin(i); vals.push(prev); }
  const cal = calibrateBaseline(vals);
  assert.ok(cal.phi <= PHI_CLIP && cal.phi >= -PHI_CLIP, `phi=${cal.phi} must be within clip`);
  // innovation variance = sigma^2 * (1 - phi^2), and < marginal sigma^2 for phi != 0
  assert.ok(cal.innovationVar <= cal.sigma2 + 1e-9);
  assert.ok(Math.abs(cal.innovationVar - cal.sigma2 * (1 - cal.phi * cal.phi)) < 1e-6);
});

test('AC-7: scoreDataset splits in-window detections from scored-normal false positives', () => {
  // 10 rows, ts = 0..9; probEnd=2 (rows 0,1 probationary). Window covers ts 5..6.
  const trace: NabTrace = {
    dataset_key: 'unit/test.csv',
    values: Array.from({ length: 10 }, (_, i) => i),
    ts_epoch_ms: Array.from({ length: 10 }, (_, i) => i),
    is_anomaly: Array.from({ length: 10 }, (_, i) => i === 5 || i === 6),
    windows: [[5, 6]],
  };
  // Fires: idx 3 (scored-normal -> FP), idx 5 (in-window -> detection, latency 5-5=0).
  const r = scoreDataset(trace, 2, [3, 5], 0.01);
  assert.equal(r.fp_fires, 1, 'fire at idx 3 is a false positive');
  assert.equal(r.windows_scored, 1);
  assert.equal(r.windows_detected, 1);
  assert.deepEqual(r.latencies_samples, [0], 'fire at window-start idx 5 -> latency 0');
  // scored-normal points = rows 2,3,4,7,8,9 (exclude probationary 0,1 and anomaly 5,6) = 6
  assert.equal(r.scored_normal_points, 6);
});

test('AC-7: a window with no in-window fire is scored-but-undetected', () => {
  const trace: NabTrace = {
    dataset_key: 'unit/test.csv',
    values: [0, 0, 0, 0, 0, 0],
    ts_epoch_ms: [0, 1, 2, 3, 4, 5],
    is_anomaly: [false, false, false, false, true, true],
    windows: [[4, 5]],
  };
  const r = scoreDataset(trace, 1, [2], 0.01); // fire at idx 2 = scored-normal FP
  assert.equal(r.windows_scored, 1);
  assert.equal(r.windows_detected, 0);
  assert.equal(r.fp_fires, 1);
  assert.deepEqual(r.latencies_samples, []);
});

test('AC-6: replayFires restarts after a fire (constant series never fires; a step does)', () => {
  const cal = { mean: 0, sigma2: 1, phi: 0, innovationVar: 1 };
  // Constant-at-mean series: z=0 every tick -> wealth never grows -> no fire.
  const flat = new Array(300).fill(0);
  assert.deepEqual(replayFires(flat, 0, cal, 0.01), []);
  // Sustained large shift -> fires repeatedly BECAUSE the restart resets wealth to 1
  // after each fire (a non-restarting detector would fire once and stay latched).
  const shifted = new Array(2000).fill(5);
  assert.ok(replayFires(shifted, 0, cal, 0.01).length >= 2, 'restart must allow re-firing on sustained elevation');
});

test('AC-7: a window entirely inside the probationary region is not scored', () => {
  const trace: NabTrace = {
    dataset_key: 'unit/test.csv',
    values: [0, 0, 0, 0, 0, 0],
    ts_epoch_ms: [0, 1, 2, 3, 4, 5],
    is_anomaly: [true, true, false, false, false, false],
    windows: [[0, 1]], // both rows in probationary (probEnd=3) -> firstIdx < 0 -> skipped
  };
  const r = scoreDataset(trace, 3, [], 0.01);
  assert.equal(r.windows_scored, 0, 'a window with no scored row is excluded, not counted as missed');
  assert.equal(r.windows_detected, 0);
});
