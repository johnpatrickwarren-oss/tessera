import { test } from 'node:test';
import assert from 'node:assert/strict';

// R85 RED stubs — all fail before implementation

test('AC-R85-1: demos/demo.html has #mode-toggle fieldset', () => {
  assert.fail('R85 RED: AC-R85-1');
});

test('AC-R85-2: demos/demo.html has two radio inputs (canned + live)', () => {
  assert.fail('R85 RED: AC-R85-2');
});

test('AC-R85-3: demos/demo.html declares setMode(mode) handling both values', () => {
  assert.fail('R85 RED: AC-R85-3');
});

test('AC-R85-4: mode-radio change listener wired to setMode()', () => {
  assert.fail('R85 RED: AC-R85-4');
});

test('AC-R85-5: setMode applies data-mode attribute to document.body', () => {
  assert.fail('R85 RED: AC-R85-5');
});

test('AC-R85-6: CSS has body[data-mode="live"] rule disabling #scenario-selector', () => {
  assert.fail('R85 RED: AC-R85-6');
});

test('AC-R85-7: CSS has body[data-mode="canned"] rule for #tessera-control-panel inputs', () => {
  assert.fail('R85 RED: AC-R85-7');
});

test('AC-R85-8: demos/demo.html has #engine-loading-indicator element', () => {
  assert.fail('R85 RED: AC-R85-8');
});

test('AC-R85-9: demos/demo.html has #engine-run-status with aria-live attribute', () => {
  assert.fail('R85 RED: AC-R85-9');
});

test('AC-R85-10: updateRunStatus(stage,payload) declared; all 5 stages present', () => {
  assert.fail('R85 RED: AC-R85-10');
});

test('AC-R85-11: r85ShowLoadingSpinner + r85HideLoadingSpinner declared and invoked', () => {
  assert.fail('R85 RED: AC-R85-11');
});

test('AC-R85-12: DEMO-SCRIPT.md has "## Contents" ToC section with bullet list', () => {
  assert.fail('R85 RED: AC-R85-12');
});

test('AC-R85-13: DEMO-SCRIPT.md has Minute 10:00 – 12:00 Live mode section', () => {
  assert.fail('R85 RED: AC-R85-13');
});

test('AC-R85-14: README.md Browser dashboard subsection mentions Live mode', () => {
  assert.fail('R85 RED: AC-R85-14');
});

test('AC-R85-15: ~/.claude/CROSS-PROJECT-MEMORIAL.md has haiku-mu-status-field-disambiguation', () => {
  assert.fail('R85 RED: AC-R85-15');
});

test('AC-R85-16: ~/.claude/CROSS-PROJECT-MEMORIAL.md has architect-encoded-regex-with-hardcoded-bounds', () => {
  assert.fail('R85 RED: AC-R85-16');
});

test('AC-R85-17: ~/.claude/CROSS-PROJECT-MEMORIAL.md has vendored-at-pin reclassification entry', () => {
  assert.fail('R85 RED: AC-R85-17');
});

test('AC-R85-18: prior round surface markers preserved in demos/demo.html', () => {
  assert.fail('R85 RED: AC-R85-18');
});

test('AC-R85-19: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  assert.fail('R85 RED: AC-R85-19');
});

test('AC-R85-20: typecheck side-channel + EMPIRICAL.sh has Block 1..5 markers', () => {
  assert.fail('R85 RED: AC-R85-20');
});
