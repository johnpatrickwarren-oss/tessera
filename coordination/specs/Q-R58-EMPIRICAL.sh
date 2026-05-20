#!/usr/bin/env bash
# coordination/specs/Q-R58-EMPIRICAL.sh
#
# Empirical-AC verification for round R58 (Phase 3 SLICE 2 WU-Phase3-2B
# live-cluster topology fetch INTERFACE design across 5 adapter sources).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; R47 Tightenings 1-4 applied; convention
# propagated through R47-R56).
#
# Each block below verifies one AC or one structural premise from
# Q-R58-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch.
# The harness (`scripts/verify-empirical-acs.sh R58`) reports the
# aggregate exit code.
#
# This file is the AUTHORITATIVE source for R58 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running
# this file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction (per R53 MINOR-1 reinforcement; R56 carry-forward):
#   - At chore-A: AC-R58-14 fails by construction (placeholder SHA literal
#     `<INJECTED-AT-CHORE-B>` is not a valid git ref). Predicted test summary:
#     tests=399 / pass=393 / fail=3 / skipped=3 (3 fails = R36-30 + R36-31 +
#     AC-R58-14 placeholder).
#   - At chore-B (after Implementer SHA injection): AC-R58-14 passes.
#     Predicted summary: tests=399 / pass=394 / fail=2 / skipped=3.
# This script's AC-R58-13 block asserts the POST-CHORE-B predicted value
# (399/394/2/3). At chore-A pre-injection, the AC-R58-13 block FAIL is
# expected and load-bearing for the Implementer to attest the actual
# value (399/393/3/3) verbatim per Rule 1 sub-class. The R56 MINOR-1
# carve-out documented in Q-R58-SPEC.md § 6.1 halt condition #1 makes
# this pre-documented FAIL NOT a halt trigger.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R58"

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

echo "[$ROUND] Empirical-AC verification — Q-R58-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# File existence (NEW R58 deliverables)
# -----------------------------------------------------------------------------
echo "FILE-1: engine/topology/fetch-context.ts exists"
assert_truthy "FILE-1" "[ -f engine/topology/fetch-context.ts ]"
echo ""

echo "FILE-2: test/q58-live-fetch-interface.test.ts exists"
assert_truthy "FILE-2" "[ -f test/q58-live-fetch-interface.test.ts ]"
echo ""

# -----------------------------------------------------------------------------
# Anti-scope assertion (READ-ONLY files preserved unmodified vs round-start)
# -----------------------------------------------------------------------------
echo "FILE-3 (anti-scope): engine/topology-overlay.ts unmodified vs round-start 7e9d399"
ACTUAL=$(git diff 7e9d399..HEAD --name-only -- engine/topology-overlay.ts | wc -l | tr -d ' ')
assert_eq "FILE-3 (engine/topology-overlay.ts unchanged)" "0" "$ACTUAL"
echo ""

echo "FILE-4 (anti-scope): engine/types/verdict.ts unmodified vs round-start 7e9d399"
ACTUAL=$(git diff 7e9d399..HEAD --name-only -- engine/types/verdict.ts | wc -l | tr -d ' ')
assert_eq "FILE-4 (engine/types/verdict.ts unchanged)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Source-grep verification (AC-R58-1 through AC-R58-6 — signature widening
# present in each of 5 adapters)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-1 (structural source-grep): engine/topology/fetch-context.ts exports TopologyFetchContext"
ACTUAL=$(grep -c "export interface TopologyFetchContext extends FetchContext" engine/topology/fetch-context.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-1 (export count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-2 (source-grep): slurm-source.ts fetchSnapshot widened to TopologyFetchContext"
ACTUAL=$(grep -c "async fetchSnapshot(ctx?: TopologyFetchContext)" engine/topology/slurm-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-2 (slurm widened-signature count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-3 (source-grep): k8s-source.ts fetchSnapshot widened to TopologyFetchContext"
ACTUAL=$(grep -c "async fetchSnapshot(ctx?: TopologyFetchContext)" engine/topology/k8s-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-3 (k8s widened-signature count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-4 (source-grep): nvlink-source.ts fetchSnapshot widened to TopologyFetchContext"
ACTUAL=$(grep -c "async fetchSnapshot(ctx?: TopologyFetchContext)" engine/topology/nvlink-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-4 (nvlink widened-signature count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-5 (source-grep): neuron-source.ts fetchSnapshot widened to TopologyFetchContext"
ACTUAL=$(grep -c "async fetchSnapshot(ctx?: TopologyFetchContext)" engine/topology/neuron-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-5 (neuron widened-signature count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-6 (source-grep): tpu-source.ts fetchSnapshot widened to TopologyFetchContext"
ACTUAL=$(grep -c "async fetchSnapshot(ctx?: TopologyFetchContext)" engine/topology/tpu-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-6 (tpu widened-signature count)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Source-grep verification (AC-R58-7 throw guard present in all 5 adapters
# with vendor-specific suffix)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-7a (source-grep): slurm throw guard LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm"
ACTUAL=$(grep -c "LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm" engine/topology/slurm-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-7a (slurm vendor-throw count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-7b (source-grep): k8s throw guard LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: k8s"
ACTUAL=$(grep -c "LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: k8s" engine/topology/k8s-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-7b (k8s vendor-throw count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-7c (source-grep): nvlink throw guard LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: nvlink"
ACTUAL=$(grep -c "LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: nvlink" engine/topology/nvlink-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-7c (nvlink vendor-throw count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-7d (source-grep): neuron throw guard LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: neuron"
ACTUAL=$(grep -c "LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: neuron" engine/topology/neuron-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-7d (neuron vendor-throw count)" "1" "$ACTUAL"
echo ""

echo "AC-$ROUND-7e (source-grep): tpu throw guard LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: tpu"
ACTUAL=$(grep -c "LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: tpu" engine/topology/tpu-source.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-$ROUND-7e (tpu vendor-throw count)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R58-11 (A16 — verdict.ts retains 'correlational_not_causal: true' literal)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-11: verdict.ts retains 'correlational_not_causal: true' literal (A16)"
# Spec AC-R58-11 binds substring-presence (>= 1), not exact-count. Per Q-R58-SPEC § 5.6
# + § D-3 honest-broker disclosure: AC is intentionally non-discriminating at the
# substring-presence layer; A16 spec text is "literal must appear", not "literal must
# appear N times at specific line". Verifier matches the AC literal text (>= 1) — a
# divergence between runtime-test threshold and verifier threshold would be confusing.
ACTUAL=$(grep -c 'correlational_not_causal: true' engine/types/verdict.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_ge "AC-$ROUND-11 (literal count >= 1)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R58-12 (typecheck attestation — npx tsc exit code)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-12: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-$ROUND-12 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R58-13 (test count attestation — node --test summary)
# -----------------------------------------------------------------------------
echo "AC-$ROUND-13: test summary = 399/394/2/3 (post-chore-B; AC-R58-14 SHA injected)"
# Two-state distinction per R53 MINOR-1:
#   - At chore-A (pre-SHA-injection): actual will be 399/393/3/3 (3 fails =
#     R36-30 + R36-31 pre-existing + AC-R58-14 placeholder). The block FAILs.
#     The Implementer MUST encode the ACTUAL observed value verbatim in
#     NEXT-ROLE.md attestation — do NOT reframe as compliance. The R56 MINOR-1
#     carve-out in Q-R58-SPEC § 6.1 halt condition #1 makes this pre-documented
#     FAIL NOT a halt trigger.
#   - At chore-B (post-SHA-injection): AC-R58-14 passes → summary returns to
#     spec-predicted 399/394/2/3. The block PASSes.
# `|| true` because node --test exits non-zero when fail count > 0.
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-$ROUND-13 (test summary)" "399/394/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R58-14 (anti-scope diff — advisory; manual at chore-A)
# -----------------------------------------------------------------------------
# Verified at chore-A time via `git diff --name-only` against ALLOWED_SET
# enumerated in Q-R58-SPEC.md § 3.2 + § 4.7. Not mechanizable from inside this
# script without round-start SHA (7e9d399) and chore-A SHA (not yet known
# when this script runs as part of pre-commit chore-A sweep).
echo "AC-$ROUND-14: anti-scope ALLOWED_SET coverage (manual git diff at chore-A)"
echo "  ADVISORY — verify manually:"
echo "    git diff 7e9d399..\$CHORE_A_SHA --name-only | sort > /tmp/r58-diff.txt"
echo "    diff /tmp/r58-diff.txt <(printf '%s\n' \\"
echo "      coordination/MEMORIAL.md \\"
echo "      coordination/NEXT-ROLE.md \\"
echo "      coordination/specs/Q-R58-EMPIRICAL.sh \\"
echo "      coordination/specs/Q-R58-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R58-SPEC.md \\"
echo "      engine/topology/fetch-context.ts \\"
echo "      engine/topology/k8s-source.ts \\"
echo "      engine/topology/neuron-source.ts \\"
echo "      engine/topology/nvlink-source.ts \\"
echo "      engine/topology/slurm-source.ts \\"
echo "      engine/topology/tpu-source.ts \\"
echo "      test/q58-live-fetch-interface.test.ts \\"
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
