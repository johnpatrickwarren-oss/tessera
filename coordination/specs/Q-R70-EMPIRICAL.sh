#!/usr/bin/env bash
# Q-R70-EMPIRICAL.sh — R70 chore-A verification harness.
# Rule 1 ACTIVE GATE — Implementer runs at chore-A; Reviewer re-runs at REVIEWER HEAD.
#
# Convention: every block prints "PASS  Block: <label>" or "FAIL  Block: <label>"
# and increments counters. Exit code is 0 iff all blocks PASS.
#
# SHA placeholder: ROUND_START_SHA defaults to the literal "<INJECTED-AT-CHORE-A>"
# below; the Implementer replaces this literal with the parent SHA of the chore-A
# commit (== the Architect's spec-triad commit SHA) BEFORE committing chore-A:
#
#   sed -i.bak "s/<INJECTED-AT-CHORE-A>/$(git rev-parse HEAD)/g" coordination/specs/Q-R70-EMPIRICAL.sh
#   rm coordination/specs/Q-R70-EMPIRICAL.sh.bak
#
# (Capture SHA AFTER the spec-triad commit + BEFORE the chore-A commit.)
# This is a one-time, single-state injection — NOT a chore-B forward-protection
# pattern (R62+R56+R66 cumulative lesson: no two-state ACs at R70).
#
# Environment override: caller may set ROUND_START_SHA to override the embedded
# value (useful for Reviewer re-runs from a different worktree HEAD).

set -u  # nounset; do NOT use -e (we want to run all blocks and tally)

cd "$(dirname "$0")/../.."  # to repo root

PASS_COUNT=0
FAIL_COUNT=0

assert_block() {
  local label="$1"
  local cmd="$2"
  if bash -c "$cmd"; then
    echo "PASS  Block: $label"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL  Block: $label"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

ROUND_START_SHA="${ROUND_START_SHA:-bb9549bf0a80bc5dfc5bad2247267ea275e30ab2}"

# ── Block 1: tsc exit 0 ────────────────────────────────────────────────
assert_block "tsc-exit-0" \
  'pnpm exec tsc -p tsconfig.test.json'

# ── Block 2: node --test top-level fail count == 5 AND each carry-forward AC ID present ──
# top-level "# fail" reports the describe-level fail count. The 5 carry-forward AC IDs
# (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14) each appear as a "not ok" line
# either at the top level (R36-21/30/31) or as an indented subtest line under the
# describe-level R65/R66 fails (AC-R65-2, AC-R66-14). Grep without start-anchor matches
# both top-level and indented subtest not-ok lines.
assert_block "node-test-fail-count-and-identity" '
  out=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1) || true
  fail_count=$(echo "$out" | grep -E "^# fail [0-9]+$" | awk "{print \$3}")
  not_ok_lines=$(echo "$out" | grep "not ok" || true)
  [ "$fail_count" = "5" ] && \
  echo "$not_ok_lines" | grep -q "AC-R36-21" && \
  echo "$not_ok_lines" | grep -q "AC-R36-30" && \
  echo "$not_ok_lines" | grep -q "AC-R36-31" && \
  echo "$not_ok_lines" | grep -q "AC-R65-2"  && \
  echo "$not_ok_lines" | grep -q "AC-R66-14"
'

# ── Block 3: anti-scope diff ⊆ ALLOWED_SET (historical: round-start..HEAD) ──
assert_block "anti-scope-allowed-set" '
  diff_paths=$(git diff "$ROUND_START_SHA"..HEAD --name-only)
  unauthorized=""
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$p" in
      tools/demo-scenario.ts|tools/demo-scenario.js|\
test/q70-demo-scenario.test.ts|test/q70-demo-scenario.test.js|\
package.json|README.md|\
coordination/NEXT-ROLE.md|coordination/MEMORIAL.md|\
coordination/specs/Q-R70-SPEC.md|coordination/specs/Q-R70-SPEC-AUDIT.md|coordination/specs/Q-R70-EMPIRICAL.sh) ;;
      coordination/diagnostics/DIAGNOSTIC-R70-*.md) ;;
      *) unauthorized="$unauthorized $p" ;;
    esac
  done <<< "$diff_paths"
  if [ -n "$unauthorized" ]; then
    echo "UNAUTHORIZED PATHS:$unauthorized" >&2
    exit 1
  fi
'

# ── Block 4: no engine/ modifications ──────────────────────────────────
assert_block "no-engine-mods" '
  engine_diff=$(git diff "$ROUND_START_SHA"..HEAD --name-only -- engine/)
  [ -z "$engine_diff" ]
'

# ── Block 5: no prior-round spec modifications ─────────────────────────
assert_block "no-prior-round-spec-mods" '
  prior_spec_diff=$(git diff "$ROUND_START_SHA"..HEAD --name-only -- "coordination/specs/" | grep -vE "Q-R70-" || true)
  [ -z "$prior_spec_diff" ]
'

# ── Block 6: tools/demo-scenario.ts has expected exports + switch ──────
assert_block "demo-scenario-structure" '
  test -f tools/demo-scenario.ts && \
  grep -qE "^export function runScenario"      tools/demo-scenario.ts && \
  grep -qE "^export function listScenarios"    tools/demo-scenario.ts && \
  grep -qE "^export const SCENARIO_NAMES"      tools/demo-scenario.ts && \
  grep -qE "^[[:space:]]*switch[[:space:]]*\(name\)" tools/demo-scenario.ts
'

# ── Block 7: package.json contains demo script ─────────────────────────
assert_block "package-json-demo-script" '
  grep -qE "\"demo\":[[:space:]]*\"node tools/demo-scenario.js\"" package.json
'

# ── Block 8: README has Quick demo section + the canonical command literal ──
assert_block "readme-quick-demo" '
  grep -qE "^## Quick demo" README.md && \
  grep -qE "pnpm demo clean-baseline" README.md
'

echo ""
echo "── Q-R70-EMPIRICAL.sh summary ──"
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
