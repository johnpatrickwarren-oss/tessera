// test/contamination-robust-fleet.test.ts — Lever A (ADR 0015): contamination-robust fleet-FDR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robustCenter, robustResiduals, perShardLevel } from '../tools/contamination-robust-fleet.js';
import { genFleet, M, N_TEST } from '../tools/fleet-relative-capstone.js';
import { nuisanceRobustEValue } from '../tools/nuisance-robust-evalue.js';
import { eBH } from '../tools/fleet-fdr.js';
import { mulberry32, scramble } from '../tools/calibration-envelope.js';

test('AC-1: robustCenter equals the mean on clean symmetric data, within tol', () => {
  const xs = [-1, -0.5, 0, 0.5, 1, -0.8, 0.3, -0.2, 0.7, 0.2];
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(Math.abs(robustCenter(xs) - m) < 0.2, `robustCenter ${robustCenter(xs)} ≈ mean ${m}`);
});

test('AC-1: robustCenter REDESCENDS — a minority of huge outliers is fully rejected (not just downweighted)', () => {
  const clean = [-1, -0.5, 0, 0.5, 1, -0.8, 0.3, -0.2, 0.7, 0.2];
  const c0 = robustCenter(clean);
  const contaminated = [...clean, 1e6, 1e6, 1e6]; // 3/13 ≈ 23% contamination, arbitrarily large
  const c1 = robustCenter(contaminated);
  assert.ok(Math.abs(c1 - c0) < 0.3, `redescending: center barely moves ${c0} → ${c1} despite 1e6 outliers`);
  // a non-robust mean would be ~2.3e5
  const mean = contaminated.reduce((a, b) => a + b, 0) / contaminated.length;
  assert.ok(mean > 1e5, 'sanity: the plain mean is destroyed by the outliers');
});

test('AC-2: the demean step makes faults the cross-sectional outliers (the rank-flip trimmed-mean lacked)', () => {
  // 5 shards, heterogeneous levels; the two LOW-level shards (2,4) carry a +8 fault at the test tick.
  const levels = [10, 0, -10, 5, -5];
  const faulty = [false, false, true, false, true];
  const m = 50, testTick = 60;
  const X = levels.map((lvl, i) => {
    const row = new Array(80).fill(lvl);                 // constant cal = level (median over [0,m) = level)
    row[testTick] = lvl + (faulty[i] ? 8 : 0);            // fault appears only at the test tick
    return row;
  });
  const lvl = perShardLevel(X, m);
  // pre-demean: rank shards by RAW value at the test tick — faulty shards are NOT the top-2
  const rawTop2 = X.map((r, i) => ({ i, v: r[testTick] })).sort((a, b) => b.v - a.v).slice(0, 2).map((o) => o.i);
  assert.ok(!(rawTop2.includes(2) && rawTop2.includes(4)), `pre-demean the faults (2,4) are NOT both top-2 (got ${rawTop2})`);
  // post-demean: subtract per-shard level → faults ARE the top-2 (the property that makes robust centering work)
  const adjTop2 = X.map((r, i) => ({ i, v: r[testTick] - lvl[i] })).sort((a, b) => b.v - a.v).slice(0, 2).map((o) => o.i);
  assert.deepEqual([...adjTop2].sort(), [2, 4], `post-demean the faults (2,4) ARE the top-2 (got ${adjTop2})`);
});

test('AC-3: robust+BF e-BH controls FDP ≤ q at low fault load, at full power', () => {
  const q = 0.1, mfail = 5, TR = 15;
  let fpSum = 0, powSum = 0;
  for (let s = 0; s < TR; s++) {
    const { X, failed } = genFleet(mulberry32(scramble(1 + s * 53)), mfail);
    const e = robustResiduals(X, M).map((r) => nuisanceRobustEValue(r, M, N_TEST));
    const rej = eBH(e, q);
    const fp = rej.filter((i) => !failed[i]).length;
    fpSum += rej.length ? fp / rej.length : 0;
    powSum += rej.filter((i) => failed[i]).length / mfail;
  }
  assert.ok(fpSum / TR <= q, `mean FDP ${(fpSum / TR).toFixed(3)} ≤ q=${q}`);
  assert.ok(powSum / TR >= 0.95, `mean power ${(powSum / TR).toFixed(3)} ≥ 0.95`);
});

test('AC: residual BF e-value is VALID on a null fleet (no faults) — P(fire) ≤ α', () => {
  const es: number[] = [];
  for (let s = 0; s < 8; s++) {
    const { X } = genFleet(mulberry32(scramble(5000 + s * 31)), 0);
    es.push(...robustResiduals(X, M).map((r) => nuisanceRobustEValue(r, M, N_TEST)));
  }
  const pFire = es.filter((e) => e >= 1 / 0.01).length / es.length;
  const mean = es.reduce((a, b) => a + b, 0) / es.length;
  assert.ok(mean <= 1, `null-fleet residual E[e] ${mean.toFixed(3)} ≤ 1`);
  assert.ok(pFire <= 0.01, `null-fleet residual P(e≥1/α) ${pFire.toFixed(4)} ≤ α (n=${es.length})`);
});

test('AC-4: the breakdown is near 12/60 — FDP is controlled at the default load but crosses q just above it', () => {
  // The honest envelope: the margin above the default (10/60) is NARROW. Pin the actual cliff —
  // FDP ≤ q at 10/60, but > q by 12/60 — not just a gross direction between far-apart endpoints.
  const q = 0.1;
  const fdpAt = (mfail: number, seed0: number) => {
    let s = 0; const TR = 20;
    for (let s2 = 0; s2 < TR; s2++) {
      const { X, failed } = genFleet(mulberry32(scramble(seed0 + s2 * 53)), mfail);
      const e = robustResiduals(X, M).map((r) => nuisanceRobustEValue(r, M, N_TEST));
      const rej = eBH(e, q);
      s += rej.length ? rej.filter((i) => !failed[i]).length / rej.length : 0;
    }
    return s / TR;
  };
  const at10 = fdpAt(10, 1), at12 = fdpAt(12, 700);
  assert.ok(at10 <= q, `FDP at the default 10/60 is controlled (${at10.toFixed(3)} ≤ ${q})`);
  assert.ok(at12 > q, `FDP crosses q just above default, at 12/60 (${at12.toFixed(3)} > ${q}) — narrow margin`);
});
