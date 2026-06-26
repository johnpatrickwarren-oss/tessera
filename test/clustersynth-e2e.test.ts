// test/clustersynth-e2e.test.ts — the END-TO-END pipeline on the committed
// clustersynth s0 topology (72 shards). This is the first in-CI coverage that
// drives the assembled pipeline (topology → measured common-mode → residuals →
// detectors → e-BH / localize) on a real topology, not isolated pieces.
//
// Headline: the INSTRUMENTED (measured-factor) common-mode controls the empirical
// fleet-FDP with full power; the localisation path ranks the injected victims far
// above healthy shards. s0 is committed, so this runs on every CI push.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fixturePath, loadTopology, runInstrumented, runLocalize } from '../tools/clustersynth-e2e';
import { generateTelemetry } from '../tools/clustersynth-telemetry';

const skip = !existsSync(fixturePath('s0')) && 's0 fixture missing';
const Q = 0.05;

test('e2e s0 — instrumented common-mode controls fleet-FDP with full power', { skip }, () => {
  const topo = loadTopology('s0');
  const tel = generateTelemetry(topo, { faultFrac: 0.1, seed: 7 });
  const r = runInstrumented(topo, tel, Q);
  // Measured factors are fault-immune → healthy residuals null → e-BH controls FDP.
  assert.ok(r.fdp <= Q + 0.02, `instrumented FDP ${r.fdp.toFixed(3)} > q=${Q} (+margin)`);
  assert.ok(r.power >= 0.9, `instrumented power ${r.power.toFixed(2)} < 0.9`);
});

test('e2e s0 — localisation ranks injected victims far above healthy shards', { skip }, () => {
  const topo = loadTopology('s0');
  const tel = generateTelemetry(topo, { faultFrac: 0.1, seed: 7 });
  const l = runLocalize(topo, tel, Q);
  // perShardEValue is the trustworthy output: victims enriched ≫ healthy.
  assert.ok(l.enrichment > 10, `victim enrichment ${l.enrichment} not ≫ healthy`);
  // The top-nFail ranked shards should be mostly true victims.
  assert.ok(l.topPrecision >= 0.7, `top-nFail precision ${l.topPrecision.toFixed(2)} < 0.7`);
});

test('e2e s0 — raw counters do NOT separate the fault (common-mode masks it without removal)', { skip }, () => {
  // Sanity that the pipeline is doing work: on the RAW counter (no common-mode
  // removal) a UI e-value on the worst healthy shard is comparable to a victim —
  // i.e. the large shared common-mode genuinely masks the fault pre-removal.
  const topo = loadTopology('s0');
  const tel = generateTelemetry(topo, { faultFrac: 0.1, seed: 7 });
  // Compare the spread of raw test-window vs cal-window means: dominated by common-mode,
  // so a failed shard's raw shift is NOT cleanly larger than a healthy shard's.
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const shift = (i: number) => mean(tel.X[i].slice(tel.calLen)) - mean(tel.X[i].slice(0, tel.calLen));
  const failed = tel.failed.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const healthy = tel.failed.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  const worstHealthyShift = Math.max(...healthy.map((i) => Math.abs(shift(i))));
  const medianFailedShift = failed.map(shift).sort((a, b) => a - b)[Math.floor(failed.length / 2)];
  assert.ok(worstHealthyShift > Math.abs(medianFailedShift) * 0.5,
    'raw common-mode should be large enough to mask the fault before removal');
});
