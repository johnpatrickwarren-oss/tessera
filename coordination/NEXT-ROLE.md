CURRENT-ROUND: R13
NEXT-ROLE: MEMORIAL-UPDATER
STATUS: ROUND-COMPLETE

## Inputs

- `coordination/reviews/REVIEWER-REPORT-R13.md` (Reviewer findings: 0 CRITICAL / 0 MAJOR / 1 MINOR / 4 OBS; 14/14 ACs PASS; full regression 152/152; routed MERGE-READY).
- `coordination/specs/Q-R13-SPEC.md` (spec proper).
- `coordination/specs/Q-R13-SPEC-AUDIT.md` (audit sidecar; Memorial Updater may consult).
- `coordination/NEXT-ROLE.md` (this file; Attestation block populated; SHA-A `17994dc` recorded).
- `coordination/MEMORIAL.md` (R13 Implementer entries present; Reviewer entries pending Memorial Updater append).

## R13 scope (operator-set; do NOT redirect)

R13 = Phase 1 SLICE 4: **e-Benjamini-Hochberg FDR operator surface**. Ships:

- **`eBenjaminiHochberg(perShardEValues, qLevel) → { selected, K }`** at `engine/fleet/e-bh.ts` — Ren-Barber 2024 Algorithm 1 / Wang-Ramdas 2022 e-BH; family-agnostic stateless primitive; FDR ≤ q under arbitrary dependence between e-values.
- **PR-F2 evidence matrix** at `test/q13-e-bh-fdr.test.ts` — N=100 shards × T=100 ticks × N_TRIALS=200; iid H₀ + correlated-drift H₀ (ρ²=0.5); both cells assert theory-derived Wilson upper bound `FDR_BOUND ≈ 0.09624` on empirical FDR.
- **14 ACs** binding shape, validation, closed-form correctness, output ordering, tie-breaking, input invariance, FDR control, API ergonomics, TDD ordering, OBSERVED count attestation.

Architectural commitments (resolved by Architect per spec § Mechanism + audit sidecar D1-D14):
- **R12 OQ-1 resolved:** e-BH consumes per-shard e-values (β); fleet-level e-BH (α) rejected.
- **Q-J1 parallel-not-serial preserved:** R13 e-BH and R11/R12 fleet-merge are independent views over the same per-shard e-values; no chaining (R13-SAS-14).
- **MD-F2:** fixed-time e-BH at R13; any-time analog deferred to future SLICE (R13-SAS-13).
- **Default qLevel: NONE** — qLevel is a required positional parameter (R13-SAS-18).
- **Family-agnostic primitive only** — no `eBenjaminiHochbergFamilyA/C` wrappers at R13 (R13-SAS-17).
- **Standard fixed-α e-BH only** — no randomized variant (R13-SAS-15); no BY-style correction (R13-SAS-16).

## Implementer responsibilities (cold-start from spec)

1. **Read inputs in order:**
   - `coordination/PRD.md`
   - `coordination/specs/Q-R13-SPEC.md` (spec proper; verbatim Delta 1 + Delta 2)
   - `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" sections (apply all 13 IMPL reinforcements per CLAUDE-IMPLEMENTER.md)
   - `coordination/MEMORIAL.md` tail (R12 + R13 entries)
   - **DO NOT** read `coordination/specs/Q-R13-SPEC-AUDIT.md` (cold-implementation boundary).

2. **TDD two-commit RED → GREEN sequence (11th consecutive Tessera application):**
   - **RED:** Create `test/q13-e-bh-fdr.test.ts` verbatim from spec Delta 2. `npm run typecheck` MUST exit 1 with TS2307 on missing `../engine/fleet/e-bh` import. Commit message: `red(R13): q13 e-BH FDR test fixtures`.
   - **GREEN:** Create `engine/fleet/e-bh.ts` verbatim from spec Delta 1. `npm run typecheck` MUST exit 0; `node --test test/q13-e-bh-fdr.test.js` MUST report 14/0; full regression `npm test` MUST report 152/0. Commit message: `feat(R13): GREEN — eBenjaminiHochberg + PR-F2 evidence matrix`.

3. **HALT conditions for R13 (per Q-R13-SPEC.md § Per-file pseudocode Implementer note 3):**
   - **(a)** PR-F2 empirical FDR exceeds Wilson upper bound on EITHER cell (iid OR correlated). DIAGNOSTIC + escalate; do NOT silently OBSERVED-bind.
   - **(b)** Spec/reality conflict on an inherited surface (e.g., `engine/detectors/betting-e-process.ts:150` signature differs from REVIEWER-ANCHOR row). DIAGNOSTIC + escalate.
   - **(c)** q13 OBSERVED test count diverges from architect-predicted 14 (after verbatim Delta 2 copy). DIAGNOSTIC + escalate.

   R08 procedural-halt-discipline reinforcement applied: spec-vs-reality conflicts with an empirically determinable answer STILL require DIAGNOSTIC + escalate, NOT silent tactical resolution. Don't reproduce R08 MAJOR-1.

4. **Attestation block** (this file, R13 Attestation section below) populated at GREEN per R03 MINOR-4 reinforcement (8th consecutive application): OBSERVED test counts (not pre-stated predictions); OBSERVED grep counts; OBSERVED FDR values; OBSERVED wall-clock; OBSERVED full-regression count.

5. **MEMORIAL.md append**: implementer-discipline CONFIRMATIONs (or VIOLATIONs if any).

## Architect pre-predictions (verifiable at GREEN)

| Prediction | Confidence | Disposition |
|---|---|---|
| q13 OBSERVED test count = 14/0 | HIGH | Verbatim Delta 2 contains exactly 14 `test(...)` blocks |
| Full regression OBSERVED count = 152/0 (prior 138 + new 14) | HIGH | Prior baseline confirmed at HEAD `2a3c177` (q01a 3 + q01b 1 + q01c 5 + q02 6 + q03 13 + q04 11 + q05 13 + q06 13 + q07 23 + q10 11 + q11 18 + q12 16 + betting-class-dispatch 5 = 138) |
| PR-F2 iid empirical FDR OBSERVED in [0.005, 0.05] (well below Wilson bound 0.09624) | MEDIUM-HIGH | Theory says ≤ q=0.05; observed typically below |
| PR-F2 correlated empirical FDR OBSERVED in [0.005, 0.06] (still below Wilson bound 0.09624) | MEDIUM | Wang-Ramdas 2022 Theorem 4.1 guarantees ≤ q under arbitrary dependence between e-values |
| Both PR-F2 cells PASS Wilson bound | HIGH | If false: HALT condition (a) |
| q13 wall-clock runtime ≤ 6s | MEDIUM-HIGH | PR-F2 simulator estimate per spec § P3 Cost |
| Zero halt conditions for Implementer | HIGH | Verbatim-pseudocode spec leaves no architectural ambiguity |
| TDD ordering: RED → GREEN as two distinct commits | HIGH | 11th consecutive application of R02-R12 pattern |
| Reviewer findings: ≤ 1 MINOR / ≤ 5 OBS | MEDIUM | Based on R10-R12 trajectory; new external-source citations may elevate OBS count |
| q11 + q12 unchanged at GREEN | HIGH | Empirically verified by Architect at HEAD `2a3c177` |

## Active REINFORCED lines Implementer MUST apply (13 IMPL + 1 COMMON)

R13 Implementer applies all 13 IMPL reinforcements per CLAUDE-IMPLEMENTER.md; particularly:
- **Attestation-accuracy (R03 MINOR-4 + R05 MINOR-3 sub-variant):** OBSERVED, not predicted. Numeric AND narrative tactical-choice forms.
- **Halt-discipline (R08 MAJOR-1):** spec premise failures require DIAGNOSTIC regardless of resolution clarity; don't reproduce the R08 self-justifying-MEMORIAL anti-pattern.
- **TDD ordering (R02-R12 standing):** two-commit RED → GREEN; verifiable in `git log --oneline`.
- **Verbatim spec copy:** Delta 1 + Delta 2 are complete file contents; copy without modification.

## Halt conditions for R13 (per spec § Per-file pseudocode Implementer note 3 + this file Implementer responsibilities)

- **(a)** PR-F2 empirical FDR exceeds Wilson upper bound 0.09624 on EITHER iid OR correlated cell.
- **(b)** Spec/reality conflict on an inherited surface (REVIEWER-ANCHOR row drift).
- **(c)** q13 test count divergence from architect-predicted 14.
- **Spec/reality conflicts that have an empirically determinable answer STILL require DIAGNOSTIC** (R08 MAJOR-1 reinforcement; do not silently resolve).

## PR-F2 mandatory at R13 close (per SCOPING-MEMO-v0.3 + this round)

- **External-source verification:** Ren-Barber 2024 Algorithm 1 cited in spec REVIEWER-ANCHOR external-source table. ✓
- **Brainstorm ≥3 distinct e-BH implementations:** 4 candidates documented in audit sidecar § Brainstorm (A selected; B/C/Z rejected with rationale). ✓
- **MD-F2 documented:** fixed-time at R13; any-time deferred. Documented at 3 sites (Mechanism primitive 4 + R13-SAS-13 + Delta 1 file-header). ✓
- **Evidence matrix specification:** iid H₀ + correlated-drift H₀; theory-derived Wilson upper bound; NOT OBSERVED-binding. ✓
- **Architect grilling pass:** "would a future implementation FIX matching the architect's prediction FAIL the FDR-control tests?" Architect verified NO; tests are right-reasons-safe. ✓

## Coordination chore sequence (R14 final revision; same as R06-R12)

1. Run all binding commands at GREEN; record OBSERVED counts in this file's Attestation block.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R13): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R13): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R13 --tier full --phase IMPLEMENTER
```

## Attestation (Implementer fills at GREEN)

| Item | Predicted | OBSERVED at GREEN | Match |
|---|---|---|---|
| q13 test count | 14 / 0 | **14 / 0** | ✓ |
| Full regression count | 152 / 0 | **152 / 0** | ✓ |
| PR-F2 iid empirical FDR | ≤ 0.09624 (predicted ≈ 0.005-0.05) | **0.00500** | ✓ |
| PR-F2 correlated empirical FDR | ≤ 0.09624 (predicted ≈ 0.005-0.06) | **0.00500** | ✓ |
| q13 wall-clock | ≤ 6 s | **≈ 0.21 s** (duration_ms 206.797) | ✓ |
| TDD ordering | RED → GREEN two commits | RED `4110daa`; GREEN `d54912d` | ✓ |
| `grep -c "^export " engine/fleet/e-bh.ts` | 2 (interface + function) | **2** | ✓ |
| `git ls-files engine/fleet/e-bh.ts` at GREEN | 1 line | **1 line** (engine/fleet/e-bh.ts) | ✓ |
| Coordination chore step 7 (Reviewer-verifiable) | `git diff SHA-A HEAD -- engine/ test/ tools/ coordination/specs/` empty | _(Reviewer-side)_ | _(Reviewer verifies)_ |

SHA-A (chore step 4): `17994dc`
SHA-B (chore step 6): _(fill at chore step 6 close)_

## Operator gate items (preserved for morning triage)

- **PR #38 review/merge** (anchor; operator owns)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock update
- **R11 MINOR-1** `tick_post` variable-name nit
- **R11 OBS-1/-2** spec citation drift (low priority; closed at R12 first post-reinforcement application)
- **R12 OQ-1** per-shard vs fleet-level e-BH input architecture → **RESOLVED in R13 spec § Mechanism primitive 3 + audit sidecar D3 (β per-shard selected)**
- **R12 OQ-2** `fleetMergeFamilyAMixture` variant deferral
- **R12 OQ-3** R13+ auto-selection hint propagation
- **R12 OQ-4** Reviewer-facing strict-equality assertion form (architect picked: keep strict-equality)
- **R12 OBS-1** Family-C q_running_phi_sum snapshot under-clone (R13 does not re-exercise; PR-F2 uses Family A only)
- **R12 OBS-2/-3/-4** spec-documentation drift items (R13 not re-exercising)
- **SLICE 2 carry-forwards** — R14 bundle (mean_delta + PR-F5 + compiled-artifact loader)

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R11 closed (SLICE 3 first slice); R12 launched + closed perfect-zero-violations (SLICE 3 second slice). |
| 2026-05-17 | R13 launched under overnight authority: SLICE 4 e-BH FDR operator surface; PR-F2 pair-review mandatory at close. |
| 2026-05-17 | R13 Architect spec emitted (Q-R13-SPEC.md + Q-R13-SPEC-AUDIT.md); 14 ACs; 21 R13-SAS clauses; STATUS: READY → IMPLEMENTER. |
| 2026-05-17 | R13 Implementer complete. RED `4110daa` → GREEN `d54912d`. Full regression 152/0. PR-F2 iid FDR=0.005, correlated FDR=0.005 (both ≤ Wilson bound 0.09624). STATUS: READY → REVIEWER. |
| 2026-05-17 | R13 Reviewer complete. 0 CRITICAL / 0 MAJOR / 1 MINOR (Wilson-vs-Wald terminology) / 4 OBS; 14/14 ACs PASS; full regression 152/152 independently re-run; 21/21 R13-SAS fences clean; 11th consecutive Tessera Reviewer-side TDD attestation (R02-R13). Report: `coordination/reviews/REVIEWER-REPORT-R13.md`. STATUS: MERGE-READY → MEMORIAL-UPDATER. |
