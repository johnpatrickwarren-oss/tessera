// test/e-detector.test.ts — Wall B. The e-detector recovers TRANSIENT-fault power that the
// terminal (fixed-window) UI e-value dilutes away. We verify the core win with a ROC-MATCHED
// comparison (each detector thresholded at its OWN empirical 95th-percentile null peak), rather
// than asserting the absolute 1/α ARL — because the load-bearing caveat (Wall A re-enters in the
// increment) is precisely that the 1/α calibration may not hold under a nonstationary null. We
// also exercise the absolute-threshold API on a clean strong transient, and determinism.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eDetector, terminalUiEValue } from '../tools/e-detector.js';

// ── deterministic RNG (mulberry32) + Box–Muller Gaussian ────────────────────────────────────
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Stationary AR(1): x_t = phi·x_{t-1} + sqrt(1-phi²)·ε_t (unit marginal variance). */
function ar1(T: number, phi: number, r: () => number): number[] {
  const x = new Array<number>(T);
  let prev = gauss(r);
  x[0] = prev;
  const s = Math.sqrt(1 - phi * phi);
  for (let t = 1; t < T; t++) { prev = phi * prev + s * gauss(r); x[t] = prev; }
  return x;
}
/** Add a transient mean shift of `mag` over [tOn, tOff). */
function withTransient(x: number[], tOn: number, tOff: number, mag: number): number[] {
  const y = x.slice();
  for (let t = tOn; t < tOff; t++) y[t] += mag;
  return y;
}
function quantile(xs: number[], q: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

// Regime: a transient that is a SMALL fraction of the fixed terminal window (so the terminal
// detector dilutes it away) yet wide enough that an ALIGNED candidate window clears the UI power
// floor (CAL ≥ 30, window ≥ ~40 pts at φ ≤ 0.2 — engine ADR 0016 finding 2). onsetTarget/
// evalTarget are passed to bound the grid cost; a strided onset set is a conservative sub-mixture.
const CAL = 30, T = 300, PHI = 0.18;
const T_ON = 120, T_OFF = 175, MAG = 6; // 55-wide transient inside the test window [30,300)
const OPTS = { calLen: CAL, onsetTarget: 16, evalTarget: 20, mixture: 'SR' as const };

test('e-detector recovers transient power the terminal UI e-value dilutes (ROC-matched)', () => {
  const N = 40;
  const eNullPeaks: number[] = [], eFaultPeaks: number[] = [];
  const tNull: number[] = [], tFault: number[] = [];
  for (let s = 0; s < N; s++) {
    const base = ar1(T, PHI, rng(1000 + s));
    const fault = withTransient(base, T_ON, T_OFF, MAG);
    eNullPeaks.push(eDetector(base, OPTS).peak);
    eFaultPeaks.push(eDetector(fault, OPTS).peak);
    tNull.push(terminalUiEValue(base, CAL));
    tFault.push(terminalUiEValue(fault, CAL));
  }
  // Calibrate each detector at its own empirical 5% false-alarm threshold, then compare power.
  const eThr = quantile(eNullPeaks, 0.95);
  const tThr = quantile(tNull, 0.95);
  const eDet = eFaultPeaks.filter((v) => v >= eThr).length / N;
  const tDet = tFault.filter((v) => v >= tThr).length / N;

  // The terminal detector is diluted by the transient → low power.
  assert.ok(tDet <= 0.3, `terminal should be diluted on transients; got detRate=${tDet}`);
  // The e-detector recovers the power.
  assert.ok(eDet >= 0.6, `e-detector should recover transient power; got detRate=${eDet}`);
  // …and it is a clear, large win over the terminal detector.
  assert.ok(eDet - tDet >= 0.4, `e-detector should beat terminal by a wide margin; eDet=${eDet} tDet=${tDet}`);
});

test('e-detector null peaks separate from fault peaks (discrimination)', () => {
  const N = 24;
  const np: number[] = [], fp: number[] = [];
  for (let s = 0; s < N; s++) {
    np.push(eDetector(ar1(T, PHI, rng(7000 + s)), OPTS).peak);
    fp.push(eDetector(withTransient(ar1(T, PHI, rng(7000 + s)), T_ON, T_OFF, MAG), OPTS).peak);
  }
  const nullMed = quantile(np, 0.5), faultMed = quantile(fp, 0.5);
  assert.ok(faultMed > 3 * nullMed, `fault peak should dominate null peak; nullMed=${nullMed} faultMed=${faultMed}`);
});

test('absolute 1/alpha threshold fires on a clean strong transient', () => {
  // A strong, clean transient (low phi, large magnitude, wide enough to clear the UI floor) must
  // cross the 1/alpha threshold.
  const fault = withTransient(ar1(T, 0.12, rng(42)), 120, 185, 7);
  const tr = eDetector(fault, { ...OPTS, alpha: 0.05 });
  assert.equal(tr.threshold, 20);
  assert.ok(tr.detectTime !== null, 'e-detector should detect a strong clean transient at alpha=0.05');
  assert.ok(tr.detectTime! >= CAL, 'detection time must be after the calibration prefix');
});

test('smaller alpha (higher threshold) never advances the detection time', () => {
  const fault = withTransient(ar1(T, 0.15, rng(99)), 120, 180, 7);
  const loose = eDetector(fault, { ...OPTS, alpha: 0.2 });   // threshold 5
  const tight = eDetector(fault, { ...OPTS, alpha: 0.02 });  // threshold 50
  if (loose.detectTime !== null && tight.detectTime !== null) {
    assert.ok(tight.detectTime >= loose.detectTime, 'a higher threshold cannot detect earlier');
  }
});

test('CUSUM (max) ≤ SR (sum) pointwise — SR is the more powerful mixture', () => {
  const fault = withTransient(ar1(T, PHI, rng(5)), T_ON, T_OFF, MAG);
  const sr = eDetector(fault, { ...OPTS, mixture: 'SR' });
  const cu = eDetector(fault, { ...OPTS, mixture: 'CUSUM' });
  for (let i = 0; i < sr.M.length; i++) {
    assert.ok(cu.M[i] <= sr.M[i] + 1e-9, `CUSUM max must be ≤ SR sum at eval ${i}: ${cu.M[i]} > ${sr.M[i]}`);
  }
});

test('deterministic and guards a too-short series', () => {
  const x = ar1(T, PHI, rng(3));
  assert.deepEqual(eDetector(x, OPTS).M, eDetector(x, OPTS).M);
  assert.throws(() => eDetector(ar1(20, 0.1, rng(1)), { calLen: 18 }), /too short|calLen/);
  assert.throws(() => eDetector(x, { calLen: 4 }), /calLen/);
});
