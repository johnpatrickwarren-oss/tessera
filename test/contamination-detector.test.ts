// test/contamination-detector.test.ts — the control-twin κ machinery (ADR 0021 research artifact). These
// lock the cancellation-ratio math + the cohort thresholding. NB: ADR 0021 found κ INSUFFICIENT as a Mode B
// gate (it measures variance leak, not the sustained-shift harm); these tests validate the statistic, not a
// guarantee.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import {
  cancellationRatio, twinComparability, twinComparabilityFromKappas, comparableShards,
} from '../tools/contamination-detector.js';

/** A shared common-mode signal + independent idiosyncratic noise. */
function commonMode(rng: () => number, n: number): number[] {
  const f: number[] = []; let x = 0;
  for (let t = 0; t < n; t++) { x = 0.9 * x + gaussian(rng); f.push(5 * x); } // strong autocorrelated common mode
  return f;
}
const addNoise = (f: number[], rng: () => number, sd = 0.3): number[] => f.map((v) => v + sd * gaussian(rng));

test('cancellationRatio: matched twin (shared common-mode) → κ ≈ 0; divergent common-mode → κ large', () => {
  const rng = mulberry32(1);
  const f = commonMode(rng, 600);
  const t = addNoise(f, rng), cMatched = addNoise(f, rng);
  const kMatched = cancellationRatio(t, cMatched);
  assert.ok(kMatched < 0.05, `matched twin cancels the common-mode, κ=${kMatched.toFixed(3)} should be tiny`);
  // a twin loading on a DIFFERENT common-mode does not cancel → contrast retains common-mode → κ ~ O(1)
  const f2 = commonMode(mulberry32(2), 600);
  const kDiverged = cancellationRatio(t, addNoise(f2, rng));
  assert.ok(kDiverged > 0.5, `divergent twin leaves residual common-mode, κ=${kDiverged.toFixed(3)} should be large`);
});

test('twinComparability flags the non-comparable (high-κ) pairs and keeps matched ones', () => {
  const rng = mulberry32(7);
  const f = commonMode(rng, 600);
  const pairs = [
    ...Array.from({ length: 8 }, (_, i) => ({ shard: `m${i}`, treatment: addNoise(f, rng), control: addNoise(f, rng) })),
    { shard: 'bad0', treatment: addNoise(f, rng), control: addNoise(commonMode(mulberry32(100), 600), rng) },
    { shard: 'bad1', treatment: addNoise(f, rng), control: addNoise(commonMode(mulberry32(101), 600), rng) },
  ];
  const res = twinComparability(pairs);
  const comparable = comparableShards(res);
  for (let i = 0; i < 8; i++) assert.ok(comparable.has(`m${i}`), `matched m${i} should be comparable`);
  assert.ok(!comparable.has('bad0') && !comparable.has('bad1'), 'divergent twins flagged non-comparable');
  assert.equal(res.excluded, 2);
});

test('twinComparabilityFromKappas matches the series-based path (the streaming reducer reuse)', () => {
  const items = [
    { shard: 'a', kappa: 0.004 }, { shard: 'b', kappa: 0.006 }, { shard: 'c', kappa: 0.005 },
    { shard: 'd', kappa: 0.31 }, { shard: 'e', kappa: 0.28 },
  ];
  const res = twinComparabilityFromKappas(items);
  const comp = comparableShards(res);
  assert.deepEqual([...comp].sort(), ['a', 'b', 'c']);
  assert.equal(res.threshold >= 0.1, true, 'absolute floor applies (clean cohort → relMult·p25 below floor)');
});

test('a uniformly weak-common-mode cohort (all κ moderate) is NOT over-excluded by the relative term', () => {
  // every pair cancels poorly (genuinely weak common-mode) → high cohort p25 → threshold scales up → no
  // pair is a relative outlier → none excluded (the gate must not nuke a whole weak-common-mode counter).
  const items = Array.from({ length: 10 }, (_, i) => ({ shard: `w${i}`, kappa: 0.25 + 0.02 * (i % 3) }));
  const res = twinComparabilityFromKappas(items);
  assert.equal(res.excluded, 0, `uniform weak-common-mode cohort should not be excluded (threshold ${res.threshold.toFixed(2)})`);
});
