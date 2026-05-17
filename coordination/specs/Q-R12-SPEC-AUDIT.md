# Q-R12-SPEC-AUDIT — Architect audit sidecar for Tessera Phase 1 SLICE 3 second slice

_From: Architect._
_To: Reviewer (cold-read boundary preserved — Implementer does NOT read this file)._
_Date: 2026-05-17._
_HEAD at spec emit: `58d6090`._
_Companion: `coordination/specs/Q-R12-SPEC.md`._

---

## Brainstorm

### Tier-rubric verdict

**Tier:** full per A2 (new architectural pattern — first detector-family-specific fleet-merge entry points) + A4 (novel data model — `FleetMergeStepResult` shape + `CombinePrimitive` type alias as new architectural surface coupling family-specific state types to the fleet-merge layer). Per NEXT-ROLE.md: "`--tier full` per A2 + A4. No downshift justified." Audit-tier (skip Architect) rejected because R12 makes 3 architectural decisions (wrapper-shape, caller-selection mechanism, scope of Family-A-mixture variant deferral) that require cold-eye spec discipline. Solo-tier trivially rejected (not Z-class mechanical).

### Approaches considered (≥3 per Superpowers Brainstorm)

**Option A: Two family-specific wrappers + shared internal helper** (selected)

Structure:
- `fleetMergeFamilyA(per_shard_states: ReadonlyArray<BettingEProcessState>, primitive, fleet_state, log_threshold): FleetMergeStepResult`
- `fleetMergeFamilyC(per_shard_states: ReadonlyArray<FamilyCBettingEProcessState>, primitive, fleet_state, log_threshold): FleetMergeStepResult`
- Module-local `fleetMergeStep(log_e_values, primitive, fleet_state, log_threshold)` shared body
- Each wrapper handles its family's e-value extraction convention; both delegate to the shared helper for the primitive call + fleet-state update chain.

| Aspect | Assessment |
|---|---|
| Strengths | (1) Named family-specific entry points match the inherited engine pattern (`evaluateFamilyABettingShadow` at `engine/detectors/betting-e-process.ts:348`; `evaluateFamilyCBettingEProcess` at `engine/detectors/family-c-betting-e-process.ts:303`) — operators reading the codebase grep `fleetMerge` and find what they want. (2) Each entry point owns its family's e-value extraction convention — no caller-side guesswork about whether to apply `Math.log` to `state.M` vs `state.log_S_t`. (3) Type-safe at the call site — caller can't pass Family A states into the Family C wrapper. (4) Shared internal helper preserves R11's family-agnostic core architecture (single body for primitive-call + state-update chain). (5) Aligns with NEXT-ROLE.md language "fleet-merged Family A detector surface" + "fleet-merged Family C detector surface" — the spec asks for named family-specific entry points, not a generic shim. |
| Weaknesses | (1) Two exported functions instead of one (slightly more surface area). (2) Couples fleet code to specific inherited per-shard state types via type imports (adds two type-only imports from `engine/types/families/{a,c}`); mitigated by the imports being type-only (no runtime coupling). |
| Hidden assumptions | (a) Family A and Family C are the only fleet-mergeable per-shard state types we'll need at R12. (b) The shared internal helper pattern is idiomatic enough that future R13+ adders can extend it without confusion. |
| Risks | If a future family is added (e.g., `MixtureSupermartingaleState` for Family A Page-CUSUM), need to add a third wrapper — not a refactor, just an addition. Mitigated by documenting OQ-2. |

**Option B: Single generic wrapper with extractor function**

Structure:
- `fleetMergeStep<S>(per_shard_states: ReadonlyArray<S>, extractLogE: (s: S) => number, primitive, fleet_state, log_threshold): FleetMergeStepResult`
- Plus exported extractor helpers: `extractFamilyABetting(s: BettingEProcessState): number = Math.log(Math.max(s.M, WEALTH_FLOOR))`; `extractFamilyCBetting(s: FamilyCBettingEProcessState): number = s.log_S_t`

| Aspect | Assessment |
|---|---|
| Strengths | (1) Single body — minimal duplication. (2) Family-agnostic core; extensible to new state types via new extractors. (3) Type-safe via generic parameter. |
| Weaknesses | (1) Extractor-function pattern is uncommon in the inherited engine (the engine uses straight imperative `evaluateFamilyXXX` functions with concrete state types, not callback-based extractors). (2) Two-level abstraction (wrapper + extractor) where one would do — the extractor functions are ~10 LOC each, inlining them into family-specific wrappers is cleaner. (3) Callers have to know to pair extractors with state-array types correctly — `fleetMergeStep(family_a_states, extractFamilyCBetting, ...)` compiles (both extract `number`) but is wrong; family-specific wrappers prevent this class of bug structurally. |
| Hidden assumptions | (a) Operators are comfortable with callback-style APIs. (b) The extractor functions provide adequate documentation surface for the e-value-extraction convention. |
| Risks | The misuse case in (2.3) is a real footgun; type-system can't prevent it because both extractors return `number`. Catchable only at runtime via wrong behavior. |

**Option C: Generic over `ReadonlyArray<number>` only — no detector coupling**

Structure:
- `fleetMergeStep(log_e_values: ReadonlyArray<number>, primitive, fleet_state, log_threshold): FleetMergeStepResult` only.
- Caller does the extraction themselves: `fleetMergeStep(states.map(s => Math.log(s.M)), combineProduct, fleet_state, log_threshold)`.

| Aspect | Assessment |
|---|---|
| Strengths | (1) Minimal surface — just one function. (2) Truly family-agnostic; matches R11's "primitives are family-agnostic" architectural claim. (3) Zero coupling to inherited state types. |
| Weaknesses | (1) Every caller has to know the e-value-extraction convention for each family — inconsistency risk: one caller does `Math.log(s.M)` (no floor; wrong); another caller does `Math.log(Math.max(s.M, 1e-12))` (correct); a third caller does `Math.log(Math.max(s.M, 1e-10))` (also "correct" but inconsistent floor). (2) NEXT-ROLE.md language "fleet-merged Family A detector surface" implies named family-specific entry points; Option C ships a generic shim that doesn't visibly bind to any family. (3) Sticky-fire propagation at R13+ when an e-BH operator surface is added requires the e-BH layer to redo the family-specific extraction work — no architectural progress. |
| Hidden assumptions | (a) Operators get the extraction convention right at every call site. (b) Future R13+ work doesn't benefit from named family entry points. |
| Risks | (1.1) is a real risk and is the primary reason for rejection — wrappers that own the extraction convention are the canonical anti-footgun design. |

### Constraints from NEXT-ROLE.md / PRD that eliminate options

- **A12 anti-scope (inherited engine internals frozen)**: rules out modifying `engine/detectors/betting-e-process.ts` to add export of `WEALTH_FLOOR` — Option A and B both must redeclare. Option C doesn't even need the floor at the wrapper layer (caller responsibility) — but that's exactly the footgun.
- **Per-shard surface modification halt condition**: rules out reaching into `engine/per-shard/` for state. Per-shard wealth states are owned by the orchestrator's state bag (inherited engine convention at `engine/detectors/betting-e-process.ts:85`). All three options consume per-shard states as parameters, satisfying this constraint.
- **"Fleet-merged Family A detector surface" language in NEXT-ROLE.md item 1**: implies named family-specific entry points. Option A satisfies directly; Option C violates the spirit.
- **Caller-selection mechanism (option a default)**: all three options accept the primitive as a call-site argument. No constraint pressure here.

### Selection rationale

**Selected: Option A.** Tradeoffs:

- Vs Option B: Option A's two wrappers add 1 function-export to the surface area (3 vs 2), but eliminate the extractor-mismatch footgun (B's structural type-system gap). Reviewer + future Architects benefit from explicit family-named entry points. The shared internal helper preserves the "single body" benefit Option B chases.
- Vs Option C: Option A owns the extraction convention at the wrapper layer, preventing per-caller inconsistency. Option A's two type-only imports from `engine/types/families/{a,c}` are minimal coupling; Option C's "no coupling" sounds clean but pushes the convention onto every caller — a worse tradeoff.

### Fix-cycle re-evaluation

N/A — R12 is not a fix-cycle round (R11 closed clean: 0 CRITICAL / 0 MAJOR / 1 MINOR / 6 OBS; the MINOR is a variable-name nit, the OBS are citation-accuracy notes — all gated to operator triage, none re-routed to R12).

---

## Design

### Component boundaries sketch

```
                          ┌────────────────────────────┐
                          │ engine/fleet/detectors.ts  │  R12 (NEW)
                          │                            │
                          │   fleetMergeFamilyA  ──┐   │
                          │   fleetMergeFamilyC  ──┤   │
                          │                       │   │
                          │   (internal helper)   ▼   │
                          │   fleetMergeStep ────────┼─▶
                          └──┬─────────────────────┬───┘
                             │ extracts            │ calls primitive +
                             │ log-e via           │ updates fleet state
                             ▼                     ▼
       ┌─────────────────────────┐  ┌──────────────────────────────┐
       │ engine/types/families/  │  │ engine/fleet/combine.ts (R11)│
       │   a.ts: BettingEPState  │  │   combineProduct (PoE)       │
       │   c.ts: FCBettingEPState│  │   combineAverage (AoE)       │
       └─────────────────────────┘  │   updateFleetEProcessState   │
                                    └──────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────────┐
                                    │ engine/types/fleet.ts (R11)  │
                                    │   FleetEProcessState         │
                                    └──────────────────────────────┘
```

What exists:
- R11 `engine/fleet/combine.ts` — primitives + state-tracker functions.
- R11 `engine/types/fleet.ts` — state type.
- Inherited `engine/types/families/a.ts` + `engine/types/families/c.ts` — per-shard wealth state types.
- Inherited `engine/detectors/betting-e-process.ts` — `freshBettingState`, `updateBettingState` (consumed by q12 test only; NOT by R12 production code).

What gets created:
- `engine/fleet/detectors.ts` — two exported wrappers + shared internal helper + `FleetMergeStepResult` + `CombinePrimitive` + module-local `WEALTH_FLOOR`.
- `test/q12-fleet-merged-detector-surfaces.test.ts` — 16 ACs.

What changes:
- Nothing. R11 + inherited engine UNCHANGED.

What gets deleted:
- Nothing.

### Integration points

Six new edges; all verified against PRD requirements:

| Edge | New/Existing | Direction | Surface | PRD requirement |
|---|---|---|---|---|
| `engine/fleet/detectors.ts` → `engine/fleet/combine.ts` | NEW | runtime + type imports | `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`, `FleetMergeOutput`, `FleetEProcessState` | FR-E1 — fleet-merge primitives consumed at the detector layer |
| `engine/fleet/detectors.ts` → `engine/types/families/a.ts` | NEW | type-only | `BettingEProcessState` | FR-E1 — Family A per-shard wealth surface bridged |
| `engine/fleet/detectors.ts` → `engine/types/families/c.ts` | NEW | type-only | `FamilyCBettingEProcessState` | FR-E1 — Family C per-shard wealth surface bridged |
| `test/q12` → `engine/fleet/detectors.ts` | NEW | full | `fleetMergeFamilyA`, `fleetMergeFamilyC`, `FleetMergeStepResult`, `CombinePrimitive` | AC-P1 wiring half |
| `test/q12` → `engine/fleet/combine.ts` | NEW (transitive of an existing test pattern) | full | `combineProduct`, `combineAverage`, `freshFleetEProcessState`, `FleetEProcessState`, `FleetMergeOutput` | AC-P1 — re-uses R11 surfaces unchanged |
| `test/q12` → `engine/detectors/betting-e-process.ts` | EXISTING | full | `freshBettingState`, `updateBettingState` | AC-P1 — Family A wealth-process simulator (matches q11 pattern) |

### Failure modes at integration points

For each integration point, what breaks:

1. **`engine/fleet/detectors.ts` → `engine/fleet/combine.ts`**: R11 surfaces change → wrapper imports fail. Mitigation: R12-SAS-2 fences R11 modification; q12 ACs structural-identity-bound to direct primitive calls (would FAIL if combine.ts changes break the primitive semantics). Detection: q12 test failure at GREEN; Reviewer's binding-command execution.

2. **`engine/fleet/detectors.ts` → `engine/types/families/a.ts`**: BettingEProcessState type changes → R12 type-only import fails to typecheck. Mitigation: R12-SAS-3 + A12 anti-scope fences inherited Family A modification; `state.M` field is the FIRST field at `engine/types/families/a.ts:21`, structurally stable across the inherited engine's revision history. Detection: `npm run typecheck` failure.

3. **`engine/fleet/detectors.ts` → `engine/types/families/c.ts`**: Same as (2) for Family C. `state.log_S_t` is the FIRST field at `engine/types/families/c.ts:300`. Same mitigation + detection.

4. **`test/q12` → `engine/fleet/detectors.ts`**: Implementer writes the test file before the production file → typecheck FAILS at RED with TS2307 (expected per TDD ordering). Implementer adds production file → typecheck PASSES at GREEN. Detection: `npm run typecheck` at RED MUST exit 1; at GREEN MUST exit 0.

5. **`test/q12` → `engine/fleet/combine.ts`**: R11 changes break the primitives → q12 structural-identity ACs FAIL because the wrapper's internal `primitive(extracted-log-e)` call diverges from the test's direct `primitive(extracted-log-e)` call. (This would actually be a self-confirming failure mode — both sides use the same primitive, so a primitive bug would NOT be caught here; only a wrapper-vs-primitive divergence would be caught. The math validation is R11's responsibility per AC-P1 split.)

6. **`test/q12` → `engine/detectors/betting-e-process.ts`**: Inherited Family A wealth process changes break `updateBettingState`'s Ville bound → q12 AC-14/AC-15 empirical-wiring FPRs exceed Wilson bound. Detection: empirical AC failure; would also break R11 q11's PR-F1 evidence matrix at AC-13/15. Same upstream mitigation (A12 anti-scope; Phase-3.d.D close).

---

## Resolved-decision why-picked / why-rejected paragraphs

### D1 — Wrapper shape: two family-specific entry points (Option A) ✓; single generic (Option B) ✗; pure number-array shim (Option C) ✗

**Why picked Option A**: Named family-specific entry points match the inherited engine's `evaluateFamilyXXX` pattern (codebase ergonomic), own the e-value-extraction convention at the wrapper layer (anti-footgun for future callers), and structurally prevent the Family-A-state-in-Family-C-wrapper misuse at the type system.

**Why rejected Option B**: extractor-function pattern is uncommon in inherited engine; two-level abstraction is over-decomposition when the bodies are 5 lines each; type-system can't prevent extractor-state-array mismatch (both return `number`).

**Why rejected Option C**: caller-side extraction convention is a footgun (per-caller inconsistency risk); NEXT-ROLE.md language implies named family entry points; no architectural progress for R13+ e-BH layer.

### D2 — Caller-selection mechanism: option (a) caller chooses ✓; option (b) auto-selection ✗

**Why picked (a)**: zero new schema fields needed; zero new architectural surface beyond the wrappers; defers the choice to the layer (R13+ orchestrator) that actually has the operational signal. NEXT-ROLE.md autonomous-mode default.

**Why rejected (b) auto-selection**: requires either (i) a new `CompiledConfig.fleet_merge.auto_select_regime` field — anti-scope per R12-SAS-5 (no new `CompiledConfig` fields at R12); or (ii) a runtime correlation-detection layer — architectural-decision-class scope expansion (would require its own brainstorm, its own ACs, its own empirical validation; doubles or triples R12 scope). Brainstorm did NOT surface a strong reason for (b) at R12; per NEXT-ROLE.md, (a) is the default.

### D3 — Family-A mixture-supermartingale wrapper deferral (R12-SAS-15 + OQ-2)

**Why deferred**: NEXT-ROLE.md language "consume per-shard FamilyAPerCell (or its Phase-1-runtime analog; whatever holds the per-shard mixture-supermartingale e-process state at runtime)" leaves the choice between betting-variant and mixture-variant to the architect. R12 ships the betting-variant wrapper because R11 q11 already validates the betting-variant interface via PR-F1 at 4 cells × 200 trajectories. The mixture-variant wrapper would be mechanical (same body, different field name `M_t` vs `M`); adding it now expands test surface without architectural benefit. Deferred to a future round when an operator-facing consumer (e.g., R13+ e-BH layer needing both variants) surfaces.

**Risk**: if an operator consumer at R13 needs both variants, R13 adds the mixture wrapper as a 1-file addition; not a refactor. Low risk.

### D4 — Family C empirical-FPR test deferral (R12-SAS scope decision)

**Why deferred**: full Family C SR23 detector pipeline (`evaluateFamilyCBettingEProcess` at `engine/detectors/family-c-betting-e-process.ts:303`) requires a compile-time `CompiledConfig` with `betting_e_process_params` populated per cell — heavy unit-test infrastructure. The math validation of Vovk-Wang 2021 §4 is family-agnostic (R11 PR-F1 at Family A demonstrates the result for both families). R12's wiring claim is structural (extraction + delegation correctness); structural-identity ACs (AC-3, AC-10) + sticky-fire propagation AC (AC-12) + per-shard input invariance AC (AC-7) cover the wiring claim without empirical FPR validation.

**Risk**: if a future Family C wiring bug introduces silent behavior divergence between the wrapper and direct primitive call, structural-identity ACs would catch it; if the bug introduced an FPR regression at Family C only (not at Family A), it would NOT be caught by R12 ACs. R12 accepts this risk — the bug would have to be Family-C-state-extraction-specific, which is a narrow class given the extraction is literally `state.log_S_t` (one field read). Detection would fall to R13+ when Family C empirical evidence becomes available via the e-BH layer's integration.

### D5 — Empirical-wiring parameters: N=50, T=50, N_traj=100, iid only

**Why these values**: NEXT-ROLE.md item 6 specifies "N=10..100 synthetic shards"; mid-range pick (50) is sufficient to demonstrate wiring correctness without R11-PR-F1-grade test runtime budget (~8s wall-clock at R11; ~0.5s expected at R12 — appropriate for a wiring-only validation). T=50 ticks is half of R11 because wiring bugs manifest in the first few ticks (the extraction + delegation chain is invoked per tick; T=50 is N_FLEET_TRAJ × T = 5000 total wrapper invocations per cell, plenty of coverage). N_FLEET_TRAJ=100 gives Wilson bound ≈ 0.0399 — wider than R11's ≈ 0.0311 (which used 200 trajectories), accommodating the smaller sample.

**Why iid only (no correlated cells)**: the correlated-drift / MD-F1 demonstration is R11's responsibility (R11 q11 AC-14 + AC-16). R12's wiring claim is established by the iid cells: if the wrapper correctly extracts + combines + tracks under iid (where Ville holds), the wrapper is wired correctly. The math-under-correlated-drift claim is independent of wiring correctness — they're orthogonal validation surfaces; we don't need to re-test R11's responsibility at R12.

---

## Architect pre-predictions on outcomes

(Per anchor convention: documented for Reviewer to compare against OBSERVED at GREEN.)

1. **q12 test count**: 16 pass / 0 fail.
2. **AC-14 observed FPR (PoE-iid via fleetMergeFamilyA)**: median prediction 0.000–0.020; ≤ Wilson bound 0.0399 with high confidence (R11 q11 AC-13 observed 0.000–0.015 at similar parameters with 2× more trajectories; R12 light empirical should not differ meaningfully).
3. **AC-15 observed FPR (AoE-iid via fleetMergeFamilyA)**: median prediction 0.000–0.010 (AoE is conservative; fleet wealth averages over 50 shards at T=50 ticks — limited accumulation; expected ≤ 1%).
4. **q12 wall-clock runtime**: ≤ 1s total (500k wealth updates at ~1 μs each ≈ 0.5s; unit-test ACs add negligible time).
5. **Implementer halt conditions encountered**: 0 (the spec pseudocode is verbatim file contents; no architectural ambiguity).
6. **Reviewer findings**: 0 CRITICAL / 0 MAJOR / ≤ 2 MINOR / ≤ 5 OBS. Architect-predicted MINOR candidates: (a) the `simulateFleetTrajectoryFamilyA` helper placement-after-tests (q11 places similar helpers before; q12 places after — stylistic divergence; flag-worthy as MINOR if Reviewer prefers the q11 convention; OQ-4 already documents this); (b) OQ-4 strict-equality assertion form may surface as OBS if Reviewer prefers FP-tolerant. Architect-predicted OBS candidates: deferred surfaces (OQ-1 to OQ-4 each could surface as OBS).
7. **TDD ordering**: RED commit at SHA X (q12 test only; TS2307 on detectors.ts); GREEN commit at SHA Y (detectors.ts atomically). 11th consecutive Tessera Reviewer-side TDD verification (R02-R12 unbroken; per R10 + R11 standing-discipline confirmation).

---

## Inherited-testimony empirical verification (R08 reinforcement; 4th consecutive application)

Architect re-ran the load-bearing prior-round empirical claim at R12 spec-emit time per R08 reinforcement.

**Claim**: R11 q11 tests pass 18/0 at HEAD `58d6090` (which IS the post-R11 close head per NEXT-ROLE.md; latest commit `58d6090 chore(R12): start overnight log + prepare NEXT-ROLE.md for SLICE 3 second slice`).

**Command run** (logged at spec-emit time):
```
$ npm run pretest 2>&1 | tail -5
> @johnpatrickwarren-oss/tessera@0.1.0-pre pretest
> tsc -p tsconfig.test.json

$ node --test test/q11-hierarchical-e-value-combination.test.js 2>&1 | tail -10
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 425.26925
```

**Observation**: 18 pass / 0 fail; total runtime 425 ms; PR-F1 cells AC-13/14/15/16 each ~90 ms (within R11's ~8s wall-clock budget; faster than R11 architect's prediction because the PR-F1 cells were optimized).

**Architect attests**: R11's PR-F1 evidence is preserved at HEAD. R12 spec citation of R11 evidence (§ Spec preamble + § Existing architectural surface row 11 + § Mechanism primitive 4) is empirically grounded, NOT inherited-testimony-only.

This is the 4th consecutive application of the R08 reinforcement (introduced at R08; applied at R09 + R10 + R11 + R12).

---

## Pre-route discipline application

### Reinforcement-rule audit (16 ARCH lines)

Verbatim copy of § Grilling output Standing-reinforcement audit table from `Q-R12-SPEC.md`; reproduced here so Reviewer can verify the audit was performed AT spec-emit (not retrofitted).

[See `Q-R12-SPEC.md` § Grilling output for the full 16-row table. All 16 rows PASS at spec-emit time. Notable applications:]
- R11 OBS-1/-2 citation-accuracy reinforcement (1st post-reinforcement application): R12 spec extracts every cited line range via `sed -n` at spec-emit. Correction-propagation applied: R11 OBS-1 cited `M_t` at `engine/detectors/family-a-mixture-supermartingale.ts:43`; actual declaration is at line 47. R12 spec uses :47 verbatim (verified via `sed -n '40,62p'`).
- R10 file-level docblock coverage (3rd application; new file at R12): `engine/fleet/detectors.ts` declares file-level docblock matching its exported surface per Delta 1 verbatim text.
- R09 correction-propagation: R12 corrects R11 OBS-1 line number; propagation verified across both citation sites (§ REVIEWER-ANCHOR row 6 + § Architect self-attest bullet 4).

### Cross-section consistency pass (R01 reinforcement; 8th consecutive application)

26 rows; all PASS at spec-emit time. See `Q-R12-SPEC.md` § Mechanism for the full table. Notable additions vs R11's 20-row table:
- Row 22: file-level docblock coverage (carried forward from R10; verified for the new detectors.ts file).
- Row 23: citation-accuracy via `sed -n` extraction (R11 OBS-1/-2 reinforcement; new at R12).
- Row 24: correction-propagation for R11 OBS-1 M_t line number (43 → 47).
- Row 25: inherited-testimony empirical verification (R11 q11 re-run at HEAD; logged here).
- Row 26: component-inventory AC-range cross-check (R06 reinforcement; 5th consecutive application).

### Grilling output (5 questions; all PASS)

Reproduced verbatim in `Q-R12-SPEC.md` § Grilling output. All 5 grilling questions answered inline; all 6 NEXT-ROLE.md halt conditions PASS.

---

## Amendments from prior version

N/A — this is the v0.1 spec for R12 (initial emit; no prior version exists).

---

## Architect's self-grading

For Reviewer's calibration of future R12+ Architect outputs:

- **Spec depth**: prescribes WHAT (function signatures, type declarations) + WHY (cross-section consistency rationale, anti-scope fences) at appropriate depth. Per-file pseudocode contains verbatim file contents (no Implementer judgment required on body algorithms). Implementer notes flag stylistic preferences (extraction loop form; test-file naming) without making them load-bearing.
- **Anti-scope coverage**: 18 fences (one fewer than R11's 20; reduction reflects R12's narrower architectural footprint — wrappers around existing primitives vs R11's new primitive layer). Mappable to R11-SAS fence semantics with 1:1 correspondence on the inherited / per-shard / config / index.ts / pre-round-tests categories.
- **Risk acknowledgement**: D4 (Family C empirical-FPR deferral) is the highest-risk decision; explicitly documented with mitigation + detection plan. D3 (Family-A mixture wrapper deferral) is the second-highest; documented in OQ-2.
- **Citation accuracy**: every line range in the REVIEWER-ANCHOR table extracted via `sed -n` at spec-emit (R11 OBS-1/-2 reinforcement applied trivially because the discipline was top-of-mind). Cross-check: R11 OBS-1's wrong M_t line corrected here.
- **OQ minimality**: 4 open questions (down from R11's 5); all OQs are deferrals or Reviewer-facing observations, not architectural-decision-class ambiguities.

Architect-predicted Reviewer rating (per R10 + R11 baseline): clean MERGE-READY at 0 CRITICAL / 0 MAJOR / ≤ 2 MINOR / ≤ 5 OBS.
