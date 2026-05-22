#!/usr/bin/env bash
# Q-R93-EMPIRICAL.sh — Empirical AC harness for round R93.
# Phase 5 SLICE 3 close + hygiene: AC-R36-3 redesign, forward-protection registry,
# SPEC-AUTHORING-CHECKLIST gates, SLICE-3 close walk.
#
# Run: bash coordination/specs/Q-R93-EMPIRICAL.sh
# Exit 0 = all blocks PASS; exit 1 = at least one block FAIL.
#
# R77 + R89 MAJOR-1 discipline: --test-reporter=tap BEFORE test files in any node --test invocation.
# R46 discipline: no vacuous blocks; each block runs a command and asserts on actual output.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASS=0
FAIL=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS: $label (expected='$expected')"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected='$expected'; actual='$actual')"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo "PASS: $label (found '${needle:0:60}...')"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (string '${needle:0:60}...' not found)"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo "FAIL: $label (string '${needle:0:60}...' should NOT be present but was found)"
    FAIL=$((FAIL + 1))
  else
    echo "PASS: $label (string correctly absent)"
    PASS=$((PASS + 1))
  fi
}

assert_file_exists() {
  local label="$1" filepath="$2"
  if [[ -f "$filepath" ]]; then
    echo "PASS: $label (file exists: $filepath)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (file NOT found: $filepath)"
    FAIL=$((FAIL + 1))
  fi
}

# ── Block 1: tsc exits 0 ───────────────────────────────────────────────────────
echo "--- Block 1: tsc -p tsconfig.test.json --noEmit ---"
TSC_EXIT=0
pnpm exec tsc -p "$PROJECT_ROOT/tsconfig.test.json" --noEmit 2>/dev/null || TSC_EXIT=$?
assert_eq "AC-R93: tsc exit 0" "0" "$TSC_EXIT"

# ── Block 2: AC-R36-3 body absent from q36 ────────────────────────────────────
echo "--- Block 2: AC-R36-3 body absent from q36-phase2-close-walk.test.ts ---"
Q36_CONTENT=$(cat "$PROJECT_ROOT/test/q36-phase2-close-walk.test.ts")
assert_not_contains \
  "AC-R93-1: q36 does not contain AC-R36-3 test name" \
  "AC-R36-3: no other test files carry execFileSync node --test pattern" \
  "$Q36_CONTENT"

# ── Block 3: check-no-execfilesync-spawn.sh exists + contains guard pattern ───
echo "--- Block 3: check-no-execfilesync-spawn.sh exists + contains pattern ---"
HOOK_PATH="$PROJECT_ROOT/scripts/check-no-execfilesync-spawn.sh"
assert_file_exists "AC-R93-2a: hook script exists" "$HOOK_PATH"
if [[ -f "$HOOK_PATH" ]]; then
  HOOK_CONTENT=$(cat "$HOOK_PATH")
  assert_contains \
    "AC-R93-2b: hook script contains execFileSync guard" \
    "execFileSync" \
    "$HOOK_CONTENT"
fi

# ── Block 4: forward-protection registry exists + references AC-R36-3 ─────────
echo "--- Block 4: FORWARD-PROTECTION-AC-REGISTRY.md exists + references AC-R36-3 ---"
REGISTRY_PATH="$PROJECT_ROOT/coordination/FORWARD-PROTECTION-AC-REGISTRY.md"
assert_file_exists "AC-R93-3a: registry file exists" "$REGISTRY_PATH"
if [[ -f "$REGISTRY_PATH" ]]; then
  REGISTRY_CONTENT=$(cat "$REGISTRY_PATH")
  assert_contains \
    "AC-R93-3b: registry references AC-R36-3" \
    "AC-R36-3" \
    "$REGISTRY_CONTENT"
fi

# ── Block 5: SPEC-AUTHORING-CHECKLIST has fail-set gate phrase ────────────────
echo "--- Block 5: SPEC-AUTHORING-CHECKLIST.md contains fail-set gate ---"
CHECKLIST_PATH="$PROJECT_ROOT/coordination/SPEC-AUTHORING-CHECKLIST.md"
assert_file_exists "AC-R93-4a: checklist exists at coordination/ path" "$CHECKLIST_PATH"
if [[ -f "$CHECKLIST_PATH" ]]; then
  CHECKLIST_CONTENT=$(cat "$CHECKLIST_PATH")
  # R91 MAJOR-4 lesson gate: exact command literal
  assert_contains \
    "AC-R93-4b: checklist contains fail-set command literal" \
    "node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'" \
    "$CHECKLIST_CONTENT"
fi

# ── Block 6: SPEC-AUTHORING-CHECKLIST has forward-protection gate phrase ──────
echo "--- Block 6: SPEC-AUTHORING-CHECKLIST.md contains forward-protection gate ---"
if [[ -f "$CHECKLIST_PATH" ]]; then
  CHECKLIST_CONTENT=$(cat "$CHECKLIST_PATH")
  assert_contains \
    "AC-R93-5: checklist contains forward-protection AC registry phrase" \
    "forward-protection AC registry" \
    "$CHECKLIST_CONTENT"
fi

# ── Block 7: PHASE-5-SLICE-3-CLOSE-WALK.md exists + references R90 and R92 ───
echo "--- Block 7: PHASE-5-SLICE-3-CLOSE-WALK.md exists + references R90/R92 ---"
SLICE_WALK_PATH="$PROJECT_ROOT/coordination/PHASE-5-SLICE-3-CLOSE-WALK.md"
assert_file_exists "AC-R93-8a: SLICE-3 close walk file exists" "$SLICE_WALK_PATH"
if [[ -f "$SLICE_WALK_PATH" ]]; then
  SLICE_CONTENT=$(cat "$SLICE_WALK_PATH")
  assert_contains "AC-R93-8b: close walk references R90" "R90" "$SLICE_CONTENT"
  assert_contains "AC-R93-8c: close walk references R92" "R92" "$SLICE_CONTENT"
fi

# ── Block 8: test count band ──────────────────────────────────────────────────
# R77 + R89 MAJOR-1: --test-reporter=tap BEFORE test files.
# Band: tests=745 (exact), pass in [720,722], fail in [19,21], skip=4.
# -1 for dropped AC-R36-3 (passing); +8 for q93 ACs (all passing at chore-A).
echo "--- Block 8: test suite count band ---"
TAP_OUTPUT=$(node --test --test-reporter=tap "$PROJECT_ROOT"/test/*.test.js 2>&1 || true)
TESTS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# tests' | awk '{print $3}')
PASS_COUNT=$(echo "$TAP_OUTPUT" | grep '^# pass' | awk '{print $3}')
FAIL_COUNT=$(echo "$TAP_OUTPUT" | grep '^# fail' | awk '{print $3}')
SKIP_COUNT=$(echo "$TAP_OUTPUT" | grep '^# skipped' | awk '{print $3}')

assert_eq "AC-R93: tests=745 (exact)" "745" "$TESTS_COUNT"
assert_eq "AC-R93: skip=4 (exact)" "4" "$SKIP_COUNT"

# pass in [720,722]
if [[ -n "$PASS_COUNT" ]] && [[ "$PASS_COUNT" -ge 720 ]] && [[ "$PASS_COUNT" -le 722 ]]; then
  echo "PASS: AC-R93: pass=$PASS_COUNT in [720,722]"
  PASS=$((PASS + 1))
else
  echo "FAIL: AC-R93: pass=$PASS_COUNT NOT in [720,722]"
  FAIL=$((FAIL + 1))
fi

# fail in [19,21]
if [[ -n "$FAIL_COUNT" ]] && [[ "$FAIL_COUNT" -ge 19 ]] && [[ "$FAIL_COUNT" -le 21 ]]; then
  echo "PASS: AC-R93: fail=$FAIL_COUNT in [19,21]"
  PASS=$((PASS + 1))
else
  echo "FAIL: AC-R93: fail=$FAIL_COUNT NOT in [19,21]"
  FAIL=$((FAIL + 1))
fi

# ── Block 9: anti-scope diff ⊆ ALLOWED_SET ───────────────────────────────────
echo "--- Block 9: anti-scope diff fe74c64..HEAD ⊆ ALLOWED_SET ---"
ROUND_START_SHA="fe74c64"

ALLOWED_PATTERN='^(test/q36-phase2-close-walk\.test\.ts|scripts/check-no-execfilesync-spawn\.sh|scripts/finalize-round\.sh|coordination/FORWARD-PROTECTION-AC-REGISTRY\.md|coordination/SPEC-AUTHORING-CHECKLIST\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|coordination/PHASE-5-SLICE-3-CLOSE-WALK\.md|coordination/MEMORIAL\.md|test/q93-slice3-close-hygiene\.test\.ts|coordination/specs/Q-R93-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R93\.md|coordination/NEXT-ROLE\.md|coordination/logs/ROUND-R93-.*)$'

DIFF_PATHS=$(git diff "$ROUND_START_SHA" HEAD --name-only 2>/dev/null || echo "GIT_ERROR")
if [[ "$DIFF_PATHS" == "GIT_ERROR" ]]; then
  echo "FAIL: Block 9 — git diff command failed"
  FAIL=$((FAIL + 1))
else
  VIOLATIONS=""
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    if ! echo "$p" | grep -qE "$ALLOWED_PATTERN"; then
      VIOLATIONS="$VIOLATIONS $p"
    fi
  done <<< "$DIFF_PATHS"

  if [[ -z "$VIOLATIONS" ]]; then
    echo "PASS: AC-R93-7: anti-scope diff ⊆ ALLOWED_SET ($(echo "$DIFF_PATHS" | wc -l | tr -d ' ') paths)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: AC-R93-7: anti-scope violations:$VIOLATIONS"
    FAIL=$((FAIL + 1))
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Summary: $PASS PASS / $FAIL FAIL"
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
