// test/_gwdg-structural-loader.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadStructuralStreams, STRUCTURAL_METRIC } from '../tools/_gwdg-structural-loader.js';

test('loadStructuralStreams extracts per-(node,instance) scrape-health series, healthy (no windows)', () => {
  const header = 'timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion';
  const rows = [header];
  const base = Date.UTC(2025, 1, 16, 0, 0, 0);
  for (let i = 0; i < 250; i++) {
    const ts = new Date(base + i * 600000).toISOString().replace('T', ' ').slice(0, 19);
    // two instances on one node; plus an unrelated metric that must be ignored
    rows.push(`${ts},nodeA,scrape_samples_scraped,${1998 + (i % 2)},,,,,nodeA:9100,,`);
    rows.push(`${ts},nodeA,scrape_samples_scraped,${500 + (i % 3)},,,,,nodeA:9400,,`);
    rows.push(`${ts},nodeA,DCGM_FI_DEV_GPU_TEMP,40,0,,,,nodeA:9400,,`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwdgstruct-'));
  const f = path.join(dir, 't.csv');
  fs.writeFileSync(f, rows.join('\n') + '\n');
  const streams = loadStructuralStreams(f, STRUCTURAL_METRIC);
  assert.equal(streams.length, 2, 'one stream per instance; the GPU_TEMP rows ignored');
  const s9100 = streams.find((t) => t.dataset_key.endsWith('nodeA:9100'))!;
  assert.equal(s9100.values.length, 250);
  assert.ok(s9100.values[0] >= 1998);
  assert.deepEqual(s9100.windows, []);
  assert.equal(s9100.is_anomaly.filter(Boolean).length, 0);
  // sorted by ts ascending
  assert.ok(s9100.ts_epoch_ms[1] > s9100.ts_epoch_ms[0]);
  fs.rmSync(dir, { recursive: true, force: true });
});
