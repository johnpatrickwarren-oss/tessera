import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROUND_START_SHA = '4c4733d';
const REPO_ROOT = path.resolve(__dirname, '..');

const DEMO_HTML_PATH = path.join(REPO_ROOT, 'demos/demo.html');
const HTML = fs.readFileSync(DEMO_HTML_PATH, 'utf8');

// ── AC-R83-1: control panel section exists ──
test('AC-R83-1: <section id="tessera-control-panel"> exists in demos/demo.html', () => {
  assert.match(HTML, /<section id="tessera-control-panel"/,
    'demos/demo.html must contain <section id="tessera-control-panel">');
});

// ── AC-R83-2: scenario-selector extended with "custom" option (R71 preserved) ──
test('AC-R83-2: #scenario-selector has <option value="custom">', () => {
  const scenarioBlock = HTML.match(/<select id="scenario-selector">([\s\S]*?)<\/select>/);
  assert.ok(scenarioBlock, '#scenario-selector must exist (R71 preserved)');
  assert.match(scenarioBlock![1], /<option value="custom">/,
    '#scenario-selector must contain <option value="custom"> appended for R83');
  // R71 preservation: the original 8 scenarios still present
  for (const r71name of [
    'clean-baseline', 'sdc-drift', 'common-mode-rack', 'event-conditional',
    'fdr-multiple-testing', 'hierarchical-evalue', 'sparse-data-resilience',
    'topology-spanning-common-mode',
  ]) {
    assert.match(scenarioBlock![1], new RegExp(`<option value="${r71name}">`),
      `R71 preservation: <option value="${r71name}"> must remain in #scenario-selector`);
  }
});

// ── AC-R83-3: drift magnitude slider with prescribed attributes ──
test('AC-R83-3: <input id="param-drift-magnitude"> has min=0.05 max=0.40 step=0.025', () => {
  assert.match(HTML,
    /<input[^>]*id="param-drift-magnitude"[^>]*min="0\.05"[^>]*max="0\.40"[^>]*step="0\.025"/,
    'param-drift-magnitude must be a range input with min=0.05 max=0.40 step=0.025');
});

// ── AC-R83-4: window count slider with prescribed attributes ──
test('AC-R83-4: <input id="param-window-count"> has min=30 max=200 default value=50', () => {
  assert.match(HTML,
    /<input[^>]*id="param-window-count"[^>]*min="30"[^>]*max="200"[^>]*value="50"/,
    'param-window-count must be a range input with min=30 max=200 default value=50');
});

// ── AC-R83-5: alpha threshold select with exactly 3 prescribed options ──
test('AC-R83-5: #param-alpha-threshold has options 0.001 / 0.005 / 0.01', () => {
  const sel = HTML.match(/<select id="param-alpha-threshold">([\s\S]*?)<\/select>/);
  assert.ok(sel, '#param-alpha-threshold must exist');
  for (const val of ['0.001', '0.005', '0.01']) {
    assert.match(sel![1], new RegExp(`<option value="${val.replace('.', '\\.')}"`),
      `#param-alpha-threshold must contain <option value="${val}">`);
  }
});

// ── AC-R83-6: target shard selector with at least 6 shard options ──
test('AC-R83-6: #param-target-shard has >= 6 shard-NN options', () => {
  const sel = HTML.match(/<select id="param-target-shard">([\s\S]*?)<\/select>/);
  assert.ok(sel, '#param-target-shard must exist');
  const shardOpts = sel![1].match(/<option value="shard-\d{2}"/g) || [];
  assert.ok(shardOpts.length >= 6,
    `#param-target-shard must have at least 6 shard-NN options; found ${shardOpts.length}`);
});

// ── AC-R83-7: topology size selector with small/medium/large options + member-counts in labels ──
test('AC-R83-7: #param-topology-size has small/medium/large with member-count labels', () => {
  const sel = HTML.match(/<select id="param-topology-size">([\s\S]*?)<\/select>/);
  assert.ok(sel, '#param-topology-size must exist');
  assert.match(sel![1], /<option value="small"[^>]*>[^<]*6[^<]*<\/option>/,
    '#param-topology-size must have small option with 6 in label');
  assert.match(sel![1], /<option value="medium"[^>]*>[^<]*10[^<]*<\/option>/,
    '#param-topology-size must have medium option with 10 in label');
  assert.match(sel![1], /<option value="large"[^>]*>[^<]*25[^<]*<\/option>/,
    '#param-topology-size must have large option with 25 in label');
});

// ── AC-R83-8: five family-checkbox toggles (a..e) ──
test('AC-R83-8: 5 family checkboxes (param-family-a..e) exist as checked-by-default', () => {
  for (const key of ['a', 'b', 'c', 'd', 'e']) {
    assert.match(HTML,
      new RegExp(`<input[^>]*type="checkbox"[^>]*id="param-family-${key}"[^>]*checked`),
      `param-family-${key} must be a checkbox with checked default`);
  }
});

// ── AC-R83-9: Run + Reset-params buttons with distinct IDs from #btn-play / #btn-reset ──
test('AC-R83-9: #btn-run + #btn-reset-params exist; distinct from #btn-play + #btn-reset', () => {
  assert.match(HTML, /<button[^>]*id="btn-run"/, '#btn-run must exist');
  assert.match(HTML, /<button[^>]*id="btn-reset-params"/, '#btn-reset-params must exist');
  // Anti-regression: existing R71 buttons still present
  assert.match(HTML, /<button[^>]*id="btn-play"/, '#btn-play (R71) must remain');
  assert.match(HTML, /<button[^>]*id="btn-reset"/, '#btn-reset (R71 playback reset) must remain');
});

// ── AC-R83-10: controlState global declaration in script source ──
test('AC-R83-10: var controlState = { ... } declared in IIFE source', () => {
  assert.match(HTML, /var\s+controlState\s*=\s*\{/,
    'IIFE must declare var controlState = { ... }');
  assert.match(HTML, /var\s+R83_DEFAULTS\s*=\s*\{/,
    'IIFE must declare var R83_DEFAULTS = { ... } for reset semantics');
});

// ── AC-R83-11: emitControlChange dispatches CustomEvent('tessera:control-change') on document ──
test('AC-R83-11: emitControlChange dispatches CustomEvent("tessera:control-change") on document', () => {
  assert.match(HTML, /function\s+emitControlChange\s*\(\s*\)/,
    'IIFE must declare function emitControlChange()');
  assert.match(HTML,
    /document\.dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"]tessera:control-change['"]/,
    'emitControlChange must dispatch CustomEvent("tessera:control-change") on document');
});

// AC-R83-12 removed: an explicit R83 placeholder asserting btnRun's handler only console.logs
// controlState and does NOT yet wire the engine. R84 (live-engine-compute) deliberately replaced the
// handler body to invoke the engine, so this transitional snapshot is obsolete; q84 covers the handler.

// ── AC-R83-13: Reset-params handler restores R83_DEFAULTS + dispatches change event ──
test('AC-R83-13: btnResetParams click handler restores R83_DEFAULTS + emits change', () => {
  const resetRegion = HTML.match(
    /btnResetParams\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/);
  assert.ok(resetRegion, 'btnResetParams.addEventListener("click", ...) must be present');
  // Discriminating: handler restores at least driftMagnitude + windowCount from R83_DEFAULTS
  assert.match(resetRegion![0], /controlState\.driftMagnitude\s*=\s*R83_DEFAULTS\.driftMagnitude/,
    'reset handler must restore controlState.driftMagnitude from R83_DEFAULTS');
  assert.match(resetRegion![0], /controlState\.windowCount\s*=\s*R83_DEFAULTS\.windowCount/,
    'reset handler must restore controlState.windowCount from R83_DEFAULTS');
  assert.match(resetRegion![0], /emitControlChange\s*\(\s*\)/,
    'reset handler must call emitControlChange() at the end');
});

// ── AC-R83-14: anti-regression — prior round surface markers preserved ──
test('AC-R83-14: R71/R79/R80/R81/R82 surface markers preserved in demos/demo.html', () => {
  // R71: original scenario data block markers
  assert.match(HTML, /<!-- BEGIN-TESSERA-SCENARIO-DATA -->/,
    'R71: BEGIN-TESSERA-SCENARIO-DATA marker must remain');
  assert.match(HTML, /<!-- END-TESSERA-SCENARIO-DATA -->/,
    'R71: END-TESSERA-SCENARIO-DATA marker must remain');
  // R79: live verdict banner + window-scrubber + metrics/detectors front-panel
  assert.match(HTML, /id="live-verdict-banner"/,
    'R79: #live-verdict-banner must remain');
  assert.match(HTML, /id="window-scrubber"/,
    'R79: #window-scrubber must remain');
  // R80: family palette CSS variables
  assert.match(HTML, /--tessera-fam-a:/,
    'R80: --tessera-fam-a CSS variable must remain');
  // R81: body.scrubbing transitions
  assert.match(HTML, /body\.scrubbing/,
    'R81: body.scrubbing transition rule must remain');
  // R82: smoke block markers (preserved by tool's smoke-block mechanism)
  assert.match(HTML, /<!-- R82-SMOKE-BLOCK-START -->/,
    'R82: R82-SMOKE-BLOCK-START marker must remain (preserved by tool)');
  assert.match(HTML, /<!-- R82-SMOKE-BLOCK-END -->/,
    'R82: R82-SMOKE-BLOCK-END marker must remain (preserved by tool)');
  assert.match(HTML, /__tessera_r82_smoke__/,
    'R82: __tessera_r82_smoke__ side-channel must remain');
});
