// test/q-md-f4-common-mode-injection.test.ts — Phase 2 SLICE 3.C (R26) WU-04 MD-F4.
//
// PR-F6 hybrid Reviewer evidence: 4-cell common-mode attribution matrix.
// External literature citation package at coordination/evidence/PR-F6-EVIDENCE.md.
// Hybrid Reviewer pair-review pass at WU-05 SLICE 3 close re-validates
// both this test's behavior and the citation package (per SCOPING-MEMO-v0.3
// § 3 SLICE 3.C row).
//
// Tessera-original test (NOT vendored from DeploySignal).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  attributeCommonMode,
} from '../engine/topology/common-mode-attribution';
import type { FiredShardEvent } from '../engine/topology/common-mode-attribution';
import { computeSnapshotHash } from '../engine/topology-overlay';
import { makeV9YMultiRackCluster } from './_substrate/v9Y-multi-rack-cluster';
import type { TopologySnapshot } from '../engine/types/verdict';

// AC-R26-1: PR-F6 Cell 1 — PSU event positive sensitivity
test('PR-F6 Cell 1 — PSU event positive sensitivity', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1010 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  const psu0 = result.candidates.find((c) => c.shared_node_id === 'psu-0');
  assert.ok(psu0, 'psu-0 candidate must be present');
  assert.strictEqual(psu0.shared_node_kind, 'psu');
  assert.deepStrictEqual([...psu0.member_shard_ids], ['shard-0', 'shard-1']);
  assert.strictEqual(psu0.member_count, 2);
  assert.strictEqual(psu0.topology_distance, 1);
  assert.strictEqual(psu0.earliest_event_ts, 1000);
  assert.strictEqual(psu0.latest_event_ts, 1010);
  assert.strictEqual(psu0.correlational_not_causal, true);
});

// AC-R26-2: PR-F6 Cell 2 — no event positive specificity
test('PR-F6 Cell 2 — no event positive specificity', () => {
  const snapshot = makeV9YMultiRackCluster();
  const result = attributeCommonMode({ fired_events: [], snapshot });
  assert.strictEqual(result.candidates.length, 0);
  assert.strictEqual(result.snapshot_hash, computeSnapshotHash(snapshot));
});

// AC-R26-3: PR-F6 Cell 3 — non-PSU cross-rack negative specificity
test('PR-F6 Cell 3 — non-PSU cross-rack negative specificity', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-2', event_ts: 1010 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  assert.strictEqual(result.candidates.length, 0);
});

// AC-R26-4: PR-F6 Cell 4 — mixed-signal robustness
test('PR-F6 Cell 4 — mixed-signal robustness', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1005 },
    { shard_node_id: 'shard-3', event_ts: 1010 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  const psu0Candidates = result.candidates.filter((c) => c.shared_node_id === 'psu-0');
  assert.strictEqual(psu0Candidates.length, 1);
  assert.deepStrictEqual([...psu0Candidates[0].member_shard_ids], ['shard-0', 'shard-1']);
  assert.ok(!result.candidates.some((c) => c.shared_node_id === 'psu-1'), 'no psu-1 candidate (singleton shard-3)');
  assert.ok(!result.candidates.some((c) => c.shared_node_id === 'rack-1'), 'no rack-1 candidate');
  assert.ok(!result.candidates.some((c) => c.shared_node_id === 'cz-1'), 'no cz-1 candidate');
});

// AC-R26-5: BFS-on-undirected reachability
test('BFS-on-undirected reachability', () => {
  const snapshot: TopologySnapshot = {
    nodes: [
      { id: 'shard-a', kind: 'gpu_shard', service_name: 'a' },
      { id: 'shard-b', kind: 'gpu_shard', service_name: 'b' },
      { id: 'psu-p', kind: 'psu', service_name: 'p' },
    ],
    edges: [
      { from: 'shard-a', to: 'psu-p', relationship: 'contains' },
      { from: 'psu-p', to: 'shard-b', relationship: 'contains' },
    ],
    fetched_at_ts: 0,
    source_id: 'test',
    source_version: '1',
  };
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-a', event_ts: 1000 },
    { shard_node_id: 'shard-b', event_ts: 1000 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].shared_node_id, 'psu-p');
  assert.deepStrictEqual([...result.candidates[0].member_shard_ids], ['shard-a', 'shard-b']);
});

// AC-R26-6: Common-mode aggregation: shards sharing PSU grouped
test('Common-mode aggregation: shards sharing PSU grouped', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1000 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  const psuCandidates = result.candidates.filter((c) => c.shared_node_kind === 'psu');
  assert.strictEqual(psuCandidates.length, 1);
  assert.strictEqual(psuCandidates[0].shared_node_id, 'psu-0');
  assert.strictEqual(psuCandidates[0].member_count, 2);
});

// AC-R26-7: Cross-rack false-positive guard
test('Cross-rack false-positive guard', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-2', event_ts: 1000 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  assert.strictEqual(result.candidates.length, 0);
});

// AC-R26-8: correlational_not_causal: true wire-format
test('correlational_not_causal: true wire-format', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1000 },
  ];
  const result = attributeCommonMode({ fired_events, snapshot });
  assert.ok(result.candidates.length > 0, 'must have at least one candidate');
  for (const c of result.candidates) {
    assert.strictEqual(c.correlational_not_causal, true);
  }
  const serialized = JSON.stringify(result.candidates);
  assert.ok(serialized.includes('"correlational_not_causal":true'), 'must serialize as true');
  assert.ok(!serialized.includes('"correlational_not_causal":false'), 'must not serialize as false');
});

// AC-R26-9: Sparse-topology degradation (LS-4 carry-forward)
test('Sparse-topology degradation (LS-4): rack-only subset', () => {
  const full = makeV9YMultiRackCluster();
  const keepNodeIds = new Set(
    full.nodes.filter((n) => n.kind === 'rack' || n.kind === 'gpu_shard').map((n) => n.id),
  );
  const nodes = full.nodes.filter((n) => keepNodeIds.has(n.id));
  const edges = full.edges.filter((e) => keepNodeIds.has(e.from) && keepNodeIds.has(e.to));
  const rackOnly: TopologySnapshot = { ...full, nodes, edges };
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1000 },
  ];
  // (a) no throw; (b) length 1; (c) rack kind; (d) rack-0; (e) no psu or cooling_zone
  const result = attributeCommonMode({ fired_events, snapshot: rackOnly });
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].shared_node_kind, 'rack');
  assert.strictEqual(result.candidates[0].shared_node_id, 'rack-0');
  for (const c of result.candidates) {
    assert.ok(c.shared_node_kind !== 'psu' && c.shared_node_kind !== 'cooling_zone');
  }
});

// AC-R26-10: PR-F6 evidence package present with required fields
test('PR-F6 evidence package present with required fields', () => {
  const content = readFileSync('coordination/evidence/PR-F6-EVIDENCE.md', 'utf8');
  // (b) ≥ 3 citation headings
  const citationMatches = [...content.matchAll(/### Citation /g)];
  assert.ok(
    citationMatches.length >= 3,
    `must have ≥3 citation headings, found ${citationMatches.length}`,
  );
  // (c) 7 required field labels present in each citation block
  const requiredFields = [
    '**Authors:**',
    '**Venue:**',
    '**Year:**',
    '**URL:**',
    '**Retrieval date:**',
    '**Verbatim quote:**',
    '**Relevance:**',
  ];
  const positions: number[] = [];
  const headingRegex = /### Citation /g;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(content)) !== null) {
    positions.push(m.index);
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : content.length;
    const block = content.slice(start, end);
    for (const field of requiredFields) {
      assert.ok(block.includes(field), `citation block ${i + 1} must include '${field}'`);
    }
  }
});

// AC-R26-11: Singleton + unknown-shard graceful skip
test('Singleton and unknown-shard graceful skip', () => {
  const snapshot = makeV9YMultiRackCluster();
  // Subcase (a): singleton
  const result_a = attributeCommonMode({
    fired_events: [{ shard_node_id: 'shard-0', event_ts: 1000 }],
    snapshot,
  });
  assert.strictEqual(result_a.candidates.length, 0);
  // Subcase (b): unknown shard silently skipped; remaining shard-0 is singleton
  const result_b = attributeCommonMode({
    fired_events: [
      { shard_node_id: 'unknown-shard-zzz', event_ts: 1000 },
      { shard_node_id: 'shard-0', event_ts: 1000 },
    ],
    snapshot,
  });
  assert.strictEqual(result_b.candidates.length, 0);
});

// AC-R26-12: Candidate ordering determinism + kind-filter narrowing
test('Candidate ordering determinism and kind-filter narrowing', () => {
  const snapshot = makeV9YMultiRackCluster();
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1000 },
  ];
  // Subcase (a): canonical kind sort order psu < rack < cooling_zone
  const result_a = attributeCommonMode({ fired_events, snapshot });
  assert.deepStrictEqual(result_a.candidates.map((c) => c.shared_node_id), ['psu-0', 'rack-0', 'cz-0']);
  // Subcase (b): narrow to psu only
  const result_b = attributeCommonMode({
    fired_events,
    snapshot,
    opts: { candidate_node_kinds: ['psu'] },
  });
  assert.strictEqual(result_b.candidates.length, 1);
  assert.strictEqual(result_b.candidates[0].shared_node_id, 'psu-0');
});
