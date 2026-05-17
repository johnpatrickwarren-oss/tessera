# Q-R14-SPEC — Tessera Phase 1 SLICE 2 carry-forwards bundle

_From: Implementer (R14 audit-tier; self-spec)._
_To: Reviewer._
_Date: 2026-05-17._
_HEAD at spec emit: `8b4f0bf` (R13 close + NEXT-ROLE prep)._

---

## Goal

R14 closes three SLICE 2 carry-forward deferrals in one audit-tier bundle:

1. **mean_delta computation** (R05 SAS-4 deferral; R10 SAS-4/5 carry-forward): compute `mean_delta = welfordMean(welford_state) − baselineCell.family_C.mean_vector` at warm_start tier; enforce sparse-encoding inverse-convention (mean_delta absent at all non-warm_start tiers). Closes the last open R02 MINOR-2 sub-item.

2. **PR-F5 empirical storage profile** (R05 SAS-10 deferral; SCOPING-MEMO v0.3 § 2.2 SLICE 2 commitment): measure compiled-config storage footprint at a synthetic N=1000 cluster; document ratio vs fleet-aggregate baseline; evaluate against architect's 1.2-1.5× pre-prediction.

3. **Compiled-artifact JSON loader** (R10 SAS-18 deferral): new `engine/loader.ts` exporting `loadCompiledConfig(json: string): CompiledConfig` with required-field validation and JSON round-trip fidelity.

---

## Brainstorm

### Item 1 — mean_delta injection point (≥3 approaches)

**Approach A**: Add optional `baselineCell?: BaselineCellEntry` parameter to both `projectTierGatedOutputs` and `updatePerShardResidual`. Backward-compatible (optional). Single emission boundary. `updatePerShardResidual` passes through to `projectTierGatedOutputs`.
- Strengths: single emission site; no caller breakage; clean passthrough.
- Weaknesses: two signatures change; callers that want mean_delta must pass baselineCell at two levels if composing with updatePerShardResidual.
- Risks: none material.
- **Selected.**

**Approach B**: New standalone `applyMeanDelta(residual, baselineCell): PerShardResidual` function; callers call `updatePerShardResidual` then `applyMeanDelta` separately.
- Strengths: no signature change to existing functions.
- Weaknesses: caller burden; inverse-convention stripping (non-warm_start) must happen separately; fragile if callers forget the second call.
- Rejected: two-step call requirement is anti-pattern for a single-update operation.

**Approach C**: Embed `baselineCell` in `ExtendedSampleObservation` (R05-shipped interface).
- Strengths: single parameter; baseline travels with the observation.
- Weaknesses: conflates observation metadata with baseline data; modifies a shipped interface (R14-SAS-5 fences this).
- Rejected: modifies R05-shipped interface — anti-scope.

**Selection rationale**: Approach A. Optional parameter preserves all existing callers; single emission boundary in `projectTierGatedOutputs` is the correct architectural locus (where mean_vector/covariance already emit); consistent with R10's "emission helper" design.

### Item 2 — PR-F5 measurement substrate (≥3 approaches)

**Approach A**: In-test programmatic fixture construction — build N=1000 PerShardCell arrays in memory, measure JSON.stringify sizes.
- Strengths: self-contained; no new infrastructure; TDD-compatible.
- Weaknesses: doesn't exercise full compilation pipeline.
- **Selected.**

**Approach B**: Shell script `tools/measure-storage.sh` running node fixture builder.
- Strengths: operator-runnable standalone.
- Weaknesses: outside TDD framework; manual execution; not wired into `npm test`.
- Rejected: measurement should be reproducible via the standard test suite.

**Approach C**: Full synthetic compilation pipeline (tools/gen-synthetic-baseline.ts → calibrate → emit).
- Strengths: exercises real compilation path.
- Weaknesses: calibrate.ts is OQ-1 gate item (unresolved); would expand scope materially.
- Rejected: expands scope beyond audit-tier; calibrate.ts OQ-1 is an operator gate item.

**Selection rationale**: Approach A. In-test measurement is the simplest substrate that satisfies the PR-F5 commitment. The comparison is fleet-aggregate JSON size vs per-shard JSON size; both are constructible programmatically.

### Item 3 — Compiled-artifact JSON loader (≥3 approaches)

**Approach A**: `loadCompiledConfig(json: string): CompiledConfig` — accepts JSON string, handles parse + validate.
- Strengths: pure function; no Node.js fs dependency; easily testable.
- Weaknesses: caller handles file reading (one extra step for file-based use).
- **Selected.**

**Approach B**: `loadCompiledConfigFile(path: string): CompiledConfig` — accepts file path.
- Strengths: ergonomic for runtime file-load use case.
- Weaknesses: Node.js `fs` dependency; harder to unit-test without real files; harder to use in non-Node contexts.
- Rejected: unnecessary coupling to file system in a pure-function codebase.

**Approach C**: `parseCompiledConfig(raw: unknown): CompiledConfig` — accepts pre-parsed object.
- Strengths: most flexible; decouples JSON parsing from validation.
- Weaknesses: slightly less ergonomic for the common JSON-from-file use case; CompiledConfig consumers typically start from a string.
- Rejected: marginally less ergonomic for no material benefit at this scope.

**Selection rationale**: Approach A. String-in, typed-object-out matches the canonical "load JSON config" use case; pure function; straightforward to test.

---

## Design

### Component boundaries

| Surface | State | Description |
|---|---|---|
| `engine/per-shard/runtime.ts` | CHANGED | (a) Add `BaselineCellEntry` import; (b) add optional `baselineCell?: BaselineCellEntry` to `projectTierGatedOutputs` + `updatePerShardResidual`; (c) extend destructure to strip `mean_delta`; (d) compute mean_delta at warm_start when baselineCell provides family_C.mean_vector. |
| `engine/loader.ts` | CREATED | New module: `loadCompiledConfig(json: string): CompiledConfig`. Validates required fields. |
| `test/q14-mean-delta.test.ts` | CREATED | AC-1 through AC-7 — mean_delta computation + inverse-convention. |
| `test/q14-pr-f5-storage.test.ts` | CREATED | AC-8 through AC-10 — storage profile measurement. |
| `test/q14-compiled-config-loader.test.ts` | CREATED | AC-11 through AC-16 — loader round-trip + validation. |
| `test/q10-per-shard-emission.test.ts` | CHANGED | AC-10 assertion updated: R14 removes mean_delta passthrough at warm_start (was R10 "carry through unchanged" temporary behavior; now mean_delta is absent when no baselineCell provided). |

### Integration points

1. `engine/per-shard/runtime.ts` ↔ `engine/types/config.ts` — NEW import: `BaselineCellEntry`. Declaration at config.ts:424. No re-export chain.
2. `engine/loader.ts` ↔ `engine/types/config.ts` — imports `CompiledConfig`. Validates required top-level fields.
3. `test/q14-mean-delta.test.ts` ↔ `engine/per-shard/runtime.ts` — imports `updatePerShardResidual`, `projectTierGatedOutputs`, `ExtendedSampleObservation`.
4. `test/q14-mean-delta.test.ts` ↔ `engine/per-shard/warm-start.ts` — imports `initialPerShardResidual`.
5. `test/q14-mean-delta.test.ts` ↔ `test/_substrate/factories.ts` — imports `makePerShardResidual`, `makeBaselineCellEntry`.
6. `test/q14-pr-f5-storage.test.ts` ↔ `test/_substrate/factories.ts` — imports `makePerShardResidual`, `makePerShardCell`.
7. `test/q14-compiled-config-loader.test.ts` ↔ `engine/loader.ts` — imports `loadCompiledConfig`.

### Failure modes at integration points

- **BaselineCellEntry.family_C absent**: mean_delta computation silently skips → mean_delta absent. Correct per sparse-encoding convention.
- **Length mismatch (welfordMean.length ≠ baselineMean.length)**: skip mean_delta → absent. Defensive; shouldn't occur under correct orchestration.
- **loadCompiledConfig with invalid JSON**: JSON.parse throws SyntaxError — propagated to caller.
- **loadCompiledConfig with missing required field**: throws Error with field name in message.

---

## Mechanism

### Item 1 — mean_delta + inverse-convention enforcement

Extend `projectTierGatedOutputs(residual, baselineCell?)`:

1. Destructure `mean_vector`, `covariance`, AND `mean_delta` OUT at the top (extending R10's two-field destructure to three).
2. At `confidence === 'strict'` with valid welford: emit `mean_vector` + `covariance` as before (unchanged R10 behavior). No `mean_delta` at strict tier.
3. At `confidence === 'warm_start'` with valid `welford_state` AND `baselineCell?.family_C?.mean_vector` defined AND matching length: compute `mean_delta = welfordMean(welford_state).map((v, i) => v - baselineMean[i])`. Emit `mean_delta` on output.
4. All other cases (non-warm_start, or warm_start without usable baselineCell): output has `mean_delta` absent (destructured out at step 1, not re-added).

Extend `updatePerShardResidual(current, obs, baselineCell?)`: thread `baselineCell` through to `projectTierGatedOutputs` call.

**R10 AC-10 test update**: The existing test asserts `projected.mean_delta === [0.5, 0.6]` (the warm_start carry-through behavior explicitly marked "R11+ scope"). After R14 that behavior is replaced: at warm_start without baselineCell, mean_delta is absent. Update AC-10 assertion to `assert.strictEqual(projected.mean_delta, undefined)` and `assert.strictEqual('mean_delta' in projected, false)`. Update comment to remove "R10 carries this through untouched (R11+ scope)".

### Item 2 — PR-F5 storage measurement

Build synthetic fleet at N=1000 shards × K=168 cells × d=10 signal dimensions:
- Fleet aggregate baseline: 168 `BaselineCellEntry` objects each with `family_C.mean_vector` (d=10) + `family_C.covariance` (d×d).
- Per-shard cells: 1000 shards × 168 cells with `PerShardResidual` at warm_start tier (n_samples=25, welford_state.n=25, mean+m2 populated).

Measure `JSON.stringify(fleetBaseline).length` and `JSON.stringify(perShardCells).length`. Compute:
- `ratio = perShardCells_bytes / fleetBaseline_bytes`
- Note: architect's pre-prediction "1.2-1.5× single-instance footprint" was parameterized for N=10000 with sparse encoding. At N=1000 with warm_start (fully-populated welford_state), ratio will be higher. The test documents actual bytes; the Reviewer verifies the measurement ran.

AC bounds: ratio ≤ 200 (conservative upper bound for N=1000 warm_start; anything higher indicates a structural problem); OR deviation documented if exceeded.

### Item 3 — Compiled-artifact JSON loader

`engine/loader.ts`:
```ts
import type { CompiledConfig } from './types/config';

const REQUIRED_FIELDS: ReadonlyArray<keyof CompiledConfig> = [
  'version', 'compiler_version', 'compiled_at', 'baseline_ref', 'alpha_budget',
];

export function loadCompiledConfig(json: string): CompiledConfig {
  const raw: unknown = JSON.parse(json);  // throws SyntaxError on malformed JSON
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('CompiledConfig must be a JSON object');
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw)) {
      throw new Error(`CompiledConfig missing required field: ${field}`);
    }
  }
  const config = raw as Record<string, unknown>;
  if (typeof config['version'] !== 'string' || config['version'].length === 0) {
    throw new Error('CompiledConfig.version must be a non-empty string');
  }
  const ab = config['alpha_budget'];
  if (typeof ab !== 'object' || ab === null || typeof (ab as Record<string, unknown>)['total'] !== 'number') {
    throw new Error('CompiledConfig.alpha_budget.total must be a number');
  }
  return raw as CompiledConfig;
}
```

No schema-version range check yet (no canonical version table established); the non-empty string check provides minimal future-proofing.

### Cross-section consistency pass

| # | Decision | Canonical form | Alternate absent from spec |
|---|---|---|---|
| 1 | Injection = optional param on projectTierGatedOutputs + updatePerShardResidual | § Mechanism Item 1; ACs 1-7 | ExtendedSampleObservation extension |
| 2 | mean_delta absent at warm_start when no baselineCell | § Mechanism Item 1 (case 4); AC-2 | carry-through passthrough |
| 3 | mean_delta stripped at ALL non-warm_start tiers | § Mechanism Item 1 (destructure at step 1); AC-3, AC-4 | partial stripping |
| 4 | Loader in `engine/loader.ts` | § Component inventory; ACs 11-16 | engine/per-shard/loader.ts; tools/ |
| 5 | R10 AC-10 updated | § Mechanism Item 1 update; test q10 | left stale |
| 6 | PR-F5 in-test measurement | § Mechanism Item 2; ACs 8-10 | standalone script |

---

## Acceptance criteria

### Item 1 — mean_delta computation

**AC-1** — _Given_ a `PerShardResidual` with `confidence='warm_start'`, `welford_state={n:3, mean:[2,4], m2:...}`, and `baselineCell={key:..., n_samples:50, confidence:'strict', family_C:{mean_vector:[1,3], covariance:...}}`, _when_ `projectTierGatedOutputs(residual, baselineCell)` is called, _then_ the result has `mean_delta` deep-equal to `[1, 1]` (welfordMean([2,4]) − [1,3] = [1,1]). Evidence: `test/q14-mean-delta.test.ts` "R14 AC-1 …" passes.

**AC-2** — _Given_ a warm_start residual with valid `welford_state` and NO `baselineCell` argument, _when_ `projectTierGatedOutputs(residual)` is called, _then_ `mean_delta === undefined` AND `'mean_delta' in result === false`. Evidence: `test/q14-mean-delta.test.ts` "R14 AC-2 …" passes.

**AC-3** — _Given_ a warm_start residual and a `baselineCell` whose `family_C` is absent (`baselineCell.family_C === undefined`), _when_ `projectTierGatedOutputs(residual, baselineCell)` is called, _then_ `mean_delta === undefined` AND `'mean_delta' in result === false`. Evidence: `test/q14-mean-delta.test.ts` "R14 AC-3 …" passes.

**AC-4** — _Given_ a `PerShardResidual` with `confidence='none'` that carries a stale `mean_delta` field in the fixture, _when_ `projectTierGatedOutputs(residual)` is called, _then_ `mean_delta === undefined` AND `'mean_delta' in result === false` (inverse-convention enforcement at none tier). Evidence: `test/q14-mean-delta.test.ts` "R14 AC-4 …" passes.

**AC-5** — _Given_ a `PerShardResidual` with `confidence='strict'` that carries a stale `mean_delta` field in the fixture, _when_ `projectTierGatedOutputs(residual)` is called, _then_ `mean_delta === undefined` AND `'mean_delta' in result === false` (inverse-convention enforcement at strict tier). Evidence: `test/q14-mean-delta.test.ts` "R14 AC-5 …" passes.

**AC-6** — _Given_ `updatePerShardResidual` called with a baselineCell that has `family_C.mean_vector=[1,3]`, _when_ `updatePerShardResidual` advances a residual from n=19 to n=20 (crossing warm_start threshold) with sampleVector=[3,7], _then_ the returned residual has `confidence='warm_start'` AND `mean_delta` equals `welfordMean(result.welford_state) − [1,3]` element-wise. Evidence: `test/q14-mean-delta.test.ts` "R14 AC-6 …" passes.

**AC-7** — _Given_ `updatePerShardResidual` called WITHOUT a baselineCell, when the residual is at warm_start tier, _then_ the returned residual has `mean_delta === undefined` AND `'mean_delta' in result === false`. Evidence: `test/q14-mean-delta.test.ts` "R14 AC-7 …" passes.

### Item 2 — PR-F5 storage profile

**AC-8** — _Given_ a synthetic fleet with N=1000 shards × K=168 cells × d=10, all residuals at warm_start tier (n_samples=25, welford_state populated), _when_ `JSON.stringify(perShardCells).length` is measured, _then_ the measurement completes and the byte count is > 0 AND the per-shard/fleet-aggregate ratio is computed and logged. Evidence: `test/q14-pr-f5-storage.test.ts` "R14 AC-8 …" passes; Reviewer reads logged ratio.

**AC-9** — _Given_ the same synthetic fleet with all residuals at 'none' tier (n_samples=0, no welford_state), _when_ the sparse ratio is computed, _then_ the sparse encoding reduces the per-shard bytes by at least 50% vs warm_start tier (demonstrates the sparse-encoding benefit). Evidence: `test/q14-pr-f5-storage.test.ts` "R14 AC-9 …" passes.

**AC-10** — _Given_ the warm_start measurement from AC-8, _when_ the ratio `perShard_bytes / singleShard_bytes` is compared to N=1000, _then_ the ratio equals N within ±10% (linear scaling expected since cells are independent). Evidence: `test/q14-pr-f5-storage.test.ts` "R14 AC-10 …" passes.

### Item 3 — Compiled-artifact JSON loader

**AC-11** — _Given_ a valid `CompiledConfig` object with required fields + `per_shard_cells` containing a strict-tier residual with `mean_vector` + `covariance`, _when_ `JSON.stringify(config)` is passed to `loadCompiledConfig`, _then_ the result deep-equals the original config. Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-11 …" passes.

**AC-12** — _Given_ a JSON string missing the `version` field, _when_ `loadCompiledConfig(json)` is called, _then_ it throws an Error whose message includes the string `"version"`. Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-12 …" passes (uses `assert.throws`).

**AC-13** — _Given_ a JSON string missing the `alpha_budget` field, _when_ `loadCompiledConfig(json)` is called, _then_ it throws an Error whose message includes the string `"alpha_budget"`. Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-13 …" passes.

**AC-14** — _Given_ a malformed JSON string (e.g., `"{invalid json}"`), _when_ `loadCompiledConfig(json)` is called, _then_ it throws (SyntaxError or similar). Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-14 …" passes.

**AC-15** — _Given_ a JSON string with `version` equal to an empty string `""`, _when_ `loadCompiledConfig(json)` is called (all other required fields present), _then_ it throws an Error whose message includes `"version"` (empty-version guard). Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-15 …" passes.

**AC-16** — _Given_ a valid CompiledConfig JSON with `per_shard_cells` containing both a warm_start residual (with `mean_delta`) and a strict residual (with `mean_vector` + `covariance`), _when_ `loadCompiledConfig(json)` is called, _then_ the per_shard_cells array is accessible on the returned object with the correct structure. Evidence: `test/q14-compiled-config-loader.test.ts` "R14 AC-16 …" passes.

### Binding commands

**AC-17** — _Given_ the GREEN commit, _when_ all prior test files run, _then_ each produces the OBSERVED pass count from the pre-R14 baseline (152/0 total across 14 files). Implementer reports OBSERVED per-file counts. Evidence: Reviewer-run `node --test` per file.

**AC-18** — _Given_ the GREEN commit, _when_ `npm run typecheck` is run, _then_ exit code is 0. Evidence: Reviewer-run command.

---

## Anti-scope

- **R14-SAS-1**: NO modification to `engine/per-shard/welford.ts` — welfordMean/welfordCovariance consumed unchanged.
- **R14-SAS-2**: NO modification to `engine/per-shard/warm-start.ts` — observeSample unchanged.
- **R14-SAS-3**: NO modification to `engine/types/config.ts` — no new fields; BaselineCellEntry consumed as-is.
- **R14-SAS-4**: NO modification to `engine/fleet/` (R12/R13 surfaces) — fleet-level code unchanged.
- **R14-SAS-5**: NO modification to `ExtendedSampleObservation` interface — observation shape unchanged.
- **R14-SAS-6**: NO full compilation pipeline — no tools/calibrate.ts (OQ-1 gate item).
- **R14-SAS-7**: NO `mergeWelfordStates` / fleet-pooling — SLICE 3 scope.
- **R14-SAS-8**: NO modification to `test/q05-*.test.ts`, `test/q11-*.test.ts`, `test/q12-*.test.ts`, `test/q13-*.test.ts`.
- **R14-SAS-9**: Only `test/q10-per-shard-emission.test.ts` AC-10 assertion updated (minimal: change mean_delta assertion from `[0.5, 0.6]` to undefined + key-absent check; update comment removing "R11+ scope").

---

## Open questions

None — all resolved. The injection-point choice (Approach A: optional param on projectTierGatedOutputs) is made inline; no architectural ambiguity requires escalation.

---

## Pre-emit grilling

1. **Every claim verifiable?** BaselineCellEntry at config.ts:424 verified via grep. welfordMean at welford.ts:93 verified. FamilyCPerCell.mean_vector at families/c.ts:21 verified. Runtime.ts current signatures verified via read.

2. **Unstated assumptions?**
   - R10 AC-10 test update: the R10 test comment said "R11+ scope" — updating it is the consequence of R14 landing the scope. This is a tactical implementation detail (updating a test that was explicitly designed to change), not an architectural decision.
   - PR-F5 ratio definition: "per-shard bytes / fleet-aggregate bytes" — defined clearly in § Mechanism. The architect's "1.2-1.5×" prediction may have assumed different d or N; the test documents the actual measurement with context.
   - loadCompiledConfig casts `raw as CompiledConfig` without deep-validating every nested field. This is acceptable for a SLICE 2 loader — R14's scope is required-field presence check. Deep structural validation is anti-scope.

3. **Scope beyond request?** No. Items 1, 2, 3 match NEXT-ROLE.md exactly. The R10 AC-10 update is a mechanical consequence of Item 1 (the carry-through behavior being replaced), not additional scope.

4. **Next role (Reviewer) actionable without clarifying questions?** Yes. ACs are Given/When/Then with file:line references. Anti-scope is explicit. R10 AC-10 change is documented as a named single-assertion update.

**Grilling verdict: PASS.**
