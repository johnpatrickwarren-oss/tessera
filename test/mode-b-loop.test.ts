// test/mode-b-loop.test.ts — the always-on Mode B control loop must enforce the operational invariants of
// ADR 0019: an action keyed to an FDR guarantee is dispatched ONLY while the guarantee is live, is
// debounced, is withdrawn when the discovery resolves, and is withdrawn when the guarantee is REVOKED
// (construction validity breaks). The calibration monitors accumulate across cycles (anytime-valid).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import { ModeBLoop, RecordingSink, type EmitterCycle } from '../tools/mode-b-loop.js';
import type { EmitterContract } from '../tools/emitter-contract.js';

const N = 10; // detection units (shards) per emitter
const COHORT = 10; // concurrent-control units feeding the calibration monitors
const PER_CYCLE = 40; // calibration residuals per control unit per cycle

function emitter(id: string): EmitterContract {
  return {
    id, baselineVersion: 'v', conditioningVariables: ['control'], residualizer: 'contrast',
    increment: 'normalized-mixture', stoppingAggregation: 'e-BH', horizon: 'w', validityClass: 'construction_valid',
  };
}

/** A cohort of control residuals for one cycle: COHORT streams of PER_CYCLE N(mu,1) samples. */
function cohort(seed: number, mu = 0): number[][] {
  const rng = mulberry32(seed);
  return Array.from({ length: COHORT }, () => Array.from({ length: PER_CYCLE }, () => mu + gaussian(rng)));
}

/** A detection e-value vector with `hot` shards firing a huge e-value (selectable by e-BH) and the rest null. */
function eValues(hot: number[]): number[] {
  return Array.from({ length: N }, (_, i) => (hot.includes(i) ? 1e8 : 0.5));
}

const SHARDS = Array.from({ length: N }, (_, i) => `s${i}`);
function cyc(id: string, ev: number[], cal: number[][], whitenessPass = true): EmitterCycle {
  return { contract: emitter(id), shards: SHARDS, eValues: ev, calibrationSamples: cal, whitenessPass };
}

test('NO ACTION WITHOUT A LIVE GUARANTEE — a Mode-A emitter never dispatches, however large its e-values', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  // whiteness fails → construction invalid → Mode A, despite a giant e-value on s0
  const r = loop.step(0, [cyc('e', eValues([0]), cohort(1), /*whitenessPass*/ false)]);
  assert.equal(r.emitters[0].mode, 'A');
  assert.equal(r.emitters[0].dispatched, 0);
  assert.equal(sink.dispatched.length, 0, 'no action may be emitted without the guarantee');
});

test('Mode B dispatches an FDR-controlled discovery (healthy construction)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r = loop.step(0, [cyc('e', eValues([0]), cohort(1), true)]);
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[0].constructionValid, true);
  assert.equal(r.emitters[0].dispatched, 1);
  assert.equal(sink.dispatched.length, 1);
  assert.deepEqual({ emitter: sink.dispatched[0].emitter, shard: sink.dispatched[0].shard }, { emitter: 'e', shard: 's0' });
});

test('DEBOUNCE — a still-standing discovery is dispatched once, not re-fired each cycle', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  for (let c = 0; c < 5; c++) loop.step(c, [cyc('e', eValues([0]), cohort(100 + c), true)]);
  assert.equal(sink.dispatched.length, 1, 'one dispatch total across 5 cycles of the same standing discovery');
  assert.equal(sink.withdrawn.length, 0);
});

test('RESOLUTION WITHDRAWS — a discovery that disappears while still Mode B is withdrawn (resolved)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0]), cohort(1), true)]); // s0 fires
  const r = loop.step(1, [cyc('e', eValues([]), cohort(2), true)]); // nothing fires now, still Mode B
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[0].withdrawn, 1);
  assert.equal(sink.withdrawn.length, 1);
  assert.equal(sink.withdrawn[0].reason, 'resolved');
});

test('REVOCATION WITHDRAWS — when the guarantee is revoked (B→A) all standing actions are withdrawn (revoked)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0, 1]), cohort(1), true)]); // two discoveries fire (Mode B)
  assert.equal(sink.dispatched.length, 2);
  const r = loop.step(1, [cyc('e', eValues([0, 1]), cohort(2), /*whitenessPass*/ false)]); // guarantee lost
  assert.equal(r.emitters[0].mode, 'A');
  assert.equal(r.emitters[0].modeChanged, true);
  assert.equal(r.emitters[0].withdrawn, 2, 'both standing actions withdrawn on revoke');
  assert.equal(sink.withdrawn.length, 2);
  for (const w of sink.withdrawn) assert.equal(w.reason, 'revoked');
});

test('ANYTIME-VALID ACCUMULATION — drifting control residuals revoke after evidence accrues across cycles', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  // SMALL per-cycle samples + mild drift: no single cycle crosses, but the monitors ACCUMULATE across
  // cycles and a broad fraction crosses after a few — so the emitter fires while valid, then revokes.
  const drift = (seed: number): number[][] => Array.from({ length: COHORT }, (_, i) => { const r = mulberry32(seed * 131 + i * 7); return Array.from({ length: 8 }, () => 1.0 + gaussian(r)); });
  let revokedAt = -1, firstMode = '';
  for (let c = 0; c < 16; c++) {
    const r = loop.step(c, [cyc('e', eValues([0]), drift(c + 1), true)]);
    if (c === 0) firstMode = r.emitters[0].mode;
    if (r.emitters[0].mode === 'A' && revokedAt < 0) revokedAt = c;
  }
  assert.equal(firstMode, 'B', 'one cycle of mild drift does not yet revoke — fires while valid');
  assert.ok(revokedAt >= 1, `accumulates across cycles → revokes (at cycle ${revokedAt})`);
  assert.equal(sink.dispatched.length, 1, 'fired once while valid');
  assert.equal(sink.withdrawn[0]?.reason, 'revoked', 'and withdrawn when the accumulated monitor crosses');
});

test('healthy control residuals keep the construction valid across many cycles (low false-revocation)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  let everA = false;
  for (let c = 0; c < 20; c++) { const r = loop.step(c, [cyc('e', eValues([0]), cohort(900 + c, 0), true)]); if (r.emitters[0].mode === 'A') everA = true; }
  assert.equal(everA, false, 'a genuinely-null control cohort should not spuriously revoke over 20 cycles');
  assert.equal(sink.withdrawn.length, 0);
});

test('REARM re-establishes a revoked construction (fresh anytime-valid monitors)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0]), cohort(1), true)]);
  loop.step(1, [cyc('e', eValues([0]), cohort(2), false)]); // revoked (whiteness) → withdrawn
  assert.equal(loop.step(2, [cyc('e', eValues([0]), cohort(3), true)]).emitters[0].mode, 'B', 'whiteness back → Mode B again');
  // a drift-poisoned monitor stays revoked until rearm (mu strong enough to cross the healthy buffer)
  for (let c = 3; c < 12; c++) loop.step(c, [cyc('e', eValues([0]), cohort(700 + c, 1.5), true)]);
  assert.equal(loop.step(12, [cyc('e', eValues([0]), cohort(50), true)]).emitters[0].mode, 'A', 'sticky monitor stays revoked on healthy data');
  loop.rearm('e');
  assert.equal(loop.step(13, [cyc('e', eValues([0]), cohort(51), true)]).emitters[0].mode, 'B', 'rearm → fresh monitor → Mode B restored');
});

test('two emitters route independently in the same cycle (parallel, per-emitter)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r = loop.step(0, [
    cyc('valid', eValues([0]), cohort(1), true),    // Mode B → dispatches
    cyc('broken', eValues([0]), cohort(2), false),  // Mode A → abstains
  ]);
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[1].mode, 'A');
  assert.equal(sink.dispatched.length, 1);
  assert.equal(sink.dispatched[0].emitter, 'valid');
});


// ── ADR 0033 (engine ADR 0035): the engine gate's tail premise, measured by the loop ─────────────────

function enveloped(id: string, lightTails = false): EmitterContract {
  return { ...emitter(id), engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true, ...(lightTails ? { lightTails: true } : {}) } } };
}
/** A t3 cohort (unit variance): the Gaussian increment's mean is 1.6 on it (engine h0-battery A6). */
function heavyCohort(seed: number): number[][] {
  const rng = mulberry32(seed);
  const t3 = () => { const z = gaussian(rng); const chi = gaussian(rng) ** 2 + gaussian(rng) ** 2 + gaussian(rng) ** 2; return (z / Math.sqrt(chi / 3)) / Math.sqrt(3); };
  return Array.from({ length: COHORT }, () => Array.from({ length: PER_CYCLE }, t3));
}

test('ADR 0033: a contract naming the envelope is REFUSED on a short Gaussian cohort without the promise — inconclusive, Mode A, no dispatch, reason on the report', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r = loop.step(0, [{ contract: enveloped('e'), shards: SHARDS, eValues: eValues([0]), calibrationSamples: cohort(1), whitenessPass: true }]);
  const e = r.emitters[0];
  assert.equal(e.engineGate, 'refused');
  assert.match(e.engineRefusal ?? '', /inconclusive/);
  assert.equal(e.incrementMean?.n, COHORT * PER_CYCLE);
  assert.equal(e.constructionValid, true, 'the monitors pass — this is the ENGINE gate refusing, not the contract gate');
  assert.equal(e.mode, 'A');
  assert.equal(sink.dispatched.length, 0);
});

test('ADR 0033: with the promise the same cohort is admitted and dispatches; a heavy-tailed cohort then REFUTES the promise and the action is withdrawn as revoked', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r0 = loop.step(0, [{ contract: enveloped('e', true), shards: SHARDS, eValues: eValues([0]), calibrationSamples: cohort(1), whitenessPass: true }]);
  assert.equal(r0.emitters[0].engineGate, 'admitted');
  assert.equal(r0.emitters[0].mode, 'B');
  assert.equal(sink.dispatched.length, 1);
  // three cycles of t3 residuals: 1,200 more increments at E[g] = 1.6 pull the pooled lower bound above 1.0005
  let last = r0;
  for (let c = 1; c <= 3; c++) last = loop.step(c, [{ contract: enveloped('e', true), shards: SHARDS, eValues: eValues([0]), calibrationSamples: heavyCohort(100 + c), whitenessPass: true }]);
  const e = last.emitters[0];
  assert.equal(e.engineGate, 'refused', `expected the measurement to refute; interval ${JSON.stringify(e.incrementMean)}`);
  assert.match(e.engineRefusal ?? '', /REFUTES.*no promise overrides/s);
  assert.equal(e.mode, 'A');
  assert.equal(sink.withdrawn.length, 1);
  assert.equal(sink.withdrawn[0].reason, 'revoked');
  // rearm drops the estimator with the monitors: a fresh Gaussian cohort is inconclusive again, not refuted
  loop.rearm('e');
  const r5 = loop.step(5, [{ contract: enveloped('e', true), shards: SHARDS, eValues: eValues([0]), calibrationSamples: cohort(9), whitenessPass: true }]);
  assert.equal(r5.emitters[0].engineGate, 'admitted');
});

test('ADR 0033: a contract naming no envelope is not-declared and unchanged', () => {
  const loop = new ModeBLoop({ q: 0.1, sink: new RecordingSink() });
  const r = loop.step(0, [cyc('e', eValues([0]), cohort(1), true)]);
  assert.equal(r.emitters[0].engineGate, 'not-declared');
  assert.equal(r.emitters[0].mode, 'B');
});
