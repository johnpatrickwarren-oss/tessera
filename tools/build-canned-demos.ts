// tools/build-canned-demos.ts — Tessera R71 demo dashboard build tool.
//
// Goal: convert Tessera's 4-CLI-scenario surface (R70) into an 8-scenario
// dashboard with audit / reasoning / suggested-actions panels.
//
// Anti-scope: no new external deps; no engine modifications;
// no real-cluster work; no DS-repo modifications; no browser bundling.
//
// Tessera-original code. NOT vendored.

// ── Engine imports (same .js extension convention as tools/demo-scenario.ts) ──
import { freshBettingState, updateBettingState }
  from '../engine/detectors/betting-e-process.js';
import { attributeCommonMode, type FiredShardEvent, DEFAULT_MIN_MEMBER_COUNT }
  from '../engine/topology/common-mode-attribution.js';
import { DsEventConsumer } from '../engine/ds-integration/event-consumer.js';
import { createFreezeHookFromDsEvents }
  from '../engine/ds-integration/freeze-hook-factory.js';
import { initialPerShardResidual } from '../engine/per-shard/warm-start.js';
import { eBenjaminiHochberg } from '../engine/fleet/e-bh.js';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState }
  from '../engine/fleet/combine.js';
import type { TopologySnapshot, TopologyNode, TopologyEdge }
  from '../engine/types/verdict.js';
import type { ExtendedSampleObservation } from '../engine/per-shard/runtime.js';
import type { DeployEventPayload } from '../engine/ds-integration/event-contract.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public types ──
export type ScenarioName =
  | 'clean-baseline' | 'sdc-drift' | 'common-mode-rack' | 'event-conditional'
  | 'fdr-multiple-testing' | 'hierarchical-evalue'
  | 'sparse-data-resilience' | 'topology-spanning-common-mode';

export const SCENARIO_NAMES: ReadonlyArray<ScenarioName> = [
  'clean-baseline',
  'sdc-drift',
  'common-mode-rack',
  'event-conditional',
  'fdr-multiple-testing',
  'hierarchical-evalue',
  'sparse-data-resilience',
  'topology-spanning-common-mode',
];

export interface BuildResult {
  scenarios_written: ReadonlyArray<{ name: ScenarioName; path: string }>;
  html_written_to: string;
  bytes_total: number;
}

export interface BuildOpts { readonly _reserved?: never; }

// ── Internal types ──
interface PerShardWindow {
  shard_id: string;
  M_t: number | null;
  fired: boolean;
}
interface WindowEntry {
  t: number;
  per_shard: PerShardWindow[];
  events: unknown[];
}
interface CommonModeCandidate {
  shared_node_id: string;
  shared_node_kind: string;
  member_count: number;
  member_shard_ids: string[];
}
interface TerminalState {
  firing_shards: string[];
  common_mode_candidates: CommonModeCandidate[];
  freeze_active: boolean;
  fdr_selected_indices: number[] | null;
  fdr_qLevel: number | null;
  fdr_K: number | null;
  fleet_fired: boolean | null;
  fleet_tick_at_first_fire: number | null;
}
interface ScenarioJson {
  schema_version: string;
  scenario: ScenarioName;
  description: string;
  params: Record<string, unknown>;
  engine_surfaces: string[];
  windows: WindowEntry[];
  terminal_state: TerminalState;
  reasoning: string;
  suggested_actions: string[];
}

// ── LCG + Gaussian (same form as tools/demo-scenario.ts) ──
const SCENARIO_SEEDS: Record<ScenarioName, number> = {
  'clean-baseline':                0x71CB1,
  'sdc-drift':                     0x71D1F,
  'common-mode-rack':              0x71C2D,
  'event-conditional':             0x71E2C,
  'fdr-multiple-testing':          0x71FD0,
  'hierarchical-evalue':           0x71F1E,
  'sparse-data-resilience':        0x71570,
  'topology-spanning-common-mode': 0x71500,
};

function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

// ── JSON composition ──
function composeScenarioJson(args: {
  scenario: ScenarioName;
  description: string;
  params: Record<string, unknown>;
  engine_surfaces: string[];
  windows: WindowEntry[];
  terminal_state: TerminalState;
  reasoning: string;
  suggested_actions: string[];
}): ScenarioJson {
  return {
    schema_version: 'tessera-demo-v1',
    scenario: args.scenario,
    description: args.description,
    params: args.params,
    engine_surfaces: [...args.engine_surfaces].sort(),
    windows: args.windows,
    terminal_state: args.terminal_state,
    reasoning: args.reasoning,
    suggested_actions: args.suggested_actions,
  };
}

function serializeScenarioJson(j: ScenarioJson): string {
  return JSON.stringify(j, null, 2) + '\n';
}

// ── Scenario 1: clean-baseline ──
function runCleanBaselineRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['clean-baseline']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      const draw = boxMullerGaussian(rng);
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    windows.push({
      t: w,
      per_shard: states.map((st, s) => ({
        shard_id: shardIds[s],
        M_t: round6(st.M),
        fired: st.M >= DEMO_THRESHOLD,
      })),
      events: [],
    });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'clean-baseline',
    description: 'Healthy NVIDIA NVLink fleet — no drift injected. Family A betting e-process stays in baseline across all 10 shards × 30 windows.',
    params: {
      seed: SCENARIO_SEEDS['clean-baseline'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
    },
    engine_surfaces: ['freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Under H₀ (no drift), the betting e-process is a martingale; wealth M_t fluctuates around 1.0 without crossing the 1/α = 200 threshold over any 30-window window. This scenario demonstrates no-false-positives on a healthy fleet.',
    suggested_actions: [],
  });
}

// ── Scenario 2: sdc-drift ──
function runSdcDriftRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['sdc-drift']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const SDC_SHARD = 4;
  const SDC_START = 6;
  const SDC_DRIFT = 0.4;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];
  let thresholdCrossedAtWindow: number | null = null;

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (s === SDC_SHARD && w >= SDC_START) {
        draw += SDC_DRIFT * (w - SDC_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    if (thresholdCrossedAtWindow === null && states[SDC_SHARD].M >= DEMO_THRESHOLD) {
      thresholdCrossedAtWindow = w;
    }
    const crossingEvent = thresholdCrossedAtWindow === w
      ? [{ type: 'threshold_crossed', shard_id: shardIds[SDC_SHARD], window: w, M_t: round6(states[SDC_SHARD].M) }]
      : [];
    windows.push({
      t: w,
      per_shard: states.map((st, s) => ({
        shard_id: shardIds[s],
        M_t: round6(st.M),
        fired: st.M >= DEMO_THRESHOLD,
      })),
      events: crossingEvent,
    });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'sdc-drift',
    description: `Synthetic SDC drift injected on shard-04 from window ${SDC_START} onward as an additive mean shift growing linearly (+${SDC_DRIFT}/window). Family A wealth accumulates on shard-04 and crosses the 1/α = ${DEMO_THRESHOLD} threshold.`,
    params: {
      seed: SCENARIO_SEEDS['sdc-drift'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      sdc_target_shard: shardIds[SDC_SHARD],
      sdc_drift_start_window: SDC_START,
      sdc_drift_per_window: SDC_DRIFT,
    },
    engine_surfaces: ['freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Synthetic SDC drift is injected on shard-04 from window 6 onward as an additive mean shift growing linearly. The Family A betting e-process accumulates wealth specifically on shard-04 because the GRAPA bet is data-adaptive; other shards’ M_t stays bounded. Per-shard residual would, in production, surface shard-04 as the specific shard responsible — the demo’s terminal_state.firing_shards reflects exactly this.',
    suggested_actions: [
      'Inspect shard-04 GPU health metrics (DCGM ECC + Xid + memory ECC)',
      'Verify the drift window timestamp against deploy / firmware audit logs',
      'Quarantine shard-04 from new workload placements pending hardware triage',
    ],
  });
}

// ── Scenario 3: common-mode-rack ──
function runCommonModeRackRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const ATTRIBUTION_WINDOW = 3;

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
      })),
      events: windowEvents,
    });
  }

  // Attribution result for terminal state
  const terminalResult = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 },
  });

  const candidatesForTerminal: CommonModeCandidate[] = terminalResult.candidates.map(c => ({
    shared_node_id: c.shared_node_id,
    shared_node_kind: c.shared_node_kind,
    member_count: c.member_count,
    member_shard_ids: [...c.member_shard_ids].sort(),
  }));

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
  });
}

// ── Scenario 4: event-conditional ──
function runEventConditionalRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const EVENT_WINDOW = 2;

  const consumer = new DsEventConsumer({ port: 0 });
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const fixedNow = () => 1_700_000_200;

  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: fixedNow,
  });

  const payload: DeployEventPayload = {
    event_id: 'evt-demo-firmware-push',
    event_class: 'firmware_push',
    event_ts: 1_700_000_180,
  };

  const residual = initialPerShardResidual();
  const obs: ExtendedSampleObservation = {
    observedAt: 1_700_000_190_000,
    residualSeedHash: 'demo-seed-hash',
    sampleVector: [0.5, 0.4, 0.3],
  };

  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    const windowEvents: unknown[] = [];

    if (w === EVENT_WINDOW) {
      consumer.emit('activate', payload);
      windowEvents.push({
        type: 'ds_event_received',
        event_id: payload.event_id,
        event_class: payload.event_class,
        event_ts: payload.event_ts,
      });
    }

    const stateSnapshot = activator.getState();

    if (w === EVENT_WINDOW + 1) {
      const result = activator.update(residual, obs, undefined);
      const frozen = result === residual;
      windowEvents.push({
        type: 'residual_update',
        freeze_active: stateSnapshot.active,
        absorbed: !frozen,
      });
    }

    windows.push({
      t: w,
      per_shard: [{ shard_id: 'shard-00', M_t: null, fired: false }],
      events: windowEvents,
    });
  }

  const finalState = activator.getState();
  activator.dispose();

  return composeScenarioJson({
    scenario: 'event-conditional',
    description: 'DS firmware-push event emitted at window 2. Freeze-hook activates; per-shard residual update at window 3 returns current residual unchanged (absorbed=false). Demonstrates event-conditional attribution suppression.',
    params: {
      seed: SCENARIO_SEEDS['event-conditional'],
      shard_count: 1,
      window_count: WINDOW_COUNT,
      event_window: EVENT_WINDOW,
      event_class: 'firmware_push',
      activation_window_seconds: 300,
    },
    engine_surfaces: ['createFreezeHookFromDsEvents', 'initialPerShardResidual'],
    windows,
    terminal_state: {
      firing_shards: [],
      common_mode_candidates: [],
      freeze_active: finalState.active,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Tessera receives a DS firmware-push event before the per-shard sample is processed. The freeze-hook activates; the residual update path returns the current residual unchanged (no event-driven drift absorbed). Downstream detectors see the pre-event baseline; once the activation window expires, the residual resumes updating normally.',
    suggested_actions: [
      'No immediate action — event-conditional attribution is suppressing this drift by design',
      'Verify the deploy event window matches the observed drift envelope (sanity check)',
      'If the freeze window proves too short / too long under live load, tune activation_window_seconds at the freeze-hook factory',
    ],
  });
}

// ── Scenario 5: fdr-multiple-testing ──
function runFdrMultipleTestingRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['fdr-multiple-testing']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const FDR_SHARDS = [2, 5, 8];
  const FDR_DRIFT_START = 4;
  const FDR_DRIFT = 0.45;
  const FDR_QLEVEL = 0.10;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (FDR_SHARDS.includes(s) && w >= FDR_DRIFT_START) {
        draw += FDR_DRIFT * (w - FDR_DRIFT_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    windows.push({
      t: w,
      per_shard: states.map((st, s) => ({
        shard_id: shardIds[s],
        M_t: round6(st.M),
        fired: st.M >= DEMO_THRESHOLD,
      })),
      events: [],
    });
  }

  const terminalEValues = states.map(st => st.M);
  const fdrResult = eBenjaminiHochberg(terminalEValues, FDR_QLEVEL);

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'fdr-multiple-testing',
    description: `Ten shards × 30 windows. Shards 02, 05, 08 carry sustained drift +${FDR_DRIFT}/window from window ${FDR_DRIFT_START}. Terminal e-BH at q=${FDR_QLEVEL} selects the high-wealth subset under FDR control.`,
    params: {
      seed: SCENARIO_SEEDS['fdr-multiple-testing'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      fdr_drift_shards: FDR_SHARDS.map(i => shardIds[i]),
      fdr_drift_start_window: FDR_DRIFT_START,
      fdr_drift_per_window: FDR_DRIFT,
      fdr_qLevel: FDR_QLEVEL,
    },
    engine_surfaces: ['eBenjaminiHochberg', 'freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: [...fdrResult.selected].sort((a, b) => a - b),
      fdr_qLevel: FDR_QLEVEL,
      fdr_K: fdrResult.K,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Ten shards’ per-shard e-values (terminal M_t) are submitted to the e-Benjamini-Hochberg procedure at FDR target q = 0.10. Three shards (02, 05, 08) carried sustained drift; the e-BH procedure selects the subset whose e-values satisfy k · e_(k) ≥ N / q under the Ren-Barber 2024 / Wang-Ramdas 2022 fixed-time guarantee. Expected falsely-flagged-shard count ≤ q · K — a formal bound that holds even under correlated drift.',
    suggested_actions: [
      'Triage the e-BH-selected shards as a batch (FDR bound makes this safe at q=0.10)',
      'Do NOT inspect non-selected shards individually unless their e-value is independently interesting',
      'Adjust qLevel down (toward 0.05) for higher-precision but lower-recall flagging in production',
    ],
  });
}

// ── Scenario 6: hierarchical-evalue ──
function runHierarchicalEvalueRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['hierarchical-evalue']);
  const SHARD_COUNT = 5;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const FLEET_ALPHA = 0.05;
  const LOG_FLEET_THRESHOLD = Math.log(1 / FLEET_ALPHA);
  const HIER_DRIFT_START = 5;
  const HIER_DRIFT = 0.20;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const fleetState = freshFleetEProcessState();
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (w >= HIER_DRIFT_START) {
        draw += HIER_DRIFT * (w - HIER_DRIFT_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }

    const logEPerShard = states.map(st => Math.log(Math.max(st.M, 1e-12)));
    const combineResult = combineAverage(logEPerShard);
    updateFleetEProcessState(fleetState, combineResult.log_fleet_e, LOG_FLEET_THRESHOLD);

    windows.push({
      t: w,
      per_shard: states.map((st, s) => ({
        shard_id: shardIds[s],
        M_t: round6(st.M),
        fired: st.M >= DEMO_THRESHOLD,
      })),
      events: [{
        type: 'fleet_state',
        log_fleet_e_t: round6(fleetState.log_fleet_e_t),
        log_fleet_e_max: round6(fleetState.log_fleet_e_max),
        fleet_fired: fleetState.fired,
        tick_at_first_fire: fleetState.tick_at_first_fire,
      }],
    });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'hierarchical-evalue',
    description: `Five shards × 30 windows. All 5 shards carry small drift +${HIER_DRIFT}/window from window ${HIER_DRIFT_START}. Per-shard e-values combine via combineAverage; fleet wealth crosses log(1/α_fleet)=log(${1 / FLEET_ALPHA}) at tick_at_first_fire.`,
    params: {
      seed: SCENARIO_SEEDS['hierarchical-evalue'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      fleet_alpha: FLEET_ALPHA,
      log_fleet_threshold: round6(LOG_FLEET_THRESHOLD),
      hier_drift_start_window: HIER_DRIFT_START,
      hier_drift_per_window: HIER_DRIFT,
    },
    engine_surfaces: ['combineAverage', 'freshBettingState', 'freshFleetEProcessState', 'updateBettingState', 'updateFleetEProcessState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: fleetState.fired,
      fleet_tick_at_first_fire: fleetState.tick_at_first_fire,
    },
    reasoning: 'Five shards each carry small drift (+0.20/window) too small to fire alone, but the per-shard e-values combine via combineAverage (Vovk-Wang 2021 §4 — convex combinations of e-values are e-values under arbitrary dependence). The fleet wealth crosses log(1/α_fleet) = log(20) at the captured tick_at_first_fire. This demonstrates that the fleet-level Ville bound preserves the any-time guarantee under correlated drift.',
    suggested_actions: [
      'Investigate at the fleet level (deploy / firmware / config rollout) — per-shard individual investigations will be inconclusive',
      'Cross-reference the tick_at_first_fire against deploy event audit logs for a fleet-wide cause',
      'If correlated drift cannot be ruled out, prefer combineAverage over combineProduct (the current default already does this)',
    ],
  });
}

// ── Scenario 7: sparse-data-resilience ──
function runSparseDataResilienceRecording(): ScenarioJson {
  const WINDOW_COUNT = 3;
  const ATTRIBUTION_WINDOW = 2;

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
      })),
      events: windowEvents,
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
    terminal_state: {
      firing_shards: ['shard-00', 'shard-01', 'shard-02'],
      common_mode_candidates: terminalResult.candidates.map(c => ({
        shared_node_id: c.shared_node_id,
        shared_node_kind: c.shared_node_kind,
        member_count: c.member_count,
        member_shard_ids: [...c.member_shard_ids].sort(),
      })),
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
      'Audit whether the topology source’s sparse-data path is correctly identifying this as ‘incomplete’ rather than ‘no common-mode found’',
    ],
  });
}

// ── Scenario 8: topology-spanning-common-mode ──
function runTopologySpanningRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const ATTRIBUTION_WINDOW = 3;

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
      })),
      events: windowEvents,
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

  const candidatesForTerminal: CommonModeCandidate[] = terminalResult.candidates.map(c => ({
    shared_node_id: c.shared_node_id,
    shared_node_kind: c.shared_node_kind,
    member_count: c.member_count,
    member_shard_ids: [...c.member_shard_ids].sort(),
  }));

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

// ── HTML emission ──
const HTML_TEMPLATE_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tessera — Demo Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; }
    header { padding: 16px 24px; border-bottom: 1px solid #30363d; }
    header h1 { font-size: 1.25rem; font-weight: 600; color: #f0f6fc; }
    header p { font-size: 0.8rem; color: #8b949e; margin-top: 2px; }
    #tessera-controls {
      display: flex; align-items: center; gap: 10px; padding: 12px 24px;
      background: #161b22; border-bottom: 1px solid #30363d; flex-wrap: wrap;
    }
    #tessera-controls select, #tessera-controls button {
      background: #21262d; color: #e6edf3; border: 1px solid #30363d;
      border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; cursor: pointer;
    }
    #tessera-controls select:hover, #tessera-controls button:hover { border-color: #58a6ff; }
    #scenario-selector { min-width: 220px; }
    #btn-play { color: #3fb950; border-color: #3fb950; }
    #btn-pause { color: #d29922; border-color: #d29922; }
    #btn-reset { color: #f78166; border-color: #f78166; }
    #tessera-controls label { font-size: 0.8rem; color: #8b949e; }
    #window-indicator { font-size: 0.8rem; color: #8b949e; margin-left: auto; }
    #tessera-main {
      display: grid;
      grid-template-columns: 1fr 260px;
      grid-template-rows: auto auto auto;
      gap: 0;
      padding: 0;
    }
    #chart-panel { grid-column: 1; grid-row: 1; padding: 16px 24px; }
    #chart-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #mt-chart { width: 100%; height: auto; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
    #verdict-panel { grid-column: 2; grid-row: 1 / 4; padding: 16px; border-left: 1px solid #30363d; overflow-y: auto; }
    #verdict-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #verdict-badges { display: flex; flex-direction: column; gap: 4px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge.clean { background: #1a3a2a; color: #3fb950; border: 1px solid #3fb950; }
    .badge.fire  { background: #3a1a1a; color: #f78166; border: 1px solid #f78166; }
    #audit-panel { grid-column: 1; grid-row: 2; padding: 16px 24px; border-top: 1px solid #30363d; }
    #audit-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #audit-list { list-style: none; font-size: 0.8rem; color: #8b949e; max-height: 120px; overflow-y: auto; }
    #audit-list li { padding: 2px 0; border-bottom: 1px solid #21262d; }
    #reasoning-panel { grid-column: 1; grid-row: 3; padding: 16px 24px; border-top: 1px solid #30363d; }
    #reasoning-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #reasoning-body { font-size: 0.85rem; color: #c9d1d9; line-height: 1.5; }
    #next-actions-panel { grid-column: 1; grid-row: 4; padding: 16px 24px; border-top: 1px solid #30363d; }
    #next-actions-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #next-actions-list { list-style: disc; margin-left: 18px; font-size: 0.85rem; color: #c9d1d9; }
    #next-actions-list li { margin-bottom: 4px; }
  </style>
</head>
<body>
  <header id="tessera-header">
    <h1>Tessera Demo</h1>
    <p>Pre-recorded scenarios — opens from file:// (no server required)</p>
  </header>

  <section id="tessera-controls">
    <select id="scenario-selector">
      <option value="clean-baseline">Clean baseline (no firings)</option>
      <option value="sdc-drift">SDC drift on shard-04</option>
      <option value="common-mode-rack">Common-mode (rack-localized)</option>
      <option value="event-conditional">Event-conditional freeze</option>
      <option value="fdr-multiple-testing">FDR control (e-BH)</option>
      <option value="hierarchical-evalue">Hierarchical e-value</option>
      <option value="sparse-data-resilience">Sparse-data resilience</option>
      <option value="topology-spanning-common-mode">Topology-spanning common-mode</option>
    </select>
    <button id="btn-play">Play</button>
    <button id="btn-pause">Pause</button>
    <button id="btn-reset">Reset</button>
    <label for="speed-selector">Speed</label>
    <select id="speed-selector">
      <option value="1">1×</option>
      <option value="2">2×</option>
      <option value="4">4×</option>
    </select>
    <span id="window-indicator">window 0 / 30</span>
  </section>

  <main id="tessera-main">
    <section id="chart-panel">
      <h2>Shard wealth M_t (log₁₀ scale; threshold = log₁₀(200) ≈ 2.301)</h2>
      <svg id="mt-chart" width="800" height="400"
           viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet"></svg>
    </section>
    <section id="verdict-panel">
      <h2>Verdict</h2>
      <div id="verdict-badges"></div>
    </section>
    <section id="audit-panel">
      <h2>Audit trail</h2>
      <ul id="audit-list"></ul>
    </section>
    <section id="reasoning-panel">
      <h2>Reasoning</h2>
      <p id="reasoning-body"></p>
    </section>
    <section id="next-actions-panel">
      <h2>Suggested next actions</h2>
      <ul id="next-actions-list"></ul>
    </section>
  </main>
`;

const SENTINEL_BEGIN = '  <!-- BEGIN-TESSERA-SCENARIO-DATA -->';
const SENTINEL_END   = '  <!-- END-TESSERA-SCENARIO-DATA -->';

// Dashboard JS (vanilla; no imports; no external deps)
const HTML_TEMPLATE_FOOTER = `
  <script>
(function () {
  'use strict';

  // ── Palette (10 dark-friendly colors) ──
  var COLORS = [
    '#58a6ff','#3fb950','#d29922','#f78166','#a371f7',
    '#79c0ff','#56d364','#e3b341','#ff7b72','#bc8cff',
  ];

  // ── State ──
  var scenarios = {};
  var currentName = 'clean-baseline';
  var currentWindowIdx = 0;
  var playing = false;
  var intervalHandle = null;
  var baseIntervalMs = 500;

  // ── Load scenario data from inlined script blocks ──
  var names = [
    'clean-baseline','sdc-drift','common-mode-rack','event-conditional',
    'fdr-multiple-testing','hierarchical-evalue','sparse-data-resilience',
    'topology-spanning-common-mode',
  ];
  for (var i = 0; i < names.length; i++) {
    var el = document.getElementById('tessera-scenario-' + names[i]);
    if (el) scenarios[names[i]] = JSON.parse(el.textContent);
  }

  // ── DOM refs ──
  var selector    = document.getElementById('scenario-selector');
  var btnPlay     = document.getElementById('btn-play');
  var btnPause    = document.getElementById('btn-pause');
  var btnReset    = document.getElementById('btn-reset');
  var speedSel    = document.getElementById('speed-selector');
  var winInd      = document.getElementById('window-indicator');
  var svgEl       = document.getElementById('mt-chart');
  var badgesEl    = document.getElementById('verdict-badges');
  var auditEl     = document.getElementById('audit-list');
  var reasoningEl = document.getElementById('reasoning-body');
  var actionsEl   = document.getElementById('next-actions-list');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_W = 800, SVG_H = 400;
  var PAD_L = 50, PAD_R = 20, PAD_T = 20, PAD_B = 30;
  var PLOT_W = SVG_W - PAD_L - PAD_R;
  var PLOT_H = SVG_H - PAD_T - PAD_B;
  var LOG10_THRESHOLD = Math.log10(200); // ≈ 2.301

  function clampLog10(m) {
    if (m === null || m === undefined) return 0;
    var v = Math.log10(Math.max(m, 1));
    return Math.min(Math.max(v, 0), 4);
  }

  function xCoord(t, totalWindows) {
    return PAD_L + (t / Math.max(totalWindows - 1, 1)) * PLOT_W;
  }

  function yCoord(logVal) {
    return PAD_T + PLOT_H - (logVal / 4) * PLOT_H;
  }

  function clearSvg() {
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  }

  function drawFrame(scenarioData, upToWindow) {
    clearSvg();
    var windows = scenarioData.windows;
    var totalW = windows.length;
    if (!totalW) return;

    var shardCount = windows[0].per_shard.length;

    // Threshold line
    var threshLine = document.createElementNS(SVG_NS, 'line');
    threshLine.setAttribute('x1', PAD_L);
    threshLine.setAttribute('x2', SVG_W - PAD_R);
    var ty = yCoord(LOG10_THRESHOLD);
    threshLine.setAttribute('y1', ty);
    threshLine.setAttribute('y2', ty);
    threshLine.setAttribute('stroke', '#f78166');
    threshLine.setAttribute('stroke-width', '1');
    threshLine.setAttribute('stroke-dasharray', '4 3');
    svgEl.appendChild(threshLine);

    // Axes
    var axisG = document.createElementNS(SVG_NS, 'g');
    axisG.setAttribute('stroke', '#30363d');
    axisG.setAttribute('stroke-width', '1');
    var xAxis = document.createElementNS(SVG_NS, 'line');
    xAxis.setAttribute('x1', PAD_L); xAxis.setAttribute('x2', SVG_W - PAD_R);
    xAxis.setAttribute('y1', SVG_H - PAD_B); xAxis.setAttribute('y2', SVG_H - PAD_B);
    axisG.appendChild(xAxis);
    var yAxis = document.createElementNS(SVG_NS, 'line');
    yAxis.setAttribute('x1', PAD_L); yAxis.setAttribute('x2', PAD_L);
    yAxis.setAttribute('y1', PAD_T); yAxis.setAttribute('y2', SVG_H - PAD_B);
    axisG.appendChild(yAxis);
    svgEl.appendChild(axisG);

    // Shard paths
    for (var s = 0; s < shardCount; s++) {
      var d = '';
      for (var w = 0; w <= upToWindow && w < totalW; w++) {
        var ps = windows[w].per_shard[s];
        var x = xCoord(w, totalW);
        var y = yCoord(clampLog10(ps.M_t));
        d += (w === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      if (!d) continue;
      var pathEl = document.createElementNS(SVG_NS, 'path');
      pathEl.setAttribute('d', d.trim());
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', COLORS[s % COLORS.length]);
      pathEl.setAttribute('stroke-width', '1.5');
      svgEl.appendChild(pathEl);
    }
  }

  function renderBadges(scenarioData, windowIdx) {
    badgesEl.innerHTML = '';
    var windows = scenarioData.windows;
    if (!windows.length) return;
    var wIdx = Math.min(windowIdx, windows.length - 1);
    var shards = windows[wIdx].per_shard;
    for (var i = 0; i < shards.length; i++) {
      var ps = shards[i];
      var span = document.createElement('span');
      span.className = 'badge ' + (ps.fired ? 'fire' : 'clean');
      span.textContent = ps.fired ? ps.shard_id + ' FIRE' : ps.shard_id + ' clean';
      badgesEl.appendChild(span);
    }
    // FDR selected badges
    var ts = scenarioData.terminal_state;
    if (ts.fdr_selected_indices && windowIdx >= windows.length - 1) {
      var divider = document.createElement('div');
      divider.style.marginTop = '8px';
      divider.style.fontSize = '0.75rem';
      divider.style.color = '#8b949e';
      divider.textContent = 'e-BH selected (K=' + ts.fdr_K + ', q=' + ts.fdr_qLevel + '):';
      badgesEl.appendChild(divider);
      for (var j = 0; j < ts.fdr_selected_indices.length; j++) {
        var span2 = document.createElement('span');
        span2.className = 'badge fire';
        span2.textContent = 'shard-' + String(ts.fdr_selected_indices[j]).padStart(2, '0') + ' (e-BH)';
        badgesEl.appendChild(span2);
      }
    }
  }

  function appendAuditEntry(text) {
    var li = document.createElement('li');
    li.textContent = text;
    auditEl.insertBefore(li, auditEl.firstChild);
  }

  function renderAuditForWindow(scenarioData, windowIdx) {
    var windows = scenarioData.windows;
    if (!windows.length) return;
    var wIdx = Math.min(windowIdx, windows.length - 1);
    var events = windows[wIdx].events;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      appendAuditEntry('[w' + wIdx + '] ' + JSON.stringify(ev));
    }
  }

  function renderReasoningAndActions(scenarioData) {
    reasoningEl.textContent = scenarioData.reasoning;
    actionsEl.innerHTML = '';
    var actions = scenarioData.suggested_actions;
    for (var i = 0; i < actions.length; i++) {
      var li = document.createElement('li');
      li.textContent = actions[i];
      actionsEl.appendChild(li);
    }
  }

  function clearPanels() {
    auditEl.innerHTML = '';
    reasoningEl.textContent = '';
    actionsEl.innerHTML = '';
    badgesEl.innerHTML = '';
    clearSvg();
  }

  function updateWindowIndicator(scenarioData) {
    var total = scenarioData.windows.length;
    winInd.textContent = 'window ' + currentWindowIdx + ' / ' + total;
  }

  function render() {
    var scenarioData = scenarios[currentName];
    if (!scenarioData) return;
    drawFrame(scenarioData, currentWindowIdx);
    renderBadges(scenarioData, currentWindowIdx);
    updateWindowIndicator(scenarioData);
    if (currentWindowIdx >= scenarioData.windows.length - 1) {
      renderReasoningAndActions(scenarioData);
    }
  }

  function tick() {
    var scenarioData = scenarios[currentName];
    if (!scenarioData) return;
    if (currentWindowIdx >= scenarioData.windows.length - 1) {
      stopPlay();
      render();
      return;
    }
    currentWindowIdx++;
    renderAuditForWindow(scenarioData, currentWindowIdx);
    render();
  }

  function startPlay() {
    if (playing) return;
    playing = true;
    var speed = parseInt(speedSel.value, 10) || 1;
    intervalHandle = setInterval(tick, Math.round(baseIntervalMs / speed));
  }

  function stopPlay() {
    if (!playing) return;
    playing = false;
    if (intervalHandle !== null) { clearInterval(intervalHandle); intervalHandle = null; }
  }

  function loadScenario(name) {
    stopPlay();
    currentName = name;
    currentWindowIdx = 0;
    clearPanels();
    render();
  }

  // ── Event listeners ──
  selector.addEventListener('change', function () { loadScenario(selector.value); });
  btnPlay.addEventListener('click', startPlay);
  btnPause.addEventListener('click', stopPlay);
  btnReset.addEventListener('click', function () {
    stopPlay();
    currentWindowIdx = 0;
    clearPanels();
    render();
  });
  speedSel.addEventListener('change', function () {
    if (playing) { stopPlay(); startPlay(); }
  });

  // ── Initial render ──
  loadScenario(currentName);
})();
  </script>
</body>
</html>
`;

function renderDemoHtml(scenarios: ReadonlyArray<{ name: ScenarioName; json: string }>): string {
  const dataLines: string[] = [SENTINEL_BEGIN];
  for (const { name, json } of scenarios) {
    dataLines.push(`  <script type="application/json" id="tessera-scenario-${name}">${json.trimEnd()}</script>`);
  }
  dataLines.push(SENTINEL_END);
  const dataBlock = dataLines.join('\n') + '\n';
  return HTML_TEMPLATE_HEAD + dataBlock + HTML_TEMPLATE_FOOTER;
}

// ── Public entry point ──
export function buildAllCannedDemos(_opts?: BuildOpts): BuildResult {
  const root = path.resolve(__dirname, '..');
  const scenariosDir = path.join(root, 'demos', 'scenarios');
  fs.mkdirSync(scenariosDir, { recursive: true });

  const runners: Record<ScenarioName, () => ScenarioJson> = {
    'clean-baseline':                runCleanBaselineRecording,
    'sdc-drift':                     runSdcDriftRecording,
    'common-mode-rack':              runCommonModeRackRecording,
    'event-conditional':             runEventConditionalRecording,
    'fdr-multiple-testing':          runFdrMultipleTestingRecording,
    'hierarchical-evalue':           runHierarchicalEvalueRecording,
    'sparse-data-resilience':        runSparseDataResilienceRecording,
    'topology-spanning-common-mode': runTopologySpanningRecording,
  };

  const written: Array<{ name: ScenarioName; path: string }> = [];
  const jsonByName: Array<{ name: ScenarioName; json: string }> = [];
  let bytesTotal = 0;

  for (const name of SCENARIO_NAMES) {
    const j = runners[name]();
    const s = serializeScenarioJson(j);
    const p = path.join(scenariosDir, `${name}.json`);
    fs.writeFileSync(p, s);
    written.push({ name, path: p });
    jsonByName.push({ name, json: s });
    bytesTotal += s.length;
  }

  const html = renderDemoHtml(jsonByName);
  const htmlPath = path.join(root, 'demos', 'demo.html');
  fs.writeFileSync(htmlPath, html);
  bytesTotal += html.length;

  return { scenarios_written: written, html_written_to: htmlPath, bytes_total: bytesTotal };
}

// ── CLI guard (matches tools/demo-scenario.ts:470 convention) ──
if (require.main === module) {
  const result = buildAllCannedDemos();
  process.stdout.write(
    `Built ${result.scenarios_written.length} scenarios + demos/demo.html ` +
    `(${result.bytes_total} bytes total).\n`,
  );
  process.exit(0);
}
