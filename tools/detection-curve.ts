// tools/detection-curve.ts — Tessera R77 ASCII detection-curve renderer.
//
// Renders an ASCII detection-rate-vs-magnitude curve from a
// DetectionEnvelopeMatrix at a fixed (α, window_count) slice, overlaying
// both families. Imported by tools/detector-envelope.ts for inclusion in
// the matrix markdown summary; also a standalone CLI for ad-hoc operator
// exploration.
//
// Anti-scope: no engine imports; no new dependencies. Tessera-original code.

import * as fs from 'node:fs';
import * as path from 'node:path';

// Local copy of the relevant matrix-shape types (avoids cyclic import).
interface CellRowParams {
  drift_magnitude: number;
  window_count: number;
  alpha: number;
  family: 'family-a' | 'family-c';
}
interface CellRowSummary {
  detection_count: number;
  detection_rate: number;
  detection_window_median: number | null;
  detection_window_p95: number | null;
}
interface CellRow {
  cell_idx: number;
  params: CellRowParams;
  summary: CellRowSummary;
  trials: ReadonlyArray<{ trial_idx: number; seed: number; detected: boolean; detection_window_index: number | null }>;
}
export interface DetectionEnvelopeMatrixLike {
  schema_version: string;
  parameter_grid: {
    magnitudes: ReadonlyArray<number>;
    window_counts: ReadonlyArray<number>;
    alphas: ReadonlyArray<number>;
    families: ReadonlyArray<'family-a' | 'family-c'>;
    trials_per_cell: number;
  };
  cells: ReadonlyArray<CellRow>;
}

// ── ASCII renderer ──
// Renders a header row + one row per family showing detection_count as a
// 5-char bar: '#' = detected trial, '.' = missed trial.
export function renderAsciiCurve(
  matrix: DetectionEnvelopeMatrixLike,
  alpha: number,
  window_count: number,
): string {
  const mags = matrix.parameter_grid.magnitudes;
  const lines: string[] = [];
  lines.push(`mag      | ` + mags.map(m => m.toFixed(3)).join(' '));
  lines.push(`---------|` + '------'.repeat(mags.length));
  for (const family of matrix.parameter_grid.families) {
    const cells = mags.map(mag => {
      const c = matrix.cells.find(
        x =>
          x.params.drift_magnitude === mag &&
          x.params.window_count === window_count &&
          x.params.alpha === alpha &&
          x.params.family === family,
      );
      if (!c) return '  ?  ';
      const n = c.summary.detection_count;
      return '#'.repeat(n) + '.'.repeat(5 - n);
    });
    const label = family === 'family-a' ? 'A:rate ' : 'C:rate ';
    lines.push(label + ' | ' + cells.join(' '));
  }
  return lines.join('\n');
}

// ── CLI entry point (optional convenience) ──
function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    process.stderr.write('Usage: node tools/detection-curve.js <matrix.json> [alpha] [window_count]\n');
    process.exit(2);
  }
  const matrixPath = path.resolve(argv[0]);
  const alpha = argv[1] !== undefined ? parseFloat(argv[1]) : 0.005;
  const window_count = argv[2] !== undefined ? parseInt(argv[2], 10) : 200;
  const raw = fs.readFileSync(matrixPath, 'utf8');
  const matrix: DetectionEnvelopeMatrixLike = JSON.parse(raw);
  process.stdout.write(renderAsciiCurve(matrix, alpha, window_count) + '\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}
