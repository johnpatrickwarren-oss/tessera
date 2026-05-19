// test/_substrate/v9Z-event-cluster.ts — Phase 2 SLICE 4 (R34) WU-06 event-cluster substrate.
//
// Extends v9Y-multi-rack-cluster (R23-frozen — NOT modified) with 4 named
// scenario builders returning { cluster_events: ClusterEvent[], fired_events: FiredShardEvent[] }
// for the PR-F7 4-cell ITS evidence matrix.
//
// PR-F7 Cell definitions (per Q-R34-SPEC § 3.7):
//   Cell 1 (scenarioCell1): 1 ClusterEvent + 3 correlated post-window fires → 1 candidate, member_count=3
//   Cell 2 (scenarioCell2): 0 ClusterEvents + 0 fires → 0 candidates
//   Cell 3 (scenarioCell3): 1 ClusterEvent + 1 singleton fire → 0 candidates (below min_post_count=2)
//   Cell 4 (scenarioCell4): 1 ClusterEvent + 2 correlated + 2 unrelated → 1 candidate, member_count=2
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologySnapshot } from '../../engine/types/verdict';
import type { ClusterEvent } from '../../engine/events/event-feed';
import type { FiredShardEvent } from '../../engine/topology/common-mode-attribution';
import { makeV9YMultiRackCluster } from './v9Y-multi-rack-cluster';

export interface EventClusterScenario {
  cluster_events: ClusterEvent[];
  fired_events: FiredShardEvent[];
}

/** PR-F7 Cell 1 — confirmed elevation.
 *  1 ClusterEvent (firmware_push) at t=1000.
 *  3 FiredShardEvents in post-window [1000, 1300) within 60s of event:
 *    shard-0 at t=1000, shard-1 at t=1030, shard-2 at t=1050.
 *  Pre-window (700, 1000]: 0 fires.
 *  Expected: 1 candidate; member_count=3; pre_window_count=0; post_window_count=3.
 */
export function scenarioCell1(): EventClusterScenario {
  const cluster_events: ClusterEvent[] = [
    { event_id: 'evt-cell1', kind: 'firmware_push', event_ts: 1000 },
  ];
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 1000 },
    { shard_node_id: 'shard-1', event_ts: 1030 },
    { shard_node_id: 'shard-2', event_ts: 1050 },
  ];
  return { cluster_events, fired_events };
}

/** PR-F7 Cell 2 — no event, no fires (true negative).
 *  0 ClusterEvents; 0 FiredShardEvents.
 *  Expected: 0 candidates.
 */
export function scenarioCell2(): EventClusterScenario {
  return { cluster_events: [], fired_events: [] };
}

/** PR-F7 Cell 3 — negative specificity (singleton below min_post_count=2).
 *  1 ClusterEvent (model_redeploy) at t=2000.
 *  1 FiredShardEvent at t=2030 (within 60s of event, in post-window).
 *  Expected: 0 candidates (singleton filtered by min_post_count=2).
 */
export function scenarioCell3(): EventClusterScenario {
  const cluster_events: ClusterEvent[] = [
    { event_id: 'evt-cell3', kind: 'model_redeploy', event_ts: 2000 },
  ];
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 2030 },
  ];
  return { cluster_events, fired_events };
}

/** PR-F7 Cell 4 — confounding discrimination (Cell 4 ITS discriminator).
 *  1 ClusterEvent (config_change) at t=3000.
 *  4 FiredShardEvents in post-window [3000, 3300):
 *    shard-0 at t=3010 (|3010-3000|=10 ≤ 60 → correlated)
 *    shard-1 at t=3050 (|3050-3000|=50 ≤ 60 → correlated)
 *    shard-2 at t=3100 (|3100-3000|=100 > 60 → unrelated/latent-fault)
 *    shard-3 at t=3200 (|3200-3000|=200 > 60 → unrelated/latent-fault)
 *  Expected: 1 candidate; member_shard_ids=['shard-0','shard-1']; shard-2/shard-3 excluded.
 */
export function scenarioCell4(): EventClusterScenario {
  const cluster_events: ClusterEvent[] = [
    { event_id: 'evt-cell4', kind: 'config_change', event_ts: 3000 },
  ];
  const fired_events: FiredShardEvent[] = [
    { shard_node_id: 'shard-0', event_ts: 3010 },
    { shard_node_id: 'shard-1', event_ts: 3050 },
    { shard_node_id: 'shard-2', event_ts: 3100 },
    { shard_node_id: 'shard-3', event_ts: 3200 },
  ];
  return { cluster_events, fired_events };
}

/** Build a v9Z TopologySnapshot extending v9Y with event-feed metadata.
 *  Used by future Phase 3+ orchestrator integrations; currently informational. */
export function buildV9ZSubstrate(): TopologySnapshot {
  const base = makeV9YMultiRackCluster();
  return {
    ...base,
    source_id: 'v9Z_synthetic_event_cluster',
    source_version: 'v9Z.1',
  };
}
