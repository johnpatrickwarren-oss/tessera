CURRENT-ROUND: R08
NEXT-ROLE: REVIEWER
STATUS: READY

## Implementer routing block

**Two-commit RED → GREEN used (preferred path per spec AC-25 note).**
- RED commit `f99e54c`: q07 test changes only — Deltas 3, 4, 5, 6, 7, 10, 12.
- GREEN commit `4ba5e9e`: Delta 9 (config.ts JSDoc) + Delta 1 (v0.3 scoping memo) + Delta 2 (pre-disposition append).

**OBSERVED counts at GREEN `4ba5e9e`:**
- q07-fleet-correlated: 23 / 0
- q06-baseline-pre-pass: 13 / 0
- q01-vendoring-coverage: 3 / 0
- q01-no-at-pin-deltas: 1 / 0
- q01-schema-additions: 5 / 0
- q02-schema-extension: 6 / 0
- q03-warm-start-runtime: 13 / 0
- q04-welford-stats: 11 / 0
- q05-per-shard-runtime: 13 / 0
- betting-e-process smoke: 5 / 0
- **Grand total: 93 / 0**
- typecheck (`node_modules/.bin/tsc -p tsconfig.test.json`): exit 0

**Spot-check ACs (verified at GREEN):**
- AC-29: `grep -n "D1-D10" engine/types/config.ts` → 0 matches; `grep -n "D1-D13"` → found at line 228. ✓
- AC-30: `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` exists ✓; "Q-JC4 scope narrowing" section found in pre-disposition file ✓.
- AC-31: `grep -c "assert.ok(firedCount" test/q07-fleet-correlated.test.ts` → 4 matches (AC-12, AC-13, AC-27, AC-28). ✓

**Delta 11 NOT applied — R07 MINOR-3 remains open.**

Spec Delta 11 prescribed tightening the AC-15 assertion from `assert.ok(curated.length <= origLen)` to `assert.strictEqual(curated.length, origLen)`, citing R07 Reviewer's claim that MCD produces zero contamination flags on the clean fleet fixture. After applying the tightening, the test failed: `AssertionError: run 0: clean fleet should preserve full length; curated=6, original=8`. MCD DOES flag 2 ticks (Stage 2a contamination on the clean fixture). The spec's factual premise was wrong. Reverted to `<= origLen`. This is within tactical autonomy — production behavior empirically determines the correct assertion; no design decision involved. R07 MINOR-3 (AC-15 `<=` → `===`) is carried forward for a future cycle with corrected fixture.

**Production algorithm preserved bit-identical.** `tools/curate-baseline-fleet-correlated.ts` was not modified.

## Attestation

```
SHA-A (coordination chore commit): [TO BE FILLED]
```

## Inputs (load-bearing — Reviewer reads these)

- `coordination/specs/Q-R08-SPEC.md` (full) — the spec; use for AC tracing.
- `coordination/specs/Q-R08-SPEC-AUDIT.md` (full) — Architect audit sidecar; use for cross-section consistency claims.
- `test/q07-fleet-correlated.test.ts` (GREEN HEAD) — primary modified test file.
- `engine/types/config.ts` (line 228) — Delta 9 target.
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` (full) — Delta 1 target.
- `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` (full) — Delta 2 append target.

## Round scope summary (Reviewer background)

**R08 = Phase 1 SLICE 5 amendment + R07 MAJOR-1/MAJOR-2 closure via Option (B) + Option (D).**

- **Option (D)**: scope-narrow FCP-1 claim to sustained fleet events. Bump SCOPING-MEMO-BASELINE-CURATION-v0.2 → v0.3 (new file). Append "Q-JC4 scope narrowing (2026-05-16)" section to pre-disposition file.
- **Option (B)**: redesign AC-12/13 as FPR-under-transient-perturbation tests (`<= 1`); add AC-27 (sustained strong; `>= 25` theory-derived) + AC-28 (sustained weak; `>= 15` theory-derived). NO new OBSERVED-binding — all new ACs use theory-derived bounds or scope-claim bindings with inline right-reasons checks.
- **In-passing carry-forward MINOR closures** (operator-authorized; Architect's discretion exercised AFFIRMATIVELY): R06 MINOR-1 (config.ts:228 JSDoc); R07 MINOR-2 (AC-5/6 unused `xw`); R07 MINOR-3 (AC-15 length `<=` → `===`); R07 MINOR-4 (AC-16 comment).

**Production algorithm UNMODIFIED** at R08 per Q-JC4 framework preservation (operator-set HALT R08-SAS-2). `tools/curate-baseline-fleet-correlated.ts` is preserved bit-identical.

## Halt conditions (operator-set; from prior NEXT-ROLE.md + R07 reinforcements)

1. **Q-JC4 framework re-disposition**: if Implementer encounters apparent need to modify `tools/curate-baseline-fleet-correlated.ts` algorithm, HALT and write `DIAGNOSTIC-R08-q-jc4-redisposition.md` + STATUS: ESCALATE. R08-SAS-1 + R08-SAS-2 fence this.
2. **New OBSERVED-binding without right-reasons check**: if at GREEN, AC-27 OBSERVED firedCount < 25 OR AC-28 OBSERVED firedCount < 15, applying the R06 OBS-1 tactical-fix tightening protocol requires INLINE right-reasons check documenting "would a future FIX matching architect prediction FAIL the tightened test?" — if YES, do not tighten; instead HALT and write `DIAGNOSTIC-R08-ac<N>-bound.md` + STATUS: ESCALATE. R07 MAJOR-2 reinforcement is standing.
3. **Anti-scope expansion beyond the 4 R08-modified surfaces**: any apparent need to modify a fifth file (other than coordination artifacts — NEXT-ROLE.md / MEMORIAL.md / Q-R08-SPEC*.md) → HALT + DIAGNOSTIC + ESCALATE.

## Coordination chore sequence (R14 — same as R06/R07)

1. Run all binding commands at GREEN; record OBSERVED counts (NOT pre-stated).
2. Write all coordination artifacts (NEXT-ROLE.md attestation + MEMORIAL.md append + observed counts) WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R08): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R08): record attestation SHA"` → SHA-B (becomes HEAD).
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

Do NOT use `--amend`. Do NOT collapse the two commits.

**Note on R08 TDD ordering (AC-25)**: R08 is the FIRST Tessera round without behavior-changing production code. The preferred path is two-commit RED → GREEN (RED modifies q07 test file only with Deltas 3/4/5/6/7/10/11/12 — all 23 q07 tests should pass at RED because the algorithm is preserved; GREEN lands Delta 1 v0.3 memo + Delta 2 pre-disposition append + Delta 9 config.ts JSDoc). Single-commit landing is acceptable; if elected, document the deviation here.

## Pre-R08 baseline (INFORMATIONAL; do NOT pre-state at GREEN per R03 MINOR-4)

Reviewer-verified at R07 HEAD `fd7e3a6`:
- q07-fleet-correlated: 21/0
- q06-baseline-pre-pass: 13/0
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- betting-e-process smoke: 5/0
- **Total: 91/0**

R08 expected post-GREEN: q07 = 21 + 2 (AC-27 + AC-28) = 23; all other counts unchanged. **Post-R08 expected total: 93/0**. Implementer reports OBSERVED counts per file at GREEN.

## Architect close-state

**Architect spec emit at HEAD `8ca5e42`.** Spec `Q-R08-SPEC.md` + audit sidecar `Q-R08-SPEC-AUDIT.md` written. 18-row cross-section consistency pass executed; all PASS. 20-row standing-reinforcement audit applied (including R07's two LOAD-BEARING reinforcements: fixture-sizing propagation + OBSERVED-binding scope). All 4 file modifications + 1 file creation enumerated in § Component inventory with concrete pseudocode for each Delta. Pre-emit grilling caught zero issues (clean grilling pass at first re-read). Memorial entries written for R08 architect-side disciplines.

## Routing

Implementer reads `coordination/specs/Q-R08-SPEC.md` (full) + the README-pointer files above; implements 12 Deltas across 4 file surfaces (1 created + 3 modified); runs binding commands at GREEN; reports OBSERVED counts; routes to REVIEWER.

```
cd ~/concord/tessera
./run-pipeline.sh --round R08 --tier full
```

(`--tier full` per A3 + A5; operator-set per the parent NEXT-ROLE.md that launched R08.)

## R06+R07+R08 = full autonomous-round budget (3 of 3)

This is the third and final autonomous round under the 2026-05-16 cost-discipline budget. After R08 closes (regardless of outcome), the assistant STOPS and waits for John's return.

## Operator gate items (preserved for John's return — not blocking R08)

1. **OQ-R08-1 (NEW at R08)**: should AC-11 (H₀ FPR) be loosened from `assert.strictEqual(firedCount, 0)` to `assert.ok(firedCount <= 1)` (or similar)? R07 Reviewer's MAJOR-2 noted strict-equality is "tighter than Ville bound guarantee." R08 operator-set scope did NOT include AC-11; fenced at R08-SAS-17.
2. **OQ-R08-2 (NEW at R08)**: should the v0.3 narrowing be reflected in a PRD AC-P1 prose narrowing? Architect-pre-prediction: not needed (PRD is intentionally thin).
3. **OQ-R08-3 (NEW at R08)**: when (if ever) should Phase 2 add a transient-single-window detector? Architect-pre-prediction: only on real GPU-cluster operational demand.
4. **OQ-1 / Q-JC1 narrowing (from R06)**: does R09+ proceed with `tools/calibrate.ts` vendoring as a dedicated round, OR does R06 Stage 3a's structural-typing compatibility suffice?
5. **R05 methodology gap not captured by R06 Memorial Updater** — still open.
6. **Anchor PR #37** (preflight preserve operator-prepared NEXT-ROLE.md) — still open.
7. **Anchor PR #35** (MD-F6 + verify-citations.sh) — still open.

## Update history (continued)

| Date | Event |
|---|---|
| 2026-05-16 | R07 closed Reviewer-MERGE-READY with 2 MAJORs (PR-F8 power-gap + self-confirming tests); autonomous mode escalated. |
| 2026-05-16 | John expanded autonomous authority: continue per assistant's recommendations without approval; R07 MAJORs become R08 work under (B)+(D) disposition. |
| 2026-05-16 | R08 launched under expanded authority (third and final round under the cost-discipline budget). |
| 2026-05-16 | R08 Architect spec emit at HEAD `8ca5e42`. Q-R08-SPEC.md + Q-R08-SPEC-AUDIT.md authored. Routing to IMPLEMENTER. |
| 2026-05-16 | R08 Implementer complete. RED `f99e54c` + GREEN `4ba5e9e`. 23/0 q07; 93/0 grand total; typecheck clean. Delta 11 reverted (spec premise factually wrong). Routing to REVIEWER. |
