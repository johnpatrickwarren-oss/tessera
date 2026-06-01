import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

const ROUND_START_SHA = '0e93c15';
const REPO_ROOT = path.resolve(__dirname, '..');

const WORKER_PATH = path.join(REPO_ROOT, 'demos/engine-worker.js');
const BUNDLE_PATH = path.join(REPO_ROOT, 'demos/engine-bundle.mjs');
const DEMO_HTML_PATH = path.join(REPO_ROOT, 'demos/demo.html');
const WORKER_SRC = fs.readFileSync(WORKER_PATH, 'utf8');
const HTML = fs.readFileSync(DEMO_HTML_PATH, 'utf8');

// ── AC-R84-1: engine-worker.js file exists and is non-empty ──
test('AC-R84-1: demos/engine-worker.js exists and is non-empty', () => {
  assert.ok(fs.existsSync(WORKER_PATH), 'demos/engine-worker.js must exist');
  assert.ok(WORKER_SRC.length > 200,
    'demos/engine-worker.js must be substantive (>200 bytes)');
});

// ── AC-R84-2: worker detects Node vs Browser runtime ──
test('AC-R84-2: worker file performs runtime detection (process.versions.node)', () => {
  assert.match(WORKER_SRC, /process\.versions\.node/,
    'worker must detect Node runtime via process.versions.node');
  assert.match(WORKER_SRC, /self\.postMessage/,
    'worker must use self.postMessage in browser branch');
});

// ── AC-R84-3: worker dynamically imports engine-bundle.mjs ──
test('AC-R84-3: worker uses dynamic import() of engine-bundle.mjs', () => {
  assert.match(WORKER_SRC, /import\(/,
    'worker must use dynamic import() (no top-level import allowed for classic Worker compat)');
  assert.match(WORKER_SRC, /engine-bundle\.mjs/,
    'worker must reference engine-bundle.mjs');
  // No top-level static imports (would break classic-Worker / CJS-Node compat).
  assert.ok(!/^\s*import\s+[\w{*]/m.test(WORKER_SRC),
    'worker must NOT use top-level static import statements');
});

// ── AC-R84-4: worker receives 'run' messages via port.on('message', ...) ──
test('AC-R84-4: worker registers a message handler for type:"run"', () => {
  assert.match(WORKER_SRC, /msg\.type\s*!==\s*['"]run['"]/,
    'worker must filter inbound messages for type === "run"');
});

// ── AC-R84-5: worker posts 'window' messages with prescribed shape ──
test('AC-R84-5: worker emits {type:"window",windowIdx,perShard} per window', () => {
  assert.match(WORKER_SRC, /type:\s*['"]window['"]/,
    'worker must post messages with type:"window"');
  assert.match(WORKER_SRC, /windowIdx:/,
    'window message must include windowIdx field');
  assert.match(WORKER_SRC, /perShard:/,
    'window message must include perShard field');
});

// ── AC-R84-6: worker posts 'terminal' with FDR fields after all windows ──
test('AC-R84-6: worker emits {type:"terminal",fdr_K,fdr_qLevel,fdr_selected_indices,candidates}', () => {
  assert.match(WORKER_SRC, /type:\s*['"]terminal['"]/,
    'worker must post a terminal message with type:"terminal"');
  for (const field of ['fdr_K', 'fdr_qLevel', 'fdr_selected_indices', 'candidates']) {
    assert.match(WORKER_SRC, new RegExp(`${field}:`),
      `terminal message must include ${field} field`);
  }
});

// ── AC-R84-7: worker emits 'error' on engine load / handler failure ──
test('AC-R84-7: worker emits {type:"error",error:...} on internal errors', () => {
  assert.match(WORKER_SRC, /type:\s*['"]error['"]/,
    'worker must post an error message with type:"error"');
  assert.match(WORKER_SRC, /\.catch\s*\(/,
    'worker must catch dynamic-import / handler errors');
});

// ── AC-R84-8: demo.html spawns Worker on btnRun click ──
test('AC-R84-8: demo.html spawns new Worker("./engine-worker.js") on btnRun click', () => {
  const runRegion = HTML.match(
    /btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/);
  assert.ok(runRegion, 'btnRun click handler must be present');
  assert.match(runRegion![0], /new\s+Worker\s*\(\s*['"]\.\/engine-worker\.js['"]/,
    'btnRun click handler must spawn new Worker("./engine-worker.js")');
});

// ── AC-R84-9: demo.html postMessages a {type:"run",controlState} payload ──
test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  const runRegion = HTML.match(
    /btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/);
  assert.ok(runRegion, 'btnRun click handler must be present');
  // Option A (ESCALATE resolution): drop handler-region scoping for postMessage assertion —
  // handler body exceeds 3000-char regex window; assert on full HTML instead.
  assert.match(HTML,
    /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/,
    'btnRun handler must postMessage({type:"run", controlState: ...})');
});

// ── AC-R84-10: demo.html handles 'window' messages by populating scenarios.custom + rendering ──
test('AC-R84-10: worker.onmessage handler appends to scenarios.custom.windows and renders', () => {
  assert.match(HTML, /worker\.onmessage/,
    'demo.html must set worker.onmessage to handle streaming messages');
  // Discriminating: handler region must include both 'window' branch population
  // AND a render call (drawFrame is the canonical R71 renderer entry-point).
  const onmsgRegion = HTML.match(/worker\.onmessage\s*=\s*function[\s\S]{0,3000}?\}\s*;/);
  assert.ok(onmsgRegion, 'worker.onmessage handler must be present');
  assert.match(onmsgRegion![0], /scenarios\[['"]custom['"]\]\.windows\.push/,
    'window-message branch must append to scenarios.custom.windows');
  assert.match(onmsgRegion![0], /drawFrame/,
    'window-message branch must call drawFrame to render');
});

// ── AC-R84-11: Cancel button calls worker.terminate() ──
test('AC-R84-11: #btn-cancel exists; click handler calls worker.terminate()', () => {
  assert.match(HTML, /<button[^>]*id="btn-cancel"/,
    '#btn-cancel button must exist in demos/demo.html');
  const cancelRegion = HTML.match(
    /btnCancel\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,1000}?\}\s*\)\s*;/);
  assert.ok(cancelRegion, 'btnCancel click handler must be present');
  assert.match(cancelRegion![0], /\.terminate\s*\(\s*\)/,
    'btnCancel handler must call worker.terminate()');
});

// ── AC-R84-12: #engine-error-banner exists; main thread shows it on worker error ──
test('AC-R84-12: #engine-error-banner exists; r84ShowError helper sets text + removes hidden', () => {
  assert.match(HTML, /id="engine-error-banner"/,
    '#engine-error-banner div must exist');
  assert.match(HTML, /function\s+r84ShowError/,
    'r84ShowError helper must be declared');
  assert.match(HTML, /worker\.onerror/,
    'demo.html must set worker.onerror to surface worker-level errors');
});

// ── AC-R84-13: end-to-end — Node Worker round-trip emits ≥1 'window' + 1 'terminal' ──
test('AC-R84-13: end-to-end Node Worker round-trip — receives window + terminal messages', async () => {
  // Skip with explicit reason if bundle isn't present (gitignored / not built).
  if (!fs.existsSync(BUNDLE_PATH)) {
    // Build the bundle deterministically; halts on failure.
    execSync('pnpm exec node tools/build-browser-bundle.js',
      { cwd: REPO_ROOT, stdio: 'pipe' });
  }
  assert.ok(fs.existsSync(BUNDLE_PATH), 'engine-bundle.mjs must be buildable');

  const messages: Array<Record<string, unknown>> = [];
  const worker = new Worker(pathToFileURL(WORKER_PATH));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('timeout')); }, 10000);
    worker.on('message', (m: Record<string, unknown>) => {
      messages.push(m);
      if (m && (m as { type?: string }).type === 'terminal') {
        clearTimeout(timer);
        worker.terminate();
        resolve();
      }
    });
    worker.on('error', (e) => { clearTimeout(timer); reject(e); });
    worker.postMessage({
      type: 'run',
      controlState: {
        driftMagnitude: 0.30, windowCount: 12, alphaThreshold: 0.005,
        targetShard: 'shard-00', topologySize: 'small',
        families: { a: true, b: false, c: false, d: false, e: false },
      },
    });
  });
  const windowMsgs = messages.filter((m) => (m as { type?: string }).type === 'window');
  const terminalMsgs = messages.filter((m) => (m as { type?: string }).type === 'terminal');
  assert.ok(windowMsgs.length >= 1, `expected ≥1 window message; got ${windowMsgs.length}`);
  assert.equal(terminalMsgs.length, 1, `expected exactly 1 terminal message; got ${terminalMsgs.length}`);
  // Discriminating: window-message shape is the prescribed per-shard array.
  const first = windowMsgs[0] as { perShard?: unknown };
  assert.ok(Array.isArray(first.perShard) && (first.perShard as unknown[]).length === 6,
    'first window must contain perShard array of length 6 (small topology)');
});

// ── AC-R84-14: end-to-end Cancel — terminate() stops further messages ──
test('AC-R84-14: worker.terminate() halts further message emission', async () => {
  if (!fs.existsSync(BUNDLE_PATH)) {
    execSync('pnpm exec node tools/build-browser-bundle.js',
      { cwd: REPO_ROOT, stdio: 'pipe' });
  }
  const worker = new Worker(pathToFileURL(WORKER_PATH));
  let count = 0;
  let terminated = false;
  await new Promise<void>((resolve) => {
    worker.on('message', () => {
      count++;
      if (count === 1 && !terminated) {
        terminated = true;
        worker.terminate().then(() => {
          // Give the event loop a moment to ensure no further messages slip through.
          setTimeout(resolve, 100);
        });
      }
    });
    worker.on('error', () => resolve());
    worker.postMessage({
      type: 'run',
      controlState: {
        driftMagnitude: 0.10, windowCount: 50, alphaThreshold: 0.005,
        targetShard: 'shard-00', topologySize: 'large',
        families: { a: true, b: false, c: false, d: false, e: false },
      },
    });
  });
  // After terminate, we should have observed at most a small bounded count
  // (the terminate is async; some in-flight messages may arrive before the
  // worker thread is torn down). The discriminating property is that count
  // is strictly less than windowCount (50): if terminate() didn't fire, we'd
  // see all 50 windows + 1 terminal = 51 messages.
  assert.ok(count < 50,
    `terminate() must halt streaming before all 50 windows arrive; got ${count}`);
});

// ── AC-R84-15: anti-regression — R71/R79/R80/R81/R82/R83 surface markers preserved ──
test('AC-R84-15: prior round surface markers preserved in demos/demo.html', () => {
  // R71 scenario data markers
  assert.match(HTML, /<!-- BEGIN-TESSERA-SCENARIO-DATA -->/, 'R71 marker preserved');
  assert.match(HTML, /<!-- END-TESSERA-SCENARIO-DATA -->/, 'R71 marker preserved');
  // R79 surfaces
  assert.match(HTML, /id="live-verdict-banner"/, 'R79: #live-verdict-banner preserved');
  assert.match(HTML, /id="window-scrubber"/, 'R79: #window-scrubber preserved');
  // R80 palette
  assert.match(HTML, /--tessera-fam-a:/, 'R80: family palette CSS preserved');
  // R81 scrubbing transitions
  assert.match(HTML, /body\.scrubbing/, 'R81: body.scrubbing rule preserved');
  // R82 smoke block
  assert.match(HTML, /<!-- R82-SMOKE-BLOCK-START -->/, 'R82: smoke-block start marker preserved');
  assert.match(HTML, /<!-- R82-SMOKE-BLOCK-END -->/, 'R82: smoke-block end marker preserved');
  assert.match(HTML, /__tessera_r82_smoke__/, 'R82: smoke side-channel preserved');
  // R83 control panel + state-management surface
  assert.match(HTML, /id="tessera-control-panel"/, 'R83: #tessera-control-panel preserved');
  assert.match(HTML, /var\s+controlState\s*=\s*\{/, 'R83: controlState declaration preserved');
  assert.match(HTML, /var\s+R83_DEFAULTS\s*=\s*\{/, 'R83: R83_DEFAULTS declaration preserved');
  assert.match(HTML, /function\s+emitControlChange/, 'R83: emitControlChange preserved');
  assert.match(HTML, /['"]tessera:control-change['"]/, 'R83: tessera:control-change event preserved');
  assert.match(HTML, /id="btn-run"/, 'R83: #btn-run preserved');
  assert.match(HTML, /id="btn-reset-params"/, 'R83: #btn-reset-params preserved');
});
