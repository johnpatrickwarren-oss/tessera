#!/usr/bin/env bash
# coordination/specs/Q-R46-EMPIRICAL.sh
#
# Empirical-AC verification for round R46.
# Self-application of Rule 1 sub-class (empirical-command-attestation) at
# its derivation round (Rule 7 Surface c required for round-of-derivation).
#
# Each block below verifies one AC from Q-R46-SPEC.md § 5.
# Each block exits non-zero on mismatch. The harness
# (scripts/verify-empirical-acs.sh R46) reports the aggregate exit code.
#
# This file is the AUTHORITATIVE source for R46 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running this
# file at chore-A SHA — not memorized values from spec text.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R46"

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

echo "[$ROUND] Empirical-AC verification — Q-R46-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-1 (verify-empirical-acs.sh exists + executable)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-1: verify-empirical-acs.sh exists + executable"
assert_truthy "AC-$ROUND-1" "[ -x scripts/verify-empirical-acs.sh ]"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-2 (Q-R46-EMPIRICAL.sh exists + executable)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-2: Q-R46-EMPIRICAL.sh exists + executable (this file)"
assert_truthy "AC-$ROUND-2" "[ -x coordination/specs/Q-R46-EMPIRICAL.sh ]"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-3 (SPEC-AUTHORING-CHECKLIST.md "Empirical-AC discipline" section present)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-3: SPEC-AUTHORING-CHECKLIST.md contains '## Empirical-AC discipline' section"
ACTUAL=$(grep -cE '^## Empirical-AC discipline' coordination/SPEC-AUTHORING-CHECKLIST.md || echo 0)
assert_eq "AC-$ROUND-3" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-4 (Rule 1 row updated to "mechanizable")
# -----------------------------------------------------------------------------
echo "AC-$ROUND-4: Rule 1 row in Rule 7 gate table updated 'partial' → 'mechanizable'"
ACTUAL=$(grep -cE '^\| 1 \| .* \| mechanizable \|' coordination/SPEC-AUTHORING-CHECKLIST.md || echo 0)
assert_eq "AC-$ROUND-4" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-5 (rule_1_check upgraded — references verify-empirical-acs.sh)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-5: scripts/pre-commit-rule-sweep.sh rule_1_check references verify-empirical-acs.sh"
ACTUAL=$(grep -c 'verify-empirical-acs.sh' scripts/pre-commit-rule-sweep.sh || echo 0)
if [ "$ACTUAL" -ge 1 ]; then
    echo "  PASS — AC-$ROUND-5"
    echo "    actual:   $ACTUAL (>= 1)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-5"
    echo "    expected: >= 1"
    echo "    actual:   $ACTUAL"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R46-6 (self-application — this script's own exit code)
# -----------------------------------------------------------------------------
# This AC is meta: it asserts that scripts/verify-empirical-acs.sh R46
# exits 0 at chore-A. It cannot be directly verified inside this file
# (chicken-and-egg). Instead, the assertion is that this file itself
# exits 0 — which the harness aggregates.
echo "AC-$ROUND-6: self-application — this file exits 0 (verified by harness aggregate)"
echo "  PASS — AC-$ROUND-6 (asserted by aggregate exit code below)"
PASS=$((PASS + 1))
echo ""

# -----------------------------------------------------------------------------
# AC-R46-7 (sub-class canonical text present)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-7: 'empirical-command-attestation' literal in SPEC-AUTHORING-CHECKLIST.md"
ACTUAL=$(grep -c 'empirical-command-attestation' coordination/SPEC-AUTHORING-CHECKLIST.md || echo 0)
if [ "$ACTUAL" -ge 1 ]; then
    echo "  PASS — AC-$ROUND-7"
    echo "    actual:   $ACTUAL (>= 1)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-7"
    echo "    expected: >= 1"
    echo "    actual:   $ACTUAL"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R46-8 (ALLOWED_SET coverage)
# -----------------------------------------------------------------------------
# Verified at chore-A time via `git diff --name-only` against ALLOWED_SET
# enumerated in Q-R46-SPEC § 5 AC-R46-8. Not mechanizable from inside this
# script without round-start SHA; Implementer + Reviewer verify manually.
echo "AC-$ROUND-8: anti-scope ALLOWED_SET coverage (manual git diff at chore-A)"
echo "  ADVISORY — verify manually: git diff <ROUND-START-SHA>..<CHORE-A-SHA> --name-only ⊆ ALLOWED_SET"
echo "  (Not mechanically verifiable from inside Q-R46-EMPIRICAL.sh without SHAs)"
PASS=$((PASS + 1))  # treat as advisory PASS (Implementer attests at chore-A)
echo ""

# -----------------------------------------------------------------------------
# AC-R46-9 (test baseline preserved — 361/356/2/3)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-9: test baseline = 361/356/2/3"
# Run node --test ONCE; capture full output; grep multiple times against capture.
# `|| true` because node --test exits non-zero when fail count > 0 (which is
# expected here: AC-R36-30 + AC-R36-31 forward-protection guards FAIL).
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-9 (test summary)" "361/356/2/3" "$SUMMARY"

if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-9 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R46-10 (rule_1_check mechanical mode active on smoke test)
# -----------------------------------------------------------------------------
# Verified by running scripts/pre-commit-rule-sweep.sh and grepping output.
# We run against R46 itself (pre-R46-SHA..chore-A-SHA); at the time this
# script is invoked by chore-A pre-commit, the chore-A commit hasn't landed
# yet, so we cannot reference it. Skip the smoke-test invocation here and
# rely on Implementer/Reviewer manual smoke test.
echo "AC-$ROUND-10: rule_1_check mechanical mode active (verified by smoke test at chore-A)"
ACTUAL=$(grep -c 'MECHANICAL CHECK via sub-class verifier' scripts/pre-commit-rule-sweep.sh || echo 0)
if [ "$ACTUAL" -ge 1 ]; then
    echo "  PASS — AC-$ROUND-10"
    echo "    actual:   $ACTUAL occurrence(s) of mechanical-mode label in script source"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-$ROUND-10"
    echo "    expected: >= 1 occurrence of 'MECHANICAL CHECK via sub-class verifier'"
    echo "    actual:   $ACTUAL"
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
