// test/horizon-experiment.test.ts — A2-E1b signature, locked in.
//
// The discriminating pattern is P1 ∧ P3: per-test conformal calibration stays nominal at every
// horizon WHILE the anytime paging rate grows with T, and only in scenarios with θ > 0. A harness
// bug, a mis-set threshold or a broken rank would break P1 too, so the conjunction is what makes
// this a test of the A2 mechanism rather than of the plumbing. H1 (θ ≈ 0) is the control.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHorizon } from '../tools/horizon-experiment.js';

const OPTS = { seeds: 2, nUnits: 1008, horizons: [10, 160] };

test('P1: per-test conformal FPR stays nominal at every horizon, in both scenarios', () => {
  for (const key of ['H1', 'H2']) {
    for (const p of runHorizon(key, OPTS).points) {
      assert.ok(Math.abs(p.perTestFpr - 0.01) < 0.004,
        `${key} T=${p.T}: per-test FPR ${p.perTestFpr} must stay at nominal 0.01 — if this fails the harness is broken, not the theory`);
    }
  }
});

test('P3 control: θ ≈ 0 ⇒ the paging rate does not grow with the horizon', () => {
  const r = runHorizon('H1', OPTS);
  assert.ok(r.theta < 0.06, `H1 must be at the noise floor, got θ=${r.theta}`);
  for (const p of r.points) {
    assert.ok(p.falsePagesPerRun <= p.villeBudget,
      `H1 T=${p.T}: ${p.falsePagesPerRun} pages must stay inside the Ville budget ${p.villeBudget}`);
  }
});

test('P3: θ > 0 ⇒ the paging rate grows with the horizon', () => {
  const r = runHorizon('H2', OPTS);
  assert.ok(r.theta > 0.25, `H2 must carry real persistent heterogeneity, got θ=${r.theta}`);
  const [short, long] = r.points;
  assert.ok(long.falsePagesPerRun > short.falsePagesPerRun,
    `H2: pages must grow with T (${short.falsePagesPerRun} at T=${short.T} → ${long.falsePagesPerRun} at T=${long.T})`);
});

test('the contrast is between scenarios, not an artefact of the horizon itself', () => {
  const h1 = runHorizon('H1', OPTS).points[1];
  const h2 = runHorizon('H2', OPTS).points[1];
  assert.equal(h1.T, h2.T);
  assert.ok(h2.falsePagesPerRun > h1.falsePagesPerRun,
    'at the SAME long horizon, the heterogeneous scenario must page more than the iid control');
});

test('Λ is a bound, not an estimable mean: the sample mean does not track it', () => {
  // Documenting the negative result honestly — Λ(T)'s mass sits at δ-tail probabilities far below
  // 1/N, so no fleet-sized sample mean can estimate it. This test exists so nobody "fixes" the
  // observed column to match the predicted one.
  const p = runHorizon('H2', OPTS).points[1];
  assert.ok(p.lambdaPredicted > 100, 'the bound should be enormous at this horizon');
  assert.ok(p.lambdaObserved < 10, 'while the realised sample mean stays small — this gap is the finding');
});
