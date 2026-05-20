# Round R70 Summary
**Round:** R70  
**Date:** 2026-05-20  
**Title:** Tessera demo scenario runner (post-publication leverage)  
**Tier:** full  
**Status:** MERGE-READY  
**Findings:** 0 CRITICAL / 0 MAJOR / 4 MINOR / 2 OBS  

---

## What worked

**TDD discipline — clean RED→GREEN chain:** RED commit `42483a3` landed 11 `assert.fail` stubs with `tools/demo-scenario.ts` absent (tsc exits 2 TS2307). GREEN commit `123c3d3` replaced stubs with real assertions and landed all production artifacts. Separate-RED-commit discipline per R23 IMPL MINOR-1 honored in full; Reviewer verified independently via `git log`. 

**Anti-scope — engine surfaces read-only throughout:** `git diff f62c327..HEAD -- engine/` exits empty. All 9 paths in ALLOWED_SET. All 6 A12 frozen engine surfaces (betting-e-process.ts, common-mode-attribution.ts, event-consumer.ts, freeze-hook-factory.ts, freeze-hook.ts, warm-start.ts) unmodified at Reviewer HEAD. ALLOWED_SET not expanded post-commit.

**Halt-discipline — all 10 conditions reviewed, none fired:** EMPIRICAL.sh exit 0; tsc exit 0; carry-forward fail set identity unchanged at 5 (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14); no engine modification; SDC_DRIFT_PER_WINDOW=0.4 within spec-prescribed range [0.3, 0.8]; shard-04 crosses threshold before window 30 (actual window 15, M=5443005). No DIAGNOSTIC written; no ESCALATE raised.

**Right-reasons — 3 tests audited, none self-confirming:** AC-R70-1 (clean-baseline) → calls `runScenario→updateBettingState`; no test-side wealth recomputation. AC-R70-3 (common-mode-rack) → calls `attributeCommonMode`; structured-field assertions discriminate. AC-R70-4 (event-conditional) → reference-equality on engine-returned residual at `freeze-hook.ts:48`. All 3 trace to spec ACs and PRD user stories.

**Implementer binding-command attestation verbatim:** `pnpm exec tsc -p tsconfig.test.json` → exit 0. `pnpm exec node --test --test-reporter=tap test/*.test.js` → `tests=455 / pass=447 / fail=5 / skipped=3` (exit 1). `bash coordination/specs/Q-R70-EMPIRICAL.sh` → 8 PASS, 0 FAIL, exit 0. All verbatim; no reframing. Carry-forward 5-fail identity confirmed via grep.

**Reviewer cold-read and independent binding-command re-run:** Reviewer independently ran all binding commands at HEAD `36371d2`. EMPIRICAL.sh confirmed 8 PASS / 0 FAIL / exit 0. All 4 CLI demo runs verified (`pnpm demo clean-baseline`, `sdc-drift`, `common-mode-rack`, `event-conditional`). Anti-scope verified under both SHA choices (bb9549b and f62c327 bounds). Cold-eye independence preserved throughout.

**19 ACs all PASS:** Full AC coverage including 4 scenario-specific output tests (AC-R70-1/2/3/4), 4 byte-identity determinism tests (AC-R70-5/6/7/8), 1 exhaustiveness test (AC-R70-9), 1 canonical name-list test (AC-R70-10), and 1 output-completeness test (AC-R70-11), plus EMPIRICAL.sh Blocks 1/2/3.

---

## What violated discipline

**MINOR-1 (IMPLEMENTER) — SHA identity false attestation:**  
`NEXT-ROLE.md:25` and `MEMORIAL.md:1314` both label commit `bb9549b` as "spec-triad commit SHA." The actual spec-triad commit is `f62c327` (`spec(R70): Q-R70-SPEC + audit sidecar + EMPIRICAL.sh`); `bb9549b` is the Architect's routing-block commit, one commit later. The Architect's own routing block at `NEXT-ROLE.md:81–82` explicitly names `f62c327`. Zero functional impact (the delta between the two SHAs is ALLOWED_SET-only); identity attestation gap only.

**MINOR-2 (ARCHITECT) — spec.md pseudocode vs EMPIRICAL.sh divergence:**  
`Q-R70-SPEC.md § 11.2` Block 2 pseudocode uses `grep "^not ok"` (start-anchored). `Q-R70-EMPIRICAL.sh:56` (same spec-triad commit `f62c327`) uses `grep "not ok"` (unanchored). The anchored version fails to match indented subtest TAP lines for AC-R65-2 (line 3208) and AC-R66-14 (line 3409). Two divergent versions of the same logic in the same commit; executable correct, narrative misleading.

**MINOR-3 (ARCHITECT) — AC-R70-13 literal text names wrong metric:**  
`Q-R70-SPEC.md:938` AC-R70-13 "Then" clause: "The `not ok` line count is exactly 5." Block 2 (`Q-R70-EMPIRICAL.sh:53–63`) checks TAP `# fail 5` summary field, not a raw `not ok` grep count. Empirical `grep -c "not ok"` = 7 at Reviewer HEAD (3 top-level + 2 suite rollups + 2 indented subtests). Substantive intent (5 carry-forward failing tests) is correctly verified; the AC's literal contract is unverifiable as worded.

**MINOR-4 (ARCHITECT) — weakly-discriminating regex in spec pseudocode:**  
`Q-R70-SPEC.md § 4.2 line 808` prescribes `assert.match(r.output, /shard-00.*shard-01.*shard-02/)` for AC-R70-3. Regex matches the static topology header (`  rack-A:  shard-00  shard-01  shard-02`) equally well as the candidate-listing line. Test would PASS even if the candidate-listing line were absent. Overall test remains discriminating via structured-field assertions; the regex adds no independent discrimination.

---

## Root cause analysis

**MINOR-1:** At chore-A time, the Implementer populated NEXT-ROLE.md and the MEMORIAL CONFIRMATION from memory of "the Architect's commit" rather than running `git log --oneline | head -3` and copying the SHA verbatim. The spec-triad commit (`f62c327`) and the Architect's routing-block commit (`bb9549b`) are only one commit apart; mental model conflated the two. The gap also propagated into the MEMORIAL CONFIRMATION, producing a self-characterization that contradicted the Architect's own routing block (OBS-1).

**MINOR-2/3:** Both violations stem from the Architect writing the spec.md narrative independently of the EMPIRICAL.sh script, without a final reconciliation pass comparing the two line-by-line. The spec narrative was written first (to describe the logical verification goal); the EMPIRICAL.sh was then written to implement it. The anchored-vs-unanchored divergence (MINOR-2) and the metric-name divergence (MINOR-3) were introduced when the implementations diverged without a cross-check. Pre-emit grilling Q.1 ("every claim verifiable?") did not include "does spec.md pseudocode agree with EMPIRICAL.sh on every grep pattern and metric?"

**MINOR-4:** The regex prescription originated from manually tracing through what "common-mode candidate listing" output looks like. The Architect verified the candidate-listing line would match, but did not enumerate ALL other output lines to confirm none also matched. The topology header (which always appears) was not in scope of the "does this regex match the target?" verification — only the target was checked, not the non-targets.

---

## Reinforcements added

**CLAUDE-ARCHITECT.md (3 standalone entries, count 35 → 38):**
1. `REINFORCED 2026-05-20` — Narrative-pseudocode vs EMPIRICAL.sh reconciliation (MINOR-2): spec.md block and EMPIRICAL.sh must agree on every grep pattern, anchor, and logic construct; pre-emit grilling must include a line-by-line reconciliation of all shared logic blocks.
2. `REINFORCED 2026-05-20` — AC literal text vs verification mechanism alignment (MINOR-3): AC "Then" clause must name the same metric the EMPIRICAL.sh Block actually computes; pre-emit grilling must explicitly cross-check each AC "Then" clause against the script block for that AC.
3. `REINFORCED 2026-05-20` — Strictly-discriminating regex prescriptions (MINOR-4): prescribe regex assertions only after enumerating all output lines that could match; non-target lines that also match = weakly-discriminating; each assertion should independently discriminate.

**CLAUDE-IMPLEMENTER.md (MINOR-1 folded as 8th sub-variant of CITATION-AND-ARITHMETIC-ACCURACY composite, count unchanged at 33):**  
Composite heading updated from `(composite; 7 sub-variants)` → `(composite; 8 sub-variants)`. New sub-variant: "Commit-SHA identity verification at chore-A (R70 MINOR-1): when injecting a commit SHA placeholder, verify SHA identity against `git log --oneline` output before recording in NEXT-ROLE.md and MEMORIAL.md; copy verbatim from grep output, not from mental model."

---

## Consolidation recommendation

**Both CLAUDE-ARCHITECT.md and CLAUDE-IMPLEMENTER.md exceed the 30-entry threshold:**

- `CLAUDE-ARCHITECT.md`: **38 REINFORCED entries** post-R70 (up from 35 pre-R70). Third consecutive round above the threshold (R66: 35, R70: 38). Consolidation overdue.
- `CLAUDE-IMPLEMENTER.md`: **33 REINFORCED entries** post-R70 (unchanged; re-accretion guard applied correctly, folded into composite). Above threshold but stable.

Operator action recommended: run `./scripts/consolidate-reinforcements.sh` for CLAUDE-ARCHITECT.md before the next round to keep the file navigable. CLAUDE-IMPLEMENTER.md's stability at 33 (composite absorbing new entries) demonstrates the composite mechanism working as intended; consolidation for that file is lower urgency.

---

## Watch list for next round

1. **MINOR-2 pattern risk:** Spec narrative vs EMPIRICAL.sh divergence is a new failure class. Future rounds should include an explicit "spec.md vs EMPIRICAL.sh reconciliation" step in Architect pre-emit grilling.
2. **MINOR-1 recurrence risk:** SHA identity mis-attestation at chore-A is now the 8th tessera Rule 1 instance. The CITATION-AND-ARITHMETIC-ACCURACY composite (8 sub-variants) captures it; watch for recurrence in rounds that inject SHAs or version literals.
3. **CLAUDE-ARCHITECT.md consolidation:** 38 entries is past the actionable threshold. If consolidation does not occur before R71, the file will be increasingly difficult to navigate.
4. **MINOR-4 pattern risk:** Weakly-discriminating regex prescriptions are a subtle Architect failure mode (spec and tests all pass; only the discrimination quality is compromised). The new REINFORCED entry specifies the fix; verify it applies in next round when regex assertions appear in spec pseudocode.

---

## Emerging cross-project patterns

- **Spec-internal divergence (narrative vs executable):** MINOR-2 is the first tessera instance where the same spec-triad commit contains two divergent implementations of the same logic (spec.md pseudocode and EMPIRICAL.sh). The executable was correct; the narrative was not. New standalone REINFORCED in CLAUDE-ARCHITECT.md.
- **Re-accretion guard working as designed:** MINOR-1 was correctly identified as a thematic match for CITATION-AND-ARITHMETIC-ACCURACY and folded as sub-variant 8 rather than added as a standalone entry. CLAUDE-IMPLEMENTER.md held at 33 entries despite an 8th violation of this class. The composite mechanism is functioning correctly.
- **Post-publication demo rounds:** R70 is the first post-Phase-3, post-v1-publication round. 4 LCG-seeded deterministic scenarios provide an accessible demonstration surface for the engine. Zero CRITICAL/MAJOR findings; 23-round 0-CRITICAL streak continues (R48–R70).
