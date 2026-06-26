// test/seasonal-probe.test.ts — smoke test for the seasonal-baseline probe on the committed mini
// bundle (used as its own baseline). The substantive finding (the seasonal model does not whiten a
// near-unit-root I(1) counter; only differencing does) is in decisions/0018 + the tool header; here we
// just guard that the engine seasonal baseline is wired correctly and the probe runs end-to-end.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { probeCounter, renderSeasonalProbe } from '../tools/seasonal-probe.js';

const MINI = path.join(__dirname, '_substrate', 'clustersynth-scenario-mini');

test('probeCounter wires the seasonal baseline and returns finite whiteness metrics', () => {
  const b = loadScenarioBundle(MINI);
  const r = probeCounter(b, b, 'gpu_temp_c');
  for (const k of ['raw', 'seasonal', 'commonMode', 'seasonalPlusCM', 'differencedPlusCM', 'diffLag1'] as const) {
    assert.ok(Number.isFinite(r[k]), `${k} should be finite; got ${r[k]}`);
  }
  assert.equal(typeof r.integrated, 'boolean');
});

test('renderSeasonalProbe produces a report without throwing', () => {
  const out = renderSeasonalProbe(MINI, MINI);
  assert.match(out, /SEASONAL-BASELINE PROBE/);
  assert.match(out, /Δlag1/);
});
