// tools/mixture-evalue.ts — the default per-shard e-VALUE object for fleet e-BH (ADR 0019).
//
// WHY THIS EXISTS. The e-detector's running statistic M^SR_t = Σ_{j≤t} Λ^(j)_t is a SUM of t
// per-onset e-processes, so E[M^SR_t | H0] ≈ t — it is NOT an e-value (E ≤ 1), and feeding its
// running max to e-BH over-selects (measured FDP 0.5–0.7; the √E−1 SupFDR adjuster cannot rescue
// it because the adjuster assumes a genuine e-process). The fix is a CONVEX onset mixture (weights
// summing to 1, i.e. normalise by T): a convex combination of e-processes IS an e-process
// (E[·|H0] ≤ 1), so its running max → √E−1 adjuster → a valid all-times e-value for e-BH.
//
// Increment: Gaussian-LR mixture g(r) = mean_λ exp(λr − λ²/2) over λ ∈ ±{0.5,1,2}; each term is an
// e-value under N(0,1), the uniform mixture preserves E ≤ 1, and a per-tick cap keeps it bounded
// (E[min(g,cap)] ≤ E[g] ≤ 1 — conservative, and makes the empirical mean auditable). The residual
// fed in is the baseline-standardised per-shard residual (≈ N(0,1) under a valid conditional null).
//
// Validity is by CONSTRUCTION on a valid null; it does NOT certify that the residual's null holds
// (that is the emitter contract's job — ADR 0019, validity_class). Tessera-original.

import { supAdjuster } from './supfdr.js';

const LAMBDAS = [0.5, 1, 2, -0.5, -1, -2];
const G_CAP = 100; // bound the per-tick increment: E[min(g,cap)] ≤ E[g] = 1 (conservative)

/** Gaussian-LR mixture increment, capped. E[g | N(0,1)] ≤ 1 by construction. */
export function gInc(r: number): number {
  let s = 0;
  for (const lam of LAMBDAS) s += Math.exp(lam * r - 0.5 * lam * lam);
  return Math.min(G_CAP, s / LAMBDAS.length);
}

/** The normalized convex onset-mixture e-value for a standardized residual series: the running max
 *  of mixE_t = (M^SR_t + (T−1−t)) / T (a convex combination of e-processes, E ≤ 1), passed through
 *  the √E−1 SupFDR adjuster so it is a valid all-times e-value suitable for fleet e-BH. */
export function normalizedMixtureEValue(r: ReadonlyArray<number>): number {
  const T = r.length;
  if (T === 0) return 0;
  let M = 0, mixPeak = 0;
  for (let t = 0; t < T; t++) {
    M = (1 + M) * gInc(r[t]);
    if (!isFinite(M)) M = Number.MAX_VALUE;
    const mix = (M + (T - 1 - t)) / T; // convex onset-mixture e-process value at t
    if (mix > mixPeak) mixPeak = mix;
  }
  return supAdjuster(mixPeak);
}
