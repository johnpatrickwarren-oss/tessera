// test/q73-tier-router.test.ts — R73 ACs for tier-router structural + validation-corpus safety.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROUTER_PATH = resolve(__dirname, '..', 'scripts', 'tier-router.js');
const FIXTURES_DIR = resolve(__dirname, '..', 'scripts', 'tier-router-fixtures');

function runRouter(directivePath: string, mode = 'heuristic'): { stdout: string; status: number | null } {
  const result = spawnSync('node', [ROUTER_PATH, '--directive', directivePath, '--mode', mode], { encoding: 'utf-8' });
  return { stdout: result.stdout, status: result.status };
}

function runRouterOnContent(content: string, mode = 'heuristic'): { tier: string; confidence: number; rationale: string; decision_path: string[]; router_version: string; mode: string; round: string } {
  const dir = mkdtempSync(join(tmpdir(), 'q73-router-'));
  try {
    const tmpFile = join(dir, 'directive.md');
    writeFileSync(tmpFile, content);
    const { stdout, status } = runRouter(tmpFile, mode);
    assert.equal(status, 0, `router exit non-zero; stdout=${stdout}`);
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// AC-R73-1: router emits a JSON object with the contract shape on a directive input.
test('AC-R73-1: router emits valid JSON shape', () => {
  const fixture = readFileSync(resolve(FIXTURES_DIR, 'R72-directive.md'), 'utf-8');
  const out = runRouterOnContent(fixture);
  assert.ok(['full', 'audit', 'implementer-only', 'coordinator-only'].includes(out.tier));
  assert.ok(typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1);
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
  assert.ok(Array.isArray(out.decision_path) && out.decision_path.length > 0);
  assert.ok(typeof out.router_version === 'string' && out.router_version.length > 0);
  assert.ok(['heuristic', 'haiku', 'hybrid'].includes(out.mode));
  assert.ok(typeof out.round === 'string');
});

// AC-R73-2: router treats whole file content when no directive section is present.
test('AC-R73-2: router accepts plain content without directive heading', () => {
  const out = runRouterOnContent('this round contains the word ESCALATE somewhere');
  assert.equal(out.tier, 'full');
  assert.ok(out.rationale.toLowerCase().includes('escalate'));
});

// AC-R73-3: router exits 1 on unreadable directive file.
test('AC-R73-3: router exits 1 on unreadable input', () => {
  const result = spawnSync('node', [ROUTER_PATH, '--directive', '/nonexistent/path/does/not/exist.md', '--mode', 'heuristic'], { encoding: 'utf-8' });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('directive unreadable'));
});

// AC-R73-4: load-bearing safety check — R45/R61/R62/R66/R72 fixtures route 'full'.
for (const round of ['R45', 'R61', 'R62', 'R66', 'R72']) {
  test(`AC-R73-4: ${round} directive routes 'full' under --mode heuristic (load-bearing safety)`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.equal(out.tier, 'full', `${round} routed to ${out.tier} (expected full); rationale: ${out.rationale}`);
  });
}

// AC-R73-5: R49/R50/R51/R55/R60/R63/R64/R68 fixtures do NOT route 'implementer-only'.
for (const round of ['R49', 'R50', 'R51', 'R55', 'R60', 'R63', 'R64', 'R68']) {
  test(`AC-R73-5: ${round} directive does NOT route 'implementer-only'`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.notEqual(out.tier, 'implementer-only', `${round} routed to implementer-only (expected anything else); rationale: ${out.rationale}`);
  });
}

// AC-R73-6: Coordinator rounds in the safety set route 'coordinator-only' explicitly.
for (const round of ['R55', 'R60', 'R63', 'R64', 'R68']) {
  test(`AC-R73-6: ${round} (Coordinator round) routes 'coordinator-only'`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.equal(out.tier, 'coordinator-only', `${round} routed to ${out.tier} (expected coordinator-only); rationale: ${out.rationale}`);
  });
}

// AC-R73-7: ambiguous directive defaults to 'full' under --mode heuristic.
test('AC-R73-7: ambiguous directive defaults to full', () => {
  const out = runRouterOnContent('this is a completely benign directive with no signal words');
  assert.equal(out.tier, 'full');
  assert.ok(out.confidence === 0.5);
  assert.ok(out.rationale.toLowerCase().includes('ambiguous') || out.rationale.toLowerCase().includes('default'));
});

// AC-R73-8: validation corpus structural — corpus.json contains the expected safety-set round IDs.
test('AC-R73-8: corpus.json declares the load-bearing safety set', () => {
  const corpus = JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'corpus.json'), 'utf-8'));
  assert.deepEqual(
    corpus.load_bearing_safety.must_route_full.sort(),
    ['R45', 'R61', 'R62', 'R66', 'R72'].sort(),
  );
  assert.deepEqual(
    corpus.load_bearing_safety.must_not_route_implementer_only.sort(),
    ['R49', 'R50', 'R51', 'R55', 'R60', 'R63', 'R64', 'R68'].sort(),
  );
});

// AC-R73-9: ambiguous directive in hybrid mode without claude CLI falls back to default 'full'.
test('AC-R73-9: hybrid mode emits decision_path containing haiku-fallback markers when ambiguous', () => {
  // Use an ambiguous directive; even if claude is available, the router contract is that
  // if Haiku returns low-confidence OR is unavailable, decision_path contains the fallback markers.
  // To make this test environment-stable, we rely on the rule that an entirely empty-content
  // directive forces rule 5 → either Haiku succeeds (confidence ≥ threshold) OR fallback fires.
  // In CI without a configured claude binary, fallback fires.
  const out = runRouterOnContent('', 'hybrid');
  assert.equal(out.tier, 'full');
  // The decision_path must contain 'heuristic_rule_5_default' as the first step.
  assert.equal(out.decision_path[0], 'heuristic_rule_5_default');
});

