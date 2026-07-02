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

/** Compose a fit from two sources (2026-07-02 audit F8 fix, ADR 0022 mixed-cadence path): the CENTER
 *  from a long (possibly coarse-cadence) baseline fit of the SAME contrast — a mean offset is
 *  cadence-independent, so the ≥2-month baseline supplies it validly across cadences — and the
 *  DYNAMICS (φ, loc, scale — all cadence-dependent) from a monitoring-cadence KNOWN-NULL fit (the
 *  triad's full-window c1−c2 sibling contrast, which is fault-free under gpu-level treatment faults).
 *  This eliminates the mon pre-fault-prefix fit and with it the baked-in "onsets ≥ 0.1·T" DGP
 *  assumption (a production fault in the first ticks can no longer corrupt its own null). */
export function composeFit(centerFrom: ContrastFit, dynamicsFrom: ContrastFit): ContrastFit {
  return { center: centerFrom.center, phi: dynamicsFrom.phi, loc: dynamicsFrom.loc, scale: dynamicsFrom.scale };
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };

/** Like fitContrast but using mean/SD instead of median/MAD — O(n) with NO sort, so it scales to a long
 *  (multi-million-tick) HEALTHY baseline where the median sorts dominate. On a healthy (outlier-free) feed
 *  mean ≈ median and SD ≈ 1.4826·MAD, so the fit is statistically equivalent; it uses the SAME whiten/φ so
 *  applyContrast stays consistent. Use ONLY on a known-healthy baseline (ADR 0022 long-1Hz-baseline path). */
export function fitContrastFast(d0: number[]): ContrastFit {
  const center = mean(d0);
  const dc = d0.map((x) => x - center);
  const { phi } = estimateAr1(dc);
  const w = dc.map((x, t) => whiten(x, t > 0 ? dc[t - 1] : null, phi));
  return { phi, loc: mean(w), scale: Math.max(sd(w), 1e-9), center };
}
