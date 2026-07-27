// test/dispersion-ebh-boundary.test.ts — locks in A2-disp-ebh (the e-BH failure boundary under
// persistent dispersion). Every assertion pins a RELATION, not a level (the N11 lesson).
//
//   1. barrier ordering: e-BH's ln(N/q) wall is higher than paging's ln(1/α), so at equal ς the
//      predicted crossing count is strictly smaller — the reason P8's location-era comfort held.
//   2. the prediction grows with ς (2a) and — as a property of the scalar-ς iid PREDICTOR, not of
//      the system — shrinks per-unit as N grows (2b). The MEASURED N-direction is the opposite
//      (rack-shared λ + e-BH step-up cascade; see the report §3): 2b pins the predictor's
//      structure precisely so that divergence stays visible instead of being absorbed.
//   3. measured, on the shipped primitives at reduced scale: a strong-dispersion A/A fleet
//      produces false e-BH selections where a mild one and a control produce none, and its
//      first-selection round comes earlier than any weaker variant's.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispKnobs, measureVarsigma, runEbhVariant,
} from '../tools/dispersion-ebh-boundary.js';
import { predictedPagesPerRun } from '../tools/dispersion-drift.js';

test('1. the e-BH barrier ln(N/q) predicts strictly fewer crossings than the paging barrier ln(1/α)', () => {
  const K = 30, N = 2016, q = 0.05, alpha = 0.001, T = 320;
  for (const vs of [0.3, 0.45, 0.6]) {
    const ebh = predictedPagesPerRun(vs, K, N, q / N, T);
    const page = predictedPagesPerRun(vs, K, N, alpha, T);
    assert.ok(ebh < page, `ς=${vs}: predicted e-BH crossings ${ebh} should be below predicted pages ${page}`);
    assert.ok(ebh > 0, `ς=${vs}: the higher barrier delays, never abolishes — prediction must stay positive`);
  }
});

test('2a. predicted e-BH crossings grow with ς at fixed N, T', () => {
  const K = 30, N = 2016, q = 0.05, T = 320;
  const at = (vs: number): number => predictedPagesPerRun(vs, K, N, q / N, T);
  assert.ok(at(0.3) < at(0.45), 'crossings should increase 0.3 → 0.45');
  assert.ok(at(0.45) < at(0.6), 'crossings should increase 0.45 → 0.6');
});

test('2b. the scalar-ς iid PREDICTOR has a falling per-unit rate in N (the measured system does not — report §3)', () => {
  const K = 30, q = 0.05, T = 320, vs = 0.5;
  const perUnit = (N: number): number => predictedPagesPerRun(vs, K, N, q / N, T) / N;
  assert.ok(perUnit(1008) > perUnit(2016), 'per-unit rate should fall 1008 → 2016');
  assert.ok(perUnit(2016) > perUnit(4032), 'per-unit rate should fall 2016 → 4032');
});

test('3. measured on shipped primitives: strong dispersion produces false e-BH selections, control and mild do not', () => {
  // Reduced scale for suite speed: N = 504, T = 80, 2 seeds. The strong knob (1.2) sits well above
  // the report's ς̂ = 0.61 failure point; the mild knob (0.3, ς̂ ≈ 0.18) sits inside the measured
  // safe region; the control has no dispersion at all.
  const opts = { seeds: 2, nUnits: 504, horizons: [40, 80] };
  const strong = runEbhVariant(1.2, opts);
  const mild = runEbhVariant(0.3, opts);
  const control = runEbhVariant(0, opts);

  const last = (r: typeof strong): number => r.points[r.points.length - 1].falseSelectionsPerRun;
  assert.ok(last(control) === 0, `control fleet must select nothing (got ${last(control)})`);
  assert.ok(last(mild) === 0, `mild-ς fleet (ς̂=${mild.varsigmaHat.toFixed(2)}) must select nothing (got ${last(mild)})`);
  assert.ok(last(strong) > 0, `strong-ς fleet (ς̂=${strong.varsigmaHat.toFixed(2)}) must produce false selections`);
  assert.ok(strong.seedsWithSel > 0, 'at least one seed must have crossed');

  // first-selection ordering: the strong fleet's first selection comes earlier than any weaker
  // variant's (which is Infinity here).
  const firstStrong = Math.min(...strong.firstSelRounds);
  const firstMild = Math.min(...mild.firstSelRounds);
  assert.ok(firstStrong < firstMild, `first selection at strong ς (${firstStrong}) should precede mild (${firstMild})`);
});

test('4. ς̂ increases with the knob (the measurement axis is monotone where the sweep reads it)', () => {
  const a = measureVarsigma(dispKnobs(0.3));
  const b = measureVarsigma(dispKnobs(0.6));
  const c = measureVarsigma(dispKnobs(1.0));
  assert.ok(a < b && b < c, `ς̂ should be monotone in the knob: ${a.toFixed(3)}, ${b.toFixed(3)}, ${c.toFixed(3)}`);
});
