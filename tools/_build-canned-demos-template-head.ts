// tools/_build-canned-demos-template-head.ts — HTML head template, VERBATIM.

export const HTML_TEMPLATE_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tessera — Demo Dashboard</title>
  <style>
    :root {
      --tessera-bg:               #0d1117;
      --tessera-bg-elevated:      #161b22;
      --tessera-bg-control:       #21262d;
      --tessera-fg:               #e6edf3;
      --tessera-fg-emphasis:      #f0f6fc;
      --tessera-fg-muted:         #8b949e;
      --tessera-fg-comment:       #6e7681;
      --tessera-border:           #30363d;
      --tessera-border-strong:    #21262d;
      --tessera-accent-blue:      #58a6ff;
      --tessera-accent-teal:      #79c0ff;
      --tessera-accent-slate:     #c9d1d9;
      --tessera-status-clean:     #3fb950;
      --tessera-status-fire:      #f78166;
      --tessera-status-warn:      #d29922;
      --tessera-status-info:      #58a6ff;
      --tessera-status-frozen:    #79c0ff;
      --tessera-status-fdr:       #a371f7;
      --tessera-fam-a:            #58a6ff;
      --tessera-fam-b:            #3fb950;
      --tessera-fam-c:            #a371f7;
      --tessera-fam-d:            #d29922;
      --tessera-fam-e:            #f78166;
      --tessera-font-mono:        'SF Mono', Menlo, Consolas, monospace;
      --tessera-font-sans:        system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; }
    header { padding: 16px 24px; border-bottom: 1px solid #30363d; }
    header h1 { font-size: 1.25rem; font-weight: 600; color: #f0f6fc; }
    header p { font-size: 0.8rem; color: #8b949e; margin-top: 2px; }
    #tessera-controls {
      display: flex; align-items: center; gap: 10px; padding: 12px 24px;
      background: #161b22; border-bottom: 1px solid #30363d; flex-wrap: wrap;
    }
    #tessera-controls select, #tessera-controls button {
      background: #21262d; color: #e6edf3; border: 1px solid #30363d;
      border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; cursor: pointer;
    }
    #tessera-controls select:hover, #tessera-controls button:hover { border-color: #58a6ff; }
    #scenario-selector { min-width: 220px; }
    #btn-play { color: #3fb950; border-color: #3fb950; }
    #btn-pause { color: #d29922; border-color: #d29922; }
    #btn-reset { color: #f78166; border-color: #f78166; }
    #tessera-controls label { font-size: 0.8rem; color: #8b949e; }
    #window-indicator { font-size: 0.8rem; color: #8b949e; margin-left: auto; }
    #tessera-main {
      display: grid;
      grid-template-columns: 1fr 260px;
      grid-template-rows: auto auto auto;
      gap: 0;
      padding: 0;
    }
    #chart-panel { grid-column: 1; grid-row: 1; padding: 16px 24px; }
    #chart-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #mt-chart { width: 100%; height: auto; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
    #verdict-panel { grid-column: 2; grid-row: 1 / 4; padding: 16px; border-left: 1px solid #30363d; overflow-y: auto; }
    #verdict-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #verdict-badges { display: flex; flex-direction: column; gap: 4px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge.clean { background: #1a3a2a; color: #3fb950; border: 1px solid #3fb950; }
    .badge.fire  { background: #3a1a1a; color: #f78166; border: 1px solid #f78166; }
    #audit-panel { grid-column: 1; grid-row: 2; padding: 16px 24px; border-top: 1px solid #30363d; }
    #audit-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #audit-list { list-style: none; font-size: 0.8rem; color: #8b949e; max-height: 120px; overflow-y: auto; }
    #audit-list li { padding: 2px 0; border-bottom: 1px solid #21262d; }
    #reasoning-panel { grid-column: 1; grid-row: 3; padding: 16px 24px; border-top: 1px solid #30363d; }
    #reasoning-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #reasoning-body { font-size: 0.85rem; color: #c9d1d9; line-height: 1.5; }
    #next-actions-panel { grid-column: 1; grid-row: 4; padding: 16px 24px; border-top: 1px solid #30363d; }
    #next-actions-panel h2 { font-size: 0.9rem; color: #8b949e; margin-bottom: 8px; }
    #next-actions-list { list-style: disc; margin-left: 18px; font-size: 0.85rem; color: #c9d1d9; }
    #next-actions-list li { margin-bottom: 4px; }
    /* R79: live verdict banner */
    #live-verdict-banner {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 24px;
      background: #161b22; border-bottom: 1px solid #30363d;
      font-size: 0.85rem;
    }
    #live-verdict-banner .live-label { color: #8b949e; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; }
    #live-scenario-name { color: #f0f6fc; font-family: 'SF Mono', Menlo, monospace; }
    #live-tick-indicator { color: #58a6ff; font-family: 'SF Mono', Menlo, monospace; }
    #live-verdict-status { color: #e6edf3; padding: 4px 12px; border-radius: 12px; background: #21262d; border: 1px solid #30363d; margin-left: auto; font-family: 'SF Mono', Menlo, monospace; }
    #live-verdict-status.status-clean      { color: #3fb950; border-color: #3fb950; }
    #live-verdict-status.status-firing     { color: #f78166; border-color: #f78166; }
    #live-verdict-status.status-common-mode { color: #d29922; border-color: #d29922; }
    #live-verdict-status.status-frozen     { color: #79c0ff; border-color: #79c0ff; }
    #live-verdict-status.status-fdr-selected { color: #a371f7; border-color: #a371f7; }
    #live-verdict-status.status-baseline   { color: #8b949e; border-color: #8b949e; }
    /* R79: front panel (metrics + detectors) */
    #front-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #30363d; }
    .metrics-panel, .detectors-panel { padding: 16px 24px; overflow-y: auto; max-height: 320px; }
    .metrics-panel { border-right: 1px solid #30363d; }
    .panel-h { font-size: 0.9rem; color: #8b949e; margin-bottom: 10px; }
    .metric-row { display: grid; grid-template-columns: 1fr 80px 80px; gap: 8px; padding: 4px 0; border-bottom: 1px solid #21262d; font-size: 0.78rem; font-family: 'SF Mono', Menlo, monospace; }
    .metric-row .metric-name     { color: #e6edf3; }
    .metric-row .metric-mt       { color: #58a6ff; text-align: right; }
    .metric-row .metric-residual { color: #8b949e; text-align: right; }
    .det-fam { padding: 8px 10px; margin-bottom: 6px; border: 1px solid #30363d; border-radius: 4px; background: #161b22; font-size: 0.78rem; }
    .det-fam-placeholder { color: #6e7681; font-style: italic; }
    .det-fam-A { border-left: 3px solid #58a6ff; }
    .det-fam-B { border-left: 3px solid #3fb950; }
    .det-fam-C { border-left: 3px solid #a371f7; }
    .det-fam-D { border-left: 3px solid #d29922; }
    .det-fam-E { border-left: 3px solid #f78166; }
    /* R81 — color-state transitions (200ms ease) on dashboard surfaces */
    .det-fam, .badge, #live-verdict-status {
      transition: color 200ms ease, background-color 200ms ease, border-color 200ms ease;
    }
    body.scrubbing .det-fam,
    body.scrubbing .badge,
    body.scrubbing #live-verdict-status {
      transition: none;
    }
    /* R81 — window scrubber */
    #window-scrubber {
      flex: 1 1 200px;
      max-width: 320px;
      accent-color: var(--tessera-accent-blue);
      height: 6px;
      cursor: pointer;
    }
    /* R81 — per-firing collapsible receipts */
    .provenance-receipt > summary {
      cursor: pointer;
      padding: 4px 0;
      color: #e6edf3;
      font-weight: 500;
    }
    .provenance-receipt > summary:hover {
      color: #f0f6fc;
    }
    details.provenance-receipt[open] > summary {
      color: var(--tessera-accent-blue);
    }
    /* R79: provenance panel */
    #provenance-panel { padding: 16px 24px; border-top: 1px solid #30363d; }
    #provenance-panel summary { cursor: pointer; font-size: 0.9rem; color: #8b949e; padding: 4px 0; }
    #provenance-panel summary:hover { color: #e6edf3; }
    .provenance-receipt { padding: 10px 12px; margin: 8px 0; background: #161b22; border-left: 3px solid #58a6ff; border-radius: 4px; font-size: 0.78rem; }
    .provenance-receipt .pr-header    { color: #e6edf3; font-weight: 500; margin-bottom: 4px; }
    .provenance-receipt .pr-reasoning { color: #c9d1d9; line-height: 1.5; margin-bottom: 6px; }
    .provenance-receipt .pr-evidence  { color: #8b949e; font-family: 'SF Mono', Menlo, monospace; font-size: 0.72rem; }
    @media print {
      body { background: #ffffff; color: #000000; }
      #tessera-controls { display: none; }
      #live-verdict-banner { background: #f5f5f5; color: #000000; border-color: #999999; }
      .det-fam, .provenance-receipt { background: #ffffff; color: #000000; border-color: #999999; }
      details { display: block; }
      details > summary { cursor: default; }
      details[open] > summary,
      details > *:not(summary) { display: block; }
    }
    /* R83 — interactive control panel (parameter knobs; UI surface only at R83) */
    #tessera-control-panel {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 24px;
      background: var(--tessera-bg-elevated);
      border-bottom: 1px solid var(--tessera-border);
    }
    #tessera-control-panel .control-panel-h {
      font-size: 0.85rem; color: var(--tessera-fg-muted); font-weight: 500;
    }
    #tessera-control-panel .control-row {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      font-size: 0.85rem;
    }
    #tessera-control-panel label {
      color: var(--tessera-fg-muted); min-width: 130px;
    }
    #tessera-control-panel .control-label { color: var(--tessera-fg-muted); min-width: 130px; }
    #tessera-control-panel select,
    #tessera-control-panel button {
      background: var(--tessera-bg-control); color: var(--tessera-fg);
      border: 1px solid var(--tessera-border); border-radius: 6px;
      padding: 4px 10px; font-size: 0.85rem; cursor: pointer;
      font-family: var(--tessera-font-mono);
    }
    #tessera-control-panel select:hover,
    #tessera-control-panel button:hover { border-color: var(--tessera-accent-blue); }
    #tessera-control-panel input[type="range"] { min-width: 180px; }
    #tessera-control-panel .param-value {
      color: var(--tessera-accent-blue); font-family: var(--tessera-font-mono);
      font-size: 0.8rem; min-width: 48px; text-align: right;
    }
    #tessera-control-panel .family-toggles label {
      min-width: 0; color: var(--tessera-fg); cursor: pointer;
    }
    #tessera-control-panel input[type="checkbox"] { margin-right: 4px; cursor: pointer; }
    #btn-run { color: var(--tessera-accent-blue); border-color: var(--tessera-accent-blue); }
    #btn-reset-params { color: var(--tessera-status-warn); border-color: var(--tessera-status-warn); }
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
    #engine-error-banner::before { content: '⚠  '; font-size: 0.9rem; }

    /* R85 — mode toggle + loading indicator + run status + per-mode UI clarity */
    .mode-toggle {
      display: inline-flex; align-items: center; gap: 10px;
      border: 1px solid var(--tessera-border); border-radius: 6px;
      padding: 4px 10px; margin-right: 10px;
      background: var(--tessera-bg-elevated);
    }
    .mode-toggle legend { font-size: 0.75rem; color: var(--tessera-fg-muted); padding: 0 6px; }
    .mode-toggle label {
      font-family: var(--tessera-font-mono); font-size: 0.85rem;
      display: inline-flex; align-items: center; gap: 4px;
    }

    /* Per-mode UI clarity: Canned mode grays out control-panel inputs;
       Live mode grays out scenario selector. */
    body[data-mode='canned'] #tessera-control-panel input,
    body[data-mode='canned'] #tessera-control-panel select,
    body[data-mode='canned'] #tessera-control-panel button {
      opacity: 0.45; pointer-events: none;
    }
    body[data-mode='canned'] #tessera-control-panel .control-panel-h::after {
      content: ' — (Live mode required)'; color: var(--tessera-fg-muted);
      font-style: italic; font-size: 0.75rem;
    }
    body[data-mode='live'] #scenario-selector {
      opacity: 0.45; pointer-events: none;
    }
    body[data-mode='live'] #engine-run-status { display: block; }
    body[data-mode='canned'] #engine-run-status { display: none; }
    body[data-mode='canned'] #engine-loading-indicator { display: none; }

    /* Loading spinner during Worker bundle load. */
    .loading-indicator {
      display: flex; align-items: center; gap: 8px;
      margin-top: 8px; padding: 6px 12px;
      color: var(--tessera-fg-muted); font-family: var(--tessera-font-mono);
      font-size: 0.8rem;
    }
    .loading-indicator[hidden] { display: none; }
    .loading-indicator .spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid var(--tessera-border);
      border-top-color: var(--tessera-fg);
      border-radius: 50%;
      animation: tessera-spin 0.8s linear infinite;
    }
    @keyframes tessera-spin { to { transform: rotate(360deg); } }

    /* Run-status / "Run again" affordance. */
    .run-status {
      margin-top: 8px; padding: 6px 10px;
      font-family: var(--tessera-font-mono); font-size: 0.8rem;
      color: var(--tessera-fg-muted);
      min-height: 1.4em;
    }
    .run-status.complete { color: var(--tessera-status-ok, var(--tessera-fg)); }
  </style>
</head>
<body>
  <header id="tessera-header">
    <h1>Tessera Demo</h1>
    <p class="tessera-tagline">Per-shard observation for AI clusters — statistically-rigorous fleet-FPR guarantees over canned scenarios</p>
    <p>Pre-recorded scenarios — opens from file:// (no server required)</p>
  </header>

  <section id="tessera-controls">
    <fieldset id="mode-toggle" class="mode-toggle">
      <legend>Mode</legend>
      <label><input type="radio" name="tessera-mode" value="canned" checked> Canned</label>
      <label><input type="radio" name="tessera-mode" value="live"> Live</label>
    </fieldset>
    <select id="scenario-selector">
      <option value="clean-baseline">Clean baseline (no firings)</option>
      <option value="sdc-drift">SDC drift on shard-04</option>
      <option value="common-mode-rack">Common-mode (rack-localized)</option>
      <option value="event-conditional">Event-conditional freeze</option>
      <option value="fdr-multiple-testing">FDR control (e-BH)</option>
      <option value="hierarchical-evalue">Hierarchical e-value</option>
      <option value="sparse-data-resilience">Sparse-data resilience</option>
      <option value="topology-spanning-common-mode">Topology-spanning common-mode</option>
      <option value="custom">Custom parameters</option>
    </select>
    <button id="btn-play">Play</button>
    <button id="btn-pause">Pause</button>
    <button id="btn-reset">Reset</button>
    <label for="speed-selector">Speed</label>
    <select id="speed-selector">
      <option value="1">1×</option>
      <option value="2">2×</option>
      <option value="4">4×</option>
    </select>
    <input type="range" id="window-scrubber" min="0" max="29" step="1" value="0" aria-label="Scrub to window">
    <span id="window-indicator">window 0 / 30</span>
  </section>

  <section id="tessera-control-panel" class="control-panel">
    <h2 class="control-panel-h">Interactive parameters — UI surface (R83); engine wiring lands at R84</h2>
    <div class="control-row">
      <label for="param-drift-magnitude">Drift magnitude</label>
      <input type="range" id="param-drift-magnitude" min="0.05" max="0.40" step="0.025" value="0.10" aria-label="Drift magnitude">
      <span id="param-drift-magnitude-value" class="param-value">0.100</span>
    </div>
    <div class="control-row">
      <label for="param-window-count">Window count</label>
      <input type="range" id="param-window-count" min="30" max="200" step="10" value="50" aria-label="Window count">
      <span id="param-window-count-value" class="param-value">50</span>
    </div>
    <div class="control-row">
      <label for="param-alpha-threshold">α threshold</label>
      <select id="param-alpha-threshold">
        <option value="0.001">0.001</option>
        <option value="0.005" selected>0.005</option>
        <option value="0.01">0.01</option>
      </select>
    </div>
    <div class="control-row">
      <label for="param-target-shard">Target shard</label>
      <select id="param-target-shard">
        <option value="shard-00" selected>shard-00</option>
        <option value="shard-01">shard-01</option>
        <option value="shard-02">shard-02</option>
        <option value="shard-03">shard-03</option>
        <option value="shard-04">shard-04</option>
        <option value="shard-05">shard-05</option>
        <option value="shard-06">shard-06</option>
        <option value="shard-07">shard-07</option>
        <option value="shard-08">shard-08</option>
        <option value="shard-09">shard-09</option>
        <option value="shard-10">shard-10</option>
        <option value="shard-11">shard-11</option>
        <option value="shard-12">shard-12</option>
        <option value="shard-13">shard-13</option>
        <option value="shard-14">shard-14</option>
        <option value="shard-15">shard-15</option>
        <option value="shard-16">shard-16</option>
        <option value="shard-17">shard-17</option>
        <option value="shard-18">shard-18</option>
        <option value="shard-19">shard-19</option>
        <option value="shard-20">shard-20</option>
        <option value="shard-21">shard-21</option>
        <option value="shard-22">shard-22</option>
        <option value="shard-23">shard-23</option>
        <option value="shard-24">shard-24</option>
      </select>
    </div>
    <div class="control-row">
      <label for="param-topology-size">Topology size</label>
      <select id="param-topology-size">
        <option value="small" selected>Small (6 shards)</option>
        <option value="medium">Medium (10 shards)</option>
        <option value="large">Large (25 shards)</option>
      </select>
    </div>
    <div class="control-row family-toggles">
      <span class="control-label">Detector families</span>
      <label><input type="checkbox" id="param-family-a" checked> Family A</label>
      <label><input type="checkbox" id="param-family-b" checked> Family B</label>
      <label><input type="checkbox" id="param-family-c" checked> Family C</label>
      <label><input type="checkbox" id="param-family-d" checked> Family D</label>
      <label><input type="checkbox" id="param-family-e" checked> Family E</label>
    </div>
    <div class="control-row">
      <button id="btn-run" type="button">Run</button>
      <button id="btn-cancel" type="button" disabled>Cancel</button>
      <button id="btn-reset-params" type="button">Reset parameters</button>
    </div>
    <div id="engine-error-banner" class="error-banner" hidden></div>
    <div id="engine-loading-indicator" class="loading-indicator" hidden aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span class="loading-text">Loading engine bundle…</span>
    </div>
    <div id="engine-run-status" class="run-status" aria-live="polite"></div>
  </section>

  <section id="live-verdict-banner" class="live-banner">
    <span class="live-label">Scenario</span>
    <span id="live-scenario-name">—</span>
    <span class="live-label">Tick</span>
    <span id="live-tick-indicator">—</span>
    <span id="live-verdict-status" class="status-baseline">baseline</span>
  </section>

  <main id="tessera-main">
    <section id="chart-panel">
      <h2>Shard wealth M_t (log₁₀ scale; threshold = log₁₀(200) ≈ 2.301)</h2>
      <svg id="mt-chart" width="800" height="400"
           viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet"></svg>
    </section>
    <section id="verdict-panel">
      <h2>Verdict</h2>
      <div id="verdict-badges"></div>
    </section>
    <section id="audit-panel">
      <h2>Audit trail</h2>
      <ul id="audit-list"></ul>
    </section>
    <section id="reasoning-panel">
      <h2>Reasoning</h2>
      <p id="reasoning-body"></p>
    </section>
    <section id="next-actions-panel">
      <h2>Suggested next actions</h2>
      <ul id="next-actions-list"></ul>
    </section>
  </main>

  <section id="front-panel" class="front">
    <div id="metrics-panel" class="metrics-panel">
      <h2 class="panel-h">Per-shard signals</h2>
      <div id="metrics-body"></div>
    </div>
    <div id="detectors-panel" class="detectors-panel">
      <h2 class="panel-h">Detector families</h2>
      <div id="detectors-body">
        <div class="det-fam det-fam-A">Family A — betting e-process</div>
        <div class="det-fam det-fam-B det-fam-placeholder">Family B — (R80)</div>
        <div class="det-fam det-fam-C det-fam-placeholder">Family C — (R80)</div>
        <div class="det-fam det-fam-D det-fam-placeholder">Family D — (R80)</div>
        <div class="det-fam det-fam-E det-fam-placeholder">Family E — (R80)</div>
      </div>
    </div>
  </section>
  <details id="provenance-panel" class="provenance-panel">
    <summary class="provenance-summary">Provenance — per-firing receipts (click to expand)</summary>
    <div id="provenance-body"></div>
  </details>
`;

export const SENTINEL_BEGIN = '  <!-- BEGIN-TESSERA-SCENARIO-DATA -->';
export const SENTINEL_END   = '  <!-- END-TESSERA-SCENARIO-DATA -->';
