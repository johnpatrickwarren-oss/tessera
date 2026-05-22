// test/q66-ds-integration-event-consumer.test.ts — Phase 3 SLICE 3 Wave 10
// WU-Phase3-3C (R66). Runtime tests for AC-R66-1 through AC-R66-17.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  DsEventConsumer,
  type DsToTesseraAuthHeaders,
} from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-consumer';
import {
  createFreezeHookFromDsEvents,
  mapEventClassToKind,
} from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/freeze-hook-factory';
import {
  DS_TO_TESSERA_EVENT_ENDPOINT,
  type DeployEventPayload,
  type DsToTesseraEventRequest,
  type DsToTesseraEventResponse,
} from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

const VALID_HEADERS: DsToTesseraAuthHeaders & Record<string, string> = {
  'x-ds-instance-id': 'ds-test',
  authorization: 'Bearer test-token',
  'content-type': 'application/json',
};

function makeValidPayload(): DeployEventPayload {
  return {
    event_id: 'evt-R66-1',
    event_class: 'firmware_push',
    event_ts: 1000,
  };
}

function makeValidEnvelope(): DsToTesseraEventRequest {
  return {
    contract_version: 'v1',
    event: makeValidPayload(),
    emitted_at_ts: 1005,
  };
}

/** Post helper. Returns { status, body }. */
async function postJson(
  port: number,
  body: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: DsToTesseraEventResponse | null }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: DS_TO_TESSERA_EVENT_ENDPOINT.path,
        method: 'POST',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: DsToTesseraEventResponse | null = null;
          try { parsed = JSON.parse(raw); } catch { /* tolerate non-JSON body in error paths */ }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

describe('R66 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory', () => {
  // AC-R66-1: valid POST → 202 + accepted DsToTesseraEventResponse
  test('AC-R66-1: server accepts valid POST and responds 202 + accepted response', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    const port = c.address!.port;
    try {
      const { status, body } = await postJson(port, JSON.stringify(makeValidEnvelope()), VALID_HEADERS);
      assert.strictEqual(status, 202);
      assert.ok(body !== null);
      assert.strictEqual(body!.contract_version, 'v1');
      assert.strictEqual(body!.status, 'accepted');
      assert.strictEqual(body!.freeze_hook_activated, true);
      assert.strictEqual(typeof body!.freeze_hook_activated_at_ts, 'number');
    } finally {
      await c.stop();
    }
  });

  // AC-R66-2: malformed JSON body → 400 with reason
  test('AC-R66-2: server rejects malformed JSON with 400 + reason', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const { status, body } = await postJson(c.address!.port, '{not valid json', VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.strictEqual(body!.status, 'rejected');
      assert.match(body!.reason ?? '', /JSON parse error/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-3: missing required field event_id → 400
  test('AC-R66-3: server rejects payload missing event_id with 400', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const envelope = makeValidEnvelope();
      const broken = { ...envelope, event: { ...envelope.event, event_id: '' } };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(broken), VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.match(body!.reason ?? '', /event_id/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-4: invalid event_class (6th value) → 400
  test('AC-R66-4: server rejects invalid event_class with 400', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const envelope = makeValidEnvelope();
      const broken = { ...envelope, event: { ...envelope.event, event_class: 'invalid_class_v1' } };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(broken), VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.match(body!.reason ?? '', /invalid event_class/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-5: missing/malformed authorization → 401
  test('AC-R66-5: server rejects missing authorization header with 401', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const headers: Record<string, string> = {
        'x-ds-instance-id': 'ds-test',
        'content-type': 'application/json',
      };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(makeValidEnvelope()), headers);
      assert.strictEqual(status, 401);
      assert.match(body!.reason ?? '', /authorization/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-6: server emits 'activate' with parsed DeployEventPayload
  test("AC-R66-6: server emits 'activate' with parsed DeployEventPayload to subscribers", async () => {
    const c = new DsEventConsumer({ port: 0 });
    const received: DeployEventPayload[] = [];
    c.on('activate', (e) => received.push(e));
    await c.start();
    try {
      await postJson(c.address!.port, JSON.stringify(makeValidEnvelope()), VALID_HEADERS);
      await new Promise((r) => setTimeout(r, 10));
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.event_id, 'evt-R66-1');
      assert.strictEqual(received[0]!.event_class, 'firmware_push');
      assert.strictEqual(received[0]!.event_ts, 1000);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-7: mapEventClassToKind identity-maps all 5 valid values
  test('AC-R66-7: mapEventClassToKind returns identity-mapped ClusterEventKind for all 5 values', () => {
    assert.strictEqual(mapEventClassToKind('firmware_push'), 'firmware_push');
    assert.strictEqual(mapEventClassToKind('model_redeploy'), 'model_redeploy');
    assert.strictEqual(mapEventClassToKind('env_change'), 'env_change');
    assert.strictEqual(mapEventClassToKind('config_change'), 'config_change');
    assert.strictEqual(mapEventClassToKind('capacity_change'), 'capacity_change');
  });

  // AC-R66-8: mapEventClassToKind throws at runtime for unknown value
  test('AC-R66-8: mapEventClassToKind throws at runtime for unknown value', () => {
    assert.throws(
      () => mapEventClassToKind('not_a_real_class' as DeployEventPayload['event_class']),
      /unhandled event_class/,
    );
  });

  // AC-R66-9: factory wires activation; state transitions inactive→active on event
  test('AC-R66-9: factory wires activation: state.active transitions false→true on event', async () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({ consumer: c });
    assert.strictEqual(activator.getState().active, false);
    c.emit('activate', { event_id: 'evt-9', event_class: 'env_change', event_ts: 500 });
    assert.strictEqual(activator.getState().active, true);
    activator.dispose();
  });

  // AC-R66-10: factory state captures cluster_event_id from event_id
  test('AC-R66-10: factory state captures cluster_event_id + until_ts from event', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      activation_window_seconds: 120,
    });
    c.emit('activate', { event_id: 'evt-10', event_class: 'config_change', event_ts: 1000 });
    const s = activator.getState();
    assert.strictEqual(s.cluster_event_id, 'evt-10');
    assert.strictEqual(s.until_ts, 1120);
    activator.dispose();
  });

  // AC-R66-11: factory update returns current unchanged when active+enabled
  test('AC-R66-11: factory update returns current unchanged when state.active=true + freeze_hook_enabled=true', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      config: { freeze_hook_enabled: true },
    });
    c.emit('activate', { event_id: 'evt-11', event_class: 'firmware_push', event_ts: 1000 });
    const current = freshResidual();
    const obs = freshObs(1001);
    const result = activator.update(current, obs, undefined);
    assert.strictEqual(result, current);
    activator.dispose();
  });

  // AC-R66-12: factory update delegates to freezeAwareUpdatePerShardResidual when inactive
  test('AC-R66-12: factory update delegates to underlying when state.active=false', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      config: { freeze_hook_enabled: true },
    });
    // No 'activate' emitted; state.active stays false.
    const current = freshResidual();
    const obs = freshObs(1001);
    const result = activator.update(current, obs, undefined);
    assert.notStrictEqual(result, current);
    activator.dispose();
  });

  // AC-R66-13: factory deactivation timer fires; state.active=false after timeout
  test('AC-R66-13: factory schedules deactivation; state.active=false after timer fires', () => {
    const c = new DsEventConsumer({ port: 0 });
    // Use object wrapper so TypeScript doesn't narrow the property away via
    // control-flow; reading into a const gives the correct (() => void)|null type.
    const timerState = { captured: null as (() => void) | null };
    const fakeSetT = (cb: () => void, _ms: number): unknown => { timerState.captured = cb; return 'handle'; };
    const fakeClearT = (_h: unknown) => { /* no-op */ };
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      setTimeout: fakeSetT,
      clearTimeout: fakeClearT,
      activation_window_seconds: 60,
    });
    c.emit('activate', { event_id: 'evt-13', event_class: 'capacity_change', event_ts: 0 });
    assert.strictEqual(activator.getState().active, true);
    const capturedFn = timerState.captured;
    if (capturedFn === null) throw new Error('fakeSetT was never called — timer callback not set');
    capturedFn();
    assert.strictEqual(activator.getState().active, false);
    activator.dispose();
  });

  // AC-R66-14: anti-scope diff ⊆ ALLOWED_SET (9 paths exactly)
  test('AC-R66-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET (9 paths)', () => {
    const diff = execSync('git diff 8f3dd60..HEAD --name-only', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((s) => s.length > 0)
      .filter((s) => !s.startsWith('coordination/reviews/REVIEWER-REPORT-R66'))
      .filter((s) => !s.startsWith('coordination/diagnostics/DIAGNOSTIC-R66-'))
      .sort();
    const allowed = [
      'coordination/MEMORIAL.md',
      'coordination/NEXT-ROLE.md',
      'coordination/specs/Q-R66-EMPIRICAL.sh',
      'coordination/specs/Q-R66-SPEC-AUDIT.md',
      'coordination/specs/Q-R66-SPEC.md',
      'engine/ds-integration/event-consumer.ts',
      'engine/ds-integration/freeze-hook-factory.ts',
      'engine/ds-integration/index.ts',
      'test/q66-ds-integration-event-consumer.test.ts',
    ].sort();
    for (const path of diff) {
      assert.ok(allowed.includes(path), `unauthorized path in diff: ${path}`);
    }
  });

  // AC-R66-15: NO modification of engine/events/freeze-hook.ts
  test('AC-R66-15: engine/events/freeze-hook.ts unmodified since round-start', () => {
    const diff = execSync(
      'git diff 8f3dd60..HEAD --name-only -- engine/events/freeze-hook.ts',
      { encoding: 'utf8' },
    ).trim();
    assert.strictEqual(diff, '');
  });

  // AC-R66-16: no inline path-literal duplication; event-consumer imports DS_TO_TESSERA_EVENT_ENDPOINT
  test('AC-R66-16: event-consumer.ts imports DS_TO_TESSERA_EVENT_ENDPOINT (no inline path literal duplication)', () => {
    const src = readFileSync('engine/ds-integration/event-consumer.ts', 'utf8');
    assert.match(src, /import\s*\{[^}]*DS_TO_TESSERA_EVENT_ENDPOINT[^}]*\}\s*from\s*['"]\.\/event-contract['"]/);
    const inlineCount = (src.match(/'\/v1\/tessera\/deploy-events'/g) ?? []).length;
    assert.strictEqual(inlineCount, 0, 'event-consumer.ts must not duplicate the path literal');
  });

  // AC-R66-17: ClusterEventKind ↔ event_class parity at compile time + runtime
  test('AC-R66-17: ClusterEventKind 5-value union matches event_class 5-value union', () => {
    const contract = readFileSync('engine/ds-integration/event-contract.ts', 'utf8');
    const feed = readFileSync('engine/events/event-feed.ts', 'utf8');
    const expected = ['firmware_push', 'model_redeploy', 'env_change', 'config_change', 'capacity_change'];
    for (const v of expected) {
      assert.match(contract, new RegExp(`'${v}'`), `event-contract.ts must reference '${v}'`);
      assert.match(feed, new RegExp(`'${v}'`), `event-feed.ts must reference '${v}'`);
    }
  });
});

// ─── Test fixtures ────────────────────────────────────────────────────────────
// Minimal valid PerShardResidual + ExtendedSampleObservation construction.
// Tactical fix per Q-R66-SPEC.md § 4.4 TACTICAL AUTONOMY note: the spec's
// `{} as Type` casts would fail at runtime in AC-R66-12 because
// updatePerShardResidual accesses obs.sampleVector.length. Using proper
// minimal field sets instead (verified via grep on engine/types/config.ts
// + engine/per-shard/runtime.ts).

import type { PerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import type { ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';

function freshResidual(): PerShardResidual {
  return { n_samples: 0, confidence: 'none' };
}

function freshObs(_ts: number): ExtendedSampleObservation {
  return { observedAt: _ts, residualSeedHash: 'test-seed', sampleVector: [1.0] };
}
