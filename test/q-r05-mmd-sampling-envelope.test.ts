// q-r05-mmd-sampling-envelope.test.ts — verifies the load-bearing properties
// of the R05 MMD sampling envelope as committed at
// coordination/coverage/R05-mmd-sampling-envelope.json.
//
// Properties asserted (per clustersynth Q-R05-SPEC § AC-R05-3..5):
//   1. α preserved under sampling: no_drift scenario shows detection_rate ≤ 2/5
//      at every (magnitude, sampling_interval) cell (5 × α = 0.025 expected;
//      2/5 false-alarm noise budget).
//   2. Persistent-drift detection holds at k ≤ 10 for high magnitudes; k=100
//      may not saturate due to insufficient wealth accumulation (~2 evaluations
//      × bounded wealth factor; pre-recorded in Q-R05-SPEC § V2).
//   3. Short-bounded drift detection falls off monotonically as sampling
//      interval increases (within 5-trial granularity).

import { test } from 'node:test';
import { strict as a } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MATRIX_PATH = join(__dirname, '..', 'coverage-matrices', 'R05-mmd-sampling-envelope.json');

interface Cell {
  scenario: 'persistent_linear' | 'short_bounded' | 'no_drift';
  magnitude: number;
  sampling_interval: number;
  summary: {
    detection_count: number;
    detection_rate: number;
    median_detection_window: number | null;
    mean_detection_window: number | null;
  };
}

interface Matrix {
  meta: { trials_per_cell: number; alpha: number };
  cells: Cell[];
}

function loadMatrix(): Matrix | null {
  if (!existsSync(MATRIX_PATH)) return null;
  return JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));
}

function findCell(m: Matrix, scenario: Cell['scenario'], magnitude: number, sampling_interval: number): Cell | undefined {
  return m.cells.find((c) =>
    c.scenario === scenario && c.magnitude === magnitude && c.sampling_interval === sampling_interval);
}

test('AC-R05-3 — α preserved under sampling (no_drift scenario)', { skip: !existsSync(MATRIX_PATH) }, () => {
  const m = loadMatrix()!;
  const noDriftCells = m.cells.filter((c) => c.scenario === 'no_drift');
  a.ok(noDriftCells.length === 14 * 4, `expected 14×4=56 no_drift cells, got ${noDriftCells.length}`);
  for (const c of noDriftCells) {
    a.ok(c.summary.detection_count <= 2,
      `no_drift cell (magnitude=${c.magnitude}, k=${c.sampling_interval}) detected ${c.summary.detection_count}/${m.meta.trials_per_cell}; α-preservation violation`);
  }
});

test('AC-R05-4 — persistent drift saturates at k ≤ 10 for magnitudes ≥ 0.05', { skip: !existsSync(MATRIX_PATH) }, () => {
  const m = loadMatrix()!;
  for (const magnitude of [0.05, 0.10, 0.20, 0.375]) {
    for (const k of [1, 5, 10]) {
      const c = findCell(m, 'persistent_linear', magnitude, k);
      a.ok(c, `missing cell (persistent_linear, ${magnitude}, ${k})`);
      a.equal(c!.summary.detection_count, m.meta.trials_per_cell,
        `persistent_linear (magnitude=${magnitude}, k=${k}) should saturate; got ${c!.summary.detection_count}/${m.meta.trials_per_cell}`);
    }
  }
});

test('AC-R05-4 carve-out — k=100 may not saturate (V2 pre-prediction)', { skip: !existsSync(MATRIX_PATH) }, () => {
  // The Q-R05-SPEC-AUDIT V2 variant noted: at k=100 across 200 windows, the
  // e-process has only 2 evaluations; wealth factor bounded at 1.5; max
  // attainable M = 2.25 ≪ 1/α=200. So detection at k=100 is structurally
  // impossible for the bounded wealth factor used by this envelope.
  const m = loadMatrix()!;
  const c = findCell(m, 'persistent_linear', 0.375, 100);
  a.ok(c);
  a.equal(c!.summary.detection_count, 0,
    `k=100 detection at magnitude=0.375 is structurally impossible at this lambda; if it fires, the envelope semantic is wrong`);
});

test('AC-R05-5 — short-bounded drift detection falls off as k increases', { skip: !existsSync(MATRIX_PATH) }, () => {
  const m = loadMatrix()!;
  // For each magnitude ≥ 0.125 (where k=1 actually detects), assert that
  // detection_rate is monotonically non-increasing as k increases.
  for (const magnitude of [0.125, 0.150, 0.175, 0.20, 0.25, 0.375]) {
    let prevRate = Number.POSITIVE_INFINITY;
    for (const k of [1, 5, 10, 100]) {
      const c = findCell(m, 'short_bounded', magnitude, k);
      a.ok(c, `missing cell (short_bounded, ${magnitude}, ${k})`);
      a.ok(c!.summary.detection_rate <= prevRate,
        `short_bounded monotonicity violated at magnitude=${magnitude}: k=${k} rate=${c!.summary.detection_rate} > prev=${prevRate}`);
      prevRate = c!.summary.detection_rate;
    }
  }
});

test('AC-R05-2 — matrix has 168 cells with the right shape', { skip: !existsSync(MATRIX_PATH) }, () => {
  const m = loadMatrix()!;
  a.equal(m.cells.length, 3 * 14 * 4);
  for (const c of m.cells) {
    a.equal(typeof c.summary.detection_count, 'number');
    a.equal(typeof c.summary.detection_rate, 'number');
    a.ok(c.summary.median_detection_window === null || typeof c.summary.median_detection_window === 'number');
    a.ok(c.summary.mean_detection_window === null || typeof c.summary.mean_detection_window === 'number');
  }
});
