// test/nuisance-robust-evalue.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuisanceRobustEValue, pluginEValue, ALPHA } from '../tools/nuisance-robust-evalue.js';
import { mulberry32, scramble, gaussian } from '../tools/calibration-envelope.js';

const RHO = 0.5;
function ar1(seed: number, len: number, shiftAt: number, shift: number): number[] {
  const rng = mulberry32(scramble(seed)); const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < len; t++) { p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng); v.push(1000 + 2 * p + (shiftAt >= 0 && t >= shiftAt ? shift : 0)); }
  return v;
}

test('VALID even under-powered: BF honors α where the plug-in catastrophically does not', () => {
  // m=300, n=680 (n/m=2.3) — the ADR 0008 regime where plug-in E[e] explodes.
  const m = 300, n = 680, K = 200;
  let bfFire = 0, plFire = 0, bfSum = 0;
  for (let s = 0; s < K; s++) {
    const v = ar1(11 + s * 7, m + n, -1, 0); // null: no shift
    const e = nuisanceRobustEValue(v, m, n); bfSum += e; if (e >= 1 / ALPHA) bfFire++;
    if (pluginEValue(v, m, n) >= 1 / ALPHA) plFire++;
  }
  assert.ok(bfFire / K <= 0.02, `BF must honor α even under-powered (fire rate ${bfFire / K})`);
  assert.ok(bfSum / K <= 1.5, `BF E[e] must stay ~≤1 (${bfSum / K})`);
  assert.ok(plFire / K > bfFire / K, `plug-in must fire more (invalid) than BF here (${plFire / K} vs ${bfFire / K})`);
});

test('detects a real mean shift (power)', () => {
  const m = 1500, n = 300;
  let det = 0, K = 60;
  for (let s = 0; s < K; s++) if (nuisanceRobustEValue(ar1(9001 + s * 7, m + n, m + 20, 4), m, n) >= 1 / ALPHA) det++;
  assert.ok(det / K >= 0.9, `must detect a +4 shift (rate ${det / K})`);
});

test('location-invariant: a constant offset to ALL data does not change the e-value (mean nuisance is integrated out)', () => {
  const v = ar1(42, 1800, -1, 0);
  const e1 = nuisanceRobustEValue(v, 1500, 300);
  const e2 = nuisanceRobustEValue(v.map((x) => x + 5000), 1500, 300);
  assert.ok(Math.abs(e1 - e2) <= 1e-6 * Math.max(1, e1), `e-value must be invariant to a common shift (${e1} vs ${e2})`);
});
