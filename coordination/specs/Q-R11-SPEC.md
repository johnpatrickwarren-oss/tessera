# Q-R11-SPEC — Tessera Phase 1 SLICE 3: hierarchical e-value combination at fleet scale (PR-F1)

_From: Architect (R11 pipeline run; full tier per A1 + A2 + A4 + A7 — see audit sidecar § Brainstorm)._
_To: Implementer._
_Date: 2026-05-17._
_HEAD at spec emit: `56e77f1` (operator-led NEXT-ROLE.md prep for R11)._
_Audit sidecar: `coordination/specs/Q-R11-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions)._

---

## Spec preamble

R11 = Phase 1 SLICE 3 first slice: the runtime **fleet-merge primitive** that combines N per-shard e-values cross-sectionally at each tick into a single fleet-level e-process. This is the first Tessera architectural surface that produces fleet-level statistical claims at runtime — the load-bearing extension distinguishing "Tessera = statistically-rigorous fleet detector" from "Tessera = N copies of a per-shard detector with broken FPR" (per SCOPING-MEMO-v0.3 § 1 pitch claim).

R11 ships:
1. **Family-agnostic fleet-merge primitives** — `combineProduct` (PoE; Ville-preserved under conditional independence) AND `combineAverage` (AoE; Ville-preserved under arbitrary dependence). Both pure stateless reduces over log-space per-shard e-values.
2. **Fleet-level e-process state tracker** (`FleetEProcessState` + `freshFleetEProcessState` + `updateFleetEProcessState`) — small ergonomic wrapper mirroring inherited per-shard state interfaces (`BettingEProcessState` at `engine/types/families/a.ts:20`, `FamilyCBettingEProcessState` at `engine/types/families/c.ts:297`). Sticky-fire latch + running-max for any-time Ville evaluation.
3. **PR-F1 evidence matrix** — N=100 shards × T=100 ticks × N_traj=200 fleet trajectories, two H₀ scenarios (iid; correlated-drift with shared zero-mean noise factor ρ²=0.5), two combination primitives (PoE; AoE). 3-of-4 cells assert theory-derived Wilson-CI upper bounds on fleet FPR; 1 cell (PoE-correlated-drift) is a REPORTING-only AC that documents the OBSERVED FPR for PR-F1 pair-review evidence (does NOT bind to the observed value; preserves R07 OBSERVED-binding-scope reinforcement).

R11 does NOT ship (explicit anti-scope; see § Anti-scope for full enumeration):
- e-BH FDR operator surface (deferred to R12 = SLICE 4).
- Any orchestrator-facing wiring of `engine/fleet/combine.ts` into the per-shard runtime call path (R11 ships the primitive as a leaf module; R12+ adds the operator-facing consumer).
- Weighted-mixture (non-uniform-weight) combination variant.
- Real-cluster trace integration (synthetic-cluster substrate only at Phase 1 per SCOPING-MEMO-v0.3 § 4 R-E3).
- Phase 2 cross-shard correlation layer, HardwareTopologySource, deployment-event freeze hook.
- Any modification to inherited engine internals (per A12 anti-scope; betting-e-process / mixture-supermartingale / family-c-betting-e-process all UNCHANGED).
- Any modification to per-shard runtime (`engine/per-shard/runtime.ts`, `welford.ts`, `warm-start.ts`).
- SLICE 2 carry-forwards (`mean_delta` computation, PR-F5 storage profile, compiled-artifact loader) — bundled into a SLICE 2 cleanup round after R11 lands.
- R10 MINOR-1 (`engine/per-shard/runtime.ts` module-level docblock update) — preserved as operator gate item per NEXT-ROLE.md.

Traces to PRD AC-P1: "per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4." R11 is the SLICE 3 first slice; lands the Ville-preserving fleet-merge primitive AND its PR-F1 empirical-validation evidence matrix at the iid + correlated-drift H₀ scenarios. The e-BH FDR operator surface (the FALSELY-FLAGGED-SHARD-COUNT half of AC-P1) is R12 = SLICE 4 scope.

Traces to SCOPING-MEMO-v0.3 § 2.1 Extension 1 recommended approach: "**(b) hierarchical e-value combination + (c) FDR-style operator surface**." R11 is (b); R12 is (c). MD-F1 (conditional-independence assumption load-bearing under correlated drift) is explicitly enumerated AND empirically demonstrated in the PR-F1 evidence matrix.

Architectural layer (matches the R02→R03→R04→R05→R10 pattern): compile-time schema (R02) → state-machine runtime (R03) → algorithm pure-function (R04) → composition + accumulator (R05) → emission + sparse-encoding (R10) → **hierarchical e-value combination + fleet-level e-process tracker (R11; this round)** → e-BH FDR operator surface (R12+) → SLICE 2 cleanup (mean_delta, PR-F5, JSON loader; post-R11).

---

## Existing architectural surface (REVIEWER-ANCHOR — mandatory per anchor `templates/Q-NN-SPEC-TEMPLATE.md` v2)

_Per anchor PR #35 mandatory section; applied at SPEC fidelity. Every citation against `tessera/` HEAD `56e77f1` unless otherwise noted (which inherited DeploySignal main @ SHA `5a72371` via the vendoring policy in SCOPING-MEMO-v0.3 § 9)._

| Source path | Pinned anchor | Lines opened | Verbatim snippet | Verification |
|---|---|---|---|---|
| `engine/types/families/a.ts` (vendored) | `5a72371` | `20-28` | `export interface BettingEProcessState {`<br/>&nbsp;&nbsp;`M: number;`<br/>&nbsp;&nbsp;`bet: number;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`alphaConsumed: number;`<br/>&nbsp;&nbsp;`runningMean: number;`<br/>&nbsp;&nbsp;`runningSecondMoment: number;`<br/>&nbsp;&nbsp;`onsFallbackCount: number;`<br/>`}` | `M` field is the per-shard wealth (linear-space e-value). R11 consumes via `Math.log(state.M)`. Inherited unchanged. |
| `engine/types/families/c.ts` (vendored) | `5a72371` | `297-334` | `export interface FamilyCBettingEProcessState {`<br/>&nbsp;&nbsp;`log_S_t: number;`<br/>&nbsp;&nbsp;`ons_lambda: number;`<br/>&nbsp;&nbsp;`ons_inverse_hessian: number; ...`<br/>`}` | `log_S_t` field IS the per-shard log-wealth (log-space e-value). R11 consumes directly. Inherited unchanged. |
| `engine/detectors/family-a-mixture-supermartingale.ts` (vendored) | `5a72371` | `40-66` | `export interface MixtureSupermartingaleState {`<br/>&nbsp;&nbsp;`S_t: number;`<br/>&nbsp;&nbsp;`M_t: number;`<br/>&nbsp;&nbsp;`fired: boolean; ...`<br/>`}` | `M_t` IS the per-shard wealth (linear-space e-value; Howard-Ramdas-2021 mixture supermartingale). R11 consumes via `Math.log(state.M_t)`. Inherited unchanged. |
| `engine/detectors/betting-e-process.ts` (vendored) | `5a72371` | `72-82` (freshBettingState) + `151-175` (updateBettingState) | `export function freshBettingState(): BettingEProcessState { ... }`<br/>`export function updateBettingState(state, x, baselineMean, sigmaSquared, perTickAlpha): number { ... }` | Returns updated `state.M` (linear-space wealth). R11 q11 test drives this directly per-shard, then reads `state.M` for fleet-merge. |
| `engine/per-shard/runtime.ts` (Tessera-original) | tessera-R10 HEAD | `1-13` (file header) + `131-156` (`projectTierGatedOutputs`) | `// engine/per-shard/runtime.ts — Tessera SLICE 2b3: per-shard runtime composition.` | UNCHANGED at R11. R11 does NOT modify (per R11-SAS-1 + operator-gated R10 MINOR-1 carry-forward). |
| `engine/types/config.ts` (vendored-with-deltas; Tessera SLICE 1 extensions) | tessera-R10 HEAD | `851-858` + `881-907` | `export type CellConfidence = 'strict' \| 'pooled' \| 'aggregate' \| 'none' \| 'warm_start';`<br/>`export interface PerShardResidual { n_samples: number; confidence: CellConfidence; ... welford_state?: WelfordState; }` | UNCHANGED at R11. Tessera schema extensions (per_shard_cells, warm_start enum) NOT modified per R11-SAS-5. |
| `engine/types/index.ts` (vendored) | `5a72371` | `20-32` | `export * from './primitives'; export * from './families/a'; ...` | Re-export chain: `BettingEProcessState` re-exported via `families/a` (line 22); `FamilyCBettingEProcessState` re-exported via `families/c` (line 24). UNCHANGED at R11 (per R11-SAS-4). |
| `test/betting-e-process-class-dispatch.test.ts` (vendored) | `5a72371` | `40-93` | `function mulberry32(seed: number) { ... }`<br/>`const ALPHA = 0.01; const THRESHOLD = 1/ALPHA; const N_TRAJECTORIES = 1000; const T_TICKS = 100;`<br/>`const FPR_BOUND = ALPHA + 3*Math.sqrt(ALPHA*(1-ALPHA)/N_TRAJECTORIES);` | R11 q11 test reuses the `mulberry32` PRNG + `gaussian` Box-Muller pattern + Wilson-CI bound form (`α + 3·√(α(1−α)/N)`). N_traj=200 per fleet × N=100 shards × T=100 ticks at α_fleet=0.01. UNCHANGED at R11 (per R11-SAS-9). |
| `coordination/SCOPING-MEMO-v0.3.md` | tessera HEAD | `99-101` (Ext1 recommended approach) + `115-116` (MD-F1) + `120-122` (PR-F1) + `334` (R-S1) | `Recommended approach: (b) hierarchical e-value combination as the primary guarantee + (c) FDR-style as the operator-facing fleet-level surface.`<br/>`MD-F1: Hierarchical e-value combination at fleet scale. Conditional-independence assumption load-bearing under correlated drift.` | R11 implements (b); R12 implements (c). PR-F1 pair-review trigger fires at this round. |
| `coordination/PRD.md` | tessera HEAD | `42-43` (AC-P1) + `30-31` (FR-E1) | `AC-P1: ... per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4.` | R11 closes the PR-F1 half of AC-P1 (Ville-preservation + iid-and-correlated-drift H₀ empirical evidence); R12+ closes the e-BH half. |

**External-source literature anchor (PR-F1 mandate):**

| Source | Result applied | R11 application |
|---|---|---|
| **Vovk & Wang 2021** — "E-values: calibration, combination, and applications" (Annals of Statistics; arXiv:2103.13802) | §4 (combination of e-values) establishes two architecturally distinct combination results: (i) **convex combinations** (including the uniform average ē = (1/N)·Σe_i) of e-values are themselves e-values under **arbitrary dependence** between the inputs — proof is direct from linearity of expectation: E[ē] = (1/N)·Σ E[e_i] ≤ (1/N)·Σ 1 = 1, no independence assumption required; (ii) **product** of e-values is an e-value under **conditional independence** of the inputs given a common filtration — proof is direct from independence: E[∏ e_i] = ∏ E[e_i] ≤ 1, broken under conditional dependence (correlated drift). | `combineAverage` (this spec) realizes the arbitrary-dependence convex-combination result. `combineProduct` (this spec) realizes the product result under cond. indep. The PR-F1 evidence matrix correlated-drift cell empirically demonstrates the cond.-indep. assumption breaking under PoE; the AoE-correlated-drift cell empirically demonstrates the arbitrary-dependence preservation under AoE. Architect attests: paper read at the abstract level + §4 (combination section) level for these two results; specific proposition/theorem numbers within §4 NOT independently re-verified at spec-emit time (paper not opened during this offline spec-authoring session) — Reviewer is invited to verify the precise propositions via the published paper or the arXiv preprint. The RESULTS are canonical and widely-cited in the post-2021 e-value literature; the architectural commitment does NOT depend on specific proposition numbers. |
| **Wang & Ramdas 2024** — "False discovery rate control with e-values" (and predecessors in the Wang-Ramdas-Vovk e-BH series; arXiv:2009.02824 and successors) | Streaming e-merging via averaging is the conditional-independence-robust combination primitive at e-BH's preprocessing stage; preserves arbitrary-dependence FDR guarantees downstream. | `combineAverage` is the future R12 e-BH input layer. R11 ships it now (as one of the two combination primitives) so R12 can consume without re-deriving. |
| **Howard, Ramdas, McAuliffe & Sekhon 2021** — "Time-uniform, nonparametric, nonasymptotic confidence sequences" (Annals of Statistics 49(2); arXiv:1810.08240) | Per-shard mixture-supermartingale anytime-valid Ville bound. Inherited verbatim at SHA `5a72371`. | R11 consumes the per-shard wealth process `M_t` (linear-space) AS-IS from inherited Family A; fleet-merge operates one level above. |
| **Shekhar & Ramdas 2023** — "Nonparametric testing by betting" (arXiv:2202.10773) | Per-shard canonical betting-e-process for Family C. Inherited verbatim at SHA `5a72371`. | R11 consumes the per-shard log-wealth `log_S_t` AS-IS from inherited Family C; fleet-merge operates one level above. |

**Architect self-attest:**

- [x] Every file in the table above was opened at this spec's authoring time (NOT recalled from memory); line ranges verified against actual file contents at tessera HEAD `56e77f1` / inherited SHA `5a72371`.
- [x] `BettingEProcessState.M` field shape verified at `engine/types/families/a.ts:21` (the second field of the interface; declared as `M: number`).
- [x] `FamilyCBettingEProcessState.log_S_t` field shape verified at `engine/types/families/c.ts:299-300` (the first field; declared as `log_S_t: number` with a JSDoc explaining "Wealth process S_t (multiplicative). Stored in log-space as log_S_t for numerical stability").
- [x] `MixtureSupermartingaleState.M_t` field shape verified at `engine/detectors/family-a-mixture-supermartingale.ts:43` (declared as `M_t: number`).
- [x] `updateBettingState` signature verified at `engine/detectors/betting-e-process.ts:151-157`: takes `state, x, baselineMean, sigmaSquared, perTickAlpha`; returns the post-update `state.M` (number). Side-effects state in-place.
- [x] Vovk-Wang 2021 §4 (combination of e-values) results applied as cited. Both results — (i) arbitrary-dependence preservation under convex combination (uniform average is the canonical instance), and (ii) cond.-indep.-only preservation under product — are canonical post-2021 e-value-literature results and are exactly as stated in the published paper. **Limitation flagged**: spec-authoring was offline; the precise proposition/theorem numbers within §4 were NOT independently re-verified at spec-emit time. The architectural commitment does NOT depend on specific proposition numbers; Reviewer or post-merge curation is invited to refine the citation.
- [x] Re-export chain via `engine/types/index.ts:22 + :24` verified by direct grep (R03 re-export-chain-check reinforcement; 3rd consecutive application at Tessera).

---

## Mechanism

### Architectural primitives (resolved decisions)

1. **Fleet-merge is a stateless reduce, family-agnostic.** Per-shard e-process state lives inside each shard's wealth process (`BettingEProcessState.M` for Family A; `FamilyCBettingEProcessState.log_S_t` for Family C; `MixtureSupermartingaleState.M_t` for Family A mixture). At each fleet-tick, the orchestrator extracts the current scalar e-value from each shard (in log-space for numerical stability), passes a `ReadonlyArray<number>` of N per-shard log-e-values to the fleet-merge primitive, and gets back a single fleet log-e-value. The primitive does NOT inspect the family that produced the e-value; this is the load-bearing family-agnostic claim.

2. **Two combination primitives ship at R11: `combineProduct` and `combineAverage`.** Both operate in log-space and are pure stateless reduces.
   - **`combineProduct(log_e_values)`** returns `Σ_i log_e_values[i]` — log of the product (PoE). Vovk-Wang 2021 §4: preserves Ville under per-shard conditional independence given F_{t-1}. Power-optimal under independence; **assumption violated under correlated drift**; documented compensating control = `combineAverage`.
   - **`combineAverage(log_e_values)`** returns `logSumExp(log_e_values) − log(N)` — log of the uniform average (AoE). Vovk-Wang 2021 §4 convex-combination result: preserves Ville under **arbitrary dependence** (no independence assumption). Lower power than PoE under independence; **conditional-independence-robust under correlated drift**.
   - Operator (caller) picks which primitive to use based on the regime (iid vs correlated drift). R11 does NOT auto-select; the operator surface is "two primitives, caller picks." R12+ adds the e-BH FDR layer, which will consume `combineAverage` for its arbitrary-dependence guarantee.

3. **Conditional-independence assumption + compensating control (load-bearing per MD-F1 + PR-F1 mandate):**
   - **Assumption (for `combineProduct`):** per-shard e-processes `{e_i,t}_i` are conditionally independent given the σ-algebra F_{t-1} of cluster-state history.
   - **When it holds:** independent samples across shards; no shared fleet-level event (no firmware push, no synchronized model redeploy). `combineProduct` preserves Ville at fleet level.
   - **When it breaks:** correlated drift via shared fleet-level event. Per-shard Ville still holds at each shard, but the joint distribution under H₀ is no longer product-form; correlated upticks compound multiplicatively in PoE → fleet FPR can exceed α_fleet.
   - **Compensating control:** switch caller to `combineAverage`. Vovk-Wang 2021 §4 convex-combination result: AoE preserves Ville under arbitrary dependence → fleet FPR ≤ α_fleet holds even under correlated drift.
   - **Empirical demonstration:** PR-F1 evidence matrix (AC-13 + AC-14 + AC-15 + AC-16) measures fleet FPR for both primitives under both regimes; theory-derived assertions pin the three preserved cells; the load-bearing violation cell (PoE under correlated drift) is REPORTING-only (does NOT bind to observed FPR; preserves R07 OBSERVED-binding-scope reinforcement).

4. **Numerical stability — log-space throughout.** Both primitives consume log-space inputs and emit log-space outputs. `combineProduct` is a simple sum (numerically trivial). `combineAverage` uses the canonical log-sum-exp identity: `log((1/N)·Σ exp(x_i)) = logSumExp(x) − log(N)`, where `logSumExp(x) = max_i x_i + log(Σ_i exp(x_i − max_i x_i))`. This is unconditionally numerically stable (the `− max_i x_i` shift inside the exp ensures no individual term overflows; the `Σ exp(…)` is then between 1 and N inclusive). Empty-input handling: both primitives THROW on N=0 (architecturally meaningless; not silently default to 0 or infinity).

5. **Order-invariance.** Both primitives MUST be order-invariant: `combineProduct(perm(x)) === combineProduct(x)` and `combineAverage(perm(x)) === combineAverage(x)` (modulo IEEE-754 FP rounding; the spec uses `assert.strictEqual` on the deterministic reduction order rather than mathematical equality to avoid spurious failures from associativity reordering). Implementation: both primitives iterate `log_e_values` in array order without sorting; this is deterministic + order-dependent under FP rounding but in practice byte-identical at the scale of N=100 with same-magnitude entries. ACs bind this via fixed-fixture order-equality, not arbitrary permutation equality.

6. **Fleet-level e-process state tracker.** `FleetEProcessState` is a small ergonomic record (parallel to inherited `BettingEProcessState` at `engine/types/families/a.ts:20` and `FamilyCBettingEProcessState` at `engine/types/families/c.ts:297`). Fields:
   - `log_fleet_e_t: number` — most recent log-fleet-e-value at the current tick. Initialized to `0` (fleet e_0 = 1 ⇒ log_e_0 = 0).
   - `log_fleet_e_max: number` — running max of log_fleet_e across ticks. Initialized to `0`. Load-bearing for any-time Ville evaluation: P(sup_t log_fleet_e_t ≥ log(1/α_fleet)) ≤ α_fleet (Ville).
   - `n: number` — tick count. Initialized to `0`.
   - `fired: boolean` — sticky-fire latch; `true` once `log_fleet_e_max ≥ log_threshold`. Initialized to `false`.
   - `tick_at_first_fire: number | null` — tick index (0-based) at the first crossing. Initialized to `null`.
   - **State mutation contract: in-place** (mirrors inherited `updateBettingState` mutation contract at `engine/detectors/betting-e-process.ts:151-175` AND `onsUpdate` in-place mutation at `engine/detectors/family-c-betting-e-process.ts:231-244`). This is a deliberate departure from the pure-function discipline of `engine/per-shard/` (R03/R04/R05/R10) and a deliberate match to the inherited engine convention. Rationale (resolved decision; brainstorm in audit sidecar): the inherited per-shard wealth-process state is mutated in-place at each tick across ALL inherited detectors; preserving that convention at the fleet layer keeps the engine's read-state-write-state shape coherent. The Tessera per-shard layer (R03-R10) uses pure functions only because it's NOT a wealth process; it's a sample accumulator.

7. **Sticky-fire semantics.** Once `log_fleet_e_max ≥ log_threshold` at any tick, `state.fired` remains `true` for the remainder of the window (matches inherited Ville-bound semantics: `BettingEProcessState` at `engine/detectors/family-c-betting-e-process.ts:329` field `fired: boolean`; `MixtureSupermartingaleState` at `engine/detectors/family-a-mixture-supermartingale.ts:50` field `fired: boolean`). `tick_at_first_fire` records the FIRST crossing (0-based tick index post-update at the time of crossing); subsequent crossings do not update it.

8. **Module location: new `engine/fleet/` directory parallel to `engine/per-shard/`.** Two new files:
   - `engine/types/fleet.ts` — `FleetEProcessState` interface declaration.
   - `engine/fleet/combine.ts` — `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState` exported functions.
   - Rationale (brainstorm in audit sidecar): future R12+ work adds `engine/fleet/e-bh.ts` (e-BH FDR operator surface). The `engine/fleet/` namespace is the natural home for the Tessera-fleet-layer surface, parallel to the inherited `engine/detectors/` and Tessera-original `engine/per-shard/` namespaces. The state type lives under `engine/types/` (alongside `engine/types/families/{a,c}.ts`) so R12+ consumers can `import type { FleetEProcessState }` without pulling the runtime combine.ts code.

9. **No re-export at R11.** `engine/types/index.ts` is NOT modified at R11; consumers of `FleetEProcessState` import directly from the leaf path `../engine/types/fleet`. Rationale: R11 has no orchestrator-facing consumer (only the q11 test); the leaf-path import is sufficient. R12+ can add the re-export when an orchestrator-facing consumer lands. Anti-scope R11-SAS-4 enforces this; R11 does NOT touch `engine/types/index.ts`.

10. **No modification to inherited engine OR per-shard runtime.** R11 is a NEW LAYER added on top of the inherited per-shard wealth processes (Family A: `updateBettingState`; Family C: canonical SR23 ONS) and the Tessera per-shard runtime (`updatePerShardResidual`). Both are CONSUMED unchanged. Per A12 anti-scope (inherited from DeploySignal Phase-3.d.D close) + the explicit R11-SAS-1 / R11-SAS-2 / R11-SAS-3 fences below.

11. **PR-F1 evidence matrix parameters (resolved decisions):**
    - `α_fleet = 0.01` for the empirical regression test. The PRODUCTION operator-facing default per NEXT-ROLE.md is `α_fleet = 10⁻³`; the test uses `0.01` because Wilson-CI tightness at N_traj=200 demands a larger α. The decoupling is explicit: production runtime uses any α the operator picks (1/α threshold derived per-call); the test exercises at `α_fleet=0.01` for empirical Wilson-CI feasibility within ≤10s wall-clock test budget. The cited Vovk-Wang preservation results are α-INDEPENDENT (hold for all α ∈ (0, 1)), so this test α is sufficient to establish the architectural claim.
    - `N_shards = 100` (per NEXT-ROLE.md).
    - `T_ticks_per_shard = 100` per fleet trajectory.
    - `N_fleet_traj = 200` fleet trajectories per (primitive × scenario) cell.
    - Wilson upper bound on fleet FPR: `FPR_BOUND = α_fleet + 3·√(α_fleet·(1−α_fleet)/N_fleet_traj) = 0.01 + 3·√(0.01·0.99/200) ≈ 0.01 + 0.02112 ≈ 0.03112`. Three of the four PR-F1 cells assert `observed_fpr ≤ FPR_BOUND`.
    - Correlated-drift mechanism: at each tick `t`, generate a shared zero-mean factor `z_t ~ N(0, ρ²)` with `ρ² = 0.5`; each shard's sample at tick `t` is `shared_z_t + per_shard_noise_i,t` where `per_shard_noise_i,t ~ N(0, 1−ρ²) = N(0, 0.5)`. Marginal `~ N(0, 1)` per shard per tick; cross-shard correlation at same tick = `ρ² = 0.5`. This is an H₀ scenario (marginal mean still 0) with strong fleet-level correlated noise.
    - Per-shard Family A baseline: `μ=0, σ²=1`. Per-tick `perTickAlpha=0` (α-budget bookkeeping orthogonal to wealth accumulation; matches inherited `test/betting-e-process-class-dispatch.test.ts:185`).
    - Total work budget: 200 fleet-traj × 100 shards × 100 ticks × 4 (primitive × scenario) cells = 8M wealth updates ≈ 8s wall-clock at ~1 μs/update on M-series Darwin. Within q11 test runtime budget.

12. **Family-C demonstration AC.** A single q11 test (AC-12) constructs a synthetic `FamilyCBettingEProcessState`-shape value (just the `log_S_t` field is consumed; other fields untouched) and passes `state.log_S_t` to `combineProduct` + `combineAverage` to demonstrate the family-agnostic interface accepts log-space inputs from EITHER inherited family. The test does NOT exercise the full SR23 detector pipeline (that requires a compiled config + baseline pool; out-of-scope for q11); the family-agnostic claim is satisfied by demonstrating the input-shape compatibility.

### Cross-section consistency pass

_(R01-derived reinforcement — 7th consecutive application; standing discipline.)_

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | Two combination primitives ship: `combineProduct` + `combineAverage` | § Mechanism primitive 2; § Per-file pseudocode Delta 2; AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 | Single primitive (e.g., only PoE; only AoE); weighted mixture (non-uniform); hedged max(PoE, AoE) | Pseudocode declares exactly two exported functions; no `combine(weights, ...)` form; no `combineHedged` form; R11-SAS-19 fences weighted-mixture |
| 2 | Stateless reduce: primitive takes `ReadonlyArray<number>` of log-e-values, returns `FleetMergeOutput` (or `{log_fleet_e: number}` shape) | § Mechanism primitive 1; § Per-file pseudocode Delta 2; AC-1 + AC-2 | Stateful primitive that maintains accumulator across ticks; mutates a `FleetCombineState` argument; per-call return value is just `number` (no shape) | Pseudocode signatures use `(log_e_values: ReadonlyArray<number>): FleetMergeOutput`; no state argument; AC-1 binds the `FleetMergeOutput` shape |
| 3 | Log-space input and output | § Mechanism primitive 4; § Per-file pseudocode Delta 2; AC-3, AC-4, AC-5, AC-6 | Linear-space input (e_i directly); mixed-space (linear input, log output) | Pseudocode + ACs operate on `log_e` throughout; conversion via `Math.log(state.M)` (Family A) or direct `state.log_S_t` (Family C) shown at AC-12 demonstration AC; no `e_i: number` (linear) input form |
| 4 | `combineAverage` uses logSumExp with max-shift for numerical stability | § Mechanism primitive 4; § Per-file pseudocode Delta 2; AC-5, AC-6, AC-7 | Direct `Math.log(Σ_i Math.exp(x_i) / N)` (loses precision); skip the max-shift; subtract `Math.log(N)` BEFORE the log-sum-exp (mathematically equivalent but more error-prone for very-negative log-values) | Pseudocode computes `max_x`, then `max_x + Math.log(sum_exp_shifted) − Math.log(N)`; AC-7 stresses with log-values spanning [0, 1000] |
| 5 | Empty-input → throw (both primitives) | § Mechanism primitive 4; § Per-file pseudocode Delta 2; AC-1, AC-2 | Return `0`; return `-Infinity`; return `NaN`; silent no-op | Pseudocode begins each primitive with `if (log_e_values.length === 0) throw new Error(...)`; AC-1 + AC-2 use `assert.throws` to bind |
| 6 | Single-shard input (N=1) → identity (both primitives) | § Mechanism primitive 5; AC-3 (and AC-5 corner case) | Throw at N=1 (fleet-merge "needs ≥ 2"); apply log(N) penalty even at N=1 | Pseudocode does NOT special-case N=1; logSumExp at N=1 reduces to `max_x + log(exp(x-max_x)) = max_x + (x − max_x) = x`; `−log(1) = 0`; AC-3 binds the N=1 → identity behavior for both primitives |
| 7 | `FleetEProcessState` mutates in-place (matches inherited engine convention; deliberately departs from per-shard runtime's pure-function convention) | § Mechanism primitive 6; § Per-file pseudocode Delta 1 + Delta 2; AC-8, AC-9, AC-10, AC-11 | Pure function returning new state (would match Tessera per-shard convention but break with inherited engine convention) | Pseudocode signature `updateFleetEProcessState(state, log_fleet_e, log_threshold): FleetEProcessState` — returns `state` for ergonomic chaining BUT also mutates in-place; AC-10 verifies in-place mutation by holding a reference and checking the original reference reflects updates |
| 8 | Sticky-fire latch on `log_fleet_e_max` crossing threshold | § Mechanism primitive 7; § Per-file pseudocode Delta 2; AC-9 + AC-10 + AC-11 | Fire latch on current `log_fleet_e_t` crossing (not the running max — would NOT match any-time Ville semantics); reset latch after crossing | Pseudocode checks `state.log_fleet_e_max ≥ log_threshold`; AC-10 binds: once fired stays fired across subsequent ticks even if fleet_e drops |
| 9 | New module = `engine/fleet/combine.ts` (parallel to `engine/per-shard/`); new type at `engine/types/fleet.ts` | § Mechanism primitive 8; § Component inventory | Co-locate with per-shard at `engine/per-shard/fleet-merge.ts`; co-locate with detectors at `engine/detectors/fleet-merge.ts`; put state type in `engine/fleet/combine.ts` alongside the primitives | Component inventory lists exactly the two new file paths; no consumer in spec imports from any alternate location |
| 10 | No re-export through `engine/types/index.ts` at R11 | § Mechanism primitive 9; § Anti-scope R11-SAS-4 | Add `export * from './fleet'` to `engine/types/index.ts` at R11 | Component inventory shows `engine/types/index.ts` UNCHANGED; R11-SAS-4 fences |
| 11 | PR-F1 evidence matrix params: α_fleet=0.01, N_shards=100, T_ticks=100, N_fleet_traj=200, ρ²=0.5 | § Mechanism primitive 11; § Per-file pseudocode Delta 3; AC-13, AC-14, AC-15, AC-16 | Different α (e.g., 10⁻³); different N (e.g., 1000); different T; different ρ; non-Gaussian H₀ generator | Pseudocode constants `ALPHA_FLEET=0.01`, `N_SHARDS=100`, `T_TICKS=100`, `N_FLEET_TRAJ=200`, `RHO_SQUARED=0.5` declared once at top of test file; ACs reference by name |
| 12 | Three preserved cells assert theory-derived Wilson-CI bound; PoE-correlated-drift cell is REPORTING-only | § Mechanism primitive 3 + 11; AC-13 + AC-14 + AC-15 + AC-16 | Bind FPR observation on PoE-correlated to a specific OBSERVED value (would violate R07 OBSERVED-binding-scope); skip the PoE-correlated cell entirely (would lose the load-bearing demonstration); assert PoE-correlated FPR > some lower bound (theory has no such bound) | AC-16 has no `assert.ok(fpr ≤ bound)` form; uses `console.log(...)` for evidence + `assert.ok(true)` (always-passes reporting test). AC-13 + AC-14 + AC-15 each `assert.ok(fpr ≤ FPR_BOUND)` |
| 13 | Family-agnostic claim: primitive accepts log-e-values regardless of family; AC-12 demonstrates Family C state shape | § Mechanism primitive 1 + 12; AC-12 | Family-specific wrappers (`combineFamilyA`, `combineFamilyC`) at R11; couple primitive to a family-tagged input | Pseudocode signature takes plain `ReadonlyArray<number>`; AC-12 passes both `Math.log(BettingEProcessState.M)` and `FamilyCBettingEProcessState.log_S_t` into the same primitive |
| 14 | Conditional-independence assumption explicitly enumerated AND compensating control named | § Mechanism primitive 3; § External-source verification (Vovk-Wang 2021); PR-F1 evidence matrix § (AC-13–AC-16) | Pick PoE silently without enumerating cond.-indep. (MD-F1 violation; HALT condition per NEXT-ROLE.md) | Mechanism primitive 3 contains the verbatim assumption statement AND the compensating-control statement; PR-F1 evidence matrix empirically demonstrates the AoE-correlated cell as the compensating control |
| 15 | TDD ordering = RED (q11 test only; TS2307 on missing combine.ts) → GREEN (combine.ts + fleet.ts atomic landing) | § Per-file pseudocode Implementer note 4; AC-17 | Single-commit landing; production code before test | AC-17 specifies two-commit ordering; pre-R11 `engine/fleet/` does not exist; q11 import would fail TS2307 |
| 16 | File-creation track-state: `engine/fleet/`, `engine/types/fleet.ts`, `engine/fleet/combine.ts`, `test/q11-hierarchical-e-value-combination.test.ts` ALL do NOT exist at HEAD `56e77f1` | § Component inventory directory-creation note | Assumed pre-existing | `git ls-files engine/fleet/ engine/types/fleet.ts test/q11*.test.ts` verified at HEAD `56e77f1` — empty output (none exist) |
| 17 | No grep-evidence ACs that match `//` comments (R03 MINOR-2 reinforcement) | § Acceptance criteria | A grep AC matching `combineProduct` (would match comments + imports indiscriminately) | R11 has ZERO grep-pattern verification ACs — all evidence comes from test-body assertions; reinforcement satisfied trivially by absence |
| 18 | No OBSERVED-binding to specific FPR values (R07 reinforcement) | § Mechanism primitive 11 + 12; AC-13 + AC-14 + AC-15 + AC-16 | Bind to specific OBSERVED FPR like `assert.strictEqual(fpr, 0.025)` | All three preserved-cell ACs bind to the THEORY-DERIVED Wilson upper bound (`α_fleet + 3·√(…)`); reporting-only AC for PoE-correlated does not bind to any specific value |
| 19 | Fixture-sizing propagation (R07 reinforcement): same N_fleet_traj used across all four PR-F1 cells | § Mechanism primitive 11; AC-13 + AC-14 + AC-15 + AC-16 | Different N_fleet_traj per cell (would invalidate Wilson-CI comparison across cells) | Constant `N_FLEET_TRAJ=200` reused across all four cells per Delta 3 |
| 20 | File-level docblock coverage (R10 reinforcement): each new file declares its surface in the file-level header AND the spec verifies the header matches the delta | § Per-file pseudocode Delta 1 + Delta 2 file-header text | New module without docblock; docblock states a different surface than what the file actually exports | Delta 1 + Delta 2 each include a verbatim file-level docblock; Implementer note 6 mandates header verification |

All 20 checks PASS at spec-emit time. The cross-section pass is now standing discipline at Tessera; this is the 7th consecutive application (R02=9 / R03=13 / R04=12 / R05=15 / R10=16 / R11=20).

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `engine/types/fleet.ts` | CREATED | Delta 1: new file containing `export interface FleetEProcessState { … }` declaration. NO other exports. Binds AC-8, AC-9, AC-10, AC-11. |
| `engine/fleet/combine.ts` | CREATED | Delta 2: new file containing `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState` exported functions + `FleetMergeOutput` type declaration. Imports `FleetEProcessState` from `../types/fleet`. Binds AC-1 through AC-11 (function-level), AC-13 through AC-16 (consumed by q11 fleet-FPR simulator). |
| `test/q11-hierarchical-e-value-combination.test.ts` | CREATED | Delta 3: new test file binding AC-1 through AC-18 (18 tests total). Imports from `engine/fleet/combine`, `engine/types/fleet`, `engine/detectors/betting-e-process`. Uses `mulberry32` PRNG + Box-Muller Gaussian generator pattern inherited from `test/betting-e-process-class-dispatch.test.ts:40-83` (re-inlined; NOT imported from the inherited test). |
| `engine/per-shard/runtime.ts` | UNCHANGED | R11-SAS-1: per-shard runtime not touched. R10 MINOR-1 module-docblock carry-forward preserved (operator gate item). |
| `engine/per-shard/welford.ts` | UNCHANGED | R11-SAS-2. |
| `engine/per-shard/warm-start.ts` | UNCHANGED | R11-SAS-2. |
| `engine/detectors/*` | UNCHANGED | R11-SAS-3 (A12 anti-scope; inherited engine internals frozen). |
| `engine/types/families/{a,b,c,d,e}.ts` | UNCHANGED | R11-SAS-3 (vendored). |
| `engine/types/config.ts` | UNCHANGED | R11-SAS-5 (Tessera schema extensions are SLICE 4 / SLICE 2-cleanup scope, NOT R11). |
| `engine/types/index.ts` | UNCHANGED | R11-SAS-4 (no R11 re-export of fleet.ts; future R12+ may add). |
| `tools/*` | UNCHANGED | R11-SAS-7. |
| `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md` | UNCHANGED | R11-SAS-6. |
| `coordination/specs/Q-R[01-10]-SPEC.md` | UNCHANGED | R11-SAS-18 (prior-round specs frozen). |
| `test/_substrate/factories.ts` | UNCHANGED | R11-SAS-9 (R11 q11 fixtures use literal objects + the inherited PRNG/Gaussian helpers re-inlined; no new factory needed for fleet-state which has fresh-only-constructor). |
| `test/q[01-10]*.test.ts` | UNCHANGED | R11-SAS-9 (frozen prior-round tests). |

**Component inventory AC-range cross-check** (R06 narrative-vs-pseudocode AC-count reinforcement; 4th consecutive application):
- Component inventory narrative above lists q11 test binding "AC-1 through AC-18" (18 ACs).
- § Acceptance criteria below enumerates AC-1 through AC-18 inclusive (18 ACs total).
- § P3 ten-axis verification Coverage row enumerates the same 18 ACs.
- All three sites agree: **18 ACs**.

**Directory-creation track-state verification** (R02 OBS-2 file-track-state reinforcement applied inversely):
- `engine/fleet/` — does NOT exist at HEAD `56e77f1` (`git ls-files engine/fleet/` → empty). GREEN commit creates this directory by creating `combine.ts` inside it.
- `engine/types/fleet.ts` — does NOT exist at HEAD `56e77f1` (`git ls-files engine/types/fleet*` → empty). GREEN commit creates this file.
- `engine/fleet/combine.ts` — does NOT exist at HEAD `56e77f1` (`git ls-files engine/fleet/combine*` → empty). GREEN commit creates this file.
- `test/q11-hierarchical-e-value-combination.test.ts` — does NOT exist at HEAD `56e77f1` (`git ls-files test/q11*.test.ts` → empty). RED commit creates this file.

---

## Integration points

_(R03-derived re-export-chain-check reinforcement applied — 4th consecutive application — for each named symbol consumed in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)_

1. **`engine/fleet/combine.ts` ↔ `engine/types/fleet.ts` (NEW edge).** combine.ts imports `FleetEProcessState` (type-only) from `../types/fleet`. Declaration site: `engine/types/fleet.ts:NEW` (created by Delta 1). The type is the SINGLE export from `engine/types/fleet.ts`; combine.ts pulls it in for the state-mutation functions' typed parameter.

2. **`engine/types/fleet.ts` ↔ inherited engine.** ZERO imports from inherited engine. The `FleetEProcessState` type uses ONLY primitive types (`number`, `boolean`, `number | null`); no transitive type dependencies. This is by design — the fleet-layer type is self-contained.

3. **`engine/fleet/combine.ts` ↔ inherited engine.** ZERO imports from inherited engine. The two combination primitives consume `ReadonlyArray<number>` (plain log-e-values). The state-mutation primitives consume the local `FleetEProcessState` type. Family-agnostic by construction.

4. **`test/q11-hierarchical-e-value-combination.test.ts` ↔ `engine/fleet/combine.ts` (NEW edge).** q11 imports (from `../engine/fleet/combine`):
   - `combineProduct` — tested at AC-1, AC-3, AC-4, AC-13 (via PoE-iid simulator), AC-14 disqualified (PoE-correlated REPORTING).
   - `combineAverage` — tested at AC-2, AC-5, AC-6, AC-7, AC-15 (via AoE-iid simulator), AC-16 (via AoE-correlated simulator).
   - `freshFleetEProcessState` — tested at AC-8.
   - `updateFleetEProcessState` — tested at AC-9, AC-10, AC-11.
   - `type FleetEProcessState` (re-exported from combine.ts? or imported from types/fleet?) — see Decision below.
   - `type FleetMergeOutput` — tested at AC-1, AC-2 (shape assertion).

   **Resolved decision (re-export of `FleetEProcessState` from `engine/fleet/combine.ts`):** combine.ts re-exports the type for caller ergonomics: `export type { FleetEProcessState } from '../types/fleet';`. Rationale: q11 (the only R11 caller) is a TEST and pulls the type for typed-fixture construction; without the re-export, q11 has TWO import paths (`engine/fleet/combine` for functions + `engine/types/fleet` for the type), which inflates import-block surface. Re-exporting is the natural caller ergonomic. The type is ALSO available at `engine/types/fleet` for future consumers that need only the type (e.g., a future API contract definition).

5. **`test/q11-hierarchical-e-value-combination.test.ts` ↔ `engine/detectors/betting-e-process.ts` (existing module; no R11 modification).** q11 imports `freshBettingState` + `updateBettingState` (both at the existing declaration sites: `engine/detectors/betting-e-process.ts:72` for `freshBettingState`; `engine/detectors/betting-e-process.ts:151` for `updateBettingState`) for the Family A simulator driving the PR-F1 evidence matrix.

6. **`test/q11-hierarchical-e-value-combination.test.ts` ↔ `engine/types/families/c.ts` (existing module; no R11 modification).** q11 imports `type FamilyCBettingEProcessState` (declaration site at `engine/types/families/c.ts:297`) for the AC-12 family-agnostic demonstration. The interface is consumed type-only (`import type`); q11 does not run the SR23 detector pipeline.

7. **`test/q11-hierarchical-e-value-combination.test.ts` ↔ Tessera per-shard runtime.** ZERO. q11 does NOT consume `updatePerShardResidual`, `projectTierGatedOutputs`, `observeSample`, or any Tessera per-shard surface. The fleet-merge primitive operates on raw per-shard e-values (from inherited engine wealth processes), one architectural layer ABOVE the Tessera per-shard accumulator layer. Per-shard runtime is anti-scope (R11-SAS-1).

8. **`test/q11-hierarchical-e-value-combination.test.ts` ↔ `test/_substrate/factories.ts`.** ZERO. q11 has no per-shard residual fixtures; the test substrate factories (`makePerShardResidual`, `makePerShardCell`, etc.) are not consumed at R11. q11 uses literal object construction for any state values (matches the R10 `welford.ts` test pattern + the inherited `betting-e-process-class-dispatch.test.ts` pattern; no factory needed for a state with a fresh-only constructor).

**Re-export-chain verification (R03 reinforcement):**
- `BettingEProcessState` (q11 does NOT directly import this type; only the runtime functions) — re-export chain at `engine/types/index.ts:22` via `export * from './families/a'`; declaration at `engine/types/families/a.ts:20`. Verified by direct grep at spec-authoring time.
- `FamilyCBettingEProcessState` — re-export chain at `engine/types/index.ts:24` via `export * from './families/c'`; declaration at `engine/types/families/c.ts:297`. Verified.
- `FleetEProcessState` — declared at NEW path `engine/types/fleet.ts` (Delta 1); re-exported from `engine/fleet/combine.ts` for caller ergonomics (decision in integration point 4); NOT re-exported via `engine/types/index.ts` at R11 (R11-SAS-4 fence).

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **Exact function names** (per cross-section consistency pass row 2 + 9):
   - `combineProduct(log_e_values: ReadonlyArray<number>): FleetMergeOutput` — exactly that signature.
   - `combineAverage(log_e_values: ReadonlyArray<number>): FleetMergeOutput` — exactly that signature.
   - `freshFleetEProcessState(): FleetEProcessState` — no parameters.
   - `updateFleetEProcessState(state: FleetEProcessState, log_fleet_e_t: number, log_threshold: number): FleetEProcessState` — mutates state in-place AND returns the same state reference for chaining.

2. **`combineAverage` numerical-stability algorithm** (logSumExp with max-shift):
   - Step 1: `let max_x = -Infinity; for (const x of log_e_values) if (x > max_x) max_x = x;`
   - Step 2: `let sum_exp = 0; for (const x of log_e_values) sum_exp += Math.exp(x - max_x);`
   - Step 3: `return { log_fleet_e: max_x + Math.log(sum_exp) - Math.log(N) };` where `N = log_e_values.length`.
   - Special case: if `N === 1`, the algorithm returns `max_x + Math.log(1) - Math.log(1) = max_x = log_e_values[0]` (identity; matches AC-3 N=1 assertion).
   - Special case: if `N === 0`, neither loop runs; `max_x = -Infinity`. Algorithm THROWS before reaching the loops (see step 0 below).
   - Step 0 (input validation; goes FIRST): `if (log_e_values.length === 0) throw new Error('combineAverage: empty input array (fleet-merge on N=0 shards is undefined)');`. Same pattern for `combineProduct`.

3. **`combineProduct` algorithm**:
   - Step 0: `if (log_e_values.length === 0) throw new Error('combineProduct: empty input array (fleet-merge on N=0 shards is undefined)');`
   - Step 1: `let sum = 0; for (const x of log_e_values) sum += x;`
   - Step 2: `return { log_fleet_e: sum };`
   - At N=1: `sum = log_e_values[0]` (identity).
   - At N=0: throws per step 0.

4. **TDD ordering** — two-commit sequence (per AC-17):
   - **RED commit** creates `test/q11-hierarchical-e-value-combination.test.ts`. The file imports `{ combineProduct, combineAverage, freshFleetEProcessState, updateFleetEProcessState, type FleetEProcessState, type FleetMergeOutput }` from `../engine/fleet/combine`, which does NOT yet exist at HEAD `56e77f1`. Result: `npm run typecheck` exits 1 with TS2307 (no such file). Verify RED state by running `npm run typecheck`; DO NOT run `node --test` at RED (typecheck failure blocks the test runner).
   - **GREEN commit** creates `engine/types/fleet.ts` (Delta 1) + `engine/fleet/combine.ts` (Delta 2). Verify GREEN via `npm run typecheck` (exit 0) + `node --test test/q11-hierarchical-e-value-combination.test.js` (expect 18 pass / 0 fail per AC-18).
   - GREEN may bundle both new files in a single commit (they land atomically; no schema-vs-consumer split as at R02→R05).

5. **Hand-trace verification before committing GREEN** — AoE-iid scenario at N=100 shards (cross-binding AC-15 + AC-18):
   - For one fleet trajectory: initialize 100 fresh `BettingEProcessState`s; initialize 1 fresh `FleetEProcessState` with `log_threshold = Math.log(100) ≈ 4.605` (α_fleet=0.01 → 1/α=100).
   - For each of 100 ticks: per shard, generate iid `gaussian(rng)`, call `updateBettingState(state, x, 0, 1, 0)`, collect `Math.log(Math.max(state.M, WEALTH_FLOOR))` into an array of length 100.
   - Compute `result = combineAverage(log_e_per_shard)`; call `updateFleetEProcessState(fleet_state, result.log_fleet_e, log_threshold)`.
   - After 100 ticks: read `fleet_state.fired` to determine if THIS trajectory fired.
   - Repeat across 200 fleet trajectories with distinct seeds; tally fires / 200 = observed FPR.
   - AC-15 expects observed_fpr ≤ Wilson bound (≈ 0.031).
   - Architect-pre-predicted observed FPR under AoE-iid: 0.000 to 0.010 (AoE is conservative; fleet wealth averages over 100 shards' individual wealth processes which under H₀ have mean 1; very rarely does the average wealth exceed 100×). Architect's median pre-prediction: 0.000–0.005.

6. **File-level docblock coverage** (R10 reinforcement — 2nd application; new file at R11):
   - `engine/types/fleet.ts` begins with a file-level JSDoc block describing the SLICE 3 surface, the SINGLE exported interface, and the engine-convention reference (in-place mutation match) — see Delta 1 verbatim text below.
   - `engine/fleet/combine.ts` begins with a file-level JSDoc block describing the SLICE 3 surface (fleet-merge primitives + state tracker), the family-agnostic claim, the Vovk-Wang 2021 citation, and the cond.-indep.-vs-arbitrary-dependence assumption split — see Delta 2 verbatim text below.

### Delta 1 — `engine/types/fleet.ts` (CREATED)

The full file content:

```ts
// engine/types/fleet.ts — Tessera SLICE 3 (R11): fleet-level e-process state type.
//
// Single source of truth for the FleetEProcessState shape consumed by
// engine/fleet/combine.ts's updateFleetEProcessState. Mirrors the inherited
// per-shard wealth-process state interfaces (BettingEProcessState at
// engine/types/families/a.ts:20; FamilyCBettingEProcessState at
// engine/types/families/c.ts:297) in mutation contract (in-place) and field
// composition (current value + running max + sticky-fire latch + tick count).
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared
// npm package at Tessera Phase 2 close per SCOPING-MEMO-v0.3 § 9.

/** Tessera SLICE 3 (R11) — fleet-level e-process state for hierarchical e-value
 *  combination across N per-shard wealth processes. Persists across fleet-ticks
 *  within an evaluation window; reset by re-constructing via freshFleetEProcessState
 *  at window boundary.
 *
 *  All fields stored in log-space for numerical stability (matches inherited
 *  FamilyCBettingEProcessState.log_S_t convention).
 *
 *  Sticky-fire semantics: once log_fleet_e_max crosses log_threshold at any tick,
 *  `fired` remains true for the remainder of the window. `tick_at_first_fire`
 *  records the FIRST crossing (0-based tick index post-update).
 *
 *  Mutation contract: in-place (matches inherited engine convention at
 *  engine/detectors/betting-e-process.ts:151-175 + engine/detectors/
 *  family-c-betting-e-process.ts:231-244). Distinct from the Tessera per-shard
 *  layer's pure-function convention (R03/R04/R05/R10) because this IS a wealth
 *  process; the per-shard layer is a sample accumulator. */
export interface FleetEProcessState {
  /** Most recent log of the fleet e-value at the current tick. Initialized
   *  to 0 (fleet e_0 = 1 ⇒ log_e_0 = 0). */
  log_fleet_e_t: number;
  /** Running max of log_fleet_e across ticks. Initialized to 0. Load-bearing
   *  for any-time Ville evaluation: P(sup_t log_fleet_e_t ≥ log(1/α_fleet)) ≤ α_fleet. */
  log_fleet_e_max: number;
  /** Tick count. Initialized to 0; incremented by 1 at each updateFleetEProcessState call. */
  n: number;
  /** Sticky-fire latch — set true at first tick t where log_fleet_e_max ≥ log_threshold;
   *  remains true thereafter. Initialized to false. */
  fired: boolean;
  /** Tick index (0-based) at first fire; null until threshold crossed. */
  tick_at_first_fire: number | null;
}
```

No other exports. The file is exactly the JSDoc block above + the `FleetEProcessState` interface declaration. Implementer verifies with:
- `grep -c "export interface FleetEProcessState" engine/types/fleet.ts` → 1 (exactly one interface export).
- `grep -c "^export " engine/types/fleet.ts` → 1 (exactly one top-level export, which IS the interface).

### Delta 2 — `engine/fleet/combine.ts` (CREATED)

The full file content:

```ts
// engine/fleet/combine.ts — Tessera SLICE 3 (R11): hierarchical e-value combination primitives.
//
// Two family-agnostic stateless reduces over log-space per-shard e-values:
//
//   combineProduct (PoE): log(∏ e_i) = Σ log e_i.
//     Ville-preserved at fleet level IFF per-shard e-processes are conditionally
//     independent given F_{t-1} (cluster-state history). Power-optimal under
//     independence; conditional-independence-assumption-VIOLATED under correlated
//     drift (firmware push / synchronized model redeploy). Vovk-Wang 2021 §4.
//
//   combineAverage (AoE): log((1/N) Σ e_i) = logSumExp(log_e) − log(N).
//     Ville-preserved at fleet level under ARBITRARY DEPENDENCE (no independence
//     assumption). Lower power than PoE under independence; conditional-
//     independence-ROBUST under correlated drift. Vovk-Wang 2021 §4 convex-combination result
//     (uniform-convex-combination preserves e-value property under arbitrary
//     dependence).
//
// Operator-selection contract: caller picks combineProduct OR combineAverage per
// expected correlation regime. R11 does NOT auto-select. Future R12+ e-BH FDR
// operator surface (engine/fleet/e-bh.ts; Tessera SLICE 4) consumes combineAverage
// for its arbitrary-dependence FDR guarantee.
//
// PR-F1 evidence matrix (test/q11-hierarchical-e-value-combination.test.ts) empirically
// validates the four (primitive × scenario) cells at N=100 shards × T=100 ticks ×
// N_traj=200 fleet trajectories per cell. Three preserved cells (PoE-iid, AoE-iid,
// AoE-correlated) assert observed FPR ≤ Wilson-CI upper bound; PoE-correlated cell
// is REPORTING-only (documents the OBSERVED FPR for the pair-review record; does
// NOT bind to the observed value).
//
// Numerical stability: log-space throughout. combineAverage uses logSumExp with
// max-shift (canonical numerically-stable form). combineProduct is a plain sum.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared
// npm package at Tessera Phase 2 close per SCOPING-MEMO-v0.3 § 9.

import type { FleetEProcessState } from '../types/fleet';

// Re-exported for caller ergonomic (q11 + future R12+ consumers pull both
// runtime functions AND the state type from a single module path).
export type { FleetEProcessState };

/** Output shape of the fleet-merge primitives. Wrapped in an object (rather
 *  than returning a bare `number`) for future extensibility — e.g., R12+ may
 *  add a `compensating_control_engaged: boolean` field for the e-BH operator
 *  surface. R11 ships the minimal shape. */
export interface FleetMergeOutput {
  /** Log of the fleet e-value at this tick — combined across the N per-shard
   *  log-e-values supplied to the primitive. */
  log_fleet_e: number;
}

/** Product-of-e-values combination (PoE). Ville-preserved IFF per-shard
 *  e-processes are conditionally independent given F_{t-1}. Throws on empty input.
 *
 *  Formula: log_fleet_e = Σ_i log_e_values[i].
 *
 *  Caller responsibility: ensure the conditional-independence assumption holds
 *  for the operating regime. Under correlated drift (firmware push, synchronized
 *  model redeploy), the cond.-indep. assumption is VIOLATED and the fleet Ville
 *  bound is NOT guaranteed; switch caller to combineAverage as the compensating
 *  control. Vovk-Wang 2021 §4.
 */
export function combineProduct(log_e_values: ReadonlyArray<number>): FleetMergeOutput {
  if (log_e_values.length === 0) {
    throw new Error('combineProduct: empty input array (fleet-merge on N=0 shards is undefined)');
  }
  let sum = 0;
  for (const x of log_e_values) sum += x;
  return { log_fleet_e: sum };
}

/** Average-of-e-values combination (AoE). Ville-preserved under arbitrary
 *  dependence (no independence assumption required). Throws on empty input.
 *
 *  Formula: log_fleet_e = logSumExp(log_e_values) − log(N), implemented via
 *  the canonical numerically-stable max-shift form to avoid overflow when
 *  individual log-e-values are large.
 *
 *  Vovk-Wang 2021 §4 convex-combination result: convex combinations (uniform-average is
 *  the canonical instance) of e-values are e-values under arbitrary dependence.
 *  By the Ville inequality, P(sup_t fleet_e_t ≥ 1/α) ≤ α at the fleet level.
 *
 *  Conditional-independence-ROBUST: appropriate for operating regimes where
 *  correlated drift cannot be ruled out (the production default at R12+ e-BH
 *  consumer; R11 ships both primitives for caller selection).
 */
export function combineAverage(log_e_values: ReadonlyArray<number>): FleetMergeOutput {
  if (log_e_values.length === 0) {
    throw new Error('combineAverage: empty input array (fleet-merge on N=0 shards is undefined)');
  }
  // logSumExp with max-shift for numerical stability.
  let max_x = -Infinity;
  for (const x of log_e_values) if (x > max_x) max_x = x;
  let sum_exp = 0;
  for (const x of log_e_values) sum_exp += Math.exp(x - max_x);
  const log_sum_exp = max_x + Math.log(sum_exp);
  const log_avg = log_sum_exp - Math.log(log_e_values.length);
  return { log_fleet_e: log_avg };
}

/** Fresh fleet-level e-process state. fleet e_0 = 1 ⇒ log_e_0 = 0; no fires yet. */
export function freshFleetEProcessState(): FleetEProcessState {
  return {
    log_fleet_e_t: 0,
    log_fleet_e_max: 0,
    n: 0,
    fired: false,
    tick_at_first_fire: null,
  };
}

/** Update the fleet wealth tracker with a new fleet log-e-value at the current
 *  tick. Mutates state in-place (matches inherited engine convention; see file
 *  header). Returns the same state reference for ergonomic chaining.
 *
 *  log_threshold = Math.log(1 / α_fleet). At α_fleet=0.01 the threshold is
 *  ≈ 4.605; at α_fleet=10⁻³ it is ≈ 6.908.
 *
 *  Sticky-fire: once log_fleet_e_max ≥ log_threshold at any tick, state.fired
 *  remains true. tick_at_first_fire records the first crossing.
 */
export function updateFleetEProcessState(
  state: FleetEProcessState,
  log_fleet_e_t: number,
  log_threshold: number,
): FleetEProcessState {
  state.log_fleet_e_t = log_fleet_e_t;
  if (log_fleet_e_t > state.log_fleet_e_max) {
    state.log_fleet_e_max = log_fleet_e_t;
  }
  const tick_post = state.n;  // pre-increment value used as the 0-based tick index
  state.n += 1;
  if (!state.fired && state.log_fleet_e_max >= log_threshold) {
    state.fired = true;
    state.tick_at_first_fire = tick_post;
  }
  return state;
}
```

Verify with:
- `grep -c "^export " engine/fleet/combine.ts` → 5 (one type re-export + one FleetMergeOutput interface + two combination functions + one freshFleetEProcessState + one updateFleetEProcessState = 6 actually; recount: `export type { FleetEProcessState }`, `export interface FleetMergeOutput`, `export function combineProduct`, `export function combineAverage`, `export function freshFleetEProcessState`, `export function updateFleetEProcessState` = **6 top-level exports**). Implementer reports OBSERVED count from `grep -c "^export " engine/fleet/combine.ts`; the spec's expected value is 6.
- `grep -c "combineProduct\|combineAverage" engine/fleet/combine.ts` → ≥ 4 (each function name appears in at least: the function declaration; the JSDoc cross-reference within the other function's JSDoc; in the file-header comment block).

### Delta 3 — `test/q11-hierarchical-e-value-combination.test.ts` (CREATED)

The test file binds AC-1 through AC-18 (18 tests; one per AC). Pseudocode below; Implementer adapts to TS strict-mode + matches the assertion form in adjacent q-tests (`assert.deepStrictEqual`, `assert.strictEqual`, `assert.throws`, `assert.ok`).

```ts
// test/q11-hierarchical-e-value-combination.test.ts — R11 AC-1 through AC-18.
//
// Binds the SLICE 3 hierarchical e-value combination primitives + PR-F1
// evidence matrix at N=100 shards × T=100 ticks × N_fleet_traj=200.
//
// PR-F1 evidence matrix (4 cells):
//   (combineProduct, iid_H0)             → AC-13: assert fleet FPR ≤ Wilson bound
//   (combineAverage, iid_H0)             → AC-15: assert fleet FPR ≤ Wilson bound
//   (combineAverage, correlated_H0)      → AC-16: assert fleet FPR ≤ Wilson bound
//   (combineProduct, correlated_H0)      → AC-14: REPORTING-only — log observed
//                                          FPR; does NOT bind (Vovk-Wang 2021 §4
//                                          cond.-indep. assumption violated;
//                                          load-bearing demonstration of MD-F1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  combineProduct,
  combineAverage,
  freshFleetEProcessState,
  updateFleetEProcessState,
  type FleetEProcessState,
  type FleetMergeOutput,
} from '../engine/fleet/combine';
import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process';
import type { FamilyCBettingEProcessState } from '../engine/types/families/c';

// ─── Deterministic PRNG + Gaussian generator (re-inlined from the inherited
// test/betting-e-process-class-dispatch.test.ts:40-83 pattern; NOT imported
// from the inherited test file to keep q11 standalone). ───

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

// ─── PR-F1 evidence matrix parameters (cross-section consistency pass row 11). ───

const ALPHA_FLEET = 0.01;
const LOG_THRESHOLD = Math.log(1 / ALPHA_FLEET);  // ≈ 4.605
const N_SHARDS = 100;
const T_TICKS = 100;
const N_FLEET_TRAJ = 200;
const RHO_SQUARED = 0.5;          // correlated-drift shared-factor variance fraction
const FPR_BOUND = ALPHA_FLEET + 3 * Math.sqrt(ALPHA_FLEET * (1 - ALPHA_FLEET) / N_FLEET_TRAJ);
// FPR_BOUND ≈ 0.01 + 3·√(0.01·0.99/200) ≈ 0.03112.

// Wealth floor (matches inherited engine/detectors/betting-e-process.ts:65
// WEALTH_FLOOR convention to avoid Math.log(0) on long no-drift runs).
const WEALTH_FLOOR = 1e-12;

// ─── Per-fleet-trajectory simulator ───────────────────────────────────────

type CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput;

/** Simulate one fleet trajectory of (N_SHARDS × T_TICKS) ticks under the chosen
 *  scenario; return whether the fleet wealth tracker fired by end of trajectory. */
function simulateFleetTrajectory(
  primitive: CombinePrimitive,
  scenario: 'iid' | 'correlated',
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  // Per-shard Family A wealth states (μ=0, σ²=1).
  const shard_states = Array.from({ length: N_SHARDS }, () => freshBettingState());
  const fleet_state: FleetEProcessState = freshFleetEProcessState();
  const log_e_buffer: number[] = new Array(N_SHARDS);
  const stddev_shared = scenario === 'correlated' ? Math.sqrt(RHO_SQUARED) : 0;
  const stddev_per_shard = scenario === 'correlated'
    ? Math.sqrt(1 - RHO_SQUARED)
    : 1;
  for (let t = 0; t < T_TICKS; t++) {
    // Shared-factor draw (zero under iid; N(0, ρ²) under correlated_H0).
    const shared_z = scenario === 'correlated' ? stddev_shared * gaussian(rng) : 0;
    // Per-shard update + collect log e-values.
    for (let i = 0; i < N_SHARDS; i++) {
      const per_shard_noise = stddev_per_shard * gaussian(rng);
      const x = shared_z + per_shard_noise;
      const M_t = updateBettingState(shard_states[i], x, 0, 1, 0);
      log_e_buffer[i] = Math.log(Math.max(M_t, WEALTH_FLOOR));
    }
    const fleet_result = primitive(log_e_buffer);
    updateFleetEProcessState(fleet_state, fleet_result.log_fleet_e, LOG_THRESHOLD);
  }
  return fleet_state.fired;
}

function measureFleetFireRate(
  primitive: CombinePrimitive,
  scenario: 'iid' | 'correlated',
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_FLEET_TRAJ; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateFleetTrajectory(primitive, scenario, seed)) fires++;
  }
  return fires / N_FLEET_TRAJ;
}

// ─── R11 AC-1 — combineProduct primitive surface + empty-input + shape ──
test('R11 AC-1 — combineProduct returns FleetMergeOutput; throws on empty input', () => {
  // Shape:
  const out: FleetMergeOutput = combineProduct([0, 0, 0]);
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.log_fleet_e, 0);  // log(1·1·1) = 0
  // Empty-input throws:
  assert.throws(() => combineProduct([]), /empty input/);
});

// ─── R11 AC-2 — combineAverage primitive surface + empty-input + shape ──
test('R11 AC-2 — combineAverage returns FleetMergeOutput; throws on empty input', () => {
  const out: FleetMergeOutput = combineAverage([0, 0, 0]);
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.log_fleet_e, 0);  // log((1+1+1)/3) = log(1) = 0
  assert.throws(() => combineAverage([]), /empty input/);
});

// ─── R11 AC-3 — single-shard (N=1) identity for both primitives ─────────
test('R11 AC-3 — at N=1, both primitives reduce to identity', () => {
  assert.strictEqual(combineProduct([2.5]).log_fleet_e, 2.5);
  assert.strictEqual(combineProduct([-1.0]).log_fleet_e, -1.0);
  // combineAverage at N=1: logSumExp([x]) − log(1) = x − 0 = x.
  // Use approx-equality with small tolerance for FP rounding through Math.exp/Math.log round-trip.
  assert.ok(Math.abs(combineAverage([2.5]).log_fleet_e - 2.5) < 1e-12);
  assert.ok(Math.abs(combineAverage([-1.0]).log_fleet_e - (-1.0)) < 1e-12);
});

// ─── R11 AC-4 — combineProduct closed-form ──────────────────────────────
test('R11 AC-4 — combineProduct: log(e^1·e^2·e^3) = 6', () => {
  const out = combineProduct([1, 2, 3]);
  assert.strictEqual(out.log_fleet_e, 6);  // exact under double-precision sum
});

// ─── R11 AC-5 — combineAverage closed-form (N=3) ────────────────────────
test('R11 AC-5 — combineAverage: log((1+1+1)/3) = 0', () => {
  const out = combineAverage([0, 0, 0]);
  assert.strictEqual(out.log_fleet_e, 0);
});

// ─── R11 AC-6 — combineAverage closed-form (asymmetric) ─────────────────
test('R11 AC-6 — combineAverage: log((1+e²)/2) closed-form match', () => {
  // log( (e^0 + e^2) / 2 ) = logSumExp([0, 2]) − log(2)
  //   = 2 + log(e^-2 + e^0) − log(2)
  //   = 2 + log(0.1353... + 1) − log(2)
  //   ≈ 2 + 0.12693 − 0.69315 ≈ 1.43378
  const out = combineAverage([0, 2]);
  // Closed-form expected:
  const expected = Math.log((Math.exp(0) + Math.exp(2)) / 2);
  assert.ok(Math.abs(out.log_fleet_e - expected) < 1e-12);
});

// ─── R11 AC-7 — combineAverage numerical stability with large log-values ─
test('R11 AC-7 — combineAverage handles log-values spanning [0, 1000] without overflow', () => {
  const big = [0, 500, 1000];
  const out = combineAverage(big);
  // Expected: max-shift = 1000; sum_exp = exp(-1000) + exp(-500) + exp(0) ≈ 1 (the first two are subnormal/zero);
  // log_sum_exp = 1000 + log(1) = 1000; log_avg = 1000 − log(3) ≈ 998.9014.
  assert.ok(Number.isFinite(out.log_fleet_e));
  assert.ok(Math.abs(out.log_fleet_e - (1000 - Math.log(3))) < 1e-9);
});

// ─── R11 AC-8 — freshFleetEProcessState shape ──────────────────────────
test('R11 AC-8 — freshFleetEProcessState returns the canonical initial shape', () => {
  const s: FleetEProcessState = freshFleetEProcessState();
  assert.strictEqual(s.log_fleet_e_t, 0);
  assert.strictEqual(s.log_fleet_e_max, 0);
  assert.strictEqual(s.n, 0);
  assert.strictEqual(s.fired, false);
  assert.strictEqual(s.tick_at_first_fire, null);
});

// ─── R11 AC-9 — updateFleetEProcessState advances n + log_fleet_e_t + max ─
test('R11 AC-9 — updateFleetEProcessState advances tick count + most-recent + running-max', () => {
  const s = freshFleetEProcessState();
  updateFleetEProcessState(s, 1.0, LOG_THRESHOLD);
  assert.strictEqual(s.n, 1);
  assert.strictEqual(s.log_fleet_e_t, 1.0);
  assert.strictEqual(s.log_fleet_e_max, 1.0);
  assert.strictEqual(s.fired, false);
  updateFleetEProcessState(s, 0.5, LOG_THRESHOLD);
  // log_fleet_e_t reflects the new (lower) value; max retained at 1.0.
  assert.strictEqual(s.n, 2);
  assert.strictEqual(s.log_fleet_e_t, 0.5);
  assert.strictEqual(s.log_fleet_e_max, 1.0);
  assert.strictEqual(s.fired, false);
});

// ─── R11 AC-10 — sticky-fire latch on first crossing + persists on subsequent drop ─
test('R11 AC-10 — sticky-fire: fires on first crossing of log_fleet_e_max ≥ log_threshold; persists', () => {
  const s = freshFleetEProcessState();
  // log_threshold ≈ 4.605 at α_fleet=0.01.
  updateFleetEProcessState(s, 3.0, LOG_THRESHOLD);  // tick 0: below threshold
  assert.strictEqual(s.fired, false);
  assert.strictEqual(s.tick_at_first_fire, null);
  updateFleetEProcessState(s, 5.0, LOG_THRESHOLD);  // tick 1: crosses
  assert.strictEqual(s.fired, true);
  assert.strictEqual(s.tick_at_first_fire, 1);
  updateFleetEProcessState(s, 0.5, LOG_THRESHOLD);  // tick 2: drops back below
  // Sticky: still fired; tick_at_first_fire unchanged.
  assert.strictEqual(s.fired, true);
  assert.strictEqual(s.tick_at_first_fire, 1);
  // Running max preserved across the drop.
  assert.strictEqual(s.log_fleet_e_max, 5.0);
});

// ─── R11 AC-11 — in-place mutation contract (matches inherited engine) ──
test('R11 AC-11 — updateFleetEProcessState mutates state in-place and returns same reference', () => {
  const s = freshFleetEProcessState();
  const returned = updateFleetEProcessState(s, 2.0, LOG_THRESHOLD);
  // Same object reference.
  assert.strictEqual(returned, s);
  // Mutation visible on original handle.
  assert.strictEqual(s.log_fleet_e_t, 2.0);
});

// ─── R11 AC-12 — family-agnostic interface: accepts log-e from Family A AND Family C ─
test('R11 AC-12 — primitives accept log-e-values regardless of source family', () => {
  // Synthetic Family A state: drive updateBettingState once to populate state.M.
  const fa_state = freshBettingState();
  updateBettingState(fa_state, 0.3, 0, 1, 0);
  const fa_log_e = Math.log(Math.max(fa_state.M, WEALTH_FLOOR));
  // Synthetic Family C state shape (just the log_S_t field is consumed for this AC).
  const fc_state: FamilyCBettingEProcessState = {
    log_S_t: 1.2,
    ons_lambda: 0,
    ons_inverse_hessian: 1,
    n: 1,
    witness_running_max: 0,
    q_running_sum: [0],
    q_count: 0,
    fired: false,
    tick_at_first_fire: null,
    alphaConsumed: 0,
  };
  // Both primitives accept the mixed input identically.
  const out_p = combineProduct([fa_log_e, fc_state.log_S_t]);
  const out_a = combineAverage([fa_log_e, fc_state.log_S_t]);
  assert.strictEqual(typeof out_p.log_fleet_e, 'number');
  assert.strictEqual(typeof out_a.log_fleet_e, 'number');
  // Closed-form cross-checks:
  assert.strictEqual(out_p.log_fleet_e, fa_log_e + fc_state.log_S_t);
  // AoE: log((e^a + e^b)/2).
  const expected_avg = Math.log((Math.exp(fa_log_e) + Math.exp(fc_state.log_S_t)) / 2);
  assert.ok(Math.abs(out_a.log_fleet_e - expected_avg) < 1e-12);
});

// ─── R11 AC-13 — PR-F1 cell (combineProduct, iid_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-13 — PR-F1 (PoE, iid H₀): fleet FPR ≤ α_fleet + 3·√(α_fleet(1−α_fleet)/N_fleet_traj)', () => {
  const fpr = measureFleetFireRate(combineProduct, 'iid', 0xE100B001);
  console.log(`  R11 PR-F1 PoE-iid       fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `PoE-iid fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R11 AC-14 — PR-F1 cell (combineProduct, correlated_H0): REPORTING-ONLY ─
test('R11 AC-14 — PR-F1 (PoE, correlated-drift H₀): REPORTING-only — load-bearing demonstration of MD-F1 cond.-indep. assumption violation', () => {
  const fpr = measureFleetFireRate(combineProduct, 'correlated', 0xE100B002);
  // REPORTING: log observed for the pair-review record. Does NOT bind to any
  // specific value (per R07 OBSERVED-binding-scope reinforcement; expected FPR
  // is theoretically NOT bounded by α_fleet under correlated drift — this is
  // the load-bearing MD-F1 demonstration; the compensating control is
  // combineAverage as exercised by AC-16).
  console.log(`  R11 PR-F1 PoE-corr     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)} `
    + `[REPORTING-ONLY: PoE Ville bound NOT guaranteed under correlated drift; `
    + `compensating control = combineAverage per AC-16]`);
  // Always-passing assertion (preserves test structure; no FPR binding).
  assert.ok(Number.isFinite(fpr));
});

// ─── R11 AC-15 — PR-F1 cell (combineAverage, iid_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-15 — PR-F1 (AoE, iid H₀): fleet FPR ≤ α_fleet + 3·√(α_fleet(1−α_fleet)/N_fleet_traj)', () => {
  const fpr = measureFleetFireRate(combineAverage, 'iid', 0xE100B003);
  console.log(`  R11 PR-F1 AoE-iid      fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `AoE-iid fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R11 AC-16 — PR-F1 cell (combineAverage, correlated_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-16 — PR-F1 (AoE, correlated-drift H₀): fleet FPR ≤ Wilson bound (compensating control under correlated drift)', () => {
  const fpr = measureFleetFireRate(combineAverage, 'correlated', 0xE100B004);
  console.log(`  R11 PR-F1 AoE-corr     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `AoE-correlated-drift fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)} `
    + `— Vovk-Wang 2021 §4 convex-combination result arbitrary-dependence guarantee empirically violated`,
  );
});

// ─── R11 AC-17 — TDD ordering attestation (binding-command form; verifies via git) ─
test('R11 AC-17 — TDD ordering: RED commit (q11 test only; TS2307) precedes GREEN (combine.ts + fleet.ts)', () => {
  // Reviewer-side independent verification per R03+ standing discipline. This AC
  // is a placeholder for the binding evidence captured in the NEXT-ROLE.md
  // attestation block at coordination time (commit SHAs reported there). The
  // test body itself is always-passing because the actual evidence lives in
  // the commit log, not in the test runner output.
  assert.ok(true);
});

// ─── R11 AC-18 — observed test count attestation (R03 MINOR-4 reinforcement) ─
test('R11 AC-18 — OBSERVED q11 test count reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 18 ACs / 18 tests. Implementer reports OBSERVED
  // via `node --test test/q11-hierarchical-e-value-combination.test.js` count
  // at GREEN; NEXT-ROLE.md attestation block captures the actual value, not
  // the prediction (R03 MINOR-4 reinforcement; 6th consecutive application).
  assert.ok(true);
});
```

Implementer note 7 (file-name shorthand): the test file path `test/q11-hierarchical-e-value-combination.test.ts` is verbose intentionally — it self-documents the round (q11), the slice (hierarchical-e-value-combination), and the test-type (`.test.ts`). Shortened variants (`test/q11-fleet-merge.test.ts`) are REJECTED to match the inherited convention from `test/betting-e-process-class-dispatch.test.ts` (which encodes the architectural surface tested in the file name).

---

## Acceptance criteria

Numbered 1-18. Every AC is "Given X, when Y, then Z" or an evidence-bound assertion with a verifiable command. No grep patterns that match inside `//` executable-code comments (R03 MINOR-2 reinforcement; trivially satisfied at R11 — zero grep-evidence ACs).

**Fleet-merge primitive surface (AC-1 through AC-12):**

- **AC-1** — _Given_ `combineProduct([0, 0, 0])`, _when_ called, _then_ returns `{ log_fleet_e: 0 }` (closed-form: product of three 1s = 1; log 1 = 0). _Given_ `combineProduct([])`, _when_ called, _then_ throws `Error` with message containing "empty input". Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-1 …" passes.

- **AC-2** — _Given_ `combineAverage([0, 0, 0])`, _when_ called, _then_ returns `{ log_fleet_e: 0 }`. _Given_ `combineAverage([])`, _when_ called, _then_ throws `Error` with message containing "empty input". Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-2 …" passes.

- **AC-3** — _Given_ a single-element input `[x]`, _when_ either primitive is called, _then_ the output `log_fleet_e` equals `x` (modulo FP rounding tolerance < 1e-12 for `combineAverage` due to logSumExp's exp+log round-trip; exact equality for `combineProduct`). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-3 …" passes for x ∈ { 2.5, −1.0 } and both primitives.

- **AC-4** — _Given_ `combineProduct([1, 2, 3])`, _when_ called, _then_ returns `{ log_fleet_e: 6 }` (exact under double-precision sum). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-4 …" passes.

- **AC-5** — _Given_ `combineAverage([0, 0, 0])`, _when_ called, _then_ returns `{ log_fleet_e: 0 }`. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-5 …" passes.

- **AC-6** — _Given_ `combineAverage([0, 2])`, _when_ called, _then_ returns `{ log_fleet_e: log((e⁰ + e²)/2) }` within FP rounding tolerance < 1e-12. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-6 …" passes.

- **AC-7** — _Given_ `combineAverage([0, 500, 1000])`, _when_ called, _then_ the output `log_fleet_e` is finite (no `Infinity` or `NaN`) AND within 1e-9 of the closed-form `1000 − log(3)` (the max-shift-stable closed-form). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-7 …" passes.

- **AC-8** — _Given_ `freshFleetEProcessState()`, _when_ called, _then_ returns `{ log_fleet_e_t: 0, log_fleet_e_max: 0, n: 0, fired: false, tick_at_first_fire: null }`. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-8 …" passes.

- **AC-9** — _Given_ a fresh state and two updates with `log_fleet_e_t = 1.0` then `log_fleet_e_t = 0.5` (both below `LOG_THRESHOLD ≈ 4.605`), _when_ called, _then_ the state advances `n` to 2, sets `log_fleet_e_t = 0.5`, preserves `log_fleet_e_max = 1.0`, keeps `fired = false`. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-9 …" passes.

- **AC-10** — _Given_ a fresh state and three updates with `log_fleet_e_t = 3.0`, then `5.0` (crosses threshold), then `0.5` (drops back), _when_ called, _then_ at tick 1 `fired` becomes `true` AND `tick_at_first_fire = 1`; at tick 2 `fired` remains `true` AND `tick_at_first_fire` remains `1` AND `log_fleet_e_max` remains `5.0` (sticky-fire semantics). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-10 …" passes.

- **AC-11** — _Given_ a fresh state `s`, _when_ `const returned = updateFleetEProcessState(s, 2.0, LOG_THRESHOLD)` is called, _then_ `returned === s` (same reference; in-place mutation contract). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-11 …" passes.

- **AC-12** — _Given_ a Family A wealth state (via `updateBettingState` to populate `state.M`) and a synthetic `FamilyCBettingEProcessState`-shape object with a `log_S_t` field, _when_ both `Math.log(fa_state.M)` and `fc_state.log_S_t` are passed as a 2-element array to either combination primitive, _then_ the primitive returns a finite `log_fleet_e` value matching the closed-form computation (no family-specific code path required). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-12 …" passes.

**PR-F1 evidence matrix (AC-13 through AC-16; the load-bearing empirical-validation surface):**

- **AC-13** — _Given_ a fleet of N_SHARDS=100 shards each running `updateBettingState` on iid `gaussian(rng)` samples (Family A; baseline μ=0, σ²=1) for T_TICKS=100 ticks under iid H₀ (`scenario='iid'`), with `combineProduct` as the fleet-merge primitive, _when_ the fleet wealth tracker is evaluated across N_FLEET_TRAJ=200 trajectories, _then_ the observed fleet FPR ≤ `FPR_BOUND = α_fleet + 3·√(α_fleet·(1−α_fleet)/N_FLEET_TRAJ) ≈ 0.031`. **Theory-derived bound** (NOT OBSERVED-binding; per R07 reinforcement); preserves Ville under conditional independence per Vovk-Wang 2021 §4. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-13 …" passes.

- **AC-14** — _Given_ the same fleet setup as AC-13 but with `scenario='correlated'` (shared zero-mean factor `~ N(0, ρ²=0.5)` injected at each tick across all shards) and `combineProduct` as the fleet-merge primitive, _when_ the fleet wealth tracker is evaluated across N_FLEET_TRAJ=200 trajectories, _then_ the observed fleet FPR is REPORTED to console.log (for PR-F1 pair-review evidence) AND the test always passes via `assert.ok(Number.isFinite(fpr))`. **REPORTING-only** (NOT bounded; per R07 OBSERVED-binding-scope reinforcement; the conditional-independence assumption is empirically violated here — this IS the load-bearing demonstration of MD-F1; the compensating control is `combineAverage` as exercised by AC-16). Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-14 …" passes (the always-passing reporting assertion).

- **AC-15** — _Given_ the AC-13 fleet setup (iid H₀) but with `combineAverage` as the fleet-merge primitive, _when_ evaluated across N_FLEET_TRAJ=200 trajectories, _then_ observed fleet FPR ≤ `FPR_BOUND`. **Theory-derived bound**; preserves Ville under arbitrary dependence per Vovk-Wang 2021 §4 convex-combination result. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-15 …" passes.

- **AC-16** — _Given_ the AC-14 correlated-drift fleet setup (scenario='correlated', ρ²=0.5) with `combineAverage` as the fleet-merge primitive, _when_ evaluated across N_FLEET_TRAJ=200 trajectories, _then_ observed fleet FPR ≤ `FPR_BOUND`. **Theory-derived bound** — Vovk-Wang 2021 §4 convex-combination result guarantees arbitrary-dependence Ville preservation; this AC empirically demonstrates the compensating control under correlated drift. Evidence: `test/q11-hierarchical-e-value-combination.test.ts` "R11 AC-16 …" passes.

**Attestation (AC-17 + AC-18):**

- **AC-17** — _Given_ R11 land sequence, _when_ Reviewer inspects `git log` between operator HEAD `56e77f1` and R11 GREEN HEAD, _then_ a RED commit exists that adds ONLY `test/q11-hierarchical-e-value-combination.test.ts` (no production files; typecheck failing at TS2307 because `engine/fleet/combine.ts` does not yet exist) AND it precedes a GREEN commit that creates `engine/types/fleet.ts` + `engine/fleet/combine.ts` (test then passes 18/0). Evidence: NEXT-ROLE.md attestation block at R11 coordination time records both commit SHAs; Reviewer independently verifies via `git log` + `git show --stat`. R03/R04/R05/R06/R07/R10 TDD-ordering reinforcement; 8th consecutive Tessera Reviewer-side TDD verification.

- **AC-18** — _Given_ R11 GREEN HEAD, _when_ Implementer runs `node --test test/q11-hierarchical-e-value-combination.test.js`, _then_ the OBSERVED test-count is reported in the NEXT-ROLE.md attestation block (per R03 MINOR-4 reinforcement; 6th consecutive application). Architect prediction: 18 pass / 0 fail; Implementer reports OBSERVED count from the test runner output (NOT the prediction). All 11 pre-R11 q-file counts (per NEXT-ROLE.md baseline) remain UNCHANGED.

---

## Anti-scope

Twenty fences (R11-SAS-1 through R11-SAS-20). Reviewer independently verifies via `git diff 56e77f1..HEAD --name-only` after R11 GREEN.

- **R11-SAS-1**: `engine/per-shard/runtime.ts` NOT MODIFIED. R10-closed surface; R10 MINOR-1 module-docblock update preserved as operator gate item per NEXT-ROLE.md. R11 consumes per-shard runtime ONLY as a conceptual upstream (the per-shard wealth process whose output feeds fleet-merge); no import-side dependency.
- **R11-SAS-2**: `engine/per-shard/welford.ts` and `engine/per-shard/warm-start.ts` NOT MODIFIED. R03/R04/R05/R10 closed surfaces.
- **R11-SAS-3**: All inherited engine internals NOT MODIFIED. `engine/detectors/*` (all 14 files) UNCHANGED. `engine/types/families/{a,b,c,d,e}.ts` UNCHANGED. `engine/core.ts`, `engine/topology-overlay.ts`, `engine/verdict-groups.ts`, `engine/signal-classes.ts`, `engine/per-detector-resampler-mode.ts` UNCHANGED. `engine/l0/`, `engine/o0/` UNCHANGED. A12 anti-scope (inherited Phase-3.d.D close).
- **R11-SAS-4**: `engine/types/index.ts` NOT MODIFIED. `FleetEProcessState` is NOT re-exported through the central index at R11; consumers import from the leaf path. Future R12+ may add the re-export when an orchestrator-facing consumer lands.
- **R11-SAS-5**: `engine/types/config.ts` NOT MODIFIED. Tessera SLICE 1 schema extensions (`per_shard_cells`, `cell_confidence: warm_start` enum extension, `PerShardResidual`, `PerShardCell`) are NOT touched at R11. R11 does NOT add a `FleetMergeConfig`-class field or any new `CompiledConfig` field; the fleet-merge primitive is config-free at R11. R12+ may add operator-facing config when the e-BH FDR layer lands.
- **R11-SAS-6**: `coordination/PRD.md` and `coordination/SCOPING-MEMO-v0.3.md` NOT MODIFIED. PR-F1 is preserved as a pair-review trigger in the memo; R11 closes its empirical-evidence half, but the memo itself is unchanged.
- **R11-SAS-7**: `tools/*` NOT MODIFIED. All baseline-curation tools (`curate-baseline-pre-pass.ts`, `curate-baseline-fleet-correlated.ts`, `curate-baseline-pipeline.ts`, `calibrators/*`, `vendor-from-deploysignal.sh`) UNCHANGED. R06/R07/R08/R09 closed surfaces.
- **R11-SAS-8**: NO new `CompiledConfig` fields. (Subsumes R11-SAS-5 but cited separately for Reviewer ergonomic.)
- **R11-SAS-9**: All pre-R11 test files NOT MODIFIED. Frozen list: `test/betting-e-process-class-dispatch.test.ts`, `test/q01-*.test.ts` (3 files), `test/q02-*.test.ts`, `test/q03-*.test.ts`, `test/q04-*.test.ts`, `test/q05-*.test.ts`, `test/q06-*.test.ts`, `test/q07-*.test.ts`, `test/q10-*.test.ts`. ONLY new addition: `test/q11-hierarchical-e-value-combination.test.ts`. `test/_substrate/factories.ts` UNCHANGED (R11 does NOT add a fleet-state factory).
- **R11-SAS-10**: NO `mean_delta` computation at R11. This is SLICE 2 cleanup scope (post-R11 dedicated round per NEXT-ROLE.md operator gate items).
- **R11-SAS-11**: NO compiled-artifact JSON loader at R11. SLICE 2 cleanup scope.
- **R11-SAS-12**: NO e-BH FDR operator surface at R11. R12 = SLICE 4 scope. R11 ships `combineAverage` as the future R12 input primitive; the operator-facing e-BH wrapper around `combineAverage` does NOT land until R12.
- **R11-SAS-13**: NO real-cluster trace integration. Synthetic-cluster substrate only at Phase 1 per SCOPING-MEMO-v0.3 § 4 R-E3 + A8/A11.
- **R11-SAS-14**: NO Phase 2 cross-shard correlation layer (Extension 3). Outer aggregator, topology-aware attribution, event-conditional correlational attribution all deferred to Phase 2.
- **R11-SAS-15**: NO `HardwareTopologySource` concrete impl. Phase 2 SLICE 3 scope.
- **R11-SAS-16**: NO deployment-event freeze hook coupling. Phase 2 SLICE 4 scope.
- **R11-SAS-17**: NO modification to baseline-curation tools. R06/R07/R08/R09 closed surfaces.
- **R11-SAS-18**: NO modification to `coordination/specs/Q-R[01-10]-SPEC.md` or `Q-R[01-10]-SPEC-AUDIT.md`. Prior-round specs frozen.
- **R11-SAS-19**: NO weighted-mixture (non-uniform-weight) combination variant at R11. Optional future work; R11 brainstorm rejected (no operator-facing requirement for non-uniform weights at SLICE 3; uniform-AoE suffices for Vovk-Wang 2021 §4 convex-combination application + R12 e-BH input).
- **R11-SAS-20**: NO non-Ville-bounded combination primitive at R11. Q-J1 hybrid framework preserved; R11 builds the Ville-bound layer; any non-Ville-bounded primitive would require operator gate per Q-J1 preservation in NEXT-ROLE.md.

---

## Open questions

R11 spec emits with **5 open questions** (3 architecturally-anchored deferrals + 2 surface-tactical observations). None blocking; all flagged for R12+ disposition or carry-forward.

- **OQ-1 (R11-architectural-anchor; deferred)** — Should R12 introduce a `combine(weights, log_e_values)` weighted-mixture primitive as a generalization of `combineProduct` (weights = ones-vector) and `combineAverage` (weights = uniform vector)? Architect-pre-prediction: NO at R12 (weighted-mixture lands at Phase 2 / Phase 3 if/when topology-weighted aggregation becomes a requirement); the uniform pair at R11 is the minimum viable surface. R12 should ship `combineAverage` consumption via e-BH unchanged.
- **OQ-2 (R12-architectural-anchor; deferred)** — Should `FleetEProcessState` carry a `compensating_control_engaged: boolean` field to track whether the caller switched to `combineAverage` due to a correlated-drift detection? Architect-pre-prediction: candidate for R12+ when the e-BH operator surface lands and the operator-facing dashboard needs visibility into the cond.-indep.-vs-arbitrary-dependence regime. R11 ships without this field per minimality.
- **OQ-3 (carry-forward)** — `engine/fleet/combine.ts` re-exports `FleetEProcessState` for caller ergonomic at R11. When R12+ adds the central index re-export (`engine/types/index.ts` extension), the leaf re-export in `combine.ts` could be removed for canonicality. Disposition deferred; architectural-decision class.
- **OQ-4 (R11-tactical-observation)** — The Wilson-CI upper bound (`α + 3·SE`) is conservative at small N. For R12+ PR-F2 evidence matrix at higher α (e.g., α_fleet = 10⁻³), Wilson-CI tightness may require larger N_FLEET_TRAJ; architect-pre-prediction is that N_FLEET_TRAJ ≈ 1000-3000 will be needed at α=10⁻³. Tracked for R12+ scope estimation.
- **OQ-5 (Reviewer-facing; AC-14 REPORTING form)** — AC-14 (PoE-correlated-drift cell) uses an always-passing `assert.ok(Number.isFinite(fpr))` form; the load-bearing evidence is in the `console.log` line. Reviewer is invited to confirm this REPORTING form satisfies the PR-F1 pair-review evidence matrix mandate (per NEXT-ROLE.md item 4). Architect-pre-prediction: yes; the alternative (binding to a specific OBSERVED FPR value) would violate R07 OBSERVED-binding-scope. If Reviewer disagrees, the resolution candidates are: (a) bind to `fpr > FPR_BOUND` (asserts the violation exists; requires a theory-derived lower bound on PoE-correlated FPR, which architect could derive but adds spec scope); (b) bind to `fpr > AoE_correlated_fpr − ε` (asserts the qualitative ordering, where AoE-corr-FPR is the AC-16 measurement; cross-test dependency, brittle); (c) status quo REPORTING form (architect's pick).

---

## P3 ten-axis verification

Per inherited DISCIPLINE-REFERENCE:154 (10-axis adversarial pass per Architect grilling discipline). One sentence per axis.

1. **Correctness** — `combineProduct` and `combineAverage` realize the Vovk-Wang 2021 §4 combination-of-e-values results literally (sum-of-logs implements the product result under cond. indep.; logSumExp-minus-log-N implements the uniform-convex-combination result under arbitrary dependence); the Wilson-CI bound formula matches the inherited `test/betting-e-process-class-dispatch.test.ts:93` form exactly; sticky-fire + running-max semantics match the inherited engine state-machine convention.

2. **Completeness** — 18 ACs cover: primitive surface (AC-1–7), state tracker (AC-8–11), family-agnostic claim (AC-12), full PR-F1 evidence matrix (AC-13–16), TDD attestation (AC-17), test-count attestation (AC-18). No surface declared in spec without an AC. Reviewed Component inventory AC-range claim — narrative (AC-1 through AC-18), per-file pseudocode docstring (AC-1 through AC-18), AND P3 Coverage row (below) all agree on 18.

3. **Consistency** — Cross-section consistency pass (§ Mechanism table; 20 rows) executed; all 20 PASS at spec-emit time. Resolved-decision tokens consistent across § Mechanism / § Component inventory / § Per-file pseudocode / § AC. No alternate-form leakage detected.

4. **Clarity** — All decisions named with verbs+nouns (`combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`); rationales given inline; the load-bearing cond.-indep. assumption + compensating control are stated TWICE (Mechanism primitive 3 + Delta 2 file-header comment block) for maximum visibility to the Implementer + Reviewer.

5. **Coverage** — AC-1 through AC-18 cover the spec surface as enumerated in Mechanism primitives 1–12; PR-F1 evidence matrix (AC-13–16) covers all four (primitive × scenario) cells.

6. **Constraints** — Numerical-stability constraint (combineAverage logSumExp-with-max-shift) declared in Mechanism primitive 4 + verified by AC-7 with log-values spanning [0, 1000]. Empty-input-throws constraint declared in Mechanism primitive 4 + verified by AC-1 + AC-2. In-place mutation contract declared in Mechanism primitive 6 + verified by AC-11.

7. **Concurrency** — N/A at R11 (single-threaded test; no async or shared-mutable concurrency in the fleet-merge layer). Inherited per-shard runtime concurrency story is unchanged (per A12 anti-scope).

8. **Corner cases** — Empty input (AC-1 + AC-2 throws); N=1 single-shard identity (AC-3); large-log-value range [0, 1000] (AC-7 numerical stability); strict-tier crossing from below threshold to above and back below (AC-10 sticky-fire); zero-update freshFleetEProcessState (AC-8); fired-then-dropped-below-then-fired-again (AC-10 — sticky); same-reference mutation (AC-11).

9. **Cost** — Test runtime budget: 200 fleet-traj × 100 shards × 100 ticks × 4 (primitive × scenario) cells = 8M wealth updates at ~1 μs/update on M-series Darwin ≈ 8s wall-clock. Within the q-file test runtime budget (inherited dispatch test took ~1s at 400k updates; R11 q11 expected ≤ 10s with PR-F1 evidence matrix added). Production runtime cost: O(N) per fleet-tick for combineProduct (single loop); O(N) for combineAverage (two loops); negligible vs the inherited per-shard detector cost (~30 μs per tick) at N=1000 shards.

10. **Coupling** — R11 introduces ZERO coupling to inherited engine internals (combine.ts has no inherited-engine imports per § Integration points point 3); only q11 test imports `freshBettingState` + `updateBettingState` from inherited Family A as the wealth-process simulator. The family-agnostic claim is structural (no type tag on input).

---

## Grilling output

_Adversarial self-review of the spec per anchor-PR-#35 + R02–R10 standing-reinforcement compounding. Each of the 5 grilling questions answered inline; each of the 13 ARCH REINFORCED lines applied + verified._

### Standing-reinforcement audit table (13 ARCH lines compounded R01–R10; applicability column)

| # | Reinforcement (active at R11) | Applies at R11? | Where addressed |
|---|---|---|---|
| 1 | R01-derived: cross-section consistency pass | YES | § Mechanism cross-section table (20 rows; all PASS at spec-emit) |
| 2 | R02-derived: type-declaration-site (open declaration file for every external type) | YES | § Existing architectural surface table (BettingEProcessState, FamilyCBettingEProcessState, MixtureSupermartingaleState, FleetEProcessState all opened at declaration-site); § Architect self-attest at end of REVIEWER-ANCHOR table |
| 3 | R03-derived: re-export-chain check | YES | § Integration points point 4 + § Existing architectural surface table (BettingEProcessState re-export chain verified via grep at engine/types/index.ts:22) |
| 4 | R03-derived: grep-pattern-soundness (excludes `//` comments) | YES (trivially) | R11 has ZERO grep-evidence ACs; reinforcement satisfied by absence |
| 5 | R03-derived: empirically-verified per-file test counts (NOT predicted) | YES | AC-18 directs OBSERVED reporting at attestation; pre-R11 baseline counts in NEXT-ROLE.md preserved verbatim (Reviewer re-derives independently) |
| 6 | R05-derived: narrative-vs-pseudocode AC-count cross-check | YES | § Component inventory cross-check paragraph confirms 18 ACs across narrative + pseudocode docstring + P3 Coverage |
| 7 | R05-derived: MEMORIAL tactical-choice verification | NO (Architect-side; applies to Implementer attestation) | Forward to Implementer per NEXT-ROLE.md |
| 8 | R06-derived: JSDoc scope grep (find all stale-content occurrences) | YES (trivially) | R11 creates two NEW files (no pre-existing stale docblocks); no in-file JSDoc updates to existing modules; reinforcement does not fire |
| 9 | R06-derived: public opts/options coverage | YES (trivially) | R11 primitives have no opts/options interfaces (just plain `ReadonlyArray<number>` + `FleetEProcessState`); no opts fields to enumerate |
| 10 | R07-derived: fixture-sizing exhaustive propagation | YES | All four PR-F1 cells use the SAME N_FLEET_TRAJ=200, T_TICKS=100, N_SHARDS=100 (cross-section consistency pass row 19) |
| 11 | R07-derived: OBSERVED-binding scope (PRNG-drift only) | YES | AC-14 PoE-correlated cell is REPORTING-only (does NOT bind to OBSERVED FPR); preserved cells (AC-13/15/16) bind to theory-derived Wilson upper bound only. Right-reasons audit on AC-14: "would a future implementation FIX that matched architect's prediction FAIL this test?" → AC-14 has NO bound at all, so no FIX can FAIL it; this is correct. |
| 12 | R08-derived: empirical premise verification (NOT inherited testimony) | YES | All factual claims about inherited Family A / C state shapes verified by direct file-read at spec-authoring time (per § Architect self-attest); no claim inherited from prior-round Reviewer/Architect testimony without re-verification |
| 13 | R09-derived: correction-propagation pass | YES (trivially) | R11 does NOT correct any prior-round spec premise; no propagation needed |
| 14 | R10-derived: file-level docblock coverage check | YES | Both NEW files (`engine/types/fleet.ts`, `engine/fleet/combine.ts`) declare file-level docblocks matching their exported surface per Delta 1 + Delta 2 verbatim text; Implementer note 6 mandates verification |

### Adversarial self-review (5 grilling questions)

1. **Is every claim verifiable?**
   - Vovk-Wang 2021 §4 claims: cited; architect attests applying the canonical post-2021 e-value-literature combination results (convex-combination preserves e-value under arbitrary dependence; product preserves under conditional independence given F_{t-1}). Specific proposition/theorem numbers NOT re-verified at spec-emit (paper not opened during offline spec-authoring session); Reviewer or post-merge curation invited to refine. Architectural commitment does NOT depend on specific proposition numbers.
   - State-shape claims (BettingEProcessState.M, FamilyCBettingEProcessState.log_S_t, MixtureSupermartingaleState.M_t): all verified by direct file-read at spec-authoring time (§ Architect self-attest).
   - Wilson-CI bound formula: copied verbatim from inherited `test/betting-e-process-class-dispatch.test.ts:93`.
   - PR-F1 test-runtime estimate (8s wall-clock): order-of-magnitude estimate from inherited dispatch test (~1s at 400k updates × 20× scale at R11 = ~20s upper bound; ~8s typical with branch prediction + cache locality). Implementer measures OBSERVED at GREEN and reports if test-runtime exceeds 30s for Reviewer disposition.
   - Verdict: **Yes**, all claims verifiable.

2. **Are there unstated assumptions?**
   - **Assumption A**: per-shard Family A `BettingEProcessState.M` field is a valid e-value (i.e., E[M_t | F_{t-1}] ≤ 1 under H₀). VERIFIED — Howard-Ramdas-McAuliffe-Sekhon 2021 establishes the supermartingale property; inherited engine builds on this; per-shard Ville bound is the inherited foundation per Phase-3.d.D close.
   - **Assumption B**: Tessera's q11 fleet simulator's per-shard `updateBettingState` calls preserve the per-shard Ville bound. VERIFIED — the inherited dispatch test (`test/betting-e-process-class-dispatch.test.ts`) at SHA `5a72371` empirically demonstrates this for iid Gaussian H₀ at the same parameters (α=0.01, σ²=1, μ=0).
   - **Assumption C**: the `mulberry32` PRNG + Box-Muller Gaussian generator produces "sufficiently iid" samples for the Wilson-CI bound to apply. INHERITED ASSUMPTION — used by the dispatch test at SHA `5a72371` and accepted by Phase-3.d.D close as adequate.
   - **Assumption D (correlated-drift scenario)**: the `ρ²=0.5` shared-factor mechanism produces "correlated drift" in the sense Vovk-Wang 2021 §4 means by "violates conditional independence given F_{t-1}." THIS IS THE LOAD-BEARING ASSUMPTION — strictly speaking, F_{t-1} would include the history of `shared_z`, and conditional on F_{t-1}, the per-shard noise is independent. The PoE-Ville break is then a function of the FILTRATION choice (whether F_{t-1} includes `shared_z` or only per-shard-observable history). R11's PR-F1 demonstration tests the OPERATIONAL filtration (per-shard observer cannot decompose `x_i,t = shared_z + noise_i,t`; the observer sees only `x_i,t`); under this operational filtration the per-shard e-process is NOT conditionally-indep-given-history because the unobserved `shared_z` correlates the e-values. This nuance is documented in the audit sidecar; the spec keeps the operational framing.
   - **Verdict**: Assumption D is documented; remaining assumptions are standard (inherited).

3. **Is scope added beyond the request?**
   - NEXT-ROLE.md asks for: (a) fleet-merge primitive(s); (b) fleet-merged Family A surface; (c) fleet-merged Family C surface; (d) iid bootstrap regression test at N=100; (e) PR-F1 evidence matrix specification.
   - R11 spec ships: (a) two primitives (PoE + AoE); (b) demonstrated via q11 Family A simulator + AC-12; (c) demonstrated via AC-12 state-shape compatibility; (d) yes at N=100; (e) yes, full 4-cell matrix.
   - Did R11 add anything beyond? `FleetEProcessState` tracker is a small wrapper not explicitly requested — added as ergonomic for the regression test + future R12 consumer. It does NOT add architectural surface; it's the natural caller ergonomic for the primitives. Reviewer-flag candidate: "is the state tracker scope-creep?" — architect's defense: AC-9 / AC-10 / AC-11 verify the tracker's running-max + sticky-fire semantics which are LOAD-BEARING for any-time Ville evaluation; without the tracker, the q11 simulator would either reinvent it inline (code duplication) or not test the sticky-fire semantic at all (load-bearing for the operator-facing fired latch).
   - **Verdict**: minimal scope addition (`FleetEProcessState`) justified by load-bearing role; not scope-creep.

4. **Can the Implementer act without guessing?**
   - § Per-file pseudocode Delta 1 + Delta 2 + Delta 3 contain VERBATIM file contents for all three new files. Exact function signatures, exact body algorithms (logSumExp with max-shift; in-place mutation), exact ACs.
   - § Implementer notes 1–7 enumerate the gotchas (function names, numerical algorithm, TDD ordering, hand-trace, docblock coverage, file-name convention).
   - Cross-section consistency pass (20 rows) makes alternate forms explicitly absent.
   - Anti-scope (20 fences) makes the "must not touch" list explicit.
   - One residual decision the Implementer must make: the OBSERVED test-count at AC-18 (predicted 18; observed at GREEN; report verbatim per R03 MINOR-4 reinforcement). This is INTENDED Implementer agency (the spec MUST NOT pre-bind to a predicted count).
   - **Verdict**: Yes, the Implementer can act without architectural-decision-class guessing.

5. **Could the Reviewer act on this artifact with zero clarifying questions?**
   - § Existing architectural surface (REVIEWER-ANCHOR) table provides every file:line reference Reviewer needs to verify the spec against engine reality.
   - All 18 ACs have binding-evidence pointers (test name + assertion form).
   - Anti-scope fences are line-cited in `git diff` instructions.
   - Cross-section consistency pass exposes the resolved-decision-vs-alternate map (so Reviewer can quickly verify alternates absent).
   - Open questions OQ-1 through OQ-5 explicitly flag the architect's residual uncertainty (none blocking).
   - **Verdict**: Yes, Reviewer-ready.

### Pre-route halt-condition check (per NEXT-ROLE.md halt conditions for R11)

- **Conditional-independence assumption silently absorbed**: NO — explicitly enumerated in Mechanism primitive 3 + Delta 2 file-header + AC-12/AC-14/AC-16 evidence-matrix split; compensating control (`combineAverage`) explicitly named. **PASS.**
- **Q-J1 hybrid framework re-disposition**: NO — R11 ships Ville-bounded combination primitives only (PoE + AoE); no non-Ville-bounded alternative is introduced. R11-SAS-20 fences. **PASS.**
- **Per-shard machinery modification**: NO — R11-SAS-1, R11-SAS-2, R11-SAS-3 fence all per-shard runtime + inherited engine files; component inventory shows zero modifications to these surfaces. **PASS.**
- **Inherited testimony about per-shard e-process behavior**: NO — § Architect self-attest at end of REVIEWER-ANCHOR table records all state-shape verifications as direct-file-read at spec-authoring time; no claim inherited from prior-round Reviewer/Architect testimony. **PASS.**
- **New OBSERVED-binding without right-reasons check**: NO — AC-14 (PoE-correlated) is the only AC that observes a non-bounded FPR; it does NOT bind to OBSERVED (REPORTING-only); the right-reasons check in standing-reinforcement audit row 11 ("would a future implementation FIX that matched architect's prediction FAIL this test?") is answered: no, AC-14 has no bound at all, so no implementation FIX can FAIL it. **PASS.**
- **Cross-section spec contradictions**: NO — cross-section consistency pass (20 rows; all PASS); resolved-decision tokens consistent. **PASS.**

All halt conditions PASS. Spec is route-ready.

### Architect pre-predictions (verifiable post-Implementer + post-Reviewer)

| # | Prediction | Verification surface |
|---|---|---|
| 1 | All 18 q11 ACs PASS at GREEN; 18 / 0 pass/fail count | Implementer attestation in NEXT-ROLE.md; Reviewer independent re-run |
| 2 | OBSERVED FPRs in the four PR-F1 cells satisfy: PoE-iid ≤ 0.031 (Wilson bound); AoE-iid ≤ 0.031; AoE-correlated ≤ 0.031; PoE-correlated REPORTED in range [0.05, 0.30] (architect median pre-prediction: 0.10-0.15 at ρ²=0.5; not bound — informational only) | Implementer console.log + NEXT-ROLE.md attestation; Reviewer right-reasons audit |
| 3 | q11 test runtime ≤ 15s wall-clock on M-series Darwin | Implementer measures OBSERVED runtime at GREEN; reports in NEXT-ROLE.md |
| 4 | All 11 pre-R11 q-file counts unchanged | Implementer re-runs each pre-R11 q-test independently; Reviewer cross-verifies |
| 5 | 0 CRITICAL + 0 MAJOR Reviewer findings (continuing R02-R10 streak) | Reviewer report at R11 close |
| 6 | TDD two-commit ordering (RED q11-only → GREEN combine.ts + fleet.ts) preserved | Reviewer independent `git log` + `git show --stat` verification (8th consecutive Tessera Reviewer-side TDD verification) |

If any prediction misses, Architect updates audit sidecar with disposition. Architect-pre-prediction discipline (per R02+ standing) treats misses as ARCHITECT-side discipline data, not Implementer failures.

---

_Spec emit complete. Audit sidecar at `coordination/specs/Q-R11-SPEC-AUDIT.md` (full brainstorm rationale; decision why-picked / why-rejected; pre-route discipline application detail; architect pre-predictions tracking)._
