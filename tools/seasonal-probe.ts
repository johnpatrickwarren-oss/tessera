// tools/seasonal-probe.ts — route each counter's residual through the engine SEASONAL baseline
// (compile-baseline.ts / compileSeasonalBaseline, the per-(hour-of-day) robust clean-null) and report
// whether it whitens the null — specifically, whether it rescues a counter the loading-only baseline
// flagged (e.g. gpu_temp_c, which baseline-monitor abstained on).
//
// THE FINDING (gb200, 720 shards, 2-month healthy baseline → 240-tick monitoring). The seasonal model
// removes PREDICTABLE CALENDAR structure (a diurnal mean per hour-of-day). It does NOT rescue gpu_temp_c,
// because gpu_temp_c's leftover is NOT a diurnal cycle — it is a NEAR-UNIT-ROOT RANDOM WALK (I(1)):
//   • raw / seasonal / common-mode / seasonal+common-mode residual lag-1 |ρ| all ≈ 0.96 (none whiten it);
//   • but FIRST-DIFFERENCING whitens it (Δ lag-1 ≈ 0.09) → it is integrated, ADR 0003's near-unit-root.
// A per-cell mean baseline cannot remove a stochastic integrated trend. The other four counters are
// stationary (the seasonal/loading baseline already whitens them) and do not need this.
//
// THE CATCH (why differencing is not a free fix). Differencing whitens the NULL but destroys the
// mean-shift SIGNAL: a sustained level fault (onset→offset) becomes two impulses in differences (≈0 in
// between), which the mean-shift e-value cannot see. So differencing trades validity for power — the
// near-unit-root POWER wall (ADR 0016: UI power collapses as φ→1, valid but ~5–8% power). The correct
// handling for an I(1) counter is a TREND / drift detector (distributionalSignature.trendT, or an
// I(1)-aware changepoint method), NOT the mean-shift e-detector. So the Wall-A diagnostic abstaining on
// gpu_temp_c is the RIGHT behaviour: do not run a mean-shift e-BH on an undifferenced random walk (no
// valid stationary null), and do not silently difference it (you would lose the level-shift signal).
//
// Tessera-original; NOT vendored.

import { autocorr } from './conditional-markov.js';
import { loadScenarioBundle, counterMatrices, type ScenarioBundle } from './clustersynth-scenario.js';
import { compileSeasonalBaseline, seasonalBaselineResidual } from '@johnpatrickwarren-oss/deploysignal-engine/baseline/seasonal-baseline';
import { instrumentedCommonModeResiduals } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/instrumented-common-mode';

/** Hour-of-day context labels for a length-T series. clustersynth bundles share baseTs=1.7e9 @ dt_s
 *  (hourly here), so the fixed offset aligns the baseline and monitoring bins; a 24-tick period at
 *  hourly cadence captures one diurnal cycle. */
function hourCtx(T: number, offset = 22): number[] {
  return Array.from({ length: T }, (_, t) => (offset + t) % 24);
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : NaN;
}
function medLag1(rows: number[][]): number {
  return median(rows.slice(0, 200).map((r) => Math.abs(autocorr(r, 1))));
}
function difference(a: ReadonlyArray<number>): number[] {
  return a.slice(1).map((v, i) => v - a[i]);
}

export interface SeasonalProbeRow {
  counter: string;
  raw: number; seasonal: number; commonMode: number; seasonalPlusCM: number; differencedPlusCM: number;
  /** lag-1 |ρ| of the FIRST DIFFERENCE — near 0 ⇒ the series is I(1) (a random walk). */
  diffLag1: number;
  integrated: boolean;
}

/** Probe one counter: residual whiteness (median shard lag-1 |ρ|) under raw / seasonal / common-mode /
 *  seasonal+common-mode / differenced+common-mode, plus the I(1) test. */
export function probeCounter(healthy: ScenarioBundle, mon: ScenarioBundle, counter: string): SeasonalProbeRow {
  const Xb = counterMatrices(healthy, counter).X;
  const m = counterMatrices(mon, counter);
  const Xm = m.X, { factorSignals, membership } = m;
  const cb = hourCtx(healthy.T), cm = hourCtx(mon.T);

  // Seasonal residual: compile a per-hour clean-null from the long healthy history, apply to monitoring.
  const seasonal = Xm.map((x, i) => {
    try { return seasonalBaselineResidual(x, cm, compileSeasonalBaseline(Xb[i], cb, { nBins: 24, cyclic: true, zCut: 3 })); }
    catch { return x.slice(); }
  });
  const commonMode = instrumentedCommonModeResiduals(Xm, 30, factorSignals, membership);
  const seasonalPlusCM = instrumentedCommonModeResiduals(seasonal, 30, factorSignals, membership);
  const dCM = instrumentedCommonModeResiduals(Xm.map(difference), 30, factorSignals.map(difference), membership);
  const diffLag1 = median(Xm.slice(0, 200).map((r) => Math.abs(autocorr(difference(r), 1))));
  const raw = medLag1(Xm);

  return {
    counter, raw, seasonal: medLag1(seasonal), commonMode: medLag1(commonMode),
    seasonalPlusCM: medLag1(seasonalPlusCM), differencedPlusCM: medLag1(dCM),
    diffLag1, integrated: raw > 0.6 && diffLag1 < 0.3,
  };
}

export function renderSeasonalProbe(healthyDir: string, monDir: string): string {
  const healthy = loadScenarioBundle(healthyDir), mon = loadScenarioBundle(monDir);
  const L: string[] = [];
  L.push('═══ SEASONAL-BASELINE PROBE — does the per-hour-of-day model rescue a flagged counter? ═══');
  L.push(`baseline T=${healthy.T} (healthy) → monitoring T=${mon.T}. Median per-shard residual lag-1 |ρ| (lower = whiter null).`);
  L.push('');
  L.push('counter           raw   seasonal  commonMode  seas+CM   diff+CM  | Δlag1  I(1)?');
  for (const counter of mon.counters.map((c) => c.name)) {
    const r = probeCounter(healthy, mon, counter);
    const f = (x: number) => x.toFixed(3).padStart(7);
    L.push(`  ${counter.padEnd(14)} ${f(r.raw)} ${f(r.seasonal)} ${f(r.commonMode)} ${f(r.seasonalPlusCM)} ${f(r.differencedPlusCM)}  | ${r.diffLag1.toFixed(2)}  ${r.integrated ? 'YES (random walk)' : 'no'}`);
  }
  L.push('');
  L.push('READING: the SEASONAL model removes a diurnal MEAN per hour-of-day; it whitens nothing extra here');
  L.push('beyond the loading/common-mode baseline. gpu_temp_c stays ≈0.96 under raw/seasonal/common-mode/');
  L.push('seasonal+common-mode — because it is NEAR-UNIT-ROOT I(1) (Δlag1≈0.09, a random walk), not a');
  L.push('diurnal cycle. Only DIFFERENCING whitens it (diff+CM ≈0.06). But differencing destroys the');
  L.push('mean-shift SIGNAL (a sustained fault → two impulses), so it trades validity for power (ADR 0003/');
  L.push('0016 near-unit-root wall). An I(1) counter needs a TREND/drift detector (distributionalSignature),');
  L.push('not the mean-shift e-detector — so the Wall-A diagnostic abstaining on gpu_temp_c is correct.');
  return L.join('\n');
}

if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) { process.stderr.write('usage: node tools/seasonal-probe.js <healthy-dir> <monitoring-dir>\n'); process.exit(2); }
  process.stdout.write(renderSeasonalProbe(healthyDir, monDir) + '\n');
  process.exit(0);
}
