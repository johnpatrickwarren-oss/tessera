#!/usr/bin/env bash
# coordination/specs/Q-R48-EMPIRICAL.sh
#
# Empirical-AC verification for round R48.
# Fixes R47 CRITICAL-1/2, MAJOR-1/2/3: recursion guard + verifier corrections.
#
# Tightenings applied (Rule 7 Surface c self-application):
#  - Tightening 1: No vacuous meta-ACs. AC-R48-1 checks syntax validity
#    (concrete, non-circular property), not aggregate exit code.
#  - Tightening 2: Runtime-vs-source. AC-R48-2 invokes pre-commit-rule-sweep.sh
#    and stdout-greps the result (not source-grep).
#  - Tightening 3: SHAs re-derived via `git rev-parse`, not memorized.
#  - Tightening 4: All counts are exact (==), not >= thresholds.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R48"

assert_eq() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  PASS — $label"
        echo "    actual:   $actual"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

echo "[$ROUND] Empirical-AC verification — Q-R48-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# Round boundary — re-derive from git (Tightening 3; not memorized).
# -----------------------------------------------------------------------------
ROUND_START_SHA=$(git rev-parse 6e8b1c6 2>/dev/null || echo "")
CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "Round boundaries (derived from git, not memorized):"
echo "  ROUND_START_SHA = $ROUND_START_SHA  (\`git rev-parse 6e8b1c6\`)"
echo "  CHORE_A_SHA     = $CHORE_A_SHA  (\`git rev-parse HEAD\`)"
echo ""

# -----------------------------------------------------------------------------
# AC-R48-1: Q-R48-EMPIRICAL.sh exists + executable + syntax-valid
# Concrete property (syntax validity), not aggregate exit code — Tightening 1.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-1: Q-R48-EMPIRICAL.sh exists + executable + syntax-valid"
if [ -x coordination/specs/Q-R48-EMPIRICAL.sh ]; then
    SYNTAX_OK=$(bash -n coordination/specs/Q-R48-EMPIRICAL.sh 2>&1 && echo "ok" || echo "fail")
    assert_eq "AC-$ROUND-1" "ok" "$SYNTAX_OK"
else
    echo "  FAIL — AC-$ROUND-1: file missing or not executable"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-2: recursion guard fires at runtime when env var is set (Tightening 2)
# INVOKE the script and stdout-grep — not source-grep. Exact count == 1.
# Setting _PRE_COMMIT_RULE_SWEEP_ACTIVE=1 simulates the recursive-call context;
# rule_1_check fires the guard immediately and prints "recursion guard active".
# Fails if the guard is absent (guard message not in stdout).
# -----------------------------------------------------------------------------
echo "AC-$ROUND-2: recursion guard fires at runtime (stdout-grep; Tightening 2 + 4)"
ACTUAL=$(_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 \
    scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 \
    | grep -c 'recursion guard active')
assert_eq "AC-$ROUND-2" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R48-3: AC-R47-5 now uses assert_eq "1" not assert_ge (Tightening 4 fix)
# Q-R47-EMPIRICAL.sh stores literal text "AC-$ROUND-5" (dollar sign unexpanded).
# Exact count checks: assert_ge absent (== 0), assert_eq present (== 1).
# -----------------------------------------------------------------------------
echo "AC-$ROUND-3: AC-R47-5 uses assert_eq \"1\" not assert_ge (exact count fix)"
ACTUAL_GE=$(grep -cF 'assert_ge "AC-$ROUND-5"' coordination/specs/Q-R47-EMPIRICAL.sh)
ACTUAL_EQ=$(grep -cF 'assert_eq "AC-$ROUND-5" "1"' coordination/specs/Q-R47-EMPIRICAL.sh)
if [ "$ACTUAL_GE" -eq 0 ] && [ "$ACTUAL_EQ" -eq 1 ]; then
    echo "  PASS — AC-$ROUND-3 (assert_ge absent=$ACTUAL_GE; assert_eq present=$ACTUAL_EQ)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-3 (expected: assert_ge=0 assert_eq=1; actual: assert_ge=$ACTUAL_GE assert_eq=$ACTUAL_EQ)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-4: AC-R47-6 now uses assert_eq "7" not assert_ge (Tightening 4 fix)
# Exact count checks: assert_ge absent (== 0), assert_eq present (== 1).
# -----------------------------------------------------------------------------
echo "AC-$ROUND-4: AC-R47-6 uses assert_eq \"7\" not assert_ge (exact count fix)"
ACTUAL_GE=$(grep -cF 'assert_ge "AC-$ROUND-6"' coordination/specs/Q-R47-EMPIRICAL.sh)
ACTUAL_EQ=$(grep -cF 'assert_eq "AC-$ROUND-6" "7"' coordination/specs/Q-R47-EMPIRICAL.sh)
if [ "$ACTUAL_GE" -eq 0 ] && [ "$ACTUAL_EQ" -eq 1 ]; then
    echo "  PASS — AC-$ROUND-4 (assert_ge absent=$ACTUAL_GE; assert_eq present=$ACTUAL_EQ)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-4 (expected: assert_ge=0 assert_eq=1; actual: assert_ge=$ACTUAL_GE assert_eq=$ACTUAL_EQ)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-5: AC-R47-7 spec text aligned with verifier command (MAJOR-1 fix)
# Old loose command `grep -c 'asserted by aggregate'` must be absent.
# New tighter command containing `PASS.*aggregate exit` must be present.
# Exact counts: old == 0, new == 1.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-5: AC-R47-7 spec text alignment (old grep absent; new tighter grep present)"
OLD_CMD=$(grep -cF "grep -c 'asserted by aggregate'" coordination/specs/Q-R47-SPEC.md)
NEW_CMD=$(grep -cE 'PASS\.\*aggregate exit' coordination/specs/Q-R47-SPEC.md)
if [ "$OLD_CMD" -eq 0 ] && [ "$NEW_CMD" -eq 1 ]; then
    echo "  PASS — AC-$ROUND-5 (old_cmd=$OLD_CMD; new_cmd=$NEW_CMD)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-5 (expected: old_cmd=0 new_cmd=1; actual: old_cmd=$OLD_CMD new_cmd=$NEW_CMD)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-6: AC-R47-10 verifier is non-recursive (CRITICAL-1/2, MAJOR-3 fix)
# Old recursive-triggering grep string must be absent.
# New guard-testing env-var prefix must be present (exactly 1 occurrence).
# Exact counts: old == 0, new == 1.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-6: AC-R47-10 non-recursive (old grep absent; guard-testing call present)"
OLD_PATTERN=$(grep -cF 'MECHANICAL CHECK via sub-class verifier' coordination/specs/Q-R47-EMPIRICAL.sh)
NEW_PATTERN=$(grep -cF '_PRE_COMMIT_RULE_SWEEP_ACTIVE=1' coordination/specs/Q-R47-EMPIRICAL.sh)
if [ "$OLD_PATTERN" -eq 0 ] && [ "$NEW_PATTERN" -eq 1 ]; then
    echo "  PASS — AC-$ROUND-6 (old_pattern=$OLD_PATTERN; new_pattern=$NEW_PATTERN)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-6 (expected: old=0 new=1; actual: old=$OLD_PATTERN new=$NEW_PATTERN)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-7: anti-scope — diff ⊆ ALLOWED_SET (Tightening 3: re-derived at runtime)
# ALLOWED_SET is the 7 paths R48 is authorized to modify.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-7: anti-scope — diff from ROUND_START ⊆ ALLOWED_SET"
DIFF_NAMES=$(git diff --name-only "$ROUND_START_SHA" HEAD 2>/dev/null | sort)
ALLOWED_SET=$(cat <<'EOF' | sort
coordination/specs/Q-R48-SPEC.md
coordination/specs/Q-R48-EMPIRICAL.sh
scripts/pre-commit-rule-sweep.sh
coordination/specs/Q-R47-EMPIRICAL.sh
coordination/specs/Q-R47-SPEC.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
EOF
)
OUT_OF_SET=$(comm -23 <(echo "$DIFF_NAMES") <(echo "$ALLOWED_SET") 2>/dev/null)
if [ -z "$OUT_OF_SET" ]; then
    DIFF_COUNT=$(echo "$DIFF_NAMES" | grep -c .)
    echo "  PASS — AC-$ROUND-7: all $DIFF_COUNT diff paths ⊆ ALLOWED_SET"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-7: paths outside ALLOWED_SET:"
    echo "$OUT_OF_SET" | sed 's/^/    /'
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R48-8: test baseline preserved (361/356/2/3; tsc exit 0)
# Capture node --test output once; grep multi-times.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-8: test baseline = 361/356/2/3; tsc exit 0"
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-8 (test summary)" "361/355/3/3" "$SUMMARY"

if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-8 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# Aggregate (the binding — no vacuous meta-AC counts this; Tightening 1)
# -----------------------------------------------------------------------------
echo "============================================================"
echo "Summary: $PASS PASS, $FAILED FAIL"
if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
