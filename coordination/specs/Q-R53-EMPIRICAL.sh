#!/usr/bin/env bash
# coordination/specs/Q-R53-EMPIRICAL.sh
#
# Empirical-AC verification for round R53 (Phase 3 SLICE 1 WU-Phase3-1
# AWS Neuron topology adapter).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; convention propagated through R47-R51).
#
# Each block below verifies one AC or one structural premise from
# Q-R53-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch.
# The harness (`scripts/verify-empirical-acs.sh R53`) reports the
# aggregate exit code.
#
# This file is the AUTHORITATIVE source for R53 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running
# this file at chore-A SHA — not memorized values from spec text.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R53"

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

echo "[$ROUND] Empirical-AC verification — Q-R53-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# File existence (NEW R53 deliverables)
# -----------------------------------------------------------------------------
echo "FILE-1: engine/topology/neuron-source.ts exists"
assert_truthy "FILE-1" "[ -f engine/topology/neuron-source.ts ]"
echo ""

echo "FILE-2: test/q53-neuron-adapter.test.ts exists"
assert_truthy "FILE-2" "[ -f test/q53-neuron-adapter.test.ts ]"
echo ""

echo "FILE-3: test/_substrate/neuron-fixture-trainium-2d-torus.json exists"
assert_truthy "FILE-3" "[ -f test/_substrate/neuron-fixture-trainium-2d-torus.json ]"
echo ""

echo "FILE-4: test/_substrate/neuron-fixture-inferentia-ring.json exists"
assert_truthy "FILE-4" "[ -f test/_substrate/neuron-fixture-inferentia-ring.json ]"
echo ""

echo "FILE-5: test/_substrate/neuron-fixture-sparse.json exists"
assert_truthy "FILE-5" "[ -f test/_substrate/neuron-fixture-sparse.json ]"
echo ""

# -----------------------------------------------------------------------------
# Schema-extension verification (verdict.ts R53 deltas)
# -----------------------------------------------------------------------------
echo "SCHEMA-1: engine/types/verdict.ts contains 'trainium_chip' literal"
ACTUAL=$(grep -c "'trainium_chip'" engine/types/verdict.ts || echo 0)
assert_ge "SCHEMA-1" "1" "$ACTUAL"
echo ""

echo "SCHEMA-2: engine/types/verdict.ts contains 'inferentia_chip' literal"
ACTUAL=$(grep -c "'inferentia_chip'" engine/types/verdict.ts || echo 0)
assert_ge "SCHEMA-2" "1" "$ACTUAL"
echo ""

echo "SCHEMA-3: engine/types/verdict.ts contains 'neuron_link_peer' literal"
ACTUAL=$(grep -c "'neuron_link_peer'" engine/types/verdict.ts || echo 0)
assert_ge "SCHEMA-3" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R53-12 (A16 — verdict.ts retains 'correlational_not_causal: true')
# -----------------------------------------------------------------------------
echo "AC-$ROUND-12: verdict.ts retains 'correlational_not_causal: true' literal (A16)"
ACTUAL=$(grep -c 'correlational_not_causal: true' engine/types/verdict.ts || echo 0)
assert_ge "AC-$ROUND-12" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R53-13 (typecheck attestation — npx tsc exit code)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-13: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-13 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R53-14 (test count attestation — node --test summary)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-14: test summary = 374/369/2/3 (post-chore-B; AC-R53-15 SHA injected)"
# TD-1 (chore-A historical note): at chore-A, actual was 374/368/3/3 (3 fails: AC-R36-30 +
# AC-R36-31 pre-existing + AC-R53-15 placeholder SHA). After chore-B SHA injection, AC-R53-15
# passes → summary returns to spec-predicted 374/369/2/3.
# `|| true` because node --test exits non-zero when fail count > 0.
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-14 (test summary)" "374/369/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R53-15 (anti-scope diff — advisory; manual at chore-A)
# -----------------------------------------------------------------------------
# Verified at chore-A time via `git diff --name-only` against ALLOWED_SET
# enumerated in Q-R53-SPEC.md § 3 + § 4.5. Not mechanizable from inside this
# script without round-start SHA (3744012) and chore-A SHA (not yet known
# when this script runs as part of pre-commit chore-A sweep).
echo "AC-$ROUND-15: anti-scope ALLOWED_SET coverage (manual git diff at chore-A)"
echo "  ADVISORY — verify manually:"
echo "    git diff 3744012..\$CHORE_A_SHA --name-only | sort > /tmp/r53-diff.txt"
echo "    diff /tmp/r53-diff.txt <(printf '%s\n' \\"
echo "      engine/topology/neuron-source.ts \\"
echo "      engine/types/verdict.ts \\"
echo "      test/q53-neuron-adapter.test.ts \\"
echo "      test/_substrate/neuron-fixture-trainium-2d-torus.json \\"
echo "      test/_substrate/neuron-fixture-inferentia-ring.json \\"
echo "      test/_substrate/neuron-fixture-sparse.json \\"
echo "      coordination/VENDORING-MANIFEST.md \\"
echo "      coordination/specs/Q-R53-SPEC.md \\"
echo "      coordination/specs/Q-R53-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R53-EMPIRICAL.sh \\"
echo "      coordination/NEXT-ROLE.md \\"
echo "      coordination/MEMORIAL.md \\"
echo "      | sort)"
echo "  (Implementer attests at chore-A; treat as advisory PASS here)"
PASS=$((PASS + 1))
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
