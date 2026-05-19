#!/usr/bin/env bash
# scripts/verify-empirical-acs.sh
#
# Rule 1 sub-class (empirical-command-attestation) — mechanical verifier.
#
# Locates and invokes a round's empirical-AC verification file:
#   coordination/specs/Q-RNN-EMPIRICAL.sh
#
# Each round's Q-RNN-EMPIRICAL.sh is an executable bash file containing one
# labeled bash block per empirical AC; each block runs the AC's verification
# command and exits non-zero on mismatch. This harness invokes the file,
# collects per-AC results, and exits 0 only if every AC passes.
#
# Spec authoring rule: every AC in Q-RNN-SPEC.md that makes a numeric,
# count, grep-output, line-number, file-existence, or other empirically-
# determinable claim MUST have a corresponding block in Q-RNN-EMPIRICAL.sh.
# Chore-A attestation cites the OUTPUT of this script — not memorized values.
#
# See coordination/SPEC-AUTHORING-CHECKLIST.md § "Empirical-AC discipline
# (Rule 1 sub-class)" for the full discipline + author-time requirements.
#
# Usage:
#   scripts/verify-empirical-acs.sh <round>
#   scripts/verify-empirical-acs.sh R46
#   scripts/verify-empirical-acs.sh coordination/specs/Q-R46-EMPIRICAL.sh
#
# Exit codes:
#   0 — all empirical ACs verified (every block exited 0)
#   1 — at least one AC failed (block exited non-zero)
#   2 — usage / invocation error (empirical file missing or unreadable)

set -uo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <round-number-or-empirical-file>" >&2
    echo "" >&2
    echo "Examples:" >&2
    echo "  $0 R46" >&2
    echo "  $0 coordination/specs/Q-R46-EMPIRICAL.sh" >&2
    echo "" >&2
    echo "See coordination/SPEC-AUTHORING-CHECKLIST.md § Empirical-AC discipline." >&2
    exit 2
fi

ARG="$1"
EMPIRICAL_FILE=""

# Resolve argument to empirical file path
if [ -f "$ARG" ]; then
    EMPIRICAL_FILE="$ARG"
elif [[ "$ARG" =~ ^R[0-9]+$ ]]; then
    EMPIRICAL_FILE="coordination/specs/Q-${ARG}-EMPIRICAL.sh"
else
    echo "ERROR: argument '$ARG' is neither a round number (R<NN>) nor an existing file" >&2
    exit 2
fi

if [ ! -f "$EMPIRICAL_FILE" ]; then
    echo "ERROR: empirical file '$EMPIRICAL_FILE' not found" >&2
    echo "" >&2
    echo "The round's Q-RNN-EMPIRICAL.sh must exist alongside Q-RNN-SPEC.md." >&2
    echo "See coordination/SPEC-AUTHORING-CHECKLIST.md § Empirical-AC discipline" >&2
    echo "for authoring requirements." >&2
    exit 2
fi

if [ ! -x "$EMPIRICAL_FILE" ]; then
    echo "WARN: empirical file '$EMPIRICAL_FILE' is not executable" >&2
    echo "  Suggested fix: chmod +x $EMPIRICAL_FILE" >&2
    echo "  Continuing with bash invocation..." >&2
fi

echo "Empirical-AC verification (Rule 1 sub-class)"
echo "============================================================"
echo "File: $EMPIRICAL_FILE"
echo ""

# Invoke the empirical file. It is responsible for its own AC iteration
# and per-AC reporting. The harness aggregates only the final exit code.
if bash "$EMPIRICAL_FILE"; then
    EXIT_CODE=0
else
    EXIT_CODE=$?
fi

echo ""
echo "============================================================"
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "RESULT: all empirical ACs verified (exit 0)"
    echo ""
    echo "  Attestation rule: cite the OUTPUT of this run (not memorized"
    echo "  values from spec text). If chore-A re-runs, output must match."
    exit 0
else
    echo "RESULT: one or more empirical ACs FAILED (exit $EXIT_CODE)"
    echo ""
    echo "  Per Rule 1 sub-class (empirical-command-attestation) +"
    echo "  CLAUDE-IMPLEMENTER.md halt-discipline: HALT + DIAGNOSTIC required."
    echo "  Do NOT attest PASS on failed ACs. See above for per-AC failure."
    exit 1
fi
