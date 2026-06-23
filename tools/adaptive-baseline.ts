// tools/adaptive-baseline.ts — regime-aware (trailing-window) baseline replay,
// shared by mit-replay (FP-at-scale) and adaptive-tradeoff (the masking study).
//
// Recompute the betting-e-process baseline (mean, σ², φ) from a TRAILING window
// every `recalEvery` ticks, so it tracks regime shifts. Restart-on-fire. No
// lookahead (the current tick is scored with the prior cal; the slice ends at i).
//
// PROTOTYPE — not promoted to the engine/production detector. Its drift-masking
// tradeoff (a rolling baseline can absorb a slow ramp = the anomaly) is exactly
// what tools/adaptive-tradeoff.ts measures. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { calibrateBaseline, type Baseline } from './shadow-replay.js';

export const ADAPT_WINDOW = 500;
export const ADAPT_RECAL_EVERY = 100;

export interface AdaptOpts { window?: number; recalEvery?: number; }

/** Replay with a trailing-window-recalibrated baseline; returns fire indices. */
export function replayFiresAdaptive(
  values: ReadonlyArray<number>, probEnd: number, alpha: number, opts: AdaptOpts = {},
): number[] {
  const window = opts.window ?? ADAPT_WINDOW;
  const recalEvery = opts.recalEvery ?? ADAPT_RECAL_EVERY;
  let cal: Baseline = calibrateBaseline(values.slice(0, probEnd), 'simple');
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const fires: number[] = [];
  for (let i = probEnd; i < values.length; i++) {
    updateBettingState(state, values[i], cal.mean, cal.innovationVar, alpha, cal.phi);
    if (state.M >= threshold) { fires.push(i); state = freshBettingState(); }
    if ((i - probEnd) % recalEvery === 0 && i > probEnd) {
      // Trailing window (growing prefix while i <= window; strictly trailing after).
      // No lookahead: slice ends at i, current tick already scored with prior cal.
      cal = calibrateBaseline(values.slice(Math.max(0, i - window), i), 'simple');
    }
  }
  return fires;
}
