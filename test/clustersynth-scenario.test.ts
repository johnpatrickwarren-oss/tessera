// test/clustersynth-scenario.test.ts — the scenario-bundle pipeline
// (tools/clustersynth-scenario.ts) on a tiny committed bundle fixture in the exact
// clustersynth scenario-harness format (factors.json + labels.json + counters.ndjson).
//
// This is a WIRING + positive-control test: a clean, window-aligned mean_shift fault on
// well-behaved data IS detected with FDR control. The large-scale HONEST finding (the
// mean-shift e-value is underpowered on transient/non-mean-shift faults, and
// distributionalSignature is swamped by nonstationarity) is demonstrated by the bench
// `pnpm clustersynth-scenario <real-bundle-dir>` — it is a finding, not a unit invariant,
// because a real bundle (megabytes of counters.ndjson) is too large to commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadScenarioBundle,
  counterMatrices,
  scoreCounter,
} from '../tools/clustersynth-scenario';

const DIR = join(__dirname, '_substrate', 'clustersynth-scenario-mini');
const skip = !existsSync(join(DIR, 'factors.json')) && 'mini scenario fixture missing';

test('loadScenarioBundle: parses factors + labels + counters into aligned structures', { skip }, () => {
  const b = loadScenarioBundle(DIR);
  assert.strictEqual(b.shardIds.length, 8);
  assert.strictEqual(b.T, 60);
  assert.strictEqual(b.counters.length, 1);
  assert.strictEqual(b.counters[0].name, 'gpu_temp_c');
  assert.strictEqual(b.faults.length, 1);
  assert.strictEqual(b.faults[0].type, 'mean_shift');
  assert.strictEqual(b.faults[0].level, 'gpu');
});

test('counterMatrices: assembles X + measured factors + per-shard membership by load-kinds', { skip }, () => {
  const b = loadScenarioBundle(DIR);
  const { X, factorSignals, membership } = counterMatrices(b, 'gpu_temp_c');
  assert.strictEqual(X.length, 8);
  assert.strictEqual(X[0].length, 60);
  // gpu_temp_c loads only on `cool` → two cdu factor signals.
  assert.strictEqual(factorSignals.length, 2);
  assert.strictEqual(factorSignals[0].length, 60);
  // Shards 0–3 belong to cdu-0 (factor 0); shards 4–7 to cdu-1 (factor 1).
  assert.deepStrictEqual(membership[0], [0]);
  assert.deepStrictEqual(membership[3], [0]);
  assert.deepStrictEqual(membership[7], [1]);
});

test('scoreCounter: a clean window-aligned mean_shift fault is detected with FDR control', { skip }, () => {
  const b = loadScenarioBundle(DIR);
  // calLen=25 aligns the cal/test boundary with the fault onset (the favourable case).
  const s = scoreCounter(b, 'gpu_temp_c', 25, 0.1);
  assert.strictEqual(s.meanShift.nFault, 1);
  assert.strictEqual(s.meanShift.power, 1, 'the injected mean_shift fault should be detected');
  assert.strictEqual(s.meanShift.fdp, 0, 'no false discoveries on the clean fixture');
  assert.strictEqual(s.byType.mean_shift.nFault, 1);
  // The signature FP accounting is wired (healthy shards counted).
  assert.strictEqual(s.sigHealthy.nHealthy, 7);
});
