// test/_mit-supercloud-loader.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadMitTraces, MIT_METRIC_COL } from '../tools/_mit-supercloud-loader.js';

test('loadMitTraces pivots per-job GPU CSV to per-(gpu,metric) traces, no fault labels', () => {
  const header = 'timestamp,gpu_index,utilization_gpu_pct,utilization_memory_pct,memory_free_MiB,memory_used_MiB,temperature_gpu,temperature_memory,power_draw_W,pcie_link_width_current';
  const rows = [header];
  const base = 1618080814.783;
  for (let i = 0; i < 250; i++) {
    const ts = (base + i * 0.1).toFixed(3);
    rows.push(`${ts},0,${i % 100},0,32510,0,${30 + (i % 5)},34,${26 + (i % 7)},16`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mit-'));
  const f = path.join(dir, '123-rX-nY.csv');
  fs.writeFileSync(f, rows.join('\n') + '\n');
  const traces = loadMitTraces(f, ['utilization_gpu_pct', 'temperature_gpu', 'power_draw_W']);
  assert.equal(traces.length, 3, 'one trace per metric on the single GPU');
  const util = traces.find((t) => t.dataset_key.endsWith('utilization_gpu_pct'))!;
  assert.equal(util.dataset_key, '123-rX-nY/gpu0/utilization_gpu_pct');
  assert.equal(util.values.length, 250);
  assert.equal(util.values[5], 5);                       // col 2
  assert.equal(util.is_anomaly.filter(Boolean).length, 0, 'no fault labels -> all normal');
  assert.deepEqual(util.windows, []);
  // timestamp epoch-seconds -> ms
  assert.equal(util.ts_epoch_ms[0], Math.round(base * 1000));
  // temperature uses column 6, power column 8
  assert.equal(MIT_METRIC_COL.temperature_gpu, 6);
  assert.equal(MIT_METRIC_COL.power_draw_W, 8);
  fs.rmSync(dir, { recursive: true, force: true });
});
