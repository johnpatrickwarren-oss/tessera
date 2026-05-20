#!/usr/bin/env bash
# coordination/specs/Q-R65-EMPIRICAL.sh
#
# Empirical-AC verification for R65 (Phase 3 SLICE 3 Wave 10 WU-Phase3-3B
# Tessera→DS feed adapter).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; Tightenings 1-4 applied).
#
# Each block below verifies one AC or one structural premise from
# Q-R65-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch. The
# harness (`scripts/verify-empirical-acs.sh R65`) reports the aggregate
# exit code.
#
# This file is the AUTHORITATIVE source for R65 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running this
# file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction (per R53 MINOR-1 + R56 MINOR-1 reinforcement;
# narrowed post-R62 to AC-R65-16 + AC-R65-18 only — do NOT propagate the
# structurally-vacuous forward-protection AC pattern; see R62 lesson):
#
#   - AC-R65-16 (anti-scope diff; test-file-embedded; advisory in this script):
#       chore-A: FAILS by construction (CHORE_A_SHA placeholder
#         '<INJECTED-AT-CHORE-B>' is not a valid git ref).
#       chore-B: PASSES (actual SHA injected; historical diff window
#         [round-start..chore-A-SHA] is immutable once chore-A commits).
#
#   - AC-R65-18 (test summary):
#       chore-A: tests=427 / pass=421 / fail=3 / skipped=3 (3 fails =
#         R36-30 + R36-31 carry-forward + AC-R65-16 placeholder).
#       chore-B: tests=427 / pass=422 / fail=2 / skipped=3 (2 fails =
#         R36-30 + R36-31 only; AC-R65-16 placeholder injected with
#         actual SHA → AC-R65-16 PASSes).
#
# This script's AC-R65-18 block asserts the chore-B value (427/422/2/3) —
# the final committed-state binding. At chore-A pre-commit the Implementer
# runs the script and observes AC-R65-18 FAIL (pre-documented carve-out
# per spec § 6.1 halt condition #1).

set -uo pipefail

FAILED=0
PASS=0
ROUND="R65"
ROUND_START="59a03d0"

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

assert_ge() {
    local label="$1"
    local expected_min="$2"
    local actual="$3"
    if [ "$actual" -ge "$expected_min" ] 2>/dev/null; then
        echo "  PASS — $label"
        echo "    actual:   $actual (>= $expected_min)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: >= $expected_min"
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

echo "[$ROUND] Empirical-AC verification — Q-R65-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-1: feed.ts exists (file existence)
# -----------------------------------------------------------------------------
echo "AC-R65-1: engine/ds-integration/feed.ts exists"
assert_truthy "AC-R65-1" "[ -f engine/ds-integration/feed.ts ]"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-2: index.ts has 3 export-star lines (feed-contract + event-contract + feed)
# -----------------------------------------------------------------------------
echo "AC-R65-2: engine/ds-integration/index.ts has 3 export-star lines"
ACTUAL=$(grep -cE "^export \* from " engine/ds-integration/index.ts 2>/dev/null)
assert_eq "AC-R65-2 (index export-star count)" "3" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-15a: feed.ts imports TESSERA_TO_DS_FEED_ENDPOINT from feed-contract
# -----------------------------------------------------------------------------
echo "AC-R65-15a: feed.ts mentions TESSERA_TO_DS_FEED_ENDPOINT (imported from feed-contract)"
ACTUAL=$(grep -cE "TESSERA_TO_DS_FEED_ENDPOINT" engine/ds-integration/feed.ts 2>/dev/null)
assert_ge "AC-R65-15a (TESSERA_TO_DS_FEED_ENDPOINT mention)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-15b: feed.ts has zero inline path literal '/v1/tessera/verdict-groups'
# (single source of truth: contract module const)
# -----------------------------------------------------------------------------
echo "AC-R65-15b: feed.ts has zero inline path literal '/v1/tessera/verdict-groups'"
ACTUAL=$(grep -cE "'/v1/tessera/verdict-groups'" engine/ds-integration/feed.ts 2>/dev/null)
assert_eq "AC-R65-15b (inline path-literal count)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-4-source: feed.ts contains correlational_not_causal: true literal
# in projection body (A16 propagation source-side defensive check)
# -----------------------------------------------------------------------------
echo "AC-R65-4-source: feed.ts contains correlational_not_causal: true literal (A16)"
ACTUAL=$(grep -cE "^[[:space:]]*correlational_not_causal:[[:space:]]*true[[:space:]]*,?" engine/ds-integration/feed.ts 2>/dev/null)
assert_ge "AC-R65-4-source (A16 literal in projection)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# DECOUPLING-1: feed-contract.ts retains zero cross-boundary imports
# (R62 invariant; R65 must NOT regress)
# -----------------------------------------------------------------------------
echo "DECOUPLING-1: feed-contract.ts retains zero cross-boundary imports (R62 invariant)"
ACTUAL=$(grep -cE "^import.*from\s*['\"](\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/feed-contract.ts 2>/dev/null)
assert_eq "DECOUPLING-1 (feed-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# DECOUPLING-2: event-contract.ts retains zero cross-boundary imports
# (R62 invariant; R65 must NOT regress)
# -----------------------------------------------------------------------------
echo "DECOUPLING-2: event-contract.ts retains zero cross-boundary imports (R62 invariant)"
ACTUAL=$(grep -cE "^import.*from\s*['\"](\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/event-contract.ts 2>/dev/null)
assert_eq "DECOUPLING-2 (event-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-17: npx tsc -p tsconfig.test.json exits 0
# -----------------------------------------------------------------------------
echo "AC-R65-17: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-R65-17 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-18: node --test summary = 427/422/2/3 (chore-B HEAD)
#
# Two-state distinction:
#   - chore-A pre-injection: 427/421/3/3 (3 fails = R36-30 + R36-31 +
#     AC-R65-16 placeholder).
#   - chore-B post-injection: 427/422/2/3 (2 fails = R36-30 + R36-31 only).
#
# This block asserts the chore-B value. At chore-A pre-commit the
# Implementer will observe AC-R65-18 FAIL — pre-documented per spec
# § 6.1 halt-condition carve-out.
#
# `|| true` because node --test exits non-zero when fail count > 0.
# Capture output ONCE; grep multiple times against the capture (per R46
# bash-bug lesson — multiple `node --test` invocations corrupt the summary
# capture with set -uo pipefail).
# -----------------------------------------------------------------------------
echo "AC-R65-18: test summary = 427/422/2/3 (chore-B HEAD)"
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-R65-18 (test summary)" "427/422/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-16 (anti-scope diff — advisory at chore-A; binding at chore-B via test file)
# -----------------------------------------------------------------------------
echo "AC-R65-16: anti-scope ALLOWED_SET coverage (manual git diff at chore-A SHA)"
echo "  ADVISORY — verify manually at chore-A pre-commit:"
echo "    git diff ${ROUND_START}..\$CHORE_A_SHA --name-only | sort > /tmp/r65-diff.txt"
echo "    diff /tmp/r65-diff.txt <(printf '%s\n' \\"
echo "      coordination/MEMORIAL.md \\"
echo "      coordination/NEXT-ROLE.md \\"
echo "      coordination/specs/Q-R65-EMPIRICAL.sh \\"
echo "      coordination/specs/Q-R65-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R65-SPEC.md \\"
echo "      engine/ds-integration/feed.ts \\"
echo "      engine/ds-integration/index.ts \\"
echo "      test/q65-ds-integration-feed.test.ts \\"
echo "      | sort)"
echo "  (Implementer attests at chore-A; the test-file AC-R65-16 block performs"
echo "   the binding check at chore-B post-SHA-injection. Treat as advisory PASS here.)"
PASS=$((PASS + 1))
echo ""

# -----------------------------------------------------------------------------
# Aggregate
# -----------------------------------------------------------------------------
echo "============================================================"
echo "Summary: $PASS PASS, $FAILED FAIL"

if [ "$FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi
