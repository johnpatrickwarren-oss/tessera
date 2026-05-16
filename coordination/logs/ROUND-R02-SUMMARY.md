# ROUND-R02-SUMMARY — Phase 1 SLICE 2a (schema extension + R01 carry-forward dispositions)

_Written by MEMORIAL-UPDATER at round close. Date: 2026-05-16._
_HEAD at Reviewer audit: b48ac8e (attestation SHA: 8ef1735)._
_Binding commands (Reviewer-run independently): all 4 exit 0 (typecheck + q02 5/5 + q01 9/9 + smoke 5/5)._

---

## What worked

**Architect:**
- Brainstormed 5 distinct approaches; selected Approach B (SLICE 2a schema-only + R01 carry-forward dispositions) with explicit rationale and rejection documentation.
- Applied the R01-derived cross-section consistency pass (first use of the REINFORCED discipline) before grilling sign-off. All 9 resolved-decision checks passed; REVIEWER independently adversarial-grepped all 9 and confirmed each — the reinforcement survived its first adversarial test.
- Pre-emit grilling executed inline in spec (`§ Grilling output`): 3 unstated assumptions surfaced and resolved; 4 likely-Reviewer findings pre-empted in spec text.
- Anti-scope enumerated 12 explicit SAS clauses with HALT triggers; 6 unbundled R01 MINORs explicitly fenced via SAS-9.

**Implementer:**
- No halt conditions encountered; all 5 deltas resolved mechanically per spec pseudocode.
- TDD ordering verified: RED commit c45e977 precedes GREEN commit 2cab322 (~2 min wall-clock). Closes R01 MINOR-9 (TDD unverifiable due to session crash).
- Implementer notes 1/2 verification commands executed before committing GREEN (`grep -c "export type CellDimension"` → 1; cell_confidence in config.ts → 0; typecheck exit 0).
- Anti-scope: all 12 SAS clauses honored; Reviewer's independent git diff confirmed no forbidden file edits.
- All 6 R01 carry-forward dispositions landed as specified (MAJOR-3, MAJOR-4, MAJOR-5, MINOR-1, MINOR-2, MINOR-7).

**Reviewer:**
- Ran all 4 binding commands independently at HEAD (R06+ standing policy; first tessera application).
- Surfaced 0 CRITICAL + 0 MAJOR + 5 MINOR + 5 OBS — adversarial mandate honored (not a rubber-stamp).
- Right-reasons audit for 3 tests; none fully self-confirming.
- Cold-review independence held; audit sidecar excluded per user directive (disclosed).
- Correctly marked AC-2 PARTIAL (not PASS) for the inverse-convention gap.

**Round result:** MERGE-READY. First tessera round without MAJOR findings.

---

## What violated discipline (role, discipline, what happened)

### VIOLATION 1 — ARCHITECT | pre-emit-grilling (MD-F6 sub-instance)
Spec Implementer note 4 + OQ-4 mis-predicted CellKey shape as `Record<CellDimension, string | number>`. Actual shape at `engine/types/primitives.ts:44` is `Record<string, string | number>`. The Architect's P3.3 file-opened-discipline listed `engine/types/config.ts` line-ranges but did not include `engine/types/primitives.ts` — the file where `CellKey` is declared.

### VIOLATION 2 — IMPLEMENTER | cast-disposition-conditional-not-honored (REVIEWER MINOR-3)
Spec note 4 gave a two-branch conditional: (a) strip `as any` cast if mechanical, OR (b) leave cast + add `// SLICE 2b: drop cast when CellKey factory lands` comment. Neither branch honored completely. Additionally, the Implementer surfaced the shape divergence in MEMORIAL but rationalized "retained per spec pseudocode" rather than following spec note 4's explicit directive for the shape-divergence branch ("adjust the test literal to satisfy the real shape rather than retaining `as any`").

### VIOLATION 3 — IMPLEMENTER | cast-widening-incidental (REVIEWER MINOR-4)
q01-schema-additions.test.ts:56 widened cast from R01's narrow `as Pick<CompiledConfig, 'per_shard_cells'>` to `as CompiledConfig`. The wider cast suppresses tsc's required-field checks for `version/compiler_version/compiled_at/baseline_ref/alpha_budget`. Delta 8 only required PerShardCell shape restructure + `n_samples` addition; the widening was not required by spec text (spec pseudocode showed the wider form, contributing half-attribution to the Architect).

---

## Root cause analysis

### VIOLATION 1 (ARCHITECT CellKey mis-prediction)
Root cause: Architect's file-opened-discipline checks which file lines to read, but the heuristic is "open the file that contains the change site" rather than "open all files where types referenced by name in pseudocode are declared." Config.ts is the change target; primitives.ts is the declaration site of CellKey. These differ. The P3.3 discipline as practiced does not automatically extend to transitive declaration sites of imported types. The spec's own conditional ("if actual shape differs from prediction, adjust the test literal") required accurate prediction, which required opening primitives.ts.

### VIOLATION 2 (IMPLEMENTER cast-disposition)
Root cause: The spec's conditional directive contained two parts — (1) a prediction ("CellKey is `Record<CellDimension, …>`") and (2) a divergence branch ("if actual shape differs, adjust rather than retaining `as any`"). The Implementer correctly surfaced that the prediction was wrong, but defaulted to "follow the pseudocode form" rather than "follow the spec's text for the divergence case." The MEMORIAL entry acknowledged the shape divergence but cited "spec pseudocode" as justification — misattributing the spec's conditional. Additionally, the fallback clause of the conditional (add the deferral comment if stripping is non-mechanical) was also not executed.

### VIOLATION 3 (IMPLEMENTER cast-widening)
Root cause: Delta 8 instructed "update q01-schema-additions.test.ts to use the restructured PerShardCell shape." The spec pseudocode for this update showed `as CompiledConfig` rather than `Pick<…>`. The Implementer followed the pseudocode form without noticing that the existing code used a tighter form that was more type-safe. The spec pseudocode presented the wider form as the target; the Implementer did not exercise independent judgment to prefer the narrower, pre-existing form. Half-attribution to Architect for showing the wider form in pseudocode without noting the regression risk.

---

## Reinforcements added

### CLAUDE-ARCHITECT.md — 2 new REINFORCED lines appended (after existing line 94)

1. **Type-declaration-site check** (2026-05-16): When spec pseudocode instantiates a named external type, open the file where that type is DECLARED (not just used/re-exported), read its exact definition, and update pseudocode if the actual shape diverges from prediction. Detected R02: CellKey at primitives.ts:44 not opened; predicted shape wrong; cascaded to MINOR-3.

2. **File-deletion track-state verification** (2026-05-16): When specifying `git rm` for a file, verify git-tracked status via `git ls-files <path>` before prescribing. If track-state uncertain, prescribe conditional form. Detected R02: ville-preservation .test.js was gitignored; spec prescribed `git rm`; Implementer adapted correctly but spec was over-broad (OBS-2).

### CLAUDE-IMPLEMENTER.md — 2 new REINFORCED lines appended (after existing line 175)

1. **Spec-conditional-not-honored rule** (2026-05-16): When spec gives a two-branch conditional, honor one branch completely. When actual state diverges from spec's prediction, follow the spec's explicit directive for the divergence case — not the nominal pseudocode. Detected R02: CellKey shape diverged; Implementer followed pseudocode rather than spec note 4's "adjust literal" directive (MINOR-3).

2. **Minimum-delta test update rule** (2026-05-16): When updating a test as a mechanical consequence of a spec delta, restrict changes to the minimum delta required. Do not widen type casts or assertions beyond spec's explicit instructions. Detected R02: Delta 8 required PerShardCell restructure; cast widening from `Pick<…>` to `as CompiledConfig` was incidental (MINOR-4).

---

## Watch list for next round (R03 / SLICE 2b)

1. **CellKey `as any` cast disposition**: MINOR-3 recommends stripping the cast (likely mechanical given `Record<string, string | number>` is more permissive than the literal `{hour_of_day: 14, day_of_week: 3}`). When this test file is next touched, strip cast first, verify tsc clean.

2. **q01 test `as CompiledConfig` widening**: MINOR-4 recommends reverting to `Pick<CompiledConfig, 'per_shard_cells'>`. Next touch of this test should include this tightening.

3. **MINOR-1 mandatory-ness binding gap**: AC-1 does not include a `// @ts-expect-error` sibling test for the mandatory-field TS2741 failure path. Tighter binding would be a one-liner; add at next q02-schema-extension.test.ts modification.

4. **MINOR-2 inverse-convention gap**: AC-2 does not verify that `mean_vector`/`covariance` are ABSENT at warm_start, or that SLICE 2b runtime population enforces the convention. Worth adding negative-case tests at SLICE 2b runtime implementation.

5. **MINOR-5 cardinality binding direction**: CellDimension/CellConfidence cardinality tests are one-directional (catch removal, not addition). If a new tier or dimension is added in SLICE 2b, add an exhaustiveness check (`Exclude<T, U>` form or similar).

6. **OBS-4 PRD vocabulary drift**: PRD AC-P2 uses `cell_confidence` but code uses `confidence` / `CellConfidence`. Fix at next PRD revision.

7. **Architect file-opened discipline**: For each type referenced by name in R03 spec pseudocode, explicitly list its declaration site file (not just the usage file) in the P3.3 section.

---

## Emerging cross-project patterns

1. **MD-F6 sub-variant: declaration-site vs. usage-site confusion** — Tessera has now produced two consecutive MD-F6 sub-instances: R01 (cited inherited type-state from the wrong source level) and R02 (opened config.ts/usage site, not primitives.ts/declaration site). The pattern is "Architect's file-opened habit tracks the change target, not the dependency graph." The new "type-declaration-site check" reinforcement targets this directly; watch for recurrence at R03.

2. **Implementer spec-conditional-rationalization** — When a spec gives an explicit divergence-case directive ("if actual differs from prediction, do Y"), the Implementer defaulted to following the pseudocode (the nominal case) rather than the spec text (the divergence case). This is the mirror-image of "spec-internal-contradiction" (R01 violation): there, the Implementer correctly absorbed contradictions; here, the Implementer incorrectly defaulted to pseudocode when spec text was explicit. Both are spec-reading failures at the intersection of pseudocode and text.

3. **First tessera round with Reviewer-side binding-command execution** — Following the R06+ cross-project standing policy, all 4 binding commands were run independently. This immediately provides independent corroboration for all PASS determinations and establishes the pattern for tessera going forward.

4. **Cross-section consistency pass: first use, first adversarial verification, passed** — The R01-derived REINFORCED discipline (CLAUDE-ARCHITECT.md) was applied as a structural spec section for the first time in R02. Nine resolved-decision checks passed, and the REVIEWER independently verified all 9 via adversarial grep. The reinforcement compound-held on its first application.

---

_Round R02 closed: MERGE-READY. Status: ROUND-COMPLETE._
