// test/q28-slurm-adapter.test.ts — Phase 2 SLICE 3.B WU-01 SLURM-ADAPTER tests (R28).
//
// AC index:
//   AC-R28-1   single-switch + leaf nodes → 4 nodes / 3 contains edges
//   AC-R28-2   hierarchical 2-level switch tree
//   AC-R28-3   bracket-range + zero-padding preservation
//   AC-R28-4   multi-token bracket (range + singleton mix)
//   AC-R28-5   sparse: undeclared child switch auto-creates as 'rack' placeholder
//   AC-R28-6   comment + blank-line tolerance
//   AC-R28-7   kind/relationship literal invariant across all emitted snapshot
//   AC-R28-8   parse-error throws (4 sub-cases: empty SwitchName, duplicate, malformed range, unclosed bracket)
//   AC-R28-9   empty input → empty snapshot (no throw); default fetchedAtTs branch
//   AC-R28-10  TopologySource interface conformance + default id/version/fetchedAtTs fallback
//   AC-R28-11  TopologyEnricher integration preserves correlational_not_causal: true
//   AC-R28-12  anti-scope diff round-start..chore-A ⊆ allowed-set [ADDED AT CHORE-B WITH CHORE_A_SHA SUBSTITUTED]

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SlurmTopologySource, parseSlurmTopologyConf, expandSlurmHostlist } from '../engine/topology/slurm-source';
import { computeSnapshotHash, type TopologySource, TopologyEnricher } from '../engine/topology-overlay';
import type { VerdictGroup, TopologyCandidateEvent } from '../engine/types/verdict';

// Fixture-reading: relative-from-cwd path per established pattern at
// test/q18-phase2-slice1-topology-substrate.test.ts:110 + test/q23-hardware-topology-source.test.ts:40
// (`node --test` invoked from project root). Do NOT introduce __dirname / node:path
// imports — would surface TS2304-class diagnostics beyond the baseline TS2688+TS5107
// set that AC-R28-13 asserts as exact.
function readFixture(name: string): string {
  return readFileSync(`test/_substrate/${name}`, 'utf-8');
}

const META = { sourceId: 'slurm_topology_source', sourceVersion: 'slurm-1', fetchedAtTs: 1700000000 };

// ── AC-R28-1: single-switch + leaf nodes ───────────────────────────
test('AC-R28-1: well-formed single-switch topology produces 4 nodes + 3 contains edges', () => {
  const text = readFixture('slurm-fixture-canonical.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Expected: 1 'rack' (sw0) + 3 'gpu_shard' (node1, node2, node3); 3 edges sw0→nodeN.
  const rackNodes = snap.nodes.filter((n) => n.kind === 'rack');
  const leafNodes = snap.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.equal(rackNodes.length, 1);
  assert.equal(rackNodes[0].id, 'sw0');
  assert.equal(leafNodes.length, 3);
  assert.deepEqual(leafNodes.map((n) => n.id).sort(), ['node1', 'node2', 'node3']);
  assert.equal(snap.edges.length, 3);
  for (const e of snap.edges) {
    assert.equal(e.from, 'sw0');
    assert.equal(e.relationship, 'contains');
    assert.ok(['node1', 'node2', 'node3'].includes(e.to));
  }
});

// ── AC-R28-2: hierarchical 2-level switch tree ───────────────────
test('AC-R28-2: hierarchical switch tree emits switch-switch + switch-node contains edges', () => {
  const text = readFixture('slurm-fixture-hierarchical.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Expected: 3 'rack' nodes (top, mid0, mid1) + 4 'gpu_shard' (node1..node4); 6 edges.
  const rackIds = snap.nodes.filter((n) => n.kind === 'rack').map((n) => n.id).sort();
  const leafIds = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort();
  assert.deepEqual(rackIds, ['mid0', 'mid1', 'top']);
  assert.deepEqual(leafIds, ['node1', 'node2', 'node3', 'node4']);
  assert.equal(snap.edges.length, 6);
  // 2 switch→switch (top→mid0, top→mid1)
  const switchEdges = snap.edges.filter((e) => rackIds.includes(e.to));
  assert.equal(switchEdges.length, 2);
  for (const e of switchEdges) {
    assert.equal(e.from, 'top');
    assert.equal(e.relationship, 'contains');
  }
  // 4 switch→node (mid0→node1, mid0→node2, mid1→node3, mid1→node4)
  const leafEdges = snap.edges.filter((e) => leafIds.includes(e.to));
  assert.equal(leafEdges.length, 4);
  for (const e of leafEdges) {
    assert.ok(['mid0', 'mid1'].includes(e.from));
    assert.equal(e.relationship, 'contains');
  }
});

// ── AC-R28-3: bracket-range expansion + zero-padding ──────────────
test('AC-R28-3: expandSlurmHostlist preserves zero-padding in numeric ranges', () => {
  assert.deepEqual(expandSlurmHostlist('node[01-03]'), ['node01', 'node02', 'node03']);
  assert.deepEqual(expandSlurmHostlist('node[1-3]'), ['node1', 'node2', 'node3']);
  assert.deepEqual(expandSlurmHostlist('host'), ['host']);
  // End-to-end via parser: 'node[01-03]' yields 3 leaves with literal zero-pad.
  const text = 'SwitchName=sw Nodes=node[01-03]\n';
  const snap = parseSlurmTopologyConf(text, META);
  const leaves = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort();
  assert.deepEqual(leaves, ['node01', 'node02', 'node03']);
});

// ── AC-R28-4: multi-token brackets ────────────────────────────────
test('AC-R28-4: bracket with mixed singletons + ranges expands correctly', () => {
  assert.deepEqual(expandSlurmHostlist('node[1-3,5,7-9]'), ['node1', 'node2', 'node3', 'node5', 'node7', 'node8', 'node9']);
  // Verify via parser end-to-end.
  const text = 'SwitchName=sw Nodes=node[1-3,5,7-9]\n';
  const snap = parseSlurmTopologyConf(text, META);
  const leaves = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort((a, b) => {
    const an = parseInt(a.replace('node', ''), 10);
    const bn = parseInt(b.replace('node', ''), 10);
    return an - bn;
  });
  assert.deepEqual(leaves, ['node1', 'node2', 'node3', 'node5', 'node7', 'node8', 'node9']);
});

// ── AC-R28-5: sparse / undeclared child switch ──────────────────
test('AC-R28-5: undeclared child switch auto-creates as rack placeholder', () => {
  const text = readFixture('slurm-fixture-sparse.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Fixture: SwitchName=top Switches=child0 (child0 NOT declared on its own SwitchName= line).
  const rackIds = snap.nodes.filter((n) => n.kind === 'rack').map((n) => n.id).sort();
  assert.deepEqual(rackIds, ['child0', 'top']);
  // Edge top→child0 exists with relationship 'contains'.
  const edge = snap.edges.find((e) => e.from === 'top' && e.to === 'child0');
  assert.ok(edge);
  assert.equal(edge.relationship, 'contains');
});

// ── AC-R28-6: comment + blank-line tolerance ─────────────────────
test('AC-R28-6: comment lines and blank lines are skipped without throwing', () => {
  const text = `# comment at top\n\nSwitchName=sw Nodes=node1\n\n# trailing comment\n`;
  const snap = parseSlurmTopologyConf(text, META);
  assert.equal(snap.nodes.length, 2); // sw + node1
  assert.equal(snap.edges.length, 1);
});

// ── AC-R28-7: kind/relationship literal invariant ─────────────────
test('AC-R28-7: all emitted nodes have kind in {rack,gpu_shard}; all edges relationship=contains', () => {
  const fixtures = ['slurm-fixture-canonical.conf', 'slurm-fixture-hierarchical.conf', 'slurm-fixture-sparse.conf'];
  for (const f of fixtures) {
    const snap = parseSlurmTopologyConf(readFixture(f), META);
    for (const n of snap.nodes) {
      assert.ok(n.kind === 'rack' || n.kind === 'gpu_shard', `unexpected kind ${n.kind} on node ${n.id} (fixture ${f})`);
    }
    for (const e of snap.edges) {
      assert.equal(e.relationship, 'contains', `unexpected relationship ${e.relationship} on edge ${e.from}→${e.to} (fixture ${f})`);
    }
  }
});

// ── AC-R28-8: parse-error throws ──────────────────────────────────
test('AC-R28-8: malformed inputs throw SLURM_TOPOLOGY_PARSE_ERROR', () => {
  // (a) empty SwitchName
  assert.throws(() => parseSlurmTopologyConf('SwitchName=\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
  // (b) duplicate SwitchName
  assert.throws(
    () => parseSlurmTopologyConf('SwitchName=sw0\nSwitchName=sw0\n', META),
    /SLURM_TOPOLOGY_PARSE_ERROR.*duplicate/,
  );
  // (c) malformed range
  assert.throws(() => parseSlurmTopologyConf('SwitchName=sw Nodes=node[1-]\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
  // (d) unclosed bracket
  assert.throws(() => parseSlurmTopologyConf('SwitchName=sw Nodes=node[1-3\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
});

// ── AC-R28-9: empty input → empty snapshot ──────────────────────
test('AC-R28-9: empty or whitespace-only input produces empty snapshot (no throw)', () => {
  const snap1 = parseSlurmTopologyConf('', META);
  assert.deepEqual(snap1.nodes, []);
  assert.deepEqual(snap1.edges, []);
  assert.equal(snap1.fetched_at_ts, META.fetchedAtTs);
  const snap2 = parseSlurmTopologyConf('  \n\n   \t\n', META);
  assert.deepEqual(snap2.nodes, []);
  assert.deepEqual(snap2.edges, []);
});

// ── AC-R28-10: TopologySource conformance + default fallback chain ─
test('AC-R28-10: SlurmTopologySource implements TopologySource; default opts produce canonical id/version/fetchedAtTs', async () => {
  // Conformance: structural shape.
  const src: TopologySource = new SlurmTopologySource('SwitchName=sw Nodes=node1\n');
  assert.equal(typeof src.id, 'string');
  assert.equal(typeof src.version, 'string');
  assert.equal(typeof src.fetchSnapshot, 'function');
  assert.equal(typeof src.snapshotHash, 'function');
  // Default fallback: id, version, fetched_at_ts.
  assert.equal(src.id, 'slurm_topology_source');
  assert.equal(src.version, 'slurm-1');
  const snap = await src.fetchSnapshot();
  const nowSeconds = Math.floor(Date.now() / 1000);
  assert.ok(Math.abs(snap.fetched_at_ts - nowSeconds) < 60, `fetched_at_ts ${snap.fetched_at_ts} not within 60s of ${nowSeconds}`);
  assert.equal(snap.source_id, 'slurm_topology_source');
  assert.equal(snap.source_version, 'slurm-1');
  // snapshotHash delegates to computeSnapshotHash (bit-equal).
  assert.equal(src.snapshotHash(snap), computeSnapshotHash(snap));
  // Identity-equal across repeated fetchSnapshot() calls.
  const snap2 = await src.fetchSnapshot();
  assert.strictEqual(snap, snap2);
  // Override opts: explicit id/version/fetchedAtTs.
  const src2 = new SlurmTopologySource('SwitchName=sw Nodes=node1\n', { id: 'custom_id', version: 'v9', fetchedAtTs: 1234567890 });
  const snap3 = await src2.fetchSnapshot();
  assert.equal(src2.id, 'custom_id');
  assert.equal(src2.version, 'v9');
  assert.equal(snap3.fetched_at_ts, 1234567890);
  assert.equal(snap3.source_id, 'custom_id');
  assert.equal(snap3.source_version, 'v9');
});

// ── AC-R28-11: TopologyEnricher integration preserves A16 wire-format ─
test('AC-R28-11: SlurmTopologySource through TopologyEnricher produces candidates with correlational_not_causal: true', async () => {
  // Fixture: 1 switch + 2 leaves. Group's deploy_id resolves to one leaf; event on the other leaf.
  // VerdictGroup required-fields list verified against engine/types/verdict.ts:189-222.
  // TopologyCandidateEvent.event_type union verified against engine/types/verdict.ts:321 ('deploy'|'incident'|'alert'|'unknown').
  const src = new SlurmTopologySource('SwitchName=sw Nodes=node1,node2\n', { fetchedAtTs: 1700000000 });
  const enricher = new TopologyEnricher({ source: src, max_hop_distance: 3 });
  const group: VerdictGroup = {
    group_id: 'grp-1',
    deploy_id: 'node1',
    window_start_ts: 1700000000,
    window_end_ts: 1700000600,
    verdicts: [],
    firing_verdicts: [],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [],
    closed: true,
    closed_at_ts: 1700000600,
  };
  const events: TopologyCandidateEvent[] = [
    { node_id: 'node2', event_id: 'ev-1', event_type: 'deploy', event_ts: 1700000300 },
  ];
  const result = await enricher.enrich(group, events);
  assert.equal(result.enrichment_error, null);
  assert.ok(result.candidates.length >= 1);
  for (const c of result.candidates) {
    assert.equal(c.correlational_not_causal, true, `candidate ${c.node_id} dropped correlational_not_causal label`);
  }
});
