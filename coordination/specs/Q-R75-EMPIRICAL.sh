#!/usr/bin/env bash
# Q-R75-EMPIRICAL.sh — chore-A empirical verification harness (Rule 1 ACTIVE GATE).
#
# Runs 8 verification blocks; reports PASS/FAIL per block; exits 0 if all PASS, 1 otherwise.
# Implementer runs this BEFORE chore-A commit. Reviewer re-runs at Reviewer HEAD.
#
# Round-start SHA: encoded inline (Architect-authored). No sed substitution needed.
# Source authority: coordination/NEXT-ROLE.md § R75 Round-scope directive
# "Round-start SHA: 6002dd6 (chore(R74): Memorial-Updater outputs)".

set -u  # nounset; do NOT set -e — every block runs for full reporting

ROUND_START_SHA="6002dd6"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

pass_count=0
fail_count=0

block_result() {
  local name="$1"
  local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "PASS  Block: $name"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL  Block: $name"
    fail_count=$((fail_count + 1))
  fi
}

# ── Block 1: round-start-sha-valid ────────────────────────────────────────────
if git cat-file -e "$ROUND_START_SHA^{commit}" 2>/dev/null; then
  block_result "round-start-sha-valid" 1
else
  echo "  $ROUND_START_SHA is not a valid commit"
  block_result "round-start-sha-valid" 0
fi

# ── Block 2: tsc-exit-0 ───────────────────────────────────────────────────────
tsc_output=$(pnpm exec tsc -p tsconfig.test.json 2>&1)
tsc_exit=$?
echo "  observed tsc exit: $tsc_exit"
if [ $tsc_exit -eq 0 ]; then
  block_result "tsc-exit-0" 1
else
  echo "$tsc_output" | head -10
  block_result "tsc-exit-0" 0
fi

# ── Block 3: node-test-pass-fail-counts ───────────────────────────────────────
# Pre-R75 baseline at ROUND_START_SHA 6002dd6 = 539/531/5/3 (verified by Architect
# at session entry on 2026-05-20). At chore-A (R75 GREEN), expect:
#   tests > 539 (q75-cache-prefix added)
#   pass  > 531 (new tests PASS)
#   fail  = 5  (carry-forward identities unchanged)
#   skipped >= 3 (carry-forward skips unchanged)
test_output=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1)
tests_line=$(echo "$test_output" | grep -E "^# tests " | head -1)
pass_line=$(echo "$test_output" | grep -E "^# pass " | head -1)
fail_line=$(echo "$test_output" | grep -E "^# fail " | head -1)
skipped_line=$(echo "$test_output" | grep -E "^# skipped " | head -1)
echo "  observed: $tests_line"
echo "  observed: $pass_line"
echo "  observed: $fail_line"
echo "  observed: $skipped_line"
count_ok=1
case "$fail_line" in
  *"# fail 5"*) ;;
  *) count_ok=0; echo "  expected '# fail 5' (carry-forward); got '$fail_line'" ;;
esac
tests_count=$(echo "$tests_line" | grep -oE "[0-9]+$" | head -1)
pass_count_obs=$(echo "$pass_line" | grep -oE "[0-9]+$" | head -1)
if [ -n "$tests_count" ] && [ "$tests_count" -le 539 ]; then
  count_ok=0
  echo "  expected tests > 539 (R75-baseline); got $tests_count"
fi
if [ -n "$pass_count_obs" ] && [ "$pass_count_obs" -le 531 ]; then
  count_ok=0
  echo "  expected pass > 531 (R75-baseline); got $pass_count_obs"
fi
block_result "node-test-pass-fail-counts" $count_ok

# ── Block 4: builder-determinism ──────────────────────────────────────────────
# AC-R75-3 empirical re-check at chore-A: two consecutive --emit prefix
# invocations produce byte-identical output.
if [ -f scripts/build-role-context.js ]; then
  a=$(node scripts/build-role-context.js --emit prefix --round R75 --project-root .)
  b=$(node scripts/build-role-context.js --emit prefix --round R75 --project-root .)
  if [ "$a" = "$b" ] && [ -n "$a" ]; then
    block_result "builder-determinism" 1
  else
    if [ -z "$a" ]; then
      echo "  prefix output empty"
    else
      echo "  two consecutive prefix outputs differ"
    fi
    block_result "builder-determinism" 0
  fi
else
  echo "  scripts/build-role-context.js missing (run pnpm exec tsc -p tsconfig.test.json first)"
  block_result "builder-determinism" 0
fi

# ── Block 5: builder-prefix-stability-across-roles ────────────────────────────
# AC-R75-4 empirical re-check: --emit prefix is independent of --role choice.
if [ -f scripts/build-role-context.js ]; then
  pi=$(node scripts/build-role-context.js --emit prefix --role IMPLEMENTER      --round R75 --project-root .)
  pr=$(node scripts/build-role-context.js --emit prefix --role REVIEWER         --round R75 --project-root .)
  pm=$(node scripts/build-role-context.js --emit prefix --role MEMORIAL-UPDATER --round R75 --project-root .)
  if [ "$pi" = "$pr" ] && [ "$pr" = "$pm" ]; then
    block_result "builder-prefix-stability-across-roles" 1
  else
    echo "  prefix not stable across role choices"
    block_result "builder-prefix-stability-across-roles" 0
  fi
else
  echo "  scripts/build-role-context.js missing"
  block_result "builder-prefix-stability-across-roles" 0
fi

# ── Block 6: anti-regression-q73-q74 ──────────────────────────────────────────
# Directive halt #4: R73 router validation + R74 MU model selection must still pass.
ar_output=$(pnpm exec node --test test/q73-tier-router.test.js test/q74-mu-haiku-reviewer-scope.test.js 2>&1)
ar_exit=$?
ar_fail_line=$(echo "$ar_output" | grep -E "^# fail " | head -1)
ar_fail=$(echo "$ar_fail_line" | grep -oE "[0-9]+$" | head -1)
echo "  observed: q73+q74 exit=$ar_exit; $ar_fail_line"
ar_fail_int=${ar_fail:-0}
if [ "$ar_exit" -eq 0 ] && [ "$ar_fail_int" -eq 0 ]; then
  block_result "anti-regression-q73-q74" 1
else
  block_result "anti-regression-q73-q74" 0
fi

# ── Block 7: anti-scope-diff-allowed-set ──────────────────────────────────────
# Round-start SHA → HEAD diff must be ⊆ ALLOWED_SET (Q-R75-SPEC.md § 5.1).
# Checks SET MEMBERSHIP only — does NOT pin a path count (per directive Rule 4:
# "NO forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns").
allowed_set=(
  "coordination/NEXT-ROLE.md"
  "coordination/MEMORIAL.md"
  "coordination/logs/ROUND-R75-ROUTING.md"
  "coordination/logs/ROUND-R75-SUMMARY.md"
  "coordination/specs/Q-R75-SPEC.md"
  "coordination/specs/Q-R75-SPEC-AUDIT.md"
  "coordination/specs/Q-R75-EMPIRICAL.sh"
  "coordination/reviews/REVIEWER-REPORT-R75.md"
  "scripts/build-role-context.ts"
  "scripts/measure-cache-effect.ts"
  "test/q75-cache-prefix.test.ts"
  "run-pipeline.sh"
  "CLAUDE-COMMON.md"
  "package.json"
)
diff_paths=$(git diff "$ROUND_START_SHA"..HEAD --name-only)
diff_ok=1
diff_count=0
while IFS= read -r p; do
  if [ -z "$p" ]; then
    continue
  fi
  diff_count=$((diff_count + 1))
  found=0
  for a in "${allowed_set[@]}"; do
    if [ "$p" = "$a" ]; then
      found=1
      break
    fi
  done
  if [ $found -eq 0 ]; then
    diff_ok=0
    echo "  unauthorized path: $p"
  fi
done <<EOF
$diff_paths
EOF
echo "  observed diff path count: $diff_count (no count constraint enforced)"
block_result "anti-scope-diff-allowed-set" $diff_ok

# ── Block 8: claude-common-reinforced-count-unchanged ─────────────────────────
# AC-R75-12: REINFORCED line count in CLAUDE-COMMON.md must equal 8 (the baseline
# at ROUND_START_SHA = 6002dd6, verified by Architect at session entry).
reinforced_count=$(grep -c "^# REINFORCED " CLAUDE-COMMON.md)
echo "  observed CLAUDE-COMMON.md REINFORCED count: $reinforced_count (expected 8)"
if [ "$reinforced_count" -eq 8 ]; then
  block_result "claude-common-reinforced-count-unchanged" 1
else
  block_result "claude-common-reinforced-count-unchanged" 0
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "===================="
echo "PASS: $pass_count"
echo "FAIL: $fail_count"
echo "===================="
[ $fail_count -eq 0 ] && exit 0 || exit 1
