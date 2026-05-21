#!/usr/bin/env bash
# Q-R74-EMPIRICAL.sh — chore-A empirical verification harness (Rule 1 ACTIVE GATE).
#
# Runs 17 verification blocks; reports PASS/FAIL per block; exits 0 if all PASS, 1 otherwise.
# Implementer runs this BEFORE chore-A commit. Reviewer re-runs at Reviewer HEAD.
#
# Round-start SHA: ROUND_START_SHA placeholder is replaced by the Implementer via sed
# at chore-A pre-commit per Q-R74-SPEC.md § 5.2. The literal SHA is sourced from the
# Architect routing block in coordination/NEXT-ROLE.md; Implementer MUST NOT use
# `git rev-parse HEAD` at injection time (would yield the RED commit SHA, not the
# spec-triad SHA; per CLAUDE-COMMON.md REINFORCED 2026-05-18 / R70 MINOR-1).

set -u  # nounset; do NOT set -e — every block runs for full reporting

ROUND_START_SHA="<INJECTED-AT-CHORE-A>"

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

# ── Block 1: round-start-sha-injected ────────────────────────────────────────
# Confirm the sed substitution happened (SHA must be non-empty and free of < > chars).
sha_ok=1
if [[ -z "$ROUND_START_SHA" || "$ROUND_START_SHA" == *'<'* || "$ROUND_START_SHA" == *'>'* ]]; then
  sha_ok=0
  echo "  ROUND_START_SHA not injected; sed substitution missing"
fi
block_result "round-start-sha-injected" $sha_ok

# ── Block 2: round-start-sha-is-valid-commit ─────────────────────────────────
if [ $sha_ok -eq 1 ]; then
  if git cat-file -e "$ROUND_START_SHA^{commit}" 2>/dev/null; then
    block_result "round-start-sha-valid-commit" 1
  else
    echo "  $ROUND_START_SHA is not a valid commit"
    block_result "round-start-sha-valid-commit" 0
  fi
else
  block_result "round-start-sha-valid-commit" 0
fi

# ── Block 3: tsc-exit-0 ──────────────────────────────────────────────────────
tsc_output=$(pnpm exec tsc -p tsconfig.test.json 2>&1)
tsc_exit=$?
if [ $tsc_exit -eq 0 ]; then
  block_result "tsc-exit-0" 1
else
  echo "  tsc exit: $tsc_exit"
  echo "$tsc_output" | head -10
  block_result "tsc-exit-0" 0
fi

# ── Block 4: node-test-pass-fail-counts ──────────────────────────────────────
# Verify TAP summary: # fail = 5 (carry-forward unchanged); # skipped = 3; # tests and # pass
# increased above R73 close baseline (516/508). Records observed counts verbatim.
test_output=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1)
tests_line=$(echo "$test_output" | grep -E "^# tests " | head -1)
pass_line=$(echo "$test_output" | grep -E "^# pass " | head -1)
fail_line=$(echo "$test_output" | grep -E "^# fail " | head -1)
skipped_line=$(echo "$test_output" | grep -E "^# skipped " | head -1)
echo "  observed: $tests_line"
echo "  observed: $pass_line"
echo "  observed: $fail_line"
echo "  observed: $skipped_line"
count_ok=1
case "$fail_line" in
  *"# fail 5"*) ;;
  *) count_ok=0; echo "  expected '# fail 5'; got '$fail_line'" ;;
esac
case "$skipped_line" in
  *"# skipped 3"*) ;;
  *) count_ok=0; echo "  expected '# skipped 3'; got '$skipped_line'" ;;
esac
tests_count=$(echo "$tests_line" | grep -oE "[0-9]+$" | head -1)
pass_count_obs=$(echo "$pass_line" | grep -oE "[0-9]+$" | head -1)
if [ -n "$tests_count" ] && [ "$tests_count" -le 516 ]; then
  count_ok=0
  echo "  expected tests > 516 (R73 baseline); got $tests_count"
fi
if [ -n "$pass_count_obs" ] && [ "$pass_count_obs" -le 508 ]; then
  count_ok=0
  echo "  expected pass > 508 (R73 baseline); got $pass_count_obs"
fi
block_result "node-test-pass-fail-counts" $count_ok

# ── Block 5: carry-forward-fail-identities ───────────────────────────────────
identity_ok=1
for id in AC-R36-21 AC-R36-30 AC-R36-31 AC-R65-2 AC-R66-14; do
  if ! echo "$test_output" | grep -q "not ok.*${id}"; then
    identity_ok=0
    echo "  carry-forward AC missing from 'not ok' lines: $id"
  fi
done
block_result "carry-forward-fail-identities" $identity_ok

# ── Block 6: mu-select-F1-default-haiku ──────────────────────────────────────
# F1 (full-tier, no anchor) → haiku.
f1_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F1-default-haiku.md --tier full 2>&1)
f1_exit=$?
f1_ok=1
if [ $f1_exit -ne 0 ]; then
  f1_ok=0; echo "  mu-select exit non-zero for F1: $f1_exit; out: $f1_out"
elif ! echo "$f1_out" | grep -q '"model":"claude-haiku-4-5-20251001"'; then
  f1_ok=0; echo "  F1 expected haiku model; got: $f1_out"
fi
block_result "mu-select-F1-default-haiku" $f1_ok

# ── Block 7: mu-select-F2-class-A-promotion ──────────────────────────────────
f2_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F2-class-A-promotion.md --tier full 2>&1)
f2_exit=$?
f2_ok=1
if [ $f2_exit -ne 0 ]; then
  f2_ok=0; echo "  mu-select exit non-zero for F2: $f2_exit; out: $f2_out"
elif ! echo "$f2_out" | grep -q '"model":"claude-sonnet-4-6"'; then
  f2_ok=0; echo "  F2 expected sonnet model; got: $f2_out"
elif ! echo "$f2_out" | grep -q '"class_A"'; then
  f2_ok=0; echo "  F2 expected class_A in decision_path; got: $f2_out"
fi
block_result "mu-select-F2-class-A-promotion" $f2_ok

# ── Block 8: mu-select-F3-class-B-batch ──────────────────────────────────────
f3_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F3-class-B-batch.md --tier full 2>&1)
f3_exit=$?
f3_ok=1
if [ $f3_exit -ne 0 ]; then
  f3_ok=0; echo "  mu-select exit non-zero for F3: $f3_exit; out: $f3_out"
elif ! echo "$f3_out" | grep -q '"model":"claude-sonnet-4-6"'; then
  f3_ok=0; echo "  F3 expected sonnet; got: $f3_out"
elif ! echo "$f3_out" | grep -q '"class_B"'; then
  f3_ok=0; echo "  F3 expected class_B; got: $f3_out"
fi
block_result "mu-select-F3-class-B-batch" $f3_ok

# ── Block 9: mu-select-F4-class-C-reviewer2 ──────────────────────────────────
f4_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F4-class-C-reviewer2.md --tier full 2>&1)
f4_exit=$?
f4_ok=1
if [ $f4_exit -ne 0 ]; then
  f4_ok=0; echo "  mu-select exit non-zero for F4: $f4_exit; out: $f4_out"
elif ! echo "$f4_out" | grep -q '"model":"claude-sonnet-4-6"'; then
  f4_ok=0; echo "  F4 expected sonnet; got: $f4_out"
elif ! echo "$f4_out" | grep -q '"class_C"'; then
  f4_ok=0; echo "  F4 expected class_C; got: $f4_out"
fi
block_result "mu-select-F4-class-C-reviewer2" $f4_ok

# ── Block 10: mu-select-F5-class-D-option ────────────────────────────────────
f5_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F5-class-D-option.md --tier full 2>&1)
f5_exit=$?
f5_ok=1
if [ $f5_exit -ne 0 ]; then
  f5_ok=0; echo "  mu-select exit non-zero for F5: $f5_exit; out: $f5_out"
elif ! echo "$f5_out" | grep -q '"model":"claude-sonnet-4-6"'; then
  f5_ok=0; echo "  F5 expected sonnet; got: $f5_out"
elif ! echo "$f5_out" | grep -q '"class_D"'; then
  f5_ok=0; echo "  F5 expected class_D; got: $f5_out"
fi
block_result "mu-select-F5-class-D-option" $f5_ok

# ── Block 11: mu-select-F6-audit-no-anchor ───────────────────────────────────
# Audit-tier without anchor → haiku (anchor check NOT applied on audit).
f6_out=$(node scripts/mu-model-select.js --directive scripts/mu-model-select-fixtures/F6-audit-no-anchor.md --tier audit 2>&1)
f6_exit=$?
f6_ok=1
if [ $f6_exit -ne 0 ]; then
  f6_ok=0; echo "  mu-select exit non-zero for F6: $f6_exit; out: $f6_out"
elif ! echo "$f6_out" | grep -q '"model":"claude-haiku-4-5-20251001"'; then
  f6_ok=0; echo "  F6 expected haiku (audit tier no anchor); got: $f6_out"
fi
block_result "mu-select-F6-audit-no-anchor" $f6_ok

# ── Block 12: anti-scope-allowed-set ─────────────────────────────────────────
# All paths in git diff $ROUND_START_SHA..HEAD --name-only must be in ALLOWED_SET
# OR match a regex carve-out. Set MUST byte-equal Q-R74-SPEC.md § 5.1.
diff_paths=$(git diff "$ROUND_START_SHA..HEAD" --name-only 2>&1)
diff_exit=$?
allowed_set=$(cat <<'EOF'
scripts/mu-model-select.ts
scripts/mu-model-select-fixtures/corpus.json
scripts/mu-model-select-fixtures/F1-default-haiku.md
scripts/mu-model-select-fixtures/F2-class-A-promotion.md
scripts/mu-model-select-fixtures/F3-class-B-batch.md
scripts/mu-model-select-fixtures/F4-class-C-reviewer2.md
scripts/mu-model-select-fixtures/F5-class-D-option.md
scripts/mu-model-select-fixtures/F6-audit-no-anchor.md
test/q74-mu-haiku-reviewer-scope.test.ts
package.json
run-pipeline.sh
CLAUDE-REVIEWER.md
coordination/specs/Q-R74-SPEC.md
coordination/specs/Q-R74-SPEC-AUDIT.md
coordination/specs/Q-R74-EMPIRICAL.sh
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
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
    case "$p" in
      coordination/diagnostics/DIAGNOSTIC-R74-*.md) continue ;;
      coordination/reviews/REVIEWER-REPORT-R74.md) continue ;;
      coordination/logs/ROUND-R74-ROUTING.md) continue ;;
    esac
    allowed_ok=0
    echo "  unauthorized path in diff: $p"
  done <<EOF
$diff_paths
EOF
fi
block_result "anti-scope-allowed-set" $allowed_ok

# ── Block 13: no-engine-or-demos-or-tier-router-modifications ────────────────
hard_freeze_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- \
  engine/ demos/ \
  tools/coverage-saturation.ts tools/build-canned-demos.ts tools/demo-scenario.ts \
  scripts/tier-router.ts scripts/tier-router-validate.ts scripts/tier-router-criteria.md \
  'scripts/tier-router-fixtures/' 2>&1)
if [ -z "$hard_freeze_diff" ]; then
  block_result "no-engine-or-demos-or-tier-router-modifications" 1
else
  echo "  unauthorized hard-freeze modifications:"
  echo "$hard_freeze_diff" | sed 's/^/    /'
  block_result "no-engine-or-demos-or-tier-router-modifications" 0
fi

# ── Block 14: no-reinforcements-modifications ────────────────────────────────
# CLAUDE-{ARCHITECT,IMPLEMENTER,MEMORIAL,COMMON,COORDINATOR}.md REINFORCED line counts
# must be unchanged at HEAD vs $ROUND_START_SHA.
# CLAUDE-REVIEWER.md REINFORCED line count must remain 3 (no REINFORCED additions; Mode
# docs section is NOT a # REINFORCED line per directive).
reinforce_ok=1
for f in CLAUDE-ARCHITECT.md CLAUDE-IMPLEMENTER.md CLAUDE-MEMORIAL.md CLAUDE-COMMON.md CLAUDE-COORDINATOR.md CLAUDE-REVIEWER.md; do
  old_count=$(git show "$ROUND_START_SHA:$f" 2>/dev/null | grep -c "^# REINFORCED" || true)
  new_count=$(grep -c "^# REINFORCED" "$f" 2>/dev/null || true)
  if [ "$old_count" != "$new_count" ]; then
    reinforce_ok=0
    echo "  $f REINFORCED count drift: $old_count -> $new_count"
  fi
done
block_result "no-reinforcements-modifications" $reinforce_ok

# ── Block 15: no-prior-spec-modifications ────────────────────────────────────
prior_specs_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- \
  'coordination/specs/Q-R*-SPEC.md' \
  'coordination/specs/Q-R*-SPEC-AUDIT.md' \
  'coordination/specs/Q-R*-EMPIRICAL.sh' 2>&1 | grep -v "Q-R74-" || true)
if [ -z "$prior_specs_diff" ]; then
  block_result "no-prior-spec-modifications" 1
else
  echo "  unauthorized prior-spec modifications:"
  echo "$prior_specs_diff" | sed 's/^/    /'
  block_result "no-prior-spec-modifications" 0
fi

# ── Block 16: r73-anti-regression-tier-router-validate ───────────────────────
# pnpm tier-router:validate must exit 0 (R73 safety set preserved).
validate_out=$(pnpm exec node scripts/tier-router-validate.js 2>&1)
validate_exit=$?
if [ $validate_exit -eq 0 ]; then
  block_result "r73-anti-regression-tier-router-validate" 1
else
  echo "  tier-router-validate exit: $validate_exit"
  echo "$validate_out" | head -25 | sed 's/^/    /'
  block_result "r73-anti-regression-tier-router-validate" 0
fi

# ── Block 17: mu-select-self-classification-r74 ──────────────────────────────
# Run mu-model-select against R74's own directive section. Exit must be 0; model
# must be one of the three valid values; the OBSERVED value is recorded verbatim
# (per Rule 1; the AC binds the empirical output, NOT a predicted literal).
self_out=$(node scripts/mu-model-select.js --directive coordination/NEXT-ROLE.md --tier full 2>&1)
self_exit=$?
self_ok=1
if [ $self_exit -ne 0 ]; then
  self_ok=0
  echo "  self-classification exit non-zero: $self_exit; out: $self_out"
else
  if ! echo "$self_out" | grep -qE '"model":"(claude-haiku-4-5-20251001|claude-sonnet-4-6|n/a)"'; then
    self_ok=0
    echo "  self-classification emitted invalid model value: $self_out"
  else
    observed_model=$(echo "$self_out" | node -e \
      "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try{console.log(JSON.parse(d).model)}catch{} })" 2>/dev/null || echo "<parse-failed>")
    echo "  observed R74 self-classification model: $observed_model"
  fi
fi
block_result "mu-select-self-classification-r74" $self_ok

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────"
echo "PASS: $pass_count  /  FAIL: $fail_count"
echo "─────────────────────────────────────────"

if [ $fail_count -eq 0 ]; then
  exit 0
else
  exit 1
fi
