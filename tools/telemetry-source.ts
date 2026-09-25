// tools/telemetry-source.ts — the LIVE SOURCE adapter for the always-on Mode B loop (ADR 0019 deploy
// adapter, INPUT seam). The loop (tools/mode-b-loop.ts) is source-agnostic: it consumes per-cycle
// EmitterCycle objects (per-shard contrast e-values + this-cycle's known-null calibration residuals +
// the Wall-A whiteness verdict). In validation those come from a replay; in production they come from a
// LIVE telemetry+control feed. This module is the integration seam between the two.
//
// THE SEAM (TelemetryFeed). A deployment implements TelemetryFeed against its own telemetry + control
// system: deliver RAW numbers — for each counter, each treatment shard paired with its concurrent control
// twin (the monitoring window so far), plus a cohort of known-null control residual streams for this
// cycle. The seam does the rest with the SAME validated contrast math the offline pipeline uses
// (tools/clustersynth-mode-b.ts): model-free contrast d = treatment − control, centered + whitened at the
// idiosyncratic φ + baseline-standardized (fitContrast/applyContrast), then the normalized-mixture
// e-value. So the live path is byte-for-byte the construction we scale-validated — the deployment only
// supplies the data and the contract id; it never re-implements the statistics.
//
// WHY RAW NUMBERS AT THE SEAM. Keeping the seam at the level of treatment/control number arrays (not
// Tessera e-value types) means a real feed — Prometheus/OTel scrape + the control-plane's treatment↔canary
// pairing — can be written without depending on the engine internals; everything statistical lives behind
// the seam and stays consistent with the offline validation. liveCycles enforces the ≥2-month baseline
// guard on the healthy window exactly like the offline harness.
//
// A reference feed (`bundleFeed`) drives the seam from clustersynth control-arm bundles, so the live async
// path runs end-to-end on real topology (the CLI) and is exercised by tests. Tessera-original.

import * as fs from 'node:fs';
import { assertLongBaseline } from './baseline-guard.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { autocorr } from './conditional-markov.js';
import { fitContrast, applyContrast, loadControlPairs, type ContrastFit } from './clustersynth-mode-b.js';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { ModeBLoop, RecordingSink, runModeBLoopAsync, type EmitterCycle, type CycleReport } from './mode-b-loop.js';
import type { EmitterContract } from './emitter-contract.js';
import { FanOutSink, JsonlAuditSink, WebhookActionSink, CommandActionSink, isDrainable, type DrainableSink } from './action-sinks.js';
import type { ActionSink } from './mode-b-loop.js';

// ─── THE SEAM ────────────────────────────────────────────────────────────────────────────────────────

/** A treatment series paired with its concurrent-control twin (same length). The model-free contrast
 *  treatment − control is the spatial null: shared common-mode cancels, an idiosyncratic fault survives. */
export interface RawPair {
  treatment: number[]; control: number[];
  /** ADR 0033 — the baseline unit whose ≥ 2-month fit standardises this pair when it is that unit's
   *  known-null stream (the reference feed and any deployment replaying its own baseline). Absent ⇒ the
   *  cohort pair is SELF-fit on its own slice, and the engine's increment-mean measurement reads the
   *  slice's plug-in error as E[g] > 1: 1.51 at 25 ticks, 1.03 at 150, 1.006 at 350, indistinguishable
   *  from oracle at 1,440 (Gaussian AR(1) contrasts, 200 replications). A long-running loop on
   *  self-fit slices refutes its own premise at any finite slice length. */
  shard?: string;
}
/** A detection unit: a treatment shard's pair, identified for the FDR discovery set. */
export interface RawDetectionUnit extends RawPair { shard: string }

/** The one-time ≥2-month healthy baseline, per counter: each treatment shard's healthy contrast pair, used
 *  to fit (φ, scale, center) once. `dtSeconds` is the baseline cadence (for the ≥2-month guard). */
export interface RawCounterBaseline { counter: string; units: RawDetectionUnit[] }
export interface BaselineSnapshot { dtSeconds: number; counters: RawCounterBaseline[] }

/** One cycle of one counter from the live feed: the detection pairs (monitoring window so far) and a
 *  cohort of KNOWN-NULL control residual streams for this cycle (concurrent-control canaries / control-vs-
 *  control pairs the deployment believes healthy) that feed the per-shard calibration monitors. */
export interface RawCounterWindow {
  counter: string;
  detection: RawDetectionUnit[];
  cohort: RawPair[];
}

/** The integration seam a deployment implements against its telemetry + control plane. */
export interface TelemetryFeed {
  /** The ≥2-month healthy baseline (fit once). */
  baseline(): Promise<BaselineSnapshot>;
  /** The next monitoring cycle's windows, or null when the feed ends (the always-on loop normally never
   *  ends; null is for bounded replays / shutdown). */
  poll(cycle: number): Promise<RawCounterWindow[] | null>;
  /** Optional per-counter emitter contract override; default is a generic construction_valid contract. */
  emitterFor?(counter: string): EmitterContract;
}

const contrast = (p: RawPair): number[] => p.treatment.map((x, i) => x - p.control[i]);

/** The generic Mode-B emitter contract for a live concurrent-control counter: construction_valid, gated at
 *  runtime by the loop's calibration monitor + the whiteness verdict carried on each cycle (ADR 0019). */
export function liveModeBEmitter(counter: string, opts: { lightTails?: boolean } = {}): EmitterContract {
  return {
    id: `live-mode-b/${counter}`,
    baselineVersion: '≥2-month healthy contrast (treatment − concurrent control)',
    conditioningVariables: ['concurrent control twin'],
    residualizer: 'treatment − control, whitened at idiosyncratic φ, baseline-standardized',
    increment: 'normalized convex-mixture e-value (mixture-evalue.ts)',
    stoppingAggregation: 'per-shard running e-value → fleet e-BH',
    horizon: 'live monitoring window',
    validityClass: 'construction_valid',
    // ADR 0032: normalized (and, in the loop, geometric) onset mixture, Gaussian increment, on a
    // residual standardised by the ≥ 2-month healthy contrast against a live window — fit ≫ horizon.
    // ADR 0033 (engine ADR 0035): the envelope also carries the 'mgf' tail premise, and a live feed
    // makes NO promise by default — the loop MEASURES the increment mean on the known-null cohort and
    // passes it as `incrementMean`. At 1 Hz a ≥ 2-month cohort is millions of increments and the
    // interval decides; at hourly cadence it is ~1,400 per unit, the interval is inconclusive, and the
    // gate REFUSES: the emitter runs Mode A with the reason on the report until a deployment states
    // the ground for `lightTails` here (opts) or the feed is long enough to clear.
    engineEnvelope: { detectorId: 'onset_mixture_gaussian', assertions: { mMuchGreaterThanN: true, ...(opts.lightTails ? { lightTails: true } : {}) } },
    // calibrationMonitorPassing is set by the loop from the accumulated per-shard monitors + whiteness.
  };
}

/** ADR 0033 — a cohort pair's standardized residual: by its unit's baseline fit when it names one and the
 *  fit exists, else self-fit on the slice (and the loop's increment estimator prices that). */
function cohortResidual(c: RawPair, fits: Map<string, ContrastFit> | undefined): number[] {
  const d = contrast(c);
  const baseline = c.shard === undefined ? undefined : fits?.get(c.shard);
  return applyContrast(d, baseline ?? fitContrast(d));
}

/** Turn one raw window into the loop's EmitterCycle, using the per-shard baseline fits where available
 *  (else a self-contained fit on the current window). Detection e-values come from the monitoring contrast;
 *  calibration residuals come from this cycle's known-null cohort; whiteness is the Wall-A serial-dependence
 *  guard on the cohort residuals. */
export function windowToEmitter(w: RawCounterWindow, fits: Map<string, ContrastFit> | undefined, feed: TelemetryFeed): EmitterCycle {
  const shards: string[] = [];
  const eValues: number[] = [];
  // ADR 0029 — the level-free inputs of the per-window confidence sequence: the standardized residual's
  // sum and length, only where a BASELINE fit standardized it (a self-fit centers on the window's own
  // median, so its residual mean is ≈ 0 by construction and an interval would be degenerate).
  const csInputs: Array<{ S_t: number; t: number } | null> = [];
  for (const u of w.detection) {
    const d = contrast(u);
    const baselineFit = fits?.get(u.shard);
    const fit = baselineFit ?? fitContrast(d);
    shards.push(u.shard);
    const r = applyContrast(d, fit);
    eValues.push(normalizedMixtureEValue(r));
    csInputs.push(baselineFit ? { S_t: r.reduce((s, x) => s + x, 0), t: r.length } : null);
  }
  // ADR 0033: standardise the cohort by the baseline fit where the pair names its unit (fit ≫ slice), else
  // self-fit — and then the increment estimator in the loop measures the self-fit's price honestly.
  const calibrationSamples = w.cohort.map((c) => cohortResidual(c, fits));
  const whitenessPass = calibrationSamples.length
    ? calibrationSamples.filter((r) => Math.abs(autocorr(r, 1)) <= 0.1).length / calibrationSamples.length >= 0.5
    : false;
  const contract = feed.emitterFor?.(w.counter) ?? liveModeBEmitter(w.counter);
  return { contract, shards, eValues, calibrationSamples, whitenessPass, csInputs };
}

/** The live cycle source: fit the per-shard baselines once (enforcing the ≥2-month guard), then turn each
 *  polled window into an EmitterCycle. Drives the loop via runModeBLoopAsync. */
export async function* liveCycles(feed: TelemetryFeed): AsyncGenerator<{ cycle: number; emitters: EmitterCycle[] }> {
  const snap = await feed.baseline();
  const lengths = snap.counters.flatMap((c) => c.units.map((u) => Math.min(u.treatment.length, u.control.length)));
  assertLongBaseline(lengths.length ? Math.max(...lengths) : 0, snap.dtSeconds, 'telemetry-source (healthy baseline)');
  const fits = new Map<string, Map<string, ContrastFit>>();
  for (const cb of snap.counters) {
    const m = new Map<string, ContrastFit>();
    for (const u of cb.units) m.set(u.shard, fitContrast(contrast(u)));
    fits.set(cb.counter, m);
  }
  for (let k = 0; ; k++) {
    const wins = await feed.poll(k);
    if (wins == null) return;
    yield { cycle: k, emitters: wins.map((w) => windowToEmitter(w, fits.get(w.counter), feed)) };
  }
}

/** Run the always-on Mode B loop against a live feed, draining a buffered ActionSink each cycle (so the
 *  cycle's webhook/command effects flush in order while step() stays synchronous). */
export function runModeBLoopLive(feed: TelemetryFeed, loop: ModeBLoop, sink?: ActionSink): Promise<CycleReport[]> {
  const afterCycle = sink && isDrainable(sink) ? () => (sink as DrainableSink).drain() : undefined;
  return runModeBLoopAsync(liveCycles(feed), loop, afterCycle);
}

// ─── REFERENCE FEED — clustersynth control-arm bundles ───────────────────────────────────────────────
// Drives the seam from two clustersynth bundles (a ≥2-month healthy baseline + a monitoring window),
// revealing more of the monitoring window each cycle (so a discovery fires at the cycle where its evidence
// first suffices). The healthy baseline doubles as the known-null cohort stream (sliced per cycle). This
// proves the live async path end-to-end on real topology; a real deployment writes its own TelemetryFeed.

const ser = (b: ScenarioBundle, shard: string, counter: string): number[] | undefined => b.series.get(`${shard}\0${counter}`);

export function bundleFeed(healthyDir: string, monDir: string, nCycles: number): TelemetryFeed {
  const healthy = loadScenarioBundle(healthyDir);
  const mon = loadScenarioBundle(monDir);
  const pairs = loadControlPairs(monDir);
  const counters = mon.counters.map((c) => c.name);
  // Per counter, the pairs present in BOTH bundles for both members.
  const usable = new Map<string, Array<{ treatment: string; control: string }>>();
  for (const c of counters) {
    usable.set(c, pairs.filter((p) =>
      ser(healthy, p.treatment, c) && ser(healthy, p.control, c) && ser(mon, p.treatment, c) && ser(mon, p.control, c)));
  }
  return {
    async baseline(): Promise<BaselineSnapshot> {
      return {
        dtSeconds: healthy.dt_s,
        counters: counters.map((c) => ({
          counter: c,
          units: (usable.get(c) ?? []).map((p) => ({ shard: p.treatment, treatment: ser(healthy, p.treatment, c)!, control: ser(healthy, p.control, c)! })),
        })).filter((cb) => cb.units.length),
      };
    },
    async poll(k: number): Promise<RawCounterWindow[] | null> {
      if (k >= nCycles) return null;
      const monEnd = Math.floor(((k + 1) / nCycles) * mon.T);
      const calLo = Math.floor((k / nCycles) * healthy.T), calHi = Math.floor(((k + 1) / nCycles) * healthy.T);
      return counters.map((c) => {
        const ps = usable.get(c) ?? [];
        return {
          counter: c,
          detection: ps.map((p) => ({ shard: p.treatment, treatment: ser(mon, p.treatment, c)!.slice(0, monEnd), control: ser(mon, p.control, c)!.slice(0, monEnd) })),
          cohort: ps.map((p) => ({ shard: p.treatment, treatment: ser(healthy, p.treatment, c)!.slice(calLo, calHi), control: ser(healthy, p.control, c)!.slice(calLo, calHi) })),
        };
      }).filter((w) => w.detection.length);
    },
    // ADR 0033: this reference feed replays clustersynth bundles, whose generator draws Gaussian innovations
    // (tools/clustersynth-telemetry.ts:140-157) — the stated ground for the lightTails promise, the same
    // one clustersynthModeBEmitter makes. A real deployment writes its own feed and states its own ground,
    // or lets the measurement decide.
    emitterFor: (counter: string) => liveModeBEmitter(counter, { lightTails: true }),
  };
}

// ─── CLI — end-to-end deploy demo on a clustersynth bundle pair ──────────────────────────────────────
// Wires the LIVE async path: bundleFeed → ModeBLoop → a FanOut sink (durable JSONL audit + a recording
// summary, plus an optional webhook and/or remediation command from env). This is the deployment shape —
// only the feed and the sink endpoints differ in production.

function buildSink(recording: RecordingSink): { sink: ActionSink; auditPath: string; extras: string[] } {
  const auditPath = process.env.MODE_B_AUDIT_LOG ?? '/tmp/mode-b-actions.ndjson';
  const sinks: ActionSink[] = [recording, new JsonlAuditSink(auditPath, () => Date.now())];
  const extras: string[] = [`audit → ${auditPath}`];
  if (process.env.MODE_B_WEBHOOK_URL) {
    sinks.push(new WebhookActionSink({ url: process.env.MODE_B_WEBHOOK_URL, now: () => Date.now() }));
    extras.push(`webhook → ${process.env.MODE_B_WEBHOOK_URL}`);
  }
  if (process.env.MODE_B_REMEDIATE_CMD) {
    const [command, ...dispatchArgs] = process.env.MODE_B_REMEDIATE_CMD.split(' ');
    const withdrawArgs = (process.env.MODE_B_STANDDOWN_CMD ?? '').split(' ').slice(1);
    sinks.push(new CommandActionSink({ command, dispatchArgs, withdrawArgs }));
    extras.push(`remediate → ${process.env.MODE_B_REMEDIATE_CMD}`);
  }
  return { sink: new FanOutSink(sinks), auditPath, extras };
}

if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/telemetry-source.js <healthy-baseline-dir> <monitoring-dir> [nCycles]\n' +
      '  Drives the LIVE async Mode B loop from clustersynth control-arm bundles via the TelemetryFeed seam.\n' +
      '  env: MODE_B_AUDIT_LOG (default /tmp/mode-b-actions.ndjson), MODE_B_WEBHOOK_URL (rollout-gate/pager),\n' +
      '       MODE_B_REMEDIATE_CMD + MODE_B_STANDDOWN_CMD ("cmd {shard} ..." templates).\n');
    process.exit(2);
  }
  const nCycles = process.argv[4] ? Number(process.argv[4]) : 12;
  const recording = new RecordingSink();
  const { sink, auditPath, extras } = buildSink(recording);
  const loop = new ModeBLoop({ q: 0.1, sink });
  runModeBLoopLive(bundleFeed(healthyDir, monDir, nCycles), loop, sink).then((reports) => {
    const L: string[] = [];
    L.push('═══ MODE B LIVE DEPLOY LOOP — TelemetryFeed → loop → control plane (ADR 0019) ═══');
    L.push(`${nCycles} cycles; one emitter per counter; q=0.1. Sinks: ${extras.join('; ')}.`);
    L.push('');
    for (const r of reports) {
      const evts = r.emitters.filter((e) => e.dispatched || e.withdrawn || e.modeChanged);
      if (!evts.length) continue;
      L.push(`cycle ${String(r.cycle).padStart(2)}: ` + evts.map((e) => `${e.emitter.replace('live-mode-b/', '')}[${e.mode}]` + (e.dispatched ? ` +${e.dispatched}` : '') + (e.withdrawn ? ` -${e.withdrawn}` : '')).join('  '));
    }
    L.push('');
    L.push(`TOTAL: ${recording.dispatched.length} actions dispatched, ${recording.withdrawn.length} withdrawn (${recording.withdrawn.filter((w) => w.reason === 'revoked').length} on revoke). Audit trail: ${auditPath}.`);
    L.push('Each dispatched action is an FDR-controlled discovery acted on the live control plane ONLY while');
    L.push('its emitter holds a live Mode-B guarantee; a Mode-A emitter abstains (ranking/evidence elsewhere).');
    process.stdout.write(L.join('\n') + '\n');
    process.exit(0);
  }).catch((e) => { process.stderr.write(String(e?.stack ?? e) + '\n'); process.exit(1); });
}
