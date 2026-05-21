#!/usr/bin/env bash
# Q-R84-EMPIRICAL.sh — binding-command harness for R84 (live engine compute + Web Worker).
#
# Runs 5 blocks; each exits non-zero on failure. Final exit aggregates.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4): every TAP-format
# parse MUST be run against `--test-reporter=tap` output.

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R84-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='0e93c15'
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
# ── Block 2: engine-worker.js structural presence ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: engine-worker.js structural presence ──"
WORKER_FILE="demos/engine-worker.js"
if [ -f "$WORKER_FILE" ]; then
  block_ok "demos/engine-worker.js exists"
  if grep -q "process\.versions\.node" "$WORKER_FILE" && grep -q "self\.postMessage" "$WORKER_FILE"; then
    block_ok "engine-worker.js has runtime detection"
  else
    block_fail "engine-worker.js missing runtime detection"
  fi
  if grep -q "import(" "$WORKER_FILE" && grep -q "engine-bundle\.mjs" "$WORKER_FILE"; then
    block_ok "engine-worker.js uses dynamic import of engine-bundle.mjs"
  else
    block_fail "engine-worker.js missing dynamic import of engine-bundle.mjs"
  fi
  if grep -q "type: ['\"]window['\"]" "$WORKER_FILE" \
     && grep -q "type: ['\"]terminal['\"]" "$WORKER_FILE" \
     && grep -q "type: ['\"]error['\"]" "$WORKER_FILE"; then
    block_ok "engine-worker.js emits window/terminal/error message types"
  else
    block_fail "engine-worker.js missing one or more message types"
  fi
else
  block_fail "demos/engine-worker.js missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: demo.html worker wiring presence ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: demo.html worker wiring presence ──"
DEMO_HTML="demos/demo.html"
if [ -f "$DEMO_HTML" ]; then
  if grep -q "new Worker(['\"]\\./engine-worker\\.js['\"]" "$DEMO_HTML"; then
    block_ok "demo.html spawns new Worker('./engine-worker.js')"
  else
    block_fail "demo.html missing Worker spawn"
  fi
  if grep -q "id=\"btn-cancel\"" "$DEMO_HTML" && grep -q "id=\"engine-error-banner\"" "$DEMO_HTML"; then
    block_ok "demo.html has #btn-cancel + #engine-error-banner"
  else
    block_fail "demo.html missing #btn-cancel or #engine-error-banner"
  fi
  if grep -q "worker\.onmessage" "$DEMO_HTML" && grep -q "scenarios\[['\"]custom['\"]\]" "$DEMO_HTML"; then
    block_ok "demo.html has worker.onmessage + scenarios.custom population"
  else
    block_fail "demo.html missing worker.onmessage or scenarios.custom"
  fi
  if grep -q "\.terminate()" "$DEMO_HTML"; then
    block_ok "demo.html invokes worker.terminate()"
  else
    block_fail "demo.html missing worker.terminate()"
  fi
else
  block_fail "demos/demo.html missing"
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

EXPECTED_TESTS=669
EXPECTED_PASS_MIN=649
EXPECTED_PASS_MAX=651
EXPECTED_FAIL=15
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
ALLOWED='^(tools/build-canned-demos\.ts|demos/demo\.html|demos/engine-worker\.js|test/q84-live-engine-compute\.test\.ts|coordination/specs/Q-R84-SPEC\.md|coordination/specs/Q-R84-SPEC-AUDIT\.md|coordination/specs/Q-R84-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R84\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'

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
