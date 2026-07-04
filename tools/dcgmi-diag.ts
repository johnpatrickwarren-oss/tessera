// tools/dcgmi-diag.ts — the DEPLOYMENT-SIDE wrapper for the diag-probe sink (tools/diag-probe.ts):
// shard→host mapping + dcgmi JSON/exit-code translation, as one testable CLI. The sink's command
// templates are deployment config; this is the deployment config's implementation.
//
// Subcommands:
//   diag --shard <id> --level <n> [--hostmap hosts.json | --host-template '{shard}.gpu.local']
//        [--warn-as-fault] [--dcgmi <bin>] [--timeout-s <n>]
//     Runs `dcgmi diag -r <level> --host <host> -j` against the shard's nv-hostengine and translates
//     the JSON result to the sink's EXIT-CODE CONTRACT:
//       0 = every test passed      (contributes to a 'clean' probe verdict)
//       1 = a test FAILED          (mechanism confirmed — the ONLY code the sink reads as a fault)
//       2 = orchestration error    (host unresolvable / dcgmi unreachable / unparseable output).
//     The 0/1/2 split exists because dcgmi's own exit codes and JSON schema vary across versions and
//     failure kinds — and an UNREACHABLE HOST MUST NOT READ AS A CONFIRMED HARDWARE FAULT. The JSON
//     verdict wins when parseable; unparseable output is never claimed as a pass. Failing tests are
//     written to stderr (the sink captures stderr into the ProbeStep → audit trail).
//   exec --shard <id> [--hostmap ... | --host-template ...] -- <cmd> [args...]
//     Resolves the shard's host and runs <cmd> with {host}/{shard} placeholders substituted — the
//     same mapping reused for cordon/uncordon (e.g. `-- kubectl cordon {host}`). The child's exit
//     code passes through; orchestration failures exit 2.
//
// Host resolution (first match wins): --hostmap (JSON object shard→host; a missing shard is an
// orchestration error, not identity fallback), --host-template ({shard} substitution), else identity
// (shard ids ARE hostnames). Example sink wiring:
//   diag:     { command: 'node', args: ['tools/dcgmi-diag.js', 'diag', '--shard', '{shard}',
//               '--level', '{level}', '--hostmap', 'hosts.json'] }
//   cordon:   { command: 'node', args: ['tools/dcgmi-diag.js', 'exec', '--shard', '{shard}',
//               '--hostmap', 'hosts.json', '--', 'kubectl', 'cordon', '{host}'] }
// Tessera-original.

import * as fs from 'node:fs';
import { execFile } from 'node:child_process';
import { parseArgs } from 'node:util';

export const EXIT_PASS = 0;
export const EXIT_FAULT = 1;
export const EXIT_ORCH = 2;

// ─── host resolution ──────────────────────────────────────────────────────────────────────────────

export interface HostResolution { hostmapFile?: string; template?: string }

export function resolveHost(shard: string, opts: HostResolution): string {
  if (opts.hostmapFile) {
    const map = JSON.parse(fs.readFileSync(opts.hostmapFile, 'utf8')) as Record<string, string>;
    const host = map[shard];
    if (typeof host !== 'string' || !host) throw new Error(`shard '${shard}' not in hostmap ${opts.hostmapFile}`);
    return host;
  }
  if (opts.template) return opts.template.replace(/\{shard\}/g, shard);
  return shard;
}

// ─── dcgmi JSON interpretation ────────────────────────────────────────────────────────────────────

export interface DiagFinding { test: string; status: string; gpuIds?: string }
export interface DiagInterpretation { fault: boolean; findings: DiagFinding[]; statusesSeen: number }

function isFaultStatus(status: string, warnAsFault: boolean): boolean {
  const s = status.toLowerCase();
  return s === 'fail' || (s === 'warn' && warnAsFault);
}

function makeFinding(test: string, o: Record<string, unknown>): DiagFinding {
  const status = o.status as string;
  if (typeof o.gpu_ids === 'string') return { test, status, gpuIds: o.gpu_ids };
  return o.gpu_id !== undefined ? { test, status, gpuIds: String(o.gpu_id) } : { test, status };
}

/** Record `o`'s `status` field (if it has one) into the accumulator. */
function noteStatus(o: Record<string, unknown>, test: string, warnAsFault: boolean, acc: { statusesSeen: number; findings: DiagFinding[] }): void {
  if (typeof o.status !== 'string') return;
  acc.statusesSeen++;
  if (isFaultStatus(o.status, warnAsFault)) acc.findings.push(makeFinding(test, o));
}

/** Interpret a `dcgmi diag -j` document. The JSON schema shifts across DCGM versions (top-level key,
 *  category nesting), so this walks the whole document for objects carrying a string `status` field —
 *  the stable atom of every variant — labeling each with the nearest enclosing `name`. `fail` (and
 *  `warn` when warnAsFault) count as fault; `pass`/`skip`/unknown do not. A document with NO status
 *  fields is unparseable output, thrown — it must become EXIT_ORCH, never a claimed pass. */
export function interpretDiagJson(doc: unknown, opts?: { warnAsFault?: boolean }): DiagInterpretation {
  const acc = { statusesSeen: 0, findings: [] as DiagFinding[] };
  const warnAsFault = opts?.warnAsFault === true;
  const stack: Array<{ node: unknown; test: string }> = [{ node: doc, test: '(unnamed)' }];
  while (stack.length) {
    const { node, test } = stack.pop()!;
    if (Array.isArray(node)) { for (const x of node) stack.push({ node: x, test }); continue; }
    if (!node || typeof node !== 'object') continue;
    const o = node as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : test;
    noteStatus(o, name, warnAsFault, acc);
    for (const [k, v] of Object.entries(o)) if (k !== 'status') stack.push({ node: v, test: name });
  }
  if (acc.statusesSeen === 0) throw new Error('no test statuses found in dcgmi JSON output');
  return { fault: acc.findings.length > 0, findings: acc.findings, statusesSeen: acc.statusesSeen };
}

/** Extract the JSON document from dcgmi stdout (tolerates banner lines before the first brace). */
export function parseDiagStdout(stdout: string): unknown {
  const start = stdout.indexOf('{');
  if (start < 0) throw new Error('no JSON in dcgmi output');
  return JSON.parse(stdout.slice(start));
}

// ─── subcommands ──────────────────────────────────────────────────────────────────────────────────

type Exec = (cmd: string, args: string[], timeoutMs?: number) => Promise<{ code: number; stdout: string; stderr: string }>;

const realExec: Exec = (cmd, args, timeoutMs) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
    const code = err ? (typeof err.code === 'number' ? err.code : -1) : 0;
    resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
  });
});

interface DiagArgs { shard: string; level: string; host: string; warnAsFault: boolean; dcgmi: string; timeoutS: number }

async function runDiag(a: DiagArgs, exec: Exec): Promise<number> {
  const r = await exec(a.dcgmi, ['diag', '-r', a.level, '--host', a.host, '-j'], a.timeoutS * 1000);
  if (r.code === -1) { process.stderr.write(`dcgmi-diag: failed to run '${a.dcgmi}': ${r.stderr.trim()}\n`); return EXIT_ORCH; }
  let verdict: DiagInterpretation;
  try {
    verdict = interpretDiagJson(parseDiagStdout(r.stdout), { warnAsFault: a.warnAsFault });
  } catch (e) {
    process.stderr.write(`dcgmi-diag: r${a.level} on ${a.host} (shard ${a.shard}): dcgmi exit ${r.code}, ${String((e as Error).message)}${r.stderr ? `; stderr: ${r.stderr.trim()}` : ''}\n`);
    return EXIT_ORCH;
  }
  if (verdict.fault) {
    const what = verdict.findings.map((f) => `${f.test}=${f.status}${f.gpuIds ? `(gpu ${f.gpuIds})` : ''}`).join(', ');
    process.stderr.write(`dcgmi-diag: FAULT r${a.level} on ${a.host} (shard ${a.shard}): ${what}\n`);
    return EXIT_FAULT;
  }
  if (r.code !== 0) { // all-pass JSON but a nonzero dcgmi exit: something is off — do not claim a pass
    process.stderr.write(`dcgmi-diag: r${a.level} on ${a.host}: tests passed but dcgmi exited ${r.code} — treating as orchestration error\n`);
    return EXIT_ORCH;
  }
  process.stderr.write(`dcgmi-diag: PASS r${a.level} on ${a.host} (shard ${a.shard}): ${verdict.statusesSeen} statuses, 0 failures\n`);
  return EXIT_PASS;
}

async function runExec(shard: string, host: string, argv: string[], exec: Exec): Promise<number> {
  const [cmd, ...args] = argv.map((t) => t.replace(/\{host\}/g, host).replace(/\{shard\}/g, shard));
  const r = await exec(cmd, args);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.stdout) process.stdout.write(r.stdout);
  return r.code === -1 ? EXIT_ORCH : r.code;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────────────────────────

const USAGE = `usage: node tools/dcgmi-diag.js diag --shard <id> --level <n> [--hostmap f.json | --host-template tpl] [--warn-as-fault] [--dcgmi bin] [--timeout-s n]
       node tools/dcgmi-diag.js exec --shard <id> [--hostmap f.json | --host-template tpl] -- <cmd> [args with {host}/{shard}]
exit codes (diag): 0 pass · 1 fault found · 2 orchestration error\n`;

export async function main(argv: string[], exec: Exec = realExec): Promise<number> {
  const sub = argv[0];
  if (sub !== 'diag' && sub !== 'exec') { process.stderr.write(USAGE); return EXIT_ORCH; }
  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    options: {
      shard: { type: 'string' }, level: { type: 'string' },
      hostmap: { type: 'string' }, 'host-template': { type: 'string' },
      'warn-as-fault': { type: 'boolean', default: false },
      dcgmi: { type: 'string', default: 'dcgmi' }, 'timeout-s': { type: 'string', default: '5400' },
    },
    allowPositionals: true,
  });
  if (!values.shard) { process.stderr.write(`dcgmi-diag: --shard is required\n${USAGE}`); return EXIT_ORCH; }
  let host: string;
  try {
    host = resolveHost(values.shard, { hostmapFile: values.hostmap, template: values['host-template'] });
  } catch (e) {
    process.stderr.write(`dcgmi-diag: ${String((e as Error).message)}\n`);
    return EXIT_ORCH;
  }
  if (sub === 'exec') {
    if (!positionals.length) { process.stderr.write(`dcgmi-diag: exec needs a command after --\n${USAGE}`); return EXIT_ORCH; }
    return runExec(values.shard, host, positionals, exec);
  }
  if (!values.level) { process.stderr.write(`dcgmi-diag: diag needs --level\n${USAGE}`); return EXIT_ORCH; }
  return runDiag({ shard: values.shard, level: values.level, host, warnAsFault: values['warn-as-fault'], dcgmi: values.dcgmi, timeoutS: Number(values['timeout-s']) }, exec);
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    process.stderr.write(`dcgmi-diag: ${String((e as Error)?.message ?? e)}\n`);
    process.exit(EXIT_ORCH);
  });
}
