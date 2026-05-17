# Q-R13-SPEC — Tessera Phase 1 SLICE 4: e-Benjamini-Hochberg FDR operator surface (PR-F2)

_From: Architect (R13 pipeline run; full tier per A1 + A2 + A5 — see audit sidecar § Brainstorm)._
_To: Implementer._
_Date: 2026-05-17._
_HEAD at spec emit: `2a3c177` (post R12 close; NEXT-ROLE.md prepared for R13)._
_Audit sidecar: `coordination/specs/Q-R13-SPEC-AUDIT.md` (brainstorm rationale per candidate, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions)._

---

## Spec preamble

R13 = Phase 1 SLICE 4: the **e-Benjamini-Hochberg FDR operator surface** that consumes per-shard e-values and produces "K shards flagged; expected number of falsely-flagged shards ≤ q · K" with empirical FDR control under both iid and correlated-drift H₀ regimes.

Per Q-J1 hybrid disposition (`coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`): R11+R12 shipped the formal per-shard any-time Ville guarantee via hierarchical e-value combination at the fleet-merge layer; R13 ships the FDR-style fleet-level operator interface as a PARALLEL view of the same per-shard e-values (NOT a serial chain on top of fleet-merge outputs). See § Mechanism primitive 3 + R12 OQ-1 resolution below.

R13 ships:
1. **e-BH operator-facing primitive** — `eBenjaminiHochberg(perShardEValues, qLevel) → { selected, K }`. Implements the Ren-Barber 2024 e-BH procedure (Algorithm 1; equivalent to Wang-Ramdas 2022 e-BH; theoretically grounded in Vovk-Wang 2021 §4). Family-agnostic stateless function — takes a `ReadonlyArray<number>` of N per-shard linear-space e-values, returns the indices of the K selected shards with FDR ≤ q under arbitrary dependence.
2. **PR-F2 evidence matrix** — N=100 shards × T=100 ticks × N_trials=200; two H₀ scenarios (iid; correlated-drift with shared zero-mean factor ρ²=0.5 — same correlated mechanism as R11 PR-F1). Both cells assert theory-derived Wilson-CI upper bound on empirical FDR (= P(K > 0) under all-H₀); both expected to PASS by Wang-Ramdas 2022 Theorem 4.1 (e-BH preserves FDR ≤ q under arbitrary dependence between e-values).

R13 does NOT ship (explicit anti-scope; see § Anti-scope for full enumeration; full enumeration cross-checked against NEXT-ROLE.md "R13 does NOT ship" list):
- **Any-time FDR analog** (Wang-Ramdas-Vovk 2022 e-process selection under any-time FDR; arXiv:2009.02824 streaming variant). MD-F2: SLICE 4 ships the FIXED-TIME e-BH procedure; the any-time analog is a future-SLICE candidate. Explicitly documented in `engine/fleet/e-bh.ts` module header and R13-SAS-13.
- **Real-cluster trace integration** (Phase 1 boundary; synthetic substrate only).
- **Modification to R11 combine primitives** (`engine/fleet/combine.ts`; R13-SAS-1).
- **Modification to R12 fleet-merged detector surfaces** (`engine/fleet/detectors.ts`; R13-SAS-2).
- **Modification to per-shard runtime** (`engine/per-shard/*`; R13-SAS-4).
- **Modification to inherited engine internals** (A12 anti-scope; R13-SAS-5).
- **SLICE 2 carry-forwards** (`mean_delta` computation, PR-F5 storage profile, compiled-artifact JSON loader) — R14 bundle.
- **Phase 2 work** (cross-shard correlation, hardware topology, deployment-event freeze hook; R13-SAS-12).
- **Chaining fleet-merge OUTPUT into e-BH input** (per Q-J1's hybrid framing the two layers are PARALLEL; R13-SAS-14). Brainstorm explicitly evaluated and rejected a conditional-gating serial chain; see § Mechanism primitive 3 + audit sidecar § Brainstorm candidate (Z).
- **Randomized e-BH variant** (Wang-Ramdas 2022 §4 randomized procedure; R13-SAS-15). Brainstorm evaluated and rejected; see audit sidecar.
- **BY-style stepwise correction** for e-values (R13-SAS-16). Brainstorm evaluated and rejected as over-conservative for valid e-values; see audit sidecar.
- **Family-specific wrappers at R13** (`eBenjaminiHochbergFamilyA` / `eBenjaminiHochbergFamilyC`; R13-SAS-17). Operator-layer caller assembles per-shard e-values from inherited `BettingEProcessState.M` (Family A) or `Math.exp(FamilyCBettingEProcessState.log_S_t)` (Family C) before invoking the family-agnostic primitive.
- **Default qLevel parameter** (R13-SAS-18). qLevel is a required positional parameter; documented rationale in spec § Mechanism primitive 5 and `engine/fleet/e-bh.ts` module header.

Traces to PRD AC-P1: "per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4." R11 closed the PR-F1 (Ville-preservation) half at SLICE 3; R12 extended with fleet-merged detector surfaces; R13 closes the PR-F2 (e-BH FDR) half at SLICE 4, completing AC-P1.

Traces to SCOPING-MEMO-v0.3 § 2.1 Extension 1 recommended approach: "**(b) hierarchical e-value combination + (c) FDR-style operator surface**." R11 + R12 are (b); R13 is (c). MD-F2 (any-time-vs-fixed-time tradeoff) is explicitly enumerated in § Mechanism primitive 4.

Architectural layer (extends R02→R03→R04→R05→R10→R11→R12 progression): compile-time schema (R02) → state-machine runtime (R03) → algorithm pure-function (R04) → composition + accumulator (R05) → emission + sparse-encoding (R10) → hierarchical e-value combination (R11) → fleet-merged detector surfaces (R12) → **e-BH FDR operator surface (R13; this round)** → SLICE 2 cleanup + Phase 2 (post-R13).

---

## Existing architectural surface (REVIEWER-ANCHOR — mandatory per anchor `templates/Q-NN-SPEC-TEMPLATE.md` v2)

_Per anchor PR #35 mandatory section; applied at SPEC fidelity. Every citation against `tessera/` HEAD `2a3c177` unless otherwise noted (which inherited DeploySignal main @ SHA `5a72371` via the vendoring policy in SCOPING-MEMO-v0.3 § 9). Every line range below was extracted via `sed -n 'N,Mp' <path>` at spec-emit time and verified verbatim against this table per the R11 OBS-1/-2 citation-accuracy reinforcement; 2nd post-reinforcement application._

| Source path | Pinned anchor | Lines opened | Verbatim snippet | Verification |
|---|---|---|---|---|
| `engine/types/families/a.ts` (vendored) | `5a72371` | `20-28` | `export interface BettingEProcessState {`<br/>&nbsp;&nbsp;`M: number;`<br/>&nbsp;&nbsp;`bet: number;`<br/>&nbsp;&nbsp;`n: number;`<br/>&nbsp;&nbsp;`alphaConsumed: number;`<br/>&nbsp;&nbsp;`runningMean: number;`<br/>&nbsp;&nbsp;`runningSecondMoment: number;`<br/>&nbsp;&nbsp;`onsFallbackCount: number;`<br/>`}` | `M` field at line 21 (FIRST field after interface declaration at line 20). R13 PR-F2 simulator extracts `state.M` as the per-shard linear-space e-value after T=100 ticks. Inherited unchanged at R13 (R13-SAS-6). |
| `engine/types/families/c.ts` (vendored) | `5a72371` | `297-300` | `export interface FamilyCBettingEProcessState {`<br/>&nbsp;&nbsp;`/** Wealth process S_t (multiplicative). Stored in log-space as`<br/>&nbsp;&nbsp;&nbsp;`*  log_S_t for numerical stability; S_t materialized on read. */`<br/>&nbsp;&nbsp;`log_S_t: number;` | `log_S_t` field at line 300 (immediately after the 2-line JSDoc at 298-299). R13 e-BH does NOT directly consume Family C state at the test layer (PR-F2 uses Family A only per § Mechanism primitive 9); the family-agnostic API accepts Family-C-derived e-values via `Math.exp(state.log_S_t)` should an operator-layer caller need it. Inherited unchanged at R13. |
| `engine/detectors/betting-e-process.ts` (vendored) | `5a72371` | `65-66` (WEALTH_FLOOR) + `150-156` (updateBettingState signature) | Line 65: `const WEALTH_FLOOR = 1e-12;`<br/>Lines 150-156: `export function updateBettingState(`<br/>&nbsp;&nbsp;`state: BettingEProcessState,`<br/>&nbsp;&nbsp;`x: number,`<br/>&nbsp;&nbsp;`baselineMean: number,`<br/>&nbsp;&nbsp;`sigmaSquared: number,`<br/>&nbsp;&nbsp;`perTickAlpha: number,`<br/>`): number {` | Returns updated `state.M` (linear-space wealth, ≥ WEALTH_FLOOR). R13 PR-F2 simulator drives this per shard, then reads `state.M` directly into the per-shard e-value array passed to `eBenjaminiHochberg`. Inherited unchanged at R13 (R13-SAS-5). |
| `engine/detectors/betting-e-process.ts` (vendored) | `5a72371` | `72-82` (freshBettingState) | `export function freshBettingState(): BettingEProcessState { ... }` | Initial state has `M = 1` (fresh wealth = e_0 = 1; the no-bet baseline). PR-F2 simulator constructs one per shard. Inherited unchanged at R13. |
| `engine/fleet/combine.ts` (Tessera-original; R11) | tessera-R11 HEAD | `63-70` (combineProduct) + `87-99` (combineAverage) + `102-110` (freshFleetEProcessState) + `122-138` (updateFleetEProcessState) | `export function combineProduct(log_e_values: ReadonlyArray<number>): FleetMergeOutput { ... }`<br/>`export function combineAverage(log_e_values: ReadonlyArray<number>): FleetMergeOutput { ... }`<br/>`export function freshFleetEProcessState(): FleetEProcessState { ... }`<br/>`export function updateFleetEProcessState(state, log_fleet_e_t, log_threshold): FleetEProcessState { ... }` | R11 fleet-merge primitives. R13 does NOT consume any R11 export in the e-BH critical path (per Q-J1 parallel-not-serial; § Mechanism primitive 3). UNCHANGED at R13 (R13-SAS-1). Empirically re-verified at spec-emit: `node --test test/q11-hierarchical-e-value-combination.test.js` reports `tests 18 / pass 18 / fail 0` at HEAD `2a3c177` (R08 inherited-testimony-verification reinforcement; 6th application). |
| `engine/fleet/detectors.ts` (Tessera-original; R12) | tessera-R12 HEAD | `63` (CombinePrimitive type) + `69-72` (FleetMergeStepResult) + `107-118` (fleetMergeFamilyA) + `136-147` (fleetMergeFamilyC) | `export type CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput;`<br/>`export interface FleetMergeStepResult { log_fleet_e: number; fleet_state: FleetEProcessState; }`<br/>`export function fleetMergeFamilyA(...): FleetMergeStepResult { ... }`<br/>`export function fleetMergeFamilyC(...): FleetMergeStepResult { ... }` | R12 fleet-merged detector surfaces. R13 does NOT consume any R12 export. UNCHANGED at R13 (R13-SAS-2). Empirically re-verified at spec-emit: `node --test test/q12-fleet-merged-detector-surfaces.test.js` reports `tests 16 / pass 16 / fail 0` at HEAD `2a3c177` (R08 reinforcement; 6th application). |
| `engine/types/fleet.ts` (Tessera-original; R11) | tessera-R11 HEAD | `30-44` (FleetEProcessState interface) | `export interface FleetEProcessState { log_fleet_e_t: number; log_fleet_e_max: number; n: number; fired: boolean; tick_at_first_fire: number \| null; }` | R11 fleet-level e-process state type. R13 does NOT consume `FleetEProcessState` in the e-BH critical path. UNCHANGED at R13 (R13-SAS-3). |
| `engine/per-shard/runtime.ts` (Tessera-original) | tessera-R10 HEAD (preserved at R11+R12) | `1-13` (file header) | `// engine/per-shard/runtime.ts — Tessera SLICE 2b3: per-shard runtime composition.` | UNCHANGED at R13 (R13-SAS-4). R10 MINOR-1 module-docblock carry-forward preserved (operator gate item). |
| `engine/types/config.ts` (vendored-with-deltas) | tessera-R10 HEAD | `851-907` (Tessera SLICE 1 schema extensions) | (CellConfidence, PerShardResidual; unchanged at R13) | UNCHANGED at R13 (R13-SAS-7). Tessera schema extensions are SLICE 1 / SLICE 2 scope; R13 adds no new CompiledConfig fields. |
| `engine/types/index.ts` (vendored) | `5a72371` | `20-32` (re-exports) | `export * from './primitives'; export * from './families/a'; ...` | UNCHANGED at R13 (R13-SAS-8). R13 does NOT re-export `eBenjaminiHochberg` through the family-types barrel; consumers import directly from the leaf path `../engine/fleet/e-bh` (matching the R11 + R12 no-re-export convention). |
| `test/q11-hierarchical-e-value-combination.test.ts` (Tessera-original; R11) | tessera-R11 HEAD | `35-50` (mulberry32 + gaussian PRNG helpers) + `54-65` (PR-F1 evidence-matrix params) | `function mulberry32(seed: number): () => number { ... }`<br/>`function gaussian(rng: () => number): number { ... }`<br/>`const ALPHA_FLEET = 0.01; const N_SHARDS = 100; const T_TICKS = 100; const N_FLEET_TRAJ = 200; const RHO_SQUARED = 0.5;` | R13 q13 test re-inlines the same `mulberry32` + `gaussian` helpers (NOT imported from q11) per R11/R12 standalone-test convention. R13 PR-F2 reuses the same N=100, T=100, ρ²=0.5 parameter shape; substitutes Q_LEVEL=0.05 for ALPHA_FLEET=0.01 and N_TRIALS=200 for N_FLEET_TRAJ=200. UNCHANGED at R13 (R13-SAS-10). |
| `test/q12-fleet-merged-detector-surfaces.test.ts` (Tessera-original; R12) | tessera-R12 HEAD | `91-107` (AC-1 worked example pattern) + `283-300` (R12 empirical-wiring ACs) | (R12 test patterns) | R13 q13 test follows the same per-AC `test('R13 AC-N — ...', () => { ... })` skeleton + `console.log` for empirical reporting + `assert.ok(fdr ≤ FDR_BOUND, ...)` for theory-derived bound assertion. UNCHANGED at R13 (R13-SAS-10). |
| `coordination/SCOPING-MEMO-v0.3.md` | tessera HEAD | `99-101` (Ext1 recommended approach) + `120-128` (PR-F2 mandate) + `336` (R-S2 referencing) | `Recommended approach: (b) hierarchical e-value combination as the primary guarantee + (c) FDR-style as the operator-facing fleet-level surface.`<br/>`PR-F2: e-BH FDR operator surface pair-review mandatory at SLICE 4 close.` | R13 implements (c); PR-F2 pair-review trigger fires at this round. |
| `coordination/PRD.md` | tessera HEAD | `42-43` (AC-P1) + `30-31` (FR-E1) | `AC-P1: ... per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4.` | R13 closes the e-BH (FDR-control) half of AC-P1. |

**External-source literature anchor (PR-F2 mandate per NEXT-ROLE.md item 1):**

| Source | Result applied | R13 application |
|---|---|---|
| **Ren & Barber 2024** — "Derandomized novelty detection with FDR control via e-values" (arXiv:2402.13428) | Algorithm 1 (e-BH for novelty detection) — sort per-test e-values descending, find R = max{k : k · e_(k) ≥ N/q}, reject the R hypotheses corresponding to the R largest e-values. The paper applies the procedure to derandomized novelty detection, but Algorithm 1 itself is the canonical e-BH from Wang-Ramdas 2022 / Vovk-Wang 2021. The FDR-control guarantee under arbitrary dependence between e-values is the procedure's defining property. | R13 `eBenjaminiHochberg` implements this Algorithm 1 verbatim. The R = max{k : k · e_(k) ≥ N/q} step-down form is the canonical Wang-Ramdas presentation; equivalently `e_(k) ≥ N/(k·q)`. Architect attests: paper read at abstract level + Algorithm 1 section level for the procedure definition; specific theorem numbers within § 2-3 NOT independently re-verified at spec-emit time (paper not opened during offline spec authoring). The procedure is well-established post-2022; Reviewer is invited to verify the precise theorem/equation numbers via the published paper or arXiv preprint. The architectural commitment does NOT depend on specific equation numbers. |
| **Wang & Ramdas 2022** — "False discovery rate control with e-values" (Journal of the Royal Statistical Society Series B; arXiv:2009.02824) | Theorem 4.1 (e-BH FDR control under arbitrary dependence): if each e_i is a valid e-value under H_{0,i} (i.e., E[e_i \| H_{0,i}] ≤ 1), then e-BH applied to (e_1, …, e_N) at level q satisfies FDR ≤ q · N_0/N ≤ q. The bound holds under ARBITRARY DEPENDENCE between e-values — no independence assumption required between e-values. | R13's load-bearing theorem. Both PR-F2 cells (iid H₀ AND correlated-drift H₀) expected to PASS the FDR ≤ q claim because each per-shard wealth-process e-value `state.M` is marginally a valid e-value (E[M_T] ≤ 1 by Ville inequality applied to the per-shard non-negative martingale), regardless of cross-shard correlation. This is the architectural distinction from R11 PoE-combineProduct (which required cond.-indep. between shards). Architect attests: paper read at abstract level + § 4 (theorem statement) level; precise inequality form (FDR ≤ q · N_0/N) cited per canonical post-2022 e-value literature usage; Reviewer invited to verify specific theorem number via arXiv preprint. |
| **Vovk & Wang 2021** — "E-values: calibration, combination, and applications" (Annals of Statistics; arXiv:2103.13802) | Foundational e-value framework. § 4 establishes combination results; the FDR-control extension is the foundation Wang-Ramdas 2022 builds on. | R13 cites for foundational e-value validity property (E[e_i] ≤ 1 ⇔ valid e-value) and as the source of the convex-combination / product-combination results R11 + R12 used. No new R13-specific result from this paper; cited for foundational completeness. |
| **Howard, Ramdas, McAuliffe & Sekhon 2021** — "Time-uniform, nonparametric, nonasymptotic confidence sequences" (Annals of Statistics 49(2); arXiv:1810.08240) | Per-shard mixture-supermartingale anytime-valid Ville bound (R11 PR-F1 anchor). | R13 PR-F2 simulator uses the inherited Family A betting-e-process whose per-shard wealth `M_T` is a non-negative martingale per Howard-Ramdas-McAuliffe-Sekhon 2021 (E[M_T] ≤ 1 under H_0 marginally). This is the load-bearing per-shard e-value-validity claim that satisfies Wang-Ramdas 2022 Theorem 4.1's hypothesis. |

**Architect self-attest:**

- [x] Every file in the REVIEWER-ANCHOR table was opened at spec authoring time (NOT recalled from memory); each cited line range was extracted via `sed -n 'N,Mp' <path>` and verified verbatim against the table entry. Citation-accuracy reinforcement (R11 OBS-1/-2; 2nd post-reinforcement application).
- [x] `BettingEProcessState.M` field shape verified at `engine/types/families/a.ts:21` (the FIRST field of the interface declared at line 20; `M: number;`). Type-declaration-site discipline (R02-derived; 8th consecutive application).
- [x] `FamilyCBettingEProcessState.log_S_t` field shape verified at `engine/types/families/c.ts:300` (immediately after the 2-line JSDoc at 298-299; `log_S_t: number;`).
- [x] `updateBettingState` signature verified at `engine/detectors/betting-e-process.ts:150-156`: takes `state, x, baselineMean, sigmaSquared, perTickAlpha`; returns the post-update `state.M` (number). Side-effects state in-place.
- [x] `WEALTH_FLOOR = 1e-12` constant verified at `engine/detectors/betting-e-process.ts:65`. R13 PR-F2 simulator does NOT need to floor `state.M` directly — `updateBettingState` already applies the floor via line 167 (`state.M = Math.max(WEALTH_FLOOR, state.M * Math.max(0, factor))`). The post-update `state.M` is always ≥ WEALTH_FLOOR.
- [x] R11 `combineProduct`/`combineAverage`/`updateFleetEProcessState`/`freshFleetEProcessState` exports verified by `grep -n "^export " engine/fleet/combine.ts` (6 export lines at :40, :46, :63, :87, :102, :122).
- [x] R12 `fleetMergeFamilyA`/`fleetMergeFamilyC`/`FleetMergeStepResult`/`CombinePrimitive` exports verified by `grep -n "^export " engine/fleet/detectors.ts` (4 export lines at :63, :69, :107, :136).
- [x] R08 inherited-testimony-verification reinforcement applied (6th consecutive application): `npm run typecheck` exits 0; `node --test test/q11-*.test.js` reports 18/18 pass; `node --test test/q12-*.test.js` reports 16/16 pass at HEAD `2a3c177`. R11/R12 surfaces empirically valid.
- [x] Wang-Ramdas 2022 Theorem 4.1 application + Ren-Barber 2024 Algorithm 1 form are canonical e-BH literature results. **Limitation flagged**: spec authoring was offline; specific theorem / equation numbers within the published papers NOT independently re-verified at spec-emit time. The architectural commitment (e-BH preserves FDR ≤ q under arbitrary dependence between e-values, where each e_i is marginally a valid e-value) does NOT depend on specific equation numbers; Reviewer or post-merge curation is invited to refine citation pinpoints.

---

## Mechanism

### Architectural primitives (resolved decisions)

1. **e-BH is a stateless function over per-shard linear-space e-values.** Per-shard e-process state (wealth process) lives inside each shard's inherited engine state object (`BettingEProcessState.M` for Family A; `Math.exp(FamilyCBettingEProcessState.log_S_t)` for Family C). At decision time T, the operator-layer caller extracts the current scalar e-value from each shard (linear-space; `state.M` is already linear), passes a `ReadonlyArray<number>` of N per-shard e-values to `eBenjaminiHochberg`, and gets back an `EBenjaminiHochbergOutput { selected, K }`. The primitive does NOT inspect the family that produced the e-value — this is the load-bearing family-agnostic claim, mirroring R11's family-agnostic claim at the fleet-merge layer.

2. **One operator-facing primitive ships at R13: `eBenjaminiHochberg`.** Implements the Ren-Barber 2024 Algorithm 1 / Wang-Ramdas 2022 e-BH procedure (linear-space input):
   - Sort indices by e-value descending; tie-break by index ascending for determinism.
   - Let e_(1) ≥ e_(2) ≥ … ≥ e_(N) be the sorted e-values.
   - Find R = max{k ∈ {1, …, N} : k · e_(k) ≥ N / q}; if no such k exists, R = 0.
   - Return the R indices corresponding to the R largest e-values (sorted ascending in the result for caller ergonomics) and K = R.
   - **FDR control under arbitrary dependence (Wang-Ramdas 2022 Theorem 4.1):** if each e_i is a valid e-value under H_{0,i} (E[e_i \| H_{0,i}] ≤ 1), then FDR = E[#false / max(K, 1)] ≤ q · N_0/N ≤ q. The bound holds under ARBITRARY DEPENDENCE between e-values — no independence assumption between e-values is required. This is the load-bearing property distinguishing e-BH from p-value-based BH.

3. **R12 OQ-1 resolved: e-BH consumes PER-SHARD e-values (option β), NOT fleet-level e-values (option α).** The two candidate architectures:
   - **(α) Fleet-level e-BH:** e-BH operates over the small fixed set of fleet-level e-values produced by R11/R12 (one per detector family × combination primitive). Discovery cardinality = small fixed set of fleet-level claims. **Rejected:** the operator-facing target per SCOPING-MEMO-v0.3 § 2.1 + Q-J1 is "K shards flagged" — discovery cardinality is variable in N, indexed over per-shard claims. Option (α) does NOT produce a "K shards flagged" surface.
   - **(β) Per-shard e-BH (selected):** e-BH operates over the N per-shard e-values. Discovery cardinality = K shards (variable in N, FDR-controlled). Matches the operator-facing target.
   - **Architectural relationship: Q-J1 PARALLEL layers (NOT serial chain).** R11+R12 fleet-merge primitives provide the FORMAL any-time Ville guarantee (P(sup_t log_fleet_e_t ≥ log(1/α_fleet)) ≤ α_fleet at the fleet level). R13 e-BH provides the OPERATOR-FACING FDR surface (E[#false-flagged-shards / max(K, 1)] ≤ q). Both consume the same per-shard e-values; neither chains into the other's input. R13-SAS-14 explicitly fences chaining as an anti-scope clause; brainstorm evaluated and rejected a conditional-gating chain (audit sidecar § Brainstorm candidate (Z)).

4. **MD-F2 (load-bearing per SCOPING-MEMO-v0.3 § 2.1 + Q-J1): fixed-time vs any-time FDR.** SLICE 4 ships the FIXED-TIME e-BH procedure (single decision point at observation time T). The any-time analog (Wang-Ramdas-Vovk 2022 e-process selection under any-time FDR; arXiv:2009.02824 streaming variant) is a future-SLICE candidate. Documented explicitly in:
   - `engine/fleet/e-bh.ts` module header (verbatim spec text in Delta 1).
   - This Mechanism section.
   - R13-SAS-13 anti-scope clause.

   Rationale (resolved decision; brainstorm in audit sidecar): the operator-facing fixed-time surface is the immediate Phase 1 close requirement per AC-P1. The any-time analog requires e-process construction (not just e-value at one time), additional theoretical machinery, and a different operator-facing claim ("flagged at time T" vs "flagged at SOME time ≤ T"). Shipping fixed-time first preserves a clean architectural separation; any-time can be added as a parallel surface at a future SLICE without affecting the R13 fixed-time API.

5. **Default qLevel: NONE. qLevel is a required positional parameter.** Rationale (resolved decision):
   - The operator-facing claim "E[#false-flagged-shards] ≤ q · K" directly couples the operator's policy choice (acceptable false-discovery fraction) to the procedure's output.
   - A silent default risks misalignment between the operator's intended q and the value the procedure used.
   - Canonical literature values are q = 0.05 (classical FDR target per BH 1995) and q = 0.10 (less conservative; common in computational pipelines). Both are valid; neither is a Tessera default.
   - R13-SAS-18 explicitly fences a default at the API surface.
   - Documented in `engine/fleet/e-bh.ts` module header verbatim.
   - Rejection of alternatives (audit sidecar § Brainstorm decision D2): (α) `q=0.05` default — rejected as operator-policy decision masquerading as API ergonomic; (β) `q=0.10` default — rejected for same reason as (α) plus arbitrary choice between 0.05/0.10.

6. **Output shape: wrapped object `{ selected, K }`.** Mirrors R11's `FleetMergeOutput { log_fleet_e }` and R12's `FleetMergeStepResult { log_fleet_e, fleet_state }` wrapping convention. Future SLICEs may add fields (e.g., `threshold_e`) without breaking callers. R13 ships the minimal shape:
   - `selected: ReadonlyArray<number>` — 0-based indices of selected shards (length K). Sorted ascending.
   - `K: number` — number of selected shards. Equals `selected.length`.
   - **Index ordering: sorted ASCENDING in `selected`** (NOT in DESC-sorted-by-e-value order). Caller-ergonomic: operators consume shard indices typically in their original numeric order (e.g., for log lookups, dashboard rendering). Decision documented; AC-7 binds explicitly.

7. **Tie-breaking: deterministic, by index ASCENDING.** Standard e-BH (Wang-Ramdas 2022; Ren-Barber 2024 Algorithm 1) does NOT formally specify tie-breaking when e_(k) = e_(k+1). Any deterministic rule preserves FDR-control (the theorem applies under the chosen ordering). R13 sort comparator: `(a, b) => b.e !== a.e ? b.e - a.e : a.idx - b.idx` — primary key e DESC, secondary key idx ASC. Decision documented; AC-8 binds explicitly with both an all-tied fixture and a partial-tie fixture.

8. **Input validation.** `eBenjaminiHochberg` validates two preconditions and throws on violation:
   - `perShardEValues.length === 0` — throws (N=0 shards is structurally undefined; mirrors R11 `combineProduct`/`combineAverage` empty-input convention at `engine/fleet/combine.ts:64-66, 88-90`).
   - `!(qLevel > 0 && qLevel <= 1)` — throws on `qLevel ≤ 0`, `qLevel > 1`, `qLevel === NaN`, or `qLevel === undefined`. The single conjunctive guard `qLevel > 0 && qLevel <= 1` handles NaN and undefined uniformly (any comparison against NaN returns false; any comparison against undefined returns false). Error message includes the offending value for diagnostics.
   - Caller responsibility: per-shard e-values are non-negative and finite. R13 does NOT validate this at runtime (the operator-layer caller has already constructed them from valid wealth processes which guarantee non-negativity via WEALTH_FLOOR). A negative e-value entering the procedure would still produce a deterministic (incorrect) output rather than corrupt state, so the cost of additional runtime validation outweighs the benefit at the leaf-primitive layer.

9. **PR-F2 simulator uses Family A only.** The empirical-FDR evidence matrix at q13 uses the inherited Family A betting-e-process (`freshBettingState` + `updateBettingState`) to generate per-shard e-values. Family C demonstration is OUT OF SCOPE at R13 because: (a) the family-agnostic claim at the eBenjaminiHochberg API surface is structurally established (the input is `ReadonlyArray<number>`; any family producing a non-negative number is accepted); (b) running Family C requires a compiled config + baseline pool + Q72 RFF infrastructure that increases test runtime cost without strengthening the FDR-control claim. The family-agnostic structural claim is sufficient for R13; future SLICEs can add Family-C empirical evidence if the operator-facing pipeline needs it.

10. **PR-F2 evidence matrix parameters (resolved decisions):**
    - `Q_LEVEL = 0.05` for the empirical FDR-control test. Documented exemplar; q13 fixture uses this single value. Production operator-facing API requires q at call site (no default; § Mechanism primitive 5).
    - `N_SHARDS = 100` (per NEXT-ROLE.md PR-F2 mandate).
    - `T_TICKS = 100` per per-shard wealth-process trajectory.
    - `N_TRIALS = 200` PR-F2 trials per (scenario) cell. (Reuses R11 PR-F1 simulator size for consistency.)
    - Wilson upper bound on empirical FDR: `FDR_BOUND = Q_LEVEL + 3·√(Q_LEVEL·(1−Q_LEVEL)/N_TRIALS) = 0.05 + 3·√(0.05·0.95/200) ≈ 0.05 + 0.04624 ≈ 0.09624`. Both cells assert `observed_fdr ≤ FDR_BOUND`. The 3σ Wilson upper bound preserves R07 OBSERVED-binding-scope reinforcement (theory-derived, not OBSERVED-binding).
    - Correlated-drift mechanism: identical to R11 PR-F1 correlated-drift mechanism — at each tick t, generate a shared zero-mean factor `z_t ~ N(0, ρ²)` with `ρ² = 0.5`; each shard's per-tick sample is `shared_z_t + per_shard_noise_i,t` where `per_shard_noise_i,t ~ N(0, 1 − ρ²) = N(0, 0.5)`. Marginal `~ N(0, 1)` per shard per tick; cross-shard correlation at same tick = `ρ² = 0.5`. **Important note on terminology:** "correlated-drift H₀" denotes an H₀ scenario where each shard's marginal distribution is still under the null (mean 0, variance 1), but with cross-shard correlation introduced by a shared zero-mean factor. There is NO mean shift (a mean shift would be H₁ territory). This matches the R11 correlated-drift H₀ semantic; the name is retained for cross-reference clarity.
    - Per-shard Family A baseline: `μ=0, σ²=1`. Per-tick `perTickAlpha=0` (matches R11 q11 + R12 q12 + inherited `test/betting-e-process-class-dispatch.test.ts:185` convention).
    - Total work budget: 200 trials × 100 shards × 100 ticks × 2 scenarios = 4M wealth updates ≈ 4s wall-clock at ~1 μs/update on M-series Darwin. Within q13 test runtime budget.

11. **Empirical FDR definition under all-H₀.** Under all-H₀ (every shard is under the null), every discovery is a false discovery: V = K (number of false rejections = number of total rejections). Therefore: `FDR = E[V/max(R, 1)] = E[K/max(K, 1)] = E[1_{K > 0}] = P(K > 0)`. So the PR-F2 simulator measures `P(K > 0)` directly across trials — same as fleet-level FWER in this restricted all-H₀ setting. By Wang-Ramdas 2022 Theorem 4.1, `P(K > 0) ≤ q` under both iid AND correlated-drift H₀ regimes (since the theorem requires only marginal e-value validity per shard, which the betting-e-process construction guarantees).

12. **Module location: new `engine/fleet/e-bh.ts` parallel to `engine/fleet/combine.ts` (R11) and `engine/fleet/detectors.ts` (R12).** Single new file. Type declaration `EBenjaminiHochbergOutput` co-located inside `e-bh.ts` (mirrors R12's `FleetMergeStepResult` co-location within `detectors.ts`; differs from R11's separate `engine/types/fleet.ts` because at R13 there's only ONE new exported type and no need for a separate type-only module). Rationale: future SLICEs may add Family-specific wrappers (`eBenjaminiHochbergFamilyA`, `eBenjaminiHochbergFamilyC`) parallel to R12's `fleetMergeFamilyA/C`; those would land in `e-bh.ts` (or a future `engine/fleet/e-bh-detectors.ts` if the file grows). R13 ships the primitive only.

13. **No re-export at R13.** `engine/types/index.ts` is NOT modified at R13; consumers of `eBenjaminiHochberg` import directly from the leaf path `../engine/fleet/e-bh`. Rationale matches R11 (no orchestrator-facing consumer at R11; only q11 test) and R12 (no orchestrator-facing consumer at R12; only q12 test). At R13, only q13 test consumes the new primitive. Anti-scope R13-SAS-8 enforces this.

14. **No modification to R11 / R12 / inherited engine / per-shard runtime.** R13 is a NEW LAYER added on top of:
    - The R11 fleet-merge primitives (`engine/fleet/combine.ts`) — PARALLEL view, NOT consumed (per § Mechanism primitive 3).
    - The R12 fleet-merged detector surfaces (`engine/fleet/detectors.ts`) — PARALLEL view, NOT consumed.
    - The inherited per-shard wealth processes (Family A: `updateBettingState`; Family C: canonical SR23 ONS) — CONSUMED unchanged (PR-F2 simulator drives `updateBettingState`).
    - The Tessera per-shard runtime (`updatePerShardResidual`) — NOT consumed at R13.
    All anti-scope fences per R13-SAS-1 through R13-SAS-8.

### Cross-section consistency pass

_(R01-derived reinforcement — 9th consecutive application; standing discipline.)_

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | One operator-facing primitive ships: `eBenjaminiHochberg` | § Mechanism primitive 2; § Per-file pseudocode Delta 1; AC-1, AC-2, AC-3 | Two primitives (e.g., `eBHStandard` + `eBHRandomized`); a class with multiple methods; a tagged-union primitive | Pseudocode declares exactly ONE exported function; no `eBenjaminiHochbergRandomized`; no `EBHProcedure` class; R13-SAS-15 fences randomized; R13-SAS-16 fences BY-style |
| 2 | Stateless function: primitive takes `ReadonlyArray<number>` of linear-space per-shard e-values + qLevel, returns `EBenjaminiHochbergOutput` | § Mechanism primitive 1 + 6; § Per-file pseudocode Delta 1; AC-1 | Stateful primitive with running accumulator across calls; mutates a `EBHState` argument; per-call return value is bare `number[]` (no shape) | Pseudocode signature uses `(perShardEValues: ReadonlyArray<number>, qLevel: number): EBenjaminiHochbergOutput`; no state argument; AC-1 binds the `{ selected, K }` shape; AC-9 binds non-mutation of input |
| 3 | Linear-space input (NOT log-space) | § Mechanism primitive 1 + 2; § Per-file pseudocode Delta 1; AC-4, AC-5, AC-6 | Log-space input (would parallel R11/R12 convention but require `Math.log` inversion in caller) | Pseudocode uses `e_i` directly (NOT `Math.log(e_i)`); AC-5/AC-6 worked examples use linear-space fixtures `[50, 30, 10, 2, 0.5]` and `[300, 150, 80, 40, 20, 10, 5, 2.5, 1.25, 0.6]`; PR-F2 simulator extracts `state.M` directly (linear) per `engine/detectors/betting-e-process.ts:150-167` |
| 4 | Step-down R = max{k : k·e_(k) ≥ N/q} | § Mechanism primitive 2; § Per-file pseudocode Delta 1; AC-5, AC-6 | Step-up form (start k=1, increment); threshold-based form `e_(k) ≥ N/(k·q)` (mathematically equivalent but invites floating-point divergence) | Pseudocode `for (let k = N; k >= 1; k--) { if (k * indexed[k-1].e >= N_over_q) { R = k; break; } }`; multiplicative form k·e_(k) avoids division-by-zero edge case at k=0 |
| 5 | Tie-breaking deterministic by index ASC | § Mechanism primitive 7; § Per-file pseudocode Delta 1; AC-8 | Tie-breaking by index DESC; random tie-break; non-deterministic | Pseudocode `(a, b) => b.e !== a.e ? b.e - a.e : a.idx - b.idx`; AC-8 binds the all-tied fixture `[100,100,100,100,100]` → `[0,1,2,3,4]` AND the partial-tie fixture `[200,1,1,200,200]` → `[0,3,4]` |
| 6 | Output sorted ASCENDING by index | § Mechanism primitive 6; § Per-file pseudocode Delta 1; AC-7 | Output in DESC-by-e-value order; output in original input order (unsorted) | Pseudocode `selected.sort((a, b) => a - b)`; AC-7 binds explicit ASC ordering via positional fixture `e[3]=300, e[0]=150, e[7]=80` → selected `[0, 3, 7]` |
| 7 | Empty input throws (length===0) | § Mechanism primitive 8; § Per-file pseudocode Delta 1; AC-2 | Return `{ selected: [], K: 0 }`; return `null`; silent no-op | Pseudocode `if (N === 0) throw new Error(...)`; AC-2 uses `assert.throws` with regex `/empty input/` |
| 8 | Invalid qLevel throws | § Mechanism primitive 8; § Per-file pseudocode Delta 1; AC-3 | Clamp qLevel into (0,1]; silently use default; warn but proceed | Pseudocode `if (!(qLevel > 0 && qLevel <= 1)) throw new Error(...)`; AC-3 asserts throws on qLevel=0, -0.1, 1.5, 2 |
| 9 | qLevel REQUIRED positional parameter (no default) | § Mechanism primitive 5; § Per-file pseudocode Delta 1 module header; AC-12 | Default qLevel=0.05; default qLevel=0.10; optional with sensible default | Pseudocode function signature has `qLevel: number` (no `= 0.05` default); module header documents "Default qLevel: NONE."; AC-12 asserts `assert.throws(() => eBenjaminiHochberg([1,2,3], undefined as unknown as number), /qLevel/)`; R13-SAS-18 fences |
| 10 | Per-shard input invariance (no mutation of perShardEValues) | § Mechanism primitive 8; § Per-file pseudocode Delta 1; AC-9 | In-place sort of input; in-place sentinel marking; partial mutation | Pseudocode builds `indexed: Array<{ e, idx }>` (new array) from `perShardEValues`; sort operates on indexed copy; input array untouched; AC-9 `assert.deepStrictEqual(e, e_before)` after call |
| 11 | New module = `engine/fleet/e-bh.ts` (parallel to combine.ts and detectors.ts); EBenjaminiHochbergOutput co-located in e-bh.ts | § Mechanism primitive 12; § Component inventory | Put type in `engine/types/fleet.ts` (would parallel R11's separate type module); co-locate with R11 in `engine/fleet/combine.ts` | Component inventory lists exactly one new production file path; no consumer in spec imports `EBenjaminiHochbergOutput` from `engine/types/fleet`; R13-SAS-3 fences engine/types/fleet.ts |
| 12 | No re-export through engine/types/index.ts at R13 | § Mechanism primitive 13; § Anti-scope R13-SAS-8 | Add `export * from './fleet/e-bh'` to engine/types/index.ts | Component inventory shows engine/types/index.ts UNCHANGED; R13-SAS-8 fences |
| 13 | PR-F2 evidence matrix uses Family A only (per § Mechanism primitive 9) | § Mechanism primitive 9 + 10; § Per-file pseudocode Delta 2; AC-10 + AC-11 | Family A + Family C both; pure synthetic e-values (no wealth process); mixed Family A + Family C in same trial | Pseudocode imports `freshBettingState` + `updateBettingState` from `../engine/detectors/betting-e-process`; no `FamilyCBettingEProcessState` import; no `compileConfig` import |
| 14 | PR-F2 evidence matrix params: Q_LEVEL=0.05, N_SHARDS=100, T_TICKS=100, N_TRIALS=200, ρ²=0.5 | § Mechanism primitive 10; § Per-file pseudocode Delta 2; AC-10, AC-11 | Different q (e.g., 0.10); different N (e.g., 50); different T; different ρ; different number of trials | Pseudocode constants `Q_LEVEL=0.05`, `N_SHARDS=100`, `T_TICKS=100`, `N_TRIALS=200`, `RHO_SQUARED=0.5` declared once at top of test file; ACs reference by name |
| 15 | Both PR-F2 cells assert theory-derived Wilson upper bound (NOT OBSERVED-binding) | § Mechanism primitive 10 + 11; AC-10 + AC-11 | Bind FPR observation on either cell to a specific OBSERVED value (would violate R07 OBSERVED-binding-scope) | AC-10 + AC-11 both use `assert.ok(fdr <= FDR_BOUND, ...)` where FDR_BOUND is computed from Q_LEVEL + 3·√(Q_LEVEL·(1−Q_LEVEL)/N_TRIALS); no `assert.strictEqual(fdr, 0.025)`-style binding |
| 16 | Family-agnostic claim: primitive accepts linear-space e-values regardless of family | § Mechanism primitive 1 + 9; AC-1 + AC-4 + AC-5 + AC-6 | Family-specific wrappers (`eBenjaminiHochbergFamilyA` / `eBenjaminiHochbergFamilyC`) at R13 | Pseudocode signature takes plain `ReadonlyArray<number>`; module header explicitly documents family-agnostic; R13-SAS-17 fences Family-specific wrappers |
| 17 | Q-J1 parallel-not-serial: R13 does NOT consume R11/R12 outputs in critical path | § Mechanism primitive 3; § Anti-scope R13-SAS-14 | Conditional gating chain (fleet-merge fires → run e-BH); always-chain (e-BH applied to fleet-level e-values per option α from R12 OQ-1) | Pseudocode imports list contains NO import from `../engine/fleet/combine` or `../engine/fleet/detectors`; q13 test PR-F2 simulator uses `updateBettingState` + `eBenjaminiHochberg` ONLY (no `combineProduct` / `combineAverage` / `fleetMergeFamilyA` call); R13-SAS-14 fences |
| 18 | MD-F2: fixed-time e-BH at R13; any-time deferred | § Mechanism primitive 4; § Per-file pseudocode Delta 1 module header; § Anti-scope R13-SAS-13 | Any-time e-process selection (Wang-Ramdas-Vovk 2022) at R13 | Pseudocode contains NO `evaluateAtTime(t)` API; module header documents fixed-time + deferral; R13-SAS-13 fences |
| 19 | TDD ordering = RED (q13 test only; TS2307 on missing e-bh.ts) → GREEN (e-bh.ts atomic landing) | § Per-file pseudocode Implementer note 5; AC-13 | Single-commit landing; production code before test | AC-13 specifies two-commit ordering; pre-R13 `engine/fleet/e-bh.ts` does not exist; q13 import would fail TS2307 |
| 20 | File-creation track-state: `engine/fleet/e-bh.ts`, `test/q13-e-bh-fdr.test.ts` do NOT exist at HEAD `2a3c177` | § Component inventory directory-creation note | Assumed pre-existing | `git ls-files engine/fleet/e-bh.ts test/q13*.test.ts` at HEAD `2a3c177` returns empty output |
| 21 | No grep-evidence ACs that match `//` comments (R03 MINOR-2 reinforcement) | § Acceptance criteria | A grep AC matching `eBenjaminiHochberg` (would match comments + imports indiscriminately) | R13 has ZERO grep-pattern verification ACs — all evidence comes from test-body assertions or git-log structural assertions; reinforcement satisfied trivially by absence |
| 22 | File-level docblock coverage (R10 reinforcement; 3rd post-reinforcement application): new file declares full surface in file-level header AND spec verifies header matches delta | § Per-file pseudocode Delta 1 file-header text | New module without docblock; docblock states a different surface than what the file actually exports | Delta 1 includes verbatim file-level docblock; Implementer note 6 mandates header verification; the verbatim spec pseudocode IS the file content |
| 23 | Citation-accuracy via `sed -n` extraction (R11 OBS-1/-2 reinforcement; 2nd post-reinforcement application) | § REVIEWER-ANCHOR table; § Architect self-attest | Citation reconstructed from memory; line number guessed | All REVIEWER-ANCHOR rows above include the verbatim snippet from `sed -n 'N,Mp' <path>` extracted at spec-emit; Architect self-attest section confirms |
| 24 | Inherited-testimony empirical verification (R08 reinforcement; 6th application; anchor PR #38) | § Architect self-attest | Cite R11/R12 results without re-running | Architect self-attest confirms `npm run typecheck` exits 0 + q11 18/18 + q12 16/16 at HEAD `2a3c177` |
| 25 | Fixture-sizing exhaustive propagation (R07 reinforcement; 6th application; anchor PR #38) | § Mechanism primitive 10; § Per-file pseudocode Delta 2; AC-10 + AC-11 | One cell uses N_TRIALS=200, the other uses N_TRIALS=100 (asymmetric Wilson bounds invalidates cross-cell comparison) | Both PR-F2 cells use IDENTICAL `N_TRIALS=200`, identical `Q_LEVEL=0.05`, identical `N_SHARDS=100`, identical `T_TICKS=100`; only the `scenario: 'iid' \| 'correlated'` flag differs; Wilson bound is shared |
| 26 | Architect grilling pass per NEXT-ROLE.md item 5: "would a future implementation FIX matching prediction FAIL the FDR-control tests?" | § Grilling output Q4; AC-10 + AC-11 | OBSERVED-bound disposition where future FIX would fail | Architect pre-prediction: iid empirical FDR ≈ 0.01-0.05; correlated empirical FDR ≈ 0.01-0.06. Wilson bound is 0.0962. Any future FIX producing FDR ≤ 0.0962 PASSES; any future BUG producing FDR > 0.0962 FAILS. Tests are right-reasons-safe |
| 27 | Component inventory AC-range claim cross-checked against per-file pseudocode docstring AND Acceptance criteria AND P3 Coverage row (R05 MINOR-1 reinforcement; 7th application) | § Component inventory; § Per-file pseudocode docstrings; § Acceptance criteria; § P3 Coverage row | One site says "AC-1 through AC-12", another says "AC-1 through AC-14" | Component inventory says "AC-1 through AC-14"; per-file pseudocode Delta 2 docstring says "R13 AC-1 through AC-14"; § Acceptance criteria enumerates AC-1 through AC-14 inclusive; P3 Coverage row says "All 14 ACs (AC-1 .. AC-14)" — four sites agree on 14 |
| 28 | Public opts/options field AC coverage (R06 MINOR-3 reinforcement; 5th application) | § Per-file pseudocode Delta 1 signature | `eBenjaminiHochberg` declares an `opts: { ... }` interface with optional fields, but only some are bound by AC | The R13 API has NO opts interface; only two positional parameters `perShardEValues` and `qLevel`, both bound by ACs (AC-2 + AC-3/AC-12 + AC-9). Trivially-by-absence |

All 28 checks PASS at spec-emit time. The cross-section pass is now standing discipline at Tessera; this is the 9th consecutive application (R02=9 / R03=13 / R04=12 / R05=15 / R10=16 / R11=20 / R12=26 / R13=28).

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `engine/fleet/e-bh.ts` | CREATED | Delta 1: new file containing `EBenjaminiHochbergOutput` interface and `eBenjaminiHochberg` exported function. Imports nothing (leaf module). Binds AC-1 through AC-9 (function-level), AC-10 + AC-11 (consumed by q13 PR-F2 simulator), AC-12 (qLevel required). |
| `test/q13-e-bh-fdr.test.ts` | CREATED | Delta 2: new test file binding AC-1 through AC-14 (14 tests total). Imports from `engine/fleet/e-bh`, `engine/detectors/betting-e-process`. Re-inlines `mulberry32` PRNG + Box-Muller `gaussian` Gaussian generator pattern (NOT imported from inherited tests, per R11/R12 standalone-test convention). |
| `engine/fleet/combine.ts` | UNCHANGED | R13-SAS-1: R11 fleet-merge primitives frozen. |
| `engine/fleet/detectors.ts` | UNCHANGED | R13-SAS-2: R12 fleet-merged detector surfaces frozen. |
| `engine/types/fleet.ts` | UNCHANGED | R13-SAS-3: R11 fleet state type frozen. |
| `engine/per-shard/runtime.ts` | UNCHANGED | R13-SAS-4. R10 MINOR-1 module-docblock carry-forward preserved (operator gate item). |
| `engine/per-shard/welford.ts` | UNCHANGED | R13-SAS-4. |
| `engine/per-shard/warm-start.ts` | UNCHANGED | R13-SAS-4. |
| `engine/detectors/*` | UNCHANGED | R13-SAS-5 (A12 anti-scope; inherited engine internals frozen). |
| `engine/types/families/{a,b,c,d,e}.ts` | UNCHANGED | R13-SAS-6 (vendored). |
| `engine/types/config.ts` | UNCHANGED | R13-SAS-7 (Tessera schema extensions NOT modified at R13). |
| `engine/types/index.ts` | UNCHANGED | R13-SAS-8 (no R13 re-export of e-bh.ts; future SLICE may add). |
| `tools/*` | UNCHANGED | R13-SAS-9. |
| `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md` | UNCHANGED | R13-SAS-20. |
| `coordination/specs/Q-R[01-12]-SPEC.md` | UNCHANGED | R13-SAS-21 (prior-round specs frozen). |
| `test/_substrate/factories.ts` | UNCHANGED | R13-SAS-10 (R13 q13 fixtures use literal arrays + the re-inlined PRNG/Gaussian helpers; no new factory needed). |
| `test/q[01-12]*.test.ts` | UNCHANGED | R13-SAS-10 (frozen prior-round tests). |
| `test/betting-e-process-class-dispatch.test.ts` | UNCHANGED | R13-SAS-10. |

**Component inventory AC-range cross-check** (R05 MINOR-1 reinforcement; 7th consecutive application):
- Component inventory narrative above lists q13 test binding "AC-1 through AC-14" (14 ACs).
- § Per-file pseudocode Delta 2 docstring lists "R13 AC-1 through AC-14".
- § Acceptance criteria below enumerates AC-1 through AC-14 inclusive (14 ACs total).
- § P3 ten-axis verification Coverage row enumerates the same 14 ACs.
- All four sites agree: **14 ACs**.

**Directory-creation track-state verification** (R02 OBS-2 file-track-state reinforcement applied inversely):
- `engine/fleet/e-bh.ts` — does NOT exist at HEAD `2a3c177` (`git ls-files engine/fleet/e-bh.ts` returns empty). GREEN commit creates this file.
- `test/q13-e-bh-fdr.test.ts` — does NOT exist at HEAD `2a3c177` (`git ls-files test/q13*.test.ts` returns empty; verified at spec-emit). RED commit creates this file.

---

## Integration points

_(R03-derived re-export-chain-check reinforcement applied — 5th consecutive application — for each named symbol consumed in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)_

1. **`eBenjaminiHochberg` (R13 new export)** — declared in `engine/fleet/e-bh.ts` (verbatim spec text in Delta 1). Imported by `test/q13-e-bh-fdr.test.ts` via leaf-path `../engine/fleet/e-bh` import (no barrel re-export). Re-export chain: NONE (leaf module).

2. **`EBenjaminiHochbergOutput` (R13 new export; interface)** — declared in `engine/fleet/e-bh.ts` (verbatim spec text in Delta 1; co-located with the function). Imported by `test/q13-e-bh-fdr.test.ts` via the same `../engine/fleet/e-bh` import (type-only import).

3. **`freshBettingState` + `updateBettingState` (inherited Family A; vendored at SHA `5a72371`)** — declared in `engine/detectors/betting-e-process.ts:72-82` (freshBettingState) and `engine/detectors/betting-e-process.ts:150-167` (updateBettingState). Imported by `test/q13-e-bh-fdr.test.ts` via `../engine/detectors/betting-e-process` import. Re-export chain: `engine/types/index.ts` re-exports types from `families/a` (line 22) but NOT the runtime functions from `detectors/betting-e-process`; q13 imports them directly (matches R11 q11 pattern at `test/q11-hierarchical-e-value-combination.test.ts:25-28`).

4. **`BettingEProcessState` (Family A type)** — declared in `engine/types/families/a.ts:20-28`. Re-export chain: `engine/types/index.ts:22` re-exports via `export * from './families/a'`. R13 q13 test does NOT directly import this type (the wealth state is passed implicitly via `freshBettingState` / `updateBettingState` returns; explicit type annotation not needed in q13 because TypeScript infers it from `freshBettingState()`). No import needed.

5. **No imports from `engine/fleet/combine.ts` or `engine/fleet/detectors.ts`** — R13 e-BH is a PARALLEL view per § Mechanism primitive 3; R13-SAS-14 fences. Verified: spec pseudocode Delta 1 imports nothing; Delta 2 imports only from `../engine/fleet/e-bh` and `../engine/detectors/betting-e-process`.

6. **PRD trace:** R13 closes the FDR-control half of AC-P1 (`coordination/PRD.md:42-43`).

7. **SCOPING-MEMO-v0.3 trace:** Extension 1 recommended approach (c) "FDR-style as the operator-facing fleet-level surface" (lines 99-101); PR-F2 mandate (lines 120-128); R-S2 referencing (line 336).

---

## Per-file pseudocode

### Delta 1 — CREATE `engine/fleet/e-bh.ts` (verbatim file contents)

```typescript
// engine/fleet/e-bh.ts — Tessera SLICE 4 (R13): e-Benjamini-Hochberg FDR
// operator surface for per-shard e-values.
//
// Operator-facing API:
//
//   eBenjaminiHochberg(perShardEValues, qLevel) → { selected, K }
//
// Implements the Ren-Barber 2024 e-BH procedure (Algorithm 1; equivalent
// to Wang-Ramdas 2022 e-BH; theoretically grounded in Vovk-Wang 2021 §4).
// Given N per-shard linear-space e-values e_1, ..., e_N and an FDR target
// q ∈ (0, 1]:
//
//   1. Sort indices by e-value descending; tie-break by index ascending
//      for determinism. (Standard e-BH does not specify tie-breaking;
//      any deterministic rule preserves the FDR-control theorem.)
//   2. Let e_(1) ≥ e_(2) ≥ ... ≥ e_(N) be the sorted e-values.
//   3. Find R = max{k ∈ {1, ..., N} : k · e_(k) ≥ N / q}; if no such k
//      exists, R = 0.
//   4. Return the R indices corresponding to the R largest e-values
//      (sorted ascending in the result for caller ergonomics) and K = R.
//
// FDR-control guarantee (Wang-Ramdas 2022 Theorem 4.1; Ren-Barber 2024 §2):
// if each e_i is a valid e-value under H_{0,i} (i.e., E[e_i | H_{0,i}] ≤ 1),
// then FDR = E[#false / max(K, 1)] ≤ q · N_0/N ≤ q, where N_0 is the
// number of true H_0 hypotheses. The bound holds under ARBITRARY DEPENDENCE
// between e-values (no independence assumption required). This is the
// fundamental property distinguishing e-BH from p-value-based BH: the
// e-value structure preserves FDR even under correlated drift across shards.
//
// Operator-facing claim: K shards flagged; expected number of falsely-
// flagged shards ≤ q · K under the operator's null model.
//
// Architectural position (per Q-J1 hybrid framing in
// ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md): e-BH is the operator-facing
// FDR interface, PARALLEL to the fleet-merge Ville-bound interface at
// engine/fleet/combine.ts (R11) + engine/fleet/detectors.ts (R12). Both
// consume the same per-shard e-values; they are NOT chained. The Ville
// layer provides the formal any-time guarantee; the e-BH layer provides
// the operator-facing K-shards-flagged surface.
//
// MD-F2 (load-bearing per SCOPING-MEMO-v0.3 § 2.1 + Q-J1): SLICE 4 ships
// the FIXED-TIME e-BH procedure (decision at a single time point T). The
// ANY-TIME analog (Wang-Ramdas-Vovk 2022 e-process selection under any-
// time FDR; arXiv:2009.02824 streaming variant) is deferred to a future
// SLICE. Documented here as an explicit Tessera-design tradeoff, not
// silent absorption.
//
// Default qLevel: NONE. qLevel is a required positional parameter.
// Rationale: the operator-facing claim "E[#false-flagged-shards] ≤ q · K"
// directly couples the operator's policy decision (acceptable false-
// discovery fraction) to the procedure output; a silent default risks
// misalignment. Canonical literature values are q = 0.05 (classical FDR
// target per BH 1995) and q = 0.10 (less conservative). Both are valid
// operator choices; neither is a Tessera default.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the
// shared npm package at Tessera Phase 2 close per SCOPING-MEMO-v0.3 § 9.

/** Output shape of the e-BH procedure. Wrapped in an object (rather than
 *  returning a bare `number[]`) for forward compatibility — future SLICEs
 *  may add fields (e.g., `threshold_e` for diagnostics) without breaking
 *  callers. R13 ships the minimal shape. Mirrors the R11 FleetMergeOutput /
 *  R12 FleetMergeStepResult wrapping convention. */
export interface EBenjaminiHochbergOutput {
  /** 0-based indices of the selected shards (the K shards with the
   *  largest e-values). Sorted ascending for caller ergonomics.
   *  Length === K. */
  selected: ReadonlyArray<number>;
  /** Number of selected shards. Operator-facing K in the FDR claim
   *  "expected falsely-flagged shards ≤ q · K." Equals selected.length. */
  K: number;
}

/** Run the e-BH FDR procedure on N per-shard linear-space e-values at FDR
 *  target q.
 *
 *  See file header for the procedure definition and FDR-control guarantee.
 *
 *  Throws:
 *    - if perShardEValues.length === 0 (N=0 shards is structurally
 *      undefined; mirrors R11 combineProduct/combineAverage empty-input
 *      convention at engine/fleet/combine.ts:64-66, 88-90).
 *    - if qLevel ≤ 0 or qLevel > 1 (invalid FDR target). The single
 *      conjunctive guard `qLevel > 0 && qLevel <= 1` handles NaN and
 *      undefined uniformly (any comparison against NaN/undefined returns
 *      false).
 *
 *  Per-input invariance: does NOT mutate perShardEValues. The sort and
 *  selection operate on an internal indexed copy. */
export function eBenjaminiHochberg(
  perShardEValues: ReadonlyArray<number>,
  qLevel: number,
): EBenjaminiHochbergOutput {
  const N = perShardEValues.length;
  if (N === 0) {
    throw new Error('eBenjaminiHochberg: empty input array (N=0 shards is undefined)');
  }
  if (!(qLevel > 0 && qLevel <= 1)) {
    throw new Error(`eBenjaminiHochberg: qLevel must be in (0, 1]; got ${qLevel}`);
  }
  // Build indexed pairs and sort by e-value DESC, ties broken by index ASC.
  // Standard e-BH does not specify tie-breaking; any deterministic rule
  // preserves the FDR-control theorem.
  const indexed: Array<{ e: number; idx: number }> = [];
  for (let i = 0; i < N; i++) {
    indexed.push({ e: perShardEValues[i], idx: i });
  }
  indexed.sort((a, b) => {
    if (b.e !== a.e) return b.e - a.e;
    return a.idx - b.idx;
  });
  // Find R = max k in [1, N] with k · e_(k) ≥ N / q. Step down from k=N.
  // The multiplicative form k · e_(k) avoids dividing by zero in the
  // degenerate case where k iterates over zero (we never index k=0 here,
  // but k * e_(k) is also numerically cleaner than e_(k) ≥ N / (k · q)).
  const N_over_q = N / qLevel;
  let R = 0;
  for (let k = N; k >= 1; k--) {
    if (k * indexed[k - 1].e >= N_over_q) {
      R = k;
      break;
    }
  }
  // Selected indices = first R entries in DESC-sorted order; re-sort ASC
  // for caller-ergonomic output ordering (operators consume shard indices
  // typically in their original numeric order).
  const selected: number[] = [];
  for (let r = 0; r < R; r++) {
    selected.push(indexed[r].idx);
  }
  selected.sort((a, b) => a - b);
  return { selected, K: R };
}
```

### Delta 2 — CREATE `test/q13-e-bh-fdr.test.ts` (verbatim file contents)

```typescript
// test/q13-e-bh-fdr.test.ts — R13 AC-1 through AC-14.
//
// Binds the SLICE 4 e-Benjamini-Hochberg FDR operator surface +
// PR-F2 evidence matrix at N=100 shards × T=100 ticks × N_trials=200.
//
// PR-F2 evidence matrix (2 cells; both theory-derived Wilson bounds):
//   (iid H₀)              → AC-10: empirical FDR ≤ Wilson upper bound
//   (correlated-drift H₀) → AC-11: empirical FDR ≤ Wilson upper bound
//
// Under all-H₀, FDR = E[K_false / max(K, 1)] = E[1_{K > 0}] = P(K > 0),
// which is what the simulator measures. Wang-Ramdas 2022 Theorem 4.1
// guarantees e-BH FDR ≤ q · N_0/N ≤ q under arbitrary dependence between
// e-values; both cells expected to PASS.
//
// Right-reasons-safe: ACs bind theory-derived Wilson upper bound, NOT
// OBSERVED FDR values (per R07 OBSERVED-binding-scope reinforcement). A
// future implementation FIX matching architect prediction (≈ 0.01-0.06)
// passes the bound (0.0962); a future BUG producing FDR ≈ 0.20 fails it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eBenjaminiHochberg,
  type EBenjaminiHochbergOutput,
} from '../engine/fleet/e-bh';
import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process';

// ─── Deterministic PRNG + Gaussian generator (re-inlined per R11 q11 +
// R12 q12 standalone convention; NOT imported from inherited tests). ───

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

// ─── PR-F2 evidence matrix parameters (cross-section consistency pass row 14). ───

const Q_LEVEL = 0.05;
const N_SHARDS = 100;
const T_TICKS = 100;
const N_TRIALS = 200;
const RHO_SQUARED = 0.5;  // correlated-drift shared-factor variance fraction
const FDR_BOUND = Q_LEVEL + 3 * Math.sqrt(Q_LEVEL * (1 - Q_LEVEL) / N_TRIALS);
// FDR_BOUND ≈ 0.05 + 3·√(0.05·0.95/200) ≈ 0.09624.

// ─── R13 AC-1 — eBenjaminiHochberg returns EBenjaminiHochbergOutput shape ─
test('R13 AC-1 — eBenjaminiHochberg returns { selected: ReadonlyArray<number>, K: number } with K === selected.length', () => {
  const out: EBenjaminiHochbergOutput = eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2);
  assert.ok(Array.isArray(out.selected), 'selected must be array');
  assert.strictEqual(typeof out.K, 'number', 'K must be number');
  assert.strictEqual(out.K, out.selected.length, 'K must equal selected.length');
});

// ─── R13 AC-2 — Empty perShardEValues throws ────────────────────────────
test('R13 AC-2 — eBenjaminiHochberg([], q) throws on empty input', () => {
  assert.throws(
    () => eBenjaminiHochberg([], 0.05),
    /empty input/,
    'must throw on N=0',
  );
});

// ─── R13 AC-3 — Invalid qLevel throws ───────────────────────────────────
test('R13 AC-3 — eBenjaminiHochberg throws on qLevel ≤ 0 or qLevel > 1', () => {
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 0), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], -0.1), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 1.5), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 2), /qLevel/);
});

// ─── R13 AC-4 — Below-threshold input produces K=0 ──────────────────────
test('R13 AC-4 — all e_i below threshold ⇒ K=0, selected=[]', () => {
  const small_es = new Array(100).fill(0.5);
  const out = eBenjaminiHochberg(small_es, 0.05);
  // Threshold N/q = 100/0.05 = 2000; max k * e_(k) over k ∈ [1, 100]
  // is N * 0.5 = 50 (at k=100 with all 0.5s), well below 2000 → R=0.
  assert.strictEqual(out.K, 0);
  assert.deepStrictEqual(out.selected, []);
});

// ─── R13 AC-5 — Closed-form worked example (N=5; R=3) ───────────────────
test('R13 AC-5 — closed-form: eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2) ⇒ {selected: [0,1,2], K: 3}', () => {
  // N/q = 5/0.2 = 25. Step down from k=5:
  //   k=5: 5·0.5 = 2.5  < 25 ✗
  //   k=4: 4·2   = 8    < 25 ✗
  //   k=3: 3·10  = 30   ≥ 25 ✓ → R=3
  // Selected (top 3 by e-value): indices [0, 1, 2] in original order; sort ASC = [0, 1, 2].
  const out = eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2);
  assert.strictEqual(out.K, 3);
  assert.deepStrictEqual(out.selected, [0, 1, 2]);
});

// ─── R13 AC-6 — Closed-form worked example (N=10; R=3) ──────────────────
test('R13 AC-6 — closed-form: eBenjaminiHochberg([300,150,80,40,20,10,5,2.5,1.25,0.6], 0.05) ⇒ {selected: [0,1,2], K: 3}', () => {
  // N/q = 10/0.05 = 200. Step down from k=10:
  //   k=10..4: all k·e_(k) < 200 (max at k=4 is 4·40 = 160 < 200)
  //   k=3: 3·80 = 240 ≥ 200 ✓ → R=3
  // Selected: indices [0, 1, 2] in original order; sort ASC = [0, 1, 2].
  const out = eBenjaminiHochberg(
    [300, 150, 80, 40, 20, 10, 5, 2.5, 1.25, 0.6],
    0.05,
  );
  assert.strictEqual(out.K, 3);
  assert.deepStrictEqual(out.selected, [0, 1, 2]);
});

// ─── R13 AC-7 — Output index ordering: selected sorted ascending ────────
test('R13 AC-7 — out.selected is sorted ascending (non-contiguous high-e indices)', () => {
  // Place high e-values at non-contiguous indices [3, 0, 7].
  const e = new Array(10).fill(0.1);
  e[3] = 300;
  e[0] = 150;
  e[7] = 80;
  // N/q = 10/0.05 = 200. Sorted DESC by e: [300, 150, 80, 0.1, ..., 0.1].
  //   k=3: 3·80 = 240 ≥ 200 ✓ → R=3
  // Raw selected (DESC order): [3, 0, 7]; sort ASC → [0, 3, 7].
  const out = eBenjaminiHochberg(e, 0.05);
  assert.deepStrictEqual(out.selected, [0, 3, 7]);
  // Explicit ascending verification.
  for (let i = 1; i < out.selected.length; i++) {
    assert.ok(
      out.selected[i] > out.selected[i - 1],
      `selected must be strictly ascending at i=${i}`,
    );
  }
});

// ─── R13 AC-8 — Tie-breaking deterministic ───────────────────────────────
test('R13 AC-8 — duplicate e-values resolved deterministically by index ascending (all-tied + partial-tie fixtures)', () => {
  // All 5 shards have e_i = 100 exactly.
  // N/q = 5/0.1 = 50. For k=5: 5·100 = 500 ≥ 50 ✓ → R=5.
  // Stable sort tie-break (idx ASC): DESC order = [0,1,2,3,4]; ASC selected = [0,1,2,3,4].
  const out_all = eBenjaminiHochberg([100, 100, 100, 100, 100], 0.1);
  assert.strictEqual(out_all.K, 5);
  assert.deepStrictEqual(out_all.selected, [0, 1, 2, 3, 4]);

  // Partial tie: shards [0, 3, 4] at e=200; [1, 2] at e=1.
  // N/q = 5/0.1 = 50. Sort DESC + idx ASC tie-break:
  //   [(200,0), (200,3), (200,4), (1,1), (1,2)]
  //   k=5: 5·1   = 5   < 50 ✗
  //   k=4: 4·1   = 4   < 50 ✗ (e_(4) is the second e=1)
  //   k=3: 3·200 = 600 ≥ 50 ✓ → R=3
  // Raw selected (DESC order): [0, 3, 4]; sort ASC → [0, 3, 4].
  const out_partial = eBenjaminiHochberg([200, 1, 1, 200, 200], 0.1);
  assert.strictEqual(out_partial.K, 3);
  assert.deepStrictEqual(out_partial.selected, [0, 3, 4]);
});

// ─── R13 AC-9 — Per-shard input invariance ──────────────────────────────
test('R13 AC-9 — eBenjaminiHochberg does NOT mutate perShardEValues', () => {
  const e = [50, 30, 10, 2, 0.5];
  const e_before = [...e];
  eBenjaminiHochberg(e, 0.2);
  assert.deepStrictEqual(e, e_before, 'input array must not be mutated');
});

// ─── R13 AC-10 — PR-F2 iid H₀ — empirical FDR ≤ Wilson bound ────────────
test('R13 AC-10 — PR-F2 iid H₀: N=100, T=100, N_trials=200, q=0.05 ⇒ empirical FDR ≤ Wilson bound', () => {
  const fdr = measureEBHFireRate('iid', 0xE130BB01);
  console.log(`  R13 PR-F2 iid          fdr=${fdr.toFixed(5)} bound=${FDR_BOUND.toFixed(5)}`);
  assert.ok(
    fdr <= FDR_BOUND,
    `R13 PR-F2 iid H₀ empirical FDR ${fdr.toFixed(5)} exceeds Wilson bound ${FDR_BOUND.toFixed(5)}`,
  );
});

// ─── R13 AC-11 — PR-F2 correlated-drift H₀ — empirical FDR ≤ Wilson bound ─
test('R13 AC-11 — PR-F2 correlated-drift H₀ (ρ²=0.5): N=100, T=100, N_trials=200, q=0.05 ⇒ empirical FDR ≤ Wilson bound', () => {
  const fdr = measureEBHFireRate('correlated', 0xE130BB02);
  console.log(`  R13 PR-F2 correlated   fdr=${fdr.toFixed(5)} bound=${FDR_BOUND.toFixed(5)}`);
  assert.ok(
    fdr <= FDR_BOUND,
    `R13 PR-F2 correlated-drift H₀ empirical FDR ${fdr.toFixed(5)} exceeds Wilson bound ${FDR_BOUND.toFixed(5)}`,
  );
});

// ─── R13 AC-12 — API ergonomics: qLevel required (no default) ───────────
test('R13 AC-12 — qLevel is a required positional parameter (no default; documented in module header)', () => {
  // Compile-time enforcement: typecheck rejects `eBenjaminiHochberg(es)`
  // (missing required argument). Documented in engine/fleet/e-bh.ts module
  // header: "Default qLevel: NONE. qLevel is a required positional parameter."
  // Runtime check: passing undefined for qLevel triggers the invalid-qLevel
  // throw via the conjunctive guard (`undefined > 0` is false).
  assert.throws(
    () => eBenjaminiHochberg([1, 2, 3], undefined as unknown as number),
    /qLevel/,
    'passing undefined for qLevel must throw via the (0, 1] validation',
  );
});

// ─── R13 AC-13 — TDD ordering (RED precedes GREEN) ──────────────────────
test('R13 AC-13 — TDD ordering: RED commit (q13 test only; TS2307 on missing e-bh.ts) precedes GREEN (e-bh.ts atomic landing)', () => {
  // Verified by Implementer attestation + Reviewer git log review.
  // RED commit must add only test/q13-e-bh-fdr.test.ts; GREEN must add
  // engine/fleet/e-bh.ts atomically. Two-commit ordering visible in
  // `git log --oneline` and `git show --stat <RED> <GREEN>`.
  assert.ok(true);
});

// ─── R13 AC-14 — OBSERVED q13 test count attestation (R03 MINOR-4) ──────
test('R13 AC-14 — OBSERVED q13 test count reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 14 ACs / 14 tests. Implementer reports
  // OBSERVED via `node --test test/q13-e-bh-fdr.test.js` count at GREEN;
  // NEXT-ROLE.md attestation block captures the actual value, not the
  // prediction (R03 MINOR-4 reinforcement; 8th consecutive application).
  assert.ok(true);
});

// ─── PR-F2 simulator (Family A; one trial = N shards × T ticks under
// chosen H₀ scenario). Reuses the R11 correlated-drift mechanism. ────────

/** Run one PR-F2 trial: build N per-shard wealth processes, drive T ticks
 *  under the chosen H₀ scenario, extract per-shard M_T as the linear-space
 *  e-value, run e-BH at Q_LEVEL, return whether ANY shard was selected
 *  (K > 0).
 *
 *  Under all-H₀: FDR = E[K_false / max(K, 1)] = E[1_{K > 0}] = P(K > 0). */
function simulateEBHTrial(
  scenario: 'iid' | 'correlated',
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  const shard_states = Array.from(
    { length: N_SHARDS },
    () => freshBettingState(),
  );
  const stddev_shared = scenario === 'correlated' ? Math.sqrt(RHO_SQUARED) : 0;
  const stddev_per_shard = scenario === 'correlated'
    ? Math.sqrt(1 - RHO_SQUARED)
    : 1;
  for (let t = 0; t < T_TICKS; t++) {
    const shared_z = scenario === 'correlated' ? stddev_shared * gaussian(rng) : 0;
    for (let i = 0; i < N_SHARDS; i++) {
      const per_shard_noise = stddev_per_shard * gaussian(rng);
      const x = shared_z + per_shard_noise;
      updateBettingState(shard_states[i], x, 0, 1, 0);
    }
  }
  const e_values: number[] = shard_states.map(s => s.M);
  const out = eBenjaminiHochberg(e_values, Q_LEVEL);
  return out.K > 0;
}

/** Measure empirical FDR (= P(K > 0) under all-H₀) over N_TRIALS trials. */
function measureEBHFireRate(
  scenario: 'iid' | 'correlated',
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_TRIALS; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateEBHTrial(scenario, seed)) fires++;
  }
  return fires / N_TRIALS;
}
```

### Implementer notes

1. **Verbatim discipline.** Delta 1 and Delta 2 are the COMPLETE file contents. Implementer copies them verbatim (modulo trailing newline). No design decisions are deferred — every algorithm step, error message, fixture value, and type annotation is in the spec. This matches the R09-R12 verbatim-pseudocode discipline (5th consecutive application).

2. **No tactical fixes anticipated.** Spec was authored at HEAD `2a3c177` with file-track-state verified (`git ls-files engine/fleet/e-bh.ts test/q13-e-bh-fdr.test.ts` empty). Inherited surfaces (`engine/detectors/betting-e-process.ts:65, :72-82, :150-167`) were `sed -n`-verified at spec-emit. R11 (`engine/fleet/combine.ts`) and R12 (`engine/fleet/detectors.ts`) tests run clean at HEAD (q11 18/18, q12 16/16; verified by Architect at spec-emit per R08 reinforcement; Implementer to re-run as RED-precondition).

3. **HALT conditions for the Implementer.** If any of these triggers during implementation, HALT + DIAGNOSTIC + escalate (do NOT silently adapt). All are flagged in NEXT-ROLE.md as halt-conditions for R13:
   - (a) PR-F2 empirical FDR exceeds Wilson upper bound on EITHER cell (iid OR correlated). The Wang-Ramdas 2022 theorem guarantees FDR ≤ q; an empirical violation indicates either (i) a bug in the e-BH implementation deviating from Algorithm 1, (ii) a bug in the PR-F2 simulator (wrong per-shard e-value extraction; wrong correlation mechanism; wrong wealth-process driver), or (iii) a fixture-sizing issue (Wilson bound too tight at N_TRIALS=200). All three require Architect review, not Implementer tactical fix.
   - (b) Spec/reality conflict on an inherited surface — e.g., `engine/detectors/betting-e-process.ts:150` signature differs from the spec's REVIEWER-ANCHOR row. This is unlikely given `sed -n` verification at spec-emit but possible if HEAD shifts during implementation.
   - (c) Test count divergence — Implementer expects exactly 14 tests in q13-e-bh-fdr.test.ts at GREEN; the verbatim spec contains exactly 14 `test(...)` blocks. Architect predicts: q13 14/0 pass; full regression 138 + 14 = 152/0 at GREEN.

4. **OBSERVED count attestation.** Implementer reports OBSERVED test counts via `node --test test/q13-e-bh-fdr.test.js` at GREEN; NEXT-ROLE.md attestation block captures the actual value, not the prediction (R03 MINOR-4 reinforcement; 8th consecutive application). Predicted: 14/0 for q13; predicted full regression: prior 13 file counts (3+1+5+6+13+11+13+13+23+11+18+16+5 = 138) + 14 = 152/0.

5. **TDD ordering (R02-R12 standing pattern; 11th consecutive application).** RED commit adds only `test/q13-e-bh-fdr.test.ts` (TS2307 on missing `../engine/fleet/e-bh`). GREEN commit adds only `engine/fleet/e-bh.ts` (typecheck clean; q13 passes). RED and GREEN are two distinct commits visible in `git log --oneline`. R14 two-commit coordination chore sequence applies after GREEN.

6. **File-level docblock verification.** R10 MINOR-1 reinforcement (file-level docblock coverage): the verbatim spec pseudocode for Delta 1 INCLUDES the file-level docblock at lines 1-47 of `engine/fleet/e-bh.ts` (the `// engine/fleet/e-bh.ts — ...` comment block). Implementer note: copy the entire verbatim Delta 1 contents; do NOT trim the header.

7. **No coordination of fleet-merge into e-BH critical path.** Q-J1 parallel-not-serial. Spec Delta 1 imports nothing (leaf module). Spec Delta 2 imports only `eBenjaminiHochberg`, `EBenjaminiHochbergOutput` (from new e-bh.ts) and `freshBettingState`, `updateBettingState` (from inherited betting-e-process.ts). NO import of R11 `combineProduct`/`combineAverage`/`freshFleetEProcessState`/`updateFleetEProcessState` and NO import of R12 `fleetMergeFamilyA`/`fleetMergeFamilyC`. Verifiable via `grep -nE "from '\.\./engine/fleet/(combine|detectors)'" test/q13-e-bh-fdr.test.ts engine/fleet/e-bh.ts` returning empty.

---

## Acceptance criteria

All 14 ACs use "Given X, when Y, then Z" structure where applicable. No ambiguous language ("correctly", "appropriately", "as needed") used.

**AC-1 — eBenjaminiHochberg output shape**
- **Given** the call `eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2)`.
- **When** the function returns.
- **Then** the result is an `EBenjaminiHochbergOutput` with:
  - `Array.isArray(out.selected) === true`;
  - `typeof out.K === 'number'`;
  - `out.K === out.selected.length`.
- Test: `test/q13-e-bh-fdr.test.ts` "R13 AC-1".

**AC-2 — Empty input throws**
- **Given** the call `eBenjaminiHochberg([], 0.05)`.
- **When** the function is invoked.
- **Then** it throws an Error whose message matches `/empty input/`.
- Test: "R13 AC-2".

**AC-3 — Invalid qLevel throws**
- **Given** calls with `qLevel ∈ {0, -0.1, 1.5, 2}` and a non-empty input array `[1, 2, 3]`.
- **When** each call is invoked.
- **Then** each throws an Error whose message matches `/qLevel/`.
- Test: "R13 AC-3".

**AC-4 — Below-threshold input produces K=0**
- **Given** the call `eBenjaminiHochberg(new Array(100).fill(0.5), 0.05)`.
- **When** the function returns.
- **Then** `out.K === 0` AND `out.selected.deepStrictEqual([])`.
- Test: "R13 AC-4".

**AC-5 — Closed-form worked example (N=5; R=3)**
- **Given** the call `eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2)`.
- **When** the function returns.
- **Then** `out.K === 3` AND `out.selected.deepStrictEqual([0, 1, 2])`.
- (Hand-computed: N/q = 25; k=5,4 fail; k=3: 3·10 = 30 ≥ 25 ✓.)
- Test: "R13 AC-5".

**AC-6 — Closed-form worked example (N=10; R=3)**
- **Given** the call `eBenjaminiHochberg([300, 150, 80, 40, 20, 10, 5, 2.5, 1.25, 0.6], 0.05)`.
- **When** the function returns.
- **Then** `out.K === 3` AND `out.selected.deepStrictEqual([0, 1, 2])`.
- (Hand-computed: N/q = 200; k=10..4 fail; k=3: 3·80 = 240 ≥ 200 ✓.)
- Test: "R13 AC-6".

**AC-7 — Output index ordering is ascending**
- **Given** the call `eBenjaminiHochberg(e, 0.05)` where `e` is a length-10 array with `e[3]=300, e[0]=150, e[7]=80`, all others 0.1.
- **When** the function returns.
- **Then** `out.selected.deepStrictEqual([0, 3, 7])` AND for every `i ∈ [1, out.selected.length)`, `out.selected[i] > out.selected[i-1]` (strictly ascending).
- Test: "R13 AC-7".

**AC-8 — Tie-breaking deterministic (all-tied + partial-tie fixtures)**
- **Given** the call `eBenjaminiHochberg([100, 100, 100, 100, 100], 0.1)`.
- **When** the function returns.
- **Then** `out.K === 5` AND `out.selected.deepStrictEqual([0, 1, 2, 3, 4])`.
- **AND given** the call `eBenjaminiHochberg([200, 1, 1, 200, 200], 0.1)`.
- **When** the function returns.
- **Then** `out.K === 3` AND `out.selected.deepStrictEqual([0, 3, 4])`.
- (Tie-break: idx ASC within each e-value group.)
- Test: "R13 AC-8".

**AC-9 — Per-shard input invariance**
- **Given** an array `e = [50, 30, 10, 2, 0.5]` and a snapshot `e_before = [...e]`.
- **When** `eBenjaminiHochberg(e, 0.2)` is invoked.
- **Then** `e.deepStrictEqual(e_before)` after the call.
- Test: "R13 AC-9".

**AC-10 — PR-F2 iid H₀: empirical FDR ≤ Wilson upper bound**
- **Given** N_SHARDS=100, T_TICKS=100, N_TRIALS=200, Q_LEVEL=0.05, scenario='iid', base_seed=0xE130BB01.
- **When** `measureEBHFireRate('iid', 0xE130BB01)` runs (drives N_SHARDS Family A wealth processes for T_TICKS ticks each under iid N(0,1) per shard, extracts each `state.M` as the per-shard e-value, runs `eBenjaminiHochberg` at Q_LEVEL, counts trials where K > 0).
- **Then** observed `fdr ≤ FDR_BOUND` where `FDR_BOUND = Q_LEVEL + 3·√(Q_LEVEL·(1−Q_LEVEL)/N_TRIALS) ≈ 0.09624`.
- Theory derivation (Wang-Ramdas 2022 Theorem 4.1; Howard-Ramdas-McAuliffe-Sekhon 2021): each per-shard `M_T` is a non-negative martingale with E[M_T] ≤ 1 under H_0 marginally; e-BH applied to (M_1, …, M_N) at level q satisfies FDR ≤ q (NOT OBSERVED-binding; theory-derived bound).
- Test: "R13 AC-10".

**AC-11 — PR-F2 correlated-drift H₀ (ρ²=0.5): empirical FDR ≤ Wilson upper bound**
- **Given** N_SHARDS=100, T_TICKS=100, N_TRIALS=200, Q_LEVEL=0.05, RHO_SQUARED=0.5, scenario='correlated', base_seed=0xE130BB02.
- **When** `measureEBHFireRate('correlated', 0xE130BB02)` runs (each tick uses shared `z_t ~ N(0, 0.5)` + per-shard `~ N(0, 0.5)` noise; per-shard marginal is `N(0, 1)` with cross-shard correlation ρ² = 0.5).
- **Then** observed `fdr ≤ FDR_BOUND ≈ 0.09624`.
- Theory derivation: Wang-Ramdas 2022 Theorem 4.1 guarantees FDR ≤ q under ARBITRARY DEPENDENCE between e-values. Each per-shard `M_T` is marginally valid (correlated noise does NOT break the per-shard martingale property); e-BH preserves FDR ≤ q regardless of cross-shard correlation.
- Test: "R13 AC-11".

**AC-12 — qLevel required (no default)**
- **Given** the call `eBenjaminiHochberg([1, 2, 3], undefined as unknown as number)`.
- **When** invoked.
- **Then** throws an Error whose message matches `/qLevel/` (via the conjunctive guard `qLevel > 0 && qLevel <= 1`; undefined fails both comparisons).
- **AND** compile-time enforcement: TypeScript signature `(perShardEValues: ReadonlyArray<number>, qLevel: number): EBenjaminiHochbergOutput` rejects `eBenjaminiHochberg([1, 2, 3])` (missing required argument).
- Test: "R13 AC-12".

**AC-13 — TDD ordering (RED commit precedes GREEN commit)**
- **Given** the R13 commit sequence.
- **When** Reviewer inspects `git log --oneline` for R13 commits.
- **Then** there exists a RED commit (modifying only `test/q13-e-bh-fdr.test.ts`; typecheck would fail TS2307 on missing `../engine/fleet/e-bh` at this SHA) committed BEFORE a GREEN commit (modifying only `engine/fleet/e-bh.ts`; typecheck exits 0; q13 passes 14/0 at this SHA).
- Test: "R13 AC-13" (always-passes; verified by Reviewer git inspection).

**AC-14 — OBSERVED q13 test count attestation**
- **Given** the R13 GREEN commit.
- **When** Implementer runs `node --test test/q13-e-bh-fdr.test.js`.
- **Then** the OBSERVED count (predicted: 14/0) is recorded VERBATIM in `coordination/NEXT-ROLE.md` Attestation block; OBSERVED full-regression total (predicted: 152/0) likewise. NO prediction value substituted (R03 MINOR-4 reinforcement; 8th consecutive application).
- Test: "R13 AC-14" (always-passes; attestation verified by Reviewer reading NEXT-ROLE.md vs `node --test` re-run).

---

## Anti-scope

R13 SHALL NOT modify or introduce any of the following surfaces. Reviewer verifies each via `git diff` at routing. SAS fences are tagged R13-SAS-N.

- **R13-SAS-1**: `engine/fleet/combine.ts` UNCHANGED. R11 fleet-merge primitives frozen.
- **R13-SAS-2**: `engine/fleet/detectors.ts` UNCHANGED. R12 fleet-merged detector surfaces frozen.
- **R13-SAS-3**: `engine/types/fleet.ts` UNCHANGED. R11 fleet state type frozen.
- **R13-SAS-4**: `engine/per-shard/*` UNCHANGED. Tessera per-shard runtime (R03-R10) frozen. R10 MINOR-1 module-docblock carry-forward preserved (operator gate item).
- **R13-SAS-5**: `engine/detectors/*` UNCHANGED. A12 anti-scope (inherited engine internals frozen per Phase-3.d.D closure).
- **R13-SAS-6**: `engine/types/families/{a,b,c,d,e}.ts` UNCHANGED. Vendored family-type interfaces frozen.
- **R13-SAS-7**: `engine/types/config.ts` UNCHANGED. Tessera schema extensions NOT modified at R13; no new CompiledConfig fields.
- **R13-SAS-8**: `engine/types/index.ts` UNCHANGED. NO re-export of `eBenjaminiHochberg` or `EBenjaminiHochbergOutput` through the family-types barrel.
- **R13-SAS-9**: `tools/*` UNCHANGED.
- **R13-SAS-10**: Pre-R13 test files UNCHANGED. `test/_substrate/factories.ts`, `test/q01..q12*.test.ts`, `test/betting-e-process-class-dispatch.test.ts` frozen.
- **R13-SAS-11**: NO real-cluster trace integration (Phase 1 boundary; synthetic-substrate only).
- **R13-SAS-12**: NO Phase 2 work (cross-shard correlation layer; HardwareTopologySource; deployment-event freeze hook; A15/A16 anti-scope).
- **R13-SAS-13**: NO any-time FDR analog (Wang-Ramdas-Vovk 2022 e-process selection under any-time FDR; arXiv:2009.02824 streaming variant). MD-F2: SLICE 4 ships fixed-time only; any-time deferred to a future SLICE.
- **R13-SAS-14**: NO chaining of fleet-merge OUTPUT into e-BH INPUT. Q-J1 parallel-not-serial architecture. Both R11/R12 fleet-merge and R13 e-BH consume the same per-shard e-values; neither chains into the other.
- **R13-SAS-15**: NO randomized e-BH variant at R13. Standard (deterministic) e-BH only. Future SLICE may add randomized variant.
- **R13-SAS-16**: NO BY-style stepwise correction (Benjamini-Yekutieli 2001 analog for e-values). Standard e-BH preserves FDR under arbitrary dependence between e-values without the H_N correction; BY-style would be over-conservative.
- **R13-SAS-17**: NO Family-specific wrappers (`eBenjaminiHochbergFamilyA`, `eBenjaminiHochbergFamilyC`) at R13. Family-agnostic primitive only; future SLICE may add Family-specific wrappers parallel to R12's `fleetMergeFamilyA/C`.
- **R13-SAS-18**: NO default qLevel parameter. qLevel is a required positional parameter; documented in module header and AC-12.
- **R13-SAS-19**: NO SLICE 2 carry-forwards (`mean_delta` computation, PR-F5 storage profile, compiled-artifact JSON loader). Bundled into a SLICE 2 cleanup round (R14) per NEXT-ROLE.md.
- **R13-SAS-20**: `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md` UNCHANGED.
- **R13-SAS-21**: `coordination/specs/Q-R[01-12]-SPEC.md` UNCHANGED. Prior-round specs frozen.

---

## Open questions

**None — all resolved.**

R12 OQ-1 (per-shard vs fleet-level e-BH input architecture) resolved in § Mechanism primitive 3 as (β) per-shard, matching the Architect-pre-prediction in NEXT-ROLE.md.

R12 OQ-2 (`fleetMergeFamilyAMixture` variant deferral), OQ-3 (R13+ auto-selection hint propagation), OQ-4 (Reviewer-facing strict-equality assertion form — architect picked: keep strict-equality) are R12-scoped operator gate items, NOT R13 architectural ambiguities; preserved per NEXT-ROLE.md "Operator gate items (preserved for morning triage)".

Other open R13 architectural questions enumerated during brainstorm (audit sidecar § Open Questions) all resolved with documented rationale before spec emission: (i) algorithm choice — Ren-Barber 2024 Algorithm 1 (standard fixed-α e-BH); (ii) default qLevel — none (required parameter); (iii) input space — linear-space e-values; (iv) output shape — wrapped `{ selected, K }`; (v) tie-breaking — deterministic by index ASC; (vi) PR-F2 Family scope — Family A only at q13; (vii) MD-F2 fixed-time vs any-time — fixed-time at R13, any-time deferred.

---

## P3 ten-axis verification

| Axis | Verification |
|---|---|
| **Correctness** | e-BH algorithm matches Ren-Barber 2024 Algorithm 1 / Wang-Ramdas 2022 e-BH verbatim: sort DESC, step-down k from N to 1, R = max{k : k · e_(k) ≥ N/q}, select top-R indices. AC-5 + AC-6 closed-form worked examples + AC-7 + AC-8 ordering/tie-break fixtures provide hand-traceable correctness coverage. AC-10 + AC-11 empirically validate FDR control via Wang-Ramdas 2022 Theorem 4.1's theory-derived Wilson upper bound. |
| **Completeness** | All 14 ACs cover: shape (AC-1), input validation (AC-2, AC-3, AC-12), algorithm-correctness via closed-form (AC-4, AC-5, AC-6), output ordering (AC-7), tie-breaking (AC-8), input invariance (AC-9), FDR control empirically (AC-10, AC-11), and process disciplines (AC-13 TDD, AC-14 OBSERVED). No public surface field, branch, or output property is unbound (R06 reinforcement; 5th application). |
| **Consistency** | Cross-section consistency pass (28 rows above) verified resolved-decision tokens, file paths, parameter values, and AC counts across all sections. R05 narrative-vs-pseudocode AC-count cross-check explicit: Component inventory + Per-file pseudocode docstring + Acceptance criteria + P3 Coverage row all agree on 14 ACs. |
| **Clarity** | Algorithm prose in § Mechanism primitive 2 + pseudocode in Delta 1 are 1-to-1 isomorphic. Spec uses "Given X, when Y, then Z" form for all 14 ACs. No "correctly", "appropriately", "as needed" language used. Module-header docblock documents every architectural commitment verbatim (R10 file-level docblock coverage reinforcement; 3rd application). |
| **Coverage** | All 14 ACs (AC-1 .. AC-14) bound to test/q13-e-bh-fdr.test.ts assertions. AC-1 → shape; AC-2 → empty throws; AC-3 → invalid qLevel throws; AC-4 → K=0 below threshold; AC-5+AC-6 → closed-form R=3 examples; AC-7 → ASC ordering; AC-8 → tie-breaking; AC-9 → input invariance; AC-10 → iid FDR ≤ bound; AC-11 → correlated FDR ≤ bound; AC-12 → qLevel required; AC-13 → TDD ordering; AC-14 → OBSERVED attestation. |
| **Constraints** | (i) FDR target q ∈ (0, 1] enforced by AC-3 throws (0, negative, > 1 all rejected). (ii) Input length ≥ 1 enforced by AC-2 throws (empty rejected). (iii) Per-shard e-values assumed non-negative + finite (caller responsibility; not runtime-validated per § Mechanism primitive 8 rationale). (iv) FDR-control theorem requires marginal e-value validity per shard (E[e_i] ≤ 1 under H_0,i); the Family A betting-e-process construction satisfies this. (v) R13-SAS-1..21 fence the anti-scope surfaces. |
| **Concurrency** | `eBenjaminiHochberg` is a pure function (no module-level mutable state, no IO, no async). Safe for concurrent invocation from multiple call sites with disjoint input arrays. AC-9 binds non-mutation of the input array, so concurrent invocations with the SAME input array reference are also safe (no shared-state mutation). |
| **Corner cases** | (i) Empty input — AC-2 throws. (ii) Invalid q — AC-3 throws. (iii) qLevel = undefined — AC-12 throws via conjunctive guard. (iv) All e_i below threshold — AC-4 K=0, selected=[]. (v) All e_i tied — AC-8 first fixture. (vi) Partial ties — AC-8 second fixture. (vii) Non-contiguous high-e indices — AC-7. (viii) qLevel = 1 (degenerate but allowed) — guard `qLevel <= 1` permits; pseudocode handles: N_over_q = N/1 = N; for k=N: N · e_(N) ≥ N ⇔ e_(N) ≥ 1, common case selects all if min e ≥ 1. NOT bound by AC at R13 (corner case acknowledged in P3; future SLICE may add explicit AC if used). |
| **Cost** | PR-F2 simulator total work: 200 trials × 100 shards × 100 ticks × 2 scenarios = 4M wealth updates ≈ 4 s wall-clock at ~1 μs/update (M-series Darwin). Plus 200 × 2 = 400 e-BH invocations on N=100 inputs each (e-BH is O(N log N) due to sort: ≈ 700 ops per call × 400 = 280K ops ≈ 0.3 ms total). Plus 12 unit-test ACs (constant-time hand-fixture-size). Total q13 test runtime predicted: ≤ 6 s wall-clock; within Tessera-test budget. |
| **Coupling** | New module `engine/fleet/e-bh.ts` couples to: zero other modules (leaf). Test `test/q13-e-bh-fdr.test.ts` couples to: `engine/fleet/e-bh.ts` (new) + `engine/detectors/betting-e-process.ts` (inherited, unchanged at R13). No coupling to R11/R12 fleet-merge primitives in the critical path (Q-J1 parallel-not-serial; R13-SAS-14). |

---

## Grilling output

Per CLAUDE-ARCHITECT.md pre-emit grilling discipline + Superpowers Review-phase inlined gates. All checks pass at spec-emit; any "no" answer below would trigger spec revision before routing.

| Q | Question | Verdict |
|---|---|---|
| 1 | **Every claim in this spec is verifiable?** | YES. (a) REVIEWER-ANCHOR table: every cited line range extracted via `sed -n 'N,Mp' <path>` at spec-emit; verbatim snippets in the table. (b) External-source citations (Ren-Barber 2024, Wang-Ramdas 2022, Vovk-Wang 2021): Architect attests "limitation flagged: spec authoring offline; specific theorem numbers not re-verified at spec-emit; Reviewer invited to refine"; the architectural commitment does NOT depend on specific equation numbers. (c) Pseudocode is verbatim file contents; Implementer can copy exactly. (d) ACs use closed-form fixtures (AC-5, AC-6, AC-7, AC-8) with hand-computed expected outputs; Reviewer can hand-verify. (e) Empirical ACs (AC-10, AC-11) bind theory-derived Wilson upper bound; Reviewer can re-run and compare. |
| 2 | **Any unstated assumptions?** | NO unstated. Stated assumptions explicit: (i) per-shard e-values are non-negative + finite (caller responsibility; § Mechanism primitive 8); (ii) per-shard marginal e-value validity E[M_T] ≤ 1 under H_0 (Family A betting-e-process construction; theory cited via Howard-Ramdas-McAuliffe-Sekhon 2021); (iii) Wang-Ramdas 2022 Theorem 4.1 FDR ≤ q under arbitrary dependence between e-values (load-bearing); (iv) Wilson 3σ upper bound at N_TRIALS=200 is loose enough to accommodate per-shard betting-e-process empirical FDR (Architect pre-prediction: 0.01-0.06 << 0.0962). All four assumptions enumerated; (iii) is the load-bearing assumption tied to PR-F2 outcomes; if (iii) fails empirically, that's a HALT condition for Implementer per Implementer note 3(a). |
| 3 | **Scope added beyond request?** | NO. NEXT-ROLE.md "R13 SHIPS" list contains exactly: e-BH procedure + operator-facing API + default qLevel decision + PR-F2 evidence matrix + ACs. Spec ships all 5; no additional surfaces. Anti-scope (R13-SAS-1..21) explicitly fences 21 surfaces; none modified. R13-SAS-14 fences the Q-J1 parallel-not-serial constraint; R13-SAS-13 fences any-time FDR; R13-SAS-15/16/17/18 fence rejected brainstorm candidates. |
| 4 | **Architect grilling per NEXT-ROLE.md item 5: "would a future implementation FIX matching the architect's prediction FAIL the FDR-control tests?"** | NO; tests are right-reasons-safe. Architect pre-predicts: iid empirical FDR ≈ 0.01-0.05; correlated empirical FDR ≈ 0.01-0.06 (slightly higher than iid due to cross-shard correlation but still below the Wilson bound). FDR_BOUND = 0.09624 at q=0.05, N_TRIALS=200. A future implementation FIX producing FDR ≈ 0.03 (matching prediction or close) PASSES the assertion `fdr ≤ FDR_BOUND` because 0.03 ≤ 0.09624. A future BUG producing FDR ≈ 0.20 FAILS. The Wilson margin (0.04624) accommodates predicted variance comfortably; OBSERVED-binding-scope reinforcement (R07; 6th application) satisfied. |
| 5 | **Implementer can act without guessing?** | YES. Delta 1 + Delta 2 are verbatim file contents. Every constant, fixture, error message, type annotation, and import path is in the spec. AC-13 + AC-14 mandate the two-commit TDD + OBSERVED attestation per standing R02-R12 pattern. Implementer note 3 enumerates 3 HALT conditions (a/b/c) so the Implementer knows when to DIAGNOSTIC vs proceed tactically. Implementer note 6 explicitly directs file-level docblock copy. |
| 6 | **File-level docblock coverage check (R10 reinforcement)?** | YES. Delta 1 verbatim file contents include the file-level header at lines 1-47 documenting: module location, operator-facing API, algorithm definition + steps, FDR-control guarantee + reference to Wang-Ramdas 2022 Theorem 4.1, operator-facing claim, Q-J1 parallel-not-serial architectural position, MD-F2 fixed-time-vs-any-time tradeoff, qLevel-no-default rationale, Tessera-original notice. Header describes the file's full exported surface (`EBenjaminiHochbergOutput` interface + `eBenjaminiHochberg` function); both are declared verbatim in the same Delta. Implementer note 6 mandates verbatim header copy. |
| 7 | **Cross-section consistency pass (R01 reinforcement; 9th application)?** | YES; 28 checks PASS (see § Mechanism cross-section consistency table). Token consistency across resolved decisions (e.g., `Q_LEVEL` not `q_level` not `qlevel`); file path consistency (`engine/fleet/e-bh.ts` everywhere, never `e_bh.ts` or `eBH.ts`); AC-count consistency (14 in Component inventory + Per-file pseudocode docstring + Acceptance criteria + P3 Coverage row). |
| 8 | **Type-declaration-site discipline (R02 reinforcement; 8th application)?** | YES. (a) `BettingEProcessState.M` at `engine/types/families/a.ts:21` opened + `sed -n`-extracted; spec quotes the verbatim 9-line interface block. (b) `FamilyCBettingEProcessState.log_S_t` at `engine/types/families/c.ts:300` opened + extracted; spec quotes verbatim. (c) `updateBettingState` at `engine/detectors/betting-e-process.ts:150-156` opened + extracted; spec quotes verbatim signature. (d) `EBenjaminiHochbergOutput` declaration site: declared in `engine/fleet/e-bh.ts` (NEW); the type is created at R13 so no pre-existing declaration site to verify; spec Delta 1 IS the declaration site verbatim. |
| 9 | **Re-export-chain-check (R03 reinforcement; 5th application)?** | YES. (a) `BettingEProcessState` re-export chain via `engine/types/index.ts:22` verified by inspection (no R13 change). (b) `updateBettingState` + `freshBettingState` NOT re-exported via `engine/types/index.ts`; q13 imports them directly via `../engine/detectors/betting-e-process` leaf path (matches R11 q11 pattern at `test/q11-hierarchical-e-value-combination.test.ts:25-28`). (c) `eBenjaminiHochberg` + `EBenjaminiHochbergOutput`: leaf module, no re-export at R13 (R13-SAS-8). |
| 10 | **Grep-pattern-soundness (R03 reinforcement; 4th application)?** | YES; trivially satisfied. R13 has ZERO grep-pattern verification ACs. All AC evidence comes from test-body assertions or git-log structural inspection. |
| 11 | **Empirically-verified test counts (R03 reinforcement; 4th application)?** | YES; AC-14 explicitly directs OBSERVED reporting in NEXT-ROLE.md attestation block. Architect predicted count: 14 (architect counted 14 verbatim `test(...)` blocks in Delta 2). Implementer reports OBSERVED via `node --test test/q13-e-bh-fdr.test.js` at GREEN — NOT predicted. R03 MINOR-4 reinforcement; 8th consecutive application. |
| 12 | **Narrative-vs-pseudocode AC-count cross-check (R05 reinforcement; 7th application)?** | YES; 4-site cross-check at Component inventory + Per-file pseudocode Delta 2 docstring ("R13 AC-1 through AC-14") + Acceptance criteria section (AC-1 through AC-14 inclusive) + P3 Coverage row ("All 14 ACs (AC-1 .. AC-14)"). All four sites agree on 14. |
| 13 | **JSDoc-scope-grep coverage (R06 MINOR-1 reinforcement; 4th application)?** | YES; trivially satisfied. R13 creates NEW files (engine/fleet/e-bh.ts + test/q13-e-bh-fdr.test.ts); no existing JSDoc to update at non-contiguous sites. The verbatim spec Delta 1 includes JSDoc comments for the interface + function + module header — all colocated in the new file, single point of authorship. |
| 14 | **Public opts-field AC-coverage (R06 MINOR-3 reinforcement; 5th application)?** | YES; trivially satisfied. `eBenjaminiHochberg` has NO opts/options interface — only two positional parameters (perShardEValues + qLevel). Both bound by ACs (perShardEValues: AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9 bind shape + content; qLevel: AC-3, AC-12 bind validity + required-ness). |
| 15 | **Fixture-sizing exhaustive propagation (R07 reinforcement; 6th application; anchor PR #38)?** | YES. Both PR-F2 cells (AC-10 + AC-11) use IDENTICAL parameters: N_SHARDS=100, T_TICKS=100, N_TRIALS=200, Q_LEVEL=0.05; only the scenario flag differs. Wilson bound 0.09624 is shared. Architect ran the same fixture-sizing analysis for BOTH cells, not just one (i.e., applied the lesson from R07 MAJOR-1 exhaustively across all empirical-FDR ACs). Architect pre-prediction for both cells is well below the bound; no AC has self-confirming-class risk per Q4 above. |
| 16 | **OBSERVED-binding scope (R07 reinforcement; 6th application)?** | YES; AC-10 + AC-11 bind theory-derived Wilson upper bound `Q_LEVEL + 3·√(Q_LEVEL·(1−Q_LEVEL)/N_TRIALS) ≈ 0.09624`, NOT OBSERVED FDR. Wang-Ramdas 2022 Theorem 4.1 + Howard-Ramdas-McAuliffe-Sekhon 2021 are the theory anchors. No `assert.strictEqual(fdr, 0.025)`-style OBSERVED-binding anywhere. |
| 17 | **Inherited-testimony empirical verification (R08 reinforcement; 6th application; anchor PR #38)?** | YES; Architect ran `npm run typecheck` (exit 0), `node --test test/q11-*.test.js` (18/18 pass), `node --test test/q12-*.test.js` (16/16 pass) at HEAD `2a3c177` at spec-emit time. R11/R12 surfaces empirically valid; spec citations to R11/R12 module paths + line numbers grounded in current HEAD. |
| 18 | **Correction-propagation pass (R09 reinforcement; 4th application; anchor PR #38)?** | YES; trivially satisfied. R13 does NOT correct any prior-round spec premise. Architect re-reviewed R12 Reviewer report (4 OBS items) — none corrected at R13 (OBS-2 + OBS-3 + OBS-4 are R12 scope, deferred per anti-scope; OBS-1 is Family-C fixture caveat that R13 doesn't re-exercise since R13 PR-F2 uses Family A only per Mechanism primitive 9). No multi-section premise correction in this round. |
| 19 | **File-level docblock coverage (R10 MINOR-1 reinforcement; 3rd application)?** | YES; per Q6 above. Delta 1 file header documents full exported surface. |
| 20 | **Citation-accuracy via sed -n extraction (R11 OBS-1/-2 reinforcement; 2nd application)?** | YES. All REVIEWER-ANCHOR table line ranges (`:21`, `:300`, `:65`, `:72-82`, `:150-156`, `:63-70`, `:87-99`, `:102-110`, `:122-138`, `:63`, `:69-72`, `:107-118`, `:136-147`, `:30-44`, `:1-13`, `:851-907`, `:20-32`, `:35-50`, `:54-65`, `:91-107`, `:283-300`) extracted via `sed -n 'N,Mp' <path>` at spec-emit; verbatim snippets in the table. Architect ran `grep -n "^export " engine/fleet/combine.ts engine/fleet/detectors.ts` to enumerate R11/R12 exports for the table (R11: 6 exports at :40, :46, :63, :87, :102, :122; R12: 4 exports at :63, :69, :107, :136). |
| 21 | **Spec-level right-reasons audit pre-route (NEXT-ROLE.md item 5)?** | YES; per Q4 above. Both empirical-FDR ACs (AC-10 + AC-11) bind theory-derived Wilson upper bound; a future implementation FIX producing FDR within the bound (matching Architect prediction) PASSES; a future BUG producing FDR > bound FAILS. Not self-confirming. |
| 22 | **HALT conditions enumerated for Implementer?** | YES; Implementer note 3 enumerates 3 HALT triggers (a/b/c) with explicit DIAGNOSTIC + escalate guidance. (a) Empirical FDR exceeding Wilson bound on either cell; (b) inherited-surface signature drift from REVIEWER-ANCHOR; (c) test-count divergence. R08 procedural-halt-discipline reinforcement applied. |
| 23 | **R12 OQ-1 resolved with documented rationale?** | YES; § Mechanism primitive 3 documents the (β) per-shard pick + (α) fleet-level rejection rationale. Architect-pre-prediction in NEXT-ROLE.md matches selected (β). No brainstorm reason emerged to deviate; no HALT triggered. |
| 24 | **All 3+ algorithm candidates brainstormed with strengths/weaknesses/rejection?** | YES; audit sidecar § Brainstorm enumerates 4 candidates ((A) standard fixed-α e-BH selected; (B) randomized e-BH rejected; (C) BY-style correction rejected; (Z) conditional-gating-chain serial architecture rejected as scope expansion). Each with strengths/weaknesses/hidden-assumptions/risks. PR-F2 mandate item 2 satisfied. |
| 25 | **MD-F2 (any-time-vs-fixed-time) documented (PR-F2 mandate item 3)?** | YES; § Mechanism primitive 4 + § Anti-scope R13-SAS-13 + module header in Delta 1 all document the fixed-time choice and the any-time deferral. Explicit, NOT silent absorption. |
| 26 | **External-source verification (PR-F2 mandate item 1)?** | YES; Ren-Barber 2024 Algorithm 1 cited as the canonical R13 implementation target; Wang-Ramdas 2022 Theorem 4.1 cited as the load-bearing FDR-control-under-arbitrary-dependence theorem; Vovk-Wang 2021 cited for foundational e-value framework; Howard-Ramdas-McAuliffe-Sekhon 2021 cited for per-shard martingale property (anchoring marginal e-value validity). All four citations include Architect attestation: "limitation flagged — specific equation numbers NOT re-verified; Reviewer invited to refine pinpoints." |
| 27 | **Default qLevel decision with rejection rationale?** | YES; § Mechanism primitive 5 + audit sidecar § Brainstorm decision D2 documents the (γ) configurable-required pick + (α) q=0.05 rejection + (β) q=0.10 rejection. R13-SAS-18 fences default at API surface; AC-12 binds qLevel as required. |
| 28 | **Pre-emit grilling re-read as if Implementer receiving cold (Superpowers Review-phase)?** | YES. Architect re-read Delta 1 + Delta 2 from top + checked: every constant declared once with named identifier; every error message string verbatim; every import path correct + verified file existence + line-number sed-n extraction; every AC's pseudocode in q13 matches the AC's verbal description; every "future-implementation-FIX-fail" check applied per Q4. Re-read identified ZERO drift issues. Spec ready for routing. |

All 28 grilling questions pass. No revisions needed before routing.

---

## Routing

```
STATUS: READY
NEXT-ROLE: IMPLEMENTER
Inputs: coordination/specs/Q-R13-SPEC.md
       coordination/specs/Q-R13-SPEC-AUDIT.md (audit sidecar; Implementer should NOT read per CLAUDE-IMPLEMENTER.md cold-implementation boundary)
```

---

## Architect self-attestation

- [x] Read coordination/PRD.md (full).
- [x] Read coordination/NEXT-ROLE.md (full) — R13 scope, halt conditions, reinforcement application directive, PR-F2 mandate, R14 chore sequence.
- [x] Read CLAUDE-ARCHITECT.md + CLAUDE-COMMON.md (system prompt at session start).
- [x] Read ~/.claude/CROSS-PROJECT-MEMORIAL.md (Reinforcement rules derived sections via targeted offset reads; primary focus on tessera R02-R12 reinforcements).
- [x] Read coordination/MEMORIAL.md (targeted grep + tail reads through R12 entries; full blocked by file size).
- [x] Read coordination/reviews/REVIEWER-REPORT-R12.md (full) for R12 Reviewer findings + OBS-1/2/3/4 disposition.
- [x] Read coordination/specs/Q-R11-SPEC.md (head 200 lines for REVIEWER-ANCHOR + Mechanism reference patterns).
- [x] Opened + sed -n-extracted all REVIEWER-ANCHOR table line ranges at HEAD `2a3c177`.
- [x] Ran `npm run typecheck` (exit 0) + `node --test test/q11-*.test.js` (18/18) + `node --test test/q12-*.test.js` (16/16) at HEAD `2a3c177` for R08 inherited-testimony verification.
- [x] Applied Superpowers Brainstorm phase: 4 candidates documented in audit sidecar with strengths/weaknesses/rejection rationale.
- [x] Applied Superpowers Design phase: component-boundary sketch (1 new production file + 1 new test file; integration via inherited Family A) + integration-points enumeration + failure-mode identification (HALT conditions a/b/c).
- [x] Applied Superpowers Execute phase pre-conditions: verbatim pseudocode in Delta 1 + Delta 2; no design decisions deferred.
- [x] Applied Superpowers Review phase: re-read spec as if Implementer receiving cold; 28-gate grilling output above.
- [x] All 14 standing reinforcements (per NEXT-ROLE.md) applied + cross-referenced in § Mechanism cross-section consistency pass + § Grilling output.
- [x] Pre-emit grilling output written INLINE in spec (per CLAUDE-COMMON.md universal disciplines).
- [x] No implementation code written; no test files opened for editing.
- [x] All architecturally unresolved questions surfaced in § Open Questions — section confirms "None — all resolved" with documented R12 OQ-1 resolution + audit-sidecar reference for other resolved sub-questions.
