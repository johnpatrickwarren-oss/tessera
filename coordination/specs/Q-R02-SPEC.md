# Q-R02-SPEC — Phase 1 SLICE 2a: per-shard residual schema extension + R01 carry-forward dispositions (v0.1)

_From: Architect (R02 pipeline run; per-role CLAUDE.md split active per `c8f8ba7`)._
_To: Implementer._
_Date: 2026-05-16._
_Foundation: PRD.md → SCOPING-MEMO-v0.3.md § 3 Phase 1 SLICE 2 row + § 2.2 Extension 2; R01 spec `coordination/specs/Q-R01-SPEC.md` v0.2; R01 Reviewer report `coordination/reviews/REVIEWER-REPORT-R01.md` (5 MAJOR + 9 MINOR + 4 OBS); R01 Memorial accretion `coordination/MEMORIAL.md:115-141`; current code state at HEAD `88fcd9c`._
_Audit sidecar: `coordination/specs/Q-R02-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions)._
_Tier: full (A2 + A4 + A7 fire — see audit sidecar; rubric verdict recorded)._

---

## Spec

R02 narrows SCOPING-MEMO § 3's "Phase 1 SLICE 2" to **SLICE 2a — compile-time schema extension only**. R02 ships the per-shard residual schema fields needed for SLICE 2b runtime population, restructures `PerShardCell` to mirror inherited `BaselineCellEntry` shape (so per-(shard_id, cell_key) lookup is expressible), extracts the `CellDimension` and `CellConfidence` typedefs canonically (closes R01 MINOR-1), and bundles architecturally-load-bearing dispositions for the R01 carry-forward MAJORs (anti-scope vendoring acceptance, manifest gap, module-model decision, dead-test removal). SLICE 2b — warm-start runtime, compiled-artifact verification, PR-F5 empirical storage profile — is explicit anti-scope this round.

R02 slice-narrowing rationale: R01 IMPLEMENTER session crashed at the coordination step under 4-deliverable context load; the per-role CLAUDE.md split (commit `c8f8ba7`) addresses one root cause (per-session prompt weight) but the defense-in-depth response is also to right-size scope. Schema-only + R01 dispositions is a tight, type-checkable, TDD-verifiable round that mirrors the R01-successful pattern (mechanical schema + targeted tests).

The slice closes when (per acceptance criteria § AC): (a) `PerShardResidual` extended with the four runtime-required fields (`n_samples`, `mean_delta?`, `residual_seed_hash?`, `last_observed_at?`) per § Mechanism Delta 5; (b) `PerShardCell` restructured to `{ shard_id, key: CellKey, residual: PerShardResidual }` per Delta 6; (c) `CellDimension` + `CellConfidence` extracted as canonical typedefs and the inline unions replaced with typedef references per Delta 7; (d) the duplicate alias declarations at `engine/types/config.ts:856-867` removed (now canonical via extraction); (e) `VENDORING-MANIFEST.md` extended with the missing smoke-test row per R01 MAJOR-4 disposition; (f) the dead `test/ville-preservation-per-profile.test.{ts,js}` removed per R01 MINOR-7 disposition; (g) `test/q01-schema-additions.test.ts` updated to match the restructured `PerShardCell` shape; (h) `test/q02-schema-extension.test.ts` ships with five test cases binding the five Delta-5/6/7 schema changes; (i) Tessera-side `tsc` clean compile via `tsconfig.test.json`; (j) all five binding commands pass (typecheck, the four pre-existing q01 + q02 test files, and the betting-e-process-class-dispatch smoke test).

Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row (narrowed to 2a), § 2.2 Extension 2 (recommended-approach b: hierarchical baseline with sparse per-shard residual), R01 spec § Mechanism Delta 3 commitment ("SLICE 2 will add: residual_seed_hash, per_shard_n_samples, etc."), and R01 Reviewer-report MAJORs 3/4/5 + MINORs 1/2/7.

---

## Architectural mechanism

### Three architectural primitives at play

1. **Inherited `BaselineCellEntry` shape as mirror target.** Inherited DeploySignal `engine/types/config.ts:418-435` defines `BaselineCellEntry { key: CellKey; n_samples: number; confidence: 'strict'|'pooled'|'aggregate'|'none'; pooled_from?; variance_inflated?; family_A?; family_C?; family_E?; family_D?; }`. The fleet-aggregate cell is keyed by `CellKey` (one entry per cell). Per-shard residuals are the analogous structure layered underneath: one entry per `(shard_id, cell_key)` pair. R01's `PerShardCell { shard_id, residual }` was too coarse — it did not encode `cell_key`, making `(shard_id, cell_key)` lookup unexpressible. R02 restructures to mirror `BaselineCellEntry`: one `PerShardCell` entry per `(shard_id, cell_key)` pair with `key: CellKey` field.

2. **Sparse encoding semantics consolidated in `PerShardResidual`.** Per SCOPING-MEMO § 2.2 storage-footprint clause (~1.2-1.5× single-instance footprint architect-pre-prediction): strict-upgraded cells carry full `mean_vector` + `covariance`; warm-start cells carry only `mean_delta` (delta from fleet-aggregate mean); lower-confidence cells carry only `n_samples`. `confidence` discriminates which fields are populated. R01 shipped a partial form of this (`mean_vector?` + `covariance?` + `confidence`); R02 completes the surface by adding the four runtime-required fields. All optionality semantics are encoded by the optional `?` marker; `n_samples` and `confidence` are mandatory at every entry.

3. **`CellDimension` + `CellConfidence` extracted as canonical typedefs.** R01 chose "extend inline unions in-place; defer typedef extraction" (architect-pick α at Q1 v0.2). R01 IMPLEMENTER then added convenience aliases at `engine/types/config.ts:856-867` for test ergonomics (R01 MINOR-1), creating two sources of truth. R02 closes the drift by extracting the typedefs canonically (single source of truth) and using the typedef references inside the interface declarations.

### Schema deltas (operate on `engine/types/config.ts` only)

- **Delta 5 — `PerShardResidual` field extension.** Add four fields to the interface declared at `engine/types/config.ts:844-848`:
  - `n_samples: number` (mandatory) — sample count for this (shard, cell); load-bearing for SLICE 2b warm-start (n ≥ 20) and strict-upgrade (n ≥ 60) transitions.
  - `mean_delta?: number[]` (optional) — present only at `confidence === 'warm_start'`; delta from fleet-aggregate mean. Length matches `mean_vector` length when both are present (semantic, not type-enforced).
  - `residual_seed_hash?: string` (optional) — opaque identifier for the fleet-aggregate baseline against which the residual was computed. Enables runtime to detect when a fleet-aggregate refresh invalidates a cached residual. Hash function choice is SLICE 2b runtime scope; SLICE 2a ships the field as opaque string.
  - `last_observed_at?: number` (optional) — Unix epoch milliseconds of the most recent sample observed at this `(shard, cell)`. Enables SLICE 2b's warm-start eligibility window logic.

- **Delta 6 — `PerShardCell` restructure.** Replace the existing interface declaration at `engine/types/config.ts:850-854` with `{ shard_id: string; key: CellKey; residual: PerShardResidual; }`. The `key: CellKey` addition makes `(shard_id, key)` the natural primary key of the `per_shard_cells: PerShardCell[]` array, mirroring `BaselineCellEntry { key: CellKey; ... }`. This is a non-additive breaking change to R01's shipped schema; R01 explicitly committed to provisional schema in its Delta 3 ("Full PerShardResidual runtime semantics are SLICE 2 scope"), so the break is in-bounds.

- **Delta 7 — `CellDimension` + `CellConfidence` typedef extraction.** Replace the inline union at `engine/types/config.ts:438` (`dimensions: Array<'hour_of_day' | ... | 'shard_id'>`) with `dimensions: CellDimension[]`. Replace the inline union at `engine/types/config.ts:421` (`confidence: 'strict' | ... | 'warm_start'`) with `confidence: CellConfidence`. Promote the typedef declarations currently at lines 860-867 to canonical position (i.e., remove the "Convenience type aliases for test/consumer imports" comment that frames them as duplicates; they are now the source of truth). `PerShardResidual.confidence` (at the line that was 847) similarly uses `CellConfidence`.

### Carry-forward dispositions from R01 (architectural-level only; the spec text itself stands as the disposition record)

- **R01 MAJOR-3 disposition — anti-scope vendoring acceptance.** The six files vendored outside R01 spec's § Anti-scope (`engine/detectors/_q72-trace.ts`, `engine/types/agent.ts`, `engine/l0/schema-continuity.ts`, `engine/o0/lifecycle-events.ts`, `engine/o0/reversibility-source.ts`, `engine/o0/reversibility-translator.ts`) are **accepted into Phase 1 architecture as compilation dependencies**. R01 IMPLEMENTER and R01 REVIEWER both verified they are genuine compile-time imports of the SAS-listed vendored files. The disposition is recorded here (not by editing R01 spec retroactively): SAS-7 and SAS-8 are **superseded by R02 § Mechanism** for the affected files; the manifest already enumerates them with explanatory notes. The architectural lesson — Architect must enumerate compilation dependencies before declaring anti-scope on a target file — is now memorialized; see § Open questions OQ-3 for the future-rounds policy proposal.

- **R01 MAJOR-4 disposition — manifest gap closure.** Add a `VENDORING-MANIFEST.md` row for `test/betting-e-process-class-dispatch.test.ts` (vendored at SHA `5a72371`, sync policy `vendored-at-pin`; provenance header already present in the file). Do not add a row for `test/ville-preservation-per-profile.test.{ts,js}` because those files are removed in this round (Delta 9). The vendoring-coverage test (`test/q01-vendoring-coverage.test.ts:73-92`) is iteration-list-filtered to `engine/*`; R02 adds the smoke-test row to the manifest but does not extend the test iteration to `test/*` (kept narrowly scoped because at SLICE 2a there is only one vendored test file; broaden in SLICE 2b when more vendored tests land).

- **R01 MAJOR-5 disposition — module model canonicalization.** Phase 1 + Phase 2 module model is CommonJS via tsc-emit (`tsconfig.json` `"module": "CommonJS"`, `"moduleResolution": "node"`, `"target": "ES2020"`; `package.json` omits `"type": "module"`). This matches inherited DeploySignal at SHA `5a72371`. The R01 § Implementation surface pseudocode (which prescribed ESM) is **superseded by R01 Q1.1 disposition** ("vendor DeploySignal tsconfig structure at-pin") — the IMPLEMENTER correctly chose Q1.1; the spec pseudocode was internally inconsistent with Q1.1. ESM migration is deferred to the extract-to-npm-package commitment at Phase 2 close (per PRD non-functional requirements compatibility row). R02 does not modify `tsconfig.json` or `package.json`; this disposition stands as documentation only.

- **R01 MINOR-1 disposition — typedef alias drift closure.** Handled by Delta 7 above (typedef extraction makes the aliases canonical, no longer duplicates).

- **R01 MINOR-2 disposition — `PerShardResidual.confidence` field name.** Inherited `BaselineCellEntry` uses `confidence` (not `cell_confidence`); R01 IMPLEMENTER converged on `confidence` correctly. R02 preserves `confidence` and updates `test/q01-schema-additions.test.ts` to use `confidence` consistently (the test currently uses `cell_confidence` in three places per the `.js` compiled artifact reviewed, which compiles only because of the now-removed alias-via-different-name; actually compiling the `.ts` source uses `confidence` per the actual production interface — see Implementer note in Delta 8 below).

- **R01 MINOR-7 disposition — dead test removal.** `test/ville-preservation-per-profile.test.ts` shells out via `execSync` to `tools/calibrate.js` which Tessera does not (and per SAS-6 should not) carry at SLICE 1 or 2a. The test is permanently broken at Tessera until SLICE 2b decides whether to vendor a compiler-substrate or write a Tessera-specific equivalent. Disposition: **delete from `test/` tree at R02**. Document the deletion in `VENDORING-MANIFEST.md` as a removed-row note. Re-vendor decision deferred to SLICE 2b. The no-skip-policy memorial (statistical-invariant tests must assert or feature doesn't ship) is preserved: the test is not being silently skipped, it is being **explicitly removed pending substrate availability**, with the substrate-availability decision tagged in the manifest. Deletion includes both `.ts` source and `.js` compiled artifact.

### Integration points

- **`engine/types/config.ts` ↔ inherited engine code.** Inherited engine code does not import `PerShardCell` or `PerShardResidual` (R01-added; greppable to confirm `0` matches in `engine/**/*.ts` outside `config.ts`). Inherited engine code does import `BaselineCellEntry.confidence` and `BaselineCellsConfig.dimensions`; Delta 7 changes these from inline-union literals to extracted-typedef references, which is structurally transparent to inherited code (`'strict'` as a string literal still satisfies `CellConfidence` because `CellConfidence` is exactly that union). No behavioral change. Verified by `tsc` clean compile.

- **`engine/types/config.ts` ↔ R01 `test/q01-schema-additions.test.ts`.** R01 test currently uses `cell_confidence` field name (per the `.js` compiled artifact; the `.ts` source needs verification) — this works in the existing tree because of the convenience-alias duplication. After Delta 7 removes the duplicate aliases, the R01 test must use `confidence` consistently. Delta 8 updates the R01 test (one-file mechanical rename + one-file restructure for the new `PerShardCell` shape).

- **`engine/types/config.ts` ↔ R02 `test/q02-schema-extension.test.ts`.** New test file binds Delta 5/6/7 changes (one test per delta sub-clause).

### Failure modes (each handled by an AC or anti-scope clause)

- **F-1: Delta 7 extraction breaks inherited engine compile** if the extracted typedef does not exactly mirror the inline-union members. Handled by AC-3 (`tsc` clean compile against the full vendored tree).
- **F-2: Delta 6 restructure (`{shard_id, residual}` → `{shard_id, key, residual}`) breaks R01 q01-schema-additions test** (the test instantiates the SLICE 1 `PerShardCell` shape). Handled by Delta 8 (test update) + AC-2 (q01-schema-additions still passes).
- **F-3: Delta 5 adds mandatory `n_samples: number` to `PerShardResidual`** — any existing instantiation in tests is broken until updated. Handled by Delta 8 (test update) + AC-2.
- **F-4: Manifest row for deleted `ville-preservation` test could leave a stale entry** — handled by Delta 10 wording (note in manifest documents the removal explicitly).
- **F-5: Test iteration in `q01-vendoring-coverage` does not include `test/betting-e-process-class-dispatch.test.ts`** — by design at SLICE 2a; OQ-2 documents broaden-at-SLICE-2b proposal.

### Anti-scope (this round; full enumeration in § Anti-scope below)

R02 does **NOT** ship: warm-start runtime mechanism; compiled-artifact loading or verification at any shard count; PR-F5 empirical storage profile; any new detector vendoring; any orchestrator vendoring; any modification to `tsconfig.json`, `tsconfig.test.json`, or `package.json` (R01 dispositions stand); any modification to `tools/vendor-from-deploysignal.sh` (MINOR-4/5/6 dispositions deferred; see § Open questions OQ-1); any modification to inherited vendored engine internals (A12 inherited); any new R01 fix beyond the four bundled dispositions above (MINOR-3/4/5/6/8/9 dispositions are tracked in MEMORIAL.md, not bundled into R02 spec; they are addressed when their parent surface is next touched).

---

## Component inventory

| State | Path | Note |
|---|---|---|
| Exists (unchanged) | `engine/detectors/**/*.ts` (12 files) | Vendored at-pin; A12 preserved |
| Exists (unchanged) | `engine/types/families/**/*.ts` (5 files) | Vendored at-pin |
| Exists (unchanged) | `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/verdict-groups.ts` | Vendored at-pin |
| Exists (unchanged) | `engine/types/{verdict,primitives,metrics,orchestration,policy,audit,self-normalized-fallback,index,agent}.ts` (9 files) | Vendored at-pin; `agent.ts` accepted-into-scope per MAJOR-3 disposition |
| Exists (unchanged) | `engine/l0/schema-continuity.ts`, `engine/o0/{lifecycle-events,reversibility-source,reversibility-translator}.ts` | Vendored at-pin; accepted-into-scope per MAJOR-3 disposition |
| Exists (unchanged) | `tools/vendor-from-deploysignal.sh` | MINOR-4/5/6 dispositions deferred |
| Exists (unchanged) | `package.json`, `tsconfig.json`, `tsconfig.test.json` | MAJOR-5 disposition documents the canonical state; no edits |
| Exists (unchanged) | `test/q01-vendoring-coverage.test.{ts,js}`, `test/q01-no-at-pin-deltas.test.{ts,js}`, `test/betting-e-process-class-dispatch.test.{ts,js}` | Pass post-R01 fix at `88fcd9c` |
| Changed | `engine/types/config.ts` | Deltas 5, 6, 7 (see § Per-file pseudocode) |
| Changed | `coordination/VENDORING-MANIFEST.md` | Delta 10: add betting-e-process-class-dispatch row; add note for removed ville-preservation row |
| Changed | `test/q01-schema-additions.test.ts` | Delta 8: update for restructured `PerShardCell` shape + canonical `confidence` field name; also update compiled `.js` (regenerated by `tsc` pretest hook) |
| Created | `test/q02-schema-extension.test.ts` | Delta 11: binds Delta 5/6/7 changes |
| Deleted | `test/ville-preservation-per-profile.test.ts` | Delta 9: per MINOR-7 disposition |
| Deleted | `test/ville-preservation-per-profile.test.js` | Delta 9 (companion compiled artifact) |

**Manifest cross-check:** 4 files modified (config.ts, VENDORING-MANIFEST.md, q01-schema-additions.test.ts, q01-schema-additions.test.js) + 1 file created (q02-schema-extension.test.ts; auto-generates q02-schema-extension.test.js via pretest) + 2 files deleted (ville-preservation.ts + .js) = 7 surfaces of change. No files touched outside this inventory.

---

## Per-file pseudocode

### File: `engine/types/config.ts` (changed)

The full file is currently 868 lines per R01 v0.2 land. R02 touches only the following specific line-ranges; everything else is preserved verbatim.

**Change site 1 — lines 417-435 (BaselineCellEntry):** replace the inline `confidence` union with the extracted typedef reference.

```typescript
/** One cell in the `baseline_cells.cells` array. */
export interface BaselineCellEntry {
  key: CellKey;
  n_samples: number;
  confidence: CellConfidence;  // ─── Tessera SLICE 2a Delta 7: extracted-typedef ref
  /** Populated iff `confidence === 'pooled'`; lists the adjacent cells
   *  whose samples were combined to hit `min_samples_pooled`. */
  pooled_from?: CellKey[];
  variance_inflated?: boolean;
  family_A?: { per_signal: Record<string, FamilyAPerSignalParams> };
  family_C?: FamilyCPerCell;
  family_E?: ConformalParams;
  family_D?: Record<string, FamilyDPerSignal>;
}
```

**Change site 2 — line 437-446 (BaselineCellsConfig):** replace the inline `dimensions` union element type with the extracted typedef reference.

```typescript
export interface BaselineCellsConfig {
  dimensions: CellDimension[];  // ─── Tessera SLICE 2a Delta 7: extracted-typedef ref
  cells: BaselineCellEntry[];
  aggregate_fallback: {
    family_A?: { per_signal: Record<string, FamilyAPerSignalParams> };
    family_C?: FamilyCPerCell;
    family_E?: ConformalParams;
    family_D?: Record<string, FamilyDPerSignal>;
  };
}
```

**Change site 3 — lines 839-867 (Tessera additions block):** replace with the consolidated R02 form. The new block consolidates Delta 5 (PerShardResidual extension), Delta 6 (PerShardCell restructure), and Delta 7 (CellDimension + CellConfidence typedef extraction made canonical). Note that the typedefs move to immediately above `PerShardResidual` so the interface body can reference `CellConfidence` without forward-reference concerns.

```typescript
// ─── TESSERA SLICE 1 + SLICE 2a ADDITIONS ──────────────────────────────────

/** Tessera SLICE 1 Delta 1 + 2 + SLICE 2a Delta 7 — canonical typedef extractions.
 *  Single source of truth for the cell-dimension and confidence-tier vocabularies.
 *  Referenced from BaselineCellEntry.confidence, BaselineCellsConfig.dimensions[],
 *  and PerShardResidual.confidence. */
export type CellDimension =
  | 'hour_of_day' | 'day_of_week' | 'workload_class'
  | 'tenant_slice' | 'tenant_tier' | 'region'
  | 'shard_id';  // ─── Tessera SLICE 1 Delta 1: 'shard_id' added

export type CellConfidence =
  | 'strict' | 'pooled' | 'aggregate' | 'none'
  | 'warm_start';  // ─── Tessera SLICE 1 Delta 2: 'warm_start' added

/** Tessera SLICE 1 Delta 3 + SLICE 2a Delta 5 — per-shard residual delta from fleet-aggregate.
 *  Sparse-encoded by confidence tier:
 *    - 'strict':     mean_vector + covariance present; mean_delta absent.
 *    - 'warm_start': mean_delta present; mean_vector + covariance absent.
 *    - 'pooled' / 'aggregate' / 'none': all delta fields absent; n_samples only.
 *  Full runtime population semantics deferred to SLICE 2b. */
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
}

/** Tessera SLICE 1 Delta 3 + SLICE 2a Delta 6 — one (shard_id, cell_key) entry in
 *  CompiledConfig.per_shard_cells. Mirrors BaselineCellEntry's `key: CellKey` shape
 *  so per-(shard_id, cell_key) lookup is the natural array iteration pattern. */
export interface PerShardCell {
  shard_id: string;
  key: CellKey;  // ─── Tessera SLICE 2a Delta 6: cell-key field added (restructure from SLICE 1)
  residual: PerShardResidual;
}
```

**Implementer note 1 (mandatory):** The previous declarations at lines 856-867 (`// Convenience type aliases for test/consumer imports.` + the two `export type` declarations) MUST be removed — they are now canonical at the position above and a duplicate at the bottom would re-introduce MINOR-1 drift. Verify via `grep -c "export type CellDimension" engine/types/config.ts` → exactly `1`.

**Implementer note 2 (mandatory):** Verify no stale `cell_confidence:` field references remain in `engine/types/config.ts` after editing. Run `grep -n "cell_confidence" engine/types/config.ts` → expect `0` matches. The canonical field name in `PerShardResidual` is `confidence`.

**Implementer note 3 (verification):** After the three change sites land, run `npm run typecheck`. The expected output is exit-zero. If tsc complains about CellDimension/CellConfidence being undefined-at-reference-site, the typedef extractions need to be moved earlier in the file (above the BaselineCellEntry/BaselineCellsConfig declarations) — TypeScript hoists type declarations but the failure mode would indicate a circular-import or ordering issue worth a HALT-DIAGNOSTIC.

### File: `test/q01-schema-additions.test.ts` (changed — Delta 8)

R02 updates the test to use the canonical field name `confidence` (was `cell_confidence` per the `.js` compiled artifact) and to instantiate the restructured `PerShardCell` shape. Five test cases total; each maps to one R01 AC-3 sub-clause + the restructure.

```typescript
// test/q01-schema-additions.test.ts — R01 AC-3 (R02-updated for SLICE 2a Delta 6 + 7)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  CompiledConfig,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';

test('Q1 AC-3 Delta-1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

test('Q1 AC-3 Delta-2 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

test('Q1 AC-3 Delta-3 — PerShardResidual accepts sparse encoding', () => {
  // Sparse: mean_vector + covariance absent. n_samples + confidence mandatory.
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

test('Q1 AC-3 Delta-4 — CompiledConfig accepts per_shard_cells field', () => {
  // R02 Delta 6 restructure: PerShardCell now requires `key: CellKey`.
  // Stub a CellKey-shaped object inline (CellKey is inherited; shape preserved verbatim).
  const cells: PerShardCell[] = [
    { shard_id: 'shard-0', key: { hour_of_day: 0 } as any, residual: { n_samples: 0, confidence: 'warm_start' } },
    { shard_id: 'shard-1', key: { hour_of_day: 1 } as any, residual: { n_samples: 60, confidence: 'strict', mean_vector: [1, 2] } },
  ];
  const cfg: CompiledConfig = { per_shard_cells: cells } as CompiledConfig;
  assert.strictEqual(cfg.per_shard_cells?.length, 2);
  assert.strictEqual(cfg.per_shard_cells?.[0]?.key !== undefined, true);
});
```

**Implementer note 4 (mandatory):** The `as any` casts in the `key: CellKey` literal are a deliberate substrate shortcut at SLICE 2a — `CellKey` is the inherited `Record<CellDimension, string | number>` shape (verify shape at `engine/types/config.ts` `CellKey` declaration before commit; if the actual shape differs from `Record<CellDimension, ...>`, adjust the test literal to satisfy the real shape rather than retaining `as any`). Stripping the `as any` is desirable but not load-bearing for R02; bound the time-spent to <10 min on this — if stripping requires a non-mechanical change, leave the cast and add a single-line `// SLICE 2b: drop cast when CellKey factory lands` comment.

**Implementer note 5 (verification):** After Delta 8 lands, the `.js` compiled artifact is regenerated by the `pretest` hook; do not edit `.js` by hand. The five test names above match R01 spec verbatim (do not rename; the test-name string is referenced by the right-reasons audit trail).

### File: `test/q02-schema-extension.test.ts` (created — Delta 11)

Five test cases binding the five Delta-5/6/7 schema changes. Each test maps to one R02 AC.

```typescript
// test/q02-schema-extension.test.ts — R02 AC-1 through AC-5
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CellDimension,
  CellConfidence,
  PerShardCell,
  PerShardResidual,
} from '../engine/types/config';

test('R02 AC-1 — PerShardResidual.n_samples is mandatory and typed number', () => {
  // Type-level: omitting n_samples must fail tsc. The runtime assertion confirms the
  // field shape at the instantiation site.
  const r: PerShardResidual = { n_samples: 42, confidence: 'warm_start' };
  assert.strictEqual(r.n_samples, 42);
  assert.strictEqual(typeof r.n_samples, 'number');
});

test('R02 AC-2 — PerShardResidual sparse encoding by confidence tier (warm_start)', () => {
  // Warm-start convention: mean_delta present; mean_vector + covariance absent.
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

test('R02 AC-3 — PerShardCell carries shard_id + key + residual', () => {
  // Delta 6: PerShardCell mirrors BaselineCellEntry shape with `key: CellKey`.
  const cell: PerShardCell = {
    shard_id: 'shard-42',
    key: { hour_of_day: 14, day_of_week: 3 } as any,
    residual: { n_samples: 100, confidence: 'strict', mean_vector: [1.0, 2.0] },
  };
  assert.strictEqual(cell.shard_id, 'shard-42');
  assert.strictEqual(cell.residual.n_samples, 100);
  // `key` field must be present (Delta 6 restructure binding).
  assert.notStrictEqual(cell.key, undefined);
});

test('R02 AC-4 — CellDimension typedef canonically references all 7 members', () => {
  // Extraction (Delta 7) preserves the inline-union literal value-by-value.
  const all: CellDimension[] = [
    'hour_of_day', 'day_of_week', 'workload_class',
    'tenant_slice', 'tenant_tier', 'region', 'shard_id',
  ];
  assert.strictEqual(all.length, 7);
  assert.strictEqual(all.includes('shard_id'), true);
});

test('R02 AC-5 — CellConfidence typedef canonically references all 5 members', () => {
  const all: CellConfidence[] = ['strict', 'pooled', 'aggregate', 'none', 'warm_start'];
  assert.strictEqual(all.length, 5);
  assert.strictEqual(all.includes('warm_start'), true);
});
```

**Implementer note 6 (mandatory):** This file is TDD-first. Write the file with `tsc` clean (the imports must resolve), run `node --test test/q02-schema-extension.test.js`, observe the file does not yet exist or imports fail → RED. Then edit `engine/types/config.ts` per Deltas 5/6/7. Re-run → GREEN. Commit RED test first; commit Delta 5/6/7 + Delta 8 test update + Delta 11 test second. (R01 MINOR-9 attributed the single-commit landing to the session crash; R02 has no crash context to invoke and standard TDD ordering applies.)

### File: `coordination/VENDORING-MANIFEST.md` (changed — Delta 10)

Add one row (betting-e-process smoke test) and one explanatory note (ville-preservation deletion). The note format below preserves manifest readability without violating row-iteration of any downstream test.

Append two rows at the end of the existing table:

```markdown
| test/betting-e-process-class-dispatch.test.ts | test/betting-e-process-class-dispatch.test.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Smoke test for Family C dispatch regression detection; vendored R01 per Q1.4 |
| test/ville-preservation-per-profile.test.ts | test/ville-preservation-per-profile.test.ts | 5a72371 | REMOVED-AT-R02 | 2026-05-16 | Removed at R02 per R01 MINOR-7 disposition: test shells to `tools/calibrate.js` which Tessera does not carry at SLICE 1/2a (SAS-6). Re-vendor decision deferred to SLICE 2b. |
```

**Implementer note 7 (mandatory):** Do not modify any pre-existing manifest rows. Do not change the manifest table header. The `REMOVED-AT-R02` sync-policy literal in the second row is a new sync-policy value (alongside `vendored-at-pin` and `vendored-with-deltas`); document it inline in the row's "Notes" cell (already done in the row text above). No separate "Sync policy vocabulary" section needed.

### Deletions — Delta 9

Delete the following two files:

- `test/ville-preservation-per-profile.test.ts`
- `test/ville-preservation-per-profile.test.js`

Use `git rm` (not `rm`) so the deletions are tracked in the commit. Implementer commit message format: `chore(R02): remove ville-preservation-per-profile dead-test substrate (R01 MINOR-7 disposition)`.

---

## Acceptance criteria

Every AC binds to at least one test case in either `test/q02-schema-extension.test.ts` (the R02-new test) or `test/q01-schema-additions.test.ts` (R01-updated test). Each AC traces to one specific § Mechanism Delta.

1. **AC-1 — `PerShardResidual.n_samples` is mandatory and typed `number`.** Given the post-R02 `engine/types/config.ts`, when an instantiation omits the `n_samples` field, then `tsc` rejects it with TS2741 (Property 'n_samples' is missing). Verified by `test/q02-schema-extension.test.ts` test name `R02 AC-1` (runtime assertion confirms field shape; tsc compilation is the type-level check).

2. **AC-2 — `PerShardResidual` honors the sparse-encoding-by-confidence-tier convention.** Given a warm-start residual instance, when its fields are inspected, then `mean_delta` is present, `mean_vector` is absent, `covariance` is absent, and `residual_seed_hash` + `last_observed_at` are accepted as optional fields. Verified by `test/q02-schema-extension.test.ts` test name `R02 AC-2`.

3. **AC-3 — `PerShardCell` shape is `{ shard_id: string, key: CellKey, residual: PerShardResidual }`.** Given a `PerShardCell` instance, when its fields are inspected, then all three fields are present and the `key` field is non-undefined. Verified by `test/q02-schema-extension.test.ts` test name `R02 AC-3` AND by `test/q01-schema-additions.test.ts` test name `Q1 AC-3 Delta-4` (which instantiates the new shape).

4. **AC-4 — `CellDimension` typedef is canonical and includes all 7 dimension literals.** Given the extracted typedef, when it is iterated as `CellDimension[]`, then the array length is exactly 7 and includes `'shard_id'`. Additionally: `grep -c "export type CellDimension" engine/types/config.ts` returns exactly `1` (no duplicate definitions). Verified by `test/q02-schema-extension.test.ts` test name `R02 AC-4` + Implementer-side grep evidence in commit message.

5. **AC-5 — `CellConfidence` typedef is canonical and includes all 5 confidence literals.** Given the extracted typedef, when it is iterated as `CellConfidence[]`, then the array length is exactly 5 and includes `'warm_start'`. Additionally: `grep -c "export type CellConfidence" engine/types/config.ts` returns exactly `1`. Verified by `test/q02-schema-extension.test.ts` test name `R02 AC-5` + grep evidence.

6. **AC-6 — Tessera-side `tsc` clean compile via `tsconfig.test.json`.** Given the post-R02 tree, when `npm run typecheck` is invoked, then it exits zero with no warnings or errors. Verified by Implementer at commit time and disclosed in NEXT-ROLE.md "Binding command results" section.

7. **AC-7 — All R01-shipped tests still pass.** Given the post-R02 tree, when `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js` is invoked, then all three test files pass (`pass N / fail 0` for each). The Delta-8 update to `q01-schema-additions.test.ts` is required for it to pass (R02 changed `PerShardCell` shape and `PerShardResidual.confidence` field name). Verified by direct invocation.

8. **AC-8 — R02 new tests pass.** Given the post-R02 tree, when `node --test test/q02-schema-extension.test.js` is invoked, then it passes (`pass 5 / fail 0`). Verified by direct invocation.

9. **AC-9 — Vendoring manifest enumerates the betting-e-process smoke test.** Given `coordination/VENDORING-MANIFEST.md`, when grepped for `betting-e-process-class-dispatch.test.ts`, then exactly one row matches with `sync-policy: vendored-at-pin` and SHA `5a72371`. Verified by Implementer at commit time via `grep -c "betting-e-process-class-dispatch" coordination/VENDORING-MANIFEST.md` → 1.

10. **AC-10 — Vendoring manifest documents the ville-preservation removal.** Given `coordination/VENDORING-MANIFEST.md`, when grepped for `ville-preservation-per-profile`, then exactly one row matches with `sync-policy: REMOVED-AT-R02` and a Notes field referencing R01 MINOR-7. Verified by `grep -c "REMOVED-AT-R02" coordination/VENDORING-MANIFEST.md` → 1.

11. **AC-11 — `test/ville-preservation-per-profile.test.{ts,js}` are removed from the tree.** Given the post-R02 working tree, when `ls test/` is invoked, then no file matching the `ville-preservation-per-profile*` glob is present. Verified by `git ls-files test/ | grep -c ville-preservation` → 0.

12. **AC-12 — Smoke test still runs and passes.** Given the post-R02 tree, when `node --test test/betting-e-process-class-dispatch.test.js` is invoked, then it passes (`pass 5 / fail 0`). Verified by direct invocation. (No-regression check; R01 fix at `88fcd9c` established the green baseline.)

13. **AC-13 — TDD ordering verifiable in git history.** Given the R02 commit sequence, when `git log --oneline -- engine/types/config.ts test/` is inspected, then the RED commit (test/q02-schema-extension.test.ts added with failing assertions or non-resolving imports) precedes the GREEN commit (engine/types/config.ts Deltas 5/6/7 land + Delta 8 test update). Verified by Implementer commit-ordering attestation in NEXT-ROLE.md. (Closes the R01 MINOR-9 gap by providing temporal evidence; R02 has no session-crash context to invoke.)

---

## Anti-scope

Per anchor `skills/06-anti-scope-ledger.md`. Each named item is NOT in scope at R02; halt-and-route-back triggers on encounter via DIAGNOSTIC + STATUS: ESCALATE per `CLAUDE-IMPLEMENTER.md` halt discipline.

- **R02-SAS-1: NO warm-start runtime mechanism.** SLICE 2b scope per AC-P2 deferral. Implementer encountering apparent need to implement the runtime → HALT.
- **R02-SAS-2: NO compiled-artifact loading or verification.** SLICE 2b scope. The schema deltas land at type-level only; no runtime config-loader code at R02.
- **R02-SAS-3: NO PR-F5 empirical storage profile measurement.** SLICE 2b scope (or standalone empirical-measurement round). R02 ships schema only; storage measurement requires populated `per_shard_cells` data which requires SLICE 2b runtime.
- **R02-SAS-4: NO new detector vendoring.** Detector set is closed at R01-shipped state. If Implementer encounters compile failure in inherited detectors due to R02 schema deltas, HALT — the cause is Delta 7 typedef-extraction breakage, not missing detectors.
- **R02-SAS-5: NO orchestrator vendoring.** `engine/orchestrator.ts` deferred to a later SLICE per R01 § Skipped at SLICE 1. R02 does not add orchestrator code.
- **R02-SAS-6: NO modification to `tsconfig.json`, `tsconfig.test.json`, or `package.json`.** R01 MAJOR-5 disposition canonicalizes the CJS choice; R02 does not edit these. If Implementer encounters apparent need to modify (e.g., a new typedef requires ESM-only syntax), HALT and route back.
- **R02-SAS-7: NO modification to `tools/vendor-from-deploysignal.sh`.** R01 MINOR-4/5/6 dispositions deferred. Script stays as-is.
- **R02-SAS-8: NO modification to inherited vendored engine internals.** A12 inherited; if Delta 7 typedef-extraction surfaces a compile failure inside `engine/detectors/**` or `engine/types/families/**` or similar, the cause is the Delta-7 extraction itself (extracted typedef does not match inline-union literal exactly). Fix is to make the typedef match; never to edit inherited detector code.
- **R02-SAS-9: NO addition of new R01 fix-cycle work beyond the four bundled dispositions (MAJOR-3, MAJOR-4, MAJOR-5, MINOR-1, MINOR-2, MINOR-7).** R01 MINOR-3/4/5/6/8/9 dispositions are tracked in MEMORIAL.md and addressed when their parent surface is next touched. Implementer encountering temptation to fix MINOR-3 (HEADER_LINE_COUNT robustness) or MINOR-4 (vendoring script SHA verification) or MINOR-6 (manifest-append silent skip) → HALT and route back; do not silently absorb scope.
- **R02-SAS-10: NO modification to R01 spec or audit sidecar.** R01 spec stays as it landed; R02 supersedes via this spec text. Future re-readers see both R01 and R02 specs; the disposition note in R02 § Mechanism stands as the disposition record.
- **R02-SAS-11: NO modification to R01-shipped tests beyond the Delta-8 update to `q01-schema-additions.test.ts`.** The other two R01 tests (`q01-vendoring-coverage`, `q01-no-at-pin-deltas`) stay verbatim. Implementer encountering apparent need to update `q01-no-at-pin-deltas.test.ts` (e.g., to make HEADER_LINE_COUNT more robust per MINOR-3) → HALT per R02-SAS-9.
- **R02-SAS-12: NO addition of TypeScript strict-mode flags, lint configuration, or pre-commit hooks.** R01 inherited the tsconfig and did not add lint substrate (per anti-scope inherited from `package.json` minimal devDependencies). R02 does not introduce new tooling.

**Cross-references to R01 anti-scope (preserved):** R01 SAS-1 (no detector internals modification), SAS-3 (no fleet-merge logic), SAS-4 (no per-shard predicate logic at runtime — REPHRASED for R02: SLICE 2a ships schema only, no runtime), SAS-5 (no hardware topology), SAS-6 (no test-suite substrate harness; covers the ville-preservation removal), SAS-9 (no Tessera-specific compiled-config JSON) — all carry forward.

**Cross-references to v0.3 SCOPING-MEMO anti-scope clauses:** A1–A17 all carry forward to R02 with no additions.

**Cross-references to R01 SAS-7/SAS-8 (superseded for the affected files only):** SAS-7 (no `_q72-trace.ts` vendoring) is superseded for the `_q72-trace.ts` file specifically — accepted as a compilation dependency per R01 MAJOR-3 disposition. SAS-7's intent (no Tessera-side diagnostic equivalent) remains in force. SAS-8 (no `engine/types/agent.ts` vendoring) is similarly superseded for that one file; the broader intent (Addition #27 dormant; no Tessera-side agent semantics work) remains in force.

---

## Open questions

1. **OQ-1: Should `tools/vendor-from-deploysignal.sh` add a source-SHA verification step (R01 MINOR-4) as part of R02 or a separate round?** Architect-pre-prediction: separate round. R02 is scoped to schema + R01 architectural-level dispositions; script hardening is a procedural-tooling concern best addressed in a standalone tooling round (or rolled into the SLICE 2b round if SLICE 2b vendoring activity is significant). Not load-bearing on R02 acceptance. Implementer does not act on this in R02.

2. **OQ-2: Should `test/q01-vendoring-coverage.test.ts` be broadened to iterate `test/*` paths (in addition to `engine/*`) so the betting-e-process row is asserted programmatically?** Architect-pre-prediction: defer to SLICE 2b. At R02 there is only one vendored test file under `test/`; broadening adds iteration-list churn without commensurate coverage gain. AC-9 + AC-10 use direct `grep` evidence at commit time, which satisfies the manifest-coverage discipline for R02. SLICE 2b is the natural broaden-point if additional vendored tests land. Implementer does not act on this in R02.

3. **OQ-3: Should R02 propose a "Compilation-dependency enumeration" pre-emit grilling step (analogous to anchor PR #35 § Existing architectural surface) to prevent recurrence of R01 MAJOR-3 anti-scope-vs-compilation-deps drift?** Architect-pre-prediction: yes, but as a separate anchor proposal (`templates/Q-NN-SPEC-TEMPLATE.md` v3 addition), not as R02 spec content. The reinforcement-rule capture belongs in `CLAUDE-ARCHITECT.md` reinforcements (which Memorial Updater already updated post-R01 per `coordination/MEMORIAL.md:121`). R02 spec text documents the disposition; the structural fix is a future cross-project anchor commit. Implementer does not act on this in R02.

4. **OQ-4: Is the `as any` cast on the `key: CellKey` literal in the test files an acceptable substrate shortcut or should R02 ship a `CellKey` factory?** Architect-pre-prediction: substrate shortcut is acceptable at SLICE 2a — `CellKey` is the inherited `Record<CellDimension, string | number>` shape (verify at `engine/types/config.ts` CellKey declaration); a literal `{hour_of_day: 0}` satisfies the shape but TypeScript's structural typing may require the assertion in narrow cases. If stripping the cast requires no new helper and `tsc` is clean, prefer the strip. If it requires a helper, defer to SLICE 2b. Bounded budget: <10 min per Implementer note 4.

5. **OQ-5: Will Delta 7 typedef extraction surface any latent compile failures in inherited detector code?** Architect-pre-prediction: no — the extracted typedef is byte-identical to the inline union literal value-by-value, and TypeScript's structural typing treats `'strict' satisfies CellConfidence` and `'strict' satisfies 'strict' | 'pooled' | 'aggregate' | 'none' | 'warm_start'` identically. The risk is only if the extraction inadvertently drops or adds a member. Mitigated by AC-4 + AC-5 (test asserts exact member set). If `npm run typecheck` fails after Delta 7, HALT with DIAGNOSTIC documenting the failing site and proposed disposition (most likely: typedef member list incomplete; fix is mechanical).

No other unresolved items. (Per CLAUDE-ARCHITECT.md: "All unresolved decisions → open questions in the spec. Not silent choices.")

---

## P3 ten-axis verification

- **P3.1 concrete-values:** All schema-extension prescriptions name specific identifiers (`n_samples`, `mean_delta`, `residual_seed_hash`, `last_observed_at`, `key: CellKey`, `CellDimension`, `CellConfidence`); no abstract magic numbers. The 7-member CellDimension and 5-member CellConfidence cardinalities are spelled out and bound by AC-4 + AC-5.
- **P3.2 coord-trail:** SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 2 row + § 2.2 Extension 2 grepped; R01 spec § Mechanism Delta 3 commitment ("SLICE 2 will add: residual_seed_hash, per_shard_n_samples, etc.") + R01 Reviewer MAJOR-3/4/5 + MINOR-1/2/7 all addressed; no contradicting claims. R01 anti-scope clauses preserved (R01 SAS-1, SAS-3, SAS-5, SAS-6, SAS-9 carry forward; SAS-4 rephrased to "no runtime"; SAS-7 + SAS-8 superseded for specific files per disposition).
- **P3.3 file-opened:** `engine/types/config.ts` opened at lines 100-125 (CompiledConfig field site), 400-450 (BaselineCellEntry + BaselineCellsConfig sites), 830-868 (Tessera SLICE 1 additions block) — all verified verbatim at HEAD `88fcd9c`. R01 spec, R01 audit sidecar, R01 REVIEWER report, MEMORIAL.md, VENDORING-MANIFEST.md all opened in full. CROSS-PROJECT-MEMORIAL.md sampled via grep + offset-reads for reinforcement-rules sections (offset 900 + offset 1500 + offset 1830, ~600 lines covering R35 through R64 reinforcement rules + tessera R01 section).
- **P3.4 function-bodies:** R02 is mechanical schema work; no algorithmic function bodies to scrutinize. The four new optional fields on `PerShardResidual` are type-level only at SLICE 2a; runtime functions that read them are SLICE 2b scope.
- **P3.5 compiled-artifact:** R02 does not introduce a Tessera-specific compiled-config JSON artifact (R01 SAS-9 carry-forward). The schema additions extend the compile-time TypeScript types; runtime config-loading is SLICE 2b. AC-6 (`tsc` clean compile) is the compiled-artifact-equivalent check.
- **P3.6 substrate-validation:** R02 has no substrate (no compiled-config JSON, no synthetic-cluster substrate; both SLICE 2b scope). AC-6 + AC-12 substitute via type-system + smoke-test execution.
- **P3.7 enumeration:** Component inventory enumerated explicitly with state markers; 4 changed + 1 created + 2 deleted = 7 surfaces. Manifest cross-check confirms no files outside inventory.
- **P3.8 contradiction-search:** Cross-section consistency pass (next section) explicitly checks for naming/structure drift across § Mechanism / § Per-file pseudocode / § Acceptance criteria / Open questions. R01 reinforcement at CLAUDE-ARCHITECT.md applied.
- **P3.9 carry-forward-claims:** Every R01 MAJOR/MINOR disposition referenced in § Mechanism cites the source REVIEWER finding by ID and traces to a specific R02 Delta (MAJOR-3 → § Mechanism carry-forward block; MAJOR-4 → Delta 10; MAJOR-5 → § Mechanism carry-forward block; MINOR-1 → Delta 7; MINOR-2 → Delta 8; MINOR-7 → Delta 9).
- **P3.10 verification-discipline:** Every AC binds to a runnable test (q01 or q02) or to a grep evidence command runnable at commit time; no AC is operator-asserted-only.

---

## Cross-section consistency pass (R01 reinforcement — mandatory)

Per the R01 ARCHITECT reinforcement at `CLAUDE-ARCHITECT.md`: for every resolved decision that names a module model, type structure, naming convention, or deferral policy, verify ALL spec sections use a consistent surface. Each check below was executed by grepping the spec for the alternative form before the spec was emitted.

| Resolved decision | Canonical form | Spec sections checked | Result |
|---|---|---|---|
| Field name on `PerShardResidual` | `confidence` (not `cell_confidence`) | § Mechanism Delta 5, § Per-file pseudocode (config.ts + q01-schema-additions test + q02-schema-extension test), § AC, Implementer note 2 | ✅ Spec uses `confidence` throughout. Implementer note 2 explicitly requires `grep -n "cell_confidence" engine/types/config.ts` → 0 matches as a Delta-7 acceptance gate. |
| `PerShardCell` shape | `{ shard_id, key: CellKey, residual }` (not `{ shard_id, residual }`) | § Mechanism Delta 6, § Per-file pseudocode, § AC-3, q01-schema-additions test update | ✅ All four sites use the restructured shape. Delta 8 explicitly updates the q01 test for the new shape. |
| `n_samples` mandatory | `n_samples: number` (mandatory, not optional) | § Mechanism Delta 5, § Per-file pseudocode (PerShardResidual interface body + test instantiations), § AC-1 | ✅ All seven test-side `PerShardResidual` instantiations (4 in q01-schema-additions update + 3 in q02-schema-extension) include `n_samples`; AC-1 binds the mandatory-ness via tsc compile failure on omission. |
| Typedef extraction location | Typedefs declared at lines 839-867 in `engine/types/config.ts` (above PerShardResidual), single source of truth, no duplicate aliases | § Mechanism Delta 7, § Per-file pseudocode change site 3, Implementer note 1, § AC-4 / AC-5 | ✅ Implementer note 1 explicitly requires `grep -c "export type CellDimension" engine/types/config.ts` → 1 (not 2). AC-4 + AC-5 use the same grep as evidence. |
| Module model | CommonJS via tsc-emit (R01 Q1.1 canonical) | § Mechanism R01 carry-forward block, § Anti-scope R02-SAS-6, no edits to package.json / tsconfig.json | ✅ R02 makes no edits to module-model artifacts; disposition documented as text only. |
| R01 carry-forward bundling | Six dispositions bundled (MAJOR-3, MAJOR-4, MAJOR-5, MINOR-1, MINOR-2, MINOR-7); others deferred | § Mechanism carry-forward block, § Anti-scope R02-SAS-9, MEMORIAL.md cross-reference at R02 close | ✅ R02-SAS-9 explicitly anti-scopes MINOR-3/4/5/6/8/9. The six bundled dispositions map 1:1 to specific Deltas (or to disposition-as-text). |
| Test file naming | `test/q02-schema-extension.test.ts` (matches the `q01-*` precedent) | § Mechanism, § Per-file pseudocode, § AC-8, OQ-2 | ✅ Single test file path used throughout. Compiled `.js` artifact regenerated by pretest hook (not separately named). |
| Sync-policy vocabulary | `vendored-at-pin`, `vendored-with-deltas`, and new `REMOVED-AT-R02` | § Mechanism Delta 10, § Per-file pseudocode (manifest rows), § AC-9 (vendored-at-pin), § AC-10 (REMOVED-AT-R02) | ✅ The new sync-policy literal `REMOVED-AT-R02` is documented in Implementer note 7 (no separate vocabulary section needed; row Notes field carries the explanation). |
| Deferral policy on runtime work | Warm-start runtime + compiled-artifact verification + PR-F5 measurement all SLICE 2b | § Mechanism Spec preamble + last paragraph, § Anti-scope R02-SAS-1/2/3, OQ-1/2/3/4/5 | ✅ Three independent restatements of the SLICE 2b deferral, each with the same scope description. No drift. |

**Cross-section consistency pass: PASS.** No contradictions detected between resolved decisions and downstream sections. Each check executed before grilling sign-off.

---

## Grilling output (pre-emit adversarial self-review)

Per `CLAUDE-COMMON.md` pre-emit-grilling discipline; per CLAUDE-ARCHITECT.md grilling reinforcement.

- **Q: Is every claim in this artifact backed by something verifiable?** Yes. Every line-number citation (config.ts:100-125, 400-450, 830-868, 856-867, 438, 421, 847, 844-848) was verified by direct file reads during spec authoring. Every R01 MAJOR/MINOR ID cites the source REVIEWER-REPORT-R01.md. The `88fcd9c` HEAD reference was confirmed by `git log --oneline -1`. The CROSS-PROJECT-MEMORIAL.md reinforcement at the R01 ARCHITECT cross-section-consistency entry was read directly (line 906).

- **Q: Does any part rely on an unstated assumption?** Searched. Three assumptions surfaced and resolved:
  1. _Assumption that inherited engine code does not import `PerShardCell` or `PerShardResidual`._ Resolution: spec § Integration points states "greppable to confirm 0 matches in engine/**/*.ts outside config.ts"; Implementer can verify in <1 min before Delta 5/6 land.
  2. _Assumption that `CellKey` is `Record<CellDimension, string | number>` shape._ Resolution: Implementer note 4 explicitly requires verification at `engine/types/config.ts` CellKey declaration before commit; adjust test literals if shape differs.
  3. _Assumption that Delta 7 typedef extraction does not break inherited code due to structural-typing equivalence._ Resolution: OQ-5 documents the architect-pre-prediction explicitly and the HALT condition if pre-prediction is wrong.

- **Q: Has scope been added beyond what was requested?** Audited. The requested R02 work is "Phase 1 SLICE 2 per SCOPING-MEMO + R01 carry-forwards." The brainstorm narrowed to SLICE 2a (Approach B); the carry-forwards bundled are the four architecturally-load-bearing R01 MAJORs (MAJOR-3 anti-scope, MAJOR-4 manifest, MAJOR-5 module model) + MINOR-1/2/7 (which directly affect the schema this round touches). No additional MAJORs or MINORs are bundled. R02-SAS-9 explicitly fences the unbundled R01 MINORs (3/4/5/6/8/9) as anti-scope. No scope creep.

- **Q: Can the Implementer act on this with zero clarifying questions?** Audited as a cold reader. Each Delta has: (1) precise line-range citation; (2) pseudocode for the post-change state; (3) Implementer note(s) with verification commands; (4) AC binding. Each AC has Given/When/Then form with no ambiguous language. Anti-scope is enumerated explicitly with HALT triggers. Open questions are architect-pre-predicted with explicit "Implementer does not act on this in R02" notes. **One residual ambiguity acknowledged:** OQ-4 (the `as any` cast on `CellKey` literal) is bounded by a "<10 min" time budget rather than a hard prescription — this is intentional per CLAUDE-ARCHITECT.md "tactical implementation detail delegated to Implementer." If the Implementer hits any non-mechanical surface during the cast-stripping attempt, HALT applies via R02-SAS-9. Acceptable residual.

- **Q: Adversarial check: what would I find if I were the cold-eye Reviewer auditing this spec?** Three likely Reviewer findings pre-empted:
  1. _R02 carry-forward dispositions are made via spec text rather than amendment to R01 spec_ — explicitly defended in R02-SAS-10 ("R01 spec stays as it landed; R02 supersedes via this spec text"). Acceptable per the "do not rewrite history" pipeline pattern.
  2. _Delta 6 restructure is a breaking change to R01-shipped schema_ — explicitly defended in § Mechanism Delta 6 ("R01 explicitly committed to provisional schema in its Delta 3 (...); the break is in-bounds"). Trace evidence: R01 Q-R01-SPEC.md line 35 "Full PerShardResidual runtime semantics are SLICE 2 scope".
  3. _The dead-test removal (MINOR-7) might be confused with no-skip-policy memorial violation_ — explicitly defended in § Mechanism MINOR-7 disposition ("the test is not being silently skipped, it is being explicitly removed pending substrate availability, with the substrate-availability decision tagged in the manifest"). Trace evidence: VENDORING-MANIFEST.md row's REMOVED-AT-R02 sync policy + Notes field.

- **Q: Memorial sweep — any inherited memorials apply that I haven't addressed?** Reviewed. Inherited memorials (from MEMORIAL.md lines 9-19 + CROSS-PROJECT-MEMORIAL.md offset reads):
  - Memorial D (architectural-layer-coverage): R02 brainstorm enumerated 5 candidate approaches; rejected 3 with explicit weaknesses-rationale; selected B with documented trade-off. Documented in audit sidecar.
  - Memorial F (4 sub-rules at brief-drafting): applies to compile-time substrate changes; R02 modifies `engine/types/config.ts`, which is compile-time substrate. Sub-rules 1+2+3+4 all consulted: file-opened verified (P3.3); inherited type-state cited (R01 spec Delta 3 commitment line cited); candidate-set enumeration (brainstorm 5 approaches); no narrowing of stakeholder requirements (SCOPING-MEMO SLICE 2 narrowed to 2a, the narrowing is explicitly documented).
  - No-skip-policy on statistical-invariant tests: see MINOR-7 disposition defense above.
  - Architect grilling discipline: this section.
  - R01 reinforcement (cross-section consistency pass): executed in dedicated section above.

- **Grilling pass: PASS.** Spec is ready for routing.

---

_For brainstorm full rationale (5 approaches, why-picked / why-rejected), R02-specific pre-route discipline application (skills 14 + 15 + memorial sweep + tier-rubric verdict), architect pre-predictions on outcomes, and Q-R02 → Q-R03 sequencing context, see `Q-R02-SPEC-AUDIT.md`._
