// test/q72-coverage-saturation.test.ts — R72 runtime ACs.

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  runSaturationCoverage,
  FAILURE_TYPE_NAMES,
  type FailureTypeName,
} from '../tools/coverage-saturation.js';

const COVERAGE_DIR = path.resolve(__dirname, '..', 'coordination', 'coverage');
const JSON_PATH = path.join(COVERAGE_DIR, 'R72-saturation-matrix.json');
const MD_PATH = path.join(COVERAGE_DIR, 'R72-saturation-matrix.md');

interface VariationRow {
  variation_idx: number;
  params: Record<string, unknown>;
  observation: {
    detected: boolean;
    attribution_correct: boolean | null;
    detection_window_index: number | null;
    false_positive_count: number | null;
    pedagogical_property_met: boolean | null;
    raw_terminal: Record<string, unknown>;
  };
}
interface TypeBlock {
  type_name: FailureTypeName;
  description: string;
  primary_axis_label: string;
  secondary_axis_label: string;
  variations: VariationRow[];
  summary: {
    detection_rate: number;
    detected_count: number;
    attribution_accuracy: number | null;
    correct_count: number;
    max_false_positive_count: number | null;
    pedagogical_property_rate: number | null;
  };
}
interface CoverageMatrix {
  schema_version: 'tessera-coverage-v1';
  generated_with_seed_prefix: number;
  types: TypeBlock[];
  totals: { total_variations: 120; total_detected: number; total_attribution_correct: number };
}

function loadCommittedMatrix(): CoverageMatrix {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw) as CoverageMatrix;
}

// AC-R72-1: matrix.json file exists at the canonical path.
test('AC-R72-1: matrix.json file exists at coordination/coverage/R72-saturation-matrix.json', () => {
  assert.strictEqual(fs.existsSync(JSON_PATH), true,
    `Expected matrix JSON at ${JSON_PATH}`);
});

// AC-R72-2: matrix.json schema_version is 'tessera-coverage-v1'.
test('AC-R72-2: matrix.json schema_version is "tessera-coverage-v1"', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.schema_version, 'tessera-coverage-v1');
});

// AC-R72-3: matrix.json totals.total_variations === 120.
test('AC-R72-3: matrix.json totals.total_variations === 120', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.totals.total_variations, 120);
});

// AC-R72-4: matrix.json types[] has 6 entries in canonical order.
test('AC-R72-4: matrix.json types[] has 6 entries in canonical order', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.types.length, 6);
  assert.deepStrictEqual(m.types.map(t => t.type_name), FAILURE_TYPE_NAMES);
});

// AC-R72-5: every type has exactly 20 variations with variation_idx 0..19.
test('AC-R72-5: every type has exactly 20 variations with variation_idx 0..19', () => {
  const m = loadCommittedMatrix();
  for (const t of m.types) {
    assert.strictEqual(t.variations.length, 20, `Type ${t.type_name} expected 20 variations`);
    for (let i = 0; i < 20; i++) {
      assert.strictEqual(t.variations[i].variation_idx, i,
        `Type ${t.type_name} variation[${i}].variation_idx !== ${i}`);
    }
  }
});

// AC-R72-6: sum of per-type detected_count === totals.total_detected.
test('AC-R72-6: sum of per-type detected_count === totals.total_detected', () => {
  const m = loadCommittedMatrix();
  const sum = m.types.reduce((acc, t) => acc + t.summary.detected_count, 0);
  assert.strictEqual(sum, m.totals.total_detected);
});

// AC-R72-7: sum of per-type correct_count === totals.total_attribution_correct.
test('AC-R72-7: sum of per-type correct_count === totals.total_attribution_correct', () => {
  const m = loadCommittedMatrix();
  const sum = m.types.reduce((acc, t) => acc + t.summary.correct_count, 0);
  assert.strictEqual(sum, m.totals.total_attribution_correct);
});

// Per-type detection rate floors (§ 2.3).
const DETECTION_FLOORS: Record<FailureTypeName, number> = {
  'sdc-drift':                     16,
  'common-mode-rack':              20,
  'event-conditional':             20,
  'fdr-multiple-testing':          16,
  'hierarchical-evalue':           12,
  'topology-spanning-common-mode': 16,
};

// AC-R72-8: sdc-drift detected_count >= 16.
test('AC-R72-8: sdc-drift detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'sdc-drift')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['sdc-drift'],
    `sdc-drift detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-9: common-mode-rack detected_count >= 20.
test('AC-R72-9: common-mode-rack detected_count >= 20', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'common-mode-rack')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['common-mode-rack'],
    `common-mode-rack detected ${t.summary.detected_count} / 20; expected >= 20`);
});

// AC-R72-10: event-conditional detected_count >= 20.
test('AC-R72-10: event-conditional detected_count >= 20', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'event-conditional')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['event-conditional'],
    `event-conditional detected ${t.summary.detected_count} / 20; expected >= 20`);
});

// AC-R72-11: fdr-multiple-testing detected_count >= 16.
test('AC-R72-11: fdr-multiple-testing detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'fdr-multiple-testing')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['fdr-multiple-testing'],
    `fdr detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-12: hierarchical-evalue detected_count >= 12.
test('AC-R72-12: hierarchical-evalue detected_count >= 12', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'hierarchical-evalue')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['hierarchical-evalue'],
    `hierarchical detected ${t.summary.detected_count} / 20; expected >= 12`);
});

// AC-R72-13: topology-spanning-common-mode detected_count >= 16.
test('AC-R72-13: topology-spanning-common-mode detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'topology-spanning-common-mode')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['topology-spanning-common-mode'],
    `topology-spanning detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-14: per-type attribution_accuracy >= 0.95 when detected_count > 0 (across all 6 types).
test('AC-R72-14: per-type attribution_accuracy >= 0.95 when any detection occurred', () => {
  const m = loadCommittedMatrix();
  for (const t of m.types) {
    if (t.summary.detected_count > 0) {
      assert.ok(t.summary.attribution_accuracy !== null && t.summary.attribution_accuracy >= 0.95,
        `Type ${t.type_name}: attribution_accuracy = ${t.summary.attribution_accuracy}; expected >= 0.95 (detected_count=${t.summary.detected_count})`);
    }
  }
});

// AC-R72-15: hierarchical-evalue pedagogical_property_rate >= 0.80 when detected_count > 0.
test('AC-R72-15: hierarchical-evalue pedagogical_property_rate >= 0.80 (fleet fires before per-shard)', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'hierarchical-evalue')!;
  if (t.summary.detected_count > 0) {
    assert.ok(t.summary.pedagogical_property_rate !== null && t.summary.pedagogical_property_rate >= 0.80,
      `hierarchical-evalue pedagogical_property_rate = ${t.summary.pedagogical_property_rate}; expected >= 0.80`);
  }
});

// AC-R72-16: max_false_positive_count <= 0 for sdc-drift, common-mode-rack, fdr-multiple-testing.
test('AC-R72-16: max_false_positive_count === 0 for sdc-drift / common-mode-rack / fdr-multiple-testing', () => {
  const m = loadCommittedMatrix();
  const types_with_fp_floor: FailureTypeName[] = ['sdc-drift', 'common-mode-rack', 'fdr-multiple-testing'];
  for (const name of types_with_fp_floor) {
    const t = m.types.find(x => x.type_name === name)!;
    if (t.summary.max_false_positive_count !== null) {
      assert.strictEqual(t.summary.max_false_positive_count, 0,
        `Type ${name}: max_false_positive_count = ${t.summary.max_false_positive_count}; expected 0`);
    }
  }
});

// AC-R72-17: matrix idempotency — programmatic re-run produces byte-identical JSON.
test('AC-R72-17: matrix idempotency — runSaturationCoverage twice produces byte-identical matrix.json', () => {
  const first = runSaturationCoverage();
  const buf1 = fs.readFileSync(first.matrix_json_path);
  const second = runSaturationCoverage();
  const buf2 = fs.readFileSync(second.matrix_json_path);
  assert.strictEqual(buf1.length, buf2.length, `Matrix JSON size diverged: ${buf1.length} -> ${buf2.length}`);
  assert.ok(buf1.equals(buf2), 'Matrix JSON bytes diverged across two runs (non-idempotent)');
});

// AC-R72-18: matrix.md exists and matches matrix.json totals.
test('AC-R72-18: matrix.md exists and references matrix.json totals correctly', () => {
  assert.strictEqual(fs.existsSync(MD_PATH), true,
    `Expected matrix MD at ${MD_PATH}`);
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const m = loadCommittedMatrix();
  assert.ok(md.includes(`| ${m.totals.total_variations} | ${m.totals.total_detected} | ${m.totals.total_attribution_correct} |`),
    'matrix.md Totals row does not match matrix.json totals');
  for (const t of m.types) {
    assert.ok(md.includes(`### ${m.types.indexOf(t) + 1}. ${t.type_name}`),
      `matrix.md missing heading "### N. ${t.type_name}"`);
  }
});

// AC-R72-19: anti-regression — R71 build artifact preserved.
test('AC-R72-19: R71 build-canned-demos SCENARIO_NAMES still exports 8 names (R71 anti-regression)', async () => {
  const r71 = await import('../tools/build-canned-demos.js');
  assert.strictEqual(Array.isArray(r71.SCENARIO_NAMES), true);
  assert.strictEqual(r71.SCENARIO_NAMES.length, 8);
});

// AC-R72-20: anti-regression — R70 demo-scenario surface preserved.
test('AC-R72-20: R70 demo-scenario SCENARIO_NAMES still exports 4 names (R70 anti-regression)', async () => {
  const r70 = await import('../tools/demo-scenario.js');
  assert.strictEqual(Array.isArray(r70.SCENARIO_NAMES), true);
  assert.strictEqual(r70.SCENARIO_NAMES.length, 4);
});
