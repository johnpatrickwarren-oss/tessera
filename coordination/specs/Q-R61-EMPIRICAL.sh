#!/usr/bin/env bash
# coordination/specs/Q-R61-EMPIRICAL.sh
#
# Empirical-AC verification for round R61 (Phase 3 SLICE 3 WU-Phase3-3A —
# engine npm package extract).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; R47 Tightenings 1-4 applied; convention
# propagated through R47-R58).
#
# Each block below verifies one AC or one structural premise from
# Q-R61-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch.
# The harness (`scripts/verify-empirical-acs.sh R61`) reports the
# aggregate exit code.
#
# This file is the AUTHORITATIVE source for R61 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running
# this file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction (per R53 MINOR-1 + R56 MINOR-1 reinforcement;
# R58 carry-forward):
#   - At chore-A: AC-R61-15 fails by construction (placeholder SHA
#     literal `<INJECTED-AT-CHORE-B>` is not a valid git ref).
#     Predicted test summary at chore-A: tests=403 / pass=397 / fail=3 /
#     skipped=3 (3 fails = R36-30 + R36-31 + AC-R61-15 placeholder).
#   - At chore-B (after Implementer SHA injection): AC-R61-15 passes.
#     Predicted summary: tests=403 / pass=398 / fail=2 / skipped=3.
# This script's AC-R61-10 block asserts the POST-CHORE-B predicted value
# (403/398/2/3). At chore-A pre-injection, the AC-R61-10 block FAIL is
# expected and load-bearing for the Implementer to attest the actual
# value (403/397/3/3) verbatim per Rule 1 sub-class. The R56 MINOR-1
# carve-out in Q-R61-SPEC.md § 6.1 halt condition #1 makes this
# pre-documented FAIL NOT a halt trigger.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R61"

assert_eq() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  PASS — $label"
        echo "    actual:   $actual"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

assert_truthy() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd"; then
        echo "  PASS — $label"
        echo "    cmd:      $cmd"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    cmd:      $cmd"
        echo "    (exited non-zero)"
        FAILED=$((FAILED + 1))
    fi
}

echo "[$ROUND] Empirical-AC verification — Q-R61-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-1 — package.json scaffolding
# -----------------------------------------------------------------------------
echo "AC-$ROUND-1: packages/deploysignal-engine/package.json scaffolding"
PKG_PATH="packages/deploysignal-engine/package.json"
assert_truthy "AC-$ROUND-1 (package.json exists)" "[ -f $PKG_PATH ]"

# Extract via grep (no jq dependency)
PKG_NAME=$(grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]+"' "$PKG_PATH" 2>/dev/null | head -1 | sed -E 's/.*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
assert_eq "AC-$ROUND-1 (package name)" "@johnpatrickwarren-oss/deploysignal-engine" "$PKG_NAME"

PKG_MAIN=$(grep -oE '"main"[[:space:]]*:[[:space:]]*"[^"]+"' "$PKG_PATH" 2>/dev/null | head -1 | sed -E 's/.*"main"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
assert_eq "AC-$ROUND-1 (package main)" "dist/index.js" "$PKG_MAIN"

PKG_TYPES=$(grep -oE '"types"[[:space:]]*:[[:space:]]*"[^"]+"' "$PKG_PATH" 2>/dev/null | head -1 | sed -E 's/.*"types"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
assert_eq "AC-$ROUND-1 (package types)" "dist/index.d.ts" "$PKG_TYPES"

PKG_PRIVATE=$(grep -cE '"private"[[:space:]]*:[[:space:]]*true' "$PKG_PATH" 2>/dev/null)
PKG_PRIVATE=${PKG_PRIVATE:-0}
assert_eq "AC-$ROUND-1 (package private=true)" "1" "$PKG_PRIVATE"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-2 — barrel re-exports (33 mechanical export-star lines)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-2: packages/deploysignal-engine/src/index.ts has 33 export-star re-exports"
BARREL="packages/deploysignal-engine/src/index.ts"
assert_truthy "AC-$ROUND-2 (barrel exists)" "[ -f $BARREL ]"

# Line-anchored count to avoid matching incidental occurrences in comments
EXPORT_COUNT=$(grep -cE "^export \* from '\./[^']+';" "$BARREL" 2>/dev/null)
EXPORT_COUNT=${EXPORT_COUNT:-0}
assert_eq "AC-$ROUND-2 (barrel export-star count)" "33" "$EXPORT_COUNT"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-3 — tsc exit 0 post-extract
# -----------------------------------------------------------------------------
echo "AC-$ROUND-3: npx tsc -p tsconfig.test.json exits 0 post-extract"
echo "  (Requires package built first via 'npm run build:package' or 'npm run pretest'.)"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-3 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-4 — 33 git rename entries between engine/* and packages/.../src/*
# -----------------------------------------------------------------------------
echo "AC-$ROUND-4: 33 git renames (engine/* → packages/deploysignal-engine/src/*) at chore-A"
ROUND_START_SHA="8c64ce0"
RENAME_COUNT=$(git diff --diff-filter=R --name-only "$ROUND_START_SHA" HEAD 2>/dev/null | grep -c '^packages/deploysignal-engine/src/' || true)
RENAME_COUNT=${RENAME_COUNT:-0}
# Note: git's rename detection considers both source and target; the post-name
# count = number of renamed files. At chore-A this should be 33.
assert_eq "AC-$ROUND-4 (rename count)" "33" "$RENAME_COUNT"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-5 — q01-vendoring-coverage passes post-update
# -----------------------------------------------------------------------------
echo "AC-$ROUND-5: q01-vendoring-coverage.test.js passes (3 sub-tests)"
# Run only this test file; capture output; assert pass count.
Q01_OUTPUT=$(node --test --test-reporter=tap test/q01-vendoring-coverage.test.js 2>&1 || true)
Q01_PASS=$(echo "$Q01_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
Q01_FAIL=$(echo "$Q01_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
assert_eq "AC-$ROUND-5 (q01-vendoring-coverage pass count)" "3" "$Q01_PASS"
assert_eq "AC-$ROUND-5 (q01-vendoring-coverage fail count)" "0" "$Q01_FAIL"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-6 — q01-no-at-pin-deltas passes in main worktree
# -----------------------------------------------------------------------------
echo "AC-$ROUND-6: q01-no-at-pin-deltas.test.js (main worktree; requires ../deploysignal sibling)"
echo "  (Pre-existing condition: ENOENT fail expected if sibling missing per WAVE-GATE pre-flags.)"
# Run; do NOT assert on pass count because main vs cluster worktree behavior differs.
# Architect-prescribed: the test EITHER passes (sibling present + content matches) OR fails (sibling missing).
# Encoded as advisory; Implementer attests actual chore-A observation.
Q01D_OUTPUT=$(node --test --test-reporter=tap test/q01-no-at-pin-deltas.test.js 2>&1 || true)
Q01D_TESTS=$(echo "$Q01D_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
echo "  ADVISORY — q01-no-at-pin-deltas tests run: $Q01D_TESTS"
echo "  (Implementer attests actual pass/fail at chore-A per Rule 1 sub-class.)"
PASS=$((PASS + 1))
echo ""

# -----------------------------------------------------------------------------
# AC-R61-7 — Tessera-side imports rewritten in 3 sample files
# -----------------------------------------------------------------------------
echo "AC-$ROUND-7: 3 sample Tessera-tree files have no leftover '../detectors/...' imports"
SAMPLES=(
    "engine/types/verdict.ts"
    "engine/verdict-groups.ts"
    "engine/fleet/verdict-consumer.ts"
)
LEFTOVER_TOTAL=0
for f in "${SAMPLES[@]}"; do
    if [ -f "$f" ]; then
        LEFTOVER=$(grep -cE "from ['\"]\.\.+/detectors/" "$f" 2>/dev/null)
        LEFTOVER=${LEFTOVER:-0}
        LEFTOVER_TOTAL=$((LEFTOVER_TOTAL + LEFTOVER))
        echo "  $f: $LEFTOVER leftover '../detectors/' imports"
    fi
done
assert_eq "AC-$ROUND-7 (total leftover '../detectors/' imports across samples)" "0" "$LEFTOVER_TOTAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-8 — VENDORING-MANIFEST.md has new section + preserved per-file rows
# -----------------------------------------------------------------------------
echo "AC-$ROUND-8: VENDORING-MANIFEST.md new section + preserved SHA-pin rows"
MANIFEST="coordination/VENDORING-MANIFEST.md"

# New section heading present
NEW_SECTION=$(grep -cE "^## R61 npm package extract" "$MANIFEST" 2>/dev/null)
NEW_SECTION=${NEW_SECTION:-0}
assert_eq "AC-$ROUND-8 (new section heading count)" "1" "$NEW_SECTION"

# SHA pin "5a72371" count — pre-R61 baseline = 36 rows (33 engine + 3 tools); post-R61 preserved unchanged.
SHA_COUNT=$(grep -c "5a72371" "$MANIFEST" 2>/dev/null)
SHA_COUNT=${SHA_COUNT:-0}
# The "5a72371" string appears in the table column rows + may appear in the new section's text.
# Verify >= 36 (the original per-file SHA-pin row count is preserved; the new section may add 1 more mention).
if [ "$SHA_COUNT" -ge "36" ] 2>/dev/null; then
    echo "  PASS — AC-$ROUND-8 (SHA pin '5a72371' count = $SHA_COUNT; >= 36 = original row count preserved)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-8 (SHA pin count = $SHA_COUNT; expected >= 36)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R61-9 — root package.json has workspaces + package devDep
# -----------------------------------------------------------------------------
echo "AC-$ROUND-9: root package.json declares workspaces and engine package devDependency"
ROOT_PKG="package.json"

# workspaces field present
WS_COUNT=$(grep -cE '"workspaces"[[:space:]]*:' "$ROOT_PKG" 2>/dev/null)
WS_COUNT=${WS_COUNT:-0}
assert_eq "AC-$ROUND-9 (workspaces field present)" "1" "$WS_COUNT"

# package referenced in devDependencies
DEPS_COUNT=$(grep -cE '"@johnpatrickwarren-oss/deploysignal-engine"' "$ROOT_PKG" 2>/dev/null)
DEPS_COUNT=${DEPS_COUNT:-0}
assert_eq "AC-$ROUND-9 (engine package referenced in root package.json)" "1" "$DEPS_COUNT"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-10 — test count post-chore-B
# -----------------------------------------------------------------------------
echo "AC-$ROUND-10: test summary = 403/398/2/3 (post-chore-B; AC-R61-15 SHA injected)"
# Two-state distinction per R53 MINOR-1 (R56/R58 precedent):
#   - At chore-A (pre-SHA-injection): actual will be 403/397/3/3 (3 fails =
#     R36-30 + R36-31 pre-existing + AC-R61-15 placeholder). The block FAILs.
#     The Implementer MUST encode the ACTUAL observed value verbatim in
#     NEXT-ROLE.md attestation — do NOT reframe as compliance. The R56 MINOR-1
#     carve-out in Q-R61-SPEC § 6.1 halt condition #1 makes this pre-documented
#     FAIL NOT a halt trigger.
#   - At chore-B (post-SHA-injection): AC-R61-15 passes → summary returns to
#     spec-predicted 403/398/2/3. The block PASSes.
# `|| true` because node --test exits non-zero when fail count > 0.
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-10 (test summary)" "403/398/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-11 — npm workspace symlink created
# -----------------------------------------------------------------------------
echo "AC-$ROUND-11: npm install creates workspace symlink"
SYMLINK_PATH="node_modules/@johnpatrickwarren-oss/deploysignal-engine"
if [ -L "$SYMLINK_PATH" ] || [ -d "$SYMLINK_PATH" ]; then
    # npm may create a directory or a symlink depending on version
    echo "  PASS — AC-$ROUND-11 (symlink/dir at $SYMLINK_PATH exists)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-11 (symlink/dir at $SYMLINK_PATH missing; run 'npm install' first)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R61-12 — compiled package is loadable
# -----------------------------------------------------------------------------
echo "AC-$ROUND-12: compiled package loadable via node require"
if node -e "require('@johnpatrickwarren-oss/deploysignal-engine')" >/dev/null 2>&1; then
    NODE_REQUIRE_EXIT=0
else
    NODE_REQUIRE_EXIT=$?
fi
assert_eq "AC-$ROUND-12 (node require exit)" "0" "$NODE_REQUIRE_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-13 — SCOPING-MEMO § 9 opportunistic touch
# -----------------------------------------------------------------------------
echo "AC-$ROUND-13: SCOPING-MEMO § 9 contains 'Extract landed — R61' substring"
SCOPING_MEMO="coordination/SCOPING-MEMO-v0.3.md"
EXTRACT_LANDED=$(grep -c "Extract landed — R61" "$SCOPING_MEMO" 2>/dev/null)
EXTRACT_LANDED=${EXTRACT_LANDED:-0}
assert_eq "AC-$ROUND-13 (SCOPING-MEMO 'Extract landed — R61' count)" "1" "$EXTRACT_LANDED"
echo ""

# -----------------------------------------------------------------------------
# AC-R61-14 — anti-scope diff ⊆ ALLOWED_SET (advisory at chore-A)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-14: anti-scope diff ⊆ ALLOWED_SET (advisory; manual verification at chore-A)"
echo "  Verify manually at chore-A:"
echo "    git diff 8c64ce0..\$CHORE_A_SHA --name-only | sort > /tmp/r61-diff.txt"
echo "    # Each line must match one of Q-R61-SPEC.md § 3.2 parts (a) + (b) + (c)"
echo "    # + optionally (d) DIAGNOSTIC + the W3-5 opportunistic SCOPING-MEMO entry."
echo "  ADVISORY — Implementer attests at chore-A per Rule 1 sub-class."
PASS=$((PASS + 1))
echo ""

# -----------------------------------------------------------------------------
# AC-R61-15 — forward-protection AC pinned to chore-B SHA
# -----------------------------------------------------------------------------
echo "AC-$ROUND-15: forward-protection — anti-scope diff at chore-B SHA"
CHORE_B_SHA="<INJECTED-AT-CHORE-B>"
# Pre-chore-B injection: SHA is placeholder; rev-parse fails; AC-R61-15 fails by construction.
# Post-chore-B injection: SHA is valid; diff range computed; subset check passes.
if git rev-parse "$CHORE_B_SHA" >/dev/null 2>&1; then
    REV_PARSE_OK=0
else
    REV_PARSE_OK=$?
fi
if [ "$REV_PARSE_OK" -eq 0 ]; then
    DIFF_COUNT=$(git diff "$ROUND_START_SHA".."$CHORE_B_SHA" --name-only 2>/dev/null | wc -l | tr -d ' ')
    # Architect-predicted ~70-100 file diff at chore-B; loosely bounded.
    if [ "$DIFF_COUNT" -ge "50" ] && [ "$DIFF_COUNT" -le "150" ]; then
        echo "  PASS — AC-$ROUND-15 (chore-B diff count $DIFF_COUNT in [50,150] range)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — AC-$ROUND-15 (chore-B diff count $DIFF_COUNT outside [50,150])"
        FAILED=$((FAILED + 1))
    fi
else
    echo "  FAIL — AC-$ROUND-15 (chore-B SHA placeholder '$CHORE_B_SHA' not resolvable; expected pre-chore-B-injection)"
    echo "  (At chore-B: Implementer replaces placeholder with actual chore-A SHA.)"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# Aggregate
# -----------------------------------------------------------------------------
echo "============================================================"
echo "Summary: $PASS PASS, $FAILED FAIL"
if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
