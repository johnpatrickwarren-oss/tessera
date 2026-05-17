CURRENT-ROUND: R12
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R12 = Phase 1 SLICE 3 second slice: fleet-merged Family A + Family C detector surfaces** — consumption layer that turns R11's combine primitives (`combineProduct`, `combineAverage`) into actual fleet-level detector outputs from the inherited per-shard Family A + Family C e-process state.

R11 (just closed clean: 18/18 ACs, 122/0 tests, 0 CRITICAL streak extended to 10 rounds R02-R11) shipped the math primitives in `engine/fleet/combine.ts` + the PR-F1 evidence matrix validating the combination shape (PoE under iid: 0% FPR; PoE under correlated drift: 40% FPR demonstrating MD-F1; AoE compensating control: 0% FPR under both scenarios). R12 is the second-of-2-or-3 SLICE 3 rounds; it WIRES the primitives into the detector pipeline.

R12 SHIPS:
- Fleet-merged **Family A** detector surface — consume per-shard `FamilyAPerCell` (or its Phase-1-runtime analog; whatever holds the per-shard mixture-supermartingale e-process state at runtime), apply `combineProduct` or `combineAverage` from R11, produce a fleet-level e-process output.
- Fleet-merged **Family C** detector surface — same for Family C betting-e-process.
- **Caller-selection mechanism** for PoE vs AoE: per architect's brainstorm, either (a) caller chooses explicitly via configuration / call-site argument, OR (b) library auto-selects based on correlated-drift evidence (e.g., default to AoE as conservative; switch to PoE only when iid-assumption-evidence flag is set). Architect picks during R12 brainstorm with rejection rationale; **autonomous-mode default is (a) caller chooses** if architect's brainstorm doesn't surface a strong reason for (b) — defers the auto-selection question to a future round if needed.
- ACs covering: Family A fleet-merge wiring; Family C fleet-merge wiring; caller-selection mechanism; preservation of per-shard inputs (anti-scope check — per-shard state shape must be unchanged); fleet-level output shape matches `FleetEProcessState` (R11-shipped); empirical validation at N=10..100 synthetic shards under iid + correlated-drift H₀ (lighter version of R11's PR-F1 since the underlying math is already validated; this round's evidence is about the wiring, not the math).

R12 does NOT ship (explicit anti-scope):
- e-BH FDR operator surface (R13 = SLICE 4).
- Hedged combination primitive (deferred; current PoE + AoE pair-with-caller-selection is sufficient for SLICE 3).
- Modification to R11's `engine/fleet/combine.ts` internals (the primitives are shipped; R12 consumes them, doesn't modify).
- Modification to per-shard runtime (`engine/per-shard/runtime.ts`, `welford.ts`, `warm-start.ts`); per-shard state shape must be unchanged.
- Modification to inherited engine internals (R01-vendored detectors + family-type files).
- Real-cluster trace integration (Phase 1 boundary).
- SLICE 2 carry-forwards (R14).
- Any baseline-curation work (R06-R09 closed; R11's PoE/AoE primitives are independent of FCP-1).

## Architectural pre-dispositions

Per `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:
- **Q-J1 hybrid Ville + e-BH** — preserved (R12 builds the Ville-bound layer for detector surfaces; R13 builds e-BH).
- **Q-J2 20-sample warm-start / 60-sample strict-upgrade** — preserved (per-shard runtime shipped; R12 consumes per-shard e-process state regardless of tier).
- **Q-J3, Q-J4, Q-J5** — preserved.

R11-derived: combine primitives shipped at `engine/fleet/combine.ts` exporting `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`, `FleetMergeOutput`, `FleetEProcessState`. R12 consumes these as imports; does not re-export or modify them.

## Active REINFORCED lines architect MUST apply (14 ARCH + 13 IMPL + 1 COMMON)

R12 Architect must specifically apply (compounded across R02-R11):

- **Cross-section consistency pass** (R02; 8th consecutive standing application)
- **Type-declaration-site discipline** (R02) — open declaration sites for: `FamilyAPerCell` at `engine/types/families/a.ts`; `FamilyCPerCell` at `engine/types/families/c.ts`; the per-shard runtime e-process state structures; `FleetEProcessState` at `engine/types/fleet.ts`
- **Re-export-chain check** (R03)
- **Inherited-testimony empirical verification** (R08; anchor PR #38) — verify R11 surfaces empirically by running q11 tests at HEAD before referencing them
- **Correction-propagation pass** (R09; anchor PR #38) — if R12 corrects any prior-round spec premise, enumerate all sibling/downstream sections
- **OBSERVED-binding scope** (R07; anchor PR #38) — use theory-derived bounds for fleet-merge wiring ACs, not OBSERVED-binding (would be self-confirming for the wiring tests)
- **Fixture-sizing exhaustive propagation** (R07) — for each empirical-validation AC at N=10..100 shards, ensure fixture size matches the accumulation requirement
- **Component-inventory AC-range arithmetic cross-check** (R06)

R12 Implementer applies all 13 IMPLEMENTER reinforcements; particularly:
- **Procedural halt-discipline** (R08) — spec premise failures require DIAGNOSTIC regardless of resolution clarity
- **Attestation-accuracy** (R03) — OBSERVED, not predicted
- **MEMORIAL tactical-choice verification** (R05) — narrative claims about committed code must be verified against the file
- **Correction-propagation pass** (R09) — applies to Implementer too if any spec edit corrects a prior premise

## Halt conditions for R12

- **Per-shard surface modification:** if R12 needs to modify `engine/per-shard/*` or inherited engine internals to consume the per-shard e-process state, HALT — that's anti-scope. The per-shard surface should expose what R12 needs to read; if it doesn't, the surface needs to be extended FIRST as a discrete change (possibly its own SLICE 3 sub-round).
- **Combine-primitives modification:** if R12 needs to modify R11's `engine/fleet/combine.ts` primitives, HALT — those are shipped + Ville-bound-validated; modifying them puts R11's PR-F1 evidence at risk.
- **Caller-selection mechanism architectural decision:** if architect's brainstorm surfaces a strong reason for auto-selection (option b) over caller-explicit (option a), document the rationale in audit sidecar; option (a) is the autonomous-mode default to defer the auto-selection question.
- **Conditional-independence assumption silently absorbed:** R11 PR-F1 already demonstrated MD-F1 empirically; R12 spec MUST cite R11's evidence + explicitly document that the caller-selection mechanism is HOW the architecture handles the violation. Silent assumption that "PoE is always safe" is a CRITICAL.
- **OBSERVED-binding for wiring ACs:** any AC that binds wiring correctness must use theory-derived bounds (e.g., assert structural identity between fleet-merge output and `combineProduct(per-shard-inputs)` direct call), NOT OBSERVED-binding.
- **Q-J1 hybrid framework re-disposition:** out of scope for R12.

## Coordination chore sequence (R14 final revision; same as R06-R11)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R12): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R12): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R12 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R11 HEAD `dc486a7`:
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
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 122/0**

R12 expected at GREEN: prior 12 file counts unchanged + new q12 file (likely +10 to +15 ACs covering: Family A fleet-merge wiring; Family C fleet-merge wiring; caller-selection mechanism; per-shard input invariants; fleet-output shape; light empirical validation at N=10..100 synthetic shards). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R12 --tier full
```

`--tier full` per A2 (new architectural pattern — first detector-family-specific fleet integration) + A4 (novel data model — fleet-aggregate detector state shapes). No downshift justified.

## Operator gate items (preserved for morning triage)

- **PR #38 review/merge** (anchor; operator owns)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock update
- **R11 MINOR-1** `tick_post` variable-name nit at `engine/fleet/combine.ts:131`
- **R11 OBS-1/-2** spec citation drift at REVIEWER-ANCHOR + Mechanism primitive 7 (low priority)
- **SLICE 2 carry-forwards** — bundled into R14 (mean_delta + PR-F5 + compiled-artifact loader)

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | R10 closed; SLICE 2b runtime series complete; Phase 1 close-walk reconnaissance ran. |
| 2026-05-17 | Anchor PRs #34/#35/#37 merged; tessera forward-synced run-pipeline.sh; PR #38 opened. |
| 2026-05-17 | R11 closed clean: SLICE 3 first slice (hierarchical-e-value primitives + PR-F1 evidence matrix); MD-F1 empirically demonstrated; AoE compensating control validated. |
| 2026-05-17 | Operator authorized expanded overnight mode (no round budget; escalations log for morning triage; hard-blocker stop only). R12 launched as first round of pre-approved R12→R15 chain. |
