// test/metric-router.test.ts — smoke test for the metric-aware router on the committed mini bundle.
// The substantive result (router classifies gpu_temp_c as I(1) → differences → certified; the four
// stationary counters → mean-shift e-detector → full recall at aggregate FDP≈0) is on full generated
// bundles (decisions/0018 § metric router). Here we guard structure + the integration-order classifier.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { fitBaseline } from '../tools/baseline-monitor.js';
import { integrationOrder, routeCounter, renderMetricRouter } from '../tools/metric-router.js';

// Plumbing/wiring tests on a tiny committed fixture — NOT findings. Brand with the
// short-window override so the baseline-guard does not (correctly) throw on the short fixture.
process.env.CS_ALLOW_SHORT = '1';

const MINI = path.join(__dirname, '_substrate', 'clustersynth-scenario-mini');

test('integrationOrder classifies a random walk as integrated and white noise as stationary', () => {
  function rng(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const g = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
  const T = 240;
  const walks: number[][] = [], whites: number[][] = [];
  for (let s = 0; s < 30; s++) {
    const rw = rng(s + 1); let acc = 0; const w: number[] = [];
    for (let t = 0; t < T; t++) { acc += g(rw); w.push(acc); }
    walks.push(w);
    const rn = rng(1000 + s); whites.push(Array.from({ length: T }, () => g(rn)));
  }
  const idx = Array.from({ length: 30 }, (_, i) => i);
  assert.equal(integrationOrder(walks, idx).character, 'integrated');
  assert.equal(integrationOrder(whites, idx).character, 'stationary');
});

test('routeCounter runs end-to-end on the mini bundle and returns a coherent row', () => {
  const b = loadScenarioBundle(MINI);
  const calLen = Math.max(6, Math.floor(0.15 * b.T));
  const r = routeCounter(b, 'gpu_temp_c', fitBaseline(b, 'gpu_temp_c'), calLen);
  assert.ok(['stationary', 'integrated'].includes(r.character));
  assert.ok(r.nFault >= 1);
  assert.ok(r.recall >= 0 && r.recall <= 1);
  assert.equal(typeof r.certified, 'boolean');
});

test('renderMetricRouter produces a report without throwing', () => {
  const out = renderMetricRouter(MINI, MINI);
  assert.match(out, /METRIC-AWARE ROUTER/);
  assert.match(out, /character/);
});
