// test/rack-local-sim.test.ts — rack-local blocking in the FULL sim (ADR 0026 C-sim).
//
// The harness-level claims live in research/2026-07-28-rack-local-conformal.md; what the sim
// integration must additionally hold: (1) rack-cohort drafting fills rack-keyed blocks (no
// starvation at sentinel budgets); (2) per-exec conformal calibration stays EXACT under strong
// rack dispersion — the within-rack design's exactness, in the full scheduling/scoring path;
// (3) a unit fault is still detected; (4) determinism; (5) the per-λ recall split is populated.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runCanarySim, defaultConfig, HEALTHY_SCENARIOS, GPUS_PER_RACK,
} from '../tools/canary-sim.js';

/** H8's dispersion knob doubled — well past the fleet construction's measured e-BH onset. */
const DISP = { ...HEALTHY_SCENARIOS.H8, name: 'H8-strong', heteroRackSd: 1.0, rackStaticSd: 0 };

test('rack-local blocking: blocks fill and healthy conformal calibration stays exact under strong dispersion', () => {
  const cfg = defaultConfig({
    seed: 5, nGpus: 16 * GPUS_PER_RACK, days: 8, scenario: DISP, budgetFrac: 0.005,
    blocking: 'rack-local',
  });
  const r = runCanarySim(cfg);
  assert.ok(r.calConformal.healthyTests > 5000, `too few conformal tests (${r.calConformal.healthyTests}) — rack blocks starved`);
  const rate = r.calConformal.healthyLe01 / Math.max(1, r.calConformal.healthyTests);
  const band = 4 * Math.sqrt(0.01 * 0.99 / Math.max(1, r.calConformal.healthyTests));
  assert.ok(Math.abs(rate - 0.01) < band + 0.002,
    `healthy p<=.01 rate ${rate} under ς-strong dispersion (n=${r.calConformal.healthyTests})`);
});

test('rack-local vs coarse under strong dispersion: the rack construction pages/selects fewer healthy units', () => {
  const mk = (blocking: 'coarse' | 'rack-local') => runCanarySim(defaultConfig({
    seed: 7, nGpus: 16 * GPUS_PER_RACK, days: 10, scenario: DISP, budgetFrac: 0.01, blocking,
  }));
  const coarse = mk('coarse'), rack = mk('rack-local');
  const falseSel = (r: typeof coarse): number =>
    r.stops.filter(s => s.family === 'gpu').reduce((a, s) => a + s.nFalse, 0);
  assert.ok(rack.falsePages <= coarse.falsePages,
    `false pages: rack-local ${rack.falsePages} should be ≤ coarse ${coarse.falsePages}`);
  assert.ok(falseSel(rack) <= falseSel(coarse),
    `false gpu selections: rack-local ${falseSel(rack)} should be ≤ coarse ${falseSel(coarse)}`);
});

test('rack-local blocking: a severe unit fault is still detected (power preserved in the full path)', () => {
  const cfg = defaultConfig({
    seed: 21, nGpus: 16 * GPUS_PER_RACK, days: 12, budgetFrac: 0.01, blocking: 'rack-local',
    scenario: HEALTHY_SCENARIOS.H2,
    faults: [{ id: 'f1', level: 'gpu', target: 0, count: 3, onsetDay: 2, severity: 0.05, kind: 'perf' }],
  });
  const r = runCanarySim(cfg);
  assert.ok(r.eprocDetectDay.has('f1') || r.pageDetectDay.has('f1'), 'severe fault undetected under rack-local blocking');
});

test('rack-local blocking is deterministic in the seed and populates the per-λ split', () => {
  const mk = (seed: number) => runCanarySim(defaultConfig({
    seed, nGpus: 8 * GPUS_PER_RACK, days: 6, budgetFrac: 0.01, blocking: 'rack-local',
    scenario: DISP,
    faults: [{ id: 'f1', level: 'gpu', target: 0, count: 8, onsetDay: 1, severity: 0.08, kind: 'perf' }],
  }));
  const a = mk(42), b = mk(42);
  assert.equal(a.scoreChecksum, b.scoreChecksum);
  assert.equal(a.execCount, b.execCount);
  const ls = a.lambdaSplit;
  assert.equal(ls.degHigh + ls.degLow, a.gpuEverDegraded, 'λ split partitions the degraded set');
  assert.ok(ls.selTrueHigh + ls.selTrueLow === a.gpuEverSelectedTrue, 'λ split partitions the true-selected set');
});
