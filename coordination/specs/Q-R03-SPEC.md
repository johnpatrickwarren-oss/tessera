# Q-R03-SPEC — Phase 1 SLICE 2b1: warm-start confidence-tier state machine + test substrate factory + R02 carry-forward closures (v0.1)

_From: Architect (R03 pipeline run; per-role CLAUDE.md split active per `c8f8ba7`)._
_To: Implementer._
_Date: 2026-05-16._
_Foundation: PRD.md AC-P2 → SCOPING-MEMO-v0.3.md § 3 Phase 1 SLICE 2 row + § 2.2 Extension 2; R02 spec `coordination/specs/Q-R02-SPEC.md`; R02 Reviewer report `coordination/reviews/REVIEWER-REPORT-R02.md` (0 CRITICAL + 0 MAJOR + 5 MINOR + 5 OBS); R02 Memorial accretion `coordination/MEMORIAL.md:145-246`; current code state at HEAD `aab9d37`._
_Audit sidecar: `coordination/specs/Q-R03-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, sequencing context)._
_Tier: full (A2 + A4 + A7 fire — see audit sidecar; rubric verdict recorded)._

---

## Spec

R03 narrows SCOPING-MEMO § 3's "Phase 1 SLICE 2 — Warm-start cold-start mechanism" to **SLICE 2b1 — confidence-tier state machine (pure function) only**. R03 ships a pure-function `observeSample` runtime operating on `PerShardResidual`: it increments `n_samples`, transitions `confidence` per the two thresholds (n ≥ 20 → `'warm_start'`; n ≥ 60 → `'strict'`), refreshes `residual_seed_hash` + `last_observed_at`, and resets the residual when the baseline-aggregate seed changes. R03 also ships a TypeScript test-substrate factory (`test/_substrate/factories.ts`) which closes R02 MINOR-3 (`as any` cast on `CellKey` literals → factory call) and provides the typed builders that all subsequent runtime rounds will consume. R03 bundles R02 MINOR-1 / MINOR-4 / MINOR-5 (`@ts-expect-error` sibling for mandatory-ness; `Pick<CompiledConfig, …>` revert; bidirectional cardinality binding via `Record<typedef, true>`) as opportunistic test-binding closures co-located with the factory work.

R03 explicit anti-scope (deferred to R04 SLICE 2b2 onward): statistical-residual computation (`mean_vector` / `covariance` / `mean_delta` via Welford or any online algorithm); compiled-artifact JSON loader + round-trip serialization; PR-F5 empirical storage-profile measurement at synthetic N=1000 fleet; orchestrator vendoring; integration of `observeSample` into any consumer surface. The architectural-layer-split rationale matches R02's: SLICE 2 = compile-time schema (R02) → state-machine runtime (R03) → statistical-residual runtime (R04) → compiled-artifact + empirical-storage (R05); each sub-slice is tight, mechanical, TDD-verifiable, and right-sized for a single Implementer session.

The slice closes when (per § Acceptance criteria): (a) `engine/per-shard/warm-start.ts` exists and exports `observeSample`, `initialPerShardResidual`, `WARM_START_THRESHOLD = 20`, `STRICT_UPGRADE_THRESHOLD = 60`, and the `SampleObservation` interface per § Mechanism Delta 1; (b) `test/_substrate/factories.ts` exists and exports `makeCellKey`, `makePerShardResidual`, `makePerShardCell`, `makeBaselineCellEntry` per Delta 2; (c) `test/q03-warm-start-runtime.test.ts` exists with eleven test cases binding the state-machine behavior per Delta 3; (d) `test/q02-schema-extension.test.ts` updated to replace `as any` cast with `makePerShardCell`/`makeCellKey` call, add `@ts-expect-error` sibling for mandatory-ness (MINOR-1), and switch AC-4/AC-5 to `Record<typedef, true>` exhaustiveness binding (MINOR-5) per Delta 4; (e) `test/q01-schema-additions.test.ts` updated to replace `as any` cast with factory call (MINOR-3) and revert `as CompiledConfig` to `Pick<CompiledConfig, 'per_shard_cells'>` (MINOR-4) per Delta 5; (f) Tessera-side `tsc` clean compile via `tsconfig.test.json`; (g) all six binding commands pass (typecheck + four pre-existing q01 + q02 test files + the betting-e-process smoke test + the new q03 test file).

Traces to PRD AC-P2 ("warm-start `cell_confidence` enables alerts within 20 per-shard samples; strict-upgrade at 60 samples preserves inherited single-instance behavior") at the state-machine layer (alert emission is orchestrator scope per R02-SAS-5 carry-forward; R03 ships the per-shard confidence transition that makes alerts possible). Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row ("Warm-start cold-start mechanism"), § 2.2 Extension 2 (sparse per-shard residual; hierarchical baseline with fleet-aggregate + per-shard delta), and R02 § Mechanism Delta 5 fields ( `n_samples` / `residual_seed_hash` / `last_observed_at` are R03's load-bearing schema dependencies — all R02-shipped).

Traces to R02 Reviewer-flagged MINOR-1 (mandatory-ness `@ts-expect-error` sibling), MINOR-3 (`as any` cast strip), MINOR-4 (`Pick<CompiledConfig, …>` revert), MINOR-5 (typedef cardinality bidirectional binding) — all four addressed by R03 Delta 4 + Delta 5. R02 MINOR-2 (sparse-encoding inverse convention) is explicitly deferred to R04 with a Notes line in § Open questions (it becomes load-bearing when statistical-residual computation lands; SLICE 2b1's state machine does not exercise the convention).

---

## Architectural mechanism

### Three architectural primitives at play

1. **State-machine semantics for the confidence tier — pure function, no statistics.** Per PRD AC-P2 + SCOPING-MEMO § 2.2 cold-start clause, `PerShardResidual.confidence` transitions through three tiers as a function of `n_samples`: `'none'` (n < 20; not yet alertable), `'warm_start'` (20 ≤ n < 60; alerts enable on `mean_delta`-based residual), `'strict'` (n ≥ 60; full single-instance-behavior preserved). The state-machine logic is deterministic and independent of statistical computation: the *count* of samples determines the tier; the *values* of samples determine `mean_delta` / `mean_vector` / `covariance` (R04 scope). Splitting the runtime along the count-vs-values axis is the natural architectural-layer boundary inside SLICE 2b — mirroring the schema-vs-runtime split between R02 (SLICE 2a) and R03 (SLICE 2b). The pure-function form makes TDD trivial: every transition is a `(input residual + observation) → output residual` pair with no hidden state.

2. **Baseline-refresh invalidation via `residual_seed_hash` mismatch.** Per R02 Delta 5: `residual_seed_hash?: string` is "opaque identifier for the fleet-aggregate baseline this residual was computed against. Enables SLICE 2b runtime to detect when a fleet-aggregate refresh invalidates a cached residual." R03 operationalizes this: when the new sample's observed-seed differs from the residual's cached seed, the residual is reset (n_samples = 1, confidence = 'none', statistical fields cleared, new seed adopted). Reset is triggered by `current.residual_seed_hash !== undefined && current.residual_seed_hash !== obs.residualSeedHash` — first-time seed assignment (residual seed undefined) is NOT a reset, it is a normal increment that adopts the seed. This two-condition guard is the architectural decision; alternatives (always-reset-on-undefined; reset-on-any-change-including-undefined-to-defined) would either dirty the cold-start path or destroy normal first-sample work.

3. **Test substrate factory as Tessera-side originals.** R02 left `as any` casts on `CellKey` literals (MINOR-3) because no typed factory existed. R03 lands the factory module (`test/_substrate/factories.ts`) and bulk-migrates the q01 + q02 + new q03 tests to factory calls. The factory is Tessera-original code (not vendored from DeploySignal); it lives under `test/_substrate/` to mark it as a non-test helper (Tessera test discovery is `test/*.test.js` top-level glob, so the `_substrate/` subdirectory is excluded from direct test invocation). The factory is the substrate-foundation that R04's statistical-residual tests + R05's compiled-config tests will also consume — landing it now amortizes the substrate work and closes the MINOR-3 immediately.

### Per-component deltas (operate on three new files + two changed test files)

- **Delta 1 — `engine/per-shard/warm-start.ts` (CREATED).** Pure-function module exposing the state machine. Exports:
  - `WARM_START_THRESHOLD: number` (constant value `20`) — sample count at which `'none' → 'warm_start'` transition fires.
  - `STRICT_UPGRADE_THRESHOLD: number` (constant value `60`) — sample count at which `'warm_start' → 'strict'` transition fires (also the cold-start direct-to-strict transition; see § P3.1 corner case).
  - `interface SampleObservation { observedAt: number; residualSeedHash: string; }` — minimal observation packet; carries only the metadata the state machine consumes (NOT the sample's numeric values — those are R04 scope).
  - `function observeSample(current: PerShardResidual, obs: SampleObservation): PerShardResidual` — pure function; returns a new residual reflecting the post-observation state.
  - `function initialPerShardResidual(): PerShardResidual` — cold-start initializer; returns `{ n_samples: 0, confidence: 'none' }` with no seed/timestamp set.
  - JSDoc block on `observeSample` explicitly documenting: (i) seed-mismatch reset semantics; (ii) preservation-of-statistical-fields semantics under stable seed; (iii) tier transition thresholds; (iv) R04-deferred residual-computation scope.

- **Delta 2 — `test/_substrate/factories.ts` (CREATED).** Test-helper module exporting typed builders. Closes R02 MINOR-3. Exports:
  - `makeCellKey(overrides?: Partial<Record<CellDimension, string | number>>): CellKey` — default `{ hour_of_day: 0 }`; overrides merged shallowly. Note: the typed parameter is `Partial<Record<CellDimension, …>>` for self-documentation, but the return type `CellKey` is the more-permissive `Record<string, string | number>` (per `engine/types/primitives.ts:44`). The parameter constraint provides developer ergonomics; the return type matches the schema.
  - `makePerShardResidual(overrides?: Partial<PerShardResidual>): PerShardResidual` — default cold-start state `{ n_samples: 0, confidence: 'none' }`.
  - `makePerShardCell(overrides?: Partial<PerShardCell>): PerShardCell` — default `{ shard_id: 'shard-0', key: makeCellKey(), residual: makePerShardResidual() }`.
  - `makeBaselineCellEntry(overrides?: Partial<BaselineCellEntry>): BaselineCellEntry` — default `{ key: makeCellKey(), n_samples: 0, confidence: 'none' }`. Provided for R04 + R05 consumption; SLICE 2b1 tests do not directly need it, but landing it now avoids the R02 MINOR-3-class drift where a needed factory was missing.

- **Delta 3 — `test/q03-warm-start-runtime.test.ts` (CREATED).** Eleven test cases (one per AC-1 through AC-11) binding the state-machine deltas. RED-first per § AC-12 TDD ordering.

- **Delta 4 — `test/q02-schema-extension.test.ts` (CHANGED).** Three sub-deltas:
  - 4a: Replace the `as any` cast on `key` at line 39 with `makeCellKey({ hour_of_day: 14, day_of_week: 3 })` (closes R02 MINOR-3 for q02).
  - 4b: Add an `@ts-expect-error`-marked sibling test next to AC-1 verifying that omission of `n_samples` from a `PerShardResidual` literal fails tsc (closes R02 MINOR-1).
  - 4c: Replace the AC-4 and AC-5 cardinality assertions (which currently use `array.length === 7 / === 5` one-directional binding) with `Record<CellDimension, true>` and `Record<CellConfidence, true>` literals (closes R02 MINOR-5 — bidirectional cardinality: removal AND addition both surface as tsc errors).

- **Delta 5 — `test/q01-schema-additions.test.ts` (CHANGED).** Two sub-deltas:
  - 5a: Replace the two `as any` casts on `key` at lines 53-54 with `makeCellKey({ hour_of_day: 0 })` / `makeCellKey({ hour_of_day: 1 })` (closes R02 MINOR-3 for q01).
  - 5b: Revert the `as CompiledConfig` widening at line 56 back to `Pick<CompiledConfig, 'per_shard_cells'>` form (closes R02 MINOR-4 — restores R01's narrower binding without masking future CompiledConfig regressions).

### Carry-forward dispositions from R02 (architectural-level only; this spec text is the disposition record)

- **R02 MINOR-1 disposition — `@ts-expect-error` sibling for mandatory-field bindings.** Delta 4b lands the sibling test. Closes the gap that AC-1's runtime test asserts the field can be SET but does not directly verify tsc rejects omission. The `// @ts-expect-error` directive is the standard TypeScript pattern: if `n_samples` were ever changed to optional, the directive itself becomes an error ("Unused @ts-expect-error directive"). Bidirectional binding established.

- **R02 MINOR-3 disposition — `as any` cast strip via typed factory.** Delta 4a + Delta 5a land the factory-call migration. The factory return-types satisfy the actual schema (verified — `CellKey` at `engine/types/primitives.ts:44` is `Record<string, string | number>`; the literal `{ hour_of_day: 14, day_of_week: 3 }` produced by `makeCellKey` assigns cleanly without any cast). R02 OBS-3 (Architect spec mis-predicted CellKey shape) is also dispositioned via this delta: the factory is the long-term source of truth and removes the per-test-site shape-prediction surface.

- **R02 MINOR-4 disposition — `as CompiledConfig` revert to `Pick<CompiledConfig, 'per_shard_cells'>`.** Delta 5b reverts the incidental widening. The narrower form preserves tsc's required-field check for unrelated CompiledConfig members, which matters for future regression detection. The change is mechanical: at q01 line 56, replace `const cfg: CompiledConfig = { per_shard_cells: cells } as CompiledConfig;` with `const cfg: Pick<CompiledConfig, 'per_shard_cells'> = { per_shard_cells: cells };` (no cast needed; the object literal exactly matches the `Pick`-narrowed shape).

- **R02 MINOR-5 disposition — bidirectional cardinality binding via `Record<typedef, true>`.** Delta 4c lands the mapped-type pattern. Member removal: any key dropped from the literal becomes "Property 'X' does not exist on type ..." Member addition: any new typedef member becomes "Property 'newDim' is missing in type ... but required in type 'Record<...>...'." Both directions enforced at compile time. The runtime `Object.keys(...).length === 7` survives as a sanity check and provides the AC's "Then" runtime witness, but the load-bearing binding is the mapped-type literal.

- **R02 MINOR-2 disposition — sparse-encoding inverse convention.** Explicitly DEFERRED to R04. SLICE 2b1's state machine does not compute `mean_vector` / `covariance` / `mean_delta`; the convention "warm_start → mean_delta present, mean_vector + covariance absent" becomes load-bearing only when R04's statistical-residual runtime populates these fields. Two viable enforcement options at R04 (discriminated-union refactor; runtime invariant assertion) — R03 surfaces neither; the R04 architect picks. See § Open questions OQ-2.

- **R02 OBS-2 disposition — `git rm` vs `rm -f` track-state mismatch.** R03 has no file deletions, so OBS-2 has no surface to repair at R03. The lesson is memorialized in `CLAUDE-ARCHITECT.md` REINFORCED 2026-05-16; R03 § Per-file pseudocode applies the discipline by verifying file existence before prescribing creation paths (greater applicability in the inverse direction here — verifying `engine/per-shard/` and `test/_substrate/` do not exist before prescribing `mkdir + create`; verified at HEAD `aab9d37` via `git ls-files engine/per-shard test/_substrate` → empty output).

- **R02 OBS-4 disposition — PRD vocabulary `cell_confidence` ≠ code field `confidence`.** Out of R03 scope (PRD edits are operator-owned, not Architect-routed). Surfaced as § Open questions OQ-3.

- **R02 OBS-1 disposition — MEMORIAL.md inaccuracy about `cell_confidence` in `.ts` source.** Documentation drift only; no code surface to repair. No R03 action.

### Integration points

- **`engine/per-shard/warm-start.ts` ↔ `engine/types/config.ts`.** The state-machine module imports `PerShardResidual` (only) from the schema. No imports from inherited engine code beyond the type. No reverse imports — inherited engine code does not consume `observeSample` at SLICE 2b1 (consumers will be R04 orchestration scope and beyond). Verifiable by `grep -rn "from '.*per-shard/warm-start'" engine/` → 0 matches outside the new directory's own files.

- **`test/_substrate/factories.ts` ↔ `engine/types/config.ts` + `engine/types/primitives.ts`.** Factories import `CellKey`, `CellDimension`, `CellConfidence`, `PerShardResidual`, `PerShardCell`, `BaselineCellEntry` from `../engine/types/config` (which re-exports `CellKey` through its own import from `./primitives`). The actual `CellKey` declaration site is `engine/types/primitives.ts:44` (`Record<string, string | number>`); the factory's parameter constraint uses `Partial<Record<CellDimension, string | number>>` which is a strict subset of `CellKey`. tsc-level: the factory returns `Record<string, string | number>` which is assignable to `CellKey` and accepted at every consumer call site.

- **`test/q03-warm-start-runtime.test.ts` ↔ `engine/per-shard/warm-start.ts` + `test/_substrate/factories.ts`.** Eleven tests bind the eleven ACs; each test imports the state machine + relevant factory builders. No imports from production engine code beyond the warm-start module + schema types.

- **`test/q02-schema-extension.test.ts` ↔ `test/_substrate/factories.ts`.** Delta 4a swaps `as any` for `makePerShardCell` / `makeCellKey`. Other R02 tests in the file are unchanged.

- **`test/q01-schema-additions.test.ts` ↔ `test/_substrate/factories.ts`.** Delta 5a swaps `as any` for `makePerShardCell` / `makeCellKey`. Delta 5b reverts `as CompiledConfig` to `Pick<…>`. Other R01 tests in the file are unchanged.

### Failure modes (each handled by an AC or anti-scope clause)

- **F-1: Threshold-crossing off-by-one.** The natural risk in any threshold state machine. Handled by AC-5 (binding `n=19 → n=20` produces `confidence='warm_start'`) and AC-6 (binding `n=18 → n=19` keeps `confidence='none'`) — both inclusive-boundary verification cases. AC-7 binds the same for the strict-upgrade threshold.
- **F-2: Terminal-state demotion.** A future code edit could accidentally allow `'strict' → 'warm_start'` regression when n keeps incrementing. Handled by AC-8 (binding `n=200` → `n=201` stays `'strict'`) — terminal-state preservation forward direction. The inverse direction (state-machine cannot accept an externally-mutated residual with `n=10, confidence='strict'` and demote it) is bounded by the function's stateless nature; the spec note in § Mechanism primitive 1 explicitly disclaims this case.
- **F-3: Seed-mismatch reset wipes statistical fields.** Handled by AC-9 (binding seed-mismatch case verifies `mean_delta`/`mean_vector`/`covariance` cleared in the post-reset residual). Without this clearing, stale statistics survive across baseline-refresh boundaries — the bug class R02 § Mechanism primitive #2 anticipated.
- **F-4: First-time seed assignment misclassified as reset.** Handled by AC-10 (binding fresh residual + first seed → `n=1`, not reset to `n=0`+`+1`). Distinguishes initial-seed-adoption from seed-change-detection.
- **F-5: Statistical-field preservation across stable-seed observations.** Handled by AC-11 (binding `mean_delta` value preserved through `observeSample` when seed stable). Without this, R04's statistical-residual runtime would lose state every tick.
- **F-6: Factory-vs-actual-schema drift.** Tests using factories assume the factory output satisfies the schema. Handled by tsc compile (AC-13) — every factory output is type-checked at every call site.

### Anti-scope (this round; full enumeration in § Anti-scope below)

R03 does NOT ship: statistical-residual computation (`mean_vector` / `covariance` / `mean_delta`); orchestrator integration of `observeSample`; compiled-artifact JSON loader; PR-F5 storage measurement; any new detector or `engine/`-side vendoring beyond what was already vendored at R01/R02; any modification to inherited vendored engine internals (R01-vendored, A12 inherited); any modification to `tools/vendor-from-deploysignal.sh` (R02 OQ-1 deferred); any modification to `q01-vendoring-coverage.test.ts` iteration list (R02 OQ-2 deferred); any modification to `tsconfig.json` / `tsconfig.test.json` / `package.json` (R02-SAS-6 carry-forward); any PRD edit (R02 OBS-4 deferred to operator-routed revision).

---

## Component inventory

| State | Path | Note |
|---|---|---|
| Exists (unchanged) | `engine/detectors/**/*.ts` (12 files) | Vendored at-pin; A12 preserved |
| Exists (unchanged) | `engine/types/families/**/*.ts` (5 files) | Vendored at-pin |
| Exists (unchanged) | `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/verdict-groups.ts` | Vendored at-pin |
| Exists (unchanged) | `engine/types/{verdict,primitives,metrics,orchestration,policy,audit,self-normalized-fallback,index,agent}.ts` (9 files) | Vendored at-pin |
| Exists (unchanged) | `engine/types/config.ts` | R01/R02 schema deltas already shipped; R03 does NOT modify (read-only by factories + warm-start module) |
| Exists (unchanged) | `engine/l0/schema-continuity.ts`, `engine/o0/{lifecycle-events,reversibility-source,reversibility-translator}.ts` | Vendored at-pin |
| Exists (unchanged) | `tools/vendor-from-deploysignal.sh` | R02 OQ-1 deferred |
| Exists (unchanged) | `package.json`, `tsconfig.json`, `tsconfig.test.json` | R02-SAS-6 carry-forward |
| Exists (unchanged) | `test/q01-vendoring-coverage.test.{ts,js}`, `test/q01-no-at-pin-deltas.test.{ts,js}`, `test/betting-e-process-class-dispatch.test.{ts,js}` | Pass post-R02 at `aab9d37` |
| Exists (unchanged) | `coordination/VENDORING-MANIFEST.md` | R03 adds no vendored files; new R03 files are Tessera-originals (not in manifest by convention — manifest is "files vendored from DeploySignal") |
| Changed | `test/q01-schema-additions.test.ts` | Delta 5a (factory call) + Delta 5b (Pick<…> revert) |
| Changed | `test/q02-schema-extension.test.ts` | Delta 4a (factory call) + Delta 4b (`@ts-expect-error` sibling) + Delta 4c (Record<typedef, true>) |
| Created | `engine/per-shard/warm-start.ts` | Delta 1: pure-function state machine + thresholds + initializer + SampleObservation |
| Created | `test/_substrate/factories.ts` | Delta 2: typed builders |
| Created | `test/q03-warm-start-runtime.test.ts` | Delta 3: 11 AC tests |

**Directory creation:** `engine/per-shard/` and `test/_substrate/` do not exist at HEAD `aab9d37` (verified by `git ls-files engine/per-shard test/_substrate` → empty output); Implementer creates them as part of Delta 1 + Delta 2 file creation (no explicit `mkdir` step needed — `git add` of a file in a new directory implicitly creates the directory).

**Manifest cross-check:** 2 files modified (q01-schema-additions.test.ts + q02-schema-extension.test.ts; their `.js` companions regenerate via `pretest` hook) + 3 files created (warm-start.ts + factories.ts + q03-warm-start-runtime.test.ts; their `.js` companions also auto-generate) = 5 surfaces of change. No files touched outside this inventory. No deletions. No vendored-file modifications.

---

## Per-file pseudocode

### File: `engine/per-shard/warm-start.ts` (created — Delta 1)

```typescript
// engine/per-shard/warm-start.ts — Tessera SLICE 2b1: per-shard confidence-tier state machine.
//
// Pure-function transitions for the (n_samples, confidence) state machine on
// PerShardResidual entries. Does NOT compute mean_delta / mean_vector / covariance —
// statistical-residual computation is SLICE 2b2 (R04) scope.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared
// npm package at Tessera Phase 2 close alongside the vendored engine subset.

import type { PerShardResidual } from '../types/config';

/** Sample count at which a 'none'-tier residual transitions to 'warm_start'.
 *  Per PRD AC-P2 + SCOPING-MEMO § 2.2: alerts enable at n ≥ 20. */
export const WARM_START_THRESHOLD = 20;

/** Sample count at which a residual transitions to 'strict'.
 *  Per PRD AC-P2: strict-upgrade at n ≥ 60 preserves inherited single-instance
 *  behavior. A residual with current confidence === 'none' jumping directly past
 *  the warm_start threshold (e.g., n_samples preserved at 80 from a stable seed
 *  but with old confidence === 'none') also transitions directly to 'strict' —
 *  see § P3.1 corner case for cold-start-direct-to-strict. */
export const STRICT_UPGRADE_THRESHOLD = 60;

/** Minimal per-sample observation packet consumed by the state machine.
 *  Carries metadata only; sample numeric values are SLICE 2b2 scope. */
export interface SampleObservation {
  /** Unix epoch milliseconds when the sample was observed. */
  observedAt: number;
  /** Opaque identifier of the fleet-aggregate baseline this sample's
   *  residual will be computed against. Mismatch with the residual's
   *  cached residual_seed_hash triggers reset (baseline-refresh invalidation). */
  residualSeedHash: string;
}

/** Cold-start initializer — returns an empty PerShardResidual at confidence='none'.
 *  Use this when allocating a new (shard, cell) entry that has not yet observed
 *  any samples. */
export function initialPerShardResidual(): PerShardResidual {
  return { n_samples: 0, confidence: 'none' };
}

/**
 * Pure-function state-machine transition for PerShardResidual when a new sample
 * is observed at the (shard, cell).
 *
 * Behavior:
 *   1. Baseline-refresh detection: if current.residual_seed_hash is defined AND
 *      differs from obs.residualSeedHash, the residual is reset (n_samples=1,
 *      confidence='none', statistical fields cleared, new seed adopted, timestamp
 *      adopted). First-time seed assignment (current.residual_seed_hash undefined)
 *      is NOT a reset — the residual adopts the seed via the normal increment path.
 *
 *   2. Normal increment: n_samples += 1; confidence transitions per thresholds
 *      (newN ≥ STRICT_UPGRADE_THRESHOLD → 'strict'; newN ≥ WARM_START_THRESHOLD →
 *      'warm_start'; else → 'none'); residual_seed_hash + last_observed_at refreshed
 *      from obs; statistical fields (mean_vector, covariance, mean_delta) preserved
 *      verbatim from current (NOT recomputed at SLICE 2b1; R04 layers Welford on top).
 *
 *   3. Terminal-state preservation: once confidence === 'strict', subsequent samples
 *      (under stable seed) keep confidence at 'strict'; the threshold ladder is
 *      monotone in n_samples and 'strict' is the terminal tier emitted by the state
 *      machine. ('pooled' and 'aggregate' are L3-pooling outputs on the fleet-aggregate
 *      baseline, not state-machine outputs on the per-shard residual — see § Open
 *      questions OQ-1.)
 *
 * Returned residual is a NEW object; current is not mutated. Safe to use under shared
 * reference semantics.
 */
export function observeSample(
  current: PerShardResidual,
  obs: SampleObservation,
): PerShardResidual {
  const seedChanged =
    current.residual_seed_hash !== undefined &&
    current.residual_seed_hash !== obs.residualSeedHash;

  if (seedChanged) {
    // Reset: discard accumulated state. The new sample counts as the first under
    // the new seed (n=1, not n=0); confidence='none' regardless of what it was.
    return {
      n_samples: 1,
      confidence: 'none',
      residual_seed_hash: obs.residualSeedHash,
      last_observed_at: obs.observedAt,
      // mean_vector / covariance / mean_delta intentionally absent (object spread
      // would copy from current; explicit construction omits them).
    };
  }

  const newN = current.n_samples + 1;
  const newConfidence: 'none' | 'warm_start' | 'strict' =
    newN >= STRICT_UPGRADE_THRESHOLD ? 'strict'
    : newN >= WARM_START_THRESHOLD ? 'warm_start'
    : 'none';

  return {
    ...current,
    n_samples: newN,
    confidence: newConfidence,
    residual_seed_hash: obs.residualSeedHash,
    last_observed_at: obs.observedAt,
  };
}
```

**Implementer note 1 (mandatory):** Verify constants. After landing the file, run `grep -n "WARM_START_THRESHOLD = 20" engine/per-shard/warm-start.ts` → expect 1 match. `grep -n "STRICT_UPGRADE_THRESHOLD = 60" engine/per-shard/warm-start.ts` → expect 1 match. PRD AC-P2 names these literals; getting the value wrong is a load-bearing bug.

**Implementer note 2 (mandatory):** Verify imports. The module imports `PerShardResidual` from `../types/config`. Run `grep -n "from '\\.\\./types/config'" engine/per-shard/warm-start.ts` → expect 1 match. No other imports from engine code (the state machine is self-contained at SLICE 2b1).

**Implementer note 3 (verification):** After landing, run `npm run typecheck` → exit 0. If tsc complains about `'none' | 'warm_start' | 'strict'` not assignable to `CellConfidence`, the literal-union narrowing is incorrect; check `engine/types/config.ts:850-852` for the full `CellConfidence` typedef and adjust the local type annotation (the three-member subset must be a structural subset of CellConfidence — `strict` ⊆ `'strict'|'pooled'|'aggregate'|'none'|'warm_start'` etc. — this should hold by construction).

### File: `test/_substrate/factories.ts` (created — Delta 2)

```typescript
// test/_substrate/factories.ts — Tessera SLICE 2b1 test substrate.
//
// Typed builders for schema instances. Closes R02 MINOR-3 (replaces `as any` casts
// on CellKey literals). Consumed by q01 + q02 + q03 test files; will be the foundation
// for R04 statistical-residual tests + R05 compiled-config-loader tests.
//
// Naming convention: make<TypeName>(overrides?) → TypeName. Defaults represent the
// cold-start / minimal-valid instance; overrides are shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal). Lives under test/_substrate/
// (underscore prefix marks the directory as a non-test helper — Tessera test discovery
// is the top-level glob `test/*.test.js`, so files here are not run as tests directly).

import type {
  CellKey,
  CellDimension,
  PerShardResidual,
  PerShardCell,
  BaselineCellEntry,
} from '../../engine/types/config';

/**
 * Build a CellKey with optional dimension overrides. Default carries
 * `hour_of_day: 0`; overrides are shallow-merged.
 *
 * Note on shape: CellKey is `Record<string, string | number>` (per
 * engine/types/primitives.ts:44) — more permissive than the spec-vocabulary
 * dimension set. The parameter constraint `Partial<Record<CellDimension, …>>`
 * provides developer ergonomics + self-documentation; the return type satisfies
 * the more-permissive `CellKey` for assignment at consumer call sites.
 */
export function makeCellKey(
  overrides: Partial<Record<CellDimension, string | number>> = {},
): CellKey {
  return { hour_of_day: 0, ...overrides };
}

/**
 * Build a PerShardResidual. Default is cold-start state:
 * `{ n_samples: 0, confidence: 'none' }` (all optional fields absent).
 */
export function makePerShardResidual(
  overrides: Partial<PerShardResidual> = {},
): PerShardResidual {
  return { n_samples: 0, confidence: 'none', ...overrides };
}

/**
 * Build a PerShardCell. Defaults: shard_id='shard-0', key from makeCellKey(),
 * residual from makePerShardResidual().
 */
export function makePerShardCell(
  overrides: Partial<PerShardCell> = {},
): PerShardCell {
  return {
    shard_id: 'shard-0',
    key: makeCellKey(),
    residual: makePerShardResidual(),
    ...overrides,
  };
}

/**
 * Build a BaselineCellEntry (fleet-aggregate cell). Defaults: cold-start
 * equivalent (`n_samples: 0`, `confidence: 'none'`). Provided for R04 + R05
 * consumption — SLICE 2b1 tests do not directly need it.
 */
export function makeBaselineCellEntry(
  overrides: Partial<BaselineCellEntry> = {},
): BaselineCellEntry {
  return {
    key: makeCellKey(),
    n_samples: 0,
    confidence: 'none',
    ...overrides,
  };
}
```

**Implementer note 4 (mandatory):** Verify each factory at instantiation. After landing, write a one-time sanity script (or use an interactive `npm run typecheck`) to confirm all four factories satisfy their declared return types. The expected verification is implicit (tsc clean compile of the file = all factories well-formed); no separate command beyond `npm run typecheck`.

**Implementer note 5 (verification):** Verify the directory path resolves correctly. `import { … } from '../../engine/types/config'` should resolve from `test/_substrate/factories.ts` to `engine/types/config.ts` (two `..` levels up). If tsc complains about the relative path, the file was placed in the wrong location; verify creation at `test/_substrate/factories.ts` (not `test/factories.ts` or `engine/_substrate/factories.ts`).

### File: `test/q03-warm-start-runtime.test.ts` (created — Delta 3)

Eleven test cases, one per AC-1 through AC-11. RED-first per § AC-12 TDD ordering: the test file is committed FIRST in a RED state (the import of `../engine/per-shard/warm-start` fails because the file doesn't exist yet; tsc rejects). After the RED commit, Delta 1 lands and the imports resolve → GREEN.

```typescript
// test/q03-warm-start-runtime.test.ts — R03 AC-1 through AC-11.
//
// Binds the SLICE 2b1 warm-start confidence-tier state machine at
// engine/per-shard/warm-start.ts. Eleven test cases; each maps to one R03 AC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  observeSample,
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '../engine/per-shard/warm-start';
import { makePerShardResidual } from './_substrate/factories';

test('R03 AC-1 — initialPerShardResidual returns cold-start state', () => {
  const r = initialPerShardResidual();
  assert.strictEqual(r.n_samples, 0);
  assert.strictEqual(r.confidence, 'none');
  assert.strictEqual(r.residual_seed_hash, undefined);
  assert.strictEqual(r.last_observed_at, undefined);
  assert.strictEqual(r.mean_vector, undefined);
  assert.strictEqual(r.covariance, undefined);
  assert.strictEqual(r.mean_delta, undefined);
});

test('R03 AC-2 — observeSample increments n_samples and refreshes seed/timestamp', () => {
  const current = initialPerShardResidual();
  const next = observeSample(current, { observedAt: 1000, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.last_observed_at, 1000);
  assert.strictEqual(next.residual_seed_hash, 'sha:a');
  assert.strictEqual(next.confidence, 'none');  // below WARM_START_THRESHOLD
});

test('R03 AC-3 — WARM_START_THRESHOLD equals 20 (PRD AC-P2 literal)', () => {
  assert.strictEqual(WARM_START_THRESHOLD, 20);
});

test('R03 AC-4 — STRICT_UPGRADE_THRESHOLD equals 60 (PRD AC-P2 literal)', () => {
  assert.strictEqual(STRICT_UPGRADE_THRESHOLD, 60);
});

test('R03 AC-5 — confidence transitions none → warm_start at n=20 boundary', () => {
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at19, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 20);
  assert.strictEqual(next.confidence, 'warm_start');
});

test('R03 AC-6 — confidence stays none below WARM_START_THRESHOLD', () => {
  const at18 = makePerShardResidual({
    n_samples: 18,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at18, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 19);
  assert.strictEqual(next.confidence, 'none');
});

test('R03 AC-7 — confidence transitions warm_start → strict at n=60 boundary', () => {
  const at59 = makePerShardResidual({
    n_samples: 59,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at59, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 60);
  assert.strictEqual(next.confidence, 'strict');
});

test('R03 AC-8 — strict tier preserved on subsequent samples (no demotion)', () => {
  const at200 = makePerShardResidual({
    n_samples: 200,
    confidence: 'strict',
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(at200, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 201);
  assert.strictEqual(next.confidence, 'strict');
});

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
  assert.strictEqual(next.mean_vector, undefined);
  assert.strictEqual(next.covariance, undefined);
});

test('R03 AC-10 — first-time seed assignment does not trigger reset', () => {
  const fresh = initialPerShardResidual();  // no seed yet
  const next = observeSample(fresh, { observedAt: 100, residualSeedHash: 'sha:first' });
  assert.strictEqual(next.n_samples, 1);  // normal increment, not reset
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:first');
});

test('R03 AC-11 — statistical fields preserved across observeSample under stable seed', () => {
  const withStats = makePerShardResidual({
    n_samples: 30,
    confidence: 'warm_start',
    mean_delta: [0.5, 0.6, 0.7],
    residual_seed_hash: 'sha:a',
  });
  const next = observeSample(withStats, { observedAt: 100, residualSeedHash: 'sha:a' });
  assert.strictEqual(next.n_samples, 31);
  assert.strictEqual(next.confidence, 'warm_start');
  // Statistical-residual fields preserved verbatim (SLICE 2b1 does not compute
  // them; R04's Welford runtime layers on top).
  assert.deepStrictEqual(next.mean_delta, [0.5, 0.6, 0.7]);
});
```

**Implementer note 6 (mandatory — TDD):** This file is RED-first. The commit sequence is:
  - Commit 1 (RED): create `test/q03-warm-start-runtime.test.ts` and `test/_substrate/factories.ts` (the factories are imports of types only; they compile alone). The q03 test file imports from `../engine/per-shard/warm-start` which does not exist — tsc fails with "Cannot find module" + node --test fails on the file not being compilable. Verify RED state: `npm run typecheck` exits non-zero; `node --test test/q03-warm-start-runtime.test.js` fails (file does not exist or import-time error).
  - Commit 2 (GREEN): create `engine/per-shard/warm-start.ts` per Delta 1 + apply Delta 4 (q02 test updates) + apply Delta 5 (q01 test updates). All imports resolve; `npm run typecheck` exits 0; `node --test test/q03-warm-start-runtime.test.js` reports `pass 11 / fail 0`.
  - The two-commit ordering is the AC-12 TDD evidence.

### File: `test/q02-schema-extension.test.ts` (changed — Delta 4)

Delta 4a (replace `as any` cast), Delta 4b (`@ts-expect-error` sibling for AC-1), Delta 4c (Record<typedef, true> for AC-4 + AC-5). Final form below; the original 5 R02 tests are preserved verbatim except where the deltas land.

```typescript
// test/q02-schema-extension.test.ts — R02 AC-1 through AC-5 (R03-updated for MINOR-1/3/5 closures)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';
import { makePerShardCell, makeCellKey } from './_substrate/factories';

test('R02 AC-1 — PerShardResidual.n_samples is mandatory and typed number', () => {
  const r: PerShardResidual = { n_samples: 42, confidence: 'warm_start' };
  assert.strictEqual(r.n_samples, 42);
  assert.strictEqual(typeof r.n_samples, 'number');
});

test('R02 AC-1 sibling — PerShardResidual literal omitting n_samples fails tsc (closes R02 MINOR-1)', () => {
  // @ts-expect-error — n_samples is mandatory; omission must fail tsc.
  const _missing: PerShardResidual = { confidence: 'warm_start' };
  void _missing;
  // Load-bearing check is the @ts-expect-error directive: if n_samples were made
  // optional, tsc would error "Unused @ts-expect-error directive."
  assert.ok(true);
});

test('R02 AC-2 — PerShardResidual sparse encoding by confidence tier (warm_start)', () => {
  const warm: PerShardResidual = {
    n_samples: 25,
    confidence: 'warm_start',
    mean_delta: [0.1, 0.2, 0.3],
    residual_seed_hash: 'sha256:abcd',
    last_observed_at: 1747987200000,
  };
  assert.deepStrictEqual(warm.mean_delta, [0.1, 0.2, 0.3]);
  assert.strictEqual(warm.mean_vector, undefined);
  assert.strictEqual(warm.covariance, undefined);
  assert.strictEqual(warm.residual_seed_hash, 'sha256:abcd');
  assert.strictEqual(warm.last_observed_at, 1747987200000);
});

test('R02 AC-3 — PerShardCell carries shard_id + key + residual (R03: factory call)', () => {
  // R03 closes R02 MINOR-3: factory call instead of `as any` cast.
  const cell: PerShardCell = makePerShardCell({
    shard_id: 'shard-42',
    key: makeCellKey({ hour_of_day: 14, day_of_week: 3 }),
    residual: { n_samples: 100, confidence: 'strict', mean_vector: [1.0, 2.0] },
  });
  assert.strictEqual(cell.shard_id, 'shard-42');
  assert.strictEqual(cell.residual.n_samples, 100);
  assert.notStrictEqual(cell.key, undefined);
});

// R03 closes R02 MINOR-5 — bidirectional cardinality binding.
// Member removal: any key dropped from the literal → "Property 'X' does not exist on type ...".
// Member addition: any new CellDimension/CellConfidence member without a corresponding
// key here → "Property 'newMember' is missing in type ... but required in type ...".
const CELL_DIMENSION_EXHAUSTIVE: Record<CellDimension, true> = {
  hour_of_day: true,
  day_of_week: true,
  workload_class: true,
  tenant_slice: true,
  tenant_tier: true,
  region: true,
  shard_id: true,
};

test('R02 AC-4 — CellDimension typedef is exhaustively bound to 7 members', () => {
  const members = Object.keys(CELL_DIMENSION_EXHAUSTIVE) as CellDimension[];
  assert.strictEqual(members.length, 7);
  assert.strictEqual(members.includes('shard_id'), true);
});

const CELL_CONFIDENCE_EXHAUSTIVE: Record<CellConfidence, true> = {
  strict: true,
  pooled: true,
  aggregate: true,
  none: true,
  warm_start: true,
};

test('R02 AC-5 — CellConfidence typedef is exhaustively bound to 5 members', () => {
  const members = Object.keys(CELL_CONFIDENCE_EXHAUSTIVE) as CellConfidence[];
  assert.strictEqual(members.length, 5);
  assert.strictEqual(members.includes('warm_start'), true);
});
```

**Implementer note 7 (mandatory):** The `@ts-expect-error` directive is the load-bearing assertion in the AC-1 sibling test. The runtime `assert.ok(true)` is symbolic (node test runner requires at least one assertion per test). Do NOT replace the directive with a non-`// @ts-expect-error` form — the directive's "errors if unused" property is what makes the test bidirectional.

**Implementer note 8 (mandatory):** Verify the exhaustiveness check fires both directions during landing. Method: temporarily remove one member from `CELL_DIMENSION_EXHAUSTIVE` (e.g., delete `region: true`), run `npm run typecheck`, observe tsc error; restore. Then temporarily add a new key (e.g., `not_a_dim: true`), run `npm run typecheck`, observe tsc error; restore. After both verifications, the test file is in its committed final state. Document the two verification runs in the GREEN commit message (single-line OK).

### File: `test/q01-schema-additions.test.ts` (changed — Delta 5)

Delta 5a (replace `as any` casts), Delta 5b (revert `as CompiledConfig` to `Pick<…>`). Final form below; original 5 R02-revised tests preserved except where the deltas land.

```typescript
// test/q01-schema-additions.test.ts — R01 AC-3 (R02-updated for Delta 6+7; R03: factory + Pick revert)
//
// R03 changes:
//   - Replace `as any` casts on CellKey literals with makeCellKey factory (closes R02 MINOR-3).
//   - Revert `as CompiledConfig` widening to `Pick<CompiledConfig, 'per_shard_cells'>`
//     (closes R02 MINOR-4 — preserves tsc's required-field check on unrelated CompiledConfig members).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  CompiledConfig,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';
import { makePerShardCell, makeCellKey } from './_substrate/factories';

test('Q1 AC-3 Delta-1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

test('Q1 AC-3 Delta-2 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts sparse encoding', () => {
  const sparse: PerShardResidual = { n_samples: 0, confidence: 'warm_start' };
  assert.strictEqual(sparse.mean_vector, undefined);
  assert.strictEqual(sparse.covariance, undefined);
  assert.strictEqual(sparse.confidence, 'warm_start');
  assert.strictEqual(sparse.n_samples, 0);
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts strict-upgraded encoding', () => {
  const full: PerShardResidual = {
    n_samples: 60,
    mean_vector: [0, 0, 0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    confidence: 'strict',
  };
  assert.deepStrictEqual(full.mean_vector, [0, 0, 0]);
  assert.strictEqual(full.confidence, 'strict');
});

test('Q1 AC-3 Delta-4 — CompiledConfig accepts per_shard_cells field (R03: factory + Pick revert)', () => {
  // R03 closes R02 MINOR-3 (factory) + MINOR-4 (Pick<…> revert).
  const cells: PerShardCell[] = [
    makePerShardCell({
      shard_id: 'shard-0',
      key: makeCellKey({ hour_of_day: 0 }),
      residual: { n_samples: 0, confidence: 'warm_start' },
    }),
    makePerShardCell({
      shard_id: 'shard-1',
      key: makeCellKey({ hour_of_day: 1 }),
      residual: { n_samples: 60, confidence: 'strict', mean_vector: [1, 2] },
    }),
  ];
  // Pick<…> narrows the test object's required-field surface to just per_shard_cells,
  // restoring the R01-shipped binding precision after R02's incidental `as CompiledConfig` widening.
  const cfg: Pick<CompiledConfig, 'per_shard_cells'> = { per_shard_cells: cells };
  assert.strictEqual(cfg.per_shard_cells?.length, 2);
  assert.strictEqual(cfg.per_shard_cells?.[0]?.key !== undefined, true);
});
```

**Implementer note 9 (mandatory):** Verify no stale `as any` casts remain after Delta 5a. Run `grep -n "as any" test/q01-schema-additions.test.ts test/q02-schema-extension.test.ts` → expect 0 matches. (If any survive, the cast strip is incomplete.) Also verify no `as CompiledConfig` survives: `grep -n "as CompiledConfig" test/q01-schema-additions.test.ts` → expect 0 matches.

**Implementer note 10 (verification):** After all deltas land, the q01 + q02 + q03 test files all import from `./_substrate/factories` (q03) or `./_substrate/factories` (q01 + q02). Run `npm run typecheck` → exit 0. Then run `node --test test/q01-schema-additions.test.js test/q02-schema-extension.test.js test/q03-warm-start-runtime.test.js` → pass count is (5 q01) + (6 q02 — one more than R02's 5 due to the AC-1 sibling) + (11 q03) = 22 tests; 0 fail.

---

## Acceptance criteria

Every AC binds to at least one test case in `test/q03-warm-start-runtime.test.ts` (the R03-new test) or to an Implementer-side verification command. Each AC traces to one specific § Mechanism Delta or carry-forward disposition.

1. **AC-1 — `initialPerShardResidual` returns cold-start state.** Given the post-R03 `engine/per-shard/warm-start.ts`, when `initialPerShardResidual()` is invoked with no arguments, then the returned residual has `n_samples === 0`, `confidence === 'none'`, and `residual_seed_hash === last_observed_at === mean_vector === covariance === mean_delta === undefined`. Verified by `R03 AC-1` test.

2. **AC-2 — `observeSample` first-call from cold-start increments to n=1.** Given the cold-start residual, when `observeSample(cold, { observedAt: 1000, residualSeedHash: 'sha:a' })` is invoked, then the returned residual has `n_samples === 1`, `confidence === 'none'` (below WARM_START_THRESHOLD), `residual_seed_hash === 'sha:a'`, `last_observed_at === 1000`. Verified by `R03 AC-2` test.

3. **AC-3 — `WARM_START_THRESHOLD === 20`.** Given the post-R03 module, when the constant is imported, then its numeric value is exactly `20` (PRD AC-P2 literal binding). Verified by `R03 AC-3` test.

4. **AC-4 — `STRICT_UPGRADE_THRESHOLD === 60`.** Given the post-R03 module, when the constant is imported, then its numeric value is exactly `60` (PRD AC-P2 literal binding). Verified by `R03 AC-4` test.

5. **AC-5 — Tier transition `'none' → 'warm_start'` fires at the n=20 boundary.** Given a residual with `n_samples === 19` and `confidence === 'none'` and a stable seed, when `observeSample` is invoked, then the returned residual has `n_samples === 20` and `confidence === 'warm_start'`. Verified by `R03 AC-5` test.

6. **AC-6 — Tier stays `'none'` below the n=20 boundary.** Given a residual with `n_samples === 18` and stable seed, when `observeSample` is invoked, then the returned residual has `n_samples === 19` and `confidence === 'none'`. Verified by `R03 AC-6` test.

7. **AC-7 — Tier transition `'warm_start' → 'strict'` fires at the n=60 boundary.** Given a residual with `n_samples === 59`, `confidence === 'warm_start'`, stable seed, when `observeSample` is invoked, then the returned residual has `n_samples === 60` and `confidence === 'strict'`. Verified by `R03 AC-7` test.

8. **AC-8 — Strict tier is terminal under stable seed.** Given a residual with `n_samples === 200`, `confidence === 'strict'`, stable seed, when `observeSample` is invoked, then the returned residual has `n_samples === 201` and `confidence === 'strict'` (no demotion). Verified by `R03 AC-8` test.

9. **AC-9 — Seed-hash mismatch resets residual and clears statistical fields.** Given a residual with `residual_seed_hash === 'sha:old'`, `n_samples === 50`, `confidence === 'warm_start'`, `mean_delta` populated, when `observeSample` is invoked with `residualSeedHash: 'sha:new'`, then the returned residual has `n_samples === 1`, `confidence === 'none'`, `residual_seed_hash === 'sha:new'`, `last_observed_at` refreshed, AND `mean_vector === covariance === mean_delta === undefined`. Verified by `R03 AC-9` test.

10. **AC-10 — First-time seed assignment is an increment, not a reset.** Given a residual with `residual_seed_hash === undefined` (cold-start), when `observeSample` is invoked with any `residualSeedHash`, then the returned residual has `n_samples === 1` (incremented, not reset to 0 then incremented), `confidence === 'none'`, `residual_seed_hash` adopted from the observation. Verified by `R03 AC-10` test.

11. **AC-11 — Statistical fields preserved across `observeSample` under stable seed.** Given a residual with `mean_delta === [0.5, 0.6, 0.7]`, stable seed, when `observeSample` is invoked, then the returned residual's `mean_delta === [0.5, 0.6, 0.7]` (preserved verbatim — SLICE 2b1 does not recompute; SLICE 2b2 will). Verified by `R03 AC-11` test.

12. **AC-12 — TDD ordering verifiable in git history.** Given the R03 commit sequence, when `git log --oneline -- engine/per-shard/ test/_substrate/ test/q03-warm-start-runtime.test.ts` is inspected, then the RED commit (test file + factories committed before `engine/per-shard/warm-start.ts`) precedes the GREEN commit (warm-start.ts + q01/q02 test updates). Verified by Implementer attestation in NEXT-ROLE.md; Reviewer independently runs `git log --oneline` + `git show <red-sha>` for cross-verification.

13. **AC-13 — Tessera-side `tsc` clean compile via `tsconfig.test.json`.** Given the post-R03 tree, when `npm run typecheck` is invoked, then it exits zero with no warnings or errors. Verified by Implementer at commit time and disclosed in NEXT-ROLE.md "Binding command results" section.

14. **AC-14 — All R01 + R02 tests still pass.** Given the post-R03 tree, when `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js test/q02-schema-extension.test.js` is invoked, then all four test files pass with the updated assertion counts: q01-vendoring-coverage 4 / 0, q01-no-at-pin-deltas 1 / 0, q01-schema-additions 5 / 0, q02-schema-extension 6 / 0 (was 5 at R02; AC-1 sibling adds one). Total: 16 / 0. Verified by direct invocation.

15. **AC-15 — R03 new test passes.** Given the post-R03 tree, when `node --test test/q03-warm-start-runtime.test.js` is invoked, then it passes (`pass 11 / fail 0`). Verified by direct invocation.

16. **AC-16 — Smoke test still passes.** Given the post-R03 tree, when `node --test test/betting-e-process-class-dispatch.test.js` is invoked, then it passes (`pass 5 / fail 0`). Verified by direct invocation. (No-regression check; R02 established the green baseline at HEAD `aab9d37`.)

17. **AC-17 — No `as any` casts remain on `key: CellKey` literals.** Given the post-R03 tree, when `grep -n "as any" test/q01-schema-additions.test.ts test/q02-schema-extension.test.ts` is invoked, then output is empty (zero matches). Verified by direct invocation at commit time. Closes R02 MINOR-3.

18. **AC-18 — `as CompiledConfig` widening cast removed from q01.** Given the post-R03 tree, when `grep -n "as CompiledConfig" test/q01-schema-additions.test.ts` is invoked, then output is empty (zero matches). Verified by direct invocation. Closes R02 MINOR-4.

19. **AC-19 — `Record<CellDimension, true>` and `Record<CellConfidence, true>` exhaustiveness literals exist in q02.** Given the post-R03 `test/q02-schema-extension.test.ts`, when grepped for `Record<CellDimension, true>` and `Record<CellConfidence, true>`, then each pattern matches exactly once. Verified by direct invocation. Closes R02 MINOR-5.

20. **AC-20 — `@ts-expect-error` sibling for `n_samples` mandatory-ness exists in q02.** Given the post-R03 `test/q02-schema-extension.test.ts`, when grepped for `@ts-expect-error`, then exactly one match exists in a test annotated as "R02 AC-1 sibling". Verified by direct invocation. Closes R02 MINOR-1.

---

## Anti-scope

Per anchor `skills/06-anti-scope-ledger.md`. Each named item is NOT in scope at R03; halt-and-route-back triggers on encounter via DIAGNOSTIC + STATUS: ESCALATE per `CLAUDE-IMPLEMENTER.md` halt discipline.

- **R03-SAS-1: NO statistical-residual computation.** Computing `mean_vector` / `covariance` / `mean_delta` is SLICE 2b2 (R04) scope. SLICE 2b1's state machine increments counts and transitions tiers; it does not run Welford's online algorithm or any other statistical update. Implementer encountering an apparent need to compute mean / variance → HALT.

- **R03-SAS-2: NO orchestrator vendoring.** R02-SAS-5 carry-forward. `engine/orchestrator.ts` and any wiring of `observeSample` into an orchestrator surface is out of scope. The state machine ships as a stand-alone pure function consumed in tests only at R03.

- **R03-SAS-3: NO compiled-artifact JSON loader.** Deferred to R05 (SLICE 2b3). R03 does not introduce config loading, serialization, or any I/O code path.

- **R03-SAS-4: NO PR-F5 empirical storage profile measurement.** Deferred to R05+. Storage measurement requires populated `per_shard_cells` runtime state (R04 scope).

- **R03-SAS-5: NO new detector vendoring.** Detector set is closed at R01-shipped state. R02-SAS-4 carry-forward.

- **R03-SAS-6: NO modification to `tsconfig.json`, `tsconfig.test.json`, or `package.json`.** R02-SAS-6 carry-forward; R01 MAJOR-5 disposition stands. If Implementer encounters apparent need to modify (e.g., to add an `include` pattern for `test/_substrate/`), HALT and route back — the existing tsconfig should already cover `test/**/*.ts`; if it does not, the scope of the fix is an open question.

- **R03-SAS-7: NO modification to `tools/vendor-from-deploysignal.sh`.** R02-SAS-7 carry-forward; R02 OQ-1 deferred.

- **R03-SAS-8: NO modification to inherited vendored engine internals.** A12 inherited. If the new `engine/per-shard/warm-start.ts` causes any apparent compile failure inside `engine/detectors/**` or `engine/types/families/**` or similar, the cause is not in the inherited code — investigate the new module's exports or imports first.

- **R03-SAS-9: NO modification to `engine/types/config.ts`.** R02 schema is settled; SLICE 2b1 consumes the schema as-is without adding fields. R02 MINOR-2 (sparse-encoding inverse convention) is deferred to R04 — do NOT extend `PerShardResidual` with a discriminated-union refactor or add runtime-invariant assertions at R03.

- **R03-SAS-10: NO modification to `coordination/VENDORING-MANIFEST.md`.** R03 ships only Tessera-original files; manifest convention is "files vendored from DeploySignal." R03 adds no rows and removes no rows.

- **R03-SAS-11: NO addition of unbundled R02 fix-cycle work beyond MINOR-1/3/4/5.** R02 MINOR-2 (inverse convention) is explicitly deferred per § Open questions OQ-2. R02 OBS-1/2/4 have no R03 surface to repair (documented in § Mechanism carry-forward block). Implementer encountering temptation to add a runtime invariant assertion (OBS-1 indirectly), retroactively edit R02 spec text, or edit PRD vocabulary → HALT per this clause.

- **R03-SAS-12: NO modification to `test/q01-vendoring-coverage.test.ts` iteration list.** R02 OQ-2 deferred (broaden-to-`test/*` decision). R03 does not extend the iteration scope; if there is appetite to do so later, that is an R04+ disposition.

- **R03-SAS-13: NO addition of `engine/per-shard/index.ts` barrel export.** YAGNI at SLICE 2b1 (only one file in `engine/per-shard/`); add at SLICE 2b2 if/when a second file lands. Importers consume `engine/per-shard/warm-start.ts` directly at R03.

- **R03-SAS-14: NO Tessera-side compiled-config JSON fixture file.** Deferred to R05 with the loader work. R03's tests do not consume any JSON fixtures.

- **R03-SAS-15: NO addition of TypeScript strict-mode flags, lint configuration, pre-commit hooks, or new devDependencies.** R02-SAS-12 carry-forward; tsconfig and package.json are off-limits per R03-SAS-6.

**Cross-references to R02 anti-scope (carry-forward where applicable):** R02-SAS-4 (no new detector vendoring) → R03-SAS-5. R02-SAS-5 (no orchestrator vendoring) → R03-SAS-2. R02-SAS-6 (no config edits) → R03-SAS-6. R02-SAS-7 (no script edits) → R03-SAS-7. R02-SAS-8 (no inherited internal edits) → R03-SAS-8. R02-SAS-12 (no new tooling) → R03-SAS-15. R02-SAS-1/2/3 (no warm-start runtime / no compiled-artifact / no P6) are PARTIALLY SUPERSEDED at R03: R03-SAS-1 narrows R02-SAS-1 to "no STATISTICAL residual computation" (state-machine runtime IS in scope at R03); R03-SAS-3 + R03-SAS-4 preserve R02-SAS-2 + R02-SAS-3 as carry-forwards. R02-SAS-9 (no unbundled R01 fix-cycle) is paralleled at R03-SAS-11. R02-SAS-10 (no edits to R01 spec) is paralleled implicitly: R03 does not edit R01 or R02 specs; this spec text stands as the R02 MINOR-1/3/4/5 disposition record.

**Cross-references to v0.3 SCOPING-MEMO anti-scope clauses:** A1–A17 all carry forward to R03 with no additions. The state-machine runtime does not introduce real-customer-telemetry (A8/A11), hardware-diagnostic (A10), modification-to-vendored-internals (A12/A5), ML-attribution (A13), federation (A15), Addition #26 D4 reversal (A16), or DeploySignal-integration (A17) concerns.

---

## Open questions

1. **OQ-1: Should `observeSample` ever emit `confidence === 'pooled'` or `'aggregate'` for the per-shard residual?** Architect-pre-prediction: NO — `'pooled'` and `'aggregate'` are L3-pooling-layer outputs on the FLEET-AGGREGATE baseline (`BaselineCellEntry.confidence`), not state-machine outputs on the PER-SHARD residual (`PerShardResidual.confidence`). The state machine produces only `'none'` / `'warm_start'` / `'strict'`. The shared typedef `CellConfidence` includes all five members because it's the union over both per-shard and fleet-aggregate cells; the per-shard subset is a narrowing. If a future SLICE 2b2/2b3 architect disagrees and wants to extend `observeSample` to a pooled-confidence transition at the per-shard layer, that is an R04+ design decision; R03 ships the three-tier subset. Implementer does not act on this in R03.

2. **OQ-2: When does the sparse-encoding inverse convention (R02 MINOR-2) become load-bearing, and how is it enforced?** Architect-pre-prediction: load-bearing at R04 (SLICE 2b2) when statistical-residual computation lands. Two enforcement options for the R04 architect to consider: (a) discriminated-union refactor of `PerShardResidual` (`StrictResidual | WarmStartResidual | EmptyResidual`) — strongest, but breaking change to R02 schema; (b) runtime invariant assertion at `observeSample` boundary (or a dedicated `assertResidualConvention` helper) — non-breaking, but type system stays permissive. R03 does NOT pre-empt this; the R04 architect picks. Implementer does not act on this in R03.

3. **OQ-3: Should PRD AC-P2 wording be aligned to code vocabulary (`cell_confidence` → `CellConfidence` tier)?** Architect-pre-prediction: YES at next PRD revision, but PRD edits are operator-owned and not Architect-routed via the pipeline. R03 surfaces this as an open question for operator-level future-revision; no R03 action. (R02 OBS-4 originated this; carry-forward.)

4. **OQ-4: Should `engine/per-shard/` carry a `README.md` or module-level documentation file?** Architect-pre-prediction: NO at SLICE 2b1. The `engine/per-shard/warm-start.ts` JSDoc block is sufficient documentation for the state machine; a dedicated README would duplicate it. If `engine/per-shard/` grows to more than 3 files by R05 close, revisit. Implementer does not act on this in R03.

5. **OQ-5: Does the test substrate factory module need to export the four factory functions as a named-collection object (e.g., `export const factories = { makeCellKey, makePerShardResidual, ... }`) in addition to individual named exports?** Architect-pre-prediction: NO. Tree-shakeable named exports are the canonical TypeScript pattern; consumers import only what they use. Adding a name-spaced collection is YAGNI at four exports. Implementer does not act on this in R03.

No other unresolved items. (Per CLAUDE-ARCHITECT.md: "All unresolved decisions → open questions in the spec. Not silent choices.")

---

## P3 ten-axis verification

- **P3.1 concrete-values:** All thresholds named with literal values (`WARM_START_THRESHOLD = 20`, `STRICT_UPGRADE_THRESHOLD = 60`); both bound by AC-3 + AC-4. Tier-transition cases bind specific n boundaries (n=18, n=19, n=20, n=59, n=60, n=200). The reset-target state is concretely specified (n=1, confidence='none', statistical fields cleared). One **corner case** acknowledged: if `current.n_samples >= STRICT_UPGRADE_THRESHOLD` and `current.confidence === 'none'` (an externally-mutated or hand-constructed residual), `observeSample` produces `confidence === 'strict'` directly — i.e., the function is a pure function of (newN, seedChanged), not of (oldConfidence, newN). This is correct behavior for a stateless state-machine; the pure-function nature means it cannot detect "this residual was tampered with." The spec § Mechanism primitive 1 documents this; no AC binds the specific "n>=60 with confidence='none' upgrades to 'strict'" case because the only realistic path to that state is via the seed-mismatch reset (which sets n=1, confidence='none', so the case doesn't arise in normal usage).

- **P3.2 coord-trail:** PRD AC-P2 ("warm-start enables alerts within 20 samples; strict-upgrade at 60 samples") grepped → bound by AC-3 (WARM_START_THRESHOLD === 20) + AC-4 (STRICT_UPGRADE_THRESHOLD === 60) + AC-5/AC-7 (transition cases). SCOPING-MEMO § 3 Phase 1 SLICE 2 row "Warm-start cold-start mechanism" → narrowed to SLICE 2b1 state-machine per Approach E selection. R02 spec § Mechanism Delta 5 (PerShardResidual fields) → R03 consumes the schema as-is per R03-SAS-9. R02 Reviewer MINOR-1/3/4/5 → addressed at Delta 4 + Delta 5. R02 OQ-4 (CellKey `as any` cast) → closed via Delta 2 factory.

- **P3.3 file-opened:** **Type-declaration-site discipline applied** (per CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 — derived from R02 OBS-3): for every external type instantiated in pseudocode, the actual declaration site was opened and verified at HEAD `aab9d37`. Verified: `PerShardResidual` at `engine/types/config.ts:860-880`; `PerShardCell` at `engine/types/config.ts:885-889`; `CellKey` at `engine/types/primitives.ts:44` (`Record<string, string | number>`); `CellConfidence` at `engine/types/config.ts:850-852` (5 members); `CellDimension` at `engine/types/config.ts:845-848` (7 members); `BaselineCellEntry` at `engine/types/config.ts:417-435`; `CompiledConfig` interface signature at `engine/types/config.ts:83+` (full field set inspected by partial read of lines 83-110). All shapes match the pseudocode prediction; no CellKey-shape-class drift (R02 OBS-3 root cause) at R03.

- **P3.4 function-bodies:** R03 ships one new production function (`observeSample`) + one initializer (`initialPerShardResidual`) + four factory functions. Pseudocode shows full function bodies for `observeSample` (the only function with non-trivial logic — seed-mismatch branch + tier-transition narrowing). The initializer and factories are 1-3 line returns; no algorithmic surface to grill.

- **P3.5 compiled-artifact:** R03 does not introduce a Tessera-specific compiled-config JSON artifact (R03-SAS-14). The schema additions extend the compile-time TypeScript types from R02; runtime config-loading is R05 scope. AC-13 (`tsc` clean compile) is the compiled-artifact-equivalent check.

- **P3.6 substrate-validation:** R03 lands the test substrate factory (Delta 2) as foundational substrate. AC-13 + AC-15 validate it via type-check + runtime test execution. No synthetic-cluster substrate or compiled-config substrate at R03 (deferred per R03-SAS-14).

- **P3.7 enumeration:** Component inventory enumerated explicitly with state markers; 2 changed + 3 created + 0 deleted = 5 surfaces. Manifest cross-check confirms no files outside inventory. Per cross-project memorial "Component inventory accuracy at the file-state level is a verification preamble; do not silently mark unmodified files as exempt." — none claimed as exempt; all enumerated.

- **P3.8 contradiction-search:** Cross-section consistency pass (next section) explicitly checks for naming/structure drift across § Mechanism / § Per-file pseudocode / § Acceptance criteria / Open questions. R01-derived reinforcement applied as a structural section.

- **P3.9 carry-forward-claims:** Every R02 MINOR/OBS disposition referenced in § Mechanism cites the source REVIEWER finding by ID and traces to a specific R03 Delta (MINOR-1 → Delta 4b → AC-20; MINOR-3 → Delta 2 + Delta 4a + Delta 5a → AC-17; MINOR-4 → Delta 5b → AC-18; MINOR-5 → Delta 4c → AC-19; MINOR-2 → deferred OQ-2; OBS-1 → no R03 surface; OBS-2 → no R03 surface; OBS-3 → resolved via Delta 2 factory; OBS-4 → deferred OQ-3).

- **P3.10 verification-discipline:** Every AC binds to either a runnable test (q03 AC-1 through AC-11) or a grep evidence command runnable at commit time (AC-17/18/19/20) or a binding command attestation (AC-13/14/15/16) or git-history evidence (AC-12). No AC is operator-asserted-only.

---

## Cross-section consistency pass (R01 reinforcement — mandatory)

Per `CLAUDE-ARCHITECT.md` REINFORCED 2026-05-16: for every resolved decision that names a module path, function name, type structure, constant value, naming convention, or deferral policy, verify ALL spec sections use a consistent surface. Each check below was executed by re-reading the spec section-by-section for the alternative form before the spec was emitted.

| Resolved decision | Canonical form | Spec sections checked | Result |
|---|---|---|---|
| State-machine module path | `engine/per-shard/warm-start.ts` (singular `per-shard`, kebab-case file) | § Mechanism, § Component inventory, § Per-file pseudocode header, § AC-12, § Anti-scope R03-SAS-13, Implementer notes, q03 test imports, OQ-4 | ✅ All sites use `engine/per-shard/warm-start.ts`. No `engine/per_shard/`, `engine/perShard/`, or `engine/warm-start/` variants. |
| State-machine function name | `observeSample` (NOT `updatePerShardResidual` / `transitionConfidence` / `applyObservation`) | § Mechanism primitive 1 (no name used; describes only behavior), Delta 1 export list, § Per-file pseudocode warm-start.ts body, q03 test imports, AC-2/5/6/7/8/9/10/11 (each "when observeSample is invoked"), § Failure modes F-1/F-2/F-3 | ✅ All sites use `observeSample`. No alternate naming surfaces. |
| Initializer name | `initialPerShardResidual` (NOT `emptyPerShardResidual` / `coldStartResidual` / `defaultResidual`) | Delta 1 export list, Per-file pseudocode, q03 imports, AC-1 + AC-2 + AC-10 | ✅ All sites use `initialPerShardResidual`. |
| Threshold constant names | `WARM_START_THRESHOLD` + `STRICT_UPGRADE_THRESHOLD` (UPPER_SNAKE; full words) | Delta 1 export list, Per-file pseudocode, q03 imports, AC-3 + AC-4 + AC-5/6/7, JSDoc, OQ-1, P3.1 | ✅ Both names consistent across all sites. No `WARM_START_N` / `STRICT_N` abbreviations. |
| Threshold values | `WARM_START_THRESHOLD === 20`; `STRICT_UPGRADE_THRESHOLD === 60` | Per-file pseudocode (literal values), JSDoc PRD-trace, AC-3 + AC-4 (literal binding), AC-5/6 (n=19/n=20 boundary), AC-7 (n=59/n=60 boundary) | ✅ Values `20` and `60` consistent everywhere. Verified against PRD AC-P2 literal. |
| Reset semantics on seed-mismatch | `n_samples = 1` (NOT 0), `confidence = 'none'`, statistical fields cleared, new seed adopted | § Mechanism primitive 2, Per-file pseudocode warm-start.ts (`seedChanged` branch), AC-9 (binding), AC-10 (no-reset case for first-seed contrast), F-3/F-4 failure modes | ✅ `n=1` reset uniformly. Distinct from cold-start (`n=0`); AC-1 covers cold-start, AC-9 covers reset. |
| Substrate factory module path | `test/_substrate/factories.ts` (underscore-prefix `_substrate/`) | § Mechanism primitive 3, § Component inventory, Delta 2 file header, q01/q02/q03 imports (`./_substrate/factories`), Implementer note 5, R03-SAS-13 | ✅ All sites use `test/_substrate/factories.ts`. No `test/substrate/` or `test/factories/` variants. |
| Factory function naming convention | `make<TypeName>(overrides?)` (e.g., `makeCellKey`, `makePerShardResidual`, `makePerShardCell`, `makeBaselineCellEntry`) | Delta 2 export list, factories.ts pseudocode, q01 Delta 5 calls, q02 Delta 4 calls, q03 Delta 3 calls (via makePerShardResidual) | ✅ All four factories use `make*` prefix. No `build*` / `create*` / `new*` variants. |
| SampleObservation field names | `observedAt: number` (camelCase, NOT `observed_at`); `residualSeedHash: string` (camelCase, NOT `residual_seed_hash`) | Delta 1 interface declaration, Per-file pseudocode warm-start.ts, q03 test calls (all 11 use `{ observedAt, residualSeedHash }`), AC-2/5/6/7/8/9/10/11 (binding text) | ✅ camelCase consistently. Distinct from the SCHEMA fields `residual_seed_hash` + `last_observed_at` (snake_case, on PerShardResidual) — the observation's field name is camelCase per TypeScript convention; the schema's field name is snake_case per inherited DeploySignal convention. This distinction is documented in JSDoc. |
| R02 carry-forward bundling | MINOR-1 + MINOR-3 + MINOR-4 + MINOR-5 bundled; MINOR-2 + OBS-1 + OBS-2 + OBS-4 deferred | § Mechanism carry-forward block, § Anti-scope R03-SAS-11, § Open questions OQ-2 + OQ-3, AC-17/18/19/20 | ✅ Four bundled MINORs map 1:1 to ACs (MINOR-1→AC-20, MINOR-3→AC-17, MINOR-4→AC-18, MINOR-5→AC-19). MINOR-2 fenced in R03-SAS-9 + OQ-2; OBS-4 fenced in OQ-3. |
| Deferral policy on R04+ work | Statistical-residual computation + compiled-artifact loader + PR-F5 all deferred to R04/R05 | § Spec preamble + § Mechanism Spec narrowing rationale, § Anti-scope R03-SAS-1/3/4, OQ-2 + OQ-3 | ✅ Three independent restatements of the deferral with consistent scope descriptions. No drift. |
| TDD ordering | Two-commit sequence (RED = tests + factories; GREEN = warm-start.ts + q01/q02 updates) | § Per-file pseudocode warm-start.ts Implementer note 6, AC-12, F-6 indirectly | ✅ Implementer note 6 prescribes commit sequence explicitly; AC-12 binds git-history evidence. |
| File creation track-state | `engine/per-shard/warm-start.ts` + `test/_substrate/factories.ts` + `test/q03-warm-start-runtime.test.ts` all NEW (git ls-files empty at HEAD `aab9d37`) | § Component inventory "Created" rows + directory-creation note, R02 OBS-2 carry-forward discussion in § Mechanism carry-forward block | ✅ Track-state verified ahead of time per R02 OBS-2 reinforcement; no `git rm` prescription needed since R03 has no deletions. |

**Cross-section consistency pass: PASS.** No contradictions detected between resolved decisions and downstream sections. Each check executed before grilling sign-off.

---

## Grilling output (pre-emit adversarial self-review)

Per `CLAUDE-COMMON.md` pre-emit-grilling discipline; per CLAUDE-ARCHITECT.md grilling reinforcement.

- **Q: Is every claim in this artifact backed by something verifiable?** Yes. Every line-number citation (`engine/types/config.ts:860-880, 885-889, 850-852, 845-848, 417-435, 83-110`; `engine/types/primitives.ts:44`) was verified by direct file reads during spec authoring. Every R02 MINOR/OBS ID cites the source REVIEWER-REPORT-R02.md. The `aab9d37` HEAD reference was confirmed by `git log --oneline -1` immediately before spec emission. Track-state of new directories (`engine/per-shard/`, `test/_substrate/`) was verified by `git ls-files engine/per-shard test/_substrate` → empty output at HEAD `aab9d37`. PRD AC-P2 literal-value text (`20` and `60` thresholds) was re-read from `PRD.md:44`.

- **Q: Does any part rely on an unstated assumption?** Searched. Four assumptions surfaced and either resolved or explicitly fenced:
  1. _Assumption that `tsconfig.test.json` covers `test/_substrate/*.ts` without modification._ Resolution: R03-SAS-6 explicitly anti-scopes tsconfig edits AND prescribes HALT-and-route-back if the existing tsconfig does not cover the new directory; the more likely outcome (standard `include` of `test/**/*.ts`) is the architect-pre-prediction.
  2. _Assumption that `test/q03-warm-start-runtime.test.js` is reachable via the existing `npm test` glob `test/*.test.js`._ Resolution: the glob is top-level (`test/*.test.js`), and the new test file is at `test/q03-warm-start-runtime.test.ts` (top-level). The `.js` compiled artifact will land at `test/q03-warm-start-runtime.test.js` after pretest hook runs. Verified by glob shape inspection.
  3. _Assumption that `'none' | 'warm_start' | 'strict'` is a structural subset of `CellConfidence`._ Resolution: verified by direct read of `engine/types/config.ts:850-852` (CellConfidence = `'strict' | 'pooled' | 'aggregate' | 'none' | 'warm_start'`); the three-member subset is a strict subset. Implementer note 3 documents the HALT path if tsc disagrees.
  4. _Assumption that the test substrate factory's parameter constraint (`Partial<Record<CellDimension, string | number>>`) is assignable to CellKey (`Record<string, string | number>`)._ Resolution: TypeScript structural-typing accepts the narrower parameter (each CellDimension is a string subtype) → return type's compatible. Direct verification in factory pseudocode `return { hour_of_day: 0, ...overrides }` which is provably `Record<string, string | number>`.

- **Q: Has scope been added beyond what was requested?** Audited. The requested R03 work is "Phase 1 SLICE 2b per the R02 audit-sidecar projection + R02 carry-forwards." The brainstorm narrowed to SLICE 2b1 (Approach E selected); the carry-forwards bundled are the four test-binding-tightness MINORs that are co-located with the test files R03's factory work already touches. No additional MINORs or OBS items are bundled. R02 MINOR-2 (inverse convention) is explicitly fenced. R02 OQ-1 (script hardening) is explicitly fenced. No scope creep.

- **Q: Can the Implementer act on this with zero clarifying questions?** Audited as a cold reader. Each Delta has: (1) precise file path and creation/modification state; (2) pseudocode for the post-change state; (3) Implementer note(s) with verification commands; (4) AC binding. Each AC has Given/When/Then form with no ambiguous language ("correctly", "appropriately", "as needed" all banned). Anti-scope is enumerated explicitly with HALT triggers. Open questions are architect-pre-predicted with explicit "Implementer does not act on this in R03" notes. **One residual ambiguity acknowledged:** Delta 4 sub-clause 4c (Record<typedef, true> exhaustiveness) requires the Implementer to choose where in `test/q02-schema-extension.test.ts` to declare the two `Record` constants — top-of-file (after imports), inside the test scope, or somewhere else. Pseudocode shows them at top-of-file. The Implementer may reasonably choose differently; the AC binding (AC-19 grep evidence) is location-agnostic. Acceptable residual.

- **Q: Adversarial check: what would I find if I were the cold-eye Reviewer auditing this spec?** Five likely Reviewer findings pre-empted:
  1. _R03 introduces a new pure-function module that no inherited consumer calls — is this dead code?_ Defended in § Mechanism primitive 1 final paragraph and § Anti-scope R03-SAS-2 (orchestrator vendoring is anti-scope; the function ships for test consumption + future R04+ consumption). The architectural-layer split is the rationale.
  2. _The state machine doesn't compute statistics; isn't `observeSample` mis-named (suggests sample-data consumption)?_ Defended in § Mechanism primitive 1 + JSDoc + Open question OQ-1 indirectly. The function consumes the OBSERVATION metadata (timestamp + seed); the SAMPLE's numeric values flow to R04's separate runtime. The naming reflects "observation event arrives" not "compute mean from sample."
  3. _Why bundle test substrate factory creation with state-machine runtime? Couldn't they be separate rounds?_ Defended in § Mechanism primitive 3 + § Spec preamble: the q03 test consumes the factory, and the q01 + q02 carry-forward MINOR-3 closures require the factory. Landing the factory now closes MINOR-3 immediately and amortizes the substrate work across R03 + R04 + R05 consumers. Splitting would force MINOR-3 to remain open or require two rounds touching the same test files.
  4. _AC-1 binds many fields of the cold-start residual — is this over-specification?_ Defended: the cold-start state is THE foundation for every subsequent observeSample call; the verbosity buys forward-compatibility — if a future R04 PR accidentally adds a non-undefined default for, say, `mean_vector`, the cold-start AC catches it.
  5. _The corner case "n>=60 with confidence='none' upgrades directly to 'strict'" is documented but not bound by any AC._ Defended in § P3.1 corner case paragraph: the case is documented as a consequence of the pure-function design; the only realistic path to that state (seed-mismatch reset followed by 60 stable observations) is bound by the composition of AC-9 + AC-7, and the standalone edge case doesn't arise in normal usage. The choice to NOT bind it as an AC is intentional and documented.

- **Q: Memorial sweep — any inherited memorials apply that I haven't addressed?** Reviewed. Inherited memorials from `coordination/MEMORIAL.md:9-19` + tessera-R02 additions + CROSS-PROJECT-MEMORIAL:
  - **Memorial D** (architectural-layer-coverage at hypothesis-tree time): R03 brainstorm enumerated 5 candidate approaches (audit sidecar); rejected 3 with explicit weakness rationale; 2 selected/eliminated cleanly. Documented in audit sidecar.
  - **Memorial F** (4 sub-rules at brief-drafting time): applies to compile-time substrate changes. R03 modifies `test/q01-schema-additions.test.ts` and `test/q02-schema-extension.test.ts` which exercise compile-time substrate. Sub-rules 1+2+3+4 consulted: file-opened (P3.3 — every external type's declaration site opened); inherited type-state cited (CellKey at primitives.ts:44 verified explicitly per the R02 OBS-3 reinforcement); candidate-set enumeration (5 approaches); no narrowing of stakeholder requirements (SLICE 2 → 2b1 explicitly documented).
  - **No-skip-policy on statistical-invariant tests**: R03 adds no statistical-invariant tests (no Ville / martingale / e-value assertions); the state machine's tests are deterministic property tests. No relevant surface.
  - **R01 ARCHITECT cross-section consistency reinforcement**: executed in dedicated § Cross-section consistency pass section (13 resolved-decision checks all PASS — third application after R02's 9 checks; the cross-section pass is now standard discipline).
  - **R02 ARCHITECT type-declaration-site reinforcement** (REINFORCED 2026-05-16 from R02 OBS-3): executed in P3.3 — every external type in pseudocode has its declaration site cited with file:line. CellKey verified at primitives.ts:44 (the R02-missed file). No type-shape mis-prediction surface at R03.
  - **R02 ARCHITECT file-deletion track-state reinforcement** (REINFORCED 2026-05-16 from R02 OBS-2): R03 has no deletions; the parallel discipline (verify file existence before prescribing creation paths) was applied — new directories' track-state verified at HEAD `aab9d37`.

- **Grilling pass: PASS.** Spec is ready for routing.

---

_For brainstorm full rationale (5 approaches, why-picked / why-rejected), R03-specific pre-route discipline application (skills 14 + 15 + memorial sweep + tier-rubric verdict), architect pre-predictions on outcomes, and Q-R03 → Q-R04 sequencing context, see `Q-R03-SPEC-AUDIT.md`._
