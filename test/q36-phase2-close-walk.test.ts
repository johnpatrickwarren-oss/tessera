// test/q36-phase2-close-walk.test.ts — Phase 2 close-walk bindings (R36).
//
// Binds AC-R36-1 through AC-R36-31 per Q-R36-SPEC.md § 3.
// AC-R36-28 (tsc exits 0) and AC-R36-29 (test count) are binding-command
// attestations reported by the Implementer at GREEN in NEXT-ROLE.md;
// not runtime-bound. AC-R36-31 (chore-B forward protection) is a runtime
// test added at chore-B; RED by design at chore-A.
//
// Covers: subprocess-hang fixes (D4), R32 carry-forwards (D2), R34
// carry-forwards (D3), MR-2 consolidation (D5), Phase 2 close-walk doc
// (D1), anchor backflow (D7), anti-scope protection.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..');

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

// ── AC-R36-1: q29 subprocess skip guard ─────────────────────────────────────
test('AC-R36-1: q29 AC-R29-12 skips when NODE_TEST_CONTEXT or NODE_TEST_WORKER_ID is set', () => {
  const content = readFile('test/q29-k8s-adapter.test.ts');
  const acIdx = content.indexOf('AC-R29-12');
  assert.ok(acIdx !== -1, 'AC-R29-12 test must exist in q29-k8s-adapter.test.ts');
  // window 900: skip guard is ~570 chars from the comment; need extra room
  const acSection = content.substring(acIdx, acIdx + 900);
  assert.ok(
    acSection.includes('NODE_TEST_CONTEXT') && acSection.includes('NODE_TEST_WORKER_ID'),
    'AC-R29-12 must check both NODE_TEST_CONTEXT and NODE_TEST_WORKER_ID',
  );
  assert.ok(
    acSection.includes('t.skip('),
    'AC-R29-12 must call t.skip(...) in the worker-context guard',
  );
  assert.ok(
    acSection.includes('return;'),
    'AC-R29-12 must return after t.skip() without spawning',
  );
});

// ── AC-R36-2: q34 subprocess skip guard ─────────────────────────────────────
test('AC-R36-2: q34 AC-R34-21 skips when NODE_TEST_CONTEXT or NODE_TEST_WORKER_ID is set', () => {
  const content = readFile('test/q34-event-conditional-attribution.test.ts');
  // 'AC-R34-21' appears in the file header at line 3; use test() form to reach actual test at line 362
  const acIdx = content.indexOf("test('AC-R34-21:");
  assert.ok(acIdx !== -1, 'AC-R34-21 test must exist in q34-event-conditional-attribution.test.ts');
  // window 900: skip guard body is ~600+ chars from the test() call
  const acSection = content.substring(acIdx, acIdx + 900);
  assert.ok(
    acSection.includes('NODE_TEST_CONTEXT') && acSection.includes('NODE_TEST_WORKER_ID'),
    'AC-R34-21 must check both NODE_TEST_CONTEXT and NODE_TEST_WORKER_ID',
  );
  assert.ok(
    acSection.includes('t.skip('),
    'AC-R34-21 must call t.skip(...) in the worker-context guard',
  );
  assert.ok(
    acSection.includes('return;'),
    'AC-R34-21 must return after t.skip() without spawning',
  );
});

// ── AC-R36-3: grep audit — no other subprocess-spawn in test files ───────────
test('AC-R36-3: no other test files carry execFileSync node --test pattern', () => {
  const testDir = join(ROOT, 'test');
  const testFiles = readdirSync(testDir).filter(
    (f) => f.match(/^q\d+.*\.test\.ts$/) &&
      f !== 'q29-k8s-adapter.test.ts' &&
      f !== 'q34-event-conditional-attribution.test.ts' &&
      f !== 'q36-phase2-close-walk.test.ts',  // exclude self: AC-R36-30 runs execFileSync('git')
  );
  const pattern = /execFileSync\s*\(\s*['"]node['"]/;
  const violations: string[] = [];
  for (const f of testFiles) {
    const content = readFileSync(join(testDir, f), 'utf8');
    if (pattern.test(content)) {
      violations.push(f);
    }
  }
  assert.deepStrictEqual(
    violations,
    [],
    `These test files carry execFileSync('node',...) — transitive hang risk: ${violations.join(', ')}`,
  );
});

// ── AC-R36-4: forward-protection tests stabilized (q29/q32/q34) ─────────────
test('AC-R36-4: q29 AC-R29-13, q32 AC-R32-20, q34 AC-R34-19 use pinned SHAs or fixed allowed-set', () => {
  // q29 AC-R29-13: CHORE_B_SHA pin (c55ac39). 'AC-R29-13' appears in header at line 3; use test() form.
  const q29 = readFile('test/q29-k8s-adapter.test.ts');
  const q29Idx = q29.indexOf("test('AC-R29-13:");
  assert.ok(q29Idx !== -1, 'AC-R29-13 must exist in q29-k8s-adapter.test.ts');
  const q29Section = q29.substring(q29Idx, q29Idx + 2000);
  assert.ok(
    q29Section.includes('CHORE_B_SHA') && q29Section.includes('c55ac39'),
    'AC-R29-13 must use CHORE_B_SHA = c55ac39 for forward-protection SHA pinning',
  );

  // q32 AC-R32-20: CHORE_B_SHA = 7f737d6. 'AC-R32-20' appears in header at line 3; use test() form.
  const q32 = readFile('test/q32-slice3-close-walk.test.ts');
  const q32Idx = q32.indexOf("test('AC-R32-20:");
  assert.ok(q32Idx !== -1, 'AC-R32-20 must exist in q32-slice3-close-walk.test.ts');
  const q32Section = q32.substring(q32Idx, q32Idx + 2000);
  assert.ok(
    q32Section.includes('CHORE_B_SHA') && q32Section.includes('7f737d6'),
    'AC-R32-20 must use CHORE_B_SHA = 7f737d6 for forward-protection SHA pinning',
  );

  // q34 AC-R34-19: must include STAGED-FOR-PHASE-2-CLOSE.md in ALLOWED_REGEX.
  // CHORE_B_SHA is ~2200 chars from line 295 comment; use 3000-char window.
  const q34 = readFile('test/q34-event-conditional-attribution.test.ts');
  const q34Idx = q34.indexOf('AC-R34-19');
  assert.ok(q34Idx !== -1, 'AC-R34-19 must exist in q34-event-conditional-attribution.test.ts');
  const q34Section = q34.substring(q34Idx, q34Idx + 3000);
  assert.ok(
    q34Section.includes('STAGED-FOR-PHASE-2-CLOSE'),
    'AC-R34-19 ALLOWED_REGEX must include STAGED-FOR-PHASE-2-CLOSE.md path',
  );
  assert.ok(
    q34Section.includes('CHORE_B_SHA') && q34Section.includes('cfbc526'),
    'AC-R34-19 must use CHORE_B_SHA = cfbc526 for forward-protection SHA pinning',
  );
});

// ── AC-R36-5: SCOPING-MEMO MAJOR-1 surgery ──────────────────────────────────
test('AC-R36-5: SCOPING-MEMO A14 rationale contiguous; Vendor fungibility heading after A17', () => {
  const content = readFile('coordination/SCOPING-MEMO-v0.3.md');

  // A14 rationale must be adjacent to A14 bullet (no h3 heading between A14 and A15)
  const a14Idx = content.indexOf('- **A14');
  const a15Idx = content.indexOf('- **A15');
  assert.ok(a14Idx !== -1, 'SCOPING-MEMO must contain A14 bullet');
  assert.ok(a15Idx !== -1, 'SCOPING-MEMO must contain A15 bullet');
  const a14ToA15 = content.substring(a14Idx, a15Idx);
  assert.ok(
    !(/^###\s/m.test(a14ToA15)),
    'No h3 heading must appear between A14 and A15 bullet entries',
  );

  // Vendor fungibility HEADING must appear AFTER A17.
  // Use '### Vendor fungibility' (not 'Vendor fungibility') to skip table-row occurrences earlier in the file.
  const a17Idx = content.indexOf('- **A17');
  const vendorIdx = content.indexOf('### Vendor fungibility');
  assert.ok(a17Idx !== -1, 'SCOPING-MEMO must contain A17 bullet');
  assert.ok(vendorIdx !== -1, 'SCOPING-MEMO must contain "### Vendor fungibility" heading');
  assert.ok(
    vendorIdx > a17Idx,
    'SCOPING-MEMO "### Vendor fungibility" heading must appear AFTER the A17 bullet',
  );
});

// ── AC-R36-6: AC-R32-2 placement-aware assertion catches pre-surgery state ──
test('AC-R36-6: q32 AC-R32-2 checks Vendor fungibility appears after A17, not inside list', () => {
  const content = readFile('test/q32-slice3-close-walk.test.ts');
  // Use "test('AC-R32-2:" to avoid matching "AC-R32-20" which appears in the file header
  const acIdx = content.indexOf("test('AC-R32-2:");
  assert.ok(acIdx !== -1, 'AC-R32-2 test must exist in q32-slice3-close-walk.test.ts');
  const acSection = content.substring(acIdx, acIdx + 600);
  // Must check that vendorIdx > a17Idx (placement-aware), not just that string exists
  assert.ok(
    acSection.includes('a17Idx') && acSection.includes('vendorIdx'),
    'AC-R32-2 must use a17Idx and vendorIdx for placement-aware check',
  );
  assert.ok(
    acSection.includes('vendorIdx > a17Idx'),
    'AC-R32-2 must assert vendorIdx > a17Idx (vendor heading after A17)',
  );
});

// ── AC-R36-7: AC-R32-7 strengthened — gauge + degraded literals ─────────────
test('AC-R36-7: q32 AC-R32-7 checks gauge and missed_scrape/degraded literals', () => {
  const content = readFile('test/q32-slice3-close-walk.test.ts');
  const acIdx = content.indexOf('AC-R32-7');
  assert.ok(acIdx !== -1, 'AC-R32-7 must exist in q32-slice3-close-walk.test.ts');
  const acSection = content.substring(acIdx, acIdx + 500);
  // Must check for literal string 'gauge'
  assert.ok(
    acSection.includes("'gauge'") || acSection.includes('"gauge"'),
    'AC-R32-7 must assert on the literal string "gauge"',
  );
  // Must check for missed_scrape or degraded
  const hasMissedOrDegraded =
    acSection.includes('missed_scrape') ||
    acSection.includes("'degraded'") ||
    acSection.includes('"degraded"');
  assert.ok(
    hasMissedOrDegraded,
    'AC-R32-7 must assert on missed_scrape or degraded literal',
  );
});

// ── AC-R36-8: AC-R32-13 strengthened — REVIEWER_REPORT_REGEX identifier ─────
test('AC-R36-8: q32 AC-R32-13 checks REVIEWER_REPORT_REGEX identifier and .test( call', () => {
  const content = readFile('test/q32-slice3-close-walk.test.ts');
  // Use the test() call form to find the right occurrence (not a comment substring)
  const acIdx = content.indexOf("test('AC-R32-13:");
  assert.ok(acIdx !== -1, 'AC-R32-13 test must exist in q32-slice3-close-walk.test.ts');
  const acSection = content.substring(acIdx, acIdx + 800);
  assert.ok(
    acSection.includes('REVIEWER_REPORT_REGEX'),
    'AC-R32-13 must define REVIEWER_REPORT_REGEX identifier',
  );
  assert.ok(
    acSection.includes('REVIEWER_REPORT_REGEX.test('),
    'AC-R32-13 must call REVIEWER_REPORT_REGEX.test(...)',
  );
});

// ── AC-R36-9: AC-R32-14 strengthened — § 3.2 adjacent to env: subEnv ────────
test('AC-R36-9: q32 AC-R32-14 checks § 3.2 comment within 5 lines of env: subEnv', () => {
  const content = readFile('test/q32-slice3-close-walk.test.ts');
  // Use test() form to find the right occurrence; need 900 chars to cover envIdx/preceding
  const acIdx = content.indexOf("test('AC-R32-14:");
  assert.ok(acIdx !== -1, 'AC-R32-14 test must exist in q32-slice3-close-walk.test.ts');
  const acSection = content.substring(acIdx, acIdx + 900);
  // Must check env: subEnv AND § 3.2 adjacency
  assert.ok(acSection.includes('env: subEnv'), 'AC-R32-14 must check for env: subEnv expression');
  assert.ok(
    acSection.includes('§ 3.2') || acSection.includes('spec § 3.2'),
    'AC-R32-14 must check for § 3.2 comment adjacent to env: subEnv',
  );
  // Must check adjacency (preceding/surrounding window), not mere global presence
  assert.ok(
    acSection.includes('envIdx') || acSection.includes('preceding'),
    'AC-R32-14 must use positional window check (envIdx or preceding) for adjacency',
  );
});

// ── AC-R36-10: AC-R32-18 discriminating — no false trigger on summary line ──
test('AC-R36-10: q32 AC-R32-18 does not trigger on **CRITICAL count: 0** summary line', () => {
  const content = readFile('test/q32-slice3-close-walk.test.ts');
  // Use test() form; need 800 chars to reach the regex literal on line 256
  const acIdx = content.indexOf("test('AC-R32-18:");
  assert.ok(acIdx !== -1, 'AC-R32-18 test must exist in q32-slice3-close-walk.test.ts');
  const acSection = content.substring(acIdx, acIdx + 800);
  // Must use regex for numbered headings, NOT plain includes('**CRITICAL')
  assert.ok(
    acSection.includes('CRITICAL-\\d') || acSection.includes('/^#### CRITICAL'),
    'AC-R32-18 must use regex matching /^#### CRITICAL-\\d+/m (not plain string includes)',
  );
  // Must NOT use the weak form that false-triggers on summary lines
  assert.ok(
    !acSection.includes("includes('**CRITICAL')"),
    'AC-R32-18 must not use includes("**CRITICAL") which false-triggers on summary lines',
  );
});

// ── AC-R36-11: execSync → execFileSync in q25 ───────────────────────────────
test('AC-R36-11: q25-l0-contract.test.ts uses execFileSync array form for git diff', () => {
  const content = readFile('test/q25-l0-contract.test.ts');
  // Must use execFileSync with array form
  assert.ok(
    content.includes("execFileSync('git', ['diff'") || content.includes('execFileSync("git", ["diff"'),
    'q25-l0-contract.test.ts must use execFileSync array form for git diff',
  );
  // Must import execFileSync
  assert.ok(content.includes('execFileSync'), 'q25 must import execFileSync');
  // Must NOT use execSync for git operations (bare shell string form)
  const execSyncGitPattern = /execSync\s*\(\s*['"`]git\s+diff/;
  assert.ok(
    !execSyncGitPattern.test(content),
    'q25 must not use execSync for git diff (must use execFileSync array form)',
  );
});

// ── AC-R36-12: execSync → execFileSync in q30 ───────────────────────────────
test('AC-R36-12: q30-nvlink-adapter.test.ts uses execFileSync array form for git diff', () => {
  const content = readFile('test/q30-nvlink-adapter.test.ts');
  assert.ok(
    content.includes("execFileSync('git', ['diff'") || content.includes('execFileSync("git", ["diff"'),
    'q30-nvlink-adapter.test.ts must use execFileSync array form for git diff',
  );
  assert.ok(content.includes('execFileSync'), 'q30 must import execFileSync');
  const execSyncGitPattern = /execSync\s*\(\s*['"`]git\s+diff/;
  assert.ok(
    !execSyncGitPattern.test(content),
    'q30 must not use execSync for git diff (must use execFileSync array form)',
  );
});

// ── AC-R36-13: R26 MINOR-2 impl alignment — per-distinct-shard dedup ─────────
test('AC-R36-13: common-mode-attribution.ts computes event_ts per distinct member_shard', () => {
  const content = readFile('engine/topology/common-mode-attribution.ts');
  // Must contain the per-distinct-shard comment/code
  assert.ok(
    content.includes('R26 MINOR-2') || content.includes('per-distinct-member-shard'),
    'common-mode-attribution.ts must contain R26 MINOR-2 fix marker',
  );
  // Must iterate over distinct shards (not all touches) for event_ts
  assert.ok(
    content.includes('for (const sid of distinct)'),
    'common-mode-attribution.ts must iterate over distinct shard ids for event_ts aggregation',
  );
  // The misleading "all touches" docstring must not be present
  const hasMisleadingDocstring = content.includes('one record per distinct member shard, picking the earliest');
  assert.ok(
    !hasMisleadingDocstring,
    'common-mode-attribution.ts must not have misleading "one record per distinct member shard" docstring inconsistent with per-distinct impl',
  );
});

// ── AC-R36-14: Q-R26-SPEC.md AC-R26-14 disambiguation ───────────────────────
test('AC-R36-14: Q-R26-SPEC.md AC-R26-14 has original exit-code-0 claim marked superseded', () => {
  const content = readFile('coordination/specs/Q-R26-SPEC.md');
  // AC-R26-14 appears 4 times; the AMENDED row is at line 552. Check whole-file for:
  // 1) strikethrough on the original exit-code-0 claim
  assert.ok(
    content.includes('~~then the exit code is 0') || content.includes('~~exit code is 0'),
    'Q-R26-SPEC.md must contain strikethrough on original "exit code is 0" claim at AC-R26-14',
  );
  // 2) the amendment marker
  assert.ok(
    content.includes('[R36-amended:') || content.includes('[R32-amended:'),
    'Q-R26-SPEC.md AC-R26-14 must have [Rxx-amended:] marker',
  );
  // 3) corrected exit code 2 claim
  assert.ok(
    content.includes('exit code is 2') || content.includes('exit 2'),
    'Q-R26-SPEC.md AC-R26-14 must contain the corrected "exit code is 2" claim',
  );
});

// ── AC-R36-15: q28 MINOR-3 — snap2 source_id/source_version ─────────────────
test('AC-R36-15: q28 snap2 whitespace-only case has source_id and source_version assertions', () => {
  const content = readFile('test/q28-slurm-adapter.test.ts');
  // 'AC-R28-9' appears in a header comment at line 12; use the test() call to find the actual test
  const acIdx = content.indexOf("test('AC-R28-9:");
  assert.ok(acIdx !== -1, 'AC-R28-9 test must exist in q28-slurm-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 800);
  // Must contain snap2 variable
  assert.ok(acSection.includes('snap2'), 'AC-R28-9 must define snap2 (whitespace-only case)');
  // Must assert source_id and source_version on snap2
  const snap2Start = acSection.indexOf('snap2');
  const afterSnap2 = acSection.substring(snap2Start);
  assert.ok(
    afterSnap2.includes('snap2.source_id'),
    'AC-R28-9 must assert snap2.source_id (R32 MINOR-3 fix)',
  );
  assert.ok(
    afterSnap2.includes('snap2.source_version'),
    'AC-R28-9 must assert snap2.source_version (R32 MINOR-3 fix)',
  );
});

// ── AC-R36-16: Q-R34-SPEC.md LS-3 window boundary amendment ─────────────────
test('AC-R36-16: Q-R34-SPEC.md has [R36-amended] window boundary reconciliation for LS-3', () => {
  const content = readFile('coordination/specs/Q-R34-SPEC.md');
  assert.ok(
    content.includes('[R36-amended]') || content.includes('[R36-amended — LS-3]'),
    'Q-R34-SPEC.md must contain [R36-amended] block for LS-3 window boundary reconciliation',
  );
  // Must mention the specific boundary correction (< preEnd not <= preEnd, or equivalent)
  const r36AmendsIdx = content.indexOf('[R36-amended');
  const r36Section = content.substring(r36AmendsIdx, r36AmendsIdx + 600);
  assert.ok(
    r36Section.includes('< preEnd') || r36Section.includes('exclusive') || r36Section.includes('inclusive'),
    'LS-3 [R36-amended] block must address the boundary convention (inclusive/exclusive endpoint)',
  );
});

// ── AC-R36-17: Q-R34-SPEC.md LS-4 \Z → $ fix ────────────────────────────────
test('AC-R36-17: Q-R34-SPEC.md §3.6 pseudocode uses $ not \\Z anchor', () => {
  const content = readFile('coordination/specs/Q-R34-SPEC.md');
  // Must contain [R36-amended — LS-4] amendment note
  assert.ok(
    content.includes('[R36-amended — LS-4]'),
    'Q-R34-SPEC.md must contain [R36-amended — LS-4] amendment note',
  );
  // The corrected pseudocode must use $ as the end-of-string anchor replacement.
  // Check that (?=^##\s|$) appears in the spec (the corrected lookahead).
  assert.ok(
    content.includes('(?=^##\\s|$)') || content.includes("(?=^##\\s|')"),
    'Q-R34-SPEC.md must contain corrected regex anchor (?=^##\\s|$) in LS-4 pseudocode',
  );
});

// ── AC-R36-18: SPEC-AUTHORING-CHECKLIST.md — R34 MAJOR-1 closure ─────────────
test('AC-R36-18: SPEC-AUTHORING-CHECKLIST.md exists with operator-commit ALLOWED_REGEX clause', () => {
  const path = join(ROOT, 'coordination/SPEC-AUTHORING-CHECKLIST.md');
  assert.ok(existsSync(path), 'coordination/SPEC-AUTHORING-CHECKLIST.md must exist');
  const content = readFileSync(path, 'utf8');
  // Must enumerate the operator-commit class (STAGED-FOR, WAVE-PLAN, WAVE-GATE, CLUSTER-HANDOFF)
  assert.ok(
    content.includes('STAGED-FOR') || content.includes('operator-authored methodology'),
    'SPEC-AUTHORING-CHECKLIST.md must address operator-commit class (STAGED-FOR-* files)',
  );
  assert.ok(
    content.includes('WAVE-PLAN') || content.includes('WAVE-GATE'),
    'SPEC-AUTHORING-CHECKLIST.md must address WAVE-PLAN / WAVE-GATE operator artifacts',
  );
  assert.ok(
    content.includes('CLUSTER-HANDOFF'),
    'SPEC-AUTHORING-CHECKLIST.md must address CLUSTER-HANDOFF operator artifacts',
  );
  // Must provide resolution options (regex carve-out or documentation gap)
  assert.ok(
    content.includes('carve-out') || content.includes('carve_out'),
    'SPEC-AUTHORING-CHECKLIST.md must recommend regex carve-outs or gap documentation',
  );
});

// ── AC-R36-19: CLAUDE-ARCHITECT.md R34 reinforcement appends ────────────────
test('AC-R36-19: CLAUDE-ARCHITECT.md has 3 new REINFORCED 2026-05-18 entries from STAGED Item 5', () => {
  const content = readFile('CLAUDE-ARCHITECT.md');
  // Count REINFORCED 2026-05-18 entries
  const entries = content.match(/^# REINFORCED 2026-05-18/gm) ?? [];
  assert.ok(
    entries.length >= 3,
    `CLAUDE-ARCHITECT.md must have at least 3 REINFORCED 2026-05-18 entries; found ${entries.length}`,
  );
  // Must contain the R34 MINOR-2 content: spec-internal-contradiction / boundary clauses
  assert.ok(
    content.includes('algorithmic boundary') || content.includes('boundary clause') ||
      content.includes('§ 9.8'),
    'CLAUDE-ARCHITECT.md must contain R34 MINOR-2 reinforcement (boundary clause cross-check)',
  );
  // Must contain the R34 MINOR-3 content: JavaScript regex / \Z invalid
  assert.ok(
    content.includes('\\\\Z') || content.includes('JavaScript') && content.includes('regex') ||
      content.includes('MINOR-3'),
    'CLAUDE-ARCHITECT.md must contain R34 MINOR-3 reinforcement (JS regex validation)',
  );
  // Must contain the R34 MAJOR-1 content: operator-authored methodology backflow class
  assert.ok(
    content.includes('operator-authored methodology') || content.includes('STAGED-FOR') ||
      content.includes('MAJOR-1'),
    'CLAUDE-ARCHITECT.md must contain R34 MAJOR-1 reinforcement (operator-commit class)',
  );
});

// ── AC-R36-20: CLAUDE-IMPLEMENTER.md R34 reinforcement appends ───────────────
test('AC-R36-20: CLAUDE-IMPLEMENTER.md has 3 new REINFORCED 2026-05-18 entries from STAGED Item 5', () => {
  const content = readFile('CLAUDE-IMPLEMENTER.md');
  const entries = content.match(/^# REINFORCED 2026-05-18/gm) ?? [];
  assert.ok(
    entries.length >= 3,
    `CLAUDE-IMPLEMENTER.md must have at least 3 REINFORCED 2026-05-18 entries; found ${entries.length}`,
  );
  // Must contain R34 MINOR-1: spec-vs-impl semantic conflict / NEXT-ROLE.md disclosure
  assert.ok(
    content.includes('NEXT-ROLE.md disclosure') || content.includes('semantic conflict') ||
      content.includes('spec-vs-impl'),
    'CLAUDE-IMPLEMENTER.md must contain R34 MINOR-1 reinforcement (spec-vs-impl HALT)',
  );
  // Must contain R34 MINOR-3: regex directly / content workaround
  assert.ok(
    content.includes('content workaround') || content.includes('fix the regex directly') ||
      content.includes('regex directly'),
    'CLAUDE-IMPLEMENTER.md must contain R34 MINOR-3 reinforcement (fix regex, not workaround)',
  );
  // Must contain R34 MINOR-4: by composition / full-suite count
  assert.ok(
    content.includes('by composition') || content.includes('full-suite count') ||
      content.includes('count `test()` declarations'),
    'CLAUDE-IMPLEMENTER.md must contain R34 MINOR-4 reinforcement (count by composition)',
  );
});

// ── AC-R36-21: CLAUDE-IMPLEMENTER.md reinforcement entry count ≤ 30 ──────────
test('AC-R36-21: CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2', () => {
  const content = readFile('CLAUDE-IMPLEMENTER.md');
  const entries = content.match(/^# REINFORCED/gm) ?? [];
  assert.ok(
    entries.length <= 30,
    `CLAUDE-IMPLEMENTER.md must have ≤30 REINFORCED entries after MR-2; found ${entries.length}`,
  );
  assert.ok(
    entries.length >= 20,
    `CLAUDE-IMPLEMENTER.md must have ≥20 REINFORCED entries (institutional knowledge preserved); found ${entries.length}`,
  );
});

// ── AC-R36-22: CLAUDE-COMMON.md Pass 3 promotions ───────────────────────────
test('AC-R36-22: CLAUDE-COMMON.md contains 3 MR-2 Pass-3-promoted universal patterns', () => {
  const content = readFile('CLAUDE-COMMON.md');
  // encode-actual-results-verbatim (R26 MAJOR-1 origin)
  assert.ok(
    content.includes('encode-actual-results-verbatim') || content.includes('encode actual results verbatim') ||
      content.includes('encode-actual'),
    'CLAUDE-COMMON.md must contain encode-actual-results-verbatim promotion (Pass 3)',
  );
  // data-flow-not-syntax (R30 MINOR-2 origin)
  assert.ok(
    content.includes('data-flow-not-syntax') || content.includes('data flow') && content.includes('syntax'),
    'CLAUDE-COMMON.md must contain data-flow-not-syntax promotion (Pass 3)',
  );
  // line-citation-cite-then-verify (R03/R21 origin)
  assert.ok(
    content.includes('line-citation-cite-then-verify') || content.includes('cite-then-verify') ||
      content.includes('line-citation'),
    'CLAUDE-COMMON.md must contain line-citation-cite-then-verify promotion (Pass 3)',
  );
});

// ── AC-R36-23: MR-2 self-application gate (Rule 5) ──────────────────────────
test('AC-R36-23: CLAUDE-IMPLEMENTER.md composite headings name trigger conditions explicitly', () => {
  const content = readFile('CLAUDE-IMPLEMENTER.md');
  // The file must contain composite heading markers
  assert.ok(
    content.includes('composite') || content.includes('HALT-DISCIPLINE') ||
      content.includes('AC-COVERAGE'),
    'CLAUDE-IMPLEMENTER.md must contain composite headings after MR-2 consolidation',
  );
  // Rule 5 self-application: no weak assertion patterns in the rule TEXT
  // (the rules themselves must not violate the assertion-coverage rules they document)
  const ruleText = content;
  // 'content.includes(' in rule text would be a self-violation
  const weakIncludes = /content\.includes\s*\(/g.test(ruleText);
  assert.ok(
    !weakIncludes,
    'CLAUDE-IMPLEMENTER.md rule text must not use content.includes() pattern (self-application gate)',
  );
});

// ── AC-R36-24: PHASE-2-CLOSE-WALK.md required sections ──────────────────────
test('AC-R36-24: PHASE-2-CLOSE-WALK.md exists with all 7 required sections', () => {
  const path = join(ROOT, 'coordination/PHASE-2-CLOSE-WALK.md');
  assert.ok(existsSync(path), 'coordination/PHASE-2-CLOSE-WALK.md must exist');
  const content = readFileSync(path, 'utf8');
  for (const sec of [
    '## § 1',
    '## § 2',
    '## § 3',
    '## § 4',
    '## § 5',
    '## § 6',
    '## § 7',
  ]) {
    assert.ok(content.includes(sec), `PHASE-2-CLOSE-WALK.md must contain section "${sec}"`);
  }
  // § 1 must have a SLICE deliverable table
  assert.ok(
    content.includes('SLICE 1') && content.includes('SLICE 2') &&
      content.includes('SLICE 3') && content.includes('SLICE 4'),
    '§ 1 must enumerate all 4 SLICEs',
  );
  // § 2 must mention cross-project rules
  assert.ok(
    content.includes('cross-project rule') || content.includes('6 cross-project'),
    '§ 2 must mention cross-project rules',
  );
  // § 3 must mention Phase 3 entry conditions
  assert.ok(
    content.includes('Phase 3') && (content.includes('TAGGED-FUTURE') || content.includes('HARD STOP')),
    '§ 3 must include Phase 3 entry framing with TAGGED-FUTURE or HARD STOP language',
  );
  // § 4 must mention Addition #26 D4 RECONFIRMED
  assert.ok(
    content.includes('RECONFIRMED') || content.includes('correlational_not_causal'),
    '§ 4 ADR walk must mention Addition #26 D4 RECONFIRMED',
  );
});

// ── AC-R36-25: A16 D4 RECONFIRMED at all emit sites ──────────────────────────
test('AC-R36-25: correlational_not_causal is literal type true at all emit sites', () => {
  // event-conditional-attribution.ts emit site
  const ecaContent = readFile('engine/events/event-conditional-attribution.ts');
  assert.ok(
    ecaContent.includes('correlational_not_causal: true'),
    'engine/events/event-conditional-attribution.ts must emit correlational_not_causal: true',
  );

  // common-mode-attribution.ts emit site
  const cmaContent = readFile('engine/topology/common-mode-attribution.ts');
  assert.ok(
    cmaContent.includes('correlational_not_causal: true'),
    'engine/topology/common-mode-attribution.ts must emit correlational_not_causal: true',
  );

  // PHASE-2-CLOSE-WALK.md § 4 must document RECONFIRMED finding
  const closeWalkContent = readFile('coordination/PHASE-2-CLOSE-WALK.md');
  assert.ok(
    closeWalkContent.includes('RECONFIRMED') && closeWalkContent.includes('correlational_not_causal'),
    'PHASE-2-CLOSE-WALK.md § 4 must document correlational_not_causal RECONFIRMED finding',
  );
});

// ── AC-R36-26: PR-F7 Cell 4 disposition ─────────────────────────────────────
test('AC-R36-26: PR-F7 Cell 4 has Reviewer-verified AC or explicit disposition note', () => {
  // Cell 4 disposition must appear in PHASE-2-CLOSE-WALK.md or Q-R36-SPEC.md
  const closeWalk = readFile('coordination/PHASE-2-CLOSE-WALK.md');
  const spec = readFile('coordination/specs/Q-R36-SPEC.md');
  const combinedContent = closeWalk + spec;

  // Must reference Cell 4 with a disposition (either Reviewer-verified AC or explicit evidence pointer)
  assert.ok(
    combinedContent.includes('Cell 4') || combinedContent.includes('mixed-signal'),
    'PHASE-2-CLOSE-WALK.md or Q-R36-SPEC.md must address PR-F7 Cell 4 disposition',
  );
  // Must provide an evidence pointer (AC-R26-4 or q-md-f4)
  assert.ok(
    combinedContent.includes('AC-R26-4') || combinedContent.includes('q-md-f4'),
    'Cell 4 disposition must reference AC-R26-4 or q-md-f4-common-mode-injection test as evidence',
  );
});

// ── AC-R36-27: ANCHOR-BACKFLOW-2026-05-18.md structure ──────────────────────
test('AC-R36-27: ANCHOR-BACKFLOW-2026-05-18.md exists with all 4 subprocess-hang PR sections', () => {
  const path = join(ROOT, 'coordination/ANCHOR-BACKFLOW-2026-05-18.md');
  assert.ok(existsSync(path), 'coordination/ANCHOR-BACKFLOW-2026-05-18.md must exist');
  const content = readFileSync(path, 'utf8');

  // All 4 subprocess-hang PR candidates must be present
  assert.ok(
    content.includes('pre-emit grilling') || content.includes('Pre-emit grilling'),
    'ANCHOR-BACKFLOW must contain pre-emit grilling rule (Backflow 1)',
  );
  assert.ok(
    content.includes('watchdog') || content.includes('pipeline watchdog'),
    'ANCHOR-BACKFLOW must contain pipeline watchdog section (Backflow 2)',
  );
  assert.ok(
    content.includes('orphan') || content.includes('Bash-tool'),
    'ANCHOR-BACKFLOW must contain Bash-tool orphan reaping section (Backflow 3)',
  );
  assert.ok(
    content.includes('test-isolation') || content.includes('spec template'),
    'ANCHOR-BACKFLOW must contain test-isolation failure-mode / spec template section (Backflow 4)',
  );

  // Tailscale Phase 3 capability pointer
  assert.ok(
    content.includes('Tailscale') || content.includes('tailscale'),
    'ANCHOR-BACKFLOW must contain Tailscale Phase 3 capability pointer (STAGED Item 4)',
  );

  // Coordinator memorial graduation entry
  assert.ok(
    content.includes('Coordinator') && (content.includes('graduation') || content.includes('MEMORIAL')),
    'ANCHOR-BACKFLOW must contain Coordinator memorial graduation entry',
  );
});

// ── AC-R36-30: anti-scope allowed-set (round-start to chore-A) ───────────────
test('AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set', () => {
  const ROUND_START_SHA = '36ab019';

  const ALLOWED_SET: ReadonlyArray<RegExp> = [
    /^test\/q36-phase2-close-walk\.test\.ts$/,
    /^test\/q29-k8s-adapter\.test\.ts$/,
    /^test\/q34-event-conditional-attribution\.test\.ts$/,
    /^test\/q32-slice3-close-walk\.test\.ts$/,
    /^test\/q25-l0-contract\.test\.ts$/,
    /^test\/q30-nvlink-adapter\.test\.ts$/,
    /^test\/q28-slurm-adapter\.test\.ts$/,
    /^test\/q-md-f4-common-mode-injection\.test\.ts$/,
    /^engine\/topology\/common-mode-attribution\.ts$/,
    /^coordination\/SCOPING-MEMO-v0\.3\.md$/,
    /^coordination\/specs\/Q-R32-SPEC\.md$/,
    /^coordination\/specs\/Q-R26-SPEC\.md$/,
    /^coordination\/specs\/Q-R34-SPEC\.md$/,
    /^coordination\/specs\/Q-R36-SPEC\.md$/,
    /^coordination\/PHASE-2-CLOSE-WALK\.md$/,
    /^coordination\/ANCHOR-BACKFLOW-2026-05-18\.md$/,
    /^coordination\/SPEC-AUTHORING-CHECKLIST\.md$/,
    /^CLAUDE-ARCHITECT\.md$/,
    /^CLAUDE-IMPLEMENTER\.md$/,
    /^CLAUDE-COMMON\.md$/,
    /^coordination\/MEMORIAL\.md$/,
    /^coordination\/COORDINATOR-MEMORIAL\.md$/, // TD-3: Memorial-Updater Wave 5 graduation entries
    /^coordination\/NEXT-ROLE\.md$/,
    /^coordination\/reviews\/REVIEWER-REPORT-R36(-opus|-sonnet)?\.md$/,
  ];

  let diffOutput: string;
  try {
    diffOutput = execFileSync(
      'git',
      ['diff', `${ROUND_START_SHA}..HEAD`, '--name-only'],
      { encoding: 'utf8', cwd: ROOT },
    );
  } catch (err: unknown) {
    const e = err as { stdout?: string };
    diffOutput = e.stdout ?? '';
  }

  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter((p) => !ALLOWED_SET.some((re) => re.test(p)));

  assert.deepStrictEqual(
    violations,
    [],
    `R36 anti-scope violations (paths not in ALLOWED_SET): ${violations.join(', ')}`,
  );
});

// ── AC-R36-31: chore-B forward-protection (chore-A to HEAD ⊆ post-chore-A set) ─
// Verifies that every path committed after chore-A (c49df0e) belongs to the
// post-chore-A allowed set: Reviewer report, MEMORIAL updates, NEXT-ROLE routing,
// COORDINATOR-MEMORIAL graduation, and this chore-B test file itself.
// (git diff subprocess; no transitive-hang risk; no skip guard needed.)
test('AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)', () => {
  const CHORE_A_SHA = 'c49df0e'; // R36 chore-A SHA

  const ALLOWED_LITERAL = new Set([
    'coordination/COORDINATOR-MEMORIAL.md',
    'coordination/MEMORIAL.md',
    'coordination/NEXT-ROLE.md',
    'test/q36-phase2-close-walk.test.ts',
  ]);
  // Hybrid-aware carve-out: REVIEWER-REPORT-R36 may be -opus.md or -sonnet.md
  const REVIEWER_REPORT_REGEX = /^coordination\/reviews\/REVIEWER-REPORT-R36(-opus|-sonnet)?\.md$/;

  const diffOutput = execFileSync(
    'git',
    ['diff', `${CHORE_A_SHA}..HEAD`, '--name-only'],
    { encoding: 'utf8', cwd: ROOT },
  );

  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter(
    (p) => !ALLOWED_LITERAL.has(p) && !REVIEWER_REPORT_REGEX.test(p),
  );

  assert.deepStrictEqual(
    violations,
    [],
    `post-chore-A modification outside allowed set: ${violations.join(', ')}`,
  );
});
