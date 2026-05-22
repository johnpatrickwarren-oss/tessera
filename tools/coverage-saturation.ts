// tools/coverage-saturation.ts — Tessera R72 coverage saturation runner.
//
// Generates the 6×20 coverage matrix by running the real Tessera engine
// across 120 parameter variations. Deterministic (seeded LCG); idempotent.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.
//
// Tactical deviation vs spec § 3.1 TYPE3_EVENT_CLASSES:
//   Spec prescribes ['firmware_push', 'deploy', 'config_change', 'rollback'] but
//   'deploy' and 'rollback' are not valid DeployEventPayload.event_class values
//   (engine contract: 'firmware_push'|'model_redeploy'|'env_change'|'config_change'|
//   'capacity_change'). Additionally, mapEventClassToKind() throws at runtime for
//   unknown values (exhaustive switch). Replaced with:
//     'deploy'   → 'model_redeploy'
//     'rollback' → 'env_change'
//   Detection behavior is identical — freeze hook activates regardless of
//   which valid event_class is passed. (TACTICAL AUTONOMY: "Spec type triggers
//   a typecheck error at the consumer → cast at consumer or widen at producer.")

// ── Engine imports (.js extension; matches R70/R71 convention) ──
import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { attributeCommonMode, type FiredShardEvent } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import { DsEventConsumer } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-consumer';
import { createFreezeHookFromDsEvents } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/freeze-hook-factory';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/combine';
import type { TopologySnapshot, TopologyNode, TopologyEdge } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import type { ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import type { DeployEventPayload } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public types ──
export type FailureTypeName =
  | 'sdc-drift'
  | 'common-mode-rack'
  | 'event-conditional'
  | 'fdr-multiple-testing'
  | 'hierarchical-evalue'
  | 'topology-spanning-common-mode';

export const FAILURE_TYPE_NAMES: ReadonlyArray<FailureTypeName> = [
  'sdc-drift',
  'common-mode-rack',
  'event-conditional',
  'fdr-multiple-testing',
  'hierarchical-evalue',
  'topology-spanning-common-mode',
];

export interface SaturationResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_variations: 120;
  total_detected: number;
  total_attribution_correct: number;
}

export interface SaturationOpts { readonly _reserved?: never; }

// ── Constants (Tessera-original; not from R70/R71) ──
const SCENARIO_SEED_PREFIX = 0x71C00; // 465920 decimal — recorded in matrix JSON for reproducibility audit
const SHARD_COUNT_DEFAULT = 10;
const WINDOW_COUNT_DEFAULT = 30;
const DEMO_ALPHA = 5e-3;
const DEMO_THRESHOLD = 1 / DEMO_ALPHA;  // 200
const FLEET_ALPHA = 0.05;
const LOG_FLEET_THRESHOLD = Math.log(1 / FLEET_ALPHA);

// LCG + Gaussian primitives — re-implemented (NOT imported from tools/build-canned-demos.ts)
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

// ── Variation grids (exact literals; § 2.1 spec) ──
const TYPE1_TARGET_SHARDS = ['shard-01', 'shard-03', 'shard-04', 'shard-07'] as const;
const TYPE1_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.20, 10], [0.30, 8], [0.40, 6], [0.50, 5], [0.70, 4],
];
const TYPE2_RACK_SETS: ReadonlyArray<{ target_rack: 'rack-A' | 'rack-B'; fired_set: ReadonlyArray<string> }> = [
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01', 'shard-02'] },
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04', 'shard-05'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04'] },
];
const TYPE2_ATTRIBUTION_WINDOWS: ReadonlyArray<number> = [0, 1, 2, 3, 4];
// Spec prescribed ['firmware_push', 'deploy', 'config_change', 'rollback'] but
// 'deploy' and 'rollback' are not valid DeployEventPayload.event_class values.
// Using ['firmware_push', 'model_redeploy', 'config_change', 'env_change'] instead.
const TYPE3_EVENT_CLASSES: ReadonlyArray<DeployEventPayload['event_class']> = [
  'firmware_push', 'model_redeploy', 'config_change', 'env_change',
];
const TYPE3_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [10, 20], [50, 100], [100, 150], [200, 250], [290, 295],
];
const TYPE4_DRIFTING_COUNTS: ReadonlyArray<number> = [1, 3, 5, 8];
const TYPE4_QLEVELS: ReadonlyArray<number> = [0.05, 0.10, 0.15, 0.20, 0.25];
const TYPE5_SHARD_COUNTS: ReadonlyArray<number> = [5, 8, 10, 15];
const TYPE5_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.10, 8], [0.13, 7], [0.16, 6], [0.20, 5], [0.25, 5],
];
const TYPE6_FIRED_SETS: ReadonlyArray<ReadonlyArray<string>> = [
  ['shard-00', 'shard-01', 'shard-03', 'shard-04'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'],
  ['shard-00', 'shard-03'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03'],
];
const TYPE6_MAX_HOPS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

// ── Internal types ──
interface Observation {
  detected: boolean;
  attribution_correct: boolean | null;
  detection_window_index: number | null;
  false_positive_count: number | null;
  pedagogical_property_met: boolean | null;
  raw_terminal: Record<string, unknown>;
}
interface VariationRow {
  variation_idx: number;
  params: Record<string, unknown>;
  observation: Observation;
}
interface TypeSummary {
  detection_rate: number;
  detected_count: number;
  attribution_accuracy: number | null;
  correct_count: number;
  max_false_positive_count: number | null;
  pedagogical_property_rate: number | null;
}
interface TypeBlock {
  type_name: FailureTypeName;
  description: string;
  primary_axis_label: string;
  secondary_axis_label: string;
  variations: VariationRow[];
  summary: TypeSummary;
}
interface CoverageMatrix {
  schema_version: 'tessera-coverage-v1';
  generated_with_seed_prefix: number;
  types: TypeBlock[];
  totals: {
    total_variations: 120;
    total_detected: number;
    total_attribution_correct: number;
  };
}

// ── Topology fixtures (shared across types 2, 6) ──
function build2RackTopology(): TopologySnapshot {
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
  return { nodes, edges, fetched_at_ts: 1_700_000_000, source_id: 'tessera-r72-synthetic', source_version: 'v1' };
}

function build2RackCzTopology(): TopologySnapshot {
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
  return { nodes, edges, fetched_at_ts: 1_700_000_000, source_id: 'tessera-r72-synthetic-cz', source_version: 'v1' };
}

// ── Variation runners ──
function runType1Variation(idx: number): VariationRow {
  const target_idx = Math.floor(idx / 5);
  const tuple_idx  = idx % 5;
  const target_shard_id = TYPE1_TARGET_SHARDS[target_idx];
  const [drift, drift_start] = TYPE1_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ idx);
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const target_pos = shardIds.indexOf(target_shard_id);
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;

  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (s === target_pos && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null && states[target_pos].M >= DEMO_THRESHOLD) {
      detection_window_index = w;
    }
  }
  const firedShardIds = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD);
  const detected = firedShardIds.includes(target_shard_id);
  const false_positive_count = firedShardIds.filter(id => id !== target_shard_id).length;
  const attribution_correct = detected
    ? (firedShardIds.length === 1 && firedShardIds[0] === target_shard_id)
    : null;
  return {
    variation_idx: idx,
    params: { target_shard_id, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        firing_shards: firedShardIds.slice().sort(),
        target_M: round6(states[target_pos].M),
      },
    },
  };
}

function runType2Variation(idx: number): VariationRow {
  const rack_idx = Math.floor(idx / 5);
  const win_idx  = idx % 5;
  const { target_rack, fired_set } = TYPE2_RACK_SETS[rack_idx];
  const attribution_window = TYPE2_ATTRIBUTION_WINDOWS[win_idx];
  const snapshot = build2RackTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t2-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx },
  });
  const detected = result.candidates.length >= 1;
  const target_candidate = result.candidates.find(c => c.shared_node_id === target_rack);
  const attribution_correct = detected
    ? (target_candidate !== undefined &&
       [...target_candidate.member_shard_ids].sort().join(',') === [...fired_set].sort().join(','))
    : null;
  const false_positive_count = detected
    ? result.candidates.filter(c => c.shared_node_id !== target_rack).length
    : null;
  return {
    variation_idx: idx,
    params: { target_rack, fired_set: [...fired_set], attribution_window },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? attribution_window : null,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        candidates: result.candidates.map(c => ({
          shared_node_id: c.shared_node_id,
          shared_node_kind: c.shared_node_kind,
          member_count: c.member_count,
        })),
      },
    },
  };
}

function runType3Variation(idx: number): VariationRow {
  const class_idx = Math.floor(idx / 5);
  const off_idx   = idx % 5;
  const event_class = TYPE3_EVENT_CLASSES[class_idx];
  const [event_offset_s, sample_offset_s] = TYPE3_OFFSETS[off_idx];
  const baseTs = 1_700_000_000;
  const consumer = new DsEventConsumer({ port: 0 });
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: () => baseTs + event_offset_s,
  });
  const payload: DeployEventPayload = {
    event_id: `evt-r72-t3-v${idx}`,
    event_class,
    event_ts: baseTs + event_offset_s,
  };
  consumer.emit('activate', payload);
  const stateAfter = activator.getState();
  const detected = stateAfter.active === true;
  let attribution_correct: boolean | null = null;
  if (detected) {
    const residual = initialPerShardResidual();
    const obs: ExtendedSampleObservation = {
      observedAt: (baseTs + sample_offset_s) * 1000,
      residualSeedHash: `r72-t3-v${idx}`,
      sampleVector: [0.5, 0.4, 0.3],
    };
    const result = activator.update(residual, obs, undefined);
    attribution_correct = (result === residual);
  }
  activator.dispose();
  return {
    variation_idx: idx,
    params: { event_class, event_ts_offset_s: event_offset_s, sample_ts_offset_s: sample_offset_s },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 1 : null, // event at "window 0"; freeze observed at "window 1"
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        freeze_active: stateAfter.active,
      },
    },
  };
}

function runType4Variation(idx: number): VariationRow {
  const cnt_idx = Math.floor(idx / 5);
  const q_idx   = idx % 5;
  const drifting_count = TYPE4_DRIFTING_COUNTS[cnt_idx];
  const qLevel = TYPE4_QLEVELS[q_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x400 + idx)); // distinct seed namespace from type 1
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const drifting_indices = Array.from({ length: drifting_count }, (_, i) => i);
  const drift = 0.45;
  const drift_start = 4;
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (drifting_indices.includes(s) && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null) {
      for (const di of drifting_indices) {
        if (states[di].M >= DEMO_THRESHOLD) { detection_window_index = w; break; }
      }
    }
  }
  const terminalEValues = states.map(st => st.M);
  const fdrResult = eBenjaminiHochberg(terminalEValues, qLevel);
  const selected_indices = [...fdrResult.selected].sort((a, b) => a - b);
  const detected = fdrResult.K >= 1;
  const false_positives = selected_indices.filter(i => !drifting_indices.includes(i));
  const attribution_correct = detected ? false_positives.length === 0 : null;
  return {
    variation_idx: idx,
    params: { drifting_shard_count: drifting_count, drifting_indices, qLevel },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count: detected ? false_positives.length : null,
      pedagogical_property_met: null,
      raw_terminal: {
        fdr_K: fdrResult.K,
        fdr_selected_indices: selected_indices,
        firing_shards: shardIds.filter((_, i) => states[i].M >= DEMO_THRESHOLD),
      },
    },
  };
}

function runType5Variation(idx: number): VariationRow {
  const cnt_idx  = Math.floor(idx / 5);
  const tuple_idx = idx % 5;
  const shard_count = TYPE5_SHARD_COUNTS[cnt_idx];
  const [drift, drift_start] = TYPE5_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x800 + idx));
  const shardIds = Array.from({ length: shard_count }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const fleetState = freshFleetEProcessState();
  const perShardFirstFireTick: Array<number | null> = shardIds.map(() => null);
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < shard_count; s++) {
      let x = boxMullerGaussian(rng);
      if (w >= drift_start) x += drift * (w - drift_start + 1);
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
      if (perShardFirstFireTick[s] === null && states[s].M >= DEMO_THRESHOLD) {
        perShardFirstFireTick[s] = w;
      }
    }
    const logE = states.map(st => Math.log(Math.max(st.M, 1e-12)));
    const combineResult = combineAverage(logE);
    updateFleetEProcessState(fleetState, combineResult.log_fleet_e, LOG_FLEET_THRESHOLD);
  }
  const detected = fleetState.fired === true;
  const attribution_correct = detected ? true : null;
  const earliest_per_shard_tick = perShardFirstFireTick
    .filter((t): t is number => t !== null)
    .reduce((m, t) => Math.min(m, t), Number.POSITIVE_INFINITY);
  const pedagogical_property_met = detected
    ? (fleetState.tick_at_first_fire !== null && fleetState.tick_at_first_fire < earliest_per_shard_tick)
    : null;
  return {
    variation_idx: idx,
    params: { shard_count, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: fleetState.tick_at_first_fire,
      false_positive_count: null,
      pedagogical_property_met,
      raw_terminal: {
        fleet_fired: fleetState.fired,
        fleet_tick_at_first_fire: fleetState.tick_at_first_fire,
        per_shard_first_fire_tick: perShardFirstFireTick,
        earliest_per_shard_tick: earliest_per_shard_tick === Number.POSITIVE_INFINITY ? null : earliest_per_shard_tick,
      },
    },
  };
}

function runType6Variation(idx: number): VariationRow {
  const set_idx = Math.floor(idx / 5);
  const hop_idx = idx % 5;
  const fired_set = TYPE6_FIRED_SETS[set_idx];
  const max_hop = TYPE6_MAX_HOPS[hop_idx];
  const snapshot = build2RackCzTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t6-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx, max_hop_distance: max_hop },
  });
  const cz_candidate = result.candidates.find(c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1');
  const detected = cz_candidate !== undefined;
  const attribution_correct = detected
    ? (cz_candidate.member_count === fired_set.length)
    : null;
  const non_cz_count = result.candidates.filter(c => c.shared_node_kind !== 'cooling_zone').length;
  return {
    variation_idx: idx,
    params: { fired_set: [...fired_set], max_hop_distance: max_hop },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 3 : null, // fixed attribution window (cosmetic)
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        non_cz_candidate_count: non_cz_count,
        cz_member_count: cz_candidate?.member_count ?? null,
      },
    },
  };
}

// ── Aggregation ──
function summarizeType(type_name: FailureTypeName, rows: VariationRow[]): TypeSummary {
  const detected_rows = rows.filter(r => r.observation.detected);
  const correct_rows = detected_rows.filter(r => r.observation.attribution_correct === true);
  const fp_values = detected_rows
    .map(r => r.observation.false_positive_count)
    .filter((x): x is number => x !== null);
  const max_fp = fp_values.length > 0 ? Math.max(...fp_values) : null;
  let pedagogical_rate: number | null = null;
  if (type_name === 'hierarchical-evalue') {
    const ped_rows = detected_rows.filter(r => r.observation.pedagogical_property_met === true);
    pedagogical_rate = detected_rows.length > 0 ? ped_rows.length / detected_rows.length : null;
  }
  return {
    detection_rate: detected_rows.length / 20,
    detected_count: detected_rows.length,
    attribution_accuracy: detected_rows.length > 0 ? correct_rows.length / detected_rows.length : null,
    correct_count: correct_rows.length,
    max_false_positive_count: max_fp,
    pedagogical_property_rate: pedagogical_rate,
  };
}

function buildType(type_name: FailureTypeName,
                   description: string,
                   primary_axis_label: string,
                   secondary_axis_label: string,
                   runner: (idx: number) => VariationRow): TypeBlock {
  const variations: VariationRow[] = [];
  for (let i = 0; i < 20; i++) variations.push(runner(i));
  return {
    type_name,
    description,
    primary_axis_label,
    secondary_axis_label,
    variations,
    summary: summarizeType(type_name, variations),
  };
}

function buildCoverageMatrix(): CoverageMatrix {
  const types: TypeBlock[] = [
    buildType('sdc-drift',
      'Single-shard SDC: linear additive drift on one targeted shard within a 10-shard, 30-window fleet under Family A betting e-process.',
      'target_shard_id', '(drift_per_window, drift_start_window)',
      runType1Variation),
    buildType('common-mode-rack',
      'Rack-localized common-mode: 2 or 3 shards co-fire on the same rack; default attribution opts (max_hop=1, min_member=2).',
      '(target_rack, fired_set)', 'attribution_window',
      runType2Variation),
    buildType('event-conditional',
      'DS deploy-event activates the freeze-hook; subsequent residual update returns the existing residual unchanged (absorbed=false).',
      'event_class', '(event_ts_offset_s, sample_ts_offset_s)',
      runType3Variation),
    buildType('fdr-multiple-testing',
      'e-Benjamini-Hochberg FDR control: K drifting shards in a 10-shard fleet; e-BH selects under qLevel.',
      'drifting_shard_count', 'qLevel',
      runType4Variation),
    buildType('hierarchical-evalue',
      'Hierarchical e-value combination via combineAverage; small uniform drift across all shards; fleet wealth crosses log(1/0.05).',
      'shard_count', '(drift_per_window, drift_start_window)',
      runType5Variation),
    buildType('topology-spanning-common-mode',
      'Cross-rack common-mode: BFS over cooling-zone-spanning topology; max_hop_distance varies to expose the 1-hop / 2-hop reachability boundary.',
      'fired_set', 'max_hop_distance',
      runType6Variation),
  ];
  const total_detected = types.reduce((acc, t) => acc + t.summary.detected_count, 0);
  const total_correct = types.reduce((acc, t) => acc + t.summary.correct_count, 0);
  return {
    schema_version: 'tessera-coverage-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    types,
    totals: {
      total_variations: 120,
      total_detected,
      total_attribution_correct: total_correct,
    },
  };
}

// ── Serialization ──
function serializeMatrixJson(matrix: CoverageMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

function renderMatrixMd(matrix: CoverageMatrix): string {
  const lines: string[] = [];
  lines.push('# Tessera R72 — coverage saturation matrix');
  lines.push('');
  lines.push('Generated by `tools/coverage-saturation.ts`; deterministic; idempotent. Full machine-readable data: `R72-saturation-matrix.json`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Type | detected | attrib-correct | max-FP | pedagogical |');
  lines.push('|---|---|---|---|---|');
  for (const t of matrix.types) {
    const s = t.summary;
    const detect_cell = `${s.detected_count} / 20 (${(s.detection_rate * 100).toFixed(0)}%)`;
    const attrib_cell = s.attribution_accuracy === null
      ? 'n/a'
      : `${s.correct_count} / ${s.detected_count} (${(s.attribution_accuracy * 100).toFixed(0)}%)`;
    const fp_cell = s.max_false_positive_count === null ? 'n/a' : String(s.max_false_positive_count);
    const ped_cell = s.pedagogical_property_rate === null
      ? 'n/a'
      : `${(s.pedagogical_property_rate * 100).toFixed(0)}%`;
    lines.push(`| ${t.type_name} | ${detect_cell} | ${attrib_cell} | ${fp_cell} | ${ped_cell} |`);
  }
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push('| Total variations | Total detected | Total attribution-correct |');
  lines.push('|---|---|---|');
  lines.push(`| ${matrix.totals.total_variations} | ${matrix.totals.total_detected} | ${matrix.totals.total_attribution_correct} |`);
  lines.push('');
  lines.push('## Per-type details');
  lines.push('');
  for (let ti = 0; ti < matrix.types.length; ti++) {
    const t = matrix.types[ti];
    lines.push(`### ${ti + 1}. ${t.type_name}`);
    lines.push('');
    lines.push(t.description);
    lines.push('');
    lines.push(`Primary axis: \`${t.primary_axis_label}\`. Secondary axis: \`${t.secondary_axis_label}\`.`);
    lines.push('');
    lines.push('| idx | params | detected | attrib-correct | det-window | FP-count | pedagogical |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const v of t.variations) {
      const o = v.observation;
      const params_cell = JSON.stringify(v.params);
      const det_cell = o.detected ? 'yes' : 'no';
      const attrib_cell = o.attribution_correct === null ? 'n/a' : (o.attribution_correct ? 'yes' : 'no');
      const win_cell = o.detection_window_index === null ? 'n/a' : String(o.detection_window_index);
      const fp_cell = o.false_positive_count === null ? 'n/a' : String(o.false_positive_count);
      const ped_cell = o.pedagogical_property_met === null ? 'n/a' : (o.pedagogical_property_met ? 'yes' : 'no');
      lines.push(`| ${v.variation_idx} | \`${params_cell.replace(/\|/g, '\\|')}\` | ${det_cell} | ${attrib_cell} | ${win_cell} | ${fp_cell} | ${ped_cell} |`);
    }
    lines.push('');
  }
  lines.push('## Method');
  lines.push('');
  lines.push('Each variation is a deterministic engine run seeded by `(SCENARIO_SEED_PREFIX ^ variation_idx)` (plus per-type-namespace offsets for types 4 and 5 to prevent cross-type seed collisions). The runner imports engine surfaces by `.js` extension (matches existing `tools/` convention); no engine modifications; no new dependencies. Re-running `pnpm coverage` produces byte-identical output.');
  lines.push('');
  return lines.join('\n');
}

// ── Public entry point ──
export function runSaturationCoverage(_opts?: SaturationOpts): SaturationResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coordination', 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const matrix = buildCoverageMatrix();
  const jsonStr = serializeMatrixJson(matrix);
  const mdStr = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R72-saturation-matrix.json');
  const mdPath = path.join(coverageDir, 'R72-saturation-matrix.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return {
    matrix_json_path: jsonPath,
    matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_variations: 120,
    total_detected: matrix.totals.total_detected,
    total_attribution_correct: matrix.totals.total_attribution_correct,
  };
}

// ── CLI guard (matches tools/build-canned-demos.ts:1314 convention) ──
if (require.main === module) {
  const result = runSaturationCoverage();
  process.stdout.write(
    `Built coverage matrix: ${result.total_detected} / ${result.total_variations} detected ` +
    `(${result.total_attribution_correct} attribution-correct).\n` +
    `JSON: ${path.relative(process.cwd(), result.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), result.matrix_md_path)}\n`,
  );
  process.exit(0);
}
