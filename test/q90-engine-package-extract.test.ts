// q90-engine-package-extract.test.ts — R90 ACs: engine package boundary,
// types-barrel decoupling, build artifact, backwards-compat smoke.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ENGINE_DIR = path.join(REPO_ROOT, 'engine');
const ROUND_START_SHA = '65edb85';

const ALLOWED_REGEX = /^(engine\/package\.json|engine\/README\.md|tsconfig\.json|package\.json|pnpm-workspace\.yaml|\.gitignore|coordination\/VENDORING-MANIFEST\.md|test\/q90-engine-package-extract\.test\.ts|coordination\/specs\/Q-R90-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination\/reviews\/REVIEWER-REPORT-R90\.md|coordination\/MEMORIAL\.md|coordination\/NEXT-ROLE\.md|coordination\/logs\/ROUND-R90-.*)$/;

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, 'utf8'));
}

test('AC-R90-1: engine/package.json exists and parses as JSON with required top-level keys', () => {
  const pkgPath = path.join(ENGINE_DIR, 'package.json');
  assert.ok(existsSync(pkgPath), 'engine/package.json must exist');
  const pkg = readJson(pkgPath);
  const requiredKeys = ['name', 'version', 'description', 'license', 'main', 'types', 'files', 'repository', 'exports'];
  for (const k of requiredKeys) {
    assert.ok(k in pkg, `engine/package.json missing required key: ${k}`);
  }
});

test('AC-R90-2: engine/package.json name === "@johnpatrickwarren-oss/deploysignal-engine"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.strictEqual(pkg.name, '@johnpatrickwarren-oss/deploysignal-engine');
});

test('AC-R90-3: engine/package.json version === "0.1.0-pre" and license === "Apache-2.0"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.strictEqual(pkg.version, '0.1.0-pre');
  assert.strictEqual(pkg.license, 'Apache-2.0');
});

test('AC-R90-4: engine/package.json exports map includes the prescribed subpath enumeration', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  const ex = pkg.exports;
  // Hard-anchored subpaths (no wildcard) — must appear verbatim
  const expectedExact = [
    '.', './types', './core', './topology-overlay', './signal-classes',
    './verdict-groups', './hardware-topology-source', './loader',
    './per-detector-resampler-mode', './ds-integration',
    './types/config', './types/verdict', './types/primitives',
    './types/families/a', './types/families/c',
    './package.json',
  ];
  for (const sp of expectedExact) {
    assert.ok(sp in ex, `exports map missing subpath: ${sp}`);
  }
  // Wildcard subpaths
  const expectedWildcards = ['./detectors/*', './topology/*', './fleet/*', './l0/*', './o0/*', './events/*', './per-shard/*', './ds-integration/*'];
  for (const sp of expectedWildcards) {
    assert.ok(sp in ex, `exports map missing wildcard subpath: ${sp}`);
  }
});

test('AC-R90-5: engine/package.json repository.directory === "engine"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.ok(pkg.repository && typeof pkg.repository === 'object', 'repository must be an object');
  assert.strictEqual(pkg.repository.directory, 'engine');
  assert.match(pkg.repository.url ?? '', /github\.com\/johnpatrickwarren-oss\/tessera/);
});

test('AC-R90-6: root tsconfig.json outDir === "engine/dist" (changed from "dist/engine")', () => {
  const tsc = readJson(path.join(REPO_ROOT, 'tsconfig.json'));
  assert.strictEqual(tsc.compilerOptions.outDir, 'engine/dist');
  assert.strictEqual(tsc.compilerOptions.rootDir, 'engine');
});

test('AC-R90-7: engine build artifact present at engine/dist with sentinel files emitted', () => {
  // The Implementer chore-A must run `pnpm exec tsc` before committing the q90 test
  // so the artifact exists when the test runs at chore-A.
  const sentinels = [
    'engine/dist/types/index.js',
    'engine/dist/types/index.d.ts',
    'engine/dist/topology-overlay.js',
    'engine/dist/topology-overlay.d.ts',
    'engine/dist/detectors/betting-e-process.js',
    'engine/dist/detectors/betting-e-process.d.ts',
    'engine/dist/ds-integration/index.js',
    'engine/dist/fleet/e-bh.js',
    'engine/dist/per-shard/runtime.js',
    'engine/dist/l0/counter-rate-transform.js',
  ];
  for (const s of sentinels) {
    assert.ok(existsSync(path.join(REPO_ROOT, s)), `expected build sentinel missing: ${s}`);
  }
});

test('AC-R90-8: pnpm pack from engine/ produces the expected tarball (run-on-demand)', () => {
  // Run `pnpm pack` from engine/ ; capture filename ; verify tarball exists.
  // pnpm pack outputs the tarball path on the last stdout line (per pnpm CLI contract).
  const stdout = execFileSync('pnpm', ['pack', '--pack-destination', ENGINE_DIR], {
    cwd: ENGINE_DIR,
    encoding: 'utf8',
  });
  // Tarball name for scoped packages: <scope>-<name>-<version>.tgz
  const expectedName = 'johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz';
  const tarballPath = path.join(ENGINE_DIR, expectedName);
  assert.ok(existsSync(tarballPath), `expected tarball missing: ${expectedName}; pnpm pack stdout was: ${stdout}`);
});

test('AC-R90-9: tarball contains compiled engine output AND excludes test/coordination/tools', () => {
  const tarballPath = path.join(ENGINE_DIR, 'johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz');
  assert.ok(existsSync(tarballPath), 'tarball must exist before content check (AC-R90-8 must precede)');
  const listing = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
  // npm pack convention: every path inside is prefixed `package/`
  const required = [
    'package/dist/types/index.js',
    'package/dist/types/index.d.ts',
    'package/dist/topology-overlay.js',
    'package/dist/detectors/betting-e-process.js',
    'package/package.json',
    'package/README.md',
  ];
  for (const r of required) {
    assert.ok(listing.includes(r), `tarball missing required entry: ${r}`);
  }
  // Anti-content: must NOT include test/, coordination/, tools/, scripts/, demos/, src .ts
  const forbidden = ['package/test/', 'package/coordination/', 'package/tools/', 'package/scripts/', 'package/demos/'];
  for (const f of forbidden) {
    assert.ok(!listing.includes(f), `tarball must not include path under: ${f}`);
  }
  // Anti-content: no raw .ts sources (only compiled .js + .d.ts)
  const tsLines = listing.split('\n').filter(l => l.endsWith('.ts') && !l.endsWith('.d.ts'));
  assert.deepStrictEqual(tsLines, [], `tarball must not include raw .ts sources; found: ${tsLines.join(', ')}`);
});

test('AC-R90-10: engine/README.md exists and contains expected sections', () => {
  const readmePath = path.join(ENGINE_DIR, 'README.md');
  assert.ok(existsSync(readmePath), 'engine/README.md must exist');
  const body = readFileSync(readmePath, 'utf8');
  assert.match(body, /^# @johnpatrickwarren-oss\/deploysignal-engine/m);
  assert.match(body, /^## What this package is/m);
  assert.match(body, /^## Install/m);
  assert.match(body, /^## Build/m);
  assert.match(body, /git\+ssh:\/\/git@github\.com\/johnpatrickwarren-oss\/tessera\.git/);
});

test('AC-R90-11: VENDORING-MANIFEST.md header has R90 extraction note', () => {
  const manifestPath = path.join(REPO_ROOT, 'coordination', 'VENDORING-MANIFEST.md');
  const body = readFileSync(manifestPath, 'utf8');
  // Note must appear in the first 60 lines (header zone, before the per-row table starts)
  const head = body.split('\n').slice(0, 60).join('\n');
  assert.match(head, /R90.*2026-05-21/);
  assert.match(head, /@johnpatrickwarren-oss\/deploysignal-engine/);
  assert.match(head, /engine\/package\.json/);
});

test('AC-R90-12: root package.json has new pack:engine script and existing scripts unchanged', () => {
  const rootPkg = readJson(path.join(REPO_ROOT, 'package.json'));
  assert.ok(rootPkg.scripts && 'pack:engine' in rootPkg.scripts, 'root package.json must add scripts["pack:engine"]');
  // Existing scripts preserved (sentinel check against R88 surface)
  const preservedKeys = ['build', 'curate-baseline', 'predemo', 'demo', 'build:browser', 'build:demos', 'coverage', 'test', 'typecheck', 'tier-router', 'mu-model-select', 'build-role-context'];
  for (const k of preservedKeys) {
    assert.ok(k in rootPkg.scripts, `root scripts must preserve existing key: ${k}`);
  }
});

test('AC-R90-13: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const diff = execFileSync('git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const paths = diff.split('\n').filter(p => p.length > 0);
  const violators = paths.filter(p => !ALLOWED_REGEX.test(p));
  assert.deepStrictEqual(violators, [], `anti-scope: paths outside ALLOWED_SET: ${violators.join(', ')}`);
});

test('AC-R90-14: backwards-compat — engine algorithm files unchanged byte-identical against round-start', () => {
  // Sentinel-set of files that must remain byte-identical from ROUND_START_SHA to HEAD.
  const sentinels = [
    'engine/types/index.ts',
    'engine/topology-overlay.ts',
    'engine/core.ts',
    'engine/detectors/betting-e-process.ts',
    'engine/fleet/e-bh.ts',
    'engine/per-shard/runtime.ts',
    'engine/l0/counter-rate-transform.ts',
    'engine/ds-integration/index.ts',
    'engine/topology/slurm-source.ts',
    'engine/types/verdict.ts',
  ];
  for (const s of sentinels) {
    const atRoundStart = execFileSync('git', ['show', `${ROUND_START_SHA}:${s}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const atHead = readFileSync(path.join(REPO_ROOT, s), 'utf8');
    assert.strictEqual(atHead, atRoundStart, `engine sentinel must be byte-identical: ${s}`);
  }
});
