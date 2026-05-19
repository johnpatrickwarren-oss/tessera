# Q-R47-SPEC — Tighten Rule 1 Sub-Class Verifier (Close R46 MAJOR Loop)

**Round:** R47
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Operator-directed follow-up to R46 chain close. R46 Reviewer surfaced 3 MAJOR Rule 1 sub-class violations in R46's own verifier (the round deriving the sub-class violated it). R47 closes the loop before future rounds inherit the holes. Memorial-Updater explicit flag #4 ("R47 candidate: Q-R46-EMPIRICAL.sh weak-binding tighten").

---

## § 1. Goal

Tighten the Rule 1 sub-class `empirical-command-attestation` verifier authoring pattern by documenting + self-applying 3 structural fixes. R46 Reviewer surfaced these 3 MAJOR findings as instances of the sub-class violating itself at the derivation round:

- **R46 MAJOR-1** (AC-R46-6 self-confirming PASS): the meta-AC "this file exits 0" hard-coded PASS and let the aggregate exit code be the real binding. Meta-ACs that assert "the aggregate state is correct" are vacuous — the aggregate IS the test; making it an AC of itself is structurally circular.
- **R46 MAJOR-2** (round-start SHA drift + diff-count conflation): NEXT-ROLE.md cited pre-R46 HEAD as `439c1ff` (was `7bc026f` after R42-R45 Reviewer batch landed); 7-file count conflated `<pre>..<chore-A>` (6 files) with `<pre>..<HEAD-backfill>` (7 files). Memorized values rather than re-derived from `git diff` at attestation time.
- **R46 MAJOR-3** (source-grep vs stdout-grep): AC-R46-10 verifier binds source-grep against `scripts/pre-commit-rule-sweep.sh` for the label "MECHANICAL CHECK via sub-class verifier"; AC text says "rule_1_check mechanical mode active." A function can contain the label in its source yet be disabled, short-circuited, or never invoked at runtime. Source-grep is insufficient for "runtime behavior active" claims.

Plus a secondary R46 Reviewer flag worth addressing:
- **Weak `≥ 1` grep-threshold AC sub-pattern**: multiple R46 ACs used `grep -c ... ≥ 1` — too permissive; any incidental occurrence passes. Prefer exact counts where structural meaning supports it.

R47 publishes the tightened authoring pattern in SPEC-AUTHORING-CHECKLIST.md and self-applies it to R47's own ACs via Q-R47-EMPIRICAL.sh.

**Scope note:** R47 does NOT retroactively edit Q-R46-EMPIRICAL.sh. R46's deliverables remain as historical baseline; the R46 Reviewer report + R46 MEMORIAL-UPDATER VIOLATION entries document the failures. R47 is forward-looking: tightens the pattern; binds R47+ rounds.

---

## § 2. Brainstorm

**Option A — Update SPEC-AUTHORING-CHECKLIST.md + self-apply to Q-R47-EMPIRICAL.sh (SELECTED):** Document the 3 tightening patterns; demonstrate them in R47's own verifier; preserve R46 as historical baseline.
- Strengths: bounded scope (~1 round); structural fix to authoring pattern; self-application via Rule 7 Surface (c); doesn't perturb R46 (Reviewer report + MEMORIAL VIOLATION entries already document the failures); pattern lands for R48+ rounds.
- Weaknesses: Q-R46-EMPIRICAL.sh's specific bugs remain present (but inert — R46 already shipped; no future invocation re-runs them as load-bearing).
- Constraint match: addresses Memorial-Updater operator-decision flag #4 directly; closes Rule 1 sub-class loop before R48+ rounds inherit holes.

**Option B — Update SPEC-AUTHORING-CHECKLIST.md + retroactively patch Q-R46-EMPIRICAL.sh:** Same as A plus retroactive fix.
- Strengths: cleans the historical record; verifier on file is correct.
- Weaknesses: retroactively modifying R46 deliverables conflicts with R46's own anti-scope (R47 anti-scope shouldn't reach back into R46's files); creates audit-trail confusion (which version of Q-R46-EMPIRICAL.sh did Reviewer audit?); Reviewer's findings already documented the issues — patching them silently rewrites history.
- Rejected: audit-trail integrity > cleanliness.

**Option C — Just update SPEC-AUTHORING-CHECKLIST.md (no R47 verifier):** Document but don't self-apply.
- Strengths: even smaller scope.
- Weaknesses: violates Rule 7 Surface (c) — a round that derives/extends a discipline pattern must self-apply it. R47 IS extending the Rule 1 sub-class authoring pattern; same-round self-application is mandated.
- Rejected: Rule 7 Surface (c) discipline applies.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Tightening 1 — Avoid vacuous meta-ACs

**Anti-pattern (R46 AC-R46-6):**
```bash
echo "AC-R46-6: self-application — this file exits 0 (verified by harness aggregate)"
echo "  PASS — AC-R46-6 (asserted by aggregate exit code below)"
PASS=$((PASS + 1))
```
The AC asserts a property (file exits 0) that IS the aggregate of all other ACs. Hard-coding PASS makes the AC vacuous; the real binding is the aggregate exit code, which would happen anyway.

**Tightened pattern:** Eliminate the meta-AC. The aggregate exit code IS the empirical-AC harness's binding; making it an AC of itself is structurally circular. If "self-application demonstration" is desired as a spec deliverable, make it a SUBSTANTIVE check: e.g., "AC-R<N>-K: Q-R<N>-EMPIRICAL.sh syntax-validates via `bash -n` exit 0" — a concrete, non-circular property.

### 3.2 Tightening 2 — Verify runtime behavior, not source presence

**Anti-pattern (R46 AC-R46-10):**
```bash
ACTUAL=$(grep -c 'MECHANICAL CHECK via sub-class verifier' scripts/pre-commit-rule-sweep.sh)
```
Greps the SOURCE for a label. Passes even if the function containing the label is disabled, short-circuited, or never invoked at runtime.

**Tightened pattern:** For "runtime behavior active" claims, INVOKE the code path and grep its STDOUT. Example:
```bash
ACTUAL=$(scripts/pre-commit-rule-sweep.sh <SHA1> <SHA2> 2>&1 | grep -c 'MECHANICAL CHECK via sub-class verifier')
```
This confirms the label appears in actual output — proof the function ran. The check is structurally stronger because any change that disables the function (early return, conditional skip) will cause the stdout-grep to fail.

### 3.3 Tightening 3 — Re-derive SHAs from git at citation time

**Anti-pattern (R46 NEXT-ROLE.md):**
- Cited "pre-R46 SHA = 439c1ff" — was `7bc026f` after Reviewer batch landed between R45 and R46.
- Cited "diff = 7 files" — was 6 files for `<pre-R46>..<R46-chore-A>`; 7 includes the SHA-backfill commit.

Both values were memorized from prior session state, not re-derived from `git` at the moment of citation.

**Tightened pattern:** Every SHA + diff-count cited in a spec or attestation MUST come with the `git` command that derived it. The command runs at citation time. The convention for Q-R<N>-EMPIRICAL.sh:
```bash
# Re-derive round boundaries from git, do not memorize:
ROUND_START_SHA=$(git rev-parse "$1" 2>/dev/null || echo "")   # arg or current HEAD~N
CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
DIFF_FILES=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" | wc -l | tr -d ' ')
```
Attestation cites the actual command + actual output, not memorized values from spec text.

### 3.4 Tightening 4 — Prefer exact counts over `≥ 1` thresholds

**Anti-pattern:**
```bash
ACTUAL=$(grep -c '...' file)
if [ "$ACTUAL" -ge 1 ]; then PASS ...
```

The threshold passes on any non-zero count. Incidental matches (e.g., prose mentioning the token) silently pass.

**Tightened pattern:** Where structural meaning supports it, use exact count. If exact count is sensitive to formatting drift, use line-anchored grep + exact count:
```bash
ACTUAL=$(grep -c '^canonical_marker_at_line_start' file)
assert_eq "AC-R<N>-K" "expected_count" "$ACTUAL"
```

### 3.5 SPEC-AUTHORING-CHECKLIST.md updates

Add 3 new sub-sections inside the existing "Empirical-AC discipline (Rule 1 sub-class — landed R46)" section, immediately after the "Author-time requirements" sub-section:

- "Tightening: Avoid vacuous meta-ACs (R47)"
- "Tightening: Verify runtime behavior, not source presence (R47)"
- "Tightening: Re-derive SHAs from git at citation time (R47)"

Each sub-section contains: short rule + anti-pattern example + tightened pattern example + brief rationale citing R46 Reviewer finding.

### 3.6 Q-R47-EMPIRICAL.sh self-application

R47's own empirical verifier applies all 4 tightenings:
- No vacuous meta-ACs (skip the "self-application demonstration" pattern; the aggregate exit code is the binding).
- All "runtime behavior" ACs use stdout-grep (not source-grep).
- Round-start SHA + diff count are re-derived via `git rev-parse` / `git diff --name-only` at script invocation time.
- Use exact counts where possible.

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R47-SPEC.md` | Created | This file |
| `coordination/specs/Q-R47-EMPIRICAL.sh` | Created | R47 verifier; self-applies tightened patterns |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | Modified | 3 new tightening sub-sections inside § Empirical-AC discipline |
| `coordination/MEMORIAL.md` | Modified | R47 IMPLEMENTER entry appended |
| `coordination/NEXT-ROLE.md` | Modified | R47 routing |

Not modified: engine/*, test/*, tools/*, scripts/* (the harness scripts are structurally sound; tightening applies to per-round authoring pattern, not harness), CLAUDE-*.md (R43 consolidation preserved + R46 MU appends finalized at chain close), MEMORIAL-PHASE-*.md (R42 frozen shards), ~/.claude/CROSS-PROJECT-MEMORIAL.md (Tessera-internal landing; cross-project deferred per Rule 7), coordination/specs/Q-R46-* (R46 deliverables preserved as historical baseline — anti-scope explicit).

---

## § 5. Acceptance criteria

All ACs have empirical verification in `coordination/specs/Q-R47-EMPIRICAL.sh` (self-application of tightened sub-class).

**AC-R47-1 (Q-R47-EMPIRICAL.sh exists + executable + syntax-valid):**
Verification: `[ -x coordination/specs/Q-R47-EMPIRICAL.sh ] && bash -n coordination/specs/Q-R47-EMPIRICAL.sh` exits 0.

**AC-R47-2 (Tightening 1 sub-section — vacuous meta-AC anti-pattern documented):**
Verification: line-anchored grep — `grep -cE '^### Tightening: Avoid vacuous meta-ACs' coordination/SPEC-AUTHORING-CHECKLIST.md` == 1.

**AC-R47-3 (Tightening 2 sub-section — runtime behavior vs source presence):**
Verification: `grep -cE '^### Tightening: Verify runtime behavior' coordination/SPEC-AUTHORING-CHECKLIST.md` == 1.

**AC-R47-4 (Tightening 3 sub-section — SHA re-derive discipline):**
Verification: `grep -cE '^### Tightening: Re-derive SHAs from git' coordination/SPEC-AUTHORING-CHECKLIST.md` == 1.

**AC-R47-5 (R47 verifier uses stdout-grep for runtime-behavior checks — not source-grep):**
Verification: Q-R47-EMPIRICAL.sh contains AT LEAST one block that pipes `scripts/...sh ... 2>&1` into `grep` (vs grepping the script's source file). Verification command: `grep -cE 'scripts/.*\.sh [^|]+\| *grep' coordination/specs/Q-R47-EMPIRICAL.sh` >= 1.

**AC-R47-6 (R47 verifier re-derives SHAs/diff-counts from git at runtime — not memorized):**
Verification: Q-R47-EMPIRICAL.sh contains `git rev-parse` OR `git diff --name-only` invocations for SHA/count derivation. Verification: `grep -cE 'git (rev-parse|diff --name-only|diff --name-status)' coordination/specs/Q-R47-EMPIRICAL.sh` >= 2.

**AC-R47-7 (R47 verifier has no vacuous meta-ACs — no hard-coded PASS without verification logic):**
Verification: Q-R47-EMPIRICAL.sh does NOT contain the anti-pattern `PASS — AC-R47-N (asserted by aggregate`. Verification: `grep -c 'asserted by aggregate' coordination/specs/Q-R47-EMPIRICAL.sh` == 0.

**AC-R47-8 (R47 anti-scope ALLOWED_SET):**
ALLOWED_SET = `coordination/specs/Q-R47-SPEC.md`, `coordination/specs/Q-R47-EMPIRICAL.sh`, `coordination/SPEC-AUTHORING-CHECKLIST.md`, `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, plus regex carve-outs for `coordination/reviews/REVIEWER-REPORT-R47.md` + `coordination/diagnostics/DIAGNOSTIC-R47-*.md`.
Verification: `git diff --name-only 1049a52 HEAD` returns only paths in ALLOWED_SET.

**AC-R47-9 (test baseline preserved):**
Verification: `node --test --test-reporter=tap test/*.test.js` reports `tests 361`, `pass 356`, `fail 2`, `skipped 3`. `npx tsc -p tsconfig.test.json` exits 0.

**AC-R47-10 (self-application — Q-R47-EMPIRICAL.sh exits 0 via the harness):**
Verification: `scripts/verify-empirical-acs.sh R47` exits 0.

---

## § 6. Anti-scope

- NO modification of `coordination/specs/Q-R46-SPEC.md` or `coordination/specs/Q-R46-EMPIRICAL.sh` (R46 historical baseline preserved; failures documented in R46 Reviewer report + MEMORIAL entries — do NOT silently rewrite history).
- NO modification of `engine/*`, `test/*`, `tools/*`, `scripts/*` (harness scripts structurally sound; tightening targets authoring pattern only).
- NO modification of `CLAUDE-*.md` files (R43 consolidation + R46 MU appends finalized; do not accrete).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Tessera-internal tightening; cross-project canonical landing deferred per Rule 7 anchor-canonical-landing-deferred discipline).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`.
- NO new round chain (this is a single focused fix-round, not a chain extension).
- NO Phase 3 territory.

---

## § 7. Apply all 7 cross-project rules UPFRONT

(Per R44 SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate directive.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — every AC verified via Q-R47-EMPIRICAL.sh per the sub-class. R47's own ACs apply the tightened patterns (stdout-grep, SHA-rederive, no vacuous meta-ACs, exact counts where possible).
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — methodology round; no production-code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated at AC-R47-8 at spec-emit time.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R47 extends the Rule 1 sub-class authoring pattern; same-round self-application via Q-R47-EMPIRICAL.sh.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** N/A — no halt conditions anticipated.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (c) — R47 extends an existing rule's sub-class authoring pattern; Rule 7 Surface (c) round-of-derivation/extension mandates same-round self-application. Q-R47-EMPIRICAL.sh demonstrates the tightenings on R47's own ACs.

---

## § 8. Halt conditions

1. **Q-R47-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC. Do not attest PASS on a failed AC; Rule 6 anti-workaround discipline.
2. **R47 verifier itself reproduces the R46 anti-patterns:** if AC-R47-5, AC-R47-6, or AC-R47-7 catches a vacuous meta-AC / source-grep / SHA-memorize in Q-R47-EMPIRICAL.sh → HALT + DIAGNOSTIC; refactor before commit.
3. **Test baseline drift:** any change from 361/356/2/3 → HALT + DIAGNOSTIC.
4. **Bash syntax error:** `bash -n` on Q-R47-EMPIRICAL.sh exits non-zero → HALT + DIAGNOSTIC.

---

## § 9. Open questions

None.

---

## § 10. Pipeline invocation

- Pipeline mode: `./run-pipeline.sh --round R47 --tier audit`
- Interactive mode: Implementer executes chore-A; Reviewer pass invoked separately.

---

**R47 is a single focused fix-round, not a chain extension.** Closes Rule 1 sub-class loop before R48+ rounds inherit R46's verifier holes. Cross-project canonical landing of tightenings deferred to 2nd-project occurrence per Rule 7.
