// test/gwdg-replay.test.ts — end-to-end on a tiny synthetic GWDG dataset dir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runGwdgReplay } from '../tools/gwdg-replay.js';

function tidyCsv(node: string, base: number, n: number, fn: (i: number) => number): string {
  const rows = ['timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion'];
  for (let i = 0; i < n; i++) {
    const ts = new Date(base + i * 600000).toISOString().replace('T', ' ').slice(0, 19);
    rows.push(`${ts},${node},DCGM_FI_DEV_XID_ERRORS,${fn(i)},1,nvidia1,gpu_a,job,inst,A100,550`);
  }
  return rows.join('\n') + '\n';
}

test('runGwdgReplay aggregates good (FP) vs incident (detection) files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwdg-ds-'));
  fs.mkdirSync(path.join(dir, 'telemetry'));
  const base = Date.UTC(2025, 1, 10, 0, 0, 0);
  // good file: flat 0 -> no fires -> 0 FP
  fs.writeFileSync(path.join(dir, 'telemetry', 'good_tidy.csv'), tidyCsv('node_good', base, 200, () => 0));
  // incident file: XID errors jump hard in the tail (the incident window) -> should fire
  const incStart = base + 150 * 600000;
  fs.writeFileSync(path.join(dir, 'telemetry', 'inc_tidy.csv'), tidyCsv('node_bad', base, 200, (i) => (i >= 150 ? 500 : 0)));
  fs.writeFileSync(path.join(dir, 'manifest.csv'),
    'inputFile,outputFile,inputType,node,minTime,maxTime,rows\n'
    + 'good.csv.bz2,good_tidy.csv.bz2,t,node_good,x,y,1\n'
    + 'inc.csv.bz2,inc_tidy.csv.bz2,t,node_bad,x,y,1\n');
  fs.writeFileSync(path.join(dir, 'incident_events.csv'),
    'node,incidentDate,incidentDate2,description,category,beforeHours,afterHours,collectStart,collectEnd,windowTotalHours\n'
    + `node_bad,10 Feb 2025,,xid storm,gpu error/problem,24,2,2025-02-10 00:00:00,${new Date(base + 200 * 600000).toISOString().replace('T', ' ').slice(0, 19)},26\n`);

  const r = runGwdgReplay(dir);
  assert.equal(r.provenance.n_files, 2);
  assert.equal(r.provenance.n_incident_files, 1);
  const xid = r.per_metric.find((m) => m.metric === 'DCGM_FI_DEV_XID_ERRORS')!;
  assert.equal(xid.good_shards, 1);
  assert.equal(xid.good_fp_fires, 0, 'flat good series must not false-fire');
  assert.equal(xid.windows_scored, 1);
  assert.equal(xid.windows_detected, 1, 'a hard XID jump in the incident window must be detected');
  assert.equal(r.totals.detection_rate, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
