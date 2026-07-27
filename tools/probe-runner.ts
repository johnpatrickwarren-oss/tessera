// tools/probe-runner.ts — scheduler/daemon for the Apple Silicon probe pilot
// (docs/SPEC-probe-pilot-apple-silicon.md, DECIDED 2026-07-27).
//
// WHAT IT DOES. Every `base ± U(0, base)` (default 2 h — the jitter is LOAD-BEARING: fixed
// spacing pins the diurnal phase, the theta-tau § 7 lesson), run one ROUND: the probe trio in
// randomized order across its lanes — p1int and p4mem on the P-cluster (plain spawn) and the
// E-cluster (`taskpolicy -b`, verified 3.5× duration separation on an idle M5), p5gpu on the GPU.
// Each execution appends one line to TWO ndjson files:
//   scores.ndjson         the per-execution record the estimators consume
//   probe-windows.ndjson  the exclusion ledger — wall-clock windows the passive-baseline
//                         consumers must excise (baseline hygiene, SPEC § 3)
//
// BLOCK KEY = probe_id × binary_hash × chip × hw_model × macos_build × lane. An OS or binary
// update opens a NEW epoch; nothing is ever ranked across keys. The runner only RECORDS —
// ranking/calibration happens offline in the existing tools, and the pilot is Mode A only.
//
// GATE. `notBefore` (config): the daemon REFUSES to start before it. The mini's plist sets
// 2026-08-29 — the 56-day passive-baseline gate. Dev machines omit it; `--once` ignores it
// (a single dev round on a non-baseline host is how this file was verified).
//
// Run: node tools/probe-runner.js --once [--out probe-data] [--binary tools/probe/build/probes]
//      node tools/probe-runner.js --daemon --config <json>

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProbeRunnerConfig {
  binaryPath: string;
  outDir: string;
  /** base interval; actual spacing is base + U(0, base). */
  baseIntervalMs: number;
  /** ISO date the daemon refuses to run before (the mini's baseline gate). */
  notBefore?: string;
}

export const DEFAULT_CONFIG: ProbeRunnerConfig = {
  binaryPath: 'tools/probe/build/probes',
  outDir: 'probe-data',
  baseIntervalMs: 2 * 3600 * 1000,
};

export interface HostKey { chip: string; hwModel: string; osBuild: string; binaryHash: string }

/** Exec abstraction so every scheduling/recording path is testable without hardware. */
export type Exec = (file: string, args: string[]) => string;
export const realExec: Exec = (file, args) =>
  execFileSync(file, args, { encoding: 'utf8', timeout: 120_000 });

export function collectHostKey(binaryPath: string, exec: Exec = realExec): HostKey {
  const chip = exec('/usr/sbin/sysctl', ['-n', 'machdep.cpu.brand_string']).trim();
  const hwModel = exec('/usr/sbin/sysctl', ['-n', 'hw.model']).trim();
  const osBuild = exec('/usr/bin/sw_vers', ['-buildVersion']).trim();
  const binaryHash = exec('/usr/bin/shasum', ['-a', '256', binaryPath]).split(/\s+/)[0];
  return { chip, hwModel, osBuild, binaryHash };
}

/** The block key: rank only within this. Any component changing = a new epoch. */
export function blockKey(h: HostKey, probeId: string, lane: string): string {
  return [probeId, h.binaryHash.slice(0, 16), h.chip, h.hwModel, h.osBuild, lane].join('|');
}

/** Jittered spacing: base + U(0, base). NEVER a fixed multiple of 24 h (theta-tau § 7). */
export function nextDelayMs(baseMs: number, r: () => number): number {
  return baseMs + Math.floor(r() * baseMs);
}

/** One probe × lane execution slot. p1/p4 run on both CPU clusters; p5 owns the GPU lane. */
export interface Slot { probeId: 'p1' | 'p4' | 'p5'; lane: 'P' | 'E' | 'gpu' }
export const SLOTS: readonly Slot[] = [
  { probeId: 'p1', lane: 'P' }, { probeId: 'p1', lane: 'E' },
  { probeId: 'p4', lane: 'P' }, { probeId: 'p4', lane: 'E' },
  { probeId: 'p5', lane: 'gpu' },
];

/** How a slot is spawned: the E lane goes through `taskpolicy -b` (QoS → E-cluster). */
export function spawnArgs(binaryPath: string, s: Slot): { file: string; args: string[] } {
  if (s.lane === 'E') return { file: '/usr/sbin/taskpolicy', args: ['-b', binaryPath, s.probeId] };
  return { file: binaryPath, args: [s.probeId] };
}

export interface ScoreRecord {
  t_wall: string; block_key: string; probe: string; lane: string;
  duration_ns: number; errors: number;
  /** false when the binary reports errors = −1 (golden unset) — never feed these to a rank. */
  valid: boolean;
  checksum: string;
}
export interface LedgerRecord { t_start_ms: number; t_end_ms: number; probe: string; lane: string }

export function appendNdjson(file: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(obj)}\n`);
}

function shuffled<T>(xs: readonly T[], r: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One round: all slots in randomized order, each recorded in the ledger AND the score log. */
export function runRound(
  cfg: ProbeRunnerConfig, host: HostKey, r: () => number, exec: Exec = realExec,
): ScoreRecord[] {
  const out: ScoreRecord[] = [];
  for (const slot of shuffled(SLOTS, r)) {
    const { file, args } = spawnArgs(cfg.binaryPath, slot);
    const t0 = Date.now();
    let line = '';
    try {
      line = exec(file, args).trim();
    } catch (e) {
      // A probe that cannot RUN is an infrastructure event, not a score — ledger it and move on.
      appendNdjson(path.join(cfg.outDir, 'probe-windows.ndjson'),
        { t_start_ms: t0, t_end_ms: Date.now(), probe: slot.probeId, lane: slot.lane, failed: String(e) });
      continue;
    }
    const t1 = Date.now();
    const parsed = JSON.parse(line) as { probe: string; duration_ns: number; errors: number; checksum: string };
    const rec: ScoreRecord = {
      t_wall: new Date(t0).toISOString(),
      block_key: blockKey(host, slot.probeId, slot.lane),
      probe: parsed.probe, lane: slot.lane,
      duration_ns: parsed.duration_ns, errors: parsed.errors,
      valid: parsed.errors >= 0,
      checksum: parsed.checksum,
    };
    appendNdjson(path.join(cfg.outDir, 'scores.ndjson'), rec);
    appendNdjson(path.join(cfg.outDir, 'probe-windows.ndjson'),
      { t_start_ms: t0, t_end_ms: t1, probe: slot.probeId, lane: slot.lane } satisfies LedgerRecord);
    out.push(rec);
  }
  return out;
}

/** The daemon gate: refuse to start before `notBefore` (the mini's 56-day baseline window). */
export function gateOk(cfg: ProbeRunnerConfig, now: Date): { ok: boolean; reason?: string } {
  if (!cfg.notBefore) return { ok: true };
  const gate = new Date(cfg.notBefore);
  if (now < gate) {
    return {
      ok: false,
      reason: `notBefore=${cfg.notBefore}: this host's passive baseline window has not closed; ` +
        `running probes now would contaminate it (SPEC § 3). Daemon refusing to start.`,
    };
  }
  return { ok: true };
}

function daemon(cfg: ProbeRunnerConfig): void {
  const gate = gateOk(cfg, new Date());
  if (!gate.ok) { console.error(gate.reason); process.exit(78); }
  const host = collectHostKey(cfg.binaryPath);
  const r = Math.random;
  const tick = (): void => {
    const recs = runRound(cfg, host, r);
    const bad = recs.filter((x) => x.valid && x.errors > 0);
    console.log(`${new Date().toISOString()} round: ${recs.length} executions` +
      (bad.length ? `  ⚠️ SDC signals: ${bad.map((x) => `${x.probe}/${x.lane}`).join(',')}` : ''));
    setTimeout(tick, nextDelayMs(cfg.baseIntervalMs, r));
  };
  tick();
}

if (require.main === module) {
  const arg = (n: string): string | undefined => {
    const i = process.argv.indexOf(n);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const cfg: ProbeRunnerConfig = {
    ...DEFAULT_CONFIG,
    ...(arg('--config') ? JSON.parse(fs.readFileSync(arg('--config') as string, 'utf8')) : {}),
    ...(arg('--binary') ? { binaryPath: arg('--binary') as string } : {}),
    ...(arg('--out') ? { outDir: arg('--out') as string } : {}),
  };
  if (process.argv.includes('--daemon')) {
    daemon(cfg);
  } else {
    const host = collectHostKey(cfg.binaryPath);
    const recs = runRound(cfg, host, Math.random);
    for (const rec of recs) console.log(JSON.stringify(rec));
  }
}
