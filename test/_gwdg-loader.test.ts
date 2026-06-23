// test/_gwdg-loader.test.ts — ACs for the GWDG ingestion adapter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseIncidentDate, parseIncidents, parseManifest, loadGwdgTraces } from '../tools/_gwdg-loader.js';

test('parseIncidentDate parses "DD Mon YYYY" as UTC midnight', () => {
  assert.equal(parseIncidentDate('17 Feb 2025'), Date.UTC(2025, 1, 17));
  assert.equal(parseIncidentDate('7 Jan 2025'), Date.UTC(2025, 0, 7));
  assert.throws(() => parseIncidentDate('Feb 2025'), /unparseable/);
});

test('parseIncidents maps node -> [incidentDay, collectEnd] windows + category', () => {
  const csv = 'node,incidentDate,incidentDate2,description,category,beforeHours,afterHours,collectStart,collectEnd,windowTotalHours\n'
    + 'node_x,17 Feb 2025,,gpu fell off bus desc,gpu fell off bus,24,2,2025-02-16 00:00:00,2025-02-17 02:00:00,26\n';
  const m = parseIncidents(csv);
  const w = m.get('node_x')!;
  assert.equal(w.length, 1);
  assert.equal(w[0].category, 'gpu fell off bus');
  assert.deepEqual(w[0].window, [Date.UTC(2025, 1, 17), Date.UTC(2025, 1, 17, 2, 0, 0)]);
});

test('parseManifest maps tidy outputFile -> node', () => {
  const csv = 'inputFile,outputFile,inputType,node,minTime,maxTime,rows\n'
    + 'a.csv.bz2,a_tidy.csv.bz2,t,node_q,2025-01-01 00:00:00,2025-01-02 00:00:00,10\n';
  assert.equal(parseManifest(csv).get('a_tidy.csv.bz2'), 'node_q');
});

test('loadGwdgTraces pivots long-form to per-(gpu,metric) traces with anomaly flags', () => {
  // 60 rows for one metric on 1 GPU, ts every 600s from a base; an incident window covers the tail.
  const base = Date.UTC(2025, 1, 10, 0, 0, 0);
  const rows: string[] = ['timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion'];
  for (let i = 0; i < 60; i++) {
    const ts = new Date(base + i * 600000).toISOString().replace('T', ' ').slice(0, 19);
    rows.push(`${ts},node_z,DCGM_FI_DEV_GPU_TEMP,${30 + (i % 3)},1,nvidia1,gpu_a,job,inst,A100,550`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwdg-'));
  const csvPath = path.join(dir, 'ggpu_x_tidy.csv');
  fs.writeFileSync(csvPath, rows.join('\n') + '\n');
  const winStart = base + 55 * 600000; // covers last 5 rows
  const traces = loadGwdgTraces(csvPath, 'node_z', new Set(['DCGM_FI_DEV_GPU_TEMP']), [[winStart, base + 60 * 600000]]);
  assert.equal(traces.length, 1);
  assert.equal(traces[0].dataset_key, 'ggpu_x/gpu1/DCGM_FI_DEV_GPU_TEMP');
  assert.equal(traces[0].values.length, 60);
  assert.equal(traces[0].is_anomaly.filter(Boolean).length, 5, 'last 5 rows fall in the incident window');
  fs.rmSync(dir, { recursive: true, force: true });
});
