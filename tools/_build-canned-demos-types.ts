// tools/_build-canned-demos-types.ts — type + public-surface module split out
// VERBATIM from tools/build-canned-demos.ts (no computation changes).

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
export interface PerShardWindow {
  shard_id: string;
  M_t: number | null;
  fired: boolean;
  residual_proxy: number | null; // R79: M_t - 1 for Family-A; null otherwise
}

// R79: per-window detector state
export interface FamilyAWindowDetectors {
  shards_fired_count: number;
  max_M_t: number | null;
  fired_shard_ids: ReadonlyArray<string>;
}
// R80: Family B/C/D/E now populated for Family-A-active scenarios.
export interface FamilyBCDEWindowDetectors {
  statistic: number;
  threshold: number;
  fired: boolean;
  derivation: string;
}
export interface PerWindowDetectors {
  family_a: FamilyAWindowDetectors | null;
  family_b: FamilyBCDEWindowDetectors | null;
  family_c: FamilyBCDEWindowDetectors | null;
  family_d: FamilyBCDEWindowDetectors | null;
  family_e: FamilyBCDEWindowDetectors | null;
}

// R79: top-level new fields
export interface ThresholdCrossingEntry {
  window: number;
  shard_id: string;
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  M_t_at_crossing: number;
  threshold: number;
}
export interface ProvenanceReceipt {
  event_id: string;
  window: number;
  shard_id: string;
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  reasoning: string;
  evidence: Record<string, unknown>;
}

export interface WindowEntry {
  t: number;
  per_shard: PerShardWindow[];
  events: unknown[];
  per_window_detectors: PerWindowDetectors; // R79
}
export interface CommonModeCandidate {
  shared_node_id: string;
  shared_node_kind: string;
  member_count: number;
  member_shard_ids: string[];
}
export interface TerminalState {
  firing_shards: string[];
  common_mode_candidates: CommonModeCandidate[];
  freeze_active: boolean;
  fdr_selected_indices: number[] | null;
  fdr_qLevel: number | null;
  fdr_K: number | null;
  fleet_fired: boolean | null;
  fleet_tick_at_first_fire: number | null;
}
export interface ScenarioJson {
  schema_version: string;
  scenario: ScenarioName;
  description: string;
  params: Record<string, unknown>;
  engine_surfaces: string[];
  windows: WindowEntry[];
  terminal_state: TerminalState;
  reasoning: string;
  suggested_actions: string[];
  // R79: new top-level fields (additive; schema_version stays 'tessera-demo-v1')
  detector_families: ReadonlyArray<'A' | 'B' | 'C' | 'D' | 'E'>;
  threshold_crossing_log: ReadonlyArray<ThresholdCrossingEntry>;
  provenance_receipts: ReadonlyArray<ProvenanceReceipt>;
}

// ── LCG + Gaussian (same form as tools/demo-scenario.ts) ──
export const SCENARIO_SEEDS: Record<ScenarioName, number> = {
  'clean-baseline':                0x71CB1,
  'sdc-drift':                     0x71D1F,
  'common-mode-rack':              0x71C2D,
  'event-conditional':             0x71E2C,
  'fdr-multiple-testing':          0x71FD0,
  'hierarchical-evalue':           0x71F1E,
  'sparse-data-resilience':        0x71570,
  'topology-spanning-common-mode': 0x71500,
};
