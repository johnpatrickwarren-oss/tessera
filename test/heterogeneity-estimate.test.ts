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

test('H15–H17 hit their designed ICC targets (the scenarios E1 was missing)', () => {
  // sigma_exec = sqrt(0.010^2 + 0.005^2); unitOffsetSd = theta * sigma_exec.
  const want: Record<string, number> = { H15: 0.093, H16: 0.010, H17: 0.265 };
  for (const [key, target] of Object.entries(want)) {
    const { icc } = estimateIcc(roundDemean(healthyPanel(HEALTHY_SCENARIOS[key], 20260725, 1440, 40)));
    assert.ok(Math.abs(icc - target) / target < 0.12, `${key}: ICC ${icc} vs target ${target}`);
  }
  // H15 sits at the corrected design target (P7: ICC <= 9.5% at alpha=1e-3), H17 well past it.
  const icc15 = estimateIcc(roundDemean(healthyPanel(HEALTHY_SCENARIOS.H15, 1, 1440, 40))).icc;
  const icc17 = estimateIcc(roundDemean(healthyPanel(HEALTHY_SCENARIOS.H17, 1, 1440, 40))).icc;
  assert.ok(icc15 < 0.11 && icc17 > 0.2, `H15 ${icc15}, H17 ${icc17}`);
});

test('H16 reads as "no measurable heterogeneity" from ESTIMATOR POWER, not from the DGP', () => {
  // At the report's default panel (1440 units x 40 rounds) the lag-autocorrelation noise floor is
  // 3/sqrt(1440*39) ~ 0.0126, while H16's ICC ~ 0.0103 puts r_1 just below it — so tau returns the
  // "no persistence" sentinel even though the offset is static by construction. Widen the panel and
  // the persistence is unmistakable. Documented so nobody reads the report's H16 row as a DGP fact.
  const wide = roundDemean(healthyPanel(HEALTHY_SCENARIOS.H16, 7, 6000, 60));
  const { icc } = estimateIcc(wide);
  assert.ok(icc > 0.008 && icc < 0.013, `H16 ICC should still be ~1%, got ${icc}`);
  assert.ok(estimateTau(wide, icc) > 20, 'with enough data H16 must read as long-persistence');
});

test('adding the unitOffsetSd knob left every pre-existing scenario byte-identical', () => {
  // The knob draws no rng at 0, so H1-H14 must reproduce the committed theta/tau table exactly.
  // If this fails, every figure in research/2026-07-25-theta-tau-measurement.md moved.
  const published: Record<string, number> = {
    H1: 0.0277, H2: 0.3538, H4: 0.0270, H8: 0.2032, H12: 0.1197, H14: 0.2965,
  };
  for (const [key, theta] of Object.entries(published)) {
    const got = estimateIcc(roundDemean(healthyPanel(HEALTHY_SCENARIOS[key], 20260725, 1440, 40))).theta;
    assert.ok(Math.abs(got - theta) < 5e-4, `${key}: theta ${got} vs published ${theta}`);
  }
  for (const k of Object.values(HEALTHY_SCENARIOS)) {
    if (!/^H1[567]/.test(k.name)) assert.equal(k.unitOffsetSd, 0, `${k.name} must not have gained an offset`);
  }
});

test('MAIN FINDING: of the ORIGINAL 14, only 4 carry unit-level persistent heterogeneity', () => {
  const rows = scenarioTable();
  // H15-H17 were added in 2026-07-26 precisely because the original family lacked this; exclude
  // them so the finding about the ORIGINAL family stays testable.
  const orig = rows.filter((r) => !/^H1[567] /.test(r.name));
  const hot = orig.filter((r) => r.aboveFloor).map((r) => r.name.split(' ')[0]).sort();
  assert.deepEqual(hot, ['H12', 'H14', 'H2', 'H8'].sort(),
    `expected exactly H2/H8/H12/H14 above the floor, got ${hot.join(',')}`);
  assert.equal(orig.length, 14, 'the original family is 14 scenarios');
  assert.ok(rows.some((r) => /^H15 /.test(r.name) && r.aboveFloor), 'H15 must register as persistent');
  // and where it exists it is NOT small
  for (const r of orig.filter((x) => x.aboveFloor)) {
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
