# Q-R39-SPEC — CLAUDE-ARCHITECT.md MR-2 Consolidation

**Round:** R39  
**Tier:** audit (Implementer wears Architect hat; Reviewer audits cold)  
**Operator authority:** overnight continuation per [[project-overnight-authority-2026-05-18-morning]]

---

## § 1. Goal

Consolidate CLAUDE-ARCHITECT.md from 33 REINFORCED lines to 25-28 using the same 3-pass
MR-2 strategy applied to CLAUDE-IMPLEMENTER.md at R36. Pass 1 replaces cross-project-rule
origin entries with pointer lines. Pass 2 groups thematically-related entries under composite
REINFORCED headings. Pass 3 handles optional CLAUDE-IMPLEMENTER.md secondary bundling of
6 post-MR-2 standalone entries. No code or test changes; methodology-only round.

---

## § 2. Brainstorm

**Option A — Aggressive 1-pass:** Collapse everything to ~10 composite headings in one commit.
- Strengths: smallest final file, minimal commits
- Weaknesses: violates Rule 5 (trigger conditions risk becoming hidden inside large composites);
  harder to verify each lesson verbatim; no clear per-pass audit trail
- Rejected: Rule 5 self-application is the primary discipline for this round; risk unacceptable

**Option B — 3-pass progressive (SELECTED):** Pass 1 = cross-project pointers, Pass 2 = composites,
Pass 3 = IMPLEMENTER secondary. Each pass is one independent auditable commit.
- Strengths: proven on IMPLEMENTER MR-2; each pass has clear success criteria; Rule 5 risk
  contained by small groupings; origin attributions preserved verbatim per pointer format
- Weaknesses: 3 commits; slightly more work
- Constraint match: STAGED-FOR-PHASE-2-CLOSE.md Item 1 explicitly mandates this approach

**Option C — 2-pass (skip Pass 3):** Passes 1+2 only; defer IMPLEMENTER work.
- Strengths: simpler
- Weaknesses: IMPLEMENTER post-MR-2 additions stay fragmented; secondary deliverable wasted
- Rejected: All 6 post-MR-2 IMPLEMENTER entries fit existing composites cleanly; folding is safe

---

## § 3. Mechanism

### 3.1 Pass 1 — Cross-project pointer replacements (ARCHITECT)

**Which entries map to which rules:**

Rule 2 (`architect-branch-binding-coverage`) Tessera Architect origins — 3 entries to collapse:
- R25 MINOR-2 (CLAUDE-ARCHITECT.md lines 359-369): mutation-reachability `?? N` default
- R28 OBS-1 (lines 370-381): acknowledged-gap exhaustiveness section
- R30 MINOR-2 (lines 405-415): data-flow unreachability (opts-coverage; also in CLAUDE-COMMON.md
  as `data-flow-not-syntax` promotion — removing from ARCHITECT is not information loss)

Rule 4 (`anti-scope-allowed-set-forward-coverage`) Tessera Architect origins — 3 entries to collapse:
- R25 MAJOR-2 (lines 337-347): HALT commit DIAGNOSTIC path in ALLOWED_SET
- R29 MINOR-2 (lines 382-392): REVIEWER-REPORT file not in ALLOWED_SET
- R34 MAJOR-1 (lines 433-443): operator-authored methodology backflow

**Mechanism:** Add a `# CROSS-PROJECT RULE POINTERS` section header + 2 pointer lines immediately
after the existing MR-2-equivalent comment block. Then remove the 6 origin-entry blocks. The
pointer lines use the same format as CLAUDE-IMPLEMENTER.md:
```
#   <rule-name> — Tessera Architect origins: <R-NN finding>, ...
```

Note: Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) and Rule 7
(`derived-rule-propagation-mechanism-required`) have no Architect-side entries in CLAUDE-ARCHITECT.md;
no collapse needed for those rules.

**Result after Pass 1:** REINFORCED count 33 → 27 (in target range 25-28 but further compositing follows)

### 3.2 Pass 2 — Empirical-premise composite (ARCHITECT)

**Group A: EMPIRICAL-PREMISE-VERIFICATION (3 entries → 1 composite, -2 REINFORCED):**
- R07 fixture window sizing propagation (lines 173-181)
- R07 OBSERVED-binding scope (lines 183-193)
- R08 empirical premise verification (lines 195-209)

These three entries are tightly thematically unified: all prescribe that Architect spec claims about
production behavior must be empirically grounded. R07 focuses on accumulation adequacy; R07-second
focuses on OBSERVED-binding scope limits; R08 focuses on inherited-testimony verification. All three
share a single trigger: "spec claim about production behavior."

**Self-application gate (Rule 5):** Each sub-variant preserves its own trigger condition verbatim:
- R07-a trigger: "when AC fixture needs N windows to cross threshold" → preserved in sub-variant text
- R07-b trigger: "before applying OBSERVED-binding" → preserved in sub-variant text
- R08 trigger: "when a load-bearing spec premise is inherited from prior testimony" → preserved verbatim
All three triggers remain discoverable in the consolidated text. Gate: PASS ✓

**Composite heading format:**
```
# REINFORCED — EMPIRICAL-PREMISE-VERIFICATION (composite; 3 sub-variants observed at Tessera)
#
#   Fixture accumulation adequacy (R07 MAJOR-1): ...
#   OBSERVED-binding scope (R07 MAJOR-2): ...
#   Inherited-testimony verification (R08 MAJOR-2): ...
```

**Result after Pass 2:** REINFORCED count 27 → 25 ← in target range [25, 28] ✓

### 3.3 Pass 3 — IMPLEMENTER secondary bundling (optional, implemented)

6 post-MR-2 CLAUDE-IMPLEMENTER.md entries (all `# REINFORCED 2026-05-19`) fold into existing
composites. Each is mapped to the best-fit composite:

| Entry | Lines | Fits composite |
|---|---|---|
| ALLOWED_SET circular self-expansion (R36 MAJOR-2/3) | 389-398 | HALT-DISCIPLINE (new sub-variant) |
| MEMORIAL self-exoneration (R36 + Rule 6) | 399-407 | MEMORIAL-AND-ATTESTATION-ACCURACY (new sub-variant) |
| Docstring accuracy — absence check (R36 MAJOR-1) | 408-418 | SPEC-PRESCRIPTION-FIDELITY (new sub-variant, combined with entries 4+5) |
| Exact spec-literal phrase (R38 MINOR-1) | 419-428 | SPEC-PRESCRIPTION-FIDELITY (same sub-variant as entry 3) |
| Multiple jsdoc blocks (R38 MINOR-1) | 429-438 | SPEC-PRESCRIPTION-FIDELITY (same sub-variant) |
| Chore-B skip count AC (R38 MINOR-3) | 439-448 | AC-COVERAGE-COMPLETENESS (new sub-variant) |

Entries 3+4+5 share a unified theme (assertion precision for docstring Then-clauses) and are combined
into one SPEC-PRESCRIPTION-FIDELITY sub-variant. Net fold: 6 standalone entries → 4 composite
sub-variants (1 HALT, 1 MEMORIAL, 1 SPEC-PRESCRIPTION, 1 AC-COVERAGE). The individual lessons are
preserved verbatim as sub-variant content.

**Self-application gate (Rule 5) for secondary:**
- HALT-DISCIPLINE sub-variant trigger: "when IMPLEMENTER modifies file NOT in spec § 2.2 list" → preserved
- MEMORIAL sub-variant trigger: "when writing MEMORIAL entries for the current round" → preserved
- SPEC-PRESCRIPTION sub-variant trigger: "when spec AC Then-clause requires docstring accuracy" → preserved
- AC-COVERAGE sub-variant trigger: "when chore-B adds a forward-protection test that self-skips" → preserved
Gate: PASS ✓

**Result after Pass 3:** IMPLEMENTER REINFORCED count 36 → 30

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| CLAUDE-ARCHITECT.md | Modified | Passes 1+2: 33→25 REINFORCED lines |
| CLAUDE-IMPLEMENTER.md | Modified | Pass 3: 36→30 REINFORCED lines |
| coordination/specs/Q-R39-SPEC.md | Created | This file |
| coordination/NEXT-ROLE.md | Modified | chore-A routing |
| coordination/MEMORIAL.md | Modified | chore-A append |

Not modified: CLAUDE-COMMON.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md,
engine/*, test/*, coordination/SCOPING-MEMO-v0.3.md, CROSS-PROJECT-MEMORIAL.md

---

## § 5. Acceptance criteria

**AC-R39-1 (Pass 1 count):** Given CLAUDE-ARCHITECT.md at round-start (33 REINFORCED), when Pass 1
commit lands, then `grep -c "^# REINFORCED" CLAUDE-ARCHITECT.md` = 27.

**AC-R39-2 (Pass 2 count):** When Pass 2 commit lands, then
`grep -c "^# REINFORCED" CLAUDE-ARCHITECT.md` = 25.

**AC-R39-3 (target in range):** Post-Pass-2, the count 25 is in the target range [25, 28]. ✓

**AC-R39-4 (pointers present):** CLAUDE-ARCHITECT.md contains a CROSS-PROJECT RULE POINTERS section
with pointer lines for both `architect-branch-binding-coverage` and
`anti-scope-allowed-set-forward-coverage`, each citing Tessera-origin R-NN findings.

**AC-R39-5 (Rule 5 self-application):** Each new composite heading (EMPIRICAL-PREMISE-VERIFICATION and
the 4 new sub-variants in IMPLEMENTER composites) preserves all trigger conditions verbatim in the
sub-variant text. Verified by reading each sub-variant and confirming the trigger phrase is present.

**AC-R39-6 (no code/test changes):** `git diff e1b426a HEAD --name-only` after chore-A includes ONLY
paths in the ALLOWED_SET below; no engine/* or test/* paths appear.

ALLOWED_SET:
```
coordination/specs/Q-R39-SPEC.md
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
coordination/reviews/REVIEWER-REPORT-R39.md   (post-chore-B Reviewer commit; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R39-*.md  (conditional; only if HALT fires)
```

Regex carve-out for Reviewer and DIAGNOSTIC paths must be included in any forward-protection
test or anti-scope check if one is authored for this round.

**AC-R39-7 (IMPLEMENTER secondary count):** When Pass 3 commit lands, then
`grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` = 30.

**AC-R39-8 (REINFORCED text verbatim):** The lesson text of each merged/collapsed entry appears
verbatim in either the composite sub-variant text or the pointer attribution line. No lesson is
silently omitted.

---

## § 6. Anti-scope

- NO modification of engine/* or test/* files
- NO modification of any REINFORCED line text beyond reorganization (lessons verbatim in sub-variants)
- NO modification of pre-R39 R-NN origin references in any REINFORCED entry
- NO new REINFORCED entries added (consolidation only; no accretion)
- NO modification of coordination/SCOPING-MEMO-v0.3.md
- NO modification of CROSS-PROJECT-MEMORIAL.md beyond confirming pointer targets exist
  (Rule 7 confirmed canonical at R38; no edits needed)
- NO modification of CLAUDE-COMMON.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md
- NO Phase 3 territory

---

## § 7. Open questions

None — all resolved.
