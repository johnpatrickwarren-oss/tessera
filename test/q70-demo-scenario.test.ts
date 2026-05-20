// test/q70-demo-scenario.test.ts — R70 narrative demo scenario runner tests.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  runScenario,
  listScenarios,
  SCENARIO_NAMES,
  type ScenarioName,
  type ScenarioResult,
} from '../tools/demo-scenario';

describe('R70 demo scenario runner', () => {

  test('AC-R70-1: clean-baseline output contains expected literal markers', () => {
    const r = runScenario('clean-baseline');
    assert.strictEqual(r.scenario, 'clean-baseline');
    assert.match(r.output, /Tessera demo · clean-baseline/);
    assert.match(r.output, /Demo complete\./);
    assert.match(r.output, /Family A betting e-process/);
    assert.match(r.output, /no firings/);
    assert.strictEqual(r.firing_shards.length, 0);
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-2: sdc-drift output contains shard-04 + FIRE + threshold crossing', () => {
    const r = runScenario('sdc-drift');
    assert.match(r.output, /Tessera demo · sdc-drift/);
    assert.match(r.output, /shard-04/);
    assert.match(r.output, /FIRE/);
    assert.match(r.output, /Threshold crossed at window/);
    assert.ok(r.firing_shards.includes('shard-04'), 'shard-04 must be in firing_shards');
    // Anti-self-confirmation: at least one shard fires AND the target shard fires.
    assert.ok(r.firing_shards.length >= 1, 'at least one shard must fire');
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-3: common-mode-rack surfaces exactly 1 candidate on rack-A with 3 members', () => {
    const r = runScenario('common-mode-rack');
    assert.match(r.output, /Tessera demo · common-mode-rack/);
    assert.match(r.output, /rack rack-A/);
    assert.match(r.output, /common-mode attribution surfaced 1 candidate/i);
    assert.match(r.output, /shard-00.*shard-01.*shard-02/);
    assert.strictEqual(r.common_mode_candidates, 1);
    assert.deepStrictEqual(
      r.firing_shards.slice().sort(),
      ['shard-00', 'shard-01', 'shard-02'],
    );
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-4: event-conditional shows freeze active + residual not absorbed', () => {
    const r = runScenario('event-conditional');
    assert.match(r.output, /Tessera demo · event-conditional/);
    assert.match(r.output, /event_class: firmware_push/);
    assert.match(r.output, /Freeze active: yes/);
    assert.match(r.output, /Sample absorbed into residual: no/);
    assert.strictEqual(r.freeze_active, true);
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-5: clean-baseline determinism — two runs produce byte-identical output', () => {
    const a = runScenario('clean-baseline');
    const b = runScenario('clean-baseline');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-6: sdc-drift determinism — two runs produce byte-identical output', () => {
    const a = runScenario('sdc-drift');
    const b = runScenario('sdc-drift');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-7: common-mode-rack determinism — two runs produce byte-identical output', () => {
    const a = runScenario('common-mode-rack');
    const b = runScenario('common-mode-rack');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-8: event-conditional determinism — two runs produce byte-identical output', () => {
    const a = runScenario('event-conditional');
    const b = runScenario('event-conditional');
    assert.strictEqual(a.output, b.output);
    assert.strictEqual(a.freeze_active, b.freeze_active);
  });

  test('AC-R70-9: unknown scenario throws (exhaustiveness)', () => {
    assert.throws(() => runScenario('not-a-scenario' as ScenarioName));
  });

  test('AC-R70-10: listScenarios returns the canonical 4 names in order', () => {
    const names = listScenarios();
    assert.deepStrictEqual(names, [
      'clean-baseline',
      'sdc-drift',
      'common-mode-rack',
      'event-conditional',
    ]);
    assert.deepStrictEqual(SCENARIO_NAMES, names);
  });

  test('AC-R70-11: every scenario produces non-empty output AND exit_code === 0 AND its output ends with the canonical footer', () => {
    for (const name of SCENARIO_NAMES) {
      const r: ScenarioResult = runScenario(name);
      assert.ok(r.output.length > 0, `${name}: output non-empty`);
      assert.strictEqual(r.exit_code, 0, `${name}: exit_code === 0`);
      assert.ok(r.output.endsWith('Demo complete. (exit 0)\n'), `${name}: output ends with canonical footer`);
    }
  });

});
