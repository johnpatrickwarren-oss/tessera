// tools/mit-replay.ts — FP-at-scale calibration on real MIT Supercloud GPU
// telemetry, comparing a STATIC baseline vs an ADAPTIVE (regime-aware, rolling)
// baseline — gap #2's first real test on a fleet-scale NULL dataset.
//
// No GPU-fault labels -> every fire is a false alarm. The question: does adaptive
// baselining cut the over-firing (~3% on GWDG/NAB) driven by regime shifts? On a
// NULL dataset there are no anomalies to mask, so this isolates the FP effect; on
// a labeled dataset adaptive baselining would risk masking slow drifts (noted).
// See docs/SPEC-mit-supercloud-fp-calibration.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { calibrateBaseline, replayFires, scoreDataset, probationaryEnd, type Baseline } from './shadow-replay.js';
import { loadMitTraces, listMitGpuCsvs, MIT_METRIC_COL } from './_mit-supercloud-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const METRICS = Object.keys(MIT_METRIC_COL);
export const ALPHA = 0.01;
export const ADAPT_WINDOW = 500;   // trailing samples for the rolling baseline (~50s @100ms)
export const ADAPT_RECAL_EVERY = 100;

/** Adaptive replay: recompute the baseline from a trailing window every
 *  ADAPT_RECAL_EVERY ticks, so it tracks regime shifts. Restart-on-fire. */
export function replayFiresAdaptive(values: ReadonlyArray<number>, probEnd: number, alpha: number): number[] {
  let cal: Baseline = calibrateBaseline(values.slice(0, probEnd), 'simple');
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const fires: number[] = [];
  for (let i = probEnd; i < values.length; i++) {
    updateBettingState(state, values[i], cal.mean, cal.innovationVar, alpha, cal.phi);
    if (state.M >= threshold) { fires.push(i); state = freshBettingState(); }
    if ((i - probEnd) % ADAPT_RECAL_EVERY === 0 && i > probEnd) {
      // Trailing-window recalibration. NOTE: while i <= ADAPT_WINDOW, lo=0 so this
      // is a growing prefix, not yet a true trailing window (matters only for short
      // traces); it becomes strictly trailing once i > ADAPT_WINDOW. No lookahead
      // either way (slice ends at i, the current tick is scored with the prior cal).
      const lo = Math.max(0, i - ADAPT_WINDOW);
      cal = calibrateBaseline(values.slice(lo, i), 'simple');
    }
  }
  return fires;
}

function round3(x: number): number { return Math.round(x * 1000) / 1000; }

interface ModeAgg { mode: 'static' | 'adaptive'; metric: string; shards: number; scored_normal: number; fp_fires: number; fp_per_1k: number; }

export interface MitReport {
  schema_version: 'tessera-mit-fp-v1';
  provenance: { dataset: string; alpha: number; metrics: string[]; n_files: number; adapt_window: number; adapt_recal_every: number };
  per_mode_metric: ModeAgg[];
  totals: Array<{ mode: 'static' | 'adaptive'; fp_per_1k: number; shards: number }>;
}

export function runMitReplay(gpuDir: string): MitReport {
  const csvs = listMitGpuCsvs(gpuDir);
  const acc = new Map<string, ModeAgg>();
  const key = (mode: string, m: string) => `${mode}|${m}`;
  for (const mode of ['static', 'adaptive'] as const) for (const m of METRICS) acc.set(key(mode, m), { mode, metric: m, shards: 0, scored_normal: 0, fp_fires: 0, fp_per_1k: 0 });

  for (const csv of csvs) {
    for (const trace of loadMitTraces(csv, METRICS)) {
      const metric = trace.dataset_key.split('/')[2];
      const probEnd = probationaryEnd(trace.values.length);
      const cal = calibrateBaseline(trace.values.slice(0, probEnd), 'simple');
      const staticFires = replayFires(trace.values, probEnd, cal, ALPHA);
      const adaptiveFires = replayFiresAdaptive(trace.values, probEnd, ALPHA);
      for (const [mode, fires] of [['static', staticFires], ['adaptive', adaptiveFires]] as const) {
        const r = scoreDataset(trace, probEnd, fires, ALPHA); // windows empty -> fp = all fires
        const a = acc.get(key(mode, metric))!;
        a.shards++; a.scored_normal += r.scored_normal_points; a.fp_fires += r.fp_fires;
      }
    }
  }
  const per = [...acc.values()].map((a) => ({ ...a, fp_per_1k: a.scored_normal > 0 ? round3((a.fp_fires / a.scored_normal) * 1000) : 0 }));
  const totals = (['static', 'adaptive'] as const).map((mode) => {
    const ms = per.filter((p) => p.mode === mode);
    const fp = ms.reduce((s, p) => s + p.fp_fires, 0), n = ms.reduce((s, p) => s + p.scored_normal, 0);
    return { mode, fp_per_1k: n > 0 ? round3((fp / n) * 1000) : 0, shards: ms.reduce((s, p) => s + p.shards, 0) };
  });
  return {
    schema_version: 'tessera-mit-fp-v1',
    provenance: { dataset: 'MIT-Supercloud-gpu-per-job-sample', alpha: ALPHA, metrics: METRICS, n_files: csvs.length, adapt_window: ADAPT_WINDOW, adapt_recal_every: ADAPT_RECAL_EVERY },
    per_mode_metric: per, totals,
  };
}

function renderMd(r: MitReport): string {
  const L: string[] = [];
  L.push('# Tessera — MIT Supercloud FP-at-scale (static vs adaptive baseline)');
  L.push('');
  L.push('Tessera\'s per-shard detector on REAL MIT Supercloud GPU telemetry (nvidia-smi @100ms), observe-only. **No GPU-fault labels → every fire is a false alarm**, so this is a pure false-alarm (null) calibration. `static` = single baseline from the first 15%; `adaptive` = trailing-window recalibration (gap #2, regime-aware).');
  L.push('');
  L.push(`> **Scope:** per-shard NUMERIC FP calibration on a real GPU fleet sample. NOT detection (no faults) and NOT topology/fleet. On a null dataset adaptive baselining has no anomalies to mask; on labeled data it would risk masking slow drifts (a tradeoff to measure later). \`replayFiresAdaptive\` is a **prototype** scoped to this harness — NOT promoted into the engine/production detector.`);
  L.push('');
  L.push(`Files: ${r.provenance.n_files} per-job GPU traces. α=${r.provenance.alpha}; adaptive window=${r.provenance.adapt_window}, recal every ${r.provenance.adapt_recal_every}.`);
  L.push('');
  L.push('| metric | static FP/1k | adaptive FP/1k | shards |');
  L.push('|---|---|---|---|');
  for (const m of METRICS) {
    const s = r.per_mode_metric.find((p) => p.mode === 'static' && p.metric === m)!;
    const a = r.per_mode_metric.find((p) => p.mode === 'adaptive' && p.metric === m)!;
    L.push(`| ${m} | ${s.fp_per_1k} | ${a.fp_per_1k} | ${s.shards} |`);
  }
  const st = r.totals.find((t) => t.mode === 'static')!, ad = r.totals.find((t) => t.mode === 'adaptive')!;
  L.push('');
  L.push(`**Overall:** static ${st.fp_per_1k}/1k vs adaptive ${ad.fp_per_1k}/1k across ${st.shards} shards. ${ad.fp_per_1k < st.fp_per_1k ? 'Adaptive (regime-aware) baselining reduces false alarms' : 'Adaptive baselining did NOT reduce false alarms here'} — the gap #2 question, answered on real fleet telemetry. Deterministic; byte-identical on re-run.`);
  L.push('');
  return L.join('\n');
}

export function writeMitReport(gpuDir: string, outDir: string): { json: string; md: string } {
  const report = runMitReplay(gpuDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'mit-fp-report.json');
  const md = path.join(outDir, 'mit-fp-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

// CLI guard (CommonJS — tsconfig compiles to CJS; matches the other tools/*).
if (require.main === module) {
  const dir = process.argv[2] ?? process.env.MIT_GPU_DIR;
  if (!dir) { process.stderr.write('usage: node tools/mit-replay.js <dir-of-per-job-gpu-csvs>\n'); process.exit(64); }
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeMitReport(dir, out);
  process.stdout.write(`MIT FP report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
