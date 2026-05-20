// test/q62-ds-integration-contract.test.ts — R62 contract verification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

import {
  // feed-contract.ts exports
  type VerdictGroupPayload,
  type TesseraToDsAuthHeaders,
  type TesseraToDsFeedRequest,
  type TesseraToDsFeedResponse,
  type TesseraToDsFeedEndpoint,
  TESSERA_TO_DS_FEED_ENDPOINT,
  // event-contract.ts exports
  type DeployEventPayload,
  type DsToTesseraEventRequest,
  type DsToTesseraEventResponse,
  type DsToTesseraEventEndpoint,
  DS_TO_TESSERA_EVENT_ENDPOINT,
} from '../engine/ds-integration';

// ───────────────────────────────────────────────────────────────────────
// AC-R62-1: barrel exports the named symbols
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-1: index.ts exports all 11 contract symbols (2 consts + 9 types via barrel)', () => {
  // The 2 runtime constants must be importable as values (typeof === 'object').
  assert.strictEqual(typeof TESSERA_TO_DS_FEED_ENDPOINT, 'object');
  assert.strictEqual(typeof DS_TO_TESSERA_EVENT_ENDPOINT, 'object');
  // The 9 interface types are erased at runtime; verifying their export
  // presence is tsc's responsibility (AC-R62-11). Compile success of the
  // 9 `type` imports above proves the type exports exist.
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-2: contract files exist with at least one exported interface each
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-2: feed-contract.ts + event-contract.ts exist with exported interfaces', () => {
  const feedSrc = fs.readFileSync('engine/ds-integration/feed-contract.ts', 'utf-8');
  const eventSrc = fs.readFileSync('engine/ds-integration/event-contract.ts', 'utf-8');
  const feedInterfaceCount = (feedSrc.match(/^export interface /gm) || []).length;
  const eventInterfaceCount = (eventSrc.match(/^export interface /gm) || []).length;
  assert.strictEqual(feedInterfaceCount, 5,
    `feed-contract.ts expected 5 exported interfaces; found ${feedInterfaceCount}`);
  assert.strictEqual(eventInterfaceCount, 4,
    `event-contract.ts expected 4 exported interfaces; found ${eventInterfaceCount}`);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-3: README.md exists with required section headers
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-3: README.md contains exactly 4 anchored section headers', () => {
  const src = fs.readFileSync('engine/ds-integration/README.md', 'utf-8');
  // Each header must appear anchored at line start with `## ` prefix exactly once.
  const headers = [
    '## Tessera → DS feed',
    '## DS → Tessera event',
    '## Versioning',
    '## Anti-scope (R62)',
  ];
  for (const h of headers) {
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escaped}$`, 'gm');
    const matches = src.match(re) || [];
    assert.strictEqual(matches.length, 1,
      `README.md header '${h}' expected exactly 1 match; found ${matches.length}`);
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-4: TesseraToDsFeedRequest sample has required v1 fields + A16 literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-4: TesseraToDsFeedRequest sample exhibits v1 + A16 + projection fields', () => {
  const sample: TesseraToDsFeedRequest = {
    contract_version: 'v1',
    verdict_group: {
      group_id: 'group-deploy-A-1700000000',
      deploy_id: 'deploy-A',
      window_start_ts: 1700000000,
      window_end_ts: 1700000300,
      cluster_event_id: 'event-firmware-push-42',
      firing_family_count: 2,
      confidence: 0.5,
      correlational_not_causal: true,
    },
    emitted_at_ts: 1700000305,
  };
  assert.strictEqual(sample.contract_version, 'v1');
  assert.strictEqual(sample.verdict_group.correlational_not_causal, true);
  assert.strictEqual(typeof sample.verdict_group.group_id, 'string');
  assert.strictEqual(typeof sample.verdict_group.deploy_id, 'string');
  assert.strictEqual(typeof sample.verdict_group.window_start_ts, 'number');
  assert.strictEqual(typeof sample.verdict_group.window_end_ts, 'number');
  assert.strictEqual(typeof sample.verdict_group.firing_family_count, 'number');
  assert.strictEqual(typeof sample.verdict_group.confidence, 'number');
  assert.strictEqual(typeof sample.emitted_at_ts, 'number');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-5: cluster_event_id is optional + typed string when present
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-5: VerdictGroupPayload.cluster_event_id is optional string', () => {
  const without: VerdictGroupPayload = {
    group_id: 'group-deploy-B-1700000100',
    deploy_id: 'deploy-B',
    window_start_ts: 1700000100,
    window_end_ts: 1700000400,
    firing_family_count: 0,
    confidence: 0,
    correlational_not_causal: true,
  };
  assert.strictEqual(without.cluster_event_id, undefined);
  const withId: VerdictGroupPayload = { ...without, cluster_event_id: 'event-X' };
  assert.strictEqual(typeof withId.cluster_event_id, 'string');
  assert.strictEqual(withId.cluster_event_id, 'event-X');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-6: DsToTesseraEventRequest sample exhibits v1 + closed-set kind
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-6: DsToTesseraEventRequest sample exhibits v1 + closed-set discriminator', () => {
  const sample: DsToTesseraEventRequest = {
    contract_version: 'v1',
    event: {
      event_id: 'event-deploy-42',
      event_class: 'firmware_push',
      event_ts: 1700000000,
    },
    emitted_at_ts: 1700000001,
  };
  assert.strictEqual(sample.contract_version, 'v1');
  assert.strictEqual(sample.event.event_class, 'firmware_push');
  assert.strictEqual(typeof sample.event.event_id, 'string');
  assert.strictEqual(typeof sample.event.event_ts, 'number');
  assert.strictEqual(sample.event.event_window_end_ts, undefined);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-7: all 5 ClusterEventKind values are assignable to event_class
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-7: DeployEventPayload.event_class accepts all 5 ClusterEventKind values', () => {
  const kinds: Array<DeployEventPayload['event_class']> = [
    'firmware_push',
    'model_redeploy',
    'env_change',
    'config_change',
    'capacity_change',
  ];
  assert.strictEqual(kinds.length, 5);
  // Each value is assignable to a sample DeployEventPayload (compile-time check).
  for (const k of kinds) {
    const sample: DeployEventPayload = {
      event_id: `event-${k}-test`,
      event_class: k,
      event_ts: 1700000000,
    };
    assert.strictEqual(sample.event_class, k);
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-8: status discriminator union covers exactly 'accepted' | 'rejected'
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-8: response status discriminator accepts both literal values in both directions', () => {
  const feedAccepted: TesseraToDsFeedResponse = {
    contract_version: 'v1',
    correlation_key: 'corr-1',
    status: 'accepted',
  };
  const feedRejected: TesseraToDsFeedResponse = {
    contract_version: 'v1',
    correlation_key: 'corr-2',
    status: 'rejected',
    reason: 'duplicate',
  };
  const eventAccepted: DsToTesseraEventResponse = {
    contract_version: 'v1',
    status: 'accepted',
    freeze_hook_activated: true,
    freeze_hook_activated_at_ts: 1700000010,
  };
  const eventRejected: DsToTesseraEventResponse = {
    contract_version: 'v1',
    status: 'rejected',
    freeze_hook_activated: false,
    reason: 'malformed-payload',
  };
  assert.strictEqual(feedAccepted.status, 'accepted');
  assert.strictEqual(feedRejected.status, 'rejected');
  assert.strictEqual(eventAccepted.status, 'accepted');
  assert.strictEqual(eventAccepted.freeze_hook_activated, true);
  assert.strictEqual(eventRejected.status, 'rejected');
  assert.strictEqual(eventRejected.freeze_hook_activated, false);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-9: endpoint interface + const match (path + method literal pinning)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-9: endpoint constants match interface literal types in both directions', () => {
  const feedEp: TesseraToDsFeedEndpoint = TESSERA_TO_DS_FEED_ENDPOINT;
  const eventEp: DsToTesseraEventEndpoint = DS_TO_TESSERA_EVENT_ENDPOINT;
  assert.strictEqual(feedEp.path, '/v1/tessera/verdict-groups');
  assert.strictEqual(feedEp.method, 'POST');
  assert.strictEqual(eventEp.path, '/v1/tessera/deploy-events');
  assert.strictEqual(eventEp.method, 'POST');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-12: anti-scope diff at chore-A ⊆ ALLOWED_SET (10 paths)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-12: round-start-to-chore-A diff ⊆ R62 allowed-set (chore-A SHA pinned)', () => {
  const ROUND_START = 'ad6cc6b';
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'; // Implementer replaces at chore-B
  if (CHORE_A_SHA === '<INJECTED-AT-CHORE-B>') {
    assert.fail('CHORE_A_SHA placeholder not injected — chore-B SHA backfill required');
  }
  const ALLOWED = [
    'coordination/MEMORIAL.md',
    'coordination/NEXT-ROLE.md',
    'coordination/specs/Q-R62-EMPIRICAL.sh',
    'coordination/specs/Q-R62-SPEC-AUDIT.md',
    'coordination/specs/Q-R62-SPEC.md',
    'engine/ds-integration/README.md',
    'engine/ds-integration/event-contract.ts',
    'engine/ds-integration/feed-contract.ts',
    'engine/ds-integration/index.ts',
    'test/q62-ds-integration-contract.test.ts',
  ];
  const out = execSync(`git diff ${ROUND_START}..${CHORE_A_SHA} --name-only`, { encoding: 'utf-8' })
    .split('\n').filter(s => s.length > 0).sort();
  const allowedSet = new Set(ALLOWED);
  const diagnosticRe = /^coordination\/diagnostics\/DIAGNOSTIC-R62-.*\.md$/;
  for (const p of out) {
    if (!allowedSet.has(p) && !diagnosticRe.test(p)) {
      assert.fail(`Unauthorized path in chore-A diff: ${p}`);
    }
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-13: A16 — engine/types/verdict.ts retains 'correlational_not_causal: true' literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-13: engine/types/verdict.ts retains correlational_not_causal:true literal (A16 defensive)', () => {
  const src = fs.readFileSync('engine/types/verdict.ts', 'utf-8');
  // Discriminating: match on the field-declaration line shape (literal-type
  // annotation `: true`), not just substring presence. The shape pins the
  // type-level invariant; a future regression demoting `: true` → `: boolean`
  // would still match a bare substring but fails this regex.
  const re = /^\s*correlational_not_causal:\s*true\s*;/m;
  assert.match(src, re,
    'engine/types/verdict.ts must declare correlational_not_causal as literal-type true');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-14: A16 propagation — feed-contract.ts declares correlational_not_causal:true literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-14: feed-contract.ts propagates correlational_not_causal:true literal (A16)', () => {
  const src = fs.readFileSync('engine/ds-integration/feed-contract.ts', 'utf-8');
  const re = /^\s*correlational_not_causal:\s*true\s*;/m;
  assert.match(src, re,
    'feed-contract.ts must declare correlational_not_causal as literal-type true');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-15: chore-A-to-HEAD diff empty (forward-protection per R36/R53/R56/R58)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-15: chore-A-to-HEAD diff is empty (forward-protection)', () => {
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'; // Implementer replaces at chore-B
  if (CHORE_A_SHA === '<INJECTED-AT-CHORE-B>') {
    assert.fail('CHORE_A_SHA placeholder not injected — chore-B SHA backfill required');
  }
  const out = execSync(`git diff ${CHORE_A_SHA}..HEAD --name-only`, { encoding: 'utf-8' })
    .split('\n').filter(s => s.length > 0);
  assert.deepStrictEqual(out, [],
    `chore-A..HEAD diff expected empty; found: ${JSON.stringify(out)}`);
});
