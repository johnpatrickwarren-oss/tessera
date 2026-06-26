// tools/robust-mcd-screen.ts — Tessera-local adapter over the engine's
// robust-covariance kit for the baseline-curation contamination screen.
//
// Replaces the formerly-vendored tools/calibrators/{family-c,_shared}.ts MCD
// numerics. As of the engine L1 baseline kit (engine ADRs 0013–0021), the
// robust-covariance / Mahalanobis / χ² math lives in the engine package at
// `@johnpatrickwarren-oss/deploysignal-engine/baseline/robust-covariance`;
// Tessera no longer carries a duplicate MCD implementation. This module is the
// thin Tessera-side seam: the two screen defaults (Q-JC1 α vendor-at-pin) plus
// a null-returning adapter that preserves the prior fastMCD()===null contract.

import { robustCovariance } from '@johnpatrickwarren-oss/deploysignal-engine/baseline/robust-covariance';

/** MCD subset-size α ∈ (0.5, 1.0]; vendor-at-pin default 0.75 (Q-JC1). */
export const FASTMCD_DEFAULT_ALPHA = 0.75;
/** Deterministic FastMCD PRNG seed (Tessera baseline-curation default). */
export const FASTMCD_DEFAULT_SEED = 0xFA5DA >>> 0;

/** Robust (MCD) mean + covariance for the per-shard within-window contamination
 *  screen. Returns null when the engine rejects the input (empty/ragged →
 *  RangeError); callers treat null as "MCD failed → skip-and-pass-through",
 *  matching the prior `fastMCD(...) === null` contract.
 *
 *  `minSamplesPerDim: 1` keeps the engine on the robust MCD path down to n≥p
 *  (the prior screen guard is n≥p+1). The screen REQUIRES a robust estimator:
 *  the engine's default-5 Ledoit-Wolf fallback is non-robust, and on a small
 *  window a gross outlier would inflate its own Mahalanobis cutoff and escape
 *  the screen. */
export function robustScreenCov(
  rows: number[][],
  alpha: number,
  seed: number,
): { mean: number[]; cov: number[][] } | null {
  try {
    const { mean, cov } = robustCovariance(rows, { alpha, seed, minSamplesPerDim: 1 });
    return { mean, cov };
  } catch {
    return null;
  }
}
