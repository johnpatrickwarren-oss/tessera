// tools/_build-canned-demos-template-footer-1.ts — HTML footer part 1, VERBATIM.
// Plain template-string fragment; concatenated in the footer index. No logic changes.

export const FOOTER_PART_1 = `
  <script>
(function () {
  'use strict';

  // ── Palette (10 dark-friendly colors) ──
  var COLORS = [
    '#58a6ff','#3fb950','#d29922','#f78166','#a371f7',
    '#79c0ff','#56d364','#e3b341','#ff7b72','#bc8cff',
  ];

  // ── State ──
  var scenarios = {};
  var currentName = 'clean-baseline';
  var currentWindowIdx = 0;
  var playing = false;
  var intervalHandle = null;
  var baseIntervalMs = 500;
  var isSyncingScrubber = false;

  // ── Load scenario data from inlined script blocks ──
  var names = [
    'clean-baseline','sdc-drift','common-mode-rack','event-conditional',
    'fdr-multiple-testing','hierarchical-evalue','sparse-data-resilience',
    'topology-spanning-common-mode',
  ];
  for (var i = 0; i < names.length; i++) {
    var el = document.getElementById('tessera-scenario-' + names[i]);
    if (el) scenarios[names[i]] = JSON.parse(el.textContent);
  }

  // ── DOM refs ──
  var selector    = document.getElementById('scenario-selector');
  var btnPlay     = document.getElementById('btn-play');
  var btnPause    = document.getElementById('btn-pause');
  var btnReset    = document.getElementById('btn-reset');
  var speedSel    = document.getElementById('speed-selector');
  var winInd      = document.getElementById('window-indicator');
  var svgEl       = document.getElementById('mt-chart');
  var badgesEl    = document.getElementById('verdict-badges');
  var auditEl     = document.getElementById('audit-list');
  var reasoningEl = document.getElementById('reasoning-body');
  var actionsEl   = document.getElementById('next-actions-list');

  // ── R79: new DOM refs ──
  var liveBannerScenarioEl = document.getElementById('live-scenario-name');
  var liveBannerTickEl     = document.getElementById('live-tick-indicator');
  var liveBannerStatusEl   = document.getElementById('live-verdict-status');
  var metricsBodyEl        = document.getElementById('metrics-body');
  var detectorsBodyEl      = document.getElementById('detectors-body');
  var provenanceBodyEl     = document.getElementById('provenance-body');
  var windowScrubber       = document.getElementById('window-scrubber');

  // ── R83: interactive control panel — state management (UI surface; R84 wires to engine) ──
  var R83_DEFAULTS = {
    driftMagnitude: 0.10,
    windowCount: 50,
    alphaThreshold: 0.005,
    targetShard: 'shard-00',
    topologySize: 'small',
    families: { a: true, b: true, c: true, d: true, e: true },
  };

  var controlState = {
    driftMagnitude: R83_DEFAULTS.driftMagnitude,
    windowCount: R83_DEFAULTS.windowCount,
    alphaThreshold: R83_DEFAULTS.alphaThreshold,
    targetShard: R83_DEFAULTS.targetShard,
    topologySize: R83_DEFAULTS.topologySize,
    families: {
      a: R83_DEFAULTS.families.a, b: R83_DEFAULTS.families.b,
      c: R83_DEFAULTS.families.c, d: R83_DEFAULTS.families.d,
      e: R83_DEFAULTS.families.e,
    },
  };

  var ctrlDriftMag       = document.getElementById('param-drift-magnitude');
  var ctrlDriftMagVal    = document.getElementById('param-drift-magnitude-value');
  var ctrlWindowCount    = document.getElementById('param-window-count');
  var ctrlWindowCountVal = document.getElementById('param-window-count-value');
  var ctrlAlphaThreshold = document.getElementById('param-alpha-threshold');
  var ctrlTargetShard    = document.getElementById('param-target-shard');
  var ctrlTopologySize   = document.getElementById('param-topology-size');
  var ctrlFamilyA        = document.getElementById('param-family-a');
  var ctrlFamilyB        = document.getElementById('param-family-b');
  var ctrlFamilyC        = document.getElementById('param-family-c');
  var ctrlFamilyD        = document.getElementById('param-family-d');
  var ctrlFamilyE        = document.getElementById('param-family-e');
  var btnRun             = document.getElementById('btn-run');
  var btnResetParams     = document.getElementById('btn-reset-params');

  function emitControlChange() {
    document.dispatchEvent(new CustomEvent('tessera:control-change', {
      detail: {
        driftMagnitude: controlState.driftMagnitude,
        windowCount: controlState.windowCount,
        alphaThreshold: controlState.alphaThreshold,
        targetShard: controlState.targetShard,
        topologySize: controlState.topologySize,
        families: {
          a: controlState.families.a, b: controlState.families.b,
          c: controlState.families.c, d: controlState.families.d,
          e: controlState.families.e,
        },
      },
    }));
  }

  if (ctrlDriftMag) {
    ctrlDriftMag.addEventListener('input', function () {
      controlState.driftMagnitude = parseFloat(ctrlDriftMag.value);
      if (ctrlDriftMagVal) ctrlDriftMagVal.textContent = controlState.driftMagnitude.toFixed(3);
      emitControlChange();
    });
  }
  if (ctrlWindowCount) {
    ctrlWindowCount.addEventListener('input', function () {
      controlState.windowCount = parseInt(ctrlWindowCount.value, 10);
      if (ctrlWindowCountVal) ctrlWindowCountVal.textContent = String(controlState.windowCount);
      emitControlChange();
    });
  }
  if (ctrlAlphaThreshold) {
    ctrlAlphaThreshold.addEventListener('change', function () {
      controlState.alphaThreshold = parseFloat(ctrlAlphaThreshold.value);
      emitControlChange();
    });
  }
  if (ctrlTargetShard) {
    ctrlTargetShard.addEventListener('change', function () {
      controlState.targetShard = ctrlTargetShard.value;
      emitControlChange();
    });
  }
  if (ctrlTopologySize) {
    ctrlTopologySize.addEventListener('change', function () {
      controlState.topologySize = ctrlTopologySize.value;
      emitControlChange();
    });
  }
  function wireFamilyCheckbox(el, key) {
    if (!el) return;
    el.addEventListener('change', function () {
      controlState.families[key] = el.checked;
      emitControlChange();
    });
  }
  wireFamilyCheckbox(ctrlFamilyA, 'a');
  wireFamilyCheckbox(ctrlFamilyB, 'b');
  wireFamilyCheckbox(ctrlFamilyC, 'c');
  wireFamilyCheckbox(ctrlFamilyD, 'd');
  wireFamilyCheckbox(ctrlFamilyE, 'e');

  // ── R84: live engine compute via Web Worker (replaces R83 placeholder) ──
  var btnCancel         = document.getElementById('btn-cancel');
  var engineErrorBanner = document.getElementById('engine-error-banner');
  var r84ActiveWorker   = null;

  // ── R85: mode toggle + loading spinner + run-status affordance ──
  var modeToggleEl           = document.getElementById('mode-toggle');
  var modeRadios             = document.querySelectorAll('input[name="tessera-mode"]');
  var engineLoadingIndicator = document.getElementById('engine-loading-indicator');
  var engineRunStatus        = document.getElementById('engine-run-status');
  var currentMode            = 'canned';

  function setMode(mode) {
    if (mode !== 'canned' && mode !== 'live') return;
    currentMode = mode;
    if (document.body && document.body.setAttribute) {
      document.body.setAttribute('data-mode', mode);
    }
    // Sync element-level disabled to match CSS gray-out.
    var controlPanelIds = [
      'param-drift-magnitude', 'param-window-count', 'param-alpha-threshold',
      'param-target-shard', 'param-topology-size',
      'param-family-a', 'param-family-b', 'param-family-c',
      'param-family-d', 'param-family-e',
      'btn-run', 'btn-reset-params',
    ];
    for (var ci = 0; ci < controlPanelIds.length; ci++) {
      var el = document.getElementById(controlPanelIds[ci]);
      if (el) el.disabled = (mode === 'canned');
    }
    if (selector) selector.disabled = (mode === 'live');
    // Reset run-status when switching modes.
    if (engineRunStatus) engineRunStatus.textContent = '';
    if (engineLoadingIndicator) engineLoadingIndicator.setAttribute('hidden', '');
  }

  function r85ShowLoadingSpinner() {
    if (engineLoadingIndicator) engineLoadingIndicator.removeAttribute('hidden');
  }
  function r85HideLoadingSpinner() {
    if (engineLoadingIndicator) engineLoadingIndicator.setAttribute('hidden', '');
  }
  function updateRunStatus(stage, payload) {
    if (!engineRunStatus) return;
    if (stage === 'running') {
      var idx = (payload && typeof payload.windowIdx === 'number') ? payload.windowIdx : 0;
      var total = (payload && typeof payload.totalWindows === 'number') ? payload.totalWindows : 0;
      engineRunStatus.textContent = 'Running window ' + (idx + 1) + ' / ' + total;
      engineRunStatus.classList.remove('complete');
    } else if (stage === 'complete') {
      var scen = (payload && payload.scenario) || {};
      var nWin = (scen.windows || []).length;
      var t = scen.terminal_state || {};
      var k = Array.isArray(t.fdr_selected_indices) ? t.fdr_selected_indices.length : 0;
      engineRunStatus.textContent =
        'Run complete — ' + k + ' selected of ' + nWin + ' windows. Click Run to recompute.';
      engineRunStatus.classList.add('complete');
    } else if (stage === 'error') {
      engineRunStatus.textContent = 'Run failed — see error banner. Click Run to retry.';
      engineRunStatus.classList.remove('complete');
    } else if (stage === 'cancelled') {
      engineRunStatus.textContent = 'Run cancelled. Click Run to start a new run.';
      engineRunStatus.classList.remove('complete');
    } else if (stage === 'reset') {
      engineRunStatus.textContent = '';
      engineRunStatus.classList.remove('complete');
    }
  }

  for (var mi = 0; mi < modeRadios.length; mi++) {
    modeRadios[mi].addEventListener('change', function (ev) {
      var t = ev && ev.target;
      if (t && t.value) setMode(t.value);
    });
  }

  // Apply initial mode (Canned by default). Idempotent if invoked multiple times.
  setMode('canned');

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
      r85ShowLoadingSpinner();
      updateRunStatus('reset');
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
          if (windowScrubber) windowScrubber.max = String(Math.max(0, scenarios['custom'].windows.length - 1));
          if (data.windowIdx === 0) r85HideLoadingSpinner();
          updateRunStatus('running', { windowIdx: data.windowIdx, totalWindows: scenarios['custom'].params.window_count });
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
          r85HideLoadingSpinner();
          updateRunStatus('complete', { scenario: scenarios['custom'] });
          r84SetRunning(false);
          r84ActiveWorker = null;
        } else if (data.type === 'error') {
          r84ShowError(data.error || 'unknown engine error');
          r85HideLoadingSpinner();
          updateRunStatus('error');
          r84SetRunning(false);
          r84ActiveWorker = null;
        }
      };
      worker.onerror = function (err) {
        r84ShowError(String(err && err.message || err));
        r85HideLoadingSpinner();
        updateRunStatus('error');
        r84SetRunning(false);
        r84ActiveWorker = null;
      };
      worker.postMessage({ type: 'run', controlState: JSON.parse(JSON.stringify(controlState)) });
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', function () {
      if (r84ActiveWorker) { try { r84ActiveWorker.terminate(); } catch (e) {} r84ActiveWorker = null; }
      r85HideLoadingSpinner();
      updateRunStatus('cancelled');
      r84SetRunning(false);
    });
  }

  if (btnResetParams) {
    btnResetParams.addEventListener('click', function () {
      controlState.driftMagnitude = R83_DEFAULTS.driftMagnitude;
      controlState.windowCount = R83_DEFAULTS.windowCount;
      controlState.alphaThreshold = R83_DEFAULTS.alphaThreshold;
      controlState.targetShard = R83_DEFAULTS.targetShard;
      controlState.topologySize = R83_DEFAULTS.topologySize;
      controlState.families.a = R83_DEFAULTS.families.a;
      controlState.families.b = R83_DEFAULTS.families.b;
      controlState.families.c = R83_DEFAULTS.families.c;
      controlState.families.d = R83_DEFAULTS.families.d;
      controlState.families.e = R83_DEFAULTS.families.e;
      if (ctrlDriftMag)       ctrlDriftMag.value       = String(R83_DEFAULTS.driftMagnitude);
      if (ctrlDriftMagVal)    ctrlDriftMagVal.textContent = R83_DEFAULTS.driftMagnitude.toFixed(3);
      if (ctrlWindowCount)    ctrlWindowCount.value    = String(R83_DEFAULTS.windowCount);
      if (ctrlWindowCountVal) ctrlWindowCountVal.textContent = String(R83_DEFAULTS.windowCount);
      if (ctrlAlphaThreshold) ctrlAlphaThreshold.value = String(R83_DEFAULTS.alphaThreshold);
      if (ctrlTargetShard)    ctrlTargetShard.value    = R83_DEFAULTS.targetShard;
      if (ctrlTopologySize)   ctrlTopologySize.value   = R83_DEFAULTS.topologySize;
      if (ctrlFamilyA) ctrlFamilyA.checked = R83_DEFAULTS.families.a;
      if (ctrlFamilyB) ctrlFamilyB.checked = R83_DEFAULTS.families.b;
      if (ctrlFamilyC) ctrlFamilyC.checked = R83_DEFAULTS.families.c;
      if (ctrlFamilyD) ctrlFamilyD.checked = R83_DEFAULTS.families.d;
      if (ctrlFamilyE) ctrlFamilyE.checked = R83_DEFAULTS.families.e;
      emitControlChange();
    });
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_W = 800, SVG_H = 400;
  var PAD_L = 50, PAD_R = 20, PAD_T = 20, PAD_B = 30;
  var PLOT_W = SVG_W - PAD_L - PAD_R;
  var PLOT_H = SVG_H - PAD_T - PAD_B;
  var LOG10_THRESHOLD = Math.log10(200); // ≈ 2.301

  function clampLog10(m) {
    if (m === null || m === undefined) return 0;
    var v = Math.log10(Math.max(m, 1));
    return Math.min(Math.max(v, 0), 4);
  }

  function xCoord(t, totalWindows) {
    return PAD_L + (t / Math.max(totalWindows - 1, 1)) * PLOT_W;
  }

  function yCoord(logVal) {
    return PAD_T + PLOT_H - (logVal / 4) * PLOT_H;
  }
`;
