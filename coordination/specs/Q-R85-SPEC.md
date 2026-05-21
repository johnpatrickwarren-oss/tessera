# Q-R85-SPEC.md — SLICE 3 close + Phase 4 close memorialization (Phase 4 FINAL ROUND)

**Round:** R85 (Phase 4 SLICE 3 fourth + final round)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `f737877` (`f737877…`; verified at Architect session entry via `git rev-parse --short HEAD`)
**Routing status (Architect → Implementer):** **READY** (no open architectural questions; spec triad complete; EMPIRICAL.sh probe-run at round-start HEAD confirms baseline tests=669/pass=650/fail=15/skipped=4 — § 8.6)

R85 closes Phase 4 SLICE 3. Five deliverables:

1. **`demos/demo.html` final polish** — explicit **Canned vs Live mode toggle** at the top of the page; per-mode UI clarity (scenario selector active in Canned; control panel active in Live); scrubber max dynamically tracks Worker-emitted ticks in Live mode; **loading spinner** during Worker bundle load; **#engine-run-status / "Run again" affordance** showing post-terminal status; error banner CSS polish.
2. **`demos/DEMO-SCRIPT.md` extension** — new "Minute 10:00 – 12:00 — Live mode (interactive)" section + a new "## Contents" ToC at the top.
3. **`README.md` Quick demo extension** — one paragraph in the Browser dashboard subsection mentioning the Live mode toggle + reference to DEMO-SCRIPT § Live mode beat.
4. **`~/.claude/CROSS-PROJECT-MEMORIAL.md` Phase 4-derived promotions** — three new entries landed in the canonical file:
   - `haiku-mu-status-field-disambiguation` (Tessera R75 + R78 + R80 + R83 = 4 instances; threshold crossed at R80; canonical landing at R85).
   - `architect-encoded-regex-with-hardcoded-bounds` (sub-class of canonical Rule 1 + `claim-then-walk` Architect-side rule; 6 instances at Tessera R62 + R66 + R68 + R72 + R83 + R84; far past threshold).
   - `vendored-at-pin → vendored-with-deltas reclassification precedent` (2 instances at R56 verdict.ts + R82 topology-overlay.ts; documented as 2-instance flag with explicit 3rd-instance derivation trigger per Rule 7).
5. **Test file `test/q85-slice-3-close.test.ts`** — 20 ACs covering all four surfaces, anti-regression of R71–R84, anti-scope diff, sentinels.

Plus the discipline scaffolding: **`coordination/specs/Q-R85-EMPIRICAL.sh`** (binding-command harness; `--test-reporter=tap` per R77).

The directive's hard scope boundary: **NO modification of `engine/*` OR R73–R84 deliverables (frozen)**, **NO modification of carry-forward AC fail set** (15 fails at R85 round-start), **NO new external dependencies**, **NO modification of `run-pipeline.sh`** (PR #39 pending), **NO real-cluster / DS-repo / `gh repo` operations** beyond push to Tessera public, **NO modification of prior-round Q-RNN-SPEC.md files**. This spec preserves all of them — the toggle / spinner / status indicator / DEMO-SCRIPT extension / README extension / cross-project promotions are additive surfaces; R71/R79/R80/R81/R82/R83/R84 markers are explicitly preserved via AC-R85-18.

---

## § 0. Brainstorm (Superpowers Phase 1)

Three architectural decisions are load-bearing for R85:

### 0.1 Decision A — Mode state representation

(i) **Add `mode` field to existing R83 `controlState` object.** controlState is the canonical state surface; adding `mode: 'canned' | 'live'` keeps state co-located. Risk: R83_DEFAULTS reset would need a `mode` field too; emitControlChange events would carry mode transitions; downstream listeners might need to filter. Coupling.

(ii) **Separate `currentMode` module-private variable + `setMode(mode)` function.** Mode is a UI-layer concern (which controls are active, which CSS class is set on body); it does not parameterize the engine compute path. Keeping it out of controlState preserves the R83 wire shape exactly + avoids touching `tessera:control-change` semantics.

**Pick (ii).** Mode is UI-coupling, not state-of-the-world. The R83 anti-regression AC asserts `var\s+controlState\s*=\s*\{` regex shape (R84 AC-R84-15); modifying controlState's shape risks subtle drift. controlState should remain the *engine-input* state; mode is *UI-input*.

### 0.2 Decision B — Mode toggle UI shape

(i) **Radio group** `<fieldset id="mode-toggle">` with two `<input type="radio" name="mode">` inputs. Native, accessible, no JS for keyboard navigation. Width: ~140px. Semantic.

(ii) **Select dropdown** `<select id="mode-toggle">` with two options. Compact (~80px). Less visually obvious — the "you can switch modes" affordance is buried inside the dropdown.

(iii) **Button pair** `<button id="mode-canned">` + `<button id="mode-live">` with ARIA `pressed` state. Custom toggle; needs ARIA + active-state CSS. More code.

**Pick (i).** Radio group is the most obvious affordance — "two choices, one selected" reads at a glance. Native HTML semantics; minimal JS. Implementation footprint ≈ 6 lines markup + 8 lines JS listener.

### 0.3 Decision C — Per-mode UI affordance mechanism

(i) **Per-element `disabled` toggling in JS** (`element.disabled = (mode === 'canned')` for control-panel inputs; `selector.disabled = (mode === 'live')` for scenario selector). Explicit per-element; readable in code; CSS `:disabled` styles already render gray-out.

(ii) **Single `body[data-mode='X']` attribute + CSS rules** (`body[data-mode="canned"] #tessera-control-panel input { opacity: 0.4; pointer-events: none; }`). One JS line per mode transition; all affordance logic in CSS. Less code; more centralized.

(iii) **Hybrid:** JS sets `body[data-mode]` AND toggles `disabled` on each input (CSS handles visual gray-out; JS-level disabled prevents accidental keyboard/form-submission interactions).

**Pick (iii).** Both surfaces matter: visual gray-out (CSS via body[data-mode]) communicates "this is inactive" to the operator; `element.disabled=true` prevents the inputs from being keyboard-tabbed-into or form-submitted. Combining both is the safest. Implementation footprint: ~8 lines CSS + setMode() function ~15 lines JS.

### 0.4 Selection rationale

The combined picks (ii + i + iii) realize the directive's "explicit mode toggle + per-mode UI clarity" with minimal surface intrusion:

- **Surface preserved:** R83 controlState / R83_DEFAULTS / emitControlChange unchanged; R84 btnRun handler body unchanged except for an additive `r84ShowLoadingSpinner()` first-line call + a small spinner-hide call inside the onmessage 'window' branch.
- **Scrubber integration:** the existing `windowScrubber` ref is reused. In Live mode, the existing `currentWindowIdx = data.windowIdx;` line inside R84 onmessage already advances per window; R85 adds one line that updates `windowScrubber.max = String(scenarios['custom'].windows.length - 1)` on each window message so the scrubber range grows as windows accumulate.
- **"Run again" affordance:** `#engine-run-status` element displays one of three texts: "" (initial / between runs), "Running window X / N" (during streaming), "Run complete — K selected of N shards. Click Run to recompute." (post-terminal). The element is hidden in Canned mode via `body[data-mode='canned'] #engine-run-status { display: none; }`.
- **Loading spinner:** `#engine-loading-indicator` div with CSS `@keyframes` animation, shown while Worker is spawning and engine bundle is loading (between btnRun click and first 'window' message). Hidden on first 'window' / 'terminal' / 'error'.

### 0.5 Alternative approaches considered

**Approach B — Mode as URL fragment** (e.g., `demo.html#live` activates Live mode). Pros: shareable. Cons: requires popstate listener; conflicts with future feature flagging; not what the directive asks. **Rejected.**

**Approach C — Auto-detect Live mode when "custom" scenario selected.** R84's behavior was: click Run → scenario becomes "custom" → auto-Live. This implicit-mode UX is what the directive explicitly wants to make EXPLICIT via the toggle. **Rejected** as per directive.

**Approach D — Hide Canned vs Live UI completely from the test surface.** Tests would only cover engine-worker.js + Worker postMessage protocol. Cons: directive's primary deliverable IS the UI polish + toggle; ignoring it in ACs would leave the work uninstrumented. **Rejected.**

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries (what exists | what's created | what changes | what's deleted)

| Surface | State | Notes |
|---|---|---|
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` body (above `#tessera-controls`) | **MODIFIED** | Insert `<fieldset id="mode-toggle">` with two radio inputs (canned/live); `<div id="engine-loading-indicator">` and `<div id="engine-run-status">` inside `#tessera-control-panel` after the existing `#engine-error-banner` |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_HEAD` `<style>` block | **MODIFIED** | Add CSS rules for `#mode-toggle`, `body[data-mode='canned']` / `body[data-mode='live']` gray-out selectors, `#engine-loading-indicator` (spinning animation), `#engine-run-status`, error banner polish (`::before` warning icon) |
| `tools/build-canned-demos.ts` — `HTML_TEMPLATE_FOOTER` IIFE | **MODIFIED** | Add `var currentMode='canned'; function setMode(...){...}` block early in the IIFE (before R83 controlState declaration is fine; preferred placement is right after the existing DOM ref block); add radio-input change listener; modify R84 btnRun handler to call `r84ShowLoadingSpinner()` first and to update scrubber.max + updateRunStatus + hideSpinner inside onmessage |
| `demos/demo.html` | **MODIFIED** (regenerated) | Mirror of tool edits |
| `demos/DEMO-SCRIPT.md` | **MODIFIED** | Add `## Contents` ToC section after "Before you start"; add `## Minute 10:00 – 12:00 — Live mode (interactive)` section between current `## Minute 8:00 – 10:00 — Close` and `## Bank of follow-up questions` |
| `README.md` | **MODIFIED** | Browser dashboard subsection (line 77+) gains one paragraph mentioning Live mode + reference to DEMO-SCRIPT § Minute 10:00 |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | **MODIFIED** | Append 3 promotion entries (see § 1.6 verbatim) |
| `test/q85-slice-3-close.test.ts` | **NEW** | 20 R85 ACs |
| `coordination/specs/Q-R85-SPEC.md` | **NEW** | This file |
| `coordination/specs/Q-R85-SPEC-AUDIT.md` | **NEW** | Audit sidecar |
| `coordination/specs/Q-R85-EMPIRICAL.sh` | **NEW** | Binding-command harness |
| `coordination/NEXT-ROLE.md` | **MODIFIED** | Each role appends routing block |
| `coordination/MEMORIAL.md` | **MODIFIED** | Each role appends CONFIRMATION/VIOLATION lines |
| `coordination/reviews/REVIEWER-REPORT-R85.md` | **NEW** | Reviewer authors |
| `coordination/logs/ROUND-R85-(SUMMARY|ROUTING).md` | **NEW** (generic R-pattern in ALLOWED_SET) | Memorial-Updater + operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R85-*.md` | **POTENTIAL NEW** (allowed) | Only if halt fires |
| `CLAUDE-*.md` | **POTENTIAL MODIFIED** (allowed) | Memorial-Updater REINFORCED appends |
| All `engine/*` files | UNCHANGED | A12 + R82 + directive anti-scope |
| All `demos/scenarios/*.json` | UNCHANGED (byte-identical post-regen) | Halt condition 9 |
| `demos/engine-bundle.mjs` | UNCHANGED (gitignored; produced by `pnpm build:browser`) | R82 artifact |
| `demos/engine-worker.js` | UNCHANGED | R84-frozen surface |
| R82 smoke block at `demos/demo.html:13452-13477` | UNCHANGED (preserved by tool mechanism) | R82 marker-preservation |
| R83 surfaces (`#tessera-control-panel`, `controlState`, `R83_DEFAULTS`, `emitControlChange`, all listeners, `btnResetParams`) | UNCHANGED | AC-R84-15 anti-regression enforces |
| R84 surfaces (`#btn-cancel`, `#engine-error-banner`, `r84ShowError`, `worker.onmessage`, `new Worker('./engine-worker.js')`) | UNCHANGED in identity (additive lines inside btnRun handler are within R84 surface; R84 ACs continue passing — verified by walk in § 8.10) | AC-R84-15 enforces |
| `test/q01..q84*.test.ts` | UNCHANGED | Forward-protection AC-R84-16 will flip → fail (predicted; § 1.4) |
| `package.json` / `pnpm-lock.yaml` / `.gitignore` | UNCHANGED | No new deps; no new build scripts |
| `tools/build-browser-bundle.ts` | UNCHANGED | R82-frozen |

### 1.2 New HTML markup — mode toggle + loading indicator + run-status (verbatim; Implementer inserts into `HTML_TEMPLATE_HEAD`)

**Insertion point A — mode toggle (place INSIDE `<section id="tessera-controls">` at the TOP, BEFORE the `<select id="scenario-selector">` element):**

```html
    <fieldset id="mode-toggle" class="mode-toggle">
      <legend>Mode</legend>
      <label><input type="radio" name="tessera-mode" value="canned" checked> Canned</label>
      <label><input type="radio" name="tessera-mode" value="live"> Live</label>
    </fieldset>
```

**Insertion point B — loading indicator + run status (place INSIDE `#tessera-control-panel`, AFTER the existing `#engine-error-banner` div):**

```html
    <div id="engine-loading-indicator" class="loading-indicator" hidden aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span class="loading-text">Loading engine bundle…</span>
    </div>
    <div id="engine-run-status" class="run-status" aria-live="polite"></div>
```

### 1.3 New CSS rules (verbatim; Implementer appends to `HTML_TEMPLATE_HEAD` `<style>` block — before `</style>`)

```css
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

    /* Error banner polish: warning icon + slight padding tweak. */
    #engine-error-banner::before { content: '\26A0  '; font-size: 0.9rem; }
```

### 1.4 New JS — setMode + spinner helpers + run-status helper + btnRun handler additive edits (verbatim; Implementer copies into `HTML_TEMPLATE_FOOTER`)

**Insertion point A — early in the IIFE, RIGHT AFTER the existing `var windowScrubber = document.getElementById('window-scrubber');` line block. (R84 added `var btnCancel = ...; var engineErrorBanner = ...; var r84ActiveWorker = null;` after R83 declarations; R85 inserts the mode + spinner DOM refs adjacent to that R84 block):**

```js
  // ── R85: mode toggle + loading spinner + run-status affordance ──
  var modeToggleEl       = document.getElementById('mode-toggle');
  var modeRadios         = document.querySelectorAll('input[name="tessera-mode"]');
  var engineLoadingIndicator = document.getElementById('engine-loading-indicator');
  var engineRunStatus    = document.getElementById('engine-run-status');
  var currentMode        = 'canned';

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
    // Reset run-status when switching modes; the affordance is per-run.
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
```

**Insertion point B — minimal, additive edits INSIDE the existing R84 btnRun click handler. Implementer locates by literal-match anchors:**

1. **At the START of the btnRun click handler body**, immediately AFTER `r84HideError(); r84SetRunning(true);` (existing R84 first two lines), insert:
```js
      r85ShowLoadingSpinner();
      updateRunStatus('reset');
```

2. **INSIDE `worker.onmessage`'s `data.type === 'window'` branch**, immediately AFTER the existing `currentWindowIdx = data.windowIdx;` line, insert:
```js
          if (windowScrubber) windowScrubber.max = String(Math.max(0, scenarios['custom'].windows.length - 1));
          if (data.windowIdx === 0) r85HideLoadingSpinner();
          updateRunStatus('running', { windowIdx: data.windowIdx, totalWindows: scenarios['custom'].params.window_count });
```

3. **INSIDE `worker.onmessage`'s `data.type === 'terminal'` branch**, immediately AFTER the existing `if (typeof renderBadges === 'function') renderBadges(scenarios['custom'], currentWindowIdx);` line, insert:
```js
          r85HideLoadingSpinner();
          updateRunStatus('complete', { scenario: scenarios['custom'] });
```

4. **INSIDE `worker.onmessage`'s `data.type === 'error'` branch**, immediately AFTER `r84ShowError(data.error || 'unknown engine error');`, insert:
```js
          r85HideLoadingSpinner();
          updateRunStatus('error');
```

5. **INSIDE `worker.onerror = function (err) {...}`** body, immediately AFTER `r84ShowError(String(err && err.message || err));`, insert:
```js
        r85HideLoadingSpinner();
        updateRunStatus('error');
```

6. **INSIDE the btnCancel click handler** (existing R84 surface), immediately AFTER `if (r84ActiveWorker) { try { r84ActiveWorker.terminate(); } catch (e) {} r84ActiveWorker = null; }`, insert:
```js
      r85HideLoadingSpinner();
      updateRunStatus('cancelled');
```

**Total additive footprint inside R84 handlers:**
- btnRun handler body start: +2 lines (~80 chars)
- onmessage 'window' branch: +3 lines (~250 chars)
- onmessage 'terminal' branch: +2 lines (~110 chars)
- onmessage 'error' branch: +2 lines (~50 chars)
- worker.onerror body: +2 lines (~50 chars)
- btnCancel handler: +2 lines (~50 chars)

Sum: ~590 chars added across the R84 handler region. Per § 8.10 walk: R84 btnRun handler is currently 3133 chars; the first inner `});` (which the R84 AC-R84-8 / -10 / -11 `{0,3000}?` non-greedy regexes anchor to) is at the `scenarios['custom'].windows.push({...});` close at ~1563 chars from the handler start. Adding ~590 chars across multiple insertion points pushes the first `});` to at most ~1850 chars — well below the 3000-char regex bound. R84 ACs continue to pass. (See § 8.10 explicit walk.)

### 1.5 DEMO-SCRIPT.md modifications (verbatim; Implementer applies)

**Insertion point A — after the existing "Before you start" section heading body (currently ends with the line "Pre-open context: …" on line 13), INSERT this new section:**

```markdown
## Contents

- [Minute 0:00 – 2:00 — Clean-baseline (trust establishment)](#minute-000--200--clean-baseline-trust-establishment)
- [Minute 2:00 – 4:00 — SDC-drift (Family A betting wealth crossing threshold)](#minute-200--400--sdc-drift-family-a-betting-wealth-crossing-threshold)
- [Minute 4:00 – 6:00 — Common-mode-rack (topology attribution)](#minute-400--600--common-mode-rack-topology-attribution)
- [Minute 6:00 – 8:00 — Event-conditional (freeze-hook + DS integration)](#minute-600--800--event-conditional-freeze-hook--ds-integration)
- [Minute 8:00 – 10:00 — Close (methodology + coverage envelope)](#minute-800--1000--close-methodology--coverage-envelope)
- [Minute 10:00 – 12:00 — Live mode (interactive)](#minute-1000--1200--live-mode-interactive)
- [Bank of follow-up questions + responses](#bank-of-follow-up-questions--responses)
- [Pacing notes](#pacing-notes)
- [What I need to rehearse specifically](#what-i-need-to-rehearse-specifically)

```

**Insertion point B — directly BETWEEN the existing `## Minute 8:00 – 10:00 — Close (methodology + coverage envelope)` section's closing `> That's Tessera. Questions?` line (followed by `---`) AND the existing `## Bank of follow-up questions + responses` heading, INSERT this new section:**

```markdown
## Minute 10:00 – 12:00 — Live mode (interactive)

_Optional extension for technical-peer audiences who want to see the engine respond to parameter changes in-browser. For non-technical audiences, skip this beat and go straight to the follow-up bank._

**Click:** flip the "Mode" toggle at the top of the page from **Canned** to **Live**. The scenario selector grays out; the parameter control panel becomes active.

**Say:**
> Up to now I've been driving the demo from pre-recorded scenario JSON. The same engine
> code that built those scenarios is also bundled into the page itself — about 60 KB of
> compiled JavaScript covering Family A through E detectors, the e-BH FDR operator, and
> the topology overlay. Switching to Live mode wires the parameter panel directly into
> that bundle via a Web Worker.

**Point at:** the parameter controls — drift magnitude (the residual deviation injected
on the target shard), window count, α threshold (per-shard Ville bound), target shard,
topology size (small=6, medium=10, large=25), detector families A through E.

**Click:** Run. Watch the loading spinner appear briefly while the engine bundle loads
into the Worker. Within ~100 ms the per-window stream starts; the scrubber range
auto-expands to match the window count; the M_t chart updates per window; the verdict
banner and provenance receipt update at the terminal window.

**Say:**
> Each window message from the Worker is the same per-shard payload shape as a canned
> scenario tick. The main thread treats the Worker stream as a custom scenario — the
> existing playback / scrubber / renderer machinery runs over the live data without
> modification. After the terminal message you can scrub backwards through the run,
> change parameters, and click Run again to recompute.

**Demonstrate two beats:**

1. **Threshold sensitivity:** with drift magnitude = 0.10 (default) and target shard =
   shard-00, click Run. Shard-00's M_t may not cross threshold — Ville bound holds.
   Increase drift to 0.30 and click Run again — shard-00 fires reliably.
2. **Cancel:** during a long run (window count = 200), click Cancel. The worker
   terminates; the spinner clears; the run-status indicator shows "Run cancelled."

**Say:**
> The Cancel beat demonstrates that the Worker is real — it's not a pre-computed result
> being replayed. The engine is computing in the page in real time, and the operator
> can interrupt it.

**Pause beat (2-3 seconds).**

**Handoff cue:** flip the Mode toggle back to **Canned** to return to scripted scenarios,
or proceed to the follow-up bank.

```

**Insertion point C — append a new bullet to the existing "## Pacing notes" section's bullet list (immediately BEFORE the empty line that precedes "## What I need to rehearse specifically"):**

```markdown
- The Live mode section (minute 10:00–12:00) is optional. Cut it for non-technical
  audiences. For engineering-director audiences, lead with the Live mode beat instead
  of clean-baseline if the audience needs immediate proof that "this is a real engine
  in the browser, not a JSON player."
```

### 1.6 README.md modification (verbatim; Implementer applies)

**Insertion point — INSIDE the existing top-level `## Quick demo` section (around line 73), inside the `### Browser dashboard` subsection (around line 77), immediately AFTER the existing paragraph ending "…opens from `file://`." (around line 83), INSERT this new paragraph:**

```markdown

The dashboard ships a **Live mode toggle** at the top of the page (R85). Switching to
**Live** activates the parameter control panel (drift magnitude, window count, α
threshold, target shard, topology size, detector families) and routes the Run button
through a Web Worker that loads the engine bundle in-browser and streams per-window
state back to the UI. Use the scrubber to replay the run at any speed; click Cancel to
terminate mid-stream. See [`demos/DEMO-SCRIPT.md` § Minute 10:00 – 12:00](./demos/DEMO-SCRIPT.md#minute-1000--1200--live-mode-interactive)
for the live-mode walkthrough.

```

### 1.7 CROSS-PROJECT-MEMORIAL.md modification — three Phase 4-derived promotion entries (verbatim; Implementer appends)

The Implementer appends a new section header to `~/.claude/CROSS-PROJECT-MEMORIAL.md` (the user-level cross-project file at `os.homedir() + '/.claude/CROSS-PROJECT-MEMORIAL.md'`) AT THE END OF THE FILE. The new section is one top-level header plus three subsections, each a canonical Reinforcement-rules-derived entry. The exact verbatim text the Implementer appends is:

```markdown

---

## Tessera R85 entries (2026-05-21) — Phase 4 close promotions

Phase 4 closure brings three discipline patterns to canonical landing in this file: two existing-rule sub-class promotions (Rules 1 + canonical claim-then-walk) plus one new-rule flag at 2-instance with explicit 3rd-instance derivation trigger per Rule 7.

### Reinforcement rules derived (Phase 4 close — Tessera R85)

- **Rule 1 sub-class `haiku-mu-status-field-disambiguation` (4-instance Tessera promotion; canonically landed R85):** When the Memorial-Updater role is dispatched on a Haiku-class model (selected by the cost-efficient model-routing path for cross-round-pattern marker rounds), the MU MUST update the **TOP-OF-FILE STATUS field** at `coordination/NEXT-ROLE.md` lines 1-5 (`STATUS: <value>`), not merely add a STATUS line inside its own appended routing block. Four Tessera instances cross the 4-instance promotion threshold: R75 + R78 (STATUS stuck at READY despite MU completion); R80 (MERGE-READY wrong value at top-of-file); R83 (Haiku added STATUS field inside its own routing block but left the top-of-file STATUS unchanged). The disambiguation is necessary because "STATUS field" is ambiguous when the MU appends a block that itself contains a STATUS line — the MU may interpret "update STATUS" as "add a STATUS line in my own block" rather than "modify the existing STATUS line at file top". Procedure: the MU's pre-emit checklist for STATUS update MUST verify via `head -5 coordination/NEXT-ROLE.md | grep STATUS:` that the top-of-file STATUS reflects the post-MU intended state. The Tessera-local CLAUDE-MEMORIAL.md REINFORCED line was sharpened at R83 chore-A (disambiguating "STATUS field = TOP-OF-FILE; lines 1-5; `head -5 NEXT-ROLE.md | grep STATUS:`"). The R83-sharpened reinforcement worked at R84 (Haiku correctly updated TOP-OF-FILE STATUS). Cross-project canonical landing at Tessera R85 closes the 4-instance pattern with the disambiguation language baked into the canonical text.
- **Rule 1 sub-class `architect-encoded-regex-with-hardcoded-bounds` (6-instance Tessera promotion; sub-class of canonical `Architect-claim-without-empirical-walk` Rule 1):** When an Architect spec § AC prescribes a regex that captures a code region by character-bounded quantifier (e.g., `{0,3000}?`, `{0,2000}?`, `{0,N}?`) and asserts a substring within that captured region, the Architect must verify EMPIRICALLY at spec-emit that the captured region encompasses the asserted substring at the SPEC's prescribed implementation. The `{0,N}?` bound is a brittle implementation-coupling: legitimate implementation changes that extend the region beyond N chars cause the AC to fail at chore-A even when the implementation is correct — forcing an ESCALATE cycle that drops the region-scoping (the R84 ESCALATE Option A outcome). Six Tessera instances: R62 chore-B simulation regex hardcoded-quantifier; R66 fields regex over a closed-set; R68 audit-trail SHA-region regex; R72 closed-set literal-regex over `event_class` union; R83 regex bound over R83 control-panel HTML region (handler size shifted); R84 AC-R84-9 `{0,3000}?` btnRun handler-region regex producing the R84 ESCALATE. Procedure at spec-emit: for each AC that uses regex char-bounded captures, (a) verify the spec's own prescribed pseudocode produces a code region under the bound — apply Rule 3 self-application gate ("would the spec's own § 1.4 / § 2.x pseudocode pass this AC if implemented verbatim?"); (b) prefer **unbounded** patterns when discriminability allows (`HTML.includes('uniqueIdentifier')` rather than region-extraction; or multiple narrowly-anchored assertions on stable identifiers); (c) when bounded capture is unavoidable, use a generous bound (≥10000 chars) with explicit rationale documented inline + a § 8 cross-check that the spec's own pseudocode does not exceed the bound; (d) the AC must remain robust to *additive* edits inside the region by future rounds — round-evolution-fragile AC patterns (hardcoded quantifier just above current implementation size) MUST HALT at spec-emit. Sub-class of canonical Rule 1 `Architect-claim-without-empirical-walk`. Detected Tessera R85 from 6 cumulative instances.
- **`vendored-at-pin → vendored-with-deltas reclassification precedent` (2-instance Tessera flag; 3rd-instance-trigger derivation per Rule 7):** When a file initially manifested as vendored-at-pin (byte-identical copy from upstream at a specified SHA) must be modified to extend its schema or behavior for project-specific reasons, the file transitions to vendored-with-deltas (the manifest entry reclassifies; the AT_PIN_FILES anti-regression byte-identity test drops the file). Two Tessera instances to date: R56 `engine/types/verdict.ts` (initial vendored-at-pin → deltas added for `cell_confidence` + `slope_quality` schema extensions); R82 `engine/topology-overlay.ts` (initial vendored-at-pin → deltas added for browser-bundle execution-context support). Three-instance derivation threshold not yet crossed per Rule 7 (`derived-rule-propagation-mechanism-required` — Rule 7 explicitly cautions against canonical-landing of a rule from a single project's first two instances; the 3rd instance from a different project crosses the cross-project derivation gate). Rule documented as 2-instance flag with explicit 3rd-instance reservation. When an Architect anticipates a vendored-at-pin file needs modification: spec § Component-inventory must explicitly call out the reclassification transition + the two-step manifest maintenance (MANIFEST.md entry update; AT_PIN_FILES list update); spec § ALLOWED_SET must include both maintenance files. Detected Tessera R56 (1st) + R82 (2nd). Cross-project canonical landing reserved until 2nd-project instance.

```

### 1.8 Test file shape (verbatim; Implementer copies into `test/q85-slice-3-close.test.ts`)

```ts
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
  // Discriminating: both string literals 'canned' and 'live' must appear in HTML
  // (the setMode body branches on them; either could be missing without this AC firing).
  assert.ok(HTML.includes("=== 'canned'") || HTML.includes('=== "canned"'),
    'setMode body must include a canned-mode equality comparison');
  assert.ok(HTML.includes("=== 'live'") || HTML.includes('=== "live"'),
    'setMode body must include a live-mode equality comparison');
});

// ── AC-R85-4: mode-radio change listener wired ──
test('AC-R85-4: mode-radio change listener wired to setMode()', () => {
  // Discriminating: a forEach/for over input[name="tessera-mode"] with addEventListener('change',...)
  // that calls setMode. The pattern is uniquely identified by the conjunction of these three tokens.
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
  // Discriminating: the literal CSS selector must appear; matches a unique R85 surface.
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
  // Discriminating: the spinner CSS animation must be declared.
  assert.ok(HTML.includes('tessera-spin') || HTML.includes('@keyframes tessera-spin'),
    'tessera-spin @keyframes animation must be declared');
});

// ── AC-R85-9: #engine-run-status exists with aria-live ──
test('AC-R85-9: demos/demo.html has #engine-run-status with aria-live attribute', () => {
  assert.ok(HTML.includes('id="engine-run-status"'),
    'engine-run-status div must exist');
  // Discriminating: the run-status block must announce to assistive technology.
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
  // Discriminating: both helpers must be invoked at least once each.
  assert.ok(/r85ShowLoadingSpinner\s*\(\s*\)/.test(HTML),
    'r85ShowLoadingSpinner must be invoked');
  assert.ok(/r85HideLoadingSpinner\s*\(\s*\)/.test(HTML),
    'r85HideLoadingSpinner must be invoked');
});

// ── AC-R85-12: DEMO-SCRIPT.md has "## Contents" ToC section ──
test('AC-R85-12: DEMO-SCRIPT.md has "## Contents" section with bullet list', () => {
  assert.ok(/^## Contents$/m.test(DEMO_SCRIPT),
    'DEMO-SCRIPT.md must have "## Contents" heading on its own line');
  // Discriminating: ToC must reference the new Live mode beat by anchor.
  assert.ok(DEMO_SCRIPT.includes('minute-1000--1200--live-mode-interactive')
    || /\[Minute 10:00 – 12:00 — Live mode/.test(DEMO_SCRIPT),
    'Contents ToC must include Live mode entry');
});

// ── AC-R85-13: DEMO-SCRIPT.md has "Minute 10:00 – 12:00 — Live mode" section ──
test('AC-R85-13: DEMO-SCRIPT.md has Minute 10:00 – 12:00 Live mode section', () => {
  assert.ok(/^## Minute 10:00\s*[–-]\s*12:00 — Live mode \(interactive\)$/m.test(DEMO_SCRIPT),
    'DEMO-SCRIPT.md must have "## Minute 10:00 – 12:00 — Live mode (interactive)" heading');
  // Discriminating: the new section must describe the toggle + Run + Cancel beats.
  // Extract the new section by its heading boundary and assert content within.
  const section = DEMO_SCRIPT.split(/^## Minute 10:00/m)[1] || '';
  const sectionBody = section.split(/^## /m)[0]; // body up to the NEXT ## heading
  assert.ok(sectionBody.includes('Cancel'),
    'Live mode section must mention Cancel beat');
  assert.ok(sectionBody.includes('Run'),
    'Live mode section must mention Run beat');
  assert.ok(/Worker/i.test(sectionBody),
    'Live mode section must mention Worker (Web Worker context)');
});

// ── AC-R85-14: README.md Quick demo subsection mentions Live mode ──
test('AC-R85-14: README.md Browser dashboard subsection mentions Live mode', () => {
  // Extract the "### Browser dashboard" subsection from README.
  const subStart = README.indexOf('### Browser dashboard');
  assert.ok(subStart >= 0, 'README must have ### Browser dashboard subsection');
  const subEnd = README.indexOf('\n### ', subStart + 1);
  const sub = subEnd > 0 ? README.slice(subStart, subEnd) : README.slice(subStart);
  // Discriminating: phrase must appear inside the bounded section, not anywhere in README.
  assert.ok(/Live mode/i.test(sub),
    'Browser dashboard subsection must mention "Live mode"');
  assert.ok(sub.includes('DEMO-SCRIPT'),
    'Browser dashboard subsection must reference DEMO-SCRIPT (the Live mode walkthrough)');
});

// ── AC-R85-15: cross-project memorial has haiku-mu-status-field-disambiguation entry ──
test('AC-R85-15: ~/.claude/CROSS-PROJECT-MEMORIAL.md has haiku-mu-status-field-disambiguation', () => {
  if (!fs.existsSync(CROSS_PROJECT_MEMORIAL_PATH)) {
    // Should never happen at R85 GREEN; Implementer must land the entry.
    assert.fail(`expected file at ${CROSS_PROJECT_MEMORIAL_PATH}`);
  }
  const cpm = fs.readFileSync(CROSS_PROJECT_MEMORIAL_PATH, 'utf8');
  // Discriminating: canonical short name + the disambiguation phrase.
  assert.ok(cpm.includes('haiku-mu-status-field-disambiguation'),
    'CROSS-PROJECT-MEMORIAL.md must contain the haiku-mu-status-field-disambiguation rule');
  assert.ok(/TOP-OF-FILE STATUS/.test(cpm) || /top-of-file STATUS/i.test(cpm),
    'haiku-mu rule must reference TOP-OF-FILE STATUS field disambiguation');
});

// ── AC-R85-16: cross-project memorial has architect-encoded-regex-with-hardcoded-bounds entry ──
test('AC-R85-16: ~/.claude/CROSS-PROJECT-MEMORIAL.md has architect-encoded-regex-with-hardcoded-bounds', () => {
  const cpm = fs.readFileSync(CROSS_PROJECT_MEMORIAL_PATH, 'utf8');
  assert.ok(cpm.includes('architect-encoded-regex-with-hardcoded-bounds'),
    'CROSS-PROJECT-MEMORIAL.md must contain the architect-encoded-regex-with-hardcoded-bounds rule');
  // Discriminating: the canonical text must reference the {0,N} quantifier pattern + 6-instance.
  assert.ok(cpm.includes('{0,N}') || /\{0,3000\}/.test(cpm),
    'rule must reference the {0,N}? quantifier pattern');
});

// ── AC-R85-17: cross-project memorial has vendored-at-pin reclassification precedent ──
test('AC-R85-17: ~/.claude/CROSS-PROJECT-MEMORIAL.md has vendored-at-pin reclassification entry', () => {
  const cpm = fs.readFileSync(CROSS_PROJECT_MEMORIAL_PATH, 'utf8');
  // Discriminating: canonical short phrase + 2-instance flag + 3rd-instance reservation.
  assert.ok(cpm.includes('vendored-at-pin → vendored-with-deltas reclassification precedent')
    || cpm.includes('vendored-at-pin -> vendored-with-deltas reclassification precedent'),
    'CROSS-PROJECT-MEMORIAL.md must contain the vendored-at-pin reclassification precedent');
  assert.ok(/R56/.test(cpm) && /R82/.test(cpm),
    'vendored-at-pin rule must cite both R56 verdict.ts and R82 topology-overlay.ts instances');
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

// ── AC-R85-19: anti-scope diff ⊆ ALLOWED_SET ──
test('AC-R85-19: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const allowed = new RegExp(
    '^(tools/build-canned-demos\\.ts|'
    + 'demos/demo\\.html|'
    + 'demos/DEMO-SCRIPT\\.md|'
    + 'README\\.md|'
    + 'test/q85-slice-3-close\\.test\\.ts|'
    + 'coordination/specs/Q-R85-SPEC\\.md|'
    + 'coordination/specs/Q-R85-SPEC-AUDIT\\.md|'
    + 'coordination/specs/Q-R85-EMPIRICAL\\.sh|'
    + 'coordination/NEXT-ROLE\\.md|coordination/MEMORIAL\\.md|'
    + 'coordination/MEMORIAL-PHASE-[0-9]+\\.md|'
    + 'coordination/reviews/REVIEWER-REPORT-R85\\.md|'
    + 'coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\\.md|'
    + 'coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\\.md|'
    + 'CLAUDE\\.md|CLAUDE-ARCHITECT\\.md|CLAUDE-IMPLEMENTER\\.md|'
    + 'CLAUDE-REVIEWER\\.md|CLAUDE-MEMORIAL\\.md|'
    + 'CLAUDE-COMMON\\.md|CLAUDE-COORDINATOR\\.md)$',
  );
  const files = execSync(`git diff ${ROUND_START_SHA} HEAD --name-only`,
    { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const violators = files.filter((f) => !allowed.test(f));
  assert.deepEqual(violators, [],
    `R85 anti-scope diff includes unauthorized paths: ${violators.join(', ')}`);
});

// ── AC-R85-20: sentinels — typecheck side-channel + EMPIRICAL.sh block markers ──
test('AC-R85-20: typecheck side-channel + EMPIRICAL.sh has Block 1..5 markers', () => {
  const jsPath = path.join(REPO_ROOT, 'test/q85-slice-3-close.test.js');
  assert.ok(fs.existsSync(jsPath),
    'q85 test must compile to .js (proves tsc passed for this round)');
  const sh = fs.readFileSync(
    path.join(REPO_ROOT, 'coordination/specs/Q-R85-EMPIRICAL.sh'), 'utf8');
  for (const blockMarker of [
    '── Block 1: typecheck',
    '── Block 2: demo.html R85 surface presence',
    '── Block 3: DEMO-SCRIPT.md + README.md presence',
    '── Block 4: test counts',
    '── Block 5: anti-scope diff',
  ]) {
    assert.ok(sh.includes(blockMarker),
      `Q-R85-EMPIRICAL.sh must contain marker "${blockMarker}"`);
  }
});
```

### 1.9 Integration points

| # | Integration | Direction | Failure mode |
|---|---|---|---|
| I1 | `tools/build-canned-demos.ts` edits → `pnpm build:demos` → `demos/demo.html` | Build-time | Tool error → halt condition 1 (EMPIRICAL.sh Block 2 fail) |
| I2 | `pnpm build:demos` regeneration | Build-time | If non-deterministic → `demos/scenarios/*.json` drift → halt condition 9 |
| I3 | Browser mode-toggle radio change → `setMode(value)` → body[data-mode] + per-element disabled | Runtime (browser) | Element ref missing → guarded via `if (el)` |
| I4 | Browser btnRun click → existing R84 Worker path → R85 added spinner + run-status calls | Runtime (browser) | Element missing → `if (engineLoadingIndicator)` / `if (engineRunStatus)` guards |
| I5 | Worker per-window message → R85 added scrubber.max update + run-status running call | Runtime (browser) | Same guards |
| I6 | Cross-project memorial append → `~/.claude/CROSS-PROJECT-MEMORIAL.md` | Out-of-tree write | File must exist before append; AC reads via os.homedir() |
| I7 | `tsc` compilation of test file | Build-time | TypeScript error → halt condition 2 |
| I8 | `node --test` invocation of compiled tests | Test-time | Any AC failing → EMPIRICAL.sh Block 4 reports drift → halt condition 3 |

### 1.10 Failure modes at each integration point

| ID | Integration | Failure mode | Mitigation |
|---|---|---|---|
| F1 | I3 | Radio listener fires before DOM ready | IIFE runs at end-of-body per existing pattern; DOMContentLoaded not required |
| F2 | I4 | btnRun handler grows past 3000 chars → R84 ACs flip | Walked in § 8.10; ~590 chars added; first inner `});` stays at ~1850 chars from anchor, well under 3000 |
| F3 | I5 | scrubber max update races with scrubber input change | windowScrubber.max is a string attribute; setting it is atomic; existing scrubber listener reads it on demand |
| F4 | I6 | CROSS-PROJECT-MEMORIAL.md missing (fresh-clone or different host) | AC-R85-15..17 assert via `os.homedir()` resolved path; AC fails with explicit message; halt-condition 3 fires |
| F5 | I7 | TS error from new test file | EMPIRICAL.sh Block 1 binds tsc exit 0; halt-2 |
| F6 | I8 | Test count drift | EMPIRICAL.sh Block 4 strict-equality bounds; halt-3 |

### 1.11 Architect pre-prediction table

| Observable | Architect pre-prediction at R85 chore-A | Rationale |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | **0** | R85 modifications are TS-clean (tool file pure string edits; test file standard `node:test` + `node:fs` + `node:os` shape) |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | **1** | node-test exits 1 when any subtest fails; carry-forward 15 + AC-R84-16 forward-protection flip = 16 expected failures |
| TAP `# tests` | **689** (R84 close 669 + 20 new R85 ACs; strict equality) | each AC = 1 `test()` block |
| TAP `# pass` | **669** (R84 close 650 − 1 AC-R84-16 forward-protection flip + 20 new R85 ACs all passing at GREEN; band [668, 670] for ±1 PRNG/environment margin) | 650 − 1 + 20 = 669 |
| TAP `# fail` | **16** (R84 close 15 + 1 AC-R84-16 forward-protection flip; strict) | AC-R84-16 ALLOWED regex enumerates R84-specific paths (`Q-R84-*`, `engine-worker.js`, `test/q84-*`, `REVIEWER-REPORT-R84.md`); R85 introduces NEW paths (`Q-R85-*`, `test/q85-*`, `REVIEWER-REPORT-R85.md`, `demos/DEMO-SCRIPT.md`, `README.md`); these are NOT in R84 regex → flip |
| TAP `# skipped` | **4** (unchanged) | no skip changes |
| `bash Q-R85-EMPIRICAL.sh` exit at chore-A | **0** (ALL BLOCKS PASS) | EMPIRICAL.sh blocks designed to pass post-Implementer GREEN |
| `git diff f737877 HEAD --name-only` line count | **9-14** | tool, demo.html, DEMO-SCRIPT, README, test, 3 spec triad, NEXT-ROLE, MEMORIAL, REVIEWER-REPORT-R85, optional ROUND-R85-SUMMARY, optional CLAUDE-*.md |
| `demos/scenarios/*.json` content | **byte-identical** to round-start | Halt condition 9 |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` size | grows by ~5000 chars (3 promotion entries) | additive append; no in-place edits to prior content |
| Carry-forward failing ACs at R84 close (15) | unchanged in name | AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14, AC-R82-14, AC-R83-12, AC-R83-15 |

### 1.12 Architect choices documented (not deferred)

| Choice | Architect pick | Alternatives rejected; rationale |
|---|---|---|
| Mode state representation | Separate `currentMode` + `setMode()` | controlState-coupled rejected (R83 surface preservation) |
| Mode toggle UI | Radio group inside `<fieldset>` with `name="tessera-mode"` | Select dropdown / button pair rejected (radio is most-obvious affordance) |
| Per-mode disable mechanism | Hybrid: body[data-mode] CSS + element.disabled JS | Pure-CSS / pure-JS rejected (both surfaces matter) |
| Loading spinner | `#engine-loading-indicator` div with CSS @keyframes spin | External library / data-URI rejected (vanilla CSS, no deps) |
| Run-status indicator | `#engine-run-status` text element with 5 stages (reset/running/complete/error/cancelled) | Toast / modal rejected (inline status is less intrusive) |
| ToC in DEMO-SCRIPT.md | `## Contents` heading at top with markdown anchor links | No-ToC rejected per directive ("ToC update") |
| Live mode beat placement in DEMO-SCRIPT | Between current minute-8:00-10:00 Close and Bank-of-follow-up | Inside minute-6 or minute-8 rejected (breaks existing narrative flow) |
| README addition | Single paragraph inside existing `### Browser dashboard` subsection (line ~77) | New `### Live mode` subsection rejected (over-scope; one paragraph is enough) |
| CROSS-PROJECT-MEMORIAL append location | NEW top-level section "## Tessera R85 entries (2026-05-21) — Phase 4 close promotions" at END OF FILE | Inline edits to existing rule sections rejected (additive append discipline per existing file pattern) |
| AC for cross-project memorial | `fs.readFileSync(os.homedir() + '/.claude/CROSS-PROJECT-MEMORIAL.md')` + literal includes() checks | Network-fetch / git-show rejected (file is the canonical surface) |
| Regex bounds in R85 ACs | NONE — only unbounded patterns (`.includes()`, narrow anchor regexes without `{0,N}?`) | Char-bounded captures explicitly rejected per the very lesson this round promotes (architect-encoded-regex-with-hardcoded-bounds Rule 1 sub-class) |

### 1.13 Round-evolution-fragile AC pattern avoidance (R84 lesson; applied UPFRONT)

The R84 ESCALATE Option A resolution removed handler-region scoping from AC-R84-9 because the `{0,3000}?` quantifier captured only the first ~1563 chars of a 3129-char handler. R85 explicitly avoids this class of pattern:

- **No `{0,N}?` quantifiers in R85 ACs.** All AC regex patterns are either (a) anchored on unique identifiers via `.includes()`, (b) narrow regex with no char-bounded captures (e.g., `/function\s+setMode\s*\(/.test(HTML)`), or (c) section-extraction via split-on-heading boundaries (AC-R85-13 splits DEMO_SCRIPT on `^## Minute 10:00/m` then asserts content within the bounded substring).
- **Section-bounded assertions use natural document boundaries**, not char-counted windows. For DEMO_SCRIPT.md the natural boundary is the next `## ` heading (Markdown structural). For README.md the natural boundary is the next `### ` subheading. Both are robust to additive content within the section.
- **Cross-project memorial assertions use `.includes()` against unique canonical phrases**, not regex captures. The phrases are deliberately long and unique (e.g., `'haiku-mu-status-field-disambiguation'`, `'architect-encoded-regex-with-hardcoded-bounds'`, `'vendored-at-pin → vendored-with-deltas reclassification precedent'`) — each is a multi-word slug that cannot reasonably collide with surrounding text.

This explicit upfront discipline IS the round's self-application of the very rule it promotes (Rule 5 self-application gate).

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 Mode toggle as the explicit canned-vs-live UI seam

The mode toggle is the directive's primary deliverable. Before R85, the dashboard's "live mode" was implicit: clicking Run while a scenario was selected (R83) caused R84 to swap the scenario to "custom" and stream from the Worker. The transition was invisible to the operator. R85 makes it explicit: the toggle states the current mode at all times; the UI affordances (which controls are active) follow the toggle's value.

The toggle implementation is intentionally MINIMAL:

- HTML: one `<fieldset>` with two `<input type="radio">` children. ~6 lines.
- JS: one `setMode(mode)` function (~25 lines), one event listener for the radio inputs (~6 lines). Total ~31 lines.
- CSS: per-mode gray-out rules using `body[data-mode='canned']` / `body[data-mode='live']` selectors. ~12 lines.

Total surface intrusion: <60 lines of additive code across HTML / JS / CSS. R83 controlState shape is preserved; R84 handler body is preserved.

### 2.2 The scrubber-in-Live-mode wiring

The R81 scrubber operates over `scenarios[currentName].windows[]`. In Live mode, R84 populates `scenarios['custom'].windows[]` incrementally as Worker messages arrive. R85's only addition to the scrubber wiring is one line in the onmessage 'window' branch: `if (windowScrubber) windowScrubber.max = String(Math.max(0, scenarios['custom'].windows.length - 1));`. This makes the scrubber's range grow as windows accumulate; operator can scrub through accumulated windows during streaming OR after streaming completes.

The directive's "scrubber moves through Worker-emitted ticks in live mode" is satisfied by this single line — combined with the existing R84 line `currentWindowIdx = data.windowIdx;` which already advances the scrubber's value cursor.

### 2.3 The loading spinner as the bundle-load latency surface

Engine-bundle.mjs (R82) is ~60 KB. Dynamic `import()` of the bundle inside the Worker takes ~10-100 ms on first load (cached on subsequent invocations). The directive's "loading spinner during Worker bundle load" addresses this latency window: the operator sees IMMEDIATE feedback that "the Run button worked; something is happening" instead of an apparent ~100 ms freeze.

Implementation:
- `r85ShowLoadingSpinner()` is called at the START of the btnRun handler (first thing after `r84HideError(); r84SetRunning(true);`).
- `r85HideLoadingSpinner()` is called on the FIRST `window` message (windowIdx === 0), on `terminal`, on `error`, and on Cancel. Each path ensures the spinner doesn't linger.

The spinner's CSS uses `@keyframes tessera-spin` with a 0.8s linear infinite rotation. No external dependencies (CSS-only animation).

### 2.4 The run-status indicator as the "Run again" affordance

After a Live-mode run completes, the operator may want to (a) adjust parameters and re-run, (b) replay the same run via the scrubber, OR (c) switch back to Canned mode. The directive's `'Run again' affordance` addresses the first case: after the terminal message, `#engine-run-status` displays "Run complete — K selected of N windows. Click Run to recompute." This communicates:

- The run did complete (vs. errored or cancelled).
- The terminal selection size (K shards selected via e-BH).
- The actionable next step (click Run).

In Canned mode, `#engine-run-status` is hidden via CSS (`body[data-mode='canned'] #engine-run-status { display: none; }`). In Live mode it's visible at all times, with the text content driven by `updateRunStatus(stage, payload)`.

The 5 stages — `reset`, `running`, `complete`, `error`, `cancelled` — cover the run-state machine exhaustively. The implementation uses a single helper function with a stage parameter (vs. five separate helpers) for code-locality + ease of future state additions.

### 2.5 The DEMO-SCRIPT.md Minute 10-12 extension

The existing DEMO-SCRIPT is structured as five "minute beats" (0-2, 2-4, 4-6, 6-8, 8-10). Adding a 6th beat extends the script from 10 to 12 minutes. The directive notes "Live mode beat" — interpreted as a SHORT optional extension for technical-peer audiences, not a mandatory 10→12 reframe.

The new section's pedagogy:
- **Open** with the Mode toggle flip: makes the "this is interactive" claim VISIBLE.
- **Demonstrate** Run + spinner + per-window streaming + scrubber growth: shows the live path end-to-end in <10 seconds.
- **Demonstrate** two specific beats (threshold sensitivity + Cancel): proves the engine is REAL (not a JSON player) and parameter-responsive.
- **Close** by toggling back to Canned mode for the follow-up bank: respects the existing script's narrative flow.

The ToC ("## Contents") at the top is the directive's "ToC update" — interpreted as a new ToC affordance, not a modification to an existing ToC (DEMO-SCRIPT had none).

### 2.6 The README.md Quick demo extension

Single paragraph addition inside the existing `### Browser dashboard` subsection. Mentions:
- The R85 Live mode toggle exists.
- What it does (activates control panel; routes Run through Worker).
- Cross-reference to DEMO-SCRIPT § Minute 10:00–12:00.

The README's other `## Quick demo` section (line 194) is NOT modified — it's the secondary user-walkthrough section that R85 leaves to the existing R81 author. (Modifying both would risk wider scope churn for marginal documentation gain.)

### 2.7 The CROSS-PROJECT-MEMORIAL.md three promotions

The three promotions land as a SINGLE appended section ("## Tessera R85 entries (2026-05-21) — Phase 4 close promotions") at the END of the file, with three subsections under "### Reinforcement rules derived (Phase 4 close — Tessera R85)". This matches the existing file's pattern: per-round sections with discipline-grouped reinforcement bullets.

Each promotion follows the canonical-Rule format established at Tessera R26 (Rule 1 derivation) + R32 + R34 + R36 (Rules 2-6) + R38 (Rule 7):
1. **Short name** in code-fence quotes (slug).
2. **Threshold count + project + canonical-landing round** parenthetical.
3. **Procedure** description.
4. **Detected instances** enumeration.

The three promotions are NOT new top-level Rules 8/9/10 — they are SUB-CLASSES of existing canonical rules (haiku-mu under Rule 1; architect-regex-bounds under Rule 1; vendored reclassification flagged but not promoted-as-rule until 3rd instance per Rule 7 discipline). The discipline of "promotion-as-sub-class vs. promotion-as-new-rule" is honored: sub-classes pull canonical rule machinery into a narrower failure mode; new rules introduce ORTHOGONAL failure modes. The three R85 promotions sharpen Rule 1 (twice) + add a 2-instance flag (not yet rule); none introduce new orthogonal axes.

---

## § 3. Component inventory

| File | State | Lines (approx) | AC binding |
|---|---|---|---|
| `tools/build-canned-demos.ts` | MODIFIED | +15 HTML, +35 CSS, +75 JS (setMode + helpers + listener); ~125 added lines | AC-R85-1..11 (via regenerated demo.html), AC-R85-18 (anti-regression markers) |
| `demos/demo.html` | MODIFIED (regenerated) | mirror of tool edits | AC-R85-1..11, AC-R85-18 (direct file read) |
| `demos/DEMO-SCRIPT.md` | MODIFIED | +12 ToC lines, +60 Live mode section lines, +5 Pacing notes line | AC-R85-12, AC-R85-13 |
| `README.md` | MODIFIED | +8 lines (one paragraph in Browser dashboard subsection) | AC-R85-14 |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | MODIFIED (append) | +~80 lines (three promotion subsections) | AC-R85-15, AC-R85-16, AC-R85-17 |
| `test/q85-slice-3-close.test.ts` | NEW | 20 `test()` blocks; ~280 lines | AC-R85-1..20 |
| `coordination/specs/Q-R85-SPEC.md` | NEW | this file | — |
| `coordination/specs/Q-R85-SPEC-AUDIT.md` | NEW | audit sidecar | — |
| `coordination/specs/Q-R85-EMPIRICAL.sh` | NEW | 5 blocks; ~120 lines | AC-R85-19 (Block 5) + AC-R85-20 (block markers) |
| `coordination/NEXT-ROLE.md` | MODIFIED | each role appends routing block | — |
| `coordination/MEMORIAL.md` | MODIFIED | each role appends CONFIRMATION/VIOLATION lines | — |
| `coordination/reviews/REVIEWER-REPORT-R85.md` | NEW | Reviewer authors | — |
| `coordination/logs/ROUND-R85-ROUTING.md` | NEW (already present at HEAD per `git status`) | — | — |
| `coordination/logs/ROUND-R85-SUMMARY.md` | NEW (Memorial-Updater authors) | — | — |

### 3.1 ALLOWED_SET (narrative inventory — gate artifact #1; per R72/R82 spec-amendment-ALL-gate-artifacts-propagation lesson)

The ALLOWED_SET enumeration appears in FOUR places that must remain in lockstep across any amendment:

1. **§ 3.1 narrative table (this section)** — authoritative human-readable enumeration.
2. **§ 3.2 ALLOWED regex** — machine-checkable string for the spec body.
3. **`test/q85-slice-3-close.test.ts` AC-R85-19 regex** — runtime gate in the test file.
4. **`coordination/specs/Q-R85-EMPIRICAL.sh` Block 5 `ALLOWED` variable** — bash gate at chore-A pre-commit.

Authorized paths (round-start `f737877` → R85 HEAD):

| Path | Role of file | Reason in ALLOWED_SET |
|---|---|---|
| `tools/build-canned-demos.ts` | Modified (mode toggle + spinner + run-status + handler edits) | Source of truth for `demos/demo.html` regeneration |
| `demos/demo.html` | Modified (regenerated) | Browser-loadable dashboard; R85 mode toggle lands here |
| `demos/DEMO-SCRIPT.md` | Modified (ToC + Live mode section) | Demo walkthrough; Phase 4 close extension |
| `README.md` | Modified (Browser dashboard paragraph) | Project docs; Phase 4 close mention |
| `test/q85-slice-3-close.test.ts` | New | All 20 R85 ACs |
| `coordination/specs/Q-R85-SPEC.md` | New | This file |
| `coordination/specs/Q-R85-SPEC-AUDIT.md` | New | Audit sidecar |
| `coordination/specs/Q-R85-EMPIRICAL.sh` | New | Binding-command harness |
| `coordination/NEXT-ROLE.md` | Modified | Each role appends routing block |
| `coordination/MEMORIAL.md` | Modified | Each role appends memorial lines |
| `coordination/MEMORIAL-PHASE-[0-9]+\.md` | Potentially modified | If active-file rolls during R85 |
| `coordination/reviews/REVIEWER-REPORT-R85.md` | New | Reviewer authors |
| `coordination/logs/ROUND-R[0-9]+-(SUMMARY\|ROUTING)\.md` | New (generic R-pattern) | Memorial-Updater + operator outputs |
| `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` | Potentially new | Only if halt fires |
| `CLAUDE.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md` | Potentially modified | Memorial-Updater REINFORCED appends |

**Explicitly NOT in ALLOWED_SET (sentinel for halt-condition tripwires):**

- `~/.claude/CROSS-PROJECT-MEMORIAL.md` — modified BUT OUTSIDE git tree (user-level file under `$HOME`). NOT in repo diff; never appears in `git diff --name-only`. Modification is operator-authorized per directive's allowed-modifications enumeration.
- `demos/scenarios/*.json` — must remain byte-identical to round-start `f737877`. Halt condition 9.
- `demos/engine-bundle.mjs` — gitignored; produced by `pnpm exec node tools/build-browser-bundle.js`. Never appears in `git diff --name-only`.
- `demos/engine-worker.js` — R84-frozen; UNCHANGED by R85.
- `engine/*` — directive + A12 anti-scope.
- `package.json` / `pnpm-lock.yaml` — no new deps; no new scripts.
- `.gitignore` — no new ignores required.
- `tools/build-browser-bundle.ts` — frozen at R82.
- All `test/q01..q84*.test.ts` files — frozen (R73–R84 deliverables; directive anti-scope).
- All `coordination/specs/Q-R01..Q-R84-*` files — frozen (directive anti-scope on prior Q-RNN-SPEC.md).

### 3.2 ALLOWED regex (gate artifact #2; verbatim copy lives in `test/q85-slice-3-close.test.ts` AC-R85-19 and `Q-R85-EMPIRICAL.sh` Block 5 ALLOWED variable)

```
^(tools/build-canned-demos\.ts|demos/demo\.html|demos/DEMO-SCRIPT\.md|README\.md|test/q85-slice-3-close\.test\.ts|coordination/specs/Q-R85-SPEC\.md|coordination/specs/Q-R85-SPEC-AUDIT\.md|coordination/specs/Q-R85-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R85\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

---

## § 4. Per-file pseudocode

All surfaces — tool edits + DEMO-SCRIPT + README + cross-project memorial append + test file — appear verbatim in §§ 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8. The Implementer copies them directly.

### 4.1 Chore-A commit sequence

1. **RED commit:** create `test/q85-slice-3-close.test.ts` with 20 stub `test()` blocks each containing `assert.fail('R85 RED: ' + ac_id);`. Verify `pnpm exec tsc -p tsconfig.test.json && pnpm exec node --test --test-reporter=tap test/q85-slice-3-close.test.js | tail -10` shows 20 failures. Commit as `test(R85 RED): 20 assert.fail stubs for SLICE 3 close ACs`.

2. **GREEN commit:**
   - Apply spec § 1.2 HTML markup edits to `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD`:
     - Insertion point A: insert `<fieldset id="mode-toggle">` block INSIDE `<section id="tessera-controls">` BEFORE the existing `<select id="scenario-selector">` element.
     - Insertion point B: insert `<div id="engine-loading-indicator">` + `<div id="engine-run-status">` INSIDE `#tessera-control-panel` AFTER the existing `<div id="engine-error-banner">`.
   - Apply spec § 1.3 CSS rules to `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD` `<style>` block: APPEND before `</style>`.
   - Apply spec § 1.4 JS edits to `tools/build-canned-demos.ts` `HTML_TEMPLATE_FOOTER`:
     - Insertion point A (NEW block): mode + spinner + run-status declarations + setMode + helper functions + radio listener + initial setMode('canned') call. Place RIGHT AFTER the existing R84 `var btnCancel = ...; var engineErrorBanner = ...; var r84ActiveWorker = null;` block.
     - Insertion point B (ADDITIVE edits to R84 btnRun handler): six small additive lines per § 1.4 enumeration.
   - Apply spec § 1.5 DEMO-SCRIPT.md edits:
     - Insertion point A: `## Contents` ToC section after "Before you start".
     - Insertion point B: `## Minute 10:00 – 12:00 — Live mode (interactive)` between current Minute 8:00 Close and Bank-of-follow-up.
     - Insertion point C: append bullet to Pacing notes section.
   - Apply spec § 1.6 README.md edits: insert paragraph inside existing `### Browser dashboard` subsection.
   - Apply spec § 1.7 `~/.claude/CROSS-PROJECT-MEMORIAL.md` append (verbatim block from § 1.7).
   - Run `pnpm exec tsc -p tsconfig.test.json` (rebuild .js for tools/ + tests/).
   - Run `pnpm exec node tools/build-canned-demos.js` (regenerate `demos/demo.html`).
   - Verify `git status` shows ONLY allowed paths modified (per § 3.2); `demos/scenarios/*.json` UNCHANGED (halt condition 9).
   - Replace the test file's `assert.fail` stubs with the verbatim test body from § 1.8.
   - Recompile tests.
   - Run full `pnpm exec node --test --test-reporter=tap test/*.test.js | tail -10` and record observed counts verbatim per cross-project Rule 1 sub-class `empirical-command-attestation`.
   - Commit as `feat(R85 GREEN): SLICE 3 close + Phase 4 close memorialization — chore-A`.

3. **NEXT-ROLE.md routing:** append `## § R85 IMPLEMENTER routing block (chore-A)` with `STATUS: READY`, the observed counts verbatim, and the chore-A SHA. (See § 6.2 routing-block template.)

---

## § 5. Acceptance criteria

All 20 ACs are defined in `test/q85-slice-3-close.test.ts` (verbatim in § 1.8). Summary table:

| # | AC | Binding | Discriminating property |
|---|---|---|---|
| 1 | AC-R85-1: #mode-toggle fieldset + Mode legend | `.includes()` + narrow regex | Toggle missing → FAIL |
| 2 | AC-R85-2: two radio inputs (canned + live) | narrow regex on `name="tessera-mode"` | Either radio missing or wrong value → FAIL |
| 3 | AC-R85-3: setMode() declared + 'canned' + 'live' literals | regex `function\s+setMode` + 2 literal checks | Function missing OR either literal missing → FAIL |
| 4 | AC-R85-4: radio change listener wired | 2 `.includes()` / regex checks | Listener missing → FAIL |
| 5 | AC-R85-5: data-mode body attribute set | regex `setAttribute\(['"]data-mode['"]` | setAttribute call missing → FAIL |
| 6 | AC-R85-6: body[data-mode='live'] #scenario-selector CSS rule | narrow regex | Rule missing → FAIL |
| 7 | AC-R85-7: body[data-mode='canned'] #tessera-control-panel CSS rule | narrow regex | Rule missing → FAIL |
| 8 | AC-R85-8: #engine-loading-indicator + @keyframes tessera-spin | 2 `.includes()` | Element OR animation missing → FAIL |
| 9 | AC-R85-9: #engine-run-status + aria-live attribute | regex `id="engine-run-status"...aria-live` | Element OR aria attribute missing → FAIL |
| 10 | AC-R85-10: updateRunStatus + 5 stages | regex + 5 literal checks | Function missing OR any stage missing → FAIL |
| 11 | AC-R85-11: r85ShowLoadingSpinner + r85HideLoadingSpinner declared + invoked | 4 regex/literal checks | Any of 4 missing → FAIL |
| 12 | AC-R85-12: DEMO-SCRIPT "## Contents" + Live mode anchor | regex + `.includes()` | Section missing OR Live entry missing → FAIL |
| 13 | AC-R85-13: DEMO-SCRIPT Minute 10:00–12:00 section + Cancel + Run + Worker | regex + section split + 3 literal checks | Section missing OR any required content missing → FAIL |
| 14 | AC-R85-14: README Browser dashboard mentions Live mode + DEMO-SCRIPT | section split + 2 literal checks | Section content missing → FAIL |
| 15 | AC-R85-15: cross-project memorial has haiku-mu rule + TOP-OF-FILE STATUS phrase | `.includes()` + regex | Rule missing → FAIL |
| 16 | AC-R85-16: cross-project memorial has architect-regex-bounds rule + {0,N} phrase | `.includes()` + literal check | Rule missing → FAIL |
| 17 | AC-R85-17: cross-project memorial has vendored-at-pin reclassification + R56 + R82 cites | `.includes()` + 2 literal checks | Rule missing OR R-cite missing → FAIL |
| 18 | AC-R85-18: anti-regression — R71/R79/R80/R81/R82/R83/R84 markers preserved | 18 marker regex/literal checks | Any prior round marker missing → FAIL |
| 19 | AC-R85-19: anti-scope diff ⊆ ALLOWED_SET | `git diff` + regex filter | Any unauthorized path in diff → FAIL |
| 20 | AC-R85-20: typecheck sentinel + EMPIRICAL.sh block-presence | `.js` existence + 5 Block marker matches | Compile failure OR missing block marker → FAIL |

### 5.1 AC-attestation classification

| AC | Attestation type |
|---|---|
| AC-R85-1 .. AC-R85-11 | Direct file-read assertion against `demos/demo.html` (committed runtime test) |
| AC-R85-12, AC-R85-13 | Direct file-read assertion against `demos/DEMO-SCRIPT.md` |
| AC-R85-14 | Direct file-read assertion against `README.md` (section-bounded) |
| AC-R85-15..17 | Direct file-read assertion against `~/.claude/CROSS-PROJECT-MEMORIAL.md` via `os.homedir()` |
| AC-R85-18 | Direct file-read assertion against `demos/demo.html` for 18 prior-round markers |
| AC-R85-19 | Binding-command attestation: `git diff $ROUND_START_SHA HEAD --name-only` filtered by ALLOWED regex |
| AC-R85-20 | Composite sentinel: typecheck side-channel (q85 `.js` existence) + EMPIRICAL.sh block-marker presence |

### 5.2 Architect pre-prediction (binding-command attestation; encode-actual-results-verbatim discipline applies at chore-A; Rule 1 sub-class `empirical-command-attestation`)

The Implementer MUST attest in NEXT-ROLE.md the OBSERVED values verbatim from running these commands at chore-A HEAD; the Architect pre-predictions below are NOT the attestation. Per R26 MAJOR-1 / R72 / R77 / R79 MAJOR-1 cross-project canonical: if any observed value differs from the predicted value beyond the documented band, the Implementer MUST HALT + write DIAGNOSTIC + set STATUS: ESCALATE (NOT silently amend the EMPIRICAL.sh per R79 MAJOR-1).

| Observable | Predicted at R85 chore-A | Band / strictness |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | strict |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | strict (node-test exits 1 when subtests fail) |
| TAP `# tests` | 689 | strict (R84 close 669 + 20 new R85 ACs) |
| TAP `# pass` | 669 | band [668, 670] (±1 PRNG/environment margin; 650 R84 close − 1 forward-protection flip + 20 R85 new) |
| TAP `# fail` | 16 | strict (R84 close 15 + AC-R84-16 allowed-set flip) |
| TAP `# skipped` | 4 | strict |
| `bash Q-R85-EMPIRICAL.sh` exit | 0 | strict (all 5 blocks pass at GREEN; Block 4 expects fail=16, pass ∈ [668, 670]) |
| `git diff f737877 HEAD --name-only` line count | 9-14 | band |
| `demos/scenarios/*.json` content vs round-start | byte-identical | strict (halt condition 9) |

### 5.3 Acknowledged AC gaps

- **No live browser smoke test for the mode toggle integration.** Verification is split: structural source-text ACs (AC-R85-1..11) for the demo.html markup + CSS + JS; cross-document ACs (AC-R85-12..14) for DEMO-SCRIPT + README; cross-project memorial ACs (AC-R85-15..17). Browser-side runtime mutation (radio click → setMode invoked → body[data-mode] attribute updated → CSS gray-out applied) is not CI-tested. **Mitigation:** AC-R85-3 binds setMode declaration; AC-R85-4 binds the listener wiring; AC-R85-5 binds the setAttribute call; the chain "radio change → listener → setMode → setAttribute" is each-link covered by separate ACs. A regression in any link fails ≥1 AC. Operator manual smoke (open demo.html, toggle mode, observe gray-out) is documented in DEMO-SCRIPT § Minute 10:00.

- **No AC binds run-status text exactness across all 5 stages.** AC-R85-10 asserts each of the 5 stage literals (`'reset'`, `'running'`, `'complete'`, `'error'`, `'cancelled'`) appears in the JS source, but does NOT assert the exact text DISPLAYED to the operator for each stage. **Rationale:** stage-text strings are UX-polish concerns subject to copy iteration; binding the exact text would couple ACs to copy decisions and create churn. The discriminating property (each stage is handled in code) is the right binding level.

- **No AC binds the relative ORDER of `## Contents` / `## Minute 10:00` insertions in DEMO-SCRIPT.md.** The ToC could theoretically be appended at the bottom and Minute 10 could be inserted at the top; both would pass AC-R85-12 + AC-R85-13. **Rationale:** Markdown anchors resolve regardless of order; the operator's reading experience is what matters, and the spec § 1.5 prescribes order verbatim. Order-binding ACs would over-constrain. (Implementer follows spec § 1.5 verbatim per chore-A sequence.)

- **No AC verifies the cross-project memorial entries are well-formed canonical-rule format.** AC-R85-15..17 assert SHORT NAME + a few key phrases appear; do NOT verify the FULL canonical-rule structure (Threshold / Procedure / Detected instances format). **Rationale:** the canonical-rule structure has evolved across Tessera R26-R46; binding ACs to a frozen schema would force false-FAIL on legitimate format evolution. The spec § 1.7 prescribes the verbatim text; Reviewer cold-eye reads it for format compliance.

- **R84 AC-R84-16 forward-protection flip is expected** (predicted in § 5.2). Per CLAUDE-ARCHITECT.md REINFORCED 2026-05-20 (Tessera R85 spec authoring REINFORCED, R79 lesson), the spec walks forward-protection-ACs and predicts the flip explicitly in § 1.11. The R84 ALLOWED regex does not include R85-specific paths; the diff at R85 HEAD includes those paths; AC-R84-16 flips pass→fail. This is documented forward-protection class, not modification of carry-forward fail set.

---

## § 6. Anti-scope (what is NOT included this round)

- **NO modification of `engine/*`** (A12 + R82 + directive anti-scope).
- **NO modification of R73–R84 deliverables** beyond:
  - additive lines inside R84's `btnRun` click handler + `worker.onmessage` branches + `worker.onerror` + `btnCancel` handler (per § 1.4 enumeration);
  - additive HTML inside `<section id="tessera-controls">` (mode toggle prepended) and `#tessera-control-panel` (loading indicator + run-status appended after error-banner);
  - additive CSS appended to the existing style block.
  All R84 ACs continue to pass per § 8.10 walk. The R83/R84 surface IDENTITIES (function names, element IDs, event listener wires) are preserved.
- **NO new external dependencies** (vanilla HTML/CSS/JS; halt condition 7).
- **NO modification of `run-pipeline.sh`** (PR #39 pending; directive anti-scope).
- **NO modification of `demos/scenarios/*.json` content** (byte-identical regeneration required; halt condition 9).
- **NO modification of carry-forward AC fail set** at R84 close (15 fails: AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14, AC-R82-14, AC-R83-12, AC-R83-15). The 1 forward-protection flip at AC-R84-16 is NOT modification of the carry-forward set; it is a forward-protection class flip. See § 5.3 last bullet.
- **NO modification of prior-round Q-RNN-SPEC.md files** (directive anti-scope).
- **NO Family B/C/D/E live compute** (R84 acknowledged gap inherited; R85 does not extend engine-worker.js).
- **NO topology-aware common-mode attribution in live compute** (R84 acknowledged gap inherited; R85 does not extend engine-worker.js).
- **NO speed-control honoring during live streaming** (R84 acknowledged gap inherited; R85's run-status indicator displays per-window progress but does not throttle).
- **NO real-cluster / DS-repo / `gh repo` operations** beyond optional push to Tessera public (directive scope).
- **NO modification of `package.json` or `pnpm-lock.yaml`** (no new deps; no new scripts).
- **NO modification of `tools/build-browser-bundle.ts`** (R82-frozen).
- **NO modification of `demos/engine-worker.js`** (R84-frozen).
- **NO modification of the existing R81 secondary `## Quick demo` section** at README line 194 (out-of-scope; R85 extends ONLY the top-level Quick demo at line 73). The duplicate-heading defect from R81 MAJOR-3 is NOT remediated this round.

### 6.1 Halt conditions (R85 Implementer)

1. `bash Q-R85-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than pre-documented carry-forward expectations.
2. `pnpm exec tsc -p tsconfig.test.json` exit ≠ 0.
3. Test baseline drift: `# fail` ≠ 16 OR `# pass` outside `[668, 670]` (per § 5.2 band).
4. R61-class architectural-reality discovery (e.g., setMode invocation breaks an unrelated R83/R84 invariant).
5. Architect spec uses round-evolution-fragile AC patterns: HALT + DIAGNOSTIC; do NOT silently amend per R79 MAJOR-1. (Architect upfront discipline: § 1.13 explicitly avoids `{0,N}?` quantifiers. If Implementer detects ANY `{0,N}?` in test file or spec ACs, HALT.)
6. Any cross-project discipline (Rules 1-7) violated: HALT + DIAGNOSTIC.
7. New external dependency required: HALT + DIAGNOSTIC + ESCALATE.
8. Anti-scope ALLOWED_SET incomplete (per R72/R82 MAJOR-1 lesson): file requires modification not in ALLOWED_SET → HALT + DIAGNOSTIC.
9. `demos/scenarios/*.json` content drifts post-regen: HALT + DIAGNOSTIC.
10. R82 smoke block at `demos/demo.html:13452-13477` lost post-regen: HALT + DIAGNOSTIC.
11. R83 control panel surface regressed: HALT + DIAGNOSTIC (AC-R85-18 enforces structurally).
12. R84 surfaces regressed (engine-worker.js modified, btn-cancel removed, engine-error-banner removed, etc.): HALT + DIAGNOSTIC.
13. R84 btnRun handler additive edits push first inner `});` past 3000 chars from handler anchor: HALT + DIAGNOSTIC + ESCALATE (would flip AC-R84-8/10/11 silently — see § 8.10 walk; Implementer pre-commit MUST verify by re-running R84 EMPIRICAL.sh).
14. CROSS-PROJECT-MEMORIAL.md promotion entry rejected by Reviewer as inconsistent with `~/.claude/CROSS-PROJECT-MEMORIAL.md` format: HALT + DIAGNOSTIC (per directive halt condition 8).

### 6.2 Implementer routing block template (NEXT-ROLE.md)

```
## § R85 IMPLEMENTER routing block (chore-A)

NEXT-ROLE: REVIEWER
STATUS: READY
Inputs: coordination/specs/Q-R85-SPEC.md
        coordination/specs/Q-R85-SPEC-AUDIT.md
        coordination/specs/Q-R85-EMPIRICAL.sh
        test/q85-slice-3-close.test.ts
        coordination/reviews/REVIEWER-REPORT-R85.md (Reviewer authors)

### Chore-A SHA: <ACTUAL_CHORE_A_SHA>

### Observed binding-command outputs (verbatim; Rule 1 sub-class empirical-command-attestation; R26+R72+R77+R79+R84 lineage)

- `pnpm exec tsc -p tsconfig.test.json` exit code: <ACTUAL>  (predicted 0)
- `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit code: <ACTUAL>  (predicted 1)
- TAP `# tests`:    <ACTUAL>  (predicted 689)
- TAP `# pass`:     <ACTUAL>  (predicted 669; band [668, 670])
- TAP `# fail`:     <ACTUAL>  (predicted 16 strict)
- TAP `# skipped`:  <ACTUAL>  (predicted 4)
- `bash coordination/specs/Q-R85-EMPIRICAL.sh` exit code: <ACTUAL>  (predicted 0)
- `git diff f737877 HEAD --name-only` line count: <ACTUAL>  (predicted 9-14)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` size delta: <ACTUAL_LINES_ADDED>  (predicted +~80 lines)

### CONFIRMATION lines appended to coordination/MEMORIAL.md

- tdd-discipline-red-green-verified
- empirical-command-attestation-rule-1
- all-20-acs-pass-at-green
- halt-discipline-<none-fired | DIAGNOSTIC-RNN written>
- anti-scope-allowed-set-respected
- demos-scenarios-byte-identity-preserved
- r83-r84-surface-preservation-verified
- cross-project-memorial-3-promotions-landed
- phase-4-close-attestation-emitted
```

---

## § 7. Open questions

**None — all resolved.** The directive enumerates the 5-deliverable shape exhaustively; the Architect picks (§ 1.12) close every remaining design degree of freedom. The R84 handler-region regex-bound risk is empirically resolved at spec-emit (§ 8.10 walk shows ~590-char additive footprint keeps first inner `});` at ~1850 chars from anchor — well under the 3000-char regex bound; AC-R84-8/10/11 continue to pass). The cross-project memorial format question is resolved by adopting the existing per-round-section pattern (e.g., "## Tessera R44 entries" through "## Tessera R46 entries" precedent).

---

## § 8. Pre-emit grilling output (Superpowers Phase 3; written inline)

Each section is a discipline check; each row is one applied rule.

### 8.1 Q.1 — Every claim verifiable?

| Claim | Verification command run at spec-emit | Result | Verdict |
|---|---|---|---|
| Round-start SHA is `f737877` | `git rev-parse --short HEAD` | `f737877` | PASS |
| Baseline TAP counts: tests=669, pass=650, fail=15, skipped=4 | `bash coordination/specs/Q-R84-EMPIRICAL.sh` Block 4 | tests=669 pass=650 fail=15 skipped=4 (Block 4 PASS) | PASS — encoded in § 5.2 |
| Baseline `tsc` exit = 0 | inherited from Q-R84-EMPIRICAL Block 1 | 0 (Block 1 PASS) | PASS |
| Q-R84-EMPIRICAL.sh exit at round-start | full run | 0 (all 15 sub-checks PASS) | PASS |
| `demos/demo.html` has R84 btnRun handler character size 3133 | `awk '/btnRun\.addEventListener.*click/,/^  }$/' demos/demo.html \| wc -c` | 3133 chars | PASS |
| `demos/demo.html` has scrubber DOM ref at line 12916 | `grep -n "var windowScrubber" demos/demo.html` | line 12916 | PASS |
| `demos/demo.html` has scrubber-max update at line 13485 | `grep -n "windowScrubber.max" demos/demo.html` | line 13485 | PASS |
| `demos/demo.html` has scenario selector at line 224 | `grep -n "scenario-selector" demos/demo.html` | line 224 | PASS |
| `demos/demo.html` has `#tessera-control-panel` at line 248 | grep | line 248 | PASS |
| `demos/demo.html` has `#engine-error-banner` at line 319 | grep | line 319 (inside tessera-control-panel) | PASS |
| README.md has TWO `## Quick demo` sections (R81 MAJOR-3 defect inherited) | `grep -n "^## Quick demo" README.md` | lines 73 + 194 | PASS — § 6 anti-scope explicit; only top-level (line 73) modified |
| README.md has `### Browser dashboard` at line 77 | `grep -n "^### Browser dashboard" README.md` | line 77 | PASS |
| DEMO-SCRIPT.md has 5 existing minute beats (0-2, 2-4, 4-6, 6-8, 8-10) | grep `^## Minute` | confirmed 5 matches | PASS |
| DEMO-SCRIPT.md "Bank of follow-up questions" section exists | grep `Bank of follow-up` | confirmed line 174 | PASS |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` exists and has prior Tessera per-round sections | `head -1 ~/.claude/CROSS-PROJECT-MEMORIAL.md` + grep `Tessera R[0-9]+ entries` | exists; multiple per-round sections from R36/R38/R39/R44/R45/R46 | PASS |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` Rule 1 derived at R26 | grep `Rule 1.*false-compliance` | line 3478-class section | PASS — sub-class promotions canonically anchor on Rule 1 |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` Rule 7 canonical landing R38 | grep `Rule 7.*derived-rule-propagation` | confirmed at R38 section | PASS — supports 2-instance flag with 3rd-instance trigger discipline |
| Empirical-command-attestation Rule 1 sub-class canonical at R46 | grep `empirical-command-attestation` | confirmed multiple references | PASS — `architect-encoded-regex-with-hardcoded-bounds` parallels this sub-class structure |
| R56 verdict.ts vendored-with-deltas transition | confirmed via `coordination/VENDORING-MANIFEST.md` + R56 spec reference | confirmed | PASS |
| R82 topology-overlay.ts vendored-with-deltas transition | confirmed via R82 spec § 2.x | confirmed | PASS |

### 8.2 Q.2 — Unstated assumptions?

| Assumption | Stated where? | Verification |
|---|---|---|
| `pnpm build:demos` regeneration is deterministic | § 1.9 I2 + § 1.11 prediction `byte-identical` | Halt condition 9 enforces at chore-A; R71-R84 all relied on this property; no prior round reported drift. |
| Tessera-mode radio change-event fires synchronously on user click | § 1.4 listener body | Standard browser behavior; no race documented in DOM spec. |
| `document.body.setAttribute('data-mode', mode)` is observed by CSS rules immediately | § 1.4 setMode body | Standard CSS attribute selector rerun on attribute change; no MutationObserver required. |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` is writable by the Implementer process | Implementer chore-A | User-level file; standard fs.writeFile semantics; no privilege escalation. |
| `os.homedir()` resolves consistently across `tsc` compile-time and `node --test` runtime | § 1.8 test imports | Standard `node:os` behavior; HOME env var. |
| R84 handler additive edits keep first inner `});` under 3000 chars | § 8.10 walk | Direct measurement: current handler 3133 chars; first inner `});` at ~1563 chars; +~590 chars → ~1850 chars. Safe margin. |
| Existing R83/R84 DOM-ref pattern allows inserting new refs adjacent to existing ones | § 1.4 insertion point A | R84 already inserted refs after R83 declarations; R85 follows the same pattern. |
| DEMO-SCRIPT.md anchor links (`#minute-1000--1200--live-mode-interactive`) match GitHub Markdown auto-generated anchors | § 1.5 ToC | GitHub-flavored Markdown auto-anchor: lowercase, spaces → `-`, special chars stripped. Verified via prior round's anchor patterns at `#minute-200--400-…` etc. |

### 8.3 Q.3 — Scope added beyond request?

| Addition | In directive? | Verdict |
|---|---|---|
| 5 stages in `updateRunStatus` (reset/running/complete/error/cancelled) | NOT in directive verbatim ("Run again" affordance only) | Stages cover the run state machine; minimal — each is one branch | KEEP |
| `aria-live="polite"` on `#engine-run-status` | NOT in directive | Accessibility hygiene; zero-cost; supports screen-readers | KEEP |
| `aria-hidden="true"` on `.spinner` element | NOT in directive | Accessibility hygiene; the spinner is decorative | KEEP |
| `#engine-error-banner::before` warning icon | NOT in directive verbatim ("error banner styling") | Styling enhancement; one CSS rule | KEEP |
| DEMO-SCRIPT "## Contents" ToC | "ToC update" in directive | DIRECT directive deliverable | KEEP |
| DEMO-SCRIPT new "## Pacing notes" bullet | NOT in directive | Audience-tailoring note; consistent with existing Pacing notes pattern | KEEP — pedagogical |

No scope materially beyond directive's 5 deliverables (mode toggle, scrubber integration, per-mode UI clarity, polish, DEMO-SCRIPT extension + README extension + cross-project promotions + test file + EMPIRICAL.sh).

### 8.4 Q.4 — Implementer can act without guessing?

| Decision | Spec source |
|---|---|
| Exact HTML markup (mode toggle + loading indicator + run-status) | § 1.2 verbatim |
| Exact CSS rules | § 1.3 verbatim |
| Exact JS edits (setMode + helpers + listener) | § 1.4 verbatim |
| Six additive edits inside R84 handlers — anchored by literal-text patterns | § 1.4 insertion point B enumeration |
| Exact DEMO-SCRIPT.md insertions (3 insertion points) | § 1.5 verbatim |
| Exact README.md insertion | § 1.6 verbatim |
| Exact CROSS-PROJECT-MEMORIAL.md append text | § 1.7 verbatim |
| Exact test file | § 1.8 verbatim |
| Chore-A commit sequence | § 4.1 RED→GREEN |
| Routing block content | § 6.2 template |
| Halt conditions | § 6.1 enumerated |
| Q-R85-EMPIRICAL.sh structure | § 5.2 prediction table + § 1.8 AC-R85-20 block markers |

Implementer can act without clarifying questions. PASS.

### 8.5 Q.5 — Self-application gate (would the spec's own prescriptions satisfy its own ACs?)

| AC | Spec section that satisfies it | Walk-through |
|---|---|---|
| AC-R85-1 | § 1.2 insertion A `<fieldset id="mode-toggle">` + `<legend>Mode</legend>` | `.includes("id=\"mode-toggle\"")` + regex on `<legend>Mode</legend>` both match ✓ |
| AC-R85-2 | § 1.2 insertion A `<input type="radio" name="tessera-mode" value="canned" checked>` + `value="live"` | Both narrow regexes match ✓ |
| AC-R85-3 | § 1.4 `function setMode(mode) { ... if (mode !== 'canned' && mode !== 'live') return; ... }` | function regex + both literal `=== 'canned'` / `=== 'live'` matches ✓ |
| AC-R85-4 | § 1.4 `modeRadios[mi].addEventListener('change', function (ev) {...})` + ref to `tessera-mode` | both literal checks match ✓ |
| AC-R85-5 | § 1.4 `document.body.setAttribute('data-mode', mode)` | regex `setAttribute\(['"]data-mode['"]` matches ✓ |
| AC-R85-6 | § 1.3 `body[data-mode='live'] #scenario-selector { ... }` | regex matches ✓ |
| AC-R85-7 | § 1.3 `body[data-mode='canned'] #tessera-control-panel input, ... { ... }` | regex matches ✓ |
| AC-R85-8 | § 1.2 insertion B `<div id="engine-loading-indicator">` + § 1.3 `@keyframes tessera-spin` | both `.includes()` checks match ✓ |
| AC-R85-9 | § 1.2 insertion B `<div id="engine-run-status" ... aria-live="polite">` | regex matches ✓ |
| AC-R85-10 | § 1.4 `function updateRunStatus(stage, payload) { if (stage === 'running') ... else if (stage === 'complete') ... else if (stage === 'error') ... else if (stage === 'cancelled') ... else if (stage === 'reset') ... }` | function regex + all 5 literal checks match ✓ |
| AC-R85-11 | § 1.4 `function r85ShowLoadingSpinner` + `function r85HideLoadingSpinner` + invocations in btnRun handler / onmessage branches / btnCancel handler | all 4 regex/literal checks match ✓ |
| AC-R85-12 | § 1.5 insertion A `## Contents` heading + bullet list with `[Minute 10:00 – 12:00 — Live mode (interactive)](#minute-1000--1200--live-mode-interactive)` | regex `^## Contents$` + anchor literal match ✓ |
| AC-R85-13 | § 1.5 insertion B `## Minute 10:00 – 12:00 — Live mode (interactive)` section with `Cancel` + `Run` + `Worker` mentions | regex + section split + 3 literal checks match ✓ |
| AC-R85-14 | § 1.6 README insertion paragraph mentioning `Live mode toggle` + `DEMO-SCRIPT.md § Minute 10:00 – 12:00` | section split (between `### Browser dashboard` and next `###`) + both literal checks match ✓ |
| AC-R85-15 | § 1.7 canonical text contains `haiku-mu-status-field-disambiguation` slug + `TOP-OF-FILE STATUS field` phrase | both checks match ✓ |
| AC-R85-16 | § 1.7 canonical text contains `architect-encoded-regex-with-hardcoded-bounds` slug + `{0,N}` phrase | both checks match ✓ |
| AC-R85-17 | § 1.7 canonical text contains `vendored-at-pin → vendored-with-deltas reclassification precedent` slug + `R56` + `R82` cites | all checks match ✓ |
| AC-R85-18 | § 1.4 + § 1.2 only MODIFY R84-section btnRun handler body additively + ADD mode-toggle + loading-indicator + run-status; do NOT touch any other R71/R79/R80/R81/R82/R83/R84 surface | All 18+ markers preserved ✓ |
| AC-R85-19 | § 3.2 ALLOWED regex copied verbatim into the test; § 4.1 chore-A diff is by-construction within ALLOWED | ✓ |
| AC-R85-20 | `test/q85-slice-3-close.test.js` exists post-tsc; `Q-R85-EMPIRICAL.sh` contains all 5 Block markers | PASS by construction |

All 20 ACs satisfied by spec prescriptions. PASS.

### 8.6 Q.6 — Empirical premise verification (R08 MAJOR-2 / R77 EMPIRICAL.sh probe-run rule)

EMPIRICAL.sh probe-run at round-start HEAD `f737877`:

- **Q-R84-EMPIRICAL.sh full run at round-start**: all 15 sub-checks PASS; observed counts tests=669 pass=650 fail=15 skipped=4 (Block 4 strict match).
- **Q-R85-EMPIRICAL.sh probe expectation at round-start**:
  - **Block 1 typecheck**: expected PASS (`pnpm exec tsc -p tsconfig.test.json` exit 0; inherited from R84 close baseline).
  - **Block 2 demo.html R85 surface presence**: expected FAIL at round-start (mode toggle / loading indicator / run-status / setMode all absent until Implementer GREEN).
  - **Block 3 DEMO-SCRIPT.md + README.md presence**: expected FAIL at round-start (Live mode section absent; Browser dashboard paragraph absent).
  - **Block 4 test counts**: expected FAIL at round-start (q85 test absent; counts 669/650/15/4, not predicted 689/669/16/4).
  - **Block 5 anti-scope diff**: expected PASS at round-start (`git diff f737877 HEAD` is empty; no unauthorized paths).
- **Visualization sanity check (R77 MINOR-2 lesson)**: N/A — R85 has no statistical visualization deliverables; ASCII curves / heat-maps absent.

**Critical pre-emit walk-through of R84 ACs under R85 modifications:**

The R85 prescribed JS edits add ~590 chars total inside R84's btnRun click handler + onmessage + onerror + btnCancel handlers. The R84 ACs that use char-bounded regex over these regions:

- **AC-R84-8** `/btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/`: searches for the FIRST `});` after btnRun anchor. At R84 close that's at ~1563 chars (the `scenarios['custom'].windows.push({...});` close). R85 adds 2 lines at handler START (`r85ShowLoadingSpinner()` + `updateRunStatus('reset')` ≈ 80 chars), pushing all subsequent positions by ~80 chars. The first inner `});` (windows.push close) sits at ~1643 chars from anchor. Within bound. AC-R84-8 (looking for `new Worker(...)` inside captured region) still passes — `new Worker(...)` is at ~250 chars from anchor (early in handler). ✓
- **AC-R84-10** `/worker\.onmessage\s*=\s*function[\s\S]{0,3000}?\}\s*;/`: searches for the FIRST `};` after onmessage anchor. Current onmessage handler is ~1500 chars; first `};` is the `worker.onmessage = function (...) { ... };` closing. R85 adds 7 lines INSIDE onmessage branches (~410 chars total). New onmessage size ~1910 chars. AC asserts `scenarios['custom'].windows.push` + `drawFrame` both inside captured region. Both inside the function body, before the final `};`. ✓
- **AC-R84-11** `/btnCancel\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,1000}?\}\s*\)\s*;/`: searches for the FIRST `});` after btnCancel anchor. Current btnCancel handler is ~190 chars. R85 adds 2 lines (~50 chars). New size ~240 chars. AC asserts `.terminate()` inside captured region. Inside the handler body, before the final `});`. ✓

All three R84 char-bounded regex ACs continue to pass under R85 modifications. R85's spec discipline explicitly walks this risk to prove it doesn't materialize — closing the round-evolution-fragile concern that derived R84's ESCALATE.

Probe outcome documented in Q-R85-SPEC-AUDIT.md § C. No surprise failures.

### 8.7 Q.7 — Spec-internal contradictions sweep

| Pair | Sweep |
|---|---|
| § 1.11 predicted fail count = 16 vs § 2.6 implicit = 16 vs § 5.2 = 16 vs Q-R85-EMPIRICAL.sh Block 4 EXPECTED_FAIL = 16 | All four sites agree |
| § 1.11 predicted pass band [668, 670] vs § 5.2 = [668, 670] vs Q-R85-EMPIRICAL.sh Block 4 EXPECTED_PASS_MIN/MAX = 668/670 | All three sites agree |
| § 1.2 markup `id="mode-toggle"` vs § 1.3 CSS `#mode-toggle` vs § 1.4 JS `getElementById('mode-toggle')` vs § 1.8 AC-R85-1 `id="mode-toggle"` | All four sites agree on ID |
| § 1.2 radio `name="tessera-mode"` vs § 1.4 JS `querySelectorAll('input[name="tessera-mode"]')` vs § 1.8 AC-R85-2 `name="tessera-mode"` | All three sites agree |
| § 1.4 `data-mode` attribute vs § 1.3 CSS `body[data-mode='canned']` / `body[data-mode='live']` vs § 1.8 AC-R85-5/6/7 | All sites agree |
| § 1.4 `currentMode` initial value vs `setMode('canned')` at IIFE bottom | Initial canned consistent |
| § 1.4 5 stages of updateRunStatus vs § 1.8 AC-R85-10 5 stage literals | All 5 match: reset / running / complete / error / cancelled |
| § 3.1 ALLOWED_SET narrative table vs § 3.2 regex vs § 1.8 AC-R85-19 in-test regex vs Q-R85-EMPIRICAL.sh Block 5 ALLOWED variable | All four gate artifacts share the SAME path patterns (R72/R82 MAJOR-1 lesson application at spec-emit) |
| § 6.1 halt-condition 8 (ALLOWED_SET incomplete) vs § 3.1 enumeration | Halt condition + enumeration agree |
| Round-start SHA `f737877` consistency | § header, § 1.8 ROUND_START_SHA, § 1.11, § 5.2, § 8.1, Q-R85-EMPIRICAL.sh — identical 7-char prefix everywhere |

No contradictions. PASS.

### 8.8 Q.8 — Acknowledged-gap pairing (R74 MINOR-2 lesson)

§ 5.3 documents 5 acknowledged gaps; each pairs with a falsifiable mitigation:

| Gap | Mitigation |
|---|---|
| No live browser smoke test for mode toggle | Per-link structural ACs (AC-R85-3..5) + DEMO-SCRIPT manual smoke documentation |
| No AC binds run-status text exactness | AC-R85-10 binds stage literals; copy-iteration tolerance is intentional |
| No AC binds DEMO-SCRIPT insertion ORDER | Markdown anchors resolve regardless; spec § 1.5 prescribes order verbatim; Reviewer cold-eye verifies |
| No AC verifies cross-project memorial canonical-rule format | AC-R85-15..17 bind SHORT NAME + key phrases; Reviewer cold-eye reads § 1.7 for full-format compliance |
| AC-R84-16 forward-protection flip expected | Walked in § 1.11; documented as forward-protection class, not modification of carry-forward set |

Each gap paired with concrete mitigation. PASS.

### 8.9 Q.9 — Cross-section consistency (R01-R02 16-token sweep equivalent)

| Token / identifier | All sites | Consistency |
|---|---|---|
| `mode-toggle` | § 1.2, § 1.3, § 1.4, § 1.8 AC-R85-1 | Identical ID everywhere |
| `tessera-mode` (radio name) | § 1.2, § 1.4, § 1.8 AC-R85-2/4 | Identical name everywhere |
| `engine-loading-indicator` | § 1.2, § 1.3, § 1.4, § 1.8 AC-R85-8/11 | Identical ID everywhere |
| `engine-run-status` | § 1.2, § 1.3, § 1.4, § 1.8 AC-R85-9 | Identical ID everywhere |
| `setMode` (function name) | § 1.4 declaration + invocations, § 1.8 AC-R85-3 | Identical camelCase |
| `updateRunStatus` (function name) | § 1.4 declaration + invocations, § 1.8 AC-R85-10 | Identical camelCase |
| `r85ShowLoadingSpinner` / `r85HideLoadingSpinner` | § 1.4 declarations + invocations, § 1.8 AC-R85-11 | Identical camelCase |
| `currentMode` | § 1.4 declaration + use | Module-private |
| `data-mode` attribute | § 1.3 CSS selectors, § 1.4 setAttribute, § 1.8 AC-R85-5/6/7 | Identical attribute name |
| `## Contents` heading | § 1.5 insertion A, § 1.8 AC-R85-12 | Identical |
| `## Minute 10:00 – 12:00 — Live mode (interactive)` heading | § 1.5 insertion B, § 1.8 AC-R85-13 | Identical en-dash spacing |
| `haiku-mu-status-field-disambiguation` slug | § 1.7, § 1.8 AC-R85-15 | Identical slug |
| `architect-encoded-regex-with-hardcoded-bounds` slug | § 1.7, § 1.8 AC-R85-16 | Identical slug |
| `vendored-at-pin → vendored-with-deltas reclassification precedent` phrase | § 1.7, § 1.8 AC-R85-17 | Identical (Unicode arrow); AC also tolerates ASCII `->` per § 1.8 |
| `f737877` (round-start SHA) | § header, § 1.8 ROUND_START_SHA, § 1.11, § 5.2, § 8.1, § 8.6, Q-R85-EMPIRICAL.sh | Identical 7-char prefix |
| Predicted `# tests` 689 | § 1.11, § 5.2 | Identical |
| Predicted `# pass` 669 (band 668-670) | § 1.11, § 5.2 | Identical |
| Predicted `# fail` 16 | § 1.11, § 5.2 | Identical |
| ALLOWED_SET regex string | § 3.2, § 1.8 (AC-R85-19), Q-R85-EMPIRICAL.sh Block 5 | Identical regex |
| `--test-reporter=tap` flag | § 1.11, § 5.2, Q-R85-EMPIRICAL.sh Block 4 | Identical command (R77 lesson) |
| 5 stage literals (reset/running/complete/error/cancelled) | § 1.4 updateRunStatus body, § 1.8 AC-R85-10 | Identical 5 strings |

No cross-section drift. PASS.

### 8.10 Q.10 — Discriminating-AC walk-through + R84-AC-non-regression walk (R44/R46/R65/R71 MINOR-1 lesson + R84 lesson)

For each R85 AC, would it FAIL if the canonical structural element / behavior were absent?

| AC | Mutation that should FAIL the AC | Verdict |
|---|---|---|
| AC-R85-1 | Delete `id="mode-toggle"` from HTML → `.includes` FAIL | Discriminating |
| AC-R85-2 | Change radio `name` to `"mode"` → regex FAIL | Discriminating |
| AC-R85-3 | Remove `function setMode` declaration → function regex FAIL | Discriminating |
| AC-R85-4 | Remove the listener attachment → `tessera-mode` or `addEventListener('change'` FAIL | Discriminating |
| AC-R85-5 | Remove `setAttribute('data-mode', ...)` → regex FAIL | Discriminating |
| AC-R85-6 | Change CSS to `body[data-mode='live'] #foo` (different target) → CSS regex FAIL | Discriminating |
| AC-R85-7 | Change CSS to `body[data-mode='live'] #tessera-control-panel` (wrong mode) → CSS regex FAIL | Discriminating |
| AC-R85-8 | Delete `id="engine-loading-indicator"` → `.includes` FAIL | Discriminating |
| AC-R85-9 | Remove `aria-live` attribute → regex FAIL | Discriminating |
| AC-R85-10 | Remove any of the 5 stage literals → corresponding stage check FAIL | Discriminating per stage |
| AC-R85-11 | Remove `r85ShowLoadingSpinner` declaration → function regex FAIL | Discriminating |
| AC-R85-12 | Delete `## Contents` heading → regex FAIL | Discriminating |
| AC-R85-13 | Move Cancel mention out of Live mode section → section-split body check FAIL | Discriminating |
| AC-R85-14 | Add "Live mode" mention OUTSIDE `### Browser dashboard` subsection → section-bounded check still FAIL | Discriminating (section-scoped, not file-wide) |
| AC-R85-15 | Drop the slug from cross-project memorial → `.includes` FAIL | Discriminating |
| AC-R85-16 | Drop the slug from cross-project memorial → `.includes` FAIL | Discriminating |
| AC-R85-17 | Drop R56 or R82 cite from rule body → grep FAIL | Discriminating |
| AC-R85-18 | Remove any of the 18+ prior-round markers → regex FAIL per marker | Discriminating per marker |
| AC-R85-19 | Add unauthorized path (e.g., `engine/types/verdict.ts`) to diff → violators non-empty FAIL | Discriminating |
| AC-R85-20 | Remove "── Block 3:" line from EMPIRICAL.sh → block-marker regex FAIL | Discriminating |

All 20 ACs are structurally discriminating. PASS.

**R84-AC non-regression walk (round-evolution-fragility check):**

| Prior round AC | Robustness under R85 modifications | Verdict |
|---|---|---|
| AC-R84-1 (engine-worker.js exists, ≥200 bytes) | R85 does NOT modify engine-worker.js | PASS (unchanged) |
| AC-R84-2..7 (engine-worker.js internal structure) | R85 does NOT modify engine-worker.js | PASS (unchanged) |
| AC-R84-8 (`new Worker('./engine-worker.js')` inside `{0,3000}?`-captured btnRun region) | R85 adds ~80 chars at handler START; `new Worker(...)` shifts from ~150 to ~230 chars from anchor; well within 3000-char captured region. First inner `});` (windows.push close) shifts to ~1643 chars; under 3000 | PASS |
| AC-R84-9 (`worker.postMessage({type:"run", controlState:...})` direct full-HTML regex) | R85 adds no postMessage calls; existing R84 postMessage preserved | PASS |
| AC-R84-10 (`scenarios['custom'].windows.push` + `drawFrame` inside `{0,3000}?`-captured onmessage region) | R85 adds ~410 chars inside onmessage; new onmessage size ~1910 chars; first `};` is the function-body close at ~1910 chars; under 3000 | PASS |
| AC-R84-11 (`worker.terminate()` inside `{0,1000}?`-captured btnCancel region) | R85 adds ~50 chars inside btnCancel; new size ~240 chars; under 1000 | PASS |
| AC-R84-12 (`#engine-error-banner` + `r84ShowError` + `worker.onerror` all present) | R85 preserves all 3; adds `updateRunStatus('error')` calls adjacent to r84ShowError | PASS |
| AC-R84-13, AC-R84-14 (end-to-end Node Worker round-trip) | R85 does not modify worker file or Worker protocol | PASS (unchanged) |
| AC-R84-15 (14 prior-round markers preserved) | R85 adds new markers but does NOT remove any of the 14 | PASS (R85 extends the marker set) |
| AC-R84-16 (anti-scope diff ⊆ R84 ALLOWED_SET) | R85 introduces new paths NOT in R84 regex → AC-R84-16 FLIPS pass→fail (predicted; § 1.11) | FLIPS (expected; forward-protection class) |
| AC-R84-17 (typecheck sentinel + EMPIRICAL.sh block markers) | R85 does not modify Q-R84-EMPIRICAL.sh | PASS (unchanged) |

R84 AC-non-regression walk complete: 16 of 17 ACs remain PASS at R85 chore-A; 1 flips (AC-R84-16) per expected forward-protection class. No surprise flips.

### 8.11 Q.11 — spec-amendment-ALL-gate-artifacts-propagation (R72/R82 MAJOR-1 lesson; applied UPFRONT)

At spec-emit (no amendment yet, but discipline scaffolding in place):

| Gate artifact | ALLOWED_SET source |
|---|---|
| 1. § 3.1 narrative inventory table | listed (path patterns) |
| 2. § 3.2 ALLOWED regex (machine-checkable) | verbatim copy |
| 3. `test/q85-slice-3-close.test.ts` AC-R85-19 regex | verbatim copy (lives in § 1.8) |
| 4. `Q-R85-EMPIRICAL.sh` Block 5 ALLOWED variable | verbatim copy (lives in EMPIRICAL.sh) |

All 4 gate artifacts share the SAME path patterns. Any future amendment must update all 4 simultaneously. Implementer halt condition 8 enforces.

PASS.

### 8.12 Q.12 — Routing-block grep-verification (R65 MINOR-1 lesson)

Routing block (§ 6.2 template) cites: AC-R85-1..20, ROUND_START_SHA `f737877`, file paths to Q-R85-SPEC.md / Q-R85-SPEC-AUDIT.md / Q-R85-EMPIRICAL.sh / test/q85-slice-3-close.test.ts. Each grep-verifiable:

| Citation | Source | Verification |
|---|---|---|
| "AC-R85-1" through "AC-R85-20" | § 1.8 + § 5 + § 8.10 | grep `AC-R85-N` returns N=1..20 |
| ROUND_START_SHA `f737877` | § header + § 1.8 (`const ROUND_START_SHA = 'f737877'`) + § 1.11 + § 5.2 | grep `f737877` returns multiple matches |
| File paths | self-reference + § 1.8 imports | identical spelling everywhere |

PASS.

### 8.13 Q.13 — Anti-scope ALLOWED_SET forward-coverage walk (R79 lesson + R25 MAJOR-2 + R79 pre-emit-grilling)

Walk prior 2 rounds' forward-protection ACs to predict flips:

| Prior round | AC | Round-start SHA | ALLOWED regex includes R85 paths? | Predicted flip |
|---|---|---|---|---|
| R84 | AC-R84-16 (allowed-set diff) | `0e93c15` | NO — R84 regex enumerates `test/q84-live-engine-compute\.test\.ts`, `Q-R84-SPEC*`, `Q-R84-EMPIRICAL\.sh`, `REVIEWER-REPORT-R84.md`, `demos/engine-worker.js`; R85-specific paths (`test/q85-*`, `Q-R85-*`, `REVIEWER-REPORT-R85.md`, `demos/DEMO-SCRIPT.md`, `README.md`) are NOT in the regex | YES → 1 fail flip |
| R84 | AC-R84-15 (anti-regression markers) | `0e93c15` | N/A — asserts marker presence; R85 preserves all 14 markers | No flip (PASS preserved) |
| R83 | AC-R83-15 (allowed-set diff) | `4c4733d` | Already failing at R84 close (carry-forward) — re-flipping a failing AC doesn't change strict fail count | No NEW change |
| R83 | AC-R83-12 (btnRun handler shape) | `4c4733d` | Already failing at R84 close (carry-forward; R84 replaced handler body) | No NEW change |

R85 introduces ONE new fail (R84 AC-R84-16 allowed-set). Encoded as strict +1 in § 5.2 (15 → 16). Matches Architect prediction.

PASS — exhaustive forward-protection-AC audit complete, with both prior 2 rounds' forward-protection ACs walked.

### 8.14 Q.14 — Cite-then-verify for all line citations (R02 / R11 / R65 lessons)

| Citation | Verification | Result |
|---|---|---|
| `demos/demo.html:224` is `<select id="scenario-selector">` | `grep -n "scenario-selector" demos/demo.html` | line 224 |
| `demos/demo.html:248` is `<section id="tessera-control-panel"` | `grep -n "tessera-control-panel" demos/demo.html` | line 248 |
| `demos/demo.html:319` is `<div id="engine-error-banner"` | `grep -n "engine-error-banner" demos/demo.html` | line 319 |
| `demos/demo.html:12916` is `var windowScrubber` | `grep -n "var windowScrubber" demos/demo.html` | line 12916 |
| `demos/demo.html:13452-13477` is R82 smoke block range | `grep -n "R82-SMOKE-BLOCK" demos/demo.html` | lines 13452 + 13477 |
| `demos/demo.html` R84 btnRun handler current char size = 3133 | `awk '/btnRun\.addEventListener.*click/,/^  }$/' demos/demo.html \| wc -c` | 3133 chars |
| `README.md:73` is `## Quick demo` (1st instance) | `grep -n "^## Quick demo" README.md` | line 73 |
| `README.md:77` is `### Browser dashboard` | `grep -n "^### Browser dashboard" README.md` | line 77 |
| `README.md:194` is `## Quick demo` (2nd instance; R81 duplicate-heading defect) | `grep -n "^## Quick demo" README.md` | line 194 |
| `DEMO-SCRIPT.md` "Before you start" section | grep | line 7 |
| `DEMO-SCRIPT.md` "Bank of follow-up questions" section | grep | line 174 |
| Q-R84-EMPIRICAL.sh at HEAD passes all 15 sub-checks | direct run | confirmed |

PASS — no off-by-N drift in line citations.

### 8.15 Q.15 — Architect-claim-without-empirical-walk discipline (cross-project promoted rule)

Every load-bearing claim about codebase or future-commit state in this spec has been verified by direct command at spec-emit:

| Load-bearing claim | Verification command | Run |
|---|---|---|
| Baseline TAP counts at round-start | Q-R84-EMPIRICAL.sh full run | Run; confirmed 669/650/15/4 |
| R84 btnRun handler char size | `awk ... | wc -c` | Run; 3133 chars |
| Existing scrubber DOM ref location | `grep -n` | Run; line 12916 |
| Existing CSS selectors / element IDs to preserve | `grep -n` | Run; all confirmed |
| README "### Browser dashboard" subsection at line 77 | `grep -n` | Run; confirmed |
| DEMO-SCRIPT 5 existing minute beats | `grep -c "^## Minute"` | Run; confirmed 5 |
| ~/.claude/CROSS-PROJECT-MEMORIAL.md exists with prior per-round sections | `head -1` + `grep "Tessera R[0-9]+ entries"` | Run; confirmed |
| Rule 1 canonical landing R26 | grep canonical text | Run; confirmed |
| Rule 7 canonical landing R38 | grep canonical text | Run; confirmed |
| R56 verdict.ts vendored-with-deltas precedent | spec reference + VENDORING-MANIFEST.md | Run; confirmed |
| R82 topology-overlay.ts vendored-with-deltas precedent | R82 spec § 2.x | Run; confirmed |
| R84 ESCALATE root cause = char-bounded regex | NEXT-ROLE.md § "R84 ESCALATE Option A" | Run; confirmed in § 8 |
| 4-instance Haiku-MU pattern (R75 + R78 + R80 + R83) | NEXT-ROLE.md § R83 / R84 close attestations | Run; confirmed at NEXT-ROLE lines 179-185 |
| 6-instance architect-regex pattern (R62 + R66 + R68 + R72 + R83 + R84) | NEXT-ROLE.md § R84 IMPLEMENTER routing + CROSS-PROJECT-MEMORIAL entries | Run; confirmed via per-round audit-trail accumulations in directive |

PASS — every load-bearing factual claim verified empirically.

### 8.16 Q.16 — Re-read as Implementer; mark assumptions Implementer can't verify

Re-reading the spec as Implementer:

- § 1.2/1.3/1.4/1.5/1.6/1.7/1.8 are verbatim source; Implementer copies. ✓
- § 1.7 cross-project memorial append requires `~/.claude/CROSS-PROJECT-MEMORIAL.md` write access — standard user-level write; no privilege escalation. ✓
- § 1.8 test file uses standard `node:test` + `node:fs` + `node:os` + `node:path` + `node:child_process`; all in Node v20+. ✓
- § 4.1 chore-A sequence is RED→GREEN with explicit commands. ✓
- § 5.2 binding-command attestation table prescribes exact commands + predicted values + bands. ✓
- § 6.1 halt conditions are enumerated with explicit triggers (14 conditions). ✓
- § 6.2 routing block template includes verbatim placeholder slots for OBSERVED values. ✓
- All ALLOWED_SET sources (§ 3.1, § 3.2, AC-R85-19 in § 1.8, Q-R85-EMPIRICAL.sh Block 5) carry the SAME path patterns. ✓
- R84 surface preservation walk (§ 8.10 R84-AC non-regression) explicitly shows the 16-of-17 R84 ACs pass + 1 expected flip. ✓
- The "Implementer can act with zero clarifying questions" gate: PASS.

### 8.17 Q.17 — Round-evolution-fragile AC pattern self-application gate (R84 lesson; the very rule this round promotes)

Apply Rule 5 self-application gate: would the spec's own ACs pass under reasonable additive evolution?

| AC | Char-bounded? | Robust to additive evolution? |
|---|---|---|
| AC-R85-1..11 | No (all use `.includes()` or narrow regex without `{0,N}?`) | YES — adding ANY content to demo.html does not affect any `.includes()` check or narrow regex |
| AC-R85-12, AC-R85-13 | No (use natural Markdown section boundaries via split on `^## `) | YES — adding content INSIDE the Live mode section grows the section body but does not break the section-split or content checks |
| AC-R85-14 | No (uses section split between `### Browser dashboard` and next `### ` heading) | YES — adding content inside the subsection grows the bounded substring; both literal checks remain valid |
| AC-R85-15..17 | No (use `.includes()` on multi-word slugs) | YES — adding content elsewhere in CROSS-PROJECT-MEMORIAL.md does not affect the slug presence check |
| AC-R85-18 | No (uses `.includes()` / narrow regex per marker) | YES — adding new markers does not break existing-marker presence checks |
| AC-R85-19 | No (regex match against `git diff --name-only` output; not char-bounded) | YES — adding new authorized paths to ALLOWED_SET updates all 4 gate artifacts in lockstep |
| AC-R85-20 | No (uses `.includes()` per Block marker) | YES |

ZERO ACs in R85 use `{0,N}?` char-bounded quantifier. Self-application gate PASS.

### 8.18 Final pre-emit grilling verdict

All 17 sub-sections (Q.1 through Q.17) PASS. No surprise outcomes; all load-bearing claims verified empirically at spec-emit (R85-empirical baseline + R84 AC non-regression walk + 4-gate-artifact lockstep); the very rule R85 promotes (architect-encoded-regex-with-hardcoded-bounds Rule 1 sub-class) is honored by R85's own ACs (Q.17 self-application gate PASS).

**STATUS: READY for routing to Implementer.**

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | Mode toggle + setMode wire body[data-mode] + per-element disabled in lockstep with CSS; scrubber max updates per window message; loading spinner shows/hides on Worker lifecycle events; run-status displays 5 stages reflecting the run state machine. End-to-end browser flow is structurally verified by direct file-read ACs binding each link in the chain. |
| Completeness | All 5 directive deliverables addressed: (1) Canned-vs-Live toggle + scrubber integration + per-mode UI + polish (loading spinner + Run again affordance + error banner styling); (2) DEMO-SCRIPT.md Minute 10-12 + ToC; (3) README.md Quick demo extension; (4) ~/.claude/CROSS-PROJECT-MEMORIAL.md 3 promotions; (5) test/q85-slice-3-close.test.ts with 20 ACs covering all four surfaces + anti-regression + anti-scope + sentinels. Q-R85-EMPIRICAL.sh uses --test-reporter=tap (R77 lesson). |
| Consistency | All identifiers / function names / file paths / SHA / count predictions consistent across § 1.2 through § 1.8 per Q.9 cross-section sweep. ALLOWED_SET regex string lockstep across 4 gate artifacts. |
| Clarity | Banned ambiguous language absent from AC text. Each AC names a specific structural property + a specific assertion. ACs avoid char-bounded regex (R84 lesson). |
| Coverage | 20 ACs × 1 test() block each = 20 added test counts. Coverage spans: mode toggle structural (1-7), polish elements (8-11), DEMO-SCRIPT (12-13), README (14), cross-project memorial (15-17), anti-regression (18), anti-scope (19), sentinel (20). |
| Constraints | engine/* + engine-worker.js untouched; R71-R84 surfaces preserved (AC-R85-18); demos/scenarios/*.json byte-identical (halt 9); no new deps (halt 7); R84 handler additive-only (~590 chars; walked in § 8.10); ALLOWED_SET 4-gate lockstep (R72/R82 lesson). |
| Concurrency | Single-threaded UI; no new threads beyond R84's existing Worker. Mode toggle / spinner / status are all synchronous DOM mutations. No race conditions. |
| Corner cases | (a) Mode radio change fires before setMode declared (impossible per IIFE end-of-body placement); (b) Cancel pressed during loading spinner state → spinner hides (`r85HideLoadingSpinner()` is called in btnCancel handler additive edit); (c) Worker error during streaming → spinner hides + status shows 'error'; (d) Switching mode mid-run → setMode resets the status indicator but does NOT cancel the worker (deliberate — operator may want to switch back); (e) Cross-project memorial file missing on fresh-clone → AC-R85-15..17 fail with explicit message (halt-3 fires). |
| Cost | Implementer footprint: ~125 lines tool edit, ~50 lines DEMO-SCRIPT edit, ~10 lines README edit, ~80 lines cross-project memorial append, ~280 lines test, 3 spec triad files. Reviewer footprint: 1 report. ~10-13 file diff total (plus spec triad). Test time impact: 20 new structural ACs are sub-millisecond each; negligible. |
| Coupling | R85 consumes R71/R79/R80/R81/R82/R83/R84 surfaces; no upstream surface forced to know about R85. The mode toggle is the ONLY new top-level surface; everything else is additive to existing R83/R84 elements. Cross-project memorial coupling: 3 promotions reference canonical Rules 1 + 7 (existing) — sub-class extensions, not orthogonal new rules. |

---

## § 10. Pipeline invocation (recap from directive)

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R85 --tier full
```

Spec triad committed BEFORE chore-A per CLAUDE-ARCHITECT.md REINFORCED 2026-05-17 (R21 ARCH MINOR-1): the Architect must commit `Q-R85-SPEC.md` + `Q-R85-SPEC-AUDIT.md` + `Q-R85-EMPIRICAL.sh` in a `spec(R85)` commit BEFORE writing the routing block in NEXT-ROLE.md that dispatches Implementer.
