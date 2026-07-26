import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conditionalIncrementMean, plainAccumulatorPeak, pagingRate, marginTable, report, DELTA_0,
} from '../tools/a2-mixture-margin.js';
import { gInc } from '../tools/mixture-evalue.js';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';

test('m(delta) closed form: m(0) = 1 EXACTLY (A2(1)) and m > 1 strictly otherwise (A2(3))', () => {
  // Per-round validity is an identity, not an approximation — this is the whole reason A2 is about
  // accumulation and not about the per-round rank.
  assert.equal(conditionalIncrementMean(0), 1);
  for (const d of [0.05, 0.1, 0.3, 0.6, 1.0]) {
    assert.ok(conditionalIncrementMean(d) > 1, `m(${d}) must exceed 1`);
    assert.equal(conditionalIncrementMean(d), conditionalIncrementMean(-d), 'm is even in delta');
  }
  // strictly increasing in |delta|
  const ms = [0, 0.2, 0.4, 0.6].map(conditionalIncrementMean);
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i] > ms[i - 1]);
});

test('the closed form is an UPPER bound on the shipped capped increment (conservative direction)', () => {
  // gInc clips at G_CAP = 100, so the realised mean is at or below the closed form. Monte-Carlo it
  // and check the inequality holds and the gap is small where the cap rarely binds.
  const rng = mulberry32(4242);
  for (const d of [0, 0.3, 0.6]) {
    let s = 0;
    const n = 200000;
    for (let i = 0; i < n; i++) s += gInc(d + gaussian(rng));
    const mc = s / n, closed = conditionalIncrementMean(d);
    assert.ok(mc <= closed * 1.02, `MC ${mc} should not exceed closed form ${closed} (beyond noise)`);
  }
});

test('plainAccumulatorPeak is a running max: nondecreasing in the prefix', () => {
  const rng = mulberry32(7);
  const res = Array.from({ length: 200 }, () => gaussian(rng));
  let prev = 0;
  for (let t = 1; t <= res.length; t += 10) {
    const p = plainAccumulatorPeak(res.slice(0, t));
    assert.ok(p >= prev - 1e-12, 'peak must not decrease as the prefix grows');
    prev = p;
  }
});

test('pagingRate is deterministic in the seed and monotone in delta', () => {
  const a = pagingRate(0.6, 100, 0.01, 3000, 5, 'plain');
  const b = pagingRate(0.6, 100, 0.01, 3000, 5, 'plain');
  assert.equal(a, b, 'same seed must reproduce exactly');
  const lo = pagingRate(0.2, 100, 0.01, 3000, 5, 'plain');
  const hi = pagingRate(0.8, 100, 0.01, 3000, 5, 'plain');
  assert.ok(hi > lo, 'a larger persistent offset must page more often');
});

test('MAIN FINDING: the mixture attenuates strongly BELOW delta_0 and negligibly AT it', () => {
  const reps = 8000;
  // Well below delta_0: the barrier lift (log rho + the sqrt adjuster) squares an already-small
  // first-passage probability. Expect a large attenuation factor.
  const lowPlain = pagingRate(0.3, 400, 0.01, reps, 11, 'plain');
  const lowGeo = pagingRate(0.3, 400, 0.01, reps, 11, 'geometric');
  assert.ok(lowPlain > 5 * lowGeo,
    `below delta_0 the mixture should attenuate hard: plain ${lowPlain} vs geo ${lowGeo}`);

  // AT delta_0 the drift has turned; the barrier only delays the crossing, so over a long horizon
  // the two paths converge. This is the load-bearing negative result: rho is not a delta_0 substitute.
  const atPlain = pagingRate(DELTA_0, 400, 0.01, reps, 11, 'plain');
  const atGeo = pagingRate(DELTA_0, 400, 0.01, reps, 11, 'geometric');
  assert.ok(atPlain > 0.9, `plain should page almost surely at delta_0 over T=400 (got ${atPlain})`);
  assert.ok(atGeo > 0.85,
    `the mixture must NOT rescue delta_0 — it only delays (got ${atGeo}); if this drops, the ` +
    'barrier-vs-drift claim needs revisiting');
});

test('attenuation is monotone DECREASING in delta — the margin erodes as drift turns', () => {
  const reps = 8000;
  const att = (d: number) => {
    const p = pagingRate(d, 400, 0.01, reps, 11, 'plain');
    const g = pagingRate(d, 400, 0.01, reps, 11, 'geometric');
    return g > 0 ? p / g : Infinity;
  };
  const a3 = att(0.3), a6 = att(0.6), a9 = att(0.9);
  assert.ok(a3 > a6, `attenuation must fall from delta=0.3 (${a3}) to 0.6 (${a6})`);
  assert.ok(a6 > a9, `attenuation must fall from delta=0.6 (${a6}) to 0.9 (${a9})`);
  assert.ok(a9 < 2, `at delta_0 the mixture buys essentially nothing (got ${a9}x)`);
});

test('at the exact null (delta = 0) both paths respect the nominal rate', () => {
  const reps = 8000;
  const p = pagingRate(0, 400, 0.01, reps, 11, 'plain');
  const g = pagingRate(0, 400, 0.01, reps, 11, 'geometric');
  assert.ok(p <= 0.01, `plain path must honour alpha at the null (got ${p})`);
  assert.ok(g <= 0.01, `mixture path must honour alpha at the null (got ${g})`);
});

test('report() runs and returns the committed table', () => {
  const out = report(2000);
  assert.match(out, /A2 margin from the SHIPPED geometric mixture/);
  assert.match(out, /delta_0 = 0\.9128/);
  assert.equal(marginTable(2000).length, 10);
});
