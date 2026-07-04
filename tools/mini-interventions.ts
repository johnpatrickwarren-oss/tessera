// tools/mini-interventions.ts — the Phase-2 INTERVENTION RUNNER for the mac mini real-telemetry
// program: execute a physical/workload intervention against the live machine and append a ground-
// truth record to the interventions journal (interventions.ndjson). tools/mini-bundle.ts later maps
// journal entries to labels.json faults, so detection is scored against KNOWN truth on real physics.
//
// INTERVENTION TYPES:
//   cpu-load  — N busy-loop node workers under a `taskpolicy` QoS class. On Apple Silicon,
//               `-c background` schedules onto the E-cluster (affected shards default to the E
//               cores), higher QoS biases the P-clusters. The scheduler CAN spill under pressure —
//               the default affected_shards are the DESIGNED target; override with --shards if a
//               run visibly spilled.
//   lowpower  — toggle macOS Low Power Mode for the duration (`pmset -a lowpowermode 1` … `0`).
//               A genuine hardware-behavior intervention (frequency/power signature), fully
//               reversible. REQUIRES ROOT — run this type under sudo. Affects ALL shards.
//   gpu-load  — runs the command in $GPU_LOAD_CMD for the duration (there is no portable GPU load
//               without a Metal binary; supply your own and the journal still gets ground truth).
//               Affects no core shards by default (GPU counters are not shard-ified yet) — it
//               exists to create labeled package-level common-mode events.
//
// IMPORTANT: do NOT run interventions during the baseline window (phase 1) — a deliberate anomaly
// in the baseline either becomes "normal" or must be curated out. This tool is for the MONITORING
// phase (after the 56-day gate clears), or for separate throwaway windows.
// Tessera-original.

import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

export interface InterventionSpec {
  type: 'cpu-load' | 'lowpower' | 'gpu-load';
  durationS: number;
  qos?: 'background' | 'utility' | 'default';
  workers?: number;
  shards?: string[];        // override the designed affected set
  note?: string;
  sleepBeforeS?: number;    // campaign pacing
}

export interface InterventionDeps {
  /** Run a command to completion; resolves with the exit code. */
  run: (cmd: string, args: string[]) => Promise<number>;
  /** Start a long-running command; returns a kill handle. */
  start: (cmd: string, args: string[]) => { kill: () => void; done: Promise<void> };
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  appendJournal: (line: string) => void;
}

/** M4 Pro mini defaults (verified against this box's cluster inference); override with --shards. */
export const E_CORES = ['c0', 'c1', 'c2', 'c3'];
export const P_CORES = ['c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13'];
export const ALL_CORES = [...E_CORES, ...P_CORES];

const BUSY = 'const e=Date.now()+Number(process.argv[1]); let x=0; while(Date.now()<e){for(let i=0;i<1e6;i++)x+=Math.sqrt(i);} process.exit(0);';

function designedShards(spec: InterventionSpec): string[] {
  if (spec.shards?.length) return spec.shards;
  if (spec.type === 'lowpower') return ALL_CORES;
  if (spec.type === 'gpu-load') return [];
  return (spec.qos ?? 'background') === 'background' ? E_CORES : P_CORES;
}

async function execute(spec: InterventionSpec, deps: InterventionDeps): Promise<void> {
  const ms = spec.durationS * 1000;
  if (spec.type === 'cpu-load') {
    const qos = spec.qos ?? 'background';
    const n = spec.workers ?? 4;
    const handles = Array.from({ length: n }, () =>
      deps.start('taskpolicy', ['-c', qos, process.execPath, '-e', BUSY, String(ms)]));
    await deps.sleep(ms);
    for (const h of handles) h.kill(); // workers self-terminate; kill is belt-and-braces
    await Promise.allSettled(handles.map((h) => h.done));
    return;
  }
  if (spec.type === 'lowpower') {
    if ((await deps.run('pmset', ['-a', 'lowpowermode', '1'])) !== 0) throw new Error('pmset failed — the lowpower type requires root (sudo)');
    try { await deps.sleep(ms); }
    finally { await deps.run('pmset', ['-a', 'lowpowermode', '0']); } // ALWAYS restore
    return;
  }
  // gpu-load
  const cmd = process.env.GPU_LOAD_CMD;
  if (!cmd) throw new Error('gpu-load needs $GPU_LOAD_CMD (no portable GPU load without a Metal binary)');
  const h = deps.start('/bin/sh', ['-c', cmd]);
  await deps.sleep(ms);
  h.kill();
  await Promise.allSettled([h.done]);
}

/** Run one intervention and journal it (start/end stamped around the actual execution). */
export async function runIntervention(spec: InterventionSpec, deps: InterventionDeps): Promise<void> {
  if (spec.sleepBeforeS) await deps.sleep(spec.sleepBeforeS * 1000);
  const t_start = Math.round(deps.now() / 1000);
  let failed: string | undefined;
  try { await execute(spec, deps); }
  catch (e) { failed = String((e as Error).message); }
  const t_end = Math.round(deps.now() / 1000);
  deps.appendJournal(JSON.stringify({
    t_start, t_end, type: spec.type,
    affected_shards: failed ? [] : designedShards(spec),
    counter: null,
    params: { qos: spec.qos, workers: spec.workers, durationS: spec.durationS },
    ...(spec.note ? { note: spec.note } : {}),
    ...(failed ? { failed } : {}),
  }));
  if (failed) throw new Error(failed);
}

export async function runCampaign(specs: InterventionSpec[], deps: InterventionDeps): Promise<void> {
  for (const s of specs) await runIntervention(s, deps);
}

function realDeps(journalFile: string): InterventionDeps {
  return {
    run: (cmd, args) => new Promise((resolve) => {
      const p = spawn(cmd, args, { stdio: 'ignore' });
      p.on('close', (code) => resolve(code ?? 1));
      p.on('error', () => resolve(127));
    }),
    start: (cmd, args) => {
      const p = spawn(cmd, args, { stdio: 'ignore' });
      const done = new Promise<void>((resolve) => { p.on('close', () => resolve()); p.on('error', () => resolve()); });
      return { kill: () => { try { p.kill('SIGTERM'); } catch { /* already gone */ } }, done };
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    appendJournal: (line) => fs.appendFileSync(journalFile, line + '\n'),
  };
}

if (require.main === module) {
  const sub = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      type: { type: 'string' }, duration: { type: 'string' }, qos: { type: 'string' },
      workers: { type: 'string' }, shards: { type: 'string' }, note: { type: 'string' },
      spec: { type: 'string' },
      journal: { type: 'string', default: '/Users/johnwarren/concord/telemetry/interventions.ndjson' },
    },
  });
  const deps = realDeps(values.journal);
  const usage = 'usage: node tools/mini-interventions.js run --type cpu-load|lowpower|gpu-load --duration <s> [--qos background|utility|default] [--workers N] [--shards c0,c1] [--note ...]\n' +
    '       node tools/mini-interventions.js campaign --spec <file.json>   (array of run specs, sleepBeforeS pacing)\n';
  (async () => {
    if (sub === 'run') {
      if (!values.type || !values.duration) { process.stderr.write(usage); process.exit(2); }
      await runIntervention({
        type: values.type as InterventionSpec['type'], durationS: Number(values.duration),
        qos: values.qos as InterventionSpec['qos'], workers: values.workers ? Number(values.workers) : undefined,
        shards: values.shards ? values.shards.split(',') : undefined, note: values.note,
      }, deps);
      process.stdout.write('intervention complete + journaled\n');
    } else if (sub === 'campaign') {
      if (!values.spec) { process.stderr.write(usage); process.exit(2); }
      const specs = JSON.parse(fs.readFileSync(values.spec, 'utf8')) as InterventionSpec[];
      await runCampaign(specs, deps);
      process.stdout.write(`campaign complete: ${specs.length} interventions journaled\n`);
    } else { process.stderr.write(usage); process.exit(2); }
  })().catch((e) => { process.stderr.write(`mini-interventions: ${String((e as Error).message)}\n`); process.exit(1); });
}
