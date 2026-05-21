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
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coordination', 'coverage');
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

// AC-R77-1: matrix JSON artifact exists at canonical path.
test('AC-R77-1: matrix JSON exists at coordination/coverage/R77-detection-envelope-matrix.json', () => {
  assert.strictEqual(fs.existsSync(JSON_PATH), true,
    `Expected matrix JSON at ${JSON_PATH}`);
});

// AC-R77-2: matrix MD artifact exists at canonical path.
test('AC-R77-2: matrix MD exists at coordination/coverage/R77-detection-envelope.md', () => {
  assert.strictEqual(fs.existsSync(MD_PATH), true,
    `Expected matrix MD at ${MD_PATH}`);
});

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

// AC-R77-12: detector-tuning-recommendation.md exists with all 5 required section headings.
test('AC-R77-12: detector-tuning-recommendation.md exists with 5 required section headings', () => {
  assert.strictEqual(fs.existsSync(TUNING_REC_PATH), true,
    `Expected ${TUNING_REC_PATH} to exist`);
  const md = fs.readFileSync(TUNING_REC_PATH, 'utf8');
  const requiredSections = [
    '## Empirical envelope',
    '## Tuning levers',
    '## Theoretical Ville-bound floor',
    '## Operational tuning margin',
    '## How to use this document',
  ];
  for (const sec of requiredSections) {
    assert.ok(md.includes(sec),
      `detector-tuning-recommendation.md missing required section heading: '${sec}'`);
  }
});

// AC-R77-13: R72 saturation matrix byte-identical to round-start SHA 0d64d9a.
test('AC-R77-13: R72 saturation matrix byte-identical to round-start SHA 0d64d9a', () => {
  const r72Paths = [
    'coordination/coverage/R72-saturation-matrix.json',
    'coordination/coverage/R72-saturation-matrix.md',
  ];
  for (const p of r72Paths) {
    let diffOut = '';
    try {
      diffOut = execFileSync(
        'git', ['diff', ROUND_START_SHA, 'HEAD', '--', p],
        { encoding: 'utf8', cwd: PROJECT_ROOT },
      );
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string };
      diffOut = (e.stdout ?? '') + (e.stderr ?? '');
    }
    assert.strictEqual(diffOut.trim(), '',
      `R72 frozen file modified: ${p}\n${diffOut}`);
  }
});

// AC-R77-14: engine + frozen tools/scripts byte-identical to round-start SHA 0d64d9a.
test('AC-R77-14: frozen engine + tools + scripts surfaces byte-identical to round-start', () => {
  const frozenPaths = [
    'engine/',
    'tools/coverage-saturation.ts',
    'tools/demo-scenario.ts',
    'tools/build-canned-demos.ts',
    'tools/curate-baseline-pipeline.ts',
    'tools/curate-baseline-pre-pass.ts',
    'tools/curate-baseline-fleet-correlated.ts',
    'scripts/tier-router.ts',
    'scripts/tier-router-validate.ts',
    'scripts/mu-model-select.ts',
    'scripts/build-role-context.ts',
    'scripts/measure-cache-effect.ts',
    'run-pipeline.sh',
  ];
  let diffOut = '';
  try {
    diffOut = execFileSync(
      'git', ['diff', ROUND_START_SHA, 'HEAD', '--', ...frozenPaths],
      { encoding: 'utf8', cwd: PROJECT_ROOT },
    );
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    diffOut = (e.stdout ?? '') + (e.stderr ?? '');
  }
  assert.strictEqual(diffOut.trim(), '',
    `Frozen surfaces modified between ${ROUND_START_SHA}..HEAD:\n${diffOut.substring(0, 500)}`);
});

// AC-R77-15: npx tsc -p tsconfig.test.json exits 0.
test('AC-R77-15: npx tsc -p tsconfig.test.json exits 0', () => {
  let exitCode: number | null = null;
  try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json', '--noEmit'],
      { encoding: 'utf8', cwd: PROJECT_ROOT });
    exitCode = 0;
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = e.status ?? 1;
    assert.fail(`tsc exited non-zero (${exitCode}):\n${e.stdout ?? ''}${e.stderr ?? ''}`);
  }
  assert.strictEqual(exitCode, 0);
});

// AC-R77-16: test pass count in [556, 560] (= 541 + 17 ± 2); fail = 5; suites = 3.
// Skip guard: running node --test inside a worker causes recursive detection deadlock.
test('AC-R77-16: test counts: pass in [556,560], fail=5, suites=3 (binding command)', (t) => {
  if (process.env['NODE_TEST_CONTEXT'] || process.env['NODE_TEST_WORKER_ID']) {
    t.skip('subprocess-spawn skipped in worker context — transitive hang risk (R34 incident)');
    return;
  }
  const testDir = path.resolve(__dirname);
  const testFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.resolve(testDir, f));

  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
  );

  // Use spawnSync per AC-R36-3 convention — spawning node via execFileSync is banned in test files.
  const r = spawnSync('node', ['--test', '--test-reporter=tap', ...testFiles],
    { encoding: 'utf8', env: subEnv, cwd: PROJECT_ROOT });
  const output = (r.stdout ?? '') + (r.stderr ?? '');

  const testsMatch = output.match(/^# tests (\d+)$/m);
  const passMatch = output.match(/^# pass (\d+)$/m);
  const failMatch = output.match(/^# fail (\d+)$/m);
  const suitesMatch = output.match(/^# suites (\d+)$/m);

  assert.ok(testsMatch, `could not parse '# tests' from TAP output`);
  assert.ok(passMatch, `could not parse '# pass' from TAP output`);
  assert.ok(failMatch, `could not parse '# fail' from TAP output`);

  const passCount = parseInt(passMatch![1], 10);
  assert.ok(passCount >= 556 && passCount <= 560,
    `pass count = ${passCount}; expected in [556, 560] (541 + 17 ± 2)`);
  assert.strictEqual(parseInt(failMatch![1], 10), 5,
    `fail count should be 5 (carry-forward); got ${failMatch![1]}`);
  if (suitesMatch) {
    assert.strictEqual(parseInt(suitesMatch[1], 10), 3,
      `suites count should be 3; got ${suitesMatch[1]}`);
  }
});

// AC-R77-17: anti-scope diff ⊆ ALLOWED_SET.
test('AC-R77-17: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  let diffOut = '';
  try {
    diffOut = execFileSync(
      'git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'],
      { encoding: 'utf8', cwd: PROJECT_ROOT },
    );
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    diffOut = (e.stdout ?? '') + (e.stderr ?? '');
  }

  const ALLOWED_PATTERN = /^(tools\/detector-envelope\.ts|tools\/detection-curve\.ts|scripts\/detector-tuning-recommendation\.md|coordination\/coverage\/R77-detection-envelope-matrix\.json|coordination\/coverage\/R77-detection-envelope\.md|package\.json|README\.md|test\/q77-detector-envelope\.test\.ts|coordination\/specs\/Q-R77-SPEC\.md|coordination\/specs\/Q-R77-SPEC-AUDIT\.md|coordination\/specs\/Q-R77-EMPIRICAL\.sh|coordination\/NEXT-ROLE\.md|coordination\/MEMORIAL\.md|coordination\/reviews\/REVIEWER-REPORT-R77\.md|coordination\/logs\/ROUND-R77-ROUTING\.md|coordination\/diagnostics\/DIAGNOSTIC-R77-.*\.md)$/;

  const diffFiles = diffOut.split('\n').map(l => l.trim()).filter(Boolean);
  const unauthorized = diffFiles.filter(f => !ALLOWED_PATTERN.test(f));

  assert.strictEqual(unauthorized.length, 0,
    `Unauthorized paths in round-start..HEAD diff:\n${unauthorized.join('\n')}`);
});
