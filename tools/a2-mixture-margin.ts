/**
 * a2-mixture-margin.ts — how much A2 margin does the SHIPPED geometric mixture actually buy?
 *
 * THE QUESTION. A2 says per-round conformal validity is exact but does not survive accumulation:
 * conditional on a unit's persistent state Δ the increments are i.i.d. with mean m(δ) = E[g|δ] > 1,
 * so E[M_T] = E_Δ[m(δ)^T] grows geometrically. `mode-b-loop` does not use the plain accumulator —
 * it uses `geometricMixtureEValue`, whose onset prior is horizon-INDEPENDENT. Does that prior bound
 * the accumulation, i.e. is the hazard grid ρ a design lever against A2?
 *
 * THE ANSWER: PARTLY, AND NOT BY THE MECHANISM ONE WOULD GUESS.
 *
 *   ✗ It is NOT a horizon cap. Unrolling the shipped recursion `S_t = g_t(S_{t−1} + w_t)` with
 *     `w_j = ρ(1−ρ)^{j−1}` gives `E[S_t | δ] = Σ_{i=1..t} ρ(1−ρ)^{t−i} m^i`. The LONGEST run (earliest
 *     onset, i = t) carries the LARGEST weight ρ — the geometric prior favours early onsets, as its
 *     own docstring says. So the leading term is ρ·m^t·m/(m−1+ρ), and as m → 1⁺ the ρ in the
 *     numerator cancels the (m−1+ρ) ≈ ρ in the denominator. The GROWTH RATE is m, exactly as for the
 *     plain product. Nothing is capped.
 *
 *   ✓ It IS a barrier-height lever, which is a different thing and matters below δ₀. Two effects
 *     raise the level `log M` must reach before paging: the weight `log ρ` (≈ −4.16 at the fastest
 *     hazard) and the √E−1 adjuster, which makes the crossing condition `mixPeak ≳ 1/α²` rather than
 *     `1/α` — i.e. it DOUBLES the barrier. In the negative-drift regime (δ < δ₀) first passage over a
 *     barrier L is ≈ e^{−κL}, so doubling L SQUARES the false-page probability: α^κ → ρ^κ·α^{2κ}.
 *     In the positive-drift regime (δ > δ₀) the walk crosses eventually whatever the barrier, so the
 *     mixture only DELAYS the page; it does not prevent it.
 *
 * CONSEQUENCE FOR DESIGN. ρ is not a substitute for the δ₀ contract. It buys a large margin exactly
 * where margin already existed (δ < δ₀) and none where it did not (δ > δ₀). δ₀ remains the boundary,
 * which is consistent with the identifiability result: above δ₀ a benign persistent offset and a
 * genuine fault are the same event.
 *
 * WHAT IS NOT MEASURED HERE, AND WHY. Not `E[M_T]`. The A2-E1b experiment established that Λ(T) is a
 * bound and NOT an estimable mean — it is dominated by tail mass at probabilities far below 1/N, so
 * a sample mean tracks the median path, not the mean, and reports "no growth" for a quantity that is
 * in fact growing geometrically. Measuring E[M_T] by Monte Carlo would produce a confidently wrong
 * answer here (it did, on the first attempt). The estimable, operationally meaningful quantity is the
 * first-passage / paging rate, which is what this module measures.
 */
import { geometricMixtureEValue, gInc } from './mixture-evalue.js';
import { mulberry32, gaussian } from './calibration-envelope.js';

/** Which accumulation path a unit's evidence flows through. */
export type A2Path = 'plain' | 'geometric';

/**
 * `m(δ) = E[gInc(δ + Z)]`, the conditional increment mean of the A2 drift identity — IN CLOSED FORM.
 *
 * `gInc` mixes `exp(λr − λ²/2)` over `λ ∈ {±0.5, ±1, ±2}`, and `E[exp(λ(δ+Z) − λ²/2)] = exp(λδ)`, so
 * the ± pairs combine into cosines-hyperbolic:
 *
 *     m(δ) = ( cosh(δ/2) + cosh(δ) + cosh(2δ) ) / 3
 *
 * Exact for the uncapped increment, hence `m(0) = 1` exactly — the per-round validity of A2(1) — and
 * `m(δ) > 1` strictly for δ ≠ 0, which is the whole of A2(3) without needing Jensen. The shipped
 * `gInc` clips at `G_CAP = 100`, so the true mean is slightly BELOW this: the closed form is a
 * conservative upper bound, which is the right direction for a safety argument.
 */
export function conditionalIncrementMean(delta: number): number {
  return (Math.cosh(delta / 2) + Math.cosh(delta) + Math.cosh(2 * delta)) / 3;
}

/** Peak of the plain multiplicative accumulator — the canary-sim-style path, no onset prior. */
export function plainAccumulatorPeak(residuals: ReadonlyArray<number>): number {
  let m = 1, peak = 0;
  for (const r of residuals) {
    m *= gInc(r);
    if (!Number.isFinite(m)) m = Number.MAX_VALUE;
    if (m > peak) peak = m;
  }
  return peak;
}

/**
 * Empirical per-unit paging rate `P(∃t ≤ T : M_t ≥ 1/α)` for a unit carrying a PERSISTENT offset
 * `delta` (in execution-noise SDs) under an otherwise exchangeable null.
 *
 * Deterministic in `seed`. The `geometric` path calls the SHIPPED `geometricMixtureEValue`, which
 * already applies its own running max and √E−1 adjuster — so the two paths are compared at the same
 * nominal threshold, which is exactly the operational comparison.
 */
export function pagingRate(
  delta: number, horizon: number, alpha: number, reps: number, seed: number, path: A2Path,
): number {
  const rng = mulberry32(seed);
  const thr = 1 / alpha;
  let fired = 0;
  for (let i = 0; i < reps; i++) {
    const res = new Array<number>(horizon);
    for (let t = 0; t < horizon; t++) res[t] = delta + gaussian(rng);
    const v = path === 'plain' ? plainAccumulatorPeak(res) : geometricMixtureEValue(res);
    if (v >= thr) fired++;
  }
  return fired / reps;
}

/** One cell of the margin table. */
export interface MarginCell {
  readonly delta: number;
  readonly horizon: number;
  readonly plain: number;
  readonly geometric: number;
  /** plain / geometric, or Infinity when the mixture never fired. */
  readonly attenuation: number;
}

/** δ₀ at θ = 0 — the Kelly break-even shift (research/2026-07-25-a2-delta0-derivation.md). */
export const DELTA_0 = 0.9128;

export const MARGIN_DELTAS = [0, 0.3, 0.6, 0.9, 1.2] as const;
export const MARGIN_HORIZONS = [100, 400] as const;

/** The committed table. Deterministic. */
export function marginTable(reps = 20000, alpha = 0.01, seed = 11): MarginCell[] {
  const out: MarginCell[] = [];
  for (const delta of MARGIN_DELTAS) {
    for (const horizon of MARGIN_HORIZONS) {
      const plain = pagingRate(delta, horizon, alpha, reps, seed, 'plain');
      const geometric = pagingRate(delta, horizon, alpha, reps, seed, 'geometric');
      out.push({ delta, horizon, plain, geometric, attenuation: geometric > 0 ? plain / geometric : Infinity });
    }
  }
  return out;
}

export function report(reps = 20000): string {
  const rows = marginTable(reps);
  const lines = [
    'A2 margin from the SHIPPED geometric mixture — per-unit paging rate, alpha = 0.01',
    `delta is in execution-noise SDs; delta_0 = ${DELTA_0} (Kelly break-even)`,
    '',
    'delta   m(delta)      T   plain      geometric   attenuation',
  ];
  for (const r of rows) {
    lines.push(
      `${r.delta.toFixed(2)}   ${conditionalIncrementMean(r.delta).toFixed(5)}   ${String(r.horizon).padStart(4)}` +
      `   ${r.plain.toFixed(5)}    ${r.geometric.toFixed(5)}     ` +
      (Number.isFinite(r.attenuation) ? `${r.attenuation.toFixed(1)}x` : 'never fired'),
    );
  }
  lines.push('', 'Attenuation collapses as delta -> delta_0: the mixture raises the BARRIER, it does',
    'not change the DRIFT. Above delta_0 the walk crosses eventually and the mixture only delays.');
  return lines.join('\n');
}

// CommonJS entry guard, matching tools/tail-probability.ts — this package emits CJS.
if (require.main === module) console.log(report());
