import { test } from 'node:test';
import assert from 'node:assert/strict';

// RED stubs — all 14 ACs for Q-R82 engine browser-bundling + Web Crypto adapter.
// Replaced with real assertions in chore-A (GREEN commit).

test('AC-R82-1: tools/build-browser-bundle.ts exists', () => {
  assert.fail('AC-R82-1 RED stub');
});

test('AC-R82-2: package.json scripts.build:browser + devDeps.esbuild', () => {
  assert.fail('AC-R82-2 RED stub');
});

test('AC-R82-3: demos/engine-bundle.mjs exists and is >= 5000 bytes', () => {
  assert.fail('AC-R82-3 RED stub');
});

test('AC-R82-4: bundle exports the browser-safe surface + excludes ds-integration', () => {
  assert.fail('AC-R82-4 RED stub');
});

test('AC-R82-5: engine/topology-overlay.ts removed top-level node:crypto static import', () => {
  assert.fail('AC-R82-5 RED stub');
});

test('AC-R82-6: computeSnapshotHash returns a 64-char hex sync', () => {
  assert.fail('AC-R82-6 RED stub');
});

test('AC-R82-7: pureJsSha256 matches node:crypto for FIPS test vectors', () => {
  assert.fail('AC-R82-7 RED stub');
});

test('AC-R82-8: bundle did not inline node:* module bodies', () => {
  assert.fail('AC-R82-8 RED stub');
});

test('AC-R82-9: demos/demo.html has R82 smoke <script type="module">', () => {
  assert.fail('AC-R82-9 RED stub');
});

test('AC-R82-10: .gitignore lists demos/engine-bundle.mjs', () => {
  assert.fail('AC-R82-10 RED stub');
});

test('AC-R82-11: pnpm build:browser is invokable and idempotent', () => {
  assert.fail('AC-R82-11 RED stub');
});

test('AC-R82-12: typecheck sentinel (binding command: EMPIRICAL.sh Block 1)', () => {
  assert.fail('AC-R82-12 RED stub');
});

test('AC-R82-13: Q-R82-EMPIRICAL.sh has Block 1/2/3/4/5 markers', () => {
  assert.fail('AC-R82-13 RED stub');
});

test('AC-R82-14: git diff round-start..HEAD <= ALLOWED_SET', () => {
  assert.fail('AC-R82-14 RED stub');
});
