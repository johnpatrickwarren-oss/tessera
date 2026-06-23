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
  const base = Date.UTC(2025, 1, 10, 0, 0, 0); // data starts 10 Feb 00:00, 200 rows @10min (~33h)
  const isoEnd = new Date(base + 199 * 600000).toISOString().replace('T', ' ').slice(0, 19);
  // good file: flat 0 -> no fires -> 0 FP
  fs.writeFileSync(path.join(dir, 'telemetry', 'good_tidy.csv'), tidyCsv('node_good', base, 200, () => 0));
  // incident file named for its date (2025-02-11): incident on 11 Feb (row 144) -> rows 0..143
  // are pre-incident NORMAL; XID jumps at row 150 (in-window).
  fs.writeFileSync(path.join(dir, 'telemetry', 'node_bad_2025-02-11_tidy.csv'), tidyCsv('node_bad', base, 200, (i) => (i >= 150 ? 500 : 0)));
  fs.writeFileSync(path.join(dir, 'manifest.csv'),
    'inputFile,outputFile,inputType,node,minTime,maxTime,rows\n'
    + `good.csv.bz2,good_tidy.csv.bz2,t,node_good,2025-02-10 00:00:00,${isoEnd},1\n`
    + `inc.csv.bz2,node_bad_2025-02-11_tidy.csv.bz2,t,node_bad,2025-02-10 00:00:00,${isoEnd},1\n`);
  // node_bad has TWO incidents: 11 Feb (IN this file's range) + 20 Mar (OUT of range -> must be filtered out).
  fs.writeFileSync(path.join(dir, 'incident_events.csv'),
    'node,incidentDate,incidentDate2,description,category,beforeHours,afterHours,collectStart,collectEnd,windowTotalHours\n'
    + `node_bad,11 Feb 2025,,xid storm,gpu error/problem,24,2,2025-02-10 00:00:00,${isoEnd},26\n`
    + 'node_bad,20 Mar 2025,,other,gpu error/problem,24,2,2025-03-19 00:00:00,2025-03-20 02:00:00,26\n');

  const r = runGwdgReplay(dir);
  assert.equal(r.provenance.n_files, 2);
  assert.equal(r.provenance.n_incident_files, 1);
  assert.equal(r.provenance.n_incident_windows_scored, 1, 'only the in-range (11 Feb) window is scored; 20 Mar filtered (H1/H2)');
  const xid = r.per_metric.find((m) => m.metric === 'DCGM_FI_DEV_XID_ERRORS')!;
  assert.equal(xid.windows_scored, 1);
  assert.equal(xid.windows_detected, 1, 'a hard XID jump in the incident window must be detected');
  assert.ok(xid.incident_scored_normal > 0, 'pre-incident rows (0..143) provide a real normal region (M1)');
  assert.equal(xid.incident_fp_fires, 0, 'flat pre-incident region must not false-fire');
  assert.equal(r.totals.detection_rate, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
