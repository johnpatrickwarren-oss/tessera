# DIAGNOSTIC-R85-ac-r84-14-baseline-drift

**Round:** R85
**Role:** IMPLEMENTER
**Halt condition triggered:** § 6.1 Halt condition 3 — fail count ≠ 16 strict

---

## Spec claim (exact quote)

Q-R85-SPEC.md § 5.2 (binding-command attestation table):
> TAP `# fail`: **16** (strict; R84 close 15 + AC-R84-16 forward-protection flip)

Q-R85-SPEC.md § 1.11 (Architect pre-prediction table):
> TAP `# fail` | **16** (R84 close 15 + 1 AC-R84-16 forward-protection flip; strict)

---

## Reality

At implementation-complete HEAD (all 5 R85 deliverables realized, all 20 R85 ACs passing), the `node --test` run shows **fail=17** in at least one run:

- 15 carry-forward failures (unchanged from R84 close)
- +1 AC-R84-16 forward-protection flip (expected; correctly predicted)
- +1 AC-R84-14 `worker.terminate() halts further message emission` (unexpected; not in carry-forward list)

= 17 total failures, vs predicted 16 strict.

---

## Root cause

AC-R84-14 is a structurally flaky test. The R84 Reviewer documented this as VIOLATION `ac-r84-14-structurally-flaky-race-condition`:

> "AC-R84-14 (worker.terminate() halts streaming) is structurally flaky in Node worker_threads context. The worker can post all 51 messages synchronously into the message queue before the main thread processes message #1 and calls terminate(). ... The discriminating property 'fewer than 50 messages' is satisfied probabilistically, not by terminate() actually pre-empting emission."

AC-R84-14 was NOT in the R84-close carry-forward list of 15 failures (Q-R85-SPEC.md § 1.11 enumerates: AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14, AC-R82-14, AC-R83-12, AC-R83-15 — 15 items, no AC-R84-14).

The baseline run at round-start (Q-R84-EMPIRICAL.sh confirming fail=15) passed AC-R84-14 in that particular run. The flakiness is non-deterministic: the test passes when the Worker message queue is not already full before `terminate()` fires; it fails when synchronous emission outpaces terminate().

R85 did NOT modify `engine-worker.js`, `demos/engine-worker.js`, or any Worker protocol. R85's additive JS edits to the R84 btnRun handler are in the main-thread IIFE only. AC-R84-14's failure is pre-existing and independent of R85 changes.

Evidence: stash test at RED stub state showed fail=37 = 15 carry-forward + 20 RED stubs + 2 extra. One of those 2 extra was AC-R84-14 (flaky).

---

## Why HALT is required

The spec's § 5.2 binding-command table prescribes `fail=16 strict`. Observed `fail=17`. Per CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-20: "when EMPIRICAL.sh or any binding command produces an observed value diverging from spec-predicted ... the Implementer procedure is: (1) write DIAGNOSTIC identifying the root cause; (2) set STATUS: ESCALATE; (3) STOP. The Implementer does NOT amend EMPIRICAL.sh."

---

## Options (bounded)

**Option A** — Operator acknowledges AC-R84-14 as a pre-existing, structurally flaky test whose occasional failure should be included in the fail baseline. Architect/operator amends:
- `Q-R85-EMPIRICAL.sh` Block 4: `EXPECTED_FAIL=17` (or band `EXPECTED_FAIL_MIN=16 EXPECTED_FAIL_MAX=17`) 
- `Q-R85-SPEC.md` § 5.2 prediction: change `TAP # fail: 16 (strict)` to `TAP # fail: 16–17 (band; ±1 for AC-R84-14 structural flakiness documented in R84 REVIEWER MINOR-2)`

Consequence: EMPIRICAL.sh Block 4 PASS on either fail=16 or fail=17 runs. GREEN commit proceeds. The pre-existing structural issue is documented rather than silently tolerated.

**Option B** — Operator accepts the strict fail=16 prediction as correct (meaning the observed fail=17 run was the flaky case) and asks Implementer to re-run the full suite 3× and attest the majority count. If majority is 16, proceed with fail=16 attestation and disclose AC-R84-14 flakiness in NEXT-ROLE.md as TD.

Consequence: If majority is 16, GREEN commit proceeds with TD disclosure of AC-R84-14 non-determinism. If majority is 17, the prediction needs to change (back to Option A).

**Option C** — Operator directs remediation of AC-R84-14 flakiness itself (e.g., insert a short delay before checking message count, or redesign the test to use a done callback rather than a timeout-based count). This is out of R85 scope (test file for prior round) and would require ALLOWED_SET expansion for `test/q84-live-engine-compute.test.ts`.

Consequence: Requires operator to authorize ALLOWED_SET expansion + spec amendment for AC scope change. Disproportionate given the test is pre-existing.

---

## Implementer recommendation

Option B is the least invasive: re-run the full suite 3× to observe the majority fail count, then attest the actual majority with AC-R84-14 flakiness disclosed in the routing block. If the majority count is 16 (EMPIRICAL.sh EXPECTED_FAIL=16 still correct), the prediction holds and no spec amendment is needed. If the majority count is 17, proceed to Option A.

Option A is the formally correct long-term resolution: document the pre-existing structural flakiness in the baseline count.

Option C is disproportionate.

---

## Status

`STATUS: ESCALATE` — operator selects A, B, or C; Implementer resumes per operator decision.
