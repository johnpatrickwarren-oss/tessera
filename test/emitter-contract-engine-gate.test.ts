// test/emitter-contract-engine-gate.test.ts — ADR 0032: Mode-B FDR claims through the engine's
// guarded e-BH when the contract names its engine envelope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { certifiedFdrBenjaminiHochberg, engineAdmission, type EmitterContract } from '../tools/emitter-contract.js';
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

test('a contract naming its engine envelope with the regime AND the tail premise asserted is admitted, and says so', () => {
  const sel = certifiedFdrBenjaminiHochberg(inputs, 0.1, base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true, lightTails: true } } }), 'gate-test');
  assert.equal(sel.engineGate, 'admitted');
  assert.deepEqual(sel.selected, certifiedFdrBenjaminiHochberg(inputs, 0.1, base({}), 'gate-test').selected, 'same selection as the ungated path when admitted');
});

test('ADR 0033 (engine ADR 0035): fit ≫ horizon alone is refused by name — the envelope carries the mgf tail premise', () => {
  const c = base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true } } });
  assert.throws(() => certifiedFdrBenjaminiHochberg(inputs, 0.1, c, 'gate-test'), /mgf exists.*no increment mean was measured/s);
  assert.deepEqual(engineAdmission(c).gate, 'refused');
});

test('ADR 0033: the runtime incrementMean rides with the static assertions — a clearance admits without a promise, a refutation refuses over one', () => {
  const cleared = base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true } }, incrementMean: { lower95: 0.9952, upper95: 0.9983, n: 4_000_000 } });
  assert.equal(certifiedFdrBenjaminiHochberg(inputs, 0.1, cleared, 'gate-test').engineGate, 'admitted');
  const refuted = base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true, lightTails: true } }, incrementMean: { lower95: 1.5997, upper95: 1.6157, n: 4_000_000 } });
  assert.throws(() => certifiedFdrBenjaminiHochberg(inputs, 0.1, refuted, 'gate-test'), /REFUTES.*no promise overrides/s);
  assert.match(engineAdmission(refuted).reason ?? '', /REFUTES/);
  const inconclusive = base({ engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true } }, incrementMean: { lower95: 0.99, upper95: 1.01, n: 400 } });
  assert.match(engineAdmission(inconclusive).reason ?? '', /inconclusive/);
  assert.equal(engineAdmission(base({})).gate, 'not-declared');
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
  // ADR 0033: clustersynth promises lightTails on a stated ground (its generator draws Gaussian innovations);
  // a live feed promises nothing by default — the loop measures — unless the deployment states the ground.
  assert.equal(clustersynthModeBEmitter(true).engineEnvelope?.assertions?.lightTails, true);
  assert.equal(liveModeBEmitter('nvlink_errors').engineEnvelope?.assertions?.lightTails, undefined);
  assert.equal(liveModeBEmitter('nvlink_errors', { lightTails: true }).engineEnvelope?.assertions?.lightTails, true);
  assert.deepEqual(clustersynthModeBEmitter(true, { lower95: 0.99, upper95: 1.01, n: 10 }).incrementMean, { lower95: 0.99, upper95: 1.01, n: 10 });
  assert.equal(controlContrastEmitter(true).engineEnvelope, undefined);
  assert.equal(canaryEmitter(true).engineEnvelope, undefined);
});
