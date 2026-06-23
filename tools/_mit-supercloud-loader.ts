// tools/_mit-supercloud-loader.ts — ingestion adapter for the MIT Supercloud
// dataset (dcc.mit.edu / s3://mit-supercloud-dataset). Per-job GPU telemetry
// (nvidia-smi @100ms): one file per job, columns
//   timestamp,gpu_index,utilization_gpu_pct,utilization_memory_pct,
//   memory_free_MiB,memory_used_MiB,temperature_gpu,temperature_memory,
//   power_draw_W,pcie_link_width_current
// There are NO GPU-hardware-fault labels (workload dataset) -> every fire is a
// false alarm -> a NULL / false-alarm calibration substrate at fleet scale.
// Pivots to per-(job,gpu_index,metric) NabTrace with empty windows (all normal).
// See docs/SPEC-mit-supercloud-fp-calibration.md. Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { NabTrace } from './_nab-loader.js';

/** Column index of each supported metric in the per-job GPU CSV. */
export const MIT_METRIC_COL: Record<string, number> = {
  utilization_gpu_pct: 2, temperature_gpu: 6, power_draw_W: 8,
};

/** Build per-(gpu_index, metric) traces from one per-job GPU CSV (windows empty:
 *  no fault labels, so all scored points are normal -> a pure FP measurement). */
export function loadMitTraces(csvPath: string, metrics: ReadonlyArray<string>): NabTrace[] {
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split('\n');
  const base = path.basename(csvPath).replace(/\.csv$/, '');
  // metric -> gpu_index -> { ts[], val[] }
  const series = new Map<string, Map<string, { ts: number[]; val: number[] }>>();
  for (const m of metrics) series.set(m, new Map());
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = line.split(',');
    if (c.length < 9) continue;
    const tsMs = Math.round(Number(c[0]) * 1000); // epoch seconds (float) -> ms
    if (!Number.isFinite(tsMs)) continue;
    const gpu = c[1];
    for (const m of metrics) {
      const v = Number(c[MIT_METRIC_COL[m]]);
      if (!Number.isFinite(v)) continue;
      const byGpu = series.get(m)!;
      let s = byGpu.get(gpu);
      if (!s) { s = { ts: [], val: [] }; byGpu.set(gpu, s); }
      s.ts.push(tsMs); s.val.push(v);
    }
  }
  const traces: NabTrace[] = [];
  for (const [metric, byGpu] of series) {
    for (const [gpu, s] of byGpu) {
      if (s.ts.length < 200) continue; // need enough to calibrate + measure FP
      traces.push({
        dataset_key: `${base}/gpu${gpu}/${metric}`,
        values: s.val, ts_epoch_ms: s.ts,
        is_anomaly: s.ts.map(() => false), windows: [],
      });
    }
  }
  return traces;
}

/** List per-job GPU CSVs in a directory. */
export function listMitGpuCsvs(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().map((f) => path.join(dir, f));
}
