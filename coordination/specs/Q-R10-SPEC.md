# Q-R10-SPEC — Tessera Phase 1 SLICE 2b4: strict-tier mean_vector + covariance emission + sparse-encoding inverse-convention enforcement

_From: Architect (R10 pipeline run; full tier per A3 + A2 — see audit sidecar § Brainstorm)._
_To: Implementer._
_Date: 2026-05-17._
_HEAD at spec emit: `4869f65` (operator-led NEXT-ROLE.md prep for R10)._
_Audit sidecar: `coordination/specs/Q-R10-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, Q-R10 → Q-R11 sequencing context)._

---

## Spec preamble

R10 = Phase 1 SLICE 2b4: the per-shard runtime's strict-tier emission boundary. This round closes two deferrals that have been carry-forward since their origin rounds:

1. **R05 anti-scope deferral (SLICE 2b3 § R05-SAS-5)** — `mean_vector` / `covariance` emission at strict tier. R05 deferred to "R06+"; the actual round naturally absorbing it is R10 (R06/R07/R08-amendment/R09 absorbed the SLICE 4/5 baseline-curation arc instead).
2. **R02 MINOR-2 carry-forward** — sparse-encoding inverse-convention enforcement at non-strict tiers (Reviewer-flagged at R02 close, deferred each round since because no emission code was landing). R10 lands the emission AND the enforcement together because they share an emission site.

R10 introduces a small pure helper `projectTierGatedOutputs(residual)` co-located with `updatePerShardResidual` in `engine/per-shard/runtime.ts`. The helper:

- At strict tier with a well-formed `welford_state` (`n ≥ 2`), populates `mean_vector` from `welfordMean(welford_state)` and `covariance` from `welfordCovariance(welford_state)`, atomically (both emit together or neither).
- At all other tiers (`'none'`, `'warm_start'`, `'pooled'`, `'aggregate'`) AND at strict-with-insufficient-welford (the malformed-fixture edge), explicitly omits `mean_vector` + `covariance` from the output via destructure-spread.
- Does NOT touch `mean_delta` (R11+ scope per R10-SAS-4) — `mean_delta` spreads through unchanged.

`updatePerShardResidual` calls `projectTierGatedOutputs` as its final step. Tests bind the helper directly (so `'pooled'` and `'aggregate'` inverse-convention can be verified without going through `observeSample`, which never outputs those tiers).

Traces to PRD AC-P2 ("strict-upgrade at 60 samples preserves inherited single-instance behavior") at the EMISSION layer — R05 landed the accumulator that threads through every update; R10 lands the projection from accumulator to the inherited Family-C-shape `{ mean_vector: number[], covariance: number[][] }` at strict-tier boundaries (matching `FamilyCPerCell.mean_vector` / `.covariance` at `engine/types/families/c.ts:22-25`). Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row ("Warm-start cold-start mechanism — strict-upgrade ready"). Traces to R02 MINOR-2 — sparse-encoding inverse-convention enforced at the only authoritative writer in the per-shard runtime tree.

The architectural-layer split is the same pattern R02 → R03 → R04 → R05 used: compile-time schema (R02) → state-machine runtime (R03) → algorithm-as-pure-function (R04) → composition + accumulator-strategy (R05) → **emission + sparse-encoding-inverse-convention enforcement (R10)** → baseline-injection orchestration (R11+) → compiled-artifact loader + empirical-storage (R12+).

---

## Mechanism

### Architectural primitives

1. **Emission location decision: inline in `updatePerShardResidual` via a small extracted helper.** R05 audit sidecar OQ-2 surfaced two options: (read-time) projection in a separate function called by a future orchestrator; (write-time) projection inside `updatePerShardResidual`. R10 picks write-time, but factors the projection into a separate helper `projectTierGatedOutputs(residual)` co-located in `engine/per-shard/runtime.ts`. Rationale (full why-picked / why-rejected in audit sidecar § Decision rationale D1):
   - **Pro (write-time)**: matches operator scope wording in NEXT-ROLE.md ("populate both fields on the returned PerShardResidual") — `updatePerShardResidual` is the single runtime entry point; downstream consumers don't need to remember to call a separate projection function. R10 has no orchestrator caller yet to wire a read-time helper into, so a read-time-only design would ship dead code.
   - **Pro (separate helper)**: keeps the projection logic small + pure + directly testable. Tests can call `projectTierGatedOutputs` with synthetic `'pooled'` / `'aggregate'` inputs (which `observeSample` cannot produce — see primitive 6 below); without the helper, those tier inverses would be untestable.
   - **Con accepted**: one extra exported symbol in `engine/per-shard/runtime.ts`. Marginal.
   - **Con accepted**: `updatePerShardResidual` is no longer purely accumulation — it now also emits. The R05 spec § Open questions OQ-2 architect-pre-prediction (read-time) is documented-superseded here; the brainstorm re-evaluation appears in audit sidecar.

2. **Atomic emission gate at strict tier.** Emission criterion: `residual.confidence === 'strict' AND residual.welford_state !== undefined AND welfordCovariance(residual.welford_state) !== null`. The third clause folds together the n≥2 covariance prerequisite (`welfordCovariance` returns `null` for `n < 2` per `engine/per-shard/welford.ts:100-103`). When all three clauses hold: emit both `mean_vector` (via `welfordMean`) AND `covariance` (the non-null return). When any clause fails: emit neither. Rationale: strict-tier consumers (per PRD AC-P2 + inherited Family-C contract at `FamilyCPerCell.mean_vector` + `.covariance`) expect both fields together; a partial emission would violate the inherited semantic. The atomic gate is conservative against malformed-fixture inputs (a hand-constructed `confidence='strict'` residual with `welford_state.n < 2` simply does not emit — no exception thrown).

3. **Inverse-convention enforcement via destructure-then-spread.** At non-strict tiers (or strict-but-gated-off), `projectTierGatedOutputs` returns `{ ...rest }` where `rest` is the input residual with `mean_vector` and `covariance` keys destructured-out. This explicitly removes any stale-spread of those fields (e.g., a malformed `'warm_start'` input with a leftover `mean_vector` field). The output object has those keys ABSENT (not present-with-undefined-value); `JSON.stringify` does not emit them; `'mean_vector' in result` returns `false`. This is the strongest form of the inverse convention.

4. **`mean_delta` is NOT in R10 scope.** R10's helper does not destructure `mean_delta` out; it does not emit `mean_delta`; it does not assert anything about `mean_delta`. The helper carries `mean_delta` through untouched (via the `...rest` spread or the strict-tier output spread). R11+ scope: `mean_delta` computation (requires baseline injection) + inverse-convention enforcement at non-warm_start tiers. Documented at R10-SAS-4 + R10-SAS-5.

5. **No schema changes.** `PerShardResidual` interface unchanged at field level. Only the schema JSDoc is updated to document the R10-landed enforcement contract (Delta 1; documentation-only). Existing R05 field `welford_state?: WelfordState` is consumed by R10; existing optional fields `mean_vector?: number[]` and `covariance?: number[][]` remain typed as before.

6. **The state machine cannot output `'pooled'` or `'aggregate'`.** Per `engine/per-shard/warm-start.ts:91-94`, `observeSample`'s `newConfidence` is exactly one of `'none'`, `'warm_start'`, `'strict'` — derived from `n_samples` threshold rules. `'pooled'` and `'aggregate'` are L3-pooling outputs on the fleet-aggregate baseline (`BaselineCellEntry`), not state-machine outputs on per-shard residuals. This means `updatePerShardResidual`'s output `confidence` is always in `{'none', 'warm_start', 'strict'}`. The `'pooled'` / `'aggregate'` cases are tested via DIRECT calls to `projectTierGatedOutputs` with synthetic fixtures (per primitive 1's helper-extraction rationale).

7. **`welford_state` is internal accumulator, NOT subject to the inverse-convention enforcement.** Carried forward from R05 primitive 4: `welford_state` is present whenever `n_samples ≥ 1` regardless of confidence tier. R10's `projectTierGatedOutputs` does NOT touch `welford_state` (it spreads through via `rest` or via the strict-tier output spread). At strict tier the helper READS `welford_state` to derive `mean_vector` + `covariance`; at non-strict tiers the helper IGNORES `welford_state` but preserves it on the output.

### Cross-section consistency pass

(R01-derived reinforcement — 6th consecutive application; standing discipline.)

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | Emission location = inline (write-time) via helper | § Mechanism primitive 1; § Per-file pseudocode Delta 2 | Read-time-only (orchestrator-called); inline-without-helper | No `readMeanVector` / standalone-projection-without-runtime-call surface in pseudocode; helper IS factored out, not collapsed inline |
| 2 | Helper name = `projectTierGatedOutputs` | § Per-file pseudocode Delta 2; § Integration points; § AC-1 through AC-10 | `emitStrictTier`, `projectMeanVector`, `gateSparseEncoding` | No alternate name appears in pseudocode or test imports |
| 3 | Helper signature = `(residual: PerShardResidual) => PerShardResidual` | § Per-file pseudocode Delta 2; q10 test imports per Delta 3 | `(welford_state, confidence) => Partial<PerShardResidual>`; pass tier as separate arg | All signatures in pseudocode take a single PerShardResidual; no tier-as-arg form |
| 4 | Atomic emission gate = `confidence==='strict' AND welford_state !== undefined AND welfordCovariance(state) !== null` | § Mechanism primitive 2; § Per-file pseudocode Delta 2; AC-1 + AC-7 + AC-8 | Gate by `n_samples >= STRICT_UPGRADE_THRESHOLD` (would diverge under malformed fixtures); gate by `welford_state.n >= 2` only (no tier check); split gate (emit mean_vector even when covariance null) | Pseudocode uses three-clause AND; AC-7 + AC-8 bind the atomic semantic (both absent when gate fails) |
| 5 | Inverse-convention enforcement = destructure-then-spread (key absent) | § Mechanism primitive 3; § Per-file pseudocode Delta 2 | Set-to-undefined (`{ ...rest, mean_vector: undefined }`); explicit `delete` mutation; runtime invariant assertion + throw | Pseudocode uses `const { mean_vector: _omv, covariance: _ocv, ...rest } = residual; return rest;` — produces output with keys absent |
| 6 | `mean_delta` untouched at R10 | § Mechanism primitive 4; § Anti-scope R10-SAS-4 + R10-SAS-5; § Per-file pseudocode Delta 2 | Destructure mean_delta out (would force R11+ to re-introduce it; premature stripping); compute mean_delta at warm_start (out of scope — requires baseline injection) | Pseudocode does NOT destructure `mean_delta`; AC-12 verifies stale-input `mean_delta` passes through unmodified |
| 7 | No schema changes (JSDoc-only on PerShardResidual) | § Mechanism primitive 5; § Component inventory; § Per-file pseudocode Delta 1 | Add a discriminated-union refactor on PerShardResidual (out of scope per R10 boundedness; was R02 OQ-2 candidate); add a new field | Delta 1 is JSDoc text replacement only; tsc-level shape of PerShardResidual is byte-identical pre/post R10 |
| 8 | `updatePerShardResidual` final step = `return projectTierGatedOutputs(merged)` | § Per-file pseudocode Delta 2 | Inline the projection logic without a helper call; call helper conditionally (e.g., only at strict-tier transitions) | Pseudocode always calls helper on every update; helper itself contains the gate logic |
| 9 | New module path = unchanged (`engine/per-shard/runtime.ts` extended; no new file) | § Component inventory | New module `engine/per-shard/emission.ts`; new module `engine/per-shard/tier-gate.ts` | All consumers import `projectTierGatedOutputs` from `engine/per-shard/runtime`; no sibling file added |
| 10 | Tests directly call `projectTierGatedOutputs` for `'pooled'` / `'aggregate'` inputs | § Mechanism primitive 6; § Per-file pseudocode Delta 3 (AC-5 + AC-6) | Mock `observeSample` to return `'pooled'` (impossible — observeSample's tier rule is fixed); use only updatePerShardResidual + verify the never-produced case isn't covered | AC-5 + AC-6 import `projectTierGatedOutputs` directly and feed synthetic fixtures |
| 11 | Atomic gate at strict-but-undef-welford → no emission (no throw) | § Mechanism primitive 2; AC-7 | Throw on strict-tier with welford undefined ("malformed input"); emit mean_vector with zero-length array | AC-7 expects mean_vector/covariance absent in output; no `assert.throws` at this gate |
| 12 | Stale-spread strip at non-strict tiers via destructure-and-spread | § Mechanism primitive 3; AC-12 | Carry-forward stale mean_vector (would violate inverse convention); throw on stale input | AC-12 binds: input warm_start with stale mean_vector → output mean_vector === undefined |
| 13 | TDD ordering = RED commit (q10 test file with assertions that fail against pre-R10 runtime) + GREEN commit (runtime.ts emission + JSDoc) | § Per-file pseudocode Implementer note 4; AC-15 | Single-commit landing; non-failing test at RED | AC-15 specifies two-commit ordering; pre-R10 runtime does not emit mean_vector/covariance, so q10 strict-tier assertion would fail at RED |
| 14 | File-creation track-state: `test/q10-per-shard-emission.test.ts` does not exist at HEAD `4869f65` | § Component inventory directory-creation note | Assumed pre-existing | `git ls-files test/q10*.test.ts` verified at HEAD `4869f65` — empty output (file does not exist) |
| 15 | No modification to `engine/per-shard/welford.ts` | § Anti-scope R10-SAS-2 | Modify welfordCovariance to throw at n<2 instead of returning null | welford.ts diff at R10 = empty (R10-SAS-2 fenced); R10 reads welfordCovariance with null-check |
| 16 | No modification to `engine/per-shard/warm-start.ts` | § Anti-scope R10-SAS-3 | Modify observeSample to gate emission (would conflate state machine with emission); modify thresholds | warm-start.ts diff at R10 = empty |

All 16 checks PASS at spec-emit time. The cross-section pass is now standing discipline at Tessera; this is the 6th consecutive application (R02=9 / R03=13 / R04=12 / R05=15 / R10=16).

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `engine/types/config.ts` | CHANGED | Delta 1: PerShardResidual JSDoc docstring updated to document R10's emission enforcement contract. NO type-level changes (no new fields; no new imports; no signature changes). Binds AC-19. |
| `engine/per-shard/runtime.ts` | CHANGED | Delta 2: (a) extend import block to add `welfordMean` + `welfordCovariance` from `./welford`; (b) add new exported pure helper `projectTierGatedOutputs(residual: PerShardResidual): PerShardResidual`; (c) modify `updatePerShardResidual`'s final return to pass through `projectTierGatedOutputs`. ExtendedSampleObservation unchanged. Composition function signature unchanged. |
| `test/q10-per-shard-emission.test.ts` | CREATED | Delta 3: new test file binding AC-1 through AC-11 + AC-19 surfaces below. |
| `engine/per-shard/welford.ts` | UNCHANGED | R10-SAS-2 fence: welford module is consumed unchanged. |
| `engine/per-shard/warm-start.ts` | UNCHANGED | R10-SAS-3 fence: state machine is composed unchanged. |
| `test/_substrate/factories.ts` | UNCHANGED | R10-SAS-14 fence: makePerShardResidual (R03-shipped) sufficient for R10 fixtures. |

**Directory-creation track-state verification** (R02 OBS-2 file-track-state reinforcement applied inversely):
- `engine/per-shard/` — exists (R03-created).
- `test/` — exists (R01-created).
- `test/q10-per-shard-emission.test.ts` — does NOT exist at HEAD `4869f65` (`git ls-files test/q10*` → empty). RED commit creates this file only.
- `engine/per-shard/runtime.ts` — exists (R05-created). Modified by GREEN commit.
- `engine/types/config.ts` — exists. JSDoc-only modification by GREEN commit.

---

## Integration points

(R03-derived re-export-chain-check reinforcement applied — for each named symbol consumed in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)

1. **`engine/per-shard/runtime.ts` ↔ `engine/per-shard/welford.ts` (existing edge extended).** runtime.ts post-R10 imports `WelfordState`, `initialWelfordState`, `updateWelford`, **`welfordMean`** (NEW at R10), **`welfordCovariance`** (NEW at R10) from `./welford` (five identifiers, two new). Declaration sites verified at `engine/per-shard/welford.ts`: `welfordMean` at line 93 (`export function welfordMean`); `welfordCovariance` at line 100 (`export function welfordCovariance`). Both public per the `export` modifier on each declaration. No re-export chain to traverse (welford.ts exports at the declaration site).

2. **`engine/per-shard/runtime.ts` ↔ `engine/types/config.ts` (existing edge).** runtime.ts imports `PerShardResidual` from `../types/config` (unchanged at R10). PerShardResidual interface shape unchanged at R10; only the JSDoc is updated (Delta 1).

3. **`engine/per-shard/runtime.ts` ↔ `engine/per-shard/warm-start.ts` (existing edge).** runtime.ts imports `observeSample`, `SampleObservation` from `./warm-start` (unchanged at R10). R10 does NOT consume `WARM_START_THRESHOLD` or `STRICT_UPGRADE_THRESHOLD` inside runtime.ts — the emission gate uses `confidence === 'strict'` (the post-observeSample tier value), not the raw threshold integers.

4. **`test/q10-per-shard-emission.test.ts` ↔ `engine/per-shard/runtime.ts`.** q10 imports (from `../engine/per-shard/runtime`):
   - `updatePerShardResidual` (the composition function; tested at AC-9 + AC-11 + AC-12 surfaces).
   - `projectTierGatedOutputs` (the new helper; tested at AC-1 through AC-8 + AC-10 + AC-11 surfaces).
   - `type ExtendedSampleObservation` (type-only; for AC-9 + AC-11 + AC-12 ergonomic typing).

5. **`test/q10-per-shard-emission.test.ts` ↔ `engine/per-shard/welford.ts`.** q10 imports (from `../engine/per-shard/welford`):
   - `welfordMean` (for AC-1 cross-check assertion: `emitted.mean_vector` deep-equals `welfordMean(welford_state)`).
   - `welfordCovariance` (for AC-1 cross-check assertion: `emitted.covariance` deep-equals `welfordCovariance(welford_state)`; null-return semantic referenced at AC-8 hand-trace).

6. **`test/q10-per-shard-emission.test.ts` ↔ `engine/per-shard/warm-start.ts`.** q10 imports `initialPerShardResidual` (for AC-9 + AC-11 cold-start fixtures). Does NOT import the THRESHOLD constants (R05 MINOR-2 reinforcement: avoid dead imports — q10's fixtures use explicit `n_samples: 59` / `n_samples: 60` literals where the threshold semantics are tested by-name in the AC docstring, not by-constant).

7. **`test/q10-per-shard-emission.test.ts` ↔ `test/_substrate/factories.ts`.** q10 imports `makePerShardResidual` (for synthetic-fixture construction at AC-3 through AC-8 + AC-10 + AC-12).

8. **`engine/per-shard/runtime.ts` ↔ inherited vendored engine internals.** ZERO inherited-vendored imports added at R10 (carry-forward from R05; runtime.ts continues to compose only Tessera-original modules + the schema). No transitive compile-time concerns introduced via Family-A/C/D/E surfaces.

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **Helper name** is exactly `projectTierGatedOutputs` (snake_lower-camel mixed per JS export-function convention; verb-noun-noun form). Verify with `grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts` → expect 1 (exactly one export at the function declaration site). `grep -c "projectTierGatedOutputs" engine/per-shard/runtime.ts` may return >1 (the helper is also called from `updatePerShardResidual`'s final return).

2. **Atomic gate three-clause AND**: do NOT split the gate into `if (confidence === 'strict') { emit; }` followed by `if (welford_state) { ... }`. Use the single combined `if` form per Delta 2 pseudocode. A split gate makes it easier to accidentally emit partial output (e.g., mean_vector populated, covariance left absent).

3. **`welfordCovariance` null-return is the n<2 gate.** Per `engine/per-shard/welford.ts:100-103`, the function returns `null` for `n < 2`. Do NOT inspect `welford_state.n` directly in `projectTierGatedOutputs`; call `welfordCovariance` and check `!== null`. This delegates the n<2 semantic to welford.ts (single source of truth, R04 OQ-1 carry-forward).

4. **TDD ordering**: two-commit sequence.
   - RED commit creates `test/q10-per-shard-emission.test.ts`. The file imports `projectTierGatedOutputs` from `../engine/per-shard/runtime`, which does NOT yet export it at HEAD `4869f65` → tsc fails at RED with TS2305 (no exported member `projectTierGatedOutputs`). Verify RED state via `npm run typecheck` (expect exit 1, error message on the projectTierGatedOutputs import). DO NOT run `node --test` at RED — typecheck failure blocks the test runner.
   - GREEN commit modifies `engine/per-shard/runtime.ts` (Delta 2) + modifies `engine/types/config.ts` JSDoc (Delta 1). Verify GREEN via `npm run typecheck` (exit 0) + `node --test test/q10-per-shard-emission.test.js` (expect 11 pass / 0 fail per AC-16).

5. **Hand-trace verification before committing GREEN** — strict-tier emission with non-trivial covariance:
   - Construct `residual = { n_samples: 3, confidence: 'strict', welford_state: { n: 3, mean: [1, 2], m2: [[2, 1], [1, 8]] }, residual_seed_hash: 'sha:a', last_observed_at: 100 }`.
   - Call `projectTierGatedOutputs(residual)`. Expected output:
     - `mean_vector = welfordMean({n:3, mean:[1,2], m2:...}) = [1, 2]` (defensive copy of state.mean per welford.ts:94).
     - `covariance = welfordCovariance({n:3, mean:[1,2], m2:[[2,1],[1,8]]}) = m2/(n-1) = m2/2 = [[1, 0.5], [0.5, 4]]`.
     - Output residual: `{ n_samples: 3, confidence: 'strict', welford_state: { n: 3, mean: [1, 2], m2: [[2, 1], [1, 8]] }, residual_seed_hash: 'sha:a', last_observed_at: 100, mean_vector: [1, 2], covariance: [[1, 0.5], [0.5, 4]] }`.
   - AC-1 binds this exact hand-trace.

6. **AC-9 hand-trace** — cold-start walk to strict via `updatePerShardResidual`:
   - Start from `initialPerShardResidual()` = `{ n_samples: 0, confidence: 'none' }`.
   - Apply 60 samples `[1, 0]` under stable seed `'sha:a'`. Per R04 + R05 inheritance: welford_state advances to `n: 60, mean: [1, 0], m2: [[0, 0], [0, 0]]` (zero-variance samples → m2 stays zero).
   - At the 60th sample, observeSample transitions confidence from `'warm_start'` (at n=20-59) to `'strict'` (at n=60).
   - projectTierGatedOutputs applies: `confidence === 'strict' ✓ AND welford_state !== undefined ✓ AND welfordCovariance({n:60, mean:[1,0], m2:[[0,0],[0,0]]}) = [[0, 0], [0, 0]]` (non-null ✓).
   - Output: `mean_vector = [1, 0]`, `covariance = [[0, 0], [0, 0]]`.
   - AC-9 binds the presence + values.

### Delta 1 — `engine/types/config.ts` (CHANGED — JSDoc-only)

Locate the `PerShardResidual` interface JSDoc block at `engine/types/config.ts:860-872` (the docstring above `export interface PerShardResidual`). Replace the closing paragraph (the "Full runtime population semantics deferred to SLICE 2b." sentence + the R05 paragraph that follows it through the closing `*/`) with the R10-amended text below. The opening lines documenting the sparse-encoding convention rows remain unchanged.

```
// BEFORE (config.ts:860-872 area — the closing paragraph of the PerShardResidual JSDoc):
 *  Full runtime population semantics deferred to SLICE 2b.
 *
 *  R05 (SLICE 2b3) addition: welford_state is INTERNAL ACCUMULATOR STATE, NOT subject
 *  to the sparse-encoding convention above. It is present whenever n_samples >= 1
 *  regardless of confidence tier (the Welford recurrence accumulates across tier
 *  transitions to preserve PRD AC-P2's "single-instance behavior" invariant).
 *  R06 will project welford_state to the tier-gated OUTPUT fields (mean_vector /
 *  covariance / mean_delta) via the baseline-injection orchestration boundary. */

// AFTER:
 *  R10 (SLICE 2b4) emission contract — enforced by engine/per-shard/runtime.ts
 *  projectTierGatedOutputs (called as the final step of updatePerShardResidual):
 *    - At strict tier with welford_state present AND welfordCovariance(state) non-null
 *      (state.n >= 2): mean_vector AND covariance populated atomically from welfordMean
 *      + welfordCovariance.
 *    - At all other tiers ('none' / 'warm_start' / 'pooled' / 'aggregate') AND at
 *      strict-with-insufficient-welford: mean_vector AND covariance explicitly omitted
 *      from the output (destructure-then-spread; keys absent, not present-with-undefined).
 *    - mean_delta emission + inverse-convention enforcement remain R11+ scope; R10's
 *      runtime carries mean_delta through unchanged.
 *
 *  R05 (SLICE 2b3) addition: welford_state is INTERNAL ACCUMULATOR STATE, NOT subject
 *  to the sparse-encoding convention above. It is present whenever n_samples >= 1
 *  regardless of confidence tier (the Welford recurrence accumulates across tier
 *  transitions to preserve PRD AC-P2's "single-instance behavior" invariant).
 *  R10 (above) consumes welford_state at the strict-tier emission boundary. */
```

The interface body (`export interface PerShardResidual { … }`) is byte-identical pre/post R10 — no field additions, no signature changes, no import changes. Implementer verifies with `git diff` showing only docstring text changes within the JSDoc block above the `export interface` line.

### Delta 2 — `engine/per-shard/runtime.ts` (CHANGED)

Three sub-changes within the single file. Apply in this order to ease diff review:

**Delta 2a — extend import block** (line ~20 area, the existing welford imports):

```ts
// BEFORE (runtime.ts:20-24):
import {
  initialWelfordState,
  updateWelford,
  type WelfordState,
} from './welford';

// AFTER:
import {
  initialWelfordState,
  updateWelford,
  welfordMean,
  welfordCovariance,
  type WelfordState,
} from './welford';
```

**Delta 2b — add `projectTierGatedOutputs` helper** (placed AFTER the existing `updatePerShardResidual` function declaration; new exported function at the end of the file):

```ts
/** R10 (SLICE 2b4) — pure helper that enforces the R02 sparse-encoding convention
 *  at the per-shard runtime's emission boundary. Atomically populates mean_vector
 *  AND covariance at strict tier (when welford_state has accumulated enough samples
 *  for a valid covariance, i.e., welfordCovariance returns non-null) and explicitly
 *  omits both fields at all other tiers.
 *
 *  Gate criterion (all three clauses required for emission):
 *    1. residual.confidence === 'strict'
 *    2. residual.welford_state !== undefined
 *    3. welfordCovariance(residual.welford_state) !== null  (i.e., welford_state.n >= 2)
 *
 *  When the gate fires: emit mean_vector = welfordMean(state) AND covariance = (the
 *  non-null welfordCovariance return), overriding any stale spread of those fields
 *  from the input residual.
 *
 *  When the gate does NOT fire (non-strict tier OR strict-with-insufficient-welford):
 *  return the input residual with mean_vector and covariance keys destructured-out
 *  (keys ABSENT, not present-with-undefined). This strips any stale spread of those
 *  fields from a malformed input.
 *
 *  mean_delta is untouched (R11+ scope per R10-SAS-4 + R10-SAS-5); the helper carries
 *  it through unchanged via the `...rest` spread.
 *
 *  welford_state is untouched (the helper reads it at strict tier to derive emission
 *  values but does not modify or remove it on the output).
 *
 *  Pure function: no mutation of input residual; returns a new object (the destructure-
 *  spread always constructs a fresh object literal).
 */
export function projectTierGatedOutputs(
  residual: PerShardResidual,
): PerShardResidual {
  // Destructure mean_vector and covariance OUT of the input. `rest` contains everything
  // else, including welford_state, mean_delta, and the state-machine fields. This is the
  // sparse-encoding inverse-convention enforcement at non-strict tiers.
  const { mean_vector: _omitMv, covariance: _omitCov, ...rest } = residual;

  // Strict-tier atomic emission gate.
  if (
    residual.confidence === 'strict' &&
    residual.welford_state !== undefined
  ) {
    const cov = welfordCovariance(residual.welford_state);
    if (cov !== null) {
      return {
        ...rest,
        mean_vector: welfordMean(residual.welford_state),
        covariance: cov,
      };
    }
  }

  // Non-strict OR strict-but-insufficient: emit without mean_vector / covariance.
  return rest;
}
```

**Delta 2c — modify `updatePerShardResidual`'s final return** (the existing block at runtime.ts:91-95):

```ts
// BEFORE (runtime.ts:90-95):
  // 3. Merge state-machine output with new accumulator.
  return {
    ...stateTransition,
    welford_state: newAccumulator,
  };
}

// AFTER:
  // 3. Merge state-machine output with new accumulator.
  const merged: PerShardResidual = {
    ...stateTransition,
    welford_state: newAccumulator,
  };

  // 4. R10 (SLICE 2b4) emission + sparse-encoding inverse-convention enforcement.
  return projectTierGatedOutputs(merged);
}
```

No other changes to runtime.ts. The `ExtendedSampleObservation` interface, the `updatePerShardResidual` signature, and the file's module-level JSDoc are unchanged. Verify with:
- `grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts` → 1.
- `grep -c "projectTierGatedOutputs" engine/per-shard/runtime.ts` → 2 (one export declaration + one call inside updatePerShardResidual).
- `grep -c "welfordMean\|welfordCovariance" engine/per-shard/runtime.ts` → 4 (two import names + two callsites inside projectTierGatedOutputs).

### Delta 3 — `test/q10-per-shard-emission.test.ts` (CREATED)

The test file binds AC-1 through AC-11 (11 tests) + the AC-19 grep evidence is binding-command form (not a test body assertion). Total 11 tests in the file.

```ts
// test/q10-per-shard-emission.test.ts — R10 AC-1 through AC-11.
//
// Binds the SLICE 2b4 strict-tier mean_vector + covariance emission AND the
// sparse-encoding inverse-convention enforcement at non-strict tiers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updatePerShardResidual,
  projectTierGatedOutputs,
} from '../engine/per-shard/runtime';
import {
  welfordMean,
  welfordCovariance,
} from '../engine/per-shard/welford';
import { initialPerShardResidual } from '../engine/per-shard/warm-start';
import { makePerShardResidual } from './_substrate/factories';

// ─── R10 AC-1 — projectTierGatedOutputs at strict tier emits mean_vector + covariance with closed-form values ─
test('R10 AC-1 — strict tier with valid welford_state: emits mean_vector and covariance from welfordMean + welfordCovariance', () => {
  // Hand-trace fixture (matches Implementer note 5):
  // welford_state.n=3, mean=[1,2], m2=[[2,1],[1,8]] → covariance = m2/(n-1) = m2/2 = [[1, 0.5], [0.5, 4]].
  const residual = makePerShardResidual({
    n_samples: 3,
    confidence: 'strict',
    welford_state: { n: 3, mean: [1, 2], m2: [[2, 1], [1, 8]] },
    residual_seed_hash: 'sha:a',
    last_observed_at: 100,
  });
  const projected = projectTierGatedOutputs(residual);
  // Emission: mean_vector deep-equals welfordMean output; covariance deep-equals welfordCovariance output.
  assert.deepStrictEqual(projected.mean_vector, [1, 2]);
  assert.deepStrictEqual(projected.covariance, [[1, 0.5], [0.5, 4]]);
  // Cross-check against welford.ts helpers directly:
  assert.deepStrictEqual(projected.mean_vector, welfordMean(residual.welford_state!));
  assert.deepStrictEqual(projected.covariance, welfordCovariance(residual.welford_state!));
  // welford_state preserved on output (NOT subject to sparse-encoding convention).
  assert.deepStrictEqual(projected.welford_state, residual.welford_state);
  // State-machine fields preserved:
  assert.strictEqual(projected.n_samples, 3);
  assert.strictEqual(projected.confidence, 'strict');
  assert.strictEqual(projected.residual_seed_hash, 'sha:a');
  assert.strictEqual(projected.last_observed_at, 100);
});

// ─── R10 AC-2 — covariance properties at strict tier: d×d symmetric ─
test('R10 AC-2 — emitted covariance is d×d (length matches mean_vector.length) and symmetric (cov[i][j] === cov[j][i])', () => {
  // d=3 fixture with non-trivial cross-covariance.
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'strict',
    welford_state: {
      n: 5,
      mean: [1, 2, 3],
      m2: [
        [8, 2, 4],
        [2, 12, 6],
        [4, 6, 16],
      ],
    },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.ok(projected.mean_vector !== undefined);
  assert.ok(projected.covariance !== undefined);
  const d = projected.mean_vector!.length;
  assert.strictEqual(d, 3);
  // Outer dimension d.
  assert.strictEqual(projected.covariance!.length, d);
  // Inner dimensions all d AND symmetry.
  for (let i = 0; i < d; i++) {
    assert.strictEqual(projected.covariance![i].length, d);
    for (let j = 0; j < d; j++) {
      assert.strictEqual(
        projected.covariance![i][j],
        projected.covariance![j][i],
        `covariance asymmetric at [${i}][${j}] vs [${j}][${i}]`,
      );
    }
  }
});

// ─── R10 AC-3 — inverse-convention at 'none' tier: mean_vector + covariance absent ─
test("R10 AC-3 — at 'none' tier: projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'none',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  // Key-absence form (stronger than undefined): not just value-undefined, key not present.
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
  // welford_state still present (not subject to inverse-convention).
  assert.ok(projected.welford_state !== undefined);
});

// ─── R10 AC-4 — inverse-convention at 'warm_start' tier: mean_vector + covariance absent ─
test("R10 AC-4 — at 'warm_start' tier: projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 25, mean: [1, 2], m2: [[24, 0], [0, 24]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-5 — inverse-convention at 'pooled' tier (synthetic fixture; observeSample cannot emit this tier) ─
test("R10 AC-5 — at 'pooled' tier (synthetic fixture): projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'pooled',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-6 — inverse-convention at 'aggregate' tier (synthetic fixture; observeSample cannot emit this tier) ─
test("R10 AC-6 — at 'aggregate' tier (synthetic fixture): projectTierGatedOutputs output has mean_vector + covariance absent", () => {
  const residual = makePerShardResidual({
    n_samples: 5,
    confidence: 'aggregate',
    welford_state: { n: 5, mean: [1, 2], m2: [[4, 0], [0, 4]] },
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-7 — atomic gate at strict tier with welford_state undefined: no emission ─
test('R10 AC-7 — strict tier with welford_state undefined: no emission (atomic gate)', () => {
  const residual = makePerShardResidual({
    n_samples: 80,
    confidence: 'strict',
    // welford_state intentionally absent — malformed-fixture case.
  });
  const projected = projectTierGatedOutputs(residual);
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
});

// ─── R10 AC-8 — atomic gate at strict tier with welford_state.n=1: no emission (welfordCovariance returns null) ─
test('R10 AC-8 — strict tier with welford_state.n=1: no emission (welfordCovariance returns null at n<2)', () => {
  const residual = makePerShardResidual({
    n_samples: 80,
    confidence: 'strict',
    welford_state: { n: 1, mean: [5, 7], m2: [[0, 0], [0, 0]] },
  });
  // Pre-check: welfordCovariance returns null at n=1 (cross-binding to R04 contract).
  assert.strictEqual(welfordCovariance(residual.welford_state!), null);
  const projected = projectTierGatedOutputs(residual);
  // Atomic gate: even though welfordMean would succeed at n=1, NEITHER field emits.
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
});

// ─── R10 AC-9 — updatePerShardResidual cold-start walk to strict emits mean_vector + covariance ─
test('R10 AC-9 — updatePerShardResidual: cold-start walk of 60 samples [1,0] yields strict tier with mean_vector=[1,0] and covariance=[[0,0],[0,0]]', () => {
  let r = initialPerShardResidual();
  for (let i = 0; i < 60; i++) {
    r = updatePerShardResidual(r, {
      observedAt: 1000 + i,
      residualSeedHash: 'sha:a',
      sampleVector: [1, 0],
    });
  }
  assert.strictEqual(r.n_samples, 60);
  assert.strictEqual(r.confidence, 'strict');
  // Zero-variance samples: mean=[1,0]; m2=0 → covariance=0.
  assert.deepStrictEqual(r.mean_vector, [1, 0]);
  assert.deepStrictEqual(r.covariance, [[0, 0], [0, 0]]);
});

// ─── R10 AC-10 — stale-spread strip: malformed warm_start input with leftover mean_vector → output strips them ─
test('R10 AC-10 — projectTierGatedOutputs strips stale mean_vector / covariance from a malformed warm_start input', () => {
  const malformed = makePerShardResidual({
    n_samples: 25,
    confidence: 'warm_start',
    welford_state: { n: 25, mean: [1, 2], m2: [[24, 0], [0, 24]] },
    mean_vector: [99, 99],         // stale — convention says these should NOT be present at warm_start.
    covariance: [[99, 99], [99, 99]],  // stale
    mean_delta: [0.5, 0.6],         // R10 carries this through untouched (R11+ scope).
  });
  const projected = projectTierGatedOutputs(malformed);
  // Stale mean_vector + covariance stripped (keys absent on output).
  assert.strictEqual(projected.mean_vector, undefined);
  assert.strictEqual(projected.covariance, undefined);
  assert.strictEqual('mean_vector' in projected, false);
  assert.strictEqual('covariance' in projected, false);
  // mean_delta carried through unchanged (R10 anti-scope R10-SAS-4).
  assert.deepStrictEqual(projected.mean_delta, [0.5, 0.6]);
});

// ─── R10 AC-11 — defensive copy: mutating returned mean_vector does not affect welford_state.mean ─
test('R10 AC-11 — emitted mean_vector is a defensive copy (mutation does not propagate to welford_state.mean)', () => {
  const residual = makePerShardResidual({
    n_samples: 3,
    confidence: 'strict',
    welford_state: { n: 3, mean: [1, 2], m2: [[2, 0], [0, 2]] },
  });
  const projected = projectTierGatedOutputs(residual);
  // Mutate the returned mean_vector.
  projected.mean_vector![0] = 999;
  // Original welford_state.mean is unchanged (welfordMean defensive copy semantic; q04 AC-9 carry-forward).
  assert.deepStrictEqual(residual.welford_state!.mean, [1, 2]);
  // projected.welford_state shares the same reference as residual.welford_state in this implementation;
  // verify the underlying mean array is unchanged via the residual side (load-bearing assertion).
  assert.strictEqual(residual.welford_state!.mean[0], 1);
});
```

---

## Acceptance criteria

Numbered 1-19. Every AC is "Given X, when Y, then Z" or an evidence-bound assertion with a verifiable command. No grep patterns that match inside `//` executable-code comments (R03 MINOR-2 reinforcement); the JSDoc-content grep at AC-19 intentionally targets JSDoc text per the same reinforcement's intent-alignment clause.

**Emission + inverse-convention (R10 surface):**

- **AC-1** — _Given_ a `PerShardResidual` with `confidence='strict'`, `welford_state={n:3, mean:[1,2], m2:[[2,1],[1,8]]}`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` deep-equal to `[1, 2]` AND `covariance` deep-equal to `[[1, 0.5], [0.5, 4]]` (closed-form: `m2 / (n-1) = m2 / 2`). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-1 …" passes.

- **AC-2** — _Given_ a strict-tier residual with `welford_state` of dimensionality `d` and non-trivial `m2`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the emitted `covariance` is a `d × d` matrix (outer length `d`, every inner length `d`) AND symmetric (`covariance[i][j] === covariance[j][i]` for all `i, j ∈ [0, d)`). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-2 …" passes (parameterized over a `d=3` fixture).

- **AC-3** — _Given_ a `PerShardResidual` with `confidence='none'` (with or without welford_state), _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector === undefined` AND `covariance === undefined` AND `'mean_vector' in result === false` AND `'covariance' in result === false`. Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-3 …" passes.

- **AC-4** — _Given_ a `PerShardResidual` with `confidence='warm_start'`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent (both `=== undefined` AND key not in result). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-4 …" passes.

- **AC-5** — _Given_ a `PerShardResidual` with `confidence='pooled'` (synthetic fixture; `observeSample` cannot output this tier per Mechanism primitive 6), _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent. Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-5 …" passes.

- **AC-6** — _Given_ a `PerShardResidual` with `confidence='aggregate'` (synthetic fixture; `observeSample` cannot output this tier), _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent. Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-6 …" passes.

- **AC-7** — _Given_ a `PerShardResidual` with `confidence='strict'` AND `welford_state === undefined`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent (atomic gate: clause 2 fails; no exception thrown). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-7 …" passes.

- **AC-8** — _Given_ a `PerShardResidual` with `confidence='strict'` AND `welford_state={n:1, mean:[5,7], m2:[[0,0],[0,0]]}`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent (atomic gate: `welfordCovariance` returns `null` at `n < 2`; no partial emission). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-8 …" passes.

- **AC-9** — _Given_ `initialPerShardResidual()`, _when_ `updatePerShardResidual` is called 60 times with `sampleVector=[1, 0]` under stable seed `'sha:a'`, _then_ the final result has `n_samples=60`, `confidence='strict'`, `mean_vector` deep-equal to `[1, 0]`, AND `covariance` deep-equal to `[[0, 0], [0, 0]]` (zero-variance samples). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-9 …" passes.

- **AC-10** — _Given_ a malformed `'warm_start'` residual carrying stale `mean_vector=[99,99]`, stale `covariance=[[99,99],[99,99]]`, AND `mean_delta=[0.5, 0.6]`, _when_ `projectTierGatedOutputs(residual)` is called, _then_ the result has `mean_vector` + `covariance` absent (stale spread stripped via destructure-then-spread) AND `mean_delta` deep-equal to `[0.5, 0.6]` (untouched; R10-SAS-4). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-10 …" passes.

- **AC-11** — _Given_ a strict-tier residual with `welford_state.mean=[1, 2]`, _when_ `projectTierGatedOutputs(residual)` returns AND the caller mutates `result.mean_vector[0] = 999`, _then_ `residual.welford_state.mean[0]` remains `1` (welfordMean defensive copy semantic; q04 AC-9 carry-forward preserved through R10 composition). Evidence: `test/q10-per-shard-emission.test.ts` "R10 AC-11 …" passes.

**Compile + test substrate health:**

- **AC-12** — _Given_ the GREEN commit, _when_ `npm run typecheck` is run from the repo root, _then_ exit code is 0 with no error output. Evidence: Reviewer-run command.

- **AC-13** — _Given_ the GREEN commit, _when_ all pre-R10 test files are run independently, _then_ each produces the OBSERVED pass count it produced at R09 close — no regressions. Implementer reports OBSERVED output per R03 MINOR-4 reinforcement; do NOT pre-state counts. Reference: pre-R10 baseline (Reviewer-verified at R09 HEAD `640c8e8`) was q01-vendoring-coverage=3, q01-no-at-pin-deltas=1, q01-schema-additions=5, q02-schema-extension=6, q03-warm-start-runtime=13, q04-welford-stats=11, q05-per-shard-runtime=13, q06-baseline-pre-pass=13, q07-fleet-correlated=23, betting-e-process smoke=5; total 93. R10 changes are emission-additive (Delta 2 modifies `updatePerShardResidual` output to add `mean_vector`/`covariance` at strict tier — pre-R10 q05 tests do not assert their ABSENCE; verified at spec authoring by reading q05 AC-9 + AC-11 which check welford_state presence/round-trip but not mean_vector/covariance bindings). Evidence: Reviewer-run `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js test/q02-schema-extension.test.js test/q03-warm-start-runtime.test.js test/q04-welford-stats.test.js test/q05-per-shard-runtime.test.js test/q06-baseline-pre-pass.test.js test/q07-fleet-correlated.test.js test/betting-e-process-class-dispatch.test.js`.

- **AC-14** — _Given_ the GREEN commit, _when_ `node --test test/q10-per-shard-emission.test.js` is run, _then_ pass count equals 11 and fail count equals 0 (the spec lists 11 in-file ACs against `test/q10-per-shard-emission.test.ts` so 11 tests is the expected count — structurally pre-determined per R03 MINOR-4 reinforcement's exception clause). Evidence: Reviewer-run `node --test`.

- **AC-15** — _Given_ the R10 commit sequence, _when_ `git log --oneline -- test/q10-per-shard-emission.test.ts engine/per-shard/runtime.ts` is run, _then_ a RED commit (adding `test/q10-per-shard-emission.test.ts`) precedes a GREEN commit (modifying `engine/per-shard/runtime.ts` + `engine/types/config.ts`). Evidence: Reviewer-run `git log --oneline` produces two commits in the correct order; `git show <RED> --stat` shows only `test/q10-per-shard-emission.test.ts` added (no engine/* changes at RED).

- **AC-16** — _Given_ the GREEN commit, _when_ `node --test test/betting-e-process-class-dispatch.test.js` is run, _then_ pass count equals 5 and fail count equals 0 (inherited Ville-bound smoke regression baseline; carry-forward from R01 AC-10). Evidence: Reviewer-run `node --test`.

- **AC-17** — _Given_ the GREEN commit, _when_ the runtime.ts file content is inspected, _then_ all of: (a) `grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts` returns 1; (b) `grep -c "welfordMean" engine/per-shard/runtime.ts` returns at least 2 (import + callsite); (c) `grep -c "welfordCovariance" engine/per-shard/runtime.ts` returns at least 2 (import + callsite). Evidence: Reviewer-run greps.

- **AC-18** — _Given_ the GREEN commit, _when_ `engine/per-shard/welford.ts` and `engine/per-shard/warm-start.ts` are inspected via `git diff aee274c..HEAD` (or the R09 close SHA `640c8e8`..HEAD), _then_ neither file changed at R10 (R10-SAS-2 + R10-SAS-3 fences). Evidence: Reviewer-run `git diff 640c8e8..HEAD -- engine/per-shard/welford.ts engine/per-shard/warm-start.ts` produces empty output.

- **AC-19** — _Given_ the GREEN commit, _when_ the config.ts JSDoc Delta 1 is inspected, _then_ all of: (a) `grep -c "R10 (SLICE 2b4) emission contract" engine/types/config.ts` returns at least 1 (new JSDoc paragraph present); (b) `grep -c "projectTierGatedOutputs" engine/types/config.ts` returns at least 1 (the R10 helper cited in the JSDoc); (c) `grep -c "Full runtime population semantics deferred to SLICE 2b" engine/types/config.ts` returns 0 (the R05-era deferred-pointer is removed). Evidence: Reviewer-run greps. (Per R03 MINOR-2 reinforcement intent-alignment clause: these greps target JSDoc literal content — the comment text IS the verification target — so the grep matching in comments is the desired behavior, not a soundness gap.)

---

## Anti-scope

R10 ships exactly the three-surface inventory above; the following enumerate paths the Implementer must NOT touch. Encountering apparent need → HALT and write a DIAGNOSTIC.

- **R10-SAS-1: NO modification to `engine/types/config.ts` outside Delta 1.** Delta 1 is precisely the JSDoc text replacement on the PerShardResidual interface docstring described in § Per-file pseudocode. No field additions; no type-level changes; no import changes. The `PerShardResidual` interface body is byte-identical pre/post R10.

- **R10-SAS-2: NO modification to `engine/per-shard/welford.ts`.** R10 consumes `welfordMean` and `welfordCovariance` unchanged. Modifying their signatures (e.g., to throw at `n < 2` instead of returning null) would require regressing R04 tests AND would conflict with R10's atomic-gate design choice. Implementer encountering apparent need to modify welford.ts → HALT.

- **R10-SAS-3: NO modification to `engine/per-shard/warm-start.ts`.** R10 composes `observeSample` unchanged. The R10 emission gate uses `confidence === 'strict'` (the post-observeSample tier), NOT raw threshold constants — so `WARM_START_THRESHOLD` / `STRICT_UPGRADE_THRESHOLD` are unconsumed at runtime.ts and the warm-start.ts file does not need to change. Implementer encountering apparent need to modify warm-start.ts → HALT.

- **R10-SAS-4: NO `mean_delta` computation.** Still deferred (R05-SAS-4 carry-forward). Requires fleet-aggregate `BaselineCellEntry` injection — orchestrator scope; R11+ work. R10's runtime does NOT take a baseline parameter; does NOT compute or emit `mean_delta`. The R10 helper does NOT destructure `mean_delta` out (it spreads through unchanged). Implementer encountering apparent need to add a baseline parameter OR compute `mean_delta` → HALT.

- **R10-SAS-5: NO `mean_delta` inverse-convention enforcement.** Convention says `mean_delta` is present ONLY at `'warm_start'` tier. R10 does NOT enforce this — `mean_delta` flows through `projectTierGatedOutputs` unchanged. R11+ scope: when `mean_delta` computation lands, the same emission site can be extended to enforce `mean_delta` absence at non-warm_start tiers.

- **R10-SAS-6: NO compiled-artifact JSON loader.** Still deferred (R05-SAS-9 carry-forward). R11+ candidate (SLICE 2c open).

- **R10-SAS-7: NO PR-F5 empirical storage profile measurement.** Still deferred (R05-SAS-10 carry-forward).

- **R10-SAS-8: NO `mergeWelfordStates` / parallel-Welford / Chan-Golub-LeVeque combination.** Still deferred (R05-SAS-7 carry-forward). Phase 1 SLICE 3 fleet-pooling scope.

- **R10-SAS-9: NO new top-level engine directory; no new sibling to `engine/per-shard/`; no new file under `engine/per-shard/` (e.g., NO `emission.ts`, NO `tier-gate.ts`).** R10's helper lives inside the existing `engine/per-shard/runtime.ts`. Single-file extension keeps the surface tight.

- **R10-SAS-10: NO modification to `tsconfig.json` / `tsconfig.test.json` / `package.json`.** Existing test glob covers the new file (verified at HEAD `4869f65` per `tsconfig.test.json:13-15`). No new dependencies introduced.

- **R10-SAS-11: NO modification to `test/q01-*.test.ts`, `test/q02-*.test.ts`, `test/q03-*.test.ts`, `test/q04-*.test.ts`, `test/q05-*.test.ts`, `test/q06-*.test.ts`, `test/q07-*.test.ts`.** All prior-round tests still pass per AC-13 by virtue of R10 changes being either documentation-only (Delta 1) or emission-additive (Delta 2 — pre-R10 q05 tests do not assert mean_vector/covariance absence; verified at spec authoring). Implementer encountering apparent need to modify a prior-round test → HALT (likely indicates a regression that should be fixed at the production-code side, not by editing the test).

- **R10-SAS-12: NO bundling of R05 OBS-1 (welfordCovariance defensive-copy unbound at q05), OBS-2 (baseline-refresh-with-dim-change), OBS-3 (welfordCovariance read-back gap), OBS-4 (AC-13 dynamic import style), OBS-5 (Implementer test-count attestation aggregate format) closures.** Each is an architect-acknowledged residual; R05 MINOR-1 (Architect component-inventory AC-count drift), R05 MINOR-2 (dead-weight imports), and R05 MINOR-3 (attestation discrepancy) are similarly NOT bundled — R10 surface is small and bounded; absorbing R05 follow-ups would expand scope.

   Note on OBS-3 specifically: R05 OBS-3 was "welfordCovariance unread in q05 test"; R10 naturally CLOSES this because q10 AC-1 directly cross-checks `projected.covariance` against `welfordCovariance(residual.welford_state!)`. This is a coincidental closure (not a bundled disposition), and the R10 spec documents it here for memorial traceability.

- **R10-SAS-13: NO modification to `test/_substrate/factories.ts`.** R03-shipped factories sufficient for R10 (makePerShardResidual handles all R10 fixture needs).

- **R10-SAS-14: NO modification to inherited vendored engine internals.** A12 carry-forward (R01 SAS-7/8 → R02 SAS-8 → R03 SAS-9 → R04 SAS-12 → R05 SAS-15 chain).

- **R10-SAS-15: NO modification to `coordination/VENDORING-MANIFEST.md`.** No new vendored files at R10.

- **R10-SAS-16: NO modification to `coordination/PRD.md`.** Operator-owned.

- **R10-SAS-17: NO modification to `tools/vendor-from-deploysignal.sh`.** Carry-forward.

- **R10-SAS-18: NO modification to `coordination/SCOPING-MEMO-v0.3.md` or `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md`.** Operator-owned scoping artifacts.

- **R10-SAS-19: NO modification to `engine/types/primitives.ts` or other inherited typedef sites.** R10 introduces zero new external typedefs.

- **R10-SAS-20: NO modification to `tools/curate-baseline-pre-pass.ts` or `tools/curate-baseline-fleet-correlated.ts`.** R06/R07/R08-amendment closed surfaces; per NEXT-ROLE.md R10 scope statement. R10 is per-shard runtime; baseline curation closed at R09.

- **R10-SAS-21: NO new export from `engine/per-shard/runtime.ts` beyond `projectTierGatedOutputs`.** The existing exports (`updatePerShardResidual`, `type ExtendedSampleObservation`) are preserved unchanged. R10 adds exactly one new export.

- **R10-SAS-22: NO addition of runtime-invariant assertions (throw on detected violation).** R10's enforcement is by-construction (destructure-then-spread strips stale fields) rather than by-assertion. An invariant assertion that throws on a malformed input would be scope creep — the spec's stance is that the destructure-spread IS the enforcement; downstream consumers do not need to defensively check the convention because the runtime emitter is authoritative.

- **R10-SAS-23: NO addition of a sparse-encoding-convention discriminated-union refactor on `PerShardResidual`.** R02 OQ-2 candidate; would require a non-trivial type-system refactor (tier as discriminator with per-tier variant interfaces). Out of R10 scope — R10's enforcement is via the destructure-spread, not the type system.

---

## Open questions

(Unresolvable ambiguities only — none of these blocks R10; each is fenced as a future-round decision. R05's open questions OQ-1 through OQ-5 are carry-forward; only those whose dispositions touch R10 are surfaced here.)

1. **OQ-R10-1: At R11+ when `mean_delta` computation lands, should `projectTierGatedOutputs` be extended to also gate `mean_delta` (warm_start tier only), or should a separate `projectMeanDelta` helper be added?** Architect-pre-prediction: extend `projectTierGatedOutputs` (single emission boundary; orthogonal-tier gating). R11+ architect's call. Implementer does not act on this at R10.

2. **OQ-R10-2: Should `projectTierGatedOutputs` eventually be split into `gateStrictTierEmission` + `stripNonStrictEmission` for explicit two-direction naming?** Architect-pre-prediction: NO — the destructure-then-spread pattern atomically handles both directions, and the helper's single-pass semantics is clearer than a paired-function form. Not a R11+ disposition candidate unless future emission requirements complicate the helper.

3. **OQ-R10-3: The atomic-gate semantic at strict-but-insufficient-welford (AC-7 + AC-8) is conservative. Should there be a runtime invariant assertion that detects this case at `updatePerShardResidual`'s entry (e.g., reject input with `n_samples >= 60` and `welford_state===undefined`)?** Architect-pre-prediction: NO (R10-SAS-22 fences this) — the runtime's responsibility is to PRODUCE well-formed output; INPUT well-formedness is the construction site's responsibility (factories, orchestrator, tests). Adding an entry-side invariant assertion would conflate concerns and increase the runtime's API surface. R11+ orchestrator may add its own input validation if needed.

4. **OQ-R10-4: R05 OQ-2 (READ-time vs WRITE-time projection) — R10 picks WRITE-time. Should a future round walk this back if/when a read-time orchestrator surface emerges?** Architect-pre-prediction: NO — write-time is the more conservative choice (consumers always see the projected residual; no risk of forgetting to call a separate projection function). If a read-time use case emerges, `projectTierGatedOutputs` is already a pure helper that the orchestrator can call directly (no API change needed). Documented brainstorm re-evaluation appears in audit sidecar § Brainstorm re-evaluation per the R09-derived correction-propagation reinforcement.

5. **OQ-R10-5: R02 MINOR-2's "discriminated-union refactor vs runtime-invariant assertion" choice — R10 picks neither (instead: destructure-spread enforcement at the emission boundary).** Is this a third option that the R02 architect should have surfaced? Architect-pre-prediction: YES — R10's destructure-spread approach is a third disposition class that R02's two-option framing missed. Documented for spec-archaeology purposes; no R11+ action item.

All five open questions are R11+ disposition candidates; none block the R10 acceptance criteria.

---

## P3 ten-axis verification

1. **Correctness** — Strict-tier emission produces `mean_vector` deep-equal to `welfordMean(welford_state)` and `covariance` deep-equal to `welfordCovariance(welford_state)` (AC-1 hand-trace + AC-2 properties). Inverse-convention enforcement produces output with `mean_vector` + `covariance` keys absent at all 4 non-strict tiers (AC-3 through AC-6). Atomic gate at strict-but-insufficient-welford produces neither field (AC-7 + AC-8). Integration through `updatePerShardResidual` at cold-start-to-strict produces the expected emission (AC-9). Welford correctness inherited from R04 (already audited).

2. **Completeness** — Three emission-decision branches bound: (i) strict tier with valid welford → both fields emit (AC-1 + AC-9); (ii) strict tier with invalid welford → no emission (AC-7 + AC-8); (iii) non-strict tier → no emission (AC-3 + AC-4 + AC-5 + AC-6). Stale-spread enforcement bound at AC-10. Defensive-copy semantics bound at AC-11.

3. **Consistency** — Cross-section consistency pass executed (16 resolved-decision checks; all PASS). Helper name, signature, gate criterion, emission semantics are consistent across all spec sections (Mechanism, Component inventory, Integration points, Per-file pseudocode, Acceptance criteria, Anti-scope, Open questions). Component inventory AC-range arithmetic cross-check (R06 reinforcement): Delta 3 row says "binds AC-1 through AC-11 + AC-19"; per-file pseudocode docstring at q10 file head says "R10 AC-1 through AC-11"; § Coverage axis below says "AC-1 through AC-11 + AC-14 against test/q10 (11 in-file tests + 1 file-passes assertion)". All three sites agree (11 in-file ACs; AC-19 is a binding-command form, not an in-file test body).

4. **Clarity** — Architectural decisions made explicit in § Mechanism primitives 1-7 with documented why-picked rationale (full why-picked / why-rejected in audit sidecar § Decision rationale). Implementer notes 1-6 each carry a verification command or hand-trace. AC wording uses "Given X, when Y, then Z" form throughout; no banned words ("correctly", "appropriately", "as needed"). The `'pooled'` / `'aggregate'` testability rationale is explicit (Mechanism primitive 6 + Integration point 4-5).

5. **Coverage** — 19 ACs map to 3 component-inventory surfaces: AC-1 through AC-11 + AC-14 against `test/q10-per-shard-emission.test.ts` (11 in-file tests + 1 file-passes assertion); AC-12 (typecheck) + AC-15 (TDD) + AC-17 (runtime.ts grep) + AC-18 (welford+warm-start no-diff) against the GREEN commit at a whole-tree level; AC-13 (no regression of 10 pre-R10 test files) + AC-16 (betting smoke) against inherited test surface; AC-19 (config.ts JSDoc grep) against Delta 1.

6. **Constraints** — Inherited Ville-bound + Welford + observeSample contracts preserved (R10-SAS-2 + R10-SAS-3 + R10-SAS-14 enforce the inherited-code-untouched invariants; AC-13 verifies no R09 regression; AC-18 verifies welford+warm-start byte-unchanged at R10). PRD AC-P2's "strict-upgrade at 60 samples preserves inherited single-instance behavior" property: R05 landed the accumulator threading; R10 lands the projection from accumulator to the Family-C-shape (mean_vector + covariance) at the strict-tier boundary — completing the substrate evidence chain. R02 sparse-encoding convention enforced for the two strict-tier fields (mean_delta enforcement deferred to R11+).

7. **Concurrency** — Pure-function discipline preserved: `projectTierGatedOutputs` constructs a new object via destructure-spread; no in-place mutation of input. `updatePerShardResidual`'s composition signature is unchanged; the only change is the addition of a final pass-through call. Welford defensive-copy semantics (welfordMean + welfordCovariance both return defensive copies per q04 AC-5 + AC-7 + AC-9) preserved through the R10 composition (AC-11 binds).

8. **Corner cases** — Strict tier with valid welford (n>=2) → emit (AC-1 + AC-9). Strict tier with welford undefined → no emit (AC-7). Strict tier with welford.n=1 (welfordCovariance returns null) → no emit (AC-8). Non-strict tiers ('none' / 'warm_start' / 'pooled' / 'aggregate') with welford present → no emit (AC-3 through AC-6). Stale-spread input at warm_start with leftover mean_vector/covariance → output strips them (AC-10). Stale-spread mean_delta at warm_start → output preserves (AC-10 second assertion). Defensive-copy mutation by caller does not affect welford_state (AC-11).

9. **Cost** — Implementer Q-cycle estimate: ~1.5-2 hours total (smaller than R05 because the projection is a small extracted helper; no new external types; no schema changes). Per-tick CPU cost of `projectTierGatedOutputs`: O(d²) at strict tier (the `welfordCovariance` deep-copy is the dominant cost); O(1) at non-strict tiers (destructure-then-spread of a small object). At d=10 and N=1000 shards × K=168 cells, the per-tick fleet CPU cost of strict-tier projection is ~16.8M × O(100) doubles ≈ negligible vs. the 30 ms per-tick fleet budget (PRD NFR-Performance row). No new allocations at non-strict tiers beyond the destructure-spread output object.

10. **Coupling** — Two new function imports (`welfordMean`, `welfordCovariance` from `./welford`) added to runtime.ts — both on Tessera-original modules; zero new inherited-vendored couplings. No new module-level couplings; no new file additions. The PerShardResidual import (existing) is unchanged. The export surface from runtime.ts grows by exactly one symbol (`projectTierGatedOutputs`).

---

## Grilling output

(R01-derived discipline; pre-emit adversarial self-review on this spec before routing.)

1. **Every claim verifiable?** Audited.
   - File-existence claims (`engine/per-shard/runtime.ts`, `engine/per-shard/welford.ts`, `engine/per-shard/warm-start.ts`, `engine/types/config.ts` exist at HEAD `4869f65`; `test/q10-per-shard-emission.test.ts` does not): verified via `git ls-files` at spec-emit time.
   - Pre-R10 test count baseline (93 at HEAD `640c8e8`): EMPIRICALLY VERIFIED by Architect at spec-emit time via independent `node --test` run of all 10 pre-R10 test files. Per-file: q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, q03=13, q04=11, q05=13, q06=13, q07=23, smoke=5. Total: 93. Matches NEXT-ROLE.md "Pre-R10 baseline" block exactly. (R08 inherited-testimony-empirical-verification reinforcement applied — verified by Architect's own `node --test` run, not inherited from NEXT-ROLE.md text.)
   - Type declaration sites (`welfordMean` at welford.ts:93, `welfordCovariance` at welford.ts:100, `WelfordState` at welford.ts:32, `PerShardResidual` at config.ts:873, `observeSample` at warm-start.ts:69, `SampleObservation` at warm-start.ts:26): all line numbers verified via file reads during spec authoring (R02 reinforcement applied; 7th consecutive type-declaration-site discipline application).
   - Family-C shape inheritance (`FamilyCPerCell.mean_vector` + `.covariance` at families/c.ts:22-25): verified by reading the vendored file during spec authoring; R10's emitted shape (`number[]` + `number[][]`) matches the inherited contract.
   - Welford behavior claims (welfordMean returns defensive copy; welfordCovariance returns null at n<2; covariance = m2/(n-1)): verified by reading welford.ts source at spec-emit time, NOT inherited from R04 spec text (R08 reinforcement applied).

2. **Unstated assumptions?** Surfaced and resolved.
   - **`'pooled'` and `'aggregate'` test fixtures bypass observeSample**: explicit at Mechanism primitive 6 + AC-5/6 docstrings ("synthetic fixture; observeSample cannot output this tier"). The architectural rationale for the helper extraction (primitive 1) names this as a Pro.
   - **`mean_delta` at strict tier (which would also violate the sparse-encoding convention per R02 docstring): R10 does NOT strip it**: explicit at R10-SAS-5 + AC-10 second assertion (mean_delta passes through unchanged).
   - **Atomic gate at strict-but-undef-welford does NOT throw**: explicit at AC-7 docstring ("no exception thrown") and Mechanism primitive 2 ("conservative against malformed-fixture inputs").
   - **Test glob coverage of new file**: `tsconfig.test.json:13-15` includes `test/**/*.ts`; new file matches. Verified via tsconfig.test.json read at spec-emit time.
   - **OQ-2 architect-pre-prediction (READ-time) is superseded at R10 by WRITE-time pick**: explicit at OQ-R10-4 + audit sidecar § Brainstorm re-evaluation (R09-derived correction-propagation reinforcement applied).

3. **Scope added beyond request?** Audited.
   - The requested R10 work is "Phase 1 SLICE 2b4: warm-start emission at strict tier + sparse-encoding-convention enforcement" (NEXT-ROLE.md). The R10 scope explicitly enumerates: strict-tier emission of mean_vector/covariance from welford; sparse-encoding inverse-convention enforcement at all 4 non-strict tiers; new ACs covering both.
   - R10 ships exactly the three-surface inventory (config.ts JSDoc, runtime.ts emission helper + integration, q10 tests). No fourth surface added.
   - Helper extraction (Mechanism primitive 1) is internal architecture rather than additional scope — it serves the inverse-convention testability for 'pooled'/'aggregate' inputs which NEXT-ROLE.md explicitly required.
   - mean_delta enforcement is explicitly fenced (R10-SAS-4 + R10-SAS-5). No premature pull.
   - Compiled-artifact JSON loader (R10-SAS-6) and PR-F5 (R10-SAS-7) explicitly fenced.
   - Baseline-curation surfaces (R10-SAS-20) explicitly fenced.
   - R05 OBS-3 coincidental closure (q10 AC-1 cross-checks welfordCovariance read-back) is documented as such — not a bundled disposition, just a natural side-effect of the R10 AC design.

4. **Implementer can act without guessing?** Audited.
   - All 3 file paths and component states explicit in § Component inventory.
   - Delta 1, Delta 2 (three sub-deltas), Delta 3 each have concrete pseudocode with full function bodies, import statements, JSDoc text.
   - Helper naming (`projectTierGatedOutputs`), gate criterion (three-clause AND), inverse-convention enforcement (destructure-then-spread) all explicit.
   - TDD ordering specified at Implementer note 4 (two-commit RED → GREEN with explicit RED expected failure: TS2305 on the projectTierGatedOutputs import).
   - Verification commands embedded in Implementer notes 1, 2, 3 and ACs 12, 13, 14, 15, 16, 17, 18, 19.
   - Hand-trace verification of the strict-tier closed-form covariance at Implementer note 5; cold-start walk to strict at Implementer note 6.
   - Zero residual decisions left to Implementer's tactical judgment (no "either form works" clauses).

5. **Pre-emit grilling specific reinforcement checks** (CROSS-PROJECT-MEMORIAL + per-round reinforcements):
   - **Cross-section consistency pass** (R01-derived; 6th consecutive application): 16 row checks executed; all PASS. Helper name (`projectTierGatedOutputs`) used consistently across § Mechanism, § Component inventory, § Integration points, § Per-file pseudocode, § Acceptance criteria, § Anti-scope, § Open questions. Gate criterion expressed identically at Mechanism primitive 2, Per-file pseudocode Delta 2b, AC-1 + AC-7 + AC-8 docstrings.
   - **Type-declaration-site discipline** (R02 OBS-3 → 7th consecutive application): every external symbol opened at its declaration site — `welfordMean` at welford.ts:93; `welfordCovariance` at welford.ts:100; `PerShardResidual` at config.ts:873 (the R02 Delta 5 + R05 Delta 1 site); `FamilyCPerCell.mean_vector` + `.covariance` at families/c.ts:22-25 (inherited shape contract for emission alignment); `observeSample`'s tier-rule output range at warm-start.ts:91-94. All declaration sites verified by file reads during spec authoring.
   - **Re-export-chain-check discipline** (R03 MINOR-3 → 3rd application): no new cross-module re-export chains introduced at R10. `welfordMean` and `welfordCovariance` are imported directly from `./welford` (declaration site); no intermediate re-export chain to traverse. AC-12 (typecheck exit 0) is the load-bearing Reviewer verification.
   - **Inherited-testimony empirical verification** (R08 reinforcement; 2nd consecutive application): every factual claim about prior-round behavior verified by Architect's own `node --test` / `git ls-files` / file read at spec-emit time, NOT inherited from prior NEXT-ROLE.md text or REVIEWER-REPORT-R0N.md text. Specifically: pre-R10 baseline 93 verified by direct test run; q05 AC-9 + AC-11 + AC-2 + AC-7 + AC-11 reviewed by direct file read to confirm they do not assert mean_vector/covariance absence (which would have regressed under R10 emission).
   - **Correction-propagation pass** (R09 reinforcement; 2nd consecutive application): R10 supersedes R05 OQ-2 architect-pre-prediction (READ-time vs WRITE-time projection). Documented at OQ-R10-4 + audit sidecar § Brainstorm re-evaluation. R10 partially supersedes R02 OQ-2 architect-pre-prediction (discriminated-union vs runtime-invariant assertion) by picking a third option (destructure-spread); documented at OQ-R10-5. Both supersessions are explicitly framed as "approach selection within accepted-trade-off" rather than silent rejection.
   - **OBSERVED-binding scope** (R07 reinforcement): AC-9 binds the empirical OBSERVED output (mean_vector=[1,0], covariance=[[0,0],[0,0]]) for the cold-start-to-strict walk with zero-variance samples. The OBSERVED values are THEORY-DERIVED (mean of 60 copies of [1,0] is [1,0]; m2 of 60 copies of [1,0] is zero matrix). No PRNG involved. The "would a future implementation FIX matching the prediction FAIL this test?" check: NO — the prediction is the closed-form correct answer; any FIX that produces the correct answer matches it. AC-9 is well-formed under R07's OBSERVED-binding-scope reinforcement.
   - **Fixture-sizing exhaustive propagation** (R07 reinforcement): R10's ACs do not use statistical-detector e-process accumulation fixtures (no e-value, no log-wealth, no thresholds-vs-trial-count gating). The reinforcement applies to e-process ACs only; R10's ACs are all deterministic linear-algebra closed-form. No propagation pass needed.
   - **Component-inventory AC-range arithmetic cross-check** (R06 reinforcement; 2nd consecutive application): three sites for the in-file AC count — § Component inventory Delta 3 row ("binds AC-1 through AC-11 + AC-19"); § Per-file pseudocode q10 docstring head ("R10 AC-1 through AC-11"); § Coverage axis ("AC-1 through AC-11 + AC-14 against test/q10"). All three agree on 11 in-file ACs. AC-19 is a binding-command form (grep on config.ts), not an in-file test body — explicit at the AC-19 row docstring. Reviewed for R05 MINOR-1-class drift; no drift detected.
   - **Grep-pattern-soundness discipline** (R03 MINOR-2 → 3rd application): R10 has multiple grep-evidence ACs (AC-17 + AC-18 + AC-19) plus Implementer notes 1 + Delta 2c verification. Per the reinforcement, each grep is audited:
     - Implementer note 1 grep (`grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts` → 1): targets executable-code declaration; comment lines starting with `//` or `*` would not match because they don't start with `export function`. Sound.
     - Implementer note 1 grep (`grep -c "projectTierGatedOutputs" engine/per-shard/runtime.ts` → 2): targets the symbol broadly; intentionally matches both the declaration and the callsite. NOT used as evidence for executable-vs-comment distinction; only used as a sanity check. Sound for its stated purpose.
     - Delta 2c verification (`grep -c "welfordMean\|welfordCovariance" engine/per-shard/runtime.ts` → 4): targets import names + callsites. The destructured import names in the import block do appear bare; the callsite usages are `welfordMean(residual.welford_state)` and `welfordCovariance(residual.welford_state)`. Total 4 (2 import + 2 callsite). Sound, but could also match in JSDoc — let me audit: the Delta 2b JSDoc mentions "welfordMean(state)" and "welfordCovariance(state)" inside the helper's docstring, which WOULD increase the count beyond 4. **REVISED Implementer note Delta 2c grep**: `grep -nE "^\\s+welfordMean[ ,]" engine/per-shard/runtime.ts` for the import-line check (expects 1 match), and `grep -nE "welfordMean\\(" engine/per-shard/runtime.ts` for the callsite check (expects ≥1; the docstring will also match since it has `welfordMean(state)` with a paren — so this grep also has false positives from the docstring). To make this fully sound: SKIP the "≥4" grep and use AC-17 instead which targets a cleaner pattern (`export function projectTierGatedOutputs` is unambiguous; `welfordMean` import-line pattern is restricted to import-block syntax). **APPLIED below — Delta 2c verification now states the looser ≥-style without claiming exact counts that could be inflated by docstring matches.** Specifically: `grep -c "welfordMean" engine/per-shard/runtime.ts` returns at least 2 (import + at least one callsite); same for welfordCovariance. The exact count depends on whether the JSDoc text repeats these names. Sound under the relaxed-assertion form.
     - AC-17 (a) (`grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts` → 1): targets a multi-word literal that only appears at the function declaration line; comments would not have `export function` text. Sound.
     - AC-17 (b) + (c) (`welfordMean`, `welfordCovariance` ≥ 2): looser-assertion form per the audit above; counts at least 2 (import + callsite minimum) — JSDoc references would add to the count, which is OK because the assertion is "at least 2", not "exactly 2".
     - AC-18 (`git diff 640c8e8..HEAD -- engine/per-shard/welford.ts engine/per-shard/warm-start.ts` empty): targets git diff output, not a grep — sound by construction.
     - AC-19 (a, b, c): targets JSDoc literal content (the comment text IS the verification target — same intent-alignment clause as R05 AC-19). Sound by intent-alignment.
   - **Empirically-verified-test-count discipline** (R03 MINOR-4 → 3rd application): AC-13 baseline counts (93 total; per-file breakdown) cited from EMPIRICAL Architect-run `node --test` at spec-emit time (not inherited from NEXT-ROLE.md text). AC-14 (q10 = 11) is structurally pre-determined by the spec's 11 in-file ACs (R03 MINOR-4 reinforcement's exception clause applies: "structurally pre-determined" counts are exempt from the "OBSERVED only" rule). AC-13 directs Implementer to report OBSERVED output per file — same as R05 AC-16 pattern.
   - **Track-state verification for new file paths** (R02 OBS-2 reinforcement): `git ls-files test/q10*` empty at HEAD `4869f65` (verified at spec-emit time). RED commit creates `test/q10-per-shard-emission.test.ts` as a new file. No track-state ambiguity.

6. **Could the next role act on this artifact with zero clarifying questions?** Audited.
   - Yes. The 3 file surfaces are each accompanied by concrete pseudocode + verification commands + AC bindings. The one architectural decision (helper extraction) is picked with documented why-picked rationale and why-rejected analysis for alternatives.
   - Zero residual tactical decisions left to Implementer's judgment.
   - All HALT conditions are explicit (R10-SAS-1 through R10-SAS-23; each names a specific surface or apparent-need pattern and instructs HALT + DIAGNOSTIC).
   - The atomic gate's three-clause AND is specified verbatim in Delta 2 pseudocode; the destructure-spread form for inverse-convention enforcement is specified verbatim.

**Grilling verdict: PASS.** Spec is ready for IMPLEMENTER routing.

---

_For brainstorm full rationale (3 approaches considered, why-picked / why-rejected), R10-specific pre-route discipline application (skills 14 + 15 + memorial sweep + tier-rubric verdict), architect pre-predictions on outcomes, decision rationale per resolved decision, brainstorm re-evaluation for R05 OQ-2 supersession, and Q-R10 → Q-R11 sequencing context, see `Q-R10-SPEC-AUDIT.md`._
