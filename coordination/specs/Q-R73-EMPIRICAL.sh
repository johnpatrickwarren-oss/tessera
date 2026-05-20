#!/usr/bin/env bash
# Q-R73-EMPIRICAL.sh — chore-A empirical verification harness (Rule 1 ACTIVE GATE).
#
# Runs 14 verification blocks; reports PASS/FAIL per block; exits 0 if all PASS, 1 otherwise.
# Implementer runs this BEFORE chore-A commit. Reviewer re-runs at Reviewer HEAD.
#
# Round-start SHA (Architect spec-triad commit; ROUND_START_SHA placeholder is replaced
# by the Implementer via sed at chore-A pre-commit per Q-R73-SPEC.md § 5.2). The literal
# SHA is sourced from the Architect routing block in coordination/NEXT-ROLE.md; Implementer
# MUST NOT use `git rev-parse HEAD` at injection time (would yield the RED commit SHA,
# not the spec-triad SHA; per R70 MINOR-1 reinforcement).

set -u  # nounset; do NOT set -e — we want every block to run for full reporting

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
# Confirm the sed substitution happened.
sha_ok=1
case "$ROUND_START_SHA" in
  "<INJECTED-AT-CHORE-A>"|"") sha_ok=0; echo "  ROUND_START_SHA not injected; sed substitution missing" ;;
esac
block_result "round-start-sha-injected" $sha_ok

# ── Block 2: round-start-sha-is-valid-commit ─────────────────────────────────
# Confirm the SHA resolves to a real git object.
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
# Verify TAP summary: # fail = 5 (carry-forward unchanged); # skipped = 3; # pass and # tests
# increased by the same N (the R73 additions). Records observed counts verbatim.
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
# tests > 489 and pass > 481 (R72 baseline plus R73 additions)
tests_count=$(echo "$tests_line" | grep -oE "[0-9]+$" | head -1)
pass_count_obs=$(echo "$pass_line" | grep -oE "[0-9]+$" | head -1)
if [ -n "$tests_count" ] && [ "$tests_count" -le 489 ]; then
  count_ok=0
  echo "  expected tests > 489 (R72 baseline); got $tests_count"
fi
if [ -n "$pass_count_obs" ] && [ "$pass_count_obs" -le 481 ]; then
  count_ok=0
  echo "  expected pass > 481 (R72 baseline); got $pass_count_obs"
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

# ── Block 6: validation-corpus-safety-must-route-full ────────────────────────
# Each of the 5 architectural-decision rounds (R45/R61/R62/R66/R72) MUST route 'full'.
# Load-bearing safety check per directive § 4 + spec § 6 halt condition #4.
safety_ok=1
for round in R45 R61 R62 R66 R72; do
  fixture="scripts/tier-router-fixtures/${round}-directive.md"
  if [ ! -f "$fixture" ]; then
    safety_ok=0
    echo "  fixture missing: $fixture"
    continue
  fi
  router_out=$(node scripts/tier-router.js --directive "$fixture" --mode heuristic 2>&1)
  router_exit=$?
  if [ $router_exit -ne 0 ]; then
    safety_ok=0
    echo "  router exit non-zero for $round; output: $router_out"
    continue
  fi
  tier=$(echo "$router_out" | node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{ try { process.stdout.write(JSON.parse(d).tier); } catch { process.exit(1); } })')
  if [ "$tier" != "full" ]; then
    safety_ok=0
    echo "  $round routed to '$tier' (expected 'full'); raw: $router_out"
  fi
done
block_result "validation-corpus-safety-must-route-full" $safety_ok

# ── Block 7: validation-corpus-not-implementer-only ──────────────────────────
# R49/R50/R51/R55/R60/R63/R64/R68 MUST NOT route 'implementer-only'.
exclusion_ok=1
for round in R49 R50 R51 R55 R60 R63 R64 R68; do
  fixture="scripts/tier-router-fixtures/${round}-directive.md"
  if [ ! -f "$fixture" ]; then
    exclusion_ok=0
    echo "  fixture missing: $fixture"
    continue
  fi
  router_out=$(node scripts/tier-router.js --directive "$fixture" --mode heuristic 2>&1)
  router_exit=$?
  if [ $router_exit -ne 0 ]; then
    exclusion_ok=0
    echo "  router exit non-zero for $round"
    continue
  fi
  tier=$(echo "$router_out" | node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{ try { process.stdout.write(JSON.parse(d).tier); } catch { process.exit(1); } })')
  if [ "$tier" = "implementer-only" ]; then
    exclusion_ok=0
    echo "  $round routed to 'implementer-only' (expected anything else); raw: $router_out"
  fi
done
block_result "validation-corpus-not-implementer-only" $exclusion_ok

# ── Block 8: anti-scope-allowed-set ──────────────────────────────────────────
# All paths in git diff $ROUND_START_SHA..HEAD --name-only must be in ALLOWED_SET
# OR match a regex carve-out.
diff_paths=$(git diff "$ROUND_START_SHA..HEAD" --name-only 2>&1)
diff_exit=$?
allowed_set=$(cat <<'EOF'
scripts/tier-router.ts
scripts/tier-router-validate.ts
scripts/tier-router-criteria.md
scripts/tier-router-fixtures/corpus.json
scripts/tier-router-fixtures/R45-directive.md
scripts/tier-router-fixtures/R49-directive.md
scripts/tier-router-fixtures/R50-directive.md
scripts/tier-router-fixtures/R51-directive.md
scripts/tier-router-fixtures/R55-directive.md
scripts/tier-router-fixtures/R60-directive.md
scripts/tier-router-fixtures/R61-directive.md
scripts/tier-router-fixtures/R62-directive.md
scripts/tier-router-fixtures/R63-directive.md
scripts/tier-router-fixtures/R64-directive.md
scripts/tier-router-fixtures/R66-directive.md
scripts/tier-router-fixtures/R68-directive.md
scripts/tier-router-fixtures/R72-directive.md
test/q73-tier-router.test.ts
package.json
run-pipeline.sh
tsconfig.test.json
CLAUDE-COORDINATOR.md
coordination/specs/Q-R73-SPEC.md
coordination/specs/Q-R73-SPEC-AUDIT.md
coordination/specs/Q-R73-EMPIRICAL.sh
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
    # Regex carve-outs
    case "$p" in
      coordination/diagnostics/DIAGNOSTIC-R73-*.md) continue ;;
      coordination/reviews/REVIEWER-REPORT-R73.md) continue ;;
      coordination/logs/ROUND-R73-ROUTING.md) continue ;;
    esac
    allowed_ok=0
    echo "  unauthorized path in diff: $p"
  done <<EOF
$diff_paths
EOF
fi
block_result "anti-scope-allowed-set" $allowed_ok

# ── Block 9: no-engine-or-demos-modifications ────────────────────────────────
engine_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- engine/ demos/ tools/coverage-saturation.ts tools/build-canned-demos.ts tools/demo-scenario.ts 2>&1)
if [ -z "$engine_diff" ]; then
  block_result "no-engine-or-demos-modifications" 1
else
  echo "  unauthorized engine/demos/tools modifications:"
  echo "$engine_diff" | sed 's/^/    /'
  block_result "no-engine-or-demos-modifications" 0
fi

# ── Block 10: no-reinforcements-modifications ────────────────────────────────
# CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER,MEMORIAL}.md REINFORCED-line counts
# must be unchanged at HEAD vs $ROUND_START_SHA.
reinforce_ok=1
for f in CLAUDE-ARCHITECT.md CLAUDE-IMPLEMENTER.md CLAUDE-REVIEWER.md CLAUDE-MEMORIAL.md; do
  old_count=$(git show "$ROUND_START_SHA:$f" 2>/dev/null | grep -c "^# REINFORCED" || true)
  new_count=$(grep -c "^# REINFORCED" "$f" 2>/dev/null || true)
  if [ "$old_count" != "$new_count" ]; then
    reinforce_ok=0
    echo "  $f REINFORCED count drift: $old_count -> $new_count"
  fi
done
# CLAUDE-COORDINATOR.md MAY be modified for --auto-tier Mode docs but MUST NOT
# add a # REINFORCED line.
coord_old=$(git show "$ROUND_START_SHA:CLAUDE-COORDINATOR.md" 2>/dev/null | grep -c "^# REINFORCED" || true)
coord_new=$(grep -c "^# REINFORCED" CLAUDE-COORDINATOR.md 2>/dev/null || true)
if [ "$coord_old" != "$coord_new" ]; then
  reinforce_ok=0
  echo "  CLAUDE-COORDINATOR.md REINFORCED count drift: $coord_old -> $coord_new"
fi
block_result "no-reinforcements-modifications" $reinforce_ok

# ── Block 11: no-prior-spec-modifications ────────────────────────────────────
prior_specs_diff=$(git diff "$ROUND_START_SHA..HEAD" --name-only -- 'coordination/specs/Q-R*-SPEC.md' 'coordination/specs/Q-R*-SPEC-AUDIT.md' 'coordination/specs/Q-R*-EMPIRICAL.sh' 2>&1 | grep -v "Q-R73-" || true)
if [ -z "$prior_specs_diff" ]; then
  block_result "no-prior-spec-modifications" 1
else
  echo "  unauthorized prior-spec modifications:"
  echo "$prior_specs_diff" | sed 's/^/    /'
  block_result "no-prior-spec-modifications" 0
fi

# ── Block 12: tier-router-cli-shape ──────────────────────────────────────────
# Confirm router emits valid JSON with all expected fields on a heuristic-mode call.
shape_ok=1
sample_out=$(node scripts/tier-router.js --directive scripts/tier-router-fixtures/R72-directive.md --mode heuristic 2>&1)
sample_exit=$?
if [ $sample_exit -ne 0 ]; then
  shape_ok=0
  echo "  router exit non-zero: $sample_exit"
  echo "  stdout: $sample_out"
else
  for field in round tier confidence rationale decision_path router_version mode; do
    if ! echo "$sample_out" | grep -q "\"$field\""; then
      shape_ok=0
      echo "  router output missing field: $field"
    fi
  done
fi
block_result "tier-router-cli-shape" $shape_ok

# ── Block 13: tier-router-validate-script-end-to-end ─────────────────────────
# pnpm tier-router:validate must exit 0 and produce an accuracy-matrix table.
validate_out=$(pnpm exec node scripts/tier-router-validate.js 2>&1)
validate_exit=$?
if [ $validate_exit -eq 0 ] && echo "$validate_out" | grep -qE "^\| Round \| Expected \| Actual \| Pass \|" && ! echo "$validate_out" | grep -qE "\| ✗ \|"; then
  block_result "tier-router-validate-script-end-to-end" 1
else
  echo "  validate exit: $validate_exit"
  echo "$validate_out" | head -25 | sed 's/^/    /'
  block_result "tier-router-validate-script-end-to-end" 0
fi

# ── Block 14: tier-router-self-classification-r73 ────────────────────────────
# The R73 directive section in coordination/NEXT-ROLE.md should route 'full'.
# Rule 2 anchors that fire: ESCALATE, engine/, validation-corpus failure, --tier full.
self_out=$(pnpm exec node scripts/tier-router.js --directive coordination/NEXT-ROLE.md --mode heuristic 2>&1)
self_exit=$?
if [ $self_exit -eq 0 ]; then
  self_tier=$(echo "$self_out" | node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{ try { process.stdout.write(JSON.parse(d).tier); } catch { process.exit(1); } })')
  if [ "$self_tier" = "full" ]; then
    block_result "tier-router-self-classification-r73" 1
  else
    echo "  R73 self-classification tier: '$self_tier' (expected 'full'); raw: $self_out"
    block_result "tier-router-self-classification-r73" 0
  fi
else
  echo "  router exit non-zero on NEXT-ROLE.md: $self_exit"
  block_result "tier-router-self-classification-r73" 0
fi

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
