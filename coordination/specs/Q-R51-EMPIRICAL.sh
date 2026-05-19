#!/bin/bash
# Q-R51-EMPIRICAL.sh — Empirical verifier for R51 acceptance criteria.
#
# Implements Rule 1 sub-class (empirical-command-attestation) for all 16 ACs.
# Conventions (R49+): assert_eq for exact counts; grep -c || true; no vacuous meta-ACs.
# Exact counts: ACs use `== expected` throughout (Tightening 4 self-applied: all 7
# presence-check phrases appear exactly once; assert_ge replaced with assert_eq).
#
# Usage:  scripts/verify-empirical-acs.sh R51
# Or:     bash coordination/specs/Q-R51-EMPIRICAL.sh
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

echo "=== Q-R51-EMPIRICAL.sh ==="
echo ""

# ── AC-R51-1: REINFORCED count = 30 ──────────────────────────────────────────
echo "AC-R51-1: grep -c '^# REINFORCED' CLAUDE-IMPLEMENTER.md"
ACTUAL=$(grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-1 REINFORCED count" "30" "$ACTUAL"
echo ""

# ── AC-R51-2a: HALT-DISCIPLINE heading says 8 sub-variants ───────────────────
echo "AC-R51-2a: HALT-DISCIPLINE composite heading count"
ACTUAL=$(grep "^# REINFORCED — HALT-DISCIPLINE (composite;" CLAUDE-IMPLEMENTER.md | grep -o "[0-9]* sub-variants" | grep -o "^[0-9]*" || echo "NOT_FOUND")
assert_eq "AC-R51-2a HALT-DISCIPLINE" "8" "$ACTUAL"
echo ""

# ── AC-R51-2b: SPEC-PRESCRIPTION-FIDELITY heading says 11 sub-variants ───────
echo "AC-R51-2b: SPEC-PRESCRIPTION-FIDELITY composite heading count"
ACTUAL=$(grep "^# REINFORCED — SPEC-PRESCRIPTION-FIDELITY (composite;" CLAUDE-IMPLEMENTER.md | grep -o "[0-9]* sub-variants" | grep -o "^[0-9]*" || echo "NOT_FOUND")
assert_eq "AC-R51-2b SPEC-PRESCRIPTION-FIDELITY" "11" "$ACTUAL"
echo ""

# ── AC-R51-2c: ATTESTATION-SCOPE-FIDELITY heading says 6 sub-variants ────────
echo "AC-R51-2c: ATTESTATION-SCOPE-FIDELITY composite heading count"
ACTUAL=$(grep "^# REINFORCED — ATTESTATION-SCOPE-FIDELITY (composite;" CLAUDE-IMPLEMENTER.md | grep -o "[0-9]* sub-variants" | grep -o "^[0-9]*" || echo "NOT_FOUND")
assert_eq "AC-R51-2c ATTESTATION-SCOPE-FIDELITY" "6" "$ACTUAL"
echo ""

# ── AC-R51-2d: CITATION-AND-ARITHMETIC-ACCURACY heading says 7 sub-variants ──
echo "AC-R51-2d: CITATION-AND-ARITHMETIC-ACCURACY composite heading count"
ACTUAL=$(grep "^# REINFORCED — CITATION-AND-ARITHMETIC-ACCURACY (composite;" CLAUDE-IMPLEMENTER.md | grep -o "[0-9]* sub-variants" | grep -o "^[0-9]*" || echo "NOT_FOUND")
assert_eq "AC-R51-2d CITATION-AND-ARITHMETIC-ACCURACY" "7" "$ACTUAL"
echo ""

# ── AC-R51-2e: PRE-EMIT-GRILLING-COMPLETENESS-GATE heading says 5 sub-variants
echo "AC-R51-2e: PRE-EMIT-GRILLING-COMPLETENESS-GATE composite heading count"
ACTUAL=$(grep "^# REINFORCED — PRE-EMIT-GRILLING-COMPLETENESS-GATE (composite;" CLAUDE-IMPLEMENTER.md | grep -o "[0-9]* sub-variants" | grep -o "^[0-9]*" || echo "NOT_FOUND")
assert_eq "AC-R51-2e PRE-EMIT-GRILLING-COMPLETENESS-GATE" "5" "$ACTUAL"
echo ""

# ── AC-R51-3a: R47 CRITICAL-1 lesson preserved (circular with no base case) ──
echo "AC-R51-3a: R47 CRITICAL-1 distinctive phrase present"
ACTUAL=$(grep -c "circular with no base case" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3a R47-CRITICAL-1 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3b: R47 MAJOR-1 lesson preserved ──────────────────────────────────
echo "AC-R51-3b: R47 MAJOR-1 distinctive phrase present"
ACTUAL=$(grep -c "Liar's Paradox, self-match, or incidental hit" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3b R47-MAJOR-1 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3c: R47 MAJOR-2 lesson preserved ──────────────────────────────────
echo "AC-R51-3c: R47 MAJOR-2 distinctive phrase present"
ACTUAL=$(grep -c "structurally fixed by this round" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3c R47-MAJOR-2 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3d: R47 MINOR-3 lesson preserved ──────────────────────────────────
echo "AC-R51-3d: R47 MINOR-3 distinctive phrase present"
ACTUAL=$(grep -c "non-termination event — equivalent to" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3d R47-MINOR-3 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3e: R48 MAJOR-1+MINOR-1 lesson preserved ─────────────────────────
echo "AC-R51-3e: R48 MAJOR-1+MINOR-1 distinctive phrase present"
ACTUAL=$(grep -c "The verifier then printed a stale display value" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3e R48-MAJOR-1 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3f: R48 MINOR-2 lesson preserved ──────────────────────────────────
echo "AC-R51-3f: R48 MINOR-2 distinctive phrase present"
ACTUAL=$(grep -c "§ 3 says one thing; § 5 says another; next reader cannot resolve" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3f R48-MINOR-2 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-3g: R48 MINOR-3 lesson preserved ──────────────────────────────────
echo "AC-R51-3g: R48 MINOR-3 distinctive phrase present"
ACTUAL=$(grep -c "only observable by" CLAUDE-IMPLEMENTER.md || true)
assert_eq "AC-R51-3g R48-MINOR-3 phrase" "1" "$ACTUAL"
echo ""

# ── AC-R51-4: CLAUDE-MEMORIAL.md re-accretion guard present ──────────────────
echo "AC-R51-4: CLAUDE-MEMORIAL.md contains 'Re-accretion guard (R51)'"
ACTUAL=$(grep -c "Re-accretion guard (R51)" CLAUDE-MEMORIAL.md || true)
assert_eq "AC-R51-4 re-accretion guard" "1" "$ACTUAL"
echo ""

# ── AC-R51-5: Test baseline = 361/356/2/3 ────────────────────────────────────
echo "AC-R51-5: node --test test/*.test.js produces 361/356/2/3"
TEST_OUTPUT=$(node --test test/*.test.js 2>&1)
T=$(echo "$TEST_OUTPUT" | grep -E "^ℹ tests " | grep -o "[0-9]*$" || echo "0")
P=$(echo "$TEST_OUTPUT" | grep -E "^ℹ pass " | grep -o "[0-9]*$" || echo "0")
F=$(echo "$TEST_OUTPUT" | grep -E "^ℹ fail " | grep -o "[0-9]*$" || echo "0")
S=$(echo "$TEST_OUTPUT" | grep -E "^ℹ skipped " | grep -o "[0-9]*$" || echo "0")
echo "  Observed: tests=$T pass=$P fail=$F skip=$S"
assert_eq "AC-R51-5 tests" "361" "$T"
assert_eq "AC-R51-5 pass" "356" "$P"
assert_eq "AC-R51-5 fail" "2" "$F"
assert_eq "AC-R51-5 skip" "3" "$S"
echo ""

# ── AC-R51-6: Q-R51-EMPIRICAL.sh bash syntax valid ───────────────────────────
echo "AC-R51-6: bash -n coordination/specs/Q-R51-EMPIRICAL.sh"
BASH_RESULT=$(bash -n coordination/specs/Q-R51-EMPIRICAL.sh 2>&1 && echo "ok" || echo "fail")
assert_eq "AC-R51-6 bash syntax" "ok" "$BASH_RESULT"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "=== Summary: $PASS PASS / $FAIL FAIL ==="
[ "$FAIL" -eq 0 ]
