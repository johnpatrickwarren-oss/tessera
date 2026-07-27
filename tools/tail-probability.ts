// tools/tail-probability.ts — A2-tail: the REALISED anytime false-page rate, computed directly
// instead of bounded by α·Λ(T).
//
// WHY. `research/2026-07-25-a2-e1b-horizon-experiment.md` § 2 showed that Λ(T) = E_δ[g(δ)^T] is a
// hopelessly loose bound: it predicted 10⁶ where the measured degradation was 3.3×. Λ is dominated
// by δ-tail mass at probabilities far below 1/N, so it describes a fleet nobody has. The quantity
// the product actually needs is the crossing probability itself.
//
// THE OBJECT. Conditional on a unit's persistent offset δ, the calibrated increments are i.i.d., so
// `log M_t` is a RANDOM WALK with drift μ(δ) = E[log f(p)|δ] and variance σ²(δ) = Var(log f(p)|δ).
// Paging at `e ≥ 1/α` is the walk crossing the level b = log(1/α). This is a first-passage problem,
// and it behaves completely differently from the mean:
//
//   • μ(δ) < 0 (the typical unit — this is the fixed-split dilution, E[log f(U)] < 0): the walk
//     drifts AWAY from the threshold and crossing is exponentially unlikely.
//   • μ(δ) > 0: the walk drifts toward it and crossing becomes near-certain once T ≥ b/μ(δ).
//
// So the fleet rate is driven by the fraction of units whose drift has turned positive — a bounded,
// estimable quantity — not by an unbounded moment. That is the whole reason the realised rate
// degrades gracefully while the bound explodes.
//
// THE LUNDBERG EXPONENT gives the clean asymptotic statement. Let κ(δ) > 0 solve
//     E[f(p)^κ | δ] = 1.
// Since Φ_δ(κ) = E[f^κ|δ] is convex with Φ_δ(0) = 1 and Φ_δ(1) = g(δ):
//     g(δ) < 1  ⇒  κ > 1  ⇒  P(page) ≈ α^κ  <  α      (conservative — most units)
//     g(δ) = 1  ⇒  κ = 1  ⇒  P(page) ≈ α               (Ville is tight exactly here)
//     g(δ) > 1  ⇒  κ < 1  ⇒  P(page) ≈ α^κ  >  α       (inflated, but BOUNDED BY 1)
//
// `α^κ ≤ 1` is the entire difference from `α·Λ`, which is unbounded. The per-unit page probability
// can never exceed 1 no matter how heterogeneous the fleet; the bound forgot that.
//
// FINITE T uses the Bachelier–Lévy first-passage formula for a drifting Brownian motion, which is
// the diffusion approximation to the walk:
//     P(max_{t≤T} S_t ≥ b) = Φ((μT−b)/(σ√T)) + e^{2μb/σ²}·Φ((−μT−b)/(σ√T))
//
// Run: `pnpm build && node tools/tail-probability.js [--json out.json]`

import { Phi, calibratorWith, rankCellMeans, gCurve, lambda } from './exchangeability-drift.js';

const LO = -22, HI = 22, NW = 8800, HW = (HI - LO) / NW;
const WG = (() => { const w = new Float64Array(NW); for (let i = 0; i < NW; i++) w[i] = LO + (i + 0.5) * HW; return w; })();

/** Per-rank-cell moments of `log f`, integrating out the tie/jitter draw U analytically-in-spirit
 *  (fine quadrature; the cell is bounded so this is easy). */
export function logCellMoments(K: number, kappaMin: number): { m1: Float64Array; m2: Float64Array; mk: (k: number) => Float64Array } {
  const c = 1 / (K + 1), f = calibratorWith(kappaMin), NU = 400;
  const m1 = new Float64Array(K + 1), m2 = new Float64Array(K + 1);
  for (let r = 0; r <= K; r++) {
    let a = 0, b = 0;
    for (let i = 0; i < NU; i++) {
      const lf = Math.log(f((r + (i + 0.5) / NU) * c));
      a += lf; b += lf * lf;
    }
    m1[r] = a / NU; m2[r] = b / NU;
  }
  /** E_U[f^κ] per cell — for the Lundberg root. */
  const mk = (kap: number): Float64Array => {
    const out = new Float64Array(K + 1);
    for (let r = 0; r <= K; r++) {
      let a = 0;
      for (let i = 0; i < NU; i++) a += Math.pow(f((r + (i + 0.5) / NU) * c), kap);
      out[r] = a / NU;
    }
    return out;
  };
  return { m1, m2, mk };
}

/** Binomial mixing weights: E over R ~ Bin(K, π) of a per-cell quantity. */
export function mixBinom(K: number, pi: number, cell: Float64Array): number {
  if (pi <= 0) return cell[0];
  if (pi >= 1) return cell[K];
  let term = Math.pow(1 - pi, K), acc = term * cell[0];
  for (let r = 1; r <= K; r++) {
    term *= ((K - r + 1) / r) * (pi / (1 - pi));
    if (!Number.isFinite(term)) break;
    acc += term * cell[r];
  }
  return acc;
}

/** E_Z[ cellQuantity ] at offset δ — the Z-integral in the W parametrisation. */
function overZ(theta: number, delta: number, K: number, cell: Float64Array): number {
  const s = Math.sqrt(1 + theta * theta);
  let a = 0;
  for (let i = 0; i < NW; i++) {
    const u = s * WG[i] - delta;
    a += mixBinom(K, Phi(-WG[i]), cell) * Math.exp(-(u * u) / 2);
  }
  return (a * s * HW) / Math.sqrt(2 * Math.PI);
}

export interface DriftAt { mu: number; sigma2: number }

/** Drift and volatility of `log M_t` per round, conditional on δ. */
export function driftAt(theta: number, delta: number, K: number, kappaMin = 0.05): DriftAt {
  const { m1, m2 } = logCellMoments(K, kappaMin);
  const mu = overZ(theta, delta, K, m1);
  const sq = overZ(theta, delta, K, m2);
  return { mu, sigma2: Math.max(1e-12, sq - mu * mu) };
}

/** The Lundberg exponent κ(δ): the positive root of E[f(p)^κ|δ] = 1. Returns `Infinity` if the
 *  increment can never reach mean 1 at any κ > 0 (no crossing risk at all). */
export function lundbergKappa(theta: number, delta: number, K: number, kappaMin = 0.05): number {
  const { mk } = logCellMoments(K, kappaMin);
  const phi = (kap: number): number => overZ(theta, delta, K, mk(kap));
  let lo = 1e-4, hi = 1;
  if (phi(hi) < 1) { while (phi(hi) < 1 && hi < 64) hi *= 2; if (phi(hi) < 1) return Infinity; }
  else { while (phi(lo) > 1 && lo > 1e-6) lo /= 2; }
  for (let i = 0; i < 60; i++) { const mid = 0.5 * (lo + hi); if (phi(mid) < 1) lo = mid; else hi = mid; }
  return 0.5 * (lo + hi);
}

/** Bachelier–Lévy first passage: P(max_{t≤T} S_t ≥ b) for a BM with per-round drift μ, variance σ². */
export function crossProb(mu: number, sigma2: number, b: number, T: number): number {
  if (b <= 0) return 1;
  const sig = Math.sqrt(sigma2 * T);
  if (sig <= 0) return mu * T >= b ? 1 : 0;
  const t1 = Phi((mu * T - b) / sig);
  const expo = (2 * mu * b) / sigma2;
  const lt2 = Math.log(Math.max(Phi((-mu * T - b) / sig), 1e-300));
  const t2 = Math.exp(Math.min(700, expo + lt2));
  return Math.min(1, Math.max(0, t1 + t2));
}

/**
 * δ₀, the DRIFT-REVERSAL OFFSET: the persistent offset at which `μ(δ)` changes sign. Below it a
 * unit's log-accumulator drifts away from the paging threshold and it is safe at any horizon; above
 * it the unit will eventually page with probability → 1.
 *
 * This — not Λ, and not the predicted rate — is the right thing to design against. The fleet rate is
 * ≈ N·P(δ ≥ δ₀), a GAUSSIAN TAIL, so a 20% error in δ₀ moves the rate by ~3×. δ₀ itself is stable.
 */
export function driftReversalDelta(theta: number, K: number, kappaMin = 0.05): number {
  if (driftAt(theta, 0, K, kappaMin).mu > 0) return 0;
  let lo = 0, hi = 1;
  while (driftAt(theta, hi, K, kappaMin).mu < 0 && hi < 64) hi *= 2;
  if (driftAt(theta, hi, K, kappaMin).mu < 0) return Infinity;
  for (let i = 0; i < 40; i++) { const mid = 0.5 * (lo + hi); if (driftAt(theta, mid, K, kappaMin).mu < 0) lo = mid; else hi = mid; }
  return 0.5 * (lo + hi);
}

/** δ₀ at θ = 0, in execution-noise SDs. Measured 0.9128 for the shipped κ-grid at K = 30. */
export const A0 = 0.9128;

/**
 * Closed form for δ₀(θ), derived in `research/2026-07-25-a2-delta0-derivation.md`.
 *
 * `ψ(w) = log f(Φ(−w))` is asymptotically quadratic — `ψ(w) ~ (1−κ_min)w²/2`, because the
 * calibrator's smallest arm makes `log f ≈ (κ_min−1)·log p` and `log p ≈ −w²/2`. Writing
 * `W = (δ+Z)/s ~ N(δ/s, 1/s²)`, `s² = 1+θ²`, and modelling ψ as `β(w² − R²)/2` gives
 * `μ(δ) = 0  ⇔  (δ/s)² + 1/s² = R²`, and eliminating R at θ = 0 leaves
 *
 *     δ₀(θ) = √( a₀² + (1 + a₀²)·θ² )
 *
 * Accurate to 0.6% at θ = 0.12, 2.6% at 0.25, 6.3% at 0.42 against the numerically-solved δ₀ (the
 * error is the quadratic model, which overstates ψ near the origin).
 */
export function driftReversalClosedForm(theta: number, a0 = A0): number {
  return Math.sqrt(a0 * a0 + (1 + a0 * a0) * theta * theta);
}

export interface PageRate { T: number; perUnit: number; expectedPages: number; villeBudget: number; boundPages: number }

/**
 * Expected false pages per run = N · E_δ[ P(cross b by T | δ) ], versus the α·Λ(T) bound.
 * `deltaSpan` in units of θ; the δ-integral is now over a BOUNDED integrand (probabilities), which
 * is exactly why it converges where the Λ integral did not.
 */
export function fleetPageRate(
  theta: number, K: number, N: number, alpha: number, horizons: number[], kappaMin = 0.05, span = 8, M = 240,
): PageRate[] {
  // Barrier corrections, both raising the effective level:
  //  • the shipped accumulator is ½·product + ½·mixture, so the product must reach 2/α, not 1/α;
  //  • DISCRETE monitoring — the walk is only observed at round boundaries, whereas Bachelier–Lévy
  //    describes a continuous path that can cross between observations. Broadie–Glasserman–Kou:
  //    shift the barrier by 0.5826·σ per step.
  const b = Math.log(2 / alpha);
  const nodes: { w: number; d: DriftAt }[] = [];
  if (theta <= 1e-9) {
    nodes.push({ w: 1, d: driftAt(0, 0, K, kappaMin) });
  } else {
    const h = (2 * span * theta) / M;
    for (let j = 0; j < M; j++) {
      const d = -span * theta + (j + 0.5) * h;
      const w = (Math.exp(-(d * d) / (2 * theta * theta)) / (theta * Math.sqrt(2 * Math.PI))) * h;
      nodes.push({ w, d: driftAt(theta, d, K, kappaMin) });
    }
  }
  const curve = theta > 0.05 ? gCurve(theta, K) : null;
  return horizons.map((T) => {
    let p = 0;
    for (const n of nodes) p += n.w * crossProb(n.d.mu, n.d.sigma2, b + 0.5826 * Math.sqrt(n.d.sigma2), T);
    const bound = curve ? alpha * lambda(curve, T) : alpha;
    return { T, perUnit: p, expectedPages: N * p, villeBudget: N * alpha, boundPages: N * Math.min(1, bound) };
  });
}

export function report(): { lines: string[]; data: unknown } {
  const L: string[] = [];
  const K = 30, N = 2016, alpha = 0.001, H = [10, 40, 80, 160, 320];
  // θ values as measured in research/2026-07-25-theta-tau-measurement.md (H1 control, H12, H2)
  const cases = [{ n: 'H1 (θ≈0)', th: 0.0 }, { n: 'H12', th: 0.120 }, { n: 'H2', th: 0.419 }];
  L.push('A2-tail — realised anytime false-page rate vs the α·Λ(T) bound');
  L.push(`N=${N}, K=${K}, α=${alpha}, Ville budget = N·α = ${(N * alpha).toFixed(2)} pages/run`);
  L.push('');
  const data: unknown[] = [];
  for (const c of cases) {
    const rows = fleetPageRate(c.th, K, N, alpha, H);
    const kap = c.th > 0 ? lundbergKappa(c.th, 2 * c.th, K) : lundbergKappa(0, 0, K);
    const d0 = driftReversalDelta(c.th, K);
    const tailFrac = c.th > 0 && Number.isFinite(d0) ? 1 - Phi(d0 / c.th) : 0;
    data.push({ scenario: c.n, theta: c.th, kappaAt2Theta: kap, delta0: d0, tailFrac, rows });
    L.push(`── ${c.n}   θ=${c.th}   κ(2θ)=${Number.isFinite(kap) ? kap.toFixed(2) : '∞'}   ` +
      `δ₀=${Number.isFinite(d0) ? d0.toFixed(3) : '∞'} (${Number.isFinite(d0) && c.th > 0 ? (d0 / c.th).toFixed(2) : '∞'}θ)  ` +
      `⇒ P(δ≥δ₀)=${(tailFrac * 100).toFixed(3)}% ⇒ ${(tailFrac * N).toFixed(1)} units at risk`);
    L.push('   T    predicted pages/run    α·Λ(T) bound pages    ratio bound/predicted');
    for (const r of rows) {
      const ratio = r.expectedPages > 1e-9 ? r.boundPages / r.expectedPages : Infinity;
      L.push(`${String(r.T).padStart(4)}    ${r.expectedPages.toFixed(2).padStart(17)}    ${r.boundPages.toFixed(1).padStart(18)}    ${Number.isFinite(ratio) ? ratio.toFixed(0).padStart(19) : '—'.padStart(19)}`);
    }
    L.push('');
  }
  L.push('measured in the A2-E1b experiment (4 seeds, same N/K/α):');
  L.push('  H1: 0.00 pages at every T out to 320');
  L.push('  H2: 0.25 (T=10)  0.50 (40)  1.75 (80)  3.50 (160)  6.75 (320)');
  return { lines: L, data };
}

if (require.main === module) {
  const { lines, data } = report();
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) { require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2)); console.log(`\nwrote ${process.argv[i + 1]}`); }
  void rankCellMeans;
}
