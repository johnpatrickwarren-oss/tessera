import { test } from 'node:test';
import assert from 'node:assert/strict';

// R94 RED commit stub form — all 13 ACs FAIL by construction.
// GREEN state at chore-A: this file is replaced with the verbatim source in § 3.9.2.

test('AC-R94-1: Tessera root has no engine/ directory post-R94', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-2: package.json dependency URL is github: with v0.1.0-pre tag', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-3: installed package has version 0.1.0-pre + name matches', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-4: 5 prescribed engine subpaths resolve via createRequire under node_modules', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-5: tsconfig.json has empty include, no paths/baseUrl/outDir', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-6: tsconfig.test.json include excludes engine/**/*.ts', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-7: package.json scripts.pretest is simplified (no leading tsc &&)', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-8: VENDORING-MANIFEST.md has R94 extraction header note', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-9: full test suite TAP counts within band', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-10: pnpm exec tsc -p tsconfig.test.json exits 0', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-11: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-12: regression guard — 10 R91-migrated consumer files retain @johnpatrickwarren-oss/deploysignal-engine imports', () => {
  assert.fail('RED: q94 not yet GREEN');
});
test('AC-R94-13: this test file uses execFileSync only with git (not node)', () => {
  assert.fail('RED: q94 not yet GREEN');
});
