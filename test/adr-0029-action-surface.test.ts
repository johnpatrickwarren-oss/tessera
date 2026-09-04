// ADR 0029 — margins and e-BY effect intervals on the Mode-B action surface.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import { ModeBLoop, RecordingSink, CS_SIGMA_SQUARED_PRIOR, type EmitterCycle, type FleetAction } from '../tools/mode-b-loop.js';
import { JsonlAuditSink } from '../tools/action-sinks.js';
import { certifiedFdrBenjaminiHochberg, type EmitterContract } from '../tools/emitter-contract.js';
import { eFromGeometricMixture } from '../tools/e-value.js';
import { windowToEmitter, type TelemetryFeed, type RawCounterWindow } from '../tools/telemetry-source.js';
import { fitContrast, type ContrastFit } from '../tools/contrast.js';
import { mixtureConfidenceSequenceAt } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/mixture-confidence-sequence';

const N = 10, COHORT = 10, PER_CYCLE = 40;
const emitter = (id: string): EmitterContract => ({ id, baselineVersion: 'v', conditioningVariables: ['control'], residualizer: 'contrast', increment: 'normalized-mixture', stoppingAggregation: 'e-BH', horizon: 'w', validityClass: 'construction_valid' });
const cohort = (seed: number, mu = 0): number[][] => { const rng = mulberry32(seed); return Array.from({ length: COHORT }, () => Array.from({ length: PER_CYCLE }, () => mu + gaussian(rng))); };
const eValues = (hot: number[]): number[] => Array.from({ length: N }, (_, i) => (hot.includes(i) ? 1e8 : 0.5));
const SHARDS = Array.from({ length: N }, (_, i) => `s${i}`);
const cyc = (id: string, ev: number[], cal: number[][], csInputs?: EmitterCycle['csInputs']): EmitterCycle => ({ contract: emitter(id), shards: SHARDS, eValues: ev, calibrationSamples: cal, whitenessPass: true, ...(csInputs ? { csInputs } : {}) });

test('certifiedFdrBenjaminiHochberg carries the e-BH threshold and per-input margins; margin sign reproduces the selection', () => {
  const c: EmitterContract = { ...emitter('e'), calibrationMonitorPassing: true };
  const ev = eValues([2, 7]).map(eFromGeometricMixture);
  const sel = certifiedFdrBenjaminiHochberg(ev, 0.1, c, 'test');
  assert.equal(sel.logMargins.length, N);
  assert.ok(Math.abs(sel.logThresholdE - Math.log(N / (0.1 * 2))) < 1e-12);
  for (let i = 0; i < N; i++) assert.equal(sel.logMargins[i] >= 0, sel.selected.includes(i), `shard ${i}`);
});

test('a cycle without csInputs dispatches the pre-0029 shape plus the two diagnostic margin fields, and no interval (Amendment A1)', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  loop.step(0, [cyc('e', eValues([3]), cohort(1))]);
  assert.equal(sink.dispatched.length, 1);
  const a = sink.dispatched[0];
  assert.deepEqual(Object.keys(a).sort(), ['cycle', 'eValue', 'emitter', 'logMargin', 'logThresholdE', 'q', 'shard']);
  assert.ok(a.logMargin! >= 0 && !('effect' in a));
});

test('with csInputs a dispatched action carries margin, threshold and an e-BY interval at fcrDelta·|S′|/K equal to the closed form', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, fcrDelta: 0.05, sink });
  const cs = SHARDS.map((_, i) => (i === 3 ? { S_t: 150, t: 300 } : i === 5 ? null : { S_t: 2, t: 300 }));
  const rep = loop.step(0, [cyc('e', eValues([3, 5]), cohort(2), cs)]);
  assert.equal(sink.dispatched.length, 2);
  assert.ok(typeof rep.emitters[0].logThresholdE === 'number');
  const a3 = sink.dispatched.find((a) => a.shard === 's3')!, a5 = sink.dispatched.find((a) => a.shard === 's5')!;
  assert.ok(a3.logMargin! >= 0 && a5.logMargin! >= 0);
  assert.equal(a3.logThresholdE, rep.emitters[0].logThresholdE);
  // S′ = {s3} (s5 has no inputs): α_i = 0.05·1/10
  assert.ok(Math.abs(a3.effect!.alphaI - 0.05 / N) < 1e-15);
  const ref = mixtureConfidenceSequenceAt({ S_t: 150, t: 300, sigma_squared: 1, sigma_squared_prior: CS_SIGMA_SQUARED_PRIOR }, 0.05 / N);
  assert.ok(Math.abs(a3.effect!.halfWidth - ref.half_width) < 1e-12 && Math.abs(a3.effect!.center - 0.5) < 1e-12);
  assert.ok(a3.effect!.lower > 0, 'a shifted shard excludes 0');
  assert.equal(a5.effect, undefined, 'no inputs, no interval — but still dispatched with its margin');
});

test('a Mode-A emitter dispatches nothing and carries no interval, whatever its inputs', () => {
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const cs = SHARDS.map(() => ({ S_t: 100, t: 300 }));
  const rep = loop.step(0, [{ ...cyc('e', eValues([1]), cohort(3), cs), whitenessPass: false }]);
  assert.equal(rep.emitters[0].mode, 'A'); assert.equal(sink.dispatched.length, 0); assert.equal(rep.emitters[0].logThresholdE, undefined);
});

test('JsonlAuditSink writes the ADR 0029 fields only when the action carries them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr0029-'));
  const file = path.join(dir, 'audit.jsonl');
  const sink = new JsonlAuditSink(file);
  const plain: FleetAction = { emitter: 'e', shard: 's1', cycle: 0, eValue: 5, q: 0.1 };
  const rich: FleetAction = { ...plain, shard: 's2', logMargin: 0.3, logThresholdE: 2.1, effect: { alphaI: 0.01, t: 300, center: 0.2, halfWidth: 0.1, lower: 0.1, upper: 0.3 } };
  sink.dispatch(plain); sink.dispatch(rich); sink.withdraw(rich, 'resolved');
  const recs = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(recs[0], { op: 'dispatch', emitter: 'e', shard: 's1', cycle: 0, eValue: 5, q: 0.1 });
  assert.equal(recs[1].logMargin, 0.3); assert.equal(recs[1].effect.center, 0.2); assert.equal(recs[2].reason, 'resolved'); assert.equal(recs[2].effect.upper, 0.3);
});

test('windowToEmitter fills csInputs from the standardized window where a baseline fit exists, null where it self-fits', () => {
  const rng = mulberry32(7);
  const series = (n: number, shift = 0): number[] => { let prev = 0; return Array.from({ length: n }, () => { prev = 0.5 * prev + gaussian(rng); return prev + shift; }); };
  const fits = new Map<string, ContrastFit>();
  fits.set('s0', fitContrast(series(800).map((x, i) => x - series(1)[0] * 0)));
  const win: RawCounterWindow = { counter: 'c', detection: [
    { shard: 's0', treatment: series(300, 8), control: series(300) },
    { shard: 's1', treatment: series(300), control: series(300) },
  ], cohort: [{ treatment: series(300), control: series(300) }] };
  const feed = { async baseline() { return { dtSeconds: 3600, counters: [] }; }, async poll() { return null; } } as TelemetryFeed;
  const ec = windowToEmitter(win, fits, feed);
  assert.equal(ec.csInputs!.length, 2);
  assert.equal(ec.csInputs![0]!.t, 300); assert.ok(ec.csInputs![0]!.S_t / 300 > 1, 'the faulted shard has a large mean residual');
  assert.equal(ec.csInputs![1], null, 'self-fitted shard carries no inputs');
});
