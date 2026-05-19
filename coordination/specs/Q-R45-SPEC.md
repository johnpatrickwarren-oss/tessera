# Q-R45-SPEC — Rule 7 Structural Mechanism (Surface b: Pre-Commit Rule-Sweep Script)

**Round:** R45
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Overnight authority window 2026-05-19 LATE-MORNING (4th and FINAL round in chain per [[project-overnight-authority-2026-05-19-late-morning]] 4-round budget).

---

## § 1. Goal

Implement **Surface (b)** of Rule 7's three propagation surfaces — the Implementer chore-A pre-commit grep gate — by creating `scripts/pre-commit-rule-sweep.sh`. This is the mechanical companion to R44's Surface (a) checklist: the script reads a round's diff and applies grep gates for the mechanizable rules.

**Bounded scope:**
- Working grep-gate implementation for Rules 4 + 7 (fully mechanizable per R44 SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate table).
- Documented stub functions for Rules 1, 2, 3, 5, 6 (partial-semantic per same table) with rationale why mechanization is incomplete + pointer to the semantic-check description.
- Script must be safe to run in any round (no destructive operations; read-only `git diff` invocations).
- Update SPEC-AUTHORING-CHECKLIST.md to reflect that Surface (b) is now implemented (was "deferred to R45").

**Rule 7 canonical text reference:** `~/.claude/CROSS-PROJECT-MEMORIAL.md:3478`. Surface (b) text: "`scripts/pre-commit-rule-sweep.sh` (or equivalent) MUST grep the chore-A diff for the weak patterns each derived rule prohibits and exit non-zero if any are found."

---

## § 2. Brainstorm

**Option A — Working Rules 4+7 + documented stubs for 1/2/3/5/6 (SELECTED):** Useful incremental implementation. The 2 fully-mechanizable rules give real value; documented stubs preserve the per-rule structure for future extension.
- Strengths: minimum-viable Surface (b); each rule has a place in the script for future extension; safe to run at any round; bounded scope.
- Weaknesses: 5 of 7 rules are not mechanically enforced. The checklist (Surface a) documents this explicitly so the gap is honest.
- Constraint match: Surface (b) text says "grep the chore-A diff" — the script does grep on the diff for the 2 fully-mechanizable rules; for the 5 partial-semantic rules, the script emits a "manual-check required" warning per rule and exits with the manual-check count visible.

**Option B — Full mechanization attempt:** Try to mechanize all 7 rules.
- Strengths: complete Surface (b) coverage.
- Weaknesses: 5 of the 7 rules are NOT cleanly mechanizable per R44's SPEC-AUTHORING-CHECKLIST.md analysis (Rule 1 false-compliance requires reality-comparison; Rule 2 branch-binding requires AST/semantic analysis; Rule 3 spec-test-assertion requires AC-aware parsing; Rule 5 self-application requires Memorial-Updater-stage knowledge; Rule 6 halt-discipline requires inference about whether halt should have fired). Contrived greps that mostly produce false positives degrade the gate's usefulness.
- Rejected: false-positive-heavy gates would be ignored or disabled; better to honestly document what's not mechanizable.

**Option C — Skip Surface (b) entirely, document as inherently-semantic:** Argue that all 7 rules are semantic and no script is useful.
- Strengths: simplest; no script churn.
- Weaknesses: directly contradicts Rule 7 canonical text ("MUST grep the chore-A diff for the weak patterns each derived rule prohibits and exit non-zero"). Rule 4 and Rule 7 ARE mechanizable; not implementing them would itself be a Rule 7 surface violation.
- Rejected: Rule 7 canonical text mandates the script exists.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Script location + invocation

`scripts/pre-commit-rule-sweep.sh`:

```bash
#!/usr/bin/env bash
# Rule 7 propagation Surface (b): mechanical pre-commit rule sweep.
# Reads the round's git diff and runs grep gates for mechanizable rules.
# See coordination/SPEC-AUTHORING-CHECKLIST.md § "Rule 7 self-application gate"
# and ~/.claude/CROSS-PROJECT-MEMORIAL.md:3478 (Rule 7 canonical text).
#
# Usage: scripts/pre-commit-rule-sweep.sh <round-start-SHA> <chore-A-SHA>
# Exit codes:
#   0 — clean sweep (mechanizable rules pass; semantic rules require manual check)
#   1 — finding (mechanizable rule violation detected)
#   2 — usage error
```

Invoked by:
- Implementer at chore-A pre-commit time (recommended; not yet enforced by hook).
- Reviewer at cold-eye time as part of independent verification.
- Operator at any point for ad-hoc round-diff audit.

### 3.2 Mechanizable checks

**Rule 4 gate (anti-scope-allowed-set-forward-coverage):**

Check: `git diff <round-start-SHA>..<chore-A-SHA> -- coordination/specs/Q-RNN-SPEC.md` should show ALLOWED_SET stable (no post-spec-emit additions to the ALLOWED_SET block). If the diff contains lines added inside an ALLOWED_SET block, flag as a finding.

Implementation:
1. Find the spec file modified in the round diff.
2. Extract additions to lines between `ALLOWED_SET:` and the closing backticks.
3. If non-empty additions, flag with the spec file + added paths.

Limitation: only catches additions to ALLOWED_SET visible in the git diff between round-start and chore-A. If the spec was authored at round-start and the ALLOWED_SET was already populated, this check sees no additions. The real Rule 4 violation pattern is spec-emit → chore-A → ALLOWED_SET edited post-hoc; the script catches this if the spec was edited between two commits.

**Rule 7 gate (derived-rule-propagation-mechanism-required):**

Check: if the round diff contains a new "Reinforcement rules derived" entry in CROSS-PROJECT-MEMORIAL.md, the round's spec § 7 MUST enumerate the new rule by name.

Implementation:
1. `git diff <round-start>..<chore-A> -- ~/.claude/CROSS-PROJECT-MEMORIAL.md` (note: outside the project; use absolute path).
2. If diff contains "+\#\#\# Reinforcement rules derived" or "+- \*\*Rule [0-9]+", note the new rule name.
3. `grep -l "Rule [0-9]+" coordination/specs/Q-R\*\*-SPEC.md` for the round's spec.
4. If the new rule's name does not appear in the spec's § 7, flag as a finding.

Limitation: CROSS-PROJECT-MEMORIAL.md is outside the project's `git` tracking. The script needs an explicit path argument or fallback to reading the file directly. If the round did NOT modify CROSS-PROJECT-MEMORIAL.md, the gate is N/A.

### 3.3 Stubbed checks (partial-semantic rules)

For Rules 1, 2, 3, 5, 6: the script emits a per-rule "manual-check required" line with the canonical short rationale and exits 0 for that rule (i.e., the rule does not produce a mechanical finding; the operator/Reviewer must apply the semantic check described in SPEC-AUTHORING-CHECKLIST.md § Rule 7 table).

Each stub looks like:

```bash
rule_1_check() {
  echo "Rule 1 (false-compliance-attestation): SEMANTIC CHECK REQUIRED"
  echo "  Check: cross-check each AC PASS claim against observed evidence."
  echo "  See coordination/SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate."
  return 0  # stubbed; no mechanical finding
}
```

### 3.4 Script structure

```
main() {
  parse args (round-start-SHA, chore-A-SHA)
  emit header (Rule 7 sweep: SHA..SHA)
  for rule in 1..7:
    rule_N_check
    accumulate exit code
  emit summary (mechanical findings: N; semantic checks required: M)
  exit aggregate
}
```

### 3.5 SPEC-AUTHORING-CHECKLIST.md update

Update the "Surface (b) deferred to R45 round" reference in SPEC-AUTHORING-CHECKLIST.md to:
"Surface (b) **IMPLEMENTED** at `scripts/pre-commit-rule-sweep.sh` (R45 chore-A `<SHA>`). Works for Rules 4 + 7; emits semantic-check directives for Rules 1, 2, 3, 5, 6."

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R45-SPEC.md` | Created | This file |
| `scripts/pre-commit-rule-sweep.sh` | Created | New mechanical rule-sweep script (executable; ~150 lines) |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | Modified | Surface (b) reference updated from "deferred to R45" to "implemented at scripts/pre-commit-rule-sweep.sh" |
| `coordination/MEMORIAL.md` | Modified | R45 IMPLEMENTER entry appended |
| `coordination/NEXT-ROLE.md` | Modified | R45 routing |

Not modified: `engine/*`, `test/*`, `tools/*`, `CLAUDE-*.md` (R43 deliverables frozen), `MEMORIAL-PHASE-*.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`.

---

## § 5. Acceptance criteria

**AC-R45-1 (script exists, executable):** Post-R45, `[ -x scripts/pre-commit-rule-sweep.sh ]` → true. File mode includes executable bit.

**AC-R45-2 (script header references Rule 7):** `head -10 scripts/pre-commit-rule-sweep.sh` contains both "Rule 7" and "Surface (b)" markers.

**AC-R45-3 (7 rule functions present):** `grep -cE "^rule_[1-7]_check" scripts/pre-commit-rule-sweep.sh` = 7. One function per cross-project rule.

**AC-R45-4 (Rule 4 advisory + Rule 7 mechanical):** `rule_4_check` contains `git diff --name-status` invocation that distinguishes newly-added vs modified specs and emits ADVISORY-class output (false-positive-avoidance: full mechanization deferred until spec-emit-SHA tracking exists). `rule_7_check` contains BOTH (a) an advisory line acknowledging CROSS-PROJECT-MEMORIAL.md is outside repo git tracking AND (b) a mechanical check that verifies the round's spec § 7 enumerates all 7 rules (`grep -cE '^- \*\*Rule [1-7] '` ≥ 7). Rule 7 is the sole mechanical-finding producer.

**AC-R45-5 (stubs/advisories for 1/2/3/5/6 documented):** `rule_1_check`, `rule_2_check`, `rule_3_check`, `rule_5_check`, `rule_6_check` each emit a "SEMANTIC CHECK REQUIRED" line and a pointer to SPEC-AUTHORING-CHECKLIST.md row.

**AC-R45-6 (script smoke test):** Run `./scripts/pre-commit-rule-sweep.sh aa3cc6d a9adeda` (R43-backfill..R44-chore-A SHAs). Expected: exit 0 (clean mechanical sweep; 7 semantic checks logged; Rule 7 spec § 7 enumeration check passes on Q-R44-SPEC.md).

**AC-R45-7 (SPEC-AUTHORING-CHECKLIST.md Surface b reference updated):** `grep -c "IMPLEMENTED at \`scripts/pre-commit-rule-sweep.sh\`" coordination/SPEC-AUTHORING-CHECKLIST.md` ≥ 1; the "deferred to R45" wording is gone.

**AC-R45-8 (no engine/test/CROSS-PROJECT modifications — ALLOWED_SET):** Diff after chore-A ⊆ ALLOWED_SET:

```
ALLOWED_SET:
coordination/specs/Q-R45-SPEC.md
scripts/pre-commit-rule-sweep.sh
coordination/SPEC-AUTHORING-CHECKLIST.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/reviews/REVIEWER-REPORT-R45.md   (post-chore-B Reviewer commit; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R45-*.md  (conditional; only if HALT fires)
```

No engine/*, test/*, tools/*, CLAUDE-*.md (R43 deliverables frozen), MEMORIAL-PHASE-*.md, CROSS-PROJECT-MEMORIAL.md, SCOPING-MEMO-v0.3.md, PRD.md.

**AC-R45-9 (test baseline preserved):** Post-R45 baseline = R44 baseline = 361/356/2/3, tsc exit 0. Zero regression. (The new script is in scripts/, not test/; test runner is unaffected.)

**AC-R45-10 (Rule 7 Surface b/c framing):** R45 spec § 1 + § 3 + MEMORIAL R45 IMPLEMENTER entry explicitly frame the round as Rule 7 Surface (b); cite SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate as the spec-template surface (a) anchor that this script complements.

---

## § 6. Anti-scope

- NO modification of `engine/*` or `test/*` files
- NO modification of `tools/*` files (script lives in `scripts/`, not `tools/`)
- NO modification of `CLAUDE-*.md` files (R43 deliverables frozen)
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor canonical landing deferred per R42 anchor-canonical-landing precedent)
- NO modification of anchor methodology (`templates/Q-NN-SPEC-TEMPLATE.md` or `integrations/`)
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`
- NO new test files (methodology round precedent: R39/R42/R43/R44 all test-free)
- NO mechanization of partial-semantic rules beyond documented stubs (Rules 1, 2, 3, 5, 6) — false-positive-heavy gates would be worse than no gate
- NO running the script as a pre-commit hook automatically (manual invocation only at R45; automation deferred indefinitely)
- NO Phase 3 territory
- NO opening any GitHub PRs

---

## § 7. Apply all 7 cross-project rules UPFRONT

(R44 SPEC-AUTHORING-CHECKLIST.md § Rule 7 directive applied: every rule below is listed with active gate / N/A / already-validated.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — AC-R45-1, AC-R45-3, AC-R45-6, AC-R45-7 require empirical verification via `grep`, `[ -x ... ]`, and actual script invocation. Implementer verifies all attestations empirically before committing chore-A.
- **Rule 2 (`architect-branch-binding-coverage`):** N/A — methodology round; no production-code branches authored. The script's own internal branches (per-rule function dispatch) are covered by AC-R45-3 enumeration check.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — methodology round; no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated in AC-R45-8 at spec-emit time; Implementer verifies diff strictly ⊆ ALLOWED_SET at chore-A. The script itself implements this rule's mechanical gate (`rule_4_check` function).
- **Rule 5 (`self-application gate`):** ACTIVE GATE — the script's existence is itself a Rule 7 self-application; AC-R45-10 binds this framing. The script implements `rule_5_check` as a stub (rationale: semantic; no mechanical pattern).
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** N/A — no halt conditions anticipated. Script writes no DIAGNOSTIC unless smoke test (AC-R45-6) fails unexpectedly.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + THIS IS Rule 7's Surface (b) IMPLEMENTATION. No new rule derived at R45 (Surface c not triggered). The active spec § 7 follows the R44 SPEC-AUTHORING-CHECKLIST.md directive.

---

## § 8. Halt conditions

1. **Script syntax error:** If `bash -n scripts/pre-commit-rule-sweep.sh` exits non-zero at chore-A → HALT + DIAGNOSTIC. Do not commit broken bash.
2. **AC-R45-6 smoke test crashes:** If invoking the script on `aa3cc6d a9adeda` SHAs produces an unhandled error → HALT + DIAGNOSTIC; debug or stub the failing rule check.
3. **Rule 4 or Rule 7 grep pattern false-positives on the round's own diff:** If `rule_4_check` or `rule_7_check` flag R45's own commit (false positive on the script's own diff) → HALT + DIAGNOSTIC; refine the gate before commit.
4. **Test baseline drift:** Any change from 361/356/2/3 → HALT + DIAGNOSTIC. Methodology round must not perturb tests.

---

## § 9. Open questions

None.

---

## § 10. Pipeline invocation

- **Pipeline mode:** `./run-pipeline.sh --round R45 --tier audit`
- **Interactive mode:** Implementer executes; Reviewer pass invoked separately.

---

**Note:** R45 is the FINAL round in the 2026-05-19 LATE-MORNING overnight authority chain (4-round budget). After R45 close, HARD STOP re-engages pending operator wake. Phase 3 scope entry still requires separate PRD + authorization.
