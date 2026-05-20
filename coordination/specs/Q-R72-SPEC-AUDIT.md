# Q-R72-SPEC-AUDIT — Architect ceremony sidecar (Reviewer-authorized read)

**Round:** R72
**Companion to:** `coordination/specs/Q-R72-SPEC.md` (load-bearing for Implementer)
**Purpose:** Architect pre-emit ceremony — P3 ten-axis verification, pre-route discipline application, Architect pre-prediction on outcomes, decision rationale. The Implementer MAY read this sidecar for context; the load-bearing prescription is the spec proper.

---

## § 1. P3 ten-axis verification (one sentence per axis)

1. **Correctness:** every AC predicate is a mechanical function of (a) matrix.json bytes, (b) matrix.md bytes, or (c) re-import of sibling production modules; no AC binds an Architect-pre-authored expected value, structurally avoiding the R71 MAJOR-1 + MAJOR-2 self-confirming-test failure mode.
2. **Completeness:** the directive's 6 deliverables (saturation runner + matrix outputs + package script + README extension + test file + Q-R72-EMPIRICAL.sh) are all delivered; the 6 failure types match the directive's suggested list verbatim; 20 ACs cover structural shape (1-7), per-type detection floors (8-13), attribution accuracy (14), pedagogical property (15), FP-count floors (16), idempotency (17), matrix.md consistency (18), and R70/R71 anti-regression (19-20).
3. **Consistency:** the 6 failure type names appear in identical order across § 1.1, § 2.1, § 2.3, § 2.4, § 3.1, § 3.3, § 4 (sweep run at § 10.8); detection floor numbers match across § 2.3 + § 3.3 + § 4 + § 5.4; AC-R72-14 (≥ 0.95) and AC-R72-15 (≥ 0.80) thresholds match between § 2.3 and § 4.
4. **Clarity:** every prescriptive value is a literal (variation grids, detection floors, SCENARIO_SEED_PREFIX, AC thresholds); no AC uses banned ambiguous language ("correctly", "appropriately", "as needed"); every AC names the exact source file:line target in spec § 4.
5. **Coverage:** § 4.1 branch-binding table covers every load-bearing branch in `tools/coverage-saturation.ts`; one acknowledged non-load-bearing gap (CLI guard, mirrors R71 precedent); § 9 corner-case enumeration is bound to specific ACs (sweep verified in § 10.5 R65 MINOR-3).
6. **Constraints:** 15 anti-scope items (A1-A15) enumerate frozen surfaces; 10 halt conditions in § 6.1 enforce the directive's halt-discipline mandate; cross-project Rules 1-7 dispositioned in § 7; round-evolution-fragility patterns (R62 + R66 + R68 cumulative) explicitly avoided per A14.
7. **Concurrency:** saturation runner is single-process, single-threaded; `node --test` runs sequentially; matrix.json file-write ordering is documented in § 10.2 unstated-assumption #1 with resolution in § 11.1 chore-A sequence.
8. **Corner cases:** 8 corner-case scenarios enumerated in § 9 corner cases, each bound to a specific AC (Type 1 lowest drift → AC-R72-8; Type 2 attribution_window=0 → AC-R72-9; Type 6 max_hop=1 → AC-R72-13; Type 5 fleet-fires-with-no-per-shard → AC-R72-15; etc).
9. **Cost:** runner ~1200 lines; test ~600 lines; spec ~1200 lines; runtime cost ~1 second per coverage build (120 small engine invocations); zero network cost.
10. **Coupling:** runner imports only engine `.js` modules (Tessera-original; no R70/R71 tool imports — LCG + Gaussian re-implemented to keep cross-tool coupling at zero); test imports only the runner + R70 SCENARIO_NAMES + R71 SCENARIO_NAMES (anti-regression imports); README + package.json modifications are additive.

---

## § 2. Pre-route discipline application

### 2.1 Skill 14 — Spec template gate (Rule 7 Surface (a))

Q-R72-SPEC.md § 7 enumerates all 7 cross-project rules with their disposition:
- Rule 1 (ACTIVE GATE — Q-R72-EMPIRICAL.sh + Implementer attestation directives)
- Rule 2 (ACTIVE GATE — § 4.1 branch-binding table)
- Rule 3 (ACTIVE GATE — § 4.2 discriminating-assertion table + self-confirming analysis)
- Rule 4 (ACTIVE GATE — § 5 ALLOWED_SET + gitignore audit)
- Rule 5 (N/A — no new rule derived)
- Rule 6 (ACTIVE GATE — § 6 halt conditions + § 6.2 TACTICAL AUTONOMY explicit MAY-NOT list)
- Rule 7 (ACTIVE GATE Surface (a); Surface (b) + (c) N/A)

### 2.2 R71 MAJOR-1 / MAJOR-2 specific application (EMPIRICAL-PREMISE-VERIFICATION sub-variant 5)

R71 MAJOR-1 (hierarchical-evalue: pre-authored "too small to fire alone" narrative empirically false) and R71 MAJOR-2 (topology-spanning: pre-authored "ONE candidate" narrative empirically false at min_member=2 default) shared root cause: Architect pre-authored empirical claims without verifying them against engine output.

R72 applies the R71 reinforcement (REINFORCED 2026-05-20) by:

(a) **Empirical verification of every parameter-space claim.** R71's actual engine outputs are inspected at Architect session entry (Python over `demos/scenarios/*.json`). Anchor data points:
- sdc-drift d=0.4: shard-04 fires w=22 ✓ (confirmed → variation grid d ∈ {0.20, 0.30, 0.40, 0.50, 0.70} brackets sensitivity)
- fdr-multiple-testing d=0.45, q=0.10: K=3, selected=[2,5,8] ✓ (confirmed → grid d=0.45 + qLevel ∈ {0.05..0.25} should detect uniformly under sufficient drift)
- hierarchical-evalue d=0.20, 5 shards, start=5: fleet@16, first per-shard@18, Δ=+2 windows ✓ (confirmed → grid d ∈ {0.10..0.25} brackets the pedagogical-property boundary)
- topology-spanning max_hop=2, candidate_kinds=['cooling_zone','rack','psu']: 3 candidates (rack-A m=2, rack-B m=2, cz-1 m=4) ✓ (confirmed → grid max_hop ∈ {1..5} exposes hop=1 / hop≥2 boundary; cz-1 candidate exists at hop≥2 with member_count = fired_set.length)

(b) **No pre-authored expected values per variation.** The matrix REPORTS engine output; ACs bind PER-TYPE AGGREGATE floors. A self-confirming test would require pre-authoring per-variation expected values — explicitly avoided per Approach B selection in § 0.

(c) **Discriminating ACs for pedagogical properties.** AC-R72-15 binds "fleet_tick_at_first_fire < earliest_per_shard_first_fire_tick" structurally — closing R71 MAJOR-1 gap. AC-R72-13 + the type-6 detection criterion (cooling_zone candidate exists with member_count = fired_set.length) bind R71 MAJOR-2 structurally.

(d) **Honest narrative.** Spec narrative (§ 2.1 type descriptions; § 2.4 predicate explanations) describes ENGINE behavior in terms of what the engine actually does (e.g., "BFS over cooling_zone-spanning topology; max_hop_distance varies to expose the 1-hop / 2-hop reachability boundary") rather than what the Architect WISHES it would do.

### 2.3 R02–R71 reinforcement sweep

Full sweep documented in Q-R72-SPEC.md § 10.5. Summary:
- All cite-then-verify reinforcements (R02 type declaration site, R03 re-export chain, R11 line-range citation, R58 constructor opts): engine surfaces opened by direct read at session entry; signatures + line numbers verified.
- R07 / R08 empirical-premise-verification (composite): R71 JSON files inspected at session entry to ground every detection-floor prediction.
- R15 / R21 spec-commit-sequencing: spec triad commits BEFORE Architect routing block.
- R23 gitignore awareness: ALLOWED_SET excludes .js compiled outputs; coverage dir path verified not-gitignored.
- R30 / R34 / R44 / R46 discriminability + threshold-tightness: ACs use literal comparisons; floors are specific integers; no "≥ 1" weak thresholds.
- R65 P3 commitment coverage: every corner case in § 9 has a binding AC.
- R66 semantic accuracy: no semantically-overclaiming field names.
- R70 spec-narrative-vs-script alignment: § 11.1 narrative matches the EMPIRICAL.sh script body block-by-block.
- **R71 specific (EMPIRICAL-PREMISE-VERIFICATION sub-variant 5):** see § 2.2 above.

---

## § 3. Architect pre-prediction on outcomes (R71 § 10.6 pattern)

The Implementer encodes ACTUAL observed values verbatim per Rule 1. Architect predicts the following for cross-comparison:

### 3.1 Binding-command outputs

| Command | Predicted output |
|---|---|
| `pnpm exec tsc -p tsconfig.test.json` | exit 0; zero diagnostics |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` | `# tests 489 / # pass 481 / # fail 5 / # skipped 3` |
| `bash coordination/specs/Q-R72-EMPIRICAL.sh` | 8 blocks PASS, exit 0 |
| `git diff <ROUND_START_SHA>..HEAD --name-only` | 11 paths, all ⊆ ALLOWED_SET |

5 carry-forward fails identity preserved: AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14.

### 3.2 Coverage matrix predicted outcomes

| Type | Predicted detected | Predicted attribution-correct | Predicted FP-max | Predicted pedagogical rate |
|---|---|---|---|---|
| sdc-drift | 18 / 20 (range [16, 20]) | 18 / 18 = 100% | 0 | n/a |
| common-mode-rack | 20 / 20 | 20 / 20 = 100% | 0 | n/a |
| event-conditional | 20 / 20 | 20 / 20 = 100% | n/a | n/a |
| fdr-multiple-testing | 19 / 20 (range [16, 20]; q=0.05 with k=1 edge) | 19 / 19 = 100% | 0 | n/a |
| hierarchical-evalue | 15 / 20 (range [12, 18]; small drift × small fleet may not fire) | 15 / 15 = 100% | n/a | 14 / 15 = 93% (range [80%, 100%]) |
| topology-spanning-common-mode | 16 / 20 (exact: 4 max_hop=1 variations don't detect cooling_zone) | 16 / 16 = 100% | n/a | n/a |
| **Totals (predicted)** | **108 / 120** | **108 / 108 = 100%** | — | — |

Confidence: MEDIUM-HIGH (R71 baseline confirms anchor points; data-flow analysis predicts hop-boundary behaviors deterministically). If Implementer observes detection counts below the AC floors, halt #8 fires per § 6.1.

### 3.3 Anchored data-flow analysis per type-6 prediction

Hop reachability in `build2RackCzTopology` snapshot (verified by inspection):
- gpu_shard → rack: 1 hop
- rack → cooling_zone: 1 hop
- gpu_shard → cooling_zone: 2 hops (via rack)

Per fired_set × max_hop combinations (16 grid entries that should detect cooling_zone candidate; 4 grid entries at max_hop=1 that should NOT detect):

| Fired set | max_hop=1 | max_hop=2 | max_hop=3 | max_hop=4 | max_hop=5 |
|---|---|---|---|---|---|
| `[sh-00, sh-01, sh-03, sh-04]` (2+2 cross-rack) | no cz (hop=1) | cz m=4 ✓ | cz m=4 ✓ | cz m=4 ✓ | cz m=4 ✓ |
| `[sh-00..sh-05]` (3+3 full) | no cz (hop=1) | cz m=6 ✓ | cz m=6 ✓ | cz m=6 ✓ | cz m=6 ✓ |
| `[sh-00, sh-03]` (1+1 cross-rack) | no cz (hop=1) | cz m=2 ✓ | cz m=2 ✓ | cz m=2 ✓ | cz m=2 ✓ |
| `[sh-00, sh-01, sh-02, sh-03]` (3+1 cross-rack) | no cz (hop=1) | cz m=4 ✓ | cz m=4 ✓ | cz m=4 ✓ | cz m=4 ✓ |

Detection count: 4 fired-sets × 4 hop values (hop≥2) = 16. AC-R72-13 floor: ≥ 16. Match.

Attribution-correct (cz_candidate.member_count === fired_set.length): for each detected variation, the cz candidate's member_count equals the fired_set length (engine aggregates all distinct fired shards into one cz candidate when cz is reachable at the given max_hop). 16/16 = 100% — clears AC-R72-14 (≥ 95%) by margin.

### 3.4 Anchored data-flow analysis per type-5 prediction

Per the engine's `combineAverage`: `log_fleet_e = mean(log_e_per_shard)`. Fleet wealth crosses `log(1/0.05) ≈ 2.9957` (i.e., geometric mean of M_t ≥ 20) before any single shard's M_t crosses 200 (per-shard threshold) UNDER UNIFORM DRIFT — because GM(M) accumulates evenly across shards.

R71 anchor (d=0.20, 5 shards, start=5): fleet@w=16, first per-shard@w=18 (Δ=+2). Pedagogical property holds.

For larger shard counts (8, 10, 15), GM accumulates faster (averaging across more shards smooths per-shard noise) → fleet should fire EARLIER relative to per-shard. Pedagogical property holds with greater margin.

For SMALLER drift (d=0.10, d=0.13): both fleet and per-shard accumulate more slowly; fleet may not reach log(20) within 30 windows → `detected: false` (counted toward detection-rate denominator but not toward pedagogical denominator). When detected, pedagogical property holds.

Edge case: d=0.25 with 5 shards, start=5 — strongest drift × smallest fleet. Per-shard M reaches 200 faster (high d); fleet GM reaches 20 also faster. Possibly fleet still fires first (because per-shard's M=200 ≫ GM=20 threshold ratio) but margin tighter. Predicted to hold based on R71 baseline trajectory: at d=0.20 over 5 shards, fleet@16 < per-shard@18 with margin 2 windows. At d=0.25, per-shard fires around w=17 (extrapolating linearly from R71); fleet fires around w=14 (similar speedup). Margin preserved.

Predicted pedagogical rate: 14/15 ≈ 93% (one of the 15 detected variations may have a 1-window-tighter margin that flips order if engine variance bites unfavorably).

---

## § 4. Decision rationale — what was chosen and what was rejected

### Why Approach B (saturation runner + per-type aggregate floors)

Approach A (per-variation hard-coded expected values) would replicate R71 MAJOR-1 + MAJOR-2: the Architect pre-authors a specific expected value per variation, and any single mis-prediction (out of 120) creates a self-confirming test. Approach C (golden-file matrix.json diff) adds per-engine-improvement tax without proportional benefit. Approach B records engine reality + binds AGGREGATE floors → engine improvements don't break tests, engine regressions surface as detection counts dropping below floors.

### Why these 6 failure types specifically

The directive listed 6 suggested types verbatim. Architect adopted the directive's list rather than substituting — these 6 types systematically span the engine's surface:
- Per-shard single-fault: type 1 (sdc-drift)
- Topology-aware attribution: type 2 (common-mode-rack)
- Event-conditional suppression: type 3 (event-conditional)
- Fleet-level FDR control: type 4 (fdr-multiple-testing)
- Hierarchical e-value combination: type 5 (hierarchical-evalue)
- Cross-rack common-mode (with max_hop variation): type 6 (topology-spanning-common-mode)

All 6 are also represented in R71's dashboard scenarios; R72 IS the saturation-coverage validation of R71's hand-picked anchors.

### Why 4×5 grid per type

The directive prescribed "20 variations: 4 shard-ID × 5 magnitude/timing." The Architect interpreted "shard-ID" loosely per type — for non-per-shard types (2, 3, 4, 5, 6), "shard-ID" maps to "primary axis discriminator" (target_rack, event_class, drifting_shard_count, shard_count, fired_set). The 4×5 grid shape is preserved across all 6 types for matrix symmetry.

### Why these specific detection floor numbers

- sdc-drift 16/20 = 80%: per § 2.3 rationale, 4 lowest-magnitude variations (d=0.20 × 4 target shards) may not fire by w=30.
- common-mode-rack 20/20 = 100%: every fired-set has ≥ 2 shards on target rack; default min_member=2 surfaces every variation.
- event-conditional 20/20 = 100%: all 5 offset tuples fall within activation_window=300; freeze always activates.
- fdr-multiple-testing 16/20 = 80%: q=0.05 with k=1 drifting (e_max ≥ N/q = 200 needed) is boundary case; safety margin = 4 variations.
- hierarchical-evalue 12/20 = 60%: smallest drift × smallest fleet may not fire fleet threshold; conservative floor.
- topology-spanning 16/20 = 80%: max_hop=1 × 4 fired-sets cannot reach cooling_zone (2 hops away); 4 deterministic non-detection variations.

Each floor leaves ≥ 4-variation safety margin below the Architect's predicted typical detection count. This is intentional: a tighter floor would catch borderline engine drift but increase false-halt risk if seed variance bites unfavorably. The current floors trade off catching regression vs. false halt.

### Why per-type attribution accuracy = 0.95

Directive mandate. Selected parameter grids should yield 100% attribution accuracy under engine working-as-designed; 95% floor allows 1 attribution miss per 20 detected variations to absorb engine variance.

### Why hierarchical pedagogical property = 0.80

Lower than 0.95 attribution floor because the property is sensitive to per-shard variance: a single variation where one shard's wealth happens to accelerate slightly faster than fleet GM can flip the order. R71 anchor margin = 2 windows (small); 80% allows 3 such inversions per 15 detected variations.

---

## § 5. Architect routing block — chore sequence

1. Spec triad commit (BEFORE this routing block): `spec(R72): Q-R72-SPEC + audit sidecar + EMPIRICAL.sh — coverage saturation matrix`.
2. Architect routing block commit (THIS commit): writes NEXT-ROLE.md § Architect R72 routing block ABOVE the existing R72 directive block.
3. Implementer chore-A sequence per § 11.1 of spec proper:
   - RED commit: `red(R72): q72 coverage saturation stub fails — TS2307 + 20 RED assertion stubs`
   - GREEN commit: `feat(R72): Tessera coverage saturation matrix — 6 failure types × 20 variations = 120 cases`
   - Inject ROUND_START_SHA into EMPIRICAL.sh via sed BEFORE GREEN commit (per R70 MINOR-1 lesson — read SHA from NEXT-ROLE.md, do NOT use `git rev-parse HEAD`).
   - Verify all binding commands pass.
   - Attest per Rule 1 sub-class `empirical-command-attestation`.
4. Implementer routes to Reviewer; Reviewer runs cold-eye audit; Memorial-Updater closes the round.

---

## § 6. Cross-project rule self-application sweep at spec-emit (Rule 5)

| Rule | Self-application moment | Outcome |
|---|---|---|
| 1 | Spec § 11.2 Block 2 says "fail count = 5"; spec § 6.1 halt #3 says fail count baseline = 5; spec § 10.6 prediction says fail count = 5; these all match. | PASS — no false-compliance setup |
| 2 | Spec § 4.1 branch-binding table covers every load-bearing branch in pseudocode § 3.1; 1 acknowledged gap (CLI guard) | PASS |
| 3 | Spec § 4.2 discriminating-assertion table verifies no AC re-implements engine logic in test code; AC-R72-15 + AC-R72-16 + AC-R72-13 + AC-R72-14 specifically close R71 MINOR-1 (pedagogical property coverage gap) | PASS |
| 4 | Spec § 5.1 ALLOWED_SET enumerates 11 paths + 1 regex carve-out at spec-emit; no in-spec expansion mechanism | PASS |
| 5 | This sweep (§ 6 of audit sidecar) IS the Rule 5 self-application. Rules are applied AT spec-emit, not memorialized after a violation. | PASS |
| 6 | Spec § 6 enumerates 10 halt conditions; § 6.2 explicit MAY-NOT list prevents Implementer from silent workaround. No carve-out for any pre-documented failure. | PASS |
| 7 | This audit sidecar (§ 2.1) lists all 7 rules with dispositions per Surface (a); Surfaces (b) + (c) N/A. | PASS |

No Rule 5 violations at spec-emit time.

---

## § 7. Reviewer-readable summary

If you (Reviewer) read this sidecar:
- Spec is single-state (no chore-B); 4th-instance round-evolution-fragility avoidance (R62 + R66 + R68 cumulative).
- ACs bind per-type aggregate floors, not per-variation hard-coded expectations (R71 MAJOR-1/MAJOR-2 lesson applied).
- AC-R72-15 specifically closes R71 MAJOR-1 pedagogical-property coverage gap.
- AC-R72-13 + AC-R72-14 specifically close R71 MAJOR-2 narrative-vs-engine-design contradiction (multi-candidate emission is recorded transparently in matrix but not counted as FP).
- AC-R72-17 idempotency check uses Buffer.equals byte-level comparison.
- ROUND_START_SHA = Architect's spec-triad commit SHA, injected as literal by Implementer at chore-A (R70 MINOR-1 lesson — NOT `git rev-parse HEAD` at sed time).
- Branch-binding (§ 4.1) covers every load-bearing branch in pseudocode (1 acknowledged gap: CLI guard, mirrors R71).
- ALLOWED_SET historical-only diff bound by spec-triad SHA (no forward-protection patterns).
- 0-CRITICAL streak continues from R71; this spec aims to extend it.

Open items for Reviewer's grilling:
- Are the per-type detection floors empirically sound given the variation grids?
- Does the matrix idempotency AC (AC-R72-17) actually catch non-determinism sources?
- Does the pedagogical property AC (AC-R72-15) discriminate the R71 MAJOR-1 gap?

---

## § 8. Audit-trail provenance

- Round-start SHA: `e77da5c` (chore(R71): Memorial-Updater outputs).
- Architect session-entry HEAD: `0c6507c` (chore(R72 directive): coverage validation — 6 failure types × 20 variations = 120 cases).
- Architect session-entry baseline: tsc exit 0; tests=469 / pass=461 / fail=5 / skipped=3 (5 carry-forward identity grep-verified).
- Architect session-entry R71 empirical data inspection: 8 demos/scenarios/*.json files inspected via Python; key anchor data confirmed for parameter-space prediction grounding.
- Engine surface signatures: 11 entry points (per § 1.3 of spec proper) opened by direct file Read at session entry; verbatim signatures recorded.
- Toolchain: pnpm 11.x, Node v25.x, TypeScript ^5.4.0.
