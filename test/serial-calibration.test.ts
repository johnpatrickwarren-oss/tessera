// test/serial-calibration.test.ts — the anytime-valid serial-dependence calibration monitor (ADR 0019 O5).
// The serial increment must be a true conditional e-value (E[g_serial|F_{t-1}]=1 under H0), the combined
// monitor must catch the unit-marginal AR(1) the marginal monitor is BLIND to, must still catch a marginal
// break, and must not false-revoke on a genuine iid null beyond α.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import { freshCalibrationMonitor, updateCalibrationBatch } from '../tools/calibration-monitor.js';
import {
  serialLogIncrement, freshConditionalMonitor, updateConditionalBatch, conditionalVerdict,
  conditionalCalibrationPass, DEFAULT_SERIAL_COEFFS,
} from '../tools/serial-calibration.js';

/** A unit-marginal AR(1): x_t = ρ x_{t-1} + √(1−ρ²) ε_t — marginally EXACTLY N(0,1). */
function ar1(rng: () => number, n: number, rho: number, scale = 1, mean = 0): number[] {
  const out: number[] = []; let x = gaussian(rng); const s = Math.sqrt(Math.max(0, 1 - rho * rho));
  for (let t = 0; t < n; t++) { x = rho * x + s * gaussian(rng); out.push(mean + scale * x); }
  return out;
}

test('serial increment is a conditional e-value: E[g_serial | F_{t-1}] = 1 under H0 (any rPrev)', () => {
  const rng = mulberry32(7);
  for (const rPrev of [-2, -0.5, 0, 1, 3]) {
    // average exp(serialLogIncrement) over many independent N(0,1) draws of rCur ≈ 1
    let sum = 0; const M = 40000;
    for (let i = 0; i < M; i++) sum += Math.exp(serialLogIncrement(rPrev, gaussian(rng)));
    const mean = sum / M;
    assert.ok(Math.abs(mean - 1) < 0.05, `E[g_serial|rPrev=${rPrev}] should be ≈1, got ${mean.toFixed(3)}`);
  }
});

test('the serial martingale is a valid e-process on a true iid null (mean W_T ≈ 1, rarely revokes)', () => {
  let sumW = 0, revoked = 0; const trials = 400, n = 500, alpha = 0.01;
  for (let t = 0; t < trials; t++) {
    const m = freshConditionalMonitor({ alpha });
    updateConditionalBatch(m, ar1(mulberry32(t + 1), n, 0));
    sumW += conditionalVerdict(m).serialEValue;
    if (!m.passing) revoked++;
  }
  assert.ok(sumW / trials < 2.0, `mean serial e-value should be O(1) under the null, got ${(sumW / trials).toFixed(2)}`);
  assert.ok(revoked / trials <= alpha + 0.02, `false-revocation ${(revoked / trials).toFixed(3)} should be ≤ α(+slack)`);
});

test('HEADLINE: a unit-marginal AR(1) is invisible to the GAUSSIAN marginal monitor but the combined monitor catches it', () => {
  // The β=1 marginal blindness (ADR 0020) is a GAUSSIAN-FAMILY property: gInc's validity premise
  // is the MARGINAL N(0,1), which unit-marginal AR(1) satisfies. Pinned with kind:'gaussian'
  // since ADR 0027 flipped the monitor default to 'bounded' — whose premise is CONDITIONAL
  // mean-zero, so it genuinely detects AR(1) (see the next test).
  const n = 800, alpha = 0.01;
  let margRev = 0, combRev = 0; const trials = 200;
  for (let t = 0; t < trials; t++) {
    const stream = ar1(mulberry32(5000 + t), n, 0.6); // ρ=0.6, marginally N(0,1)
    const marg = freshCalibrationMonitor({ alpha, incrementKind: 'gaussian' }); updateCalibrationBatch(marg, stream);
    if (!marg.passing) margRev++;
    if (!conditionalCalibrationPass(stream, { alpha }).passing) combRev++;
  }
  assert.ok(margRev / trials < 0.1, `gaussian marginal monitor is ~blind to unit-marginal AR(1): revoke ${(margRev / trials).toFixed(2)} should be low`);
  assert.ok(combRev / trials > 0.9, `combined monitor catches serial dependence: revoke ${(combRev / trials).toFixed(2)} should be high`);
});

test('ADR 0027: the BOUNDED marginal monitor genuinely detects unit-marginal AR(1) — its premise is conditional', () => {
  // The bounded emitter's per-λ product has E[∏(1+λc/B)] = ∏(1 + λ²ρ·E[c²]/B²) > 1 under serial
  // dependence — the EMITTER's validity is broken there too, so the monitor firing is coherent
  // family-matched revocation, not a false alarm. (It also removes ADR 0020's β=1 blindness for
  // the bounded family — a strict monitoring improvement.)
  const n = 800, alpha = 0.01;
  let rev = 0; const trials = 100;
  for (let t = 0; t < trials; t++) {
    const m = freshCalibrationMonitor({ alpha }); // default = bounded
    updateCalibrationBatch(m, ar1(mulberry32(5000 + t), n, 0.6));
    if (!m.passing) rev++;
  }
  assert.ok(rev / trials > 0.25, `bounded marginal monitor should catch AR(1) at a nontrivial rate, got ${(rev / trials).toFixed(2)}`);
});

test('attribution: AR(1) revokes via the SERIAL component, not the marginal one', () => {
  const m = freshConditionalMonitor({ alpha: 0.01 });
  updateConditionalBatch(m, ar1(mulberry32(99), 800, 0.6));
  const v = conditionalVerdict(m);
  assert.equal(v.passing, false);
  assert.ok(v.serialEValue > v.marginalEValue * 1e3, `serial evidence (${v.serialEValue.toExponential(1)}) should dominate marginal (${v.marginalEValue.toExponential(1)})`);
});

test('a marginal break (mean shift) is still caught by the combined monitor', () => {
  let rev = 0; const trials = 200, alpha = 0.01;
  for (let t = 0; t < trials; t++) if (!conditionalCalibrationPass(ar1(mulberry32(6000 + t), 600, 0, 1, 1.0), { alpha }).passing) rev++;
  assert.ok(rev / trials > 0.9, `mean-shift break should be caught, revoke ${(rev / trials).toFixed(2)}`);
});

test('combined monitor preserves the marginal monitor on a genuine iid null (low false revocation)', () => {
  let rev = 0; const trials = 400, alpha = 0.01;
  for (let t = 0; t < trials; t++) if (!conditionalCalibrationPass(ar1(mulberry32(7000 + t), 600, 0), { alpha }).passing) rev++;
  assert.ok(rev / trials <= alpha + 0.02, `iid null false-revocation ${(rev / trials).toFixed(3)} should be ≤ α(+slack)`);
});

test('the serial mixture is sign-symmetric (catches negative serial dependence too)', () => {
  assert.deepEqual([...DEFAULT_SERIAL_COEFFS].sort((a, b) => a - b), [-0.6, -0.3, 0.3, 0.6]);
  let rev = 0; const trials = 150, alpha = 0.01;
  for (let t = 0; t < trials; t++) if (!conditionalCalibrationPass(ar1(mulberry32(8000 + t), 800, -0.6), { alpha }).passing) rev++;
  assert.ok(rev / trials > 0.8, `negative-ρ serial dependence should be caught, revoke ${(rev / trials).toFixed(2)}`);
});

test('stream boundaries reset the serial predictor (no spurious cross-unit lag-1 pair)', () => {
  // two independent iid-null units fed as separate streams — the join point must not manufacture a pair.
  const a = ar1(mulberry32(11), 300, 0), b = ar1(mulberry32(12), 300, 0);
  const { passing } = conditionalCalibrationPass([a, b], { alpha: 0.01 });
  assert.equal(passing, true, 'two genuine nulls should not revoke at the stream boundary');
});

test('ADR 0027: bounded kind — valid on heavy-tailed white noise where the gaussian serial bet would leak, still catches AR(1)', () => {
  // t3-flavored white noise (heavy tails, unit variance): the bounded monitor must NOT revoke;
  // bounded AR(1): must revoke. This is the hardening the knob buys.
  const t3 = (rng: () => number): number => {
    const g = (): number => gaussian(rng);
    const z = g(); const c = g() ** 2 + g() ** 2 + g() ** 2;
    return (z / Math.sqrt(c / 3)) / Math.sqrt(3);
  };
  const alpha = 0.01; const trials = 100;
  let whiteRev = 0, arRev = 0;
  for (let t = 0; t < trials; t++) {
    const rng = mulberry32(8100 + t);
    const white = Array.from({ length: 800 }, () => t3(rng));
    if (!conditionalCalibrationPass(white, { alpha, kind: 'bounded' }).passing) whiteRev++;
    const rng2 = mulberry32(9100 + t);
    const ar: number[] = []; let prev = 0;
    for (let i = 0; i < 800; i++) { prev = 0.6 * prev + Math.sqrt(1 - 0.36) * t3(rng2); ar.push(prev); }
    if (!conditionalCalibrationPass(ar, { alpha, kind: 'bounded' }).passing) arRev++;
  }
  assert.ok(whiteRev / trials <= 0.03, `bounded monitor must be valid on heavy-tailed white noise, revoke ${(whiteRev / trials).toFixed(2)}`);
  assert.ok(arRev / trials > 0.9, `bounded monitor must catch AR(1) under heavy tails, revoke ${(arRev / trials).toFixed(2)}`);
});
