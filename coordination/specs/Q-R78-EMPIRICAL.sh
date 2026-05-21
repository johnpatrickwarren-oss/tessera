#!/usr/bin/env bash
# Q-R78-EMPIRICAL.sh — binding-command harness for R78.
#
# Verifies the AC-bound observables (AC-R78-1, -2, -3, -5, -8, -9, -11, -12,
# -13, -14). Exit 0 = all blocks pass. Exit non-zero = at least one block
# failed; failing block's diagnostic emitted to stdout.
#
# Invoked by Implementer at chore-A pre-commit AND by Reviewer at audit.
# Re-invokable at any HEAD >= chore-A.
#
# R77 lesson absorbed: Block 3 uses `node --test --test-reporter=tap` so the
# TAP summary lines (`# pass`, `# fail`) can be greppped reliably.

set -uo pipefail

ROUND_START_SHA="3d00490"
EXIT=0

echo "── Q-R78-EMPIRICAL.sh @ HEAD=$(git rev-parse --short HEAD)"
echo ""

# ── Block 1: typecheck exit code ──
echo "── Block 1: typecheck"
npx tsc -p tsconfig.test.json > /tmp/r78-block1.txt 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "Block 1 FAIL: npx tsc -p tsconfig.test.json exited $TSC_EXIT (expected 0)"
  tail -10 /tmp/r78-block1.txt
  EXIT=1
else
  echo "Block 1 PASS: tsc exit 0"
fi
echo ""

# ── Block 2: required artifact existence (AC-R78-1, -2, -11) ──
echo "── Block 2: required artifact existence"
MISSING=""
for F in \
  tools/topology-walk-tuning.ts \
  scripts/topology-walk-tuning-recommendation.md \
  coordination/coverage/R78-topology-walk-tuning-matrix.json \
  coordination/coverage/R78-topology-walk-tuning.md \
  test/q78-topology-walk-tuning.test.ts; do
  if [ ! -f "$F" ]; then
    MISSING="$MISSING $F"
  fi
done
if [ -n "$MISSING" ]; then
  echo "Block 2 FAIL: missing required artifact(s):$MISSING"
  EXIT=1
else
  echo "Block 2 PASS: all 5 required artifacts present"
fi
echo ""

# ── Block 3: test pass/fail counts (R77 lesson: --test-reporter=tap) ──
echo "── Block 3: test counts"
node --test --test-reporter=tap test/*.test.js > /tmp/r78-block3.txt 2>&1
TEST_EXIT=$?
TEST_PASS=$(grep -E "^# pass " /tmp/r78-block3.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r78-block3.txt | head -1 | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r78-block3.txt | head -1 | awk '{print $3}')
TEST_SUITES=$(grep -E "^# suites " /tmp/r78-block3.txt | head -1 | awk '{print $3}')
# Predicted at chore-A: pass = 556 + 14 = 570; allow ±2 margin → [568, 572]. fail = 6 exact.
EXPECTED_PASS_MIN=568
EXPECTED_PASS_MAX=572
EXPECTED_FAIL=6
if [ -z "$TEST_FAIL" ] || [ "$TEST_FAIL" != "$EXPECTED_FAIL" ]; then
  echo "Block 3 FAIL: fail count = '${TEST_FAIL:-<empty>}'; expected $EXPECTED_FAIL (carry-forward set preserved)"
  EXIT=1
elif [ -z "$TEST_PASS" ] || [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 3 FAIL: pass count = '${TEST_PASS:-<empty>}'; expected in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX] (556 + 14 ± 2)"
  EXIT=1
else
  echo "Block 3 PASS: tests=$TEST_TESTS suites=$TEST_SUITES pass=$TEST_PASS fail=$TEST_FAIL"
fi
echo ""

# ── Block 4: anti-scope diff ⊆ ALLOWED_SET (AC-R78-14) ──
echo "── Block 4: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/topology-walk-tuning\.ts|scripts/topology-walk-tuning-recommendation\.md|coordination/coverage/R78-topology-walk-tuning-matrix\.json|coordination/coverage/R78-topology-walk-tuning\.md|package\.json|README\.md|test/q78-topology-walk-tuning\.test\.ts|coordination/specs/Q-R78-SPEC\.md|coordination/specs/Q-R78-SPEC-AUDIT\.md|coordination/specs/Q-R78-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/reviews/REVIEWER-REPORT-R78\.md|coordination/logs/ROUND-R78-ROUTING\.md|coordination/logs/ROUND-R78-SUMMARY\.md|coordination/diagnostics/DIAGNOSTIC-R78-.*\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'
UNAUTHORIZED=$(echo "$DIFF_FILES" | grep -vE "$ALLOWED" || true)
UNAUTHORIZED=$(echo "$UNAUTHORIZED" | sed '/^[[:space:]]*$/d')
if [ -n "$UNAUTHORIZED" ]; then
  echo "Block 4 FAIL: unauthorized paths in round-start..HEAD diff:"
  echo "$UNAUTHORIZED"
  EXIT=1
else
  TOTAL_DIFF_COUNT=$(echo "$DIFF_FILES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')
  echo "Block 4 PASS: $TOTAL_DIFF_COUNT diff paths all ⊆ ALLOWED_SET"
fi
echo ""

# ── Block 5: matrix schema_version + cell count (AC-R78-3) ──
echo "── Block 5: matrix schema + cell count"
if [ ! -f coordination/coverage/R78-topology-walk-tuning-matrix.json ]; then
  echo "Block 5 SKIP: matrix file missing (Block 2 should have caught this)"
  EXIT=1
else
  SCHEMA_OK=$(grep -c '"schema_version": "tessera-topology-walk-tuning-v1"' coordination/coverage/R78-topology-walk-tuning-matrix.json)
  if [ "$SCHEMA_OK" -lt 1 ]; then
    echo "Block 5 FAIL: schema_version != 'tessera-topology-walk-tuning-v1'"
    EXIT=1
  else
    CELL_OK=$(grep -c '"cell_idx":' coordination/coverage/R78-topology-walk-tuning-matrix.json)
    if [ "$CELL_OK" -ne 30 ]; then
      echo "Block 5 FAIL: cell count = $CELL_OK; expected 30"
      EXIT=1
    else
      echo "Block 5 PASS: schema_version OK; 30 cells"
    fi
  fi
fi
echo ""

# ── Block 6: frozen surfaces byte-identical (AC-R78-12, -13) ──
echo "── Block 6: frozen surfaces"
FROZEN_DIFF=$(git diff "$ROUND_START_SHA" HEAD -- \
  engine/ \
  tools/coverage-saturation.ts tools/detector-envelope.ts tools/detection-curve.ts \
  tools/demo-scenario.ts tools/build-canned-demos.ts \
  tools/curate-baseline-pipeline.ts tools/curate-baseline-pre-pass.ts tools/curate-baseline-fleet-correlated.ts \
  scripts/tier-router.ts scripts/tier-router-validate.ts scripts/mu-model-select.ts \
  scripts/build-role-context.ts scripts/measure-cache-effect.ts \
  scripts/detector-tuning-recommendation.md scripts/tier-router-criteria.md \
  run-pipeline.sh \
  coordination/coverage/R72-saturation-matrix.json coordination/coverage/R72-saturation-matrix.md \
  coordination/coverage/R77-detection-envelope-matrix.json coordination/coverage/R77-detection-envelope.md)
if [ -n "$FROZEN_DIFF" ]; then
  echo "Block 6 FAIL: frozen surfaces modified between $ROUND_START_SHA..HEAD"
  echo "$FROZEN_DIFF" | head -30
  EXIT=1
else
  echo "Block 6 PASS: engine + frozen tools/scripts + R72/R77 outputs byte-identical"
fi
echo ""

# ── Block 7: recommendation MD has 5 required sections (AC-R78-11) ──
echo "── Block 7: recommendation MD sections"
if [ ! -f scripts/topology-walk-tuning-recommendation.md ]; then
  echo "Block 7 SKIP: scripts/topology-walk-tuning-recommendation.md missing"
  EXIT=1
else
  REQUIRED_SECTIONS=("## Empirical envelope" "## Tuning levers operators can adjust" "## Recommended operator defaults" "## Theoretical attribution floor" "## How to use this document")
  MISSING_SECTIONS=""
  for SEC in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -qF "$SEC" scripts/topology-walk-tuning-recommendation.md; then
      MISSING_SECTIONS="$MISSING_SECTIONS|$SEC"
    fi
  done
  if [ -n "$MISSING_SECTIONS" ]; then
    echo "Block 7 FAIL: missing required sections:$MISSING_SECTIONS"
    EXIT=1
  else
    echo "Block 7 PASS: all 5 required sections present"
  fi
fi
echo ""

# ── Block 8: per-cell exact-equality summary check (AC-R78-5, -8, -9 surrogate) ──
echo "── Block 8: per-cell summary spot-checks"
if [ ! -f coordination/coverage/R78-topology-walk-tuning-matrix.json ]; then
  echo "Block 8 SKIP: matrix file missing"
  EXIT=1
else
  # Cell 0: POS-CZ-SPARSE hop=1 min=2 → cz=0 rack=0 shadow=0
  # Cell 2: POS-CZ-SPARSE hop=2 min=2 → cz=5 rack=0 shadow=0
  # Cell 11: POS-CZ-FULL hop=3 min=3 → cz=5 rack=5 shadow=5
  # Cell 28: NEG-INDEP hop=3 min=2 → cz=1 rack=1 shadow=1
  # Cell 29: NEG-INDEP hop=3 min=3 → cz=0 rack=0 shadow=0
  # Spot-check 5 representative cells via python3.
  PYOUT=$(python3 - <<'PY'
import json, sys
m = json.load(open('coordination/coverage/R78-topology-walk-tuning-matrix.json'))
cells = {c['cell_idx']: c for c in m['cells']}
expected = {
  0:  (0, 0, 0),  # POS-CZ-SPARSE hop=1 min=2
  2:  (5, 0, 0),  # POS-CZ-SPARSE hop=2 min=2
  11: (5, 5, 5),  # POS-CZ-FULL hop=3 min=3
  28: (1, 1, 1),  # NEG-INDEP hop=3 min=2
  29: (0, 0, 0),  # NEG-INDEP hop=3 min=3
}
ok = True
for idx, (cz, rk, sh) in expected.items():
  c = cells.get(idx)
  if c is None:
    print(f"FAIL cell {idx} missing"); ok = False; continue
  s = c['summary']
  if (s['cz_detection_count'], s['rack_detection_count'], s['shadow_rack_fp_count']) != (cz, rk, sh):
    print(f"FAIL cell {idx}: got ({s['cz_detection_count']},{s['rack_detection_count']},{s['shadow_rack_fp_count']}); expected ({cz},{rk},{sh})")
    ok = False
print("OK" if ok else "FAIL_SUMMARY")
PY
)
  if echo "$PYOUT" | grep -q "FAIL"; then
    echo "Block 8 FAIL: per-cell spot-checks failed"
    echo "$PYOUT"
    EXIT=1
  else
    echo "Block 8 PASS: 5 spot-cells (0, 2, 11, 28, 29) match § 1.4 pre-prediction"
  fi
fi
echo ""

# ── Final ──
echo "── Q-R78-EMPIRICAL.sh done; exit $EXIT"
exit "$EXIT"
