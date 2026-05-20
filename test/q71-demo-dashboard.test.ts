import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildAllCannedDemos, SCENARIO_NAMES, type ScenarioName,
} from '../tools/build-canned-demos.js';

// ── Helper: read scenario JSON ──
const ROOT = path.resolve(__dirname, '..');
function readScenarioJson(name: ScenarioName): any {
  const p = path.join(ROOT, 'demos', 'scenarios', `${name}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function readDemoHtml(): string {
  return fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'), 'utf8');
}

// AC-R71-1: build tool exports
test('AC-R71-1: tools/build-canned-demos.ts exports buildAllCannedDemos + SCENARIO_NAMES', () => {
  assert.equal(typeof buildAllCannedDemos, 'function');
  assert.ok(Array.isArray(SCENARIO_NAMES));
  assert.equal(SCENARIO_NAMES.length, 8);
});

// AC-R71-2: each scenario JSON exists + has required structural fields
test('AC-R71-2: each demos/scenarios/<name>.json exists with required fields', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    assert.equal(j.schema_version, 'tessera-demo-v1');
    assert.equal(j.scenario, name);
    assert.equal(typeof j.description, 'string');
    assert.ok(j.description.length >= 20);
    assert.ok(Array.isArray(j.engine_surfaces));
    assert.ok(j.engine_surfaces.length >= 1);
    assert.ok(Array.isArray(j.windows));
    assert.ok(j.windows.length >= 1);
    for (const w of j.windows) {
      assert.equal(typeof w.t, 'number');
      assert.ok(Array.isArray(w.per_shard));
      for (const ps of w.per_shard) {
        assert.equal(typeof ps.shard_id, 'string');
        // M_t can be null for scenarios that don't compute Family-A wealth
        assert.ok(ps.M_t === null || typeof ps.M_t === 'number');
        assert.equal(typeof ps.fired, 'boolean');
      }
      assert.ok(Array.isArray(w.events));
    }
    const ts = j.terminal_state;
    assert.ok(Array.isArray(ts.firing_shards));
    assert.ok(Array.isArray(ts.common_mode_candidates));
    assert.equal(typeof ts.freeze_active, 'boolean');
    assert.equal(typeof j.reasoning, 'string');
    assert.ok(j.reasoning.length >= 20);
    assert.ok(Array.isArray(j.suggested_actions));
  }
});

// AC-R71-3: deterministic regeneration — running buildAllCannedDemos twice produces byte-identical files
test('AC-R71-3: buildAllCannedDemos is idempotent (byte-identical re-run)', () => {
  // Capture pre-run bytes (committed artifacts).
  const pre = SCENARIO_NAMES.map((n) => fs.readFileSync(path.join(ROOT, 'demos', 'scenarios', `${n}.json`)));
  const preHtml = fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'));
  buildAllCannedDemos();
  for (let i = 0; i < SCENARIO_NAMES.length; i++) {
    const post = fs.readFileSync(path.join(ROOT, 'demos', 'scenarios', `${SCENARIO_NAMES[i]}.json`));
    assert.deepEqual(post, pre[i], `${SCENARIO_NAMES[i]}.json changed on re-run`);
  }
  const postHtml = fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'));
  assert.deepEqual(postHtml, preHtml, 'demos/demo.html changed on re-run');
});

// AC-R71-4: clean-baseline terminal_state.firing_shards is empty
test('AC-R71-4: clean-baseline scenario has terminal_state.firing_shards == []', () => {
  const j = readScenarioJson('clean-baseline');
  assert.deepEqual(j.terminal_state.firing_shards, []);
});

// AC-R71-5: sdc-drift terminal_state.firing_shards contains exactly shard-04
test('AC-R71-5: sdc-drift scenario terminal_state.firing_shards is exactly ["shard-04"]', () => {
  const j = readScenarioJson('sdc-drift');
  assert.deepEqual(j.terminal_state.firing_shards, ['shard-04']);
});

// AC-R71-6: common-mode-rack surfaces at least one rack-A candidate
test('AC-R71-6: common-mode-rack scenario surfaces candidate with shared_node_id="rack-A", member_count=3', () => {
  const j = readScenarioJson('common-mode-rack');
  const cands = j.terminal_state.common_mode_candidates;
  assert.ok(cands.length >= 1);
  const rackA = cands.find((c: any) => c.shared_node_id === 'rack-A');
  assert.ok(rackA, 'rack-A candidate not found');
  assert.equal(rackA.shared_node_kind, 'rack');
  assert.equal(rackA.member_count, 3);
  assert.deepEqual([...rackA.member_shard_ids].sort(), ['shard-00', 'shard-01', 'shard-02']);
});

// AC-R71-7: event-conditional terminal_state.freeze_active === true
test('AC-R71-7: event-conditional scenario terminal_state.freeze_active === true', () => {
  const j = readScenarioJson('event-conditional');
  assert.equal(j.terminal_state.freeze_active, true);
});

// AC-R71-8: fdr-multiple-testing surfaces a non-trivial FDR selection
test('AC-R71-8: fdr-multiple-testing scenario terminal_state.fdr_K is integer ≥ 1 AND ≤ 5', () => {
  const j = readScenarioJson('fdr-multiple-testing');
  const ts = j.terminal_state;
  assert.equal(typeof ts.fdr_K, 'number');
  assert.ok(Number.isInteger(ts.fdr_K));
  assert.ok(ts.fdr_K >= 1, `fdr_K = ${ts.fdr_K}; expected ≥ 1`);
  assert.ok(ts.fdr_K <= 5, `fdr_K = ${ts.fdr_K}; expected ≤ 5`);
  assert.equal(ts.fdr_qLevel, 0.10);
  assert.ok(Array.isArray(ts.fdr_selected_indices));
  assert.equal(ts.fdr_selected_indices.length, ts.fdr_K);
});

// AC-R71-9: hierarchical-evalue terminal_state.fleet_fired === true AND tick_at_first_fire is non-null
test('AC-R71-9: hierarchical-evalue scenario fleet wealth crosses threshold (fleet_fired === true)', () => {
  const j = readScenarioJson('hierarchical-evalue');
  const ts = j.terminal_state;
  assert.equal(ts.fleet_fired, true);
  assert.equal(typeof ts.fleet_tick_at_first_fire, 'number');
  assert.ok(Number.isInteger(ts.fleet_tick_at_first_fire));
});

// AC-R71-10: sparse-data-resilience terminal_state.common_mode_candidates is empty (graceful degradation)
test('AC-R71-10: sparse-data-resilience scenario surfaces 0 candidates without throwing', () => {
  const j = readScenarioJson('sparse-data-resilience');
  assert.deepEqual(j.terminal_state.common_mode_candidates, []);
});

// AC-R71-11: topology-spanning-common-mode surfaces a cooling_zone candidate with ≥4 members
test('AC-R71-11: topology-spanning-common-mode scenario surfaces cooling_zone candidate with member_count ≥ 4', () => {
  const j = readScenarioJson('topology-spanning-common-mode');
  const cands = j.terminal_state.common_mode_candidates;
  const cz = cands.find((c: any) => c.shared_node_kind === 'cooling_zone');
  assert.ok(cz, 'cooling_zone candidate not found');
  assert.ok(cz.member_count >= 4, `member_count = ${cz.member_count}; expected ≥ 4`);
});

// AC-R71-12: demos/demo.html has structural elements
test('AC-R71-12: demos/demo.html has required structural elements', () => {
  const html = readDemoHtml();
  assert.match(html, /<select id="scenario-selector">/);
  assert.match(html, /<button id="btn-play">/);
  assert.match(html, /<button id="btn-pause">/);
  assert.match(html, /<button id="btn-reset">/);
  assert.match(html, /<select id="speed-selector">/);
  assert.match(html, /<svg id="mt-chart"/);
  assert.match(html, /<section id="audit-panel">/);
  assert.match(html, /<section id="reasoning-panel">/);
  assert.match(html, /<section id="next-actions-panel">/);
  for (const name of SCENARIO_NAMES) {
    const tag = new RegExp(`<script type="application/json" id="tessera-scenario-${name}">`);
    assert.match(html, tag, `inlined scenario block for ${name} not found`);
  }
});

// AC-R71-13: demo.html embedded JSON round-trips per scenario
test('AC-R71-13: demo.html inlined JSON ≡ demos/scenarios/<name>.json (round-trip equality)', () => {
  const html = readDemoHtml();
  for (const name of SCENARIO_NAMES) {
    const re = new RegExp(
      `<script type="application/json" id="tessera-scenario-${name}">([\\s\\S]*?)</script>`,
    );
    const m = html.match(re);
    assert.ok(m, `inlined scenario block for ${name} not extractable`);
    const inlined = JSON.parse(m![1]);
    const onDisk = readScenarioJson(name);
    assert.deepEqual(inlined, onDisk, `inlined scenario for ${name} drifted from on-disk JSON`);
  }
});

// AC-R71-14: anti-regression — tools/demo-scenario.ts still exports runScenario + SCENARIO_NAMES
test('AC-R71-14: R70 CLI surface preserved (anti-regression)', async () => {
  const r70 = await import('../tools/demo-scenario.js');
  assert.equal(typeof r70.runScenario, 'function');
  assert.ok(Array.isArray(r70.SCENARIO_NAMES));
  assert.equal(r70.SCENARIO_NAMES.length, 4);
  const result = r70.runScenario('clean-baseline');
  assert.equal(result.exit_code, 0);
  assert.match(result.output, /Tessera demo · clean-baseline/);
});
