// tools/mode-b-loop.ts — the ALWAYS-ON Mode B control loop: wire FDR-guaranteed discoveries to actions
// (ADR 0019). This is the orchestration layer that makes the two-mode architecture operational.
//
// WHAT IT DOES. Each cycle, per emitter, it (1) updates the PER-SHARD anytime-valid calibration monitors
// over the concurrent-control cohort — these ACCUMULATE evidence across cycles, which is the whole point
// of an anytime-valid test; (2) decides construction validity NOW (a broad fraction of shard monitors
// still passing AND the Wall-A whiteness check); (3) routes the emitter through the validity-class gate
// to Mode B or Mode A; (4) if Mode B, runs the GATED e-BH on the contrast e-values and reconciles the
// resulting FDR-controlled discovery set against the standing actions — DISPATCHING new discoveries and
// WITHDRAWING ones that resolve; (5) if the emitter falls Mode B→A (its guarantee is revoked), withdraws
// ALL its standing actions, because an action keyed to a bounded error rate must not outlive the
// guarantee it was keyed to.
//
// THE INVARIANTS IT ENFORCES (see test/mode-b-loop.test.ts):
//   • NO ACTION WITHOUT A LIVE GUARANTEE — a Mode-A emitter never dispatches, however large its e-values.
//   • REVOCATION WITHDRAWS — when construction validity breaks, standing actions are withdrawn ('revoked').
//   • DEBOUNCE — a still-standing discovery is dispatched once, not re-fired every cycle.
//   • RESOLUTION WITHDRAWS — a discovery that disappears (while still Mode B) is withdrawn ('resolved').
//   • AUDIT — every dispatch/withdraw + mode transition flows through the sink / report.
//
// SEPARATION OF CONCERNS. The loop is the ACTION layer for Mode B (the calibrated-error-rate product). It
// does NOT own Mode A's ranking/early-warning output — that is the always-on substrate elsewhere; here a
// Mode-A emitter is simply visible as abstaining. The CONCRETE action (block a rollout, page, auto-
// remediate) lives in the injected ActionSink — the loop only says "here is an FDR-controlled discovery,
// act" / "stand down". The per-shard contrast e-values + calibration samples are computed by the caller
// (e.g. tools/clustersynth-mode-b.ts); the loop orchestrates. Tessera-original.

import { fdrBenjaminiHochberg, modeOf, type EmitterContract, type Mode } from './emitter-contract.js';
import { freshCalibrationMonitor, updateCalibrationBatch, type CalibrationMonitorState } from './calibration-monitor.js';

export type WithdrawReason = 'resolved' | 'revoked';

/** An FDR-controlled discovery promoted to an action. The SINK maps this to a concrete effect (block /
 *  page / remediate); the loop guarantees it is only ever emitted for a Mode-B (guaranteed) emitter. */
export interface FleetAction { emitter: string; shard: string; cycle: number; eValue: number; q: number }

export interface ActionSink {
  dispatch(action: FleetAction): void;
  withdraw(action: FleetAction, reason: WithdrawReason): void;
}

/** An in-memory sink that records every dispatch/withdraw — for tests and the CLI summary. */
export class RecordingSink implements ActionSink {
  readonly dispatched: FleetAction[] = [];
  readonly withdrawn: Array<{ action: FleetAction; reason: WithdrawReason }> = [];
  dispatch(a: FleetAction): void { this.dispatched.push(a); }
  withdraw(a: FleetAction, reason: WithdrawReason): void { this.withdrawn.push({ action: a, reason }); }
}

/** One emitter's input for one cycle. */
export interface EmitterCycle {
  /** The emitter contract (validity_class gates Mode B; the loop sets calibrationMonitorPassing). */
  contract: EmitterContract;
  /** The unit ids aligned with eValues (treatment shards). */
  shards: string[];
  /** Per-shard contrast e-value over the data SO FAR. MUST be the running value of ONE e-process
   *  with horizon-independent weights (e.g. geometricMixtureEValue) — supplying a per-cycle
   *  re-normalized value (e.g. normalizedMixtureEValue over a growing prefix) makes each cycle a
   *  different mixture, and the cross-cycle first-crossing dispatch loses its theorem (2026-07-02). */
  eValues: number[];
  /** This cycle's NEW known-null residuals, one stream per concurrent-control unit. Fed PER SHARD into
   *  separate accumulating martingales (pooling over-powers — ADR 0019 productionization finding). */
  calibrationSamples: number[][];
  /** The Wall-A whiteness verdict for the construction this cycle (serial-dependence guard). */
  whitenessPass: boolean;
}

export interface EmitterReport {
  emitter: string; mode: Mode; modeChanged: boolean; constructionValid: boolean;
  calibFrac: number; whitenessPass: boolean;
  selected: number; dispatched: number; withdrawn: number; standing: number;
}
export interface CycleReport { cycle: number; emitters: EmitterReport[] }

export interface ModeBLoopOptions { q?: number; alpha?: number; calibFracThreshold?: number; sink: ActionSink }

export class ModeBLoop {
  private readonly q: number;
  private readonly alpha: number;
  private readonly calibThresh: number;
  private readonly sink: ActionSink;
  private readonly monitors = new Map<string, CalibrationMonitorState[]>(); // emitter → per-shard monitors
  private readonly standing = new Map<string, Map<string, FleetAction>>();   // emitter → shard → action
  private readonly lastMode = new Map<string, Mode>();

  constructor(opts: ModeBLoopOptions) {
    this.q = opts.q ?? 0.1;
    this.alpha = opts.alpha ?? 0.01;
    this.calibThresh = opts.calibFracThreshold ?? 0.8;
    this.sink = opts.sink;
  }

  /** Re-establish a revoked emitter's construction (e.g. after a re-baseline): drop its accumulated
   *  monitors so a FRESH anytime-valid test starts next cycle. Standing actions (there should be none
   *  while revoked) are untouched. */
  rearm(emitterId: string): void { this.monitors.delete(emitterId); }

  step(cycle: number, emitters: EmitterCycle[]): CycleReport {
    return { cycle, emitters: emitters.map((e) => this.stepEmitter(cycle, e)) };
  }

  /** Update the per-shard accumulating calibration monitors; return the fraction still passing. */
  private updateMonitors(id: string, samples: number[][]): number {
    let mons = this.monitors.get(id);
    if (!mons || mons.length !== samples.length) { mons = samples.map(() => freshCalibrationMonitor({ alpha: this.alpha })); this.monitors.set(id, mons); }
    samples.forEach((s, i) => updateCalibrationBatch(mons![i], s));
    return mons.length ? mons.filter((m) => m.passing).length / mons.length : 1;
  }

  private stepEmitter(cycle: number, ec: EmitterCycle): EmitterReport {
    const id = ec.contract.id;
    const calibFrac = this.updateMonitors(id, ec.calibrationSamples);
    const constructionValid = calibFrac >= this.calibThresh && ec.whitenessPass;
    const contract: EmitterContract = { ...ec.contract, calibrationMonitorPassing: constructionValid };
    const mode = modeOf(contract);
    const prev = this.lastMode.get(id) ?? 'A';
    this.lastMode.set(id, mode);

    // Mode B → the GATED e-BH discovery set; Mode A → no FDR-keyed discoveries (abstain).
    const discovered = new Map<string, number>();
    if (mode === 'B') for (const i of fdrBenjaminiHochberg(ec.eValues, this.q, contract, `mode-b-loop:${id}`).selected) discovered.set(ec.shards[i], ec.eValues[i]);

    const { dispatched, withdrawn, standing } = this.reconcile(id, cycle, discovered, prev === 'B' && mode === 'A');
    return { emitter: id, mode, modeChanged: mode !== prev, constructionValid, calibFrac, whitenessPass: ec.whitenessPass, selected: discovered.size, dispatched, withdrawn, standing };
  }

  /** Diff the new discovery set against standing actions: dispatch new ones, withdraw gone ones (reason
   *  'revoked' on a B→A transition, else 'resolved'). Debounced — a still-standing discovery is not
   *  re-dispatched. (When mode is A, `discovered` is empty, so a B→A transition withdraws everything.) */
  private reconcile(id: string, cycle: number, discovered: Map<string, number>, revoked: boolean): { dispatched: number; withdrawn: number; standing: number } {
    const stand = this.standing.get(id) ?? new Map<string, FleetAction>();
    let dispatched = 0, withdrawn = 0;
    for (const [shard, e] of discovered) {
      if (!stand.has(shard)) { const a: FleetAction = { emitter: id, shard, cycle, eValue: e, q: this.q }; stand.set(shard, a); this.sink.dispatch(a); dispatched++; }
    }
    for (const [shard, a] of [...stand]) {
      if (!discovered.has(shard)) { this.sink.withdraw(a, revoked ? 'revoked' : 'resolved'); stand.delete(shard); withdrawn++; }
    }
    this.standing.set(id, stand);
    return { dispatched, withdrawn, standing: stand.size };
  }
}

/** Drive the loop over a sequence of cycles (the always-on loop body: in production the source is a live
 *  telemetry+control feed; for validation it is a replay). Returns the per-cycle reports. */
export function runModeBLoop(cycles: Iterable<{ cycle: number; emitters: EmitterCycle[] }>, loop: ModeBLoop): CycleReport[] {
  const reports: CycleReport[] = [];
  for (const c of cycles) reports.push(loop.step(c.cycle, c.emitters));
  return reports;
}

/** Drive the loop over an ASYNC cycle source — the production shape, where each cycle is pulled from a live
 *  telemetry+control feed (tools/telemetry-source.ts). `afterCycle` runs after each step; the live runner
 *  uses it to drain a buffered ActionSink (flush the cycle's webhook/command effects) so the loop's step()
 *  stays synchronous while real I/O happens between cycles, in order. Returns the per-cycle reports. */
export async function runModeBLoopAsync(
  cycles: AsyncIterable<{ cycle: number; emitters: EmitterCycle[] }>,
  loop: ModeBLoop,
  afterCycle?: (report: CycleReport) => Promise<void> | void,
): Promise<CycleReport[]> {
  const reports: CycleReport[] = [];
  for await (const c of cycles) {
    const r = loop.step(c.cycle, c.emitters);
    reports.push(r);
    if (afterCycle) await afterCycle(r);
  }
  return reports;
}

// ─── DEMO: replay a clustersynth bundle as an always-on loop (end-to-end on real topology) ───────────
// Each cycle reveals more of the monitoring window: the contrast e-values grow as a fault accrues
// evidence (so a discovery fires at the cycle where the evidence first suffices — early warning → action),
// and the concurrent-control cohort feeds the per-shard calibration monitors. One emitter per counter.

import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { loadControlPairs, fitContrast, applyContrast, clustersynthModeBEmitter } from './clustersynth-mode-b.js';
import { geometricMixtureEValue } from './mixture-evalue.js';
import { autocorr } from './conditional-markov.js';

interface CounterReplay { c: string; shards: string[]; monStd: number[][]; calStd: number[][]; whitenessPass: boolean }

const seriesOf = (b: ScenarioBundle, s: string, c: string): number[] | undefined => b.series.get(`${s}\0${c}`);
const contrastOf = (b: ScenarioBundle, p: { treatment: string; control: string }, c: string): number[] =>
  seriesOf(b, p.treatment, c)!.map((x, i) => x - seriesOf(b, p.control, c)![i]);

/** Precompute, per counter, the standardized mon contrast (detection) + healthy contrast (calibration). */
function counterReplay(healthy: ScenarioBundle, mon: ScenarioBundle, pairs: Array<{ treatment: string; control: string }>, c: string): CounterReplay | null {
  const usable = pairs.filter((p) => seriesOf(healthy, p.treatment, c) && seriesOf(healthy, p.control, c) && seriesOf(mon, p.treatment, c) && seriesOf(mon, p.control, c));
  if (!usable.length) return null;
  const hC = usable.map((p) => contrastOf(healthy, p, c));
  const fits = hC.map(fitContrast);
  const monStd = usable.map((p, i) => applyContrast(contrastOf(mon, p, c), fits[i]));
  const calStd = hC.map((d, i) => applyContrast(d, fits[i]));
  const whitenessPass = calStd.filter((r) => Math.abs(autocorr(r, 1)) <= 0.1).length / calStd.length >= 0.5;
  return { c, shards: usable.map((p) => p.treatment), monStd, calStd, whitenessPass };
}

/** Replay a same-cadence clustersynth bundle pair as nCycles of an always-on loop. */
export function replayClustersynthCycles(healthyDir: string, monDir: string, nCycles: number): Array<{ cycle: number; emitters: EmitterCycle[] }> {
  const healthy = loadScenarioBundle(healthyDir);
  const mon = loadScenarioBundle(monDir);
  const pairs = loadControlPairs(monDir);
  const cols = mon.counters.map((s) => counterReplay(healthy, mon, pairs, s.name)).filter((x): x is CounterReplay => x != null);
  const monT = mon.T, calT = healthy.T;
  const cycles: Array<{ cycle: number; emitters: EmitterCycle[] }> = [];
  for (let k = 0; k < nCycles; k++) {
    const monEnd = Math.floor(((k + 1) / nCycles) * monT);
    const calLo = Math.floor((k / nCycles) * calT), calHi = Math.floor(((k + 1) / nCycles) * calT);
    const emitters = cols.map((col) => ({
      contract: { ...clustersynthModeBEmitter(true), id: `clustersynth-mode-b/${col.c}` },
      shards: col.shards,
      // GEOMETRIC onset prior (2026-07-02 audit fix): its weights are horizon-independent, so the
      // per-cycle values are prefixes of ONE e-process and dispatch-at-first-crossing is theorem-
      // covered (SupFDR ≤ q). The uniform normalizedMixtureEValue re-normalizes by the prefix length
      // each cycle — a DIFFERENT mixture per look, breaking the cross-cycle guarantee (and its
      // renormalization shrinkage could spuriously 'resolve' a standing real-fault action as T grew).
      eValues: col.monStd.map((s) => geometricMixtureEValue(s.slice(0, monEnd))),
      calibrationSamples: col.calStd.map((s) => s.slice(calLo, calHi)),
      whitenessPass: col.whitenessPass,
    }));
    cycles.push({ cycle: k, emitters });
  }
  return cycles;
}

if (require.main === module) {
  const [healthyDir, monDir] = [process.argv[2], process.argv[3]];
  if (!healthyDir || !monDir) {
    process.stderr.write('usage: node tools/mode-b-loop.js <healthy-baseline-dir> <monitoring-dir> [nCycles]\n  Replays a control-arm bundle pair as an always-on Mode B loop, wiring FDR discoveries to actions.\n');
    process.exit(2);
  }
  const nCycles = process.argv[4] ? Number(process.argv[4]) : 12;
  const sink = new RecordingSink();
  const loop = new ModeBLoop({ q: 0.1, sink });
  const reports = runModeBLoop(replayClustersynthCycles(healthyDir, monDir, nCycles), loop);
  const L: string[] = [];
  L.push('═══ MODE B ALWAYS-ON LOOP — replay (FDR discoveries → actions) ═══');
  L.push(`${nCycles} cycles; one emitter per counter; q=0.1. An action is DISPATCHED only while the emitter holds a live FDR guarantee, and WITHDRAWN when the discovery resolves or the guarantee is revoked.`);
  L.push('');
  for (const r of reports) {
    const evts = r.emitters.filter((e) => e.dispatched || e.withdrawn || e.modeChanged);
    if (!evts.length) continue;
    L.push(`cycle ${String(r.cycle).padStart(2)}: ` + evts.map((e) => `${e.emitter.replace('clustersynth-mode-b/', '')}[${e.mode}]` + (e.dispatched ? ` +${e.dispatched}` : '') + (e.withdrawn ? ` -${e.withdrawn}` : '')).join('  '));
  }
  L.push('');
  const modeA = reports.at(-1)!.emitters.filter((e) => e.mode === 'A').map((e) => e.emitter.replace('clustersynth-mode-b/', ''));
  L.push(`TOTAL: ${sink.dispatched.length} actions dispatched, ${sink.withdrawn.length} withdrawn (${sink.withdrawn.filter((w) => w.reason === 'revoked').length} on revoke).`);
  if (modeA.length) L.push(`ABSTAINING (Mode A, no FDR guarantee → no actions): ${modeA.join(', ')}`);
  L.push('Each dispatched action is an FDR-controlled discovery: the e-values are prefixes of one horizon-');
  L.push('independent e-process (geometric onset prior), so e-BH on the adjusted running max controls SupFDR ≤ q');
  L.push('at every look including the data-dependent first-crossing dispatch (Carefree, arXiv:2501.19360). A');
  L.push('Mode-A emitter contributes ranking/evidence elsewhere but never an FDR-keyed action.');
  process.stdout.write(L.join('\n') + '\n');
  process.exit(0);
}
