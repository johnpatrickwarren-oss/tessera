// tools/_build-canned-demos-scenarios-topology.ts — topology common-mode scenarios.
// VERBATIM scenario bodies from tools/build-canned-demos.ts (no computation changes);
// topology fixtures are factored into per-scenario setup helpers (contiguous blocks),
// and the terminal candidate mapping is delegated to mapTerminalCandidates() in core.

import { attributeCommonMode, type FiredShardEvent, DEFAULT_MIN_MEMBER_COUNT }
  from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import type { TopologySnapshot, TopologyNode, TopologyEdge }
  from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

import type { ScenarioJson, WindowEntry } from './_build-canned-demos-types.js';
import { SCENARIO_SEEDS } from './_build-canned-demos-types.js';
import {
  NULL_PER_WINDOW_DETECTORS,
  composeScenarioJson,
  mapTerminalCandidates,
} from './_build-canned-demos-core.js';

// ── Scenario 3: common-mode-rack ──
interface CommonModeRackFixture {
  snapshot: TopologySnapshot;
  firedEvents: FiredShardEvent[];
  shardIds: string[];
}
function commonModeRackFixture(): CommonModeRackFixture {
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  const edges: TopologyEdge[] = [
    { from: 'rack-A', to: 'shard-00', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-01', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-02', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-03', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-04', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-05', relationship: 'contains' },
  ];
  const snapshot: TopologySnapshot = {
    nodes,
    edges,
    fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-demo-synthetic',
    source_version: 'v1-demo',
  };

  const firedEvents: FiredShardEvent[] = [
    { shard_node_id: 'shard-00', event_ts: 1_700_000_100, event_id: 'evt-cm-1' },
    { shard_node_id: 'shard-01', event_ts: 1_700_000_110, event_id: 'evt-cm-2' },
    { shard_node_id: 'shard-02', event_ts: 1_700_000_120, event_id: 'evt-cm-3' },
  ];

  const shardIds = ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'];
  return { snapshot, firedEvents, shardIds };
}

export function runCommonModeRackRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const ATTRIBUTION_WINDOW = 3;

  const { snapshot, firedEvents, shardIds } = commonModeRackFixture();
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    let candidates: ReturnType<typeof attributeCommonMode>['candidates'] = [];
    let windowEvents: unknown[] = [];

    if (w === ATTRIBUTION_WINDOW) {
      const result = attributeCommonMode({
        fired_events: firedEvents,
        snapshot,
        opts: { now: () => 1_700_000_200 },
      });
      candidates = result.candidates;
      windowEvents = firedEvents.map(e => ({ type: 'shard_fired', shard_id: e.shard_node_id, event_id: e.event_id }));
      windowEvents.push({
        type: 'attribution_result',
        candidate_count: candidates.length,
        attributed_at_ts: result.attributed_at_ts,
      });
    }

    windows.push({
      t: w,
      per_shard: shardIds.map(id => ({
        shard_id: id,
        M_t: null,
        fired: w === ATTRIBUTION_WINDOW && (id === 'shard-00' || id === 'shard-01' || id === 'shard-02'),
        residual_proxy: null,
      })),
      events: windowEvents,
      per_window_detectors: NULL_PER_WINDOW_DETECTORS,
    });
  }

  // Attribution result for terminal state
  const terminalResult = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 },
  });

  const candidatesForTerminal = mapTerminalCandidates(terminalResult.candidates);

  return composeScenarioJson({
    scenario: 'common-mode-rack',
    description: 'Three shards on rack-A fire simultaneously in window 3. Topology-aware attribution surfaces 1 common-mode candidate keyed on rack-A with member_count=3, demonstrating rack-localized root-cause surfacing.',
    params: {
      seed: SCENARIO_SEEDS['common-mode-rack'],
      shard_count: 6,
      window_count: WINDOW_COUNT,
      attribution_window: ATTRIBUTION_WINDOW,
      topology: '2-rack 6-shard (rack-A: 0/1/2; rack-B: 3/4/5)',
      min_member_count: DEFAULT_MIN_MEMBER_COUNT,
    },
    engine_surfaces: ['attributeCommonMode'],
    windows,
    terminal_state: {
      firing_shards: ['shard-00', 'shard-01', 'shard-02'],
      common_mode_candidates: candidatesForTerminal,
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Three shards on rack-A fire simultaneously. Without topology-aware attribution this would surface as 3 independent per-shard alerts. With topology-aware attribution it surfaces as 1 common-mode candidate keyed on rack-A, suggesting a rack-localized root cause (PSU, top-of-rack switch, or shared cooling).',
    suggested_actions: [
      'Inspect rack-A power / cooling / network at the rack-localized layer (NOT per-shard)',
      'Correlate the firing window against rack-A maintenance / hardware-event audit logs',
      'Verify no concurrent unrelated faults on rack-B before attributing to rack-A common-mode',
    ],
    detector_families: [],
    threshold_crossing_log: [],
    provenance_receipts: [],
  });
}

// ── Scenario 7: sparse-data-resilience ──
interface SparseFixture {
  snapshot: TopologySnapshot;
  firedEvents: FiredShardEvent[];
  shardIds: string[];
}
function sparseDataResilienceFixture(): SparseFixture {
  // Nodes exist but zero edges — sparse topology
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  // Zero edges — relationship layer missing/corrupted
  const snapshot: TopologySnapshot = {
    nodes,
    edges: [],
    fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-demo-synthetic-sparse',
    source_version: 'v1-demo-sparse',
  };

  const firedEvents: FiredShardEvent[] = [
    { shard_node_id: 'shard-00', event_ts: 1_700_000_100, event_id: 'evt-sparse-1' },
    { shard_node_id: 'shard-01', event_ts: 1_700_000_110, event_id: 'evt-sparse-2' },
    { shard_node_id: 'shard-02', event_ts: 1_700_000_120, event_id: 'evt-sparse-3' },
  ];

  const shardIds = ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'];
  return { snapshot, firedEvents, shardIds };
}

export function runSparseDataResilienceRecording(): ScenarioJson {
  const WINDOW_COUNT = 3;
  const ATTRIBUTION_WINDOW = 2;

  const { snapshot, firedEvents, shardIds } = sparseDataResilienceFixture();
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    const windowEvents: unknown[] = [];
    if (w === ATTRIBUTION_WINDOW) {
      const result = attributeCommonMode({
        fired_events: firedEvents,
        snapshot,
        opts: { now: () => 1_700_000_200 },
      });
      windowEvents.push({
        type: 'attribution_result',
        candidate_count: result.candidates.length,
        note: 'BFS over empty adjacency returns 0 candidates without throwing',
      });
    }
    windows.push({
      t: w,
      per_shard: shardIds.map(id => ({
        shard_id: id,
        M_t: null,
        fired: w === ATTRIBUTION_WINDOW && (id === 'shard-00' || id === 'shard-01' || id === 'shard-02'),
        residual_proxy: null,
      })),
      events: windowEvents,
      per_window_detectors: NULL_PER_WINDOW_DETECTORS,
    });
  }

  // Attribution for terminal state
  const terminalResult = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 },
  });

  return composeScenarioJson({
    scenario: 'sparse-data-resilience',
    description: 'Topology snapshot has nodes (6 gpu_shard + 2 rack) but zero edges. BFS over empty adjacency finds no candidate-eligible nodes; 0 candidates returned without throwing. Demonstrates graceful degradation under partial telemetry.',
    params: {
      seed: SCENARIO_SEEDS['sparse-data-resilience'],
      shard_count: 6,
      window_count: WINDOW_COUNT,
      attribution_window: ATTRIBUTION_WINDOW,
      topology: '6 gpu_shard + 2 rack; zero edges (sparse)',
      min_member_count: DEFAULT_MIN_MEMBER_COUNT,
    },
    engine_surfaces: ['attributeCommonMode'],
    windows,
    detector_families: [],
    threshold_crossing_log: [],
    provenance_receipts: [],
    terminal_state: {
      firing_shards: ['shard-00', 'shard-01', 'shard-02'],
      common_mode_candidates: mapTerminalCandidates(terminalResult.candidates),
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'The topology snapshot has nodes (racks + shards) but zero edges — a degraded telemetry state where the relationship layer is missing or corrupted. Three shards fire simultaneously, but BFS over an empty adjacency list reaches no candidate-eligible nodes; the attribution layer returns 0 candidates without throwing. This demonstrates that topology-aware attribution degrades gracefully under partial data rather than failing closed (which would mask the per-shard alerts).',
    suggested_actions: [
      'Fall back to per-shard alerts: 3 independent firings on shards 0/1/2 require individual investigation',
      'Investigate the topology data source: why are edges missing? Re-fetch the snapshot before re-running attribution',
      "Audit whether the topology source's sparse-data path is correctly identifying this as 'incomplete' rather than 'no common-mode found'",
    ],
  });
}

// ── Scenario 8: topology-spanning-common-mode ──
interface TopologySpanningFixture {
  snapshot: TopologySnapshot;
  firedEvents: FiredShardEvent[];
  shardIds: string[];
}
function topologySpanningFixture(): TopologySpanningFixture {
  // 6 gpu_shard + 2 rack + 1 cooling_zone; cooling_zone contains both racks
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'cz-1',     service_name: 'cz-1',     kind: 'cooling_zone' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  const edges: TopologyEdge[] = [
    { from: 'cz-1',   to: 'rack-A',   relationship: 'contains' },
    { from: 'cz-1',   to: 'rack-B',   relationship: 'contains' },
    { from: 'rack-A', to: 'shard-00', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-01', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-02', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-03', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-04', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-05', relationship: 'contains' },
  ];
  const snapshot: TopologySnapshot = {
    nodes,
    edges,
    fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-demo-synthetic',
    source_version: 'v1-demo',
  };

  // 4 fired events spanning both racks: shards 0/1 (rack-A) + 3/4 (rack-B)
  const firedEvents: FiredShardEvent[] = [
    { shard_node_id: 'shard-00', event_ts: 1_700_000_100, event_id: 'evt-span-1' },
    { shard_node_id: 'shard-01', event_ts: 1_700_000_110, event_id: 'evt-span-2' },
    { shard_node_id: 'shard-03', event_ts: 1_700_000_120, event_id: 'evt-span-3' },
    { shard_node_id: 'shard-04', event_ts: 1_700_000_130, event_id: 'evt-span-4' },
  ];

  const shardIds = ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'];
  return { snapshot, firedEvents, shardIds };
}

export function runTopologySpanningRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const ATTRIBUTION_WINDOW = 3;

  const { snapshot, firedEvents, shardIds } = topologySpanningFixture();
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    const windowEvents: unknown[] = [];
    if (w === ATTRIBUTION_WINDOW) {
      const result = attributeCommonMode({
        fired_events: firedEvents,
        snapshot,
        opts: {
          now: () => 1_700_000_200,
          max_hop_distance: 2,
          candidate_node_kinds: ['cooling_zone', 'rack', 'psu'],
        },
      });
      windowEvents.push({
        type: 'attribution_result',
        candidate_count: result.candidates.length,
        max_hop_distance: 2,
      });
    }
    windows.push({
      t: w,
      per_shard: shardIds.map(id => ({
        shard_id: id,
        M_t: null,
        fired: w === ATTRIBUTION_WINDOW && (id === 'shard-00' || id === 'shard-01' || id === 'shard-03' || id === 'shard-04'),
        residual_proxy: null,
      })),
      events: windowEvents,
      per_window_detectors: NULL_PER_WINDOW_DETECTORS,
    });
  }

  // Attribution for terminal state
  const terminalResult = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: {
      now: () => 1_700_000_200,
      max_hop_distance: 2,
      candidate_node_kinds: ['cooling_zone', 'rack', 'psu'],
    },
  });

  const candidatesForTerminal = mapTerminalCandidates(terminalResult.candidates);

  return composeScenarioJson({
    scenario: 'topology-spanning-common-mode',
    description: 'Four shards spanning both racks fire simultaneously. With max_hop_distance=2 and cooling_zone in candidate_node_kinds, BFS reaches the cooling_zone node common to both racks; ONE cooling-zone-level candidate surfaces spanning all 4 firing shards.',
    params: {
      seed: SCENARIO_SEEDS['topology-spanning-common-mode'],
      shard_count: 6,
      window_count: WINDOW_COUNT,
      attribution_window: ATTRIBUTION_WINDOW,
      topology: '6 gpu_shard + 2 rack + 1 cooling_zone (cz-1 contains rack-A + rack-B)',
      fired_shards: ['shard-00', 'shard-01', 'shard-03', 'shard-04'],
      max_hop_distance: 2,
    },
    engine_surfaces: ['attributeCommonMode'],
    windows,
    detector_families: [],
    threshold_crossing_log: [],
    provenance_receipts: [],
    terminal_state: {
      firing_shards: ['shard-00', 'shard-01', 'shard-03', 'shard-04'],
      common_mode_candidates: candidatesForTerminal,
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Four shards spanning both racks fire simultaneously. With the default max_hop_distance = 1, common-mode attribution would surface two separate rack-level candidates. With max_hop_distance = 2 and cooling_zone included in candidate_node_kinds, the BFS reaches the cooling_zone node common to both racks and surfaces ONE cooling-zone-level candidate spanning all 4 firing shards. This demonstrates how operator-tunable BFS depth controls attribution granularity from rack to cooling-zone to (in larger fleets) datacenter-level common modes.',
    suggested_actions: [
      'Inspect cooling-zone-level infrastructure (chilled-water loops, ambient temperature sensors, datacenter HVAC)',
      'Verify the cooling-zone topology data: is cz-1 correctly modeled as containing rack-A and rack-B?',
      'If cluster-wide common-mode is a frequent operating regime, raise the default max_hop_distance in production attribution-pipeline config (operator policy decision)',
    ],
  });
}
