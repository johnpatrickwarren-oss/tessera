// tools/coverage-saturation.ts — Tessera R72 coverage saturation runner.
//
// Generates the 6×20 coverage matrix by running the real Tessera engine
// across 120 parameter variations. Deterministic (seeded LCG); idempotent.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.
//
// Tactical deviation vs spec § 3.1 TYPE3_EVENT_CLASSES:
//   Spec prescribes ['firmware_push', 'deploy', 'config_change', 'rollback'] but
//   'deploy' and 'rollback' are not valid DeployEventPayload.event_class values
//   (engine contract: 'firmware_push'|'model_redeploy'|'env_change'|'config_change'|
//   'capacity_change'). Additionally, mapEventClassToKind() throws at runtime for
//   unknown values (exhaustive switch). Replaced with:
//     'deploy'   → 'model_redeploy'
//     'rollback' → 'env_change'
//   Detection behavior is identical — freeze hook activates regardless of
//   which valid event_class is passed. (TACTICAL AUTONOMY: "Spec type triggers
//   a typecheck error at the consumer → cast at consumer or widen at producer.")
//
// ── Module layout (god-file split; behavior-preserving) ──
//   _coverage-saturation-types.ts      — public + internal types, constants,
//                                         variation grids, numeric primitives,
//                                         topology fixtures.
//   _coverage-saturation-variations.ts — the six per-type variation runners.
//   _coverage-saturation-matrix.ts     — aggregation + JSON/Markdown serialization.
//   coverage-saturation.ts (this file) — public entry point + CLI guard;
//                                         re-exports the stable public surface.

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildCoverageMatrix, serializeMatrixJson, renderMatrixMd } from './_coverage-saturation-matrix.js';

// ── Public surface (re-exported; importable from the same path as before) ──
export {
  FAILURE_TYPE_NAMES,
  type FailureTypeName,
  type SaturationResult,
  type SaturationOpts,
} from './_coverage-saturation-types.js';

import type { SaturationResult, SaturationOpts } from './_coverage-saturation-types.js';

// ── Public entry point ──
export function runSaturationCoverage(_opts?: SaturationOpts): SaturationResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coverage-matrices');
  fs.mkdirSync(coverageDir, { recursive: true });
  const matrix = buildCoverageMatrix();
  const jsonStr = serializeMatrixJson(matrix);
  const mdStr = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R72-saturation-matrix.json');
  const mdPath = path.join(coverageDir, 'R72-saturation-matrix.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return {
    matrix_json_path: jsonPath,
    matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_variations: 120,
    total_detected: matrix.totals.total_detected,
    total_attribution_correct: matrix.totals.total_attribution_correct,
  };
}

// ── CLI guard (matches tools/build-canned-demos.ts:1314 convention) ──
if (require.main === module) {
  const result = runSaturationCoverage();
  process.stdout.write(
    `Built coverage matrix: ${result.total_detected} / ${result.total_variations} detected ` +
    `(${result.total_attribution_correct} attribution-correct).\n` +
    `JSON: ${path.relative(process.cwd(), result.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), result.matrix_md_path)}\n`,
  );
  process.exit(0);
}
