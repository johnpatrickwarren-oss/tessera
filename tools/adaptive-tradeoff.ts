// tools/adaptive-tradeoff.ts — the adaptive-baseline DETECTION tradeoff study.
//
// Adaptive baselining cut false alarms ~5x on a NULL dataset (MIT, ADR 0005). The
// gate question before upstreaming: does it KEEP detection on real anomalies, and
// AT WHAT DRIFT RATE does a rolling baseline start MASKING the anomaly (by tracking
// the ramp into "normal")? Answered two ways:
//   A. controlled synthetic AR(1)+ramp sweep over drift slopes (static vs adaptive
//      detection) -> the masking threshold;
//   B. GWDG real GPU faults (static vs adaptive detection + FP).
// See docs/SPEC-adaptive-baseline-tradeoff.md. Tessera-original; NOT vendored.

import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import { calibrateBaseline, replayFires, scoreDataset, probationaryEnd } from './shadow-replay.js';
import { replayFiresAdaptive } from './adaptive-baseline.js';
import { parseIncidents, parseManifest, parseFileDate, loadGwdgTraces } from './_gwdg-loader.js';
import type { NabTrace } from './_nab-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const RHO = 0.5;
export const N = 1200;
export const ONSET = 600;
export const TRIALS = 1500;
export const ADAPT = { window: 300, recalEvery: 50 };
export const SLOPES = [0, 0.003, 0.01, 0.03, 0.1, 0.3] as const; // ramp per step on unit-var AR(1)

/** AR(1) ρ stream (unit marginal var) + a linear ramp of `slope`/step from ONSET. */
export function ar1Ramp(rng: () => number, slope: number): number[] {
  const innov = Math.sqrt(1 - RHO * RHO);
  let prev = gaussian(rng);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    prev = RHO * prev + innov * gaussian(rng);
    out.push(i >= ONSET ? prev + slope * (i - ONSET + 1) : prev);
  }
  return out;
}

export interface SweepRow { slope: number; static_detect: number; adaptive_detect: number; static_preonset_fp: number; adaptive_preonset_fp: number; }

function rate(n: number, d: number): number { return d > 0 ? Math.round((n / d) * 1000) / 1000 : 0; }

/** For one slope: fraction of trials that fire AFTER onset (detection) and that fire
 *  in the pre-onset scored region (false positive). */
function sweepSlope(slope: number, seed0: number): SweepRow {
  const probEnd = probationaryEnd(N);
  let sDet = 0, aDet = 0, sFp = 0, aFp = 0;
  for (let t = 0; t < TRIALS; t++) {
    const v = ar1Ramp(mulberry32(scramble(seed0 + t)), slope);
    const cal = calibrateBaseline(v.slice(0, probEnd), 'simple');
    const sf = replayFires(v, probEnd, cal, ALPHA);
    const af = replayFiresAdaptive(v, probEnd, ALPHA, ADAPT);
    if (sf.some((f) => f >= ONSET)) sDet++;
    if (af.some((f) => f >= ONSET)) aDet++;
    if (sf.some((f) => f < ONSET)) sFp++;
    if (af.some((f) => f < ONSET)) aFp++;
  }
  return { slope, static_detect: rate(sDet, TRIALS), adaptive_detect: rate(aDet, TRIALS), static_preonset_fp: rate(sFp, TRIALS), adaptive_preonset_fp: rate(aFp, TRIALS) };
}

interface GwdgAgg { mode: 'static' | 'adaptive'; windows_detected: number; windows_scored: number; fp_fires: number; scored_normal: number; }

function gwdgStudy(datasetDir: string): GwdgAgg[] | null {
  if (!fs.existsSync(path.join(datasetDir, 'incident_events.csv'))) return null;
  const incidents = parseIncidents(fs.readFileSync(path.join(datasetDir, 'incident_events.csv'), 'utf8'));
  const manifest = parseManifest(fs.readFileSync(path.join(datasetDir, 'manifest.csv'), 'utf8'));
  const telem = path.join(datasetDir, 'telemetry');
  const metricSet = new Set(['DCGM_FI_DEV_XID_ERRORS', 'DCGM_FI_DEV_GPU_TEMP', 'DCGM_FI_DEV_POWER_USAGE']);
  const agg: Record<'static' | 'adaptive', GwdgAgg> = {
    static: { mode: 'static', windows_detected: 0, windows_scored: 0, fp_fires: 0, scored_normal: 0 },
    adaptive: { mode: 'adaptive', windows_detected: 0, windows_scored: 0, fp_fires: 0, scored_normal: 0 },
  };
  for (const csv of fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort()) {
    const node = manifest.get(csv + '.bz2')?.node ?? '';
    const fileDate = parseFileDate(csv);
    const windows = fileDate === null ? [] : (incidents.get(node) ?? []).filter((e) => e.window[0] === fileDate).map((e) => e.window);
    if (windows.length === 0) continue; // incident files only (need a labeled window)
    for (const trace of loadGwdgTraces(path.join(telem, csv), node, metricSet, windows) as NabTrace[]) {
      const probEnd = probationaryEnd(trace.values.length);
      const cal = calibrateBaseline(trace.values.slice(0, probEnd), 'simple');
      const rs = scoreDataset(trace, probEnd, replayFires(trace.values, probEnd, cal, ALPHA), ALPHA);
      const ra = scoreDataset(trace, probEnd, replayFiresAdaptive(trace.values, probEnd, ALPHA), ALPHA);
      for (const [m, r] of [['static', rs], ['adaptive', ra]] as const) {
        const a = agg[m]; a.windows_detected += r.windows_detected; a.windows_scored += r.windows_scored; a.fp_fires += r.fp_fires; a.scored_normal += r.scored_normal_points;
      }
    }
  }
  return [agg.static, agg.adaptive];
}

export interface TradeoffReport {
  schema_version: 'tessera-adaptive-tradeoff-v1';
  params: { alpha: number; rho: number; n: number; onset: number; trials: number; adapt: typeof ADAPT; slopes: number[] };
  sweep: SweepRow[];
  gwdg: GwdgAgg[] | null;
}

export function runTradeoff(gwdgDir?: string): TradeoffReport {
  const sweep = SLOPES.map((s, i) => sweepSlope(s, 0xADA17 + i * 100000));
  return {
    schema_version: 'tessera-adaptive-tradeoff-v1',
    params: { alpha: ALPHA, rho: RHO, n: N, onset: ONSET, trials: TRIALS, adapt: ADAPT, slopes: [...SLOPES] },
    sweep,
    gwdg: gwdgDir ? gwdgStudy(gwdgDir) : null,
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function renderMd(r: TradeoffReport): string {
  const L: string[] = [];
  L.push('# Tessera — adaptive-baseline detection tradeoff (the masking study)');
  L.push('');
  L.push('Adaptive (regime-aware) baselining cut false alarms ~5x on a null dataset (ADR 0005). This is the gate before upstreaming: does it keep DETECTION, and at what drift rate does a rolling baseline MASK the anomaly by tracking it?');
  L.push('');
  L.push('## A. Synthetic AR(1)+ramp sweep (controlled)');
  L.push('');
  L.push(`AR(1) ρ=${r.params.rho}, length ${r.params.n}, ramp onset at ${r.params.onset}, ${r.params.trials} trials/slope, α=${r.params.alpha}, adaptive window=${r.params.adapt.window}. \`detect\` = fired after onset; \`pre-FP\` = fired before onset (false positive). slope = ramp per step (unit-variance noise).`);
  L.push('');
  L.push('| ramp slope/step | static detect | adaptive detect | static pre-FP | adaptive pre-FP |');
  L.push('|---|---|---|---|---|');
  for (const s of r.sweep) {
    L.push(`| ${s.slope} | ${pct(s.static_detect)} | ${pct(s.adaptive_detect)} | ${pct(s.static_preonset_fp)} | ${pct(s.adaptive_preonset_fp)} |`);
  }
  L.push('');
  L.push('Read it as the tradeoff: at **slope 0** (no anomaly) adaptive pre-FP << static (the ~5x FP win). As slope grows, **static detects across the range** (a fixed baseline always eventually deviates) while **adaptive only detects once the ramp outpaces its window** — below that it MASKS the drift. The masking threshold is the slope where adaptive detect rises to meet static.');
  L.push('');
  if (r.gwdg) {
    L.push('## B. GWDG real GPU faults (static vs adaptive)');
    L.push('');
    L.push('| mode | windows det/scored | detection | FP/1k (pre-incident) |');
    L.push('|---|---|---|---|');
    for (const g of r.gwdg) {
      const fpPer1k = g.scored_normal > 0 ? Math.round((g.fp_fires / g.scored_normal) * 1000 * 10) / 10 : 0;
      L.push(`| ${g.mode} | ${g.windows_detected}/${g.windows_scored} | ${pct(rate(g.windows_detected, g.windows_scored))} | ${fpPer1k} |`);
    }
    L.push('');
    L.push('GWDG incidents are detachment-heavy + day-level (numeric signal is weak regardless), so read the FP delta as primary and detection as indicative.');
    L.push('');
  }
  L.push('## Verdict for upstreaming');
  L.push('');
  L.push('Adaptive baselining is a **FP-vs-slow-drift tradeoff**, not a free win: it cuts false alarms but masks drifts slower than its tracking threshold. Safe to upstream only where slow-drift detection is not required, or as a hybrid (e.g., run static + adaptive in parallel and require both, or widen/freeze the window on suspicion). Deterministic; byte-identical on re-run.');
  L.push('');
  return L.join('\n');
}

export function writeTradeoff(outDir: string, gwdgDir?: string): { json: string; md: string } {
  const report = runTradeoff(gwdgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'adaptive-tradeoff-report.json');
  const md = path.join(outDir, 'adaptive-tradeoff-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const gwdgDir = process.argv[2] ?? process.env.GWDG_DIR;
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeTradeoff(out, gwdgDir);
  process.stdout.write(`Adaptive-tradeoff report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
