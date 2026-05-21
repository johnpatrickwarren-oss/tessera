# Q-R81-SPEC.md — SLICE 2 final round: scrubber UI + animation polish + DEMO-SCRIPT.md

**Round:** R81 (Phase 4 SLICE 2 final round — dashboard close + demo script)
**Tier:** full
**Round-start SHA:** `0eb371f` (HEAD at Architect session entry; `chore(R80 close + R81 directive): SLICE 2 final round`).
**Anti-scope baseline:** `0eb371f`

---

## § 0. Brainstorm (Superpowers Phase 1)

The directive prescribes a SLICE 2 close that polishes the R71/R79/R80 dashboard with: (1) a window-scrubber slider; (2) "200ms CSS transitions on M_t changes; verdict-badge state transitions; provenance panel updates; instant for scrubbing"; (3) per-firing collapsible provenance receipts + retain R80's collapsible detector-math context; (4) keyboard shortcuts (space=play/pause; arrows=step; r=reset); (5) per-family color coding (already present at R80 via `--tessera-fam-{a,b,c,d,e}` CSS vars and `.det-fam-{A..E}` left-border accents); (6) a 10-minute `demos/DEMO-SCRIPT.md` analogous to DS's `/Users/johnwarren/deploysignal-public/DEMO-SCRIPT-10MIN.md`; (7) README "Quick demo" extension referencing the scrubber + DEMO-SCRIPT.md; (8) `test/q81-slice-2-close.test.ts`; (9) `Q-R81-EMPIRICAL.sh` (MUST use `--test-reporter=tap` per R77 lesson).

Architect-claim-then-walk at session entry:
- Read `demos/demo.html` lines 142-216 + lines 12700-13099 (controls section + embedded JS) — verified the current state has `#tessera-controls` with select / btn-play / btn-pause / btn-reset / speed-selector / window-indicator, but NO range-input scrubber; `currentWindowIdx` is the central state in the IIFE; `tick()` is the play loop driven by `setInterval`; `renderAuditForWindow()` (defined at `tools/build-canned-demos.ts:1563`) is append-only (does not rebuild from window 0).
- Read `tools/build-canned-demos.ts:1175-1391` (`HTML_TEMPLATE_HEAD`) — confirmed R80 added `:root --tessera-*` variables (lines 1182-1208), `<p class="tessera-tagline">` (line 1312), `@media print` (lines 1297-1306), and `.det-fam-A..E` color borders (lines 1284-1288). R80's "remove `det-fam-placeholder` class on B/C/D/E hardcoded HTML" prescription is not visibly applied at HEAD `0eb371f` (the class persists at template lines 1380-1383); this is an R80 implementation deviation that R81 explicitly preserves (anti-scope: no modification of R80 close state unless required by R81 ACs).
- Read `tools/build-canned-demos.ts:1396-1798` (`HTML_TEMPLATE_FOOTER` JS) — confirmed `renderProvenancePanel` (line 1696) generates `<div class="provenance-receipt">` per receipt with flat structure; no per-receipt `<details>` collapse.
- Read `test/q79-dashboard-structure.test.ts` and `test/q80-five-family-visualization.test.ts` to enumerate which prior-round ACs would be invalidated by the R81 changes — verified that no AC binds `<div class="provenance-receipt">` as a tag-name; AC-R79-5 + AC-R80-12 bind only the OUTER `<details id="provenance-panel">`, so changing the inner receipts from `<div>` to `<details>` is safe.
- Read `/Users/johnwarren/deploysignal-public/DEMO-SCRIPT-10MIN.md` (330 lines) as the analogue template — confirmed the structure: "Before you start" → "Default spine" → minute-by-minute headings with **Click:** + **Say:** + **Pause beat** patterns → "Bank of follow-up questions" → "Audience-specific substitutions" → "Pacing notes" → "Post-demo ready states" → "What I need to rehearse specifically."

Baseline empirical verification at session entry (Round-start HEAD `0eb371f`):
- `pnpm exec tsc -p tsconfig.test.json` exits `0` (verified).
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 608 / # pass 594 / # fail 10 / # skipped 4` (verified via `bash coordination/specs/Q-R80-EMPIRICAL.sh` which returned `ALL BLOCKS PASS`).
- 10 carry-forward failing ACs (verified by direct grep of `not ok` lines): AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14.

### Approaches considered

**Approach 1 — Full canvas-based animated chart with smooth interpolation everywhere (SVG path tweening between ticks).** Replace SVG `<path d="M…L…">` with `<path>` whose `stroke-dasharray` animates draw-in over 200ms per tick; replace per-tick redraw with delta-based path extension; add easing functions in JS.

- **Strengths:** maximally polished feel; the chart truly "animates" rather than redraws.
- **Weaknesses:** large diff (`drawFrame` rewrite); R79 SVG architecture invariant (`<svg id="mt-chart">`) preserved but its rendering logic changes substantively; non-trivial cross-browser pitfalls (Safari vs Chrome animation handling); harder to grep-test from Node (animation is runtime-only).
- **Hidden assumption:** that "200ms CSS transitions on M_t changes" was intended to mean SVG path animation. A literal read of the directive's phrasing fits either path animation or color-state transitions on dashboard elements when M_t crosses thresholds (which would change badge color / det-fam status).
- **Risk:** R71 MAJOR-1/2 class — pre-authoring claims about animation feel that empirical testing cannot verify; spec-self-application-gate failures if grep regex for transition definitions doesn't match the actual implementation; R74 MINOR-5 directional regex issues.

**Approach 2 — Minimal scrubber + selective CSS transitions on color-state elements + nested `<details>` for receipts + document-level keyboard handlers. Preserve R79 SVG redraw architecture.** Add a `<input type="range" id="window-scrubber">` to `#tessera-controls`; wire `input` event to set `currentWindowIdx` and call `render()` (no playback); toggle `body.scrubbing` class during scrub for instant updates; add CSS `transition: ... 200ms` on `.det-fam`, `.badge`, `#live-verdict-status` color/background-color (the dashboard's color-state elements that change when a shard fires / a window advances); change `renderProvenancePanel` to emit `<details class="provenance-receipt">` with a `<summary>` carrying the header (collapsed by default; click to expand the per-firing evidence); add `document.addEventListener('keydown', …)` with Space/ArrowRight/ArrowLeft/`r` cases; rebuild audit list from `windows[0..currentWindowIdx].events` on each render (fix the current append-only bug exposed by scrubbing backwards).

- **Strengths:** smallest diff (~150-300 added lines in `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER`); zero engine modification; preserves R79 SVG architecture; all R81 deliverables grep-testable from Node tests; CSS transitions apply where the dashboard's color state changes (badges flip clean→fire; det-fam status changes from "clean" to "FIRING"; verdict banner status changes); scrub instant via class-hook override.
- **Weaknesses:** SVG path itself does NOT animate (each render redraws the whole chart); operator reading the directive's "200ms transitions on M_t changes" with maximally-literal SVG-path-animation expectation could feel under-delivered. Spec § 2.3 transparently labels this as: "transitions apply to dashboard color-state surfaces (badges, det-fam rows, verdict banner) when their state changes due to M_t advancing past a threshold; the SVG chart redraws per-tick (R79 architecture preserved)."
- **Hidden assumption:** that the directive intends "polished feel" via cross-state color transitions, not literal frame-by-frame SVG tweening. Resolved by explicit § 2.3 framing.
- **Risk:** none material; the existing R79 SVG architecture survives unchanged; tests can grep for `transition:` CSS rules in `HTML_TEMPLATE_HEAD`.

**Approach 3 — Hybrid: Approach 2 + add `stroke-dasharray` draw-in animation on SVG paths during play (not during scrub).** Same as Approach 2 plus: on each `tick()`, instead of clear+redraw, append a new segment to each shard's path and set `stroke-dasharray` such that the new segment draws in over 200ms via CSS transition. Scrubbing bypasses the animation by clearing+redrawing all paths.

- **Strengths:** approximates Approach 1's polish with smaller diff; gives operator a "drawing in" visual cue per tick that's visually load-bearing for the "instant for scrubbing" contrast.
- **Weaknesses:** non-trivial JS changes to `drawFrame` (must track per-shard path elements across ticks rather than full redraw each frame); the dasharray-animation technique requires computing path total-length at append-time; cross-shard layout depends on a stable element-set rather than rebuild-each-frame. Adds ~80-120 LOC of new JS over Approach 2.
- **Risk:** R74 MINOR-5 / Rule 3 self-application gate is harder to verify: AC bindings can grep for `stroke-dasharray` and `getTotalLength` patterns in JS, but verifying the animation produces the desired feel is browser-runtime only (not Node-testable). Adds OBSERVED-binding risk if the test asserts a literal pattern that future browser behavior could refute. Halt-condition trigger risk if browser-runtime issues arise during Implementer probe.

### Selection rationale

**Approach 2 picked** as the best tradeoff for this SLICE 2 final round:

1. **Smallest, lowest-risk diff** that satisfies all 9 directive prescriptions. The dashboard's user-visible animation already comes from the existing 500ms-per-tick `setInterval` cycle; adding CSS transitions on color-state elements delivers a perceptibly-polished feel at minimal implementation cost.
2. **All 9 deliverables are grep-testable** from Node — no element of the design requires browser-runtime validation to satisfy an AC. Per R71 MAJOR-1/2, this avoids pre-authoring empirical claims about feel that the test surface cannot verify.
3. **Preserves R79 SVG architecture** intact. The chart's per-tick redraw via `drawFrame` is unmodified; only the dashboard's state-display elements gain transitions. AC-R79-1 + AC-R79-2 (chart SVG structure) continue to pass byte-identically.
4. **Per-firing collapsible receipts** are a substantive UX improvement (the current R79/R80 dashboard renders all receipts flat with their full JSON evidence visible; for scenarios with N≥3 receipts, the receipt panel scrolls. A `<details>` per receipt makes the panel scannable.) Implementation cost is ~10 LOC change in `renderProvenancePanel`.
5. **Approach 1 rejected** because (a) the diff would be 600+ LOC and (b) browser-runtime-only animation can't be Node-tested, opening up R71 MAJOR-1/2-class narrative-vs-data contradictions in the AC suite.
6. **Approach 3 rejected** in favor of Approach 2 because the marginal polish gain doesn't justify the dasharray-animation complexity or the OBSERVED-binding risk in the AC suite for a SLICE-final round. If a future round wants real SVG-path animation, it can be a clean follow-up.

### Approach 2 specifics — the implementation footprint:

- **HTML changes** (in `HTML_TEMPLATE_HEAD`):
  - Add `<input type="range" id="window-scrubber" min="0" max="29" step="1" value="0" aria-label="Scrub to window">` inside `#tessera-controls`, positioned BEFORE the `<span id="window-indicator">` (so the indicator + scrubber visually share a row; scrubber takes flex space; indicator shows numeric value).
- **CSS changes** (in `HTML_TEMPLATE_HEAD` `<style>`):
  - `.det-fam`, `.badge`, `#live-verdict-status` get `transition: color 200ms ease, background-color 200ms ease, border-color 200ms ease;`.
  - `body.scrubbing .det-fam, body.scrubbing .badge, body.scrubbing #live-verdict-status { transition: none; }` (instant-update override during scrub).
  - `#window-scrubber { flex: 1 1 200px; max-width: 320px; accent-color: var(--tessera-accent-blue); }` (uses existing R80 CSS variable).
  - `.provenance-receipt > summary { cursor: pointer; padding: 4px 0; }` (the `<details>` change requires summary-element styling).
  - `.provenance-receipt > summary:hover { color: #e6edf3; }` (hover affordance).
  - Optionally: `details.provenance-receipt[open] > summary { color: #f0f6fc; }` (open-state hover indicator).
- **JS changes** (in `HTML_TEMPLATE_FOOTER` IIFE):
  - Add `windowScrubber` DOM ref.
  - Add `manualStep(delta)` helper to clamp + update `currentWindowIdx` + update scrubber position + re-render.
  - Add scrubber `'input'` + `'change'` event listeners.
  - Add `document.addEventListener('keydown', …)` with Space/ArrowRight/ArrowLeft/`r` handlers.
  - Change `renderProvenancePanel` to `createElement('details')` instead of `'div'`; add `<summary>` element.
  - Rebuild audit list each render (split `renderAuditForWindow` → `rebuildAuditUpToCurrentWindow`).
  - In `loadScenario`, set `windowScrubber.max = String(scenarios[currentName].windows.length - 1)` and `windowScrubber.value = '0'`.
  - In `render()` (after window-state mutation), set `windowScrubber.value = String(currentWindowIdx)` to keep scrubber in sync with play/keyboard step.
- **New files**:
  - `demos/DEMO-SCRIPT.md` (NEW) — ≥ 150 lines; 10-minute spine = Clean-baseline → SDC-drift → Common-mode-rack → Event-conditional → Close; per-section "Click:" + "Say:" + "Pause beat" pattern (analogous to DS).
  - `test/q81-slice-2-close.test.ts` (NEW) — 14 ACs (RED-commit first per R23 IMPL MINOR-1).
  - `coordination/specs/Q-R81-SPEC.md` + `Q-R81-SPEC-AUDIT.md` + `Q-R81-EMPIRICAL.sh` (NEW; this Architect commit).
  - `coordination/reviews/REVIEWER-REPORT-R81.md` (NEW; by Reviewer at audit time).
- **README.md** — append ≤ 30 added lines: a "Quick demo" subsection that documents the new scrubber + keyboard shortcuts and points readers at `demos/DEMO-SCRIPT.md`.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

**Exists** (unchanged at R81):

- `engine/*` — vendored at SHA `5a72371`; frozen. R81 does NOT modify, does NOT import any new symbol.
- `demos/scenarios/*.json` (× 8) — frozen at R80 close `0eb371f`. R81 does NOT modify or regenerate; the build tool emits byte-identical JSON.
- `tools/demo-scenario.ts`, `tools/coverage-saturation.ts`, `tools/detector-envelope.ts`, `tools/detection-curve.ts`, `tools/topology-walk-tuning.ts` — frozen.
- R79+R80 structural dashboard elements (`live-verdict-banner`, `metrics-panel`, `detectors-panel`, `det-fam-A..E` rows, `provenance-panel`, `tessera-tagline`, `:root --tessera-*` block, `@media print` block) — preserved verbatim by R81 (extended additively).
- R79+R80 top-level schema fields in scenario JSONs (`detector_families`, `threshold_crossing_log`, `provenance_receipts`, `per_window_detectors`) — preserved verbatim.

**Created** (R81-new):

- `test/q81-slice-2-close.test.ts` — TDD RED-first file binding 14 ACs.
- `demos/DEMO-SCRIPT.md` — 10-minute demo walkthrough script (Implementer-authored at GREEN per spec § 4.2 prescription).
- `coordination/specs/Q-R81-SPEC.md` + `Q-R81-SPEC-AUDIT.md` + `Q-R81-EMPIRICAL.sh` — this Architect commit.
- `coordination/reviews/REVIEWER-REPORT-R81.md` — created by Reviewer at audit time.

**Changes** (R81-modified):

- `tools/build-canned-demos.ts` — additive extension:
  - `HTML_TEMPLATE_HEAD`: add CSS transitions on `.det-fam`/`.badge`/`#live-verdict-status` + `body.scrubbing` override + scrubber CSS rule + `.provenance-receipt > summary` styling; add `<input type="range" id="window-scrubber">` inside `#tessera-controls`.
  - `HTML_TEMPLATE_FOOTER`: add `windowScrubber` DOM ref + scrubber event listeners + document-level keydown handler + `manualStep(delta)` helper + rewrite `renderAuditForWindow` → `rebuildAuditUpToCurrentWindow` + change `renderProvenancePanel` to create `<details>` per receipt + sync scrubber value on every `render()`.
- `demos/demo.html` — regenerated by build tool. The JSON-data block (between `BEGIN-TESSERA-SCENARIO-DATA` and `END-TESSERA-SCENARIO-DATA`) is byte-identical to R80 close (build tool emits same JSON since scenarios are not modified); the `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER` regions absorb R81 additions.
- `README.md` — append ≤ 30 lines: a "Quick demo" section documenting scrubber + keyboard shortcuts + pointing at `demos/DEMO-SCRIPT.md`.
- `package.json` — OPTIONAL; no new deps; Implementer may extend scripts section if needed (e.g., a `pnpm demo` alias) but the existing R71+R79 scripts are sufficient.

**Deletes:** none.

### 1.2 Layout architecture (Architect-picked; Implementer does NOT re-decide)

The R80 layout is preserved verbatim. R81 ONLY:

1. **Inserts** a single `<input type="range" id="window-scrubber">` element inside `#tessera-controls`, immediately AFTER the `<select id="speed-selector">…</select>` block and BEFORE the `<span id="window-indicator">…</span>`. The scrubber visually occupies horizontal space between speed selector and window indicator (flex layout already in `#tessera-controls`).
2. **Adds** the CSS rules enumerated in § 2.3.
3. **Adds** the JS extensions enumerated in § 4.1.
4. **Replaces** R80's flat `<div class="provenance-receipt">` (one per receipt in `renderProvenancePanel`) with `<details class="provenance-receipt">` containing `<summary>` (header) + the existing reasoning `<div>` + the existing `<pre>` evidence. The OUTER `<details id="provenance-panel">` (R79) is unchanged.

### 1.3 Schema additions (R81)

**None.** R81 does NOT change scenario JSON schema. `schema_version` remains `'tessera-demo-v1'` (R71 baseline). The `windows[*].per_window_detectors`, `detector_families`, `threshold_crossing_log`, `provenance_receipts` shapes are all preserved verbatim. AC-R71-13 (HTML inlined JSON ≡ JSON files round-trip) continues to PASS because the build tool serializes the same JSON.

### 1.4 Architect pre-prediction table

| Metric | At R81 round-start `0eb371f` (pre-Implementer) | At R81 chore-A (post-Implementer GREEN) |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | `0` | `0` |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` `# tests` | `608` | `608 + 14 = 622` |
| same: `# pass` | `594` | `594 + 14 − 1 = 607` (AC-R80-14 forward-protection flip is the only new flip) |
| same: `# fail` | `10` (carry-forward set: AC-R36-21 + AC-R36-30 + AC-R36-31 + R65 sibling-dep + R66 sibling-dep + AC-R77-14 + AC-R77-17 + AC-R78-14 + AC-R79-8 + AC-R79-14) | `11` (above + AC-R80-14 forward-protection flip) |
| same: `# skipped` | `4` | `4` |
| `bash Q-R81-EMPIRICAL.sh` exit | `1` (Block 2 fails — `demos/DEMO-SCRIPT.md` + `test/q81-*.ts` absent; Block 3 fails — fail count 10 ≠ expected 11) | `0` (all 4 blocks pass) |
| `git diff 0eb371f HEAD --name-only` line count | `0` | `8-12` (R81 deliverables) |

**Discriminating-AC threshold padding** (per R77 MINOR-4 + R71 MINOR-1 reinforcements): `# pass` predicted `607`; AC-R81-13 binding accepts `[605, 609]` (±2 PRNG-and-environment padding; node-test's TAP `# pass` field can drift ±1 across consecutive runs due to TAP suite-rollup vs subtest-rollup accounting, observed empirically across R77-R80). `# fail` predicted `11`; Block 3 enforces strict equality `=` per R53 MINOR-1 + R56 MINOR-1 two-state distinction (fail count is the discriminating value; a wrong test addition or anti-scope flip flips this away from 11).

**Forward-protection-AC audit (R79+R80 reinforcement; exhaustive across last 2 prior rounds' frozen-surface tests):**

- **R80 AC-R80-14** (`git diff 51a20b8 HEAD --name-only ⊆ R80 ALLOWED`): R80's ALLOWED regex hardcodes `test/q80-five-family-visualization\.test\.ts`, `coordination/specs/Q-R80-*`, `coordination/reviews/REVIEWER-REPORT-R80\.md`. R81 adds `test/q81-slice-2-close.test.ts`, `coordination/specs/Q-R81-*`, `coordination/reviews/REVIEWER-REPORT-R81.md`, `demos/DEMO-SCRIPT.md` — NONE of which are in R80's ALLOWED. **AC-R80-14 flips PASS → FAIL at R81 chore-A.**
- **R80 AC-R80-1** (`<div class="det-fam det-fam-{A..E}">` divs): R81 preserves all 5 divs unchanged. PASS.
- **R80 AC-R80-2** (`renderDetectorsPanel` queries `.det-fam-B..E`): R81 preserves this function unchanged. PASS.
- **R80 AC-R80-3/4/5/6/7/8** (Family-A scenario JSON shape + cross-scenario discrimination): R81 does NOT modify scenario JSONs. PASS.
- **R80 AC-R80-9** (`:root` block with ≥ 5 `--tessera-*` variables): R81 preserves the existing 24 vars; AC continues PASS.
- **R80 AC-R80-10** (`<p class="tessera-tagline">…Per-shard observation…`): R81 preserves. PASS.
- **R80 AC-R80-11** (`@media print` with ≥ 2 selectors): R81 preserves. PASS.
- **R80 AC-R80-12** (R79 backward-compat structural elements): R81 preserves. PASS.
- **R80 AC-R80-13** (`Q-R80-EMPIRICAL.sh` blocks): file unchanged. PASS.
- **R79 AC-R79-1 through AC-R79-13** (R79 structural elements + scenario JSON shape): R81 preserves. PASS.
- **R79 AC-R79-5** (outer `<details id="provenance-panel">` collapsed by default): R81 preserves the OUTER `<details>` unchanged; inner receipts change from `<div>` to `<details>`, but AC-R79-5's regex `<details\b([^>]*)\bid="provenance-panel"([^>]*)>` matches the outer container only. PASS.
- **R79 AC-R79-14** (already failing carry-forward; R79 ALLOWED doesn't include R80 or R81 paths): stays FAIL. No additional flip.
- **R79 AC-R79-8** (already failing carry-forward since R80 — `family_b/c/d/e === null` for every window; R81 does not touch scenario JSONs): stays FAIL. No additional flip.
- **R71 AC-R71-13** (HTML inlined JSON ≡ files round-trip): scenarios JSON not modified; same JSON inlined; round-trip identity preserved. PASS.
- **R71 SCENARIO_NAMES** (AC-R72-19 anti-regression on 8 scenario names): unchanged. PASS.

Net new flips at R81 chore-A: **+1 (AC-R80-14)**. Predicted `# fail` = 11.

### 1.5 Failure modes at each integration point

| Integration | Failure mode | Detection |
|---|---|---|
| `<input type="range">` with `value="0"` static + dynamic `max` set in `loadScenario` | Browser fires `'input'` event on every drag tick during `value` programmatic set → recursive render loop | Implementer wires programmatic value set to bypass the listener via a guard flag (`isSyncingScrubber`); spec § 4.1 names this guard pattern. |
| `'input'` vs `'change'` event handling | `'input'` fires continuously during drag; `'change'` fires only on release. Using `'change'` alone would feel laggy; using `'input'` alone leaves `body.scrubbing` class stuck if user doesn't release on a touch device | Spec § 4.1 wires BOTH: `'input'` updates state + adds `.scrubbing` class; `'change'` removes `.scrubbing` class. |
| `document.addEventListener('keydown', …)` intercepting form inputs | Pressing Space while focus is on `<select id="scenario-selector">` would toggle play instead of opening dropdown | Spec § 4.1 prescribes early-exit when `ev.target.tagName` ∈ {`INPUT`, `SELECT`, `TEXTAREA`} or `ev.target.isContentEditable` is true. |
| `ev.code === 'Space'` vs `ev.key === ' '` | `ev.code` returns the physical-key identifier (`'Space'`); `ev.key` returns `' '` (a literal space character). Browser support is universal but the comparison literal differs | Spec § 4.1 uses `ev.code === 'Space'` (physical key; matches DS pattern; works on non-US keyboard layouts). |
| `ev.preventDefault()` on Space when target is `<body>` | Without prevent, Space scrolls the page (the default action). With prevent, the user's expected media-player behavior happens | Spec § 4.1 prescribes `ev.preventDefault()` for Space + Arrow keys when the handler claims them. |
| `renderProvenancePanel` change from `<div>` to `<details>` | If any test or downstream code queries `provenanceBodyEl.children[i].tagName === 'DIV'`, it would fail. No such test exists (verified via grep). | Spec § 9.5 cross-section consistency pass. |
| Audit-list rebuild on every render | If `rebuildAuditUpToCurrentWindow` is slow for window 29 (max 30 windows × ~2 events/window ≈ 60 DOM-create calls), perceived performance could lag | 60 DOM-create calls per render is well under 1ms on any modern browser; non-issue. |
| `body.scrubbing` class persisting after a touchscreen scrub that ends without a `'change'` event | Edge case: some mobile browsers don't emit `'change'` on touchend if the value didn't change | Spec § 4.1 prescribes a defensive `'pointerup'` + `'touchend'` listener to also clear `body.scrubbing`. Optional; non-load-bearing. |
| `Q-R81-EMPIRICAL.sh` Block 3 grep pattern misalignment with `--test-reporter=tap` output | Per R77 lesson: invocation must include `--test-reporter=tap`; otherwise `^# pass` lines are absent | Spec § 4.3 verbatim-includes `--test-reporter=tap` in Block 3 invocation; § 9.7 records empirical probe-run validation at spec-emit. |
| AC-R81-14 regex unduly broad → silently accepts unauthorized paths | Per R44 MINOR-3 / R46 MINOR-1+2 / R65 MINOR-2: use `^…$` anchors + explicit literals | § 3.2 ALLOWED_SET regex audited at § 9.4. |
| `demos/DEMO-SCRIPT.md` ≥ 150 lines threshold | Implementer could emit a sparse skeleton hitting the line threshold via blank lines. AC-R81-11 requires N ≥ 8 "Click:" or "Say:" cues to discriminate real content from skeleton | Spec § 4.2 prescribes content density; § 5.1 AC-R81-11 binds. |

### 1.6 Visual identity decisions (Architect-picked; preserves R80 visual identity)

- **Color palette:** unchanged from R80. R81 uses existing `--tessera-fam-{a,b,c,d,e}` CSS variables (and `.det-fam-{A..E}` left-border-color rules) for per-family color coding. No new colors.
- **Per-family color coding** (directive item 6): the directive's "distinct accent colors within R80 visual identity palette" is ALREADY SATISFIED at R80 close — each `.det-fam-A` has `border-left: 3px solid #58a6ff` (blue), `.det-fam-B` `#3fb950` (green), `.det-fam-C` `#a371f7` (purple), `.det-fam-D` `#d29922` (orange), `.det-fam-E` `#f78166` (coral). R81 adds AC-R81-12 to bind that these 5 distinct accent colors remain present (anti-regression).
- **Scrubber accent:** `accent-color: var(--tessera-accent-blue)` (existing R80 var = `#58a6ff`).
- **Transition timing:** 200ms ease per directive ("200ms CSS transitions on M_t changes"). Spec § 2.3 prescribes the exact rule.
- **Scrubber sizing:** `flex: 1 1 200px; max-width: 320px;` — scrubber takes available flex space inside `#tessera-controls`, capped at 320px so it doesn't crowd the speed selector or window indicator.

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 Scrubber state model (Architect-picked; Implementer copies verbatim)

The dashboard's existing IIFE has `currentWindowIdx` as the single window-state variable. R81 keeps this the canonical state; the scrubber's `value` is bidirectionally synced with `currentWindowIdx`:

- **Scrubber → state:** on `'input'` event, `currentWindowIdx = parseInt(windowScrubber.value, 10) || 0; render();`
- **State → scrubber:** at the end of `render()` (or alternatively at the top), `if (windowScrubber) windowScrubber.value = String(currentWindowIdx);` — but this set MUST NOT re-fire the `'input'` listener via a guard flag.

Guard pattern (verbatim):
```js
var isSyncingScrubber = false;
function syncScrubberPosition() {
  if (!windowScrubber) return;
  isSyncingScrubber = true;
  windowScrubber.value = String(currentWindowIdx);
  isSyncingScrubber = false;
}
```

Scrubber listeners use the guard:
```js
windowScrubber.addEventListener('input', function () {
  if (isSyncingScrubber) return;
  stopPlay();
  document.body.classList.add('scrubbing');
  currentWindowIdx = parseInt(windowScrubber.value, 10) || 0;
  render();
});
windowScrubber.addEventListener('change', function () {
  document.body.classList.remove('scrubbing');
});
```

Architect verification (cite-then-walk): modern browsers (Chrome 90+, Firefox 88+, Safari 14+) DO fire `'input'` on programmatic `value` assignment via JS, per [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/input.html#the-input-event) — therefore the guard is load-bearing. Spec § 4.1 includes it verbatim.

### 2.2 Audit-list rebuild semantics

The R71/R79 audit-list is append-only via `renderAuditForWindow(scenarioData, currentWindowIdx)` (defined at `tools/build-canned-demos.ts:1563`), called inside `tick()`. Scrubbing backwards from window 29 to window 0 leaves window 29's audit entries visible.

R81 prescribes that `render()` rebuilds the audit list from window 0 through current window on every call. The existing `renderAuditForWindow` is replaced by:

```js
function rebuildAuditUpToCurrentWindow(scenarioData) {
  auditEl.innerHTML = '';
  if (!scenarioData || !scenarioData.windows.length) return;
  var wIdx = Math.min(currentWindowIdx, scenarioData.windows.length - 1);
  for (var i = 0; i <= wIdx; i++) {
    var events = scenarioData.windows[i].events;
    for (var j = 0; j < events.length; j++) {
      // appendAuditEntry inserts at top of <ul>; preserves R79 visual order
      // (newest-first across windows; within a window, events in array order).
      appendAuditEntry('[w' + i + '] ' + JSON.stringify(events[j]));
    }
  }
}
```

R71/R79 `tick()` flow is now:
```js
function tick() {
  // ... existing increment logic ...
  currentWindowIdx++;
  render();  // R81: render() includes audit rebuild; no separate renderAuditForWindow call
}
```

`render()` is extended to call `rebuildAuditUpToCurrentWindow(scenarioData)` instead of relying on append-only `renderAuditForWindow`. The `appendAuditEntry` helper is preserved (still inserts at top of `<ul>`).

### 2.3 CSS transitions + scrubber CSS (load-bearing; verbatim)

Append to the existing `<style>` block in `HTML_TEMPLATE_HEAD`, AFTER the existing `.det-fam-E { border-left: 3px solid #f78166; }` rule and BEFORE the existing `#provenance-panel { padding: 16px 24px; ... }` rule:

```css
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
```

The CSS rule names + selectors + property values above are prescribed verbatim. Implementer copies into the `<style>` block; tactical line-position within the block is at Implementer discretion provided the new rules land inside the `<style>...</style>` block.

### 2.4 Scrubber HTML + window-indicator coexistence

Replace the line:
```html
    <span id="window-indicator">window 0 / 30</span>
```
inside `#tessera-controls` (currently at `tools/build-canned-demos.ts:1336`) with:
```html
    <input type="range" id="window-scrubber" min="0" max="29" step="1" value="0" aria-label="Scrub to window">
    <span id="window-indicator">window 0 / 30</span>
```

The scrubber appears LEFT of the indicator. `aria-label` provides accessible name (no separate `<label>` element needed; matches R79 controls' minimal-affordance style). `max="29"` is the static fallback for the 30-window scenarios; the JS updates `max` dynamically in `loadScenario` (§ 4.1.5).

### 2.5 Keyboard shortcut model (verbatim)

A single `document`-level `keydown` listener handles all four shortcuts. Form-input focus is respected via early-exit:

```js
document.addEventListener('keydown', function (ev) {
  // Don't intercept keystrokes while user is in a form input or content-editable surface
  if (ev.target && ev.target.tagName) {
    var t = ev.target.tagName.toUpperCase();
    if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
  }
  if (ev.target && ev.target.isContentEditable) return;
  switch (ev.code) {
    case 'Space':
      ev.preventDefault();
      if (playing) stopPlay(); else startPlay();
      break;
    case 'ArrowRight':
      ev.preventDefault();
      if (playing) stopPlay();
      manualStep(1);
      break;
    case 'ArrowLeft':
      ev.preventDefault();
      if (playing) stopPlay();
      manualStep(-1);
      break;
    case 'KeyR':
      ev.preventDefault();
      stopPlay();
      currentWindowIdx = 0;
      clearPanels();
      var sd = scenarios[currentName];
      if (sd) renderProvenancePanel(sd);
      render();
      break;
  }
});
```

`manualStep(delta)` is a new helper:
```js
function manualStep(delta) {
  var sd = scenarios[currentName];
  if (!sd) return;
  var maxIdx = sd.windows.length - 1;
  currentWindowIdx = Math.max(0, Math.min(maxIdx, currentWindowIdx + delta));
  render();
}
```

`render()` already syncs `windowScrubber.value` via `syncScrubberPosition()` (§ 2.1), so the scrubber tracks keyboard-driven steps.

### 2.6 Provenance-receipt collapsible per-firing layout (verbatim)

Replace the receipt-card generation in `renderProvenancePanel` (currently at `tools/build-canned-demos.ts:1696`, creating `<div class="provenance-receipt">`):

```js
function renderProvenancePanel(scenarioData) {
  provenanceBodyEl.innerHTML = '';
  var receipts = (scenarioData.provenance_receipts) || [];
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
    var card = document.createElement('details');  // R81: was 'div'
    card.className = 'provenance-receipt';
    // R81: collapsed by default (no `open` attribute)
    var sum = document.createElement('summary');
    sum.className = 'pr-header';
    sum.textContent = '[' + r.event_id + '] ' + r.shard_id + ' · Family ' + r.family + ' · window ' + r.window;
    var rs = document.createElement('div'); rs.className = 'pr-reasoning';
    rs.textContent = r.reasoning;
    var ev = document.createElement('pre'); ev.className = 'pr-evidence';
    ev.textContent = JSON.stringify(r.evidence, null, 2);
    card.appendChild(sum);
    card.appendChild(rs);
    card.appendChild(ev);
    provenanceBodyEl.appendChild(card);
  }
}
```

Verbatim differences from R79 implementation: (a) `createElement('details')` not `'div'`; (b) the existing R79 `pr-header` `<div>` is repurposed as the `<summary>` element (R79's CSS for `.provenance-receipt .pr-header` continues to apply via the cascade — both `<summary>` and `<div>` can carry the class); (c) all three child elements (`<summary>` + reasoning `<div>` + evidence `<pre>`) appended in order so the summary renders first (and is the click target) while reasoning + evidence are collapsed until the user clicks.

### 2.7 README "Quick demo" section (verbatim minimum content)

Append to README.md, AFTER any existing section, ≤ 30 lines:

```markdown
## Quick demo

Open `demos/demo.html` directly in any modern browser — no server required. Eight pre-recorded
scenarios cover clean, drift, common-mode, event-conditional, FDR, hierarchical, sparse, and
topology-spanning behaviors. Each runs deterministically from an LCG-seeded synthetic substrate.

### Controls

- **Scrubber** — drag the slider in the top controls to jump to any window (0 through 29).
  Scrubbing pauses playback automatically; release the slider to resume manual control.
- **Keyboard** — `space` toggles play/pause; `→` and `←` step forward and backward one window;
  `r` resets the current scenario.
- **Speed** — 1×, 2×, 4× playback (500ms / 250ms / 125ms per window).
- **Per-firing receipts** — the provenance panel collapses individual firing receipts; click
  any receipt summary to expand its evidence JSON.

### 10-minute walkthrough

See [`demos/DEMO-SCRIPT.md`](demos/DEMO-SCRIPT.md) for a minute-by-minute script that walks
through clean-baseline → SDC-drift → common-mode-rack → event-conditional with talking points
matched to the dashboard's per-tick state. Analogous to DeploySignal's `DEMO-SCRIPT-10MIN.md`.
```

The above is the verbatim minimum content; Implementer may extend with additional non-binding documentation provided the total addition stays ≤ 30 lines. AC-R81-7 binds presence of "Quick demo" heading + "Scrubber" or "scrubber" word + reference to "DEMO-SCRIPT.md".

---

## § 3. Component inventory + ALLOWED_SET

### 3.1 Component inventory (matches § 1.1 boundaries; explicit per-row)

| Path | State at R81 round-start `0eb371f` | R81 action | AC binding |
|---|---|---|---|
| `engine/*` | vendored at SHA `5a72371`; frozen | NO modification | implicit via AC-R81-14 (anti-scope diff excludes `engine/*`) |
| `tools/build-canned-demos.ts` | R80 state — Family A active; B/C/D/E populated; visual identity + print stylesheet present | EXTEND additively (CSS rules, scrubber HTML element, JS for scrubber/keyboard/audit-rebuild/details-receipts) | AC-R81-1, -2, -3, -4, -5, -6 (indirect via regenerated `demos/demo.html`) |
| `demos/demo.html` | R80 state — 5-family viz + visual identity | REGENERATED by build tool; do NOT hand-edit | AC-R81-1, -2, -3, -4, -5, -6, -12 (direct grep on file content) |
| `demos/scenarios/*.json` (× 8) | R80 state | REGENERATED by build tool; byte-identical (scenarios are not modified) | none directly (R71 AC-R71-13 round-trip identity preserved) |
| `demos/DEMO-SCRIPT.md` | does not exist | NEW; Implementer-authored at GREEN per spec § 4.2 prescription | AC-R81-8, -9, -10, -11 |
| `package.json` | R71+R79+R80 state | OPTIONAL modification — Implementer may add scripts if useful; NO new deps | implicit via AC-R81-14 ALLOWED_SET inclusion |
| `README.md` | R71+R78+R79+R80 state | EXTEND additively — append "Quick demo" section per § 2.7 (≤ 30 lines) | AC-R81-7 |
| `test/q81-slice-2-close.test.ts` | does not exist | NEW; TDD RED-first per R23 IMPL MINOR-1 | AC-R81-1 through AC-R81-14 (the test file IS the AC bindings) |
| `coordination/specs/Q-R81-SPEC.md` | this file (NEW; this commit) | this Architect commit | implicit (committed before chore-A) |
| `coordination/specs/Q-R81-SPEC-AUDIT.md` | NEW; this commit | this Architect commit | implicit |
| `coordination/specs/Q-R81-EMPIRICAL.sh` | NEW; this commit | this Architect commit | AC-R81-13 (binding-command attestation block presence) |
| `coordination/reviews/REVIEWER-REPORT-R81.md` | does not exist | NEW; Reviewer | implicit via AC-R81-14 ALLOWED_SET inclusion |
| `coordination/NEXT-ROLE.md` | R80 state + R81 directive | appended per role | implicit via AC-R81-14 |
| `coordination/MEMORIAL.md` | active phase shard | appended per role | implicit via AC-R81-14 |
| `coordination/MEMORIAL-PHASE-[0-9]+.md` | frozen historical shards (Phase 1: R01-R19; Phase 2: R20-R41) | NO modification | implicit via AC-R81-14 |
| `coordination/logs/ROUND-R81-{ROUTING,SUMMARY}.md` | `coordination/logs/ROUND-R81-ROUTING.md` exists (untracked); other pipeline-emitted | implicit; pipeline-emitted | implicit via AC-R81-14 |
| `coordination/diagnostics/DIAGNOSTIC-R81-*.md` | does not exist | created only on halt | implicit via AC-R81-14 |
| `CLAUDE-*.md` files | repo-rooted | Memorial-Updater may append REINFORCED lines | implicit via AC-R81-14 |

### 3.2 ALLOWED_SET regex (machine-checkable; used by EMPIRICAL.sh Block 4 and AC-R81-14)

```
^(demos/demo\.html|demos/scenarios/[a-z-]+\.json|demos/DEMO-SCRIPT\.md|tools/build-canned-demos\.ts|package\.json|README\.md|test/q81-slice-2-close\.test\.ts|coordination/specs/Q-R81-SPEC\.md|coordination/specs/Q-R81-SPEC-AUDIT\.md|coordination/specs/Q-R81-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R81\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

Anchored `^...$` per R44/R46 discriminating-regex reinforcement. Forward-protective entries (`diagnostics/DIAGNOSTIC-R[0-9]+-...`, `logs/ROUND-R[0-9]+-...`) match any round number so a follow-up round's diagnostic does not retroactively flip AC-R81-14.

The ALLOWED_SET adds `demos/DEMO-SCRIPT\.md` to R80's ALLOWED set; this is the only new file outside the `coordination/specs/Q-R81-*` triad.

---

## § 4. Per-file pseudocode

### 4.1 `tools/build-canned-demos.ts` extensions

Per R80 spec convention, the Implementer reads R80's existing file in full and pastes new additions at the indicated insertion points. Tactical details (variable names inside helper functions; exact line numbers; blank-line spacing) remain at Implementer discretion per the role boundary; structural prescriptions (CSS rule names + selectors; JS function names; event-listener types; HTML element attributes) are load-bearing and copied verbatim.

#### 4.1.1 CSS extensions in `HTML_TEMPLATE_HEAD`

Insert the CSS block from § 2.3 inside the existing `<style>` tag. Recommended insertion point: AFTER the existing `.det-fam-E { border-left: 3px solid #f78166; }` rule (currently around `tools/build-canned-demos.ts:1288`) and BEFORE the existing `/* R79: provenance panel */` comment + `#provenance-panel { ... }` rule (currently around line 1289-1290). The `@media print` block stays in place (it already handles `details` element open-state correctly).

#### 4.1.2 Scrubber HTML inside `#tessera-controls`

Replace the single line at `tools/build-canned-demos.ts:1336` (currently `    <span id="window-indicator">window 0 / 30</span>`) with the two-line block from § 2.4:

```html
    <input type="range" id="window-scrubber" min="0" max="29" step="1" value="0" aria-label="Scrub to window">
    <span id="window-indicator">window 0 / 30</span>
```

The two lines must appear inside the existing `<section id="tessera-controls">...</section>` block. Indentation should match the existing `<button>` / `<select>` indentation pattern (4-space body indent per the template).

#### 4.1.3 JS extensions — new DOM ref, scrubber guard, listeners, helper

Inside the existing IIFE (`HTML_TEMPLATE_FOOTER`, starting at `tools/build-canned-demos.ts:1397`), add:

- Below the existing `var detectorsBodyEl = document.getElementById('detectors-body');` line (the R79 DOM refs block), add:
  ```js
  var windowScrubber = document.getElementById('window-scrubber');
  ```

- Below the existing `var baseIntervalMs = 500;` state block, add:
  ```js
  var isSyncingScrubber = false;
  ```

- Add helper `syncScrubberPosition` (verbatim per § 2.1) and `manualStep(delta)` (verbatim per § 2.5) as new function declarations in the IIFE. Recommended placement: just above the existing `function render() {` declaration.

- Inside the existing `render()` function body, at the END (after `if (currentWindowIdx >= scenarioData.windows.length - 1) { renderReasoningAndActions(scenarioData); }`), add:
  ```js
  syncScrubberPosition();
  ```

- Replace the existing `function renderAuditForWindow(...) { ... }` body with the `rebuildAuditUpToCurrentWindow(scenarioData)` body per § 2.2. Either rename the function (and update its single existing call site inside `tick()`) OR keep the name `renderAuditForWindow` and change its body to ignore the `windowIdx` parameter and rebuild from 0 through `currentWindowIdx`. Implementer chooses (tactical autonomy). Preferred per architect: rename to `rebuildAuditUpToCurrentWindow` for clarity.

- Inside `tick()` (existing at `tools/build-canned-demos.ts:1734-1751` approx), remove the `renderAuditForWindow(scenarioData, currentWindowIdx);` call IF the new `render()` calls `rebuildAuditUpToCurrentWindow` internally. Both options are acceptable; the spec prescribes that audit rebuild happens once per render(), not zero times and not twice.

- Update `render()` to call `rebuildAuditUpToCurrentWindow(scenarioData)` (or the renamed equivalent) BEFORE `updateWindowIndicator(scenarioData)`.

- Add scrubber event listeners (verbatim per § 2.1) and document-level keydown listener (verbatim per § 2.5). Recommended placement: inside the existing `// ── Event listeners ──` comment block (currently around `tools/build-canned-demos.ts:1779`), after the existing `speedSel.addEventListener('change', …);` line.

- Inside the existing `loadScenario(name)` function, ABOVE the existing `clearPanels();` call, add:
  ```js
  if (windowScrubber) {
    isSyncingScrubber = true;
    windowScrubber.max = String(Math.max(0, (scenarios[currentName] || { windows: [] }).windows.length - 1));
    windowScrubber.value = '0';
    isSyncingScrubber = false;
  }
  ```

#### 4.1.4 `renderProvenancePanel` change — `<details>` per receipt

Replace the existing `renderProvenancePanel(scenarioData)` body (currently at `tools/build-canned-demos.ts:1696-1721`) with the body verbatim from § 2.6.

#### 4.1.5 No changes to `composeScenarioJson`, scenario-population functions, or `buildOutputs`

R81 does NOT touch the build-tool's data-emission path. Scenarios are regenerated to BYTE-IDENTICAL JSON. The only changes are in `HTML_TEMPLATE_HEAD` and `HTML_TEMPLATE_FOOTER`.

### 4.2 `demos/DEMO-SCRIPT.md` content (verbatim structural skeleton; Implementer fleshes out)

The Implementer creates `demos/DEMO-SCRIPT.md` with the following structural skeleton — exact heading text + outline order are prescribed, body text is at Implementer discretion provided AC-R81-9 + AC-R81-10 + AC-R81-11 are satisfied:

```markdown
# Tessera Demo — 10-minute walkthrough

_Authored R81 for SLICE 2 close. Companion to `demos/demo.html` (no server required;
opens from `file://`). Analogous to DeploySignal's `DEMO-SCRIPT-10MIN.md`._

## Before you start

[2-5 lines: how to open the dashboard, what audience-context to set, what pre-context tabs to open.]

## Default spine (technical-peer audience)

Clean-baseline → SDC-drift → Common-mode-rack → Event-conditional → close.

[1-3 lines on substitutions for SRE-lead or engineering-director audiences.]

---

## Minute 0:00 – 2:00 — Clean-baseline (trust establishment)

**Click:** dropdown to "Clean baseline (no firings)"; press Play (or Space).

**Say:**
> [Framing paragraph — ≥ 3 sentences — establishing what Tessera is, why N=10 shards × 30 windows
> at α=0.005 is the substrate, what "clean" means in Family A betting-e-process terms.]

**Pause beat (1-2 seconds).**

> [Closing-of-section sentence: what the operator should have absorbed by minute 2.]

**Handoff cue:** click dropdown to "SDC drift on shard-04."

---

## Minute 2:00 – 4:00 — SDC-drift (Family A betting wealth crossing threshold)

**Click:** Start SDC-drift; let it run through windows 0–22.

**Say:**
> [Setup paragraph — ≥ 3 sentences — explaining the SDC injection on shard-04, the per-shard
> betting-e-process update, why M_t crosses 200 only on shard-04 by window ~23, and what the
> threshold = log₁₀(200) ≈ 2.301 horizontal line represents.]

**Point at:** [the SDC-drift shard's path; the Family A detector status row turning FIRING; the
provenance receipt expanding on click.]

> [Closing paragraph — what the architectural beat says: per-shard isolation + Ville-bounded
> false-alarm at α = 0.005.]

**Pause beat (2-3 seconds).**

**Handoff cue:** click dropdown to "Common-mode (rack-localized)."

---

## Minute 4:00 – 6:00 — Common-mode-rack (topology attribution)

**Click:** Start common-mode-rack.

**Say:**
> [Setup paragraph — ≥ 3 sentences — explaining BFS-on-undirected topology attribution, the
> v9Y multi-rack cluster substrate, what "common-mode candidate" means at the
> `engine/topology/common-mode-attribution.ts` boundary.]

**Point at:** [the common-mode candidate that surfaces in the provenance panel at the terminal
window; the candidate's shared topology node + member shards.]

> [Closing paragraph — what differentiates topology-aware attribution from N independent
> per-shard alerts.]

**Pause beat (2 seconds).**

**Handoff cue:** click dropdown to "Event-conditional freeze."

---

## Minute 6:00 – 8:00 — Event-conditional (freeze-hook + DS integration)

**Click:** Start event-conditional.

**Say:**
> [Setup paragraph — ≥ 3 sentences — explaining the deploy-event injection from
> `engine/ds-integration/event-feed.ts` consumer surface, the freeze-hook factory at
> `engine/events/freeze-hook.ts`, why the freeze window prevents per-shard residual absorption
> of the event-driven drift.]

**Point at:** [the verdict-banner status flipping to "frozen"; the live-tick indicator advancing
through the freeze window; the audit trail entry recording the deploy event.]

> [Closing paragraph — Addition #26 D4 `correlational_not_causal: true` preserved; DS integration
> contract = the load-bearing decoupling between Tessera's per-shard observation layer and DS's
> event-conditional correlation layer.]

**Pause beat (3 seconds).**

**Handoff cue:** dropdown back to clean-baseline, or close.

---

## Minute 8:00 – 10:00 — Close (methodology + coverage envelope)

**Say:**
> [Recap paragraph — ≥ 3 sentences — naming the four scenarios just shown and what architectural
> beat each one exercised.]

**Pause beat (1-2 seconds).**

> [Methodology paragraph — ≥ 4 sentences — naming three or four load-bearing methodology pieces:
> e.g., (a) Ville-bounded any-time-valid e-process (per-shard FPR); (b) e-BH FDR operator
> surface (fleet-FPR); (c) topology-overlay BFS-on-undirected attribution; (d) deterministic
> LCG-seeded synthetic substrate (reproducibility).]

**Pause beat (2 seconds).**

> [Coverage envelope paragraph — ≥ 3 sentences — naming what's IN scope for Tessera (per-shard
> observation; topology-aware attribution; event-conditional decoupling) and what's
> TAGGED-FUTURE or DEFERRED (live-cluster validation; DS npm engine extract; multi-region
> federation per A15).]

**Pause beat (2 seconds).**

> [Final beat — 1-2 sentences — hand the floor back. "Questions?"]

---

## Bank of follow-up questions + responses

[OPTIONAL section; presence not AC-bound. Implementer may add 3-5 anticipated questions with
short answers (Tessera vs DeploySignal; vendor sequencing; real-cluster validation gating;
calibration provenance; methodology comparisons).]

## Pacing notes

[OPTIONAL section; presence not AC-bound. Implementer may add 3-5 bullets on demo pacing,
recovery if running over/under, audience-specific substitutions.]

## What I need to rehearse specifically

[OPTIONAL section; presence not AC-bound. Implementer may add 2-3 bullets on the most
brittle delivery beats.]
```

Density requirements (AC-R81-11): the DEMO-SCRIPT.md must contain ≥ 8 lines matching `^\*\*Click:\*\*` OR `^\*\*Say:\*\*` (matching the cue patterns across the 5 sections — each of the 4 demo sections has ≥ 1 Click + ≥ 1 Say, plus the close has ≥ 2 Say; total ≥ 8 cue lines). Implementer may exceed this density.

Line-count requirement (AC-R81-10): DEMO-SCRIPT.md ≥ 150 lines (a fully-fleshed structural skeleton with the verbatim 5 timing sections + reasonable paragraph density delivers ~180-220 lines).

### 4.3 `Q-R81-EMPIRICAL.sh` pseudocode

Same 4-block structure as R80 (R77 lesson: Block 3 uses `--test-reporter=tap`). Expected counts at chore-A: `# pass` in `[605, 609]`; `# fail = 11` (strict equality). Block 4 ALLOWED regex matches § 3.2 verbatim. The block-pseudocode follows R80's `Q-R80-EMPIRICAL.sh` exactly except for: (a) `ROUND_START_SHA="0eb371f"`; (b) `EXPECTED_PASS_MIN=605`, `EXPECTED_PASS_MAX=609`, `EXPECTED_FAIL=11`; (c) Block 2 artifact list adds `demos/DEMO-SCRIPT.md` + `test/q81-slice-2-close.test.ts` + the 3 Q-R81-* files; (d) Block 4 ALLOWED regex = § 3.2 verbatim.

The full text of `Q-R81-EMPIRICAL.sh` is written as a separate spec-triad file in the same commit as this spec. The Architect runs `bash coordination/specs/Q-R81-EMPIRICAL.sh` at spec-emit time against round-start HEAD; expected outcome at round-start: Block 1 PASS (tsc exit 0), Block 2 FAIL (Implementer artifacts absent), Block 3 FAIL (fail count is 10, not yet 11; pass count is 594, not in [605, 609]), Block 4 PASS (diff is empty). This is the pre-Implementer probe-run baseline. § 9.7 records it.

### 4.4 `test/q81-slice-2-close.test.ts` pseudocode

14 ACs, one `test()` block per AC. Imports verbatim (per R80 pattern):
```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'demos', 'demo.html');
const DEMO_SCRIPT_PATH = path.join(ROOT, 'demos', 'DEMO-SCRIPT.md');
const README_PATH = path.join(ROOT, 'README.md');
const EMPIRICAL_SH_PATH = path.join(ROOT, 'coordination', 'specs', 'Q-R81-EMPIRICAL.sh');
const ROUND_START_SHA = '0eb371f';
```

Test assertions are structural (grep on file content); no runtime browser evaluation. See § 5.1 AC table for the binding-command-to-assertion mapping.

---

## § 5. Acceptance criteria

### 5.1 AC table (14 ACs)

| AC | Given | When | Then |
|---|---|---|---|
| AC-R81-1 | `demos/demo.html` | scrubber HTML element check | committed HTML contains exactly one `<input` element whose attributes include `type="range"` AND `id="window-scrubber"` (regex `/<input[^>]*\btype="range"[^>]*\bid="window-scrubber"/` OR `/<input[^>]*\bid="window-scrubber"[^>]*\btype="range"/`); element appears INSIDE the `<section id="tessera-controls">…</section>` block |
| AC-R81-2 | `demos/demo.html` | scrubber event listener check on embedded JS | committed HTML's `<script>` body contains `windowScrubber.addEventListener('input'` AND `windowScrubber.addEventListener('change'` (both event types wired) |
| AC-R81-3 | `demos/demo.html` | keyboard event listener check | committed HTML's `<script>` body contains `document.addEventListener('keydown'` AND its body references all four of these `ev.code` values as case literals: `'Space'`, `'ArrowRight'`, `'ArrowLeft'`, `'KeyR'` (regex: `/'Space'/` AND `/'ArrowRight'/` AND `/'ArrowLeft'/` AND `/'KeyR'/`, each ≥ 1 match in the file) |
| AC-R81-4 | `demos/demo.html` | CSS transition rule check | committed HTML's `<style>` block contains at least one rule with selector `.det-fam` (or comma-separated list including `.det-fam`) AND property value `transition:` ... `200ms` ... (regex: `/\.det-fam[\s\S]{0,400}transition:[^;]*200ms/`) |
| AC-R81-5 | `demos/demo.html` | scrubbing-class override check | committed HTML's `<style>` block contains a selector `body.scrubbing` AND that rule body contains `transition:` followed by `none` (regex: `/body\.scrubbing[\s\S]{0,400}transition:\s*none/`) |
| AC-R81-6 | `demos/demo.html` | provenance-receipt `<details>` JS pattern check | committed HTML's `<script>` body in the function whose body contains `provenance-receipt` ALSO contains `createElement('details')` (regex: `/createElement\('details'\)[\s\S]{0,200}provenance-receipt/` OR `/provenance-receipt[\s\S]{0,200}createElement\('details'\)/`) — verifying that the receipt-card factory creates a `<details>` element rather than a `<div>` |
| AC-R81-7 | `README.md` | quick-demo section check | README contains a heading `## Quick demo` (regex: `/^## Quick demo/m`) AND the section's body contains `scrubber` (case-insensitive: regex `/scrubber/i`) AND contains a reference to `DEMO-SCRIPT.md` (regex: `/DEMO-SCRIPT\.md/`) |
| AC-R81-8 | filesystem | DEMO-SCRIPT.md existence + non-empty check | `demos/DEMO-SCRIPT.md` exists AND its content length is > 1000 bytes |
| AC-R81-9 | `demos/DEMO-SCRIPT.md` | 5 minute-section heading check | file content contains all 5 of these regex patterns: `/Minute 0:00\s*[–-]\s*2:00/`, `/Minute 2:00\s*[–-]\s*4:00/`, `/Minute 4:00\s*[–-]\s*6:00/`, `/Minute 6:00\s*[–-]\s*8:00/`, `/Minute 8:00\s*[–-]\s*10:00/` (the en-dash `–` or hyphen `-` accepted; whitespace tolerant) |
| AC-R81-10 | `demos/DEMO-SCRIPT.md` | line-count threshold | file line count (`content.split('\n').length`) ≥ 150 |
| AC-R81-11 | `demos/DEMO-SCRIPT.md` | content-density check | file content contains ≥ 8 lines matching the cue pattern `^\*\*(Click|Say):\*\*` (multi-line regex: `(content.match(/^\*\*(?:Click|Say):\*\*/gm) ?? []).length >= 8`) |
| AC-R81-12 | `demos/demo.html` | R79+R80 anti-regression check (composite) | committed HTML contains ALL of: `<section[^>]*\bid="live-verdict-banner"`, `<div[^>]*\bid="metrics-panel"[^>]*\bclass="[^"]*metrics-panel`, `<details\b([^>]*)\bid="provenance-panel"([^>]*)>` with NO `open` attribute on the outer `<details id="provenance-panel">`, `class="tessera-tagline"`, `:root\s*\{`, `@media print\s*\{`, AND all five `class="det-fam det-fam-{A,B,C,D,E}` divs, AND all five distinct family border colors `border-left:\s*3px\s*solid\s*(#58a6ff|#3fb950|#a371f7|#d29922|#f78166)` (≥ 5 matches via `match(/border-left:\s*3px solid (#58a6ff|#3fb950|#a371f7|#d29922|#f78166)/g)`) |
| AC-R81-13 | `coordination/specs/Q-R81-EMPIRICAL.sh` | block-presence parse | file content contains `pnpm exec tsc -p tsconfig.test.json` AND `node --test --test-reporter=tap` AND `ALLOWED=` AND the regex `demos/DEMO-SCRIPT\\\.md` (as part of the ALLOWED pattern — the test inspects the script content; the literal in the script is `demos/DEMO-SCRIPT\.md` inside a single-quoted bash string, so the file's bytes contain `demos/DEMO-SCRIPT\.md`) AND `test/q81-slice-2-close\\\.test\\\.ts` (similarly) |
| AC-R81-14 | round-start SHA `0eb371f` and current HEAD | the diff is computed | every file in `git diff 0eb371f HEAD --name-only` matches the § 3.2 ALLOWED_SET regex (the test loads the regex via the same anchored literal as § 3.2 + EMPIRICAL.sh Block 4) |

### 5.2 Implicit AC (Implementer chore-A binding-command attestation; per Rule 1 empirical-command-attestation)

The Implementer attestation in `coordination/NEXT-ROLE.md` (Implementer outputs → Reviewer routing block) MUST record the ACTUAL observed values from `bash coordination/specs/Q-R81-EMPIRICAL.sh` at chore-A HEAD:

- `tsc` exit code (Architect prediction: `0`)
- node test process exit code (prediction: `0`; node --test exits 0 with subtest failures)
- TAP `# tests`, `# pass`, `# fail`, `# skipped` summary line values (predictions: `622 / 607 / 11 / 4` per § 1.4)
- `git diff 0eb371f HEAD --name-only` line count (prediction: 8-12)
- `bash Q-R81-EMPIRICAL.sh` exit code (prediction: `0`)

If any observed value differs MATERIALLY from the prediction (note: `# pass` allows ±2 padding per § 1.4 + AC-R81-13 binding range; `# fail` is strict-equality at 11), the Implementer HALTs and writes a DIAGNOSTIC per cross-project Rule 1 (R26 MAJOR-1 / R72 CRITICAL-1 / R77 / R79 MAJOR-1 / R70 MINOR-1 lineage).

### 5.3 Acknowledged AC gaps + mitigations (per R74 MINOR-2 reinforcement)

Documented gaps that the AC suite does NOT structurally test, paired with explicit mitigations:

1. **Per-tick browser DOM behavior of the scrubber** — AC-R81-1 + AC-R81-2 confirm the element exists and the JS wires both `input` and `change` listeners; the actual user-drag → window-state mutation → re-render pipeline is not observed in Node tests. **Mitigation:** Reviewer is asked to open `file:///…/demos/demo.html` in a browser, drag the scrubber from window 0 to window 29, and verify (a) the chart's shard paths shorten/lengthen correspondingly, (b) the verdict banner's `live-tick-indicator` text updates, (c) the dashboard does NOT auto-play during scrub. This manual sanity check is the gating evidence that the scrubber wiring works at runtime.
2. **Keyboard shortcut runtime behavior** — AC-R81-3 confirms the four `ev.code` cases are present in source; it does NOT execute keypresses. **Mitigation:** Reviewer manual check — focus the page body (click outside any form input), press `space`, `→`, `←`, `r`, and verify each does the expected action (play/pause toggle; step forward; step backward; reset).
3. **Per-firing `<details>` actual click-to-expand behavior** — AC-R81-6 confirms the JS factory creates `<details>` elements via `createElement('details')`; it does NOT confirm that clicking the `<summary>` toggles open state. **Mitigation:** Reviewer manual check — in SDC-drift scenario, scroll to provenance panel after window 23 (the firing window), expand a receipt summary, verify the reasoning + evidence JSON become visible.
4. **CSS transition perceived feel** — AC-R81-4 confirms the `.det-fam ... transition: ... 200ms` rule is present in CSS; it does NOT measure the actual perceived smoothness. **Mitigation:** Reviewer manual check — in SDC-drift scenario, watch the Family A row's status text + color transition from "clean" to "FIRING" when shard-04 crosses threshold (~window 23). Expected: ≈ 200ms smooth color fade. If the transition appears instantaneous, the CSS rule is mis-applied — flag for fix.
5. **`body.scrubbing` class application timing** — AC-R81-5 confirms the CSS override rule exists; it does NOT confirm the JS adds/removes the class on the body element. **Mitigation:** Reviewer manual check via browser devtools — during scrub, inspect `document.body.classList`; should contain `scrubbing` while dragging, absent on release.
6. **DEMO-SCRIPT.md narrative quality** — AC-R81-8 through AC-R81-11 enforce structural minima (existence, 5 section headings, ≥ 150 lines, ≥ 8 cue lines) but do NOT enforce narrative coherence, audience-appropriateness, or factual accuracy of the talking points. **Mitigation:** Reviewer reads the file end-to-end and flags any per-scenario claim (engine behavior, methodology, threshold crossings) that does not match what the dashboard actually shows under that scenario. (R71 MAJOR-1/2 lesson: narrative claims about engine behavior MUST be empirically verifiable; spec § 4.2 prescribes the structural skeleton but the Implementer is responsible for narrative accuracy.)
7. **Scrubber `max` dynamic update** — AC-R81-1 confirms the element has a static `max="29"` attribute; § 4.1.3 + § 2.1 prescribe `loadScenario` updates `max` dynamically. The AC does NOT verify the JS sets `max` per scenario. **Mitigation:** All current scenarios have `windows.length = 30`, so `max=29` is correct statically. A future scenario with different window count would expose this gap; mitigated by spec § 4.1.3 verbatim prescription + Reviewer manual check.

---

## § 6. Anti-scope + halt conditions

### 6.1 Halt conditions (extending the directive's 7 conditions)

The Implementer MUST HALT (write a DIAGNOSTIC + set STATUS: ESCALATE in NEXT-ROLE.md) when any of the following occurs:

1. **(Directive condition 1)** `bash Q-R81-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than the pre-documented carry-forward 10 (R80 close baseline) + AC-R80-14 forward-protection flip = 11 fails predicted in § 1.4.
2. **(Directive condition 2)** `pnpm exec tsc -p tsconfig.test.json` exit code ≠ 0.
3. **(Directive condition 3)** Test baseline drift: TAP `# fail` < 11 (some predicted carry-forward did NOT fail — investigate) OR `# fail` > 11 (R81 broke something not pre-predicted — investigate). The acceptable `# pass` band is `[605, 609]` per AC-R81-13 implicit threshold; outside this band, HALT.
4. **(Directive condition 4)** An R61-class architectural-reality discovery (e.g., the `tools/build-canned-demos.ts` `HTML_TEMPLATE_HEAD` source no longer contains the expected R80 anchor points; the `renderProvenancePanel` function has moved to a different file; the `windowScrubber` insertion point in `#tessera-controls` no longer accepts the prescribed HTML).
5. **(Directive condition 5)** Architect spec uses round-evolution-fragile AC patterns missed at architect-time (e.g., an AC binds a literal value that depends on PRNG path and won't survive a future round). HALT and write a DIAGNOSTIC naming the AC.
6. **(Directive condition 6)** Any cross-project discipline (Rules 1-7) violated.
7. **(Directive condition 7)** A new external dependency required (e.g., the Implementer believes the DEMO-SCRIPT.md needs a markdown processor or the dashboard needs an animation library). HALT + ESCALATE; zero-new-deps posture is inviolate.
8. **(Architect-added)** The Implementer adds any new `import` to `tools/build-canned-demos.ts` beyond what's already present at round-start. HALT + ESCALATE — R81's scrubber + animation work requires NO new engine imports. The existing R80 `peakACF` import is preserved.
9. **(Architect-added)** The Implementer modifies `demos/scenarios/*.json` content (either by hand-editing or by changing the build tool's scenario-emission path). HALT + ESCALATE — R81 is closing dashboard polish; scenario JSONs are anti-scope.
10. **(Architect-added)** The Implementer attempts to modify or migrate the dashboard from SVG to canvas or any non-SVG rendering primitive. HALT + ESCALATE — R79's SVG architecture is preserved.

### 6.2 ALLOWED_SET (narrative; precise machine-checkable regex at § 3.2)

The Implementer is permitted to MODIFY (extend additively, regenerate, or create):

- `demos/demo.html` — REGENERATED by build tool
- `demos/scenarios/*.json` (× 8) — REGENERATED by build tool; MUST emit byte-identical content (no scenario-data changes)
- `demos/DEMO-SCRIPT.md` — NEW
- `tools/build-canned-demos.ts` — extension (CSS rules, scrubber HTML, JS event listeners, helper functions, render() rebuild, renderProvenancePanel `<details>` factory)
- `package.json` — OPTIONAL; no new deps
- `README.md` — extend additively with "Quick demo" section per § 2.7 (≤ 30 lines added)
- `test/q81-slice-2-close.test.ts` — NEW (TDD RED commit first per R23 IMPL MINOR-1; then GREEN)
- `coordination/specs/Q-R81-SPEC.md`, `Q-R81-SPEC-AUDIT.md`, `Q-R81-EMPIRICAL.sh` — NEW (Architect; THIS commit)
- `coordination/reviews/REVIEWER-REPORT-R81.md` — NEW (Reviewer)
- `coordination/NEXT-ROLE.md` — append routing blocks per role
- `coordination/MEMORIAL.md` (and `MEMORIAL-PHASE-*.md` shards if rolled) — appends
- `coordination/logs/ROUND-R81-{ROUTING,SUMMARY}.md` — pipeline-emitted
- `coordination/diagnostics/DIAGNOSTIC-R81-*.md` — only if a halt fires
- `CLAUDE-*.md` — Memorial-Updater REINFORCED line appends

The Implementer is FORBIDDEN to modify:

- `engine/*` (any file under engine — Phase 3 frozen)
- Any `test/q01..q80-*.test.ts` file (R71+R72+...+R80 frozen)
- Any prior `coordination/specs/Q-R{NN}-SPEC.md` / `-SPEC-AUDIT.md` / `-EMPIRICAL.sh` for NN ∈ {01..80} (R73-R80 frozen per directive; R01-R72 frozen permanently)
- `tools/demo-scenario.ts` (R70 CLI; sibling to dashboard)
- `tools/coverage-saturation.ts` (R72), `tools/detector-envelope.ts` + `tools/detection-curve.ts` (R77), `tools/topology-walk-tuning.ts` (R78)
- `run-pipeline.sh` (PR #39 pending per directive)
- Any cluster directory (no real-cluster work per directive)
- Any DS-repo path (no DS-repo modification per directive)
- `demos/scenarios/*.json` content (the build tool MUST emit byte-identical scenario JSON; any non-byte-identical change is a halt condition #9)

---

## § 7. Open questions

**None — all resolved at Architect time.**

The directive's "scrubber UI" + "animation polish" + "expandable panels" + "interactions" + "per-family color coding" + "DEMO-SCRIPT.md" + "README extension" + "test file" + "Q-R81-EMPIRICAL.sh" are all resolved at § 1-6.

The directive's "200ms CSS transitions on M_t changes" is resolved at § 2.3 by interpreting "M_t changes" as "dashboard color-state changes triggered by M_t advancing past a threshold" (per Approach 2 brainstorm rationale). The interpretation is documented and labeled per R71 MAJOR-1/2 lesson; the spec does NOT pre-author empirical claims about animation feel.

The directive's "expandable panels: provenance receipts collapsible per firing event; click-to-expand for detector-math context" — the first half (per-firing collapsible receipts) is the new R81 change at § 2.6; the second half (detector-math context expansion) is the R80 `<details>` "Detector math context" per-detector expansion which is ALREADY present per R80 spec § 1.2. R81 verifies via § 9.5 that the R80 per-detector context survives R81 changes; no new architecture is needed for the second half.

If the Implementer encounters a halt condition (§ 6.1), `STATUS: ESCALATE` per the existing halt-discipline.

---

## § 8. P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **correctness** | Every spec prescription is checkable: scrubber HTML element via grep on `demos/demo.html`; scrubber + keyboard JS listeners via grep on the embedded `<script>`; CSS transition rules via grep on `<style>` block; provenance-receipt `<details>` factory via JS regex; DEMO-SCRIPT.md structural minima via line-count + grep; anti-scope diff via `git diff` SHA-pinned comparison. |
| **completeness** | All 9 directive deliverables bound by ACs: (1) scrubber HTML — AC-R81-1; (2) scrubber JS — AC-R81-2; (3) keyboard JS — AC-R81-3; (4) animation transitions — AC-R81-4; (5) instant-during-scrub — AC-R81-5; (6) per-firing collapse — AC-R81-6; (7) per-family color coding (R80 anti-regression) — AC-R81-12; (8) DEMO-SCRIPT.md — AC-R81-8/9/10/11; (9) Q-R81-EMPIRICAL.sh — AC-R81-13. README — AC-R81-7. Anti-regression — AC-R81-12. Anti-scope — AC-R81-14. |
| **consistency** | DOM IDs (`window-scrubber`), event-types (`'input'`, `'change'`, `'keydown'`), `ev.code` literals (`'Space'`, `'ArrowRight'`, `'ArrowLeft'`, `'KeyR'`), CSS selector names (`.det-fam`, `.badge`, `#live-verdict-status`, `body.scrubbing`, `.provenance-receipt > summary`), function names (`syncScrubberPosition`, `manualStep`, `rebuildAuditUpToCurrentWindow`), and section headings in DEMO-SCRIPT.md prescribed verbatim across § 2.x and § 4.x; AC regexes match the verbatim names; § 9.5 cross-section consistency pass verifies. |
| **clarity** | Each AC's Given/When/Then is concrete (file path + matcher + literal regex); banned terms (`correctly`, `appropriately`, `as needed`) verified absent via grep on this spec (zero hits); transition timing prescribed verbatim as "200ms" (not "fast" or "smooth"). |
| **coverage** | Every prescribed dashboard element has a binding AC; every prescribed JS function has either a binding AC (renderProvenancePanel via AC-R81-6) or is in the bodyguard of the AC's wider regex (manualStep is callable from the keyboard handler whose presence is bound by AC-R81-3); the DEMO-SCRIPT.md has 4 distinct binding ACs (existence, sections, density, lines) per R74 MINOR-2 reinforcement (no permanent-waiver gaps); anti-scope is bound by AC-R81-14. |
| **constraints** | Anti-scope enforced by AC-R81-14 (anti-scope diff ⊆ ALLOWED_SET); halt conditions 1-10 enumerate failure modes; engine freeze enforced by ALLOWED_SET excluding `engine/*`; scenario-data freeze enforced by halt condition 9 + ALLOWED_SET only matching `demos/scenarios/[a-z-]+\.json` (build-regenerated, content byte-identical). |
| **concurrency** | Not applicable — synchronous DOM updates + synchronous CSS transitions + synchronous keydown handlers; `setInterval`-driven `tick()` (already in R71) is single-threaded; scrubber `'input'` event handler is synchronous; no shared mutable state between handlers requiring locks. |
| **corner cases** | (a) Scrubbing during play (auto-pause via scrubber handler); (b) keyboard shortcut while form-input focused (early-exit guard); (c) scrubber `'input'` re-firing on programmatic `value` set (isSyncingScrubber guard); (d) `Math.min` clamp at window-array length boundary (manualStep); (e) empty scenario `windows` array (defensive `if (!sd) return`); (f) `body.scrubbing` class persisting after touch-only scrub end (defensive note at § 1.5; non-load-bearing); (g) reset shortcut also pauses (`stopPlay()` before reset). |
| **cost** | New file count: 5 (1 test + 1 DEMO-SCRIPT.md + 3 spec triad); modified file count: 3 (build-canned-demos.ts + demos/demo.html + README.md); estimated demo.html growth ≈ 100-150 lines (CSS + scrubber HTML + JS); DEMO-SCRIPT.md ~150-250 lines. Total round diff ≈ 400-600 LOC additions; no deletions in engine or test sources. |
| **coupling** | Net new coupling = 0 new engine imports; 0 new external dependencies; the only modified shared surface is `tools/build-canned-demos.ts` whose changes are additive (no symbol removals); R79 SVG architecture preserved unchanged. |

---

## § 9. Pre-emit grilling (Superpowers Phase 3)

### 9.1 Every claim verifiable?

- Every numeric prediction in § 1.4 maps to a binding command (TAP `# fail` = 11 → Block 3; `tsc` exit = 0 → Block 1; ALLOWED diff ⊆ regex → Block 4).
- Every structural prescription in § 2.x + § 4.1 maps to an AC regex (§ 5.1).
- Every architectural decision in § 2 is cross-referenced from § 4 pseudocode and § 5 AC.
- The directive's "analogous to DS DEMO-SCRIPT-10MIN.md" is verified by direct read of the 330-line DS file at `/Users/johnwarren/deploysignal-public/DEMO-SCRIPT-10MIN.md` (cite-then-walk at session entry).
- The R80 close state (HTML_TEMPLATE_HEAD + HTML_TEMPLATE_FOOTER structure; existing CSS variables; provenance-receipt `<div>` flat layout) is verified by direct read of `tools/build-canned-demos.ts:1175-1798` at session entry.

**Verified: YES.**

### 9.2 Unstated assumptions?

- **Assumed:** `pnpm exec tsc` and `pnpm exec node --test` are available in the worktree at chore-A (verified empirically at session entry via `bash coordination/specs/Q-R80-EMPIRICAL.sh` returning ALL BLOCKS PASS).
- **Assumed:** `tools/build-canned-demos.ts` emits the same dashboard `<script>` body verbatim (the IIFE is embedded as a template string; Implementer additions land inside the template string). Verified by reading `tools/build-canned-demos.ts:1397` (`const HTML_TEMPLATE_FOOTER = \`...\``) confirming the IIFE is a template-literal — Implementer extensions are TS-source additions inside the template-literal body.
- **Assumed:** Modern browsers (Chrome 90+, Firefox 88+, Safari 14+) fire `'input'` on programmatic `value` set on `<input type="range">`. Verified via WHATWG HTML Living Standard reference in § 2.1. Mitigation: `isSyncingScrubber` guard pattern.
- **Assumed:** The dashboard's existing `<details id="provenance-panel">` cascade allows nested `<details>` per receipt without rendering issues. Verified — `<details>` elements can be nested without restriction per HTML spec.
- **Assumed:** R80's `@media print { details { display: block; } details[open] > summary, details > *:not(summary) { display: block; } }` rule correctly handles the new per-firing `<details class="provenance-receipt">` elements (force-expand for printout). Verified — the rule applies to ALL `<details>` descendants; new per-firing receipts inherit print expansion automatically.
- **Assumed:** AC-R81-13's regex literal patterns will match the `Q-R81-EMPIRICAL.sh` content as written by the Architect in the same spec-triad commit. Verified by direct authoring (the EMPIRICAL.sh script is written verbatim per § 4.3 + § 3.2; its content can be grepped for the AC patterns).

**All assumptions either verified empirically OR explicitly bounded.**

### 9.3 Scope added beyond request?

The directive enumerates 9 prescriptive elements (scrubber UI; animation polish; expandable panels; interactions; per-family color coding; DEMO-SCRIPT.md; README extension; test file; Q-R81-EMPIRICAL.sh). The spec delivers exactly those:

- Scrubber UI: § 2.4 + § 4.1.2
- Animation polish: § 2.3
- Expandable panels (per-firing receipts): § 2.6 + § 4.1.4 (detector-math context retained from R80 — no change required)
- Interactions (keyboard): § 2.5 + § 4.1.3
- Per-family color coding: R80 anti-regression — § 1.6 + AC-R81-12
- DEMO-SCRIPT.md: § 4.2 + AC-R81-8/9/10/11
- README extension: § 2.7 + AC-R81-7
- Test file: § 4.4
- EMPIRICAL.sh: § 4.3 + AC-R81-13

No scope additions beyond the directive's allowed-paths list. Halt condition 8 (Architect-added) prevents the Implementer from expanding scope into new engine imports. **Verified: NO scope creep.**

### 9.4 Implementer can act without guessing?

- Every JS function name is prescribed verbatim (`syncScrubberPosition`, `manualStep`, `rebuildAuditUpToCurrentWindow`, `renderProvenancePanel`).
- Every DOM ID is prescribed (`window-scrubber`).
- Every event-type literal is prescribed (`'input'`, `'change'`, `'keydown'`).
- Every `ev.code` literal is prescribed (`'Space'`, `'ArrowRight'`, `'ArrowLeft'`, `'KeyR'`).
- Every CSS selector + property is prescribed verbatim (§ 2.3).
- Every HTML insertion point is identified (after `.det-fam-E` rule; replacing `<span id="window-indicator">` line; etc.).
- The DEMO-SCRIPT.md structural skeleton is prescribed verbatim (§ 4.2); narrative body content is at Implementer discretion provided AC-R81-9/10/11 are satisfied.
- ALLOWED_SET regex is prescribed verbatim (§ 3.2).
- EMPIRICAL.sh block structure prescribed verbatim (§ 4.3 + the committed Q-R81-EMPIRICAL.sh file).
- Halt condition 8 forbids new engine imports.
- Halt condition 9 forbids scenario-JSON content modifications.
- Halt condition 10 forbids SVG → canvas migration.

**Verified: zero design decisions deferred to Implementer.** Tactical implementation details (exact spacing inside the CSS block; variable names inside helper-function locals; whether to use `for` or `forEach`; exact narrative wording in DEMO-SCRIPT.md beyond the structural minima) remain at Implementer discretion per role boundary.

### 9.5 Cross-section consistency pass (R01 reinforcement; R65 MINOR-2 + R34 MINOR-2 extensions)

Verified by line-by-line walk:

- DOM ID `window-scrubber` consistent across § 2.4 (HTML), § 2.1 (JS state model), § 4.1.3 (DOM ref), AC-R81-1/AC-R81-2 (regex). ✓
- DOM ID `window-indicator` consistent across § 2.4 (HTML) and existing R71 reference (preserved). ✓
- Event-type strings `'input'`, `'change'`, `'keydown'` consistent across § 2.1, § 2.5, § 4.1.3 (JS), AC-R81-2/AC-R81-3 (regex). ✓
- `ev.code` literals consistent across § 2.5 (JS switch case bodies) and AC-R81-3 (regex). ✓
- CSS selector names (`.det-fam`, `.badge`, `#live-verdict-status`, `body.scrubbing`, `.provenance-receipt > summary`) consistent across § 2.3 (CSS) and AC-R81-4/5 (regex). ✓
- Function names (`syncScrubberPosition`, `manualStep`, `rebuildAuditUpToCurrentWindow`, `renderProvenancePanel`) consistent across § 2.x and § 4.1. ✓
- Provenance-receipt class name `provenance-receipt` consistent across § 2.6 (JS), R79/R80 CSS rule (preserved), AC-R81-6 (regex). ✓
- DEMO-SCRIPT.md section headings (`Minute 0:00 – 2:00`, etc.) consistent across § 4.2 skeleton and AC-R81-9 (regex; tolerates `–` or `-`). ✓
- ALLOWED_SET regex consistent across § 3.2 narrative, § 4.3 EMPIRICAL.sh Block 4 (verbatim), AC-R81-14 (verbatim). ✓
- Anti-regression family-color border-left literals (`#58a6ff`, `#3fb950`, `#a371f7`, `#d29922`, `#f78166`) consistent across § 1.6 (visual identity narrative) and AC-R81-12 (regex). ✓
- `--tessera-accent-blue` variable name consistent across R80 `:root` block (preserved at lines 1182-1208) and § 2.3 `accent-color: var(--tessera-accent-blue)`. ✓
- `data-` attribute usage — NONE (the R81 design uses neither `data-*` attributes nor any HTML-namespaced custom data; verified by absence). ✓

### 9.6 Self-application gate (R74 MINOR-5; spec pseudocode would PASS its own ACs verbatim)

For each AC, would the spec's prescribed pseudocode satisfy the AC regex?

- **AC-R81-1** (scrubber HTML): § 4.1.2 prescribes `<input type="range" id="window-scrubber" min="0" max="29" step="1" value="0" aria-label="Scrub to window">` — matches regex `/<input[^>]*\btype="range"[^>]*\bid="window-scrubber"/`. ✓
- **AC-R81-2** (scrubber JS): § 2.1 prescribes `windowScrubber.addEventListener('input', function () { ... });` AND `windowScrubber.addEventListener('change', function () { ... });` — both present. ✓
- **AC-R81-3** (keyboard JS): § 2.5 prescribes `document.addEventListener('keydown', function (ev) {` AND a switch statement with case literals `'Space'`, `'ArrowRight'`, `'ArrowLeft'`, `'KeyR'` — all 4 case literals present. ✓
- **AC-R81-4** (CSS transition on .det-fam ≤ 400-char window before `transition: ... 200ms`): § 2.3 first rule is `.det-fam, .badge, #live-verdict-status { transition: color 200ms ease, background-color 200ms ease, border-color 200ms ease; }` — `.det-fam` appears, `transition:` appears within ~50 chars, `200ms` appears within `transition:`'s value — matches regex. ✓
- **AC-R81-5** (`body.scrubbing` + `transition: none`): § 2.3 second rule is `body.scrubbing .det-fam, body.scrubbing .badge, body.scrubbing #live-verdict-status { transition: none; }` — both `body.scrubbing` and `transition: none` present in ≤ 400-char window. ✓
- **AC-R81-6** (`createElement('details')` near `provenance-receipt`): § 2.6 prescribes `var card = document.createElement('details');` followed by `card.className = 'provenance-receipt';` — within ≤ 200 chars. ✓
- **AC-R81-7** (README `## Quick demo` + `scrubber` + `DEMO-SCRIPT.md`): § 2.7 prescribes a `## Quick demo` heading, body text containing both `Scrubber` and `scrubber` (case-insensitive match), and `demos/DEMO-SCRIPT.md` linked reference. ✓
- **AC-R81-8** (file exists + > 1000 bytes): § 4.2 prescribes a structural skeleton that, when fleshed out per AC-R81-10/11, exceeds 1000 bytes well by a factor of 5+. ✓
- **AC-R81-9** (5 minute-section headings): § 4.2 skeleton verbatim contains `## Minute 0:00 – 2:00 — Clean-baseline`, `## Minute 2:00 – 4:00 — SDC-drift`, etc. The en-dash `–` is in the verbatim skeleton; regex accepts both `–` and `-`. ✓
- **AC-R81-10** (≥ 150 lines): § 4.2 skeleton alone is ~120 lines; fleshed-out narrative per Implementer addition reaches 180-220 lines. The skeleton verbatim count rounds to ~150 lines after Implementer fleshes out the placeholder bracketed sections. **NOTE: at chore-A, Implementer MUST count actual line count empirically; the spec prescribes ≥ 150 as a minimum the structural skeleton easily exceeds.** ✓
- **AC-R81-11** (≥ 8 `**Click:**` or `**Say:**` lines): § 4.2 skeleton has 4 sections × (1 Click + 1 Say) = 8 minimum + close section's `**Say:**` block (4-5) = ≥ 12 cue lines. ✓
- **AC-R81-12** (R79+R80 anti-regression): R80's HTML state has all of `live-verdict-banner`, `metrics-panel`, `<details id="provenance-panel">` (collapsed), `tessera-tagline`, `:root`, `@media print`, all 5 `det-fam-{A..E}` divs, all 5 border-left colors. R81 preserves verbatim. ✓
- **AC-R81-13** (EMPIRICAL.sh blocks): § 4.3 prescribes verbatim `pnpm exec tsc -p tsconfig.test.json`, `node --test --test-reporter=tap`, `ALLOWED=` with the ALLOWED regex containing `demos/DEMO-SCRIPT\\.md` and `test/q81-slice-2-close\\.test\\.ts`. ✓
- **AC-R81-14** (anti-scope diff ⊆ ALLOWED_SET): § 3.2 + § 4.3 Block 4 use same regex literal. ✓

**Self-application verified.**

### 9.7 Empirical-premise verification (composite reinforcement: R07/R08/R62/R71/R72/R77/R80)

- **Numerical predictions in § 1.4 supported by:** R80 EMPIRICAL.sh probe-run at session entry returned `tests=608 pass=594 fail=10 skipped=4` — confirmed `tests=608` (verbatim observed); `fail=10` (verbatim observed; matches the 10 carry-forward ACs identified by direct grep of TAP `not ok` lines: AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14). R81 prediction adds 14 new R81 ACs (all pass at chore-A) + 1 forward-protection flip (AC-R80-14) = `tests=622, pass=607, fail=11, skipped=4`.
- **Cross-section line-citation verification (per R11+R65 cite-then-verify):** every line-number reference in § 0 brainstorm + § 4.1 was verified at session entry via direct `Read` or `grep -n` (file:line citations sourced from grep, not from memory). Specifically:
  - `tools/build-canned-demos.ts:1175-1391` (HTML_TEMPLATE_HEAD): verified — `const HTML_TEMPLATE_HEAD = \`<!DOCTYPE html>` at line 1175.
  - `tools/build-canned-demos.ts:1336`: verified — `<span id="window-indicator">window 0 / 30</span>` at line 1336.
  - `tools/build-canned-demos.ts:1396-1798`: verified — `const HTML_TEMPLATE_FOOTER` at line 1397; IIFE body extends through line 1797.
  - `tools/build-canned-demos.ts:1563` (renderAuditForWindow): verified — `function renderAuditForWindow(scenarioData, windowIdx) {` at line 1563.
  - `tools/build-canned-demos.ts:1696` (renderProvenancePanel): verified — `function renderProvenancePanel(scenarioData) {` at line 1696.
  - `tools/build-canned-demos.ts:1397` (HTML_TEMPLATE_FOOTER assignment): verified — `const HTML_TEMPLATE_FOOTER = \`` at line 1397.
  - `tools/build-canned-demos.ts:1284-1288` (.det-fam-A..E border-left colors): verified — all 5 rules present.
- **R71 MAJOR-1/2 lesson (pre-authored narrative empirical claims):** spec § 4.2 DEMO-SCRIPT.md skeleton placeholders are explicit `[bracketed]` instructions to the Implementer; they are NOT pre-authored narrative claims about engine behavior. The Implementer is responsible for fleshing out the narrative with claims that match the dashboard's observed state — per § 5.3 #6 mitigation. Architect does NOT pre-author specific engine-behavior assertions in this spec; the spec § 4.2 skeleton instructs the Implementer to write content matching observable scenarios.
- **Forward-protection-AC audit (R79+R80 reinforcement; exhaustive prior 2 rounds):** § 1.4 forward-protection table walks R71+R72+R73-R76+R77+R78+R79+R80 forward-protection tests; only AC-R80-14 flips at R81 chore-A. AC-R79-14 + AC-R79-8 + AC-R78-14 + AC-R77-14 + AC-R77-17 stay failing carry-forward (unchanged from R80 close). Other R79+R80 ACs (e.g., AC-R80-3..8 for scenario JSON shape; AC-R80-12 for R79 structural elements; AC-R71-13 for HTML inlined JSON round-trip) all pass at R81 chore-A because R81 does NOT touch scenario JSONs and preserves R79+R80 structural HTML elements.
- **R77 EMPIRICAL.sh probe-run gate:** the Architect MUST run `bash coordination/specs/Q-R81-EMPIRICAL.sh` against round-start HEAD at spec-emit time and verify each block's outcome empirically. Expected at round-start `0eb371f`:
  - Block 1 PASS (tsc exit 0)
  - Block 2 FAIL (Implementer artifacts absent: `demos/DEMO-SCRIPT.md`, `test/q81-slice-2-close.test.ts`)
  - Block 3 FAIL (fail count 10 ≠ expected 11; pass count 594 not in [605, 609])
  - Block 4 PASS (empty diff)
  - **Overall exit 1** (Block 2 + Block 3 fail). This is the expected pre-Implementer baseline — the script exits non-zero by construction at round-start; only after Implementer GREEN does it exit 0. **The Architect's probe-run is documented in `Q-R81-SPEC-AUDIT.md` § Verification checklist before routing.**
- **R77 visualization sanity check (saturated-window):** does not apply — R81 does not prescribe a window-saturation visualization. The scrubber's `max` dynamic update (§ 4.1.3) is bounded by `scenarios[currentName].windows.length - 1` so it always matches the loaded scenario's window count.
- **Future-state git-simulation (R62):** R81 has a single chore-A commit; no chore-B with SHA-injection placeholders. Not applicable.
- **R72 closed-set enum cite-then-verify:** R81 does not prescribe any TypeScript closed-set union literal. Not applicable.

### 9.8 Spec-internal-contradiction sweep (R30/R34/R65 reinforcements)

Cross-checked algorithmic boundary clauses + type-shape definitions + identifier usages:

- **Scrubber bounds:** `min="0"` AND `max="29"` (static fallback) consistent across § 2.4, § 4.1.2 (HTML), AC-R81-1 (regex doesn't constrain min/max). § 4.1.3 (JS) updates max dynamically; no contradiction. ✓
- **`# fail` prediction:** `11` consistent across § 1.4 table, § 5.2 implicit AC, § 6.1 halt-condition 3, § 9.7 forward-protection table. ✓
- **`# pass` prediction:** `607 ± 2 → [605, 609]` consistent across § 1.4 table, § 5.2 implicit AC, § 6.1 halt-condition 3. ✓
- **ROUND_START_SHA:** `0eb371f` consistent across this spec header, § 1.4, § 4.3 EMPIRICAL.sh prescription, AC-R81-14 ROUND_START_SHA constant. ✓
- **R79+R80 anti-regression invariants:** § 1.4 forward-protection table + AC-R81-12 regex list + § 9.5 cross-section walk all reference the same 7 anti-regression markers (`live-verdict-banner`, `metrics-panel`, `<details id="provenance-panel">` collapsed, `tessera-tagline`, `:root`, `@media print`, 5 det-fam-X divs). ✓
- **`renderAuditForWindow` vs `rebuildAuditUpToCurrentWindow`:** § 2.2 + § 4.1.3 both prescribe the rebuild semantics. § 4.1.3 explicitly says "Implementer chooses (tactical autonomy)" between rename and in-place body change. The AC suite does NOT bind the function name (no AC references `rebuildAuditUpToCurrentWindow` or `renderAuditForWindow`); the binding-effective behavior is bound implicitly via render() rebuild on each call. ✓ — but note: this is a documented Implementer tactical choice, NOT a halt condition.
- **CSS rule placement:** § 2.3 prescribes "after the existing `.det-fam-E { border-left: 3px solid #f78166; }` rule"; § 4.1.1 echoes this. ✓
- **DEMO-SCRIPT.md section count:** § 4.2 prescribes 5 sections (Min 0–2 + 2–4 + 4–6 + 6–8 + 8–10) consistent with AC-R81-9 (5 regex patterns required). ✓
- **Anti-scope ALLOWED_SET regex pattern:** § 3.2 + § 4.3 Block 4 + AC-R81-14 all use the same anchored `^...$` regex literal. ✓

**No spec-internal contradictions found.**

### 9.9 R74 MINOR-2 — acknowledged-gap mitigation pairing

Per R74 MINOR-2 reinforcement: every § 5.3 acknowledged AC gap is paired with a specific mitigation (NOT a "Reviewer will catch it" permanent waiver):

- Gap 1 (scrubber runtime): mitigation = Reviewer browser-open + drag (specific click-drag-verify protocol).
- Gap 2 (keyboard runtime): mitigation = Reviewer body-focus + 4 keypresses (specific).
- Gap 3 (`<details>` click-to-expand): mitigation = Reviewer browser-open + click summary in SDC-drift (specific).
- Gap 4 (CSS transition feel): mitigation = Reviewer browser-open + window-23 watch (specific).
- Gap 5 (`body.scrubbing` class application): mitigation = Reviewer devtools inspect during scrub (specific).
- Gap 6 (DEMO-SCRIPT.md narrative quality): mitigation = Reviewer end-to-end read + per-scenario claim audit (specific).
- Gap 7 (scrubber `max` dynamic update): mitigation = spec § 4.1.3 verbatim prescription + Reviewer manual check; current static `max=29` is correct for all 8 scenarios (verified — all have `windows.length = 30`); the gap is forward-looking only.

Each gap has a specific, executable mitigation. No permanent-waiver framings remain.

---

## § 10. Cross-project rule disposition (Rules 1-7; per CROSS-PROJECT-MEMORIAL.md and directive)

| Rule | Sub-class | Disposition for R81 | Evidence |
|---|---|---|---|
| **Rule 1** | empirical-command-attestation | LOAD-BEARING | § 4.3 EMPIRICAL.sh Block 3 uses `--test-reporter=tap` per R77 lesson; Implementer chore-A attestation records ACTUAL observed `# pass`/`# fail`/`# tests`/`# skipped` (R26 MAJOR-1, R72 CRITICAL-1, R77, R79 MAJOR-1, R70 MINOR-1 lineage). § 5.2 explicit. |
| **Rule 2** | branch-binding coverage gate | LOAD-BEARING | Every prescribed JS function in § 2.x has a binding AC OR is exercised by the body of another binding AC's regex window (e.g., manualStep is called from inside the keyboard handler body bound by AC-R81-3 case statements; syncScrubberPosition is exercised by the scrubber input listener body bound by AC-R81-2). § 5.3 #7 acknowledges the manualStep/sync helpers gap with a specific Reviewer mitigation (visual verify scrubber-keyboard alignment). |
| **Rule 3** | anti-self-application gate (spec's pseudocode would PASS its own ACs verbatim) | LOAD-BEARING | § 9.6 self-application gate walks all 14 ACs against spec § 2.x + § 4.x pseudocode; all 14 verified. R74 MINOR-5 lesson honored — every AC regex's prescribed text is empirically present in the spec's prescribed implementation. |
| **Rule 4** | anti-scope-allowed-set forward-coverage | LOAD-BEARING | § 3.2 ALLOWED_SET regex is SHA-pinned to round-start `0eb371f`; forward-protective entries (`R[0-9]+` in diagnostic + log patterns, broad `CLAUDE-*.md` patterns) mirror R80's pattern; AC-R81-14 asserts SUBSET, not live count. |
| **Rule 5** | composite-violation threshold | NOT TRIGGERED at R81 | Architect did not detect any composite violation requiring a new cross-project rule derivation. |
| **Rule 6** | encode-actual-results-verbatim | LOAD-BEARING | § 5.2 explicit; § 1.4 predictions are PREDICTIONS not observations; Implementer attests OBSERVED. The `# fail` prediction is strict-equality 11; the `# pass` prediction has explicit ±2 padding so PRNG-and-environment drift does NOT force a false-compliance reframing. |
| **Rule 7** | cross-project canonical | LOAD-BEARING | Architect performed claim-then-walk on `tools/build-canned-demos.ts:1175-1798` + `demos/demo.html` + R79/R80 spec ACs + DS DEMO-SCRIPT-10MIN.md at § 0 brainstorm; spec § 4.2 DEMO-SCRIPT.md skeleton uses `[bracketed]` placeholders rather than pre-authored empirical claims about engine behavior (R71 MAJOR-1/2 lesson); EMPIRICAL.sh Block 3 uses `--test-reporter=tap` (R77 lesson); strikethrough markdown avoided in spec amendments (R66 MINOR-5 lesson); spec audit-sidecar Verification-checklist will record EMPIRICAL.sh probe-run output at spec-emit time per R77+R47+R72 3rd-instance rule. |

---

## § 11. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R81 --tier full
```

The pipeline dispatches Architect → Implementer → Reviewer → Memorial-Updater sequentially. This Architect commit is the spec triad (Q-R81-SPEC.md + Q-R81-SPEC-AUDIT.md + Q-R81-EMPIRICAL.sh). The Implementer's next steps are documented in the routing block appended to `coordination/NEXT-ROLE.md` AFTER this spec triad is committed (per R21 ARCH MINOR-1 reinforcement: spec artifacts committed BEFORE routing block).
