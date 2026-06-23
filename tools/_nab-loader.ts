// tools/_nab-loader.ts — NAB (Numenta Anomaly Benchmark) ingestion adapter.
// Real, labeled operational telemetry intake for tools/shadow-replay.ts.
// Pure parsing + a thin fs loader. See docs/SPEC-shadow-replay-real-telemetry.md.
// Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as path from 'node:path';

/** A parsed NAB trace: parallel arrays in file order. */
export interface NabTrace {
  dataset_key: string;          // e.g. "realKnownCause/nyc_taxi.csv"
  values: number[];
  ts_epoch_ms: number[];        // UTC epoch ms (timezone-independent, deterministic)
  is_anomaly: boolean[];        // true iff the row falls inside a labeled window
  windows: ReadonlyArray<readonly [number, number]>; // label windows as [startMs, endMs]
}

/** Parse a NAB timestamp ("YYYY-MM-DD HH:MM:SS" or "...SS.ffffff") to UTC epoch ms.
 *  Manual parse (NOT Date.parse) so it is timezone-independent and deterministic.
 *  Fractional seconds are floored to whole ms. Throws on malformed input. */
export function parseTs(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(s.trim());
  if (!m) throw new Error(`NAB: unparseable timestamp '${s}'`);
  const [, y, mo, d, hh, mm, ss, frac] = m;
  const ms = frac ? Math.floor(Number(`0.${frac}`) * 1000) : 0;
  return Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss, ms);
}

/** Parse NAB CSV text ("timestamp,value\n...") into parallel arrays, in file order. */
export function parseNabCsv(text: string): { ts_epoch_ms: number[]; values: number[] } {
  const lines = text.split('\n');
  const ts_epoch_ms: number[] = [];
  const values: number[] = [];
  let start = 0;
  if (lines[0] && /timestamp/i.test(lines[0])) start = 1; // header
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // tolerate blank trailing lines
    const comma = line.indexOf(',');
    if (comma < 0) throw new Error(`NAB: malformed CSV row '${line}'`);
    const valStr = line.slice(comma + 1).trim();
    if (valStr === '') throw new Error(`NAB: empty value cell in row '${line}'`); // Number('') === 0
    const v = Number(valStr);
    if (!Number.isFinite(v)) throw new Error(`NAB: non-numeric value in row '${line}'`);
    ts_epoch_ms.push(parseTs(line.slice(0, comma)));
    values.push(v);
  }
  return { ts_epoch_ms, values };
}

/** Mark each row anomalous iff its timestamp is within any [start,end] window (inclusive). */
export function computeIsAnomaly(
  ts_epoch_ms: ReadonlyArray<number>,
  windows: ReadonlyArray<readonly [number, number]>,
): boolean[] {
  return ts_epoch_ms.map((t) => windows.some(([a, b]) => t >= a && t <= b));
}

/** Resolve a dataset's label windows from a parsed combined_windows.json object.
 *  Returns null when the key is absent (caller must NOT treat that as "all normal"). */
export function windowsForKey(
  combinedWindows: Record<string, ReadonlyArray<readonly [string, string]>>,
  datasetKey: string,
): Array<[number, number]> | null {
  const raw = combinedWindows[datasetKey];
  if (raw === undefined) return null;
  return raw.map(([a, b]) => [parseTs(a), parseTs(b)] as [number, number]);
}

/** Load one NAB dataset (CSV + its label windows) from a NAB repo dir. */
export function loadNabTrace(nabDir: string, datasetKey: string): NabTrace {
  const csvPath = path.join(nabDir, 'data', datasetKey);
  if (!fs.existsSync(csvPath)) throw new Error(`NAB: data file not found: ${csvPath}`);
  const labelsPath = path.join(nabDir, 'labels', 'combined_windows.json');
  if (!fs.existsSync(labelsPath)) throw new Error(`NAB: labels not found: ${labelsPath}`);
  const combined = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  const windows = windowsForKey(combined, datasetKey);
  if (windows === null) throw new Error(`NAB: no label entry for '${datasetKey}' (refusing to assume all-normal)`);
  const { ts_epoch_ms, values } = parseNabCsv(fs.readFileSync(csvPath, 'utf8'));
  return { dataset_key: datasetKey, values, ts_epoch_ms, is_anomaly: computeIsAnomaly(ts_epoch_ms, windows), windows };
}

/** List dataset keys ("category/file.csv") under a NAB category dir (or all real* categories). */
export function listNabDatasets(nabDir: string, categories: ReadonlyArray<string>): string[] {
  const out: string[] = [];
  for (const cat of categories) {
    const dir = path.join(nabDir, 'data', cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (f.endsWith('.csv')) out.push(`${cat}/${f}`);
    }
  }
  return out;
}
