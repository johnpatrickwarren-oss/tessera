#!/usr/bin/env bash
# Q-R95-EMPIRICAL.sh — Mechanical AC verification for R95 defunct AC cleanup round
# Tier: audit | Round start SHA: e535a53 | Chore-A SHA: <INJECTED-AT-CHORE-A>
#
# Usage: bash coordination/specs/Q-R95-EMPIRICAL.sh
# Must be run from Tessera repo root with pnpm install already run.
#
# Per R77 + R89 MAJOR-1 lesson: --test-reporter=tap MUST appear BEFORE test files in
# all node --test invocations. Block 7 enforces this.
#
# Per R73 MAJOR-1 lesson: counts in attestations must match actual command output.
# Per encode-actual-results-verbatim (CLAUDE-COMMON.md): record actual values, not predicted.

set -euo pipefail

PASS=0
FAIL=0
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

ROUND_START_SHA="e535a53"
CHORE_A_SHA="<INJECTED-AT-CHORE-A>"

echo "=== Q-R95-EMPIRICAL.sh ==="
echo "Round: R95 | Round-start: ${ROUND_START_SHA} | Chore-A: ${CHORE_A_SHA}"
echo ""

# ── Block 1: ALLOWED_SET diff check ────────────────────────────────────────────
echo "--- Block 1: ALLOWED_SET diff check ---"

ALLOWED_REGEX='^(coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/VENDORING-MANIFEST\.md|coordination/specs/Q-R95-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R95\.md|coordination/logs/ROUND-R95-[A-Z0-9-]+\.md|coordination/diagnostics/DIAGNOSTIC-R95-[a-z0-9-]+\.md|templates/SPEC-AUTHORING-CHECKLIST\.md|test/q01-vendoring-coverage\.test\.ts|test/q18-phase2-slice1-topology-substrate\.test\.ts|test/q20-verdict-grouper-cluster-event-scope\.test\.ts|test/q23-hardware-topology-source\.test\.ts|test/q29-k8s-adapter\.test\.ts|test/q30-nvlink-adapter\.test\.ts|test/q32-slice3-close-walk\.test\.ts|test/q34-event-conditional-attribution\.test\.ts|test/q36-phase2-close-walk\.test\.ts|test/q38-verification\.test\.ts|test/q53-neuron-adapter\.test\.ts|test/q56-tpu-adapter\.test\.ts|test/q58-live-fetch-interface\.test\.ts|test/q62-ds-integration-contract\.test\.ts|test/q82-engine-browser-bundle\.test\.ts|test/q90-engine-package-extract\.test\.ts|test/q91-engine-package-consumption\.test\.ts|test/q93-slice3-close-hygiene\.test\.ts|test/q94-engine-repo-extraction\.test\.ts|test/q95-defunct-ac-cleanup\.test\.ts)$'

if [ "${CHORE_A_SHA}" = "<INJECTED-AT-CHORE-A>" ]; then
  echo "SKIP — Block 1: CHORE_A_SHA not yet injected (pre-chore-A run)"
else
  diff_paths=$(git diff "${ROUND_START_SHA}..${CHORE_A_SHA}" --name-only)
  unauthorized=""
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    if ! echo "$path" | grep -qE "$ALLOWED_REGEX"; then
      unauthorized="${unauthorized}\n  ${path}"
    fi
  done <<< "$diff_paths"
  if [ -z "$unauthorized" ]; then
    diff_count=$(echo "$diff_paths" | grep -c . || true)
    echo "PASS — Block 1: all ${diff_count} diff paths ⊆ ALLOWED_SET"
    PASS=$((PASS + 1))
  else
    echo "FAIL — Block 1: unauthorized paths in diff:${unauthorized}"
    FAIL=$((FAIL + 1))
  fi
fi

# ── Block 2: Category A defunct ACs absent from 5 representative test files ───
echo ""
echo "--- Block 2: Category A defunct ACs absent ---"

b2_pass=true

check_absent() {
  local file="$1"
  local pattern="$2"
  local count
  count=$(grep -c "$pattern" "$file" || true)
  if [ "$count" -eq 0 ]; then
    echo "  PASS: '${pattern}' absent from ${file}"
  else
    echo "  FAIL: '${pattern}' still present in ${file} (count=${count})"
    b2_pass=false
  fi
}

check_absent "test/q18-phase2-slice1-topology-substrate.test.ts" "test('AC-R18-7:"
check_absent "test/q20-verdict-grouper-cluster-event-scope.test.ts" "test('AC-R20-15:"
check_absent "test/q29-k8s-adapter.test.ts" "test('AC-R29-10"
check_absent "test/q30-nvlink-adapter.test.ts" "test('AC-R30-15:"
check_absent "test/q38-verification.test.ts" "test('AC-R38-2:"

if $b2_pass; then
  echo "PASS — Block 2: all 5 Category A sample ACs absent"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 2: one or more Category A ACs still present"
  FAIL=$((FAIL + 1))
fi

# ── Block 3: Category B defunct ACs absent from q90 ──────────────────────────
echo ""
echo "--- Block 3: Category B defunct ACs absent from q90 ---"

b3_pass=true

check_absent "test/q90-engine-package-extract.test.ts" "test('AC-R90-1:"
check_absent "test/q90-engine-package-extract.test.ts" "test('AC-R90-12:"

if $b3_pass; then
  echo "PASS — Block 3: Category B sample ACs absent from q90"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 3: one or more Category B ACs still present in q90"
  FAIL=$((FAIL + 1))
fi

# ── Block 4: Category C defunct ACs absent from q91 ──────────────────────────
echo ""
echo "--- Block 4: Category C defunct ACs absent from q91 ---"

b4_pass=true

check_absent "test/q91-engine-package-consumption.test.ts" "test('AC-R91-3:"
check_absent "test/q91-engine-package-consumption.test.ts" "test('AC-R91-5:"

if $b4_pass; then
  echo "PASS — Block 4: Category C sample ACs absent from q91"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 4: one or more Category C ACs still present in q91"
  FAIL=$((FAIL + 1))
fi

# ── Block 5: Category D defunct ACs absent ────────────────────────────────────
echo ""
echo "--- Block 5: Category D defunct ACs absent ---"

b5_pass=true

check_absent "test/q93-slice3-close-hygiene.test.ts" "test('AC-R93-7:"
check_absent "test/q94-engine-repo-extraction.test.ts" "test('AC-R94-9:"
check_absent "test/q94-engine-repo-extraction.test.ts" "test('AC-R94-10:"
check_absent "test/q94-engine-repo-extraction.test.ts" "test('AC-R94-11:"

if $b5_pass; then
  echo "PASS — Block 5: all Category D ACs absent"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 5: one or more Category D ACs still present"
  FAIL=$((FAIL + 1))
fi

# ── Block 6: Carry-forward ACs still present in q90 and q91 ──────────────────
echo ""
echo "--- Block 6: Carry-forward anti-scope ACs retained ---"

b6_pass=true

check_present() {
  local file="$1"
  local pattern="$2"
  local count
  count=$(grep -c "$pattern" "$file" || true)
  if [ "$count" -ge 1 ]; then
    echo "  PASS: '${pattern}' present in ${file} (count=${count})"
  else
    echo "  FAIL: '${pattern}' ABSENT from ${file} (should be retained)"
    b6_pass=false
  fi
}

check_present "test/q90-engine-package-extract.test.ts" "test('AC-R90-13:"
check_present "test/q91-engine-package-consumption.test.ts" "test('AC-R91-12:"

if $b6_pass; then
  echo "PASS — Block 6: carry-forward ACs retained"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 6: carry-forward ACs accidentally deleted"
  FAIL=$((FAIL + 1))
fi

# ── Block 7: SPEC-AUTHORING-CHECKLIST.md has R94 MAJOR-3 gate text ────────────
echo ""
echo "--- Block 7: SPEC-AUTHORING-CHECKLIST.md content ---"

checklist_file="templates/SPEC-AUTHORING-CHECKLIST.md"
if [ ! -f "$checklist_file" ]; then
  echo "FAIL — Block 7: ${checklist_file} does not exist"
  FAIL=$((FAIL + 1))
else
  gate_text="transparent disclosure of hard-limit anti-scope deviation does NOT substitute for HALT+DIAGNOSTIC+ESCALATE"
  if grep -qF "$gate_text" "$checklist_file"; then
    echo "PASS — Block 7: SPEC-AUTHORING-CHECKLIST.md contains R94 MAJOR-3 gate text"
    PASS=$((PASS + 1))
  else
    echo "FAIL — Block 7: SPEC-AUTHORING-CHECKLIST.md missing R94 MAJOR-3 gate text"
    FAIL=$((FAIL + 1))
  fi
fi

# ── Block 8: VENDORING-MANIFEST.md has R95 header note ────────────────────────
echo ""
echo "--- Block 8: VENDORING-MANIFEST.md R95 note ---"

manifest_file="coordination/VENDORING-MANIFEST.md"
if grep -qE '^## R95 defunct AC cleanup note' "$manifest_file"; then
  echo "PASS — Block 8: VENDORING-MANIFEST.md has R95 header note"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 8: VENDORING-MANIFEST.md missing R95 header note"
  FAIL=$((FAIL + 1))
fi

# ── Block 9: NEXT-ROLE.md preserves R94 MAJOR-4 operator-decision flag ────────
echo ""
echo "--- Block 9: NEXT-ROLE.md R94 MAJOR-4 flag preserved ---"

if grep -qF "tag immutable; options: live-with vs delete+re-tag" coordination/NEXT-ROLE.md; then
  echo "PASS — Block 9: NEXT-ROLE.md contains R94 MAJOR-4 operator-decision flag"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 9: NEXT-ROLE.md missing R94 MAJOR-4 operator-decision flag"
  FAIL=$((FAIL + 1))
fi

# ── Block 10: pnpm exec tsc -p tsconfig.test.json exits 0 ────────────────────
echo ""
echo "--- Block 10: TypeScript typecheck ---"

if pnpm exec tsc -p tsconfig.test.json --noEmit 2>&1; then
  echo "PASS — Block 10: tsc -p tsconfig.test.json exits 0"
  PASS=$((PASS + 1))
else
  tsc_exit=$?
  echo "FAIL — Block 10: tsc -p tsconfig.test.json exits ${tsc_exit}"
  FAIL=$((FAIL + 1))
fi

# ── Block 11: Test suite fail count within band [24, 30] ─────────────────────
# Per R77 + R89 MAJOR-1: --test-reporter=tap MUST appear BEFORE test files.
echo ""
echo "--- Block 11: Test suite fail count band [24, 30] ---"

tap_output=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
tests_line=$(echo "$tap_output" | grep '^# tests' | head -1)
pass_line=$(echo "$tap_output" | grep '^# pass' | head -1)
fail_line=$(echo "$tap_output" | grep '^# fail' | head -1)
skip_line=$(echo "$tap_output" | grep '^# skipped' | head -1)
actual_fail=$(echo "$fail_line" | awk '{print $3}')

echo "  Observed: ${tests_line} | ${pass_line} | ${fail_line} | ${skip_line}"

EXPECTED_FAIL_MIN=24
EXPECTED_FAIL_MAX=30

if [ -z "$actual_fail" ]; then
  echo "FAIL — Block 11: could not parse fail count from TAP output"
  FAIL=$((FAIL + 1))
elif [ "$actual_fail" -ge "$EXPECTED_FAIL_MIN" ] && [ "$actual_fail" -le "$EXPECTED_FAIL_MAX" ]; then
  echo "PASS — Block 11: fail count ${actual_fail} in [${EXPECTED_FAIL_MIN}, ${EXPECTED_FAIL_MAX}]"
  PASS=$((PASS + 1))
else
  echo "FAIL — Block 11: fail count ${actual_fail} outside [${EXPECTED_FAIL_MIN}, ${EXPECTED_FAIL_MAX}]"
  FAIL=$((FAIL + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Summary: ${PASS} PASS / ${FAIL} FAIL ==="

if [ "$FAIL" -eq 0 ]; then
  echo "EXIT 0 — all blocks pass"
  exit 0
else
  echo "EXIT 1 — ${FAIL} block(s) failed"
  exit 1
fi
