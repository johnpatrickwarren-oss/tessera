CURRENT-ROUND: R13
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R13 = Phase 1 SLICE 4: e-BH FDR operator surface** — the operator-facing interface that consumes per-shard e-values and produces "K shards flagged; expected falsely-flagged-shard count ≤ q·K" with empirical FDR control. Per Q-J1 hybrid disposition: R11+R12 ship the per-shard any-time Ville guarantee via hierarchical e-value combination AS formal guarantee; R13 ships the FDR-style fleet-level operator interface.

Literature anchor: **Ren-Barber 2024** ("Derandomized novelty detection with FDR control via e-values"). Same lit-anchor / pair-review-novel-literature shape as R11's PR-F1 cycle but for FDR control instead of fleet-merge combination.

R12 closed clean (perfect zero-violation shutout: 0 CRITICAL/MAJOR/MINOR/4 OBS; 16/16 ACs; 138/138 regression; 11-round 0-CRITICAL streak). The fleet-merge primitives (R11) + fleet-merged detector surfaces (R12) are shipped + validated; R13 builds on top.

R13 SHIPS:
- **e-BH procedure implementation** — Ren-Barber 2024 Algorithm 1 (or equivalent). Architect cites the specific theorem/algorithm reference; brainstorm enumerates ≥3 candidate implementations of e-BH (e.g., standard fixed-α, randomized e-BH, BY-style correction).
- **Operator-facing API surface** — call signature likely `eBenjaminiHochberg(perShardEValues: number[], qLevel: number): number[]` returning the set of selected shard indices (architect's pick during brainstorm; signature documented).
- **Default qLevel parameter** — architect picks via brainstorm with rejection rationale (candidate defaults: 0.05, 0.10, configurable-required). Documented in spec.
- **PR-F2 evidence matrix** — synthetic N=100 shards; two H₀ scenarios: (i) iid H₀ (per-shard e-values independent), (ii) correlated-drift H₀ (per-shard e-values share a fleet-level mean shift). Both must show empirical FDR ≤ q (theory-derived; NOT OBSERVED-binding).
- ACs covering: e-BH algorithm correctness (citation-traceable to Ren-Barber 2024); FDR control under iid H₀ at N=100; FDR control under correlated-drift H₀ at N=100; per-shard input invariance (anti-scope check — wrappers read-only); operator-facing API ergonomics (input/output shapes).

R13 does NOT ship (explicit anti-scope):
- **Any-time FDR analog** (Wang-Ramdas-Vovk 2022 e-process selection under FDR) — SLICE 4 is bounded to fixed-time e-BH per v0.3 § 3 + Q-J1 hybrid framing; any-time FDR is a future-SLICE candidate.
- **Real-cluster trace integration** (Phase 1 boundary).
- **Modification to R11 combine primitives** (`engine/fleet/combine.ts`).
- **Modification to R12 fleet-merged detector surfaces** (`engine/fleet/detectors.ts`).
- **Modification to per-shard runtime** (`engine/per-shard/*`).
- **Modification to inherited engine internals**.
- **SLICE 2 carry-forwards** (R14 bundle).
- **Phase 2 work** (cross-shard correlation, hardware topology, deployment-event freeze hook).
- **Chaining fleet-merge OUTPUT into e-BH input** — per Q-J1's hybrid framing the two layers are PARALLEL (Ville guarantee at fleet-merge layer; FDR interface at e-BH layer), NOT serial. If brainstorm surfaces a strong reason to chain them, that's a HALT + DIAGNOSTIC condition (operator-gate scope expansion).

## Architectural question R13 brainstorm MUST resolve (R12 OQ-1)

R12 left this open as `R12 OQ-1`: does e-BH consume **fleet-level e-values** (R12 outputs) OR **per-shard e-values** (R12 inputs) as its source data?

Two candidate architectures:
- **(α) Fleet-level e-BH:** e-BH operates over the M (small) fleet-level e-process values (one per detector family × combination primitive). Discovery cardinality = a small fixed set of fleet-level claims. Doesn't match the "K shards flagged" operator interface.
- **(β) Per-shard e-BH:** e-BH operates over the N (large) per-shard e-values. Discovery cardinality = K shards (variable, FDR-controlled). **This matches the operator-facing target per v0.3 § 2.1 + Q-J1.**

Architect-pre-prediction (per operator scope direction): **(β)**. The fleet-merge layer (R11+R12) provides the formal Ville-bound guarantee; the e-BH layer (R13) provides the operator-facing FDR interface; they are PARALLEL views of the same per-shard inputs, not serialized into a chain.

If brainstorm surfaces a strong reason to deviate, HALT + DIAGNOSTIC; this question affects the architectural shape of the SLICE 4 deliverable.

## Architectural pre-dispositions

Per `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:
- **Q-J1 hybrid Ville + e-BH** — preserved; R13 is the e-BH layer.
- **Q-J2 20-sample warm-start / 60-sample strict-upgrade** — preserved.
- **Q-J3, Q-J4, Q-J5** — preserved.

R11/R12-derived: combine primitives + fleet-merged detector surfaces shipped; R13 may import for cross-reference but MUST NOT modify or depend on them in the e-BH critical path.

## Active REINFORCED lines architect MUST apply (14 ARCH + 13 IMPL + 1 COMMON)

R13 Architect applies all 14 ARCH reinforcements; particularly:

- **Cross-section consistency pass** (R02; 9th consecutive standing application).
- **Type-declaration-site discipline** (R02) — open declaration sites for any per-shard e-value type R13 consumes.
- **Inherited-testimony empirical verification** (R08; anchor PR #38) — verify R11/R12 surfaces empirically by running q11 + q12 tests at HEAD before referencing them.
- **Correction-propagation pass** (R09; anchor PR #38) — if R13 corrects any prior-round spec premise, enumerate all sibling/downstream sections.
- **OBSERVED-binding scope** (R07; anchor PR #38) — use theory-derived bounds for FDR-control ACs; OBSERVED-binding for FDR-control would be self-confirming.
- **Fixture-sizing exhaustive propagation** (R07).
- **R11 citation-accuracy via sed -n extraction** (R11-derived; standing as of R12).

R13 Implementer applies all 13 IMPL reinforcements; particularly:
- **Procedural halt-discipline** (R08) — spec premise failures require DIAGNOSTIC regardless of resolution clarity.
- **Attestation-accuracy** (R03) — OBSERVED, not predicted.
- **MEMORIAL tactical-choice verification** (R05).

## PR-F2 mandatory at SLICE 4 close

Per SCOPING-MEMO-v0.3 § 2.1 + § 6: **PR-F2 (e-BH FDR pair-review) is MANDATORY for R13 close.**

R13 spec MUST include:
1. **External-source verification:** Ren-Barber 2024 specific theorem/algorithm citation. Architect documents which result is being applied (e.g., e-BH preserves FDR ≤ q under independence + super-uniformity).
2. **Brainstorm ≥3 distinct e-BH implementations with rejection rationale.** Candidates per v0.3: standard fixed-α e-BH; randomized e-BH; BY-style correction. Each requires FDR-preservation analysis.
3. **MD-F2 documented:** any-time vs fixed-time FDR distinction. SLICE 4 ships fixed-time per v0.3. Any-time analog deferred. Document the deferral explicitly.
4. **Evidence matrix specification:** synthetic N=100 shards; iid H₀ + correlated-drift H₀. Empirical FDR ≤ q in both. Theory-derived bounds, NOT OBSERVED-binding.
5. **Architect grilling pass must answer:** "would a future implementation FIX matching the architect's prediction FAIL the FDR-control tests?" (anchor PR #38 OBSERVED-binding-scope check).

If R13 spec ships without PR-F2 evidence matrix specification, that's a Reviewer-blocker.

## Halt conditions for R13

- **Chaining fleet-merge into e-BH:** if brainstorm picks (α) fleet-level e-BH OR proposes a chained architecture, HALT + DIAGNOSTIC. Q-J1's two-layer hybrid is the operator-set architecture; deviation is scope expansion.
- **Any-time FDR analog scope expansion:** if brainstorm considers Wang-Ramdas-Vovk 2022 any-time analog, HALT — that's a future SLICE.
- **Modification to R11/R12 surfaces:** anti-scope; HALT if R13 attempts.
- **OBSERVED-binding for FDR-control ACs:** self-confirming; redesign against theory-derived bounds.
- **MD-F2 silent absorption:** must explicitly document any-time-vs-fixed-time tradeoff in spec.

## Coordination chore sequence (R14 final revision; same as R06-R12)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R13): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R13): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R13 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R12 HEAD `d4bc0a2`:
- test/q01-vendoring-coverage.test.js: 3/0
- test/q01-no-at-pin-deltas.test.js: 1/0
- test/q01-schema-additions.test.js: 5/0
- test/q02-schema-extension.test.js: 6/0
- test/q03-warm-start-runtime.test.js: 13/0
- test/q04-welford-stats.test.js: 11/0
- test/q05-per-shard-runtime.test.js: 13/0
- test/q06-baseline-pre-pass.test.js: 13/0
- test/q07-fleet-correlated.test.js: 23/0
- test/q10-per-shard-emission.test.js: 11/0
- test/q11-hierarchical-e-value-combination.test.js: 18/0
- test/q12-fleet-merged-detector-surfaces.test.js: 16/0
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 138/0**

R13 expected at GREEN: prior 13 file counts unchanged + new q13 file (likely +10 to +15 ACs covering: e-BH algorithm correctness; FDR control under iid H₀ + correlated-drift H₀; operator-facing API; per-shard input invariance). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R13 --tier full
```

`--tier full` per A1 (new external lit — Ren-Barber 2024) + A2 (new architectural pattern — first operator-facing FDR surface) + A5 (NFR ties — operator-facing FDR-q parameter is a stated guarantee).

## Operator gate items (preserved for morning triage)

- **PR #38 review/merge** (anchor; operator owns)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock update
- **R11 MINOR-1** `tick_post` variable-name nit
- **R11 OBS-1/-2** spec citation drift (low priority)
- **R12 OQ-2** `fleetMergeFamilyAMixture` variant deferral
- **R12 OQ-3** R13+ auto-selection hint propagation
- **R12 OQ-4** Reviewer-facing strict-equality assertion form (architect picked: keep strict-equality)
- **SLICE 2 carry-forwards** — R14 bundle (mean_delta + PR-F5 + compiled-artifact loader)

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R11 closed (SLICE 3 first slice); R12 launched + closed perfect-zero-violations (SLICE 3 second slice). |
| 2026-05-17 | R13 launched under overnight authority: SLICE 4 e-BH FDR operator surface; PR-F2 pair-review mandatory at close. |
