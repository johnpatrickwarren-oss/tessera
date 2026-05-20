#!/usr/bin/env bash
# Q-R72-EMPIRICAL.sh — chore-A empirical verification harness (Rule 1 ACTIVE GATE).
#
# Runs 8 verification blocks; reports PASS/FAIL per block; exits 0 if all PASS, 1 otherwise.
# Implementer runs this BEFORE chore-A commit. Reviewer re-runs at Reviewer HEAD.
#
# Round-start SHA (Architect spec-triad commit; ROUND_START_SHA placeholder is
# replaced by the Implementer via sed at chore-A pre-commit per Q-R72-SPEC.md § 11.1).
# The literal SHA is sourced from the Architect routing block in coordination/NEXT-ROLE.md;
# Implementer MUST NOT use `git rev-parse HEAD` at injection time (would yield the RED
# commit SHA, not the spec-triad SHA; per R70 MINOR-1 reinforcement).

set -u  # nounset; do NOT set -e — we want every block to run for full reporting

ROUND_START_SHA="a5d5ffe"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

pass_count=0
fail_count=0

block_result() {
  local name="$1"
  local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "PASS  Block: $name"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL  Block: $name"
    fail_count=$((fail_count + 1))
  fi
}

# ── Block 1: tsc-exit-0 ──────────────────────────────────────────────────────
tsc_output=$(pnpm exec tsc -p tsconfig.test.json 2>&1)
tsc_exit=$?
if [ $tsc_exit -eq 0 ]; then
  block_result "tsc-exit-0" 1
else
  echo "  tsc exit: $tsc_exit"
  echo "$tsc_output" | head -10
  block_result "tsc-exit-0" 0
fi

# ── Block 2: node-test-fail-count-and-identity ───────────────────────────────
# Run tests; capture TAP output; verify "# fail = 5" appears AND every carry-
# forward AC ID is present in the "not ok" lines (top-level or indented subtests).
test_output=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1)
fail_summary=$(echo "$test_output" | grep -E "^# fail " | head -1)
expected_fail_count=5
fail_ok=1
case "$fail_summary" in
  *"# fail $expected_fail_count"*) ;;
  *) fail_ok=0; echo "  expected '# fail $expected_fail_count'; got '$fail_summary'" ;;
esac
identity_ok=1
for id in AC-R36-21 AC-R36-30 AC-R36-31 AC-R65-2 AC-R66-14; do
  if ! echo "$test_output" | grep -q "not ok.*${id}"; then
    identity_ok=0
    echo "  carry-forward AC missing from 'not ok' lines: $id"
  fi
done
if [ $fail_ok -eq 1 ] && [ $identity_ok -eq 1 ]; then
  block_result "node-test-fail-count-and-identity" 1
else
  block_result "node-test-fail-count-and-identity" 0
fi

# ── Block 3: anti-scope-allowed-set ──────────────────────────────────────────
# All paths in git diff $ROUND_START_SHA..HEAD --name-only must be in ALLOWED_SET
# OR match the DIAGNOSTIC regex carve-out.
diff_paths=$(git diff "$ROUND_START_SHA..HEAD" --name-only 2>&1)
diff_exit=$?
allowed_set=$(cat <<'EOF'
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R72-SPEC.md
coordination/specs/Q-R72-SPEC-AUDIT.md
coordination/specs/Q-R72-EMPIRICAL.sh
coordination/coverage/R72-saturation-matrix.json
coordination/coverage/R72-saturation-matrix.md
package.json
README.md
test/q72-coverage-saturation.test.ts
tools/coverage-saturation.ts
EOF
)
allowed_ok=1
if [ $diff_exit -ne 0 ]; then
  echo "  git diff failed: $diff_paths"
  allowed_ok=0
else
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if echo "$allowed_set" | grep -Fxq "$p"; then
      continue
    fi
    if echo "$p" | grep -Eq '^coordination/diagnostics/DIAGNOSTIC-R72-[a-z0-9-]+\.md$'; then
      continue
    fi
    echo "  unauthorized diff path: $p"
    allowed_ok=0
  done <<< "$diff_paths"
fi
block_result "anti-scope-allowed-set" $allowed_ok

# ── Block 4: no-engine-mods ──────────────────────────────────────────────────
engine_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- 'engine/**' 2>&1)
if [ -z "$engine_diff" ]; then
  block_result "no-engine-mods" 1
else
  echo "  engine/ modifications detected:"
  echo "$engine_diff" | head -10
  block_result "no-engine-mods" 0
fi

# ── Block 5: no-prior-round-spec-mods ────────────────────────────────────────
# R01-R69 spec files frozen; R70 + R71 spec files frozen; only R72 spec triad allowed.
prior_spec_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- \
  'coordination/specs/Q-R0*.md' \
  'coordination/specs/Q-R1*.md' \
  'coordination/specs/Q-R2*.md' \
  'coordination/specs/Q-R3*.md' \
  'coordination/specs/Q-R4*.md' \
  'coordination/specs/Q-R5*.md' \
  'coordination/specs/Q-R6*.md' \
  'coordination/specs/Q-R70-*.md' \
  'coordination/specs/Q-R70-*.sh' \
  'coordination/specs/Q-R71-*.md' \
  'coordination/specs/Q-R71-*.sh' \
  2>&1)
if [ -z "$prior_spec_diff" ]; then
  block_result "no-prior-round-spec-mods" 1
else
  echo "  prior-round spec modifications detected:"
  echo "$prior_spec_diff" | head -10
  block_result "no-prior-round-spec-mods" 0
fi

# ── Block 6: matrix-json-exists-and-parses ───────────────────────────────────
matrix_path="coordination/coverage/R72-saturation-matrix.json"
if [ ! -f "$matrix_path" ]; then
  echo "  $matrix_path does not exist"
  block_result "matrix-json-exists-and-parses" 0
else
  schema_check=$(node -e "
    const fs = require('fs');
    try {
      const m = JSON.parse(fs.readFileSync('$matrix_path', 'utf8'));
      if (m.schema_version !== 'tessera-coverage-v1') {
        console.log('FAIL: schema_version = ' + JSON.stringify(m.schema_version));
        process.exit(1);
      }
      if (m.totals.total_variations !== 120) {
        console.log('FAIL: total_variations = ' + JSON.stringify(m.totals.total_variations));
        process.exit(1);
      }
      console.log('OK');
    } catch (e) {
      console.log('PARSE-FAIL: ' + e.message);
      process.exit(1);
    }
  " 2>&1)
  if [ "$schema_check" = "OK" ]; then
    block_result "matrix-json-exists-and-parses" 1
  else
    echo "  $schema_check"
    block_result "matrix-json-exists-and-parses" 0
  fi
fi

# ── Block 7: package-json-coverage-script ────────────────────────────────────
pkg_check=$(node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const ok1 = p.scripts && p.scripts.coverage === 'node tools/coverage-saturation.js';
  const ok2 = p.scripts && p.scripts['prebuild:coverage'] === 'tsc -p tsconfig.test.json';
  if (ok1 && ok2) { console.log('OK'); }
  else {
    console.log('FAIL: coverage=' + JSON.stringify(p.scripts && p.scripts.coverage) +
                '; prebuild:coverage=' + JSON.stringify(p.scripts && p.scripts['prebuild:coverage']));
    process.exit(1);
  }
" 2>&1)
if [ "$pkg_check" = "OK" ]; then
  block_result "package-json-coverage-script" 1
else
  echo "  $pkg_check"
  block_result "package-json-coverage-script" 0
fi

# ── Block 8: matrix-deterministic ────────────────────────────────────────────
# Snapshot the committed matrix.json bytes; re-run the build tool; verify byte
# equality. The build tool must compile (.ts → .js) first.
if [ ! -f "tools/coverage-saturation.js" ]; then
  # Compile if .js not present
  pnpm exec tsc -p tsconfig.test.json >/dev/null 2>&1
fi
if [ ! -f "tools/coverage-saturation.js" ]; then
  echo "  tools/coverage-saturation.js still missing after tsc"
  block_result "matrix-deterministic" 0
else
  pre_sha=$(shasum -a 256 "$matrix_path" 2>/dev/null | awk '{print $1}')
  node tools/coverage-saturation.js >/dev/null 2>&1
  post_sha=$(shasum -a 256 "$matrix_path" 2>/dev/null | awk '{print $1}')
  if [ -n "$pre_sha" ] && [ "$pre_sha" = "$post_sha" ]; then
    block_result "matrix-deterministic" 1
  else
    echo "  matrix.json SHA mismatch: $pre_sha → $post_sha"
    block_result "matrix-deterministic" 0
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo "PASS: $pass_count / FAIL: $fail_count"
if [ $fail_count -gt 0 ]; then
  exit 1
fi
exit 0
