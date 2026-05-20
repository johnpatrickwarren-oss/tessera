# Reviewer Report — R71

**Round:** R71 (full-tier — Tessera demo dashboard)
**Reviewer:** Opus 4.7
**Spec:** `coordination/specs/Q-R71-SPEC.md`
**Chore-A commit:** `cfa7d0f` (feat(R71): Tessera demo dashboard — pnpm build:demos + 8 canned scenarios + static dashboard)
**Round-start SHA:** `54af89f`

---

## § 1. Per-AC verification table

Every AC was verified by running the actual binding command at chore-A HEAD and inspecting the actual artifact contents.

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R71-1 | `buildAllCannedDemos` + `SCENARIO_NAMES` (length 8) exported | PASS | `test/q71-demo-dashboard.test.ts:20-24`; `tools/build-canned-demos.ts:38-47` (8-entry literal array); `node --test` ok 1 |
| AC-R71-2 | Each scenario JSON has required structural fields | PASS | `test/q71-demo-dashboard.test.ts:27-57`; verified per scenario via `JSON.parse` + key presence; `node --test` ok 2 |
| AC-R71-3 | Idempotency — byte-identical re-run | PASS | `test/q71-demo-dashboard.test.ts:60-71`; verified by Buffer compare pre/post call; `node --test` ok 3; also `bash Q-R71-EMPIRICAL.sh` Block 10 PASS |
| AC-R71-4 | clean-baseline `firing_shards === []` | PASS | `demos/scenarios/clean-baseline.json` `terminal_state.firing_shards: []`; max terminal M_t = 2.336688 (shard-00) ≪ 200; `node --test` ok 4 |
| AC-R71-5 | sdc-drift `firing_shards === ["shard-04"]` | PASS | `demos/scenarios/sdc-drift.json` `terminal_state.firing_shards: ["shard-04"]`; crossing event at w=22 with M_t=18900.41; `node --test` ok 5 |
| AC-R71-6 | common-mode-rack rack-A candidate, member_count=3 | PASS | `demos/scenarios/common-mode-rack.json` `terminal_state.common_mode_candidates[0]` = `{shared_node_id:'rack-A', shared_node_kind:'rack', member_count:3, member_shard_ids:['shard-00','shard-01','shard-02']}`; `node --test` ok 6 |
| AC-R71-7 | event-conditional `freeze_active === true` | PASS | `demos/scenarios/event-conditional.json` `terminal_state.freeze_active: true`; window-2 ds_event_received → window-3 residual_update with `absorbed:false`; `node --test` ok 7 |
| AC-R71-8 | fdr-multiple-testing `fdr_K` integer in [1,5], qLevel=0.10 | PASS | `demos/scenarios/fdr-multiple-testing.json` `terminal_state.fdr_K: 3`, `fdr_qLevel: 0.1`, `fdr_selected_indices: [2,5,8]`; `node --test` ok 8 |
| AC-R71-9 | hierarchical-evalue `fleet_fired === true` AND tick non-null | PASS (caveats — see MAJOR-1) | `demos/scenarios/hierarchical-evalue.json` `terminal_state.fleet_fired: true`, `fleet_tick_at_first_fire: 16`; `node --test` ok 9. AC literal passes; reasoning-text-vs-data contradicted (MAJOR-1). |
| AC-R71-10 | sparse-data-resilience `common_mode_candidates === []` | PASS | `demos/scenarios/sparse-data-resilience.json` `terminal_state.common_mode_candidates: []`; no throw observed; engine BFS over zero edges returns empty; `node --test` ok 10 |
| AC-R71-11 | topology-spanning cooling_zone candidate, member_count ≥ 4 | PASS (caveats — see MAJOR-2) | `demos/scenarios/topology-spanning-common-mode.json` 3 candidates total, cz-1 has member_count=4; `node --test` ok 11. AC literal passes; reasoning-text-vs-data contradicted (MAJOR-2). |
| AC-R71-12 | demo.html structural elements + 8 inlined scenario tags | PASS | `demos/demo.html`: `<select id="scenario-selector">` at HTML body; `<button id="btn-play">`, `<button id="btn-pause">`, `<button id="btn-reset">`, `<select id="speed-selector">`, `<svg id="mt-chart"`, `<section id="audit-panel">`, `<section id="reasoning-panel">`, `<section id="next-actions-panel">` all present; 8 `<script type="application/json" id="tessera-scenario-<name>">` blocks present; `node --test` ok 12 |
| AC-R71-13 | demo.html inlined JSON ≡ on-disk JSON per scenario | PASS | `test/q71-demo-dashboard.test.ts:159-171`; `JSON.parse` round-trip equality verified per scenario; `node --test` ok 13 |
| AC-R71-14 | R70 CLI surface preserved (anti-regression) | PASS | `tools/demo-scenario.ts` untouched (verified by `git diff 54af89f..HEAD -- tools/demo-scenario.ts` → empty); `runScenario('clean-baseline').exit_code === 0`; `output` matches `/Tessera demo · clean-baseline/`; `node --test` ok 14 |

**Full-suite test result at chore-A HEAD** (independently re-run by Reviewer per CLAUDE-REVIEWER.md mandate):
- `pnpm exec tsc -p tsconfig.test.json` → exit 0 ✓ (matches spec § 10.6 prediction)
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `tests=469 / pass=461 / fail=5 / skipped=3` ✓ (matches spec § 10.6 prediction exactly)
- `bash coordination/specs/Q-R71-EMPIRICAL.sh` → 10 PASS / 0 FAIL / exit 0 ✓
- `git diff 54af89f..HEAD --name-only` → 18 paths, all ⊆ ALLOWED_SET ✓
- Carry-forward fail identity = {AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14}, all 5 present ✓

All 14 R71 ACs pass at literal binding. **Substantive deliverable works**: dashboard opens from `file://`, 8 scenarios load, build is idempotent. The MAJOR findings below concern public-facing demo content quality, not test failures.

---

## § 2. Findings

### MAJOR-1 — hierarchical-evalue scenario: reasoning text contradicts observed firing behavior

**Severity rationale:** The dashboard is the R71 deliverable. A visitor opening `demos/demo.html`, selecting "Hierarchical e-value," and reaching the terminal window sees:
- Reasoning panel: "Five shards each carry small drift (+0.20/window) **too small to fire alone**, but the per-shard e-values combine via combineAverage…"
- Verdict badges panel at terminal: **all 5 shards display `FIRE`**.

The reasoning text and the visible verdict badges directly contradict each other on the same screen.

**File:line evidence:**
- `demos/scenarios/hierarchical-evalue.json` `terminal_state.firing_shards: ["shard-00","shard-01","shard-02","shard-03","shard-04"]` (all 5 fire individually by terminal w=30)
- Per-shard first-fire windows: shard-00 at w=23 (M=335.07); shard-01 at w=23 (M=348.41); shard-02 at w=23 (M=348.18); shard-03 at w=24 (M=264.69); shard-04 at w=18 (M=325.26). Terminal M_t values range 8239→559713 — all ≫ 200 threshold.
- `demos/scenarios/hierarchical-evalue.json` `reasoning` field: "Five shards each carry small drift (+0.20/window) too small to fire alone" — empirically false under the chosen seed and drift.
- Source location: `tools/build-canned-demos.ts:587` (`HIER_DRIFT = 0.20`); `tools/build-canned-demos.ts:651` (reasoning string).

**Why this is MAJOR not MINOR:** the demo dashboard is the *primary user-facing artifact* of R71. The contradiction is observable in the same DOM render at terminal window. A new visitor exploring Tessera reads narrative + sees data simultaneously and concludes one or both is wrong.

**Why this slipped through:** AC-R71-9 only binds `fleet_fired === true` (spec § 5 line 990; § 5.3 line 1049). The AC does NOT bind "no shard fires alone," even though that property is what makes hierarchical-evalue *pedagogically interesting* (otherwise the fleet detector is redundant with N parallel per-shard detectors). Spec § 2.5 "Tactical knob: drift magnitudes" describes HIER_DRIFT=0.20 as chosen so "no single shard fires alone, but accumulating fleet-level wealth fires by window N=30" — but this property was never bound by an AC, and the Implementer's TACTICAL AUTONOMY in § 6.2 permits ±0.10 tuning only when the AC is unmet, not when the narrative property breaks.

**Fix options (operator policy — Reviewer documents only):**
- (a) Tune HIER_DRIFT down (e.g., to 0.10) so terminal max M_t stays < 200 — spec § 6.2 permits ±0.10 from the prescribed 0.20; this is at the boundary.
- (b) Revise reasoning text to acknowledge the observed behavior: e.g., "The fleet detector fires at tick 16, ahead of any per-shard detector (earliest individual fire at w=18). This demonstrates the early-warning property of fleet-level pooling under correlated drift."
- (c) Reduce the observation window count below the individual-firing windows (e.g., WINDOW_COUNT=18 — shard-04 first fires at w=18; below that, no shard has fired alone).

### MAJOR-2 — topology-spanning-common-mode scenario: reasoning text claims "ONE" candidate but data surfaces THREE

**Severity rationale:** same as MAJOR-1 — the reasoning panel and the underlying data are on the same screen and contradict each other.

**File:line evidence:**
- `demos/scenarios/topology-spanning-common-mode.json` `terminal_state.common_mode_candidates` contains **3 entries**:
  - `{shared_node_id: "rack-A", shared_node_kind: "rack", member_count: 2, member_shard_ids: ["shard-00","shard-01"]}`
  - `{shared_node_id: "rack-B", shared_node_kind: "rack", member_count: 2, member_shard_ids: ["shard-03","shard-04"]}`
  - `{shared_node_id: "cz-1",   shared_node_kind: "cooling_zone", member_count: 4, member_shard_ids: ["shard-00","shard-01","shard-03","shard-04"]}`
- `reasoning` field: "BFS reaches the cooling_zone node common to both racks and surfaces **ONE** cooling-zone-level candidate spanning all 4 firing shards. This demonstrates how operator-tunable BFS depth controls attribution granularity…" — empirically false.
- `description` field: "ONE cooling-zone-level candidate surfaces spanning all 4 firing shards" — same false claim.
- Source location: `tools/build-canned-demos.ts:818` (`candidate_node_kinds: ['cooling_zone', 'rack', 'psu']` — includes both 'rack' and 'cooling_zone' in the eligibility set, so engine emits all three candidates per its design); `tools/build-canned-demos.ts:858` (description); `tools/build-canned-demos.ts:880` (reasoning).

**Mechanism:** `engine/topology/common-mode-attribution.ts:175-200` aggregates ALL candidate-eligible nodes that meet `min_member_count`. With `candidate_node_kinds = ['cooling_zone', 'rack', 'psu']`, both rack and cooling_zone candidates are emitted whenever their distinct-member-count ≥ 2. The "ONE not N" narrative requires `candidate_node_kinds = ['cooling_zone']` (rack filtered out) — but the spec prescribed including both kinds, and the Implementer followed the spec.

**Fix options (operator policy — Reviewer documents only):**
- (a) Change `candidate_node_kinds` to `['cooling_zone']` only — guarantees ONE candidate; matches reasoning text.
- (b) Revise reasoning text + description to acknowledge the 3-candidate output: e.g., "With max_hop_distance=2, the BFS reaches the cooling_zone node in addition to the per-rack candidates. The cooling_zone candidate aggregates ALL 4 firing shards into a single cluster-level attribution, while the rack candidates split them per-rack — demonstrating multi-level granularity rather than single-level collapse."
- (c) Compute and surface the cooling_zone candidate as a single named attribution while filtering out the per-rack candidates at scenario-construction time.

### MINOR-1 — AC-R71-9 + AC-R71-11 do not bind the pedagogical property the scenarios were designed to demonstrate (architect-side spec gap)

**Severity rationale:** the MAJOR findings above are downstream symptoms of this gap. AC-R71-9 binds `fleet_fired === true` (a property satisfied by ANY drift magnitude large enough to cross threshold) rather than "fleet fires before any per-shard fires" (the actual pedagogical claim). AC-R71-11 binds "cooling_zone candidate with member_count ≥ 4" rather than "exactly one candidate" or "cooling_zone is the only candidate kind."

**Source:** `coordination/specs/Q-R71-SPEC.md:990` (AC-R71-9); `:992` (AC-R71-11); `:1049-1051` (discriminating-assertion table acknowledges but does not close the gap).

**Why MINOR not MAJOR:** the substantive engine behavior is correct; only the spec's AC coverage was too loose to catch the narrative-data drift at chore-A. Future-round Architect should bind reasoning-text invariants by AC predicate.

### MINOR-2 — sdc-drift events array only populated at window 22 (crossing window); other 29 windows have empty events arrays

**Severity rationale:** observable in dashboard's audit panel as a near-silent playback (29 empty audit entries) with one event spike at the threshold-crossing window. The pedagogical "watch wealth accumulate" story is mostly carried by the SVG chart; the audit panel is sparse.

**File:line evidence:**
- `demos/scenarios/sdc-drift.json`: only `windows[22].events` is non-empty (`[{type:'threshold_crossed', ...}]`); all other windows have `events: []`.
- Source location: `tools/build-canned-demos.ts:236-238` (only emits `crossingEvent` when `thresholdCrossedAtWindow === w`).

**Compare:** hierarchical-evalue emits a `fleet_state` event every window (`tools/build-canned-demos.ts:613-619`) — much richer audit trail. The sdc-drift scenario could similarly emit a per-window `family_a_wealth` event with the leading shard's M_t for richer playback. Not bound by any AC; not a discipline finding.

### MINOR-3 — `tools/build-canned-demos.ts:1052` uses `Math.log10(200)` but threshold is `1/DEMO_ALPHA` (the formula could drift)

**Severity rationale:** the dashboard JS hardcodes `LOG10_THRESHOLD = Math.log10(200)` as a literal. The scenario JSONs serialize `params.threshold = 1/DEMO_ALPHA = 200`. If a future round changes `DEMO_ALPHA`, the dashboard chart's threshold line will silently drift from the actual threshold encoded in each scenario.

**File:line evidence:**
- `tools/build-canned-demos.ts:1052`: `var LOG10_THRESHOLD = Math.log10(200);` (hardcoded literal)
- `tools/build-canned-demos.ts:160`: `const DEMO_THRESHOLD = 1 / DEMO_ALPHA;` (computed from alpha; same literal "200" emerges)

**Fix:** the dashboard JS could read `scenarios['clean-baseline'].params.threshold` and recompute log10 per scenario. Not done here; tactical. Not a discipline violation.

### MINOR-4 — common-mode-rack per_shard.fired is mechanically set in build tool, not derived from engine output

**Severity rationale:** in `tools/build-canned-demos.ts:350`, the per_shard `fired` flag for common-mode-rack scenario is set by an inline literal predicate (`w === ATTRIBUTION_WINDOW && (id === 'shard-00' || id === 'shard-01' || id === 'shard-02')`) rather than derived from engine state. This is acceptable because the scenario uses `attributeCommonMode` (not Family-A betting), so there's no `M_t` to compare against a threshold — but it means a typo in the shard ID literal could silently mis-label which shards fired without breaking any AC.

**File:line evidence:**
- `tools/build-canned-demos.ts:350` (common-mode-rack)
- `tools/build-canned-demos.ts:713` (sparse-data-resilience — same pattern)
- `tools/build-canned-demos.ts:832` (topology-spanning — same pattern with 4-shard literal)

**Fix:** the `fired` flag for these scenarios could be derived from the `firedEvents` array (`firedEvents.map(e => e.shard_node_id).includes(id)`). Tactical; not a discipline finding.

### OBS-1 — Architect prediction § 10.6 was accurate to the byte

Spec § 10.6 predicted: tsc exit 0; tests=469/pass=461/fail=5/skipped=3; empirical 10 PASS / 0 FAIL / exit 0; 18 ALLOWED_SET paths in diff. All four predictions matched verbatim. Good empirical discipline; § 5.2 implementer-attestation surface held.

### OBS-2 — RED commit hygiene confirmed

`git show fcc51d6:test/q71-demo-dashboard.test.ts` contains exactly 14 `assert.fail('R71 RED — implementation pending')` stubs (one per AC); no build tool, no scenario JSON, no demo.html committed in the RED commit. R23 IMPL MINOR-1 TDD separate-RED-commit discipline held.

### OBS-3 — `<span id="window-indicator">window 0 / 30</span>` is initialized with "30" literal in committed HTML

When the user opens the file and the dashboard JS runs `loadScenario('clean-baseline')` (30 windows), the indicator correctly shows "window 0 / 30." Switching to common-mode-rack (5 windows) updates the indicator to "window 0 / 5." But the FILE on disk contains the "30" literal in the initial DOM. If the user opens devtools before the script runs, they see "30" — a non-issue, but the static literal is non-portable to scenarios with a different window count default.

**File:line:** `tools/build-canned-demos.ts:972` (`<span id="window-indicator">window 0 / 30</span>` in template).

### OBS-4 — fdr-multiple-testing scenario degenerates pedagogically (`fdr_selected_indices === firing_shards`)

`firing_shards = ['shard-02','shard-05','shard-08']` and `fdr_selected_indices = [2,5,8]` are exactly the same set. The e-BH layer does not add discriminative value beyond per-shard firing — both detectors identify the same 3 shards. The pedagogical point of e-BH (FDR control over many tests) is not visually demonstrated; instead it appears as a redundant second labeler. The reasoning text doesn't directly claim discrimination, so it's not contradicted — it just reads as "we ran two detectors and got the same answer." Like MINOR-1, the AC binds `1 ≤ fdr_K ≤ 5` (any non-trivial selection), not "fdr_K differs from per-shard firing count."

**File:line evidence:**
- `demos/scenarios/fdr-multiple-testing.json` `terminal_state.fdr_selected_indices: [2,5,8]` = indices of `firing_shards: ['shard-02','shard-05','shard-08']`
- Source location: `tools/build-canned-demos.ts:512` (`FDR_DRIFT = 0.45` — large enough that the 3 drifters fire individually).

**Tactical fix candidate:** reduce FDR_DRIFT below 0.45 so the e-BH layer selects MORE shards than fire individually (demonstrating e-BH's larger recall on noisy borderline cases). Operator decision.

---

## § 3. Right-reasons audit

### Test A — AC-R71-3 (idempotency, `test/q71-demo-dashboard.test.ts:60-71`)

- **Spec requirement traced:** Q-R71-SPEC.md § 2.4 ("no `Math.random()`, no `Date.now()`, no `process.hrtime()` in build tool"); § 5 AC-R71-3 ("Buffer.compare(post, pre) === 0").
- **Does the test pass for the right reason?** Yes. The test reads file bytes pre-call (capturing committed content), calls `buildAllCannedDemos()` (which overwrites files), reads file bytes post-call, asserts Buffer-level equality. Would fail if any non-deterministic source were introduced (Math.random, Date.now, undefined-ordered Object key emission). The build tool's determinism mechanism is verifiable independently: LCG seed per scenario at `tools/build-canned-demos.ts:97-106`; `now: () => 1_700_000_200` clock stubs at `:334, :410, :700, :816, :843`; `serializeScenarioJson` at `:150-152` uses `JSON.stringify(j, null, 2)` (deterministic given fixed key insertion order in `composeScenarioJson:137-148`).
- **Not self-confirming:** the test asserts byte-equality at the filesystem level — it observes side effects of the build tool against a committed baseline. The build tool cannot "satisfy itself" without producing actually-deterministic output.

### Test B — AC-R71-6 (common-mode-rack rack-A candidate, `test/q71-demo-dashboard.test.ts:86-95`)

- **Spec requirement traced:** Q-R71-SPEC.md § 5 AC-R71-6 binds shared_node_id='rack-A', shared_node_kind='rack', member_count=3, member_shard_ids sorted = ['shard-00','shard-01','shard-02'].
- **Does the test pass for the right reason?** Yes. The build tool constructs a synthetic 2-rack 6-shard topology (`tools/build-canned-demos.ts:291-308`), submits 3 fired-events on shards 00/01/02 to the real engine `attributeCommonMode` function (which is frozen vendored code, anti-scope A2). The test reads the resulting JSON and asserts on the engine's emitted candidate fields. If the engine attribution were broken, OR if the Implementer constructed the wrong topology fixture, the test would fail.
- **Not self-confirming:** the assertion targets engine output, not test-side arithmetic. The candidate values are computed by `engine/topology/common-mode-attribution.ts:131-200` BFS over the synthetic snapshot, not hand-rolled by the Implementer.

### Test C — AC-R71-13 (round-trip equality, `test/q71-demo-dashboard.test.ts:159-171`)

- **Spec requirement traced:** Q-R71-SPEC.md § 5 AC-R71-13 ("inlined JSON ≡ on-disk JSON per scenario via deepEqual on JSON.parse outputs").
- **Does the test pass for the right reason?** Mostly — with one structural risk noted. The test extracts each `<script type="application/json" id="tessera-scenario-<name>">` block from the HTML via regex, `JSON.parse`s it, reads the corresponding on-disk JSON, asserts deepEqual. Would fail if (a) HTML escaping mangled JSON characters, (b) Implementer manually edited one but not the other post-build, (c) the inlined JSON were not valid JSON syntax.
- **Structural risk noted (not self-confirming, but compatible-with-itself):** both the inlined JSON and on-disk JSON come from the same `serializeScenarioJson` call sequence in `buildAllCannedDemos`. If the build tool emitted broken JSON, both would be broken identically — the deepEqual check would still pass on the deserialization round-trip (`JSON.parse` would throw, so invalid JSON IS caught). Combined with AC-R71-2's structural-shape check on the on-disk JSON, the coverage is adequate.

**All 3 audited tests are right-reasons.** No self-confirming pattern detected.

---

## § 4. Cross-cutting checks

### TDD discipline (R23 IMPL MINOR-1 separate-RED-commit)

VERIFIED. `git log --oneline -10`:
```
9e1f29f chore(R71 IMPLEMENTER): routing block + MEMORIAL entries
cfa7d0f feat(R71): Tessera demo dashboard
fcc51d6 red(R71): q71 demo dashboard stub fails — TS2307 + 14 RED assertion stubs
f9c207c chore(R71 ARCHITECT): routing block + MEMORIAL entries
37b32b4 spec(R71): Q-R71-SPEC + audit sidecar + EMPIRICAL.sh
```

- `fcc51d6` (RED) lands ONLY `test/q71-demo-dashboard.test.ts` with 14 `assert.fail('R71 RED — implementation pending')` stubs (verified by `git show fcc51d6 --stat` → 1 file changed, 87 insertions). No build tool, no scenario JSON, no demo.html present at RED.
- `cfa7d0f` (GREEN) lands the build tool, scenario JSONs, demo.html, real test assertions, package.json + README.md changes.
- Spec triad commit `37b32b4` precedes chore-A `cfa7d0f` per R21 ARCH MINOR-1.

### No-skip / halt discipline

VERIFIED. No DIAGNOSTIC-R71-*.md files present in `coordination/diagnostics/` (carve-out unused). Empirical script returns 10 PASS / 0 FAIL / exit 0; tsc exit 0; full test suite matches predicted baseline (469/461/5/3 with carry-forward identity preserved). No spec/reality mismatch surfaced during implementation.

### Anti-scope diff verification

VERIFIED. `git diff 54af89f..HEAD --name-only` returns exactly the 18 paths enumerated in spec § 3.2 ALLOWED_SET:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R71-EMPIRICAL.sh
coordination/specs/Q-R71-SPEC-AUDIT.md
coordination/specs/Q-R71-SPEC.md
demos/demo.html
demos/scenarios/clean-baseline.json
demos/scenarios/common-mode-rack.json
demos/scenarios/event-conditional.json
demos/scenarios/fdr-multiple-testing.json
demos/scenarios/hierarchical-evalue.json
demos/scenarios/sdc-drift.json
demos/scenarios/sparse-data-resilience.json
demos/scenarios/topology-spanning-common-mode.json
package.json
README.md
test/q71-demo-dashboard.test.ts
tools/build-canned-demos.ts
```

Specifically:
- `git diff 54af89f..HEAD --name-only -- engine/` → empty (no engine modifications) ✓ (anti-scope A2)
- `git diff 54af89f..HEAD --name-only -- tools/demo-scenario.ts` → empty (R70 CLI untouched) ✓ (anti-scope A3)
- `git diff 54af89f..HEAD --name-only -- "coordination/specs/" | grep -vE "Q-R71-"` → empty (no prior-round spec mods) ✓ (anti-scope A5)
- `package.json` diff adds `prebuild:demos` + `build:demos` scripts only (no dependency changes) ✓ (anti-scope A1)
- `demos/demo.html` contains no `fetch`, `import`, `eval`, `Function()`, `XMLHttpRequest`, `WebSocket` (verified by grep) ✓ (anti-scope A12)

No scope creep observed.

### Reinforcement compliance

| Reinforcement | Applied | Evidence |
|---|---|---|
| R20 (AC-table preamble cross-check) | YES | Q-R71-SPEC.md § 5 preamble ("All 14 ACs are committed-runtime-test attestations") matches § 4.3 (14 test() invocations) and individual AC rows. |
| R21 (spec-commit-before-routing) | YES | spec(R71) commit 37b32b4 precedes chore commits. |
| R22 (count-AC SHA anchoring) | YES | empirical script `ROUND_START_SHA` literal injected at chore-A. |
| R23 (TDD separate-RED-commit + .gitignore-aware inventory) | YES | RED commit fcc51d6 separate; ALLOWED_SET excludes `.js` compiled outputs. |
| R25 (cluster-worktree baseline fresh) | YES | Architect ran `node --test` at session entry per spec § 9.1; verified 455/447/5/3 baseline independently. |
| R26 (false-compliance-attestation) | YES | Implementer attestation predicted to encode verbatim observed values; chore-A test counts matched prediction so divergence-encoding-rule not exercised. |
| R56 (halt-trigger carve-out) | N/A | R71 single-state; no overlap surface. |
| R58 (constructor opts symbol drift) | YES | DsEventConsumer opts (`port`), createFreezeHookFromDsEvents opts (`consumer, config, activation_window_seconds, setTimeout, clearTimeout, now`), attributeCommonMode opts (`max_hop_distance, min_member_count, candidate_node_kinds, now`) all match engine declarations. |
| R65 (P3 commitments bound by AC) | PARTIAL — see MINOR-1 | Spec § 9 corner-cases self-audit claimed every behavioral commitment is bound by an AC, but the pedagogical claims in `reasoning` text (e.g., "too small to fire alone") are NOT bound by AC, leading to MAJOR-1 and MAJOR-2 drift. |
| R66 (semantic-overclaim field naming) | YES | terminal_state field names directly mirror engine observables. |
| R70 (spec narrative vs executable script alignment) | YES | spec § 11.2 + empirical script Block 2 both use unanchored grep. |

---

## § 5. Grilling output (on this report, before routing)

- **Every finding has a file:line reference?** YES — MAJOR-1 cites `tools/build-canned-demos.ts:587, :651` + `demos/scenarios/hierarchical-evalue.json`; MAJOR-2 cites `tools/build-canned-demos.ts:818, :858, :880` + `demos/scenarios/topology-spanning-common-mode.json`; all MINORs and OBS have file:line references.
- **Any AC marked PASS without actual verification?** NO — every AC PASS row cites the on-disk JSON value or test name verified via `node --test` ok N. The two ACs with caveats (AC-R71-9 + AC-R71-11) remain PASS because the AC literal is met; the caveats are surfaced as MAJOR findings.
- **Right-reasons audit completed for 3+ tests?** YES — Tests A (AC-R71-3 idempotency), B (AC-R71-6 common-mode-rack candidate), C (AC-R71-13 round-trip).
- **Adversarial mandate fulfilled?** YES — 2 MAJOR + 4 MINOR + 4 OBS surfaced. Two MAJORs are narrative-vs-data contradictions that pass current ACs but would degrade the dashboard's reputation as a public-facing artifact. Reviewer assumed at least one mistake and found several.
- **Routing decision proper per CLAUDE-REVIEWER.md rules?** YES — no CRITICAL surfaced (no merge-blocker correctness bug, security issue, or data-integrity problem; all ACs pass at literal level). MAJOR exists → STATUS: MERGE-READY per CLAUDE-REVIEWER.md routing rule "MAJOR or below → STATUS: MERGE-READY."

---

## § 6. Routing

**STATUS: MERGE-READY** (per CLAUDE-REVIEWER.md "CRITICAL exists → STATUS: ESCALATE; MAJOR or below → STATUS: MERGE-READY").

The R71 deliverable is functional: dashboard opens from `file://`, 8 scenarios load, 14 ACs pass, build is idempotent, anti-scope held. The two MAJOR findings concern narrative-vs-data contradictions in `reasoning` text fields of two scenarios — visible to dashboard visitors but not bound by any AC. Operator should decide whether to address them in R72 (the planned coverage-validation follow-up round) or accept them as documented-but-unfixed-in-R71. Reviewer documents only; does not fix.

---

_End of REVIEWER-REPORT-R71.md._
