// test/q01-no-at-pin-deltas.test.ts — R01 AC-7
//
// A12 byte-identity preservation: every vendored-at-pin file under engine/
// is byte-identical to its source in deploysignal/ modulo the 5-line
// provenance header block prepended by the vendoring script.
//
// Scope: detectors (11) + family types (5) + core orchestration (5) +
// type files at-pin (8 excl config.ts) + compilation deps (2) = 31 files.
// config.ts is vendored-with-deltas and is EXCLUDED from this check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const DEPLOYSIGNAL_ROOT = '../deploysignal';

const HEADER_LINE_COUNT = 6;

function stripHeader(content: string): string {
  const lines = content.split('\n');
  // Header is a contiguous block of lines starting with "// VENDORED FROM"
  // followed by "// Source:", "// Sync policy:", "// Extract target:",
  // "// DO NOT modify...", then an empty line joining the original file.
  // Strip the first HEADER_LINE_COUNT lines.
  return lines.slice(HEADER_LINE_COUNT).join('\n');
}

const AT_PIN_FILES: Array<{ tessera: string; source: string }> = [
  // Detectors (11)
  { tessera: 'engine/detectors/_linalg.ts',                        source: 'engine/detectors/_linalg.ts' },
  { tessera: 'engine/detectors/betting-e-process.ts',              source: 'engine/detectors/betting-e-process.ts' },
  { tessera: 'engine/detectors/conformal.ts',                      source: 'engine/detectors/conformal.ts' },
  { tessera: 'engine/detectors/family-a-mixture-supermartingale.ts', source: 'engine/detectors/family-a-mixture-supermartingale.ts' },
  { tessera: 'engine/detectors/family-c-betting-e-process.ts',     source: 'engine/detectors/family-c-betting-e-process.ts' },
  { tessera: 'engine/detectors/family-c-rff.ts',                   source: 'engine/detectors/family-c-rff.ts' },
  { tessera: 'engine/detectors/hotelling.ts',                      source: 'engine/detectors/hotelling.ts' },
  { tessera: 'engine/detectors/page-cusum.ts',                     source: 'engine/detectors/page-cusum.ts' },
  { tessera: 'engine/detectors/self-normalized-e-process-fallback.ts', source: 'engine/detectors/self-normalized-e-process-fallback.ts' },
  { tessera: 'engine/detectors/sequential-mmd.ts',                 source: 'engine/detectors/sequential-mmd.ts' },
  { tessera: 'engine/detectors/spectral.ts',                       source: 'engine/detectors/spectral.ts' },
  // Family type files (5)
  { tessera: 'engine/types/families/a.ts',                         source: 'engine/types/families/a.ts' },
  { tessera: 'engine/types/families/b.ts',                         source: 'engine/types/families/b.ts' },
  { tessera: 'engine/types/families/c.ts',                         source: 'engine/types/families/c.ts' },
  { tessera: 'engine/types/families/d.ts',                         source: 'engine/types/families/d.ts' },
  { tessera: 'engine/types/families/e.ts',                         source: 'engine/types/families/e.ts' },
  // Core orchestration primitives (5)
  { tessera: 'engine/core.ts',                                      source: 'engine/core.ts' },
  { tessera: 'engine/per-detector-resampler-mode.ts',              source: 'engine/per-detector-resampler-mode.ts' },
  { tessera: 'engine/topology-overlay.ts',                         source: 'engine/topology-overlay.ts' },
  { tessera: 'engine/signal-classes.ts',                           source: 'engine/signal-classes.ts' },
  { tessera: 'engine/verdict-groups.ts',                           source: 'engine/verdict-groups.ts' },
  // Type files (at-pin; 7 files; config.ts excluded — vendored-with-deltas at R01;
  //                                verdict.ts excluded — vendored-with-deltas at R18 for
  //                                cluster_event_id + TopologyNode.kind + TopologyEdge.relationship)
  { tessera: 'engine/types/primitives.ts',                         source: 'engine/types/primitives.ts' },
  { tessera: 'engine/types/metrics.ts',                            source: 'engine/types/metrics.ts' },
  { tessera: 'engine/types/orchestration.ts',                      source: 'engine/types/orchestration.ts' },
  { tessera: 'engine/types/policy.ts',                             source: 'engine/types/policy.ts' },
  { tessera: 'engine/types/audit.ts',                              source: 'engine/types/audit.ts' },
  { tessera: 'engine/types/self-normalized-fallback.ts',           source: 'engine/types/self-normalized-fallback.ts' },
  { tessera: 'engine/types/index.ts',                              source: 'engine/types/index.ts' },
  // Compilation dependencies (at-pin)
  { tessera: 'engine/types/agent.ts',                              source: 'engine/types/agent.ts' },
  { tessera: 'engine/l0/schema-continuity.ts',                     source: 'engine/l0/schema-continuity.ts' },
  { tessera: 'engine/detectors/_q72-trace.ts',                     source: 'engine/detectors/_q72-trace.ts' },
  { tessera: 'engine/o0/lifecycle-events.ts',                      source: 'engine/o0/lifecycle-events.ts' },
  { tessera: 'engine/o0/reversibility-source.ts',                  source: 'engine/o0/reversibility-source.ts' },
  { tessera: 'engine/o0/reversibility-translator.ts',              source: 'engine/o0/reversibility-translator.ts' },
  // Tessera SLICE 4 (R06) — baseline curation toolchain
  { tessera: 'tools/curate-baseline-pipeline.ts',                  source: 'tools/curate-baseline-pipeline.ts' },
  { tessera: 'tools/calibrators/_shared.ts',                       source: 'tools/calibrators/_shared.ts' },
  { tessera: 'tools/calibrators/family-c.ts',                      source: 'tools/calibrators/family-c.ts' },
];

test('Q1 AC-7 — every vendored-at-pin file is byte-identical to source modulo header', async () => {
  for (const { tessera, source } of AT_PIN_FILES) {
    const tesseraContent = stripHeader(await readFile(tessera, 'utf-8'));
    const sourceContent = await readFile(`${DEPLOYSIGNAL_ROOT}/${source}`, 'utf-8');
    assert.strictEqual(
      tesseraContent,
      sourceContent,
      `A12 byte-identity violation in ${tessera} — delta detected vs deploysignal/${source}`,
    );
  }
});
