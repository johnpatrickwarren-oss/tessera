// test/baseline-power.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eValueWindow } from '../tools/baseline-power.js';

test('eValueWindow: a long stationary baseline yields a valid (~<=1) e-value', () => {
  // stationary stream; long baseline (m=2000) vs short horizon (n=200) -> n/m=0.1 -> valid.
  let s = 12345;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
  const v = Array.from({ length: 2200 }, () => 1000 + 2 * rng());
  assert.ok(eValueWindow(v, 2000, 200) <= 1, 'long baseline (n/m=0.1) must give a valid e-value');
});

test('eValueWindow: an under-powered baseline (n>m) over-fires on a persistent offset', () => {
  // tiny baseline then a regime the short calibration cannot pin -> inflated e-value.
  const v: number[] = [];
  for (let i = 0; i < 700; i++) v.push(i < 100 ? 1000 : 1003); // small persistent shift after the short baseline
  // short baseline m=100, long horizon n=600 (n/m=6) -> the plug-in offset accumulates.
  assert.ok(eValueWindow(v, 100, 600) > eValueWindow(v.slice(0, 100).concat(new Array(600).fill(1000)), 100, 600),
    'a persistent post-baseline offset must inflate the e-value vs a flat continuation');
});
