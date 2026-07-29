// test/calibration-monitor.test.ts — the runtime calibration monitor must (a) stay PASSING on a
// genuinely-null reference stream so a construction_valid emitter remains Mode B, and (b) REVOKE on a
// mis-calibrated stream (the ADR 0019 mean(e)~1e150 failure mode) so the emitter is demoted Mode B→A.
// This locks ADR 0019 rule 1 ("construction_valid is revocable at runtime") in code.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';
import {
  freshCalibrationMonitor, updateCalibration, updateCalibrationBatch,
  calibrationVerdict, applyCalibrationMonitor,
} from '../tools/calibration-monitor.js';
import { isFdrBearing, modeOf, type EmitterContract } from '../tools/emitter-contract.js';

function constructionValidEmitter(): EmitterContract {
  return {
    id: 'test/construction', baselineVersion: 'v', conditioningVariables: ['cm'], residualizer: 'r',
    increment: 'normalized-mixture', stoppingAggregation: 'e-BH', horizon: 'w',
    validityClass: 'construction_valid', // monitor decides whether it stays Mode B
  };
}

function nullStream(seed: number, n: number): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => gaussian(rng));
}
function driftStream(seed: number, n: number, mu: number): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => mu + gaussian(rng));
}

test('stays PASSING on a genuinely-null N(0,1) reference stream (peakLogW < threshold)', () => {
  const m = freshCalibrationMonitor({ alpha: 0.01 });
  updateCalibrationBatch(m, nullStream(424242, 5000));
  assert.equal(m.passing, true);
  assert.ok(m.peakLogW < m.threshold, `peakLogW ${m.peakLogW} should be < ${m.threshold}`);
  const v = calibrationVerdict(m);
  assert.equal(v.passing, true);
  assert.ok(v.eValue < v.revokeAt);
});

test('REVOKES on a mis-calibrated (drifted N(1,1)) stream — anytime-valid evidence', () => {
  const m = freshCalibrationMonitor({ alpha: 0.01 });
  let revokedAt = -1;
  for (const r of driftStream(12345, 5000, 1.0)) {
    updateCalibration(m, r);
    if (!m.passing && revokedAt < 0) revokedAt = m.ticks;
  }
  assert.equal(m.passing, false);
  assert.ok(revokedAt > 0 && revokedAt < 100, `should revoke quickly, got tick ${revokedAt}`);
  assert.ok(calibrationVerdict(m).eValue >= calibrationVerdict(m).revokeAt);
});

test('revocation is STICKY — a later run of benign null residuals does not un-revoke', () => {
  const m = freshCalibrationMonitor({ alpha: 0.01 });
  updateCalibrationBatch(m, driftStream(7, 200, 1.0)); // breaks it
  assert.equal(m.passing, false);
  updateCalibrationBatch(m, nullStream(99, 5000));      // calm down
  assert.equal(m.passing, false, 'anytime-valid evidence does not un-accumulate');
});

test('applyCalibrationMonitor keeps a construction_valid emitter Mode B on a null reference', () => {
  const { contract, verdict } = applyCalibrationMonitor(constructionValidEmitter(), nullStream(424242, 5000));
  assert.equal(contract.calibrationMonitorPassing, true);
  assert.equal(isFdrBearing(contract), true);
  assert.equal(modeOf(contract), 'B');
  assert.equal(verdict.passing, true);
});

test('applyCalibrationMonitor DEMOTES a construction_valid emitter B→A on a broken reference', () => {
  // the ADR 0019 scenario: the increment is construction-valid on N(0,1) but the live residual drifted
  const { contract } = applyCalibrationMonitor(constructionValidEmitter(), driftStream(12345, 5000, 1.0));
  assert.equal(contract.calibrationMonitorPassing, false);
  assert.equal(isFdrBearing(contract), false, 'a revoked monitor must demote out of the FDR-bearing path');
  assert.equal(modeOf(contract), 'A');
});

test('accepts several per-shard reference streams pooled into one martingale', () => {
  const streams = [nullStream(1, 1500), driftStream(2, 1500, 1.2), nullStream(3, 1500)];
  const { contract } = applyCalibrationMonitor(constructionValidEmitter(), streams);
  // one shard drifted → the pooled cohort calibration is broken → revoke
  assert.equal(contract.calibrationMonitorPassing, false);
});

test('rejects an invalid alpha', () => {
  assert.throws(() => freshCalibrationMonitor({ alpha: 0 }), /alpha must be/);
  assert.throws(() => freshCalibrationMonitor({ alpha: 1.5 }), /alpha must be/);
});

// ── ADR 0027: increment-family coherence ─────────────────────────────────────

function scaledStream(seed: number, n: number, scale: number): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => scale * gaussian(rng));
}

test('ADR 0027 coherence: a 1.5× scale error revokes the GAUSSIAN-kind monitor but not the BOUNDED default', () => {
  // The bounded emitter's increment is exactly valid under any symmetric scale error (clipped,
  // conditionally mean-zero) — the monitor testing ITS family must not falsely demote it. The
  // gaussian family's validity genuinely depends on the scale (audit F7) — its monitor must fire.
  const s = scaledStream(11, 4000, 1.5);
  const g = freshCalibrationMonitor({ alpha: 0.01, incrementKind: 'gaussian' });
  const b = freshCalibrationMonitor({ alpha: 0.01 }); // default = bounded
  updateCalibrationBatch(g, s);
  updateCalibrationBatch(b, s);
  assert.equal(g.passing, false, 'gaussian monitor must catch the scale error its family cannot absorb');
  assert.equal(b.passing, true, `bounded monitor must NOT falsely demote (peak ${b.peakLogW.toFixed(2)})`);
});

test('ADR 0027: the bounded monitor still catches a center shift — the one nuisance the linear bet keeps', () => {
  const m = freshCalibrationMonitor({ alpha: 0.01 });
  updateCalibrationBatch(m, driftStream(13, 4000, 0.5));
  assert.equal(m.passing, false, 'bounded monitor must revoke on a broken center');
});

test('ADR 0027: bounded default stays passing on a clean null (Ville respected)', () => {
  const m = freshCalibrationMonitor({ alpha: 0.01 });
  updateCalibrationBatch(m, nullStream(17, 6000));
  assert.equal(m.passing, true);
});
