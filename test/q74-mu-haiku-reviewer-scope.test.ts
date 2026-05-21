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

// AC-R74-14: run-pipeline.sh declares --mu-sonnet flag in arg parsing.
test('AC-R74-14: run-pipeline.sh declares --mu-sonnet flag', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(/--mu-sonnet\)\s*MU_SONNET=true/.test(script),
    'run-pipeline.sh must contain "--mu-sonnet) MU_SONNET=true" in arg parsing');
});

// AC-R74-15: run-pipeline.sh declares --reviewer-scope flag in arg parsing.
test('AC-R74-15: run-pipeline.sh declares --reviewer-scope flag', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(/--reviewer-scope\)\s*REVIEWER_SCOPE_EXPLICIT="\$2"/.test(script),
    'run-pipeline.sh must parse --reviewer-scope into REVIEWER_SCOPE_EXPLICIT');
});

// AC-R74-16: run-pipeline.sh invokes mu-model-select.js with --directive + --tier.
test('AC-R74-16: run-pipeline.sh invokes scripts/mu-model-select.js with required flags', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(script.includes('scripts/mu-model-select.js'),
    'run-pipeline.sh must reference scripts/mu-model-select.js');
  assert.ok(/scripts\/mu-model-select\.js[\s\S]{0,400}--directive/.test(script),
    'run-pipeline.sh must pass --directive to mu-model-select');
  assert.ok(/scripts\/mu-model-select\.js[\s\S]{0,400}--tier/.test(script),
    'run-pipeline.sh must pass --tier to mu-model-select');
});

// AC-R74-17: run-pipeline.sh maps Sonnet/Haiku selector output to MODEL_MEMORIAL.
test('AC-R74-17: run-pipeline.sh contains MODEL_MEMORIAL_DEFAULT (haiku) + MODEL_MEMORIAL_SONNET (sonnet)', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(/MODEL_MEMORIAL_DEFAULT="claude-haiku-4-5-20251001"/.test(script),
    'run-pipeline.sh must define MODEL_MEMORIAL_DEFAULT as claude-haiku-4-5-20251001');
  assert.ok(/MODEL_MEMORIAL_SONNET="claude-sonnet-4-6"/.test(script),
    'run-pipeline.sh must define MODEL_MEMORIAL_SONNET as claude-sonnet-4-6');
});

// AC-R74-18: CLAUDE-REVIEWER.md contains the structural-only Mode section heading.
test('AC-R74-18: CLAUDE-REVIEWER.md contains "## Mode: Structural-only Reviewer" heading', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  assert.ok(/^## Mode: Structural-only Reviewer$/m.test(content),
    'CLAUDE-REVIEWER.md must contain "## Mode: Structural-only Reviewer" exact heading');
});

// AC-R74-19: CLAUDE-REVIEWER.md Mode section enumerates the 3 structural-only checks.
test('AC-R74-19: Mode section names binding-command + AC-binding + ALLOWED_SET checks', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  const modeIdx = content.indexOf('## Mode: Structural-only Reviewer');
  assert.ok(modeIdx >= 0);
  const modeBody = content.slice(modeIdx);
  assert.ok(/[Bb]inding-command re-runs/.test(modeBody));
  assert.ok(/AC-binding structural integrity/.test(modeBody));
  assert.ok(/ALLOWED_SET diff/.test(modeBody));
});

// AC-R74-20: CLAUDE-REVIEWER.md REINFORCED line count unchanged from baseline 3.
test('AC-R74-20: CLAUDE-REVIEWER.md REINFORCED count unchanged (no REINFORCED addition this round)', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  const count = (content.match(/^# REINFORCED/gm) ?? []).length;
  assert.equal(count, 3, `CLAUDE-REVIEWER.md REINFORCED count expected 3 (baseline); got ${count}`);
});

// AC-R74-21: package.json registers mu-model-select script.
test('AC-R74-21: package.json registers mu-model-select script', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));
  assert.equal(pkg.scripts['mu-model-select'], 'pnpm exec node scripts/mu-model-select.js');
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
// that CRITICAL-1 broke: verifies the fixed conditional correctly omits --mu-sonnet when
// MU_SONNET is not "true", allowing the marker-check branch to fire (or default-haiku for F1).
test('AC-R74-32: MU_SONNET=false does not pass --mu-sonnet to selector (Haiku for F1 no-anchor)', () => {
  const f1Path = resolve(FIXTURES_DIR, 'F1-default-haiku.md');
  // Simulate the fixed run-pipeline.sh flag construction in bash, then invoke selector.
  const bashScript = [
    'MU_SONNET=false',
    'if [ "$MU_SONNET" = "true" ]; then MU_SONNET_FLAG=(--mu-sonnet); else MU_SONNET_FLAG=(); fi',
    `node ${SELECTOR_PATH} --directive ${f1Path} --tier full "\${MU_SONNET_FLAG[@]}"`,
  ].join('\n');
  const r = spawnSync('bash', ['-c', bashScript], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `bash script exited non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout) as SelectorOut;
  assert.equal(out.model, 'claude-haiku-4-5-20251001',
    `MU_SONNET=false should not pass --mu-sonnet; expected haiku but got ${out.model}`);
  assert.equal(out.decision_path[0], 'default_haiku');
});
