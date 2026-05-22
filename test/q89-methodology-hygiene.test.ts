import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = resolve(__dirname, '..');
const ROUND_START_SHA = 'db232d9';

function gitShow(sha: string, path: string): string {
  return execSync(`git show ${sha}:${path}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function readFile(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

function sedLines(content: string, from: number, to: number): string {
  const lines = content.split('\n');
  return lines.slice(from - 1, to).join('\n');
}

function tailLines(content: string, fromLine: number): string {
  return content.split('\n').slice(fromLine - 1).join('\n');
}

// bash $() strips trailing newlines; normalize both sides of byte-identity checks to match
function norm(s: string): string {
  return s.replace(/\n+$/, '');
}

// ── AC-R89-1: MEMORIAL-PHASE-3.md byte-identity ───────────────────────────
test('AC-R89-1: MEMORIAL-PHASE-3.md body byte-identical to sed-n 58,1720p of pre-R89 MEMORIAL.md', () => {
  assert.ok(existsSync(join(REPO_ROOT, 'coordination/MEMORIAL-PHASE-3.md')), 'MEMORIAL-PHASE-3.md must exist');
  const preR89Memorial = gitShow(ROUND_START_SHA, 'coordination/MEMORIAL.md');
  const expected = sedLines(preR89Memorial, 58, 1720);
  const shardContent = readFile('coordination/MEMORIAL-PHASE-3.md');
  // Skip 12-line header (lines 1-12), body starts at line 13
  const actual = tailLines(shardContent, 13);
  assert.equal(norm(actual), norm(expected), 'MEMORIAL-PHASE-3.md body must be byte-identical to sed-n 58,1720p of pre-R89 MEMORIAL.md');
});

// ── AC-R89-2: MEMORIAL-PHASE-4.md byte-identity ───────────────────────────
test('AC-R89-2: MEMORIAL-PHASE-4.md body byte-identical to sed-n 1721,2752p of pre-R89 MEMORIAL.md', () => {
  assert.ok(existsSync(join(REPO_ROOT, 'coordination/MEMORIAL-PHASE-4.md')), 'MEMORIAL-PHASE-4.md must exist');
  const preR89Memorial = gitShow(ROUND_START_SHA, 'coordination/MEMORIAL.md');
  const expected = sedLines(preR89Memorial, 1721, 2752);
  const shardContent = readFile('coordination/MEMORIAL-PHASE-4.md');
  const actual = tailLines(shardContent, 13);
  assert.equal(norm(actual), norm(expected), 'MEMORIAL-PHASE-4.md body must be byte-identical to sed-n 1721,2752p of pre-R89 MEMORIAL.md');
});

// ── AC-R89-3: NEXT-ROLE-PHASE-4.md byte-identity ──────────────────────────
test('AC-R89-3: NEXT-ROLE-PHASE-4.md body byte-identical to sed-n 127,7961p of pre-R89 NEXT-ROLE.md', () => {
  assert.ok(existsSync(join(REPO_ROOT, 'coordination/NEXT-ROLE-PHASE-4.md')), 'NEXT-ROLE-PHASE-4.md must exist');
  const preR89NextRole = gitShow(ROUND_START_SHA, 'coordination/NEXT-ROLE.md');
  const expected = sedLines(preR89NextRole, 127, 7961);
  const shardContent = readFile('coordination/NEXT-ROLE-PHASE-4.md');
  const actual = tailLines(shardContent, 13);
  assert.equal(norm(actual), norm(expected), 'NEXT-ROLE-PHASE-4.md body must be byte-identical to sed-n 127,7961p of pre-R89 NEXT-ROLE.md');
});

// ── AC-R89-4: CLAUDE-ARCHITECT.md REINFORCED count ≤ 30 ───────────────────
test('AC-R89-4: CLAUDE-ARCHITECT.md has ≤30 REINFORCED block entries after R89 consolidation', () => {
  const content = readFile('CLAUDE-ARCHITECT.md');
  const count = content.split('\n').filter(l => l.startsWith('# REINFORCED')).length;
  assert.ok(count <= 30, `CLAUDE-ARCHITECT.md has ${count} REINFORCED entries (must be ≤30)`);
});

// ── AC-R89-5: CLAUDE-IMPLEMENTER.md REINFORCED count ≤ 30 (AC-R36-21 FLIP) ─
test('AC-R89-5: CLAUDE-IMPLEMENTER.md has ≤30 REINFORCED block entries after R89 folding (AC-R36-21 FLIP)', () => {
  const content = readFile('CLAUDE-IMPLEMENTER.md');
  const count = content.split('\n').filter(l => l.startsWith('# REINFORCED')).length;
  assert.ok(count <= 30, `CLAUDE-IMPLEMENTER.md has ${count} REINFORCED entries (must be ≤30)`);
});

// ── AC-R89-6: check-claude-md-thresholds.sh exits 0 ──────────────────────
test('AC-R89-6: scripts/check-claude-md-thresholds.sh exists and exits 0 at post-R89 state', () => {
  const scriptPath = join(REPO_ROOT, 'scripts/check-claude-md-thresholds.sh');
  assert.ok(existsSync(scriptPath), 'scripts/check-claude-md-thresholds.sh must exist');
  let exitCode = 0;
  try {
    execSync(`bash "${scriptPath}"`, { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e: unknown) {
    exitCode = (e as NodeJS.ErrnoException & { status?: number }).status ?? 1;
  }
  assert.equal(exitCode, 0, 'check-claude-md-thresholds.sh must exit 0 at post-R89 state');
});

// ── AC-R89-7: Active MEMORIAL.md R88 entries preserved ────────────────────
test('AC-R89-7: active MEMORIAL.md preserves R88 entries byte-identical to pre-R89 source', () => {
  const preR89Memorial = gitShow(ROUND_START_SHA, 'coordination/MEMORIAL.md');
  // R88 entries were at lines 2753-2825 of pre-R89 MEMORIAL.md
  const preR89R88Block = sedLines(preR89Memorial, 2753, 2825);
  const currentMemorial = readFile('coordination/MEMORIAL.md');
  // R88 content should appear somewhere in the current (reset) MEMORIAL.md
  assert.ok(
    currentMemorial.includes(preR89R88Block),
    'active MEMORIAL.md must contain R88 entries byte-identical to pre-R89 source (lines 2753-2825)'
  );
});

// ── AC-R89-8: Active NEXT-ROLE.md directive lines preserved ───────────────
test('AC-R89-8: active NEXT-ROLE.md preserves first 126 lines (R89 directive block) byte-identical', () => {
  const preR89NextRole = gitShow(ROUND_START_SHA, 'coordination/NEXT-ROLE.md');
  const preR89First126 = sedLines(preR89NextRole, 1, 126);
  const currentNextRole = readFile('coordination/NEXT-ROLE.md');
  const currentFirst126 = sedLines(currentNextRole, 1, 126);
  assert.equal(currentFirst126, preR89First126, 'First 126 lines of NEXT-ROLE.md must be byte-identical to pre-R89 source');
});
