// test/_substrate/v9X-cluster.ts — Phase 2 SLICE 1 synthetic-cluster substrate (R18).
//
// Single-rack uniform-shard fixture per SCOPING-MEMO-v0.3.md § 2.3 Q-J4(i)
// disposition. Builds a TopologySnapshot with 1 rack node + N gpu_shard
// nodes + N 'contains' edges. Default N=10.
//
// Naming convention parallels test/_substrate/factories.ts:
//   make<TypeName>(overrides?) → TypeName; defaults are deterministic-test
//   friendly; opts are shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../../engine/types/verdict';

export interface MakeV9XSingleRackClusterOpts {
  nShards?: number;
  rackId?: string;
  shardIdPrefix?: string;
  fetchedAtTs?: number;
}

export function makeV9XSingleRackCluster(
  opts: MakeV9XSingleRackClusterOpts = {},
): TopologySnapshot {
  const nShards = opts.nShards ?? 10;
  const rackId = opts.rackId ?? 'rack-0';
  const shardIdPrefix = opts.shardIdPrefix ?? 'shard-';
  const fetchedAtTs = opts.fetchedAtTs ?? 1700000000;

  const rackNode: TopologyNode = {
    id: rackId,
    service_name: rackId,
    kind: 'rack',
  };

  const shardNodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  for (let i = 0; i < nShards; i++) {
    const shardId = `${shardIdPrefix}${i}`;
    shardNodes.push({
      id: shardId,
      service_name: shardId,
      kind: 'gpu_shard',
    });
    edges.push({
      from: rackId,
      to: shardId,
      relationship: 'contains',
    });
  }

  return {
    nodes: [rackNode, ...shardNodes],
    edges,
    fetched_at_ts: fetchedAtTs,
    source_id: 'v9X_synthetic_single_rack',
    source_version: 'v9X.1',
  };
}
