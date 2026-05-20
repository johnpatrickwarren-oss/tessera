# DIAGNOSTIC-R66-r65-index-count-regression

**Round:** R66  
**Role:** IMPLEMENTER  
**Status:** HALT — halt conditions #1 + #3 fired  

---

## Spec claim (exact quotes)

§ 5.2 implicit AC (binding command attestation):
> `node --test --test-reporter=tap test/*.test.js` → expected `tests=444 / pass=439 / fail=2 / skipped=3`

§ 6.1 halt condition #3:
> Phase 1+2+Phase-3-SLICE-1+2+R65 regression: any pre-R66 test other than R36-30 + R36-31 transitions PASS → FAIL.

§ 6.1 halt condition #1:
> `Q-R66-EMPIRICAL.sh` non-zero exit at chore-A — any non-zero exit is a halt condition.

---

## Reality (empirically observed at implementation)

```
node --test --test-reporter=tap test/*.test.js 2>&1 | tail -10
# tests 444
# pass 438
# fail 3
# skipped 3
```

Failures at this state:
1. `AC-R36-30` — pre-existing R36-31 carry-forward (expected per spec)
2. `AC-R36-31` — pre-existing R36-31 carry-forward (expected per spec)
3. **`AC-R65-2: engine/ds-integration/index.ts has 3 export-star lines`** — NEW failure (not expected)

**Root cause of AC-R65-2 failure:**

`test/q65-ds-integration-feed.test.ts` AC-R65-2 reads the current `engine/ds-integration/index.ts` at runtime and asserts:
```ts
const matches = src.match(/^export \* from /gm);
assert.equal(matches?.length ?? 0, 3);
```

R66's § 4.3 deliverable adds exactly 2 export-star lines to `index.ts` (as specified in R66 ALLOWED_SET and anti-scope rule #5). After R66's modification, `index.ts` has 5 export-star lines, not 3. The R65 test reads the current file (not a historical diff), so it fails.

**Q-R66-EMPIRICAL.sh Block 14 consequence:**

Block 14 asserts:
```bash
assert_eq "Block 14 (test summary)" "444/439/2/3" "$SUMMARY"
```

Actual: `444/438/3/3`. Block 14 FAILS, causing EMPIRICAL.sh to exit non-zero → halt condition #1.

---

## Resolution options

### Option A (Recommended): Accept AC-R65-2 as a carried-forward regression; update EMPIRICAL.sh Block 14 expected count

**What it does:** Update `coordination/specs/Q-R66-EMPIRICAL.sh` Block 14 expected count from `444/439/2/3` to `444/438/3/3`. Update `Q-R66-SPEC.md § 5.2` comment to document `AC-R65-2` as a carry-forward failure. Both files are in ALLOWED_SET; no anti-scope expansion needed.

**Consequence:** EMPIRICAL.sh exits 0. The actual test counts are correctly attested. AC-R65-2 is documented as a regression caused by R66's necessary `index.ts` modification.

**Rationale:** `AC-R65-2` was testing a "live file state" (not a historical SHA diff), which is inherently fragile to future `index.ts` updates. R66's addition of 2 export-star lines is explicitly in-scope per R66 spec § 4.3 + ALLOWED_SET. The R65 test's design assumption (count stays at 3) is invalidated by a subsequent round's correct scope. Documenting this as a carry-forward failure is analogous to the R36-30/31 pattern.

**Does not require:** anti-scope expansion, operator precedent beyond "update EMPIRICAL.sh count".

### Option B: Modify `test/q65-ds-integration-feed.test.ts` to expect 5 export-star lines

**What it does:** Change AC-R65-2 assertion from `=== 3` to `=== 5` in `test/q65-ds-integration-feed.test.ts`. This would fix the failure.

**Consequence:** Requires adding `test/q65-ds-integration-feed.test.ts` to R66's ALLOWED_SET. This violates anti-scope rule #8 ("Modify any R42-R65 deliverable") and R36 MAJOR-2 (ALLOWED_SET self-expansion forbidden without operator approval). Requires explicit operator approval and a documented anti-scope waiver.

### Option C: Empirically verify that this is the only carry-forward regression introduced by R66

**What it does:** Run all tests, confirm no OTHER pre-R66 test regresses beyond AC-R65-2. Then proceed with Option A (accept the 1 regression) OR Option B (fix the R65 test with operator approval).

Command to verify:
```bash
node --test --test-reporter=tap test/*.test.js 2>&1 | grep "^not ok"
```

Expected output confirms only AC-R36-30, AC-R36-31, and AC-R65-2 fail.

---

## Implementer recommendation

**Option A** is the correct path. The modification to `index.ts` is in-scope and specified. The R65 test reading the live file count is inherently fragile to future in-scope modifications. Updating EMPIRICAL.sh Block 14 to reflect the actual (444/438/3/3) is a legitimate correction to the Architect's count prediction, not a scope expansion. Both modified files (Q-R66-EMPIRICAL.sh, Q-R66-SPEC.md) are in ALLOWED_SET.

If operator agrees with Option A, Implementer will:
1. Update `coordination/specs/Q-R66-EMPIRICAL.sh` Block 14 expected count to `444/438/3/3`
2. Update `coordination/specs/Q-R66-SPEC.md § 5.2` count prediction with an annotation
3. Re-run EMPIRICAL.sh to confirm exit 0
4. Complete chore-A commit and route to Reviewer with full verbatim attestation
