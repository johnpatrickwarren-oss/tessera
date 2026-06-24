// test/seasonal-power.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatFires, seasonalFiresFixed, seasonalFiresAuto } from '../tools/seasonal-power.js';

function lcg(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; }; }

test('fixed-period seasonal baseline does NOT fire where a flat baseline DOES, on a seasonal stream', () => {
  // Asymmetric seasonal spike: +A for the first 1/6 of each period (low baseline variance, large
  // deviation → high z). Test window sits in the spike phase, so a flat baseline sees a persistent
  // offset and fires (first-crossing); the fixed-period seasonal removes the phase mean → no fire.
  const P = 288, base = 1000, A = 80, hi = 48;
  const rng = lcg(2024);
  const m = P * 6, n = hi; // 6 full periods; test [m, m+hi) = the high-spike phase
  const v: number[] = [];
  for (let t = 0; t < m + n; t++) v.push(base + ((t % P) < hi ? A : 0) + 2 * rng());
  assert.equal(flatFires(v, m, n), true, 'flat baseline must fire on the persistent spike-phase offset');
  assert.equal(seasonalFiresFixed(v, m, n, P), false, 'fixed-period seasonal must NOT fire (phase offset removed)');
});

test('ACF auto detects a period on a clearly periodic stream; period 0 (-> flat) on white noise', () => {
  const P = 60, base = 1000, A = 40;
  const rngP = lcg(99);
  const periodic = Array.from({ length: 1000 }, (_, t) => base + A * Math.sin((2 * Math.PI * t) / P) + 2 * rngP());
  assert.ok(seasonalFiresAuto(periodic, 800, 200).period > 0, 'a strong sinusoid must yield a detected period');

  const rngN = lcg(7);
  const noise = Array.from({ length: 1000 }, () => 1000 + 2 * rngN());
  const a = seasonalFiresAuto(noise, 800, 200);
  assert.equal(a.period, 0, 'white noise -> no period');
  assert.equal(a.fired, flatFires(noise, 800, 200), 'period 0 falls back to the flat result');
});
