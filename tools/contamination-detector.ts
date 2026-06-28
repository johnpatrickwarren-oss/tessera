// tools/contamination-detector.ts — control-twin validity RESEARCH ARTIFACT (ADR 0021). NOT wired into the
// Mode B gate: rigorous validation found it INSUFFICIENT to restore the FDR guarantee (see ADR 0021). Kept
// as the validated κ machinery + a building block for the control-triad construction (ADR 0021 § Follow-ups).
//
// Mode B's spatial null (ADR 0019) assumes each treatment↔control pair is a MATCHED twin: same common-mode
// loadings, so the contrast d = treatment − control cancels the common-mode and a per-shard fault survives.
// Two ways that breaks — NON-COMPARABILITY (loadings diverge → residual common-mode leaks → false positives)
// and CONTAMINATION (a fault reaches the control twin) — and the residual monitors (ADR 0020) can't see
// either, because they operate on the standardized contrast AFTER the damage. This module explored gating
// on the raw pre-contrast pairing. Both halves failed to deliver:
//
//   • NON-COMPARABILITY via the CANCELLATION RATIO κ_i = Var(t_i − c_i) / ((Var(t_i)+Var(c_i))/2). A matched
//     twin cancels → κ ≈ 0.005; a decorrelated twin → κ ≈ 0.2–0.4. BUT κ-thresholding does NOT restore FDR:
//     the harm is a SUSTAINED SHIFT (un-cancelled non-stationary regime/ramp), which a pair can leak with
//     LOW κ — so the false positives come from low-κ pairs that survive any threshold (decorr FDP 0.25 → ~0.20,
//     still > q, while clean weak-common-mode pairs are over-excluded). κ measures VARIANCE leak, not the
//     shift that actually fires e-BH. Non-comparability re-introduces the temporal-null wall (the residual
//     common-mode differs across windows), which is precisely what the matched twin existed to avoid.
//   • CONTAMINATION is not detectable by twin-pair statistics at all: a SHARED fault cancels in the contrast
//     (κ stays small — the structural blind spot, = fleet-wide common-mode by design); a CONTROL-ONLY fault
//     fires the contrast but it is SIGN-BLIND, and the only external reference (the control cohort) inherits
//     the heterogeneous-loading wall (ADR 0012/0015) — control_i − cohort-center is dominated by per-shard
//     loading structure, so the fault is buried (contaminated vs clean residual-std distributions overlap).
//
// The clean fix for BOTH is a CONTROL TRIAD: two independent control twins per treatment give a matched
// control-vs-control null — a clean per-control reference (no cohort heterogeneity) for contamination, and
// a direct comparability check. That is a separate, larger construction (ADR 0021 § Follow-ups / ADR 0022
// candidate). The κ functions below are correct and unit-tested; they just are not a sufficient gate alone.
// Tessera-original.

import { median } from './contrast.js';

const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs: number[]): number => { const m = mean(xs); return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length; };

/** The cancellation ratio κ of a treatment↔control pair on a healthy feed: contrast variance relative to
 *  the members' average variance. ≈0 for a matched twin (common-mode cancels); large when loadings diverge. */
export function cancellationRatio(treatment: number[], control: number[]): number {
  const d = treatment.map((x, i) => x - control[i]);
  const denom = (variance(treatment) + variance(control)) / 2;
  return denom > 0 ? variance(d) / denom : 0;
}

export interface TwinComparabilityOptions {
  /** Absolute κ below which a pair is always comparable (its residual leak is small regardless). Default 0.1
   *  — a matched twin cancels ≥ ~90% of variance; below this the leak cannot cause meaningful false fires. */
  absFloor?: number;
  /** Cohort multiple: a pair is suspect only if κ also exceeds relMult × the cohort-median κ — so a counter
   *  whose whole cohort cancels poorly (genuinely weak common-mode) is not over-excluded. Default 6. */
  relMult?: number;
}

export interface TwinVerdict {
  shard: string;
  kappa: number;
  /** false ⇒ non-comparable (loadings diverge) → exclude this pair from the contrast detection set. */
  comparable: boolean;
}

export interface TwinComparabilityResult {
  verdicts: TwinVerdict[];
  cohortMedianKappa: number;
  threshold: number;
  excluded: number;
}

/** Per-counter non-comparability verdicts over a cohort of healthy treatment↔control pairs. A pair is
 *  flagged non-comparable when κ_i > max(absFloor, relMult × cohort-median κ) — an outlier that is also
 *  absolutely large. Run on the HEALTHY/baseline feed (comparability is structural; a fault in the
 *  monitoring window must NOT be read as non-comparability — see ADR 0021). */
export function twinComparability(
  pairs: ReadonlyArray<{ shard: string; treatment: number[]; control: number[] }>,
  opts: TwinComparabilityOptions = {},
): TwinComparabilityResult {
  return twinComparabilityFromKappas(pairs.map((p) => ({ shard: p.shard, kappa: cancellationRatio(p.treatment, p.control) })), opts);
}

/** As twinComparability, from PRECOMPUTED per-pair κ — the streaming Mode B path computes κ in the worker
 *  (where the rows live) and reduces the verdicts here, where the whole counter's cohort is available. */
export function twinComparabilityFromKappas(
  items: ReadonlyArray<{ shard: string; kappa: number }>,
  opts: TwinComparabilityOptions = {},
): TwinComparabilityResult {
  const absFloor = opts.absFloor ?? (process.env.TWIN_ABS_FLOOR ? Number(process.env.TWIN_ABS_FLOOR) : 0.1);
  const relMult = opts.relMult ?? (process.env.TWIN_REL_MULT ? Number(process.env.TWIN_REL_MULT) : 6);
  if (!items.length) return { verdicts: [], cohortMedianKappa: 0, threshold: absFloor, excluded: 0 };
  // robust cohort floor: the 25th percentile reflects the MATCHED-twin cancellation even when a large
  // fraction of the cohort is non-comparable (the median would be pulled up and let leakers through).
  const sorted = items.map((it) => it.kappa).slice().sort((a, b) => a - b);
  const cohortMedianKappa = sorted[Math.floor(0.25 * sorted.length)];
  const threshold = Math.max(absFloor, relMult * cohortMedianKappa);
  const verdicts = items.map((it) => ({ shard: it.shard, kappa: it.kappa, comparable: it.kappa <= threshold }));
  return { verdicts, cohortMedianKappa, threshold, excluded: verdicts.filter((v) => !v.comparable).length };
}

/** The set of comparable shard ids (convenience for the gate's pair filter). */
export function comparableShards(result: TwinComparabilityResult): Set<string> {
  return new Set(result.verdicts.filter((v) => v.comparable).map((v) => v.shard));
}
