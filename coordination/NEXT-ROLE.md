CURRENT-ROUND: R11
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R11 = Phase 1 SLICE 3 begins: hierarchical e-value combination at fleet scale + fleet-merged Family A + Family C surfaces + iid bootstrap regression test extended to N=100 shards + PR-F1 pair-review evidence matrix.**

This is the Tessera-product headline. SLICE 1 vendored the inherited single-instance engine; SLICE 2 (R02-R05 + R10) built per-shard residual machinery; the baseline-curation track (R06-R09) added fleet-scale curation. **SLICE 3 is the first architectural surface that produces fleet-level statistical claims at runtime** — hierarchical e-value combination as the Ville-bound-preserving fleet-merge primitive that distinguishes Tessera from "N copies of a per-shard detector with broken FPR."

Per SCOPING-MEMO-v0.3 § 2.1 Extension 1 recommended approach (PICKED at v0.3 architect-emit): **(b) hierarchical e-value combination + (c) FDR-style operator surface.** R11 is (b); R12 will be (c) at SLICE 4. Literature anchor: Vovk-Wang 2021 (e-value calibration, combination, applications) + Wang-Ramdas 2024 (streaming e-process combination). The product-of-e-values and average-of-e-values constructions are the candidate primitives; conditional-independence assumption under correlated drift is the load-bearing risk (MD-F1).

R11 SHIPS:
- Fleet-merge primitive(s) for combining N per-shard e-values into a single fleet-level e-process. At least one of: product, average, weighted mixture, hedged combination. Architect picks via brainstorm rationale; reuses inherited betting-e-process machinery for the per-shard inputs.
- Fleet-merged Family A surface (mixture-supermartingale per-shard e-processes combined to fleet level).
- Fleet-merged Family C surface (betting-e-process per-shard e-values combined to fleet level).
- Iid bootstrap regression test extended to N=100 shards under H₀ (analogous to inherited `test/betting-e-process-class-dispatch.test.ts`). Verifies fleet-level Ville bound holds at synthetic N=100 cluster.
- PR-F1 evidence matrix specification: (i) iid H₀ at N=100 shards, (ii) correlated-drift H₀ at N=100 shards with explicit deployment-event-like correlation pattern. Both required. Conditional-independence assumption MUST be documented explicitly + compensating control under correlated drift named.

R11 does NOT ship (explicit anti-scope):
- e-BH FDR operator surface (deferred to R12 = SLICE 4 per v0.3 § 3).
- Real-cluster trace integration (Phase 1 boundary; synthetic-cluster substrate only per v0.3 § 4 R-E3 + A8).
- Phase 2 cross-shard correlation layer (Extension 3; deferred to Phase 2).
- Phase 2 cross-shard topology-aware attribution (HardwareTopologySource; deferred).
- Deployment-event freeze hook coupling (consumes Extension 3's event signal; Phase 2 SLICE 4).
- SLICE 2 carry-forwards (`mean_delta` computation, PR-F5 empirical storage profile, compiled-artifact JSON loader) — bundled into a SLICE 2 cleanup round after R11 lands.
- Any modification to baseline-curation tools (R06/R07/R08-amendment closed surfaces).

## Architectural pre-dispositions (preserved across rounds; load-bearing for R11)

Per `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:
- **Q-J1 hybrid Ville + e-BH** — preserved; R11 builds the Ville-bound layer; R12 builds the e-BH layer.
- **Q-J2 20-sample warm-start / 60-sample strict-upgrade** — preserved (per-shard runtime is shipped; SLICE 3 consumes the per-shard e-processes that warm-start machinery produces).
- **Q-J3 cascade at every layer** — preserved (SLICE 3 layer of the cascade).
- Q-J4, Q-J5 — preserved.

Per `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`: applies to calibration-time (R06+R07+R08-amendment); R11 is runtime; mostly orthogonal except Q-JC5 (R03 `residual_seed_hash` mechanism) which R11 must NOT modify.

## Active REINFORCED lines architect MUST apply (13 ARCH + 13 IMPL + 1 COMMON)

R11 Architect must specifically apply (compounded across R02-R10):

- **Cross-section consistency pass** (R02; 7th consecutive application standing) — every resolved-decision token consistent across sections.
- **Type-declaration-site discipline** (R02) — open the file where each external type is DECLARED. Particularly:
  - Inherited Family A mixture-supermartingale state at `engine/types/families/a.ts` (declaration site, NOT just `families.ts` index)
  - Inherited Family C betting-e-process state at `engine/types/families/c.ts`
  - `WelfordState` at `engine/per-shard/welford.ts:14` (consumed by SLICE 3's fleet-merge if combining per-shard mean+covariance)
  - `BaselineCurationDecision*` types in `engine/types/config.ts` (NOT modified by R11 but referenced for audit-trail wiring)
- **Re-export-chain check** (R03) — verify imports are direct vs re-exported.
- **Inherited-testimony empirical verification** (R08; landed in anchor PR #38) — for any factual claim about prior-round behavior (R03 warm-start state machine; R04 Welford accumulator; R05 composition function; R06 Stage 2a outputs; R07 FCP-1; R10 strict-tier emission), run the relevant command/fixture and document OBSERVED output. Silent inheritance is R08 MAJOR-2 class.
- **Correction-propagation pass** (R09; landed in anchor PR #38) — if R11 corrects any prior-round spec premise, enumerate all sibling/downstream sections.
- **OBSERVED-binding scope** (R07; landed in anchor PR #38) — must NOT use OBSERVED-binding for cross-shard fleet-merge ACs unless deviation is PRNG-drift-class. PR-F1 evidence matrix should use theory-derived bounds.
- **Fixture-sizing exhaustive propagation** (R07) — for any AC with sample-size-derived bound, propagate the reasoning to all sibling ACs.
- **Component-inventory AC-range arithmetic cross-check** (R06) — narrative vs pseudocode count must match.

R11 Implementer must specifically apply:
- **Procedural halt-discipline** (R08) — spec premise failures require DIAGNOSTIC regardless of resolution clarity.
- **Attestation-accuracy** (R03) — OBSERVED, not predicted.
- **MEMORIAL tactical-choice verification** (R05) — narrative claims about committed code must be verified against the file.

## PR-F1 mandatory at SLICE 3 close

Per SCOPING-MEMO-v0.3 § 2.1 + § 6: **PR-F1 (hierarchical e-value combination pair-review) is MANDATORY for R11 close.**

R11 spec MUST include:
1. **External-source verification:** Vovk-Wang 2021 §3-4 (e-value calibration + combination) + Wang-Ramdas 2024 (streaming/conditional construction). Architect cites specific sections; documents which result is being applied (e.g., product-of-e-values preserves Ville under conditional independence per Vovk-Wang Theorem N).
2. **Brainstorm ≥3 distinct combination primitives with rejection rationale.** Candidates per v0.3 § 2.1: product, average, weighted mixture, hedged. Each requires Ville-preservation analysis + conditional-independence-sensitivity analysis.
3. **Conditional-independence assumption documented explicitly.** Product-of-e-values preserves Ville iff per-shard e-processes are conditionally independent given cluster-state history; correlated drift (firmware push, model redeploy) violates this. Compensating control under correlated drift MUST be named (e.g., switch to average-of-e-values which is conditional-independence-robust per Vovk's analysis).
4. **Evidence matrix specification:** synthetic N=100 cluster with two H₀ scenarios — (i) iid H₀ (per-shard inputs independent), (ii) correlated-drift H₀ (per-shard inputs share a fleet-level mean shift). Fleet-FPR target: ≤ α_fleet (architect picks a value; default α_fleet=10⁻³ matches inherited per-detector α-budget). Both scenarios must show FPR within target.
5. **Architect grilling pass must answer:** "would a future implementation FIX matching the architect's prediction FAIL the H₁ power tests?" (anchor PR #38 OBSERVED-binding-scope check). H₁ power tests MUST use theory-derived bounds, not OBSERVED-binding.

If R11 spec ships without PR-F1 evidence matrix specification, that's a Reviewer-blocker (PARTIAL or FAIL on the corresponding AC).

## Halt conditions for R11

- **Conditional-independence assumption silently absorbed:** if Architect's brainstorm picks product-of-e-values without explicitly enumerating the conditional-independence violation under correlated drift, HALT — this is MD-F1's load-bearing concern.
- **Q-J1 hybrid framework re-disposition:** if brainstorm considers a non-Ville-bounded combination primitive, HALT — Q-J1 is preserved; alternative framework requires operator gate.
- **Per-shard machinery modification:** if R11 attempts to modify `engine/per-shard/runtime.ts`, `welford.ts`, or `warm-start.ts` internals, HALT — those are shipped surfaces (R03/R04/R05/R10) and R11 should consume their outputs, not modify them. Anti-scope violation if absorbed silently.
- **Inherited testimony about per-shard e-process behavior:** verify empirically by running pre-R11 tests + tracing the call path; silent inheritance is R08 MAJOR-2 class.
- **New OBSERVED-binding without right-reasons check:** R07 MAJOR-2 reinforcement (anchor PR #38).
- **Cross-section spec contradictions:** R02 cross-section consistency pass MUST run (standing discipline).

## Coordination chore sequence (R14 final revision; same as R06-R10)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write all coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R11): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R11): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R11 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R10 HEAD `b2740d2`:
- q10-per-shard-emission: 11/0 (R10 new)
- q07-fleet-correlated: 23/0
- q06-baseline-pre-pass: 13/0
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- betting-e-process smoke: 5/0
- **Total: 104/0**

R11 expected at GREEN: prior 11 file counts unchanged + new q11 file (likely +8 to +12 ACs covering: combination primitive correctness; Ville-preservation property; iid bootstrap regression at N=100; PR-F1 evidence matrix iid scenario; PR-F1 evidence matrix correlated-drift scenario; per-shard input consumption invariants). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R11 --tier full
```

`--tier full` per A1 (new external dependency — Vovk-Wang 2021 + Wang-Ramdas 2024 literature anchor; first novel-literature work since R07 FCP-1) + A2 (new architectural pattern — first runtime fleet-merge surface; calibration-time fleet-merge in R07 was a different surface class) + A4 (novel data model — fleet-aggregate e-process state) + A7 (first-time territory — Tessera has never built cross-shard runtime primitives). Multiple A-factors fire; tier rubric explicitly prohibits downshift.

## Methodology context

Anchor PR #38 (audit-sidecar template + 3 grilling steps from R07/R08/R09) **awaits John's review** (not yet merged). Tessera's discipline files already have the 3 reinforcements landed locally (R07/R08/R09 Memorial Updater entries); PR #38 propagates them to anchor canonical so other consumers benefit. R11 Architect operates under tessera-local discipline regardless of PR #38 merge state.

## Operator gate items preserved (NOT in R11 scope)

- **PR #38 review/merge** (anchor; operator owns)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision (architecturally-decisional; Phase 2 candidate per architect-pre-prediction)
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock update
- **SLICE 2 carry-forwards** (`mean_delta` computation, PR-F5 empirical storage profile, compiled-artifact JSON loader) — bundled into a SLICE 2 cleanup round after R11 lands

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | R10 closed; Phase 1 close-walk reconnaissance shows ~5-7 rounds remaining. |
| 2026-05-17 | Anchor PRs #34/#35/#37 merged; tessera forward-synced run-pipeline.sh; PR #38 opened (audit-sidecar template + 3 grilling steps). |
| 2026-05-17 | R11 launched: SLICE 3 begins — hierarchical e-value combination at fleet scale + PR-F1 pair-review. First runtime fleet-merge architectural surface; Tessera-product headline work begins. |
