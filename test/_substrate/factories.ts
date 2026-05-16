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

import type { CellKey } from '../../engine/types/primitives';
import type {
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
