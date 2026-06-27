// test/baseline-monitor.test.ts — smoke test for the long-baseline → monitor harness. The substantive
// validation is on full generated bundles (a ≥2-month healthy baseline + a faulted monitoring window;
// decisions/0018 § 2-month baseline). Here we just guard the math: the robust solver and fit work, and
// the baseline residualisation runs end-to-end on the committed mini bundle (used as its own baseline).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { robustFitShard, fitBaseline, applyBaseline } from '../tools/baseline-monitor.js';

// Plumbing/wiring tests on a tiny committed fixture — NOT findings. Brand with the
// short-window override so the baseline-guard does not (correctly) throw on the short fixture.
process.env.CS_ALLOW_SHORT = '1';

const MINI = path.join(__dirname, '_substrate', 'clustersynth-scenario-mini');

test('robustFitShard recovers loadings and trims an injected anomaly', () => {
  const T = 200;
  const f1 = Array.from({ length: T }, (_, t) => Math.sin(t / 7));
  const f2 = Array.from({ length: T }, (_, t) => ((t % 5) - 2) / 2);
  const y = f1.map((a, t) => 3 + 1.5 * a - 0.8 * f2[t]); // intercept 3, loadings [1.5, -0.8]
  y[100] += 1000; // a large anomaly that LS would chase but the robust trim should reject
  const fit = robustFitShard(y, [f1, f2]);
  assert.ok(Math.abs(fit.intercept - 3) < 0.1, `intercept ~3; got ${fit.intercept}`);
  assert.ok(Math.abs(fit.loadings[0] - 1.5) < 0.1, `loading0 ~1.5; got ${fit.loadings[0]}`);
  assert.ok(Math.abs(fit.loadings[1] + 0.8) < 0.1, `loading1 ~-0.8; got ${fit.loadings[1]}`);
});

test('fitBaseline + applyBaseline run end-to-end on the mini bundle', () => {
  const b = loadScenarioBundle(MINI);
  const fits = fitBaseline(b, 'gpu_temp_c'); // warns about short baseline; still runs
  assert.equal(fits.length, b.shardIds.length);
  const R = applyBaseline(b, 'gpu_temp_c', fits);
  assert.equal(R.length, b.shardIds.length);
  assert.equal(R[0].length, b.T);
  assert.ok(R.every((r) => r.every((v) => Number.isFinite(v))), 'residuals must be finite');
});
