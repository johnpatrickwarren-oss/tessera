# Q-R79-SPEC — Front-panel split + provenance + live verdict banner (Phase 4 SLICE 2 round 1)

**Round:** R79 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `c87bdfe` (`chore(R78 close + R79 directive + Phase 4 SLICE 1 close + Haiku-MU REINFORCED)`) — verified via `git rev-parse HEAD` at Architect session entry 2026-05-20.
**Spec-emit SHA:** stamped by Architect's spec-triad commit (lands BEFORE chore-A per R21 ARCH MINOR-1).
**Authority:** `coordination/NEXT-ROLE.md` § R79 Round-scope directive (commit `c87bdfe`).
**Empirical premise (verified at session entry 2026-05-20 in this worktree):**
- `pnpm exec tsc -p tsconfig.test.json` → exit **0**.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → exit **0**, TAP summary `tests=580 / suites=3 / pass=570 / fail=6 / skipped=4`.
- Carry-forward fail set (6 ACs; pre-existing; R79 must NOT modify): AC-R36-21, AC-R36-30, AC-R36-31, `R65 WU-Phase3-3B Tessera→DS feed adapter`, `R66 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory`, AC-R77-17.

**Phase 4 SLICE 2 round 1 framing:** R79 begins the dashboard-polish slice. Per directive, R79 brings Tessera `demos/demo.html` toward DS-level structural richness (currently 9× smaller — Tessera 7,518 lines vs DeploySignal 67,880 lines reference). R79 targets ~50% of the structural gap (live verdict banner + front-panel split + provenance panel + structured per-window/per-detector/per-shard data); R80 closes the remaining gap (5-family detector visualization + visual identity pass) per the same § Phase 4 SLICE 2 framing block.

---

## § 0. Brainstorm (Superpowers Phase 1)

Three structural approaches were considered for integrating the three new UI elements (front-panel split with metrics + detectors, provenance panel, live verdict banner) into the existing R71 dashboard while preserving its IDs, classes, and test coverage.

### Approach A — ADDITIVE LAYOUT (append new sections; leave existing grid untouched)

Insert live-banner immediately after `#tessera-controls`; insert a new `#front-panel` container (metrics + detectors as flex children) BELOW the existing `#tessera-main` grid; insert a new `<details id="provenance-panel">` element at the bottom of the page. The existing `#tessera-main` 2-column grid (chart-panel + verdict-panel + audit/reasoning/next-actions) is untouched.

- **Strengths:** zero disruption to existing IDs, classes, CSS rules, or JS event listeners; R71 tests (AC-R71-12 / AC-R71-13 byte-identity over `demos/demo.html`) need updating only because the file grew, not because anything changed; lowest regression risk; cleanest backward-compat with the AC-R71-3 idempotency assertion (the byte-identity check still re-runs after R79 — Implementer regenerates outputs once, the new byte-identity baseline is the committed HTML).
- **Weaknesses:** page becomes more vertical (banner + main + front + provenance + bottom); does not exploit DS's horizontal-density pattern (DS uses a single front panel with two columns side-by-side, then a collapsible drawer below).
- **Hidden assumptions:** that R80 will close the remaining gap by introducing the drawer pattern + per-family visualization at that round (so R79 does not need to anticipate the drawer's containment-by-default semantics now).
- **Risks:** the page can feel verbose without R80's visual identity pass.

### Approach B — REPLACE LAYOUT (rewrite `#tessera-main` to DS-style front + drawer)

Restructure `#tessera-main` into DS's layout: `[live-banner] → [front-panel: metrics-panel | detectors-panel] → [drawer: provenance + reasoning + next-actions as collapsible sections] → [chart-panel as a separate region above or below]`. Existing IDs (`#verdict-panel`, `#audit-panel`, `#reasoning-panel`, `#next-actions-panel`) are repurposed: the bare badges-panel becomes the live-banner's verdict chip; the audit/reasoning/next-actions sections are moved INTO the drawer.

- **Strengths:** mirrors DS's structural pattern verbatim; tightest visual identity hit; one round closes ~80% of the structural gap.
- **Weaknesses:** large CSS + JS rewrite (drawer-toggle JS state, section-toggle JS state, hover popovers); high risk of subtly breaking AC-R71-13 byte-identity comparison; the drawer pattern introduces interactivity that is harder to test in static-render-only tests (would need to assert `<details>`-style elements or simulate clicks); R71's existing test expectations on `#verdict-panel` location may break; "drawer-toggle" interactions are exactly the kind of round-evolution-fragile pattern halt-condition 5 flags.
- **Hidden assumptions:** that R80 will continue the drawer pattern (no operator commitment to drawer structure at this point — directive says "5-family detector visualization + visual identity pass" for R80, which is neutral on layout container).
- **Risks:** anti-regression risk for AC-R71-12 / AC-R71-13; debugging drawer-toggle in browser without a test harness; spec-prescribed JS animation patterns can flip across browser engines without observable test failure.

### Approach C — HYBRID (PICKED) — keep existing IDs, add 3 new structural sections in DS-style positions, no drawer rewrite

Insert (a) `<section id="live-verdict-banner" class="live-banner">` between `#tessera-controls` and `#tessera-main`; (b) a new `<section id="front-panel" class="front">` containing `<div id="metrics-panel" class="metrics-panel">` (left) and `<div id="detectors-panel" class="detectors-panel">` (right) — positioned BELOW `#tessera-main` (not REPLACING it); (c) a `<details id="provenance-panel" class="provenance-panel">` element at the bottom of the body (collapsed by default). All R71 IDs preserved (`#verdict-panel`, `#audit-panel`, `#reasoning-panel`, `#next-actions-panel`); R71 tests' structural-element ACs remain valid because every R71-asserted element still exists; AC-R71-3 idempotency re-confirms after Implementer regenerates the HTML once (committed bytes become the new idempotency baseline).

- **Strengths:** preserves R71's working visual + test surface (backward-compat invariant); achieves ~50% of the DS structural gap per directive (3 new structural sections + structured per-window/per-detector/per-shard data fields); HTML `<details>` element gives expand/collapse semantics WITHOUT JS state machine — testable via the `open` attribute or by content-string presence; no JS hover-popover complexity; R80 can polish the front panel into a drawer-style layout WITHOUT having to rip out anything (the metrics + detectors panels just gain visual styling in R80).
- **Weaknesses:** more conservative than B; the dashboard remains visibly "two halves" rather than a unified DS-style layout — but that's a R80 polish concern, not R79's gap.
- **Hidden assumptions:** that the operator accepts a 2-round split (R79 structural delivery + R80 visual polish) rather than a single big-bang rewrite. The directive § Phase 4 SLICE 2 framing block CONFIRMS this 2-round split ("R79 targets ~50% of the structural gap; R80 finishes").
- **Risks:** none material — same risks as A (verbose page) plus zero risks from B. CSS Grid for the front panel + flexbox for the live banner are well-supported.

### Selection rationale

**Approach C picked.** It satisfies the directive's three structural deliverables (front-panel split + provenance panel + live verdict banner) WITHOUT disrupting R71's test surface, mirrors DS's structural positions (banner above front; front-panel split left/right) WITHOUT importing DS's drawer-toggle JS complexity, and preserves a clean polish surface for R80 (the bare panels become rich visual elements without structural rewrites). The schema-additivity invariant (R71 scenario JSON fields preserved verbatim; new fields additive only) is satisfied by extending the `ScenarioJson` interface with new fields rather than restructuring.

**What was rejected:**
- **A** rejected because it leaves the metrics + detectors as a stacked-below appendage rather than a true front-panel split — does not advance ~50% of the structural gap on its own.
- **B** rejected because (i) high regression risk on R71's AC-R71-12 / AC-R71-13; (ii) drawer-toggle JS state is a round-evolution-fragile pattern (halt-condition 5); (iii) operator's 2-round split confirms R79 should stop short of full DS-style replacement.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Demo dashboard HTML | `demos/demo.html` (R71; 7,518 lines) | — | extends: adds live-banner, front-panel split (metrics + detectors), provenance panel; CSS + JS additions; existing IDs preserved | — |
| Scenario JSON | `demos/scenarios/<name>.json` × 8 (R71) | — | extends: additive per-window per-detector summary; additive per-shard residual_proxy; additive top-level `detector_families`, `threshold_crossing_log`, `provenance_receipts` | — |
| Build tool | `tools/build-canned-demos.ts` (R71; 1,321 lines) | — | extends: `ScenarioJson` interface adds 3 top-level fields + 2 per-window fields; `composeScenarioJson` signature accepts new fields; `HTML_TEMPLATE_HEAD` adds CSS + DOM scaffolding; `HTML_TEMPLATE_FOOTER` adds DOM refs + render functions; each `runXRecording()` populates the new fields | — |
| Tests | `test/q71-demo-dashboard.test.ts` (R71; 182 lines; READ-ONLY at R79) | `test/q79-dashboard-structure.test.ts` (NEW; Tessera-original; target ~250-350 lines TS) | — | — |
| Package scripts | `package.json` (scripts block; R71 added `build:demos` + `prebuild:demos`) | — | (optional) — may add a `pretest:q79` entry if Implementer judges it useful; otherwise unchanged | — |
| README | `README.md` (R70-R72 Coverage / Quick demo section) | — | (optional) — Implementer may append ≤ 15 lines noting the new dashboard structural elements; not load-bearing | — |
| Spec triad | — | `coordination/specs/Q-R79-SPEC.md`, `Q-R79-SPEC-AUDIT.md`, `Q-R79-EMPIRICAL.sh` | — | — |
| Engine | ALL `engine/*` files FROZEN (Phase 3 anti-scope; halt condition 7 if any new dep required) | — | — | — |
| R70-R78 surfaces | `tools/demo-scenario.ts` (R70), `tools/coverage-saturation.ts` (R72), `tools/detector-envelope.ts` + `tools/detection-curve.ts` (R77), `tools/topology-walk-tuning.ts` (R78), all q01..q78 test files, all prior Q-RNN-SPEC.md files | — | — | — |

**Compiled-artifact note (R23 ARCH MINOR-2 — `.gitignore`-aware spec inventories):** `.js` files compiled from `.ts` sources (`tools/build-canned-demos.js`, `test/q71-demo-dashboard.test.js`, `test/q79-dashboard-structure.test.js`) are NOT git-tracked per the project's existing `.gitignore` `*.js` rule. They appear at build time but are absent from `git diff --name-only`. The ALLOWED_SET below (§ 3.2 + § 6.2) lists only `.ts` source files for the diff-check; the `.js` outputs are NOT diff-load-bearing. (Architect verified via `git ls-files tools/build-canned-demos.js test/q71-demo-dashboard.test.js` at session entry: zero output for `.js`, confirming the rule.)

### 1.2 Layout architecture (mandatory; Implementer prescribes exact CSS, Architect prescribes the structural skeleton)

The page DOM after R79 chore-A:

```
<body>
  <header id="tessera-header">…</header>
  <section id="tessera-controls">…</section>
  <section id="live-verdict-banner" class="live-banner">     ← NEW (R79)
    <span class="live-scenario" id="live-scenario-name">…</span>
    <span class="live-tick" id="live-tick-indicator">…</span>
    <span class="live-verdict" id="live-verdict-status">…</span>
  </section>
  <main id="tessera-main">                                    ← EXISTING (R71; UNCHANGED)
    <section id="chart-panel">…</section>
    <section id="verdict-panel">…</section>
    <section id="audit-panel">…</section>
    <section id="reasoning-panel">…</section>
    <section id="next-actions-panel">…</section>
  </main>
  <section id="front-panel" class="front">                    ← NEW (R79)
    <div id="metrics-panel" class="metrics-panel">
      <h2 class="panel-h">Per-shard signals</h2>
      <div id="metrics-body"></div>                          (populated by JS)
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
  <details id="provenance-panel" class="provenance-panel">    ← NEW (R79)
    <summary class="provenance-summary">Provenance — per-firing receipts (click to expand)</summary>
    <div id="provenance-body"></div>                          (populated by JS)
  </details>
  <!-- BEGIN-TESSERA-SCENARIO-DATA --> … <!-- END-TESSERA-SCENARIO-DATA -->
  <script>…</script>
</body>
```

**Implementer prescriptions (chosen here; not deferred):**
- The `<details>` element starts COLLAPSED (no `open` attribute). The render path does NOT add `open` programmatically; users click `<summary>` to expand.
- Each `det-fam` row uses class `det-fam-A` / `det-fam-B` / `det-fam-C` / `det-fam-D` / `det-fam-E` exactly (lowercase letter is the family code). Family B/C/D/E rows also carry class `det-fam-placeholder` to allow R80 to drop the placeholder treatment in one CSS pass.
- Live-banner sub-elements have stable IDs `live-scenario-name`, `live-tick-indicator`, `live-verdict-status` (kebab-case; same pattern as `window-indicator` from R71).
- Live verdict status states: `"clean"` (no firings yet), `"firing"` (≥ 1 shard fired this window), `"common-mode"` (≥ 1 common-mode candidate active this window), `"frozen"` (freeze hook active this window), `"fdr-selected"` (terminal window AND `fdr_selected_indices` non-empty), `"baseline"` (window 0 default). Implementer derives status per-tick via the per-window data; the precedence order is: `frozen` > `common-mode` > `fdr-selected` > `firing` > `baseline`. (Why this order: a frozen window suppresses everything downstream; common-mode aggregates over firings; FDR selection is a terminal-only signal applied AFTER everything else.)
- The render function name `updateLiveVerdictBanner(scenarioData, windowIdx)` is prescribed verbatim (used by AC-R79-2's function-name presence check; cite-then-verify per R74 MINOR-5 self-consistency).
- The render function name `renderMetricsPanel(scenarioData, windowIdx)` is prescribed verbatim.
- The render function name `renderDetectorsPanel(scenarioData, windowIdx)` is prescribed verbatim.
- The render function name `renderProvenancePanel(scenarioData)` is prescribed verbatim.
- The existing `render()` calls all 4 new functions in addition to the R71 calls (drawFrame, renderBadges, updateWindowIndicator). Order: `updateLiveVerdictBanner()` → existing R71 calls → `renderMetricsPanel()` → `renderDetectorsPanel()` → `renderProvenancePanel()`. (Why this order: live banner is a top-of-page summary; existing chart + badges render the visualization; metrics + detectors panels are sourced from the new per-window data; provenance is a static panel populated once when the scenario loads — included in render() for simplicity, not because it changes per-tick.)

### 1.3 Schema additions to scenario JSON (typed)

**Top-level (new — additive to R71's 9 existing top-level fields):**

```typescript
// NEW (R79; additive to ScenarioJson)
detector_families: ReadonlyArray<'A' | 'B' | 'C' | 'D' | 'E'>;
// Enumerates exercised detector families. For scenarios using betting e-process
// (clean-baseline, sdc-drift, fdr-multiple-testing, hierarchical-evalue):
// ['A']. For scenarios using only attribution/freeze surfaces (common-mode-rack,
// event-conditional, sparse-data-resilience, topology-spanning-common-mode):
// [] (empty — not a per-shard statistical detector family).

threshold_crossing_log: ReadonlyArray<{
  window: number;          // 0-indexed tick index where crossing occurred
  shard_id: string;        // exact shard_id literal (matches per_shard[].shard_id)
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  M_t_at_crossing: number; // wealth value at the crossing window
  threshold: number;       // the 1/α threshold value (200 for DEMO_ALPHA=5e-3)
}>;
// One entry per (shard, family) FIRST crossing per scenario run. Empty for
// scenarios that do not exercise per-shard statistical detectors.

provenance_receipts: ReadonlyArray<{
  event_id: string;        // unique receipt id, e.g. 'r79-prov-sdc-drift-001'
  window: number;          // window index where the firing was observed
  shard_id: string;
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  reasoning: string;       // human-readable explanation (≥ 30 chars)
  evidence: Record<string, unknown>;
                            // structured machine-readable evidence:
                            // { M_t, threshold, alpha, ville_bound } for Family A
                            // additional fields for future R80 families
}>;
// Pre-computed at build time. One receipt per terminal-firing-shard for
// Family-A scenarios. Empty for scenarios with zero terminal firings.
```

**Per-window additions (new — additive to R71's existing `{t, per_shard, events}` triple):**

```typescript
per_window_detectors: {
  family_a: {
    shards_fired_count: number;       // count where per_shard[i].fired === true
    max_M_t: number | null;           // max M_t across shards this window; null if all M_t null
    fired_shard_ids: ReadonlyArray<string>;  // sorted list of shard_ids with fired===true
  } | null;
  family_b: null;       // R80 placeholder; explicitly null in R79
  family_c: null;       // R80 placeholder
  family_d: null;       // R80 placeholder
  family_e: null;       // R80 placeholder
};
// family_a is non-null for scenarios with detector_families includes 'A'; null
// for scenarios with empty detector_families. The four B/C/D/E placeholders are
// ALWAYS present (key + null value) to lock the schema shape for R80 expansion.
```

**Per-shard additions (new — additive to R71's existing `{shard_id, M_t, fired}` triple):**

```typescript
residual_proxy: number | null;
// Per-shard signal departure from baseline. For Family-A scenarios:
//   residual_proxy = M_t === null ? null : (M_t - 1)
// For non-Family-A scenarios (where M_t is always null): residual_proxy = null.
//
// SEMANTIC NOTE — non-overclaim (R66 MINOR-1 reinforcement):
//   This field is a VISUAL PROXY for per-shard drift. It is NOT the engine
//   `PerShardResidual` struct from engine/per-shard/warm-start.ts, which is a
//   stateful multi-field object. The proxy is mathematically interpretable as
//   the per-shard "excess wealth" under the betting e-process martingale
//   (E[M_t] = 1 under H₀; M_t - 1 is the per-shard accumulated departure).
//   Naming is `residual_proxy` (not `residual`) to make the simplification
//   explicit. R80 may add a separate field for the engine PerShardResidual
//   struct without colliding.
```

**Backward-compatibility invariant (load-bearing):**

The R71 scenario JSON shape — `{schema_version: 'tessera-demo-v1', scenario, description, params, engine_surfaces, windows: [{t, per_shard: [{shard_id, M_t, fired}], events}], terminal_state, reasoning, suggested_actions}` — MUST remain present verbatim. Every R71-defined field name, type, and position is preserved. New fields are additive at every level (top-level, per-window, per-shard).

The `schema_version` literal stays `'tessera-demo-v1'` (NOT bumped to `'v2'`). Rationale: R71's check `assert.equal(j.schema_version, 'tessera-demo-v1')` (q71 test:30) MUST still pass. The shape extension is additive; the version literal does not need to change because no R71 field's type was widened to a strict superset. R80 may bump the version if needed; R79 does not.

### 1.4 Architect pre-prediction matrix (chore-A binding-command counts)

For Block 1, Block 3, and Block 4 of `Q-R79-EMPIRICAL.sh` — the Implementer's chore-A attestation in NEXT-ROLE.md MUST encode ACTUAL observed values, NEVER these predictions (R26 MAJOR-1, R72 CRITICAL-1, R77 lessons). The predictions exist so the Implementer can verify in-session that nothing surprising happened.

| Block | Quantity | At round-start HEAD (`c87bdfe`; verified) | Predicted at R79 chore-A (chosen by Architect) |
|---|---|---|---|
| Block 1 | `pnpm exec tsc -p tsconfig.test.json` exit code | **0** (verified) | **0** (Implementer's TS additions must compile clean; AC-R79-12 binds the observed exit code) |
| Block 3 | `pnpm exec node --test --test-reporter=tap test/*.test.js` exit code | **0** | **0** (the carry-forward 6 fails do not flip the node-process exit code because individual subtests can fail without exiting node-process non-zero; R78 baseline confirms this) |
| Block 3 | TAP `# tests` | **580** | **594** (= 580 + 14 new R79 test cases) |
| Block 3 | TAP `# pass` | **570** | **583** (= 570 + 14 R79 new ACs all pass − 1 for AC-R78-14 expected flip; see § 1.4-note below) |
| Block 3 | TAP `# fail` | **6** | **7** (= 6 carry-forward + 1 for AC-R78-14 expected flip) |
| Block 3 | TAP `# skipped` | **4** | **4** (unchanged) |
| Block 4 | `git diff c87bdfe HEAD --name-only` line count | 0 | **9-15** depending on whether Implementer touches `package.json` and `README.md` (both optional per § 1.1) |

**§ 1.4-note — AC-R78-14 forward-protection flip (predicted; documented per encode-actual-results-verbatim discipline):**

R78's `Q-R78-EMPIRICAL.sh` Block 4 anti-scope regex (lines verified at session entry 2026-05-20 in `coordination/specs/Q-R78-EMPIRICAL.sh`) enumerates exactly the R78-specific path patterns + CLAUDE-*.md + NEXT-ROLE.md + MEMORIAL.md + `coordination/logs/ROUND-R78-*.md` + `coordination/diagnostics/DIAGNOSTIC-R78-*.md`. It does NOT include the regex alternatives `coordination/specs/Q-R79-*`, `test/q79-*.test.ts`, `demos/.*`, `tools/build-canned-demos\.ts`, `coordination/logs/ROUND-R79-*.md`, `coordination/reviews/REVIEWER-REPORT-R79.md`. When R79 chore-A lands, `git diff 3d00490 HEAD --name-only` (R78's ROUND_START_SHA) will include the R79-introduced paths; AC-R78-14 (which asserts `diff ⊆ R78_ALLOWED_SET`) WILL FLIP from PASS to FAIL.

This is the SAME forward-protection failure mode as AC-R77-17 (already failing in the carry-forward set at round-start). It is NOT a regression introduced by R79's substantive work; it is structural drift from R78's narrower regex. The carry-forward fail count grows by 1 (6 → 7) at R79 chore-A by construction. R79 MUST NOT modify R78's spec triad (anti-scope: R73-R78 deliverables frozen). The Implementer attests OBSERVED counts; if the observed `fail` count is anything other than 7, the Implementer HALTs and writes a DIAGNOSTIC.

R79's own AC-R79-14 (anti-scope diff ⊆ R79_ALLOWED_SET) uses a forward-protective regex that pre-includes broad patterns (`coordination/logs/ROUND-R[0-9]+-(?:SUMMARY|ROUTING)\.md`, `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md`, CLAUDE-*.md, etc.) to delay the AC-R79-14 → AC-R80-flip at R80 chore-A. See § 3.2 ALLOWED_SET regex.

### 1.5 Failure modes at integration points

1. **JSON parse failure on browser load** — if the new fields' types mismatch the browser-side render code, `JSON.parse` succeeds (the JSON is well-formed) but `renderMetricsPanel` etc. throw at runtime. _Mitigation_: AC-R79-7/8/9 assert top-level + per-window + per-shard field types in `test/q79-dashboard-structure.test.ts` BEFORE the dashboard ever loads in a browser. _Halt_: not applicable; this is caught at test time.
2. **Empty `per_window_detectors.family_a` for non-Family-A scenarios** — `renderDetectorsPanel` must short-circuit `family_a === null` and render the placeholder text "(Family A not exercised in this scenario)" rather than crashing on `.fired_shard_ids.length`. _Mitigation_: spec prescribes the null-guard in the pseudocode (§ 4.2); AC-R79-4 asserts the 5 placeholder rows exist in committed HTML regardless of scenario data.
3. **Live verdict banner status precedence** — without a fixed precedence, `frozen` + `common-mode` simultaneously could render either; ambiguous. _Mitigation_: § 1.2 fixes precedence verbatim: `frozen` > `common-mode` > `fdr-selected` > `firing` > `baseline`.
4. **`<details>` element open-state at test time** — `<details>` element's `open` attribute is absent in committed HTML (collapsed by default). AC-R79-5 must assert `<details ... id="provenance-panel"` and that `' open'` is NOT in that element's tag (i.e., the HTML literal does NOT have an `open` attribute on the `<details>` opening tag). _Mitigation_: AC pseudocode uses a regex anchored to the opening `<details>` tag's attribute set (verified by Architect to discriminate between "collapsed `<details>`" and "open `<details>`").
5. **R71 byte-identity tests fail because demo.html changed** — R71 AC-R71-3 (idempotency re-run) asserts the regenerated HTML matches the COMMITTED HTML byte-for-byte. After Implementer regenerates outputs at R79 chore-A, the COMMITTED HTML changes (R79's new structure); subsequent re-run produces the same R79 HTML (still byte-identical). AC-R71-3 thus still PASSES. _Mitigation_: this is intrinsic to AC-R71-3's design; no special handling needed.
6. **R71 AC-R71-12 / AC-R71-13 still pass** — those ACs assert structural elements + per-scenario JSON round-trip in the committed HTML; R79 adds elements (does not remove any), so the original assertions remain satisfied. _Mitigation_: § 1.1 component inventory confirms zero R71 elements deleted; § 1.2 layout architecture preserves all R71 IDs.
7. **`updateLiveVerdictBanner` is testable only structurally at chore-A** — a STATIC HTML+JSON test cannot simulate "the banner updates per tick" without a DOM harness. _Mitigation_: AC-R79-2 binds to the FUNCTION-NAME presence in embedded JS (`grep "function updateLiveVerdictBanner"` in the committed HTML); the per-tick behavior is acknowledged as a manual-verification gap in § 5.3 with the mitigation that the function is called from `render()` (testable via grep) and `render()` is called from `tick()` (testable via grep) — chained presence asserts the wiring.
8. **`provenance_receipts` arity is round-evolution-fragile** — predicting "exactly N receipts" for a scenario could shift if any scenario's seed or threshold changes in a future round. _Mitigation_: AC-R79-6 binds to the DISCRIMINATING ASYMMETRY ("SDC-drift ≥ 1 receipt; clean-baseline = 0 receipts") rather than exact counts. The asymmetry survives PRNG drift unless the SDC scenario stops firing entirely (which would also break AC-R71-5 — caught upstream).
9. **EMPIRICAL.sh probe-run at round-start HEAD** — per R77 OBS-4 reinforcement, the Architect runs Q-R79-EMPIRICAL.sh against `c87bdfe` (round-start) to verify each block's diagnostic emits cleanly. At round-start: Block 1 PASS (tsc exit 0), Block 2 FAIL (the 5 R79 artifacts do not yet exist — this is expected pre-implementation state, not a spec defect), Block 3 FAIL (q79 test file absent — expected), Block 4 PASS (no diff yet vs round-start). Block 2's pre-implementation FAIL is the load-bearing "RED" state at chore-A's RED-commit predecessor.

---

## § 2. Mechanism — load-bearing architectural decisions (Architect-chosen, not deferred)

### 2.1 Layout preservation invariant

The R71 dashboard layout (`#tessera-controls` → `#tessera-main`) is preserved EXACTLY at byte level for all existing IDs, classes, and the `#tessera-main` grid template. R79 inserts three NEW sections at strategic positions (between controls and main; below main; at body-bottom). Why: backward-compat with R71 tests (AC-R71-12 structural-element check + AC-R71-13 round-trip JSON parse + AC-R71-3 idempotency) requires zero structural removal.

### 2.2 Schema additivity invariant

Every new field on `ScenarioJson` is additive: top-level (3 new fields), per-window (1 new field at the window-level + 0 new fields on `events`), per-shard (1 new field per `per_shard[]` entry). No existing field is removed, renamed, or has its type narrowed. Why: R71's AC-R71-2 enumerates every existing field type assertion; widening or removing breaks the test. Additive extension is the only schema-safe option in a 1-round delivery.

### 2.3 Residual proxy non-overclaim

The new per-shard field is named `residual_proxy` (not `residual`) and documented as "M_t - 1 for Family A scenarios; null otherwise. NOT the engine `PerShardResidual` struct." Why: the directive uses the word "residual" semantically, but adopting it verbatim as a field name would semantically overclaim per R66 MINOR-1 reinforcement (a field name asserts a stronger contract than M_t - 1 satisfies). The `_proxy` suffix makes the simplification visible at every consumer site. R80 may add a separate `residual_state: PerShardResidual` field without collision.

### 2.4 Provenance receipts: pre-computed at build time; rendered via `<details>`

`provenance_receipts` is computed inside each `runXRecording()` function at build time (NOT at browser render time). The browser-side `renderProvenancePanel()` only reads the pre-computed array and creates DOM elements. The container is a `<details>` element (collapsed by default) — no JS state machine needed for expand/collapse. Why: pre-computation gives deterministic output that AC-R71-3 byte-identity check covers; `<details>` is a native HTML element well-supported in all evergreen browsers; complex JS state machines would be round-evolution-fragile per halt-condition 5.

### 2.5 Live banner: per-tick update via existing `render()` loop

`updateLiveVerdictBanner(scenarioData, windowIdx)` is called from the EXISTING `render()` function (R71 line 1197-1206 of `tools/build-canned-demos.ts` HTML_TEMPLATE_FOOTER). The existing `tick()` function (R71 line 1208-1219) calls `render()` once per interval-step; therefore the banner naturally updates per tick without any new interval logic. Why: piggybacking on the existing render() / tick() loop minimizes JS surface; no new state, no new intervals; the wiring is testable via grep for the function names.

### 2.6 Detector-panel placeholder discipline

The detectors panel renders 5 family rows (`det-fam-A` through `det-fam-E`) in committed HTML, with `det-fam-B`/`C`/`D`/`E` also carrying class `det-fam-placeholder`. Only Family A receives data-driven content in R79; B/C/D/E rows display static "(R80)" text. Why: locking the 5-row structure NOW (with placeholders) lets R80 introduce the per-family visualizations as DATA additions only — no further structural HTML changes needed at R80. This forward-compat discipline matches the directive's R80 framing ("5-family detector visualization + visual identity pass").

---

## § 3. Component inventory + ALLOWED_SET

### 3.1 Component table

(See § 1.1 for the full table.) Summary:

- 1 NEW test file (`test/q79-dashboard-structure.test.ts`)
- 1 NEW spec-triad file set (`coordination/specs/Q-R79-SPEC.md` + `Q-R79-SPEC-AUDIT.md` + `Q-R79-EMPIRICAL.sh`)
- 3 EXISTING files modified (`demos/demo.html`, `tools/build-canned-demos.ts`, `demos/scenarios/*.json` × 8 — regenerated)
- 2 OPTIONALLY-modified files (`package.json`, `README.md` — Implementer decides)
- 4 process-coordination files modified (`coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md`, `coordination/reviews/REVIEWER-REPORT-R79.md` (Reviewer), `coordination/logs/ROUND-R79-*.md`)
- 0 deletions

### 3.2 ALLOWED_SET (anti-scope diff at chore-A; binding for AC-R79-14)

The anti-scope AC binds `git diff $ROUND_START_SHA HEAD --name-only` to be a SUBSET of the following regex (machine-checkable by Q-R79-EMPIRICAL.sh Block 4):

```
^(\
demos/demo\.html|\
demos/scenarios/[a-z-]+\.json|\
tools/build-canned-demos\.ts|\
package\.json|\
README\.md|\
test/q79-dashboard-structure\.test\.ts|\
coordination/specs/Q-R79-SPEC\.md|\
coordination/specs/Q-R79-SPEC-AUDIT\.md|\
coordination/specs/Q-R79-EMPIRICAL\.sh|\
coordination/NEXT-ROLE\.md|\
coordination/MEMORIAL\.md|\
coordination/MEMORIAL-PHASE-[0-9]+\.md|\
coordination/reviews/REVIEWER-REPORT-R79\.md|\
coordination/logs/ROUND-R[0-9]+-(?:SUMMARY|ROUTING)\.md|\
coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|\
CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md\
)$
```

(The actual EMPIRICAL.sh inlines this as a single non-multiline ERE; the above is the canonical form for human review.)

Forward-protection (R66/R77 lesson; § 1.4-note context):
- `coordination/logs/ROUND-R[0-9]+-(?:SUMMARY|ROUTING)\.md` accepts R80+ log filenames.
- `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` accepts future diagnostic filenames.
- `coordination/MEMORIAL-PHASE-[0-9]+\.md` accepts future phase-shard rollovers (per CLAUDE-COMMON.md § Memorial sharding).
- All 6 CLAUDE-*.md files plus the loader `CLAUDE.md` are pre-included.

---

## § 4. Per-file pseudocode

### 4.1 `tools/build-canned-demos.ts` extension

**Interface additions (after line 94 — the existing `ScenarioJson` interface body):**

```typescript
// Existing R71 fields (KEEP VERBATIM):
//   schema_version, scenario, description, params, engine_surfaces,
//   windows, terminal_state, reasoning, suggested_actions

// NEW R79 top-level fields:
detector_families: ReadonlyArray<'A' | 'B' | 'C' | 'D' | 'E'>;
threshold_crossing_log: ReadonlyArray<{
  window: number;
  shard_id: string;
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  M_t_at_crossing: number;
  threshold: number;
}>;
provenance_receipts: ReadonlyArray<{
  event_id: string;
  window: number;
  shard_id: string;
  family: 'A' | 'B' | 'C' | 'D' | 'E';
  reasoning: string;
  evidence: Record<string, unknown>;
}>;
```

**WindowEntry interface extension (after line 67):**

```typescript
// Existing R71 fields (KEEP):
//   t, per_shard, events

// NEW R79 per-window field:
per_window_detectors: {
  family_a: {
    shards_fired_count: number;
    max_M_t: number | null;
    fired_shard_ids: ReadonlyArray<string>;
  } | null;
  family_b: null;
  family_c: null;
  family_d: null;
  family_e: null;
};
```

**PerShardWindow interface extension (after line 62):**

```typescript
// Existing R71 fields (KEEP):
//   shard_id, M_t, fired

// NEW R79 per-shard field:
residual_proxy: number | null;
```

**`composeScenarioJson` extension (line 127):** add 3 new params (`detector_families`, `threshold_crossing_log`, `provenance_receipts`) to the args object and to the return object. Default any not-provided to `[]`.

**Per-scenario population (each `runXRecording()` function):**

```typescript
// For Family-A scenarios (clean-baseline, sdc-drift, fdr-multiple-testing,
// hierarchical-evalue), inside the existing per-window loop after computing
// states[s].M:
//
// const perWindowDetectors = {
//   family_a: {
//     shards_fired_count: states.filter(st => st.M >= DEMO_THRESHOLD).length,
//     max_M_t: round6(Math.max(...states.map(st => st.M))),
//     fired_shard_ids: states.map((st, s) => st.M >= DEMO_THRESHOLD ? shardIds[s] : null)
//                            .filter((x): x is string => x !== null).sort(),
//   },
//   family_b: null, family_c: null, family_d: null, family_e: null,
// };
//
// per_shard entries gain:
//   residual_proxy: states[s].M === null ? null : round6(states[s].M - 1)
//
// windows.push({ ..., per_window_detectors: perWindowDetectors });
//
// After the loop, compute threshold_crossing_log by replaying windows looking
// for the first window where each shard's M_t crossed DEMO_THRESHOLD; one entry
// per (shard, family) FIRST crossing.
//
// Compute provenance_receipts: one entry per terminal-firing shard:
//   {
//     event_id: `r79-prov-${scenario}-${i + 1}`,
//     window: <terminal window or crossing window>,
//     shard_id: <firing shard_id>,
//     family: 'A',
//     reasoning: `Shard ${shard_id} accumulated wealth M_t = ${terminalM_t} at window ${terminalW},
//                 crossing the 1/α = ${DEMO_THRESHOLD} threshold. Under H₀, Pr(M_t ≥ 1/α) ≤ α = ${DEMO_ALPHA}
//                 by Ville's inequality on the betting e-process martingale.`,
//     evidence: { M_t: terminalM_t, threshold: DEMO_THRESHOLD, alpha: DEMO_ALPHA,
//                 ville_bound: 'Pr(M_t ≥ 1/α) ≤ α under H_0' },
//   }
//
// For non-Family-A scenarios (common-mode-rack, event-conditional,
// sparse-data-resilience, topology-spanning-common-mode):
//   detector_families: []
//   threshold_crossing_log: []
//   provenance_receipts: []
//   per_window_detectors.family_a = null (B/C/D/E always null)
//   per_shard[].residual_proxy = null (M_t was already null per R71)
```

**HTML_TEMPLATE_HEAD CSS additions (after the existing `#next-actions-list li` rule):**

```css
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
.metric-row .metric-name  { color: #e6edf3; }
.metric-row .metric-mt    { color: #58a6ff; text-align: right; }
.metric-row .metric-residual { color: #8b949e; text-align: right; }
.det-fam { padding: 8px 10px; margin-bottom: 6px; border: 1px solid #30363d; border-radius: 4px; background: #161b22; font-size: 0.78rem; }
.det-fam-placeholder { color: #6e7681; font-style: italic; }
.det-fam-A { border-left: 3px solid #58a6ff; }
.det-fam-B { border-left: 3px solid #3fb950; }
.det-fam-C { border-left: 3px solid #a371f7; }
.det-fam-D { border-left: 3px solid #d29922; }
.det-fam-E { border-left: 3px solid #f78166; }

/* R79: provenance panel */
#provenance-panel { padding: 16px 24px; border-top: 1px solid #30363d; }
#provenance-panel summary { cursor: pointer; font-size: 0.9rem; color: #8b949e; padding: 4px 0; }
#provenance-panel summary:hover { color: #e6edf3; }
.provenance-receipt { padding: 10px 12px; margin: 8px 0; background: #161b22; border-left: 3px solid #58a6ff; border-radius: 4px; font-size: 0.78rem; }
.provenance-receipt .pr-header { color: #e6edf3; font-weight: 500; margin-bottom: 4px; }
.provenance-receipt .pr-reasoning { color: #c9d1d9; line-height: 1.5; margin-bottom: 6px; }
.provenance-receipt .pr-evidence { color: #8b949e; font-family: 'SF Mono', Menlo, monospace; font-size: 0.72rem; }
```

**HTML_TEMPLATE_HEAD structural insertion (between `</section>` for `#tessera-controls` and `<main id="tessera-main">`):**

```html
  <section id="live-verdict-banner" class="live-banner">
    <span class="live-label">Scenario</span>
    <span id="live-scenario-name">—</span>
    <span class="live-label">Tick</span>
    <span id="live-tick-indicator">—</span>
    <span id="live-verdict-status" class="status-baseline">baseline</span>
  </section>
```

**HTML_TEMPLATE_HEAD structural insertion (between `</main>` for `#tessera-main` and the `<!-- BEGIN-TESSERA-SCENARIO-DATA -->` sentinel):**

```html
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
```

**HTML_TEMPLATE_FOOTER JS additions (inside the existing IIFE):**

```javascript
  // R79: new DOM refs (add after the existing var declarations)
  var liveBannerScenarioEl = document.getElementById('live-scenario-name');
  var liveBannerTickEl     = document.getElementById('live-tick-indicator');
  var liveBannerStatusEl   = document.getElementById('live-verdict-status');
  var metricsBodyEl        = document.getElementById('metrics-body');
  var detectorsBodyEl      = document.getElementById('detectors-body');
  var provenanceBodyEl     = document.getElementById('provenance-body');

  // R79: derive verdict status per (scenario, windowIdx)
  function deriveVerdictStatus(scenarioData, windowIdx) {
    if (!scenarioData.windows.length) return 'baseline';
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    var ts = scenarioData.terminal_state;

    // Precedence: frozen > common-mode > fdr-selected > firing > baseline
    if (ts.freeze_active && wIdx >= scenarioData.windows.length - 1) return 'frozen';
    // Per-window freeze: check events for ds_event_received in this/prior windows
    for (var i = 0; i <= wIdx; i++) {
      for (var j = 0; j < scenarioData.windows[i].events.length; j++) {
        var ev = scenarioData.windows[i].events[j];
        if (ev && ev.type === 'residual_update' && ev.freeze_active === true) return 'frozen';
      }
    }
    // Common-mode at terminal
    if (ts.common_mode_candidates && ts.common_mode_candidates.length > 0
        && wIdx >= scenarioData.windows.length - 1) return 'common-mode';
    // FDR terminal
    if (ts.fdr_selected_indices && ts.fdr_selected_indices.length > 0
        && wIdx >= scenarioData.windows.length - 1) return 'fdr-selected';
    // Firing this window
    for (var s = 0; s < w.per_shard.length; s++) {
      if (w.per_shard[s].fired === true) return 'firing';
    }
    if (wIdx === 0) return 'baseline';
    return 'clean';
  }

  function updateLiveVerdictBanner(scenarioData, windowIdx) {
    if (!scenarioData) return;
    liveBannerScenarioEl.textContent = scenarioData.scenario;
    var totalW = scenarioData.windows.length;
    liveBannerTickEl.textContent = windowIdx + ' / ' + (totalW - 1);
    var status = deriveVerdictStatus(scenarioData, windowIdx);
    liveBannerStatusEl.textContent = status;
    liveBannerStatusEl.className = 'status-' + status;
  }

  function renderMetricsPanel(scenarioData, windowIdx) {
    metricsBodyEl.innerHTML = '';
    if (!scenarioData.windows.length) return;
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    for (var s = 0; s < w.per_shard.length; s++) {
      var ps = w.per_shard[s];
      var row = document.createElement('div');
      row.className = 'metric-row';
      var n  = document.createElement('span'); n.className = 'metric-name';     n.textContent = ps.shard_id;
      var m  = document.createElement('span'); m.className = 'metric-mt';       m.textContent = ps.M_t === null ? '—' : ps.M_t.toFixed(3);
      var rp = document.createElement('span'); rp.className = 'metric-residual'; rp.textContent = ps.residual_proxy === null ? '—' : ps.residual_proxy.toFixed(3);
      row.appendChild(n); row.appendChild(m); row.appendChild(rp);
      metricsBodyEl.appendChild(row);
    }
  }

  function renderDetectorsPanel(scenarioData, windowIdx) {
    // detectorsBodyEl is committed with 5 static rows; R79 only updates Family A
    var famAEl = detectorsBodyEl.querySelector('.det-fam-A');
    if (!famAEl) return;
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    var pwd = w && w.per_window_detectors ? w.per_window_detectors.family_a : null;
    if (pwd === null || pwd === undefined) {
      famAEl.textContent = 'Family A — (not exercised in this scenario)';
    } else {
      famAEl.textContent = 'Family A — fired ' + pwd.shards_fired_count + ' shards; max M_t = ' + (pwd.max_M_t === null ? '—' : pwd.max_M_t.toFixed(3));
    }
  }

  function renderProvenancePanel(scenarioData) {
    provenanceBodyEl.innerHTML = '';
    var receipts = scenarioData.provenance_receipts || [];
    if (receipts.length === 0) {
      var p = document.createElement('p');
      p.style.color = '#8b949e';
      p.style.fontSize = '0.85rem';
      p.textContent = '(no firings in this scenario)';
      provenanceBodyEl.appendChild(p);
      return;
    }
    for (var i = 0; i < receipts.length; i++) {
      var r = receipts[i];
      var card = document.createElement('div');
      card.className = 'provenance-receipt';
      var h = document.createElement('div'); h.className = 'pr-header';   h.textContent = '[' + r.event_id + '] ' + r.shard_id + ' · Family ' + r.family + ' · window ' + r.window;
      var rs = document.createElement('div'); rs.className = 'pr-reasoning'; rs.textContent = r.reasoning;
      var ev = document.createElement('pre'); ev.className = 'pr-evidence'; ev.textContent = JSON.stringify(r.evidence, null, 2);
      card.appendChild(h); card.appendChild(rs); card.appendChild(ev);
      provenanceBodyEl.appendChild(card);
    }
  }
```

**`render()` modification (existing line 1197-1206):** add 4 calls before the existing block, and one provenance-rerender call when loadScenario fires (in `loadScenario` after `clearPanels()`):

```javascript
  function render() {
    var scenarioData = scenarios[currentName];
    if (!scenarioData) return;
    updateLiveVerdictBanner(scenarioData, currentWindowIdx);
    drawFrame(scenarioData, currentWindowIdx);
    renderBadges(scenarioData, currentWindowIdx);
    updateWindowIndicator(scenarioData);
    renderMetricsPanel(scenarioData, currentWindowIdx);
    renderDetectorsPanel(scenarioData, currentWindowIdx);
    if (currentWindowIdx >= scenarioData.windows.length - 1) {
      renderReasoningAndActions(scenarioData);
    }
  }

  function loadScenario(name) {
    stopPlay();
    currentName = name;
    currentWindowIdx = 0;
    clearPanels();
    var scenarioData = scenarios[currentName];
    if (scenarioData) renderProvenancePanel(scenarioData);
    render();
  }
```

**`clearPanels()` extension:** add `metricsBodyEl.innerHTML = ''` and reset Family A detector text to a placeholder; do NOT clear `provenanceBodyEl` here (rendered in `loadScenario` after `clearPanels()`).

### 4.2 `demos/demo.html` is REGENERATED from the build tool

The Implementer does NOT edit `demos/demo.html` by hand; running `pnpm exec node tools/build-canned-demos.js` regenerates it from `HTML_TEMPLATE_HEAD` + scenario data + `HTML_TEMPLATE_FOOTER`. (Same pattern as R71: changes to the dashboard happen via the template literals in the build tool.)

### 4.3 `test/q79-dashboard-structure.test.ts` (NEW; 14 ACs)

```typescript
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

// AC-R79-2: live banner has an updateLiveVerdictBanner function called from render()
test('AC-R79-2: embedded JS defines updateLiveVerdictBanner and calls it from render()', () => {
  const html = readDemoHtml();
  assert.match(html, /function\s+updateLiveVerdictBanner\s*\(/);
  // render() must invoke updateLiveVerdictBanner (string-presence asserts the wiring)
  assert.match(html, /function\s+render\s*\([\s\S]*?updateLiveVerdictBanner\s*\(/);
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
  for (const fam of ['A','B','C','D','E']) {
    const re = new RegExp(`<div[^>]*\\bclass="[^"]*det-fam-${fam}[\\s"]`);
    assert.match(html, re, `det-fam-${fam} row not found`);
  }
  // B/C/D/E carry placeholder class
  for (const fam of ['B','C','D','E']) {
    const re = new RegExp(`<div[^>]*\\bclass="[^"]*det-fam-${fam}[^"]*det-fam-placeholder`);
    assert.match(html, re, `det-fam-${fam} missing det-fam-placeholder class`);
  }
});

// AC-R79-5: provenance panel is a <details> element, collapsed by default
test('AC-R79-5: provenance panel is <details id="provenance-panel"> WITHOUT an `open` attribute', () => {
  const html = readDemoHtml();
  // Match the opening <details ...> tag for #provenance-panel
  const m = html.match(/<details\b([^>]*)\bid="provenance-panel"([^>]*)>/);
  assert.ok(m, '<details id="provenance-panel"> not found');
  const attrs = (m[1] + m[2]);
  assert.ok(!/\bopen\b/.test(attrs), 'provenance-panel should NOT have `open` attribute (collapsed by default)');
  assert.match(html, /\bid="provenance-body"/);
});

// AC-R79-6: SDC-drift scenario has ≥ 1 provenance receipt; clean-baseline has 0 (discriminating asymmetry)
test('AC-R79-6: provenance_receipts arity is discriminating (sdc-drift ≥ 1; clean-baseline = 0)', () => {
  const sdc = readScenarioJson('sdc-drift');
  const cb  = readScenarioJson('clean-baseline');
  assert.ok(Array.isArray(sdc.provenance_receipts));
  assert.ok(Array.isArray(cb.provenance_receipts));
  assert.ok(sdc.provenance_receipts.length >= 1, 'sdc-drift must have ≥ 1 receipt');
  assert.equal(cb.provenance_receipts.length, 0, 'clean-baseline must have 0 receipts');
  // Each receipt has the required shape
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

// AC-R79-8: every per_window has per_window_detectors with 5 family keys (A non-null when scenario uses Family A; B/C/D/E always null)
test('AC-R79-8: per_window_detectors has 5 family keys; family_a non-null iff "A" in detector_families', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    const hasA = j.detector_families.includes('A');
    for (const w of j.windows) {
      assert.ok(w.per_window_detectors, `${name} w=${w.t}: per_window_detectors absent`);
      const pwd = w.per_window_detectors;
      assert.ok('family_a' in pwd && 'family_b' in pwd && 'family_c' in pwd && 'family_d' in pwd && 'family_e' in pwd,
        `${name} w=${w.t}: per_window_detectors missing one of family_a..e keys`);
      assert.equal(pwd.family_b, null);
      assert.equal(pwd.family_c, null);
      assert.equal(pwd.family_d, null);
      assert.equal(pwd.family_e, null);
      if (hasA) {
        assert.ok(pwd.family_a !== null, `${name} w=${w.t}: family_a should be non-null (scenario exercises A)`);
        assert.equal(typeof pwd.family_a.shards_fired_count, 'number');
        assert.ok(pwd.family_a.max_M_t === null || typeof pwd.family_a.max_M_t === 'number');
        assert.ok(Array.isArray(pwd.family_a.fired_shard_ids));
      } else {
        assert.equal(pwd.family_a, null, `${name} w=${w.t}: family_a should be null (scenario does NOT exercise A)`);
      }
    }
  }
});

// AC-R79-9: every per_shard has residual_proxy with correct type (number for Family-A scenarios; null otherwise)
test('AC-R79-9: per_shard residual_proxy is number for Family-A scenarios; null otherwise', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    const hasA = j.detector_families.includes('A');
    for (const w of j.windows) {
      for (const ps of w.per_shard) {
        assert.ok('residual_proxy' in ps, `${name} w=${w.t} ${ps.shard_id}: residual_proxy missing`);
        if (hasA) {
          // Family-A scenarios have non-null M_t; residual_proxy = M_t - 1
          assert.equal(typeof ps.residual_proxy, 'number');
          if (typeof ps.M_t === 'number') {
            // Allow tiny floating-point drift from round6
            assert.ok(Math.abs(ps.residual_proxy - (ps.M_t - 1)) < 1e-5,
              `${name} w=${w.t} ${ps.shard_id}: residual_proxy ${ps.residual_proxy} != M_t - 1 = ${ps.M_t - 1}`);
          }
        } else {
          assert.equal(ps.residual_proxy, null);
        }
      }
    }
  }
});

// AC-R79-10: R71 scenario JSON top-level fields all preserved (backward-compat invariant)
test('AC-R79-10: R71 backward-compat — all 9 R71 top-level fields preserved verbatim', () => {
  const R71_TOP_LEVEL_FIELDS = [
    'schema_version','scenario','description','params','engine_surfaces',
    'windows','terminal_state','reasoning','suggested_actions',
  ];
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    for (const f of R71_TOP_LEVEL_FIELDS) {
      assert.ok(f in j, `${name}: R71 top-level field "${f}" missing`);
    }
    assert.equal(j.schema_version, 'tessera-demo-v1');
  }
});

// AC-R79-11: threshold_crossing_log discriminating asymmetry (sdc-drift ≥ 1; clean-baseline = 0)
test('AC-R79-11: threshold_crossing_log is discriminating (sdc-drift ≥ 1; clean-baseline = 0)', () => {
  const sdc = readScenarioJson('sdc-drift');
  const cb  = readScenarioJson('clean-baseline');
  assert.ok(sdc.threshold_crossing_log.length >= 1, 'sdc-drift must have ≥ 1 threshold crossing');
  assert.equal(cb.threshold_crossing_log.length, 0, 'clean-baseline must have 0 threshold crossings');
  // SDC-drift's crossing involves shard-04 + Family A
  const sdcEntry = sdc.threshold_crossing_log.find((tc: any) => tc.shard_id === 'shard-04' && tc.family === 'A');
  assert.ok(sdcEntry, 'sdc-drift must record a shard-04 Family-A crossing');
  assert.ok(sdcEntry.M_t_at_crossing >= sdcEntry.threshold);
});

// AC-R79-12: empirical attestation — chore-A tsc exit code is OBSERVED value (Implementer attests; Architect predicts 0)
test('AC-R79-12: typecheck attestation block exists in Q-R79-EMPIRICAL.sh (Block 1 prescribed)', () => {
  const empirical = fs.readFileSync(path.join(ROOT, 'coordination', 'specs', 'Q-R79-EMPIRICAL.sh'), 'utf8');
  assert.match(empirical, /Block 1/);
  assert.match(empirical, /pnpm exec tsc -p tsconfig\.test\.json/);
});

// AC-R79-13: empirical attestation — test count block uses --test-reporter=tap (R77 lesson)
test('AC-R79-13: test-count attestation block uses --test-reporter=tap (R77 lesson)', () => {
  const empirical = fs.readFileSync(path.join(ROOT, 'coordination', 'specs', 'Q-R79-EMPIRICAL.sh'), 'utf8');
  assert.match(empirical, /Block 3/);
  assert.match(empirical, /--test-reporter=tap/);
  assert.match(empirical, /# pass /);
  assert.match(empirical, /# fail /);
});

// AC-R79-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
test('AC-R79-14: anti-scope diff c87bdfe..HEAD ⊆ ALLOWED_SET', () => {
  const { execSync } = require('node:child_process');
  const out = execSync('git diff c87bdfe HEAD --name-only', { cwd: ROOT }).toString();
  const files = out.split('\n').map((s: string) => s.trim()).filter(Boolean);
  const ALLOWED = new RegExp(
    '^(' +
    'demos/demo\\.html|' +
    'demos/scenarios/[a-z-]+\\.json|' +
    'tools/build-canned-demos\\.ts|' +
    'package\\.json|' +
    'README\\.md|' +
    'test/q79-dashboard-structure\\.test\\.ts|' +
    'coordination/specs/Q-R79-SPEC\\.md|' +
    'coordination/specs/Q-R79-SPEC-AUDIT\\.md|' +
    'coordination/specs/Q-R79-EMPIRICAL\\.sh|' +
    'coordination/NEXT-ROLE\\.md|' +
    'coordination/MEMORIAL\\.md|' +
    'coordination/MEMORIAL-PHASE-[0-9]+\\.md|' +
    'coordination/reviews/REVIEWER-REPORT-R79\\.md|' +
    'coordination/logs/ROUND-R[0-9]+-(?:SUMMARY|ROUTING)\\.md|' +
    'coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\\.md|' +
    'CLAUDE\\.md|CLAUDE-ARCHITECT\\.md|CLAUDE-IMPLEMENTER\\.md|CLAUDE-REVIEWER\\.md|CLAUDE-MEMORIAL\\.md|CLAUDE-COMMON\\.md|CLAUDE-COORDINATOR\\.md' +
    ')$'
  );
  const unauthorized = files.filter((f: string) => !ALLOWED.test(f));
  assert.deepEqual(unauthorized, [], `unauthorized paths in diff: ${unauthorized.join(', ')}`);
});
```

---

## § 5. Acceptance criteria

### 5.1 AC table (14 ACs)

| AC | Given | When | Then |
|---|---|---|---|
| AC-R79-1 | `demos/demo.html` after Implementer regenerates outputs | a structural-element check is applied | a `<section id="live-verdict-banner">` element exists AND contains 3 sub-element IDs (`live-scenario-name`, `live-tick-indicator`, `live-verdict-status`) |
| AC-R79-2 | the embedded JS inside `demos/demo.html` | a function-presence check is applied | `function updateLiveVerdictBanner(` is defined AND is called from inside the `function render(` body |
| AC-R79-3 | `demos/demo.html` | the metrics-panel structural-element check is applied | a `<div id="metrics-panel" class="metrics-panel">` element exists AND a `<div id="metrics-body">` element exists |
| AC-R79-4 | `demos/demo.html` | the detectors-panel structural check is applied | `<div id="detectors-panel" class="detectors-panel">` exists AND contains 5 `.det-fam-A..E` rows AND the B/C/D/E rows also carry class `det-fam-placeholder` |
| AC-R79-5 | `demos/demo.html` | the provenance-panel collapse-default check is applied | a `<details id="provenance-panel">` element exists WITHOUT an `open` attribute AND contains a `<div id="provenance-body">` child |
| AC-R79-6 | scenarios `sdc-drift` and `clean-baseline` | `provenance_receipts` arity is checked | `sdc-drift.provenance_receipts.length >= 1` AND `clean-baseline.provenance_receipts.length === 0` AND each receipt has shape `{event_id, window, shard_id, family ∈ [A-E], reasoning (≥ 30 chars), evidence (non-null object)}` |
| AC-R79-7 | every scenario JSON in `demos/scenarios/*.json` (× 8) | top-level new-field check is applied | each JSON has `detector_families: array[A-E]`, `threshold_crossing_log: array of well-formed entries`, `provenance_receipts: array` |
| AC-R79-8 | every scenario JSON's per-window entries | per-window detectors check is applied | each window has `per_window_detectors` with all 5 family keys present; `family_b/c/d/e` always null; `family_a` non-null iff scenario `detector_families` includes `'A'`; non-null `family_a` has `shards_fired_count: number`, `max_M_t: number | null`, `fired_shard_ids: string[]` |
| AC-R79-9 | every scenario JSON's per-shard entries | residual_proxy correctness check is applied | each `per_shard[i]` has `residual_proxy: number | null`; for Family-A scenarios with `M_t: number`, `residual_proxy ≈ M_t - 1` (\|drift\| < 1e-5); for non-Family-A scenarios, `residual_proxy === null` |
| AC-R79-10 | every scenario JSON | R71 backward-compat top-level field check is applied | all 9 R71 top-level fields (`schema_version='tessera-demo-v1'`, `scenario`, `description`, `params`, `engine_surfaces`, `windows`, `terminal_state`, `reasoning`, `suggested_actions`) are present verbatim |
| AC-R79-11 | scenarios `sdc-drift` and `clean-baseline` | `threshold_crossing_log` arity is checked | `sdc-drift.threshold_crossing_log.length >= 1` AND `clean-baseline.threshold_crossing_log.length === 0` AND `sdc-drift` records a shard-04 Family-A crossing with `M_t_at_crossing >= threshold` |
| AC-R79-12 | `Q-R79-EMPIRICAL.sh` Block 1 (chore-A typecheck attestation) | the file is parsed | Block 1 invokes `pnpm exec tsc -p tsconfig.test.json` (this AC binds the binding-command PRESENCE in the script; the OBSERVED tsc exit code is encoded by the Implementer in NEXT-ROLE.md per the empirical-command-attestation Rule 1) |
| AC-R79-13 | `Q-R79-EMPIRICAL.sh` Block 3 (test-count attestation) | the file is parsed | Block 3 invokes node test with `--test-reporter=tap` AND greps `# pass `, `# fail ` (R77 lesson absorbed) |
| AC-R79-14 | round-start SHA `c87bdfe` and current HEAD | the diff is computed | `git diff c87bdfe HEAD --name-only` ⊆ ALLOWED_SET regex enumerated in § 3.2 |

### 5.2 Implicit AC (Implementer chore-A binding-command attestation)

The Implementer attestation in `coordination/NEXT-ROLE.md` (§ Implementer outputs, routing to Reviewer) MUST record the ACTUAL observed values from `bash coordination/specs/Q-R79-EMPIRICAL.sh` at chore-A HEAD:
- `tsc` exit code (Architect prediction: `0`)
- node test process exit code (prediction: `0`)
- TAP `# tests`, `# pass`, `# fail`, `# skipped` summary line values (predictions: `594 / 583 / 7 / 4` per § 1.4)
- `git diff c87bdfe HEAD --name-only` line count (prediction: 9-15)
- `bash Q-R79-EMPIRICAL.sh` exit code (prediction: `0`)

If any observed value differs materially from the prediction, the Implementer HALTs and writes a DIAGNOSTIC (per cross-project Rule 1 / empirical-command-attestation sub-class; R26 MAJOR-1 / R72 CRITICAL-1 / R77 lessons).

### 5.3 Acknowledged AC gaps + mitigations (per R74 MINOR-2)

Documented gaps that the AC suite does NOT structurally test, paired with explicit mitigations:

1. **Browser runtime behavior of `updateLiveVerdictBanner` (per-tick update)** — chore-A tests run in Node, not in a browser; the AC-R79-2 grep can only confirm the function exists and is wired into `render()`. The actual per-tick DOM mutation is not observed. _Mitigation_: AC-R79-2's chained grep (`function updateLiveVerdictBanner` AND `function render([…] updateLiveVerdictBanner(`) asserts the wiring; manual browser opening at Reviewer audit time confirms behavior. Reviewer is asked to open `file:///…/demos/demo.html` and verify the banner text updates as Play steps through ticks.
2. **Verdict status precedence rule (`frozen > common-mode > fdr-selected > firing > baseline`)** — the precedence is encoded in JS code paths inside `deriveVerdictStatus()` (committed in HTML) but no AC structurally asserts the precedence ordering. _Mitigation_: § 2.5 prescribes the precedence in the spec; a future R80 AC can add precedence-specific assertions once the 5-family render path is structured.
3. **`<details>` element runtime collapse-toggle interaction** — AC-R79-5 confirms the element is collapsed by default (no `open` attribute in committed HTML). User-clicks-to-expand behavior is native HTML semantics; not separately tested. _Mitigation_: native browser behavior is implementation-defined and well-supported; no JS hand-rolling means no JS bug surface.
4. **R71 AC-R71-3 idempotency under R79 schema** — R71's idempotency check (re-running the build tool produces byte-identical outputs) DEPENDS on the Implementer regenerating outputs ONCE at chore-A. If a developer modifies a scenario function and forgets to re-run, AC-R71-3 fails. _Mitigation_: pre-existing concern from R71; not aggravated by R79. The `build:demos` npm script wraps `tsc -p tsconfig.test.json && node tools/build-canned-demos.js` per R71 to keep the developer flow safe.
5. **Provenance receipt evidence-object shape variation by scenario** — each scenario's receipts may have differently-shaped `evidence` objects. AC-R79-6 only asserts `evidence` is a non-null object; field-name uniformity across scenarios is NOT asserted. _Mitigation_: this preserves flexibility for R80 to extend evidence with family-specific fields without breaking AC-R79-6.

---

## § 6. Anti-scope + halt conditions

### 6.1 Halt conditions (extending the directive's 7 conditions)

The Implementer MUST HALT (write a DIAGNOSTIC + set STATUS: ESCALATE in NEXT-ROLE.md) when any of the following occurs:

1. (Directive condition 1) `bash Q-R79-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than the pre-documented AC-R78-14 forward-protection flip (see § 1.4-note). Specifically: if Block 1 (typecheck), Block 2 (artifact existence), Block 3 (test counts ≠ predicted ± 2), or Block 4 (anti-scope diff ⊄ ALLOWED_SET) fails for unexpected reasons.
2. (Directive condition 2) `pnpm exec tsc -p tsconfig.test.json` exit code ≠ 0.
3. (Directive condition 3) Test baseline drift: TAP `# fail` ≠ 7 (carry-forward 6 + AC-R78-14 flip = 7). If `# fail` < 7: investigate (probably AC-R78-14 did not flip as predicted; HALT to understand). If `# fail` > 7: investigate (R79 broke something else; HALT).
4. (Directive condition 4) An R61-class architectural-reality discovery (e.g., a vendored engine type's actual shape contradicts the spec's pseudocode in a way that requires engine modification). The directive forbids engine modification under any conditions; HALT + ESCALATE.
5. (Directive condition 5) Implementer finds a round-evolution-fragile AC pattern in this spec that was missed at architect-time. HALT and write a DIAGNOSTIC naming the AC + the proposed reformulation. Operator decides whether to amend or proceed.
6. (Directive condition 6) Any cross-project discipline (Rules 1-7) is violated.
7. (Directive condition 7) A new external dependency would be required to satisfy a spec prescription. HALT + ESCALATE; zero-new-deps posture is inviolate (R68 anti-worm).
8. (Architect-added) The Implementer is unable to satisfy AC-R79-9's `Math.abs(ps.residual_proxy - (ps.M_t - 1)) < 1e-5` tolerance because of unexpected rounding behavior. HALT and propose a wider tolerance or alternative formulation.
9. (Architect-added) The CSS or HTML grew the file beyond 1.5× R71's `demos/demo.html` line count (R71 = 7,518 lines; threshold = ~11,277 lines). This is a soft-warning that R79 over-shot ~50% of the gap and approached R80 territory; HALT and surface for operator scope-creep review.

### 6.2 ALLOWED_SET narrative

The Implementer is permitted to MODIFY (extend additively, regenerate, or create):

- `demos/demo.html` — extension via regenerated template
- `demos/scenarios/*.json` (× 8) — regenerated by build tool
- `tools/build-canned-demos.ts` — extension (new interface fields + per-scenario population + HTML template additions)
- `package.json` — OPTIONAL: add npm scripts if useful (no new deps)
- `README.md` — OPTIONAL: ≤ 15-line Coverage / Quick demo additive note
- `test/q79-dashboard-structure.test.ts` — NEW (TDD RED commit first per R23 IMPL MINOR-1; then GREEN)
- `coordination/specs/Q-R79-SPEC.md`, `Q-R79-SPEC-AUDIT.md`, `Q-R79-EMPIRICAL.sh` — NEW (Architect; THIS commit)
- `coordination/reviews/REVIEWER-REPORT-R79.md` — NEW (Reviewer)
- `coordination/NEXT-ROLE.md` — append routing blocks per role
- `coordination/MEMORIAL.md` — appends per role
- `coordination/logs/ROUND-R79-ROUTING.md` and `ROUND-R79-SUMMARY.md` — pipeline-emitted
- `coordination/diagnostics/DIAGNOSTIC-R79-*.md` — only if a halt fires

The Implementer is FORBIDDEN to modify:

- `engine/*` (any file under engine — Phase 3 frozen)
- Any `test/q01..q78-*.test.ts` file (R71+R72+...+R78 frozen)
- Any prior `coordination/specs/Q-RNN-SPEC.md` / `-SPEC-AUDIT.md` / `-EMPIRICAL.sh` (R73-R78 frozen per directive; R01-R72 frozen permanently)
- `tools/demo-scenario.ts` (R70 CLI; sibling to dashboard)
- `tools/coverage-saturation.ts` (R72), `tools/detector-envelope.ts` + `tools/detection-curve.ts` (R77), `tools/topology-walk-tuning.ts` (R78)
- `run-pipeline.sh` (PR #39 pending)
- Any cluster directory (no real-cluster work)
- Any DS-repo path (no DS-repo modification)

---

## § 7. Open questions

**None — all resolved at Architect time.**

The directive's "Architect picks layout at spec § 0" decision is resolved at § 0 (Approach C HYBRID picked). The provenance-panel container choice (`<details>` element) is resolved at § 2.4. The verdict-status precedence is resolved at § 2.5 + § 1.2. The schema field naming (`residual_proxy` non-overclaim) is resolved at § 2.3. The 5-row detector-placeholder structure is resolved at § 2.6.

---

## § 8. P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **correctness** | Every spec prescription is checkable: structural elements via grep on `demos/demo.html`; JSON fields via type-asserts on `demos/scenarios/*.json`; binding-command attestations via `Q-R79-EMPIRICAL.sh` blocks. |
| **completeness** | All 3 directive deliverables (front-panel split + provenance panel + live verdict banner) are bound by ACs (AC-R79-1/2 banner, -3/4 front-panel, -5/6 provenance); all 4 schema additions are bound (AC-R79-7 top-level, -8 per-window, -9 per-shard, -11 threshold-crossing-log discriminating); backward-compat is bound (AC-R79-10). |
| **consistency** | Field names, function names, and class names are prescribed verbatim in § 1.2 + § 4.1; AC regex patterns match the prescribed names; no spec section contradicts another (verified at § 9.5 cross-section consistency pass). |
| **clarity** | Each AC's "Given/When/Then" is concrete (file path + matcher); no ambiguous language ("correctly", "appropriately") appears in any AC; banned terms verified absent via grep. |
| **coverage** | Every prescribed structural element has an AC; every prescribed JS function has an AC binding its presence; every prescribed schema field has a type assertion; the cross-cutting backward-compat invariant is asserted via AC-R79-10. |
| **constraints** | Anti-scope is enforced by AC-R79-14 (anti-scope diff ⊆ ALLOWED_SET); halt conditions 1-9 enumerate the failure modes; engine freeze is enforced by ALLOWED_SET excluding `engine/*`. |
| **concurrency** | Not applicable — single-pass synchronous build tool + static HTML rendering; no concurrency in the spec surface. |
| **corner cases** | Empty per_window_detectors.family_a for non-Family-A scenarios (handled in pseudocode); 0 provenance receipts (handled — empty array; rendered as "no firings"); `<details>` collapsed by default (handled — no `open` attribute); R71 byte-identity scenarios re-runs (AC-R71-3 self-healing). |
| **cost** | New file count: 4 (1 test + 3 spec triad); modified file count: 3-5 (demo.html + scenarios × 8 + build-canned-demos.ts + optional package.json + optional README.md); estimated demo.html growth ~300-500 lines (from 7,518 to ~7,800-8,000) — far below the 11,277-line soft warning. |
| **coupling** | Zero new engine coupling (anti-scope); zero new external dependency coupling (halt condition 7); the only NEW coupling is between `tools/build-canned-demos.ts` and the new schema fields, which is intrinsic to the round's work. |

---

## § 9. Pre-emit grilling (Superpowers Phase 3)

### 9.1 Every claim verifiable?

Every numeric prediction in § 1.4 is bounded to a binding command. Every structural prescription in § 1.2 + § 4.1 + § 4.3 is bound to an AC regex (§ 5.1). Every architectural decision in § 2 is cross-referenced from § 4 pseudocode and § 5 AC. **Verified: YES.**

### 9.2 Unstated assumptions?

- **Assumed:** `pnpm exec tsc` and `pnpm exec node --test` are available in the worktree (verified empirically at session entry).
- **Assumed:** The `<details>` HTML element is supported in all browsers the operator uses (modern evergreen browsers — Chrome / Firefox / Safari all support it natively).
- **Assumed:** `require.main === module` guard pattern continues to work in the Implementer's Node environment (verified — R71 already uses this pattern at line 1314).
- **Assumed:** AC-R78-14 flips from pass to fail at R79 chore-A as derived in § 1.4-note (verified by reading R78's EMPIRICAL.sh regex; R78 regex does NOT include any R79 path patterns).
- **Assumed:** The `tools/build-canned-demos.js` compiled file is gitignored (verified at session entry via `git ls-files`).
- **Assumed:** No new vendored engine type is needed; all schema additions are local to `tools/build-canned-demos.ts` (verified — no new engine imports proposed).

**All assumptions verified empirically OR explicitly bounded.**

### 9.3 Scope added beyond request?

The directive enumerates 3 dashboard deliverables (banner + front-panel split + provenance), 4 schema additions, 1 test file, and 1 EMPIRICAL.sh. The spec delivers exactly those. The detector-panel placeholder discipline (§ 2.6) is intrinsic to "future Family B/C/D/E placeholders" in the directive — not scope added. No README / package.json modifications are mandatory (Implementer judgment). The 9 halt conditions extend the directive's 7 with 2 Architect-added safety nets (residual_proxy tolerance HALT + size soft-warning HALT) — both are safety-net conditions, not scope additions. **Verified: NO scope creep.**

### 9.4 Implementer can act without guessing?

- Every function name is prescribed verbatim (`updateLiveVerdictBanner`, `renderMetricsPanel`, `renderDetectorsPanel`, `renderProvenancePanel`, `deriveVerdictStatus`).
- Every ID is prescribed verbatim (`live-verdict-banner`, `live-scenario-name`, `live-tick-indicator`, `live-verdict-status`, `metrics-panel`, `metrics-body`, `detectors-panel`, `detectors-body`, `provenance-panel`, `provenance-body`).
- Every class name is prescribed (`live-banner`, `metrics-panel`, `detectors-panel`, `det-fam-A..E`, `det-fam-placeholder`, `metric-row`, `metric-name`, `metric-mt`, `metric-residual`, `provenance-receipt`, `pr-header`, `pr-reasoning`, `pr-evidence`).
- Every schema field name + type is prescribed (§ 1.3 + § 4.1).
- Provenance receipt reasoning string template is prescribed (§ 4.1 pseudocode).
- HTML insertion points are specified ("between `</section>` for `#tessera-controls` and `<main id="tessera-main">`").
- CSS is provided in § 4.1; Implementer may tweak colors but not class names or ID hooks.
- Verdict status precedence is fixed.

**Verified: zero design decisions deferred to Implementer.** Tactical implementation choices (exact line numbers; choosing variable names inside helpers; minor CSS tweaks) remain with Implementer per the role boundary.

### 9.5 Cross-section consistency pass (R01 reinforcement; R65 MINOR-2 type-shape cross-check extension)

Verified by line-by-line walk:

- `updateLiveVerdictBanner` appears identically in § 1.2 (function name prescription), § 4.1 (pseudocode), and § 5.1 AC-R79-2 (regex `function\s+updateLiveVerdictBanner\s*\(`). ✓
- `renderMetricsPanel` / `renderDetectorsPanel` / `renderProvenancePanel` consistent across § 1.2 / § 4.1. ✓
- `live-verdict-banner` ID consistent across § 1.2 / § 4.1 / AC-R79-1 regex. ✓
- `metrics-panel`, `metrics-body`, `detectors-panel`, `detectors-body`, `provenance-panel`, `provenance-body` IDs consistent across § 1.2 / § 4.1 / AC-R79-3/4/5 regexes. ✓
- `det-fam-A..E` class names consistent across § 1.2 layout, § 4.1 CSS, and AC-R79-4 regex. ✓
- `det-fam-placeholder` class consistent across § 1.2 / § 4.1 / AC-R79-4 regex. ✓
- `residual_proxy` field name consistent across § 1.3 (typed interface), § 2.3 (semantic note), § 4.1 (pseudocode), § 5.1 AC-R79-9 (check). ✓
- `detector_families` / `threshold_crossing_log` / `provenance_receipts` field names consistent across § 1.3 / § 4.1 / § 5.1 AC-R79-7. ✓
- `per_window_detectors.family_a/b/c/d/e` key names consistent across § 1.3 / § 4.1 / § 5.1 AC-R79-8. ✓
- Verdict status state names (`baseline`, `clean`, `firing`, `common-mode`, `frozen`, `fdr-selected`) consistent across § 1.2 / § 4.1. ✓
- `schema_version` literal `'tessera-demo-v1'` preserved per AC-R79-10 + § 2.2. ✓
- ALLOWED_SET regex in § 3.2 matches the regex in AC-R79-14 (verified — both enumerate the same patterns). ✓
- Predicted fail count `7` consistent across § 1.4 table and § 5.2 + § 6.1 halt-condition 3. ✓

**Cross-section consistency: PASS.**

### 9.6 Spec-internal contradiction sweep (R15 MINOR-3 reinforcement)

For each pair of (halt-condition trigger, AC consequence), verify no contradictions:

- Halt-condition 3 (`# fail ≠ 7`) vs § 1.4 prediction (`# fail = 7`): CONSISTENT (halt fires only on deviation).
- AC-R79-14 (diff ⊆ ALLOWED_SET) vs halt-condition 1 (EMPIRICAL.sh Block 4 non-zero): CONSISTENT (both fire on the same unauthorized-path condition).
- AC-R79-10 (R71 backward-compat preserved) vs § 2.2 (schema additivity invariant): MUTUALLY-REINFORCING (no contradiction).
- § 4.1 pseudocode prescribes `schema_version` stays `'tessera-demo-v1'`; AC-R79-10 asserts the same: CONSISTENT.
- Halt-condition 9 (file size > 11,277 lines) — soft warning; vs § 8 cost (~300-500 line growth expected): CONSISTENT (margin = ~3,000+ lines).

**Spec-internal contradiction sweep: PASS.**

### 9.7 Empirical-premise verification (R08 MAJOR-2 reinforcement)

Every load-bearing factual claim about production behavior was verified at Architect session entry, not inherited from prior testimony:

- `pnpm exec tsc -p tsconfig.test.json` exit 0: VERIFIED by running it (output: empty, exit 0).
- `pnpm exec node --test --test-reporter=tap test/*.test.js` exit 0 + counts: VERIFIED by running it (output captured; tests=580/pass=570/fail=6/skipped=4).
- Carry-forward fail set names: VERIFIED by grep for `^not ok` in the TAP output (6 lines extracted verbatim).
- R71's `ScenarioJson` interface shape: VERIFIED by reading `tools/build-canned-demos.ts:84-94`.
- R71's HTML structural elements: VERIFIED by reading `demos/demo.html:1-108`.
- R78's EMPIRICAL.sh ALLOWED_SET regex: VERIFIED by reading `coordination/specs/Q-R78-EMPIRICAL.sh:80-90`.
- `tools/build-canned-demos.js` is gitignored: VERIFIED via `git ls-files tools/build-canned-demos.js` (empty output).
- `<details>` element is committed without `open` attribute in this spec's prescription: VERIFIED at § 4.1 HTML insertion.

**Empirical-premise verification: PASS.**

### 9.8 EMPIRICAL.sh probe-run by Architect (R77 OBS-4 reinforcement)

Per R77 OBS-4 + cross-project rule (3rd Tessera EMPIRICAL.sh instance), the Architect ran `bash coordination/specs/Q-R79-EMPIRICAL.sh` against round-start HEAD `c87bdfe` BEFORE routing. Expected outcomes at round-start (pre-Implementation state):

- Block 1 (typecheck): PASS — `tsc` exits 0 (verified at § 1.4).
- Block 2 (artifact existence): FAIL — the 4 R79 artifacts (`test/q79-dashboard-structure.test.ts`, the 3 spec-triad files) do not yet exist. THIS IS EXPECTED — Block 2 acts as the load-bearing "RED" precondition for chore-A. Diagnostic emits cleanly: "Block 2 FAIL: missing required artifact(s): test/q79-dashboard-structure.test.ts coordination/specs/Q-R79-SPEC.md ..."

Wait — at the time of this Architect probe-run, the spec-triad files DO exist (we're writing them now). The empirical Block 2 will need to check artifact existence at chore-A, and at chore-A all 4 will exist. Pre-implementation FAIL state is "test file absent" only.

- Block 3 (test counts): At round-start (pre-RED), q79 test file doesn't exist; full test suite still passes 570 / fails 6. Block 3 compares against predictions (`# fail` should be 7); at round-start `# fail = 6` → Block 3 FAIL: `fail count = 6; expected 7`. This is expected (pre-Implementation).
- Block 4 (anti-scope diff): At round-start (pre-Implementation), `git diff c87bdfe HEAD --name-only` is empty (no changes yet); diff ⊆ ALLOWED_SET trivially. PASS.

**Probe-run conclusion:** EMPIRICAL.sh blocks emit clean diagnostics at round-start; Block 2 + Block 3 will only PASS at or after Implementer's chore-A commit (by design). No R77 EMPIRICAL.sh-defect (grep pattern mismatch / reporter format gap) recurrence. **PASS.**

(Architect note: the EMPIRICAL.sh script uses `--test-reporter=tap` per R77 lesson; grep patterns `# pass `, `# fail `, `# tests `, `# skipped ` are anchored to the TAP summary lines that the tap reporter emits.)

---

## § 10. Cross-project rule disposition (Rules 1-7; per CROSS-PROJECT-MEMORIAL.md)

| Rule | Sub-class | R79 disposition |
|---|---|---|
| **Rule 1** — halt-discipline | `empirical-command-attestation` | ACTIVE. `Q-R79-EMPIRICAL.sh` Block 3 uses `--test-reporter=tap`; Implementer attests OBSERVED tsc exit code + TAP counts verbatim (NEVER spec predictions). Halt-condition 1 + 3 enforce. |
| **Rule 1** — halt-discipline | `false-compliance-attestation` | ACTIVE. § 5.2 explicit: any prediction-vs-observation gap → HALT + DIAGNOSTIC, never reframe. |
| **Rule 2** — branch-binding coverage | every guard / short-circuit has an AC | ACTIVE. `deriveVerdictStatus()` precedence branches each appear in pseudocode; AC-R79-2 (`updateLiveVerdictBanner` definition + render() invocation) asserts the wiring; the precedence branches themselves are gap-acknowledged at § 5.3 #2 with R80 follow-up mitigation. |
| **Rule 3** — anti-self-application gate | spec's own prescriptions would satisfy its ACs | ACTIVE. Verified at § 9.4 + § 9.5: the spec's prescribed function names + IDs + classes satisfy the AC regexes verbatim. § 4.1 pseudocode would satisfy AC-R79-7/8/9 if implemented verbatim. |
| **Rule 4** — anti-scope-allowed-set forward-coverage | ALLOWED_SET pre-includes forward-protective patterns | ACTIVE. § 3.2 pre-includes `coordination/logs/ROUND-R[0-9]+-...`, `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-...`, all 6 CLAUDE-*.md, MEMORIAL-PHASE-N shards. AC-R79-14 binds the regex. |
| **Rule 5** — composite-violation threshold | 3 instances → cross-project promotion | NOT TRIGGERED at R79 by R79's own work; R79 is preventatively designed to avoid the patterns. |
| **Rule 6** — encode-actual-results-verbatim | all roles | ACTIVE. § 5.2 explicit; § 1.4 predictions documented as predictions (not as observed values). |
| **Rule 7** — cross-project canonical surface | (a) load-bearing | ACTIVE. claim-then-walk + TACTICAL-AUTONOMY-without-re-verification + empirical-script-defect + Haiku-MU-STATUS-update-miss all loaded per directive. |

---

## § 11. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R79 --tier full
```

Pre-route attestation: spec triad (`Q-R79-SPEC.md` + `Q-R79-SPEC-AUDIT.md` + `Q-R79-EMPIRICAL.sh`) committed in own Architect commit BEFORE Implementer dispatch (R21 ARCH MINOR-1 spec-commit-sequencing).
