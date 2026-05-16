# Q-R05-SPEC — Tessera Phase 1 SLICE 2b3: Welford-into-PerShardResidual integration

_From: Architect (R05 pipeline run; full tier per A2 + A4 + A7 — see audit sidecar § Brainstorm)._
_To: Implementer._
_Date: 2026-05-16._
_HEAD at spec emit: `aee274c` (operator-led baseline-curation scoping memo; R04-relevant code-tree state at `9e8304a`)._
_Audit sidecar: `coordination/specs/Q-R05-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, Q-R05 → Q-R06 sequencing context)._

---

## Spec preamble

R05 = Phase 1 SLICE 2b3: integration of the R04-shipped Welford pure-function module (`engine/per-shard/welford.ts`) into the per-shard residual state, via a new composition module `engine/per-shard/runtime.ts` and a single optional schema field `PerShardResidual.welford_state?: WelfordState`. The R04 architect-pre-prediction's accumulator-strategy option (a) (schema extension) is selected with documented rationale.

R05 explicit anti-scope (deferred to R06+): `mean_delta` computation (requires BaselineCellEntry injection — separate architectural concern); `mean_vector`/`covariance` emission at strict tier (requires welfordCovariance → covariance projection + sparse-encoding gate at strict-tier transition — R06 scope); R02 MINOR-2 sparse-encoding inverse-convention enforcement (still load-bearing-pending until R06 starts emitting tier-specific output fields); compiled-artifact JSON loader (R06+); PR-F5 empirical storage profile measurement (R06+); `mergeWelfordStates` / parallel-Welford / Chan-Golub-LeVeque combination (Phase 1 SLICE 3 fleet-pooling scope); any modification to inherited vendored engine internals; any modification to `engine/per-shard/warm-start.ts` internals (R03-shipped observeSample is composed unchanged) AND any modification to `engine/per-shard/welford.ts` internals (R04-shipped Welford module is composed unchanged — the only welford.ts touch is a one-line JSDoc refresh per R04 OBS-5).

The architectural-layer split is the same successful pattern R02 → R03 → R04 used: compile-time schema (R02) → state-machine runtime (R03) → algorithm-as-pure-function (R04) → **composition + accumulator-strategy decision (R05)** → emission + sparse-encoding-enforcement + baseline-injection (R06) → compiled-artifact loader + empirical-storage (R07+). Each sub-slice is tight, mechanical, TDD-verifiable, and right-sized for a single Implementer session.

Traces to PRD AC-P2 ("warm-start `cell_confidence` enables alerts within 20 per-shard samples; strict-upgrade at 60 samples preserves inherited single-instance behavior") at the COMPOSITION layer — alert-emission machinery remains orchestrator scope (R03-SAS-2 → R04-SAS-6 carry-forward chain), but the "preserves inherited single-instance behavior" property requires accumulating from sample 1 onward, which R05 achieves by threading the Welford accumulator through every observeSample call. Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row ("Warm-start cold-start mechanism") and § 4.1 R-S2 (`min_samples_strict` re-derivation: R05 lands the accumulator that future re-derivation tests will exercise).

---

## Mechanism

### Architectural primitives

1. **Accumulator-strategy decision: option (a) — schema extension via single optional `welford_state?: WelfordState` field on `PerShardResidual`.** The R04 audit sidecar surfaced three options: (a) schema extension; (b) `mean_delta` overload; (c) caller-state. Option (a) is selected. Rationale (full why-picked / why-rejected in audit sidecar § Decision rationale D1):
   - **Pro**: accumulator state travels with the residual; single source of truth; serializable via JSON (existing CompiledConfig.per_shard_cells serialization path); R06 `mean_delta` computation becomes a one-liner (`welfordMean(residual.welford_state) - baselineMean(baseline)`).
   - **Pro**: optional field means existing serialized state from R01/R02/R03/R04 stays valid (`welford_state === undefined` for cold-start or pre-R05 serialized residuals).
   - **Con accepted**: storage footprint at scale carries WelfordState's `d × d` `m2` matrix per (shard, cell) — at typical `d ≈ 10` and 168 cells × N=1000 shards, ~134 MB just for `m2` doubles. This is within SCOPING-MEMO-v0.3 § 4.2 R-E1 architect-pre-prediction (1.2-1.5× single-instance) and is measured at R06+ via PR-F5. Diagonal-only optimization is deferrable to Phase 1 SLICE 3+ if PR-F5 evidence justifies.
   - **Con accepted**: `engine/types/config.ts` gains one type import (`import type { WelfordState } from '../per-shard/welford'`); this is a new types-directory → feature-directory edge. The alternative (re-declaring WelfordState's structural shape in config.ts) would create a duplicate-source-of-truth risk. Single import is the smaller cost.

2. **Composition function `updatePerShardResidual(current, obs)` in new module `engine/per-shard/runtime.ts`.** R04 audit sidecar architect-pre-prediction (HIGH confidence) was a new module composing observeSample + updateWelford rather than modifying observeSample inline. R05 confirms that pick. The composition keeps `engine/per-shard/warm-start.ts` and `engine/per-shard/welford.ts` unchanged at the implementation level (welford.ts gets a one-line JSDoc refresh per OBS-5; warm-start.ts not touched). Composition function:
   - Detects baseline-refresh (seed mismatch) by replicating observeSample's `seedChanged` predicate (two-line check; intentional duplication to preserve observeSample's signature).
   - Calls `observeSample(current, …)` for the n_samples + confidence + seed + timestamp transition (sample vector NOT consumed by observeSample; observeSample remains metadata-only per R03).
   - Manages WelfordState lifecycle: on baseline-refresh OR first-time sample (current.welford_state undefined), initialize fresh accumulator with dimensionality from `obs.sampleVector.length`; on stable-seed increment, update existing accumulator.
   - Returns the union of the state-machine output and the new accumulator field.

3. **Extended observation interface `ExtendedSampleObservation` co-located in `engine/per-shard/runtime.ts`.** R04 audit sidecar pre-predicted intersection-typing the new field. R05 picks a flat exported interface (`interface ExtendedSampleObservation extends SampleObservation { sampleVector: number[]; }`) rather than a type-intersection because flat interface form is more idiomatic, supports interface declaration merging if future fields land, and produces clearer error messages at consumer call sites. SampleObservation (R03-shipped) is NOT modified.

4. **welford_state IS NOT subject to the R02 sparse-encoding convention.** The R02 sparse-encoding convention partitions OUTPUT fields by confidence tier (`mean_vector`/`covariance` at strict; `mean_delta` at warm_start; nothing at none/pooled/aggregate). `welford_state` is INTERNAL ACCUMULATOR STATE — it is present whenever the residual has observed at least one sample (n_samples ≥ 1), regardless of tier. Documentation in the schema docstring (Delta 1 below) makes this explicit. R02 MINOR-2 sparse-encoding-enforcement remains an orthogonal question for R06.

5. **Dimensionality consistency: `updateWelford`'s existing throw is the enforcement.** R05 does not add a separate dimensionality check. If a baseline-refresh occurs (seed mismatch), the accumulator resets and adopts the new sample's dimensionality. If a stable-seed sample arrives with mismatched dimensionality vs the accumulator, `updateWelford` throws per R04 AC-10. R05's tests bind this throw at the new composition surface (AC-6 below).

### Cross-section consistency pass

(R01-derived reinforcement — 5th consecutive application; well-established standing discipline.)

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | Accumulator-strategy = option (a) schema extension | `PerShardResidual.welford_state?: WelfordState` (Delta 1; § Per-file pseudocode) | Option (b) mean_delta-overload; option (c) caller-state-Map | No Map-based caller-state in pseudocode; no overload of mean_delta semantics |
| 2 | Schema field name = `welford_state` (snake_case) | Delta 1 (config.ts) + Delta 2 (runtime.ts) + Delta 4 (q05 tests) | `_accumulator?` (R04 sidecar pre-prediction); `welfordState` (camelCase) | No `_accumulator` token in pseudocode; no `welfordState` (camelCase) token |
| 3 | New module path = `engine/per-shard/runtime.ts` | § Component inventory; § Per-file pseudocode Delta 2 | `per-shard-runtime.ts` (R04 sidecar pre-prediction); `update.ts`; `orchestration.ts` (clashes with engine/types/orchestration.ts) | All consumer imports use `from '../engine/per-shard/runtime'` |
| 4 | Composition function name = `updatePerShardResidual` | § Per-file pseudocode Delta 2 + Delta 4 | `observeAndAccumulate`, `updatePerShardCell` (different signature; takes Cell not Residual) | No alternative name appears in pseudocode |
| 5 | Function signature = `(current: PerShardResidual, obs: ExtendedSampleObservation) => PerShardResidual` | § Per-file pseudocode Delta 2 + Delta 4 + § Integration points | `(cell: PerShardCell, …) => PerShardCell`; signature including BaselineCellEntry | All signatures in pseudocode use PerShardResidual; no BaselineCellEntry parameter |
| 6 | Extended observation interface = `ExtendedSampleObservation extends SampleObservation { sampleVector: number[] }` | § Per-file pseudocode Delta 2 + Delta 4 | Intersection type `SampleObservation & { sampleVector: number[] }`; modifying SampleObservation in-place | No `&`-intersection form; no edit to warm-start.ts SampleObservation declaration |
| 7 | Baseline-refresh-resets-accumulator semantic | § Mechanism primitive 2; § Per-file pseudocode Delta 2 (the `seedChanged \|\| !current.welford_state` branch); AC-4 | Baseline-refresh preserves accumulator (semantic that would make Welford accumulate cross-baseline samples — load-bearing wrong) | Pseudocode resets accumulator on seedChanged; AC-4 binds the reset post-state |
| 8 | First-time-seed-initializes-accumulator semantic | § Per-file pseudocode Delta 2 (the `!current.welford_state` branch); AC-5 | First-time seed leaves accumulator unset (would crash on later updates with no state) | Pseudocode initializes on absent welford_state; AC-5 binds post-state with n=1 |
| 9 | observeSample compositionally unchanged | § Per-file pseudocode Delta 2 (calls observeSample with only `{ observedAt, residualSeedHash }`); § Anti-scope R05-SAS-2 | Refactoring observeSample to take sampleVector inline | warm-start.ts file diff at R05 = empty (R05-SAS-2 fenced) |
| 10 | welford.ts compositionally unchanged (except JSDoc refresh) | § Per-file pseudocode Delta 3 (JSDoc-only edit); § Anti-scope R05-SAS-3 narrowed | Refactoring welfordCovariance to return undefined instead of null; reshaping WelfordState | welford.ts function bodies untouched; only JSDoc lines 22-23 and 31-32 edited |
| 11 | TDD ordering: RED commit adds q05 test file; GREEN commit adds runtime.ts + config.ts Delta 1 + welford.ts JSDoc refresh | § Per-file pseudocode Implementer note 4; AC-14 | Single-commit landing | AC-14 specifies two-commit ordering verifiable in git log |
| 12 | File-creation track-state for new paths | § Component inventory directory-creation note | Assumed pre-existing without verification | `git ls-files engine/per-shard test/q05*` verified at HEAD `aee274c` — engine/per-shard/ exists (R03-created); test/q05*.test.ts does not exist |
| 13 | R02 sparse-encoding convention NOT applied to welford_state | § Mechanism primitive 4; Delta 1 schema docstring | Treating welford_state as a tier-gated output field (would force absent-at-warm_start convention; load-bearing wrong because Welford accumulates across tier transitions) | Schema docstring explicitly states "internal accumulator; not subject to R02 sparse-encoding convention"; AC-8 + AC-9 verify welford_state present across tier transitions |
| 14 | R04 OBS-5 disposition: JSDoc refresh on welford.ts | § Per-file pseudocode Delta 3; AC-19 | Defer OBS-5 to R06 | Delta 3 bundles the JSDoc refresh; AC-19 grep-verifies the new wording |
| 15 | Other R04 OBS-1/2/3/4/6/7 deferred | § Anti-scope R05-SAS-13 | Bundle OBS-1 defensive-copy test into R05 (would require modifying q04) | q04 file diff at R05 = empty (R05-SAS-12 fenced) |

All 15 checks PASS at spec-emit time. The cross-section pass is now established standing discipline at Tessera; this is the 5th consecutive application (R02 = 9 checks, R03 = 13, R04 = 12, R05 = 15).

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `engine/types/config.ts` | CHANGED | Delta 1: PerShardResidual gains optional `welford_state?: WelfordState` field + import-type declaration `import type { WelfordState } from '../per-shard/welford'`. Schema docstring updated to document the accumulator-not-output semantic. |
| `engine/per-shard/runtime.ts` | CREATED | Delta 2: new module exporting `interface ExtendedSampleObservation`, `function updatePerShardResidual(current, obs)`. Composes observeSample + updateWelford. Pure-function form (no mutation). |
| `engine/per-shard/welford.ts` | CHANGED | Delta 3: JSDoc one-line refresh closing R04 OBS-5. Function bodies and exported interface untouched. |
| `test/q05-per-shard-runtime.test.ts` | CREATED | Delta 4: new test file binding the AC-1 through AC-11 + AC-19 surfaces below. |

**Directory-creation track-state verification** (R02 OBS-2 file-track-state reinforcement applied inversely — verify directory existence before prescribing creation paths):
- `engine/per-shard/` — exists (R03-created; verified at HEAD `aee274c`).
- `test/` — exists (R01-created; verified).
- New file paths `engine/per-shard/runtime.ts` + `test/q05-per-shard-runtime.test.ts` — do not exist at HEAD `aee274c` (`git ls-files engine/per-shard/runtime.ts test/q05*.test.ts` → empty output). RED commit creates `test/q05-per-shard-runtime.test.ts` only; GREEN commit creates `engine/per-shard/runtime.ts` + applies Delta 1 + Delta 3.

---

## Integration points

(R03-derived re-export-chain-check reinforcement applied — for each named type instantiated in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)

1. **`engine/types/config.ts` ↔ `engine/per-shard/welford.ts` (new edge).** config.ts imports `WelfordState` from `../per-shard/welford`. Declaration site verified: `WelfordState` is declared at `engine/per-shard/welford.ts:33` (interface; exported per line 33 starting with `export interface WelfordState`). Re-export verification: welford.ts exports WelfordState at its source declaration (no re-export chain to traverse). No cycle: welford.ts has zero imports (verified at R04 close), so `config.ts → welford.ts` is a leaf edge.

2. **`engine/per-shard/runtime.ts` ↔ `engine/types/config.ts` (new edge).** runtime.ts imports `PerShardResidual` from `../types/config`. Declaration site verified: PerShardResidual is declared at `engine/types/config.ts:860-880` (the R02 Delta 5 + R05 Delta 1 site). Post-R05 PerShardResidual gains the welford_state optional field per Delta 1; runtime.ts pseudocode (Delta 2) reads + writes that field on PerShardResidual instances.

3. **`engine/per-shard/runtime.ts` ↔ `engine/per-shard/welford.ts` (new edge).** runtime.ts imports `WelfordState`, `initialWelfordState`, `updateWelford` from `./welford` (three identifiers). Declaration sites verified: WelfordState at line 33; initialWelfordState at line 45 (`export function`); updateWelford at line 59 (`export function`). All three are public per the `export` modifier on each declaration.

4. **`engine/per-shard/runtime.ts` ↔ `engine/per-shard/warm-start.ts` (new edge).** runtime.ts imports `observeSample`, `SampleObservation` from `./warm-start` (two identifiers). Declaration sites verified: observeSample at line 69 (`export function`); SampleObservation at line 26 (`export interface`).

5. **`test/q05-per-shard-runtime.test.ts` ↔ `engine/per-shard/runtime.ts`.** q05 imports `updatePerShardResidual`, `ExtendedSampleObservation` (two identifiers from runtime.ts; ExtendedSampleObservation is type-only). PLUS `welfordMean` from `../engine/per-shard/welford` (single identifier for AC-10's read-back assertion; welfordCovariance read-back is R06 surface per R05-SAS-13 deferral). PLUS `initialPerShardResidual`, `WARM_START_THRESHOLD`, `STRICT_UPGRADE_THRESHOLD` from `../engine/per-shard/warm-start` (three identifiers). PLUS `makePerShardResidual` from `./_substrate/factories` (R03-shipped factory; for ergonomic fixture construction). PLUS `node:test` + `node:assert/strict` (standard library). Note: AC-13 (the boundary test for observeSample contract preservation) uses dynamic import `await import('../engine/per-shard/warm-start')` to emphasize the runtime.ts ↔ warm-start.ts boundary — Implementer may use top-level import equivalently; either form satisfies the AC.

6. **`engine/per-shard/runtime.ts` ↔ inherited vendored engine internals.** ZERO inherited-vendored imports. The R05 module sits in `engine/per-shard/` and composes only Tessera-original modules (welford.ts + warm-start.ts) + the schema (config.ts). No transitive compile-time concerns introduced via the inherited Q70 / Q66 / Family-A/C/D/E surfaces.

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **welford_state field name** is `welford_state` (snake_case), not `_accumulator` (R04 sidecar pre-prediction was MEDIUM confidence; R05 architect picked snake_case for alignment with PerShardResidual's `n_samples` / `mean_vector` / `mean_delta` / `last_observed_at` / `residual_seed_hash` convention). Verify with `grep -c "welford_state" engine/types/config.ts` → expect 1 declaration line; `grep -c "_accumulator" engine/` → expect 0.

2. **Module file path** is `engine/per-shard/runtime.ts` (not `per-shard-runtime.ts` per R04 sidecar pre-prediction; not `update.ts` or `orchestration.ts`). The Implementer creates exactly that path; verify with `git ls-files engine/per-shard/runtime.ts` post-creation → expect 1 line.

3. **`updateWelford`'s thrown error on dimension mismatch is the only enforcement at runtime.ts.** Do NOT add a separate dimensionality check inside `updatePerShardResidual`. The Welford-level throw at welford.ts:64-68 propagates naturally. AC-6 binds this propagation.

4. **TDD ordering**: two-commit sequence. RED commit adds `test/q05-per-shard-runtime.test.ts` (file imports from `../engine/per-shard/runtime` which does NOT yet exist → tsc fails with TS2307). GREEN commit creates `engine/per-shard/runtime.ts`, applies Delta 1 to `engine/types/config.ts`, and applies Delta 3 to `engine/per-shard/welford.ts` (JSDoc-only). Run `npm run typecheck` between commits to verify RED state failure; verify GREEN state via `npm run typecheck` + `node --test test/q05-per-shard-runtime.test.js`.

5. **Hand-trace verification before committing GREEN**: cold-start sample observation. Starting from `initialPerShardResidual()` = `{ n_samples: 0, confidence: 'none' }`, after `updatePerShardResidual(initial, { observedAt: 1000, residualSeedHash: 'sha:a', sampleVector: [3, 5] })`:
   - observeSample produces `{ n_samples: 1, confidence: 'none', residual_seed_hash: 'sha:a', last_observed_at: 1000 }` (R03-verified at q03 AC-2 + AC-10).
   - Welford branch: `!current.welford_state` is true → `initialWelfordState(2)` → `{ n: 0, mean: [0, 0], m2: [[0, 0], [0, 0]] }` → `updateWelford` with `[3, 5]` → `{ n: 1, mean: [3, 5], m2: [[0, 0], [0, 0]] }` (R04 AC-1 + AC-2 hand-trace already validates this).
   - Merged output: `{ n_samples: 1, confidence: 'none', residual_seed_hash: 'sha:a', last_observed_at: 1000, welford_state: { n: 1, mean: [3, 5], m2: [[0, 0], [0, 0]] } }`.
   - AC-1 binds this exact post-state.

6. **Anti-self-confirming AC-2 stability**: AC-2 asserts welford_state.mean equals [1, 2] after two samples `[0, 0]` then `[2, 4]` (closed-form from R04 AC-3 hand-trace). The expected mean is externally derivable (mean of `[[0,0],[2,4]]` = `[1, 2]`). The expected m2 is `[[2, 4], [4, 8]]` per R04 AC-3 hand-trace. R05 AC-2 binds these literal values, not a Welford-derived prediction.

### Delta 1 — `engine/types/config.ts` (CHANGED)

Add one type import near existing imports (line ~24 area). Add `welford_state?: WelfordState` to PerShardResidual. Update the schema docstring to document the accumulator-not-output semantic.

```ts
// Near existing imports (after line 24):
import type { WelfordState } from '../per-shard/welford';

// PerShardResidual block at lines 854-880, EXTEND the docstring and add the field:
/** Tessera SLICE 1 Delta 3 + SLICE 2a Delta 5 — per-shard residual delta from fleet-aggregate.
 *  Sparse-encoded by confidence tier (OUTPUT fields only — see below):
 *    - 'strict':     mean_vector + covariance present; mean_delta absent.
 *    - 'warm_start': mean_delta present; mean_vector + covariance absent.
 *    - 'pooled' / 'aggregate' / 'none': all delta fields absent; n_samples only.
 *  Full runtime population semantics deferred to SLICE 2b.
 *
 *  R05 (SLICE 2b3) addition: welford_state is INTERNAL ACCUMULATOR STATE, NOT subject
 *  to the sparse-encoding convention above. It is present whenever n_samples >= 1
 *  regardless of confidence tier (the Welford recurrence accumulates across tier
 *  transitions to preserve PRD AC-P2's "single-instance behavior" invariant).
 *  R06 will project welford_state to the tier-gated OUTPUT fields (mean_vector /
 *  covariance / mean_delta) via the baseline-injection orchestration boundary. */
export interface PerShardResidual {
  /** Mandatory — sample count for this (shard, cell). Load-bearing for SLICE 2b
   *  warm-start (n ≥ 20) and strict-upgrade (n ≥ 60) transitions. */
  n_samples: number;
  /** Mandatory — confidence tier; discriminates which optional fields are populated. */
  confidence: CellConfidence;
  /** Optional — present only at confidence === 'strict' (full residual). */
  mean_vector?: number[];
  /** Optional — present only at confidence === 'strict' (full residual). */
  covariance?: number[][];
  /** Optional — present only at confidence === 'warm_start' (delta from fleet-aggregate
   *  mean; length matches BaselineCellEntry's effective mean-vector length, semantic-not-typed). */
  mean_delta?: number[];
  /** Optional — opaque identifier for the fleet-aggregate baseline this residual was
   *  computed against. Enables SLICE 2b runtime to detect fleet-aggregate-refresh
   *  invalidation. Hash function choice is SLICE 2b scope. */
  residual_seed_hash?: string;
  /** Optional — Unix epoch milliseconds of the most recent sample observed at this
   *  (shard, cell). Enables SLICE 2b warm-start eligibility window logic. */
  last_observed_at?: number;
  /** R05 (SLICE 2b3) — internal Welford accumulator carrying running mean + M2 across
   *  samples for this (shard, cell). Present iff n_samples >= 1 under stable seed; reset
   *  on baseline-refresh (residual_seed_hash change). Source of truth for SLICE 2b3+
   *  derivation of mean_vector / covariance / mean_delta at the orchestration boundary
   *  (R06 scope). NOT subject to the R02 sparse-encoding convention. */
  welford_state?: WelfordState;
}
```

Implementer note: the new field is added at the END of the PerShardResidual interface (after `last_observed_at`) to minimize diff size. The schema-version is unchanged at R05 because the field is optional (pre-R05 serialized state remains valid with `welford_state === undefined`).

### Delta 2 — `engine/per-shard/runtime.ts` (CREATED)

```ts
// engine/per-shard/runtime.ts — Tessera SLICE 2b3: per-shard runtime composition.
//
// Composes the R03 state machine (observeSample) and R04 Welford accumulator
// (updateWelford) into a single pure-function update that threads accumulator
// state through PerShardResidual.welford_state across samples.
//
// Pure-function discipline (R03/R04 inherited): state in, state out, no mutation.
// The composition returns a NEW PerShardResidual per update; both input arguments
// are left unchanged. Internal calls to observeSample and updateWelford each
// preserve their own pure-function contracts.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared
// npm package at Tessera Phase 2 close.

import type { PerShardResidual } from '../types/config';
import {
  observeSample,
  type SampleObservation,
} from './warm-start';
import {
  initialWelfordState,
  updateWelford,
  type WelfordState,
} from './welford';

/** R05 extension of the R03 SampleObservation surface — adds the d-dimensional
 *  sample vector that the Welford accumulator consumes. Backward-compatible:
 *  the SampleObservation parent shape (observedAt + residualSeedHash) is
 *  unchanged; ExtendedSampleObservation refines it with the sampleVector field.
 *
 *  Dimensionality d is established by the first sample under a given baseline
 *  (residual_seed_hash). Subsequent samples MUST match that dimensionality or
 *  updateWelford throws (per R04 AC-10). Baseline-refresh (seed_hash change)
 *  resets the accumulator, after which the new sample's dimensionality establishes
 *  d afresh. */
export interface ExtendedSampleObservation extends SampleObservation {
  /** d-dimensional sample vector consumed by the Welford recurrence at this
   *  (shard, cell). Length d is fixed across samples within a single baseline
   *  window; mismatch with the accumulator's existing dimensionality under a
   *  stable seed propagates updateWelford's throw. */
  sampleVector: number[];
}

/** Pure-function per-shard runtime update: composes observeSample (R03 state
 *  machine: n_samples, confidence, residual_seed_hash, last_observed_at) and
 *  updateWelford (R04 algorithm: n, mean, m2 accumulation).
 *
 *  Behavior:
 *    1. State-machine transition via observeSample (passes only the metadata
 *       fields observedAt + residualSeedHash; sampleVector is NOT consumed by
 *       observeSample per R03 contract).
 *    2. Accumulator lifecycle (mirrors observeSample's reset / increment branch):
 *       - On seedChanged (current.residual_seed_hash defined AND differs from
 *         obs.residualSeedHash): reset — initialize fresh accumulator at
 *         d = obs.sampleVector.length, then apply the first sample.
 *       - On absent current.welford_state (cold-start; n_samples === 0 at the
 *         input OR a malformed prior state): initialize fresh and apply.
 *       - Otherwise (stable seed AND accumulator present): apply updateWelford
 *         to the existing accumulator.
 *    3. Output: { ...stateTransition, welford_state: newAccumulator }.
 *
 *  Returned residual is a NEW object; current is not mutated. Safe under shared
 *  reference semantics. Throws on dimension mismatch (propagated from updateWelford)
 *  per R04 AC-10 / R05 AC-6.
 */
export function updatePerShardResidual(
  current: PerShardResidual,
  obs: ExtendedSampleObservation,
): PerShardResidual {
  // 1. State-machine transition (observeSample takes only the SampleObservation parent shape).
  const stateTransition = observeSample(current, {
    observedAt: obs.observedAt,
    residualSeedHash: obs.residualSeedHash,
  });

  // 2. Accumulator lifecycle.
  // Replicate observeSample's seedChanged predicate (two-line duplication;
  // preserves observeSample's signature and the R03 SAS-2 module contract).
  const seedChanged =
    current.residual_seed_hash !== undefined &&
    current.residual_seed_hash !== obs.residualSeedHash;

  const accumulatorBase: WelfordState =
    seedChanged || current.welford_state === undefined
      ? initialWelfordState(obs.sampleVector.length)
      : current.welford_state;

  const newAccumulator = updateWelford(accumulatorBase, obs.sampleVector);

  // 3. Merge state-machine output with new accumulator.
  return {
    ...stateTransition,
    welford_state: newAccumulator,
  };
}
```

### Delta 3 — `engine/per-shard/welford.ts` (CHANGED — JSDoc-only)

R04 OBS-5 closure. R05 supersedes the deferred-integration framing in welford.ts's JSDoc. Edit:

- Lines 20-23 (module-level JSDoc): replace the deferred-integration paragraph with a forward reference to R05 integration.
- Lines 30-32 (WelfordState interface JSDoc): replace the deferred-integration parenthetical with a one-line note pointing to the R05 module.

Implementer applies the following exact text changes:

```
// BEFORE (welford.ts:20-23):
// R04 ships the algorithm as a standalone building block. Integration with
// observeSample (engine/per-shard/warm-start.ts) is R05 scope and requires
// resolving the accumulator-strategy decision documented in
// Q-R03-SPEC-AUDIT.md § Q-R03 → Q-R04 sequencing context.

// AFTER:
// R05 (SLICE 2b3) integrates this algorithm into PerShardResidual via
// engine/per-shard/runtime.ts (composition function updatePerShardResidual).
// Accumulator-strategy decision resolved at R05: option (a) — schema extension
// via PerShardResidual.welford_state? optional field. See Q-R05-SPEC.md.
```

```
// BEFORE (welford.ts:30-32):
/** Running accumulator for Welford's online mean + covariance algorithm.
 *  Module-local — intentionally NOT a field on PerShardResidual at R04.
 *  Integration with PerShardResidual + accumulator-strategy choice (per
 *  Q-R03-SPEC-AUDIT.md § Q-R03 → Q-R04 sequencing context) is R05 scope. */

// AFTER:
/** Running accumulator for Welford's online mean + covariance algorithm.
 *  R05 (SLICE 2b3) integration: this state is carried on PerShardResidual.welford_state
 *  via engine/per-shard/runtime.ts (function updatePerShardResidual). */
```

No function-body or signature changes; only the two JSDoc comment blocks above. Verify with `grep -c "Q-R03-SPEC-AUDIT.md" engine/per-shard/welford.ts` → expect 0 (the R03 reference is removed); `grep -c "Q-R05-SPEC.md" engine/per-shard/welford.ts` → expect 1 (the new reference); `grep -c "updatePerShardResidual" engine/per-shard/welford.ts` → expect 1 (cited in the WelfordState JSDoc).

### Delta 4 — `test/q05-per-shard-runtime.test.ts` (CREATED)

```ts
// test/q05-per-shard-runtime.test.ts — R05 AC-1 through AC-13 + AC-19.
//
// Binds the SLICE 2b3 per-shard runtime composition at engine/per-shard/runtime.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updatePerShardResidual,
  type ExtendedSampleObservation,
} from '../engine/per-shard/runtime';
import {
  initialPerShardResidual,
  WARM_START_THRESHOLD,
  STRICT_UPGRADE_THRESHOLD,
} from '../engine/per-shard/warm-start';
import { welfordMean } from '../engine/per-shard/welford';
import { makePerShardResidual } from './_substrate/factories';

// ─── R05 AC-1 — cold-start composition produces correct merged residual ─────
test('R05 AC-1 — cold-start: initialPerShardResidual + first sample produces correct merged state', () => {
  const initial = initialPerShardResidual();
  const next = updatePerShardResidual(initial, {
    observedAt: 1000,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 5],
  });
  // State-machine fields (R03 contract):
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:a');
  assert.strictEqual(next.last_observed_at, 1000);
  // Accumulator (R04 first-sample contract: mean=sample, m2=zeros at n=1):
  assert.ok(next.welford_state !== undefined);
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [3, 5]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0], [0, 0]]);
});

// ─── R05 AC-2 — two-sample composition produces R04 AC-3 closed-form post-state ─
test('R05 AC-2 — second sample threads accumulator forward; closed-form mean and m2', () => {
  const after1 = updatePerShardResidual(initialPerShardResidual(), {
    observedAt: 1000,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],
  });
  const after2 = updatePerShardResidual(after1, {
    observedAt: 1001,
    residualSeedHash: 'sha:a',
    sampleVector: [2, 4],
  });
  // R04 AC-3 closed-form: samples [[0,0],[2,4]] → mean=[1,2], m2=[[2,4],[4,8]].
  assert.strictEqual(after2.welford_state!.n, 2);
  assert.deepStrictEqual(after2.welford_state!.mean, [1, 2]);
  assert.deepStrictEqual(after2.welford_state!.m2, [[2, 4], [4, 8]]);
  // State-machine fields preserved:
  assert.strictEqual(after2.n_samples, 2);
  assert.strictEqual(after2.confidence, 'none');  // below WARM_START_THRESHOLD
});

// ─── R05 AC-3 — n_samples + confidence transitions preserved from R03 contract ─
test('R05 AC-3 — confidence transitions at n=20 and welford_state stays threaded', () => {
  // Walk from n=19 → n=20 under stable seed.
  const at19 = makePerShardResidual({
    n_samples: 19,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 19, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  const next = updatePerShardResidual(at19, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],  // zero sample to keep mean/m2 trivial
  });
  assert.strictEqual(next.n_samples, 20);
  assert.strictEqual(next.confidence, 'warm_start');
  assert.strictEqual(next.welford_state!.n, 20);
});

// ─── R05 AC-4 — baseline-refresh (seed_hash mismatch) resets accumulator ──────
test('R05 AC-4 — baseline-refresh resets welford_state: new accumulator at d=2 with first sample', () => {
  // Stale state with populated accumulator.
  const stale = makePerShardResidual({
    n_samples: 50,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:old',
    last_observed_at: 100,
    welford_state: { n: 50, mean: [10, 20], m2: [[100, 0], [0, 200]] },
    mean_delta: [0.5, 0.6],  // OUTPUT field that observeSample also clears on reset
  });
  const next = updatePerShardResidual(stale, {
    observedAt: 200,
    residualSeedHash: 'sha:new',
    sampleVector: [7, 9],
  });
  // State-machine reset (R03 AC-9 contract carries through):
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:new');
  assert.strictEqual(next.last_observed_at, 200);
  assert.strictEqual(next.mean_delta, undefined);
  // Accumulator reset: fresh d=2 init then first-sample update.
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [7, 9]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0], [0, 0]]);
});

// ─── R05 AC-5 — first-time seed assignment from cold-start (no prior welford_state) ──
test('R05 AC-5 — first-time seed assignment initializes welford_state on the normal-increment path', () => {
  // initialPerShardResidual produces { n_samples: 0, confidence: 'none' } — no welford_state.
  const fresh = initialPerShardResidual();
  const next = updatePerShardResidual(fresh, {
    observedAt: 100,
    residualSeedHash: 'sha:first',
    sampleVector: [4, 6, 8],
  });
  // R03 AC-10: first-time seed is NORMAL increment, not reset.
  assert.strictEqual(next.n_samples, 1);
  assert.strictEqual(next.confidence, 'none');
  assert.strictEqual(next.residual_seed_hash, 'sha:first');
  // welford_state initialized at d=3 with first sample.
  assert.strictEqual(next.welford_state!.n, 1);
  assert.deepStrictEqual(next.welford_state!.mean, [4, 6, 8]);
  assert.deepStrictEqual(next.welford_state!.m2, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

// ─── R05 AC-6 — dimension mismatch under stable seed propagates updateWelford throw ──
test('R05 AC-6 — dimension mismatch under stable seed throws (propagates from updateWelford)', () => {
  // Accumulator established at d=2.
  const after1 = updatePerShardResidual(initialPerShardResidual(), {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [1, 2],
  });
  // Stable-seed sample with d=3 — should throw.
  assert.throws(
    () => updatePerShardResidual(after1, {
      observedAt: 200,
      residualSeedHash: 'sha:a',
      sampleVector: [1, 2, 3],
    }),
    /dimension mismatch/,
  );
});

// ─── R05 AC-7 — input residual is not mutated ─────────────────────────────────
test('R05 AC-7 — updatePerShardResidual does not mutate input residual', () => {
  const before = makePerShardResidual({
    n_samples: 5,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 5, mean: [1, 2], m2: [[10, 5], [5, 20]] },
  });
  const snapshot = JSON.stringify(before);
  // Discard return value — only input invariance matters here.
  updatePerShardResidual(before, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [3, 4],
  });
  assert.strictEqual(JSON.stringify(before), snapshot);
});

// ─── R05 AC-8 — welford_state present across confidence-tier transitions ──────
test('R05 AC-8 — welford_state remains populated across confidence-tier transitions', () => {
  // Walk a residual from n=18 (none) through n=20 (warm_start) under stable seed.
  let r = makePerShardResidual({
    n_samples: 18,
    confidence: 'none',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 18, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  for (let i = 0; i < 3; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 100 + i,
      residualSeedHash: 'sha:a',
      sampleVector: [0, 0],
    });
  }
  assert.strictEqual(r.n_samples, 21);
  assert.strictEqual(r.confidence, 'warm_start');
  // welford_state IS NOT subject to the sparse-encoding convention; remains present at warm_start tier.
  assert.ok(r.welford_state !== undefined);
  assert.strictEqual(r.welford_state!.n, 21);
});

// ─── R05 AC-9 — welford_state present at strict tier (n >= 60) ────────────────
test('R05 AC-9 — welford_state remains populated at strict tier (no sparse-encoding gate)', () => {
  const at59 = makePerShardResidual({
    n_samples: 59,
    confidence: 'warm_start',
    residual_seed_hash: 'sha:a',
    welford_state: { n: 59, mean: [0, 0], m2: [[0, 0], [0, 0]] },
  });
  const at60 = updatePerShardResidual(at59, {
    observedAt: 100,
    residualSeedHash: 'sha:a',
    sampleVector: [0, 0],
  });
  assert.strictEqual(at60.n_samples, 60);
  assert.strictEqual(at60.confidence, 'strict');
  // welford_state remains populated at strict tier.
  assert.ok(at60.welford_state !== undefined);
  assert.strictEqual(at60.welford_state!.n, 60);
});

// ─── R05 AC-10 — welfordMean(threaded accumulator) equals expected running mean ─
test('R05 AC-10 — welfordMean over composed updates equals expected running mean', () => {
  // Apply samples [1,1], [3,3], [5,5] in sequence; expected mean is [3, 3].
  const samples = [[1, 1], [3, 3], [5, 5]];
  let r = initialPerShardResidual();
  for (let i = 0; i < samples.length; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 100 + i,
      residualSeedHash: 'sha:a',
      sampleVector: samples[i],
    });
  }
  assert.strictEqual(r.welford_state!.n, 3);
  assert.deepStrictEqual(welfordMean(r.welford_state!), [3, 3]);
});

// ─── R05 AC-11 — welford_state survives JSON serialization round-trip ─────────
test('R05 AC-11 — welford_state survives JSON.stringify + JSON.parse round-trip', () => {
  const after2 = updatePerShardResidual(
    updatePerShardResidual(initialPerShardResidual(), {
      observedAt: 100,
      residualSeedHash: 'sha:a',
      sampleVector: [0, 0],
    }),
    {
      observedAt: 200,
      residualSeedHash: 'sha:a',
      sampleVector: [2, 4],
    },
  );
  const restored: typeof after2 = JSON.parse(JSON.stringify(after2));
  assert.deepStrictEqual(restored.welford_state, after2.welford_state);
  assert.strictEqual(restored.welford_state!.n, 2);
});

// ─── R05 AC-12 — cold-start initialPerShardResidual remains welford_state-undefined ─
test('R05 AC-12 — initialPerShardResidual still produces welford_state === undefined (R03 cold-start preserved)', () => {
  const r = initialPerShardResidual();
  assert.strictEqual(r.welford_state, undefined);
});

// ─── R05 AC-13 — observeSample contract unchanged (no welford_state side-effect) ──
test('R05 AC-13 — direct observeSample (without sampleVector) does not produce welford_state', async () => {
  // observeSample (R03-shipped) is composed by updatePerShardResidual but is itself unchanged.
  // A direct observeSample call from outside runtime.ts should NOT yield a welford_state field.
  const { observeSample } = await import('../engine/per-shard/warm-start');
  const next = observeSample(initialPerShardResidual(), {
    observedAt: 100,
    residualSeedHash: 'sha:a',
  });
  // welford_state must be absent — observeSample does not add accumulator state.
  assert.strictEqual(next.welford_state, undefined);
  assert.strictEqual(next.n_samples, 1);
});

// ─── R05 AC-19 — welford.ts JSDoc references R05 integration site ─────────────
// (Binding command form per R03 MINOR-2 grep-pattern-soundness reinforcement: target
//  whole-file content rather than a comment-pattern grep; see AC-19 evidence command
//  in § Acceptance criteria below.)
```

---

## Acceptance criteria

Numbered 1-19. Every AC is "Given X, when Y, then Z" or an evidence-bound assertion with a verifiable command. No grep patterns that match inside `//` comments (R03 MINOR-2 reinforcement).

**Algorithm + composition (R05 surface):**

- **AC-1** — _Given_ `initialPerShardResidual()` and `obs = { observedAt: 1000, residualSeedHash: 'sha:a', sampleVector: [3, 5] }`, _when_ `updatePerShardResidual(initial, obs)` is called, _then_ the result equals `{ n_samples: 1, confidence: 'none', residual_seed_hash: 'sha:a', last_observed_at: 1000, welford_state: { n: 1, mean: [3, 5], m2: [[0, 0], [0, 0]] } }` exactly. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-1 …" passes.

- **AC-2** — _Given_ a cold-start residual updated with sample `[0, 0]` then sample `[2, 4]` under stable seed `'sha:a'`, _when_ the second `updatePerShardResidual` call returns, _then_ the result's `welford_state` equals `{ n: 2, mean: [1, 2], m2: [[2, 4], [4, 8]] }` (closed-form per R04 AC-3 hand-trace). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-2 …" passes.

- **AC-3** — _Given_ a residual at `n_samples=19, confidence='none'` with populated `welford_state.n=19` and stable seed, _when_ `updatePerShardResidual` is called with one more sample under the same seed, _then_ the result has `n_samples=20`, `confidence='warm_start'`, and `welford_state.n=20`. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-3 …" passes.

- **AC-4** — _Given_ a residual with `n_samples=50, confidence='warm_start', residual_seed_hash='sha:old', welford_state.n=50, mean_delta=[…]`, _when_ `updatePerShardResidual` is called with `residualSeedHash='sha:new'` and `sampleVector=[7, 9]`, _then_ the result has `n_samples=1`, `confidence='none'`, `residual_seed_hash='sha:new'`, `mean_delta === undefined`, and `welford_state === { n: 1, mean: [7, 9], m2: [[0, 0], [0, 0]] }` (fresh accumulator with first sample under the new seed). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-4 …" passes.

- **AC-5** — _Given_ `initialPerShardResidual()` (no prior `residual_seed_hash` and no prior `welford_state`) and `obs.sampleVector=[4, 6, 8]` with `residualSeedHash='sha:first'`, _when_ `updatePerShardResidual` is called, _then_ the result is a normal-increment (not reset): `n_samples=1`, `confidence='none'`, `residual_seed_hash='sha:first'`, `welford_state={ n: 1, mean: [4, 6, 8], m2: [[0,0,0],[0,0,0],[0,0,0]] }`. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-5 …" passes.

- **AC-6** — _Given_ a residual with `welford_state.mean.length === 2` and stable seed `'sha:a'`, _when_ `updatePerShardResidual` is called with `sampleVector=[1, 2, 3]` (d=3) under the same seed, _then_ the call throws an Error whose message matches `/dimension mismatch/`. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-6 …" passes (uses `assert.throws`).

- **AC-7** — _Given_ a residual `before` with populated `n_samples`, `confidence`, `residual_seed_hash`, and `welford_state`, _when_ `updatePerShardResidual(before, obs)` is called and the return value is discarded, _then_ `JSON.stringify(before)` is unchanged across the call. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-7 …" passes.

- **AC-8** — _Given_ a residual at `n_samples=18, confidence='none'` with populated `welford_state`, _when_ `updatePerShardResidual` is called three times under stable seed (advancing to `n_samples=21`), _then_ the final result has `confidence='warm_start'` AND `welford_state !== undefined` AND `welford_state.n === 21`. Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-8 …" passes.

- **AC-9** — _Given_ a residual at `n_samples=59, confidence='warm_start'` with populated `welford_state.n=59`, _when_ `updatePerShardResidual` is called once under stable seed, _then_ the result has `confidence='strict'` AND `welford_state !== undefined` AND `welford_state.n === 60`. (Verifies: welford_state is NOT cleared at the strict-tier boundary.) Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-9 …" passes.

- **AC-10** — _Given_ a sequence of three samples `[[1,1], [3,3], [5,5]]` applied via `updatePerShardResidual` under stable seed, _when_ `welfordMean(result.welford_state)` is called, _then_ it returns `[3, 3]` exactly (the arithmetic mean of the three samples). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-10 …" passes.

- **AC-11** — _Given_ a residual produced by two `updatePerShardResidual` calls (with populated `welford_state`), _when_ `JSON.parse(JSON.stringify(residual))` round-trips it, _then_ `restored.welford_state` deep-equals the pre-round-trip `welford_state` (verifies welford_state survives the CompiledConfig.per_shard_cells serialization path). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-11 …" passes.

- **AC-12** — _Given_ a freshly constructed `initialPerShardResidual()` (no `updatePerShardResidual` call), _when_ the result is inspected, _then_ `welford_state === undefined` (R03 cold-start contract preserved; the R05 schema field is optional and is not initialized at cold-start). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-12 …" passes.

**R03 observeSample contract preservation (load-bearing for R05-SAS-2):**

- **AC-13** — _Given_ a direct (not via runtime.ts) call to the R03-shipped `observeSample(initialPerShardResidual(), { observedAt: 100, residualSeedHash: 'sha:a' })`, _when_ the result is inspected, _then_ `welford_state === undefined` (observeSample does NOT side-effect the accumulator; only the new runtime.ts composition function does). Evidence: `test/q05-per-shard-runtime.test.ts` "R05 AC-13 …" passes.

**Compile + test substrate health:**

- **AC-14** — _Given_ the R05 commit sequence, _when_ `git log --oneline -- test/q05-per-shard-runtime.test.ts engine/per-shard/runtime.ts` is run, _then_ a RED commit (adding `test/q05-per-shard-runtime.test.ts`) precedes a GREEN commit (adding `engine/per-shard/runtime.ts` + Delta 1 + Delta 3). Evidence: Reviewer-run `git log --oneline` produces two commits in the correct order; `git show <RED> --stat` shows only `test/q05-per-shard-runtime.test.ts` added (no engine/per-shard/runtime.ts at RED).

- **AC-15** — _Given_ the GREEN commit, _when_ `npm run typecheck` is run from the repo root, _then_ exit code is 0 with no error output. Evidence: Reviewer-run command.

- **AC-16** — _Given_ the GREEN commit, _when_ all pre-R05 test files are run independently, _then_ each produces the OBSERVED pass count it produced at R04 close — no regressions. Implementer reports OBSERVED output per R03 MINOR-4 reinforcement; do NOT pre-state counts. Reference: pre-R05 baseline (Reviewer-verified at R04 HEAD `9e8304a`) was q01-vendoring-coverage=3, q01-no-at-pin-deltas=1, q01-schema-additions=5, q02-schema-extension=6, q03-warm-start-runtime=13, q04-welford-stats=11, betting-e-process smoke=5; total 44. R05 changes Delta 1 (PerShardResidual extension, additive optional field) — pre-R05 test files must still pass at the same counts. Evidence: Reviewer-run `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js test/q02-schema-extension.test.js test/q03-warm-start-runtime.test.js test/q04-welford-stats.test.js test/betting-e-process-class-dispatch.test.js`.

- **AC-17** — _Given_ the GREEN commit, _when_ `node --test test/q05-per-shard-runtime.test.js` is run, _then_ pass count equals 13 and fail count equals 0 (this is a pre-stated count per Implementer-side TDD discipline AND a Reviewer-side independent verification target; the spec lists 13 ACs against `test/q05-per-shard-runtime.test.ts` so 13 tests is the expected count). Evidence: Reviewer-run `node --test`.

- **AC-18** — _Given_ the GREEN commit, _when_ `node --test test/betting-e-process-class-dispatch.test.js` is run, _then_ pass count equals 5 and fail count equals 0 (inherited Ville-bound smoke regression baseline; R01 AC-10 carry-forward). Evidence: Reviewer-run `node --test`.

- **AC-19** — _Given_ the GREEN commit, _when_ the welford.ts file content is inspected, _then_ both: (a) the literal string `Q-R03-SPEC-AUDIT.md` appears 0 times in the file (the R03-deferred-pointer is removed); AND (b) the literal string `engine/per-shard/runtime.ts` appears at least once in the file (the new R05-integration pointer is present); AND (c) the literal string `updatePerShardResidual` appears at least once in the file. Evidence: Reviewer-run `grep -c "Q-R03-SPEC-AUDIT.md" engine/per-shard/welford.ts` → 0; `grep -c "engine/per-shard/runtime.ts" engine/per-shard/welford.ts` → ≥1; `grep -c "updatePerShardResidual" engine/per-shard/welford.ts` → ≥1. (Note: these greps target whole-file literal strings; they cannot be defeated by `// commented-out` text because the new wording IS the JSDoc text — the verification target IS the comment text, intentionally. The R03 MINOR-2 reinforcement applies to greps that target EXECUTABLE code presence/absence; AC-19 targets JSDoc literal content, which is precisely what should match in comments.)

---

## Anti-scope

R05 ships exactly the four-surface inventory above; the following enumerate paths the Implementer must NOT touch. Encountering apparent need → HALT and write a DIAGNOSTIC.

- **R05-SAS-1: NO modification to `engine/types/config.ts` outside Delta 1.** The Delta 1 change is precisely: one type-import line (`import type { WelfordState } from '../per-shard/welford'`); one new optional field on PerShardResidual (`welford_state?: WelfordState`); the PerShardResidual JSDoc block update documenting the accumulator-not-output semantic. No other PerShardResidual fields modified; no other interfaces in config.ts modified; no other imports added/removed. Implementer-encountered need to modify other interfaces or surfaces → HALT.

- **R05-SAS-2: NO modification to `engine/per-shard/warm-start.ts`.** observeSample and SampleObservation are R03-shipped and R04-confirmed unchanged. R05 composes them; modifying observeSample's signature (e.g., to accept sampleVector inline) would require regressing R03 tests. Implementer encountering apparent need to modify warm-start.ts → HALT.

- **R05-SAS-3: NO modification to `engine/per-shard/welford.ts` outside Delta 3 (JSDoc-only).** The Delta 3 change is precisely the two JSDoc text replacements described in § Per-file pseudocode. No function body, signature, exported-interface, or behavioral change. Implementer encountering apparent need to modify welford.ts function bodies → HALT.

- **R05-SAS-4: NO `mean_delta` computation.** Requires fleet-aggregate BaselineCellEntry injection (orchestrator scope); R06+ work. R05's runtime.ts module does NOT take a baseline parameter; it does NOT compute or emit `mean_delta`. Implementer encountering apparent need to add a baseline parameter or compute `mean_delta` → HALT.

- **R05-SAS-5: NO `mean_vector` / `covariance` emission at strict tier.** Per R02 sparse-encoding convention, these fields are present at strict tier OUTPUT. R05 stores the accumulator; R06 projects via `welfordMean` + `welfordCovariance` and applies the tier-gate. R05's runtime.ts module does NOT populate `mean_vector` or `covariance` on the returned residual.

- **R05-SAS-6: NO R02 MINOR-2 sparse-encoding inverse-convention enforcement.** Still load-bearing-pending. R02 architect-pre-prediction was two options (discriminated-union refactor vs. runtime-invariant assertion); R04 architect-pre-prediction was option (b) runtime-invariant assertion. Neither is picked at R05 because R05 emits no tier-specific output fields that would exercise the convention. R06 architect picks when emission lands.

- **R05-SAS-7: NO `mergeWelfordStates` / parallel-Welford / Chan-Golub-LeVeque combination.** Phase 1 SLICE 3 fleet-pooling scope (per R04-SAS-13 carry-forward).

- **R05-SAS-8: NO addition of `engine/per-shard/index.ts` barrel export.** R03-SAS-13 → R04-SAS-14 carry-forward. Three files in `engine/per-shard/` (warm-start.ts + welford.ts + runtime.ts); consumers import each directly.

- **R05-SAS-9: NO compiled-artifact JSON loader.** Deferred to R07+ (SLICE 2c open).

- **R05-SAS-10: NO PR-F5 empirical storage profile measurement.** Deferred to R07+ (requires R06 emission populated state).

- **R05-SAS-11: NO modification to `tsconfig.json` / `tsconfig.test.json` / `package.json`.** Existing test glob `engine/**/*.ts` + `test/**/*.ts` covers the new files (verified at HEAD `aee274c` per `tsconfig.test.json:13-15`). No new dependencies introduced.

- **R05-SAS-12: NO modification to `test/q01-*.test.ts`, `test/q02-*.test.ts`, `test/q03-*.test.ts`, `test/q04-*.test.ts`.** All prior-round tests still pass per AC-16 by virtue of R05 changes being purely additive (Delta 1 adds an optional field; Delta 2 adds a new module; Delta 3 is JSDoc-only on welford.ts; Delta 4 is a new test file). Implementer encountering apparent need to modify a prior-round test → HALT (likely indicates a regression that should be fixed at the production-code side, not by editing the test).

- **R05-SAS-13: NO bundling of R04 OBS-1 / OBS-2 / OBS-3 / OBS-4 / OBS-6 / OBS-7 closures.** Each is architect-acknowledged residual or cosmetic; deferred to whatever round naturally touches the surface. R05 bundles ONLY R04 OBS-5 (welford.ts JSDoc refresh — naturally co-located with Delta 3). Implementer attempting to add a welfordCovariance defensive-copy test (OBS-1) or rewording OBS-6 → HALT.

- **R05-SAS-14: NO modification to `test/_substrate/factories.ts`.** R03-shipped factories sufficient for R05 (makePerShardResidual handles the new welford_state via `Partial<PerShardResidual>` overrides — verified at the Implementer level via tsc compile; q05 test fixtures use `makePerShardResidual({ welford_state: { n: …, mean: […], m2: […] } })` directly).

- **R05-SAS-15: NO modification to inherited vendored engine internals.** A12 carry-forward (R01 SAS-7/8 → R02 SAS-8 → R03 SAS-9 → R04 SAS-12 chain).

- **R05-SAS-16: NO modification to `coordination/VENDORING-MANIFEST.md`.** No new vendored files at R05.

- **R05-SAS-17: NO modification to `coordination/PRD.md`.** Operator-owned.

- **R05-SAS-18: NO modification to `tools/vendor-from-deploysignal.sh`.** Carry-forward.

- **R05-SAS-19: NO new top-level engine directory or sibling to `engine/per-shard/`.** Tessera-original code lives under `engine/per-shard/` per R03-established convention.

- **R05-SAS-20: NO modification to `coordination/SCOPING-MEMO-v0.3.md` or `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md`.** Operator-owned scoping artifacts.

- **R05-SAS-21: NO modification to `engine/types/primitives.ts` or other inherited typedef sites.** R05 introduces zero new external typedefs at sites other than the WelfordState import added to config.ts per Delta 1.

---

## Open questions

(Unresolvable ambiguities only — none of these blocks R05; each is fenced as a future-round decision.)

1. **OQ-1: Should `welford_state` carry an explicit `d: number` field redundant with `mean.length`?** Architect-pre-prediction: NO — `welford_state.mean.length` is the source of truth for dimensionality (DRY; consistent with R04 OQ-1 which made the same call on the WelfordState interface itself). Implementer does not act on this in R05.

2. **OQ-2: At R06 integration time, should `mean_vector` / `covariance` be derived from `welford_state` at WRITE time (computed during updatePerShardResidual) or at READ time (computed by a separate emitMeanVector / emitCovariance function called by consumers)?** Architect-pre-prediction: READ time — the orchestration boundary is where the tier-gate + baseline injection happens; the runtime.ts function should stay focused on accumulator maintenance, not output projection. Confidence: MEDIUM; R06 architect's call. Implementer does not act on this in R05.

3. **OQ-3: At R06 integration time, will the sparse-encoding-enforcement decision (R02 MINOR-2: discriminated-union vs runtime-invariant assertion) be made by the R06 architect, or deferred again to R07?** Architect-pre-prediction: R06 — the emission code is the natural locus for the enforcement; deferring further would mean shipping unenforced sparse encoding at R06 close, which raises invariant-rot risk. Confidence: MEDIUM. Implementer does not act on this in R05.

4. **OQ-4: Does the orchestrator (not yet built) need to call `welfordCovariance` defensively at every tier transition, or only at the strict-tier emission boundary?** Architect-pre-prediction: only at the strict-tier emission boundary (n_samples ≥ 60); per-tick `welfordCovariance` computation is O(d²) and wasted work at non-strict tiers. R06 architect's call. Implementer does not act on this in R05.

5. **OQ-5: Should the `updatePerShardResidual` function eventually be renamed to `tickPerShardCell` (or similar) when it absorbs more orchestration responsibilities at R06+, or should it remain narrowly-named?** Architect-pre-prediction: rename at R06 if the function's responsibility set grows materially; preserve current narrow name otherwise. Implementer does not act on this in R05 (the R05 name is `updatePerShardResidual`).

All five open questions are R06+ disposition candidates; none block the R05 acceptance criteria.

---

## P3 ten-axis verification

1. **Correctness** — Cold-start composition produces the exact merged residual specified at AC-1 (mechanically verifiable by re-running R03 AC-2 + R04 AC-1/AC-2 cases sequentially); two-sample composition matches R04 AC-3 closed-form post-state at AC-2; baseline-refresh resets accumulator at AC-4. Welford correctness inherited from R04 (already audited).

2. **Completeness** — All five accumulator-state-lifecycle branches bound: cold-start (AC-1), normal-increment-stable-seed (AC-2 + AC-3 + AC-10), baseline-refresh-reset (AC-4), first-time-seed (AC-5), dimension-mismatch-throw (AC-6). Confidence-tier transitions verified across the welford_state lifetime (AC-8 + AC-9). Immutability (AC-7). Serialization round-trip (AC-11). Cold-start invariant preserved (AC-12). R03 observeSample contract preserved (AC-13).

3. **Consistency** — Cross-section consistency pass executed (15 resolved-decision checks; all PASS). welford_state field name, module path, function name, signature, behavior semantics are consistent across all spec sections (Mechanism, Component inventory, Integration points, Per-file pseudocode, Acceptance criteria, Anti-scope, Open questions).

4. **Clarity** — Architectural decisions made explicit in § Mechanism primitives 1-5 with documented why-picked rationale (full why-picked / why-rejected in audit sidecar § Decision rationale). Implementer notes 1-6 each carry a verification command. AC wording uses "Given X, when Y, then Z" form throughout; no banned words ("correctly", "appropriately", "as needed").

5. **Coverage** — 19 ACs map to 4 component-inventory surfaces: AC-1 through AC-13 + AC-17 against `test/q05-per-shard-runtime.test.ts` (13 in-file tests + 1 file-passes assertion); AC-14 (TDD ordering) + AC-15 (typecheck) + AC-16 (no regression) against the GREEN commit at a whole-tree level; AC-18 against inherited smoke regression; AC-19 against welford.ts JSDoc Delta 3. Skill 15 prescription-to-AC-coverage check applied per audit sidecar.

6. **Constraints** — Inherited Ville-bound + Welford + observeSample contracts preserved (R05-SAS-2 + R05-SAS-3 + R05-SAS-15 enforce the inherited-code-untouched invariants; AC-13 binds the R03 observeSample contract preservation; AC-16 verifies no R04 regression). PRD AC-P2's "preserves inherited single-instance behavior" property: Welford accumulates from sample 1, threaded continuously across tier transitions — AC-8 + AC-9 + AC-10 evidence the property at the substrate layer.

7. **Concurrency** — Pure-function discipline (no in-place mutation; AC-7 binds input immutability of `updatePerShardResidual`); no shared-reference issues since each call returns a new residual and a new WelfordState. Composition of two pure functions (observeSample + updateWelford) preserves pure-function discipline by construction.

8. **Corner cases** — Cold-start (n=0, no welford_state) → AC-1 + AC-5 + AC-12. Stable-seed boundary at n=20 → AC-3. Stable-seed boundary at n=60 → AC-9. Baseline-refresh with populated stale welford_state → AC-4. First-time seed with no prior residual_seed_hash → AC-5. Dimension-mismatch under stable seed → AC-6. Dimension change after baseline-refresh: implicit in AC-4 (new seed → fresh init at new sample's d).

9. **Cost** — Implementer Q-cycle estimate: ~2-3 hours total (smaller than R04 because the composition is mechanical: read R03 + R04 contracts, glue them via the seedChanged predicate). Storage cost per (shard, cell) gains one WelfordState (d² doubles for m2 + d doubles for mean + 1 integer for n); at d=10, that's 110 doubles ≈ 880 bytes per cell. At N=1000 shards × K=168 cells × 880 bytes ≈ 148 MB total — within R-E1 1.2-1.5× single-instance pre-prediction (measurement deferred to R07+ PR-F5).

10. **Coupling** — Three module dependencies introduced (runtime.ts → config.ts; runtime.ts → welford.ts; runtime.ts → warm-start.ts) — all on Tessera-original modules; zero new inherited-vendored couplings. config.ts → welford.ts is a new types-directory → feature-directory edge; the alternative (re-declaring WelfordState in config.ts) was rejected per § Mechanism primitive 1.

---

## Grilling output

(R01-derived discipline; pre-emit adversarial self-review on this spec before routing.)

1. **Every claim verifiable?** Audited.
   - Module-path claims (`engine/per-shard/runtime.ts`, `test/q05-per-shard-runtime.test.ts`): verifiable via `git ls-files` at HEAD `aee274c` showing absence (RED commit creates them).
   - Pre-R05 test count baseline (44 at HEAD `9e8304a`): cited from REVIEWER-REPORT-R04.md §0 reading manifest line 35-36 — independently re-verifiable by `node --test`.
   - Type declaration sites (WelfordState at welford.ts:33; PerShardResidual at config.ts:860-880; observeSample at warm-start.ts:69; SampleObservation at warm-start.ts:26): all line numbers verified via file reads during spec authoring.
   - R03 / R04 carry-forward semantics (observeSample's seedChanged predicate; first-time-seed-is-normal-increment; immutability per construction): cited from MEMORIAL.md R03 and R04 sections.

2. **Unstated assumptions?** Surfaced and resolved.
   - **Test glob coverage of new files** — `tsconfig.test.json:13-15` includes `engine/**/*.ts` + `test/**/*.ts`; new files match. Verified explicitly via tsconfig.test.json read.
   - **Field naming convention divergence from R04 pre-prediction** — pre-prediction was `_accumulator?`; R05 picks `welford_state?` per the snake_case convention. Documented in § Mechanism primitive 1 + § Cross-section consistency pass row 2.
   - **Module path divergence from R04 pre-prediction** — pre-prediction was `per-shard-runtime.ts`; R05 picks `runtime.ts` (in-directory-prefixed, more concise). Documented in § Cross-section consistency pass row 3.
   - **observeSample's seedChanged predicate duplication** — runtime.ts replicates the two-line check rather than exposing it from warm-start.ts (which would require an observeSample signature change per R05-SAS-2). Documented in § Mechanism primitive 2.
   - **AC-13 reaches into warm-start.ts via dynamic import** — `await import('../engine/per-shard/warm-start')` inside the test, instead of a top-level import, because the test exercises behavior at the warm-start.ts ↔ runtime.ts boundary (showing the two surfaces produce different outputs for the same input). Top-level import would also work; dynamic import is a presentation choice that emphasizes the boundary. Implementer may use either form — both satisfy AC-13's assertion target.

3. **Scope added beyond request?** Audited.
   - The requested R05 work is "Phase 1 SLICE 2b3 per the R04 sidecar's R05 sequencing context." The R04 sidecar enumerated 5 R05-scope items (integration + accumulator-strategy + mean_delta + sparse-encoding-enforcement + ExtendedSampleObservation).
   - R05 picks up 3 of the 5: integration (Delta 2); accumulator-strategy = option (a) (Delta 1); ExtendedSampleObservation (Delta 2 surface).
   - R05 explicitly DEFERS 2 of the 5: mean_delta computation (R05-SAS-4) — requires baseline injection orthogonally; sparse-encoding-enforcement (R05-SAS-6) — premature without tier-specific output fields emitted.
   - Carry-forward from R04: only OBS-5 bundled (welford.ts JSDoc refresh, naturally co-located with Delta 3). OBS-1, OBS-2, OBS-3, OBS-4, OBS-6, OBS-7 explicitly fenced via R05-SAS-13.
   - No additional MINORs or OBS items beyond R04 OBS-5 are bundled. No scope creep.

4. **Implementer can act without guessing?** Audited.
   - All 4 file paths and component states explicit in § Component inventory.
   - Delta 1, Delta 2, Delta 3, Delta 4 each have concrete pseudocode with full function bodies, import statements, JSDoc text.
   - Function naming (`updatePerShardResidual`), interface naming (`ExtendedSampleObservation`), field naming (`welford_state`) all explicit.
   - TDD ordering specified at Implementer note 4 (two-commit RED → GREEN).
   - Verification commands embedded in Implementer notes 1, 2, 4 and ACs 14, 15, 16, 17, 18, 19.
   - Hand-trace verification of cold-start composition embedded at Implementer note 5.
   - One potentially-ambiguous decision (top-level vs dynamic import of observeSample inside q05 AC-13): explicitly documented as "either form satisfies AC-13" — Implementer's tactical choice.

5. **Pre-emit grilling specific reinforcement checks** (R02 + R03 + R04-derived):
   - **Type-declaration-site discipline** (R02 OBS-3 → R03 application → R05 4th consecutive application): every external type instantiated in pseudocode opened at its declaration site — `WelfordState` at welford.ts:33; `PerShardResidual` at config.ts:860-880; `SampleObservation` at warm-start.ts:26; `CellConfidence` at config.ts:850-852 (no R05 instantiation; referenced via PerShardResidual.confidence inheritance). No CellKey instantiation in R05 (factory `makePerShardResidual` does not require CellKey). All declaration sites verified.
   - **Re-export-chain-check discipline** (R03 MINOR-3 → R05 2nd application): one new cross-module integration claim. Claim: "config.ts imports WelfordState from `../per-shard/welford`." Verification: WelfordState is declared AND exported at welford.ts:33 (`export interface WelfordState`) — direct exports at declaration site, no re-export chain to traverse. Verified by reading the welford.ts source during spec authoring. AC-15 (typecheck exit 0) is the load-bearing Reviewer verification.
   - **Grep-pattern-soundness discipline** (R03 MINOR-2 → R05 2nd application): R05 has TWO grep-evidence ACs: Implementer notes 1 (`grep -c "welford_state" engine/types/config.ts` → 1) and AC-19 (three greps on welford.ts JSDoc literal content). Per the reinforcement, each grep is audited: (a) Note 1's `welford_state` grep — counts declaration lines, NOT comment lines: docstring uses the same identifier `welford_state`, so the count could be inflated by docstring matches. RESOLUTION: the Implementer note explicitly says "expect 1 declaration line," so the Implementer interprets "1" as "exactly one PerShardResidual field declaration." If the docstring also says `welford_state`, the grep count would be >1. To make the verification sound, the Implementer note should target an executable-context pattern: `grep -nE "^\\s+welford_state\\?: " engine/types/config.ts` → 1 (field declaration with indentation + `?:` operator; comment lines start with `//` or `*` and would not match). REVISED Implementer note 1 below.
   - **AC-19 grep soundness**: AC-19's grep targets are JSDoc literal text (the new wording IS in the comments — that's the verification target). The R03 MINOR-2 reinforcement is about ACs whose intent is "no executable casts" but whose grep matches in `// "as any" comment text`. AC-19's intent is "JSDoc has the new wording" — comments ARE the verification target. The grep is sound by virtue of intent-alignment. Note 5 of CROSS-PROJECT-MEMORIAL line 2011 reinforcement specifically: "for each AC whose 'verify' step is a grep command, ask 'does this grep match in comments?' If yes, tighten the pattern." For AC-19, the answer is "yes, intentionally, the comments ARE the target." Documented in the AC-19 prose.
   - **Empirically-verified-test-count discipline** (R03 MINOR-4 → R05 2nd application): AC-16 baseline counts (44 total; per-file q01-vc=3 / q01-no=1 / q01-sa=5 / q02-se=6 / q03=13 / q04=11 / smoke=5) cited from REVIEWER-REPORT-R04.md line 35-36 (REVIEWER-RUN observed counts at HEAD `9e8304a`). AC-16 directs Implementer to report OBSERVED output; baseline is informational. AC-17 pre-states q05 = 13 because the spec ITSELF declares 13 in-file ACs against q05; that count is structurally pre-determined by the spec and Implementer-verifiable mechanically (run the file, count the tests). The R03 MINOR-4 reinforcement applies to UNVERIFIED-AT-SPEC-TIME counts (which AC-17 is not — it's structurally pre-determined).

6. **Revised Implementer note 1** (post-grilling): `grep -nE "^\\s+welford_state\\?: " engine/types/config.ts` → expect 1 match (the field declaration line; pattern requires leading indentation + literal `welford_state?: ` substring matching only field-declaration syntax, not docstring or comment text). Update Implementer note 1 to use this pattern. **APPLIED above in § Per-file pseudocode Implementer notes 1.**

7. **Could the next role act on this artifact with zero clarifying questions?** Audited.
   - Yes. The 4 file surfaces are each accompanied by concrete pseudocode + verification commands + AC bindings. The two architectural decisions (accumulator-strategy = option (a); module-path = `engine/per-shard/runtime.ts`) are picked with documented why-picked rationale and why-rejected analysis for alternatives.
   - One residual decision (dynamic vs top-level import of observeSample inside q05 AC-13 test): explicitly documented as Implementer's tactical choice — either form satisfies AC-13.
   - All HALT conditions are explicit (R05-SAS-1 through R05-SAS-21; each names a specific surface or apparent-need pattern and instructs HALT + DIAGNOSTIC).

**Grilling verdict: PASS.** Spec is ready for IMPLEMENTER routing.

---

_For brainstorm full rationale (5 approaches, why-picked / why-rejected), R05-specific pre-route discipline application (skills 14 + 15 + memorial sweep + tier-rubric verdict), architect pre-predictions on outcomes, decision rationale per resolved decision, and Q-R05 → Q-R06 sequencing context, see `Q-R05-SPEC-AUDIT.md`._
