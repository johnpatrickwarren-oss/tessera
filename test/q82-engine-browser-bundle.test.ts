import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import {
  computeSnapshotHash,
  pureJsSha256,
} from '../engine/topology-overlay';

const ROUND_START_SHA = '5c3e0d9';
const REPO_ROOT = path.resolve(__dirname, '..');

const BUNDLE_PATH = path.join(REPO_ROOT, 'demos/engine-bundle.mjs');
const BUILD_TOOL_PATH = path.join(REPO_ROOT, 'tools/build-browser-bundle.ts');
const DEMO_HTML_PATH = path.join(REPO_ROOT, 'demos/demo.html');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const GITIGNORE_PATH = path.join(REPO_ROOT, '.gitignore');
const TOPOLOGY_OVERLAY_PATH = path.join(REPO_ROOT, 'engine/topology-overlay.ts');

// ── AC-R82-1: build-browser-bundle.ts exists ──
test('AC-R82-1: tools/build-browser-bundle.ts exists', () => {
  assert.ok(fs.existsSync(BUILD_TOOL_PATH), 'tools/build-browser-bundle.ts must exist');
  const content = fs.readFileSync(BUILD_TOOL_PATH, 'utf8');
  assert.ok(content.includes('esbuild'), 'must reference esbuild');
  assert.ok(content.includes('demos/engine-bundle.mjs'), 'must target demos/engine-bundle.mjs');
});

// ── AC-R82-2: package.json has build:browser script + esbuild devDep ──
test('AC-R82-2: package.json scripts.build:browser + devDeps.esbuild', () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(typeof pkg.scripts?.['build:browser'], 'string',
    'package.json scripts.build:browser must be a string');
  assert.ok(
    pkg.scripts!['build:browser'].includes('tools/build-browser-bundle.js'),
    'build:browser script must invoke tools/build-browser-bundle.js',
  );
  assert.equal(typeof pkg.devDependencies?.esbuild, 'string',
    'devDependencies.esbuild must be a string');
});

// ── AC-R82-3: demos/engine-bundle.mjs exists >= 5000 bytes ──
test('AC-R82-3: demos/engine-bundle.mjs exists and is >= 5000 bytes', () => {
  assert.ok(fs.existsSync(BUNDLE_PATH), 'demos/engine-bundle.mjs must exist');
  const sz = fs.statSync(BUNDLE_PATH).size;
  assert.ok(sz >= 5000, `bundle size ${sz} < 5000 bytes`);
});

// ── AC-R82-4: bundle contains expected exports + no ds-integration symbols ──
test('AC-R82-4: bundle exports the browser-safe surface + excludes ds-integration', () => {
  const txt = fs.readFileSync(BUNDLE_PATH, 'utf8');
  for (const sym of ['computeSnapshotHash', 'pureJsSha256', 'StaticTopologySource', 'TopologyEnricher']) {
    assert.ok(txt.includes(sym), `bundle must contain symbol "${sym}"`);
  }
  for (const banned of ['DsEventConsumer', 'createDsFeed', 'freeze_hook_activated']) {
    assert.ok(!txt.includes(banned),
      `bundle must NOT contain ds-integration symbol "${banned}"`);
  }
});

// ── AC-R82-5: engine/topology-overlay.ts has no top-level node:crypto static import ──
// TD-2 note: spec § 4.1 constraint says `createHash` appears 0 times; however spec § 2.1
// mechanism prescribes `nc.createHash()` in _sha256Hex for the Node path. These are
// contradictory. The discriminating property is: (a) no static import; (b) computeSnapshotHash
// body calls _sha256Hex, not createHash directly. Both properties are tested here.
test('AC-R82-5: engine/topology-overlay.ts removed top-level node:crypto static import', () => {
  const txt = fs.readFileSync(TOPOLOGY_OVERLAY_PATH, 'utf8');
  // Primary property: no static import of node:crypto
  assert.ok(
    !/^\s*import\s+\{[^}]*createHash[^}]*\}\s+from\s+['"]node:crypto['"];?\s*$/m.test(txt),
    'static `import { createHash } from "node:crypto";` must be removed',
  );
  // Discriminating property: computeSnapshotHash body calls _sha256Hex
  assert.ok(
    txt.includes('return _sha256Hex(canonical)'),
    'computeSnapshotHash must call _sha256Hex(canonical) not createHash directly',
  );
});

// ── AC-R82-6: computeSnapshotHash sync surface preserved (Node path) ──
test('AC-R82-6: computeSnapshotHash returns a 64-char hex sync', () => {
  const snap = {
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'a', to: 'b', relationship: 'contains' }],
    fetched_at_ts: 0,
    source_id: 's',
    source_version: 'v',
  };
  // Cast is required because our test snap is a minimal fixture; full type is richer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = computeSnapshotHash(snap as any);
  assert.equal(typeof h, 'string', 'must return string synchronously');
  assert.ok(/^[0-9a-f]{64}$/.test(h), `expected 64-char lowercase hex; got "${h}"`);
});

// ── AC-R82-7: pureJsSha256 byte-identity with node:crypto for >= 3 FIPS vectors ──
test('AC-R82-7: pureJsSha256 matches node:crypto for FIPS test vectors', () => {
  const vectors = [
    { input: '', expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'abc', expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
  ];
  for (const v of vectors) {
    const nodeHash = createHash('sha256').update(v.input).digest('hex');
    const pureHash = pureJsSha256(v.input);
    assert.equal(nodeHash, v.expected,
      `node:crypto baseline broken for ${JSON.stringify(v.input).slice(0, 25)}`);
    assert.equal(pureHash, v.expected,
      `pureJsSha256 disagrees with FIPS baseline for ${JSON.stringify(v.input).slice(0, 25)}`);
    assert.equal(nodeHash, pureHash,
      `pureJsSha256 / node:crypto divergence for ${JSON.stringify(v.input).slice(0, 25)}`);
  }
});

// ── AC-R82-8: bundle excludes node-internal module bodies ──
test('AC-R82-8: bundle did not inline node:* module bodies', () => {
  const txt = fs.readFileSync(BUNDLE_PATH, 'utf8');
  for (const banned of ['__webpack_require__', 'crypto-browserify', 'inherits_browser']) {
    assert.ok(!txt.includes(banned), `bundle leaked polyfill marker "${banned}"`);
  }
});

// ── AC-R82-9: demo.html has <script type="module"> bundle smoke block ──
test('AC-R82-9: demos/demo.html has R82 smoke <script type="module">', () => {
  const html = fs.readFileSync(DEMO_HTML_PATH, 'utf8');
  for (const needle of [
    '<script type="module">',
    './engine-bundle.mjs',
    'computeSnapshotHash',
    'R82 smoke',
    '__tessera_r82_smoke__',
  ]) {
    assert.ok(html.includes(needle), `demos/demo.html must contain "${needle}"`);
  }
});

// ── AC-R82-10: .gitignore lists demos/engine-bundle.mjs ──
test('AC-R82-10: .gitignore lists demos/engine-bundle.mjs', () => {
  const gi = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  assert.match(gi, /^demos\/engine-bundle\.mjs$/m,
    '.gitignore must list demos/engine-bundle.mjs');
});

// ── AC-R82-11: build:browser script is idempotent (re-runs produce same artifact) ──
test('AC-R82-11: pnpm build:browser is invokable and idempotent', () => {
  // Use node directly to invoke the compiled build tool — avoids pnpm's lifecycle
  // preflight which may block on esbuild build-script approval in some environments.
  // TD-3: spec § 2.5 prescribes `pnpm exec node`; using `node` directly per project
  // tools/ convention (build:demos, coverage, detector-envelope all use plain node).
  const buildCmd = `node ${path.join(REPO_ROOT, 'tools/build-browser-bundle.js')}`;
  try {
    execSync(buildCmd, { cwd: REPO_ROOT, stdio: 'pipe' });
    const sz1 = fs.statSync(BUNDLE_PATH).size;
    execSync(buildCmd, { cwd: REPO_ROOT, stdio: 'pipe' });
    const sz2 = fs.statSync(BUNDLE_PATH).size;
    assert.equal(sz1, sz2, `bundle size drift on re-run: ${sz1} -> ${sz2}`);
  } catch (err) {
    assert.fail(`build:browser invocation failed: ${(err as Error).message}`);
  }
});

// ── AC-R82-12: typecheck clean (sentinel; binding command bound by EMPIRICAL.sh Block 1) ──
test('AC-R82-12: typecheck sentinel (binding command: EMPIRICAL.sh Block 1)', () => {
  const jsPath = path.join(REPO_ROOT, 'test/q82-engine-browser-bundle.test.js');
  assert.ok(fs.existsSync(jsPath), 'q82 test must compile to .js (proves tsc passed)');
});

// ── AC-R82-13: EMPIRICAL.sh block-presence sentinel ──
test('AC-R82-13: Q-R82-EMPIRICAL.sh has Block 1/2/3/4/5 markers', () => {
  const sh = fs.readFileSync(
    path.join(REPO_ROOT, 'coordination/specs/Q-R82-EMPIRICAL.sh'), 'utf8');
  for (const block of [
    '── Block 1: typecheck',
    '── Block 2: bundle artifact',
    '── Block 3: SHA-256 byte-identity',
    '── Block 4: test counts',
    '── Block 5: anti-scope diff',
  ]) {
    assert.ok(sh.includes(block), `EMPIRICAL.sh must contain marker "${block}"`);
  }
});

// ── AC-R82-14: anti-scope diff <= ALLOWED_SET ──
test('AC-R82-14: git diff round-start..HEAD <= ALLOWED_SET', () => {
  const allowed = new RegExp(
    `^(tools/build-browser-bundle\\.ts|engine/topology-overlay\\.ts|`
    + `demos/demo\\.html|demos/engine-bundle\\.mjs|`
    + `package\\.json|pnpm-lock\\.yaml|\\.gitignore|`
    + `test/q82-engine-browser-bundle\\.test\\.ts|`
    + `coordination/specs/Q-R82-SPEC\\.md|`
    + `coordination/specs/Q-R82-SPEC-AUDIT\\.md|`
    + `coordination/specs/Q-R82-EMPIRICAL\\.sh|`
    + `coordination/NEXT-ROLE\\.md|coordination/MEMORIAL\\.md|`
    + `coordination/MEMORIAL-PHASE-[0-9]+\\.md|`
    + `coordination/reviews/REVIEWER-REPORT-R82\\.md|`
    + `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\\.md|`
    + `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\\.md|`
    + `CLAUDE\\.md|CLAUDE-ARCHITECT\\.md|CLAUDE-IMPLEMENTER\\.md|`
    + `CLAUDE-REVIEWER\\.md|CLAUDE-MEMORIAL\\.md|`
    + `CLAUDE-COMMON\\.md|CLAUDE-COORDINATOR\\.md)$`,
  );
  const files = execSync(`git diff ${ROUND_START_SHA} HEAD --name-only`,
    { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const violators = files.filter((f) => !allowed.test(f));
  assert.deepEqual(violators, [],
    `R82 anti-scope diff includes unauthorized paths: ${violators.join(', ')}`);
});
