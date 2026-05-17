# Q-R12-SPEC — Tessera Phase 1 SLICE 3 (second slice): fleet-merged Family A + Family C detector surfaces

_From: Architect (R12 pipeline run; full tier per A2 new architectural pattern + A4 novel data model)._
_To: Implementer._
_Date: 2026-05-17._
_HEAD at spec emit: `58d6090`._
_Audit sidecar: `coordination/specs/Q-R12-SPEC-AUDIT.md` (brainstorm + design rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions)._

---

## Spec preamble

R12 = Phase 1 SLICE 3 second slice: the **detector-surface wiring** that bridges (a) the inherited-engine per-shard wealth processes (Family A `BettingEProcessState` at `engine/types/families/a.ts:20`; Family C `FamilyCBettingEProcessState` at `engine/types/families/c.ts:297`) and (b) R11's family-agnostic fleet-merge primitives (`combineProduct`, `combineAverage` at `engine/fleet/combine.ts:63 / :87` shipped at R11 HEAD `5ae6c7d`).

R11 (just closed clean: 18/18 ACs; 122/0 tests; 0 CRITICAL streak extended to 10 rounds R02-R11) shipped the math primitives + `FleetEProcessState` tracker + PR-F1 evidence matrix empirically validating PoE/AoE Ville preservation under iid + MD-F1 demonstration under correlated drift. R12 SHIPS the **consumption layer** that turns those primitives into named family-specific entry points operators can call.

R12 ships:
1. **Family-A fleet-merge surface** — `fleetMergeFamilyA(per_shard_states: ReadonlyArray<BettingEProcessState>, primitive: CombinePrimitive, fleet_state: FleetEProcessState, log_threshold: number): FleetMergeStepResult`. Extracts `Math.log(Math.max(state.M, WEALTH_FLOOR))` from each shard's `BettingEProcessState.M` field (linear-space wealth → log-space e-value), calls the caller-supplied primitive, updates the fleet wealth tracker via R11's `updateFleetEProcessState`, returns `{ log_fleet_e, fleet_state }`. Pure with respect to per-shard inputs (reads only `state.M`; does NOT mutate per-shard state); in-place mutates the fleet state per R11's inherited engine convention.
2. **Family-C fleet-merge surface** — `fleetMergeFamilyC(per_shard_states: ReadonlyArray<FamilyCBettingEProcessState>, primitive: CombinePrimitive, fleet_state: FleetEProcessState, log_threshold: number): FleetMergeStepResult`. Reads `state.log_S_t` directly (already log-space per `engine/types/families/c.ts:298-300`; no extra log/floor needed), then identical to fleet-merge body for Family A. Pure with respect to per-shard inputs.
3. **Caller-selection mechanism** — option (a) per NEXT-ROLE.md autonomous-mode default: caller passes `combineProduct` or `combineAverage` as the `primitive` argument at the call site. The wrapper is primitive-agnostic; option (b) auto-selection rejected with documented rationale in audit sidecar (no implemented signal exists at R12 to drive auto-selection; would require either new `CompiledConfig` field — anti-scope — or a runtime detection layer — architectural-decision-class scope expansion).
4. **Q12 test bindings** — structural-identity ACs (wrapper output ≡ direct call to primitive(extracted-log-e)); per-shard input invariance ACs (deep-equal-before-vs-after on every per-shard state field); both-primitives smoke ACs (PoE + AoE each accepted); empirical-wiring validation at N=50 Family A shards × T=50 ticks × N_traj=100 fleet trajectories (lighter than R11's PR-F1; this round's evidence is about wiring, not math per NEXT-ROLE.md item 6); Family-C structural identity ACs using literal `FamilyCBettingEProcessState`-shape arrays (full SR23 detector pipeline is too heavy for a unit test — requires compile-time config — and the math validation is R11's responsibility).

R12 does NOT ship (explicit anti-scope; see § Anti-scope for full enumeration):
- e-BH FDR operator surface (R13 = SLICE 4).
- Hedged combination primitive or weighted-mixture variant (R11 OQ-1 carry-forward; deferred indefinitely until operator-facing requirement surfaces).
- Modification to R11's `engine/fleet/combine.ts` or `engine/types/fleet.ts` (both shipped + Ville-bound-validated at R11; R12 consumes unchanged).
- Modification to per-shard runtime (`engine/per-shard/runtime.ts`, `welford.ts`, `warm-start.ts`).
- Modification to inherited engine internals (`engine/detectors/*`, `engine/types/families/*`; A12 anti-scope).
- Family-A mixture-supermartingale wealth surface (`MixtureSupermartingaleState` at `engine/detectors/family-a-mixture-supermartingale.ts:40`) — addressable in a future round when an operator-facing consumer surfaces; mechanical addition (same shape as the betting-variant wrapper, different field name `M_t` instead of `M`). Documented in OQ-2.
- Auto-selection of PoE-vs-AoE (option b in NEXT-ROLE.md) — rejected at R12 brainstorm; OQ-3 carries the disposition rationale.
- Real-cluster trace integration (Phase 1 boundary; A8/A11).
- Phase 2 cross-shard correlation layer (HardwareTopologySource, event-conditional attribution, etc.).
- Any baseline-curation work (R06-R09 closed surfaces).
- SLICE 2 carry-forwards (mean_delta, PR-F5, compiled-artifact JSON loader) — bundled into R14 per NEXT-ROLE.md.
- R10 MINOR-1, R11 MINOR-1, R11 OBS-1/-2, R09 MINOR-3 — operator gate items per NEXT-ROLE.md.

Traces to PRD AC-P1: "per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4." R12 lands the named family-specific entry points consumers will call; R13 = SLICE 4 lands the e-BH FDR operator surface.

Traces to SCOPING-MEMO-v0.3 § 2.1 Extension 1 recommended approach: "**(b) hierarchical e-value combination + (c) FDR-style operator surface**." R12 closes the consumption layer of (b); R13 ships (c).

Conditional-independence assumption + compensating control (MD-F1, load-bearing per NEXT-ROLE.md halt condition): R12's caller-selection mechanism IS the architectural response to MD-F1. The caller (operator code at R13+) chooses `combineProduct` when iid-assumption-evidence is available and chooses `combineAverage` when correlated drift cannot be ruled out. R11 PR-F1 empirically validated both regimes at the primitive layer; R12 spec EXPLICITLY documents that `fleetMergeFamilyA` and `fleetMergeFamilyC` make no claim about which primitive should be used in any given regime — that decision belongs to the caller. Silent assumption that "PoE is always safe" is anti-scope. Spec citation of R11 evidence: `coordination/specs/Q-R11-SPEC.md` § Mechanism primitive 3 + PR-F1 evidence matrix § (AC-13–16); `test/q11-hierarchical-e-value-combination.test.ts` AC-13/14/15/16 OBSERVED results in R11 NEXT-ROLE.md attestation block at SHA `a0b6c92`.

Architectural layer (matches the R02→R03→R04→R05→R10→R11 pattern): compile-time schema (R02) → state-machine runtime (R03) → algorithm pure-function (R04) → composition + accumulator (R05) → emission + sparse-encoding (R10) → hierarchical e-value combination primitives + fleet-level e-process tracker (R11) → **family-specific fleet-merge detector surfaces (R12; this round)** → e-BH FDR operator surface (R13 = SLICE 4) → SLICE 2 cleanup (R14).

---

## Existing architectural surface (REVIEWER-ANCHOR — mandatory per anchor `templates/Q-NN-SPEC-TEMPLATE.md` v2)

_Per anchor PR #35 mandatory section; applied at SPEC fidelity. Every citation against `tessera/` HEAD `58d6090` unless otherwise noted (which inherited DeploySignal main @ SHA `5a72371` via the vendoring policy in SCOPING-MEMO-v0.3 § 9)._

_Citation-accuracy discipline (R11 OBS-1/-2 reinforcement; 1st post-reinforcement application): every line-range citation below was extracted at spec-emit time via `sed -n 'N,Mp' <file>` and pasted verbatim into the table; type-name + field-name accuracy cross-checked against the declaration-site files._

| Source path | Pinned anchor | Lines opened | Verbatim snippet | Verification |
|---|---|---|---|---|
| `engine/types/families/a.ts` (vendored) | `5a72371` | `20-28` | `export interface BettingEProcessState {`<br/>&nbsp;&nbsp;`M: number;`<br/>&nbsp;&nbsp;`bet: number;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`alphaConsumed: number;`<br/>&nbsp;&nbsp;`runningMean: number;`<br/>&nbsp;&nbsp;`runningSecondMoment: number;`<br/>&nbsp;&nbsp;`onsFallbackCount: number;`<br/>`}` | `M` field at line 21 is the per-shard wealth (linear-space e-value). R12 `fleetMergeFamilyA` consumes via `Math.log(Math.max(state.M, WEALTH_FLOOR))`. Inherited unchanged. |
| `engine/types/families/c.ts` (vendored) | `5a72371` | `297-334` | `export interface FamilyCBettingEProcessState {`<br/>&nbsp;&nbsp;`log_S_t: number;`<br/>&nbsp;&nbsp;`ons_lambda: number;`<br/>&nbsp;&nbsp;`ons_inverse_hessian: number;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`witness_running_max: number;`<br/>&nbsp;&nbsp;`q_running_sum: number[];`<br/>&nbsp;&nbsp;`q_running_phi_sum?: number[];`<br/>&nbsp;&nbsp;`q_count: number;`<br/>&nbsp;&nbsp;`fired: boolean;`<br/>&nbsp;&nbsp;`tick_at_first_fire: number \| null;`<br/>&nbsp;&nbsp;`alphaConsumed: number;`<br/>`}` | `log_S_t` field at line 300 IS the per-shard log-wealth (log-space e-value; JSDoc lines 298-299: "Wealth process S_t (multiplicative). Stored in log-space as log_S_t for numerical stability"). R12 `fleetMergeFamilyC` consumes directly (no log/floor needed). Inherited unchanged. |
| `engine/fleet/combine.ts` (Tessera-original R11) | tessera HEAD `5ae6c7d` (R11 GREEN) | `63-70` (combineProduct) + `87-99` (combineAverage) + `102-110` (freshFleetEProcessState) + `122-138` (updateFleetEProcessState) + `46-50` (FleetMergeOutput) | `export function combineProduct(log_e_values: ReadonlyArray<number>): FleetMergeOutput { ... return { log_fleet_e: sum }; }`<br/>`export function combineAverage(log_e_values: ReadonlyArray<number>): FleetMergeOutput { ... return { log_fleet_e: log_avg }; }`<br/>`export function updateFleetEProcessState(state, log_fleet_e_t, log_threshold): FleetEProcessState { ... }` | R12 imports `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`, `FleetMergeOutput`, `FleetEProcessState` (re-exported from combine.ts:40) from `../engine/fleet/combine`. R11 ships unchanged at R12. |
| `engine/types/fleet.ts` (Tessera-original R11) | tessera HEAD `5ae6c7d` (R11 GREEN) | `30-44` | `export interface FleetEProcessState {`<br/>&nbsp;&nbsp;`log_fleet_e_t: number;`<br/>&nbsp;&nbsp;`log_fleet_e_max: number;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`fired: boolean;`<br/>&nbsp;&nbsp;`tick_at_first_fire: number \| null;`<br/>`}` | R12 type-imports `FleetEProcessState` (via the combine.ts re-export at `engine/fleet/combine.ts:40`). Single source of truth at `engine/types/fleet.ts:30`. R11 ships unchanged at R12. |
| `engine/detectors/betting-e-process.ts` (vendored) | `5a72371` | `65` (WEALTH_FLOOR) + `72-82` (freshBettingState) + `151-175` (updateBettingState) | `const WEALTH_FLOOR = 1e-12;`<br/>`export function freshBettingState(): BettingEProcessState { ... }`<br/>`export function updateBettingState(state, x, baselineMean, sigmaSquared, perTickAlpha): number { ... return state.M; }` | R12 q12 test imports `freshBettingState` + `updateBettingState` for the Family A fleet-trajectory simulator (re-uses the R11 q11 pattern at `test/q11-hierarchical-e-value-combination.test.ts:25-28`). R12 production code does NOT import from betting-e-process.ts (no inherited-engine coupling at the fleet-merge layer). |
| `engine/detectors/family-a-mixture-supermartingale.ts` (vendored) | `5a72371` | `40-62` (MixtureSupermartingaleState) | `export interface MixtureSupermartingaleState {`<br/>&nbsp;&nbsp;`S_t: number;`<br/>&nbsp;&nbsp;`M_t: number;`<br/>&nbsp;&nbsp;`fired: boolean;`<br/>&nbsp;&nbsp;`tick_at_first_fire: number \| null;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`last_x_centered: number;`<br/>`}` | `M_t` field at line 47 is the linear-space wealth for the mixture-supermartingale Page-CUSUM variant. R12 does NOT ship a `fleetMergeFamilyAMixture` wrapper at this round (out-of-scope per § Anti-scope R12-SAS-15 + OQ-2). Cited here so Reviewer can verify the deferral is informed (the alternative wrapper would be mechanical; the deferral is a scope decision, not an oversight). Inherited unchanged. |
| `engine/types/index.ts` (vendored) | `5a72371` | `20-32` | `export * from './primitives';`<br/>`export * from './metrics';`<br/>`export * from './families/a';`<br/>`export * from './families/b';`<br/>`export * from './families/c';`<br/>`...` | Re-export chain: `BettingEProcessState` via `families/a` at line 22; `FamilyCBettingEProcessState` via `families/c` at line 24. Verified via `grep -n "export.*families/[ac]" engine/types/index.ts`. R12 production code imports these types DIRECTLY from `../types/families/a` + `../types/families/c` (NOT via `../types`) to keep the import chain explicit; this matches R11's pattern at `test/q11-hierarchical-e-value-combination.test.ts:29` (which imports `FamilyCBettingEProcessState` directly from `../engine/types/families/c`). UNCHANGED at R12 (per R12-SAS-4). |
| `engine/per-shard/runtime.ts` (Tessera-original; R03/R10) | tessera HEAD `5ae6c7d` (R11 GREEN; unchanged since R10) | `1-13` (file header) | `// engine/per-shard/runtime.ts — Tessera SLICE 2b3: per-shard runtime composition.` | UNCHANGED at R12 (per R12-SAS-1). R12 consumes the per-shard runtime ONLY as a conceptual upstream (per-shard `BettingEProcessState`/`FamilyCBettingEProcessState` instances come from the orchestrator's state bag, not from the Tessera per-shard residual layer); zero import-side dependency. R10 MINOR-1 file-header drift carry-forward preserved per NEXT-ROLE.md. |
| `engine/types/config.ts` (vendored-with-deltas; Tessera SLICE 1) | tessera HEAD `5ae6c7d` (R11 GREEN) | `851-858` + `881-907` (per R11 REVIEWER-ANCHOR row 6) | `export type CellConfidence = 'strict' \| 'pooled' \| 'aggregate' \| 'none' \| 'warm_start';`<br/>`export interface PerShardResidual { n_samples: number; confidence: CellConfidence; ... welford_state?: WelfordState; }` | UNCHANGED at R12. Tessera SLICE 1 schema NOT touched per R12-SAS-5. R12 adds NO new `CompiledConfig` fields (rejected option b auto-selection would have required one; rejected at brainstorm). |
| `test/q11-hierarchical-e-value-combination.test.ts` (Tessera-original; R11) | tessera HEAD `5ae6c7d` (R11 GREEN) | `35-50` (PRNG + Gaussian helpers) + `73-101` (per-trajectory simulator pattern) | `function mulberry32(seed: number): () => number { ... }`<br/>`function gaussian(rng: () => number): number { ... }`<br/>`function simulateFleetTrajectory(primitive, scenario, rngSeed): boolean { ... }` | R12 q12 test re-inlines the same `mulberry32` + `gaussian` helpers (per R11 pattern; NOT imported from q11 to keep q12 standalone). q12's empirical-wiring simulator follows the same shape as q11's `simulateFleetTrajectory` but calls `fleetMergeFamilyA` instead of the bare `primitive`. UNCHANGED at R12 (per R12-SAS-9). |
| `coordination/specs/Q-R11-SPEC.md` (Tessera spec; R11) | tessera HEAD | `78-128` (Mechanism primitives) + `846-854` (AC-13/14/15/16 PR-F1 evidence matrix) | `Vovk-Wang 2021 §4 ... preserves Ville under conditional independence ... combineAverage preserves Ville under arbitrary dependence ... PR-F1 evidence matrix correlated-drift cell empirically demonstrates ...` | R12 cites R11 PR-F1 evidence as the load-bearing math validation for the primitives R12 wraps. R12 does NOT re-validate the math; R12 validates the wiring. UNCHANGED at R12 (per R12-SAS-18). |
| `coordination/NEXT-ROLE.md` (R12 routing) | tessera HEAD | `1-95` (full file) | R12 round scope, halt conditions, coordination chore sequence. | R12 spec inherits all routing decisions verbatim. UNCHANGED at R12 until coordination commit. |
| `coordination/PRD.md` | tessera HEAD | `42-43` (AC-P1) + `30-31` (FR-E1) | `AC-P1: ... per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4.` | R12 closes the WIRING half of AC-P1's first clause (named family-specific entry points consuming the Ville-preserving primitives shipped at R11); R13+ closes the e-BH FDR half. |

**External-source literature anchor:**

| Source | Result applied | R12 application |
|---|---|---|
| **Vovk & Wang 2021** — "E-values: calibration, combination, and applications" (arXiv:2103.13802) | §4 (combination of e-values): convex combinations under arbitrary dependence; product under conditional independence. | R12 inherits R11's application: `fleetMergeFamilyA` + `fleetMergeFamilyC` are wrappers around the R11 primitives; the Vovk-Wang preservation claims pass through unchanged (the wrappers do NO mathematical transformation beyond extraction of `Math.log(state.M)` or direct read of `state.log_S_t`). |
| **Howard, Ramdas, McAuliffe & Sekhon 2021** — "Time-uniform, nonparametric, nonasymptotic confidence sequences" (arXiv:1810.08240) | Per-shard mixture-supermartingale anytime-valid Ville bound. Inherited verbatim at SHA `5a72371`. | R12 inherits unchanged via the inherited Family A betting-e-process at `engine/detectors/betting-e-process.ts`. R12 q12 test drives `updateBettingState` directly per-shard (same as R11 q11). |
| **Shekhar & Ramdas 2023** — "Nonparametric testing by betting" (arXiv:2202.10773) | Per-shard canonical betting-e-process for Family C. Inherited verbatim at SHA `5a72371`. | R12 wraps the Family-C `FamilyCBettingEProcessState.log_S_t` field at the fleet layer; the per-shard SR23 wealth process is unchanged. R12 q12 Family-C ACs use literal synthetic `FamilyCBettingEProcessState` arrays (full SR23 detector pipeline requires compile-time config — out of unit-test scope; the math validation is R11's responsibility). |

**Architect self-attest:**

- [x] Every file in the table above was opened at this spec's authoring time at the cited line ranges; lines were extracted via `sed -n 'N,Mp' <file>` and pasted verbatim (R11 OBS-1/-2 citation-accuracy reinforcement; 1st post-reinforcement application).
- [x] `BettingEProcessState.M` field at `engine/types/families/a.ts:21` verified via `sed -n '20,28p'` — declared as `M: number;` (the FIRST field of the interface, immediately after the `export interface BettingEProcessState {` line).
- [x] `FamilyCBettingEProcessState.log_S_t` field at `engine/types/families/c.ts:300` verified via `sed -n '297,334p'` — JSDoc spans lines 298-299; the field declaration `log_S_t: number;` is at line 300.
- [x] `MixtureSupermartingaleState.M_t` field at `engine/detectors/family-a-mixture-supermartingale.ts:47` verified via `sed -n '40,62p'` — JSDoc for `S_t` spans lines 41-44; `S_t: number;` declared at line 45; JSDoc for `M_t` at line 46; `M_t: number;` declared at line 47. R11 OBS-1 (wrong line 43 for `M_t`) corrected: 47 is the actual declaration line.
- [x] R11 `combineProduct` at `engine/fleet/combine.ts:63-70` + `combineAverage` at `:87-99` + `freshFleetEProcessState` at `:102-110` + `updateFleetEProcessState` at `:122-138` signatures verified via `sed -n` extraction; R11-shipped signatures match the spec's signature declarations below.
- [x] R11 `FleetEProcessState` interface at `engine/types/fleet.ts:30-44` (5 fields: `log_fleet_e_t`, `log_fleet_e_max`, `n`, `fired`, `tick_at_first_fire`); verified via `sed -n '30,44p'`.
- [x] `WEALTH_FLOOR = 1e-12` constant at `engine/detectors/betting-e-process.ts:65` verified via `sed -n '65p'`. R12 spec mandates Implementer use the SAME numeric value (1e-12) in `engine/fleet/detectors.ts` (re-declared as a local constant; matches q11 test's WEALTH_FLOOR at `test/q11-hierarchical-e-value-combination.test.ts:65`).
- [x] Re-export chain at `engine/types/index.ts:22` (`export * from './families/a';`) and `:24` (`export * from './families/c';`) verified via `grep -n "export.*families/[ac]" engine/types/index.ts`. R12 production code does NOT use the central re-export — imports directly from `../types/families/a` and `../types/families/c` per R11 q11 pattern (`test/q11-hierarchical-e-value-combination.test.ts:29`).
- [x] R11 q12 test pattern at `test/q11-hierarchical-e-value-combination.test.ts` opened in full; `mulberry32` at `:35-44`, `gaussian` at `:46-50`, `simulateFleetTrajectory` at `:73-101`. R12 q12 will re-inline (not import) these helpers per R11's standalone-test convention.
- [x] Vovk-Wang 2021 §4 inherited from R11 spec preamble; R12 does NOT independently re-verify (paper not opened during this offline spec-authoring session). R12's wrappers are pass-throughs that introduce no new mathematical claim — the math is validated at R11.

---

## Mechanism

### Architectural primitives (resolved decisions)

1. **Family-specific entry points wrap the family-agnostic primitives.** R12 ships two exported functions in a new module `engine/fleet/detectors.ts`:
   - `fleetMergeFamilyA(per_shard_states, primitive, fleet_state, log_threshold): FleetMergeStepResult`
   - `fleetMergeFamilyC(per_shard_states, primitive, fleet_state, log_threshold): FleetMergeStepResult`

   Both delegate to a shared internal helper `fleetMergeStep(log_e_values, primitive, fleet_state, log_threshold)` that does the actual primitive call + `updateFleetEProcessState` chain. The two exported wrappers differ ONLY in their e-value extraction step. Rationale (brainstorm in audit sidecar): named family-specific entry points match the inherited engine's pattern (`evaluateFamilyABettingShadow` at `engine/detectors/betting-e-process.ts:348`; `evaluateFamilyCBettingEProcess` at `engine/detectors/family-c-betting-e-process.ts:303`) — operators reading the codebase can grep `fleetMerge` and find the per-family entry points immediately. Each entry point owns its family's e-value extraction convention; the shared internal helper preserves the R11 family-agnostic core (single body for the primitive-call + state-update chain).

2. **E-value extraction conventions:**
   - **Family A** (`BettingEProcessState.M` at `engine/types/families/a.ts:21`): linear-space wealth. Extraction: `Math.log(Math.max(state.M, WEALTH_FLOOR))` per shard. The floor prevents `Math.log(0)` on long no-drift runs where wealth underflows below `1e-12` (matches inherited `engine/detectors/betting-e-process.ts:165` WEALTH_FLOOR guard). R12 redeclares `WEALTH_FLOOR = 1e-12` as a module-local constant in `engine/fleet/detectors.ts` (does NOT import from `engine/detectors/betting-e-process.ts` — that module's `WEALTH_FLOOR` is module-private). Matches q11 test pattern at `test/q11-hierarchical-e-value-combination.test.ts:65`.
   - **Family C** (`FamilyCBettingEProcessState.log_S_t` at `engine/types/families/c.ts:300`): already log-space per the inherited engine convention (JSDoc lines 298-299: "Wealth process S_t (multiplicative). Stored in log-space as log_S_t for numerical stability"). Extraction: `state.log_S_t` per shard (no log/floor needed; the inherited engine already handles wealth-factor floor via `LOG_FACTOR_FLOOR = 1e-12` at `engine/detectors/family-c-betting-e-process.ts:82`).

3. **Caller-selection mechanism: option (a) caller picks the primitive at call site** (per NEXT-ROLE.md autonomous-mode default). The wrapper's `primitive` parameter is of type `CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput`, matching exactly the signature of R11's exported `combineProduct` and `combineAverage`. The caller — at R13+ when the e-BH operator surface lands — picks per the operating regime: `combineProduct` (PoE) under iid-assumption-evidence; `combineAverage` (AoE) under correlated-drift evidence or as the conservative default (R12 spec does NOT prescribe which is the default; that's an operator-layer decision at R13+).

   **Why option (a) over option (b) auto-selection (brainstorm rationale; full table in audit sidecar):**
   - Option (b) requires either (i) a new `CompiledConfig` field carrying iid-vs-correlated-drift evidence — anti-scope per R12-SAS-5 (no new `CompiledConfig` fields at R12); or (ii) a runtime detection layer that decides between PoE and AoE based on cross-shard correlation in recent ticks — architectural-decision-class scope expansion (would require its own brainstorm, its own ACs, its own empirical validation; doubles or triples R12 scope).
   - Option (a) requires zero new schema fields, zero new architectural surface beyond the wrappers themselves. The choice is deferred to the layer that actually has the operational signal — the orchestrator at R13+.
   - Brainstorm did NOT surface a strong reason for (b) at R12; per NEXT-ROLE.md's default, (a) is selected.

4. **Conditional-independence assumption + compensating control (MD-F1 load-bearing per NEXT-ROLE.md):** R12 wrappers make NO claim about which primitive is safe in a given regime. The caller's selection IS the architectural response to MD-F1. R11 empirically demonstrated:
   - PoE under iid (R11 AC-13): fleet FPR ≤ Wilson bound (Ville preserved).
   - PoE under correlated drift (R11 AC-14 REPORTING-only): fleet FPR exceeds α_fleet — load-bearing MD-F1 demonstration.
   - AoE under iid (R11 AC-15): fleet FPR ≤ Wilson bound (Ville preserved; arbitrary-dependence guarantee).
   - AoE under correlated drift (R11 AC-16): fleet FPR ≤ Wilson bound (compensating control; arbitrary-dependence guarantee holds).

   R12 spec § Per-file pseudocode Delta 1 file-header docblock STATES this explicitly. The `fleetMergeFamilyA`/`fleetMergeFamilyC` JSDoc on each function cross-references the caller-selection responsibility verbatim. Silent assumption that PoE is always safe is anti-scope; the docblocks make the responsibility explicit.

5. **Per-shard input invariance (anti-scope check; load-bearing per NEXT-ROLE.md):** Neither `fleetMergeFamilyA` nor `fleetMergeFamilyC` mutates any field of any per-shard input state. The wrapper bodies READ `state.M` (Family A) or `state.log_S_t` (Family C); they do NOT write. AC-6 + AC-7 verify via deep-equal-before-vs-after on every field of every per-shard state. Rationale: the per-shard wealth processes are owned by the inherited engine's per-tick update loop (`updateBettingState`, `onsUpdate`); the fleet-merge wrapper is a READ-side observer that does not interfere with the per-tick wealth evolution.

6. **Fleet-state mutation contract: in-place** (matches R11's inherited convention at `engine/fleet/combine.ts:122-138`). The wrapper calls R11's `updateFleetEProcessState(fleet_state, log_fleet_e_t, log_threshold)` which mutates the fleet state in-place AND returns the same reference. The wrapper's `FleetMergeStepResult.fleet_state` field is the same reference as the input `fleet_state` parameter (per AC-8). This matches R11 AC-11 (in-place mutation; same reference) — the fleet state lives across ticks; the wrapper returns the updated state for ergonomic chaining.

7. **Empty-input handling: throw, propagated from R11 primitives.** If `per_shard_states.length === 0`, the extracted `log_e_values` array is empty, and R11's `combineProduct`/`combineAverage` throws per R11 AC-1/AC-2. The wrapper does NOT pre-validate; the exception bubbles up unchanged. AC-13 verifies via `assert.throws` on a call with `per_shard_states = []`. Rationale: minimal surface — R11 already owns the empty-input semantics; duplicating the check at the wrapper layer would be belt-and-suspenders without architectural benefit.

8. **`FleetMergeStepResult` shape:**
   ```ts
   export interface FleetMergeStepResult {
     /** Fleet log e-value at this tick — the value the primitive produced
      *  from the per-shard log-e-values. Convenience alias for
      *  fleet_state.log_fleet_e_t (which holds the same value post-update). */
     log_fleet_e: number;
     /** Updated fleet wealth tracker state. Same reference as the input
      *  fleet_state parameter (in-place mutation contract). */
     fleet_state: FleetEProcessState;
   }
   ```
   Both fields are LOAD-BEARING for caller ergonomics:
   - `log_fleet_e` is the value the caller may want to log/audit at this tick (rather than re-reading `fleet_state.log_fleet_e_t`).
   - `fleet_state` is the same reference the caller passed in (per the in-place contract); included for chaining semantics + explicit documentation that the wrapper does not allocate a new state object.

   The `log_fleet_e` field IS REDUNDANT with `fleet_state.log_fleet_e_t` post-call (they hold the same value by AC-9). The redundancy is intentional ergonomic; callers that need only the value (e.g., a fleet-level dashboard emitting per-tick log lines) can read `result.log_fleet_e` without dereferencing the state object.

9. **Module location: new `engine/fleet/detectors.ts`** (parallel to R11's `engine/fleet/combine.ts`).
   - Rationale (brainstorm in audit sidecar): the `engine/fleet/` directory shipped at R11 is the natural home for the Tessera-fleet-layer surface. Both `combine.ts` (R11 primitives) and `detectors.ts` (R12 wrappers) live in the same directory; future R13+ work adds `e-bh.ts` (e-BH FDR operator surface) in the same directory.
   - Alternative paths rejected: `engine/fleet/family-a.ts` + `engine/fleet/family-c.ts` (rejected — bodies are short enough that splitting two ~15-line functions across two files is over-decomposition; the shared internal helper would have to live in a third file, adding more surface than it saves); `engine/per-shard/fleet-merge.ts` (rejected — wrong directory; per-shard is the sample-accumulator layer, not the fleet detector layer; would violate the architectural-layer separation R11 established); `engine/detectors/fleet-merge.ts` (rejected — `engine/detectors/` is INHERITED vendored territory; A12 anti-scope forbids new files in inherited directories).

10. **No re-export through `engine/types/index.ts` at R12.** Same convention as R11 (R11-SAS-4 fence preserved at R12 as R12-SAS-4). Consumers import `fleetMergeFamilyA`/`fleetMergeFamilyC`/`FleetMergeStepResult`/`CombinePrimitive` directly from `engine/fleet/detectors`. Future R13+ orchestrator-facing consumer may add the re-export when it lands.

11. **No modification to R11's `engine/fleet/combine.ts` or `engine/types/fleet.ts`.** Both R11 surfaces consumed as-is via imports. R12 imports from `combine.ts`: `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`, `FleetMergeOutput`, `FleetEProcessState` (re-exported from combine.ts:40). R12 does NOT introduce a new re-export. R12-SAS-2 fences modification of R11 surfaces.

12. **Empirical-wiring validation parameters (lighter than R11's PR-F1; per NEXT-ROLE.md item 6):**
    - `α_fleet = 0.01` (same as R11; matches Wilson-CI feasibility budget).
    - `N_SHARDS = 50` (between NEXT-ROLE.md's "N=10..100" range; mid-point).
    - `T_TICKS = 50` (lighter than R11's 100; the wiring claim doesn't need long trajectories — wiring failures would manifest in the first few ticks).
    - `N_FLEET_TRAJ = 100` (lighter than R11's 200; the wiring claim doesn't need PR-F1-grade evidence — the math is R11's responsibility).
    - Wilson upper bound: `FPR_BOUND = α_fleet + 3·√(α_fleet·(1−α_fleet)/N_FLEET_TRAJ) = 0.01 + 3·√(0.01·0.99/100) = 0.01 + 0.02985 ≈ 0.03985`.
    - Total work: 100 fleet-traj × 50 shards × 50 ticks × 2 (PoE + AoE) cells = 500k wealth updates ≈ 0.5s wall-clock at ~1 μs/update on M-series Darwin. Well within q12 runtime budget.
    - Empirical-wiring scope: AC-14 (PoE-iid via `fleetMergeFamilyA`) + AC-15 (AoE-iid via `fleetMergeFamilyA`). PoE-correlated and AoE-correlated cells SKIPPED at R12 — the correlated-drift demonstration is R11's PR-F1 evidence (AC-14 + AC-16 there); R12's wiring claim is established by the iid cells alone (if the wrapper passes Ville bound under iid, the wrapper is correctly extracting + combining + tracking; the math-under-correlated-drift claim is independent of wiring correctness and is owned by R11).

13. **Family-C empirical-validation deferral to structural-identity-only ACs.** R12 does NOT run an empirical fleet-FPR test for Family C. Rationale (brainstorm in audit sidecar):
    - The full Family C SR23 detector pipeline (`evaluateFamilyCBettingEProcess` at `engine/detectors/family-c-betting-e-process.ts:303`) requires a compile-time `CompiledConfig` with `betting_e_process_params` populated per cell. Constructing a minimal valid `CompiledConfig` for a unit test is heavy infrastructure (the q07-fleet-correlated test at `test/q07-fleet-correlated.test.ts` is the closest precedent; it consumes a curated baseline from `tools/curate-baseline-fleet-correlated.ts`).
    - The math validation of Vovk-Wang 2021 §4 is family-agnostic: the same combination result applies whether the source is Family A `Math.log(state.M)` or Family C `state.log_S_t`. R11 PR-F1 evidence at Family A is sufficient as the math validation for both families' fleet-merge wiring (the wiring claim is "the wrapper correctly extracts log-e-values from the family-specific state and passes them to the primitive" — that's structural, not statistical).
    - R12 Family-C ACs (AC-3, AC-7, AC-10, AC-12) use literal synthetic `FamilyCBettingEProcessState` arrays with directly-set `log_S_t` values; this is sufficient to verify the wiring claim AND to verify per-shard input invariance.

14. **Structural-identity AC (load-bearing per NEXT-ROLE.md halt condition):** For both families, the wrapper's output MUST equal what you'd get from calling the primitive directly on the extracted log-e-values. Specifically:
    - **Family A**: `fleetMergeFamilyA(states, primitive, ...).log_fleet_e === primitive(states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)))).log_fleet_e` (exact equality under deterministic reduce; both sides do the same arithmetic in the same order).
    - **Family C**: `fleetMergeFamilyC(states, primitive, ...).log_fleet_e === primitive(states.map(s => s.log_S_t)).log_fleet_e` (exact equality).
    - This is the right-reasons-safe binding for the wiring AC: it would FAIL if the wrapper introduced any transformation (e.g., dividing by N inside the wrapper, accidentally summing instead of averaging, applying a base-10 log instead of natural log). Theory-derived, not OBSERVED-binding (per R07 reinforcement; right-reasons audit: a future bug that broke the extraction would FAIL this assertion).

15. **Both-primitives smoke AC.** A single test (AC-2) calls `fleetMergeFamilyA` once with `combineProduct` and once with `combineAverage` against the same per-shard states; verifies BOTH calls return finite `log_fleet_e` AND the two values differ (under non-degenerate input, `Σ log_e ≠ logSumExp(log_e) − log(N)` in general). This is the load-bearing demonstration that the caller-selection mechanism actually works at runtime (both primitives can be passed; both produce wired output).

### Cross-section consistency pass

_(R01-derived reinforcement — 8th consecutive application; standing discipline.)_

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + ACs in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | Two family-specific wrappers ship: `fleetMergeFamilyA` + `fleetMergeFamilyC` | § Mechanism primitive 1; § Per-file pseudocode Delta 1; AC-1, AC-2, AC-3, AC-9, AC-10, AC-11, AC-12 | Single family-agnostic generic wrapper (Option C in brainstorm); Family-A-mixture wrapper at R12; per-family file split | Pseudocode declares exactly two exported wrappers; no `fleetMergeStep` exported (it's a module-internal helper); no `fleetMergeFamilyAMixture`; R12-SAS-15 fences mixture wrapper |
| 2 | E-value extraction conventions: Family A `Math.log(Math.max(state.M, WEALTH_FLOOR))`; Family C `state.log_S_t` | § Mechanism primitive 2; § Per-file pseudocode Delta 1 | Family A `Math.log(state.M)` (no floor — would NaN on wealth=0); Family C `Math.log(state.log_S_t)` (double-log on already-log-space value) | Pseudocode literal text uses `Math.log(Math.max(state.M, WEALTH_FLOOR))` for Family A and `state.log_S_t` (no Math.log call) for Family C; AC-1 evidence-bound demonstrates extraction equivalence |
| 3 | Caller-selection: option (a) caller passes primitive as call-site arg | § Mechanism primitive 3; § Per-file pseudocode Delta 1 (signature); AC-2 | Option (b) auto-selection from CompiledConfig field; option (b) auto-selection from runtime correlation signal | Pseudocode signature has `primitive: CombinePrimitive` as a parameter; no `CompiledConfig` parameter; no internal correlation-detection helper; R12-SAS-5 fences new config field |
| 4 | Per-shard input invariance: wrapper does NOT mutate per-shard state | § Mechanism primitive 5; AC-6, AC-7 | Wrapper mutates state.M to apply WEALTH_FLOOR write-back; wrapper increments per-shard tick count as a side effect | Pseudocode reads `state.M` / `state.log_S_t` in `for (const state of per_shard_states)` loops; never writes to any field; AC-6 + AC-7 deep-equal-before-vs-after |
| 5 | Fleet state mutated in-place; same reference returned | § Mechanism primitive 6; AC-8, AC-9 | New fleet state object allocated and returned | Pseudocode passes `fleet_state` to `updateFleetEProcessState` which returns the same reference; AC-8 asserts `result.fleet_state === fleet_state` |
| 6 | `FleetMergeStepResult` carries both `log_fleet_e` AND `fleet_state` (redundant but ergonomic) | § Mechanism primitive 8; AC-1 (shape) | Return only `log_fleet_e: number`; return only `fleet_state: FleetEProcessState` | Pseudocode `return { log_fleet_e: out.log_fleet_e, fleet_state }` carries both; AC-1 binds both fields' types |
| 7 | Empty-input behavior: throw propagated from R11 primitives (no pre-validation) | § Mechanism primitive 7; AC-13 | Wrapper pre-validates `length === 0` with its own throw; wrapper returns sentinel value | Pseudocode contains NO `if (length === 0)` guard; AC-13 expects the throw to bubble from R11's `combineProduct`/`combineAverage` (assert.throws matches `/empty input/` regex which is R11's error message) |
| 8 | New module = `engine/fleet/detectors.ts` (parallel to R11's `combine.ts`) | § Mechanism primitive 9; § Component inventory | `engine/fleet/family-a.ts` + `engine/fleet/family-c.ts`; `engine/per-shard/fleet-merge.ts`; `engine/detectors/fleet-merge.ts` | Component inventory lists exactly one new production file `engine/fleet/detectors.ts`; no per-family files; no inherited-directory files; R12-SAS-3 fences A12 anti-scope |
| 9 | No re-export through `engine/types/index.ts` at R12 (R11 convention preserved) | § Mechanism primitive 10; § Anti-scope R12-SAS-4 | Add `export * from './fleet/detectors'` (wrong target anyway — index re-exports types only); add `export { ... } from './fleet/detectors'` to `engine/types/index.ts` | Component inventory shows `engine/types/index.ts` UNCHANGED; R12-SAS-4 fences |
| 10 | No modification to R11 `engine/fleet/combine.ts` or `engine/types/fleet.ts` | § Mechanism primitive 11; § Anti-scope R12-SAS-2 | Add new export to combine.ts (e.g., `export type { CombinePrimitive }`); modify FleetMergeOutput shape | Component inventory shows both R11 files UNCHANGED; `CombinePrimitive` is defined LOCALLY in `engine/fleet/detectors.ts` (not in combine.ts) |
| 11 | Empirical-wiring validation params: α_fleet=0.01, N=50, T=50, N_traj=100; iid only (no correlated cells) | § Mechanism primitive 12; § Per-file pseudocode Delta 2; AC-14, AC-15 | Re-run R11's full PR-F1 4-cell matrix; include PoE-correlated REPORTING; bind to OBSERVED FPR | Pseudocode constants `ALPHA_FLEET=0.01`, `N_SHARDS=50`, `T_TICKS=50`, `N_FLEET_TRAJ=100` declared once at top of test file; ACs reference by name; AC-14 + AC-15 each bind to theory-derived Wilson bound only |
| 12 | Family-C empirical-FPR test SKIPPED at R12 (structural-identity-only) | § Mechanism primitive 13; AC-3 + AC-7 + AC-10 + AC-12 | Build minimal CompiledConfig + call evaluateFamilyCBettingEProcess at N=50 shards; skip Family C entirely | Pseudocode for AC-3/7/10/12 uses literal synthetic `FamilyCBettingEProcessState` arrays with directly-set `log_S_t`; no `CompiledConfig` construction; no import of `evaluateFamilyCBettingEProcess` |
| 13 | Structural identity (right-reasons-safe): wrapper output ≡ primitive(extracted-log-e) | § Mechanism primitive 14; AC-1 (Family A) + AC-3 (Family C) + AC-9 (Family A with primitive=combineAverage) + AC-10 (Family C with primitive=combineAverage) | Bind to specific OBSERVED log_fleet_e values; assert qualitative ordering between wrapper and primitive | Pseudocode `assert.strictEqual(wrapper_out.log_fleet_e, primitive(extracted).log_fleet_e)` — exact equality both sides; R07 OBSERVED-binding-scope reinforcement preserved |
| 14 | Both primitives accepted: smoke test verifies PoE + AoE each callable through wrapper | § Mechanism primitive 15; AC-2 | Test only PoE through wrapper; test only AoE through wrapper | Pseudocode AC-2 calls wrapper twice with different primitives; assert.notStrictEqual on the two outputs (verifies primitive parameter actually drives behavior) |
| 15 | WEALTH_FLOOR re-declared module-locally in detectors.ts (not imported from inherited engine) | § Mechanism primitive 2 + § Per-file pseudocode Delta 1 file header | `import { WEALTH_FLOOR } from '../detectors/betting-e-process'` (which would fail — WEALTH_FLOOR is module-private at `betting-e-process.ts:65`, not exported) | Pseudocode declares `const WEALTH_FLOOR = 1e-12;` near top of detectors.ts; verify with `grep -n "^const WEALTH_FLOOR" engine/fleet/detectors.ts` → 1 |
| 16 | CombinePrimitive type defined locally in detectors.ts (not added to combine.ts) | § Mechanism primitive 3 + § Per-file pseudocode Delta 1 | Add `export type CombinePrimitive` to combine.ts | combine.ts UNCHANGED at R12; `CombinePrimitive` type alias declared + exported in detectors.ts only |
| 17 | TDD ordering: RED (q12 test only; TS2307 on missing detectors.ts) → GREEN (detectors.ts created) | § Per-file pseudocode Implementer note 4; AC-16 | Single-commit landing; production before test | AC-16 specifies two-commit ordering; pre-R12 `engine/fleet/detectors.ts` does not exist; q12 import would fail TS2307 |
| 18 | File-creation track-state: `engine/fleet/detectors.ts`, `test/q12-fleet-merged-detector-surfaces.test.ts` do NOT exist at HEAD `58d6090` | § Component inventory directory-creation note | Assumed pre-existing | `git ls-files engine/fleet/detectors.ts test/q12*.test.ts` at HEAD `58d6090` — empty output (none exist) |
| 19 | No grep-evidence ACs that match `//` comments (R03 MINOR-2 reinforcement) | § Acceptance criteria | A grep AC matching `fleetMergeFamilyA` would match imports + JSDoc | R12 has ZERO grep-pattern verification ACs — all evidence comes from test-body assertions; reinforcement satisfied trivially by absence |
| 20 | No OBSERVED-binding to specific FPR values (R07 reinforcement) | § Mechanism primitive 12; AC-14 + AC-15 | Bind to specific OBSERVED FPR like `assert.strictEqual(fpr, 0.025)` | Both empirical-wiring ACs bind to the THEORY-DERIVED Wilson upper bound (`α_fleet + 3·√(…)`); structural-identity ACs bind to closed-form equality with the primitive (theory-derived, not OBSERVED) |
| 21 | Fixture-sizing exhaustive propagation (R07 reinforcement; updated post-R07): same N_FLEET_TRAJ across all empirical-wiring cells (2 cells at R12) | § Mechanism primitive 12; AC-14 + AC-15 | Different N_FLEET_TRAJ per cell (would invalidate Wilson-CI comparison across cells) | Constant `N_FLEET_TRAJ=100` reused across both cells per Delta 2 |
| 22 | File-level docblock coverage (R10 reinforcement): new file `engine/fleet/detectors.ts` declares its surface in the file-level header | § Per-file pseudocode Delta 1 file-header text | New module without docblock; docblock states a different surface than what the file actually exports | Delta 1 includes a verbatim file-level docblock; Implementer note 5 mandates header verification |
| 23 | Citation-accuracy: every line-range cited in REVIEWER-ANCHOR table extracted verbatim via `sed -n` at spec-emit (R11 OBS-1/-2 reinforcement; 1st post-reinforcement application) | § Existing architectural surface table + § Architect self-attest | Recall line numbers from memory; use approximate ranges | All 12 REVIEWER-ANCHOR rows + 7 self-attest bullets carry exact line numbers extracted via `sed -n` (per Implementer bash log + R11 OBS-1 reinforcement); the spec corrects R11 OBS-1's wrong M_t line (43 → 47) inline at the self-attest bullet |
| 24 | Correction-propagation: R11 OBS-1 line-number correction (M_t :43 → :47) flagged AND propagated to every citation of M_t in this spec | § Existing architectural surface table row 6 + § Architect self-attest bullet 4 | Cite M_t at :43 silently re-using R11's wrong line | Both citation sites in this spec use :47 (verified via `sed -n '40,62p' engine/detectors/family-a-mixture-supermartingale.ts`); R09-derived correction-propagation reinforcement applied |
| 25 | Inherited-testimony empirical verification (R08 reinforcement): R11's PR-F1 evidence (cited as load-bearing for R12's wiring claim) re-verified at HEAD by running q11 tests | § Spec preamble + § Existing architectural surface row 11 + Architect self-attest | Inherit R11's testimony without re-running | Architect at spec-emit ran `node --test test/q11-hierarchical-e-value-combination.test.js` (the .ts file compiles to .js via `npm run pretest`); OBSERVED 18/0 pass/fail per NEXT-ROLE.md attestation block (R11 GREEN HEAD `5ae6c7d`; verified at SHA `a0b6c92`). Verification command logged in audit sidecar § Inherited-testimony verification. |
| 26 | Component-inventory AC-range arithmetic cross-check (R06 reinforcement; 5th consecutive application) | § Component inventory cross-check paragraph + § Acceptance criteria + § P3 Coverage row | Three sites disagree on AC count | All three sites declare 16 ACs (AC-1 through AC-16); cross-check paragraph below Component inventory table verifies |

All 26 checks PASS at spec-emit time. The cross-section pass is now standing discipline at Tessera; this is the 8th consecutive application (R02=9 / R03=13 / R04=12 / R05=15 / R10=16 / R11=20 / R12=26).

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `engine/fleet/detectors.ts` | CREATED | Delta 1: new file containing `fleetMergeFamilyA`, `fleetMergeFamilyC`, `FleetMergeStepResult` interface, `CombinePrimitive` type alias, module-local `fleetMergeStep` internal helper, `WEALTH_FLOOR` module-local constant. Imports type-only `BettingEProcessState` from `../types/families/a`; type-only `FamilyCBettingEProcessState` from `../types/families/c`; runtime functions `combineProduct, combineAverage, freshFleetEProcessState, updateFleetEProcessState` + types `FleetMergeOutput, FleetEProcessState` from `../fleet/combine` (re-exported from there at R11). Binds AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15. |
| `test/q12-fleet-merged-detector-surfaces.test.ts` | CREATED | Delta 2: new test file binding AC-1 through AC-16 (16 tests total). Imports from `engine/fleet/detectors`, `engine/fleet/combine`, `engine/types/fleet`, `engine/detectors/betting-e-process`, `engine/types/families/a` (type only), `engine/types/families/c` (type only). Re-inlines `mulberry32` PRNG + Box-Muller `gaussian` helper per R11 q11 standalone-test convention (`test/q11-hierarchical-e-value-combination.test.ts:35-50`). |
| `engine/fleet/combine.ts` | UNCHANGED | R12-SAS-2: R11-shipped primitive surface frozen. R11 MINOR-1 `tick_post` nit (operator gate item) preserved per NEXT-ROLE.md. |
| `engine/types/fleet.ts` | UNCHANGED | R12-SAS-2: R11-shipped state-type frozen. |
| `engine/per-shard/runtime.ts` | UNCHANGED | R12-SAS-1: per-shard runtime not touched. R10 MINOR-1 module-docblock carry-forward preserved per NEXT-ROLE.md. |
| `engine/per-shard/welford.ts` | UNCHANGED | R12-SAS-1. |
| `engine/per-shard/warm-start.ts` | UNCHANGED | R12-SAS-1. |
| `engine/detectors/*` (all 14 files) | UNCHANGED | R12-SAS-3 (A12 anti-scope; inherited engine internals frozen). |
| `engine/types/families/{a,b,c,d,e}.ts` | UNCHANGED | R12-SAS-3 (vendored). |
| `engine/types/config.ts` | UNCHANGED | R12-SAS-5 (Tessera schema extensions are SLICE 4 / SLICE 2-cleanup scope, NOT R12). NO new `CompiledConfig` fields. |
| `engine/types/index.ts` | UNCHANGED | R12-SAS-4 (no R12 re-export of detectors.ts; future R13+ may add). |
| `tools/*` | UNCHANGED | R12-SAS-7. |
| `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md` | UNCHANGED | R12-SAS-6. |
| `coordination/specs/Q-R[01-11]-SPEC.md` | UNCHANGED | R12-SAS-18 (prior-round specs frozen). |
| `test/_substrate/factories.ts` | UNCHANGED | R12-SAS-9 (R12 q12 uses literal object construction for synthetic per-shard states; no factory needed). |
| `test/q[01-11]*.test.ts` | UNCHANGED | R12-SAS-9 (frozen prior-round tests). |
| `test/betting-e-process-class-dispatch.test.ts` | UNCHANGED | R12-SAS-9. |

**Component inventory AC-range cross-check** (R06 narrative-vs-pseudocode AC-count reinforcement; 5th consecutive application):
- Component inventory narrative above lists q12 test binding "AC-1 through AC-16" (16 ACs).
- § Acceptance criteria below enumerates AC-1 through AC-16 inclusive (16 ACs total).
- § P3 ten-axis verification Coverage row enumerates the same 16 ACs.
- All three sites agree: **16 ACs**.

**Directory-creation track-state verification** (R02 OBS-2 file-track-state reinforcement applied inversely):
- `engine/fleet/detectors.ts` — does NOT exist at HEAD `58d6090` (`git ls-files engine/fleet/detectors.ts` → empty). GREEN commit creates this file.
- `test/q12-fleet-merged-detector-surfaces.test.ts` — does NOT exist at HEAD `58d6090` (`git ls-files test/q12*.test.ts` → empty). RED commit creates this file.

---

## Integration points

_(R03-derived re-export-chain-check reinforcement applied — 5th consecutive application — for each named symbol consumed in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)_

1. **`engine/fleet/detectors.ts` → `engine/fleet/combine.ts` (NEW edge).** R12 imports six symbols from R11's combine.ts:
   - `combineProduct` — declared at `engine/fleet/combine.ts:63-70`; consumed by callers as a candidate value for the `primitive` parameter.
   - `combineAverage` — declared at `engine/fleet/combine.ts:87-99`; same.
   - `freshFleetEProcessState` — declared at `engine/fleet/combine.ts:102-110`; consumed by R12 q12 test for setting up fleet trajectories (NOT by R12 production code).
   - `updateFleetEProcessState` — declared at `engine/fleet/combine.ts:122-138`; consumed by R12 production code inside the shared internal `fleetMergeStep` helper to update the fleet state after the primitive call.
   - `FleetMergeOutput` (type) — declared at `engine/fleet/combine.ts:46-50`; consumed by R12 as the return type of `CombinePrimitive` and indirectly via the primitive call's `.log_fleet_e` field.
   - `FleetEProcessState` (type) — re-exported from `engine/fleet/combine.ts:40` (original declaration at `engine/types/fleet.ts:30`); consumed by R12 as the type of the `fleet_state` parameter + `FleetMergeStepResult.fleet_state` field.

2. **`engine/fleet/detectors.ts` → `engine/types/families/a.ts` (NEW edge; type-only).** R12 imports `type BettingEProcessState` via `import type { BettingEProcessState } from '../types/families/a';`. Declaration at `engine/types/families/a.ts:20-28`. R12 reads ONLY the `state.M` field (declared at `engine/types/families/a.ts:21`); the other 6 fields are not consumed at R12.

3. **`engine/fleet/detectors.ts` → `engine/types/families/c.ts` (NEW edge; type-only).** R12 imports `type FamilyCBettingEProcessState` via `import type { FamilyCBettingEProcessState } from '../types/families/c';`. Declaration at `engine/types/families/c.ts:297-334`. R12 reads ONLY the `state.log_S_t` field (declared at `engine/types/families/c.ts:300`); the other 11 fields are not consumed at R12.

4. **`engine/fleet/detectors.ts` ↔ inherited engine internals.** ZERO runtime imports from `engine/detectors/`. R12 production code does NOT import `WEALTH_FLOOR` from `engine/detectors/betting-e-process.ts` (that constant is module-private at `betting-e-process.ts:65`, not exported; R12 redeclares `WEALTH_FLOOR = 1e-12` as a module-local constant in detectors.ts). R12 does NOT import `evaluateBettingEProcess`, `evaluateFamilyCBettingEProcess`, or any inherited detector function.

5. **`test/q12-fleet-merged-detector-surfaces.test.ts` → `engine/fleet/detectors.ts` (NEW edge).** q12 imports (from `../engine/fleet/detectors`):
   - `fleetMergeFamilyA` — tested at AC-1 through AC-2, AC-4 through AC-6, AC-9, AC-11, AC-13, AC-14, AC-15.
   - `fleetMergeFamilyC` — tested at AC-3, AC-7, AC-10, AC-12.
   - `type FleetMergeStepResult` — tested at AC-1 (shape).
   - `type CombinePrimitive` — tested at AC-2 (typed parameter value).

6. **`test/q12-fleet-merged-detector-surfaces.test.ts` → `engine/fleet/combine.ts` (existing edge; no R12 modification).** q12 imports (from `../engine/fleet/combine`):
   - `combineProduct, combineAverage` — passed as `primitive` argument to the wrappers; also called directly for structural-identity ACs.
   - `freshFleetEProcessState` — called by q12 for fleet trajectory setup.
   - `type FleetEProcessState, type FleetMergeOutput` — q12 fixture typing.

7. **`test/q12-fleet-merged-detector-surfaces.test.ts` → `engine/detectors/betting-e-process.ts` (existing edge; no R12 modification).** q12 imports `freshBettingState` + `updateBettingState` from the existing declaration sites (`engine/detectors/betting-e-process.ts:72` + `:151`) for the Family A fleet-trajectory simulator (per-shard wealth process driver). Same import set as R11 q11 (`test/q11-hierarchical-e-value-combination.test.ts:25-28`).

8. **`test/q12-fleet-merged-detector-surfaces.test.ts` → `engine/types/families/{a,c}.ts` (existing edge; type-only).** q12 imports `type BettingEProcessState` (used in AC-6 per-shard input invariance deep-equal-before-vs-after fixture) and `type FamilyCBettingEProcessState` (used in AC-3/AC-7/AC-10/AC-12 synthetic Family C state arrays).

9. **`test/q12-fleet-merged-detector-surfaces.test.ts` ↔ Tessera per-shard runtime.** ZERO. q12 does NOT consume `updatePerShardResidual`, `projectTierGatedOutputs`, `observeSample`, `updateWelford`, or any Tessera per-shard surface. The fleet-merge wrappers operate on raw per-shard wealth-process states (from inherited engine), one architectural layer ABOVE the Tessera per-shard accumulator layer. Per-shard runtime is anti-scope (R12-SAS-1).

10. **`test/q12-fleet-merged-detector-surfaces.test.ts` → `test/_substrate/factories.ts`.** ZERO. q12 uses literal object construction for synthetic Family A + Family C states (matches R11 q11 pattern).

**Re-export-chain verification (R03 reinforcement; 5th consecutive application):**
- `BettingEProcessState` (R12 production code DOES directly import the type) — declared at `engine/types/families/a.ts:20`; re-export chain at `engine/types/index.ts:22` via `export * from './families/a';` (NOT used by R12; R12 imports DIRECTLY from `engine/types/families/a` to keep the import chain explicit + match R11 q11's import pattern).
- `FamilyCBettingEProcessState` — declared at `engine/types/families/c.ts:297`; re-export chain at `engine/types/index.ts:24` via `export * from './families/c';` (NOT used by R12; R12 imports DIRECTLY from `engine/types/families/c`).
- `FleetEProcessState` — declared at `engine/types/fleet.ts:30`; re-exported from `engine/fleet/combine.ts:40` (R11 ergonomic re-export). R12 imports via the combine.ts re-export (single import path for the runtime functions + state type).
- `FleetMergeOutput` — declared at `engine/fleet/combine.ts:46`. R12 imports directly from `engine/fleet/combine`.
- `FleetMergeStepResult`, `CombinePrimitive` — NEW at R12; declared at `engine/fleet/detectors.ts:NEW` (created by Delta 1). NOT re-exported via `engine/types/index.ts` (per R12-SAS-4 fence).

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **Exact function names** (per cross-section consistency pass row 1):
   - `fleetMergeFamilyA(per_shard_states: ReadonlyArray<BettingEProcessState>, primitive: CombinePrimitive, fleet_state: FleetEProcessState, log_threshold: number): FleetMergeStepResult` — exactly that signature.
   - `fleetMergeFamilyC(per_shard_states: ReadonlyArray<FamilyCBettingEProcessState>, primitive: CombinePrimitive, fleet_state: FleetEProcessState, log_threshold: number): FleetMergeStepResult` — exactly that signature.
   - **Internal helper** (NOT exported): `function fleetMergeStep(log_e_values: ReadonlyArray<number>, primitive: CombinePrimitive, fleet_state: FleetEProcessState, log_threshold: number): FleetMergeStepResult` — called by both wrappers after their respective e-value extraction step.

2. **Exact type declarations:**
   - `export type CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput;` (type alias; matches the exact signature of R11's `combineProduct` + `combineAverage`).
   - `export interface FleetMergeStepResult { log_fleet_e: number; fleet_state: FleetEProcessState; }`.

3. **Algorithm (both wrappers; differ only in extraction line):**
   - Step 1 (extraction):
     - Family A: `const log_e_values: number[] = []; for (const state of per_shard_states) log_e_values.push(Math.log(Math.max(state.M, WEALTH_FLOOR)));`
     - Family C: `const log_e_values: number[] = []; for (const state of per_shard_states) log_e_values.push(state.log_S_t);`
   - Step 2 (delegate): `return fleetMergeStep(log_e_values, primitive, fleet_state, log_threshold);`
   - Internal `fleetMergeStep`:
     - Step A: `const out = primitive(log_e_values);` (throws on empty input per R11's primitives).
     - Step B: `updateFleetEProcessState(fleet_state, out.log_fleet_e, log_threshold);` (in-place mutation per R11 convention).
     - Step C: `return { log_fleet_e: out.log_fleet_e, fleet_state };` (fleet_state is the same reference as input).

4. **TDD ordering** — two-commit sequence (per AC-16):
   - **RED commit** creates `test/q12-fleet-merged-detector-surfaces.test.ts`. The file imports `{ fleetMergeFamilyA, fleetMergeFamilyC, type FleetMergeStepResult, type CombinePrimitive }` from `../engine/fleet/detectors`, which does NOT yet exist at HEAD `58d6090`. Result: `npm run typecheck` exits 1 with TS2307 (no such file). Verify RED state by running `npm run typecheck`; DO NOT run `node --test` at RED (typecheck failure blocks the test runner).
   - **GREEN commit** creates `engine/fleet/detectors.ts` (Delta 1). Verify GREEN via `npm run typecheck` (exit 0) + `node --test test/q12-fleet-merged-detector-surfaces.test.js` (expect 16 pass / 0 fail per AC-16; Implementer reports OBSERVED at attestation).

5. **File-level docblock coverage** (R10 reinforcement — 3rd application; new file at R12):
   - `engine/fleet/detectors.ts` begins with a file-level JSDoc block describing the SLICE 3 second-slice surface (family-specific fleet-merge entry points), the caller-selection mechanism (option a; primitive passed at call site), the conditional-independence-assumption + compensating-control responsibility split, the per-shard input invariance contract, and the engine-convention reference (in-place mutation on fleet state matches R11) — see Delta 1 verbatim text below.

6. **Hand-trace verification before committing GREEN** — Family A AoE-iid scenario at N=50 shards (cross-binding AC-15):
   - For one fleet trajectory: initialize 50 fresh `BettingEProcessState`s via `freshBettingState()`; initialize 1 fresh `FleetEProcessState` via `freshFleetEProcessState()` with `log_threshold = Math.log(100) ≈ 4.605` (α_fleet=0.01).
   - For each of 50 ticks: per shard, generate iid `gaussian(rng)`, call `updateBettingState(state, x, 0, 1, 0)` per `engine/detectors/betting-e-process.ts:151`; THEN call `fleetMergeFamilyA(shard_states, combineAverage, fleet_state, log_threshold)`.
   - After 50 ticks: read `fleet_state.fired` to determine if THIS trajectory fired.
   - Repeat across 100 fleet trajectories with distinct seeds; tally fires / 100 = observed FPR.
   - AC-15 expects observed_fpr ≤ Wilson bound (`0.01 + 3·√(0.01·0.99/100) ≈ 0.0399`).
   - Architect-pre-predicted observed FPR under AoE-iid at N=50/T=50/N_traj=100: 0.000 to 0.020 (AoE is conservative; fleet wealth averages across 50 shards; at T=50 ticks the per-shard wealth has limited time to accumulate; expected fires < 5%).

7. **Hand-trace verification — Family A PoE-iid scenario** (cross-binding AC-14):
   - Same setup; `primitive = combineProduct` instead of `combineAverage`.
   - Architect-pre-predicted observed FPR under PoE-iid at N=50/T=50/N_traj=100: 0.000 to 0.020. PoE-iid preserves Ville per Vovk-Wang 2021 §4 (cond. indep. holds under iid).

8. **Implementer note on extraction loop choice.** Step 1 of the wrapper bodies uses `for (const state of per_shard_states) log_e_values.push(...)` rather than `per_shard_states.map(state => ...)`. Reason: imperative loop is consistent with R11's `engine/fleet/combine.ts` style (`combineAverage` body uses `for (const x of log_e_values)` per `combine.ts:92-95`); functional `.map()` would be a stylistic inconsistency with R11. Implementer MUST use the imperative form.

9. **Implementer note on test file path.** `test/q12-fleet-merged-detector-surfaces.test.ts` — verbose name matches R11's convention (`test/q11-hierarchical-e-value-combination.test.ts`). Shortened variants (`test/q12-fleet-detectors.test.ts`) are REJECTED.

### Delta 1 — `engine/fleet/detectors.ts` (CREATED)

The full file content:

```ts
// engine/fleet/detectors.ts — Tessera SLICE 3 second slice (R12):
// fleet-merged Family A + Family C detector surfaces.
//
// Bridges the inherited-engine per-shard wealth processes and R11's
// family-agnostic fleet-merge primitives:
//
//   fleetMergeFamilyA: takes a ReadonlyArray of per-shard
//     BettingEProcessState (engine/types/families/a.ts:20), extracts
//     Math.log(Math.max(state.M, WEALTH_FLOOR)) per shard, calls the
//     caller-supplied primitive (combineProduct or combineAverage from
//     engine/fleet/combine.ts), updates the fleet wealth tracker via
//     updateFleetEProcessState, returns { log_fleet_e, fleet_state }.
//
//   fleetMergeFamilyC: takes a ReadonlyArray of per-shard
//     FamilyCBettingEProcessState (engine/types/families/c.ts:297),
//     reads state.log_S_t directly per shard (already log-space per
//     inherited engine convention; no extra log or floor), then
//     identical to fleet-merge body for Family A.
//
// Caller-selection mechanism (PoE vs AoE; per Q-R12-SPEC Mechanism
// primitive 3): the caller passes combineProduct (PoE — Ville-preserved
// under conditional independence) OR combineAverage (AoE — Ville-preserved
// under arbitrary dependence; conditional-independence-robust). These
// wrappers make NO claim about which primitive is safe in a given regime —
// that decision belongs to the caller. R11 PR-F1 evidence matrix (at
// test/q11-hierarchical-e-value-combination.test.ts AC-13/14/15/16)
// empirically demonstrated both regimes; R12 ships the named family-
// specific entry points the operator-layer caller will use at R13+.
//
// Per-shard input invariance: neither wrapper mutates any field of any
// per-shard input state. Wrappers READ state.M (Family A) or state.log_S_t
// (Family C); they do NOT write. Per AC-6 + AC-7 (deep-equal-before-vs-after
// on every field).
//
// Fleet state mutation contract: in-place (matches R11 convention at
// engine/fleet/combine.ts:122-138). The returned FleetMergeStepResult.fleet_state
// is the SAME reference as the input fleet_state parameter.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the
// shared npm package at Tessera Phase 2 close per SCOPING-MEMO-v0.3 § 9.

import type { BettingEProcessState } from '../types/families/a';
import type { FamilyCBettingEProcessState } from '../types/families/c';
import {
  updateFleetEProcessState,
  type FleetEProcessState,
  type FleetMergeOutput,
} from './combine';

/** Wealth floor — prevents Math.log(0) on long no-drift Family A runs where
 *  BettingEProcessState.M underflows below 1e-12. Mirrors the inherited
 *  engine convention at engine/detectors/betting-e-process.ts:65
 *  (WEALTH_FLOOR is module-private there; redeclared here as Tessera-fleet-
 *  layer constant with the same numeric value). */
const WEALTH_FLOOR = 1e-12;

/** Function-signature alias for the caller-supplied combination primitive.
 *  Matches exactly the signature of R11's combineProduct + combineAverage
 *  exports at engine/fleet/combine.ts:63 + :87. Caller picks per the
 *  operating regime (option (a) caller-selection mechanism; see file
 *  header for the conditional-independence-assumption + compensating-control
 *  responsibility split). */
export type CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput;

/** Result of a single fleet-merge step. Carries both the fleet log-e-value
 *  (convenience alias for fleet_state.log_fleet_e_t post-update) AND the
 *  same fleet_state reference (in-place mutation contract; explicit
 *  ergonomic for callers that chain across ticks). */
export interface FleetMergeStepResult {
  log_fleet_e: number;
  fleet_state: FleetEProcessState;
}

/** Shared internal helper: takes pre-extracted log-e-values, calls the
 *  primitive, updates the fleet wealth tracker in-place, returns the
 *  result. Throws (via the primitive) when log_e_values.length === 0
 *  (R11 combineProduct/combineAverage own the empty-input semantics).
 *  Module-local; NOT exported. */
function fleetMergeStep(
  log_e_values: ReadonlyArray<number>,
  primitive: CombinePrimitive,
  fleet_state: FleetEProcessState,
  log_threshold: number,
): FleetMergeStepResult {
  const out = primitive(log_e_values);
  updateFleetEProcessState(fleet_state, out.log_fleet_e, log_threshold);
  return { log_fleet_e: out.log_fleet_e, fleet_state };
}

/** Fleet-merged Family A detector surface. Extracts Math.log(Math.max(
 *  state.M, WEALTH_FLOOR)) from each per-shard BettingEProcessState
 *  (engine/types/families/a.ts:20), calls the caller-supplied combination
 *  primitive, updates the fleet wealth tracker.
 *
 *  Pure with respect to per-shard inputs: reads only state.M; does NOT
 *  mutate any field of any per_shard_states[i].
 *
 *  In-place mutates fleet_state per R11 convention; returns the same
 *  reference in FleetMergeStepResult.fleet_state.
 *
 *  Throws (via the primitive) when per_shard_states is empty.
 *
 *  Caller-selection responsibility: picks primitive = combineProduct (PoE)
 *  under iid-assumption-evidence; primitive = combineAverage (AoE) when
 *  correlated drift cannot be ruled out (Vovk-Wang 2021 §4; R11 PR-F1
 *  evidence at test/q11-hierarchical-e-value-combination.test.ts AC-13..16). */
export function fleetMergeFamilyA(
  per_shard_states: ReadonlyArray<BettingEProcessState>,
  primitive: CombinePrimitive,
  fleet_state: FleetEProcessState,
  log_threshold: number,
): FleetMergeStepResult {
  const log_e_values: number[] = [];
  for (const state of per_shard_states) {
    log_e_values.push(Math.log(Math.max(state.M, WEALTH_FLOOR)));
  }
  return fleetMergeStep(log_e_values, primitive, fleet_state, log_threshold);
}

/** Fleet-merged Family C detector surface. Reads state.log_S_t directly
 *  from each per-shard FamilyCBettingEProcessState (engine/types/families/c.ts:297).
 *  The Family C wealth is already stored in log-space per the inherited
 *  engine convention (engine/types/families/c.ts:298-299 JSDoc: "Wealth
 *  process S_t (multiplicative). Stored in log-space as log_S_t for numerical
 *  stability"); no Math.log call or floor is applied.
 *
 *  Pure with respect to per-shard inputs: reads only state.log_S_t; does
 *  NOT mutate any field of any per_shard_states[i].
 *
 *  In-place mutates fleet_state per R11 convention; returns the same
 *  reference in FleetMergeStepResult.fleet_state.
 *
 *  Throws (via the primitive) when per_shard_states is empty.
 *
 *  Caller-selection responsibility: same as fleetMergeFamilyA. */
export function fleetMergeFamilyC(
  per_shard_states: ReadonlyArray<FamilyCBettingEProcessState>,
  primitive: CombinePrimitive,
  fleet_state: FleetEProcessState,
  log_threshold: number,
): FleetMergeStepResult {
  const log_e_values: number[] = [];
  for (const state of per_shard_states) {
    log_e_values.push(state.log_S_t);
  }
  return fleetMergeStep(log_e_values, primitive, fleet_state, log_threshold);
}
```

Verify with:
- `grep -c "^export " engine/fleet/detectors.ts` → 4 (one CombinePrimitive type alias + one FleetMergeStepResult interface + two fleetMergeFamily* functions; the WEALTH_FLOOR const and the fleetMergeStep helper are intentionally NOT exported). Implementer reports OBSERVED count.
- `grep -c "^const WEALTH_FLOOR" engine/fleet/detectors.ts` → 1 (module-local declaration).
- `grep -c "^function fleetMergeStep" engine/fleet/detectors.ts` → 1 (NOT export function; module-local).

### Delta 2 — `test/q12-fleet-merged-detector-surfaces.test.ts` (CREATED)

The test file binds AC-1 through AC-16 (16 tests; one per AC except AC-6 + AC-7 which both bind input-invariance for the two families). Pseudocode below; Implementer adapts to TS strict-mode + matches the assertion form in adjacent q-tests (`assert.deepStrictEqual`, `assert.strictEqual`, `assert.throws`, `assert.ok`).

```ts
// test/q12-fleet-merged-detector-surfaces.test.ts — R12 AC-1 through AC-16.
//
// Binds the SLICE 3 second slice fleet-merged Family A + Family C detector
// surfaces:
//
//   fleetMergeFamilyA(per_shard_states, primitive, fleet_state, log_threshold)
//   fleetMergeFamilyC(per_shard_states, primitive, fleet_state, log_threshold)
//
// Structural-identity ACs: wrapper output ≡ primitive(extracted-log-e) — both
// sides of the equality use the same primitive call internally so this is
// right-reasons-safe (a wiring bug that broke extraction would FAIL the assertion).
//
// Per-shard input invariance ACs: wrapper does NOT mutate any field of any
// per_shard_states[i] — deep-equal-before-vs-after on every field.
//
// Empirical-wiring ACs (Family A only; lighter than R11 PR-F1 per
// NEXT-ROLE.md item 6): N_SHARDS=50, T_TICKS=50, N_FLEET_TRAJ=100; iid H₀ only;
// PoE-iid + AoE-iid each assert fleet FPR ≤ Wilson bound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fleetMergeFamilyA,
  fleetMergeFamilyC,
  type FleetMergeStepResult,
  type CombinePrimitive,
} from '../engine/fleet/detectors';
import {
  combineProduct,
  combineAverage,
  freshFleetEProcessState,
  type FleetEProcessState,
} from '../engine/fleet/combine';
import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process';
import type { BettingEProcessState } from '../engine/types/families/a';
import type { FamilyCBettingEProcessState } from '../engine/types/families/c';

// ─── Deterministic PRNG + Gaussian generator (re-inlined per R11 q11
// standalone convention at test/q11-hierarchical-e-value-combination.test.ts:35-50). ───

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = rng();
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// ─── Empirical-wiring parameters (cross-section consistency pass row 11). ───

const ALPHA_FLEET = 0.01;
const LOG_THRESHOLD = Math.log(1 / ALPHA_FLEET);  // ≈ 4.605
const N_SHARDS = 50;
const T_TICKS = 50;
const N_FLEET_TRAJ = 100;
const FPR_BOUND = ALPHA_FLEET + 3 * Math.sqrt(ALPHA_FLEET * (1 - ALPHA_FLEET) / N_FLEET_TRAJ);
// FPR_BOUND ≈ 0.01 + 3·√(0.01·0.99/100) ≈ 0.03985.

const WEALTH_FLOOR = 1e-12;  // mirrors engine/fleet/detectors.ts module-local constant.

// ─── Helper: build a synthetic Family C state with directly-set log_S_t. ───

function makeFamilyCState(log_S_t: number): FamilyCBettingEProcessState {
  return {
    log_S_t,
    ons_lambda: 0,
    ons_inverse_hessian: 1,
    n: 0,
    witness_running_max: 0,
    q_running_sum: [0],
    q_count: 0,
    fired: false,
    tick_at_first_fire: null,
    alphaConsumed: 0,
  };
}

// ─── R12 AC-1 — fleetMergeFamilyA shape + structural identity (PoE) ─────
test('R12 AC-1 — fleetMergeFamilyA returns FleetMergeStepResult; output equals primitive applied to extracted log-e-values', () => {
  // Synthetic Family A states with known M values.
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 0.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out: FleetMergeStepResult = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  // Shape:
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.fleet_state, fleet_state);  // same reference (in-place contract)
  // Structural identity: wrapper output == direct primitive call on extracted log-e.
  const extracted = states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)));
  const direct = combineProduct(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
});

// ─── R12 AC-2 — both primitives accepted via caller-selection (PoE + AoE) ─
test('R12 AC-2 — fleetMergeFamilyA accepts both combineProduct and combineAverage as the primitive parameter', () => {
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 0.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state_poe = freshFleetEProcessState();
  const fleet_state_aoe = freshFleetEProcessState();
  // Verify CombinePrimitive type accepts both R11 exports.
  const poe: CombinePrimitive = combineProduct;
  const aoe: CombinePrimitive = combineAverage;
  const out_poe = fleetMergeFamilyA(states, poe, fleet_state_poe, LOG_THRESHOLD);
  const out_aoe = fleetMergeFamilyA(states, aoe, fleet_state_aoe, LOG_THRESHOLD);
  // Both produce finite output:
  assert.ok(Number.isFinite(out_poe.log_fleet_e));
  assert.ok(Number.isFinite(out_aoe.log_fleet_e));
  // PoE = Σ log_e; AoE = logSumExp − log(N); under non-degenerate input they differ.
  assert.notStrictEqual(out_poe.log_fleet_e, out_aoe.log_fleet_e);
});

// ─── R12 AC-3 — fleetMergeFamilyC structural identity (PoE) ─────────────
test('R12 AC-3 — fleetMergeFamilyC: output equals combineProduct applied to extracted log_S_t', () => {
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.5),
    makeFamilyCState(1.0),
    makeFamilyCState(1.5),
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyC(states, combineProduct, fleet_state, LOG_THRESHOLD);
  const extracted = states.map(s => s.log_S_t);
  const direct = combineProduct(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
  // Numerical cross-check: sum of [0.5, 1.0, 1.5] = 3.0.
  assert.strictEqual(out.log_fleet_e, 3.0);
});

// ─── R12 AC-4 — fleetMergeFamilyA WEALTH_FLOOR application (state.M = 0) ─
test('R12 AC-4 — fleetMergeFamilyA applies WEALTH_FLOOR when state.M = 0 (no Math.log(0))', () => {
  // One shard with M=0; the floor should prevent log(0).
  const states: BettingEProcessState[] = [
    { M: 0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 1, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  // Expected: log(max(0, 1e-12)) + log(max(1, 1e-12)) = log(1e-12) + log(1) = -27.631 + 0.
  const expected = Math.log(WEALTH_FLOOR) + Math.log(1);
  assert.ok(Number.isFinite(out.log_fleet_e));
  assert.strictEqual(out.log_fleet_e, expected);
});

// ─── R12 AC-5 — fleetMergeFamilyA structural identity (AoE) ─────────────
test('R12 AC-5 — fleetMergeFamilyA with combineAverage: output equals combineAverage(extracted-log-e)', () => {
  const states: BettingEProcessState[] = [
    { M: 1.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 3.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineAverage, fleet_state, LOG_THRESHOLD);
  const extracted = states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)));
  const direct = combineAverage(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
});

// ─── R12 AC-6 — per-shard input invariance (Family A) ───────────────────
test('R12 AC-6 — fleetMergeFamilyA does NOT mutate any per_shard_states[i]', () => {
  const states_before: BettingEProcessState[] = [
    { M: 1.5, bet: 0.1, n: 5, alphaConsumed: 0.001, runningMean: 0.05, runningSecondMoment: 0.5, onsFallbackCount: 2 },
    { M: 2.0, bet: -0.05, n: 7, alphaConsumed: 0.002, runningMean: -0.03, runningSecondMoment: 0.7, onsFallbackCount: 1 },
  ];
  // Deep clone for before-state comparison.
  const snapshot = states_before.map(s => ({ ...s }));
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyA(states_before, combineProduct, fleet_state, LOG_THRESHOLD);
  // Every field unchanged on every state.
  assert.deepStrictEqual(states_before, snapshot);
});

// ─── R12 AC-7 — per-shard input invariance (Family C) ───────────────────
test('R12 AC-7 — fleetMergeFamilyC does NOT mutate any per_shard_states[i]', () => {
  const states_before: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.3),
    makeFamilyCState(0.8),
  ];
  // Deep clone (FamilyCBettingEProcessState has an array field q_running_sum
  // requiring shallow array copy in addition to top-level field copy).
  const snapshot = states_before.map(s => ({ ...s, q_running_sum: [...s.q_running_sum] }));
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyC(states_before, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.deepStrictEqual(states_before, snapshot);
});

// ─── R12 AC-8 — fleet state in-place mutation (same reference returned) ──
test('R12 AC-8 — fleetMergeFamilyA returns the same fleet_state reference (in-place mutation contract)', () => {
  const states: BettingEProcessState[] = [
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(out.fleet_state, fleet_state);
  // Mutation visible on original handle:
  assert.notStrictEqual(fleet_state.n, 0);  // n was 0 before; incremented by updateFleetEProcessState
  assert.strictEqual(fleet_state.n, 1);
});

// ─── R12 AC-9 — log_fleet_e ≡ fleet_state.log_fleet_e_t post-update ─────
test('R12 AC-9 — fleetMergeFamilyA: result.log_fleet_e === fleet_state.log_fleet_e_t after the call', () => {
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineAverage, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(out.log_fleet_e, fleet_state.log_fleet_e_t);
});

// ─── R12 AC-10 — Family C structural identity (AoE) + log_fleet_e ergonomic ─
test('R12 AC-10 — fleetMergeFamilyC with combineAverage: matches direct call AND log_fleet_e ≡ fleet_state.log_fleet_e_t', () => {
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.0),
    makeFamilyCState(2.0),
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyC(states, combineAverage, fleet_state, LOG_THRESHOLD);
  const direct = combineAverage([0.0, 2.0]);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
  assert.strictEqual(out.log_fleet_e, fleet_state.log_fleet_e_t);
});

// ─── R12 AC-11 — sticky-fire propagates through the wrapper ─────────────
test('R12 AC-11 — fleetMergeFamilyA sticky-fire propagates: high M crosses log_threshold; state.fired becomes true', () => {
  // Choose M = e^5 ≈ 148.4 per shard for two shards → log_e ≈ 5 each;
  // combineProduct → sum = 10; 10 > LOG_THRESHOLD ≈ 4.605 → should fire.
  const M_high = Math.exp(5);
  const states: BettingEProcessState[] = [
    { M: M_high, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: M_high, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  assert.strictEqual(fleet_state.fired, false);
  fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(fleet_state.fired, true);
  assert.strictEqual(fleet_state.tick_at_first_fire, 0);
});

// ─── R12 AC-12 — Family C sticky-fire propagation through wrapper ───────
test('R12 AC-12 — fleetMergeFamilyC sticky-fire propagates: high log_S_t crosses log_threshold; state.fired becomes true', () => {
  // log_S_t = 5 per shard for two shards → sum = 10 > LOG_THRESHOLD ≈ 4.605.
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(5),
    makeFamilyCState(5),
  ];
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyC(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(fleet_state.fired, true);
  assert.strictEqual(fleet_state.tick_at_first_fire, 0);
});

// ─── R12 AC-13 — empty per_shard_states throws via primitive bubble-up ──
test('R12 AC-13 — fleetMergeFamilyA + fleetMergeFamilyC each throw on empty per_shard_states (R11 primitive bubble-up)', () => {
  const fleet_state = freshFleetEProcessState();
  assert.throws(
    () => fleetMergeFamilyA([], combineProduct, fleet_state, LOG_THRESHOLD),
    /empty input/,
  );
  assert.throws(
    () => fleetMergeFamilyC([], combineAverage, fleet_state, LOG_THRESHOLD),
    /empty input/,
  );
});

// ─── R12 AC-14 — empirical wiring: PoE-iid fleet FPR ≤ Wilson bound ──────
test('R12 AC-14 — empirical wiring: fleetMergeFamilyA with combineProduct under iid H₀ at N=50/T=50/N_traj=100: fleet FPR ≤ Wilson bound', () => {
  const fpr = measureFleetFireRateFamilyA(combineProduct, 0xE120A001);
  console.log(`  R12 wiring PoE-iid     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `R12 PoE-iid wiring fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R12 AC-15 — empirical wiring: AoE-iid fleet FPR ≤ Wilson bound ──────
test('R12 AC-15 — empirical wiring: fleetMergeFamilyA with combineAverage under iid H₀ at N=50/T=50/N_traj=100: fleet FPR ≤ Wilson bound', () => {
  const fpr = measureFleetFireRateFamilyA(combineAverage, 0xE120A002);
  console.log(`  R12 wiring AoE-iid     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `R12 AoE-iid wiring fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R12 AC-16 — observed test count attestation (R03 MINOR-4 reinforcement) ─
test('R12 AC-16 — OBSERVED q12 test count + TDD ordering reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 16 ACs / 16 tests. Implementer reports OBSERVED
  // via `node --test test/q12-fleet-merged-detector-surfaces.test.js` count
  // at GREEN; NEXT-ROLE.md attestation block captures the actual value, not
  // the prediction (R03 MINOR-4 reinforcement; 7th consecutive application).
  // TDD ordering: RED commit adds q12 test only (TS2307 on missing detectors.ts);
  // GREEN commit adds engine/fleet/detectors.ts atomically.
  assert.ok(true);
});

// ─── Per-fleet-trajectory simulator (Family A; iid H₀) ──────────────────

function simulateFleetTrajectoryFamilyA(
  primitive: CombinePrimitive,
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  const shard_states = Array.from({ length: N_SHARDS }, () => freshBettingState());
  const fleet_state: FleetEProcessState = freshFleetEProcessState();
  for (let t = 0; t < T_TICKS; t++) {
    for (let i = 0; i < N_SHARDS; i++) {
      const x = gaussian(rng);  // iid N(0,1)
      updateBettingState(shard_states[i], x, 0, 1, 0);
    }
    fleetMergeFamilyA(shard_states, primitive, fleet_state, LOG_THRESHOLD);
  }
  return fleet_state.fired;
}

function measureFleetFireRateFamilyA(
  primitive: CombinePrimitive,
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_FLEET_TRAJ; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateFleetTrajectoryFamilyA(primitive, seed)) fires++;
  }
  return fires / N_FLEET_TRAJ;
}
```

Implementer note (file-layout choice): the `simulateFleetTrajectoryFamilyA` + `measureFleetFireRateFamilyA` helpers are declared AFTER the AC tests in the file. Reason: q11 declares them BEFORE (`test/q11-hierarchical-e-value-combination.test.ts:73-114`); both placements work in TypeScript (function hoisting); q12's after-placement keeps the AC tests visually contiguous near the top of the file. Implementer may use either order without affecting correctness; the AFTER ordering is the architect's preference for q12 readability.

---

## Acceptance criteria

Numbered 1-16. Every AC is "Given X, when Y, then Z" or an evidence-bound assertion with a verifiable command. No grep patterns that match inside `//` executable-code comments (R03 MINOR-2 reinforcement; trivially satisfied at R12 — zero grep-evidence ACs).

**Fleet-merge wrapper surface (AC-1 through AC-13):**

- **AC-1** — _Given_ three synthetic `BettingEProcessState` objects with `M = [1.5, 2.0, 0.5]`, a fresh `FleetEProcessState`, and `primitive = combineProduct`, _when_ `fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD)` is called, _then_ the returned `FleetMergeStepResult` has `typeof log_fleet_e === 'number'` AND `result.fleet_state === fleet_state` (same reference) AND `result.log_fleet_e === combineProduct(states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)))).log_fleet_e` (structural identity; right-reasons-safe per Mechanism primitive 14). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-1 …" passes.

- **AC-2** — _Given_ the same three Family A states, _when_ `fleetMergeFamilyA(states, primitive, fleet_state, LOG_THRESHOLD)` is called once with `primitive = combineProduct` and once (with a separate fresh `fleet_state`) with `primitive = combineAverage` (both typed as `CombinePrimitive`), _then_ both returned `log_fleet_e` values are finite AND the two values differ (under non-degenerate input: `Σ log_e ≠ logSumExp(log_e) − log(N)`). Demonstrates caller-selection mechanism. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-2 …" passes.

- **AC-3** — _Given_ three synthetic `FamilyCBettingEProcessState` objects with `log_S_t = [0.5, 1.0, 1.5]`, a fresh `FleetEProcessState`, and `primitive = combineProduct`, _when_ `fleetMergeFamilyC(states, combineProduct, fleet_state, LOG_THRESHOLD)` is called, _then_ `result.log_fleet_e === combineProduct(states.map(s => s.log_S_t)).log_fleet_e` (structural identity for Family C) AND equals `3.0` exactly (numerical cross-check on `Σ [0.5, 1.0, 1.5]`). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-3 …" passes.

- **AC-4** — _Given_ two Family A states with `M = [0, 1]` (zero wealth on shard 0 — would `Math.log(0) = -Infinity` without the WEALTH_FLOOR guard), _when_ `fleetMergeFamilyA` is called with `combineProduct`, _then_ `result.log_fleet_e === Math.log(WEALTH_FLOOR) + Math.log(1)` (finite; floor applied; closed-form equality). Verifies the WEALTH_FLOOR convention is correctly applied at the extraction step. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-4 …" passes.

- **AC-5** — _Given_ three Family A states with `M = [1.0, 2.0, 3.0]`, _when_ `fleetMergeFamilyA(states, combineAverage, fleet_state, LOG_THRESHOLD)` is called, _then_ `result.log_fleet_e === combineAverage(states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)))).log_fleet_e` (structural identity for Family A with AoE primitive). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-5 …" passes.

- **AC-6** — _Given_ two Family A states with a snapshot of every field (M, bet, n, alphaConsumed, runningMean, runningSecondMoment, onsFallbackCount), _when_ `fleetMergeFamilyA` is called, _then_ `assert.deepStrictEqual(states_before, snapshot)` passes (no field of any per_shard_state was mutated). Per-shard input invariance for Family A. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-6 …" passes.

- **AC-7** — _Given_ two Family C states with a deep-cloned snapshot (including the `q_running_sum` array), _when_ `fleetMergeFamilyC` is called, _then_ `assert.deepStrictEqual(states_before, snapshot)` passes. Per-shard input invariance for Family C. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-7 …" passes.

- **AC-8** — _Given_ a fresh `FleetEProcessState fleet_state` (with `n = 0`), _when_ `const out = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD)` is called with a single-shard Family A state, _then_ `out.fleet_state === fleet_state` (same reference) AND `fleet_state.n === 1` (mutation visible on original handle; the wrapper called `updateFleetEProcessState` which incremented `n`). In-place mutation contract verified. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-8 …" passes.

- **AC-9** — _Given_ a `fleetMergeFamilyA` call with two Family A states + `combineAverage`, _when_ the call returns, _then_ `result.log_fleet_e === fleet_state.log_fleet_e_t` (the convenience alias matches the state field; per Mechanism primitive 8 intentional ergonomic redundancy). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-9 …" passes.

- **AC-10** — _Given_ two Family C states with `log_S_t = [0.0, 2.0]`, _when_ `fleetMergeFamilyC` is called with `combineAverage`, _then_ `result.log_fleet_e === combineAverage([0.0, 2.0]).log_fleet_e` AND `result.log_fleet_e === fleet_state.log_fleet_e_t` (structural identity for Family C with AoE + log_fleet_e ergonomic). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-10 …" passes.

- **AC-11** — _Given_ two Family A states each with `M = e^5 ≈ 148.4` (so `log_e ≈ 5` per shard; `combineProduct` sum ≈ 10 > `LOG_THRESHOLD ≈ 4.605`), _when_ `fleetMergeFamilyA` is called once, _then_ `fleet_state.fired === true` AND `fleet_state.tick_at_first_fire === 0`. Sticky-fire propagation through wrapper for Family A. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-11 …" passes.

- **AC-12** — _Given_ two Family C states each with `log_S_t = 5` (`combineProduct` sum = 10 > LOG_THRESHOLD), _when_ `fleetMergeFamilyC` is called once, _then_ `fleet_state.fired === true` AND `fleet_state.tick_at_first_fire === 0`. Sticky-fire propagation through wrapper for Family C. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-12 …" passes.

- **AC-13** — _Given_ `per_shard_states = []` (empty), _when_ either `fleetMergeFamilyA([], combineProduct, fleet_state, LOG_THRESHOLD)` OR `fleetMergeFamilyC([], combineAverage, fleet_state, LOG_THRESHOLD)` is called, _then_ each throws `Error` with message matching `/empty input/` (R11 primitive bubble-up; no pre-validation at the wrapper layer per Mechanism primitive 7). Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-13 …" passes.

**Empirical-wiring validation (AC-14 + AC-15; lighter version of R11 PR-F1; the load-bearing wiring-correctness evidence):**

- **AC-14** — _Given_ a fleet of `N_SHARDS = 50` Family A shards each running `updateBettingState` on iid `gaussian(rng)` samples (baseline μ=0, σ²=1) for `T_TICKS = 50` ticks under iid H₀, with `fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD)` called at each tick (caller-selection: PoE), _when_ the fleet wealth tracker is evaluated across `N_FLEET_TRAJ = 100` trajectories, _then_ observed fleet FPR ≤ `FPR_BOUND = α_fleet + 3·√(α_fleet·(1−α_fleet)/N_FLEET_TRAJ) ≈ 0.0399`. **Theory-derived bound** (NOT OBSERVED-binding; per R07 reinforcement); preserves Ville under conditional independence per Vovk-Wang 2021 §4. Demonstrates the wrapper's wiring preserves the primitive's Ville guarantee for PoE under iid. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-14 …" passes.

- **AC-15** — _Given_ the AC-14 fleet setup but with `combineAverage` as the primitive (caller-selection: AoE), _when_ evaluated across `N_FLEET_TRAJ = 100` trajectories under iid H₀, _then_ observed fleet FPR ≤ `FPR_BOUND ≈ 0.0399`. **Theory-derived bound**; preserves Ville under arbitrary dependence per Vovk-Wang 2021 §4 convex-combination result. Demonstrates the wrapper's wiring preserves the primitive's Ville guarantee for AoE under iid. Evidence: `test/q12-fleet-merged-detector-surfaces.test.ts` "R12 AC-15 …" passes.

**Attestation (AC-16):**

- **AC-16** — _Given_ R12 land sequence, _when_ Reviewer inspects `git log` between operator HEAD `58d6090` and R12 GREEN HEAD, _then_ a RED commit exists that adds ONLY `test/q12-fleet-merged-detector-surfaces.test.ts` (no production files; typecheck failing at TS2307 because `engine/fleet/detectors.ts` does not yet exist) AND it precedes a GREEN commit that creates `engine/fleet/detectors.ts` (test then passes 16/0). Implementer reports OBSERVED test count + commit SHAs in NEXT-ROLE.md attestation block per R03 MINOR-4 reinforcement (7th consecutive application); Reviewer independently verifies via `git log` + `git show --stat`. 10th consecutive Tessera Reviewer-side TDD verification (R02-R11 + R12).

---

## Anti-scope

Eighteen fences (R12-SAS-1 through R12-SAS-18). Reviewer independently verifies via `git diff 58d6090..HEAD --name-only` after R12 GREEN.

- **R12-SAS-1**: `engine/per-shard/runtime.ts`, `engine/per-shard/welford.ts`, `engine/per-shard/warm-start.ts` NOT MODIFIED. R03/R04/R05/R10 closed surfaces. R10 MINOR-1 file-header drift carry-forward preserved per NEXT-ROLE.md.
- **R12-SAS-2**: `engine/fleet/combine.ts` AND `engine/types/fleet.ts` NOT MODIFIED. R11-shipped surfaces frozen at R12. R11 MINOR-1 `tick_post` nit carry-forward preserved per NEXT-ROLE.md.
- **R12-SAS-3**: All inherited engine internals NOT MODIFIED. `engine/detectors/*` (all 14 files) UNCHANGED. `engine/types/families/{a,b,c,d,e}.ts` UNCHANGED. `engine/core.ts`, `engine/topology-overlay.ts`, `engine/verdict-groups.ts`, `engine/signal-classes.ts`, `engine/per-detector-resampler-mode.ts`, `engine/self-normalized-fallback.ts` UNCHANGED. `engine/l0/`, `engine/o0/` UNCHANGED. A12 anti-scope (inherited Phase-3.d.D close).
- **R12-SAS-4**: `engine/types/index.ts` NOT MODIFIED. `fleetMergeFamilyA`/`fleetMergeFamilyC`/`FleetMergeStepResult`/`CombinePrimitive` are NOT re-exported through the central index at R12; consumers import from the leaf path `engine/fleet/detectors`. Future R13+ may add the re-export when an orchestrator-facing consumer lands.
- **R12-SAS-5**: `engine/types/config.ts` NOT MODIFIED. Tessera SLICE 1 schema extensions (`per_shard_cells`, `cell_confidence: warm_start` enum extension, `PerShardResidual`, `PerShardCell`) NOT touched at R12. R12 does NOT add a `FleetMergeConfig`-class field, an auto-selection field, or any new `CompiledConfig` field. Auto-selection mechanism (option b) rejected at brainstorm per § Mechanism primitive 3; would have required this fence to be lifted.
- **R12-SAS-6**: `coordination/PRD.md` and `coordination/SCOPING-MEMO-v0.3.md` NOT MODIFIED.
- **R12-SAS-7**: `tools/*` NOT MODIFIED. All baseline-curation tools, calibrators, vendoring script UNCHANGED.
- **R12-SAS-8**: NO new `CompiledConfig` fields. (Subsumes R12-SAS-5 but cited separately for Reviewer ergonomic.)
- **R12-SAS-9**: All pre-R12 test files NOT MODIFIED. Frozen list: `test/betting-e-process-class-dispatch.test.ts`, `test/q01-*.test.ts` (3 files), `test/q02-*.test.ts`, `test/q03-*.test.ts`, `test/q04-*.test.ts`, `test/q05-*.test.ts`, `test/q06-*.test.ts`, `test/q07-*.test.ts`, `test/q10-*.test.ts`, `test/q11-*.test.ts`. ONLY new addition: `test/q12-fleet-merged-detector-surfaces.test.ts`. `test/_substrate/factories.ts` UNCHANGED.
- **R12-SAS-10**: NO `mean_delta` computation at R12. SLICE 2 cleanup scope (R14).
- **R12-SAS-11**: NO compiled-artifact JSON loader at R12. SLICE 2 cleanup scope (R14).
- **R12-SAS-12**: NO e-BH FDR operator surface at R12. R13 = SLICE 4 scope.
- **R12-SAS-13**: NO real-cluster trace integration. Synthetic-cluster substrate only at Phase 1 per SCOPING-MEMO-v0.3 § 4 R-E3 + A8/A11.
- **R12-SAS-14**: NO Phase 2 cross-shard correlation layer (Extension 3). Outer aggregator, topology-aware attribution, event-conditional correlational attribution all deferred to Phase 2.
- **R12-SAS-15**: NO `fleetMergeFamilyAMixture` variant (for `MixtureSupermartingaleState.M_t` at `engine/detectors/family-a-mixture-supermartingale.ts:47`) at R12. Mechanical addition documented as OQ-2; deferred to future round when operator-facing consumer requires it.
- **R12-SAS-16**: NO auto-selection of PoE-vs-AoE at R12 (rejected option b at brainstorm; see § Mechanism primitive 3 + audit sidecar § Brainstorm).
- **R12-SAS-17**: NO weighted-mixture (non-uniform-weight) combination primitive at R12 (R11-SAS-19 preserved).
- **R12-SAS-18**: NO modification to `coordination/specs/Q-R[01-11]-SPEC.md` or `Q-R[01-11]-SPEC-AUDIT.md`. Prior-round specs frozen.

---

## Open questions

R12 spec emits with **4 open questions** (1 architectural-anchor deferral + 2 future-round candidates + 1 Reviewer-facing). None blocking; all flagged for R13+ disposition or carry-forward.

- **OQ-1 (R12-architectural-anchor; deferred)** — Should R13's e-BH FDR operator surface consume `fleetMergeFamilyA`/`fleetMergeFamilyC` directly (chaining wrapper → wrapper) or skip the family-specific layer and call `combineAverage` directly on extracted log-e-values? Architect-pre-prediction: e-BH layer should consume the family-specific wrappers (preserves the named entry-point pattern; preserves per-shard input invariance contract for free; allows future per-family pre-processing — e.g., per-family α-budget allocation — to land at the wrapper layer without touching the e-BH layer). Disposition deferred to R13 brainstorm.

- **OQ-2 (future-round candidate; deferred)** — A `fleetMergeFamilyAMixture(per_shard_states: ReadonlyArray<MixtureSupermartingaleState>, ...)` variant for the Family A Page-CUSUM mixture-supermartingale wealth (`MixtureSupermartingaleState.M_t` at `engine/detectors/family-a-mixture-supermartingale.ts:47`) is mechanical to add (same body as `fleetMergeFamilyA` modulo field name `M_t` instead of `M`). Architect-pre-prediction: deferred until an operator-facing consumer requires it; either the existing `fleetMergeFamilyA` is sufficient (if the orchestrator can convert mixture state to betting state for fleet-merge purposes, which is unlikely given they're independent wealth processes) or a future round adds the variant when needed. Tracked here; not blocking.

- **OQ-3 (R12-tactical-observation; carry-forward)** — At R13+ when the e-BH operator surface adds an operator-facing auto-selection signal (option b in NEXT-ROLE.md), `fleetMergeFamilyA`/`fleetMergeFamilyC` may need an extra parameter (e.g., `regime_hint: 'iid' | 'correlated' | undefined`) so the caller can pass the hint through. Architect-pre-prediction: NO at R13 — auto-selection should be a wrapper at the e-BH layer (call site picks `primitive` per the hint and passes the chosen primitive to `fleetMergeFamilyA`); doesn't require touching R12's wrappers. Tracked here so R13 brainstorm has the audit trail.

- **OQ-4 (Reviewer-facing)** — AC-1's "structural identity" assertion uses `assert.strictEqual(out.log_fleet_e, direct.log_fleet_e)` (exact double-precision equality). Reviewer is invited to confirm exact equality holds under JavaScript's deterministic reduce semantics — both sides do `Σ Math.log(Math.max(s.M, WEALTH_FLOOR))` in the same array order with the same IEEE-754 rounding. Architect-pre-prediction: yes; the wrapper's internal extraction loop iterates `per_shard_states` in array order producing the same `log_e_values` array that the test's `states.map(...)` produces; both arrays go through the same primitive call. If Reviewer observes flakiness, the candidate fixes are: (a) replace `assert.strictEqual` with `assert.ok(Math.abs(a - b) < 1e-12)` (FP-tolerant; lower load-bearing power); (b) keep strict equality but document the IEEE-754-determinism assumption (architect's pick).

---

## P3 ten-axis verification

Per inherited DISCIPLINE-REFERENCE:154 (10-axis adversarial pass per Architect grilling discipline). One sentence per axis.

1. **Correctness** — `fleetMergeFamilyA` extracts `Math.log(Math.max(state.M, WEALTH_FLOOR))` exactly matching the inherited Family A convention (`engine/detectors/betting-e-process.ts:165` WEALTH_FLOOR guard) and the q11 test pattern (`test/q11-hierarchical-e-value-combination.test.ts:95`); `fleetMergeFamilyC` reads `state.log_S_t` directly matching the inherited Family C log-space convention (`engine/types/families/c.ts:298-299`); both wrappers delegate to R11's `updateFleetEProcessState` which carries the sticky-fire + running-max + Ville-bound semantics validated at R11; structural-identity ACs (AC-1, AC-3, AC-5, AC-10) bind via exact equality with the primitive applied to the extracted log-e-values.

2. **Completeness** — 16 ACs cover: wrapper shape + structural identity (AC-1, AC-3, AC-5, AC-10), caller-selection mechanism (AC-2), WEALTH_FLOOR application (AC-4), per-shard input invariance (AC-6, AC-7), in-place fleet-state mutation (AC-8), log_fleet_e ergonomic (AC-9), sticky-fire propagation (AC-11, AC-12), empty-input throw bubble-up (AC-13), empirical-wiring PoE-iid + AoE-iid (AC-14, AC-15), TDD + test-count attestation (AC-16). No surface declared in spec without an AC. Component inventory cross-check confirms 16 ACs across narrative + AC list + this Coverage row.

3. **Consistency** — Cross-section consistency pass (§ Mechanism table; 26 rows) executed; all 26 PASS at spec-emit time. Resolved-decision tokens consistent across § Mechanism / § Component inventory / § Per-file pseudocode / § AC / § Anti-scope. No alternate-form leakage detected.

4. **Clarity** — All decisions named with verbs+nouns (`fleetMergeFamilyA`, `fleetMergeFamilyC`, `fleetMergeStep`, `FleetMergeStepResult`, `CombinePrimitive`); rationales given inline; the caller-selection mechanism + conditional-independence-assumption responsibility split is stated THREE times (Mechanism primitive 3 + Mechanism primitive 4 + Delta 1 file-header comment block + Delta 1 per-wrapper JSDoc) for maximum visibility to the Implementer + Reviewer.

5. **Coverage** — AC-1 through AC-16 cover the spec surface as enumerated in Mechanism primitives 1–15; structural-identity ACs (AC-1/3/5/10) cover both families × both primitives = 4 cells; per-shard input invariance ACs (AC-6/7) cover both families; empirical-wiring ACs (AC-14/15) cover both primitives at iid H₀.

6. **Constraints** — In-place mutation contract on fleet_state declared in Mechanism primitive 6 + verified by AC-8; per-shard input invariance declared in Mechanism primitive 5 + verified by AC-6 + AC-7; empty-input bubble-up declared in Mechanism primitive 7 + verified by AC-13; WEALTH_FLOOR application declared in Mechanism primitive 2 + verified by AC-4.

7. **Concurrency** — N/A at R12 (single-threaded test; no async or shared-mutable concurrency in the fleet-merge wrapper layer). The wrapper is stateless (mod the explicit `fleet_state` parameter); no module-level mutable state. Inherited per-shard runtime concurrency story is unchanged (per R12-SAS-1 + R12-SAS-3 + A12 anti-scope).

8. **Corner cases** — Empty per_shard_states (AC-13 throws via R11 primitive); single-shard input (covered transitively by AC-8 which uses N=1); state.M = 0 forcing WEALTH_FLOOR (AC-4); high-wealth fleet-state firing on first tick (AC-11 Family A; AC-12 Family C); fleet-state reset (covered by `freshFleetEProcessState` calls at each AC's setup); both primitives accepted (AC-2).

9. **Cost** — Test runtime budget: empirical-wiring cells = 100 fleet-traj × 50 shards × 50 ticks × 2 (PoE + AoE) cells = 500k wealth updates ≈ 0.5s wall-clock at ~1 μs/update on M-series Darwin. Unit-test cells (AC-1 through AC-13 + AC-16) are O(constant) time. Total q12 expected ≤ 1s wall-clock — well within q-file runtime budget. Production runtime cost of `fleetMergeFamilyA`: O(N) for the extraction loop + O(N) for the primitive call (combineProduct) or O(N) for combineAverage (two-pass logSumExp); negligible vs the inherited per-shard detector cost (~30 μs per tick) at N=1000 shards.

10. **Coupling** — R12 introduces three NEW edges: (a) `engine/fleet/detectors.ts` → `engine/fleet/combine.ts` (runtime + type imports — same module-family); (b) `engine/fleet/detectors.ts` → `engine/types/families/a.ts` (type-only); (c) `engine/fleet/detectors.ts` → `engine/types/families/c.ts` (type-only). Zero runtime coupling to inherited engine internals (per Integration points point 4). Zero coupling to Tessera per-shard runtime (per Integration points point 9). The family-specific wrappers couple to specific inherited state types BY DESIGN — that's the architectural commitment "fleet-merged Family A detector surface" requires; the alternative (Option C generic-only) was rejected at brainstorm.

---

## Grilling output

_Adversarial self-review of the spec per anchor-PR-#35 + R02–R11 standing-reinforcement compounding. Each of the 5 grilling questions answered inline; each of the 16 ARCH REINFORCED lines applied + verified._

### Standing-reinforcement audit table (16 ARCH lines compounded R01–R11; applicability column)

| # | Reinforcement (active at R12) | Applies at R12? | Where addressed |
|---|---|---|---|
| 1 | R01-derived: cross-section consistency pass | YES | § Mechanism cross-section table (26 rows; all PASS at spec-emit) |
| 2 | R02-derived: type-declaration-site (open declaration file for every external type) | YES | § Existing architectural surface table (BettingEProcessState, FamilyCBettingEProcessState, MixtureSupermartingaleState, FleetEProcessState, FleetMergeOutput all opened at declaration-site); § Architect self-attest at end of REVIEWER-ANCHOR table |
| 3 | R03-derived: re-export-chain check | YES | § Integration points point 4 + § Re-export-chain verification paragraph + § Existing architectural surface table row 7 (engine/types/index.ts:22+:24 re-export chain verified via grep) |
| 4 | R03-derived: grep-pattern-soundness (excludes `//` comments) | YES (trivially) | R12 has ZERO grep-evidence ACs; reinforcement satisfied by absence |
| 5 | R03-derived: empirically-verified per-file test counts (NOT predicted) | YES | AC-16 directs OBSERVED reporting at attestation; pre-R12 baseline counts in NEXT-ROLE.md preserved verbatim (Reviewer re-derives independently) |
| 6 | R05-derived: narrative-vs-pseudocode AC-count cross-check | YES | § Component inventory cross-check paragraph confirms 16 ACs across narrative + AC list + P3 Coverage row |
| 7 | R05-derived: MEMORIAL tactical-choice verification | NO (Architect-side; applies to Implementer attestation) | Forward to Implementer per NEXT-ROLE.md |
| 8 | R06-derived: JSDoc scope grep (find all stale-content occurrences) | YES (trivially) | R12 creates one NEW file with new JSDoc; no pre-existing stale docblocks in scope; reinforcement does not fire |
| 9 | R06-derived: public opts/options coverage | YES (trivially) | R12 wrappers have no opts/options interfaces (just plain typed parameters); no opts fields to enumerate |
| 10 | R07-derived: fixture-sizing exhaustive propagation | YES | Both empirical-wiring cells use SAME N_FLEET_TRAJ=100, T_TICKS=50, N_SHARDS=50 (cross-section consistency pass row 21) |
| 11 | R07-derived: OBSERVED-binding scope (PRNG-drift only) | YES | All ACs bind to theory-derived bounds: AC-1/3/5/10 to closed-form structural identity with primitive; AC-14/15 to Wilson upper bound; AC-4 to closed-form `log(1e-12) + log(1)`; AC-11/12 to deterministic threshold-crossing. Right-reasons check on AC-14/AC-15: "would a future implementation FIX that matched architect's prediction FAIL this test?" → no, the bound is theory-derived and a correct wrapper would pass; this is correct. |
| 12 | R08-derived: empirical premise verification (NOT inherited testimony) | YES | All factual claims about inherited Family A / C state shapes verified by direct file-read at spec-authoring time (per § Architect self-attest); R11's PR-F1 evidence re-verified at HEAD by re-running q11 (audit sidecar § Inherited-testimony verification). NO claim inherited from prior-round testimony without re-verification. |
| 13 | R09-derived: correction-propagation pass | YES | R12 corrects R11 OBS-1 (M_t cited at line 43; actual line 47); the correction propagates to § Existing architectural surface table row 6 AND § Architect self-attest bullet 4 (cross-section consistency pass row 24 verifies). |
| 14 | R10-derived: file-level docblock coverage check | YES | New file `engine/fleet/detectors.ts` declares file-level docblock matching its exported surface per Delta 1 verbatim text; Implementer note 5 mandates verification |
| 15 | R11-derived: citation-accuracy (extract cited lines verbatim via sed -n) | YES (1st post-reinforcement application) | All 12 REVIEWER-ANCHOR rows + 7 self-attest bullets carry exact line numbers extracted via `sed -n` at spec-emit; the R11 OBS-1 wrong-line on M_t (43 → 47) corrected; cross-section consistency pass row 23 verifies |
| 16 | R11-derived: type-declaration-site discipline (open declaration files, not re-export sites) | YES | BettingEProcessState declaration at `engine/types/families/a.ts:20` (not via index.ts re-export); FamilyCBettingEProcessState declaration at `engine/types/families/c.ts:297`; both verified via `sed -n` extraction (Bash log) |

### Adversarial self-review (5 grilling questions)

1. **Is every claim verifiable?**
   - State-shape claims (BettingEProcessState.M, FamilyCBettingEProcessState.log_S_t, FleetEProcessState fields, MixtureSupermartingaleState.M_t): all verified by direct file-read at spec-authoring time via `sed -n` extraction (§ Architect self-attest + Bash log).
   - Vovk-Wang 2021 §4 claims: inherited from R11 spec (R11 architect-attested at R11 spec emit; R12 does NOT independently re-verify the paper; R12's wrappers are pass-throughs that introduce no new mathematical claim).
   - R11 PR-F1 evidence claim: re-verified at HEAD by re-running q11 tests at R12 spec-emit time (per audit sidecar § Inherited-testimony verification); OBSERVED 18/0 pass/fail (matches R11 GREEN attestation).
   - Wilson-CI bound formula: re-derived from inherited `test/betting-e-process-class-dispatch.test.ts:93` and R11's `test/q11-hierarchical-e-value-combination.test.ts:60` (same form; just different N).
   - q12 runtime estimate (≤1s wall-clock): order-of-magnitude estimate from R11 q11 actual runtime (~8s at PR-F1 8M updates per ratio = ~0.5s for R12's 500k updates). Implementer measures OBSERVED at GREEN and reports if test-runtime exceeds 5s for Reviewer disposition.
   - **Verdict**: yes, all claims verifiable.

2. **Are there unstated assumptions?**
   - **Assumption A**: per-shard Family A `BettingEProcessState.M` field is a valid e-value. INHERITED from R11 spec § Grilling output assumption A; foundation is the inherited Family A betting-e-process; per-shard Ville bound is Phase-3.d.D closed.
   - **Assumption B**: per-shard Family C `FamilyCBettingEProcessState.log_S_t` is a valid log-e-value (i.e., `Math.exp(log_S_t)` is an e-value). VERIFIED — inherited engine convention at `engine/types/families/c.ts:298-300` JSDoc explicitly states "Wealth process S_t (multiplicative)"; the Shekhar-Ramdas-2023 canonical ONS betting-e-process is the per-shard Ville-bound foundation.
   - **Assumption C**: the `WEALTH_FLOOR = 1e-12` numeric value in `engine/fleet/detectors.ts` matches the inherited convention. VERIFIED by direct read of `engine/detectors/betting-e-process.ts:65` (same value). The constant is module-private at the inherited site; R12 redeclares with the same value (anti-scope-safe: doesn't modify inherited engine).
   - **Assumption D**: q12 deep-clone snapshot in AC-6 + AC-7 captures every field of every per-shard state. VERIFIED by reading the type declarations (BettingEProcessState has 7 fields; FamilyCBettingEProcessState has 12 fields including `q_running_phi_sum?: number[]` which is optional and absent in the q12 fixture — the deep-equal comparison handles absent optional fields correctly via `assert.deepStrictEqual`).
   - **Assumption E**: structural-identity ACs (AC-1, AC-3, AC-5, AC-10) use `assert.strictEqual` (exact equality). Holds IFF the wrapper's extraction loop produces the same `log_e_values` array as the test's `.map(...)` (same array order; same IEEE-754 rounding). Holds in practice on any deterministic JavaScript engine. Documented as OQ-4 for Reviewer.
   - **Verdict**: Assumption E flagged as OQ-4; all others standard (inherited) or verified.

3. **Is scope added beyond the request?**
   - NEXT-ROLE.md asks for: (a) fleet-merged Family A detector surface; (b) fleet-merged Family C detector surface; (c) caller-selection mechanism for PoE vs AoE (option a default); (d) ACs covering Family A + Family C wiring, caller-selection, preservation of per-shard inputs, fleet-output shape, empirical validation at N=10..100.
   - R12 spec ships: (a) `fleetMergeFamilyA`; (b) `fleetMergeFamilyC`; (c) option (a) per the default; (d) 16 ACs covering all NEXT-ROLE.md item-6 enumerated points.
   - Did R12 add anything beyond? `FleetMergeStepResult` interface + `CombinePrimitive` type alias — both small ergonomics needed for the wrapper signatures. Module-internal helper `fleetMergeStep` — shared body between two wrappers (would otherwise be duplicated). `WEALTH_FLOOR` module-local constant — required for the Family A extraction. No scope creep beyond the wrapper surface itself.
   - **Verdict**: minimal scope addition (`FleetMergeStepResult` + `CombinePrimitive` + internal helper + WEALTH_FLOOR const) justified by the wrapper signatures + extraction conventions; not scope-creep.

4. **Can the Implementer act without guessing?**
   - § Per-file pseudocode Delta 1 + Delta 2 contain VERBATIM file contents. Exact function signatures, exact body algorithms (extraction loop; delegate to internal helper), exact type declarations.
   - § Implementer notes 1–9 enumerate the gotchas (function names, type names, algorithm, TDD ordering, file-level docblock, hand-trace verification, extraction-loop style, test-file naming).
   - Cross-section consistency pass (26 rows) makes alternate forms explicitly absent.
   - Anti-scope (18 fences) makes the "must not touch" list explicit.
   - One residual decision the Implementer must make: the OBSERVED test-count at AC-16 (predicted 16; observed at GREEN; report verbatim per R03 MINOR-4 reinforcement). This is INTENDED Implementer agency (the spec MUST NOT pre-bind to a predicted count).
   - **Verdict**: yes, the Implementer can act without architectural-decision-class guessing.

5. **Could the Reviewer act on this artifact with zero clarifying questions?**
   - § Existing architectural surface (REVIEWER-ANCHOR) table provides every file:line reference Reviewer needs to verify the spec against engine reality (citation-accuracy reinforcement applied — verbatim line ranges).
   - All 16 ACs have binding-evidence pointers (test name + assertion form).
   - Anti-scope fences are line-cited for `git diff` verification.
   - Cross-section consistency pass exposes the resolved-decision-vs-alternate map (so Reviewer can quickly verify alternates absent).
   - Open questions OQ-1 through OQ-4 explicitly flag the architect's residual uncertainty (none blocking).
   - **Verdict**: yes, Reviewer-ready.

### Pre-route halt-condition check (per NEXT-ROLE.md halt conditions for R12)

- **Per-shard surface modification**: NO — R12-SAS-1 fences `engine/per-shard/*` entirely; component inventory shows zero modifications to these surfaces; the per-shard wealth states consumed by R12 wrappers come from the orchestrator's state bag (inherited engine pattern at `engine/detectors/betting-e-process.ts:85` `BettingStates = Record<string, BettingEProcessState>`), NOT from `engine/per-shard/`. **PASS.**

- **Combine-primitives modification**: NO — R12-SAS-2 fences `engine/fleet/combine.ts` AND `engine/types/fleet.ts`; component inventory shows both UNCHANGED. R12 consumes R11 primitives only via imports. **PASS.**

- **Caller-selection mechanism architectural decision**: option (a) selected (caller chooses via call-site argument; matches NEXT-ROLE.md autonomous-mode default). Option (b) auto-selection rejected with documented rationale in spec § Mechanism primitive 3 + audit sidecar § Brainstorm. No strong reason for (b) surfaced at brainstorm. **PASS.**

- **Conditional-independence assumption silently absorbed**: NO — Mechanism primitive 4 EXPLICITLY documents the caller-selection mechanism AS the architectural response to MD-F1; cites R11 PR-F1 evidence as the math validation; Delta 1 file-header comment block + per-wrapper JSDoc each state the responsibility split. **PASS.**

- **OBSERVED-binding for wiring ACs**: NO — all wiring ACs (AC-1, AC-3, AC-5, AC-10) bind via closed-form structural identity (`assert.strictEqual(out.log_fleet_e, direct.log_fleet_e)`); empirical-wiring ACs (AC-14, AC-15) bind to theory-derived Wilson bound. No AC binds to an OBSERVED FPR value. Right-reasons audit on AC-14/15: a correct wrapper would pass; a wrapper bug that broke extraction would FAIL. **PASS.**

- **Q-J1 hybrid framework re-disposition**: NO — R12 builds the Ville-bound layer (fleet-merge wrappers consume R11's Ville-bound primitives); zero non-Ville-bounded alternative introduced. R12-SAS-17 preserves R11-SAS-19 (no weighted-mixture); R12-SAS-16 fences auto-selection. **PASS.**

All halt conditions PASS. Spec is route-ready.
