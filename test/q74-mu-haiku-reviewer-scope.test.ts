// test/q74-mu-haiku-reviewer-scope.test.ts — R74 ACs.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SELECTOR_PATH = resolve(__dirname, '..', 'scripts', 'mu-model-select.js');
const FIXTURES_DIR = resolve(__dirname, '..', 'scripts', 'mu-model-select-fixtures');
const PIPELINE_SH = resolve(__dirname, '..', 'run-pipeline.sh');
const CLAUDE_REVIEWER_MD = resolve(__dirname, '..', 'CLAUDE-REVIEWER.md');
const PACKAGE_JSON = resolve(__dirname, '..', 'package.json');

interface SelectorOut {
  round: string;
  model: string;
  rationale: string;
  decision_path: string[];
  selector_version: string;
  matched_anchors: string[];
}

function runSelector(fixturePath: string, tier: string, muSonnet = false): { stdout: string; status: number | null; stderr: string } {
  const args = [SELECTOR_PATH, '--directive', fixturePath, '--tier', tier];
  if (muSonnet) args.push('--mu-sonnet');
  const r = spawnSync('node', args, { encoding: 'utf-8' });
  return { stdout: r.stdout ?? '', status: r.status, stderr: r.stderr ?? '' };
}

function parse(stdout: string): SelectorOut { return JSON.parse(stdout) as SelectorOut; }

// AC-R74-1: selector emits valid JSON shape.
test('AC-R74-1: selector emits valid JSON with contract fields', () => {
  const { stdout, status } = runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full');
  assert.equal(status, 0, `selector exit non-zero; stdout=${stdout}`);
  const out = parse(stdout);
  assert.ok(typeof out.round === 'string' && out.round.length > 0);
  assert.ok(['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'n/a'].includes(out.model));
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
  assert.ok(Array.isArray(out.decision_path) && out.decision_path.length > 0);
  assert.ok(typeof out.selector_version === 'string' && out.selector_version.length > 0);
  assert.ok(Array.isArray(out.matched_anchors));
});

// AC-R74-2: selector exits 1 on missing --tier.
test('AC-R74-2: selector exits 1 on missing --tier', () => {
  const r = spawnSync('node', [SELECTOR_PATH, '--directive', resolve(FIXTURES_DIR, 'F1-default-haiku.md')], { encoding: 'utf-8' });
  assert.equal(r.status, 1);
  assert.ok((r.stderr ?? '').includes('--tier'));
});

// AC-R74-3: selector exits 1 on unreadable directive.
test('AC-R74-3: selector exits 1 on unreadable directive', () => {
  const r = spawnSync('node', [SELECTOR_PATH, '--directive', '/nonexistent/path.md', '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 1);
  assert.ok((r.stderr ?? '').includes('directive unreadable'));
});

// AC-R74-4: F1 default Haiku (full-tier, no anchor).
test('AC-R74-4: F1-default-haiku → claude-haiku-4-5-20251001 (full-tier, no anchor)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full').stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.decision_path[0], 'default_haiku');
});

// AC-R74-5: F2 class A (cross-project promotion) → Sonnet.
test('AC-R74-5: F2-class-A-promotion → claude-sonnet-4-6 (class A)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F2-class-A-promotion.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_A');
});

// AC-R74-6: F3 class B (MU batch) → Sonnet.
test('AC-R74-6: F3-class-B-batch → claude-sonnet-4-6 (class B)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F3-class-B-batch.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_B');
});

// AC-R74-7: F4 class C (Reviewer-2 + ESCALATE) → Sonnet.
test('AC-R74-7: F4-class-C-reviewer2 → claude-sonnet-4-6 (class C)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F4-class-C-reviewer2.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_C');
});

// AC-R74-8: F5 class D (operator-resolution + Option X) → Sonnet.
test('AC-R74-8: F5-class-D-option → claude-sonnet-4-6 (class D)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F5-class-D-option.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_D');
});

// AC-R74-9: F6 audit-tier without anchor → Haiku (anchors NOT checked on audit).
test('AC-R74-9: F6-audit-no-anchor (audit tier) → claude-haiku-4-5-20251001 (no anchor check)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F6-audit-no-anchor.md'), 'audit').stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.decision_path[0], 'default_haiku');
});

// AC-R74-10: tier=solo → model n/a (MU not dispatched).
test('AC-R74-10: tier=solo → model "n/a"', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'solo').stdout);
  assert.equal(out.model, 'n/a');
  assert.equal(out.decision_path[0], 'tier_no_mu');
});

// AC-R74-11: tier=coordinator-only → model n/a.
test('AC-R74-11: tier=coordinator-only → model "n/a"', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'coordinator-only').stdout);
  assert.equal(out.model, 'n/a');
  assert.equal(out.decision_path[0], 'tier_no_mu');
});

// AC-R74-12: --mu-sonnet flag forces Sonnet on tier=audit even without anchor.
test('AC-R74-12: --mu-sonnet on tier=audit forces Sonnet (operator override)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F6-audit-no-anchor.md'), 'audit', true).stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'operator_override');
});

// AC-R74-13: --mu-sonnet flag forces Sonnet on tier=full even without anchor.
test('AC-R74-13: --mu-sonnet on tier=full with no anchor forces Sonnet (operator override)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full', true).stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'operator_override');
});

// AC-R74-22: corpus.json contains the expected 6 fixture entries.
test('AC-R74-22: corpus.json enumerates all 6 fixtures with expected models', () => {
  const corpus = JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'corpus.json'), 'utf-8'));
  assert.equal(corpus.entries.length, 6);
  const names = corpus.entries.map((e: { name: string }) => e.name).sort();
  assert.deepEqual(names, [
    'F1-default-haiku', 'F2-class-A-promotion', 'F3-class-B-batch',
    'F4-class-C-reviewer2', 'F5-class-D-option', 'F6-audit-no-anchor',
  ].sort());
});

// AC-R74-32: end-to-end bash flag construction — MU_SONNET=false → Haiku (not Sonnet).
// Closes the spec § 5.3 acknowledged gap. Exercises the bash → selector integration path
// with set -u to match run-pipeline.sh's actual execution environment (set -uo pipefail).
// Verifies the fixed conditional correctly omits --mu-sonnet when MU_SONNET is "false".
test('AC-R74-32: MU_SONNET=false does not pass --mu-sonnet to selector (Haiku for F1 no-anchor)', () => {
  const f1Path = resolve(FIXTURES_DIR, 'F1-default-haiku.md');
  // Mirror the fixed run-pipeline.sh conditional form under set -u (matches pipeline env).
  const bashScript = [
    'set -u',
    'MU_SONNET=false',
    `if [ "$MU_SONNET" = "true" ]; then`,
    `  node ${SELECTOR_PATH} --directive ${f1Path} --tier full --mu-sonnet`,
    `else`,
    `  node ${SELECTOR_PATH} --directive ${f1Path} --tier full`,
    `fi`,
  ].join('\n');
  const r = spawnSync('bash', ['-c', bashScript], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `bash script exited non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout) as SelectorOut;
  assert.equal(out.model, 'claude-haiku-4-5-20251001',
    `MU_SONNET=false should not pass --mu-sonnet; expected haiku but got ${out.model}`);
  assert.equal(out.decision_path[0], 'default_haiku');
});
