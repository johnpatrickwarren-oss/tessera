// test/emitter-contract.test.ts — the validity-class gate must FIRE for non-FDR-bearing emitters and
// must demote construction_valid when its live calibration monitor is failing/absent (ADR 0019). This
// locks the "Mode B is opt-in and revocable, never default" invariant in code, mirroring
// test/baseline-guard.test.ts. If someone weakens the gate, this test fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFdrEligible, fdrBenjaminiHochberg, isFdrBearing, modeOf, routeEmitters,
  FDR_BEARING_CLASSES, type EmitterContract, type ValidityClass,
} from '../tools/emitter-contract.js';

/** Minimal contract with an overridable validity_class / monitor flag. */
function contract(validityClass: ValidityClass, calibrationMonitorPassing?: boolean): EmitterContract {
  return {
    id: `test/${validityClass}`,
    baselineVersion: 'v', conditioningVariables: ['cm'], residualizer: 'r',
    increment: 'normalized-mixture', stoppingAggregation: 'running-max→e-BH', horizon: 'w',
    validityClass, calibrationMonitorPassing,
  };
}

test('theorem_valid is FDR-bearing (Mode B) without a runtime monitor', () => {
  const c = contract('theorem_valid');
  assert.equal(isFdrBearing(c), true);
  assert.equal(modeOf(c), 'B');
  assert.doesNotThrow(() => assertFdrEligible(c, 'unit'));
});

test('construction_valid is FDR-bearing ONLY while its calibration monitor passes', () => {
  assert.equal(isFdrBearing(contract('construction_valid', true)), true);
  assert.equal(modeOf(contract('construction_valid', true)), 'B');
  // failing monitor → demoted B→A
  assert.equal(isFdrBearing(contract('construction_valid', false)), false);
  assert.equal(modeOf(contract('construction_valid', false)), 'A');
  // not-yet-monitored (undefined) → treated as not passing → Mode A
  assert.equal(isFdrBearing(contract('construction_valid', undefined)), false);
});

test('assertFdrEligible THROWS for construction_valid with a failing/absent monitor', () => {
  delete process.env.CS_ALLOW_UNVALIDATED;
  assert.throws(() => assertFdrEligible(contract('construction_valid', false), 'unit'), /calibration monitor is FAILING/);
  assert.throws(() => assertFdrEligible(contract('construction_valid', undefined), 'unit'), /no live calibration monitor/);
});

test('empirically_audited / heuristic / rca_only are NOT FDR-bearing (Mode A) and THROW', () => {
  delete process.env.CS_ALLOW_UNVALIDATED;
  for (const vc of ['empirically_audited', 'heuristic', 'rca_only'] as ValidityClass[]) {
    const c = contract(vc);
    assert.equal(isFdrBearing(c), false, vc);
    assert.equal(modeOf(c), 'A', vc);
    assert.throws(() => assertFdrEligible(c, 'unit'), /not FDR-bearing|not admitted/, vc);
  }
});

test('CS_ALLOW_UNVALIDATED=1 overrides (plumbing only) — does not throw on an unvalidated emitter', () => {
  process.env.CS_ALLOW_UNVALIDATED = '1';
  try {
    assert.doesNotThrow(() => assertFdrEligible(contract('empirically_audited'), 'unit'));
  } finally {
    delete process.env.CS_ALLOW_UNVALIDATED;
  }
});

test('fdrBenjaminiHochberg gates before selecting: throws on Mode-A emitter, selects on Mode-B', () => {
  delete process.env.CS_ALLOW_UNVALIDATED;
  const evalues = [0.1, 0.2, 50, 100]; // two large e-values
  assert.throws(() => fdrBenjaminiHochberg(evalues, 0.1, contract('empirically_audited'), 'unit'), /NOT admitted/);
  const out = fdrBenjaminiHochberg(evalues, 0.1, contract('theorem_valid'), 'unit');
  assert.ok(out.K >= 1 && out.selected.length === out.K);
});

test('routeEmitters partitions a fleet into Mode B vs Mode A', () => {
  const { modeB, modeA } = routeEmitters([
    contract('theorem_valid'),
    contract('construction_valid', true),
    contract('construction_valid', false),
    contract('empirically_audited'),
    contract('heuristic'),
  ]);
  assert.equal(modeB.length, 2);
  assert.equal(modeA.length, 3);
});

test('only theorem_valid and construction_valid are the FDR-bearing classes', () => {
  assert.deepEqual([...FDR_BEARING_CLASSES].sort(), ['construction_valid', 'theorem_valid']);
});
