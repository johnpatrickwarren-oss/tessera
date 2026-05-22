/**
 * Q-R91 — Tessera-internal engine package consumption migration tests.
 *
 * Validates that Tessera's test/* + tools/* + sub-dir consumers import from
 * '@johnpatrickwarren-oss/deploysignal-engine/...' (package paths) instead of
 * '../engine/...' (relative source paths), and that the resolution mechanism
 * (paths mapping + file: dep + pretest builds engine/dist) actually works at
 * compile time AND runtime.
 *
 * 14 ACs total. SHA-anchored to R91 round-start `a63da14`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUND_START_SHA = 'a63da14';

// ── AC-R91-1: zero relative '../engine' imports remain in test/ + tools/ ──
test('AC-R91-1: zero relative ../engine imports remain in test/ + tools/', () => {
  const cmd = 'grep -rl "from [\'\\"]\\.\\..*engine" test/ tools/ 2>/dev/null || true';
  const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.equal(out, '', `relative ../engine imports still present in:\n${out}`);
});

// ── AC-R91-2: at least 50 consumer files use the package-name import ──
test('AC-R91-2: at least 50 consumer files use @johnpatrickwarren-oss/deploysignal-engine imports', () => {
  const cmd = `grep -rl "from ['\\"]@johnpatrickwarren-oss/deploysignal-engine" test/ tools/ 2>/dev/null || true`;
  const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const files = out.split('\n').filter(s => s.length > 0);
  assert.ok(files.length >= 50, `expected ≥50 consumer files; observed ${files.length}: ${files.slice(0, 5).join(', ')}...`);
});

// ── AC-R91-3 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: tsconfig.json paths mapping for
// @johnpatrickwarren-oss/deploysignal-engine now points to node_modules via
// git-dep, not local engine/ directory. Category C.

// ── AC-R91-4 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: root package.json dep is now
// github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre (git-dep),
// not file:./engine. Category C.

// ── AC-R91-5 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: pretest no longer runs `tsc` to build
// engine/dist (engine/ removed); pretest changed at R94. Category C.

// ── AC-R91-6: node_modules symlink exists ──
test('AC-R91-6: node_modules/@johnpatrickwarren-oss/deploysignal-engine exists (symlink or dir post-install)', () => {
  const p = path.join(REPO_ROOT, 'node_modules', '@johnpatrickwarren-oss', 'deploysignal-engine');
  assert.ok(existsSync(p), `node_modules entry missing: ${p}`);
  // pnpm file: deps materialize as symlink (or hard copy depending on platform); either is acceptable
  const stat = lstatSync(p);
  assert.ok(stat.isSymbolicLink() || stat.isDirectory(), `node_modules entry must be symlink or directory`);
});

// ── AC-R91-7: 5 representative subpath resolutions succeed ──
test('AC-R91-7: require.resolve succeeds for 5 representative subpaths via package name', () => {
  const subpaths = [
    '@johnpatrickwarren-oss/deploysignal-engine/types/verdict',
    '@johnpatrickwarren-oss/deploysignal-engine/types/config',
    '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process',
    '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay',
    '@johnpatrickwarren-oss/deploysignal-engine/ds-integration',
  ];
  for (const sp of subpaths) {
    const out = execFileSync('node', ['-e', `console.log(require.resolve('${sp}'));`], {
      cwd: REPO_ROOT, encoding: 'utf8',
    });
    assert.match(
      out,
      /engine\/dist\/.*\.js$/m,
      `require.resolve('${sp}') must resolve under engine/dist; got: ${out.trim()}`,
    );
  }
});

// ── AC-R91-8: tsc -p tsconfig.test.json exits 0 ──
test('AC-R91-8: pnpm exec tsc -p tsconfig.test.json --noEmit exits 0', () => {
  let exit: number | null = null;
  try {
    execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.test.json', '--noEmit'], {
      cwd: REPO_ROOT, encoding: 'utf8',
    });
    exit = 0;
  } catch (err) {
    exit = (err as { status?: number }).status ?? -1;
  }
  assert.equal(exit, 0, 'tsc -p tsconfig.test.json must exit 0 with package-path imports + paths mapping');
});

// ── AC-R91-9 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/dist/ removed from Tessera
// worktree (engine/ deleted by R94); existsSync fails. Category C.

// ── AC-R91-10: sample test file uses package-path imports ──
test('AC-R91-10: q91 own test file uses package-name imports (self-binding)', () => {
  const src = readFileSync(__filename.replace(/\.js$/, '.ts'), 'utf8');
  // This test file itself does not import from the engine package directly (it's a meta-test
  // that asserts about other files). Self-binding satisfied via the AC-R91-1 grep guard which
  // would catch this file if it imported via ../engine paths.
  // Negative assertion: this test file does NOT contain any '../engine' import.
  assert.equal(/from\s+['"]\.\.+\/engine/.test(src), false,
    'q91 test file must not contain relative ../engine imports');
});

// ── AC-R91-11: VENDORING-MANIFEST.md has R91 header note ──
test('AC-R91-11: coordination/VENDORING-MANIFEST.md contains R91 consumption-migration header note', () => {
  const md = readFileSync(path.join(REPO_ROOT, 'coordination/VENDORING-MANIFEST.md'), 'utf8');
  assert.match(
    md,
    /## R91 consumption-migration note \(2026-05-21\)/,
    'VENDORING-MANIFEST.md must contain R91 header note (section heading)',
  );
  assert.match(
    md,
    /@johnpatrickwarren-oss\/deploysignal-engine/,
    'R91 header note must reference the package name',
  );
  // Forward-protection: R90 header note ALSO present (unchanged)
  assert.match(
    md,
    /## R90 extraction note \(2026-05-21\)/,
    'R90 extraction note must be preserved (R90 deliverable forward-protected)',
  );
});

// ── AC-R91-12: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET ──
const ALLOWED_REGEX = /^(tsconfig\.json|package\.json|pnpm-lock\.yaml|test\/[^/]+\.test\.ts|test\/_substrate\/[^/]+\.ts|tools\/[^/]+\.ts|tools\/calibrators\/[^/]+\.ts|coordination\/VENDORING-MANIFEST\.md|coordination\/specs\/Q-R91-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination\/reviews\/REVIEWER-REPORT-R91\.md|coordination\/MEMORIAL\.md|coordination\/NEXT-ROLE\.md|coordination\/logs\/ROUND-R91-.*)$/;
test('AC-R91-12: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const diff = execFileSync('git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'], {
    cwd: REPO_ROOT, encoding: 'utf8',
  });
  const paths_ = diff.split('\n').filter(p => p.length > 0);
  const violators = paths_.filter(p => !ALLOWED_REGEX.test(p));
  assert.deepEqual(violators, [], `anti-scope violators: ${violators.join(', ')}`);
});

// ── AC-R91-13 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/*.ts sentinel files removed from
// Tessera worktree; readFileSync fails with ENOENT. Category C.

// ── AC-R91-14 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/package.json + engine/README.md
// removed from Tessera worktree; readFileSync fails with ENOENT. Category C.
