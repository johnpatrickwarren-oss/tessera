#!/usr/bin/env bash
# scripts/verify-wave-aggregate.sh
#
# Wave-gate aggregate verifier (wave-level parallel to verify-empirical-acs.sh).
#
# Runs three mechanical checks at Coordinator wave-gate close — BEFORE
# STATUS: WAVE-COMPLETE. Detects aggregate issues invisible at the per-cluster
# level: cross-cluster scope creep, contract drift, and MEMORIAL fragment
# semantic-conflict.
#
# See coordination/SPEC-AUTHORING-CHECKLIST.md § "Wave-aggregate verification
# discipline" for the full discipline + authoring requirements.
#
# Usage:
#   scripts/verify-wave-aggregate.sh <wave-number>
#   scripts/verify-wave-aggregate.sh WAVE-01
#
# Wave-number format: WAVE-NN (e.g., WAVE-01, WAVE-02, ...).
# The script locates coordination/WAVE-PLAN-<NN>.md from the wave-number arg.
#
# Exit codes:
#   0 — clean (Check 1 mechanical gate passes; advisory checks logged)
#   1 — finding (Check 1 mechanical gate violation; scope creep detected)
#   2 — usage / invocation error (bad args, WAVE-PLAN not found)

set -uo pipefail

# ── Argument parsing ────────────────────────────────────────────────────────

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <wave-number>" >&2
    echo "" >&2
    echo "Examples:" >&2
    echo "  $0 WAVE-01" >&2
    echo "  $0 WAVE-02" >&2
    echo "" >&2
    echo "See coordination/SPEC-AUTHORING-CHECKLIST.md § Wave-aggregate verification" >&2
    echo "discipline for full discipline requirements." >&2
    exit 2
fi

WAVE_ARG="$1"

# Resolve wave-plan file from WAVE-NN argument
WAVE_PLAN=""
if [[ "$WAVE_ARG" =~ ^WAVE-([0-9]+)$ ]]; then
    WAVE_NUM="${BASH_REMATCH[1]}"
    WAVE_PLAN="coordination/WAVE-PLAN-${WAVE_NUM}.md"
else
    echo "ERROR: wave-number '$WAVE_ARG' must match WAVE-NN format (e.g., WAVE-01)" >&2
    exit 2
fi

if [ ! -f "$WAVE_PLAN" ]; then
    echo "ERROR: wave-plan file '$WAVE_PLAN' not found" >&2
    echo "" >&2
    echo "Locate the correct WAVE-PLAN file in coordination/:" >&2
    ls coordination/WAVE-PLAN-*.md 2>/dev/null || echo "  (no WAVE-PLAN files found)" >&2
    exit 2
fi

# ── Output helpers ──────────────────────────────────────────────────────────

MECHANICAL_FINDINGS=0
ADVISORY_ITEMS=0

# ── Cluster discovery ───────────────────────────────────────────────────────

# Find cluster fragment directories
CLUSTER_FRAGMENTS=()
if [ -d "coordination/clusters" ]; then
    while IFS= read -r -d '' fragment_path; do
        CLUSTER_FRAGMENTS+=("$fragment_path")
    done < <(find "coordination/clusters" -name "MEMORIAL-fragment.md" -print0 2>/dev/null)
fi

echo "Wave-aggregate verifier"
echo "Wave:      $WAVE_ARG"
echo "Wave plan: $WAVE_PLAN"
echo "Clusters:  ${#CLUSTER_FRAGMENTS[@]} MEMORIAL-fragment(s) found"
echo "============================================================"
echo ""

# ── Check 1 — Aggregate ALLOWED_SET union (mechanical where determinable) ───

echo "Check 1 — Aggregate ALLOWED_SET union"
echo ""

# Read wave-level allowed set from WAVE-PLAN file, if defined.
# Convention: WAVE-PLAN includes a "## Wave-level ALLOWED_SET" section listing
# paths or regexes that all cluster diffs should be bounded by.
WAVE_ALLOWED_SET_SECTION=""
if grep -qF "## Wave-level ALLOWED_SET" "$WAVE_PLAN" 2>/dev/null; then
    WAVE_ALLOWED_SET_SECTION="present"
    echo "  Wave-level ALLOWED_SET section found in $WAVE_PLAN."
else
    echo "  ADVISORY — No '## Wave-level ALLOWED_SET' section found in $WAVE_PLAN."
    echo "  Cannot perform mechanical aggregate scope check."
    echo "  Recommendation: add a '## Wave-level ALLOWED_SET' section to the wave plan"
    echo "  listing the union of all cluster ALLOWED_SETs + any coordination/ files."
    ADVISORY_ITEMS=$((ADVISORY_ITEMS + 1))
fi

# Check cluster MEMORIAL-fragments for ALLOWED_SET mentions (heuristic)
if [ "${#CLUSTER_FRAGMENTS[@]}" -eq 0 ]; then
    echo "  ADVISORY — No cluster MEMORIAL-fragment.md files found in coordination/clusters/."
    echo "  Wave-gate aggregate check is advisory only; run after all clusters complete."
    ADVISORY_ITEMS=$((ADVISORY_ITEMS + 1))
else
    # Extract files mentioned across cluster MEMORIAL-fragments
    # A MEMORIAL CONFIRMATION for anti-scope-allowed-set-forward-coverage typically
    # lists the files that were modified. Look for file paths in CONFIRMATION lines.
    declare -A CLUSTER_FILES
    for fragment in "${CLUSTER_FRAGMENTS[@]}"; do
        cluster_id=$(basename "$(dirname "$fragment")")
        # Heuristic: extract file paths from CONFIRMATION: anti-scope lines
        files_in_fragment=$(grep -oE '[a-z][a-z0-9_/.-]+\.(ts|js|sh|md|json)' "$fragment" 2>/dev/null || true)
        while IFS= read -r fpath; do
            [ -n "$fpath" ] || continue
            if [ -n "${CLUSTER_FILES[$fpath]+_}" ]; then
                CLUSTER_FILES[$fpath]="${CLUSTER_FILES[$fpath]},$cluster_id"
            else
                CLUSTER_FILES[$fpath]="$cluster_id"
            fi
        done <<< "$files_in_fragment"
    done

    if [ -n "$WAVE_ALLOWED_SET_SECTION" ]; then
        echo "  Mechanical ALLOWED_SET verification: cross-checking cluster paths..."
        # Extract allowed paths from the wave-plan section (simple line-by-line)
        # Section ends at the next ## heading
        wave_allowed=$(awk '/## Wave-level ALLOWED_SET/,/^## /' "$WAVE_PLAN" 2>/dev/null \
            | grep -v "^##" | grep -v "^$" | grep -oE '[a-z][a-z0-9_/.-]+' || true)
        outside_count=0
        for fpath in "${!CLUSTER_FILES[@]}"; do
            if ! echo "$wave_allowed" | grep -qF "$fpath" 2>/dev/null; then
                echo "  ADVISORY — '$fpath' (clusters: ${CLUSTER_FILES[$fpath]}) not in wave-level ALLOWED_SET"
                outside_count=$((outside_count + 1))
            fi
        done
        if [ "$outside_count" -eq 0 ]; then
            echo "  OK — all cluster-referenced files are within wave-level ALLOWED_SET."
        else
            echo "  FINDING — $outside_count file(s) outside wave-level ALLOWED_SET (see above)."
            MECHANICAL_FINDINGS=$((MECHANICAL_FINDINGS + 1))
        fi
    else
        echo "  ADVISORY — wave-level ALLOWED_SET not defined; per-cluster ALLOWED_SET checks only."
        echo "  Per-cluster Rule 4 (anti-scope-allowed-set-forward-coverage) verified at Reviewer stage."
    fi
fi
echo ""

# ── Check 2 — Cross-cluster contract drift (advisory) ─────────────────────

echo "Check 2 — Cross-cluster contract drift"
echo ""

if [ "${#CLUSTER_FRAGMENTS[@]}" -lt 2 ]; then
    echo "  N/A — fewer than 2 cluster fragments found; cross-cluster drift check requires ≥2 clusters."
else
    # Identify files that appear in multiple cluster fragments
    declare -A FILE_CLUSTER_COUNT
    for fpath in "${!CLUSTER_FILES[@]}"; do
        count=$(echo "${CLUSTER_FILES[$fpath]}" | tr ',' '\n' | grep -c '^.' 2>/dev/null || echo 0)
        if [ "$count" -ge 2 ] 2>/dev/null; then
            FILE_CLUSTER_COUNT[$fpath]="$count"
        fi
    done

    if [ "${#FILE_CLUSTER_COUNT[@]}" -eq 0 ]; then
        echo "  OK — no files appear in multiple cluster MEMORIAL-fragments."
        echo "  (Note: this is a heuristic check based on fragment content; manual verification recommended.)"
    else
        echo "  ADVISORY — the following files appear in multiple cluster fragments:"
        echo "  Verify clusters agree on interface shape (cannot be mechanically verified):"
        for fpath in "${!FILE_CLUSTER_COUNT[@]}"; do
            clusters="${CLUSTER_FILES[$fpath]}"
            echo "    $fpath — clusters: $clusters"
        done
        ADVISORY_ITEMS=$((ADVISORY_ITEMS + 1))
    fi
fi
echo ""

# ── Check 3 — MEMORIAL fragment semantic-conflict detection (advisory) ──────

echo "Check 3 — MEMORIAL fragment semantic-conflict detection"
echo ""

if [ "${#CLUSTER_FRAGMENTS[@]}" -lt 2 ]; then
    echo "  N/A — fewer than 2 cluster fragments; semantic-conflict check requires ≥2 clusters."
else
    # For each discipline keyword appearing as CONFIRMATION in one cluster and
    # VIOLATION in another, flag as a semantic conflict.
    declare -A DISCIPLINE_CONFIRMATIONS
    declare -A DISCIPLINE_VIOLATIONS

    for fragment in "${CLUSTER_FRAGMENTS[@]}"; do
        cluster_id=$(basename "$(dirname "$fragment")")

        # Extract discipline keywords from CONFIRMATION: lines
        while IFS= read -r line; do
            # Format: CONFIRMATION: <discipline-keyword> | ... | R<NN> | ROLE
            discipline=$(echo "$line" | sed -E 's/^CONFIRMATION: ([^|]+).*/\1/' | xargs)
            [ -n "$discipline" ] || continue
            if [ -n "${DISCIPLINE_CONFIRMATIONS[$discipline]+_}" ]; then
                DISCIPLINE_CONFIRMATIONS[$discipline]="${DISCIPLINE_CONFIRMATIONS[$discipline]},$cluster_id"
            else
                DISCIPLINE_CONFIRMATIONS[$discipline]="$cluster_id"
            fi
        done < <(grep -E "^CONFIRMATION:" "$fragment" 2>/dev/null || true)

        # Extract discipline keywords from VIOLATION: lines
        while IFS= read -r line; do
            discipline=$(echo "$line" | sed -E 's/^VIOLATION: ([^|]+).*/\1/' | xargs)
            [ -n "$discipline" ] || continue
            if [ -n "${DISCIPLINE_VIOLATIONS[$discipline]+_}" ]; then
                DISCIPLINE_VIOLATIONS[$discipline]="${DISCIPLINE_VIOLATIONS[$discipline]},$cluster_id"
            else
                DISCIPLINE_VIOLATIONS[$discipline]="$cluster_id"
            fi
        done < <(grep -E "^VIOLATION:" "$fragment" 2>/dev/null || true)
    done

    CONFLICTS=0
    for discipline in "${!DISCIPLINE_CONFIRMATIONS[@]}"; do
        if [ -n "${DISCIPLINE_VIOLATIONS[$discipline]+_}" ]; then
            echo "  ADVISORY — semantic conflict: '$discipline'"
            echo "    CONFIRMATION in clusters: ${DISCIPLINE_CONFIRMATIONS[$discipline]}"
            echo "    VIOLATION in clusters: ${DISCIPLINE_VIOLATIONS[$discipline]}"
            CONFLICTS=$((CONFLICTS + 1))
        fi
    done

    if [ "$CONFLICTS" -eq 0 ]; then
        echo "  OK — no CONFIRMATION/VIOLATION semantic conflicts detected across cluster fragments."
    else
        echo "  ADVISORY — $CONFLICTS discipline(s) have contradictory entries across clusters."
        echo "  Flag for operator: verify whether the same discipline should be flagged as both."
        ADVISORY_ITEMS=$((ADVISORY_ITEMS + 1))
    fi
fi
echo ""

# ── Summary ─────────────────────────────────────────────────────────────────

echo "============================================================"
echo "Wave-aggregate sweep summary:"
echo "  Mechanical findings: $MECHANICAL_FINDINGS"
echo "  Advisory items (manual review recommended): $ADVISORY_ITEMS"

if [ "$MECHANICAL_FINDINGS" -gt 0 ]; then
    echo ""
    echo "EXIT 1 — aggregate scope violation detected."
    echo "  Resolve mechanical findings before setting STATUS: WAVE-COMPLETE."
    exit 1
fi

echo ""
echo "EXIT 0 — clean mechanical sweep."
if [ "$ADVISORY_ITEMS" -gt 0 ]; then
    echo "  $ADVISORY_ITEMS advisory item(s) require manual operator review."
    echo "  Advisory items are informational; they do not block WAVE-COMPLETE."
fi
exit 0
