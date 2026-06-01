import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { SCENARIO_NAMES, type ScenarioName } from '../tools/build-canned-demos.js';

const ROOT = path.resolve(__dirname, '..');

function readScenarioJson(name: ScenarioName): any {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'demos', 'scenarios', `${name}.json`), 'utf8'));
}

function readDemoHtml(): string {
  return fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'), 'utf8');
}

// AC-R79-1: live verdict banner element exists with stable IDs
test('AC-R79-1: demos/demo.html contains <section id="live-verdict-banner"> with 3 sub-element IDs', () => {
  const html = readDemoHtml();
  assert.match(html, /<section[^>]*\bid="live-verdict-banner"/);
  assert.match(html, /\bid="live-scenario-name"/);
  assert.match(html, /\bid="live-tick-indicator"/);
  assert.match(html, /\bid="live-verdict-status"/);
});

// AC-R79-2: live banner has updateLiveVerdictBanner function called from render()
test('AC-R79-2: embedded JS defines updateLiveVerdictBanner and calls it from render()', () => {
  const html = readDemoHtml();
  assert.match(html, /function\s+updateLiveVerdictBanner\s*\(/);
  assert.match(html, /function\s+render\s*\(\s*\)[\s\S]*?updateLiveVerdictBanner\s*\(/);
});

// AC-R79-3: front-panel metrics section exists with metrics-body container
test('AC-R79-3: demos/demo.html contains <div id="metrics-panel" class="metrics-panel"> and #metrics-body', () => {
  const html = readDemoHtml();
  assert.match(html, /<div[^>]*\bid="metrics-panel"[^>]*\bclass="[^"]*metrics-panel/);
  assert.match(html, /\bid="metrics-body"/);
});

// AC-R79-4: detectors panel exists with 5 family slots (placeholder discipline)
test('AC-R79-4: detectors panel committed HTML contains 5 family rows (A active; B/C/D/E placeholder)', () => {
  const html = readDemoHtml();
  assert.match(html, /<div[^>]*\bid="detectors-panel"[^>]*\bclass="[^"]*detectors-panel/);
  for (const fam of ['A', 'B', 'C', 'D', 'E']) {
    const re = new RegExp(`<div[^>]*\\bclass="[^"]*det-fam-${fam}[\\s"]`);
    assert.match(html, re, `det-fam-${fam} row not found`);
  }
  for (const fam of ['B', 'C', 'D', 'E']) {
    const re = new RegExp(`<div[^>]*\\bclass="[^"]*det-fam-${fam}[^"]*det-fam-placeholder`);
    assert.match(html, re, `det-fam-${fam} missing det-fam-placeholder class`);
  }
});

// AC-R79-5: provenance panel is a <details> element, collapsed by default
test('AC-R79-5: provenance panel is <details id="provenance-panel"> WITHOUT an `open` attribute', () => {
  const html = readDemoHtml();
  const m = html.match(/<details\b([^>]*)\bid="provenance-panel"([^>]*)>/);
  assert.ok(m, '<details id="provenance-panel"> not found');
  const attrs = (m[1] + m[2]);
  assert.ok(!/\bopen\b/.test(attrs), 'provenance-panel should NOT have `open` attribute (collapsed by default)');
  assert.match(html, /\bid="provenance-body"/);
});

// AC-R79-6: SDC-drift scenario has ≥ 1 provenance receipt; clean-baseline has 0
test('AC-R79-6: provenance_receipts arity is discriminating (sdc-drift ≥ 1; clean-baseline = 0)', () => {
  const sdc = readScenarioJson('sdc-drift');
  const cb  = readScenarioJson('clean-baseline');
  assert.ok(Array.isArray(sdc.provenance_receipts));
  assert.ok(Array.isArray(cb.provenance_receipts));
  assert.ok(sdc.provenance_receipts.length >= 1, 'sdc-drift must have ≥ 1 receipt');
  assert.equal(cb.provenance_receipts.length, 0, 'clean-baseline must have 0 receipts');
  for (const r of sdc.provenance_receipts) {
    assert.equal(typeof r.event_id, 'string');
    assert.equal(typeof r.window, 'number');
    assert.equal(typeof r.shard_id, 'string');
    assert.match(r.family, /^[A-E]$/);
    assert.equal(typeof r.reasoning, 'string');
    assert.ok(r.reasoning.length >= 30);
    assert.equal(typeof r.evidence, 'object');
    assert.ok(r.evidence !== null);
  }
});

// AC-R79-7: every scenario JSON has the 3 new top-level fields with correct types
test('AC-R79-7: every scenario JSON has detector_families, threshold_crossing_log, provenance_receipts', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    assert.ok(Array.isArray(j.detector_families), `${name}: detector_families`);
    assert.ok(Array.isArray(j.threshold_crossing_log), `${name}: threshold_crossing_log`);
    assert.ok(Array.isArray(j.provenance_receipts), `${name}: provenance_receipts`);
    for (const f of j.detector_families) {
      assert.match(f, /^[A-E]$/, `${name}: detector_families entry "${f}"`);
    }
    for (const tc of j.threshold_crossing_log) {
      assert.equal(typeof tc.window, 'number');
      assert.equal(typeof tc.shard_id, 'string');
      assert.match(tc.family, /^[A-E]$/);
      assert.equal(typeof tc.M_t_at_crossing, 'number');
      assert.equal(typeof tc.threshold, 'number');
    }
  }
});

// AC-R79-8 removed: asserted family_b..e are null (R79 single-family snapshot). Superseded by R80
// (five-family visualization), which populates all five families; q80 covers the current shape.

// AC-R79-9: every per_shard has residual_proxy with correct type
test('AC-R79-9: per_shard residual_proxy is number for Family-A scenarios; null otherwise', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    const hasA = (j.detector_families as string[]).includes('A');
    for (const w of j.windows) {
      for (const ps of w.per_shard) {
        assert.ok('residual_proxy' in ps, `${name} w=${w.t} ${ps.shard_id}: residual_proxy missing`);
        if (hasA) {
          assert.equal(typeof ps.residual_proxy, 'number');
          if (typeof ps.M_t === 'number') {
            assert.ok(
              Math.abs(ps.residual_proxy - (ps.M_t - 1)) < 1e-5,
              `${name} w=${w.t} ${ps.shard_id}: residual_proxy ${ps.residual_proxy} != M_t - 1 = ${ps.M_t - 1}`,
            );
          }
        } else {
          assert.equal(ps.residual_proxy, null);
        }
      }
    }
  }
});

// AC-R79-10: R71 backward-compat — all 9 R71 top-level fields preserved verbatim
test('AC-R79-10: R71 backward-compat — all 9 R71 top-level fields preserved verbatim', () => {
  const R71_TOP_LEVEL_FIELDS = [
    'schema_version', 'scenario', 'description', 'params', 'engine_surfaces',
    'windows', 'terminal_state', 'reasoning', 'suggested_actions',
  ];
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    for (const f of R71_TOP_LEVEL_FIELDS) {
      assert.ok(f in j, `${name}: R71 top-level field "${f}" missing`);
    }
    assert.equal(j.schema_version, 'tessera-demo-v1');
  }
});

// AC-R79-11: threshold_crossing_log discriminating asymmetry
test('AC-R79-11: threshold_crossing_log is discriminating (sdc-drift ≥ 1; clean-baseline = 0)', () => {
  const sdc = readScenarioJson('sdc-drift');
  const cb  = readScenarioJson('clean-baseline');
  assert.ok(sdc.threshold_crossing_log.length >= 1, 'sdc-drift must have ≥ 1 threshold crossing');
  assert.equal(cb.threshold_crossing_log.length, 0, 'clean-baseline must have 0 threshold crossings');
  const sdcEntry = sdc.threshold_crossing_log.find((tc: any) => tc.shard_id === 'shard-04' && tc.family === 'A');
  assert.ok(sdcEntry, 'sdc-drift must record a shard-04 Family-A crossing');
  assert.ok(sdcEntry.M_t_at_crossing >= sdcEntry.threshold);
});

