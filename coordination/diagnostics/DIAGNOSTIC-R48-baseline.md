# DIAGNOSTIC-R48-baseline: AC-R48-8 spec literal contradicts actual pre-R48 test baseline

**Round:** R48
**Role:** IMPLEMENTER (audit-tier; Architect hat)
**Filed at:** pre-implementation, prior to any code changes
**Halt condition triggered:** § 8 item 3 + R45 MAJOR-2

---

## Spec claim (exact quote)

From `coordination/specs/Q-R48-SPEC.md` AC-R48-8:

> `node --test --test-reporter=tap test/*.test.js` → tests=361, pass=356, fail=2, skipped=3.

From `coordination/specs/Q-R48-EMPIRICAL.sh` AC-R48-8 block:

```bash
assert_eq "AC-$ROUND-8 (test summary)" "361/356/2/3" "$SUMMARY"
```

## Reality (empirically derived at ROUND_START SHA 6e8b1c6)

```
node --test --test-reporter=tap test/*.test.js 2>&1 | grep -E '(# tests|# pass|# fail|# skip)'
# tests 361
# pass 355
# fail 3
# skipped 3
```

Actual baseline: `361/355/3/3` — one additional failing test vs. spec's expected `361/356/2/3`.

## Root cause

R47 MU commit `6e8b1c6` (ROUND_START for R48) modified `CLAUDE-IMPLEMENTER.md`, adding 4 new
REINFORCED entries for R47 CRITICAL-1, MAJOR-1, MAJOR-2, MINOR-3. This raised the entry count
from 30 to 34, breaking forward-protection test:

```
not ok 347 - AC-R36-21: CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2
```

The two previously-failing tests (AC-R36-30, AC-R36-31) are unchanged. The drift is entirely
attributable to R47 MU commit, which predates R48 ROUND_START.

## Spec authoring error

Q-R48-SPEC.md AC-R48-8 was authored with the R47 chore-A baseline (361/356/2/3) rather than
the actual baseline at ROUND_START (6e8b1c6 = R47 MU commit). The R47 MU commit is what
changed the baseline. The spec should have said 361/355/3/3.

Per R45 MAJOR-2 (audit-tier spec deviance): inline amendment without operator approval is
prohibited. ESCALATE required.

## Options

**Option A (recommended):** Amend `coordination/specs/Q-R48-SPEC.md` AC-R48-8 and
`coordination/specs/Q-R48-EMPIRICAL.sh` to use `361/355/3/3` as the expected baseline.
Both files are in ALLOWED_SET. The intent of "test baseline preserved" is satisfied: R48
implementation changes will not cause further drift (the 3 already-failing tests are
pre-existing structural failures predating R48).

**Option B:** Expand R48 scope to include `CLAUDE-IMPLEMENTER.md` and remove the 4 R47
REINFORCED entries to restore ≤30. Problems:
- Deletes legitimate R47 MU content from the audit trail.
- CLAUDE-IMPLEMENTER.md is explicitly in R48 anti-scope ("NO modification of CLAUDE-*.md").
- Would require a scope expansion operator decision separately.
- Deferred: not recommended.

**Option C:** Proceed with AC-R48-8 as-written. AC-R48-8 will always fail in the verifier;
exit 1 at chore-A is structurally guaranteed regardless of R48 implementation. Not acceptable.

## Recommendation

**Option A.** Amend the baseline literal to `361/355/3/3` in both spec and verifier.
The amendment is factual (corrects a spec authoring error) and does not change R48 scope.
Post-amendment, the verifier will confirm R48 implementation does not introduce additional
test failures beyond the 3 pre-existing ones.
