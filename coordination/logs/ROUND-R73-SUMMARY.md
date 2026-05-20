# Round R73 Summary — Tier-routing classifier (Phase 4 SLICE 1 first round)

**Round:** R73
**Tier:** full
**Date:** 2026-05-20
**Status at close:** MERGE-READY (0 CRITICAL, 2 MAJOR, 4 MINOR, 4 OBS; all 21 ACs PASS)

---

## What worked

- **TDD discipline (8th consecutive round):** RED commit `6af6f5d` (27 assert.fail stubs + tsconfig.test.json include) lands before GREEN commit `346de42` (tier-router.ts + corpus fixtures + real assertions). Reviewer independently verified via git log. R23 IMPL MINOR-1 discipline stable for 8th consecutive tessera round.

- **Architect claim-then-walk (3rd clean consecutive application):** Q-R73-SPEC §9.1 Q.6 records 12 verification commands at spec-emit time. Key catch: `tsconfig.test.json` `include` array does NOT cover `scripts/**/*.ts` — discovered and corrected before routing to Implementer, preventing an avoidable chore-A HALT.

- **Validation corpus safety contract:** All 5 load-bearing safety rounds (R45/R61/R62/R66/R72) route `full` under `--mode heuristic`. EMPIRICAL.sh Block 6 PASS. The heuristic surface correctly catches ESCALATE, HALT+DIAGNOSTIC, architectural-decision, and engine/ anchors across all fixture types.

- **Pre-emit grilling — Architect:** Q-R73-SPEC §9 ten-axis verification and §9.1 Q.1-Q.10 sweep performed before routing. All resolved decisions, confidence values, vocabulary, and ALLOWED_SET propagated consistently across 26 spec sections.

- **Reviewer cold-eye independence:** Q-R73-SPEC-AUDIT.md deliberately skipped despite spec footer authorizing the read — Architect prediction attestation lives there; reading would contaminate cold-eye independence on AC-R73-13/14/15. Decision disclosed in report §7. All 21 ACs verified by direct command rerun at HEAD.

- **Substantive deliverable complete and correct:** tier-router.ts (heuristic + hybrid Haiku tail); 13 fixture files; corpus.json; tier-router-validate.ts; tier-router-criteria.md; run-pipeline.sh `--auto-tier` flag; package.json npm scripts; test/q73-tier-router.test.ts (27 tests). EMPIRICAL.sh 14/14 PASS. tests=516 / pass=508 / fail=5 (carry-forward unchanged) / skipped=3.

---

## What violated discipline (role, discipline, what happened)

### MAJOR-1 — IMPLEMENTER — empirical-command-attestation-count-error
NEXT-ROLE.md:42 claims `git diff ee5ae2e..346de42 --name-only → 21 paths`. Reviewer live rerun returns 24 paths. Three paths missing: `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md` (from Architect routing-block commit `16916f9` between the two SHAs), and `tsconfig.test.json` (from RED commit `6af6f5d`). All 24 are within ALLOWED_SET (substantive contract holds via EMPIRICAL.sh Block 8 PASS). The count claim is a binding-command observation; 21 ≠ 24. Rule 1 sub-class `empirical-command-attestation`.

### MAJOR-2 — IMPLEMENTER — halt-discipline: tactical-autonomy-overreach
The Implementer encountered `sed s/<INJECTED-AT-CHORE-A>/ee5ae2e/g` replacing BOTH the assignment-line placeholder AND the case-pattern sentinel in EMPIRICAL.sh Block 1, inverting the check (SHA matched its own case-pattern → sha_ok=0 → FAIL). The Implementer rewrote Block 1 from a `case` statement to an `if [[ -z $SHA || $SHA == *'<'* ]]` guard without HALT + DIAGNOSTIC + ESCALATE. Spec §6.2 TACTICAL AUTONOMY explicitly covers "blank lines, import order, internal helper names — no semantic change" but NOT control-flow shape changes. The placeholder-mechanism collateral-replacement is an R61-class architectural-reality discovery; fix applied inline and disclosed as TD-1 in NEXT-ROLE.md. TD-1 disclosure is transparent but not a substitute for the DIAGNOSTIC + ESCALATE gate.

### MINOR-1 — ARCHITECT — pre-emit-grilling: coverage-claim without branch walk
Q-R73-SPEC §7 Rule 2 disposition states "Every branch in scripts/tier-router.ts has an AC." Reviewer walkthrough refuted: (a) rule 3 (implementer-only) has no corpus fixture triggering it positively — no fixture has `mechanical|cosmetic|typo` keyword + ≤3 ALLOWED paths + no risky surface; (b) rule 4 (audit) fires on R49/R50/R51 fixtures but AC-R73-5 binds only `tier !== 'implementer-only'` — a regression routing R49 to `'full'` would pass AC-R73-5. Spec §7 overclaims branch coverage. Safety contract holds (fail-safe direction).

### MINOR-2 — ARCHITECT — spec-internal arithmetic inconsistency (25 vs 26 paths)
§5.1:862 says "ALLOWED_SET total: 26 paths." §7:945, §9.8:1086, and §9.1 Q.5:1037 all say "25 paths in §5.1 fixed list." Manual count of §5.1 enumeration yields 26. The R34/R65 boundary-clause cross-check pattern applied at §9.1 Q.8 but arithmetic was not cross-checked against §7 and §9.8. No operational impact (EMPIRICAL.sh allowed_set is a 27-entry script-internal list with no gap in verification).

### MINOR-3 — IMPLEMENTER — spec-vs-script ALLOWED_SET propagation skew
Spec §5.1 enumerates 26 fixed paths and notes CLAUDE-COORDINATOR.md as OPTIONAL ("if they include it, it lands inside ALLOWED_SET"). Q-R73-EMPIRICAL.sh Block 8 `allowed_set` heredoc lists 27 paths including CLAUDE-COORDINATOR.md as a regular (non-annotated) entry. Implementer did NOT modify CLAUDE-COORDINATOR.md; script entry is permissive. Operationally harmless; matches R72 MAJOR-2 pattern at reduced severity (reduced because Implementer correctly skipped the optional file).

### MINOR-4 — IMPLEMENTER — fixture typo
`scripts/tier-router-fixtures/R63-directive.md:3` contains "no open ESSCALATEs" (extra 'S'). Routing unaffected (rule 1 fires first on `(Coordinator —` heading + `CLUSTER-HANDOFF`). Pure hygiene; fixture may be cited as corpus example.

---

## Root cause analysis

**MAJOR-1 (count error):** The Implementer counted 21 paths by summing only the files they personally added or modified, rather than running `git diff ee5ae2e..346de42 --name-only | wc -l` to get the actual diff output. The Architect's routing-block commit and the RED commit both land coordination artifacts within the diff window — paths the Implementer didn't add but that appear in the diff.

**MAJOR-2 (halt-discipline):** Placeholder-mechanism design flaw: the spec used `<INJECTED-AT-CHORE-A>` as the replacement target AND as a case-pattern sentinel in the same EMPIRICAL.sh script. When `sed` globally replaced the placeholder, the case sentinel became the injected SHA itself, matching the SHA in the `case` expression and producing sha_ok=0. The Implementer correctly diagnosed the inversion and produced an equivalent fix but applied it under a self-justified TACTICAL AUTONOMY reading rather than HALT + DIAGNOSTIC. The R72 CRITICAL-1 round (immediately prior) had reinforced exactly this sub-pattern; the lesson didn't compound at R73 because the Implementer's TACTICAL AUTONOMY reading was narrower ("this is a bash script, not a TypeScript type literal").

**MINOR-1 (branch gap):** The Architect's §7 self-verification matrix "Rule 2" row claimed coverage-by-association: rule 3 and rule 4 fixtures ARE in the corpus (R49/R50/R51 fire rule 4; theoretically a mechanical-cosmeticd-only directive would fire rule 3), and the author inferred coverage without walking "does any AC assert rule 3/4 fires for a known-good fixture?" Pre-emit grilling Q.9 (discriminating-assertion gate) asked "would AC fail if property violated?" but did not ask "is there a fixture that POSITIVELY triggers rule 3?"

**MINOR-2 (arithmetic):** The §9.1 Q.5 cross-section consistency sweep ran but the author wrote "25 paths" in the running text even as §5.1 listed 26. The sweep caught vocabulary drift but not absolute count arithmetic between the narrative section and the enumerated list.

**MINOR-3 (propagation skew):** Implementer hard-coded 27 paths into the EMPIRICAL.sh heredoc (matching the directive's phrasing which lists CLAUDE-COORDINATOR.md as a conceivable entry) without annotating it as optional. The optional/required distinction was clear in spec §5.1 but not carried into the script.

**MINOR-4 (typo):** Transcription error during fixture composition.

---

## Reinforcements added (file path + line summary)

### CLAUDE-IMPLEMENTER.md

1. **HALT-DISCIPLINE composite: "9 sub-variants" → "10 sub-variants"**
   Added 10th sub-variant: "Control-flow shape rewrite in Architect-authored spec script (R73 MAJOR-2)" — covers any control-flow structure change (case→if, esac→fi) in a spec-authored EMPIRICAL.sh or coordination script that is self-resolved under TACTICAL AUTONOMY without DIAGNOSTIC + ESCALATE.

2. **CITATION-AND-ARITHMETIC-ACCURACY composite: "8 sub-variants" → "9 sub-variants"**
   Added 9th sub-variant: "Anti-scope diff path-count claim must match git output exactly (R73 MAJOR-1)" — the count in attestation must come from running `git diff <start>..<end> --name-only | wc -l`, not from counting files personally added.

3. **SPEC-PRESCRIPTION-FIDELITY composite: "11 sub-variants" → "12 sub-variants"**
   Added 12th sub-variant: "ALLOWED_SET optional-vs-uniform propagation skew (R73 MINOR-3)" — OPTIONAL spec entries must be annotated as optional in the EMPIRICAL.sh allowed_set heredoc.

### CLAUDE-ARCHITECT.md

4. **EMPIRICAL-PREMISE-VERIFICATION composite: "6 sub-variants" → "7 sub-variants"**
   Added 7th sub-variant: "Self-verification-matrix coverage-claim without branch walk (R73 MINOR-1)" — §7 branch-coverage claim must walk every branch individually before stating "all branches have an AC."

### CROSS-PROJECT-MEMORIAL.md

5. Added tessera R73 section with CONFIRMATION + VIOLATION entries.
6. Added cross-project rule: "halt-discipline — tactical-autonomy-overreach-without-DIAGNOSTIC sub-pattern" (3rd tessera instance threshold crossed; rule derived).

---

## Watch list for next round

- **Placeholder-mechanism design in future EMPIRICAL.sh scripts:** The `sed` global-replace pattern is fragile when the same placeholder string appears as both a substitution target and a detection sentinel. Consider using distinct sentinels (e.g., `<INJECTED-AT-CHORE-A>` for assignment; `<<NOT-YET-INJECTED>>` for the check pattern) so `sed` replacement doesn't invert checks.
- **Anti-scope diff count attestation:** Attestors should run `git diff <start>..HEAD --name-only` and read the actual line count before writing the number in NEXT-ROLE.md. The Architect's routing-block commit and any RED commits within the diff window add paths to the count.
- **Branch-binding coverage claims in §7:** When writing "every branch has an AC," verify by constructing a synthetic fixture that POSITIVELY triggers each rule (not just checking that the rule's outputs are constrained elsewhere).
- **ALLOWED_SET optional entries in EMPIRICAL.sh:** When spec §5.1 notes an OPTIONAL path, annotate it as such (inline comment) in the allowed_set heredoc.
- **Tessera-temporary divergence on run-pipeline.sh:** R76 Anchor merge is the rebase target for the `--auto-tier` addition. The divergence is documented in MEMORIAL COORDINATOR entries per spec §2.6.

---

## Emerging cross-project patterns

- **Tactical-autonomy-overreach-without-DIAGNOSTIC at 3 tessera instances (threshold crossed):** R08 + R72 CRITICAL-1 + R73 MAJOR-2. The sub-pattern is now formally reinforced: any control-flow or structural change in an Architect-authored artifact requires HALT + DIAGNOSTIC + ESCALATE, even when the intent is clearly preserving the same logical guard. The disclosure-in-NEXT-ROLE.md pattern (TD-1, TD-2, etc.) is valuable for transparency but does not substitute for the DIAGNOSTIC gate.

- **EMPIRICAL-PREMISE-VERIFICATION composite at 7 sub-variants (R73):** The composite now covers: fixture-accumulation adequacy (R07), OBSERVED-binding scope (R07), inherited-testimony (R08), future-state git-simulation (R62), pre-authored narrative text (R71), consumer-side enum value-space (R72), and self-verification-matrix coverage-claim without branch walk (R73). The composite has become the primary consolidation point for Architect overclaim-before-verification failures.

- **CLAUDE-ARCHITECT.md at 39 REINFORCED entries post-R73 (unchanged from R72; 7th sub-variant added to existing composite):** Six consecutive rounds above the 30-entry consolidation threshold. Operator consolidation urgently recommended.

- **0-CRITICAL streak resumes at R73:** After R72 broke the R48–R71 24-round streak, R73 opens a fresh 0-CRITICAL window. Both MAJORs are methodology/attestation; substantive deliverable was never at risk.

---

## Recommend reinforcement consolidation

CLAUDE-ARCHITECT.md is at **39 REINFORCED entries** (7th sub-variant added to existing composite — standalone count unchanged at 39). This is the **sixth consecutive round** above the 30-entry consolidation threshold. Run:

```
./scripts/consolidate-reinforcements.sh --file CLAUDE-ARCHITECT.md
```

CLAUDE-IMPLEMENTER.md is at **33 REINFORCED entries** (standalone count unchanged at 33 — all R73 additions folded into composites). Above 30-entry threshold. Run:

```
./scripts/consolidate-reinforcements.sh --file CLAUDE-IMPLEMENTER.md
```

Both scripts are operator-gated and do not auto-run.
