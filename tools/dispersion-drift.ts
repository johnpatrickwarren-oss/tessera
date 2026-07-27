// tools/dispersion-drift.ts — A2-disp: the A2 drift analysis extended to persistent DISPERSION
// heterogeneity, H8's actual mechanism.
//
// THE HOLE THIS CLOSES (theta-tau report § 7). The A2 machinery — g(δ), the tilt A, δ₀, the ICC
// target — is derived for a persistent LOCATION offset: Y = δ + Z. H8's `heteroRackSd` gives some
// units a persistently LARGER NOISE SCALE at equal mean: Y = λ·Z, λ = e^ν lognormal. A noisier unit
// occupies BOTH rank extremes more often; the calibrator is antitone, so the small-p extreme wins
// and its conditional increment mean g(λ) > 1. The location estimator θ̂ is blind to this channel
// (a scale multiplier moves no unit mean), so H8's published θ̂ = 0.203 captured only its
// incidental `rackStaticSd` component and its horizon was overstated. This is a hole in the
// STATEMENT (the model class), not in the measurement — the same species as A2-host was.
//
// THE MODEL. Unit scale multipliers λ_u = e^{ν_u}, ν ~ N(0, ς²) (median-1, matching canary-sim's
// `exp(rng.norm()·heteroRackSd)`), persistent across rounds. Peer scores are the SCALE MIXTURE
// F(y) = E_ν[Φ(y/e^ν)] — not a single Gaussian; using one would break the per-round identity.
// The exceedance map is π̄(y) = 1 − F(y) and the finite-block rank machinery (rank cells,
// binomial mixing) is reused unchanged from the location analysis. Per-round validity is exact by
// construction — E_ν[g(e^ν)] = 1 — and pinned as a test; the failure is serial, exactly as in A2.
//
// WHAT IS DIFFERENT FROM LOCATION, quantitatively (numbers in the report / tests):
//   • the ∞-block tilt is B = ∫f(p)(Φ⁻¹(p)²−1)dp ≈ 9.63 — ~5× the location tilt A = 1.99: per
//     unit of log-scale spread, dispersion drifts the accumulator far harder than location does
//     per unit of offset;
//   • but the finite block caps it far more effectively: the K=30 effective tilt is ≈ 1.47, a
//     6.5× reduction (location loses only ~2×). Dispersion lives in the extreme rank cells, which
//     are exactly what a finite block truncates. In the ∞-block limit g(λ) itself DIVERGES for λ
//     above the peer mixture's effective tail scale — worse than location, where only Λ diverged;
//   • the paging/detection floor is a RATIO, not an offset: λ₀(K=30) ≈ 4.1× persistent noise
//     inflation (≈ 6.3× against ς=0.5 heterogeneous peers). Below it a unit's log-accumulator
//     drifts away from the threshold at any horizon; above it, paging is eventual-certain. By the
//     N7 identifiability duality this is ALSO the smallest persistent dispersion FAULT the unit
//     family has power against — a noisy-fault detection floor.
//
// ς IS ESTIMABLE, like θ: the between-unit spread of log within-unit variance, χ²-corrected
// (`estimateDispersion` in heterogeneity-estimate.ts). The location ICC gate does NOT see it —
// a fleet can pass ICC ≲ 4% and still carry arbitrary ς. The design target needs both numbers.
//
// VALIDATION IS FIRST-PASSAGE, NEVER Λ-BY-MC (N10): the A/A harness below reuses
// horizon-experiment's scoreRound (shipped statistical primitives) on dispersion-only knob
// variants and measures per-test FPR (must stay nominal and scenario-independent — the P1
// signature) against pages (must grow with ς — the P3 signature).
//
// Run: `pnpm build && node tools/dispersion-drift.js [--harness] [--seeds 4] [--json out.json]`
// Report: research/2026-07-26-a2-dispersion.md

import { Phi, calibratorWith, rankCellMeans, gMax, tiltCoefficient, lambda, validityHorizon, gCurve } from './exchangeability-drift.js';
import type { GCurve } from './exchangeability-drift.js';
import { logCellMoments, mixBinom, crossProb } from './tail-probability.js';
import { HEALTHY_SCENARIOS, eBhSelect } from './canary-sim.js';
import { healthyPanel, roundDemean, estimateIcc, estimateDispersion, nullFloorDispersion } from './heterogeneity-estimate.js';
import { scoreRound, type FleetState } from './horizon-experiment.js';

// The w-grid for the test unit's own standard normal. ±14 suffices: at finite K the integrand is
// bounded by gMax(K), so the tail beyond contributes < gMax·Φ(−14) ≈ 1e-43.
const LO = -14, HI = 14, NW = 5600, HW = (HI - LO) / NW;
const WG = (() => { const w = new Float64Array(NW); for (let i = 0; i < NW; i++) w[i] = LO + (i + 0.5) * HW; return w; })();
const phi = (w: number): number => Math.exp(-(w * w) / 2) / Math.sqrt(2 * Math.PI);

/**
 * Peer-exceedance map under lognormal scale heterogeneity: `π̄(y) = P(peer > y) = E_ν[Φ(−y/e^ν)]`.
 *
 * The peer law is the scale MIXTURE, not `N(0, e^{ς²})` or any other single Gaussian — with a
 * single-Gaussian stand-in the per-round identity E_ν[g] = 1 fails and everything downstream
 * inherits the error. (The location analysis could use a single Gaussian only because a Gaussian
 * location mixture of Gaussians happens to be Gaussian; a scale mixture is not.)
 */
export function mixExceed(varsigma: number, nq = 121, span = 7): (y: number) => number {
  if (varsigma === 0) return (y: number) => Phi(-y);
  const scales: number[] = [], wts: number[] = [];
  const step = (2 * span * varsigma) / nq;
  for (let i = 0; i < nq; i++) {
    const nu = -span * varsigma + (i + 0.5) * step;
    scales.push(Math.exp(nu));
    wts.push(phi(nu / varsigma));
  }
  const s = wts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < nq; i++) wts[i] /= s;
  return (y: number) => { let a = 0; for (let i = 0; i < nq; i++) a += wts[i] * Phi(-y / scales[i]); return a; };
}

/** `g_K(λ) = E_W[ h(π̄(λW)) ]` — the conditional increment mean of a unit at scale λ, against K
 *  peers drawn from the ς-mixture. `K = Infinity` uses f(π̄) directly (divergence-prone; see top). */
export function gScaleAt(lam: number, pibar: (y: number) => number, K: number, cell: Float64Array, kappaMin = 0.05): number {
  const f = calibratorWith(kappaMin);
  let a = 0;
  for (let i = 0; i < NW; i++) {
    const pb = pibar(lam * WG[i]);
    a += (K === Infinity ? f(Math.max(pb, 1e-300)) : mixBinom(K, pb, cell)) * phi(WG[i]) * HW;
  }
  return a;
}

/**
 * Tabulate g over the lognormal scale states, PACKAGED AS A `GCurve` with `deltas = ν grid` and
 * `theta = ς` — the Λ integral over a Gaussian state prior is the same integral as the location
 * case, so `lambda(curve, T)` and `validityHorizon(curve)` are REUSED, not reimplemented.
 */
export function gScaleCurve(varsigma: number, K: number, kappaMin = 0.05, span = 6, M = 121): GCurve {
  const pibar = mixExceed(varsigma);
  const cell = K === Infinity ? new Float64Array(0) : rankCellMeans(K, kappaMin);
  const nus: number[] = [], g: number[] = [];
  const n = varsigma > 0 ? M : 1, step = varsigma > 0 ? (2 * span * varsigma) / M : 1;
  for (let j = 0; j < n; j++) {
    const nu = varsigma > 0 ? -span * varsigma + (j + 0.5) * step : 0;
    nus.push(nu);
    g.push(gScaleAt(Math.exp(nu), pibar, K, cell, kappaMin));
  }
  return { deltas: nus, g, theta: varsigma, step };
}

/** ∞-block dispersion tilt `B = d log g/dν |₀ = ∫₀¹ f(p)(Φ⁻¹(p)² − 1) dp` — the analogue of the
 *  location tilt A. Small-ς law: Λ(T) ≈ exp(B²ς²T²/2), T* ≈ √(2 ln 2)/(Bς).
 *
 *  Own wide grid (±34, like `tiltCoefficient`'s): the integrand decays only like
 *  `exp(−κ_min·w²/2)` — effective width 1/√κ_min ≈ 4.5σ — so the ±14 grid that suffices for every
 *  finite-K quantity truncates B by ~2.5%. */
export function dispersionTilt(kappaMin = 0.05): number {
  const f = calibratorWith(kappaMin);
  const lo = -34, hi = 34, nw = 13600, hw = (hi - lo) / nw;
  let a = 0;
  for (let i = 0; i < nw; i++) {
    const w = lo + (i + 0.5) * hw;
    a += f(Phi(-w)) * (w * w - 1) * phi(w) * hw;
  }
  return a;
}

/** Finite-K effective dispersion tilt, by central difference of log g at ν = 0 against
 *  homoskedastic peers. Far below the ∞-block B: the extreme rank cells carry the dispersion
 *  signature and a finite block truncates exactly those. */
export function dispersionTiltK(K: number, kappaMin = 0.05, eps = 0.01): number {
  const pibar = mixExceed(0);
  const cell = rankCellMeans(K, kappaMin);
  return (Math.log(gScaleAt(Math.exp(eps), pibar, K, cell, kappaMin))
    - Math.log(gScaleAt(Math.exp(-eps), pibar, K, cell, kappaMin))) / (2 * eps);
}

/** Kelly drift of `log M_t` for a unit at scale λ: `μ(λ) = E[log f(p) | λ]`, Rao-Blackwellised
 *  over the tie/jitter draw via the per-cell log means. Negative ⇒ the walk drifts away from the
 *  paging threshold at every horizon; positive ⇒ paging is eventual-certain. */
export function scaleKellyDrift(lam: number, varsigmaPeers: number, K: number, kappaMin = 0.05): number {
  const { m1 } = logCellMoments(K, kappaMin);
  const pibar = mixExceed(varsigmaPeers);
  let a = 0;
  for (let i = 0; i < NW; i++) a += mixBinom(K, pibar(lam * WG[i]), m1) * phi(WG[i]) * HW;
  return a;
}

/**
 * λ₀ — the dispersion drift-reversal RATIO: the persistent noise inflation above which a unit's
 * log-accumulator drifts toward the paging threshold. The dispersion twin of N7's δ₀, with the
 * same identifiability duality: it is simultaneously the false-page boundary for a persistently
 * noisy HEALTHY unit and the detection floor for a genuinely noisy FAULT (an SDC-style
 * variance-inflating failure below λ₀ is invisible to the unit family at this K).
 */
export function lambdaFloor(varsigmaPeers: number, K: number, kappaMin = 0.05): number {
  if (scaleKellyDrift(1, varsigmaPeers, K, kappaMin) > 0) return 1;
  let lo = 1, hi = 2;
  while (scaleKellyDrift(hi, varsigmaPeers, K, kappaMin) < 0 && hi < 1024) hi *= 2;
  if (scaleKellyDrift(hi, varsigmaPeers, K, kappaMin) < 0) return Infinity;
  for (let i = 0; i < 50; i++) {
    const mid = 0.5 * (lo + hi);
    if (scaleKellyDrift(mid, varsigmaPeers, K, kappaMin) < 0) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Fraction of units whose drift is positive: `P(λ ≥ λ₀) = Φ(−ln λ₀ / ς)` — the bounded,
 *  first-passage-relevant fleet quantity (P7's steady-state form for this channel). */
export function driftPositiveFraction(varsigma: number, K: number, kappaMin = 0.05): number {
  if (varsigma === 0) return 0;
  const l0 = lambdaFloor(varsigma, K, kappaMin);
  return Number.isFinite(l0) ? Phi(-Math.log(l0) / varsigma) : 0;
}

/** Drift AND volatility of `log M_t` for a unit at scale λ — the dispersion mirror of
 *  tail-probability's `driftAt`. The volatility is what the steady-state λ₀ form drops, and for
 *  dispersion it is enormous: a noisy unit's increments swing between BOTH extreme rank cells. */
export function scaleDriftAt(lam: number, varsigmaPeers: number, K: number, kappaMin = 0.05): { mu: number; sigma2: number } {
  const { m1, m2 } = logCellMoments(K, kappaMin);
  const pibar = mixExceed(varsigmaPeers);
  let a = 0, b = 0;
  for (let i = 0; i < NW; i++) {
    const pb = pibar(lam * WG[i]), w = phi(WG[i]) * HW;
    a += mixBinom(K, pb, m1) * w;
    b += mixBinom(K, pb, m2) * w;
  }
  return { mu: a, sigma2: Math.max(1e-12, b - a * a) };
}

/**
 * Expected false pages per run at horizon T: `N·E_ν[crossProb(μ(λ), σ²(λ), b, T)]` — the
 * FINITE-T first-passage form, which keeps the sub-threshold Lundberg bulk the steady-state
 * `P(λ ≥ λ₀)` drops. For dispersion the bulk DOMINATES at realistic ς: units far below λ₀ carry
 * volatility so large that finite-horizon crossings drive the fleet rate while the
 * drift-positive fraction is still ≈ 0.
 *
 * `b = ln(1/α)` is the plain-product barrier; the shipped ½/½+adjuster path raises it (N9), so
 * this over-predicts somewhat — treat as order-of-magnitude, pin only orderings.
 */
export function predictedPagesPerRun(varsigma: number, K: number, nUnits: number, alphaPage: number, T: number, kappaMin = 0.05): number {
  if (varsigma === 0) return 0;
  const b = Math.log(1 / alphaPage);
  const nq = 61, span = 6, step = (2 * span * varsigma) / nq;
  let acc = 0, wsum = 0;
  for (let i = 0; i < nq; i++) {
    const nu = -span * varsigma + (i + 0.5) * step;
    const wt = phi(nu / varsigma);
    const { mu, sigma2 } = scaleDriftAt(Math.exp(nu), varsigma, K, kappaMin);
    acc += wt * crossProb(mu, sigma2, b, T);
    wsum += wt;
  }
  return (acc / wsum) * nUnits;
}

// ─────────────────────────────────────────────────────────────────────────────
// A/A first-passage validation (N10: never Λ-by-MC). Reuses horizon-experiment's scoreRound —
// the shipped conformalP/calibrator/onset/combined primitives — on knob variants that isolate the
// dispersion channel.
// ─────────────────────────────────────────────────────────────────────────────

type Knobs = (typeof HEALTHY_SCENARIOS)[string];

/** Knob variants isolating the channel: control (no dispersion), H8's dispersion alone (location
 *  knob zeroed), and a doubled-ς variant that puts a measurable unit fraction above λ₀. */
export function dispersionVariants(): Record<string, Knobs> {
  const H8 = HEALTHY_SCENARIOS.H8;
  return {
    control: { ...H8, name: 'control-no-dispersion', heteroRackSd: 0, rackStaticSd: 0 },
    h8disp: { ...H8, name: 'H8-dispersion-only', rackStaticSd: 0 },
    h8disp2x: { ...H8, name: 'H8-dispersion-2x', rackStaticSd: 0, heteroRackSd: 1.0 },
  };
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DispHorizonRow {
  variant: string; varsigmaHat: number; thetaHat: number;
  lambda0: number; predDriftPosFrac: number; predDriftPosUnits: number;
  /** finite-T first-passage prediction (plain-product barrier; order-of-magnitude). */
  predPagesPerRun: number;
  T: number; perTestFpr: number; falsePagesPerRun: number; villeBudget: number; falseSelectionsPerRun: number;
}

/**
 * A/A paging sweep on one variant. Every unit healthy; every page false. The location-model
 * prediction for the dispersion-only variants is NOTHING (θ̂ at the estimator floor); pages
 * appearing there, with per-test FPR nominal and variant-independent, is the dispersion drift.
 */
export function runDispersionHorizon(
  key: string, knobs: Knobs,
  opts: { seeds?: number; nUnits?: number; blockPeers?: number; horizons?: number[]; alphaPage?: number; q?: number } = {},
): DispHorizonRow[] {
  const seeds = opts.seeds ?? 4;
  const nUnits = opts.nUnits ?? 2016;
  const K = opts.blockPeers ?? 30;
  const horizons = opts.horizons ?? [40, 160, 320];
  const alphaPage = opts.alphaPage ?? 0.001;
  const q = opts.q ?? 0.05;
  const maxT = Math.max(...horizons);

  const meas = roundDemean(healthyPanel(knobs, 424242, 1440, 40));
  const varsigmaHat = estimateDispersion(meas).varsigma;
  const thetaHat = estimateIcc(meas).theta;
  const l0 = lambdaFloor(varsigmaHat, K);
  const frac = driftPositiveFraction(varsigmaHat, K);

  const acc: Record<number, { fprNum: number; fprDen: number; pages: number; sel: number }> = {};
  for (const T of horizons) acc[T] = { fprNum: 0, fprDen: 0, pages: 0, sel: 0 };
  for (let s = 0; s < seeds; s++) {
    const r = rng(777001 + s * 6151);
    const panel = healthyPanel(knobs, 31337 + s * 271, nUnits, maxT);
    const st: FleetState = {
      prod: new Float64Array(nUnits).fill(1), g: new Float64Array(nUnits), k: new Int32Array(nUnits),
      cur: new Float64Array(nUnits).fill(1), paged: new Uint8Array(nUnits),
    };
    for (let t = 0; t < maxT; t++) {
      const a = acc[t + 1];
      const tally = a ? { fprNum: 0, fprDen: 0, lam: 0, pages: 0, sel: 0 } : undefined;
      scoreRound(r, panel.scores, t, K, st, alphaPage, tally);
      if (a && tally) {
        a.fprNum += tally.fprNum;
        a.fprDen += tally.fprDen;
        let pages = 0;
        for (let u = 0; u < nUnits; u++) pages += st.paged[u];
        a.pages += pages;
        a.sel += eBhSelect(Array.from(st.cur), q).length;
      }
    }
  }

  return horizons.map((T) => ({
    variant: `${key} ${knobs.name}`, varsigmaHat, thetaHat,
    lambda0: l0, predDriftPosFrac: frac, predDriftPosUnits: frac * nUnits,
    predPagesPerRun: predictedPagesPerRun(varsigmaHat, K, nUnits, alphaPage, T),
    T,
    perTestFpr: acc[T].fprDen > 0 ? acc[T].fprNum / acc[T].fprDen : NaN,
    falsePagesPerRun: acc[T].pages / seeds,
    villeBudget: nUnits * alphaPage,
    falseSelectionsPerRun: acc[T].sel / seeds,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

const f3 = (x: number, d = 3): string => (Number.isFinite(x) ? (x > 1e6 ? '>1e6' : x.toFixed(d)) : '∞');

/** Independent-channel small-drift combination: `T* ∝ 1/σ_lg` and variances add, so `1/T*²` adds. */
function combineHorizons(tL: number, tD: number): number {
  if (!Number.isFinite(tL) && !Number.isFinite(tD)) return Infinity;
  const invSq = (t: number): number => (Number.isFinite(t) ? 1 / (t * t) : 0);
  return Math.max(1, Math.round(1 / Math.sqrt(invSq(tL) + invSq(tD))));
}

interface ScenarioDispRow {
  key: string; varsigma: number; tauDisp: number; theta: number;
  tStarLoc: number; tStarDisp: number; tStarCombined: number;
}

/** Per-scenario two-channel measurement: ς̂ + τ_disp (dispersion), θ̂ (location), and the three
 *  horizons. `floor` gates which channel is treated as present. */
function scenarioDispRow(key: string, floor: number): ScenarioDispRow {
  const resid = roundDemean(healthyPanel(HEALTHY_SCENARIOS[key], 20260726, 1440, 40));
  const d = estimateDispersion(resid);
  const { theta } = estimateIcc(resid);
  const above = d.varsigma > Math.max(2 * floor, 0.02);
  const tD = above ? validityHorizon(gScaleCurve(d.varsigma, 30)) : Infinity;
  const tL = theta > 0.07 ? validityHorizon(gCurve(theta, 30)) : Infinity;
  return {
    key, varsigma: d.varsigma, tauDisp: d.tauDisp, theta,
    tStarLoc: tL, tStarDisp: tD, tStarCombined: combineHorizons(tL, tD),
  };
}

function theoryLines(L: string[]): { floors: Record<string, unknown>[]; ladder: Record<string, unknown>[] } {
  const A = tiltCoefficient(), B = dispersionTilt();
  L.push('A2-disp — persistent DISPERSION heterogeneity vs the conformal-rank e-process');
  L.push('');
  L.push(`tilts: location A = ${A.toFixed(4)}, dispersion B = ${B.toFixed(4)} (∞ block) — B/A = ${(B / A).toFixed(1)}×`);
  L.push(`finite-block effective dispersion tilt: K=30 → ${dispersionTiltK(30).toFixed(4)}, K=100 → ${dispersionTiltK(100).toFixed(4)}`);
  L.push(`  (the block cap defends against dispersion ~${(B / dispersionTiltK(30)).toFixed(1)}× vs ~2× for location; in the ∞ limit g itself diverges)`);
  L.push('');
  const floors = [10, 30, 100, 300].map((K) => ({ K, gMax: gMax(K), l0: lambdaFloor(0, K), l0Het: lambdaFloor(0.5, K) }));
  L.push('λ₀ — the dispersion paging/detection floor (persistent noise-inflation RATIO):');
  L.push('  K      g_max    λ₀ (homosked peers)   λ₀ (peers ς=0.5)');
  for (const r of floors) L.push(`  ${String(r.K).padEnd(5)} ${r.gMax.toFixed(1).padStart(6)}   ${f3(r.l0).padStart(12)}          ${f3(r.l0Het).padStart(12)}`);
  L.push('');
  L.push('ς ladder (K=30): per-round identity, horizon, drift-positive fraction:');
  L.push('  ς       E[g] (=1 exact)   g(1)     g(e^ς)   T*(K=30)   P(λ≥λ₀)      per-1e4-units');
  const ladder: Record<string, unknown>[] = [];
  for (const vs of [0.05, 0.1, 0.2, 0.3, 0.5]) {
    const c = gScaleCurve(vs, 30);
    const e1 = lambda(c, 1);
    const mid = Math.floor(c.g.length / 2);
    const gAtVs = gScaleAt(Math.exp(vs), mixExceed(vs), 30, rankCellMeans(30, 0.05));
    const frac = driftPositiveFraction(vs, 30);
    const row = { varsigma: vs, e1, g1: c.g[mid], gAtVs, tStar: validityHorizon(c), fracDriftPos: frac };
    ladder.push(row);
    L.push(`  ${String(vs).padEnd(6)} ${e1.toFixed(5).padStart(10)}       ${c.g[mid].toFixed(4)}   ${gAtVs.toFixed(4)}   ${String(row.tStar).padStart(5)}      ${frac.toExponential(2).padStart(9)}   ${(frac * 1e4).toFixed(2).padStart(10)}`);
  }
  return { floors, ladder };
}

function harnessLines(L: string[], seeds: number): DispHorizonRow[] {
  L.push('');
  L.push('A/A first-passage validation (all-healthy; every page FALSE; N10: paging, never Λ-by-MC):');
  L.push('  variant                          ς̂      θ̂      λ₀      P(λ≥λ₀)·N  predPages    T     FPR      pages/run  budget  eBH sel/run');
  const rows: DispHorizonRow[] = [];
  for (const [key, knobs] of Object.entries(dispersionVariants())) {
    for (const r of runDispersionHorizon(key, knobs, { seeds })) {
      rows.push(r);
      L.push(`  ${r.variant.padEnd(31)} ${r.varsigmaHat.toFixed(3)}  ${r.thetaHat.toFixed(3)}  ${f3(r.lambda0, 2).padStart(6)}  ${r.predDriftPosUnits.toFixed(2).padStart(8)}  ${r.predPagesPerRun.toFixed(1).padStart(9)}  ${String(r.T).padStart(4)}  ${r.perTestFpr.toFixed(4)}  ${r.falsePagesPerRun.toFixed(1).padStart(9)}  ${r.villeBudget.toFixed(1).padStart(6)}  ${r.falseSelectionsPerRun.toFixed(1).padStart(9)}`);
    }
  }
  return rows;
}

export function report(withHarness = false, seeds = 4): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  const { floors, ladder } = theoryLines(L);
  L.push('');
  L.push('scenario dispersion (round-demeaned panels, χ²-corrected log-variance spread):');
  const floor = nullFloorDispersion();
  L.push(`  estimator null floor ς̂ = ${floor.toFixed(4)}`);
  L.push('  scenario                        ς̂        τ_disp    θ̂(location)   T*loc   T*disp   T*combined(indep approx)');
  const scen: ScenarioDispRow[] = [];
  for (const key of ['H1', 'H2', 'H8', 'H12', 'H14']) {
    const r = scenarioDispRow(key, floor);
    scen.push(r);
    L.push(`  ${key.padEnd(31)} ${r.varsigma.toFixed(4).padStart(7)}  ${f3(r.tauDisp, 1).padStart(8)}   ${r.theta.toFixed(4).padStart(9)}    ${f3(r.tStarLoc, 0).padStart(5)}   ${f3(r.tStarDisp, 0).padStart(5)}    ${f3(r.tStarCombined, 0).padStart(5)}`);
  }
  const data: Record<string, unknown> = {
    tiltA: tiltCoefficient(), tiltB: dispersionTilt(), tiltBK30: dispersionTiltK(30),
    floors, ladder, scenarios: scen, nullFloor: floor,
  };
  if (withHarness) data.harness = harnessLines(L, seeds);
  return { lines: L, data };
}

if (require.main === module) {
  const withHarness = process.argv.includes('--harness');
  const si = process.argv.indexOf('--seeds');
  const { lines, data } = report(withHarness, si >= 0 ? Number(process.argv[si + 1]) : 4);
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
}
