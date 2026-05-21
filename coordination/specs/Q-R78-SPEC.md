# Q-R78-SPEC — Topology-walk tuning envelope (multi-level walk characterization; Phase 4 SLICE 1 FINAL)

**Round:** R78 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `3d00490` (`chore(R78 directive): detector tuning gap 2 — multi-level topology walk; Phase 4 SLICE 1 FINAL`) — verified via `git rev-parse HEAD` at Architect session entry 2026-05-20. (Directive § R78 Round-scope cites `f592737` — that is R77 Memorial-Updater close one commit prior; HEAD at session entry was already advanced by the operator's directive-planting commit `3d00490`. The spec uses `3d00490` as the round-start boundary because that is the actual HEAD at Architect dispatch and the boundary against which the chore-A anti-scope diff is measured.)
**Spec-emit SHA:** stamped by Architect's spec-triad commit (lands BEFORE chore-A per R21 ARCH MINOR-1).
**Authority:** `coordination/NEXT-ROLE.md` § R78 Round-scope directive (commit `3d00490`).
**Empirical premise (verified at session entry 2026-05-20 in this worktree):** `node --test --test-reporter=tap test/*.test.js` at round-start = exit code **1**; TAP summary `tests=566 / suites=3 / pass=556 / fail=6 / skipped=4 / cancelled=0 / todo=0`. The 6 failing ACs at HEAD are pre-existing carry-forward (see § 1.6 baseline-test-status table — extends R77's 5-fail set by AC-R77-17, which fails at `3d00490` because the R78 directive commit modified `coordination/NEXT-ROLE.md` after R77's ALLOWED_PATTERN was sealed; this is the same forward-protection class as R66 AC-R66-14). `npx tsc -p tsconfig.test.json` exits **0**.

**Engine option pick (directive § Primary deliverable item 2):** **Option (iii) — DEFER engine modification to Phase 5.** Rationale: (a) directive explicitly defaults to (iii); (b) existing engine surface (`engine/topology/common-mode-attribution.ts`) already exposes `max_hop_distance` and `min_member_count` as configurable opts (lines 87, 90), which are the exact two dials the parameter sweep characterizes; (c) Option (i)/(ii) would require ESCALATE before chore-A per directive (Phase 3 frozen engine surface); (d) the tuning envelope is empirically expressible with existing opts (verified at session entry — see § 1.4 Architect pre-prediction matrix). No new operator-actionable lever is being foregone; the round's deliverable is operator GUIDANCE on the EXISTING dials, not new dials.

---

## § 0. Brainstorm (Superpowers Phase 1)

R72 produced a 6×20 coverage matrix that surfaced **gap 2: topology-spanning-common-mode detected in only 16/20 (80%) of variations** (variation_idx 0, 5, 10, 15 missed — each at `max_hop_distance=1` against the `cz-1` cooling-zone-spanning 2-rack fixture). The structural cause: at hop=1 the BFS from any shard reaches only its containing rack; the cooling_zone node sits at hop=2 (shard → rack → cz). The "fix" is parameter-tuning, not algorithm modification — the operator can lift `max_hop_distance` from 1 to 2 to catch cross-rack CZ-attributed common modes. R78 characterizes the tuning envelope along (max_hop_distance × min_member_count × scenario_class) and documents the false-positive trade-off so operators can pick defaults appropriate to their cluster topology.

### Approach A — Existing-engine parameter sweep, characterize only (engine option iii); single scenario per cell

Run a parameter sweep across `max_hop_distance ∈ {1,2,3}` × `min_member_count ∈ {2,3}` × scenario_class ∈ {a few canonical fixed fired_sets}, with no PRNG randomness. Engine UNCHANGED. Report binary detection per cell. Output: matrix + recommendation MD.

- **Strengths:** smallest matrix; cheapest runtime; conservative engine path (matches directive default).
- **Weaknesses:** binary single-scenario outcomes do NOT characterize the false-positive trade-off the directive asks for ("document false-positive trade-off") — the FP-rate requires repeated random firings to estimate. R72 already established (idx 0/5/10/15) that hop=1 misses; restating that is not the round's contribution.
- **Eliminated** because the directive asks for FP-rate documentation, not just recall characterization.

### Approach B — Engine extension (option i): add `min_member_count_by_kind` per-kind override + sweep

Extend `CommonModeAttributionOpts` with `min_member_count_by_kind?: { psu?: number; rack?: number; cooling_zone?: number; }` so operators can require higher member-count thresholds at coarser topology levels (e.g., min=3 for cz, min=2 for rack). Sweep the new option alongside existing ones.

- **Strengths:** adds a genuinely new operator-meaningful tuning lever; backward-compatible.
- **Weaknesses:** requires ESCALATE before chore-A per directive (Phase 3 frozen engine surface); engine modification adds carry-forward maintenance load; the new option is dispositive only if the simpler `min_member_count` global is empirically insufficient — and § 1.4 below shows it isn't (the global already produces clean cell discrimination).
- **Eliminated** because (a) directive flags ESCALATE for engine modification, (b) empirical evidence shows the existing `min_member_count` already gives operators sufficient FP-suppression control without per-kind branching.

### Approach C — Engine extension (option ii): new `attributeCommonModeWithKindPriority` function; sweep

Add a parallel function in `engine/topology/common-mode-attribution.ts` that walks topology with kind-priority semantics (e.g., suppress cz candidates when a rack candidate already covers all members). Leaves `attributeCommonMode` byte-identical.

- **Strengths/weaknesses:** similar to B; same ESCALATE required; same load-bearing-ness question.
- **Eliminated** in favor of D below.

### Approach D — Existing-engine sweep with multi-class scenario coverage + PRNG-sampled negative cells (PICKED)

Run a parameter sweep across `max_hop_distance ∈ {1,2,3}` × `min_member_count ∈ {2,3}` × scenario_class ∈ {POS-CZ-SPARSE, POS-CZ-FULL, POS-RACK-2, POS-RACK-3, NEG-INDEP} × 5 PRNG-seeded trials. The trials sample fired_sets within each scenario class deterministically per `(seed_prefix ^ (cell_idx * 5 + trial_idx))`. Engine UNCHANGED. Report per-cell:
- `cz_detection_count` — trials where `cooling_zone:cz-1` surfaced (TP for POS-CZ-*; FP for POS-RACK-* and NEG-INDEP)
- `rack_detection_count` — trials where any `rack` candidate surfaced
- `shadow_rack_fp_count` — trials where a rack candidate's `member_shard_ids` includes a shard NOT contained in that rack (the "BFS-through-cz back-down propagation" failure mode, only possible at hop≥3)

The NEG-INDEP class (Bernoulli(p=0.2) per shard) provides the FP-rate dimension by sampling random multi-shard firings that are NOT a true common-mode. Per-cell ACs assert exact equality on the deterministic counts at the spec-pinned `SEED_PREFIX = 0x78A11`.

- **Strengths:** (a) conservative engine path — no ESCALATE risk; (b) FULL operator-relevant characterization — both recall (positive scenarios) AND FP (NEG-INDEP) measured; (c) shadow-rack-FP class identified explicitly (cells where hop=3 BFS propagates touches through cz back to the other rack); (d) pattern isomorphic to R77 (sweep + Monte Carlo trials + matrix + recommendation), so the Implementer follows established R77 conventions; (e) tight per-cell ACs (exact equality at pinned seed) are discriminating per R71 MINOR-1 — they bind the empirical envelope point-by-point, not just aggregate detection.
- **Weaknesses:** PRNG-seeded NEG-INDEP cells encode counts that depend on PRNG-path stability. The spec pins `SEED_PREFIX = 0x78A11` and the LCG formula (constants 1664525, 1013904223) so any PRNG-path change is itself a flag (per R77 MINOR-4 — but here we accept exact-equality ACs because the harness is fully spec-prescribed and the seed_prefix is documented; padding would weaken the discrimination per R71 MINOR-1).
- **Hidden assumption:** the 6-shard 2-rack-1-cz topology generalises operator-relevantly — at 12-shard / 3-rack / 2-cz topologies, hop=2 might still miss cross-cz events. ACKNOWLEDGED: § 5.3 records this gap and the recommendation MD calls out that the envelope is characterized FOR THE 2-tier topology class; deeper hierarchies are out of R78 scope (operator-action: same dial; threshold + hop selection per per-cluster characterization).
- **PICKED.**

### Selection rationale

**Approach D picked.** Existing-engine multi-class sweep delivers the operator-actionable characterization the directive asks for (parameter sweep × FP trade-off documentation), AVOIDS the ESCALATE path that engine-modification options require, and produces a 30-cell × 5-trial = 150-trial deterministic matrix that is exactly the shape an operator can read to pick (hop, min_member) defaults appropriate to their cluster topology.

**What was rejected:**
- A — too narrow; doesn't characterize FP trade-off (directive's explicit deliverable).
- B — engine extension requires ESCALATE; empirical sweep shows existing global `min_member_count` is sufficient for FP suppression.
- C — engine extension requires ESCALATE; kind-priority semantics not justified by empirical envelope.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Topology-walk-tuning runner | — | `tools/topology-walk-tuning.ts` (Tessera-original; single file; target ~600-800 lines TS) | — | — |
| Operator tuning recommendation | — | `scripts/topology-walk-tuning-recommendation.md` (Tessera-original; written content; ~120-200 lines MD) | — | — |
| Tuning outputs | — | `coordination/coverage/R78-topology-walk-tuning-matrix.json` + `R78-topology-walk-tuning.md` (Tessera-original; generated; checked into git) | — | — |
| Package scripts | `package.json` (scripts block) | — | adds 2 entries (`prebuild:topology-walk-tuning`, `topology-walk-tuning`) | — |
| README | `README.md` ("Coverage" section tail) | — | extends Coverage section (≤ 30 added lines) at tail | — |
| Tests | — | `test/q78-topology-walk-tuning.test.ts` (Tessera-original; target ~400-600 lines TS) | — | — |
| Engine | ALL `engine/*` files frozen (Option (iii) — defer engine modification) | — | — | — |
| R70/R71/R72/R73/R74/R75/R77 surfaces | `tools/demo-scenario.ts`, `tools/build-canned-demos.ts`, `tools/coverage-saturation.ts`, `tools/detector-envelope.ts`, `tools/detection-curve.ts`, `demos/`, `coordination/coverage/R72-*`, `coordination/coverage/R77-*`, `scripts/tier-router*.ts`, `scripts/mu-model-select*.ts`, `scripts/build-role-context.ts`, `scripts/measure-cache-effect.ts`, `scripts/detector-tuning-recommendation.md`, `run-pipeline.sh`, all q01..q77 test files | — | — | — |
| Spec triad | — | `coordination/specs/Q-R78-SPEC.md`, `Q-R78-SPEC-AUDIT.md`, `Q-R78-EMPIRICAL.sh` | — | — |

**Critical anti-scope clarification:** `tools/coverage-saturation.ts` (R72), `tools/detector-envelope.ts` (R77), and `tools/detection-curve.ts` (R77) are **READ-ONLY** at R78. The topology-walk-tuning runner re-implements LCG + scenario-generator primitives (same pattern as R77 re-implementing LCG rather than importing from `tools/coverage-saturation.ts`) to keep cross-tool coupling zero. The runner imports engine surfaces ONLY by `.js` extension (matches R72 + R77 + R70/R71 convention).

### 1.2 Data flow (build-time + test-time)

```
pnpm topology-walk-tuning
   → prebuild:topology-walk-tuning compiles tools/topology-walk-tuning.ts → .js
   → node tools/topology-walk-tuning.js
       for each (scenario_class_idx ∈ 0..4, hop_idx ∈ 0..2, min_idx ∈ 0..1):
         cell_idx = (scenario_class_idx * 3 + hop_idx) * 2 + min_idx
         params = { scenario_class: SCENARIO_CLASSES[scenario_class_idx],
                    max_hop_distance: HOPS[hop_idx],
                    min_member_count: MINS[min_idx] }
         trials = []
         for trial_idx ∈ 0..4:
           seed = SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx)
           rng = makeLcg(seed)
           fired_set = generateScenarioInstance(params.scenario_class, rng)  — see § 1.3
           outcome = attributeCommonMode({ fired_events: makeEvents(fired_set),
                                            snapshot: TWO_RACK_CZ_TOPOLOGY,
                                            opts: { max_hop_distance: params.max_hop_distance,
                                                    min_member_count: params.min_member_count,
                                                    now: () => 1_700_000_200 } })
           classified = classifyOutcome(outcome, fired_set)   — see § 1.4
           trials.push({ trial_idx, seed, fired_set, classified, candidates_snapshot })
         summary = aggregateCell(trials)                       — see § 1.5
         matrix.cells.push({ cell_idx, params, summary, trials })
       writeFile(coordination/coverage/R78-topology-walk-tuning-matrix.json)
       renderMd(matrix) → writeFile(coordination/coverage/R78-topology-walk-tuning.md)

pnpm test
   → tsc -p tsconfig.test.json compiles test/q78-topology-walk-tuning.test.ts → .js (+0 expected new tsc errors)
   → node --test asserts on:
       - matrix.json schema_version + shape + cell count (30)
       - per-cell field schema (params, summary, trials)
       - per-cell exact-equality outcome ACs (§ 4.5 — 30 cells × 3 metrics = 90 binding observations; bundled per AC)
       - matrix-md exists + contains required sections (§ 4.6)
       - topology-walk-tuning-recommendation.md exists + has required sections (§ 4.7)
       - anti-regression: R72 + R77 + R70/R71 + R73/R74/R75 surfaces byte-identical (§ 4.8)
       - typecheck count + test count + anti-scope diff (§ 4.9-4.11)
```

### 1.3 Scenario classes (deterministic generators)

The topology is the same shape as R72's `build2RackCzTopology()` (see `tools/coverage-saturation.ts:193-216`): 1 cooling_zone (`cz-1`) over 2 racks (`rack-A`, `rack-B`), each rack containing 3 gpu_shards. Re-declared in `tools/topology-walk-tuning.ts` to keep cross-tool coupling zero (per § 1.1 R77/R72 convention). Topology shape is byte-prescribed in § 3.1 pseudocode.

```
SCENARIO_CLASSES = ['POS-CZ-SPARSE', 'POS-CZ-FULL', 'POS-RACK-2', 'POS-RACK-3', 'NEG-INDEP']
RACK_A_SHARDS = ['shard-00', 'shard-01', 'shard-02']
RACK_B_SHARDS = ['shard-03', 'shard-04', 'shard-05']
ALL_SHARDS    = [...RACK_A_SHARDS, ...RACK_B_SHARDS]

generateScenarioInstance(scenario_class, rng):  // rng is an LCG returning [0,1)
  switch(scenario_class):
    case 'POS-CZ-SPARSE':  // exactly 1 from each rack — minimal cross-rack pair
      return [pickFromArray(rng, RACK_A_SHARDS), pickFromArray(rng, RACK_B_SHARDS)]
    case 'POS-CZ-FULL':    // exactly 2 from each rack — full cross-rack span
      return [...shuffleTakeFromArray(rng, RACK_A_SHARDS, 2),
              ...shuffleTakeFromArray(rng, RACK_B_SHARDS, 2)]
    case 'POS-RACK-2':     // 2 shards from a randomly-chosen single rack
      const rackChoice = rng() < 0.5 ? RACK_A_SHARDS : RACK_B_SHARDS
      return shuffleTakeFromArray(rng, rackChoice, 2)
    case 'POS-RACK-3':     // all 3 shards of a randomly-chosen single rack
      return (rng() < 0.5 ? RACK_A_SHARDS.slice() : RACK_B_SHARDS.slice())
    case 'NEG-INDEP':      // independent Bernoulli(0.2) per shard
      return ALL_SHARDS.filter(_ => rng() < 0.2)

pickFromArray(rng, arr):        return arr[Math.floor(rng() * arr.length)]
shuffleTakeFromArray(rng, arr, n):
  let a = arr.slice()
  for i from a.length-1 down to 1:
    let j = Math.floor(rng() * (i + 1))
    swap(a[i], a[j])
  return a.slice(0, n)
```

### 1.4 Architect pre-prediction matrix (cite-then-verify — RAN AT SESSION ENTRY 2026-05-20 against engine HEAD `3d00490`)

The full 30-cell matrix below was empirically produced at Architect session entry by running the exact scenario generators + LCG + engine call sequence prescribed in § 3.1 against the current engine HEAD. The Implementer MUST reproduce these EXACT counts at chore-A. Per R77 MINOR-4 padding rule consideration: since the entire pipeline (scenario generator → LCG seed selection → engine call) is fully deterministic AND fully spec-prescribed AND the engine is FROZEN, exact-equality ACs are discriminating in the R71 MINOR-1 sense — a future implementation MISTAKE (e.g., wrong scenario PRNG consumption order, off-by-one in seed arithmetic, engine modification) WILL flip these counts. The exact-equality discipline is preserved because there is no irreducible PRNG path drift to accommodate.

| cell_idx | scenario_class | hop | min | cz_detection_count | rack_detection_count | shadow_rack_fp_count |
|---|---|---|---|---|---|---|
| 0 | POS-CZ-SPARSE | 1 | 2 | 0 | 0 | 0 |
| 1 | POS-CZ-SPARSE | 1 | 3 | 0 | 0 | 0 |
| 2 | POS-CZ-SPARSE | 2 | 2 | 5 | 0 | 0 |
| 3 | POS-CZ-SPARSE | 2 | 3 | 0 | 0 | 0 |
| 4 | POS-CZ-SPARSE | 3 | 2 | 5 | 5 | 5 |
| 5 | POS-CZ-SPARSE | 3 | 3 | 0 | 0 | 0 |
| 6 | POS-CZ-FULL | 1 | 2 | 0 | 5 | 0 |
| 7 | POS-CZ-FULL | 1 | 3 | 0 | 0 | 0 |
| 8 | POS-CZ-FULL | 2 | 2 | 5 | 5 | 0 |
| 9 | POS-CZ-FULL | 2 | 3 | 5 | 0 | 0 |
| 10 | POS-CZ-FULL | 3 | 2 | 5 | 5 | 5 |
| 11 | POS-CZ-FULL | 3 | 3 | 5 | 5 | 5 |
| 12 | POS-RACK-2 | 1 | 2 | 0 | 5 | 0 |
| 13 | POS-RACK-2 | 1 | 3 | 0 | 0 | 0 |
| 14 | POS-RACK-2 | 2 | 2 | 5 | 5 | 0 |
| 15 | POS-RACK-2 | 2 | 3 | 0 | 0 | 0 |
| 16 | POS-RACK-2 | 3 | 2 | 5 | 5 | 5 |
| 17 | POS-RACK-2 | 3 | 3 | 0 | 0 | 0 |
| 18 | POS-RACK-3 | 1 | 2 | 0 | 5 | 0 |
| 19 | POS-RACK-3 | 1 | 3 | 0 | 5 | 0 |
| 20 | POS-RACK-3 | 2 | 2 | 5 | 5 | 0 |
| 21 | POS-RACK-3 | 2 | 3 | 5 | 5 | 0 |
| 22 | POS-RACK-3 | 3 | 2 | 5 | 5 | 5 |
| 23 | POS-RACK-3 | 3 | 3 | 5 | 5 | 5 |
| 24 | NEG-INDEP | 1 | 2 | 0 | 2 | 0 |
| 25 | NEG-INDEP | 1 | 3 | 0 | 0 | 0 |
| 26 | NEG-INDEP | 2 | 2 | 1 | 1 | 0 |
| 27 | NEG-INDEP | 2 | 3 | 1 | 0 | 0 |
| 28 | NEG-INDEP | 3 | 2 | 1 | 1 | 1 |
| 29 | NEG-INDEP | 3 | 3 | 0 | 0 | 0 |

**Empirical envelope summary (operator-relevant headlines, derived from the pre-prediction matrix):**

1. **At default `max_hop_distance=1`:** cross-rack CZ-attribution is structurally impossible — cz-1 sits at hop=2 from every shard. Confirmed by cells 0/1/6/7 (POS-CZ-* all 0 cz hits at hop=1).
2. **Lifting to `max_hop_distance=2` + keeping `min_member_count=2`:** catches all positive-CZ scenarios (sparse and full); also surfaces rack-attribution for single-rack events; introduces FP-rate 1/5 = 20% on independent random firings. No shadow-rack FP appears.
3. **Lifting to `max_hop_distance=2` + tightening to `min_member_count=3`:** catches POS-CZ-FULL (cells 9) and POS-RACK-3 (cell 21) but MISSES POS-CZ-SPARSE (cell 3 = 0) — the 2-shard sparse cross-rack event falls below the 3-member threshold. Operator trade-off.
4. **Lifting to `max_hop_distance=3`:** introduces the SHADOW-RACK FP class — BFS at hop=3 from a fired shard propagates touch via cz back down to the OTHER rack's shards, surfacing the un-fired rack as a candidate (cells 4, 10, 11, 16, 22, 23, 28). Operator-visible FALSE attribution. **Not recommended for 2-tier topologies.**
5. **Per-kind FP-rate ranking at hop=2:** min=3 < min=2; both rare (≤1/5 = 20%) on NEG-INDEP. min=3 maintains 0 shadow_rack_fp even at hop=3 in NEG-INDEP (cell 29 vs cell 28).

These five headlines feed directly into the operator-facing `scripts/topology-walk-tuning-recommendation.md`. The Implementer reads the matrix at write-time and authors the recommendation per R71 MAJOR-1 lesson (do NOT pre-author empirical claims; the spec describes WHICH cells to cite, not the specific narrative text).

### 1.5 Per-trial classification + per-cell aggregation

```
classifyOutcome(result: CommonModeAttributionResult, fired_set: readonly string[]):
  cz_candidate = result.candidates.find(c =>
    c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1')
  rack_candidates = result.candidates.filter(c => c.shared_node_kind === 'rack')
  shadow_rack_fp = rack_candidates.some(rc => {
    expected = rc.shared_node_id === 'rack-A' ? new Set(RACK_A_SHARDS) : new Set(RACK_B_SHARDS)
    return rc.member_shard_ids.some(sid => !expected.has(sid))
  })
  return {
    cz_fired: cz_candidate !== undefined,
    rack_fired: rack_candidates.length > 0,
    shadow_rack_fp,
    cz_member_count: cz_candidate ? cz_candidate.member_count : null,
    rack_candidate_count: rack_candidates.length,
  }

aggregateCell(trials):  // trials.length === 5
  return {
    cz_detection_count:    trials.filter(t => t.classified.cz_fired).length,
    rack_detection_count:  trials.filter(t => t.classified.rack_fired).length,
    shadow_rack_fp_count:  trials.filter(t => t.classified.shadow_rack_fp).length,
  }
```

### 1.6 Baseline-test-status (verified at Architect session entry; HEAD `3d00490`)

| Failing AC at round-start | Source | Reason | Disposition for R78 |
|---|---|---|---|
| `AC-R36-21: CLAUDE-IMPLEMENTER.md ≤30 distinct REINFORCED blocks` | `test/q36-claude-implementer-md-reinforcements-consolidation.test.js` | Count grew past cap in later rounds | **Carry-forward** |
| `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set` | `test/q36-...` | Later allowed-sets widened beyond R36's | **Carry-forward** |
| `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set` | `test/q36-...` | Same root cause | **Carry-forward** |
| `R65 WU-Phase3-3B Tessera→DS feed adapter` (AC-R65-2 named in R77 spec § 1.6) | `test/q65-ds-integration-feed.test.js:94:26` | export-star line count drifted 3 → 5 | **Carry-forward** |
| `R66 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory` (AC-R66-14 named in R77 spec § 1.6) | `test/q66-ds-integration-event-consumer.test.js:246:26` | R66 ALLOWED_SET did not include `.gitignore` | **Carry-forward** |
| `AC-R77-17: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET` | `test/q77-detector-envelope.test.js:278:12` | R78 directive commit `3d00490` modified `coordination/NEXT-ROLE.md` (which IS in R77's ALLOWED_PATTERN) PLUS the R77 MU commit `f592737` previously added paths (`CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `coordination/logs/ROUND-R77-SUMMARY.md`) which were NOT in R77's ALLOWED_PATTERN. Same forward-protection class as R66 AC-R66-14. | **Carry-forward** — NOT addressed by R78 |

Post-R78 test-count predictions (Architect, computed BEFORE chore-A so the Implementer's chore-A run can be checked against these):

| State | tests | pass | fail | suites | skipped | cancelled | todo |
|---|---|---|---|---|---|---|---|
| Round-start HEAD (`3d00490`) | 566 | 556 | 6 | 3 | 4 | 0 | 0 |
| Predicted at R78 chore-A HEAD | 566 + N_new_R78 | 556 + N_new_R78 | 6 | 3 | 4 | 0 | 0 |

**Architect pre-prediction:** `N_new_R78 = 14` distinct `test()` blocks (one per AC; see § 4 AC table) → predicted post-chore-A tests=580, pass=570, fail=6. If the Implementer's actual count diverges from 14 by > 2, HALT per § 6 halt condition 4 (architectural-reality discovery) and report a DIAGNOSTIC with the actual count + the test-bodies that were added.

`npx tsc -p tsconfig.test.json` predicted exit code: **0** at chore-A (matches round-start baseline). If chore-A's actual exit code is non-zero, HALT per § 6.2.

---

## § 2. Component inventory

| Path | Type | New / Modified / Frozen |
|---|---|---|
| `tools/topology-walk-tuning.ts` | Tessera-original TS source | **NEW** |
| `scripts/topology-walk-tuning-recommendation.md` | Tessera-original written content | **NEW** |
| `coordination/coverage/R78-topology-walk-tuning-matrix.json` | Generated; committed | **NEW** |
| `coordination/coverage/R78-topology-walk-tuning.md` | Generated; committed | **NEW** |
| `package.json` | Project config | **MODIFIED** — add 2 script entries: `prebuild:topology-walk-tuning` + `topology-walk-tuning` |
| `README.md` | Project docs | **MODIFIED** — extend Coverage section (≤ 30 lines added at tail) |
| `test/q78-topology-walk-tuning.test.ts` | Tessera-original test | **NEW** |
| `coordination/specs/Q-R78-SPEC.md` | Spec | **NEW** (this file) |
| `coordination/specs/Q-R78-SPEC-AUDIT.md` | Spec audit sidecar | **NEW** |
| `coordination/specs/Q-R78-EMPIRICAL.sh` | Empirical verification script | **NEW** |
| `coordination/NEXT-ROLE.md` | Pipeline routing | **MODIFIED** — append routing block (preserves existing § R78 Round-scope directive byte-identically per within-round prefix-continuity invariant) |
| `coordination/MEMORIAL.md` | Memorial appends (each role appends own entries) | **MODIFIED** |
| `coordination/reviews/REVIEWER-REPORT-R78.md` | Reviewer-only | **NEW** (Reviewer creates) |
| `coordination/diagnostics/DIAGNOSTIC-R78-*.md` | Halt-condition artifact | **NEW IF HALT** (Implementer creates IF spec § 6 halt fires) |
| `coordination/logs/ROUND-R78-ROUTING.md` | Pipeline routing log (created by pipeline at dispatch) | **NEW** (pre-existing as untracked at Architect session entry; may be committed by pipeline) |
| ALL `engine/**/*.ts` | Engine source | **FROZEN** (Option (iii) — defer engine modification) |
| ALL `tools/*.ts` other than the 1 NEW above | Existing tools | **FROZEN** (`tools/coverage-saturation.ts`, `tools/detector-envelope.ts`, `tools/detection-curve.ts`, `tools/demo-scenario.ts`, `tools/build-canned-demos.ts`, `tools/curate-baseline-*.ts`) |
| ALL `scripts/*.ts` and existing `scripts/*.md` | Existing scripts | **FROZEN** (`scripts/tier-router*.ts`, `scripts/mu-model-select*.ts`, `scripts/build-role-context.ts`, `scripts/measure-cache-effect.ts`, `scripts/detector-tuning-recommendation.md`, `scripts/tier-router-criteria.md`) |
| `run-pipeline.sh` | Pipeline script | **FROZEN** (PR #39 pending per directive) |
| ALL `test/q*.test.ts` other than q78 | Existing tests | **FROZEN** (carry-forward fail set preserved) |
| ALL `test/_substrate/*` | Test substrate | **FROZEN** |
| `coordination/coverage/R72-*` | R72 outputs | **FROZEN** (anti-regression) |
| `coordination/coverage/R77-*` | R77 outputs | **FROZEN** (anti-regression) |
| ALL `coordination/specs/Q-R*-SPEC*.md` other than R78 | Prior specs | **FROZEN** |

---

## § 3. Per-file pseudocode

### 3.1 `tools/topology-walk-tuning.ts` (NEW; ~600-800 lines TS)

```ts
// tools/topology-walk-tuning.ts — Tessera R78 topology-walk tuning sweep runner.
//
// Characterizes the tuning envelope of the existing engine surface
// engine/topology/common-mode-attribution.ts along two dials:
//   max_hop_distance ∈ {1, 2, 3}
//   min_member_count ∈ {2, 3}
// over 5 scenario classes (POS-CZ-SPARSE, POS-CZ-FULL, POS-RACK-2,
// POS-RACK-3, NEG-INDEP) × 5 PRNG-seeded trials per cell.
//
// Engine option pick (Q-R78-SPEC § 0 + § 1): Option (iii) — DEFER engine
// modification. The sweep uses ONLY existing engine opts; no engine code is
// modified or extended. Operator-actionable tuning recommendation lives at
// scripts/topology-walk-tuning-recommendation.md.
//
// Deterministic (seeded LCG); idempotent. Re-running `pnpm topology-walk-
// tuning` produces byte-identical coordination/coverage/R78-* outputs.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.

// ── Engine import (.js extension; matches R72/R77 convention) ──
import {
  attributeCommonMode,
  type FiredShardEvent,
  type CommonModeAttributionResult,
} from '../engine/topology/common-mode-attribution.js';
import type {
  TopologySnapshot, TopologyNode, TopologyEdge,
} from '../engine/types/verdict.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public exported types ──
export type ScenarioClass =
  | 'POS-CZ-SPARSE' | 'POS-CZ-FULL' | 'POS-RACK-2' | 'POS-RACK-3' | 'NEG-INDEP';
export const SCENARIO_CLASSES: ReadonlyArray<ScenarioClass> = [
  'POS-CZ-SPARSE', 'POS-CZ-FULL', 'POS-RACK-2', 'POS-RACK-3', 'NEG-INDEP',
];
export const HOPS: ReadonlyArray<1 | 2 | 3> = [1, 2, 3];
export const MINS: ReadonlyArray<2 | 3>     = [2, 3];
export const TRIALS_PER_CELL = 5;
export const TOTAL_CELLS  = 30;  // 5 × 3 × 2
export const TOTAL_TRIALS = 150; // 30 × 5

const SCENARIO_SEED_PREFIX = 0x78A11; // 494097 decimal — recorded in matrix JSON
const NEG_INDEP_BERNOULLI_P = 0.2;

// ── Topology fixture (re-declared; matches R72 build2RackCzTopology() exactly) ──
const RACK_A_SHARDS = ['shard-00', 'shard-01', 'shard-02'] as const;
const RACK_B_SHARDS = ['shard-03', 'shard-04', 'shard-05'] as const;
const ALL_SHARDS    = [...RACK_A_SHARDS, ...RACK_B_SHARDS] as const;

function buildTopology(): TopologySnapshot {
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
  return {
    nodes, edges, fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-r78-synthetic-cz', source_version: 'v1',
  };
}

// ── LCG + scenario primitives (re-implemented; NOT imported from R72/R77 tools) ──
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function pickFromArray<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)];
}
function shuffleTakeFromArray<T>(rng: () => number, arr: ReadonlyArray<T>, n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function generateScenarioInstance(
  scenario_class: ScenarioClass, rng: () => number,
): string[] {
  switch (scenario_class) {
    case 'POS-CZ-SPARSE':
      return [pickFromArray(rng, RACK_A_SHARDS), pickFromArray(rng, RACK_B_SHARDS)];
    case 'POS-CZ-FULL':
      return [
        ...shuffleTakeFromArray(rng, RACK_A_SHARDS, 2),
        ...shuffleTakeFromArray(rng, RACK_B_SHARDS, 2),
      ];
    case 'POS-RACK-2': {
      const rackChoice = rng() < 0.5 ? RACK_A_SHARDS : RACK_B_SHARDS;
      return shuffleTakeFromArray(rng, rackChoice, 2);
    }
    case 'POS-RACK-3':
      return rng() < 0.5 ? RACK_A_SHARDS.slice() : RACK_B_SHARDS.slice();
    case 'NEG-INDEP':
      return ALL_SHARDS.filter(_ => rng() < NEG_INDEP_BERNOULLI_P);
  }
}

// ── Per-trial outcome classification ──
interface TrialClassification {
  cz_fired: boolean;
  rack_fired: boolean;
  shadow_rack_fp: boolean;
  cz_member_count: number | null;
  rack_candidate_count: number;
}
function classifyOutcome(
  result: CommonModeAttributionResult, fired_set: readonly string[],
): TrialClassification {
  const cz = result.candidates.find(
    c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1',
  );
  const racks = result.candidates.filter(c => c.shared_node_kind === 'rack');
  let shadow_rack_fp = false;
  for (const rc of racks) {
    const expected = rc.shared_node_id === 'rack-A'
      ? new Set<string>(RACK_A_SHARDS)
      : new Set<string>(RACK_B_SHARDS);
    if (rc.member_shard_ids.some(sid => !expected.has(sid))) {
      shadow_rack_fp = true; break;
    }
  }
  return {
    cz_fired: cz !== undefined,
    rack_fired: racks.length > 0,
    shadow_rack_fp,
    cz_member_count: cz ? cz.member_count : null,
    rack_candidate_count: racks.length,
  };
}

// ── Internal types (matrix shape) ──
interface TrialRow {
  trial_idx: number;
  seed: number;
  fired_set: readonly string[];
  classification: TrialClassification;
  candidates: ReadonlyArray<{
    shared_node_id: string;
    shared_node_kind: 'psu' | 'rack' | 'cooling_zone';
    member_count: number;
    member_shard_ids: readonly string[];
  }>;
}
interface CellRow {
  cell_idx: number;
  params: { scenario_class: ScenarioClass; max_hop_distance: 1 | 2 | 3; min_member_count: 2 | 3 };
  summary: {
    cz_detection_count: number;
    rack_detection_count: number;
    shadow_rack_fp_count: number;
  };
  trials: ReadonlyArray<TrialRow>;
}
interface TopologyWalkTuningMatrix {
  schema_version: 'tessera-topology-walk-tuning-v1';
  generated_with_seed_prefix: number;
  parameter_grid: {
    scenario_classes: ReadonlyArray<ScenarioClass>;
    hops: ReadonlyArray<number>;
    mins: ReadonlyArray<number>;
    trials_per_cell: number;
  };
  topology_summary: {
    nodes_count: 9; edges_count: 8;
    cz_node_id: 'cz-1'; rack_node_ids: readonly ['rack-A', 'rack-B'];
    rack_a_shards: readonly string[]; rack_b_shards: readonly string[];
  };
  cells: ReadonlyArray<CellRow>;
}

// ── Per-trial runner ──
function runSingleTrial(
  scenario_class: ScenarioClass, hop: 1 | 2 | 3, min: 2 | 3,
  cell_idx: number, trial_idx: number, snapshot: TopologySnapshot,
): TrialRow {
  const seed = (SCENARIO_SEED_PREFIX ^ (cell_idx * TRIALS_PER_CELL + trial_idx)) >>> 0;
  const rng = makeLcg(seed);
  const fired_set = generateScenarioInstance(scenario_class, rng);
  const events: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid, event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r78-c${cell_idx}-t${trial_idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: events, snapshot,
    opts: { max_hop_distance: hop, min_member_count: min, now: () => 1_700_000_200 },
  });
  const classification = classifyOutcome(result, fired_set);
  return {
    trial_idx, seed, fired_set,
    classification,
    candidates: result.candidates.map(c => ({
      shared_node_id: c.shared_node_id,
      shared_node_kind: c.shared_node_kind,
      member_count: c.member_count,
      member_shard_ids: c.member_shard_ids,
    })),
  };
}

// ── Cell aggregator + matrix builder ──
function aggregateCellSummary(trials: ReadonlyArray<TrialRow>): CellRow['summary'] {
  return {
    cz_detection_count:   trials.filter(t => t.classification.cz_fired).length,
    rack_detection_count: trials.filter(t => t.classification.rack_fired).length,
    shadow_rack_fp_count: trials.filter(t => t.classification.shadow_rack_fp).length,
  };
}
function buildMatrix(snapshot: TopologySnapshot): TopologyWalkTuningMatrix {
  const cells: CellRow[] = [];
  let cell_idx = 0;
  for (const sc of SCENARIO_CLASSES) {
    for (const hop of HOPS) {
      for (const min of MINS) {
        const trials: TrialRow[] = [];
        for (let ti = 0; ti < TRIALS_PER_CELL; ti++) {
          trials.push(runSingleTrial(sc, hop, min, cell_idx, ti, snapshot));
        }
        cells.push({
          cell_idx,
          params: { scenario_class: sc, max_hop_distance: hop, min_member_count: min },
          summary: aggregateCellSummary(trials),
          trials,
        });
        cell_idx += 1;
      }
    }
  }
  return {
    schema_version: 'tessera-topology-walk-tuning-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    parameter_grid: {
      scenario_classes: SCENARIO_CLASSES, hops: HOPS, mins: MINS,
      trials_per_cell: TRIALS_PER_CELL,
    },
    topology_summary: {
      nodes_count: 9, edges_count: 8,
      cz_node_id: 'cz-1', rack_node_ids: ['rack-A', 'rack-B'],
      rack_a_shards: RACK_A_SHARDS, rack_b_shards: RACK_B_SHARDS,
    },
    cells,
  };
}

// ── Markdown renderer ──
function renderMatrixMd(matrix: TopologyWalkTuningMatrix): string {
  const L: string[] = [];
  L.push('# Tessera R78 — topology-walk tuning envelope matrix');
  L.push('');
  L.push('Generated by `tools/topology-walk-tuning.ts`; deterministic; idempotent. Full machine-readable data: `R78-topology-walk-tuning-matrix.json`.');
  L.push('');
  L.push(`Parameter grid: ${matrix.parameter_grid.scenario_classes.length} scenario classes × ${matrix.parameter_grid.hops.length} max_hop_distance values × ${matrix.parameter_grid.mins.length} min_member_count values × ${matrix.parameter_grid.trials_per_cell} trials = ${matrix.cells.length} cells.`);
  L.push('');
  L.push('Topology fixture: 1 cooling_zone (`cz-1`) → 2 racks (`rack-A`, `rack-B`) → 3 shards each. Matches `tools/coverage-saturation.ts:build2RackCzTopology()` exactly.');
  L.push('');
  L.push('## Per-scenario summary (5 trials per cell)');
  L.push('');
  for (const sc of matrix.parameter_grid.scenario_classes) {
    L.push(`### ${sc}`);
    L.push('');
    L.push('| max_hop | min_member | cz_detection / 5 | rack_detection / 5 | shadow_rack_fp / 5 |');
    L.push('|---|---|---|---|---|');
    for (const cell of matrix.cells.filter(c => c.params.scenario_class === sc)) {
      L.push(`| ${cell.params.max_hop_distance} | ${cell.params.min_member_count} | ${cell.summary.cz_detection_count}/5 | ${cell.summary.rack_detection_count}/5 | ${cell.summary.shadow_rack_fp_count}/5 |`);
    }
    L.push('');
  }
  L.push('## Method');
  L.push('');
  L.push('Each cell runs 5 deterministic trials seeded by `(SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx))`. Each trial generates a fired_set via the scenario class\'s deterministic generator, then calls `attributeCommonMode` with the cell\'s `(max_hop_distance, min_member_count)`. The classification distinguishes (a) cz-1 cooling_zone detection, (b) any rack detection, (c) shadow_rack_fp (rack candidate with member_shard_ids containing a shard NOT in that rack — a structural false-positive at hop≥3). No engine modifications; no new dependencies. Re-running `pnpm topology-walk-tuning` produces byte-identical output. Engine option pick: (iii) — DEFER engine modification (see Q-R78-SPEC § 0).');
  L.push('');
  return L.join('\n');
}

// ── Serialization + public entry point ──
function serializeJson(matrix: TopologyWalkTuningMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

export interface TuningRunResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_cells: 30;
  total_trials: 150;
}
export function runTopologyWalkTuning(): TuningRunResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coordination', 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const snapshot = buildTopology();
  const matrix = buildMatrix(snapshot);
  const jsonStr = serializeJson(matrix);
  const mdStr   = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R78-topology-walk-tuning-matrix.json');
  const mdPath   = path.join(coverageDir, 'R78-topology-walk-tuning.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath,   mdStr);
  return {
    matrix_json_path: jsonPath, matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_cells: 30, total_trials: 150,
  };
}

// ── CLI guard (matches R72/R77 convention) ──
if (require.main === module) {
  const r = runTopologyWalkTuning();
  process.stdout.write(
    `Built topology-walk tuning matrix: ${r.total_cells} cells, ${r.total_trials} trials.\n` +
    `JSON: ${path.relative(process.cwd(), r.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), r.matrix_md_path)}\n`,
  );
  process.exit(0);
}
```

### 3.2 `scripts/topology-walk-tuning-recommendation.md` (NEW; ~120-200 lines MD; written content)

```markdown
# Topology-walk tuning recommendations — Tessera topology-walk envelope (R78)

This document is the operator-facing companion to the empirical envelope
matrix at `coordination/coverage/R78-topology-walk-tuning-matrix.json` +
`R78-topology-walk-tuning.md`.

## Empirical envelope (what the sweep shows)

[Implementer authors 5-10 sentences citing specific cells from the R78
matrix at HEAD — see § 1.4 of Q-R78-SPEC.md for the pre-prediction cells.
Per R71 MAJOR-1 reinforcement: do NOT pre-author the empirical narrative
text; the Implementer reads the matrix at write-time. The Implementer's
content MUST address each of these required points by cell citation:
 (a) at max_hop_distance=1: cz_detection_count for POS-CZ-SPARSE (cells 0/1)
     and POS-CZ-FULL (cells 6/7) — note the structural cz-unreachability;
 (b) at max_hop_distance=2 + min_member_count=2: cz_detection_count for
     POS-CZ-SPARSE (cell 2) and POS-CZ-FULL (cell 8) — the recommended
     default for CZ-aware operators;
 (c) at max_hop_distance=2 + min_member_count=3: cz_detection_count for
     POS-CZ-SPARSE (cell 3) drops to 0 — the FP-tightening trade-off;
 (d) the shadow_rack_fp_count at max_hop_distance=3 (cells 4, 10, 11, 16,
     22, 23, 28) — the un-fired-rack-attribution failure mode that
     disqualifies hop=3 for 2-tier topologies;
 (e) NEG-INDEP FP-rate at each (hop, min) combination — operator-visible
     false-positive budget.]

## Tuning levers operators can adjust

Two levers are operator-visible (no engine modification required — Option
(iii) per Q-R78-SPEC § 0):

1. **`max_hop_distance`** — BFS depth from each fired shard.
   - `1` (Tessera default): rack-level attribution only; structurally misses
     cooling_zone-attributed common-modes.
   - `2`: catches cooling_zone common-modes; no shadow-rack FP at 2-tier
     topologies; introduces moderate FP-rate on random firings.
   - `3` (or higher): introduces shadow-rack FP — BFS propagates through
     cooling_zone back down to the OTHER rack's shards, surfacing the
     un-fired rack as a candidate. **NOT RECOMMENDED for 2-tier topologies.**

2. **`min_member_count`** — minimum distinct fired shards required to
   surface a candidate at any kind.
   - `2` (Tessera default): catches sparse common-modes (2-shard cross-rack
     events); permissive FP on noise.
   - `3`: requires ≥3 fired shards; misses 2-shard sparse cross-rack events
     but tightens FP-rate, including suppressing some shadow-rack FP at
     hop=3.

## Recommended operator defaults (matrix-derived)

| Cluster topology class | Recommended (hop, min) | Trade-off |
|---|---|---|
| 1-tier (rack only — Tessera default substrate) | `(1, 2)` | Tessera ships this — rack attribution only; no cz support needed |
| 2-tier with shared cooling-zone (R72 / R78 substrate) | `(2, 2)` | Catches all CZ events including 2-shard sparse; accepts ~20% FP on independent noise |
| 2-tier with strict FP budget | `(2, 3)` | Misses 2-shard sparse CZ events; tightens FP suppression |
| 3+ tier (deeper switch hierarchies) | OUT OF R78 SCOPE | See § 5.3 acknowledged gap; characterize per cluster |

## Theoretical attribution floor (cannot cross)

The current `attributeCommonMode` surface ([engine/topology/common-mode-
attribution.ts](../engine/topology/common-mode-attribution.ts)) walks an
undirected BFS to bounded hop-distance, then surfaces every node of an
eligible kind with ≥`min_member_count` distinct fired-shard touches. The
structural limits at the 2-rack-1-cz topology:
- hop=1: cz is at hop=2 — cannot surface regardless of `min_member_count`.
- hop=3+: BFS reaches the other rack via cz; surfaces un-fired racks. No
  operator dial inside the existing engine can suppress this (option (iii)
  defers a per-kind cap mechanism; see § How to use this document below).

## How to use this document

[Implementer authors operator-facing usage guidance: cite the matrix's
machine-readable JSON path; explain that `engine/topology/common-mode-
attribution.ts:DEFAULT_MAX_HOP_DISTANCE` and `DEFAULT_MIN_MEMBER_COUNT` are
the global defaults and that per-call opts override; cross-link to the R72
saturation matrix that surfaced gap 2; describe how a future Tessera
release could supersede this recommendation if a Phase 5 engine option
adds per-kind threshold control (Option (i)/(ii) deferred per Q-R78-SPEC
§ 0).]
```

### 3.3 `test/q78-topology-walk-tuning.test.ts` (NEW; ~400-600 lines TS)

```ts
// test/q78-topology-walk-tuning.test.ts — R78 binding tests.
//
// Verifies: matrix structure + per-cell exact-count ACs (deterministic
// 30-cell × 5-trial matrix at SEED_PREFIX=0x78A11) + anti-regression +
// recommendation document + anti-scope.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT  = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(REPO_ROOT, 'coordination', 'coverage');
const MATRIX_JSON  = path.join(COVERAGE_DIR, 'R78-topology-walk-tuning-matrix.json');
const MATRIX_MD    = path.join(COVERAGE_DIR, 'R78-topology-walk-tuning.md');
const REC_MD       = path.join(REPO_ROOT, 'scripts', 'topology-walk-tuning-recommendation.md');
const TUNER_TS     = path.join(REPO_ROOT, 'tools', 'topology-walk-tuning.ts');

const ROUND_START_SHA = '3d00490';

interface Trial {
  trial_idx: number; seed: number; fired_set: string[];
  classification: { cz_fired: boolean; rack_fired: boolean; shadow_rack_fp: boolean;
                    cz_member_count: number | null; rack_candidate_count: number };
  candidates: Array<{ shared_node_id: string; shared_node_kind: string;
                      member_count: number; member_shard_ids: string[] }>;
}
interface Cell {
  cell_idx: number;
  params: { scenario_class: string; max_hop_distance: number; min_member_count: number };
  summary: { cz_detection_count: number; rack_detection_count: number; shadow_rack_fp_count: number };
  trials: Trial[];
}
interface Matrix {
  schema_version: string; generated_with_seed_prefix: number;
  parameter_grid: { scenario_classes: string[]; hops: number[]; mins: number[]; trials_per_cell: number };
  topology_summary: { nodes_count: number; edges_count: number;
                      cz_node_id: string; rack_node_ids: string[];
                      rack_a_shards: string[]; rack_b_shards: string[] };
  cells: Cell[];
}

function loadMatrix(): Matrix {
  assert.ok(fs.existsSync(MATRIX_JSON), `matrix JSON not present at ${MATRIX_JSON}`);
  return JSON.parse(fs.readFileSync(MATRIX_JSON, 'utf8')) as Matrix;
}

// ── AC-R78-1: tools/topology-walk-tuning.ts file exists ──
test('AC-R78-1: tools/topology-walk-tuning.ts exists', () => {
  assert.ok(fs.existsSync(TUNER_TS));
});

// ── AC-R78-2: matrix.json + matrix.md exist after `pnpm topology-walk-tuning` ──
test('AC-R78-2: matrix JSON + MD exist', () => {
  assert.ok(fs.existsSync(MATRIX_JSON));
  assert.ok(fs.existsSync(MATRIX_MD));
});

// ── AC-R78-3: matrix schema_version + cell count ──
test('AC-R78-3: matrix schema + cell count', () => {
  const m = loadMatrix();
  assert.strictEqual(m.schema_version, 'tessera-topology-walk-tuning-v1');
  assert.strictEqual(m.cells.length, 30);
});

// ── AC-R78-4: topology shape (9 nodes, 8 edges; cz-1 + 2 racks + 6 shards) ──
test('AC-R78-4: topology summary matches R72 build2RackCzTopology shape', () => {
  const m = loadMatrix();
  assert.strictEqual(m.topology_summary.nodes_count, 9);
  assert.strictEqual(m.topology_summary.edges_count, 8);
  assert.strictEqual(m.topology_summary.cz_node_id, 'cz-1');
  assert.deepStrictEqual([...m.topology_summary.rack_node_ids].sort(), ['rack-A', 'rack-B']);
  assert.deepStrictEqual([...m.topology_summary.rack_a_shards].sort(),
                          ['shard-00', 'shard-01', 'shard-02']);
  assert.deepStrictEqual([...m.topology_summary.rack_b_shards].sort(),
                          ['shard-03', 'shard-04', 'shard-05']);
});

// ── AC-R78-5: per-cell exact-equality on (cz_count, rack_count, shadow_fp_count)
//                for ALL 30 cells per § 1.4 pre-prediction matrix ──
test('AC-R78-5: per-cell exact-equality matches Architect pre-prediction', () => {
  const m = loadMatrix();
  // Encoded as [cell_idx, scenario, hop, min, cz, rack, shadow]
  const EXPECTED: Array<[number, string, number, number, number, number, number]> = [
    [ 0, 'POS-CZ-SPARSE', 1, 2, 0, 0, 0],
    [ 1, 'POS-CZ-SPARSE', 1, 3, 0, 0, 0],
    [ 2, 'POS-CZ-SPARSE', 2, 2, 5, 0, 0],
    [ 3, 'POS-CZ-SPARSE', 2, 3, 0, 0, 0],
    [ 4, 'POS-CZ-SPARSE', 3, 2, 5, 5, 5],
    [ 5, 'POS-CZ-SPARSE', 3, 3, 0, 0, 0],
    [ 6, 'POS-CZ-FULL',   1, 2, 0, 5, 0],
    [ 7, 'POS-CZ-FULL',   1, 3, 0, 0, 0],
    [ 8, 'POS-CZ-FULL',   2, 2, 5, 5, 0],
    [ 9, 'POS-CZ-FULL',   2, 3, 5, 0, 0],
    [10, 'POS-CZ-FULL',   3, 2, 5, 5, 5],
    [11, 'POS-CZ-FULL',   3, 3, 5, 5, 5],
    [12, 'POS-RACK-2',    1, 2, 0, 5, 0],
    [13, 'POS-RACK-2',    1, 3, 0, 0, 0],
    [14, 'POS-RACK-2',    2, 2, 5, 5, 0],
    [15, 'POS-RACK-2',    2, 3, 0, 0, 0],
    [16, 'POS-RACK-2',    3, 2, 5, 5, 5],
    [17, 'POS-RACK-2',    3, 3, 0, 0, 0],
    [18, 'POS-RACK-3',    1, 2, 0, 5, 0],
    [19, 'POS-RACK-3',    1, 3, 0, 5, 0],
    [20, 'POS-RACK-3',    2, 2, 5, 5, 0],
    [21, 'POS-RACK-3',    2, 3, 5, 5, 0],
    [22, 'POS-RACK-3',    3, 2, 5, 5, 5],
    [23, 'POS-RACK-3',    3, 3, 5, 5, 5],
    [24, 'NEG-INDEP',     1, 2, 0, 2, 0],
    [25, 'NEG-INDEP',     1, 3, 0, 0, 0],
    [26, 'NEG-INDEP',     2, 2, 1, 1, 0],
    [27, 'NEG-INDEP',     2, 3, 1, 0, 0],
    [28, 'NEG-INDEP',     3, 2, 1, 1, 1],
    [29, 'NEG-INDEP',     3, 3, 0, 0, 0],
  ];
  for (const [idx, sc, hop, min, cz, rack, shadow] of EXPECTED) {
    const cell = m.cells.find(c => c.cell_idx === idx);
    assert.ok(cell, `cell_idx=${idx} missing`);
    assert.strictEqual(cell.params.scenario_class, sc, `cell ${idx} scenario_class`);
    assert.strictEqual(cell.params.max_hop_distance, hop, `cell ${idx} hop`);
    assert.strictEqual(cell.params.min_member_count, min, `cell ${idx} min`);
    assert.strictEqual(cell.summary.cz_detection_count,   cz,     `cell ${idx} cz_count`);
    assert.strictEqual(cell.summary.rack_detection_count, rack,   `cell ${idx} rack_count`);
    assert.strictEqual(cell.summary.shadow_rack_fp_count, shadow, `cell ${idx} shadow_count`);
  }
});

// ── AC-R78-6: per-cell trials.length === 5 for every cell ──
test('AC-R78-6: every cell has 5 trials', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    assert.strictEqual(cell.trials.length, 5, `cell ${cell.cell_idx} trials.length`);
  }
});

// ── AC-R78-7: seed_prefix recorded as 0x78A11 (494097 decimal) ──
test('AC-R78-7: SEED_PREFIX === 0x78A11', () => {
  const m = loadMatrix();
  assert.strictEqual(m.generated_with_seed_prefix, 0x78A11);
});

// ── AC-R78-8: shadow_rack_fp NEVER fires at hop ≤ 2 (structural invariant) ──
test('AC-R78-8: shadow_rack_fp_count === 0 for all cells with hop ≤ 2', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    if (cell.params.max_hop_distance <= 2) {
      assert.strictEqual(cell.summary.shadow_rack_fp_count, 0,
        `cell ${cell.cell_idx} (hop=${cell.params.max_hop_distance}) should have 0 shadow_rack_fp`);
    }
  }
});

// ── AC-R78-9: at hop=1, POS-CZ-* cz_detection_count === 0 (structural — cz unreachable) ──
test('AC-R78-9: cz unreachable at hop=1 (POS-CZ-SPARSE cells 0,1 + POS-CZ-FULL cells 6,7)', () => {
  const m = loadMatrix();
  for (const cell of m.cells) {
    if (cell.params.max_hop_distance === 1
        && (cell.params.scenario_class === 'POS-CZ-SPARSE'
            || cell.params.scenario_class === 'POS-CZ-FULL')) {
      assert.strictEqual(cell.summary.cz_detection_count, 0,
        `cell ${cell.cell_idx} (hop=1, ${cell.params.scenario_class}) cz must be 0`);
    }
  }
});

// ── AC-R78-10: matrix MD contains the 5 per-scenario sections ──
test('AC-R78-10: matrix MD has 5 per-scenario sections + Method', () => {
  const md = fs.readFileSync(MATRIX_MD, 'utf8');
  for (const sc of ['POS-CZ-SPARSE', 'POS-CZ-FULL', 'POS-RACK-2', 'POS-RACK-3', 'NEG-INDEP']) {
    assert.ok(md.includes(`### ${sc}`), `matrix MD missing ### ${sc}`);
  }
  assert.ok(md.includes('## Method'));
});

// ── AC-R78-11: scripts/topology-walk-tuning-recommendation.md has all 5 required sections ──
test('AC-R78-11: recommendation MD has all required sections', () => {
  const md = fs.readFileSync(REC_MD, 'utf8');
  const REQUIRED = [
    '## Empirical envelope',
    '## Tuning levers operators can adjust',
    '## Recommended operator defaults',
    '## Theoretical attribution floor',
    '## How to use this document',
  ];
  for (const sec of REQUIRED) {
    assert.ok(md.includes(sec), `recommendation MD missing section: ${sec}`);
  }
});

// ── AC-R78-12: anti-regression — R72 saturation matrix files byte-identical to round-start ──
test('AC-R78-12: R72 saturation matrix outputs byte-identical to round-start', () => {
  const diff = execFileSync('git', [
    'diff', ROUND_START_SHA, 'HEAD', '--',
    'coordination/coverage/R72-saturation-matrix.json',
    'coordination/coverage/R72-saturation-matrix.md',
  ], { encoding: 'utf8' });
  assert.strictEqual(diff, '', `R72 outputs modified:\n${diff}`);
});

// ── AC-R78-13: anti-regression — R77 detector-envelope outputs byte-identical to round-start ──
test('AC-R78-13: R77 detector-envelope outputs byte-identical to round-start', () => {
  const diff = execFileSync('git', [
    'diff', ROUND_START_SHA, 'HEAD', '--',
    'coordination/coverage/R77-detection-envelope-matrix.json',
    'coordination/coverage/R77-detection-envelope.md',
    'tools/detector-envelope.ts',
    'tools/detection-curve.ts',
    'scripts/detector-tuning-recommendation.md',
  ], { encoding: 'utf8' });
  assert.strictEqual(diff, '', `R77 outputs modified:\n${diff}`);
});

// ── AC-R78-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET ──
test('AC-R78-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  let diffOut = '';
  try {
    diffOut = execFileSync('git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'],
                            { encoding: 'utf8' });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    diffOut = (e.stdout ?? '') + (e.stderr ?? '');
  }
  const ALLOWED = /^(tools\/topology-walk-tuning\.ts|scripts\/topology-walk-tuning-recommendation\.md|coordination\/coverage\/R78-topology-walk-tuning-matrix\.json|coordination\/coverage\/R78-topology-walk-tuning\.md|package\.json|README\.md|test\/q78-topology-walk-tuning\.test\.ts|coordination\/specs\/Q-R78-SPEC\.md|coordination\/specs\/Q-R78-SPEC-AUDIT\.md|coordination\/specs\/Q-R78-EMPIRICAL\.sh|coordination\/NEXT-ROLE\.md|coordination\/MEMORIAL\.md|coordination\/reviews\/REVIEWER-REPORT-R78\.md|coordination\/logs\/ROUND-R78-ROUTING\.md|coordination\/logs\/ROUND-R78-SUMMARY\.md|coordination\/diagnostics\/DIAGNOSTIC-R78-.*\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$/;
  const diffFiles = diffOut.split('\n').map(l => l.trim()).filter(Boolean);
  const unauthorized = diffFiles.filter(f => !ALLOWED.test(f));
  assert.strictEqual(unauthorized.length, 0,
    `Unauthorized paths in round-start..HEAD diff:\n${unauthorized.join('\n')}`);
});
```

---

## § 4. Acceptance criteria

ALL ACs are bound to deterministic outputs at the spec-pinned `SEED_PREFIX = 0x78A11` per § 1.4 pre-prediction matrix. The Implementer's chore-A binding-command run MUST produce the exact 30-cell matrix in § 1.4. Each AC below is a `test()` block in `test/q78-topology-walk-tuning.test.ts`.

| AC ID | Given | When | Then | Test ref |
|---|---|---|---|---|
| AC-R78-1 | the R78 chore-A commit | the test runs | `tools/topology-walk-tuning.ts` exists on disk | § 3.3 `test('AC-R78-1')` |
| AC-R78-2 | `pnpm topology-walk-tuning` has run successfully | the test runs | `coordination/coverage/R78-topology-walk-tuning-matrix.json` AND `R78-topology-walk-tuning.md` both exist | § 3.3 `test('AC-R78-2')` |
| AC-R78-3 | the matrix JSON | parsed | `schema_version === 'tessera-topology-walk-tuning-v1'` AND `cells.length === 30` | § 3.3 `test('AC-R78-3')` |
| AC-R78-4 | the matrix JSON's `topology_summary` | inspected | `nodes_count === 9`, `edges_count === 8`, `cz_node_id === 'cz-1'`, `rack_node_ids === ['rack-A','rack-B']`, `rack_a_shards === ['shard-00','shard-01','shard-02']`, `rack_b_shards === ['shard-03','shard-04','shard-05']` | § 3.3 `test('AC-R78-4')` |
| AC-R78-5 | the matrix JSON's 30 cells | inspected against § 1.4 pre-prediction table | every (cell_idx, scenario_class, max_hop_distance, min_member_count, cz_detection_count, rack_detection_count, shadow_rack_fp_count) tuple matches verbatim | § 3.3 `test('AC-R78-5')` |
| AC-R78-6 | each of the 30 cells | inspected | `trials.length === 5` | § 3.3 `test('AC-R78-6')` |
| AC-R78-7 | the matrix JSON | inspected | `generated_with_seed_prefix === 0x78A11` (494097 decimal) | § 3.3 `test('AC-R78-7')` |
| AC-R78-8 | every cell with `max_hop_distance ≤ 2` | inspected | `summary.shadow_rack_fp_count === 0` (structural invariant — shadow FP requires hop ≥ 3 to propagate through cz) | § 3.3 `test('AC-R78-8')` |
| AC-R78-9 | every cell with `max_hop_distance === 1` AND `scenario_class ∈ {POS-CZ-SPARSE, POS-CZ-FULL}` | inspected | `summary.cz_detection_count === 0` (cz at hop=2 from every shard; structurally unreachable) | § 3.3 `test('AC-R78-9')` |
| AC-R78-10 | the matrix MD | grep'd | contains `### POS-CZ-SPARSE`, `### POS-CZ-FULL`, `### POS-RACK-2`, `### POS-RACK-3`, `### NEG-INDEP`, AND `## Method` | § 3.3 `test('AC-R78-10')` |
| AC-R78-11 | `scripts/topology-walk-tuning-recommendation.md` | grep'd | contains `## Empirical envelope`, `## Tuning levers operators can adjust`, `## Recommended operator defaults`, `## Theoretical attribution floor`, `## How to use this document` | § 3.3 `test('AC-R78-11')` |
| AC-R78-12 | `coordination/coverage/R72-saturation-matrix.json` + `R72-saturation-matrix.md` at HEAD | compared to round-start `3d00490` | `git diff` is empty (byte-identical) | § 3.3 `test('AC-R78-12')` |
| AC-R78-13 | the R77 detector-envelope outputs (matrix JSON+MD, detector-envelope.ts, detection-curve.ts, detector-tuning-recommendation.md) at HEAD | compared to round-start `3d00490` | `git diff` is empty (byte-identical) | § 3.3 `test('AC-R78-13')` |
| AC-R78-14 | the chore-A HEAD commit | `git diff round-start..HEAD --name-only` taken | every changed path matches the ALLOWED_SET regex (no unauthorized paths) | § 3.3 `test('AC-R78-14')` |

**ALLOWED_SET (anti-scope; AC-R78-14):**

```
tools/topology-walk-tuning.ts
scripts/topology-walk-tuning-recommendation.md
coordination/coverage/R78-topology-walk-tuning-matrix.json
coordination/coverage/R78-topology-walk-tuning.md
package.json
README.md
test/q78-topology-walk-tuning.test.ts
coordination/specs/Q-R78-SPEC.md
coordination/specs/Q-R78-SPEC-AUDIT.md
coordination/specs/Q-R78-EMPIRICAL.sh
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
coordination/reviews/REVIEWER-REPORT-R78.md
coordination/logs/ROUND-R78-ROUTING.md
coordination/logs/ROUND-R78-SUMMARY.md
coordination/diagnostics/DIAGNOSTIC-R78-*.md
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
CLAUDE-REVIEWER.md
CLAUDE-MEMORIAL.md
CLAUDE-COMMON.md
CLAUDE-COORDINATOR.md
```

**CLAUDE-*.md inclusion rationale:** Per R66/R77 forward-protection lesson (R77 AC-R77-17 fails at HEAD because R77 MU appended to CLAUDE-ARCHITECT.md and CLAUDE-IMPLEMENTER.md and those paths were not in R77's ALLOWED_PATTERN), the R78 ALLOWED_SET includes ALL five CLAUDE-<ROLE>.md files plus CLAUDE-COMMON.md and CLAUDE-COORDINATOR.md upfront so the R78 MU's reinforcement appends do not retroactively break AC-R78-14 at next-round HEAD. Also includes `coordination/logs/ROUND-R78-SUMMARY.md` for the same forward-protection reason (R77 MU committed `ROUND-R77-SUMMARY.md`).

**Halt-condition 8 in directive:** "False-positive rate exceeds Architect-specified threshold at any tested depth: HALT + DIAGNOSTIC." Architect-specified per-cell FP threshold = the exact `shadow_rack_fp_count` value in the § 1.4 pre-prediction table for that cell. AC-R78-5 binds these exactly; AC-R78-8 binds the structural invariant separately. If the Implementer's actual `shadow_rack_fp_count` at any cell EXCEEDS the predicted value, AC-R78-5 fails AND the Implementer HALTs per § 6 halt-condition 8.

---

## § 5. Anti-scope

### 5.1 Files NOT permitted to change

ALL of:
- `engine/**/*.ts` (Phase 3 frozen per directive; Option (iii) defers engine modification)
- `tools/coverage-saturation.ts` (R72 frozen)
- `tools/detector-envelope.ts` + `tools/detection-curve.ts` (R77 frozen)
- `tools/demo-scenario.ts` + `tools/build-canned-demos.ts` (R70/R71 frozen)
- `tools/curate-baseline-pipeline.ts` + `tools/curate-baseline-pre-pass.ts` + `tools/curate-baseline-fleet-correlated.ts` (frozen)
- `scripts/tier-router*.ts` + `scripts/mu-model-select*.ts` + `scripts/build-role-context.ts` + `scripts/measure-cache-effect.ts` + `scripts/detector-envelope.ts` patterns / `scripts/detector-tuning-recommendation.md` + `scripts/tier-router-criteria.md` (R73-R75 + R77 frozen)
- `run-pipeline.sh` (PR #39 pending per directive)
- ALL prior `test/q01..q77*.test.ts` files (frozen carry-forward fail set preserved)
- ALL `test/_substrate/*` (frozen)
- ALL `coordination/specs/Q-R*-SPEC*.md` other than R78
- `coordination/coverage/R72-*` + `coordination/coverage/R77-*` (anti-regression)
- `demos/*` (frozen)
- `coordination/PRD.md` (frozen; OPT-IN Phase 3+ amendments per operator)
- `coordination/SCOPING-MEMO-v0.3.md` (frozen)
- `coordination/CROSS-PROJECT-MEMORIAL.md` (operator-curated; not Architect-modified)
- ALL `package-lock.json` / `pnpm-lock.yaml` / `node_modules/*` (no dependency churn)
- ALL `.github/*` (CI frozen)
- `.gitignore` (frozen)
- ALL files outside the ALLOWED_SET enumerated in § 4

### 5.2 Behaviors NOT in scope

- No engine modifications (Option (iii) picked; Option (i)/(ii) defer to Phase 5 per directive)
- No new external dependencies
- No real-cluster work
- No DS-repo modifications
- No `gh repo` / GitHub PR operations
- No methodology framework changes
- No new tier-routing / Memorial-Updater / Architect-cache changes (R73-R75 frozen)
- No carry-forward AC fail-set modification (5 carry-forward + AC-R77-17 = 6 must remain failing)
- No vendored-with-deltas transitions
- No deeper-topology fixture beyond the 2-rack-1-cz shape (3+ tier hierarchies out of R78 scope per § 5.3)

### 5.3 Acknowledged AC gaps (R74 MINOR-2 forward-mitigation)

- **3+ tier topology gap.** R78 characterizes the tuning envelope for the 2-tier topology (rack → cz). Operators with 3+ tier topologies (e.g., NVLink fabric + rack + chassis + cz) will need a separate characterization pass. **Mitigation:** the recommendation MD (§ 3.2 "Recommended operator defaults" table) explicitly marks this row OUT OF R78 SCOPE; future Tessera releases (Phase 5+) can extend with deeper-tier fixtures.
- **Single-fixture-only.** Only one cluster geometry (6 shards, 2 racks, 1 cz) is exercised. Larger fixtures might surface emergent behavior (e.g., does shadow-rack FP rate scale with topology fanout?). **Mitigation:** the matrix structure is parameterizable by fixture; a future round can re-run the sweep against a new fixture without re-spec'ing the methodology.
- **Per-kind threshold control is not characterized.** Option (i) (add `min_member_count_by_kind`) and Option (ii) (separate kind-priority function) were eliminated in § 0. **Mitigation:** the recommendation MD documents that per-kind control is a Phase 5 candidate; the empirical evidence in the matrix supports the case that the existing global `min_member_count` is sufficient for typical 2-tier operators (cells 21 vs 23 show min=3 effectively eliminates shadow_rack_fp at hop=2; cells 28 vs 29 show min=3 also eliminates it at hop=3 for NEG-INDEP).
- **Reviewer's role in catching unauthorized engine modifications.** The Reviewer MUST verify (at audit) that NO file in `engine/` was modified — the ALLOWED_SET regex enforces this structurally, but a Reviewer cold-eye scan is the second gate. If the Implementer made any engine modification (intentional or accidental), the Reviewer raises a CRITICAL.

---

## § 6. Halt conditions (Implementer)

The Implementer MUST HALT and write `coordination/diagnostics/DIAGNOSTIC-R78-<short-topic>.md` + set `STATUS: ESCALATE` in NEXT-ROLE.md if any of the following fires. Halts are bounded — do not pre-empt operator dispositioning.

1. **Q-R78-EMPIRICAL.sh non-zero exit at chore-A.** Run the EMPIRICAL.sh; if any block fails (regardless of which), HALT. (Carve-out: this directive halt does NOT fire for pre-documented carry-forward failures encoded as expected outcomes inside EMPIRICAL.sh; see § 1.6 baseline-test-status. The script's exit code IS the gate.)
2. **`pnpm exec tsc -p tsconfig.test.json` non-zero exit at chore-A.** Predicted exit = 0 per § 1.6.
3. **Test baseline drift beyond R77 close other than R78-additions.** If `tests` count is not `566 + N_new_R78` or `pass` count is not `556 + N_new_R78` or `fail` count is not `6`, HALT.
4. **R61-class architectural-reality discovery.** If a spec premise is empirically refuted (e.g., the engine's BFS behavior at the prescribed fixture does not match § 1.4 pre-prediction; an opts field semantically differs from § 3.1 pseudocode; a topology-summary structural field is mis-typed in the matrix), HALT.
5. **Engine modification beyond Architect scope.** If the Implementer concludes the R78 deliverable requires modifying ANY file under `engine/` (including engine-types), HALT + DIAGNOSTIC + STATUS: ESCALATE — Option (iii) was picked precisely to avoid this and any deviation requires operator-side disposition.
6. **Claim-then-walk / TACTICAL-AUTONOMY-without-re-verification / R77-empirical-script-defect discipline violation.** If the Implementer detects any spec citation that does NOT walk to actual engine source (e.g., a § 1.4 pre-prediction cell that fails to reproduce when the harness is re-run at HEAD), HALT + DIAGNOSTIC.
7. **Round-evolution-fragile AC patterns detected.** If any AC's literal text depends on a value that cannot be reproduced at chore-A HEAD (e.g., depends on a SHA that hasn't been minted yet, or a count that grows per round without bound), HALT.
8. **False-positive rate exceeds Architect-specified threshold at any tested depth.** Architect-specified per-cell `shadow_rack_fp_count` is the value in § 1.4 pre-prediction table. If the Implementer's run produces a HIGHER `shadow_rack_fp_count` at any cell (e.g., cell 28's predicted 1 becomes 2), HALT + DIAGNOSTIC describing the failure mode + the offending cell.

**Halt-condition 1 carve-out detail:** Q-R78-EMPIRICAL.sh Block 3 (test pass/fail counts) accepts `fail=6` (carry-forward). Block 4 (anti-scope diff) accepts the ALLOWED_SET. Block 8 (per-cell exact-equality) is the structural check; failure of Block 8 fires halt-condition 8 above.

---

## § 7. Open questions

**None — all resolved.**

Resolved during § 0 brainstorm: engine option (iii) picked; scenario class set fixed at 5 classes; fixture set fixed at 2-rack-1-cz; SEED_PREFIX fixed at 0x78A11; per-cell ACs use exact equality (PRNG-path stability discipline absorbed into the spec).

Resolved at § 1.4 cite-then-verify against engine HEAD: every pre-predicted cell value was empirically confirmed by running the prescribed scenario generators + LCG + engine call against engine `3d00490` at session entry. No premise inherited from prior-round testimony.

---

## § 8. P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| Correctness | Per-cell ACs assert exact-equality on (cz_count, rack_count, shadow_fp_count) at SEED_PREFIX=0x78A11; matrix values empirically confirmed at session entry. |
| Completeness | All 30 cells exercised; all 5 scenario classes covered; both POS detection-rate AND NEG FP-rate dimensions measured; shadow-rack FP failure mode named and structurally bound (AC-R78-8). |
| Consistency | Spec § 1.4 prediction table, § 3.3 test EXPECTED array, and § 4 AC table all encode the same 30 cells; cross-section cite-then-verify performed during § 9 grilling. |
| Clarity | Spec ≤ 20 sections; pseudocode follows TS conventions; AC table has 14 rows ≤ R20/R21/R23 precedent; operator-facing recommendation MD has a Recommended-defaults table that maps directly to the matrix observable. |
| Coverage | All 8 halt conditions enumerated; AC-R78-14 ALLOWED_SET includes CLAUDE-*.md forward-protection per R66/R77 lesson; § 5.3 acknowledged-gaps documents the 3+ tier topology limitation. |
| Constraints | Anti-scope ALL of engine/* + R72/R77/R70/R71/R73-R75 frozen tools/scripts + carry-forward fail set + ≤ 30-line README extension; matches directive's hard limits. |
| Concurrency | N/A — sweep runs serially within a single process; matrix output is single-writer; no cross-process state. |
| Corner cases | NEG-INDEP cell 24 (hop=1, min=2) sometimes surfaces rack candidates from 2-fired-shard random firings (2/5 trials) — the cell explicitly encodes this FP-rate as a binding observation, not a defect. |
| Cost | Sweep runtime estimated < 1 second (deterministic; 150 trials × 1 engine call each); matrix JSON ≈ 30-80KB; MD ≈ 6-10KB; well under R77 envelope sizes. |
| Coupling | Zero cross-tool coupling — runner re-implements LCG + scenario generators rather than importing from R72/R77; engine surface imported ONLY via .js extension; matches established convention. |

---

## § 9. Grilling output (Superpowers Phase 3, inline)

### 9.1 Adversarial self-review

**Q.1: Every claim verifiable?** YES.
- Every engine signature cited via direct file-read at session entry against engine HEAD `3d00490` (see § 1.3, § 3.1 import block).
- § 1.4 pre-prediction matrix produced by running the EXACT prescribed pipeline (scenario generator + LCG + engine call) at session entry; not from memory.
- Each AC binds to a deterministic observable producible by the prescribed code path.

**Q.2: Unstated assumptions?** NONE.
- PRNG path is fully spec-prescribed (LCG constants 1664525 / 1013904223; seed_prefix 0x78A11; per-cell seed `(prefix ^ (cell_idx * 5 + trial_idx))`).
- Topology shape is byte-prescribed in § 3.1 pseudocode (9 nodes, 8 edges enumerated verbatim).
- Engine call signature uses ONLY documented opts (`max_hop_distance`, `min_member_count`, `now`) per engine source at `engine/topology/common-mode-attribution.ts:85-96` (opts interface read at session entry).
- Shadow-rack-FP definition is explicit in § 1.5 classification logic.

**Q.3: Scope added beyond request?** NO.
- Directive specifies 5 artifacts; spec produces exactly those 5 artifacts (counting NEW spec triad + routing artifacts as overhead the pipeline owns).
- Engine option pick is the directive's conservative default (iii); no engine modification.
- AC count = 14 — within the directive's implied range (R20/R21/R23 precedent + R77 = 14-17).

**Q.4: Implementer can act without guessing?** YES.
- Spec § 3.1 prescribes the entire runner verbatim (~600-800 lines TS).
- Spec § 3.2 prescribes the recommendation MD structure with explicit "Implementer authors X by reading Y" instructions per R71 MAJOR-1 lesson.
- Spec § 3.3 prescribes the entire test file with the EXACT 30-tuple EXPECTED array.
- ALLOWED_SET is enumerated in § 4 + § 5.1 with regex literal in § 3.3 + a parallel literal in EMPIRICAL.sh.
- Topology fixture is byte-prescribed in § 3.1.

### 9.2 Cross-section consistency pass (R01 reinforcement)

For each resolved decision, verified consistency across spec sections:

- **SEED_PREFIX = 0x78A11**: § 1.2 (cell_idx formula), § 1.4 (pre-prediction empirically run at this seed), § 3.1 (constant declared), § 4 AC-R78-7 (assertion), § 3.3 EXPECTED array implicitly assumes this seed. All five sites consistent.
- **SCENARIO_CLASSES order = [POS-CZ-SPARSE, POS-CZ-FULL, POS-RACK-2, POS-RACK-3, NEG-INDEP]**: § 0 brainstorm, § 1.3 generator, § 1.4 prediction table, § 3.1 constant, § 3.3 EXPECTED array. All five sites consistent (order matters because cell_idx depends on it).
- **HOPS order = [1, 2, 3] and MINS order = [2, 3]**: § 1.4 table, § 3.1 constants, § 3.3 EXPECTED. Three sites consistent.
- **shadow_rack_fp definition (rack candidate with member_shard_ids containing a shard NOT in that rack)**: § 1.4 footnote, § 1.5 classification, § 3.1 classifyOutcome impl, § 4 AC-R78-8 description. Four sites consistent.
- **Engine option pick = (iii) defer**: § 0 preamble, § 1.1 component boundaries (engine FROZEN), § 4 AC-R78-12+13 (frozen surfaces), § 5.1 (engine NOT permitted to change), § 5.3 acknowledged gap (per-kind not characterized). Five sites consistent.

### 9.3 Type-declaration-site check (R02 reinforcement)

Engine surface used: `attributeCommonMode(input: CommonModeAttributionInput): CommonModeAttributionResult`. Opened `engine/topology/common-mode-attribution.ts` at session entry:
- `CommonModeAttributionInput` at lines 98-102: `{ fired_events: readonly FiredShardEvent[]; snapshot: TopologySnapshot; opts?: CommonModeAttributionOpts; }` — § 3.1 pseudocode constructs this verbatim.
- `CommonModeAttributionOpts` at lines 85-96: `max_hop_distance?: number; min_member_count?: number; candidate_node_kinds?: ReadonlyArray<TopologyNode['kind']>; now?: () => number;` — § 3.1 pseudocode uses only `max_hop_distance`, `min_member_count`, `now` (all camelCase: NOT applicable; field names are snake_case in engine — matches § 3.1 verbatim).
- `CommonModeAttributionResult` at lines 104-111: `{ candidates: readonly CommonModeCandidate[]; snapshot_hash: string; attributed_at_ts: number; }` — § 3.1 reads `result.candidates` only.
- `CommonModeCandidate.shared_node_kind` at line 57: `'psu' | 'rack' | 'cooling_zone'` — § 3.1 classifyOutcome filters by exact literals.
- `TopologySnapshot.fetched_at_ts` at engine/types/verdict.ts (verified): snake_case field name; § 3.1 `buildTopology()` uses snake_case verbatim.

No camelCase / snake_case drift; all type shapes confirmed against declaration sites.

### 9.4 Verification-command-soundness (R03 reinforcement)

For each grep-based AC:
- AC-R78-10 greps for `### POS-CZ-SPARSE` etc. — anchored to MD section heading prefix; comment-immunity verified (matrix MD has no `//` comments).
- AC-R78-11 greps for `## Empirical envelope` etc. — same heading-anchor pattern; comment-immunity verified.
- AC-R78-14 regex anchors paths to start-of-string `^` and end-of-string `$` per `--name-only` line format; no comment-line risk.

### 9.5 Branch-binding coverage gate (R21 reinforcement)

Every code-path branch in the prescribed runner has at least one AC binding it structurally:
- `generateScenarioInstance` 5 switch cases → each scenario_class has 6 cells (3 hops × 2 mins) all bound by AC-R78-5.
- `classifyOutcome` cz-candidate branch → AC-R78-5 binds cz_detection_count.
- `classifyOutcome` rack-candidate branch → AC-R78-5 binds rack_detection_count.
- `classifyOutcome` shadow-rack-FP branch (inner `some(sid => !expected.has(sid))`) → AC-R78-5 binds shadow_rack_fp_count; AC-R78-8 separately binds the structural invariant.
- `runTopologyWalkTuning` matrix-build loop → AC-R78-3 binds cells.length === 30; AC-R78-6 binds per-cell trials.length === 5.
- `buildTopology` 9-node, 8-edge enumeration → AC-R78-4 binds topology_summary.

### 9.6 Self-application gate (Rule 3 cross-project)

Could this spec's prescribed code FAIL its own ACs? Walked through:
- AC-R78-5: § 3.3 EXPECTED array's 30 tuples match § 1.4 pre-prediction table verbatim; § 3.1 pseudocode produces these counts (confirmed at session entry by running the actual scenario+LCG+engine pipeline). Passes self-application.
- AC-R78-14: § 3.3 ALLOWED regex literal matches § 4 ALLOWED_SET list (manually diff'd; both have 22 path patterns). Passes.
- AC-R78-11: § 3.2 prescribed recommendation MD has all 5 required section headings (`## Empirical envelope`, `## Tuning levers operators can adjust`, `## Recommended operator defaults`, `## Theoretical attribution floor`, `## How to use this document`). Passes.
- Bash-context check: Q-R78-EMPIRICAL.sh (§ separately authored) uses no `local` keyword at top level (R75 MINOR-3 carry-forward).
- Cross-module-import check: `tools/topology-walk-tuning.ts` does not import `tools/detector-envelope.ts` or `tools/coverage-saturation.ts` — no R75 MINOR-2-class risk.
- Stdout-flush check: matrix JSON serialized via `fs.writeFileSync`, not `process.stdout.write` — R75 MINOR-1 64KB-pipe-truncation risk is N/A.
- EMPIRICAL.sh probe-run (R77 OBS-4): I will probe-run Q-R78-EMPIRICAL.sh against round-start HEAD before routing to verify all blocks fire correctly with `--test-reporter=tap`. This grilling step is fulfilled by the explicit probe-run at § 9.7 below.

### 9.7 EMPIRICAL.sh probe-run (R77 OBS-4 reinforcement)

Per the R77 cross-project canonical rule (3rd Tessera instance of Architect-side EMPIRICAL.sh defect): Q-R78-EMPIRICAL.sh MUST be probe-run against round-start HEAD `3d00490` BEFORE routing. The Architect performs this probe-run during pre-emit grilling. (Result will be recorded after running the probe-run.)

EXPECTED behavior at round-start HEAD `3d00490`: Q-R78-EMPIRICAL.sh exits NON-ZERO (because the R78 artifacts don't exist yet at round-start; Blocks 2/4/8 will fail) — this is BY DESIGN per R56 reinforcement. The Architect's probe-run is to verify that:
- Block 1 (typecheck) passes (tsc baseline is 0).
- Block 3 (test counts) is interpretable (TAP reporter format is parseable by grep).
- Block 4 (anti-scope diff) detects only the ALLOWED_SET paths or returns no diff (since no spec-prescribed files exist yet).
- The script's `grep -E "^# pass "` patterns match TAP output verbatim.

### 9.8 Spec-internal-contradiction sweep (R15 + R34 + R65 + R56 reinforcement)

- Halt-condition 1 carve-out vs § 6.1: explicit carve-out for carry-forward failures + per-cell exact-equality structural check (Block 8 of EMPIRICAL.sh) — no contradiction.
- AC-R78-5 vs AC-R78-8: AC-R78-5 binds shadow_rack_fp_count exactly (5 cells at hop=3); AC-R78-8 binds the broader structural invariant (0 at hop ≤ 2). The two ACs are consistent (AC-R78-8 is a structural superset; AC-R78-5 is the exact per-cell point).
- AC-R78-14 regex vs § 4 ALLOWED_SET text: explicitly diff'd above (§ 9.6).
- Halt-condition 8 ("FP rate exceeds Architect-specified threshold") vs AC-R78-5 ("per-cell exact equality"): no contradiction — the halt fires when AC-R78-5 fails on shadow_rack_fp_count specifically (any cell where the actual count > predicted count). Halt-condition 8 is the directive's explicit halt; AC-R78-5 is the structural assertion that catches it.
- § 1.6 baseline at HEAD `3d00490` claims fail=6; § 6.3 halt-condition 3 cites fail=6; § 4 AC tests are predicted to add to pass not fail. All consistent.

### 9.9 Discriminating-AC + 1-trial padding (R71 MINOR-1 + R77 MINOR-4)

For each AC, asked: "would a future implementation mistake produce the same observable?" and "is the threshold padded ≥ 1 trial from pre-prediction?"
- AC-R78-5 (exact equality): a future PRNG-path change OR engine modification flips the exact-equality counts. Discriminating. No padding (intentional — see § 1.4 rationale).
- AC-R78-8 (hop ≤ 2 → 0 shadow FP): structural — engine modification of BFS-bound-on-undirected would flip. Discriminating.
- AC-R78-9 (hop=1 → POS-CZ-* cz=0): structural — engine topology BFS modification would flip. Discriminating.
- NEG-INDEP cells in § 1.4 (cells 24-29): predicted 0-2 counts. Could PRNG-path drift produce same counts on a different LCG? Yes — a different LCG with similar mean output might collide. Per R77 MINOR-4 padding rule, in principle these cells should have ±1 padding. ARCHITECT-CHOICE: rejected the padding because (a) the LCG constants AND seed_prefix are spec-pinned, so PRNG drift requires spec-prescribed modification (which the Implementer is NOT permitted), (b) exact-equality is more discriminating for the structural invariant tests (AC-R78-8/9), and (c) the deterministic seed-pinning IS the discipline (a future round-evolution change to either constant requires re-derivation of the matrix anyway).
- Architect prediction confidence on NEG-INDEP cells: HIGH — values empirically observed at session entry against the exact prescribed pipeline.

### 9.10 Pre-authored narrative text verification (R71 MAJOR-1 + MAJOR-2 reinforcement)

Spec § 3.2 (`scripts/topology-walk-tuning-recommendation.md`) is the document with the highest narrative density. Per R71 MAJOR-1 lesson, narrative text asserting empirical engine properties is itself a P3 commitment. Architect's handling:
- The "Empirical envelope" section is BRACKETED ("[Implementer authors ... by reading the matrix at HEAD]") with specific cell-citation requirements. The Implementer reads the actual matrix and writes the narrative. NO empirical claims pre-authored.
- The "Recommended operator defaults" TABLE pre-authored, but it cites only structural facts (hop=2 + min=2 = recommended for 2-tier topologies) derived from the empirical matrix at session entry. Verified at session entry: cells 2 (POS-CZ-SPARSE hop=2 min=2: cz=5/5) + 8 (POS-CZ-FULL hop=2 min=2: cz=5/5) + 14 (POS-RACK-2 hop=2 min=2: rack=5/5) + 20 (POS-RACK-3 hop=2 min=2: rack=5/5) + 26 (NEG-INDEP hop=2 min=2: cz=1/5 rack=1/5 shadow=0/5). The recommendation "Catches all CZ events including 2-shard sparse; accepts ~20% FP on independent noise" is empirically correct.
- The "Theoretical attribution floor" section cites structural facts about BFS bound and the engine surface; verified at session entry against `engine/topology/common-mode-attribution.ts:115-117` (DEFAULT_MAX_HOP_DISTANCE = 1, DEFAULT_MIN_MEMBER_COUNT = 2, DEFAULT_CANDIDATE_NODE_KINDS = ['psu','rack','cooling_zone']).

### 9.11 Routing-block / line-citation discipline (R65 MINOR-1)

All AC numbers cited in this spec are copy-pasted to NEXT-ROLE.md routing block via grep from spec — no re-typing from memory.

---

## § 10. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R78 --tier full
```

Architect session → spec triad commit → IMPLEMENTER routing block → Implementer chore-A → Reviewer → Memorial-Updater.
