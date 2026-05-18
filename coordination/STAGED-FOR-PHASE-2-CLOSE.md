# Staged-for-Phase-2-close: items to execute after Wave 5 gate lands

_Durable staging artifact for methodology work the operator has authorized to execute after Phase 2 close milestone (Wave 5 gate = NEW HARD STOP per extended overnight authority [[project-overnight-authority-2026-05-18-morning]]). Survives session compaction. The Phase 2 post-close step reads this file when authoring the next session's plan._

---

## Item 1 — MR-2 CLAUDE-IMPLEMENTER.md consolidation

**Operator-requested:** 2026-05-18 mid-afternoon ("agreed with recommendation, proceed").

**Origin question:** "how do we reduce the size of the claude-implementer.md file?"

**Context:** CLAUDE-IMPLEMENTER.md grew from 30 → 51+ lines across this overnight session (R20-R32). 8th consecutive round above the 30-line consolidation threshold. The existing `scripts/consolidate-reinforcements.sh` archives lines older than 180 days; Tessera began 2026-05-15 so the script produces zero candidates. Thematic consolidation is needed.

**Constraint:** CLAUDE.md "Do not delete prior reinforcements — accumulated history is the compounding value" must be honored. Passes preserve all lessons; only the form changes.

**Three-pass consolidation strategy:**

### Pass 1 — De-duplicate cross-project-derived rules

This session derived 4 cross-project rules now in `~/.claude/CROSS-PROJECT-MEMORIAL.md`:
1. `false-compliance-attestation` (R26-derived; validated R30)
2. `architect-branch-binding-coverage` (R28+R29+R30)
3. `implementer-spec-test-assertion-coverage` (R28+R29+R30)
4. `anti-scope-allowed-set-forward-coverage` (R25+R26+R29)

Per-role REINFORCED lines that originated these rules become redundant. Collapse to 1-line pointers like:

```
# REINFORCED 2026-05-18 — false-compliance-attestation:
#   see CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" section.
#   Tessera origin sites: R26 MAJOR-1 + R30 (validated).
```

Expected reduction: ~5 lines.

### Pass 2 — Thematic consolidation under composite headings

Group narrow variants under broader discipline headings. Example template:

```
# REINFORCED — HALT-DISCIPLINE (composite; 4 sub-variants observed)
#
#   Spec-premise empirical failure (R08 MAJOR-2):
#     When a spec claim ("exact arithmetic"; "exit code 0"; etc.) fails
#     under empirical testing, HALT + DIAGNOSTIC + ESCALATE. Do not
#     silently absorb. R25 ESCALATE-R25-01 instance.
#
#   False-compliance attestation (R26 MAJOR-1; cross-project rule):
#     When binding-command output contradicts AC literal, do not reframe
#     errors as warnings or report required exit code. See CROSS-PROJECT-MEMORIAL.
#
#   RED-state audit-trail discipline (R23 MINOR-1):
#     Separate RED commit before any production code in TDD rounds.
#
#   Anti-scope file modification under operator-resume rationale (R19 MAJOR cluster):
#     Even when fix is architecturally correct, anti-scope target requires
#     DIAGNOSTIC + ESCALATE. R08 reinforcement.
```

Expected reduction: ~14 lines (20 narrow → 6 composite).

### Pass 3 — Promote universal patterns to CLAUDE-COMMON.md

Move these from Implementer-specific to all-role common:

- **Line-citation discipline** (R03/R18/R21 + cross-project rule active): cite-then-verify via grep; applies to every role's attestation. Move to CLAUDE-COMMON.md "Pre-emit grilling" section.
- **Data-flow-not-syntax verification** (R30 MINOR-2): applies to any role making coverage claims. Move to CLAUDE-COMMON.md.
- **Encode-actual-results-verbatim** (R26 MAJOR-1 + R30 validation; cross-project rule active): applies to every role's attestation discipline. Move to CLAUDE-COMMON.md.

Expected reduction: ~6 lines from IMPLEMENTER (these gain CLAUDE-COMMON entries once; net positive on signal-to-noise).

### Pass 4 — SKIP (Tessera too young for age-based archive)

When Tessera ages past ~6 months, oldest R01-R10 reinforcements may have been subsumed by later composite rules and become candidates for archive-to-`CLAUDE-IMPLEMENTER-ARCHIVE.md`. Not applicable now.

## Execution mechanics

**When:** Between Phase 2 close (Wave 5 gate) and any Phase 3 work. Methodology round (call it MR-2; analogous to MR-1 vendoring round).

**Tier:** N/A — operator-driven (analogous to MR-1; the role-file content IS the methodology, so doing this through the existing pipeline is circular).

**Operator review point:** Operator reviews the proposed diff BEFORE commit. Per the "rule-derivation-without-self-application" pattern surfaced at R32: the consolidation must not subsume rules into forms that make them LESS actionable. If a composite heading hides the trigger conditions, it fails this gate.

**Target:** 51 → 25-30 lines (back under 30-line threshold). The 30-line threshold is itself a heuristic from anchor canonical; if final lands at 32-35 lines but signal-to-noise is much better, that's acceptable.

**Files modified:**
- `CLAUDE-IMPLEMENTER.md` (primary; consolidation)
- `CLAUDE-COMMON.md` (pass 3 promotion targets)
- `CLAUDE-ARCHITECT.md` + `CLAUDE-REVIEWER.md` (may receive 1 pointer each if pass 1 cross-project pointers added; depends on shared rule ownership)
- Possibly NEW `CLAUDE-IMPLEMENTER-ARCHIVE.md` (only if pass 4 fires; currently NO)

**Commit shape (suggested):**
- Commit A — pass 1 (cross-project rule de-duplication; pointer-replacements only; minimal churn)
- Commit B — pass 2 (thematic composite consolidation; the largest diff; needs operator review)
- Commit C — pass 3 (CLAUDE-COMMON.md promotions; multi-file touch)

## When more items get staged for Phase 2 close, append below as Item 2, Item 3, etc.
