#!/usr/bin/env bash
# tools/vendor-from-deploysignal.sh
#
# Vendor an engine file from DeploySignal into Tessera with provenance header.
#
# Usage:
#   ./tools/vendor-from-deploysignal.sh <source-relative-path> <target-relative-path> <sync-policy>
#
# Example:
#   ./tools/vendor-from-deploysignal.sh engine/detectors/betting-e-process.ts \
#     engine/detectors/betting-e-process.ts vendored-at-pin
#
# sync-policy: vendored-at-pin | vendored-with-deltas
#
# Environment:
#   DEPLOYSIGNAL_ROOT  — path to deploysignal repo (default: ../deploysignal)
#   PINNED_SHA         — short SHA to embed in headers (default: 5a72371)
#   VENDORED_DATE      — date stamp in headers (default: today YYYY-MM-DD)
#   TESSERA_ROOT       — tessera root (default: dirname of this script/..)
#
# Re-runs are idempotent: if the vendored file already exists with the
# expected header, a re-run produces an identical file (modulo date stamps
# if VENDORED_DATE changes at re-pin time).
#
# Per SCOPING-MEMO-v0.3 § 9 vendoring policy.

set -euo pipefail

TESSERA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYSIGNAL_ROOT="${DEPLOYSIGNAL_ROOT:-${TESSERA_ROOT}/../deploysignal}"
PINNED_SHA="${PINNED_SHA:-5a72371}"
EXTRACT_TARGET="@johnpatrickwarren-oss/deploysignal-engine"
VENDORED_DATE="${VENDORED_DATE:-$(date '+%Y-%m-%d')}"
MANIFEST_FILE="${TESSERA_ROOT}/coordination/VENDORING-MANIFEST.md"

usage() {
  echo "Usage: $0 <source-relative-path> <target-relative-path> <sync-policy>" >&2
  echo "  sync-policy: vendored-at-pin | vendored-with-deltas" >&2
  exit 1
}

[[ $# -lt 3 ]] && usage

source_path="$1"
target_path="$2"
sync_policy="$3"

# Validate sync-policy
case "$sync_policy" in
  vendored-at-pin|vendored-with-deltas) ;;
  *) echo "ERROR: Unknown sync-policy '$sync_policy'" >&2; exit 1 ;;
esac

source_abs="${DEPLOYSIGNAL_ROOT}/${source_path}"
target_abs="${TESSERA_ROOT}/${target_path}"

# Verify source exists
if [[ ! -f "$source_abs" ]]; then
  echo "ERROR: Source file not found: ${source_abs}" >&2
  exit 1
fi

# Sandbox: target must be under engine/ or test/ or tools/ (tools/ added at R06 for baseline curation toolchain vendoring)
case "$target_path" in
  engine/*|test/*|tools/*) ;;
  *) echo "ERROR: Target must be under engine/ or test/ or tools/: ${target_path}" >&2; exit 1 ;;
esac

# Create target directory if needed
mkdir -p "$(dirname "$target_abs")"

# Prepend header + copy source contents
{
  printf '// VENDORED FROM DeploySignal main@%s — %s\n' "$PINNED_SHA" "$VENDORED_DATE"
  printf '// Source: deploysignal/%s\n' "$source_path"
  printf '// Sync policy: %s\n' "$sync_policy"
  printf '// Extract target: %s (Tessera Phase 2 close commitment)\n' "$EXTRACT_TARGET"
  printf '// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points (see SCOPING-MEMO-v0.3 § 9).\n'
  printf '\n'
  cat "$source_abs"
} > "$target_abs"

echo "Vendored: deploysignal/${source_path} → tessera/${target_path} [${sync_policy}]"

# Append manifest row (idempotent: skip if row already present)
if [[ -f "$MANIFEST_FILE" ]] && grep -q "| ${target_path} |" "$MANIFEST_FILE"; then
  : # already in manifest
else
  printf '| %s | %s | %s | %s | %s | |\n' \
    "$target_path" "$source_path" "$PINNED_SHA" "$sync_policy" "$VENDORED_DATE" \
    >> "$MANIFEST_FILE"
fi
