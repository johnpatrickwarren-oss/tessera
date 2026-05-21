#!/usr/bin/env bash
# Q-R88-EMPIRICAL.sh — binding-command harness for R88 (Phase 5 SLICE 1 —
# operator-minimal baseline curation flow).
#
# Runs 6 blocks; each exits non-zero on failure. Final exit aggregates.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4): every TAP-format
# parse MUST be run against `--test-reporter=tap` output.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1): fail counts
# bind a band when any active AC is documented as structurally flaky.

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R88-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='7887298'  # chore(R88 directive): operator-minimal baseline curation flow; Phase 5 SLICE 1 opens

PASS_COUNT=0
FAIL_COUNT=0

block_ok()   { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
block_fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 1: typecheck (AC-R88-11) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 1: typecheck ──"
if pnpm exec tsc -p tsconfig.test.json >/dev/null 2>&1; then
  block_ok "tsc -p tsconfig.test.json exits 0"
else
  block_fail "tsc -p tsconfig.test.json exits non-zero"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 2: wrapper file structure (AC-R88-13) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: tools/curate-baseline.ts structure ──"
WRAPPER='tools/curate-baseline.ts'
if [ -f "$WRAPPER" ]; then
  EXPORT_COUNT=$(grep -c '^export function ' "$WRAPPER" || true)
  if [ -n "$EXPORT_COUNT" ] && [ "$EXPORT_COUNT" -ge 5 ]; then
    block_ok "$WRAPPER has $EXPORT_COUNT exported functions (expected ≥ 5)"
  else
    block_fail "$WRAPPER has $EXPORT_COUNT exported functions (expected ≥ 5)"
  fi
  # CLI guard present
  if grep -q 'require\.main === module' "$WRAPPER"; then
    block_ok "$WRAPPER has 'require.main === module' CLI guard"
  else
    block_fail "$WRAPPER missing 'require.main === module' CLI guard"
  fi
  # Imports the composer (Stage 2a+2b)
  if grep -q "curateBaselineFleetCorrelated" "$WRAPPER"; then
    block_ok "$WRAPPER imports curateBaselineFleetCorrelated"
  else
    block_fail "$WRAPPER missing curateBaselineFleetCorrelated import"
  fi
else
  block_fail "$WRAPPER missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: package.json script entry (AC-R88-14) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: package.json curate-baseline script ──"
PKG='package.json'
SCRIPT_COUNT=$(grep -c '"curate-baseline"' "$PKG" || true)
if [ -n "$SCRIPT_COUNT" ] && [ "$SCRIPT_COUNT" -ge 1 ]; then
  block_ok "$PKG has \"curate-baseline\" script key (≥1 match)"
else
  block_fail "$PKG missing \"curate-baseline\" script key"
fi
# Also verify the script value invokes the compiled .js
if grep -q '"curate-baseline":.*tools/curate-baseline\.js' "$PKG"; then
  block_ok "$PKG curate-baseline script invokes tools/curate-baseline.js"
else
  block_fail "$PKG curate-baseline script does not reference tools/curate-baseline.js"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: README.md Baseline curation section (AC-R88-15) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: README.md Baseline curation section ──"
README='README.md'
# Use flag-toggling awk per R85 MAJOR-2 lesson (start + end heading overlap on '^## '):
SECTION_BODY=$(awk '/^## Baseline curation/{flag=1;next} flag && /^## /{exit} flag' "$README")
if [ -n "$SECTION_BODY" ]; then
  REF_COUNT=$(echo "$SECTION_BODY" | grep -c 'curate-baseline' || true)
  if [ -n "$REF_COUNT" ] && [ "$REF_COUNT" -ge 1 ]; then
    block_ok "README has '## Baseline curation' section referencing 'curate-baseline' ($REF_COUNT mentions)"
  else
    block_fail "README '## Baseline curation' section present but contains 0 'curate-baseline' references"
  fi
else
  block_fail "README missing '## Baseline curation' section (awk range returned empty)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: test baseline transition (AC-R88-12) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: test counts ──"
TAP_OUTPUT="$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20)"
TESTS=$(echo "$TAP_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS=$(echo "$TAP_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL=$(echo "$TAP_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIPPED=$(echo "$TAP_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')

echo "  observed: tests=$TESTS pass=$PASS fail=$FAIL skipped=$SKIPPED"

# Round-start baseline at SHA 7887298 (Architect-verified at Q-R88-SPEC.md § 0.2):
#   tests=692 pass=673 fail=15 skipped=4
# AC-R84-14 stochastic flake (~25% per R85 REVIEWER MINOR-2; MEMORIAL.md:2583) → fail band ±1.
#
# R88 delta:
#   +10 new top-level test() blocks in test/q88-baseline-curation-flow.test.ts (AC-R88-1..AC-R88-10)
#   No prior test transitions PASS→FAIL
#
# Predicted post-R88 chore-A:
#   tests = 692 + 10 = 702
#   fail  = 15 or 16 (band; AC-R84-14 ±1)
#   skipped = 4 (unchanged)
#   pass  = 702 − fail − skipped = 682 or 683

EXPECTED_TESTS=702
EXPECTED_FAIL_MIN=15
EXPECTED_FAIL_MAX=16
EXPECTED_SKIPPED=4
EXPECTED_PASS_MIN=682
EXPECTED_PASS_MAX=683

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
# ── Block 6: anti-scope diff (AC-R88-16) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 6: anti-scope diff ──"
# ALLOWED_SET must match Q-R88-SPEC.md § 5.2 verbatim.
ALLOWED='^(tools/curate-baseline\.ts|tools/curate-baseline\.js|test/q88-baseline-curation-flow\.test\.ts|test/q88-baseline-curation-flow\.test\.js|test/_substrate/curation-corpus-clean\.json|test/_substrate/curation-corpus-moderate\.json|test/_substrate/curation-corpus-heterogeneous\.json|package\.json|README\.md|coordination/specs/Q-R88-SPEC\.md|coordination/specs/Q-R88-SPEC-AUDIT\.md|coordination/specs/Q-R88-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R88(-opus|-sonnet)?\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'

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
