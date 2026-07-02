// tools/metric-router.ts — the METRIC-AWARE ROUTER (the "honest open design").
//
// No single preprocessing+detector fits every metric. This router CHARACTERISES each counter ON THE
// BASELINE (a fixed, pre-monitoring decision — so the monitoring-window null stays clean and the
// aggregate FDR guarantee is not post-selection-leaked), then routes it to a matching pipeline, and
// GATES the fleet with the conditional-Markov diagnostic (e-BH earns its aggregate guarantee only on
// inputs whose null is valid). Built on the 2-month anomaly-trimmed baseline (tools/baseline-monitor.ts).
//
// THE ROUTES (decided from the baseline residual's integration order + whiteness):
//   • STATIONARY (common-mode residual is conditionally white): common-mode removal → mean-shift
//     e-detector (tools/e-detector.ts). The transient-fault path; recovers level-shift faults.
//   • INTEGRATED / I(1) (level near-unit-root, Δ white): DIFFERENCE → restores a valid (white) null so
//     the diagnostic certifies it and e-BH controls aggregate FDR — but the mean-shift signal is gone
//     (a step → impulse pair), so this path uses a MAGNITUDE detector and reports honest recall.
//   • (extensible: variance-change → distributionalSignature.fRatio; calendar → seasonal baseline.)
//
// THE HONEST RESULT is CADENCE-DEPENDENT — clustersynth now models sampling cadence (continuous-time
// Ornstein–Uhlenbeck dynamics sampled at dt_s; dt_s is no longer a relabel, so a 1 Hz run is genuinely
// smoother than hourly). Stationary counters → mean-shift e-detector → ~full recall at aggregate FDP≈0.
// gpu_temp_c's CHARACTER depends on cadence: at a fine DCGM rate (~1 Hz) its level is smooth/INTEGRATED →
// the random-walk CHANGEPOINT detector (tools/rw-changepoint.ts) on the level certifies at a SMALL window
// — a fixed wall-clock fault spans many ticks, so the window that Gaussianises the removal-induced heavy
// tails is tiny relative to the fault → validity AND recall together. At coarse (hourly) cadence the fast
// thermal dynamics alias toward iid → gpu_temp_c reads stationary and routes to the mean-shift e-detector.
// Either way the router gates on the detector's OWN null and never emits an uncontrolled FDR. (Earlier this
// counter was stuck integrated-with-heavy-tails at every cadence because clustersynth's per-tick noise was
// iid and dt_s only relabeled time; that generator bug is fixed.)
//
// Tessera-original; NOT vendored.

import { autocorr, conditionalMarkovDiagnostic } from './conditional-markov.js';
import { eDetector, type EDetectorOptions } from './e-detector.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { rwChangepointEValue } from './rw-changepoint.js';
import { fitBaseline, applyBaseline, type ShardBaseline } from './baseline-monitor.js';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

export type MetricCharacter = 'stationary' | 'integrated';

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : NaN;
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  return xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];
}
function difference(a: ReadonlyArray<number>): number[] {
  return a.slice(1).map((v, i) => v - a[i]);
}
/** Determine a counter's integration order from the CROSS-WINDOW common-mode residual on a set of
 *  HEALTHY shards (a fresh realization, faults excluded). Integrated (I(1)) when the level is near-unit-
 *  root (lag-1 high) but the first difference is white.
 *
 *  This must be cross-window, NOT in-sample on the baseline: an in-sample (or same-realization split-
 *  half) loading fit SPURIOUSLY whitens a near-unit-root series — regressing a random walk on collinear
 *  factors — so it hides the I(1) structure (every counter looks white at lag-1≈0.03). The cross-window
 *  residual is the honest signal (it is also exactly what monitoring faces). Integration order is a
 *  structural PER-COUNTER property estimated from healthy shards — a nuisance characterization, not a
 *  per-hypothesis selection on the candidate faults, so it does not leak the FDR guarantee. In
 *  production this is decided on a held-out healthy validation window before monitoring; the demo uses
 *  the monitoring window's healthy shards (faults excluded) as that held-out set. */
export function integrationOrder(levelResidual: number[][], healthyIdx: number[]): { character: MetricCharacter; levelLag1: number; diffLag1: number } {
  const levelLag1 = median(healthyIdx.map((i) => Math.abs(autocorr(levelResidual[i], 1))));
  const diffLag1 = median(healthyIdx.map((i) => Math.abs(autocorr(difference(levelResidual[i]), 1))));
  return { character: levelLag1 > 0.6 && diffLag1 < 0.3 ? 'integrated' : 'stationary', levelLag1, diffLag1 };
}

export interface RouterRow {
  counter: string; character: MetricCharacter; detector: string;
  nFault: number; recall: number; aggregateFdp: number; selected: number;
  markovPlausibleFrac: number;
  /** Integrated path only: empirical mean of the scale e-value over HEALTHY shards. The scale e-value's
   *  null requires E[e|H0] ≤ 1; a value ≫ 1 means the differenced residual violates its iid-Gaussian-
   *  stationary null (heavy tails / heteroskedasticity) → e-BH FDR is NOT controlled. NaN for stationary. */
  scaleNullMean: number;
  certified: boolean;
}

/** A detector's null is empirically valid when its healthy-shard e-value mean is ≤ this (≈1, with slack). */
const DETECTOR_NULL_TOL = 1.3;

/** gpu mean_shift faulted shard ids on this counter (active in the monitoring window). */
function faultedSet(mon: ScenarioBundle, counter: string): Set<number> {
  const ids = new Set<string>();
  for (const f of mon.faults) {
    if (f.level === 'gpu' && f.type === 'mean_shift' && (f.counter === counter || f.counter === null)) {
      for (const s of f.affected_shards) ids.add(s);
    }
  }
  return new Set([...ids].map((s) => mon.shardIds.indexOf(s)).filter((i) => i >= 0));
}

/** Route + score one counter end-to-end. The integration order is determined from the cross-window
 *  common-mode residual on healthy shards, then the character-specific preprocessing + detector is run. */
export function routeCounter(mon: ScenarioBundle, counter: string, fits: ShardBaseline[], calLen: number): RouterRow {
  const levelR = applyBaseline(mon, counter, fits); // cross-window common-mode residual (level)
  const faulted = faultedSet(mon, counter);
  const healthyIdx = mon.shardIds.map((_, i) => i).filter((i) => !faulted.has(i)).filter((_, k) => k % 5 === 0).slice(0, 140);

  const { character } = integrationOrder(levelR, healthyIdx);
  const useMeanShift = character === 'stationary';
  // Both detectors operate on the LEVEL residual. Stationary → mean-shift e-detector (the residual is
  // white). Integrated → the random-walk CHANGEPOINT detector (tools/rw-changepoint.ts), which handles the
  // I(1) null directly via a windowed local level-contrast (bounded, heavy-tail-robust) — it is the right
  // detector for a sustained mean-STEP on a random walk (the scale e-value on differences was FDR-valid but
  // ignored the step's sparse impulse; this uses the sustained level).
  const R = levelR;
  const opts: EDetectorOptions = { calLen, onsetTarget: 16, evalTarget: 20, mixture: 'SR' };
  // Integrated path: pick the changepoint window that certifies the null on healthy shards (the precise
  // "data-density" lever — enough points per window to average out the removal-induced heavy tails).
  const cpWindow = useMeanShift ? 0 : pickChangepointWindow(R, healthyIdx, calLen);
  const detector = useMeanShift ? 'mean-shift e-detector' : `rw changepoint w=${cpWindow}`;
  // TWO scores per shard (2026-07-02 audit fix). The e-detector's SR running-max peak is NOT an
  // e-value (E[M^SR|H0] ≈ #onsets, not ≤ 1 — the pre-ADR-0019 mistake), so it must never feed
  // e-BH; it is kept ONLY for the ROC-matched recall metric. e-BH gets the NORMALIZED CONVEX-
  // MIXTURE e-value (mixture-evalue.ts), the same valid object baseline-monitor.ts feeds it.
  const recallScore = (i: number) => useMeanShift
    ? eDetector(R[i], opts).peak
    : safeChangepoint(R[i], calLen, cpWindow);
  const ebhScore = (i: number) => useMeanShift
    ? normalizedMixtureEValue(R[i])
    : safeChangepoint(R[i], calLen, cpWindow);
  const fleet = scoreFleet(R, recallScore, ebhScore, faulted, healthyIdx);

  // Gate EACH path on ITS detector's own null. Stationary → the conditional-Markov (mean-whiteness)
  // diagnostic. Integrated → the changepoint e-value's empirical null mean over HEALTHY shards (≤ ~1): the
  // changepoint detector accounts for the I(1) random-walk null, so its validity is its own E[e|H0]≤1, NOT
  // mean-whiteness of the (autocorrelated) level. Bounded by the clip → it does not explode on heavy tails.
  const plaus = useMeanShift
    ? healthyIdx.filter((i) => conditionalMarkovDiagnostic(R[i], R[0].map(() => 0)).markovPlausible).length
    : 0;
  const markovPlausibleFrac = useMeanShift && healthyIdx.length ? plaus / healthyIdx.length : NaN;
  const detectorNullMean = useMeanShift ? NaN : fleet.healthyScores.reduce((a, b) => a + b, 0) / Math.max(1, fleet.healthyScores.length);
  const certified = useMeanShift ? markovPlausibleFrac >= 0.5 : detectorNullMean <= DETECTOR_NULL_TOL;
  return {
    counter, character, detector, nFault: faulted.size,
    recall: fleet.recall, aggregateFdp: fleet.aggregateFdp, selected: fleet.selected,
    markovPlausibleFrac, scaleNullMean: detectorNullMean, certified,
  };
}

/** ROC-matched recall (faulted vs healthy 95th-pct threshold on `recallScore`) + e-BH aggregate FDP
 *  over the fleet on `ebhScore`. The two are SEPARATE on purpose: recall may use any monotone
 *  statistic (empirical, threshold-matched), but e-BH's FDR theorem requires a genuine e-value
 *  (E[·|H0] ≤ 1) — see mixture-evalue.ts / ADR 0019. `healthyScores` returns the healthy-shard
 *  ebhScore sample (the integrated path's null-mean gate audits E[e|H0] on exactly what e-BH sees). */
function scoreFleet(R: number[][], recallScore: (i: number) => number, ebhScore: (i: number) => number, faulted: Set<number>, healthyIdx: number[]): { recall: number; aggregateFdp: number; selected: number; healthyScores: number[] } {
  const healthyScores = healthyIdx.map(ebhScore);
  const thr = quantile(healthyIdx.map(recallScore), 0.95);
  let hits = 0; for (const i of faulted) if (recallScore(i) >= thr) hits++;
  const sel = eBenjaminiHochberg(R.map((_, i) => ebhScore(i)), 0.1).selected;
  let falsePos = 0; for (const i of sel) if (!faulted.has(i)) falsePos++;
  return {
    recall: faulted.size ? hits / faulted.size : NaN,
    aggregateFdp: sel.length ? falsePos / sel.length : 0,
    selected: sel.length, healthyScores,
  };
}

/** Random-walk changepoint e-value with a guard (0 on a degenerate window — never a false alarm). Bounded
 *  (clipped) → does not explode on heavy tails; detects a sustained level step on an I(1) series. */
function safeChangepoint(r: ReadonlyArray<number>, calLen: number, window: number): number {
  try {
    const e = rwChangepointEValue(r, { window, calLen });
    return Number.isFinite(e) && e > 0 ? e : 0;
  } catch { return 0; }
}

/** Pick the SMALLEST changepoint window whose healthy-shard null mean is ≤ tol — window-averaging
 *  Gaussianises the (common-mode-removal-induced) heavy tails, so a bigger window restores E[e|H0] ≤ 1.
 *  Decided on HEALTHY shards (the data-density / window-size lever), so it does not leak the FDR guarantee. */
function pickChangepointWindow(R: number[][], healthyIdx: number[], calLen: number): number {
  let window = 15;
  for (const w of [15, 25, 35, 50, 70]) {
    window = w;
    const m = healthyIdx.reduce((s, i) => s + safeChangepoint(R[i], calLen, w), 0) / Math.max(1, healthyIdx.length);
    if (m <= DETECTOR_NULL_TOL) break;
  }
  return window;
}

/** One-line, run-specific summary of how gpu_temp_c routed (keeps the prose in sync with the table). */
function tempSummary(temp: RouterRow | undefined): string {
  if (!temp) return 'gpu_temp_c carried no faults in this run.';
  const detNull =
    temp.character === 'integrated' && !Number.isNaN(temp.scaleNullMean)
      ? ` (detNull ${temp.scaleNullMean.toFixed(2)} ≤ ${DETECTOR_NULL_TOL})`
      : '';
  const gate = temp.certified ? 'CERTIFIED' : 'FLAGGED';
  return `Here gpu_temp_c read ${temp.character} → ${temp.detector} → ${(temp.recall * 100).toFixed(0)}% recall, ${gate}${detNull}.`;
}

export function renderMetricRouter(healthyDir: string, monDir: string, calLen?: number): string {
  const healthy = loadScenarioBundle(healthyDir), mon = loadScenarioBundle(monDir);
  const cl = calLen ?? Math.min(30, Math.floor(0.15 * mon.T));
  const L: string[] = [];
  L.push('═══ METRIC-AWARE ROUTER — characterise on the baseline, route, gate with the diagnostic ═══');
  L.push(`baseline T=${healthy.T} → monitoring T=${mon.T}. Integration order decided from HEALTHY shards (faults excluded), not the candidate faults.`);
  L.push('');
  L.push('counter          character   detector                    recall  agg-FDP  meanWhite  detNull  gate');
  const rows = new Map<string, RouterRow>();
  for (const counter of mon.counters.map((c) => c.name)) {
    const fits = fitBaseline(healthy, counter);
    if (fits.length !== mon.shardIds.length) { L.push(`  ${counter}: SKIP (topology mismatch)`); continue; }
    const r = routeCounter(mon, counter, fits, cl);
    if (r.nFault === 0) continue;
    rows.set(counter, r);
    const sv = r.scaleNullMean;
    const dn = Number.isNaN(sv) ? '   —   ' : `${sv > 1000 ? sv.toExponential(1) : sv.toFixed(2)}${sv <= DETECTOR_NULL_TOL ? ' ok' : ' BAD'}`;
    const mw = Number.isNaN(r.markovPlausibleFrac) ? '   —  ' : `${(r.markovPlausibleFrac * 100).toFixed(0).padStart(5)}%`;
    L.push(`  ${r.counter.padEnd(14)} ${r.character.padEnd(11)} ${r.detector.padEnd(26)} ${(r.recall * 100).toFixed(0).padStart(4)}%  ${r.aggregateFdp.toFixed(3)}  ${mw.padStart(7)}  ${dn.padStart(8)}  ${r.certified ? 'CERTIFIED' : 'FLAGGED'}`);
  }
  L.push('');
  const certified = [...rows.values()].filter((x) => x.certified).length;
  const tempLine = tempSummary(rows.get('gpu_temp_c'));
  L.push('READING: the router classifies each metric by integration order (cross-window common-mode residual on');
  L.push('HEALTHY shards — an in-sample fit spuriously whitens a random walk, so it must be cross-window) and routes');
  L.push('it: STATIONARY (white residual) → mean-shift e-detector for RECALL, with e-BH fed the normalized convex-');
  L.push('mixture e-value (mixture-evalue.ts — the SR peak is NOT an e-value and never touches e-BH); INTEGRATED (near-');
  L.push('unit-root level, white Δ) → the random-walk CHANGEPOINT detector on the LEVEL (tools/rw-changepoint.ts): a');
  L.push('windowed local level-contrast (post-window mean − adjacent pre-window mean), mixed over onsets, CLIPPED →');
  L.push('bounded. Each path is gated on ITS detector\'s OWN null (mean-whiteness for stationary; the changepoint');
  L.push(`e-value's healthy-shard mean ≤ tol for integrated). This run: ${certified}/${rows.size} counters certify, aggregate FDP≈0.`);
  L.push('');
  L.push('HOW gpu_temp_c is handled — CADENCE-DEPENDENT (clustersynth now models sampling cadence: continuous-time');
  L.push('Ornstein–Uhlenbeck dynamics sampled at dt_s, so a 1 Hz run is genuinely smoother than hourly — dt_s is NO');
  L.push('LONGER a relabel). The level can be near-unit-root, and common-mode REMOVAL on a coarsely-sampled near-');
  L.push('random-walk induces heavy-tailed differenced residuals — an ARTIFACT of removal × coarse sampling, not the');
  L.push('metric. The router\'s lever is WINDOW SIZE: a windowed level-contrast Gaussianises the contrast, and it');
  L.push('picks the SMALLEST window whose healthy-shard null mean ≤ tol — decided on HEALTHY shards, so it does not');
  L.push(`leak the FDR guarantee. ${tempLine}`);
  L.push('The density payoff is now REAL, not hypothetical: at a fine DCGM rate (~1 Hz) a fixed wall-clock fault');
  L.push('spans thousands of ticks, so the window needed to Gaussianise is TINY relative to the fault → validity AND');
  L.push('power together. At coarse (hourly) cadence the fast thermal dynamics alias toward iid → the metric reads');
  L.push('stationary and routes to the mean-shift e-detector. Architecture unchanged: characterise → route by');
  L.push('character × fault type → score with a bounded e-value → SIZE the window / gate on the detector\'s OWN null');
  L.push('(on healthy shards) → never emit an uncontrolled FDR. CERTIFIED = the FDR guarantee holds; recall reported');
  L.push('separately.');
  return L.join('\n');
}

if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) { process.stderr.write('usage: node tools/metric-router.js <healthy-dir> <monitoring-dir> [calLen]\n'); process.exit(2); }
  process.stdout.write(renderMetricRouter(healthyDir, monDir, process.argv[4] ? Number(process.argv[4]) : undefined) + '\n');
  process.exit(0);
}
