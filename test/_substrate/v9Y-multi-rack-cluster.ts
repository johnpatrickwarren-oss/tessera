// test/_substrate/v9Y-multi-rack-cluster.ts — Phase 2 SLICE 3.A synthetic-cluster substrate (R23).
//
// Multi-rack fixture with PSU + cooling-zone + nvlink_peer relationships
// per Q-R23-SPEC.md § 2.3. Default topology: 2 racks × 2 shards per rack
// + 1 PSU per rack + 1 cooling-zone per rack; nvlink_peer edges within
// each rack.
//
// Naming convention parallels test/_substrate/v9X-cluster.ts:
//   make<TypeName>(opts?) → TypeName; defaults are deterministic-test
//   friendly; opts are shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../../engine/types/verdict';

export interface MakeV9YMultiRackClusterOpts {
  fetchedAtTs?: number;
}

export function makeV9YMultiRackCluster(
  opts: MakeV9YMultiRackClusterOpts = {},
): TopologySnapshot {
  const fetchedAtTs = opts.fetchedAtTs ?? 1700000000;

  const nodes: TopologyNode[] = [
    { id: 'rack-0', service_name: 'rack-0', kind: 'rack' },
    { id: 'rack-1', service_name: 'rack-1', kind: 'rack' },
    { id: 'psu-0', service_name: 'psu-0', kind: 'psu' },
    { id: 'psu-1', service_name: 'psu-1', kind: 'psu' },
    { id: 'cz-0', service_name: 'cz-0', kind: 'cooling_zone' },
    { id: 'cz-1', service_name: 'cz-1', kind: 'cooling_zone' },
    { id: 'shard-0', service_name: 'shard-0', kind: 'gpu_shard' },
    { id: 'shard-1', service_name: 'shard-1', kind: 'gpu_shard' },
    { id: 'shard-2', service_name: 'shard-2', kind: 'gpu_shard' },
    { id: 'shard-3', service_name: 'shard-3', kind: 'gpu_shard' },
  ];

  const edges: TopologyEdge[] = [
    { from: 'rack-0', to: 'shard-0', relationship: 'contains' },
    { from: 'rack-0', to: 'shard-1', relationship: 'contains' },
    { from: 'rack-1', to: 'shard-2', relationship: 'contains' },
    { from: 'rack-1', to: 'shard-3', relationship: 'contains' },
    { from: 'psu-0', to: 'shard-0', relationship: 'contains' },
    { from: 'psu-0', to: 'shard-1', relationship: 'contains' },
    { from: 'psu-1', to: 'shard-2', relationship: 'contains' },
    { from: 'psu-1', to: 'shard-3', relationship: 'contains' },
    { from: 'cz-0', to: 'shard-0', relationship: 'contains' },
    { from: 'cz-0', to: 'shard-1', relationship: 'contains' },
    { from: 'cz-1', to: 'shard-2', relationship: 'contains' },
    { from: 'cz-1', to: 'shard-3', relationship: 'contains' },
    { from: 'shard-0', to: 'shard-1', relationship: 'nvlink_peer' },
    { from: 'shard-2', to: 'shard-3', relationship: 'nvlink_peer' },
  ];

  return {
    nodes,
    edges,
    fetched_at_ts: fetchedAtTs,
    source_id: 'v9Y_synthetic_multi_rack',
    source_version: 'v9Y.1',
  };
}
