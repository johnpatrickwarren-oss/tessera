// test/sr-e-detector.test.ts — the VALID-increment SR e-detector (W2, 2026-07-02).
// Its increments (fixed-grid Gaussian-LR mixture, mixture-evalue.ts gInc) are genuine e-processes
// conditional on the standardized residual null, so the SRR ARL theorem — hence EOP ≤ α — holds as a
// theorem conditional on that null (the O1 metric, implemented). These tests lock the operational
// behavior: rare firing on a true null, fast firing on a sustained shift, transient sensitivity.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { srEDetector } from '../tools/e-detector.js';

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rng: () => number): number {
  let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

test('srEDetector: per-window false-alarm probability ≤ α on an iid N(0,1) null (Doob bound at threshold patience/α)', () => {
  let fires = 0;
  const REPS = 200, T = 500;
  for (let rep = 0; rep < REPS; rep++) {
    const rng = mulberry(3000 + rep);
    const r = Array.from({ length: T }, () => gauss(rng));
    if (srEDetector(r, 0.01).detectTime !== null) fires++;
  }
  // Doob: P(false alarm within the window) ≤ α = 0.01 at threshold T/α. Allow MC slack.
  assert.ok(fires / REPS <= 0.03, `null fire rate ${(fires / REPS).toFixed(3)} must be ≲ α = 0.01`);
});

test('srEDetector: fires FAST on a sustained 3σ shift (detection delay ≪ window)', () => {
  const rng = mulberry(42);
  const onset = 200;
  const r = Array.from({ length: 600 }, (_, t) => gauss(rng) + (t >= onset ? 3 : 0));
  const { detectTime } = srEDetector(r, 0.01);
  assert.ok(detectTime !== null, 'must detect');
  assert.ok(detectTime! >= onset - 1, `no pre-onset fire (fired at ${detectTime})`);
  assert.ok(detectTime! - onset <= 25, `detection delay ${detectTime! - onset} should be small even at the patience-scaled threshold`);
});

test('srEDetector: catches a TRANSIENT (onset→offset inside the window) that terminal averaging dilutes', () => {
  const rng = mulberry(7);
  // 3σ transient over [300, 360) in a 1200-tick window — ~5% duty cycle.
  const r = Array.from({ length: 1200 }, (_, t) => gauss(rng) + (t >= 300 && t < 360 ? 3 : 0));
  const { detectTime } = srEDetector(r, 0.01);
  assert.ok(detectTime !== null && detectTime >= 300 && detectTime < 380,
    `transient detected near its window (got ${detectTime})`);
});

test('srEDetector: threshold is patience/α and empty input never fires', () => {
  assert.equal(srEDetector([], 0.05, 100).threshold, 2000);
  assert.equal(srEDetector([], 0.05).detectTime, null);
});

test('ADR 0027: bounded-kind SR — per-λ recursions detect a sustained shift and hold the null under heavy tails', () => {
  // t3-ish heavy-tailed null: the bounded increments have E = 1 exactly (clipped, conditionally
  // mean-zero), so the false-alarm bound holds where the gaussian gInc's premise is broken.
  const t3 = (rng: () => number): number => {
    const z = gauss(rng); const c = gauss(rng) ** 2 + gauss(rng) ** 2 + gauss(rng) ** 2;
    return (z / Math.sqrt(c / 3)) / Math.sqrt(3);
  };
  let falses = 0; const reps = 60, T = 400;
  for (let rep = 0; rep < reps; rep++) {
    const rng = mulberry(9200 + rep);
    const r = Array.from({ length: T }, () => t3(rng));
    if (srEDetector(r, 0.05, T, 'bounded').detectTime !== null) falses++;
  }
  assert.ok(falses / reps <= 0.05 + 0.05, `bounded SR false-alarm rate ${(falses / reps).toFixed(2)} should be ≤ α(+slack) under heavy tails`);
  const rng = mulberry(77);
  const onset = 150;
  const shifted = Array.from({ length: 600 }, (_, t) => gauss(rng) + (t >= onset ? 2 : 0));
  const d = srEDetector(shifted, 0.05, 600, 'bounded');
  assert.ok(d.detectTime !== null && d.detectTime >= onset, `bounded SR should detect the shift (got ${d.detectTime})`);
});
