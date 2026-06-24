// tools/lifecycle-monitor.ts — the operational baseline lifecycle: detect drift → re-record →
// (shadow) → cutover. The per-fire drift-vs-fault discriminator does NOT work (verified: slow drift
// and sharp faults both fire with the same run-length once a drift is established). So the drift
// trigger is EPOCH-level: a sustained high ALARM-RATE means the baseline is stale (re-record), while
// an occasional alarm is a fault (keep alarming). This characterizes where the lifecycle threads the
// static-vs-adaptive needle (slow cross-epoch drift) vs where it degenerates to adaptive masking
// (continuous within-epoch workload variability → needs the fleet, not a richer single-shard scheme).
// See ADR 0011. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { freshBaselineLifecycle, updateBaselineLifecycle } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/baseline-lifecycle';
import { calibrateBaseline } from './shadow-replay.js';
import { replayFiresAdaptive } from './adaptive-baseline.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const M0 = 300;            // initial baseline window
export const RATE_WINDOW = 150;   // trailing window to measure the alarm rate
export const RATE_THRESH = 4;     // ≥ this many alarms within RATE_WINDOW ⇒ baseline stale ⇒ re-record
export const RECORD_WINDOW = 200; // re-record the new baseline from this many recent points
export const COOLDOWN = 150;      // after a re-record, suppress re-triggering for this many ticks

export interface LifecycleOpts { rateWindow?: number; rateThresh?: number; recordWindow?: number; cooldown?: number; }

/** Monitor with epoch-level drift-triggered re-record. Returns alarm indices + re-record count.
 *  rateThresh = Infinity ⇒ never re-record (= static monitor).
 *
 *  ADR 0004 step 6: the epoch-level rate-trigger DECISION is now the engine's promoted baseline-lifecycle
 *  machine (PR D); this harness keeps the betting loop (consumer data-plane) and feeds its alarms to the
 *  engine, which decides WHEN to re-record. Behaviorally equivalent to the original at the default
 *  cooldown = window (the engine clears its window on re-record; the original relied on cooldown). The
 *  static case (rateThresh = Infinity) maps to a never-reached integer threshold. */
export function monitorLifecycle(values: ReadonlyArray<number>, m0: number, alpha: number, opts: LifecycleOpts = {}): { alarms: number[]; reRecords: number } {
  const rateWindow = opts.rateWindow ?? RATE_WINDOW, rateThresh = opts.rateThresh ?? RATE_THRESH;
  const recordWindow = opts.recordWindow ?? RECORD_WINDOW, cooldown = opts.cooldown ?? COOLDOWN;
  let cal = calibrateBaseline(values.slice(0, m0), 'simple');
  let state = freshBettingState();
  const threshold = 1 / alpha;
  const alarms: number[] = [];
  // The engine machine requires an integer threshold; Infinity (static monitor) → never-reached integer.
  const life = freshBaselineLifecycle({
    window: rateWindow,
    rateThreshold: Number.isFinite(rateThresh) ? rateThresh : Number.MAX_SAFE_INTEGER,
    cooldown,
  });
  for (let i = m0; i < values.length; i++) {
    updateBettingState(state, values[i], cal.mean, cal.innovationVar, alpha, cal.phi);
    let fired = false;
    if (state.M >= threshold) { alarms.push(i); fired = true; state = freshBettingState(); }
    // Epoch-level drift trigger: the engine counts the trailing alarm rate and says when to re-record.
    if (updateBaselineLifecycle(life, fired).reRecord) {
      cal = calibrateBaseline(values.slice(Math.max(0, i - recordWindow), i), 'simple');
      state = freshBettingState();
    }
  }
  return { alarms, reRecords: life.reRecords };
}

/** Static monitor (never re-record) = the ADR 0009 fixed baseline. */
export function monitorStatic(values: ReadonlyArray<number>, m0: number, alpha: number): number[] {
  return monitorLifecycle(values, m0, alpha, { rateThresh: Infinity }).alarms;
}

// ── synthetic streams (ground truth) ───────────────────────────────────────────
const RHO = 0.5, BASE = 1000, NOISE = 2, N = 1800, FAULT_AT = 1200, FAULT_SIZE = 8;
function ar1(rng: () => number): number[] {
  const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < N; t++) { p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng); v.push(BASE + NOISE * p); }
  return v;
}
/** slow cross-epoch drift (ramp), no fault. */
export function genDrift(rng: () => number, slope: number): number[] { const v = ar1(rng); for (let i = M0; i < N; i++) v[i] += slope * (i - M0); return v; }
/** stable + a single sharp fault step (the thing we must still detect). */
export function genFault(rng: () => number): number[] { const v = ar1(rng); for (let i = FAULT_AT; i < N; i++) v[i] += FAULT_SIZE; return v; }
/** stable + a SLOW-onset fault ramp — indistinguishable from drift per-shard (the hard case). */
export function genSlowFault(rng: () => number, slope: number): number[] { const v = ar1(rng); for (let i = FAULT_AT; i < N; i++) v[i] += slope * (i - FAULT_AT); return v; }
/** continuous within-epoch variability (random-walk level), no fault — the hard case. */
export function genWorkload(rng: () => number, step: number): number[] {
  const v = ar1(rng); let lvl = 0;
  for (let i = M0; i < N; i++) { lvl += step * gaussian(rng); v[i] += lvl; }
  return v;
}

function detected(alarms: number[]): boolean { return alarms.some((a) => a >= FAULT_AT && a < FAULT_AT + 200); }
function detectedAny(alarms: number[]): boolean { return alarms.some((a) => a >= FAULT_AT); }
function preFaultAlarms(alarms: number[]): number { return alarms.filter((a) => a < FAULT_AT).length; }
function round2(x: number): number { return Math.round(x * 100) / 100; }

interface ScenarioResult { scenario: string; static_alarms: number; adaptive_alarms: number; lifecycle_alarms: number; lifecycle_rerecords: number; static_detect?: number; adaptive_detect?: number; lifecycle_detect?: number; }

export interface LifecycleReport {
  schema_version: 'tessera-lifecycle-v1';
  params: { alpha: number; m0: number; rate_window: number; rate_thresh: number; trials: number };
  scenarios: ScenarioResult[];
}

function meanAlarms(streams: number[][], fn: (v: number[]) => number[]): number { return round2(streams.reduce((s, v) => s + fn(v).length, 0) / streams.length); }
function detectRate(streams: number[][], fn: (v: number[]) => number[]): number { return round2(streams.filter((v) => detected(fn(v))).length / streams.length); }
function detectRateAny(streams: number[][], fn: (v: number[]) => number[]): number { return round2(streams.filter((v) => detectedAny(fn(v))).length / streams.length); }

const TRIALS = 80;
function gen(streams: number[][], mk: (rng: () => number) => number[]): number[][] { for (let s = 0; s < TRIALS; s++) streams.push(mk(mulberry32(scramble(13 + s * 91)))); return streams; }

export function runLifecycle(): LifecycleReport {
  const adaptive = (v: number[]) => replayFiresAdaptive(v, M0, ALPHA);
  const lifecycle = (v: number[]) => monitorLifecycle(v, M0, ALPHA).alarms;
  const stat = (v: number[]) => monitorStatic(v, M0, ALPHA);

  const drift = gen([], (r) => genDrift(r, 0.02));        // slow cross-epoch drift, no fault
  const fault = gen([], (r) => genFault(r));              // stable + a sharp fault
  const slowFault = gen([], (r) => genSlowFault(r, 0.004)); // slow-onset fault inside adaptive's masking zone
  const workload = gen([], (r) => genWorkload(r, 0.5));   // continuous within-epoch variability
  const rr = (streams: number[][]) => round2(streams.reduce((s, v) => s + monitorLifecycle(v, M0, ALPHA).reRecords, 0) / streams.length);

  const scenarios: ScenarioResult[] = [
    { scenario: 'slow drift (no fault) — FP', static_alarms: meanAlarms(drift, stat), adaptive_alarms: meanAlarms(drift, adaptive), lifecycle_alarms: meanAlarms(drift, lifecycle), lifecycle_rerecords: rr(drift) },
    { scenario: 'SHARP fault — detection rate', static_alarms: meanAlarms(fault, stat), adaptive_alarms: meanAlarms(fault, adaptive), lifecycle_alarms: meanAlarms(fault, lifecycle), lifecycle_rerecords: rr(fault), static_detect: detectRate(fault, stat), adaptive_detect: detectRate(fault, adaptive), lifecycle_detect: detectRate(fault, lifecycle) },
    { scenario: 'SLOW fault — detection rate', static_alarms: meanAlarms(slowFault, stat), adaptive_alarms: meanAlarms(slowFault, adaptive), lifecycle_alarms: meanAlarms(slowFault, lifecycle), lifecycle_rerecords: rr(slowFault), static_detect: detectRateAny(slowFault, stat), adaptive_detect: detectRateAny(slowFault, adaptive), lifecycle_detect: detectRateAny(slowFault, lifecycle) },
    { scenario: 'continuous workload (no fault) — FP', static_alarms: meanAlarms(workload, stat), adaptive_alarms: meanAlarms(workload, adaptive), lifecycle_alarms: meanAlarms(workload, lifecycle), lifecycle_rerecords: rr(workload) },
  ];
  return { schema_version: 'tessera-lifecycle-v1', params: { alpha: ALPHA, m0: M0, rate_window: RATE_WINDOW, rate_thresh: RATE_THRESH, trials: TRIALS }, scenarios };
}

function renderMd(r: LifecycleReport): string {
  const L: string[] = [];
  L.push('# Tessera — the operational baseline lifecycle (drift-triggered re-record)');
  L.push('');
  L.push(`The per-fire drift-vs-fault discriminator does NOT work (slow drift and sharp faults fire with the same run-length). So the drift trigger is EPOCH-level: ≥${r.params.rate_thresh} alarms within a ${r.params.rate_window}-tick window ⇒ baseline stale ⇒ re-record. Comparing **static** (never refresh, ADR 0009), **adaptive** (continuous recal, ADR 0006 — masks), and **lifecycle** (drift-triggered re-record). ${r.params.trials} trials, α=${r.params.alpha}.`);
  L.push('');
  L.push('| scenario | static | adaptive | lifecycle | lifecycle re-records |');
  L.push('|---|---|---|---|---|');
  for (const s of r.scenarios) {
    const fmt = (a: number, d?: number) => d === undefined ? `${a} alarms` : `${(d * 100).toFixed(0)}% detect`;
    L.push(`| ${s.scenario} | ${fmt(s.static_alarms, s.static_detect)} | ${fmt(s.adaptive_alarms, s.adaptive_detect)} | ${fmt(s.lifecycle_alarms, s.lifecycle_detect)} | ${s.lifecycle_rerecords} |`);
  }
  L.push('');
  L.push('**Reading it (metrics: sharp-fault detection = alarm within 200 ticks of onset; SLOW-fault detection = ANY alarm in the full ~600-tick post-onset window — a slow ramp needs the unbounded window, a bounded-latency metric would require a far steeper slope):**');
  L.push('- **Slow drift (FP):** static alarms pile up (baseline goes stale, ~154); the lifecycle re-records and cuts false alarms ~3× — *without* continuous adaptation. (Still ~1.4× above adaptive\'s 35 — it does not match adaptive, it improves on static.)');
  L.push('- **Sharp fault:** all three detect 100%. The lifecycle DOES re-record here (~1.1×/trial), but detection is on the FIRST alarm at onset, which precedes the rate trigger — so re-recording doesn\'t cost detection.');
  L.push('- **SLOW fault (the needle):** static 70%, **adaptive masks (28%)**, **lifecycle keeps 70%**. Mechanism (corrected): adaptive *continuously* absorbs the ramp so it never accumulates enough to cross threshold; the lifecycle is STATIC between re-records, so the ramp accumulates and FIRES on the first 1–3 alarms — that IS the detection — *before* the 4th alarm trips the rate trigger and re-records (which then suppresses the rest). So the lifecycle detects by firing early, not by avoiding re-records. (Tuning tension: a more sensitive rate trigger would suppress sooner and mask more.)');
  L.push('- **Continuous workload (FP):** the lifecycle re-records constantly — it cuts FP ~5.5× vs static (116→21) but stays ~1.4× above adaptive (15); at this aggressive operating point (random-walk level, step=0.5 → level SD ~19 by end) it is degenerating toward adaptive (and would then mask). The honest limit: when within-epoch variability is *continuous* (not discrete drift), a single-shard lifecycle cannot separate legitimate change from faults — that needs the **fleet** (shard-specific vs fleet-wide).');
  L.push('');
  L.push('> **Verdict:** the lifecycle improves on static (far fewer drift false alarms) and, on slow faults, beats adaptive (70% vs 28%) by firing early before suppression — for **discrete cross-epoch drift**, complementing m≫n (ADR 0009) and the seasonal 2D baseline (ADR 0010). It does NOT solve continuous within-epoch workload variability; that residual is irreducible at the single-shard level and needs fleet-relative comparison (which in turn needs the nuisance-robust e-value, ADR 0008). Shadow→cutover (validate a candidate baseline before promoting) is the safety wrapper around the re-record; modeled here as immediate cutover. The drift trigger is alarm-RATE (epoch-level), since the per-fire run-length does NOT separate drift from faults (verified).');
  L.push('');
  return L.join('\n');
}

export function writeLifecycle(outDir: string): { json: string; md: string } {
  const report = runLifecycle();
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'lifecycle-report.json');
  const md = path.join(outDir, 'lifecycle-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeLifecycle(out);
  process.stdout.write(`Lifecycle report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
