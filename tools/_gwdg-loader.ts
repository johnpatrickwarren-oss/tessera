// tools/_gwdg-loader.ts — ingestion adapter for the GWDG GPU-node telemetry
// dataset (Zenodo 10.5281/zenodo.19052367): real A100 telemetry with
// operator-labeled GPU-failure incidents. Pivots the long-form tidy CSV into
// per-(node,gpu,metric) NabTrace objects so the shadow-replay scoring core
// (tools/shadow-replay.ts) can run Tessera's detector on real GPU faults.
//
// Reads DECOMPRESSED *.csv (bunzip2 the *_tidy.csv.bz2 first; Node has no bzip2
// and the tools must not spawn). See docs/SPEC-gwdg-real-gpu-validation.md.
// Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseTs, type NabTrace } from './_nab-loader.js';

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Parse incident_events.csv 'incidentDate' ("17 Feb 2025") to UTC epoch ms (00:00). */
export function parseIncidentDate(s: string): number {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim());
  if (!m) throw new Error(`GWDG: unparseable incidentDate '${s}'`);
  const mo = MONTHS[m[2]];
  if (mo === undefined) throw new Error(`GWDG: unknown month '${m[2]}'`);
  return Date.UTC(+m[3], mo, +m[1]);
}

/** CSV line splitter (these files have no quoted commas). */
function cols(line: string): string[] { return line.split(','); }

/** Map node -> anomaly windows [incidentDay00:00, collectEnd] from incident_events.csv.
 *  The anomaly window runs from the (day-level) incident date to collectEnd; everything
 *  before is treated as normal. Day-level labels => coarse latency (documented). */
export function parseIncidents(text: string): Map<string, Array<{ window: [number, number]; category: string }>> {
  const lines = text.trim().split('\n');
  const out = new Map<string, Array<{ window: [number, number]; category: string }>>();
  // header: node,incidentDate,incidentDate2,description,category,beforeHours,afterHours,collectStart,collectEnd,windowTotalHours
  for (let i = 1; i < lines.length; i++) {
    const c = cols(lines[i]);
    if (c.length < 9) continue;
    const node = c[0];
    const start = parseIncidentDate(c[1]);
    const end = parseTs(c[8]); // collectEnd "YYYY-MM-DD HH:MM:SS"
    const entry = { window: [start, end] as [number, number], category: c[4] };
    (out.get(node) ?? out.set(node, []).get(node)!).push(entry);
  }
  return out;
}

export interface ManifestEntry { node: string; minMs: number; maxMs: number; }

function safeParseTs(s: string): number | null {
  try { return parseTs(s); } catch { return null; }
}

/** Map tidy output filename -> {node, file time range}, from manifest.csv.
 *  Time range is used to filter a node's incident windows to those that actually
 *  fall within the file (a node's other-date incidents must not be attached). */
export function parseManifest(text: string): Map<string, ManifestEntry> {
  const lines = text.trim().split('\n');
  const out = new Map<string, ManifestEntry>();
  // header: inputFile,outputFile,inputType,node,minTime,maxTime,rows,...
  for (let i = 1; i < lines.length; i++) {
    const c = cols(lines[i]);
    if (c.length < 6) continue;
    out.set(c[1], { node: c[3], minMs: safeParseTs(c[4]) ?? -Infinity, maxMs: safeParseTs(c[5]) ?? Infinity });
  }
  return out;
}

/** The dataset is one-file-per-incident, named by date (e.g. ggpu142_2025-02-17_...).
 *  Extract that YYYY-MM-DD as UTC midnight, so a file is joined ONLY to its own
 *  incident — not every incident the node ever had (the H1/H2 double-count fix). */
export function parseFileDate(filename: string): number | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(filename);
  if (!m) return null; // e.g. the "when-good" aggregate files
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

/** Read one decompressed tidy CSV, extracting per-(gpu) series for the given metrics.
 *  Returns metric -> gpu -> { ts_epoch_ms[], values[] } (file order). */
export function readTidySeries(csvPath: string, metrics: ReadonlySet<string>): Map<string, Map<string, { ts: number[]; val: number[] }>> {
  const out = new Map<string, Map<string, { ts: number[]; val: number[] }>>();
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  // header: timeUtc,node,metric,value,gpu,device,uuid,...
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = cols(line);
    const metric = c[2];
    if (!metrics.has(metric)) continue;
    const v = Number(c[3]);
    if (!Number.isFinite(v)) continue;
    const gpu = c[4] || 'node'; // node-level metrics have empty gpu
    let byGpu = out.get(metric);
    if (!byGpu) { byGpu = new Map(); out.set(metric, byGpu); }
    let s = byGpu.get(gpu);
    if (!s) { s = { ts: [], val: [] }; byGpu.set(gpu, s); }
    s.ts.push(parseTs(c[0]));
    s.val.push(v);
  }
  return out;
}

/** Build NabTrace objects for one tidy CSV: one per (gpu, metric). */
export function loadGwdgTraces(
  csvPath: string, node: string, metrics: ReadonlySet<string>,
  windows: ReadonlyArray<[number, number]>,
): NabTrace[] {
  const series = readTidySeries(csvPath, metrics);
  const base = path.basename(csvPath).replace(/_tidy\.csv$/, '');
  const traces: NabTrace[] = [];
  for (const [metric, byGpu] of series) {
    for (const [gpu, s] of byGpu) {
      if (s.ts.length < 50) continue; // too short to calibrate+score meaningfully
      const is_anomaly = s.ts.map((t) => windows.some(([a, b]) => t >= a && t <= b));
      traces.push({ dataset_key: `${base}/gpu${gpu}/${metric}`, values: s.val, ts_epoch_ms: s.ts, is_anomaly, windows });
    }
  }
  return traces;
}
