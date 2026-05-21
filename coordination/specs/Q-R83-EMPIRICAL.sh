#!/usr/bin/env bash
# Q-R83-EMPIRICAL.sh — binding-command harness for R83.
#
# Verifies the AC-bound observables for R83 interactive control panel + state
# management. Architect invokes at spec-emit time (probe run; expected blocks
# 2/3/4 fail at round-start HEAD because Implementer hasn't built yet —
# documented in Q-R83-SPEC-AUDIT.md § C.3). Implementer invokes at chore-A
# pre-commit (expected all blocks PASS, exit 0). Reviewer invokes at audit
# (expected exit 0; re-invokable at any HEAD >= chore-A).
#
# Exit 0 = all blocks pass. Exit non-zero = at least one block failed; the
# failing block's diagnostic is emitted to stdout.
#
# Cross-project rule discipline:
#   - R77 lesson: Block 4 uses `node --test --test-reporter=tap` so TAP
#     summary lines (`# pass`, `# fail`) can be grepped reliably.
#   - R75 lesson: no `local` keywords at top level (all variables are
#     plain assignments).
#   - R79 MAJOR-1 lesson: encode actual observed values verbatim; do NOT
#     pre-amend EXPECTED_FAIL to absorb un-predicted flips. If the actual
#     `# fail` differs from EXPECTED_FAIL, Implementer MUST HALT + write
#     DIAGNOSTIC; do NOT self-amend.
#   - R82 MAJOR-1 lesson: Block 5 ALLOWED variable is gate artifact #4 of
#     the spec-amendment-ALL-gate-artifacts-propagation rule. Any
#     amendment to ALLOWED_SET MUST update spec § 3.1 narrative table +
#     spec § 3.2 regex + AC-R83-15 in-test regex + this Block 5 variable
#     in lockstep.

set -uo pipefail

ROUND_START_SHA="4c4733d"
EXIT=0

echo "── Q-R83-EMPIRICAL.sh @ HEAD=$(git rev-parse --short HEAD)"
echo ""

# ── Block 1: typecheck (binding: spec § 5.2 tsc exit + AC-R83-16 block-marker presence) ──
echo "── Block 1: typecheck"
pnpm exec tsc -p tsconfig.test.json > /tmp/r83-block1.txt 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "Block 1 FAIL: pnpm exec tsc -p tsconfig.test.json exited $TSC_EXIT (expected 0)"
  tail -20 /tmp/r83-block1.txt
  EXIT=1
else
  echo "Block 1 PASS: tsc exit 0"
fi
echo ""

# ── Block 2: control panel HTML presence (binding: AC-R83-1, AC-R83-3..9) ──
echo "── Block 2: control panel HTML presence"
DEMO_HTML="demos/demo.html"
B2_FAIL=0
if [ ! -f "$DEMO_HTML" ]; then
  echo "Block 2 FAIL: $DEMO_HTML missing"
  B2_FAIL=1
else
  # Required structural surfaces (one grep per surface; presence-only check).
  REQUIRED_PATTERNS=(
    '<section id="tessera-control-panel"'
    'id="param-drift-magnitude"'
    'id="param-window-count"'
    'id="param-alpha-threshold"'
    'id="param-target-shard"'
    'id="param-topology-size"'
    'id="param-family-a"'
    'id="param-family-b"'
    'id="param-family-c"'
    'id="param-family-d"'
    'id="param-family-e"'
    'id="btn-run"'
    'id="btn-reset-params"'
    '<option value="custom">'
  )
  for pat in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -qF "$pat" "$DEMO_HTML"; then
      echo "Block 2 FAIL: $DEMO_HTML missing pattern: $pat"
      B2_FAIL=1
    fi
  done
fi
if [ "$B2_FAIL" -eq 0 ]; then
  echo "Block 2 PASS: all 14 control-panel HTML patterns present in $DEMO_HTML"
else
  EXIT=1
fi
echo ""

# ── Block 3: state-management JS presence (binding: AC-R83-10, AC-R83-11, AC-R83-12, AC-R83-13) ──
echo "── Block 3: state-management JS presence"
B3_FAIL=0
if [ ! -f "$DEMO_HTML" ]; then
  echo "Block 3 FAIL: $DEMO_HTML missing"
  B3_FAIL=1
else
  REQUIRED_JS_PATTERNS=(
    'var R83_DEFAULTS'
    'var controlState'
    'function emitControlChange'
    "'tessera:control-change'"
    'btnRun.addEventListener'
    'btnResetParams.addEventListener'
    'controlState.driftMagnitude = R83_DEFAULTS.driftMagnitude'
    'controlState.windowCount = R83_DEFAULTS.windowCount'
  )
  for pat in "${REQUIRED_JS_PATTERNS[@]}"; do
    if ! grep -qF "$pat" "$DEMO_HTML"; then
      echo "Block 3 FAIL: $DEMO_HTML missing JS pattern: $pat"
      B3_FAIL=1
    fi
  done
  # Anti-regression: btnRun handler region must NOT import engine bundle.
  # Search for engine-bundle.mjs string near btnRun handler (within 500 chars).
  if grep -qF 'engine-bundle.mjs' "$DEMO_HTML"; then
    # R82 smoke block references engine-bundle.mjs; check the btnRun handler
    # specifically doesn't reference it. Grep for the btnRun line and inspect
    # ~500 chars after.
    if awk '/btnRun\.addEventListener/{c=20} c-->0{print}' "$DEMO_HTML" \
         | grep -qF 'engine-bundle.mjs'; then
      echo "Block 3 FAIL: btnRun handler region references engine-bundle.mjs (R84 anti-regression)"
      B3_FAIL=1
    fi
  fi
fi
if [ "$B3_FAIL" -eq 0 ]; then
  echo "Block 3 PASS: all 8 state-management JS patterns present + btnRun handler clean of engine-bundle reference"
else
  EXIT=1
fi
echo ""

# ── Block 4: test pass/fail counts (R77 lesson: --test-reporter=tap; binding: spec § 5.2) ──
echo "── Block 4: test counts"
pnpm exec node --test --test-reporter=tap test/*.test.js > /tmp/r83-block4.txt 2>&1
TEST_PASS=$(grep -E "^# pass " /tmp/r83-block4.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r83-block4.txt | head -1 | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r83-block4.txt | head -1 | awk '{print $3}')
TEST_SUITES=$(grep -E "^# suites " /tmp/r83-block4.txt | head -1 | awk '{print $3}')
TEST_SKIPPED=$(grep -E "^# skipped " /tmp/r83-block4.txt | head -1 | awk '{print $3}')
# Predicted at chore-A (Architect § 5.2):
#   tests = 652 strict (R82 close 636 + 16 new R83 ACs)
#   pass band [635, 637] (R82 close 620 + 16; ±1 PRNG/env noise margin)
#   fail strict 13 (R82 close 12 + R82 AC-R82-14 forward-protection flip)
#   skipped strict 4
EXPECTED_PASS_MIN=635
EXPECTED_PASS_MAX=637
EXPECTED_FAIL=13
if [ -z "$TEST_FAIL" ] || [ "$TEST_FAIL" != "$EXPECTED_FAIL" ]; then
  echo "Block 4 FAIL: fail count = '${TEST_FAIL:-<empty>}'; expected $EXPECTED_FAIL (R82-close carry-forward 12 + R82 AC-R82-14 forward-protection flip = 13)"
  echo "  TAP tail:"
  tail -20 /tmp/r83-block4.txt
  EXIT=1
elif [ -z "$TEST_PASS" ] || [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 4 FAIL: pass count = '${TEST_PASS:-<empty>}'; expected in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX] (R82-close 620 + 16 new R83 ACs ± 1)"
  echo "  TAP tail:"
  tail -20 /tmp/r83-block4.txt
  EXIT=1
else
  echo "Block 4 PASS: tests=$TEST_TESTS suites=$TEST_SUITES pass=$TEST_PASS fail=$TEST_FAIL skipped=$TEST_SKIPPED"
fi
echo ""

# ── Block 5: anti-scope diff ⊆ ALLOWED_SET (binding: AC-R83-15) ──
echo "── Block 5: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/build-canned-demos\.ts|demos/demo\.html|test/q83-interactive-knobs\.test\.ts|coordination/specs/Q-R83-SPEC\.md|coordination/specs/Q-R83-SPEC-AUDIT\.md|coordination/specs/Q-R83-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R83\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'
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
  echo "── Q-R83-EMPIRICAL.sh: ALL BLOCKS PASS"
else
  echo "── Q-R83-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit $EXIT)"
fi
exit "$EXIT"
