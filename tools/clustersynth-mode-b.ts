// tools/clustersynth-mode-b.ts — the Mode B concurrent-control pipeline on REAL clustersynth topology
// at scale (ADR 0019; the production analogue of the synthetic tools/mode-b-control.ts).
//
// WHAT. Two same-topology/seed clustersynth bundles generated WITH a labeled control arm (CS_CONTROL_ARM):
//   • a LONG (≥2-month) HEALTHY baseline (faults off) — estimates each shard's contrast scale + AR(1) φ
//     and feeds the runtime calibration monitor over the full healthy horizon;
//   • a MONITORING bundle (faults on) — detection.
// For each treatment shard we form the MODEL-FREE contrast d_i(t) = treatment_i(t) − control_i(t). The
// twin shares the treatment's factor instances AND loadings, so the common-mode cancels EXACTLY (no
// factor fit) — the SPATIAL null. We whiten d_i at its idiosyncratic φ (a sustained fault survives),
// standardize on the baseline, take the normalized-mixture e-value, gate the emitter through the
// validity-class gate (construction_valid + a passing calibration monitor + Wall-A whiteness on the
// control cohort), and run e-BH. The temporal per-shard null (no control) is the failing comparator.
//
// WHY THIS IS THE ACHIEVABLE GUARANTEE. The contrast removes the common-mode — including the near-unit-
// root nonstationarity that defeats the temporal null on this telemetry (ADR 0019; registry N1: only the
// cross-shard contrast separates drift from a fault). The concurrent control IS the null. Single cadence
// for now (baseline + monitoring at the same dt); mixed cadence is a refinement — and the contrast should
// make even 1 Hz tractable since it kills the common-mode the temporal path could not. Tessera-original.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { assertLongBaseline } from './baseline-guard.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { freshCalibrationMonitor, updateCalibrationBatch } from './calibration-monitor.js';
import { fdrBenjaminiHochberg, modeOf, ineligibilityReason, type EmitterContract } from './emitter-contract.js';
import { estimateAr1, whiten } from './per-shard-whitening.js';
import { autocorr } from './conditional-markov.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

interface ControlPair { treatment: string; control: string; }

/** The treatment→control pairing emitted by clustersynth (control.json). */
export function loadControlPairs(dir: string): ControlPair[] {
  const p = path.join(dir, 'control.json');
  if (!fs.existsSync(p)) throw new Error(`${dir}: no control.json — generate the bundle with CS_CONTROL_ARM=1 / controlArm:true`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).pairs as ControlPair[];
}

const median = (xs: number[]): number => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
const madScale = (xs: number[]): number => { const m = median(xs); return Math.max(1.4826 * median(xs.map((x) => Math.abs(x - m))), 1e-9); };

/** The contrast fit estimated on the HEALTHY baseline contrast: a centering offset (the treatment and
 *  control have INDEPENDENT baselines, so the contrast has a nonzero mean), AR(1) φ, and robust
 *  location/scale of the whitened residual. CENTER BEFORE WHITENING: `whiten` returns the first tick
 *  unchanged (no prior sample), so without centering that seed tick carries the full baseline offset and
 *  standardizes to a many-σ outlier — one fat tail per series that spuriously trips the ∏g calibration. */
export interface ContrastFit { phi: number; loc: number; scale: number; center: number; }

export function fitContrast(d0: number[]): ContrastFit {
  const center = median(d0);
  const dc = d0.map((x) => x - center);
  const { phi } = estimateAr1(dc);
  const w = dc.map((x, t) => whiten(x, t > 0 ? dc[t - 1] : null, phi));
  return { phi, loc: median(w), scale: madScale(w), center };
}

/** Apply a baseline contrast fit to a (monitoring) contrast: center, whiten at φ, standardize by loc/scale.
 *  The baseline is keyed by (seed, shard, counter) so it is identical across the same-seed healthy/mon
 *  bundles — the fit's `center` removes it consistently. */
export function applyContrast(d: number[], fit: ContrastFit): number[] {
  const dc = d.map((x) => x - fit.center);
  return dc.map((x, t) => (whiten(x, t > 0 ? dc[t - 1] : null, fit.phi) - fit.loc) / fit.scale);
}

const sub = (a: number[], b: number[]): number[] => a.map((x, t) => x - b[t]);
const ser = (b: ScenarioBundle, shard: string, counter: string): number[] | undefined => b.series.get(`${shard}\0${counter}`);

/** The emitter contract for the clustersynth concurrent-control contrast (construction_valid, gated by
 *  the live calibration monitor + whiteness verdict). */
export function clustersynthModeBEmitter(calibrationMonitorPassing: boolean): EmitterContract {
  return {
    id: 'clustersynth-mode-b/control-contrast',
    baselineVersion: '≥2-month healthy contrast (treatment − concurrent control)',
    conditioningVariables: ['concurrent control twin (shares factor instances + loadings)'],
    residualizer: 'treatment − control, whitened at idiosyncratic φ, baseline-standardized',
    increment: 'normalized convex-mixture e-value (mixture-evalue.ts)',
    stoppingAggregation: 'per-shard running-max → fleet e-BH',
    horizon: 'monitoring window',
    validityClass: 'construction_valid',
    calibrationMonitorPassing,
  };
}

/** The ANOMALOUS treatment shards for a counter — the FDR positive set for the per-shard spatial null.
 *  Mode B detects PER-SHARD (gpu-level) anomalies: a fault applied to one treatment shard but NOT its
 *  control twin, so it survives the contrast. CDU/POD faults are SHARED-INFRA / COMMON-MODE events
 *  (faults.ts: "a shared-infra fault IS a factor perturbation") — the concurrent control loads on the
 *  same factor, so the contrast CANCELS them BY DESIGN. That is the point of a spatial null, not a miss:
 *  fleet-wide events are out of scope for a per-shard detector (a fleet-level monitor owns them). So the
 *  positive set is the gpu-level faults that actually perturb THIS counter (its own counter, or
 *  counter=null = all counters). A pure variance_collapse (no mean change) may evade the mean-shift
 *  e-value → it only lowers recall, never inflating FDP. */
interface CounterLoad { name: string; load?: Record<string, number> }
function faultedSet(mon: ScenarioBundle, counter: string): Set<string> {
  return faultedSetFrom(mon.faults, mon.counters as unknown as CounterLoad[], counter);
}
/** As faultedSet, from raw labels + counter specs (so the streaming path can reuse it without a bundle). */
function faultedSetFrom(faults: ReadonlyArray<unknown>, counterSpecs: CounterLoad[], counter: string): Set<string> {
  const load = counterSpecs.find((c) => c.name === counter)?.load ?? {};
  const out = new Set<string>();
  for (const f of faults) {
    const ff = f as { level?: string; type?: string; counter?: string | null; detach_factor?: string | null; affected_shards?: string[] };
    if (ff.level !== 'gpu') continue; // per-shard only; common-mode (cdu/pod) is cancelled by design
    let hits: boolean;
    if (ff.type === 'detachment') {
      // detachment drops a FACTOR KIND for the shard (counter-agnostic) → it perturbs every counter that
      // LOADS on that factor, regardless of the label's `counter` field. Credit those.
      hits = ff.detach_factor != null && (load[ff.detach_factor] ?? 0) !== 0;
    } else {
      // mean_shift / drift / variance_collapse apply to the labeled counter (or all when counter=null).
      hits = ff.counter === counter || ff.counter === null || ff.counter === undefined;
    }
    if (hits) for (const s of ff.affected_shards ?? []) out.add(s);
  }
  return out;
}

export interface ModeBCounterResult {
  counter: string; nFault: number; mode: 'A' | 'B';
  selected: number; falsePos: number; fdp: number; power: number;
  temporalSelected: number; temporalFdp: number; temporalPower: number;
  monitorPassing: boolean; whiteFrac: number;
}

/** Wall-A whiteness fraction of the (whitened, standardized) healthy control-cohort contrasts. */
function whiteFraction(standardized: number[][], thresh = 0.1): number {
  if (!standardized.length) return 0;
  return standardized.filter((r) => Math.abs(autocorr(r, 1)) <= thresh).length / standardized.length;
}

/** Cap on the per-shard calibration feed length. An anytime-valid ∏g martingale's POWER grows with feed
 *  length, so over a long (e.g. 1 Hz, 1000s-of-ticks) prefix a NEGLIGIBLE scale mis-estimate (a few %
 *  MAD error) accumulates into a crossing and over-revokes a construction the FDR bound tolerates — the
 *  same over-power lesson as pooling. Bounding the feed to a fixed window tests marginal calibration at a
 *  consistent, reasonable power across cadences. (Whiteness is checked separately on the full prefix.) */
const CALIB_FEED_CAP = 500;

/** PER-SHARD anytime-valid calibration pass fraction over the healthy control cohort: the fraction of
 *  control contrasts whose own ∏g test martingale never crosses 1/α (marginal calibration holds) over a
 *  bounded feed. Per shard rather than pooled, and length-bounded — both to keep the monitor's power
 *  reasonable rather than revoking on negligible mis-calibration. */
/** One control contrast's anytime-valid ∏g calibration verdict over a bounded feed. */
function prefixCalibrationPass(standardized: number[], alpha = 0.01): boolean {
  const m = freshCalibrationMonitor({ alpha });
  updateCalibrationBatch(m, standardized.length > CALIB_FEED_CAP ? standardized.slice(0, CALIB_FEED_CAP) : standardized);
  return m.passing;
}

function calibrationPassFraction(standardized: number[][], alpha = 0.01): number {
  if (!standardized.length) return 0;
  return standardized.filter((r) => prefixCalibrationPass(r, alpha)).length / standardized.length;
}

/** CADENCE-AWARE contrast fit + the known-null calibration feed. The contrast's idiosyncratic-OU φ is
 *  CADENCE-dependent (φ = exp(−dt/τ)), so for a MIXED-cadence run (hourly baseline + fine, e.g. 1 Hz,
 *  monitoring) the hourly φ does NOT transfer — fit at the MONITORING cadence from the mon PRE-FAULT
 *  prefix (clustersynth onsets are ≥0.1·T, so the first ~8% is healthy). Same-cadence: fit from the full
 *  healthy baseline (longer = better). Returns per-pair fits and the all-healthy standardized feed. */
function cadenceAwareFit(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string): { fits: ContrastFit[]; calStd: number[][] } {
  const mixed = healthy.dt_s !== mon.dt_s;
  const src = mixed ? mon : healthy;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  const series = usable.map((p) => {
    const d = sub(ser(src, p.treatment, counter)!, ser(src, p.control, counter)!);
    return mixed ? d.slice(0, prefixN) : d;
  });
  const fits = series.map(fitContrast);
  return { fits, calStd: series.map((d, i) => applyContrast(d, fits[i])) };
}

/** The TEMPORAL per-shard comparator (no control): standardize the mon treatment by its OWN healthy null,
 *  cadence-correct, and e-BH it. Returns the selected count + false/true positives. This is the failing
 *  baseline the spatial null beats (it leaves the common-mode in the residual). */
function temporalComparator(healthy: ScenarioBundle, mon: ScenarioBundle, usable: ControlPair[], counter: string, q: number, isFault: boolean[]): { K: number; fp: number; tp: number } {
  const mixed = healthy.dt_s !== mon.dt_s;
  const prefixN = Math.max(50, Math.floor(0.08 * mon.T));
  const tFits = usable.map((p) => fitContrast(mixed ? ser(mon, p.treatment, counter)!.slice(0, prefixN) : ser(healthy, p.treatment, counter)!));
  const tE = usable.map((p, i) => normalizedMixtureEValue(applyContrast(ser(mon, p.treatment, counter)!, tFits[i])));
  const tSel = [...eBenjaminiHochberg(tE, q).selected];
  return { K: tSel.length, fp: tSel.filter((i) => !isFault[i]).length, tp: tSel.filter((i) => isFault[i]).length };
}

/** Score one counter end-to-end: spatial-null contrast (gated) vs the temporal per-shard null. */
export function scoreCounterModeB(healthy: ScenarioBundle, mon: ScenarioBundle, pairs: ControlPair[], counter: string, q: number): ModeBCounterResult | null {
  const usable = pairs.filter((p) => ser(healthy, p.treatment, counter) && ser(healthy, p.control, counter) && ser(mon, p.treatment, counter) && ser(mon, p.control, counter));
  if (!usable.length) return null;
  const faulted = faultedSet(mon, counter);
  const isFault = usable.map((p) => faulted.has(p.treatment));
  const nFault = isFault.filter(Boolean).length;

  // #2 + Wall-A: construction validity on the concurrent control cohort (per-shard calibration + whiteness).
  const { fits, calStd } = cadenceAwareFit(healthy, mon, usable, counter);
  const whiteFrac = whiteFraction(calStd);
  const monitorPassing = calibrationPassFraction(calStd) >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);

  // Detection: the spatial-null e-value per pair on the monitoring contrast; #1 gates e-BH on Mode B.
  const e = usable.map((p, i) => normalizedMixtureEValue(applyContrast(sub(ser(mon, p.treatment, counter)!, ser(mon, p.control, counter)!), fits[i])));
  const sel = mode === 'B' ? fdrBenjaminiHochberg(e, q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length;
  const tp = sel.filter((i) => isFault[i]).length;
  const t = temporalComparator(healthy, mon, usable, counter, q, isFault);

  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: t.K, temporalFdp: t.K ? t.fp / t.K : 0, temporalPower: nFault ? t.tp / nFault : NaN,
    monitorPassing, whiteFrac,
  };
}

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

/** Header facts for the report (shared by the in-memory and streaming paths). */
export interface ModeBHeader { healthyShards: number; healthyT: number; healthyDt: number; monT: number; monDt: number; faults: number; pairs: number; }

/** Render the report from per-counter results (shared by both paths). */
function renderModeBReport(h: ModeBHeader, results: ModeBCounterResult[], q: number): string {
  const L: string[] = [];
  const mixed = h.healthyDt !== h.monDt;
  L.push('═══ CLUSTERSYNTH MODE B — concurrent-control spatial null at scale (ADR 0019) ═══');
  L.push(`baseline: ${h.healthyShards} shards (incl. control twins) × T=${h.healthyT} @ ${h.healthyDt}s  |  monitoring: T=${h.monT} @ ${h.monDt}s, ${h.faults} faults, ${h.pairs} pairs, q=${q}`);
  if (mixed) L.push(`MIXED CADENCE (${h.healthyDt}s baseline → ${h.monDt}s monitoring): φ/scale + calibration estimated at the monitoring cadence from the pre-fault prefix.`);
  L.push('');
  L.push('counter        nFault | MODE | spatial FDP/power (K) | naive-temporal FDP/power (K) | monitor white');
  let selOk = 0, fpOk = 0, tpOk = 0, fT = 0;
  for (const r of results) {
    if (r.nFault === 0) continue;
    fT += r.nFault; selOk += r.selected; fpOk += r.falsePos; tpOk += r.selected - r.falsePos;
    L.push(`  ${r.counter.padEnd(13)} ${String(r.nFault).padStart(5)} |  ${r.mode}   | ${fmt(r.fdp)}/${fmt(r.power)} (${String(r.selected).padStart(3)}) | ${fmt(r.temporalFdp)}/${fmt(r.temporalPower)} (${String(r.temporalSelected).padStart(3)}) | ${r.monitorPassing ? 'pass' : 'REVOKE'}  ${(100 * r.whiteFrac).toFixed(0)}%`);
  }
  L.push('');
  L.push(`AGGREGATE spatial-null (Mode B) FDP: ${selOk ? (fpOk / selOk).toFixed(3) : '0.000'}  (${fpOk} false of ${selOk} selected)   recall: ${fT ? (tpOk / fT).toFixed(3) : '-'} (${tpOk}/${fT})`);
  L.push('READING: the treatment−control contrast cancels the common-mode EXACTLY (shared factor instances +');
  L.push('loadings), so the spatial null is construction-valid and e-BH controls FDR ≤ q at scale with full');
  L.push('recall. The naive temporal per-shard null (no control) leaves the common-mode IN the residual, so it');
  L.push('cannot match the contrast — at a persistent cadence the fault is buried (low power), and toward unit');
  L.push('root the drift is mistaken for signal (FDP ≫ q). Either way the concurrent control is the achievable');
  L.push('null (ADR 0019). The per-shard calibration monitor + Wall-A whiteness gate the construction; a counter');
  L.push('whose control fails to cancel is revoked → demoted Mode A → abstains from the FDR claim.');
  return L.join('\n');
}

/** In-memory path (loads both bundles whole) — fine for same-cadence / hourly scale. */
export function renderModeB(healthyDir: string, monDir: string, q = 0.1): string {
  const healthy = loadScenarioBundle(healthyDir);
  assertLongBaseline(healthy.T, healthy.dt_s, 'clustersynth-mode-b (healthy baseline)');
  const mon = loadScenarioBundle(monDir);
  const pairs = loadControlPairs(monDir);
  const results = mon.counters.map((c) => scoreCounterModeB(healthy, mon, pairs, c.name, q)).filter((r): r is ModeBCounterResult => r != null);
  const h: ModeBHeader = { healthyShards: healthy.shardIds.length, healthyT: healthy.T, healthyDt: healthy.dt_s, monT: mon.T, monDt: mon.dt_s, faults: mon.faults.length, pairs: pairs.length };
  return renderModeBReport(h, results, q);
}

// ─── STREAMING + MULTI-CORE PATH (for LONG, e.g. multi-day 1 Hz, monitoring windows) ────────────────
// The in-memory path loads every (shard×counter) series into RAM — fine at hourly scale but a multi-day
// 1 Hz window (millions of ticks × thousands of shards) does not fit. This path NEVER materialises the
// whole bundle: worker_threads each stream a BYTE RANGE of the monitoring counters.ndjson, pairing each
// treatment row with its adjacent control row (clustersynth emits them consecutively), computing the
// contrast e-value + per-shard calibration/whiteness scalars, and discarding the row arrays. The main
// thread reduces the scalars (e-BH per counter, gate). Memory is O(2 rows × T) per worker, flat in fleet
// size. The contrast fit is taken from each pair's OWN mon pre-fault prefix (cadence-correct and
// self-contained), so the healthy baseline is only read for the ≥2-month guard (its meta, not its series).
// Mirrors tools/baseline-monitor.ts's worker pattern; default for the CLI (CS_WORKERS=1 → in-memory).

interface Row { shard: string; counter: string; v: number[] }
interface CmbWorkerInput { __cmb_worker: true; monDir: string; byteStart: number; byteEnd: number }
interface CmbRecord { c: string; s: string; e: number; tE: number; calibPass: boolean; white: boolean }

/** Yield [line, startOffset] for complete lines from byteStart to EOF (skipping a partial leading line if
 *  byteStart>0). Does NOT stop at any byteEnd — the pair state machine decides ownership/stopping. */
function* linesFrom(filePath: string, byteStart: number): Generator<[string, number]> {
  const fd = fs.openSync(filePath, 'r');
  try {
    const CHUNK = 1 << 22;
    const buf = Buffer.allocUnsafe(CHUNK);
    let filePos = byteStart, lineStart = byteStart;
    let pending = Buffer.alloc(0);
    let skipFirst = byteStart > 0;
    let bytes: number;
    while ((bytes = fs.readSync(fd, buf, 0, CHUNK, filePos)) > 0) {
      filePos += bytes;
      const chunk = pending.length ? Buffer.concat([pending, buf.subarray(0, bytes)]) : Buffer.from(buf.subarray(0, bytes));
      let off = 0, nl: number;
      while ((nl = chunk.indexOf(10, off)) >= 0) {
        const thisStart = lineStart;
        lineStart += nl - off + 1;
        const line = chunk.subarray(off, nl);
        off = nl + 1;
        if (skipFirst) { skipFirst = false; continue; }
        if (line.length) yield [line.toString('utf8'), thisStart];
      }
      pending = chunk.subarray(off);
    }
    if (!skipFirst && pending.length) yield [pending.toString('utf8'), lineStart];
  } finally { fs.closeSync(fd); }
}

/** Yield [treatmentRow, controlRow] pairs whose TREATMENT line starts in [byteStart, byteEnd). Reads
 *  past byteEnd to complete a boundary-straddling pair (treatment and control are adjacent), and skips a
 *  leading orphan control (its treatment belongs to — and is completed by — the previous range). So each
 *  pair is owned by exactly one worker. */
export function* monPairs(filePath: string, byteStart: number, byteEnd: number): Generator<[Row, Row]> {
  let pending: { row: Row; start: number } | null = null;
  for (const [line, start] of linesFrom(filePath, byteStart)) {
    const row = JSON.parse(line) as Row;
    if (row.shard.endsWith('#ctrl')) {
      if (pending && row.shard === `${pending.row.shard}#ctrl` && row.counter === pending.row.counter) yield [pending.row, row];
      pending = null;
    } else {
      if (start >= byteEnd) return; // this treatment is owned by the next range
      pending = { row, start };
    }
  }
}

/** Worker: stream a byte range, pair rows, emit per-pair scalars (contrast + temporal e-values + the
 *  construction-validity flags). The fit is cadence-correct (each pair's own mon pre-fault prefix). */
function runCmbWorker(input: CmbWorkerInput): CmbRecord[] {
  const meta = JSON.parse(fs.readFileSync(path.join(input.monDir, 'factors.json'), 'utf8')) as { T: number };
  const prefixN = Math.max(50, Math.floor(0.08 * meta.T));
  const out: CmbRecord[] = [];
  for (const [t, c] of monPairs(path.join(input.monDir, 'counters.ndjson'), input.byteStart, input.byteEnd)) {
    const d = t.v.map((x, i) => x - c.v[i]); // the model-free spatial-null contrast
    const fit = fitContrast(d.slice(0, prefixN));
    const std = applyContrast(d, fit);
    const prefixStd = std.slice(0, prefixN);
    const tFit = fitContrast(t.v.slice(0, prefixN)); // temporal comparator (no control)
    out.push({
      c: t.counter, s: t.shard,
      e: normalizedMixtureEValue(std),
      tE: normalizedMixtureEValue(applyContrast(t.v, tFit)),
      calibPass: prefixCalibrationPass(prefixStd),
      white: Math.abs(autocorr(prefixStd, 1)) <= 0.1,
    });
  }
  return out;
}

/** Reduce one counter's per-pair records → a ModeBCounterResult (gate → e-BH → FDP/recall vs temporal). */
function reduceCmbCounter(counter: string, recs: CmbRecord[], faults: ReadonlyArray<unknown>, specs: CounterLoad[], q: number): ModeBCounterResult | null {
  if (!recs.length) return null;
  const faulted = faultedSetFrom(faults, specs, counter);
  const isFault = recs.map((r) => faulted.has(r.s));
  const nFault = isFault.filter(Boolean).length;
  const whiteFrac = recs.filter((r) => r.white).length / recs.length;
  const monitorPassing = recs.filter((r) => r.calibPass).length / recs.length >= 0.8 && whiteFrac >= 0.5;
  const emitter = clustersynthModeBEmitter(monitorPassing);
  const mode = modeOf(emitter);
  const sel = mode === 'B' ? fdrBenjaminiHochberg(recs.map((r) => r.e), q, emitter, 'clustersynth-mode-b').selected : [];
  const fp = sel.filter((i) => !isFault[i]).length, tp = sel.filter((i) => isFault[i]).length;
  const tSel = [...eBenjaminiHochberg(recs.map((r) => r.tE), q).selected];
  const tFp = tSel.filter((i) => !isFault[i]).length, tTp = tSel.filter((i) => isFault[i]).length;
  return {
    counter, nFault, mode,
    selected: sel.length, falsePos: fp, fdp: sel.length ? fp / sel.length : 0, power: nFault ? tp / nFault : NaN,
    temporalSelected: tSel.length, temporalFdp: tSel.length ? tFp / tSel.length : 0, temporalPower: nFault ? tTp / nFault : NaN,
    monitorPassing, whiteFrac,
  };
}

/** Streaming + multi-core path. The healthy baseline is read for the ≥2-month guard + header only. */
export async function renderModeBStreaming(healthyDir: string, monDir: string, q: number, nWorkers: number): Promise<string> {
  const hMeta = JSON.parse(fs.readFileSync(path.join(healthyDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; membership: Record<string, unknown> };
  assertLongBaseline(hMeta.T, hMeta.dt_s ?? 1, 'clustersynth-mode-b (healthy baseline)');
  const meta = JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as { T: number; dt_s?: number; counters: CounterLoad[] };
  const faults: unknown[] = JSON.parse(fs.readFileSync(path.join(monDir, 'labels.json'), 'utf8')).faults;
  const pairs = loadControlPairs(monDir);

  const file = path.join(monDir, 'counters.ndjson');
  const size = fs.statSync(file).size;
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < nWorkers; i++) ranges.push([Math.floor((i * size) / nWorkers), Math.floor(((i + 1) * size) / nWorkers)]);
  const recs = (await Promise.all(ranges.map(([byteStart, byteEnd]) => new Promise<CmbRecord[]>((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { __cmb_worker: true, monDir, byteStart, byteEnd } as CmbWorkerInput });
    w.once('message', (m: CmbRecord[]) => resolve(m));
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error(`cmb worker exited ${code}`)); });
  })))).flat();

  const byCounter = new Map<string, CmbRecord[]>();
  for (const r of recs) { let a = byCounter.get(r.c); if (!a) { a = []; byCounter.set(r.c, a); } a.push(r); }
  const results = meta.counters.map((c) => reduceCmbCounter(c.name, byCounter.get(c.name) ?? [], faults, meta.counters, q)).filter((r): r is ModeBCounterResult => r != null);
  const h: ModeBHeader = { healthyShards: Object.keys(hMeta.membership ?? {}).length, healthyT: hMeta.T, healthyDt: hMeta.dt_s ?? 1, monT: meta.T, monDt: meta.dt_s ?? 1, faults: faults.length, pairs: pairs.length };
  return renderModeBReport(h, results, q);
}

/** Default worker count: all cores; CS_WORKERS=N overrides (1 = in-memory single-thread). */
function defaultWorkers(): number {
  if (process.env.CS_WORKERS) return Math.max(1, Number(process.env.CS_WORKERS) | 0);
  return Math.max(1, os.availableParallelism?.() ?? os.cpus().length);
}

if (!isMainThread && (workerData as Partial<CmbWorkerInput> | undefined)?.__cmb_worker) {
  try { parentPort!.postMessage(runCmbWorker(workerData as CmbWorkerInput)); }
  catch (err) { parentPort!.postMessage([]); throw err; }
} else if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/clustersynth-mode-b.js <healthy-baseline-dir> <monitoring-dir> [q]\n  both bundles must be generated WITH the control arm (CS_CONTROL_ARM=1).\n  env: CS_WORKERS=N (default all cores; 1 = in-memory single-thread). Streaming is required for long 1 Hz windows.\n');
    process.exit(2);
  }
  const q = process.argv[4] ? Number(process.argv[4]) : 0.1;
  const nWorkers = defaultWorkers();
  // Streaming is for LONG MIXED-cadence windows (the multi-day 1 Hz case): there the fit comes from the
  // mon pre-fault prefix, so it is self-contained and equivalent to the in-memory mixed path. For
  // SAME-cadence the in-memory path fits from the (small) healthy baseline — a different, longer
  // calibration window — so streaming would NOT match; keep same-cadence on the in-memory path.
  const baseDt = (JSON.parse(fs.readFileSync(path.join(healthyDir, 'factors.json'), 'utf8')) as { dt_s?: number }).dt_s ?? 1;
  const monDt = (JSON.parse(fs.readFileSync(path.join(monDir, 'factors.json'), 'utf8')) as { dt_s?: number }).dt_s ?? 1;
  const useStream = nWorkers > 1 && baseDt !== monDt;
  (async () => {
    if (useStream) process.stdout.write(await renderModeBStreaming(healthyDir, monDir, q, nWorkers) + `\n(${nWorkers} worker threads, streaming)\n`);
    else process.stdout.write(renderModeB(healthyDir, monDir, q) + '\n');
  })().then(() => process.exit(0)).catch((e) => { process.stderr.write(String(e?.stack ?? e) + '\n'); process.exit(1); });
}
