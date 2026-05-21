// test/q87-carry-forward-cleanup.test.ts — R87 carry-forward AC cleanup bindings.
//
// Binds AC-R87-1 through AC-R87-5 per Q-R87-SPEC.md § 4.
// AC-R87-6 (binding-command attestation: chore-A typecheck + TAP counts) and
// AC-R87-7 (anti-scope diff round-start..HEAD ⊆ ALLOWED_SET) are
// binding-command attestations reported by the Implementer in NEXT-ROLE.md;
// not runtime-bound (the runtime equivalents would self-confirm against the
// committing process's own working tree).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const Q36 = 'test/q36-phase2-close-walk.test.ts';

function readQ36(): string {
  return readFileSync(join(ROOT, Q36), 'utf8');
}

// ── AC-R87-1: AC-R36-30 + AC-R36-31 test() blocks removed ───────────────────
test('AC-R87-1: q36 contains no AC-R36-30 or AC-R36-31 test() block', () => {
  const content = readQ36();
  // Count test('AC-R36-30:' and test('AC-R36-31:' occurrences (line-anchored).
  // Anchor at start-of-line so a stale comment mention of "AC-R36-30:" elsewhere
  // does not pass this assertion.
  const r3630 = content.match(/^test\('AC-R36-30:/gm) ?? [];
  const r3631 = content.match(/^test\('AC-R36-31:/gm) ?? [];
  assert.strictEqual(r3630.length, 0, 'q36 must contain zero test() blocks for AC-R36-30');
  assert.strictEqual(r3631.length, 0, 'q36 must contain zero test() blocks for AC-R36-31');
});

// ── AC-R87-2: legacy SHA literals removed from q36 ──────────────────────────
test('AC-R87-2: q36 contains no legacy R36 SHA literals (36ab019, c49df0e)', () => {
  const content = readQ36();
  // The R87 explanatory comment (Edit 6) intentionally references both SHAs as
  // string literals inside a comment block. To bind the deletion of the executable
  // references without false-failing on the explanatory comment, scan for the SHAs
  // only inside variable-assignment contexts (`const NAME = '<sha>';`).
  const r3636ab = content.match(/=\s*'36ab019'/g) ?? [];
  const rc49d = content.match(/=\s*'c49df0e'/g) ?? [];
  assert.strictEqual(r3636ab.length, 0, 'q36 must not assign "36ab019" to any variable');
  assert.strictEqual(rc49d.length, 0, 'q36 must not assign "c49df0e" to any variable');
});

// ── AC-R87-3: R87 cleanup explanatory comment present with required citations ─
test('AC-R87-3: q36 contains R87 cleanup comment citing R62 + SPEC-AUTHORING-CHECKLIST', () => {
  const content = readQ36();
  // The comment block must be discriminating: a single bare "R87" mention in
  // the header docblock alone does not satisfy the AC. Anchor against the
  // explicit cleanup header line that Edit 6 prescribes.
  assert.ok(
    content.includes('R87 cleanup: AC-R36-30 + AC-R36-31 dropped'),
    'q36 must contain the R87 cleanup section header verbatim',
  );
  assert.ok(
    content.includes('R62 Option 1'),
    'q36 R87 cleanup comment must cite R62 Option 1 precedent',
  );
  assert.ok(
    content.includes('SPEC-AUTHORING-CHECKLIST'),
    'q36 R87 cleanup comment must cite SPEC-AUTHORING-CHECKLIST (R86 tightening)',
  );
});

// ── AC-R87-4: q36 header range citation updated to 1 through 29 ─────────────
test('AC-R87-4: q36 docblock cites "AC-R36-1 through AC-R36-29" range', () => {
  const content = readQ36();
  assert.ok(
    content.includes('AC-R36-1 through AC-R36-29'),
    'q36 header must cite "AC-R36-1 through AC-R36-29" (range updated from 1-31)',
  );
  // Negative check: the old range MUST NOT remain.
  assert.ok(
    !content.includes('AC-R36-1 through AC-R36-31'),
    'q36 header must not cite the stale "AC-R36-1 through AC-R36-31" range',
  );
});

// ── AC-R87-5: execFileSync import removed from q36 (now unused) ─────────────
test('AC-R87-5: q36 does not import execFileSync (unused after deletions)', () => {
  const content = readQ36();
  // Match the specific import statement; the symbol "execFileSync" itself may
  // appear inside string literals/comments (e.g., the R87 cleanup comment may
  // reference the deletion of `execFileSync` call sites), so anchor the
  // assertion on the import statement form rather than bare symbol presence.
  const importPattern = /import\s*\{\s*execFileSync\s*\}\s*from\s*['"]node:child_process['"]/;
  assert.ok(
    !importPattern.test(content),
    'q36 must not import execFileSync (unused after AC-R36-30/R36-31 removal)',
  );
});
