// test/diag-probe.test.ts — the cordon→diag→uncordon active-probe sink and the result-feedback path.
// The orchestration invariants: EVACUATE-BEFORE-DIAG (deep levels need an idle GPU, and the ordering
// lives inside ONE sink — FanOutSink gives no cross-sink ordering); ESCALATE-UNTIL-FAIL (shallow level
// first, deeper only when it finds nothing; first failure = mechanism confirmed, stop); CONFIRMED-KEEPS-
// CORDON (a statistical resolve later does not fix hardware); CANCEL-AT-STEP-BOUNDARY (withdraw stops the
// ladder and restores the shard); NON-BLOCKING drain (probe failures surface as feedback, never throws);
// and the loop side: feedback ANNOTATES (report + sink.annotate) but never dispatches or withdraws — a
// 'clean' hardware diag must not override standing behavioral evidence (the SDC class passes diags).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DiagProbeSink, type DiagProbeOptions } from '../tools/diag-probe.js';
import { JsonlAuditSink, FanOutSink, WebhookActionSink, actionKey, type ExecLike, type FetchLike } from '../tools/action-sinks.js';
import { ModeBLoop, RecordingSink, type EmitterCycle, type FleetAction, type ProbeOutcome } from '../tools/mode-b-loop.js';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import type { EmitterContract } from '../tools/emitter-contract.js';

const act = (shard: string, cycle = 0): FleetAction => ({ emitter: 'live-mode-b/power_w', shard, cycle, eValue: 1e8, q: 0.1 });

function opts(execImpl: ExecLike, extra?: Partial<DiagProbeOptions>): DiagProbeOptions {
  return {
    cordon: { command: 'kubectl', args: ['cordon', '{shard}'] },
    uncordon: { command: 'kubectl', args: ['uncordon', '{shard}'] },
    diag: { command: 'dcgmi', args: ['diag', '-r', '{level}', '--host', '{shard}'] },
    levels: [1, 3],
    execImpl,
    ...extra,
  };
}

/** An exec fake recording every invocation; `failOn` makes a matching call exit 1. */
function fakeExec(calls: string[][], failOn?: (cmd: string, args: string[]) => boolean): ExecLike {
  return async (cmd, args) => {
    calls.push([cmd, ...args]);
    return failOn?.(cmd, args) ? { code: 1, stderr: 'fault found' } : { code: 0, stderr: '' };
  };
}

test('EVACUATE-BEFORE-DIAG + full clean ladder: cordon → r1 → r3 → uncordon, verdict clean', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls)));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle();
  assert.deepEqual(calls, [
    ['kubectl', 'cordon', 's0'],
    ['dcgmi', 'diag', '-r', '1', '--host', 's0'],
    ['dcgmi', 'diag', '-r', '3', '--host', 's0'],
    ['kubectl', 'uncordon', 's0'],
  ]);
  const out = sink.takeOutcomes();
  assert.equal(out.length, 1);
  assert.equal(out[0].verdict, 'clean');
  assert.equal(out[0].cordoned, false, 'a clean shard is restored');
  assert.deepEqual(out[0].steps.map((s) => s.level), [1, 3], 'every ladder level ran and passed');
  assert.equal(sink.takeOutcomes().length, 0, 'outcomes are consumed once');
});

test('ESCALATE-UNTIL-FAIL + CONFIRMED-KEEPS-CORDON: r1 failure stops the ladder, shard stays evacuated', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls, (cmd) => cmd === 'dcgmi')));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle();
  assert.deepEqual(calls, [
    ['kubectl', 'cordon', 's0'],
    ['dcgmi', 'diag', '-r', '1', '--host', 's0'],
  ], 'no deeper level after a failure, and NO uncordon');
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'confirmed');
  assert.equal(o.failedLevel, 1);
  assert.equal(o.cordoned, true, 'hardware-confirmed shard stays cordoned');
});

test('keepCordonOnConfirm=false restores even a confirmed shard', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls, (cmd) => cmd === 'dcgmi'), { keepCordonOnConfirm: false }));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle();
  assert.deepEqual(calls.at(-1), ['kubectl', 'uncordon', 's0']);
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'confirmed');
  assert.equal(o.cordoned, false);
});

test('withdraw before drain cancels outright — the shard is never touched', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls)));
  sink.dispatch(act('s0'));
  sink.withdraw(act('s0'), 'resolved');
  await sink.drain();
  await sink.idle();
  assert.equal(calls.length, 0);
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'cancelled');
  assert.equal(o.cordoned, false);
  assert.equal(o.steps.length, 0);
});

test('CANCEL-AT-STEP-BOUNDARY: withdraw mid-ladder stops before the next level and uncordons', async () => {
  const calls: string[][] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let diagStarted!: () => void;
  const started = new Promise<void>((r) => { diagStarted = r; });
  const execImpl: ExecLike = async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (cmd === 'dcgmi') { diagStarted(); await gate; } // r1 in progress when the withdraw lands
    return { code: 0, stderr: '' };
  };
  const sink = new DiagProbeSink(opts(execImpl));
  sink.dispatch(act('s0'));
  await sink.drain(); // starts the ladder…
  await started;      // …and r1 is now genuinely running, blocked on the gate
  sink.withdraw(act('s0'), 'resolved');
  release();
  await sink.idle();
  assert.deepEqual(calls, [
    ['kubectl', 'cordon', 's0'],
    ['dcgmi', 'diag', '-r', '1', '--host', 's0'],
    ['kubectl', 'uncordon', 's0'],
  ], 'r3 is never run after the cancel');
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'cancelled');
  assert.equal(o.cordoned, false);
});

test('EXIT-CODE CONTRACT: a diag orchestration exit (≠0/1) is an error, never confirmed — and the shard is restored', async () => {
  const calls: string[][] = [];
  const execImpl: ExecLike = async (cmd, args) => {
    calls.push([cmd, ...args]);
    return cmd === 'dcgmi' ? { code: 2, stderr: 'unable to establish a connection' } : { code: 0, stderr: '' };
  };
  const sink = new DiagProbeSink(opts(execImpl));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle();
  assert.deepEqual(calls.at(-1), ['kubectl', 'uncordon', 's0'], 'an orchestration failure still restores the shard');
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'error', 'an unreachable host is not a diagnosis');
  assert.equal(o.failedLevel, undefined);
  assert.equal(o.cordoned, false);
  assert.match(o.detail!, /diag r1 exit 2/);
});

test('cordon failure aborts the probe as an error — no diag on a shard still carrying load', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls, (_cmd, args) => args[0] === 'cordon')));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle();
  assert.equal(calls.length, 1, 'stopped after the failed cordon');
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'error');
  assert.match(o.detail!, /cordon exit 1/);
});

test('dedupe: one probe per standing episode (double dispatch queues once)', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls)));
  sink.dispatch(act('s0'));
  sink.dispatch(act('s0', 1));
  await sink.drain();
  await sink.idle();
  assert.equal(calls.filter((c) => c[0] === 'kubectl' && c[1] === 'cordon').length, 1);
  assert.equal(sink.takeOutcomes().length, 1);
});

// ─── rack-level dedupe (group probe quota) ───────────────────────────────────────────────────────────

// s0..s5 all on rack-A; a common-mode discovery dispatches every member at once.
const rackOf = (shard: string) => (shard.startsWith('s') ? 'rack-A' : undefined);

test('GROUP QUOTA: a common-mode fan-out probes a sample, delegates the rest — never evacuates the rack', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls), { groupOf: rackOf, maxProbesPerGroup: 2 }));
  for (let i = 0; i < 6; i++) sink.dispatch(act(`s${i}`));
  await sink.drain();
  await sink.idle();
  assert.equal(calls.filter((c) => c[1] === 'cordon').length, 2, 'only the sample is ever cordoned');
  const out = sink.takeOutcomes();
  const probed = out.filter((o) => o.verdict === 'clean').map((o) => o.shard).sort();
  const delegated = out.filter((o) => o.verdict === 'delegated');
  assert.deepEqual(probed, ['s0', 's1']);
  assert.equal(delegated.length, 4);
  assert.match(delegated[0].detail!, /rack-A/, 'the delegated outcome names the group');
  assert.match(delegated[0].detail!, /s0, s1/, '…and the shards probing on its behalf');
  assert.equal(delegated.every((o) => o.steps.length === 0 && !o.cordoned), true, 'delegated shards are untouched');
});

test('the group budget frees when probes complete — a later episode probes again', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls), { groupOf: rackOf, maxProbesPerGroup: 1 }));
  sink.dispatch(act('s0'));
  await sink.drain();
  await sink.idle(); // s0's probe has completed → budget free
  sink.takeOutcomes();
  sink.dispatch(act('s1'));
  await sink.drain();
  await sink.idle();
  const [o] = sink.takeOutcomes();
  assert.equal(o.verdict, 'clean', 's1 gets a real probe once the group budget frees');
});

test('no groupOf (or an ungrouped shard) → no dedupe', async () => {
  const calls: string[][] = [];
  const sink = new DiagProbeSink(opts(fakeExec(calls), { maxProbesPerGroup: 1 }));
  sink.dispatch(act('s0'));
  sink.dispatch(act('s1'));
  await sink.drain();
  await sink.idle();
  assert.equal(sink.takeOutcomes().filter((o) => o.verdict === 'clean').length, 2);
});

// ─── the result-feedback path through the loop ───────────────────────────────────────────────────────

const N = 10, COHORT = 10, PER_CYCLE = 40;
const SHARDS = Array.from({ length: N }, (_, i) => `s${i}`);
function emitter(id: string): EmitterContract {
  return {
    id, baselineVersion: 'v', conditioningVariables: ['control'], residualizer: 'contrast',
    increment: 'normalized-mixture', stoppingAggregation: 'e-BH', horizon: 'w', validityClass: 'construction_valid',
  };
}
function cohort(seed: number): number[][] {
  const rng = mulberry32(seed);
  return Array.from({ length: COHORT }, () => Array.from({ length: PER_CYCLE }, () => gaussian(rng)));
}
function cyc(ev: number[]): EmitterCycle {
  return { contract: emitter('e1'), shards: SHARDS, eValues: ev, calibrationSamples: cohort(7), whitenessPass: true };
}
const eValues = (hot: number[]): number[] => Array.from({ length: N }, (_, i) => (hot.includes(i) ? 1e8 : 0.5));

test('LOOP FEEDBACK ANNOTATES, NEVER RECONCILES: a clean probe does not withdraw; a confirmed one does not pin', async () => {
  const recording = new RecordingSink();
  const probe = new DiagProbeSink(opts(fakeExec([])));
  const loop = new ModeBLoop({ q: 0.1, sink: new FanOutSink([recording, probe]), feedback: probe });

  // cycle 0: shard s3 discovered → dispatched to both sinks; probe queued.
  const r0 = loop.step(0, [cyc(eValues([3]))]);
  assert.equal(r0.feedback.length, 0, 'no probe has completed yet');
  assert.equal(recording.dispatched.length, 1);
  await probe.drain();
  await probe.idle(); // ladder completes clean between cycles

  // cycle 1: discovery still standing → outcome surfaces as annotation; the action is NOT withdrawn.
  const r1 = loop.step(1, [cyc(eValues([3]))]);
  assert.equal(r1.feedback.length, 1);
  assert.equal(r1.feedback[0].outcome.verdict, 'clean');
  assert.equal(r1.feedback[0].standing, true);
  assert.equal(recording.annotated.length, 1, 'sink.annotate received the outcome');
  assert.equal(recording.withdrawn.length, 0, 'a clean hardware diag never withdraws behavioral evidence');
  assert.equal(r1.emitters[0].standing, 1);

  // cycle 2: evidence resolves → the action is withdrawn regardless of any probe verdict.
  const r2 = loop.step(2, [cyc(eValues([]))]);
  assert.equal(recording.withdrawn.length, 1);
  assert.equal(recording.withdrawn[0].reason, 'resolved');
  assert.equal(r2.feedback.length, 0);
});

test('a late probe result for an already-withdrawn action is still audited, flagged standing=false', async () => {
  const recording = new RecordingSink();
  const probe = new DiagProbeSink(opts(fakeExec([], (cmd) => cmd === 'dcgmi')));
  const loop = new ModeBLoop({ q: 0.1, sink: new FanOutSink([recording, probe]), feedback: probe });

  loop.step(0, [cyc(eValues([3]))]);      // dispatch + queue probe
  loop.step(1, [cyc(eValues([]))]);       // resolves BEFORE the probe ran → probe cancelled in queue
  const r2 = loop.step(2, [cyc(eValues([]))]);
  assert.equal(r2.feedback.length, 1);
  assert.equal(r2.feedback[0].outcome.verdict, 'cancelled');
  assert.equal(r2.feedback[0].standing, false);
  assert.equal(recording.annotated[0].standing, false);
});

test('audit + webhook sinks carry the probe record (op probe, shared idempotency key)', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'probe-audit-')), 'actions.ndjson');
  const audit = new JsonlAuditSink(file);
  const posts: Array<{ op: string; key: string; verdict?: string; standing?: boolean }> = [];
  const fetchImpl: FetchLike = async (_url, init) => { posts.push(JSON.parse(init.body)); return { ok: true, status: 200 }; };
  const webhook = new WebhookActionSink({ url: 'http://gate.local/hook', fetchImpl });
  const fan = new FanOutSink([audit, webhook]);

  const a = act('s0', 3);
  fan.dispatch(a);
  const outcome: ProbeOutcome = { key: actionKey(a), emitter: a.emitter, shard: a.shard, cycle: a.cycle, verdict: 'confirmed', steps: [{ level: 1, code: 1, stderr: 'fault found' }], failedLevel: 1, cordoned: true };
  fan.annotate(outcome, true);
  await fan.drain();

  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.equal(lines[1].op, 'probe');
  assert.equal(lines[1].verdict, 'confirmed');
  assert.equal(lines[1].failedLevel, 1);
  assert.equal(lines[1].standing, true);

  assert.equal(posts.length, 2);
  assert.equal(posts[1].op, 'probe');
  assert.equal(posts[1].verdict, 'confirmed');
  assert.equal(posts[0].key, posts[1].key, 'the probe payload shares the dispatch idempotency key');
});
