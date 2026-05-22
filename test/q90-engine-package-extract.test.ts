// q90-engine-package-extract.test.ts — R90 ACs: engine package boundary,
// types-barrel decoupling, build artifact, backwards-compat smoke.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUND_START_SHA = '65edb85';

const ALLOWED_REGEX = /^(engine\/package\.json|engine\/README\.md|tsconfig\.json|package\.json|pnpm-workspace\.yaml|\.gitignore|coordination\/VENDORING-MANIFEST\.md|test\/q90-engine-package-extract\.test\.ts|coordination\/specs\/Q-R90-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination\/reviews\/REVIEWER-REPORT-R90\.md|coordination\/MEMORIAL\.md|coordination\/NEXT-ROLE\.md|coordination\/logs\/ROUND-R90-.*)$/;

// ── AC-R90-1 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: ENGINE_DIR (engine/) removed from Tessera
// worktree; readJson(engine/package.json) fails with ENOENT. Category B.

// ── AC-R90-2 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/package.json removed from Tessera
// worktree; readJson fails with ENOENT. Category B.

// ── AC-R90-3 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/package.json removed from Tessera
// worktree; readJson fails with ENOENT. Category B.

// ── AC-R90-4 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/package.json removed from Tessera
// worktree; readJson fails with ENOENT. Category B.

// ── AC-R90-5 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/package.json removed from Tessera
// worktree; readJson fails with ENOENT. Category B.

// ── AC-R90-6 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: root tsconfig.json outDir is no longer
// 'engine/dist' (R94 changed build layout); check verifies pre-R94 state. Category B.

// ── AC-R90-7 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/dist sentinel files removed from
// Tessera worktree; existsSync fails. Category B.

// ── AC-R90-8 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: pnpm pack from local engine/ fails;
// ENGINE_DIR no longer exists. Category B.

// ── AC-R90-9 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: tarball from local engine/ no longer
// produced; ENGINE_DIR removed. Category B.

// ── AC-R90-10 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/README.md removed from Tessera
// worktree; readFileSync fails with ENOENT. Category B.

// ── AC-R90-11 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: VENDORING-MANIFEST.md header R90 note
// predates R95; check verifies pre-R95 state (R90 regex match). Category B.
// NOTE: AC-R90-11 now PASSES after R95 adds new header note — KEEP would flip
// GREEN incorrectly; deletion is correct disposition.

// ── AC-R90-12 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: root package.json scripts['pack:engine']
// references local engine/ directory removed from Tessera worktree. Category B.

test('AC-R90-13: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const diff = execFileSync('git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const paths = diff.split('\n').filter(p => p.length > 0);
  const violators = paths.filter(p => !ALLOWED_REGEX.test(p));
  assert.deepStrictEqual(violators, [], `anti-scope: paths outside ALLOWED_SET: ${violators.join(', ')}`);
});

// ── AC-R90-14 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: all 10 engine sentinel files removed from
// Tessera worktree; readFileSync + git-show fail with ENOENT. Category B.
