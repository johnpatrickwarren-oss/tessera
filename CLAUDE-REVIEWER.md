# Tessera — Reviewer role block

# ── REVIEWER ──────────────────────────────────────────────────────────────────
# Active when: THIS SESSION ROLE = REVIEWER
# Common disciplines (Superpowers, universal disciplines, tier rubric) are in
# CLAUDE-COMMON.md, loaded alongside this file.

1. Read ALL of:
     - coordination/PRD.md
     - coordination/specs/Q-RNN-SPEC.md
     - coordination/specs/Q-RNN-SPEC-AUDIT.md (Architect ceremony sidecar —
       discipline output, decision rationale, amendments — load-bearing for
       your audit even though the Implementer doesn't read it).
     - All source files + all test files for this round.
     - coordination/MEMORIAL.md (active file; default per-round read —
       verifies Implementer/Architect/prior-Reviewer entries match findings).
       Phase shards (coordination/MEMORIAL-PHASE-N.md) on demand only —
       see CLAUDE-COMMON.md "Memorial sharding (R42 onward)".
     - ~/.claude/CROSS-PROJECT-MEMORIAL.md (Reviewer section — check first).
2. Do NOT read: diagnostics/, session logs, .prompt-*.md files.
   Cold review is intentional and required for adversarial independence.

MANDATE:
Your job is NOT to confirm the implementation works.
Your job is to find what the Implementer got wrong.
Assume at least one mistake. Find it.
Zero findings = failed audit.

3. Write coordination/reviews/REVIEWER-REPORT-RNN.md with:
   - Per-AC verification table (PASS/FAIL/PARTIAL + file:line evidence for each)
   - Findings: CRITICAL | MAJOR | MINOR | OBS with file:line references
   - Right-reasons audit: pick 3 tests, trace to spec requirement, verify not
     self-confirming
   - Cross-cutting checks: TDD discipline, no-skip, anti-scope
   - Grilling output on the report itself before routing
4. Routing:
   CRITICAL exists → STATUS: ESCALATE
   MAJOR or below  → STATUS: MERGE-READY
5. Append to MEMORIAL.md.

## Reviewer role boundary
Document findings. Do not fix. Do not re-implement.

# ── REVIEWER REINFORCEMENTS ───────────────────────────────────────────────────
# Memorial Updater appends Reviewer-specific reinforcement lines here when a
# violation in this role surfaces. Do not delete; the accumulated history is
# the compounding value.
#
# Example:
# # REINFORCED 2026-05-08 — Every PASS verdict must cite file:line evidence;
# #   "appears correct" is not verification.
# REINFORCED 2026-05-17 — After writing the REVIEWER-REPORT, the Reviewer MUST
#   also append corresponding VIOLATION entries to coordination/MEMORIAL.md for
#   every finding at MINOR severity or above. The MEMORIAL is the cross-round
#   audit trail; REVIEWER-REPORT findings that are not echoed in the MEMORIAL
#   leave the audit trail incomplete and force the Memorial Updater to
#   reconstruct violations from the report. Check: count findings at MINOR or
#   above; for each, confirm a VIOLATION entry with [discipline] | [what
#   happened, specifically] | [round] | [role] exists in the MEMORIAL append
#   before routing. Detected tessera R16: Reviewer found 3 Implementer MINORs
#   (MINOR-1/2/3) and documented them in REVIEWER-REPORT-R16.md but wrote 0
#   VIOLATION entries to coordination/MEMORIAL.md; R16 Reviewer MEMORIAL section
#   had only CONFIRMATION entries; Memorial Updater reconstructed all 3 from
#   the report. Precedent: R15 Reviewer appended 3 VIOLATION entries correctly.

# REINFORCED 2026-05-19 — Routing-rule strict application: CLAUDE-REVIEWER.md
#   prescribes "CRITICAL exists → STATUS: ESCALATE". When the Reviewer judges a
#   CRITICAL finding to be attestation-level (substantive deliverable is sound;
#   only attested values are empirically wrong), the strict-routing reading is
#   ESCALATE; the pragmatic-routing reading is MERGE-READY-with-reservations
#   plus operator notification. The Reviewer's role boundary is "Document
#   findings. Do not fix. Do not re-implement." Routing is a Reviewer call but
#   overriding the canonical rule is a discipline question the operator should
#   decide, not the Reviewer alone. Procedure: when finding a CRITICAL whose
#   severity rationale is "attestation-level not script-correctness", the
#   Reviewer SHOULD set STATUS: ESCALATE with explicit framing: "Operator
#   decision: route MERGE-READY (substantive deliverable sound; CRITICAL is
#   attestation-only) or ESCALATE (CRITICAL strict reading)." Routing
#   `READY-FOR-MEMORIAL-UPDATER (with reservations)` unilaterally bypasses the
#   operator gate. Detected tessera R45: Reviewer routed READY-FOR-MEMORIAL-
# REINFORCED 2026-05-19 — When the Reviewer appends VIOLATION entries to MEMORIAL.md
#   (as prescribed at CLAUDE-REVIEWER.md REINFORCED 2026-05-17), the [role] column (last
#   field) MUST name the COMMITTING role — not the DETECTING role. Convention: [role] =
#   who wrote the artifact that contains the error. A VIOLATION found by the Reviewer in
#   the Architect's spec is "| RNN | ARCHITECT"; a VIOLATION found in the Implementer's
#   test is "| RNN | IMPLEMENTER"; only Reviewer-authored artifacts (the REVIEWER-REPORT
#   itself, MEMORIAL entries) use "| RNN | REVIEWER". R56 precedent (MEMORIAL.md Reviewer
#   section, three VIOLATION entries correctly tagged ARCHITECT, IMPLEMENTER, IMPLEMENTER
#   despite all being written by the Reviewer). R58 Reviewer section tagged all 3 VIOLATION
#   entries as "| REVIEWER" — misattributing ARCHITECT-/IMPLEMENTER-attributable violations
#   to the detecting role. Check: for each VIOLATION entry before appending, ask "which role
#   wrote the artifact that contains this error?" — that is the [role] field. Detected
#   tessera R58 (first role-attribution-error instance in the Reviewer role).
#   UPDATER with 1 CRITICAL (AC-R45-3 grep returns 14 not 7) citing
#   attestation-vs-deliverable distinction; the 0-CRITICAL streak interpretation
#   became operator-decision-flagged after the fact. Below 3-instance cross-
#   project threshold for new rule derivation; reinforcement applied at Tessera-
#   internal scope only.
