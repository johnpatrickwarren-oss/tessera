// test/probe-runner.test.ts — locks in the probe-pilot runner (SPEC-probe-pilot-apple-silicon.md).
//
// Relations, not levels (the standing N11 lesson):
//   1. jitter spacing lies in [base, 2·base) and is not degenerate — fixed spacing is the
//      theta-tau § 7 bug (pinned diurnal phase) and the jitter is load-bearing.
//   2. the block key OPENS A NEW EPOCH when any versioned component changes (OS build, binary
//      hash) and separates lanes and probes — never rank across any of these.
//   3. a round covers every slot, randomizes order, and writes BOTH files (scores + the
//      exclusion ledger the passive-baseline consumers excise).
//   4. the E lane goes through taskpolicy -b; the P lane does not.
//   5. errors = −1 (golden unset) is marked invalid — it must never reach a rank.
//   6. the daemon gate refuses to start before notBefore (the mini's 56-day window).
//   7. (hardware, skipped where the binary is absent) the real trio runs clean — errors 0 on
//      every lane — and the E lane is measurably slower than the P lane for the same kernel:
//      the QoS steering that stands in for core pinning actually steers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  DEFAULT_CONFIG, SLOTS, blockKey, collectHostKey, gateOk, nextDelayMs, runRound, spawnArgs,
  type Exec, type HostKey, type ProbeRunnerConfig,
} from '../tools/probe-runner.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOST: HostKey = { chip: 'Apple M5', hwModel: 'Mac17,2', osBuild: '25F84', binaryHash: 'a'.repeat(64) };

const fakeExec: Exec = (file, args) => {
  const probe = args[args.length - 1];
  const name = probe === 'p1' ? 'p1int' : probe === 'p4' ? 'p4mem' : 'p5gpu';
  return `{"probe":"${name}","duration_ns":1000,"errors":${probe === 'p4' ? -1 : 0},"checksum":"ff"}`;
};

function tmpCfg(): ProbeRunnerConfig {
  return { ...DEFAULT_CONFIG, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'probe-test-')) };
}

test('1. jitter: spacing in [base, 2·base), non-degenerate', () => {
  const r = rng(1);
  const base = 7_200_000;
  const draws = Array.from({ length: 500 }, () => nextDelayMs(base, r));
  for (const d of draws) assert.ok(d >= base && d < 2 * base);
  assert.ok(new Set(draws).size > 100, 'jitter must actually vary — fixed spacing is the H4 bug');
});

test('2. block key: epochs on version change; lanes and probes separate', () => {
  const k = blockKey(HOST, 'p1', 'P');
  assert.notEqual(k, blockKey({ ...HOST, osBuild: '25G99' }, 'p1', 'P'), 'OS update ⇒ new epoch');
  assert.notEqual(k, blockKey({ ...HOST, binaryHash: 'b'.repeat(64) }, 'p1', 'P'), 'binary ⇒ new epoch');
  assert.notEqual(k, blockKey(HOST, 'p1', 'E'), 'lanes are different keys');
  assert.notEqual(k, blockKey(HOST, 'p4', 'P'), 'probes are different keys');
});

test('3. a round covers all slots and writes scores + exclusion ledger', () => {
  const cfg = tmpCfg();
  const recs = runRound(cfg, HOST, rng(7), fakeExec);
  assert.equal(recs.length, SLOTS.length);
  const seen = new Set(recs.map((x) => `${x.probe}/${x.lane}`));
  assert.equal(seen.size, SLOTS.length, 'every probe×lane exactly once');
  const scores = fs.readFileSync(path.join(cfg.outDir, 'scores.ndjson'), 'utf8').trim().split('\n');
  const ledger = fs.readFileSync(path.join(cfg.outDir, 'probe-windows.ndjson'), 'utf8').trim().split('\n');
  assert.equal(scores.length, SLOTS.length);
  assert.equal(ledger.length, SLOTS.length);
  const w = JSON.parse(ledger[0]) as { t_start_ms: number; t_end_ms: number };
  assert.ok(w.t_end_ms >= w.t_start_ms, 'ledger window well-formed');
  // randomized order: two rounds with different seeds disagree somewhere
  const recs2 = runRound(tmpCfg(), HOST, rng(99), fakeExec);
  assert.notDeepEqual(recs.map((x) => `${x.probe}/${x.lane}`), recs2.map((x) => `${x.probe}/${x.lane}`));
});

test('4. the E lane goes through taskpolicy -b; the P lane does not', () => {
  const e = spawnArgs('bin/probes', { probeId: 'p1', lane: 'E' });
  assert.equal(e.file, '/usr/sbin/taskpolicy');
  assert.deepEqual(e.args.slice(0, 1), ['-b']);
  const p = spawnArgs('bin/probes', { probeId: 'p1', lane: 'P' });
  assert.equal(p.file, 'bin/probes');
});

test('5. golden-unset (errors = −1) is marked invalid', () => {
  const recs = runRound(tmpCfg(), HOST, rng(3), fakeExec);
  for (const x of recs.filter((y) => y.probe === 'p4mem')) assert.equal(x.valid, false);
  for (const x of recs.filter((y) => y.probe !== 'p4mem')) assert.equal(x.valid, true);
});

test('6. the daemon gate refuses before notBefore', () => {
  const cfg = { ...DEFAULT_CONFIG, notBefore: '2026-08-29' };
  assert.equal(gateOk(cfg, new Date('2026-08-01')).ok, false, 'before the gate: refuse');
  assert.equal(gateOk(cfg, new Date('2026-08-30')).ok, true, 'after: run');
  assert.equal(gateOk(DEFAULT_CONFIG, new Date('2026-08-01')).ok, true, 'no gate configured: run');
});

test('7. hardware: the real trio runs clean and QoS steering steers (skipped without the binary)', (t) => {
  const bin = 'tools/probe/build/probes';
  if (!fs.existsSync(bin)) { t.skip('probe binary not built on this machine (tools/probe/build.sh)'); return; }
  const cfg = { ...tmpCfg(), binaryPath: bin };
  const host = collectHostKey(bin);
  const recs = runRound(cfg, host, rng(20260727));
  assert.equal(recs.length, SLOTS.length);
  for (const x of recs) {
    assert.equal(x.errors, 0, `${x.probe}/${x.lane} must run SDC-clean (goldens baked)`);
    assert.ok(x.valid && x.duration_ns > 0);
  }
  const p1P = recs.find((x) => x.probe === 'p1int' && x.lane === 'P')!;
  const p1E = recs.find((x) => x.probe === 'p1int' && x.lane === 'E')!;
  assert.ok(p1E.duration_ns > 1.15 * p1P.duration_ns,
    `E lane must be measurably slower than P for the same kernel (got P=${p1P.duration_ns}, E=${p1E.duration_ns}); ` +
    'if this fails, taskpolicy stopped steering QoS and the lane design is void');
});
