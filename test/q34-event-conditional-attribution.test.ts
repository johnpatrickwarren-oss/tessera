// test/q34-event-conditional-attribution.test.ts — Phase 2 SLICE 4 (R34) WU-06 bindings.
//
// Binds AC-R34-1 through AC-R34-21 per Q-R34-SPEC.md § 4.
// 21 runtime ACs; all Reviewer-verified per R32 MINOR-4 reinforcement (every
// AC including PR-F7 cells is Reviewer-verified, avoiding the PR-F6 Cell-4 gap).
//
// Covers: event-feed (Surface 1); event-conditional attribution (Surface 2);
// freeze-hook wrapper (Surface 3); PR-F7 4-cell evidence matrix (Surface 4);
// A16 wire-format invariant (three-way binding AC-R34-10/11/12); config.ts Delta 5;
// anti-scope forward-protection; test count baseline.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  attributeEventConditional,
  DEFAULT_PRE_WINDOW_SECONDS,
  DEFAULT_POST_WINDOW_SECONDS,
  DEFAULT_CORRELATION_WINDOW_SECONDS,
} from '@johnpatrickwarren-oss/deploysignal-engine/events/event-conditional-attribution';
import { SyntheticEventFeed, type ClusterEvent } from '@johnpatrickwarren-oss/deploysignal-engine/events/event-feed';
import {
  freezeAwareUpdatePerShardResidual,
  type FreezeHookState,
} from '@johnpatrickwarren-oss/deploysignal-engine/events/freeze-hook';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import type { PerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  scenarioCell1,
  scenarioCell2,
  scenarioCell3,
  scenarioCell4,
} from './_substrate/v9Z-event-cluster';

const ROOT = resolve(__dirname, '..');

// ── AC-R34-1: ClusterEvent type closed-set 5 event-classes ───────────────────
test('AC-R34-1: ClusterEvent.kind is closed-set 5-class union', () => {
  const validKinds: ClusterEvent['kind'][] = [
    'firmware_push', 'model_redeploy', 'env_change', 'config_change', 'capacity_change',
  ];
  assert.strictEqual(validKinds.length, 5, 'ClusterEventKind must have exactly 5 members');
  for (const k of validKinds) {
    const ev: ClusterEvent = { event_id: `e-${k}`, kind: k, event_ts: 1000 };
    assert.strictEqual(ev.kind, k);
    assert.strictEqual(typeof ev.event_id, 'string');
    assert.strictEqual(typeof ev.event_ts, 'number');
  }
});

// ── AC-R34-2: SyntheticEventFeed sorts and handles empty input ────────────────
test('AC-R34-2: SyntheticEventFeed sorts by (event_ts asc, event_id lex asc); empty → []', () => {
  // Out-of-order input
  const events: ClusterEvent[] = [
    { event_id: 'z', kind: 'firmware_push', event_ts: 2000 },
    { event_id: 'a', kind: 'env_change', event_ts: 1000 },
    { event_id: 'b', kind: 'model_redeploy', event_ts: 1000 },
  ];
  const feed = new SyntheticEventFeed(events);
  const result = feed.fetchSince(0);
  assert.strictEqual(result.length, 3);
  // Sort order: t=1000 lex 'a' first, then t=1000 lex 'b', then t=2000 'z'
  assert.strictEqual(result[0].event_id, 'a');
  assert.strictEqual(result[1].event_id, 'b');
  assert.strictEqual(result[2].event_id, 'z');
  // fetchSince filters strictly: only event_ts > since_ts
  const filtered = feed.fetchSince(1000);
  assert.strictEqual(filtered.length, 1); // only t=2000
  assert.strictEqual(filtered[0].event_id, 'z');
  // Empty input → returns empty array (no throw)
  const emptyFeed = new SyntheticEventFeed([]);
  assert.deepStrictEqual(emptyFeed.fetchSince(0) as ClusterEvent[], []);
});

// ── AC-R34-3: cluster_event_id identity threading ────────────────────────────
test('AC-R34-3: candidate.cluster_event_id === ClusterEvent.event_id (identity threading; no mapping)', () => {
  const result = attributeEventConditional({
    cluster_events: [{ event_id: 'evt-r34-3', kind: 'firmware_push', event_ts: 1000 }],
    fired_events: [
      { shard_node_id: 'shard-0', event_ts: 1010 },
      { shard_node_id: 'shard-1', event_ts: 1020 },
    ],
    opts: { pre_window_seconds: 300, post_window_seconds: 300, correlation_window_seconds: 60 },
  });
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].cluster_event_id, 'evt-r34-3');
});

// ── AC-R34-4: PR-F7 Cell 1 — confirmed elevation ─────────────────────────────
test('AC-R34-4: Cell 1 — 1 candidate; member_count=3; pre_window_count=0; correlational_not_causal=true', () => {
  const { cluster_events, fired_events } = scenarioCell1();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const c = result.candidates[0];
  assert.strictEqual(c.member_count, 3);
  assert.deepStrictEqual([...c.member_shard_ids], ['shard-0', 'shard-1', 'shard-2']);
  assert.strictEqual(c.pre_window_count, 0);
  assert.strictEqual(c.post_window_count, 3);
  assert.strictEqual(c.correlational_not_causal, true);
  // Sort determinism: only 1 candidate so trivially sorted; cluster_event_id matches
  assert.strictEqual(c.cluster_event_id, 'evt-cell1');
  assert.strictEqual(c.event_ts, 1000);
});

// ── AC-R34-5: PR-F7 Cell 2 — true negative (no event, no fires) ──────────────
test('AC-R34-5: Cell 2 — candidates array is empty (no events, no fires)', () => {
  const { cluster_events, fired_events } = scenarioCell2();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 0);
});

// ── AC-R34-6: PR-F7 Cell 3 — singleton (negative specificity) ────────────────
test('AC-R34-6: Cell 3 — 0 candidates (singleton fire below min_post_count=2; F4 branch)', () => {
  const { cluster_events, fired_events } = scenarioCell3();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 0);
});

// ── AC-R34-7: PR-F7 Cell 4 — confounding discrimination ──────────────────────
test('AC-R34-7: Cell 4 — 1 candidate; only 2 correlated shards; 2 unrelated excluded', () => {
  const { cluster_events, fired_events } = scenarioCell4();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const c = result.candidates[0];
  assert.strictEqual(c.member_count, 2);
  assert.deepStrictEqual([...c.member_shard_ids], ['shard-0', 'shard-1']);
  // Unrelated shards explicitly absent
  assert.strictEqual([...c.member_shard_ids].includes('shard-2'), false, 'shard-2 (unrelated) must not be in member_shard_ids');
  assert.strictEqual([...c.member_shard_ids].includes('shard-3'), false, 'shard-3 (unrelated) must not be in member_shard_ids');
});

// ── AC-R34-8: default constants + non-overlapping window classification ───────
test('AC-R34-8: DEFAULT_PRE/POST/CORRELATION constants; adjacent fires classified correctly', () => {
  assert.strictEqual(DEFAULT_PRE_WINDOW_SECONDS, 300);
  assert.strictEqual(DEFAULT_POST_WINDOW_SECONDS, 300);
  assert.strictEqual(DEFAULT_CORRELATION_WINDOW_SECONDS, 60);
  // Window boundary test: event at T=1000
  // pre-window: (700, 1000]; post-window: [1000, 1300)
  // fire at 999 → in pre-window; fire at 1001 → in post-window (correlated, within 60s)
  const result = attributeEventConditional({
    cluster_events: [{ event_id: 'e-bound', kind: 'env_change', event_ts: 1000 }],
    fired_events: [
      { shard_node_id: 'shard-pre', event_ts: 999 },  // in pre-window
      { shard_node_id: 'shard-post-a', event_ts: 1001 },  // in post-window; within 60s → correlated
      { shard_node_id: 'shard-post-b', event_ts: 1002 },  // in post-window; within 60s → correlated
    ],
  });
  // 2 correlated post-window fires; 1 pre-window fire
  // memberCount=2 ≥ minPostCount=2; memberCount-preCount=2-1=1 ≥ minDelta=1 → surfaces
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].pre_window_count, 1);
  assert.strictEqual(result.candidates[0].post_window_count, 2);
  // shard-pre is NOT in member_shard_ids (it's a pre-window fire, not post-window correlated)
  assert.strictEqual([...result.candidates[0].member_shard_ids].includes('shard-pre'), false);
});

// ── AC-R34-9: empty inputs → empty candidates (graceful degradation) ─────────
test('AC-R34-9: empty cluster_events AND empty fired_events → candidates.length=0 (no throw)', () => {
  const result = attributeEventConditional({ cluster_events: [], fired_events: [] });
  assert.strictEqual(result.candidates.length, 0);
  assert.strictEqual(typeof result.attributed_at_ts, 'number');
});

// ── AC-R34-10 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/events/event-conditional-attribution.ts
// removed from Tessera worktree; readFileSync fails with ENOENT. Category A.

// ── AC-R34-11: A16 JSON round-trip (wire-format invariant) ───────────────────
test('AC-R34-11: JSON round-trip preserves correlational_not_causal === true on Cell 1 candidate', () => {
  const { cluster_events, fired_events } = scenarioCell1();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const candidate = result.candidates[0];
  const parsed = JSON.parse(JSON.stringify(candidate));
  assert.strictEqual(parsed.correlational_not_causal, true, 'JSON round-trip must preserve correlational_not_causal === true');
  // Verify entire candidate is serializable
  assert.strictEqual(typeof parsed.cluster_event_id, 'string');
  assert.strictEqual(typeof parsed.member_count, 'number');
});

// ── AC-R34-12 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/events/*.ts files removed from
// Tessera worktree; readFileSync fails with ENOENT. Category A.

// ── AC-R34-13: Wrapper FREEZE branch (both flags true → no-op) ───────────────
test('AC-R34-13: freezeAwareUpdatePerShardResidual freezes when config.freeze_hook_enabled=true AND freezeState.active=true', () => {
  const current: PerShardResidual = {
    ...initialPerShardResidual(),
    n_samples: 5,
    confidence: 'none',
  };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: true, cluster_event_id: 'e-1' };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: true },
  );
  // FREEZE: returned residual is current unchanged
  assert.strictEqual(result.n_samples, 5, 'FREEZE: n_samples must be unchanged');
  assert.strictEqual(result.confidence, 'none', 'FREEZE: confidence must be unchanged');
  assert.strictEqual(result.welford_state, current.welford_state, 'FREEZE: welford_state must be referentially equal');
});

// ── AC-R34-14: Wrapper DELEGATE branch (config flag false → delegate) ─────────
test('AC-R34-14: freezeAwareUpdatePerShardResidual delegates when freeze_hook_enabled=false (even with active=true)', () => {
  const current: PerShardResidual = { n_samples: 5, confidence: 'none' };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: true };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: false },
  );
  // DELEGATE: n_samples incremented
  assert.strictEqual(result.n_samples, 6, 'DELEGATE: n_samples must be incremented');
});

// ── AC-R34-15: Wrapper DELEGATE branch (freezeState inactive → delegate) ──────
test('AC-R34-15: freezeAwareUpdatePerShardResidual delegates when freezeState.active=false (even with freeze_hook_enabled=true)', () => {
  const current: PerShardResidual = { n_samples: 5, confidence: 'none' };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: false };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: true },
  );
  // DELEGATE: n_samples incremented
  assert.strictEqual(result.n_samples, 6, 'DELEGATE: n_samples must be incremented when freezeState inactive');
});

// ── AC-R34-16 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/types/config.ts removed from
// Tessera worktree; readFileSync fails with ENOENT. Category A.

