#!/bin/bash
# anti-scope-gate.sh — enforce that the current round's diff stays within its declared allowed-set.
#
# This REPLACES the per-round `AC-R..: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET` *tests* that
# used to live (frozen, SHA-pinned) inside the product test suite. Those tests were round-scoped: once
# HEAD moved past the round, the diff necessarily included later-round files and the test could only
# fail. Anti-scope is a PRE-MERGE GATE concern, not a permanent product test — so it lives here and
# runs during the active round (pre-commit / CI), reading the round + allowed-set from the round
# manifest (coordination/NEXT-ROLE.md) instead of hardcoding a frozen SHA in test source.
#
# Usage:
#   scripts/anti-scope-gate.sh --since <round-start-ref> [--round R92.1] [--allow-file path] [--head REF]
#
#   --since   REQUIRED. The round-start git ref (commit/tag) the round branched from.
#   --round   Round id (default: CURRENT-ROUND from coordination/NEXT-ROLE.md).
#   --allow-file  File whose first /^\^\(.*\)\$/ line is the allowed-paths regex
#                 (default: coordination/NEXT-ROLE.md — the round directive carries it).
#   --head    Tip ref to compare (default: HEAD).
#
# Exit: 0 = in scope · 3 = out-of-scope paths found · 64 = usage.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "anti-scope-gate: not a git repo" >&2; exit 64; }
NEXT_ROLE="$ROOT/coordination/NEXT-ROLE.md"

SINCE=""; ROUND=""; ALLOW_FILE="$NEXT_ROLE"; HEAD_REF="HEAD"
while [ $# -gt 0 ]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --round) ROUND="$2"; shift 2 ;;
    --allow-file) ALLOW_FILE="$2"; shift 2 ;;
    --head) HEAD_REF="$2"; shift 2 ;;
    *) echo "anti-scope-gate: unknown arg $1" >&2; exit 64 ;;
  esac
done
[ -n "$SINCE" ] || { echo "usage: anti-scope-gate.sh --since <round-start-ref> [--round R] [--allow-file f] [--head REF]" >&2; exit 64; }

[ -n "$ROUND" ] || ROUND="$(grep -m1 -oE 'CURRENT-ROUND:[[:space:]]*[A-Za-z0-9._-]+' "$NEXT_ROLE" 2>/dev/null | sed -E 's/.*:[[:space:]]*//')"
[ -n "$ROUND" ] || ROUND="(unknown)"

# Allowed-paths regex: first anchored /^(...)$/ line in the allow-file (the round directive's ALLOWED_REGEX).
ALLOWED="$(grep -m1 -oE '\^\([^`]*\)\$' "$ALLOW_FILE" 2>/dev/null | head -1)"
[ -n "$ALLOWED" ] || { echo "anti-scope-gate: no ALLOWED_REGEX (^(...)\$) found in $ALLOW_FILE — declare the round allow-set there" >&2; exit 64; }

if ! git -C "$ROOT" rev-parse --verify -q "$SINCE" >/dev/null; then
  echo "anti-scope-gate: round-start ref '$SINCE' not found" >&2; exit 64
fi

# bash-3.2 (macOS) safe: no mapfile; build arrays via while-read.
CHANGED_COUNT=0
VIOLATORS=()
while IFS= read -r f; do
  [ -n "$f" ] || continue
  CHANGED_COUNT=$((CHANGED_COUNT + 1))
  echo "$f" | grep -qE "$ALLOWED" || VIOLATORS+=("$f")
done < <(git -C "$ROOT" diff "$SINCE" "$HEAD_REF" --name-only)

echo "anti-scope-gate: round $ROUND  ($SINCE..$HEAD_REF, ${CHANGED_COUNT} files changed)"
if [ "${#VIOLATORS[@]}" -gt 0 ]; then
  echo "OUT OF SCOPE — ${#VIOLATORS[@]} path(s) outside the round's declared allowed-set:"
  printf '   %s\n' "${VIOLATORS[@]}"
  echo ">> Either the change belongs in a different round, or extend the ALLOWED_REGEX in coordination/NEXT-ROLE.md deliberately."
  exit 3
fi
echo "PASS: all changed paths are within the round's allowed-set."
