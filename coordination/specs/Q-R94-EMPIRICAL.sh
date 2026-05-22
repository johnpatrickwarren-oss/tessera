#!/usr/bin/env bash
# Q-R94-EMPIRICAL.sh — binding-command harness for R94 (Phase 5 SLICE 4 round
# 1 of 1 — engine repo extraction + Tessera migration to git-dep + engine/
# removal). Runs 11 blocks; each emits PASS or FAIL. Final exit aggregates.
#
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4) + R89 MAJOR-1: every
# TAP-format parse MUST be run against `--test-reporter=tap` output with the
# flag BEFORE test files.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1): fail counts
# bind a band [20, 21] when active ACs are documented as structurally flaky
# (AC-R84-14) AND carry-forward already-failing ACs add to fail count (per
# § 0.1 of spec).
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R88 false-compliance-attestation):
# every observable encoded verbatim from command output, not from prediction.
#
# Round-start SHA = `9e24aa4` (chore(R94 directive): engine repo extraction +
# Tessera migration to git-dep — Phase 5 SLICE 4 round 1 of 1).

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R94-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='9e24aa4'  # chore(R94 directive): engine repo extraction + Tessera migration to git-dep

# ALLOWED_REGEX — byte-mirrored across 4 surfaces per R82 propagation discipline:
#   (1) Q-R94-SPEC.md § 5.2
#   (2) test/q94-engine-repo-extraction.test.ts AC-R94-11 inline constant
#   (3) this script Block 11 (below)
#   (4) NEXT-ROLE.md Implementer routing block (copy-paste from § 5.2)
ALLOWED_REGEX='^(\.gitignore|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/VENDORING-MANIFEST\.md|coordination/specs/Q-R94-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R94\.md|coordination/logs/ROUND-R94-[A-Z0-9-]+\.md|coordination/diagnostics/DIAGNOSTIC-R94-[a-z0-9-]+\.md|engine/.+|package\.json|pnpm-lock\.yaml|test/q05-per-shard-runtime\.test\.ts|test/q94-engine-repo-extraction\.test\.ts|tsconfig\.json|tsconfig\.test\.json)$'

PASS_COUNT=0
FAIL_COUNT=0

block_ok()   { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
block_fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 1: ROUND_START_SHA constant verifies (sanity gate) ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 1: ROUND_START_SHA constant verifies ──"
if git cat-file -e "${ROUND_START_SHA}^{commit}" 2>/dev/null; then
  block_ok "ROUND_START_SHA ${ROUND_START_SHA} resolves to a valid commit"
else
  block_fail "ROUND_START_SHA ${ROUND_START_SHA} does not resolve"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 2: engine/ subdirectory removed from Tessera tree ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: engine/ subdirectory removed from Tessera tree ──"
if [ ! -d "engine" ]; then
  block_ok "engine/ directory absent"
else
  block_fail "engine/ directory still present"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: package.json dep is github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: package.json dep is github: with v0.1.0-pre tag ──"
DEP_URL=$(node -e "const p=require('./package.json'); process.stdout.write(String((p.dependencies||{})['@johnpatrickwarren-oss/deploysignal-engine']));" 2>/dev/null || echo "ERR")
if [ "$DEP_URL" = "github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre" ]; then
  block_ok "dep URL = ${DEP_URL}"
else
  block_fail "dep URL observed: ${DEP_URL} (expected github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: pnpm exec tsc -p tsconfig.test.json exits 0 ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: pnpm exec tsc -p tsconfig.test.json exits 0 ──"
TSC_OUT=$(pnpm exec tsc -p tsconfig.test.json 2>&1)
TSC_RC=$?
if [ "$TSC_RC" -eq 0 ]; then
  block_ok "tsc -p tsconfig.test.json exits 0"
else
  block_fail "tsc -p tsconfig.test.json exits ${TSC_RC} (output: $(echo "$TSC_OUT" | tail -3))"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: tsconfig.json has empty include + no paths/outDir/baseUrl/rootDir ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: tsconfig.json shape (empty include; no paths/outDir/baseUrl/rootDir) ──"
SHAPE_CHECK=$(node -e "
const t = require('./tsconfig.json');
const co = t.compilerOptions || {};
const issues = [];
if (!Array.isArray(t.include) || t.include.length !== 0) issues.push('include not empty');
if (co.outDir !== undefined) issues.push('outDir present');
if (co.rootDir !== undefined) issues.push('rootDir present');
if (co.baseUrl !== undefined) issues.push('baseUrl present');
if (co.paths !== undefined) issues.push('paths present');
process.stdout.write(issues.length ? 'BAD:' + issues.join(';') : 'OK');
" 2>/dev/null || echo "ERR")
if [ "$SHAPE_CHECK" = "OK" ]; then
  block_ok "tsconfig.json shape correct"
else
  block_fail "tsconfig.json issues: ${SHAPE_CHECK}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 6: tsconfig.test.json include excludes engine/**/*.ts ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 6: tsconfig.test.json include excludes engine/**/*.ts ──"
TEST_INC_CHECK=$(node -e "
const t = require('./tsconfig.test.json');
const inc = t.include || [];
const hasEngine = inc.includes('engine/**/*.ts');
const hasTest = inc.includes('test/**/*.ts');
const hasTools = inc.includes('tools/**/*.ts');
const hasScripts = inc.includes('scripts/**/*.ts');
if (!hasEngine && hasTest && hasTools && hasScripts) process.stdout.write('OK');
else process.stdout.write('BAD: hasEngine=' + hasEngine + ' hasTest=' + hasTest + ' hasTools=' + hasTools + ' hasScripts=' + hasScripts);
" 2>/dev/null || echo "ERR")
if [ "$TEST_INC_CHECK" = "OK" ]; then
  block_ok "tsconfig.test.json include shape correct"
else
  block_fail "tsconfig.test.json issues: ${TEST_INC_CHECK}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 7: VENDORING-MANIFEST.md has R94 extraction header note ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 7: VENDORING-MANIFEST.md has R94 extraction header note ──"
MANIFEST="coordination/VENDORING-MANIFEST.md"
if [ -f "$MANIFEST" ] && grep -qE '^## R94 extraction note' "$MANIFEST" && \
   grep -q 'git filter-repo --subdirectory-filter engine' "$MANIFEST" && \
   grep -q 'johnpatrickwarren-oss/deploysignal-engine' "$MANIFEST"; then
  block_ok "VENDORING-MANIFEST.md has R94 extraction note with filter-repo + new-repo references"
else
  block_fail "VENDORING-MANIFEST.md missing R94 extraction header note (or missing filter-repo / new-repo references)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 8: full TAP within band — tests=758 / pass∈[679,684] / fail∈[70,75] / skip=4 ──
#   AMENDED 2026-05-22 per operator R94 ESCALATE Option A+D resolution:
#   ~51 historical engine-source-tests (Q1, R18, R20, R23, R29, R30, R32, R34, R36,
#   R38, R53, R56, R58, R62, R82) + R90/R91/R93 forward-protection ACs flipped
#   PASS→FAIL because R94 removes Tessera's local engine/. Architect's spec § 0.1
#   prediction was wrong (assumed no PASSING ACs check engine/*.ts source paths).
#   Implementer recommendation accepted: accept as carry-forward; R95 scheduled
#   to delete/redirect the defunct ACs. Original band [20,21] preserved here
#   as a comment for audit-trail; new band reflects post-extraction reality.
#   Pre-amendment band: tests=758 / pass∈[733,734] / fail∈[20,21] / skip=4
# (Per R77 OBS-4 + R89 MAJOR-1: --test-reporter=tap BEFORE test files; per R85
#  CRITICAL-1: fail count is a BAND, not strict.)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 8: full TAP within band ──"
TAP_OUT=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20)
TESTS=$(echo "$TAP_OUT" | grep -E '^# tests ' | sed -E 's/^# tests +//' || echo "0")
PASS_N=$(echo "$TAP_OUT" | grep -E '^# pass ' | sed -E 's/^# pass +//' || echo "0")
FAIL_N=$(echo "$TAP_OUT" | grep -E '^# fail ' | sed -E 's/^# fail +//' || echo "0")
SKIP_N=$(echo "$TAP_OUT" | grep -E '^# skipped ' | sed -E 's/^# skipped +//' || echo "0")
EXPECTED_TESTS=758
EXPECTED_PASS_LO=679; EXPECTED_PASS_HI=684
EXPECTED_FAIL_LO=70;  EXPECTED_FAIL_HI=75
EXPECTED_SKIP=4
TAP_BAND_OK=true
[ "$TESTS" = "$EXPECTED_TESTS" ] || TAP_BAND_OK=false
[ "$PASS_N" -ge "$EXPECTED_PASS_LO" ] && [ "$PASS_N" -le "$EXPECTED_PASS_HI" ] || TAP_BAND_OK=false
[ "$FAIL_N" -ge "$EXPECTED_FAIL_LO" ] && [ "$FAIL_N" -le "$EXPECTED_FAIL_HI" ] || TAP_BAND_OK=false
[ "$SKIP_N" = "$EXPECTED_SKIP" ] || TAP_BAND_OK=false
if [ "$TAP_BAND_OK" = "true" ]; then
  block_ok "tests=${TESTS} pass=${PASS_N} fail=${FAIL_N} skip=${SKIP_N} — all within band"
else
  block_fail "tests=${TESTS} (expected ${EXPECTED_TESTS}); pass=${PASS_N} (expected [${EXPECTED_PASS_LO},${EXPECTED_PASS_HI}]); fail=${FAIL_N} (expected [${EXPECTED_FAIL_LO},${EXPECTED_FAIL_HI}]); skip=${SKIP_N} (expected ${EXPECTED_SKIP})"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 9: q94 ACs all PASS ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 9: q94 ACs all PASS ──"
Q94_JS="test/q94-engine-repo-extraction.test.js"
if [ ! -f "$Q94_JS" ]; then
  block_fail "${Q94_JS} not found (pretest may not have built it)"
else
  Q94_TAP=$(pnpm exec node --test --test-reporter=tap "$Q94_JS" 2>&1 | tail -10)
  Q94_FAIL=$(echo "$Q94_TAP" | grep -E '^# fail ' | sed -E 's/^# fail +//' || echo "ERR")
  Q94_PASS=$(echo "$Q94_TAP" | grep -E '^# pass ' | sed -E 's/^# pass +//' || echo "ERR")
  if [ "$Q94_FAIL" = "0" ] && [ "$Q94_PASS" = "13" ]; then
    block_ok "q94 13/13 PASS, 0/13 FAIL"
  else
    block_fail "q94: pass=${Q94_PASS} fail=${Q94_FAIL} (expected 13/0)"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 10: anti-scope diff ROUND_START_SHA..HEAD ⊆ ALLOWED_REGEX ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 10: anti-scope diff ⊆ ALLOWED_REGEX ──"
UNAUTHORIZED=$(git diff "${ROUND_START_SHA}" HEAD --name-only 2>&1 | grep -vE "$ALLOWED_REGEX" || true)
if [ -z "$UNAUTHORIZED" ]; then
  block_ok "every diff path matches ALLOWED_REGEX"
else
  block_fail "unauthorized paths: $(echo "$UNAUTHORIZED" | tr '\n' ' ')"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 11: ALLOWED_REGEX byte-identical between spec § 5.2 and q94 test file ──
# (R82 spec-amendment-ALL-gate-artifacts-propagation discipline; 4-surface
#  byte-mirror. Only 2 surfaces are mechanically checkable here: this script's
#  $ALLOWED_REGEX and the q94 test file's ALLOWED_REGEX constant. The spec §
#  5.2 and NEXT-ROLE.md routing block are inspected manually by Reviewer.)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 11: ALLOWED_REGEX byte-identical (script ↔ q94 test) ──"
Q94_TS="test/q94-engine-repo-extraction.test.ts"
if [ ! -f "$Q94_TS" ]; then
  block_fail "${Q94_TS} not found"
else
  # Extract the ALLOWED_REGEX literal from q94 source (between /^ and $/)
  Q94_REGEX=$(grep -oE 'const ALLOWED_REGEX = /\^[^;]+/' "$Q94_TS" | head -1 | sed -E 's|^const ALLOWED_REGEX = /||; s|/$||')
  # Build the expected literal from this script's variable (strip outer single-quotes; the script uses '^...$' form which is what we compare)
  EXPECTED="$ALLOWED_REGEX"
  if [ "$Q94_REGEX" = "$EXPECTED" ]; then
    block_ok "ALLOWED_REGEX byte-identical between Q-R94-EMPIRICAL.sh and q94 test file"
  else
    block_fail "ALLOWED_REGEX mismatch — script: ${EXPECTED:0:80}... vs q94: ${Q94_REGEX:0:80}..."
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Summary + exit ──
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "Total: ${PASS_COUNT} PASS / ${FAIL_COUNT} FAIL (${TOTAL} blocks)."
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "Exit: 0"
  exit 0
else
  echo "Exit: 1"
  exit 1
fi
