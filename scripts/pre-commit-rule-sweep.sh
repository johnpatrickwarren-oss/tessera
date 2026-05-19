#!/usr/bin/env bash
# scripts/pre-commit-rule-sweep.sh
#
# Rule 7 propagation Surface (b): mechanical pre-commit rule sweep.
#
# Implements the second of Rule 7's three canonical propagation surfaces per
# ~/.claude/CROSS-PROJECT-MEMORIAL.md:3478 (R38 Memorial-Updater stage, per
# OQ-W5-1 Option A authorization). The companion Surface (a) lives at
# coordination/SPEC-AUTHORING-CHECKLIST.md § "Rule 7 self-application gate";
# Surface (c) is round-conditional (round-of-derivation special case).
#
# What this script does:
#   - Takes a round-start SHA and chore-A SHA as input.
#   - Runs grep gates on the round's diff for the 2 fully-mechanizable rules
#     (Rule 4 + Rule 7).
#   - Emits "SEMANTIC CHECK REQUIRED" directives for the 5 partial-semantic
#     rules (Rules 1, 2, 3, 5, 6) with pointers to the canonical checklist.
#   - Aggregates findings and exits non-zero if any mechanical gate flagged.
#
# Usage:
#   scripts/pre-commit-rule-sweep.sh <round-start-SHA> <chore-A-SHA>
#
# Exit codes:
#   0 — clean sweep (mechanizable rules pass; semantic rules logged for manual check)
#   1 — finding (mechanizable rule violation detected in diff)
#   2 — usage / invocation error

set -uo pipefail

# -----------------------------------------------------------------------------
# Argument parsing
# -----------------------------------------------------------------------------

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <round-start-SHA> <chore-A-SHA>" >&2
    echo "" >&2
    echo "Runs Rule 7 Surface (b) pre-commit rule-sweep on the round's diff." >&2
    echo "See coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate." >&2
    exit 2
fi

ROUND_START_SHA="$1"
CHORE_A_SHA="$2"

# Validate SHAs exist
if ! git rev-parse --verify "$ROUND_START_SHA" >/dev/null 2>&1; then
    echo "ERROR: round-start SHA '$ROUND_START_SHA' not found in repository" >&2
    exit 2
fi
if ! git rev-parse --verify "$CHORE_A_SHA" >/dev/null 2>&1; then
    echo "ERROR: chore-A SHA '$CHORE_A_SHA' not found in repository" >&2
    exit 2
fi

# -----------------------------------------------------------------------------
# Output helpers
# -----------------------------------------------------------------------------

MECHANICAL_FINDINGS=0
SEMANTIC_CHECKS=0

# -----------------------------------------------------------------------------
# Rule 1 — false-compliance-attestation (SEMANTIC; stubbed)
# -----------------------------------------------------------------------------

rule_1_check() {
    echo ""
    echo "Rule 1 (false-compliance-attestation): MECHANICAL CHECK via sub-class verifier"
    # R46 upgrade: Rule 1 sub-class `empirical-command-attestation` mechanizes
    # the numeric/grep-output verification via scripts/verify-empirical-acs.sh.
    # The verifier runs the round's Q-RNN-EMPIRICAL.sh and aggregates per-AC
    # results. Mismatch → mechanical finding.

    # Locate the round's spec file from the diff
    local round_spec
    round_spec=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" \
        -- 'coordination/specs/Q-R*-SPEC.md' 2>/dev/null | head -1)

    if [ -z "$round_spec" ]; then
        echo "  N/A — no spec file in this round diff."
        return 0
    fi

    # Derive round number from spec filename (Q-RNN-SPEC.md → RNN)
    local round_num
    round_num=$(basename "$round_spec" | sed -E 's/Q-(R[0-9]+)-SPEC\.md/\1/')

    if [ ! -x "scripts/verify-empirical-acs.sh" ]; then
        echo "  ADVISORY — scripts/verify-empirical-acs.sh missing or not executable."
        echo "  Pre-R46 SEMANTIC fallback: cross-check each AC PASS claim against"
        echo "  observed evidence; for verbatim-preservation ACs run diff before PASS."
        SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
        return 0
    fi

    local empirical_file="coordination/specs/Q-${round_num}-EMPIRICAL.sh"
    if [ ! -f "$empirical_file" ]; then
        echo "  ADVISORY — $empirical_file not present."
        echo "  Per Rule 1 sub-class (empirical-command-attestation), every round with"
        echo "  numeric/grep-output ACs MUST author this file. If this round genuinely"
        echo "  has no empirical ACs, document the N/A in spec § 5; otherwise FAIL."
        SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
        return 0
    fi

    echo "  Invoking: scripts/verify-empirical-acs.sh $round_num"
    if scripts/verify-empirical-acs.sh "$round_num" >/dev/null 2>&1; then
        echo "  OK — all empirical ACs verified (exit 0)."
        return 0
    else
        local rc=$?
        echo "  FINDING — scripts/verify-empirical-acs.sh $round_num exit $rc"
        echo "    Per Rule 1 sub-class: HALT + DIAGNOSTIC required;"
        echo "    do NOT attest PASS on failed empirical AC(s)."
        echo "    Re-run manually to see per-AC failure detail:"
        echo "      scripts/verify-empirical-acs.sh $round_num"
        MECHANICAL_FINDINGS=$((MECHANICAL_FINDINGS + 1))
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Rule 2 — architect-branch-binding-coverage (SEMANTIC; stubbed)
# -----------------------------------------------------------------------------

rule_2_check() {
    echo ""
    echo "Rule 2 (architect-branch-binding-coverage): SEMANTIC CHECK REQUIRED"
    echo "  Check: for each guard / default / fallback in production code touched"
    echo "  by the round, verify either (a) an AC reaches and exercises it, OR"
    echo "  (b) spec § Acknowledged-gap section names it with non-load-bearing rationale."
    echo "  Source: coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 row 2."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}

# -----------------------------------------------------------------------------
# Rule 3 — implementer-spec-test-assertion-coverage (SEMANTIC; stubbed)
# -----------------------------------------------------------------------------

rule_3_check() {
    echo ""
    echo "Rule 3 (implementer-spec-test-assertion-coverage): SEMANTIC CHECK REQUIRED"
    echo "  Check: for each AC Then-clause field/condition, grep '<field>' in the"
    echo "  test file and verify a strictEqual / deepStrictEqual / match assertion"
    echo "  covers it. Discriminating assertions only — broad substring matches"
    echo "  don't bind."
    echo "  Source: coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 row 3."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}

# -----------------------------------------------------------------------------
# Rule 4 — anti-scope-allowed-set-forward-coverage (MECHANIZABLE)
# -----------------------------------------------------------------------------

rule_4_check() {
    echo ""
    echo "Rule 4 (anti-scope-allowed-set-forward-coverage): ADVISORY CHECK"
    # The full Rule 4 mechanical check requires the spec-emit SHA (commit at
    # which the spec was authored), not the round-start SHA. Round-start..chore-A
    # captures multi-commit rounds but cannot distinguish:
    #   (a) "spec authored at round-start (Add); ALLOWED_SET is original content"
    #   (b) "spec authored before round-start; ALLOWED_SET added post-hoc this round"
    # Without the spec-emit SHA, the mechanical check yields false positives on
    # newly-authored specs. Bounded R45 implementation: emit advisory only.
    #
    # Stricter mechanization is deferred to a future round that adds spec-emit-SHA
    # tracking (e.g., via a spec preamble line like "spec-emit-SHA: <hash>").

    local spec_files
    spec_files=$(git diff --name-status "$ROUND_START_SHA" "$CHORE_A_SHA" -- 'coordination/specs/Q-R*-SPEC.md' 2>/dev/null || true)

    if [ -z "$spec_files" ]; then
        echo "  N/A — no spec file in this round diff."
        return 0
    fi

    while IFS= read -r line; do
        local status path
        status=$(echo "$line" | awk '{print $1}')
        path=$(echo "$line" | awk '{print $2}')
        case "$status" in
            A)
                echo "  ADVISORY — $path is NEWLY ADDED in this round."
                echo "    Round-start..chore-A diff cannot distinguish spec-emit vs ALLOWED_SET-amendment."
                echo "    Implementer/Reviewer must manually verify: was ALLOWED_SET stable from spec-commit to chore-A?"
                ;;
            M)
                echo "  ADVISORY — $path was MODIFIED in this round."
                echo "    Mechanical Rule 4 check requires spec-emit-SHA (not yet tracked)."
                echo "    Manual verification: \`git log --oneline $ROUND_START_SHA..$CHORE_A_SHA -- $path\`"
                echo "    For each commit: did ALLOWED_SET block change between commits?"
                ;;
            *)
                echo "  ADVISORY — $path status=$status (unexpected); manual check required."
                ;;
        esac
    done <<< "$spec_files"

    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}

# -----------------------------------------------------------------------------
# Rule 5 — self-application gate (SEMANTIC; stubbed)
# -----------------------------------------------------------------------------

rule_5_check() {
    echo ""
    echo "Rule 5 (self-application-gate): SEMANTIC CHECK REQUIRED"
    echo "  Check: for each new rule appended at Memorial-Updater stage in this"
    echo "  round, grep \`git diff round-start..chore-A\` for the rule's prohibited"
    echo "  pattern; record results inline in spec § 7 or MEMORIAL entry."
    echo "  Source: coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 row 5."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}

# -----------------------------------------------------------------------------
# Rule 6 — halt-discipline-no-DIAGNOSTIC-for-workaround (SEMANTIC; stubbed)
# -----------------------------------------------------------------------------

rule_6_check() {
    echo ""
    echo "Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround): SEMANTIC CHECK REQUIRED"
    echo "  Check: at each anticipated halt-condition trigger point, verify that"
    echo "  DIAGNOSTIC file exists in coordination/diagnostics/DIAGNOSTIC-R<NN>-*.md"
    echo "  AND \`STATUS: ESCALATE\` was set in NEXT-ROLE.md. If no halt encountered:"
    echo "  mark N/A explicitly."
    echo "  Source: coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 row 6."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}

# -----------------------------------------------------------------------------
# Rule 7 — derived-rule-propagation-mechanism-required (MECHANIZABLE)
# -----------------------------------------------------------------------------

rule_7_check() {
    echo ""
    echo "Rule 7 (derived-rule-propagation-mechanism-required): MECHANICAL CHECK"

    # CROSS-PROJECT-MEMORIAL.md lives outside the project's git tracking.
    # Use absolute path.
    local cross_memorial="$HOME/.claude/CROSS-PROJECT-MEMORIAL.md"
    if [ ! -f "$cross_memorial" ]; then
        echo "  N/A — $cross_memorial not present; cannot check Rule 7 propagation."
        return 0
    fi

    # Check whether the round modified CROSS-PROJECT-MEMORIAL.md (file outside
    # this repo, so git diff doesn't track it; check mtime as a proxy).
    # The cleaner check: did the round add a "Reinforcement rules derived" entry?
    # We can't see CROSS-PROJECT-MEMORIAL diff via git; emit advisory:
    echo "  ADVISORY — Rule 7 gate cannot mechanically detect CROSS-PROJECT-MEMORIAL.md"
    echo "  changes (file outside repo git tracking). Implementer/Reviewer must"
    echo "  verify manually: if this round's Memorial-Updater stage appended a new"
    echo "  'Reinforcement rules derived' entry to $cross_memorial, then the round's"
    echo "  spec § 7 MUST enumerate the new rule by name."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))

    # Secondary mechanical check: if the round's spec is present, verify § 7
    # enumerates all 7 rules (which is the R44 directive).
    local spec_files
    spec_files=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" -- 'coordination/specs/Q-R*-SPEC.md' 2>/dev/null || true)

    if [ -n "$spec_files" ]; then
        for spec in $spec_files; do
            if [ -f "$spec" ]; then
                local rule_count
                rule_count=$(grep -cE '^- \*\*Rule [1-7] ' "$spec" 2>/dev/null || echo 0)
                if [ "$rule_count" -lt 7 ]; then
                    echo "  FINDING — $spec § 7 enumerates only $rule_count/7 rules"
                    echo "    (Rule 7 canonical text requires § 7 lists each of the 7 rules"
                    echo "    with active gate / N/A / already-validated application)."
                    MECHANICAL_FINDINGS=$((MECHANICAL_FINDINGS + 1))
                    return 1
                else
                    echo "  OK — $spec § 7 enumerates all 7 rules."
                fi
            fi
        done
    fi
    return 0
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

echo "Rule 7 pre-commit rule-sweep"
echo "Round diff range: $ROUND_START_SHA..$CHORE_A_SHA"
echo "============================================================"

rule_1_check
rule_2_check
rule_3_check
rule_4_check
rule_5_check
rule_6_check
rule_7_check

echo ""
echo "============================================================"
echo "Sweep summary:"
echo "  Mechanical findings: $MECHANICAL_FINDINGS"
echo "  Semantic checks required (manual): $SEMANTIC_CHECKS"

if [ "$MECHANICAL_FINDINGS" -gt 0 ]; then
    echo ""
    echo "EXIT 1 — mechanical rule violations detected; HALT + DIAGNOSTIC required"
    echo "  per Rule 7 canonical text (~/.claude/CROSS-PROJECT-MEMORIAL.md:3478)."
    exit 1
fi

echo ""
echo "EXIT 0 — clean mechanical sweep. Implementer/Reviewer must independently"
echo "verify the $SEMANTIC_CHECKS semantic-check directives above."
exit 0
