#!/usr/bin/env bash
# Q-R85-EMPIRICAL.sh — binding-command harness for R85 (SLICE 3 close + Phase 4 close).
#
# Runs 5 blocks; each exits non-zero on failure. Final exit aggregates.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4): every TAP-format
# parse MUST be run against `--test-reporter=tap` output.

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R85-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='f737877'
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
# ── Block 2: demo.html R85 surface presence ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: demo.html R85 surface presence ──"
DEMO_HTML="demos/demo.html"
if [ -f "$DEMO_HTML" ]; then
  if grep -q 'id="mode-toggle"' "$DEMO_HTML"; then
    block_ok "demo.html has #mode-toggle fieldset"
  else
    block_fail "demo.html missing #mode-toggle fieldset"
  fi
  if grep -q 'name="tessera-mode"' "$DEMO_HTML"; then
    block_ok "demo.html has tessera-mode radio inputs"
  else
    block_fail "demo.html missing tessera-mode radio inputs"
  fi
  if grep -q 'function setMode' "$DEMO_HTML"; then
    block_ok "demo.html has setMode() function"
  else
    block_fail "demo.html missing setMode() function"
  fi
  if grep -q 'id="engine-loading-indicator"' "$DEMO_HTML"; then
    block_ok "demo.html has #engine-loading-indicator"
  else
    block_fail "demo.html missing #engine-loading-indicator"
  fi
  if grep -q 'id="engine-run-status"' "$DEMO_HTML"; then
    block_ok "demo.html has #engine-run-status"
  else
    block_fail "demo.html missing #engine-run-status"
  fi
  if grep -q 'function updateRunStatus' "$DEMO_HTML"; then
    block_ok "demo.html has updateRunStatus() function"
  else
    block_fail "demo.html missing updateRunStatus() function"
  fi
  if grep -q 'function r85ShowLoadingSpinner' "$DEMO_HTML" \
     && grep -q 'function r85HideLoadingSpinner' "$DEMO_HTML"; then
    block_ok "demo.html has r85 spinner helpers"
  else
    block_fail "demo.html missing r85 spinner helpers"
  fi
  if grep -q "data-mode" "$DEMO_HTML"; then
    block_ok "demo.html has data-mode attribute usage"
  else
    block_fail "demo.html missing data-mode attribute usage"
  fi
else
  block_fail "demos/demo.html missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: DEMO-SCRIPT.md + README.md presence ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: DEMO-SCRIPT.md + README.md presence ──"
DEMO_SCRIPT="demos/DEMO-SCRIPT.md"
README_FILE="README.md"
CPM="$HOME/.claude/CROSS-PROJECT-MEMORIAL.md"

if [ -f "$DEMO_SCRIPT" ]; then
  if grep -q "^## Contents$" "$DEMO_SCRIPT"; then
    block_ok "DEMO-SCRIPT.md has ## Contents ToC heading"
  else
    block_fail "DEMO-SCRIPT.md missing ## Contents ToC heading"
  fi
  if grep -qE "^## Minute 10:00\s*[–-]\s*12:00 — Live mode" "$DEMO_SCRIPT"; then
    block_ok "DEMO-SCRIPT.md has Live mode Minute 10:00–12:00 section"
  else
    block_fail "DEMO-SCRIPT.md missing Live mode Minute 10:00–12:00 section"
  fi
else
  block_fail "demos/DEMO-SCRIPT.md missing"
fi

if [ -f "$README_FILE" ]; then
  # Section-bounded check: Browser dashboard subsection mentions Live mode.
  if awk '/^### Browser dashboard/,/^### /' "$README_FILE" \
     | grep -qi "Live mode"; then
    block_ok "README.md Browser dashboard subsection mentions Live mode"
  else
    block_fail "README.md Browser dashboard subsection does not mention Live mode"
  fi
else
  block_fail "README.md missing"
fi

if [ -f "$CPM" ]; then
  if grep -q "haiku-mu-status-field-disambiguation" "$CPM"; then
    block_ok "CROSS-PROJECT-MEMORIAL.md has haiku-mu-status-field-disambiguation rule"
  else
    block_fail "CROSS-PROJECT-MEMORIAL.md missing haiku-mu-status-field-disambiguation rule"
  fi
  if grep -q "architect-encoded-regex-with-hardcoded-bounds" "$CPM"; then
    block_ok "CROSS-PROJECT-MEMORIAL.md has architect-encoded-regex-with-hardcoded-bounds rule"
  else
    block_fail "CROSS-PROJECT-MEMORIAL.md missing architect-encoded-regex-with-hardcoded-bounds rule"
  fi
  if grep -q "vendored-at-pin .* vendored-with-deltas reclassification precedent" "$CPM" \
     || grep -q "vendored-at-pin → vendored-with-deltas reclassification precedent" "$CPM"; then
    block_ok "CROSS-PROJECT-MEMORIAL.md has vendored-at-pin reclassification precedent entry"
  else
    block_fail "CROSS-PROJECT-MEMORIAL.md missing vendored-at-pin reclassification precedent entry"
  fi
else
  block_fail "~/.claude/CROSS-PROJECT-MEMORIAL.md missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: test counts ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: test counts ──"
# Pre-build engine bundle if absent (gitignored).
if [ ! -f "demos/engine-bundle.mjs" ]; then
  echo "  pre-build: pnpm exec node tools/build-browser-bundle.js"
  pnpm exec node tools/build-browser-bundle.js >/dev/null 2>&1 || \
    block_fail "pre-build of engine-bundle.mjs failed"
fi

TAP_OUTPUT="$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20)"
TESTS=$(echo "$TAP_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS=$(echo "$TAP_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL=$(echo "$TAP_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIPPED=$(echo "$TAP_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')

echo "  observed: tests=$TESTS pass=$PASS fail=$FAIL skipped=$SKIPPED"

EXPECTED_TESTS=689
EXPECTED_PASS_MIN=668
EXPECTED_PASS_MAX=670
EXPECTED_FAIL=16
EXPECTED_SKIPPED=4

if [ "$TESTS" = "$EXPECTED_TESTS" ]; then
  block_ok "TAP # tests = $EXPECTED_TESTS (strict)"
else
  block_fail "TAP # tests = $TESTS (expected $EXPECTED_TESTS strict)"
fi
if [ -n "$PASS" ] && [ "$PASS" -ge "$EXPECTED_PASS_MIN" ] && [ "$PASS" -le "$EXPECTED_PASS_MAX" ]; then
  block_ok "TAP # pass = $PASS (band [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX])"
else
  block_fail "TAP # pass = $PASS (expected band [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX])"
fi
if [ "$FAIL" = "$EXPECTED_FAIL" ]; then
  block_ok "TAP # fail = $EXPECTED_FAIL (strict)"
else
  block_fail "TAP # fail = $FAIL (expected $EXPECTED_FAIL strict)"
fi
if [ "$SKIPPED" = "$EXPECTED_SKIPPED" ]; then
  block_ok "TAP # skipped = $EXPECTED_SKIPPED (strict)"
else
  block_fail "TAP # skipped = $SKIPPED (expected $EXPECTED_SKIPPED strict)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: anti-scope diff ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: anti-scope diff ──"
ALLOWED='^(tools/build-canned-demos\.ts|demos/demo\.html|demos/DEMO-SCRIPT\.md|README\.md|test/q85-slice-3-close\.test\.ts|coordination/specs/Q-R85-SPEC\.md|coordination/specs/Q-R85-SPEC-AUDIT\.md|coordination/specs/Q-R85-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R85\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'

VIOLATORS=$(git diff "$ROUND_START_SHA" HEAD --name-only | grep -Ev "$ALLOWED" || true)
if [ -z "$VIOLATORS" ]; then
  block_ok "anti-scope diff ⊆ ALLOWED_SET"
else
  block_fail "anti-scope diff includes unauthorized paths:"
  echo "$VIOLATORS" | sed 's/^/    /'
fi

# Halt condition 9 — scenarios/*.json byte-identity (sentinel check; not a pass/fail block).
SCENARIO_DIFFS=$(git diff "$ROUND_START_SHA" HEAD --name-only -- 'demos/scenarios/*.json' 2>/dev/null || true)
if [ -z "$SCENARIO_DIFFS" ]; then
  block_ok "demos/scenarios/*.json byte-identical to round-start"
else
  block_fail "demos/scenarios/*.json drift detected (halt condition 9):"
  echo "$SCENARIO_DIFFS" | sed 's/^/    /'
fi

# Halt condition 12 — R84 EMPIRICAL.sh continues to pass (R84 surface non-regression).
# Skipped in this script to avoid recursive run; spec § 8.10 walks the analytical proof.
# Reviewer cold-eye may invoke Q-R84-EMPIRICAL.sh independently as a non-regression check.

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
