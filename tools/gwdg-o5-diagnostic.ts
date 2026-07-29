// tools/gwdg-o5-diagnostic.ts — O5 on real telemetry: does a common-mode covariate render
// per-GPU residuals conditionally Markov (Assumption 3.1) on the GWDG GPU-node dataset?
//
// RESEARCH-INDEX § 2 O5 left this open with a prediction: "test on real GWDG (expected to FAIL;
// the diagnostic should say so)". The diagnostic is tools/conditional-markov.ts (ADR 0018) — a
// NECESSARY-condition gate for the stopped-e-BH fleet-FDR theorem (Wang–Dandapanthula–Ramdas
// Cor 3.4): if per-unit residuals are NOT conditionally white given the observed common mode,
// no conditional fleet-FDR theorem is earned and the fleet claim stays empirical.
//
// SUBSTRATE: Zenodo 10.5281/zenodo.19052367 (same dataset as gwdg-replay) — 10-min DCGM
// telemetry, 4 GPUs/node, ≤10-day incident windows (GWDG cannot serve LONG-window null gates,
// ADR 0022/0024 — this is a diagnostic readout, not a null-calibration gate). Per (file,
// metric, gpu): Y = the gpu's series on the common timestamp grid, X = the LEAVE-ONE-OUT mean
// of the node's other GPUs (the ADR 0016/P5 covariate form). The last `trimTailHours` of each
// incident file are dropped so the segment is predominantly healthy (afterHours ≤ 2 in the
// incident table); the "when_good" file is healthy throughout.
//
// Run: `pnpm build && node tools/gwdg-o5-diagnostic.js <dataset-dir> [--json out.json]`
//      (decompress telemetry/*.bz2 first)

import * as fs from 'node:fs';
import * as path from 'node:path';
import { conditionalMarkovDiagnostic, autocorr } from './conditional-markov.js';

/** Continuous DCGM counters worth testing (cumulative/binary/status counters excluded). */
export const O5_METRICS: ReadonlyArray<string> = [
  'DCGM_FI_DEV_GPU_TEMP', 'DCGM_FI_DEV_MEMORY_TEMP', 'DCGM_FI_DEV_POWER_USAGE',
  'DCGM_FI_DEV_SM_CLOCK', 'DCGM_FI_DEV_MEM_COPY_UTIL', 'DCGM_FI_DEV_GPU_UTIL',
];

export interface GpuSeries { byGpu: Map<number, Map<string, number>> } // gpu -> (timeUtc -> value)

/** Parse one tidy CSV into per-(metric, gpu) time-indexed maps, one metric at a time to bound
 *  memory. Returns metric -> gpu -> (time -> value). */
export function parseTidy(csv: string, metrics: ReadonlyArray<string>): Map<string, Map<number, Map<string, number>>> {
  const want = new Set(metrics);
  const out = new Map<string, Map<number, Map<string, number>>>();
  const lines = csv.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // columns: timeUtc,node,metric,value,gpu,...
    const c1 = line.indexOf(','), c2 = line.indexOf(',', c1 + 1), c3 = line.indexOf(',', c2 + 1), c4 = line.indexOf(',', c3 + 1), c5 = line.indexOf(',', c4 + 1);
    if (c4 < 0) continue;
    const metric = line.slice(c2 + 1, c3);
    if (!want.has(metric)) continue;
    const t = line.slice(0, c1);
    const value = Number(line.slice(c3 + 1, c4));
    const gpu = Number(line.slice(c4 + 1, c5 < 0 ? undefined : c5));
    if (!Number.isFinite(value) || !Number.isFinite(gpu)) continue;
    let m = out.get(metric); if (!m) { m = new Map(); out.set(metric, m); }
    let g = m.get(gpu); if (!g) { g = new Map(); m.set(gpu, g); }
    g.set(t, value);
  }
  return out;
}

/** Align a metric's per-gpu maps on their common timestamp grid (ticks where EVERY gpu reports),
 *  optionally dropping the trailing `trimTicks`. Returns per-gpu aligned arrays (same order). */
export function alignOnCommonGrid(
  m: Map<number, Map<string, number>>, trimTicks: number,
): { gpus: number[]; series: number[][] } {
  const gpus = [...m.keys()].sort((a, b) => a - b);
  if (gpus.length < 3) return { gpus: [], series: [] }; // LOO covariate needs ≥2 peers
  const grids = gpus.map((g) => m.get(g)!);
  const common = [...grids[0].keys()].filter((t) => grids.every((g) => g.has(t))).sort();
  const kept = common.slice(0, Math.max(0, common.length - trimTicks));
  return { gpus, series: grids.map((g) => kept.map((t) => g.get(t)!)) };
}

export interface O5Row {
  file: string; metric: string; gpu: number; n: number;
  rawLag1: number; condLag1: number; partialPastT: number; markovPlausible: boolean;
  degenerate: boolean; // near-constant series (variance floor) — excluded from the verdict rates
}

export function runFile(csvPath: string, trimTailHours: number): O5Row[] {
  const parsed = parseTidy(fs.readFileSync(csvPath, 'utf8'), O5_METRICS);
  const trimTicks = Math.round((trimTailHours * 60) / 10); // 10-min cadence
  const rows: O5Row[] = [];
  for (const [metric, m] of parsed) {
    const { gpus, series } = alignOnCommonGrid(m, trimTicks);
    if (!series.length || series[0].length < 40) continue;
    for (let gi = 0; gi < gpus.length; gi++) {
      const Y = series[gi];
      const X = Y.map((_, t) => {
        let s = 0;
        for (let gj = 0; gj < gpus.length; gj++) if (gj !== gi) s += series[gj][t];
        return s / (gpus.length - 1);
      });
      const mean = Y.reduce((a, v) => a + v, 0) / Y.length;
      const sd = Math.sqrt(Y.reduce((a, v) => a + (v - mean) ** 2, 0) / Y.length);
      const degenerate = !(sd > 1e-9 * Math.max(1, Math.abs(mean)));
      if (degenerate) {
        rows.push({ file: path.basename(csvPath), metric, gpu: gpus[gi], n: Y.length, rawLag1: 0, condLag1: 0, partialPastT: 0, markovPlausible: false, degenerate });
        continue;
      }
      const d = conditionalMarkovDiagnostic(Y, X);
      rows.push({
        file: path.basename(csvPath), metric, gpu: gpus[gi], n: Y.length,
        rawLag1: d.rawLag1, condLag1: d.condLag1, partialPastT: d.partialPastT,
        markovPlausible: d.markovPlausible, degenerate,
      });
    }
  }
  return rows;
}

export function summarize(rows: ReadonlyArray<O5Row>): string[] {
  const L: string[] = [];
  const live = rows.filter((r) => !r.degenerate);
  L.push(`O5 / Assumption-3.1 diagnostic on GWDG (LOO common-mode covariate; NECESSARY-condition gate)`);
  L.push(`cells: ${rows.length} (${rows.length - live.length} degenerate/near-constant excluded from rates)`);
  L.push('');
  L.push('  metric                          cells  markov-plausible  median|rawLag1|  median|condLag1|');
  const med = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : NaN;
  };
  for (const metric of O5_METRICS) {
    const g = live.filter((r) => r.metric === metric);
    if (!g.length) continue;
    const ok = g.filter((r) => r.markovPlausible).length;
    L.push(`  ${metric.padEnd(30)} ${String(g.length).padStart(5)}  ${String(ok).padStart(4)} (${(100 * ok / g.length).toFixed(0)}%)        ${med(g.map((r) => Math.abs(r.rawLag1))).toFixed(3)}            ${med(g.map((r) => Math.abs(r.condLag1))).toFixed(3)}`);
  }
  const okAll = live.filter((r) => r.markovPlausible).length;
  L.push('');
  L.push(`  TOTAL: ${okAll}/${live.length} (${(100 * okAll / Math.max(1, live.length)).toFixed(0)}%) markov-plausible`);
  return L;
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write('usage: node tools/gwdg-o5-diagnostic.js <gwdg-dataset-dir> [--json out.json]\n'); process.exit(64); }
  const telem = path.join(dir, 'telemetry');
  const files = fs.readdirSync(telem).filter((f) => f.endsWith('.csv'));
  const all: O5Row[] = [];
  for (const f of files) {
    const trim = f.includes('when_good') ? 0 : 4; // hours; incident files carry ≤2h post-incident
    all.push(...runFile(path.join(telem, f), trim));
  }
  for (const l of summarize(all)) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    fs.writeFileSync(process.argv[i + 1], JSON.stringify(all, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
}
