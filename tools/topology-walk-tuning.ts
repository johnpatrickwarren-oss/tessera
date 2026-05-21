// tools/topology-walk-tuning.ts — Tessera R78 topology-walk tuning sweep runner.
//
// Characterizes the tuning envelope of the existing engine surface
// engine/topology/common-mode-attribution.ts along two dials:
//   max_hop_distance ∈ {1, 2, 3}
//   min_member_count ∈ {2, 3}
// over 5 scenario classes (POS-CZ-SPARSE, POS-CZ-FULL, POS-RACK-2,
// POS-RACK-3, NEG-INDEP) × 5 PRNG-seeded trials per cell.
//
// Engine option pick (Q-R78-SPEC § 0 + § 1): Option (iii) — DEFER engine
// modification. The sweep uses ONLY existing engine opts; no engine code is
// modified or extended. Operator-actionable tuning recommendation lives at
// scripts/topology-walk-tuning-recommendation.md.
//
// Deterministic (seeded LCG); idempotent. Re-running `pnpm topology-walk-
// tuning` produces byte-identical coordination/coverage/R78-* outputs.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.

// ── Engine import (.js extension; matches R72/R77 convention) ──
import {
  attributeCommonMode,
  type FiredShardEvent,
  type CommonModeAttributionResult,
} from '../engine/topology/common-mode-attribution.js';
import type {
  TopologySnapshot, TopologyNode, TopologyEdge,
} from '../engine/types/verdict.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public exported types ──
export type ScenarioClass =
  | 'POS-CZ-SPARSE' | 'POS-CZ-FULL' | 'POS-RACK-2' | 'POS-RACK-3' | 'NEG-INDEP';
export const SCENARIO_CLASSES: ReadonlyArray<ScenarioClass> = [
  'POS-CZ-SPARSE', 'POS-CZ-FULL', 'POS-RACK-2', 'POS-RACK-3', 'NEG-INDEP',
];
export const HOPS: ReadonlyArray<1 | 2 | 3> = [1, 2, 3];
export const MINS: ReadonlyArray<2 | 3>     = [2, 3];
export const TRIALS_PER_CELL = 5;
export const TOTAL_CELLS  = 30;  // 5 × 3 × 2
export const TOTAL_TRIALS = 150; // 30 × 5

const SCENARIO_SEED_PREFIX = 0x78A11; // 494097 decimal — recorded in matrix JSON
const NEG_INDEP_BERNOULLI_P = 0.2;

// ── Topology fixture (re-declared; matches R72 build2RackCzTopology() exactly) ──
const RACK_A_SHARDS = ['shard-00', 'shard-01', 'shard-02'] as const;
const RACK_B_SHARDS = ['shard-03', 'shard-04', 'shard-05'] as const;
const ALL_SHARDS    = [...RACK_A_SHARDS, ...RACK_B_SHARDS] as const;

function buildTopology(): TopologySnapshot {
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
  return {
    nodes, edges, fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-r78-synthetic-cz', source_version: 'v1',
  };
}

// ── LCG + scenario primitives (re-implemented; NOT imported from R72/R77 tools) ──
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function pickFromArray<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)];
}
function shuffleTakeFromArray<T>(rng: () => number, arr: ReadonlyArray<T>, n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function generateScenarioInstance(
  scenario_class: ScenarioClass, rng: () => number,
): string[] {
  switch (scenario_class) {
    case 'POS-CZ-SPARSE':
      return [pickFromArray(rng, RACK_A_SHARDS), pickFromArray(rng, RACK_B_SHARDS)];
    case 'POS-CZ-FULL':
      return [
        ...shuffleTakeFromArray(rng, RACK_A_SHARDS, 2),
        ...shuffleTakeFromArray(rng, RACK_B_SHARDS, 2),
      ];
    case 'POS-RACK-2': {
      const rackChoice = rng() < 0.5 ? RACK_A_SHARDS : RACK_B_SHARDS;
      return shuffleTakeFromArray(rng, rackChoice, 2);
    }
    case 'POS-RACK-3':
      return rng() < 0.5 ? RACK_A_SHARDS.slice() : RACK_B_SHARDS.slice();
    case 'NEG-INDEP':
      return ALL_SHARDS.filter(_ => rng() < NEG_INDEP_BERNOULLI_P);
  }
}

// ── Per-trial outcome classification ──
interface TrialClassification {
  cz_fired: boolean;
  rack_fired: boolean;
  shadow_rack_fp: boolean;
  cz_member_count: number | null;
  rack_candidate_count: number;
}
function classifyOutcome(
  result: CommonModeAttributionResult, _fired_set: readonly string[],
): TrialClassification {
  const cz = result.candidates.find(
    c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1',
  );
  const racks = result.candidates.filter(c => c.shared_node_kind === 'rack');
  let shadow_rack_fp = false;
  for (const rc of racks) {
    const expected = rc.shared_node_id === 'rack-A'
      ? new Set<string>(RACK_A_SHARDS)
      : new Set<string>(RACK_B_SHARDS);
    if (rc.member_shard_ids.some(sid => !expected.has(sid))) {
      shadow_rack_fp = true; break;
    }
  }
  return {
    cz_fired: cz !== undefined,
    rack_fired: racks.length > 0,
    shadow_rack_fp,
    cz_member_count: cz ? cz.member_count : null,
    rack_candidate_count: racks.length,
  };
}

// ── Internal types (matrix shape) ──
interface TrialRow {
  trial_idx: number;
  seed: number;
  fired_set: readonly string[];
  classification: TrialClassification;
  candidates: ReadonlyArray<{
    shared_node_id: string;
    shared_node_kind: 'psu' | 'rack' | 'cooling_zone';
    member_count: number;
    member_shard_ids: readonly string[];
  }>;
}
interface CellRow {
  cell_idx: number;
  params: { scenario_class: ScenarioClass; max_hop_distance: 1 | 2 | 3; min_member_count: 2 | 3 };
  summary: {
    cz_detection_count: number;
    rack_detection_count: number;
    shadow_rack_fp_count: number;
  };
  trials: ReadonlyArray<TrialRow>;
}
interface TopologyWalkTuningMatrix {
  schema_version: 'tessera-topology-walk-tuning-v1';
  generated_with_seed_prefix: number;
  parameter_grid: {
    scenario_classes: ReadonlyArray<ScenarioClass>;
    hops: ReadonlyArray<number>;
    mins: ReadonlyArray<number>;
    trials_per_cell: number;
  };
  topology_summary: {
    nodes_count: 9; edges_count: 8;
    cz_node_id: 'cz-1'; rack_node_ids: readonly ['rack-A', 'rack-B'];
    rack_a_shards: readonly string[]; rack_b_shards: readonly string[];
  };
  cells: ReadonlyArray<CellRow>;
}

// ── Per-trial runner ──
function runSingleTrial(
  scenario_class: ScenarioClass, hop: 1 | 2 | 3, min: 2 | 3,
  cell_idx: number, trial_idx: number, snapshot: TopologySnapshot,
): TrialRow {
  const seed = (SCENARIO_SEED_PREFIX ^ (cell_idx * TRIALS_PER_CELL + trial_idx)) >>> 0;
  const rng = makeLcg(seed);
  const fired_set = generateScenarioInstance(scenario_class, rng);
  const events: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid, event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r78-c${cell_idx}-t${trial_idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: events, snapshot,
    opts: { max_hop_distance: hop, min_member_count: min, now: () => 1_700_000_200 },
  });
  const classification = classifyOutcome(result, fired_set);
  return {
    trial_idx, seed, fired_set,
    classification,
    candidates: result.candidates.map(c => ({
      shared_node_id: c.shared_node_id,
      shared_node_kind: c.shared_node_kind,
      member_count: c.member_count,
      member_shard_ids: c.member_shard_ids,
    })),
  };
}

// ── Cell aggregator + matrix builder ──
function aggregateCellSummary(trials: ReadonlyArray<TrialRow>): CellRow['summary'] {
  return {
    cz_detection_count:   trials.filter(t => t.classification.cz_fired).length,
    rack_detection_count: trials.filter(t => t.classification.rack_fired).length,
    shadow_rack_fp_count: trials.filter(t => t.classification.shadow_rack_fp).length,
  };
}
function buildMatrix(snapshot: TopologySnapshot): TopologyWalkTuningMatrix {
  const cells: CellRow[] = [];
  let cell_idx = 0;
  for (const sc of SCENARIO_CLASSES) {
    for (const hop of HOPS) {
      for (const min of MINS) {
        const trials: TrialRow[] = [];
        for (let ti = 0; ti < TRIALS_PER_CELL; ti++) {
          trials.push(runSingleTrial(sc, hop, min, cell_idx, ti, snapshot));
        }
        cells.push({
          cell_idx,
          params: { scenario_class: sc, max_hop_distance: hop, min_member_count: min },
          summary: aggregateCellSummary(trials),
          trials,
        });
        cell_idx += 1;
      }
    }
  }
  return {
    schema_version: 'tessera-topology-walk-tuning-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    parameter_grid: {
      scenario_classes: SCENARIO_CLASSES, hops: HOPS, mins: MINS,
      trials_per_cell: TRIALS_PER_CELL,
    },
    topology_summary: {
      nodes_count: 9, edges_count: 8,
      cz_node_id: 'cz-1', rack_node_ids: ['rack-A', 'rack-B'],
      rack_a_shards: RACK_A_SHARDS, rack_b_shards: RACK_B_SHARDS,
    },
    cells,
  };
}

// ── Markdown renderer ──
function renderMatrixMd(matrix: TopologyWalkTuningMatrix): string {
  const L: string[] = [];
  L.push('# Tessera R78 — topology-walk tuning envelope matrix');
  L.push('');
  L.push('Generated by `tools/topology-walk-tuning.ts`; deterministic; idempotent. Full machine-readable data: `R78-topology-walk-tuning-matrix.json`.');
  L.push('');
  L.push(`Parameter grid: ${matrix.parameter_grid.scenario_classes.length} scenario classes × ${matrix.parameter_grid.hops.length} max_hop_distance values × ${matrix.parameter_grid.mins.length} min_member_count values × ${matrix.parameter_grid.trials_per_cell} trials = ${matrix.cells.length} cells.`);
  L.push('');
  L.push('Topology fixture: 1 cooling_zone (`cz-1`) → 2 racks (`rack-A`, `rack-B`) → 3 shards each. Matches `tools/coverage-saturation.ts:build2RackCzTopology()` exactly.');
  L.push('');
  L.push('## Per-scenario summary (5 trials per cell)');
  L.push('');
  for (const sc of matrix.parameter_grid.scenario_classes) {
    L.push(`### ${sc}`);
    L.push('');
    L.push('| max_hop | min_member | cz_detection / 5 | rack_detection / 5 | shadow_rack_fp / 5 |');
    L.push('|---|---|---|---|---|');
    for (const cell of matrix.cells.filter(c => c.params.scenario_class === sc)) {
      L.push(`| ${cell.params.max_hop_distance} | ${cell.params.min_member_count} | ${cell.summary.cz_detection_count}/5 | ${cell.summary.rack_detection_count}/5 | ${cell.summary.shadow_rack_fp_count}/5 |`);
    }
    L.push('');
  }
  L.push('## Method');
  L.push('');
  L.push('Each cell runs 5 deterministic trials seeded by `(SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx))`. Each trial generates a fired_set via the scenario class\'s deterministic generator, then calls `attributeCommonMode` with the cell\'s `(max_hop_distance, min_member_count)`. The classification distinguishes (a) cz-1 cooling_zone detection, (b) any rack detection, (c) shadow_rack_fp (rack candidate with member_shard_ids containing a shard NOT in that rack — a structural false-positive at hop≥3). No engine modifications; no new dependencies. Re-running `pnpm topology-walk-tuning` produces byte-identical output. Engine option pick: (iii) — DEFER engine modification (see Q-R78-SPEC § 0).');
  L.push('');
  return L.join('\n');
}

// ── Serialization + public entry point ──
function serializeJson(matrix: TopologyWalkTuningMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

export interface TuningRunResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_cells: 30;
  total_trials: 150;
}
export function runTopologyWalkTuning(): TuningRunResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coordination', 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const snapshot = buildTopology();
  const matrix = buildMatrix(snapshot);
  const jsonStr = serializeJson(matrix);
  const mdStr   = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R78-topology-walk-tuning-matrix.json');
  const mdPath   = path.join(coverageDir, 'R78-topology-walk-tuning.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath,   mdStr);
  return {
    matrix_json_path: jsonPath, matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_cells: 30, total_trials: 150,
  };
}

// ── CLI guard (matches R72/R77 convention) ──
if (require.main === module) {
  const r = runTopologyWalkTuning();
  process.stdout.write(
    `Built topology-walk tuning matrix: ${r.total_cells} cells, ${r.total_trials} trials.\n` +
    `JSON: ${path.relative(process.cwd(), r.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), r.matrix_md_path)}\n`,
  );
  process.exit(0);
}
