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
 *  the √E−1 SupFDR adjuster so it is a valid all-times e-value suitable for fleet e-BH.
 *
 *  SCOPE (2026-07-02 audit): the onset weights are uniform 1/T over the WHOLE horizon, so the value
 *  is horizon-DEPENDENT — re-scoring a growing prefix (T changing between looks) yields values from a
 *  DIFFERENT convex mixture each look, which are NOT prefixes of one e-process; acting at the first
 *  crossing across such looks is uncovered optional stopping. Use this for FIXED-window terminal
 *  analyses (one look, T known); use geometricMixtureEValue for the always-on loop. */
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

/** Geometric (Shiryaev) onset hazards for the horizon-independent mixture — a small Robbins-style
 *  grid so no single hazard scale is assumed: expected onsets ~64 / ~1k / ~16k ticks. Fixed BEFORE
 *  data; changing them invalidates cross-look comparability. */
const GEO_RHOS = [1 / 64, 1 / 1024, 1 / 16384];

/** GEOMETRIC onset-prior mixture e-value (2026-07-02 audit fix for the always-on loop).
 *
 *  Same SR-style onset mixture as normalizedMixtureEValue, but with FIXED, horizon-independent
 *  weights: onset j gets w_j = ρ(1−ρ)^{j−1} (summing to 1 over the INFINITE horizon; onsets not yet
 *  started contribute the constant-1 e-process, total tail weight (1−ρ)^t), uniformly mixed over the
 *  GEO_RHOS hazard grid. Recursion per hazard: S_t = g_t·(S_{t−1} + ρ(1−ρ)^{t−1});
 *  mix_t = mean_ρ(S_t + (1−ρ)^t). Each onset process is a supermartingale and the weights never
 *  change, so mix_t is ONE e-process — the value at a longer prefix is the SAME process read later,
 *  not a re-normalized cousin. Hence the adjusted running max returned here is (a) monotone
 *  nondecreasing in the prefix (accept-to-reject monotone selections across loop cycles) and (b) a
 *  valid e-value at ALL times including data-dependent ones (Carefree / arXiv:2501.19360 Thm 1), so
 *  the mode-b-loop's dispatch-at-first-crossing is theorem-covered (SupFDR ≤ q) — which the per-cycle
 *  re-normalized uniform mixture was not. Trade-off: early onsets carry more weight (better early
 *  detection); very late onsets in a very long window carry less than uniform-1/T would give. */
export function geometricMixtureEValue(r: ReadonlyArray<number>): number {
  if (r.length === 0) return 0;
  const K = GEO_RHOS.length;
  const S = new Array<number>(K).fill(0);      // Σ_{j≤t} w_j Λ^(j)_t per hazard
  const w = GEO_RHOS.map((rho) => rho);        // w_t = ρ(1−ρ)^{t−1}, updated each tick
  const tail = new Array<number>(K).fill(1);   // (1−ρ)^t — weight of not-yet-started onsets
  let mixPeak = 0;
  for (let t = 0; t < r.length; t++) {
    const g = gInc(r[t]);
    let mix = 0;
    for (let k = 0; k < K; k++) {
      S[k] = g * (S[k] + w[k]);
      if (!isFinite(S[k])) S[k] = Number.MAX_VALUE;
      w[k] *= 1 - GEO_RHOS[k];
      tail[k] *= 1 - GEO_RHOS[k];
      mix += S[k] + tail[k];
    }
    mix /= K;
    if (mix > mixPeak) mixPeak = mix;
  }
  return supAdjuster(mixPeak);
}
