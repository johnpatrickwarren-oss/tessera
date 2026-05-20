#!/usr/bin/env bash
# Q-R71-EMPIRICAL.sh — R71 chore-A verification harness.
# Rule 1 ACTIVE GATE — Implementer runs at chore-A; Reviewer re-runs at REVIEWER HEAD.
#
# Convention: every block prints "PASS  Block: <label>" or "FAIL  Block: <label>"
# and increments counters. Exit code is 0 iff all blocks PASS.
#
# SHA placeholder: ROUND_START_SHA defaults to the literal "fcc51d603a8330e0043888413512830108c98709"
# below; the Implementer replaces this literal with the parent SHA of the chore-A
# commit (== the Architect's spec-triad commit SHA) BEFORE committing chore-A:
#
#   sed -i.bak "s|fcc51d603a8330e0043888413512830108c98709|$(git rev-parse HEAD)|g" coordination/specs/Q-R71-EMPIRICAL.sh
#   rm coordination/specs/Q-R71-EMPIRICAL.sh.bak
#
# (Capture SHA AFTER the spec-triad commit + BEFORE the chore-A commit.)
# This is a one-time, single-state injection — NOT a chore-B forward-protection
# pattern (R62 + R66 + R68 cumulative lesson: no two-state ACs at R71).
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

ROUND_START_SHA="${ROUND_START_SHA:-fcc51d603a8330e0043888413512830108c98709}"

# ── Block 1: tsc exit 0 ─────────────────────────────────────────────────
assert_block "tsc-exit-0" \
  'pnpm exec tsc -p tsconfig.test.json'

# ── Block 2: node --test top-level fail count == 5 AND each carry-forward AC ID present ──
# Top-level "# fail" reports the describe-level fail count. The 5 carry-forward AC IDs
# (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14) each appear as a "not ok" line
# either at the top level (R36-21/30/31) or as an indented subtest line under the
# describe-level R65/R66 fails (AC-R65-2, AC-R66-14). Grep without start-anchor matches
# both top-level and indented subtest not-ok lines (per R70 MINOR-2 reinforcement).
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
# The 18-path ALLOWED_SET + DIAGNOSTIC-R71-*.md regex carve-out per spec § 3.2.
assert_block "anti-scope-allowed-set" '
  diff_paths=$(git diff "$ROUND_START_SHA"..HEAD --name-only)
  unauthorized=""
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$p" in
      tools/build-canned-demos.ts|\
demos/scenarios/clean-baseline.json|\
demos/scenarios/sdc-drift.json|\
demos/scenarios/common-mode-rack.json|\
demos/scenarios/event-conditional.json|\
demos/scenarios/fdr-multiple-testing.json|\
demos/scenarios/hierarchical-evalue.json|\
demos/scenarios/sparse-data-resilience.json|\
demos/scenarios/topology-spanning-common-mode.json|\
demos/demo.html|\
package.json|README.md|\
test/q71-demo-dashboard.test.ts|\
coordination/specs/Q-R71-SPEC.md|coordination/specs/Q-R71-SPEC-AUDIT.md|coordination/specs/Q-R71-EMPIRICAL.sh|\
coordination/NEXT-ROLE.md|coordination/MEMORIAL.md) ;;
      coordination/diagnostics/DIAGNOSTIC-R71-*.md) ;;
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
  prior_spec_diff=$(git diff "$ROUND_START_SHA"..HEAD --name-only -- "coordination/specs/" | grep -vE "Q-R71-" || true)
  [ -z "$prior_spec_diff" ]
'

# ── Block 6: tools/build-canned-demos.ts has expected exports ──────────
assert_block "build-canned-demos-structure" '
  test -f tools/build-canned-demos.ts && \
  grep -qE "^export function buildAllCannedDemos" tools/build-canned-demos.ts && \
  grep -qE "^export const SCENARIO_NAMES"          tools/build-canned-demos.ts
'

# ── Block 7: package.json has build:demos script ───────────────────────
assert_block "package-json-build-demos-script" '
  grep -qE "\"build:demos\":[[:space:]]*\"node tools/build-canned-demos.js\"" package.json
'

# ── Block 8: 8 scenario JSON files exist AND parse ─────────────────────
assert_block "scenario-json-files-exist-and-parse" '
  for name in clean-baseline sdc-drift common-mode-rack event-conditional \
              fdr-multiple-testing hierarchical-evalue \
              sparse-data-resilience topology-spanning-common-mode; do
    f="demos/scenarios/${name}.json"
    test -f "$f" || { echo "missing: $f" >&2; exit 1; }
    node -e "JSON.parse(require(\"fs\").readFileSync(\"$f\",\"utf8\"))" \
      || { echo "parse-fail: $f" >&2; exit 1; }
  done
'

# ── Block 9: demos/demo.html structural markers + per-scenario inlined script tags ──
assert_block "demo-html-structural-elements" '
  test -f demos/demo.html && \
  grep -q "<select id=\"scenario-selector\">"      demos/demo.html && \
  grep -q "<button id=\"btn-play\">"               demos/demo.html && \
  grep -q "<button id=\"btn-pause\">"              demos/demo.html && \
  grep -q "<button id=\"btn-reset\">"              demos/demo.html && \
  grep -q "<select id=\"speed-selector\">"         demos/demo.html && \
  grep -q "<svg id=\"mt-chart\""                   demos/demo.html && \
  grep -q "<section id=\"audit-panel\">"           demos/demo.html && \
  grep -q "<section id=\"reasoning-panel\">"       demos/demo.html && \
  grep -q "<section id=\"next-actions-panel\">"    demos/demo.html && \
  for name in clean-baseline sdc-drift common-mode-rack event-conditional \
              fdr-multiple-testing hierarchical-evalue \
              sparse-data-resilience topology-spanning-common-mode; do
    grep -q "<script type=\"application/json\" id=\"tessera-scenario-${name}\">" demos/demo.html \
      || { echo "missing inlined block: $name" >&2; exit 1; }
  done
'

# ── Block 10: build:demos is idempotent (re-run produces no demos/ diff) ──
assert_block "build-demos-idempotent" '
  pnpm exec node tools/build-canned-demos.js > /dev/null && \
  test -z "$(git diff --name-only demos/)"
'

echo ""
echo "── Q-R71-EMPIRICAL.sh summary ──"
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
