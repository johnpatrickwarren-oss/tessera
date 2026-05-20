#!/usr/bin/env bash
# coordination/specs/Q-R56-EMPIRICAL.sh
#
# Empirical-AC verification for round R56 (Phase 3 SLICE 2 WU-Phase3-2A
# Google TPU / ICI topology adapter).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; convention propagated through R47-R53).
#
# Each block below verifies one AC or one structural premise from
# Q-R56-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch.
# The harness (`scripts/verify-empirical-acs.sh R56`) reports the
# aggregate exit code.
#
# This file is the AUTHORITATIVE source for R56 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running
# this file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction (per R53 MINOR-1 reinforcement; added 2026-05-19):
#   - At chore-A: AC-R56-15 fails by construction (placeholder SHA literal
#     `<INJECTED-AT-CHORE-B>` is not a valid git ref). Predicted test summary:
#     tests=387 / pass=381 / fail=3 / skipped=3 (3 fails = R36-30 + R36-31 +
#     AC-R56-15 placeholder).
#   - At chore-B (after Implementer SHA injection): AC-R56-15 passes.
#     Predicted summary: tests=387 / pass=382 / fail=2 / skipped=3.
# This script's AC-R56-14 block asserts the POST-CHORE-B predicted value
# (387/382/2/3). At chore-A pre-injection, the AC-R56-14 block FAIL is
# expected and load-bearing for the Implementer to attest the actual
# value verbatim per Rule 1 sub-class `empirical-command-attestation`.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R56"

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

echo "[$ROUND] Empirical-AC verification — Q-R56-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# File existence (NEW R56 deliverables)
# -----------------------------------------------------------------------------
echo "FILE-1: engine/topology/tpu-source.ts exists"
assert_truthy "FILE-1" "[ -f engine/topology/tpu-source.ts ]"
echo ""

echo "FILE-2: test/q56-tpu-adapter.test.ts exists"
assert_truthy "FILE-2" "[ -f test/q56-tpu-adapter.test.ts ]"
echo ""

echo "FILE-3: test/_substrate/tpu-fixture-v4-cube.json exists"
assert_truthy "FILE-3" "[ -f test/_substrate/tpu-fixture-v4-cube.json ]"
echo ""

echo "FILE-4: test/_substrate/tpu-fixture-v5p-cube.json exists"
assert_truthy "FILE-4" "[ -f test/_substrate/tpu-fixture-v5p-cube.json ]"
echo ""

echo "FILE-5: test/_substrate/tpu-fixture-sparse-subcube.json exists"
assert_truthy "FILE-5" "[ -f test/_substrate/tpu-fixture-sparse-subcube.json ]"
echo ""

# -----------------------------------------------------------------------------
# Schema-extension verification (verdict.ts R56 deltas)
# -----------------------------------------------------------------------------
echo "SCHEMA-1: engine/types/verdict.ts contains 'tpu_shard' literal"
ACTUAL=$(grep -c "'tpu_shard'" engine/types/verdict.ts || echo 0)
assert_ge "SCHEMA-1" "1" "$ACTUAL"
echo ""

echo "SCHEMA-2: engine/types/verdict.ts contains 'tpu_ici_peer' literal"
ACTUAL=$(grep -c "'tpu_ici_peer'" engine/types/verdict.ts || echo 0)
assert_ge "SCHEMA-2" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R56-12 (A16 — verdict.ts retains 'correlational_not_causal: true')
# -----------------------------------------------------------------------------
echo "AC-$ROUND-12: verdict.ts retains 'correlational_not_causal: true' literal (A16)"
ACTUAL=$(grep -c 'correlational_not_causal: true' engine/types/verdict.ts || echo 0)
assert_ge "AC-$ROUND-12" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R56-13 (typecheck attestation — npx tsc exit code)
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
# AC-R56-14 (test count attestation — node --test summary)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-14: test summary = 387/382/2/3 (post-chore-B; AC-R56-15 SHA injected)"
# Two-state distinction per R53 MINOR-1:
#   - At chore-A (pre-SHA-injection): actual will be 387/381/3/3 (3 fails =
#     R36-30 + R36-31 pre-existing + AC-R56-15 placeholder). The block FAILs.
#     The Implementer MUST encode the ACTUAL observed value verbatim in
#     NEXT-ROLE.md attestation — do NOT reframe as compliance.
#   - At chore-B (post-SHA-injection): AC-R56-15 passes → summary returns to
#     spec-predicted 387/382/2/3. The block PASSes.
# `|| true` because node --test exits non-zero when fail count > 0.
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-14 (test summary)" "387/382/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R56-15 (anti-scope diff — advisory; manual at chore-A)
# -----------------------------------------------------------------------------
# Verified at chore-A time via `git diff --name-only` against ALLOWED_SET
# enumerated in Q-R56-SPEC.md § 3 + § 4.5. Not mechanizable from inside this
# script without round-start SHA (4447586) and chore-A SHA (not yet known
# when this script runs as part of pre-commit chore-A sweep).
echo "AC-$ROUND-15: anti-scope ALLOWED_SET coverage (manual git diff at chore-A)"
echo "  ADVISORY — verify manually:"
echo "    git diff 4447586..\$CHORE_A_SHA --name-only | sort > /tmp/r56-diff.txt"
echo "    diff /tmp/r56-diff.txt <(printf '%s\n' \\"
echo "      engine/topology/tpu-source.ts \\"
echo "      engine/types/verdict.ts \\"
echo "      test/q56-tpu-adapter.test.ts \\"
echo "      test/_substrate/tpu-fixture-v4-cube.json \\"
echo "      test/_substrate/tpu-fixture-v5p-cube.json \\"
echo "      test/_substrate/tpu-fixture-sparse-subcube.json \\"
echo "      coordination/VENDORING-MANIFEST.md \\"
echo "      coordination/specs/Q-R56-SPEC.md \\"
echo "      coordination/specs/Q-R56-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R56-EMPIRICAL.sh \\"
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
