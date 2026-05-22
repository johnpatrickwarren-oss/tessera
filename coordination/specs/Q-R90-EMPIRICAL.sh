#!/usr/bin/env bash
# Q-R90-EMPIRICAL.sh — binding-command harness for R90 (Phase 5 SLICE 3 round 1
# — engine npm extract: package boundary + types-barrel decoupling + build artifact).
#
# Runs 9 blocks; each emits PASS or FAIL. Final exit aggregates.
#
# Per CLAUDE-COMMON.md REINFORCED 2026-05-20 (R77 OBS-4): every TAP-format
# parse MUST be run against `--test-reporter=tap` output with the flag BEFORE
# test files (R89 MAJOR-1 sub-pattern).
# Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1): fail counts
# bind a band when active ACs are documented as structurally flaky.
#
# Round-start SHA = `65edb85` (chore(R90 directive): engine npm extract — Phase 5
# SLICE 3 round 1 of 4-round chain).

set -u  # treat unset as error; do NOT set -e (each block manages its own exit)

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || { echo "Q-R90-EMPIRICAL.sh: cannot cd to $REPO_ROOT"; exit 2; }

ROUND_START_SHA='65edb85'  # chore(R90 directive): engine npm extract — Phase 5 SLICE 3 round 1 of 4-round chain

PASS_COUNT=0
FAIL_COUNT=0

block_ok()   { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
block_fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 1: engine/package.json exists ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 1: engine/package.json exists ──"
if [ -f "engine/package.json" ]; then
  block_ok "engine/package.json present"
else
  block_fail "engine/package.json absent"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 2: tsconfig.json outDir is engine/dist ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 2: tsconfig.json outDir is engine/dist ──"
if node -e "process.exit(JSON.parse(require('fs').readFileSync('tsconfig.json','utf8')).compilerOptions.outDir === 'engine/dist' ? 0 : 1)" 2>/dev/null; then
  block_ok "tsconfig.json compilerOptions.outDir === 'engine/dist'"
else
  block_fail "tsconfig.json compilerOptions.outDir != 'engine/dist' (or file not parseable as JSON)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 3: engine/README.md exists with ## Install header ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 3: engine/README.md exists with required headers ──"
if [ -f "engine/README.md" ] \
   && grep -q '^## What this package is' engine/README.md \
   && grep -q '^## Install' engine/README.md \
   && grep -q '^## Build' engine/README.md \
   && grep -q '^# @johnpatrickwarren-oss/deploysignal-engine' engine/README.md; then
  block_ok "engine/README.md present with required headers"
else
  block_fail "engine/README.md missing or missing one of the required headers"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 4: VENDORING-MANIFEST.md head has R90 + 2026-05-21 + package name ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 4: VENDORING-MANIFEST.md head has R90 note ──"
HEAD_60=$(head -60 coordination/VENDORING-MANIFEST.md 2>/dev/null || echo "")
if echo "$HEAD_60" | grep -q 'R90' \
   && echo "$HEAD_60" | grep -q '2026-05-21' \
   && echo "$HEAD_60" | grep -q '@johnpatrickwarren-oss/deploysignal-engine' \
   && echo "$HEAD_60" | grep -q 'engine/package.json'; then
  block_ok "VENDORING-MANIFEST.md head contains all R90 markers"
else
  block_fail "VENDORING-MANIFEST.md head missing one or more R90 markers (R90, 2026-05-21, @johnpatrickwarren-oss/deploysignal-engine, engine/package.json)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 5: engine/dist/ build artifact sentinels exist ──
# (Sentinels chosen to span the 10 subdirectories + root-level files emitted by tsc.)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 5: engine/dist/ sentinels present ──"
SENTINELS=(
  "engine/dist/types/index.js"
  "engine/dist/types/index.d.ts"
  "engine/dist/topology-overlay.js"
  "engine/dist/topology-overlay.d.ts"
  "engine/dist/detectors/betting-e-process.js"
  "engine/dist/detectors/betting-e-process.d.ts"
  "engine/dist/ds-integration/index.js"
  "engine/dist/fleet/e-bh.js"
  "engine/dist/per-shard/runtime.js"
  "engine/dist/l0/counter-rate-transform.js"
)
SENTINELS_MISSING=0
for s in "${SENTINELS[@]}"; do
  if [ ! -f "$s" ]; then
    echo "    missing sentinel: $s"
    SENTINELS_MISSING=$((SENTINELS_MISSING + 1))
  fi
done
if [ "$SENTINELS_MISSING" -eq 0 ]; then
  block_ok "all 10 engine/dist/ sentinels present"
else
  block_fail "$SENTINELS_MISSING engine/dist/ sentinels missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 6: pnpm pack from engine/ produces expected tarball ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 6: pnpm pack produces expected tarball ──"
EXPECTED_TARBALL="johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz"
( cd engine && pnpm pack --pack-destination . >/dev/null 2>&1 )
PACK_EXIT=$?
if [ "$PACK_EXIT" -eq 0 ] && [ -f "engine/$EXPECTED_TARBALL" ]; then
  block_ok "pnpm pack exit 0; tarball engine/$EXPECTED_TARBALL exists"
else
  block_fail "pnpm pack exit=$PACK_EXIT OR tarball engine/$EXPECTED_TARBALL missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 7: tarball content has required entries + excludes anti-content ──
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 7: tarball content gate ──"
TARBALL_LISTING=$(tar -tzf "engine/$EXPECTED_TARBALL" 2>/dev/null || echo "")
TARBALL_OK=1
REQUIRED_ENTRIES=(
  "package/dist/types/index.js"
  "package/dist/types/index.d.ts"
  "package/dist/topology-overlay.js"
  "package/dist/detectors/betting-e-process.js"
  "package/package.json"
  "package/README.md"
)
for e in "${REQUIRED_ENTRIES[@]}"; do
  if ! echo "$TARBALL_LISTING" | grep -qF "$e"; then
    echo "    missing required tarball entry: $e"
    TARBALL_OK=0
  fi
done
ANTI_CONTENT=("package/test/" "package/coordination/" "package/tools/" "package/scripts/" "package/demos/")
for a in "${ANTI_CONTENT[@]}"; do
  if echo "$TARBALL_LISTING" | grep -qF "$a"; then
    echo "    tarball must not include path under: $a"
    TARBALL_OK=0
  fi
done
# Anti-content: no raw .ts sources (only .d.ts and .js variants allowed)
RAW_TS=$(echo "$TARBALL_LISTING" | grep -E '\.ts$' | grep -v '\.d\.ts$' || true)
if [ -n "$RAW_TS" ]; then
  echo "    tarball must not include raw .ts sources; found:"
  echo "$RAW_TS" | sed 's/^/      /'
  TARBALL_OK=0
fi
if [ "$TARBALL_OK" -eq 1 ]; then
  block_ok "tarball content gate passes (required entries present; anti-content absent; no raw .ts)"
else
  block_fail "tarball content gate violations (see lines above)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 8: typecheck + full test fail-count band ──
# Flag-ordering: --test-reporter=tap BEFORE test files per R77+R89 MAJOR-1
# Fail-count band per R85: [16, 17] (AC-R89-8 routing-flip + AC-R84-14 stochastic)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 8: typecheck + full test fail-count band [16,17] ──"
if ! pnpm exec tsc -p tsconfig.test.json >/dev/null 2>&1; then
  block_fail "pnpm exec tsc -p tsconfig.test.json exit non-zero"
else
  TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 | tail -10)
  FAIL_LINE=$(echo "$TEST_OUTPUT" | grep '^# fail ' || echo "# fail -1")
  PASS_LINE=$(echo "$TEST_OUTPUT" | grep '^# pass ' || echo "# pass -1")
  FAIL_N=$(echo "$FAIL_LINE" | awk '{print $3}')
  PASS_N=$(echo "$PASS_LINE" | awk '{print $3}')
  EXPECTED_FAIL_MIN=16
  EXPECTED_FAIL_MAX=17
  EXPECTED_PASS_MIN=702
  EXPECTED_PASS_MAX=707
  if [ -z "$FAIL_N" ] || [ "$FAIL_N" = "-1" ]; then
    block_fail "Block 8: could not parse # fail from test output (TAP format issue?)"
  elif [ "$FAIL_N" -ge "$EXPECTED_FAIL_MIN" ] && [ "$FAIL_N" -le "$EXPECTED_FAIL_MAX" ] \
       && [ "$PASS_N" -ge "$EXPECTED_PASS_MIN" ] && [ "$PASS_N" -le "$EXPECTED_PASS_MAX" ]; then
    block_ok "tsc -p tsconfig.test.json exit 0; # fail=$FAIL_N ∈ [$EXPECTED_FAIL_MIN,$EXPECTED_FAIL_MAX]; # pass=$PASS_N ∈ [$EXPECTED_PASS_MIN,$EXPECTED_PASS_MAX]"
  else
    block_fail "tsc exit 0 but # fail=$FAIL_N OR # pass=$PASS_N outside band (fail [$EXPECTED_FAIL_MIN,$EXPECTED_FAIL_MAX]; pass [$EXPECTED_PASS_MIN,$EXPECTED_PASS_MAX])"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Block 9: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET ──
# ALLOWED regex BYTE-MIRRORED to Q-R90-SPEC.md § 5.3 (R82 propagation discipline)
# ─────────────────────────────────────────────────────────────────────────────
echo "── Block 9: anti-scope diff ⊆ ALLOWED_SET ──"
ALLOWED='^(engine/package\.json|engine/README\.md|tsconfig\.json|package\.json|pnpm-workspace\.yaml|\.gitignore|coordination/VENDORING-MANIFEST\.md|test/q90-engine-package-extract\.test\.ts|coordination/specs/Q-R90-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R90\.md|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/logs/ROUND-R90-.*)$'
VIOLATORS=$(git diff "$ROUND_START_SHA" HEAD --name-only | grep -Ev "$ALLOWED" || true)
if [ -z "$VIOLATORS" ]; then
  block_ok "anti-scope diff round-start..HEAD ⊆ ALLOWED_SET"
else
  block_fail "anti-scope violators:"
  echo "$VIOLATORS" | sed 's/^/    /'
fi

# ─────────────────────────────────────────────────────────────────────────────
# ── Aggregate ──
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "─── Q-R90-EMPIRICAL.sh summary ───"
echo "  PASS: $PASS_COUNT / $((PASS_COUNT + FAIL_COUNT)) blocks"
echo "  FAIL: $FAIL_COUNT / $((PASS_COUNT + FAIL_COUNT)) blocks"

if [ "$FAIL_COUNT" -eq 0 ]; then
  exit 0
else
  exit 1
fi
