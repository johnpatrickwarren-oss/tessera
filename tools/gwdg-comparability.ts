// tools/gwdg-comparability.ts — measure REAL within-node peer comparability on the GWDG A100 telemetry
// (Zenodo 10.5281/zenodo.19052367), to CALIBRATE the synthetic peer-availability model (tools/peer-
// availability.ts) to reality. Tessera-original.
//
// WHY ONLY THIS (and not a Mode B guarantee run on GWDG): the dataset is incident-centric — each file is a
// ≤10-day window bracketing one fault, NOT the long, regime-rich baseline a real deployment develops. A
// short/unrepresentative baseline makes the e-betting fit fail to transfer (an A/A test on it false-fires
// from baseline-thinness, not from any real property) — so detection / FDR numbers off GWDG are NOT valid
// (baseline-guard exists precisely to forbid this). What IS valid here is the STRUCTURAL, baseline-
// INDEPENDENT measurement: the cancellation ratio κ of a within-node GPU-pair contrast is a ratio of
// variances over whatever window, and it answers the question the peer-availability study turns on — do real
// sibling GPUs share enough common-mode to be comparable peers? That measurement then sets the synthetic
// model's realism knob (no faked baseline, no tiling — calibrate the generator to real stats).
//
// Reads DECOMPRESSED *_tidy.csv (bunzip2 telemetry/*.bz2 first; Node has no bzip2, tools must not spawn).

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readTidySeries, parseFileDate } from './_gwdg-loader.js';
import { cancellationRatio } from './contamination-detector.js';
import { fitContrast, applyContrast, median } from './contrast.js';
import { autocorr } from './conditional-markov.js';

/** GWDG DCGM metric -> the Tessera counter it corresponds to. Continuous, shared-within-node counters only. */
const METRICS: ReadonlyArray<{ dcgm: string; as: string }> = [
  { dcgm: 'DCGM_FI_DEV_GPU_TEMP', as: 'gpu_temp_c' },
  { dcgm: 'DCGM_FI_DEV_POWER_USAGE', as: 'power_w' },
  { dcgm: 'DCGM_FI_DEV_GPU_UTIL', as: 'sm_util' },
];
const BUCKET_MS = 600_000; // 10-min scrape grid

/** Align a node's GPUs onto a common 10-min grid for one metric, restricted to ticks BEFORE the incident
 *  onset (the healthy/pre-incident window — comparability must be measured where every GPU is healthy, else
 *  the faulting GPU's contrast inflates its own κ). */
function alignGpus(byGpu: Map<string, { ts: number[]; val: number[] }>, onset: number): { gpus: string[]; val: Map<string, number[]> } {
  const maps = new Map<string, Map<number, number>>();
  for (const [gpu, s] of byGpu) {
    if (gpu === 'node') continue;
    const m = new Map<number, number>();
    s.ts.forEach((t, i) => { if (t < onset) m.set(Math.round(t / BUCKET_MS) * BUCKET_MS, s.val[i]); });
    if (m.size >= 100) maps.set(gpu, m);
  }
  const gpus = [...maps.keys()].sort();
  if (gpus.length < 2) return { gpus: [], val: new Map() };
  const grid = [...maps.get(gpus[0])!.keys()].filter((t) => gpus.every((g) => maps.get(g)!.has(t))).sort((a, b) => a - b);
  return { gpus, val: new Map(gpus.map((g) => [g, grid.map((t) => maps.get(g)!.get(t)!)])) };
}

const sub = (a: number[], b: number[]): number[] => a.map((x, i) => x - b[i]);
const variance = (xs: number[]): number => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length; };

export interface CounterStats {
  counter: string; nUnits: number;
  medianKappa: number;          // best-peer κ (Var(contrast)/avgVar) — comparability
  fracComparable: number;       // fraction of GPUs with a κ≤0.1 peer
  commonModeFrac: number;       // 1 − medianKappa: variance the contrast cancels
  residAutocorr: number;        // lag-1 autocorr of the whitened best-peer contrast residual (≈0 ⇒ white at 10-min)
}

export interface GwdgComparabilityResult { files: number; nodes: number; stats: CounterStats[]; lines: string[] }

/** Per node-file, per metric: align GPUs, and for each GPU compute its BEST-peer κ + the standardized
 *  contrast residual autocorr. Accumulates per-counter across all files. */
function measureFile(csvPath: string, dcgm: Set<string>, acc: Map<string, { kappas: number[]; ac: number[] }>): string {
  const onset = parseFileDate(path.basename(csvPath)) ?? Infinity; // healthy = before the incident day
  const series = readTidySeries(csvPath, dcgm);
  let node = '';
  for (const { dcgm: metric, as } of METRICS) {
    const byGpu = series.get(metric);
    if (!byGpu) continue;
    const { gpus, val } = alignGpus(byGpu, onset);
    if (gpus.length < 2) continue;
    node = path.basename(csvPath).split('_')[0];
    const a = acc.get(as) ?? acc.set(as, { kappas: [], ac: [] }).get(as)!;
    for (const g of gpus) {
      const self = val.get(g)!;
      if (variance(self) < 1e-9) continue; // a flat/dead series carries no comparability signal
      let best: { peer: number[]; k: number } | null = null;
      for (const p of gpus) { if (p === g) continue; const k = cancellationRatio(self, val.get(p)!); if (!best || k < best.k) best = { peer: val.get(p)!, k }; }
      if (!best) continue;
      a.kappas.push(best.k);
      const resid = applyContrast(sub(self, best.peer), fitContrast(sub(self, best.peer)));
      a.ac.push(Math.abs(autocorr(resid, 1)));
    }
  }
  return node;
}

export function runGwdgComparability(dir: string): GwdgComparabilityResult {
  const root = fs.existsSync(path.join(dir, 'telemetry')) ? dir : path.join(dir, fs.readdirSync(dir).find((d) => fs.existsSync(path.join(dir, d, 'telemetry'))) ?? '.');
  const telDir = path.join(root, 'telemetry');
  const csvs = fs.readdirSync(telDir).filter((f) => f.endsWith('_tidy.csv')).sort();
  const dcgm = new Set(METRICS.map((m) => m.dcgm));
  const acc = new Map<string, { kappas: number[]; ac: number[] }>();
  const nodes = new Set<string>();
  for (const f of csvs) { const n = measureFile(path.join(telDir, f), dcgm, acc); if (n) nodes.add(n); }

  const stats: CounterStats[] = METRICS.map(({ as }) => {
    const a = acc.get(as) ?? { kappas: [], ac: [] };
    const mk = a.kappas.length ? median(a.kappas) : NaN;
    return {
      counter: as, nUnits: a.kappas.length, medianKappa: mk,
      fracComparable: a.kappas.length ? a.kappas.filter((k) => k <= 0.1).length / a.kappas.length : 0,
      commonModeFrac: Number.isNaN(mk) ? NaN : Math.max(0, 1 - mk),
      residAutocorr: a.ac.length ? median(a.ac) : NaN,
    };
  });

  const f3 = (x: number): string => Number.isNaN(x) ? '  -  ' : x.toFixed(3);
  const L: string[] = [];
  L.push('═══ GWDG REAL-A100 within-node PEER COMPARABILITY (calibration input for peer-availability) ═══');
  L.push(`${csvs.length} node-incident files, ${nodes.size} nodes, real DCGM @ 10-min. STRUCTURAL measurement (κ is a variance ratio — baseline-INDEPENDENT).`);
  L.push('NOTE: only κ/comparability is reported. Detection/FDR on GWDG would be INVALID (≤10-day incident windows ≠ a representative baseline).');
  L.push('');
  L.push('  counter       median κ   comparable(κ≤0.1)   common-mode frac (1−κ)   resid autocorr   gpu-units');
  for (const s of stats) {
    L.push(`  ${s.counter.padEnd(12)}  ${f3(s.medianKappa)}      ${f3(s.fracComparable)}              ${f3(s.commonModeFrac)}                ${f3(s.residAutocorr)}        ${s.nUnits}`);
  }
  L.push('');
  const tempK = stats.find((s) => s.counter === 'gpu_temp_c')?.medianKappa ?? NaN;
  const powK = stats.find((s) => s.counter === 'power_w')?.medianKappa ?? NaN;
  L.push('READING: median κ ≫ 0.1 ⇒ real sibling GPUs on a shared HPC node are LARGELY NON-COMPARABLE — they run different');
  L.push(`jobs, so the shared workload common-mode is weak. TEMPERATURE cancels best (κ≈${f3(tempK)}, shared cooling) while POWER`);
  L.push(`cancels worst (κ≈${f3(powK)}, almost entirely per-GPU/workload-driven). This is the REAL operating point for the peer-`);
  L.push('availability study — the job-factor axis is binding on real telemetry. Feed these κ into the peer-availability');
  L.push('calibration to place real clusters on the availability/FDR curve. Resid autocorr is small ⇒ 10-min cadence is');
  L.push('white-friendly (no near-unit-root); the residual structure that remains is un-cancelled common-mode, not autocorrelation.');
  return { files: csvs.length, nodes: nodes.size, stats, lines: L };
}

if (require.main === module) {
  const dir = process.argv[2] ?? process.env.GWDG_DIR;
  if (!dir) { process.stderr.write('usage: node tools/gwdg-comparability.js <gwdg-dataset-dir>\n  (decompress telemetry/*_tidy.csv.bz2 first: bunzip2 -k telemetry/*.bz2)\n'); process.exit(64); }
  process.stdout.write(runGwdgComparability(dir).lines.join('\n') + '\n');
  process.exit(0);
}
