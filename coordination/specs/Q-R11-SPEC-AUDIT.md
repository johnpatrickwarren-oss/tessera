# Q-R11-SPEC-AUDIT — Tessera Phase 1 SLICE 3 architect audit sidecar

_Companion to `Q-R11-SPEC.md`. Implementer DOES NOT consult this file (preserves cold-read independence per `CLAUDE-IMPLEMENTER.md` boundary). Reviewer MAY consult this file per `CLAUDE-REVIEWER.md` (allowed input)._

_From: Architect (R11 pipeline run; full tier per A1 + A2 + A4 + A7)._
_Date: 2026-05-17._
_HEAD at spec emit: `56e77f1`._

---

## 1. Brainstorm full rationale (≥3 approaches enumerated, with rejection rationale)

### Q1: Which fleet-merge combination primitive(s) ship at R11?

Four candidates enumerated per Vovk-Wang 2021 §4 (combination of e-values) + Wang-Ramdas 2024:

#### (a) Product-of-e-values (PoE) only — REJECTED as sole primitive

- **Strengths**: Power-optimal under conditional independence; matches the most natural Vovk-Wang 2021 §4 result (∏ e_i is an e-value under cond. indep.); minimal code surface (single primitive).
- **Weaknesses**: Ville bound at fleet level NOT guaranteed under correlated drift; explicit MD-F1 capture point — silent absorption is a HALT condition per NEXT-ROLE.md.
- **Hidden assumption**: per-shard e-processes are conditionally independent given F_{t-1}. Violated under shared fleet-level events (firmware push, model redeploy).
- **Risks**: PR-F1 evidence matrix correlated-drift cell would show fleet FPR > α_fleet, demonstrating exactly the violation that the spec must enumerate.
- **Rejection rationale**: Sole-primitive ship without the compensating control IS the MD-F1 silent-absorption HALT condition. Architecturally inadmissible at R11 per NEXT-ROLE.md halt conditions list.

#### (b) Average-of-e-values (AoE) only — REJECTED as sole primitive

- **Strengths**: Ville bound at fleet level preserved under ARBITRARY DEPENDENCE (Vovk-Wang 2021 §4 convex-combination result); no conditional-independence assumption needed; matches the natural input to e-BH FDR operator surface at R12 (Wang-Ramdas-Vovk 2022 e-BH preprocessing).
- **Weaknesses**: Lower power than PoE under independence; rejecting PoE entirely loses the power-optimal regime for the cluster operator running an iid-believing surface (e.g., a curated baseline-pre-pass period where the operator has explicit confidence no fleet event is concurrent).
- **Hidden assumption**: none on the Ville-preservation side; the operator may still want the operator-facing option to use PoE when they have iid confidence (the architectural commitment "operator picks" matches the SCOPING-MEMO-v0.3 § 2.1 honest-broker stance).
- **Risks**: Removing PoE from the operator's surface forces a one-size-fits-all conservative bound, which may produce excess Type II error in benign clusters.
- **Rejection rationale**: Sole-primitive ship without PoE locks operators out of the power-optimal regime when their cluster regime supports it. Operator-pick is the load-bearing API commitment.

#### (c) Weighted-mixture (non-uniform weights) — REJECTED at R11

- **Strengths**: Generalizes both PoE (weights = ones vector) and AoE (weights = uniform vector) into a single primitive; future-proofs for topology-weighted aggregation at Phase 2 (Extension 3 — give rack-localized weights to weighted-mixture for topology-aware common-mode).
- **Weaknesses**: No operator-facing requirement at SLICE 3 (Phase 2 Extension 3 is the natural consumer; that's far downstream); premature abstraction at R11 violates the system-instruction guideline "Don't add features, refactor, or introduce abstractions beyond what the task requires"; weighted-mixture's Ville guarantee is the same as AoE under arbitrary dependence IFF weights ∈ Δ_N (probability simplex), which adds a runtime validation surface.
- **Hidden assumption**: weights are constant across ticks (otherwise the e-value property is more subtle); R11 has no operator surface to vary weights.
- **Risks**: Premature-abstraction class; adds API surface that no consumer needs at R11; complicates AC count and grilling.
- **Rejection rationale**: Premature abstraction. R12 e-BH consumer uses uniform-AoE (Wang-Ramdas-Vovk 2022) which is a special case of AoE. Phase 2 topology-weighted aggregation is the natural future consumer for weighted-mixture; introduce it then. R11-SAS-19 fences.

#### (d) BOTH `combineProduct` AND `combineAverage` — PICKED

- **Strengths**: Operator picks per regime confidence; covers both the cond.-indep. power-optimal case AND the arbitrary-dependence robust case explicitly; matches Vovk-Wang 2021 §4 (combination of e-values) literally — both architecturally distinct results (product under cond. indep.; convex-combination under arbitrary dependence) live in §4 and are realized by the pair of primitives; MD-F1 cond.-indep. assumption + compensating control are both EMPIRICALLY demonstrable in the PR-F1 evidence matrix.
- **Weaknesses**: Two primitives instead of one; doubles the AC count for primitive-surface tests. Acceptable: AC-1-AC-7 + AC-12 already enumerate the closed-form math; small AC inflation.
- **Hidden assumption**: caller can decide which regime applies (iid vs correlated drift) — the operator-pick surface assumes the caller has SOME visibility into cluster-state correlation. At R12+ when the e-BH consumer lands, it will pick `combineAverage` by default (the conservative regime). R11 ships the primitive pair; operator selection is a future-round consumer concern.
- **Risks**: None unique to (d) beyond (a) + (b) combined.
- **Selection rationale**: This is the ONLY architecturally admissible option at R11 per the NEXT-ROLE.md halt-condition list (silent absorption of cond.-indep. assumption is HALT; sole-primitive ship without compensating control IS that silent absorption). The pair-ship explicitly enumerates the load-bearing assumption AND the compensating control, satisfying MD-F1.

### Q2: Should fleet-merge be stateless (per-tick reduce) or stateful (cross-tick accumulator)?

Three candidates:

#### (a) Stateless per-tick reduce — PICKED

- **Strengths**: Pure function; trivial to test; no state-mutation contract to specify; family-agnostic at the input boundary; minimal API surface.
- **Weaknesses**: The caller must thread state across ticks separately (a fleet wealth tracker). Mitigated by R11 also shipping `FleetEProcessState` as the ergonomic tracker.
- **Selection rationale**: The per-shard wealth processes already accumulate across time individually; fleet-merge at each tick is a cross-sectional reduction. Statelessness matches the math (the per-tick fleet e-value is itself an e-value at that tick; the across-time sequence forms a fleet e-process whose Ville bound applies to the running max).

#### (b) Stateful accumulator (e.g., `FleetMergeAccumulator`) — REJECTED

- **Strengths**: Single entry point for the caller (no separate tracker needed).
- **Weaknesses**: Conflates two concerns (per-tick combination + cross-tick wealth tracking) into one API surface; the cross-tick wealth tracker IS state-mutating (matches inherited engine convention) but the per-tick combination is mathematically a pure reduce; mixing them obscures the math.
- **Rejection rationale**: Separation of concerns. Stateless primitives compose with the small stateful tracker more cleanly than a combined accumulator API.

#### (c) Two-function pair: stateless reduce + small ergonomic tracker — equivalent to PICKED

This is the version (a) ships with: `combineProduct` / `combineAverage` (stateless) PLUS `FleetEProcessState` / `freshFleetEProcessState` / `updateFleetEProcessState` (stateful tracker). The pair is what's actually shipped; (c) is just a re-labeling of (a).

### Q3: Module location for the new fleet-layer surface?

Four candidates:

#### (a) `engine/fleet/combine.ts` + `engine/types/fleet.ts` — PICKED

- **Strengths**: Parallel to inherited `engine/detectors/` and Tessera-original `engine/per-shard/` namespaces; opens the `engine/fleet/` directory for future SLICE 4 + Phase 2 fleet-layer work (e-BH FDR at R12 lands at `engine/fleet/e-bh.ts`; future outer aggregator at Phase 2 lands at `engine/fleet/aggregator.ts`); state type co-located with other family state types at `engine/types/`.
- **Selection rationale**: The natural architectural home for the fleet-layer surface. Future R12+ consumers find e-BH at the expected path.

#### (b) `engine/per-shard/fleet-merge.ts` — REJECTED

- **Strengths**: Co-locates with the per-shard module.
- **Weaknesses**: Misnomer — fleet-merge is the layer ABOVE per-shard; co-locating in `engine/per-shard/` mis-categorizes the architectural layer.
- **Rejection rationale**: Architecturally incorrect categorization.

#### (c) `engine/detectors/fleet-merge.ts` — REJECTED

- **Strengths**: Co-locates with the detector files.
- **Weaknesses**: Detectors are inherited / vendored; fleet-merge is Tessera-original; mixing locations violates the vendoring policy at SCOPING-MEMO-v0.3 § 9 (vendored vs Tessera-original separation).
- **Rejection rationale**: Vendoring-policy violation.

#### (d) Single file `engine/fleet/combine.ts` with state type INSIDE — REJECTED

- **Strengths**: Fewer files.
- **Weaknesses**: Type-only consumers (e.g., a future API contract definition) would pull the runtime code unnecessarily; doesn't match the inherited convention at `engine/types/families/*.ts` (state types in types/, runtime in detectors/).
- **Rejection rationale**: Inherited-convention misalignment. Inherited state types live in `engine/types/families/*.ts`; runtime in `engine/detectors/*.ts`. R11 mirrors at the fleet layer: state in `engine/types/fleet.ts`; runtime in `engine/fleet/combine.ts`.

### Q4: PR-F1 evidence matrix scenario design — what "correlated drift" means

Three candidates:

#### (a) Shared zero-mean factor `~ N(0, ρ²)` at each tick across all shards — PICKED

- **Strengths**: Mathematically clean; marginal per-shard distribution remains `N(0, 1)` (H₀ preserved per shard); cross-shard correlation at same tick = `ρ²`; matches the "shared deployment event" surrogate (a single event affects all shards simultaneously with a zero-mean noise increment); easy to parameterize via single scalar `ρ²`.
- **Weaknesses**: The "operational filtration" subtlety (per-shard observer cannot decompose `x_i,t = shared_z_t + noise_i,t` — the unobserved `shared_z_t` is what correlates the e-values). This subtlety documented in spec § Grilling output Assumption D.
- **Selection rationale**: Cleanest H₀ scenario that demonstrates the cond.-indep. violation under PoE. Marginal H₀ preserved → per-shard Ville bound preserved; cross-shard correlation present → fleet-level PoE Ville bound violated.

#### (b) Shared mean-shift `μ_t ~ Bernoulli(p)` (event arrives randomly) — REJECTED

- **Strengths**: More realistic "deployment event" model.
- **Weaknesses**: Marginal H₀ no longer preserved at the event ticks (becomes H₁ during the event); conflates "H₀ under correlated drift" with "H_1 under event" — measuring fleet FPR is no longer well-defined.
- **Rejection rationale**: Conflates H₀ correlated drift with H_1 event. The PR-F1 mandate is correlated-drift H₀ (marginal mean still 0); this candidate doesn't satisfy.

#### (c) AR(1) shared factor `μ_t = ρ · μ_{t-1} + ε_t` — REJECTED

- **Strengths**: Realistic "drift" model.
- **Weaknesses**: Time-correlation adds to the spatial correlation; conflates two correlation dimensions; ρ choice affects both; analytically harder to reason about.
- **Rejection rationale**: Over-engineering for SLICE 3. Spatial correlation alone is sufficient to demonstrate cond.-indep. violation under PoE. (c) is a candidate future-round PR-F1.b scenario if the architecture stabilizes.

### Q5: AC-14 PoE-correlated-drift cell binding form

Three candidates per OQ-5 in the spec:

#### (a) REPORTING-only (always-passing `assert.ok(Number.isFinite(fpr))` + `console.log`) — PICKED

- **Strengths**: Does not OBSERVED-bind (preserves R07 reinforcement); preserves the load-bearing demonstration of MD-F1 via the console.log line; structurally non-self-confirming (no FIX matching architect's prediction could FAIL this test — there's no bound at all); future-proof (if the observed FPR distribution shifts due to PRNG variance, the test does not flake).
- **Weaknesses**: Reviewer might flag as "too weak" — the AC doesn't actually assert the violation; just reports it.
- **Selection rationale**: Architecturally correct per R07 OBSERVED-binding-scope reinforcement. The pair-review evidence IS the console.log line (PR-F1 evidence matrix is captured for the operator pair-review; not load-bearing on the test runner's pass/fail).

#### (b) Bind to `fpr > FPR_BOUND` (asserts the violation exists) — REJECTED (would require theory-derived lower bound on PoE-correlated FPR)

- **Weaknesses**: Architect would need to derive a theory-based lower bound on PoE-correlated FPR (nontrivial; depends on ρ² and N and the specific bet strategy GRAPA/ONS); inflates spec scope.
- **Rejection rationale**: Out of R11 scope; the theory is not load-bearing for the operator-facing claim.

#### (c) Bind to qualitative ordering (PoE-corr > AoE-corr) — REJECTED (brittle)

- **Weaknesses**: Both are PRNG-driven measurements; ordering could flip on rare PRNG seeds; cross-test dependency; flaky.
- **Rejection rationale**: Flake-prone; cross-test brittle.

### Q6: TDD ordering — single-commit vs two-commit

Two candidates:

#### (a) Two-commit (RED q11-only → GREEN combine.ts + fleet.ts) — PICKED

- **Strengths**: Matches R02-R10 standing Tessera convention (7 consecutive Reviewer-side TDD verifications); RED state is reproducible (q11 fails TS2307 at HEAD `56e77f1`); GREEN state is atomic (both new files land together).
- **Selection rationale**: Inherited Tessera discipline; preserved at 8th consecutive application.

#### (b) Single-commit (all files together) — REJECTED

- **Weaknesses**: Breaks the inherited Tessera TDD convention; loses the RED-state evidence of test-fails-against-pre-implementation; Reviewer-side independent TDD verification cannot run.
- **Rejection rationale**: Inherited-convention violation.

### Q7: Should R11 modify `engine/types/index.ts` to re-export `FleetEProcessState`?

#### (a) NO at R11; YES at R12+ when first orchestrator consumer lands — PICKED

- **Strengths**: Minimal-change R11 surface; matches the R02 pattern where `PerShardResidual` was re-exported at the SLICE that introduced an orchestrator consumer; future R12 ergonomic.
- **Selection rationale**: Reduce R11 surface; defer re-export to consumer-pull time.

#### (b) YES at R11 — REJECTED

- **Weaknesses**: Re-exports a symbol with no orchestrator-facing consumer at R11; adds unnecessary surface; R11-SAS-4 fences this.
- **Rejection rationale**: Premature.

---

## 2. Decision rationale (resolved decisions; why-picked / why-rejected detail)

| # | Decision | Picked | Rejected alternatives | Detail |
|---|---|---|---|---|
| D1 | Two primitives ship (PoE + AoE) | (d) PICKED | (a) PoE-only HALT; (b) AoE-only loses power; (c) weighted-mixture premature | See Brainstorm Q1 |
| D2 | Stateless reduce + small stateful tracker | (a) PICKED | (b) combined accumulator conflates concerns | See Brainstorm Q2 |
| D3 | Module location `engine/fleet/` + `engine/types/fleet.ts` | (a) PICKED | (b)/(c) layer mis-categorization; (d) inherited-convention misalignment | See Brainstorm Q3 |
| D4 | Correlated-drift = shared zero-mean factor `~ N(0, ρ²=0.5)` | (a) PICKED | (b) Bernoulli mean-shift conflates H₀/H_1; (c) AR(1) adds time-dimension confusion | See Brainstorm Q4 |
| D5 | AC-14 PoE-correlated = REPORTING-only | (a) PICKED | (b) lower-bound derivation out of scope; (c) qualitative-ordering brittle | See Brainstorm Q5 |
| D6 | Two-commit TDD ordering | (a) PICKED | (b) inherited-convention violation | See Brainstorm Q6 |
| D7 | No `engine/types/index.ts` re-export at R11 | (a) PICKED | (b) premature | See Brainstorm Q7 |
| D8 | α_fleet = 0.01 for empirical test (production default = 10⁻³ unchanged) | PICKED | α_fleet = 10⁻³ in test (requires N_traj = 3000+ for Wilson-CI; too expensive) | Decouples test α from production α; Wilson-CI feasibility |
| D9 | N_FLEET_TRAJ = 200 per cell | PICKED | 100 (Wilson-CI too loose); 1000 (test runtime ~40s — over budget) | Balance |
| D10 | ρ² = 0.5 for correlated-drift | PICKED | ρ² = 0.25 (too weak — wouldn't visibly violate PoE); ρ² = 0.9 (over-strong — masks per-shard noise) | Moderate; matches "typical deployment-event partial-correlation" surrogate |
| D11 | Family-agnostic claim demonstrated via AC-12 (Family A + synthetic Family C state) | PICKED | Full Family C SR23 detector pipeline in q11 (requires compiled config; out-of-scope cost) | Minimum viable demonstration |
| D12 | `FleetEProcessState` mutation in-place (matches inherited engine) | PICKED | Pure function (matches Tessera per-shard convention) | Architecturally: this IS a wealth process; the per-shard layer is a sample accumulator (R03/R04/R05 pure-function discipline scoped to accumulators, not wealth processes) |
| D13 | Re-export `FleetEProcessState` from `engine/fleet/combine.ts` for caller ergonomic | PICKED | Type-only available from `engine/types/fleet` only | q11 + future R12 consumer pull both runtime + type from single path; minor ergonomic |

---

## 3. Pre-route discipline application detail

### Skill 14 (PRD-conjunction cross-check) — applied at R11 spec authoring

NEXT-ROLE.md R11 scope statement enumerates 5 conjuncts:
1. Hierarchical e-value combination at fleet scale.
2. Fleet-merged Family A surface.
3. Fleet-merged Family C surface.
4. Iid bootstrap regression test extended to N=100 shards.
5. PR-F1 pair-review evidence matrix.

Spec coverage per conjunct:
1. ✓ Mechanism primitives 1-5 + AC-1-12; `combineProduct` + `combineAverage` + `FleetEProcessState` tracker.
2. ✓ AC-13 + AC-14 (PR-F1 cells driven by Family A `updateBettingState`) + AC-12 (Family A state shape `M`).
3. ✓ AC-12 (Family C state shape `log_S_t`) + AC-15 + AC-16 (the family-agnostic primitive consumes Family C log-e identically; the PR-F1 cells run on Family A but the primitive interface is family-agnostic per § Mechanism primitive 1 + cross-section consistency pass row 13).
4. ✓ AC-13 + AC-15 (iid H₀ scenario at N=100).
5. ✓ AC-13 + AC-14 + AC-15 + AC-16 (4-cell evidence matrix).

No conjunct narrowed; no conjunct widened. Skill 14 cross-check **PASS**.

### Skill 15 (prescription-to-AC-coverage) — applied at R11 spec authoring

R11 spec prescriptions enumerated:
- **P1**: combineProduct existence + signature + algorithm.
- **P2**: combineAverage existence + signature + algorithm (numerically-stable logSumExp).
- **P3**: empty-input throw for both primitives.
- **P4**: N=1 identity for both primitives.
- **P5**: FleetEProcessState shape (5 fields).
- **P6**: freshFleetEProcessState initial values.
- **P7**: updateFleetEProcessState advances n + log_fleet_e_t + log_fleet_e_max.
- **P8**: Sticky-fire latch.
- **P9**: In-place mutation contract.
- **P10**: Family-agnostic interface acceptance (Family A + Family C state shapes).
- **P11**: PoE-iid PR-F1 cell theory-derived bound.
- **P12**: PoE-correlated PR-F1 cell REPORTING-only.
- **P13**: AoE-iid PR-F1 cell theory-derived bound.
- **P14**: AoE-correlated PR-F1 cell theory-derived bound.
- **P15**: TDD ordering (two-commit).
- **P16**: OBSERVED test count attestation.

Each prescription has a corresponding AC:
- P1 → AC-1; P2 → AC-2 (+ AC-5/6/7 algorithm detail); P3 → AC-1+2 (throws clause); P4 → AC-3; P5 → AC-8; P6 → AC-8; P7 → AC-9; P8 → AC-10; P9 → AC-11; P10 → AC-12; P11 → AC-13; P12 → AC-14; P13 → AC-15; P14 → AC-16; P15 → AC-17; P16 → AC-18.

Coverage: 16 prescriptions × 18 ACs (some prescriptions span multiple ACs; some ACs span multiple prescriptions). All prescriptions covered. Skill 15 **PASS**.

### Standing-reinforcement audit table (13 ARCH lines, R01-R10 compounding)

Already enumerated in spec § Grilling output. All 14 rows (1-14) applied. Reinforcements 7 (R05 MEMORIAL tactical-choice verification) is Implementer-side and trivially-by-absence (no R11 architectural tactical choice that requires MEMORIAL verification by architect).

### Spec self-check: any unstated assumptions surfaced + resolved?

Per the grilling output § Adversarial self-review Q2, 4 assumptions surfaced. All documented (A/B/C inherited and standard; D documented as the load-bearing filtration nuance with explicit audit-sidecar location).

---

## 4. Architect pre-predictions

| # | Prediction | Confidence | Verification surface |
|---|---|---|---|
| 1 | All 18 q11 ACs PASS at GREEN; 18 / 0 pass/fail count | HIGH | Implementer + Reviewer at R11 close |
| 2 | OBSERVED FPRs: PoE-iid ≤ 0.031 (Wilson); AoE-iid ≤ 0.031; AoE-correlated ≤ 0.031 | HIGH (theory-derived) | Reviewer independent re-run |
| 3 | OBSERVED PoE-correlated FPR in range [0.05, 0.30]; median pre-prediction 0.10-0.15 at ρ²=0.5 | MEDIUM (architect-derived informational) | Reviewer console.log inspection |
| 4 | q11 test runtime ≤ 15s wall-clock | MEDIUM | Implementer measurement at GREEN |
| 5 | All 11 pre-R11 q-file counts unchanged | HIGH (anti-scope fences prevent any production-code change to those files) | Reviewer independent re-run |
| 6 | 0 CRITICAL + 0 MAJOR Reviewer findings | MEDIUM (8th consecutive prediction; 7 prior rounds confirmed) | Reviewer report at R11 close |
| 7 | TDD two-commit ordering preserved (RED q11-only → GREEN combine.ts + fleet.ts) | HIGH | Reviewer git log + git show --stat (8th consecutive Tessera Reviewer-side TDD verification) |
| 8 | Reviewer surfaces ≤ 2 MINORs total (matching R10 baseline cleanness) | MEDIUM | Reviewer report |
| 9 | architect-spec contribution will land cleanly without IMPLEMENTER HALT (zero spec-architectural-ambiguity issues for the Implementer to surface) | HIGH | Implementer attestation + NEXT-ROLE.md ESCALATE absence at R11 close |
| 10 | Cross-section consistency pass (20 rows) Reviewer-verified all PASS | HIGH | Reviewer independent re-run of each row |
| 11 | OQ-5 (AC-14 REPORTING form) accepted by Reviewer without disposition request | MEDIUM | Reviewer report |
| 12 | At least one Reviewer OBS-level finding on the spec's choice of α_fleet=0.01 for the test (vs the production default 10⁻³); architect's defense per Mechanism primitive 11 + AC-13 inline rationale | MEDIUM (architect surfaces this proactively as an audit-trail item) | Reviewer report |

If any prediction misses, Architect logs at R11 close in MEMORIAL audit-trail and updates audit-sidecar at next round.

---

## 5. Reviewer-facing context

Audit-sidecar items NOT in the spec proper (Reviewer optional reading):

- **Brainstorm trace**: § 1 above enumerates the candidate-set per resolved decision. Reviewer can verify the architect did NOT silently absorb the cond.-indep. assumption (Q1 (a) explicitly enumerated and rejected as HALT-class).
- **Decision rationale**: § 2 above provides per-decision why-picked + why-rejected paragraphs.
- **Skill 14 + Skill 15 application detail**: § 3 above documents the per-conjunct + per-prescription coverage cross-checks.
- **Architect pre-predictions**: § 4 above lists 12 verifiable predictions for the Reviewer to evaluate at R11 close.

The spec proper (Q-R11-SPEC.md) is the load-bearing Implementer-facing artifact; this sidecar is the audit-trail and Reviewer-facing context. Reviewer may consult either or both per `CLAUDE-REVIEWER.md` cold-read boundary.

---

_Audit sidecar emit complete. Companion to `coordination/specs/Q-R11-SPEC.md`._
