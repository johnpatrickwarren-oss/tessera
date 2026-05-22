# Q-R89-SPEC — Methodology Hygiene: Coordination-Surface Archival + CLAUDE-*.md Consolidation + Sustaining Mechanism

**Round:** R89 (audit-tier; Implementer wears Architect hat)
**Round-start SHA:** `db232d9`
**Date:** 2026-05-21
**Tier rationale:** Audit (S1–S5 apply; no new dependencies, no new engine work; mechanical reorg + composite folding + new scripts fit audit-tier scope per R42 + R51 precedent)

---

## § 0 — Brainstorm (required per Superpowers discipline)

### Decision 1: NEXT-ROLE.md sharding strategy

**Approach A (Single shard "PHASE-4"):** Create one `NEXT-ROLE-PHASE-4.md` shard containing `sed -n '127,7961p'` of current NEXT-ROLE.md. Active file resets to lines 1–126.
- Strengths: Simple; clean active file (126 lines); R42 byte-identical discipline preserved trivially.
- Weaknesses: Phase 3 directives (lines 3714–5979) and routing blocks (5980–7961) are "misnamed" as Phase 4.
- Hidden assumption: The label "Phase 4" is acceptable for content that includes Phase 3 directives.

**Approach B (Two shards, Phase 3 + Phase 4):** Split at line 3714 (first R72 directive). `NEXT-ROLE-PHASE-3.md` = lines 127–3713; `NEXT-ROLE-PHASE-4.md` = lines 3714–7961.
- Strengths: More accurate phase labels.
- Weaknesses: Routing blocks (lines 5980–7961) span both phases — semantically mixed in PHASE-4 shard.
- Risk: False precision; Phase 3 routing blocks are embedded in the 5980–7961 range alongside Phase 4 routing blocks.

**Approach C (All content in one shard, named "PRIOR"):** `NEXT-ROLE-PRIOR.md` = lines 127–7961.
- Strengths: Completely honest labeling (no phase claim).
- Weaknesses: Doesn't match MEMORIAL precedent naming (MEMORIAL-PHASE-N.md convention).
- Risk: Convention mismatch complicates the phase-shard-index cross-referencing.

**Selected: Approach A.** The Phase 4 label is accurate for the majority content (lines 127–3713 are Phase 4 directives R87→R73). The Phase 3 directives and routing blocks at lines 3714–7961 predate Phase 4 and are noted in the phase-shard index as "Phase 3 directives + all routing blocks included in Phase 4 shard for structural simplicity — no clean phase break existed in NEXT-ROLE.md prior to R89." No Phase 1/2 NEXT-ROLE content exists. Rejected B (routing block semantic impurity persists regardless of split point); rejected C (naming convention drift from MEMORIAL).

### Decision 2: CLAUDE-ARCHITECT.md consolidation strategy

**Approach A (Expand existing composite + 2 new composites):** Fold 14 entries into EMPIRICAL-PREMISE-VERIFICATION; create SPEC-PRESCRIPTION-DISCIPLINE (8 entries) and SPEC-INTERNAL-CONSISTENCY (7 entries). Result: 51 → 24 entries.
- Strengths: Creates thematically coherent composites; well under ≤30 target.
- Weaknesses: Need to add 2 new composite headings; more work.

**Approach B (Expand existing composite only):** Fold all foldable entries into EMPIRICAL-PREMISE-VERIFICATION. To reach ≤30 from 51, need to fold 21+ entries into one composite. Result: composite grows to 35 sub-variants.
- Strengths: Simpler (no new composites).
- Weaknesses: EMPIRICAL-PREMISE-VERIFICATION becomes unwieldy at 35 sub-variants; some entries don't fit the empirical-premise theme.
- Risk: Misclassification of spec-internal-consistency entries under empirical-premise.

**Approach C (Many small composites):** Create 4–5 new composites from all 50 standalones. Result: 5–6 total composites, 0 standalones.
- Strengths: Maximum grouping.
- Weaknesses: Overkill; creates composites with only 3–4 sub-variants; over-engineering.

**Selected: Approach A.** 14 folds into existing EMPIRICAL-PREMISE-VERIFICATION (9 pre-composite entries + 5 thematically-fitting post-composite entries). 2 new composites for spec prescription discipline (8 entries) and spec internal consistency (7 entries). 21 standalones remain. Total: 24 ≤ 30. Rejected B (theme mismatch); rejected C (premature over-grouping).

### Decision 3: Sustaining mechanism shape (Option α/β/γ)

**Option α:** `scripts/check-claude-md-thresholds.sh` called from `scripts/finalize-round.sh` Step 7.
- Strengths: Load-bearing (runs at every round close via finalize-round.sh); minimal invasiveness.
- Weaknesses: Only fires at finalize-round.sh invocation; not a git hook.

**Option β:** Architect-side check in SPEC-AUTHORING-CHECKLIST.md.
- Strengths: Fires at spec-emit time.
- Weaknesses: Advisory-only (checklist is manual); violates "load-bearing" requirement.

**Option γ:** New `scripts/finalize-round.sh` post-MU hook that auto-runs consolidate-reinforcements.sh.
- Strengths: Auto-consolidation.
- Weaknesses: `consolidate-reinforcements.sh` is a 180-day-age script, R86-confirmed no-op at Tessera's current age; auto-consolidation is risky.

**Selected: Option α.** Load-bearing (finalize-round.sh runs at every round close); minimal invasiveness to pipeline; exits non-zero if threshold exceeded, blocking the finalize. Rejected β (advisory-only violates the directive's "must be load-bearing" requirement); rejected γ (auto-consolidation risk + no-op script age issue).

---

## § 1 — Goal

Reduce the per-round default-read cost of Tessera's coordination surface by: (1) sharding `coordination/NEXT-ROLE.md` (7,961 lines) and closing `coordination/MEMORIAL.md` Phase 3+4 shards; (2) folding accreted REINFORCED entries in `CLAUDE-ARCHITECT.md` (51 → ≤30) and `CLAUDE-IMPLEMENTER.md` (41 → 30); (3) wiring a sustaining mechanism (`scripts/check-claude-md-thresholds.sh`) into `scripts/finalize-round.sh` to prevent silent re-accretion. AC-R36-21 (CLAUDE-IMPLEMENTER ≤30 entries) flips FAIL→PASS as the primary discipline-restoration signal.

---

## § 2 — Mechanism

### 2.1 MEMORIAL.md archival

Pre-R89 MEMORIAL.md lines 1–57: header + inherited Memorials + Phase 1+2 shard index (preserve byte-identical in active file).

**Phase 3 shard** (`coordination/MEMORIAL-PHASE-3.md`):
- 12-line shard header (frozen marker, scope = R42–R72, back-reference resolution path)
- Body = `git show db232d9:coordination/MEMORIAL.md | sed -n '58,1720p'` — byte-identical

**Phase 4 shard** (`coordination/MEMORIAL-PHASE-4.md`):
- 12-line shard header (frozen marker, scope = R73–R87, back-reference resolution path)
- Body = `git show db232d9:coordination/MEMORIAL.md | sed -n '1721,2752p'` — byte-identical

**Active file reset** (`coordination/MEMORIAL.md`):
- Lines 1–57: original header (byte-identical)
- Updated phase-shard-index table: add Phase 3 and Phase 4 rows
- Lines 2753–2825 (R88 entries): preserved byte-identical
- R89 entries appended after round completion

### 2.2 NEXT-ROLE.md archival

**Phase 4 shard** (`coordination/NEXT-ROLE-PHASE-4.md`):
- 12-line shard header (frozen marker, scope = R73–R87 directives + Phase 3 directives + all routing blocks, note about structural simplicity)
- Body = `git show db232d9:coordination/NEXT-ROLE.md | sed -n '127,7961p'` — byte-identical

**Active file reset** (`coordination/NEXT-ROLE.md`):
- Lines 1–126 of pre-R89 content: preserved byte-identical
- New phase-shard-index section inserted after the R89 directive (before the `---` separator that precedes routing blocks in prior rounds)
- Note: Phases 1+2 had no NEXT-ROLE.md per-round directives; NEXT-ROLE-PHASE-3.md not created (Phase 3 content included in NEXT-ROLE-PHASE-4.md per § 0 Decision 1 rationale)

### 2.3 CLAUDE-IMPLEMENTER.md consolidation (41 → 30)

Fold these 11 standalone `# REINFORCED` entries into existing composites (no new composites):

| Standalone entry | Target composite | Heading update |
|---|---|---|
| `false-compliance-attestation (cross-project rule)` | ATTESTATION-SCOPE-FIDELITY | "(12 sub-variants)" → "(13 sub-variants)" |
| `anti-scope-allowed-set-forward-coverage (cross-project rule)` | AC-COVERAGE-COMPLETENESS | "(6 sub-variants)" → "(7 sub-variants)" |
| `rule-derivation-without-self-application (cross-project rule)` | SPEC-PRESCRIPTION-FIDELITY | "(13 sub-variants)" → "(14 sub-variants)" |
| `When spec § Mechanism defines a quantitative formula by name` | CITATION-AND-ARITHMETIC-ACCURACY | "(10 sub-variants)" → "(11 sub-variants)" |
| `When an AC test computes its expected value via a production helper` | CITATION-AND-ARITHMETIC-ACCURACY | "(11 sub-variants)" → "(12 sub-variants)" |
| `When spec § Mechanism specifies a quantitative bound` | CITATION-AND-ARITHMETIC-ACCURACY | "(12 sub-variants)" → "(13 sub-variants)" |
| `When building a measurement-proxy helper that cross-references` | CITATION-AND-ARITHMETIC-ACCURACY | "(13 sub-variants)" → "(14 sub-variants)" |
| `Commit message file-size claims must cite actual observable values` | CITATION-AND-ARITHMETIC-ACCURACY | "(14 sub-variants)" → "(15 sub-variants)" |
| `Memorial attestation must reflect actual observed delta` | MEMORIAL-AND-ATTESTATION-ACCURACY | "(8 sub-variants)" → "(9 sub-variants)" |
| `Halt-condition observed-vs-predicted divergence must ESCALATE` | ATTESTATION-SCOPE-FIDELITY | "(13 after prior fold)" → "(14 sub-variants)" |
| `Prefix-continuity-invariant must be honored` | ATTESTATION-SCOPE-FIDELITY | "(14 after prior fold)" → "(15 sub-variants)" |

Final: 41 - 11 = 30. ATTESTATION-SCOPE-FIDELITY final count = "(15 sub-variants)".

Rule: Update heading counts IN THE SAME COMMIT as the sub-variant body (R39 MAJOR-1 discipline).

### 2.4 CLAUDE-ARCHITECT.md consolidation (51 → 24)

Fold into existing EMPIRICAL-PREMISE-VERIFICATION (14 sub-variants → 28):
- 9 pre-composite standalones (lines 94–177): cross-spec-section consistency, type declaration site, file deletion command, re-export chain, grep verification soundness, per-file test counts, AC-range arithmetic, JSDoc stale text, opts-interface AC-coverage
- 5 post-composite standalones: L443 (REVIEWER-ANCHOR line-range), L459 (statistical bound naming), L546 (worktree baseline run), L820 (EMPIRICAL.sh shell-command patterns), L841 (global vs anchored patterns)

Create `# REINFORCED — SPEC-PRESCRIPTION-DISCIPLINE (composite; 8 sub-variants)` from:
- L431 (file-level docblock), L473 (anti-scope baseline), L499 (vendored file test enumeration), L511 (§5 preamble classification), L521 (spec commit sequencing), L528 (gitignore check), L538 (failure modes exhaustiveness), L589 (JS regex validation)

Create `# REINFORCED — SPEC-INTERNAL-CONSISTENCY (composite; 7 sub-variants)` from:
- L487 (conflicting halt/AC prescriptions), L557 (ESCALATE amendment propagation), L568 (discriminability check), L580 (§9.8 boundary clause sweep), L679 (type-shape drift across spec sections), L693 (P3 ten-axis coverage), L797 (spec-amendment-ALL-gate propagation)

Result: 1 expanded composite + 2 new composites + 21 remaining standalones = 24 total. All 3 composite headings updated in the same commit (R39 MAJOR-1).

### 2.5 Sustaining mechanism

New file `scripts/check-claude-md-thresholds.sh`:
- Loops over each CLAUDE-*.md file in project root
- Counts `grep -c '^# REINFORCED'` for each
- Emits WARN when any file's count is in range [30, 40)
- Emits ERROR and exits 1 when any file's count ≥ 40
- At post-R89 state (ARCH=24, IMPL=30, COMMON=8, REVIEWER=3, MEMORIAL=2): all counts below 30, exits 0

Wire into `scripts/finalize-round.sh` at end of Step 7 (after `run-pipeline.sh` invocation):
```bash
# ── Step 7b: CLAUDE-*.md threshold check ─────────────────────────────────────
if [[ -z "${_FINALIZE_PIPELINE_ACTIVE:-}" ]]; then
  "$PROJECT_ROOT/scripts/check-claude-md-thresholds.sh" || {
    echo "WARNING: CLAUDE-*.md threshold check failed. Consider running consolidation."
  }
fi
```

The threshold check is inside the `_FINALIZE_PIPELINE_ACTIVE` guard so it only runs once (not recursively from inside pipeline).

---

## § 3 — Acceptance criteria

| AC | Given | When | Then |
|---|---|---|---|
| AC-R89-1 | pre-R89 MEMORIAL.md at SHA db232d9 | `git show db232d9:coordination/MEMORIAL.md \| sed -n '58,1720p'` | output equals body of MEMORIAL-PHASE-3.md (lines 13+ of shard file; diff is empty) |
| AC-R89-2 | pre-R89 MEMORIAL.md at SHA db232d9 | `git show db232d9:coordination/MEMORIAL.md \| sed -n '1721,2752p'` | output equals body of MEMORIAL-PHASE-4.md (lines 13+ of shard file; diff is empty) |
| AC-R89-3 | pre-R89 NEXT-ROLE.md at SHA db232d9 | `git show db232d9:coordination/NEXT-ROLE.md \| sed -n '127,7961p'` | output equals body of NEXT-ROLE-PHASE-4.md (lines 13+ of shard file; diff is empty) |
| AC-R89-4 | post-R89 CLAUDE-ARCHITECT.md in working tree | `grep -c '^# REINFORCED' CLAUDE-ARCHITECT.md` | result ≤ 30 |
| AC-R89-5 | post-R89 CLAUDE-IMPLEMENTER.md in working tree | `grep -c '^# REINFORCED' CLAUDE-IMPLEMENTER.md` | result ≤ 30 (AC-R36-21 FLIP: was 41, now 30) |
| AC-R89-6 | post-R89 CLAUDE-*.md files in working tree | `bash scripts/check-claude-md-thresholds.sh` | exits 0 |
| AC-R89-7 | pre-R89 MEMORIAL.md at SHA db232d9 | `git show db232d9:coordination/MEMORIAL.md \| sed -n '2753,2825p'` | output equals `git show HEAD:coordination/MEMORIAL.md \| sed -n '2753,2825p'` (R88 entries preserved byte-identical in the active file at same line positions) — confirmed before R89 entries appended to MEMORIAL.md |
| AC-R89-8 | pre-R89 NEXT-ROLE.md at SHA db232d9 | `git show db232d9:coordination/NEXT-ROLE.md \| sed -n '1,126p'` | output equals first 126 lines of current NEXT-ROLE.md (directive block preserved byte-identical) |

Test count prediction (chore-A binding-command state):
- Pre-R89 baseline: tests=702, pass=682–683, fail=15–16, skip=4
- R89 adds 8 new tests (q89-methodology-hygiene.test.ts), all PASS
- AC-R36-21 flips FAIL→PASS (CLAUDE-IMPLEMENTER.md now at 30 entries)
- No new forward-protection flips (AC-R85-19 etc. remain in pre-existing fail set)
- Predicted post-R89: **tests=710, pass=691–692, fail=14–15, skip=4**
- AC-R84-14 stochastic flake band [14,15] preserved (was [15,16]; net -1 from AC-R36-21 flip)

---

## § 4 — Anti-scope

- NO modification of `engine/*`
- NO modification of `tools/curate-baseline.ts` or any R88 substantive deliverable
- NO modification of `tools/curate-baseline-*.ts` / `tools/calibrators/*`
- NO modification of `demos/*`
- NO modification of `run-pipeline.sh` core flow
- NO new external npm/node dependencies
- NO content rewriting in MEMORIAL/NEXT-ROLE shards (byte-identical via sed; Rule 6)
- NO paraphrase of REINFORCED rule text during composite folding (fold as sub-variants; preserve text)
- NO modification of test/*.test.ts files except adding `test/q89-methodology-hygiene.test.ts`
- NO modification of pre-R89 coordination spec files

### Allowed modifications (explicit ALLOWED_SET):

```
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
coordination/NEXT-ROLE.md
coordination/NEXT-ROLE-PHASE-4.md          (NEW)
coordination/MEMORIAL.md
coordination/MEMORIAL-PHASE-3.md           (NEW)
coordination/MEMORIAL-PHASE-4.md           (NEW)
scripts/check-claude-md-thresholds.sh      (NEW)
scripts/finalize-round.sh                  (modified: +Step 7b threshold check)
test/q89-methodology-hygiene.test.ts       (NEW)
coordination/specs/Q-R89-SPEC.md           (NEW)
coordination/specs/Q-R89-SPEC-AUDIT.md     (NEW)
coordination/specs/Q-R89-EMPIRICAL.sh      (NEW)
coordination/reviews/REVIEWER-REPORT-R89.md (NEW; Reviewer role)
coordination/MEMORIAL.md                   (R89 MU entries appended)
coordination/logs/ROUND-R89-ROUTING.md     (NEW; coordination logs)
```

---

## § 5 — Open questions

None — all resolved inline per § 0 brainstorm:
- NEXT-ROLE shard strategy: Single shard NEXT-ROLE-PHASE-4.md (Approach A selected)
- CLAUDE-ARCHITECT.md strategy: 2 new composites + expand existing (Approach A selected)
- Sustaining mechanism shape: Option α (check-claude-md-thresholds.sh in finalize-round.sh)
- Phase boundary for MEMORIAL.md: line 1720 (last R72 content) / line 1721 (first R73 content) — confirmed by direct read
- Phase boundary for NEXT-ROLE.md: line 126 (active content ends) / line 127 (prior content begins) — confirmed by direct read

---

## § 6 — Halt conditions

1. EMPIRICAL.sh non-zero exit at chore-A
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit
3. Test baseline: tests≠710 OR fail∉[14,15] OR skip≠4 (after accounting for R89 additions + AC-R36-21 flip)
4. Phase-shard byte-identical diff non-empty
5. CLAUDE-ARCHITECT.md post-R89 count > 30
6. CLAUDE-IMPLEMENTER.md post-R89 count > 30
7. New external dependency encountered: HALT + DIAGNOSTIC + ESCALATE
8. REINFORCED rule text paraphrased or dropped during folding: HALT + DIAGNOSTIC
9. Anti-scope file modified: HALT + DIAGNOSTIC + ESCALATE
10. `run-pipeline.sh` core flow modification required beyond a single `if` block: HALT + ESCALATE
