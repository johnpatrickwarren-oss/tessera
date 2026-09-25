// test/emitter-contract-engine-gate.test.ts — ADR 0032: Mode-B FDR claims through the engine's
// guarded e-BH when the contract names its engine envelope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { certifiedFdrBenjaminiHochberg, type EmitterContract } from '../tools/emitter-contract.js';
import { eFromNormalizedMixture } from '../tools/e-value.js';
import { clustersynthModeBEmitter } from '../tools/clustersynth-mode-b.js';
import { liveModeBEmitter } from '../tools/telemetry-source.js';
import { controlContrastEmitter } from '../tools/mode-b-control.js';
import { canaryEmitter } from '../tools/canary-sim.js';
import { normalizedMixtureEValue, geometricMixtureEValue } from '../tools/mixture-evalue.js';
import { supAdjuster } from '../tools/supfdr.js';
import * as engineMix from '@johnpatrickwarren-oss/deploysignal-engine/detectors/onset-mixture-e-value';

const base = (over: Partial<EmitterContract>): EmitterContract => ({
  id: 'test/emitter', baselineVersion: 'b', conditioningVariables: [], residualizer: 'r', increment: 'i',
  stoppingAggregation: 's', horizon: 'h', validityClass: 'construction_valid', calibrationMonitorPassing: true, ...over,
});
const inputs = [50, 0.2, 30, 0.1].map(eFromNormalizedMixture);

test('the mixture e-value objects and the adjuster reached through tools/ are the engine functions', () => {
  assert.equal(normalizedMixtureEValue, engineMix.normalizedMixtureEValue);
  assert.equal(geometricMixtureEValue, engineMix.geometricMixtureEValue);
  assert.equal(supAdjuster, engineMix.supAdjuster);
});

test('a contract naming its engine envelope with the regime asserted is admitted, and says so', () => {
  const sel = certifiedFdrBenjaminiHochberg(inputs, 0.1, base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true } } }), 'gate-test');
  assert.equal(sel.engineGate, 'admitted');
  assert.deepEqual(sel.selected, certifiedFdrBenjaminiHochberg(inputs, 0.1, base({}), 'gate-test').selected, 'same selection as the ungated path when admitted');
});

test('the same contract WITHOUT the regime assertion is refused by name — the guard throws', () => {
  assert.throws(
    () => certifiedFdrBenjaminiHochberg(inputs, 0.1, base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian' } }), 'gate-test'),
    /outside its validity regime/,
  );
});

test('a contract naming an envelope the engine does not have is refused, not admitted', () => {
  assert.throws(
    () => certifiedFdrBenjaminiHochberg(inputs, 0.1, base({ engineEnvelope: { detectorId: 'conformal_rank_calibrated' } }), 'gate-test'),
    /no validity envelope/,
  );
});

test('a contract with no engine envelope runs the ungated path and records it', () => {
  assert.equal(certifiedFdrBenjaminiHochberg(inputs, 0.1, base({}), 'gate-test').engineGate, 'not-declared');
});

test('the production contracts: the two with a ≥ 2-month fit assert fit ≫ horizon; the prefix-standardised control and the conformal-rank canary declare none', () => {
  for (const c of [clustersynthModeBEmitter(true), liveModeBEmitter('nvlink_errors')]) {
    assert.equal(c.engineEnvelope?.detectorId, 'onset_mixture_gaussian', c.id);
    assert.equal(c.engineEnvelope?.assertions?.mMuchGreaterThanN, true, c.id);
  }
  assert.equal(controlContrastEmitter(true).engineEnvelope, undefined);
  assert.equal(canaryEmitter(true).engineEnvelope, undefined);
});
