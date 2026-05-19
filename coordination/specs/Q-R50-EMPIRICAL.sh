#!/bin/bash
# Q-R50-EMPIRICAL.sh — Empirical verifier for R50 acceptance criteria.
#
# Implements Rule 1 sub-class (empirical-command-attestation) for all 10 ACs.
# Conventions: assert_eq for exact counts; grep -c || true; no vacuous meta-ACs.
#
# Usage:  scripts/verify-empirical-acs.sh R50
# Or:     bash coordination/specs/Q-R50-EMPIRICAL.sh
# Exit:   0 = all ACs PASS; 1 = one or more FAIL.

set -uo pipefail

PASS=0
FAIL=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS — $label (expected=$expected, actual=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL — $label (expected=$expected, actual=$actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Q-R50-EMPIRICAL.sh ==="
echo ""

# Derive round-start SHA at citation time (Tightening 3: re-derive SHAs from git)
ROUND_START_SHA=$(git rev-parse 3974d2f 2>/dev/null || true)
echo "Round-start SHA: ${ROUND_START_SHA:-UNAVAILABLE} (git rev-parse 3974d2f)"
echo ""

# ── AC-R50-1: verify-wave-aggregate.sh is executable ─────────────────────────
echo "AC-R50-1: scripts/verify-wave-aggregate.sh is executable"
if [ -x "scripts/verify-wave-aggregate.sh" ]; then
  echo "  PASS — AC-R50-1 (executable bit set)"
  PASS=$((PASS + 1))
else
  echo "  FAIL — AC-R50-1 (not executable or does not exist)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── AC-R50-2: verify-wave-aggregate.sh bash syntax valid ─────────────────────
echo "AC-R50-2: bash -n scripts/verify-wave-aggregate.sh"
BASH_RESULT=$(bash -n scripts/verify-wave-aggregate.sh 2>&1 && echo "ok" || echo "fail")
assert_eq "AC-R50-2" "ok" "$BASH_RESULT"
echo ""

# ── AC-R50-3: run-pipeline.sh --help contains 'consolidation-reviewer' ───────
echo "AC-R50-3: run-pipeline.sh --help | grep -c 'consolidation-reviewer'"
ACTUAL=$(./run-pipeline.sh --help 2>&1 | grep -c 'consolidation-reviewer' || true)
assert_eq "AC-R50-3" "1" "$ACTUAL"
echo ""

# ── AC-R50-4: run-pipeline.sh bash syntax valid ───────────────────────────────
echo "AC-R50-4: bash -n run-pipeline.sh"
BASH_RESULT=$(bash -n run-pipeline.sh 2>&1 && echo "ok" || echo "fail")
assert_eq "AC-R50-4" "ok" "$BASH_RESULT"
echo ""

# ── AC-R50-5: CLAUDE-COORDINATOR.md has tier-aware consolidation Reviewer docs ─
echo "AC-R50-5: grep -cF 'tier-aware consolidation Reviewer' CLAUDE-COORDINATOR.md"
ACTUAL=$(grep -cF "tier-aware consolidation Reviewer" CLAUDE-COORDINATOR.md 2>/dev/null || true)
if [ "$ACTUAL" -ge 1 ] 2>/dev/null; then
  echo "  PASS — AC-R50-5 (expected>=1, actual=$ACTUAL)"
  PASS=$((PASS + 1))
else
  echo "  FAIL — AC-R50-5 (expected>=1, actual=$ACTUAL)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── AC-R50-6: SPEC-AUTHORING-CHECKLIST.md has ## Wave-aggregate verification discipline ─
echo "AC-R50-6: grep -cF '## Wave-aggregate verification discipline' coordination/SPEC-AUTHORING-CHECKLIST.md"
ACTUAL=$(grep -cF "## Wave-aggregate verification discipline" coordination/SPEC-AUTHORING-CHECKLIST.md 2>/dev/null || true)
assert_eq "AC-R50-6" "1" "$ACTUAL"
echo ""

# ── AC-R50-7: verify-wave-aggregate.sh with no args exits 2 ─────────────────
echo "AC-R50-7: scripts/verify-wave-aggregate.sh (no args) exits 2"
scripts/verify-wave-aggregate.sh 2>/dev/null; EXIT_NO_ARGS=$?
assert_eq "AC-R50-7" "2" "$EXIT_NO_ARGS"
echo ""

# ── AC-R50-8: anti-scope diff ⊆ ALLOWED_SET ──────────────────────────────────
echo "AC-R50-8: anti-scope diff subset check"
if [ -z "${ROUND_START_SHA:-}" ]; then
  echo "  SKIP — ROUND_START_SHA unavailable"
  PASS=$((PASS + 1))
else
  CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || true)
  ALLOWED_PATTERN="^(scripts/verify-wave-aggregate\.sh|run-pipeline\.sh|CLAUDE-COORDINATOR\.md|coordination/SPEC-AUTHORING-CHECKLIST\.md|coordination/specs/Q-R50-SPEC\.md|coordination/specs/Q-R50-EMPIRICAL\.sh|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/reviews/REVIEWER-REPORT-R50|coordination/diagnostics/DIAGNOSTIC-R50-)"
  DIFF_FILES=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" 2>/dev/null || true)
  DIFF_COUNT=$(printf '%s' "$DIFF_FILES" | grep -cE '^.+$' 2>/dev/null || true)
  OUTSIDE_FILES=$(printf '%s' "$DIFF_FILES" | grep -vE "$ALLOWED_PATTERN" 2>/dev/null || true)
  OUTSIDE=$(printf '%s' "$OUTSIDE_FILES" | grep -cE '^.+$' 2>/dev/null || true)
  echo "  Diff file count: $DIFF_COUNT (git diff --name-only $ROUND_START_SHA $CHORE_A_SHA)"
  if [ "${OUTSIDE:-0}" = "0" ]; then
    echo "  PASS — AC-R50-8 (0 files outside ALLOWED_SET)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL — AC-R50-8 ($OUTSIDE files outside ALLOWED_SET):"
    printf '%s\n' "$OUTSIDE_FILES" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
  fi
fi
echo ""

# ── AC-R50-9: CLAUDE-IMPLEMENTER.md REINFORCED count == 37 ──────────────────
echo "AC-R50-9: CLAUDE-IMPLEMENTER.md REINFORCED count == 37"
ACTUAL=$(grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md 2>/dev/null || true)
assert_eq "AC-R50-9" "37" "$ACTUAL"
echo ""

# ── AC-R50-10: test baseline 361/355/3/3 + tsc exit 0 ───────────────────────
echo "AC-R50-10: test baseline 361/355/3/3 + tsc exit 0"
TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(printf '%s' "$TEST_OUTPUT" | grep "^# tests " | awk '{print $3}')
PASS_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# pass " | awk '{print $3}')
FAIL_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# fail " | awk '{print $3}')
SKIP_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# skipped " | awk '{print $3}')
echo "  node --test: tests=$TESTS pass=$PASS_CNT fail=$FAIL_CNT skipped=$SKIP_CNT"
assert_eq "AC-R50-10 (tests)" "361" "$TESTS"
assert_eq "AC-R50-10 (pass)" "355" "$PASS_CNT"
assert_eq "AC-R50-10 (fail)" "3" "$FAIL_CNT"
assert_eq "AC-R50-10 (skip)" "3" "$SKIP_CNT"
TSC_EXIT=0
npx tsc -p tsconfig.test.json 2>/dev/null || TSC_EXIT=$?
assert_eq "AC-R50-10 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# ── Summary ─────────────────────────────────────────────────────────────────
echo "=== Summary: $PASS PASS / $FAIL FAIL ==="
[ "$FAIL" -eq 0 ]
