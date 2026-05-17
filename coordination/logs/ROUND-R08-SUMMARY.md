# Round R08 Summary

**Round**: R08  
**Date**: 2026-05-16  
**Tier**: full (A3 + A5; operator-set)  
**Scope**: Phase 1 SLICE 5 amendment + R07 MAJOR-1/MAJOR-2 closure via Option (B) + Option (D)  
**Result**: MERGE-READY | 0 CRITICAL · 2 MAJOR · 4 MINOR · 5 OBS | 29 PASS + 2 PARTIAL (AC-15, AC-25)  
**Test totals at GREEN `4ba5e9e`**: 93/0 grand total; typecheck exit 0

---

## 1. What worked

**Fixture-sizing-propagation discipline (R07 MAJOR-1 reinforcement correctly applied)**: Architect exhaustively applied accumulation-requirement reasoning to AC-27 (W=60/L=50, 17-window margin past threshold-crossing) and AC-28 (W=210/L=200, 7-window margin past threshold-crossing). Both new ACs used theory-derived bounds with documented analytical hand-traces and conservative margins. Reviewer independently verified the reasoning was sound and the margins were genuine. Zero under-powered fixtures introduced.

**OBSERVED-binding-scope discipline (R07 MAJOR-2 reinforcement correctly applied)**: Zero new OBSERVED-binding ACs introduced at R08. All new ACs use theory-derived bounds (AC-27, AC-28) or scope-claim bindings (AC-12, AC-13). Inline right-reasons checks at test:472-474 document the "future FIX" scenario for AC-27 as the reinforcement requires. Reviewer independently verified the right-reasons rationale was non-self-confirming for all 3 audited tests (AC-12, AC-27, AC-8).

**TDD two-commit RED → GREEN (6th consecutive verifiable round)**: RED commit `f99e54c` modified only `test/q07-fleet-correlated.test.ts`; all 23 q07 tests passed at RED (correct for a round with no production algorithm change). GREEN commit `4ba5e9e` landed coordination-tier Deltas. Reviewer independently verified via `git show f99e54c --stat`. Tessera TDD streak continues: R03–R08 unbroken.

**Anti-scope discipline (20 SAS clauses; zero violations)**: `tools/curate-baseline-fleet-correlated.ts` preserved bit-identical. Pre-R08 test files UNMODIFIED (regression sweep 70/0 unchanged across 9 non-q07 suites). v0.2 memo UNMODIFIED. R08-SAS-17 AC-11 preserved at strict equality. Reviewer independently verified each clause.

**Reviewer empirical-premise verification**: Reviewer independently ran the AC-15 fixture against production to check the spec's load-bearing claim. This catch — n_ticks_contaminated=6 vs the spec's predicted 0 — is the correct discipline for finding pre-emit grilling misses. The Reviewer's role as independent adversarial verifier served its function.

**Cross-section consistency pass (18 rows, all PASS)**: No spec-internal contradictions introduced at R08. Cross-section consistency discipline (from R01 MAJOR reinforcement) correctly applied and verified by Reviewer.

---

## 2. What violated discipline

**MAJOR-1 — Implementer halt-discipline (Delta 11 revert without DIAGNOSTIC)**

When applying spec Delta 11 (tightening AC-15 from `assert.ok(curatedLen <= origLen)` to `assert.strictEqual(curatedLen, origLen)`), the test failed: `AssertionError: curatedLen=6, origLen=8`. The Implementer correctly identified the cause (MCD flags 2 ticks per run on the clean alternating-pattern fixture) and correctly reverted to `<= origLen`. However, the revert was performed without writing `coordination/diagnostics/DIAGNOSTIC-R08-delta11-spec-premise-error.md` and without setting STATUS: ESCALATE in NEXT-ROLE.md. The deviation was documented in NEXT-ROLE.md only (lines 30-32), characterizing it as "within tactical autonomy — production behavior empirically determines the correct assertion; no design decision involved."

This characterization is methodologically incorrect. The standing halt-discipline reinforcement is explicit: "Procedural halt requirements apply even when the resolution is unambiguous. A spec-internal inconsistency with only one correct resolution still requires DIAGNOSTIC + ESCALATE — the discipline is calibrated by auditability, not by resolution difficulty." The Implementer's own MEMORIAL entry ("No DIAGNOSTIC file written (correct — spec-reality conflict with an empirically determinable answer does not require HALT)") compounds the violation by encoding the incorrect interpretation as a CONFIRMATION rather than recognizing the procedural gap.

**MAJOR-2 — Architect pre-emit-grilling miss (inherited testimony without empirical verification)**

Spec § Mechanism primitive 11 stated "MCD on the clean alternating-pattern signal series produces zero contamination flags (no Stage 2a drop)" as a load-bearing premise. This premise was inherited from R07 Reviewer's MINOR-3 claim without independent empirical verification. The pre-emit grilling § Unstated assumptions listed assumption 6 "R08's MINOR closures are independently safe" with a blanket PASS verdict, but this verdict was not backed by running the AC-15 fixture against production code. The premise was empirically wrong: n_ticks_contaminated=6 (2 ticks × 3 runs). This wrong premise is the root cause of MAJOR-1 — without it, Delta 11 would have applied cleanly, and no halt-discipline question would have arisen.

---

## 3. Root cause analysis

**MAJOR-2 root cause**: The Architect treated prior Reviewer testimony as equivalent to independent verification. The pre-emit grilling checklist distinguishes "verified by own observation" from "inherited from prior testimony" conceptually but did not enforce running the relevant command/fixture for each inherited factual claim. The gap is systematic: any round that inherits a factual claim about production behavior from a prior round's Reviewer or Architect without re-running the evidence command carries this risk.

**MAJOR-1 root cause**: The Implementer applied "tactical autonomy" judgment incorrectly. The correct boundary is: tactical autonomy covers *implementation choices* (import paths, cast placement, locator syntax); it does NOT cover *procedural audit requirements*. A spec premise that fails empirically is a spec-internal factual error — it belongs in a DIAGNOSTIC regardless of how clear the correct resolution is. The confusion appears to stem from the Implementer's mental model of "design decision required = HALT needed"; the correct model is "any deviation from spec that a downstream role cannot independently verify = DIAGNOSTIC needed."

Both violations are connected: MAJOR-2 created the condition for MAJOR-1. Had the Architect verified the AC-15 fixture empirically, the spec would have contained the correct premise, Delta 11 would not have been prescribed, and no halt-discipline question would have arisen at the Implementer layer.

---

## 4. Reinforcements added

**CLAUDE-ARCHITECT.md** — One new `# REINFORCED 2026-05-16` line added (12th total):
> When a load-bearing spec premise is inherited from a prior Reviewer's or Architect's claim, independently verify the premise by running the relevant fixture or command against production code before emitting the spec. Add an "empirical premise verification" step to pre-emit grilling. "Verified by own observation" and "inherited from prior testimony" are not equivalent grilling verdicts. Detected tessera R08 MAJOR-2.

**CLAUDE-IMPLEMENTER.md** — One new `# REINFORCED 2026-05-16` line added (12th total):
> A spec premise that fails empirical testing is a spec-internal factual error — a HALT condition requiring DIAGNOSTIC-RNN-[topic].md + STATUS: ESCALATE, regardless of how unambiguous the correct revert appears. "The correct answer is obvious so I can just revert" does not bypass the procedure. Detected tessera R08 MAJOR-1.

**CROSS-PROJECT-MEMORIAL.md** — tessera R08 sections added: pre-emit-grilling violations + confirmations + new reinforcement rule ("inherited-testimony-requires-re-verification"); halt-discipline violation + confirmations; right-reasons-audit confirmation; emerging patterns.

**Consolidation check**: CLAUDE-ARCHITECT.md = 12 REINFORCED lines (below 30 threshold). CLAUDE-IMPLEMENTER.md = 12 REINFORCED lines (below 30 threshold). No consolidation action required.

---

## 5. Watch list for R09

**R09 Architect must (per Reviewer routing block)**:
1. Run the AC-15 fixture against production code before specifying any further AC-15 disposition — verify `n_ticks_contaminated` empirically, do not inherit testimony.
2. Fix the spec premise at § Mechanism primitive 11: the correct claim is "MCD on the clean alternating-pattern fixture produces 2 ticks contamination per run (n_ticks_contaminated=6 across 3 runs)."
3. Write the correct AC-15 tightening that matches the empirical behavior — `assert.ok(curatedLen <= origLen)` remains the correct bound until the fixture is redesigned or the premise is corrected.

**Carry-forward open items**:
- R07 MINOR-3 (AC-15 `<=` → `===`) remains open; correct resolution requires empirical verification before specifying.
- OQ-R08-1: should AC-11 (H₀ FPR) be loosened from `assert.strictEqual(firedCount, 0)` to `assert.ok(firedCount <= 1)`?
- OQ-R08-2: should v0.3 narrowing be reflected in PRD AC-P1 prose narrowing?
- OQ-R08-3: when (if ever) should Phase 2 add a transient-single-window detector?
- OQ-1 / Q-JC1 narrowing: dedicated vendoring round vs. R06 Stage 3a structural-typing compatibility?

**Pattern watch**:
- Inherited-testimony chain: the R08 MAJOR-2→MAJOR-1 causal chain shows that a single unverified inheritance can produce two discipline violations. R09 Architect should be alert to any spec claim that begins "per the R08 Reviewer" or "per prior round testimony" without a corresponding empirical verification.
- Halt-discipline boundary: the Implementer's incorrect mental model ("empirically determinable = no HALT needed") is now reinforced. R09 Implementer should apply the corrected model: any spec-reality deviation that was not pre-authorized by the spec's own tactical-autonomy grant requires a DIAGNOSTIC.

---

## 6. Emerging cross-project patterns

**Inherited-testimony as a failure-chain origin**: R08 is the first Tessera round where a pre-emit grilling miss directly caused a downstream halt-discipline violation via a factual premise error. The causal chain (unverified inherited claim → wrong spec premise → Implementer empirical failure → procedural skip → MAJOR×2) is qualitatively different from prior single-role violations. The "inherited-testimony-requires-re-verification" reinforcement severs this chain at the spec layer.

**Tessera 7-round 0-CRITICAL streak (R02–R08)**: The test design has been correct for 7 consecutive rounds. Both R08 MAJORs are procedural/audit findings, not correctness issues. The algorithm preservation constraint (R08-SAS-1 through R08-SAS-2) was independently verified by Reviewer at GREEN HEAD.

**Reinforcement compound effect**: The R07 MAJOR-1/MAJOR-2 reinforcements were correctly applied at R08 (fixture-sizing-propagation, OBSERVED-binding-scope). This demonstrates that reinforcements added in round N-1 reliably prevent recurrence in round N when the Architect reads them. The violation at R08 (inherited-testimony) is a new sub-class not covered by prior reinforcements — the new rule closes it for R09+.
