# Round R71 Summary
**Round:** R71  
**Date:** 2026-05-20  
**Title:** Tessera demo dashboard  
**Tier:** full  
**Status:** MERGE-READY  
**Findings:** 0 CRITICAL / 2 MAJOR / 4 MINOR / 4 OBS  

---

## What worked

**TDD discipline — clean RED→GREEN chain:** RED commit `fcc51d6` landed 14 `assert.fail` stubs with `demos/demo.html` and `tools/build-canned-demos.ts` absent (tsc exits TS2307). GREEN commit `cfa7d0f` replaced all 14 stubs with real assertions and landed all production artifacts. Reviewer independently verified RED commit hygiene: one file (`test/demo.test.js`), 87 insertions, 14 `assert.fail` stubs only.

**Anti-scope — engine surfaces read-only throughout:** `git diff 54af89f..HEAD --name-only` → 18 paths, all ⊆ ALLOWED_SET (spec § 3.2). No engine modifications at any role boundary. ALLOWED_SET not expanded post-commit.

**Halt-discipline — no conditions fired:** EMPIRICAL.sh exit 0; tsc exit 0; carry-forward 5-fail identity unchanged (AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14); no engine modification; prescribed drift magnitudes (sdc-drift 0.4, fdr 0.45, hierarchical 0.20) produced correct terminal predicates under prescribed seeds without tactical tuning. No DIAGNOSTIC written; no ESCALATE raised.

**Binding-command attestation verbatim:** `pnpm exec tsc -p tsconfig.test.json` → exit 0. `pnpm exec node --test --test-reporter=tap test/*.test.js` → `tests=469 / pass=461 / fail=5 / skipped=3`. `bash coordination/specs/Q-R71-EMPIRICAL.sh` → 10 PASS / 0 FAIL / exit 0. Reviewer independently re-ran all commands at HEAD and results matched. No reframing of exit codes or counts.

**14 ACs all PASS at literal binding:** All AC-R71-1 through AC-R71-14 verified PASS by both Implementer and Reviewer. EMPIRICAL.sh 10-block suite confirmed 0 FAIL.

**Architect prediction accuracy (OBS-1):** § 10.6 prediction matched Implementer and Reviewer observations byte-for-byte: tsc exit 0, test counts (469/461/5/3), EMPIRICAL.sh 10 PASS / 0 FAIL, 18 ALLOWED_SET paths. Claim-then-walk discipline applied throughout.

**Round-evolution-fragility avoidance (4th application):** Historical-only ALLOWED_SET diff; carry-forward fail set bound by AC ID identity; no forward-protection AC; no live-file-count AC; no anti-scope-diff-against-prior-round bound; single-state spec (no chore-B). R62+R66+R68 cumulative discipline applied.

**DS pattern mirror:** R71 mirrors DeploySignal's `demos/demo.html` pattern with `tools/build-canned-demos.ts` inlining 8 pre-recorded LCG-seeded scenario JSON files into a single static HTML dashboard with no runtime dependencies.

---

## What violated discipline

**MAJOR-1 (ARCHITECT) — pre-authored reasoning text empirically unverified:**  
`Q-R71-SPEC.md § 4.2` prescribed the verbatim reasoning string "All 5 shards' M_t values individually [are] too small to fire alone" for the hierarchical-evalue scenario. Implementer copied verbatim per instruction. In actual engine output at prescribed seed/drift, all 5 shards individually fire by terminal window (shard-04 at w=18; shards-00/01/02 at w=23; shard-03 at w=24; terminal M_t range 8239→559713). The dashboard reasoning text directly contradicts the dashboard data.

**MAJOR-2 (ARCHITECT) — topology-spanning reasoning/description empirically unverified:**  
`Q-R71-SPEC.md § 4.2` prescribed "ONE cooling-zone-level candidate surfaces" and similar language for the topology-spanning-common-mode scenario. Implementer copied verbatim per instruction. In actual engine output, `candidate_node_kinds: ['cooling_zone', 'rack', 'psu']` causes the engine to emit all eligible candidate kinds: rack-A (member_count=2), rack-B (member_count=2), and cz-1 (member_count=4) — three candidates, not one.

**MINOR-1 (ARCHITECT) — discriminating AC coverage gap (root cause of MAJORs):**  
AC-R71-9 binds `fleet_fired === true AND Number.isInteger(fleet_tick_at_first_fire)` — passes even when all 5 shards fire individually (defeating the hierarchical-evalue pedagogical claim). AC-R71-11 binds `cooling_zone candidate with member_count ≥ 4` — passes even when 3 candidates surface (defeating the topology-spanning pedagogical claim). The discriminating properties ("fleet fires before any per-shard fire," "exactly one candidate") were not bound; minimum properties were bound instead.

**MINOR-2 (IMPLEMENTER) — sdc-drift events array sparse:**  
`sdc-drift` scenario events array is populated only at w=22 (29 of 30 windows have empty `events: []`). The audit panel shows no events during playback for 97% of the timeline, reducing the pedagogical value of the audit-trail panel.

**MINOR-3 (IMPLEMENTER) — hardcoded LOG10_THRESHOLD literal:**  
`tools/build-canned-demos.ts:1052` hardcodes `const LOG10_THRESHOLD = Math.log10(200)`. If a future round changes `DEMO_ALPHA` from 200, the dashboard threshold line silently drifts from the actual firing threshold.

**MINOR-4 (IMPLEMENTER) — per_shard.fired flag via inline literal predicate:**  
For non-Family-A scenarios, `per_shard[id].fired` is set by an inline literal predicate rather than being derived from the firedEvents array in engine output. Silent mis-labeling is possible if the predicate drifts from the engine's actual firing logic.

---

## Root cause analysis

**MAJOR-1 + MAJOR-2:** The EMPIRICAL-PREMISE-VERIFICATION discipline (CLAUDE-ARCHITECT.md composite, 4 sub-variants pre-R71) was applied to engine surface signatures (function names, parameter types, return shapes) but not to narrative prose strings prescribed in § 4.2. The Architect verified that the engine would run under the prescribed parameters; it did not run the engine under those parameters and read the output to verify the reasoning strings it was prescribing. The pre-emit grilling (§ 10.9 grilling block) checked structural claims (file existence, AC coverage, EMPIRICAL.sh exit codes) but did not include "run engine at prescribed seed + drift and verify each pedagogical narrative claim against actual output." This is the same class of failure as the existing 4 sub-variants in the composite but applied to a previously uncovered surface: pre-authored prose embedded in production artifacts.

**MINOR-1:** The discriminating property for a pedagogical scenario ("fleet fires BEFORE any per-shard fires") is more stringent than the minimum property that indicates the feature works at all ("fleet fires"). The Architect bound the minimum property (AC passes easily; feature functions) rather than the discriminating property (AC would fail if the pedagogical claim is false). The distinction between "sufficient to confirm the feature works" and "sufficient to confirm the pedagogical claim is true" was not applied during AC authoring.

**MINOR-2:** The sdc-drift scenario uses a single drift event at w=22 because the scenario is designed to show shard-04 crossing threshold from a single drift injection. The events sparsity is a consequence of the chosen design. It could have been addressed during spec authoring by prescribing a multi-window drift ramp instead of a single-window injection; it was not identified as a pedagogical quality gap during spec writing.

**MINOR-3 + MINOR-4:** Implementation-level choices without corresponding ACs. The Implementer made pragmatic shortcuts that work correctly for the current spec but introduce fragility under future change. No AC binding existed to prevent them; the Reviewer correctly flagged as MINORs rather than CRITICAL/MAJOR because no present-tense claim was false.

---

## Reinforcements added

**CLAUDE-ARCHITECT.md (EMPIRICAL-PREMISE-VERIFICATION composite sub-variant 5 + 1 standalone, count 38 → 39):**

1. `REINFORCED 2026-05-20` — EMPIRICAL-PREMISE-VERIFICATION composite updated (4 → 5 sub-variants): sub-variant 5 "Pre-authored narrative text verification (R71 MAJOR-1 + MAJOR-2)": When spec § 4.x prescribes verbatim prose strings (reasoning fields, description text, dashboard panel copy) that the Implementer copies into production artifacts, and those strings assert an empirical property of the engine under prescribed parameters, the Architect MUST empirically verify those claims before routing — by running the engine at the prescribed seed + drift and checking the terminal state, OR by tracing data flow through the aggregation logic to verify the claimed count/property. Pre-emit grilling must include a "prescribed narrative vs. actual engine output" verification step for all verbatim prose blocks.

2. `REINFORCED 2026-05-20` — Discriminating AC coverage for pedagogical scenarios (MINOR-1 standalone): When a scenario's primary pedagogical claim is "X causes Y to happen DIFFERENTLY from Z," the AC binding that scenario's terminal state MUST bind the discriminating property — the one that proves the pedagogical difference — not merely the minimum property that indicates the feature functions at all. The AC must be formulated so that it FAILS if the pedagogical claim is false.

**CLAUDE-IMPLEMENTER.md:** No REINFORCED entries added. MINOR-2/3/4 are design-quality observations (sparse events, hardcoded literal, inline predicate) without corresponding ACs; they are implementation improvement opportunities, not protocol discipline violations. Count remains 33.

---

## Consolidation recommendation

**Both CLAUDE-ARCHITECT.md and CLAUDE-IMPLEMENTER.md exceed the 30-entry threshold:**

- `CLAUDE-ARCHITECT.md`: **39 REINFORCED entries** post-R71 (up from 38 pre-R71). Fourth consecutive round above the 30-entry threshold (R66: 35, R70: 38, R71: 39). Consolidation overdue; file navigability is degrading.
- `CLAUDE-IMPLEMENTER.md`: **33 REINFORCED entries** post-R71 (unchanged; no new violations warranting REINFORCED entries this round). Above threshold but stable via composite mechanism.

Operator action recommended: run `./scripts/consolidate-reinforcements.sh` for CLAUDE-ARCHITECT.md before R72. CLAUDE-ARCHITECT.md's EMPIRICAL-PREMISE-VERIFICATION composite (now 5 sub-variants) and CITATION-AND-ARITHMETIC-ACCURACY composite are candidates for consolidation under a single grouped section. CLAUDE-IMPLEMENTER.md's stability at 33 (composite absorbing new entries) demonstrates the composite mechanism working as intended; consolidation for that file is lower urgency.

---

## Watch list for next round

1. **Pre-authored narrative verification (new sub-variant):** The EMPIRICAL-PREMISE-VERIFICATION composite now covers verbatim prose prescriptions. Watch that future spec rounds apply the "run engine + verify narrative" step to ALL verbatim prose blocks in § 4.x, not just engine surface signatures.
2. **Discriminating AC coverage:** MINOR-1 pattern (binding minimum rather than discriminating property) is subtle and recurrence-prone. When a scenario is designed to show "X causes Y differently from Z," the AC must fail if the pedagogical claim is false. Add this as a pre-emit grilling check.
3. **CLAUDE-ARCHITECT.md consolidation:** 39 entries in 4 consecutive rounds above threshold. If consolidation does not occur before R72, the file will be increasingly difficult to navigate and re-accretion guard decisions will become harder to make accurately.
4. **MINOR-3 pattern:** Hardcoded literals that shadow future-round parameter changes are a recurring implementation-tier pattern (distinct from CITATION-AND-ARITHMETIC-ACCURACY; this is about configuration coupling). No composite exists yet; monitor for recurrence.
5. **OBS-4 (fdr-multiple-testing scenario):** `fdr_selected_indices === firing_shards` (both [2,5,8]) means the e-BH layer is not visually discriminating from per-shard in the current dashboard. If a future round adds e-BH pedagogical content, this scenario will need revisiting to show meaningful FDR discrimination.

---

## Emerging cross-project patterns

- **Pre-authored narrative text not empirically verified (2 instances, R71 MAJOR-1 + MAJOR-2):** First tessera round where verbatim prose strings prescribed in spec § 4.x were copied into production artifacts without empirical verification against actual engine output. Sub-variant 5 added to EMPIRICAL-PREMISE-VERIFICATION composite. This is a new sub-class of the empirical-verification failure mode; below the 3-instance cross-project derivation threshold.
- **0-CRITICAL streak extended: R48–R71 = 24 consecutive rounds** (up from 23 in R70). MERGE-READY routing at 0 CRITICAL despite 2 MAJOR findings confirms the routing rubric operates correctly (MAJOR alone does not block merge).
- **Re-accretion guard applied correctly:** CLAUDE-ARCHITECT.md sub-variant addition (not standalone) and CLAUDE-IMPLEMENTER.md unchanged (no violations) demonstrate the guard functioning as designed for the second consecutive round.
- **LCG-seeded deterministic scenarios:** R71 establishes the 8-scenario canned-demo pattern using 32-bit LCG + Box-Muller with seed-at-spec-time discipline. Future demo rounds can extend this pattern directly.
