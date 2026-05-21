# DIAGNOSTIC-R77-empirical-sh-block2-reporter

**Round:** R77 | **Role:** IMPLEMENTER | **Date:** 2026-05-20

## Halt trigger

Spec § 6.1: "Q-R77-EMPIRICAL.sh exits non-zero at chore-A for any reason other than the pre-documented baseline AC-failures already present at round-start (5 carry-forward fails per § 1.6)."

`bash coordination/specs/Q-R77-EMPIRICAL.sh` exits 1 at chore-A HEAD. Block 2 fails; Blocks 1, 3–8 pass.

## Spec claim (exact)

Q-R77-EMPIRICAL.sh § Block 2 (line 12 of the block):
```bash
node --test test/*.test.js > /tmp/r77-block2.txt 2>&1
TEST_PASS=$(grep -E "^# pass " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r77-block2.txt | head -1 | awk '{print $3}')
```

The block expects `^# pass N` and `^# fail N` lines in stdout. These are TAP reporter format lines.

## Reality

`node --test test/*.test.js` (without `--test-reporter=tap`) produces the default **spec reporter**, which uses Unicode prefix characters (`ℹ pass N`, `✖ fail N`) — NOT the `# pass N` format that the grep patterns match. Result: `TEST_PASS` and `TEST_FAIL` are both empty strings; all branch conditions fail; Block 2 reports failure.

Verified via:
```bash
$ node --test test/*.test.js 2>&1 | grep -E "(pass|fail)" | head -3
# (default reporter uses ℹ, not #)
$ node --test --test-reporter=tap test/*.test.js 2>&1 | grep -E "^# (pass|fail)"
# pass 557
# fail 5
```

The adjacent round Q-R72-EMPIRICAL.sh Block 2 correctly uses `pnpm exec node --test --test-reporter=tap test/*.test.js`. The R77 Architect-authored EMPIRICAL.sh omits `--test-reporter=tap`.

## Constraint

Within-round prefix-continuity invariant (CLAUDE-COMMON.md): "no role may modify the contents of Q-R77-EMPIRICAL.sh." The Implementer cannot fix this unilaterally.

## Implementation status

All 17 R77 ACs pass independently. Test counts at HEAD:
- `node --test --test-reporter=tap test/*.test.js`: tests=17 (q77 file), pass=16, fail=0, skip=1
- Full suite: tests=566, pass=557, fail=5, skip=4; fail=5 = carry-forward set only (AC-R36-21/30/31, AC-R65-2, AC-R66-14)

## Bounded options

**Option A (recommended):** Operator authorizes a one-time exception to the prefix-continuity invariant to fix Q-R77-EMPIRICAL.sh Block 2. Change:
```bash
node --test test/*.test.js > /tmp/r77-block2.txt 2>&1
```
to:
```bash
node --test --test-reporter=tap test/*.test.js > /tmp/r77-block2.txt 2>&1
```
This is a 20-character addition with zero semantic impact on the spec's prescribed behavior. After this fix, EMPIRICAL.sh exits 0. The Implementer then proceeds to chore-A commit + routing.

**Option B:** Operator waives Block 2 mechanical verification for R77. Accepts the EMPIRICAL.sh Block 2 failure as a known Architect script defect with disclosure in NEXT-ROLE.md. REVIEWER re-runs the full test suite manually and verifies the pass/fail counts cold. EMPIRICAL.sh Blocks 1 and 3–8 remain mechanically verified (all pass). Implementer proceeds to chore-A commit with STATUS: READY (not ESCALATE) and explicit spec-deviance disclosure.

**Empirical verification (supports Option A):** `grep -E "^# (pass|fail|tests)" <(node --test --test-reporter=tap test/*.test.js 2>&1)` — run this to confirm the TAP reporter produces the expected format before applying the fix.
