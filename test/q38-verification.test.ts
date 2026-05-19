// test/q38-verification.test.ts — R38 MAJOR-1 remediation verification.
//
// Verifies: (1) latest_event_ts semantic fix at
// engine/topology/common-mode-attribution.ts:188-196; (2) docstring accuracy
// at earliest_event_ts + latest_event_ts fields post-fix.
//
// Tessera-original test (not vendored). R38 spec: coordination/specs/Q-R38-SPEC.md.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import type { TopologySnapshot } from '../engine/types/verdict';
import { attributeCommonMode } from '../engine/topology/common-mode-attribution';

const ROOT = resolve(__dirname, '..');

// ── AC-R38-1: latest_event_ts FIXTURE ──────────────────────────────────────

test('AC-R38-1: latest_event_ts = max(per-shard latest), not max(per-shard earliest)', () => {
  // Shard gpu-0 fires at t=1000 and t=1050 (two events, max=1050, min=1000).
  // Shard gpu-1 fires at t=900.
  // Both connect to psu-1 (hop 1). Expected latest_event_ts = max(1050, 900) = 1050.
  // Bug behavior (pre-fix): max(shardEarliest) = max(1000, 900) = 1000 ≠ 1050.
  const snapshot: TopologySnapshot = {
    nodes: [
      { id: 'psu-1', kind: 'psu', service_name: 'PSU 1' },
      { id: 'gpu-0', kind: 'gpu_shard', service_name: 'GPU 0' },
      { id: 'gpu-1', kind: 'gpu_shard', service_name: 'GPU 1' },
    ],
    edges: [
      { from: 'psu-1', to: 'gpu-0', relationship: 'contains' },
      { from: 'psu-1', to: 'gpu-1', relationship: 'contains' },
    ],
    fetched_at_ts: 0,
    source_id: 'test',
    source_version: '0',
  };

  const result = attributeCommonMode({
    fired_events: [
      { shard_node_id: 'gpu-0', event_ts: 1000, event_id: 'e1' },
      { shard_node_id: 'gpu-0', event_ts: 1050, event_id: 'e2' },
      { shard_node_id: 'gpu-1', event_ts: 900,  event_id: 'e3' },
    ],
    snapshot,
    opts: { max_hop_distance: 1, min_member_count: 2 },
  });

  assert.strictEqual(result.candidates.length, 1, 'exactly 1 candidate expected');
  const cand = result.candidates[0];
  assert.strictEqual(
    cand.latest_event_ts,
    1050,
    'latest_event_ts must equal max(per-shard latest) = max(1050, 900) = 1050',
  );
  assert.strictEqual(
    cand.earliest_event_ts,
    900,
    'earliest_event_ts must equal min(per-shard earliest) = min(1000, 900) = 900',
  );
});

// ── AC-R38-2: DOCSTRING accuracy ───────────────────────────────────────────

test('AC-R38-2: earliest_event_ts and latest_event_ts docstrings describe per-distinct-shard semantics', () => {
  const content = readFileSync(
    resolve(ROOT, 'engine/topology/common-mode-attribution.ts'),
    'utf8',
  );

  // Absence check: "not per-distinct-shard dedup" (line 70, pre-fix misleading phrase)
  // must be absent after the MAJOR-1 fix.  This phrase IS currently in the file
  // and IS a single-line substring — verified at spec authoring time.
  assert.strictEqual(
    content.includes('not per-distinct-shard dedup'),
    false,
    'earliest_event_ts docstring must NOT contain "not per-distinct-shard dedup" (pre-fix misleading text)',
  );

  // Presence check on latest_event_ts jsdoc: must contain "per-distinct-shard".
  // Pre-fix latest_event_ts jsdoc: "Max event_ts across the same set of records."
  // — does NOT contain "per-distinct-shard". This check fails pre-fix.
  // Extract the jsdoc block immediately before "latest_event_ts: number;".
  const latestTsIdx = content.indexOf('latest_event_ts: number;');
  assert.notStrictEqual(latestTsIdx, -1, 'latest_event_ts field must exist in the file');
  // Look back up to 300 chars to find the last /** in that window.
  const windowBefore = content.substring(Math.max(0, latestTsIdx - 500), latestTsIdx);
  const lastDocStart = windowBefore.lastIndexOf('/**');
  const latestTsDoc = lastDocStart !== -1 ? windowBefore.substring(lastDocStart) : '';
  assert.strictEqual(
    latestTsDoc.includes('per-distinct-shard'),
    true,
    'latest_event_ts jsdoc must contain "per-distinct-shard" (accurate per-shard-latest semantics)',
  );
});
