#!/usr/bin/env bash
# coordination/specs/Q-R66-EMPIRICAL.sh
#
# Empirical-AC verification for R66 (Phase 3 SLICE 3 Wave 10 WU-Phase3-3C
# DS→Tessera event consumer + freeze-hook factory).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; Tightenings 1-4 applied).
#
# Each block below verifies one AC or one structural premise from
# Q-R66-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch. The
# harness (`scripts/verify-empirical-acs.sh R66`) reports the aggregate
# exit code.
#
# This file is the AUTHORITATIVE source for R66 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running this
# file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction: NONE. R66 has no chore-B step. The "narrowed
# carve-out" pattern from R56-R65 is dropped per R66 directive halt #1
# ("do NOT propagate the structurally-vacuous forward-protection AC
# pattern"). All assertions in this file are single-state (chore-A == HEAD
# at routing).

set -uo pipefail

FAILED=0
PASS=0
ROUND="R66"
ROUND_START="8f3dd60"

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

echo "[$ROUND] Empirical-AC verification — Q-R66-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# Block 1: engine/ds-integration/event-consumer.ts exists (R66 deliverable)
# -----------------------------------------------------------------------------
echo "Block 1: engine/ds-integration/event-consumer.ts exists"
assert_truthy "Block 1 (event-consumer.ts exists)" "[ -f engine/ds-integration/event-consumer.ts ]"
echo ""

# -----------------------------------------------------------------------------
# Block 2: engine/ds-integration/freeze-hook-factory.ts exists (R66 deliverable)
# -----------------------------------------------------------------------------
echo "Block 2: engine/ds-integration/freeze-hook-factory.ts exists"
assert_truthy "Block 2 (freeze-hook-factory.ts exists)" "[ -f engine/ds-integration/freeze-hook-factory.ts ]"
echo ""

# -----------------------------------------------------------------------------
# Block 3: index.ts has exactly 5 export-star lines (3 existing + 2 R66 new)
# -----------------------------------------------------------------------------
echo "Block 3: engine/ds-integration/index.ts has exactly 5 export-star lines"
ACTUAL=$(grep -cE "^export \* from " engine/ds-integration/index.ts 2>/dev/null)
assert_eq "Block 3 (index export-star count)" "5" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 4: event-consumer.ts imports DS_TO_TESSERA_EVENT_ENDPOINT from ./event-contract
# (no inline path-literal duplication; single source of truth in contract)
# -----------------------------------------------------------------------------
echo "Block 4: event-consumer.ts imports DS_TO_TESSERA_EVENT_ENDPOINT from ./event-contract"
ACTUAL=$(grep -cE "DS_TO_TESSERA_EVENT_ENDPOINT" engine/ds-integration/event-consumer.ts 2>/dev/null)
assert_ge "Block 4 (DS_TO_TESSERA_EVENT_ENDPOINT mention)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 5: event-consumer.ts has zero inline path literal '/v1/tessera/deploy-events'
# (single source: contract module const)
# -----------------------------------------------------------------------------
echo "Block 5: event-consumer.ts has zero inline path literal '/v1/tessera/deploy-events'"
ACTUAL=$(grep -cE "'/v1/tessera/deploy-events'" engine/ds-integration/event-consumer.ts 2>/dev/null)
assert_eq "Block 5 (inline path-literal count)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 6: freeze-hook-factory.ts imports freezeAwareUpdatePerShardResidual
# (delegation to R20/R21/R36 frozen pure function; no body-modification path)
# -----------------------------------------------------------------------------
echo "Block 6: freeze-hook-factory.ts imports freezeAwareUpdatePerShardResidual"
ACTUAL=$(grep -cE "freezeAwareUpdatePerShardResidual" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
assert_ge "Block 6 (delegation import)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 7: freeze-hook-factory.ts contains all 5 event_class literals in
# mapEventClassToKind switch cases (5-value closed-set parity)
# -----------------------------------------------------------------------------
echo "Block 7: freeze-hook-factory.ts contains all 5 event_class literals"
COUNT_FW=$(grep -cE "'firmware_push'" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
COUNT_MR=$(grep -cE "'model_redeploy'" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
COUNT_EC=$(grep -cE "'env_change'" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
COUNT_CC=$(grep -cE "'config_change'" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
COUNT_CA=$(grep -cE "'capacity_change'" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
MIN=$COUNT_FW
for c in $COUNT_MR $COUNT_EC $COUNT_CC $COUNT_CA; do
    if [ "$c" -lt "$MIN" ] 2>/dev/null; then MIN=$c; fi
done
assert_ge "Block 7 (each of 5 event_class literals appears ≥1 time)" "1" "$MIN"
echo ""

# -----------------------------------------------------------------------------
# Block 8: freeze-hook-factory.ts contains `never` exhaustiveness assertion
# (compile-time parity gate inheriting AC-R62-7 discipline)
# -----------------------------------------------------------------------------
echo "Block 8: freeze-hook-factory.ts contains never-exhaustiveness assertion"
ACTUAL=$(grep -cE ":\s*never\s*=\s*event_class" engine/ds-integration/freeze-hook-factory.ts 2>/dev/null)
assert_ge "Block 8 (never assertion in mapEventClassToKind)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 9: ClusterEventKind ↔ event_class parity invariant — both files
# reference all 5 closed-set literals (AC-R62-7 inheritance)
# -----------------------------------------------------------------------------
echo "Block 9: event-contract.ts + event-feed.ts share 5-value closed-set literals"
PARITY_OK=1
for lit in firmware_push model_redeploy env_change config_change capacity_change; do
    C1=$(grep -cE "'$lit'" engine/ds-integration/event-contract.ts 2>/dev/null)
    C2=$(grep -cE "'$lit'" engine/events/event-feed.ts 2>/dev/null)
    if [ "$C1" -lt 1 ] || [ "$C2" -lt 1 ]; then
        PARITY_OK=0
        echo "    MISSING '$lit' in contract:$C1 / feed:$C2"
    fi
done
assert_eq "Block 9 (parity all 5 literals in both files)" "1" "$PARITY_OK"
echo ""

# -----------------------------------------------------------------------------
# Block 10: engine/ds-integration/event-contract.ts unmodified at HEAD
# (R62 contract; frozen; anti-scope item 2)
# -----------------------------------------------------------------------------
echo "Block 10: engine/ds-integration/event-contract.ts unmodified (round-start..HEAD)"
ACTUAL=$(git diff "${ROUND_START}..HEAD" --name-only -- engine/ds-integration/event-contract.ts 2>/dev/null)
assert_eq "Block 10 (event-contract.ts diff is empty)" "" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 11: engine/events/freeze-hook.ts unmodified at HEAD
# (R20+R21+R36 frozen; anti-scope item 1; halt #4 trigger)
# -----------------------------------------------------------------------------
echo "Block 11: engine/events/freeze-hook.ts unmodified (round-start..HEAD)"
ACTUAL=$(git diff "${ROUND_START}..HEAD" --name-only -- engine/events/freeze-hook.ts 2>/dev/null)
assert_eq "Block 11 (freeze-hook.ts diff is empty)" "" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Block 12: anti-scope diff round-start..HEAD ⊆ 9-path ALLOWED_SET
# (Rule 4 ACTIVE GATE; defense-in-depth mirror of runtime AC-R66-14)
# -----------------------------------------------------------------------------
echo "Block 12: anti-scope diff round-start..HEAD ⊆ 9-path ALLOWED_SET"
ALLOWED=$(printf '%s\n' \
    "coordination/MEMORIAL.md" \
    "coordination/NEXT-ROLE.md" \
    "coordination/specs/Q-R66-EMPIRICAL.sh" \
    "coordination/specs/Q-R66-SPEC-AUDIT.md" \
    "coordination/specs/Q-R66-SPEC.md" \
    "engine/ds-integration/event-consumer.ts" \
    "engine/ds-integration/freeze-hook-factory.ts" \
    "engine/ds-integration/index.ts" \
    "test/q66-ds-integration-event-consumer.test.ts" \
    | sort)
DIFF=$(git diff "${ROUND_START}..HEAD" --name-only 2>/dev/null \
    | grep -v -E "^coordination/reviews/REVIEWER-REPORT-R66\.md$" \
    | grep -v -E "^coordination/diagnostics/DIAGNOSTIC-R66-.*\.md$" \
    | sort)
UNAUTHORIZED=$(comm -23 <(echo "$DIFF") <(echo "$ALLOWED"))
if [ -z "$UNAUTHORIZED" ]; then
    echo "  PASS — Block 12 (diff ⊆ ALLOWED_SET)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — Block 12 (diff ⊆ ALLOWED_SET)"
    echo "    unauthorized paths:"
    echo "$UNAUTHORIZED" | sed 's/^/      /'
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# Block 13: npx tsc -p tsconfig.test.json exits 0
# -----------------------------------------------------------------------------
echo "Block 13: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "Block 13 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# Block 14: node --test summary = 444/438/3/3
#
# [R66-amended per operator Option A resolution 2026-05-20]:
# 3 fails = R36-30 + R36-31 forward-protection carry-forward (pre-existing
# from Phase 2 close `87e372f`) + AC-R65-2 NEW carry-forward (live-file-count
# assertion in q65 that reads index.ts at runtime and asserts export-star
# count === 3; R66 adds 2 lines → count = 5 → AC-R65-2 PASS→FAIL).
# AC-R65-2 is structurally fragile (live-file-count pattern); documented
# analogous to R36-30/R36-31 carry-forward. Not introduced by R66 R66
# substantive code; consequence of R66's in-scope index.ts modification.
# Original spec-predicted value was 444/439/2/3 (issued before R65 AC-R65-2
# fragility was discovered at implementation time).
#
# `|| true` because node --test exits non-zero when fail count > 0.
# Capture output ONCE; grep multiple times against the capture (per R46
# bash-bug lesson — multiple `node --test` invocations corrupt the summary
# capture with set -uo pipefail).
# -----------------------------------------------------------------------------
echo "Block 14: test summary = 444/438/3/3"
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "Block 14 (test summary)" "444/438/3/3" "$SUMMARY"
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
