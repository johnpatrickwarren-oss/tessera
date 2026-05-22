#!/usr/bin/env bash
# check-no-execfilesync-spawn.sh — Pre-commit guard for subprocess-spawn pattern in test files.
#
# Scans test/q*.test.ts for execFileSync('node',...) usage, which creates a transitive
# hang risk when the test runner invokes the test file in a worker context and the
# subprocess in turn tries to run node --test.
#
# Approved carve-outs (test files that legitimately use this pattern):
#   q29-k8s-adapter.test.ts       — AC-R29-12: subprocess test-count verification
#   q34-event-conditional-attribution.test.ts — AC-R34-19: subprocess test-count verification
#   q91-engine-package-consumption.test.ts    — AC-R91-7: subpath-export resolution check
#
# Invoked by finalize-round.sh Step 7b (non-blocking WARN). Exit 1 = unapproved violation found.
#
# Replaces: AC-R36-3 (dropped at R93 per Q-R93-SPEC.md § 1 — two ESCALATEs in Phase 5
# crossed the structural-fragility threshold). See coordination/FORWARD-PROTECTION-AC-REGISTRY.md.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR="$PROJECT_ROOT/test"

# Approved carve-outs — files excluded from the pattern scan
APPROVED=(
  "q29-k8s-adapter.test.ts"
  "q34-event-conditional-attribution.test.ts"
  "q91-engine-package-consumption.test.ts"
)

PATTERN="execFileSync"
NODE_ARG_PATTERN="execFileSync[[:space:]]*([[:space:]]*['\"]node['\"]"

VIOLATIONS=()

for f in "$TEST_DIR"/q*.test.ts; do
  basename_f="$(basename "$f")"
  # Skip approved carve-outs
  approved=false
  for carveout in "${APPROVED[@]}"; do
    if [[ "$basename_f" == "$carveout" ]]; then
      approved=true
      break
    fi
  done
  [[ "$approved" == true ]] && continue

  # Check for the spawn pattern
  if grep -qP "execFileSync\s*\(\s*['\"]node['\"]" "$f" 2>/dev/null || \
     grep -qE "execFileSync[[:space:]]*\([[:space:]]*['\"]node['\"]" "$f" 2>/dev/null; then
    VIOLATIONS+=("$basename_f")
  fi
done

if [[ ${#VIOLATIONS[@]} -eq 0 ]]; then
  echo "check-no-execfilesync-spawn: OK (no unapproved subprocess-spawn patterns found)"
  exit 0
else
  echo "WARNING: check-no-execfilesync-spawn: unapproved execFileSync('node',...) found in:"
  for v in "${VIOLATIONS[@]}"; do
    echo "  - $v"
  done
  echo ""
  echo "To add a new approved carve-out, update the APPROVED list in:"
  echo "  scripts/check-no-execfilesync-spawn.sh"
  echo ""
  echo "See: coordination/FORWARD-PROTECTION-AC-REGISTRY.md for context."
  exit 1
fi
