// tools/serial-calibration.ts — an ANYTIME-VALID serial-dependence calibration monitor (ADR 0019 O5
// frontier; the research step that retires the whiteness-check composition crutch).
//
// THE BLIND SPOT IT CLOSES. The marginal calibration monitor (tools/calibration-monitor.ts) tests
// E[g(r_t)|F_{t-1}] ≤ 1 with g a function of the SINGLE current residual (the symmetric Gaussian-LR
// mixture). That catches a wrong mean/scale, but it is provably BLIND to pure serial dependence: a
// unit-marginal AR(1) residual x_t = ρ·x_{t-1} + √(1−ρ²)·ε_t is marginally EXACTLY N(0,1), so
// E[g(x_t)] = 1 and the marginal martingale never grows — yet the serial dependence breaks the e-process
// validity the whitening was supposed to deliver. Today that gap is patched OUTSIDE the monitor by a
// fixed-threshold lag-1 whiteness check (|autocorr(r,1)| ≤ 0.1) ANDed into construction validity. That
// check is a non-anytime-valid heuristic with a magic constant and no accumulating power — the crutch.
//
// THE FIX (a conditional bet). Test serial dependence INSIDE an anytime-valid martingale by betting on the
// next residual using the PREVIOUS one as the predictor. For an F_{t-1}-measurable bet λ_t = c·r_{t-1},
//     g_c(r_{t-1}, r_t) = exp(c·r_{t-1}·r_t − c²·r_{t-1}²/2)
// is a conditional e-value: under H0 (r_t ⊥ past, r_t ~ N(0,1)), E[g_c | F_{t-1}] = exp(λ_t²/2 − λ_t²/2)
// = 1 for ANY c and ANY past — exactly Ville. Under positive serial dependence E[r_t r_{t-1}|F_{t-1}] =
// ρ·r_{t-1}² > 0, so the bet earns and ∏g_c grows; under negative ρ the OPPOSITE-sign bet earns. So a
// SIGN-AND-MAGNITUDE MIXTURE over c ∈ ±{...} is a single e-value that detects lag-1 dependence of either
// sign with no threshold — it tests the same quantity the whiteness check does, but as an accumulating
// anytime-valid test rather than a fixed cutoff.
//
// THE STRENGTHENED MONITOR runs TWO test martingales — the marginal one (∏ g(r_t)) and a serial one
// (∏ g_serial(r_{t-1}, r_t)) — and COMBINES them by averaging: W = (W_marg + W_serial)/2. The average of
// two e-processes is an e-process, so Ville still gives P(sup_t W ≥ 1/α | H0) ≤ α at the SAME single
// threshold — one monitor that catches BOTH a wrong marginal AND serial dependence. Averaging (not a
// within-step mixture of all bets) is the right composition for POWER: each component keeps its full
// per-tick growth RATE — which compounds over the stream — and pays only a one-time additive −log2 when
// the dominant component crosses. (A within-step mixture would instead dilute the serial growth rate by
// the marginal bets every tick, which compounds catastrophically; multiplying g·g_serial in one step is
// outright invalid, since both depend on r_t. Averaging two martingales avoids both.) The two components
// are also the natural ATTRIBUTION (which failure mode revoked).
//
// SCOPE. Lag-1 (the dominant AR(1) failure and the lag the whiteness check uses); the construction extends
// to lag k by predicting with r_{t-k}, mixed over lags — left as a knob. This is the O5 direction named in
// RESEARCH-INDEX.md (conditional/serial calibration); it is NOT N1 (the per-shard temporal FDR wall) — it
// strengthens the runtime MONITOR, not the per-shard guarantee. Tessera-original.

/** logsumexp over an array (numerically stable). */
function logSumExp(xs: number[]): number {
  let m = -Infinity;
  for (const x of xs) if (x > m) m = x;
  if (m === -Infinity || m === Infinity) return m;
  let s = 0;
  for (const x of xs) s += Math.exp(x - m);
  return m + Math.log(s);
}

/** The marginal Gaussian-LR bet set (mirrors mixture-evalue's gInc: λ ∈ ±{0.5,1,2}). */
const MARGINAL_LAMBDAS: ReadonlyArray<number> = [0.5, 1, 2, -0.5, -1, -2];
/** Per-tick increment cap (mirrors mixture-evalue's G_CAP): E[min(g,cap)] ≤ E[g] = 1, conservative. */
const G_CAP = 100;
const LOG_G_CAP = Math.log(G_CAP);

/** Default mixture of SERIAL bet coefficients, symmetric so the test catches serial dependence of EITHER
 *  sign. Moderate magnitudes keep the per-tick bet stable for typical |r_{t-1}| ~ O(1). */
export const DEFAULT_SERIAL_COEFFS: ReadonlyArray<number> = [-0.6, -0.3, 0.3, 0.6];

/** log of the canonical conditional e-value exp(b·rCur − b²/2). E[·|F_{t-1}] = 1 under H0 for any
 *  F_{t-1}-measurable bet b. */
const betLog = (b: number, rCur: number): number => b * rCur - 0.5 * b * b;

/** log of the lag-1 serial-dependence increment g_serial(r_{t-1}, r_t) = mean_c exp(c·rPrev·rCur −
 *  c²·rPrev²/2) (the serial bets b = c·rPrev). E[g_serial | F_{t-1}] = 1 under H0, for any rPrev. */
export function serialLogIncrement(rPrev: number, rCur: number, coeffs: ReadonlyArray<number> = DEFAULT_SERIAL_COEFFS): number {
  return logSumExp(coeffs.map((c) => betLog(c * rPrev, rCur))) - Math.log(coeffs.length);
}

export interface ConditionalMonitorOptions {
  /** Anytime-valid level: revoke when the unified martingale W ≥ 1/alpha. Default 0.01. */
  alpha?: number;
  /** Serial-bet mixture coefficients (default DEFAULT_SERIAL_COEFFS). */
  coeffs?: ReadonlyArray<number>;
}

/** The strengthened monitor: a marginal martingale + a serial martingale, combined by averaging. */
export interface ConditionalMonitorState {
  /** log of the marginal-calibration martingale (∏ g(r_t)). */
  logWmarg: number;
  /** log of the serial-dependence martingale (∏ g_serial(r_{t-1}, r_t)). */
  logWserial: number;
  /** running max of log((W_marg + W_serial)/2) — the combined evidence-so-far (the revocation statistic). */
  peakLogAvg: number;
  /** previous residual (the serial predictor); null before the first tick / after a stream boundary. */
  prev: number | null;
  ticks: number;
  /** false once the combined (averaged) martingale has crossed 1/alpha — STICKY. */
  passing: boolean;
  threshold: number;
  coeffs: ReadonlyArray<number>;
}

export function freshConditionalMonitor(opts: ConditionalMonitorOptions = {}): ConditionalMonitorState {
  const alpha = opts.alpha ?? 0.01;
  if (!(alpha > 0 && alpha <= 1)) throw new Error(`serial-calibration: alpha must be in (0,1], got ${alpha}`);
  return {
    logWmarg: 0, logWserial: 0, peakLogAvg: 0, prev: null, ticks: 0, passing: true,
    threshold: Math.log(1 / alpha), coeffs: opts.coeffs ?? DEFAULT_SERIAL_COEFFS,
  };
}

const LOG2 = Math.log(2);

/** Ingest ONE believed-null residual: advance the marginal martingale (always) and the serial martingale
 *  (once a predecessor exists), then revoke (sticky) if their AVERAGE has ever crossed 1/alpha. Mutates and
 *  returns the state. */
export function updateConditional(state: ConditionalMonitorState, r: number): ConditionalMonitorState {
  state.logWmarg += Math.min(LOG_G_CAP, logSumExp(MARGINAL_LAMBDAS.map((l) => betLog(l, r))) - Math.log(MARGINAL_LAMBDAS.length));
  if (state.prev !== null) state.logWserial += serialLogIncrement(state.prev, r, state.coeffs);
  state.prev = r;
  const logAvg = logSumExp([state.logWmarg, state.logWserial]) - LOG2;
  if (logAvg > state.peakLogAvg) state.peakLogAvg = logAvg;
  state.ticks++;
  if (state.peakLogAvg >= state.threshold) state.passing = false;
  return state;
}

/** Ingest a batch in order (serial memory carries across the batch). */
export function updateConditionalBatch(state: ConditionalMonitorState, rs: ReadonlyArray<number>): ConditionalMonitorState {
  for (const r of rs) updateConditional(state, r);
  return state;
}

export interface ConditionalVerdict {
  passing: boolean;
  ticks: number;
  /** combined evidence-so-far against calibration, as an e-value. */
  eValue: number;
  /** marginal component's evidence-so-far (for attribution: marginal break vs serial dependence). */
  marginalEValue: number;
  /** serial component's evidence-so-far. */
  serialEValue: number;
  revokeAt: number;
}

export function conditionalVerdict(state: ConditionalMonitorState): ConditionalVerdict {
  const clamp = (x: number): number => Math.exp(Math.min(x, 700));
  return {
    passing: state.passing,
    ticks: state.ticks,
    eValue: clamp(state.peakLogAvg),
    marginalEValue: clamp(state.logWmarg),
    serialEValue: clamp(state.logWserial),
    revokeAt: clamp(state.threshold),
  };
}

/** Convenience: run the combined monitor over a believed-null stream (or several streams, in order) and
 *  return whether the construction stays calibrated. Mirrors applyCalibrationMonitor's stream handling. */
export function conditionalCalibrationPass(
  referenceNullResiduals: ReadonlyArray<number> | ReadonlyArray<ReadonlyArray<number>>,
  opts: ConditionalMonitorOptions = {},
): { passing: boolean; verdict: ConditionalVerdict } {
  const monitor = freshConditionalMonitor(opts);
  const streams: ReadonlyArray<ReadonlyArray<number>> =
    Array.isArray(referenceNullResiduals[0])
      ? (referenceNullResiduals as ReadonlyArray<ReadonlyArray<number>>)
      : [referenceNullResiduals as ReadonlyArray<number>];
  // each stream is one believed-null unit: reset the serial predictor at a stream boundary (no spurious
  // cross-unit "lag-1" pair), but accumulate both martingales into the shared monitor.
  for (const s of streams) { monitor.prev = null; updateConditionalBatch(monitor, s); }
  return { passing: monitor.passing, verdict: conditionalVerdict(monitor) };
}

// ─── RESEARCH HARNESS — does the serial term close the blind spot without false revocations? ──────────
// Demonstrates the four claims on synthetic ground truth: (1) iid N(0,1) keeps all monitors passing
// (low false-revocation); (2) a unit-marginal AR(1) is INVISIBLE to the marginal monitor but the serial
// (and combined) monitor revokes — the headline; (3) a marginal mean/scale break is still caught by the
// combined monitor; (4) a ρ-sweep shows the combined monitor's revocation power vs the fixed lag-1
// whiteness threshold it replaces.

import { mulberry32, gaussian } from './calibration-envelope.js';
import { freshCalibrationMonitor, updateCalibrationBatch } from './calibration-monitor.js';
import { autocorr } from './conditional-markov.js';

/** A unit-marginal AR(1) stream: x_t = ρ x_{t-1} + √(1−ρ²) ε_t — marginally EXACTLY N(0,1). */
function ar1(rng: () => number, n: number, rho: number, scale = 1, mean = 0): number[] {
  const out: number[] = [];
  let x = gaussian(rng);
  const s = Math.sqrt(Math.max(0, 1 - rho * rho));
  for (let t = 0; t < n; t++) { x = rho * x + s * gaussian(rng); out.push(mean + scale * x); }
  return out;
}

/** An integrated-drift (random-walk) stream, then standardized to unit sample variance — so the MARGINAL
 *  is ~calibrated and the failure is PURELY serial (the broken-construction mode #3 used whiteness to catch). */
function randomWalk(rng: () => number, n: number): number[] {
  const w: number[] = []; let x = 0;
  for (let t = 0; t < n; t++) { x += gaussian(rng); w.push(x); }
  const mean = w.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  return w.map((v) => (v - mean) / sd);
}

/** Fraction of trials in which the MARGINAL-only monitor revokes over a stream. */
function marginalRevokeRate(streams: number[][], alpha: number): number {
  let rev = 0;
  for (const s of streams) { const m = freshCalibrationMonitor({ alpha }); updateCalibrationBatch(m, s); if (!m.passing) rev++; }
  return rev / streams.length;
}
/** Fraction of trials in which the COMBINED (marginal+serial) monitor revokes. */
function conditionalRevokeRate(streams: number[][], alpha: number): number {
  let rev = 0;
  for (const s of streams) if (!conditionalCalibrationPass(s, { alpha }).passing) rev++;
  return rev / streams.length;
}
/** Fraction of trials the fixed lag-1 whiteness check (the crutch) would flag, at the |ρ̂|≤0.1 cutoff. */
function whitenessFlagRate(streams: number[][], thresh = 0.1): number {
  let flag = 0;
  for (const s of streams) if (Math.abs(autocorr(s, 1)) > thresh) flag++;
  return flag / streams.length;
}

function genStreams(seedBase: number, nTrials: number, n: number, gen: (rng: () => number) => number[]): number[][] {
  return Array.from({ length: nTrials }, (_, i) => gen(mulberry32(seedBase + i)));
}

export function renderSerialCalibration(nTrials = 300, n = 600, alpha = 0.01): string {
  const L: string[] = [];
  L.push('═══ SERIAL-DEPENDENCE CALIBRATION MONITOR — closing the marginal blind spot (ADR 0019 O5) ═══');
  L.push(`${nTrials} trials × ${n} ticks; α=${alpha} (anytime-valid false-revocation ≤ α). The combined`);
  L.push('monitor averages the marginal martingale with the lag-1 serial-bet martingale.');
  L.push('');
  L.push('scenario                         | marginal-only | COMBINED | whiteness-flag (|ρ̂|>0.1)');
  const row = (label: string, streams: number[][]): void => {
    L.push(`  ${label.padEnd(30)} |     ${(100 * marginalRevokeRate(streams, alpha)).toFixed(0).padStart(4)}%    |  ${(100 * conditionalRevokeRate(streams, alpha)).toFixed(0).padStart(4)}%  |        ${(100 * whitenessFlagRate(streams)).toFixed(0).padStart(4)}%`);
  };
  row('iid N(0,1) (true null)', genStreams(1, nTrials, n, (r) => ar1(r, n, 0)));
  row('AR(1) ρ=0.3 (mild, unit marg)', genStreams(1000, nTrials, n, (r) => ar1(r, n, 0.3)));
  row('AR(1) ρ=0.6 (unit marg)', genStreams(2000, nTrials, n, (r) => ar1(r, n, 0.6)));
  row('AR(1) ρ=0.9 (near-unit-root)', genStreams(2500, nTrials, n, (r) => ar1(r, n, 0.9)));
  row('AR(1) ρ=-0.5 (unit marg)', genStreams(3000, nTrials, n, (r) => ar1(r, n, -0.5)));
  row('integrated drift (random walk)', genStreams(3500, nTrials, n, (r) => randomWalk(r, n)));
  row('marginal break: mean +0.4', genStreams(4000, nTrials, n, (r) => ar1(r, n, 0, 1, 0.4)));
  row('marginal break: scale 1.4', genStreams(5000, nTrials, n, (r) => ar1(r, n, 0, 1.4)));
  L.push('');
  L.push('READING:');
  L.push('• iid null: both monitors revoke at ≤ α — the serial term adds no false revocations.');
  L.push('• unit-marginal AR(1): the marginal-only monitor is BLIND (≈0% — the residual is exactly N(0,1)');
  L.push('  marginally) at EVERY ρ; the COMBINED monitor revokes, with power rising in |ρ| — and at the');
  L.push('  near-unit-root / integrated-drift breaks (the actual broken-construction failure mode #3 used');
  L.push('  whiteness to catch) it revokes ~fully, anytime-validly, with NO magic ρ̂ threshold.');
  L.push('• marginal break: still caught by the combined monitor (the marginal component carries it).');
  L.push('• vs the whiteness crutch: |ρ̂|>0.1 over-flags mild ρ at a fixed cutoff (100% at ρ=0.3) with no');
  L.push('  notion of accumulated evidence; the anytime-valid monitor spends power where dependence is');
  L.push('  strong enough to threaten calibration. It SUBSUMES whiteness for the breaks that matter, so');
  L.push('  construction validity can drop the separate whiteness-AND composition.');
  return L.join('\n');
}

if (require.main === module) {
  const nTrials = process.argv[2] ? Number(process.argv[2]) : 300;
  const n = process.argv[3] ? Number(process.argv[3]) : 600;
  process.stdout.write(renderSerialCalibration(nTrials, n) + '\n');
  process.exit(0);
}
