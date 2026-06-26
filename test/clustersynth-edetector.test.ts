// test/clustersynth-edetector.test.ts — smoke test for the real-bundle e-detector harness on the
// committed mini scenario fixture (T=60). The substantive validation is on a full generated bundle
// (see decisions/0018 + tools/clustersynth-edetector.ts header); this just guards that the tool runs
// end-to-end against a real bundle and that the e-detector never does worse than the terminal detector.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { scoreCounterEDetector, renderClustersynthEDetector } from '../tools/clustersynth-edetector.js';

const MINI = path.join(__dirname, '_substrate', 'clustersynth-scenario-mini');

test('clustersynth-edetector runs end-to-end on the mini bundle and the e-detector ≥ terminal', () => {
  const b = loadScenarioBundle(MINI);
  const calLen = Math.floor(0.1 * b.T);
  // The mini bundle has a single gpu mean_shift fault on gpu_temp_c.
  const shards = new Set(b.faults.filter((f) => f.level === 'gpu' && f.type === 'mean_shift').flatMap((f) => f.affected_shards));
  const r = scoreCounterEDetector(b, 'gpu_temp_c', shards, calLen, { calLen, onsetTarget: 8, evalTarget: 12, mixture: 'SR' });
  assert.ok(r.nFault >= 1, 'mini bundle should have a scored fault');
  assert.ok(r.eHits >= r.terminalHits, `e-detector should never do worse than terminal; e=${r.eHits} t=${r.terminalHits}`);
  assert.ok(Number.isFinite(r.residMedianLag1), 'residual lag-1 diagnostic should be finite');
});

test('renderClustersynthEDetector produces a report without throwing', () => {
  const out = renderClustersynthEDetector(MINI);
  assert.match(out, /e-detector vs terminal/);
  assert.match(out, /TRANSIENT mean_shift recall/);
});
