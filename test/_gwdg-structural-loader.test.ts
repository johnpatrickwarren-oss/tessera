// test/_gwdg-structural-loader.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadStructuralStreams, STRUCTURAL_METRIC } from '../tools/_gwdg-structural-loader.js';

test('loadStructuralStreams keys by (node,job,instance) — same instance, different job = distinct streams', () => {
  const header = 'timeUtc,node,metric,value,gpu,device,uuid,job,instance,modelName,driverVersion';
  const rows = [header];
  const base = Date.UTC(2025, 1, 16, 0, 0, 0);
  for (let i = 0; i < 250; i++) {
    const ts = new Date(base + i * 600000).toISOString().replace('T', ' ').slice(0, 19);
    // SAME instance (nodeA:9100), DIFFERENT jobs -> must be separated by the job dimension.
    rows.push(`${ts},nodeA,scrape_samples_scraped,${1998 + (i % 2)},,,,node,nodeA:9100,,`);
    rows.push(`${ts},nodeA,scrape_samples_scraped,${200 + (i % 3)},,,,dcgm,nodeA:9100,,`);
    // a different instance, and an unrelated metric that must be ignored
    rows.push(`${ts},nodeA,scrape_samples_scraped,${50 + (i % 2)},,,,ipmi,nodeA:9400,,`);
    rows.push(`${ts},nodeA,DCGM_FI_DEV_GPU_TEMP,40,0,,,node,nodeA:9100,,`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwdgstruct-'));
  const f = path.join(dir, 't.csv');
  fs.writeFileSync(f, rows.join('\n') + '\n');
  const streams = loadStructuralStreams(f, STRUCTURAL_METRIC);
  assert.equal(streams.length, 3, 'node+dcgm on the same instance are distinct; ipmi on another; GPU_TEMP ignored');
  const node9100 = streams.find((t) => t.dataset_key.includes('|node|nodeA:9100'))!;
  const dcgm9100 = streams.find((t) => t.dataset_key.includes('|dcgm|nodeA:9100'))!;
  assert.ok(node9100 && dcgm9100, 'same instance split by job');
  assert.ok(node9100.values[0] >= 1998 && dcgm9100.values[0] < 300, 'streams carry their own job\'s counts, not mixed');
  assert.equal(node9100.values.length, 250);
  assert.deepEqual(node9100.windows, []);
  assert.equal(node9100.is_anomaly.filter(Boolean).length, 0);
  assert.ok(node9100.ts_epoch_ms[1] > node9100.ts_epoch_ms[0]); // sorted ascending
  fs.rmSync(dir, { recursive: true, force: true });
});
