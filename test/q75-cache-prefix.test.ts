// test/q75-cache-prefix.test.ts — R75 ACs binding:
//   (a) prefix determinism: same inputs → byte-identical output;
//   (b) cross-role prefix-stability: prefix is byte-identical for any role
//       choice (only tail varies);
//   (c) anti-regression: scripts/tier-router.js (R73) + scripts/mu-model-select.js
//       (R74) still produce correct outputs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const BUILDER = resolve(__dirname, '..', 'scripts', 'build-role-context.js');
const MEASURER = resolve(__dirname, '..', 'scripts', 'measure-cache-effect.js');
const ROUTER = resolve(__dirname, '..', 'scripts', 'tier-router.js');
const MU_SELECT = resolve(__dirname, '..', 'scripts', 'mu-model-select.js');
const PROJECT_ROOT = resolve(__dirname, '..');
const ROUND = 'R75';

function runBuilder(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync('node', [BUILDER, ...args], { encoding: 'utf-8' });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

// AC-R75-2: builder exists and produces non-empty prefix when --emit prefix --round R75.
test('AC-R75-2: build-role-context.js --emit prefix produces non-empty output', () => {
  const r = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(r.status, 0, `builder exit non-zero; stderr=${r.stderr}`);
  assert.ok(r.stdout.length > 0, 'prefix output is empty');
});

// AC-R75-3: prefix is byte-identical across two consecutive invocations
// (determinism — no timestamps, no random salts, no env-dependent strings).
test('AC-R75-3: prefix is byte-identical across two consecutive invocations', () => {
  const a = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0);
  assert.equal(sha256(a.stdout), sha256(b.stdout), 'two-run sha256 mismatch — non-deterministic');
  assert.equal(a.stdout, b.stdout, 'two-run byte content mismatch');
});

// AC-R75-4: prefix bytes are stable across role choices — the --role argument
// does NOT alter the prefix (only the tail). Test IMPLEMENTER vs REVIEWER vs
// MEMORIAL-UPDATER.
test('AC-R75-4: prefix is independent of --role choice', () => {
  // --emit prefix ignores --role per § 1.3 contract.
  const a = runBuilder(['--emit', 'prefix', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'prefix', '--role', 'REVIEWER',    '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const c = runBuilder(['--emit', 'prefix', '--role', 'MEMORIAL-UPDATER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0); assert.equal(c.status, 0);
  assert.equal(sha256(a.stdout), sha256(b.stdout), 'IMPLEMENTER vs REVIEWER prefix mismatch');
  assert.equal(sha256(b.stdout), sha256(c.stdout), 'REVIEWER vs MEMORIAL-UPDATER prefix mismatch');
});

// AC-R75-5: tail differs across role choices (negative-of-AC-R75-4; sanity).
test('AC-R75-5: tail differs across role choices', () => {
  const a = runBuilder(['--emit', 'tail', '--role', 'IMPLEMENTER',      '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'tail', '--role', 'REVIEWER',         '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const c = runBuilder(['--emit', 'tail', '--role', 'MEMORIAL-UPDATER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0); assert.equal(c.status, 0);
  assert.notEqual(sha256(a.stdout), sha256(b.stdout), 'IMPLEMENTER tail equals REVIEWER tail — discriminator failed');
  assert.notEqual(sha256(b.stdout), sha256(c.stdout), 'REVIEWER tail equals MEMORIAL-UPDATER tail — discriminator failed');
});

// AC-R75-6: tail contains the role's CLAUDE-<ROLE>.md content + role-stamp lines.
test('AC-R75-6: tail contains role-stamp lines naming role + round', () => {
  const r = runBuilder(['--emit', 'tail', '--role', 'REVIEWER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('# THIS SESSION ROLE: REVIEWER'), 'role-stamp role line absent');
  assert.ok(r.stdout.includes('# Round: R75'), 'role-stamp round line absent');
});

// AC-R75-7: full bundle = prefix + '\n' + tail (concatenation invariant).
test('AC-R75-7: full = prefix + LF + tail', () => {
  const p = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const t = runBuilder(['--emit', 'tail', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const f = runBuilder(['--emit', 'full', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(p.status, 0); assert.equal(t.status, 0); assert.equal(f.status, 0);
  assert.equal(f.stdout, p.stdout + '\n' + t.stdout);
});

// AC-R75-8: measure-cache-effect.js emits a JSON object with the prescribed
// field shape, all numeric counts > 0, prefix_sha256 a valid hex digest.
test('AC-R75-8: measure-cache-effect.js emits JSON with prescribed fields', () => {
  const r = spawnSync('node', [MEASURER, '--round', ROUND, '--project-root', PROJECT_ROOT], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `measurer exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.round, 'R75');
  assert.ok(typeof out.prefix_bytes === 'number' && out.prefix_bytes > 0);
  assert.ok(typeof out.prefix_sha256 === 'string' && /^[0-9a-f]{64}$/.test(out.prefix_sha256));
  for (const role of ['IMPLEMENTER', 'REVIEWER', 'MEMORIAL-UPDATER']) {
    assert.ok(typeof out.tail_bytes[role] === 'number' && out.tail_bytes[role] > 0, `tail_bytes.${role} missing or non-positive`);
    assert.ok(typeof out.tail_tokens_est[role] === 'number' && out.tail_tokens_est[role] > 0);
  }
  assert.equal(out.chars_per_token, 3.5);
  assert.ok(typeof out.estimated_cache_hit_savings_percent_per_2nd_plus_session === 'number');
  assert.equal(out.measurer_version, '0.1.0');
});

// AC-R75-9: R73 anti-regression — tier-router.js still produces a valid
// classification for a known fixture (R72 directive). Mirrors q73's AC-R73-1
// shape; failure here is the directive halt #4 R73-router-regression trigger.
test('AC-R75-9: R73 anti-regression — tier-router.js classifies R72 fixture', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'tier-router-fixtures', 'R72-directive.md');
  const r = spawnSync('node', [ROUTER, '--directive', fixture, '--mode', 'heuristic'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `router exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.ok(['full', 'audit', 'implementer-only', 'coordinator-only'].includes(out.tier));
  assert.ok(typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1);
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
});

// AC-R75-10: R74 anti-regression — mu-model-select.js default-haiku branch.
// Uses F1 fixture (corpus-style no-marker directive) to confirm Branch 4
// returns claude-haiku-4-5-20251001 with the canonical rationale string.
test('AC-R75-10: R74 anti-regression — mu-model-select.js default-haiku on F1', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'mu-model-select-fixtures', 'F1-default-haiku.md');
  const r = spawnSync('node', [MU_SELECT, '--directive', fixture, '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `selector exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.rationale, 'default haiku (no cross-round-pattern marker)');
  assert.deepEqual(out.decision_path, ['default_haiku']);
});

// AC-R75-11: R74 anti-regression — mu-model-select.js Class A promotion
// (cross-project promotion marker) returns claude-sonnet-4-6 with class A
// decision_path. Uses F2 fixture.
test('AC-R75-11: R74 anti-regression — mu-model-select.js class A on F2', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'mu-model-select-fixtures', 'F2-class-A-promotion.md');
  const r = spawnSync('node', [MU_SELECT, '--directive', fixture, '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `selector exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.deepEqual(out.decision_path, ['marker_match', 'class_A']);
});
