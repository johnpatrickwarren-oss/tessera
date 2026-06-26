// test/instrumented-capstone.test.ts — binds the engine-backed capstone
// (tools/instrumented-capstone.ts) reproduction of engine ADR 0019:
//   instrumented (measured-factor) common-mode → universal-inference mean-shift
//   e-value → e-BH controls the EMPIRICAL fleet-FDP with full power, where the
//   median-center control (the contaminated estimator from the prior capstone)
//   does not. Deterministic (fixed seed) — no Monte-Carlo flakiness.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  genFleet,
  assembleCommonModeTelemetry,
  instrumentedEValues,
  score,
  runTrials,
  N,
  T,
} from '../tools/instrumented-capstone';
import { mulberry32 } from '../tools/calibration-envelope.js';

const TRIALS = 12;

test('step 5 — assembleCommonModeTelemetry: validated grid factor + full membership', () => {
  const fleet = genFleet(mulberry32(1), 10);
  const { factorSignals, membership } = assembleCommonModeTelemetry(fleet.cm, N);
  assert.strictEqual(factorSignals.length, 1, 'one instrumented factor');
  assert.strictEqual(factorSignals[0].length, T, 'factor aligned to the analysis grid');
  assert.strictEqual(membership.length, N, 'one membership list per shard');
  // Every shard loads on the single common-mode factor (index 0).
  for (const m of membership) assert.deepStrictEqual(m, [0]);
});

test('step 6 — instrumented e-values separate faulted from healthy shards', () => {
  const fleet = genFleet(mulberry32(7), 10);
  const e = instrumentedEValues(fleet);
  assert.strictEqual(e.length, N);
  const failedMax = Math.max(...e.filter((_, i) => fleet.failed[i]));
  const healthyMax = Math.max(...e.filter((_, i) => !fleet.failed[i]));
  // The largest faulted e-value dwarfs the largest healthy one (clean separation).
  assert.ok(failedMax > 10 * healthyMax,
    `expected faulted e-values ≫ healthy; failedMax=${failedMax}, healthyMax=${healthyMax}`);
});

test('capstone — instrumented controls empirical fleet-FDP with full power', () => {
  // mfail=10 is the diagnostic regime (where the median control fails hardest).
  for (const q of [0.1, 0.05]) {
    const { instrumented } = runTrials(10, q, TRIALS);
    // e-BH on the valid UI e-values controls FDP: empirical mean ≤ q (small margin).
    assert.ok(instrumented.fdp <= q + 0.02,
      `instrumented FDP ${instrumented.fdp.toFixed(3)} > q=${q} (+margin) at mfail=10`);
    // The instrumented common-mode preserves the fault → high power.
    assert.ok(instrumented.power >= 0.95,
      `instrumented power ${instrumented.power.toFixed(3)} < 0.95 at q=${q}, mfail=10`);
  }
});

test('capstone — median-center control FAILS FDR under fault contamination (the contrast)', () => {
  // At high fault density the faults shift the median center, giving healthy shards a
  // spurious step that false-fires — FDP ≫ q (ADR 0012). This binds that the test is
  // meaningful: the instrumented win above is a real fix, not a trivially easy regime.
  const { instrumented, median } = runTrials(10, 0.1, TRIALS);
  assert.ok(median.fdp > 0.25,
    `expected median-center FDP ≫ q at mfail=10; got ${median.fdp.toFixed(3)}`);
  assert.ok(median.fdp > instrumented.fdp * 5,
    `expected instrumented FDP ≪ median FDP; instrumented=${instrumented.fdp.toFixed(3)}, median=${median.fdp.toFixed(3)}`);
});
