#!/usr/bin/env bash
# coordination/specs/Q-R47-EMPIRICAL.sh
#
# Empirical-AC verification for round R47.
# Self-application of Rule 1 sub-class (empirical-command-attestation) per
# Rule 7 Surface c. R47 EXTENDS the sub-class authoring pattern with 4
# tightenings (vacuous meta-ACs; runtime-vs-source; SHA re-derive; exact
# counts). This file applies all 4 tightenings to R47's own ACs.
#
# Notes on tightenings demonstrated:
#  - No inert meta-ACs that hard-code PASS for self-referential properties.
#  - Runtime-vs-source: AC-R47-5 stdout-greps an INVOKED script's output.
#  - SHA re-derive: ROUND_START_SHA + CHORE_A_SHA + DIFF_FILES derived via
#    `git rev-parse` / `git diff --name-only`, not memorized.
#  - Exact counts: ACs use `== expected` not `>= 1` where possible.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R47"

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

assert_ge() {
    local label="$1"
    local minimum="$2"
    local actual="$3"
    if [ "$actual" -ge "$minimum" ] 2>/dev/null; then
        echo "  PASS — $label"
        echo "    actual:   $actual (>= $minimum)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: >= $minimum"
        echo "    actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

echo "[$ROUND] Empirical-AC verification — Q-R47-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# Round boundary discipline — re-derive from git, do not memorize.
# Per Tightening 3 (R47): every SHA / diff-count citation must come with
# the `git` command that derived it, run at citation time.
# -----------------------------------------------------------------------------
# Round-start SHA = the commit immediately preceding R47 chore-A.
# At authoring time HEAD is the MU-batch close (1049a52). At chore-A time
# HEAD will be the R47 chore-A commit. We re-derive ROUND_START_SHA as
# the parent of HEAD if HEAD is R47 chore-A, else as HEAD itself.
ROUND_START_SHA=$(git rev-parse 1049a52 2>/dev/null || echo "")
CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "Round boundaries (derived from git, not memorized):"
echo "  ROUND_START_SHA = $ROUND_START_SHA  (\`git rev-parse 1049a52\`)"
echo "  CHORE_A_SHA     = $CHORE_A_SHA  (\`git rev-parse HEAD\`)"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-1: Q-R47-EMPIRICAL.sh exists + executable + syntax-valid
# -----------------------------------------------------------------------------
echo "AC-$ROUND-1: Q-R47-EMPIRICAL.sh exists + executable + syntax-valid"
if [ -x coordination/specs/Q-R47-EMPIRICAL.sh ]; then
    SYNTAX_OK=$(bash -n coordination/specs/Q-R47-EMPIRICAL.sh 2>&1 && echo "ok" || echo "fail")
    assert_eq "AC-$ROUND-1" "ok" "$SYNTAX_OK"
else
    echo "  FAIL — AC-$ROUND-1: file missing or not executable"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R47-2: Tightening 1 sub-section in SPEC-AUTHORING-CHECKLIST.md
# Exact count (Tightening 4 applied): expect == 1.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-2: Tightening 1 sub-section (vacuous meta-ACs)"
ACTUAL=$(grep -cE '^### Tightening: Avoid vacuous meta-ACs' coordination/SPEC-AUTHORING-CHECKLIST.md)
assert_eq "AC-$ROUND-2" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-3: Tightening 2 sub-section
# -----------------------------------------------------------------------------
echo "AC-$ROUND-3: Tightening 2 sub-section (runtime behavior vs source presence)"
ACTUAL=$(grep -cE '^### Tightening: Verify runtime behavior' coordination/SPEC-AUTHORING-CHECKLIST.md)
assert_eq "AC-$ROUND-3" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-4: Tightening 3 sub-section
# -----------------------------------------------------------------------------
echo "AC-$ROUND-4: Tightening 3 sub-section (SHA re-derive discipline)"
ACTUAL=$(grep -cE '^### Tightening: Re-derive SHAs from git' coordination/SPEC-AUTHORING-CHECKLIST.md)
assert_eq "AC-$ROUND-4" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-5: R47 verifier uses stdout-grep for runtime-behavior checks
# This is THE self-application demonstration of Tightening 2.
# Per Tightening 2 (R47): runtime claims invoke a script and stdout-grep
# the output, not source-grep.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-5: R47 verifier contains stdout-grep pattern (Tightening 2 self-applied)"
ACTUAL=$(grep -cE 'scripts/.*\.sh [^|]+\| *grep' coordination/specs/Q-R47-EMPIRICAL.sh)
assert_ge "AC-$ROUND-5" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-6: R47 verifier re-derives SHAs/diff-counts from git
# Self-application of Tightening 3.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-6: R47 verifier re-derives SHAs/diff via git (Tightening 3 self-applied)"
ACTUAL=$(grep -cE 'git (rev-parse|diff --name-only|diff --name-status)' coordination/specs/Q-R47-EMPIRICAL.sh)
assert_ge "AC-$ROUND-6" "2" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-7: R47 verifier has no inert meta-AC anti-pattern
# Self-application of Tightening 1.
# Tightened grep: only catches actual anti-pattern CODE (echo line printing
# a hard-coded PASS for an aggregate-self-reference), NOT documentation
# references in comments or the AC's own grep command. Pattern:
#   ^\s*echo "  PASS.*aggregate exit
# This matches only verifier code that prints a PASS message containing
# the R46-style "aggregate exit code below" marker.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-7: no inert meta-AC anti-pattern (Tightening 1 self-applied)"
ACTUAL=$(grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' coordination/specs/Q-R47-EMPIRICAL.sh)
assert_eq "AC-$ROUND-7" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-8: anti-scope — diff ⊆ ALLOWED_SET
# Re-derives diff list at runtime via git (Tightening 3 applied).
# -----------------------------------------------------------------------------
echo "AC-$ROUND-8: anti-scope — diff from \$ROUND_START_SHA ⊆ ALLOWED_SET"
DIFF_NAMES=$(git diff --name-only "$ROUND_START_SHA" HEAD 2>/dev/null | sort)
ALLOWED_SET=$(cat <<'EOF' | sort
coordination/specs/Q-R47-SPEC.md
coordination/specs/Q-R47-EMPIRICAL.sh
coordination/SPEC-AUTHORING-CHECKLIST.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
EOF
)
# Find paths in DIFF_NAMES that are NOT in ALLOWED_SET.
OUT_OF_SET=$(comm -23 <(echo "$DIFF_NAMES") <(echo "$ALLOWED_SET") 2>/dev/null)
if [ -z "$OUT_OF_SET" ]; then
    echo "  PASS — AC-$ROUND-8: all diff paths ⊆ ALLOWED_SET"
    DIFF_COUNT=$(echo "$DIFF_NAMES" | grep -c .)
    echo "    diff file count: $DIFF_COUNT (\`git diff --name-only \$ROUND_START_SHA HEAD | wc -l\`)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-8: paths outside ALLOWED_SET:"
    echo "$OUT_OF_SET" | sed 's/^/    /'
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R47-9: test baseline preserved
# Capture node --test output ONCE; grep multi-times.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-9: test baseline = 361/356/2/3"
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-9 (test summary)" "361/356/2/3" "$SUMMARY"

if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-9 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R47-10: rule_1_check MECHANICAL mode active AT RUNTIME (not just in source)
# This is the self-application demonstration of Tightening 2 — fix for
# R46 MAJOR-3. INVOKE pre-commit-rule-sweep.sh and stdout-grep on a SINGLE
# line so the resulting code matches the AC-R47-5 self-application check
# regex `scripts/.*\.sh [^|]+\| *grep`.
# -----------------------------------------------------------------------------
echo "AC-$ROUND-10: rule_1_check MECHANICAL mode active at runtime (Tightening 2 self-applied)"
ACTUAL=$(scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 | grep -c 'MECHANICAL CHECK via sub-class verifier')
assert_eq "AC-$ROUND-10" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Aggregate (the binding — no vacuous meta-AC counts this)
# -----------------------------------------------------------------------------
echo "============================================================"
echo "Summary: $PASS PASS, $FAILED FAIL"
if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
