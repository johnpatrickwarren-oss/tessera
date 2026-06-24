// test/nuisance-robust-evalue.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuisanceRobustEValue, runEValue } from '../tools/nuisance-robust-evalue.js';
import { mulberry32, scramble, gaussian } from '../tools/calibration-envelope.js';

const RHO = 0.5;
function ar1(seed: number, len: number, shiftAt: number, shift: number): number[] {
  const rng = mulberry32(scramble(seed)); const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < len; t++) { p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng); v.push(1000 + 2 * p + (shiftAt >= 0 && t >= shiftAt ? shift : 0)); }
  return v;
}

test('VALID at ALL scales in both regimes (incl. under-powered, where the plug-in is invalid)', () => {
  const r = runEValue(); // synthetic only
  for (const row of r.validity) {
    assert.ok(row.bf_valid_all_scales, `BF must satisfy P(e≥k)≤1/k at k=10/100/1000 (${row.regime}): ${row.bf_p_ge_10}/${row.bf_p_ge_100}/${row.bf_p_ge_1000}`);
    assert.ok(row.bf_detect >= 0.9, `BF must detect the shift in ${row.regime} (${row.bf_detect})`);
  }
  const up = r.validity.find((x) => x.regime.startsWith('UNDER'))!;
  assert.ok(!up.plugin_valid, 'plug-in must be INVALID under-powered (the contrast the BF fixes)');
});

test('SCOPE (H2): same-variance null is valid (1×), but a large test-variance change inflates P(fire)', () => {
  const r = runEValue();
  const v1 = r.variance_sensitivity.find((x) => x.std_mult === 1)!;
  const v3 = r.variance_sensitivity.find((x) => x.std_mult === 3)!;
  assert.ok(v1.bf_p_fire <= 0.02, `equal-variance null must honor α (${v1.bf_p_fire})`);
  assert.ok(v3.bf_p_fire > 0.01, `a 3× std test window must inflate P(fire) — the disclosed scope limit (${v3.bf_p_fire})`);
});

test('location-invariant: a constant offset to ALL data leaves the e-value unchanged', () => {
  const v = ar1(42, 1800, -1, 0);
  const e1 = nuisanceRobustEValue(v, 1500, 300);
  const e2 = nuisanceRobustEValue(v.map((x) => x + 5000), 1500, 300);
  assert.ok(Math.abs(e1 - e2) <= 1e-6 * Math.max(1, e1), `must be invariant to a common shift (${e1} vs ${e2})`);
});
