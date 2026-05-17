# Round R13 Summary — 2026-05-17

**Round:** R13  
**Tier:** full (A1+A2+A5 factors: new external citation, new statistical algorithm family, NFR ties)  
**Scope:** Phase 1 SLICE 4 — e-Benjamini-Hochberg FDR operator surface  
**Outcome:** MERGE-READY · 0 CRITICAL · 0 MAJOR · 1 MINOR · 4 OBS · 14/14 ACs PASS · 152/152 regression PASS

---

## What worked

**Verbatim-pseudocode spec (5th consecutive application, R09–R13).** Delta 1 (`engine/fleet/e-bh.ts`, 133 lines) and Delta 2 (`test/q13-e-bh-fdr.test.ts`, 270 lines) were complete file contents — no Implementer translation layer. Zero halt conditions triggered; zero spec-vs-reality conflicts; zero ambiguities requiring resolution. Wall-clock to GREEN: 1m34s.

**REVIEWER-ANCHOR sed-n extraction (2nd consecutive clean application).** All 23 REVIEWER-ANCHOR rows in the spec were populated via `sed -n 'N,Mp' <path>` at spec-emit time. Reviewer independently sampled 4 rows and found zero citation errors. This is the reinforcement compounding model in operation: a specific violation (R11) produces a specific rule, which produces measurable zero-error results at the next two occurrences (R12, R13).

**Right-reasons grilling Q4 verified.** Architect confirmed: "would a future implementation FIX matching the architect's prediction FAIL the FDR-control tests?" → NO. The PR-F2 FDR control tests assert an independently-derived theory bound; they are not self-confirming. Reviewer independently re-confirmed: future inflation bug FAILS; future correct-fix PASSES.

**TDD discipline: 11th consecutive application (R02–R13).** RED `4110daa` (test-only, TS2307) → GREEN `d54912d` (production-only, typecheck exit 0) with a 1m34s delta. Reviewer independently verified both SHA timestamps via `git show --stat`. The streak spans three algorithm families: betting (R02–R09), fleet-merge (R10–R12), and e-BH (R13).

**21/21 SAS fences clean.** Highest anti-scope clause count in tessera history. `git diff 2a3c177..HEAD --name-status` returned exactly 4 paths. All fenced surfaces — including any-time FDR, chained architecture, randomized variant, BY-style, Family-specific wrappers — verified empty.

**PR-F2 evidence matrix within bounds.** iid H₀ FDR = 0.00500 (Wilson/Wald upper bound 0.09624 ✓); correlated-drift H₀ FDR = 0.00500 (Wilson/Wald upper bound 0.09624 ✓). OBS-4 notes the identical values are a single-trial coincidence under H₀, not a structural collapse — expected under null when N_TRIALS=200 and empirical FDR is well below q=0.05.

**Architect pre-emission prediction accuracy.** All 7 predictions confirmed exactly at GREEN: q13 test count 14/0 ✓, full regression 152/0 ✓, PR-F2 iid FDR in [0.005, 0.05] ✓, PR-F2 correlated FDR in [0.005, 0.06] ✓, wall-clock ≤ 6s (actual: 0.21s) ✓, zero halt conditions ✓, Reviewer findings ≤ 1 MINOR / ≤ 5 OBS (actual: 1 MINOR / 4 OBS) ✓. 4th consecutive round of all-predictions-confirmed.

---

## What violated discipline

**MINOR: ARCHITECT pre-emit-grilling — Wilson-vs-Wald terminology (MINOR-1 in Reviewer report).**

Spec Mechanism primitive 10 and test/q13-e-bh-fdr.test.ts:58-59 label the formula `Q_LEVEL + 3·√(Q_LEVEL·(1−Q_LEVEL)/N_TRIALS)` as the "Wilson upper bound." The formula is the Wald 3σ normal-approximation bound. The Wilson score interval uses a different formula involving a z²/2n bias correction. Grilling verified formula correctness (the bound is valid as a ≈3σ confidence check) and right-reasons safety, but the grilling checklist contained no "does the name match the formula?" axis.

This was caught by the Reviewer, not the Architect's grilling pass.

---

## Root cause analysis

**Why did the Wilson-vs-Wald terminology slip past grilling?**

Grilling explicitly covered: (1) formula derivation correctness, (2) right-reasons safety, (3) REVIEWER-ANCHOR table correctness, (4) anti-scope, (5) spec/reality consistency at inherited surfaces. It did not cover: "does the cited name for a statistical procedure match the formula written?"

The assumption was that verifying the formula's validity implicitly validates the name. This assumption fails when two different procedures produce bounds that are both valid but not identical — which is exactly the relationship between Wilson and Wald. The terminology was inherited from R11+R12 PR-F1 vocabulary without being re-examined at R13.

The pattern is: inherited vocabulary → no re-examination trigger in grilling checklist → passes through to Reviewer. This is a narrow gap, not a systemic grilling failure. The fix is specific: add a "named statistical procedure → formula correspondence" axis to the grilling checklist, triggered by any spec that cites a named confidence interval, asymptotic bound, or statistical test.

REINFORCED line added to CLAUDE-ARCHITECT.md.

---

## Reinforcements added

| File | Content |
|---|---|
| `CLAUDE-ARCHITECT.md` | Added `# REINFORCED 2026-05-17` — statistical-term-to-formula cross-check step; triggered by any spec citing a named statistical bound or confidence interval; verify formula matches the named procedure, not just that the formula is a valid bound. |

No other violations this round. No CLAUDE-IMPLEMENTER.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md, or CLAUDE-COMMON.md changes required.

**Consolidation check (Deliverable 4):**

| File | REINFORCED count |
|---|---|
| `CLAUDE-ARCHITECT.md` | 15 (was 14; +1 this round) |
| `CLAUDE-IMPLEMENTER.md` | 13 |
| `CLAUDE-REVIEWER.md` | 0 |
| `CLAUDE-MEMORIAL.md` | 0 |
| `CLAUDE-COMMON.md` | 1 |

No file exceeds the 30-line threshold. No consolidation action required.

---

## Watch list for next round (R14)

**MINOR-1 carry-forward (Wilson-vs-Wald terminology).** The mislabeling exists in Q-R13-SPEC.md Mechanism primitive 10 and in test/q13-e-bh-fdr.test.ts:58-59 (the `FDR_BOUND` comment + constant name). Neither changes any behavior. Suggested cleanup: rename `FDR_BOUND` to a less-named-bound reference, update comment to say "Wald 3σ normal-approximation upper bound", update Mechanism primitive 10 description. R14 operator gate item if targeted.

**OBS-1 (AC-3 NaN gap).** Spec Mechanism primitive 8 states the guard returns `{ selected: [], K: 0 }` when `perShardEValues.length === 0`. AC-3 binds the empty-array case but NOT the NaN case. If `perShardEValues` contains NaN, `eValue / K` division may produce NaN comparisons that mis-sort or mis-select shards. Low severity (caller contract says e-values are positive finite), but the spec's claim that the guard "handles" it is not tested. R14 cleanup candidate.

**OBS-2 (AC-12 compile-time claim vs runtime test).** AC-12 narrative claims both compile-time type enforcement and runtime behavior are demonstrated. The test (test/q13:193-204) exercises the runtime path only — TypeScript compile-time enforcement is demonstrated by the absence of a type error, not by a positive assertion. The AC wording overstates what the test demonstrates. Low severity; documentation-only clarification.

**OBS-3 (ReadonlyArray cast).** `engine/fleet/e-bh.ts:127-132` returns `selected: ReadonlyArray<number>` in the interface but the implementation casts via `selected` as mutable `number[]`. This matches R11/R12 precedent (`fleetMergeFamily*` return shapes). If Tessera adopts a strict immutability policy later, this pattern will need a sweep. Track but low priority.

**OBS-4 (identical PR-F2 FDR values).** Both iid and correlated cells produced FDR = 0.00500 (1 selection in N_TRIALS=200 each). This is a coincidence under H₀ — both tests bind to ≤ Wilson/Wald bound (0.09624) independently, so identical values do not indicate structural collapse. If identical values appear again at R14+, investigate whether the correlated-drift simulator is actually exercising correlation.

**Operator gate items** (carried from NEXT-ROLE.md):
- PR #38 review/merge (R06-R10 anchor contributions)
- OQ-1/Q-JC1 `tools/calibrate.ts` vendoring decision
- R10 MINOR-1 `engine/per-shard/runtime.ts` docblock update
- R11 MINOR-1 `tick_post` variable-name nit
- R12 OQ-2/3/4 deferred items
- SLICE 2 carry-forwards (mean_delta + PR-F5 + compiled-artifact loader)

---

## Emerging cross-project patterns

**Tessera MINOR frequency: 1 per every 2 rounds (R12-R13 window).** R12 had zero MINORs; R13 has 1 MINOR. Across R09-R13, 1 MINOR total (R13 Wilson-vs-Wald). The 0 MAJOR streak is now 5 rounds long (R09–R13). The 0 CRITICAL streak is now 13 rounds (R01–R13). The pipeline architecture is producing very clean rounds.

**Compounding REINFORCED lines are working.** Three data points now:
1. R02 REINFORCED (open files before claiming content) → R03 applied → R03 violation caught a new sub-class → R03 REINFORCED (verify re-export chains) → subsequent rounds clean.
2. R11 REINFORCED (sed-n extraction for REVIEWER-ANCHOR) → R12 applied (zero errors) → R13 applied (zero errors). Zero regression at 2nd application.
3. R13 REINFORCED (statistical-term-to-formula cross-check) → first application will be R14 or next spec citing a named statistical procedure.

The pattern: each REINFORCED line covers exactly one sub-class of the violation; it fires exactly when the triggering condition arises; it does not over-fire on unrelated content. This specificity is the compounding mechanism.

**The 11-round TDD streak is a selection filter.** Every Tessera round since R02 has used the RED → GREEN two-commit pattern. The streak is not evidence of discipline heroics — it is evidence that the pattern is now structurally embedded in the Implementer workflow. Any deviation would be an anomaly, not a baseline expectation. The streak should continue indefinitely; a break would be a MAJOR violation.
