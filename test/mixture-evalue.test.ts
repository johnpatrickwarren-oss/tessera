// test/mixture-evalue.test.ts — the default fleet-e-BH e-value object (ADR 0019).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gInc, normalizedMixtureEValue, geometricMixtureEValue } from '../tools/mixture-evalue.js';

test('gInc: exact at r=0, symmetric, capped', () => {
  const expected = (Math.exp(-0.125) + Math.exp(-0.5) + Math.exp(-2)) / 3; // ±λ pairs, ≈0.541
  assert.ok(Math.abs(gInc(0) - expected) < 1e-9);
  assert.ok(Math.abs(gInc(1.3) - gInc(-1.3)) < 1e-9, 'symmetric in r');
  assert.ok(gInc(1e6) <= 100, 'capped at 100');
});

test('normalizedMixtureEValue: near-zero on a bounded null, large on a sustained shift', () => {
  const T = 400;
  const nullSeries = Array.from({ length: T }, (_, t) => Math.sin(t)); // bounded ~null
  const faultSeries = nullSeries.map((v, t) => v + (t > 200 ? 3 : 0)); // sustained +3
  const e0 = normalizedMixtureEValue(nullSeries);
  const e1 = normalizedMixtureEValue(faultSeries);
  assert.ok(Number.isFinite(e0) && e0 >= 0);
  assert.ok(e1 > e0, 'a sustained shift raises the e-value');
  assert.ok(e1 > 5, `fault e-value should be clearly large; got ${e1}`);
});

test('normalizedMixtureEValue: empty series → 0', () => {
  assert.equal(normalizedMixtureEValue([]), 0);
});

// ── geometricMixtureEValue (2026-07-02 audit fix: the always-on-loop object) ──

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rng: () => number): number {
  let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

test('geometricMixtureEValue: PREFIX-MONOTONE — longer prefixes never lower the value (the cross-cycle property the uniform mixture lacks)', () => {
  const rng = mulberry(7);
  const r = Array.from({ length: 600 }, () => gauss(rng));
  r.forEach((_, t) => { if (t >= 300) r[t] += 2.5; }); // mid-window sustained shift
  let prev = 0;
  for (const cut of [50, 100, 200, 300, 350, 400, 500, 600]) {
    const v = geometricMixtureEValue(r.slice(0, cut));
    assert.ok(v >= prev - 1e-12, `prefix ${cut}: ${v} < previous ${prev} — running max must be monotone`);
    prev = v;
  }
  // the uniform mixture is NOT prefix-monotone (per-look renormalization) — document the contrast:
  // normalizedMixtureEValue can shrink as T grows, which is exactly why the loop must not use it.
});

test('geometricMixtureEValue: E[·|H0] stays ≤ 1 empirically on iid N(0,1) (mean over reps well under 1)', () => {
  let sum = 0; const REPS = 300, T = 240;
  for (let rep = 0; rep < REPS; rep++) {
    const rng = mulberry(1000 + rep);
    sum += geometricMixtureEValue(Array.from({ length: T }, () => gauss(rng)));
  }
  const mean = sum / REPS;
  assert.ok(mean <= 1, `null mean ${mean.toFixed(3)} should be ≤ 1 (supermartingale + conservative adjuster)`);
});

test('geometricMixtureEValue: detects a sustained shift (clearly larger than its null value)', () => {
  const rng = mulberry(42);
  const nullS = Array.from({ length: 400 }, () => gauss(rng));
  const fault = nullS.map((v, t) => v + (t >= 100 ? 3 : 0));
  const e0 = geometricMixtureEValue(nullS), e1 = geometricMixtureEValue(fault);
  assert.ok(e1 > Math.max(5, e0 * 10), `fault e-value ${e1} should dominate null ${e0}`);
});

test('geometricMixtureEValue: empty series → 0', () => {
  assert.equal(geometricMixtureEValue([]), 0);
});