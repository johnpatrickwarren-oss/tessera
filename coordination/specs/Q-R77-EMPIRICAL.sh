#!/usr/bin/env bash
# Q-R77-EMPIRICAL.sh — binding-command harness for R77.
#
# Verifies the AC-bound observables (AC-R77-1, -2, -6, -12, -13, -14, -15,
# -16, -17). Exit 0 = all blocks pass. Exit non-zero = at least one block
# failed; failing block's diagnostic emitted to stdout.
#
# Invoked by Implementer at chore-A pre-commit AND by Reviewer at audit.
# Re-invokable at any HEAD ≥ chore-A.

set -uo pipefail

ROUND_START_SHA="0d64d9a"
EXIT=0

echo "── Q-R77-EMPIRICAL.sh @ HEAD=$(git rev-parse --short HEAD)"
echo ""

# ── Block 1: typecheck exit code (AC-R77-15) ──
echo "── Block 1: typecheck"
npx tsc -p tsconfig.test.json > /tmp/r77-block1.txt 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "Block 1 FAIL: npx tsc -p tsconfig.test.json exited $TSC_EXIT (expected 0)"
  tail -10 /tmp/r77-block1.txt
  EXIT=1
else
  echo "Block 1 PASS: tsc exit 0"
fi
echo ""

# ── Block 2: test pass/fail counts (AC-R77-16) ──
echo "── Block 2: test counts"
node --test --test-reporter=tap test/*.test.js > /tmp/r77-block2.txt 2>&1
TEST_EXIT=$?
TEST_PASS=$(grep -E "^# pass " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
TEST_SUITES=$(grep -E "^# suites " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
# Predicted: pass = 541 + 17 = 558; allow ±2 margin → [556, 560].
EXPECTED_PASS_MIN=556
EXPECTED_PASS_MAX=560
EXPECTED_FAIL=5
if [ "$TEST_FAIL" != "$EXPECTED_FAIL" ]; then
  echo "Block 2 FAIL: fail count = $TEST_FAIL; expected $EXPECTED_FAIL (carry-forward set preserved)"
  EXIT=1
elif [ -z "$TEST_PASS" ] || [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 2 FAIL: pass count = $TEST_PASS; expected in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX] (541 + 17 ± 2)"
  EXIT=1
else
  echo "Block 2 PASS: tests=$TEST_TESTS suites=$TEST_SUITES pass=$TEST_PASS fail=$TEST_FAIL"
fi
echo ""

# ── Block 3: anti-scope diff ⊆ ALLOWED_SET (AC-R77-17) ──
echo "── Block 3: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/detector-envelope\.ts|tools/detection-curve\.ts|scripts/detector-tuning-recommendation\.md|coordination/coverage/R77-detection-envelope-matrix\.json|coordination/coverage/R77-detection-envelope\.md|package\.json|README\.md|test/q77-detector-envelope\.test\.ts|coordination/specs/Q-R77-SPEC\.md|coordination/specs/Q-R77-SPEC-AUDIT\.md|coordination/specs/Q-R77-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/reviews/REVIEWER-REPORT-R77\.md|coordination/logs/ROUND-R77-ROUTING\.md|coordination/diagnostics/DIAGNOSTIC-R77-.*\.md)$'
UNAUTHORIZED=$(echo "$DIFF_FILES" | grep -vE "$ALLOWED" || true)
# Drop empty lines from grep output.
UNAUTHORIZED=$(echo "$UNAUTHORIZED" | sed '/^[[:space:]]*$/d')
if [ -n "$UNAUTHORIZED" ]; then
  echo "Block 3 FAIL: unauthorized paths in round-start..HEAD diff:"
  echo "$UNAUTHORIZED"
  EXIT=1
else
  TOTAL_DIFF_COUNT=$(echo "$DIFF_FILES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')
  echo "Block 3 PASS: $TOTAL_DIFF_COUNT diff paths all ⊆ ALLOWED_SET"
fi
echo ""

# ── Block 4: frozen surfaces byte-identical (AC-R77-13, AC-R77-14) ──
echo "── Block 4: frozen surfaces"
FROZEN_DIFF=$(git diff "$ROUND_START_SHA" HEAD -- \
  engine/ \
  tools/coverage-saturation.ts tools/demo-scenario.ts tools/build-canned-demos.ts \
  tools/curate-baseline-pipeline.ts tools/curate-baseline-pre-pass.ts tools/curate-baseline-fleet-correlated.ts \
  scripts/tier-router.ts scripts/tier-router-validate.ts scripts/mu-model-select.ts \
  scripts/build-role-context.ts scripts/measure-cache-effect.ts \
  run-pipeline.sh \
  coordination/coverage/R72-saturation-matrix.json coordination/coverage/R72-saturation-matrix.md)
if [ -n "$FROZEN_DIFF" ]; then
  echo "Block 4 FAIL: frozen surfaces modified between $ROUND_START_SHA..HEAD"
  echo "$FROZEN_DIFF" | head -20
  EXIT=1
else
  echo "Block 4 PASS: engine + frozen tools/scripts + R72 outputs byte-identical"
fi
echo ""

# ── Block 5: artifact existence (AC-R77-1, -2, -12) ──
echo "── Block 5: artifact existence"
MISSING=""
for F in \
  coordination/coverage/R77-detection-envelope-matrix.json \
  coordination/coverage/R77-detection-envelope.md \
  scripts/detector-tuning-recommendation.md \
  tools/detector-envelope.ts \
  tools/detection-curve.ts \
  test/q77-detector-envelope.test.ts; do
  if [ ! -f "$F" ]; then
    MISSING="$MISSING $F"
  fi
done
if [ -n "$MISSING" ]; then
  echo "Block 5 FAIL: missing required artifact(s):$MISSING"
  EXIT=1
else
  echo "Block 5 PASS: all 6 required artifacts present"
fi
echo ""

# ── Block 6: matrix idempotency (AC-R77-6) ──
echo "── Block 6: matrix idempotency"
if [ ! -f coordination/coverage/R77-detection-envelope-matrix.json ]; then
  echo "Block 6 FAIL: matrix file missing (Block 5 should have caught this)"
  EXIT=1
else
  EXISTING_BYTES=$(shasum -a 256 coordination/coverage/R77-detection-envelope-matrix.json | awk '{print $1}')
  if [ -f tools/detector-envelope.js ]; then
    node tools/detector-envelope.js > /tmp/r77-block6.txt 2>&1
    REGEN_EXIT=$?
    if [ "$REGEN_EXIT" -ne 0 ]; then
      echo "Block 6 FAIL: regeneration via node tools/detector-envelope.js exited $REGEN_EXIT"
      tail -10 /tmp/r77-block6.txt
      EXIT=1
    else
      REGEN_BYTES=$(shasum -a 256 coordination/coverage/R77-detection-envelope-matrix.json | awk '{print $1}')
      if [ "$EXISTING_BYTES" != "$REGEN_BYTES" ]; then
        echo "Block 6 FAIL: matrix NOT idempotent ($EXISTING_BYTES vs $REGEN_BYTES)"
        EXIT=1
      else
        echo "Block 6 PASS: matrix byte-identical across re-runs (sha256=$EXISTING_BYTES)"
      fi
    fi
  else
    echo "Block 6 SKIP: tools/detector-envelope.js not present; run prebuild:detector-envelope first"
  fi
fi
echo ""

# ── Block 7: matrix schema_version + cell count (AC-R77-3, -4) ──
echo "── Block 7: matrix schema + cell count"
if [ ! -f coordination/coverage/R77-detection-envelope-matrix.json ]; then
  echo "Block 7 SKIP: matrix file missing"
else
  SCHEMA_OK=$(grep -c '"schema_version": "tessera-detection-envelope-v1"' coordination/coverage/R77-detection-envelope-matrix.json)
  if [ "$SCHEMA_OK" -lt 1 ]; then
    echo "Block 7 FAIL: schema_version != 'tessera-detection-envelope-v1'"
    EXIT=1
  else
    CELL_OK=$(grep -c '"cell_idx":' coordination/coverage/R77-detection-envelope-matrix.json)
    if [ "$CELL_OK" -ne 504 ]; then
      echo "Block 7 FAIL: cell count = $CELL_OK; expected 504"
      EXIT=1
    else
      echo "Block 7 PASS: schema_version OK; 504 cells"
    fi
  fi
fi
echo ""

# ── Block 8: detector-tuning-recommendation.md required sections (AC-R77-12) ──
echo "── Block 8: detector-tuning-recommendation sections"
if [ ! -f scripts/detector-tuning-recommendation.md ]; then
  echo "Block 8 SKIP: scripts/detector-tuning-recommendation.md missing"
else
  REQUIRED_SECTIONS=("## Empirical envelope" "## Tuning levers" "## Theoretical Ville-bound floor" "## Operational tuning margin" "## How to use this document")
  MISSING_SECTIONS=""
  for SEC in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -qF "$SEC" scripts/detector-tuning-recommendation.md; then
      MISSING_SECTIONS="$MISSING_SECTIONS|$SEC"
    fi
  done
  if [ -n "$MISSING_SECTIONS" ]; then
    echo "Block 8 FAIL: missing required sections:$MISSING_SECTIONS"
    EXIT=1
  else
    echo "Block 8 PASS: all 5 required sections present"
  fi
fi
echo ""

# ── Final ──
echo "── Q-R77-EMPIRICAL.sh done; exit $EXIT"
exit "$EXIT"
