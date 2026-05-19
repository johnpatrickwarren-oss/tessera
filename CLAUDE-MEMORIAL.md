# Tessera — Memorial Updater role block

# ── MEMORIAL UPDATER ──────────────────────────────────────────────────────────
# Active when: THIS SESSION ROLE = MEMORIAL-UPDATER
# Common disciplines (Superpowers, universal disciplines, tier rubric) are in
# CLAUDE-COMMON.md, loaded alongside this file.

1. Read: spec, spec-audit sidecar, reviewer report, diagnostics (if any),
   MEMORIAL.md (active file; default per-round read), CROSS-PROJECT-MEMORIAL.md.
   Phase shards (coordination/MEMORIAL-PHASE-N.md) are read on demand when
   verifying cross-phase discipline-pattern thresholds (e.g., counting prior
   tessera instances of a discipline for the "3+ violations" reinforcement
   rule). See CLAUDE-COMMON.md "Memorial sharding (R42 onward)".
2. Append CONFIRMATION/VIOLATION entries to coordination/MEMORIAL.md (specific, not generic)
3. Append same entries to ~/.claude/CROSS-PROJECT-MEMORIAL.md with project prefix
4. If any discipline has 3+ violations across recent rounds (cross-project):
   add a specific "Reinforcement rules derived" entry
5. Add reinforcement lines for each violation this round to the file that
   matches the violating role:
     Architect violation       → CLAUDE-ARCHITECT.md
     Implementer violation     → CLAUDE-IMPLEMENTER.md
     Reviewer violation        → CLAUDE-REVIEWER.md
     Memorial-Updater violation → CLAUDE-MEMORIAL.md
     Cross-role / methodology  → CLAUDE-COMMON.md
   Format:
     # REINFORCED [date] — [specific rule from violation]
   Append to the file's REINFORCEMENTS section. Do not delete prior
   reinforcements — the cumulative history is the value.

   **Re-accretion guard (R51):** before appending a standalone REINFORCED line, check the
   target file's current REINFORCED count via `grep -c "^# REINFORCED" CLAUDE-<ROLE>.md`.
   If the count is ≥ 28 (within 2 of the 30-entry threshold R43 consolidated to), THEN
   evaluate whether the violation can be folded into an existing composite sub-variant. If
   a thematically-matching composite exists, ROLL the violation as a new sub-variant rather
   than adding a standalone. Only add standalone REINFORCED entries when the count is < 28
   OR the violation is genuinely novel with no thematic composite (and the composite count
   update discipline of R39 MAJOR-1 applies to the composite heading).
6. Write coordination/logs/ROUND-RNN-SUMMARY.md
7. Set NEXT-ROLE.md STATUS: ROUND-COMPLETE

## Round finalization (operator)

At round-close, run:

```
./scripts/finalize-round.sh [--round RNN]
```

This single command replaces the manual R13-revised SHA-attestation sequence:
runs all 5 binding commands, commits coordination artifacts as SHA-A, records
SHA-A in NEXT-ROLE.md, and creates a second attestation commit. Reviewer verifies
with `git diff SHA-A HEAD -- src/ tests/ prisma/` exits 0.

**Supplementary checks** (run anytime during a round):

```
./scripts/check-manifest.sh --round RNN     # spec §2.x vs git diff drift check
./scripts/check-lint-baseline.sh            # lint warning regression gate
```

# ── MEMORIAL UPDATER REINFORCEMENTS ───────────────────────────────────────────
# Memorial Updater appends self-relevant reinforcement lines here when a
# violation in this role surfaces. Do not delete; the accumulated history is
# the compounding value.
#
# Example:
# # REINFORCED 2026-05-08 — Memorial entries must name the specific incident
# #   ("Reviewer caught the missing AC-4 evidence column"), not the discipline
# #   in the abstract ("Reviewer applied right-reasons audit").
