// test/heterogeneity-estimate.test.ts — the θ/τ estimators and what they say about canary-sim's DGP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  healthyPanel, roundDemean, estimateIcc, estimateTau, laggedAutocorr,
  nullFloorTheta, scenarioTable, roundsPerUnit, GEN_SIGMA, MEAS_SIGMA,
} from '../tools/heterogeneity-estimate.js';
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
const norm = (r: () => number): number => {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

test('ICC estimator recovers a KNOWN θ on synthetic data', () => {
  for (const theta of [0, 0.05, 0.1, 0.3, 0.6]) {
    const r = rng(11 + Math.round(theta * 100));
    const m = 2000, n = 30;
    const resid: number[][] = [];
    for (let g = 0; g < m; g++) {
      const delta = theta * norm(r);
      resid.push(Array.from({ length: n }, () => delta + norm(r)));
    }
    const { theta: hat } = estimateIcc(resid);
    assert.ok(Math.abs(hat - theta) < 0.02 + 0.05 * theta, `θ=${theta} recovered as ${hat}`);
  }
});

test('τ estimator separates a static offset from a mean-reverting one', () => {
  const m = 1500, n = 40, theta = 0.5;
  // static: ρ(k) = 1 for all k
  {
    const r = rng(5);
    const resid = Array.from({ length: m }, () => {
      const d = theta * norm(r);
      return Array.from({ length: n }, () => d + norm(r));
    });
    const { icc } = estimateIcc(resid);
    assert.ok(estimateTau(resid, icc) > 20, 'a static offset must read as long-persistence');
  }
  // AR(1) with φ = 0.5 ⇒ τ = −1/ln(0.5) ≈ 1.44 rounds
  {
    const r = rng(6), phi = 0.5;
    const resid = Array.from({ length: m }, () => {
      let d = theta * norm(r);
      return Array.from({ length: n }, () => {
        d = phi * d + Math.sqrt(1 - phi * phi) * theta * norm(r);
        return d + norm(r);
      });
    });
    const { icc } = estimateIcc(resid);
    const tau = estimateTau(resid, icc);
    assert.ok(tau > 0.7 && tau < 3.5, `AR(1) φ=0.5 should give τ ≈ 1.44 rounds, got ${tau}`);
  }
});

test('lag-0 normalisation and monotone decay for a mean-reverting process', () => {
  const r = rng(21), phi = 0.8, theta = 0.8;
  const resid = Array.from({ length: 800 }, () => {
    let d = theta * norm(r);
    return Array.from({ length: 30 }, () => { d = phi * d + Math.sqrt(1 - phi * phi) * theta * norm(r); return d + norm(r); });
  });
  const ac = laggedAutocorr(resid, 6);
  for (let i = 1; i < ac.length; i++) assert.ok(ac[i] <= ac[i - 1] + 0.02, `autocorr should decay: ${ac.join(',')}`);
});

test('the panel generator mirrors canary-sim knob semantics', () => {
  // per-execution noise is genSigma ⊕ measurement noise …
  const flat = { ...HEALTHY_SCENARIOS.H1, rackStaticSd: 0, rackOuSd: 0, heteroRackSd: 0, diurnalAmp: 0, hiddenStratumFrac: 0, agingSdPerDay: 0 };
  const { sigmaExec } = estimateIcc(roundDemean(healthyPanel(flat, 3, 1200, 30)));
  const expected = Math.sqrt(GEN_SIGMA ** 2 + MEAS_SIGMA ** 2);
  assert.ok(Math.abs(sigmaExec - expected) / expected < 0.05, `σ_exec ${sigmaExec} vs expected ${expected}`);

  // … and turning a persistent knob up must raise θ monotonically
  let prev = -1;
  for (const sd of [0, 0.002, 0.004, 0.008]) {
    const { theta } = estimateIcc(roundDemean(healthyPanel({ ...flat, rackStaticSd: sd }, 3, 1200, 30)));
    assert.ok(theta > prev, `θ must increase with rackStaticSd (${sd})`);
    prev = theta;
  }
});

test('null floor is small and H1 sits at it — the iid scenario has no persistent component', () => {
  const floor = nullFloorTheta(20260725, 1440, 40);
  assert.ok(floor < 0.06, `noise floor should be small, got ${floor}`);
  const rows = scenarioTable();
  const h1 = rows.find((r) => r.name.startsWith('H1'))!;
  assert.equal(h1.aboveFloor, false, 'H1 must not register measurable persistent heterogeneity');
});

test('MAIN FINDING: only 4 of 14 healthy scenarios carry unit-level persistent heterogeneity', () => {
  const rows = scenarioTable();
  const hot = rows.filter((r) => r.aboveFloor).map((r) => r.name.split(' ')[0]).sort();
  assert.deepEqual(hot, ['H12', 'H14', 'H2', 'H8'].sort(),
    `expected exactly H2/H8/H12/H14 above the floor, got ${hot.join(',')}`);
  // and where it exists it is NOT small
  for (const r of rows.filter((x) => x.aboveFloor)) {
    assert.ok(r.theta > 0.1, `${r.name}: θ=${r.theta}`);
    assert.ok(r.tStarK30 <= 12, `${r.name}: T*=${r.tStarK30} rounds — the horizon is short`);
  }
});

test('τ ≫ T* wherever θ > 0 — mean reversion does NOT rescue the horizon', () => {
  for (const r of scenarioTable().filter((x) => x.aboveFloor)) {
    assert.ok(r.tauRounds > 10 * r.tStarK30,
      `${r.name}: τ=${r.tauRounds} must dwarf T*=${r.tStarK30} for the mitigation to be absent`);
  }
});

test('E1 ran just inside the horizon; production does not', () => {
  // β=0.05% over 60 d gives a unit ~5 probe executions — E1's whole horizon.
  const t60 = roundsPerUnit(0.05, 60);
  assert.ok(t60 > 4 && t60 < 7, `expected ≈5.4 rounds, got ${t60}`);
  const worst = scenarioTable().filter((r) => r.aboveFloor).sort((a, b) => a.tStarK30 - b.tStarK30)[0];
  assert.ok(worst.lambdaAt5 > 1.5, `even at T=5 the worst scenario already inflates: Λ(5)=${worst.lambdaAt5}`);
  assert.ok(worst.lambdaAt60 > 100, 'and a one-year deployment is far outside the horizon');
  assert.ok(roundsPerUnit(0.05, 365) > 30, 'one year at sentinel budget is ~33 rounds');
});
