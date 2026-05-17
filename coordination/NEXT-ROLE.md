CURRENT-ROUND: R07
NEXT-ROLE: OPERATOR (escalation — overnight autonomous mode halted)
STATUS: OPERATOR-REVIEW

## Overnight mode halted at R07 close — operator gate

The Reviewer routed R07 MERGE-READY (0 CRITICAL · 2 MAJOR · 4 MINOR · 4 OBS · 26/26 ACs PASS), but **autonomous mode is stopping here** because the 2 MAJORs surface fix-options that span both spec-level (autonomous) and Q-JC-level (operator gate) authority. Continuing to R08 without operator input risks the autonomous Architect picking a Q-JC-level option that should be your call.

**Read this first:** `coordination/OVERNIGHT-LOG-2026-05-16.md` → "R07 — Phase 1 SLICE 5 FCP-1 + Stage 3b + PR-F8" section. Has the MAJORs paraphrased, the Reviewer's 4 fix-options summarized, and my recommendation.

## The substantive question for you

R07 implemented FCP-1 (Fleet-Correlated-Pattern sequential e-process) correctly per spec. The algorithm has empirical power against **sustained** fleet events (AC-8: 30-window sustained injection demonstrates detection) but **zero** empirical power against **single-window** events (AC-12 strong p_alt=0.5: 0/30 fires; AC-13 weak p_alt=0.1: 0/30 fires). Root cause is structural: the sequential e-process's martingale property requires λ accumulation across windows; a single-window injection at w=100 doesn't accumulate enough wealth to cross the 1/α_fleet threshold.

The Reviewer's MAJOR-2 also flags AC-11/12/13 as functionally self-confirming: the tests assert `firedCount === 0` where 0 is the OBSERVED zero-power result. A future FIX producing nonzero power would FAIL these tests.

**Two interlocking decisions:**

1. **Fixture redesign (MAJOR-2 closure):** rewrite AC-12/13 to bind nonzero expected power against sustained injection (AC-8 style), or split into single-window FPR tests + sustained-event detection tests.
2. **Algorithm scope claim:** does FCP-1 *claim* to detect single-window contamination, or does the curation memo's "fleet-correlated-pattern" framing implicitly mean sustained events (deploy/firmware/cooling failures, which span many windows)?

## My recommended disposition

**Option (B) + Option (D).** Both are within R08 spec-fix scope; combined they close MAJOR-1 and MAJOR-2 without requiring algorithmic redesign:

- **(B) Fixture redesign — preserve AC-12/13 single-window as FPR-under-perturbation tests, add AC-12.5/13.5 with sustained injection.** Spec-level fix; autonomous Architect can implement under operator-confirmed scope.
- **(D) Scope amendment to SCOPING-MEMO-BASELINE-CURATION-v0.2 § 1 Executive summary.** Document that FCP-1 detects sustained fleet events (the realistic threat model: deploys, firmware pushes, cooling failures all span many windows). Transient single-window contamination is out of scope for SLICE 5; if needed later, opens a SLICE 6 path with a separate algorithmic primitive (Option C territory).

**Why not (A) alone:** Replacing AC-12/13 with sustained injection fixes the immediate test problem but leaves the scope question implicit — future operator or reviewer might re-pose "but FCP-1 should detect single-window events." Better to document the scope explicitly.

**Why not (C):** algorithmic redesign (GROW mixture or static λ) is novel-literature work that fires PR-F10 and adds a SLICE 6+ to Phase 1. The realistic threat model (sustained fleet events) doesn't require it. Phase 2 candidate if real production traces surface single-window contamination demand.

## What R08 looks like under (B)+(D)

- Tier: full (the scope amendment + ≥2 fixture redesign + closure of MAJOR-1/MAJOR-2 isn't tactical follow-up; it's an architectural disposition round).
- Architect drafts a small SCOPING-MEMO-BASELINE-CURATION-v0.2 amendment (or v0.3) documenting the scope narrowing + a small spec for AC-12.5/13.5 + AC-12/13 repurposing.
- Implementer applies the fixture changes + memo amendment.
- Reviewer audits.
- Expected close: clean MERGE-READY, MAJOR-1 + MAJOR-2 fully closed.

Time estimate: ~40-50 min wall-clock (full tier; clean run with the new reinforcements in place).

## Also-considered options I'm explicitly not recommending

- **(A) alone** — fixture fix without scope amendment. Rejected: leaves the substantive scope question unanswered; future round will re-litigate.
- **(C) alone or (C)+(any)** — algorithmic redesign. Rejected: overkill for the realistic threat model; fires PR-F10; adds Phase 2 candidate; the existing algorithm works for the realistic case.
- **(D) alone** — scope amendment without fixture redesign. Rejected: doesn't close MAJOR-2 self-confirming gap; tests would remain broken.

## Other operator-gate items waiting from prior rounds (not blocking R08)

1. **OQ-1 / Q-JC1 narrowing (from R06):** does R08+ proceed with `tools/calibrate.ts` vendoring as a dedicated round, OR does R06 Stage 3a's structural-typing compatibility suffice? Architect-pre-prediction: structural-typing suffices for Phase 1; calibrate.ts vendoring deferred to Phase 2.
2. **R05 methodology gap not captured by R06 Memorial Updater.** Worth a small follow-up if you want CLAUDE-COMMON.md to gain the reinforcement.
3. **Anchor PR #37** (preflight preserve operator-prepared NEXT-ROLE.md): still open. Awaits your merge decision.
4. **Anchor PR #35** (MD-F6 + verify-citations.sh): still open. Awaits your merge decision.

## Inputs preserved from R07 close (Reviewer→Memorial Updater routing — preserved verbatim for posterity)

The original R07 NEXT-ROLE.md routing block from before this operator-review overlay is preserved in commit `ddbe4a3` (R07 chore commit). Read it via `git show ddbe4a3:coordination/NEXT-ROLE.md` if needed.

## How to resume

After dispositioning the (B)+(D) recommendation or your override:

1. Reply with your call (e.g., "go (B)+(D)" or "go (A) only" or override).
2. I prepare a fresh NEXT-ROLE.md for R08 with explicit input-surfacing including your disposition.
3. Launch R08 (foreground or background per your preference).
4. Resume autonomous mode if you authorize a new budget.

## Update history (continued)

| Date | Event |
|---|---|
| 2026-05-16 | R06 closed MERGE-READY (Phase 1 SLICE 4 baseline curation toolchain + Stage 2a). |
| 2026-05-16 | R07 launched in autonomous overnight mode (round budget 2 of 3). |
| 2026-05-16 | R07 closed MERGE-READY with 2 MAJORs surfacing FCP-1 power-gap + self-confirming tests; autonomous protocol HALTED for operator gate on scope-claim decision. |
