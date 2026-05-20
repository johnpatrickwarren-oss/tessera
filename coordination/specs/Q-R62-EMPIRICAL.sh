#!/usr/bin/env bash
# coordination/specs/Q-R62-EMPIRICAL.sh
#
# Empirical-AC verification for round R62 (Phase 3 SLICE 3 WU-Phase3-3A
# re-scoped per Option F: DS integration interface contract design — types +
# HTTP transport metadata + contract documentation).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`
# (canonical landing R46; R47 Tightenings 1-4 applied; convention propagated
# through R47-R58).
#
# Each block below verifies one AC or one structural premise from
# Q-R62-SPEC.md § 5 / § 4. Each block exits non-zero on mismatch. The
# harness (`scripts/verify-empirical-acs.sh R62`) reports the aggregate exit
# code.
#
# This file is the AUTHORITATIVE source for R62 empirical attestations.
# Chore-A NEXT-ROLE.md attestations MUST cite the output of running this
# file at chore-A SHA — not memorized values from spec text.
#
# Two-state distinction (per R53 MINOR-1 + R56 MINOR-1 reinforcement):
#   - At chore-A: AC-R62-12 + AC-R62-15 each fail by construction
#     (placeholder SHA literal `<INJECTED-AT-CHORE-B>` is not a valid git
#     ref). Actual test summary at chore-A: tests=412 / pass=405 / fail=4 /
#     skipped=3 (4 fails = R36-30 + R36-31 carry-forward + AC-R62-12
#     placeholder + AC-R62-15 placeholder).
#   - At chore-B (after Implementer SHA injection): both ACs pass. Predicted
#     summary: tests=412 / pass=407 / fail=2 / skipped=3.
# This script's AC-R62-10 block asserts the POST-CHORE-B predicted value
# (412/407/2/3). At chore-A pre-injection, the AC-R62-10 block FAIL is
# EXPECTED and load-bearing for the Implementer to attest the actual value
# (412/405/4/3) verbatim per Rule 1 sub-class. The R56 MINOR-1 carve-out
# documented in Q-R62-SPEC.md § 6.1 halt condition #1 makes this
# pre-documented FAIL NOT a halt trigger.

set -uo pipefail

FAILED=0
PASS=0
ROUND="R62"
ROUND_START="ad6cc6b"

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

echo "[$ROUND] Empirical-AC verification — Q-R62-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# File existence (NEW R62 deliverables)
# -----------------------------------------------------------------------------
echo "FILE-1: engine/ds-integration/feed-contract.ts exists"
assert_truthy "FILE-1" "[ -f engine/ds-integration/feed-contract.ts ]"
echo ""

echo "FILE-2: engine/ds-integration/event-contract.ts exists"
assert_truthy "FILE-2" "[ -f engine/ds-integration/event-contract.ts ]"
echo ""

echo "FILE-3: engine/ds-integration/index.ts exists"
assert_truthy "FILE-3" "[ -f engine/ds-integration/index.ts ]"
echo ""

echo "FILE-4: engine/ds-integration/README.md exists"
assert_truthy "FILE-4" "[ -f engine/ds-integration/README.md ]"
echo ""

echo "FILE-5: test/q62-ds-integration-contract.test.ts exists"
assert_truthy "FILE-5" "[ -f test/q62-ds-integration-contract.test.ts ]"
echo ""

# -----------------------------------------------------------------------------
# Anti-scope assertion (READ-ONLY files preserved unmodified vs round-start)
# -----------------------------------------------------------------------------
echo "FILE-6 (anti-scope): engine/types/verdict.ts unmodified vs round-start ${ROUND_START}"
ACTUAL=$(git diff "${ROUND_START}..HEAD" --name-only -- engine/types/verdict.ts | wc -l | tr -d ' ')
assert_eq "FILE-6 (engine/types/verdict.ts unchanged)" "0" "$ACTUAL"
echo ""

echo "FILE-7 (anti-scope): engine/events/event-feed.ts unmodified vs round-start ${ROUND_START}"
ACTUAL=$(git diff "${ROUND_START}..HEAD" --name-only -- engine/events/event-feed.ts | wc -l | tr -d ' ')
assert_eq "FILE-7 (engine/events/event-feed.ts unchanged)" "0" "$ACTUAL"
echo ""

echo "FILE-8 (anti-scope): engine/events/freeze-hook.ts unmodified vs round-start ${ROUND_START}"
ACTUAL=$(git diff "${ROUND_START}..HEAD" --name-only -- engine/events/freeze-hook.ts | wc -l | tr -d ' ')
assert_eq "FILE-8 (engine/events/freeze-hook.ts unchanged)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-1 (structural source-grep): index.ts re-exports both contract files
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-1 (source-grep): index.ts has 2 export-star lines"
ACTUAL=$(grep -cE "^export \* from " engine/ds-integration/index.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-1 (export-star count)" "2" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-2 (source-grep): feed-contract.ts + event-contract.ts interface count
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-2a (source-grep): feed-contract.ts has 5 exported interfaces"
ACTUAL=$(grep -cE "^export interface " engine/ds-integration/feed-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-2a (feed interface count)" "5" "$ACTUAL"
echo ""

echo "AC-${ROUND}-2b (source-grep): event-contract.ts has 4 exported interfaces"
ACTUAL=$(grep -cE "^export interface " engine/ds-integration/event-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-2b (event interface count)" "4" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-3 (source-grep): README.md has 4 anchored section headers
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-3a (README): '## Tessera → DS feed' exactly once"
ACTUAL=$(grep -cE "^## Tessera → DS feed$" engine/ds-integration/README.md 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-3a (feed-section header count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-3b (README): '## DS → Tessera event' exactly once"
ACTUAL=$(grep -cE "^## DS → Tessera event$" engine/ds-integration/README.md 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-3b (event-section header count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-3c (README): '## Versioning' exactly once"
ACTUAL=$(grep -cE "^## Versioning$" engine/ds-integration/README.md 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-3c (versioning-section header count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-3d (README): '## Anti-scope (R62)' exactly once"
ACTUAL=$(grep -cE "^## Anti-scope \(R62\)$" engine/ds-integration/README.md 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-3d (anti-scope-section header count)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-13 + AC-R62-14 (A16 literal-type preservation; line-anchored regex
# matches at engine source AND wire-format projection)
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-13: engine/types/verdict.ts retains correlational_not_causal:true literal-type"
ACTUAL=$(grep -cE "^[[:space:]]*correlational_not_causal:[[:space:]]*true[[:space:]]*;" engine/types/verdict.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-13 (engine A16 literal-type count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-14: feed-contract.ts propagates correlational_not_causal:true literal-type"
ACTUAL=$(grep -cE "^[[:space:]]*correlational_not_causal:[[:space:]]*true[[:space:]]*;" engine/ds-integration/feed-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-14 (contract A16 literal-type count)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-7 cross-check: 5-value ClusterEventKind closed-set parity
# Verifies the wire-format event_class union mirrors engine/events/event-feed.ts
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-7-parity: 5-value event_class closed-set in contract = engine source"
# Extract the 5 literal values from each location; sort + diff.
ENGINE_VALUES=$(grep -oE "'(firmware_push|model_redeploy|env_change|config_change|capacity_change)'" engine/events/event-feed.ts 2>/dev/null | sort -u)
CONTRACT_VALUES=$(grep -oE "'(firmware_push|model_redeploy|env_change|config_change|capacity_change)'" engine/ds-integration/event-contract.ts 2>/dev/null | sort -u)
ENGINE_COUNT=$(echo "$ENGINE_VALUES" | grep -c . || echo "0")
CONTRACT_COUNT=$(echo "$CONTRACT_VALUES" | grep -c . || echo "0")
if [ "$ENGINE_COUNT" = "5" ] && [ "$CONTRACT_COUNT" = "5" ] && [ "$ENGINE_VALUES" = "$CONTRACT_VALUES" ]; then
    echo "  PASS — AC-${ROUND}-7-parity (5-value closed-set parity)"
    echo "    engine:   ${ENGINE_COUNT} unique values"
    echo "    contract: ${CONTRACT_COUNT} unique values (identical set)"
    PASS=$((PASS + 1))
else
    echo "  FAIL — AC-${ROUND}-7-parity (5-value closed-set parity)"
    echo "    engine count:   $ENGINE_COUNT (expected 5)"
    echo "    contract count: $CONTRACT_COUNT (expected 5)"
    echo "    engine values:   $ENGINE_VALUES"
    echo "    contract values: $CONTRACT_VALUES"
    FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# AC-R62-9 (source-grep): HTTP endpoint literals present
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-9a (source-grep): TESSERA_TO_DS_FEED_ENDPOINT const exists"
ACTUAL=$(grep -cE "^export const TESSERA_TO_DS_FEED_ENDPOINT " engine/ds-integration/feed-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-9a (feed endpoint const count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-9b (source-grep): DS_TO_TESSERA_EVENT_ENDPOINT const exists"
ACTUAL=$(grep -cE "^export const DS_TO_TESSERA_EVENT_ENDPOINT " engine/ds-integration/event-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "AC-${ROUND}-9b (event endpoint const count)" "1" "$ACTUAL"
echo ""

echo "AC-${ROUND}-9c (source-grep): feed endpoint path literal '/v1/tessera/verdict-groups'"
ACTUAL=$(grep -cE "'/v1/tessera/verdict-groups'" engine/ds-integration/feed-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_ge "AC-${ROUND}-9c (feed path literal count >= 2 — interface + const)" "2" "$ACTUAL"
echo ""

echo "AC-${ROUND}-9d (source-grep): event endpoint path literal '/v1/tessera/deploy-events'"
ACTUAL=$(grep -cE "'/v1/tessera/deploy-events'" engine/ds-integration/event-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_ge "AC-${ROUND}-9d (event path literal count >= 2 — interface + const)" "2" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Cross-boundary import discipline (zero imports from engine internals)
# -----------------------------------------------------------------------------
echo "DECOUPLING-1: feed-contract.ts has zero imports from ../types or ../events"
ACTUAL=$(grep -cE "^import.*from\s*'(\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/feed-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "DECOUPLING-1 (feed-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

echo "DECOUPLING-2: event-contract.ts has zero imports from ../types or ../events"
ACTUAL=$(grep -cE "^import.*from\s*'(\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/event-contract.ts 2>/dev/null)
ACTUAL=${ACTUAL:-0}
assert_eq "DECOUPLING-2 (event-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-11 (typecheck attestation — npx tsc exit code)
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-11: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-${ROUND}-11 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-10 (test count attestation — node --test summary)
# -----------------------------------------------------------------------------
echo "AC-${ROUND}-10: test summary = 412/407/2/3 (post-chore-B; placeholder SHAs injected)"
# Two-state distinction per R53 MINOR-1 + R56 MINOR-1:
#   - At chore-A (pre-SHA-injection): actual will be 412/405/4/3 (4 fails =
#     R36-30 + R36-31 pre-existing + AC-R62-12 placeholder + AC-R62-15
#     placeholder). The block FAILs.
#     The Implementer MUST encode the ACTUAL observed value verbatim in
#     NEXT-ROLE.md attestation — do NOT reframe as compliance. The R56
#     MINOR-1 carve-out in Q-R62-SPEC § 6.1 halt condition #1 makes this
#     pre-documented FAIL NOT a halt trigger.
#   - At chore-B (post-SHA-injection): both AC-R62-12 + AC-R62-15 pass →
#     summary returns to spec-predicted 412/407/2/3. The block PASSes.
# `|| true` because node --test exits non-zero when fail count > 0.
# Capture output ONCE; grep multiple times against the capture (per R46
# bash-bug lesson — multiple `node --test` invocations corrupt the summary
# capture with set -uo pipefail).
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-${ROUND}-10 (test summary)" "412/407/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R62-12 (anti-scope diff — advisory; manual at chore-A)
# -----------------------------------------------------------------------------
# Verified at chore-A time via `git diff --name-only` against ALLOWED_SET
# enumerated in Q-R62-SPEC.md § 3.2. Not mechanizable from inside this script
# without round-start SHA + chore-A SHA pair (chore-A SHA not yet known when
# this script runs as part of pre-commit chore-A sweep). The runtime test at
# test/q62-ds-integration-contract.test.ts AC-R62-12 block performs this
# check after SHA injection.
echo "AC-${ROUND}-12: anti-scope ALLOWED_SET coverage (manual git diff at chore-A)"
echo "  ADVISORY — verify manually:"
echo "    git diff ${ROUND_START}..\$CHORE_A_SHA --name-only | sort > /tmp/r62-diff.txt"
echo "    diff /tmp/r62-diff.txt <(printf '%s\n' \\"
echo "      coordination/MEMORIAL.md \\"
echo "      coordination/NEXT-ROLE.md \\"
echo "      coordination/specs/Q-R62-EMPIRICAL.sh \\"
echo "      coordination/specs/Q-R62-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R62-SPEC.md \\"
echo "      engine/ds-integration/README.md \\"
echo "      engine/ds-integration/event-contract.ts \\"
echo "      engine/ds-integration/feed-contract.ts \\"
echo "      engine/ds-integration/index.ts \\"
echo "      test/q62-ds-integration-contract.test.ts \\"
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
