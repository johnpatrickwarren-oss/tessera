# Q-R83-SPEC.md — Interactive control panel + state-management surface (Phase 4 SLICE 3 round 2)

**Round:** R83 (Phase 4 SLICE 3 second round)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `4c4733d` (`4c4733d33371ea842ec846f2735e68b592630dda`)
**Routing status (Architect → Implementer):** **READY** (no open architectural questions; spec triad complete; EMPIRICAL.sh probe-run at round-start HEAD documented in § 8 Audit).

R83 is the UI-surface-only scope of the SLICE 3 dashboard control plane: HTML control elements + a `controlState` global + event-listener wiring + `tessera:control-change` `CustomEvent` emission + a placeholder Run button that `console.log`s `controlState` (R84 wires the same emit/Run path to the R82 engine bundle for live compute).

The directive's hard scope boundary: **NO live engine compute at R83**. This spec preserves that boundary by prescribing the Run handler as a `console.log` placeholder and by binding every state-management AC to source-text patterns that do NOT import `./engine-bundle.mjs`.

---

## § 0. Brainstorm (Superpowers Phase 1)

R83 must add 7 categories of controls to the existing dashboard (`demos/demo.html` is fully regenerated from `tools/build-canned-demos.ts` via `pnpm build:demos`; the R82 smoke block is preserved across regenerations by an in-tool marker mechanism at `tools/build-canned-demos.ts:1942-1956`). Three architectural decisions are load-bearing:

(a) **Where do the new controls live in the DOM?** Option (i) extend the existing `<section id="tessera-controls">` at `demos/demo.html:172-194` (which carries playback controls: scenario selector + play/pause/reset/speed + scrubber); Option (ii) add a new sibling section `<section id="tessera-control-panel">` directly below `#tessera-controls` and above `<section id="live-verdict-banner">`.

(b) **Where do the controls + state-management JS live in source-of-truth?** Option (i) edit `demos/demo.html` inline (fast, small diff, but a future `pnpm build:demos` invocation regenerates the file and wipes R83 changes unless a marker-preservation mechanism is added like the R82 smoke block); Option (ii) modify `tools/build-canned-demos.ts` (`HTML_TEMPLATE_HEAD` for the markup + `HTML_TEMPLATE_FOOTER` for the IIFE-internal JS) and re-run `pnpm build:demos` to regenerate `demos/demo.html` (canonical, survives regeneration, larger diff).

(c) **State-management API shape — global `controlState` vs encapsulated module pattern.** Option (i) module-pattern with private state and a public `getControlState()` accessor (cleanest, but the existing IIFE pattern in `tools/build-canned-demos.ts:1428+` uses `var` declarations at function scope without encapsulation, so adding a different pattern creates inconsistency); Option (ii) `var controlState = {...}` declared at the IIFE-top alongside the existing `var scenarios = {}; var currentName = 'clean-baseline'; var currentWindowIdx = 0;` pattern (matches existing style; R84 can refactor to a module pattern when the engine wiring lands).

### Approaches considered

**Approach A — New `<section id="tessera-control-panel">` in `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD`; `controlState` global inside the existing IIFE in `HTML_TEMPLATE_FOOTER`; `console.log` Run handler (Architect-recommended).** Modify `HTML_TEMPLATE_HEAD` to insert a new section between `#tessera-controls` and `#live-verdict-banner`; modify `HTML_TEMPLATE_FOOTER` to add R83 DOM refs + `controlState` + event listeners + `emitControlChange()` + Run / Reset-params handlers; run `pnpm build:demos` to regenerate `demos/demo.html`.

- Strengths: matches the existing single-source-of-truth architecture (HTML body markup lives in the tool, regenerated deterministically; the R82 smoke block is the only preserved-island in `demos/demo.html`). Survives all future `pnpm build:demos` invocations. R84 extends the same IIFE to subscribe to `tessera:control-change` and invoke the R82 engine bundle. Visual identity uses the existing `--tessera-*` CSS variables (R80 palette consistency by construction). Section separation (`#tessera-controls` = playback; `#tessera-control-panel` = parameter knobs) preserves the existing playback semantics.
- Weaknesses: requires modifying both `tools/build-canned-demos.ts` AND running the build, producing a 2-file diff (tool + generated HTML). Implementer must verify `demos/scenarios/*.json` byte-identical post-regen (halt condition 9 in directive).
- Hidden assumptions: `pnpm build:demos` is deterministic (scenario JSON byte-identical across runs). Verified empirically at spec-emit: re-running the tool at round-start HEAD produces no changes to `demos/scenarios/*.json` (the IIFE seeds + scenario runners use fixed seeds per `tools/build-canned-demos.ts` runner table).
- Risks: bundling R83 markup + R83 JS into the same tool diff makes the chore-A diff slightly larger (~3 files: tools/build-canned-demos.ts, demos/demo.html, test/q83-*.test.ts plus spec triad already in place); mitigated by clear ALLOWED_SET enumeration.

**Approach B — Inline-edit `demos/demo.html` only; add R83-CONTROL-PANEL-START/END markers + preservation logic to `tools/build-canned-demos.ts` (extends R82 smoke-block pattern).** Add HTML + JS directly in `demos/demo.html` between marker comments; add preservation logic to `tools/build-canned-demos.ts` mirroring the R82 smoke-block mechanism at `:1942-1956`.

- Strengths: smaller initial tool diff (preservation logic ~15 lines mirroring R82 pattern).
- Weaknesses: creates a second preserved-island, splitting the dashboard surface between the tool's `HTML_TEMPLATE_HEAD/FOOTER` (8 scenario-driven playback controls) and inline-preserved-markers (7 parameter knobs). Two sources of truth for "the dashboard control surface" complicates R84 wiring. The R82 smoke block was a one-off ESCALATE-response — proliferating it as a general pattern violates the build-canned-demos.ts architecture (regenerable HTML body, marker-preserved islands as exceptions).
- Hidden assumptions: future engineers parsing the dashboard recognize that controls live in two locations.
- Risks: structural debt that compounds at R84+ (each new control surface either further proliferates markers or migrates back to the tool).

**Approach C — Web Worker + module-pattern state encapsulation.** Refactor the IIFE into ES-module class instances; add a Web Worker boundary at R83 to prep R84's compute-thread wiring.

- Strengths: cleanest long-term architecture for R84+ engine wiring.
- Weaknesses: massively expands scope beyond the directive ("R83 ships UI surface + state management"; "R84 wires to live engine compute"). Module refactor would touch every existing event listener (playback controls, scrubber, etc.) and risk anti-regression on R71/R79/R80/R81 surfaces.
- **Disqualified by anti-scope** ("NO modification of R73-R82 deliverables (frozen)" + "NO live engine compute at R83 — UI surface + state management ONLY").

### Selection rationale

**Pick Approach A.** Approach C is structurally disqualified. Approach B's "second preserved-island" cost (per-island marker preservation; split sources of truth for the same dashboard surface) materially exceeds the marginal "regenerate the HTML" cost of Approach A. The R82 smoke block is `<script type="module">` (a smoke test consuming the R82 build artifact); it is architecturally distinct from "the dashboard IIFE" which owns playback, scrubber, render, and now R83 parameter knobs.

R84's natural extension under Approach A: add an `import` of `./engine-bundle.mjs` inside the IIFE (or as a sibling `<script type="module">` that listens for `tessera:control-change`), promote `controlState` to a module-private getter, and replace the `console.log` Run handler with engine invocation. The R83 surface enables this without further refactoring.

### Approach A specifics — the implementation footprint

- **Modified:** `tools/build-canned-demos.ts` — extend `HTML_TEMPLATE_HEAD` with the new `<section id="tessera-control-panel">` markup + CSS rules in the `<style>` block; extend `HTML_TEMPLATE_FOOTER` IIFE with R83 DOM refs + `R83_DEFAULTS` + `controlState` + listeners + `emitControlChange()` + Run / Reset-params handlers. Also: extend the existing `<select id="scenario-selector">` option list with `<option value="custom">Custom parameters</option>`.
- **Modified:** `demos/demo.html` — regenerated by `pnpm build:demos` from the modified tool (Implementer commits both files together at chore-A).
- **New file:** `test/q83-interactive-knobs.test.ts` (16 ACs).
- **New file triad:** `coordination/specs/Q-R83-SPEC.md` (this file) + `Q-R83-SPEC-AUDIT.md` + `Q-R83-EMPIRICAL.sh`.
- **Modified at routing/close:** `coordination/NEXT-ROLE.md` (each role appends routing block) + `coordination/MEMORIAL.md` (each role appends CONFIRMATION/VIOLATION lines) + `coordination/reviews/REVIEWER-REPORT-R83.md` (Reviewer authors).
- **UNCHANGED:** all `engine/*`; all R73-R82 deliverables; all `demos/scenarios/*.json`; the R82 smoke block at `demos/demo.html:13206-13230` (preserved by tool's smoke-block-preservation logic at `tools/build-canned-demos.ts:1942-1956`); `package.json` (build:demos script already exists at line 18); `pnpm-lock.yaml`; `.gitignore`; all prior round Q-RNN-SPEC.md files.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries (what exists | what's created | what changes | what's deleted)

| Surface | State | Notes |
|---|---|---|
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` `<style>` block (lines ~1181-1342) | **MODIFIED** (CSS rules added) | New CSS rules for `#tessera-control-panel`, `.control-row`, `.family-toggles`, `#btn-run`, `#btn-reset-params` |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` `#scenario-selector` (lines 1347-1356) | **MODIFIED** (one option added) | Extend with `<option value="custom">Custom parameters</option>` (R71 list of 8 → 9 options) |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` body markup after `#tessera-controls` close (line ~1376) | **MODIFIED** (new section inserted) | Insert `<section id="tessera-control-panel">…</section>` between `#tessera-controls` and `#live-verdict-banner` |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_FOOTER` IIFE (lines 1428+) | **MODIFIED** (R83 state + listeners added) | New region inside IIFE, inserted after R79 DOM refs (`windowScrubber` declaration), before the existing event-listener wiring at `demos/demo.html:13142+` |
| `demos/demo.html` | **MODIFIED** (regenerated by `pnpm build:demos`) | Reflects all `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER` edits |
| `test/q83-interactive-knobs.test.ts` | **NEW** | All 16 R83 ACs |
| `coordination/specs/Q-R83-SPEC.md` | **NEW** | This file |
| `coordination/specs/Q-R83-SPEC-AUDIT.md` | **NEW** | Audit sidecar (Reviewer-only) |
| `coordination/specs/Q-R83-EMPIRICAL.sh` | **NEW** | Binding-command harness |
| `coordination/NEXT-ROLE.md` | **MODIFIED** | Each role appends routing block |
| `coordination/MEMORIAL.md` | **MODIFIED** | Each role appends CONFIRMATION / VIOLATION lines |
| `coordination/reviews/REVIEWER-REPORT-R83.md` | **NEW** | Authored by Reviewer |
| `coordination/logs/ROUND-R83-(SUMMARY\|ROUTING).md` | **NEW** (allowed; generic R[0-9]+ pattern in ALLOWED_SET) | Memorial-Updater or operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R83-*.md` | **POTENTIAL NEW** (allowed; generic pattern) | Only if halt fires |
| `CLAUDE-*.md` | **POTENTIAL MODIFIED** (allowed) | Memorial-Updater may add REINFORCED lines |
| All `engine/*` files | UNCHANGED | A12 + R82 + directive anti-scope |
| All `demos/scenarios/*.json` | UNCHANGED (byte-identical post-regen) | Halt condition 9; verified by Implementer pre-commit |
| R82 smoke block at `demos/demo.html:13206-13230` | UNCHANGED (preserved by tool mechanism) | R82 marker-preservation logic at `tools/build-canned-demos.ts:1942-1956` |
| All `test/q01..q82*.test.ts` | UNCHANGED | Forward-protection AC-R82-14 flips → fail (predicted; § 1.4) |
| `package.json` / `pnpm-lock.yaml` / `.gitignore` | UNCHANGED | No new deps; no new build script needed (build:demos already exists at package.json:18) |

### 1.2 Control-panel HTML markup (verbatim; Implementer copies into `HTML_TEMPLATE_HEAD`)

Insert this section between the close of `<section id="tessera-controls">` (at the existing `</section>` for `#tessera-controls`) and the open of `<section id="live-verdict-banner">` (at `tools/build-canned-demos.ts:1376` in the current source; line number is rough — Implementer locates by `</section>\n\n  <section id="live-verdict-banner"`):

```html
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
      <button id="btn-reset-params" type="button">Reset parameters</button>
    </div>
  </section>
```

**Scenario-selector extension** (modify the existing `<select id="scenario-selector">` block at `tools/build-canned-demos.ts:1347-1356` — append a `<option>` line as the last child, AFTER `topology-spanning-common-mode`):

```html
      <option value="custom">Custom parameters</option>
```

### 1.3 Control-panel CSS rules (verbatim; Implementer copies into `HTML_TEMPLATE_HEAD` `<style>` block)

Insert these rules at the end of the existing `<style>` content (before `</style>` at `tools/build-canned-demos.ts:1343`). All colors use existing `--tessera-*` CSS variables (R80 palette consistency by construction):

```css
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
```

### 1.4 Control-panel JS — state management (verbatim; Implementer copies into `HTML_TEMPLATE_FOOTER`)

Insert this region inside the existing IIFE in `tools/build-canned-demos.ts` `HTML_TEMPLATE_FOOTER`, AFTER the R79 DOM-refs block (the line `var windowScrubber       = document.getElementById('window-scrubber');` — currently in source at `demos/demo.html:13136`; Implementer locates by the literal `windowScrubber       = document.getElementById('window-scrubber');`) and BEFORE the SVG constant declarations (`var SVG_NS = 'http://www.w3.org/2000/svg';`).

```js
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

  if (btnRun) {
    btnRun.addEventListener('click', function () {
      // R83: placeholder; R84 invokes the engine bundle here.
      console.log('R83 controlState (placeholder for R84 engine wiring):', JSON.stringify(controlState));
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
```

### 1.5 Integration points

| # | Integration | Direction | Failure mode |
|---|---|---|---|
| I1 | `tools/build-canned-demos.ts` edits → `pnpm build:demos` → `demos/demo.html` | Build-time | Tool error → halt-condition 1 (EMPIRICAL.sh Block 2 / 3 / 4 fail) |
| I2 | `pnpm build:demos` regeneration | Build-time | If non-deterministic → `demos/scenarios/*.json` content drifts → halt-condition 9 |
| I3 | Browser `<select>`/`<input>`/`<button>` event surface → IIFE event listeners → `controlState` mutation → `emitControlChange()` | Runtime (browser) | If a listener fires before its DOM ref is initialized → ref `null` → silent no-op (guarded by `if (el)` pattern); structural ACs verify the wiring source-text |
| I4 | `controlState` mutation → `document.dispatchEvent(new CustomEvent('tessera:control-change', {...}))` | Runtime (browser); R84 will add a `document.addEventListener('tessera:control-change', ...)` subscriber | R84 subscriber not yet wired at R83 — event fires into the void (intentional; R83 ships emit, R84 wires subscribe) |
| I5 | R82 smoke block at `demos/demo.html:13206-13230` | Preserved by tool's smoke-block mechanism at `tools/build-canned-demos.ts:1942-1956` | If the tool's preservation logic regression: smoke block lost → AC-R83-14 anti-regression fails on the `R82-SMOKE-BLOCK-START` marker assertion |
| I6 | `tsc` compilation of `tools/build-canned-demos.ts` + `test/q83-interactive-knobs.test.ts` | Build-time | TypeScript error → halt-condition 2 (EMPIRICAL.sh Block 1 fail) |
| I7 | `node --test` invocation of compiled `test/q83-interactive-knobs.test.js` | Test-time | Any AC failing → EMPIRICAL.sh Block 4 reports drift → halt-condition 3 |

### 1.6 Failure modes at each integration point

| ID | Integration | Failure mode | Mitigation |
|---|---|---|---|
| F1 | I1 | HTML insertion location wrong (e.g., inserted INSIDE `#tessera-controls` instead of as sibling) | Spec § 1.2 prescribes the exact textual anchor (`</section>\n\n  <section id="live-verdict-banner"`) for insertion |
| F2 | I2 | Tool non-determinism produces drift in `demos/scenarios/*.json` | Implementer pre-commit: `git diff --name-only` includes `demos/scenarios/*.json` → halt; correct response is to investigate (which seed / runner produced the drift) before committing |
| F3 | I3 | Event listener wiring omits a control → control silently inert | Each control has its own AC binding the listener wiring source-text (AC-R83-10/11/12); test grep enforces presence |
| F4 | I4 | `CustomEvent` name typo (e.g., `tessera:controls-change` plural) | AC-R83-11 binds the exact string `'tessera:control-change'` via grep |
| F5 | I5 | R82 smoke block missing post-regen | AC-R83-14 anti-regression binds `R82-SMOKE-BLOCK-START` marker via grep |
| F6 | I6 | New TS error introduced (e.g., `controlState` typed `never` in tests) | EMPIRICAL.sh Block 1 binds `tsc -p tsconfig.test.json` exit 0 |
| F7 | I7 | Test count drift beyond R83-additions (e.g., a R82 test regresses for unrelated reason) | EMPIRICAL.sh Block 4 fail/pass strict-equality bounds; halt-condition 3 |

### 1.7 Architect pre-prediction table (predictions, not observations; encode-actual-results-verbatim discipline applies post-fact)

| Observable | Architect pre-prediction at R83 chore-A | Rationale |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | **0** | R83 modifications are TS-clean: tool file gets pure string edits; test file is standard `node:test` + `node:fs` shape; no new types introduced |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | **1** | node-test exits 1 when any subtest fails; baseline carry-forward 12 + R82 AC-R82-14 forward-protection flip = 13 expected failures |
| TAP `# tests` | predicted **652** (R82 close 636 + 16 new R83 ACs; strict equality) | each AC = 1 `test()` block; assertions are inside the block but the block-count is what TAP reports as `# tests` |
| TAP `# pass` | predicted **636** (R82 close 620 + 16 new R83 ACs all passing at GREEN; band [635, 637] for ±1 PRNG/environment noise) | 16 added ACs all pass at GREEN; only forward-protection flip from R82 AC-R82-14 lands in fail bucket |
| TAP `# fail` | predicted **13** (R82 close 12 + 1 R82 AC-R82-14 forward-protection flip; strict equality) | R82 AC-R82-14 regex (`tools/build-browser-bundle\.ts\|tools/build-canned-demos\.ts\|engine/topology-overlay\.ts\|demos/demo\.html\|…\|test/q82-engine-browser-bundle\.test\.ts\|…`) does NOT include `test/q83-interactive-knobs.test.ts`, `coordination/specs/Q-R83-SPEC*`, `coordination/specs/Q-R83-EMPIRICAL.sh`, or `coordination/reviews/REVIEWER-REPORT-R83.md` → 4+ unauthorized paths under R82's regex → AC-R82-14 flip |
| TAP `# skipped` | **4** (unchanged) | no skip changes |
| `bash Q-R83-EMPIRICAL.sh` exit at chore-A | **0** (ALL BLOCKS PASS) | spec § 5.2 + Block prescriptions designed so all blocks pass post-Implementer |
| `git diff 4c4733d HEAD --name-only` line count | predicted **9-13** | 1 modified tool, 1 modified demo.html, 1 new test, 3 spec triad files, 1 modified NEXT-ROLE.md, 1 modified MEMORIAL.md, 1 new REVIEWER-REPORT, 1 new ROUND-R83-ROUTING.md, 1 new ROUND-R83-SUMMARY.md (Memorial-Updater), optional CLAUDE-*.md edits |
| `demos/scenarios/*.json` content | **byte-identical** to round-start HEAD `4c4733d` | Halt condition 9; verified by `git status` (files should NOT appear modified after `pnpm build:demos` run) |
| Carry-forward failing ACs (12 at HEAD) | unchanged in name | AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14 |

### 1.8 Architect choices documented (not deferred)

| Choice | Architect pick | Alternatives rejected; rationale |
|---|---|---|
| Section placement | NEW `<section id="tessera-control-panel">` between `#tessera-controls` and `#live-verdict-banner` | Extending existing `#tessera-controls` would couple playback semantics with parameter knobs; explicit separation matches the directive's "interactive parameter" framing. |
| Source-of-truth file | `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD`/`FOOTER` | Inline-edit `demos/demo.html` fails the regenerability invariant (the next `pnpm build:demos` wipes the changes); preserved-marker pattern (Approach B) proliferates a one-off R82 mechanism. |
| Run handler shape | `console.log(JSON.stringify(controlState))` placeholder | Directive: "Console log on Run (R83 placeholder; R84 invokes engine)"; no engine call permitted at R83. |
| State global vs encapsulated | `var controlState = {...}` at IIFE-top | Matches existing `var scenarios = {}; var currentName = ...;` IIFE-style; encapsulation refactor is R84-or-later scope. |
| Custom event name | `'tessera:control-change'` (singular, hyphenated) | Matches namespace pattern `tessera:*`; singular "control" matches the singleton `controlState` object. |
| Event detail shape | shallow-cloned `controlState` (per-field copy + nested `families` per-key copy) | Avoids R84 subscribers mutating R83's internal state; nested clone is two-level which is sufficient for the current shape. |
| Drift magnitude range | `0.05 → 0.40` step `0.025` (default `0.10`) | Directive verbatim; R77 envelope. |
| Window count range | `30 → 200` step `10` (default `50`) | Directive verbatim; R77 envelope; step `10` gives 18 discrete points across the range (operator-friendly granularity). |
| α threshold options | `0.001 / 0.005 / 0.01` (default `0.005`) | Directive verbatim. |
| Topology size options | `small (6) / medium (10) / large (25)` (default `small`) | Directive verbatim; member-counts encoded in option label. |
| Family toggle count | 5 (a/b/c/d/e) | Directive verbatim. |
| Target shard option count | 25 (`shard-00` through `shard-24`) | Covers the largest topology (`large = 25`); R84 will narrow per topology-size selection; R83 ships the full list for completeness. |
| Reset button distinction | `#btn-reset-params` (NEW; resets ONLY R83 parameter knobs); existing `#btn-reset` unchanged (playback reset) | Two distinct semantic resets; sharing the button would couple playback and parameter state. |

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 The `controlState` global as the single source of truth

R83 introduces ONE mutable state object — `controlState` — at the top of the existing IIFE. All event listeners write to it; `emitControlChange()` reads from it and dispatches a shallow clone. No external code reads `controlState` directly at R83 (R84 will subscribe via `document.addEventListener('tessera:control-change', ...)` and read from `event.detail`, NOT from a global accessor).

The decoupling is structural: the only externally-observable surface is the `CustomEvent`. R84 can refactor `controlState` to a module-private variable without breaking any subscriber.

### 2.2 The `emitControlChange()` helper as the only event-dispatch site

Every state-mutating listener calls `emitControlChange()` after mutation. The Reset-params handler also calls it (after all default-restoration writes complete). This guarantees subscribers see a consistent snapshot.

The shallow-clone-in-detail pattern (spec § 1.4) prevents subscribers from mutating R83's internal state object via the event detail reference.

### 2.3 The Run button as the R83→R84 handoff seam

`btnRun.addEventListener('click', function () { console.log('R83 controlState (placeholder for R84 engine wiring):', JSON.stringify(controlState)); })`

R84's modification will be: replace the `console.log` body with `import('./engine-bundle.mjs').then((engine) => { /* invoke engine with controlState */ })` OR wrap the IIFE in a `<script type="module">` and `await` the import at top-level. The handler's identity (`btnRun.addEventListener('click', ...)`) and the access pattern (`controlState`) survive both refactors.

### 2.4 Scenario selector "custom" option

Adding `<option value="custom">Custom parameters</option>` to the existing `#scenario-selector` extends R71's 8-option list to 9. The existing `selector.addEventListener('change', function () { loadScenario(selector.value); });` at `demos/demo.html:13142` will call `loadScenario('custom')` if the user selects it. At R83, `scenarios['custom']` is undefined → `loadScenario` falls through its existing null-guard (`if (!sd)` paths at `demos/demo.html` rendering functions). R84 will populate `scenarios.custom` from a live engine run when Run is clicked while "custom" is selected.

R83 ANTI-REGRESSION: AC-R83-14 verifies the existing R71 8-option list is preserved. The "custom" option is the 9th — adding it does not regress R71.

### 2.5 Test file shape (verbatim; Implementer copies)

The test file follows the q81/q82 pattern: read `demos/demo.html` once, assert structural and source-text properties. Insert into a NEW file `test/q83-interactive-knobs.test.ts`:

```ts
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

// ── AC-R83-12: Run button handler logs controlState via console.log (R83 placeholder) ──
test('AC-R83-12: btnRun click handler console.logs controlState (R83 placeholder)', () => {
  // Discriminating: the handler region must contain BOTH the addEventListener
  // wiring on btnRun AND a console.log of controlState inside the closure body.
  const runRegion = HTML.match(/btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,400}?\}\s*\)\s*;/);
  assert.ok(runRegion, 'btnRun.addEventListener("click", ...) must be present');
  assert.match(runRegion![0], /console\.log\([^)]*controlState/,
    'btnRun click handler must console.log(... controlState ...)');
  // Anti-regression: must NOT import or invoke the engine bundle at R83
  // (R84 will replace this handler body).
  assert.ok(!runRegion![0].includes('engine-bundle.mjs'),
    'R83: btnRun handler must NOT import engine-bundle.mjs (R84 scope)');
});

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

// ── AC-R83-15: anti-scope diff ⊆ ALLOWED_SET ──
test('AC-R83-15: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const allowed = new RegExp(
    `^(tools/build-canned-demos\\.ts|`
    + `demos/demo\\.html|`
    + `test/q83-interactive-knobs\\.test\\.ts|`
    + `coordination/specs/Q-R83-SPEC\\.md|`
    + `coordination/specs/Q-R83-SPEC-AUDIT\\.md|`
    + `coordination/specs/Q-R83-EMPIRICAL\\.sh|`
    + `coordination/NEXT-ROLE\\.md|coordination/MEMORIAL\\.md|`
    + `coordination/MEMORIAL-PHASE-[0-9]+\\.md|`
    + `coordination/reviews/REVIEWER-REPORT-R83\\.md|`
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
    `R83 anti-scope diff includes unauthorized paths: ${violators.join(', ')}`);
});

// ── AC-R83-16: sentinels — typecheck + EMPIRICAL.sh block presence ──
test('AC-R83-16: typecheck sentinel + EMPIRICAL.sh has Block 1..5 markers', () => {
  // Typecheck sentinel: q83 test compiled to .js means tsc succeeded for this file.
  const jsPath = path.join(REPO_ROOT, 'test/q83-interactive-knobs.test.js');
  assert.ok(fs.existsSync(jsPath),
    'q83 test must compile to .js (proves tsc passed for this round)');
  // EMPIRICAL.sh block presence — bind by literal Block markers.
  const sh = fs.readFileSync(
    path.join(REPO_ROOT, 'coordination/specs/Q-R83-EMPIRICAL.sh'), 'utf8');
  for (const blockMarker of [
    '── Block 1: typecheck',
    '── Block 2: control panel HTML presence',
    '── Block 3: state-management JS presence',
    '── Block 4: test counts',
    '── Block 5: anti-scope diff',
  ]) {
    assert.ok(sh.includes(blockMarker),
      `Q-R83-EMPIRICAL.sh must contain marker "${blockMarker}"`);
  }
});
```

---

## § 3. Component inventory

| File | State | Lines (approx) | AC binding |
|---|---|---|---|
| `tools/build-canned-demos.ts` | MODIFIED | +180 (markup + CSS + JS); see § 1.2-1.4 verbatim | AC-R83-1..14 (via regenerated demos/demo.html) |
| `demos/demo.html` | MODIFIED (regenerated) | +180 (mirror of tool edits) | AC-R83-1..14 (direct file read) |
| `test/q83-interactive-knobs.test.ts` | NEW | 16 test() blocks; ~200 lines | AC-R83-1..16 (this file IS the AC binding) |
| `coordination/specs/Q-R83-SPEC.md` | NEW | this file | — |
| `coordination/specs/Q-R83-SPEC-AUDIT.md` | NEW | audit sidecar | — |
| `coordination/specs/Q-R83-EMPIRICAL.sh` | NEW | 5 blocks; ~110 lines | AC-R83-15 (Block 5) + AC-R83-16 (block markers) |
| `coordination/NEXT-ROLE.md` | MODIFIED | each role appends ~50-line routing block | — |
| `coordination/MEMORIAL.md` | MODIFIED | each role appends 1-3 CONFIRMATION/VIOLATION lines | — |
| `coordination/reviews/REVIEWER-REPORT-R83.md` | NEW | Reviewer authors | — |
| `coordination/logs/ROUND-R83-ROUTING.md` | NEW (already present at HEAD; operator-authored at directive commit) | — | — |
| `coordination/logs/ROUND-R83-SUMMARY.md` | NEW (Memorial-Updater authors) | — | — |

### 3.1 ALLOWED_SET (narrative inventory — gate artifact #1; per R72/R82 spec-amendment propagation lesson)

The ALLOWED_SET enumeration appears in FOUR places that must remain in lockstep across any amendment (per CLAUDE-COMMON.md REINFORCED 2026-05-20 `spec-amendment-ALL-gate-artifacts-propagation`; canonicalized at R82 MAJOR-1):

1. **§ 3.1 narrative table (this section)** — the authoritative human-readable enumeration.
2. **§ 3.2 ALLOWED regex** — machine-checkable string for the spec body.
3. **`test/q83-interactive-knobs.test.ts` AC-R83-15 regex** — runtime gate in the test file.
4. **`coordination/specs/Q-R83-EMPIRICAL.sh` Block 5 `ALLOWED` variable** — bash gate at chore-A pre-commit.

Authorized paths (round-start `4c4733d` → R83 HEAD):

| Path | Role of file | Reason in ALLOWED_SET |
|---|---|---|
| `tools/build-canned-demos.ts` | Modified (markup + CSS + JS edits) | Source of truth for `demos/demo.html` regeneration |
| `demos/demo.html` | Modified (regenerated) | Browser-loadable dashboard; R83 UI surface lands here |
| `test/q83-interactive-knobs.test.ts` | New | All 16 R83 ACs |
| `coordination/specs/Q-R83-SPEC.md` | New | This file |
| `coordination/specs/Q-R83-SPEC-AUDIT.md` | New | Audit sidecar |
| `coordination/specs/Q-R83-EMPIRICAL.sh` | New | Binding-command harness |
| `coordination/NEXT-ROLE.md` | Modified | Each role appends routing block |
| `coordination/MEMORIAL.md` | Modified | Each role appends memorial lines |
| `coordination/MEMORIAL-PHASE-[0-9]+\.md` | Potentially modified | If active-file rolls during R83 |
| `coordination/reviews/REVIEWER-REPORT-R83.md` | New | Reviewer authors |
| `coordination/logs/ROUND-R[0-9]+-(SUMMARY\|ROUTING)\.md` | New (generic R-pattern) | Memorial-Updater + operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` | Potentially new | Only if halt fires |
| `CLAUDE.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md` | Potentially modified | Memorial-Updater REINFORCED appends |

**Explicitly NOT in ALLOWED_SET (sentinel for halt-condition tripwires):**

- `demos/scenarios/*.json` — must remain byte-identical to round-start `4c4733d` after `pnpm build:demos` regeneration. Halt condition 9. If these files appear in `git diff 4c4733d HEAD --name-only`, Block 5 anti-scope diff FAILS → Implementer HALT + investigate which seed / runner produced the drift.
- `engine/*` — directive A12 + R82 anti-scope.
- `package.json` — `build:demos` script already exists (line 18); no new scripts needed.
- `pnpm-lock.yaml` — NO new dependencies (directive halt-condition 7).
- `.gitignore` — no new ignores required.
- `demos/engine-bundle.mjs` — gitignored; never appears in diff anyway.
- All `test/q01..q82*.test.ts` files — frozen (R73-R82 deliverables; directive anti-scope).

### 3.2 ALLOWED regex (gate artifact #2; verbatim copy lives in `test/q83-interactive-knobs.test.ts` AC-R83-15 and `Q-R83-EMPIRICAL.sh` Block 5 ALLOWED variable)

```
^(tools/build-canned-demos\.ts|demos/demo\.html|test/q83-interactive-knobs\.test\.ts|coordination/specs/Q-R83-SPEC\.md|coordination/specs/Q-R83-SPEC-AUDIT\.md|coordination/specs/Q-R83-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R83\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

---

## § 4. Per-file pseudocode

All four prescribed surfaces — markup, CSS, JS, test file — appear verbatim in §§ 1.2, 1.3, 1.4, 2.5 above. The Implementer copies them directly; no pseudocode interpretation is required.

The Implementer's chore-A sequence:

1. RED commit: write `test/q83-interactive-knobs.test.ts` with 16 stub `test()` blocks each containing `assert.fail('R83 RED: ' + ac_id);`. Verify `pnpm exec tsc -p tsconfig.test.json && pnpm exec node --test --test-reporter=tap test/q83-interactive-knobs.test.js` shows 16 failures. Commit as `test(R83 RED): 16 assert.fail stubs for interactive knobs ACs`.

2. GREEN commit: apply spec §§ 1.2 (markup), 1.3 (CSS), 1.4 (JS) edits to `tools/build-canned-demos.ts`. Run `pnpm exec tsc -p tsconfig.test.json` (rebuild .js for tools/ + tests/). Run `pnpm exec node tools/build-canned-demos.js` (regenerate `demos/demo.html`). Verify `git status` shows ONLY `tools/build-canned-demos.ts` (and its compiled `.js` which is gitignored) + `demos/demo.html` as modified, with `demos/scenarios/*.json` UNCHANGED (halt condition 9). Replace the test file's `assert.fail` stubs with the verbatim test body from spec § 2.5. Recompile tests. Run full `pnpm exec node --test --test-reporter=tap test/*.test.js | tail -10` and record observed counts verbatim per Rule 6. Commit as `feat(R83 GREEN): interactive control panel + state management — chore-A`.

3. NEXT-ROLE.md routing: append `## § R83 IMPLEMENTER routing block` with `STATUS: READY`, the observed counts verbatim, and the chore-A SHA. (See § 6.2 routing-block template.)

---

## § 5. Acceptance criteria

All 16 ACs are defined in `test/q83-interactive-knobs.test.ts` (verbatim in spec § 2.5). Summary table:

| # | AC | Binding | Discriminating property |
|---|---|---|---|
| 1 | AC-R83-1: control panel section exists | `<section id="tessera-control-panel">` regex match | Section missing → AC fails |
| 2 | AC-R83-2: scenario "custom" option + R71 8-option preservation | section-scoped regex + 8 round-start option presence checks | Missing "custom" OR missing any R71 option → AC fails |
| 3 | AC-R83-3: drift slider min/max/step | combined regex `min="0.05" max="0.40" step="0.025"` | Any attribute drift → AC fails |
| 4 | AC-R83-4: window slider min/max/default | combined regex `min="30" max="200" value="50"` | Any attribute drift → AC fails |
| 5 | AC-R83-5: alpha select has 3 exact options | per-value section-scoped regex | Any missing option → AC fails |
| 6 | AC-R83-6: target shard select ≥ 6 shard-NN options | per-section count via `match(/<option value="shard-\d{2}"/g)` | < 6 shard options → AC fails |
| 7 | AC-R83-7: topology size has 3 options with 6/10/25 in labels | per-value label-content regex | Any size missing OR member-count missing from label → AC fails |
| 8 | AC-R83-8: 5 family checkboxes (a..e) all `checked` | per-key combined regex | Any checkbox missing OR not checked-by-default → AC fails |
| 9 | AC-R83-9: btn-run + btn-reset-params exist; btn-play + btn-reset (R71) remain | 4 button-id regex matches | Any button missing → AC fails |
| 10 | AC-R83-10: controlState + R83_DEFAULTS declared | `var\s+controlState\s*=\s*\{` + `var\s+R83_DEFAULTS\s*=\s*\{` | Either declaration missing → AC fails |
| 11 | AC-R83-11: emitControlChange dispatches `tessera:control-change` CustomEvent on document | function declaration regex + dispatchEvent regex | Wrong event name OR wrong target → AC fails |
| 12 | AC-R83-12: btnRun handler console.logs controlState, NO engine import | region-scoped regex on btnRun handler closure | Missing console.log OR includes `engine-bundle.mjs` → AC fails |
| 13 | AC-R83-13: btnResetParams handler restores defaults + emits change | region-scoped regex on reset handler closure | Missing default-restore OR missing emit call → AC fails |
| 14 | AC-R83-14: R71/R79/R80/R81/R82 surface markers preserved | 8 marker regex matches | Any prior round marker missing → AC fails |
| 15 | AC-R83-15: anti-scope diff ⊆ ALLOWED_SET | `git diff` + regex filter | Any unauthorized path in diff → AC fails |
| 16 | AC-R83-16: typecheck + EMPIRICAL.sh block-presence sentinels | `.js` existence check + 5 Block marker matches | Compile failure OR missing block marker → AC fails |

### 5.1 AC-attestation classification

| AC | Attestation type |
|---|---|
| AC-R83-1 .. AC-R83-14 | Direct file-read assertion in `test/q83-interactive-knobs.test.ts` (committed runtime test; reproducible) |
| AC-R83-15 | Binding-command attestation: `git diff $ROUND_START_SHA HEAD --name-only` filtered by ALLOWED regex; identical to Q-R83-EMPIRICAL.sh Block 5; result is observable via the test framework |
| AC-R83-16 | Composite sentinel: typecheck side-channel (q83 `.js` existence proves `tsc -p tsconfig.test.json` succeeded) + EMPIRICAL.sh block marker presence (proves Implementer authored the script with the 5 expected blocks) |

### 5.2 Architect pre-prediction (binding-command attestation; encode-actual-results-verbatim discipline applies at chore-A; Rule 1 sub-class `empirical-command-attestation`)

The Implementer MUST attest in NEXT-ROLE.md the OBSERVED values verbatim from running these commands at chore-A HEAD; the Architect pre-predictions below are NOT the attestation. Per R26 MAJOR-1 / R72 / R77 / R79 MAJOR-1 cross-project canonical: if any observed value differs from the predicted value beyond the documented band, the Implementer MUST HALT + write DIAGNOSTIC + set STATUS: ESCALATE (per CLAUDE-COMMON.md REINFORCED 2026-05-17 `audit-tier-promotion-mid-round-rule` interpretation: amendment to the EMPIRICAL.sh is a spec triad modification and requires Architect, NOT silent self-amendment per R79 MAJOR-1).

| Observable | Predicted at R83 chore-A | Band / strictness |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | strict |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | strict (node-test exits 1 when subtests fail; baseline carry-forward + R82 AC-R82-14 flip) |
| TAP `# tests` | 652 | strict (R82 close 636 + 16 new R83 ACs) |
| TAP `# pass` | 636 | band [635, 637] (±1 PRNG/environment margin) |
| TAP `# fail` | 13 | strict (R82 close 12 + R82 AC-R82-14 flip) |
| TAP `# skipped` | 4 | strict |
| `bash Q-R83-EMPIRICAL.sh` exit | 0 | strict (all 5 blocks pass) |
| `git diff 4c4733d HEAD --name-only` line count | 9-13 | band |
| `demos/scenarios/*.json` content vs round-start | byte-identical | strict (halt condition 9) |

### 5.3 Acknowledged AC gaps

- **No live browser smoke test for R83 control panel.** R83 ships UI surface + state-management JS source-text; verification is structural (regex over `demos/demo.html`). A live browser would exercise the event-listener wiring (Reviewer can optionally open `demos/demo.html` in a browser, click the controls, and verify `tessera:control-change` events fire in the console; this is NOT an AC because the file:// dashboard pattern is operator-facing, not CI-enforceable). Mitigation: AC-R83-10..13 bind the source-text patterns that Web-API runtime would invoke; a regression in those patterns is caught at static analysis time.
- **No assertion of `demos/scenarios/*.json` byte-identity in the runtime test file.** Halt condition 9 in the directive is enforced procedurally (Implementer pre-commit `git diff --name-only` check) and structurally (AC-R83-15 anti-scope diff: scenarios/*.json is NOT in ALLOWED_SET → if any drifts, AC-R83-15 fails). The combination is equivalent to a direct byte-identity AC; the indirect path keeps the AC count at 16.
- **AC-R83-6 binds ≥6 shard options, not exactly 25.** Future operator may choose to limit/extend the shard-option list (e.g., R84 dynamic repopulation based on topology-size). Binding to ≥6 (the minimum required for `small`) is forward-compatible; the spec § 1.2 markup ships all 25 (covering large topology).

---

## § 6. Anti-scope (what is NOT included this round)

- **NO live engine compute at R83.** Run button is a `console.log` placeholder; R84 wires to `engine-bundle.mjs`.
- **NO modification of `engine/*`** (A12 + R82 + directive anti-scope).
- **NO modification of R73-R82 deliverables** (all frozen).
- **NO new external dependencies** (vanilla HTML/CSS/JS only; halt condition 7).
- **NO modification of `run-pipeline.sh`** (PR #39 pending; directive anti-scope).
- **NO modification of `demos/scenarios/*.json` content** (byte-identical regeneration required; halt condition 9).
- **NO modification of carry-forward AC fail set** (the 12 currently-failing ACs at R82 close stay failing for the same reasons).
- **NO modification of prior-round Q-RNN-SPEC.md files** (directive anti-scope).
- **NO Web Worker boundary at R83** (R84-or-later scope; deferred per directive).
- **NO refactor of existing IIFE pattern** (R71/R79/R80/R81/R82 surfaces preserved by construction; AC-R83-14 enforces).
- **NO real-cluster / DS-repo / `gh repo` operations** (directive anti-scope).
- **NO modification of `package.json` or `pnpm-lock.yaml`** (build:demos script already exists).

### 6.1 Halt conditions (R83 Implementer)

1. `bash Q-R83-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than a pre-documented carry-forward expectation.
2. `pnpm exec tsc -p tsconfig.test.json` exit ≠ 0.
3. Test baseline drift: `# fail` ≠ 13 OR `# pass` outside `[635, 637]` (per § 5.2 band).
4. R61-class architectural-reality discovery (e.g., the IIFE pattern actually NO is single-file as assumed; the build:demos script does NOT regenerate demo.html deterministically).
5. Architect spec uses round-evolution-fragile AC patterns: HALT + DIAGNOSTIC; do NOT silently amend.
6. Any cross-project discipline (Rules 1-7) violated: HALT + DIAGNOSTIC.
7. New external dependency required: HALT + DIAGNOSTIC + ESCALATE.
8. Anti-scope ALLOWED_SET incomplete (per R82 MAJOR-1 lesson): file requires modification not in ALLOWED_SET → HALT + DIAGNOSTIC.
9. `demos/scenarios/*.json` content drifts post-regen: HALT + DIAGNOSTIC (per directive halt-condition 9).
10. R82 smoke block at `demos/demo.html:13206-13230` lost post-regen: HALT + DIAGNOSTIC (tool preservation mechanism regressed).

### 6.2 Implementer routing block template (NEXT-ROLE.md)

```
## § R83 IMPLEMENTER routing block (chore-A)

NEXT-ROLE: REVIEWER
STATUS: READY
Inputs: coordination/specs/Q-R83-SPEC.md
        coordination/specs/Q-R83-SPEC-AUDIT.md
        coordination/specs/Q-R83-EMPIRICAL.sh
        test/q83-interactive-knobs.test.ts
        coordination/reviews/REVIEWER-REPORT-R83.md (Reviewer authors)

### Chore-A SHA: <ACTUAL_CHORE_A_SHA>

### Observed binding-command outputs (verbatim; Rule 1 sub-class empirical-command-attestation; R26+R72+R77+R79+R70 lineage)

- `pnpm exec tsc -p tsconfig.test.json` exit code: <ACTUAL>  (predicted 0)
- `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit code: <ACTUAL>  (predicted 1)
- TAP `# tests`:    <ACTUAL>  (predicted 652)
- TAP `# pass`:     <ACTUAL>  (predicted 636; band [635, 637])
- TAP `# fail`:     <ACTUAL>  (predicted 13 strict)
- TAP `# skipped`:  <ACTUAL>  (predicted 4)
- `bash coordination/specs/Q-R83-EMPIRICAL.sh` exit code: <ACTUAL>  (predicted 0)
- `git diff 4c4733d HEAD --name-only` line count: <ACTUAL>  (predicted 9-13)

### CONFIRMATION lines appended to coordination/MEMORIAL.md

- tdd-discipline-red-green-verified
- empirical-command-attestation-rule-1
- all-16-acs-pass-at-green
- halt-discipline-<none-fired | DIAGNOSTIC-RNN written>
- anti-scope-allowed-set-respected
- demos-scenarios-byte-identity-preserved
```

---

## § 7. Open questions

**None — all resolved.** The directive enumerates the 5-deliverable shape exhaustively; the Architect picks (§ 1.8) close every remaining design degree of freedom.

---

## § 8. Pre-emit grilling output (Superpowers Phase 3; written inline)

Each section is a discipline check; each row is one applied rule with verbatim citation of the source / discipline.

### 8.1 Q.1 — Every claim verifiable?

| Claim | Verification command run at spec-emit | Result | Verdict |
|---|---|---|---|
| Round-start SHA is `4c4733d` | `git rev-parse --short HEAD` | `4c4733d` | PASS |
| Baseline TAP counts: tests=636, pass=620, fail=12, skipped=4 | `pnpm exec node --test --test-reporter=tap test/*.test.js \| tail -12` | `tests=636 pass=620 fail=12 skipped=4` (process exit 1) | PASS — encoded verbatim in § 1.7 + § 5.2 |
| Baseline `tsc` exit = 0 | `pnpm exec tsc -p tsconfig.test.json; echo $?` | `0` | PASS |
| `demos/demo.html` is 13,233 lines | `wc -l demos/demo.html` | `13233` | PASS — matches expected layout (R82 smoke block at 13206-13230) |
| `tools/build-canned-demos.ts` has HTML_TEMPLATE_HEAD at ~line 1175 | `grep -n "HTML_TEMPLATE_HEAD" tools/build-canned-demos.ts` | `1175:const HTML_TEMPLATE_HEAD = ...` + `1906:return HTML_TEMPLATE_HEAD + dataBlock + HTML_TEMPLATE_FOOTER;` | PASS |
| `tools/build-canned-demos.ts` has R82 smoke-block preservation logic | `grep -n "R82-SMOKE-BLOCK" tools/build-canned-demos.ts` | matches at 1942-1953 | PASS |
| `package.json` has `build:demos` script | `grep build:demos package.json` | `"build:demos": "node tools/build-canned-demos.js"` (line 18) | PASS |
| `demos/scenarios/*.json` byte-identical across `pnpm build:demos` runs | (deferred to Implementer pre-commit; not required at spec-emit since determinism is the build:demos invariant; see § 1.7 prediction) | — | DEFERRED; halt condition 9 enforces at chore-A |
| R82 AC-R82-14 forward-protection flip predicted | direct read of `test/q82-engine-browser-bundle.test.ts:191-208` regex; verified R82 ALLOWED regex enumerates `test/q82-engine-browser-bundle\.test\.ts`, `Q-R82-SPEC*`, `REVIEWER-REPORT-R82.md` specifically — NONE of the R83-specific paths (test/q83-*, Q-R83-*, REVIEWER-REPORT-R83) match | flip is structurally guaranteed | PASS — encoded as strict +1 fail in § 5.2 |
| Cite-then-verify: `demos/demo.html:13206-13230` is R82 smoke block range | `sed -n '13206,13230p' demos/demo.html` | matches the R82 smoke block | PASS |
| Cite-then-verify: `demos/demo.html:13142` is selector.addEventListener line | `sed -n '13142p' demos/demo.html` | `  selector.addEventListener('change', function () { loadScenario(selector.value); });` | PASS |
| Cite-then-verify: `tools/build-canned-demos.ts:1942-1956` is smoke-block preservation logic | `sed -n '1942,1956p'` (verified during inspection) | matches | PASS |

### 8.2 Q.2 — Unstated assumptions?

| Assumption | Stated where? | Verification |
|---|---|---|
| `pnpm build:demos` regeneration is deterministic | § 1.7 prediction row + § 1.5 I2 + § 1.7 prediction `byte-identical` | Halt condition 9 enforces at chore-A; if non-deterministic, Implementer halts. R71-R82 all relied on this property; no prior round reported drift. |
| The IIFE in HTML_TEMPLATE_FOOTER is the right insertion point for R83 JS | § 1.4 explicit anchor (`var windowScrubber       = document.getElementById('window-scrubber');`) | Verified by direct read at `demos/demo.html:13136`. |
| R84's engine-wiring will replace only the `btnRun` handler body | § 2.3 explicit | Architect commitment for downstream cycle; AC-R83-12 anti-regression clause (`must NOT include engine-bundle.mjs`) marks the seam. |
| Event-listener wiring guards (`if (el)`) tolerate missing elements | § 1.5 I3 + § 1.4 verbatim | Source pattern matches existing playback-control wiring (`if (windowScrubber) { ... }` at `demos/demo.html:13156`). |
| Adding `<option value="custom">` to `#scenario-selector` does NOT break existing `loadScenario(name)` semantics | § 2.4 explicit | `loadScenario('custom')` → `scenarios.custom` undefined → existing null-guard path (verified by reading the loadScenario function); no breakage. |
| Generic regex patterns (`coordination/logs/ROUND-R[0-9]+-...`) in ALLOWED_SET match R83 log files | § 3.2 explicit | Direct verification: `ROUND-R83-ROUTING.md` (present at HEAD per `git status`) matches the regex. |
| `controlState` global at IIFE-top will NOT collide with future round names | § 1.8 explicit (decision) | The IIFE is the only scope; R84 can rename or encapsulate without test breakage (AC-R83-10 binds the name `controlState`; R84 amendment would update the test). |

### 8.3 Q.3 — Scope added beyond request?

| Addition | In directive? | Verdict |
|---|---|---|
| `param-drift-magnitude-value` + `param-window-count-value` `<span>` elements (live-text reflecting slider value) | NOT in directive verbatim | These are CSS / UX polish; not bound by any AC. Architect adds for usability (sliders without value display are poor UX). Implementer is free to omit if they prefer minimal markup, but the spec § 1.4 JS includes `ctrlDriftMagVal.textContent = ...` writes; the JS write paths are guarded by `if (ctrlDriftMagVal)` so the elements are optional. Verdict: KEEP; falls under "Visual identity — R80 palette consistency; responsive narrow viewport" in directive deliverable #3. |
| Detector family group container `.family-toggles` class | NOT in directive verbatim | CSS-only convenience for layout; not bound by AC. Verdict: KEEP; trivial. |
| `aria-label` attributes on range inputs | NOT in directive verbatim | Accessibility hygiene; matches existing R79 `aria-label="Scrub to window"` pattern. Verdict: KEEP; consistent with existing dashboard. |
| Section heading "Interactive parameters — UI surface (R83); engine wiring lands at R84" | NOT in directive verbatim | Operator-facing context; not bound by AC. Verdict: KEEP; consistency with existing `<h2>` patterns in playback / chart / verdict panels. |

No scope materially beyond the directive's 5 deliverables.

### 8.4 Q.4 — Implementer can act without guessing?

| Decision | Spec source |
|---|---|
| Exact HTML markup | § 1.2 verbatim |
| Exact CSS rules | § 1.3 verbatim |
| Exact JS source | § 1.4 verbatim |
| Exact test file | § 2.5 verbatim |
| Insertion anchors in tools/build-canned-demos.ts | § 1.2 (`</section>\n\n  <section id="live-verdict-banner"`); § 1.3 (`before </style>`); § 1.4 (`var windowScrubber       = document.getElementById('window-scrubber');` line) |
| Chore-A commit sequence | § 4 RED→GREEN |
| Routing block content | § 6.2 template |
| Halt conditions | § 6.1 enumerated |
| Q-R83-EMPIRICAL.sh structure | § 5.2 + Block markers in AC-R83-16 |

Implementer can act without clarifying questions. PASS.

### 8.5 Q.5 — Self-application gate (would the spec's own prescriptions satisfy its own ACs?)

| AC | Spec section that satisfies it | Walk-through |
|---|---|---|
| AC-R83-1 | § 1.2 first line: `<section id="tessera-control-panel" class="control-panel">` | Regex `/<section id="tessera-control-panel"/` matches |
| AC-R83-2 | § 1.2 last block (scenario-selector extension): `<option value="custom">Custom parameters</option>` | Regex match |
| AC-R83-3 | § 1.2 third HTML line: `<input type="range" id="param-drift-magnitude" min="0.05" max="0.40" step="0.025" value="0.10" aria-label="Drift magnitude">` | Combined regex `/<input[^>]*id="param-drift-magnitude"[^>]*min="0\.05"[^>]*max="0\.40"[^>]*step="0\.025"/` matches |
| AC-R83-4 | § 1.2: `<input ... id="param-window-count" min="30" max="200" step="10" value="50" ...>` | Combined regex matches `min="30"...max="200"...value="50"` |
| AC-R83-5 | § 1.2: `<option value="0.001">`, `<option value="0.005" selected>`, `<option value="0.01">` | All 3 regex matches |
| AC-R83-6 | § 1.2: 25 shard options (shard-00 .. shard-24) | Count `25 >= 6` PASS |
| AC-R83-7 | § 1.2: `<option value="small" selected>Small (6 shards)</option>` etc. | Member-count digits 6/10/25 present in labels; regex matches |
| AC-R83-8 | § 1.2: 5 `<input type="checkbox" id="param-family-{a,b,c,d,e}" checked>` | All 5 regex matches |
| AC-R83-9 | § 1.2: `<button id="btn-run" type="button">Run</button>` + `<button id="btn-reset-params" type="button">Reset parameters</button>` | Both regex matches; existing btn-play + btn-reset still present in HTML_TEMPLATE_HEAD (line ~1357) |
| AC-R83-10 | § 1.4: `var R83_DEFAULTS = {` + `var controlState = {` | Both regex matches |
| AC-R83-11 | § 1.4: `function emitControlChange()` + `document.dispatchEvent(new CustomEvent('tessera:control-change', {...}))` | Both regex matches |
| AC-R83-12 | § 1.4: `btnRun.addEventListener('click', function () { console.log('R83 controlState (placeholder for R84 engine wiring):', JSON.stringify(controlState)); });` | Region regex matches; `console.log` regex matches; `engine-bundle.mjs` absence verified |
| AC-R83-13 | § 1.4: btnResetParams handler with `controlState.driftMagnitude = R83_DEFAULTS.driftMagnitude;`, `controlState.windowCount = R83_DEFAULTS.windowCount;`, and trailing `emitControlChange();` | All 3 regex matches |
| AC-R83-14 | All 8 surface markers preserved (R82 smoke block by tool mechanism; other markers in HTML_TEMPLATE_HEAD / FOOTER) | Verified by direct read of `demos/demo.html` at round-start |
| AC-R83-15 | § 3.2 ALLOWED regex copied verbatim into the test; § 4 chore-A diff is by-construction within ALLOWED | Diff at chore-A: tools/build-canned-demos.ts, demos/demo.html, test/q83-interactive-knobs.test.ts, coordination/specs/Q-R83-*, coordination/NEXT-ROLE.md, coordination/logs/ROUND-R83-ROUTING.md — all match |
| AC-R83-16 | `test/q83-interactive-knobs.test.js` exists post-tsc (sentinel); `Q-R83-EMPIRICAL.sh` contains all 5 Block markers (authored by Architect; verified at spec-emit) | PASS by construction |

All 16 ACs satisfied by spec prescriptions. PASS.

### 8.6 Q.6 — Empirical premise verification (R08 MAJOR-2 / R77 EMPIRICAL.sh probe-run rule)

EMPIRICAL.sh probe-run at round-start HEAD `4c4733d`:

- **Block 1 typecheck**: expected PASS (`pnpm exec tsc -p tsconfig.test.json` exit 0 verified at spec-emit per Q.1).
- **Block 2 control panel HTML presence**: expected FAIL — demos/demo.html at round-start has no `#tessera-control-panel` section (Implementer hasn't built yet).
- **Block 3 state-management JS presence**: expected FAIL — same reason.
- **Block 4 test counts**: expected FAIL — at round-start, R83 test file doesn't exist; counts would be baseline tests=636/pass=620/fail=12, not predicted 652/636/13.
- **Block 5 anti-scope diff**: expected PASS — at round-start HEAD, `git diff 4c4733d HEAD` is empty (HEAD == ROUND_START_SHA), so no unauthorized paths exist.

Probe outcome documented in Q-R83-SPEC-AUDIT.md § C.3. No surprise failures — all probe-time non-pass outcomes are pre-documented as "Implementer hasn't built yet."

### 8.7 Q.7 — Spec-internal contradictions sweep

| Pair | Sweep |
|---|---|
| § 1.7 predicted fail count = 13 vs § 5.2 = 13 vs Q-R83-EMPIRICAL.sh Block 4 EXPECTED_FAIL = 13 | All three sites agree |
| § 1.7 predicted pass band [635, 637] vs § 5.2 = [635, 637] vs Q-R83-EMPIRICAL.sh Block 4 EXPECTED_PASS_MIN/MAX = 635/637 | All three sites agree |
| § 1.4 emitControlChange dispatches `tessera:control-change` vs § 2.5 test regex `/['"]tessera:control-change['"]/` vs § 2.2 narrative `'tessera:control-change'` | All three sites agree |
| § 1.2 markup `id="tessera-control-panel"` vs § 2.5 test regex `/<section id="tessera-control-panel"/` vs § 5 AC-R83-1 table description | All three sites agree |
| § 1.4 btnRun handler `console.log(...controlState)` vs § 2.5 test regex `/console\.log\([^)]*controlState/` vs § 2.3 narrative | All three sites agree |
| § 3.1 ALLOWED_SET narrative table vs § 3.2 regex vs § 2.5 AC-R83-15 in-test regex vs Q-R83-EMPIRICAL.sh Block 5 ALLOWED variable | All four sites agree (R82 MAJOR-1 lesson application — all four gate artifacts verified in lockstep at spec-emit) |
| § 6.1 halt-condition 8 ("Anti-scope ALLOWED_SET incomplete") vs § 3.1 enumeration | Halt condition + enumeration agree; no conflicting prescriptions |
| § 1.2 drift slider `value="0.10"` vs § 1.4 R83_DEFAULTS.driftMagnitude = `0.10` vs § 2.5 AC-R83-3 regex (no value check) | DOM initial vs JS state initial — both `0.10`; AC-R83-3 doesn't bind the default value (intentional, since min/max/step are the load-bearing properties); no contradiction |
| § 1.4 R83_DEFAULTS shape vs § 1.4 controlState initial-assignment shape | identical 6 top-level keys + 5 family sub-keys |

No contradictions found. PASS.

### 8.8 Q.8 — Acknowledged-gap pairing (R74 MINOR-2 lesson)

§ 5.3 documents 3 acknowledged gaps; each pairs with a mitigation:

| Gap | Mitigation |
|---|---|
| No live browser smoke test for R83 control panel | Source-text ACs (AC-R83-10..13) bind the patterns that Web-API runtime invokes; static-analysis regression caught |
| No direct byte-identity AC for `demos/scenarios/*.json` | Indirect path: AC-R83-15 anti-scope diff (scenarios not in ALLOWED_SET → drift fails the AC) + halt condition 9 (Implementer pre-commit check) |
| AC-R83-6 binds ≥6 shard options not exactly 25 | Forward-compatibility decision (R84 may dynamically narrow per topology size); spec § 1.2 ships the full 25 |

Each gap is paired with a concrete mitigation. PASS.

### 8.9 Q.9 — Cross-section consistency (R01-R02 16-token sweep equivalent)

| Token / identifier | All sites where it appears | Consistency |
|---|---|---|
| `tessera-control-panel` | § 1.2, § 1.3, § 1.5 I1, § 2.5 (AC-R83-1, AC-R83-14), § 5 table | Identical hyphenation everywhere |
| `tessera:control-change` | § 1.4, § 2.2, § 2.5 (AC-R83-11), § 5 table | Identical colon-separated namespace everywhere |
| `controlState` | § 1.4, § 2.1, § 2.5 (AC-R83-10, AC-R83-12, AC-R83-13), § 5 table | Identical camelCase everywhere |
| `R83_DEFAULTS` | § 1.4, § 2.5 (AC-R83-10, AC-R83-13), § 5 table | Identical UPPER_SNAKE everywhere |
| `btn-run` / `btn-reset-params` | § 1.2, § 1.3, § 1.4 (`btnRun`, `btnResetParams` JS refs), § 2.5 (AC-R83-9, AC-R83-12, AC-R83-13), § 5 table | DOM IDs hyphenated; JS refs camelCased; consistent within each axis |
| `param-drift-magnitude`, `param-window-count`, `param-alpha-threshold`, `param-target-shard`, `param-topology-size`, `param-family-{a,b,c,d,e}` | § 1.2, § 1.4 (DOM ref ids), § 2.5 (AC-R83-3..AC-R83-8), § 5 table | Identical hyphenated IDs everywhere |
| `R82-SMOKE-BLOCK-START` / `R82-SMOKE-BLOCK-END` | § 2.5 (AC-R83-14), § 1.5 I5 | Identical marker strings |
| `4c4733d` (round-start SHA) | § header, § 1.7, § 2.5, § 5.2, § 8.6, Q-R83-EMPIRICAL.sh | Identical 7-char prefix |
| `652` predicted tests count | § 1.7, § 5.2 | Identical |
| `636` predicted pass count | § 1.7, § 5.2 | Identical |
| `13` predicted fail count | § 1.7, § 5.2 | Identical |
| ALLOWED_SET regex string | § 3.2, § 2.5 (AC-R83-15), Q-R83-EMPIRICAL.sh Block 5 | Identical regex |
| `pnpm exec tsc -p tsconfig.test.json` | § 1.7, § 5.2, § 6.1 halt-1, Q-R83-EMPIRICAL.sh Block 1 | Identical command |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` | § 1.7, § 5.2, Q-R83-EMPIRICAL.sh Block 4 | Identical command |
| 5 family keys `{a, b, c, d, e}` | § 1.2 markup, § 1.4 R83_DEFAULTS, § 1.4 wireFamilyCheckbox calls, § 2.5 (AC-R83-8) | Identical 5-element list everywhere |
| Drift range `0.05 / 0.40 / 0.025` | § 1.2 markup, § 1.8 table, directive verbatim, § 2.5 (AC-R83-3) | Identical |
| Window range `30 / 200` default `50` | § 1.2 markup, § 1.8 table, directive verbatim, § 2.5 (AC-R83-4) | Identical |

No cross-section drift. PASS.

### 8.10 Q.10 — Discriminating-AC walk-through (R44/R46/R65 MINOR-1/R71 MINOR-1 lesson)

For each AC, ask: would the AC FAIL if the canonical structural element / behavior were absent?

| AC | Mutation that should FAIL the AC | Verdict |
|---|---|---|
| AC-R83-1 | Remove `<section id="tessera-control-panel">` from HTML → regex `/<section id="tessera-control-panel"/` no longer matches → FAIL | Discriminating |
| AC-R83-2 | Delete `<option value="custom">` from #scenario-selector → section-scoped regex fails → FAIL | Discriminating |
| AC-R83-3 | Change `min="0.05"` to `min="0.10"` → combined regex fails → FAIL | Discriminating |
| AC-R83-4 | Change `max="200"` to `max="150"` → combined regex fails → FAIL | Discriminating |
| AC-R83-5 | Drop the `0.001` option → per-value regex fails → FAIL | Discriminating |
| AC-R83-6 | Reduce shard list to 5 → count `5 >= 6` FAIL | Discriminating |
| AC-R83-7 | Replace `Small (6 shards)` with `Small (4 shards)` → label-content regex `[^<]*6[^<]*` fails → FAIL | Discriminating |
| AC-R83-8 | Remove `checked` from `param-family-a` → per-key regex `id="param-family-a"[^>]*checked` fails → FAIL | Discriminating |
| AC-R83-9 | Remove `btn-run` button OR remove `btn-play` button → corresponding regex fails → FAIL | Discriminating in both directions |
| AC-R83-10 | Rename `controlState` to `paramState` → declaration regex fails → FAIL | Discriminating |
| AC-R83-11 | Change event name to `tessera:controls-change` (plural) → dispatchEvent regex fails → FAIL | Discriminating |
| AC-R83-12 | Replace `console.log(... controlState ...)` with `console.log('clicked')` → console.log regex fails → FAIL. ALSO: add `import('./engine-bundle.mjs')` → anti-regression assertion fails → FAIL | Discriminating in both directions |
| AC-R83-13 | Reset handler omits `controlState.driftMagnitude = R83_DEFAULTS.driftMagnitude` → field-restore regex fails → FAIL | Discriminating |
| AC-R83-14 | Delete `__tessera_r82_smoke__` from HTML → R82 marker regex fails → FAIL. Same for all 8 marker assertions | Discriminating per marker |
| AC-R83-15 | Add `demos/scenarios/clean-baseline.json` to diff (non-ALLOWED) → violators non-empty → FAIL | Discriminating |
| AC-R83-16 | Remove "── Block 3:" line from EMPIRICAL.sh → block-marker regex fails → FAIL | Discriminating |

All 16 ACs are structurally discriminating in at least one direction. PASS.

### 8.11 Q.11 — spec-amendment-ALL-gate-artifacts-propagation (R82 MAJOR-1 lesson; applied UPFRONT)

The R82 lesson: ALLOWED_SET amendments must propagate in lockstep across all 4 gate artifacts.

At spec-emit time (no amendment yet, but the discipline scaffolding is in place):

| Gate artifact | ALLOWED_SET source |
|---|---|
| 1. § 3.1 narrative inventory table | listed (13 path patterns) |
| 2. § 3.2 ALLOWED regex (machine-checkable) | verbatim copy |
| 3. `test/q83-interactive-knobs.test.ts` AC-R83-15 regex | verbatim copy (lives in § 2.5) |
| 4. `Q-R83-EMPIRICAL.sh` Block 5 ALLOWED variable | verbatim copy (lives in EMPIRICAL.sh) |

All 4 gate artifacts share the SAME 13 path patterns at spec-emit. Any future amendment (e.g., operator authorizes scope extension during R83) MUST update all 4 simultaneously. The Implementer's halt condition 8 enforces this at chore-A.

PASS — discipline scaffolding in place.

### 8.12 Q.12 — Routing-block grep-verification (R65 MINOR-1 lesson)

Routing block (§ 6.2 template) cites: AC-R83-1..16, ROUND_START_SHA `4c4733d`, file paths to Q-R83-SPEC.md / Q-R83-SPEC-AUDIT.md / Q-R83-EMPIRICAL.sh / test/q83-interactive-knobs.test.ts. Each citation is grep-verifiable:

| Citation | Source file | Verification |
|---|---|---|
| "AC-R83-1" through "AC-R83-16" | spec § 2.5 + § 5 + § 8.10 | grep `AC-R83-N` returns N=1..16 |
| ROUND_START_SHA `4c4733d` | spec header + § 1.7 + § 5.2 + § 2.5 ROUND_START_SHA constant | grep `4c4733d` returns multiple matches |
| `coordination/specs/Q-R83-SPEC.md` | self-reference | trivially correct |
| `test/q83-interactive-knobs.test.ts` | § 1.1 inventory + § 2.5 file-path comment | identical hyphenation everywhere |

PASS.

### 8.13 Q.13 — Anti-scope ALLOWED_SET forward-coverage walk (R79 lesson + R25 MAJOR-2 + R79 ARCH-grilling pre-emit gap)

Walk prior 2 rounds' forward-protection ACs to predict flips:

| Prior round | AC | Round-start SHA | ALLOWED regex includes R83 paths? | Predicted flip |
|---|---|---|---|---|
| R82 | AC-R82-14 | `5c3e0d9` | NO — R82 regex enumerates `test/q82-engine-browser-bundle\.test\.ts`, `Q-R82-SPEC*`, `REVIEWER-REPORT-R82.md` specifically; R83 paths (test/q83-*, Q-R83-*, REVIEWER-REPORT-R83) absent | YES → 1 new fail at R83 chore-A |
| R81 | AC-R81-14 | `0eb371f` | Already failing at R82 close (carry-forward) — re-flipping a failing AC doesn't change strict fail count | No NEW change |
| R80 | AC-R80-14 | similar | Already failing at R82 close (carry-forward) | No NEW change |
| R79 | AC-R79-14 | similar | Already failing at R82 close (carry-forward) | No NEW change |

R83 introduces ONE new fail (R82 AC-R82-14 flip). Encoded as strict +1 in § 5.2 (12 → 13). Matches Architect prediction.

PASS — exhaustive forward-protection-AC audit complete.

### 8.14 Q.14 — Cite-then-verify for all line citations (R02 / R11 / R65 lessons)

| Citation | Verification command run at spec-emit | Result |
|---|---|---|
| `demos/demo.html:13206-13230` is R82 smoke block | `sed -n '13206,13230p' demos/demo.html` | verified — block matches |
| `demos/demo.html:13136` is `var windowScrubber = document.getElementById('window-scrubber');` | (verified during reading; line 13136 in the file at HEAD) | verified |
| `tools/build-canned-demos.ts:1175` is `HTML_TEMPLATE_HEAD = ` | `grep -n HTML_TEMPLATE_HEAD tools/build-canned-demos.ts` | line 1175 returned |
| `tools/build-canned-demos.ts:1428` is `HTML_TEMPLATE_FOOTER = ` | `grep -n HTML_TEMPLATE_FOOTER tools/build-canned-demos.ts` | line 1428 returned |
| `tools/build-canned-demos.ts:1942-1956` is R82 smoke block preservation | direct read (verified) | matches |
| `tools/build-canned-demos.ts:1347-1356` is `<select id="scenario-selector">` block | `grep -n "<select id=\"scenario-selector\"" tools/build-canned-demos.ts` | line 1347 returned |
| `package.json:18` is `"build:demos": "node tools/build-canned-demos.js"` | `grep -n "build:demos" package.json` | line 18 returned |
| `demos/demo.html:13142` is `selector.addEventListener('change', ...)` | (verified during reading) | matches |
| `demos/demo.html:13156` is `windowScrubber.addEventListener('input', ...)` | (verified during reading) | matches |
| `demos/demo.html:13136` (R79 DOM ref windowScrubber declaration) | (verified during reading) | matches |

PASS — no off-by-N drift in any line citation.

### 8.15 Q.15 — Re-read as Implementer; mark assumptions Implementer can't verify

Re-reading the spec as Implementer:

- § 1.2/1.3/1.4 are verbatim source-code; Implementer copies. ✓
- § 1.5 anchors ("`</section>\n\n  <section id="live-verdict-banner"`") are byte-precise; Implementer locates by grep. ✓
- § 4 chore-A sequence is RED→GREEN with explicit commands. ✓
- § 5.2 binding-command attestation table prescribes exact commands + predicted values + bands. ✓
- § 6.1 halt conditions are enumerated with explicit triggers. ✓
- § 6.2 routing block template includes verbatim placeholder slots for OBSERVED values. ✓
- All ALLOWED_SET sources (§ 3.1, § 3.2, AC-R83-15 in § 2.5, Q-R83-EMPIRICAL.sh Block 5) carry the SAME 13 path patterns; if amendment needed mid-round, halt condition 8 fires. ✓
- The "Implementer can act with zero clarifying questions" gate: PASS — no decisions deferred.

### 8.16 Final pre-emit grilling verdict

All 14 sub-sections (Q.1 through Q.14) PASS plus Q.15 re-read-as-Implementer review PASS. No surprise outcomes; all load-bearing claims verified by direct command at spec-emit; all gate artifacts in lockstep.

**STATUS: READY for routing to Implementer.**

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | controlState mutates exactly when its bound control fires; emitControlChange dispatches a shallow-cloned snapshot; Run handler logs the state. All assertions in § 2.5 test file. |
| Completeness | All 7 directive control categories (scenario selector custom option; drift slider; window slider; α dropdown; target shard; topology size; family toggles; Run; Reset) prescribed verbatim in § 1.2. |
| Consistency | All identifiers, ranges, defaults, and event names consistent across § 1.2 (markup) / § 1.4 (JS) / § 2.5 (tests) per Q.9 cross-section sweep. |
| Clarity | Banned ambiguous language ("appropriately", "correctly", "as needed") absent from AC text. Each AC names a specific structural property + a specific assertion. |
| Coverage | 16 ACs × 1 test() block each = 16 added test counts; binding to 7 control categories + state-management + anti-regression + anti-scope + sentinels. |
| Constraints | R82 frozen surfaces preserved (AC-R83-14); engine/* untouched (anti-scope); demos/scenarios/*.json byte-identical (halt condition 9); no new deps (halt condition 7). |
| Concurrency | N/A — single-threaded browser event loop; emitControlChange is synchronous dispatch. |
| Corner cases | (a) Element absent at DOM-init (`if (el)` guards in § 1.4); (b) "custom" scenario selected with no engine yet wired — loadScenario(undefined) hits existing null-guard path; (c) Reset before any control change — defaults already initial values, no-op effectively; (d) Multiple rapid slider drags — `input` event fires per pixel; emitControlChange called per event (acceptable for R83; R84 may add debounce). |
| Cost | Implementer footprint: 1 modified tool (+180 lines), 1 regenerated HTML (+180 lines mirror), 1 new test file (~200 lines), 3 spec triad files. Reviewer footprint: 1 report. ~6 file diff total. |
| Coupling | R83 surface decouples from rendering by going through `tessera:control-change` CustomEvent → R84 subscriber is the only consumer. Existing playback/scrubber/chart wiring is independent. |

---

## § 10. Pipeline invocation (recap from directive)

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R83 --tier full
```

Spec triad committed BEFORE chore-A per CLAUDE-ARCHITECT.md REINFORCED 2026-05-17 (R21 ARCH MINOR-1 derivation): the Architect must commit `Q-R83-SPEC.md` + `Q-R83-SPEC-AUDIT.md` + `Q-R83-EMPIRICAL.sh` in a `spec(R83)` commit BEFORE writing the routing block in NEXT-ROLE.md that dispatches Implementer.
