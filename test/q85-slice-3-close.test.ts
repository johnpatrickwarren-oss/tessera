import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const ROUND_START_SHA = 'f737877';
const REPO_ROOT = path.resolve(__dirname, '..');

const DEMO_HTML_PATH = path.join(REPO_ROOT, 'demos/demo.html');
const DEMO_SCRIPT_PATH = path.join(REPO_ROOT, 'demos/DEMO-SCRIPT.md');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const CROSS_PROJECT_MEMORIAL_PATH = path.join(os.homedir(), '.claude', 'CROSS-PROJECT-MEMORIAL.md');

const HTML = fs.readFileSync(DEMO_HTML_PATH, 'utf8');
const DEMO_SCRIPT = fs.readFileSync(DEMO_SCRIPT_PATH, 'utf8');
const README = fs.readFileSync(README_PATH, 'utf8');

// ── AC-R85-1: #mode-toggle fieldset exists in demo.html ──
test('AC-R85-1: demos/demo.html has #mode-toggle fieldset', () => {
  assert.ok(HTML.includes('id="mode-toggle"'),
    'mode-toggle fieldset must exist with id="mode-toggle"');
  assert.ok(HTML.includes('<legend>Mode</legend>')
    || /<legend[^>]*>Mode<\/legend>/.test(HTML),
    'mode-toggle must carry a legend element with text "Mode"');
});

// ── AC-R85-2: two radio inputs for canned + live ──
test('AC-R85-2: demos/demo.html has two radio inputs (canned + live)', () => {
  assert.ok(/type="radio"[^>]*name="tessera-mode"[^>]*value="canned"/.test(HTML),
    'canned-mode radio input must exist with name="tessera-mode" value="canned"');
  assert.ok(/type="radio"[^>]*name="tessera-mode"[^>]*value="live"/.test(HTML),
    'live-mode radio input must exist with name="tessera-mode" value="live"');
});

// ── AC-R85-3: setMode() function declared with both 'canned' and 'live' literals ──
test('AC-R85-3: demos/demo.html declares setMode(mode) handling both values', () => {
  assert.ok(/function\s+setMode\s*\(/.test(HTML),
    'setMode function declaration must exist');
  assert.ok(HTML.includes("=== 'canned'") || HTML.includes('=== "canned"'),
    'setMode body must include a canned-mode equality comparison');
  assert.ok(HTML.includes("=== 'live'") || HTML.includes('=== "live"'),
    'setMode body must include a live-mode equality comparison');
});

// ── AC-R85-4: mode-radio change listener wired ──
test('AC-R85-4: mode-radio change listener wired to setMode()', () => {
  assert.ok(HTML.includes('tessera-mode'),
    'tessera-mode selector must appear in JS layer to wire the radios');
  assert.ok(/\.addEventListener\s*\(\s*['"]change['"]/.test(HTML),
    'a change-event listener must be wired somewhere (for the mode radios)');
});

// ── AC-R85-5: data-mode attribute set on document.body ──
test('AC-R85-5: setMode applies data-mode attribute to document.body', () => {
  assert.ok(/setAttribute\s*\(\s*['"]data-mode['"]/.test(HTML),
    'setMode must call document.body.setAttribute("data-mode", mode)');
});

// ── AC-R85-6: body[data-mode='live'] CSS rule disables #scenario-selector ──
test('AC-R85-6: CSS has body[data-mode="live"] rule disabling #scenario-selector', () => {
  assert.ok(/body\[data-mode='live'\]\s*#scenario-selector/.test(HTML)
    || /body\[data-mode="live"\]\s*#scenario-selector/.test(HTML),
    'CSS must include body[data-mode="live"] #scenario-selector { ... } rule');
});

// ── AC-R85-7: body[data-mode='canned'] CSS rule grays control-panel inputs ──
test('AC-R85-7: CSS has body[data-mode="canned"] rule for #tessera-control-panel inputs', () => {
  assert.ok(/body\[data-mode='canned'\]\s*#tessera-control-panel/.test(HTML)
    || /body\[data-mode="canned"\]\s*#tessera-control-panel/.test(HTML),
    'CSS must include body[data-mode="canned"] #tessera-control-panel { ... } rule');
});

// ── AC-R85-8: #engine-loading-indicator exists ──
test('AC-R85-8: demos/demo.html has #engine-loading-indicator element', () => {
  assert.ok(HTML.includes('id="engine-loading-indicator"'),
    'engine-loading-indicator div must exist');
  assert.ok(HTML.includes('tessera-spin') || HTML.includes('@keyframes tessera-spin'),
    'tessera-spin @keyframes animation must be declared');
});

// ── AC-R85-9: #engine-run-status exists with aria-live ──
test('AC-R85-9: demos/demo.html has #engine-run-status with aria-live attribute', () => {
  assert.ok(HTML.includes('id="engine-run-status"'),
    'engine-run-status div must exist');
  assert.ok(/id="engine-run-status"[^>]*aria-live/.test(HTML),
    'engine-run-status must include an aria-live attribute');
});

// ── AC-R85-10: updateRunStatus() function declared with all five stages ──
test('AC-R85-10: updateRunStatus(stage,payload) declared; all 5 stages present', () => {
  assert.ok(/function\s+updateRunStatus\s*\(/.test(HTML),
    'updateRunStatus function declaration must exist');
  for (const stage of ['running', 'complete', 'error', 'cancelled', 'reset']) {
    assert.ok(HTML.includes(`'${stage}'`) || HTML.includes(`"${stage}"`),
      `updateRunStatus must handle stage="${stage}"`);
  }
});

// ── AC-R85-11: spinner show/hide helpers + invocation on btnRun click ──
test('AC-R85-11: r85ShowLoadingSpinner + r85HideLoadingSpinner declared and invoked', () => {
  assert.ok(/function\s+r85ShowLoadingSpinner\s*\(/.test(HTML),
    'r85ShowLoadingSpinner helper must be declared');
  assert.ok(/function\s+r85HideLoadingSpinner\s*\(/.test(HTML),
    'r85HideLoadingSpinner helper must be declared');
  assert.ok(/r85ShowLoadingSpinner\s*\(\s*\)/.test(HTML),
    'r85ShowLoadingSpinner must be invoked');
  assert.ok(/r85HideLoadingSpinner\s*\(\s*\)/.test(HTML),
    'r85HideLoadingSpinner must be invoked');
});

// ── AC-R85-18: anti-regression — R71/R79/R80/R81/R82/R83/R84 markers preserved ──
test('AC-R85-18: prior round surface markers preserved in demos/demo.html', () => {
  // R71 scenario data markers
  assert.ok(HTML.includes('<!-- BEGIN-TESSERA-SCENARIO-DATA -->'), 'R71 marker');
  assert.ok(HTML.includes('<!-- END-TESSERA-SCENARIO-DATA -->'), 'R71 marker');
  // R79 surfaces
  assert.ok(HTML.includes('id="live-verdict-banner"'), 'R79: #live-verdict-banner');
  assert.ok(HTML.includes('id="window-scrubber"'), 'R79: #window-scrubber');
  // R80 palette
  assert.ok(HTML.includes('--tessera-fam-a:'), 'R80: family palette CSS');
  // R81 scrubbing transitions
  assert.ok(HTML.includes('body.scrubbing'), 'R81: body.scrubbing rule');
  // R82 smoke block
  assert.ok(HTML.includes('<!-- R82-SMOKE-BLOCK-START -->'), 'R82: smoke-block start');
  assert.ok(HTML.includes('<!-- R82-SMOKE-BLOCK-END -->'), 'R82: smoke-block end');
  assert.ok(HTML.includes('__tessera_r82_smoke__'), 'R82: smoke side-channel');
  // R83 control panel + state-management surface
  assert.ok(HTML.includes('id="tessera-control-panel"'), 'R83: #tessera-control-panel');
  assert.ok(/var\s+controlState\s*=\s*\{/.test(HTML), 'R83: controlState declaration');
  assert.ok(/var\s+R83_DEFAULTS\s*=\s*\{/.test(HTML), 'R83: R83_DEFAULTS declaration');
  assert.ok(/function\s+emitControlChange/.test(HTML), 'R83: emitControlChange');
  assert.ok(HTML.includes("'tessera:control-change'"), 'R83: tessera:control-change event');
  assert.ok(HTML.includes('id="btn-run"'), 'R83: #btn-run');
  assert.ok(HTML.includes('id="btn-reset-params"'), 'R83: #btn-reset-params');
  // R84 surfaces
  assert.ok(HTML.includes('id="btn-cancel"'), 'R84: #btn-cancel');
  assert.ok(HTML.includes('id="engine-error-banner"'), 'R84: #engine-error-banner');
  assert.ok(/function\s+r84ShowError/.test(HTML), 'R84: r84ShowError');
  assert.ok(HTML.includes('worker.onmessage'), 'R84: worker.onmessage');
  assert.ok(/new\s+Worker\s*\(\s*['"]\.\/engine-worker\.js['"]/.test(HTML),
    'R84: new Worker(\'./engine-worker.js\')');
});
