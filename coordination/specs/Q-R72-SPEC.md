# Q-R72-SPEC — Coverage saturation matrix (6 failure types × 20 variations = 120 cases)

**Round:** R72 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `e77da5c` (chore(R71): Memorial-Updater outputs; per NEXT-ROLE.md § R72 directive)
**Spec-emit SHA:** stamped by Architect commit (this spec triad lands BEFORE chore-A per R21 ARCH MINOR-1)
**Authority:** `coordination/NEXT-ROLE.md` § R72 Round-scope directive (2026-05-20).

---

## § 0. Brainstorm (Superpowers Phase 1)

R71 shipped a static demo dashboard with 8 hand-picked scenarios. Two MAJORs surfaced (R71 MAJOR-1 + MAJOR-2) where dashboard narrative text contradicted the engine's actual output across the parameter space. R72 closes that loop with an empirical saturation matrix that runs each failure type across 20 parameter variations, captures the engine's actual response per variation, and binds detection + attribution properties to per-type minimums via runtime ACs.

### Approach A — One large unit test per failure type with hard-coded expected counts

Pre-compute the expected (`detected? correct_shard? FP_count`) per variation by data-flow analysis, encode the table as a JS array constant in the test file, and assert each variation matches its expected row.

- **Strengths:** crisp; one truth source.
- **Weaknesses:** R71 MAJOR-1 + MAJOR-2 happened EXACTLY this way — Architect prescribed a string ("ONE candidate") that didn't match engine reality. The Architect cannot reliably pre-compute engine behavior across 120 variations by data-flow alone; any single mis-prediction creates a self-confirming test that hides a real engine drift.
- **Hidden assumption:** the Architect's prediction equals reality.
- **Eliminated** by R71 MAJOR-1 + MAJOR-2 lesson (REINFORCED 2026-05-20 R71): pre-authored narrative text asserting empirical engine properties is the SAME class of failure as pre-authored expected-values asserting engine properties.

### Approach B — Saturation runner emits raw matrix; tests assert per-type minimums only

A standalone build tool (`tools/coverage-saturation.ts`) runs the engine for each of 120 variations, captures the engine's actual outcome per variation, and writes a JSON matrix + Markdown summary to `coordination/coverage/`. Runtime ACs in `test/q72-coverage-saturation.test.ts` assert AGGREGATE per-type minimums (detection rate ≥ M_type, attribution accuracy ≥ 95% among detected, FP count bound ≤ X_type) — NOT per-variation hard-coded expectations. The matrix is the empirical record; the ACs are the minimum quality gates the engine must clear.

- **Strengths:** matrix REPORTS reality; ACs assert minimums; engine improvements/regressions show in matrix data without breaking ACs. Aligns with directive's "≥ Architect minimum" framing.
- **Weaknesses:** less precise per-variation; a single-variation regression could be invisible if the aggregate floor still holds.
- **Hidden assumption:** an aggregate floor (e.g., 16/20 detection) is more important than a per-variation hard expectation. The R71 lesson supports this: per-variation prescriptions fail.
- **PICKED.**

### Approach C — Saturation runner + per-variation expectations regenerated each run (golden-file diff)

Like B, but tests perform byte-level golden-file comparison between two runs (idempotency) AND between current run and committed `R72-saturation-matrix.json`. Engine drift = matrix.json diff; ACs assert ONLY structural shape + per-type minimums.

- **Strengths:** detects ANY engine regression at the matrix level via git diff.
- **Weaknesses:** committing the matrix.json as a golden artifact means every legitimate engine improvement requires a matrix.json update commit; creates a non-architectural fragility tax. R71 chose the same pattern (`demos/scenarios/*.json` committed; deterministic regeneration); precedent supports it.
- **Augmenting B:** B + idempotency AC (run twice → byte-identical matrix.json) IS the golden-file discipline without the breakage tax.

### Selection rationale

**Approach B selected**, augmented with idempotency from C. The matrix.json file IS committed to git for reviewer-auditability (like R71's `demos/scenarios/*.json`) but the ACs assert per-type aggregate minimums, not per-variation hard-coded expectations. Engine reality is the source of truth; the matrix records it; the ACs guard against engine regressions below documented minimums.

**What was rejected:**
- A — per-variation hard-coded expectations replicate the R71 MAJOR-1/MAJOR-2 self-confirming-test failure mode.
- C in its strong form — matrix.json as golden file creates per-engine-improvement update tax without proportional benefit.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Saturation runner | — | `tools/coverage-saturation.ts` (Tessera-original; single file; ~900-1200 lines TS) | — | — |
| Coverage outputs | — | `coordination/coverage/R72-saturation-matrix.json` + `R72-saturation-matrix.md` (Tessera-original; generated; checked into git) | — | — |
| Package scripts | `package.json` (scripts block) | — | adds 2 entries (`prebuild:coverage`, `coverage`) | — |
| README | `README.md` ("Quick demo" + "Coverage" tail) | — | adds a Coverage section (≤ 30 lines) at the tail | — |
| Tests | — | `test/q72-coverage-saturation.test.ts` (Tessera-original; ~400-600 lines TS) | — | — |
| Engine | `engine/detectors/betting-e-process.ts`, `engine/topology/common-mode-attribution.ts`, `engine/ds-integration/event-consumer.ts`, `engine/ds-integration/freeze-hook-factory.ts`, `engine/per-shard/warm-start.ts`, `engine/fleet/e-bh.ts`, `engine/fleet/combine.ts`, `engine/types/verdict.ts`, `engine/ds-integration/event-contract.ts`, `engine/types/families/a.ts`, `engine/types/fleet.ts` | — | — | — |
| R70/R71 surfaces | `tools/demo-scenario.ts` (R70), `tools/build-canned-demos.ts` (R71), `demos/demo.html`, `demos/scenarios/*.json`, R36/R65/R66 carry-forward tests | — | — | — |
| Spec triad | — | `coordination/specs/Q-R72-SPEC.md`, `Q-R72-SPEC-AUDIT.md`, `Q-R72-EMPIRICAL.sh` | — | — |

**Critical anti-scope clarification:** `tools/build-canned-demos.ts` (R71) and `tools/demo-scenario.ts` (R70) are **READ-ONLY** at R72. The saturation runner shares the SAME LCG + Gaussian primitive shapes (re-implemented inside `coverage-saturation.ts` to keep cross-tool coupling zero) but does NOT import from R70/R71 tools. R71's scenario JSON files in `demos/scenarios/` are NOT modified by R72 — they remain the dashboard's static record; R72 produces its own distinct matrix output under `coordination/coverage/`.

### 1.2 Data flow (build-time)

```
pnpm coverage
   → prebuild:coverage compiles tools/coverage-saturation.ts → .js
   → node tools/coverage-saturation.js
       for each type in [sdc-drift, common-mode-rack, event-conditional,
                          fdr-multiple-testing, hierarchical-evalue,
                          topology-spanning-common-mode]:
         for each variation in variations[type] (length = 20):
           a. seedRng(SCENARIO_SEED[type] XOR variation_idx)   — deterministic LCG
           b. buildSyntheticInputs(variation.params)            — type-specific fixture
           c. runVariation(variation):                         — calls engine surfaces
                returns observation = {
                  detected: boolean,
                  attribution_correct: boolean,
                  detection_window_index: number | null,
                  false_positive_count: number | null,
                  pedagogical_property_met: boolean | null,   — type-5 only; null otherwise
                  raw_terminal: { ...type-specific captured fields }
                }
           d. matrix_rows.push({ type, variation_idx, params, observation })
       per_type_summary[type] = aggregate(matrix_rows where row.type === type):
         detection_rate = detected_count / 20
         attribution_accuracy = correct_count / detected_count  — undefined if detected_count = 0
         max_false_positive_count = max(false_positive_count over detected variations)
         pedagogical_property_rate = pedagogical_met / detected_count — type-5 only
       writeFile(coordination/coverage/R72-saturation-matrix.json)
       writeFile(coordination/coverage/R72-saturation-matrix.md)

pnpm test (no engine modification path)
   → tsc compiles test/q72-coverage-saturation.test.ts
   → node --test asserts on:
       - matrix.json structural shape
       - per-type detection_rate ≥ minimum (§ 2.3 table)
       - per-type attribution_accuracy ≥ 0.95 (when detection_rate > 0)
       - per-type max_false_positive_count ≤ ceiling (§ 2.3 table)
       - hierarchical-evalue pedagogical_property_rate ≥ 0.80
       - matrix idempotency: programmatic re-run produces byte-identical
         matrix.json bytes
       - anti-regression: tools/build-canned-demos.ts SCENARIO_NAMES still exports 8 names;
         tools/demo-scenario.ts SCENARIO_NAMES still exports 4 names
```

### 1.3 Integration points with engine surfaces (claim-then-walk verified at Architect session entry; engine SHA = `e77da5c`)

Each engine signature was opened by direct file read at session entry — not from memory or prior-round attestation.

| Engine entry point | Source file:line | Signature (verbatim from session-entry read) | Saturation usage |
|---|---|---|---|
| `freshBettingState` | engine/detectors/betting-e-process.ts:72 | `(): BettingEProcessState` returning `{ M:1, bet:0, n:0, alphaConsumed:0, runningMean:0, runningSecondMoment:0, onsFallbackCount:0 }` | Allocate per-shard Family-A state per variation in types 1, 4, 5. |
| `updateBettingState` | engine/detectors/betting-e-process.ts:151 | `(state: BettingEProcessState, x: number, baselineMean: number, sigmaSquared: number, perTickAlpha: number): number` — MUTATES state in-place; returns updated `state.M`. | Drive per-shard wealth per window per variation in types 1, 4, 5. |
| `attributeCommonMode` | engine/topology/common-mode-attribution.ts:131 | `(input: CommonModeAttributionInput): CommonModeAttributionResult` where input = `{ fired_events: readonly FiredShardEvent[], snapshot: TopologySnapshot, opts?: CommonModeAttributionOpts }`; result = `{ candidates: readonly CommonModeCandidate[], snapshot_hash: string, attributed_at_ts: number }`. | Surface common-mode candidates in types 2 + 6. |
| `CommonModeAttributionOpts` | engine/topology/common-mode-attribution.ts:85-96 | `{ max_hop_distance?: number; min_member_count?: number; candidate_node_kinds?: ReadonlyArray<TopologyNode['kind']>; now?: () => number; }` — defaults: `max_hop_distance=1`, `min_member_count=2`, `candidate_node_kinds=['psu','rack','cooling_zone']`. | Type-2 default opts (max_hop=1, min_member=2). Type-6 varies `max_hop_distance ∈ {1,2,3,4,5}`; preserves default `candidate_node_kinds`. |
| `DsEventConsumer` constructor | engine/ds-integration/event-consumer.ts:169 | `new DsEventConsumer(opts: DsEventConsumerOpts)`; constructor does NOT bind a server — `.start()` does. | Construct with `{ port: 0 }`; never call `.start()`; consumer acts as EventEmitter (type 3). |
| `createFreezeHookFromDsEvents` | engine/ds-integration/freeze-hook-factory.ts:87 | `(opts: FreezeHookActivatorOpts): FreezeHookActivator` with methods `.update(current, obs, baselineCell)`, `.getState()`, `.cancelActivation()`, `.dispose()` | Wire consumer + factory per type-3 variation; emit 'activate'; call `.update()`; observe residual reference-equality. |
| `initialPerShardResidual` | engine/per-shard/warm-start.ts:38 | `(): PerShardResidual` returning `{ n_samples: 0, confidence: 'none' }`. | Seed type-3 residual per variation. |
| `eBenjaminiHochberg` | engine/fleet/e-bh.ts:90 | `(perShardEValues: ReadonlyArray<number>, qLevel: number): EBenjaminiHochbergOutput` where output = `{ selected: ReadonlyArray<number>, K: number }`. Throws on N=0 or qLevel ∉ (0,1]. | Apply FDR control to type-4 per-shard e-values; q-level varies per variation. |
| `combineAverage` | engine/fleet/combine.ts:87 | `(log_e_values: ReadonlyArray<number>): FleetMergeOutput` returning `{ log_fleet_e: number }`. Throws on empty input. | Combine per-shard log-e-values to fleet log-e-value in type 5. |
| `freshFleetEProcessState` | engine/fleet/combine.ts:102 | `(): FleetEProcessState` returning `{ log_fleet_e_t: 0, log_fleet_e_max: 0, n: 0, fired: false, tick_at_first_fire: null }`. | Allocate fleet wealth tracker per type-5 variation. |
| `updateFleetEProcessState` | engine/fleet/combine.ts:122 | `(state: FleetEProcessState, log_fleet_e_t: number, log_threshold: number): FleetEProcessState` — MUTATES in-place. | Advance fleet wealth + sticky-fire latch per type-5 window. |
| `DEFAULT_MIN_MEMBER_COUNT` | engine/topology/common-mode-attribution.ts:116 | `export const DEFAULT_MIN_MEMBER_COUNT = 2;` | Type-2 default; documented in matrix params for transparency. |
| `DEFAULT_MAX_HOP_DISTANCE` | engine/topology/common-mode-attribution.ts:115 | `export const DEFAULT_MAX_HOP_DISTANCE = 1;` | Type-6 baseline against which variation hop values are interpreted (hop=1 → cooling_zone unreachable; hop≥2 → reachable). |
| `DEFAULT_CANDIDATE_NODE_KINDS` | engine/topology/common-mode-attribution.ts:117 | `export const DEFAULT_CANDIDATE_NODE_KINDS: ReadonlyArray<TopologyNode['kind']> = ['psu', 'rack', 'cooling_zone'];` | Type-6 preserves default (cooling_zone is in default; no need to override). |

**Failure modes at each integration point:**

1. `updateBettingState` requires `sigmaSquared > 0` (line 158 guard `Math.max(sigmaSquared, 0)`). All variations pass σ² = 1; safe.
2. `updateBettingState` mutates state in-place. Saturation runner allocates `freshBettingState()` per shard per variation.
3. `updateBettingState` clips `z` to ±1 via `boundedZ` (line 138-145; BOUNDED_SCALE_B = 3 → z = clip((x − μ)/(3σ), -1, +1)). For drift d added to a Gaussian draw, the EFFECTIVE z contribution is `min(1, d/3 + draw/3)`. This means **drift larger than 3·σ saturates** — past d = 3 the bet update behaves identically. Saturation runner stays well within the unsaturated band: highest type-1 drift d = 0.7 → z contribution ≤ 0.7/3 + 1 = 1.23 → still partially saturated upward. Predicted detection latency is monotonically non-increasing in d (verified empirically by R71: d=0.4 → fires at w=22 from start w=6; latency = 16 windows).
4. `attributeCommonMode` silently skips fired-events whose `shard_node_id` does not match any node in the snapshot (line 161 comment "F4: unknown shard silently skipped"). All variations construct snapshot before fired-events list; verified by construction.
5. `attributeCommonMode` requires ≥ `min_member_count` (default 2) distinct member shards at a candidate node to surface (line 179 "F2 / F9: singleton not surfaced"). Type-2 always has ≥ 2 shards on target rack; type-6 with fired-set `{sh-00, sh-03}` (1+1 cross-rack) intentionally tests the singleton-rack non-surfacing path while cooling_zone-level (member=2) still surfaces at hop≥2.
6. `attributeCommonMode` BFS at depth `max_hop_distance`. Topology graph hop counts (verified by direct read of attribution code adjacency-construction at lines 142-148):
   - gpu_shard → rack: 1 hop
   - rack → cooling_zone: 1 hop
   - gpu_shard → cooling_zone (via rack): 2 hops
   - At `max_hop=1`: only rack nodes reachable from each fired shard (no cooling_zone candidates surface).
   - At `max_hop=2`: both rack and cooling_zone reachable.
   - At `max_hop≥3`: same set as max_hop=2 in this fixture (no additional candidate-eligible nodes exist beyond 2 hops).
7. `DsEventConsumer` extends `EventEmitter`. Emitting 'activate' before `createFreezeHookFromDsEvents` subscribes would lose the event. Saturation runner wires factory FIRST, then emits (mirrors R71 ordering).
8. `createFreezeHookFromDsEvents` uses `setTimeout` to auto-deactivate after `activation_window_seconds`. Saturation runner passes stub `setTimeout` returning `null as unknown` so activation does not auto-cancel within the recording window (mirrors R71 pattern).
9. `eBenjaminiHochberg` throws on `N=0` and on `qLevel ∉ (0,1]`. Type-4 uses N=10 + qLevel ∈ {0.05, 0.10, 0.15, 0.20, 0.25} (all in (0,1]); safe.
10. `combineAverage` throws on empty input. Type-5 allocates N ∈ {5, 8, 10, 15} shards from window 0; never invoked with empty input.
11. `updateFleetEProcessState` mutates state in-place; sticky-fire latch persists once `log_fleet_e_max ≥ log_threshold`. Saturation runner records `state.fired` + `tick_at_first_fire` per variation.

---

## § 2. Mechanism

The R72 deliverable is a Node-only saturation runner at `tools/coverage-saturation.ts` plus its two checked-in build artifacts (`coordination/coverage/R72-saturation-matrix.{json,md}`). The runner exposes one public function `runSaturationCoverage(opts?: SaturationOpts): SaturationResult` consumed BOTH by the CLI entry point AND by the q72 test file. The CLI is invoked via `pnpm coverage`; tests import `runSaturationCoverage` directly to verify idempotency and matrix shape without spawning subprocesses.

### 2.1 The six failure types

Each type has exactly 20 variations: a 4 × 5 grid of (primary_axis, secondary_axis). Variation ordering is fixed by `variation_idx ∈ [0..19]` where `variation_idx = primary_idx × 5 + secondary_idx`. Variation ordering MUST be deterministic and identical across runs.

| # | Type name (literal) | Primary axis (4 values) | Secondary axis (5 values) | Engine surface(s) |
|---|---|---|---|---|
| 1 | `sdc-drift` | target_shard_id ∈ {`shard-01`, `shard-03`, `shard-04`, `shard-07`} | (drift_per_window, drift_start_window) ∈ {(0.20, 10), (0.30, 8), (0.40, 6), (0.50, 5), (0.70, 4)} | `freshBettingState`, `updateBettingState` |
| 2 | `common-mode-rack` | (target_rack, fired_set) ∈ {(`rack-A`, [00,01,02]), (`rack-A`, [00,01]), (`rack-B`, [03,04,05]), (`rack-B`, [03,04])} | attribution_window ∈ {0, 1, 2, 3, 4} | `attributeCommonMode` |
| 3 | `event-conditional` | event_class ∈ {`firmware_push`, `deploy`, `config_change`, `rollback`} | (event_ts_offset_s, sample_ts_offset_s) ∈ {(10, 20), (50, 100), (100, 150), (200, 250), (290, 295)} | `DsEventConsumer`, `createFreezeHookFromDsEvents`, `initialPerShardResidual` |
| 4 | `fdr-multiple-testing` | drifting_shard_count ∈ {1, 3, 5, 8} (positions: first N of [0..9]) | qLevel ∈ {0.05, 0.10, 0.15, 0.20, 0.25} | `freshBettingState`, `updateBettingState`, `eBenjaminiHochberg` |
| 5 | `hierarchical-evalue` | shard_count ∈ {5, 8, 10, 15} | (drift_per_window, drift_start_window) ∈ {(0.10, 8), (0.13, 7), (0.16, 6), (0.20, 5), (0.25, 5)} | `freshBettingState`, `updateBettingState`, `combineAverage`, `freshFleetEProcessState`, `updateFleetEProcessState` |
| 6 | `topology-spanning-common-mode` | fired_set ∈ {[00,01,03,04], [00..05], [00,03], [00,01,02,03]} | max_hop_distance ∈ {1, 2, 3, 4, 5} | `attributeCommonMode` |

### 2.2 Per-variation captured observation (deterministic JSON)

Every variation produces an `observation` object:

```jsonc
{
  "detected": boolean,                       // type-specific detection criterion (see § 2.4)
  "attribution_correct": boolean | null,     // type-specific attribution criterion (see § 2.4); null when not detected
  "detection_window_index": number | null,   // type-specific window index when detection first fires; null when not detected
  "false_positive_count": number | null,     // type-specific FP count; null where FP is N/A (types 3, 5)
  "pedagogical_property_met": boolean | null,// type-5 only ("fleet fires before per-shard"); null for all other types
  "raw_terminal": { /* type-specific captured fields */ }
}
```

Top-level matrix.json shape:

```jsonc
{
  "schema_version": "tessera-coverage-v1",
  "generated_with_seed_prefix": 466016,       // SCENARIO_SEED_PREFIX literal; matrix is deterministic given this prefix + variation_idx
  "types": [                                  // length 6; ordered by failure-type number 1..6
    {
      "type_name": "sdc-drift",
      "description": "<one-paragraph description>",
      "primary_axis_label": "target_shard_id",
      "secondary_axis_label": "(drift_per_window, drift_start_window)",
      "variations": [                          // length 20; ordered by variation_idx 0..19
        {
          "variation_idx": 0,
          "params": { /* type-specific knob values */ },
          "observation": { /* per § 2.2 above */ }
        }
      ],
      "summary": {
        "detection_rate": number,              // detected_count / 20; ∈ [0, 1]
        "detected_count": number,              // integer in [0, 20]
        "attribution_accuracy": number | null, // correct_count / detected_count when detected_count > 0; null when 0
        "correct_count": number,               // integer in [0, detected_count]
        "max_false_positive_count": number | null, // max over detected variations; null when type-3/type-5
        "pedagogical_property_rate": number | null // type-5 only; null otherwise
      }
    }
  ],
  "totals": {
    "total_variations": 120,                  // sum over types of variations.length
    "total_detected": number,
    "total_attribution_correct": number
  }
}
```

**JSON serialization rules** (load-bearing for determinism):

- Pretty-printed with 2-space indentation; trailing newline.
- Top-level keys in the exact order shown above.
- `types[]` ordered by failure-type number 1..6 (NOT alphabetical).
- `variations[]` ordered by `variation_idx` 0..19.
- `params` numeric values are NOT rounded; they are exact literals from the variation grid.
- `raw_terminal.M_t` numeric values rounded to 6 decimal places (`Math.round(M * 1e6) / 1e6`).
- All numeric ratios (`detection_rate`, `attribution_accuracy`, `pedagogical_property_rate`) are NOT rounded — JSON.stringify default behavior preserves full precision.
- Object key ordering is insertion order; the saturation runner constructs each object literal with keys in the exact order shown.

### 2.3 Per-type minimums (Architect prediction, conservative; ACs encode these floors)

Architect prediction is grounded in (a) R71 empirical data for shared scenario shapes and (b) data-flow analysis through the engine for novel parameter combinations.

| Type | Detection rate ≥ | Attribution accuracy ≥ | Max FP count ≤ | Pedagogical property rate ≥ | Rationale |
|---|---|---|---|---|---|
| 1 sdc-drift | 16 / 20 (0.80) | 0.95 | 0 (each detected variation should fire ONLY the target shard) | N/A | R71 baseline (d=0.4, target=shard-04): fires at w=22 with 0 FP. d≥0.30 should reliably fire by w=30; d=0.20 may not. 4 target shards × 5 magnitudes — 4 lowest-mag variations may not detect → floor 16/20. |
| 2 common-mode-rack | 20 / 20 (1.00) | 0.95 | 0 (only target rack should surface; other rack has no fired shards) | N/A | All 4 fired-sets have ≥ 2 distinct shards on the target rack → min_member=2 default surfaces target rack at every variation. Engine returns 1 rack candidate per fired-set; no spurious candidates expected. |
| 3 event-conditional | 20 / 20 (1.00) | 0.95 | N/A | N/A | All 5 (event_ts, sample_ts) offsets fall within activation_window_seconds=300; freeze should always activate, residual should always be returned by reference. No per-shard FP scope. |
| 4 fdr-multiple-testing | 16 / 20 (0.80) | 0.95 | 0 (selected ⊆ drifting set; e-BH FDR-controls FP at q-level) | N/A | drift d=0.45 over 30 windows for k ∈ {1, 3, 5, 8} shards should yield e-values well above the e-BH threshold by terminal for any q ∈ {0.05, 0.10, 0.15, 0.20, 0.25}. Edge: q=0.05 with k=1 drifting (N=10) requires e_max ≥ N/q = 200 — boundary case; might fail. Floor 16/20 covers this. |
| 5 hierarchical-evalue | 12 / 20 (0.60) | 0.95 | N/A | 0.80 (pedagogical_property_met = `fleet_tick_at_first_fire < min(per_shard_first_fire_tick)` among detected) | R71 baseline (d=0.20, 5 shards, start=5): fleet@16, first per-shard@18 — fleet fires 2 windows ahead. Lower drift × smaller fleet may not reach fleet threshold by w=30 → detection floor lowered to 60%. Larger drift × small fleet may have per-shard fire first → pedagogical floor 80%. |
| 6 topology-spanning-common-mode | 16 / 20 (0.80) | 0.95 | N/A — attribution_correct directly encodes the cooling_zone discriminator; "FP" here is the count of non-cooling_zone candidates surfaced. Reported in matrix but NOT bound by an AC. | N/A | At max_hop=1, cooling_zone is 2 hops away (unreachable) — 4 variations (one per fired-set at hop=1) DO NOT detect. At max_hop ≥ 2, cooling_zone surfaces with member_count = |fired_set|. 4 × 4 = 16 detection-positive variations. Singleton-cross-rack case (`{sh-00, sh-03}`) at hop≥2 yields cz with member_count=2 = |fired_set| → attribution-correct. |

**Why no per-variation hard expectations:** R71 MAJOR-1 + MAJOR-2 (REINFORCED 2026-05-20 R71 EMPIRICAL-PREMISE-VERIFICATION sub-variant 5) demonstrated that pre-authored expected values for specific parameter combinations create self-confirming tests that hide real engine drift. The aggregate floors above are robust to engine improvements (which INCREASE detection rate) AND surface engine regressions (which lower detection rate below floor).

### 2.4 Per-type detection / attribution / FP / pedagogical predicates

The saturation runner computes these predicates from per-variation engine output. The matrix.json records the predicate VALUES; the runner does NOT short-circuit when a predicate fails.

#### Type 1 sdc-drift

For each variation: 10 shards (`shard-00`..`shard-09`), 30 windows, σ²=1, μ=0, alpha=5e-3, threshold = 1/alpha = 200. Drift `d` added to draws for `target_shard_id` from `drift_start_window` onward, additive linear ramp `d * (w - drift_start_window + 1)`. Seeded LCG per variation: `seed = 466016 ^ variation_idx`.

- `detected = terminal_states[target_shard_id].M ≥ 200`
- `attribution_correct = detected && (count of shards with M ≥ 200) === 1 && target_shard_id is the firing shard`
- `detection_window_index = first w where states[target_shard_id].M ≥ 200; null if not detected`
- `false_positive_count = (count of shards with terminal M ≥ 200) - (detected ? 1 : 0)`
- `pedagogical_property_met = null`

#### Type 2 common-mode-rack

Fixed topology: 2 racks + 6 gpu_shards (rack-A: shards 00/01/02; rack-B: shards 03/04/05; edges `rack-X contains shard-NN`). Variation: which rack is the target (defining the fired_set) + at what window the attribution call fires. Single attributeCommonMode call at `attribution_window`; default opts (max_hop=1, min_member=2, default candidate_kinds).

- `detected = candidates.length ≥ 1`
- `attribution_correct = detected && candidates.some(c => c.shared_node_id === target_rack && member_shard_ids deepEqual fired_set sorted)`
- `detection_window_index = attribution_window if detected, else null`
- `false_positive_count = (count of candidates with shared_node_id !== target_rack)` for detected variations; null otherwise
- `pedagogical_property_met = null`

#### Type 3 event-conditional

Fixed setup: single shard; 5 windows; DsEventConsumer + createFreezeHookFromDsEvents wired with `activation_window_seconds = 300`, stub setTimeout (no auto-cancel). Variation: event_class string + (event_ts_offset_s, sample_ts_offset_s) tuple. The factory's "absorbed" predicate is: `update(current, obs, undefined) === current` (reference equality — residual returned unchanged). Per the freeze-hook contract (`engine/events/freeze-hook.ts:48` semantics; verified at session entry by direct read), when freeze is active AND no baselineCell is provided, the activator returns the existing residual without absorbing the observation.

- `detected = state_after_event.active === true`
- `attribution_correct = detected && (activator.update(initialResidual, obs, undefined) === initialResidual)` — reference-equality semantics confirmed
- `detection_window_index = post_event_window_index if detected, else null`
- `false_positive_count = null` — no per-shard scope
- `pedagogical_property_met = null`

#### Type 4 fdr-multiple-testing

Fixed setup: 10 shards, 30 windows, alpha=5e-3, threshold=200. Variation: which first `drifting_shard_count` shards carry sustained drift (`d=0.45` from `drift_start=4`) + the e-BH qLevel. Terminal e-BH runs on `state.M` per shard with the variation's qLevel.

- `detected = fdr_K ≥ 1` (i.e., e-BH selected at least one shard)
- `attribution_correct = detected && fdr_selected_indices is a subset of [0..drifting_shard_count-1]` (no false positive shards selected)
- `detection_window_index = first w where ≥ 1 drifting shard's M ≥ 200; null if all stay below`
- `false_positive_count = |fdr_selected_indices \ [0..drifting_shard_count-1]|`
- `pedagogical_property_met = null`

#### Type 5 hierarchical-evalue

Fixed setup: 30 windows, alpha=5e-3, threshold=200, fleet_alpha=0.05, `log_threshold = log(1/0.05) = log(20) ≈ 2.9957`. Variation: shard count + (drift_per_window, drift_start_window). All shards carry the same uniform additive drift from drift_start onward. Per-window: combineAverage(per-shard log(M)) → log_fleet_e → updateFleetEProcessState.

- `detected = terminal_fleet_state.fired === true`
- `attribution_correct = detected` (fleet detection IS the attribution: the system correctly identified fleet-level drift)
- `detection_window_index = terminal_fleet_state.tick_at_first_fire if detected, else null`
- `false_positive_count = null`
- `pedagogical_property_met = detected && (terminal_fleet_state.tick_at_first_fire < earliest_per_shard_first_fire_tick)` where `earliest_per_shard_first_fire_tick = min over shards of (first w where state.M ≥ 200, or +∞ if never)`. If no per-shard ever fires AND fleet fires, `earliest = +∞ > tick_at_first_fire` so the predicate is TRUE. If fleet doesn't fire, predicate is null (not counted).

#### Type 6 topology-spanning-common-mode

Fixed topology: 6 gpu_shards + 2 racks + 1 cooling_zone (cz-1 contains rack-A + rack-B; racks contain their shards). Variation: which shards are in the fired_set + `max_hop_distance`. Default opts otherwise (min_member=2, default candidate_kinds = `['psu', 'rack', 'cooling_zone']`).

- `detected = candidates.some(c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1')`
- `attribution_correct = detected && (the cz-1 candidate's member_count === fired_set.length)` — engine surfaces the cooling-zone-level cluster-spanning property
- `detection_window_index = single attribution window (fixed at w=3) if detected, else null`
- `false_positive_count = null` — per § 2.3, multi-candidate emission is engine design (R71 MAJOR-2 lesson); not counted as "false positive." However, the matrix reports `non_cz_candidate_count` in `raw_terminal` for transparency.
- `pedagogical_property_met = null`

### 2.5 The R72-saturation-matrix.md format (human-readable summary)

The .md output is a derived view of the .json — same data, different rendering. The Implementer renders it deterministically from the same matrix object that produced the .json so they cannot drift.

Sections (in order; literal):
1. `# Tessera R72 — coverage saturation matrix` heading
2. `## Summary` — one-line per-type summary table: `| Type | detect | attrib | FP-max | pedagogical |`
3. `## Totals` — `| Total variations | Total detected | Total attribution-correct |`
4. `## Per-type details` — for each of the 6 types, a subsection containing:
   - Type heading: `### N. <type-name>`
   - Description paragraph
   - Variation table: `| idx | params | detected | attrib-correct | detection-window | FP-count | pedagogical |` — 20 rows
5. `## Method` — short paragraph: matrix generated by `tools/coverage-saturation.ts`; seeded LCG; idempotent regeneration; full machine-readable form at `R72-saturation-matrix.json`

### 2.6 README.md Coverage section (≤ 30 lines)

Append to `README.md` at end-of-file (after the Quick demo + dashboard sections; preserves R70/R71 content). Contains:
- `## Coverage` heading
- One-paragraph framing: "Tessera R72 validates the engine against 6 failure types × 20 parameter variations = 120 cases. Generate the matrix with `pnpm coverage`; see `coordination/coverage/R72-saturation-matrix.md` for the human-readable summary."
- Headline metrics summary (mirrors matrix.md § Summary section keys; rendered as a 6-row Markdown table). The README content is STATIC text, not regenerated by the build tool. The Implementer authors the README section by copying the values from the matrix.json produced at chore-A.

---

## § 3. Per-file pseudocode

### 3.1 `tools/coverage-saturation.ts` (NEW)

```typescript
// tools/coverage-saturation.ts — Tessera R72 coverage saturation runner.
//
// Generates the 6×20 coverage matrix by running the real Tessera engine
// across 120 parameter variations. Deterministic (seeded LCG); idempotent.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.

// ── Engine imports (.js extension; matches R70/R71 convention) ──
import { freshBettingState, updateBettingState } from '../engine/detectors/betting-e-process.js';
import { attributeCommonMode, type FiredShardEvent } from '../engine/topology/common-mode-attribution.js';
import { DsEventConsumer } from '../engine/ds-integration/event-consumer.js';
import { createFreezeHookFromDsEvents } from '../engine/ds-integration/freeze-hook-factory.js';
import { initialPerShardResidual } from '../engine/per-shard/warm-start.js';
import { eBenjaminiHochberg } from '../engine/fleet/e-bh.js';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState } from '../engine/fleet/combine.js';
import type { TopologySnapshot, TopologyNode, TopologyEdge } from '../engine/types/verdict.js';
import type { ExtendedSampleObservation } from '../engine/per-shard/runtime.js';
import type { DeployEventPayload } from '../engine/ds-integration/event-contract.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public types ──
export type FailureTypeName =
  | 'sdc-drift'
  | 'common-mode-rack'
  | 'event-conditional'
  | 'fdr-multiple-testing'
  | 'hierarchical-evalue'
  | 'topology-spanning-common-mode';

export const FAILURE_TYPE_NAMES: ReadonlyArray<FailureTypeName> = [
  'sdc-drift',
  'common-mode-rack',
  'event-conditional',
  'fdr-multiple-testing',
  'hierarchical-evalue',
  'topology-spanning-common-mode',
];

export interface SaturationResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_variations: 120;
  total_detected: number;
  total_attribution_correct: number;
}

export interface SaturationOpts { readonly _reserved?: never; }

// ── Constants (Tessera-original; not from R70/R71) ──
const SCENARIO_SEED_PREFIX = 0x71C00; // 466016 decimal — recorded in matrix JSON for reproducibility audit
const SHARD_COUNT_DEFAULT = 10;
const WINDOW_COUNT_DEFAULT = 30;
const DEMO_ALPHA = 5e-3;
const DEMO_THRESHOLD = 1 / DEMO_ALPHA;  // 200
const FLEET_ALPHA = 0.05;
const LOG_FLEET_THRESHOLD = Math.log(1 / FLEET_ALPHA);

// LCG + Gaussian primitives — re-implemented (NOT imported from tools/build-canned-demos.ts)
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

// ── Variation grids (exact literals; § 2.1 spec) ──
const TYPE1_TARGET_SHARDS = ['shard-01', 'shard-03', 'shard-04', 'shard-07'] as const;
const TYPE1_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.20, 10], [0.30, 8], [0.40, 6], [0.50, 5], [0.70, 4],
];
const TYPE2_RACK_SETS: ReadonlyArray<{ target_rack: 'rack-A' | 'rack-B'; fired_set: ReadonlyArray<string> }> = [
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01', 'shard-02'] },
  { target_rack: 'rack-A', fired_set: ['shard-00', 'shard-01'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04', 'shard-05'] },
  { target_rack: 'rack-B', fired_set: ['shard-03', 'shard-04'] },
];
const TYPE2_ATTRIBUTION_WINDOWS: ReadonlyArray<number> = [0, 1, 2, 3, 4];
const TYPE3_EVENT_CLASSES = ['firmware_push', 'deploy', 'config_change', 'rollback'] as const;
const TYPE3_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [10, 20], [50, 100], [100, 150], [200, 250], [290, 295],
];
const TYPE4_DRIFTING_COUNTS: ReadonlyArray<number> = [1, 3, 5, 8];
const TYPE4_QLEVELS: ReadonlyArray<number> = [0.05, 0.10, 0.15, 0.20, 0.25];
const TYPE5_SHARD_COUNTS: ReadonlyArray<number> = [5, 8, 10, 15];
const TYPE5_DRIFT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [0.10, 8], [0.13, 7], [0.16, 6], [0.20, 5], [0.25, 5],
];
const TYPE6_FIRED_SETS: ReadonlyArray<ReadonlyArray<string>> = [
  ['shard-00', 'shard-01', 'shard-03', 'shard-04'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04', 'shard-05'],
  ['shard-00', 'shard-03'],
  ['shard-00', 'shard-01', 'shard-02', 'shard-03'],
];
const TYPE6_MAX_HOPS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

// ── Internal types ──
interface Observation {
  detected: boolean;
  attribution_correct: boolean | null;
  detection_window_index: number | null;
  false_positive_count: number | null;
  pedagogical_property_met: boolean | null;
  raw_terminal: Record<string, unknown>;
}
interface VariationRow {
  variation_idx: number;
  params: Record<string, unknown>;
  observation: Observation;
}
interface TypeSummary {
  detection_rate: number;
  detected_count: number;
  attribution_accuracy: number | null;
  correct_count: number;
  max_false_positive_count: number | null;
  pedagogical_property_rate: number | null;
}
interface TypeBlock {
  type_name: FailureTypeName;
  description: string;
  primary_axis_label: string;
  secondary_axis_label: string;
  variations: VariationRow[];
  summary: TypeSummary;
}
interface CoverageMatrix {
  schema_version: 'tessera-coverage-v1';
  generated_with_seed_prefix: number;
  types: TypeBlock[];
  totals: {
    total_variations: 120;
    total_detected: number;
    total_attribution_correct: number;
  };
}

// ── Topology fixtures (shared across types 2, 6) ──
function build2RackTopology(): TopologySnapshot {
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  const edges: TopologyEdge[] = [
    { from: 'rack-A', to: 'shard-00', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-01', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-02', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-03', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-04', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-05', relationship: 'contains' },
  ];
  return { nodes, edges, fetched_at_ts: 1_700_000_000, source_id: 'tessera-r72-synthetic', source_version: 'v1' };
}

function build2RackCzTopology(): TopologySnapshot {
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'cz-1',     service_name: 'cz-1',     kind: 'cooling_zone' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  const edges: TopologyEdge[] = [
    { from: 'cz-1',   to: 'rack-A',   relationship: 'contains' },
    { from: 'cz-1',   to: 'rack-B',   relationship: 'contains' },
    { from: 'rack-A', to: 'shard-00', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-01', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-02', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-03', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-04', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-05', relationship: 'contains' },
  ];
  return { nodes, edges, fetched_at_ts: 1_700_000_000, source_id: 'tessera-r72-synthetic-cz', source_version: 'v1' };
}

// ── Variation runners ──
function runType1Variation(idx: number): VariationRow {
  const target_idx = Math.floor(idx / 5);
  const tuple_idx  = idx % 5;
  const target_shard_id = TYPE1_TARGET_SHARDS[target_idx];
  const [drift, drift_start] = TYPE1_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ idx);
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const target_pos = shardIds.indexOf(target_shard_id);
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;

  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (s === target_pos && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null && states[target_pos].M >= DEMO_THRESHOLD) {
      detection_window_index = w;
    }
  }
  const firedShardIds = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD);
  const detected = firedShardIds.includes(target_shard_id);
  const false_positive_count = firedShardIds.filter(id => id !== target_shard_id).length;
  const attribution_correct = detected
    ? (firedShardIds.length === 1 && firedShardIds[0] === target_shard_id)
    : null;
  return {
    variation_idx: idx,
    params: { target_shard_id, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        firing_shards: firedShardIds.slice().sort(),
        target_M: round6(states[target_pos].M),
      },
    },
  };
}

function runType2Variation(idx: number): VariationRow {
  const rack_idx = Math.floor(idx / 5);
  const win_idx  = idx % 5;
  const { target_rack, fired_set } = TYPE2_RACK_SETS[rack_idx];
  const attribution_window = TYPE2_ATTRIBUTION_WINDOWS[win_idx];
  const snapshot = build2RackTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t2-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx },
  });
  const detected = result.candidates.length >= 1;
  const target_candidate = result.candidates.find(c => c.shared_node_id === target_rack);
  const attribution_correct = detected
    ? (target_candidate !== undefined &&
       [...target_candidate.member_shard_ids].sort().join(',') === [...fired_set].sort().join(','))
    : null;
  const false_positive_count = detected
    ? result.candidates.filter(c => c.shared_node_id !== target_rack).length
    : null;
  return {
    variation_idx: idx,
    params: { target_rack, fired_set: [...fired_set], attribution_window },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? attribution_window : null,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        candidates: result.candidates.map(c => ({
          shared_node_id: c.shared_node_id,
          shared_node_kind: c.shared_node_kind,
          member_count: c.member_count,
        })),
      },
    },
  };
}

function runType3Variation(idx: number): VariationRow {
  const class_idx = Math.floor(idx / 5);
  const off_idx   = idx % 5;
  const event_class = TYPE3_EVENT_CLASSES[class_idx];
  const [event_offset_s, sample_offset_s] = TYPE3_OFFSETS[off_idx];
  const baseTs = 1_700_000_000;
  const consumer = new DsEventConsumer({ port: 0 });
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: () => baseTs + event_offset_s,
  });
  const payload: DeployEventPayload = {
    event_id: `evt-r72-t3-v${idx}`,
    event_class,
    event_ts: baseTs + event_offset_s,
  };
  consumer.emit('activate', payload);
  const stateAfter = activator.getState();
  const detected = stateAfter.active === true;
  let attribution_correct: boolean | null = null;
  if (detected) {
    const residual = initialPerShardResidual();
    const obs: ExtendedSampleObservation = {
      observedAt: (baseTs + sample_offset_s) * 1000,
      residualSeedHash: `r72-t3-v${idx}`,
      sampleVector: [0.5, 0.4, 0.3],
    };
    const result = activator.update(residual, obs, undefined);
    attribution_correct = (result === residual);
  }
  activator.dispose();
  return {
    variation_idx: idx,
    params: { event_class, event_ts_offset_s: event_offset_s, sample_ts_offset_s: sample_offset_s },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 1 : null, // event at "window 0"; freeze observed at "window 1"
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        freeze_active: stateAfter.active,
      },
    },
  };
}

function runType4Variation(idx: number): VariationRow {
  const cnt_idx = Math.floor(idx / 5);
  const q_idx   = idx % 5;
  const drifting_count = TYPE4_DRIFTING_COUNTS[cnt_idx];
  const qLevel = TYPE4_QLEVELS[q_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x400 + idx)); // distinct seed namespace from type 1
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const drifting_indices = Array.from({ length: drifting_count }, (_, i) => i);
  const drift = 0.45;
  const drift_start = 4;
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (drifting_indices.includes(s) && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null) {
      for (const di of drifting_indices) {
        if (states[di].M >= DEMO_THRESHOLD) { detection_window_index = w; break; }
      }
    }
  }
  const terminalEValues = states.map(st => st.M);
  const fdrResult = eBenjaminiHochberg(terminalEValues, qLevel);
  const selected_indices = [...fdrResult.selected].sort((a, b) => a - b);
  const detected = fdrResult.K >= 1;
  const false_positives = selected_indices.filter(i => !drifting_indices.includes(i));
  const attribution_correct = detected ? false_positives.length === 0 : null;
  return {
    variation_idx: idx,
    params: { drifting_shard_count: drifting_count, drifting_indices, qLevel },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count: detected ? false_positives.length : null,
      pedagogical_property_met: null,
      raw_terminal: {
        fdr_K: fdrResult.K,
        fdr_selected_indices: selected_indices,
        firing_shards: shardIds.filter((_, i) => states[i].M >= DEMO_THRESHOLD),
      },
    },
  };
}

function runType5Variation(idx: number): VariationRow {
  const cnt_idx  = Math.floor(idx / 5);
  const tuple_idx = idx % 5;
  const shard_count = TYPE5_SHARD_COUNTS[cnt_idx];
  const [drift, drift_start] = TYPE5_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x800 + idx));
  const shardIds = Array.from({ length: shard_count }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const fleetState = freshFleetEProcessState();
  const perShardFirstFireTick: Array<number | null> = shardIds.map(() => null);
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < shard_count; s++) {
      let x = boxMullerGaussian(rng);
      if (w >= drift_start) x += drift * (w - drift_start + 1);
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
      if (perShardFirstFireTick[s] === null && states[s].M >= DEMO_THRESHOLD) {
        perShardFirstFireTick[s] = w;
      }
    }
    const logE = states.map(st => Math.log(Math.max(st.M, 1e-12)));
    const combineResult = combineAverage(logE);
    updateFleetEProcessState(fleetState, combineResult.log_fleet_e, LOG_FLEET_THRESHOLD);
  }
  const detected = fleetState.fired === true;
  const attribution_correct = detected ? true : null;
  const earliest_per_shard_tick = perShardFirstFireTick
    .filter((t): t is number => t !== null)
    .reduce((m, t) => Math.min(m, t), Number.POSITIVE_INFINITY);
  const pedagogical_property_met = detected
    ? (fleetState.tick_at_first_fire !== null && fleetState.tick_at_first_fire < earliest_per_shard_tick)
    : null;
  return {
    variation_idx: idx,
    params: { shard_count, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: fleetState.tick_at_first_fire,
      false_positive_count: null,
      pedagogical_property_met,
      raw_terminal: {
        fleet_fired: fleetState.fired,
        fleet_tick_at_first_fire: fleetState.tick_at_first_fire,
        per_shard_first_fire_tick: perShardFirstFireTick,
        earliest_per_shard_tick: earliest_per_shard_tick === Number.POSITIVE_INFINITY ? null : earliest_per_shard_tick,
      },
    },
  };
}

function runType6Variation(idx: number): VariationRow {
  const set_idx = Math.floor(idx / 5);
  const hop_idx = idx % 5;
  const fired_set = TYPE6_FIRED_SETS[set_idx];
  const max_hop = TYPE6_MAX_HOPS[hop_idx];
  const snapshot = build2RackCzTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t6-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx, max_hop_distance: max_hop },
  });
  const cz_candidate = result.candidates.find(c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1');
  const detected = cz_candidate !== undefined;
  const attribution_correct = detected
    ? (cz_candidate.member_count === fired_set.length)
    : null;
  const non_cz_count = result.candidates.filter(c => c.shared_node_kind !== 'cooling_zone').length;
  return {
    variation_idx: idx,
    params: { fired_set: [...fired_set], max_hop_distance: max_hop },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 3 : null, // fixed attribution window (cosmetic)
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        non_cz_candidate_count: non_cz_count,
        cz_member_count: cz_candidate?.member_count ?? null,
      },
    },
  };
}

// ── Aggregation ──
function summarizeType(type_name: FailureTypeName, rows: VariationRow[]): TypeSummary {
  const detected_rows = rows.filter(r => r.observation.detected);
  const correct_rows = detected_rows.filter(r => r.observation.attribution_correct === true);
  const fp_values = detected_rows
    .map(r => r.observation.false_positive_count)
    .filter((x): x is number => x !== null);
  const max_fp = fp_values.length > 0 ? Math.max(...fp_values) : null;
  let pedagogical_rate: number | null = null;
  if (type_name === 'hierarchical-evalue') {
    const ped_rows = detected_rows.filter(r => r.observation.pedagogical_property_met === true);
    pedagogical_rate = detected_rows.length > 0 ? ped_rows.length / detected_rows.length : null;
  }
  return {
    detection_rate: detected_rows.length / 20,
    detected_count: detected_rows.length,
    attribution_accuracy: detected_rows.length > 0 ? correct_rows.length / detected_rows.length : null,
    correct_count: correct_rows.length,
    max_false_positive_count: max_fp,
    pedagogical_property_rate: pedagogical_rate,
  };
}

function buildType(type_name: FailureTypeName,
                   description: string,
                   primary_axis_label: string,
                   secondary_axis_label: string,
                   runner: (idx: number) => VariationRow): TypeBlock {
  const variations: VariationRow[] = [];
  for (let i = 0; i < 20; i++) variations.push(runner(i));
  return {
    type_name,
    description,
    primary_axis_label,
    secondary_axis_label,
    variations,
    summary: summarizeType(type_name, variations),
  };
}

function buildCoverageMatrix(): CoverageMatrix {
  const types: TypeBlock[] = [
    buildType('sdc-drift',
      'Single-shard SDC: linear additive drift on one targeted shard within a 10-shard, 30-window fleet under Family A betting e-process.',
      'target_shard_id', '(drift_per_window, drift_start_window)',
      runType1Variation),
    buildType('common-mode-rack',
      'Rack-localized common-mode: 2 or 3 shards co-fire on the same rack; default attribution opts (max_hop=1, min_member=2).',
      '(target_rack, fired_set)', 'attribution_window',
      runType2Variation),
    buildType('event-conditional',
      'DS deploy-event activates the freeze-hook; subsequent residual update returns the existing residual unchanged (absorbed=false).',
      'event_class', '(event_ts_offset_s, sample_ts_offset_s)',
      runType3Variation),
    buildType('fdr-multiple-testing',
      'e-Benjamini-Hochberg FDR control: K drifting shards in a 10-shard fleet; e-BH selects under qLevel.',
      'drifting_shard_count', 'qLevel',
      runType4Variation),
    buildType('hierarchical-evalue',
      'Hierarchical e-value combination via combineAverage; small uniform drift across all shards; fleet wealth crosses log(1/0.05).',
      'shard_count', '(drift_per_window, drift_start_window)',
      runType5Variation),
    buildType('topology-spanning-common-mode',
      'Cross-rack common-mode: BFS over cooling-zone-spanning topology; max_hop_distance varies to expose the 1-hop / 2-hop reachability boundary.',
      'fired_set', 'max_hop_distance',
      runType6Variation),
  ];
  const total_detected = types.reduce((acc, t) => acc + t.summary.detected_count, 0);
  const total_correct = types.reduce((acc, t) => acc + t.summary.correct_count, 0);
  return {
    schema_version: 'tessera-coverage-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    types,
    totals: {
      total_variations: 120,
      total_detected,
      total_attribution_correct: total_correct,
    },
  };
}

// ── Serialization ──
function serializeMatrixJson(matrix: CoverageMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

function renderMatrixMd(matrix: CoverageMatrix): string {
  const lines: string[] = [];
  lines.push('# Tessera R72 — coverage saturation matrix');
  lines.push('');
  lines.push('Generated by `tools/coverage-saturation.ts`; deterministic; idempotent. Full machine-readable data: `R72-saturation-matrix.json`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Type | detected | attrib-correct | max-FP | pedagogical |');
  lines.push('|---|---|---|---|---|');
  for (const t of matrix.types) {
    const s = t.summary;
    const detect_cell = `${s.detected_count} / 20 (${(s.detection_rate * 100).toFixed(0)}%)`;
    const attrib_cell = s.attribution_accuracy === null
      ? 'n/a'
      : `${s.correct_count} / ${s.detected_count} (${(s.attribution_accuracy * 100).toFixed(0)}%)`;
    const fp_cell = s.max_false_positive_count === null ? 'n/a' : String(s.max_false_positive_count);
    const ped_cell = s.pedagogical_property_rate === null
      ? 'n/a'
      : `${(s.pedagogical_property_rate * 100).toFixed(0)}%`;
    lines.push(`| ${t.type_name} | ${detect_cell} | ${attrib_cell} | ${fp_cell} | ${ped_cell} |`);
  }
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push('| Total variations | Total detected | Total attribution-correct |');
  lines.push('|---|---|---|');
  lines.push(`| ${matrix.totals.total_variations} | ${matrix.totals.total_detected} | ${matrix.totals.total_attribution_correct} |`);
  lines.push('');
  lines.push('## Per-type details');
  lines.push('');
  for (let ti = 0; ti < matrix.types.length; ti++) {
    const t = matrix.types[ti];
    lines.push(`### ${ti + 1}. ${t.type_name}`);
    lines.push('');
    lines.push(t.description);
    lines.push('');
    lines.push(`Primary axis: \`${t.primary_axis_label}\`. Secondary axis: \`${t.secondary_axis_label}\`.`);
    lines.push('');
    lines.push('| idx | params | detected | attrib-correct | det-window | FP-count | pedagogical |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const v of t.variations) {
      const o = v.observation;
      const params_cell = JSON.stringify(v.params);
      const det_cell = o.detected ? 'yes' : 'no';
      const attrib_cell = o.attribution_correct === null ? 'n/a' : (o.attribution_correct ? 'yes' : 'no');
      const win_cell = o.detection_window_index === null ? 'n/a' : String(o.detection_window_index);
      const fp_cell = o.false_positive_count === null ? 'n/a' : String(o.false_positive_count);
      const ped_cell = o.pedagogical_property_met === null ? 'n/a' : (o.pedagogical_property_met ? 'yes' : 'no');
      lines.push(`| ${v.variation_idx} | \`${params_cell.replace(/\|/g, '\\|')}\` | ${det_cell} | ${attrib_cell} | ${win_cell} | ${fp_cell} | ${ped_cell} |`);
    }
    lines.push('');
  }
  lines.push('## Method');
  lines.push('');
  lines.push('Each variation is a deterministic engine run seeded by `(SCENARIO_SEED_PREFIX ^ variation_idx)` (plus per-type-namespace offsets for types 4 and 5 to prevent cross-type seed collisions). The runner imports engine surfaces by `.js` extension (matches existing `tools/` convention); no engine modifications; no new dependencies. Re-running `pnpm coverage` produces byte-identical output.');
  lines.push('');
  return lines.join('\n');
}

// ── Public entry point ──
export function runSaturationCoverage(_opts?: SaturationOpts): SaturationResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coordination', 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const matrix = buildCoverageMatrix();
  const jsonStr = serializeMatrixJson(matrix);
  const mdStr = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R72-saturation-matrix.json');
  const mdPath = path.join(coverageDir, 'R72-saturation-matrix.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return {
    matrix_json_path: jsonPath,
    matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_variations: 120,
    total_detected: matrix.totals.total_detected,
    total_attribution_correct: matrix.totals.total_attribution_correct,
  };
}

// ── CLI guard (matches tools/build-canned-demos.ts:1314 convention) ──
if (require.main === module) {
  const result = runSaturationCoverage();
  process.stdout.write(
    `Built coverage matrix: ${result.total_detected} / ${result.total_variations} detected ` +
    `(${result.total_attribution_correct} attribution-correct).\n` +
    `JSON: ${path.relative(process.cwd(), result.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), result.matrix_md_path)}\n`,
  );
  process.exit(0);
}
```

**Note on `FiredShardEvent.shard_node_id`:** the engine's `FiredShardEvent` type at `engine/topology/common-mode-attribution.ts:71-77` (verified at session entry) uses field name `shard_node_id` for the fired shard's node ID. The R71 pattern at `tools/build-canned-demos.ts:317-321` uses the same convention. R72 uses the same.

### 3.2 `package.json` modifications

Add two scripts; preserve all existing entries verbatim:

```jsonc
{
  "scripts": {
    "build": "tsc",
    "predemo": "tsc -p tsconfig.test.json",
    "demo": "node tools/demo-scenario.js",
    "prebuild:demos": "tsc -p tsconfig.test.json",
    "build:demos": "node tools/build-canned-demos.js",
    "prebuild:coverage": "tsc -p tsconfig.test.json",
    "coverage": "node tools/coverage-saturation.js",
    "pretest": "tsc -p tsconfig.test.json",
    "test": "node --test test/*.test.js",
    "typecheck": "tsc -p tsconfig.test.json --noEmit"
  }
}
```

**Single change:** add `prebuild:coverage` + `coverage` entries (2 keys). Position: between `build:demos` and `pretest`. Implementer preserves all other entries byte-identical. The pre-emit grilling for this section: no other scripts may be removed/renamed/modified.

### 3.3 `test/q72-coverage-saturation.test.ts` pseudocode (NEW)

```typescript
// test/q72-coverage-saturation.test.ts — R72 runtime ACs.

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  runSaturationCoverage,
  FAILURE_TYPE_NAMES,
  type FailureTypeName,
} from '../tools/coverage-saturation.js';

const COVERAGE_DIR = path.resolve(__dirname, '..', 'coordination', 'coverage');
const JSON_PATH = path.join(COVERAGE_DIR, 'R72-saturation-matrix.json');
const MD_PATH = path.join(COVERAGE_DIR, 'R72-saturation-matrix.md');

interface VariationRow {
  variation_idx: number;
  params: Record<string, unknown>;
  observation: {
    detected: boolean;
    attribution_correct: boolean | null;
    detection_window_index: number | null;
    false_positive_count: number | null;
    pedagogical_property_met: boolean | null;
    raw_terminal: Record<string, unknown>;
  };
}
interface TypeBlock {
  type_name: FailureTypeName;
  description: string;
  primary_axis_label: string;
  secondary_axis_label: string;
  variations: VariationRow[];
  summary: {
    detection_rate: number;
    detected_count: number;
    attribution_accuracy: number | null;
    correct_count: number;
    max_false_positive_count: number | null;
    pedagogical_property_rate: number | null;
  };
}
interface CoverageMatrix {
  schema_version: 'tessera-coverage-v1';
  generated_with_seed_prefix: number;
  types: TypeBlock[];
  totals: { total_variations: 120; total_detected: number; total_attribution_correct: number };
}

function loadCommittedMatrix(): CoverageMatrix {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw) as CoverageMatrix;
}

// AC-R72-1: matrix.json file exists at the canonical path.
test('AC-R72-1: matrix.json file exists at coordination/coverage/R72-saturation-matrix.json', () => {
  assert.strictEqual(fs.existsSync(JSON_PATH), true,
    `Expected matrix JSON at ${JSON_PATH}`);
});

// AC-R72-2: matrix.json schema_version is 'tessera-coverage-v1'.
test('AC-R72-2: matrix.json schema_version is "tessera-coverage-v1"', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.schema_version, 'tessera-coverage-v1');
});

// AC-R72-3: matrix.json totals.total_variations === 120.
test('AC-R72-3: matrix.json totals.total_variations === 120', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.totals.total_variations, 120);
});

// AC-R72-4: matrix.json types[] has 6 entries in canonical order.
test('AC-R72-4: matrix.json types[] has 6 entries in canonical order', () => {
  const m = loadCommittedMatrix();
  assert.strictEqual(m.types.length, 6);
  assert.deepStrictEqual(m.types.map(t => t.type_name), FAILURE_TYPE_NAMES);
});

// AC-R72-5: every type has exactly 20 variations with variation_idx 0..19.
test('AC-R72-5: every type has exactly 20 variations with variation_idx 0..19', () => {
  const m = loadCommittedMatrix();
  for (const t of m.types) {
    assert.strictEqual(t.variations.length, 20, `Type ${t.type_name} expected 20 variations`);
    for (let i = 0; i < 20; i++) {
      assert.strictEqual(t.variations[i].variation_idx, i,
        `Type ${t.type_name} variation[${i}].variation_idx !== ${i}`);
    }
  }
});

// AC-R72-6: sum of per-type detected_count === totals.total_detected.
test('AC-R72-6: sum of per-type detected_count === totals.total_detected', () => {
  const m = loadCommittedMatrix();
  const sum = m.types.reduce((acc, t) => acc + t.summary.detected_count, 0);
  assert.strictEqual(sum, m.totals.total_detected);
});

// AC-R72-7: sum of per-type correct_count === totals.total_attribution_correct.
test('AC-R72-7: sum of per-type correct_count === totals.total_attribution_correct', () => {
  const m = loadCommittedMatrix();
  const sum = m.types.reduce((acc, t) => acc + t.summary.correct_count, 0);
  assert.strictEqual(sum, m.totals.total_attribution_correct);
});

// Per-type detection rate floors (§ 2.3).
const DETECTION_FLOORS: Record<FailureTypeName, number> = {
  'sdc-drift':                     16,
  'common-mode-rack':              20,
  'event-conditional':             20,
  'fdr-multiple-testing':          16,
  'hierarchical-evalue':           12,
  'topology-spanning-common-mode': 16,
};

// AC-R72-8: sdc-drift detected_count >= 16.
test('AC-R72-8: sdc-drift detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'sdc-drift')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['sdc-drift'],
    `sdc-drift detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-9: common-mode-rack detected_count >= 20.
test('AC-R72-9: common-mode-rack detected_count >= 20', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'common-mode-rack')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['common-mode-rack'],
    `common-mode-rack detected ${t.summary.detected_count} / 20; expected >= 20`);
});

// AC-R72-10: event-conditional detected_count >= 20.
test('AC-R72-10: event-conditional detected_count >= 20', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'event-conditional')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['event-conditional'],
    `event-conditional detected ${t.summary.detected_count} / 20; expected >= 20`);
});

// AC-R72-11: fdr-multiple-testing detected_count >= 16.
test('AC-R72-11: fdr-multiple-testing detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'fdr-multiple-testing')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['fdr-multiple-testing'],
    `fdr detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-12: hierarchical-evalue detected_count >= 12.
test('AC-R72-12: hierarchical-evalue detected_count >= 12', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'hierarchical-evalue')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['hierarchical-evalue'],
    `hierarchical detected ${t.summary.detected_count} / 20; expected >= 12`);
});

// AC-R72-13: topology-spanning-common-mode detected_count >= 16.
test('AC-R72-13: topology-spanning-common-mode detected_count >= 16', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'topology-spanning-common-mode')!;
  assert.ok(t.summary.detected_count >= DETECTION_FLOORS['topology-spanning-common-mode'],
    `topology-spanning detected ${t.summary.detected_count} / 20; expected >= 16`);
});

// AC-R72-14: per-type attribution_accuracy >= 0.95 when detected_count > 0 (across all 6 types).
test('AC-R72-14: per-type attribution_accuracy >= 0.95 when any detection occurred', () => {
  const m = loadCommittedMatrix();
  for (const t of m.types) {
    if (t.summary.detected_count > 0) {
      assert.ok(t.summary.attribution_accuracy !== null && t.summary.attribution_accuracy >= 0.95,
        `Type ${t.type_name}: attribution_accuracy = ${t.summary.attribution_accuracy}; expected >= 0.95 (detected_count=${t.summary.detected_count})`);
    }
  }
});

// AC-R72-15: hierarchical-evalue pedagogical_property_rate >= 0.80 when detected_count > 0.
test('AC-R72-15: hierarchical-evalue pedagogical_property_rate >= 0.80 (fleet fires before per-shard)', () => {
  const m = loadCommittedMatrix();
  const t = m.types.find(x => x.type_name === 'hierarchical-evalue')!;
  if (t.summary.detected_count > 0) {
    assert.ok(t.summary.pedagogical_property_rate !== null && t.summary.pedagogical_property_rate >= 0.80,
      `hierarchical-evalue pedagogical_property_rate = ${t.summary.pedagogical_property_rate}; expected >= 0.80`);
  }
});

// AC-R72-16: max_false_positive_count <= 0 for sdc-drift, common-mode-rack, fdr-multiple-testing.
test('AC-R72-16: max_false_positive_count === 0 for sdc-drift / common-mode-rack / fdr-multiple-testing', () => {
  const m = loadCommittedMatrix();
  const types_with_fp_floor: FailureTypeName[] = ['sdc-drift', 'common-mode-rack', 'fdr-multiple-testing'];
  for (const name of types_with_fp_floor) {
    const t = m.types.find(x => x.type_name === name)!;
    if (t.summary.max_false_positive_count !== null) {
      assert.strictEqual(t.summary.max_false_positive_count, 0,
        `Type ${name}: max_false_positive_count = ${t.summary.max_false_positive_count}; expected 0`);
    }
  }
});

// AC-R72-17: matrix idempotency — programmatic re-run produces byte-identical JSON.
test('AC-R72-17: matrix idempotency — runSaturationCoverage twice produces byte-identical matrix.json', () => {
  const first = runSaturationCoverage();
  const buf1 = fs.readFileSync(first.matrix_json_path);
  const second = runSaturationCoverage();
  const buf2 = fs.readFileSync(second.matrix_json_path);
  assert.strictEqual(buf1.length, buf2.length, `Matrix JSON size diverged: ${buf1.length} -> ${buf2.length}`);
  assert.ok(buf1.equals(buf2), 'Matrix JSON bytes diverged across two runs (non-idempotent)');
});

// AC-R72-18: matrix.md exists and matches matrix.json totals.
test('AC-R72-18: matrix.md exists and references matrix.json totals correctly', () => {
  assert.strictEqual(fs.existsSync(MD_PATH), true,
    `Expected matrix MD at ${MD_PATH}`);
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const m = loadCommittedMatrix();
  assert.ok(md.includes(`| ${m.totals.total_variations} | ${m.totals.total_detected} | ${m.totals.total_attribution_correct} |`),
    'matrix.md Totals row does not match matrix.json totals');
  for (const t of m.types) {
    assert.ok(md.includes(`### ${m.types.indexOf(t) + 1}. ${t.type_name}`),
      `matrix.md missing heading "### N. ${t.type_name}"`);
  }
});

// AC-R72-19: anti-regression — R71 build artifact preserved.
test('AC-R72-19: R71 build-canned-demos SCENARIO_NAMES still exports 8 names (R71 anti-regression)', async () => {
  const r71 = await import('../tools/build-canned-demos.js');
  assert.strictEqual(Array.isArray(r71.SCENARIO_NAMES), true);
  assert.strictEqual(r71.SCENARIO_NAMES.length, 8);
});

// AC-R72-20: anti-regression — R70 demo-scenario surface preserved.
test('AC-R72-20: R70 demo-scenario SCENARIO_NAMES still exports 4 names (R70 anti-regression)', async () => {
  const r70 = await import('../tools/demo-scenario.js');
  assert.strictEqual(Array.isArray(r70.SCENARIO_NAMES), true);
  assert.strictEqual(r70.SCENARIO_NAMES.length, 4);
});
```

**Note on AC count:** 20 ACs total. AC-R72-1 through AC-R72-7 are structural shape ACs (matrix JSON well-formed). AC-R72-8 through AC-R72-13 are per-type detection-rate floors (one AC per failure type). AC-R72-14 binds the directive's "≥ 95% attribution accuracy" requirement. AC-R72-15 binds the hierarchical-evalue pedagogical property (closes the R71 MAJOR-1 narrative-vs-data gap structurally). AC-R72-16 binds the per-type FP-count floor where applicable. AC-R72-17 binds idempotency. AC-R72-18 binds matrix.md ↔ matrix.json consistency. AC-R72-19 and AC-R72-20 are anti-regression for R71 and R70.

### 3.4 README.md modification

Append the following at end-of-file (after the existing R70 + R71 sections; the Implementer adds this section without modifying any other README content):

```markdown
## Coverage

Tessera R72 validates the engine against 6 failure types × 20 parameter variations = 120 cases. Generate the matrix with:

```bash
pnpm coverage
```

See `coordination/coverage/R72-saturation-matrix.md` for the human-readable summary; `coordination/coverage/R72-saturation-matrix.json` is the machine-readable data. The matrix is deterministic — re-running produces byte-identical output.

| Type | Detection floor | Attribution floor |
|---|---|---|
| sdc-drift | 16 / 20 | ≥ 95% |
| common-mode-rack | 20 / 20 | ≥ 95% |
| event-conditional | 20 / 20 | ≥ 95% |
| fdr-multiple-testing | 16 / 20 | ≥ 95% |
| hierarchical-evalue | 12 / 20 | ≥ 95% (and ≥ 80% fleet-fires-before-per-shard) |
| topology-spanning-common-mode | 16 / 20 | ≥ 95% |
```

The README values DO NOT need to match the matrix's empirical observed values byte-for-byte (these are the spec floors, not the observed numbers). The Implementer authors the section verbatim from the spec.

### 3.5 `coordination/specs/Q-R72-EMPIRICAL.sh` pseudocode (chore-A pre-commit verification harness)

See § 11 for the executable script body.

---

## § 4. Acceptance criteria

Preamble paragraph: All 20 ACs above are committed-runtime-test attestations — each is verified by a `test()` invocation in `test/q72-coverage-saturation.test.ts` running under `node --test`. The empirical-verification harness `Q-R72-EMPIRICAL.sh` runs at chore-A pre-commit time (Rule 1 sub-class `empirical-command-attestation`) and verifies a distinct surface (tsc exit, test counts, file presence, anti-scope diff); it does NOT duplicate the ACs.

| # | Given / When / Then | Verification |
|---|---|---|
| AC-R72-1 | Given chore-A landed, when `fs.existsSync('coordination/coverage/R72-saturation-matrix.json')` runs, then it returns `true`. | test/q72-coverage-saturation.test.ts AC-R72-1 line. |
| AC-R72-2 | Given the matrix JSON is loaded, when its `schema_version` field is read, then it equals the literal string `'tessera-coverage-v1'`. | test/q72-coverage-saturation.test.ts AC-R72-2 line. |
| AC-R72-3 | Given the matrix JSON is loaded, when `totals.total_variations` is read, then it equals `120`. | test/q72-coverage-saturation.test.ts AC-R72-3 line. |
| AC-R72-4 | Given the matrix JSON is loaded, when `types[].type_name` is mapped, then the result is the exact 6-element array `['sdc-drift', 'common-mode-rack', 'event-conditional', 'fdr-multiple-testing', 'hierarchical-evalue', 'topology-spanning-common-mode']` (canonical order). | test/q72-coverage-saturation.test.ts AC-R72-4 line. |
| AC-R72-5 | Given the matrix JSON is loaded, when every `types[i].variations` array is inspected, then each has length exactly 20 AND each variation's `variation_idx` equals its position in the array (0..19). | test/q72-coverage-saturation.test.ts AC-R72-5 line. |
| AC-R72-6 | Given the matrix JSON, when summing `types[i].summary.detected_count`, then the sum equals `totals.total_detected`. | test/q72-coverage-saturation.test.ts AC-R72-6 line. |
| AC-R72-7 | Given the matrix JSON, when summing `types[i].summary.correct_count`, then the sum equals `totals.total_attribution_correct`. | test/q72-coverage-saturation.test.ts AC-R72-7 line. |
| AC-R72-8 | Given the matrix JSON, when `types[name='sdc-drift'].summary.detected_count` is read, then it is `≥ 16`. | test/q72-coverage-saturation.test.ts AC-R72-8 line. |
| AC-R72-9 | Given the matrix JSON, when `types[name='common-mode-rack'].summary.detected_count` is read, then it is `≥ 20`. | test/q72-coverage-saturation.test.ts AC-R72-9 line. |
| AC-R72-10 | Given the matrix JSON, when `types[name='event-conditional'].summary.detected_count` is read, then it is `≥ 20`. | test/q72-coverage-saturation.test.ts AC-R72-10 line. |
| AC-R72-11 | Given the matrix JSON, when `types[name='fdr-multiple-testing'].summary.detected_count` is read, then it is `≥ 16`. | test/q72-coverage-saturation.test.ts AC-R72-11 line. |
| AC-R72-12 | Given the matrix JSON, when `types[name='hierarchical-evalue'].summary.detected_count` is read, then it is `≥ 12`. | test/q72-coverage-saturation.test.ts AC-R72-12 line. |
| AC-R72-13 | Given the matrix JSON, when `types[name='topology-spanning-common-mode'].summary.detected_count` is read, then it is `≥ 16`. | test/q72-coverage-saturation.test.ts AC-R72-13 line. |
| AC-R72-14 | Given the matrix JSON, when iterating each type with `detected_count > 0`, then its `summary.attribution_accuracy` is `≥ 0.95` and is non-null. | test/q72-coverage-saturation.test.ts AC-R72-14 line. |
| AC-R72-15 | Given the matrix JSON, when reading `types[name='hierarchical-evalue'].summary.pedagogical_property_rate` (if `detected_count > 0`), then it is `≥ 0.80` and is non-null. | test/q72-coverage-saturation.test.ts AC-R72-15 line. |
| AC-R72-16 | Given the matrix JSON, when reading `types[name ∈ {'sdc-drift', 'common-mode-rack', 'fdr-multiple-testing'}].summary.max_false_positive_count` (if non-null), then each equals `0`. | test/q72-coverage-saturation.test.ts AC-R72-16 line. |
| AC-R72-17 | Given `runSaturationCoverage()` runs twice in-process, when comparing the two resulting matrix.json byte streams, then they are byte-identical (length equal AND `Buffer.equals` returns true). | test/q72-coverage-saturation.test.ts AC-R72-17 line. |
| AC-R72-18 | Given chore-A landed, when `coordination/coverage/R72-saturation-matrix.md` is loaded, then it contains the exact totals row of the matrix.json AND contains `### N. <type-name>` headings for all 6 types in canonical order. | test/q72-coverage-saturation.test.ts AC-R72-18 line. |
| AC-R72-19 | Given chore-A landed, when `import('../tools/build-canned-demos.js')` runs, then `SCENARIO_NAMES.length === 8`. | test/q72-coverage-saturation.test.ts AC-R72-19 line. |
| AC-R72-20 | Given chore-A landed, when `import('../tools/demo-scenario.js')` runs, then `SCENARIO_NAMES.length === 4`. | test/q72-coverage-saturation.test.ts AC-R72-20 line. |

### 4.1 Branch-binding coverage (Rule 2 self-application — § 5.1 table)

Every load-bearing branch in `tools/coverage-saturation.ts` is bound by at least one AC. Branches enumerated:

| Branch site (file:line in pseudocode) | Covered by AC | How |
|---|---|---|
| `runType1Variation`: `if (s === target_pos && w >= drift_start)` (drift injection) | AC-R72-8 (detection floor 16/20 requires drift injection to fire ≥ 16 variations) | Detection floor cannot pass without drift code firing. |
| `runType1Variation`: detection_window_index null-check + assignment | AC-R72-5 (variation rows present); raw_terminal includes `firing_shards` | Verified via matrix structural shape. |
| `runType2Variation`: `attributeCommonMode` opts default-passthrough | AC-R72-9 (detection 20/20) | Default opts must reach engine. |
| `runType2Variation`: `attribution_correct` member_shard_ids equality check | AC-R72-14 (attribution accuracy ≥ 0.95) | Without matching, accuracy drops below floor. |
| `runType3Variation`: `if (detected)` gating residual update | AC-R72-10 (detection 20/20) + AC-R72-14 (attribution) | Both must hold across all 20 variations. |
| `runType3Variation`: `result === residual` reference-equality check | AC-R72-14 (attribution accuracy ≥ 0.95) | Reference-equality semantics must hold ≥ 19/20 to clear floor. |
| `runType4Variation`: `drifting_indices.includes(s)` drift injection | AC-R72-11 (detection 16/20) | Without drift code firing, ≥ 16 variations cannot fire e-BH selection. |
| `runType4Variation`: `false_positives.length === 0` attribution check | AC-R72-16 (max_false_positive_count === 0 for fdr) | Must hold across all detected variations. |
| `runType5Variation`: `if (w >= drift_start)` uniform drift injection | AC-R72-12 (detection 12/20) | Without drift, fleet does not fire. |
| `runType5Variation`: `tick_at_first_fire < earliest_per_shard_tick` pedagogical check | AC-R72-15 (pedagogical rate ≥ 0.80) | Must hold for ≥ 80% of detected variations. |
| `runType6Variation`: `c.shared_node_kind === 'cooling_zone'` candidate filter | AC-R72-13 (detection 16/20) | At max_hop=1, cooling_zone unreachable → 4 variations DO NOT detect. At max_hop≥2 → 16 DO detect → AC floor exactly 16. |
| `runType6Variation`: `cz_candidate.member_count === fired_set.length` attribution check | AC-R72-14 | Must hold among detected variations. |
| `summarizeType`: `detected_rows.length > 0` divide-by-zero guard for attribution_accuracy | AC-R72-9 + AC-R72-10 (force detection_count > 0 for type 2 + 3) AND AC-R72-14 (attribution accuracy non-null when detected_count > 0) | Branch exercised by every type with non-zero detection. |
| `summarizeType`: pedagogical-rate only-for-type-5 conditional | AC-R72-15 (binds only the hierarchical-evalue rate; null for others) | Conditional reached only via type-name match. |
| `renderMatrixMd`: Totals row template emission | AC-R72-18 (matrix.md Totals row matches matrix.json totals) | Template must emit the row correctly. |
| `runSaturationCoverage`: `fs.writeFileSync(jsonPath, ...)` + `fs.writeFileSync(mdPath, ...)` | AC-R72-1 + AC-R72-18 (both files exist) | Without writes, file existence ACs fail. |
| `runSaturationCoverage`: idempotency — `buildCoverageMatrix` returns deterministic structure given identical seeds | AC-R72-17 (byte-identical re-run) | Any non-determinism source (Date.now, Math.random, env-var dependence, key-order drift) breaks AC-R72-17. |

**Acknowledged non-load-bearing gaps:** the CLI `require.main === module` guard at the file tail is exercised by `pnpm coverage` invocation but is not directly bound by an AC (no AC asserts CLI output text). Rationale: the CLI is a thin wrapper around `runSaturationCoverage` which IS bound by AC-R72-1 + AC-R72-17 + AC-R72-18; the CLI's only added behavior is process.stdout.write + process.exit(0), neither of which carries production semantics. R71 had the same acknowledged gap (build-canned-demos.ts:1314).

### 4.2 Discriminating-assertion table (Rule 3 self-application)

| AC | Discriminating property | Discriminating mechanism |
|---|---|---|
| AC-R72-1 | `existsSync()` returns false if file is missing | `strictEqual(existsSync(path), true)` |
| AC-R72-2 | schema_version literal exact match | `strictEqual(m.schema_version, 'tessera-coverage-v1')` |
| AC-R72-3 | total_variations exact equality | `strictEqual(m.totals.total_variations, 120)` |
| AC-R72-4 | type-name order AND exact 6-element set | `deepStrictEqual(m.types.map(t => t.type_name), FAILURE_TYPE_NAMES)` — both order and content checked |
| AC-R72-5 | variations.length AND per-row variation_idx | nested `strictEqual` per type per row |
| AC-R72-6 | sum invariant (catches drift between per-type summaries and totals) | `strictEqual(sum, m.totals.total_detected)` |
| AC-R72-7 | same as AC-R72-6 for attribution | `strictEqual(sum, m.totals.total_attribution_correct)` |
| AC-R72-8 to AC-R72-13 | per-type detection floor | `assert.ok(detected_count >= floor)` |
| AC-R72-14 | per-type attribution_accuracy floor AND non-null | `assert.ok(t.summary.attribution_accuracy !== null && t.summary.attribution_accuracy >= 0.95)` |
| AC-R72-15 | pedagogical rate floor AND non-null (binds the R71 MAJOR-1 lesson structurally) | `assert.ok(t.summary.pedagogical_property_rate !== null && t.summary.pedagogical_property_rate >= 0.80)` |
| AC-R72-16 | max FP count exact zero for the 3 named types | `strictEqual(t.summary.max_false_positive_count, 0)` (when non-null) |
| AC-R72-17 | byte-level idempotency via `Buffer.equals` (not just `===` on length) | `assert.ok(buf1.equals(buf2))` |
| AC-R72-18 | matrix.md totals row LITERAL match + per-type heading presence | `md.includes(literal_totals_row)` + per-type heading `includes` check |
| AC-R72-19 | R71 anti-regression: SCENARIO_NAMES count exactly 8 | `strictEqual(r71.SCENARIO_NAMES.length, 8)` |
| AC-R72-20 | R70 anti-regression: SCENARIO_NAMES count exactly 4 | `strictEqual(r70.SCENARIO_NAMES.length, 4)` |

**Self-confirming-test analysis (Rule 3 sub-class):** No AC binds a value that is produced by the test itself. Every AC consumes either (a) a file on disk written by `runSaturationCoverage` (the production artifact), or (b) re-imports a sibling production module's exported constant (`SCENARIO_NAMES`). No AC re-implements engine logic in the test file.

---

## § 5. Anti-scope (allowed-set forward coverage — Rule 4 self-application)

### 5.1 ALLOWED_SET (enumerated at spec-emit; no in-spec expansion)

Paths permitted to appear in `git diff <ROUND_START_SHA>..HEAD --name-only` at any commit between the spec-triad SHA and chore-A:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R72-SPEC.md
coordination/specs/Q-R72-SPEC-AUDIT.md
coordination/specs/Q-R72-EMPIRICAL.sh
coordination/coverage/R72-saturation-matrix.json
coordination/coverage/R72-saturation-matrix.md
package.json
README.md
test/q72-coverage-saturation.test.ts
tools/coverage-saturation.ts
```

**Regex carve-out:** `^coordination/diagnostics/DIAGNOSTIC-R72-[a-z0-9-]+\.md$` (only fires if a halt condition triggers per § 6).

**Total: 11 enumerated paths + 1 regex carve-out.**

`ROUND_START_SHA` = the Architect's spec-triad commit SHA (captured via `git rev-parse HEAD` after spec triad lands and before Architect routing-block commit). Per CLAUDE-ARCHITECT REINFORCED 2026-05-17 R15 MINOR-1 + REINFORCED 2026-05-18 R23 MINOR-2.

### 5.2 Gitignore considerations (Rule 4 sub-class)

Verified at session entry against `.gitignore`:
- `*.js` is gitignored → `tools/coverage-saturation.js` and `test/q72-coverage-saturation.test.js` (compiled outputs) are NOT git-tracked. They DO NOT appear in `git diff --name-only`. They are NOT in ALLOWED_SET because they cannot appear in the diff.
- `coverage/` (root-level dir) is gitignored. My output path `coordination/coverage/` is at a DIFFERENT path (under `coordination/`) and is NOT covered by the root-level `coverage/` rule. `git ls-files coordination/coverage/ 2>/dev/null` is empty (directory doesn't exist pre-R72; will be created at chore-A; will become tracked when files are added).

### 5.3 Frozen surfaces (do NOT modify)

A1. NO new external dependencies (R68 anti-worm posture).
A2. NO modification of `engine/**/*.ts` (frozen post-Phase 3).
A3. NO modification of `tools/demo-scenario.ts` (R70 frozen).
A4. NO modification of `tools/build-canned-demos.ts` (R71 frozen).
A5. NO modification of `demos/demo.html` or `demos/scenarios/*.json` (R71 frozen).
A6. NO modification of carry-forward AC fail set tests (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14 — keep failing as carry-forward).
A7. NO modification of prior-round `coordination/specs/Q-RNN-SPEC.md` files (R01-R71 specs frozen).
A8. NO modification of CLAUDE-*.md REINFORCEMENTS sections (cross-role lessons preserved).
A9. NO modification of MEMORIAL-PHASE-1.md or MEMORIAL-PHASE-2.md (frozen phase shards).
A10. NO real-cluster work (Path B preserved per Phase 3 PRD).
A11. NO DS-repo modifications (W3-1 Option A preserved).
A12. NO `gh repo` operations.
A13. NO ALLOWED_SET self-expansion at chore-A (R36 MAJOR-2 NEVER violation).
A14. NO forward-protection / live-file-count / anti-scope-diff-against-prior-round-allowed-set AC patterns (R62 + R66 + R68 cumulative — 4th-instance avoidance per R71 precedent).
A15. NO chore-B step (R71 single-state precedent; R72 also single-state).

### 5.4 Acknowledged AC coverage gaps (Rule 5 self-application at spec-emit)

- The CLI `require.main === module` guard's `process.stdout.write` content is not bound by any AC. Rationale: § 4.1 acknowledged-gap entry; CLI carries no production semantics beyond invoking `runSaturationCoverage`.
- The `non_cz_candidate_count` field in type-6 `raw_terminal` is captured for transparency but is not bound by an AC. Rationale per § 2.3 type-6 row: R71 MAJOR-2 lesson — multi-candidate emission is intended engine design; counting non-cz candidates as "false positives" would replicate the R71 MAJOR-2 narrative-vs-engine-design contradiction. Reported in matrix for operator visibility.

---

## § 6. Halt conditions for Implementer (Rule 6 self-application)

10 halt conditions; on any trigger, write `coordination/diagnostics/DIAGNOSTIC-R72-<topic>.md` with ≥ 3 bounded options + set `STATUS: ESCALATE` in `coordination/NEXT-ROLE.md` + await operator disposition. NO silent workaround. NO DIAGNOSTIC-as-workaround (Rule 6 canonical landing).

### 6.1 Halt-trigger enumeration

1. **`Q-R72-EMPIRICAL.sh` non-zero exit at chore-A** for any reason other than a pre-documented two-state mismatch. R72 is single-state; there are no pre-documented two-state mismatches. Any non-zero exit is a halt.
2. **`pnpm exec tsc -p tsconfig.test.json` non-zero exit** at any point during chore-A. Halt + diagnose.
3. **Test baseline drift beyond R71 close other than R72 additions.** R71 close: tests=469 / pass=461 / fail=5 / skipped=3. R72 adds 20 new ACs (AC-R72-1 through AC-R72-20). Predicted: tests=489 / pass=481 / fail=5 / skipped=3 (5 carry-forward identity preserved: AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14). Any divergence beyond +20 pass → halt.
4. **Architectural decision requires DS-repo modification** (any change to `~/concord/deploysignal/`): halt + diagnose.
5. **Architectural decision requires new external dependencies** (any new entry under `dependencies` or `devDependencies` in `package.json`): halt + diagnose.
6. **R62 + R66 + R68 cumulative lesson — claim-then-walk + avoid round-evolution-fragile AC patterns.** Any spec AC that introduces forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns is a halt. R72 spec EXPLICITLY AVOIDS these patterns per § 5 + § 9 audit.
7. **R61-class architectural-reality discovery:** if during chore-A the Implementer discovers that an engine surface signature differs from what § 1.3 claims, OR an engine internal invariant is contradicted by the saturation runner's needs, halt + diagnose + ESCALATE.
8. **Per-type detection rate NOT MET** (any failure type's `detected_count` below its § 2.3 floor): substantive engine coverage gap. Halt + diagnose + ESCALATE per the round-scope directive halt #8 verbatim. The Implementer MUST NOT silently tune drift magnitudes outside the spec-prescribed ranges to force ACs into passing.
9. **Per-type attribution accuracy not ≥ 0.95** (when detection > 0): substantive engine attribution gap. Halt + diagnose + ESCALATE.
10. **Hierarchical-evalue pedagogical_property_rate not ≥ 0.80** (when detection > 0): the engine's fleet-before-per-shard property failed across the variation grid. Halt + diagnose + ESCALATE — but note: this binding closes the R71 MAJOR-1 narrative-vs-data gap, so a halt here may indicate either a real engine regression or a spec-prediction mis-calibration. Diagnostic should distinguish these.

### 6.2 TACTICAL AUTONOMY scope (Implementer may do without halt)

The Implementer MAY:
- Choose `.js` extension vs no-extension imports per R70/R71 precedent (default: `.js` per `tools/build-canned-demos.ts:11-26`).
- Adjust JSDoc wording, blank lines, import order, internal helper names — no semantic change.
- Choose variable names within the runner that don't appear in test assertion targets.
- Tune the SCENARIO_SEED_PREFIX literal IF AND ONLY IF every per-type detection floor remains met at the chosen seed. If a different prefix produces a higher detection rate, the Implementer documents the chosen value in the GREEN commit message AND records it as `generated_with_seed_prefix` in matrix.json (already required). The default `0x71C00` is the Architect's seed; tuning is permitted within TACTICAL AUTONOMY band `[0x71000, 0x720FF]` per identical methodology to R70's drift-magnitude band.

The Implementer MAY NOT (without halt + DIAGNOSTIC):
- Modify any `engine/**/*.ts` file (immediate halt #4-class trigger).
- Modify `tools/demo-scenario.ts` (R70 anti-scope; immediate trigger).
- Modify `tools/build-canned-demos.ts` (R71 anti-scope; immediate trigger).
- Modify any pre-R72 test file or any prior-round spec file (halt #6 / anti-scope A6/A7).
- Expand the ALLOWED_SET in-spec at chore-A (R36 MAJOR-2 NEVER violation).
- Introduce a chore-B step or any forward-protection / live-file-count / anti-scope-diff-against-prior-round AC pattern (halt #6 immediate trigger).
- Add an external dependency (halt #5).
- Open a DS-repo PR or modify any DS-repo file (halt #4).
- Add `fetch`, network access, or file-system operations OUTSIDE `coordination/coverage/` from inside `tools/coverage-saturation.ts` (anti-scope; halt-class).
- Skip the RED commit (R23 IMPL MINOR-1 TDD separate-RED-commit discipline).
- Cite spec-predicted values as observed in attestation (Rule 1 sub-class `empirical-command-attestation` violation).
- Tune the variation parameter grids in § 2.1 (the 4×5 variation grids are spec-prescribed; tuning is a halt + DIAGNOSTIC trigger). Only `SCENARIO_SEED_PREFIX` is within TACTICAL AUTONOMY.

### 6.3 Halt-trigger / pre-documented-outcome audit (R56 MINOR-1 reinforcement)

Spec-internal cross-check: for each predicted outcome in this spec, no halt trigger overlaps with the predicted state. R72 is single-state; the Architect predicts tsc exit 0, all binding commands PASS, all ACs PASS at chore-A. The halt triggers above all require a NEGATIVE outcome to fire. No carve-out needed.

---

## § 7. Cross-project rule disposition (Rule 7 Surface (a) — spec template gate)

| Rule | Disposition |
|---|---|
| 1 (`empirical-command-attestation` / `false-compliance-attestation`) | ACTIVE GATE — Q-R72-EMPIRICAL.sh; Implementer attestation in NEXT-ROLE.md MUST encode actual observed binding-command outputs verbatim, not Architect predictions. |
| 2 (`architect-branch-binding-coverage`) | ACTIVE GATE — § 4.1 branch-binding table. 1 acknowledged non-load-bearing gap (CLI guard). |
| 3 (`implementer-spec-test-assertion-coverage` / `self-confirming-test-design`) | ACTIVE GATE — § 4.2 discriminating-assertion table + self-confirming analysis. No AC re-implements engine logic in test code. |
| 4 (`anti-scope-allowed-set-forward-coverage`) | ACTIVE GATE — 11-path ALLOWED_SET + 1 regex carve-out; historical-only diff bounded by spec-triad SHA. No forward-protection patterns. |
| 5 (`rule-derivation-without-self-application`) | N/A at spec emit (R72 derives no new cross-project rules). |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | ACTIVE GATE — § 6 enumerates 10 halt conditions; no carve-out for any pre-documented failure path. Single-state spec. |
| 7 (`derived-rule-propagation-mechanism-required`) | ACTIVE GATE Surface (a) — this § 7. Surface (b) (pre-commit-rule-sweep.sh) and Surface (c) (cross-project memorial entry) N/A — no new rule derived this round. |

---

## § 8. Open questions

None — all resolved.

The directive's "Architect picks" leeway (which 6 failure types; which variation parameters; which detection minimums) is resolved exhaustively in this spec. § 2.1 fixes the 6 type names + variation grids; § 2.3 fixes per-type minimums; § 2.4 fixes per-type detection/attribution/FP/pedagogical predicates; § 3.1 fixes the runner pseudocode; § 4 fixes the 20 ACs. The Implementer has zero design decisions left — only TACTICAL AUTONOMY items in § 6.2.

---

## § 9. P3 ten-axis verification

**Correctness:** every AC predicate maps to a verifiable property of the matrix.json or matrix.md or the saturation runner's output. No AC binds an unverifiable claim. The saturation runner's per-variation predicates (§ 2.4) are mechanical functions of engine output (no Architect-pre-authored values).

**Completeness:** the directive's required outputs are all delivered: `tools/coverage-saturation.ts` (§ 3.1), coverage matrix JSON + Markdown (§ 2.2 + § 2.5), `package.json` script entries (§ 3.2), `README.md` Coverage section (§ 3.4), `test/q72-coverage-saturation.test.ts` (§ 3.3), `Q-R72-EMPIRICAL.sh` (§ 11), per-type detection rate ACs (AC-R72-8 to AC-R72-13), per-type attribution accuracy AC (AC-R72-14), deterministic-build AC (AC-R72-17), anti-regression ACs (AC-R72-19 + AC-R72-20). The 6 failure types match the directive's suggested list verbatim.

**Consistency:** § 2.1 type/variation list, § 2.3 minimums table, § 2.4 predicates, § 3.1 pseudocode, § 3.3 test pseudocode, § 4 AC table all reference the same 6 type names in the same order. § 2.3 detection floors match § 3.3 DETECTION_FLOORS constants match § 4 AC-R72-8 through AC-R72-13 thresholds. AC-R72-14 (≥ 0.95) matches § 2.3 attribution column. AC-R72-15 (≥ 0.80) matches § 2.3 pedagogical column.

**Clarity:** every prescriptive section names the file:line target or the exact literal value. No ambiguous language ("correctly", "appropriately", "as needed") appears in any AC.

**Coverage:** every load-bearing branch in `tools/coverage-saturation.ts` is bound by at least one AC (§ 4.1). Every claim in spec narrative is either (a) verifiable via grep/file-read at session-entry time (engine surface signatures in § 1.3) or (b) bound by an AC with a runtime check. No narrative claim asserts an empirical engine property without empirical or data-flow grounding (R71 MAJOR-1/MAJOR-2 lesson applied).

**Constraints:** all R72 directive halt conditions enumerated in § 6.1. Cross-project Rule 1-7 dispositions in § 7. Anti-scope frozen surfaces in § 5.3. Round-evolution-fragility avoidance in § 5.3 A14 (4th-instance avoidance event).

**Concurrency:** saturation runner is single-process, single-threaded Node code; no concurrent state access. Test file uses `node --test` default sequential test runner. No race conditions possible.

**Corner cases:**
- Type 1 lowest drift (d=0.20, target=shard-01 or shard-03 or shard-07): variation may not detect by w=30; matrix records `detected: false`; AC-R72-8 floor 16/20 accommodates 4 such failures.
- Type 2 attribution_window=0 (no windows elapsed): attributeCommonMode called at first window of scenario; behavior identical to later windows (single attribution call); detection should hold uniformly.
- Type 3 (event_offset=290, sample_offset=295) — both at end of activation window: freeze still active at both timestamps; detection should hold.
- Type 4 qLevel=0.05 with drifting_count=1 (N=10): boundary e-BH case; e_max ≥ N/q = 200 needed; under d=0.45 from w=4 over 30 windows, single shard's M reaches ≫ 200 → fdr_K=1; clear pass.
- Type 5 (drift=0.10, start=8, 5 shards): smallest drift × smallest fleet; may not fire fleet threshold by w=30; matrix records `detected: false`; AC-R72-12 floor 12/20 accommodates.
- Type 6 max_hop=1: cooling_zone unreachable; all 4 fired-sets DO NOT detect (`detected: false`); AC-R72-13 floor 16/20 accommodates 4 such failures.
- Empty `firing_shards` array on a type-1 variation: handled via `firedShardIds.length === 0` → `attribution_correct = false` (not null; we set it null only when `detected = false`, which is consistent). The `detected = firedShardIds.includes(target_shard_id)` predicate evaluates to false on empty array; attribution_correct → null per spec.
- Type 5 detected but no per-shard ever fires: `earliest_per_shard_tick = +∞`; `tick_at_first_fire < +∞` is true; pedagogical_property_met = true. This is the cleanest pedagogical case.
- Type 5 detected but per-shard fires before fleet: `tick_at_first_fire ≥ earliest_per_shard_tick`; pedagogical_property_met = false. Recorded honestly.
- Idempotency AC AC-R72-17 is structural: any non-determinism source (Date.now, Math.random, key-order drift) breaks byte-equality. The runner uses ONLY seeded LCG + boxMullerGaussian; ONLY `Math.log`, `Math.max`, `Math.min`, `Math.round`, basic arithmetic; ONLY `Array.sort` (stable since Node v12). No floating-point determinism hazard from architecture-specific instructions because all transcendentals are wrapped in `round6` for stored values.

**Cost:** spec ~1200 lines; runner ~1200 lines; test ~600 lines. Implementation cost: 2-4 hours. Re-run cost: ~1 second per coverage build (120 engine invocations of tiny scale). No external API calls; zero network cost.

**Coupling:** runner imports only engine `.js` files (no R70/R71 tool imports — re-implementing LCG + Gaussian primitives to keep coupling zero per § 1.1). Test file imports only the runner + R70 SCENARIO_NAMES + R71 SCENARIO_NAMES (anti-regression imports). README modification is text-only. `package.json` modification is additive (2 new keys; no removed keys).

---

## § 10. Grilling output (Superpowers Review phase, inline)

Inline adversarial self-review run before routing.

### 10.1 Every claim verifiable? [yes]

- "Round-start SHA `e77da5c`" — verifiable via `git log --oneline | grep "chore(R71): Memorial-Updater"`.
- All 11 engine surface signatures cited in § 1.3 — verifiable via `sed -n 'N,Mp'` against the cited files.
- "R71 empirical: shard-04 fires at w=22 under d=0.4" — verifiable via `python -c "import json; d=json.load(open('demos/scenarios/sdc-drift.json')); print([w['t'] for w in d['windows'] if any(p['fired'] and p['shard_id']=='shard-04' for p in w['per_shard'])][0])"` → 22. ✓
- "R71 empirical: hierarchical-evalue fleet_tick=16, first per-shard fire=18" — verifiable via the same Python over `demos/scenarios/hierarchical-evalue.json`. ✓ (Confirmed during Architect session entry.)
- "R71 empirical: topology-spanning has 3 candidates (rack-A, rack-B, cz-1)" — verifiable via `python -c "import json; d=json.load(open('demos/scenarios/topology-spanning-common-mode.json')); print([(c['shared_node_id'],c['shared_node_kind'],c['member_count']) for c in d['terminal_state']['common_mode_candidates']])"`. ✓
- Per-type detection floors in § 2.3 — grounded in (a) R71 empirical data for shared scenario shapes + (b) engine data-flow analysis for novel parameter combinations. Each row's "Rationale" column states the basis. No floor is asserted without grounding.
- Idempotency claim (§ 9 Corner cases) — verifiable by AC-R72-17 itself.

### 10.2 Unstated assumptions? [enumerated; not in body]

1. **Node `--test` runs each `test()` invocation sequentially.** Documented in Node `node --test` semantics. The matrix.json file is written by `runSaturationCoverage` (called inside AC-R72-17's body) BEFORE any AC that reads it via `loadCommittedMatrix`. **However:** ACs AC-R72-1 through AC-R72-16 + AC-R72-18 read the matrix.json that was written by chore-A's `pnpm coverage` invocation (committed to git). AC-R72-17 calls `runSaturationCoverage` IN-process and OVERWRITES the file. After AC-R72-17, the committed matrix.json may have been overwritten by the test's runSaturationCoverage call (with identical bytes, since idempotent). To make AC ordering independent of test execution order, the Implementer's RED commit MUST land the test file before chore-A; the chore-A GREEN commit runs `pnpm coverage` AND `pnpm test`, with `pnpm coverage` ordered before `pnpm test` in the spec § 11 sequence so the matrix.json on disk is the chore-A canonical version when AC-R72-1 et seq. read it. **Resolved:** § 11.1 fixes the chore-A sequence.

2. **`Buffer.equals` works as documented.** Node built-in.

3. **`tools/build-canned-demos.ts` and `tools/demo-scenario.ts` are not deleted by the Implementer during chore-A.** Frozen by anti-scope A3 + A4; no AC re-asserts their existence (covered by AC-R72-19 + AC-R72-20 via import).

4. **The matrix output directory `coordination/coverage/` is creatable.** `fs.mkdirSync(..., { recursive: true })` will create it; the directory does not exist pre-R72; verified at session entry via `ls coordination/coverage 2>&1` → "No such file or directory."

5. **`coverage` (root-level dir) gitignore rule does NOT match `coordination/coverage/` path.** Verified at session entry — `.gitignore` line `coverage/` is interpreted by git as matching only root-level `coverage/`, not `coordination/coverage/`. To be safe, the chore-A Implementer can verify via `git check-ignore coordination/coverage/R72-saturation-matrix.json` → exit code non-zero (NOT ignored) before committing.

### 10.3 Scope added beyond request? [no]

The R72 directive lists 6 deliverables: (1) saturation runner, (2) coverage matrix outputs, (3) package.json script, (4) README extension, (5) test file, (6) Q-R72-EMPIRICAL.sh. § 2 + § 3 + § 11 deliver exactly these 6 items, no more. No additional tooling (no CLI sub-commands beyond `pnpm coverage`; no separate `pnpm coverage:summary` despite directive's "optional `coverage:summary`" mention — chosen to keep scope minimal per Rule 6 anti-workaround discipline).

### 10.4 Implementer can act without guessing? [yes]

Every prescriptive element is either (a) a literal value (variation grids in § 2.1; SCENARIO_SEED_PREFIX = 0x71C00; detection floors in § 2.3), (b) a function signature with full body in § 3.1 pseudocode, or (c) a JSON shape with key order specified in § 2.2. The Implementer's only judgment calls are within TACTICAL AUTONOMY § 6.2 (import extension; comment wording; the SEED_PREFIX tuning band).

### 10.5 R02–R71 reinforcement sweep (CLAUDE-ARCHITECT.md + CLAUDE-COMMON.md)

Per CLAUDE-ARCHITECT.md REINFORCEMENTS section (loaded as system prompt):
- **R02 (type-declaration-site check):** every named type in § 3.1 pseudocode (`BettingEProcessState`, `FiredShardEvent`, `TopologySnapshot`, etc.) — verified by direct read at session entry. ✓
- **R03 (re-export verification):** § 3.1 imports use `.js` extension via `engine/detectors/*.js`, `engine/topology/*.js`, etc. These are the canonical engine entry points; re-export chains not relied upon. ✓
- **R05 / R06 (in-spec arithmetic / hard-coded list count consistency):** Component-inventory at § 1.1 says "single file" once per component; AC count = 20; § 3.3 DETECTION_FLOORS has 6 entries (1 per type); § 4 AC table has 20 rows; § 4.1 branch-binding table has rows covering all 6 type runners. Counts consistent. ✓
- **R07 / R08 (empirical premise verification):** all R71 empirical data points cited in this spec are verifiable by direct Python over `demos/scenarios/*.json` (already on disk; checked during Architect session entry). NO claim derives from prior-round attestation. ✓
- **R11 (cite-then-verify line-range):** Every engine surface signature in § 1.3 cites the exact source file:line where the function/type is declared. Verified by `sed -n 'N,Mp' file` matching the snippet. ✓
- **R13 (statistical-term-to-formula cross-check):** N/A — no named statistical bounds in spec (combineAverage, eBenjaminiHochberg, fleet wealth — all named per their engine module names, not by statistical terms).
- **R15 / R23 (chore-A baseline + gitignore awareness):** ALLOWED_SET excludes `.js` paths per `.gitignore: *.js`. Round-start SHA captured as my spec-triad commit SHA (per R21 ARCH MINOR-1). ✓
- **R18 (full-body assertion-surface check):** R72 does not modify any vendored file; no body-level assertion drift possible. ✓
- **R20 (AC-table preamble cross-check):** § 4 preamble states "All 20 ACs above are committed-runtime-test attestations"; § 4 AC table rows do not cite binding-command outputs; § 11 EMPIRICAL.sh runs binding-command verification SEPARATELY. ✓
- **R21 (spec-commit-sequencing):** spec triad (Q-R72-SPEC + Q-R72-SPEC-AUDIT + Q-R72-EMPIRICAL.sh) will be committed in its OWN commit BEFORE the Architect routing-block commit. ✓
- **R25 (baseline-fresh-not-inherited):** ran `pnpm exec tsc -p tsconfig.test.json` (exit 0) + `pnpm exec node --test test/*.test.js` (469/461/5/3) at Architect session entry; not inherited from R71. ✓
- **R30 (regex discriminability):** AC-R72-18 uses literal-string `includes` matching against a unique-by-design literal (the totals row format `| ${total_variations} | ${total_detected} | ${total_attribution_correct} |`). Could appear elsewhere in matrix.md? Only the totals row uses this pattern; other rows are per-type. The Summary table uses a different cell format (`detected_count / 20`). No ambiguity. ✓
- **R34 (algorithmic boundary clauses):** § 2.4 per-type predicates use consistent boundary semantics: `M ≥ DEMO_THRESHOLD` (inclusive); `w < WINDOW_COUNT_DEFAULT` (exclusive); `qLevel ∈ (0,1]` (open-left, closed-right per engine guard). Cross-section diff clean. ✓
- **R34 MINOR-3 (regex JS-validity):** AC-R72-18 uses `String.prototype.includes` — no regex; no Perl/Python construct risk. The 1 regex in ALLOWED_SET carve-out (`^coordination/diagnostics/DIAGNOSTIC-R72-[a-z0-9-]+\.md$`) is bash-grep compatible (POSIX-like syntax). ✓
- **R44 / R46 (grep-count threshold tightness):** all detection-floor ACs use `>=` against specific integer thresholds (16, 20, 12) — tight bounds; not `≥ 1` open thresholds. ✓
- **R53 / R56 (chore-A vs chore-B prediction):** R72 is single-state (no chore-B); halt #1 covers any non-zero EMPIRICAL.sh exit. ✓
- **R58 (constructor-opts field name verification):** § 3.1 uses `DsEventConsumer({ port: 0 })`, `createFreezeHookFromDsEvents({ consumer, config, activation_window_seconds, setTimeout, clearTimeout, now })`. These exact field names verified at R71 chore-A in `tools/build-canned-demos.ts:407-418`; preserved verbatim. ✓
- **R58 MINOR-3 (post-MOD-insertion line drift):** N/A — no in-place modification of existing files; only ADDITIONS to package.json + README.md. No line-range citations to other files in this spec.
- **R65 MINOR-2 (type-definition shape evolution):** § 1.3 + § 3.1 type signatures match engine declarations at session-entry SHA. No discriminated-union vs interface drift possible (all types are exported from engine modules; no spec re-declaration).
- **R65 MINOR-3 (P3 commitment AC coverage):** every § 9 corner-case commitment is bound by an AC. Type-1 lowest drift: AC-R72-8 (floor 16/20). Type-2 attribution_window=0: AC-R72-9 (floor 20/20). Type-5 detected-but-no-per-shard: AC-R72-15 (pedagogical). Type-6 max_hop=1: AC-R72-13 (floor 16/20). ✓
- **R66 MINOR-1 (semantic-overclaim field name):** field name `attribution_correct` accurately reflects what the predicate measures (per-type correctness criterion satisfied). `detected` reflects per-type detection criterion. `pedagogical_property_met` clearly signals it's a separate pedagogical check (only fires for type 5). No semantic overclaim. ✓
- **R66 MINOR-5 (annotation rather than strikethrough):** No amendments-in-place in this spec (no prior R72 spec exists). Future amendments (if needed) will use bracketed [R72-amended] annotation per the rule. ✓
- **R70 MINOR-2 (spec narrative vs executable script alignment):** § 11 EMPIRICAL.sh body is the executable; § 11.1 block descriptions reflect what each script block actually checks. Pre-emit grilling: every Block in § 11.1 narrative text matches the actual script body. ✓
- **R70 MINOR-3 (AC literal vs verification mechanism):** AC-R72-18 literal text: "matrix.md contains the exact totals row of the matrix.json AND contains `### N. <type-name>` headings for all 6 types in canonical order." Verification: `md.includes(...)` checks both. Literal matches mechanism. ✓
- **R70 MINOR-4 (regex weak discrimination):** AC-R72-18 uses literal strings, no regex weakness. AC-R72-4 uses `deepStrictEqual` against the literal array, which checks ORDER AND CONTENT — discriminating. ✓
- **R71 MAJOR-1 + MAJOR-2 (EMPIRICAL-PREMISE-VERIFICATION sub-variant 5 — pre-authored narrative text):** **CRITICAL APPLICATION.** This spec deliberately avoids the R71 trap by (a) NOT pre-authoring expected detection numbers per variation (the matrix REPORTS empirical results); (b) ACs bind PER-TYPE AGGREGATE floors that are validated by data-flow analysis + R71 empirical anchor; (c) for hierarchical-evalue specifically, AC-R72-15 binds the pedagogical "fleet fires before per-shard" property STRUCTURALLY (not as a narrative claim in pre-authored text) — meaning the AC FAILS if the engine produces a configuration where per-shard fires first. This is the R71 MAJOR-1 lesson applied as a discriminating AC. Similarly, AC-R72-13 + AC-R72-14 for topology-spanning bind the cooling_zone-level cluster-spanning property — closing R71 MAJOR-2. ✓
- **R71 MINOR-1 (AC predicates not binding pedagogical property):** AC-R72-14 + AC-R72-15 specifically bind the discriminating pedagogical properties for types 5 + 6 that R71 missed. AC-R72-16 binds FP-count-zero floor for types 1 + 2 + 4. Pedagogical-coverage gap closed. ✓

### 10.6 Architect pre-prediction on outcomes (R71 § 10.6 pattern)

The Implementer will encode actual observed values verbatim at chore-A per Rule 1. Architect predicts the following values for sanity comparison:

- `pnpm exec tsc -p tsconfig.test.json` → exit 0; zero diagnostics.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` →
  - `# tests 489` (469 + 20 new AC-R72-{1..20})
  - `# pass 481` (461 + 20)
  - `# fail 5` (carry-forward identity preserved: AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14)
  - `# skipped 3` (unchanged)
- `bash coordination/specs/Q-R72-EMPIRICAL.sh` → all 8 blocks PASS, exit 0.
- `git diff <ROUND_START_SHA>..HEAD --name-only` → 11 paths, all ⊆ ALLOWED_SET § 5.1.
- Coverage matrix (Architect data-flow + R71 prediction):
  - sdc-drift detected ∈ [16, 20]; expected ~18 (mag 0.20 may fail for some shards).
  - common-mode-rack detected = 20.
  - event-conditional detected = 20.
  - fdr-multiple-testing detected ∈ [17, 20]; expected ~19.
  - hierarchical-evalue detected ∈ [12, 18]; expected ~15.
  - topology-spanning-common-mode detected = 16 exactly (4 hop=1 variations fail).
  - All attribution_accuracy values ≥ 0.95 per parameter selection.
  - hierarchical-evalue pedagogical_property_rate ∈ [0.80, 1.00]; expected ~0.93.

Architect prediction confidence: MEDIUM-HIGH (engine signatures verified; parameter ranges anchored to R71 empirical baseline; conservative floors leave safety margin). If the Implementer observes detection floors are NOT met, halt #8 fires — operator dispositions whether parameter ranges need tuning or whether an engine regression is implicated.

### 10.7 Decision rationale + brainstorm re-evaluation

Brainstorm Approach B selected (per § 0). No prior R72 brainstorm exists (this is the first R72 spec). No fix-cycle considerations apply. The R71 MAJOR-1 + MAJOR-2 lessons are encoded as discriminating ACs (AC-R72-15, AC-R72-13/14) — converting the R71 "narrative claim never checked" failure mode into "structural AC that fails when the claim doesn't hold." This is Rule 5 self-application: applying the rule derived at R71 close (R71 MEMORIAL EMPIRICAL-PREMISE-VERIFICATION sub-variant 5) AT the R72 derivation/landing round.

### 10.8 Spec-internal contradiction sweep (R34 MINOR-2 / R65 MINOR-2)

For each algorithmic/structural primitive in spec, check all spec sections use a consistent definition:

| Primitive | Sections touching it | Verified consistent? |
|---|---|---|
| 6 failure type names | § 1 (boundaries), § 2.1 (table), § 2.3 (table), § 2.4 (predicates), § 3.1 (pseudocode), § 3.3 (test), § 4 (AC table), § 9 corner cases | YES — same 6 names in same order everywhere. ✓ |
| 20 variations per type | § 2.1, § 2.4, § 3.1, § 3.3 AC-R72-5 | YES ✓ |
| `variation_idx` 0..19 | § 2.1, § 2.2, § 3.1, § 3.3 AC-R72-5 | YES ✓ |
| Per-type detection floors (16/20/20/16/12/16) | § 2.3 table, § 3.3 DETECTION_FLOORS const, § 4 AC table AC-R72-8..AC-R72-13, § 5.4 / § 10.6 prediction | YES ✓ |
| Attribution accuracy floor (0.95) | § 2.3, § 3.3 AC-R72-14, § 4 AC table | YES ✓ |
| Pedagogical floor (0.80) | § 2.3 (table), § 3.3 AC-R72-15, § 4 AC table | YES ✓ |
| FP-count floor (0) for types 1+2+4 | § 2.3 (table), § 3.3 AC-R72-16, § 4 AC table | YES ✓ |
| `tessera-coverage-v1` schema version literal | § 2.2, § 3.1 (interface), § 3.3 AC-R72-2 | YES ✓ |
| ALLOWED_SET 11 paths | § 5.1, § 11 EMPIRICAL.sh Block 3 | YES ✓ |
| ROUND_START_SHA = spec-triad commit SHA | § 5.1, § 11 EMPIRICAL.sh | YES ✓ |

No spec-internal contradictions surfaced.

---

## § 11. Q-R72-EMPIRICAL.sh — empirical verification harness

### 11.1 Implementer chore-A sequence (single-state; no chore-B)

1. **RED commit (separate from GREEN per R23 IMPL MINOR-1):**
   - Land `test/q72-coverage-saturation.test.ts` with 20 `assert.fail('R72 RED — implementation pending')` stubs at AC-R72-1..20 positions, AND the file imports from `'../tools/coverage-saturation.js'` (which does not yet exist → tsc emits TS2307).
   - `tools/coverage-saturation.ts`, `coordination/coverage/`, and `package.json` script entries do NOT yet exist.
   - Commit message format: `red(R72): q72 coverage saturation stub fails — TS2307 + 20 RED assertion stubs`

2. **GREEN commit (chore-A):**
   - Land `tools/coverage-saturation.ts` per § 3.1 pseudocode.
   - Run `pnpm exec node tools/coverage-saturation.js` (after tsc compile) to generate `coordination/coverage/R72-saturation-matrix.json` + `.md`; commit the outputs.
   - Modify `package.json` per § 3.2 (add `prebuild:coverage` + `coverage` script entries; preserve all other entries verbatim).
   - Modify `README.md` per § 3.4 (append Coverage section at end-of-file; R70 + R71 sections PRESERVED).
   - Replace all RED stubs in `test/q72-coverage-saturation.test.ts` with real assertions per § 3.3.
   - **BEFORE committing:** inject `$ROUND_START_SHA` into `coordination/specs/Q-R72-EMPIRICAL.sh` via `sed`:
     ```bash
     sed -i.bak "s|<INJECTED-AT-CHORE-A>|<SPEC-TRIAD-SHA>|g" coordination/specs/Q-R72-EMPIRICAL.sh
     rm coordination/specs/Q-R72-EMPIRICAL.sh.bak
     ```
     where `<SPEC-TRIAD-SHA>` is the literal SHA of the Architect's spec-triad commit (named in Architect routing block of NEXT-ROLE.md). **R70 MINOR-1 reinforcement applied: do NOT use `$(git rev-parse HEAD)` at this point — HEAD may be a RED commit or unrelated commit, NOT the spec-triad commit.** Read the spec-triad SHA from NEXT-ROLE.md's Architect routing block and inject as a literal.
   - Commit message format: `feat(R72): Tessera coverage saturation matrix — 6 failure types × 20 variations = 120 cases`

3. **Verify chore-A:**
   - `pnpm exec tsc -p tsconfig.test.json` → exit 0; zero diagnostics.
   - `pnpm exec node --test --test-reporter=tap test/*.test.js` → record VERBATIM the actual `# tests N / # pass M / # fail K / # skipped J` lines. Predicted: 489 / 481 / 5 / 3.
   - `bash coordination/specs/Q-R72-EMPIRICAL.sh` → all 8 blocks PASS, exit 0.

4. **Attestation in NEXT-ROLE.md:** Implementer adds § Implementer R72 routing block ABOVE the Architect block. Encode ACTUAL chore-A summary VERBATIM per Rule 1 sub-class `empirical-command-attestation`. Do NOT reframe to match Architect prediction. Acknowledge any divergence in a spec-deviance section.

5. **NO chore-B step.** R72 is single-state.

### 11.2 Q-R72-EMPIRICAL.sh script body (8 blocks)

The full script is committed at `coordination/specs/Q-R72-EMPIRICAL.sh`. Block descriptions (each block has its own pass/fail; script exits 0 if all PASS, non-zero if any FAIL):

- **Block 1 (tsc-exit-0):** `pnpm exec tsc -p tsconfig.test.json` exits 0.
- **Block 2 (node-test-fail-count-and-identity):** `pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | grep "# fail = 5"` AND grep confirms each of the 5 carry-forward AC IDs is present in the output (`AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14`).
- **Block 3 (anti-scope-allowed-set):** `git diff $ROUND_START_SHA..HEAD --name-only` returns ONLY paths in the 11-element ALLOWED_SET (or matching the DIAGNOSTIC regex carve-out). Any unauthorized path → FAIL.
- **Block 4 (no-engine-mods):** `git diff $ROUND_START_SHA..HEAD --name-only -- 'engine/**'` returns empty output.
- **Block 5 (no-prior-round-spec-mods):** `git diff $ROUND_START_SHA..HEAD --name-only -- 'coordination/specs/Q-R[0-6]*.md' 'coordination/specs/Q-R7[0-1]*.md'` returns empty output.
- **Block 6 (matrix-json-exists-and-parses):** `coordination/coverage/R72-saturation-matrix.json` exists AND is valid JSON AND has `schema_version: 'tessera-coverage-v1'`.
- **Block 7 (package-json-coverage-script):** `package.json` `scripts.coverage === 'node tools/coverage-saturation.js'` AND `scripts['prebuild:coverage'] === 'tsc -p tsconfig.test.json'`.
- **Block 8 (matrix-deterministic):** running `pnpm exec node tools/coverage-saturation.js` produces byte-identical `coordination/coverage/R72-saturation-matrix.json` to the committed version (test by computing SHA-256 of the committed file, re-running the runner, comparing SHA-256 to expected). Re-running once per chore-A invocation is sufficient; full idempotency is bound at runtime by AC-R72-17.

The actual script body is at `coordination/specs/Q-R72-EMPIRICAL.sh`. Spec-narrative-vs-script alignment is verified at spec-emit (R70 MINOR-2 reinforcement).

---

## § Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R72 --tier full
```

---

## § Architect attestation (chore-emit time)

This spec is the load-bearing prescription for the Implementer. The Q-R72-SPEC-AUDIT.md sidecar contains ten-axis pre-emit verification, decision rationale, and Architect pre-prediction. The Reviewer reads both; the Implementer reads this spec proper.

Spec triad commit lands BEFORE this Architect routing-block commit per R21 ARCH MINOR-1. ROUND_START_SHA for Implementer's anti-scope diff = the spec-triad commit SHA, captured via `git rev-parse HEAD` after spec triad lands and before routing-block commit.
