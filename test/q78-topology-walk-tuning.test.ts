// test/q78-topology-walk-tuning.test.ts — R78 binding tests.
//
// Verifies: matrix structure + per-cell exact-count ACs (deterministic
// 30-cell × 5-trial matrix at SEED_PREFIX=0x78A11) + anti-regression +
// recommendation document + anti-scope.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT  = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(REPO_ROOT, 'coverage-matrices');
const MATRIX_JSON  = path.join(COVERAGE_DIR, 'R78-topology-walk-tuning-matrix.json');
const MATRIX_MD    = path.join(COVERAGE_DIR, 'R78-topology-walk-tuning.md');
const REC_MD       = path.join(REPO_ROOT, 'scripts', 'topology-walk-tuning-recommendation.md');
const TUNER_TS     = path.join(REPO_ROOT, 'tools', 'topology-walk-tuning.ts');

const ROUND_START_SHA = '3d00490';

interface Trial {
  trial_idx: number; seed: number; fired_set: string[];
  classification: { cz_fired: boolean; rack_fired: boolean; shadow_rack_fp: boolean;
                    cz_member_count: number | null; rack_candidate_count: number };
  candidates: Array<{ shared_node_id: string; shared_node_kind: string;
                      member_count: number; member_shard_ids: string[] }>;
}
interface Cell {
  cell_idx: number;
  params: { scenario_class: string; max_hop_distance: number; min_member_count: number };
  summary: { cz_detection_count: number; rack_detection_count: number; shadow_rack_fp_count: number };
  trials: Trial[];
}
interface Matrix {
  schema_version: string; generated_with_seed_prefix: number;
  parameter_grid: { scenario_classes: string[]; hops: number[]; mins: number[]; trials_per_cell: number };
  topology_summary: { nodes_count: number; edges_count: number;
                      cz_node_id: string; rack_node_ids: string[];
                      rack_a_shards: string[]; rack_b_shards: string[] };
  cells: Cell[];
}

function loadMatrix(): Matrix {
  assert.ok(fs.existsSync(MATRIX_JSON), `matrix JSON not present at ${MATRIX_JSON}`);
  return JSON.parse(fs.readFileSync(MATRIX_JSON, 'utf8')) as Matrix;
}

// ── AC-R78-3: matrix schema_version + cell count ──
test('AC-R78-3: matrix schema + cell count', () => {
  const m = loadMatrix();
  assert.strictEqual(m.schema_version, 'tessera-topology-walk-tuning-v1');
  assert.strictEqual(m.cells.length, 30);
});

// ── AC-R78-4: topology shape (9 nodes, 8 edges; cz-1 + 2 racks + 6 shards) ──
test('AC-R78-4: topology summary matches R72 build2RackCzTopology shape', () => {
  const m = loadMatrix();
  assert.strictEqual(m.topology_summary.nodes_count, 9);
  assert.strictEqual(m.topology_summary.edges_count, 8);
  assert.strictEqual(m.topology_summary.cz_node_id, 'cz-1');
  assert.deepStrictEqual([...m.topology_summary.rack_node_ids].sort(), ['rack-A', 'rack-B']);
  assert.deepStrictEqual([...m.topology_summary.rack_a_shards].sort(),
                          ['shard-00', 'shard-01', 'shard-02']);
  assert.deepStrictEqual([...m.topology_summary.rack_b_shards].sort(),
                          ['shard-03', 'shard-04', 'shard-05']);
});

// ── AC-R78-5: per-cell exact-equality on (cz_count, rack_count, shadow_fp_count)
//                for ALL 30 cells per § 1.4 pre-prediction matrix ──
test('AC-R78-5: per-cell exact-equality matches Architect pre-prediction', () => {
  const m = loadMatrix();
  // Encoded as [cell_idx, scenario, hop, min, cz, rack, shadow]
  const EXPECTED: Array<[number, string, number, number, number, number, number]> = [
    [ 0, 'POS-CZ-SPARSE', 1, 2, 0, 0, 0],
    [ 1, 'POS-CZ-SPARSE', 1, 3, 0, 0, 0],
    [ 2, 'POS-CZ-SPARSE', 2, 2, 5, 0, 0],
    [ 3, 'POS-CZ-SPARSE', 2, 3, 0, 0, 0],
    [ 4, 'POS-CZ-SPARSE', 3, 2, 5, 5, 5],
    [ 5, 'POS-CZ-SPARSE', 3, 3, 0, 0, 0],
    [ 6, 'POS-CZ-FULL',   1, 2, 0, 5, 0],
    [ 7, 'POS-CZ-FULL',   1, 3, 0, 0, 0],
    [ 8, 'POS-CZ-FULL',   2, 2, 5, 5, 0],
    [ 9, 'POS-CZ-FULL',   2, 3, 5, 0, 0],
    [10, 'POS-CZ-FULL',   3, 2, 5, 5, 5],
    [11, 'POS-CZ-FULL',   3, 3, 5, 5, 5],
    [12, 'POS-RACK-2',    1, 2, 0, 5, 0],
    [13, 'POS-RACK-2',    1, 3, 0, 0, 0],
    [14, 'POS-RACK-2',    2, 2, 5, 5, 0],
    [15, 'POS-RACK-2',    2, 3, 0, 0, 0],
    [16, 'POS-RACK-2',    3, 2, 5, 5, 5],
    [17, 'POS-RACK-2',    3, 3, 0, 0, 0],
    [18, 'POS-RACK-3',    1, 2, 0, 5, 0],
    [19, 'POS-RACK-3',    1, 3, 0, 5, 0],
    [20, 'POS-RACK-3',    2, 2, 5, 5, 0],
    [21, 'POS-RACK-3',    2, 3, 5, 5, 0],
    [22, 'POS-RACK-3',    3, 2, 5, 5, 5],
    [23, 'POS-RACK-3',    3, 3, 5, 5, 5],
    [24, 'NEG-INDEP',     1, 2, 0, 2, 0],
    [25, 'NEG-INDEP',     1, 3, 0, 0, 0],
    [26, 'NEG-INDEP',     2, 2, 1, 1, 0],
    [27, 'NEG-INDEP',     2, 3, 1, 0, 0],
    [28, 'NEG-INDEP',     3, 2, 1, 1, 1],
    [29, 'NEG-INDEP',     3, 3, 0, 0, 0],
  ];
  for (const [idx, sc, hop, min, cz, rack, shadow] of EXPECTED) {
    const cell = m.cells.find(c => c.cell_idx === idx);
    assert.ok(cell, `cell_idx=${idx} missing`);
    assert.strictEqual(cell.params.scenario_class, sc, `cell ${idx} scenario_class`);
    assert.strictEqual(cell.params.max_hop_distance, hop, `cell ${idx} hop`);
    assert.strictEqual(cell.params.min_member_count, min, `cell ${idx} min`);
    assert.strictEqual(cell.summary.cz_detection_count,   cz,     `cell ${idx} cz_count`);
    assert.strictEqual(cell.summary.rack_detection_count, rack,   `cell ${idx} rack_count`);
    assert.strictEqual(cell.summary.shadow_rack_fp_count, shadow, `cell ${idx} shadow_count`);
  }
});

// ── AC-R78-6: per-cell trials.length === 5 for every cell ──
test('AC-R78-6: every cell has 5 trials', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    assert.strictEqual(cell.trials.length, 5, `cell ${cell.cell_idx} trials.length`);
  }
});

// ── AC-R78-7: seed_prefix recorded as 0x78A11 (494097 decimal) ──
test('AC-R78-7: SEED_PREFIX === 0x78A11', () => {
  const m = loadMatrix();
  assert.strictEqual(m.generated_with_seed_prefix, 0x78A11);
});

// ── AC-R78-8: shadow_rack_fp NEVER fires at hop ≤ 2 (structural invariant) ──
test('AC-R78-8: shadow_rack_fp_count === 0 for all cells with hop ≤ 2', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    if (cell.params.max_hop_distance <= 2) {
      assert.strictEqual(cell.summary.shadow_rack_fp_count, 0,
        `cell ${cell.cell_idx} (hop=${cell.params.max_hop_distance}) should have 0 shadow_rack_fp`);
    }
  }
});

// ── AC-R78-9: at hop=1, POS-CZ-* cz_detection_count === 0 (structural — cz unreachable) ──
test('AC-R78-9: cz unreachable at hop=1 (POS-CZ-SPARSE cells 0,1 + POS-CZ-FULL cells 6,7)', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    if (cell.params.max_hop_distance === 1
        && (cell.params.scenario_class === 'POS-CZ-SPARSE'
            || cell.params.scenario_class === 'POS-CZ-FULL')) {
      assert.strictEqual(cell.summary.cz_detection_count, 0,
        `cell ${cell.cell_idx} (hop=1, ${cell.params.scenario_class}) cz must be 0`);
    }
  }
});

// ── AC-R78-10: matrix MD contains the 5 per-scenario sections ──
test('AC-R78-10: matrix MD has 5 per-scenario sections + Method', () => {
  const md = fs.readFileSync(MATRIX_MD, 'utf8');
  for (const sc of ['POS-CZ-SPARSE', 'POS-CZ-FULL', 'POS-RACK-2', 'POS-RACK-3', 'NEG-INDEP']) {
    assert.ok(md.includes(`### ${sc}`), `matrix MD missing ### ${sc}`);
  }
  assert.ok(md.includes('## Method'));
});

