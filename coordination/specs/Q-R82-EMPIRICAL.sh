#!/usr/bin/env bash
# Q-R82-EMPIRICAL.sh — binding-command harness for R82.
#
# Verifies the AC-bound observables (AC-R82-13 directly binds presence of
# Blocks 1, 2, 3, 4, 5; AC-R82-14 mirrors Block 5 anti-scope check; the
# structural R82 ACs are verified by `node --test`).
# Exit 0 = all blocks pass. Exit non-zero = at least one block failed;
# failing block's diagnostic emitted to stdout.
#
# Invoked by Architect at spec-emit time (probe-run; expected exit 1 at
# round-start HEAD because Implementer artifacts absent — Q-R82-SPEC-AUDIT.md
# § C.3 records the predicted probe-run output).
# Invoked by Implementer at chore-A pre-commit (expected exit 0).
# Invoked by Reviewer at audit (expected exit 0).
# Re-invokable at any HEAD >= chore-A.
#
# Cross-project rule discipline:
#   - R77 lesson: Block 4 uses `node --test --test-reporter=tap` so the
#     TAP summary lines (`# pass`, `# fail`) can be grepped reliably.
#   - R75 lesson: no `local` keywords at top level (all variables are
#     plain assignments).
#   - R79 MAJOR-1 lesson: encode actual observed values verbatim; do NOT
#     pre-amend EXPECTED_FAIL to absorb un-predicted flips. If the actual
#     `# fail` differs from EXPECTED_FAIL, Implementer MUST HALT + write
#     DIAGNOSTIC.
#   - R73 MAJOR-2 lesson: no control-flow rewrites; Implementer is forbidden
#     from rewriting `if [...]; then` blocks to `case` (or vice versa). The
#     EMPIRICAL.sh control-flow shape is part of the spec triad; deviations
#     are halt conditions.

set -uo pipefail

ROUND_START_SHA="5c3e0d9"
EXIT=0

echo "── Q-R82-EMPIRICAL.sh @ HEAD=$(git rev-parse --short HEAD)"
echo ""

# ── Block 1: typecheck exit code (AC-R82-13 binds presence) ──
echo "── Block 1: typecheck"
pnpm exec tsc -p tsconfig.test.json > /tmp/r82-block1.txt 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "Block 1 FAIL: pnpm exec tsc -p tsconfig.test.json exited $TSC_EXIT (expected 0)"
  tail -10 /tmp/r82-block1.txt
  EXIT=1
else
  echo "Block 1 PASS: tsc exit 0"
fi
echo ""

# ── Block 2: bundle artifact existence + size (AC-R82-3, AC-R82-13) ──
echo "── Block 2: bundle artifact"
if [ ! -f demos/engine-bundle.mjs ]; then
  echo "Block 2 FAIL: demos/engine-bundle.mjs missing (run 'pnpm build:browser')"
  EXIT=1
else
  BUNDLE_SIZE=$(wc -c < demos/engine-bundle.mjs | tr -d ' ')
  if [ "$BUNDLE_SIZE" -lt 5000 ]; then
    echo "Block 2 FAIL: demos/engine-bundle.mjs size $BUNDLE_SIZE < 5000 bytes"
    EXIT=1
  else
    echo "Block 2 PASS: demos/engine-bundle.mjs present ($BUNDLE_SIZE bytes)"
  fi
fi
echo ""

# ── Block 3: SHA-256 byte-identity Node-vs-pure-JS (AC-R82-7, AC-R82-13) ──
echo "── Block 3: SHA-256 byte-identity"
node -e "
  const { createHash } = require('node:crypto');
  let pureJsSha256;
  try {
    ({ pureJsSha256 } = require('./engine/topology-overlay.js'));
  } catch (err) {
    console.error('Block 3: pureJsSha256 not exported from engine/topology-overlay.js:', err.message);
    process.exit(2);
  }
  if (typeof pureJsSha256 !== 'function') {
    console.error('Block 3: pureJsSha256 is not a function (type=' + typeof pureJsSha256 + ')');
    process.exit(2);
  }
  const vectors = [
    { input: '', expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'abc', expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
  ];
  let ok = true;
  for (const v of vectors) {
    const n = createHash('sha256').update(v.input).digest('hex');
    const p = pureJsSha256(v.input);
    if (n !== v.expected) { console.error('Block 3: node:crypto baseline broken for input ' + JSON.stringify(v.input.slice(0, 20))); ok = false; }
    if (p !== v.expected) { console.error('Block 3: pureJsSha256 mismatch for input ' + JSON.stringify(v.input.slice(0, 20)) + ': expected=' + v.expected + ' got=' + p); ok = false; }
    if (n !== p) { console.error('Block 3: node-vs-pure divergence for input ' + JSON.stringify(v.input.slice(0, 20))); ok = false; }
  }
  process.exit(ok ? 0 : 1);
" > /tmp/r82-block3.txt 2>&1
B3_EXIT=$?
if [ "$B3_EXIT" -ne 0 ]; then
  echo "Block 3 FAIL: SHA-256 parity broken (exit $B3_EXIT)"
  cat /tmp/r82-block3.txt
  EXIT=1
else
  echo "Block 3 PASS: pureJsSha256 byte-identical to node:crypto on 3 FIPS vectors"
fi
echo ""

# ── Block 4: test pass/fail counts (R77 lesson: --test-reporter=tap; AC-R82-13) ──
echo "── Block 4: test counts"
pnpm exec node --test --test-reporter=tap test/*.test.js > /tmp/r82-block4.txt 2>&1
TEST_PASS=$(grep -E "^# pass " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_SUITES=$(grep -E "^# suites " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_SKIPPED=$(grep -E "^# skipped " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
# Predicted at chore-A (Architect § 1.4):
#   pass band [620, 625] = R81-close 607 + 14 new R82 ACs + 2 sub-tests inside AC-R82-7 + R81 forward-protection flip predicted-pass; ±2 margin.
#   fail strict 12 = R81-close 11 + 1 (R81 AC-R81-14 forward-protection flip: R81 ALLOWED regex doesn't include R82 paths).
# Carry-forward 11 from R81 close:
#   AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep,
#   AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14.
EXPECTED_PASS_MIN=620
EXPECTED_PASS_MAX=625
EXPECTED_FAIL=12
if [ -z "$TEST_FAIL" ] || [ "$TEST_FAIL" != "$EXPECTED_FAIL" ]; then
  echo "Block 4 FAIL: fail count = '${TEST_FAIL:-<empty>}'; expected $EXPECTED_FAIL (R81-close carry-forward 11 + R81 AC-R81-14 forward-protection flip = 12)"
  echo "  TAP tail:"
  tail -20 /tmp/r82-block4.txt
  EXIT=1
elif [ -z "$TEST_PASS" ] || [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 4 FAIL: pass count = '${TEST_PASS:-<empty>}'; expected in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX] (607 + 14 + 2 ± 2)"
  echo "  TAP tail:"
  tail -20 /tmp/r82-block4.txt
  EXIT=1
else
  echo "Block 4 PASS: tests=$TEST_TESTS suites=$TEST_SUITES pass=$TEST_PASS fail=$TEST_FAIL skipped=$TEST_SKIPPED"
fi
echo ""

# ── Block 5: anti-scope diff ⊆ ALLOWED_SET (AC-R82-14) ──
echo "── Block 5: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/build-browser-bundle\.ts|engine/topology-overlay\.ts|demos/demo\.html|demos/engine-bundle\.mjs|package\.json|pnpm-lock\.yaml|\.gitignore|test/q82-engine-browser-bundle\.test\.ts|coordination/specs/Q-R82-SPEC\.md|coordination/specs/Q-R82-SPEC-AUDIT\.md|coordination/specs/Q-R82-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R82\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'
UNAUTHORIZED=$(echo "$DIFF_FILES" | grep -vE "$ALLOWED" || true)
UNAUTHORIZED=$(echo "$UNAUTHORIZED" | sed '/^[[:space:]]*$/d')
if [ -n "$UNAUTHORIZED" ]; then
  echo "Block 5 FAIL: unauthorized paths in round-start..HEAD diff:"
  echo "$UNAUTHORIZED"
  EXIT=1
else
  TOTAL_DIFF_COUNT=$(echo "$DIFF_FILES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')
  echo "Block 5 PASS: $TOTAL_DIFF_COUNT files in diff, all within ALLOWED_SET"
fi
echo ""

# ── Summary ──
if [ "$EXIT" -eq 0 ]; then
  echo "── Q-R82-EMPIRICAL.sh: ALL BLOCKS PASS"
else
  echo "── Q-R82-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit $EXIT)"
fi
exit "$EXIT"
