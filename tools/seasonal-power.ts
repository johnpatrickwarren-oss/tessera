// tools/seasonal-power.ts — does a SEASONAL (2D) baseline restore the FP guarantee on real
// telemetry where a flat baseline fails (ADR 0009)? The operator's model is a fixed-CALENDAR-period
// 2D matrix (day-of-week × time-of-day), NOT ACF auto-detection. So we test a FIXED daily-period
// seasonal baseline (seasonalMeans on [0,m), deseasonalize the bounded horizon [m,m+n)) as the
// primary, plus the engine's auto-detected decomposeSeasonal for contrast, vs the flat baseline.
// Real GWDG GPU_UTIL (daily-cycle load metric); all healthy → every fire is a false alarm.
// See ADR 0010. Tessera-original; NOT vendored.

import { decomposeSeasonal, seasonalMeans, deseasonalize } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/seasonal';
import { calibrateBaseline } from './shadow-replay.js';
import { terminalEValueWith } from './fleet-fdr.js';
import { readTidySeries } from './_gwdg-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const METRIC = 'DCGM_FI_DEV_GPU_UTIL';
export const M = 800;          // baseline window (≥ ~3 daily periods @144)
export const N_TEST = 200;     // bounded monitoring horizon
export const DAILY = 144;      // 10-min cadence → 144 samples/day (the operator's calendar period)
export const MIN_STREAMS = 20;

function mean(xs: ReadonlyArray<number>): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function round3(x: number): number { return Math.round(x * 1000) / 1000; }

function eValueOn(v: ReadonlyArray<number>, m: number, n: number): number {
  const cal = calibrateBaseline(v.slice(0, m), 'simple');
  return terminalEValueWith(v.slice(0, m + n), m, cal.mean, cal.innovationVar, cal.phi);
}

/** Flat baseline (ADR 0009). */
export function flatEValue(v: ReadonlyArray<number>, m: number, n: number): number { return eValueOn(v, m, n); }

/** FIXED calendar-period seasonal baseline (the operator's 2D matrix): per-phase means from [0,m),
 *  deseasonalize the whole window (no lookahead — means are from [0,m) only), then the flat construction. */
export function seasonalEValueFixed(v: ReadonlyArray<number>, m: number, n: number, period: number): number {
  const base = v.slice(0, m);
  const s = seasonalMeans(base, period, mean(base));
  return eValueOn(deseasonalize(v.slice(0, m + n), s, period, 0), m, n);
}

/** Engine ACF-auto-detected seasonal baseline (for contrast — finds the dominant period, which on
 *  load metrics is short-range autocorrelation, not the daily cycle). Returns {e, period}. */
export function seasonalEValueAuto(v: ReadonlyArray<number>, m: number, n: number): { e: number; period: number } {
  const base = v.slice(0, m);
  const dec = decomposeSeasonal(base, mean(base));
  if (dec.period === 0) return { e: flatEValue(v, m, n), period: 0 };
  return { e: eValueOn(deseasonalize(v.slice(0, m + n), dec.seasonal_means, dec.period, 0), m, n), period: dec.period };
}

interface Arm { label: string; fires: number; p_fire: number; honors_alpha: boolean; }

export interface SeasonalReport {
  schema_version: 'tessera-seasonal-power-v1';
  provenance: { dataset: string; metric: string; alpha: number; m: number; n_test: number; daily_period: number };
  n_streams: number; n_auto_period_detected: number;
  arms: Arm[];
}

/** Collect per-GPU streams (≥ M+N_TEST long) for the metric across all telemetry files. */
function collectStreams(telem: string, metric: string): number[][] {
  const csvs = fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort().map((f) => path.join(telem, f));
  const streams: number[][] = [];
  for (const csv of csvs) {
    const byGpu = readTidySeries(csv, new Set([metric])).get(metric);
    if (!byGpu) continue;
    for (const s of byGpu.values()) if (s.val.length >= M + N_TEST) streams.push(s.val);
  }
  return streams;
}

/** Fire counts for the three baselines (flat / fixed-daily-seasonal / ACF-auto-seasonal). */
function scoreStreams(streams: number[][]): { flat: number; daily: number; auto: number; autoDetected: number } {
  let flat = 0, daily = 0, auto = 0, autoDetected = 0;
  for (const v of streams) {
    if (flatEValue(v, M, N_TEST) >= 1 / ALPHA) flat++;
    if (seasonalEValueFixed(v, M, N_TEST, DAILY) >= 1 / ALPHA) daily++;
    const a = seasonalEValueAuto(v, M, N_TEST);
    if (a.period > 0) autoDetected++;
    if (a.e >= 1 / ALPHA) auto++;
  }
  return { flat, daily, auto, autoDetected };
}

export function runSeasonalPower(gwdgDir: string, metric: string = METRIC): SeasonalReport {
  const streams = collectStreams(path.join(gwdgDir, 'telemetry'), metric);
  const { flat, daily, auto, autoDetected } = scoreStreams(streams);
  const n = streams.length;
  const arm = (label: string, fires: number): Arm => ({ label, fires, p_fire: n ? round3(fires / n) : 0, honors_alpha: n >= MIN_STREAMS && (n ? fires / n : 0) <= ALPHA });
  return {
    schema_version: 'tessera-seasonal-power-v1',
    provenance: { dataset: 'GWDG-' + metric, metric, alpha: ALPHA, m: M, n_test: N_TEST, daily_period: DAILY },
    n_streams: n, n_auto_period_detected: autoDetected,
    arms: [arm('flat (ADR 0009)', flat), arm(`seasonal · fixed daily (P=${DAILY})`, daily), arm('seasonal · ACF auto-period', auto)],
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

/** The honest verdict for the flat→daily-seasonal comparison. */
function seasonalVerdict(flat: Arm, daily: Arm): string {
  const move = `(${pct(flat.p_fire)} → ${pct(daily.p_fire)})`;
  if (daily.honors_alpha) return `**The seasonal baseline restores the guarantee on real data:** the fixed daily-period baseline drops P(fire) ${move} ≤ α — capturing the daily structure a flat mean missed validates the operator's 2D-baseline model.`;
  if (daily.p_fire < flat.p_fire - 0.02) return `**Partial — the seasonal baseline helps but does not reach ≤ α** ${move}. Daily seasonality is part of the within-window variation, but the residual over-firing is **workload-driven, non-periodic** change (jobs starting/stopping move GPU_UTIL by real amounts) — not removable by ANY single-shard baseline. That residual is what the operational lifecycle (drift-triggered re-record → shadow → cutover) and fleet-relative comparison (other GPUs as controls) are for.`;
  return `**Honest negative — the seasonal baseline does NOT help** ${move}. The within-window variation here is **workload-driven, non-periodic** (real GPU_UTIL swings from jobs), not daily seasonality — so a richer single-shard baseline cannot remove it. Only the operational lifecycle (re-record/refresh) + fleet-relative comparison address legitimate-but-non-failure workload change.`;
}

function renderMd(r: SeasonalReport): string {
  const L: string[] = [];
  L.push('# Tessera — does a SEASONAL (2D) baseline restore the FP guarantee on real telemetry?');
  L.push('');
  L.push(`ADR 0009: a long FLAT baseline still over-fires on real data (within-window variation). The operator's model is a fixed-calendar-period 2D baseline. On real GWDG \`${r.provenance.metric}\` (daily-cycle load metric) we compare FLAT vs **fixed daily-period** seasonal (P=${r.provenance.daily_period}, the operator's model) vs ACF-auto-detected seasonal. Calibrated on [0,m) only; all healthy → every fire is a false alarm. m=${r.provenance.m}, n=${r.provenance.n_test}, α=${r.provenance.alpha}.`);
  L.push('');
  L.push(`${r.n_streams} real per-GPU streams; the ACF auto-detector found a period in ${r.n_auto_period_detected}/${r.n_streams}.`);
  L.push('');
  L.push('| baseline | fires | P(fire) | honors α? |');
  L.push('|---|---|---|---|');
  for (const a of r.arms) L.push(`| ${a.label} | ${a.fires}/${r.n_streams} | ${pct(a.p_fire)} | ${a.honors_alpha ? '✅' : '❌'} |`);
  L.push('');
  L.push(seasonalVerdict(r.arms[0], r.arms[1]));
  L.push('');
  L.push('> **Reading this honestly:** GPU_UTIL is workload-driven, so much of its within-window variation is *legitimate* (a running job is not a fault). This experiment separates the variation into seasonal (a fixed baseline can absorb) vs workload/drift (only operational refresh + fleet-relative can). It does NOT by itself validate or refute the operator model — it locates where the remaining problem lives: distinguishing legitimate workload change from failure, which is an operational + fleet question, not a single-shard-baseline question.');
  L.push('');
  return L.join('\n');
}

export function writeSeasonalPower(gwdgDir: string, outDir: string): { json: string; md: string } {
  const report = runSeasonalPower(gwdgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'seasonal-power-report.json');
  const md = path.join(outDir, 'seasonal-power-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const dir = process.argv[2] ?? process.env.GWDG_DIR;
  if (!dir) { process.stderr.write('usage: node tools/seasonal-power.js <gwdg-dataset-dir>\n'); process.exit(64); }
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeSeasonalPower(dir, out);
  process.stdout.write(`Seasonal-power report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
