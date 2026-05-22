// test/q01-vendoring-coverage.test.ts — R01 AC-1, AC-2, AC-4, AC-5
//
// Verifies: every vendored file has the required provenance header (AC-1, AC-2, AC-4)
// and the VENDORING-MANIFEST.md enumerates every vendored file (AC-5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const EXPECTED_SHA = '5a72371';
const HEADER_RE = /\/\/ VENDORED FROM DeploySignal main@\w+ — \d{4}-\d{2}-\d{2}/;
const SHA_RE = new RegExp(`// VENDORED FROM DeploySignal main@${EXPECTED_SHA}`);

const VENDORED_AT_PIN_PATHS: string[] = [
  // AC-1: 11 detector files (excluding _q72-trace.ts per SAS-7)
  'engine/detectors/_linalg.ts',
  'engine/detectors/betting-e-process.ts',
  'engine/detectors/conformal.ts',
  'engine/detectors/family-a-mixture-supermartingale.ts',
  'engine/detectors/family-c-betting-e-process.ts',
  'engine/detectors/family-c-rff.ts',
  'engine/detectors/hotelling.ts',
  'engine/detectors/page-cusum.ts',
  'engine/detectors/self-normalized-e-process-fallback.ts',
  'engine/detectors/sequential-mmd.ts',
  'engine/detectors/spectral.ts',
  // AC-2: 5 family type files
  'engine/types/families/a.ts',
  'engine/types/families/b.ts',
  'engine/types/families/c.ts',
  'engine/types/families/d.ts',
  'engine/types/families/e.ts',
  // AC-4: 5 core orchestration primitives
  'engine/core.ts',
  'engine/per-detector-resampler-mode.ts',
  'engine/topology-overlay.ts',
  'engine/signal-classes.ts',
  'engine/verdict-groups.ts',
  // AC-4: type files (7 vendored-at-pin; config.ts is vendored-with-deltas)
  'engine/types/verdict.ts',
  'engine/types/primitives.ts',
  'engine/types/metrics.ts',
  'engine/types/orchestration.ts',
  'engine/types/policy.ts',
  'engine/types/audit.ts',
  'engine/types/self-normalized-fallback.ts',
  'engine/types/index.ts',
  // Compilation dependencies (at-pin; not behavioral SLICE 1 scope)
  'engine/types/agent.ts',
  'engine/l0/schema-continuity.ts',
  'engine/detectors/_q72-trace.ts',
  'engine/o0/lifecycle-events.ts',
  'engine/o0/reversibility-source.ts',
  'engine/o0/reversibility-translator.ts',
  // config.ts vendored-with-deltas also gets a header
  'engine/types/config.ts',
  // Tessera SLICE 4 (R06) — baseline curation toolchain
  'tools/curate-baseline-pipeline.ts',
  'tools/calibrators/_shared.ts',
  'tools/calibrators/family-c.ts',
];

// ── Q1 AC-1/AC-2/AC-4 (header format) removed R95 2026-05-22 ─────────────────
// Defunct post-R94 engine extraction: engine/*.ts source files removed from
// Tessera worktree; readFile(engine/...) fails with ENOENT. Category A.

// ── Q1 AC-1/AC-2/AC-4 (pinned SHA) removed R95 2026-05-22 ───────────────────
// Defunct post-R94 engine extraction: engine/*.ts source files removed from
// Tessera worktree; readFile(engine/...) fails with ENOENT. Category A.

test('Q1 AC-5 — VENDORING-MANIFEST.md enumerates all vendored files with sync policy', async () => {
  const manifest = await readFile('coordination/VENDORING-MANIFEST.md', 'utf-8');
  const AT_PIN_ENTRIES = VENDORED_AT_PIN_PATHS.filter(p => p !== 'engine/types/config.ts');
  for (const p of AT_PIN_ENTRIES) {
    assert.ok(
      manifest.includes(p) && manifest.includes('vendored-at-pin'),
      `manifest missing entry for ${p} with vendored-at-pin policy`,
    );
  }
  // config.ts is vendored-with-deltas
  assert.ok(
    manifest.includes('engine/types/config.ts') && manifest.includes('vendored-with-deltas'),
    'manifest missing config.ts entry with vendored-with-deltas policy',
  );
  // Every row must include the pinned SHA
  const rows = manifest.split('\n').filter(l => l.startsWith('|') && (l.includes('| engine/') || l.includes('| tools/')));
  for (const row of rows) {
    assert.ok(row.includes(EXPECTED_SHA), `manifest row missing SHA: ${row}`);
  }
});
