// test/rack-local-conformal.test.ts — block-formation invariants of the rack-local prototype.
//
// The statistical claims live in research/2026-07-28-rack-local-conformal.md (measured, seeds
// recorded). What tests can lock is the CONSTRUCTION: blocks never cross a rack boundary, block
// size is exactly K+1, no unit is scored twice in a round, and leftover units' accumulators are
// untouched that round — the properties the exchangeability argument stands on.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scoreRoundRackLocal, panelWithRacks } from '../tools/rack-local-conformal';
import type { FleetState } from '../tools/horizon-experiment';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function freshState(n: number): FleetState {
  return {
    prod: new Float64Array(n).fill(1), g: new Float64Array(n), k: new Int32Array(n),
    cur: new Float64Array(n).fill(1), paged: new Uint8Array(n),
  };
}

test('panelWithRacks: rack ids are dense, contiguous runs, 72 units per full rack', () => {
  const { rackOf, nRacks } = panelWithRacks(0.5, 424242, 288, 4);
  assert.equal(nRacks, 4);
  for (let u = 1; u < 288; u++) {
    assert.ok(rackOf[u] === rackOf[u - 1] || rackOf[u] === rackOf[u - 1] + 1, 'rack ids nondecreasing by 1');
  }
  const counts = new Array<number>(nRacks).fill(0);
  for (let u = 0; u < 288; u++) counts[rackOf[u]]++;
  for (const c of counts) assert.equal(c, 72);
});

test('scoreRoundRackLocal: every scored unit advanced exactly once; leftovers untouched; blocks within racks', () => {
  const nUnits = 288, K = 23; // 72 = 3 blocks of 24 exactly → no leftovers
  const { scores, rackOf, nRacks } = panelWithRacks(0.5, 424242, nUnits, 4);
  const st = freshState(nUnits);
  scoreRoundRackLocal(rng(7), scores, 0, K, rackOf, nRacks, st, 0.001);
  for (let u = 0; u < nUnits; u++) assert.equal(st.k[u], 1, `unit ${u} scored exactly once`);

  // K=30 → 72 mod 31 = 10 leftovers per rack, k stays 0 for exactly those.
  const st2 = freshState(nUnits);
  scoreRoundRackLocal(rng(7), scores, 0, 30, rackOf, nRacks, st2, 0.001);
  const perRackUnscored = new Array<number>(nRacks).fill(0);
  for (let u = 0; u < nUnits; u++) {
    assert.ok(st2.k[u] === 0 || st2.k[u] === 1);
    if (st2.k[u] === 0) {
      perRackUnscored[rackOf[u]]++;
      assert.equal(st2.cur[u], 1, 'leftover accumulator untouched');
    }
  }
  for (const c of perRackUnscored) assert.equal(c, 72 % 31, 'leftovers = rack size mod K+1, per rack');
});

test('rack-local cancellation: an extreme-λ rack does not out-rank within its own blocks', () => {
  // Hand-built panel: rack 0's scores are 10× inflated noise, racks 1-3 unit noise. With
  // rack-local blocks the WITHIN-block ranks stay uniform, so after one round the max
  // accumulator of rack 0 should not systematically exceed the fleet max — deterministic
  // smoke via many rounds: rack-0 mean accumulator stays within 3× of overall mean.
  const nUnits = 288, nRacks = 4, T = 60;
  const rackOf = new Int32Array(nUnits);
  for (let u = 0; u < nUnits; u++) rackOf[u] = Math.floor(u / 72);
  const r0 = rng(99);
  const norm = (): number => {
    const u1 = Math.max(r0(), 1e-12), u2 = r0();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const scores: number[][] = Array.from({ length: nUnits }, (_, u) =>
    Array.from({ length: T }, () => (rackOf[u] === 0 ? 10 : 1) * norm()));
  const st = freshState(nUnits);
  const r = rng(11);
  for (let t = 0; t < T; t++) scoreRoundRackLocal(r, scores, t, 23, rackOf, nRacks, st, 0.001);
  const rack0: number[] = [], rest: number[] = [];
  for (let u = 0; u < nUnits; u++) (rackOf[u] === 0 ? rack0 : rest).push(st.cur[u]);
  const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(mean(rack0) < 3 * mean(rest) + 3,
    `rack-0 mean accumulator ${mean(rack0)} should not dominate rest ${mean(rest)}`);
});
