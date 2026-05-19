# Q-R46-SPEC — Rule 1 Sub-Class Extension: empirical-command-attestation

**Round:** R46
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Operator-directed extension of Rule 1 (`false-compliance-attestation`) with a new sub-class `empirical-command-attestation`, following the R42-R45 Reviewer pass which surfaced 4 same-chain instances of Rule 1 violations (R42 MAJOR-1 "99 actually 26"; R43 MINOR-3 grep substituted for diff; R44 MAJOR-1 non-canonical short-names; R45 CRITICAL-1 "grep returns 7 actually 14"). Operator request 2026-05-19: "extend Rule 1 with the sub-class."

---

## § 1. Goal

Land a new Rule 1 sub-class — `empirical-command-attestation` — at Tessera-internal scope. The sub-class converts numeric/grep-output attestations from *declarative* ("returns N") to *imperative* ("running CMD at SHA returns N"), making false-compliance structurally impossible because there is no memorized number to drift.

**Three structural surfaces (mirroring Rule 7's a/b/c surfaces):**

- **Surface (a) — Spec gate:** SPEC-AUTHORING-CHECKLIST.md gains a new "Empirical-AC discipline" section. Spec template requirement: every AC making a numeric/grep-output claim MUST author a sibling `coordination/specs/Q-RNN-EMPIRICAL.sh` bash file that exits 0 on PASS, non-zero on FAIL. Each AC's verification is a labeled bash block in that file.
- **Surface (b) — Verification script:** `scripts/verify-empirical-acs.sh` provides a generic harness for invoking a round's empirical file. Usage: `scripts/verify-empirical-acs.sh <round-number-or-spec-file>`.
- **Surface (c) — Pre-commit-rule-sweep integration:** `scripts/pre-commit-rule-sweep.sh` `rule_1_check` upgraded from SEMANTIC stub to MECHANICAL — it now invokes `scripts/verify-empirical-acs.sh` for the round's spec and flags mismatches as Rule 1 violations.

**Self-application (Rule 7 Surface c required):** R46 itself derives the new sub-class. Per the canonical Rule 7 round-of-derivation special case, R46 MUST grep-sweep the round's own diff for the new sub-class's prohibited pattern AND apply the new discipline to its own ACs. The round produces `coordination/specs/Q-R46-EMPIRICAL.sh` and uses it to verify R46's own empirical claims at chore-A.

**Cross-project canonical landing of the sub-class amendment to `~/.claude/CROSS-PROJECT-MEMORIAL.md` is DEFERRED per the established Rule 7 anchor-canonical-landing-deferred discipline (R42 § 5.5 precedent; R44/R45 precedent). Operator decides cross-project promotion separately.**

---

## § 2. Brainstorm

**Option A — Tessera-internal sub-class with mechanical verification script (SELECTED).** Lands the discipline at SPEC-AUTHORING-CHECKLIST.md + new bash script + pre-commit-rule-sweep.sh upgrade. R46 self-applies via sibling Q-R46-EMPIRICAL.sh. Cross-project canonical landing deferred.
- Strengths: structural prevention of the recurring failure mode; mechanical surface for Rule 1's first sub-class; Rule 7 Surface c demonstrated end-to-end (round derives + applies sub-class same round); reversible; ~1 methodology round.
- Weaknesses: spec text gets ~3 extra lines per empirical AC; sibling EMPIRICAL.sh file is per-round overhead; cross-project promotion still gated on 2nd-project occurrence per Rule 7 discipline.
- Constraint match: R42-R45 Reviewer findings confirm 4 same-chain instances of the failure mode; structural fix matches operator request.

**Option B — Lighter reinforcement (no script):** Just add a SPEC-AUTHORING-CHECKLIST.md reinforcement line ("cite-and-rerun discipline: every empirical AC must include exact shell command; attestations from fresh re-run, not memorized values").
- Strengths: minimum churn; no new script file.
- Weaknesses: relies on manual discipline — exactly the failure mode that gave us 4 same-chain Rule 1 violations after Rule 1's canonical landing at R26. Passive accretion is insufficient per Rule 7. The mechanical surface IS the structural improvement.
- Rejected: violates Rule 7's "active propagation surfaces are load-bearing" canonical text.

**Option C — Amend CROSS-PROJECT-MEMORIAL.md directly to add the sub-class to Rule 1 canonical text:**
- Strengths: cross-project leverage; sub-class lives at canonical source-of-truth.
- Weaknesses: violates the consistent Rule 7 anchor-canonical-landing-deferred discipline from R42 § 5.5 + R44/R45. Tessera is 1 project data point for THIS sub-class; cross-project canonicalization without 2nd-project occurrence reproduces exactly the pattern Rule 7 warns against.
- Rejected: Rule 7 self-application discipline applies; defer to 2nd-project occurrence.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Sub-class canonical text (Tessera-internal landing)

The new sub-class is added to SPEC-AUTHORING-CHECKLIST.md in a new "Empirical-AC discipline" section. Canonical text (sub-class body):

> **Rule 1 sub-class `empirical-command-attestation`:** Every AC that asserts a numeric value, grep output, count, line-number range, or other empirically-determinable property MUST express the verification as an executable shell command in the spec. The attestation in NEXT-ROLE.md / MEMORIAL.md MUST be the actual output of running that command at chore-A SHA — not a memorized value re-quoted from the spec. A sibling file `coordination/specs/Q-RNN-EMPIRICAL.sh` houses one labeled bash block per empirical AC, exiting non-zero on mismatch. Rule 1 sub-class is mechanically enforceable via `scripts/verify-empirical-acs.sh <spec-file>` invoked at chore-A pre-commit.
>
> **Why this sub-class exists:** Pre-R46 Rule 1 (`false-compliance-attestation`) prohibited attesting PASS without empirical verification, but did not specify the verification *mechanism*. The R42-R45 chain demonstrated 4 instances where Implementer attestations cited counts/grep outputs that diverged from reality, even though Rule 1 was active. Failure mode: the Implementer is both spec-author and attestation-author; declarative numbers ("returns N") get reified into attestations without re-running the command. Sub-class mechanism: the spec carries the *command*, not the *result*; attestations re-execute the command at chore-A.

### 3.2 Surface (a) — SPEC-AUTHORING-CHECKLIST.md gate

Add a new section after "Rule 7 self-application gate (cross-project rule propagation surface a)": **"Empirical-AC discipline (Rule 1 sub-class)"**. Section structure:

1. **Sub-class canonical text** (per § 3.1 above).
2. **Author-time requirements:**
   - Identify every AC making an empirical claim (numeric value, count, grep output, line-number range, file existence/mode, command output).
   - For each such AC, write the exact shell command that verifies the claim.
   - Run the command at spec-emit time and record the EXPECTED output literal.
   - Bundle all verification commands in `coordination/specs/Q-RNN-EMPIRICAL.sh`.
3. **Chore-A requirements:**
   - Implementer runs `scripts/verify-empirical-acs.sh <round-number>` before commit.
   - Script exits 0 → all empirical ACs verified; attestation can claim PASS.
   - Script exits non-zero → HALT + DIAGNOSTIC; do NOT attest PASS on the failed AC.
4. **Reviewer cold-eye:**
   - Reviewer re-runs `scripts/verify-empirical-acs.sh <round-number>` at HEAD.
   - Independent verification of all empirical ACs in one command.

Update Rule 1 row in the existing § Rule 7 self-application gate per-rule checklist table from `partial` to `mechanizable`, with `Check: scripts/verify-empirical-acs.sh <round> exits 0`.

### 3.3 Surface (b) — `scripts/verify-empirical-acs.sh`

Generic harness:

```bash
#!/usr/bin/env bash
# scripts/verify-empirical-acs.sh
# Rule 1 sub-class (empirical-command-attestation) mechanical verification.
# Usage: scripts/verify-empirical-acs.sh <round-number-or-spec-file>
set -uo pipefail

# Resolve round → empirical file
# Invoke coordination/specs/Q-RNN-EMPIRICAL.sh
# Capture exit code; report per-AC results
# Exit 0 if all ACs verified; non-zero on any mismatch
```

Behavior:
- Accepts a round number (e.g., `R46`) or a direct path to `Q-RNN-EMPIRICAL.sh`.
- Locates `coordination/specs/Q-RNN-EMPIRICAL.sh`.
- Sources or invokes it; aggregates exit codes; reports per-AC pass/fail with command + expected + actual outputs.
- Exits 0 if all ACs verified; exits 1 if any AC fails.

### 3.4 Surface (c) — `scripts/pre-commit-rule-sweep.sh` Rule 1 upgrade

The existing `rule_1_check` function (currently a SEMANTIC stub) is upgraded to MECHANICAL:

```bash
rule_1_check() {
    echo ""
    echo "Rule 1 (false-compliance-attestation): MECHANICAL CHECK via sub-class verifier"
    # Locate the round's spec file
    local round_spec
    round_spec=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" -- 'coordination/specs/Q-R*-SPEC.md' 2>/dev/null | head -1)
    if [ -z "$round_spec" ]; then
        echo "  N/A — no spec file in this round diff."
        return 0
    fi
    # Derive round number from spec filename
    local round_num
    round_num=$(basename "$round_spec" | sed -E 's/Q-(R[0-9]+)-SPEC\.md/\1/')
    # Invoke the empirical verifier
    if [ -x "scripts/verify-empirical-acs.sh" ]; then
        if scripts/verify-empirical-acs.sh "$round_num" >/dev/null 2>&1; then
            echo "  OK — scripts/verify-empirical-acs.sh $round_num exit 0 (all empirical ACs verified)."
            return 0
        else
            echo "  FINDING — scripts/verify-empirical-acs.sh $round_num exit non-zero (empirical AC mismatch)."
            MECHANICAL_FINDINGS=$((MECHANICAL_FINDINGS + 1))
            return 1
        fi
    fi
    echo "  ADVISORY — scripts/verify-empirical-acs.sh missing; manual Rule 1 check required."
    SEMANTIC_CHECKS=$((SEMANTIC_CHECKS + 1))
    return 0
}
```

Behavior:
- If a spec file is in the round diff AND `scripts/verify-empirical-acs.sh` exists: invoke it; flag mismatch as mechanical finding.
- If no spec or script: advisory only.

### 3.5 Self-application — Q-R46-EMPIRICAL.sh

R46 derives the sub-class AND applies it to itself per Rule 7 Surface c. The round produces `coordination/specs/Q-R46-EMPIRICAL.sh` containing one labeled bash block per R46 empirical AC (per § 5 ACs below). Implementer invokes `scripts/verify-empirical-acs.sh R46` at chore-A; expected exit 0.

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R46-SPEC.md` | Created | This file |
| `coordination/specs/Q-R46-EMPIRICAL.sh` | Created | R46 empirical-AC verification (self-application) |
| `scripts/verify-empirical-acs.sh` | Created | Generic harness for per-round empirical verification |
| `scripts/pre-commit-rule-sweep.sh` | Modified | `rule_1_check` upgraded from SEMANTIC stub to MECHANICAL via the new harness |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | Modified | New "Empirical-AC discipline (Rule 1 sub-class)" section; Rule 1 row in § Rule 7 gate table updated `partial` → `mechanizable` |
| `coordination/MEMORIAL.md` | Modified | R46 IMPLEMENTER entry appended; includes Rule 7 Surface c CONFIRMATION (self-application of new sub-class at derivation round) |
| `coordination/NEXT-ROLE.md` | Modified | R46 routing |

Not modified: `engine/*`, `test/*`, `tools/*`, `CLAUDE-*.md` (R43 deliverables frozen), `MEMORIAL-PHASE-*.md` (R42 frozen shards), `~/.claude/CROSS-PROJECT-MEMORIAL.md` (cross-project canonical landing deferred per Rule 7 discipline), `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`.

---

## § 5. Acceptance criteria

All ACs have empirical verification in `coordination/specs/Q-R46-EMPIRICAL.sh` (self-application of the new sub-class).

**AC-R46-1 (verify-empirical-acs.sh exists + executable):**
Verification: `[ -x scripts/verify-empirical-acs.sh ]` returns true.

**AC-R46-2 (Q-R46-EMPIRICAL.sh exists + executable):**
Verification: `[ -x coordination/specs/Q-R46-EMPIRICAL.sh ]` returns true.

**AC-R46-3 (SPEC-AUTHORING-CHECKLIST.md "Empirical-AC discipline" section present):**
Verification: `grep -cE '^## Empirical-AC discipline' coordination/SPEC-AUTHORING-CHECKLIST.md` = 1.

**AC-R46-4 (Rule 1 row updated to "mechanizable"):**
Verification: `grep -cE '^\| 1 \| .* \| mechanizable \|' coordination/SPEC-AUTHORING-CHECKLIST.md` = 1.

**AC-R46-5 (rule_1_check upgraded — references verify-empirical-acs.sh):**
Verification: `grep -c 'verify-empirical-acs.sh' scripts/pre-commit-rule-sweep.sh` ≥ 1.

**AC-R46-6 (self-application — Q-R46-EMPIRICAL.sh verifies all 10 R46 empirical ACs):**
Verification: `scripts/verify-empirical-acs.sh R46` exits 0 at chore-A SHA.

**AC-R46-7 (sub-class canonical text present):**
Verification: `grep -c 'empirical-command-attestation' coordination/SPEC-AUTHORING-CHECKLIST.md` ≥ 1.

**AC-R46-8 (ALLOWED_SET coverage — diff ⊆ ALLOWED_SET):**
```
ALLOWED_SET:
coordination/specs/Q-R46-SPEC.md
coordination/specs/Q-R46-EMPIRICAL.sh
scripts/verify-empirical-acs.sh
scripts/pre-commit-rule-sweep.sh
coordination/SPEC-AUTHORING-CHECKLIST.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/reviews/REVIEWER-REPORT-R46.md   (post-chore-B Reviewer; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R46-*.md  (conditional)
```
Verification: `git diff <ROUND-START-SHA>..<CHORE-A-SHA> --name-only` returns only paths in ALLOWED_SET.

**AC-R46-9 (test baseline preserved):**
Verification: `node --test --test-reporter=tap test/*.test.js 2>&1 | grep -E '^# (tests|pass|fail|skipped) ' | head -4` returns exactly:
```
# tests 361
# pass 356
# fail 2
# skipped 3
```
AND `npx tsc -p tsconfig.test.json; echo $?` outputs `0`.

**AC-R46-10 (rule_1_check mechanical mode active on smoke test):**
Verification: running `scripts/pre-commit-rule-sweep.sh <pre-R46-SHA> <chore-A-SHA>` includes "Rule 1 (false-compliance-attestation): MECHANICAL CHECK via sub-class verifier" in stdout (not "SEMANTIC CHECK REQUIRED" — confirms the upgrade landed).

---

## § 6. Anti-scope

- NO modification of `engine/*` or `test/*` files
- NO modification of `CLAUDE-*.md` files (R43 deliverables frozen; new discipline reinforcement is in SPEC-AUTHORING-CHECKLIST.md, not the per-role files)
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 1 sub-class cross-project canonical landing DEFERRED per Rule 7 anchor-canonical-landing-deferred discipline; established precedent R42 § 5.5 + R44/R45)
- NO modification of `templates/Q-NN-SPEC-TEMPLATE.md` (anchor methodology; cross-project; deferred)
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`
- NO retroactive editing of R42-R45 specs to add empirical files (sub-class applies prospectively; R42-R45 Reviewer findings stand as historical evidence of the failure mode)
- NO new REINFORCED entries in CLAUDE-*.md (R43 consolidated; do not accrete)
- NO Phase 3 territory
- NO opening any GitHub PRs

---

## § 7. Apply all 7 cross-project rules UPFRONT

(SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate directive applied.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — this round derives the new sub-class. Per Rule 5 self-application + Rule 7 Surface c, R46 MUST apply the new sub-class to itself. Q-R46-EMPIRICAL.sh provides mechanical verification of all 10 ACs. AC-R46-6 binds this.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — methodology round; no production-code branches. (Note: canonical short name is `branch-binding-coverage-gate` per CROSS-PROJECT-MEMORIAL.md:3107; R44 Reviewer MINOR-1 flagged drift; canonical name used here.)
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file (methodology-round precedent: R39/R42/R43/R44/R45 all test-free).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated in AC-R46-8 at spec-emit time.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — this round derives a new Rule 1 sub-class. Per Rule 5 canonical text, the round MUST apply the new rule to itself. Q-R46-EMPIRICAL.sh + AC-R46-6 are the structural mechanism. (Note: canonical short name is `rule-derivation-without-self-application` per CROSS-PROJECT-MEMORIAL.md:3293 et seq; R44 Reviewer MAJOR-1 flagged drift; canonical name used here.)
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** N/A — no halt conditions anticipated. If smoke-test mismatch arises during implementation, DIAGNOSTIC required, not workaround.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (c) TRIGGERED — R46 derives a new sub-class; Surface (c) mandates same-round self-application. The sub-class IS the propagation mechanism for Rule 1. Three structural surfaces delivered (a/b/c) per § 1.

---

## § 8. Halt conditions

1. **Q-R46-EMPIRICAL.sh fails its own verification:** if `scripts/verify-empirical-acs.sh R46` exits non-zero at chore-A → HALT + DIAGNOSTIC. The round derives the sub-class; failing its own discipline at landing is unacceptable.
2. **rule_1_check upgrade breaks smoke test:** if the post-R46 `scripts/pre-commit-rule-sweep.sh` exits non-zero on a clean round → HALT + DIAGNOSTIC; refine before commit.
3. **Cross-project canonical text drift temptation:** if mid-round the Implementer is tempted to amend CROSS-PROJECT-MEMORIAL.md directly → HALT + DIAGNOSTIC per anti-scope. The Tessera-internal landing is sufficient; cross-project promotion is a separate operator decision.
4. **Test baseline drift:** any change from 361/356/2/3 → HALT + DIAGNOSTIC.
5. **Bash syntax error in either new script:** `bash -n` exit non-zero on either script → HALT + DIAGNOSTIC.

---

## § 9. Open questions

None.

---

## § 10. Pipeline invocation

- **Pipeline mode:** `./run-pipeline.sh --round R46 --tier audit`
- **Interactive mode:** Implementer executes; Reviewer pass invoked separately.

---

**R46 is the structural fix for the R42-R45 Reviewer findings.** The chain demonstrated 4 instances of the failure mode after Rule 1's canonical landing; the sub-class + mechanical verifier prevent recurrence. Cross-project canonical promotion is deferred to 2nd-project occurrence per Rule 7 discipline (established precedent).
