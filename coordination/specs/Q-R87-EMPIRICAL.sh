#!/usr/bin/env bash
# Q-R87-EMPIRICAL.sh — binding-command harness for R87 (carry-forward AC cleanup).
#
# Runs 5 blocks; each exits non-zero on failure. Final exit aggregates.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4): every TAP-format
# parse runs against `--test-reporter=tap` output.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1): fail counts
# bind a band when any active AC is documented as structurally flaky.
#
# Round-scope: hygiene round dropping AC-R36-30 + AC-R36-31 per R62 Option 1
# precedent (structurally-vacuous forward-protection ACs whose CHORE_A_SHA
# literal is far older than any committed HEAD).

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R87-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='0eb8a51'  # chore(R87 directive): carry-forward AC cleanup — drop R36-30+R36-31

PASS_COUNT=0
FAIL_COUNT=0

block_ok()   { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
block_fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 1: typecheck ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 1: typecheck ──"
if pnpm exec tsc -p tsconfig.test.json >/dev/null 2>&1; then
  block_ok "tsc -p tsconfig.test.json exits 0"
else
  block_fail "tsc -p tsconfig.test.json exits non-zero"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 2: q36 test-file structural removals (AC-R87-1 + AC-R87-2) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: q36 structural removals ──"
Q36='test/q36-phase2-close-walk.test.ts'
if [ -f "$Q36" ]; then
  # AC-R87-1: test() blocks gone.
  R36_30_COUNT=$(grep -c "^test('AC-R36-30:" "$Q36" || true)
  R36_31_COUNT=$(grep -c "^test('AC-R36-31:" "$Q36" || true)
  if [ "$R36_30_COUNT" = "0" ] && [ "$R36_31_COUNT" = "0" ]; then
    block_ok "AC-R36-30 + AC-R36-31 test() blocks removed from $Q36"
  else
    block_fail "AC-R36-30 count=$R36_30_COUNT, AC-R36-31 count=$R36_31_COUNT (expected 0/0)"
  fi
  # AC-R87-2: legacy SHA literals removed from the file body.
  # Actual literals at round-start were '36ab019' (ROUND_START_SHA) and 'c49df0e' (CHORE_A_SHA).
  SHA_36AB_COUNT=$(grep -c "'36ab019'" "$Q36" || true)
  SHA_C49D_COUNT=$(grep -c "'c49df0e'" "$Q36" || true)
  if [ "$SHA_36AB_COUNT" = "0" ] && [ "$SHA_C49D_COUNT" = "0" ]; then
    block_ok "legacy CHORE_A_SHA literals '36ab019' + 'c49df0e' removed from $Q36"
  else
    block_fail "legacy SHA literal counts (36ab019=$SHA_36AB_COUNT, c49df0e=$SHA_C49D_COUNT) (expected 0/0)"
  fi
else
  block_fail "$Q36 missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: q36 comment-block citations (AC-R87-3 + AC-R87-4) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: q36 comment-block citations ──"
if [ -f "$Q36" ]; then
  # AC-R87-3: explanatory comment cites R87 + R62 + R86 markers.
  if grep -q "R87" "$Q36" && grep -q "R62" "$Q36" && grep -q "SPEC-AUTHORING-CHECKLIST" "$Q36"; then
    block_ok "$Q36 explanatory comment cites R87 + R62 + SPEC-AUTHORING-CHECKLIST"
  else
    block_fail "$Q36 missing one of: R87 / R62 / SPEC-AUTHORING-CHECKLIST citations"
  fi
  # AC-R87-4: header AC range updated.
  if grep -q "AC-R36-1 through AC-R36-29" "$Q36"; then
    block_ok "$Q36 header cites 'AC-R36-1 through AC-R36-29' (range updated)"
  else
    block_fail "$Q36 header does not cite 'AC-R36-1 through AC-R36-29' (range not updated)"
  fi
else
  block_fail "$Q36 missing (cannot verify Block 3)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: test baseline transition (AC-R87-5) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: test counts ──"
TAP_OUTPUT="$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20)"
TESTS=$(echo "$TAP_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS=$(echo "$TAP_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL=$(echo "$TAP_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIPPED=$(echo "$TAP_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')

echo "  observed: tests=$TESTS pass=$PASS fail=$FAIL skipped=$SKIPPED"

# Empirical baseline at round-start HEAD (0eb8a51, verified by Architect at session entry):
#   tests=689 pass=667 fail=18 skipped=4   (one observed run)
#   tests=689 pass=668 fail=17 skipped=4   (second observed run)
# AC-R84-14 stochastic flake (~25% per R85 REVIEWER MINOR-2; MEMORIAL.md:2583) causes the ±1 oscillation.
#
# R87 delta:
#   −2 test() blocks (AC-R36-30 + AC-R36-31 dropped) → −2 fail, −2 tests
#   +N new R87 ACs (all passing per spec) → +N pass, +N tests
# Number of new top-level test() blocks bound at runtime in test/q87-carry-forward-cleanup.test.ts: 5
# (AC-R87-1..AC-R87-5; AC-R87-6 + AC-R87-7 are binding-command attestations).
#
# Predicted post-R87 chore-A:
#   tests = 689 − 2 + 5 = 692
#   fail  = (18 or 17) − 2 = 16 or 15 (band)
#   skipped = 4 (unchanged)
#   pass  = 692 − fail − skipped = 672 or 673

EXPECTED_TESTS=692
EXPECTED_FAIL_MIN=15
EXPECTED_FAIL_MAX=16
EXPECTED_SKIPPED=4
EXPECTED_PASS_MIN=672
EXPECTED_PASS_MAX=673

if [ "$TESTS" = "$EXPECTED_TESTS" ]; then
  block_ok "TAP # tests = $EXPECTED_TESTS (strict)"
else
  block_fail "TAP # tests = $TESTS (expected $EXPECTED_TESTS strict)"
fi
if [ -n "$FAIL" ] && [ "$FAIL" -ge "$EXPECTED_FAIL_MIN" ] && [ "$FAIL" -le "$EXPECTED_FAIL_MAX" ]; then
  block_ok "TAP # fail = $FAIL (band [$EXPECTED_FAIL_MIN, $EXPECTED_FAIL_MAX]; AC-R84-14 stochastic flake)"
else
  block_fail "TAP # fail = $FAIL (expected band [$EXPECTED_FAIL_MIN, $EXPECTED_FAIL_MAX])"
fi
if [ -n "$PASS" ] && [ "$PASS" -ge "$EXPECTED_PASS_MIN" ] && [ "$PASS" -le "$EXPECTED_PASS_MAX" ]; then
  block_ok "TAP # pass = $PASS (band [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX])"
else
  block_fail "TAP # pass = $PASS (expected band [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX])"
fi
if [ "$SKIPPED" = "$EXPECTED_SKIPPED" ]; then
  block_ok "TAP # skipped = $EXPECTED_SKIPPED (strict)"
else
  block_fail "TAP # skipped = $SKIPPED (expected $EXPECTED_SKIPPED strict)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: anti-scope diff (AC-R87-7) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: anti-scope diff ──"
ALLOWED='^(test/q36-phase2-close-walk\.test\.ts|test/q87-carry-forward-cleanup\.test\.ts|coordination/specs/Q-R87-SPEC\.md|coordination/specs/Q-R87-SPEC-AUDIT\.md|coordination/specs/Q-R87-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R87\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'

VIOLATORS=$(git diff "$ROUND_START_SHA" HEAD --name-only | grep -Ev "$ALLOWED" || true)
if [ -z "$VIOLATORS" ]; then
  block_ok "anti-scope diff ⊆ ALLOWED_SET"
else
  block_fail "anti-scope diff includes unauthorized paths:"
  echo "$VIOLATORS" | sed 's/^/    /'
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "── Summary ──"
echo "  PASS: $PASS_COUNT"
echo "  FAIL: $FAIL_COUNT"

if [ "$FAIL_COUNT" -eq 0 ]; then
  exit 0
else
  exit 1
fi
