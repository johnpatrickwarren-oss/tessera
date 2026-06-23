// tools/_gwdg-structural-loader.ts — structural-health signal extractor for the
// GWDG tidy CSVs. The detachment incidents do NOT collapse the per-GPU metrics or
// the scrape health at their labels (verified — telemetry keeps flowing), so this
// is used to (a) measure the realized FP of the betting e-process on REAL healthy
// structural telemetry vs the Ville α guarantee, and (b) characterize detection
// power against INJECTED collapse. Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import { parseTs, type NabTrace } from './_nab-loader.js';

// tidy columns: timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion
const COL = { ts: 0, node: 1, metric: 2, value: 3, job: 7, instance: 8 } as const;

/** Structural-health metrics (the scrape pipeline's own telemetry). `scrape_samples_scraped`
 *  is the count of samples a target returned per scrape — a clean, stable null in health that
 *  drops when an exporter/GPU stops reporting. */
export const STRUCTURAL_METRIC = 'scrape_samples_scraped';

/** Extract per-(node,instance) time series for one structural metric, sorted by time.
 *  Each stream is a healthy NULL (windows empty) — there is no labeled collapse in GWDG. */
export function loadStructuralStreams(csvPath: string, metric: string = STRUCTURAL_METRIC): NabTrace[] {
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const byStream = new Map<string, { ts: number[]; val: number[] }>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = line.split(',');
    if (c.length <= COL.instance || c[COL.metric] !== metric) continue;
    const v = Number(c[COL.value]);
    if (!Number.isFinite(v)) continue;
    let ts: number;
    try { ts = parseTs(c[COL.ts]); } catch { continue; }
    // Key by (node, job, instance): a single instance reports this metric for MULTIPLE
    // scrape jobs (node-exporter ~2000, dcgm ~200, ipmi ~50). Mixing them creates a
    // multimodal stream; per-(job,instance) each is one exporter's stable sample count.
    const key = `${c[COL.node]}|${c[COL.job]}|${c[COL.instance]}`;
    let s = byStream.get(key);
    if (!s) { s = { ts: [], val: [] }; byStream.set(key, s); }
    s.ts.push(ts); s.val.push(v);
  }
  const traces: NabTrace[] = [];
  for (const [key, s] of byStream) {
    if (s.ts.length < 200) continue; // need enough to calibrate + measure FP
    // sort by ts (rows may interleave across instances)
    const order = s.ts.map((_, idx) => idx).sort((a, b) => s.ts[a] - s.ts[b]);
    const ts = order.map((j) => s.ts[j]);
    const val = order.map((j) => s.val[j]);
    traces.push({ dataset_key: `${metric}/${key}`, values: val, ts_epoch_ms: ts, is_anomaly: ts.map(() => false), windows: [] });
  }
  return traces;
}
