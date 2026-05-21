# ROUND-R88-SUMMARY — Operator-minimal baseline curation flow (Phase 5 SLICE 1)

Round: R88 (full-tier)
Date: 2026-05-21
Round-start SHA: `7887298`
Chore-A SHA: `60c3a4a`

---

## What worked

1. **TDD discipline** — RED commit `791a433` shipped test file with non-existent import (tsc fails by construction); GREEN commit `830975a` shipped implementation. Git-verifiable test-first ordering confirms discipline.

2. **Empirical-premise verification** — Spec § 0 documents 10 load-bearing premises (tsc, TAP counts, function signatures, type shapes, CLI conventions, AC-R84-14 stochastic flake). All 10 verified at round-start SHA before spec-emit.

3. **Superpowers brainstorm + design** — Spec-audit documents 3 wrapper-architecture candidates (W-A/W-B/W-C with explicit strengths/weaknesses/rejection rationale), auto-validation criterion (AV-A/AV-B/AV-C with chosen idempotency approach justified), and design sketches (component boundaries, data flow, integration points, failure modes).

4. **Right-reasons audit** — Reviewer audited 3 tests; Test A (pure-function) not self-confirming; Test B (end-to-end) materially self-confirming due to fixture construction, mitigated by Test A's independent coverage; Test C (HALT path) not strongly self-confirming. Spec § 5.3.2 acknowledged the fixture-tuning risk.

5. **Anti-scope discipline** — git diff `7887298..HEAD` returns 13 paths; all map to spec § 5.2 ALLOWED_SET carve-outs. No engine/*, no prior-round test modifications, no new dependencies.

6. **Halt-discipline** — All 10 halt conditions in spec § 6 enumerated; none fired. Implementer disclosed TD-1 (spec defect about .js gitignore behavior) and TD-2 (fixture geometry calibration) within spec-allowed tactical-autonomy latitude (§ 5.3.3). No silent workarounds.

7. **Binding-command gates** — Q-R88-EMPIRICAL.sh all 6 blocks PASS (tsc, wrapper exports, package.json script, README section, test counts, anti-scope diff). AC-R88-12 TAP bands [15,16] / [682,683] correctly account for AC-R84-14 stochastic flake per R85 lesson.

8. **Pre-emit grilling completeness** — 9-gate pre-emit audit (§ 9.1-9.9 in spec) all PASS: verifiability, unstated assumptions, scope audit, implementer-actionability, Rule 5 self-application, contradiction sweep, empirical-premise verification, EMPIRICAL.sh simulation, ALLOWED_SET completeness. No violations caught at spec-emit (violation surfaced at chore-A Implementer TD-1 disclosure).

---

## What violated discipline (by role and discipline)

### ARCHITECT

**Discipline: pre-emit-grilling**

- **MAJOR-1: architect-claim-without-empirical-walk** — Spec § 9.2 CROSS-CHECK claimed "tools/*.js and test/*.js files ARE tracked per git ls-files verification." Empirically false: `.gitignore` contains global `*.js` pattern; `git ls-files 'tools/*.js'` returns empty. Architect's verification method (`grep tools .gitignore`) was structurally wrong — would miss a global pattern not anchored to "tools". Spec § 9.7 attestation "all load-bearing empirical premises verified at SHA 7887298" was false on this premise.
  - **Severity:** MAJOR; 9th Tessera-instance of this REINFORCED-rule pattern (prior: R71, R72, R74, R86, R87; cross-project: R61, R62, R72).
  - **Sub-pattern:** Architect used wrong verification command; global pattern semantics not tested.

**Discipline: architect-encoded-pattern-coverage**

- **MINOR-1: branch-binding-coverage-gap** — Four exported surfaces have zero direct unit-test coverage: `runAutoValidation`, `buildReportMarkdown`, `DEFAULT_OUT_DIR`, `REPORT_DEFAULTS`. test/q88-baseline-curation-flow.test.ts imports them but no test calls them directly (only transitively via `runCurationFlow`). Regression to summary-string formatting or section ordering would not be caught.

- **MINOR-2: report-content-assertion-shallow** — AC-R88-9 asserts `reportContent.includes('Heterogeneous corpus')` only. `buildReportMarkdown` emits ~30 lines spanning 9 sections; only the headline verified. A bug dropping a section, mis-emitting `α_fleet` value, or printing wrong `drop_rate` decimal would pass AC-R88-9.

- **MINOR-3: ac-r88-5-assertion-coverage-gap** — AC-R88-5 asserts `exit_code`/`headline`/`override_applied` but NOT `threshold_band`. Validation-failed branch ternary on `dropRate` would be invisible if broken. Also: no test exercises the combination `validation-failed AND drop_rate ≥ 0.15 AND allowHighDrop=true`.

### IMPLEMENTER

**Discipline: spec-premise-disclosure**

- **Non-violation tactical disclosure (TD-1):** Spec § 9.2/9.7 claimed .gitignore does NOT exclude .js files; empirically false. Implementer identified at chore-A and disclosed. ALLOWED_SET .js carve-outs remain unchanged (harmlessly over-permissive since .js files never appear in the actual diff). No halt condition; disclosure appropriate.

- **Non-violation tactical disclosure (TD-2):** Spec § 3.3 suggested 5-tick runs; empirically infeasible due to FastMCD ~20-25% FPR + second-pass validation failure. Implementer used 4-tick runs per spec § 5.3.3 fixture-tuning tactical-autonomy latitude. Both disclosures documented and tied to spec-allowed exceptions.

### REVIEWER

**Discipline: right-reasons-audit**

- **OBS-1 / OBS-2 / OBS-3:** Reviewer documented 3 OBS findings (CurationOutcome.exit_code type widening, defensive null-coalesce in runAutoValidation, fixture geometry calibration sub-variant). None are defects; all documented with context.

---

## Root cause analysis (why each violation occurred)

### MAJOR-1 (architect-claim-without-empirical-walk)

**Why:** Architect enumerated a verification procedure (`grep tools .gitignore`) that was structurally sound for anchored patterns but could not detect global patterns. The `.gitignore` pattern language (gitignore glob semantics) requires a different verification tool (`git check-ignore` or `git ls-files`) than substring-grep. Architect did not distinguish between "file contains the substring tools" (what `grep` does) and "file contains a pattern that excludes tools/*.js" (what `.gitignore` semantics define).

**Process gap:** The § 9.2 CROSS-CHECK section was framed as a deliberate verification gate against claim-without-empirical-walk, yet the gate itself became the violation — the Architect ran a verification, recorded "✓", but the verification was insufficient for the claim's semantics.

**Why this is the 9th instance:** Each instance involved an Architect claiming a codebase property (closed-set membership, file-imports, file-system semantics) based on a verification procedure that was INCOMPLETE or WRONG for the property domain. R72 claimed closed-set type literals without reading the actual TypeScript union. R87 claimed post-edit-cleanup file content without grepping the actual file. R88 claimed .gitignore exclusion without using the tool that interprets .gitignore semantics.

### MINOR-1/2/3 (branch-binding-coverage gaps)

**Why:** Spec § 4.1 branch-binding table binds exported surfaces to ACs; the table assumes each export is either (a) directly called in a test or (b) bound indirectly via another AC. Surfaces like `buildReportMarkdown` and `runAutoValidation` are prescribed as exports but only exercised transitively via `runCurationFlow`. The spec's own structure permits this trade-off (end-to-end AC-R88-7 exercises both surfaces together), but the trade-off is not explicit at the AC level.

**Why this pattern is recurring:** Exported surfaces often have "utility" profiles (formatting helpers, validation runners) that are hard to unit-test in isolation without complex fixtures. Spec authors naturally defer to end-to-end testing for such surfaces. The gap is not a defect, but a known-unknown: the spec should either (a) prescribe direct unit tests for the utilities or (b) explicitly acknowledge the transitivity in the branch-binding table.

---

## Reinforcements added

| File | REINFORCED line | Summary |
|---|---|---|
| CLAUDE-ARCHITECT.md | 2026-05-21 | Empirical command verification must distinguish global vs. anchored patterns (R88 MAJOR-1: `git ls-files` or `git check-ignore` for .gitignore, not `grep`). 9th tessera instance of architect-claim-without-empirical-walk. |
| coordination/MEMORIAL.md (R88 ARCHITECT section) | Lines 2799 | Documented MAJOR-1 violation with full context. |
| coordination/MEMORIAL.md (R88 IMPLEMENTER section) | Lines 2785 | Documented TD-1 spec defect disclosure (non-violation tactical autonomy). |
| coordination/MEMORIAL.md (R88 REVIEWER section) | Lines 2799 | Documented MAJOR-1 discovery with empirical evidence. |
| CROSS-PROJECT-MEMORIAL.md (architect-claim-without-empirical-walk section) | After line 4500 | Added R88 MAJOR-1 as 9th tessera instance. |

---

## Watch list for next round

1. **Architect-claim-without-empirical-walk at 9-instance threshold:** This pattern has now surfaced 9 times in Tessera alone (plus multiple instances in other projects recorded in CROSS-PROJECT-MEMORIAL). The REINFORCED rule exists, but future rounds must apply the rule's discipline upfront — the 9th instance should have been caught at spec-emit via a "verify every codebase claim with the appropriate tool" checklist gate.

2. **Branch-binding under-coverage for exported utilities:** If R88 surfaces this gap again in a future round, the spec-fidelity standard should include a "direct-unit-test requirement for every exported function" rule or explicit acknowledgment of transitivity in the AC table.

3. **Fixture-tuning tactical autonomy scope:** R88 exercised spec § 5.3.3 latitude (fixture empirical calibration) successfully; this remains a legitimate tactical-autonomy gate. Monitor whether future rounds need tighter guidance on fixture construction constraints (FastMCD behavior, second-pass quiescence, etc.).

4. **TAP fail-count banding:** AC-R88-12 used band [15,16] / [682,683] for AC-R84-14 stochastic flake. R87 established this pattern; R88 carried it forward. The band approach remains sound for runs within ~25% flake window. If future rounds observe flake rate drift outside this band, escalate immediately.

---

## Recommend reinforcement consolidation

- **CLAUDE-ARCHITECT.md:** Current REINFORCED count = 27 lines (below 30-line threshold). No consolidation action needed at R88.
- **CLAUDE-IMPLEMENTER.md:** (Note: see CLAUDE-IMPLEMENTER.md for current count; Memorial-Updater did not review its current state this round.)
- **CLAUDE-COMMON.md:** (Note: no new REINFORCED lines added by R88; existing rules remain load-bearing.)

---

## Emerging cross-project patterns

1. **Global-pattern-vs-anchored-pattern ambiguity in infrastructure files:** Multiple projects surface this now. The rule should explicitly mention `.gitignore` glob semantics, `tsconfig.json` compiler patterns, and other infrastructure files that use non-regex pattern languages. A future canonical rule should say "use the tool that interprets the pattern language, not a generic grep/substring search."

2. **Fixture empirical calibration in statistical testing:** Tessera's R88 experience (5-tick runs infeasible due to FastMCD FPR; 4-tick runs required) mirrors patterns in other statistical-detector rounds. The pattern is: "spec prescribes a fixture construction ballpark (N ticks, M standard deviations); empirical tuning finds the ballpark is not achievable due to algorithm behavior; Implementer adjusts within tactical-autonomy latitude." This is load-bearing for statistical systems and should remain in tactical-autonomy scope, not escalated as a halt condition.

---

End of ROUND-R88-SUMMARY.md
