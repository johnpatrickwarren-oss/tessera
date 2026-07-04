// test/mini-bundle.test.ts — mini NDJSON → clustersynth-compatible bundle. The invariants: the
// bundle round-trips through the EXISTING pipeline loaders unchanged (that is the whole point);
// long gaps FAIL by default (forward-filling a reboot gap manufactures a fake constant series);
// cluster membership is inferred from DVFS correlation, not assumed; the cluster common-mode
// factor is LEAVE-ONE-OUT (a factor containing the shard's own series absorbs single-shard
// faults — ADR 0016/P5); and the full canonical path (fitBaseline → applyBaseline →
// scoreCounterBaseline) runs on a fixture that clears the 56-day guard legitimately.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildMiniBundle, journalToFaults, gapRuns } from '../tools/mini-bundle.js';
import { loadScenarioBundle, counterMatrices } from '../tools/clustersynth-scenario.js';
import { fitBaseline, applyBaseline, scoreCounterBaseline } from '../tools/baseline-monitor.js';
import { T0, CAD, TICKS, writeFixture, tmp } from './_mini-fixture.js';

test('builds a bundle the EXISTING pipeline loaders read unchanged, with inferred clusters', () => {
  const data = tmp('mini-data'), out = tmp('mini-bundle');
  writeFixture(data);
  const rep = buildMiniBundle({ dataDir: data, outDir: out, cadenceS: CAD });
  assert.equal(rep.T, TICKS);
  assert.ok(rep.days > 56, `fixture spans ${rep.days} days — must clear the guard`);
  assert.deepEqual(rep.shards, ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']);
  assert.deepEqual([rep.clusters.c0, rep.clusters.c1, rep.clusters.c2], ['e', 'e', 'e'], 'E cores inferred from DVFS correlation');
  assert.deepEqual([rep.clusters.c3, rep.clusters.c4, rep.clusters.c5], ['p0', 'p0', 'p0']);

  const b = loadScenarioBundle(out);
  assert.equal(b.T, TICKS);
  assert.equal(b.dt_s, CAD);
  assert.deepEqual(b.shardIds, ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']);
  assert.deepEqual(b.counters.map((c) => c.name).sort(), ['core_mhz', 'core_res']);
  const { X, factorSignals, membership } = counterMatrices(b, 'core_res');
  assert.equal(X.length, 6);
  assert.equal(X[0].length, TICKS);
  assert.ok(factorSignals.length >= 7, 'pkg + 6 LOO instances');
  assert.equal(membership[0].length, 2, 'each shard loads package + its LOO instance');
  // LOO, not aggregate: c0's cluster factor must not contain c0's own series (ADR 0016 absorption).
  const c0res = b.series.get('c0\0core_res')!;
  const loo = b.factors['loo_res_c0'].series;
  const c1res = b.series.get('c1\0core_res')!, c2res = b.series.get('c2\0core_res')!;
  assert.ok(Math.abs(loo[7] - (c1res[7] + c2res[7]) / 2) < 1e-9, 'LOO = mean of the OTHER e-cores');
  assert.notEqual(Math.abs(loo[7] - c0res[7]) < 1e-9, true);
});

test('a long gap FAILS by default and forward-fills only under --allow-gaps', () => {
  const data = tmp('mini-gaps');
  writeFixture(data, new Set([200, 201, 202, 203])); // 4 missing hours
  assert.throws(
    () => buildMiniBundle({ dataDir: data, outDir: tmp('mini-gaps-out'), cadenceS: CAD }),
    /gap\(s\) exceed --max-gap/,
  );
  const out = tmp('mini-gaps-out2');
  const rep = buildMiniBundle({ dataDir: data, outDir: out, cadenceS: CAD, allowGaps: true });
  assert.equal(rep.gapTicksFilled, 4);
  assert.equal(rep.largestGapTicks, 4);
  const b = loadScenarioBundle(out);
  const v = b.series.get('c0\0core_res')!;
  assert.ok(Number.isFinite(v[201]), 'gap ticks are forward-filled, not NaN');
  assert.equal(v[201], v[199], 'forward-fill carries the last real value');
});

test('gapRuns: contiguous missing ticks coalesce into runs', () => {
  assert.deepEqual(gapRuns([3, 4, 5, 9]), [{ start: 3, len: 3 }, { start: 9, len: 1 }]);
});

test('journalToFaults: interventions overlapping the window become tick-converted labels', () => {
  const dir = tmp('journal');
  const f = path.join(dir, 'interventions.ndjson');
  fs.writeFileSync(f, [
    JSON.stringify({ t_start: T0 + 100 * CAD, t_end: T0 + 110 * CAD, type: 'cpu-load', affected_shards: ['c0', 'c1'], counter: null }),
    JSON.stringify({ t_start: T0 - 500 * CAD, t_end: T0 - 490 * CAD, type: 'cpu-load', affected_shards: ['c0'], counter: null }), // before window
  ].join('\n') + '\n');
  const faults = journalToFaults(f, T0, CAD, TICKS);
  assert.equal(faults.length, 1, 'out-of-window entries are dropped');
  assert.equal(faults[0].t_onset, 100);
  assert.equal(faults[0].t_offset, 110);
  assert.deepEqual(faults[0].affected_shards, ['c0', 'c1']);
  assert.equal(faults[0].source, 'cpu-load');
});

test('INTEGRATION: mini bundle flows through fitBaseline → applyBaseline → scoreCounterBaseline (62.5d fixture clears the guard)', () => {
  const data = tmp('int-data'), bundleDir = tmp('int-bundle');
  writeFixture(data);
  buildMiniBundle({ dataDir: data, outDir: bundleDir, cadenceS: CAD });
  const b = loadScenarioBundle(bundleDir);
  const fits = fitBaseline(b, 'core_res'); // asserts the ≥56-day baseline — no CS_ALLOW_SHORT needed
  assert.equal(fits.length, 6);
  const R = applyBaseline(b, 'core_res', fits);
  assert.equal(R.length, 6);
  assert.equal(R[0].length, TICKS);
  assert.ok(R.every((r) => r.every(Number.isFinite)), 'residuals are finite');
  const res = scoreCounterBaseline(b, 'core_res', R, 30, { calLen: 30, onsetTarget: 16, evalTarget: 20, mixture: 'SR' });
  assert.equal(res.nFault, 0, 'A/A window: no labeled faults');
  assert.ok(Number.isFinite(res.residMedianLag1));
});
