CURRENT-ROUND: R08
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set via expanded autonomous authority (do NOT auto-redirect)

**R08 = SLICE 5 amendment + R07 MAJOR-1/MAJOR-2 closure via Option (B)+(D).**

This round is **NOT** a Q-JC4 re-disposition (the sequential e-process formulation stands; framework is correct for the realistic threat model). It IS:

1. **Scope narrowing of the FCP-1 claim** (Option D from R07 Reviewer's watch list): amend `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` § 1 Executive summary to document FCP-1 as detecting **sustained fleet events** (the realistic threat model: deploy/firmware-push/cooling-failure all span many windows). Transient single-window contamination is explicitly out of scope for SLICE 5; future-cycle candidate if real production traces surface demand. The amended memo becomes `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` (or appends an amendment section to v0.2; Architect's call).

2. **Spec fixture redesign closing R07 MAJOR-1 + MAJOR-2** (Option B from R07 Reviewer's watch list):
   - **Preserve** R07's AC-12/13 single-window injection tests, **repurposed** as FPR-under-perturbation tests (Type-I error checks; assert `firedCount` low or zero under benign single-window perturbation). This is meaningful: a benign single-window measurement spike SHOULD NOT trigger FCP-1; testing this directly is a valid Type-I error check, not a self-confirming binding.
   - **Add** new ACs with sustained injection per AC-8 pattern (numbering at Architect's discretion — AC-12.5/13.5, AC-27/28, or renumber). Assert nonzero expected fire count derived from theoretical power calculation (NOT OBSERVED-binding). Closes MAJOR-2 self-confirming gap.
   - The redesigned bindings must NOT use the OBSERVED-binding disposition for the new sustained-injection ACs; that disposition is now scoped to PRNG-drift-class only per the R07 Memorial Updater reinforcement.

3. **Update the pre-disposition** (`coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`) with a small append: Q-JC4 scope-narrowing recorded as "operator-confirmed via authority-expansion 2026-05-16; FCP-1 detects sustained fleet events; transient single-window contamination is Phase 2+ candidate."

In-passing items R08 MAY close (Architect's discretion; not load-bearing for the round):
- **R06 MINOR-1 carry-forward:** `engine/types/config.ts:228` stale JSDoc "(D1-D10)" — should be "(D1-D13)" after R06 Delta 1 extended the union. Small one-line fix.
- **R07 MINOR-2/3/4 watch-list items:** AC-5/6 unused `xw` tuple element; AC-15 `<=` vs `===`; AC-16 ambiguous comment. Fixture-level closures.

## Q-JC4 framework PRESERVED (not re-dispositioned)

Per `ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`, Q-JC4's sequential e-process formulation stands:
- `e_w = L(X_w | Binomial(N, p_alt)) / L(X_w | Binomial(N, p_base))` — preserved
- Ville bound at `α_fleet` — preserved
- Q-JC4a betting-adaptive `p_alt` — preserved
- Q-JC4b Bayesian shrinkage `p_base` with disjoint-data constraint — preserved
- Q-JC4c separate-pipe from Q-J1 e-BH — preserved
- Q-JC5 R03 `residual_seed_hash` reuse — preserved

The R07 PR-F8 evidence demonstrated the algorithm has power against sustained events (AC-8: 30-window injection) but not against single-window events (AC-12/13: 0/30 fires). R08 addresses this by narrowing the FCP-1 claim to match the algorithm's actual capability AND redesigning the failed-prediction ACs to test what the algorithm actually does.

## Inputs for next role (load-bearing — READ ALL)

The R08 Architect MUST read these before brainstorming:

**Operator-set scope artifacts (this round's disposition):**
- This `coordination/NEXT-ROLE.md` (you're reading it).
- `coordination/OVERNIGHT-LOG-2026-05-16.md` — "R07 — Phase 1 SLICE 5 FCP-1" entry + "Authority expansion" entry. Captures the Option (B)+(D) recommendation that became R08's authorized scope.

**R07 artifacts (the round being amended):**
- `coordination/specs/Q-R07-SPEC.md` + `coordination/specs/Q-R07-SPEC-AUDIT.md` — full R07 spec + audit sidecar (full brainstorm of 5 e-process formulations).
- `coordination/reviews/REVIEWER-REPORT-R07.md` — Reviewer findings including the 4 fix-options (Option B + D = R08 scope; Options A and C explicitly rejected).
- `coordination/logs/ROUND-R07-SUMMARY.md` — Memorial Updater summary; root-cause analysis of MAJOR-1/MAJOR-2.
- `tools/curate-baseline-fleet-correlated.ts` (R07 GREEN) — FCP-1 implementation; algorithm preserved.
- `test/q07-fleet-correlated.test.ts` (R07 GREEN) — current test file; R08 modifies AC-12/13 + adds new sustained-injection ACs.

**Scoping artifacts (R08 amends):**
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` — § 1 Executive summary is the amendment target. R08 produces either v0.3 OR appends an amendment section to v0.2.
- `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` — Q-JC4 disposition gets a small append recording the scope narrowing.

**Discipline memorials:**
- `coordination/MEMORIAL.md` — R01–R07 entries; R07 entries include the OBSERVED-binding scope reinforcement.
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` — R09 self-confirming pattern (directly relevant to R07 MAJOR-2 closure); R14 stale-SHA two-commit sequence.

## Halt conditions for R08

- **Sequential e-process formulation drift:** if Architect's brainstorm considers re-disposition of Q-JC4 (Option C algorithmic redesign), HALT — this is operator-gate territory per R07 escalation framing; Option C requires PR-F10 pair-review trigger + new SLICE 6+ scope. R08 is constrained to (B)+(D) by operator disposition.
- **New OBSERVED-binding without right-reasons check:** if any new AC in R08 uses OBSERVED-binding disposition, the spec MUST include the "would a future FIX matching the prediction FAIL this test?" check inline (R07 MAJOR-2 reinforcement now standing).

## Coordination chore sequence (R14 final revision — same as R06/R07)

1. Run all binding commands at GREEN; record OBSERVED counts (NOT pre-stated).
2. Write all coordination artifacts (NEXT-ROLE.md + MEMORIAL.md append + observed counts) WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R08): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R08): record attestation SHA"` → SHA-B (becomes HEAD).
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

Do NOT use `--amend`. Do NOT collapse the two commits.

## Pre-R08 baseline (INFORMATIONAL; do NOT pre-state at GREEN per R03 MINOR-4)

Reviewer-verified at R07 HEAD `fd7e3a6`:
- q07-fleet-correlated: 21/0
- q06-baseline-pre-pass: 13/0
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- betting-e-process smoke: 5/0
- **Total: 91/0**

R08 expected: prior 10 file counts unchanged + AC-12/13 redesign (still in q07; count may change) + new sustained-injection ACs added (still in q07; count likely +2 to +4). Implementer reports OBSERVED counts per file at GREEN.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R08 --tier full
```

`--tier full` per A3 (resolving open question — the R07 MAJORs) + A5 (critical NFR ties — FCP-1's scope claim).

## R06+R07+R08 = full autonomous-round budget (3 of 3)

This is the third and final autonomous round under the 2026-05-16 cost-discipline budget. After R08 closes (regardless of outcome), I STOP and wait for John's return.

## Operator gate items (preserved for John's return — not blocking R08)

1. **OQ-1 / Q-JC1 narrowing (from R06):** does R09+ proceed with `tools/calibrate.ts` vendoring as a dedicated round, OR does R06 Stage 3a's structural-typing compatibility suffice? Architect-pre-prediction: structural-typing suffices for Phase 1.
2. **R05 methodology gap not captured by R06 Memorial Updater.** Worth a small follow-up if CLAUDE-COMMON.md should gain the reinforcement.
3. **Anchor PR #37** (preflight preserve operator-prepared NEXT-ROLE.md): still open.
4. **Anchor PR #35** (MD-F6 + verify-citations.sh): still open.

## Update history (continued)

| Date | Event |
|---|---|
| 2026-05-16 | R07 closed Reviewer-MERGE-READY with 2 MAJORs (PR-F8 power-gap + self-confirming tests); autonomous mode escalated. |
| 2026-05-16 | John expanded autonomous authority: continue per my recommendations without approval; R07 MAJORs become R08 work under (B)+(D) disposition. |
| 2026-05-16 | R08 launched under expanded authority (third and final round under the cost-discipline budget). |
