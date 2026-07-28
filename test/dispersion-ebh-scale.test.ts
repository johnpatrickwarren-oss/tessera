// test/dispersion-ebh-scale.test.ts — the bracket-extraction rule of the scale harness.
//
// The sweep numbers live in research/2026-07-28-a2-disp-ebh-scale.md (seeds recorded in the
// JSON artifacts). What tests can lock cheaply is the BRACKET RULE — onset = min ς̂ with any
// seed event, lastSafe = max clean ς̂ strictly below it — including the two edge cases that
// matter for honest reporting: a clean grid (onset ∞) and a clean point ABOVE the onset (which
// must NOT extend the safe region — 20160's 0.159-clean-between-failures is the real example).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onsetBracket, SCALE_SIZES } from '../tools/dispersion-ebh-scale';

const row = (varsigmaHat: number, seedsWithSel: number): { varsigmaHat: number; seedsWithSel: number } =>
  ({ varsigmaHat, seedsWithSel });

test('onsetBracket: onset is the smallest ς̂ with any seed event; lastSafe sits strictly below it', () => {
  const { onsetVarsigma, lastSafeVarsigma } = onsetBracket([
    row(0.065, 0), row(0.094, 0), row(0.123, 0), row(0.153, 3), row(0.183, 5),
  ]);
  assert.equal(onsetVarsigma, 0.153);
  assert.equal(lastSafeVarsigma, 0.123);
});

test('onsetBracket: a clean point ABOVE the onset does not extend the safe region', () => {
  // The measured 20160 fine grid: 0.153 fails 3/16, 0.159 clean 0/8, 0.165 fails 2/8.
  const { onsetVarsigma, lastSafeVarsigma } = onsetBracket([
    row(0.123, 0), row(0.153, 3), row(0.159, 0), row(0.165, 2),
  ]);
  assert.equal(onsetVarsigma, 0.153);
  assert.equal(lastSafeVarsigma, 0.123, 'the 0.159 island must not report as safe');
});

test('onsetBracket: clean grid reports onset ∞; all-failing grid reports lastSafe 0', () => {
  const clean = onsetBracket([row(0.1, 0), row(0.2, 0)]);
  assert.equal(clean.onsetVarsigma, Infinity);
  assert.equal(clean.lastSafeVarsigma, 0.2);
  const dirty = onsetBracket([row(0.065, 1), row(0.1, 2)]);
  assert.equal(dirty.onsetVarsigma, 0.065);
  assert.equal(dirty.lastSafeVarsigma, 0);
});

test('scale sizes are rack multiples (72/rack) and reach ≥10k as A2-disp-ebh-scale requires', () => {
  for (const n of SCALE_SIZES) assert.equal(n % 72, 0, `${n} must be a rack multiple`);
  assert.ok(Math.max(...SCALE_SIZES) >= 10080);
});
