// q-clustersynth-smoke.test.ts — contract smoke test for the clustersynth
// synthetic-fixture project (github.com/johnpatrickwarren-oss/clustersynth).
//
// Proves clustersynth-emitted JSON satisfies Tessera's TopologySnapshot
// contract end-to-end, including the federation invariant exposed by the
// C0 (campus) shape variant.
//
// Type model: composes the engine's base NodeKind / EdgeRelationship with the
// optional ClusterTopologyKind / ClusterEdgeRelationship extensions from
// engine/types/verdict-extensions/cluster-topology. The base unions stay
// closed (exhaustive switches in DeploySignal etc. preserved); cluster-aware
// code paths use the composed wider type.
//
// Fixtures are NOT committed to tessera. Contributors generate them locally:
//
//   git clone https://github.com/johnpatrickwarren-oss/clustersynth.git
//   cd clustersynth && pnpm install
//   node_modules/.bin/tsx src/cli.ts gb200 s2 --out ../tessera/test/_substrate/clustersynth-gb200-s2.json
//   node_modules/.bin/tsx src/cli.ts gb200 c0 --out ../tessera/test/_substrate/clustersynth-gb200-c0.json
//
// Tests skip cleanly if the fixtures aren't present.

import { test } from 'node:test';
import { strict as a } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  TopologySnapshot,
  TopologyNode,
  TopologyEdge,
} from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import type {
  ClusterTopologyKind,
  ClusterEdgeRelationship,
} from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict-extensions/cluster-topology';

// The engine's base unions are inline-literal inside TopologyNode/TopologyEdge
// (no exported NodeKind / EdgeRelationship aliases as of v0.3.0-pre). Derive
// via indexed access to keep the engine PR minimally scoped.
type BaseNodeKind = TopologyNode['kind'];
type BaseEdgeRelationship = TopologyEdge['relationship'];

// Tessera's working vocabulary for cluster-aware code paths.
type TesseraNodeKind = BaseNodeKind | ClusterTopologyKind;
type TesseraEdgeRelationship = BaseEdgeRelationship | ClusterEdgeRelationship;

interface ClusterTopologyNode extends Omit<TopologyNode, 'kind'> {
  kind: TesseraNodeKind;
}
interface ClusterTopologyEdge extends Omit<TopologyEdge, 'relationship'> {
  relationship: TesseraEdgeRelationship;
}
interface ClusterTopologySnapshot extends Omit<TopologySnapshot, 'nodes' | 'edges'> {
  nodes: ClusterTopologyNode[];
  edges: ClusterTopologyEdge[];
}

const SUBSTRATE = join(__dirname, '_substrate');
const S2 = join(SUBSTRATE, 'clustersynth-gb200-s2.json');
const C0 = join(SUBSTRATE, 'clustersynth-gb200-c0.json');

function load(path: string): ClusterTopologySnapshot {
  return JSON.parse(readFileSync(path, 'utf8')) as ClusterTopologySnapshot;
}

test('clustersynth S2 envelope satisfies Tessera TopologySnapshot', { skip: !existsSync(S2) && 'clustersynth fixture missing (gitignored) — generate per bench/README.md' }, () => {
  const snap = load(S2);
  // Envelope-level assignability: every TopologySnapshot field present and well-typed.
  a.ok(Array.isArray(snap.nodes));
  a.ok(Array.isArray(snap.edges));
  a.equal(typeof snap.fetched_at_ts, 'number');
  a.equal(typeof snap.source_id, 'string');
  a.equal(typeof snap.source_version, 'string');
  // PRD-01 AC-3: S2 has exactly 7,200 gpu_shard
  const gpu = snap.nodes.filter((n) => n.kind === 'gpu_shard').length;
  a.equal(gpu, 7200);
});

test('clustersynth S2 referential integrity', { skip: !existsSync(S2) && 'clustersynth fixture missing (gitignored) — generate per bench/README.md' }, () => {
  const snap = load(S2);
  const ids = new Set(snap.nodes.map((n) => n.id));
  for (const e of snap.edges) {
    a.ok(ids.has(e.from), `dangling edge.from: ${e.from}`);
    a.ok(ids.has(e.to), `dangling edge.to: ${e.to}`);
  }
});

test('clustersynth-added kinds type-narrow via ClusterTopologyKind extension', { skip: !existsSync(S2) && 'clustersynth fixture missing (gitignored) — generate per bench/README.md' }, () => {
  const snap = load(S2);
  // Every cluster-added kind is reachable via narrowing on the composed type —
  // proves the extension types resolve and compose correctly.
  const cluster = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'cluster' } => n.kind === 'cluster');
  const cpu = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'cpu_shard' } => n.kind === 'cpu_shard');
  const superchip = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'superchip' } => n.kind === 'superchip');
  const nvswitch = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'nvlink_switch' } => n.kind === 'nvlink_switch');
  const nic = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'nic' } => n.kind === 'nic');
  const pod = snap.nodes.find((n): n is ClusterTopologyNode & { kind: 'pod' } => n.kind === 'pod');
  a.ok(cluster, 'cluster kind narrows');
  a.ok(cpu, 'cpu_shard kind narrows');
  a.ok(superchip, 'superchip kind narrows');
  a.ok(nvswitch, 'nvlink_switch kind narrows');
  a.ok(nic, 'nic kind narrows');
  a.ok(pod, 'pod kind narrows');
});

test('clustersynth C0 (federated campus) partitions by sub-cluster ID prefix', { skip: !existsSync(C0) && 'clustersynth fixture missing (gitignored) — generate per bench/README.md' }, () => {
  const snap = load(C0);
  // 4 sub-clusters × 7200 = 28,800 GPUs
  const gpu = snap.nodes.filter((n) => n.kind === 'gpu_shard').length;
  a.equal(gpu, 28_800);
  // 4 sub-clusters present
  const clusters = snap.nodes.filter((n) => n.kind === 'cluster').length;
  a.equal(clusters, 4);
  // Every gpu_shard ID maps to exactly one sub-cluster — the federation invariant
  // that distinguishes campus from flat-cluster topologies.
  const prefixes = [0, 1, 2, 3].map((i) => `campus-0-cluster-${i}-`);
  for (const n of snap.nodes.filter((n) => n.kind === 'gpu_shard')) {
    const matched = prefixes.filter((p) => n.id.startsWith(p));
    a.equal(matched.length, 1, `gpu_shard ${n.id} did not partition cleanly`);
  }
});

test('clustersynth C0 sub-cluster partitions are disjoint', { skip: !existsSync(C0) && 'clustersynth fixture missing (gitignored) — generate per bench/README.md' }, () => {
  const snap = load(C0);
  const byCluster: Record<string, string[]> = { '0': [], '1': [], '2': [], '3': [] };
  for (const n of snap.nodes.filter((n) => n.kind === 'gpu_shard')) {
    const m = n.id.match(/^campus-0-cluster-(\d+)-/);
    if (m) byCluster[m[1]!]!.push(n.id);
  }
  for (const i of ['0', '1', '2', '3']) {
    a.equal(byCluster[i]!.length, 7200, `sub-cluster ${i} shard count`);
  }
  const allShards = Object.values(byCluster).flat();
  a.equal(new Set(allShards).size, allShards.length, 'sub-cluster partitions are disjoint');
});
