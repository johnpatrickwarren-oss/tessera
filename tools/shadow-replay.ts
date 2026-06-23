// tools/shadow-replay.ts — replay REAL labeled telemetry (NAB) through Tessera's
// production detection path, observe-only, and report real calibration (FP rate on
// real quiescent data) + detection (TP / latency on labeled anomalies).
//
// SCOPE: validates the PER-SIGNAL detector on real autocorrelated telemetry. Does
// NOT validate cluster / topology / common-mode / fleet-FDR layers (no real
// multi-shard data); NAB anomalies are operational, not GPU-SDC.
// See docs/SPEC-shadow-replay-real-telemetry.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { estimateAr1 } from './per-shard-whitening.js';
import { loadNabTrace, listNabDatasets, type NabTrace } from './_nab-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const PROBATIONARY_PERCENT = 0.15;
export const PROBATIONARY_CAP = 5000;
export const PHI_CLIP = 0.95; // mirror the engine's ar1Phi clip (near-unit-root boundary)
export const ALPHAS = [0.01, 0.001] as const;
const DEFAULT_CATEGORIES = ['realKnownCause', 'realAWSCloudwatch', 'realTraffic', 'artificialNoAnomaly'];

export function probationaryEnd(n: number): number {
  return Math.min(Math.floor(PROBATIONARY_PERCENT * n), PROBATIONARY_CAP);
}

export interface Baseline { mean: number; sigma2: number; phi: number; innovationVar: number; }

/** Calibrate (mean, marginal σ², φ, innovation σ²) from the probationary prefix.
 *  φ is clipped to [-PHI_CLIP, PHI_CLIP] to mirror the engine; the engine stamps
 *  baseline_sigma_squared = innovation variance when ar1_phi is set, so we pass
 *  innovationVar = σ²·(1-φ²) as updateBettingState's sigmaSquared. */
export function calibrateBaseline(probValues: ReadonlyArray<number>): Baseline {
  const n = probValues.length;
  let mean = 0;
  for (const v of probValues) mean += v;
  mean /= Math.max(n, 1);
  let s2 = 0;
  for (const v of probValues) s2 += (v - mean) * (v - mean);
  const sigma2 = n > 1 ? s2 / (n - 1) : 1;
  let phi = estimateAr1(probValues).phi;
  if (phi > PHI_CLIP) phi = PHI_CLIP;
  if (phi < -PHI_CLIP) phi = -PHI_CLIP;
  const innovationVar = Math.max(sigma2 * (1 - phi * phi), 1e-12);
  return { mean, sigma2: sigma2 > 0 ? sigma2 : 1, phi, innovationVar };
}

/** Replay scored rows through the engine betting e-process with restart-on-fire
 *  (continuous-monitoring). Returns the fire row indices. */
export function replayFires(values: ReadonlyArray<number>, probEnd: number, cal: Baseline, alpha: number): number[] {
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const fires: number[] = [];
  for (let i = probEnd; i < values.length; i++) {
    updateBettingState(state, values[i], cal.mean, cal.innovationVar, alpha, cal.phi);
    if (state.M >= threshold) {
      fires.push(i);
      state = freshBettingState(); // restart: alert emitted, keep watching
    }
  }
  return fires;
}

export interface DatasetResult {
  dataset_key: string; alpha: number; n: number; prob_end: number;
  scored_normal_points: number; fp_fires: number; fp_per_1k_normal: number;
  windows_scored: number; windows_detected: number; latencies_samples: number[];
}

/** Score fires against ground-truth windows. Pure. */
export function scoreDataset(trace: NabTrace, probEnd: number, fires: ReadonlyArray<number>, alpha: number): DatasetResult {
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
    dataset_key: trace.dataset_key, alpha, n: values.length, prob_end: probEnd,
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

interface Report {
  schema_version: 'tessera-nab-shadow-v1';
  provenance: { nab_dir: string; categories: string[]; n_datasets: number; alphas: number[]; probationary_percent: number; probationary_cap: number; phi_clip: number };
  per_dataset: DatasetResult[];
  aggregate: Array<{ alpha: number; datasets: number; total_scored_normal: number; total_fp_fires: number; fp_per_1k_normal: number; windows_scored: number; windows_detected: number; detection_rate: number; median_latency_samples: number | null }>;
}

function aggregate(results: DatasetResult[], alpha: number) {
  const a = results.filter((r) => r.alpha === alpha);
  const totNormal = a.reduce((s, r) => s + r.scored_normal_points, 0);
  const totFp = a.reduce((s, r) => s + r.fp_fires, 0);
  const wScored = a.reduce((s, r) => s + r.windows_scored, 0);
  const wDet = a.reduce((s, r) => s + r.windows_detected, 0);
  const lat = a.flatMap((r) => r.latencies_samples);
  return {
    alpha, datasets: a.length, total_scored_normal: totNormal, total_fp_fires: totFp,
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
    const cal = calibrateBaseline(trace.values.slice(0, probEnd));
    for (const alpha of ALPHAS) {
      perDataset.push(scoreDataset(trace, probEnd, replayFires(trace.values, probEnd, cal, alpha), alpha));
    }
  }
  return {
    schema_version: 'tessera-nab-shadow-v1',
    provenance: { nab_dir: path.basename(nabDir), categories, n_datasets: keys.length, alphas: [...ALPHAS], probationary_percent: PROBATIONARY_PERCENT, probationary_cap: PROBATIONARY_CAP, phi_clip: PHI_CLIP },
    per_dataset: perDataset,
    aggregate: ALPHAS.map((a) => aggregate(perDataset, a)),
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
  L.push('## Aggregate (real data)');
  L.push('');
  L.push('`FP/1k` = false-positive fires per 1000 scored-normal points (the operational alert rate on real quiescent data). `detection` = labeled windows with >= 1 in-window fire. `latency` = samples from window start to first in-window fire.');
  L.push('');
  L.push('| alpha | datasets | scored-normal pts | FP fires | FP/1k normal | windows | detected | detection rate | median latency (samples) |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const a of r.aggregate) {
    L.push(`| ${a.alpha} | ${a.datasets} | ${a.total_scored_normal} | ${a.total_fp_fires} | ${a.fp_per_1k_normal} | ${a.windows_scored} | ${a.windows_detected} | ${(a.detection_rate * 100).toFixed(1)}% | ${a.median_latency_samples ?? '—'} |`);
  }
  L.push('');
  L.push('## Per-dataset (alpha = 0.01)');
  L.push('');
  L.push('| dataset | n | FP fires | FP/1k normal | windows | detected | latencies (samples) |');
  L.push('|---|---|---|---|---|---|---|');
  for (const d of r.per_dataset.filter((x) => x.alpha === 0.01)) {
    L.push(`| ${d.dataset_key} | ${d.n} | ${d.fp_fires} | ${d.fp_per_1k_normal} | ${d.windows_scored} | ${d.windows_detected} | ${d.latencies_samples.join(', ') || '—'} |`);
  }
  L.push('');
  L.push('## Method');
  L.push('');
  L.push('Per dataset: calibrate `(mean, σ², φ)` on the probationary prefix (φ clipped to engine parity; innovation variance `σ²·(1-φ²)` passed as the engine `sigmaSquared`, `φ` as `ar1Phi`), then replay the remaining rows through `updateBettingState`, firing (and restarting) at wealth >= 1/alpha. Fires inside a labeled window = detection; fires in the scored-normal region = false positives. Deterministic (no RNG); re-running on the same NAB inputs is byte-identical.');
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
