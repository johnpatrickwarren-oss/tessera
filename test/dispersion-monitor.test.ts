// test/dispersion-monitor.test.ts — the heterogeneity design-gate monitor (ADR 0023 CORR 2+3
// pair gate, enforced at runtime) and its wiring into the validity-class gate.
//
// The monitor is the ONLY instrument that can see the canary family's drift premise (the
// pooled-marginal monitors are provably blind, β = 1), so what these tests pin is the demotion
// SEMANTICS: unmeasured ⇒ not FDR-bearing; either channel's breach ⇒ demoted; demotion sticky;
// the contrast family untouched. Panels are synthetic (the monitor gates an estimator pair —
// substrate fidelity is dispersion-drift.test.ts's job); relations, not levels (N11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshHeterogeneityMonitor, updateHeterogeneity, heterogeneityVerdict, applyHeterogeneityGate,
} from '../tools/dispersion-monitor.js';
import { isFdrBearing, modeOf, ineligibilityReason, type EmitterContract } from '../tools/emitter-contract.js';

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

const N_UNITS = 400;

/** One round of unit scores: score_u = offset_u + scale_u · z. */
function makeRound(r: () => number, offsets: number[], scales: number[]): number[] {
  return offsets.map((o, u) => o + scales[u] * gauss(r));
}

function homogeneous(): { offsets: number[]; scales: number[] } {
  return { offsets: new Array<number>(N_UNITS).fill(0), scales: new Array<number>(N_UNITS).fill(1) };
}

function rankContract(over: Partial<EmitterContract> = {}): EmitterContract {
  return {
    id: 'canary-unit-family', baselineVersion: 'design-based (none)',
    conditioningVariables: ['block-key'], residualizer: 'within-block conformal rank',
    increment: 'mixture calibrator f(p)', stoppingAggregation: '½·product + ½·onset mixture → per-family e-BH',
    horizon: 'continuous', validityClass: 'construction_valid', calibrationMonitorPassing: true,
    constructionFamily: 'conformal_rank',
    ...over,
  };
}

test('unmeasured gate ⇒ not FDR-bearing: undecided monitor demotes a conformal_rank emitter', () => {
  const st = freshHeterogeneityMonitor({ minRounds: 20 });
  const { offsets, scales } = homogeneous();
  const r = rng(11);
  for (let t = 0; t < 10; t++) updateHeterogeneity(st, makeRound(r, offsets, scales));

  const v = heterogeneityVerdict(st);
  assert.equal(v.decided, false);
  assert.equal(v.passing, false);

  const { contract } = applyHeterogeneityGate(rankContract(), st);
  assert.equal(isFdrBearing(contract), false);
  assert.match(ineligibilityReason(contract) ?? '', /heterogeneity/);

  // ...and a rank contract with NO gate at all is equally ineligible (undefined = unmeasured).
  const bare = rankContract();
  assert.equal(isFdrBearing(bare), false);
  assert.match(ineligibilityReason(bare) ?? '', /heterogeneityGatePassing undefined/);
});

test('homogeneous healthy panel ⇒ gate passes after minRounds; emitter is Mode B', () => {
  const st = freshHeterogeneityMonitor({ minRounds: 20 });
  const { offsets, scales } = homogeneous();
  const r = rng(23);
  for (let t = 0; t < 30; t++) updateHeterogeneity(st, makeRound(r, offsets, scales));

  const v = heterogeneityVerdict(st);
  assert.equal(v.decided, true);
  assert.equal(v.passing, true, `expected pass, got ς̂=${v.varsigmaHat}, ICC=${v.iccHat}: ${v.reason}`);

  const { contract } = applyHeterogeneityGate(rankContract(), st);
  assert.equal(modeOf(contract), 'B');
});

test('dispersion channel: persistent unit scale spread (ς=0.4) demotes — and the location ICC stays blind to it', () => {
  const st = freshHeterogeneityMonitor({ minRounds: 20 });
  const r = rng(37);
  const offsets = new Array<number>(N_UNITS).fill(0);
  const scales = Array.from({ length: N_UNITS }, () => Math.exp(0.4 * gauss(r)));
  for (let t = 0; t < 30; t++) updateHeterogeneity(st, makeRound(r, offsets, scales));

  const v = heterogeneityVerdict(st);
  assert.equal(v.passing, false);
  assert.ok((v.varsigmaHat ?? 0) > 0.15, `ς̂ should read the injected spread (got ${v.varsigmaHat})`);
  assert.ok((v.iccHat ?? 1) < 0.04, `the ICC arm should NOT be what fires on pure dispersion (got ${v.iccHat})`);
  assert.match(v.reason ?? '', /dispersion/);

  const { contract } = applyHeterogeneityGate(rankContract(), st);
  assert.equal(modeOf(contract), 'A');
});

test('location channel: persistent unit offsets demote via the ICC arm', () => {
  const st = freshHeterogeneityMonitor({ minRounds: 20 });
  const r = rng(41);
  const offsets = Array.from({ length: N_UNITS }, () => 0.4 * gauss(r));
  const scales = new Array<number>(N_UNITS).fill(1);
  for (let t = 0; t < 30; t++) updateHeterogeneity(st, makeRound(r, offsets, scales));

  const v = heterogeneityVerdict(st);
  assert.equal(v.passing, false);
  assert.ok((v.iccHat ?? 0) > 0.04, `ICC should read the injected offsets (got ${v.iccHat})`);
  assert.match(v.reason ?? '', /location/);
});

test('demotion is sticky: clean rounds after a breach do not restore the gate', () => {
  const st = freshHeterogeneityMonitor({ minRounds: 20, windowRounds: 40 });
  const r = rng(53);
  const offsets = new Array<number>(N_UNITS).fill(0);
  const noisy = Array.from({ length: N_UNITS }, () => Math.exp(0.5 * gauss(r)));
  for (let t = 0; t < 25; t++) updateHeterogeneity(st, makeRound(r, offsets, noisy));
  assert.equal(heterogeneityVerdict(st).passing, false);

  // 40 clean rounds — the rolling window now holds ONLY clean panel, yet the verdict stays revoked.
  const clean = new Array<number>(N_UNITS).fill(1);
  for (let t = 0; t < 40; t++) updateHeterogeneity(st, makeRound(r, offsets, clean));
  const v = heterogeneityVerdict(st);
  assert.equal(v.passing, false);
  assert.match(v.reason ?? '', /revoked/);

  // rearm = a fresh monitor over the improved panel — THAT passes.
  const st2 = freshHeterogeneityMonitor({ minRounds: 20 });
  for (let t = 0; t < 25; t++) updateHeterogeneity(st2, makeRound(r, offsets, clean));
  assert.equal(heterogeneityVerdict(st2).passing, true);
});

test('the rung binds theorem_valid too: a Lean-proved per-round rank e-value still needs the drift gate', () => {
  const c = rankContract({ validityClass: 'theorem_valid', calibrationMonitorPassing: undefined });
  assert.equal(isFdrBearing(c), false);
  assert.equal(isFdrBearing({ ...c, heterogeneityGatePassing: true }), true);
  assert.equal(isFdrBearing({ ...c, heterogeneityGatePassing: false }), false);
});

test('the contrast family is untouched: absent gate fields preserve ADR 0019 semantics exactly', () => {
  const contrast: EmitterContract = {
    id: 'twin-contrast', baselineVersion: 'b1', conditioningVariables: [], residualizer: 'd = t − c',
    increment: 'normalized mixture', stoppingAggregation: 'e-BH', horizon: '60d',
    validityClass: 'construction_valid', calibrationMonitorPassing: true,
  };
  assert.equal(isFdrBearing(contrast), true);
  assert.equal(isFdrBearing({ ...contrast, calibrationMonitorPassing: false }), false);
  // an explicit contrast declaration behaves identically to the legacy absent field
  assert.equal(isFdrBearing({ ...contrast, constructionFamily: 'contrast' }), true);
});

test('estimator relation: recovered ς̂ is monotone in the injected spread', () => {
  const at = (vs: number): number => {
    const st = freshHeterogeneityMonitor({ minRounds: 20 });
    const r = rng(1000 + Math.round(vs * 100));
    const offsets = new Array<number>(N_UNITS).fill(0);
    const scales = Array.from({ length: N_UNITS }, () => Math.exp(vs * gauss(r)));
    for (let t = 0; t < 30; t++) updateHeterogeneity(st, makeRound(r, offsets, scales));
    return heterogeneityVerdict(st).varsigmaHat ?? NaN;
  };
  const a = at(0.1), b = at(0.3), c = at(0.5);
  assert.ok(a < b && b < c, `ς̂ monotone in injected ς: ${a.toFixed(3)}, ${b.toFixed(3)}, ${c.toFixed(3)}`);
});

test('cohort discipline: a round with a different unit count throws instead of silently misaligning', () => {
  const st = freshHeterogeneityMonitor();
  const { offsets, scales } = homogeneous();
  const r = rng(71);
  updateHeterogeneity(st, makeRound(r, offsets, scales));
  assert.throws(() => updateHeterogeneity(st, makeRound(r, offsets.slice(0, 100), scales.slice(0, 100))), /stable cohort/);
  assert.throws(() => updateHeterogeneity(st, [...makeRound(r, offsets, scales).slice(0, N_UNITS - 1), NaN]), /non-finite/);
});

// ── ADR 0026: rack scope ──────────────────────────────────────────────────────

/** 400 units in 50 racks of 8; rack-shared scale multipliers exp(ςᵣ·gᵣ), optional within-rack
 *  per-unit spread exp(ςᵤ·gᵤ). */
function rackFleet(r: () => number, rackSigma: number, unitSigma: number): {
  rackOf: number[]; offsets: number[]; scales: number[];
} {
  const perRack = 8, nRacks = N_UNITS / perRack;
  const rackMult = Array.from({ length: nRacks }, () => Math.exp(rackSigma * gauss(r)));
  const rackOf: number[] = [], scales: number[] = [];
  for (let u = 0; u < N_UNITS; u++) {
    const rk = Math.floor(u / perRack);
    rackOf.push(rk);
    scales.push(rackMult[rk] * Math.exp(unitSigma * gauss(r)));
  }
  return { rackOf, offsets: new Array<number>(N_UNITS).fill(0), scales };
}

test('rack scope: rack-shared dispersion fails the fleet gate but PASSES the rack gate (the construction cancels it)', () => {
  const r = rng(2601);
  const { rackOf, offsets, scales } = rackFleet(r, 0.5, 0);
  const fleet = freshHeterogeneityMonitor({ minRounds: 20 });
  const rack = freshHeterogeneityMonitor({ minRounds: 20, scope: 'rack', rackOf });
  for (let t = 0; t < 30; t++) {
    const round = makeRound(r, offsets, scales);
    updateHeterogeneity(fleet, round);
    updateHeterogeneity(rack, round);
  }
  const vf = heterogeneityVerdict(fleet), vr = heterogeneityVerdict(rack);
  assert.equal(vf.passing, false, `fleet gate must fail on rack-shared ς (ς̂=${vf.varsigmaHat?.toFixed(3)})`);
  assert.equal(vr.passing, true, `rack gate must pass — the within-rack residual is homogeneous (ς̂=${vr.varsigmaHat?.toFixed(3)})`);
});

test('rack scope: WITHIN-rack per-unit dispersion still fails the rack gate — the premise moved inside, not away', () => {
  const r = rng(2602);
  const { rackOf, offsets, scales } = rackFleet(r, 0, 0.5);
  const rack = freshHeterogeneityMonitor({ minRounds: 20, scope: 'rack', rackOf });
  for (let t = 0; t < 30; t++) updateHeterogeneity(rack, makeRound(r, offsets, scales));
  const v = heterogeneityVerdict(rack);
  assert.equal(v.passing, false, `within-rack ς must breach the rack-scoped gate (ς̂=${v.varsigmaHat?.toFixed(3)})`);
});

test('scope mismatch: wiring a fleet monitor verdict into a rack-scoped emitter throws (and vice versa)', () => {
  const r = rng(2603);
  const { rackOf, offsets, scales } = rackFleet(r, 0, 0);
  const fleet = freshHeterogeneityMonitor({ minRounds: 20 });
  const rack = freshHeterogeneityMonitor({ minRounds: 20, scope: 'rack', rackOf });
  for (let t = 0; t < 25; t++) {
    const round = makeRound(r, offsets, scales);
    updateHeterogeneity(fleet, round);
    updateHeterogeneity(rack, round);
  }
  assert.throws(() => applyHeterogeneityGate(rankContract({ blockScope: 'rack' }), fleet), /blockScope=rack but the monitor is scope=fleet/);
  assert.throws(() => applyHeterogeneityGate(rankContract(), rack), /blockScope=fleet but the monitor is scope=rack/);
  const ok = applyHeterogeneityGate(rankContract({ blockScope: 'rack' }), rack);
  assert.equal(ok.contract.heterogeneityGatePassing, true);
});

test('N13 cap: a fleet-scoped conformal_rank emitter at ≥20160 units is not FDR-bearing even with a passing gate; rack scope is exempt', () => {
  const capped = rankContract({ heterogeneityGatePassing: true, selectionDomainUnits: 20160 });
  assert.equal(isFdrBearing(capped), false);
  assert.match(ineligibilityReason(capped) ?? '', /N13/);
  const below = rankContract({ heterogeneityGatePassing: true, selectionDomainUnits: 10080 });
  assert.equal(isFdrBearing(below), true);
  const rackScoped = rankContract({ blockScope: 'rack', heterogeneityGatePassing: true, selectionDomainUnits: 40320 });
  assert.equal(isFdrBearing(rackScoped), true, 'rack scope premise is N-free');
  assert.equal(modeOf(rackScoped), 'B');
});
