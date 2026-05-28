// tools/mmd-sampling-envelope.ts — R05 MMD sampling-interval envelope.
//
// Characterizes how MMD detection probability + median detection latency
// change when MMD is evaluated 1-in-k windows instead of every window.
// Three drift scenarios × 14 magnitudes × 4 sampling intervals × 5 trials
// = 168 cells / 840 trials. Output: coordination/coverage/R05-mmd-
// sampling-envelope.{md,json}.
//
// Design + acceptance: clustersynth coordination/specs/Q-R05-SPEC.md
// (johnpatrickwarren-oss/clustersynth).
//
// Sibling of tools/detector-envelope.ts (R77) — same axis-matrix
// convention, same makeLcg + boxMullerGaussian helpers, same cell
// aggregation shape. Different question: R77 asks "at what magnitude /
// window count does the betting e-process saturate detection?"; R05
// asks "at what magnitude / sampling cadence does MMD lose detection
// power on short-lived drift, and where is α preserved?"

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeUt,
  rbf,
  BASELINE_POOL_SIZE,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/sequential-mmd';

// ── Axes ─────────────────────────────────────────────────────────────
export type DriftScenario = 'persistent_linear' | 'short_bounded' | 'no_drift';
export const DRIFT_SCENARIOS: ReadonlyArray<DriftScenario> = [
  'persistent_linear',
  'short_bounded',
  'no_drift',
];
export const MAGNITUDES: ReadonlyArray<number> = [
  0.00, 0.025, 0.050, 0.075, 0.10, 0.125, 0.15, 0.175, 0.20, 0.225, 0.25, 0.275, 0.30, 0.375,
];
export const SAMPLING_INTERVALS: ReadonlyArray<number> = [1, 5, 10, 100];
export const TRIALS_PER_CELL = 5;
export const WINDOW_COUNT = 200;
export const ALPHA = 0.005;
export const BENCH_P = 11;
export const MMD_POOL = BASELINE_POOL_SIZE; // 500
// Median-heuristic-equivalent bandwidth for p-dimensional unit-variance
// Gaussian baseline: median pairwise distance ≈ sqrt(2p). Empirically
// (see probe in Q-R05-SPEC-AUDIT OQ-R05.D) bandwidth=1.0 collapses the
// kernel to noise on p=11 data; sqrt(2*p) gives u_t responsive to drift
// across the magnitude range.
export const BANDWIDTH = Math.sqrt(2 * 11);
export const SHORT_DRIFT_DURATION = 30;
export const LOG_FACTOR_FLOOR = 1e-12;
export const WINDOW_SIZE_B = 30; // sliding window of past b observations — engine default
export const FIXED_BET_LAMBDA = 0.5; // canonical Shekhar-Ramdas bound; no ONS adaptation in this envelope (Q-R05.3 — primitives only)

export const TOTAL_CELLS = DRIFT_SCENARIOS.length * MAGNITUDES.length * SAMPLING_INTERVALS.length;
export const TOTAL_TRIALS = TOTAL_CELLS * TRIALS_PER_CELL;
const SEED_PREFIX = 0x5A55; // R05 — recorded in matrix JSON

// ── RNG helpers (parallel R77's tools/detector-envelope.ts) ──────────
function makeLcg(seed: number): () => number {
  let state = (seed >>> 0) || 0xDEAD_BEEF;
  return () => {
    state = ((Math.imul(state, 1664525) + 1013904223) >>> 0);
    return state / 0xFFFFFFFF;
  };
}

function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Scenario sampler — observation at window w under scenario ────────
function scenarioObservation(
  scenario: DriftScenario,
  magnitude: number,
  w: number,
  rng: () => number,
): number[] {
  // p-dimensional Gaussian with a drift shift on every component
  // (matches R77's drift = magnitude × (w+1) shape).
  let drift = 0;
  switch (scenario) {
    case 'persistent_linear':
      drift = magnitude * (w + 1);
      break;
    case 'short_bounded':
      drift = w < SHORT_DRIFT_DURATION ? magnitude * (w + 1) : 0;
      break;
    case 'no_drift':
      drift = 0;
      break;
  }
  const vec = new Array<number>(BENCH_P);
  for (let d = 0; d < BENCH_P; d++) {
    vec[d] = boxMullerGaussian(rng) + drift;
  }
  return vec;
}

function generateBaselinePool(rng: () => number): number[][] {
  const pool: number[][] = [];
  for (let i = 0; i < MMD_POOL; i++) {
    const v: number[] = new Array<number>(BENCH_P);
    for (let d = 0; d < BENCH_P; d++) v[d] = boxMullerGaussian(rng);
    pool.push(v);
  }
  return pool;
}

function baselineBaselineSum(pool: number[][], bandwidth: number): number {
  let s = 0;
  const m = pool.length;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i !== j) s += rbf(pool[i]!, pool[j]!, bandwidth);
    }
  }
  return s;
}

interface TrialResult {
  trial_idx: number;
  seed: number;
  detected: boolean;
  detection_window_index: number | null;
}

function runMmdSamplingTrial(
  scenario: DriftScenario,
  magnitude: number,
  sampling_interval: number,
  alpha: number,
  seed: number,
): TrialResult {
  const rng = makeLcg(seed);
  const baseline = generateBaselinePool(rng);
  const bb_sum = baselineBaselineSum(baseline, BANDWIDTH);
  const mmdParams = {
    kernel: 'gaussian_rbf' as const,
    bandwidth: BANDWIDTH,
    window_size: WINDOW_SIZE_B,
    baseline_baseline_sum: bb_sum,
    null_quantile: Number.POSITIVE_INFINITY,
    null_quantile_bootstraps: 0,
    alpha: ALPHA,
  };
  let M = 1;
  const threshold = 1 / alpha;
  let detection_window_index: number | null = null;
  // Sliding buffer of the last WINDOW_SIZE_B observations. Engine's
  // evaluateEMmd uses the same: always reflect the freshest b obs.
  const buffer: number[][] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    const x = scenarioObservation(scenario, magnitude, w, rng);
    buffer.push(x);
    if (buffer.length > WINDOW_SIZE_B) buffer.shift();

    // Evaluate once every `sampling_interval` windows.
    const evalThisTick = (w % sampling_interval) === (sampling_interval - 1);
    if (!evalThisTick) continue;
    if (buffer.length < 2) continue;

    const u_t = computeUt(buffer, baseline, mmdParams);
    // Clip u_t to [-1, 1] (matches engine's BOUNDED_SCALE_B=1 pattern in
    // detectors/family-c-betting-e-process.ts). Bounded factor lets us
    // use λ=0.5 within the Shekhar-Ramdas validity bound. Under H0
    // E[u_t]≈0 → E[1+λ*u_t]≈1; under drift E[u_t]>0 → wealth grows.
    const u_clipped = u_t > 1 ? 1 : (u_t < -1 ? -1 : u_t);
    const wealth_factor = Math.max(1 + FIXED_BET_LAMBDA * u_clipped, LOG_FACTOR_FLOOR);
    M *= wealth_factor;

    if (detection_window_index === null && M >= threshold) {
      detection_window_index = w;
    }
  }
  return {
    trial_idx: 0,
    seed,
    detected: detection_window_index !== null,
    detection_window_index,
  };
}

// ── Cell aggregation ─────────────────────────────────────────────────
interface CellSummary {
  detection_count: number;
  detection_rate: number;
  median_detection_window: number | null;
  mean_detection_window: number | null;
}

function aggregateCell(trials: ReadonlyArray<TrialResult>): CellSummary {
  const detected = trials.filter((t) => t.detected);
  const count = detected.length;
  const windows = detected.map((t) => t.detection_window_index!).sort((a, b) => a - b);
  const median = windows.length > 0
    ? windows[Math.floor(windows.length / 2)]!
    : null;
  const mean = windows.length > 0
    ? windows.reduce((a, b) => a + b, 0) / windows.length
    : null;
  return {
    detection_count: count,
    detection_rate: count / trials.length,
    median_detection_window: median,
    mean_detection_window: mean,
  };
}

// ── Matrix builder ───────────────────────────────────────────────────
interface CellRow {
  scenario: DriftScenario;
  magnitude: number;
  sampling_interval: number;
  summary: CellSummary;
}

interface MatrixOutput {
  meta: {
    drift_scenarios: ReadonlyArray<DriftScenario>;
    magnitudes: ReadonlyArray<number>;
    sampling_intervals: ReadonlyArray<number>;
    trials_per_cell: number;
    window_count: number;
    alpha: number;
    p: number;
    mmd_pool: number;
    bandwidth: number;
    short_drift_duration: number;
    seed_prefix: number;
    total_cells: number;
    total_trials: number;
  };
  cells: CellRow[];
}

function buildMatrix(): MatrixOutput {
  const cells: CellRow[] = [];
  let cellIdx = 0;
  for (const scenario of DRIFT_SCENARIOS) {
    for (const magnitude of MAGNITUDES) {
      for (const sampling_interval of SAMPLING_INTERVALS) {
        const trials: TrialResult[] = [];
        for (let t = 0; t < TRIALS_PER_CELL; t++) {
          const seed = (SEED_PREFIX << 16) ^ (cellIdx << 4) ^ t;
          const r = runMmdSamplingTrial(scenario, magnitude, sampling_interval, ALPHA, seed);
          trials.push({ ...r, trial_idx: t });
        }
        cells.push({
          scenario,
          magnitude,
          sampling_interval,
          summary: aggregateCell(trials),
        });
        cellIdx++;
      }
    }
  }
  return {
    meta: {
      drift_scenarios: DRIFT_SCENARIOS,
      magnitudes: MAGNITUDES,
      sampling_intervals: SAMPLING_INTERVALS,
      trials_per_cell: TRIALS_PER_CELL,
      window_count: WINDOW_COUNT,
      alpha: ALPHA,
      p: BENCH_P,
      mmd_pool: MMD_POOL,
      bandwidth: BANDWIDTH,
      short_drift_duration: SHORT_DRIFT_DURATION,
      seed_prefix: SEED_PREFIX,
      total_cells: TOTAL_CELLS,
      total_trials: TOTAL_TRIALS,
    },
    cells,
  };
}

// ── Rendering ────────────────────────────────────────────────────────
function renderMd(matrix: MatrixOutput): string {
  let md = `# R05 MMD sampling-interval envelope\n\n`;
  md += `**Config:** \`{ window_count: ${WINDOW_COUNT}, α: ${ALPHA}, p: ${BENCH_P}, mmd_pool: ${MMD_POOL}, bandwidth: ${BANDWIDTH}, trials/cell: ${TRIALS_PER_CELL}, short_drift_duration: ${SHORT_DRIFT_DURATION} }\`\n\n`;
  md += `**Axes:** 3 drift scenarios × 14 magnitudes × ${SAMPLING_INTERVALS.length} sampling intervals × ${TRIALS_PER_CELL} trials = ${TOTAL_TRIALS} trials\n\n`;
  md += `Each cell shows \`detection_rate / median_detection_window\` (out of ${TRIALS_PER_CELL}, with median window index over detected trials).\n\n`;

  for (const scenario of DRIFT_SCENARIOS) {
    md += `## Scenario: \`${scenario}\`\n\n`;
    md += `| Magnitude | k=1 | k=5 | k=10 | k=100 |\n|---:|:---:|:---:|:---:|:---:|\n`;
    for (const magnitude of MAGNITUDES) {
      const row: string[] = [magnitude.toFixed(3)];
      for (const k of SAMPLING_INTERVALS) {
        const cell = matrix.cells.find((c) =>
          c.scenario === scenario && c.magnitude === magnitude && c.sampling_interval === k);
        if (!cell) {
          row.push('—');
          continue;
        }
        const r = cell.summary.detection_rate;
        const w = cell.summary.median_detection_window;
        row.push(`${(r * TRIALS_PER_CELL).toFixed(0)}/${TRIALS_PER_CELL} / ${w ?? '—'}`);
      }
      md += `| ${row.join(' | ')} |\n`;
    }
    md += `\n`;
  }

  md += `## Reading the matrix\n\n`;
  md += `- **\`no_drift\`** scenario should show ~zero detections regardless of sampling — verifies α is preserved under sampling (anytime-valid e-process property).\n`;
  md += `- **\`persistent_linear\`** scenario at high magnitude should saturate at every sampling interval, with median window scaling roughly linearly in \`k\` — verifies the "k× slower detection" claim from clustersynth Q-R05-SPEC § Spec.\n`;
  md += `- **\`short_bounded\`** scenario at low magnitude should fall off as \`k\` increases — verifies the "miss it entirely" claim. Drift episode is the first ${SHORT_DRIFT_DURATION} windows only; at k=${SAMPLING_INTERVALS[SAMPLING_INTERVALS.length - 1]} the detector evaluates ~${Math.floor(SHORT_DRIFT_DURATION / SAMPLING_INTERVALS[SAMPLING_INTERVALS.length - 1]!)} time(s) during the drift window.\n`;
  return md;
}

function serializeJson(matrix: MatrixOutput): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

// ── Main ─────────────────────────────────────────────────────────────
const outDir = join(__dirname, '..', 'coordination', 'coverage');
mkdirSync(outDir, { recursive: true });
const startMs = Date.now();
const matrix = buildMatrix();
const elapsedMs = Date.now() - startMs;
writeFileSync(join(outDir, 'R05-mmd-sampling-envelope.md'), renderMd(matrix));
writeFileSync(join(outDir, 'R05-mmd-sampling-envelope.json'), serializeJson(matrix));
process.stderr.write(
  `R05 envelope built: ${TOTAL_CELLS} cells / ${TOTAL_TRIALS} trials in ${elapsedMs} ms\n`,
);
process.stderr.write(`  ${outDir}/R05-mmd-sampling-envelope.md\n  ${outDir}/R05-mmd-sampling-envelope.json\n`);
