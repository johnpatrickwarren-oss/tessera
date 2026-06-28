// test/clustersynth-mode-b.test.ts — the Mode B concurrent-control pipeline on real clustersynth
// topology (ADR 0019 follow-up #3, productionized). The treatment−control contrast cancels the
// common-mode exactly → a construction-valid spatial null → e-BH controls FDR with recall, gated by the
// validity-class gate + the runtime calibration monitor + Wall-A whiteness. Uses a committed mini
// control-arm fixture (1 rack, hourly).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import {
  loadControlPairs, scoreCounterModeB, fitContrast, applyContrast, renderModeB, monPairs,
} from '../tools/clustersynth-mode-b.js';
import { gInc } from '../tools/mixture-evalue.js';

const FIX = path.join(__dirname, '_substrate', 'clustersynth-mode-b-mini');
const BASE = path.join(FIX, 'base');
const MON = path.join(FIX, 'mon');

test('control.json pairs every treatment shard with a labeled control twin', () => {
  const pairs = loadControlPairs(MON);
  assert.equal(pairs.length, 72, '1 rack = 72 GPUs');
  assert.ok(pairs.every((p) => p.control.endsWith('#ctrl')));
});

test('a bundle generated without the control arm is rejected', () => {
  // the existing scenario-mini fixture has no control.json
  assert.throws(() => loadControlPairs(path.join(FIX, '..', 'clustersynth-scenario-mini')), /no control\.json/);
});

test('the contrast fit cancels the common-mode (median variance collapse ≫ 30×; residual ~unit-scale)', () => {
  const healthy = loadScenarioBundle(BASE);
  const pairs = loadControlPairs(BASE);
  const variance = (xs: number[]): number => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length; };
  const ratios: number[] = [];
  const stdVars: number[] = [];
  for (const { treatment, control } of pairs.slice(0, 20)) {
    const t = healthy.series.get(`${treatment}\0gpu_temp_c`)!;
    const c = healthy.series.get(`${control}\0gpu_temp_c`)!;
    const d = t.map((x, i) => x - c[i]);
    ratios.push(variance(t) / variance(d));
    stdVars.push(variance(applyContrast(d, fitContrast(d))));
  }
  const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  // per-shard common-mode varies, but ACROSS shards the contrast collapses it by a large median factor
  assert.ok(med(ratios) > 30, `median common-mode collapse should be large, got ${med(ratios).toFixed(0)}×`);
  // standardized contrast is ~unit scale (the e-value's N(0,1) input assumption)
  assert.ok(med(stdVars) > 0.4 && med(stdVars) < 2.5, `standardized contrast ~unit scale, median var ${med(stdVars).toFixed(2)}`);
});

test('the contrast fit CENTERS before whitening — the seed tick is not a baseline-offset outlier', () => {
  // treatment and control have INDEPENDENT baselines, so the contrast has a large nonzero mean. Without
  // centering, whiten() returns the first tick unchanged (no prior sample) carrying the full offset → an
  // 8σ outlier that spuriously trips the calibration monitor (the 1Hz mixed-cadence bug). Centering fixes it.
  const rng = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  const gauss = (): number => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const phi = 0.82, T = 1000, OFFSET = 70; // a persistent AR(1) contrast with a big baseline offset
  const d: number[] = []; let x = gauss();
  for (let t = 0; t < T; t++) { x = phi * x + Math.sqrt(1 - phi * phi) * gauss(); d.push(OFFSET + 3 * x); }
  const std = applyContrast(d, fitContrast(d));
  const maxAbs = Math.max(...std.map(Math.abs));
  assert.ok(Math.abs(std[0]) < 5, `seed tick should not be an outlier, got ${std[0].toFixed(1)}σ`);
  assert.ok(maxAbs < 6, `no extreme outliers after centering, max ${maxAbs.toFixed(1)}σ`);
  // and it is a valid e-increment in aggregate (mean g ≲ 1) — i.e. the calibration monitor will pass
  const meanG = std.reduce((s, r) => s + gInc(r), 0) / std.length;
  assert.ok(meanG < 1.1, `whitened contrast should be ~calibrated (mean g=${meanG.toFixed(3)})`);
});

test('Mode B (spatial null) controls FDR with recall on every faulted counter; beats naive temporal', () => {
  const healthy = loadScenarioBundle(BASE);
  const mon = loadScenarioBundle(MON);
  const pairs = loadControlPairs(MON);
  let selOk = 0, fpOk = 0, tpOk = 0, fT = 0, tTpOk = 0, scored = 0;
  for (const c of mon.counters.map((x) => x.name)) {
    const r = scoreCounterModeB(healthy, mon, pairs, c, 0.1);
    if (!r || r.nFault === 0) continue;
    scored++;
    assert.equal(r.mode, 'B', `${c} construction should be valid (Mode B)`);
    assert.ok(r.fdp <= 0.1 + 1e-9, `${c} spatial FDP ${r.fdp} should be ≤ q`);
    assert.ok(r.power >= 0.8, `${c} spatial power ${r.power} should be high`);
    selOk += r.selected; fpOk += r.falsePos; tpOk += r.selected - r.falsePos; fT += r.nFault;
    tTpOk += Math.round((Number.isNaN(r.temporalPower) ? 0 : r.temporalPower) * r.nFault);
  }
  assert.ok(scored >= 4, 'most counters carry faults to score');
  // aggregate: FDR controlled with strong recall, and the contrast strictly beats the naive temporal null.
  assert.equal(fpOk, 0, `aggregate false positives ${fpOk} should be 0 at this scale`);
  assert.ok(tpOk / fT >= 0.8, `aggregate recall ${(tpOk / fT).toFixed(2)} should be high`);
  assert.ok(tpOk > tTpOk, `spatial recall (${tpOk}) should beat naive-temporal recall (${tTpOk})`);
});

test('streaming byte-range pairing (monPairs) covers every treatment/control pair EXACTLY once', () => {
  // Mirror clustersynth's emit order: per gpu, per counter, (treatment row) then (control #ctrl row).
  const gpus = Array.from({ length: 11 }, (_, i) => `gpu-${i}`);
  const counters = ['a', 'b', 'c'];
  const lines: string[] = [];
  for (const g of gpus) for (const c of counters) {
    lines.push(JSON.stringify({ shard: g, counter: c, v: [1, 2, 3, 4] }));
    lines.push(JSON.stringify({ shard: `${g}#ctrl`, counter: c, v: [1, 2, 3, 4] }));
  }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cmb-pairs-')), 'counters.ndjson');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const size = fs.statSync(file).size;
  const expected = gpus.length * counters.length; // every (gpu,counter) is one pair

  // For a range of split widths (including ones that cut between treatment and control), the disjoint
  // byte ranges must together yield each pair exactly once — no drops, no duplicates.
  for (const nW of [1, 2, 3, 5, 7, 13, 64]) {
    const seen = new Map<string, number>();
    for (let i = 0; i < nW; i++) {
      const bs = Math.floor((i * size) / nW), be = Math.floor(((i + 1) * size) / nW);
      for (const [t, c] of monPairs(file, bs, be)) {
        assert.equal(c.shard, `${t.shard}#ctrl`, 'control must match its treatment');
        assert.equal(c.counter, t.counter, 'pair must share a counter');
        const key = `${t.shard}\0${t.counter}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    assert.equal(seen.size, expected, `nW=${nW}: ${seen.size} distinct pairs, want ${expected}`);
    for (const [k, n] of seen) assert.equal(n, 1, `nW=${nW}: pair ${k} seen ${n}× (want 1 — no drop/dup across ranges)`);
  }
});

test('renderModeB runs end-to-end (short-window override for the test fixture) and reports Mode B', () => {
  process.env.CS_ALLOW_SHORT = '1';
  try {
    const out = renderModeB(BASE, MON, 0.1);
    assert.match(out, /CLUSTERSYNTH MODE B/);
    assert.match(out, /AGGREGATE spatial-null \(Mode B\) FDP: 0\.000/);
  } finally {
    delete process.env.CS_ALLOW_SHORT;
  }
});
