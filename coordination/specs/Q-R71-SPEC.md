# Q-R71-SPEC — Tessera demo dashboard (static HTML + canned scenarios; DS pattern mirror)

**Round:** R71 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `54af89f` (chore(R71 directive); verified at Architect session entry via `git rev-parse HEAD`)
**Spec-emit SHA:** stamped by Architect commit (this spec triad lands BEFORE chore-A per R21 ARCH MINOR-1)
**Authority:** `coordination/NEXT-ROLE.md` § R71 Round-scope directive (2026-05-20). Operator-confirmed scope (3 AskUserQuestion answers): mirror DS `demos/demo.html` pattern; vanilla HTML/CSS/JS (zero new deps); 2-round decomposition (R71 dashboard now; R72 coverage validation next).

---

## § 0. Brainstorm (Superpowers Phase 1)

The R71 directive sets the gap: R70 shipped a CLI scenario runner (`pnpm demo <name>`) with 4 scenarios that emit ASCII to stdout. A visitor cannot click through scenarios in a browser; the dashboard panels (audit trail / reasoning / suggested-actions) called for by the directive do not exist; FDR + hierarchical-evalue + sparse-data + topology-spanning scenarios are not represented. R71 closes that gap with a static HTML dashboard plus an offline scenario runner that captures per-window state.

### Approach A — Live engine in the browser

Bundle the engine TypeScript to a browser-loadable bundle (esbuild / rollup) and have demo.html drive the engine directly per scenario per click.

- **Strengths:** maximally "live" feel; same engine code paths exercised in the browser as in Node.
- **Weaknesses:** engine uses CommonJS `require`/`module.exports` semantics and Node-only APIs (`process`, `Buffer`-ish); requires a bundler — halt #8 of the R71 directive (the operator's "scenario output rendering requires browser-bundling complexity: HALT — vanilla HTML/JS only") explicitly forbids this; engine is frozen post-Phase-3 (anti-scope #2) so we cannot add a browser-friendly shim.
- **Hidden assumption:** "live" is better than "deterministic playback." For a 30-second demo this is wrong — playback is what reviewers actually want.
- **Risk:** bundler complexity overruns the round budget; anti-scope #1 (no new external deps) is violated when bundler tooling is added.
- **Eliminated** by halt #8 + anti-scope #1 + anti-scope #2.

### Approach B — JSON-only artifacts (no embedded data in demo.html)

`tools/build-canned-demos.ts` writes `demos/scenarios/<name>.json` per scenario; `demos/demo.html` uses `fetch()` to load JSON files from disk at view time.

- **Strengths:** clean separation; demo.html stays small; JSON files are human-inspectable.
- **Weaknesses:** **breaks under `file://` origin** — browsers reject `fetch('./scenarios/foo.json')` from a file:// page with CORS / cross-origin-file errors. The directive explicitly requires "opens from `file://`."
- **Hidden assumption:** users will run a local HTTP server. The directive does not assume this.
- **Eliminated** by directive-level `file://` requirement.

### Approach C — DS-mirror: build tool writes JSON files AND regenerates demo.html with data inlined (PICKED)

`tools/build-canned-demos.ts` does two things on each invocation:

1. Runs the 8 scenarios server-side through the real Tessera engine (Node only); captures per-window state; writes one `demos/scenarios/<scenario-name>.json` per scenario (for inspection + audit + test binding).
2. Reads those 8 JSON files; emits `demos/demo.html` from scratch by concatenating an inline HTML/CSS/JS template (lives as a string in `build-canned-demos.ts`) with `<script type="application/json" id="tessera-scenario-<name>">` blocks containing each scenario's data verbatim.

`demos/demo.html` is therefore a **build artifact** that is **committed to git** (so opening it from `file://` works without re-running the build, and so the Reviewer can audit the byte-level output the next visitor sees). The build tool is **idempotent**: running it twice produces byte-identical `demos/scenarios/*.json` and byte-identical `demos/demo.html`.

The dashboard runs zero engine code in the browser. The browser only walks the inlined `<script type="application/json">` blocks per scenario selection, renders SVG trajectories from the captured `windows[]` array, and pages through windows under Play/Pause/Reset/Speed control. Everything is pre-recorded.

- **Strengths:** opens from `file://` (no fetch); deterministic by construction; mirrors the DS `demos/demo.template.html` → `tools/build-canned-demos.js` → `demos/demo.html` pattern (per directive reference); the JSON files double as audit-inspectable artifacts; tests can pin the JSON shape independently of the HTML rendering.
- **Weaknesses:** the demo is not "live" — visitors see canned data. Mitigated by deterministic regeneration: anyone can re-run `pnpm build:demos` and get the same output, and the JSON is human-readable.
- **Hidden assumption:** the inlined `<script type="application/json">` block is large enough that the browser's parser handles it. The DS `demos/demo.html` is 67k lines (≈2.4 MB) and works; Tessera's 8 scenarios × ~30 windows × ~10 shards will be one to two orders of magnitude smaller.
- **Risk:** the build tool's HTML template-string + injection logic is non-trivial. Mitigation: keep the template short (single-file dashboard, no separate CSS file, no separate JS file); use a sentinel-bounded injection point so the data section is clearly delineated.

### Constraint elimination from PRD/directive

- Halt #8 (no browser bundling) → eliminates A.
- `file://` requirement → eliminates B.
- Anti-scope #1 (no new external deps) → confirms C is the only path using Node-builtins + already-checked-in engine + vanilla browser.
- Anti-scope #2 (no engine modifications) → confirmed — C never touches engine source.
- R62+R66+R68 cumulative lesson (no forward-protection / live-file-count / anti-scope-diff-against-prior-round AC patterns) → spec § 5 below uses historical-only diff and binds carry-forward fails by AC ID.

### Selection rationale

**Approach C selected.** It is the only approach that simultaneously (a) honors halt #8 + anti-scope, (b) opens from `file://`, (c) ships JSON artifacts the Reviewer can audit independently of HTML rendering, (d) fits the directive's "DS pattern mirror" framing.

**What was rejected:**
- A — bundler requirement violates halt #8 + anti-scope #1.
- B — `fetch` under file:// fails; directive explicitly requires file:// to work.

The rejection rationale is documented inline above per Superpowers Brainstorm step 5.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Build tool | — | `tools/build-canned-demos.ts` (Tessera-original; single file; ~700-900 lines TS) | — | — |
| Scenario data | — | `demos/scenarios/clean-baseline.json`, `…/sdc-drift.json`, `…/common-mode-rack.json`, `…/event-conditional.json`, `…/fdr-multiple-testing.json`, `…/hierarchical-evalue.json`, `…/sparse-data-resilience.json`, `…/topology-spanning-common-mode.json` (8 generated; checked into git) | — | — |
| Dashboard | — | `demos/demo.html` (build artifact; checked into git; ~1500-2500 lines incl. inlined JSON; vanilla HTML/CSS/JS) | — | — |
| Engine | `engine/detectors/betting-e-process.ts`, `engine/topology/common-mode-attribution.ts`, `engine/ds-integration/event-consumer.ts`, `engine/ds-integration/freeze-hook-factory.ts`, `engine/events/freeze-hook.ts`, `engine/per-shard/warm-start.ts`, `engine/per-shard/runtime.ts`, `engine/types/verdict.ts`, `engine/ds-integration/event-contract.ts`, `engine/types/families/a.ts`, `engine/fleet/e-bh.ts`, `engine/fleet/combine.ts`, `engine/types/fleet.ts` | — | — | — |
| Tests | — | `test/q71-demo-dashboard.test.ts` (Tessera-original; single file; ~300-500 lines TS) | — | — |
| Package | `package.json` (scripts block) | — | adds 2 entries (`build:demos`, `prebuild:demos`) | — |
| README | `README.md` (existing "Quick demo" section at lines 73-84) | — | extends "Quick demo" section to mention dashboard + invocation | — |
| R70 CLI | `tools/demo-scenario.ts` (4 scenarios; READ-ONLY) | — | — | — |
| Spec triad | — | `Q-R71-SPEC.md`, `Q-R71-SPEC-AUDIT.md`, `Q-R71-EMPIRICAL.sh` | — | — |

**Critical anti-scope clarification:** `tools/demo-scenario.ts` (R70 CLI) is **READ-ONLY** at R71 — neither the spec nor the build tool imports from it. The R71 build tool re-implements its own scenario-running logic against the engine surfaces directly, because R71's per-window state capture is a different output shape than R70's ASCII output. The R70 CLI is preserved as a sibling deliverable per the directive's "R70 CLI demos preserved as sibling not replaced" wording.

### 1.2 Data flow (build-time)

```
pnpm build:demos
   → prebuild:demos compiles tools/build-canned-demos.ts → .js
   → node tools/build-canned-demos.js
       for each scenario in [clean-baseline, sdc-drift, common-mode-rack,
                              event-conditional, fdr-multiple-testing,
                              hierarchical-evalue, sparse-data-resilience,
                              topology-spanning-common-mode]:
         a. seedRng(SCENARIO_SEED[name])              — deterministic LCG
         b. buildSyntheticInputs()                    — topology / baseline / fault pattern
         c. runScenarioRecording():                   — per-window loop
              for w in 0..N-1:
                invoke engine surface                  — updateBettingState / attributeCommonMode /
                                                        eBenjaminiHochberg / updateFleetEProcessState /
                                                        freezeAwareUpdatePerShardResidual (transitively)
                capture per-window snapshot            — { t, per_shard:[{ shard_id, M_t, fired }], events:[...] }
         d. computeTerminalState()                    — { firing_shards, common_mode_candidates,
                                                          freeze_active, fdr_selected_count,
                                                          fleet_fired, ... }
         e. composeReasoningAndActions()              — pre-authored prose strings keyed by scenario name
         f. writeFile(demos/scenarios/<name>.json)    — pretty-printed JSON with stable key order
   → readAllScenarioJsonFiles(demos/scenarios/)
   → renderHtmlTemplate()                              — vanilla HTML/CSS/JS template string
       inject <script type="application/json" id="tessera-scenario-<name>">JSON</script>
              for each scenario, between sentinel comments
   → writeFile(demos/demo.html)                       — committed artifact

pnpm test (no engine modification path)
   → tsc compiles test/q71-demo-dashboard.test.ts
   → node --test asserts on:
       - JSON file existence + structural shape (per scenario)
       - terminal-state predicates (per scenario)
       - demos/demo.html structural markers (selector / controls / SVG container / panels)
       - demo.html embedded JSON ≡ demos/scenarios/<name>.json (round-trip equality)
       - anti-regression: tools/demo-scenario.ts still exports runScenario + SCENARIO_NAMES
```

### 1.3 Integration points with engine surfaces (claim-then-walk verified at Architect session entry; engine SHA = `54af89f`)

Each engine signature was opened by direct file read at session entry — not from memory or prior-round attestation.

| Engine entry point | Source file:line | Signature (verbatim from session-entry read) | Demo usage |
|---|---|---|---|
| `freshBettingState` | engine/detectors/betting-e-process.ts:72 | `(): BettingEProcessState` returning `{ M:1, bet:0, n:0, alphaConsumed:0, runningMean:0, runningSecondMoment:0, onsFallbackCount:0 }` | Allocate per-shard Family-A state in scenarios 1, 2, 5, 6. |
| `updateBettingState` | engine/detectors/betting-e-process.ts:151 | `(state: BettingEProcessState, x: number, baselineMean: number, sigmaSquared: number, perTickAlpha: number): number` — MUTATES state in-place; returns updated `state.M`. | Drive Family-A wealth per shard per window in scenarios 1, 2, 5, 6. |
| `attributeCommonMode` | engine/topology/common-mode-attribution.ts:131 | `(input: CommonModeAttributionInput): CommonModeAttributionResult` where input = `{ fired_events: readonly FiredShardEvent[], snapshot: TopologySnapshot, opts?: CommonModeAttributionOpts }`; result = `{ candidates: readonly CommonModeCandidate[], snapshot_hash: string, attributed_at_ts: number }`. | Surface common-mode candidates in scenarios 3, 7, 8. |
| `CommonModeAttributionOpts.now` | engine/topology/common-mode-attribution.ts:95 | `now?: () => number;` | Pass `now: () => 1_700_000_200` for deterministic `attributed_at_ts`. |
| `DsEventConsumer` constructor | engine/ds-integration/event-consumer.ts:169 | `new DsEventConsumer(opts: DsEventConsumerOpts)`; constructor does NOT bind a server — `.start()` does. | Construct with `{ port: 0 }`; never call `.start()`; consumer is an EventEmitter for the factory to subscribe to. (Used in scenario 4.) |
| `createFreezeHookFromDsEvents` | engine/ds-integration/freeze-hook-factory.ts:87 | `(opts: FreezeHookActivatorOpts): FreezeHookActivator` with methods `.update(current, obs, baselineCell)`, `.getState()`, `.cancelActivation()`, `.dispose()` | Wire consumer to freeze-hook; emit 'activate' on consumer; call `.update()`; observe residual reference-equality semantics (scenario 4). |
| `initialPerShardResidual` | engine/per-shard/warm-start.ts:38 | `(): PerShardResidual` returning `{ n_samples: 0, confidence: 'none' }`. | Seed the event-conditional residual (scenario 4). |
| `eBenjaminiHochberg` | engine/fleet/e-bh.ts:90 | `(perShardEValues: ReadonlyArray<number>, qLevel: number): EBenjaminiHochbergOutput` where output = `{ selected: ReadonlyArray<number>, K: number }`. Throws on N=0 or qLevel ∉ (0,1]. | Apply FDR control to per-shard e-values in scenario 5. |
| `combineAverage` | engine/fleet/combine.ts:87 | `(log_e_values: ReadonlyArray<number>): FleetMergeOutput` returning `{ log_fleet_e: number }`. Throws on empty input. | Combine per-shard log-e-values to fleet log-e-value in scenario 6. |
| `freshFleetEProcessState` | engine/fleet/combine.ts:102 | `(): FleetEProcessState` returning `{ log_fleet_e_t: 0, log_fleet_e_max: 0, n: 0, fired: false, tick_at_first_fire: null }`. | Allocate fleet wealth tracker in scenario 6. |
| `updateFleetEProcessState` | engine/fleet/combine.ts:122 | `(state: FleetEProcessState, log_fleet_e_t: number, log_threshold: number): FleetEProcessState` — MUTATES in-place. | Advance fleet wealth + sticky-fire latch in scenario 6. |
| `DEFAULT_MIN_MEMBER_COUNT` | engine/topology/common-mode-attribution.ts:116 | `export const DEFAULT_MIN_MEMBER_COUNT = 2;` | Determines sparse-data-resilience scenario behavior — singleton fired-shards do NOT surface as candidates. |
| `TopologyNode.kind` literals | engine/types/verdict.ts (R18 + R23 + R26 + R47 vendored-with-deltas) | `'rack' | 'psu' | 'cooling_zone' | 'gpu_shard' | 'switch' | 'tor_switch' | 'spine_switch' | 'k8s_node' | 'k8s_zone' | 'nvlink_switch' | 'neuron_chip' | 'neuron_link' | 'tpu_chip' | 'ici_link'` | scenarios 3 + 7 + 8 use `'rack'` + `'gpu_shard'` + `'cooling_zone'` (already used in R70's common-mode-rack scenario; no new literals required). |

**Failure modes at each integration point:**

1. `updateBettingState` requires `sigmaSquared > 0` (line 158 guard `Math.max(sigmaSquared, 0)`). All scenarios pass σ² = 1; safe.
2. `updateBettingState` mutates state in-place. Build tool allocates `freshBettingState()` per shard once at scenario start.
3. `attributeCommonMode` silently skips fired-events whose `shard_node_id` does not match any node in the snapshot (line 161 comment "F4: unknown shard silently skipped"). All scenarios construct snapshot before fired-events list; verified by construction.
4. `attributeCommonMode` requires ≥ `DEFAULT_MIN_MEMBER_COUNT` (=2) distinct member shards at a candidate node to surface (line 179 "F2 / F9: singleton not surfaced"). Sparse-data-resilience scenario constructs a fixture where every rack-edge is missing → all candidate nodes have 0 distinct touches → 0 candidates surfaced. This is the load-bearing structural property the scenario demonstrates.
5. `DsEventConsumer` extends `EventEmitter`. Emitting 'activate' before `createFreezeHookFromDsEvents` subscribes would lose the event. Build tool wires the factory FIRST, then emits — fixed ordering (mirrors R70 pattern).
6. `createFreezeHookFromDsEvents` uses `setTimeout` to auto-deactivate after `activation_window_seconds`. Build tool passes stub `setTimeout` returning `null as unknown` so activation does not auto-cancel within the recording window (mirrors R70 pattern; documented design choice).
7. `eBenjaminiHochberg` throws on `N=0` and on `qLevel ∉ (0,1]`. Build tool validates inputs before call; FDR scenario uses N=10 shards + qLevel=0.10 (both safely in-range).
8. `combineAverage` throws on empty input. Hierarchical-evalue scenario allocates N=5 shards from window 0; never invoked with empty input.
9. `updateFleetEProcessState` mutates state in-place; sticky-fire latch persists once `log_fleet_e_max ≥ log_threshold`. Hierarchical-evalue scenario captures `state.fired` per window to render the sticky-fire visualization.

---

## § 2. Mechanism

The R71 deliverable is a Node-only build tool at `tools/build-canned-demos.ts` plus its two checked-in build artifacts (`demos/scenarios/*.json` × 8 and `demos/demo.html`). The build tool exposes one public function `buildAllCannedDemos(opts?: BuildOpts): BuildResult` consumed BOTH by the CLI entry point AND by the q71 test file. The CLI is invoked via `pnpm build:demos`; tests import `buildAllCannedDemos` directly to verify idempotency without spawning subprocesses.

### 2.1 The eight scenarios

| # | Scenario name (file literal) | Engine surface(s) | Synthetic input | Visible behavior captured per window |
|---|---|---|---|---|
| 1 | `clean-baseline` | `freshBettingState` + `updateBettingState` | 10 shards × 30 windows × H₀ draws (μ=0, σ²=1) | `per_shard[s].M_t` stays ≪ 1/α=200 for every shard every window; `fired` false everywhere. |
| 2 | `sdc-drift` | `freshBettingState` + `updateBettingState` | 10 shards × 30 windows; from window 6 onward, additive drift `+0.4·(w-5)` is injected on shard-04 | shard-04's `M_t` crosses 200 at some window K ∈ [10, 25]; only shard-04 has terminal `fired = true`. |
| 3 | `common-mode-rack` | `attributeCommonMode` | 2-rack 6-shard topology (rack-A: shards 0/1/2; rack-B: shards 3/4/5); 3 fired-events on rack-A shards at single window | At "attribution window," 1 common-mode candidate surfaces with `shared_node_id = 'rack-A'`, `shared_node_kind = 'rack'`, `member_count = 3`. Other windows have no candidates. |
| 4 | `event-conditional` | `DsEventConsumer` + `createFreezeHookFromDsEvents` + `freezeAwareUpdatePerShardResidual` (transitive) | Single-shard residual; DS firmware-push event emitted at window K; per-shard observation submitted at window K+1 | Pre-event windows: `freeze_active = false`; event window: emits `activate`; post-event window: `freeze_active = true`, observation residual returned by reference-equality (absorbed = false). |
| 5 | `fdr-multiple-testing` | `eBenjaminiHochberg` + `freshBettingState` + `updateBettingState` | 10 shards × 30 windows; 3 shards (shards 02, 05, 08) carry sustained drift `+0.45/window` from window 4; remaining 7 shards H₀ | At terminal window N=30, the build tool runs `eBenjaminiHochberg(per-shard M_t, qLevel=0.10)` once on the terminal e-values. Captured: `terminal_state.fdr_selected_indices` (subset of [0..9]); `fdr_qLevel = 0.10`; `fdr_K = selected.length`. Expected K ∈ [1, 5] under the chosen seed/drift configuration. Per-window per-shard `M_t` trajectories are still captured. |
| 6 | `hierarchical-evalue` | `combineAverage` + `freshFleetEProcessState` + `updateFleetEProcessState` + per-shard `updateBettingState` | 5 shards × 30 windows; all 5 carry small additive drift `+0.2/window` starting at window 5 (no single shard fires alone, but fleet wealth accumulates) | Each window: capture per-shard `M_t`; convert to `log_e_per_shard = log(max(M, 1e-12))`; `combineAverage([log_e_per_shard])` → `log_fleet_e_t`; `updateFleetEProcessState(state, log_fleet_e_t, log(1/0.05))` (fleet α=0.05; `log_threshold = log(20) ≈ 2.9957`); capture `{ log_fleet_e_t, log_fleet_e_max, fired, tick_at_first_fire }` per window. Terminal `state.fired = true` AND `tick_at_first_fire !== null`. |
| 7 | `sparse-data-resilience` | `attributeCommonMode` | Topology with 6 gpu_shard nodes + 2 rack nodes BUT zero edges (sparse — node manifest survived; relationship layer corrupted/missing); 3 fired-events on shards 0/1/2 | `attributeCommonMode` walks BFS over empty adjacency; no candidate-eligible node is reachable; result has `candidates.length === 0`; no throw. Demonstrates graceful degradation under partial telemetry. |
| 8 | `topology-spanning-common-mode` | `attributeCommonMode` | 6 gpu_shard nodes split across 2 racks (rack-A: 0/1/2; rack-B: 3/4/5); 1 cooling_zone node `cz-1` contains both racks; 4 fired-events spanning both racks (shards 0/1/3/4) | `attributeCommonMode` walks BFS with `max_hop_distance = 2` (override default 1 via `opts.max_hop_distance: 2` so the cooling_zone 2 hops away is reachable); result has ≥ 1 candidate with `shared_node_kind = 'cooling_zone'`, `member_count = 4`. Demonstrates cluster-wide failure mode surfacing as ONE candidate, not N. |

**Mapping to PRD user stories:**

- US-01 (per-shard fault attribution) → scenarios 1, 2 (clean-baseline + sdc-drift demonstrate baseline-vs-drift discrimination).
- US-02 (topology-aware common-mode) → scenarios 3, 7, 8 (rack-localized + sparse-data + cooling-zone-spanning).
- US-03 (event-conditional attribution) → scenario 4 (DS event → freeze-hook).
- US-04 (statistically-rigorous fleet detector) → scenarios 5, 6 (FDR control + hierarchical e-value combination); also implicitly all scenarios via the betting e-process Ville-bound foundation.

### 2.2 Per-window captured shape (deterministic JSON; checked into git)

Every scenario JSON file at `demos/scenarios/<scenario-name>.json` MUST have this top-level shape:

```jsonc
{
  "schema_version": "tessera-demo-v1",          // string literal; gates future format evolution
  "scenario": "<name>",                          // matches filename stem
  "description": "<one-paragraph plain text>",   // human-readable scenario synopsis
  "params": { /* scenario-specific knobs */ },   // e.g., seed, shard_count, drift values, threshold
  "engine_surfaces": [ "<engine-fn-name>", ... ], // array of engine function names invoked (audit field)
  "windows": [                                    // length = N windows; chronological
    {
      "t": 0,                                    // 0-based window index
      "per_shard": [                              // length = shard_count; chronological by index
        {
          "shard_id": "shard-00",
          "M_t": 1.0,                            // current Family-A wealth (or null if scenario doesn't use Family-A)
          "fired": false                         // M_t >= threshold (or false if scenario doesn't compute)
        }
        // ...one entry per shard
      ],
      "events": [ /* scenario-specific event log entries */ ]
    }
    // ...one entry per window
  ],
  "terminal_state": {
    "firing_shards": [ "shard-04" ],             // sorted lex asc; empty array if none
    "common_mode_candidates": [                   // empty array if none
      {
        "shared_node_id": "rack-A",
        "shared_node_kind": "rack",
        "member_count": 3,
        "member_shard_ids": [ "shard-00", "shard-01", "shard-02" ]
      }
    ],
    "freeze_active": false,                       // boolean; true iff scenario activates freeze-hook
    "fdr_selected_indices": null,                 // null if scenario doesn't run e-BH; else array of 0-based indices
    "fdr_qLevel": null,                            // null if scenario doesn't run e-BH; else number ∈ (0,1]
    "fdr_K": null,                                 // null if scenario doesn't run e-BH; else integer == fdr_selected_indices.length
    "fleet_fired": null,                          // null if scenario doesn't track fleet state; else boolean
    "fleet_tick_at_first_fire": null              // null if scenario doesn't track fleet OR fleet didn't fire
  },
  "reasoning": "<one-paragraph plain text>",     // "Why does this fire / not fire? What does it show?"
  "suggested_actions": [                          // array of actionable strings; empty for clean-baseline
    "<one short verb-led recommendation>"
  ]
}
```

**JSON serialization rules** (load-bearing for determinism):

- Pretty-printed with 2-space indentation; trailing newline.
- Top-level keys in the exact order shown above.
- `per_shard` entries sorted by shard index (lex asc on shard_id is equivalent).
- `firing_shards` sorted lex asc.
- `member_shard_ids` sorted lex asc.
- `engine_surfaces` sorted lex asc.
- Numbers serialized via standard `JSON.stringify`; no scientific notation forced.
- M_t values rounded to 6 decimal places (`Math.round(M * 1e6) / 1e6`) to avoid floating-point determinism hazards across CPU architectures. (This is a design choice; the Implementer applies it uniformly to every M_t in `windows[].per_shard[].M_t` AND in `terminal_state.firing_shards` derivation.)
- Object key ordering is **insertion order** (Node guarantees this for non-integer-like keys); the Implementer constructs each captured object literal with keys in the order shown.

### 2.3 demo.html structure (committed artifact)

The build tool emits a single file. Structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tessera — Demo Dashboard</title>
  <style>/* vanilla CSS; ≤ 300 lines; no external @import; no @font-face */</style>
</head>
<body>
  <header id="tessera-header">…<h1>Tessera Demo</h1>…</header>

  <section id="tessera-controls">
    <select id="scenario-selector">
      <option value="clean-baseline">Clean baseline (no firings)</option>
      <option value="sdc-drift">SDC drift on shard-04</option>
      <option value="common-mode-rack">Common-mode (rack-localized)</option>
      <option value="event-conditional">Event-conditional freeze</option>
      <option value="fdr-multiple-testing">FDR control (e-BH)</option>
      <option value="hierarchical-evalue">Hierarchical e-value</option>
      <option value="sparse-data-resilience">Sparse-data resilience</option>
      <option value="topology-spanning-common-mode">Topology-spanning common-mode</option>
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
    <span id="window-indicator">window 0 / 30</span>
  </section>

  <main id="tessera-main">
    <section id="chart-panel">
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

  <!-- BEGIN-TESSERA-SCENARIO-DATA -->
  <script type="application/json" id="tessera-scenario-clean-baseline">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-sdc-drift">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-common-mode-rack">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-event-conditional">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-fdr-multiple-testing">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-hierarchical-evalue">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-sparse-data-resilience">{ … verbatim JSON … }</script>
  <script type="application/json" id="tessera-scenario-topology-spanning-common-mode">{ … verbatim JSON … }</script>
  <!-- END-TESSERA-SCENARIO-DATA -->

  <script>/* vanilla JS; no imports; no external deps; ≤ 400 lines; reads JSON from script tags,
              renders SVG trajectory, advances windows via setInterval gated by Play/Pause/Speed */</script>
</body>
</html>
```

The dashboard JS:
1. On DOMContentLoaded, reads all 8 `<script type="application/json">` blocks via `document.getElementById('tessera-scenario-<name>').textContent` + `JSON.parse`.
2. On `<select id="scenario-selector">` change, loads the selected scenario, resets window index to 0, redraws.
3. On Play, starts a `setInterval` at base 500 ms / speed (so 1× = 500 ms per window; 2× = 250 ms; 4× = 125 ms).
4. On each tick, increments window index, re-renders SVG trajectory (path per shard), updates verdict badges (firing / clean), appends audit entries (from `windows[t].events`), redraws reasoning + suggested-actions on terminal window.
5. On Reset, sets window index to 0, clears audit/reasoning panels, redraws.
6. SVG rendering: simple hand-rolled `<path d="M x0 y0 L x1 y1 …">` per shard; x-axis = window 0..N; y-axis = log10(max(M_t, 1)) clipped to [0, 4]; threshold line at log10(200) ≈ 2.301; one color per shard (palette of 10 dark-friendly colors hardcoded).
7. Verdict badges: `<span class="badge clean">shard-00 clean</span>` / `<span class="badge fire">shard-04 FIRE</span>`.

The dashboard JS does NOT use `fetch`, `eval`, `Function()`, or `import`. It uses only DOM APIs (`document.getElementById`, `document.querySelectorAll`, `element.textContent`, `element.innerHTML`, `element.appendChild`, `SVG namespace creation via document.createElementNS`).

### 2.4 Determinism mechanism

A 32-bit LCG (`state = (state * 1664525 + 1013904223) >>> 0`) produces uniform draws scaled into the Gaussian region by Box-Muller (same form as R70 `tools/demo-scenario.ts`: cos-only draw, one Gaussian per call). The seed per scenario is a fixed literal (Architect commits to these values; Implementer must not change):

- `clean-baseline` → seed = `0x71CB1`
- `sdc-drift` → seed = `0x71D1F`
- `common-mode-rack` → seed = `0x71C2D`
- `event-conditional` → seed = `0x71E2C`
- `fdr-multiple-testing` → seed = `0x71FD0`
- `hierarchical-evalue` → seed = `0x71F1E`
- `sparse-data-resilience` → seed = `0x71570`
- `topology-spanning-common-mode` → seed = `0x71500`

No `Math.random()`, no `Date.now()`, no `process.hrtime()` in the build tool's scenario-running code paths. All "timestamps" embedded in scenario JSON are fixed literal numbers. The build tool's HTML emission also uses no clock — the file's mtime is set by the OS but the file's CONTENTS are deterministic.

Common-mode-attribution `now` is stubbed: `opts.now: () => 1_700_000_200` (mirrors R70 pattern). Event-conditional `now` is similarly stubbed. The captured `attributed_at_ts` is therefore `1700000200` literally.

### 2.5 Tactical knob: drift magnitudes

For Family-A scenarios (#2 sdc-drift, #5 fdr-multiple-testing, #6 hierarchical-evalue), the injected drift magnitude determines whether wealth crosses the threshold at a "reasonable" window. The Architect prescribes specific literals:

- `sdc-drift`: drift `0.4/window` starting window 6 (matches R70 prescription; under R70 seed `0x70D1F`, R70 attestation showed crossing happened by window 15 with M ≈ 5443005).
- `fdr-multiple-testing`: drift `0.45/window` on shards 02, 05, 08 starting window 4. Tighter than sdc-drift to ensure at least one shard exits the unit-variance baseline within 30 windows; the e-BH operator surface then selects the top-K under qLevel=0.10.
- `hierarchical-evalue`: drift `0.20/window` on ALL 5 shards starting window 5. Smaller per-shard drift so no single shard fires alone, but accumulating fleet-level wealth fires by window N=30.

The Implementer MAY tune these magnitudes within a narrow band (each literal ± 0.10) IF and ONLY IF the prescribed value does not produce the expected terminal state under the chosen seed. Tuning rule: choose the smallest deviation that achieves the prescribed terminal predicate (e.g., for sdc-drift, `terminal_state.firing_shards == ['shard-04']` exactly). The Implementer documents any actual tuning in the GREEN commit message AND in `tools/build-canned-demos.ts` as an inline comment next to the constant.

### 2.6 Acceptance-criterion verification mechanism

Tests in `test/q71-demo-dashboard.test.ts` assert on **structural shape + predicate-on-terminal-state**, NOT on byte-identical file contents (with one exception below). This lets the Implementer iterate on JSON pretty-print formatting, comment placement in demo.html, etc., without breaking tests, while still binding discipline-critical properties.

**Exceptions binding byte-level identity:**

- AC-R71-3 (idempotency) re-runs the build tool and asserts `git diff demos/` is empty after the second invocation — that IS a byte-identical check, but at the *re-run* level, not against a hand-coded golden.

**No "golden file" assertions.** No test compares a checked-in `demos/demo.html` against a separately-checked-in `demos/demo.html.expected`. The committed `demos/demo.html` IS the canonical output of running the build tool; tests assert structural properties (presence of `<select id="scenario-selector">`, presence of `<script type="application/json" id="tessera-scenario-<name>">` for each scenario name, etc.) and JSON round-trip equality.

---

## § 3. Component inventory + Anti-scope ALLOWED_SET

### 3.1 What exists / what gets created / what changes

**Existing files the build tool READS (READ-ONLY; no modification):**

- All engine surfaces enumerated in § 1.3 above (13 engine files).
- `tools/demo-scenario.ts` (R70 CLI; READ-ONLY for anti-regression test; build tool does NOT import from it).

**Files CREATED at R71 (12 new files):**

| Path | Purpose | Tracked? |
|---|---|---|
| `tools/build-canned-demos.ts` | Single-file build tool; exports `buildAllCannedDemos`, `SCENARIO_NAMES`, `BuildResult`; has CLI guard via `require.main === module` | yes |
| `demos/scenarios/clean-baseline.json` | Build artifact; checked into git | yes |
| `demos/scenarios/sdc-drift.json` | Build artifact; checked into git | yes |
| `demos/scenarios/common-mode-rack.json` | Build artifact; checked into git | yes |
| `demos/scenarios/event-conditional.json` | Build artifact; checked into git | yes |
| `demos/scenarios/fdr-multiple-testing.json` | Build artifact; checked into git | yes |
| `demos/scenarios/hierarchical-evalue.json` | Build artifact; checked into git | yes |
| `demos/scenarios/sparse-data-resilience.json` | Build artifact; checked into git | yes |
| `demos/scenarios/topology-spanning-common-mode.json` | Build artifact; checked into git | yes |
| `demos/demo.html` | Static dashboard; checked into git; opens from `file://` | yes |
| `test/q71-demo-dashboard.test.ts` | 14 ACs (see § 5); imports `buildAllCannedDemos` for idempotency check | yes |
| `coordination/specs/Q-R71-EMPIRICAL.sh` | Chore-A verification harness; Implementer injects `$ROUND_START_SHA` literal pre-commit | yes |

**Files CHANGED at R71 (3 modifications):**

| Path | Change |
|---|---|
| `package.json` | Add `"build:demos": "node tools/build-canned-demos.js"` AND `"prebuild:demos": "tsc -p tsconfig.test.json"` to scripts block. No other change. |
| `README.md` | Extend existing "Quick demo" section (lines 73-84) with a paragraph + code block introducing `open demos/demo.html`. R70 CLI block at lines 78-82 is **preserved as a sibling** (per directive). |
| `coordination/NEXT-ROLE.md` | Architect routing block (this round); Implementer routing block (after chore-A); Reviewer routing block; Memorial-Updater routing block. |

**Files CONDITIONALLY CREATED at R71:**

| Path | Condition |
|---|---|
| `coordination/diagnostics/DIAGNOSTIC-R71-*.md` | Only if a halt condition fires (per § 6 below). |

**Compiled-artifact note** (R23 ARCH MINOR-2 — `.gitignore`-aware spec inventories): `.js` files compiled from `.ts` sources (e.g., `tools/build-canned-demos.js`, `test/q71-demo-dashboard.test.js`, and any `demos/*.js` compiled artifacts) are NOT git-tracked per the project's existing `.gitignore` `*.js` rule. They appear at build time but are absent from `git diff --name-only`. The ALLOWED_SET below therefore lists only `.ts` source files for the diff-check; the `.js` compiled outputs are addressed by the engine carve-out (no `engine/` modification) and are not appearance-in-diff load-bearing. (Architect verified via `git ls-files tools/*.js demos/*.json` at session entry: zero output for `*.js`; the existing R70 `tools/demo-scenario.js` is absent from git, confirming the rule.)

### 3.2 ALLOWED_SET (anti-scope diff at chore-A)

The anti-scope AC (AC-R71-14) binds the `git diff $ROUND_START_SHA..HEAD --name-only` output to be a subset of the following allowed paths:

```
tools/build-canned-demos.ts
demos/scenarios/clean-baseline.json
demos/scenarios/sdc-drift.json
demos/scenarios/common-mode-rack.json
demos/scenarios/event-conditional.json
demos/scenarios/fdr-multiple-testing.json
demos/scenarios/hierarchical-evalue.json
demos/scenarios/sparse-data-resilience.json
demos/scenarios/topology-spanning-common-mode.json
demos/demo.html
package.json
README.md
test/q71-demo-dashboard.test.ts
coordination/specs/Q-R71-SPEC.md
coordination/specs/Q-R71-SPEC-AUDIT.md
coordination/specs/Q-R71-EMPIRICAL.sh
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

Plus the regex carve-out `coordination/diagnostics/DIAGNOSTIC-R71-*.md` (any path matching this pattern is allowed; absent unless a halt fires).

`ROUND_START_SHA` is captured by the Implementer at chore-A from the Architect's spec-triad commit SHA (this commit's parent at chore-A time = the spec-triad commit; the Implementer captures via `git rev-parse HEAD` AFTER the spec-triad commit and BEFORE the chore-A commit — same mechanism as R70).

### 3.3 Anti-scope hard limits (hard NO; trigger HALT + DIAGNOSTIC if forced)

- **A1** — NO new external npm/pnpm dependencies. The dashboard uses only Node-builtins + browser APIs already in any modern browser. Halt #5 fires if Implementer perceives a need for `chalk`, `d3`, `chart.js`, `ejs`, `handlebars`, or any other library.
- **A2** — NO modification of any `engine/*` file. Halt #4 fires if Implementer perceives a need for an engine-side change (e.g., a "demo-only" entry point).
- **A3** — NO modification of `tools/demo-scenario.ts` (R70 CLI is READ-ONLY; preserved as sibling per directive).
- **A4** — NO modification of any pre-R71 test file under `test/q*.test.ts` or `test/q*.test.js`.
- **A5** — NO modification of any prior-round spec file under `coordination/specs/Q-R<01..70>-SPEC*.md` or `Q-R<01..70>-EMPIRICAL.sh`.
- **A6** — NO modification of CLAUDE-*.md REINFORCEMENTS sections.
- **A7** — NO real-cluster work (Path B preserved).
- **A8** — NO DS-repo modifications (W3-1 Option A preserved). Reading `~/concord/deploysignal/demos/` files for pattern reference is OK; copying files across the boundary is NOT.
- **A9** — NO `gh repo` operations (publication is done at R69).
- **A10** — NO browser-bundling / module-bundling tooling (halt #8).
- **A11** — NO modification of the R36-30 / R36-31 / AC-R36-21 / AC-R65-2 / AC-R66-14 carry-forward fail set. These are discipline-debt for Phase 4 hygiene.
- **A12** — NO `fetch()`, `import`, `eval`, `Function()`, `XMLHttpRequest`, `WebSocket`, or any cross-origin / loader API in `demos/demo.html`'s embedded JS. The dashboard must work entirely from `<script type="application/json">` blocks at the same origin (file://).
- **A13** — NO forward-protection AC pattern (no AC asserts a future SHA's diff is empty / non-empty). NO live-file-count AC pattern (no AC asserts a count derived from `find`/`ls -1`/`git ls-files` at HEAD; bind by NAMED file existence and named JSON fields). NO anti-scope-diff-against-prior-round-allowed-set AC pattern. (R62 + R66 + R68 cumulative lesson; this is the 4th-instance avoidance.)

---

## § 4. Per-file pseudocode

### 4.1 `tools/build-canned-demos.ts`

```ts
// tools/build-canned-demos.ts — Tessera R71 demo dashboard build tool.
//
// Goal: convert Tessera's 4-CLI-scenario surface (R70) into an 8-scenario
// dashboard with audit / reasoning / suggested-actions panels.
//
// Anti-scope: no new external deps; no engine modifications;
// no real-cluster work; no DS-repo modifications; no browser bundling.
//
// Tessera-original code. NOT vendored.

// ── Engine imports (same .js extension convention as tools/demo-scenario.ts; see R70 IMPL MINOR-1) ──
import { freshBettingState, updateBettingState }
  from '../engine/detectors/betting-e-process.js';
import { attributeCommonMode, type FiredShardEvent, DEFAULT_MIN_MEMBER_COUNT }
  from '../engine/topology/common-mode-attribution.js';
import { DsEventConsumer } from '../engine/ds-integration/event-consumer.js';
import { createFreezeHookFromDsEvents }
  from '../engine/ds-integration/freeze-hook-factory.js';
import { initialPerShardResidual } from '../engine/per-shard/warm-start.js';
import { eBenjaminiHochberg } from '../engine/fleet/e-bh.js';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState }
  from '../engine/fleet/combine.js';
import type { TopologySnapshot, TopologyNode, TopologyEdge }
  from '../engine/types/verdict.js';
import type { ExtendedSampleObservation } from '../engine/per-shard/runtime.js';
import type { DeployEventPayload } from '../engine/ds-integration/event-contract.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public types ──
export type ScenarioName =
  | 'clean-baseline' | 'sdc-drift' | 'common-mode-rack' | 'event-conditional'
  | 'fdr-multiple-testing' | 'hierarchical-evalue'
  | 'sparse-data-resilience' | 'topology-spanning-common-mode';

export const SCENARIO_NAMES: ReadonlyArray<ScenarioName> = [
  'clean-baseline',
  'sdc-drift',
  'common-mode-rack',
  'event-conditional',
  'fdr-multiple-testing',
  'hierarchical-evalue',
  'sparse-data-resilience',
  'topology-spanning-common-mode',
];

export interface BuildResult {
  scenarios_written: ReadonlyArray<{ name: ScenarioName; path: string }>;
  html_written_to: string;
  bytes_total: number;
}

export interface BuildOpts { readonly _reserved?: never; }

// ── LCG + Gaussian (same form as tools/demo-scenario.ts) ──
const SCENARIO_SEEDS: Record<ScenarioName, number> = {
  'clean-baseline':                0x71CB1,
  'sdc-drift':                     0x71D1F,
  'common-mode-rack':              0x71C2D,
  'event-conditional':             0x71E2C,
  'fdr-multiple-testing':          0x71FD0,
  'hierarchical-evalue':           0x71F1E,
  'sparse-data-resilience':        0x71570,
  'topology-spanning-common-mode': 0x71500,
};

function makeLcg(seed: number): () => number { /* matches tools/demo-scenario.ts:72 */ }
function boxMullerGaussian(rng: () => number): number { /* matches tools/demo-scenario.ts:81 */ }

// ── Scenario-1 runner: clean-baseline ──
function runCleanBaselineRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['clean-baseline']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;   // 200
  const shardIds = Array.from({length: SHARD_COUNT}, (_, i) => `shard-${String(i).padStart(2,'0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows = [];
  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      const draw = boxMullerGaussian(rng);
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    windows.push({
      t: w,
      per_shard: states.map((st, s) => ({
        shard_id: shardIds[s],
        M_t: round6(st.M),
        fired: st.M >= DEMO_THRESHOLD,
      })),
      events: [],   // clean-baseline: no audit-trail events
    });
  }
  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();
  return composeScenarioJson({
    scenario: 'clean-baseline',
    description: 'Healthy NVIDIA NVLink fleet — no drift injected. ' +
                 'Family A betting e-process stays in baseline across all 10 shards × 30 windows.',
    params: { seed: SCENARIO_SEEDS['clean-baseline'], shard_count: SHARD_COUNT,
              window_count: WINDOW_COUNT, alpha: DEMO_ALPHA, threshold: DEMO_THRESHOLD },
    engine_surfaces: ['freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,                    // expected: []
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null, fdr_qLevel: null, fdr_K: null,
      fleet_fired: null, fleet_tick_at_first_fire: null,
    },
    reasoning: 'Under H₀ (no drift), the betting e-process is a martingale; ' +
               'wealth M_t fluctuates around 1.0 without crossing the 1/α = 200 ' +
               'threshold over any 30-window window. This scenario demonstrates ' +
               'no-false-positives on a healthy fleet.',
    suggested_actions: [],
  });
}

// ── Scenario-2 runner: sdc-drift ──
//   Same form as scenario 1, but inject additive drift on shard-04 from window 6+.
//   Captures threshold-crossing window in events[].
function runSdcDriftRecording(): ScenarioJson { /* … */ }

// ── Scenario-3 runner: common-mode-rack ──
//   Window count: 5. Windows 0-3: no events. Window 3 (the "attribution window"):
//   3 fired-events on shards 0/1/2 (rack-A) are submitted to attributeCommonMode.
//   Captured: candidates from attribution result.
function runCommonModeRackRecording(): ScenarioJson { /* … */ }

// ── Scenario-4 runner: event-conditional ──
//   Window count: 5. Window 2: emit DS firmware_push event; freeze-hook activates.
//   Window 3: submit per-shard observation; assert frozen (residual returned unchanged).
function runEventConditionalRecording(): ScenarioJson { /* … */ }

// ── Scenario-5 runner: fdr-multiple-testing ──
//   10 shards × 30 windows. Shards 2, 5, 8 carry sustained drift +0.45/window from window 4.
//   At terminal window 29: run eBenjaminiHochberg(per-shard-M, qLevel=0.10).
//   Captured: terminal_state.fdr_selected_indices, fdr_qLevel, fdr_K.
function runFdrMultipleTestingRecording(): ScenarioJson { /* … */ }

// ── Scenario-6 runner: hierarchical-evalue ──
//   5 shards × 30 windows. All shards drift +0.20/window from window 5.
//   Each window: compute per-shard log_e = log(max(M, 1e-12)); combine via combineAverage;
//   update fleet state; capture fleet_fired + tick_at_first_fire.
function runHierarchicalEvalueRecording(): ScenarioJson { /* … */ }

// ── Scenario-7 runner: sparse-data-resilience ──
//   Window count: 3. Snapshot has nodes (6 gpu_shard + 2 rack) but zero edges.
//   Window 2 attribution: fired-events on shards 0/1/2; expect 0 candidates (BFS over empty adj).
function runSparseDataResilienceRecording(): ScenarioJson { /* … */ }

// ── Scenario-8 runner: topology-spanning-common-mode ──
//   Window count: 5. Snapshot: 6 gpu_shard + 2 rack + 1 cooling_zone; cooling_zone contains both racks.
//   Window 3 attribution: 4 fired-events on shards 0/1/3/4 (spanning racks);
//     opts: { max_hop_distance: 2, candidate_node_kinds: ['cooling_zone', 'rack', 'psu'] }.
//   Expect 1+ candidate with shared_node_kind === 'cooling_zone'.
function runTopologySpanningRecording(): ScenarioJson { /* … */ }

// ── JSON composition + serialization ──
type ScenarioJson = { /* shape per § 2.2 */ };
function composeScenarioJson(args: { /* … */ }): ScenarioJson { /* preserve key order per § 2.2 */ }
function serializeScenarioJson(j: ScenarioJson): string {
  return JSON.stringify(j, null, 2) + '\n';   // trailing newline
}
function round6(x: number): number { return Math.round(x * 1e6) / 1e6; }

// ── HTML emission ──
const HTML_TEMPLATE_HEAD = `<!DOCTYPE html>\n<html lang="en">\n<head>\n…\n</head>\n<body>\n`;
const HTML_TEMPLATE_BODY = `<header…</header>\n<section id="tessera-controls">…</section>\n` +
                            `<main id="tessera-main">…</main>\n`;
const HTML_TEMPLATE_FOOTER = `<script>…dashboard JS body…</script>\n</body>\n</html>\n`;
const SENTINEL_BEGIN = '<!-- BEGIN-TESSERA-SCENARIO-DATA -->';
const SENTINEL_END   = '<!-- END-TESSERA-SCENARIO-DATA -->';

function renderDemoHtml(scenarios: ReadonlyArray<{ name: ScenarioName; json: string }>): string {
  const dataBlock = [
    SENTINEL_BEGIN,
    ...scenarios.map(({ name, json }) =>
      `<script type="application/json" id="tessera-scenario-${name}">${json.trimEnd()}</script>`),
    SENTINEL_END,
  ].join('\n') + '\n';
  return HTML_TEMPLATE_HEAD + HTML_TEMPLATE_BODY + dataBlock + HTML_TEMPLATE_FOOTER;
}

// ── Public entry point ──
export function buildAllCannedDemos(_opts?: BuildOpts): BuildResult {
  const root = path.resolve(__dirname, '..');
  const scenariosDir = path.join(root, 'demos', 'scenarios');
  fs.mkdirSync(scenariosDir, { recursive: true });

  const runners: Record<ScenarioName, () => ScenarioJson> = {
    'clean-baseline':                runCleanBaselineRecording,
    'sdc-drift':                     runSdcDriftRecording,
    'common-mode-rack':              runCommonModeRackRecording,
    'event-conditional':             runEventConditionalRecording,
    'fdr-multiple-testing':          runFdrMultipleTestingRecording,
    'hierarchical-evalue':           runHierarchicalEvalueRecording,
    'sparse-data-resilience':        runSparseDataResilienceRecording,
    'topology-spanning-common-mode': runTopologySpanningRecording,
  };

  const written: Array<{ name: ScenarioName; path: string }> = [];
  const jsonByName: Array<{ name: ScenarioName; json: string }> = [];
  let bytesTotal = 0;

  for (const name of SCENARIO_NAMES) {
    const j = runners[name]();
    const s = serializeScenarioJson(j);
    const p = path.join(scenariosDir, `${name}.json`);
    fs.writeFileSync(p, s);
    written.push({ name, path: p });
    jsonByName.push({ name, json: s });
    bytesTotal += s.length;
  }

  const html = renderDemoHtml(jsonByName);
  const htmlPath = path.join(root, 'demos', 'demo.html');
  fs.writeFileSync(htmlPath, html);
  bytesTotal += html.length;

  return { scenarios_written: written, html_written_to: htmlPath, bytes_total: bytesTotal };
}

// ── CLI guard (matches tools/demo-scenario.ts:470 convention) ──
if (require.main === module) {
  const result = buildAllCannedDemos();
  process.stdout.write(
    `Built ${result.scenarios_written.length} scenarios + demos/demo.html ` +
    `(${result.bytes_total} bytes total).\n`,
  );
  process.exit(0);
}
```

**Implementation notes for the Implementer:**

1. Each `run*Recording` function is its own implementation. Architect does NOT prescribe per-line code; the Architect prescribes (a) which engine surface(s) to call, (b) what inputs to seed with, (c) what to capture per window, (d) what terminal state predicate to satisfy. Implementer wires the loop.
2. The 8 `reasoning` strings + the `suggested_actions` arrays are pre-authored prose. Architect prescribes them in § 4.2 below. Implementer copies verbatim.
3. The HTML/CSS/JS template body is described structurally in § 2.3 above. Implementer authors the actual CSS + JS — the spec does not prescribe colors, layout pixels, or selector class names. Implementer's CSS is vanilla; JS uses only DOM APIs per § 2.3.

### 4.2 Pre-authored prose (Implementer copies verbatim into the build tool)

| Scenario | `reasoning` (one paragraph, verbatim) | `suggested_actions` (verbatim array) |
|---|---|---|
| `clean-baseline` | "Under H₀ (no drift), the betting e-process is a martingale; wealth M_t fluctuates around 1.0 without crossing the 1/α = 200 threshold over any 30-window window. This scenario demonstrates no-false-positives on a healthy fleet." | `[]` (empty) |
| `sdc-drift` | "Synthetic SDC drift is injected on shard-04 from window 6 onward as an additive mean shift growing linearly. The Family A betting e-process accumulates wealth specifically on shard-04 because the GRAPA bet is data-adaptive; other shards' M_t stays bounded. Per-shard residual would, in production, surface shard-04 as the specific shard responsible — the demo's terminal_state.firing_shards reflects exactly this." | `["Inspect shard-04 GPU health metrics (DCGM ECC + Xid + memory ECC)", "Verify the drift window timestamp against deploy / firmware audit logs", "Quarantine shard-04 from new workload placements pending hardware triage"]` |
| `common-mode-rack` | "Three shards on rack-A fire simultaneously. Without topology-aware attribution this would surface as 3 independent per-shard alerts. With topology-aware attribution it surfaces as 1 common-mode candidate keyed on rack-A, suggesting a rack-localized root cause (PSU, top-of-rack switch, or shared cooling)." | `["Inspect rack-A power / cooling / network at the rack-localized layer (NOT per-shard)", "Correlate the firing window against rack-A maintenance / hardware-event audit logs", "Verify no concurrent unrelated faults on rack-B before attributing to rack-A common-mode"]` |
| `event-conditional` | "Tessera receives a DS firmware-push event before the per-shard sample is processed. The freeze-hook activates; the residual update path returns the current residual unchanged (no event-driven drift absorbed). Downstream detectors see the pre-event baseline; once the activation window expires, the residual resumes updating normally." | `["No immediate action — event-conditional attribution is suppressing this drift by design", "Verify the deploy event window matches the observed drift envelope (sanity check)", "If the freeze window proves too short / too long under live load, tune activation_window_seconds at the freeze-hook factory"]` |
| `fdr-multiple-testing` | "Ten shards' per-shard e-values (terminal M_t) are submitted to the e-Benjamini-Hochberg procedure at FDR target q = 0.10. Three shards (02, 05, 08) carried sustained drift; the e-BH procedure selects the subset whose e-values satisfy k · e_(k) ≥ N / q under the Ren-Barber 2024 / Wang-Ramdas 2022 fixed-time guarantee. Expected falsely-flagged-shard count ≤ q · K — a formal bound that holds even under correlated drift." | `["Triage the e-BH-selected shards as a batch (FDR bound makes this safe at q=0.10)", "Do NOT inspect non-selected shards individually unless their e-value is independently interesting", "Adjust qLevel down (toward 0.05) for higher-precision but lower-recall flagging in production"]` |
| `hierarchical-evalue` | "Five shards each carry small drift (+0.20/window) too small to fire alone, but the per-shard e-values combine via combineAverage (Vovk-Wang 2021 §4 — convex combinations of e-values are e-values under arbitrary dependence). The fleet wealth crosses log(1/α_fleet) = log(20) at the captured tick_at_first_fire. This demonstrates that the fleet-level Ville bound preserves the any-time guarantee under correlated drift." | `["Investigate at the fleet level (deploy / firmware / config rollout) — per-shard individual investigations will be inconclusive", "Cross-reference the tick_at_first_fire against deploy event audit logs for a fleet-wide cause", "If correlated drift cannot be ruled out, prefer combineAverage over combineProduct (the current default already does this)"]` |
| `sparse-data-resilience` | "The topology snapshot has nodes (racks + shards) but zero edges — a degraded telemetry state where the relationship layer is missing or corrupted. Three shards fire simultaneously, but BFS over an empty adjacency list reaches no candidate-eligible nodes; the attribution layer returns 0 candidates without throwing. This demonstrates that topology-aware attribution degrades gracefully under partial data rather than failing closed (which would mask the per-shard alerts)." | `["Fall back to per-shard alerts: 3 independent firings on shards 0/1/2 require individual investigation", "Investigate the topology data source: why are edges missing? Re-fetch the snapshot before re-running attribution", "Audit whether the topology source's sparse-data path is correctly identifying this as 'incomplete' rather than 'no common-mode found'"]` |
| `topology-spanning-common-mode` | "Four shards spanning both racks fire simultaneously. With the default max_hop_distance = 1, common-mode attribution would surface two separate rack-level candidates. With max_hop_distance = 2 and cooling_zone included in candidate_node_kinds, the BFS reaches the cooling_zone node common to both racks and surfaces ONE cooling-zone-level candidate spanning all 4 firing shards. This demonstrates how operator-tunable BFS depth controls attribution granularity from rack to cooling-zone to (in larger fleets) datacenter-level common modes." | `["Inspect cooling-zone-level infrastructure (chilled-water loops, ambient temperature sensors, datacenter HVAC)", "Verify the cooling-zone topology data: is cz-1 correctly modeled as containing rack-A and rack-B?", "If cluster-wide common-mode is a frequent operating regime, raise the default max_hop_distance in production attribution-pipeline config (operator policy decision)"]` |

### 4.3 `test/q71-demo-dashboard.test.ts` (acceptance criterion mapping)

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cp from 'node:child_process';
import {
  buildAllCannedDemos, SCENARIO_NAMES, type ScenarioName,
} from '../tools/build-canned-demos.js';

// ── Helper: read scenario JSON ──
const ROOT = path.resolve(__dirname, '..');
function readScenarioJson(name: ScenarioName): any {
  const p = path.join(ROOT, 'demos', 'scenarios', `${name}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function readDemoHtml(): string {
  return fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'), 'utf8');
}

// AC-R71-1: build tool exports
test('AC-R71-1: tools/build-canned-demos.ts exports buildAllCannedDemos + SCENARIO_NAMES', () => {
  assert.equal(typeof buildAllCannedDemos, 'function');
  assert.ok(Array.isArray(SCENARIO_NAMES));
  assert.equal(SCENARIO_NAMES.length, 8);
});

// AC-R71-2: each scenario JSON exists + has required structural fields
test('AC-R71-2: each demos/scenarios/<name>.json exists with required fields', () => {
  for (const name of SCENARIO_NAMES) {
    const j = readScenarioJson(name);
    assert.equal(j.schema_version, 'tessera-demo-v1');
    assert.equal(j.scenario, name);
    assert.equal(typeof j.description, 'string');
    assert.ok(j.description.length >= 20);
    assert.ok(Array.isArray(j.engine_surfaces));
    assert.ok(j.engine_surfaces.length >= 1);
    assert.ok(Array.isArray(j.windows));
    assert.ok(j.windows.length >= 1);
    for (const w of j.windows) {
      assert.equal(typeof w.t, 'number');
      assert.ok(Array.isArray(w.per_shard));
      for (const ps of w.per_shard) {
        assert.equal(typeof ps.shard_id, 'string');
        // M_t can be null for scenarios that don't compute Family-A wealth
        assert.ok(ps.M_t === null || typeof ps.M_t === 'number');
        assert.equal(typeof ps.fired, 'boolean');
      }
      assert.ok(Array.isArray(w.events));
    }
    const ts = j.terminal_state;
    assert.ok(Array.isArray(ts.firing_shards));
    assert.ok(Array.isArray(ts.common_mode_candidates));
    assert.equal(typeof ts.freeze_active, 'boolean');
    assert.equal(typeof j.reasoning, 'string');
    assert.ok(j.reasoning.length >= 20);
    assert.ok(Array.isArray(j.suggested_actions));
  }
});

// AC-R71-3: deterministic regeneration — running buildAllCannedDemos twice produces byte-identical files
test('AC-R71-3: buildAllCannedDemos is idempotent (byte-identical re-run)', () => {
  // Capture pre-run bytes (committed artifacts).
  const pre = SCENARIO_NAMES.map((n) => fs.readFileSync(path.join(ROOT, 'demos', 'scenarios', `${n}.json`)));
  const preHtml = fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'));
  buildAllCannedDemos();
  for (let i = 0; i < SCENARIO_NAMES.length; i++) {
    const post = fs.readFileSync(path.join(ROOT, 'demos', 'scenarios', `${SCENARIO_NAMES[i]}.json`));
    assert.deepEqual(post, pre[i], `${SCENARIO_NAMES[i]}.json changed on re-run`);
  }
  const postHtml = fs.readFileSync(path.join(ROOT, 'demos', 'demo.html'));
  assert.deepEqual(postHtml, preHtml, 'demos/demo.html changed on re-run');
});

// AC-R71-4: clean-baseline terminal_state.firing_shards is empty
test('AC-R71-4: clean-baseline scenario has terminal_state.firing_shards == []', () => {
  const j = readScenarioJson('clean-baseline');
  assert.deepEqual(j.terminal_state.firing_shards, []);
});

// AC-R71-5: sdc-drift terminal_state.firing_shards contains exactly shard-04
test('AC-R71-5: sdc-drift scenario terminal_state.firing_shards is exactly ["shard-04"]', () => {
  const j = readScenarioJson('sdc-drift');
  assert.deepEqual(j.terminal_state.firing_shards, ['shard-04']);
});

// AC-R71-6: common-mode-rack surfaces at least one rack-A candidate
test('AC-R71-6: common-mode-rack scenario surfaces candidate with shared_node_id="rack-A", member_count=3', () => {
  const j = readScenarioJson('common-mode-rack');
  const cands = j.terminal_state.common_mode_candidates;
  assert.ok(cands.length >= 1);
  const rackA = cands.find((c: any) => c.shared_node_id === 'rack-A');
  assert.ok(rackA, 'rack-A candidate not found');
  assert.equal(rackA.shared_node_kind, 'rack');
  assert.equal(rackA.member_count, 3);
  assert.deepEqual([...rackA.member_shard_ids].sort(), ['shard-00', 'shard-01', 'shard-02']);
});

// AC-R71-7: event-conditional terminal_state.freeze_active === true
test('AC-R71-7: event-conditional scenario terminal_state.freeze_active === true', () => {
  const j = readScenarioJson('event-conditional');
  assert.equal(j.terminal_state.freeze_active, true);
});

// AC-R71-8: fdr-multiple-testing surfaces a non-trivial FDR selection
test('AC-R71-8: fdr-multiple-testing scenario terminal_state.fdr_K is integer ≥ 1 AND ≤ 5', () => {
  const j = readScenarioJson('fdr-multiple-testing');
  const ts = j.terminal_state;
  assert.equal(typeof ts.fdr_K, 'number');
  assert.ok(Number.isInteger(ts.fdr_K));
  assert.ok(ts.fdr_K >= 1, `fdr_K = ${ts.fdr_K}; expected ≥ 1`);
  assert.ok(ts.fdr_K <= 5, `fdr_K = ${ts.fdr_K}; expected ≤ 5`);
  assert.equal(ts.fdr_qLevel, 0.10);
  assert.ok(Array.isArray(ts.fdr_selected_indices));
  assert.equal(ts.fdr_selected_indices.length, ts.fdr_K);
});

// AC-R71-9: hierarchical-evalue terminal_state.fleet_fired === true AND tick_at_first_fire is non-null
test('AC-R71-9: hierarchical-evalue scenario fleet wealth crosses threshold (fleet_fired === true)', () => {
  const j = readScenarioJson('hierarchical-evalue');
  const ts = j.terminal_state;
  assert.equal(ts.fleet_fired, true);
  assert.equal(typeof ts.fleet_tick_at_first_fire, 'number');
  assert.ok(Number.isInteger(ts.fleet_tick_at_first_fire));
});

// AC-R71-10: sparse-data-resilience terminal_state.common_mode_candidates is empty (graceful degradation)
test('AC-R71-10: sparse-data-resilience scenario surfaces 0 candidates without throwing', () => {
  const j = readScenarioJson('sparse-data-resilience');
  assert.deepEqual(j.terminal_state.common_mode_candidates, []);
});

// AC-R71-11: topology-spanning-common-mode surfaces a cooling_zone candidate with ≥4 members
test('AC-R71-11: topology-spanning-common-mode scenario surfaces cooling_zone candidate with member_count ≥ 4', () => {
  const j = readScenarioJson('topology-spanning-common-mode');
  const cands = j.terminal_state.common_mode_candidates;
  const cz = cands.find((c: any) => c.shared_node_kind === 'cooling_zone');
  assert.ok(cz, 'cooling_zone candidate not found');
  assert.ok(cz.member_count >= 4, `member_count = ${cz.member_count}; expected ≥ 4`);
});

// AC-R71-12: demos/demo.html has structural elements
test('AC-R71-12: demos/demo.html has required structural elements', () => {
  const html = readDemoHtml();
  assert.match(html, /<select id="scenario-selector">/);
  assert.match(html, /<button id="btn-play">/);
  assert.match(html, /<button id="btn-pause">/);
  assert.match(html, /<button id="btn-reset">/);
  assert.match(html, /<select id="speed-selector">/);
  assert.match(html, /<svg id="mt-chart"/);
  assert.match(html, /<section id="audit-panel">/);
  assert.match(html, /<section id="reasoning-panel">/);
  assert.match(html, /<section id="next-actions-panel">/);
  for (const name of SCENARIO_NAMES) {
    const tag = new RegExp(`<script type="application/json" id="tessera-scenario-${name}">`);
    assert.match(html, tag, `inlined scenario block for ${name} not found`);
  }
});

// AC-R71-13: demo.html embedded JSON round-trips per scenario
test('AC-R71-13: demo.html inlined JSON ≡ demos/scenarios/<name>.json (round-trip equality)', () => {
  const html = readDemoHtml();
  for (const name of SCENARIO_NAMES) {
    const re = new RegExp(
      `<script type="application/json" id="tessera-scenario-${name}">([\\s\\S]*?)</script>`,
    );
    const m = html.match(re);
    assert.ok(m, `inlined scenario block for ${name} not extractable`);
    const inlined = JSON.parse(m![1]);
    const onDisk = readScenarioJson(name);
    assert.deepEqual(inlined, onDisk, `inlined scenario for ${name} drifted from on-disk JSON`);
  }
});

// AC-R71-14: anti-regression — tools/demo-scenario.ts still exports runScenario + SCENARIO_NAMES
test('AC-R71-14: R70 CLI surface preserved (anti-regression)', async () => {
  const r70 = await import('../tools/demo-scenario.js');
  assert.equal(typeof r70.runScenario, 'function');
  assert.ok(Array.isArray(r70.SCENARIO_NAMES));
  assert.equal(r70.SCENARIO_NAMES.length, 4);
  const result = r70.runScenario('clean-baseline');
  assert.equal(result.exit_code, 0);
  assert.match(result.output, /Tessera demo · clean-baseline/);
});
```

**Test count:** 14 ACs total. Implementer authors each as one `test()` invocation. No `assert.fail('RED — pending')` stubs at GREEN; the RED commit lands a separate `assert.fail` per AC per R23 TDD discipline.

### 4.4 `package.json` modification

Add two entries to `scripts` (preserve other entries verbatim; order: insert after the existing `demo` script):

```json
{
  "scripts": {
    "build": "tsc",
    "predemo": "tsc -p tsconfig.test.json",
    "demo": "node tools/demo-scenario.js",
    "prebuild:demos": "tsc -p tsconfig.test.json",
    "build:demos": "node tools/build-canned-demos.js",
    "pretest": "tsc -p tsconfig.test.json",
    "test": "node --test test/*.test.js",
    "typecheck": "tsc -p tsconfig.test.json --noEmit"
  }
}
```

### 4.5 `README.md` modification

Replace the existing "Quick demo" section (lines 73-84 at session entry) with the following content. The CLI invocation block from R70 IS PRESERVED as a sibling — operator directive "R70 CLI demos preserved as sibling not replaced."

```markdown
## Quick demo

Tessera ships two demo surfaces — a CLI for terminal walk-through (R70) and a browser dashboard for clickable exploration (R71).

### Browser dashboard

```bash
open demos/demo.html      # opens in default browser; no install / no server required
```

The dashboard pages through 8 pre-recorded scenarios (clean baseline, single-shard SDC drift, rack-localized common mode, event-conditional freeze, FDR control, hierarchical e-value combination, sparse-data resilience, and topology-spanning common mode) with Play / Pause / Reset / Speed controls, an audit-trail panel, a reasoning panel, and a suggested-next-actions panel. All scenarios are deterministic and regeneratable via `pnpm build:demos`. The dashboard ships as a single static HTML file with vanilla CSS/JS — no external dependencies, opens from `file://`.

### CLI scenarios

Run any of four canned scenarios in the terminal:

```bash
pnpm demo clean-baseline       # healthy fleet — no firings
pnpm demo sdc-drift            # silent SDC drift on shard-04 → Family A betting fires
pnpm demo common-mode-rack     # 3 shards on shared rack → 1 common-mode candidate
pnpm demo event-conditional    # firmware-push event → freeze-hook activates
```

Each scenario runs in under 30 seconds, produces deterministic ASCII output, and exercises one real engine surface against synthetic inputs (no live cluster needed). Source: [`tools/demo-scenario.ts`](./tools/demo-scenario.ts).

### Regenerating canned scenarios

```bash
pnpm build:demos        # regenerates demos/scenarios/*.json + demos/demo.html
```

Idempotent: re-running produces byte-identical files. The 8 scenario JSON files double as audit-inspectable evidence of what the dashboard shows. Source: [`tools/build-canned-demos.ts`](./tools/build-canned-demos.ts).
```

Implementer copies this content verbatim into README.md between the existing "## Quick demo" heading line (line 73) and the next "## Methodology" heading line (line 86).

---

## § 5. Acceptance criteria

The AC table below uses "Given X, when Y, then Z" form. No ambiguous language. Each Then-clause names the exact observable; tests in § 4.3 implement them.

| ID | Given | When | Then |
|---|---|---|---|
| AC-R71-1 | `tools/build-canned-demos.ts` is committed at chore-A and compiled by `tsc -p tsconfig.test.json` | importing `buildAllCannedDemos` and `SCENARIO_NAMES` from the compiled `tools/build-canned-demos.js` in a Node test | `typeof buildAllCannedDemos === 'function'` AND `Array.isArray(SCENARIO_NAMES)` AND `SCENARIO_NAMES.length === 8`. |
| AC-R71-2 | The 8 `demos/scenarios/<name>.json` files are committed at chore-A | reading each file and `JSON.parse`-ing it | Each parsed object has fields `schema_version === 'tessera-demo-v1'`, `scenario === <name>`, `typeof description === 'string'` with length ≥ 20, `Array.isArray(engine_surfaces)` with length ≥ 1, `Array.isArray(windows)` with length ≥ 1, every `windows[t].per_shard` entry has `{shard_id: string, M_t: number | null, fired: boolean}`, `windows[t].events` is an array, `terminal_state` has `{firing_shards: array, common_mode_candidates: array, freeze_active: boolean}` and the optional fdr/fleet fields, `typeof reasoning === 'string'` with length ≥ 20, `Array.isArray(suggested_actions)`. |
| AC-R71-3 | The committed `demos/scenarios/*.json` files and `demos/demo.html` at chore-A | invoking `buildAllCannedDemos()` once in-process | After the call, `fs.readFileSync` of each `demos/scenarios/<name>.json` and of `demos/demo.html` yields `Buffer.compare(post, pre) === 0` for every file (byte-identical to the pre-call read). |
| AC-R71-4 | The committed `demos/scenarios/clean-baseline.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.firing_shards` | The parsed value `deepEqual` to the empty array `[]`. |
| AC-R71-5 | The committed `demos/scenarios/sdc-drift.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.firing_shards` | The parsed value `deepEqual` to `["shard-04"]` exactly (length 1, only shard-04). |
| AC-R71-6 | The committed `demos/scenarios/common-mode-rack.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.common_mode_candidates` | The array has length ≥ 1; at least one element has `shared_node_id === 'rack-A'` AND `shared_node_kind === 'rack'` AND `member_count === 3` AND its `member_shard_ids` sorted lex asc equals `["shard-00", "shard-01", "shard-02"]`. |
| AC-R71-7 | The committed `demos/scenarios/event-conditional.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.freeze_active` | The parsed value `=== true`. |
| AC-R71-8 | The committed `demos/scenarios/fdr-multiple-testing.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.fdr_K`, `fdr_qLevel`, `fdr_selected_indices` | `Number.isInteger(fdr_K)` AND `fdr_K ≥ 1` AND `fdr_K ≤ 5` AND `fdr_qLevel === 0.10` AND `fdr_selected_indices.length === fdr_K`. |
| AC-R71-9 | The committed `demos/scenarios/hierarchical-evalue.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.fleet_fired`, `fleet_tick_at_first_fire` | `fleet_fired === true` AND `Number.isInteger(fleet_tick_at_first_fire)`. |
| AC-R71-10 | The committed `demos/scenarios/sparse-data-resilience.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.common_mode_candidates` | The parsed value `deepEqual` to the empty array `[]`. |
| AC-R71-11 | The committed `demos/scenarios/topology-spanning-common-mode.json` at chore-A | `JSON.parse`-ing it and reading `terminal_state.common_mode_candidates` | At least one element has `shared_node_kind === 'cooling_zone'` AND `member_count ≥ 4`. |
| AC-R71-12 | The committed `demos/demo.html` at chore-A | reading the file and matching against structural regexes | All of the following match the file content (each via `assert.match(html, RE)`): `/<select id="scenario-selector">/`, `/<button id="btn-play">/`, `/<button id="btn-pause">/`, `/<button id="btn-reset">/`, `/<select id="speed-selector">/`, `/<svg id="mt-chart"/`, `/<section id="audit-panel">/`, `/<section id="reasoning-panel">/`, `/<section id="next-actions-panel">/`, AND for each of the 8 scenario names there is a match for `new RegExp('<script type="application/json" id="tessera-scenario-' + name + '">')`. |
| AC-R71-13 | The committed `demos/demo.html` and 8 `demos/scenarios/<name>.json` at chore-A | extracting each `<script type="application/json" id="tessera-scenario-<name>">…</script>` block from the HTML and `JSON.parse`-ing both the inlined block and the on-disk JSON | For each scenario, `assert.deepEqual(inlined, onDisk)` succeeds. |
| AC-R71-14 | The committed `tools/demo-scenario.ts` at chore-A (R70 CLI, untouched) | dynamically importing `'../tools/demo-scenario.js'` and invoking `runScenario('clean-baseline')` | The export `runScenario` is a function, `SCENARIO_NAMES.length === 4`, and `runScenario('clean-baseline').exit_code === 0` AND `result.output` matches `/Tessera demo · clean-baseline/`. |

**§ 5 attestation-type preamble** (for AC-table § 5 preamble cross-check, R20 ARCH MINOR-1):

All 14 ACs above are **committed-runtime-test attestations** — each is verified by a `test()` invocation in `test/q71-demo-dashboard.test.ts` running under `node --test`. None of them are binding-command attestations. AC-R71-3 (idempotency) calls `buildAllCannedDemos()` as part of the test body but does NOT require running it from a separate binding command; the call IS the test. The binding-command attestations (typecheck exit 0; node --test fail count == 5 carry-forward; anti-scope diff ⊆ ALLOWED_SET; etc.) are implemented in `coordination/specs/Q-R71-EMPIRICAL.sh` and are NOT part of the AC table — they are the chore-A verification harness per Rule 1 sub-class `empirical-command-attestation`.

### 5.1 Branch-binding coverage table (Rule 2 ACTIVE GATE)

Every load-bearing branch / guard / short-circuit in the build tool has an AC that structurally exercises it. Removing the branch must cause an AC to fail.

| Branch / guard | Source location | Exercised by AC |
|---|---|---|
| Scenario name validation (8-name switch in `buildAllCannedDemos`) | tools/build-canned-demos.ts (scenario runner dispatch) | AC-R71-1 (SCENARIO_NAMES.length === 8) + AC-R71-2 (each name's JSON exists). |
| `clean-baseline`: H₀-only loop never crosses threshold | tools/build-canned-demos.ts: `runCleanBaselineRecording` | AC-R71-4 (firing_shards === []). |
| `sdc-drift`: drift inject branch (shard === 4 && w ≥ 6) | tools/build-canned-demos.ts: `runSdcDriftRecording` | AC-R71-5 (firing_shards exactly contains shard-04). |
| `common-mode-rack`: fired-events list submission | tools/build-canned-demos.ts: `runCommonModeRackRecording` | AC-R71-6 (rack-A candidate with member_count === 3). |
| `event-conditional`: emit('activate') BEFORE update() | tools/build-canned-demos.ts: `runEventConditionalRecording` | AC-R71-7 (freeze_active === true). |
| `fdr-multiple-testing`: eBenjaminiHochberg input validation (N>0, qLevel ∈ (0,1]) | engine/fleet/e-bh.ts:90 (consumed by build tool) | AC-R71-8 (fdr_K is integer ≥ 1 ≤ 5). |
| `hierarchical-evalue`: combineAverage on N=5 + updateFleetEProcessState sticky-fire latch | engine/fleet/combine.ts:87 + :122 (consumed by build tool) | AC-R71-9 (fleet_fired === true). |
| `sparse-data-resilience`: empty-adjacency BFS short-circuit (no candidate nodes reachable) | engine/topology/common-mode-attribution.ts:142-148 + 179 (consumed by build tool) | AC-R71-10 (common_mode_candidates === []). |
| `topology-spanning-common-mode`: opts.max_hop_distance = 2 override path | engine/topology/common-mode-attribution.ts:136 + 162 (consumed by build tool) | AC-R71-11 (cooling_zone candidate with member_count ≥ 4). |
| JSON serialization key-order + trailing newline + round6 (determinism) | tools/build-canned-demos.ts: `serializeScenarioJson` + `round6` | AC-R71-3 (idempotency — re-run is byte-identical). |
| HTML sentinel injection + per-scenario script tag | tools/build-canned-demos.ts: `renderDemoHtml` | AC-R71-12 (structural regex per-scenario tag match) + AC-R71-13 (round-trip equality). |
| R70 CLI preservation (anti-regression) | tools/demo-scenario.ts (READ-ONLY) | AC-R71-14 (runScenario still works). |

**Acknowledged non-load-bearing gaps:**

- `parseCliArg` equivalent in build-canned-demos.ts (the CLI guard accepts zero args; rebuilds all 8 scenarios unconditionally) — no AC because there are no command-line branches to exercise.
- The dashboard HTML's embedded JS code paths (Play/Pause/Reset/Speed click handlers; SVG redraw loop; selector change handler) are NOT exercised by any AC because they require a browser DOM. Halt #8 forbids bundling, which would be needed to test them headlessly via jsdom/puppeteer. **Acknowledged gap; documented per Rule 2 sub-class.** Reviewer manual verification (open demos/demo.html in a browser; click through scenarios) is the operator-visible check; not bound by AC.

### 5.2 Implicit baseline expectations (Implementer attests verbatim; Reviewer re-runs)

The Implementer's NEXT-ROLE.md attestation MUST encode the ACTUAL observed values verbatim from running these binding commands at chore-A HEAD (per Rule 1 sub-class `empirical-command-attestation`; do NOT cite spec-predicted values as observed):

- `pnpm exec tsc -p tsconfig.test.json` — predicted exit 0, zero diagnostics.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` — predicted `tests=469 / pass=461 / fail=5 / skipped=3` (baseline 455/447/5/3 at session entry + 14 new q71 ACs). **The 14 new q71 tests are predicted to all PASS at chore-A; the 5 carry-forward fails are predicted to remain the same identity set (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14).**
- `bash coordination/specs/Q-R71-EMPIRICAL.sh` — predicted 10 PASS / 0 FAIL / exit 0.

If observed values differ from predicted, the Implementer attests the ACTUAL values verbatim and (a) if the divergence is small natural variation in a non-load-bearing direction (e.g., `tests=470` instead of `469` because of a sub-test count adjustment), proceed; (b) if the divergence is structural (e.g., a 6th fail appears, or one of the q71 ACs fails), HALT + DIAGNOSTIC per § 6.

### 5.3 Discriminating-assertion gate (Rule 3 ACTIVE GATE)

Every AC's Then-clause names an exact observable that distinguishes correct implementation from a defective one. Audit:

| AC | What would PASS if the implementation were buggy? |
|---|---|
| AC-R71-1 | Buggy: `SCENARIO_NAMES = ['clean-baseline']` (count 1, not 8). → FAILS `SCENARIO_NAMES.length === 8`. |
| AC-R71-2 | Buggy: `schema_version` missing or wrong literal. → FAILS the `assert.equal(j.schema_version, 'tessera-demo-v1')` check. |
| AC-R71-3 | Buggy: serializer uses `Math.random()` for a tiebreak. → FAILS `Buffer.compare(post, pre) === 0`. |
| AC-R71-4 | Buggy: scenario falsely marks shard fired (e.g., wrong threshold comparison). → FAILS `firing_shards === []`. |
| AC-R71-5 | Buggy: drift inject path misses shard-04, or all shards fire (drift applied to all). → FAILS `firing_shards === ['shard-04']` (either wrong identity OR wrong count). |
| AC-R71-6 | Buggy: candidate uses wrong shared_node_id (e.g., rack-B), wrong member_count (e.g., 2 because one fired-event silently dropped), wrong member_shard_ids set. → FAILS each sub-assertion. |
| AC-R71-7 | Buggy: factory never subscribed, freeze_active stays false. → FAILS `=== true`. |
| AC-R71-8 | Buggy: fdr_K = 0 (no shards drifted) OR fdr_K = 10 (all shards selected — drift applied incorrectly). → FAILS the `1 ≤ fdr_K ≤ 5` range. Buggy: fdr_qLevel passed as 0.05 instead of 0.10. → FAILS `=== 0.10`. |
| AC-R71-9 | Buggy: fleet wealth doesn't accumulate (single shard drift only, or threshold too high). → FAILS `fleet_fired === true`. |
| AC-R71-10 | Buggy: empty-adjacency path throws or surfaces spurious singleton candidates. → FAILS `=== []` (either throws OR length > 0). |
| AC-R71-11 | Buggy: max_hop_distance not overridden, cooling_zone unreachable, OR cooling_zone not in candidate_node_kinds → no cooling_zone candidate surfaces. → FAILS finding any `shared_node_kind === 'cooling_zone'`. |
| AC-R71-12 | Buggy: dashboard renders only some panels (e.g., missing audit-panel). → FAILS the specific panel regex. Buggy: only 4 scenario blocks emitted (R70 surface mistakenly used). → FAILS the per-name script-tag check for the 4 missing names. |
| AC-R71-13 | Buggy: inlined JSON drifted from on-disk JSON (e.g., HTML escaping changed quotes; whitespace differs by one char). → FAILS `assert.deepEqual` (deep-equal parses both, so cosmetic whitespace differences ARE tolerated; semantic drift is caught). |
| AC-R71-14 | Buggy: tools/demo-scenario.ts was modified (anti-scope #3 violation), runScenario('clean-baseline') returns wrong output or non-zero exit. → FAILS the regex match OR the exit_code check. |

All 14 ACs satisfy the discriminating-assertion gate. None binds incidentally (e.g., none binds to a value that any unrelated change could produce).

---

## § 6. Anti-scope

**A1–A13** as enumerated in § 3.3 above.

### 6.1 Halt conditions for the Implementer

If any of the following fires, write `coordination/diagnostics/DIAGNOSTIC-R71-<topic>.md` with ≥ 3 bounded options + set `STATUS: ESCALATE` in `coordination/NEXT-ROLE.md` + await operator disposition. Do NOT proceed with a silent workaround.

1. `coordination/specs/Q-R71-EMPIRICAL.sh` exits non-zero at chore-A for any reason other than a pre-documented carry-forward identity check that the empirical script does not gate on. (R71 is single-state; no chore-B; no two-state SHA injection mismatch carve-out is needed.)
2. `pnpm exec tsc -p tsconfig.test.json` returns non-zero exit. (Baseline at session entry: exit 0.)
3. Test baseline drift beyond R70 close (`tests=455 / pass=447 / fail=5 / skipped=3`) other than R71-additions. Specifically: if any pre-R71 test (q01..q70) other than the 5 carry-forward fails (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14) transitions from PASS to FAIL: HALT + DIAGNOSTIC.
4. Architectural decision requires DS-repo modification: HALT + DIAGNOSTIC.
5. Architectural decision requires new external dependencies (any kind: npm, pnpm, system tool, browser polyfill): HALT + DIAGNOSTIC.
6. Architectural decision requires modification of `engine/*` file: HALT + DIAGNOSTIC.
7. R61-class architectural-reality discovery: a spec premise about an engine surface signature, type, or behavior is empirically false at Implementer time: HALT + DIAGNOSTIC + ESCALATE.
8. Scenario output rendering requires browser-bundling complexity (build step / module bundler beyond `tsc -p tsconfig.test.json`): HALT.
9. The injected drift magnitude in scenarios 5 or 6 (FDR / hierarchical-evalue) under the prescribed seed does NOT produce the expected terminal state (e.g., fdr_K = 0 stuck; or fleet wealth doesn't cross threshold within 30 windows). If TACTICAL AUTONOMY tuning within ±0.10 of the prescribed value still fails to achieve the predicate: HALT + DIAGNOSTIC.
10. Any q71 AC predicate (AC-R71-1..14) fails at chore-A under a passing tsc + passing carry-forward + clean-baseline build tool run: HALT + DIAGNOSTIC (likely indicates spec § 5.2 baseline prediction drift).

**Critical halt-condition carve-out** (per R56 MINOR-1 reinforcement): None of the above halt conditions overlap with a pre-documented expected outcome. R71 is a single-state spec (no chore-A vs chore-B distinction); no halt-condition trigger corresponds to a state the spec predicts as expected. There is no need for an "OTHER THAN the pre-documented X" carve-out in § 6.1's text.

### 6.2 TACTICAL AUTONOMY scope

Implementer MAY:

- Adjust the drift magnitudes within ±0.10 of the prescribed values for scenarios 2, 5, 6 IF and only if the prescribed value does not produce the predicted terminal state under the prescribed seed (per § 2.5 above). Document any change in the GREEN commit message + inline comment.
- Adjust HTML/CSS/JS cosmetic details: pixel sizes, padding, color palette, line widths, font sizes. The structural elements named in AC-R71-12 must be present; everything else is cosmetic.
- Adjust JSDoc comment wording in `tools/build-canned-demos.ts`. Spec prescribes function names + signatures + behavior; comments are tactical.
- Adjust the LCG seed *literals* if and only if the prescribed seed produces wealth values that fail the relevant AC predicate. The Architect's choice of `0x71...` is arbitrary; tuning is permitted with documentation.
- Choose `.js` vs no-extension import (per tools/demo-scenario.ts:12-30 R70 IMPL deviation). Default: `.js` extensions match R70 + tools/curate-baseline-pipeline.ts convention.
- Adjust `events[]` content within each captured window. The schema requires `Array.isArray(events)`; the contents are scenario-specific and Implementer-prescribed. Suggested contents are listed in scenario sub-sections; verbatim adherence is not required.

Implementer MAY NOT (without HALT + DIAGNOSTIC):

- Modify any `engine/**/*.ts` file (anti-scope A2 immediate trigger).
- Modify `tools/demo-scenario.ts` (anti-scope A3 immediate trigger; preserves R70 CLI as sibling).
- Modify any pre-R71 test file (anti-scope A4).
- Modify any prior-round spec file (anti-scope A5).
- Expand the ALLOWED_SET in-spec at chore-A (R36 MAJOR-2 NEVER violation).
- Introduce a chore-B step, a forward-protection AC, a live-file-count AC, or an anti-scope-diff-against-prior-round AC (R62+R66+R68 cumulative lesson; halt #6).
- Add an external dependency.
- Open a DS-repo PR or modify any DS-repo file.
- Skip the RED commit (R23 IMPL MINOR-1 TDD separate-RED-commit discipline).
- Cite spec-predicted values as observed in attestation (Rule 1 sub-class `empirical-command-attestation` violation).
- Use `fetch`, `import`, `eval`, `Function()`, or external loader APIs in `demos/demo.html`'s embedded JS (anti-scope A12).

---

## § 7. Cross-project rule dispositions

| Rule | Disposition |
|---|---|
| 1 (`empirical-command-attestation`) | ACTIVE GATE — Q-R71-EMPIRICAL.sh + § 5.2 verbatim-actual-attestation discipline. |
| 2 (`architect-branch-binding-coverage`) | ACTIVE GATE — § 5.1 table; 2 acknowledged non-load-bearing gaps (CLI no-arg path; embedded JS DOM handlers). |
| 3 (`implementer-spec-test-assertion-coverage`) | ACTIVE GATE — discriminating assertions per § 5.3. |
| 4 (`anti-scope-allowed-set-forward-coverage`) | ACTIVE GATE — § 3.2 ALLOWED_SET + § 6 anti-scope hard limits + 1 regex carve-out for DIAGNOSTIC; historical-only `git diff round-start..HEAD` per R62+R66+R68 lesson. |
| 5 (`rule-derivation-without-self-application`) | N/A at spec emit. The 3rd-instance `ac-pattern-round-evolution-fragility` candidate (R62+R66+R68) is referenced but R71 is structurally designed to AVOID the pattern (no chore-B, no forward-protection, no live-count); no new derivation. |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | ACTIVE GATE — § 6.1 enumerates 10 halt conditions; no carve-out beyond the single-state design (R56 MINOR-1 reinforcement applied — no overlap between halt triggers and predicted outcomes). |
| 7 (`derived-rule-propagation-mechanism-required`) | ACTIVE GATE Surface (a) — this § 7 table. Surface (b) N/A (no new derivations). Surface (c) N/A. |

---

## § 8. Open questions

**None — all resolved.** The directive's operator confirmations (mirror DS pattern; vanilla HTML/CSS/JS; 2-round split with R72 coverage validation deferred) closed all open questions at spec authoring time.

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | Every engine surface invoked at the documented signature (§ 1.3 claim-then-walk verified at session entry); every JSON shape predicate testable; every dashboard structural element regex-matchable. |
| Completeness | All 8 directive-prescribed scenarios specified; build tool covers JSON emission + HTML emission; § 4.5 README content prescribed verbatim; § 4.4 package.json modifications prescribed verbatim. |
| Consistency | Spec § 5 AC predicates ≡ § 4.3 test bodies ≡ § 5.1 branch-binding rows ≡ § 5.3 discriminating-assertion rows. Cross-section cross-check ran post-emit per R01 reinforcement. |
| Clarity | Pseudocode uses real engine types; § 1.3 cites engine file:line for every signature; § 4.2 prose is copyable verbatim. |
| Coverage | § 5 covers each scenario's terminal-state predicate + dashboard structural shape + R70 anti-regression. § 5.1 maps every load-bearing branch in the build tool to an AC. § 5.3 confirms every AC discriminates. |
| Constraints | Anti-scope A1–A13 enumerated (§ 3.3 + § 6); ALLOWED_SET (§ 3.2) bounds the diff; halt conditions (§ 6.1) bound the failure-mode surface; § 6.2 TACTICAL AUTONOMY scope bounds the latitude. |
| Concurrency | None — build tool is sequential; no shared state across scenarios; LCG state is per-scenario. Browser dashboard's setInterval is single-threaded. |
| Corner cases | Empty-adjacency BFS (sparse-data-resilience scenario); FDR with K=0 (halt #9 carve-out); fleet wealth never crossing threshold (halt #9); each addressed. AC-R71-2 covers M_t=null for non-Family-A scenarios; AC-R71-12 covers per-scenario script-tag presence; AC-R71-13 covers inlined-vs-on-disk drift. **§ 9 commitment audit (per R65 MINOR-3 reinforcement):** every behavioral commitment in this § 9 is bound by at least one AC in § 5 — sparse-data BFS → AC-R71-10; FDR K=0 fallback → halt #9; fleet-never-fires → halt #9; M_t=null for non-Family-A scenarios → AC-R71-2 structural permissivity (`M_t === null || typeof M_t === 'number'`); per-scenario script-tag presence → AC-R71-12; inlined-vs-on-disk drift → AC-R71-13. |
| Cost | Build tool: ~700-900 lines TS; runtime < 30 s. Tests: 14 ACs × ~25 lines = ~350 lines. Dashboard HTML: ~1500-2500 lines incl. inlined data. Total round commitment: ~2500-3800 LOC + scaffolding. |
| Coupling | Build tool consumes 11 named engine exports (§ 1.3); each is a stable public surface across R59+ Phase-3 close. Dashboard consumes the JSON blocks at runtime via DOM APIs only. R70 CLI is untouched; AC-R71-14 binds the anti-regression. |

### 9.1 Empirical premise verification (R08 MAJOR-2 derivative; R25 MINOR-1; R28 OBS-1)

Architect ran the following commands at session entry (SHA `54af89f`) and observed:

- `git rev-parse HEAD` → `54af89f1221799b25fad0d081df636e4ca71d7c5` — matches round-start SHA in directive. **Verified.**
- `git status` → "(clean)" — no uncommitted modifications. **Verified.**
- `pnpm exec tsc -p tsconfig.test.json` (implicit; precedes test run) → exit 0 — verified upstream by test pretest hook.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 455 / # pass 447 / # fail 5 / # skipped 3`. **Verified verbatim** (R25 MINOR-1: NOT inherited from R70 attestation; run fresh by Architect at session entry).
- 5-fail identity: grep'd for `not ok` lines; confirmed identity set = `AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14`. **Verified.**
- `git ls-files demos/scenarios/ tools/build-canned-demos.ts 2>/dev/null` → empty output. **Verified files do NOT yet exist.** (R23 ARCH MINOR-2: .gitignore-aware spec inventory — `.js` compiled outputs are gitignored; only `.ts` sources + JSON / HTML / SH / MD artifacts appear in diff.)

### 9.2 Spec-internal contradiction sweep (R65 MINOR-2 + R34 MINOR-2 reinforcement)

Audit run post-emit for every named type / value / engine signature / boundary literal mentioned in this spec:

- `freshBettingState` return shape: cited at engine/detectors/betting-e-process.ts:72 in § 1.3; pseudocode at § 4.1 uses `freshBettingState()` returning the same shape; AC-R71-1 binds `SCENARIO_NAMES.length === 8`; no contradiction.
- `attributeCommonMode` opts.max_hop_distance default = 1: cited at engine/topology/common-mode-attribution.ts:115 (`DEFAULT_MAX_HOP_DISTANCE = 1`) in § 1.3 and § 1.3-failure-mode-4; scenario 8 overrides to 2 explicitly; § 4.1 pseudocode + § 4.2 prose + AC-R71-11 + § 5.1 branch-binding all reflect the override. No contradiction.
- `DEFAULT_MIN_MEMBER_COUNT = 2` (engine/topology/common-mode-attribution.ts:116): § 1.3 cites verbatim; § 1.3-failure-mode-4 explains; § 2.1 scenario-7 design relies on this default for the singleton-not-surfaced property; sparse-data scenario has 3 fired events but 0 candidate-node reachability — distinct mechanism from the singleton-exclusion; reasoning prose differentiates. No contradiction.
- `DEMO_THRESHOLD = 1/DEMO_ALPHA = 200`: scenarios 1, 2 use `DEMO_ALPHA = 5e-3` (mirrors R70 prescription). All Family-A AC predicates compare against this threshold. § 4.1 pseudocode + § 5 AC predicates consistent. No contradiction.
- `qLevel = 0.10` for fdr-multiple-testing: § 2.1 + § 4.1 pseudocode + AC-R71-8 + § 5.3 all cite 0.10 verbatim. No contradiction.
- `log_threshold = log(1 / 0.05) = log(20) ≈ 2.9957` for hierarchical-evalue: § 2.1 cites `α_fleet=0.05` and `log_threshold = log(20)`; § 4.1 pseudocode reflects; AC-R71-9 binds `fleet_fired === true` which depends on this threshold being crossed. No contradiction.
- Predicted `tests=469` total: 455 baseline + 14 q71 ACs. § 5.2 cites this prediction; § 5.3 names 14 ACs; § 4.3 enumerates 14 `test()` invocations. No internal contradiction. (Architect explicit note for R03 MINOR-4 lesson: this is a *predicted* count derived from arithmetic; Implementer will run the actual command and attest the OBSERVED count verbatim per Rule 1 sub-class. Architect does NOT mandate `=== 469` as an AC — AC-R71-2 et al. bind structural shape, not test count.)

No spec-internal contradictions detected.

### 9.3 Round-evolution-fragility avoidance (R62 + R66 + R68 cumulative lesson — 4th-instance avoidance)

R71's spec is structurally designed to avoid the `ac-pattern-round-evolution-fragility` candidate rule:

- **NO chore-B step.** Spec is single-state. Chore-A = the single GREEN commit; no SHA-injection two-state pattern.
- **NO forward-protection AC.** No AC asserts that a future SHA's diff is empty / non-empty. AC-R71-3 (idempotency) operates on the *current* HEAD state.
- **NO live-file-count AC.** Tests bind to NAMED file existence and structural field presence. No AC binds to `fs.readdirSync(...).length` or `git ls-files ... | wc -l`.
- **NO anti-scope-diff-against-prior-round-allowed-set AC.** AC-R71-14 (anti-regression) verifies R70 CLI surface STILL WORKS — it does NOT bind R70's ALLOWED_SET against R71 state.
- **Carry-forward fail set bound BY IDENTITY** (AC IDs: AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14), not by raw count alone. § 5.2 and Q-R71-EMPIRICAL.sh both check identity AND count.
- **Historical-only diff** for anti-scope (`git diff round-start..HEAD --name-only`). No future-bound or prior-round-bound diff.

Per the R68 close attestation, R71 is the 4th-instance round-evolution-fragility avoidance event. The pattern is now repeated discipline; not new derivation.

---

## § 10. Grilling output (Superpowers Review phase; pre-emit adversarial self-review)

### 10.1 Every claim verifiable? [yes]

- Engine signatures cited verbatim from session-entry file reads (§ 1.3).
- AC predicates testable by simple `assert` calls in `test/q71-demo-dashboard.test.ts` (§ 4.3 + § 5).
- ALLOWED_SET enumerated as 18 specific paths + 1 regex carve-out (§ 3.2); Reviewer can independently run `git diff $ROUND_START_SHA..HEAD --name-only` and compare.
- Idempotency claim (AC-R71-3) tested by in-process re-run + byte compare.
- R70 anti-regression claim (AC-R71-14) tested by dynamic import + runScenario call.
- Carry-forward identity set verified at session entry by grep against TAP output (§ 9.1).

### 10.2 Unstated assumptions? [list below]

1. **Architecture: Node v20+ with `node:fs` / `node:path` / `node:test` module names.** package.json `engines.node` is `">=20"`; matches assumption. Verified.
2. **Browser environment: modern evergreen browser with `document.createElementNS` for SVG support.** No older-browser fallback. Assumption appropriate for a demo dashboard; not part of any AC.
3. **The Implementer will inject `$ROUND_START_SHA` into Q-R71-EMPIRICAL.sh BEFORE committing chore-A** via the same sed mechanism as R70 (§ 11.2 below). Spec depends on this convention.
4. **`tsc -p tsconfig.test.json` emits `tools/build-canned-demos.js` to the same path as `tools/build-canned-demos.ts` (next to it).** Matches existing convention for `tools/demo-scenario.ts → tools/demo-scenario.js`. Verified by inspection of `tools/demo-scenario.js` existing as an untracked file after R70 chore-A.
5. **The `tools/build-canned-demos.ts` emits to `demos/scenarios/*.json` and `demos/demo.html` via `fs.writeFileSync` synchronously, with `mkdirSync({recursive: true})` for the scenarios dir.** No async / streaming I/O. Acceptable for an ≤30 s build.

### 10.3 Scope added beyond request? [no]

- The directive's "6-8 scenarios" is satisfied at the upper bound (8 — covering all PRD US-01..US-04 surfaces).
- The directive's listed scenarios are all included; no scenarios added beyond the operator-suggested set.
- Dashboard panels: scenario selector + Play/Pause/Reset/Speed + SVG chart + verdict badges + audit-trail panel + reasoning panel + suggested-actions panel. Each named in the directive (§ 16-31 of NEXT-ROLE.md R71 directive section).
- No additional package.json scripts beyond `build:demos` + `prebuild:demos`.
- No additional engine surfaces beyond those already used by R70 + the 4 new ones for the new scenarios (`eBenjaminiHochberg`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState`).

### 10.4 Implementer can act without guessing? [yes]

- Every scenario's engine surface, synthetic input form, terminal predicate, and seed literal are prescribed.
- Every AC has a corresponding test pseudocode in § 4.3 (Implementer can copy as starting point, refine for cosmetic issues).
- Every ALLOWED_SET path is enumerated; no judgment call on "is this file in scope."
- TACTICAL AUTONOMY scope (§ 6.2) explicitly names what the Implementer may tune (drift magnitudes within ±0.10; HTML/CSS cosmetics; JSDoc wording) and what they may NOT (engine; R70 CLI; prior-round specs; ALLOWED_SET expansion).
- 10 halt conditions enumerated (§ 6.1); each is a binary-decidable predicate.
- Pre-authored prose for the 8 scenarios' `reasoning` + `suggested_actions` provided verbatim (§ 4.2).

### 10.5 Reinforcement sweep (R01 + R02 + R03 + R06 + R10 + R11 + R13 + R15 + R20 + R21 + R23 + R25 + R30 + R34 + R56 + R58 + R65 + R66 + R70)

| Reinforcement | Application |
|---|---|
| R01 (cross-section consistency) | § 9.2 sweep ran post-emit; no contradictions. |
| R02 (type-declaration-site check) | § 1.3 cites every engine type at declaration file:line; verified at session entry. |
| R03 (re-export chain) | All imports in § 4.1 pseudocode are direct (e.g., `from '../engine/fleet/e-bh.js'`); no transitive re-export claims. |
| R06 (docblock coverage) | File-level docblock for `tools/build-canned-demos.ts` prescribed in § 4.1; Implementer may extend with JSDoc per function. |
| R10 (file-level docblock when modifying) | Not applicable (no modification to existing engine/test files). |
| R11 (line-citation-cite-then-verify) | § 1.3 line citations grep-verified at session entry. |
| R13 (statistical-term-to-formula) | e-BH formula cited in § 4.2 prose for fdr-multiple-testing aligns with engine/fleet/e-bh.ts:90 implementation (Ren-Barber 2024 / Wang-Ramdas 2022). No name-formula drift. |
| R15 (anti-scope diff baseline; spec-prescribed file must appear in ALLOWED_SET) | § 3.2 ALLOWED_SET includes all 18 spec-prescribed paths; DIAGNOSTIC-R71-*.md regex carve-out included for halt-condition outputs. |
| R20 (AC-table preamble cross-check) | § 5's "All 14 ACs are committed-runtime-test attestations" preamble matches § 4.3 (all 14 are `test()` invocations) AND § 5 individual rows (none cite a binding-command output). |
| R21 (spec-commit-before-routing) | Architect commits spec triad BEFORE NEXT-ROLE.md routing block per R21 ARCH MINOR-1; documented as the chore-A SHA capture mechanism in § 11. |
| R23 (gitignore-aware inventory) | § 3.1 + § 3.2 inventory only `.ts` source + JSON/HTML/SH/MD artifacts; `.js` compiled outputs are gitignored and not listed. |
| R25 (cluster-worktree baseline run fresh) | § 9.1 ran `node --test` fresh at session entry; did NOT inherit R70 attestation; verified `455/447/5/3` independently. |
| R30 (discriminability check on grep patterns) | § 5 AC predicates do not rely on grep patterns that match in comments; pattern asserts test against parsed JSON via JSON.parse, not regex over file body. AC-R71-12 uses regex against HTML but the patterns (e.g., `<select id="scenario-selector">`) include unique attribute identifiers that don't occur in JS comments or strings inside the dashboard. |
| R34 (boundary clause cross-check) | "Window count = 30" for scenarios 1, 2, 5, 6 and "Window count = 5" for scenarios 3, 7, 8 and "Window count = 5" for scenario 4 — explicit window-count literals per scenario; consistent across § 2.1, § 4.1 pseudocode, § 9. |
| R56 (halt-trigger carve-out) | § 6.1 last paragraph documents that no halt-trigger overlaps with a pre-documented expected outcome (R71 is single-state). |
| R58 (constructor opts symbol drift) | `attributeCommonMode` opts shape (`max_hop_distance`, `min_member_count`, `candidate_node_kinds`, `now`) cited per engine/topology/common-mode-attribution.ts:85-96 at session-entry read. `DsEventConsumer` opts (`port`, `host?`, `request_timeout_ms?`) cited per engine/ds-integration/event-consumer.ts:169 at session-entry read. `createFreezeHookFromDsEvents` opts (consumer, config, activation_window_seconds, setTimeout, clearTimeout, now) cited per engine/ds-integration/freeze-hook-factory.ts:87 at session-entry read. All matched the existing R70 usage in tools/demo-scenario.ts:262-278. No camelCase/snake_case drift. |
| R65 (P3 commitments bound by AC) | § 9 (corner cases) commitment audit added explicitly — every commitment binds to an AC or a halt condition. |
| R66 (semantic-overclaim field naming) | `terminal_state.fdr_K`, `fdr_selected_indices`, `fleet_fired`, `fleet_tick_at_first_fire`, `freeze_active` — all field names match what the build tool can directly observe from engine outputs. No semantic overclaim. (E.g., `freeze_active` reflects `activator.getState().active`, which the engine literally returns.) |
| R70 (spec narrative vs executable script alignment) | § 11.2 below specifies the EMPIRICAL.sh sed-injection command verbatim; § 11.3 narrative for each EMPIRICAL.sh block matches what the script will actually do. Re-checked § 11 against § 5 AC predicates: AC literal text named in each EMPIRICAL.sh block matches what the block computes (e.g., "no engine modifications" block runs `git diff ROUND_START..HEAD --name-only -- engine/` and asserts empty — matches § 6.1 + § 3.3 wording). |

### 10.6 Architect pre-prediction (per R20 / R25 + tightenings 1-4)

Architect predicts the following at chore-A HEAD:

- `pnpm exec tsc -p tsconfig.test.json` → exit 0; zero diagnostics.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 469 / # pass 461 / # fail 5 / # skipped 3` (455 baseline + 14 new q71 ACs all passing; 5 carry-forward fails identity-preserved).
- `bash coordination/specs/Q-R71-EMPIRICAL.sh` → 10 PASS / 0 FAIL / exit 0.
- `git diff $ROUND_START_SHA..HEAD --name-only` → 18 paths (the ALLOWED_SET enumerated in § 3.2; no diagnostic file expected since no halt condition is predicted to fire).
- `git diff $ROUND_START_SHA..HEAD --name-only -- engine/` → empty (no engine modifications).

Implementer will run these commands at chore-A and attest the ACTUAL observed values verbatim per Rule 1 sub-class `empirical-command-attestation`. If actuals diverge from predictions, the Implementer encodes the divergence and (per § 6.1) proceeds only if the divergence is non-load-bearing.

---

## § 11. Implementer chore-A sequence

1. **RED commit (separate from GREEN per R23 IMPL MINOR-1):**
   - Land `test/q71-demo-dashboard.test.ts` with 14 `assert.fail('R71 RED — implementation pending')` stubs at AC-R71-1..14 positions.
   - `tools/build-canned-demos.ts`, `demos/scenarios/*.json`, `demos/demo.html` do NOT yet exist; the test's first import (`from '../tools/build-canned-demos.js'`) causes `tsc` to emit `TS2307` module-resolution failure (mirrors R70 RED pattern).
   - Commit message format: `red(R71): q71 demo dashboard stub fails — TS2307 + 14 RED assertion stubs`

2. **GREEN commit (chore-A):**
   - Land `tools/build-canned-demos.ts` per § 4.1 pseudocode.
   - Land `demos/scenarios/<name>.json` for all 8 scenarios (run the build tool once locally to generate; commit the output).
   - Land `demos/demo.html` (also output of the same build run).
   - Modify `package.json` per § 4.4.
   - Modify `README.md` per § 4.5.
   - Replace all 14 RED stubs in `test/q71-demo-dashboard.test.ts` with real assertions per § 4.3.
   - **BEFORE committing chore-A:** inject `$ROUND_START_SHA` into `Q-R71-EMPIRICAL.sh` via:
     ```bash
     sed -i.bak "s|<INJECTED-AT-CHORE-A>|$(git rev-parse HEAD)|g" coordination/specs/Q-R71-EMPIRICAL.sh
     rm coordination/specs/Q-R71-EMPIRICAL.sh.bak
     ```
     (Captures the parent SHA = the Architect's spec-triad commit SHA as the diff lower bound. Mirrors R70 § 11.2.)
   - Commit message format: `feat(R71): Tessera demo dashboard — pnpm build:demos + 8 canned scenarios + static dashboard`

3. **Verify chore-A:**
   - `pnpm exec tsc -p tsconfig.test.json` → exit 0; zero diagnostics.
   - `pnpm exec node --test --test-reporter=tap test/*.test.js` → record VERBATIM the actual `# tests / # pass / # fail / # skipped` lines (do NOT cite the Architect's prediction as observed).
   - `bash coordination/specs/Q-R71-EMPIRICAL.sh` → 10 PASS / 0 FAIL / exit 0.

4. **Attestation in NEXT-ROLE.md (Implementer adds § Implementer R71 routing block):** encode ACTUAL chore-A summary verbatim per Rule 1 sub-class `empirical-command-attestation`. Do NOT reframe to match prediction. Acknowledge any divergence.

5. **NO chore-B step.** R71 is single-state.

### 11.1 Q-R71-EMPIRICAL.sh structure (Architect emits as part of spec triad; Implementer injects SHA)

`coordination/specs/Q-R71-EMPIRICAL.sh` — 10 verification blocks:

- **Block 1:** `pnpm exec tsc -p tsconfig.test.json` exits 0.
- **Block 2:** `pnpm exec node --test --test-reporter=tap test/*.test.js` produces `# fail 5` AND each of the 5 carry-forward AC IDs (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14) appears as a `not ok` line (grep unanchored; per R70 MINOR-2 reinforcement — matches both top-level and indented subtest lines).
- **Block 3:** `git diff $ROUND_START_SHA..HEAD --name-only` ⊆ ALLOWED_SET (the 18 paths + regex carve-out for DIAGNOSTIC-R71-*.md).
- **Block 4:** `git diff $ROUND_START_SHA..HEAD --name-only -- engine/` is empty.
- **Block 5:** `git diff $ROUND_START_SHA..HEAD --name-only -- "coordination/specs/" | grep -vE "Q-R71-"` is empty (no prior-round spec mods).
- **Block 6:** `tools/build-canned-demos.ts` exists AND has expected exports (grep for `^export function buildAllCannedDemos`, `^export const SCENARIO_NAMES`).
- **Block 7:** `package.json` has `"build:demos"` script entry (grep for `"build:demos":\s*"node tools/build-canned-demos.js"`).
- **Block 8:** All 8 scenario JSON files exist at `demos/scenarios/<name>.json` AND parse as valid JSON (per scenario: `node -e "JSON.parse(require('fs').readFileSync('demos/scenarios/<name>.json','utf8'))"` exits 0).
- **Block 9:** `demos/demo.html` exists AND contains all 9 structural markers AND all 8 inlined scenario script tags (single grep block checking each pattern).
- **Block 10:** Idempotency — run `pnpm exec node tools/build-canned-demos.js`, then `git diff --name-only demos/` produces empty output (re-run did not change committed artifacts).

Each block prints `PASS  Block: <label>` or `FAIL  Block: <label>` and increments counters. Exit code 0 iff all blocks PASS. Per-block grep patterns are anchored to discriminate against comment / narrative occurrences (R44 MINOR-3 + R46 MINOR-1 reinforcement). Bash conventions match R70's Q-R70-EMPIRICAL.sh (`set -u`; counter tally; environment override for `ROUND_START_SHA`).

### 11.2 Spec-narrative-vs-EMPIRICAL.sh alignment (R70 MINOR-2 reinforcement)

The text descriptions of each block in § 11.1 above MUST match what the executable Q-R71-EMPIRICAL.sh script does at the byte level. Architect re-reads § 11.1 against the script body before committing the spec triad; any divergence is corrected at spec-emit time (not deferred to Reviewer detection). The R70 MINOR-2 finding (spec § 11.2 used `grep "^not ok"` anchored while executable used `grep "not ok"` unanchored) is explicitly avoided here — Block 2 narrative + executable both use unanchored grep.

---

## § 12. Routing

After this spec triad commits, Architect updates `coordination/NEXT-ROLE.md`:

```
NEXT-ROLE: IMPLEMENTER
STATUS: READY
TIER: full
Inputs:
  coordination/specs/Q-R71-SPEC.md (prescriptive)
  coordination/specs/Q-R71-SPEC-AUDIT.md (Architect ceremony sidecar; Reviewer-authorized)
  coordination/specs/Q-R71-EMPIRICAL.sh (chore-A verification; Implementer injects $ROUND_START_SHA)
```

Architect commits this routing block in a separate commit AFTER the spec triad commit (per R21 ARCH MINOR-1 spec-commit-sequencing discipline).

---

_End of Q-R71-SPEC.md._
