// tools/contrast.ts — the shared model-free contrast fit (Mode B spatial null; ADR 0019).
//
// Extracted from clustersynth-mode-b.ts so both the Mode B pipeline AND the control-twin validity detector
// (tools/contamination-detector.ts, ADR 0021) can use the same standardization without an import cycle.
// clustersynth-mode-b.ts re-exports these, so existing importers are unaffected.

import { estimateAr1, whiten } from './per-shard-whitening.js';

export const median = (xs: number[]): number => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
export const madScale = (xs: number[]): number => { const m = median(xs); return Math.max(1.4826 * median(xs.map((x) => Math.abs(x - m))), 1e-9); };

/** The contrast fit estimated on the HEALTHY baseline contrast: a centering offset (the treatment and
 *  control have INDEPENDENT baselines, so the contrast has a nonzero mean), AR(1) φ, and robust
 *  location/scale of the whitened residual. CENTER BEFORE WHITENING: `whiten` returns the first tick
 *  unchanged (no prior sample), so without centering that seed tick carries the full baseline offset and
 *  standardizes to a many-σ outlier — one fat tail per series that spuriously trips the ∏g calibration. */
export interface ContrastFit { phi: number; loc: number; scale: number; center: number; }

export function fitContrast(d0: number[]): ContrastFit {
  const center = median(d0);
  const dc = d0.map((x) => x - center);
  const { phi } = estimateAr1(dc);
  const w = dc.map((x, t) => whiten(x, t > 0 ? dc[t - 1] : null, phi));
  return { phi, loc: median(w), scale: madScale(w), center };
}

/** Apply a baseline contrast fit to a (monitoring) contrast: center, whiten at φ, standardize by loc/scale. */
export function applyContrast(d: number[], fit: ContrastFit): number[] {
  const dc = d.map((x) => x - fit.center);
  return dc.map((x, t) => (whiten(x, t > 0 ? dc[t - 1] : null, fit.phi) - fit.loc) / fit.scale);
}
