// tools/gwdg-replay.ts — run Tessera's NUMERIC per-shard detector on the real
// GWDG GPU-node telemetry (Zenodo 10.5281/zenodo.19052367), scored against
// operator failure labels. Reuses the shadow-replay scoring core.
//
// SCOPE: per-shard NUMERIC detector on real GPU faults. Most labeled incidents
// are detachment-class (minimal numeric precursor) — so this also quantifies the
// numeric detector's BLIND SPOT, motivating the structural detector (gap B). Does
// NOT validate topology / common-mode / fleet (independent HPC nodes, no coupled
// fabric). See docs/SPEC-gwdg-real-gpu-validation.md. Tessera-original; NOT vendored.

import { calibrateBaseline, replayFires, scoreDataset, probationaryEnd } from './shadow-replay.js';
import { parseIncidents, parseManifest, loadGwdgTraces, parseFileDate } from './_gwdg-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const NUMERIC_METRICS = [
  'DCGM_FI_DEV_XID_ERRORS', 'DCGM_FI_DEV_GPU_TEMP', 'DCGM_FI_DEV_MEMORY_TEMP',
  'DCGM_FI_DEV_POWER_USAGE', 'DCGM_FI_DEV_GPU_UTIL',
] as const;
export const ALPHA = 0.01;

interface MetricAgg {
  metric: string;
  good_shards: number; good_scored_normal: number; good_fp_fires: number; good_fp_per_1k: number;
  incident_shards: number; windows_scored: number; windows_detected: number;
  incident_fp_fires: number; incident_scored_normal: number; incident_fp_per_1k: number;
}

function round3(x: number): number { return Math.round(x * 1000) / 1000; }

export interface GwdgReport {
  schema_version: 'tessera-gwdg-numeric-v1';
  provenance: { dataset: string; alpha: number; metrics: string[]; n_files: number; n_incident_files: number; n_incident_windows_scored: number };
  per_metric: MetricAgg[];
  totals: { detection_rate: number; windows_detected: number; windows_scored: number; fp_per_1k_normal: number };
}

export function runGwdgReplay(datasetDir: string): GwdgReport {
  const incidents = parseIncidents(fs.readFileSync(path.join(datasetDir, 'incident_events.csv'), 'utf8'));
  const manifest = parseManifest(fs.readFileSync(path.join(datasetDir, 'manifest.csv'), 'utf8'));
  const telemetryDir = path.join(datasetDir, 'telemetry');
  const csvs = fs.readdirSync(telemetryDir).filter((f) => f.endsWith('.csv')).sort();
  const metricSet = new Set<string>(NUMERIC_METRICS);

  // metric -> accumulators (good vs incident)
  const acc = new Map<string, MetricAgg>();
  for (const m of NUMERIC_METRICS) acc.set(m, { metric: m, good_shards: 0, good_scored_normal: 0, good_fp_fires: 0, good_fp_per_1k: 0, incident_shards: 0, windows_scored: 0, windows_detected: 0, incident_fp_fires: 0, incident_scored_normal: 0, incident_fp_per_1k: 0 });
  let nIncidentFiles = 0;
  let nWindowsScored = 0; // unique incident windows that actually fall within a scored file

  for (const csv of csvs) {
    const entry = manifest.get(csv + '.bz2');
    const node = entry?.node ?? '';
    // H1/H2 fix: this file is named for ONE incident date; attach only the node's
    // incident(s) on that date, so a window is scored in exactly one file (no
    // cross-file double-counting, no ghost-incident files).
    const fileDate = parseFileDate(csv);
    const windows = fileDate === null ? []
      : (incidents.get(node) ?? []).filter((e) => e.window[0] === fileDate).map((e) => e.window);
    const isIncidentFile = windows.length > 0;
    if (isIncidentFile) { nIncidentFiles++; nWindowsScored += windows.length; }
    const traces = loadGwdgTraces(path.join(telemetryDir, csv), node, metricSet, windows);
    for (const trace of traces) {
      const metric = trace.dataset_key.split('/')[2];
      const a = acc.get(metric); if (!a) continue;
      const probEnd = probationaryEnd(trace.values.length);
      const cal = calibrateBaseline(trace.values.slice(0, probEnd), 'simple');
      const r = scoreDataset(trace, probEnd, replayFires(trace.values, probEnd, cal, ALPHA), ALPHA);
      if (isIncidentFile) {
        a.incident_shards++; a.windows_scored += r.windows_scored; a.windows_detected += r.windows_detected;
        a.incident_fp_fires += r.fp_fires; a.incident_scored_normal += r.scored_normal_points;
      } else {
        a.good_shards++; a.good_scored_normal += r.scored_normal_points; a.good_fp_fires += r.fp_fires;
      }
    }
  }

  const per_metric = [...acc.values()].map((a) => ({
    ...a,
    good_fp_per_1k: a.good_scored_normal > 0 ? round3((a.good_fp_fires / a.good_scored_normal) * 1000) : 0,
    incident_fp_per_1k: a.incident_scored_normal > 0 ? round3((a.incident_fp_fires / a.incident_scored_normal) * 1000) : 0,
  }));
  const wDet = per_metric.reduce((s, m) => s + m.windows_detected, 0);
  const wScored = per_metric.reduce((s, m) => s + m.windows_scored, 0);
  // FP over ALL real normal telemetry: incident files' pre/inter-window regions + non-incident files.
  const fp = per_metric.reduce((s, m) => s + m.incident_fp_fires + m.good_fp_fires, 0);
  const norm = per_metric.reduce((s, m) => s + m.incident_scored_normal + m.good_scored_normal, 0);
  return {
    schema_version: 'tessera-gwdg-numeric-v1',
    provenance: { dataset: 'GWDG-GPU-node-telemetry-zenodo-19052367', alpha: ALPHA, metrics: [...NUMERIC_METRICS], n_files: csvs.length, n_incident_files: nIncidentFiles, n_incident_windows_scored: nWindowsScored },
    per_metric,
    totals: { detection_rate: wScored > 0 ? round3(wDet / wScored) : 0, windows_detected: wDet, windows_scored: wScored, fp_per_1k_normal: norm > 0 ? round3((fp / norm) * 1000) : 0 },
  };
}

function renderMd(r: GwdgReport): string {
  const L: string[] = [];
  L.push('# Tessera — GWDG real-GPU numeric-detector validation');
  L.push('');
  L.push('Tessera\'s per-shard NUMERIC betting e-process run on REAL A100 telemetry (GWDG, Zenodo 10.5281/zenodo.19052367) with operator failure labels, observe-only. Each (file, gpu, metric) is a shard.');
  L.push('');
  L.push('> **Scope:** validates the per-shard NUMERIC detector on real GPU faults. The labeled incidents are **detachment-heavy** (minimal numeric precursor), so low numeric detection is EXPECTED and quantifies the blind spot the structural detector (gap B) targets. Does NOT validate topology / common-mode / fleet (independent HPC nodes, no coupled fabric). Labels are day-level (coarse latency).');
  L.push('');
  L.push(`Files: ${r.provenance.n_files} (${r.provenance.n_incident_files} with an in-range incident, rest normal). Unique incident windows scored (filtered to each file's time range): ${r.provenance.n_incident_windows_scored}. α=${r.provenance.alpha}.`);
  L.push('');
  L.push('## Per-metric (numeric)');
  L.push('');
  L.push('Per-metric `FP/1k` = false-positive fires per 1000 scored-normal points in incident files\' **normal (pre/inter-window) regions**; the overall FP also folds in non-incident files\' normal data. `detection` = the 2h post-onset incident windows (filtered to each file\'s time range) with ≥1 in-window fire. (The "when-good" files are healthy-GPU-**count** aggregates, not per-GPU DCGM, so they yield no numeric shards.)');
  L.push('');
  L.push('| metric | incident shards | FP/1k (incident-file normal) | windows det/scored |');
  L.push('|---|---|---|---|');
  for (const m of r.per_metric) {
    L.push(`| ${m.metric} | ${m.incident_shards} | ${m.incident_fp_per_1k} | ${m.windows_detected}/${m.windows_scored} |`);
  }
  L.push('');
  L.push(`**Overall:** detection ${(r.totals.detection_rate * 100).toFixed(1)}% (${r.totals.windows_detected}/${r.totals.windows_scored} windows); FP ${r.totals.fp_per_1k_normal}/1k on real pre-incident normal telemetry. Interpret detection against this FP (a detector firing everywhere would also "detect"). Deterministic; byte-identical on re-run.`);
  L.push('');
  return L.join('\n');
}

export function writeGwdgReport(datasetDir: string, outDir: string): { json: string; md: string } {
  const report = runGwdgReplay(datasetDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'gwdg-numeric-report.json');
  const md = path.join(outDir, 'gwdg-numeric-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) {
  const dir = process.argv[2] ?? process.env.GWDG_DIR;
  if (!dir) { process.stderr.write('usage: node tools/gwdg-replay.js <gwdg-dataset-dir>   (decompress telemetry/*.bz2 first)\n'); process.exit(64); }
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeGwdgReport(dir, out);
  process.stdout.write(`GWDG numeric report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
