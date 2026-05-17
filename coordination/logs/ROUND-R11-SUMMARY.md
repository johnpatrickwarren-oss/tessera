# ROUND-R11-SUMMARY — Phase 1 SLICE 3: hierarchical e-value fleet-merge primitives + PR-F1

_Written by MEMORIAL-UPDATER at R11 close (2026-05-17)._
_Inputs: Q-R11-SPEC.md, REVIEWER-REPORT-R11.md, coordination/MEMORIAL.md, CROSS-PROJECT-MEMORIAL.md, coordination/NEXT-ROLE.md._
_Diagnostics: zero (no R11 DIAGNOSTIC files created)._

---

## What worked

**Spec quality — highest in Tessera history for a full-tier round.** The 20-row cross-section consistency pass, 14-row standing-reinforcement audit table, and 5-question grilling pass all produced clean output. All 12 Architect pre-predictions verified at close (11 confirmed, 1 magnitude miss on PoE-correlated FPR — direction correct). The PR-F1 evidence matrix design (3 theory-bounded cells + 1 REPORTING-only cell) correctly preserved the R07 OBSERVED-binding-scope reinforcement while still documenting the empirical conditional-independence violation.

**Implementation discipline — zero deviations.** Verbatim spec pseudocode (Delta 1, Delta 2, Delta 3) produced zero spec-vs-reality conflicts. The logSumExp algorithm, sticky-fire latch, and PR-F1 simulator all implemented cleanly on first pass. OBSERVED test counts reported correctly (not pre-stated). No DIAGNOSTIC files required.

**TDD discipline — 9th consecutive.** RED commit `ee1ee1c` added only the test file; typecheck confirmed TS2307. GREEN commit `5ae6c7d` added the two production files atomically; typecheck clean; 18/0. The 2m40s split is independently verifiable in git log. Reviewer-side independent verification maintained (9th consecutive).

**Anti-scope — cleanest 20-clause pass.** All 20 SAS fences independently verified by Reviewer via `git diff --name-only`. Export counts matched spec exactly (fleet.ts: 1, combine.ts: 6). R11-SAS-19 (no weighted mixture) verified by grep; R11-SAS-20 (Ville-bounded only) verified by inspection.

**Right-reasons audit — 3/3 PASS + OBS-4 surfaced.** AC-7 (logSumExp overflow-detectable), AC-10 (sticky-fire three independent semantics), AC-15 (Wilson-CI external derivation) all confirmed not self-confirming. Audit additionally surfaced OBS-4 (AoE conservativeness headroom) as a tracked observation for R12+ PR-F2 scope estimation — audit functioning as designed, not as rubber-stamp.

**Context-isolation — held by all roles.** Audit sidecar Q-R11-SPEC-AUDIT.md kept out of Reviewer's read set. Diagnostics directory not inspected by Reviewer (correct: no R11 diagnostics existed). Implementer cold-started from spec only.

**0-CRITICAL streak extended to 10 rounds (R02-R11).** No production correctness issues. All findings are discipline/citation-accuracy gaps or readability nits — not behavioral regressions.

---

## What violated discipline (role, discipline, what happened)

**ARCHITECT — pre-emit-grilling — OBS-1: citation line drift in REVIEWER-ANCHOR.**
Spec cites `MixtureSupermartingaleState.M_t` at `engine/detectors/family-a-mixture-supermartingale.ts:43`. Actual declaration is at line 47; lines 43-44 are the JSDoc paragraph for `S_t`. The self-attest checkbox claims "verified at spec-emit time" — the file was opened, but the specific line number was recalled from reading the surrounding context rather than extracted from the exact lines. No Implementer impact; Reviewer classified as OBS.

**ARCHITECT — pre-emit-grilling — OBS-2: three-error citation in Mechanism primitive 7.**
Spec cites sticky-fire semantics as "`BettingEProcessState` at `engine/detectors/family-c-betting-e-process.ts:329` field `fired: boolean`." Three independent errors: (a) the type at that file is `FamilyCBettingEProcessState`, not `BettingEProcessState`; (b) the `fired: boolean` field is declared in `engine/types/families/c.ts:329`, not the detector file; (c) line 329 of the detector file is an object-literal assignment (`fired_this_tick: _q72_fired_this_tick,`), not a field declaration. Semantic claim (sticky-fire matches inherited Ville-bound convention) is correct; only the citation pointer is wrong. No Implementer impact; Reviewer classified as OBS.

---

## Root cause analysis

**Why did OBS-1 and OBS-2 occur?**

The R02-derived type-declaration-site reinforcement enforces *opening* the declaration-site file and *reading* the type's shape. The R03-derived re-export-chain reinforcement extends this to verifying re-export status. Neither reinforcement specifies that the *cited line number* and *cited type name* within the REVIEWER-ANCHOR table must be extracted verbatim by running `sed -n 'N,Mp' <file>` — they are implicitly assumed to be products of the same file-opened pass.

However, when the Architect opens a file and reads it to understand the type structure, the mental-representation gap between "I read around line 43 and saw M_t" and "line 43 is actually the JSDoc for S_t, and M_t is declared at line 47" is four lines. After reading the file once, the Architect's citation process involves recalling "around where I saw M_t" rather than re-extracting the exact lines. This is a recall failure rather than a file-opened failure.

Similarly for OBS-2: the Architect clearly understands that `FamilyCBettingEProcessState.fired` is a sticky-fire field (the semantic claim is correct). But the citation pointer conflates the type name from one context (Family A's `BettingEProcessState`) with the Family C neighborhood, and the file/line pointer may have been constructed from a partially-correct mental map of the inheritance structure rather than from literally grepping `fired: boolean` in the types file.

The fix is mechanical: for any specific line-range citation in a REVIEWER-ANCHOR table row, run `sed -n 'N,Mp' <file>` and paste those exact lines into the spec. The recall-vs-extract distinction is the root cause.

---

## Reinforcements added (file path + line summary for each)

1. **`/Users/johnwarren/concord/tessera/CLAUDE-ARCHITECT.md`** — appended at line 224:
   `# REINFORCED 2026-05-17` — When a REVIEWER-ANCHOR row or Mechanism primitive cites a specific line range, extract those exact lines via `sed -n 'N,Mp' <file>` and paste verbatim; do not reconstruct from memory. Verify cited TYPE NAME is the exact identifier at that location. Gate: run the sed command for each line-range citation before grilling sign-off.

2. **`~/.claude/CROSS-PROJECT-MEMORIAL.md`** — appended tessera R11 section with:
   - 3 CONFIRMATIONs for pre-emit-grilling (Architect, Implementer, Reviewer)
   - 2 VIOLATIONs for pre-emit-grilling (Architect OBS-1, OBS-2)
   - 1 new reinforcement rule under "tessera ARCHITECT pre-emit-grilling: citation-accuracy sub-class"
   - CONFIRMATIONs for all remaining disciplines (halt-discipline, right-reasons-audit, role-boundary, anti-scope, tdd-discipline, context-isolation)
   - Emerging patterns section for R11

3. **`coordination/MEMORIAL.md`** — appended `## R11 — Memorial Updater accretion (2026-05-17)` with canonical per-discipline structured entries for all roles.

---

## Watch list for next round

**Citation-accuracy at REVIEWER-ANCHOR.** The R11 OBS-1/OBS-2 are the first occurrence of this line-number-accuracy sub-class in Tessera. The new reinforcement should eliminate it at R12, but watch that the Architect applies `sed -n 'N,Mp'` explicitly rather than relying on "file was opened."

**MINOR-1 `tick_post` variable naming.** `engine/fleet/combine.ts:131` has a variable named `tick_post` with a comment saying "pre-increment value used as the 0-based tick index" — name and comment contradict each other. Non-blocking; Reviewer left as operator-discretion: ship-as-is or tactical follow-up.

**OBS-3 open question: AC-14 REPORTING-only form.** Reviewer accepted the status-quo (c) with three-reason rationale. Watch that R12+ PR-F2 spec correctly references this disposition and does not re-open OQ-5 without acknowledging the Reviewer's acceptance.

**OBS-4 AoE conservativeness headroom.** Both AoE cells observed fpr=0.000. A regression raising true FPR to ~0.02 would still pass. Track for R12+ PR-F2 scope estimation: whether to lower α_fleet, increase N_FLEET_TRAJ, or switch to k·α_fleet bound form.

**R11-SAS-4: `engine/types/index.ts` re-export deferred.** OQ-R11-1 carries forward to R12+ when the first orchestrator-facing consumer of `FleetEProcessState` lands. Watch that the R12 spec explicitly resolves this or re-documents the deferral.

**PoE-correlated FPR prediction accuracy.** Architect's median pre-prediction was 0.10-0.15; OBSERVED was 0.40. The magnitude miss (correct direction, wrong scale) suggests the linear correlation model may underestimate multiplicative wealth compounding at ρ²=0.5. Worth revisiting the pre-prediction methodology for R12+ when PoE-correlated scenarios appear in PR-F2.

---

## Emerging cross-project patterns

**Citation-accuracy as a new sub-class of the file-opened discipline.** The progression across tessera rounds: R02 (file not opened → wrong type shape); R03 (file opened, re-export not verified → wrong integration-point claim); R11 (file opened, re-export verified, exact lines not extracted → wrong line number + type name in citations). Each sub-class gets its own reinforcement; together they form a comprehensive "REVIEWER-ANCHOR verification chain" that would have caught all three sub-classes if applied prospectively.

**Compounding reinforcement producing cleaner rounds.** R11 achieves 0 CRITICAL / 0 MAJOR with 20 SAS clauses — the previous maximum was 16 clauses (R06). The cross-section consistency pass (20 rows at R11 vs 9 rows at R02) is growing in scope and maintaining PASS. The standing-reinforcement audit table (14 rows at R11) is functional as a systematic discipline sweep.

**Tessera 0-CRITICAL streak at 10 rounds (R02-R11).** The streak is now the defining characteristic of the Tessera project: all MAJOR/MINOR findings are discipline/audit-trail violations, not production correctness issues. The fleet-merge primitive at R11 — the first Tessera-original runtime fleet-level statistical claim — landed with all 18 ACs PASS and the PR-F1 evidence matrix empirically confirming both the PoE failure mode and the AoE compensating control.

---

_No reinforcement consolidation recommended: CLAUDE-ARCHITECT.md at 14 REINFORCED lines, CLAUDE-IMPLEMENTER.md at 13, CLAUDE-REVIEWER.md at 0, CLAUDE-MEMORIAL.md at 0, CLAUDE-COMMON.md at 1. All under the 30-line threshold._
