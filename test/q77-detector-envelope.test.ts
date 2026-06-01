// test/q77-detector-envelope.test.ts — R77 ACs binding:
//   - Detection envelope matrix structural shape (ACs 1-6)
//   - Named diagnostic cell minimum-rate thresholds (ACs 7-10)
//   - Matrix MD + tuning recommendation content (ACs 11-12)
//   - Anti-regression byte-identity (ACs 13-14)
//   - Binding-command attestation: tsc, test counts, anti-scope diff (ACs 15-17)

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { runDetectionEnvelope } from '../tools/detector-envelope.js';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage-matrices');
const JSON_PATH = path.join(COVERAGE_DIR, 'R77-detection-envelope-matrix.json');
const MD_PATH = path.join(COVERAGE_DIR, 'R77-detection-envelope.md');
const TUNING_REC_PATH = path.join(PROJECT_ROOT, 'scripts', 'detector-tuning-recommendation.md');
const ROUND_START_SHA = '0d64d9a';

type DetectorFamily = 'family-a' | 'family-c';

interface TrialResult {
  trial_idx: number;
  seed: number;
  detected: boolean;
  detection_window_index: number | null;
}

interface CellSummary {
  detection_count: number;
  detection_rate: number;
  detection_window_median: number | null;
  detection_window_p95: number | null;
}

interface CellParams {
  drift_magnitude: number;
  window_count: number;
  alpha: number;
  family: DetectorFamily;
}

interface CellRow {
  cell_idx: number;
  params: CellParams;
  summary: CellSummary;
  trials: TrialResult[];
}

interface DetectionEnvelopeMatrix {
  schema_version: string;
  generated_with_seed_prefix: number;
  parameter_grid: {
    magnitudes: number[];
    window_counts: number[];
    alphas: number[];
    families: DetectorFamily[];
    trials_per_cell: number;
  };
  cells: CellRow[];
}

function loadMatrix(): DetectionEnvelopeMatrix {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw) as DetectionEnvelopeMatrix;
}

function findCell(
  matrix: DetectionEnvelopeMatrix,
  drift_magnitude: number,
  window_count: number,
  alpha: number,
  family: DetectorFamily,
): CellRow | undefined {
  return matrix.cells.find(c =>
    c.params.drift_magnitude === drift_magnitude &&
    c.params.window_count === window_count &&
    c.params.alpha === alpha &&
    c.params.family === family,
  );
}

// AC-R77-3: schema_version === 'tessera-detection-envelope-v1'.
test("AC-R77-3: matrix schema_version === 'tessera-detection-envelope-v1'", () => {
  const m = loadMatrix();
  assert.strictEqual(m.schema_version, 'tessera-detection-envelope-v1');
});

// AC-R77-4: cells.length === 504 (14 mag × 6 win × 3 α × 2 families).
test('AC-R77-4: matrix cells.length === 504', () => {
  const m = loadMatrix();
  assert.strictEqual(m.cells.length, 504);
});

// AC-R77-5: per-cell field schema — each cell has the required fields with correct shapes.
test('AC-R77-5: per-cell field schema is correct for every cell', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    assert.strictEqual(typeof cell.cell_idx, 'number', `cell_idx not a number in cell ${cell.cell_idx}`);
    // params
    assert.ok(cell.params, `params missing in cell ${cell.cell_idx}`);
    assert.strictEqual(typeof cell.params.drift_magnitude, 'number', `drift_magnitude not a number in cell ${cell.cell_idx}`);
    assert.strictEqual(typeof cell.params.window_count, 'number', `window_count not a number in cell ${cell.cell_idx}`);
    assert.strictEqual(typeof cell.params.alpha, 'number', `alpha not a number in cell ${cell.cell_idx}`);
    assert.ok(cell.params.family === 'family-a' || cell.params.family === 'family-c',
      `invalid family '${cell.params.family}' in cell ${cell.cell_idx}`);
    // summary
    assert.ok(cell.summary, `summary missing in cell ${cell.cell_idx}`);
    assert.strictEqual(typeof cell.summary.detection_count, 'number', `detection_count not a number in cell ${cell.cell_idx}`);
    assert.strictEqual(typeof cell.summary.detection_rate, 'number', `detection_rate not a number in cell ${cell.cell_idx}`);
    assert.ok(cell.summary.detection_window_median === null || typeof cell.summary.detection_window_median === 'number',
      `detection_window_median invalid in cell ${cell.cell_idx}`);
    assert.ok(cell.summary.detection_window_p95 === null || typeof cell.summary.detection_window_p95 === 'number',
      `detection_window_p95 invalid in cell ${cell.cell_idx}`);
    // trials
    assert.strictEqual(cell.trials.length, 5, `trials.length !== 5 in cell ${cell.cell_idx}`);
    for (const trial of cell.trials) {
      assert.strictEqual(typeof trial.trial_idx, 'number', `trial_idx not a number in cell ${cell.cell_idx}`);
      assert.strictEqual(typeof trial.seed, 'number', `seed not a number in cell ${cell.cell_idx}`);
      assert.strictEqual(typeof trial.detected, 'boolean', `detected not a boolean in cell ${cell.cell_idx}`);
      assert.ok(trial.detection_window_index === null || typeof trial.detection_window_index === 'number',
        `detection_window_index invalid in cell ${cell.cell_idx}`);
    }
  }
});

// AC-R77-6: idempotency — runDetectionEnvelope() twice produces byte-identical JSON.
test('AC-R77-6: matrix idempotency — runDetectionEnvelope() twice produces byte-identical JSON', () => {
  const first = runDetectionEnvelope();
  const buf1 = fs.readFileSync(first.matrix_json_path);
  const second = runDetectionEnvelope();
  const buf2 = fs.readFileSync(second.matrix_json_path);
  assert.strictEqual(buf1.length, buf2.length,
    `Matrix JSON size diverged: ${buf1.length} → ${buf2.length}`);
  assert.ok((buf1 as Buffer).equals(buf2 as Buffer),
    'Matrix JSON bytes diverged across two runs (non-idempotent)');
});

// AC-R77-7: high-magnitude saturation cell (family A) — detection_rate >= 0.6.
test('AC-R77-7: at (mag=0.30, win=100, α=0.01, family=family-a): detection_rate >= 0.6', () => {
  const m = loadMatrix();
  const cell = findCell(m, 0.30, 100, 0.01, 'family-a');
  assert.ok(cell, 'cell (mag=0.30, win=100, α=0.01, family=family-a) not found in matrix');
  assert.ok(cell!.summary.detection_count >= 3,
    `detection_count = ${cell!.summary.detection_count} / 5 at (mag=0.30, win=100, α=0.01, family-a); expected >= 3`);
});

// AC-R77-8: R72-comparison cell (family A, longer window) — detection_rate >= 0.6.
test('AC-R77-8: at (mag=0.20, win=200, α=0.005, family=family-a): detection_rate >= 0.6', () => {
  const m = loadMatrix();
  const cell = findCell(m, 0.20, 200, 0.005, 'family-a');
  assert.ok(cell, 'cell (mag=0.20, win=200, α=0.005, family=family-a) not found in matrix');
  assert.ok(cell!.summary.detection_count >= 3,
    `detection_count = ${cell!.summary.detection_count} / 5 at (mag=0.20, win=200, α=0.005, family-a); expected >= 3`);
});

// AC-R77-9: low-magnitude floor characterization (family A; over-sensitivity guard) — detection_rate <= 0.6.
test('AC-R77-9: at (mag=0.05, win=30, α=0.005, family=family-a): detection_rate <= 0.6 (low-mag floor)', () => {
  const m = loadMatrix();
  const cell = findCell(m, 0.05, 30, 0.005, 'family-a');
  assert.ok(cell, 'cell (mag=0.05, win=30, α=0.005, family=family-a) not found in matrix');
  assert.ok(cell!.summary.detection_count <= 3,
    `detection_count = ${cell!.summary.detection_count} / 5 at (mag=0.05, win=30, α=0.005, family-a); expected <= 3 (over-sensitive if higher)`);
});

// AC-R77-10: both families covered at (mag=0.20, win=100, α=0.005); report delta to stdout.
test('AC-R77-10: both families present at (mag=0.20, win=100, α=0.005); reports family_a_rate - family_c_rate', () => {
  const m = loadMatrix();
  const cellA = findCell(m, 0.20, 100, 0.005, 'family-a');
  const cellC = findCell(m, 0.20, 100, 0.005, 'family-c');
  assert.ok(cellA, 'family-a cell at (mag=0.20, win=100, α=0.005) not found');
  assert.ok(cellC, 'family-c cell at (mag=0.20, win=100, α=0.005) not found');
  assert.strictEqual(typeof cellA!.summary.detection_rate, 'number');
  assert.strictEqual(typeof cellC!.summary.detection_rate, 'number');
  const delta = cellA!.summary.detection_rate - cellC!.summary.detection_rate;
  // Report to stdout per spec — no assertion on the sign.
  process.stdout.write(
    `[AC-R77-10] family_a_rate=${cellA!.summary.detection_rate.toFixed(2)} ` +
    `family_c_rate=${cellC!.summary.detection_rate.toFixed(2)} ` +
    `delta(A-C)=${delta.toFixed(2)}\n`,
  );
});

// AC-R77-11: matrix MD contains 3 '### α =' headings and ≥3 'mag      |' occurrences.
test("AC-R77-11: matrix MD contains exactly 3 '### α =' headings and ≥3 'mag      |' rows", () => {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const alphaHeadingCount = md.split('### α =').length - 1;
  assert.strictEqual(alphaHeadingCount, 3,
    `Expected exactly 3 '### α =' headings in matrix MD; found ${alphaHeadingCount}`);
  const magRowCount = md.split('mag      |').length - 1;
  assert.ok(magRowCount >= 3,
    `Expected ≥3 'mag      |' rows in matrix MD; found ${magRowCount}`);
});

