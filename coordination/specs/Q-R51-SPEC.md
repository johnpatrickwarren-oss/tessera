# Q-R51-SPEC — CLAUDE-IMPLEMENTER.md Re-consolidation + MU Re-accretion Guard

**Round:** R51
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Round-start SHA:** `c5f5862`

---

## § 1. Goal

Two-part methodology fix:

1. **CLAUDE-IMPLEMENTER.md consolidation (37 → 30).** Fold 7 post-R43 standalone REINFORCED entries (from R47/R48 MU appends) into existing composites. Each fold preserves lesson text verbatim, adds a sub-variant label, and requires the composite heading `(composite; N sub-variants)` count to be updated in the same commit per R39 MAJOR-1.

2. **CLAUDE-MEMORIAL.md re-accretion guard.** Add a threshold-aware rule to Memorial Updater step 5: when CLAUDE-IMPLEMENTER.md REINFORCED count is at or near the 30-entry threshold, MU MUST roll new violations into existing composites rather than appending standalones. This prevents the R47-R50 re-accretion pattern from recurring.

---

## § 2. Brainstorm

**Option A — Fold 7 standalones into existing composites (SELECTED):** Mirrors Q-R43-SPEC § 3.3 Pass-3 strategy. Net: 37 − 7 = 30 exactly. Thematic fits are natural (see fold plan below). R39 MAJOR-1 + R39 MAJOR-2 (verbatim preservation) self-apply.
- Strengths: precedented at R43; exact target; no forced fits; passes Rule 5.
- Risks: composite sub-variant count updates must happen in same edit pass.

**Option B — Create new VERIFIER-AUTHORING composite:** Group R47 entries into one new composite. Net: 37 - 7 + 1 = 31 — fails the ≤30 target.
- Rejected: misses target.

**Option C — Cross-project promotion:** Promote verifier-discipline entries to CROSS-PROJECT-MEMORIAL.md.
- Rejected: Rule 7 discipline (1 Tessera instance; canonical landing requires 2nd-project occurrence).

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Fold plan (7 standalones → 5 composites)

| Standalone | Source lines | Target composite | New sub-variant N |
|---|---|---|---|
| R47 CRITICAL-1 (stdout-grep recursion) | 664–673 | ATTESTATION-SCOPE-FIDELITY | 6th |
| R47 MAJOR-1 (spec+verifier co-update) | 675–683 | SPEC-PRESCRIPTION-FIDELITY | 10th |
| R47 MAJOR-2 (Tightening-4 grep gate) | 685–693 | PRE-EMIT-GRILLING-COMPLETENESS-GATE | 4th |
| R47 MINOR-3 (non-terminating verifier = halt) | 694–702 | HALT-DISCIPLINE | 8th |
| R48 MAJOR-1+MINOR-1 (amendment literal sweep) | 703–712 | CITATION-AND-ARITHMETIC-ACCURACY | 7th |
| R48 MINOR-2 (§3-§5-verifier consistency) | 714–726 | SPEC-PRESCRIPTION-FIDELITY | 11th |
| R48 MINOR-3 (known-limitation empirical sweep) | 727–736 | PRE-EMIT-GRILLING-COMPLETENESS-GATE | 5th |

### 3.2 Composite heading count updates (R39 MAJOR-1)

| Composite | Before | After |
|---|---|---|
| HALT-DISCIPLINE | 7 | 8 |
| SPEC-PRESCRIPTION-FIDELITY | 9 | 11 |
| ATTESTATION-SCOPE-FIDELITY | 5 | 6 |
| CITATION-AND-ARITHMETIC-ACCURACY | 6 | 7 |
| PRE-EMIT-GRILLING-COMPLETENESS-GATE | 3 | 5 |

### 3.3 CLAUDE-MEMORIAL.md step 5 amendment

Current step 5 ends at: `...the cumulative history is the value.`

Insert after the current bullet list the following re-accretion guard block (exact text below — this is what AC-R51-4 verifies):

> **Re-accretion guard (R51):** before appending a standalone REINFORCED line, check the target file's current REINFORCED count via `grep -c "^# REINFORCED" CLAUDE-<ROLE>.md`. If the count is ≥ 28 (within 2 of the 30-entry threshold R43 consolidated to), THEN evaluate whether the violation can be folded into an existing composite sub-variant. If a thematically-matching composite exists, ROLL the violation as a new sub-variant rather than adding a standalone. Only add standalone REINFORCED entries when the count is < 28 OR the violation is genuinely novel with no thematic composite (and the composite count update discipline of R39 MAJOR-1 applies to the composite heading).

### 3.4 ALLOWED_SET (Rule 4)

Files authorized for modification in R51:
- `CLAUDE-IMPLEMENTER.md`
- `CLAUDE-MEMORIAL.md`
- `coordination/specs/Q-R51-SPEC.md`
- `coordination/specs/Q-R51-EMPIRICAL.sh`
- `coordination/MEMORIAL.md`
- `coordination/NEXT-ROLE.md`
- `coordination/reviews/REVIEWER-REPORT-R51.md` (Reviewer)
- `coordination/diagnostics/DIAGNOSTIC-R51-*.md` (if needed)
- `coordination/logs/ROUND-R51-SUMMARY.md` (MU)

NO engine/*, test/*, tools/*, scripts/*, CLAUDE-COMMON.md, CLAUDE-ARCHITECT.md, CLAUDE-REVIEWER.md, CLAUDE-COORDINATOR.md, MEMORIAL-PHASE-*.md, CROSS-PROJECT-MEMORIAL.md.

---

## § 4. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-R51-1 | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` runs, then count = 30. |
| AC-R51-2a | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when the HALT-DISCIPLINE heading is read, then it states `(composite; 8 sub-variants`. |
| AC-R51-2b | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when the SPEC-PRESCRIPTION-FIDELITY heading is read, then it states `(composite; 11 sub-variants`. |
| AC-R51-2c | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when the ATTESTATION-SCOPE-FIDELITY heading is read, then it states `(composite; 6 sub-variants`. |
| AC-R51-2d | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when the CITATION-AND-ARITHMETIC-ACCURACY heading is read, then it states `(composite; 7 sub-variants`. |
| AC-R51-2e | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when the PRE-EMIT-GRILLING-COMPLETENESS-GATE heading is read, then it states `(composite; 5 sub-variants`. |
| AC-R51-3a | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `circular with no base case`, then count = 1 (R47 CRITICAL-1 lesson preserved in ATTESTATION-SCOPE-FIDELITY). |
| AC-R51-3b | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `Liar's Paradox, self-match, or incidental hit`, then count = 1 (R47 MAJOR-1 lesson preserved in SPEC-PRESCRIPTION-FIDELITY). |
| AC-R51-3c | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `structurally fixed by this round`, then count = 1 (R47 MAJOR-2 lesson preserved in PRE-EMIT-GRILLING-COMPLETENESS-GATE). |
| AC-R51-3d | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `non-termination event — equivalent to`, then count = 1 (R47 MINOR-3 lesson preserved in HALT-DISCIPLINE). |
| AC-R51-3e | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `The verifier then printed a stale display value`, then count = 1 (R48 MAJOR-1+MINOR-1 lesson preserved in CITATION-AND-ARITHMETIC-ACCURACY). |
| AC-R51-3f | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `§ 3 says one thing; § 5 says another; next reader cannot resolve`, then count = 1 (R48 MINOR-2 lesson preserved in SPEC-PRESCRIPTION-FIDELITY). |
| AC-R51-3g | Given CLAUDE-IMPLEMENTER.md at chore-A SHA, when grepped for `only observable by`, then count = 1 (R48 MINOR-3 lesson preserved in PRE-EMIT-GRILLING-COMPLETENESS-GATE). |
| AC-R51-4 | Given CLAUDE-MEMORIAL.md at chore-A SHA, when grepped for `Re-accretion guard (R51)`, then count = 1. |
| AC-R51-5 | Given test suite at chore-A SHA, when `node --test test/*.test.js` runs, then tests=361, pass=356, fail=2, skip=3 (AC-R36-21 FAIL→PASS; discipline-restoration). |
| AC-R51-6 | Given Q-R51-EMPIRICAL.sh at chore-A SHA, when `bash -n coordination/specs/Q-R51-EMPIRICAL.sh` runs, then exit = 0. |

---

## § 5. Anti-scope

- NO modification of `engine/*`, `test/*`, `tools/*`, `scripts/*`.
- NO modification of `CLAUDE-COMMON.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-COORDINATOR.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 gated).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`.
- NO modification of `scripts/` pipeline scripts (R45-R50 deliverables stable).
- NO modification of R42-R50 specs / empirical files.
- NO new standalone REINFORCED entries in CLAUDE-IMPLEMENTER.md — folds only.
- NO force-fitting: if a standalone has no thematic composite match, HALT + DIAGNOSTIC.

---

## § 6. Open questions

None — all resolved inline via fold plan above.

---

## § 7. Cross-project rules applied upfront

- **Rule 1 (`false-compliance-attestation`):** Q-R51-EMPIRICAL.sh mechanically verifies all AC claims; no memorized values.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ALLOWED_SET in § 3.4 authored at spec-emit time before implementation.
- **Rule 5 (`rule-derivation-without-self-application`):** R39 MAJOR-1 (composite count update in same commit) self-applied to this round's own composite heading updates. R39 MAJOR-2 (verbatim preservation) self-applied — diff before attesting PASS.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** halt conditions in NEXT-ROLE.md § Halt conditions govern; no workarounds.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** The MU re-accretion guard in CLAUDE-MEMORIAL.md step 5 IS the propagation surface for the re-accretion failure mode. Tessera-internal scope only; cross-project canonical landing gated on 2nd-project occurrence per R42/R43 precedent.
