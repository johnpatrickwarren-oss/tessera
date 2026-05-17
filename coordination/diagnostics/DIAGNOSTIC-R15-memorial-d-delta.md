# DIAGNOSTIC-R15-memorial-d-delta — Memorial-D state-stamp Architect pre-prediction discrepancy

_Written per Q-R15-SPEC.md § 6 halt condition (a): "if Implementer-derived classification shows ≥1 Memorial-D class violation, this is empirically valid and the Implementer documents it in the appended Memorial section... AND records a DIAGNOSTIC so the architect-pre-prediction discrepancy is flagged for operator visibility."_

_Note: this DIAGNOSTIC is NOT a full halt + ESCALATE. Per halt condition (a) parenthetical: "this is empirically valid and the Implementer documents it in the appended Memorial section (AC-8 still passes with the new derived state)." Work proceeds; this file exists solely for operator visibility._

---

## Spec claim (exact quote from Q-R15-SPEC.md § 3.2)

> "Architect-pre-prediction: Memorial-D class = 0 (the structural fix at anchor PR #35 + the mandatory § Existing architectural surface section in spec template prevented MD-F6 recurrence across R01-R14)."

And from Q-R15-SPEC.md AC-8:

> "Architect-pre-prediction: N = 22, M = 8; if Implementer-derived delta is non-zero, this AC PASSes with the new derived state AND triggers a HALT per § 6 halt condition (a) below."

## Reality

Implementer enumerated all 40 VIOLATION entries in MEMORIAL.md for rounds R02-R14. The R02 ARCHITECT violation at `MEMORIAL.md` line 215 explicitly states in its description:

> "Sub-instance of MD-F6 (file-opened-discipline-paired-with-candidate-set-enumeration)"

The Memorial-D class definition in Q-R15-SPEC.md § 3.2 states:

> "Memorial-D class = MD-F6 sub-variant OR any other architectural-layer-coverage violation matching the 4-factor prior weighting framing."

This violation matches the Memorial-D class definition. Classification is unambiguous: the violation description explicitly identifies the sub-instance type.

**Empirical count:**
- Memorial-D class violations R02-R14: **1** (R02 ARCHITECT pre-emit-grilling, MD-F6 sub-instance)
- Memorial-D class confirmations R02-R14: **0**
- Tessera-Phase-1 Memorial-D delta: **1V / 0C**
- Phase 1 close Memorial-D state: **23V / 8C** (not 22V/8C as predicted)

## Why the Architect pre-prediction differs from the empirical finding

The Architect pre-prediction of 0 was based on the claim that "the structural fix at anchor PR #35 + the mandatory § Existing architectural surface section in spec template prevented MD-F6 recurrence across R01-R14."

The R02 ARCHITECT violation occurred in Q-R02-SPEC.md, which was the first spec emitted after anchor PR #35. The violation is about the Architect covering `engine/types/config.ts` during R02 spec authoring but NOT separately noting `engine/types/primitives.ts` (where `CellKey` is declared at line 44), leading to a wrong prediction of CellKey's shape as `Record<CellDimension, string | number>` rather than the actual `Record<string, string | number>`.

Two possible explanations for why PR #35 didn't catch this:

**Option A — REVIEWER-ANCHOR section in Q-R02-SPEC was present but incomplete:**
The mandatory section was added (per post-PR-#35 requirement), but `primitives.ts:44` was NOT included in the REVIEWER-ANCHOR table. If the section only listed `config.ts` (the primary delta target), the mechanical verification would not have forced the Architect to read `primitives.ts`. This would mean the structural fix worked but was applied narrowly.

**Option B — Q-R02-SPEC was drafted before the verify-citations script was in regular use:**
If the script was not yet wired into the R02 workflow, the structural fix existed but was not mechanically enforced for that round. The "onward" in MEMORIAL.md:34 may describe prospective enforcement, not yet-applied enforcement at R02.

## Resolution options (for operator visibility; not actioned at R15)

**Option A (primary):** Accept empirical finding as correct. Phase 1 close Memorial-D state = 23V / 8C. No action beyond documenting in MEMORIAL.md and this DIAGNOSTIC. The structural fix successfully prevented MD-F6 recurrence from R03 onwards — one escape at the very first round under the new regime is consistent with the "stickier than memorialization" observation in MEMORIAL.md :32.

**Option B (alternative):** If the operator determines the R02 violation should be classified as methodology-class pre-emit-grilling (not Memorial-D class) — because the MEMORIAL UPDATER labeled the violation type as "pre-emit-grilling" rather than "Memorial-D" — the Phase 1 close state remains 22V / 8C. In this case, the "Sub-instance of MD-F6" text in the description is an observational note, and the type-label classification takes precedence.

**Implementer assessment:** Option A is the correct reading. The spec defines Memorial-D class by the violation's nature (architectural-layer-coverage failure), not by the label prefix. The label "pre-emit-grilling" is the procedural category; "Sub-instance of MD-F6" is the architectural-impact classification. Both can be true simultaneously.

## AC-8 status

AC-8 PASSES with the derived state: 23V / 8C satisfies N ≥ 22, M ≥ 8.

## Relationship to NEXT-ROLE routing

This DIAGNOSTIC does NOT trigger STATUS: ESCALATE. Per Q-R15-SPEC.md § 6 halt condition (a): "this is empirically valid and the Implementer documents it in the appended Memorial section (AC-8 still passes with the new derived state) AND records a DIAGNOSTIC so the architect-pre-prediction discrepancy is flagged for operator visibility." Work proceeds; routing is NEXT-ROLE: REVIEWER | STATUS: READY.
