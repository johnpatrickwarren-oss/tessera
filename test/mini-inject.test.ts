// test/mini-inject.test.ts — data-level injection into a built mini bundle. The invariants:
// injections are MAD-scaled with ground-truth labels; untouched rows pass through byte-identical;
// a spec matching no (shard, counter) row THROWS (a silently-missed injection would corrupt the
// power curve's denominator).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectBundle, applyInjection, type InjectionSpec } from '../tools/mini-inject.js';
import { buildMiniBundle } from '../tools/mini-bundle.js';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { CAD, TICKS, writeFixture, tmp } from './_mini-fixture.js';

test('MAD-scaled step with ground-truth label; untouched rows byte-identical; bad target throws', () => {
  const data = tmp('inj-data'), bundle = tmp('inj-bundle'), out = tmp('inj-out');
  writeFixture(data);
  buildMiniBundle({ dataDir: data, outDir: bundle, cadenceS: CAD });
  const spec: InjectionSpec[] = [{ shard: 'c3', counter: 'core_res', kind: 'step', onsetFrac: 0.5, magnitudeMad: 6 }];
  const r = injectBundle(bundle, out, spec);
  assert.equal(r.injected, 1);

  const before = loadScenarioBundle(bundle), after = loadScenarioBundle(out);
  const mean = (xs: number[]): number => xs.reduce((s, v) => s + v, 0) / xs.length;
  const v0 = before.series.get('c3\0core_res')!, v1 = after.series.get('c3\0core_res')!;
  const half = Math.floor(TICKS / 2);
  const lift = mean(v1.slice(half)) - mean(v0.slice(half));
  assert.ok(lift > 0, 'post-onset series is lifted');
  assert.ok(Math.abs(mean(v1.slice(0, half)) - mean(v0.slice(0, half))) < 1e-9, 'pre-onset untouched');
  assert.deepEqual(after.series.get('c0\0core_res'), before.series.get('c0\0core_res'), 'non-target series identical');
  assert.equal(after.faults.length, 1);
  assert.equal(after.faults[0].t_onset, half);
  assert.deepEqual(after.faults[0].affected_shards, ['c3']);

  assert.throws(() => injectBundle(bundle, tmp('inj-bad'), [{ shard: 'c99', counter: 'core_res', kind: 'step', onsetFrac: 0.5, magnitudeMad: 2 }]), /matched no/);
});

test('applyInjection: ramp reaches its terminal magnitude at offset', () => {
  const v = new Array(100).fill(10);
  const label = applyInjection(v, { shard: 's', counter: 'c', kind: 'ramp', onsetFrac: 0.5, magnitudeMad: 4 });
  assert.equal(label.type, 'drift');
  assert.equal(v[49], 10, 'pre-onset untouched');
  assert.ok(v[99] > v[55], 'ramp grows');
});
