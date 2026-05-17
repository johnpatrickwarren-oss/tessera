# DIAGNOSTIC-R18-no-at-pin-deltas-verdict

**Round:** R18  
**Role:** IMPLEMENTER  
**Status:** ESCALATE  

---

## Spec claim (exact quote)

From Q-R18-SPEC.md § 5 AC-R18-12:
> "if observed total differs from 181 the Implementer halts with DIAGNOSTIC (likely cause: a prior file's count drifted unexpectedly)."

From Q-R18-SPEC.md § 6 Anti-scope:
> "Modification of any prior-round test file (q01-q17, betting-e-process-class-dispatch) | Existing 18 test files preserved verbatim per pre-R18 baseline | spec-internal HALT"

From Q-R18-SPEC.md § 1 failure modes:
> "5. **Header annotation breaks `q01-vendoring-coverage` test.** Mitigated: annotation ADDS lines below the existing 5-line vendoring header block; the canonical first-line `// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` is byte-identical. AC-R18-9 binds."

---

## Reality

After applying the four deltas to `engine/types/verdict.ts`, the pre-existing test `test/q01-no-at-pin-deltas.test.ts` (1 runtime test, from `test/q01-no-at-pin-deltas.test.js`) fails.

**Observed test run:**
```
✖ Q1 AC-7 — every vendored-at-pin file is byte-identical to source modulo header
```

**Root cause:** `test/q01-no-at-pin-deltas.test.ts` maintains a hardcoded `AT_PIN_FILES` list that includes `engine/types/verdict.ts` (line 54). For each file in that list, the test strips the first 6 header lines and compares the remainder to `../deploysignal/<source>`. After the R18 deltas:
- Delta 4 (header annotation) adds 10 lines that are NOT within the stripped header — they appear AFTER line 5 but BEFORE the blank line, so they survive stripping.
- Deltas 1, 2, 3 (interface changes) modify the body of the file.

Both categories of change cause the stripped content to differ from the deploysignal source.

**The spec's failure-mode analysis (§ 1 failure mode 5) considered only `q01-vendoring-coverage`** (which checks the first line only). It did NOT consider `q01-no-at-pin-deltas`, which checks byte-identity of the entire body. This test was designed for files that are truly `vendored-at-pin`; `engine/types/verdict.ts` is now effectively `vendored-with-deltas` at Phase 2 SLICE 1.

**Observed total:** 180 pass / 1 fail (not 181 / 0). The spec's AC-R18-12 halt trigger fires.

**The anti-scope prohibits modification of any prior-round test file (q01-q17).** No tactical fix available without an operator decision.

---

## Precedent

`engine/types/config.ts` underwent the same transition in a prior round: it was vendored-at-pin, then modified with SLICE 1 deltas, and was subsequently REMOVED from `AT_PIN_FILES` in `q01-no-at-pin-deltas.test.ts`. The comment at line 9 of that test reads: "config.ts is vendored-with-deltas and is EXCLUDED from this check." An identical update is needed for verdict.ts.

The VENDORING-MANIFEST.md row for `engine/types/verdict.ts` should also change from `vendored-at-pin` to `vendored-with-deltas` (with an annotation note) to reflect the Phase 2 SLICE 1 amendments — analogous to how config.ts is recorded.

---

## Resolution options

**Option A (RECOMMENDED): Operator approves a targeted exception to the prior-round-test anti-scope.**

- Remove `engine/types/verdict.ts` from `AT_PIN_FILES` in `test/q01-no-at-pin-deltas.test.ts` (analogous to how `engine/types/config.ts` was handled in a prior round). Add a comment: "verdict.ts is vendored-with-deltas at Phase 2 SLICE 1 and is EXCLUDED from this check."
- Update `coordination/VENDORING-MANIFEST.md` row for `engine/types/verdict.ts` from `vendored-at-pin` to `vendored-with-deltas`, with an annotation: "Phase 2 SLICE 1 (R18) amendments: TopologyNode.kind + TopologyEdge.relationship extensions + VerdictGroup.cluster_event_id optional field."
- **Consequence:** `q01-no-at-pin-deltas.test.js` test count drops from 1/0 to 1/0 (unchanged — 1 test still runs, now with 39 files instead of 40). Wait, the count stays 1/0 because the entire test is one `test()` call that loops over AT_PIN_FILES. Removing verdict.ts from the loop fixes the failure.
- **Observed total at GREEN:** 181 pass / 0 fail (matching AC-R18-12 expectation).

**Option B: Accept the 1-test regression as a known gap; proceed with 180/1.**

- Leave `q01-no-at-pin-deltas.test.ts` byte-identical.
- Update NEXT-ROLE.md baseline for this file from 1/0 to 0/1.
- The Reviewer would audit this as a MAJOR or MINOR known regression.
- **Consequence:** AC-R18-12 is NOT satisfied (observed 180/1, not 181/0). Requires Reviewer to accept or the Operator to disposition this on next cycle.

**Option C: Empirically verify with:**
```
node --test test/q01-no-at-pin-deltas.test.js
```
This will show the exact diff between the tessera verdict.ts (post-deltas) and the deploysignal source, confirming the failure mode.

---

## Implementer recommendation

Option A. The config.ts → vendored-with-deltas precedent is directly applicable; the fix is mechanical and matches established project pattern. The operator approved the same modification in a prior round.

---

_Written by IMPLEMENTER at R18 halt. Status: ESCALATE._
