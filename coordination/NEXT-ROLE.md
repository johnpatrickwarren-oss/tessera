CURRENT-ROUND: R09
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect; do NOT promote to full tier)

**R09 = cleanup audit-tier round.** Bundles five tactical follow-ups that address the root causes of R07–R08 MAJOR findings (already captured as REINFORCED lines) and clear accumulated MINOR/operator-gate items.

**Tier: audit** (Implementer self-specs; Reviewer cold audits; Memorial records). Rubric verdict per CLAUDE-COMMON.md § Round scaling: all-A-false (no new architectural pattern, no novel data model, no new external dependency, no first-time territory); S4 (tactical follow-up to R07/R08) + S2 (prior round artifacts describe the work). Audit-tier explicitly correct; do NOT promote to full unless an architectural ambiguity surfaces mid-round (and even then, halt-and-route-back per discipline; don't silently expand tier).

## Five in-scope items

### Item 1 — AC-15 empirical investigation + spec premise fix (closes R08 MAJOR-2 surface)

R08 MAJOR-2 root cause: Architect inherited "MCD on the clean alternating-pattern fixture produces zero contamination flags" from R07 Reviewer's MINOR-3 testimony without empirical verification. R08 Delta 11 prescribed tightening AC-15 from `assert.ok(curatedLen <= origLen)` to `assert.strictEqual(curatedLen, origLen)` based on this wrong premise; the tightened assertion failed empirically (`curatedLen=6, origLen=8` — MCD flags 2 ticks per run on 3 runs).

R09 actions:
1. Run the AC-15 fixture against production code (`test/q07-fleet-correlated.test.ts` AC-15 fixture invocation against current `tools/curate-baseline-pre-pass.ts`); record OBSERVED `n_ticks_contaminated`.
2. Fix the spec premise at `coordination/specs/Q-R08-SPEC.md` § Mechanism primitive 11 — replace "produces zero contamination flags (no Stage 2a drop)" with the empirically-correct claim (likely "produces `n_ticks_contaminated=6` (2 ticks × 3 runs) — MCD's robust subset boundary identifies the pattern's tail samples").
3. Write the correct AC-15 binding that matches empirical behavior. Three options:
   - **(α)** Keep `<= origLen` as the binding (preserves the current passing test; documents that MCD's drop count is the empirical measurement, not a tightenable constraint). Recommended unless theory predicts an exact drop count.
   - **(β)** Tighten to `=== origLen - 6` (binds the specific empirical drop). Risk: PRNG sensitivity or fixture changes would break this binding.
   - **(γ)** Add a SECOND binding asserting `n_ticks_contaminated === 6` as a separate AC that captures the spec-premise empirical fact. This decouples the "MCD identifies contamination" claim from the "curated length bound" claim.
   - Implementer picks based on empirical investigation; documents rationale.

### Item 2 — AC-11 H₀ FPR tightening (OQ-R08-1)

R07 MAJOR-2 watch-list carry-forward. `test/q07-fleet-correlated.test.ts` AC-11 currently asserts `assert.strictEqual(firedCount, 0)` on H₀. This is brittle — Ville-bound variation could produce 1 fire of 30 by chance; strict-equality would fail despite being statistically correct (1/30 fires under H₀ with α_fleet=10⁻³ is within tolerance).

R09 action: tighten to `assert.ok(firedCount <= 1, ...)` with a descriptive message documenting that 0 or 1 fire is statistically consistent with H₀ at α_fleet=10⁻³. One-line test change.

### Item 3 — PRD AC-P1 prose update for v0.3 narrowing (OQ-R08-2)

R08 (D) scope amendment narrowed FCP-1 to sustained fleet events. The PRD's AC-P1 should reflect this so the PRD-to-spec trace stays coherent.

R09 action: read `coordination/PRD.md` AC-P1 (the FPR-guarantee AC); if it currently implies broader detection scope than v0.3 documents, narrow the AC-P1 prose to match. Otherwise document the trace explicitly.

### Item 4 — R05 silent-overwrite methodology entry in CLAUDE-COMMON.md

Operator gate item 2 from overnight mode close. The R05 incident (pipeline preflight auto-overwrote NEXT-ROLE.md, wiping operator-prepared inputs; Architect ran on stale inputs and produced SLICE 2b3 instead of operator-authorized SLICE 4) is a cross-role methodology lesson. R06 NEXT-ROLE.md explicitly directed Memorial Updater to record it; R06 Memorial Updater focused on R06's own discipline and didn't propagate.

R09 action (Memorial Updater stage): add a `# REINFORCED 2026-05-16 —` line to `CLAUDE-COMMON.md` capturing the lesson. Suggested wording:
```
# REINFORCED 2026-05-16 — Operator-prepared NEXT-ROLE.md content (round-scope directives,
#   custom input lists, escalation notes) is the SOURCE OF TRUTH for downstream Architect
#   inputs. Pipeline preflight that auto-overwrites operator-prepared content without
#   detection is a methodology bug, not a feature; the canonical anchor pipeline fix lives
#   in PR #37 (preserve-operator-prepared-NEXT-ROLE). Until #37 merges, operators must
#   manually set CURRENT-ROUND: <new-round> in NEXT-ROLE.md before launching, so the
#   preflight sees a match and uses the file as-is. Memorial Updater MUST capture cross-role
#   methodology lessons explicitly directed in incoming NEXT-ROLE.md, even when not directly
#   triggered by the current round's discipline. Detected R05 silent-overwrite incident
#   (operator-authorized SLICE 4 became SLICE 2b3 because preflight wiped operator inputs).
```

### Item 5 — Re-read the 5 new REINFORCED lines (R06+R07+R08) for quality

Inline review during R09 Architect/Implementer phase (no separate deliverable). Validates:
- R06 reinforcements: Architect Component-inventory AC-range cross-check (R06 MINOR-1) — well-written? fires correctly?
- R07 reinforcements: Architect fixture-sizing exhaustive propagation (R07 MAJOR-1); Architect OBSERVED-binding scope (R07 MAJOR-2); Implementer literal-fixture-value HALT (R07 MINOR-1) — clear actionable rules?
- R08 reinforcements: Architect inherited-testimony empirical verification (R08 MAJOR-2); Implementer spec-premise-failure HALT (R08 MAJOR-1) — clear actionable rules?

If any reinforcement reads ambiguously or doesn't capture the actionable rule cleanly, the Implementer's R09 round summary should note it as a watch list item for the next Memorial Updater pass to refine.

## Inputs for next role (load-bearing — READ ALL)

The R09 Implementer MUST read these:

**Round scope artifact:**
- This `coordination/NEXT-ROLE.md` (you're reading it).

**R08 close-state (the round whose MAJORs we're addressing):**
- `coordination/specs/Q-R08-SPEC.md` + `coordination/specs/Q-R08-SPEC-AUDIT.md` — full R08 spec; § Mechanism primitive 11 is the AC-15 premise that's wrong.
- `coordination/reviews/REVIEWER-REPORT-R08.md` — R08 Reviewer findings (MAJOR-1 + MAJOR-2 + watch-list 1-3).
- `coordination/logs/ROUND-R08-SUMMARY.md` — Memorial Updater summary with root-cause analysis.
- `test/q07-fleet-correlated.test.ts` (R08 GREEN: file path is the merged R07+R08 surface) — AC-15 fixture + AC-11 binding both live here.

**R07 close-state (carries the MAJOR-2 reinforcement context):**
- `coordination/reviews/REVIEWER-REPORT-R07.md` — original 4-option fix-list including the AC-11 tightening recommendation.

**Memorials (read for reinforcement context + R05 incident lookup):**
- `coordination/MEMORIAL.md` — R01–R08 entries; R05 silent-overwrite incident is in the R05/R06 Memorial entries.
- `coordination/OVERNIGHT-LOG-2026-05-16.md` — R05 incident framed; R06 Memorial Updater methodology-gap-miss noted.
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` — v0.3 scope narrowing (informs Item 3 PRD AC-P1 update).
- `coordination/PRD.md` — Item 3 target.

**Discipline files (Item 5 review):**
- `CLAUDE-ARCHITECT.md` — 12 REINFORCED lines; review the 4 R06+R07+R08 additions.
- `CLAUDE-IMPLEMENTER.md` — 12 REINFORCED lines; review the 3 R06+R07+R08 additions.
- `CLAUDE-COMMON.md` — currently 0 REINFORCED lines; Memorial Updater stage adds Item 4 here.

## Audit-tier specifics (Implementer self-specs + executes)

Per CLAUDE-COMMON.md tier rubric audit-tier semantics: Implementer applies Brainstorm + Design phases inline (≥3 approaches enumerated for each non-trivial decision); writes a thin spec (1-2 page) covering the 5 items + ACs; then executes. The thin spec lives at `coordination/specs/Q-R09-SPEC.md` (no SPEC-AUDIT sidecar required at audit-tier).

Suggested AC count: ~6-8 (one or two per item). Bind:
- Item 1: AC for "AC-15 binding matches empirical behavior" + AC for spec premise correctness
- Item 2: AC for AC-11 tightened binding
- Item 3: AC for PRD AC-P1 prose alignment with v0.3
- Item 4: AC for CLAUDE-COMMON.md REINFORCED line presence + content
- Item 5: AC for round summary inclusion of reinforcement-quality assessment

## Halt conditions for R09

- **Architectural ambiguity surfaces:** if any item turns out to require an architectural decision (e.g., Item 1's AC-15 binding choice introduces a new spec design question), HALT with DIAGNOSTIC + STATUS: ESCALATE. Audit-tier explicitly disallows silent scope-promotion to full.
- **Empirical investigation contradicts another spec premise:** if running the AC-15 fixture (Item 1) surfaces additional spec-premise errors beyond R08's, that's HALT-and-route-back territory (potentially Item 1.5 added, but architect-level scope decision).
- **Item 4 CLAUDE-COMMON.md edit:** per role discipline, Memorial Updater stage performs this. If the Architect or Implementer attempts to write CLAUDE-COMMON.md directly, that's a role-boundary violation. Reviewer should catch.

## Coordination chore sequence (R14 final revision)

Per CROSS-PROJECT-MEMORIAL.md R14 reinforcement:
1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts (NEXT-ROLE.md + MEMORIAL.md append + observed counts) WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R09): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R09): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R09 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R08 HEAD `24f945e`:
- q07-fleet-correlated: 23/0 (R08 redesign: AC-12/13 repurposed + AC-27/28 added)
- q06-baseline-pre-pass: 13/0
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- betting-e-process smoke: 5/0
- **Total: 93/0**

R09 expected at GREEN: q07 file count may change (AC-11 + AC-15 modifications); total may shift slightly. Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R09 --tier audit
```

`--tier audit` is the operator-set tier. Memorial Updater stage runs at audit-tier; do NOT auto-promote to full.

## Operator gate items preserved (NOT in R09 scope)

These remain awaiting operator decision after R09:
- OQ-1 / Q-JC1 calibrate.ts vendoring decision (architecturally-decisional; full-tier round candidate)
- OQ-R08-3 Phase 2 transient detector scheduling
- Anchor PR #35 / #37 merge decisions

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | R08 closed; overnight mode complete; 4 MAJORs surfaced across overnight. |
| 2026-05-16 | R09 launched as audit-tier cleanup round bundling 5 items addressing MAJOR root causes + accumulated operator-gate items. |
