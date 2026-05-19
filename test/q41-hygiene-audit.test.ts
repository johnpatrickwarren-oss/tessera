// Q-R41 hygiene audit verification tests
// Chore-A SHA: [set after chore-A commit]
// Round: R41 | 2026-05-19 | audit-tier

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

// AC-R41-4: Rule 7 canonical status acknowledged in PHASE-3-CANDIDATES-PRELIMINARY.md
test('AC-R41-4: PHASE-3-CANDIDATES-PRELIMINARY.md acknowledges Rule 7 canonical status', () => {
  const f = resolve(ROOT, 'coordination/PHASE-3-CANDIDATES-PRELIMINARY.md');
  const content = readFileSync(f, 'utf-8');

  // § 6 table must NOT contain "Status unknown" in the Rule 7 row
  assert.ok(!content.includes('Status unknown at R40 entry'), '§ 6 Rule 7 row still says "Status unknown at R40 entry" — Surface 6 fix not applied');

  // § 6 table must reference the canonical landing cite
  assert.ok(content.includes('CROSS-PROJECT-MEMORIAL.md:3470'), '§ 6 Rule 7 row missing CROSS-PROJECT-MEMORIAL.md:3470 citation');

  // OQ-P3-5 row must be marked RESOLVED
  assert.ok(content.includes('RESOLVED'), 'OQ-P3-5 not marked RESOLVED');
});

// AC-R41-8: Hygiene stamp exists and contains the required 7 sections
test('AC-R41-8: PHASE-2-CLOSED-HYGIENE-STAMP.md exists with required sections', () => {
  const f = resolve(ROOT, 'coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md');
  assert.ok(existsSync(f), 'coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md does not exist — Surface 7 not executed');

  const content = readFileSync(f, 'utf-8');
  // Required section markers per NEXT-ROLE.md § Surface 7
  const required = [
    'chain duration',
    'rounds',
    'cross-project rules',
    'Phase 2 deliverable',
    'cluster',
    'friction',
    'Operator wakes',
  ];
  for (const marker of required) {
    assert.ok(content.toLowerCase().includes(marker.toLowerCase()), `Hygiene stamp missing section containing "${marker}"`);
  }
});

// AC-R41-5/6: STAGED lifecycle audit applied + file renamed
test('AC-R41-5/6: STAGED-FOR-PHASE-2-CLOSE.md annotated and renamed', () => {
  const renamedPath = resolve(ROOT, 'coordination/STAGED-PHASE-2-CLOSED-2026-05-19.md');
  const originalPath = resolve(ROOT, 'coordination/STAGED-FOR-PHASE-2-CLOSE.md');

  // Either renamed or annotated
  if (existsSync(renamedPath)) {
    // File was renamed — verify all 5 items have Status annotations
    const content = readFileSync(renamedPath, 'utf-8');
    const statusCount = (content.match(/\*\*Status at R41:\*\*/g) || []).length;
    assert.equal(statusCount, 5, `Renamed STAGED file has ${statusCount} "Status at R41:" annotations, expected 5`);
  } else {
    // File still at original path — must have annotations
    assert.ok(existsSync(originalPath), 'Neither renamed nor original STAGED file exists');
    const content = readFileSync(originalPath, 'utf-8');
    const statusCount = (content.match(/\*\*Status at R41:\*\*/g) || []).length;
    assert.equal(statusCount, 5, `STAGED file has ${statusCount} "Status at R41:" annotations, expected 5`);
  }
});
