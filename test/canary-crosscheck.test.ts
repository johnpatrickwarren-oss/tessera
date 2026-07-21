import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rackKey, faultsByShard, shardFaultedAt, GroupFamily, runCrosscheckOnBundle, DEFAULT_CROSS, CrossFault,
} from '../tools/canary-crosscheck.js';
import { Rng } from '../tools/canary-sim.js';
import type { ScenarioBundle } from '../tools/clustersynth-scenario.js';

test('rackKey parses the generator id scheme', () => {
  assert.equal(rackKey('cluster-0-pod-3-rack-5-tray-2-gpu-1'), 'cluster-0-pod-3-rack-5');
  assert.equal(rackKey('cluster-0-pod-11-rack-15-tray-0-gpu-3'), 'cluster-0-pod-11-rack-15');
  assert.equal(rackKey('no-rack-marker'.replace('-rack-', '-r-')), 'no-r-marker'); // absent → id unchanged
});

test('shardFaultedAt respects onset/offset window and grace', () => {
  const f: CrossFault = { level: 'gpu', type: 'mean_shift', t_onset: 10, t_offset: 20, affected_shards: ['s1'] };
  const m = faultsByShard([f]);
  assert.equal(shardFaultedAt(m, 's1', 9), false);
  assert.equal(shardFaultedAt(m, 's1', 10), true);
  assert.equal(shardFaultedAt(m, 's1', 19), true);
  assert.equal(shardFaultedAt(m, 's1', 20), false);
  assert.equal(shardFaultedAt(m, 's1', 22, 5), true); // grace hangover
  assert.equal(shardFaultedAt(m, 's2', 15), false);
});

test('GroupFamily: calibrated on exchangeable groups, fires on a shifted group', () => {
  const rng = new Rng(7);
  const fam = new GroupFamily();
  const G = 20;
  for (let day = 0; day < 40; day++) {
    for (let g = 0; g < G; g++) {
      for (let k = 0; k < 6; k++) {
        let u = rng.next();
        if (g === 3 && day >= 28) u = Math.min(1, 0.5 + 0.5 * rng.next() + 0.25); // shifted group, late onset
        fam.accumulate(`g${g}`, Math.min(u, 0.999999));
      }
    }
    fam.evalDaily(day, rng);
  }
  const eShifted = fam.e.get('g3') ?? 1;
  let maxHealthy = 0;
  for (let g = 0; g < G; g++) if (g !== 3) maxHealthy = Math.max(maxHealthy, fam.e.get(`g${g}`) ?? 1);
  assert.ok(eShifted > 100, `shifted group e=${eShifted}`);
  assert.ok(maxHealthy < 100, `healthy max e=${maxHealthy}`);
});

function syntheticBundle(seed: number, withFault: boolean): ScenarioBundle {
  const rng = new Rng(seed);
  const RACKS = 16, PER = 24, T = 45 * 24;
  const shardIds: string[] = [];
  for (let r = 0; r < RACKS; r++) for (let g = 0; g < PER; g++) shardIds.push(`cluster-0-pod-0-rack-${r}-tray-${g >> 2}-gpu-${g & 3}`);
  const rackEff = Array.from({ length: RACKS }, () => rng.norm() * 3);
  const faulted = withFault ? [shardIds[5], shardIds[100], shardIds[300]] : [];
  const onset = 24 * 30;
  const series = new Map<string, number[]>();
  for (let i = 0; i < shardIds.length; i++) {
    const arr = new Array<number>(T);
    const r = Math.floor(i / PER);
    for (let t = 0; t < T; t++) {
      let v = 500 + 30 * Math.sin((2 * Math.PI * t) / 24) + rackEff[r] + 10 * rng.norm();
      if (faulted.includes(shardIds[i]) && t >= onset) v += 40; // 4-sigma mean shift
      arr[t] = v;
    }
    series.set(shardIds[i] + String.fromCharCode(0) + 'power_w', arr);
  }
  const faults = withFault
    ? [{ level: 'gpu', counter: 'power_w', type: 'mean_shift', t_onset: onset, t_offset: T, affected_shards: faulted }]
    : [];
  return {
    T, dt_s: 3600, shardIds, counters: [{ name: 'power_w', load: {} }],
    factors: {}, membership: {}, faults, series,
  } as unknown as ScenarioBundle;
}

test('healthy synthetic bundle: calibration nominal, no false discoveries', () => {
  const r = runCrosscheckOnBundle(syntheticBundle(11, false), { ...DEFAULT_CROSS, seed: 5, probesPerHour: 32 });
  const rate = r.healthyLe01 / Math.max(1, r.healthyTests);
  assert.ok(r.healthyTests > 10000, `tests ${r.healthyTests}`);
  assert.ok(Math.abs(rate - 0.01) < 0.004, `healthy p<=.01 rate ${rate}`);
  assert.equal(r.distinctFalseShards, 0);
  assert.ok(r.falsePages <= 2, `false pages ${r.falsePages}`);
  assert.equal(r.monitorRevokedDay, null);
});

test('faulted synthetic bundle: 4-sigma shards detected with controlled FDP', () => {
  const r = runCrosscheckOnBundle(syntheticBundle(11, true), { ...DEFAULT_CROSS, seed: 5, probesPerHour: 32 });
  assert.ok((r.recallMeanShiftGpu ?? 0) >= 2 / 3, `recall ${r.recallMeanShiftGpu}`);
  const worst = Math.max(0, ...r.stops.filter(s => s.family === 'shard').map(s => s.fdp));
  assert.ok(worst <= 0.34, `worst shard stop FDP ${worst}`);
  const det = r.faultDetects[0];
  assert.ok(det.detectDay !== null && det.detectDay - det.onsetDay < 10, `delay ${det.detectDay}`);
});
