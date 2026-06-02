// tools/_coverage-saturation-types.ts — Tessera R72 coverage saturation: shared
// types, constants, variation grids, numeric primitives, and topology fixtures.
//
// Split verbatim out of tools/coverage-saturation.ts (god-file refactor). No
// behavior change; pure relocation. See coverage-saturation.ts header for the
// full anti-scope + tactical-deviation notes.

// ── Engine imports (.js extension; matches R70/R71 convention) ──
import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import type { TopologySnapshot, TopologyNode, TopologyEdge } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import type { DeployEventPayload } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

// Re-export the betting-state surfaces the variation runners need so siblings
// import them from one place (no behavior change; identical bindings).
export { freshBettingState, updateBettingState };

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
export const SCENARIO_SEED_PREFIX = 0x71C00; // 465920 decimal — recorded in matrix JSON for reproducibility audit
export const SHARD_COUNT_DEFAULT = 10;
export const WINDOW_COUNT_DEFAULT = 30;
export const DEMO_ALPHA = 5e-3;
export const DEMO_THRESHOLD = 1 / DEMO_ALPHA;  // 200
export const FLEET_ALPHA = 0.05;
export const LOG_FLEET_THRESHOLD = Math.log(1 / FLEET_ALPHA);

// LCG + Gaussian primitives — re-implemented (NOT imported from tools/build-canned-demos.ts)
export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

// ── Variation grids (exact literals; § 2.1 spec) ──
export const TYPE1_TARGET_SHARDS = ['shard-01', 'shard-03', 'shard-04', 'shard-07'] as const;
export const TYPE1_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.20, 10], [0.30, 8], [0.40, 6], [0.50, 5], [0.70, 4],
];
export const TYPE2_RACK_SETS: ReadonlyArray<{ target_rack: 'rack-A' | 'rack-B'; fired_set: ReadonlyArray<string> }> = [
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01', 'shard-02'] },
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04', 'shard-05'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04'] },
];
export const TYPE2_ATTRIBUTION_WINDOWS: ReadonlyArray<number> = [0, 1, 2, 3, 4];
// Spec prescribed ['firmware_push', 'deploy', 'config_change', 'rollback'] but
// 'deploy' and 'rollback' are not valid DeployEventPayload.event_class values.
// Using ['firmware_push', 'model_redeploy', 'config_change', 'env_change'] instead.
export const TYPE3_EVENT_CLASSES: ReadonlyArray<DeployEventPayload['event_class']> = [
  'firmware_push', 'model_redeploy', 'config_change', 'env_change',
];
export const TYPE3_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [10, 20], [50, 100], [100, 150], [200, 250], [290, 295],
];
export const TYPE4_DRIFTING_COUNTS: ReadonlyArray<number> = [1, 3, 5, 8];
export const TYPE4_QLEVELS: ReadonlyArray<number> = [0.05, 0.10, 0.15, 0.20, 0.25];
export const TYPE5_SHARD_COUNTS: ReadonlyArray<number> = [5, 8, 10, 15];
export const TYPE5_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.10, 8], [0.13, 7], [0.16, 6], [0.20, 5], [0.25, 5],
];
export const TYPE6_FIRED_SETS: ReadonlyArray<ReadonlyArray<string>> = [
  ['shard-00', 'shard-01', 'shard-03', 'shard-04'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'],
  ['shard-00', 'shard-03'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03'],
];
export const TYPE6_MAX_HOPS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

// ── Internal types ──
export interface Observation {
  detected: boolean;
  attribution_correct: boolean | null;
  detection_window_index: number | null;
  false_positive_count: number | null;
  pedagogical_property_met: boolean | null;
  raw_terminal: Record<string, unknown>;
}
export interface VariationRow {
  variation_idx: number;
  params: Record<string, unknown>;
  observation: Observation;
}
export interface TypeSummary {
  detection_rate: number;
  detected_count: number;
  attribution_accuracy: number | null;
  correct_count: number;
  max_false_positive_count: number | null;
  pedagogical_property_rate: number | null;
}
export interface TypeBlock {
  type_name: FailureTypeName;
  description: string;
  primary_axis_label: string;
  secondary_axis_label: string;
  variations: VariationRow[];
  summary: TypeSummary;
}
export interface CoverageMatrix {
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
export function build2RackTopology(): TopologySnapshot {
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

export function build2RackCzTopology(): TopologySnapshot {
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
