// tools/detector-envelope.ts — Tessera R77 detection-envelope sweep runner.
//
// Characterizes the detection probability of the per-shard Family A betting
// e-process (and an R77-defined Family C ONS comparison; see header note
// below) across drift magnitude × window count × α threshold × detector
// family. Deterministic (seeded LCG); idempotent.
//
// Family C interpretation for R77:
//   engine/detectors/family-c-betting-e-process.ts is canonically a kernel-MMD
//   detector. Applying the FULL evaluateFamilyCBettingEProcess to a 1D drift
//   signal requires synthetic CompiledConfig + baseline cells (out of R77
//   anti-scope). R77 uses the exported `onsUpdate` primitive to drive a
//   pure-ONS betting strategy on the same bounded-z input as Family A, giving
//   a meaningful theoretical comparison of (A: GRAPA/ONS-fallback dual bet,
//   M_t multiplicative wealth) vs (C: ONS-only bet, log_S_t additive wealth).
//   See Q-R77-SPEC.md § 1.3 sub-§ Family C interpretation.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.

// ── Engine imports (.js extension; matches R72 convention) ──
import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import {
  freshFamilyCBettingEProcessState, onsUpdate,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/family-c-betting-e-process';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── ASCII curve renderer (one-way import; no cyclic) ──
import { renderAsciiCurve } from './detection-curve.js';

// ── Public exported types ──
export type DetectorFamily = 'family-a' | 'family-c';
export const DETECTOR_FAMILIES: ReadonlyArray<DetectorFamily> = ['family-a', 'family-c'];

export interface EnvelopeOpts { readonly _reserved?: never; }
export interface EnvelopeResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_cells: 504;
  total_trials: 2520;
}

// ── Parameter grid (exact literals; § 1.2 spec) ──
export const MAGNITUDES: ReadonlyArray<number> = [
  0.050, 0.075, 0.100, 0.125, 0.150, 0.175, 0.200,
  0.225, 0.250, 0.275, 0.300, 0.325, 0.350, 0.375,
];                                    // 14 magnitudes
export const WINDOW_COUNTS: ReadonlyArray<number> = [30, 50, 75, 100, 150, 200];  // 6 windows
export const ALPHAS: ReadonlyArray<number> = [0.001, 0.005, 0.010];               // 3 α thresholds
export const TRIALS_PER_CELL = 5;
export const TOTAL_CELLS = 504;   // 14 × 6 × 3 × 2
export const TOTAL_TRIALS = 2520; // 504 × 5
const SCENARIO_SEED_PREFIX = 0x77E11; // 491025 decimal — recorded in matrix JSON

// ── LCG + Gaussian primitives (re-implemented; not imported from tools/coverage-saturation.ts) ──
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Internal types ──
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

interface CellRow {
  cell_idx: number;
  params: { drift_magnitude: number; window_count: number; alpha: number; family: DetectorFamily };
  summary: CellSummary;
  trials: ReadonlyArray<TrialResult>;
}

interface DetectionEnvelopeMatrix {
  schema_version: 'tessera-detection-envelope-v1';
  generated_with_seed_prefix: number;
  parameter_grid: {
    magnitudes: ReadonlyArray<number>;
    window_counts: ReadonlyArray<number>;
    alphas: ReadonlyArray<number>;
    families: ReadonlyArray<DetectorFamily>;
    trials_per_cell: number;
  };
  cells: ReadonlyArray<CellRow>;
}

// ── Family A constants ──
// BOUNDED_SCALE_B = 3 per engine/detectors/betting-e-process.ts:61 (σ=1 ⇒ denom=3).
// Used by updateBettingState internally; baselineMean=0, sigmaSquared=1 convention.

// ── Family C constants ──
const LAMBDA_MAX_FAMILY_C = 0.5;  // canonical Shekhar-Ramdas default; engine/detectors/family-c-betting-e-process.ts:91
const BOUNDED_SCALE_B = 3;        // mirrors engine/detectors/betting-e-process.ts:61
const LOG_FACTOR_FLOOR = 1e-12;   // mirrors engine/detectors/family-c-betting-e-process.ts:82

// ── Per-trial runner (Family A) ──
function runFamilyATrial(
  magnitude: number, window_count: number, alpha: number, seed: number,
): TrialResult {
  const rng = makeLcg(seed);
  const state = freshBettingState();
  const threshold = 1 / alpha;
  let detection_window_index: number | null = null;
  for (let w = 0; w < window_count; w++) {
    const x = boxMullerGaussian(rng) + magnitude * (w + 1);
    updateBettingState(state, x, 0, 1, alpha);
    if (detection_window_index === null && state.M >= threshold) {
      detection_window_index = w;
    }
  }
  return {
    trial_idx: 0,  // assigned by caller
    seed,
    detected: detection_window_index !== null,
    detection_window_index,
  };
}

// ── Per-trial runner (Family C; R77 interpretation per spec § 1.3) ──
function runFamilyCTrial(
  magnitude: number, window_count: number, alpha: number, seed: number,
): TrialResult {
  const rng = makeLcg(seed);
  const state = freshFamilyCBettingEProcessState(1);
  const log_threshold = -Math.log(alpha);
  let detection_window_index: number | null = null;
  for (let w = 0; w < window_count; w++) {
    const x = boxMullerGaussian(rng) + magnitude * (w + 1);
    const z_raw = x / BOUNDED_SCALE_B;
    const z = z_raw > 1 ? 1 : (z_raw < -1 ? -1 : z_raw);
    const F_t = z;
    const wealth_factor = 1 + state.ons_lambda * F_t;
    const log_factor = Math.log(Math.max(wealth_factor, LOG_FACTOR_FLOOR));
    state.log_S_t += log_factor;
    onsUpdate(state, F_t, LAMBDA_MAX_FAMILY_C);
    if (detection_window_index === null && state.log_S_t >= log_threshold) {
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

// ── Cell aggregation ──
function aggregateCell(trials: ReadonlyArray<TrialResult>): CellSummary {
  const detected_trials = trials.filter(t => t.detected);
  const detection_count = detected_trials.length;
  const detection_rate = detection_count / TRIALS_PER_CELL;
  const detection_windows = detected_trials
    .map(t => t.detection_window_index!)
    .sort((a, b) => a - b);
  const median = detection_windows.length > 0
    ? detection_windows[Math.floor(detection_windows.length / 2)]
    : null;
  const p95_idx = detection_windows.length > 0
    ? Math.min(detection_windows.length - 1, Math.floor(0.95 * (detection_windows.length - 1)))
    : -1;
  const p95 = p95_idx >= 0 ? detection_windows[p95_idx] : null;
  return {
    detection_count,
    detection_rate,
    detection_window_median: median,
    detection_window_p95: p95,
  };
}

// ── Matrix builder ──
function buildEnvelopeMatrix(): DetectionEnvelopeMatrix {
  const cells: CellRow[] = [];
  let cell_idx = 0;
  for (let mi = 0; mi < MAGNITUDES.length; mi++) {
    for (let wi = 0; wi < WINDOW_COUNTS.length; wi++) {
      for (let ai = 0; ai < ALPHAS.length; ai++) {
        for (let fi = 0; fi < DETECTOR_FAMILIES.length; fi++) {
          const magnitude = MAGNITUDES[mi];
          const window_count = WINDOW_COUNTS[wi];
          const alpha = ALPHAS[ai];
          const family = DETECTOR_FAMILIES[fi];
          const trials: TrialResult[] = [];
          for (let ti = 0; ti < TRIALS_PER_CELL; ti++) {
            const seed = (SCENARIO_SEED_PREFIX ^ (cell_idx * TRIALS_PER_CELL + ti)) >>> 0;
            const t = family === 'family-a'
              ? runFamilyATrial(magnitude, window_count, alpha, seed)
              : runFamilyCTrial(magnitude, window_count, alpha, seed);
            trials.push({ ...t, trial_idx: ti });
          }
          const summary = aggregateCell(trials);
          cells.push({
            cell_idx,
            params: { drift_magnitude: magnitude, window_count, alpha, family },
            summary,
            trials,
          });
          cell_idx += 1;
        }
      }
    }
  }
  return {
    schema_version: 'tessera-detection-envelope-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    parameter_grid: {
      magnitudes: MAGNITUDES,
      window_counts: WINDOW_COUNTS,
      alphas: ALPHAS,
      families: DETECTOR_FAMILIES,
      trials_per_cell: TRIALS_PER_CELL,
    },
    cells,
  };
}

// ── Markdown renderer ──
function renderMatrixMd(matrix: DetectionEnvelopeMatrix): string {
  const lines: string[] = [];
  lines.push('# Tessera R77 — detection envelope matrix');
  lines.push('');
  lines.push('Generated by `tools/detector-envelope.ts`; deterministic; idempotent. Full machine-readable data: `R77-detection-envelope-matrix.json`.');
  lines.push('');
  lines.push(`Parameter grid: ${matrix.parameter_grid.magnitudes.length} magnitudes × ${matrix.parameter_grid.window_counts.length} window counts × ${matrix.parameter_grid.alphas.length} α thresholds × ${matrix.parameter_grid.families.length} families × ${matrix.parameter_grid.trials_per_cell} trials = ${matrix.cells.length} cells.`);
  lines.push('');

  // For each (family, α), render a magnitude × window heatmap.
  for (const family of matrix.parameter_grid.families) {
    for (const alpha of matrix.parameter_grid.alphas) {
      lines.push(`## ${family} — α = ${alpha}`);
      lines.push('');
      lines.push('Detection rate (M/5 trials). Columns: window_count. Rows: drift_magnitude.');
      lines.push('');
      const header = ['mag \\ W', ...matrix.parameter_grid.window_counts.map(w => String(w))].join(' | ');
      lines.push('| ' + header + ' |');
      lines.push('|' + '---|'.repeat(matrix.parameter_grid.window_counts.length + 1));
      for (const mag of matrix.parameter_grid.magnitudes) {
        const row = [mag.toFixed(3)];
        for (const wc of matrix.parameter_grid.window_counts) {
          const cell = matrix.cells.find(c =>
            c.params.drift_magnitude === mag &&
            c.params.window_count === wc &&
            c.params.alpha === alpha &&
            c.params.family === family,
          );
          if (!cell) throw new Error(`missing cell: mag=${mag} wc=${wc} α=${alpha} family=${family}`);
          row.push(`${cell.summary.detection_count}/5`);
        }
        lines.push('| ' + row.join(' | ') + ' |');
      }
      lines.push('');
    }
  }

  // ASCII curves section — one block per α at window_count=200, both families overlaid.
  lines.push('## Detection curves (rate vs magnitude; window_count = 200; rendered via `tools/detection-curve.ts`)');
  lines.push('');
  for (const alpha of matrix.parameter_grid.alphas) {
    lines.push(`### α = ${alpha}, window_count = 200`);
    lines.push('');
    lines.push('```');
    lines.push(renderAsciiCurve(matrix, alpha, 200));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Method');
  lines.push('');
  lines.push('Each cell runs 5 deterministic trials seeded by `(SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx))`. Family A uses `engine/detectors/betting-e-process.ts:updateBettingState`; Family C uses `engine/detectors/family-c-betting-e-process.ts:onsUpdate` per R77 Family C interpretation (see Q-R77-SPEC.md § 1.3). No engine modifications; no new dependencies. Re-running `pnpm detector-envelope` produces byte-identical output.');
  lines.push('');

  return lines.join('\n');
}

// ── Serialization ──
function serializeJson(matrix: DetectionEnvelopeMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

// ── Public entry point ──
export function runDetectionEnvelope(_opts?: EnvelopeOpts): EnvelopeResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coverage-matrices');
  fs.mkdirSync(coverageDir, { recursive: true });
  const matrix = buildEnvelopeMatrix();
  const jsonStr = serializeJson(matrix);
  const mdStr = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R77-detection-envelope-matrix.json');
  const mdPath = path.join(coverageDir, 'R77-detection-envelope.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return {
    matrix_json_path: jsonPath,
    matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_cells: 504,
    total_trials: 2520,
  };
}

// ── CLI guard (matches tools/coverage-saturation.ts:673 convention) ──
if (require.main === module) {
  const result = runDetectionEnvelope();
  process.stdout.write(
    `Built detection envelope matrix: ${result.total_cells} cells, ${result.total_trials} trials.\n` +
    `JSON: ${path.relative(process.cwd(), result.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), result.matrix_md_path)}\n`,
  );
  process.exit(0);
}
