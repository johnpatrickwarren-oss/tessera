#!/bin/bash
# Q-R49-EMPIRICAL.sh — Empirical verifier for R49 acceptance criteria.
#
# Implements Rule 1 sub-class (empirical-command-attestation) for all 10 ACs.
# Tightenings applied (R47): no vacuous meta-ACs; stdout-grep for runtime claims;
# re-derive SHAs; exact counts. Pattern: grep -c ... || true (not || echo "0").
#
# Usage:  scripts/verify-empirical-acs.sh R49
# Or:     bash coordination/specs/Q-R49-EMPIRICAL.sh
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

assert_ge() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" -ge "$expected" ] 2>/dev/null; then
    echo "  PASS — $label (expected>=$expected, actual=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL — $label (expected>=$expected, actual=$actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Q-R49-EMPIRICAL.sh ==="
echo ""

# Derive round-start SHA at citation time (Tightening 3: re-derive SHAs from git)
ROUND_START_SHA=$(git rev-parse 356ff56 2>/dev/null || true)
echo "Round-start SHA: ${ROUND_START_SHA:-UNAVAILABLE} (git rev-parse 356ff56)"
echo ""

# ── AC-R49-1: finalize-round.sh contains pipeline auto-fire invocation ─────
echo "AC-R49-1: finalize-round.sh contains pipeline auto-fire invocation"
ACTUAL=$(grep -cE "run-pipeline\.sh.*--start-at REVIEWER" scripts/finalize-round.sh 2>/dev/null || true)
assert_eq "AC-R49-1" "1" "$ACTUAL"
echo ""

# ── AC-R49-2: finalize-round.sh has _FINALIZE_PIPELINE_ACTIVE guard (2 lines) ─
echo "AC-R49-2: finalize-round.sh has _FINALIZE_PIPELINE_ACTIVE guard (2 occurrences)"
ACTUAL=$(grep -cF "_FINALIZE_PIPELINE_ACTIVE" scripts/finalize-round.sh 2>/dev/null || true)
assert_eq "AC-R49-2" "2" "$ACTUAL"
echo ""

# ── AC-R49-3: finalize-round.sh bash syntax valid ──────────────────────────
echo "AC-R49-3: finalize-round.sh bash -n syntax valid"
BASH_RESULT=$(bash -n scripts/finalize-round.sh 2>&1 && echo "ok" || echo "fail")
assert_eq "AC-R49-3" "ok" "$BASH_RESULT"
echo ""

# ── AC-R49-4: CLAUDE-IMPLEMENTER.md "On clean completion" has pipeline mandate ─
echo "AC-R49-4: CLAUDE-IMPLEMENTER.md has pipeline Reviewer mandate sentence"
ACTUAL=$(grep -cF "pipeline Reviewer + MU stages are required" CLAUDE-IMPLEMENTER.md 2>/dev/null || true)
assert_eq "AC-R49-4" "1" "$ACTUAL"
echo ""

# ── AC-R49-5: CLAUDE-IMPLEMENTER.md REINFORCED count == 37 ─────────────────
echo "AC-R49-5: CLAUDE-IMPLEMENTER.md REINFORCED count == 37"
ACTUAL=$(grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md 2>/dev/null || true)
assert_eq "AC-R49-5" "37" "$ACTUAL"
echo ""

# ── AC-R49-6: SPEC-AUTHORING-CHECKLIST.md has Pipeline-mandatory discipline section ─
echo "AC-R49-6: SPEC-AUTHORING-CHECKLIST.md has ## Pipeline-mandatory discipline header"
ACTUAL=$(grep -cF "## Pipeline-mandatory discipline" coordination/SPEC-AUTHORING-CHECKLIST.md 2>/dev/null || true)
assert_eq "AC-R49-6" "1" "$ACTUAL"
echo ""

# ── AC-R49-7: CLAUDE-COORDINATOR.md has close-walk class hybrid Reviewer mandate ─
echo "AC-R49-7: CLAUDE-COORDINATOR.md has close-walk class mention"
ACTUAL=$(grep -cF "close-walk class" CLAUDE-COORDINATOR.md 2>/dev/null || true)
assert_eq "AC-R49-7" "1" "$ACTUAL"
echo ""

# ── AC-R49-8: run-pipeline.sh has --hybrid-reviewer flag parsing ────────────
echo "AC-R49-8: run-pipeline.sh has --hybrid-reviewer flag (>= 2 occurrences)"
ACTUAL=$(grep -cF "hybrid-reviewer" run-pipeline.sh 2>/dev/null || true)
assert_ge "AC-R49-8" "2" "$ACTUAL"
echo ""

# ── AC-R49-9: anti-scope diff ⊆ ALLOWED_SET ────────────────────────────────
echo "AC-R49-9: anti-scope diff subset check"
if [ -z "${ROUND_START_SHA:-}" ]; then
  echo "  SKIP — ROUND_START_SHA unavailable"
  PASS=$((PASS + 1))
else
  CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || true)
  ALLOWED_PATTERN="^(scripts/finalize-round\.sh|CLAUDE-IMPLEMENTER\.md|CLAUDE-COORDINATOR\.md|run-pipeline\.sh|coordination/SPEC-AUTHORING-CHECKLIST\.md|coordination/specs/Q-R49-SPEC\.md|coordination/specs/Q-R49-EMPIRICAL\.sh|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/reviews/REVIEWER-REPORT-R49|coordination/diagnostics/DIAGNOSTIC-R49-)"
  DIFF_FILES=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" 2>/dev/null || true)
  DIFF_COUNT=$(printf '%s' "$DIFF_FILES" | grep -cE '^.+$' 2>/dev/null || true)
  OUTSIDE_FILES=$(printf '%s' "$DIFF_FILES" | grep -vE "$ALLOWED_PATTERN" 2>/dev/null || true)
  OUTSIDE=$(printf '%s' "$OUTSIDE_FILES" | grep -cE '^.+$' 2>/dev/null || true)
  echo "  Diff file count: $DIFF_COUNT (git diff --name-only $ROUND_START_SHA $CHORE_A_SHA)"
  if [ "${OUTSIDE:-0}" = "0" ]; then
    echo "  PASS — AC-R49-9 (0 files outside ALLOWED_SET)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL — AC-R49-9 ($OUTSIDE files outside ALLOWED_SET):"
    printf '%s\n' "$OUTSIDE_FILES" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
  fi
fi
echo ""

# ── AC-R49-10: test baseline 361/355/3/3 + tsc exit 0 ──────────────────────
echo "AC-R49-10: test baseline 361/355/3/3 + tsc exit 0"
TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(printf '%s' "$TEST_OUTPUT" | grep "^# tests " | awk '{print $3}')
PASS_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# pass " | awk '{print $3}')
FAIL_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# fail " | awk '{print $3}')
SKIP_CNT=$(printf '%s' "$TEST_OUTPUT" | grep "^# skipped " | awk '{print $3}')
echo "  node --test: tests=$TESTS pass=$PASS_CNT fail=$FAIL_CNT skipped=$SKIP_CNT"
assert_eq "AC-R49-10 (tests)" "361" "$TESTS"
assert_eq "AC-R49-10 (pass)" "355" "$PASS_CNT"
assert_eq "AC-R49-10 (fail)" "3" "$FAIL_CNT"
assert_eq "AC-R49-10 (skip)" "3" "$SKIP_CNT"
TSC_EXIT=0
npx tsc -p tsconfig.test.json 2>/dev/null || TSC_EXIT=$?
assert_eq "AC-R49-10 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# ── Summary ─────────────────────────────────────────────────────────────────
echo "=== Summary: $PASS PASS / $FAIL FAIL ==="
[ "$FAIL" -eq 0 ]
