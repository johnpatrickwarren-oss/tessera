import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve as pathResolve, join as pathJoin } from 'node:path';

const REPO_ROOT = pathResolve(__dirname, '..');

test('AC-R95-1: Category A defunct ACs absent from 5 representative test files', () => {
  const checks: Array<{ file: string; pattern: string }> = [
    { file: 'test/q18-phase2-slice1-topology-substrate.test.ts', pattern: "test('AC-R18-7:" },
    { file: 'test/q20-verdict-grouper-cluster-event-scope.test.ts', pattern: "test('AC-R20-15:" },
    { file: 'test/q29-k8s-adapter.test.ts', pattern: "test('AC-R29-10" },
    { file: 'test/q30-nvlink-adapter.test.ts', pattern: "test('AC-R30-15:" },
    { file: 'test/q38-verification.test.ts', pattern: "test('AC-R38-2:" },
  ];
  for (const { file, pattern } of checks) {
    const src = readFileSync(pathJoin(REPO_ROOT, file), 'utf8');
    assert.equal(src.includes(pattern), false,
      `${file} must NOT contain '${pattern}' (defunct Category A AC deleted by R95)`);
  }
});

test('AC-R95-2: Category B+C defunct ACs absent from q90 and q91', () => {
  const q90 = readFileSync(pathJoin(REPO_ROOT, 'test/q90-engine-package-extract.test.ts'), 'utf8');
  const q91 = readFileSync(pathJoin(REPO_ROOT, 'test/q91-engine-package-consumption.test.ts'), 'utf8');
  assert.equal(q90.includes("test('AC-R90-1:"), false, 'q90 must not contain AC-R90-1 (deleted Category B)');
  assert.equal(q90.includes("test('AC-R90-12:"), false, 'q90 must not contain AC-R90-12 (deleted Category B)');
  assert.equal(q91.includes("test('AC-R91-3:"), false, 'q91 must not contain AC-R91-3 (deleted Category C)');
  assert.equal(q91.includes("test('AC-R91-5:"), false, 'q91 must not contain AC-R91-5 (deleted Category C)');
});

test('AC-R95-3: Category D defunct ACs absent from q93 and q94', () => {
  const q93 = readFileSync(pathJoin(REPO_ROOT, 'test/q93-slice3-close-hygiene.test.ts'), 'utf8');
  const q94 = readFileSync(pathJoin(REPO_ROOT, 'test/q94-engine-repo-extraction.test.ts'), 'utf8');
  assert.equal(q93.includes("test('AC-R93-7:"), false, 'q93 must not contain AC-R93-7 (deleted Category D)');
  assert.equal(q94.includes("test('AC-R94-11:"), false, 'q94 must not contain AC-R94-11 (deleted Category D)');
  assert.equal(q94.includes("test('AC-R94-9:"), false, 'q94 must not contain AC-R94-9 (deleted vacuous AC per R94 Reviewer MAJOR-1)');
  assert.equal(q94.includes("test('AC-R94-10:"), false, 'q94 must not contain AC-R94-10 (deleted vacuous AC per R94 Reviewer MAJOR-2)');
});

test('AC-R95-4: carry-forward anti-scope ACs retained in q90 and q91', () => {
  const q90 = readFileSync(pathJoin(REPO_ROOT, 'test/q90-engine-package-extract.test.ts'), 'utf8');
  const q91 = readFileSync(pathJoin(REPO_ROOT, 'test/q91-engine-package-consumption.test.ts'), 'utf8');
  assert.equal(q90.includes("test('AC-R90-13:"), true, 'q90 must retain AC-R90-13 (carry-forward anti-scope diff)');
  assert.equal(q91.includes("test('AC-R91-12:"), true, 'q91 must retain AC-R91-12 (carry-forward anti-scope diff)');
});

test('AC-R95-5: VENDORING-MANIFEST.md has R95 cleanup header note', () => {
  const manifest = readFileSync(pathJoin(REPO_ROOT, 'coordination', 'VENDORING-MANIFEST.md'), 'utf8');
  assert.match(manifest, /^## R95 defunct AC cleanup note/m,
    'VENDORING-MANIFEST.md must have "## R95 defunct AC cleanup note" heading');
});

test('AC-R95-6: templates/SPEC-AUTHORING-CHECKLIST.md contains R94 MAJOR-3 hard-limit gate text', () => {
  const checklistPath = pathJoin(REPO_ROOT, 'templates', 'SPEC-AUTHORING-CHECKLIST.md');
  assert.equal(existsSync(checklistPath), true, 'templates/SPEC-AUTHORING-CHECKLIST.md must exist');
  const checklist = readFileSync(checklistPath, 'utf8');
  assert.equal(
    checklist.includes('transparent disclosure of hard-limit anti-scope deviation does NOT substitute for HALT+DIAGNOSTIC+ESCALATE'),
    true,
    'SPEC-AUTHORING-CHECKLIST.md must contain R94 MAJOR-3 hard-limit gate text',
  );
});

test('AC-R95-7: coordination/NEXT-ROLE.md preserves R94 MAJOR-4 operator-decision flag', () => {
  const nextRole = readFileSync(pathJoin(REPO_ROOT, 'coordination', 'NEXT-ROLE.md'), 'utf8');
  assert.equal(
    nextRole.includes('tag immutable; options: live-with vs delete+re-tag'),
    true,
    'NEXT-ROLE.md must contain R94 MAJOR-4 operator-decision flag (preserved for operator resolution)',
  );
});
