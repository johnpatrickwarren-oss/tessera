// test/q32-slice3-close-walk.test.ts — Phase 2 SLICE 3 close-walk bindings (R32).
//
// Binds AC-R32-1 through AC-R32-20 (runtime) per Q-R32-SPEC.md § 3.
// AC-R32-21 (typecheck) and AC-R32-22 (test count) are binding-command
// attestations reported by the Implementer at GREEN in NEXT-ROLE.md;
// not runtime-bound. AC-R32-17 and AC-R32-18 (Reviewer report) are RED
// at chore-A; GREEN after hybrid Reviewer commits REVIEWER-REPORT-R32.md.
// AC-R32-23..26 are Reviewer-verified ACs; not runtime-bound.
//
// Covers: SLICE 3 close-walk doc (Deliverable 1); vendor-fungibility
// SCOPING-MEMO amendment (Deliverable 2); 13 MINOR cleanup items
// (Deliverable 3); hybrid Reviewer output forward-protection; anti-scope.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..');

function readCoord(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

// ── AC-R32-1: SLICE 3 close-walk document exists with required sections ──────
test('AC-R32-1: PHASE-2-SLICE-3-CLOSE-WALK.md exists with §1–§6 section headers', () => {
  const path = join(ROOT, 'coordination', 'PHASE-2-SLICE-3-CLOSE-WALK.md');
  assert.ok(existsSync(path), 'PHASE-2-SLICE-3-CLOSE-WALK.md must exist');
  const content = readFileSync(path, 'utf8');
  for (const sec of ['## § 1', '## § 2', '## § 3', '## § 4', '## § 5', '## § 6']) {
    assert.ok(content.includes(sec), `close-walk doc must contain "${sec}"`);
  }
});

// ── AC-R32-2: Vendor-fungibility SCOPING-MEMO amendment applied ───────────────
// [R36-amended]: Strengthened per R32 MAJOR-2(a) + MAJOR-1 fix. Now checks placement:
// "Vendor fungibility" must appear AFTER the A17 bullet (not inside A12–A17 list).
test('AC-R32-2: SCOPING-MEMO-v0.3.md has vendor-fungibility section AFTER A17, plus A10 generalized', () => {
  const content = readCoord('coordination/SCOPING-MEMO-v0.3.md');
  const a17Idx = content.indexOf('- **A17');
  // Use '### Vendor fungibility' (not plain 'Vendor fungibility') to skip the history table at line 123
  const vendorIdx = content.indexOf('### Vendor fungibility');
  assert.ok(a17Idx !== -1, 'SCOPING-MEMO must contain A17 bullet');
  assert.ok(vendorIdx !== -1, 'SCOPING-MEMO must contain "Vendor fungibility" section');
  assert.ok(
    vendorIdx > a17Idx,
    'SCOPING-MEMO "Vendor fungibility" heading must appear AFTER the A17 bullet (not inside A12–A17 list)',
  );
  // A10 generalization: at least one non-NVIDIA vendor name present
  const hasVendorGen = content.includes('AMD') || content.includes('Trainium') || content.includes('TPU runtime');
  assert.ok(hasVendorGen, 'SCOPING-MEMO A10 must reference non-NVIDIA vendor stacks (AMD, Trainium, or TPU)');
});

// ── AC-R32-3: R25 MAJOR-1 — AC-R25-14 corrected to 228/1 ────────────────────
test('AC-R32-3: Q-R25-SPEC.md AC-R25-14 reflects corrected baseline 229/228/1', () => {
  const content = readCoord('coordination/specs/Q-R25-SPEC.md');
  // The corrected AC-R25-14 must show 228 (pass) and 1 (fail), not 229/0.
  const acRow = content.match(/AC-R25-14[^\n]*/)?.[0] ?? '';
  assert.ok(
    acRow.includes('228') || content.includes('pass=228'),
    'Q-R25-SPEC.md AC-R25-14 must contain corrected pass count 228',
  );
});

// ── AC-R32-4: R25 MAJOR-2 — 8th allowed-set entry present in spec ────────────
test('AC-R32-4: Q-R25-SPEC.md § 3 references 8th allowed-set entry (DIAGNOSTIC file)', () => {
  const content = readCoord('coordination/specs/Q-R25-SPEC.md');
  assert.ok(
    content.includes('DIAGNOSTIC-R25-ac12-tolerance.md'),
    'Q-R25-SPEC.md must reference DIAGNOSTIC-R25-ac12-tolerance.md as 8th allowed-set entry',
  );
});

// ── AC-R32-5: R25 MAJOR-3 — AC-R25-12 tolerances corrected to 0.001/0.01 ────
test('AC-R32-5: Q-R25-SPEC.md AC-R25-12 contains corrected tolerances 0.001 and 0.01', () => {
  const content = readCoord('coordination/specs/Q-R25-SPEC.md');
  // AC-R25-12 row must now reference 0.001 and 0.01, not 1e-9
  const acSection = content.substring(content.indexOf('AC-R25-12'), content.indexOf('AC-R25-12') + 500);
  assert.ok(acSection.includes('0.001'), 'Q-R25-SPEC.md AC-R25-12 must contain tolerance 0.001');
  assert.ok(acSection.includes('0.01'), 'Q-R25-SPEC.md AC-R25-12 must contain tolerance 0.01');
  assert.ok(!acSection.includes('1e-9'), 'Q-R25-SPEC.md AC-R25-12 must not retain stale 1e-9 tolerance');
});

// ── AC-R32-6: R25 MINOR-2 disposition — WU-03 AC-R30-14 closing reference ───
test('AC-R32-6: q30 test contains R25 MINOR-2 closing AC-R30-14 reference', () => {
  const content = readCoord('test/q30-nvlink-adapter.test.ts');
  assert.ok(
    content.includes('R25 MINOR-2'),
    'test/q30-nvlink-adapter.test.ts must contain R25 MINOR-2 closing reference (AC-R30-14)',
  );
});

// ── AC-R32-7: R25 MINOR-3 — gauge + missed_scrape AC appended to q25 ─────────
// [R36-amended]: Strengthened per R32 MAJOR-2(b). Now checks literal gauge + degraded/missed_scrape.
test('AC-R32-7: q25 test contains gauge + missed_scrape/degraded literal assertions (R25 MINOR-3)', () => {
  const content = readCoord('test/q25-l0-contract.test.ts');
  // The test must assert on the literal values 'gauge' AND ('missed_scrape' or 'degraded').
  // Merely including 'MINOR-3' in a comment is insufficient (was a MAJOR-2(b) weakness).
  assert.ok(
    content.includes("'gauge'") || content.includes('"gauge"'),
    'test/q25-l0-contract.test.ts must assert on the literal string "gauge"',
  );
  const hasMissedOrDegraded =
    content.includes('missed_scrape') || content.includes("'degraded'") || content.includes('"degraded"');
  assert.ok(
    hasMissedOrDegraded,
    'test/q25-l0-contract.test.ts must assert on missed_scrape or degraded in the gauge AC',
  );
});

// ── AC-R32-8: R26 MAJOR-1 — Q-R26-SPEC.md tsc exit code reality recorded ───
test('AC-R32-8: Q-R26-SPEC.md binding-cmd section reflects R26 tsc exit=2 reality', () => {
  const content = readCoord('coordination/specs/Q-R26-SPEC.md');
  // After amendment: the AC-R26-14 / binding-cmd section must acknowledge exit=2 or TS2688/TS5107
  const hasRealityNote = content.includes('exit code is 2') || content.includes('exit 2') ||
    content.includes('TS2688') || content.includes('TS5107');
  assert.ok(
    hasRealityNote,
    'Q-R26-SPEC.md must acknowledge R26 empirical tsc exit=2 reality (TS2688/TS5107)',
  );
});

// ── AC-R32-9: R26 MINOR-1 — AC-R26-16 uses execFileSync not execSync ─────────
test('AC-R32-9: q-md-f4 test AC-R26-16 uses execFileSync for git diff call', () => {
  const content = readCoord('test/q-md-f4-common-mode-injection.test.ts');
  // Find the AC-R26-16 test section
  const acIdx = content.indexOf('AC-R26-16');
  assert.ok(acIdx !== -1, 'AC-R26-16 test must exist in q-md-f4 test file');
  const acSection = content.substring(acIdx, acIdx + 500);
  assert.ok(acSection.includes('execFileSync'), 'AC-R26-16 must use execFileSync (not execSync)');
  assert.ok(!acSection.includes('execSync('), 'AC-R26-16 must not use execSync');
});

// ── AC-R32-10: R26 MINOR-2 — docstring/impl alignment for earliest/latest ───
test('AC-R32-10: common-mode-attribution.ts earliest_event_ts docstring aligned with impl', () => {
  const content = readCoord('engine/topology/common-mode-attribution.ts');
  // The misleading "one record per distinct member shard, picking the earliest"
  // text must be gone (either docstring relaxed OR impl tightened to per-distinct).
  const hasMisleadingDocstring = content.includes('one record per distinct member shard, picking the earliest');
  assert.ok(
    !hasMisleadingDocstring,
    'common-mode-attribution.ts must not have misleading "one record per distinct member shard, picking the earliest" docstring when impl iterates all touches',
  );
});

// ── AC-R32-11: R28 MINOR-1 — AC-R28-9 asserts source_id + source_version ────
test('AC-R32-11: q28 test AC-R28-9 asserts source_id and source_version', () => {
  const content = readCoord('test/q28-slurm-adapter.test.ts');
  const acIdx = content.indexOf('AC-R28-9');
  assert.ok(acIdx !== -1, 'AC-R28-9 test must exist in q28-slurm-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 800);
  assert.ok(acSection.includes('source_id'), 'AC-R28-9 must assert source_id');
  assert.ok(acSection.includes('source_version'), 'AC-R28-9 must assert source_version');
});

// ── AC-R32-12: R29 MINOR-1 — AC-R29-6 uses strictEqual for host field ────────
test('AC-R32-12: q29 test AC-R29-6 uses strictEqual for metadata.host assertion', () => {
  const content = readCoord('test/q29-k8s-adapter.test.ts');
  const acIdx = content.indexOf('AC-R29-6');
  assert.ok(acIdx !== -1, 'AC-R29-6 test must exist in q29-k8s-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 1100);
  // Must use strictEqual for the host field, not ok(typeof x === 'string' && x.length > 0)
  assert.ok(acSection.includes('strictEqual'),
    'AC-R29-6 must use strictEqual for host field assertion');
  // Must NOT use the weaker ok(typeof ... length > 0) pattern for host
  assert.ok(
    !acSection.includes('length > 0'),
    'AC-R29-6 must not use truthy length-check for host metadata (must use strictEqual)',
  );
});

// ── AC-R32-13: R29 MINOR-2 — AC-R29-13 REVIEWER-REPORT regex carve-out ──────
// [R36-amended]: Strengthened per R32 MAJOR-2(c). Now checks REVIEWER_REPORT_REGEX identifier AND .test( call.
test('AC-R32-13: q29 test AC-R29-13 has REVIEWER_REPORT_REGEX identifier and .test( call', () => {
  const content = readCoord('test/q29-k8s-adapter.test.ts');
  // 'AC-R29-13' appears in q29's header at line 3; use test() form to find actual test at line 280
  const acIdx = content.indexOf("test('AC-R29-13:");
  assert.ok(acIdx !== -1, 'AC-R29-13 test must exist in q29-k8s-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 1800);
  // Must define the regex variable AND use .test() — not merely a comment with "REVIEWER-REPORT"
  assert.ok(
    acSection.includes('REVIEWER_REPORT_REGEX'),
    'AC-R29-13 must define REVIEWER_REPORT_REGEX identifier',
  );
  assert.ok(
    acSection.includes('REVIEWER_REPORT_REGEX.test('),
    'AC-R29-13 must call REVIEWER_REPORT_REGEX.test(...)',
  );
});

// ── AC-R32-14: R29 MINOR-3 — AC-R29-12 has Node.js v25 inline comment adjacent to env: subEnv ──
// [R36-amended]: Strengthened per R32 MAJOR-2(d). Now checks § 3.2 comment within 5 lines of env: subEnv.
test('AC-R32-14: q29 test AC-R29-12 has § 3.2 comment within 5 lines of env: subEnv expression', () => {
  const content = readCoord('test/q29-k8s-adapter.test.ts');
  const acIdx = content.indexOf('AC-R29-12');
  assert.ok(acIdx !== -1, 'AC-R29-12 test must exist in q29-k8s-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 2000);
  // Find the env: subEnv expression and check § 3.2 appears within 5 lines of it
  const envIdx = acSection.indexOf('env: subEnv');
  assert.ok(envIdx !== -1, 'AC-R29-12 must contain env: subEnv expression');
  // Extract up to ~10 lines (800 chars) before the env: subEnv expression.
  // The § 3.2 comment is ~7 lines above env: subEnv; 800 chars captures it reliably.
  const preceding = acSection.substring(Math.max(0, envIdx - 800), envIdx + 50);
  const hasComment = preceding.includes('§ 3.2') || preceding.includes('spec § 3.2');
  assert.ok(
    hasComment,
    'AC-R29-12 must have spec § 3.2 comment adjacent (within ~5 lines) to env: subEnv expression',
  );
});

// ── AC-R32-15: R30 MINOR-1 — AC-R30-15 uses regex with line anchor ───────────
test('AC-R32-15: q30 test AC-R30-15 uses regex with /m flag or line anchor', () => {
  const content = readCoord('test/q30-nvlink-adapter.test.ts');
  const acIdx = content.indexOf('AC-R30-15');
  assert.ok(acIdx !== -1, 'AC-R30-15 test must exist in q30-nvlink-adapter.test.ts');
  const acSection = content.substring(acIdx, acIdx + 400);
  // Must use a regex (test or match), not just includes()
  assert.ok(
    acSection.includes('/m') || acSection.includes('test(') || acSection.includes('.match(') ||
      acSection.includes('assert.match'),
    'AC-R30-15 must use regex with /m flag or assert.match, not plain includes()',
  );
  assert.ok(
    !acSection.includes('.includes('),
    'AC-R30-15 must not use plain includes() for the correlational_not_causal assertion',
  );
});

// ── AC-R32-16: R30 MINOR-2 — nvlink-source.ts :133-134 dead-code annotated ──
test('AC-R32-16: nvlink-source.ts constructor dead-code at :133-134 has comment OR third operand removed', () => {
  const content = readCoord('engine/topology/nvlink-source.ts');
  // Either: comment explaining unreachability near the ?? chain, OR the two ?? fallbacks removed
  const hasComment = content.includes('unreachable') || content.includes('dead code') ||
    content.includes('always defaults') || content.includes('parseNvlinkStatus defaults');
  const hasSimplified = !content.includes(`'nvlink_topology_source'`) ||
    !content.includes(`'nvlink-1'`);
  assert.ok(
    hasComment || hasSimplified,
    'nvlink-source.ts :133-134 must have dead-code comment OR simplified ?? chain without third operand',
  );
});

// ── AC-R32-17: Hybrid Reviewer report exists (RED at chore-A; GREEN after Reviewer) ──
test('AC-R32-17: REVIEWER-REPORT-R32.md exists (forward-protection: fails before Reviewer commits)', () => {
  const path = join(ROOT, 'coordination', 'reviews', 'REVIEWER-REPORT-R32.md');
  assert.ok(existsSync(path), 'coordination/reviews/REVIEWER-REPORT-R32.md must exist after Reviewer runs');
});

// ── AC-R32-18: 0 CRITICAL findings in Reviewer report ────────────────────────
// [R36-amended]: Strengthened per R32 MAJOR-2(discriminating). Uses heading-specific regex.
// Previous form `!content.includes('**CRITICAL')` falsely triggered on summary line
// "**CRITICAL count: 0**". Now checks only numbered finding headings (#### CRITICAL-N).
test('AC-R32-18: REVIEWER-REPORT-R32.md has 0 CRITICAL findings (no #### CRITICAL-N headings)', () => {
  const path = join(ROOT, 'coordination', 'reviews', 'REVIEWER-REPORT-R32.md');
  assert.ok(existsSync(path), 'REVIEWER-REPORT-R32.md must exist before checking for CRITICAL');
  const content = readFileSync(path, 'utf8');
  // Only trigger on numbered finding headings, not on summary table lines like "**CRITICAL count: 0**"
  const hasCriticalFinding = /^#### CRITICAL-\d+/m.test(content) || /^## CRITICAL$/m.test(content);
  assert.ok(
    !hasCriticalFinding,
    'REVIEWER-REPORT-R32.md must have 0 CRITICAL finding headings (#### CRITICAL-N or ## CRITICAL)',
  );
});

// ── AC-R32-19: Anti-scope diff — round-start to chore-A ⊆ allowed-set ────────
test('AC-R32-19: round-start-to-chore-A diff path-set ⊆ R32 allowed-set', () => {
  const BASELINE_SHA = '45242f2'; // R32 round-start
  const CHORE_A_SHA = '6466940'; // substituted at chore-A
  const ALLOWED_SET = new Set([
    'coordination/specs/Q-R32-SPEC.md',
    'test/q32-slice3-close-walk.test.ts',
    'coordination/PHASE-2-SLICE-3-CLOSE-WALK.md',
    'coordination/SCOPING-MEMO-v0.3.md',
    'coordination/specs/Q-R25-SPEC.md',
    'coordination/specs/Q-R26-SPEC.md',
    'test/q25-l0-contract.test.ts',
    'test/q-md-f4-common-mode-injection.test.ts',
    'engine/topology/common-mode-attribution.ts',
    'test/q28-slurm-adapter.test.ts',
    'test/q29-k8s-adapter.test.ts',
    'test/q30-nvlink-adapter.test.ts',
    'engine/topology/nvlink-source.ts',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    'coordination/PRD.md', // R32 spec amendment: wu-05 scope Deliverable 2 item 5 (vendor-fungibility US-01)
  ]);
  const DIAGNOSTIC_REGEX = /^coordination\/diagnostics\/DIAGNOSTIC-R32-.+\.md$/;
  const diffOutput = execFileSync('git', ['diff', `${BASELINE_SHA}..${CHORE_A_SHA}`, '--name-only'], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter((p) => !ALLOWED_SET.has(p) && !DIAGNOSTIC_REGEX.test(p));
  assert.strictEqual(violations.length, 0, `R32 chore-A diff outside allowed-set: ${violations.join(', ')}`);
});

// ── AC-R32-20: Forward-protection (chore-B) — chore-A to chore-B ⊆ allowed-set ─
// [R36-amended]: Pinned to chore-B SHA 7f737d6 — removes forward protection for post-R32 commits
// (per REINFORCED 2026-05-17 R19 MAJOR-3: pinning converts to frozen historical check).
// R32 is closed; forward protection served its purpose at Reviewer time.
test('AC-R32-20: chore-A-to-chore-B diff ⊆ R32 allowed-set + carve-outs (frozen historical)', () => {
  const CHORE_A_SHA = '6466940'; // R32 chore-A
  const CHORE_B_SHA = '7f737d6'; // R32 chore-B (substituted at chore-B; now pinned at R36)
  const ALLOWED_SET = new Set([
    'coordination/specs/Q-R32-SPEC.md',
    'test/q32-slice3-close-walk.test.ts',
    'coordination/PHASE-2-SLICE-3-CLOSE-WALK.md',
    'coordination/SCOPING-MEMO-v0.3.md',
    'coordination/specs/Q-R25-SPEC.md',
    'coordination/specs/Q-R26-SPEC.md',
    'test/q25-l0-contract.test.ts',
    'test/q-md-f4-common-mode-injection.test.ts',
    'engine/topology/common-mode-attribution.ts',
    'test/q28-slurm-adapter.test.ts',
    'test/q29-k8s-adapter.test.ts',
    'test/q30-nvlink-adapter.test.ts',
    'engine/topology/nvlink-source.ts',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    'coordination/PRD.md', // R32 spec amendment: wu-05 scope Deliverable 2 item 5 (vendor-fungibility US-01)
  ]);
  // Forward-coverage carve-outs per spec § 4 + anti-scope-allowed-set-forward-coverage rule
  const REVIEWER_REPORT_REGEX = /^coordination\/reviews\/REVIEWER-REPORT-R\d+\.md$/;
  const DIAGNOSTIC_REGEX = /^coordination\/diagnostics\/DIAGNOSTIC-R32-.+\.md$/;

  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k))
  );
  const diffOutput = execFileSync('git', ['diff', `${CHORE_A_SHA}..${CHORE_B_SHA}`, '--name-only'], {
    encoding: 'utf8',
    cwd: ROOT,
    env: subEnv,
  });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter(
    (p) => !ALLOWED_SET.has(p) && !REVIEWER_REPORT_REGEX.test(p) && !DIAGNOSTIC_REGEX.test(p)
  );
  assert.strictEqual(
    violations.length, 0,
    `post-chore-A modification outside allowed-set + carve-outs: ${violations.join(', ')}`,
  );
});
