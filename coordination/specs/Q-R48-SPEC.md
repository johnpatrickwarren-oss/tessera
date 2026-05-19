# Q-R48-SPEC — Fix R47 CRITICALs: Recursion Guard + Verifier Corrections

**Round:** R48
**Tier:** audit (Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** R47 ESCALATE → Option B (R48 chain extension). See `coordination/MEMORIAL.md` R47 MEMORIAL-UPDATER entries.

---

## § 1. Goal

Fix the 5 Reviewer-flagged issues from R47 (CRITICAL-1, CRITICAL-2, MAJOR-1, MAJOR-2, MAJOR-3). These collectively represent a self-application failure of the Rule 1 sub-class verifier authoring pattern at the round that derived those tightening disciplines:

- **(d)** Add same-round-recursion guard to `scripts/pre-commit-rule-sweep.sh:rule_1_check` — closes the structural root cause of CRITICAL-1.
- **(a)** Replace AC-R47-10's recursive verifier with a non-recursive guard-testing check — closes CRITICAL-1, CRITICAL-2, MAJOR-3.
- **(b)** Convert AC-R47-5 (`>= 1`) and AC-R47-6 (`>= 2`) to `==` exact-count assertions — closes MAJOR-2.
- **(c)** Align AC-R47-7 spec text (Q-R47-SPEC.md:165) with verifier command (Q-R47-EMPIRICAL.sh:143) — closes MAJOR-1.

R48 self-applies the corrected patterns via `coordination/specs/Q-R48-EMPIRICAL.sh`.

---

## § 2. Brainstorm

**Approach A — Env-var recursion guard + guard-testing AC-R47-10 (SELECTED)**

Replace the recursive AC-R47-10 invocation with one that pre-sets `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` before calling `scripts/pre-commit-rule-sweep.sh`; the guard fires immediately (simulating the in-recursion context) and prints a detectable advisory. Add the guard itself to `rule_1_check`.

- Strengths: Non-recursive; tests runtime behavior (Tightening 2 applied); non-vacuous (tests the guard property specifically); fails if guard is removed; minimal diff to Q-R47-EMPIRICAL.sh.
- Weaknesses: Requires understanding env-var propagation chain.
- Constraint match: directly implements NEXT-ROLE.md item (d); closes all 5 findings.

**Approach B — Delete AC-R47-10 + add guard (no new AC-R47-10)**

Remove AC-R47-10 entirely from verifier and spec; add guard only.

- Strengths: Simpler; explicitly applies Tightening 1.
- Weaknesses: AC-R47-5's exact count drops from 1 to 0 (no stdout-grep patterns remain); must also update AC-R47-5 to `== 0`, weakening the self-application demonstration. Loses Tightening 2 runtime-behavior verification in Q-R47-EMPIRICAL.sh.
- Rejected: Weakens the round's self-application evidence.

**Approach C — Non-recursive AC-R47-10 using prior-round SHAs**

Invoke `scripts/pre-commit-rule-sweep.sh` with R46-era SHAs where Q-R47-SPEC.md is absent from the diff; `rule_1_check` invokes `verify-empirical-acs.sh R46` (not R47) — no recursion.

- Strengths: Tests runtime behavior without the env-var trick.
- Weaknesses: Requires hardcoded prior-round SHAs from outside R47's ALLOWED_SET; fragile if those SHAs move out of repo retention; complex to make robust. Does not add the structural guard fix (item d still needed).
- Rejected: Env-var approach is simpler and still covers item (d).

**Selection rationale:** Approach A. The recursion guard is item (d) regardless; once added, pre-setting `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` in AC-R47-10 directly tests the guard at runtime (Tightening 2) without recursion.

---

## § 3. Mechanism

### 3.1 Recursion guard in `scripts/pre-commit-rule-sweep.sh`

Add at the top of `rule_1_check`, before any other logic:

```bash
if [ -n "${_PRE_COMMIT_RULE_SWEEP_ACTIVE:-}" ]; then
    echo "  ADVISORY — recursion guard active; same-round re-entry detected."
    echo "    Skipping nested verify-empirical-acs.sh invocation to prevent infinite loop."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
fi
export _PRE_COMMIT_RULE_SWEEP_ACTIVE=1
```

After guard, the rest of `rule_1_check` is unchanged. The `export` propagates `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` to all child processes, so any grandchild invocation of `pre-commit-rule-sweep.sh` (via Q-RNN-EMPIRICAL.sh → verify-empirical-acs.sh → Q-RNN-EMPIRICAL.sh → pre-commit-rule-sweep.sh) also sees the guard.

### 3.2 Replacement AC-R47-10 in `coordination/specs/Q-R47-EMPIRICAL.sh`

Replace the recursive block at line 203-205 with a guard-testing stdout-grep:

```bash
echo "AC-R47-10: recursion guard fires when _PRE_COMMIT_RULE_SWEEP_ACTIVE is set"
ACTUAL=$(_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 timeout 30 \
    scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 \
    | grep -c 'recursion guard active')
assert_eq "AC-R47-10" "1" "$ACTUAL"
```

Pre-setting `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` simulates the recursive-call context. `rule_1_check` fires the guard and prints the advisory. `grep -c 'recursion guard active'` returns exactly 1. Non-vacuous: fails if guard is removed. Non-recursive: guard fires on entry, no nested `verify-empirical-acs.sh` call.

The new line preserves AC-R47-5's exact count of 1 (pattern `scripts/.*\.sh [^|]+\| *grep` still matches). The AC-R47-6 git-invocation count of 7 is unaffected (no new `git` calls added).

### 3.3 Exact-count fixes in `coordination/specs/Q-R47-EMPIRICAL.sh`

- **AC-R47-5:** `assert_ge "AC-R47-5" "1" "$ACTUAL"` → `assert_eq "AC-R47-5" "1" "$ACTUAL"` (exact count; structurally fixed by AC-R47-10's implementation being the sole stdout-grep line).
- **AC-R47-6:** `assert_ge "AC-R47-6" "2" "$ACTUAL"` → `assert_eq "AC-R47-6" "7" "$ACTUAL"` (exact count; 7 git invocations confirmed from Reviewer report MAJOR-2 and file content).

### 3.4 Spec text alignment in `coordination/specs/Q-R47-SPEC.md`

Four AC text updates to match verifier commands:
- **AC-R47-5 (line 159):** `>= 1` → `== 1`.
- **AC-R47-6 (line 162):** `>= 2` → `== 7`.
- **AC-R47-7 (line 165):** Replace `grep -c 'asserted by aggregate'` with `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit'` and add a rationale note (avoids Liar's Paradox self-match).
- **AC-R47-10 (lines 174-175):** Replace vacuous "Verification: `scripts/verify-empirical-acs.sh R47` exits 0" with description of the non-recursive guard-testing check.

### 3.5 Known limitation (post-R48 verification of Q-R47-EMPIRICAL.sh)

After R48, `git diff --name-only 1049a52 HEAD` (Q-R47-EMPIRICAL.sh's AC-R47-8 diff range) includes R48 files (`Q-R48-SPEC.md`, `Q-R48-EMPIRICAL.sh`, `scripts/pre-commit-rule-sweep.sh`) which are NOT in R47's ALLOWED_SET. Running `scripts/verify-empirical-acs.sh R47` post-R48 will show AC-R47-8 FAIL. This is an expected consequence of the hardcoded-round-start design — not a regression caused by R48. R48's own verifier does NOT invoke `verify-empirical-acs.sh R47` to avoid this confusing false failure.

---

## § 4. Component inventory

| File | Status | Notes |
|---|---|---|
| `coordination/specs/Q-R48-SPEC.md` | Created | This file |
| `coordination/specs/Q-R48-EMPIRICAL.sh` | Created | R48 self-application verifier |
| `scripts/pre-commit-rule-sweep.sh` | Modified | Add recursion guard to `rule_1_check` |
| `coordination/specs/Q-R47-EMPIRICAL.sh` | Modified | Fix AC-R47-5/6/10 (items a + b) |
| `coordination/specs/Q-R47-SPEC.md` | Modified | Align AC-R47-5/6/7/10 text (items b + c) |
| `coordination/MEMORIAL.md` | Modified | R48 IMPLEMENTER entries |
| `coordination/NEXT-ROLE.md` | Modified | R48 routing |

Not modified: `engine/*`, `test/*`, `tools/*`, `CLAUDE-*.md`, `MEMORIAL-PHASE-*.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`, `coordination/specs/Q-R42-*` through `Q-R46-*`, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`.

---

## § 5. Acceptance criteria

All ACs have empirical verification in `coordination/specs/Q-R48-EMPIRICAL.sh`.

**AC-R48-1 (Q-R48-EMPIRICAL.sh exists + executable + syntax-valid):**
`[ -x coordination/specs/Q-R48-EMPIRICAL.sh ] && bash -n coordination/specs/Q-R48-EMPIRICAL.sh` exits 0.

**AC-R48-2 (recursion guard fires at runtime — Tightening 2 self-applied):**
Given `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` in environment, when `scripts/pre-commit-rule-sweep.sh` is invoked, then stdout contains "recursion guard active" (guard fires on entry). Verification: `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 scripts/pre-commit-rule-sweep.sh <ROUND_START_SHA> HEAD 2>&1 | grep -c 'recursion guard active'` == 1.

**AC-R48-3 (AC-R47-5 uses exact count == 1, not assert_ge):**
`grep -cF 'assert_ge "AC-$ROUND-5"' coordination/specs/Q-R47-EMPIRICAL.sh` == 0 AND `grep -cF 'assert_eq "AC-$ROUND-5" "1"' coordination/specs/Q-R47-EMPIRICAL.sh` == 1. (Note: Q-R47-EMPIRICAL.sh stores the literal text `AC-$ROUND-5` with the dollar sign unexpanded.)

**AC-R48-4 (AC-R47-6 uses exact count == 7, not assert_ge):**
`grep -cF 'assert_ge "AC-$ROUND-6"' coordination/specs/Q-R47-EMPIRICAL.sh` == 0 AND `grep -cF 'assert_eq "AC-$ROUND-6" "7"' coordination/specs/Q-R47-EMPIRICAL.sh` == 1.

**AC-R48-5 (AC-R47-7 spec text alignment):**
`grep -cF "grep -c 'asserted by aggregate'" coordination/specs/Q-R47-SPEC.md` == 0 (old loose command absent) AND `grep -cE "PASS\.\*aggregate exit" coordination/specs/Q-R47-SPEC.md` == 1 (new tighter command present).

**AC-R48-6 (AC-R47-10 non-recursive in verifier):**
`grep -cF 'MECHANICAL CHECK via sub-class verifier' coordination/specs/Q-R47-EMPIRICAL.sh` == 0 (old recursive-triggering grep literal absent) AND `grep -cF '_PRE_COMMIT_RULE_SWEEP_ACTIVE=1' coordination/specs/Q-R47-EMPIRICAL.sh` == 1 (new guard-testing env-var prefix present).

**AC-R48-7 (anti-scope — diff ⊆ ALLOWED_SET):**
ALLOWED_SET = { `coordination/specs/Q-R48-SPEC.md`, `coordination/specs/Q-R48-EMPIRICAL.sh`, `scripts/pre-commit-rule-sweep.sh`, `coordination/specs/Q-R47-EMPIRICAL.sh`, `coordination/specs/Q-R47-SPEC.md`, `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md` }. `git diff --name-only <ROUND_START_SHA> HEAD` returns only paths in ALLOWED_SET.

**AC-R48-8 (test baseline preserved):**
`node --test --test-reporter=tap test/*.test.js` → tests=361, pass=355, fail=3, skipped=3. `npx tsc -p tsconfig.test.json` exits 0.
(Amended per operator Option A resolution in NEXT-ROLE.md: R47 MU commit 6e8b1c6 introduced a 3rd pre-existing failure; 361/355/3/3 is the correct pre-R48 baseline.)

---

## § 6. Anti-scope

- **NO modification of `engine/*`, `test/*`, `tools/*`** (zero production-code changes).
- **NO modification of `CLAUDE-*.md`** (R43 consolidation + R46 MU appends preserved).
- **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`** (Rule 7 anchor-canonical-landing-deferred; cross-project landing operator-gated).
- **NO modification of `coordination/MEMORIAL-PHASE-*.md`** (R42 frozen shards).
- **NO modification of `coordination/specs/Q-R42-*` through `Q-R46-*`** (prior rounds as historical baseline).
- **NO modification of R47 deliverables beyond items (a)/(b)/(c):** only `Q-R47-EMPIRICAL.sh` (items a + b) and `Q-R47-SPEC.md` (items b + c) are in scope; AC-R47-8 ALLOWED_SET in Q-R47-EMPIRICAL.sh is NOT modified (its post-R48 staleness is a known accepted limitation per § 3.5).
- **NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`**.
- **NO new REINFORCED entries in CLAUDE-*.md**.
- **NO Phase 3 territory**.
- **NO GitHub PRs**.

---

## § 7. Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names from `~/.claude/CROSS-PROJECT-MEMORIAL.md`.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — R48 fixes prior Rule 1 sub-class failures. Q-R48-EMPIRICAL.sh applies all 4 Tightenings; empirical-AC verification via `scripts/verify-empirical-acs.sh R48` must exit 0 at chore-A. No memorized values; all counts run at chore-A time.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches this round.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored (methodology round; R39-R47 precedent).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated at AC-R48-7 at spec-emit time. `scripts/pre-commit-rule-sweep.sh` explicitly included (item d authorization per NEXT-ROLE.md).
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R48 fixes R47's same-round-as-derivation self-application failure. R48 must not reproduce the same pattern. Self-application gate: Q-R48-EMPIRICAL.sh applies all 4 R47 Tightenings to its own ACs.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if `scripts/verify-empirical-acs.sh R48` hangs at any AC (recursion regression), HALT + DIAGNOSTIC. Do not attest exit 0 on a hanging verifier.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (c) self-application — R48 extends the Rule 1 sub-class enforcement by adding the recursion guard. Same-round self-application via Q-R48-EMPIRICAL.sh. No new cross-project rule derived this round.

---

## § 8. Halt conditions

1. **`scripts/verify-empirical-acs.sh R48` exits non-zero at chore-A** → HALT + DIAGNOSTIC. Do not attest PASS on a failed AC.
2. **Recursion guard breaks R44/R46 `rule_7_check` mechanical mode** (spec § 7 enumeration check) → HALT + DIAGNOSTIC.
3. **Test baseline drift from 361/356/2/3** → HALT + DIAGNOSTIC.
4. **`bash -n` on any modified script exits non-zero** → HALT + DIAGNOSTIC.
5. **`scripts/verify-empirical-acs.sh R47` or `R48` hangs** (recursion not fixed) → HALT + DIAGNOSTIC.

---

## § 9. Open questions

None — all resolved by NEXT-ROLE.md operator directive.

---

## § 10. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R48 --tier audit
```
