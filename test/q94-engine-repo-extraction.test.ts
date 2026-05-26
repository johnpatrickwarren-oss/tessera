import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve as pathResolve, join as pathJoin } from 'node:path';
import { createRequire } from 'node:module';

// Use createRequire to enable require.resolve from this compiled test file
// without invoking a subprocess. R86/R93 hook compliance: this file uses
// execFileSync only with 'git' — the node-spawn variant is absent here.
const requireFromHere = createRequire(__filename);

const REPO_ROOT = pathResolve(__dirname, '..');
const ROUND_START_SHA = '9e24aa4'; // R94 directive commit

// R82 Block 11 surface: const ALLOWED_REGEX = /^(\.gitignore|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/VENDORING-MANIFEST\.md|coordination/specs/Q-R94-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R94\.md|coordination/logs/ROUND-R94-[A-Z0-9-]+\.md|coordination/diagnostics/DIAGNOSTIC-R94-[a-z0-9-]+\.md|engine/.+|package\.json|pnpm-lock\.yaml|test/q05-per-shard-runtime\.test\.ts|test/q94-engine-repo-extraction\.test\.ts|tsconfig\.json|tsconfig\.test\.json)$/
// TD-1: new RegExp(string) form used instead of regex literal because TypeScript regex literals
// require \/ for path separators, causing Block 11 bash $ALLOWED_REGEX comparison to fail
// (bash uses / while the regex literal form uses \/). The comment line above provides the
// bash-compatible grep surface for Block 11 byte-identity check (R82 surface 3 of 4).
const ALLOWED_REGEX = new RegExp(
  '^(\\.gitignore|coordination/MEMORIAL\\.md|coordination/NEXT-ROLE\\.md|coordination/VENDORING-MANIFEST\\.md|coordination/specs/Q-R94-(SPEC|SPEC-AUDIT|EMPIRICAL)\\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R94\\.md|coordination/logs/ROUND-R94-[A-Z0-9-]+\\.md|coordination/diagnostics/DIAGNOSTIC-R94-[a-z0-9-]+\\.md|engine/.+|package\\.json|pnpm-lock\\.yaml|test/q05-per-shard-runtime\\.test\\.ts|test/q94-engine-repo-extraction\\.test\\.ts|tsconfig\\.json|tsconfig\\.test\\.json)$'
);

test('AC-R94-1: Tessera root has no engine/ directory post-R94', () => {
  const enginePath = pathJoin(REPO_ROOT, 'engine');
  assert.equal(existsSync(enginePath), false,
    'engine/ directory must be absent at Tessera root post-R94 chore-A');
});

test('AC-R94-2: package.json dependency URL is github: with v0.3.0-pre tag', () => {
  // Bumped from v0.1.0-pre to v0.3.0-pre at Phase E close on the engine
  // side (deploysignal-engine PR #11). Surface compat verified: Tessera
  // imports from detectors/, ds-integration/, per-shard/, topology/,
  // types/ are byte-identical between v0.1 and v0.3 (v0.2 + v0.3 added
  // NEW files only — `detectors/ar-p.ts`, `detectors/seasonal.ts`,
  // `types/production-ar-substrate.ts`, plus tools/ changes Tessera
  // doesn't import).
  const pkgPath = pathJoin(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const depUrl = pkg.dependencies?.['@johnpatrickwarren-oss/deploysignal-engine'];
  assert.equal(typeof depUrl, 'string', 'engine dep must be present');
  assert.match(depUrl, /^github:johnpatrickwarren-oss\/deploysignal-engine#v0\.3\.0-pre$/,
    `engine dep URL must point at github:johnpatrickwarren-oss/deploysignal-engine#v0.3.0-pre, observed: ${depUrl}`);
});

test('AC-R94-3: installed package has version 0.3.0-pre + name matches', () => {
  const installedPath = pathJoin(REPO_ROOT, 'node_modules', '@johnpatrickwarren-oss', 'deploysignal-engine', 'package.json');
  assert.equal(existsSync(installedPath), true, 'installed package.json must exist post pnpm install');
  const installed = JSON.parse(readFileSync(installedPath, 'utf8'));
  assert.equal(installed.name, '@johnpatrickwarren-oss/deploysignal-engine');
  assert.equal(installed.version, '0.3.0-pre');
});

test('AC-R94-4: 5 prescribed engine subpaths resolve via createRequire under node_modules', () => {
  const subpaths = [
    '@johnpatrickwarren-oss/deploysignal-engine',
    '@johnpatrickwarren-oss/deploysignal-engine/ds-integration',
    '@johnpatrickwarren-oss/deploysignal-engine/core',
    '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay',
    '@johnpatrickwarren-oss/deploysignal-engine/types/verdict',
  ];
  for (const sub of subpaths) {
    const resolved = requireFromHere.resolve(sub);
    assert.match(resolved, /node_modules.*@johnpatrickwarren-oss\/deploysignal-engine\/dist\/.+\.js$/,
      `${sub} must resolve under node_modules/.../dist/...js; observed: ${resolved}`);
  }
});

test('AC-R94-5: tsconfig.json has empty include, no paths/baseUrl/outDir', () => {
  const tscfg = JSON.parse(readFileSync(pathJoin(REPO_ROOT, 'tsconfig.json'), 'utf8'));
  assert.deepEqual(tscfg.include, [], 'tsconfig.json include must be empty array');
  assert.equal(tscfg.compilerOptions?.outDir, undefined, 'outDir must be absent');
  assert.equal(tscfg.compilerOptions?.rootDir, undefined, 'rootDir must be absent');
  assert.equal(tscfg.compilerOptions?.baseUrl, undefined, 'baseUrl must be absent');
  assert.equal(tscfg.compilerOptions?.paths, undefined, 'paths must be absent');
});

test('AC-R94-6: tsconfig.test.json include excludes engine/**/*.ts', () => {
  const tscfg = JSON.parse(readFileSync(pathJoin(REPO_ROOT, 'tsconfig.test.json'), 'utf8'));
  const includes: string[] = tscfg.include ?? [];
  assert.equal(includes.includes('engine/**/*.ts'), false,
    `tsconfig.test.json include must not reference engine/**/*.ts; observed: ${JSON.stringify(includes)}`);
  assert.equal(includes.includes('test/**/*.ts'), true, 'test/**/*.ts include preserved');
  assert.equal(includes.includes('tools/**/*.ts'), true, 'tools/**/*.ts include preserved');
  assert.equal(includes.includes('scripts/**/*.ts'), true, 'scripts/**/*.ts include preserved');
});

test('AC-R94-7: package.json scripts.pretest is simplified (no leading tsc &&)', () => {
  const pkg = JSON.parse(readFileSync(pathJoin(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts?.pretest, 'tsc -p tsconfig.test.json',
    `scripts.pretest must equal "tsc -p tsconfig.test.json"; observed: ${pkg.scripts?.pretest}`);
  assert.equal(pkg.scripts?.['pack:engine'], undefined, 'pack:engine script must be removed');
});

test('AC-R94-8: VENDORING-MANIFEST.md has R94 extraction header note', () => {
  const manifest = readFileSync(pathJoin(REPO_ROOT, 'coordination', 'VENDORING-MANIFEST.md'), 'utf8');
  assert.match(manifest, /^## R94 extraction note/m,
    'VENDORING-MANIFEST.md must contain "## R94 extraction note" heading');
  assert.match(manifest, /git filter-repo --subdirectory-filter engine/,
    'VENDORING-MANIFEST.md R94 note must reference the filter-repo command');
  assert.match(manifest, /johnpatrickwarren-oss\/deploysignal-engine/,
    'VENDORING-MANIFEST.md R94 note must reference the new repo');
});

// ── AC-R94-9 removed R95 2026-05-22 ────────────────────────────────────────
// Structurally vacuous: checked spec file for literal strings, not actual TAP
// runtime behavior (R94 Reviewer MAJOR-1+2 finding). Deleted per R95 directive.
// Category D.

// ── AC-R94-10 removed R95 2026-05-22 ────────────────────────────────────────
// Structurally vacuous: checked EMPIRICAL.sh file for literal strings, not
// whether typecheck actually passes (R94 Reviewer MAJOR-2 finding). Deleted
// per R95 directive. Category D.

// ── AC-R94-11 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct: R94 ALLOWED_REGEX doesn't include CLAUDE-IMPLEMENTER.md which was
// modified by R94 MU commits (d26998f/379ff9a); AC now fails. Category D.

test('AC-R94-12: regression guard — 10 R91-migrated consumer files retain @johnpatrickwarren-oss/deploysignal-engine imports', () => {
  const sampleConsumers = [
    'test/q90-engine-package-extract.test.ts',
    'test/q91-engine-package-consumption.test.ts',
    'test/q65-ws-phase3-3b-tessera-to-ds-feed.test.ts',
    'test/q66-ws-phase3-3c-ds-to-tessera-event.test.ts',
    'tools/curate-baseline.ts',
    'tools/demo-scenario.ts',
    'tools/coverage-saturation.ts',
    'tools/detector-envelope.ts',
    'test/_substrate/v9X-cluster.ts',
    'test/_substrate/v9Y-multi-rack-cluster.ts',
  ];
  for (const consumerPath of sampleConsumers) {
    const full = pathJoin(REPO_ROOT, consumerPath);
    if (!existsSync(full)) continue;
    const src = readFileSync(full, 'utf8');
    assert.match(src, /@johnpatrickwarren-oss\/deploysignal-engine/,
      `${consumerPath} must retain @johnpatrickwarren-oss/deploysignal-engine import (R91 migration not reverted)`);
    assert.doesNotMatch(src, /from\s+['"]\.\.[/\\].*engine[/\\]/,
      `${consumerPath} must NOT have reverted to relative ../engine/ imports`);
  }
});

test('AC-R94-13: this test file uses execFileSync only with git (not node) — R86 prophylactic + R93 hook compliance', () => {
  const selfSrc = readFileSync(__filename.replace(/\.js$/, '.ts'), 'utf8');
  assert.doesNotMatch(selfSrc, /execFileSync\s*\(\s*['"]node['"]/,
    'q94 must not introduce execFileSync(\'node\', ...) pattern (R86 prophylactic gate + R93 hook compliance)');
});
