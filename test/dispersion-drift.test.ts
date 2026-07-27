// test/dispersion-drift.test.ts — locks in the A2-disp extension (persistent DISPERSION
// heterogeneity, H8's actual mechanism).
//
// Everything here pins a RELATION, not a level (the N11 lesson — three assertions and three
// commit guards broke in one session because they encoded current values):
//   1. per-round validity is EXACT under pure dispersion: E_ν[g(e^ν)] = 1 — the A2 identity does
//      not care which channel carries the persistence.
//   2. the dispersion channel drifts HARDER per log-unit than location (B > A), but a finite
//      block defends against it more strongly (B_K30 caps far below B_∞).
//   3. g is a two-sided tilt with the loud side winning: g(1) < 1 against heterogeneous peers
//      (the median unit is quieter than the mixture), g increasing above λ = 1.
//   4. the paging/detection floor λ₀ exists, is a RATIO > 1, and moves the right way: smaller
//      blocks raise it (K=10 is fully immune — ∞), larger blocks lower it.
//   5. the horizon T* shrinks as ς grows (ladder ordering).
//   6. the estimator: χ²-corrected null floor ≈ 0; recovers a known synthetic ς; sees H8 while
//      the LOCATION estimator sees a pure-dispersion panel only via leakage; τ_disp reads a
//      static multiplier as persistent.
//   7. first passage (never Λ-by-MC, N10): on an all-healthy fleet, per-test FPR is
//      variant-INDEPENDENT while pages grow with ς — the P1 ∧ P3 signature, on the shipped
//      primitives via horizon-experiment's scoreRound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mixExceed, gScaleAt, gScaleCurve, dispersionTilt, dispersionTiltK,
  scaleKellyDrift, lambdaFloor, driftPositiveFraction, dispersionVariants, runDispersionHorizon,
} from '../tools/dispersion-drift.js';
import { lambda, validityHorizon, tiltCoefficient, rankCellMeans } from '../tools/exchangeability-drift.js';
import { estimateDispersion, estimateIcc, roundDemean, healthyPanel, trigamma } from '../tools/heterogeneity-estimate.js';
import { HEALTHY_SCENARIOS } from '../tools/canary-sim.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number): number => {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

test('1. per-round validity is EXACT under pure dispersion: Λ(1) = 1 at every ς', () => {
  for (const vs of [0.1, 0.25, 0.5]) {
    for (const K of [30, 100]) {
      const e1 = lambda(gScaleCurve(vs, K), 1);
      assert.ok(Math.abs(e1 - 1) < 5e-3, `E[g] = ${e1} at ς=${vs}, K=${K}`);
    }
  }
});

test('2. dispersion tilts harder per log-unit than location (B > A), and the finite block defends harder', () => {
  const A = tiltCoefficient(), B = dispersionTilt();
  assert.ok(B > 2 * A, `B=${B} should exceed A=${A} by well over 2×`);
  const B30 = dispersionTiltK(30);
  // the block cap costs dispersion most of its ∞-block tilt — far more than the ~2× location loses
  assert.ok(B / B30 > 3, `B_∞/B_K30 = ${(B / B30).toFixed(1)} should be > 3`);
  // and a larger block gives some of it back (monotone toward the ∞ limit)
  assert.ok(dispersionTiltK(100) > B30, 'tilt should grow with K toward the ∞-block limit');
});

test('3. g is a two-sided tilt with the loud side winning', () => {
  const K = 30, cell = rankCellMeans(K, 0.05);
  const pibar = mixExceed(0.5);
  const g1 = gScaleAt(1, pibar, K, cell);
  assert.ok(g1 < 1, `g(1) = ${g1} — the median unit is quieter than the mixture, so its mean increment is < 1`);
  const gUp = gScaleAt(Math.exp(0.5), pibar, K, cell);
  const gUp2 = gScaleAt(Math.exp(1.0), pibar, K, cell);
  assert.ok(g1 < gUp && gUp < gUp2, 'g increasing above λ = 1');
  const gDown = gScaleAt(Math.exp(-0.5), pibar, K, cell);
  assert.ok(gDown < g1, 'quieter than median is more protective still');
});

test('4. λ₀ — the floor exists, is a ratio > 1, and small blocks are immune', () => {
  assert.equal(lambdaFloor(0, 10), Infinity, 'K=10 can never page a pure-dispersion unit');
  const l30 = lambdaFloor(0, 30), l100 = lambdaFloor(0, 100);
  assert.ok(Number.isFinite(l30) && l30 > 1.5, `λ₀(K=30) = ${l30}`);
  assert.ok(l100 < l30, 'a larger block lowers the floor (power up, validity down — the § 2.3 trade)');
  // heterogeneous peers push the floor UP (the mixture has louder peers to hide behind)
  assert.ok(lambdaFloor(0.5, 30) > l30, 'peer heterogeneity raises the floor');
  // drift really is negative below and positive above
  assert.ok(scaleKellyDrift(l30 * 0.8, 0, 30) < 0 && scaleKellyDrift(l30 * 1.2, 0, 30) > 0);
});

test('5. the horizon shrinks as ς grows', () => {
  const t = [0.1, 0.2, 0.5].map((vs) => validityHorizon(gScaleCurve(vs, 30)));
  assert.ok(t[0] > t[1] && t[1] > t[2], `T* ladder ${t} should be strictly decreasing`);
  assert.ok(t[2] >= 1, 'even ς=0.5 keeps at least one round');
});

test('6a. estimator: χ² correction zeroes the null and recovers a known synthetic ς', () => {
  // trigamma sanity: ψ₁(19.5) between 2/39 and 2/39 + 1 (crude but relation-only)
  assert.ok(trigamma(19.5) > 2 / 40 && trigamma(19.5) < 2 / 39 + 0.01);
  const r = rng(20260726);
  const mk = (vs: number): number[][] => Array.from({ length: 800 }, () => {
    const lam = Math.exp(vs * gauss(r));
    return Array.from({ length: 40 }, () => lam * gauss(r));
  });
  const nullHat = estimateDispersion(mk(0)).varsigma;
  assert.ok(nullHat < 0.05, `null panel should read ≈ 0, got ${nullHat}`);
  for (const vs of [0.2, 0.4]) {
    const hat = estimateDispersion(mk(vs)).varsigma;
    assert.ok(Math.abs(hat - vs) / vs < 0.2, `ς̂ = ${hat} should recover ς = ${vs} within 20%`);
  }
});

test('6b. estimator on the canary-sim substrate: H8 is a dispersion scenario, H1 is not, and the multiplier is static', () => {
  const h8 = estimateDispersion(roundDemean(healthyPanel(HEALTHY_SCENARIOS.H8, 20260726, 1440, 40)));
  const h1 = estimateDispersion(roundDemean(healthyPanel(HEALTHY_SCENARIOS.H1, 20260726, 1440, 40)));
  assert.ok(h8.varsigma > 5 * Math.max(h1.varsigma, 0.02), `ς̂(H8)=${h8.varsigma} ≫ ς̂(H1)=${h1.varsigma}`);
  assert.ok(h8.tauDisp > 20, `rackNoiseMult is set once at init — τ_disp should read persistent, got ${h8.tauDisp}`);
});

test('6c. the location ICC is (nearly) blind to a pure-dispersion panel — and what it does see is leakage', () => {
  const r = rng(4242);
  const panel = Array.from({ length: 800 }, () => {
    const lam = Math.exp(0.4 * gauss(r));
    return Array.from({ length: 40 }, () => lam * gauss(r));
  });
  const disp = estimateDispersion(panel).varsigma;
  const loc = estimateIcc(panel).icc;
  assert.ok(disp > 0.3, 'the dispersion estimator sees it');
  // the one-way ICC reads a small positive value off a pure-scale panel (heteroskedastic unit
  // means have inflated sampling variance — leakage, not location signal). Pin that it is SMALL
  // relative to the dispersion signal, not that it is zero.
  assert.ok(loc < 0.05, `location ICC on a pure-dispersion panel should be near-blind, got ${loc}`);
});

test('7. first passage: FPR variant-independent, pages ordered by ς (P1 ∧ P3 on the shipped primitives)', () => {
  const variants = dispersionVariants();
  const opts = { seeds: 2, nUnits: 806, horizons: [120], alphaPage: 0.001 };
  const ctrl = runDispersionHorizon('control', variants.control, opts)[0];
  const d2x = runDispersionHorizon('h8disp2x', variants.h8disp2x, opts)[0];
  // P1: per-test calibration does not distinguish the variants (the drift is serial, not per-round)
  assert.ok(Math.abs(ctrl.perTestFpr - d2x.perTestFpr) < 0.01,
    `per-test FPR should be variant-independent: ${ctrl.perTestFpr} vs ${d2x.perTestFpr}`);
  // P3: the dispersion fleet pages; the control does not (relation, with headroom)
  assert.ok(d2x.falsePagesPerRun > Math.max(3 * ctrl.falsePagesPerRun, ctrl.villeBudget),
    `pages: disp ${d2x.falsePagesPerRun} vs ctrl ${ctrl.falsePagesPerRun} (budget ${ctrl.villeBudget})`);
  // and the theory's bounded fleet quantity points the same way
  assert.ok(d2x.predDriftPosFrac > 10 * Math.max(ctrl.predDriftPosFrac, 1e-12),
    'predicted drift-positive fraction must separate the variants in the same order');
});

test('8. driftPositiveFraction is monotone in ς and zero without dispersion', () => {
  assert.equal(driftPositiveFraction(0, 30), 0);
  const f = [0.2, 0.3, 0.5].map((vs) => driftPositiveFraction(vs, 30));
  assert.ok(f[0] < f[1] && f[1] < f[2], `fractions ${f} should be increasing`);
});
