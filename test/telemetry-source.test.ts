// test/telemetry-source.test.ts — the LIVE source adapter (ADR 0019 deploy, INPUT seam). The seam must
// (a) turn raw treatment/control windows into the loop's EmitterCycle with the SAME validated contrast
// math, (b) enforce the ≥2-month baseline guard on the healthy window, and (c) drive the loop end-to-end
// over an ASYNC feed, draining a buffered sink each cycle. A synthetic feed exercises the invariants; the
// clustersynth reference feed (bundleFeed) proves the path on real topology.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import { ModeBLoop, RecordingSink } from '../tools/mode-b-loop.js';
import { FanOutSink, JsonlAuditSink, WebhookActionSink, type FetchLike } from '../tools/action-sinks.js';
import {
  liveCycles, runModeBLoopLive, windowToEmitter, liveModeBEmitter, bundleFeed,
  type TelemetryFeed, type RawCounterWindow,
} from '../tools/telemetry-source.js';
import { fitContrast, type ContrastFit } from '../tools/clustersynth-mode-b.js';

const COUNTER = 'power_w';
const SHARDS = ['s0', 's1', 's2', 's3', 's4'];
const series = (len: number, rng: () => number, add = 0): number[] => Array.from({ length: len }, () => add + gaussian(rng));

/** A synthetic live feed: a long healthy baseline, a monitoring window where `faulted` shards carry a
 *  sustained mean shift in the treatment (so the contrast survives centering), and a healthy known-null
 *  cohort (the baseline replayed in per-cycle slices). */
function syntheticFeed(baseLen: number, dt: number, monT: number, nCycles: number, faulted: Set<string>, shift: number): TelemetryFeed {
  const rng = mulberry32(42);
  const baseT = new Map<string, number[]>(), baseC = new Map<string, number[]>(), monTr = new Map<string, number[]>(), monC = new Map<string, number[]>();
  for (const s of SHARDS) {
    baseT.set(s, series(baseLen, rng)); baseC.set(s, series(baseLen, rng));
    monC.set(s, series(monT, rng)); monTr.set(s, series(monT, rng, faulted.has(s) ? shift : 0));
  }
  return {
    async baseline() {
      return { dtSeconds: dt, counters: [{ counter: COUNTER, units: SHARDS.map((s) => ({ shard: s, treatment: baseT.get(s)!, control: baseC.get(s)! })) }] };
    },
    async poll(k: number): Promise<RawCounterWindow[] | null> {
      if (k >= nCycles) return null;
      const monEnd = Math.floor(((k + 1) / nCycles) * monT);
      const lo = Math.floor((k / nCycles) * baseLen), hi = Math.floor(((k + 1) / nCycles) * baseLen);
      return [{
        counter: COUNTER,
        detection: SHARDS.map((s) => ({ shard: s, treatment: monTr.get(s)!.slice(0, monEnd), control: monC.get(s)!.slice(0, monEnd) })),
        cohort: SHARDS.map((s) => ({ treatment: baseT.get(s)!.slice(lo, hi), control: baseC.get(s)!.slice(lo, hi) })),
      }];
    },
  };
}

test('liveModeBEmitter is construction_valid with no static monitor flag (the loop sets it)', () => {
  const e = liveModeBEmitter('power_w');
  assert.equal(e.validityClass, 'construction_valid');
  assert.equal(e.id, 'live-mode-b/power_w');
  assert.equal(e.calibrationMonitorPassing, undefined, 'membership is decided live by the loop, not stamped here');
});

test('windowToEmitter: a fault (shift vs the baseline fit) yields a huge contrast e-value, healthy ~null', () => {
  const rng = mulberry32(1);
  // The per-shard baseline fit comes from the HEALTHY contrast (centered near 0). The monitoring treatment
  // of the faulted shard carries a sustained shift → applyContrast standardizes against the baseline, so
  // the shift survives (it is NOT median-centered out, because the centering offset is the baseline's).
  const fits = new Map<string, ContrastFit>();
  for (const s of SHARDS) fits.set(s, fitContrast(series(800, rng))); // fit on a zero-mean healthy contrast
  const win: RawCounterWindow = {
    counter: COUNTER,
    detection: [
      { shard: 's0', treatment: series(300, rng, 8), control: series(300, rng) },  // faulted (shift vs baseline)
      { shard: 's1', treatment: series(300, rng), control: series(300, rng) },     // healthy
    ],
    cohort: SHARDS.map(() => ({ treatment: series(300, rng), control: series(300, rng) })),
  };
  const feed = { async baseline() { return { dtSeconds: 3600, counters: [] }; }, async poll() { return null; } } as TelemetryFeed;
  const ec = windowToEmitter(win, fits, feed);
  assert.deepEqual(ec.shards, ['s0', 's1']);
  assert.ok(ec.eValues[0] > 1e3, `faulted shard e-value ${ec.eValues[0]} should be large`);
  assert.ok(ec.eValues[1] < 100, `healthy shard e-value ${ec.eValues[1]} should be ~null`);
  assert.equal(ec.calibrationSamples.length, SHARDS.length);
  assert.equal(ec.contract.id, 'live-mode-b/power_w');
});

test('liveCycles enforces the ≥2-month baseline guard (short window throws)', async () => {
  const short = syntheticFeed(100, 3600, 240, 2, new Set(), 0); // 100×3600s ≈ 4.2 days
  await assert.rejects(
    () => runModeBLoopLive(short, new ModeBLoop({ q: 0.1, sink: new RecordingSink() })),
    /below the 56-day/,
  );
});

test('end-to-end live loop: the faulted shard is dispatched as an FDR-controlled action (Mode B)', async () => {
  const feed = syntheticFeed(1400, 3600, 240, 4, new Set(['s0']), 8); // 1400×3600s ≈ 58.3 days ≥ 56
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const reports = await runModeBLoopLive(feed, loop, sink);
  assert.equal(reports.at(-1)!.emitters[0].mode, 'B', 'healthy construction → Mode B');
  assert.equal(sink.dispatched.length, 1, 'exactly the one faulted shard is dispatched (debounced across cycles)');
  assert.equal(sink.dispatched[0].shard, 's0');
  assert.equal(sink.withdrawn.length, 0);
});

test('runModeBLoopLive drains a buffered sink each cycle (effects flush in order)', async () => {
  const posts: string[] = [];
  const fetchImpl: FetchLike = async (_u, init) => { posts.push(JSON.parse(init.body).op); return { ok: true, status: 200 }; };
  const webhook = new WebhookActionSink({ url: 'http://gate.local', fetchImpl });
  const recording = new RecordingSink();
  const sink = new FanOutSink([recording, webhook]); // drainable (webhook child)
  const loop = new ModeBLoop({ q: 0.1, sink });
  const feed = syntheticFeed(1400, 3600, 240, 4, new Set(['s0']), 8);
  await runModeBLoopLive(feed, loop, sink);
  assert.equal(recording.dispatched.length, 1);
  assert.deepEqual(posts, ['dispatch'], 'the dispatch was POSTed to the control plane via drain');
});

test('bundleFeed reference drives the live path on real clustersynth topology (Mode B, audit written)', async () => {
  process.env.CS_ALLOW_SHORT = '1'; // the committed mini fixture is hourly/1-rack (short window)
  try {
    const FIX = path.join(__dirname, '_substrate', 'clustersynth-mode-b-mini');
    const auditFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'live-')), 'actions.ndjson');
    const recording = new RecordingSink();
    const sink = new FanOutSink([recording, new JsonlAuditSink(auditFile)]);
    const loop = new ModeBLoop({ q: 0.1, sink });
    const reports = await runModeBLoopLive(bundleFeed(path.join(FIX, 'base'), path.join(FIX, 'mon'), 6), loop, sink);
    assert.ok(reports.length === 6, 'six cycles');
    const lastModes = reports.at(-1)!.emitters.map((e) => e.mode);
    assert.ok(lastModes.includes('B'), 'at least one counter holds a live Mode-B guarantee');
    assert.ok(recording.dispatched.length > 0, 'the contrast surfaces faulted shards as FDR-controlled actions');
    // every dispatched action landed on the durable audit trail
    const audit = fs.readFileSync(auditFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(audit.filter((r) => r.op === 'dispatch').length, recording.dispatched.length);
  } finally {
    delete process.env.CS_ALLOW_SHORT;
  }
});
