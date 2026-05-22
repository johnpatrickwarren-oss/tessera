#!/bin/bash
# Q-R89-EMPIRICAL.sh — Empirical verifier for R89 methodology hygiene round.
# Uses --test-reporter=tap per R77 reinforcement.
# Exact counts: ACs use == expected (Tightening-4 per R47 MAJOR-2 discipline).
# Run: bash coordination/specs/Q-R89-EMPIRICAL.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROUND_START_SHA="db232d9"

PASS=0
FAIL=0

assert_eq() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS — $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL — $label"
    echo "  actual:   $actual"
    echo "  expected: $expected"
    FAIL=$((FAIL + 1))
  fi
}

assert_le() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" -le "$expected" ]]; then
    echo "PASS — $label (actual=$actual ≤ $expected)"
    PASS=$((PASS + 1))
  else
    echo "FAIL — $label (actual=$actual > $expected)"
    FAIL=$((FAIL + 1))
  fi
}

assert_ge() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" -ge "$expected" ]]; then
    echo "PASS — $label (actual=$actual ≥ $expected)"
    PASS=$((PASS + 1))
  else
    echo "FAIL — $label (actual=$actual < $expected)"
    FAIL=$((FAIL + 1))
  fi
}

assert_exit0() {
  local label="$1" cmd="$2"
  if bash -c "$cmd" > /dev/null 2>&1; then
    echo "PASS — $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL — $label (command exited non-zero)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Q-R89-EMPIRICAL.sh ==="
echo "REPO_ROOT: $REPO_ROOT"
echo "ROUND_START_SHA: $ROUND_START_SHA"
echo ""

cd "$REPO_ROOT"

# ── Block 1: ALLOWED_SET check ────────────────────────────────────────────────
echo "--- Block 1: ALLOWED_SET (anti-scope diff) ---"

ALLOWED_PATTERN='^(CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-COMMON\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/NEXT-ROLE-PHASE-4\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-3\.md|coordination/MEMORIAL-PHASE-4\.md|scripts/check-claude-md-thresholds\.sh|scripts/finalize-round\.sh|test/q89-methodology-hygiene\.test\.ts|test/q89-methodology-hygiene\.test\.js|coordination/specs/Q-R89-SPEC\.md|coordination/specs/Q-R89-SPEC-AUDIT\.md|coordination/specs/Q-R89-EMPIRICAL\.sh|coordination/reviews/REVIEWER-REPORT-R89\.md|coordination/MEMORIAL\.md|coordination/logs/ROUND-R89-ROUTING\.md|coordination/logs/ROUND-R89-SUMMARY\.md)$'

DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only 2>/dev/null || true)
VIOLATORS=$(echo "$DIFF_FILES" | grep -v "^$" | grep -vE "$ALLOWED_PATTERN" || true)

if [[ -z "$VIOLATORS" ]]; then
  echo "PASS — Block 1: git diff $ROUND_START_SHA..HEAD ⊆ ALLOWED_SET"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 1: unauthorized paths in diff:"
  echo "$VIOLATORS" | sed 's/^/  /'
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Block 2: MEMORIAL-PHASE-3.md byte-identity (AC-R89-1) ────────────────────
echo "--- Block 2: MEMORIAL-PHASE-3.md byte-identity (AC-R89-1) ---"

if [[ -f "coordination/MEMORIAL-PHASE-3.md" ]]; then
  EXPECTED_3=$(git show "$ROUND_START_SHA:coordination/MEMORIAL.md" | sed -n '58,1720p')
  ACTUAL_3=$(tail -n +13 "coordination/MEMORIAL-PHASE-3.md")
  if [[ "$EXPECTED_3" == "$ACTUAL_3" ]]; then
    echo "PASS — Block 2: MEMORIAL-PHASE-3.md body byte-identical to sed-n 58,1720p of pre-R89 MEMORIAL.md"
    PASS=$((PASS + 1))
  else
    echo "FAIL — Block 2: MEMORIAL-PHASE-3.md body differs from pre-R89 source"
    diff <(echo "$EXPECTED_3") <(echo "$ACTUAL_3") | head -20
    FAIL=$((FAIL + 1))
  fi
else
  echo "FAIL — Block 2: coordination/MEMORIAL-PHASE-3.md does not exist"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Block 3: MEMORIAL-PHASE-4.md byte-identity (AC-R89-2) ────────────────────
echo "--- Block 3: MEMORIAL-PHASE-4.md byte-identity (AC-R89-2) ---"

if [[ -f "coordination/MEMORIAL-PHASE-4.md" ]]; then
  EXPECTED_4=$(git show "$ROUND_START_SHA:coordination/MEMORIAL.md" | sed -n '1721,2752p')
  ACTUAL_4=$(tail -n +13 "coordination/MEMORIAL-PHASE-4.md")
  if [[ "$EXPECTED_4" == "$ACTUAL_4" ]]; then
    echo "PASS — Block 3: MEMORIAL-PHASE-4.md body byte-identical to sed-n 1721,2752p of pre-R89 MEMORIAL.md"
    PASS=$((PASS + 1))
  else
    echo "FAIL — Block 3: MEMORIAL-PHASE-4.md body differs from pre-R89 source"
    diff <(echo "$EXPECTED_4") <(echo "$ACTUAL_4") | head -20
    FAIL=$((FAIL + 1))
  fi
else
  echo "FAIL — Block 3: coordination/MEMORIAL-PHASE-4.md does not exist"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Block 4: NEXT-ROLE-PHASE-4.md byte-identity (AC-R89-3) ───────────────────
echo "--- Block 4: NEXT-ROLE-PHASE-4.md byte-identity (AC-R89-3) ---"

if [[ -f "coordination/NEXT-ROLE-PHASE-4.md" ]]; then
  EXPECTED_NR=$(git show "$ROUND_START_SHA:coordination/NEXT-ROLE.md" | sed -n '127,7961p')
  ACTUAL_NR=$(tail -n +13 "coordination/NEXT-ROLE-PHASE-4.md")
  if [[ "$EXPECTED_NR" == "$ACTUAL_NR" ]]; then
    echo "PASS — Block 4: NEXT-ROLE-PHASE-4.md body byte-identical to sed-n 127,7961p of pre-R89 NEXT-ROLE.md"
    PASS=$((PASS + 1))
  else
    echo "FAIL — Block 4: NEXT-ROLE-PHASE-4.md body differs from pre-R89 source"
    diff <(echo "$EXPECTED_NR") <(echo "$ACTUAL_NR") | head -20
    FAIL=$((FAIL + 1))
  fi
else
  echo "FAIL — Block 4: coordination/NEXT-ROLE-PHASE-4.md does not exist"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Block 5: CLAUDE-ARCHITECT.md REINFORCED count ≤ 30 (AC-R89-4) ────────────
echo "--- Block 5: CLAUDE-ARCHITECT.md REINFORCED count (AC-R89-4) ---"

ARCH_COUNT=$(grep -c '^# REINFORCED' "CLAUDE-ARCHITECT.md" || echo "0")
assert_le "AC-R89-4: CLAUDE-ARCHITECT.md REINFORCED count ≤ 30" "$ARCH_COUNT" "30"
echo ""

# ── Block 6: CLAUDE-IMPLEMENTER.md REINFORCED count ≤ 30 (AC-R89-5 / AC-R36-21 FLIP) ─
echo "--- Block 6: CLAUDE-IMPLEMENTER.md REINFORCED count (AC-R89-5 / AC-R36-21) ---"

IMPL_COUNT=$(grep -c '^# REINFORCED' "CLAUDE-IMPLEMENTER.md" || echo "0")
assert_le "AC-R89-5: CLAUDE-IMPLEMENTER.md REINFORCED count ≤ 30 (AC-R36-21 FLIP)" "$IMPL_COUNT" "30"
echo ""

# ── Block 7: check-claude-md-thresholds.sh exits 0 (AC-R89-6) ───────────────
echo "--- Block 7: check-claude-md-thresholds.sh exits 0 (AC-R89-6) ---"

if [[ -f "scripts/check-claude-md-thresholds.sh" ]]; then
  if bash "scripts/check-claude-md-thresholds.sh" > /dev/null 2>&1; then
    echo "PASS — AC-R89-6: check-claude-md-thresholds.sh exits 0"
    PASS=$((PASS + 1))
  else
    echo "FAIL — AC-R89-6: check-claude-md-thresholds.sh exited non-zero"
    FAIL=$((FAIL + 1))
  fi
else
  echo "FAIL — AC-R89-6: scripts/check-claude-md-thresholds.sh does not exist"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Block 8: test baseline (binding command) ─────────────────────────────────
echo "--- Block 8: test baseline (TAP) ---"

TAP_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20 || true)
TESTS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# tests' | awk '{print $3}' || echo "0")
PASS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# pass' | awk '{print $3}' || echo "0")
FAIL_COUNT=$(echo "$TAP_OUTPUT" | grep '^# fail' | awk '{print $3}' || echo "0")
SKIP_COUNT=$(echo "$TAP_OUTPUT" | grep '^# skipped' | awk '{print $3}' || echo "0")

echo "Observed: tests=$TESTS_COUNT pass=$PASS_COUNT fail=$FAIL_COUNT skip=$SKIP_COUNT"

# Expected: tests=710 (702 baseline + 8 new q89 ACs)
assert_eq "AC-R89-count: tests == 710" "$TESTS_COUNT" "710"

# pass band: 691-692 (683 baseline + 1 AC-R36-21 flip + 8 new passing = 692 high, -1 for flake = 691)
if [[ "$PASS_COUNT" -ge 691 && "$PASS_COUNT" -le 692 ]]; then
  echo "PASS — AC-R89-pass: pass in [691, 692] (actual=$PASS_COUNT)"
  PASS=$((PASS + 1))
else
  echo "FAIL — AC-R89-pass: pass=$PASS_COUNT not in [691, 692]"
  FAIL=$((FAIL + 1))
fi

# fail band: 14-15 (15 baseline - 1 AC-R36-21 flip = 14 base; ±1 for AC-R84-14 stochastic flake)
if [[ "$FAIL_COUNT" -ge 14 && "$FAIL_COUNT" -le 15 ]]; then
  echo "PASS — AC-R89-fail: fail in [14, 15] (actual=$FAIL_COUNT)"
  PASS=$((PASS + 1))
else
  echo "FAIL — AC-R89-fail: fail=$FAIL_COUNT not in [14, 15]"
  FAIL=$((FAIL + 1))
fi

assert_eq "AC-R89-skip: skip == 4" "$SKIP_COUNT" "4"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "=== Summary: $PASS PASS / $FAIL FAIL ==="

if [[ "$FAIL" -eq 0 ]]; then
  exit 0
else
  exit 1
fi
