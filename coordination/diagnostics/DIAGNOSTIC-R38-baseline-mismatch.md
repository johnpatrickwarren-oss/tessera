# DIAGNOSTIC-R38-baseline-mismatch

**Round:** R38  
**Role:** IMPLEMENTER  
**Filed:** 2026-05-19

---

## Spec claim (exact quote from NEXT-ROLE.md Baseline-verification directive)

> `node --test test/*.test.js` — expected baseline: **355 tests, 353 pass, 0 fail, 2 skip**
> (per AC-R36-29 confirmation at chore-B fbc7228)
>
> If actual differs from expected, that is a Rule 6 halt-condition (HALT with DIAGNOSTIC; do NOT absorb).

## Reality (empirically observed at R38 session start)

```
npx tsc -p tsconfig.test.json  →  exit 0   ✅ matches expected
node --test test/*.test.js     →  355 tests, 349 pass, 4 fail, 2 skip   ❌ differs
```

**4 failing tests** (all in `test/q36-phase2-close-walk.test.ts`):

| Test | Failure message |
|------|----------------|
| AC-R36-21 | CLAUDE-IMPLEMENTER.md must have ≤30 REINFORCED entries after MR-2; **found 33** |
| AC-R36-23 | CLAUDE-IMPLEMENTER.md rule text must not use `content.includes()` pattern (self-application gate) |
| AC-R36-30 | R36 anti-scope violations (paths not in ALLOWED_SET): `coordination/WAVE-GATE-05.md`, `coordination/logs/ROUND-R36-SUMMARY.md` |
| AC-R36-31 | post-chore-A modification outside allowed set: `CLAUDE-IMPLEMENTER.md`, `coordination/WAVE-GATE-05.md`, `coordination/logs/ROUND-R36-SUMMARY.md` |

## Root cause analysis

All 4 failures are in R36 forward-protection guards that measure `git diff <SHA>..HEAD`. The guards were correct at R36 chore-B (fbc7228), but post-R36 commits moved HEAD forward:

**AC-R36-21 + AC-R36-23:**  
Commit `95fb2ce` (`chore(R36): Memorial-Updater outputs`) — added 3 new `# REINFORCED` entries to `CLAUDE-IMPLEMENTER.md`, bringing the count to 33 (exceeds the ≤30 bound set at R36 chore-A). One of the new entries describes the prohibition on vacuous `includes()` patterns, necessarily using that word in its text.

**AC-R36-30 + AC-R36-31:**  
- `coordination/logs/ROUND-R36-SUMMARY.md` — added by R36 routing commit `ae19aba` (post-chore-A c49df0e); not in the R36 post-chore-A ALLOWED_SET  
- `coordination/WAVE-GATE-05.md` — added by R37 Coordinator commits `87e372f` + `602350c`; not in R36 ALLOWED_SET (pre-dates R37 scope)

The NEXT-ROLE.md expected baseline (`353 pass, 0 fail`) was cited from chore-B state (`fbc7228`), which predates all 4 of these commits. The Coordinator did not re-run `node --test` after the R36 Memorial Updater + R37 Coordinator commits; this is itself a false-compliance-attestation (Rule 1) in the NEXT-ROLE.md.

## Cannot-fix-within-R38-anti-scope analysis

| Fix needed | Anti-scope constraint |
|---|---|
| Update ALLOWED_SET in AC-R36-30/31 | `test/q36-phase2-close-walk.test.ts` is pre-R36; R38 anti-scope: "NO modification of any pre-R36 test file EXCEPT the in-spec deliberate scope for MAJOR-1 fixture" |
| Reduce CLAUDE-IMPLEMENTER.md entry count ≤30 | R38 anti-scope: "NO modification of CLAUDE-*.md reinforcement files" |

## Resolution options

**Option A (RECOMMENDED): Accept actual baseline; proceed with R38 on new test file.**  
Consequence: R38 spec documents actual baseline as `355 tests, 349 pass, 4 fail, 2 skip`. R38 deliverable goes into new `test/q38-verification.test.ts` (unaffected by q36 guards). Post-R38 baseline becomes `357 tests, 351 pass, 4 fail, 2 skip` (adds 2 new tests). The 4 failures are permanently-tripped forward-protection guards from R36 that measure against HEAD; they cannot regress further and do not block R38 correctness verification. Rule 1 compliance: R38 spec attestation encodes actual counts verbatim.

**Option B: Fix q36 guards before R38.**  
Modify `test/q36-phase2-close-walk.test.ts` to expand ALLOWED_SETs (add WAVE-GATE-05.md, ROUND-R36-SUMMARY.md, CLAUDE-IMPLEMENTER.md), update the ≤30 bound to ≤33, and update the `content.includes()` check to allow the prohibition-description wording. This requires operator authorization (pre-R36 test file; anti-scoped at R38).  
Consequence: Separate round or operator-authorized in-session scope expansion. Recovers clean baseline; prevents accumulation of future cross-round false-positive guard failures.

**Option C: Fix CLAUDE-IMPLEMENTER.md before R38.**  
Remove 3 REINFORCED entries to bring count back to ≤30 (or increase the bound in AC-R36-21). Requires operator authorization (CLAUDE-*.md modification anti-scoped at R38).  
Consequence: Loses 3 legitimate R36 reinforcement lessons, or requires q36 test amendment anyway for the count-bound change.

## Operator decision section

_(Operator fills in here)_

Option chosen: ___

Notes: ___
