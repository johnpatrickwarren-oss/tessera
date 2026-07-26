// tools/heterogeneity-estimate.ts — measure θ (persistent unit heterogeneity) and τ (its
// autocorrelation timescale), the two quantities the A2 resolution left open.
//
// WHY. `research/2026-07-25-conjecture-a2-resolution.md` proved E[M_T] = E_δ[g(δ)^T], with the
// validity horizon T* ≈ 0.592/θ. Every number in that report is a function of θ, which nobody had
// measured, and the one plausible reason the true horizon is longer is that persistent offsets
// MEAN-REVERT on timescale τ, replacing the exponent T by min(T,τ).
//
// WHAT CAN AND CANNOT BE MEASURED HERE. There is no real probe data — the canary program is
// simulation-only (ADR 0023: "no production probe runner exists"). So this tool measures θ and τ
// **of canary-sim's own healthy DGP**, per scenario. That is not circular and it is not a fleet
// measurement; it is a characterisation of the substrate every E1–E5 number was produced on. The
// real-fleet θ needs the probe pilot, and § 3 of the report says so.
//
// THE ESTIMATORS. Scores are compared only WITHIN a round (that is what a conformal rank does), so
// round-common drift is removed first; everything below operates on round-demeaned scores.
//   • θ² /(1+θ²) = ICC, from a one-way random-effects decomposition (between-unit vs within-unit).
//   • τ from the lag-k autocorrelation of unit residuals: r_k = ICC·ρ(k), so ρ(k) = r_k/ICC, fitted
//     to exp(−k/τ).
//
// THE SCORE MODEL IS NOT REIMPLEMENTED HERE. `healthyPanel` delegates to
// `canary-sim.healthyScorePanel`, which calls the REAL `execScore`, restricted to a single block key
// (probe × version × gen × firmware).
//
// IT USED TO BE A MIRROR, AND THE MIRROR WAS WRONG (closes A2-host, 2026-07-26). The old comment
// here read "Knobs are imported from canary-sim so the two cannot drift apart" — but importing
// CONSTANTS does not couple two implementations, only calling the same CODE does, and the models had
// drifted: the mirror omitted `interferenceCoef · hostLoad(...)` entirely, because `hostLoad` was not
// exported and could not be reproduced without duplicating it. Host load carries a persistent
// per-host component, so every θ̂ this tool produced was a LOWER bound — specifically for
// H6/H7/H10/H11, the four interference-driven scenarios, which were exactly the four reporting θ = 0.
// "θ = 0" there meant "none from the channels modelled here", and the figures it fed (including the
// published ICC design target) inherited that bias in the UNSAFE direction.
//
// Two deliberate choices from the old mirror were kept, and are now inside `healthyScorePanel`
// because dropping either would re-introduce a known bug: execution-time jitter within the revisit
// interval (without it a 24 h-multiple spacing pins the diurnal phase and θ(H4) collapses to 0), and
// advancing the rack OU state per round (execScore does not do it; the main sim loop does).
//
// Run: `pnpm build && node tools/heterogeneity-estimate.js [--json out.json]`

import { HEALTHY_SCENARIOS, healthyScorePanel, GEN_SIGMA_BY_GEN, MEAS_SIGMA } from './canary-sim.js';
import { gCurve, validityHorizon, lambda, iccOf } from './exchangeability-drift.js';

type Knobs = (typeof HEALTHY_SCENARIOS)[string];

/**
 * Per-execution noise of the block this tool measures, IMPORTED from canary-sim rather than copied.
 *
 * A SECOND MIRROR ERROR, found the same day as the interference one: this file used to declare
 * `GEN_SIGMA = 0.010` locally. That is generation ONE's noise scale. The panel selects a gen-ZERO
 * block, whose SD is 0.008 — so the old model overstated within-unit noise by 25%, inflating the
 * denominator of the ICC and DEFLATING every θ̂ it reported. Same species of bug as the missing
 * interference channel, same direction (unsafe), and it survived for the same reason: a constant was
 * copied instead of imported.
 */
export const GEN_SIGMA = GEN_SIGMA_BY_GEN[0];
export { MEAS_SIGMA };

export interface Panel { /** scores[unit][round] */ scores: number[][]; hours: number[] }

/**
 * Healthy score panel for one block key: `nUnits` units, `nRounds` executions each, spaced
 * `hoursBetween` apart.
 *
 * DELEGATES TO `canary-sim.healthyScorePanel`, which calls the REAL `execScore`. It used to be a
 * hand-written mirror of `execScore` here, and the mirror was wrong: it omitted
 * `interferenceCoef · hostLoad(...)` entirely. See the note at the top of this file.
 */
export function healthyPanel(k: Knobs, seed: number, nUnits = 1440, nRounds = 40, hoursBetween = 132): Panel {
  const { scores, hours } = healthyScorePanel(k, { nUnits, nRounds, hoursBetween, seed });
  return { scores, hours };
}

/** Remove the round mean from every column — the within-round comparison a conformal rank makes. */
export function roundDemean(p: Panel): number[][] {
  const nU = p.scores.length, nR = p.scores[0].length;
  const out = p.scores.map((row) => row.slice());
  for (let t = 0; t < nR; t++) {
    let m = 0;
    for (let g = 0; g < nU; g++) m += out[g][t];
    m /= nU;
    for (let g = 0; g < nU; g++) out[g][t] -= m;
  }
  return out;
}

export interface IccResult { icc: number; theta: number; sigmaPers: number; sigmaExec: number }

/** One-way random-effects ICC on round-demeaned scores (balanced panel). */
export function estimateIcc(resid: number[][]): IccResult {
  const m = resid.length, n = resid[0].length;
  const unitMean = resid.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const grand = unitMean.reduce((a, b) => a + b, 0) / m;
  let ssB = 0, ssW = 0;
  for (let g = 0; g < m; g++) {
    ssB += (unitMean[g] - grand) ** 2;
    for (let t = 0; t < n; t++) ssW += (resid[g][t] - unitMean[g]) ** 2;
  }
  const msB = (n * ssB) / (m - 1), msW = ssW / (m * (n - 1));
  const varPers = Math.max(0, (msB - msW) / n);
  const icc = varPers / (varPers + msW);
  return { icc, theta: Math.sqrt(varPers / msW), sigmaPers: Math.sqrt(varPers), sigmaExec: Math.sqrt(msW) };
}

/** Lag-k autocorrelation of unit residuals, pooled over units (r_0 = 1 by construction). */
export function laggedAutocorr(resid: number[][], maxLag: number): number[] {
  const m = resid.length, n = resid[0].length;
  let mu = 0, cnt = 0;
  for (const row of resid) for (const v of row) { mu += v; cnt++; }
  mu /= cnt;
  let v0 = 0;
  for (const row of resid) for (const v of row) v0 += (v - mu) ** 2;
  v0 /= cnt;
  const out: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    let s = 0, c = 0;
    for (let g = 0; g < m; g++) for (let t = 0; t + k < n; t++) { s += (resid[g][t] - mu) * (resid[g][t + k] - mu); c++; }
    out.push(c > 0 ? s / c / v0 : 0);
  }
  return out;
}

/**
 * Persistence timescale in ROUNDS.
 *
 * For k ≥ 1 the lag-k autocorrelation of the residual is `r_k = ICC·ρ(k)` with ρ the persistent
 * component's own autocorrelation, so `log r_k = const − k/τ`: the SLOPE is what carries τ and the
 * normaliser drops out. Do NOT divide by the estimated ICC first — the one-way random-effects
 * estimator assumes a static unit effect and under-estimates the variance of a mean-reverting one,
 * which inflates τ by ~3× (measured on an AR(1) φ=0.5 control: 4.9 rounds reported for a true 1.44).
 *
 * Returns `Infinity` for a genuinely static offset (r_k flat in k) and 0 when there is no
 * persistence to speak of.
 */
export function estimateTau(resid: number[][], icc: number, maxLag = 12): number {
  if (icc <= 1e-9) return 0;
  const r = laggedAutocorr(resid, maxLag);
  if (!(r[0] > 0)) return 0;
  // Only fit lags where r_k stands clear of its own sampling noise (sd ≈ 1/√(m(n−k)) under the
  // null). Including noise-floor lags flattens the log-slope and inflates τ — the AR(1) φ=0.5
  // control read 4.3 rounds instead of 1.44 before this guard.
  const nUnits = resid.length, nRounds = resid[0].length;
  const xs: number[] = [], ys: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    const noise = 3 / Math.sqrt(Math.max(1, nUnits * (nRounds - k)));
    if (r[k - 1] > Math.max(noise, 0.1 * r[0])) { xs.push(k); ys.push(Math.log(r[k - 1])); }
  }
  if (xs.length < 2) return 1;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den > 0 ? num / den : 0;
  if (slope >= -1e-4) return Infinity;
  return -1 / slope;
}

/** Probe executions a single unit receives over `days` at budget fraction β — the number of rounds
 *  its e-process actually accumulates. E2/E5: β=0.05% ⇒ ~0.09 gpu-probes/GPU/day. */
export function roundsPerUnit(betaPct: number, days: number): number {
  return (betaPct / 0.05) * 0.09 * days;
}

/**
 * The estimator's own noise floor: θ̂ measured on a panel with EVERY persistent knob zeroed. The
 * one-way ICC estimator is clamped at 0, so under the null it is biased upward and reports a small
 * positive θ̂ from sampling error alone. Any scenario at or below this floor has no measurable
 * persistent heterogeneity; the τ̂ column is the corroborating signal (τ̂ ≈ 1 round = noise, since a
 * genuine persistent offset does not decorrelate between consecutive rounds).
 */
export function nullFloorTheta(seed = 20260725, nUnits = 1440, nRounds = 40, seeds = 8): number {
  const zeroed: Knobs = {
    ...HEALTHY_SCENARIOS.H1, name: 'null-floor',
    rackStaticSd: 0, rackOuSd: 0, heteroRackSd: 0, diurnalAmp: 0,
    hiddenStratumFrac: 0, hiddenStratumOffset: 0, agingSdPerDay: 0, unitOffsetSd: 0,
  };
  // MAX over seeds, not mean: the clamp at 0 makes a single draw come out exactly 0 about half the
  // time, which would set an unusably optimistic floor.
  let mx = 0;
  for (let i = 0; i < seeds; i++) {
    mx = Math.max(mx, estimateIcc(roundDemean(healthyPanel(zeroed, seed + 7919 * (i + 1), nUnits, nRounds))).theta);
  }
  return mx;
}

export interface ScenarioRow {
  name: string; icc: number; theta: number; tauRounds: number; aboveFloor: boolean;
  tStarK30: number; lambdaAt5: number; lambdaAt60: number; lambdaAt180: number;
}

export function scenarioTable(seed = 20260725, nUnits = 1440, nRounds = 40): ScenarioRow[] {
  const floor = nullFloorTheta(seed, nUnits, nRounds);
  const rows: ScenarioRow[] = [];
  for (const [key, k] of Object.entries(HEALTHY_SCENARIOS)) {
    const resid = roundDemean(healthyPanel(k, seed, nUnits, nRounds));
    const { icc, theta } = estimateIcc(resid);
    const tau = estimateTau(resid, icc);
    const aboveFloor = theta > 1.5 * floor && tau > 2;
    const c = aboveFloor ? gCurve(theta, 30) : null;
    rows.push({
      name: `${key} ${k.name}`, icc, theta, tauRounds: tau, aboveFloor,
      tStarK30: c ? validityHorizon(c) : Infinity,
      lambdaAt5: c ? lambda(c, 5) : 1,
      lambdaAt60: c ? lambda(c, 60) : 1,
      lambdaAt180: c ? lambda(c, 180) : 1,
    });
  }
  return rows;
}

const fmt = (x: number, d = 3): string => (Number.isFinite(x) ? (x > 1e6 ? '>1e6' : x.toFixed(d)) : '∞');

export function report(): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  const rows = scenarioTable();
  const floor = nullFloorTheta();
  L.push('θ and τ of canary-sim\'s healthy DGP, per E1 scenario (one block key; round-demeaned)');
  L.push(`estimator noise floor: θ̂ = ${floor.toFixed(4)} (all persistent knobs zeroed) — "·" = at/below floor`);
  L.push('');
  L.push('scenario                        ICC      θ        τ(rounds)  T*(K=30)  Λ(5)     Λ(60)    Λ(180)');
  for (const r of rows) {
    if (!r.aboveFloor) { L.push(`${r.name.padEnd(31)} ${(r.icc * 100).toFixed(3).padStart(6)}%  ${r.theta.toFixed(4).padStart(7)}  ${fmt(r.tauRounds, 1).padStart(9)}   · no measurable persistent heterogeneity`); continue; }
    L.push(`${r.name.padEnd(31)} ${(r.icc * 100).toFixed(3).padStart(6)}%  ${r.theta.toFixed(4).padStart(7)}  ` +
      `${fmt(r.tauRounds, 1).padStart(9)}  ${fmt(r.tStarK30, 0).padStart(8)}  ` +
      `${fmt(r.lambdaAt5).padStart(7)}  ${fmt(r.lambdaAt60).padStart(7)}  ${fmt(r.lambdaAt180).padStart(7)}`);
  }
  L.push('');
  L.push('rounds a unit actually accumulates (E2/E5 coverage: β=0.05% ⇒ 0.09 probes/GPU/day):');
  for (const beta of [0.05, 0.1, 0.2, 1.0]) {
    L.push(`  β=${String(beta).padStart(4)}%  60 d: ${roundsPerUnit(beta, 60).toFixed(1).padStart(6)}   ` +
      `1 y: ${roundsPerUnit(beta, 365).toFixed(0).padStart(5)}   3 y: ${roundsPerUnit(beta, 1095).toFixed(0).padStart(5)}`);
  }
  return { lines: L, data: { rows, coverage: [0.05, 0.1, 0.2, 1.0].map((b) => ({ beta: b, r60: roundsPerUnit(b, 60), r365: roundsPerUnit(b, 365) })) } };
}

if (require.main === module) {
  const { lines, data } = report();
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
  void iccOf;
}
