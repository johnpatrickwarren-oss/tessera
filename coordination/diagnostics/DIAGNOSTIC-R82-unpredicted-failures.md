# DIAGNOSTIC-R82-unpredicted-failures.md

**Round:** R82
**Role:** IMPLEMENTER
**Date:** 2026-05-21
**Status:** ESCALATE — operator must choose Option A, B, or C before implementation can proceed past chore-A

---

## Issue 1: Q1 AC-7 — unpredicted failure from topology-overlay.ts modification

**Spec claim (§ 1.4 prediction):** `# fail` strict-equality 12 at chore-A.

**Reality:** Running the full test suite after R82 implementation shows `# fail 14`, not 12. One unexpected new failure is Q1 AC-7.

**Root cause:** `test/q01-no-at-pin-deltas.test.ts` (`AT_PIN_FILES` at line 51) lists `engine/topology-overlay.ts` as a "vendored-at-pin" file and asserts byte-identity (modulo Tessera header) against `../deploysignal/engine/topology-overlay.ts`. R82 modifies `engine/topology-overlay.ts` (the Web Crypto adapter + embedded pure-JS SHA-256), which causes the file to diverge from its DeploySignal source. Q1 AC-7 therefore fails.

This was NOT in the Architect's predicted carry-forward 11, and was NOT included in the predicted fail=12. The Architect's specification did not account for the Q1 AC-7 vendored-at-pin check on topology-overlay.ts.

**Verification command:**
```
node test/q01-no-at-pin-deltas.test.js 2>&1 | grep -E "Q1 AC-7|fail|pass"
```

---

## Issue 2: AC-R71-3 — unpredicted failure from demo.html regeneration

**Spec claim:** Smoke block added to `demos/demo.html`; AC-R82-9 passes; AC-R71-3 continues to pass.

**Reality:** `test/q71-demo-dashboard.test.ts` (line 93) calls `buildAllCannedDemos()` during AC-R71-3. This function in `tools/build-canned-demos.ts` (line 1906) regenerates demo.html as:
```
HTML_TEMPLATE_HEAD + dataBlock + HTML_TEMPLATE_FOOTER
```
where `HTML_TEMPLATE_FOOTER` ends with `</body>\n</html>`. Any manually-added smoke block before `</body>` is overwritten. After `buildAllCannedDemos()` runs, demo.html has NO smoke block.

Consequences:
- AC-R71-3 FAILS (preHtml ≠ postHtml because postHtml loses the smoke block)
- AC-R82-9 FAILS (smoke block no longer in demo.html)

The correct fix is to add the smoke block to `HTML_TEMPLATE_FOOTER` in `tools/build-canned-demos.ts`. But that file is NOT in the ALLOWED_SET regex in Q-R82-EMPIRICAL.sh Block 5 and in AC-R82-14. Adding it would cause AC-R82-14 to fail unless ALLOWED_SET is amended.

The Architect read `tools/build-canned-demos.ts` at spec-emit (§ B.1) but did not account for the AC-R71-3 idempotency test calling `buildAllCannedDemos()` during the test run.

**Verification commands:**
```bash
grep -n "buildAllCannedDemos" test/q71-demo-dashboard.test.js
grep -n "HTML_TEMPLATE_FOOTER" tools/build-canned-demos.ts | head -3
```

---

## Combined effect on test counts

At chore-A (post R82 implementation):
- **Observed:** tests=636, pass=618, fail=14, skipped=4
- **Predicted (spec § 1.4 + EMPIRICAL.sh):** fail strict 12, pass [620, 625]

Deviation: fail=14 (not 12). EMPIRICAL.sh Block 4 EXPECTED_FAIL=12 will report FAIL, causing Block 4 to fail and EMPIRICAL.sh to exit non-zero.

---

## Bounded options for operator

### Option A (Architect-recommended) — Amend ALLOWED_SET to fix both issues

Amend the spec triad (requires Architect commit):
1. Add `tools/build-canned-demos.ts` to ALLOWED_SET regex in § 3.2, EMPIRICAL.sh Block 5, and AC-R82-14 regex.
2. Add `test/q01-no-at-pin-deltas.test.ts` to ALLOWED_SET regex (same three places).
3. Amend EMPIRICAL.sh EXPECTED_FAIL to remain 12 (both issues are fixed):
   - Implementer adds smoke block to `HTML_TEMPLATE_FOOTER` in `tools/build-canned-demos.ts` → AC-R71-3 PASSES
   - Implementer adds `topology-overlay.ts` to "vendored-with-deltas" exclusion list in `q01-no-at-pin-deltas.test.ts` → Q1 AC-7 PASSES
   - EXPECTED_FAIL stays 12 ✓
4. Consequence: two additional files in chore-A diff (build-canned-demos.ts, q01-no-at-pin-deltas.test.ts), both pre-authorized.

**Cost:** One Architect spec-amendment commit; ~25 lines added to build-canned-demos.ts; ~1 line change in q01-no-at-pin-deltas.test.ts; EXPECTED_FAIL unchanged at 12.

### Option B — Amend ALLOWED_SET for demo.html generator only; accept Q1 AC-7 as new carry-forward

Amend the spec triad:
1. Add `tools/build-canned-demos.ts` to ALLOWED_SET regex.
2. Amend EMPIRICAL.sh EXPECTED_FAIL from 12 → 13 (Q1 AC-7 becomes carry-forward).
3. Implementer adds smoke block to `HTML_TEMPLATE_FOOTER` → AC-R71-3 PASSES, AC-R82-9 PASSES.
4. Q1 AC-7 remains failing (topology-overlay.ts modification diverges from DeploySignal source).

**Cost:** One Architect spec-amendment commit; Q1 AC-7 joins carry-forward failures. Future rounds that also modify topology-overlay.ts will inherit this failure.

**Note on EXPECTED_FAIL change:** EMPIRICAL.sh is spec triad; Implementer cannot amend it — requires Architect commit.

### Option C — Accept both failures; amend EXPECTED_FAIL only

Amend the spec triad:
1. EMPIRICAL.sh EXPECTED_FAIL from 12 → 14.
2. No ALLOWED_SET changes.
3. AC-R82-9 FAILS (smoke block can't survive buildAllCannedDemos).
4. AC-R71-3 FAILS.
5. Q1 AC-7 FAILS.

**Cost:** One Architect spec-amendment commit. R82 cannot deliver the browser smoke test in demo.html without overcoming the generator constraint. AC-R82-9 must be dropped or restructured.

**Not recommended** — defeats the purpose of the smoke-test deliverable.

---

## Implementer current state

All other R82 deliverables are COMPLETE and passing (14/14 R82 ACs pass when tested in isolation; AC-R82-9 passes when demo.html contains the smoke block, which it does when run before AC-R71-3 overwrites it):

- `tools/build-browser-bundle.ts` — implemented (NEW)
- `engine/topology-overlay.ts` — modified (Web Crypto adapter + pureJsSha256)
- `demos/engine-bundle.mjs` — built (58,291 bytes)
- `package.json` — modified (build:browser script + esbuild devDep)
- `pnpm-lock.yaml` — refreshed
- `.gitignore` — modified (engine-bundle.mjs + pnpm-workspace.yaml)
- `test/q82-engine-browser-bundle.test.ts` — implemented (14 ACs; RED commit at 59e5355)

Blocked on: operator authorization for spec-triad amendment to resolve EXPECTED_FAIL deviation and (for options A or B) ALLOWED_SET expansion.

---

## What the operator needs to do

1. Choose Option A, B, or C above.
2. Have the Architect (or operator directly) commit an amendment to the spec triad:
   - `coordination/specs/Q-R82-SPEC.md` — update § 3.2 ALLOWED_SET regex and § 1.4 predictions
   - `coordination/specs/Q-R82-EMPIRICAL.sh` — update EXPECTED_FAIL and Block 5 ALLOWED regex
   - `test/q82-engine-browser-bundle.test.ts` — update AC-R82-14 regex (if ALLOWED_SET changed)
3. Re-dispatch Implementer with the operator directive noted in NEXT-ROLE.md.

Under Option A, the Implementer will then:
- Add smoke block to `HTML_TEMPLATE_FOOTER` in `tools/build-canned-demos.ts`
- Add `topology-overlay.ts` to vendored-with-deltas exceptions in `test/q01-no-at-pin-deltas.test.ts`
- Re-run EMPIRICAL.sh to verify exit 0
- Proceed to chore-A commit
