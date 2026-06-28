// test/mode-b-loop.test.ts — the always-on Mode B control loop must enforce the operational invariants of
// ADR 0019: an action keyed to an FDR guarantee is dispatched ONLY while the guarantee is live, is
// debounced, is withdrawn when the discovery resolves, and is withdrawn when the guarantee is REVOKED
// (construction validity breaks). The per-shard calibration monitors accumulate across cycles
// (anytime-valid) and — since ADR 0020 — test BOTH marginal calibration AND serial dependence, so
// construction validity is decided entirely from the control-cohort residuals (no separate whiteness gate).

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

/** A HEALTHY control cohort for one cycle: COHORT streams of PER_CYCLE iid N(mu,1) samples (mu=0 = null). */
function cohort(seed: number, mu = 0): number[][] {
  const rng = mulberry32(seed);
  return Array.from({ length: COHORT }, () => Array.from({ length: PER_CYCLE }, () => mu + gaussian(rng)));
}

/** A BROKEN control cohort: a strong marginal mean shift that the combined monitor revokes within one
 *  cycle (the fast, marginal way to force construction-invalid → Mode A). */
function brokenCohort(seed: number): number[][] {
  return cohort(seed, 4);
}

/** A SERIALLY-DEPENDENT control cohort: AR(1) ρ=0.9, marginally ~unit-variance — a pure serial break the
 *  OLD marginal-only monitor was blind to. The wired combined monitor (ADR 0020) revokes it via its serial
 *  component as evidence accumulates across cycles. */
function serialCohort(seed: number): number[][] {
  const rho = 0.9, s = Math.sqrt(1 - rho * rho);
  const rng = mulberry32(seed);
  return Array.from({ length: COHORT }, () => {
    let x = gaussian(rng);
    return Array.from({ length: PER_CYCLE }, () => { x = rho * x + s * gaussian(rng); return x; });
  });
}

/** A detection e-value vector with `hot` shards firing a huge e-value (selectable by e-BH) and the rest null. */
function eValues(hot: number[]): number[] {
  return Array.from({ length: N }, (_, i) => (hot.includes(i) ? 1e8 : 0.5));
}

const SHARDS = Array.from({ length: N }, (_, i) => `s${i}`);
function cyc(id: string, ev: number[], cal: number[][]): EmitterCycle {
  return { contract: emitter(id), shards: SHARDS, eValues: ev, calibrationSamples: cal };
}

test('NO ACTION WITHOUT A LIVE GUARANTEE — a Mode-A emitter never dispatches, however large its e-values', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  // a broken control cohort → construction invalid → Mode A, despite a giant e-value on s0
  const r = loop.step(0, [cyc('e', eValues([0]), brokenCohort(1))]);
  assert.equal(r.emitters[0].mode, 'A');
  assert.equal(r.emitters[0].dispatched, 0);
  assert.equal(sink.dispatched.length, 0, 'no action may be emitted without the guarantee');
});

test('Mode B dispatches an FDR-controlled discovery (healthy construction)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r = loop.step(0, [cyc('e', eValues([0]), cohort(1))]);
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[0].constructionValid, true);
  assert.equal(r.emitters[0].dispatched, 1);
  assert.equal(sink.dispatched.length, 1);
  assert.deepEqual({ emitter: sink.dispatched[0].emitter, shard: sink.dispatched[0].shard }, { emitter: 'e', shard: 's0' });
});

test('DEBOUNCE — a still-standing discovery is dispatched once, not re-fired each cycle', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  for (let c = 0; c < 5; c++) loop.step(c, [cyc('e', eValues([0]), cohort(100 + c))]);
  assert.equal(sink.dispatched.length, 1, 'one dispatch total across 5 cycles of the same standing discovery');
  assert.equal(sink.withdrawn.length, 0);
});

test('RESOLUTION WITHDRAWS — a discovery that disappears while still Mode B is withdrawn (resolved)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0]), cohort(1))]); // s0 fires
  const r = loop.step(1, [cyc('e', eValues([]), cohort(2))]); // nothing fires now, still Mode B
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[0].withdrawn, 1);
  assert.equal(sink.withdrawn.length, 1);
  assert.equal(sink.withdrawn[0].reason, 'resolved');
});

test('REVOCATION WITHDRAWS — when the guarantee is revoked (B→A) all standing actions are withdrawn (revoked)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0, 1]), cohort(1))]); // two discoveries fire (Mode B)
  assert.equal(sink.dispatched.length, 2);
  const r = loop.step(1, [cyc('e', eValues([0, 1]), brokenCohort(2))]); // construction breaks → guarantee lost
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
    const r = loop.step(c, [cyc('e', eValues([0]), drift(c + 1))]);
    if (c === 0) firstMode = r.emitters[0].mode;
    if (r.emitters[0].mode === 'A' && revokedAt < 0) revokedAt = c;
  }
  assert.equal(firstMode, 'B', 'one cycle of mild drift does not yet revoke — fires while valid');
  assert.ok(revokedAt >= 1, `accumulates across cycles → revokes (at cycle ${revokedAt})`);
  assert.equal(sink.dispatched.length, 1, 'fired once while valid');
  assert.equal(sink.withdrawn[0]?.reason, 'revoked', 'and withdrawn when the accumulated monitor crosses');
});

test('SERIAL DEPENDENCE REVOKES — a serially-dependent control cohort the marginal monitor was blind to is caught (ADR 0020 wiring)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  // AR(1) ρ=0.9, marginally ~N(0,1): the OLD marginal-only monitor would keep this Mode B forever; the
  // wired combined monitor revokes via its serial component as evidence accumulates.
  let revokedAt = -1;
  for (let c = 0; c < 20; c++) {
    const r = loop.step(c, [cyc('e', eValues([0]), serialCohort(c + 1))]);
    if (r.emitters[0].mode === 'A' && revokedAt < 0) revokedAt = c;
  }
  assert.ok(revokedAt >= 0, `serial dependence should revoke the construction (revoked at ${revokedAt})`);
  assert.equal(sink.withdrawn.at(-1)?.reason, 'revoked', 'the standing action is withdrawn on the serial revoke');
});

test('healthy control residuals keep the construction valid across many cycles (low false-revocation)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  let everA = false;
  for (let c = 0; c < 20; c++) { const r = loop.step(c, [cyc('e', eValues([0]), cohort(900 + c, 0))]); if (r.emitters[0].mode === 'A') everA = true; }
  assert.equal(everA, false, 'a genuinely-null control cohort should not spuriously revoke over 20 cycles');
  assert.equal(sink.withdrawn.length, 0);
});

test('REARM re-establishes a revoked construction (fresh anytime-valid monitors)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([0]), cohort(1))]); // Mode B → dispatch
  assert.equal(sink.dispatched.length, 1);
  // break the construction → revoke (sticky) → withdraw
  let r = loop.step(1, [cyc('e', eValues([0]), brokenCohort(2))]);
  assert.equal(r.emitters[0].mode, 'A');
  assert.equal(sink.withdrawn.at(-1)?.reason, 'revoked');
  // healthy data does NOT un-revoke a sticky monitor
  assert.equal(loop.step(2, [cyc('e', eValues([0]), cohort(50))]).emitters[0].mode, 'A', 'sticky monitor stays revoked on healthy data');
  loop.rearm('e');
  assert.equal(loop.step(3, [cyc('e', eValues([0]), cohort(51))]).emitters[0].mode, 'B', 'rearm → fresh monitor → Mode B restored');
});

test('two emitters route independently in the same cycle (parallel, per-emitter)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const r = loop.step(0, [
    cyc('valid', eValues([0]), cohort(1)),       // healthy → Mode B → dispatches
    cyc('broken', eValues([0]), brokenCohort(2)), // broken control → Mode A → abstains
  ]);
  assert.equal(r.emitters[0].mode, 'B');
  assert.equal(r.emitters[1].mode, 'A');
  assert.equal(sink.dispatched.length, 1);
  assert.equal(sink.dispatched[0].emitter, 'valid');
});
