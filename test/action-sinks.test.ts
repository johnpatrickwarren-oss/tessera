// test/action-sinks.test.ts — the concrete control-plane ActionSink adapters (ADR 0019 deploy, OUTPUT
// seam). Each must (a) preserve the loop's synchronous dispatch/withdraw contract by BUFFERING I/O, (b)
// perform every buffered effect on drain(), and (c) surface failures by throwing an aggregate AFTER
// attempting them all — never silently dropping one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  JsonlAuditSink, WebhookActionSink, CommandActionSink, FanOutSink, isDrainable, actionKey,
  type FetchLike, type ExecLike,
} from '../tools/action-sinks.js';
import type { FleetAction } from '../tools/mode-b-loop.js';

const act = (shard: string, cycle = 0): FleetAction => ({ emitter: 'live-mode-b/power_w', shard, cycle, eValue: 1e8, q: 0.1 });

test('actionKey is stable across an action and its later withdraw (idempotency correlation)', () => {
  assert.equal(actionKey(act('s0', 0)), actionKey(act('s0', 7)), 'key keyed on emitter+shard, not cycle');
  assert.notEqual(actionKey(act('s0')), actionKey(act('s1')));
});

test('JsonlAuditSink appends one durable NDJSON record per dispatch/withdraw', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')), 'actions.ndjson');
  const sink = new JsonlAuditSink(file); // no clock → deterministic (no `at`)
  sink.dispatch(act('s0', 3));
  sink.withdraw(act('s0', 5), 'revoked');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], { op: 'dispatch', emitter: 'live-mode-b/power_w', shard: 's0', cycle: 3, eValue: 1e8, q: 0.1 });
  assert.deepEqual(lines[1], { op: 'withdraw', emitter: 'live-mode-b/power_w', shard: 's0', cycle: 5, eValue: 1e8, q: 0.1, reason: 'revoked' });
  assert.equal(isDrainable(sink), false, 'the audit sink is synchronous — no drain');
});

test('WebhookActionSink buffers then POSTs every effect on drain (op + idempotency key)', async () => {
  const calls: Array<{ url: string; body: { op: string; key: string; shard: string; reason?: string } }> = [];
  const fetchImpl: FetchLike = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200 }; };
  const sink = new WebhookActionSink({ url: 'http://gate.local/hook', fetchImpl });
  sink.dispatch(act('s0'));
  sink.withdraw(act('s0'), 'resolved');
  assert.equal(calls.length, 0, 'no I/O before drain — step() stays synchronous');
  await sink.drain();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.op, 'dispatch');
  assert.equal(calls[1].body.op, 'withdraw');
  assert.equal(calls[1].body.reason, 'resolved');
  assert.equal(calls[0].body.key, calls[1].body.key, 'dispatch and withdraw share the idempotency key');
  assert.equal(calls[0].url, 'http://gate.local/hook');
});

test('WebhookActionSink retries then throws an aggregate, having attempted every effect', async () => {
  let attempts = 0;
  const fetchImpl: FetchLike = async () => { attempts++; return { ok: false, status: 503 }; };
  const sink = new WebhookActionSink({ url: 'http://gate.local/hook', fetchImpl, retries: 1 });
  sink.dispatch(act('s0'));
  sink.dispatch(act('s1'));
  await assert.rejects(() => sink.drain(), /2 effect\(s\) failed after 2 attempt\(s\)/);
  assert.equal(attempts, 4, 'both effects attempted, each retried once (2×2)');
});

test('WebhookActionSink drain clears the queue (a transient drop self-heals next cycle, not re-sent)', async () => {
  let ok = false;
  const fetchImpl: FetchLike = async () => (ok ? { ok: true, status: 200 } : { ok: false, status: 500 });
  const sink = new WebhookActionSink({ url: 'http://x', fetchImpl, retries: 0 });
  sink.dispatch(act('s0'));
  await assert.rejects(() => sink.drain());
  ok = true;
  await sink.drain(); // queue was cleared on the failed drain → nothing to send, no throw
});

test('CommandActionSink substitutes templates and runs queued commands in order on drain', async () => {
  const runs: Array<{ cmd: string; args: string[] }> = [];
  const execImpl: ExecLike = async (cmd, args) => { runs.push({ cmd, args }); return { code: 0, stderr: '' }; };
  const sink = new CommandActionSink({
    command: 'kubectl',
    dispatchArgs: ['cordon', '{shard}', '--reason', 'mode-b:{emitter}'],
    withdrawArgs: ['uncordon', '{shard}', '--note', '{reason}'],
    execImpl,
  });
  sink.dispatch(act('gpu-7'));
  sink.withdraw(act('gpu-7'), 'resolved');
  assert.equal(runs.length, 0, 'buffered until drain');
  await sink.drain();
  assert.deepEqual(runs[0], { cmd: 'kubectl', args: ['cordon', 'gpu-7', '--reason', 'mode-b:live-mode-b/power_w'] });
  assert.deepEqual(runs[1], { cmd: 'kubectl', args: ['uncordon', 'gpu-7', '--note', 'resolved'] });
});

test('CommandActionSink throws an aggregate when a command exits non-zero (every job attempted)', async () => {
  const runs: string[] = [];
  const execImpl: ExecLike = async (_cmd, args) => { runs.push(args[1]); return { code: args[1] === 'bad' ? 2 : 0, stderr: 'boom' }; };
  const sink = new CommandActionSink({ command: 'remediate', dispatchArgs: ['drain', '{shard}'], withdrawArgs: ['restore', '{shard}'], execImpl });
  sink.dispatch(act('ok'));
  sink.dispatch(act('bad'));
  sink.dispatch(act('ok2'));
  await assert.rejects(() => sink.drain(), /1 command\(s\) failed/);
  assert.deepEqual(runs, ['ok', 'bad', 'ok2'], 'a failing command does not strand the rest');
});

test('FanOutSink fans every effect to all children and drains the drainable ones', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fan-')), 'a.ndjson');
  const posted: string[] = [];
  const fetchImpl: FetchLike = async (_u, init) => { posted.push(JSON.parse(init.body).op); return { ok: true, status: 200 }; };
  const audit = new JsonlAuditSink(file);
  const webhook = new WebhookActionSink({ url: 'http://x', fetchImpl });
  const fan = new FanOutSink([audit, webhook]);
  fan.dispatch(act('s0'));
  fan.withdraw(act('s0'), 'revoked');
  // audit is synchronous → already on disk; webhook buffered → flushes on drain
  assert.equal(fs.readFileSync(file, 'utf8').trim().split('\n').length, 2);
  assert.equal(posted.length, 0);
  await fan.drain();
  assert.deepEqual(posted, ['dispatch', 'withdraw']);
});

test('FanOutSink drain reports a failing child but still drains the others', async () => {
  const okPosts: string[] = [];
  const good = new WebhookActionSink({ url: 'http://good', fetchImpl: async (_u, init) => { okPosts.push(JSON.parse(init.body).op); return { ok: true, status: 200 }; } });
  const bad = new WebhookActionSink({ url: 'http://bad', fetchImpl: async () => ({ ok: false, status: 500 }), retries: 0 });
  const fan = new FanOutSink([good, bad]);
  fan.dispatch(act('s0'));
  await assert.rejects(() => fan.drain(), /1 child sink\(s\) failed/);
  assert.deepEqual(okPosts, ['dispatch'], 'the healthy child still flushed');
});
