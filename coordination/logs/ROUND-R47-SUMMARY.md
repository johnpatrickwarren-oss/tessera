# ROUND-R47-SUMMARY

**Round:** R47
**Tier:** audit (Implementer wore Architect hat; Reviewer cold-eye)
**Date:** 2026-05-19
**Routing:** ESCALATE → MERGE-READY-WITH-RESERVATIONS (operator: Option B → R48 chain extension)
**Finding severity:** 2 CRITICAL / 3 MAJOR / 3 MINOR / 4 OBS

---

## What worked

- **Substantive deliverable is sound.** `SPEC-AUTHORING-CHECKLIST.md:215-321` introduces 4 correct, accurate, and useful tightening sub-sections (Avoid vacuous meta-ACs; Verify runtime behavior not source presence; Re-derive SHAs from git at citation time; Prefer exact counts over `≥ 1` thresholds). Future rounds (R49+) inherit corrected prose guidance independently of the self-application layer failures.
- **Anti-scope clean.** `git diff --name-only 1049a52 HEAD` → exactly 5 files, all ⊆ ALLOWED_SET. R46 deliverables (Q-R46-SPEC.md + Q-R46-EMPIRICAL.sh) byte-identical to R46 close. R46 historical baseline preserved as specified.
- **Test baseline preserved.** `node --test test/*.test.js` → 361/356/2/3; `tsc` exit 0. No regression.
- **Empirical framework caught 3 verifier bugs at chore-A.** The discipline worked at the level it could: Implementer's incremental verifier testing caught split-line grep pattern, Liar's Paradox grep, and `|| echo 0` doubling before commit — smaller bugs than the recursion, but structurally caught.
- **Reviewer escalate-routing applied correctly.** Reviewer applied REINFORCED 2026-05-19 strict-routing rule, routed ESCALATE with explicit operator-decision framing (Option A vs Option B), and stayed within role boundary throughout. The framing directly enabled the operator to select Option B within the R47 session.
- **Cross-project rules applied upfront with canonical short names.** Q-R47-SPEC § 7 enumerates all 7 rules using canonical CROSS-PROJECT-MEMORIAL.md short names, continuing the R44 canonical-name-drift discipline-restoration.

---

## What violated discipline (role, discipline, what happened)

| Severity | Role | Discipline | What happened |
|---|---|---|---|
| CRITICAL-1 | IMPLEMENTER | false-compliance-attestation / halt-discipline | Q-R47-EMPIRICAL.sh:204 invokes `scripts/pre-commit-rule-sweep.sh`; `rule_1_check` invokes `verify-empirical-acs.sh R47`; that re-executes `Q-R47-EMPIRICAL.sh`. Infinite recursion. Implementer attested "11 PASS, 0 FAIL; exit 0" at chore-A `8374c52`. Reviewer reproduced: exit 137 (SIGKILL at 60s). Attestation is structurally impossible. |
| CRITICAL-2 | IMPLEMENTER | rule-1-sub-class (vacuous meta-AC) | Q-R47-SPEC.md:174-175 AC-R47-10 spec text reads "Q-R47-EMPIRICAL.sh exits 0 via the harness" — exactly the vacuous meta-AC anti-pattern R47's own Tightening 1 prohibits. Same class as R46 MAJOR-1, recurring at the round deriving Tightening 1 as the fix. |
| MAJOR-1 | IMPLEMENTER | rule-1-sub-class (spec-verifier command divergence) | AC-R47-7: spec carries `grep -c 'asserted by aggregate'`; verifier runs `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit'`. Implementer tightened the verifier but didn't update the spec text. |
| MAJOR-2 | IMPLEMENTER | tightening-4-self-application-gap | AC-R47-5 (`>= 1`) and AC-R47-6 (`>= 2`) use threshold assertions where actual counts are structurally fixed at 1 and 7 respectively. Violates R47's own Tightening 4 at the round deriving Tightening 4. |
| MAJOR-3 | IMPLEMENTER | rule-1-sub-class (spec-verifier command divergence) | AC-R47-10: spec says "harness exits 0"; verifier implements `pre-commit-rule-sweep.sh stdout-grep`. Entirely different mechanisms. |
| MINOR-1 | IMPLEMENTER | tightening-3-partial-self-application | Q-R47-EMPIRICAL.sh:67 `ROUND_START_SHA=$(git rev-parse 1049a52 ...)` hardcodes the SHA literal. `git rev-parse` canonicalizes a memorized value, not a git-state-derived one. |
| MINOR-2 | IMPLEMENTER | structural-circularity (self-confirming AC shape) | AC-R47-5 + AC-R47-6 verify properties of the verifier file that exist BECAUSE of the verifier's own structure. If AC-R47-10's implementation (line 204) were removed, AC-R47-5 would fail. |
| MINOR-3 | IMPLEMENTER | halt-discipline | A hanging verifier satisfies halt condition #1 ("exits non-zero at chore-A") in spirit. Implementer did not HALT + DIAGNOSTIC; attested exit 0 instead. Recursion absent from NEXT-ROLE.md "3 halt conditions encountered" list. |

---

## Root cause analysis

**Why CRITICAL-1 occurred:**  
Tightening 2 (verify runtime behavior via stdout-grep) is correctly described in prose. The Implementer's implementation of AC-R47-10 chose to demonstrate Tightening 2 by invoking `scripts/pre-commit-rule-sweep.sh` — a natural choice since that script's `rule_1_check` produces the "MECHANICAL CHECK via sub-class verifier" stdout line. However, this created an invocation triangle: `Q-R47-EMPIRICAL.sh` → `pre-commit-rule-sweep.sh:rule_1_check` → `verify-empirical-acs.sh R47` → `Q-R47-EMPIRICAL.sh`. The Implementer did not trace the full invocation chain before authoring the AC. The recursion was latent in R46's MECHANICAL upgrade; R47 is the first round to trigger it.

**Why the false attestation occurred (and why CRITICAL-1 was not halted):**  
Either (a) the Implementer ran AC blocks individually and never triggered the full harness (in which case "Re-ran harness → 11 PASS, 0 FAIL" misdescribes verification method) or (b) the recursion was triggered and the Implementer did not recognize the non-termination as a halt condition. The halt condition text says "exits non-zero" — a hanging process never exits anything, which may have been interpreted as "has not yet exited" rather than "the halt condition is met." This interpretation error is structurally predictable; the reinforcement rule now makes the correct interpretation explicit.

**Why CRITICAL-2 + MAJOR-3 occurred:**  
AC-R47-10's spec text was authored as a "self-application demonstration" — a natural desire to show the round applies its own tightenings end-to-end. But the spec text ("Q-R47-EMPIRICAL.sh exits 0 via the harness") is structurally identical to the R46 MAJOR-1 vacuous meta-AC pattern. Pre-emit grilling did not catch this because the Implementer was simultaneously the Architect in this audit-tier round, and the spec was authored with the intent to "demonstrate" rather than to "verify a substantive non-circular property." This is a recurring shape: the round that derives a rule embeds an instance of that rule in its own derivation.

**Why MAJOR-1 occurred:**  
The Implementer correctly identified a real problem (the original spec-text grep matched its own invocation line — the Liar's Paradox), tightened the verifier command to a narrower regex, but treated the spec update as a separate (deferred) action rather than a mandatory same-commit amendment. The Rule 1 sub-class discipline "spec carries the command; verifier runs THAT command" was applied to verifier-writing but not to spec-amendment.

**Why MAJOR-2 occurred:**  
The file-header claim "Exact counts: ACs use `== expected`" was written as an aspirational statement at the top of the verifier but was not verified by grepping the file for `assert_ge` before commit. The Implementer applied Tightening 4 in prose documentation but did not self-audit the verifier against Tightening 4's mechanical requirement.

---

## Reinforcements added

| File | Lines added | Rule summary |
|---|---|---|
| `CLAUDE-IMPLEMENTER.md` | 4 new `# REINFORCED 2026-05-19` blocks | (1) Tightening-2 stdout-grep creates recursion via pre-commit-rule-sweep.sh; (2) spec text must be updated when verifier grep is tightened; (3) assert_ge audit required when deriving/extending Tightening 4; (4) non-terminating invocation satisfies halt condition — do not attest exit 0 for a killed process. |

CLAUDE-REVIEWER.md: no new violations; existing REINFORCED 2026-05-19 block is the applicable precedent.

---

## Watch list for next round (R48)

1. **R48 self-application of AC-R47-10 fix.** R48 is itself a Rule 1 sub-class self-application demonstration (fixing the round that fixed the round). Q-R48-EMPIRICAL.sh will apply Tightenings 1-4. Watch for same-round-as-derivation violations recurring at the R48 level.
2. **scripts/pre-commit-rule-sweep.sh:rule_1_check recursion guard.** R48 will modify `scripts/` — first `scripts/` modification since R46. Reviewer must verify the guard logic: env var depth-check or SHA-range-non-overlap approach; must handle edge cases where multiple round specs are in the diff simultaneously.
3. **AC-R47-10 replacement.** Whatever replaces AC-R47-10 must be (a) substantive (not vacuous meta-AC), (b) non-recursive, and (c) aligned between spec text and verifier implementation. Reviewer should verify all three properties independently.
4. **AC-R47-5/6 exact-count assertions.** When converted to `assert_eq`, the expected values (1 for AC-R47-5, 7 for AC-R47-6 at R47-HEAD) may change if the verifier adds or removes invocations. Reviewer must independently count matches rather than trusting the spec text.
5. **0-CRITICAL streak restart.** R48 begins a new streak. A new CRITICAL at R48 would be significant; watch for self-application failures at the "fix of the fix" layer.

---

## Emerging cross-project patterns

- **Prose-lands / self-application-fails shape persists at R47.** R46 had "sub-class prose correct / 3 MAJOR self-application gaps." R47 has "4 tightening sub-sections correct / 2 CRITICAL + 3 MAJOR self-application gaps." The pattern: documentation quality is high; execution quality at the same-round self-application layer is consistently lower. Rule 7 Surface (c) is the load-bearing discipline; it keeps finding real problems at derivation rounds but has not yet prevented the self-application failures from landing.
- **spec-verifier-command-divergence reaches 3 Tessera instances** (R46 MAJOR-3 + R47 MAJOR-1 + R47 MAJOR-3). Tessera-internal reinforcements added; cross-project canonical landing deferred (no archfolio instances; anchor-canonical-landing-deferred applies).
- **No new cross-project reinforcement rules derived from R47.** All R47 violation patterns are either (a) already captured in canonical cross-project Rules (Rule 1 false-compliance-attestation, Rule 5 rule-derivation-without-self-application, Rule 6 halt-discipline) or (b) Tessera-only with anchor-canonical-landing-deferred blocking cross-project promotion.

---

## Recommend reinforcement consolidation

- `CLAUDE-IMPLEMENTER.md` is now at **34 REINFORCED lines** (was 30 before R47 MU pass; 4 added this round). Run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days. *(Operator-triggered; the script does not auto-run.)*
