CURRENT-ROUND: R51
NEXT-ROLE: REVIEWER
STATUS: READY

## Round-scope directive (R51 — CLAUDE-IMPLEMENTER.md re-consolidation + MU re-accretion guard; audit-tier)

R51 follows R50 close (`c5f5862`) per operator-selected sequencing ("R51 + Phase 3 PRD authoring"). R51 is the bounded methodology fix; Phase 3 PRD authoring is a separate operator-led work item after R51 closes.

**Round-start SHA:** `c5f5862` (chore(R50): Memorial-Updater outputs).

### Primary deliverable

Two-part methodology fix:
1. **Consolidate CLAUDE-IMPLEMENTER.md** from 37 REINFORCED entries back to ≤30 (R43 30-entry threshold; AC-R36-21 forward-protection guard). MR-2 Pass-3 redux pattern: roll the 7+ post-R43 standalone entries into existing composites or new composites where thematically appropriate.
2. **Tighten CLAUDE-MEMORIAL.md MU discipline** to prevent re-accretion: future Memorial-Updaters MUST roll violations into existing composites when the role-file is at or near the 30-entry threshold, rather than adding standalone REINFORCED lines.

The structural intent: the methodology framework should self-prevent the "each round adds REINFORCED entries → consolidation needed → consolidation added → cycle repeats" recursion. R51 fixes the existing drift AND closes the source.

Specifically:

- **(a) CLAUDE-IMPLEMENTER.md consolidation (37 → ≤30).** Audit current state: 37 REINFORCED entries. Identify the post-R43 additions (R47/R48/R49/R50 MU appends added ~7 standalones). Fold each into an existing composite sub-variant per thematic match (R43 Pass-3 precedent):
  - Rule 1 sub-class instances → ATTESTATION-SCOPE-FIDELITY composite (existing R43 composite)
  - Pre-emit grilling gaps → PRE-EMIT-GRILLING-COMPLETENESS-GATE composite (existing R43 composite)
  - Spec-prescription fidelity instances → SPEC-PRESCRIPTION-FIDELITY composite
  - Other patterns → match to existing composites OR create new composite if 3+ thematically distinct standalones cluster
  - Update composite heading `(composite; N sub-variants)` count in same edit (R39 MAJOR-1 discipline)
  - Preserve verbatim lesson text in sub-variants (R39 MAJOR-2 discipline; diff before attesting PASS)

- **(b) CLAUDE-MEMORIAL.md MU discipline tightening.** Update step 5 of the Memorial-Updater procedure. Current text: "Add reinforcement lines for each violation this round to the file that matches the violating role." Tightened text:

  > 5. Add reinforcement lines for each violation this round to the file that matches the violating role (Architect violation → CLAUDE-ARCHITECT.md, etc.). **Re-accretion guard (R51):** before appending a standalone REINFORCED line, check the target file's current REINFORCED count via `grep -c "^# REINFORCED" CLAUDE-<ROLE>.md`. If the count is ≥ 28 (within 2 of the 30-entry threshold R43 consolidated to), THEN evaluate whether the violation can be folded into an existing composite sub-variant. If a thematically-matching composite exists, ROLL the violation as a new sub-variant rather than adding a standalone. Only add standalone REINFORCED entries when the count is < 28 OR the violation is genuinely novel with no thematic composite (and the composite count update discipline of R39 MAJOR-1 applies to the composite heading).

  This converts the MU's accretion behavior from "always-standalone" (current) to "roll-when-threshold-near" (R51). The threshold-aware behavior prevents the R47-R50 re-accretion pattern.

- **(c) R51 self-applies via Q-R51-EMPIRICAL.sh.** Verifier checks post-R51 state:
  - `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` == 30 (or in range [25, 30])
  - All composite headings' `(composite; N sub-variants)` counts match body sub-variant counts (R39 MAJOR-1)
  - All 7+ folded standalones' distinctive phrases verifiable in target composite bodies (R43 AC-R43-8 precedent)
  - CLAUDE-MEMORIAL.md step 5 contains the new threshold-aware rule (grep for "Re-accretion guard (R51)")
  - Test baseline shifts to `361/356/2/3` (AC-R36-21 FAIL → PASS — discipline-restoration, NOT regression; same pattern as R43 fix)

### Tier rationale

**audit-tier** — methodology round; Implementer authors thin spec inline (Q-R51-SPEC.md); Reviewer cold-eye; MU close. R43 + R47 precedent — consolidation rounds are audit-tier.

### Anti-scope (R51 hard limits)

- NO modification of `engine/*`, `test/*`, `tools/*` files (zero production-code changes).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (frozen shards).
- NO modification of R42-R50 specs / empirical files (preserve historical baseline).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`.
- NO modification of `scripts/finalize-round.sh`, `scripts/verify-empirical-acs.sh`, `scripts/pre-commit-rule-sweep.sh`, `scripts/verify-wave-aggregate.sh`, `run-pipeline.sh` (R45/R46/R47/R49/R50 deliverables stable).
- NO modification of `CLAUDE-COMMON.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-COORDINATOR.md` (R51 only touches CLAUDE-IMPLEMENTER.md REINFORCEMENTS section + CLAUDE-MEMORIAL.md step 5).
- NO Phase 3 territory.
- NO opening any GitHub PRs.

ALLOWED modifications:
- `CLAUDE-IMPLEMENTER.md` REINFORCEMENTS section (consolidation; this is the round's primary deliverable)
- `CLAUDE-MEMORIAL.md` step 5 (re-accretion guard addition)
- `coordination/specs/Q-R51-SPEC.md` (NEW — Implementer-authored thin spec)
- `coordination/specs/Q-R51-EMPIRICAL.sh` (NEW — self-applies)
- `coordination/MEMORIAL.md` (chore-A append)
- `coordination/NEXT-ROLE.md` (this file; pipeline updates)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — all empirical claims (REINFORCED count; composite sub-variant count; section text grep) verified via Q-R51-EMPIRICAL.sh at chore-A. Applies R47 Tightenings 1-4 + R48 corrections + R49 conventions (assert_eq not assert_ge; stdout-grep; re-derive SHAs; exact counts).
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET in Q-R51-SPEC.md at spec-emit time; matches the ALLOWED modifications list above.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R51 tightens MU discipline AND applies it to itself. R51 MU stage (at MU pipeline subprocess) MUST follow the new threshold-aware rule (likely will roll its own R51 violations into composites since count is at threshold). Self-application demonstrated end-to-end.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if any fold creates a thematic-mismatch sub-variant or paraphrases lesson text, HALT + DIAGNOSTIC. Per R39 MAJOR-2: run `diff` between origin standalone and target sub-variant body; require byte-identical match (allowing only bullet-and-label transformation).
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (a) extension — CLAUDE-MEMORIAL.md MU discipline tightening IS a new propagation surface for the re-accretion failure mode. Surface (c) round-of-derivation: R51 IS the round deriving the threshold-aware MU rule; same-round self-application via R51's own MU pass (which will use the new threshold-aware rule).

### Halt conditions

1. **Q-R51-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **CLAUDE-IMPLEMENTER.md REINFORCED count NOT in range [25, 30] post-fold:** HALT + DIAGNOSTIC. Off-by-1 acceptable for drift; larger off-target indicates structural error.
3. **Verbatim lesson preservation failure:** if `diff` between origin standalone and target sub-variant body shows substantive paraphrasing → HALT + DIAGNOSTIC + ESCALATE per R39 MAJOR-2.
4. **Composite count mismatch:** if any composite heading's `(N sub-variants)` count != actual body sub-variant count post-fold → HALT + DIAGNOSTIC per R39 MAJOR-1.
5. **Thematic mismatch:** if a fold target doesn't naturally fit its assigned composite, HALT + DIAGNOSTIC; do NOT force-fit via paraphrase.
6. **Test baseline drift other than AC-R36-21 FAIL→PASS:** expected baseline shift is 361/355/3/3 → 361/356/2/3 (discipline-restoration; AC-R36-21 passes when count ≤ 30). Any other test status change → HALT + DIAGNOSTIC.
7. **Bash syntax error:** `bash -n` on Q-R51-EMPIRICAL.sh exits non-zero → HALT + DIAGNOSTIC.

### Inputs for Implementer

1. `CLAUDE-IMPLEMENTER.md` — file to consolidate; 37 REINFORCED entries (item a target).
2. `CLAUDE-MEMORIAL.md` — file to extend with re-accretion guard (item b target); step 5 specifically.
3. `coordination/specs/Q-R43-SPEC.md` — R43 Pass-3 consolidation precedent + ATTESTATION-SCOPE-FIDELITY + PRE-EMIT-GRILLING-COMPLETENESS-GATE composite creation pattern.
4. R49/R50 verifier patterns (`coordination/specs/Q-R49-EMPIRICAL.sh`, `coordination/specs/Q-R50-EMPIRICAL.sh`) — most recent stable empirical-verifier authoring patterns.
5. R47/R48/R49/R50 Reviewer reports — surface the patterns R51 folds will document.
6. `coordination/MEMORIAL.md` R47-R50 MU sections — identifies which 7+ standalones got added (the fold targets).

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R51 --tier audit
```

(Per R49 pipeline-mandatory discipline; this is the canonical invocation. `scripts/finalize-round.sh` will auto-fire pipeline at Implementer chore-A close.)

---

## Operator-decision flags (carried forward; status post-R50 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R50 contributions).
5. **Phase 3 PRD authoring + § 5.2 forward-protection redesign A/B/C** — operator-selected as the post-R51 next step.
6. CLAUDE-IMPLEMENTER.md re-consolidation — **R51 IN PROGRESS (this round).**
7. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
8. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.

HARD STOP re-engaged on Phase 3 scope entry pending operator-led PRD authoring (post-R51).
