// q-r06-federation-attribution.test.ts — Federation invariant verification for
// clustersynth C0 (federated campus) fixture under the engine's
// attributeCommonMode.
//
// Property tested: the engine's BFS-bounded substrate attribution respects
// sub-cluster boundaries at operationally-reasonable max_hop_distance values,
// and identifies the hop-distance threshold past which the BFS can cross
// sub-clusters via the spine ↔ site_wan_router ↔ spine path.
//
// Design + acceptance: clustersynth coordination/specs/Q-R06-SPEC.md
// (johnpatrickwarren-oss/clustersynth).

import { test } from 'node:test';
import { strict as a } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TopologySnapshot } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import {
  attributeCommonMode,
  type FiredShardEvent,
} from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';

const C0_PATH = join(__dirname, '_substrate', 'clustersynth-gb200-c0.json');

interface LooseNode { id: string; service_name: string; kind: string }
interface LooseSnap {
  nodes: LooseNode[];
  edges: { from: string; to: string; relationship: string }[];
  fetched_at_ts: number;
  source_id: string;
  source_version: string;
}

function loadC0(): LooseSnap {
  return JSON.parse(readFileSync(C0_PATH, 'utf8')) as LooseSnap;
}

function shardsInRack(snap: LooseSnap, rackPrefix: string): string[] {
  return snap.nodes
    .filter((n) => n.kind === 'gpu_shard' && n.id.startsWith(rackPrefix))
    .map((n) => n.id);
}

function clusterOf(nodeId: string): string | null {
  const m = nodeId.match(/^campus-0-(cluster-\d+)-/);
  return m ? m[1]! : null;
}

test('AC-R06-1: max_hop=1 — no substrate candidates surface (BFS does not reach rack)',
  { skip: !existsSync(C0_PATH) }, () => {
    const snap = loadC0();
    const fires: FiredShardEvent[] = [];
    for (let r = 0; r < 5; r++) {
      const prefix = `campus-0-cluster-0-pod-0-rack-${r}-`;
      for (const id of shardsInRack(snap, prefix).slice(0, 2)) {
        fires.push({ shard_node_id: id, event_ts: 1700000000 });
      }
    }
    const result = attributeCommonMode({
      fired_events: fires,
      snapshot: snap as unknown as TopologySnapshot,
      opts: { max_hop_distance: 1, min_member_count: 2 },
    });
    a.equal(result.candidates.length, 0,
      `at hop=1, BFS only reaches the tray (kind=superchip) — no substrate (psu/rack/CZ) within hop=1. Got ${result.candidates.length} candidates.`);
  });

test('AC-R06-2: max_hop=2, fires in cluster-0 — candidates all in cluster-0',
  { skip: !existsSync(C0_PATH) }, () => {
    const snap = loadC0();
    const fires: FiredShardEvent[] = [];
    for (let r = 0; r < 5; r++) {
      const prefix = `campus-0-cluster-0-pod-0-rack-${r}-`;
      for (const id of shardsInRack(snap, prefix).slice(0, 2)) {
        fires.push({ shard_node_id: id, event_ts: 1700000000 });
      }
    }
    const result = attributeCommonMode({
      fired_events: fires,
      snapshot: snap as unknown as TopologySnapshot,
      opts: { max_hop_distance: 2, min_member_count: 2 },
    });
    a.ok(result.candidates.length > 0,
      'expected at least one substrate candidate (rack) at hop=2 with 2 fires/rack');
    for (const c of result.candidates) {
      a.equal(clusterOf(c.shared_node_id), 'cluster-0',
        `candidate ${c.shared_node_id} not in cluster-0`);
      for (const m of c.member_shard_ids) {
        a.equal(clusterOf(m), 'cluster-0',
          `member ${m} of candidate ${c.shared_node_id} not in cluster-0`);
      }
    }
  });

test('AC-R06-3..4: fires split across cluster-0 + cluster-1, max_hop ∈ {2, 4} — candidates partition by cluster',
  { skip: !existsSync(C0_PATH) }, () => {
    const snap = loadC0();
    const fires: FiredShardEvent[] = [];
    for (const c of [0, 1]) {
      for (let r = 0; r < 5; r++) {
        const prefix = `campus-0-cluster-${c}-pod-0-rack-${r}-`;
        for (const id of shardsInRack(snap, prefix).slice(0, 2)) {
          fires.push({ shard_node_id: id, event_ts: 1700000000 });
        }
      }
    }
    for (const hop of [2, 4]) {
      const result = attributeCommonMode({
        fired_events: fires,
        snapshot: snap as unknown as TopologySnapshot,
        opts: { max_hop_distance: hop, min_member_count: 2 },
      });
      a.ok(result.candidates.length > 0, `hop=${hop}: expected ≥ 1 candidate`);
      for (const c of result.candidates) {
        const memberClusters = new Set(c.member_shard_ids.map(clusterOf));
        a.equal(memberClusters.size, 1,
          `hop=${hop} candidate ${c.shared_node_id} has cross-cluster members: ${[...memberClusters].join(',')}`);
      }
    }
  });

test('AC-R06-5: at max_hop ∈ {6, 8, 10} — record threshold at which cross-cluster contamination surfaces',
  { skip: !existsSync(C0_PATH) }, () => {
    const snap = loadC0();
    const fires: FiredShardEvent[] = [];
    for (const c of [0, 1]) {
      const prefix = `campus-0-cluster-${c}-pod-0-rack-0-`;
      for (const id of shardsInRack(snap, prefix).slice(0, 2)) {
        fires.push({ shard_node_id: id, event_ts: 1700000000 });
      }
    }
    const observations: Record<number, { totalCandidates: number; crossClusterCandidates: number }> = {};
    for (const hop of [6, 8, 10]) {
      const result = attributeCommonMode({
        fired_events: fires,
        snapshot: snap as unknown as TopologySnapshot,
        opts: { max_hop_distance: hop, min_member_count: 2 },
      });
      let cross = 0;
      for (const c of result.candidates) {
        const memberClusters = new Set(c.member_shard_ids.map(clusterOf));
        if (memberClusters.size > 1) cross++;
      }
      observations[hop] = { totalCandidates: result.candidates.length, crossClusterCandidates: cross };
    }
    process.stderr.write(
      `AC-R06-5 empirical thresholds: ${JSON.stringify(observations)}\n`,
    );
    a.ok(observations[10]!.crossClusterCandidates >= 1 || observations[10]!.totalCandidates === 0,
      `at hop=10 expected cross-cluster contamination ≥ 1 OR zero candidates; got ${observations[10]!.crossClusterCandidates}/${observations[10]!.totalCandidates}`);
  });

test('AC-R06-6: operationally-reasonable max_hop ≤ 4 — federation invariant holds with fires in all 4 sub-clusters',
  { skip: !existsSync(C0_PATH) }, () => {
    const snap = loadC0();
    const fires: FiredShardEvent[] = [];
    for (const c of [0, 1, 2, 3]) {
      for (let r = 0; r < 3; r++) {
        const prefix = `campus-0-cluster-${c}-pod-0-rack-${r}-`;
        for (const id of shardsInRack(snap, prefix).slice(0, 2)) {
          fires.push({ shard_node_id: id, event_ts: 1700000000 });
        }
      }
    }
    for (const hop of [1, 2, 3, 4]) {
      const result = attributeCommonMode({
        fired_events: fires,
        snapshot: snap as unknown as TopologySnapshot,
        opts: { max_hop_distance: hop, min_member_count: 2 },
      });
      for (const c of result.candidates) {
        const memberClusters = new Set(c.member_shard_ids.map(clusterOf));
        a.equal(memberClusters.size, 1,
          `federation violated at hop=${hop}: candidate ${c.shared_node_id} has members in ${memberClusters.size} clusters (${[...memberClusters].join(',')})`);
      }
    }
  });
