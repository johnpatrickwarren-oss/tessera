import { test } from 'node:test';
import assert from 'node:assert/strict';

// R84 RED stubs — 17 assert.fail placeholders.
// Replace with verbatim GREEN body from Q-R84-SPEC.md § 1.6 at GREEN commit.

test('AC-R84-1: demos/engine-worker.js exists and is non-empty', () => {
  assert.fail('R84 RED: AC-R84-1');
});

test('AC-R84-2: worker file performs runtime detection (process.versions.node)', () => {
  assert.fail('R84 RED: AC-R84-2');
});

test('AC-R84-3: worker uses dynamic import() of engine-bundle.mjs', () => {
  assert.fail('R84 RED: AC-R84-3');
});

test('AC-R84-4: worker registers a message handler for type:"run"', () => {
  assert.fail('R84 RED: AC-R84-4');
});

test('AC-R84-5: worker emits {type:"window",windowIdx,perShard} per window', () => {
  assert.fail('R84 RED: AC-R84-5');
});

test('AC-R84-6: worker emits {type:"terminal",fdr_K,fdr_qLevel,fdr_selected_indices,candidates}', () => {
  assert.fail('R84 RED: AC-R84-6');
});

test('AC-R84-7: worker emits {type:"error",error:...} on internal errors', () => {
  assert.fail('R84 RED: AC-R84-7');
});

test('AC-R84-8: demo.html spawns new Worker("./engine-worker.js") on btnRun click', () => {
  assert.fail('R84 RED: AC-R84-8');
});

test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  assert.fail('R84 RED: AC-R84-9');
});

test('AC-R84-10: worker.onmessage handler appends to scenarios.custom.windows and renders', () => {
  assert.fail('R84 RED: AC-R84-10');
});

test('AC-R84-11: #btn-cancel exists; click handler calls worker.terminate()', () => {
  assert.fail('R84 RED: AC-R84-11');
});

test('AC-R84-12: #engine-error-banner exists; r84ShowError helper sets text + removes hidden', () => {
  assert.fail('R84 RED: AC-R84-12');
});

test('AC-R84-13: end-to-end Node Worker round-trip — receives window + terminal messages', async () => {
  assert.fail('R84 RED: AC-R84-13');
});

test('AC-R84-14: worker.terminate() halts further message emission', async () => {
  assert.fail('R84 RED: AC-R84-14');
});

test('AC-R84-15: prior round surface markers preserved in demos/demo.html', () => {
  assert.fail('R84 RED: AC-R84-15');
});

test('AC-R84-16: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  assert.fail('R84 RED: AC-R84-16');
});

test('AC-R84-17: typecheck sentinel + EMPIRICAL.sh has Block 1..5 markers', () => {
  assert.fail('R84 RED: AC-R84-17');
});
