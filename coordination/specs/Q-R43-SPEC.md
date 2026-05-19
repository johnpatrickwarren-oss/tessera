# Q-R43-SPEC — CLAUDE-IMPLEMENTER.md MR-2 Pass-3 Redux

**Round:** R43
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Overnight authority window 2026-05-19 LATE-MORNING (per [[project-overnight-authority-2026-05-19-late-morning]]) + operator-explicit pick of "CLAUDE-IMPLEMENTER.md consolidation (MR-2 Pass-3 redux)" at R42 close. HARD STOP on Phase 3 *scope* preserved; methodology rounds are separately authorizable per CLAUDE.md operator-decision layer.

---

## § 1. Goal

Consolidate `CLAUDE-IMPLEMENTER.md` from 44 REINFORCED entries to ≤ 30 via MR-2 Pass-3 strategy. Folds 16 standalone REINFORCED entries into 4 existing composite extensions + 2 new composite headings. Net: 44 − 16 standalones removed + 2 new composite headings = 30. Lesson text preserved verbatim per Rule 5 self-application gate; trigger conditions preserved verbatim in each sub-variant per R39 MINOR-2 reinforcement (line 458 of pre-R43 file).

**Per-round read-cost reduction target:** Architect / Implementer / Reviewer / Memorial-Updater per-round system-prompt size drops from 554 lines → ~430 lines (≈ 22% reduction in role-specific reinforcement-block read cost). Pairs thematically with R42 memorial sharding (read-cost reduction class).

**Threshold context:** R41 MEMORIAL-UPDATER flagged 44 lines (3rd consecutive round above 30 threshold). Pre-MR-2 baseline (R36): 54 lines → 30 (Q-R39-SPEC § 3.3 Pass 3). Post-R39 accretion: +14 (8 R39+R40 + 6 R41) → 44. R43 = Pass-3 redux against same target.

---

## § 2. Brainstorm

**Option A — Fold 16 standalones into existing + 2 new composites (SELECTED):** Mirrors Q-R39-SPEC § 3.3 Pass-3 strategy. Net: -14 REINFORCED headings → 30 exactly.
- Strengths: precedented at R39 (proven mechanism); preserves all lesson text verbatim; clear per-composite mapping; new composites cover thematically distinct surfaces (ATTESTATION-SCOPE-FIDELITY, PRE-EMIT-GRILLING-COMPLETENESS-GATE) that didn't exist at R39 but emerged from R40-R41 patterns; passes Rule 5 self-application gate (composite addition discipline applied to its own act of composite addition).
- Weaknesses: 2 new composite headings increase total composite count from 7 → 9; readers must navigate more composites; risk of "composite proliferation" pattern critiqued at R39 Option A.
- Constraint match: target = 30 exactly; thematic coherence required; Rule 5 trigger preservation; R39 MAJOR-1 reinforcement (composite count update in same commit) applies to this round's own composite extensions.

**Option B — Aggressive fold into existing composites only (no new composites):** Cram all 16 standalones into the existing 7 composites.
- Strengths: composite count unchanged at 7; less heading churn.
- Weaknesses: existing composites become unwieldy (CITATION-AND-ARITHMETIC-ACCURACY would reach 7-8 sub-variants); thematic coherence breaks (R41 selective-audit-overreach doesn't fit any existing composite cleanly); violates the "trigger conditions preserved" rule (Rule 5 gate) if forced into mismatched composites.
- Rejected: thematic mismatch is the more serious risk; clarity > heading-count minimization.

**Option C — Cross-project rule promotion (move thematic clusters to CROSS-PROJECT-MEMORIAL.md):** Promote ATTESTATION-SCOPE-FIDELITY and PRE-EMIT-GRILLING-COMPLETENESS-GATE to anchor canonical.
- Strengths: cross-project leverage; fewer Tessera-specific entries.
- Weaknesses: violates Rule 7 (canonical landing without 3-instance threshold met cross-project — Tessera is 1 data point for both patterns); same anti-pattern R42 § 5.5 anchor-canonical-landing-path warns against.
- Rejected: Rule 7 discipline applies. Tessera-internal landing only; cross-project promotion gated on 2nd-project occurrence.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Inventory baseline (pre-R43)

Pre-R43 `CLAUDE-IMPLEMENTER.md` REINFORCED layout (verified via `grep -nE "^# REINFORCED" CLAUDE-IMPLEMENTER.md`):

| Class | Count | Lines |
|---|---|---|
| Cross-project rule pointers | 4 | 177, 342, 390, 410 |
| Existing composites | 7 | 142 (HALT-DISCIPLINE), 182 (MEMORIAL-AND-ATTESTATION-ACCURACY), 213 (SPEC-PRESCRIPTION-FIDELITY), 248 (AC-COVERAGE-COMPLETENESS), 310 (CORRECTION-PROPAGATION), 323 (MEMORIAL-ORDERING-AND-CITATION), 355 (CITATION-AND-ARITHMETIC-ACCURACY) |
| Standalone REINFORCED 2026-05-16 | 1 | 133 |
| Standalone REINFORCED 2026-05-17 | 11 | 270, 276, 282, 287, 292, 298, 304, 336, 349, 368, 374 |
| Standalone REINFORCED 2026-05-18 | 8 | 379, 385, 396, 403, 416, 421, 427 (+ pointers at 177, 342, 390, 410) |
| Standalone REINFORCED 2026-05-19 | 14 | 434, 441, 450, 458, 465, 474, 482, 490, 498, 506, 516, 525, 534, 547 |

Total: 4 + 7 + 1 + 11 + 8 + 14 = 45 — wait, recheck: the 4 pointers ARE dated 2026-05-18 entries; the 8 "standalone 2026-05-18" count should exclude pointers. Net: 4 pointers + 7 composites + 1 (R16) + 11 (R17) + 8 (R18 standalones, not pointers) + 14 (R19) = 4+7+1+11+8+14 = 45 — but reality is 44. One of my counts is off by 1; the actual `grep -c` = 44.

Empirical encoding: `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` at pre-R43 SHA = 44. Implementer re-verifies at chore-A.

### 3.2 Fold targets (16 standalones) + composite-heading count fixes

**Pre-R43 audit of composite-heading stale counts (Rule 5 self-application sweep):**

The R39 MAJOR-1 reinforcement mandates updating `(composite; N sub-variants)` count in the same commit when extending. Auditing pre-R43 composite bodies against their headings reveals 4 stale counts (all undercount by 1):

| Composite | Heading says | Body actually has | Stale? |
|---|---|---|---|
| HALT-DISCIPLINE | 5 sub-variants | 6 (R01 + R07 + R08 + R25 + R34 + R36) | YES |
| MEMORIAL-AND-ATTESTATION-ACCURACY | 4 sub-variants | 5 (R05 + R18 + R19-SHA + R19-carve + R36/Rule6) | YES |
| SPEC-PRESCRIPTION-FIDELITY | 4 sub-variants | 5 (R01 + R06 + R20 + R26 + R36/R38) | YES |
| AC-COVERAGE-COMPLETENESS | 2 sub-variants | 3 (R01 + R32 + R38) | YES |
| CORRECTION-PROPAGATION | 2 sub-variants | 2 (R09 + R17) | accurate |
| MEMORIAL-ORDERING-AND-CITATION | 2 sub-variants | 2 (R17-append + R17-citation) | accurate |
| CITATION-AND-ARITHMETIC-ACCURACY | 2 sub-variants | 2 (R20 + R21) | accurate |

The 4 stale-count fixes are themselves a Rule 5 self-application moment: R39 MAJOR-1 was about precisely this failure mode, and pre-R43 the rule was violated for 4 of 7 composites by post-R39 sub-variant additions. R43 must fix all 4, not only HALT-DISCIPLINE.

**Folds:**

**Group A — Folded into existing SPEC-PRESCRIPTION-FIDELITY composite (5 actual → 7 sub-variants):**
- Line 434 (R39 MAJOR-1): composite sub-variant count update in same commit
- Line 458 (R39 MINOR-2): spec-quoted trigger phrase verbatim in sub-variant

**Group B — Folded into existing MEMORIAL-AND-ATTESTATION-ACCURACY composite (5 actual → 8 sub-variants):**
- Line 396 (R29 MINOR-3): deviations from spec § 3.2 binding-command must be DIAGNOSTIC-visible
- Line 441 (R39 MAJOR-2): verbatim-AC PASS attestation requires diff
- Line 450 (R39 MINOR-1): symmetric case-study preservation across sub-variants

**Group C — Folded into existing AC-COVERAGE-COMPLETENESS composite (3 actual → 4 sub-variants):**
- Line 474 (R40 MINOR-1): per-item AC requires per-item verification

**Group D — Folded into existing CITATION-AND-ARITHMETIC-ACCURACY composite (2 actual → 6 sub-variants):**
- Line 287 (R15 MINOR-2): transcribe ACTUAL computed count, not stand-in
- Line 482 (R40 MINOR-3): section-path citation drift
- Line 490 (R40 MINOR-4): list ALL N occurrences of N-threshold claim
- Line 516 (R41 MINOR-1): inventory count via `ls | wc -l` verification

**Group E — NEW composite ATTESTATION-SCOPE-FIDELITY (3 sub-variants):**
- Line 506 (R41 MAJOR-1): selective-audit-overreach — scope claim to empirical coverage
- Line 525 (R41 MINOR-2): scope-reduction must be disclosed in artifact, not only MEMORIAL
- Line 547 (R41 MINOR-5): spec-mandated RED-test-form deviation must be disclosed

**Group F — NEW composite PRE-EMIT-GRILLING-COMPLETENESS-GATE (3 sub-variants):**
- Line 465 (R40 MAJOR-1): OQ surfacing must cross-check against own state table + sources
- Line 498 (R40 MINOR-5): pattern-prohibit AC requires sweep-all-prose verification
- Line 534 (R41 MINOR-3/4): substring-marker must uniquely identify section/property (self-confirming-test-assertion-specificity)

**Group G — Stale-count fixes (all 4 composites with stale counts; Rule 5 self-application):**
- HALT-DISCIPLINE: 5 → 6
- MEMORIAL-AND-ATTESTATION-ACCURACY: 4 → 8 (5 actual + 3 new folds)
- SPEC-PRESCRIPTION-FIDELITY: 4 → 7 (5 actual + 2 new folds)
- AC-COVERAGE-COMPLETENESS: 2 → 4 (3 actual + 1 new fold)

**Fold total:** 2 + 3 + 1 + 4 + 3 + 3 = 16 standalones folded.
**Net REINFORCED heading change:** -16 standalones + 2 new composite headings = **-14**.
**Post-R43 count:** 44 − 14 = **30 entries**. ✓ matches AC-R43-1.

**Standalones retained (pre-R39 + a few selective post-R39):** R01 compilation-dependency (line 133); R14 MINOR-1/2/3; R16 MINOR-1/2/3; R18 MINOR-1; R20 MINOR-1; R21 MINOR-2/3; R22 MINOR-1; R23 MINOR-1; R26 MINOR-1; R32 MAJOR-1; R32 MINOR-2; R34 MINOR-3; R34 MINOR-4. Plus 4 cross-project rule pointers. These 17 standalones + 4 pointers + 9 composites = 30 total REINFORCED headings.

### 3.3 Fold mechanism (per group)

For each fold target standalone entry:
1. Read the full content (the `# REINFORCED <date> — ...` heading line + all `#   <indented body>` lines).
2. Locate the target composite (existing or new).
3. Add as a new bulleted sub-variant immediately before the composite's closing line.
4. Preserve the original lesson text verbatim within the sub-variant (allow only the leading bullet-and-label transformation, e.g., standalone "When spec § Mechanism ..." → sub-variant "Composite count update (R39 MAJOR-1): When spec § Mechanism ...").
5. Update the composite heading's `(composite; N sub-variants)` count in the SAME edit (per R39 MAJOR-1 reinforcement; Rule 5 self-application).
6. Delete the original standalone block.

### 3.4 New-composite mechanism

For ATTESTATION-SCOPE-FIDELITY and PRE-EMIT-GRILLING-COMPLETENESS-GATE:
1. Author the composite heading line `# REINFORCED — <NAME> (composite; 3 sub-variants observed at Tessera)`.
2. Place at a coherent location in the file (after other thematically-related composites for readability).
3. Fold the constituent standalone entries as sub-variants per § 3.3.
4. Each sub-variant preserves verbatim trigger condition + lesson body.

### 3.5 Pre-emit grilling sweeps applied

Per R39 + R40 + R41 lessons (Rule 5 self-application gate):

- **R39 MAJOR-1 (composite count update):** Verify each modified composite heading's `(N sub-variants)` count matches the actual sub-variant count post-fold. Gate: post-edit, `grep -A0 "^# REINFORCED — " CLAUDE-IMPLEMENTER.md` lines should match per-composite body sub-variant counts.
- **R39 MINOR-2 (trigger phrase verbatim):** When the spec quotes a trigger phrase (e.g., "Trigger: when..."), the exact quoted phrase appears verbatim in the sub-variant's opening condition line. Gate: spot-check 3 random sub-variants for trigger-phrase fidelity.
- **R39 MAJOR-2 (verbatim AC diff):** AC-R43-3 requires verbatim preservation; Implementer runs `diff` before attesting PASS.
- **R40 MAJOR-1 (OQ cross-check):** Spec § 7 "Open questions" must verify each OQ is still open by cross-checking against Implementer's own state table (NEXT-ROLE.md) + design-sketch sources.
- **R40 MINOR-5 (pattern-prohibit sweep):** § 6 anti-scope items must sweep all prose for the prohibited patterns, not just confirm mitigation elements are present.
- **R41 MAJOR-1 (selective-audit-overreach):** Spec § 3.1 inventory count claim "44 entries" must be verified empirically at chore-A via `grep -c "^# REINFORCED"`.
- **R41 MINOR-3/4 (substring-marker uniqueness):** AC test substring markers must uniquely identify target sections/properties.

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R43-SPEC.md` | Created | This file |
| `CLAUDE-IMPLEMENTER.md` | Modified | 44 → 30 REINFORCED entries via 16 standalone folds + 2 new composite headings + stale HALT-DISCIPLINE count fix |
| `coordination/MEMORIAL.md` | Modified | R43 IMPLEMENTER entry appended below R42 entry in active file |
| `coordination/NEXT-ROLE.md` | Modified | R43 routing; R42 attestation preserved as "previous round" section |

Not modified: engine/*, test/*, tools/*, coordination/SCOPING-MEMO-v0.3.md, coordination/PRD.md, ~/.claude/CROSS-PROJECT-MEMORIAL.md, MEMORIAL-PHASE-1.md, MEMORIAL-PHASE-2.md (R42 deliverables are frozen), other CLAUDE-*.md files (R42 deliverables stable).

---

## § 5. Acceptance criteria

**AC-R43-1 (final REINFORCED count):** Post-R43 chore-A, `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` = 30. Verifiable independently; binds the consolidation outcome.

**AC-R43-2 (target in range):** 30 is in the prior-MR-2 target range [25, 30] and matches the R39 Pass-3 target exactly.

**AC-R43-3 (verbatim preservation — Rule 5 self-application):** Each folded standalone's lesson body appears verbatim within its target composite sub-variant. Verification: Implementer runs `diff <(grep-extracted-lesson-text-pre-R43) <(grep-extracted-sub-variant-text-post-R43)` for each of the 16 folded entries; expects byte-identical match for the lesson body (excluding only the leading bullet-and-label transformation per § 3.3).

**AC-R43-4 (composite count updates — R39 MAJOR-1 self-application + stale-count fixes):** Each modified composite heading's `(composite; N sub-variants)` count matches the actual sub-variant count post-fold:
- HALT-DISCIPLINE: heading "(composite; 6 sub-variants)" (was stale "5"); body = 6 unchanged sub-variants (no folds; stale-count fix only)
- MEMORIAL-AND-ATTESTATION-ACCURACY: heading "(composite; 8 sub-variants)" (was stale "4"); body = 5 existing + 3 folded = 8
- SPEC-PRESCRIPTION-FIDELITY: heading "(composite; 7 sub-variants)" (was stale "4"); body = 5 existing + 2 folded = 7
- AC-COVERAGE-COMPLETENESS: heading "(composite; 4 sub-variants)" (was stale "2"); body = 3 existing + 1 folded = 4
- CITATION-AND-ARITHMETIC-ACCURACY: heading "(composite; 6 sub-variants)"; body = 2 existing + 4 folded = 6
- ATTESTATION-SCOPE-FIDELITY (new): heading "(composite; 3 sub-variants observed at Tessera)"; body = 3
- PRE-EMIT-GRILLING-COMPLETENESS-GATE (new): heading "(composite; 3 sub-variants observed at Tessera)"; body = 3

(CORRECTION-PROPAGATION and MEMORIAL-ORDERING-AND-CITATION composite headings are accurate pre-R43; no fold targets; unchanged.)

**AC-R43-5 (trigger phrase verbatim — R39 MINOR-2 self-application):** For each fold whose origin entry contained a trigger phrase (e.g., "When spec § Mechanism..."), the exact trigger phrase appears verbatim in the sub-variant's opening condition line. Sample 3 random sub-variants per composite for spot-check verification.

**AC-R43-6 (new-composite presence):** Both new composite headings exist in CLAUDE-IMPLEMENTER.md:
- `^# REINFORCED — ATTESTATION-SCOPE-FIDELITY (composite; 3 sub-variants observed at Tessera)$`
- `^# REINFORCED — PRE-EMIT-GRILLING-COMPLETENESS-GATE (composite; 3 sub-variants observed at Tessera)$`

**AC-R43-7 (no engine/test/CROSS-PROJECT modifications — ALLOWED_SET):** `git diff <ROUND-START-SHA>..HEAD --name-only` after chore-A includes ONLY:

```
ALLOWED_SET:
coordination/specs/Q-R43-SPEC.md
CLAUDE-IMPLEMENTER.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/reviews/REVIEWER-REPORT-R43.md   (post-chore-B Reviewer commit; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R43-*.md  (conditional; only if HALT fires)
```

No `engine/*`, `test/*`, `tools/*`, `MEMORIAL-PHASE-*.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`, `SCOPING-MEMO-v0.3.md`, `PRD.md`, or other CLAUDE-*.md.

**AC-R43-8 (no lesson silently omitted — verbatim discipline):** All 16 folded standalones' lesson bodies are present somewhere in post-R43 CLAUDE-IMPLEMENTER.md. Verification: for each of the 16, pick a distinctive phrase (≥ 8 words from the origin lesson body); grep for it post-R43; expect ≥ 1 match (within the target sub-variant).

**AC-R43-9 (test baseline — discipline-restoration acknowledged):** R43 chore-A does NOT touch test/* or engine/*. Pre-R43 baseline = 361 tests, 355 pass, 3 fail (AC-R36-21 + AC-R36-30 + AC-R36-31 forward-protection guards), 3 skip. **Post-R43 expected baseline:** 361 tests, **356 pass**, **2 fail** (AC-R36-30 + AC-R36-31 only), 3 skip. AC-R36-21 ("CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2") was the forward-protection guard that R36 wrote to detect post-MR-2 accretion; R43's whole purpose is to restore the CLAUDE-IMPLEMENTER.md REINFORCED count to ≤ 30 — so AC-R36-21 *correctly transitions from FAIL to PASS at R43 chore-A*. This is discipline-restoration, not regression. `npx tsc -p tsconfig.test.json` exit = 0 (unchanged). No previously-passing test now fails (zero regression).

**AC-R43-10 (stale-count fixes — Rule 5 R39 MAJOR-1 self-application across all 4 stale composites):** Pre-R43 audit shows 4 of 7 composites have stale headings (undercount by 1 each, accumulated from post-R39 sub-variant additions where the heading was not updated in the same commit). R43 fixes all 4:
- HALT-DISCIPLINE: heading "5" → "6"
- MEMORIAL-AND-ATTESTATION-ACCURACY: heading "4" → "8" (also includes 3 new folds)
- SPEC-PRESCRIPTION-FIDELITY: heading "4" → "7" (also includes 2 new folds)
- AC-COVERAGE-COMPLETENESS: heading "2" → "4" (also includes 1 new fold)

These fixes are themselves the R39 MAJOR-1 reinforcement applied to its own derivation chain: the rule was VIOLATED for these 4 composites in the post-R39 rounds (R40, R41) when sub-variants were... actually no, the sub-variants weren't added to composites in those rounds — they were authored as standalone REINFORCED entries. The stale-counts predate post-R39 rounds. R43 cleanup applies the rule retroactively for the first time.

---

## § 6. Anti-scope

- NO modification of engine/* or test/* files (zero production-code/test changes)
- NO modification of any REINFORCED line text beyond reorganization (lessons verbatim in sub-variants per Rule 5 gate)
- NO modification of pre-R43 R-NN origin references in any REINFORCED entry (preserve `Detected tessera R<N>` attributions verbatim)
- NO new REINFORCED entries added beyond the 2 new composite headings (consolidation only; no accretion)
- NO modification of coordination/SCOPING-MEMO-v0.3.md or coordination/PRD.md
- NO modification of CROSS-PROJECT-MEMORIAL.md (Rule 7: Tessera-internal landing only; cross-project promotion gated on 2nd-project occurrence per R42 anchor-canonical-landing precedent)
- NO modification of CLAUDE-COMMON.md, CLAUDE-ARCHITECT.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md, CLAUDE-COORDINATOR.md (R42 deliverables are frozen; this round touches IMPLEMENTER only)
- NO modification of MEMORIAL-PHASE-1.md or MEMORIAL-PHASE-2.md (R42 frozen shards)
- NO Phase 3 territory (HARD STOP on Phase 3 scope preserved)
- NO opening any GitHub PRs
- NO Implementer-resolved sequencing recommendations for downstream rounds (R44+ scope is operator-decided)

---

## § 7. Apply all 7 cross-project rules UPFRONT

- **Rule 1 (false-compliance-attestation):** AC-R43-1 + AC-R43-8 require empirical verification at chore-A (`grep -c` actual count; grep for distinctive phrases). Implementer encodes actual numbers verbatim.
- **Rule 2 (architect-branch-binding-coverage):** N/A — no code branches in this round; pure consolidation.
- **Rule 3 (implementer-spec-test-assertion-coverage):** Methodology round; no test file required (R39 + R42 precedent). AC binding is via grep/diff commands at chore-A.
- **Rule 4 (anti-scope-allowed-set-forward-coverage):** ALLOWED_SET enumerated in AC-R43-7 at spec-emit time (this commit), preceding any RED/chore-A. Regex carve-out for Reviewer + DIAGNOSTIC paths.
- **Rule 5 (self-application gate):** THIS is the round that applies R39 MAJOR-1 + R39 MINOR-2 + R39 MAJOR-2 self-application gates to its own act of consolidation. AC-R43-4 + AC-R43-5 + AC-R43-3 bind these.
- **Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround):** If any fold creates a thematic-mismatch sub-variant (e.g., a lesson doesn't naturally fit its target composite), Implementer writes DIAGNOSTIC + halts. Per anti-scope: no silent rewording to force a fit.
- **Rule 7 (derived-rule-propagation):** Both new composites (ATTESTATION-SCOPE-FIDELITY + PRE-EMIT-GRILLING-COMPLETENESS-GATE) are Tessera-internal landings. Cross-project promotion deferred per § 5.5 R42 anchor-canonical-landing precedent.

---

## § 8. Halt conditions

1. **Final count off-target:** If post-fold `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` ≠ 30 by more than ±2, HALT + DIAGNOSTIC. Off-by-1 is acceptable (drift in count calculation); off-by-larger indicates a structural error.
2. **Verbatim preservation failure:** If `diff` between origin lesson body and target sub-variant body shows substantive changes beyond bullet-and-label transformation, HALT + DIAGNOSTIC + ESCALATE per R39 MAJOR-2 reinforcement.
3. **Thematic mismatch:** If a fold target doesn't naturally fit its assigned composite (lesson body's trigger condition is materially distinct from composite's theme), HALT + DIAGNOSTIC; do NOT force-fit via paraphrase.
4. **Composite count mismatch:** If post-fold a composite heading's `(N sub-variants)` count doesn't match the body's actual count, HALT + DIAGNOSTIC per R39 MAJOR-1 reinforcement (the rule whose self-application demonstrated this exact failure).
5. **Test baseline drift:** Any change in `node --test test/*.test.js` summary (`361/355/3/3`) → HALT + DIAGNOSTIC; methodology round must not perturb tests.

---

## § 9. Open questions

None — operator authorized scope at R42 close.

---

## § 10. Pipeline invocation

- **Pipeline mode:** `cd /Users/johnwarren/concord/tessera && ./run-pipeline.sh --round R43 --tier audit`
- **Interactive mode:** Implementer executes chore-A in this session; Reviewer pass invoked by operator separately.

This spec is mode-agnostic; ACs apply identically.
