CURRENT-ROUND: R39
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R39 — CLAUDE-ARCHITECT.md consolidation; audit-tier; main worktree)

R39 = second round of post-Phase-2-close safe-continuation chain per evening overnight authority [[project-overnight-authority-2026-05-18-morning]].

**Threshold check (R38 verification empirically observed at session entry; same `grep -c "^# REINFORCED"` command per post-Phase-2-close discipline):**

| File | Lines | Threshold (30) | Disposition |
|---|---|---|---|
| CLAUDE-ARCHITECT.md | **33** | OVER | **FIRE R39 consolidation** |
| CLAUDE-IMPLEMENTER.md | 36 | OVER (6 post-MR-2 accumulation) | Bundle if Implementer judges thematic-fit; else defer to next consolidation cycle |
| CLAUDE-COMMON.md | 6 | under | skip |
| CLAUDE-REVIEWER.md | 1 | under | skip |
| CLAUDE-MEMORIAL.md / COORDINATOR.md | 0 | under | skip |

**Primary deliverable:** CLAUDE-ARCHITECT.md MR-2-equivalent 3-pass consolidation (same strategy as R36 Deliverable 5 MR-2 per `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 1; target 33 → 25-28 lines).

**Secondary deliverable (optional; Implementer-judgment):** Light IMPLEMENTER consolidation of the 6 post-MR-2 lines (R36 + R38 reinforcement additions). If lines thematically extend existing composite headings, fold them in (no new entries; in-place expansion). If genuinely new patterns, leave as-is and defer larger consolidation to next cycle.

**Round class:** audit-tier; main worktree; single-pipeline mode. Implementer wears Architect hat with own thin spec inline.

## Scope per STAGED Item 1 strategy

### Pass 1 — De-duplicate cross-project-derived rules in CLAUDE-ARCHITECT.md

7 cross-project rules now in `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-6 + Rule 7 landed at R38 Memorial-Updater stage per overnight authority OQ-W5-1 disposition). Per-Architect REINFORCED lines that originated these rules become redundant. Collapse to 1-line pointers like:

```
# REINFORCED 2026-05-18 — false-compliance-attestation:
#   see CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" section.
#   Tessera Architect-side origins: R34 MAJOR-3 + R36 MAJOR-3+4.
```

Expected reduction: 3-5 lines (Rules 2/4/6 + possibly Rule 7 if Architect originated; Rule 1 is Implementer-side).

### Pass 2 — Thematic consolidation under composite headings

Group narrow Architect variants under broader discipline headings. Candidate composite headings (Implementer determines actual structure per spec text):

- **SPEC-INTERNAL-CONTRADICTION** (R01 cross-section consistency + R02 type-declaration-site check + R04+ subsequent variants)
- **EMPIRICAL-PREMISE-VERIFICATION** (R08 reinforcement + R29 baseline verification + R38 stale-baseline-cite class)
- **GRILLING-COMPLETENESS** (multiple R-N narrow variants)

Expected reduction: 5-10 lines.

### Pass 3 — Promote universal patterns to CLAUDE-COMMON.md (only if not already promoted by R36 Pass 3)

R36 already promoted 3 universal patterns. R38 may have surfaced additional universal patterns worth promoting; Implementer judges per Rule 5 self-application gate (composite must not hide trigger conditions).

### Skip Pass 4 (age-based archive)

Tessera ~5 days old; no entries old enough.

## Self-application gate (per R32-derived Rule 5)

Implementer at chore-A self-audits: for each composite heading proposed, verify trigger conditions remain discoverable in the consolidated text. If a composite hides what triggers it, fails Rule 5 self-application — revise before commit.

**Operator-review-before-commit gate (per STAGED Item 1):** Commit shape = 3 sequential commits (pass 1; pass 2; pass 3) so each pass is independently auditable. Implementer DOES commit autonomously per overnight authority safe-continuation but each pass commit makes its own diff reviewable to operator on wake.

## Anti-scope (R39 hard limits)

- NO modification of engine/* or test/* files (this is methodology-only; no code or test changes)
- NO modification of any CLAUDE-*.md REINFORCED LINE TEXT (only re-organize; the lessons themselves stay verbatim per "Do not delete prior reinforcements" CLAUDE.md constraint)
- NO modification of any pre-R39 reinforcement origin reference (R-NN attribution preserved in composites + pointer lines)
- NO Phase 3 territory
- NO modification of coordination/SCOPING-MEMO-v0.3.md
- NO modification of CROSS-PROJECT-MEMORIAL.md beyond confirming Rules 1-7 canonical (pointer-target verification only)
- NO new reinforcement-line additions (R39 is consolidation, not accretion)

## Halt conditions

1. **Rule 5 self-application gate fails** — composite heading hides trigger conditions; HALT for operator review.
2. **Pass 1 cross-project pointer landing reveals Rule 7 NOT actually canonical-landed at CROSS-PROJECT-MEMORIAL.md** — HALT + DIAGNOSTIC; investigate Memorial-Updater R38 stage.
3. **Reduction target NOT achievable without violating "do not delete" constraint** — HALT + ESCALATE; surface the conflict.
4. **CLAUDE-IMPLEMENTER.md secondary bundling reveals thematic surface beyond what Implementer can safely consolidate at audit-tier** — defer to next consolidation cycle; document in spec.

## Apply all 7 cross-project rules UPFRONT

Per WAVE-GATE-05 Rule 7 derivation + R38 Memorial-Updater landing: all 7 rules active. Especially:
- Rule 5 (self-application gate) — primary discipline for this round
- Rule 7 (derived-rule-propagation-mechanism-required) — meta-rule; consolidating Pass 1 IS the propagation mechanism (pointers replace originating lines; future Architects discover via the canonical landing not the per-role file)

## Inputs for Implementer

1. `coordination/cluster-scopes/wave-3/wu-05-slice-3-close-walk.md` § Deliverable 5 strategy reference (similar pattern)
2. `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 1 (full strategy)
3. `coordination/WAVE-GATE-05.md` (R37 Phase 2 close + Rule 7 derivation context)
4. `coordination/reviews/REVIEWER-REPORT-R36.md` (R36 MAJORs 3+4 — Rule 6 self-application failures; relevant for Architect Pass 1 origin-site enumeration)
5. `coordination/reviews/REVIEWER-REPORT-R34.md` (R34 MAJOR-1 — Rule 4 origin)
6. `~/.claude/CROSS-PROJECT-MEMORIAL.md` (verify Rules 1-7 canonical; pointer targets)
7. `CLAUDE-ARCHITECT.md` (primary file to consolidate)
8. `CLAUDE-IMPLEMENTER.md` (secondary; optional bundling)
9. `CLAUDE-COMMON.md` (Pass 3 promotion target if any additional universal patterns)

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R39 --tier audit
```

## State at R39 entry

| Element | State |
|---|---|
| Phase 2 closed | ✅ R37 WAVE-GATE-05 stamp |
| R38 verification | ✅ MERGE-READY; R36 MAJOR-1 fixed |
| CLAUDE-ARCHITECT.md | 33 lines (target 25-28 post-R39) |
| CLAUDE-IMPLEMENTER.md | 36 lines (post-MR-2 + 6 new) |
| 0-CRITICAL streak | 36 rounds |
| Working tree | clean |
| HEAD | (current main post R38) |
| Post-Phase-2-close chain | R39 (in flight) → R40 (Phase 3 candidate synthesis) → R41 (hygiene audit) → HARD STOP |
