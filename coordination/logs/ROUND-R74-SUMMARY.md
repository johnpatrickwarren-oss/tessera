# ROUND-R74-SUMMARY — Haiku-for-MU + Reviewer scope differentiation (Phase 4 SLICE 1 round 2)

**Round:** R74 | **Tier:** full | **Date:** 2026-05-20
**Final HEAD:** `ebe1140` | **STATUS:** MERGE-READY (Reviewer-2; 0 CRITICAL, 1 MAJOR, 2 MINOR, 7 OBS)
**Fix cycles:** 1 (Option A — in-round bash-expansion bug fix + AC-R74-32 addition)
**Reviewer passes:** 2 (Reviewer-1 → ESCALATE; Reviewer-2 → MERGE-READY)

---

## What worked

- **Brainstorm discipline (ARCHITECT):** Three distinct approaches for Sonnet-fallback marker set documented with strengths/weaknesses/risks/rejection rationale. Approach C (hybrid four anchor classes) selected with calibration against Tessera commit history. Selection documented in spec § 0; rejection rationale in spec-audit sidecar § B.

- **Design completeness (ARCHITECT):** 17-path component inventory; 8-surface integration-point table with direction + failure modes; 6-integration failure-mode mitigation table. Decoupled architecture (selector as stand-alone CLI, bash invokes via spawn, one-way data flow) correctly modeled.

- **ALLOWED_SET propagation (ARCHITECT):** R72 MAJOR-2 canonical rule applied: 17-path set enumerated identically across spec § 1.1, § 5.1, and Q-R74-EMPIRICAL.sh Block 12 at spec-emit time.

- **TDD discipline (IMPLEMENTER):** RED commit `3baad60` (22/22 assert.fail stubs) precedes GREEN `5024b7f`. 6th consecutive Tessera round R69→R74 of verifiable TDD. Independently verified by both Reviewers.

- **Adversarial counterfactual (REVIEWER-1):** Cold-eye adversarial reasoning found CRITICAL-1 via simulated bash expansion — exactly the gap spec § 5.3 acknowledged as uncoverable by structural AC testing. Full-adversarial Reviewer scope earned its place by catching what the AC table structurally could not.

- **Option A fix cycle (IMPLEMENTER):** CRITICAL-1 bash-expansion fix applied with empirical verification (set-u correction after bash 3.2 empty-array failure), AC-R74-32 added closing the end-to-end gap, MAJOR-1 attestation corrected to Class A match, binding commands re-attested verbatim at fix-cycle HEAD.

- **Reviewer-2 cold-eye (REVIEWER-2):** Post-fix 32/32 ACs verified PASS; fix-cycle hygiene confirmed clean (no halt-discipline shortcuts); MAJOR-1 spec-propagation issue surfaced (spec § 4/§ 5.3/§ 10 stale after in-round AC addition).

- **Spec-commit-sequencing (ARCHITECT):** Spec triad `bac83e4` committed in own commit before Architect routing-block `006c38c`. R21 ARCH MINOR-1 discipline applied.

- **Amend-in-round resolution archetype (IMPLEMENTER):** R74 Option A is the 4th amend-in-round ESCALATE resolution in Tessera (R61/R66/R72/R74). Pattern stable: Reviewer-found CRITICAL → operator approves same-round fix → Implementer applies minimal in-place correction → routes to MU (not back to Reviewer for the fix-cycle proper; Reviewer-2 was dispatched as a fresh cold-eye).

---

## What violated discipline

| Role | Severity | Discipline | What happened |
|---|---|---|---|
| IMPLEMENTER | CRITICAL-1 | halt-discipline / tactical-autonomy | TD-2 rewrote bash array-args form with `${MU_SONNET:+--mu-sonnet}` to satisfy AC-R74-16 regex ordering. Claimed "Semantic behavior identical" in disclosure. `${VAR:+word}` fires on set-and-non-null — `MU_SONNET=false` (non-empty string) ALWAYS expands. Haiku-default branch structurally unreachable from pipeline for entire round. |
| IMPLEMENTER | MAJOR-1 (R1) | empirical-command-attestation | AC-R74-31 attestation attributed Sonnet match to "Class C co-occurrence (Reviewer-2 + ESCALATE in R72/R73 Reviewer prose)" — empirically false. Actual selector output: `matched_anchors=["cross-project canonical"]`, `decision_path=["marker_match","class_A"]`. R73 Reviewer block is after directive `---` boundary, excluded by `loadDirective`. Model value correct; rationale fabricated. |
| ARCHITECT | MINOR-1 | pre-emit-grilling | Q-R74-SPEC § 9.1 Q.6 Class A walk used "etc." shorthand; enumerated only `/cross-project promotion/` and missed `/cross-project canonical/i` which matches NEXT-ROLE.md:305 "cross-project canonical at R72". § 10 prediction of haiku for AC-R74-31 empirically refuted at chore-A. |
| ARCHITECT | MINOR-2 | pre-emit-grilling | § 5.3 acknowledged end-to-end pipeline-dispatch AC gap with "Rule 3 self-application gate: Reviewer in position to catch this." Gap accepted as permanent waiver; CRITICAL-1 landed in it. Acknowledged gaps should pair with minimum mitigation specification. |
| IMPLEMENTER | MINOR-3 | attestation-scope | `run-pipeline.sh:235-236` catch-all arm structurally unreachable (n/a model is short-circuited before selector invocation; only valid values are haiku-* and sonnet-*). No binding AC and not disclosed in TD disclosures. Defensive dead code is acceptable; silent dead code is not. |
| IMPLEMENTER | MINOR-4 | halt-discipline / tactical-autonomy | TD-2 disclosure claimed "Semantic behavior identical" for the bash-construct substitution without running an empirical equivalence check. TD-1 was self-evidently equivalent (invalid regex fix); TD-2 required explicit cross-check for flag-set vs flag-unset cases. |
| ARCHITECT | MINOR-5 | pre-emit-grilling | AC-R74-16 regex required script reference BEFORE `--directive` in run-pipeline.sh file text. Spec § 2.5 (c) pseudocode placed `--directive` first via array-args — meaning the spec pseudocode would FAIL its own AC-R74-16. Rule 3 self-application gate ("would spec pseudocode pass the AC?") not applied at pre-emit time. |
| IMPLEMENTER | MAJOR-1 (R2) | spec-prescription-fidelity | AC-R74-32 added to test file per Option A operator authorization, but spec § 4 AC table (last row = AC-R74-31; no AC-R74-32 entry), § 5.3 acknowledged-gap narrative ("absent"), and § 10 predictions (N_new=22, tests=538, AC-R74-31 expected haiku) left stale. R72 MAJOR-2 canonical rule applies to spec AC gate artifacts, not only ALLOWED_SET surfaces. |

---

## Root cause analysis

**CRITICAL-1 root cause:** Double failure: (a) AC-R74-16 regex was directionally overconstrained (ARCHITECT), forcing TD-2 in the first place; (b) TD-2 invoked bash `${VAR:+word}` construct without verifying that `VAR=false` (non-empty string) triggers the expansion (IMPLEMENTER). Neither failure would have been sufficient alone — the AC constraint created the pressure; the failed equivalence check landed the bug. The combined mechanism: a flawed AC forced a deviation; the deviation introduced a subtle bash semantics error; the structural AC table couldn't catch it; the adversarial Reviewer did catch it.

**MAJOR-1 R1 root cause:** Implementer reconstructed the reason for the selector's Sonnet output by examining the directive's content mentally rather than reading the selector's own `matched_anchors` and `decision_path` fields from the actual JSON output. Mental reconstruction is faster but lossy when the boundary logic (`loadDirective` section matching) excludes content the Implementer assumed was included. The encode-actual-results-verbatim discipline must extend to ALL cited fields in structured output.

**ARCHITECT MINOR-1/5 root cause:** Shared root: pre-emit grilling applied discipline to the "first alternation" of Class A (MINOR-1) and to "does the AC verify an observable property" (MINOR-5) but did not cross-apply the spec pseudocode against the AC test itself (MINOR-5) or enumerate all alternations individually (MINOR-1). Both are cases where "etc." or "verified at a high level" substituted for exhaustive enumeration.

**MAJOR-1 R2 root cause:** Option A fix cycle focus was "fix the bash bug + add the AC" — the spec document was not returned to. In-round fix cycles are operationally narrow by design; the spec-propagation discipline needs to be explicitly triggered by the operator Option A directive text. The Implementer completed the fix-cycle deliverables as specified but the spec-amendment-ALL-gate rule was not listed in Option A's scope.

---

## Reinforcements added

| File | Change |
|---|---|
| `CLAUDE-ARCHITECT.md` | EMPIRICAL-PREMISE-VERIFICATION composite: 7 → 10 sub-variants. Sub-variant 8 (MINOR-1: incomplete Class A alternation enumeration). Sub-variant 9 (MINOR-5: AC regex must self-consistent with spec pseudocode; Rule 3 self-application gate). Sub-variant 10 (MINOR-2: acknowledged gap must pair with minimum mitigation, not just Reviewer-reliance). |
| `CLAUDE-IMPLEMENTER.md` | HALT-DISCIPLINE composite: 10 → 11 sub-variants. Sub-variant 11 (CRITICAL-1 + MINOR-4: bash-construct TD requires empirical semantic equivalence check for both flag-set and flag-unset cases). |
| `CLAUDE-IMPLEMENTER.md` | SPEC-PRESCRIPTION-FIDELITY composite: 12 → 13 sub-variants. Sub-variant 13 (MAJOR-1 R2: in-round AC addition must propagate to spec § 4 table + § 5.3 + § 10 predictions). |
| `CLAUDE-IMPLEMENTER.md` | CITATION-AND-ARITHMETIC-ACCURACY composite: 9 → 10 sub-variants. Sub-variant 10 (MAJOR-1 R1: attestation supplementary JSON field values must be verbatim — not just the AC-bound field). |
| `CLAUDE-IMPLEMENTER.md` | ATTESTATION-SCOPE-FIDELITY composite: 9 → 10 sub-variants. Sub-variant 10 (MINOR-3: structurally-unreachable bash branch must be declared in TD disclosures). |
| `CLAUDE-COMMON.md` | New standalone REINFORCED line (attestation-supplementary-fields-verbatim): extend encode-actual-results-verbatim to ALL cited fields in structured JSON output across all roles. |

---

## Watch list for next round

- **AC regex self-consistency gate**: Apply to any new AC that contains a file-content regex (verify spec pseudocode would produce matching text). R74 showed this check is not automatic.
- **Bash boolean flag semantics**: When `run-pipeline.sh` uses any `${VAR:+word}` or similar boolean construct, verify the default value type (`false` string vs empty string) matches the intended expansion semantics. R74's specific bug (`MU_SONNET=false` always triggering) may have analogs elsewhere.
- **In-round AC additions**: If R75 adds any ACs mid-round (fix cycle or follow-up), spec § 4/§ 5.3/§ 10 must be updated in lockstep per SPEC-PRESCRIPTION-FIDELITY sub-variant 13.
- **Spec § 5.3 acknowledged gaps**: Any acknowledged gap that survives into R75 should be paired with a minimum mitigation specification or converted to a follow-up AC.

---

## Emerging cross-project patterns

- **Bash construct substitution as TACTICAL DEVIATION is higher-risk than it appears.** Three of the four Tessera rounds with bash-related CRITICAL findings (R72, R73, R74) involved Implementer self-justifying a construct change under TACTICAL AUTONOMY. The pattern: AC constraint forces a structural change → Implementer changes the form for compliance → semantic equivalence not verified → runtime behavior differs. The new reinforcement (HALT-DISCIPLINE sub-variant 11) closes this pattern with a required empirical equivalence check.
- **Structured JSON output requires all-field verbatim attestation.** The attestation discipline has grown from count-form (R26/R45/R73) to supplementary-fields (R74). The CLAUDE-COMMON.md encode-actual-results-verbatim rule now explicitly covers multi-field JSON output.
- **The R72 MAJOR-2 spec-amendment-ALL-gate rule generalizes.** R72's original scope was ALLOWED_SET surfaces. R74 MAJOR-1 R2 (Reviewer-2) shows it applies equally to the spec AC table, acknowledged-gaps narrative, and predictions section when those gate artifacts are made stale by in-round changes.

---

## Recommend reinforcement consolidation

- **CLAUDE-ARCHITECT.md is at 39 REINFORCED lines.** This count has not grown (new violations folded into EMPIRICAL-PREMISE-VERIFICATION composite), but the composite itself is now large (10 sub-variants = ~110 lines). Consider running `./scripts/consolidate-reinforcements.sh` against CLAUDE-ARCHITECT.md when the operator next schedules a consolidation pass. The standalone entries pre-dating the composite should be candidates.
- **CLAUDE-IMPLEMENTER.md is at 33 REINFORCED lines.** New violations folded into existing composites; standalone count stable. HALT-DISCIPLINE now at 11 sub-variants (~90 lines). Same consolidation recommendation applies at next consolidation pass.
