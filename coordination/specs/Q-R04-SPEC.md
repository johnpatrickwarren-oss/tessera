# Q-R04-SPEC — Phase 1 SLICE 2b2: Welford online statistics module (pure function) + R03 carry-forward closures (v0.1)

_From: Architect (R04 pipeline run; per-role CLAUDE.md split active per `c8f8ba7`)._
_To: Implementer._
_Date: 2026-05-16._
_Foundation: PRD.md AC-P2 → SCOPING-MEMO-v0.3.md § 3 Phase 1 SLICE 2 row + § 2.2 Extension 2; R03 spec `coordination/specs/Q-R03-SPEC.md`; R03 Reviewer report `coordination/reviews/REVIEWER-REPORT-R03.md` (0 CRITICAL + 0 MAJOR + 5 MINOR + 5 OBS); R03 Memorial accretion `coordination/MEMORIAL.md:249-349`; current code state at HEAD `2160b7e`._
_Audit sidecar: `coordination/specs/Q-R04-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, sequencing context)._
_Tier: **full** (A2 + A4 + A7 fire — see audit sidecar; rubric verdict recorded)._

---

## Spec

R04 narrows SCOPING-MEMO § 3's "Phase 1 SLICE 2 — Warm-start cold-start mechanism" residual-statistics layer to **SLICE 2b2 — Welford online statistics module (pure function), standalone, no integration with `observeSample`**. R04 ships a Tessera-original module `engine/per-shard/welford.ts` implementing Welford's online algorithm for mean + covariance accumulation over a sequence of multivariate samples. The module exposes `WelfordState` (a local interface, intentionally NOT integrated with `PerShardResidual` at R04 — see § Mechanism primitive 4), `initialWelfordState(d)`, `updateWelford(state, sample)`, `welfordMean(state)`, and `welfordCovariance(state)`. R04 also bundles three R03 Reviewer-flagged carry-forward closures co-located with `test/q03-warm-start-runtime.test.ts`: a strict-tier reset test (closes R03 OBS-2 and completes the load-bearing coverage for R03 MINOR-1), an immutability sanity test (closes R03 MINOR-5), and an in-place clarifying comment on the existing AC-9 vacuous assertions (R03 MINOR-1 disposition record).

R04 explicit anti-scope (deferred to R05+): integration of Welford into `observeSample`; the accumulator-strategy decision for `n_samples < STRICT_UPGRADE_THRESHOLD` (three options per R03 sidecar — `_accumulator?` schema field vs. overload-`mean_delta` vs. caller-state); `mean_delta` computation (requires fleet-aggregate baseline injection — separate architectural concern); R02 MINOR-2 sparse-encoding inverse-convention enforcement (still load-bearing-pending; R05 architect picks discriminated-union vs. runtime-invariant assertion); compiled-artifact JSON loader; PR-F5 empirical storage-profile measurement; any modification to inherited vendored engine internals or `engine/types/config.ts`. The architectural-layer split is the same successful pattern R02 → R03 used: compile-time schema (R02) → state-machine runtime (R03) → algorithm-as-pure-function (R04) → integration + accumulator-strategy + sparse-encoding-enforcement (R05) → compiled-artifact + empirical-storage (R06+). Each sub-slice is tight, mechanical, TDD-verifiable, and right-sized for a single Implementer session.

The slice closes when (per § Acceptance criteria): (a) `engine/per-shard/welford.ts` exists and exports `WelfordState`, `initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance` per § Mechanism Delta 1; (b) `test/q04-welford-stats.test.ts` exists with eleven test cases binding the algorithm per Delta 2; (c) `test/q03-warm-start-runtime.test.ts` updated to add the strict-tier reset test + immutability sanity test + in-place AC-9 clarifying comment per Delta 3; (d) Tessera-side `tsc` clean compile via `tsconfig.test.json`; (e) all binding commands pass (typecheck + R01 + R02 + R03 test files + the new q04 test + betting-e-process smoke).

Traces to PRD AC-P2 ("warm-start `cell_confidence` enables alerts within 20 per-shard samples; strict-upgrade at 60 samples preserves inherited single-instance behavior") at the algorithm layer (alert emission is orchestrator scope per R02-SAS-5 → R03-SAS-2 → R04-SAS-6 carry-forward chain; "single-instance behavior preserved" requires accumulating from sample 1 onward, which is exactly what Welford supplies — but the WHERE-DOES-THE-ACCUMULATOR-LIVE question is R05 scope). Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row ("Warm-start cold-start mechanism"), § 2.2 Extension 2 (sparse per-shard residual; hierarchical baseline with fleet-aggregate + per-shard delta), and SCOPING-MEMO § 4.1 R-S2 (`min_samples_strict` re-derivation: the Welford accumulator is the substrate that an R05+ integration will use to populate `mean_vector`/`covariance` when n_samples ≥ STRICT_UPGRADE_THRESHOLD).

Traces to R03 Reviewer-flagged MINOR-1 (AC-9 fixture insufficiency: vacuous mean_vector/covariance clearing assertions under warm-start sparse encoding), MINOR-5 (immutability of `current` not bound by any test), and OBS-2 (no test bind for reset-from-`'strict'`) — all three addressed by R04 Delta 3. R03 MINOR-2 (grep-pattern soundness) and MINOR-3 (CellKey re-export claim) are architect-discipline reinforcements consumed during R04 spec authoring (see § Grilling output); they have no test or production code surface to repair at R04. R03 MINOR-4 (AC-14 test-count arithmetic) is consumed as a discipline-correction in R04 AC-16 wording (no per-file counts pre-stated; observed at commit time). R03 OBS-1/3/4/5 have no R04 surface to repair (orthogonal concerns — JSDoc accuracy, `void _missing` defensive coding, spec-inaccuracy-vs-design-ambiguity threshold).

---

## Architectural mechanism

### Four architectural primitives at play

1. **Welford's online algorithm for mean + covariance — pure function, no state coupling.** Per the standard formulation (Welford 1962; Knuth TAOCP Vol 2; West 1979 for multivariate generalization): the (mean, M2) accumulator updates per-sample via mean ← mean + (x − mean) / n; M2 ← M2 + (x − mean_old) ⊗ (x − mean_new), where ⊗ is the outer product for the multivariate covariance numerator. Sample covariance emits as M2 / (n − 1) for n ≥ 2; population covariance would use M2 / n. R04 picks **sample covariance (n − 1 divisor)** — the standard frequentist hypothesis-testing convention and the form that matches the inherited DeploySignal detectors' covariance use (per R-S1 conditional-independence framing in SCOPING-MEMO § 4.1; Family C's MMD per-cell covariance via `engine/detectors/family-c-rff.ts` consumes covariance under this convention). Welford's numerical-stability advantage over naive two-pass (sum-of-squares − square-of-sum) is load-bearing when sample magnitudes are large relative to inter-sample variance — the regime PRD AC-P2 operates in (fleet-scale shard residuals where absolute magnitudes may shift but inter-sample variance stays moderate). The choice of Welford over alternatives (naive two-pass; parallel pairwise; Kahan-summed naive) is documented in audit sidecar § D1.

2. **Pure-function form: state in, state out, no mutation.** Mirrors R03's `observeSample` design. The module exposes pure functions on a small immutable record type. This makes TDD trivial (every input → deterministic output) and removes any concern about shared-reference semantics when the Welford accumulator is integrated at R05+. Pure-function form also enables straightforward parallel-Welford merge (Chan-Golub-LeVeque combination formula) when fleet-pooling lands at Phase 1 SLICE 3 — explicitly NOT bundled here per R04-SAS-13.

3. **Local `WelfordState` interface — intentionally NOT integrated with `PerShardResidual`.** The WelfordState type is a module-local record: `{ n: number; mean: number[]; m2: number[][]; }`. It is NOT a field on PerShardResidual at R04. The integration decision (a) extend PerShardResidual with `_accumulator?: WelfordState` field (breaking change to R02 schema); (b) overload `mean_delta` as the running-sum carrier at non-strict tiers (violates R02 sparse encoding convention); or (c) maintain the accumulator in caller state (spreads state to orchestrator) is the R05 architect's call. R04 ships the algorithm as a building block that R05 will compose. This split mirrors R03's "state machine without statistics" → R04's "statistics without state-machine integration" → R05's "integration + accumulator-strategy decision" cross-round handoff. The factories at R03 (`test/_substrate/factories.ts`) shipped with zero immediate engine consumers under the same justification — substrate landing now amortizes downstream work; the precedent applies cleanly to Welford.

4. **R03 carry-forward closures co-located with `test/q03-warm-start-runtime.test.ts`.** Three closures land alongside the R04 production work:
   - **R03 OBS-2 closure**: new strict-tier reset test where the input fixture populates `mean_vector` + `covariance` per strict sparse encoding (R02 convention: strict tier carries these fields; warm-start tier does not). The clearing assertions are GENUINELY load-bearing in this fixture — a spread-based reset regression would propagate the populated fields and the assertions would catch it. This is the load-bearing complement to R03 AC-9 (whose mean_vector/covariance assertions are vacuous under the warm-start fixture per R02 sparse encoding constraint).
   - **R03 MINOR-1 disposition record**: an in-place clarifying comment on the existing AC-9 test documents why its `mean_vector === undefined` / `covariance === undefined` assertions are defensive-but-vacuous (warm-start fixture cannot populate those fields per R02 sparse encoding), and points to R04 AC-12 as the load-bearing strict-tier complement. No assertion changes — the existing assertions are correct, just non-discriminating; removal would unnecessarily weaken the test signature.
   - **R03 MINOR-5 closure**: an immutability sanity test captures `JSON.stringify(current)` pre-call and asserts equality post-call. Targets the normal-increment branch of `observeSample` (the example mutation cited in MINOR-5: `current.n_samples++; return current;`). One test suffices — the seed-reset branch constructs a new object literal explicitly (no `...current` spread), so the obvious in-place-mutation regression isn't surface-applicable there.

### Per-component deltas (operate on one new production file + one new test file + one changed test file)

- **Delta 1 — `engine/per-shard/welford.ts` (CREATED).** Pure-function module implementing Welford. Exports:
  - `interface WelfordState { n: number; mean: number[]; m2: number[][]; }` — running accumulator state.
  - `function initialWelfordState(d: number): WelfordState` — initializer; returns `{ n: 0, mean: <d zeros>, m2: <d×d zeros> }`. Throws if `d < 1` (one-dim is the minimum).
  - `function updateWelford(state: WelfordState, sample: number[]): WelfordState` — pure-function update; returns a NEW state. Throws if `sample.length !== state.mean.length` (dimension mismatch).
  - `function welfordMean(state: WelfordState): number[]` — returns `state.mean` verbatim (defensive: returns a shallow copy to prevent caller mutation of internal state).
  - `function welfordCovariance(state: WelfordState): number[][] | null` — returns sample covariance `M2 / (n − 1)` for n ≥ 2; returns `null` for n < 2 (covariance undefined with one or zero samples).
  - JSDoc block on each function explicitly documenting: (i) the Welford recurrence (mean and M2 update equations); (ii) sample-covariance convention (n − 1 divisor); (iii) dimension-mismatch failure mode; (iv) immutability guarantee; (v) R05-deferred integration scope.

- **Delta 2 — `test/q04-welford-stats.test.ts` (CREATED).** Eleven test cases binding the algorithm. Each test maps to one AC-1 through AC-11. RED-first per § AC-14 TDD ordering.

- **Delta 3 — `test/q03-warm-start-runtime.test.ts` (CHANGED).** Three sub-deltas, all additive (no existing test modified):
  - 3a: Add new test `R04 AC-12 — seed_hash mismatch resets residual from strict tier; clears mean_vector + covariance (closes R03 OBS-2)`.
  - 3b: Add new test `R04 AC-13 — observeSample does not mutate current (closes R03 MINOR-5)`.
  - 3c: Add a clarifying multi-line comment ABOVE the existing AC-9 test documenting why its mean_vector + covariance assertions are defensive-but-vacuous and pointing to AC-12. No assertion changes; no test removals.

### Carry-forward dispositions from R03 (architectural-level only; this spec text is the disposition record)

- **R03 MINOR-1 disposition — AC-9 vacuous-assertion clarification.** Delta 3c lands the in-place comment. The existing assertions stay (correct-but-vacuous; removal would weaken the test signature without architectural benefit). Load-bearing coverage of mean_vector/covariance clearing moves to AC-12 (strict-tier fixture). MINOR-1 is "closed" by complementary load-bearing binding + documentation of the vacuous-by-design constraint, not by fixture modification (which would have violated R02 sparse encoding by populating warm-start mean_vector/covariance against the convention).

- **R03 MINOR-2 disposition — grep-pattern-soundness reinforcement consumed during R04 spec authoring.** Cross-project reinforcement applied: any AC that prescribes a `grep` evidence command must exclude comment lines. R04 spec contains NO grep-evidence ACs (the test-based ACs use direct test execution; no anti-cast or anti-directive grep commands). The reinforcement was consulted during AC drafting; AC-19 (originally drafted as a `grep -n "as any" test/q04-welford-stats.test.ts` regression guard) was dropped per the reinforcement — the factory-based test-writing discipline from R03 self-enforces; trust the discipline rather than re-litigating with a grep that has the same comment-matching pitfall.

- **R03 MINOR-3 disposition — re-export-chain-check reinforcement consumed during R04 spec authoring.** Cross-project reinforcement applied: when spec describes how a module makes a type available, verify both shape at declaration AND re-export at public surface. R04 spec's § Integration points section documents the `engine/per-shard/welford.ts` ↔ inherited code surface explicitly: the module imports ZERO types from inherited engine code (it operates on raw `number[]` and `number[][]` primitives only). No re-export chain to verify; the reinforcement applies trivially-by-absence at R04.

- **R03 MINOR-4 disposition — empirically-verified per-file test counts.** Cross-project reinforcement applied: do not pre-state per-file test counts in ACs unless empirically observed. R04 AC-16 ("all R01 + R02 + R03 tests still pass") states no per-file counts and no per-file totals; the Implementer's attestation reports OBSERVED output, not predicted output. The baseline at HEAD `2160b7e` (per R03 Reviewer-verified at HEAD `e698c20`, no code changes since): q01-vendoring-coverage = 3 tests; q01-no-at-pin-deltas = 1 test; q01-schema-additions = 5 tests; q02-schema-extension = 6 tests; q03-warm-start-runtime = 11 tests; betting-e-process-class-dispatch = 5 tests. Total 31 at pre-R04 HEAD. Post-R04 expected: q03 grows by 2 (new tests AC-12 + AC-13) → 13; q04-welford-stats new at 11 → 11; smoke unchanged → 5; q01/q02 unchanged → 1+3+5+6 = 15. Predicted post-R04 total: 31 + 2 + 11 = 44. Predicted, not pre-stated in any AC — Implementer reports observed.

- **R03 OBS-1 disposition — `newConfidence` literal-union annotation.** Cosmetic; spec § Open questions OQ-1 at R03 already documented the design choice. No R04 action.

- **R03 OBS-2 disposition — strict-tier reset test.** Delta 3a lands the load-bearing strict-tier reset test. Closes OBS-2 mechanically.

- **R03 OBS-3 disposition — JSDoc reference to `§ P3.1` in warm-start.ts.** Cosmetic; would require modifying R03-shipped production code (warm-start.ts) which is outside R04's natural touch surface. Deferred to whatever R05+ round next touches warm-start.ts. No R04 action.

- **R03 OBS-4 disposition — `void _missing` defensive pattern.** Cosmetic; would require modifying q02 test file which has no R04 surface. No R04 action.

- **R03 OBS-5 disposition — spec-inaccuracy-vs-design-ambiguity threshold.** Operator/architect-policy question, not an R04 spec surface. R04 spec maintains the R03-established convention (Implementer adapts mechanical fixes inline with commit-message disclosure; HALTs on design ambiguity). No R04 action.

### Integration points

- **`engine/per-shard/welford.ts` ↔ inherited engine code.** ZERO inherited imports. The module operates on raw `number[]` and `number[][]` JavaScript primitives only. Verifiable by `grep -n "^import" engine/per-shard/welford.ts` → expect 0 matches (no imports at all). This deliberate decoupling: (i) keeps the module pure-algorithm with no schema coupling; (ii) defers all integration decisions to R05; (iii) eliminates the R02 OBS-3 / R03 MINOR-3 class of integration-point spec error (no integration claims to verify; nothing to mis-predict).

- **`engine/per-shard/welford.ts` ↔ `engine/per-shard/warm-start.ts`.** No imports either direction. The two modules are sibling pure-function modules under `engine/per-shard/`. R05+ integration will introduce a third module that composes them (or modifies one to call into the other) — architectural decision at R05.

- **`test/q04-welford-stats.test.ts` ↔ `engine/per-shard/welford.ts`.** Eleven tests bind eleven ACs; each test imports the relevant identifiers (`WelfordState`, `initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance`). No imports from production engine code beyond the Welford module. No imports from `test/_substrate/factories.ts` — Welford operates on raw arrays, not on schema types.

- **`test/q03-warm-start-runtime.test.ts` ↔ unchanged imports.** Delta 3 adds tests using the existing `observeSample` + `initialPerShardResidual` + `makePerShardResidual` imports; no new imports needed.

### Failure modes (each handled by an AC or anti-scope clause)

- **F-1: Numerical-stability regression vs. naive two-pass.** The natural risk of any Welford reimplementation. Handled by AC-6 (Welford error on shifted data — samples around 1e8 with O(1) noise — must be strictly smaller than naive two-pass error on the same fixture). Without this binding, a buggy Welford (e.g., forgetting to use `mean_old` before updating to `mean_new` in the M2 update) could ship and pass mean-only tests.
- **F-2: Divisor convention error (sample vs. population).** Handled by AC-8 (covariance for n=10 known fixture equals M2 / 9, not M2 / 10). The numerical difference is small but the convention is load-bearing for hypothesis-testing use downstream.
- **F-3: Undefined covariance for n < 2 silently emitted as zeros.** Handled by AC-7 (welfordCovariance returns `null` — not zeros, not undefined, not `[[0]]` — for n < 2). The `null` discriminator forces callers to handle the "insufficient samples" case explicitly.
- **F-4: Dimension-mismatch returning silent NaN/garbage.** Handled by AC-10 (throws on `sample.length !== state.mean.length`). Better to fail loudly than propagate NaN through downstream consumers.
- **F-5: Input state mutation under update.** Handled by AC-11 (input state's `mean` + `m2` arrays unchanged after `updateWelford` returns). Without immutability, sharing a state across concurrent updates would corrupt it.
- **F-6: First-sample edge case.** Handled by AC-2 (n=0 → n=1: mean = sample, m2 = zerosMatrix). The Welford recurrence is well-defined at n=1 only if `mean_old` is initialized to zero and the update formula `mean ← mean + (x − mean) / n` is applied; the M2 update at n=1 contributes `(x − 0)(x − x) = 0` for all components, hence m2 stays at zeros — correct.
- **F-7: Strict-tier reset regression in observeSample (spread-based reset would not clear populated mean_vector/covariance).** Handled by R04 AC-12 (closes R03 OBS-2 + provides load-bearing coverage of MINOR-1's intent).
- **F-8: observeSample mutates input residual.** Handled by R04 AC-13 (closes R03 MINOR-5).

### Anti-scope (this round; full enumeration in § Anti-scope below)

R04 does NOT ship: integration of `welford.ts` into `observeSample` (R05 scope); the accumulator-strategy decision (R03 sidecar's options a/b/c — R05 architect picks); `mean_delta` computation (requires baseline injection; R05+ scope); R02 MINOR-2 sparse-encoding inverse-convention enforcement (R05 architect picks discriminated-union vs. runtime-invariant assertion); `mergeWelfordStates` / parallel-Welford / Chan-Golub-LeVeque combination (Phase 1 SLICE 3 fleet-pooling scope); compiled-artifact JSON loader (R06+ scope); PR-F5 storage measurement (R06+ scope); any modification to inherited vendored engine internals (A12 carry-forward); any modification to `engine/types/config.ts` (schema settled per R03-SAS-9 → R04-SAS-1); any modification to `engine/per-shard/warm-start.ts` (state machine settled at R03 per R04-SAS-2); any modification to `tsconfig.json` / `tsconfig.test.json` / `package.json` (carry-forward); any modification to `test/q01-*.test.ts` or `test/q02-*.test.ts` (no R04 surface); any modification to `test/_substrate/factories.ts` (R03-shipped factories sufficient for R04 needs; Welford uses no schema types so no factory extension required); any modification to PRD.md (operator-owned).

---

## Component inventory

| State | Path | Note |
|---|---|---|
| Exists (unchanged) | `engine/detectors/**/*.ts` (12 files) | Vendored at-pin; A12 preserved |
| Exists (unchanged) | `engine/types/families/**/*.ts` (5 files) | Vendored at-pin |
| Exists (unchanged) | `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/verdict-groups.ts` | Vendored at-pin |
| Exists (unchanged) | `engine/types/{verdict,primitives,metrics,orchestration,policy,audit,self-normalized-fallback,index,agent}.ts` (9 files) | Vendored at-pin |
| Exists (unchanged) | `engine/types/config.ts` | R01/R02 schema deltas already shipped; R04 does NOT modify (zero imports from Welford module) |
| Exists (unchanged) | `engine/l0/schema-continuity.ts`, `engine/o0/{lifecycle-events,reversibility-source,reversibility-translator}.ts` | Vendored at-pin |
| Exists (unchanged) | `engine/per-shard/warm-start.ts` | R03-shipped; R04 does NOT modify (R04-SAS-2) |
| Exists (unchanged) | `tools/vendor-from-deploysignal.sh` | R02 OQ-1 still deferred |
| Exists (unchanged) | `package.json`, `tsconfig.json`, `tsconfig.test.json` | R02-SAS-6 carry-forward chain |
| Exists (unchanged) | `test/_substrate/factories.ts` | R03-shipped; R04 does NOT modify (R04-SAS-18) |
| Exists (unchanged) | `test/q01-vendoring-coverage.test.{ts,js}`, `test/q01-no-at-pin-deltas.test.{ts,js}`, `test/q01-schema-additions.test.{ts,js}`, `test/q02-schema-extension.test.{ts,js}`, `test/betting-e-process-class-dispatch.test.{ts,js}` | Pass post-R03 at `2160b7e` |
| Exists (unchanged) | `coordination/VENDORING-MANIFEST.md` | R04 ships only Tessera-original files; manifest convention is "files vendored from DeploySignal." R04 adds no rows and removes no rows |
| Changed | `test/q03-warm-start-runtime.test.ts` | Delta 3a (new AC-12 strict-tier reset) + Delta 3b (new AC-13 immutability) + Delta 3c (in-place AC-9 clarifying comment) |
| Created | `engine/per-shard/welford.ts` | Delta 1: Welford pure-function module |
| Created | `test/q04-welford-stats.test.ts` | Delta 2: 11 AC tests |

**Directory creation:** `engine/per-shard/` already exists (created at R03 for `warm-start.ts`; verified by `git ls-files engine/per-shard` → `engine/per-shard/warm-start.ts` at HEAD `2160b7e`). R04 adds a sibling file `engine/per-shard/welford.ts` — no new directories needed. `test/_substrate/` exists similarly; not touched by R04.

**Manifest cross-check:** 1 file modified (q03-warm-start-runtime.test.ts; `.js` companion regenerates via `pretest` hook) + 2 files created (welford.ts + q04-welford-stats.test.ts; `.js` companions also auto-generate for the test) = 3 surfaces of change. No files touched outside this inventory. No deletions. No vendored-file modifications.

---

## Per-file pseudocode

### File: `engine/per-shard/welford.ts` (created — Delta 1)

```typescript
// engine/per-shard/welford.ts — Tessera SLICE 2b2: Welford online statistics.
//
// Pure-function implementation of Welford's online algorithm for mean +
// covariance accumulation over a sequence of d-dimensional samples. Returns
// a NEW state per update; never mutates input.
//
// Algorithm (per Welford 1962; multivariate generalization per West 1979):
//   For each new sample x at step n:
//     mean_new ← mean_old + (x − mean_old) / n
//     M2_new   ← M2_old   + (x − mean_old) ⊗ (x − mean_new)
//   where ⊗ is the outer product on d-vectors yielding a d×d matrix.
//   Sample covariance emits as M2 / (n − 1) for n ≥ 2; undefined for n < 2.
//
// Numerical-stability advantage over naive two-pass (sum-of-squares minus
// square-of-sum): Welford avoids catastrophic cancellation when sample
// magnitudes are large relative to inter-sample variance — the regime PRD
// AC-P2 operates in (fleet-scale shard residuals where absolute magnitudes
// may shift but inter-sample variance stays moderate).
//
// R04 ships the algorithm as a standalone building block. Integration with
// observeSample (engine/per-shard/warm-start.ts) is R05 scope and requires
// resolving the accumulator-strategy decision documented in
// Q-R03-SPEC-AUDIT.md § Q-R03 → Q-R04 sequencing context.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the
// shared npm package at Tessera Phase 2 close alongside the vendored engine
// subset.

/** Running accumulator for Welford's online mean + covariance algorithm.
 *  Module-local — intentionally NOT a field on PerShardResidual at R04.
 *  Integration with PerShardResidual + accumulator-strategy choice (per
 *  Q-R03-SPEC-AUDIT.md § Q-R03 → Q-R04 sequencing context) is R05 scope. */
export interface WelfordState {
  /** Number of samples observed so far (n ≥ 0). */
  n: number;
  /** Running mean vector; length d. */
  mean: number[];
  /** Running M2 matrix (sum of (x_i − mean)(x_i − mean)^T); shape d × d.
   *  Sample covariance is M2 / (n − 1) for n ≥ 2. */
  m2: number[][];
}

/** Initialize a Welford accumulator for d-dimensional samples.
 *  Returns { n: 0, mean: <d zeros>, m2: <d × d zeros> }. Throws if d < 1. */
export function initialWelfordState(d: number): WelfordState {
  if (d < 1) {
    throw new Error(`initialWelfordState: dimension must be >= 1, got ${d}`);
  }
  return {
    n: 0,
    mean: new Array(d).fill(0),
    m2: Array.from({ length: d }, () => new Array(d).fill(0)),
  };
}

/** Pure-function Welford update: state_new = state + sample.
 *  Returns a NEW WelfordState; does not mutate input state.
 *  Throws if sample.length !== state.mean.length (dimension mismatch). */
export function updateWelford(
  state: WelfordState,
  sample: number[],
): WelfordState {
  const d = state.mean.length;
  if (sample.length !== d) {
    throw new Error(
      `updateWelford: dimension mismatch — state has dim ${d}, sample has dim ${sample.length}`,
    );
  }

  const newN = state.n + 1;
  // mean_new[i] = mean_old[i] + (x[i] − mean_old[i]) / newN
  const deltaOld: number[] = new Array(d);
  const newMean: number[] = new Array(d);
  for (let i = 0; i < d; i++) {
    deltaOld[i] = sample[i] - state.mean[i];
    newMean[i] = state.mean[i] + deltaOld[i] / newN;
  }

  // M2_new[i][j] = M2_old[i][j] + (x[i] − mean_old[i]) * (x[j] − mean_new[j])
  const newM2: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    const deltaNewJ_factor_i = deltaOld[i];  // (x[i] − mean_old[i])
    for (let j = 0; j < d; j++) {
      const deltaNewJ = sample[j] - newMean[j];
      newM2[i][j] = state.m2[i][j] + deltaNewJ_factor_i * deltaNewJ;
    }
  }

  return { n: newN, mean: newMean, m2: newM2 };
}

/** Returns the running mean as a defensive copy.
 *  Defensive copy prevents caller from mutating the WelfordState's internal mean. */
export function welfordMean(state: WelfordState): number[] {
  return [...state.mean];
}

/** Returns the sample covariance matrix M2 / (n − 1) for n ≥ 2.
 *  Returns null for n < 2 (covariance undefined with insufficient samples).
 *  Returns a defensive deep copy. */
export function welfordCovariance(state: WelfordState): number[][] | null {
  if (state.n < 2) {
    return null;
  }
  const d = state.mean.length;
  const divisor = state.n - 1;
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      cov[i][j] = state.m2[i][j] / divisor;
    }
  }
  return cov;
}
```

**Implementer note 1 (mandatory — verification):** After landing welford.ts, run `npm run typecheck` → expect exit 0. The module has zero external imports; if typecheck fails, the cause is internal (typo in interface signature; missing return type; etc.).

**Implementer note 2 (mandatory — algorithm fidelity):** The Welford M2 update uses `(x[i] − mean_old[i]) * (x[j] − mean_new[j])` — note `mean_old` for the left factor and `mean_new` for the right factor. This is West's multivariate generalization and is NOT symmetric in the indices unless the formula is implemented carefully. The pseudocode's `deltaOld[i]` (computed before mean update) supplies the left factor; `sample[j] - newMean[j]` (recomputed against the post-update mean) supplies the right factor. Do NOT simplify to `deltaOld[i] * deltaOld[j]` or `(x[i] - newMean[i]) * (x[j] - newMean[j])` — both are wrong and would produce subtly incorrect covariance for n ≥ 3 that AC-5 would catch.

**Implementer note 3 (mandatory — immutability):** `initialWelfordState` allocates fresh arrays for `mean` and `m2`. `updateWelford` allocates fresh arrays for `deltaOld`, `newMean`, and `newM2`; it reads from but does NOT write to `state.mean`, `state.m2`, or `sample`. If Implementer is tempted to optimize via `state.m2[i][j] += ...` (which would mutate input), HALT — AC-11 binds immutability and would catch the regression.

### File: `test/q04-welford-stats.test.ts` (created — Delta 2)

```typescript
// test/q04-welford-stats.test.ts — R04 AC-1 through AC-11.
//
// Binds the SLICE 2b2 Welford online statistics module at
// engine/per-shard/welford.ts. Eleven test cases; each maps to one R04 AC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WelfordState,
  initialWelfordState,
  updateWelford,
  welfordMean,
  welfordCovariance,
} from '../engine/per-shard/welford';

// Naive two-pass reference for cross-checking Welford (sample covariance, n−1 divisor).
// Kept inline (not in test/_substrate/) because it is q04-specific and serves the
// right-reasons audit goal of preventing self-confirming tests against the Welford
// implementation itself.
function naiveMean(samples: number[][]): number[] {
  const d = samples[0].length;
  const n = samples.length;
  const sum = new Array(d).fill(0);
  for (const s of samples) for (let i = 0; i < d; i++) sum[i] += s[i];
  return sum.map(v => v / n);
}
function naiveSampleCovariance(samples: number[][]): number[][] {
  const d = samples[0].length;
  const n = samples.length;
  const mean = naiveMean(samples);
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const s of samples) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += (s[i] - mean[i]) * (s[j] - mean[j]);
      }
    }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= (n - 1);
  return cov;
}
function welfordOf(samples: number[][]): WelfordState {
  let s = initialWelfordState(samples[0].length);
  for (const x of samples) s = updateWelford(s, x);
  return s;
}
function maxAbs(a: number[][], b: number[][]): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      const e = Math.abs(a[i][j] - b[i][j]);
      if (e > m) m = e;
    }
  }
  return m;
}

test('R04 AC-1 — initialWelfordState(d) returns zero-mean + zero-M2 of correct shape', () => {
  const s = initialWelfordState(3);
  assert.strictEqual(s.n, 0);
  assert.deepStrictEqual(s.mean, [0, 0, 0]);
  assert.deepStrictEqual(s.m2, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

test('R04 AC-2 — updateWelford first-sample (n=0 → n=1) sets mean=sample, m2=zeros', () => {
  const s0 = initialWelfordState(2);
  const s1 = updateWelford(s0, [5, 7]);
  assert.strictEqual(s1.n, 1);
  assert.deepStrictEqual(s1.mean, [5, 7]);
  // At n=1, M2 contribution is (x − 0)(x − x) = 0 component-wise; m2 stays zeros.
  assert.deepStrictEqual(s1.m2, [[0, 0], [0, 0]]);
});

test('R04 AC-3 — updateWelford second-sample (n=1 → n=2) averages two samples', () => {
  let s = initialWelfordState(2);
  s = updateWelford(s, [0, 0]);
  s = updateWelford(s, [2, 4]);
  assert.strictEqual(s.n, 2);
  assert.deepStrictEqual(s.mean, [1, 2]);
  // For two samples (0,0) and (2,4): centered = [(−1,−2), (1,2)]; M2 = [[2,4],[4,8]].
  assert.deepStrictEqual(s.m2, [[2, 4], [4, 8]]);
});

test('R04 AC-4 — Welford mean equals naive mean for n=10 samples', () => {
  const samples: number[][] = [
    [1.0, 2.0], [1.5, 2.5], [2.0, 3.0], [2.5, 3.5], [3.0, 4.0],
    [3.5, 4.5], [4.0, 5.0], [4.5, 5.5], [5.0, 6.0], [5.5, 6.5],
  ];
  const w = welfordOf(samples);
  const expected = naiveMean(samples);
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(w.mean[i] - expected[i]) < 1e-12, `mean[${i}]: ${w.mean[i]} vs ${expected[i]}`);
  }
});

test('R04 AC-5 — Welford sample covariance equals naive two-pass for n=20 samples', () => {
  const samples: number[][] = [];
  for (let i = 0; i < 20; i++) {
    samples.push([
      Math.sin(i),
      Math.cos(i),
      Math.sin(i) + Math.cos(i),
    ]);
  }
  const w = welfordOf(samples);
  const cov = welfordCovariance(w);
  assert.notStrictEqual(cov, null);
  const expected = naiveSampleCovariance(samples);
  const err = maxAbs(cov!, expected);
  assert.ok(err < 1e-10, `max-abs error ${err} >= 1e-10`);
});

test('R04 AC-6 — Welford is numerically stable vs naive two-pass on shifted data', () => {
  // Samples around 1e8 with O(1) noise — naive two-pass catastrophically loses
  // precision in this regime; Welford preserves it.
  const SHIFT = 1e8;
  const samples: number[][] = [];
  for (let i = 0; i < 50; i++) {
    samples.push([SHIFT + Math.sin(i), SHIFT + Math.cos(i)]);
  }
  const w = welfordOf(samples);
  const wCov = welfordCovariance(w);
  assert.notStrictEqual(wCov, null);
  // Reference: subtract SHIFT from samples (perfect re-centering), naive on
  // re-centered data is numerically clean. Welford on shifted data should
  // closely match this reference.
  const reCentered = samples.map(s => [s[0] - SHIFT, s[1] - SHIFT]);
  const refCov = naiveSampleCovariance(reCentered);
  const err = maxAbs(wCov!, refCov);
  // The numerical-stability claim: Welford error << 1.0 in this regime; naive
  // two-pass error in this regime is typically O(SHIFT² × eps_machine) ≈ O(1)
  // or worse for double-precision. We assert Welford << 1.0; we do NOT assert
  // naive's failure (no naive comparison here — that would add complexity for
  // a property that is well-documented in Welford's literature).
  assert.ok(err < 1e-4, `Welford max-abs error ${err} >= 1e-4 on shifted data`);
});

test('R04 AC-7 — welfordCovariance returns null for n < 2', () => {
  assert.strictEqual(welfordCovariance(initialWelfordState(3)), null);
  const s1 = updateWelford(initialWelfordState(3), [1, 2, 3]);
  assert.strictEqual(welfordCovariance(s1), null);
});

test('R04 AC-8 — welfordCovariance divides by (n−1) for n=10', () => {
  // For 10 samples of identity-ish data: variance = sum((x−mean)²) / 9, not / 10.
  // Construct samples [0..9] in a single dimension; mean = 4.5; sum((x−4.5)²) = 82.5.
  // Sample variance = 82.5 / 9 ≈ 9.1666... NOT 82.5 / 10 = 8.25.
  const samples: number[][] = [];
  for (let i = 0; i < 10; i++) samples.push([i]);
  const w = welfordOf(samples);
  const cov = welfordCovariance(w);
  assert.notStrictEqual(cov, null);
  // Expect 82.5 / 9 ≈ 9.166666...
  assert.ok(Math.abs(cov![0][0] - (82.5 / 9)) < 1e-10, `expected 82.5/9, got ${cov![0][0]}`);
  // Sanity that population convention is NOT used: would give 82.5 / 10 = 8.25.
  assert.ok(Math.abs(cov![0][0] - 8.25) > 0.5, 'covariance must NOT equal population variance 8.25');
});

test('R04 AC-9 — welfordMean returns the running mean as a defensive copy', () => {
  const s = updateWelford(initialWelfordState(2), [3, 5]);
  const m = welfordMean(s);
  assert.deepStrictEqual(m, [3, 5]);
  // Mutate the returned array; state's internal mean must be unaffected.
  m[0] = 999;
  assert.strictEqual(s.mean[0], 3);
});

test('R04 AC-10 — updateWelford throws on dimension-mismatch', () => {
  const s = initialWelfordState(3);
  assert.throws(() => updateWelford(s, [1, 2]), /dimension mismatch/);
  assert.throws(() => updateWelford(s, [1, 2, 3, 4]), /dimension mismatch/);
  assert.throws(() => updateWelford(s, []), /dimension mismatch/);
});

test('R04 AC-11 — updateWelford does not mutate input state', () => {
  const s0 = initialWelfordState(2);
  // Capture snapshot BEFORE any updateWelford call — captures first-call mutations.
  const snapshot0 = JSON.stringify(s0);
  const s1 = updateWelford(s0, [1, 2]);
  // First-call mutation check: s0 unchanged after first updateWelford.
  assert.strictEqual(JSON.stringify(s0), snapshot0);
  // Run a second update from s0 (the original) — must not mutate s0 OR s1.
  updateWelford(s0, [10, 20]);
  // Second-call mutation check: s0 still unchanged.
  assert.strictEqual(JSON.stringify(s0), snapshot0);
  // s1 must also not be mutated by the second update on s0 (catches shared-
  // reference bugs between s1's internal arrays and s0's internal arrays).
  assert.strictEqual(s1.n, 1);
  assert.deepStrictEqual(s1.mean, [1, 2]);
});
```

**Implementer note 4 (mandatory — TDD):** This file is RED-first. The commit sequence is:
  - Commit 1 (RED): create `test/q04-welford-stats.test.ts`. The test file imports from `../engine/per-shard/welford` which does not exist — tsc fails with TS2307 "Cannot find module '../engine/per-shard/welford'." Verify RED state: `npm run typecheck` exits non-zero; `node --test test/q04-welford-stats.test.js` either fails compilation or reports `test file not found` after pretest.
  - Commit 2 (GREEN): create `engine/per-shard/welford.ts` per Delta 1, AND apply Delta 3 (q03 test updates) to add AC-12 + AC-13 + the AC-9 clarifying comment. All imports resolve; `npm run typecheck` exits 0; `node --test test/q04-welford-stats.test.js` reports `pass 11 / fail 0`; `node --test test/q03-warm-start-runtime.test.js` reports `pass 13 / fail 0`.
  - Two-commit ordering is the AC-14 TDD evidence.

**Implementer note 5 (mandatory — Welford regression):** After landing welford.ts, before committing GREEN, manually verify the M2 update via a hand-traceable n=3 case: samples [0,0], [2,0], [0,2] in 2D. Naive mean = [2/3, 2/3]. Centered = [(−2/3,−2/3), (4/3,−2/3), (−2/3,4/3)]. M2 = [[8/3, −4/3], [−4/3, 8/3]]. Sample covariance = M2 / 2 = [[4/3, −2/3], [−2/3, 4/3]]. If Welford produces a different M2, the update formula is wrong — review Implementer note 2 (mean_old vs mean_new factor distinction). This hand-traceable check is NOT a separate test (the existing AC-5 covers cross-check against naive); it is a sanity check the Implementer performs before committing.

### File: `test/q03-warm-start-runtime.test.ts` (changed — Delta 3)

Three sub-deltas, all additive. Final form below; original 11 R03 tests preserved verbatim except for the AC-9 clarifying comment (Delta 3c) which adds prose above the existing test without modifying any assertion.

```typescript
// test/q03-warm-start-runtime.test.ts — R03 AC-1 through AC-11 + R04 AC-12 + R04 AC-13.
//
// Binds the SLICE 2b1 warm-start confidence-tier state machine at
// engine/per-shard/warm-start.ts. Original eleven R03 test cases preserved;
// R04 adds two complementary tests (strict-tier reset + immutability) and an
// in-place clarifying comment on AC-9.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  observeSample,
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '../engine/per-shard/warm-start';
import { makePerShardResidual } from './_substrate/factories';

// ─── R03 AC-1 through AC-8 — unchanged from R03 ──────────────────────────
// (R04 preserves these verbatim. Final spec includes the original 8 tests
//  here; pseudocode elides them for brevity. Implementer: keep the existing
//  tests as-is; do not modify their bodies or names.)

// AC-9 — Delta 3c: clarifying comment added; assertions unchanged.
//
// R04 disposition note (R03 MINOR-1): this test's `next.mean_vector === undefined`
// and `next.covariance === undefined` assertions are defensive-but-vacuous under
// the R02 sparse-encoding convention for the warm-start tier (warm-start fixtures
// carry mean_delta only; mean_vector + covariance are absent by convention). The
// assertions are correct (post-reset state DOES have those fields undefined) but
// they cannot distinguish a spread-based reset regression from the explicit-
// construction reset, because the input fixture's mean_vector + covariance are
// already undefined. LOAD-BEARING coverage of mean_vector + covariance clearing
// on reset lives in R04 AC-12 below (strict-tier fixture where those fields ARE
// populated per R02 sparse encoding). The assertions remain here as defensive
// regression-resistance for the warm-start-tier path; removing them would
// unnecessarily weaken the test signature.
test('R03 AC-9 — seed_hash mismatch resets residual + clears statistical fields', () => {
  const stale = makePerShardResidual({
    n_samples: 50,
    confidence: 'warm_start',
    mean_delta: [0.1, 0.2],
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
  });
  const next = observeSample(stale, { observedAt: 200, residualSeedHash: 'sha:new' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  // Stale statistics MUST be cleared on reset.
  assert.strictEqual(next.mean_delta, undefined);
  assert.strictEqual(next.mean_vector, undefined);   // defensive; vacuous in warm-start fixture
  assert.strictEqual(next.covariance, undefined);    // defensive; vacuous in warm-start fixture
});

// ─── R03 AC-10 + AC-11 — unchanged from R03 ──────────────────────────────

// ─── R04 additions ───────────────────────────────────────────────────────

// Delta 3a — closes R03 OBS-2 + provides load-bearing coverage of R03 MINOR-1 intent.
test('R04 AC-12 — seed_hash mismatch resets residual from strict tier; clears mean_vector + covariance (closes R03 OBS-2)', () => {
  // Strict-tier sparse encoding (R02): mean_vector + covariance present; mean_delta absent.
  // LOAD-BEARING: if observeSample's reset branch were changed to a spread-based form
  // ({ ...current, n_samples: 1, confidence: 'none', residual_seed_hash: new, last_observed_at: new }),
  // mean_vector and covariance would propagate from input to output — these assertions
  // would catch the regression. The complement to R03 AC-9 (whose mean_vector/covariance
  // assertions are vacuous in the warm-start fixture).
  const staleStrict = makePerShardResidual({
    n_samples: 200,
    confidence: 'strict',
    mean_vector: [1.0, 2.0, 3.0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
  });
  const next = observeSample(staleStrict, { observedAt: 200, residualSeedHash: 'sha:new' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  // Load-bearing: strict-tier fixture sets these; reset must clear them.
  assert.strictEqual(next.mean_vector, undefined);
  assert.strictEqual(next.covariance, undefined);
  // Defensive (strict fixture does not set mean_delta; assertion is vacuous here).
  assert.strictEqual(next.mean_delta, undefined);
});

// Delta 3b — closes R03 MINOR-5 (observeSample mutation regression resistance).
test('R04 AC-13 — observeSample does not mutate input residual (closes R03 MINOR-5)', () => {
  // The example mutation cited in R03 MINOR-5: `current.n_samples++; return current;` —
  // produces a `next` that strict-equals `current` and would pass every existing AC-1
  // through AC-11 assertion. This test captures the input as a JSON snapshot pre-call
  // and asserts equality post-call; any in-place mutation would change the serialization.
  const before = makePerShardResidual({
    n_samples: 30,
    confidence: 'warm_start',
    mean_delta: [0.5, 0.6],
    residual_seed_hash: 'sha:a',
    last_observed_at: 50,
  });
  const snapshot = JSON.stringify(before);
  // Discard the return value — only input invariance matters here.
  observeSample(before, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(JSON.stringify(before), snapshot);
});
```

**Implementer note 6 (mandatory):** In Delta 3c, the new clarifying comment is PROSE only — do NOT change any of the AC-9 assertions, the AC-9 test name, or the `stale` fixture. The defensive `mean_vector` + `covariance` assertions stay in place; the comment documents WHY they are defensive-but-vacuous. Removing them would be a Reviewer-flag-able weakening; preserving them with documentation is the discipline-correct path.

**Implementer note 7 (mandatory):** Final q03 test count post-Delta-3: 13 tests (11 original + 2 new). Run `node --test test/q03-warm-start-runtime.test.js` after GREEN → expect `pass 13 / fail 0`. Do NOT pre-assume the count in the binding-command attestation; report the OBSERVED output (R03 MINOR-4 reinforcement).

---

## Acceptance criteria

Every AC binds to at least one test case (in `test/q04-welford-stats.test.ts` or `test/q03-warm-start-runtime.test.ts`) or to an Implementer-side verification command. Each AC traces to one specific § Mechanism Delta or carry-forward disposition. No per-file test counts are pre-stated — Implementer reports OBSERVED output (R03 MINOR-4 reinforcement).

1. **AC-1 — `initialWelfordState(d)` returns zero-mean + zero-M2 of correct shape.** Given the post-R04 `engine/per-shard/welford.ts`, when `initialWelfordState(3)` is invoked, then the returned state has `n === 0`, `mean === [0, 0, 0]`, `m2 === [[0,0,0],[0,0,0],[0,0,0]]`. Verified by `R04 AC-1` test.

2. **AC-2 — `updateWelford` first-sample (n=0 → n=1) sets mean=sample, m2=zeros.** Given a fresh 2D state, when `updateWelford(s0, [5, 7])` is invoked, then the returned state has `n === 1`, `mean === [5, 7]`, `m2 === [[0,0],[0,0]]`. Verified by `R04 AC-2` test.

3. **AC-3 — `updateWelford` second-sample (n=1 → n=2) averages two samples.** Given a 2D state with one sample `[0, 0]` consumed, when `updateWelford` is called with `[2, 4]`, then the returned state has `n === 2`, `mean === [1, 2]`, `m2 === [[2, 4], [4, 8]]`. Verified by `R04 AC-3` test.

4. **AC-4 — Welford mean equals naive mean for n=10 samples.** Given a 10-sample 2D fixture, when both Welford-accumulated mean and naive-arithmetic mean are computed over the same samples, then the per-component absolute difference is `< 1e-12`. Verified by `R04 AC-4` test.

5. **AC-5 — Welford sample covariance equals naive two-pass covariance for n=20 samples.** Given a 20-sample 3D fixture, when both Welford-accumulated covariance and naive two-pass sample covariance are computed over the same samples, then the max-absolute element-wise error is `< 1e-10`. Verified by `R04 AC-5` test.

6. **AC-6 — Welford is numerically stable on shifted data.** Given a 50-sample 2D fixture with samples around 1e8 with O(1) noise, when Welford's covariance is computed on the shifted data AND naive two-pass covariance is computed on the re-centered (shift-subtracted) data, then the max-absolute element-wise error between the two is `< 1e-4`. Verified by `R04 AC-6` test.

7. **AC-7 — `welfordCovariance` returns null for n < 2.** Given a state with `n === 0` (fresh) or `n === 1` (one sample), when `welfordCovariance(state)` is called, then it returns `null` (NOT zeros, NOT undefined, NOT an empty matrix). Verified by `R04 AC-7` test.

8. **AC-8 — `welfordCovariance` divides by (n−1) for n ≥ 2.** Given a 10-sample 1D fixture `[[0], [1], ..., [9]]`, when `welfordCovariance` is called, then the result equals `82.5 / 9 ≈ 9.1666...` (sample covariance with n−1 = 9 divisor); and the result is NOT `82.5 / 10 = 8.25` (population covariance). Verified by `R04 AC-8` test.

9. **AC-9 — `welfordMean` returns a defensive copy.** Given a state with `mean === [3, 5]`, when `welfordMean(state)` is called and the returned array is mutated, then `state.mean[0]` is unchanged (defensive copy isolation). Verified by `R04 AC-9` test.

10. **AC-10 — `updateWelford` throws on dimension mismatch.** Given a 3D state, when `updateWelford(s, [1, 2])` (2D sample) or `updateWelford(s, [1, 2, 3, 4])` (4D sample) or `updateWelford(s, [])` (empty sample) is invoked, then each throws an Error matching `/dimension mismatch/`. Verified by `R04 AC-10` test.

11. **AC-11 — `updateWelford` does not mutate input state.** Given a fresh 2D state `s0` with `JSON.stringify(s0)` captured to `snapshot0` BEFORE any update call, when `updateWelford(s0, [1, 2])` is invoked AND THEN `updateWelford(s0, [10, 20])` is invoked, then after each invocation `JSON.stringify(s0) === snapshot0` (first-call AND second-call mutation rejected); AND the intermediate `s1` returned by the first call satisfies `s1.n === 1`, `s1.mean === [1, 2]` after the second call completes (catches shared-reference bugs between s1's internal arrays and s0's internal arrays). Verified by `R04 AC-11` test.

12. **AC-12 — Seed-hash mismatch resets residual from strict tier and clears `mean_vector` + `covariance` (closes R03 OBS-2; load-bearing complement to R03 MINOR-1).** Given a residual with `confidence === 'strict'`, `mean_vector === [1.0, 2.0, 3.0]`, `covariance === [[1,0,0],[0,1,0],[0,0,1]]`, `residual_seed_hash === 'sha:old'`, when `observeSample` is invoked with `residualSeedHash: 'sha:new'`, then the returned residual has `n_samples === 1`, `confidence === 'none'`, `residual_seed_hash === 'sha:new'`, AND `mean_vector === undefined` AND `covariance === undefined`. Verified by `R04 AC-12` test in q03 file (Delta 3a).

13. **AC-13 — `observeSample` does not mutate input residual (closes R03 MINOR-5).** Given a populated warm-start residual, when `observeSample` is invoked on it and the return value discarded, then the input residual's `JSON.stringify` is unchanged. Verified by `R04 AC-13` test in q03 file (Delta 3b).

14. **AC-14 — TDD ordering verifiable in git history.** Given the R04 commit sequence, when `git log --oneline -- engine/per-shard/welford.ts test/q04-welford-stats.test.ts test/q03-warm-start-runtime.test.ts` is inspected, then the RED commit (q04 test file committed before `engine/per-shard/welford.ts`) precedes the GREEN commit (welford.ts + q03 test updates). Verified by Implementer attestation in NEXT-ROLE.md; Reviewer independently runs `git log --oneline` + `git show <red-sha>` for cross-verification.

15. **AC-15 — Tessera-side `tsc` clean compile via `tsconfig.test.json`.** Given the post-R04 tree, when `npm run typecheck` is invoked, then it exits zero with no warnings or errors. Verified by Implementer at commit time and disclosed in NEXT-ROLE.md "Binding command results" section.

16. **AC-16 — All R01 + R02 + R03 tests still pass.** Given the post-R04 tree, when `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js test/q02-schema-extension.test.js test/q03-warm-start-runtime.test.js test/betting-e-process-class-dispatch.test.js` is invoked, then all six test files report `pass <n> / fail 0` where `<n>` is the OBSERVED per-file count (Implementer attestation reports the actual numbers; do NOT pre-state counts here per R03 MINOR-4 reinforcement). The pre-R04 baseline counts (per R03 Reviewer-verified at HEAD `e698c20`, no code changes since at HEAD `2160b7e`): q01-vendoring-coverage = 3; q01-no-at-pin-deltas = 1; q01-schema-additions = 5; q02-schema-extension = 6; q03-warm-start-runtime = 11; smoke = 5. Post-R04 expected delta: q03 grows by 2 to 13; all others unchanged. Implementer reports the OBSERVED counts in attestation.

17. **AC-17 — R04 new q04 test passes.** Given the post-R04 tree, when `node --test test/q04-welford-stats.test.js` is invoked, then it passes (`pass 11 / fail 0`). Verified by direct invocation; OBSERVED count reported in attestation.

18. **AC-18 — Smoke test still passes.** Given the post-R04 tree, when `node --test test/betting-e-process-class-dispatch.test.js` is invoked, then it passes (`pass 5 / fail 0`). Verified by direct invocation. (No-regression check; R03 established the green baseline at HEAD `2160b7e`.)

---

## Anti-scope

Per anchor `skills/06-anti-scope-ledger.md`. Each named item is NOT in scope at R04; halt-and-route-back triggers on encounter via DIAGNOSTIC + STATUS: ESCALATE per `CLAUDE-IMPLEMENTER.md` halt discipline.

- **R04-SAS-1: NO modification to `engine/types/config.ts`.** Schema is settled per R02 + R03; integration of Welford into PerShardResidual (e.g., adding `_accumulator?: WelfordState` field per R03 sidecar option (a)) is R05 architect decision. Implementer encountering apparent need to extend the schema → HALT.

- **R04-SAS-2: NO modification to `engine/per-shard/warm-start.ts`.** State machine is settled per R03; R04 ships Welford as a sibling pure-function module with zero coupling. The integration of `updateWelford` into `observeSample` (e.g., conditional update at strict tier; conditional accumulation at non-strict tiers) is R05 architect decision. Implementer encountering apparent need to add a call to `updateWelford` from within `observeSample`, OR to modify `observeSample`'s reset/increment branches → HALT.

- **R04-SAS-3: NO `mean_delta` computation.** Requires fleet-aggregate baseline injection (BaselineCellEntry source) which is orchestrator scope (R03-SAS-2 carry-forward). The Welford module does NOT compute `mean_delta`; it computes raw mean + raw covariance only. R05+ architect picks how `mean_delta` is computed (likely: `mean_delta = welfordMean(state) − baselineMean`, but the baseline injection mechanism is the architectural decision).

- **R04-SAS-4: NO accumulator-strategy decision.** The three options surfaced in R03 sidecar (a) schema-extension `_accumulator?` field; (b) `mean_delta` overload at non-strict tiers; (c) caller-state — are NOT picked at R04. The Welford module is shipped as a building block whose accumulator state lives in `WelfordState` (module-local). R05 architect picks the strategy when integration lands.

- **R04-SAS-5: NO R02 MINOR-2 sparse-encoding inverse-convention enforcement.** Still load-bearing-pending. The two options surfaced in R02 (discriminated-union refactor; runtime-invariant assertion) are NOT picked at R04 because R04 ships no integration code that would trigger the convention. R05 architect picks when integration lands.

- **R04-SAS-6: NO orchestrator vendoring.** R02-SAS-5 → R03-SAS-2 carry-forward. `engine/orchestrator.ts` and any wiring of Welford or `observeSample` into an orchestrator surface is out of scope.

- **R04-SAS-7: NO compiled-artifact JSON loader.** Deferred to R06+ (SLICE 2b3). R04 does not introduce config loading, serialization, or any I/O code path.

- **R04-SAS-8: NO PR-F5 empirical storage profile measurement.** Deferred to R06+. Storage measurement requires populated `per_shard_cells` runtime state (R05 integration scope).

- **R04-SAS-9: NO new detector vendoring.** Detector set is closed at R01-shipped state. R02-SAS-4 → R03-SAS-5 carry-forward.

- **R04-SAS-10: NO modification to `tsconfig.json`, `tsconfig.test.json`, or `package.json`.** R02-SAS-6 → R03-SAS-6 carry-forward; R01 MAJOR-5 disposition stands. The existing `tsconfig.test.json` includes `engine/**/*.ts` and `test/**/*.ts` (verified at HEAD `2160b7e` by direct file read), so `engine/per-shard/welford.ts` and `test/q04-welford-stats.test.ts` are covered without modification. If Implementer encounters an apparent need to modify → HALT.

- **R04-SAS-11: NO modification to `tools/vendor-from-deploysignal.sh`.** R02-SAS-7 → R03-SAS-7 carry-forward; R02 OQ-1 still deferred.

- **R04-SAS-12: NO modification to inherited vendored engine internals.** A12 inherited via R01/R02/R03-SAS-8 chain. The Welford module has zero imports from inherited code; if a compile failure surfaces inside `engine/detectors/**` or `engine/types/families/**` after R04 changes, the cause is in the Welford module's exports or in the q03/q04 test file's imports — investigate Tessera-original surfaces first.

- **R04-SAS-13: NO `mergeWelfordStates` / parallel-Welford / Chan-Golub-LeVeque combination.** Parallel Welford merge (combining two independent WelfordStates into one) is the standard Welford API extension for fleet-pooling and is genuinely useful. It is Phase 1 SLICE 3 scope (hierarchical e-value combination at fleet scale per SCOPING-MEMO § 3) — the merge formula is the substrate for fleet-aggregate baseline computation. R04 ships the single-shard Welford; SLICE 3 adds the merge. Implementer encountering temptation to add `mergeWelfordStates` → HALT.

- **R04-SAS-14: NO addition of `engine/per-shard/index.ts` barrel export.** R03-SAS-13 carry-forward; YAGNI at SLICE 2b2 (two files in `engine/per-shard/`: warm-start.ts + welford.ts; consumers import each directly). Add at R05+ if/when consumer count or grouping convenience warrants.

- **R04-SAS-15: NO Tessera-side compiled-config JSON fixture file.** R03-SAS-14 carry-forward; deferred to R06+ with the loader work.

- **R04-SAS-16: NO addition of TypeScript strict-mode flags, lint configuration, pre-commit hooks, or new devDependencies.** R02-SAS-12 → R03-SAS-15 carry-forward; tsconfig and package.json off-limits per R04-SAS-10.

- **R04-SAS-17: NO modification to `test/_substrate/factories.ts`.** R03-shipped factories suffice for R04: the new strict-tier reset test (AC-12) uses `makePerShardResidual` with mean_vector + covariance overrides (already supported by the factory's `Partial<PerShardResidual>` override mechanism); the immutability test (AC-13) uses the same factory. Welford tests do not consume any factory (operate on raw arrays). If Implementer encounters apparent need to extend factories → HALT (the need is likely a sign that the test is over-coupling to schema types when raw arrays suffice).

- **R04-SAS-18: NO modification to `test/q01-*.test.ts` or `test/q02-*.test.ts`.** R03 closed the q01/q02 carry-forward MINORs; no R04 surface to repair on these files.

- **R04-SAS-19: NO modification to `coordination/VENDORING-MANIFEST.md`.** R04 ships only Tessera-original files (Welford module + new test file); manifest convention is "files vendored from DeploySignal." R04 adds no rows, removes no rows.

- **R04-SAS-20: NO modification to PRD.md.** R02 OBS-4 → R03 OQ-3 carry-forward. PRD edits are operator-owned, not Architect-routed via the pipeline.

- **R04-SAS-21: NO disposition of R03 OBS-1 / OBS-3 / OBS-4 / OBS-5.** These are orthogonal concerns without natural R04 surfaces (OBS-1 / OBS-3 require touching warm-start.ts production code outside R04-SAS-2; OBS-4 requires touching q02 outside R04-SAS-18; OBS-5 is an operator/architect policy question). Pickup at next round that naturally touches each respective surface.

**Cross-references to R03 anti-scope (carry-forward where applicable):** R03-SAS-1 (statistical-residual computation deferred from R03) is now PARTIALLY SUPERSEDED at R04: R04 ships the ALGORITHM (Welford pure function) but NOT the INTEGRATION; the integration deferral becomes R04-SAS-2 + R04-SAS-4. R03-SAS-2 (orchestrator vendoring) → R04-SAS-6. R03-SAS-3 (compiled-artifact loader) → R04-SAS-7. R03-SAS-4 (PR-F5 measurement) → R04-SAS-8. R03-SAS-5 (new detector vendoring) → R04-SAS-9. R03-SAS-6/7/8 (tsconfig/script/inherited-internals edits) → R04-SAS-10/11/12. R03-SAS-9 (engine/types/config.ts) → R04-SAS-1. R03-SAS-10 (manifest) → R04-SAS-19. R03-SAS-11 (unbundled prior-MINOR fence) → R04-SAS-21. R03-SAS-12 (q01-vendoring iteration list broaden) → preserved by absence (R04 doesn't touch q01-vendoring at all). R03-SAS-13 (per-shard barrel) → R04-SAS-14. R03-SAS-14 (compiled-config JSON fixture) → R04-SAS-15. R03-SAS-15 (new tooling/devDeps) → R04-SAS-16.

**Cross-references to v0.3 SCOPING-MEMO anti-scope clauses:** A1–A17 all carry forward to R04 with no additions. The Welford module does not introduce real-customer-telemetry (A8/A11), hardware-diagnostic (A10), modification-to-vendored-internals (A12/A5), ML-attribution (A13), federation (A15), Addition #26 D4 reversal (A16), or DeploySignal-integration (A17) concerns.

---

## Open questions

1. **OQ-1: Should `WelfordState` carry a `d: number` field, or is `mean.length` the source of truth for dimensionality?** Architect-pre-prediction: NO explicit `d` field — `state.mean.length` is the source of truth (DRY; one place to mutate-protect; the `m2.length` and `m2[i].length` are derivable consistency checks). The dimension is fixed at `initialWelfordState(d)` time and preserved across `updateWelford` calls (which throw on mismatch). If a future R05+ integration wanted to query dimensionality without unpacking, an accessor function `welfordDimension(state): number` could be added cheaply. Implementer does not act on this in R04.

2. **OQ-2: Should `updateWelford` accept a `weight: number` parameter for weighted-sample variants?** Architect-pre-prediction: NO at SLICE 2b2 — equal-weight samples are sufficient for PRD AC-P2. Weighted Welford (West 1979 weighted update) is a documented extension; if a future round needs it (e.g., for time-weighted sample decay in long-running shards), `updateWelfordWeighted(state, sample, weight)` can be added as a sibling function. Implementer does not act on this in R04.

3. **OQ-3: Should the Welford module export the naive two-pass implementation used in q04 tests as a reusable reference?** Architect-pre-prediction: NO — the naive implementation is q04-test-internal scaffolding; exporting it via the module would (a) advertise an algorithm we do NOT recommend for production use; (b) increase the module's API surface for zero production benefit; (c) blur the separation between production code and test substrate. Implementer should keep `naiveMean` + `naiveSampleCovariance` inline in the q04 test file as-pseudocoded; do NOT extract them to `engine/per-shard/welford.ts` or to `test/_substrate/factories.ts`.

4. **OQ-4: Should AC-6 (numerical stability) include a direct naive-comparison assertion (`naiveTwoPassError > welfordError`)?** Architect-pre-prediction: NO — implementing a naive two-pass with documented numerical-fragility in the test for the express purpose of showing it fails is a test-of-the-test that adds complexity and code without strengthening the Welford binding. AC-6's current formulation ("Welford error < 1e-4 on shifted data") is sufficient — the property is well-documented in Welford's literature; the test bounds the absolute error which is what matters operationally. Implementer does not act on this in R04.

5. **OQ-5: At R05 integration time, which of the three accumulator-strategy options will the R05 architect pick?** Architect-pre-prediction: most likely (a) schema-extension with `_accumulator?: WelfordState` field — the cleanest separation between OUTPUT (sparse-encoded mean_vector + covariance + mean_delta per tier) and INTERNAL ACCUMULATOR (running Welford state, agnostic to tier). Option (b) overloads `mean_delta` semantics; option (c) spreads state to orchestrator. Predicted with MEDIUM confidence; the R05 architect's actual selection is the load-bearing decision and may differ. R04 does NOT bias the choice — the Welford module operates on `WelfordState` and is composable into all three options. Implementer does not act on this in R04.

No other unresolved items. (Per CLAUDE-ARCHITECT.md: "All unresolved decisions → open questions in the spec. Not silent choices.")

---

## P3 ten-axis verification

- **P3.1 concrete-values:** All Welford components named with concrete shapes (`WelfordState = { n: number; mean: number[]; m2: number[][]; }`). Threshold-equivalent constants: sample-covariance divisor `n − 1` (NOT `n`); n < 2 emission convention `null` (NOT zeros). Numerical tolerances stated as concrete numbers (`1e-12` mean accuracy; `1e-10` covariance accuracy; `1e-4` shifted-data stability). One **corner case** acknowledged: at `n === 1`, the M2 update contributes `(x − 0)(x − x) = 0` for all components — m2 stays at zeros. Documented in AC-2 + Implementer note 2; tested by AC-2.

- **P3.2 coord-trail:** PRD AC-P2 ("strict-upgrade at 60 samples preserves inherited single-instance behavior") grepped → Welford supplies the ACCUMULATION SUBSTRATE that an R05+ integration uses to populate strict-tier mean_vector/covariance from sample 1 onward. R04 ships the algorithm; the "preserves inherited single-instance behavior" property becomes load-bearing at R05 integration time. SCOPING-MEMO § 3 Phase 1 SLICE 2 row "Warm-start cold-start mechanism" → narrowed to SLICE 2b2 algorithm-only per Approach E selection. SCOPING-MEMO § 4.1 R-S2 (`min_samples_strict` re-derivation) → the Welford accumulator is the substrate that re-derivation tests against. R02 spec § Mechanism Delta 5 (PerShardResidual fields mean_vector / covariance) → R04 does NOT integrate; integration is R05. R03 Reviewer MINOR-1 → addressed via complementary strict-tier binding (AC-12) + in-place clarifying comment (Delta 3c). R03 Reviewer MINOR-5 → addressed via immutability test (AC-13). R03 Reviewer OBS-2 → addressed via AC-12. R03 Reviewer MINOR-2/3/4 → architect-discipline reinforcements consumed during R04 spec authoring; no test surface to repair.

- **P3.3 file-opened:** **Type-declaration-site discipline applied** (per CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 — derived from R02 OBS-3). R04 introduces a Tessera-original module with ZERO imports from inherited engine code (Welford operates on raw `number[]` and `number[][]` JavaScript primitives only). No external types to declaration-site-verify for the production module. For the q03 test file modification (Delta 3a + 3b): the existing imports (`observeSample`, `initialPerShardResidual`, `WARM_START_THRESHOLD`, `STRICT_UPGRADE_THRESHOLD`, `makePerShardResidual`) were declaration-site-verified at R03 spec time (cited in `Q-R03-SPEC.md` § P3.3); no new types introduced. **Re-export-chain check applied** (per CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 — derived from R03 MINOR-3): R04 Welford module's "Integration points" section makes ZERO claims about re-export chains (it explicitly states "ZERO inherited imports"). The re-export-chain reinforcement applies trivially-by-absence. Verified at HEAD `2160b7e` by `git ls-files engine/per-shard` → only `engine/per-shard/warm-start.ts` exists (welford.ts is to be created); `test/_substrate/factories.ts` + `test/q03-warm-start-runtime.test.ts` + the q01/q02 test files exist as R03-shipped.

- **P3.4 function-bodies:** R04 ships four new production functions (`initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance`). Per-file pseudocode shows full function bodies for all four. `updateWelford` has the non-trivial algorithmic content (Welford recurrence with mean_old/mean_new distinction); pseudocode is line-by-line. The pseudocode's M2 update loop uses `deltaOld[i]` (computed before mean update) for the left factor and `sample[j] - newMean[j]` (recomputed post-update) for the right factor — Implementer note 2 explicitly warns against the two common wrong simplifications (`deltaOld[i] * deltaOld[j]` and `(x[i] - newMean[i]) * (x[j] - newMean[j])`).

- **P3.5 compiled-artifact:** R04 does not introduce a Tessera-specific compiled-config JSON artifact (R04-SAS-15). The new module extends the compile-time TypeScript surface (one new module file); runtime config-loading is R06+ scope. AC-15 (`tsc` clean compile) is the compiled-artifact-equivalent check.

- **P3.6 substrate-validation:** R04 lands the Welford algorithm as foundational substrate for R05+ integration. AC-15 + AC-17 validate it via type-check + runtime test execution. The q04 test file's inline `naiveMean` + `naiveSampleCovariance` serve as Welford-correctness reference (AC-4, AC-5) without exporting them to the production module (OQ-3 disposition). Test substrate at R04 is q04-internal-only.

- **P3.7 enumeration:** Component inventory enumerated explicitly with state markers; 1 changed + 2 created + 0 deleted = 3 surfaces. Manifest cross-check confirms no files outside inventory. Per cross-project memorial "Component inventory accuracy at the file-state level is a verification preamble; do not silently mark unmodified files as exempt." — none claimed as exempt; all enumerated.

- **P3.8 contradiction-search:** Cross-section consistency pass (next section) explicitly checks for naming/structure drift across § Mechanism / § Per-file pseudocode / § Acceptance criteria / Open questions. R01-derived reinforcement applied as a structural section. 12 resolved-decision checks executed.

- **P3.9 carry-forward-claims:** Every R03 MINOR/OBS disposition referenced in § Mechanism cites the source REVIEWER finding by ID and traces to a specific R04 Delta OR an architect-discipline reinforcement: MINOR-1 → Delta 3c (in-place comment) + complementary load-bearing AC-12; MINOR-2 → architect-discipline reinforcement consumed (no grep-evidence ACs in R04 spec); MINOR-3 → architect-discipline reinforcement consumed (R04 module has ZERO inherited imports; no re-export-chain to verify); MINOR-4 → architect-discipline reinforcement consumed (no per-file test counts pre-stated in any AC); MINOR-5 → Delta 3b (AC-13 immutability); OBS-1 → no R04 surface (cosmetic; warm-start.ts annotation); OBS-2 → Delta 3a (AC-12 strict-tier reset); OBS-3 → no R04 surface (JSDoc in warm-start.ts, outside R04-SAS-2); OBS-4 → no R04 surface (void _missing in q02, outside R04-SAS-18); OBS-5 → no R04 surface (operator/architect policy question).

- **P3.10 verification-discipline:** Every AC binds to either a runnable test (q04 AC-1 through AC-11; q03 AC-12 + AC-13) or a binding command attestation (AC-15 typecheck; AC-16 R01+R02+R03 test execution; AC-17 q04 execution; AC-18 smoke execution) or git-history evidence (AC-14). No AC is operator-asserted-only. **No grep-evidence ACs** — the R03 MINOR-2 reinforcement is honored by avoiding the class of AC entirely (grep evidence at AC level is replaced by test-binding evidence or direct binding-command attestation).

---

## Cross-section consistency pass (R01 reinforcement — mandatory)

Per `CLAUDE-ARCHITECT.md` REINFORCED 2026-05-16: for every resolved decision that names a module path, function name, type structure, constant value, naming convention, or deferral policy, verify ALL spec sections use a consistent surface. Each check below was executed by re-reading the spec section-by-section for the alternative form before the spec was emitted.

| Resolved decision | Canonical form | Spec sections checked | Result |
|---|---|---|---|
| Welford module path | `engine/per-shard/welford.ts` (singular `per-shard`, kebab-case file, no plural) | § Mechanism Delta 1, § Component inventory, § Per-file pseudocode header, § AC-14, § Anti-scope R04-SAS-2 + R04-SAS-13 + R04-SAS-14, Implementer notes, q04 test imports, OQ-3, P3.3, § Integration points | ✅ All sites use `engine/per-shard/welford.ts`. No `engine/per-shard/welford-stats.ts`, `engine/per-shard/online-stats.ts`, `engine/welford/` variants. |
| Welford state interface name | `WelfordState` (PascalCase; no `IWelfordState` Hungarian prefix; no `Welford` standalone) | Delta 1 export list, Per-file pseudocode, q04 test imports, JSDoc, OQ-1, AC-1 through AC-11 bodies (each "given a `WelfordState`...") | ✅ All sites use `WelfordState`. No alternate naming surfaces. |
| Welford function names | `initialWelfordState`, `updateWelford`, `welfordMean`, `welfordCovariance` (camelCase; `Welford` PascalCase WHEN part of compound — `initial` / `update` / `welfordMean` / `welfordCovariance`) | Delta 1 export list, Per-file pseudocode, q04 imports, AC-1/2/3/4/5/6/7/8/9/10/11 (each names the function under test), JSDoc | ✅ All four names consistent across all sites. No `welfordInit` / `welfordUpdate` / `getMean` / `getCovariance` variants. |
| WelfordState field names | `n` (number; single letter; textbook Welford convention), `mean` (number[]), `m2` (number[][]; lowercase `m2`, NOT `M2` or `m_2`) | Delta 1 interface declaration, Per-file pseudocode (initializer + update body), q04 tests (AC-1 + AC-2 + AC-3 + AC-11 inspect these fields), JSDoc | ✅ All three names consistent. The convention contrast with PerShardResidual's `n_samples` (snake_case schema) vs Welford's `n` (camelCase TypeScript-native) is documented in the Welford JSDoc as deliberate (Welford state is module-local; schema fields are inherited snake_case). |
| Covariance divisor convention | Sample covariance `M2 / (n − 1)` for n ≥ 2 (NOT population `M2 / n`) | § Mechanism primitive 1, Delta 1 pseudocode (`welfordCovariance` body uses `state.n - 1`), JSDoc, AC-8 (explicit binding to `82.5 / 9`), F-2 failure mode | ✅ `n − 1` divisor consistent everywhere. AC-8 explicitly verifies `cov[0][0] ≈ 9.166...` AND explicitly NOT-equals `8.25` to bind the convention bi-directionally. |
| Insufficient-samples emission convention | `welfordCovariance` returns `null` for n < 2 (NOT zeros, NOT undefined, NOT empty matrix) | Delta 1 pseudocode, JSDoc, AC-7 (binding for n=0 + n=1 cases), F-3 failure mode, OQ-5 indirectly | ✅ `null` return uniformly. Distinct from `undefined` (which would be ambiguous with "field absent"); distinct from zero-matrix (which would silently pollute downstream sample-quality assessments). |
| Dimension-mismatch error semantics | `updateWelford` throws Error matching `/dimension mismatch/`; `initialWelfordState(d < 1)` throws Error matching `/dimension must be >= 1/` | Delta 1 pseudocode (both throw clauses), JSDoc, AC-10 (binds the `updateWelford` throw; the `initialWelfordState(d < 1)` throw is not AC-bound at R04 — covered by Implementer compile-time defense via pseudocode), F-4 failure mode | ✅ Throw-on-mismatch consistent. The `initialWelfordState(d < 1)` throw is documented in pseudocode but not AC-bound (corner-case; production caller is unlikely to pass d < 1; acceptable residual). |
| Naive-reference scope | `naiveMean` + `naiveSampleCovariance` + `welfordOf` + `maxAbs` defined INLINE in `test/q04-welford-stats.test.ts`; NOT exported from `engine/per-shard/welford.ts`; NOT moved to `test/_substrate/` | Delta 2 pseudocode (defines them inline at top of test file), OQ-3 disposition (explicit "do NOT extract"), § Mechanism primitive 1 (Welford is the production algorithm; naive is for cross-check only) | ✅ Naive helpers consistently scoped to test file. No alternate export sites. |
| TDD ordering | Two-commit sequence (RED = q04 test file; GREEN = welford.ts + q03 test updates [Delta 3]) | § Per-file pseudocode warm-start... wait — § Per-file pseudocode welford.ts + q04 + q03 test sections; Implementer note 4 (welford.ts section); Implementer note 6 + 7 (q03 section); AC-14 | ✅ Two-commit RED-GREEN consistent. Implementer note 4 prescribes the commit boundary explicitly. Delta 3 (q03 updates) bundled into GREEN (not separate intermediate commit) because the AC-12 + AC-13 tests depend on observeSample which is R03-shipped (not on R04 production code); they pass before AND after the GREEN commit. Bundling matches R03's "q01/q02 updates in GREEN" precedent. |
| Anti-scope vs sibling-module separation | Welford module is SIBLING to warm-start.ts under `engine/per-shard/`; warm-start.ts is NOT modified; observeSample does NOT call updateWelford at R04 | § Mechanism primitive 4, § Anti-scope R04-SAS-2 (no warm-start.ts modification), R04-SAS-3 (no mean_delta computation), R04-SAS-4 (no accumulator strategy), § Integration points (zero coupling), OQ-5, P3.9 disposition table | ✅ Sibling-module separation honored throughout. No spec section implies integration; no AC binds an integration property; no pseudocode shows observeSample calling welford. |
| R03 carry-forward bundling | MINOR-1 + MINOR-5 + OBS-2 bundled (q03 surface); MINOR-2 + MINOR-3 + MINOR-4 consumed as architect-discipline reinforcements (no test surface); OBS-1 + OBS-3 + OBS-4 + OBS-5 deferred (no R04 surface) | § Mechanism carry-forward block, § Anti-scope R04-SAS-21, § Open questions (none of these are surfaced as R04 OQ — they are dispositioned in carry-forward block), AC-12 + AC-13 + Delta 3c | ✅ Carry-forward dispositions consistent across spec. Three closures map 1:1 to AC-12 / AC-13 / Delta 3c. Three architect-discipline reinforcements consumed (documented in carry-forward block; not surfaced as ACs). Four orthogonal-concern OBS items deferred with rationale per item. |
| File creation track-state | `engine/per-shard/welford.ts` + `test/q04-welford-stats.test.ts` are NEW (verified by `git ls-files engine/per-shard test/q04-welford-stats.test.ts` → `engine/per-shard/warm-start.ts` only); `engine/per-shard/` directory ALREADY EXISTS (R03-created) | § Component inventory "Created" rows + directory-creation note, R03 OBS-2 carry-forward discussion in § Mechanism carry-forward block (file-creation analog of file-deletion track-state) | ✅ Track-state verified ahead of time per R02 OBS-2 reinforcement; no `mkdir engine/per-shard/` step needed (directory exists from R03); `git add engine/per-shard/welford.ts` succeeds. |

**Cross-section consistency pass: PASS.** 12 resolved-decision checks executed; no contradictions detected between resolved decisions and downstream sections. Fourth consecutive application of the R01-derived reinforcement.

---

## Grilling output (pre-emit adversarial self-review)

Per `CLAUDE-COMMON.md` pre-emit-grilling discipline; per CLAUDE-ARCHITECT.md grilling reinforcement (including R02 OBS-3 type-declaration-site + R03 MINOR-2 grep-pattern-soundness + R03 MINOR-3 re-export-chain + R03 MINOR-4 empirically-verified-counts).

- **Q: Is every claim in this artifact backed by something verifiable?** Yes. The `2160b7e` HEAD reference was confirmed by `git rev-parse HEAD` immediately before spec emission. Track-state of new file paths (`engine/per-shard/welford.ts`, `test/q04-welford-stats.test.ts`) was verified by `git ls-files engine/per-shard test/q04-welford-stats.test.ts` → only `engine/per-shard/warm-start.ts` matches at HEAD `2160b7e`. The `tsconfig.test.json` include pattern (`engine/**/*.ts` + `test/**/*.ts`) was verified by direct file read at HEAD `2160b7e` — confirms the new files are covered without tsconfig modification. PRD AC-P2 text re-read from `PRD.md:44`. R03 Reviewer MINOR/OBS IDs cited from `coordination/reviews/REVIEWER-REPORT-R03.md`. The Welford algorithm formulation (mean and M2 recurrences; sample-covariance n−1 divisor; West 1979 multivariate generalization) is canonical and citable to standard literature (Welford 1962; Knuth TAOCP Vol 2; West 1979). The AC-3 worked example (samples [0,0] + [2,4] → mean [1,2] + M2 [[2,4],[4,8]]) was hand-verified before the spec was emitted: centered = [(−1,−2), (1,2)]; outer products = [[1,2],[2,4]] + [[1,2],[2,4]] = [[2,4],[4,8]]. The AC-8 worked example (1D samples [0..9] → variance 82.5/9) was hand-verified: mean=4.5; squared deviations = [20.25, 12.25, 6.25, 2.25, 0.25, 0.25, 2.25, 6.25, 12.25, 20.25] = 82.5; /9 ≈ 9.1666. The Implementer note 5 hand-trace (samples [0,0] + [2,0] + [0,2] → mean [2/3, 2/3], M2 [[8/3, −4/3], [−4/3, 8/3]]) was hand-verified: centered = [(−2/3,−2/3), (4/3,−2/3), (−2/3,4/3)]; outer products = [[4/9,4/9],[4/9,4/9]] + [[16/9,−8/9],[−8/9,4/9]] + [[4/9,−8/9],[−8/9,16/9]] = [[24/9,−12/9],[−12/9,24/9]] = [[8/3,−4/3],[−4/3,8/3]] ✓.

- **Q: Does any part rely on an unstated assumption?** Searched. Five assumptions surfaced and resolved or explicitly fenced:
  1. _Assumption that `tsconfig.test.json` covers `engine/per-shard/welford.ts` + `test/q04-welford-stats.test.ts` without modification._ Resolution: verified at HEAD `2160b7e` by direct file read (include pattern `engine/**/*.ts` + `test/**/*.ts`); both new paths match. Implementer note 1 prescribes typecheck verification post-creation.
  2. _Assumption that the q04 test file's inline `naiveSampleCovariance` is itself correct._ Resolution: implemented from the textbook formula `cov[i][j] = sum_k (x_k[i] - mean[i]) * (x_k[j] - mean[j]) / (n - 1)`; hand-verified against the AC-3 worked example. The Welford-vs-naive cross-check (AC-4, AC-5) is the load-bearing binding; if BOTH implementations had the same bug, the cross-check would PASS while the production output was wrong. Defense: AC-3 (n=2 closed-form: mean=[1,2], M2=[[2,4],[4,8]]) is independently hand-verifiable from textbook; if both implementations had the same bug, AC-3 (no naive comparison) would still catch it.
  3. _Assumption that the Welford M2 update formula with `mean_old` left factor + `mean_new` right factor is correct for the multivariate case._ Resolution: West 1979 is the canonical reference; the formula's correctness can be cross-checked by reducing to the univariate Welford (single-dimension case), which is the standard textbook result. AC-3's hand-computed M2 = [[2,4],[4,8]] matches the formula applied to samples [0,0] + [2,4]: for the [0,0] step (n=1), deltaOld=[0,0], newMean=[0,0], all M2 contributions = 0 (m2 stays zeros). For the [2,4] step (n=2), deltaOld=[2,4], newMean=[1,2], deltaNew=[1,2]; M2[0][0] = 2*1 = 2; M2[0][1] = 2*2 = 4; M2[1][0] = 4*1 = 4; M2[1][1] = 4*2 = 8. ✓ matches.
  4. _Assumption that `JSON.stringify` is a sound serialization for the immutability check (AC-11 + AC-13)._ Resolution: WelfordState contains only `number`, `number[]`, `number[][]` (no functions, undefineds, circular refs, Date objects, etc.); PerShardResidual similarly has only number / string / boolean / array fields. JSON.stringify is deterministic in this regime modulo object-key insertion order. Concern: Number-typed fields with values like `Infinity` or `NaN` would stringify to `null` — but the Welford fixtures don't introduce these, and PerShardResidual fixtures use only finite numbers. Acceptable.
  5. _Assumption that `node --test` discovers `test/q04-welford-stats.test.js` via the existing glob `test/*.test.js`._ Resolution: the glob is top-level; the new test file is at `test/q04-welford-stats.test.ts` (top-level, no subdirectory); the `.js` companion lands at `test/q04-welford-stats.test.js` via the `pretest` tsc compilation. Verified by glob shape inspection.

- **Q: Has scope been added beyond what was requested?** Audited. The requested R04 work is "Phase 1 SLICE 2b2 per the R03 sidecar's R04 sequencing context + R03 carry-forwards." The brainstorm narrowed to SLICE 2b2-algorithm-only (Approach E selected); the carry-forwards bundled are the three q03-surface MINOR/OBS items (MINOR-1 disposition record, MINOR-5 immutability, OBS-2 strict-tier reset) that are co-located with the test files. No additional MINORs or OBS items are bundled. Integration with observeSample is explicitly fenced (R04-SAS-2, R04-SAS-3, R04-SAS-4). R02 MINOR-2 is explicitly fenced (R04-SAS-5). R03 OBS-1/3/4/5 are explicitly fenced per R04-SAS-21. No scope creep.

- **Q: Can the Implementer act on this with zero clarifying questions?** Audited as a cold reader. Each Delta has: (1) precise file path and creation/modification state; (2) pseudocode for the post-change state; (3) Implementer note(s) with verification commands. Each AC has Given/When/Then form with no ambiguous language ("correctly", "appropriately", "as needed" all banned). Anti-scope is enumerated explicitly with HALT triggers. Open questions are architect-pre-predicted with explicit "Implementer does not act on this in R04" notes. **One residual ambiguity acknowledged:** in q04 test file Delta 2, the inline helpers (`naiveMean`, `naiveSampleCovariance`, `welfordOf`, `maxAbs`) are placed at top-of-file in the pseudocode. The Implementer may reasonably choose to extract them to a separate `_helpers` block, inline them per-test, or refactor. The AC bindings (AC-1 through AC-11) test specific properties; helper placement is location-agnostic. Acceptable residual.

- **Q: Adversarial check: what would I find if I were the cold-eye Reviewer auditing this spec?** Six likely Reviewer findings pre-empted:
  1. _R04 introduces a new pure-function module that no production consumer calls — is this dead code?_ Defended in § Mechanism primitive 3 + 4 final paragraphs and § Anti-scope R04-SAS-2/3/4/5 (integration is anti-scope; the module ships for test consumption + future R05+ integration). The architectural-layer split is the rationale; the precedent (factories.ts at R03 shipped without engine consumers, justified as "amortizes substrate for R04+") is cited.
  2. _The Welford M2 update uses an asymmetric formula (mean_old left, mean_new right) — is this correct?_ Defended in Implementer note 2 + Grilling assumption 3 (hand-verified against textbook AC-3 case + West 1979 reference). The asymmetry is the West 1979 standard form; symmetric simplifications are documented as wrong (Implementer note 2 explicitly forbids them).
  3. _AC-6 numerical-stability test asserts Welford error < 1e-4 but doesn't show naive error > 1e-4 — is the property load-bearing?_ Defended in OQ-4 disposition: implementing naive solely to assert it fails adds complexity for a property documented in Welford's literature. The absolute Welford bound (< 1e-4 on shifted data around 1e8) is operationally what matters.
  4. _Why bundle q03 test additions with the new Welford module? Couldn't they be separate rounds?_ Defended in § Mechanism primitive 4: the three R03 carry-forward closures (MINOR-1 + MINOR-5 + OBS-2) co-locate naturally with q03 because they're R03-surface findings; bundling adds zero scope creep (q03 file is already being touched) and amortizes the pipeline overhead. Same precedent as R03 bundling R02 MINORs into the test files R03's factory work touched.
  5. _The q04 inline `naiveSampleCovariance` is a second implementation of the same statistic — is the cross-check tautological?_ Defended in Grilling assumption 2 + OQ-3 disposition: cross-check is load-bearing for AC-4 + AC-5; AC-3 + AC-8 provide independent closed-form verification that catches a "both implementations have the same bug" failure mode. The naive implementation is kept in-test (not exported) precisely to keep the production module's API surface narrow.
  6. _Welford state's `m2` is a d × d matrix — but for many practical use cases only the diagonal (per-dimension variance) is needed. Is the full d² storage justified?_ Defended in § Mechanism primitive 1: PRD AC-P2 + SCOPING-MEMO § 2.2 imply strict-tier full-covariance use (Family C's MMD per-cell covariance via `engine/detectors/family-c-rff.ts`; not just diagonal variance). Storage cost is d² per shard cell which at d ≈ 10-20 typical is 100-400 doubles per cell — within the SCOPING-MEMO § 4.2 R-E1 hierarchical-encoding endpoint of 1.2-1.5× single-instance. Diagonal-only optimization is a deferrable performance optimization (Phase 1 SLICE 3+ if PR-F5 measurement justifies).

- **Q: Memorial sweep — any inherited memorials apply that I haven't addressed?** Reviewed. Inherited memorials from `coordination/MEMORIAL.md:9-19` + tessera-R01/R02/R03 additions + CROSS-PROJECT-MEMORIAL:
  - **Memorial D** (architectural-layer-coverage at hypothesis-tree time): R04 brainstorm enumerated 5 candidate approaches (audit sidecar); rejected 3 with explicit weakness rationale; 1 selected/1 closely-considered. Documented in audit sidecar.
  - **Memorial F** (4 sub-rules at brief-drafting time): applies to compile-time substrate changes. R04 modifies `test/q03-warm-start-runtime.test.ts` (R03-shipped, exercises compile-time substrate via PerShardResidual fixtures). Sub-rules 1+2+3+4 consulted: file-opened (P3.3 — Welford module has zero inherited imports; q03 file's imports unchanged from R03 verification); inherited type-state cited (PerShardResidual at config.ts:860-880 already verified at R03 — no new type instantiation); candidate-set enumeration (5 approaches); no narrowing of stakeholder requirements (SLICE 2 → SLICE 2b2 narrowing explicitly documented).
  - **No-skip-policy on statistical-invariant tests**: R04 ships statistical-algorithm tests (AC-4 cross-check; AC-5 cross-check; AC-6 numerical-stability bound; AC-8 sample-covariance convention). These are deterministic property tests on numerical accuracy — NOT Ville / martingale / e-value invariants (which would fall under the no-skip policy specifically). The no-skip policy is preserved by absence-of-violation (no `.skip` / `xfail` / `it.todo` in any R04 test).
  - **R01 ARCHITECT cross-section consistency reinforcement**: executed in dedicated § Cross-section consistency pass section (12 resolved-decision checks all PASS — fourth consecutive application; the cross-section pass is now standard discipline).
  - **R02 ARCHITECT type-declaration-site reinforcement** (REINFORCED 2026-05-16 from R02 OBS-3): applied trivially-by-absence at R04 — the Welford module has ZERO inherited type imports (operates on `number[]` / `number[][]` primitives). q03 test file modifications use only previously-verified imports.
  - **R02 ARCHITECT file-deletion track-state reinforcement** (REINFORCED 2026-05-16 from R02 OBS-2): R04 has no deletions; the parallel discipline (verify file existence before prescribing creation paths) was applied — `git ls-files` confirmed `engine/per-shard/welford.ts` and `test/q04-welford-stats.test.ts` do not exist at HEAD `2160b7e`; `engine/per-shard/` directory exists (warm-start.ts present).
  - **R03 ARCHITECT re-export-chain-check reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-3): applied trivially-by-absence at R04 — Welford module has ZERO inherited imports; no re-export chain to verify.
  - **R03 ARCHITECT grep-pattern-soundness reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-2): applied at AC-design time — no grep-evidence ACs in R04 spec (the class of AC that would be vulnerable to the comment-matching pitfall is avoided entirely; test-binding evidence + binding-command attestation replace the role).
  - **R03 ARCHITECT empirically-verified-test-count reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-4): applied at AC-design time — AC-16 does NOT pre-state per-file test counts; Implementer reports OBSERVED output. Baseline counts documented in AC-16 prose (informational; not AC-bound) come from R03 Reviewer's empirically-verified count at HEAD `e698c20` (no code changes since at HEAD `2160b7e`).

- **Grilling pass: PASS.** Spec is ready for routing.

---

_For brainstorm full rationale (5 approaches, why-picked / why-rejected), R04-specific pre-route discipline application (skills 14 + 15 + memorial sweep + tier-rubric verdict), architect pre-predictions on outcomes, and Q-R04 → Q-R05 sequencing context, see `Q-R04-SPEC-AUDIT.md`._
