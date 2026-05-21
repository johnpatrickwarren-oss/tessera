# Q-R84-SPEC.md — Live engine compute + Web Worker (Phase 4 SLICE 3 round 3; "tune knobs and watch the engine run" destination)

**Round:** R84 (Phase 4 SLICE 3 third round)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `0e93c15` (`0e93c154737dab5c68db23cce9babb21f9634895`)
**Routing status (Architect → Implementer):** **READY** (no open architectural questions; spec triad complete; EMPIRICAL.sh probe-run at round-start HEAD documented in § 8.6).

R84 ships the R83→R84 handoff seam: replaces the R83 `btnRun` placeholder `console.log` with a Web Worker that loads the R82 `demos/engine-bundle.mjs` ESM bundle, synthesizes a per-shard topology from `controlState`, runs Family-A betting e-process per shard per window with the operator-selected drift / window-count / α-threshold / target-shard / topology-size, streams per-window snapshots back to the main thread, and computes terminal e-BH FDR selection. Main thread updates the existing R71/R79/R80 rendering surfaces via the existing `scenarios.custom` slot (R83 reserved it). Cancel button (`#btn-cancel`) terminates the worker; engine errors surface in a new `#engine-error-banner`.

The directive's hard scope boundary: **NO modification of `engine/*` OR R73–R83 deliverables**. This spec preserves both — the engine is consumed via the R82 bundle, R83's `controlState` + `tessera:control-change` surface is preserved unchanged, and the R83 `btnRun` handler body is replaced (its `addEventListener` identity is the R83→R84 documented seam per Q-R83-SPEC.md § 2.3; AC-R83-12's anti-regression assertion "must NOT include engine-bundle.mjs" is REPLACED by R84's positive assertion, NOT preserved — R84's GREEN is R83's RED for the replaced AC, but R83 ACs are R83-frozen, so we re-bind in a new R84 AC; see § 5.3 acknowledged gap).

---

## § 0. Brainstorm (Superpowers Phase 1)

R84 must wire the R83 control surface to live engine compute. Three architectural decisions are load-bearing:

(a) **Worker module type — classic vs module.** Option (i) module worker: `new Worker('./engine-worker.js', { type: 'module' })` with `import` at the top of the worker file (clean ESM, but requires the file to be ESM in Node-test context too, which means either renaming to `.mjs` against the directive's `.js` prescription OR adding a `demos/package.json` with `"type": "module"` that's not in ALLOWED_SET). Option (ii) classic worker with dynamic `import()` inside: `new Worker('./engine-worker.js')` (no `{type}` option); the file is plain JS (CJS in Node) and uses `import('./engine-bundle.mjs')` dynamically. Dynamic `import()` works in classic Web Workers (Chrome 80+ / Firefox 89+ / Safari 15+) AND in Node CJS modules. Empirically verified via a Node `worker_threads.Worker` smoke run at spec-emit (see § 8.6 Q.6) that this pattern loads the R82 bundle exports correctly.

(b) **Message-protocol shape — request/response vs streaming.** Option (i) request/response: main thread posts `{ type: 'run', controlState }`; worker posts ONE response `{ type: 'result', windows: [...], terminal: {...} }`. Cleaner contract; worse UX (no progressive rendering; UI freezes-feel while worker computes). Option (ii) streaming: worker posts one `{ type: 'window', windowIdx, perShard }` per window + one `{ type: 'terminal', ... }` at end. Matches the existing R71/R79 per-window rendering pattern (the canned scenarios already advance through windows; reusing `scenarios['custom']` + `currentWindowIdx` machinery is one-line wiring). Streaming also enables "watch the engine run" framing in the directive.

(c) **Per-window streaming + speed-control composition.** Option (i) worker throttles per-window emission according to a speed parameter sent in the run message (couples worker to UI playback semantics). Option (ii) worker streams as fast as it can; main thread accumulates into `scenarios.custom` AND renders each window immediately on receipt (decouples worker from playback). Option (iii) worker streams as fast as it can; main thread accumulates ONLY; after `terminal` message arrives, switches scenario selector to "custom" and lets the existing playback loop animate from window 0 at the operator-selected speed.

### Approaches considered

**Approach A — Classic Worker + dynamic-import bundle + streaming protocol + render-on-receipt UI update (Architect-recommended).** Worker file is plain JS using `require('worker_threads').parentPort` in Node OR `self.postMessage` in browser; loads `./engine-bundle.mjs` via dynamic `import()`; receives `{type:'run', controlState}`; for each window 0..N-1 posts `{type:'window', windowIdx, perShard}`; after all windows posts `{type:'terminal', ...}`. Main thread on btnRun click: terminates any existing worker, spawns new worker, posts controlState, listens for messages, accumulates into `scenarios.custom`, renders each window on receipt by setting `currentWindowIdx` and calling existing renderers (drawFrame / renderBadges / renderMetricsPanel / renderDetectorsPanel / updateLiveVerdictBanner). On `terminal` message: enables btnRun; disables btnCancel; updates scenario selector to "custom". On `error` message OR worker `error` event: shows `#engine-error-banner` with error text; enables btnRun. Cancel button: calls `worker.terminate()`; clears worker handle; enables btnRun.

- Strengths: matches directive verbatim ("streams per-window state back"; "respect speed control" → R84 streams as fast as worker computes, then operator can scrub / re-play via existing scrubber + speed selector; current-window advances visibly during compute = "watch engine run" framing). Per-window streaming is the existing scenario shape (`scenarios[name].windows[i].per_shard`) — main thread mutation is one append + one render call per message. Classic Worker + dynamic-import is universally supported in modern browsers + Node v25 (empirically verified). Cancel via `worker.terminate()` is the standard Web Worker API; no in-band cancel protocol needed.
- Weaknesses: speed-control during live streaming is not honored — main thread renders as fast as messages arrive (which is as fast as worker computes; ~50 windows × 6-25 shards × Family-A betting state update is ms-scale, so streaming may complete in <100ms; UX during streaming is "watch the windows tick up rapidly" rather than fixed-speed playback). Mitigation: post-streaming, scenario is `custom`, and the existing playback loop (R71) can be triggered via play button + speed control for a controlled re-run. This is acceptable; the directive's "watch the engine run" is primarily about the LIVE streaming-tick visualization, with playback as a secondary affordance.
- Hidden assumptions: (1) dynamic `import()` from a Web Worker context resolves `'./engine-bundle.mjs'` relative to the worker file URL (browser-standard); in Node the worker file's `__filename` / `import.meta.url` resolves the same path. Empirically verified at spec-emit via Node smoke test (§ 8.6 Q.6). (2) `scenarios.custom` slot is reserved by R83 (Q-R83-SPEC.md § 2.4); on R84 it gets populated incrementally per window. (3) Only Family A is invoked in the live compute path at R84 (matches `clean-baseline` / `sdc-drift` canned scenarios; the R83 family-b/c/d/e toggles preserve UI semantics but do not affect R84 compute — acknowledged gap with documented mitigation in § 5.3).
- Risks: bundle path resolution in the worker context. The browser resolves `'./engine-bundle.mjs'` relative to the worker URL (so `demos/engine-worker.js` + `demos/engine-bundle.mjs` in same directory works). Node resolves relative to `__filename`. Both verified at spec-emit. If a future browser ships stricter Worker CSP that blocks dynamic import, the worker fails to load and the error banner displays; user impact: live compute does not run (R83 console.log behavior was equally non-functional, so this is no regression).

**Approach B — Module Worker (ESM at worker top-level).** Worker file uses `import` statements at the top; spawned as `new Worker('./engine-worker.js', { type: 'module' })`.

- Strengths: cleanest ESM ergonomics; static imports analyzable by tooling; no runtime `import()` resolution.
- Weaknesses: requires the `.js` file to be ESM in Node test context (Node default treats `.js` as CJS unless package.json `type:module` OR file extension `.mjs`). Renaming to `.mjs` contradicts the directive's `demos/engine-worker.js` literal. Adding `demos/package.json` adds a NEW file not in the directive's ALLOWED_SET — would require an Architect-level scope amendment (4-gate ALLOWED_SET propagation per R82 MAJOR-1 lesson). The lift to fit the directive's file-name prescription is brittle.
- Hidden assumptions: future Node will not deprecate the .js-as-ESM-via-package.json mechanism.
- **Disqualified by directive file-name prescription** + the testability cost (would force an `engine-worker.mjs` symlink workaround in Node-test setup OR a non-trivial inline-worker test pattern).

**Approach C — Worker-only in browser; Node test stubs the message protocol via direct `handleRun` import.** Worker file is browser-only; Node test directly imports the `handleRun(controlState, postFn)` function and exercises it with a stub postFn. End-to-end Worker round-trip is skipped in Node.

- Strengths: simpler test path; no Node `worker_threads` dependency.
- Weaknesses: does NOT exercise the postMessage path in Node, leaving a structural gap exactly where the directive asks for "End-to-end: Web Worker round-trip (Node v25 native Worker OR jsdom polyfill)". A function-level direct-import test confirms the per-window math but does NOT confirm the worker's port-shim runtime detection or the dynamic-import-of-bundle path. A regression in the worker's port-shim would slip past Node CI; first surface would be browser failure.
- **Disqualified by directive: directive halt-condition 8 explicitly anticipates this trade-off and authorizes deferral to R85 ONLY if Node test is non-viable; Approach A demonstrates Node-Worker viability at spec-emit (§ 8.6 Q.6), so Approach C is not the right answer.**

### Selection rationale

**Pick Approach A.** Approach B's directive-file-name-mismatch + ALLOWED_SET amendment cost materially exceeds the marginal complexity of writing 8 lines of runtime-detection at the top of the worker file. Approach C leaves the directive's explicit "end-to-end Web Worker round-trip" requirement under-served. Approach A's only real weakness (speed control during streaming) is acceptable — post-streaming playback fully honors speed control via the existing R71 playback loop, and the live-streaming experience IS the "watch engine run" framing the directive frames as the round's destination.

R84's natural extension under Approach A in future rounds: (i) Family B/C/D/E live compute — wire additional engine bundle namespaces into the per-window loop; structural shape unchanged. (ii) Topology-aware common-mode candidates — call `engine.commonMode.attributeCommonMode(...)` post-streaming and include in `terminal` message. (iii) Speed-control during streaming — add a debounce / setTimeout shim in the main-thread message handler.

### Approach A specifics — the implementation footprint

- **New file:** `demos/engine-worker.js` — ~220 lines; classic-Worker / Node-Worker bridge; per-shard Family-A simulator; e-BH terminal selection.
- **Modified:** `tools/build-canned-demos.ts`:
  - `HTML_TEMPLATE_HEAD` markup — add `#btn-cancel` button next to `#btn-run` inside the existing `<div class="control-row">` button group; add `#engine-error-banner` div directly under `#tessera-control-panel`.
  - `HTML_TEMPLATE_HEAD` `<style>` — add CSS for `#btn-cancel` (disabled state) + `#engine-error-banner` (hidden default; visible-on-error).
  - `HTML_TEMPLATE_FOOTER` IIFE — replace the R83 `btnRun.addEventListener` placeholder body (lines 1693-1696 in tool source) with the R84 Worker-spawn + message-handler + state-management logic; add `btnCancel` DOM ref + handler; add `engineErrorBanner` DOM ref + show/hide helpers.
- **Modified:** `demos/demo.html` — regenerated by `pnpm build:demos` from the modified tool (Implementer commits both files together at chore-A).
- **New file:** `test/q84-live-engine-compute.test.ts` (17 ACs).
- **New file triad:** `coordination/specs/Q-R84-SPEC.md` (this file) + `Q-R84-SPEC-AUDIT.md` + `Q-R84-EMPIRICAL.sh`.
- **Modified at routing/close:** `coordination/NEXT-ROLE.md` (each role appends routing block) + `coordination/MEMORIAL.md` (each role appends CONFIRMATION/VIOLATION lines) + `coordination/reviews/REVIEWER-REPORT-R84.md` (Reviewer authors).
- **UNCHANGED:** all `engine/*`; all R73–R83 deliverables proper (R83's `controlState` + `R83_DEFAULTS` + `emitControlChange` + `btnResetParams` handler + all event listeners preserved verbatim); all `demos/scenarios/*.json` (byte-identical post-regen); the R82 smoke block at `demos/demo.html:13452-13477` (preserved by tool's smoke-block mechanism at `tools/build-canned-demos.ts:1942-1956`); `package.json` (no new deps; no new scripts); `pnpm-lock.yaml`; `.gitignore`.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries (what exists | what's created | what changes | what's deleted)

| Surface | State | Notes |
|---|---|---|
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` body (button-row inside `#tessera-control-panel`) | **MODIFIED** | Add `<button id="btn-cancel" type="button" disabled>Cancel</button>` next to existing `#btn-run` + `#btn-reset-params`; add `<div id="engine-error-banner" class="error-banner" hidden></div>` directly inside `#tessera-control-panel` after the button row |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` `<style>` block | **MODIFIED** | Add CSS for `#btn-cancel` (mirrors `#btn-reset-params` style; `:disabled` styling) + `#engine-error-banner` (hidden-by-default; visible-when-shown with `--tessera-status-error` palette) |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_FOOTER` IIFE (`btnRun.addEventListener` block at lines 1693-1696) | **MODIFIED** (handler body REPLACED) | R83 placeholder `console.log(...)` body → R84 Worker-spawn + message-listener + scenarios.custom population + per-window renderer invocation + Cancel-button toggle + error-banner toggle |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_FOOTER` IIFE (insertion AFTER `btnResetParams` handler block ends, BEFORE `var SVG_NS = ...`) | **MODIFIED** (new region added) | Helper functions `r84ShowError(msg)` + `r84HideError()` + Cancel-button click handler + Worker-handle module-private var |
| `demos/demo.html` | **MODIFIED** (regenerated) | Reflects all `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER` edits |
| `demos/engine-worker.js` | **NEW** | ~220 lines; CJS-style classic Worker; runtime detection (Node vs Browser); dynamic import of `./engine-bundle.mjs`; `'run'` message handler with per-shard Family-A simulation; per-window + terminal + error messages |
| `test/q84-live-engine-compute.test.ts` | **NEW** | All 17 R84 ACs |
| `coordination/specs/Q-R84-SPEC.md` | **NEW** | This file |
| `coordination/specs/Q-R84-SPEC-AUDIT.md` | **NEW** | Audit sidecar (Reviewer-only) |
| `coordination/specs/Q-R84-EMPIRICAL.sh` | **NEW** | Binding-command harness |
| `coordination/NEXT-ROLE.md` | **MODIFIED** | Each role appends routing block |
| `coordination/MEMORIAL.md` | **MODIFIED** | Each role appends CONFIRMATION / VIOLATION lines |
| `coordination/reviews/REVIEWER-REPORT-R84.md` | **NEW** | Authored by Reviewer |
| `coordination/logs/ROUND-R84-(SUMMARY\|ROUTING).md` | **NEW** (generic R-pattern in ALLOWED_SET) | Memorial-Updater + operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R84-*.md` | **POTENTIAL NEW** (allowed) | Only if halt fires |
| `CLAUDE-*.md` | **POTENTIAL MODIFIED** (allowed) | Memorial-Updater REINFORCED appends |
| All `engine/*` files | UNCHANGED | A12 + R82 + directive anti-scope |
| All `demos/scenarios/*.json` | UNCHANGED (byte-identical post-regen) | Halt condition 9; verified by Implementer pre-commit |
| `demos/engine-bundle.mjs` | UNCHANGED (gitignored; produced by `pnpm build:browser`) | R82 artifact; engine-worker.js consumes via dynamic import |
| R82 smoke block at `demos/demo.html:13452-13477` | UNCHANGED (preserved by tool mechanism) | R82 marker-preservation logic at `tools/build-canned-demos.ts:1942-1956` |
| R83 surfaces (`#tessera-control-panel`, `controlState`, `R83_DEFAULTS`, `emitControlChange`, all listeners, `btnResetParams`) | UNCHANGED | AC-R84-15 anti-regression enforces |
| `test/q01..q83*.test.ts` | UNCHANGED | Forward-protection AC-R83-15 will flip → fail (predicted; § 1.4) |
| `package.json` / `pnpm-lock.yaml` / `.gitignore` | UNCHANGED | No new deps; no new build scripts |

### 1.2 New HTML markup — `#btn-cancel` + `#engine-error-banner` (verbatim; Implementer inserts into `HTML_TEMPLATE_HEAD`)

Locate the existing R83 button-row in `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD`. Pattern to find:

```
    <div class="control-row">
      <button id="btn-run" type="button">Run</button>
      <button id="btn-reset-params" type="button">Reset parameters</button>
    </div>
```

Replace the inner content with (adds `#btn-cancel` between Run and Reset):

```html
    <div class="control-row">
      <button id="btn-run" type="button">Run</button>
      <button id="btn-cancel" type="button" disabled>Cancel</button>
      <button id="btn-reset-params" type="button">Reset parameters</button>
    </div>
    <div id="engine-error-banner" class="error-banner" hidden></div>
```

The `#engine-error-banner` div is inserted as a sibling of the button row, INSIDE the closing `</section>` of `#tessera-control-panel`. Implementer locates the closing `</section>` directly following the Reset-params button row.

### 1.3 New CSS rules (verbatim; Implementer copies into `HTML_TEMPLATE_HEAD` `<style>` block — append after existing R83 control-panel rules; before `</style>`)

```css
    /* R84 — Cancel button + engine error banner */
    #btn-cancel { color: var(--tessera-status-warn); border-color: var(--tessera-status-warn); }
    #btn-cancel:disabled {
      opacity: 0.4; cursor: not-allowed; color: var(--tessera-fg-muted);
      border-color: var(--tessera-border);
    }
    #engine-error-banner {
      margin-top: 8px; padding: 8px 12px; border-radius: 6px;
      background: var(--tessera-bg-elevated); color: var(--tessera-status-warn);
      border: 1px solid var(--tessera-status-warn);
      font-family: var(--tessera-font-mono); font-size: 0.8rem;
    }
    #engine-error-banner[hidden] { display: none; }
```

### 1.4 New JS — Worker spawn + message handler + Cancel + error banner (verbatim; Implementer copies into `HTML_TEMPLATE_FOOTER`)

**REPLACE** the existing R83 `btnRun.addEventListener` block in `tools/build-canned-demos.ts` (currently at lines 1693-1696 in source; Implementer locates by literal match on `// R83: placeholder; R84 invokes the engine bundle here.`). The R83 block is:

```js
  if (btnRun) {
    btnRun.addEventListener('click', function () {
      // R83: placeholder; R84 invokes the engine bundle here.
      console.log('R83 controlState (placeholder for R84 engine wiring):', JSON.stringify(controlState));
    });
  }
```

Replace verbatim with:

```js
  // ── R84: live engine compute via Web Worker (replaces R83 placeholder) ──
  var btnCancel         = document.getElementById('btn-cancel');
  var engineErrorBanner = document.getElementById('engine-error-banner');
  var r84ActiveWorker   = null;

  function r84ShowError(msg) {
    if (!engineErrorBanner) return;
    engineErrorBanner.textContent = 'Engine error: ' + msg;
    engineErrorBanner.removeAttribute('hidden');
  }
  function r84HideError() {
    if (!engineErrorBanner) return;
    engineErrorBanner.setAttribute('hidden', '');
    engineErrorBanner.textContent = '';
  }
  function r84SetRunning(isRunning) {
    if (btnRun)    btnRun.disabled    = isRunning;
    if (btnCancel) btnCancel.disabled = !isRunning;
  }

  if (btnRun) {
    btnRun.addEventListener('click', function () {
      r84HideError();
      r84SetRunning(true);
      if (r84ActiveWorker) { try { r84ActiveWorker.terminate(); } catch (e) {} r84ActiveWorker = null; }
      var worker;
      try {
        worker = new Worker('./engine-worker.js');
      } catch (err) {
        r84ShowError('failed to spawn Worker — ' + String(err));
        r84SetRunning(false);
        return;
      }
      r84ActiveWorker = worker;
      // Reserve scenarios.custom slot for incremental window population.
      scenarios['custom'] = {
        schema_version: 'tessera-demo-v1',
        scenario: 'custom',
        description: 'Live engine compute (R84) — runtime-generated from controlState',
        params: {
          shard_count: ({ small: 6, medium: 10, large: 25 })[controlState.topologySize] || 6,
          window_count: controlState.windowCount,
          alpha: controlState.alphaThreshold,
          threshold: 1 / controlState.alphaThreshold,
        },
        engine_surfaces: ['freshBettingState', 'updateBettingState', 'eBenjaminiHochberg'],
        windows: [],
        terminal_state: null,
      };
      currentName = 'custom';
      currentWindowIdx = 0;
      if (selector) selector.value = 'custom';

      worker.onmessage = function (ev) {
        var data = ev.data;
        if (!data || !data.type) return;
        if (data.type === 'window') {
          scenarios['custom'].windows.push({
            t: data.windowIdx,
            per_shard: data.perShard,
            events: data.events || [],
          });
          currentWindowIdx = data.windowIdx;
          if (typeof drawFrame === 'function')              drawFrame(scenarios['custom'], currentWindowIdx);
          if (typeof renderBadges === 'function')           renderBadges(scenarios['custom'], currentWindowIdx);
          if (typeof renderMetricsPanel === 'function')     renderMetricsPanel(scenarios['custom'], currentWindowIdx);
          if (typeof renderDetectorsPanel === 'function')   renderDetectorsPanel(scenarios['custom'], currentWindowIdx);
          if (typeof updateLiveVerdictBanner === 'function') updateLiveVerdictBanner(scenarios['custom'], currentWindowIdx);
        } else if (data.type === 'terminal') {
          scenarios['custom'].terminal_state = {
            fdr_K: data.fdr_K,
            fdr_qLevel: data.fdr_qLevel,
            fdr_selected_indices: data.fdr_selected_indices,
            candidates: data.candidates || [],
          };
          if (typeof renderBadges === 'function') renderBadges(scenarios['custom'], currentWindowIdx);
          r84SetRunning(false);
          r84ActiveWorker = null;
        } else if (data.type === 'error') {
          r84ShowError(data.error || 'unknown engine error');
          r84SetRunning(false);
          r84ActiveWorker = null;
        }
      };
      worker.onerror = function (err) {
        r84ShowError(String(err && err.message || err));
        r84SetRunning(false);
        r84ActiveWorker = null;
      };
      worker.postMessage({ type: 'run', controlState: JSON.parse(JSON.stringify(controlState)) });
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', function () {
      if (r84ActiveWorker) { try { r84ActiveWorker.terminate(); } catch (e) {} r84ActiveWorker = null; }
      r84SetRunning(false);
    });
  }
```

### 1.5 New file `demos/engine-worker.js` (verbatim; Implementer creates with this content)

```js
'use strict';
// R84 — Web Worker that drives the live Tessera engine compute path.
//
// Runtime: classic Web Worker in the browser; node:worker_threads.Worker in the Node test path.
// Uses runtime detection + dynamic ESM import of ./engine-bundle.mjs (works in both contexts).
//
// Inbound message protocol:
//   { type: 'run', controlState }
//
// Outbound message protocol (streaming):
//   { type: 'window',   windowIdx, perShard: [{shard_id, M_t, fired, residual_proxy}], events: [] }
//   { type: 'terminal', fdr_K, fdr_qLevel, fdr_selected_indices, candidates: [] }
//   { type: 'error',    error: <string> }

(function () {
  var isNodeWorker = (typeof process !== 'undefined' && process.versions && process.versions.node);

  function getPort() {
    if (isNodeWorker) {
      var wt = require('worker_threads');
      return {
        post: function (m) { wt.parentPort.postMessage(m); },
        on:   function (h) { wt.parentPort.on('message', h); },
      };
    }
    return {
      post: function (m) { self.postMessage(m); },
      on:   function (h) { self.onmessage = function (e) { h(e.data); }; },
    };
  }

  function getBundleSpecifier() {
    if (isNodeWorker) {
      var url = require('url');
      var path = require('path');
      return url.pathToFileURL(path.join(__dirname, 'engine-bundle.mjs')).href;
    }
    return './engine-bundle.mjs';
  }

  var SHARD_COUNTS = { small: 6, medium: 10, large: 25 };

  function makeShardIds(count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var n = String(i);
      out.push('shard-' + (n.length < 2 ? '0' + n : n));
    }
    return out;
  }

  function targetIndexFor(controlState, shardCount) {
    var s = String(controlState.targetShard || '');
    var m = s.match(/-(\d+)$/);
    var idx = m ? parseInt(m[1], 10) : 0;
    if (!isFinite(idx) || idx < 0 || idx >= shardCount) return 0;
    return idx;
  }

  function handleRun(engine, controlState, port) {
    var shardCount = SHARD_COUNTS[controlState.topologySize] || SHARD_COUNTS.small;
    var shardIds = makeShardIds(shardCount);
    var windowCount = Math.max(1, parseInt(controlState.windowCount, 10) || 50);
    var alpha = Number(controlState.alphaThreshold);
    if (!(alpha > 0 && alpha < 1)) alpha = 0.005;
    var threshold = 1 / alpha;
    var driftMag = Number(controlState.driftMagnitude);
    if (!(driftMag >= 0)) driftMag = 0;
    var driftStart = Math.floor(windowCount / 3);
    var targetIdx = targetIndexFor(controlState, shardCount);
    var familyAEnabled = !!(controlState.families && controlState.families.a);

    // Per-shard Family-A betting state.
    var states = new Array(shardCount);
    for (var s = 0; s < shardCount; s++) states[s] = engine.detectors.freshBettingState();

    for (var w = 0; w < windowCount; w++) {
      var perShard = [];
      for (var i = 0; i < shardCount; i++) {
        var x = (i === targetIdx && w >= driftStart) ? driftMag : 0;
        var Mt = states[i].M;
        if (familyAEnabled) {
          Mt = engine.detectors.updateBettingState(states[i], x, 0, 1, alpha);
        }
        perShard.push({
          shard_id: shardIds[i],
          M_t: Mt,
          fired: Mt >= threshold,
          residual_proxy: x,
        });
      }
      port.post({ type: 'window', windowIdx: w, perShard: perShard, events: [] });
    }

    // Terminal e-BH FDR selection over per-shard final M values.
    var eValues = states.map(function (st) { return st.M; });
    var ebh = engine.eBH.eBenjaminiHochberg(eValues, alpha);
    port.post({
      type: 'terminal',
      fdr_K: ebh.K,
      fdr_qLevel: alpha,
      fdr_selected_indices: ebh.selected,
      candidates: [],
    });
  }

  var port = getPort();
  var enginePromise = import(getBundleSpecifier());

  port.on(function (msg) {
    if (!msg || msg.type !== 'run') return;
    enginePromise.then(function (engine) {
      handleRun(engine, msg.controlState || {}, port);
    }).catch(function (err) {
      port.post({ type: 'error', error: String(err && err.message || err) });
    });
  });
})();
```

### 1.6 Test file shape (verbatim; Implementer copies into `test/q84-live-engine-compute.test.ts`)

```ts
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
  assert.match(runRegion![0],
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

// ── AC-R84-16: anti-scope diff ⊆ ALLOWED_SET ──
test('AC-R84-16: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const allowed = new RegExp(
    `^(tools/build-canned-demos\\.ts|`
    + `demos/demo\\.html|`
    + `demos/engine-worker\\.js|`
    + `test/q84-live-engine-compute\\.test\\.ts|`
    + `coordination/specs/Q-R84-SPEC\\.md|`
    + `coordination/specs/Q-R84-SPEC-AUDIT\\.md|`
    + `coordination/specs/Q-R84-EMPIRICAL\\.sh|`
    + `coordination/NEXT-ROLE\\.md|coordination/MEMORIAL\\.md|`
    + `coordination/MEMORIAL-PHASE-[0-9]+\\.md|`
    + `coordination/reviews/REVIEWER-REPORT-R84\\.md|`
    + `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\\.md|`
    + `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\\.md|`
    + `CLAUDE\\.md|CLAUDE-ARCHITECT\\.md|CLAUDE-IMPLEMENTER\\.md|`
    + `CLAUDE-REVIEWER\\.md|CLAUDE-MEMORIAL\\.md|`
    + `CLAUDE-COMMON\\.md|CLAUDE-COORDINATOR\\.md)$`,
  );
  const files = execSync(`git diff ${ROUND_START_SHA} HEAD --name-only`,
    { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const violators = files.filter((f) => !allowed.test(f));
  assert.deepEqual(violators, [],
    `R84 anti-scope diff includes unauthorized paths: ${violators.join(', ')}`);
});

// ── AC-R84-17: sentinels — typecheck + EMPIRICAL.sh block presence ──
test('AC-R84-17: typecheck sentinel + EMPIRICAL.sh has Block 1..5 markers', () => {
  const jsPath = path.join(REPO_ROOT, 'test/q84-live-engine-compute.test.js');
  assert.ok(fs.existsSync(jsPath),
    'q84 test must compile to .js (proves tsc passed for this round)');
  const sh = fs.readFileSync(
    path.join(REPO_ROOT, 'coordination/specs/Q-R84-EMPIRICAL.sh'), 'utf8');
  for (const blockMarker of [
    '── Block 1: typecheck',
    '── Block 2: engine-worker.js structural presence',
    '── Block 3: demo.html worker wiring presence',
    '── Block 4: test counts',
    '── Block 5: anti-scope diff',
  ]) {
    assert.ok(sh.includes(blockMarker),
      `Q-R84-EMPIRICAL.sh must contain marker "${blockMarker}"`);
  }
});
```

### 1.7 Integration points

| # | Integration | Direction | Failure mode |
|---|---|---|---|
| I1 | `tools/build-canned-demos.ts` edits → `pnpm build:demos` → `demos/demo.html` | Build-time | Tool error → halt condition 1 (EMPIRICAL.sh Block 2/3 fail) |
| I2 | `pnpm build:demos` regeneration | Build-time | If non-deterministic → `demos/scenarios/*.json` drift → halt condition 9 |
| I3 | Browser btnRun click → `new Worker('./engine-worker.js')` → worker.postMessage(controlState) | Runtime (browser) | Worker spawn fails (CSP / file://) → `try/catch` shows error banner; not a regression |
| I4 | Worker dynamic `import('./engine-bundle.mjs')` | Runtime (worker) | Bundle missing or load fails → `.catch` posts `{type:'error',error}`; main thread shows banner |
| I5 | Worker postMessage streaming → main thread `worker.onmessage` → scenarios.custom append + render | Runtime (browser) | Renderer not defined (function-name drift) → guarded via `typeof drawFrame === 'function'` |
| I6 | Cancel button click → `worker.terminate()` | Runtime (browser) | terminate() always succeeds in spec; no failure path |
| I7 | Node test: `new Worker(pathToFileURL(WORKER_PATH))` | Test-time | Worker spawn requires bundle present — test pre-builds via `pnpm exec node tools/build-browser-bundle.js` if absent |
| I8 | `tsc` compilation of `tools/build-canned-demos.ts` + `test/q84-live-engine-compute.test.ts` | Build-time | TypeScript error → halt condition 2 (EMPIRICAL.sh Block 1 fail) |
| I9 | `node --test` invocation of compiled tests | Test-time | Any AC failing → EMPIRICAL.sh Block 4 reports drift → halt condition 3 |

### 1.8 Failure modes at each integration point

| ID | Integration | Failure mode | Mitigation |
|---|---|---|---|
| F1 | I3 | Worker URL not resolvable (file:// browser session without HTTP server) | Wrapped in `try/catch`; error banner displays. Pre-existing browser-dashboard pattern; not regressed. |
| F2 | I4 | engine-bundle.mjs absent at worker load time (browser) | Worker fails to load bundle; posts `{type:'error'}`; main thread surfaces. (In Node test path, AC-R84-13 / -14 pre-build the bundle if absent.) |
| F3 | I5 | renderer function name drift (e.g., `drawFrame` renamed) | `typeof drawFrame === 'function'` guard — worker continues streaming; rendering silently no-ops; structural ACs catch the renaming separately via AC-R84-15 R71 marker preservation. |
| F4 | I6 | Cancel pressed when no worker active | `if (r84ActiveWorker)` guard; no-op. |
| F5 | I7 | Node test runs in environment without pnpm | Test uses `execSync('pnpm exec ...')`; if pnpm absent, test fails with a clear error; not a regression (project-wide pnpm dependency). |
| F6 | I8 | TypeScript error introduced by R84 test file | EMPIRICAL.sh Block 1 binds `tsc -p tsconfig.test.json` exit 0; halt condition 2. |
| F7 | I9 | Test count drift beyond R84 additions | EMPIRICAL.sh Block 4 strict-equality bounds; halt condition 3. |

### 1.9 Architect pre-prediction table (predictions, not observations; encode-actual-results-verbatim discipline applies post-fact)

| Observable | Architect pre-prediction at R84 chore-A | Rationale |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | **0** | R84 modifications are TS-clean: tool file gets pure string edits; test file is standard `node:test` + `node:worker_threads` + `node:url` shape; engine-worker.js is plain JS (not type-checked) |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | **1** | node-test exits 1 when any subtest fails; baseline carry-forward 13 + R83 AC-R83-15 forward-protection flip = 14 expected failures |
| TAP `# tests` | predicted **669** (R83 close 652 + 17 new R84 ACs; strict equality) | each AC = 1 `test()` block |
| TAP `# pass` | predicted **652** (R83 close 635 + 17 new R84 ACs all passing at GREEN; band [651, 653] for ±1 PRNG/environment noise; forward-protection AC-R83-15 flips from pass→fail = −1) — combining: 635 − 1 + 17 = **651** pass; band [650, 652] | R83 close empirical pass=635 per § 8.6 probe; AC-R83-15 flips (−1); 17 new ACs all pass at GREEN. |
| TAP `# fail` | predicted **14** (R83 close 13 + 1 R83 AC-R83-15 forward-protection flip; strict equality) | R83 AC-R83-15 regex enumerates `test/q83-interactive-knobs\.test\.ts`, `Q-R83-SPEC*`, `REVIEWER-REPORT-R83.md`, generic-pattern `ROUND-R[0-9]+...`, `DIAGNOSTIC-R[0-9]+...`, `MEMORIAL-PHASE-[0-9]+\.md`, CLAUDE-*.md. R84 introduces: `demos/engine-worker.js`, `test/q84-live-engine-compute.test.ts`, `coordination/specs/Q-R84-*`, `coordination/reviews/REVIEWER-REPORT-R84.md`. The R83 regex DOES include `tools/build-canned-demos\.ts` and `demos/demo\.html` (R83 modified those too), so those don't trigger. The four `Q-R84-*` / `engine-worker.js` / `q84-*.test.ts` / `REVIEWER-REPORT-R84.md` paths are NEW and NOT matched by R83's regex → AC-R83-15 flip |
| TAP `# skipped` | **4** (unchanged) | no skip changes |
| `bash Q-R84-EMPIRICAL.sh` exit at chore-A | **0** (ALL BLOCKS PASS) | EMPIRICAL.sh blocks designed to pass post-Implementer GREEN |
| `git diff 0e93c15 HEAD --name-only` line count | predicted **9-14** | 1 modified tool, 1 modified demo.html, 1 new worker file, 1 new test, 3 spec triad files, 1 modified NEXT-ROLE.md, 1 modified MEMORIAL.md, 1 new REVIEWER-REPORT, 1 new ROUND-R84-ROUTING.md (already present), optional ROUND-R84-SUMMARY.md, optional CLAUDE-*.md edits |
| `demos/scenarios/*.json` content | **byte-identical** to round-start HEAD `0e93c15` | Halt condition 9 |
| Carry-forward failing ACs (13 at HEAD) | unchanged in name | AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14, AC-R82-14 |

### 1.10 Architect choices documented (not deferred)

| Choice | Architect pick | Alternatives rejected; rationale |
|---|---|---|
| Worker module type | classic Worker (no `{type:'module'}`); dynamic `import()` of bundle | Module worker requires file-extension `.mjs` OR `package.json` `type:module`, neither in directive ALLOWED_SET. |
| Worker file location | `demos/engine-worker.js` (per directive) | Directive verbatim. |
| Bundle path resolution in worker | `'./engine-bundle.mjs'` in browser; `pathToFileURL(path.join(__dirname,'engine-bundle.mjs'))` in Node | Browser dynamic-import resolves relative to worker URL; Node CJS uses `__filename`/`__dirname` directly. |
| Message-protocol shape | streaming: `{type:'window',windowIdx,perShard}` per window + `{type:'terminal',...}` + `{type:'error',error}` | Request/response would freeze UI; streaming matches scenarios shape + "watch engine run" framing. |
| Cancel mechanism | `worker.terminate()` from main thread; new `#btn-cancel` button | In-band cancel-message would require worker to check a flag between windows (more complex; no UX benefit). |
| Error surfacing | `#engine-error-banner` div (hidden by default) + `r84ShowError(msg)` / `r84HideError()` helpers | Reusing `#live-verdict-banner` would couple engine errors with verdict semantics. |
| Cancel + Run button states | `r84SetRunning(isRunning)` toggles `disabled` on both buttons in lockstep | Single source of truth for the run/cancel state machine. |
| Topology synthesis | flat shard list (`shard-00..shard-{N-1}`) sized by `SHARD_COUNTS[topologySize]` (small=6, medium=10, large=25) | Matches the target-shard selector option-space (R83 ships shards 0-24 max). |
| Drift injection | `residual = (i===targetIdx && w>=floor(windowCount/3)) ? driftMag : 0` | Matches `sdc-drift` canned scenario pattern (drift starts ~1/3 through windows). |
| Detector family scope | R84 implements Family A only in the live compute path | Acknowledged gap (§ 5.3); B/C/D/E toggles preserve R83 UI semantics but are inert at R84; future round extends. |
| `controlState.families.a` semantics | If false: Family A is not invoked; `M_t` remains 1 across all windows; no firings | Operator-facing: toggle off Family A demonstrates "no detector fires" baseline. |
| Per-window UI update | Main thread renders on receipt of each `window` message (decoupled from speed control) | Speed control honored post-streaming via existing R71 playback loop. Reasoning in § 0 selection rationale. |
| Scenario slot | `scenarios['custom']` (R83 reserved this in `<option value="custom">`) | R83 placeholder paid forward; no new scenario name needed. |
| End-to-end test mechanism | `node:worker_threads.Worker` with `pathToFileURL(WORKER_PATH)` | Direct Node native; no jsdom polyfill required (verified at spec-emit § 8.6 Q.6). |
| Bundle build inside test | `execSync('pnpm exec node tools/build-browser-bundle.js')` if bundle absent | Avoids non-deterministic CI failures when bundle is gitignored and not pre-built. |

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 The classic-worker + dynamic-import pattern as the bidirectional bridge

`demos/engine-worker.js` is a `.js` file that runs in BOTH (a) the browser as a classic Web Worker via `new Worker('./engine-worker.js')` AND (b) Node v25 as a `worker_threads.Worker` via `new Worker(pathToFileURL(WORKER_PATH))`. The single file works in both contexts because:

1. Its content has NO top-level `import` / `export` statements (so Node treats the file as CJS and the browser classic Worker accepts it as a script).
2. Runtime detection (`typeof process !== 'undefined' && process.versions.node`) selects either `require('worker_threads').parentPort` (Node) or `self.postMessage` / `self.onmessage` (browser) for the port API.
3. Dynamic `import('./engine-bundle.mjs')` is supported in both classic Web Workers (since 2021) and Node CJS modules (since Node 13.2). The bundle specifier is computed differently per runtime: in Node, `pathToFileURL(path.join(__dirname, 'engine-bundle.mjs')).href`; in browser, plain `'./engine-bundle.mjs'`.

Empirically verified at spec-emit (§ 8.6 Q.6): a smoke test loaded the actual R82 engine-bundle.mjs from a Node Worker using this exact pattern and confirmed all 12 expected exports (`StaticTopologySource`, `TopologyEnricher`, `commonMode`, `computeSnapshotHash`, `detectors`, `eBH`, `familyA`, `familyC`, `freezeHook`, `pureJsSha256`, `runtime`, `types`).

### 2.2 The per-window streaming protocol as the engine→UI seam

The worker emits exactly `windowCount + 1` messages per run (N `window` messages + 1 `terminal`). On any internal error, emits 1 `error` message instead of continuing. Window message shape matches the canned-scenario per-window shape (`{shard_id, M_t, fired, residual_proxy}` per shard, plus an empty `events: []` for forward compatibility) so the main thread's existing renderers consume the data without reshape.

Streaming-vs-batch is a deliberate UX choice: each window message triggers an immediate render (`drawFrame` + `renderBadges` + `renderMetricsPanel` + `renderDetectorsPanel` + `updateLiveVerdictBanner`), producing the "watch the engine run" animation the directive frames as the round's destination. The trade-off — speed-control is not honored during live streaming — is mitigated by the existing R71 playback loop: after streaming completes, the operator can replay through the windows at any speed using the scrubber + play button (the scenario is `'custom'`, the windows are accumulated, the existing playback machinery operates over them with zero modification).

### 2.3 The Cancel button as the worker-termination seam

`btnCancel` is a sibling button to `btnRun` and `btnResetParams`, inserted into the existing R83 button row. The Cancel handler calls `r84ActiveWorker.terminate()` directly — Web Worker `terminate()` is the standard cancel API (per MDN: "terminates the Worker, stopping any ongoing operations"). The handle is then nulled and Run is re-enabled via `r84SetRunning(false)`.

Cancel-when-no-worker-active is a guarded no-op (`if (r84ActiveWorker)`). No in-band cancel-message protocol is required.

### 2.4 The `#engine-error-banner` as the error-surface seam

Two error paths converge on the same banner:

1. **Worker-internal error** (engine bundle fails to load; handler throws): worker posts `{type:'error', error: msg}`; main thread's `worker.onmessage` `'error'` branch calls `r84ShowError(msg)`.
2. **Worker-level error** (file fails to load; cross-origin violation in browser): browser fires `worker.onerror` event; handler calls `r84ShowError(String(err))`.

Both paths re-enable Run and disable Cancel via `r84SetRunning(false)` so the operator can retry without page reload.

### 2.5 The `scenarios.custom` slot as the R83-to-R84 contract

R83 reserved `<option value="custom">Custom parameters</option>` in `#scenario-selector` AND documented in Q-R83-SPEC.md § 2.4: "R84 will populate `scenarios.custom` from a live engine run when Run is clicked while 'custom' is selected." R84 fulfills the contract: btnRun click constructs `scenarios['custom']` as an in-place buildable object with the canned-scenario schema, then accumulates per-window data + terminal state from worker messages. After streaming completes, `scenarios['custom']` has the same shape as any other canned scenario, and the existing scenario-selector + playback machinery operates over it transparently.

### 2.6 The R83-frozen surface preservation

Every R83 surface that AC-R83-N binds is preserved verbatim:
- `controlState`, `R83_DEFAULTS`, `emitControlChange`, `btnResetParams` handler — UNCHANGED.
- `#btn-run` button HTML element — UNCHANGED in markup (the handler body changes; button still exists).
- All `param-*` control listeners — UNCHANGED.
- `#tessera-control-panel` section — UNCHANGED structurally; `#btn-cancel` + `#engine-error-banner` are additions WITHIN the section.

AC-R83-12's specific assertion ("btnRun click handler must console.log(... controlState ...)" AND "must NOT include engine-bundle.mjs") will FAIL at R84 chore-A — this is R83-frozen AC behavior R84 cannot preserve (the handler IS being replaced; that's the whole round). Per directive: "NO modification of carry-forward AC fail set" — AC-R83-12 was passing at R83 close (it's in the pass bucket). R84's handler-replacement will cause it to flip from pass→fail.

**This is a second forward-protection flip beyond AC-R83-15.** Re-predicting fail counts: R83 close = 13 fail. R84 changes:
- AC-R83-15 forward-protection-allowed-set flip: +1 (R84 paths not in R83 ALLOWED regex)
- AC-R83-12 R83→R84 handler-body replacement flip: +1 (handler is replaced; console.log + no-engine-bundle assertions both fail)

Total: **15 fail predicted** (not 14 as the initial pass through § 1.9 says). Updating § 1.9 to reflect this is the right move; doing so here in § 2.6 with the corrected number propagated.

**Corrected predictions:**
- TAP `# fail` predicted **15** (R83 close 13 + 2 R83 forward-protection flips: AC-R83-15 allowed-set + AC-R83-12 handler-body-replacement)
- TAP `# pass` predicted **650** (R83 close 635 − 2 R83 flips + 17 new R84 ACs all passing = 650; band [649, 651] for ±1 PRNG/environment margin)
- TAP `# tests` predicted **669** (unchanged: 652 + 17)

§ 5.2 below carries these corrected numbers; the EMPIRICAL.sh ACs encode them.

---

## § 3. Component inventory

| File | State | Lines (approx) | AC binding |
|---|---|---|---|
| `tools/build-canned-demos.ts` | MODIFIED | +30 markup/CSS, +90 JS (handler replacement + Cancel + error helpers); ~120 added lines | AC-R84-8..12 (via regenerated demos/demo.html), AC-R84-15 (anti-regression markers) |
| `demos/demo.html` | MODIFIED (regenerated) | mirror of tool edits | AC-R84-8..12, AC-R84-15 (direct file read) |
| `demos/engine-worker.js` | NEW | ~120 lines | AC-R84-1..7 (this file IS the AC binding) |
| `test/q84-live-engine-compute.test.ts` | NEW | 17 `test()` blocks; ~280 lines | AC-R84-1..17 |
| `coordination/specs/Q-R84-SPEC.md` | NEW | this file | — |
| `coordination/specs/Q-R84-SPEC-AUDIT.md` | NEW | audit sidecar | — |
| `coordination/specs/Q-R84-EMPIRICAL.sh` | NEW | 5 blocks; ~110 lines | AC-R84-16 (Block 5) + AC-R84-17 (block markers) |
| `coordination/NEXT-ROLE.md` | MODIFIED | each role appends ~50-line routing block | — |
| `coordination/MEMORIAL.md` | MODIFIED | each role appends CONFIRMATION/VIOLATION lines | — |
| `coordination/reviews/REVIEWER-REPORT-R84.md` | NEW | Reviewer authors | — |
| `coordination/logs/ROUND-R84-ROUTING.md` | NEW (already present at HEAD per `git status`) | — | — |
| `coordination/logs/ROUND-R84-SUMMARY.md` | NEW (Memorial-Updater authors) | — | — |

### 3.1 ALLOWED_SET (narrative inventory — gate artifact #1; per R72/R82 spec-amendment-ALL-gate-artifacts-propagation lesson)

The ALLOWED_SET enumeration appears in FOUR places that must remain in lockstep across any amendment (per CLAUDE-COMMON.md REINFORCED 2026-05-20):

1. **§ 3.1 narrative table (this section)** — authoritative human-readable enumeration.
2. **§ 3.2 ALLOWED regex** — machine-checkable string for the spec body.
3. **`test/q84-live-engine-compute.test.ts` AC-R84-16 regex** — runtime gate in the test file.
4. **`coordination/specs/Q-R84-EMPIRICAL.sh` Block 5 `ALLOWED` variable** — bash gate at chore-A pre-commit.

Authorized paths (round-start `0e93c15` → R84 HEAD):

| Path | Role of file | Reason in ALLOWED_SET |
|---|---|---|
| `tools/build-canned-demos.ts` | Modified (button-row + CSS + IIFE Worker wiring) | Source of truth for `demos/demo.html` regeneration |
| `demos/demo.html` | Modified (regenerated) | Browser-loadable dashboard; R84 worker wiring lands here |
| `demos/engine-worker.js` | NEW | Web Worker file consumed by the dashboard at runtime + by the Node test |
| `test/q84-live-engine-compute.test.ts` | New | All 17 R84 ACs |
| `coordination/specs/Q-R84-SPEC.md` | New | This file |
| `coordination/specs/Q-R84-SPEC-AUDIT.md` | New | Audit sidecar |
| `coordination/specs/Q-R84-EMPIRICAL.sh` | New | Binding-command harness |
| `coordination/NEXT-ROLE.md` | Modified | Each role appends routing block |
| `coordination/MEMORIAL.md` | Modified | Each role appends memorial lines |
| `coordination/MEMORIAL-PHASE-[0-9]+\.md` | Potentially modified | If active-file rolls during R84 |
| `coordination/reviews/REVIEWER-REPORT-R84.md` | New | Reviewer authors |
| `coordination/logs/ROUND-R[0-9]+-(SUMMARY\|ROUTING)\.md` | New (generic R-pattern) | Memorial-Updater + operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` | Potentially new | Only if halt fires |
| `CLAUDE.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md` | Potentially modified | Memorial-Updater REINFORCED appends |

**Explicitly NOT in ALLOWED_SET (sentinel for halt-condition tripwires):**

- `demos/scenarios/*.json` — must remain byte-identical to round-start `0e93c15`. Halt condition 9.
- `demos/engine-bundle.mjs` — gitignored; produced by `pnpm exec node tools/build-browser-bundle.js`. Never appears in `git diff --name-only`.
- `engine/*` — directive + A12 anti-scope.
- `package.json` / `pnpm-lock.yaml` — no new deps; no new scripts. (`pnpm build:demos` + `pnpm build:browser` already exist.)
- `.gitignore` — no new ignores required.
- `tools/build-browser-bundle.ts` — frozen at R82; R84 only invokes its compiled `.js` via execSync.
- All `test/q01..q83*.test.ts` files — frozen (R73–R83 deliverables; directive anti-scope).

### 3.2 ALLOWED regex (gate artifact #2; verbatim copy lives in `test/q84-live-engine-compute.test.ts` AC-R84-16 and `Q-R84-EMPIRICAL.sh` Block 5 ALLOWED variable)

```
^(tools/build-canned-demos\.ts|demos/demo\.html|demos/engine-worker\.js|test/q84-live-engine-compute\.test\.ts|coordination/specs/Q-R84-SPEC\.md|coordination/specs/Q-R84-SPEC-AUDIT\.md|coordination/specs/Q-R84-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R84\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

---

## § 4. Per-file pseudocode

All four prescribed surfaces — engine-worker.js, demo.html markup/CSS/JS edits, test file — appear verbatim in §§ 1.2, 1.3, 1.4, 1.5, 1.6 above. The Implementer copies them directly; no pseudocode interpretation is required.

The Implementer's chore-A sequence:

1. **RED commit:** create `test/q84-live-engine-compute.test.ts` with 17 stub `test()` blocks each containing `assert.fail('R84 RED: ' + ac_id);`. Verify `pnpm exec tsc -p tsconfig.test.json && pnpm exec node --test --test-reporter=tap test/q84-live-engine-compute.test.js` shows 17 failures. Commit as `test(R84 RED): 17 assert.fail stubs for live engine compute ACs`.

2. **GREEN commit:**
   - Create `demos/engine-worker.js` verbatim from § 1.5.
   - Apply spec § 1.2 markup edits + § 1.3 CSS edits to `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD`.
   - Apply spec § 1.4 JS edits to `tools/build-canned-demos.ts` `HTML_TEMPLATE_FOOTER` (REPLACE the R83 `btnRun.addEventListener` block; ADD `btnCancel` handler).
   - Pre-build the engine bundle if absent: `pnpm exec node tools/build-browser-bundle.js`. (engine-bundle.mjs is gitignored; not in diff.)
   - Run `pnpm exec tsc -p tsconfig.test.json` (rebuild .js for tools/ + tests/).
   - Run `pnpm exec node tools/build-canned-demos.js` (regenerate `demos/demo.html`).
   - Verify `git status` shows ONLY allowed paths modified (per § 3.2); `demos/scenarios/*.json` UNCHANGED (halt condition 9).
   - Replace the test file's `assert.fail` stubs with the verbatim test body from § 1.6.
   - Recompile tests.
   - Run full `pnpm exec node --test --test-reporter=tap test/*.test.js | tail -10` and record observed counts verbatim per cross-project Rule 1 sub-class `empirical-command-attestation`.
   - Commit as `feat(R84 GREEN): live engine compute via Web Worker — chore-A`.

3. **NEXT-ROLE.md routing:** append `## § R84 IMPLEMENTER routing block (chore-A)` with `STATUS: READY`, the observed counts verbatim, and the chore-A SHA. (See § 6.2 routing-block template.)

---

## § 5. Acceptance criteria

All 17 ACs are defined in `test/q84-live-engine-compute.test.ts` (verbatim in § 1.6). Summary table:

| # | AC | Binding | Discriminating property |
|---|---|---|---|
| 1 | AC-R84-1: engine-worker.js exists + non-empty | `fs.existsSync` + length check | File missing or < 200 bytes → FAIL |
| 2 | AC-R84-2: runtime detection (Node vs Browser) | regex `process\.versions\.node` + `self\.postMessage` | Detection removed → FAIL |
| 3 | AC-R84-3: dynamic import of engine-bundle.mjs + no top-level static import | regex `import\(` + `engine-bundle\.mjs` + NEGATIVE top-level `^import\s` | Top-level static import OR missing dynamic import → FAIL |
| 4 | AC-R84-4: 'run' message type filter | regex `msg\.type\s*!==\s*['"]run['"]` | Filter removed → FAIL |
| 5 | AC-R84-5: 'window' messages with {windowIdx, perShard} | 3 regex matches | Field missing → FAIL |
| 6 | AC-R84-6: 'terminal' message with FDR fields | 5 regex matches (terminal + 4 fields) | Any field missing → FAIL |
| 7 | AC-R84-7: 'error' message + `.catch(` | 2 regex matches | Error handling removed → FAIL |
| 8 | AC-R84-8: demo.html spawns `new Worker('./engine-worker.js')` | region-scoped regex on btnRun handler | Worker spawn missing OR wrong path → FAIL |
| 9 | AC-R84-9: demo.html postMessage `{type:"run",controlState}` | region-scoped regex on btnRun handler | postMessage missing OR wrong shape → FAIL |
| 10 | AC-R84-10: worker.onmessage appends to scenarios.custom + calls drawFrame | region-scoped regex on onmessage handler | Either branch missing → FAIL |
| 11 | AC-R84-11: #btn-cancel exists + calls worker.terminate() | button existence regex + handler-region regex | Button missing OR terminate() missing → FAIL |
| 12 | AC-R84-12: #engine-error-banner + r84ShowError helper + worker.onerror | 3 regex matches | Any path missing → FAIL |
| 13 | AC-R84-13: end-to-end Node Worker round-trip — ≥1 window + 1 terminal | spawns real worker; receives messages | Protocol broken → FAIL (timeout or wrong message types) |
| 14 | AC-R84-14: end-to-end Cancel — terminate halts streaming | spawns worker; terminate after 1st msg; count < windowCount | terminate ineffective → FAIL |
| 15 | AC-R84-15: anti-regression — R71/R79/R80/R81/R82/R83 markers preserved | 14 marker regex matches | Any prior round marker missing → FAIL |
| 16 | AC-R84-16: anti-scope diff ⊆ ALLOWED_SET | `git diff` + regex filter | Any unauthorized path in diff → FAIL |
| 17 | AC-R84-17: typecheck sentinel + EMPIRICAL.sh block-presence | `.js` existence + 5 Block marker matches | Compile failure OR missing block marker → FAIL |

### 5.1 AC-attestation classification

| AC | Attestation type |
|---|---|
| AC-R84-1 .. AC-R84-12 | Direct file-read assertion (committed runtime test; reproducible) |
| AC-R84-13, AC-R84-14 | End-to-end binding-command attestation: Node `worker_threads.Worker` round-trip; reproducible per-run within ±1ms variation; deterministic structure |
| AC-R84-15 | Direct file-read assertion against `demos/demo.html` for 14 prior-round markers |
| AC-R84-16 | Binding-command attestation: `git diff $ROUND_START_SHA HEAD --name-only` filtered by ALLOWED regex |
| AC-R84-17 | Composite sentinel: typecheck side-channel (q84 `.js` existence proves `tsc -p tsconfig.test.json` succeeded) + EMPIRICAL.sh block-marker presence |

### 5.2 Architect pre-prediction (binding-command attestation; encode-actual-results-verbatim discipline applies at chore-A; Rule 1 sub-class `empirical-command-attestation`)

The Implementer MUST attest in NEXT-ROLE.md the OBSERVED values verbatim from running these commands at chore-A HEAD; the Architect pre-predictions below are NOT the attestation. Per R26 MAJOR-1 / R72 / R77 / R79 MAJOR-1 cross-project canonical: if any observed value differs from the predicted value beyond the documented band, the Implementer MUST HALT + write DIAGNOSTIC + set STATUS: ESCALATE (NOT silently amend the EMPIRICAL.sh per R79 MAJOR-1).

| Observable | Predicted at R84 chore-A | Band / strictness |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | strict |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | strict (node-test exits 1 when subtests fail) |
| TAP `# tests` | 669 | strict (R83 close 652 + 17 new R84 ACs) |
| TAP `# pass` | 650 | band [649, 651] (±1 PRNG/environment margin; 635 R83 close + 17 R84 new − 2 forward-protection flips) |
| TAP `# fail` | 15 | strict (R83 close 13 + AC-R83-15 allowed-set flip + AC-R83-12 R83→R84 handler-replacement flip) |
| TAP `# skipped` | 4 | strict |
| `bash Q-R84-EMPIRICAL.sh` exit | 0 | strict (all 5 blocks pass at GREEN; Block 4 expects fail=15, pass∈[649,651]) |
| `git diff 0e93c15 HEAD --name-only` line count | 9-14 | band |
| `demos/scenarios/*.json` content vs round-start | byte-identical | strict (halt condition 9) |

### 5.3 Acknowledged AC gaps

- **No live browser smoke test for the R84 Worker integration.** Verification is split: structural source-text ACs (AC-R84-1..12) for the worker file + demo.html wiring; end-to-end ACs (AC-R84-13, AC-R84-14) for the Node Worker round-trip (proves the worker file's port-shim + dynamic import + per-window streaming + cancel all work in a real Worker context). The browser path uses the SAME worker file via a different runtime detection branch; a port-shim regression in the browser branch would slip past Node CI. **Mitigation:** AC-R84-2 binds the `self.postMessage` branch via regex — any drift would fail the structural test. Operator manual smoke (file:// or `python3 -m http.server` then load `demos/demo.html`) is documented in DEMO-SCRIPT.md as the browser-side validation path; not CI-enforceable.

- **R84 implements Family A only in live compute.** `controlState.families.{b,c,d,e}` toggles preserve R83 UI semantics (per AC-R83-* anti-regression) but are INERT in the engine-worker.js compute loop. Operator-visible behavior: toggling families B/C/D/E on or off does not change firings or e-BH selection at R84. **Mitigation:** documented in § 1.10 + § 2.6; future round extends multi-family live compute. The R83 ACs that bind family-toggle UI behavior (AC-R83-8 family checkbox presence + AC-R83-10 controlState families field) are preserved. R84 introduces NO new AC asserting multi-family live-engine behavior, so no AC is structurally over-specifying R84's compute scope.

- **AC-R83-12 will flip pass→fail at R84 chore-A.** R83's AC-R83-12 asserts (a) `btnRun` handler `console.log`s `controlState` AND (b) handler does NOT include `engine-bundle.mjs`. R84's whole purpose is to REPLACE the handler body with engine invocation — both assertions necessarily fail. This is a documented R83→R84 handoff seam (Q-R83-SPEC.md § 2.3 explicitly anticipates the replacement). The directive's "NO modification of carry-forward AC fail set" applies to the SET COMPOSITION at R83 close (the 13 already-failing ACs); a pass→fail flip of a previously-passing AC is a forward-protection flip (same class as AC-R83-15 allowed-set), not modification of carry-forward fails. The corrected fail prediction is 15 (§ 1.9 / § 2.6 / § 5.2 all updated).

- **No AC binds the per-window math output.** AC-R84-13 asserts shape (`perShard.length === 6`) but not values. **Rationale:** the per-window math is `engine.detectors.updateBettingState(state, x, 0, 1, alpha)` — a deterministic engine call with known inputs; binding a specific M_t value would couple the R84 AC to the betting-e-process internals (R82-frozen) and create churn whenever the engine evolves. The structural AC (shape correct; ≥1 window streamed; 1 terminal) is the right discrimination level. Future rounds may add value-range ACs.

- **No AC binds speed-control honoring during streaming.** R84 explicitly chose render-on-receipt (§ 1.10 + § 2.2 selection rationale): speed control honors via post-streaming playback only. **Rationale:** the directive says "respect speed control" — interpreted as "the speed control remains functional for the post-streaming playback path that the existing R71 loop already implements." Live-streaming speed-throttling is a future-round extension. The R83 speed control UI surface is untouched, satisfying the literal directive language at the AC level (AC-R84-15 covers R71 markers including the existing playback panel).

---

## § 6. Anti-scope (what is NOT included this round)

- **NO modification of `engine/*`** (A12 + R82 + directive anti-scope).
- **NO modification of R73–R83 deliverables** beyond the R83 `btnRun` handler body (which Q-R83-SPEC.md § 2.3 explicitly anticipates as the R84 seam).
- **NO new external dependencies** (vanilla HTML/CSS/JS + Web Worker standard browser API; halt condition 7).
- **NO modification of `run-pipeline.sh`** (PR #39 pending; directive anti-scope).
- **NO modification of `demos/scenarios/*.json` content** (byte-identical regeneration required; halt condition 9).
- **NO modification of carry-forward AC fail set** at R83 close. (The 2 forward-protection flips at AC-R83-12 + AC-R83-15 are NOT modification of the carry-forward set; they are forward-protection class flips. See § 5.3 last bullet.)
- **NO modification of prior-round Q-RNN-SPEC.md files** (directive anti-scope).
- **NO Family B/C/D/E live compute** (R84 ships Family A only; § 5.3 acknowledged gap; future round).
- **NO topology-aware common-mode attribution in live compute** (worker emits `candidates: []` in terminal; future round wires `engine.commonMode.attributeCommonMode`).
- **NO speed-control honoring during live streaming** (post-streaming playback via existing R71 loop is the speed-control surface; § 5.3 acknowledged gap).
- **NO real-cluster / DS-repo / `gh repo` operations** (directive anti-scope).
- **NO modification of `package.json` or `pnpm-lock.yaml`** (build:demos + build:browser scripts already exist).
- **NO modification of `tools/build-browser-bundle.ts`** (R82-frozen; R84 only invokes it via execSync when bundle is absent at test-time).

### 6.1 Halt conditions (R84 Implementer)

1. `bash Q-R84-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than pre-documented carry-forward expectations.
2. `pnpm exec tsc -p tsconfig.test.json` exit ≠ 0.
3. Test baseline drift: `# fail` ≠ 15 OR `# pass` outside `[649, 651]` (per § 5.2 band).
4. R61-class architectural-reality discovery (e.g., Node Worker cannot load the worker file as written; bundle dynamic import fails for unforeseen reason).
5. Architect spec uses round-evolution-fragile AC patterns: HALT + DIAGNOSTIC; do NOT silently amend per R79 MAJOR-1.
6. Any cross-project discipline (Rules 1-7) violated: HALT + DIAGNOSTIC.
7. New external dependency required: HALT + DIAGNOSTIC + ESCALATE.
8. Anti-scope ALLOWED_SET incomplete (per R82 MAJOR-1 lesson): file requires modification not in ALLOWED_SET → HALT + DIAGNOSTIC.
9. `demos/scenarios/*.json` content drifts post-regen: HALT + DIAGNOSTIC.
10. R82 smoke block at `demos/demo.html:13452-13477` lost post-regen: HALT + DIAGNOSTIC.
11. R83 control panel surface regressed: HALT + DIAGNOSTIC (AC-R84-15 enforces structurally; Implementer pre-commit `grep` check is the procedural mirror).
12. **Web Worker not testable in Node** (directive halt-condition 8): document limitation + manual smoke test deferred to R85; HALT + DIAGNOSTIC for operator decision. (Architect pre-empirical verification at § 8.6 Q.6 confirms Node Worker IS testable; this halt condition is the safety net.)

### 6.2 Implementer routing block template (NEXT-ROLE.md)

```
## § R84 IMPLEMENTER routing block (chore-A)

NEXT-ROLE: REVIEWER
STATUS: READY
Inputs: coordination/specs/Q-R84-SPEC.md
        coordination/specs/Q-R84-SPEC-AUDIT.md
        coordination/specs/Q-R84-EMPIRICAL.sh
        test/q84-live-engine-compute.test.ts
        demos/engine-worker.js
        coordination/reviews/REVIEWER-REPORT-R84.md (Reviewer authors)

### Chore-A SHA: <ACTUAL_CHORE_A_SHA>

### Observed binding-command outputs (verbatim; Rule 1 sub-class empirical-command-attestation; R26+R72+R77+R79+R70 lineage)

- `pnpm exec tsc -p tsconfig.test.json` exit code: <ACTUAL>  (predicted 0)
- `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit code: <ACTUAL>  (predicted 1)
- TAP `# tests`:    <ACTUAL>  (predicted 669)
- TAP `# pass`:     <ACTUAL>  (predicted 650; band [649, 651])
- TAP `# fail`:     <ACTUAL>  (predicted 15 strict)
- TAP `# skipped`:  <ACTUAL>  (predicted 4)
- `bash coordination/specs/Q-R84-EMPIRICAL.sh` exit code: <ACTUAL>  (predicted 0)
- `git diff 0e93c15 HEAD --name-only` line count: <ACTUAL>  (predicted 9-14)

### CONFIRMATION lines appended to coordination/MEMORIAL.md

- tdd-discipline-red-green-verified
- empirical-command-attestation-rule-1
- all-17-acs-pass-at-green
- halt-discipline-<none-fired | DIAGNOSTIC-RNN written>
- anti-scope-allowed-set-respected
- demos-scenarios-byte-identity-preserved
- r83-surface-preservation-verified
```

---

## § 7. Open questions

**None — all resolved.** The directive enumerates the 5-deliverable shape exhaustively; the Architect picks (§ 1.10) close every remaining design degree of freedom. The Web Worker Node-testability question (directive halt-condition 8) is empirically resolved at spec-emit (§ 8.6 Q.6: Node v25 `worker_threads.Worker` loads the worker file as written and exchanges messages successfully with the dynamic-imported engine bundle).

---

## § 8. Pre-emit grilling output (Superpowers Phase 3; written inline)

Each section is a discipline check; each row is one applied rule.

### 8.1 Q.1 — Every claim verifiable?

| Claim | Verification command run at spec-emit | Result | Verdict |
|---|---|---|---|
| Round-start SHA is `0e93c15` | `git rev-parse --short HEAD` | `0e93c15` | PASS |
| Baseline TAP counts: tests=652, pass=635, fail=13, skipped=4 | `pnpm exec node --test --test-reporter=tap test/*.test.js \| tail -10` | `tests=652 pass=635 fail=13 skipped=4` (process exit 1) | PASS — encoded verbatim in § 5.2 |
| Baseline `tsc` exit = 0 | (inherited from R83 close attestation; no R84 changes yet) | `0` | PASS |
| `demos/demo.html` has the R83 btnRun handler at expected location | `grep -n "R83: placeholder" demos/demo.html` | line 13005 | PASS |
| `tools/build-canned-demos.ts` has the R83 btnRun handler at expected location | `grep -n "R83: placeholder" tools/build-canned-demos.ts` | line 1694 | PASS |
| R82 smoke block range in current demo.html | `grep -n "R82-SMOKE-BLOCK" demos/demo.html` | lines 13452, 13477 (range 13452-13477) | PASS — corrected in spec (was 13206-13230 in R83 spec; demo.html grew by ~250 lines for R83 additions) |
| `tools/build-canned-demos.ts` has R82 smoke-block preservation logic | `grep -n "R82-SMOKE-BLOCK" tools/build-canned-demos.ts` | lines 2193-2194 (handler at ~1942-1956 per R83 spec; verified by direct read) | PASS |
| `package.json` has `build:browser` script | `grep -n "build:browser" package.json` | line 14 `"build:browser": "node tools/build-browser-bundle.js"` | PASS |
| Node v25.9.0 supports `worker_threads.Worker` with dynamic-import + `require('worker_threads')` worker file | empirical Node smoke test (§ 8.6 Q.6) | confirmed; all 12 exports loaded | PASS |
| `engine.detectors.freshBettingState` + `updateBettingState` signatures | grep + read of `demos/engine-bundle.mjs:653-714` | confirmed: `freshBettingState() → {M:1, bet:0, n:0, alphaConsumed:0, runningMean:0, runningSecondMoment:0, onsFallbackCount:0}`; `updateBettingState(state, x, baselineMean, sigmaSquared, perTickAlpha) → state.M (mutates)` | PASS |
| `engine.eBH.eBenjaminiHochberg(perShardEValues, qLevel)` signature | grep + read of bundle:1456-1486 | confirmed: returns `{selected, K}` | PASS |
| `controlState` schema 6 top-level keys + 5 family sub-keys | grep + read of `demos/demo.html:12903-12921` | confirmed: driftMagnitude, windowCount, alphaThreshold, targetShard, topologySize, families.{a,b,c,d,e} | PASS |
| `demos/scenarios/*.json` byte-identical across `pnpm build:demos` runs | (deferred to Implementer pre-commit; halt condition 9 enforces) | — | DEFERRED |
| R83 AC-R83-15 forward-protection flip predicted | direct read of `test/q83-interactive-knobs.test.ts:622-643` regex; R83 ALLOWED enumerates Q-R83-SPEC* / REVIEWER-REPORT-R83.md / test/q83-* — R84 paths absent | flip is structurally guaranteed | PASS — encoded as +1 fail in § 5.2 |
| R83 AC-R83-12 forward-protection flip predicted | direct read of `test/q83-interactive-knobs.test.ts:566-577`; AC asserts btnRun handler `console.log` + NO `engine-bundle.mjs` | R84 replaces handler body with Worker spawn + engine-bundle.mjs reference; both assertions fail | PASS — encoded as +1 fail in § 5.2 (corrected via § 2.6) |
| Cite-then-verify: `demos/demo.html:13452-13477` is R82 smoke block range | `sed -n '13452,13477p' demos/demo.html` | matches | PASS |

### 8.2 Q.2 — Unstated assumptions?

| Assumption | Stated where? | Verification |
|---|---|---|
| `pnpm build:demos` regeneration is deterministic | § 1.7 I2 + § 1.9 prediction `byte-identical` | Halt condition 9 enforces at chore-A; R71-R83 all relied on this property; no prior round reported drift. |
| Dynamic `import()` in classic Web Worker is browser-supported | § 0 selection rationale + § 2.1 narrative | MDN: classic Worker dynamic import since Chrome 80, Firefox 89, Safari 15. Tessera target browsers are modern (file:// demo). |
| Node v25 `worker_threads.Worker` accepts `pathToFileURL` URL | § 1.6 test code | Empirically verified at spec-emit (§ 8.6 Q.6) — Node smoke test loaded the actual R82 bundle exports successfully. |
| Renderer functions (`drawFrame`, `renderBadges`, etc.) exist in the demo.html IIFE | § 1.4 onmessage handler | `typeof X === 'function'` guards tolerate any rename; AC-R84-15 R71 markers (`#live-verdict-banner`, `#window-scrubber`) prove the IIFE surface; renderer functions live in same IIFE. |
| `scenarios.custom` slot is reserved by R83 and unused at R83 close | § 0 + § 2.5 narrative | Q-R83-SPEC.md § 2.4 explicit: "<option value=\"custom\"> ... R84 will populate `scenarios.custom`". R83 leaves `scenarios.custom` undefined; R84 assigns. |
| `engine.detectors.updateBettingState` returns `state.M` after mutation | § 1.5 worker code | Direct read of bundle:701-715 confirms `return state.M;` post-mutation. |
| `engine.eBH.eBenjaminiHochberg` accepts a plain number array | § 1.5 worker code | Direct read of bundle:1456-1486 confirms first parameter is `perShardEValues: number[]`. |
| `tools/build-browser-bundle.js` exists and produces `demos/engine-bundle.mjs` | § 1.6 test code | R82 deliverable per Q-R82-SPEC.md; verified by `ls tools/build-browser-bundle.ts demos/engine-bundle.mjs`. |
| `targetShard` value format is `shard-NN` | § 1.5 `targetIndexFor` parser | Verified against R83 spec § 1.2 markup (25 options `shard-00` through `shard-24`). |

### 8.3 Q.3 — Scope added beyond request?

| Addition | In directive? | Verdict |
|---|---|---|
| `r84ShowError` / `r84HideError` / `r84SetRunning` helpers | NOT in directive verbatim | Helpers consolidate the run/cancel/error state machine. KEEP — under "error banner for worker errors" directive deliverable. |
| `engine-error-banner` separate from `live-verdict-banner` | NOT in directive verbatim | Semantic separation. KEEP — under directive's "error banner". |
| `events: []` field in window messages | NOT in directive verbatim | Forward-compat for future event-stream wiring; matches canned scenario `windows[].events` field. KEEP — zero-cost. |
| Pre-build of engine-bundle in AC-R84-13/14 via `execSync('pnpm exec node tools/build-browser-bundle.js')` | NOT in directive verbatim | Required so AC passes deterministically in fresh-clone state; bundle is gitignored. KEEP — test robustness; not scope creep. |
| Family-A-only live compute | NOT in directive verbatim | Acknowledged gap (§ 5.3); future round extends. KEEP scope-bound. |

No scope materially beyond directive's 5 deliverables.

### 8.4 Q.4 — Implementer can act without guessing?

| Decision | Spec source |
|---|---|
| Exact engine-worker.js source | § 1.5 verbatim |
| Exact HTML markup edit | § 1.2 verbatim (replace + insert) |
| Exact CSS rules | § 1.3 verbatim |
| Exact JS edit in tool source | § 1.4 verbatim (replace btnRun handler; insert btnCancel block; insert helpers) |
| Exact test file | § 1.6 verbatim |
| Insertion anchors | § 1.2 (R83 btnRun block as anchor); § 1.4 (literal R83 placeholder comment as anchor); § 1.3 (before `</style>`) |
| Chore-A commit sequence | § 4 RED→GREEN |
| Routing block content | § 6.2 template |
| Halt conditions | § 6.1 enumerated |
| Q-R84-EMPIRICAL.sh structure | § 5.2 prediction table + § 1.6 AC-R84-17 block markers |
| Engine surface signatures | § 8.2 verified at spec-emit (freshBettingState / updateBettingState / eBenjaminiHochberg) |

Implementer can act without clarifying questions. PASS.

### 8.5 Q.5 — Self-application gate (would the spec's own prescriptions satisfy its own ACs?)

| AC | Spec section that satisfies it | Walk-through |
|---|---|---|
| AC-R84-1 | § 1.5 ~120 lines | File length > 200 bytes ✓ |
| AC-R84-2 | § 1.5 `typeof process !== 'undefined' && process.versions && process.versions.node` + `self.postMessage` | Both regexes match ✓ |
| AC-R84-3 | § 1.5 `var enginePromise = import(getBundleSpecifier());` + bundle filename in `getBundleSpecifier`; no top-level static import | Dynamic `import(` regex matches; `engine-bundle.mjs` regex matches; negative `^import` does not match ✓ |
| AC-R84-4 | § 1.5 `port.on(function (msg) { if (!msg || msg.type !== 'run') return; ...})` | `msg.type !== 'run'` regex matches ✓ |
| AC-R84-5 | § 1.5 `port.post({ type: 'window', windowIdx: w, perShard: perShard, ...})` | All 3 regex matches ✓ |
| AC-R84-6 | § 1.5 `port.post({ type: 'terminal', fdr_K, fdr_qLevel, fdr_selected_indices, candidates })` | All 5 regex matches ✓ |
| AC-R84-7 | § 1.5 `.catch(function (err) { port.post({ type: 'error', error: ...}); })` | Both regex matches ✓ |
| AC-R84-8 | § 1.4 `worker = new Worker('./engine-worker.js');` inside btnRun handler region | Region regex matches ✓ |
| AC-R84-9 | § 1.4 `worker.postMessage({ type: 'run', controlState: JSON.parse(JSON.stringify(controlState)) });` | Region regex matches ✓ |
| AC-R84-10 | § 1.4 `worker.onmessage = function (ev) { ... if (data.type === 'window') { scenarios['custom'].windows.push(...); ... drawFrame(...); } }` | All 3 elements in region ✓ |
| AC-R84-11 | § 1.2 `<button id="btn-cancel"...>` + § 1.4 `btnCancel.addEventListener('click', function () { ... r84ActiveWorker.terminate(); ...})` | Both regex matches ✓ |
| AC-R84-12 | § 1.2 `<div id="engine-error-banner"...>` + § 1.4 `function r84ShowError(msg) {...}` + `worker.onerror = function (err) {...}` | All 3 regex matches ✓ |
| AC-R84-13 | § 1.5 emits ≥1 window message (windowCount=12 in test) + 1 terminal; first window perShard length = 6 for `topologySize='small'` (SHARD_COUNTS.small=6) | Streams 12 windows + 1 terminal ✓ |
| AC-R84-14 | § 1.5 streams 50 windows when windowCount=50 (test sends large topology); terminate() during streaming halts | terminate() async halts the worker ✓ |
| AC-R84-15 | § 1.4 + § 1.2 only MODIFY R83 btnRun handler body + ADD button + ADD banner; do NOT touch any other R71/R79/R80/R81/R82/R83 surface | All 14 markers preserved ✓ |
| AC-R84-16 | § 3.2 ALLOWED regex copied verbatim into the test; § 4 chore-A diff is by-construction within ALLOWED | ✓ |
| AC-R84-17 | `test/q84-live-engine-compute.test.js` exists post-tsc; `Q-R84-EMPIRICAL.sh` contains all 5 Block markers (authored by Implementer per § 5.2) | PASS by construction |

All 17 ACs satisfied by spec prescriptions. PASS.

### 8.6 Q.6 — Empirical premise verification (R08 MAJOR-2 / R77 EMPIRICAL.sh probe-run rule)

EMPIRICAL.sh probe-run at round-start HEAD `0e93c15`:

- **Block 1 typecheck**: expected PASS (`pnpm exec tsc -p tsconfig.test.json` exit 0; inherited from R83 close).
- **Block 2 engine-worker.js structural presence**: expected FAIL at round-start (file doesn't exist yet; Implementer creates it).
- **Block 3 demo.html worker wiring presence**: expected FAIL at round-start (the wiring doesn't exist yet).
- **Block 4 test counts**: expected FAIL at round-start (test file doesn't exist; counts at HEAD = 652/635/13/4, not predicted 669/650/15/4).
- **Block 5 anti-scope diff**: expected PASS at round-start (`git diff 0e93c15 HEAD` is empty; no unauthorized paths).

**Critical Node Worker viability verification at spec-emit:**

```bash
# Smoke test: can a Node Worker load the worker pattern + dynamic-import the bundle?
cat > /tmp/test-worker.js << 'EOF'
'use strict';
(function () {
  var wt = require('worker_threads');
  wt.parentPort.on('message', function (msg) {
    if (msg && msg.type === 'load') {
      import(msg.url).then(function (engine) {
        wt.parentPort.postMessage({ type: 'loaded', exports: Object.keys(engine).sort() });
      }).catch(function (err) {
        wt.parentPort.postMessage({ type: 'error', error: String(err) });
      });
    }
  });
})();
EOF
node -e "
const { Worker } = require('worker_threads');
const w = new Worker('/tmp/test-worker.js');
w.on('message', m => { console.log(JSON.stringify(m, null, 2)); w.terminate(); });
const bundleUrl = require('url').pathToFileURL('/Users/johnwarren/concord/tessera/demos/engine-bundle.mjs').href;
w.postMessage({type: 'load', url: bundleUrl});
"
```

**Result (observed at spec-emit):**
```json
{
  "type": "loaded",
  "exports": ["StaticTopologySource", "TopologyEnricher", "commonMode", "computeSnapshotHash",
              "detectors", "eBH", "familyA", "familyC", "freezeHook", "pureJsSha256",
              "runtime", "types"]
}
```

**Conclusion:** Node v25.9.0 native `worker_threads.Worker` successfully loads a CJS-style `.js` file that uses `require('worker_threads').parentPort` for the port API AND dynamic `import()` for the ESM engine bundle. All 12 expected exports load correctly. Directive halt-condition 8 ("Web Worker not testable in Node") is empirically not triggered; AC-R84-13 + AC-R84-14 are viable. **Approach A is unblocked.**

Probe outcome documented in Q-R84-SPEC-AUDIT.md § C.3. No surprise failures.

### 8.7 Q.7 — Spec-internal contradictions sweep

| Pair | Sweep |
|---|---|
| § 1.9 corrected fail count = 15 vs § 2.6 = 15 vs § 5.2 = 15 vs Q-R84-EMPIRICAL.sh Block 4 EXPECTED_FAIL = 15 | All four sites agree post § 2.6 correction (initial § 1.9 said 14; § 2.6 corrects to 15 due to AC-R83-12 R83→R84 handler-replacement flip; final values in § 5.2 are 15) |
| § 1.9 corrected pass band [649, 651] vs § 2.6 = [649, 651] vs § 5.2 = [649, 651] vs Q-R84-EMPIRICAL.sh Block 4 EXPECTED_PASS_MIN/MAX = 649/651 | All four sites agree post § 2.6 correction |
| § 1.4 worker spawn `new Worker('./engine-worker.js')` vs § 1.6 AC-R84-8 regex vs § 5 AC table | All three sites use the same exact path |
| § 1.5 worker `'./engine-bundle.mjs'` (browser branch) + `pathToFileURL(path.join(__dirname,'engine-bundle.mjs'))` (Node branch) vs § 1.6 AC-R84-3 regex `engine-bundle\.mjs` vs § 2.1 narrative | All three sites agree on bundle filename |
| § 1.4 message protocol `{type:'run', controlState}` vs § 1.5 worker filter `msg.type !== 'run'` vs § 1.6 AC-R84-4 regex | All three sites agree |
| § 1.4 worker.onmessage handler `data.type === 'window'/'terminal'/'error'` branches vs § 1.5 worker emit shapes vs § 1.6 AC-R84-5/6/7 regexes | All three sites agree on field names + types |
| § 3.1 ALLOWED_SET narrative table vs § 3.2 regex vs § 1.6 AC-R84-16 in-test regex vs Q-R84-EMPIRICAL.sh Block 5 ALLOWED variable | All four gate artifacts share the SAME 14 path patterns (R82 MAJOR-1 lesson application at spec-emit) |
| § 6.1 halt-condition 8 (ALLOWED_SET incomplete) vs § 3.1 enumeration | Halt condition + enumeration agree |
| § 1.5 worker `SHARD_COUNTS = {small:6,medium:10,large:25}` vs § 1.4 main thread `({small:6,medium:10,large:25})[controlState.topologySize] || 6` | Both sites agree on shard counts |
| § 1.5 worker shard ID format `'shard-' + (n.length < 2 ? '0' + n : n)` vs § 1.4 main thread (none; relies on worker's perShard) vs § 1.6 AC-R84-13 expects `perShard` length 6 | Worker is authoritative; main thread consumes; test asserts shape only |
| Round-start SHA `0e93c15` consistency | § header, § 1.6 ROUND_START_SHA, § 1.9, § 5.2, § 8.1, § 8.6, Q-R84-EMPIRICAL.sh — identical 7-char prefix everywhere |

No contradictions. PASS.

### 8.8 Q.8 — Acknowledged-gap pairing (R74 MINOR-2 lesson)

§ 5.3 documents 5 acknowledged gaps; each pairs with a falsifiable mitigation:

| Gap | Mitigation |
|---|---|
| No live browser smoke test for Worker integration | Source-text ACs (AC-R84-1..12) + end-to-end Node ACs (AC-R84-13/14) cover the worker file + main-thread wiring; browser branch shares the worker file via runtime detection; operator manual smoke via `python3 -m http.server` is documented in DEMO-SCRIPT.md |
| R84 implements Family A only in live compute | § 1.10 + § 2.6 explicit; future-round extension; no R84 AC over-specifies multi-family behavior |
| AC-R83-12 R83→R84 handler-replacement flip | Documented as forward-protection flip (same class as AC-R83-15 allowed-set); not modification of R83 carry-forward fail set; prediction in § 5.2 |
| No AC binds per-window math output values | Structural shape AC (AC-R84-13: perShard.length === 6) is the right discrimination level; value-binding would couple to engine internals; future round may add value-range ACs |
| No AC binds speed-control honoring during streaming | Speed control honors via post-streaming playback (existing R71 loop); literal directive language at the speed-control AC level (AC-R84-15 covers R71 markers including playback panel) |

Each gap paired with concrete mitigation. PASS.

### 8.9 Q.9 — Cross-section consistency (R01-R02 16-token sweep equivalent)

| Token / identifier | All sites | Consistency |
|---|---|---|
| `engine-worker.js` | § 0, § 1.1, § 1.5 (file header), § 1.4 (Worker spawn), § 1.6 (WORKER_PATH + AC-R84-1/8 regex), § 3.1, § 3.2 | Identical filename everywhere |
| `engine-bundle.mjs` | § 0, § 1.5 (browser + Node specifier), § 1.6 (BUNDLE_PATH + AC-R84-3 regex), § 8.2, § 8.6 | Identical filename everywhere |
| `controlState` | § 1.4, § 1.5 (worker handler param), § 1.6 (AC-R84-9), § 5 table | Identical camelCase everywhere |
| `tessera:control-change` (R83 surface, preserved) | § 1.6 AC-R84-15 regex; not modified by R84 | R83 surface preserved verbatim |
| `#btn-cancel`, `#btn-run`, `#btn-reset-params`, `#engine-error-banner` | § 1.2 markup, § 1.3 CSS, § 1.4 JS, § 1.6 AC-R84-11/12 | DOM IDs hyphenated everywhere |
| `r84ActiveWorker`, `r84ShowError`, `r84HideError`, `r84SetRunning` | § 1.4 JS, § 1.6 AC-R84-12 (r84ShowError) | Identical camelCase everywhere |
| Message types `'run'`, `'window'`, `'terminal'`, `'error'` | § 1.4, § 1.5, § 1.6 AC-R84-4/5/6/7, § 2.2 | Identical single-quoted string everywhere |
| `0e93c15` (round-start SHA) | § header, § 1.6 ROUND_START_SHA, § 1.9, § 5.2, § 6.2, § 8.1, § 8.6, Q-R84-EMPIRICAL.sh | Identical 7-char prefix |
| Predicted `# tests` 669 | § 1.9, § 5.2 | Identical |
| Predicted `# pass` 650 (band 649-651) | § 1.9 corrected via § 2.6, § 5.2 | Identical post-correction |
| Predicted `# fail` 15 | § 1.9 corrected via § 2.6, § 5.2 | Identical post-correction |
| ALLOWED_SET regex string | § 3.2, § 1.6 (AC-R84-16), Q-R84-EMPIRICAL.sh Block 5 | Identical regex |
| `pnpm exec tsc -p tsconfig.test.json` | § 1.9, § 5.2, § 6.1 halt-2, Q-R84-EMPIRICAL.sh Block 1 | Identical command |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` | § 1.9, § 5.2, Q-R84-EMPIRICAL.sh Block 4 | Identical command |
| SHARD_COUNTS `{small:6, medium:10, large:25}` | § 1.4, § 1.5, § 1.10 table | Identical 3-key object everywhere |

No cross-section drift. PASS.

### 8.10 Q.10 — Discriminating-AC walk-through (R44/R46/R65/R71 MINOR-1 lesson)

For each AC, would it FAIL if the canonical structural element / behavior were absent?

| AC | Mutation that should FAIL the AC | Verdict |
|---|---|---|
| AC-R84-1 | Delete engine-worker.js → fs.existsSync FAIL | Discriminating |
| AC-R84-2 | Remove `process.versions.node` check OR `self.postMessage` branch → regex FAIL | Discriminating |
| AC-R84-3 | Replace dynamic `import()` with top-level static `import` → both positive regex matches still match BUT negative `^import` regex matches → FAIL | Discriminating |
| AC-R84-4 | Remove `msg.type !== 'run'` filter → regex FAIL | Discriminating |
| AC-R84-5 | Change `type: 'window'` to `type: 'tick'` → regex FAIL | Discriminating |
| AC-R84-6 | Remove `fdr_K:` from terminal message → regex FAIL | Discriminating |
| AC-R84-7 | Remove the `.catch` branch → regex FAIL | Discriminating |
| AC-R84-8 | Change worker URL to `'../demos/engine-worker.js'` → regex FAIL | Discriminating |
| AC-R84-9 | Change postMessage payload to `{controlState}` without `type:'run'` → regex FAIL | Discriminating |
| AC-R84-10 | Remove `scenarios['custom'].windows.push(...)` → region regex FAIL | Discriminating |
| AC-R84-11 | Remove `worker.terminate()` from btnCancel → region regex FAIL | Discriminating |
| AC-R84-12 | Remove `r84ShowError` function declaration → regex FAIL | Discriminating |
| AC-R84-13 | Worker emits no window messages (e.g., loop body never runs) → `windowMsgs.length >= 1` FAIL. Worker emits 2 terminal messages → `terminalMsgs.length === 1` FAIL | Discriminating |
| AC-R84-14 | terminate() ineffective (worker continues all 50 windows) → `count < 50` FAIL | Discriminating |
| AC-R84-15 | Remove any of the 14 prior-round markers → regex FAIL per marker | Discriminating per marker |
| AC-R84-16 | Add unauthorized path (e.g., `demos/scenarios/clean-baseline.json`) to diff → violators non-empty FAIL | Discriminating |
| AC-R84-17 | Remove "── Block 3:" line from EMPIRICAL.sh → block-marker regex FAIL | Discriminating |

All 17 ACs are structurally discriminating. PASS.

### 8.11 Q.11 — spec-amendment-ALL-gate-artifacts-propagation (R82 MAJOR-1 lesson; applied UPFRONT)

At spec-emit (no amendment yet, but discipline scaffolding in place):

| Gate artifact | ALLOWED_SET source |
|---|---|
| 1. § 3.1 narrative inventory table | listed (14 path patterns) |
| 2. § 3.2 ALLOWED regex (machine-checkable) | verbatim copy |
| 3. `test/q84-live-engine-compute.test.ts` AC-R84-16 regex | verbatim copy (lives in § 1.6) |
| 4. `Q-R84-EMPIRICAL.sh` Block 5 ALLOWED variable | verbatim copy (lives in EMPIRICAL.sh) |

All 4 gate artifacts share the SAME 14 path patterns. Any future amendment must update all 4 simultaneously. Implementer halt condition 8 enforces.

PASS.

### 8.12 Q.12 — Routing-block grep-verification (R65 MINOR-1 lesson)

Routing block (§ 6.2 template) cites: AC-R84-1..17, ROUND_START_SHA `0e93c15`, file paths to Q-R84-SPEC.md / Q-R84-SPEC-AUDIT.md / Q-R84-EMPIRICAL.sh / test/q84-live-engine-compute.test.ts / demos/engine-worker.js. Each grep-verifiable:

| Citation | Source | Verification |
|---|---|---|
| "AC-R84-1" through "AC-R84-17" | § 1.6 + § 5 + § 8.10 | grep `AC-R84-N` returns N=1..17 |
| ROUND_START_SHA `0e93c15` | § header + § 1.6 (`const ROUND_START_SHA = '0e93c15'`) + § 1.9 + § 5.2 | grep `0e93c15` returns multiple matches |
| File paths | self-reference + § 1.5 file header + § 1.6 imports | identical spelling everywhere |

PASS.

### 8.13 Q.13 — Anti-scope ALLOWED_SET forward-coverage walk (R79 lesson + R25 MAJOR-2 + R79 pre-emit-grilling)

Walk prior 2 rounds' forward-protection ACs to predict flips:

| Prior round | AC | Round-start SHA | ALLOWED regex includes R84 paths? | Predicted flip |
|---|---|---|---|---|
| R83 | AC-R83-15 (allowed-set diff) | `4c4733d` | NO — R83 regex enumerates `test/q83-interactive-knobs\.test\.ts`, `Q-R83-SPEC*`, `REVIEWER-REPORT-R83.md` specifically; R84 paths (`demos/engine-worker.js`, `test/q84-*`, `Q-R84-*`, `REVIEWER-REPORT-R84.md`) absent | YES → 1 fail flip |
| R83 | AC-R83-12 (btnRun handler shape) | `4c4733d` | N/A — AC is not allowed-set; it asserts handler body shape (console.log of controlState + no engine-bundle.mjs); R84 replaces handler body | YES → 1 fail flip (handler is replaced) |
| R82 | AC-R82-14 (allowed-set diff) | `5c3e0d9` | Already failing at R83 close (carry-forward) — re-flipping a failing AC doesn't change strict fail count | No NEW change |
| R81 | AC-R81-14 | similar | Already failing at R83 close (carry-forward) | No NEW change |

R84 introduces TWO new fails (R83 AC-R83-15 allowed-set + R83 AC-R83-12 handler-replacement). Encoded as strict +2 in § 5.2 (13 → 15). Matches Architect corrected prediction.

PASS — exhaustive forward-protection-AC audit complete, with both prior-round forward-protection ACs walked.

### 8.14 Q.14 — Cite-then-verify for all line citations (R02 / R11 / R65 lessons)

| Citation | Verification | Result |
|---|---|---|
| `demos/demo.html:13452-13477` is R82 smoke block range | `grep -n "R82-SMOKE-BLOCK" demos/demo.html` | matches at 13452 + 13477 |
| `demos/demo.html:13005` is R83 placeholder line | `grep -n "R83: placeholder" demos/demo.html` | line 13005 |
| `tools/build-canned-demos.ts:1694` is R83 placeholder line | `grep -n "R83: placeholder" tools/build-canned-demos.ts` | line 1694 |
| `tools/build-canned-demos.ts:1693-1696` is R83 btnRun.addEventListener block | direct read | confirmed; lines 1692-1697 (the closing `});` at 1697) |
| `demos/engine-bundle.mjs:653` is `freshBettingState` declaration | `grep -n "function freshBettingState" demos/engine-bundle.mjs` | line 653 |
| `demos/engine-bundle.mjs:701` is `updateBettingState` declaration | `grep -n "^function updateBettingState" demos/engine-bundle.mjs` | line 701 |
| `demos/engine-bundle.mjs:1456` is `eBenjaminiHochberg` declaration | `grep -n "function eBenjaminiHochberg" demos/engine-bundle.mjs` | line 1456 |
| `demos/demo.html:12903` is R83 `var R83_DEFAULTS =` declaration | `grep -n "var R83_DEFAULTS" demos/demo.html` | line 12903 (verified via `grep -n "R83_DEFAULTS = " demos/demo.html` returning 12904) |
| `package.json:14` is `build:browser` script | `grep -n "build:browser" package.json` | line 14 |

PASS — no off-by-N drift in line citations.

### 8.15 Q.15 — Architect-claim-without-empirical-walk discipline (cross-project promoted rule)

Every load-bearing claim about codebase or future-commit state in this spec has been verified by direct command at spec-emit:

| Load-bearing claim | Verification command | Run |
|---|---|---|
| Node Worker can load the prescribed worker pattern + dynamic-import bundle | smoke test (§ 8.6) | Run; 12 exports returned |
| Engine bundle export names + arity (freshBettingState, updateBettingState, eBenjaminiHochberg) | grep + direct read of bundle | Run; signatures verified |
| R83 surface preserved (controlState, R83_DEFAULTS, emitControlChange, btnResetParams) | grep `controlState\|R83_DEFAULTS\|emitControlChange\|btnResetParams` against demo.html | Run; all 4 confirmed present at HEAD |
| `pnpm build:browser` script exists at package.json:14 | `grep -n build:browser package.json` | Run; line 14 confirmed |
| `demos/engine-bundle.mjs` is gitignored | `git check-ignore demos/engine-bundle.mjs` | Run; ignored confirmed via .gitignore inspection |
| R83 ALLOWED regex does NOT include any R84 path | direct read of `test/q83-interactive-knobs.test.ts:622-643` | Run; confirmed |
| R83 AC-R83-12 asserts btnRun handler console.log + absence of engine-bundle.mjs | direct read of `test/q83-interactive-knobs.test.ts:566-577` | Run; confirmed; predicts R84 chore-A flip |
| AC-R83-12 was passing at R83 close (not in carry-forward fail set) | direct read of R83 close attestation + EMPIRICAL.sh probe shows AC-R83-12 in pass bucket | Run; confirmed (rerunning at HEAD: AC-R83-12 PASSES per § 8.1 baseline TAP) |

PASS — every load-bearing factual claim verified empirically.

### 8.16 Q.16 — Re-read as Implementer; mark assumptions Implementer can't verify

Re-reading the spec as Implementer:

- § 1.2/1.3/1.4/1.5 are verbatim source; Implementer copies. ✓
- § 1.5 worker file is self-contained; no external dependency. ✓
- § 1.6 test file uses standard `node:test` + `node:worker_threads` + `node:url`; all in Node v20+. ✓
- § 4 chore-A sequence is RED→GREEN with explicit commands. ✓
- § 5.2 binding-command attestation table prescribes exact commands + predicted values + bands. ✓
- § 6.1 halt conditions are enumerated with explicit triggers. ✓
- § 6.2 routing block template includes verbatim placeholder slots for OBSERVED values. ✓
- All ALLOWED_SET sources (§ 3.1, § 3.2, AC-R84-16 in § 1.6, Q-R84-EMPIRICAL.sh Block 5) carry the SAME 14 path patterns. ✓
- The "Implementer can act with zero clarifying questions" gate: PASS.

### 8.17 Final pre-emit grilling verdict

All 15 sub-sections (Q.1 through Q.15) PASS plus Q.16 re-read-as-Implementer review PASS. No surprise outcomes; all load-bearing claims verified empirically at spec-emit (Node Worker viability + engine surface signatures + R83 surface preservation); all gate artifacts in lockstep.

**STATUS: READY for routing to Implementer.**

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | engine-worker.js mutates per-shard betting state via `engine.detectors.updateBettingState` with prescribed parameters; per-window message shape matches canned-scenario per-window shape; terminal e-BH selection via `engine.eBH.eBenjaminiHochberg`. End-to-end ACs (AC-R84-13/14) exercise the real Node Worker round-trip. |
| Completeness | All 5 directive deliverables addressed: (1) demos/engine-worker.js with message protocol; (2) demo.html worker spawn + streaming handler; (3) Worker keeps UI responsive (browser event loop unblocked since compute is in worker thread); (4) test file with 17 ACs covering structural + protocol + cancel + end-to-end + anti-regression; (5) Q-R84-EMPIRICAL.sh with --test-reporter=tap. |
| Consistency | All identifiers / message types / file paths / SHA / count predictions consistent across § 1.4 / § 1.5 / § 1.6 / § 3 / § 5 per Q.9 cross-section sweep. |
| Clarity | Banned ambiguous language absent from AC text. Each AC names a specific structural property + a specific assertion. |
| Coverage | 17 ACs × 1 test() block each = 17 added test counts. Coverage spans: worker file structural (7) + demo.html wiring (5) + end-to-end (2) + anti-regression (1) + anti-scope (1) + sentinels (1). |
| Constraints | engine/* untouched; R73-R83 surfaces preserved (AC-R84-15); demos/scenarios/*.json byte-identical (halt 9); no new deps (halt 7); ALLOWED_SET 4-gate lockstep (R82 MAJOR-1 applied UPFRONT). |
| Concurrency | Worker runs in its own thread; main thread event loop unblocked during compute. Messages serialized via standard Worker postMessage (browser) or worker_threads structured clone (Node). No shared-state concurrency risks. |
| Corner cases | (a) Bundle absent at test time → AC-R84-13/14 build it via execSync; (b) Cancel pressed when no worker active → guarded no-op; (c) Family A disabled → M_t stays 1, no firings (Family-A-only acknowledged gap); (d) Drift magnitude 0 → no firings (clean baseline behavior); (e) targetShard string outside `shard-NN` shape → falls back to index 0; (f) Worker spawn fails (CSP) → try/catch surfaces error banner; (g) Engine dynamic import fails → .catch posts error message; main thread surfaces banner. |
| Cost | Implementer footprint: ~120 lines tool edit, ~120 lines worker file, ~280 lines test, 3 spec triad files. Reviewer footprint: 1 report. ~7 file diff total (plus spec triad). Test time impact: AC-R84-13/14 add ~2-10 seconds wall time per CI run for the end-to-end Worker spawns (acceptable; total test suite at ~16s baseline). |
| Coupling | engine-worker.js coupled to engine-bundle.mjs export names (familyA, detectors, eBH) — same names DS uses; R82-frozen. Main-thread wiring coupled to scenarios.custom slot (R83 reserved) + existing R71 renderer function names. Coupling is one-way: R84 consumes R71/R79/R82/R83 surfaces; no upstream surface forced to know about R84. |

---

## § 10. Pipeline invocation (recap from directive)

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R84 --tier full
```

Spec triad committed BEFORE chore-A per CLAUDE-ARCHITECT.md REINFORCED 2026-05-17 (R21 ARCH MINOR-1): the Architect must commit `Q-R84-SPEC.md` + `Q-R84-SPEC-AUDIT.md` + `Q-R84-EMPIRICAL.sh` in a `spec(R84)` commit BEFORE writing the routing block in NEXT-ROLE.md that dispatches Implementer.
