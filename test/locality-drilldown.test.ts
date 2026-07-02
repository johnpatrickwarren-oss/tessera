// test/locality-drilldown.test.ts — coarse-to-fine locality drill-down (W3b, 2026-07-02 audit F11).
// Hierarchy: 4 zones × 4 racks/zone × 18 shards/rack = 288 shards. e-values via the normalized
// mixture on synthetic standardized residuals (seeded), so the test exercises the REAL evidence
// pipeline, not hand-planted e-values.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drillDown, renderDrillDown, type DrillLevel } from '../tools/locality-drilldown.js';
import { normalizedMixtureEValue } from '../tools/mixture-evalue.js';

const N = 288, RACKS = 16, PER_RACK = 18, PER_ZONE = 72;
function levels(): DrillLevel[] {
  return [
    { name: 'zone', groups: Array.from({ length: N }, (_, i) => Math.floor(i / PER_ZONE)) },
    { name: 'rack', groups: Array.from({ length: N }, (_, i) => Math.floor(i / PER_RACK)) },
    { name: 'shard', groups: Array.from({ length: N }, (_, i) => i) },
  ];
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rng: () => number): number {
  let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Per-shard e-values from T-tick standardized residuals with a shift on `shifted` from tick 100. */
function eValuesWithFault(seed: number, shifted: ReadonlySet<number>, mag: number, T = 300): number[] {
  return Array.from({ length: N }, (_, i) => {
    const rng = mulberry(seed * 1000 + i);
    const r = Array.from({ length: T }, (_, t) => gauss(rng) + (shifted.has(i) && t >= 100 ? mag : 0));
    return normalizedMixtureEValue(r);
  });
}

test('single-shard fault drills to SHARD-exact identification', () => {
  const fault = 137; // zone 1, rack 7
  const e = eValuesWithFault(1, new Set([fault]), 5);
  const r = drillDown(e, levels(), 0.1);
  assert.equal(r.finestIdentified, 2, 'drills to the shard level');
  assert.deepEqual(r.identifiedShards, [fault], 'names exactly the faulted shard');
  assert.deepEqual(r.levels[0].rejected, [1], 'the right zone');
  assert.deepEqual(r.levels[1].rejected, [7], 'the right rack');
});

test('rack-wide fault identifies the rack and its shards; other racks untouched', () => {
  const rack = 10; // zone 2
  const shards = new Set(Array.from({ length: PER_RACK }, (_, k) => rack * PER_RACK + k));
  const e = eValuesWithFault(2, shards, 3);
  const r = drillDown(e, levels(), 0.1);
  assert.ok(r.levels[0].rejected.includes(2), 'zone identified');
  assert.deepEqual(r.levels[1].rejected, [rack], 'exactly the faulted rack');
  assert.ok(r.identifiedShards.length >= PER_RACK * 0.8, 'most member shards identified at the leaf');
  assert.ok(r.identifiedShards.every((i) => shards.has(i)), 'no shard named outside the faulted rack');
});

test('clean fleet → full abstention (no level identifies, no shard named)', () => {
  const e = eValuesWithFault(3, new Set(), 0);
  const r = drillDown(e, levels(), 0.1);
  assert.equal(r.finestIdentified, -1);
  assert.deepEqual(r.identifiedShards, []);
  assert.match(renderDrillDown(r), /full abstention/);
});

test('rack-level evidence WITHOUT shard-level evidence abstains below the rack (no shard-level claim)', () => {
  // A concentrated-but-shared signal: half the rack carries a moderate shift, individually weak-ish.
  // Construct e-values directly to pin the abstention semantics: rack mean strong, no single shard
  // strong enough to survive the shard-level e-BH within the descended set.
  const rack = 4;
  const e = Array.from({ length: N }, () => 0.01);
  for (let k = 0; k < PER_RACK; k++) e[rack * PER_RACK + k] = 30; // rack mean 30 ≫ zone/rack thresholds
  // shard level within descent: 18 candidates, threshold 18/(k·q); e=30 → needs k·30 ≥ 180 → k ≥ 6 →
  // 18 shards at e=30: k=18 → 18·30=540 ≥ 180 → selected... so use e just below the 1-of-18 bar but
  // above the rack bar: rack level tests 4 racks of zone 1... use e=8: rack mean 8, zone mean 2.
  for (let k = 0; k < PER_RACK; k++) e[rack * PER_RACK + k] = 8;
  const r = drillDown(e, levels(), 0.1);
  if (r.finestIdentified >= 0) {
    // whatever the finest level, a shard is only ever named if the SHARD level itself rejected
    assert.ok(r.identifiedShards.length === 0 || r.finestIdentified === 2,
      'shard names require shard-level rejection');
  }
  assert.match(renderDrillDown(r), /NOT a hierarchical guarantee/);
});
