// test/seasonal-power.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatEValue, seasonalEValueFixed, seasonalEValueAuto, ALPHA } from '../tools/seasonal-power.js';

function lcg(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; }; }

test('fixed-period seasonal baseline beats flat on a strongly seasonal stream (high-phase test window)', () => {
  // Square seasonal: +A first half-period, -A second. Test window sits entirely in the +A half,
  // so a flat baseline sees a persistent offset (fires); the seasonal baseline removes it (valid).
  const P = 144, base = 1000, A = 20;
  const rng = lcg(2024);
  const m = 864, n = 72; // 6 full periods; test [864,936) -> phase 0..71 (the +A half)
  const v: number[] = [];
  for (let t = 0; t < m + n; t++) v.push(base + ((t % P) < P / 2 ? A : -A) + 2 * rng());
  const flat = flatEValue(v, m, n);
  const seas = seasonalEValueFixed(v, m, n, P);
  // The mechanism is the REDUCTION (deseasonalizing removes the persistent seasonal offset),
  // not crossing the arbitrary 1/α threshold — a square wave's z-ratio (offset≈baseline-std) is ~1.
  assert.ok(flat > 10, `flat baseline must be elevated by the persistent +A offset; got ${flat}`);
  assert.ok(seas < flat / 20, `fixed-period seasonal (${seas}) must massively beat flat (${flat})`);
  assert.ok(seas <= 1, `deseasonalized residual must be a valid (~<=1) e-value; got ${seas}`);
});

test('ACF auto-detect returns period 0 on white noise -> identical to flat', () => {
  const rng = lcg(7);
  const v = Array.from({ length: 1000 }, () => 1000 + 2 * rng());
  const s = seasonalEValueAuto(v, 800, 200);
  assert.equal(s.period, 0, 'no period should be detected on white noise');
  assert.equal(s.e, flatEValue(v, 800, 200), 'period 0 -> identical to flat');
});
