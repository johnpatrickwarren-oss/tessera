// test/gwdg-o5-diagnostic.test.ts — parser/aligner invariants of the O5 GWDG runner, plus the
// full-dataset readout when the (gitignored) Zenodo dataset is present locally.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { parseTidy, alignOnCommonGrid, runFile, O5_METRICS } from '../tools/gwdg-o5-diagnostic.js';

const HEADER = 'timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion';
const row = (t: string, metric: string, v: number, gpu: number): string =>
  `${t},node_x,${metric},${v},${gpu},nvidia${gpu},uuid_x,job,inst,A100,550`;

test('parseTidy: keeps only requested metrics, indexes by (metric, gpu, time)', () => {
  const csv = [HEADER,
    row('2025-01-01 00:00:00', 'DCGM_FI_DEV_GPU_TEMP', 55, 0),
    row('2025-01-01 00:00:00', 'DCGM_FI_DEV_GPU_TEMP', 57, 1),
    row('2025-01-01 00:00:00', 'node_nfs_requests_total', 999, 0),
    row('2025-01-01 00:10:00', 'DCGM_FI_DEV_GPU_TEMP', 56, 0),
  ].join('\n');
  const p = parseTidy(csv, O5_METRICS);
  assert.equal(p.size, 1);
  const temp = p.get('DCGM_FI_DEV_GPU_TEMP')!;
  assert.equal(temp.get(0)!.get('2025-01-01 00:00:00'), 55);
  assert.equal(temp.get(1)!.size, 1);
  assert.equal(p.has('node_nfs_requests_total' as never), false);
});

test('alignOnCommonGrid: keeps only ticks every gpu reports, sorted, tail-trimmed; <3 gpus yields nothing', () => {
  const m = new Map<number, Map<string, number>>();
  const mk = (pairs: Array<[string, number]>): Map<string, number> => new Map(pairs);
  m.set(0, mk([['t1', 1], ['t2', 2], ['t3', 3], ['t4', 4]]));
  m.set(1, mk([['t1', 10], ['t3', 30], ['t4', 40]]));            // missing t2
  m.set(2, mk([['t1', 100], ['t2', 200], ['t3', 300], ['t4', 400]]));
  const { gpus, series } = alignOnCommonGrid(m, 1); // common = t1,t3,t4; trim 1 → t1,t3
  assert.deepEqual(gpus, [0, 1, 2]);
  assert.deepEqual(series[0], [1, 3]);
  assert.deepEqual(series[1], [10, 30]);
  const two = new Map([[0, mk([['t1', 1]])], [1, mk([['t1', 2]])]]);
  assert.deepEqual(alignOnCommonGrid(two, 0).series, []);
});

const DATASET = 'runs/gwdg-data/gwdg-gpu-node-telemetry-gpu-detachment-failures-2025-2026-v1.0.0';

test('full dataset: the diagnostic RUNS and reports a verdict per live cell',
  { skip: !existsSync(DATASET) && 'GWDG dataset missing (gitignored) — Zenodo 10.5281/zenodo.19052367' }, () => {
  const rows = runFile(`${DATASET}/telemetry/ggpu129_2026-01-09_gpu-lost_tidy.csv`, 4);
  assert.ok(rows.length > 0, 'no cells parsed from a real incident file');
  for (const r of rows) {
    assert.ok(r.n >= 40);
    assert.ok(typeof r.markovPlausible === 'boolean');
  }
});
