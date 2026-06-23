// test/shadow-replay.test.ts — ACs for the shadow-replay harness (AC-4, AC-6, AC-7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  probationaryEnd, calibrateBaseline, replayFires, scoreDataset, PHI_CLIP,
} from '../tools/shadow-replay.js';
import type { NabTrace } from '../tools/_nab-loader.js';

// A clean periodic series (period P, amplitude A) + tiny deterministic noise.
function periodic(n: number, period: number, amp: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(amp * Math.sin((2 * Math.PI * i) / period) + 0.01 * ((i * 7) % 5 - 2));
  return out;
}

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

test('AC-12: rich calibration detects a dominant period; simple does not seasonal-decompose', () => {
  const prob = periodic(360, 30, 8); // 12 periods of 30 -> detectable from this window
  const rich = calibrateBaseline(prob, 'rich');
  const simple = calibrateBaseline(prob, 'simple');
  assert.ok(rich.period > 0, `rich should detect a period; got ${rich.period}`);
  assert.equal(rich.seasonal_means.length, rich.period, 'one seasonal mean per phase');
  assert.equal(simple.period, 0, 'simple mode never seasonal-decomposes');
});

test('AC-12: rich falls back to simple (period 0) on a non-periodic series', () => {
  // Deterministic LCG pseudo-noise -> no periodic structure -> no period detected.
  let s = 12345; const prob: number[] = [];
  for (let i = 0; i < 300; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; prob.push(s / 0x7fffffff); }
  assert.equal(calibrateBaseline(prob, 'rich').period, 0);
});

test('AC-13: rich deseasonalization removes the seasonal variance (mechanism)', () => {
  const prob = periodic(360, 30, 8);
  const rich = calibrateBaseline(prob, 'rich');
  const simple = calibrateBaseline(prob, 'simple');
  // The deseasonalized residual variance is far below the raw (seasonal) variance.
  assert.ok(rich.sigma2 < simple.sigma2 * 0.5, `rich σ²=${rich.sigma2} should be << simple σ²=${simple.sigma2}`);
});

test('AC-13: rich fires no more than simple on a purely-periodic normal series', () => {
  const values = periodic(900, 30, 8); // period 30, N=900 -> detectable from the 135-pt probationary window
  const probEnd = probationaryEnd(values.length);
  const richCal = calibrateBaseline(values.slice(0, probEnd), 'rich');
  const simpleCal = calibrateBaseline(values.slice(0, probEnd), 'simple');
  const richFires = replayFires(values, probEnd, richCal, 0.05).length;
  const simpleFires = replayFires(values, probEnd, simpleCal, 0.05).length;
  assert.ok(richCal.period > 0, 'period must be detected for this to be meaningful');
  assert.ok(richFires <= simpleFires, `rich (${richFires}) must not exceed simple (${simpleFires}) on a periodic-normal signal`);
});

test('AC-12/13: replay deseasonalization is phase-correct — a PURE periodic stream fires zero times', () => {
  // No noise: the deseasonalized stream is ~0 everywhere ONLY if the replay phase
  // matches the calibration phase. A phase offset would leave residual structure
  // that could fire. So richFires===0 structurally pins the replay phase alignment.
  const pure: number[] = [];
  for (let i = 0; i < 900; i++) pure.push(8 * Math.sin((2 * Math.PI * i) / 30));
  const probEnd = probationaryEnd(pure.length);
  const richCal = calibrateBaseline(pure.slice(0, probEnd), 'rich');
  assert.ok(richCal.period > 0, 'period must be detected');
  assert.equal(replayFires(pure, probEnd, richCal, 0.01).length, 0, 'deseasonalized pure-periodic stream must not fire');
});

test('AC-6: replayFires restarts after a fire (constant series never fires; a step does)', () => {
  const cal = { mean: 0, sigma2: 1, phi: 0, innovationVar: 1, period: 0, seasonal_means: [] };
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
