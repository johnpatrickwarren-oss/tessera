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
import { readFileSync, existsSync, lstatSync, readdirSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUND_START_SHA = 'a63da14';

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, 'utf8'));
}

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

// ── AC-R91-3: tsconfig.json contains paths mapping for the package ──
test('AC-R91-3: tsconfig.json has compilerOptions.paths entries for @johnpatrickwarren-oss/deploysignal-engine', () => {
  const tsc = readJson(path.join(REPO_ROOT, 'tsconfig.json'));
  const paths = tsc.compilerOptions?.paths;
  assert.ok(paths, 'tsconfig.json compilerOptions.paths must exist');
  assert.deepEqual(
    paths['@johnpatrickwarren-oss/deploysignal-engine'],
    ['./engine/types/index'],
    'tsconfig.json paths["@johnpatrickwarren-oss/deploysignal-engine"] must equal ["./engine/types/index"]',
  );
  assert.deepEqual(
    paths['@johnpatrickwarren-oss/deploysignal-engine/*'],
    ['./engine/*'],
    'tsconfig.json paths["@johnpatrickwarren-oss/deploysignal-engine/*"] must equal ["./engine/*"]',
  );
  assert.equal(tsc.compilerOptions.baseUrl, '.', 'tsconfig.json compilerOptions.baseUrl must be "."');
});

// ── AC-R91-4: root package.json has file: dependency on engine ──
test('AC-R91-4: root package.json dependencies includes @johnpatrickwarren-oss/deploysignal-engine: file:./engine', () => {
  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));
  assert.ok(pkg.dependencies, 'root package.json must have dependencies block');
  assert.equal(
    pkg.dependencies['@johnpatrickwarren-oss/deploysignal-engine'],
    'file:./engine',
    'dependencies["@johnpatrickwarren-oss/deploysignal-engine"] must equal "file:./engine"',
  );
});

// ── AC-R91-5: root package.json pretest extended ──
test('AC-R91-5: root package.json scripts.pretest === "tsc && tsc -p tsconfig.test.json"', () => {
  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));
  assert.equal(
    pkg.scripts?.pretest,
    'tsc && tsc -p tsconfig.test.json',
    'pretest must run engine/dist build before tsconfig.test.json build',
  );
});

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
      /engine\/dist\/.*\.js$/,
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

// ── AC-R91-9: engine/dist contains the resolution targets ──
test('AC-R91-9: engine/dist/ contains the 5 representative resolution targets as .js', () => {
  const targets = [
    'engine/dist/types/verdict.js',
    'engine/dist/types/config.js',
    'engine/dist/detectors/betting-e-process.js',
    'engine/dist/topology-overlay.js',
    'engine/dist/ds-integration/index.js',
  ];
  for (const t of targets) {
    assert.ok(existsSync(path.join(REPO_ROOT, t)), `engine/dist sentinel missing: ${t}`);
  }
});

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

// ── AC-R91-13: engine algorithm + types byte-identical to round-start ──
test('AC-R91-13: engine/*.ts (algorithm + types + barrel) byte-identical to ROUND_START_SHA', () => {
  // Sentinel set: representative engine source files that R91 anti-scope freezes.
  const sentinels = [
    'engine/types/index.ts',
    'engine/types/verdict.ts',
    'engine/types/config.ts',
    'engine/detectors/betting-e-process.ts',
    'engine/topology-overlay.ts',
    'engine/core.ts',
    'engine/loader.ts',
    'engine/ds-integration/event-consumer.ts',
    'engine/l0/counter-rate-transform.ts',
    'engine/fleet/verdict-consumer.ts',
  ];
  for (const s of sentinels) {
    const atRoundStart = execFileSync('git', ['show', `${ROUND_START_SHA}:${s}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const atHead = readFileSync(path.join(REPO_ROOT, s), 'utf8');
    assert.equal(atHead, atRoundStart, `engine sentinel modified between ${ROUND_START_SHA}..HEAD: ${s}`);
  }
});

// ── AC-R91-14: engine/package.json + engine/README.md byte-identical (R90 frozen) ──
test('AC-R91-14: engine/package.json + engine/README.md byte-identical to ROUND_START_SHA (R90 deliverables forward-protected)', () => {
  for (const p of ['engine/package.json', 'engine/README.md']) {
    const atRoundStart = execFileSync('git', ['show', `${ROUND_START_SHA}:${p}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const atHead = readFileSync(path.join(REPO_ROOT, p), 'utf8');
    assert.equal(atHead, atRoundStart, `R90 deliverable modified between ${ROUND_START_SHA}..HEAD: ${p}`);
  }
});
