CURRENT-ROUND: R48
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R48 — fix R47 CRITICALs; audit-tier)

R48 is the R47 follow-up fix-round per operator decision (Option B) at R47 ESCALATE close. R47 closed via pipeline MU at `6e8b1c6`; this round addresses the verifier-pattern CRITICALs the R47 Reviewer surfaced.

**Round-start SHA:** `6e8b1c6` (chore(R47): Memorial-Updater outputs).

### Primary deliverable

Fix the 5 R47 Reviewer-flagged verifier issues (CRITICAL-1 + CRITICAL-2 + MAJOR-1 + MAJOR-2 + MAJOR-3) by tightening the Rule 1 sub-class authoring pattern's self-application demonstration. R48 self-applies the corrected pattern via `coordination/specs/Q-R48-EMPIRICAL.sh`.

Specifically (per `coordination/reviews/REVIEWER-REPORT-R47.md` § Routing Option B):

- **(a) Fix CRITICAL-1 + CRITICAL-2 + MAJOR-3:** Replace AC-R47-10's verifier body in `coordination/specs/Q-R47-EMPIRICAL.sh` with a non-recursive substantive check, OR delete the AC as a vacuous meta-AC per Tightening 1. Spec text in `coordination/specs/Q-R47-SPEC.md` must align with the verifier behavior. The infinite-recursion path (Q-R47-EMPIRICAL.sh:204 → pre-commit-rule-sweep.sh:107 → verify-empirical-acs.sh:80 → Q-R47-EMPIRICAL.sh) MUST NOT exist post-R48.
- **(b) Fix MAJOR-2:** Convert AC-R47-5 (`>= 1`) and AC-R47-6 (`>= 2`) to `==` exact-count assertions. Actual counts are structurally fixed (1 and 7 respectively per Reviewer). Apply Tightening 4 self-application.
- **(c) Fix MAJOR-1:** Align AC-R47-7 spec text (Q-R47-SPEC.md:165) with the verifier grep command (Q-R47-EMPIRICAL.sh:143). Either the spec text changes to match the verifier, or the verifier changes to match the spec. Rule 1 sub-class discipline: spec carries the command; verifier runs THAT command.
- **(d) Fix the root cause:** Add a same-round-recursion guard to `scripts/pre-commit-rule-sweep.sh:rule_1_check`. The current implementation invokes `scripts/verify-empirical-acs.sh <round>` for the round whose spec is in the diff — but if that round's own EMPIRICAL.sh contains an AC that calls back into `pre-commit-rule-sweep.sh`, infinite recursion is structural. Guard pattern: detect the recursion (e.g., environment variable set on entry; refuse if already set) and short-circuit with an advisory.

### Tier rationale

**audit-tier** — fix-round; bounded scope; no novel architecture. Implementer authors thin spec inline (`coordination/specs/Q-R48-SPEC.md`). Reviewer audits cold-eye.

### Anti-scope (R48 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files (zero production-code changes).
- NO modification of `CLAUDE-*.md` files (R43 consolidation preserved; R46 MU appends preserved).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred discipline; cross-project canonical landings remain operator-gated on 2nd-project occurrence).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards).
- NO modification of `coordination/specs/Q-R42-*` through `Q-R46-*` (prior rounds preserved as historical baseline).
- NO modification of R47 deliverables OTHER than the in-scope items (Q-R47-EMPIRICAL.sh per item (a); Q-R47-SPEC.md per item (c) IF spec text alignment chosen).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`.
- NO new REINFORCED entries in CLAUDE-*.md (R43 consolidation preserved).
- NO Phase 3 territory.
- NO opening any GitHub PRs.

### Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names from `~/.claude/CROSS-PROJECT-MEMORIAL.md`.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — R48 is fixing prior Rule 1 sub-class failures. R48's own Q-R48-EMPIRICAL.sh applies the Tightenings 1-4 correctly. Empirical-AC verification via `scripts/verify-empirical-acs.sh R48` must exit 0 at chore-A.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored (methodology round; R39/R42/R43/R44/R45/R46/R47 precedent).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated in R48 Implementer-authored spec at spec-emit time. Must include `scripts/pre-commit-rule-sweep.sh` for item (d).
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R48 is the round fixing R47's same-round-as-derivation failure. R48's own implementation must NOT reproduce the same pattern. Self-application gate: Q-R48-EMPIRICAL.sh applies all 4 R47 Tightenings + tests them at runtime.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if Q-R48-EMPIRICAL.sh hangs at any AC (recursion regression), HALT + DIAGNOSTIC. Do not attest exit 0 on a hanging verifier.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (c) self-application — R48 extends the Rule 1 sub-class authoring pattern's enforcement. Same-round application via Q-R48-EMPIRICAL.sh. No new cross-project rule derived this round; Surface (c) is round-conditional and applies to R47 Tightenings being correctly re-applied.

### Halt conditions

1. **Q-R48-EMPIRICAL.sh fails its own verification:** if `scripts/verify-empirical-acs.sh R48` exits non-zero at chore-A → HALT + DIAGNOSTIC. Do NOT attest PASS on a failed AC.
2. **Recursion guard breaks existing tested R44 spec § 7 check:** the `scripts/pre-commit-rule-sweep.sh` Rule 7 spec § 7 enumeration check (mechanical part validated at R44/R46) must remain functional after the recursion guard is added → HALT + DIAGNOSTIC if it breaks.
3. **Test baseline drift:** any change from 361/356/2/3 → HALT + DIAGNOSTIC. R48 must not perturb the test surface.
4. **Bash syntax error:** `bash -n` on modified scripts exits non-zero → HALT + DIAGNOSTIC.
5. **Verifier hangs at smoke test:** if `scripts/verify-empirical-acs.sh R47` (legacy verifier post-R48-fixes) or `R48` (new verifier) hangs at any AC, HALT + DIAGNOSTIC. R48's purpose is precisely to fix the hang; reproducing it is unacceptable.

### Inputs for Implementer

1. `coordination/reviews/REVIEWER-REPORT-R47.md` — full Reviewer report with per-AC findings, CRITICAL reproductions, recommended Option B fixes.
2. `coordination/specs/Q-R47-SPEC.md` — round-being-fixed spec (Q-R47-SPEC.md:165 = AC-R47-7 text; Q-R47-SPEC.md:174-175 = AC-R47-10 text).
3. `coordination/specs/Q-R47-EMPIRICAL.sh` — verifier to fix at item (a) and item (c). Specifically Q-R47-EMPIRICAL.sh:143 (AC-R47-7 grep) and Q-R47-EMPIRICAL.sh:204 (AC-R47-10 recursive invocation).
4. `coordination/SPEC-AUTHORING-CHECKLIST.md` § Empirical-AC discipline + § Tightenings 1-4 — authoring pattern reference.
5. `scripts/verify-empirical-acs.sh` — generic harness; should NOT need modification.
6. `scripts/pre-commit-rule-sweep.sh` — script to fix at item (d). Specifically rule_1_check function needs recursion-guard.
7. `coordination/MEMORIAL.md` R47 entries — REVIEWER + MEMORIAL-UPDATER subsections at R47 close.

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R48 --tier audit
```

(Operator-prepared this directive; Implementer-in-pipeline-session reads § Inputs and authors `coordination/specs/Q-R48-SPEC.md` from the scope above.)

---

## Operator-decision audit trail

R47 closed via pipeline MU at `6e8b1c6` with operator-selected Option B (ESCALATE → R48 chain extension to close the recursion loop). See `coordination/MEMORIAL.md` R47 MEMORIAL-UPDATER section for canonical record. R47 NEXT-ROLE.md at SHA `6e8b1c6` preserved in git history for the full pre-R48 operator-resolution content.
