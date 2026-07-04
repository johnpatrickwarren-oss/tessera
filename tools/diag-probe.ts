// tools/diag-probe.ts — CORDON→DIAG→UNCORDON active-probe ActionSink + the result-feedback path
// (the "Tessera aims, DCGM confirms" loop). A Mode B dispatch is an FDR-controlled *behavioral*
// discovery; this sink spends it on an ACTIVE mechanism probe: evacuate the shard (cordon — deep
// diag levels need the GPU idle), run an escalating `dcgmi diag` ladder (r1 quick sanity first,
// deeper levels only if the shallow one finds nothing), restore it (uncordon), and feed the verdict
// back to the loop as a ProbeOutcome (ModeBLoopOptions.feedback) the next cycle.
//
// WHAT A VERDICT MEANS — and what it deliberately does NOT do:
//   • 'confirmed' — a diag level failed: the mechanism is hardware-visible. The shard is LEFT
//     CORDONED (keepCordonOnConfirm, default true — a statistical resolve later does not fix
//     hardware) and the outcome flows to the audit/webhook sinks, where the control plane owns
//     escalation (RMA ticket, page-severity bump).
//   • 'clean'     — every ladder level passed. This does NOT withdraw the standing action and the
//     loop does NOT treat it as exoneration: Tessera's target class (SDC-class silent faults,
//     behavioral drift) is precisely what passes hardware diags. A clean probe reclassifies the
//     hypothesis space (mechanism not hardware-visible → SDC/workload), it never overrides the
//     statistical evidence. The action resolves only when the evidence resolves.
//   • 'cancelled' — the action was withdrawn (resolved/revoked) before or while the probe ran; the
//     ladder stops at the next step boundary and the shard is uncordoned.
//   • 'error'     — the orchestration itself failed (cordon/uncordon/exec error).
//
// CONTRACT DEVIATION (deliberate). Unlike the other DrainableSinks, drain() STARTS the ladders but
// does not await their completion — an r3/r4 (EUD) diag runs for tens of minutes and must not block
// the loop cadence. Failures therefore surface through the FEEDBACK channel ('error'/'confirmed'
// outcomes), never by drain() throwing; idle() awaits all in-flight ladders (shutdown / tests).
//
// EXIT-CODE CONVENTION: diag exit 0 = pass, nonzero = fault found. If your dcgmi build reports
// failures only in its JSON output, point `diag` at a wrapper script that translates. The cordon/
// uncordon/diag commands are DEPLOYMENT CONFIG ({shard} → hostname mapping included) — this file
// provides the tested orchestration, not the cluster specifics. Tessera-original.

import type { FleetAction, WithdrawReason, ProbeOutcome, ProbeStep, FeedbackSource } from './mode-b-loop.js';
import { actionKey, defaultExec, type DrainableSink, type ExecLike } from './action-sinks.js';

/** One configured command. `args` placeholders: {shard} always; {level} in `diag` only. */
export interface CommandSpec { command: string; args: string[] }

export interface DiagProbeOptions {
  /** Evacuate the shard before diagnostics (e.g. { command: 'kubectl', args: ['cordon', '{shard}'] }). */
  cordon: CommandSpec;
  /** Restore the shard after a clean/cancelled probe (e.g. ['uncordon', '{shard}']). */
  uncordon: CommandSpec;
  /** One diag level (e.g. { command: 'dcgmi', args: ['diag', '-r', '{level}', '--host', '{shard}'] }). */
  diag: CommandSpec;
  /** The escalation ladder, shallow→deep; runs until a level fails or all pass. Default [1, 3]. */
  levels?: number[];
  /** Leave a hardware-confirmed shard cordoned (default true). */
  keepCordonOnConfirm?: boolean;
  /** Topology group of a shard (e.g. its rack id) — RACK-LEVEL DEDUPE. A common-mode discovery fans out
   *  one FleetAction per member shard; unbounded, this sink would cordon the entire group at once (a
   *  monitoring-induced capacity incident). With groupOf set, at most maxProbesPerGroup probes run per
   *  group concurrently; excess dispatches emit a 'delegated' outcome naming the shards probing on the
   *  group's behalf. Return undefined for an ungrouped shard. Omit entirely to disable dedupe. */
  groupOf?: (shard: string) => string | undefined;
  /** Max queued+in-flight probes per topology group (default 2 — one confirms, two corroborate). */
  maxProbesPerGroup?: number;
  /** Injected runner (default: execFile-based). Tests pass a fake. */
  execImpl?: ExecLike;
}

interface ProbeJob { action: FleetAction; key: string }

export class DiagProbeSink implements DrainableSink, FeedbackSource {
  private readonly levels: number[];
  private readonly keepCordon: boolean;
  private readonly maxPerGroup: number;
  private readonly exec: ExecLike;
  private queue: ProbeJob[] = [];
  private readonly inflight = new Map<string, { done: Promise<void>; shard: string }>();
  private readonly cancelRequested = new Set<string>();
  private outbox: ProbeOutcome[] = [];

  constructor(private readonly opts: DiagProbeOptions) {
    this.levels = opts.levels ?? [1, 3];
    this.keepCordon = opts.keepCordonOnConfirm ?? true;
    this.maxPerGroup = opts.maxProbesPerGroup ?? 2;
    this.exec = opts.execImpl ?? defaultExec;
  }

  private subst(spec: CommandSpec, shard: string, level?: number): string[] {
    return spec.args.map((t) => t.replace(/\{(\w+)\}/g, (_, k) =>
      k === 'shard' ? shard : k === 'level' && level !== undefined ? String(level) : `{${k}}`));
  }

  /** The shards currently occupying `group`'s probe budget (queued or in flight). */
  private groupOccupants(group: string): string[] {
    const g = this.opts.groupOf!;
    return [
      ...this.queue.filter((j) => g(j.action.shard) === group).map((j) => j.action.shard),
      ...[...this.inflight.values()].filter((f) => g(f.shard) === group).map((f) => f.shard),
    ];
  }

  /** One probe per standing episode: the loop's debounce makes dispatch edge-triggered, and a dispatch
   *  arriving while the key's probe is still running (fast resolve→re-discover flap) lets the running
   *  probe serve the new episode by clearing its pending cancellation. A dispatch whose topology group
   *  is already at its probe quota is DELEGATED, not queued (see DiagProbeOptions.groupOf). */
  dispatch(a: FleetAction): void {
    const key = actionKey(a);
    if (this.inflight.has(key)) { this.cancelRequested.delete(key); return; }
    if (this.queue.some((j) => j.key === key)) return;
    const group = this.opts.groupOf?.(a.shard);
    if (group !== undefined) {
      const occupants = this.groupOccupants(group);
      if (occupants.length >= this.maxPerGroup) {
        this.outbox.push(this.outcome(a, 'delegated', [], false, { detail: `group ${group} probe quota in use by: ${occupants.join(', ')}` }));
        return;
      }
    }
    this.queue.push({ action: a, key });
  }

  withdraw(a: FleetAction, _reason: WithdrawReason): void {
    const key = actionKey(a);
    const qi = this.queue.findIndex((j) => j.key === key);
    if (qi >= 0) { // never started → never cordoned; cancel outright
      const job = this.queue.splice(qi, 1)[0];
      this.outbox.push(this.outcome(job.action, 'cancelled', [], false));
      return;
    }
    if (this.inflight.has(key)) this.cancelRequested.add(key); // ladder stops at the next step boundary
    // Completed probes: final cordon state was set by policy — a hardware-confirmed shard stays
    // cordoned even after the statistical action resolves.
  }

  /** Start every queued ladder (cordon + diag run in the background; see the header contract note). */
  async drain(): Promise<void> {
    const jobs = this.queue;
    this.queue = [];
    for (const job of jobs) {
      const done = this.runLadder(job).finally(() => { this.inflight.delete(job.key); this.cancelRequested.delete(job.key); });
      this.inflight.set(job.key, { done, shard: job.action.shard });
    }
  }

  /** Await all in-flight ladders (shutdown / tests). */
  async idle(): Promise<void> {
    while (this.inflight.size) await Promise.allSettled([...this.inflight.values()].map((f) => f.done));
  }

  takeOutcomes(): ProbeOutcome[] {
    const out = this.outbox;
    this.outbox = [];
    return out;
  }

  private outcome(a: FleetAction, verdict: ProbeOutcome['verdict'], steps: ProbeStep[], cordoned: boolean, extra?: Partial<ProbeOutcome>): ProbeOutcome {
    return { key: actionKey(a), emitter: a.emitter, shard: a.shard, cycle: a.cycle, verdict, steps, cordoned, ...extra };
  }

  /** Run one configured command, normalizing throws into the result (`error` set, code -1). */
  private async tryExec(spec: CommandSpec, shard: string, level?: number): Promise<{ code: number; stderr: string; error?: string }> {
    try {
      return await this.exec(spec.command, this.subst(spec, shard, level));
    } catch (e) {
      return { code: -1, stderr: '', error: String((e as Error)?.message ?? e) };
    }
  }

  private static describe(name: string, r: { code: number; stderr: string; error?: string }): string {
    return r.error ? `${name}: ${r.error}` : `${name} exit ${r.code}${r.stderr ? `: ${r.stderr.trim()}` : ''}`;
  }

  private async runLadder(job: ProbeJob): Promise<void> {
    const { action: a, key } = job;
    const steps: ProbeStep[] = [];
    // 1. Evacuate.
    const cordon = await this.tryExec(this.opts.cordon, a.shard);
    if (cordon.error || cordon.code !== 0) {
      this.outbox.push(this.outcome(a, 'error', steps, false, { detail: DiagProbeSink.describe('cordon', cordon) }));
      return;
    }
    // 2. Diagnose. 3. Restore + report.
    const { failedLevel, error } = await this.climb(key, a.shard, steps);
    await this.finish(a, key, steps, failedLevel, error);
  }

  /** The escalating ladder: shallow→deep until a level fails (mechanism confirmed), all pass, or cancel. */
  private async climb(key: string, shard: string, steps: ProbeStep[]): Promise<{ failedLevel?: number; error?: string }> {
    for (const level of this.levels) {
      if (this.cancelRequested.has(key)) return {};
      const r = await this.tryExec(this.opts.diag, shard, level);
      if (r.error) return { error: `diag r${level}: ${r.error}` };
      steps.push({ level, code: r.code, stderr: r.stderr });
      if (r.code !== 0) return { failedLevel: level };
    }
    return {};
  }

  /** Restore the shard (unless a hardware-confirmed one should stay evacuated) and emit the outcome. */
  private async finish(a: FleetAction, key: string, steps: ProbeStep[], failedLevel: number | undefined, error: string | undefined): Promise<void> {
    const confirmed = failedLevel !== undefined;
    let cordoned = true;
    if (!(confirmed && this.keepCordon)) {
      const u = await this.tryExec(this.opts.uncordon, a.shard);
      if (u.error || u.code !== 0) error = (error ? `${error}; ` : '') + DiagProbeSink.describe('uncordon', u);
      else cordoned = false;
    }
    const verdict: ProbeOutcome['verdict'] =
      confirmed ? 'confirmed' : error ? 'error' : this.cancelRequested.has(key) ? 'cancelled' : 'clean';
    const extra: Partial<ProbeOutcome> = {};
    if (failedLevel !== undefined) extra.failedLevel = failedLevel;
    if (error) extra.detail = error;
    this.outbox.push(this.outcome(a, verdict, steps, cordoned, extra));
  }
}
