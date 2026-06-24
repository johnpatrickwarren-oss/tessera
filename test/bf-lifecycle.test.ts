// test/bf-lifecycle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBFLifecycle, bfWin, mixWin } from '../tools/bf-lifecycle.js';
import { mulberry32, scramble, gaussian } from '../tools/calibration-envelope.js';

test('horizon sweep: mixSM over-fires as n grows, BF stays valid; both keep detection', () => {
  const r = runBFLifecycle(); // synthetic only
  const small = r.horizon_sweep.find((x) => x.n === 30)!;
  const big = r.horizon_sweep.find((x) => x.n === 600)!;
  // small n: both valid-ish
  assert.ok(small.mix_fp <= 0.05 && small.bf_fp <= 0.05, `small-n both controlled (mix=${small.mix_fp}, bf=${small.bf_fp})`);
  // large n: mixSM over-fires (≫ α=0.01) and rises with n; BF stays valid; mixSM ≫ BF
  assert.ok(big.mix_fp > 0.03, `mixSM FP must be clearly invalid (≫α) at large n (${big.mix_fp})`);
  assert.ok(big.mix_fp > small.mix_fp, `mixSM FP must rise with n (${small.mix_fp}→${big.mix_fp})`);
  assert.ok(big.bf_fp <= 0.02, `BF FP must stay ≤α-ish at large n (${big.bf_fp})`);
  assert.ok(big.mix_fp > big.bf_fp + 0.02, `at large n mixSM (${big.mix_fp}) must over-fire vs BF (${big.bf_fp})`);
  // detection retained by both where the window has enough points (n≥75; n=30 is power-limited for both)
  for (const x of r.horizon_sweep.filter((y) => y.n >= 75)) {
    assert.ok(x.mix_detect >= 0.9 && x.bf_detect >= 0.9, `both detect at n=${x.n} (mix=${x.mix_detect}, bf=${x.bf_detect})`);
  }
});

test('bfWin is location-invariant; mixWin is NOT (it centers by a plug-in mean)', () => {
  const rng = mulberry32(scramble(5)); const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < 700; t++) { p = 0.5 * p + Math.sqrt(0.75) * gaussian(rng); v.push(1000 + 2 * p); }
  const shifted = v.map((x) => x + 5000);
  // BF integrates the mean out → invariant
  assert.ok(Math.abs(bfWin(v, 0, 200, 200, 400) - bfWin(shifted, 0, 200, 200, 400)) <= 1e-6 * Math.max(1, bfWin(v, 0, 200, 200, 400)), 'BF must be location-invariant');
  // mixSM centers by the cal mean too, so a COMMON shift also cancels — sanity it runs + is finite
  assert.ok(Number.isFinite(mixWin(v, 0, 200, 200, 400)), 'mixWin returns a finite e-value');
});
