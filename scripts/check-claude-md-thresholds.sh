#!/usr/bin/env bash
# check-claude-md-thresholds.sh — Verify CLAUDE-*.md REINFORCED entry counts are within bounds.
# WARN when count in [30, 40); ERROR (exit 1) when count >= 40.
# Called from scripts/finalize-round.sh Step 7b.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WARN_THRESHOLD=30
ERROR_THRESHOLD=40

any_error=0

for file in "$PROJECT_ROOT"/CLAUDE-*.md; do
  [[ -f "$file" ]] || continue
  basename_file="$(basename "$file")"
  count=$(grep -c '^# REINFORCED' "$file" 2>/dev/null || echo "0")
  if [[ "$count" -ge "$ERROR_THRESHOLD" ]]; then
    echo "ERROR: $basename_file has $count REINFORCED entries (threshold: $ERROR_THRESHOLD — consolidation required)"
    any_error=1
  elif [[ "$count" -ge "$WARN_THRESHOLD" ]]; then
    echo "WARN: $basename_file has $count REINFORCED entries (threshold: $WARN_THRESHOLD — consolidation recommended)"
  fi
done

if [[ "$any_error" -eq 1 ]]; then
  exit 1
fi
exit 0
