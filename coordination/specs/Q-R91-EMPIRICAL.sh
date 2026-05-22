#!/usr/bin/env bash
# Q-R91-EMPIRICAL.sh — binding-command harness for R91 (Phase 5 SLICE 3 round 2
# — Tessera-internal consumption migration: switch test/* + tools/* consumers from
# '../engine/...' relative imports to '@johnpatrickwarren-oss/deploysignal-engine/...'
# package-path imports via TypeScript paths mapping + file: dep + pretest chain).
#
# Runs 10 blocks; each emits PASS or FAIL. Final exit aggregates.
#
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4) + R89 MAJOR-1: every
# TAP-format parse MUST be run against `--test-reporter=tap` output with the flag
# BEFORE test files.
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1): fail counts
# bind a band when active ACs are documented as structurally flaky AND
# carry-forward already-failing ACs add to fail count.
#
# Round-start SHA = `a63da14` (chore(R91 directive): Tessera-internal consumption
# migration — Phase 5 SLICE 3 round 2 of 4-round chain).

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R91-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='a63da14'  # chore(R91 directive): Tessera-internal consumption migration

PASS_COUNT=0
FAIL_COUNT=0

block_ok()   { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
block_fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 1: tsconfig.json paths mapping present ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 1: tsconfig.json paths mapping present ──"
PATHS_KEY_1=$(node -e "const t=require('./tsconfig.json'); const p=t.compilerOptions && t.compilerOptions.paths; if (p && JSON.stringify(p['@johnpatrickwarren-oss/deploysignal-engine'])==='[\"./engine/types/index\"]') process.stdout.write('OK1'); else process.stdout.write('NO');" 2>/dev/null || echo "ERR")
PATHS_KEY_2=$(node -e "const t=require('./tsconfig.json'); const p=t.compilerOptions && t.compilerOptions.paths; if (p && JSON.stringify(p['@johnpatrickwarren-oss/deploysignal-engine/*'])==='[\"./engine/*\"]') process.stdout.write('OK2'); else process.stdout.write('NO');" 2>/dev/null || echo "ERR")
BASE_URL=$(node -e "const t=require('./tsconfig.json'); process.stdout.write(String(t.compilerOptions && t.compilerOptions.baseUrl));" 2>/dev/null || echo "ERR")
if [ "$PATHS_KEY_1" = "OK1" ] && [ "$PATHS_KEY_2" = "OK2" ] && [ "$BASE_URL" = "." ]; then
  block_ok "tsconfig.json has paths mapping + baseUrl"
else
  block_fail "tsconfig.json paths/baseUrl absent or wrong: key1=$PATHS_KEY_1 key2=$PATHS_KEY_2 baseUrl=$BASE_URL"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 2: package.json file: dep present ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: package.json file: dep present ──"
DEP_VAL=$(node -e "const p=require('./package.json'); process.stdout.write(String(p.dependencies && p.dependencies['@johnpatrickwarren-oss/deploysignal-engine']));" 2>/dev/null || echo "ERR")
if [ "$DEP_VAL" = "file:./engine" ]; then
  block_ok "package.json dependencies['@johnpatrickwarren-oss/deploysignal-engine'] == 'file:./engine'"
else
  block_fail "package.json file: dep absent or wrong: actual='$DEP_VAL'"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: package.json pretest extended ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: package.json pretest extended ──"
PRETEST_VAL=$(node -e "const p=require('./package.json'); process.stdout.write(String(p.scripts && p.scripts.pretest));" 2>/dev/null || echo "ERR")
if [ "$PRETEST_VAL" = "tsc && tsc -p tsconfig.test.json" ]; then
  block_ok "package.json scripts.pretest == 'tsc && tsc -p tsconfig.test.json'"
else
  block_fail "package.json scripts.pretest wrong: actual='$PRETEST_VAL'"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: node_modules symlink/dir exists ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: node_modules symlink/dir exists ──"
NM_PATH="node_modules/@johnpatrickwarren-oss/deploysignal-engine"
if [ -L "$NM_PATH" ] || [ -d "$NM_PATH" ]; then
  block_ok "$NM_PATH exists (symlink or dir post pnpm install)"
else
  block_fail "$NM_PATH absent; pnpm install must run"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: 5 representative require.resolve probes ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: 5 representative require.resolve probes ──"
RESOLVE_FAILS=0
for SP in \
  "@johnpatrickwarren-oss/deploysignal-engine/types/verdict" \
  "@johnpatrickwarren-oss/deploysignal-engine/types/config" \
  "@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process" \
  "@johnpatrickwarren-oss/deploysignal-engine/topology-overlay" \
  "@johnpatrickwarren-oss/deploysignal-engine/ds-integration" ; do
  RESOLVED=$(node -e "try { console.log(require.resolve('$SP')); } catch (e) { console.log('ERR:' + e.message); }" 2>/dev/null || echo "ERR")
  case "$RESOLVED" in
    *engine/dist/*.js)
      ;;
    *)
      echo "    subpath '$SP' did not resolve under engine/dist: $RESOLVED"
      RESOLVE_FAILS=$((RESOLVE_FAILS + 1))
      ;;
  esac
done
if [ "$RESOLVE_FAILS" = "0" ]; then
  block_ok "5/5 representative subpath resolves succeed under engine/dist"
else
  block_fail "$RESOLVE_FAILS / 5 subpath resolves failed"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 6: zero relative '../engine' imports in test/ + tools/ ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 6: zero relative ../engine imports in test/ + tools/ ──"
ORPHANS=$(grep -rl "from ['\"]\\.\\..*engine" test/ tools/ 2>/dev/null || true)
if [ -z "$ORPHANS" ]; then
  block_ok "zero relative ../engine imports in test/ + tools/"
else
  ORPHAN_COUNT=$(printf '%s\n' "$ORPHANS" | wc -l | tr -d ' ')
  block_fail "$ORPHAN_COUNT files still contain relative ../engine imports:"
  printf '%s\n' "$ORPHANS" | head -5 | sed 's/^/    /'
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 7: pnpm exec tsc -p tsconfig.test.json --noEmit exits 0 ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 7: pnpm exec tsc -p tsconfig.test.json --noEmit exits 0 ──"
TSC_OUT=$(pnpm exec tsc -p tsconfig.test.json --noEmit 2>&1)
TSC_EXIT=$?
if [ "$TSC_EXIT" = "0" ]; then
  block_ok "tsc -p tsconfig.test.json --noEmit exit 0"
else
  block_fail "tsc -p tsconfig.test.json --noEmit exit $TSC_EXIT"
  echo "$TSC_OUT" | tail -10 | sed 's/^/    /'
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 8: full test count band [R85 CRITICAL-1 + R83 sub-pattern] ──
# At R91 close, all 14 q91 ACs PASS; pre-existing pass/fail counts carry forward
# ± AC-R84-14 stochastic flake ~25% (R85 REVIEWER MINOR-2). Predicted bands:
#   tests ∈ [736, 740]   (724 baseline + 14 q91 ACs ± minor variance)
#   pass  ∈ [714, 718]   (702 baseline + 14 q91 ACs ± stochastic)
#   fail  ∈ [17, 20]     (carry-forward 12 anti-scope-diff ACs + stochastic ± deterministic acknowledged)
#   skip  ==  4          (unchanged)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 8: full test count band [R85 + R83] ──"
TAP=$(node --test --test-reporter=tap test/*.test.js 2>&1 | tail -30)
TESTS=$(echo "$TAP" | grep -E '^# tests ' | awk '{print $3}' || echo "0")
PASS=$(echo "$TAP" | grep -E '^# pass ' | awk '{print $3}' || echo "0")
FAILS=$(echo "$TAP" | grep -E '^# fail ' | awk '{print $3}' || echo "0")
SKIP=$(echo "$TAP" | grep -E '^# skipped ' | awk '{print $3}' || echo "0")
TESTS_MIN=736; TESTS_MAX=740
PASS_MIN=714;  PASS_MAX=718
FAIL_MIN=17;   FAIL_MAX=20
SKIP_EXPECT=4

OK_TESTS=$([ "$TESTS" -ge "$TESTS_MIN" ] && [ "$TESTS" -le "$TESTS_MAX" ] && echo "Y" || echo "N")
OK_PASS=$([ "$PASS" -ge "$PASS_MIN" ] && [ "$PASS" -le "$PASS_MAX" ] && echo "Y" || echo "N")
OK_FAIL=$([ "$FAILS" -ge "$FAIL_MIN" ] && [ "$FAILS" -le "$FAIL_MAX" ] && echo "Y" || echo "N")
OK_SKIP=$([ "$SKIP" = "$SKIP_EXPECT" ] && echo "Y" || echo "N")

if [ "$OK_TESTS" = "Y" ] && [ "$OK_PASS" = "Y" ] && [ "$OK_FAIL" = "Y" ] && [ "$OK_SKIP" = "Y" ]; then
  block_ok "test counts in band: tests=$TESTS pass=$PASS fail=$FAILS skip=$SKIP"
else
  block_fail "test counts out of band: tests=$TESTS [$TESTS_MIN,$TESTS_MAX]=$OK_TESTS pass=$PASS [$PASS_MIN,$PASS_MAX]=$OK_PASS fail=$FAILS [$FAIL_MIN,$FAIL_MAX]=$OK_FAIL skip=$SKIP =$SKIP_EXPECT?$OK_SKIP"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 9: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET ──
# ALLOWED regex BYTE-MIRRORED to Q-R91-SPEC.md § 5.3 + test/q91-... AC-R91-12
# (R82 propagation discipline).
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 9: anti-scope diff ⊆ ALLOWED_SET ──"
ALLOWED='^(tsconfig\.json|package\.json|pnpm-lock\.yaml|test/[^/]+\.test\.ts|test/_substrate/[^/]+\.ts|tools/[^/]+\.ts|tools/calibrators/[^/]+\.ts|coordination/VENDORING-MANIFEST\.md|coordination/specs/Q-R91-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R91\.md|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/logs/ROUND-R91-.*)$'
VIOLATORS=$(git diff "$ROUND_START_SHA" HEAD --name-only | grep -Ev "$ALLOWED" || true)
if [ -z "$VIOLATORS" ]; then
  block_ok "anti-scope diff round-start..HEAD ⊆ ALLOWED_SET"
else
  block_fail "anti-scope violators:"
  echo "$VIOLATORS" | sed 's/^/    /'
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 10: VENDORING-MANIFEST.md has R91 header note + R90 preserved ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 10: VENDORING-MANIFEST.md R91 + R90 headers ──"
VM="coordination/VENDORING-MANIFEST.md"
if grep -qE '^## R91 consumption-migration note \(2026-05-21\)' "$VM" \
   && grep -qE '^## R90 extraction note \(2026-05-21\)' "$VM" \
   && grep -q '@johnpatrickwarren-oss/deploysignal-engine' "$VM" ; then
  block_ok "VENDORING-MANIFEST.md has R91 + R90 headers + package reference"
else
  block_fail "VENDORING-MANIFEST.md missing R91 header or R90 header or package reference"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Aggregate ──
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "─── Q-R91-EMPIRICAL.sh summary ───"
echo "  PASS: $PASS_COUNT / $((PASS_COUNT + FAIL_COUNT)) blocks"
echo "  FAIL: $FAIL_COUNT / $((PASS_COUNT + FAIL_COUNT)) blocks"

if [ "$FAIL_COUNT" -eq 0 ]; then
  exit 0
else
  exit 1
fi
