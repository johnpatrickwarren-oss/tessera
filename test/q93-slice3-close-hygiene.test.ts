// test/q93-slice3-close-hygiene.test.ts
// Round R93 — Phase 5 SLICE 3 close + hygiene
// Tier: audit (methodology-only round; 8 ACs)
//
// Verifies: AC-R36-3 dropped from q36; check-no-execfilesync-spawn.sh created;
// forward-protection registry created; SPEC-AUTHORING-CHECKLIST.md gates added;
// PHASE-5-SLICE-3-CLOSE-WALK.md created; self-application gate (no subprocess-spawn).
//
// Note: does NOT use execFileSync('node', ...) — anti-spawn self-application gate (AC-R93-6).
// Anti-scope diff uses execFileSync('git', ...) which does NOT match the spawn guard pattern.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ── AC-R93-1: AC-R36-3 body absent from q36 ──────────────────────────────────
test('AC-R93-1: q36 does not contain AC-R36-3 test body', () => {
  const q36Path = join(ROOT, 'test', 'q36-phase2-close-walk.test.ts');
  const content = readFileSync(q36Path, 'utf8');
  assert.ok(
    !content.includes("AC-R36-3: no other test files carry execFileSync node --test pattern"),
    'AC-R36-3 test body must be absent from q36 (dropped at R93 per Approach A redesign)',
  );
});

// ── AC-R93-2: check-no-execfilesync-spawn.sh exists + contains guard ─────────
test('AC-R93-2: scripts/check-no-execfilesync-spawn.sh exists and contains execFileSync guard', () => {
  const hookPath = join(ROOT, 'scripts', 'check-no-execfilesync-spawn.sh');
  assert.ok(existsSync(hookPath), `hook script must exist at ${hookPath}`);
  const content = readFileSync(hookPath, 'utf8');
  assert.ok(
    content.includes('execFileSync'),
    'hook script must reference the execFileSync pattern it guards against',
  );
});

// ── AC-R93-3: forward-protection registry exists + references AC-R36-3 ───────
test('AC-R93-3: coordination/FORWARD-PROTECTION-AC-REGISTRY.md exists and references AC-R36-3', () => {
  const registryPath = join(ROOT, 'coordination', 'FORWARD-PROTECTION-AC-REGISTRY.md');
  assert.ok(existsSync(registryPath), `registry must exist at ${registryPath}`);
  const content = readFileSync(registryPath, 'utf8');
  assert.ok(
    content.includes('AC-R36-3'),
    'registry must document AC-R36-3 (the dropped AC)',
  );
});

// ── AC-R93-4: SPEC-AUTHORING-CHECKLIST.md has fail-set enumeration gate ──────
test('AC-R93-4: SPEC-AUTHORING-CHECKLIST.md contains fail-set enumeration gate phrase', () => {
  const checklistPath = join(ROOT, 'coordination', 'SPEC-AUTHORING-CHECKLIST.md');
  assert.ok(existsSync(checklistPath), `checklist must exist at ${checklistPath}`);
  const content = readFileSync(checklistPath, 'utf8');
  // Exact command literal from R91 MAJOR-4 lesson (must appear verbatim per AC spec)
  assert.ok(
    content.includes("node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'"),
    "SPEC-AUTHORING-CHECKLIST.md must contain the verbatim fail-set enumeration command from R91 MAJOR-4 lesson",
  );
});

// ── AC-R93-5: SPEC-AUTHORING-CHECKLIST.md has forward-protection-walk gate ───
test('AC-R93-5: SPEC-AUTHORING-CHECKLIST.md contains forward-protection AC registry gate', () => {
  const checklistPath = join(ROOT, 'coordination', 'SPEC-AUTHORING-CHECKLIST.md');
  const content = readFileSync(checklistPath, 'utf8');
  assert.ok(
    content.includes('forward-protection AC registry'),
    "SPEC-AUTHORING-CHECKLIST.md must contain the 'forward-protection AC registry' gate phrase (R91 CRITICAL-1 lesson)",
  );
});

// ── AC-R93-6: self-application gate — q93 itself does not use subprocess-spawn ─
test('AC-R93-6: q93 test source does not use execFileSync node subprocess-spawn pattern', () => {
  // Read the .ts source (authoritative for what the developer wrote)
  const selfTsPath = join(ROOT, 'test', 'q93-slice3-close-hygiene.test.ts');
  const content = readFileSync(selfTsPath, 'utf8');
  const spawnPattern = /execFileSync\s*\(\s*['"]node['"]/;
  assert.ok(
    !spawnPattern.test(content),
    "q93 itself must NOT use execFileSync('node', ...) — self-application gate (R91 CRITICAL-1)",
  );
});

// ── AC-R93-7: anti-scope diff ⊆ ALLOWED_SET ──────────────────────────────────
test('AC-R93-7: anti-scope diff fe74c64..HEAD ⊆ ALLOWED_SET', () => {
  const ROUND_START_SHA = 'fe74c64';
  const ALLOWED_PATTERN =
    /^(test\/q36-phase2-close-walk\.test\.ts|scripts\/check-no-execfilesync-spawn\.sh|scripts\/finalize-round\.sh|coordination\/FORWARD-PROTECTION-AC-REGISTRY\.md|coordination\/SPEC-AUTHORING-CHECKLIST\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|coordination\/PHASE-5-SLICE-3-CLOSE-WALK\.md|coordination\/MEMORIAL\.md|test\/q93-slice3-close-hygiene\.test\.ts|coordination\/specs\/Q-R93-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination\/reviews\/REVIEWER-REPORT-R93\.md|coordination\/NEXT-ROLE\.md|coordination\/logs\/ROUND-R93-.*)$/;

  const diffOutput = execFileSync(
    'git',
    ['diff', `${ROUND_START_SHA}..HEAD`, '--name-only'],
    { encoding: 'utf8', cwd: ROOT },
  );

  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter((p) => !ALLOWED_PATTERN.test(p));
  assert.deepStrictEqual(
    violations,
    [],
    `Anti-scope violations (files outside R93 ALLOWED_SET): ${violations.join(', ')}`,
  );
});

// ── AC-R93-8: PHASE-5-SLICE-3-CLOSE-WALK.md exists + references R90 and R92 ─
test('AC-R93-8: coordination/PHASE-5-SLICE-3-CLOSE-WALK.md exists and references R90 and R92', () => {
  const slicePath = join(ROOT, 'coordination', 'PHASE-5-SLICE-3-CLOSE-WALK.md');
  assert.ok(existsSync(slicePath), `SLICE-3 close walk must exist at ${slicePath}`);
  const content = readFileSync(slicePath, 'utf8');
  assert.ok(content.includes('R90'), 'close walk must reference R90 (engine extraction round)');
  assert.ok(content.includes('R92'), 'close walk must reference R92 (deferred DS adoption round)');
});
