// test/contrast.test.ts — the shared model-free contrast fit (extracted from clustersynth-mode-b; ADR 0019).
// Locks the two load-bearing properties: it CENTERS before whitening (the seed tick is not a baseline-offset
// outlier) and standardizes a healthy contrast to ~unit scale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import { fitContrast, applyContrast, median, madScale } from '../tools/contrast.js';

/** A persistent AR(1) contrast with a large independent-baseline OFFSET (treatment − control). */
function offsetAr1(rng: () => number, n: number, phi: number, offset: number, scale: number): number[] {
  const d: number[] = []; let x = gaussian(rng);
  for (let t = 0; t < n; t++) { x = phi * x + Math.sqrt(1 - phi * phi) * gaussian(rng); d.push(offset + scale * x); }
  return d;
}

test('median/madScale: robust location + scale (MAD×1.4826), floored positive', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.ok(madScale([0, 0, 0, 0, 10]) >= 1e-9, 'never returns 0 (floored)');
  const r = mulberry32(5);
  const sd = madScale(Array.from({ length: 2000 }, () => gaussian(r)));
  assert.ok(sd > 0.9 && sd < 1.1, `MAD scale of N(0,1) ≈ 1, got ${sd.toFixed(3)}`);
});

test('CENTERS before whitening: a big baseline offset does not make the seed tick an outlier', () => {
  const d = offsetAr1(mulberry32(12345), 1000, 0.82, /*offset*/ 70, /*scale*/ 3);
  const std = applyContrast(d, fitContrast(d));
  assert.ok(Math.abs(std[0]) < 5, `seed tick should not carry the offset, got ${std[0].toFixed(1)}σ`);
  assert.ok(Math.max(...std.map(Math.abs)) < 6, 'no extreme outliers after centering');
});

test('standardizes a healthy contrast to ~unit scale (the e-value N(0,1) input assumption)', () => {
  const d = offsetAr1(mulberry32(7), 1500, 0.6, 40, 2.5);
  const std = applyContrast(d, fitContrast(d));
  const m = std.reduce((s, x) => s + x, 0) / std.length;
  const v = std.reduce((s, x) => s + (x - m) ** 2, 0) / std.length;
  assert.ok(v > 0.5 && v < 2, `standardized contrast ~unit variance, got ${v.toFixed(2)}`);
});

test('applyContrast is prefix-stable (causal): applying to a prefix == prefix of applying to the whole', () => {
  const d = offsetAr1(mulberry32(99), 400, 0.7, 10, 2);
  const fit = fitContrast(d);
  const whole = applyContrast(d, fit);
  const prefix = applyContrast(d.slice(0, 120), fit);
  for (let i = 0; i < 120; i++) assert.ok(Math.abs(whole[i] - prefix[i]) < 1e-9, `tick ${i} must match (causal whitening)`);
});
