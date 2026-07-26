// tools/exchangeability-drift.ts — Conjecture A2, resolved: what persistent unit heterogeneity does
// to a conformal-rank e-process ACROSS ROUNDS.
//
// THE REFRAMING. A2 was posed as "approximate exchangeability ⇒ bounded e-value drift". That is the
// wrong question. Under the canary design with iid persistent offsets and freshly randomized peers,
// the round-t block IS exactly exchangeable and the randomized rank p is EXACTLY Unif[0,1]:
// `E[f(p_t)] = ∫₀¹f = 1` on the nose, at every θ (verified to 5 decimals below). Nothing is
// approximate per round.
//
// The failure is purely SERIAL. Write δ for a unit's persistent offset (in per-execution-noise
// units) and
//
//     g(δ) = E[ f(p) | δ ]           the conditional increment mean
//
// Then `E_δ[g(δ)] = 1` (that is the per-round validity), but the accumulator's null mean is
//
//     E[M_T] = E_δ[ g(δ)^T ]  =:  Λ(T)                                              (★)
//
// and by Jensen Λ(T) > 1 strictly for T ≥ 2 unless g is a.s. constant — i.e. unless θ = 0. The
// increments are marginally valid and conditionally invalid, and the product accumulates the gap.
// This is the same mechanism the program report measured at GROUP level (§ 3.1 item 3, ~4 false
// racks/run) and asserted benign at UNIT level; (★) is what makes the unit-level claim checkable.
//
// WHAT THIS BUYS. Λ(T) is the exact FDR inflation: by e-BH's scale invariance (N3,
// `e-BH(e/μ,q) ≡ e-BH(e,q/μ)`), feeding M_T to e-BH controls FDR ≤ q·Λ(T). So the guarantee is
// horizon-limited, with a computable horizon T* = max{T : Λ(T) ≤ tolerance}, and θ is an estimable
// fleet quantity (θ² /(1+θ²) is the intraclass correlation of healthy scores after block-keying).
//
// MODEL (a worked instance — (★) itself is model-free). Score Y = δ + Z, Z ~ N(0,1); peers freshly
// randomized each round with offsets ~ N(0,θ²), so a peer score ~ N(0,s²), s² = 1+θ²; one-sided
// high-is-bad rank against K peers exactly as canary-sim.ts does it:
// `p = (#{peers > y} + U·(1 + #ties))/(K+1)`, which is exactly uniform under exchangeability.
//
// Run: `pnpm build && node tools/exchangeability-drift.js [--json out.json]`
// Report: research/2026-07-25-conjecture-a2-resolution.md

const KAPPAS = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8];

/** Chebyshev erfc (Numerical Recipes `erfccheb`) — full double accuracy, needed because the far tail
 *  of the rank map is where the calibrator's κ_min arm lives. */
function erfc(x: number): number {
  const z = Math.abs(x), t = 2 / (2 + z), ty = 4 * t - 2;
  const cof = [-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9, -9.91364156e-10,
    -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15];
  let d = 0, dd = 0;
  for (let j = cof.length - 1; j > 0; j--) { const tmp = d; d = ty * d - dd + cof[j]; dd = tmp; }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}
export const Phi = (x: number): number => 0.5 * erfc(-x / Math.SQRT2);

/** The p→e mixture calibrator restricted to arms κ ≥ kappaMin. */
export function calibratorWith(kappaMin: number): (p: number) => number {
  const ks = KAPPAS.filter((k) => k >= kappaMin - 1e-12);
  return (p: number) => { let s = 0; for (const k of ks) s += k * Math.pow(p, k - 1); return s / ks.length; };
}

// The W-grid. Truncated at ±34 because Φ(−34) ≈ 1e-253 is the last point where p is representable
// and p^{κ−1} does not overflow; beyond it a naive grid silently yields f(0) = ∞ (this bit once).
const LO = -34, HI = 34, NW = 13600, HW = (HI - LO) / NW;
const WGRID = (() => { const w = new Float64Array(NW); for (let i = 0; i < NW; i++) w[i] = LO + (i + 0.5) * HW; return w; })();

/** `E_U[f((r+U)/(K+1))] = (K+1)·mean_κ[((r+1)c)^κ − (rc)^κ]`, c = 1/(K+1): the exact conditional
 *  increment mean given rank position r, integrating out the tie/jitter randomisation. */
export function rankCellMeans(K: number, kappaMin = 0.05): Float64Array {
  const c = 1 / (K + 1);
  const ks = KAPPAS.filter((k) => k >= kappaMin - 1e-12);
  const out = new Float64Array(K + 1);
  for (let r = 0; r <= K; r++) {
    // ∫ over the cell, analytically per arm: ∫κx^{κ−1}dx = x^κ.
    let s = 0;
    for (const k of ks) s += Math.pow((r + 1) * c, k) - Math.pow(r * c, k);
    out[r] = ((K + 1) * s) / ks.length;
  }
  return out;
}

/** `h(π) = Σ_r Bin(K,π)_r · cellMean_r` — the conditional increment mean given the peer-exceedance
 *  probability π. Bounded above by cellMean_0 = g_max(K): a finite block CAPS the conditional mean,
 *  which is what keeps Λ finite. */
function hOfPi(K: number, cell: Float64Array): (pi: number) => number {
  return (pi: number) => {
    if (pi <= 0) return cell[0];
    if (pi >= 1) return cell[K];
    let term = Math.pow(1 - pi, K), acc = term * cell[0];
    for (let r = 1; r <= K; r++) {
      term *= ((K - r + 1) / r) * (pi / (1 - pi));
      if (!Number.isFinite(term)) break;
      acc += term * cell[r];
    }
    return acc;
  };
}

/** The largest value the conditional increment mean can take in a block of K peers. */
export function gMax(K: number): number {
  let s = 0;
  for (const k of KAPPAS) s += Math.pow(1 / (K + 1), k);
  return (K + 1) * s / KAPPAS.length;
}

export interface GCurve { readonly deltas: number[]; readonly g: number[]; readonly theta: number; readonly step: number }

/** Tabulate g(δ) = E_Z[f(p)|δ] over a δ-grid. `K = Infinity` uses the continuous (large-block) limit. */
export function gCurve(theta: number, K: number, kappaMin = 0.05, span = 14, M = 1400): GCurve {
  const s = Math.sqrt(1 + theta * theta);
  const f = calibratorWith(kappaMin);
  const FW = new Float64Array(NW);
  if (K === Infinity) {
    for (let i = 0; i < NW; i++) FW[i] = f(Phi(-WGRID[i]));
  } else {
    const h = hOfPi(K, rankCellMeans(K, kappaMin));
    for (let i = 0; i < NW; i++) FW[i] = h(Phi(-WGRID[i]));
  }
  const deltas: number[] = [], g: number[] = [];
  const n = theta > 0 ? M : 1, step = theta > 0 ? (2 * span * theta) / M : 1;
  for (let j = 0; j < n; j++) {
    const d = theta > 0 ? -span * theta + (j + 0.5) * step : 0;
    let a = 0;
    for (let i = 0; i < NW; i++) { const u = s * WGRID[i] - d; a += FW[i] * Math.exp(-(u * u) / 2); }
    deltas.push(d); g.push((a * s * HW) / Math.sqrt(2 * Math.PI));
  }
  return { deltas, g, theta, step };
}

/** Λ(T) = E_δ[g(δ)^T] — the accumulator's null mean after T rounds, and the exact FDR inflation
 *  factor (FDR ≤ q·Λ(T)). Returns `Infinity` when the δ-tail integral diverges. */
export function lambda(c: GCurve, T: number): number {
  if (c.theta === 0) return Math.pow(c.g[0], T);
  let a = 0;
  for (let j = 0; j < c.g.length; j++) {
    const d = c.deltas[j];
    a += (Math.exp(T * Math.log(c.g[j]) - (d * d) / (2 * c.theta * c.theta)) / (c.theta * Math.sqrt(2 * Math.PI))) * c.step;
  }
  return a;
}

/** The validity horizon: the largest T for which the null mean stays within `tol`. */
export function validityHorizon(c: GCurve, tol = 2, cap = 5000): number {
  let T = 0;
  for (let t = 1; t <= cap; t++) { const L = lambda(c, t); if (!Number.isFinite(L) || L > tol) break; T = t; }
  return T;
}

/**
 * Closed-form divergence threshold in the CONTINUOUS (large-block) limit with Gaussian δ.
 *
 * For large δ the calibrator's smallest arm dominates: log g(δ) ~ aδ²/(2(1−a)) with
 * a = (1−κ_min)/(1+θ²). Against the N(0,θ²) prior on δ, E[g^T] diverges once T·a/(1−a) ≥ 1/θ²:
 *
 *     T_div = κ_min/((1−κ_min)·θ²) + 1/(1−κ_min)
 *
 * so the horizon scales as κ_min/θ². Both are design parameters. A finite block removes the
 * divergence entirely (h is capped by gMax(K)), leaving exponential growth — see gMax.
 */
export function divergenceThreshold(theta: number, kappaMin = 0.05): number {
  if (theta === 0) return Infinity;
  return kappaMin / ((1 - kappaMin) * theta * theta) + 1 / (1 - kappaMin);
}

/** First-order tilt A = ∫f(p)·Φ⁻¹(1−p)dp. For small θ, log g(δ) ≈ Aδ, so Λ(T) ≈ exp(A²θ²T²/2) —
 *  QUADRATIC in T in the exponent — giving T* ≈ √(2ln tol)/(Aθ). Note T* ∝ 1/θ, not 1/θ². */
export function tiltCoefficient(kappaMin = 0.05): number {
  const f = calibratorWith(kappaMin);
  let a = 0;
  for (let i = 0; i < NW; i++) {
    const w = WGRID[i];
    a += f(Phi(-w)) * w * (Math.exp(-(w * w) / 2) / Math.sqrt(2 * Math.PI)) * HW;
  }
  return a;
}

/** Intraclass correlation of healthy scores implied by θ — the estimable form of the same quantity. */
export const iccOf = (theta: number): number => (theta * theta) / (1 + theta * theta);
export const thetaOfIcc = (icc: number): number => Math.sqrt(icc / (1 - icc));

// ─────────────────────────────────────────────────────────────────────────────

export function report(): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  const THETAS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3];
  const A = tiltCoefficient();
  L.push('Conjecture A2 — persistent heterogeneity vs the conformal-rank e-process');
  L.push('');
  L.push(`first-order tilt A = ${A.toFixed(4)};  small-θ law  Λ(T) ≈ exp(A²θ²T²/2);  T* ≈ √(2ln2)/(Aθ) = ${(Math.sqrt(2 * Math.LN2) / A).toFixed(3)}/θ`);
  L.push('');
  L.push('θ      ICC       Λ(1)     T_div(κmin=.05)  T*(K=30)  T*(K=100)  T*(K=∞)');
  const rows: Record<string, unknown>[] = [];
  for (const th of THETAS) {
    const c30 = gCurve(th, 30), c100 = gCurve(th, 100), cInf = gCurve(th, Infinity);
    const row = {
      theta: th, icc: iccOf(th), lambda1: lambda(cInf, 1), tDiv: divergenceThreshold(th),
      tStar30: validityHorizon(c30), tStar100: validityHorizon(c100), tStarInf: validityHorizon(cInf),
    };
    rows.push(row);
    L.push(`${String(th).padEnd(6)} ${(row.icc * 100).toFixed(2).padStart(5)}%   ${row.lambda1.toFixed(4)}   ` +
      `${row.tDiv.toFixed(1).padStart(9)}        ${String(row.tStar30).padStart(4)}      ${String(row.tStar100).padStart(4)}       ${String(row.tStarInf).padStart(4)}`);
  }
  L.push('');
  L.push('Λ(1) = 1 at every θ — per-round validity is EXACT. The horizon is entirely an accumulation effect.');
  L.push('');
  L.push('κ_min lever (θ=0.1, K=∞):   κ_min   T_div    T*');
  const kappaRows: Record<string, unknown>[] = [];
  for (const km of [0.05, 0.1, 0.2, 0.3, 0.4]) {
    const c = gCurve(0.1, Infinity, km);
    const r = { kappaMin: km, tDiv: divergenceThreshold(0.1, km), tStar: validityHorizon(c) };
    kappaRows.push(r);
    L.push(`                            ${String(km).padEnd(7)} ${r.tDiv.toFixed(1).padStart(5)}   ${String(r.tStar).padStart(4)}`);
  }
  L.push('');
  L.push('block-size cap g_max(K) (a finite block bounds the conditional increment mean):');
  const caps = [10, 30, 100, 300, 1000].map((K) => ({ K, gMax: gMax(K) }));
  L.push('  ' + caps.map((c) => `K=${c.K}: ${c.gMax.toFixed(1)}`).join('   '));
  return { lines: L, data: { tiltA: A, rows, kappaRows, caps } };
}

if (require.main === module) {
  const { lines, data } = report();
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
}
