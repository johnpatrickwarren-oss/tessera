// tools/probe-excise.ts — remove probe-execution windows from the mini's passive telemetry.
//
// THE CONTRACT (SPEC-probe-pilot-apple-silicon.md § 3, baseline hygiene): the probe runner logs
// every execution to probe-windows.ndjson ({t_start_ms, t_end_ms, probe, lane}); the mini also
// measures ITSELF, so those windows appear in the passive powermetrics stream as load the
// baseline must not learn. This tool drops every telemetry row whose timestamp falls inside any
// window (± a margin for scheduling/ramp tails) BEFORE the stream reaches `mini-bundle`.
//
// COMPOSITION with mini-bundle's gap handling is the point of the design: an excised probe
// window is a few seconds wide, far below mini-bundle's forward-fill limit (--max-gap, default
// 60 s), so excision produces short fill-able gaps rather than errors. If a future probe exceeds
// the fill limit (P6-thermal would have), the bundle step fails LOUDLY rather than silently
// learning it — that is the correct failure direction and P6 stays cut partly for this reason.
//
// Run: node tools/probe-excise.js --data <dir> --out <dir> --windows probe-windows.ndjson [--margin-ms 2000]
// Tessera-original.

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Win { s: number; e: number }

/** Load windows (ms), widen by the margin, sort, and merge overlaps into disjoint spans. */
export function loadWindows(file: string, marginMs = 2000): Win[] {
  const raw: Win[] = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
    const j = JSON.parse(l) as { t_start_ms: number; t_end_ms: number };
    return { s: j.t_start_ms - marginMs, e: j.t_end_ms + marginMs };
  });
  raw.sort((a, b) => a.s - b.s);
  const out: Win[] = [];
  for (const w of raw) {
    const last = out[out.length - 1];
    if (last && w.s <= last.e) last.e = Math.max(last.e, w.e);
    else out.push({ ...w });
  }
  return out;
}

/** Binary search: is t (ms) inside any merged window? */
export function inAnyWindow(tMs: number, wins: Win[]): boolean {
  let lo = 0, hi = wins.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tMs < wins[mid].s) hi = mid - 1;
    else if (tMs > wins[mid].e) lo = mid + 1;
    else return true;
  }
  return false;
}

/** Filter one telemetry ndjson file (rows carry `t` in epoch SECONDS — the ledger is ms). */
export function exciseFile(inFile: string, outFile: string, wins: Win[]): { kept: number; dropped: number } {
  const lines = fs.readFileSync(inFile, 'utf8').split('\n');
  const out: string[] = [];
  let kept = 0, dropped = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const t = (JSON.parse(line) as { t: number }).t * 1000;
    if (inAnyWindow(t, wins)) { dropped++; continue; }
    out.push(line);
    kept++;
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, out.join('\n') + (out.length ? '\n' : ''));
  return { kept, dropped };
}

export function exciseDir(dataDir: string, outDir: string, wins: Win[]): { files: number; kept: number; dropped: number } {
  let files = 0, kept = 0, dropped = 0;
  for (const f of fs.readdirSync(dataDir).filter((x) => x.endsWith('.ndjson')).sort()) {
    const r = exciseFile(path.join(dataDir, f), path.join(outDir, f), wins);
    files++; kept += r.kept; dropped += r.dropped;
  }
  return { files, kept, dropped };
}

if (require.main === module) {
  const arg = (n: string): string | undefined => {
    const i = process.argv.indexOf(n);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const dataDir = arg('--data'), outDir = arg('--out'), windowsFile = arg('--windows');
  if (!dataDir || !outDir || !windowsFile) {
    console.error('usage: probe-excise --data <dir> --out <dir> --windows probe-windows.ndjson [--margin-ms 2000]');
    process.exit(64);
  }
  const wins = loadWindows(windowsFile, Number(arg('--margin-ms') ?? 2000));
  const r = exciseDir(dataDir, outDir, wins);
  console.log(`excised ${r.dropped} rows across ${r.files} files (${r.kept} kept, ${wins.length} merged windows)`);
}
