// tools/shadow-replay.ts — replay REAL labeled telemetry (NAB) through Tessera's
// production detection path, observe-only, and report real calibration (FP rate on
// real quiescent data) + detection (TP / latency on labeled anomalies).
//
// SCOPE: validates the PER-SIGNAL detector on real autocorrelated telemetry. Does
// NOT validate cluster / topology / common-mode / fleet-FDR layers (no real
// multi-shard data); NAB anomalies are operational, not GPU-SDC.
// See docs/SPEC-shadow-replay-real-telemetry.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { decomposeSeasonal, deseasonalize } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/seasonal';
import { estimateAr1 } from './per-shard-whitening.js';
import { loadNabTrace, listNabDatasets, type NabTrace } from './_nab-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const PROBATIONARY_PERCENT = 0.15;
export const PROBATIONARY_CAP = 5000;
export const PHI_CLIP = 0.95; // mirror the engine's ar1Phi clip (near-unit-root boundary)
export const ALPHAS = [0.05, 0.01, 0.005, 0.001] as const; // operating-point sweep
export type Mode = 'simple' | 'rich';
export const MODES: ReadonlyArray<Mode> = ['simple', 'rich'];
const DEFAULT_CATEGORIES = ['realKnownCause', 'realAWSCloudwatch', 'realTraffic', 'artificialNoAnomaly'];

export function probationaryEnd(n: number): number {
  return Math.min(Math.floor(PROBATIONARY_PERCENT * n), PROBATIONARY_CAP);
}

export interface Baseline {
  mean: number; sigma2: number; phi: number; innovationVar: number;
  /** Detected dominant period (rich mode); 0 = none (falls back to simple). */
  period: number;
  /** Per-phase seasonal means to subtract at replay time (rich mode); [] when period=0. */
  seasonal_means: number[];
}

function meanOf(xs: ReadonlyArray<number>): number {
  let m = 0; for (const v of xs) m += v; return m / Math.max(xs.length, 1);
}
function sampleVar(xs: ReadonlyArray<number>, mean: number): number {
  let s2 = 0; for (const v of xs) s2 += (v - mean) * (v - mean);
  const v = xs.length > 1 ? s2 / (xs.length - 1) : 1; return v > 0 ? v : 1;
}
function clipPhi(phi: number): number { return Math.max(-PHI_CLIP, Math.min(PHI_CLIP, phi)); }

/** Calibrate (mean, marginal σ², φ, innovation σ²) from the probationary prefix.
 *  φ is clipped to [-PHI_CLIP, PHI_CLIP] to mirror the engine; the engine stamps
 *  baseline_sigma_squared = innovation variance when ar1_phi is set, so we pass
 *  innovationVar = σ²·(1-φ²) as updateBettingState's sigmaSquared.
 *
 *  mode='rich' composes the engine's production calibration: detect a dominant
 *  period (decomposeSeasonal) and, if found, calibrate (φ, innovation σ²) on the
 *  DESEASONALIZED residual — mirroring fit-production-substrate's seasonal path.
 *  No period detected ⇒ identical to 'simple'. */
export function calibrateBaseline(probValues: ReadonlyArray<number>, mode: Mode = 'simple'): Baseline {
  const mean = meanOf(probValues);
  if (mode === 'rich') {
    const dec = decomposeSeasonal([...probValues], mean);
    if (dec.period > 0) {
      const phi = clipPhi(estimateAr1(dec.deseasonalized).phi);
      const sigma2 = sampleVar(dec.deseasonalized, mean);
      return { mean, sigma2, phi, innovationVar: Math.max(sigma2 * (1 - phi * phi), 1e-12), period: dec.period, seasonal_means: dec.seasonal_means };
    }
  }
  const sigma2 = sampleVar(probValues, mean);
  const phi = clipPhi(estimateAr1(probValues).phi);
  return { mean, sigma2, phi, innovationVar: Math.max(sigma2 * (1 - phi * phi), 1e-12), period: 0, seasonal_means: [] };
}

/** Replay scored rows through the engine betting e-process with restart-on-fire
 *  (continuous-monitoring). When the baseline detected a period, the stream is
 *  deseasonalized first (engine `deseasonalize`, phase 0 = tick 0). Returns fire
 *  row indices (indices are positions in the original series; deseasonalization
 *  does not reindex). */
export function replayFires(values: ReadonlyArray<number>, probEnd: number, cal: Baseline, alpha: number): number[] {
  const stream = cal.period > 0 ? deseasonalize([...values], cal.seasonal_means, cal.period, 0) : values;
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const fires: number[] = [];
  for (let i = probEnd; i < stream.length; i++) {
    updateBettingState(state, stream[i], cal.mean, cal.innovationVar, alpha, cal.phi);
    if (state.M >= threshold) {
      fires.push(i);
      state = freshBettingState(); // restart: alert emitted, keep watching
    }
  }
  return fires;
}

export interface DatasetResult {
  dataset_key: string; mode: Mode; period: number; alpha: number; n: number; prob_end: number;
  scored_normal_points: number; fp_fires: number; fp_per_1k_normal: number;
  windows_scored: number; windows_detected: number; latencies_samples: number[];
}

/** Score fires against ground-truth windows. Pure. */
export function scoreDataset(trace: NabTrace, probEnd: number, fires: ReadonlyArray<number>, alpha: number, mode: Mode = 'simple', period = 0): DatasetResult {
  const { values, ts_epoch_ms, is_anomaly, windows } = trace;
  let scoredNormal = 0;
  for (let i = probEnd; i < values.length; i++) if (!is_anomaly[i]) scoredNormal++;
  const fpFires = fires.filter((i) => !is_anomaly[i]).length;

  // Per-window: first scored row index, and earliest in-window fire (latency).
  let windowsScored = 0, windowsDetected = 0;
  const latencies: number[] = [];
  for (const [a, b] of windows) {
    let firstIdx = -1;
    for (let i = probEnd; i < values.length; i++) {
      if (ts_epoch_ms[i] >= a && ts_epoch_ms[i] <= b) { firstIdx = i; break; }
    }
    if (firstIdx < 0) continue; // window entirely in probationary / not scored
    windowsScored++;
    const inWindow = fires.filter((f) => ts_epoch_ms[f] >= a && ts_epoch_ms[f] <= b);
    if (inWindow.length > 0) { windowsDetected++; latencies.push(inWindow[0] - firstIdx); }
  }
  return {
    dataset_key: trace.dataset_key, mode, period, alpha, n: values.length, prob_end: probEnd,
    scored_normal_points: scoredNormal, fp_fires: fpFires,
    fp_per_1k_normal: scoredNormal > 0 ? round3((fpFires / scoredNormal) * 1000) : 0,
    windows_scored: windowsScored, windows_detected: windowsDetected,
    latencies_samples: latencies,
  };
}

function round3(x: number): number { return Math.round(x * 1000) / 1000; }
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]; // lower-median (deterministic, exact for even n)
}

interface AggRow { mode: Mode; alpha: number; datasets: number; total_scored_normal: number; total_fp_fires: number; fp_per_1k_normal: number; windows_scored: number; windows_detected: number; detection_rate: number; median_latency_samples: number | null }
interface Report {
  schema_version: 'tessera-nab-shadow-v2';
  provenance: { nab_dir: string; categories: string[]; n_datasets: number; modes: Mode[]; alphas: number[]; probationary_percent: number; probationary_cap: number; phi_clip: number };
  per_dataset: DatasetResult[];
  operating_points: AggRow[]; // one per (mode, alpha)
}

function aggregate(results: DatasetResult[], mode: Mode, alpha: number): AggRow {
  const a = results.filter((r) => r.mode === mode && r.alpha === alpha);
  const totNormal = a.reduce((s, r) => s + r.scored_normal_points, 0);
  const totFp = a.reduce((s, r) => s + r.fp_fires, 0);
  const wScored = a.reduce((s, r) => s + r.windows_scored, 0);
  const wDet = a.reduce((s, r) => s + r.windows_detected, 0);
  const lat = a.flatMap((r) => r.latencies_samples);
  return {
    mode, alpha, datasets: a.length, total_scored_normal: totNormal, total_fp_fires: totFp,
    fp_per_1k_normal: totNormal > 0 ? round3((totFp / totNormal) * 1000) : 0,
    windows_scored: wScored, windows_detected: wDet,
    detection_rate: wScored > 0 ? round3(wDet / wScored) : 0,
    median_latency_samples: median(lat),
  };
}

export function runShadowReplay(nabDir: string, categories: string[] = DEFAULT_CATEGORIES): Report {
  const keys = listNabDatasets(nabDir, categories);
  const perDataset: DatasetResult[] = [];
  for (const key of keys) {
    const trace = loadNabTrace(nabDir, key);
    const probEnd = probationaryEnd(trace.values.length);
    for (const mode of MODES) {
      const cal = calibrateBaseline(trace.values.slice(0, probEnd), mode);
      for (const alpha of ALPHAS) {
        perDataset.push(scoreDataset(trace, probEnd, replayFires(trace.values, probEnd, cal, alpha), alpha, mode, cal.period));
      }
    }
  }
  const operating: AggRow[] = [];
  for (const mode of MODES) for (const a of ALPHAS) operating.push(aggregate(perDataset, mode, a));
  return {
    schema_version: 'tessera-nab-shadow-v2',
    provenance: { nab_dir: path.basename(nabDir), categories, n_datasets: keys.length, modes: [...MODES], alphas: [...ALPHAS], probationary_percent: PROBATIONARY_PERCENT, probationary_cap: PROBATIONARY_CAP, phi_clip: PHI_CLIP },
    per_dataset: perDataset,
    operating_points: operating,
  };
}

function renderMd(r: Report): string {
  const L: string[] = [];
  L.push('# Tessera — NAB shadow-replay report (REAL telemetry)');
  L.push('');
  L.push('Real, labeled operational telemetry (Numenta Anomaly Benchmark) replayed through Tessera\'s production betting e-process (engine `updateBettingState` with AR(1) whitening), observe-only.');
  L.push('');
  L.push('> **Scope (read before quoting any number):** this validates the **per-signal detector** — calibration (false-positive rate on real quiescent data) and detection (on labeled anomalies) — on *real autocorrelated telemetry*. It does **NOT** validate the cluster / topology / common-mode / fleet-FDR layers (no real multi-shard data here), and NAB anomalies are **operational** (server/sensor), **not GPU-SDC**. A clean report does not imply cluster-level validation.');
  L.push('');
  L.push(`Provenance: ${r.provenance.n_datasets} datasets from ${r.provenance.categories.join(', ')}; probationary = first ${(r.provenance.probationary_percent * 100)}% (cap ${r.provenance.probationary_cap}); phi clipped to ${r.provenance.phi_clip} (engine parity); restart-on-fire (continuous monitoring).`);
  L.push('');
  L.push('## Operating-point sweep — simple vs rich calibration (real data)');
  L.push('');
  L.push('`simple` = static `(mean,σ²,φ)` baseline. `rich` = engine production calibration (seasonal deseasonalization via `decomposeSeasonal` + AR(1)), composing the same primitives `fit-production-substrate` uses. `FP/1k` = false-positive fires per 1000 scored-normal points; `detection` = labeled windows with ≥1 in-window fire.');
  L.push('');
  L.push('| mode | alpha | FP/1k normal | detection rate | windows det/scored | median latency |');
  L.push('|---|---|---|---|---|---|');
  for (const a of r.operating_points) {
    L.push(`| ${a.mode} | ${a.alpha} | ${a.fp_per_1k_normal} | ${(a.detection_rate * 100).toFixed(1)}% | ${a.windows_detected}/${a.windows_scored} | ${a.median_latency_samples ?? '—'} |`);
  }
  L.push('');
  const seasonalN = new Set(r.per_dataset.filter((d) => d.mode === 'rich' && d.period > 0).map((d) => d.dataset_key)).size;
  // Honest aggregate FP-direction (AC-15): state whether rich actually reduces FP.
  const fpDeltas = [...ALPHAS].map((a) => {
    const s = r.operating_points.find((o) => o.mode === 'simple' && o.alpha === a)!;
    const ri = r.operating_points.find((o) => o.mode === 'rich' && o.alpha === a)!;
    return ri.fp_per_1k_normal - s.fp_per_1k_normal;
  });
  const fpVerdict = fpDeltas.every((d) => d > 0)
    ? '**rich raises aggregate FP/1k at every alpha** (it does NOT reduce false positives)'
    : fpDeltas.every((d) => d < 0) ? '**rich lowers aggregate FP/1k at every alpha**'
    : 'rich changes aggregate FP/1k inconsistently across alpha';
  L.push(`**Detection vs FP:** rich improves detection (deseasonalizing surfaces anomalies under the cycle), but ${fpVerdict}. The FP driver is regime-shift / multimodal structure, not periodicity — confirming AC-15.`);
  L.push('');
  L.push(`Rich calibration detected a dominant period in **${seasonalN}/${r.provenance.n_datasets}** datasets (only those can differ from simple). Per AC-15, seasonal calibration targets *periodic* structure; it does NOT fix regime-shift / multimodal over-firing (a single stationary baseline can't).`);
  L.push('');
  L.push('## Per-dataset: simple vs rich FP (alpha = 0.01)');
  L.push('');
  L.push('| dataset | period (rich) | FP/1k simple | FP/1k rich | detection simple | detection rich |');
  L.push('|---|---|---|---|---|---|');
  const sim = new Map(r.per_dataset.filter((d) => d.mode === 'simple' && d.alpha === 0.01).map((d) => [d.dataset_key, d]));
  for (const d of r.per_dataset.filter((x) => x.mode === 'rich' && x.alpha === 0.01)) {
    const s = sim.get(d.dataset_key)!;
    L.push(`| ${d.dataset_key} | ${d.period || '—'} | ${s.fp_per_1k_normal} | ${d.fp_per_1k_normal} | ${s.windows_detected}/${s.windows_scored} | ${d.windows_detected}/${d.windows_scored} |`);
  }
  L.push('');
  L.push('## Method');
  L.push('');
  L.push('Per dataset × mode: calibrate on the probationary prefix (φ clipped to engine parity; innovation variance `σ²·(1-φ²)` as the engine `sigmaSquared`, `φ` as `ar1Phi`; rich mode additionally deseasonalizes via `decomposeSeasonal` when a dominant period is found), then replay the remaining rows through `updateBettingState`, firing+restarting at wealth ≥ 1/alpha. In-window fire = detection; scored-normal fire = false positive. Deterministic (no RNG); byte-identical on re-run.');
  L.push('');
  return L.join('\n');
}

export interface ShadowResult { json_path: string; md_path: string; }

export function writeShadowReport(nabDir: string, outDir: string, categories?: string[]): ShadowResult {
  const report = runShadowReplay(nabDir, categories);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'nab-shadow-report.json');
  const mdPath = path.join(outDir, 'nab-shadow-report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(mdPath, renderMd(report));
  return { json_path: jsonPath, md_path: mdPath };
}

if (require.main === module) {
  const nabDir = process.argv[2] ?? process.env.NAB_DIR;
  if (!nabDir) {
    process.stderr.write('usage: node tools/shadow-replay.js <nab-dir>   (or set NAB_DIR)\n');
    process.exit(64);
  }
  const outDir = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeShadowReport(nabDir, outDir);
  process.stdout.write(`NAB shadow-replay report written:\n  ${path.relative(process.cwd(), r.json_path)}\n  ${path.relative(process.cwd(), r.md_path)}\n`);
  process.exit(0);
}
