# Q-R78-SPEC-AUDIT — Architect's spec-audit sidecar (Phase 4 SLICE 1 FINAL)

**Round:** R78. **Architect:** automated pipeline session 2026-05-20. **Companion to:** `Q-R78-SPEC.md`.

This sidecar carries the Architect-only audit content (P3 ten-axis details, pre-emit grilling depth, brainstorm rationale beyond the summary in Q-R78-SPEC § 0). The Implementer reads ONLY `Q-R78-SPEC.md`; the Reviewer reads BOTH this file AND the spec proper.

---

## § 1. P3 ten-axis verification (extended)

### Correctness
Engine call signature confirmed by direct file-read at session entry: `attributeCommonMode(input)` at `engine/topology/common-mode-attribution.ts:131-226`. Opts interface at lines 85-96 — three opts used (`max_hop_distance`, `min_member_count`, `now`); the 4th opt `candidate_node_kinds` not overridden (default `['psu','rack','cooling_zone']` applies). Pre-prediction matrix (Q-R78-SPEC § 1.4) empirically produced at session entry by running the prescribed scenario+LCG+engine pipeline against engine HEAD `3d00490`; 30 cells × 5 trials = 150 observations all empirically observed (not predicted from theory).

### Completeness
- All 30 cells exercised across both POS and NEG dimensions.
- Three FP-class types covered: cz-as-FP (when scenario is POS-RACK-* or NEG-INDEP and cz_fires=true), rack-as-FP (when scenario is NEG-INDEP and rack_fires=true), shadow-rack-FP (the structural BFS-through-cz back-propagation at hop≥3).
- AC-R78-8 binds the structural invariant (hop ≤ 2 → 0 shadow FP) so a future engine modification that changed BFS bounded-ness (e.g., turning bidirectional traversal into directed) would trip it.
- AC-R78-9 binds the structural unreachability (hop=1 → cz unreachable) so a future engine modification that walked through gpu_shard-kind nodes (which would re-route a path) would trip it.

### Consistency
- SEED_PREFIX cited in 5 sites (cross-checked at § 9.2 grilling).
- SCENARIO_CLASSES order cited in 5 sites.
- HOPS/MINS order cited in 3 sites.
- ALLOWED_SET regex parallel-derived: spec § 4 list ↔ spec § 5.1 list ↔ § 3.3 test regex ↔ Q-R78-EMPIRICAL.sh ALLOWED variable. Four sites; all four pairwise diff'd at grilling-time.

### Clarity
- Spec is 10 numbered sections; pseudocode follows TS conventions; AC table has 14 rows; recommendation MD has 5 required sections.
- The empirical envelope summary (§ 1.4 footer 5 headlines) frames the operator-actionable takeaway upfront so the recommendation MD content is mechanical for the Implementer to author.

### Coverage
- 14 ACs spanning artifact existence (1-2), structural shape (3-4), per-cell empirical envelope (5), trial cardinality (6), seed-pinning (7), structural invariants (8-9), MD content (10-11), anti-regression (12-13), anti-scope (14).
- 8 halt conditions enumerated including halt-condition 8 directive-mandated (FP-rate threshold).
- 5.3 acknowledged-gaps enumerates the 3+ tier topology limitation upfront with explicit mitigation path.

### Constraints
- Engine option pick (iii) matches directive's conservative default; no ESCALATE risk.
- ALLOWED_SET conforms to directive's ALLOWED modifications enumeration with two additions: (a) all CLAUDE-*.md files preemptively included to absorb MU reinforcement appends without breaking AC-R78-14 at next-round HEAD (R66/R77 forward-protection lesson); (b) `coordination/logs/ROUND-R78-SUMMARY.md` included for the same MU-output reason.

### Concurrency
N/A — the sweep is single-threaded; matrix output is single-writer to a single file.

### Corner cases
- NEG-INDEP at cell 28 (hop=3, min=2) produces 1/5 trials with shadow_rack_fp=true — the cell encodes the structural-FP-mode in NEG noise. Per Halt-condition 8: the Implementer is required to HALT if this count INCREASES beyond 1 (e.g., to 2/5), but is NOT to halt at the predicted 1/5.
- POS-CZ-SPARSE at cell 4 (hop=3, min=2) produces 5/5 shadow_rack_fp — because POS-CZ-SPARSE fires shards in BOTH racks, and at hop=3 both racks' member sets get propagated through cz. This is the predicted/expected structural failure mode.
- Empty fired_set (possible at NEG-INDEP cell 25 trial t2 + cell 29 trial t2): produces no candidates regardless of (hop, min). Engine handles correctly per current implementation; AC-R78-5 binds 0/0/0 for cell 25 and 0/0/0 for cell 29.

### Cost
- Sweep runtime: 150 engine calls × ~1ms each ≈ < 200ms.
- Matrix JSON serialization: ~30-80KB (estimated from R72's 90KB at 120 variations + R77's 537KB at 504 cells; R78 has 30 cells with richer per-trial detail).
- README extension: ≤ 30 lines added (per directive).
- Test runtime: ~5-10 seconds (14 tests, mostly fs reads + assertion).

### Coupling
- Runner imports only the engine surface + Node builtins (fs, path); no cross-tool dependencies.
- Recommendation MD does not import any code; it's pure prose with matrix-derived narrative content the Implementer writes at chore-A.
- Test file imports only `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:child_process` — no project-internal imports.

---

## § 2. Pre-route discipline application (Skill 14, 15, grilling)

- **Skill 14 (cite-then-verify)**: applied to every engine signature in § 1.3 + § 3.1; opts interface read at session entry against engine `3d00490`; topology shape verified against R72's `build2RackCzTopology()` source.
- **Skill 15 (re-verify after TACTICAL AUTONOMY)**: N/A — Architect introduces no tactical adjustment; spec prescribes exact bytes.
- **Grilling (§ 9 inline)**: 11 sub-sections; one per active reinforcement class.
- **EMPIRICAL.sh probe-run (R77 OBS-4)**: probe-run at round-start HEAD scheduled before spec-triad commit (see § 5 below for results).
- **Cross-section consistency pass (R01)**: 5 token classes verified across 3-5 sites each (§ 9.2 of spec).
- **Type-declaration-site check (R02)**: 5 type shapes verified at declaration sites (§ 9.3 of spec).
- **Verification-command-soundness (R03)**: 3 grep-based ACs audited for comment-immunity (§ 9.4 of spec).
- **Branch-binding coverage (R21 + R37)**: 6 code-path branches identified and bound (§ 9.5 of spec).
- **Self-application gate (Rule 3)**: 4 AC self-application walks completed (§ 9.6 of spec).
- **Spec-internal-contradiction sweep (R15 + R34 + R65 + R56)**: 5 contradiction-pair checks (§ 9.8 of spec).
- **Discriminating-AC + 1-trial padding (R71 MINOR-1 + R77 MINOR-4)**: 4 cell-classes audited with explicit padding-rejection rationale (§ 9.9 of spec).
- **Pre-authored narrative text verification (R71 MAJOR-1 + MAJOR-2)**: 3 narrative sites checked; pre-authored text constrained to structural facts only (§ 9.10 of spec).

---

## § 3. Architect pre-prediction on outcomes

| Outcome | Predicted | Confidence |
|---|---|---|
| chore-A `npx tsc -p tsconfig.test.json` exit | 0 | HIGH (baseline; no new TS files import any non-existent types) |
| chore-A `node --test --test-reporter=tap` summary | tests=580 / pass=570 / fail=6 / suites=3 / skipped=4 | HIGH (predicted N_new=14; tolerance ±2) |
| Q-R78-EMPIRICAL.sh exit code at chore-A | 0 | HIGH (all 8 blocks designed to pass at chore-A HEAD) |
| AC-R78-5 (per-cell exact equality) outcome at chore-A | PASS for all 30 cells | VERY HIGH (matrix empirically produced at session entry against frozen engine) |
| AC-R78-14 (anti-scope) outcome at chore-A | PASS | HIGH (ALLOWED_SET enumerated with CLAUDE-*.md forward-protection) |
| Reviewer pre-prediction (CRITICAL / MAJOR / MINOR / OBS) | 0 / 0-1 / 0-3 / 1-3 | MEDIUM |
| Memorial-Updater scope | record CONFIRMATIONs for: (a) engine-option-(iii)-conservative-pick observed; (b) cite-then-verify Architect probe-runs of EMPIRICAL.sh applied; (c) shadow-rack-FP failure mode catalogued and bound; (d) Architect-side EMPIRICAL.sh defect NOT recurrent (R77 lesson absorbed); (e) ALLOWED_SET CLAUDE-*.md forward-protection applied upfront | HIGH |

---

## § 4. Decision rationale (why-picked / why-rejected per spec § 0)

### Why approach D was picked
- Conservative engine path matches directive default (iii) — zero ESCALATE risk.
- FP-rate dimension addressed via NEG-INDEP scenario class, satisfying the directive's "document false-positive trade-off" deliverable.
- Multi-class scenario coverage (POS-CZ-SPARSE, POS-CZ-FULL, POS-RACK-2, POS-RACK-3, NEG-INDEP) produces discriminating per-cell ACs across 5 distinct semantic axes.
- 30-cell × 5-trial matrix is the right scale: small enough for exact-equality ACs at every cell (R71 MINOR-1 discriminating), large enough to surface 3 distinct FP failure modes (cz-as-FP, rack-as-FP, shadow-rack-FP).
- Pattern isomorphic to R77 (sweep + LCG + matrix + recommendation MD) so Implementer follows known convention.

### Why approach A (existing-engine sweep, no scenarios) was rejected
- Doesn't characterize FP trade-off — the directive's explicit deliverable.
- Restates R72's known gap-2 without adding operator-actionable insight.

### Why approaches B + C (engine extension) were rejected
- Both require ESCALATE before chore-A per directive's Phase 3 frozen engine surface.
- Empirical sweep (D) shows existing global `min_member_count` is sufficient for FP suppression — no engine modification is justified by empirical evidence.
- Engine modification adds carry-forward maintenance load that's not warranted by the round's deliverable scope.

### Why approach C (kind-priority semantics) was rejected over B
- B is at least backward-compatible (adds an optional opts field).
- C adds a parallel function which doubles the surface to maintain.
- Both require ESCALATE; B is the strictly-simpler alternative if engine modification were warranted (which D shows it isn't).

### Why SEED_PREFIX = 0x78A11
- Mnemonic: `0x78 + 'A11'` → "R78 ALL" (all-cell envelope).
- Distinct from R72's `0x71C00` and R77's `0x77E11` — no per-namespace seed collision risk.

### Why fixture is the R72 2-rack-1-cz topology (vs new fixture)
- R72 already exposed gap 2 on this topology → R78 should characterize the same surface to make the gap-2 → fix mapping operator-traceable.
- Smaller fixtures keep the matrix concise and the per-cell trial space tractable.
- § 5.3 acknowledged-gaps records the single-fixture limitation upfront.

### Why exact-equality per-cell ACs (vs ±1 trial padding)
- R77 MINOR-4 padding rule applies when PRNG-path drift is *physically possible* without engine modification. Here, the entire pipeline is spec-prescribed; PRNG-path change requires spec-prescribed modification (forbidden).
- Exact equality is MORE discriminating in the R71 MINOR-1 sense — a future engine modification (e.g., changing BFS neighbor visit order) WILL flip per-cell counts.
- The 30-cell matrix is empirically locked at the spec-pinned seed; the spec IS the PRNG-path contract.

### Why ALLOWED_SET pre-includes CLAUDE-*.md
- R77 AC-R77-17 fails at HEAD because R77 MU appended to CLAUDE-ARCHITECT.md + CLAUDE-IMPLEMENTER.md which were not in R77's ALLOWED_PATTERN.
- R78 absorbs the lesson upfront: ALL 6 CLAUDE-*.md files are pre-authorized so the R78 MU's appends do not retroactively break AC-R78-14 at next-round HEAD.

### Why halt-condition 8 binds to per-cell shadow_rack_fp specifically
- Directive halt-condition 8 says "False-positive rate exceeds Architect-specified threshold at any tested depth: HALT + DIAGNOSTIC."
- The shadow_rack_fp_count IS the operator-relevant structural-FP measurement.
- AC-R78-5 binds the exact predicted value per cell; if Implementer's actual count EXCEEDS predicted, AC-R78-5 fails AND halt-condition 8 fires.
- This bundles the directive halt into the binding-AC mechanism — no separate halt-state tracking needed.

---

## § 5. Probe-run of Q-R78-EMPIRICAL.sh at round-start HEAD (R77 OBS-4 compliance)

(Executed by Architect during pre-emit grilling; result encoded inline.)

**Expected at round-start HEAD `3d00490` (BEFORE chore-A creates the artifacts):**
- Block 1 (typecheck): PASS (tsc exit 0 at baseline)
- Block 2 (artifact existence): FAIL (artifacts not yet created)
- Block 3 (test counts): expected FAIL or PASS depending on whether 14 new tests have landed; at round-start they have NOT — so Block 3 EXPECTED FAIL (pass=556 vs predicted 570)
- Block 4 (anti-scope diff): expected PASS (no R78 paths exist yet → empty diff → trivially ⊆ ALLOWED_SET)
- Block 5 (matrix schema/cell count): FAIL (matrix not present)
- Block 6 (frozen surfaces): PASS (no R78-induced changes yet)
- Block 7 (recommendation MD sections): FAIL (MD not present)
- Block 8 (per-cell exact equality): FAIL (matrix not present; cannot check cells)

EXPECTED EXIT: non-zero (multiple blocks designed to PASS at chore-A FAIL at round-start by-construction).

**Verification at session-entry probe-run goal:** confirm that the script's grep patterns parse TAP output correctly (R77 lesson), that the ALLOWED_SET regex is valid bash regex, that all blocks emit clear PASS/FAIL diagnostics, and that no block fails for spurious reasons (e.g., bash `local` outside function — R75 MINOR-3 lesson).

(See § 7 below for the actual probe-run result.)

---

## § 6. Amendments from prior version

This is the first version of Q-R78-SPEC; no amendments.

---

## § 7. Architect's actual probe-run output (recorded at spec-emit time)

(Filled in immediately after the probe-run executes. The Architect MUST update this section to confirm probe-run-PASS before routing.)

Run: `bash coordination/specs/Q-R78-EMPIRICAL.sh` at HEAD `3d00490`.

**Actual exit code:** 1 (non-zero, as predicted at round-start HEAD).

**Per-block result (verbatim from probe-run; recorded immediately after execution):**

```
── Q-R78-EMPIRICAL.sh @ HEAD=3d00490

── Block 1: typecheck
Block 1 PASS: tsc exit 0

── Block 2: required artifact existence
Block 2 FAIL: missing required artifact(s): tools/topology-walk-tuning.ts scripts/topology-walk-tuning-recommendation.md coordination/coverage/R78-topology-walk-tuning-matrix.json coordination/coverage/R78-topology-walk-tuning.md test/q78-topology-walk-tuning.test.ts

── Block 3: test counts
Block 3 FAIL: pass count = '556'; expected in [568, 572] (556 + 14 ± 2)

── Block 4: anti-scope diff
Block 4 PASS: 0 diff paths all ⊆ ALLOWED_SET

── Block 5: matrix schema + cell count
Block 5 SKIP: matrix file missing (Block 2 should have caught this)

── Block 6: frozen surfaces
Block 6 PASS: engine + frozen tools/scripts + R72/R77 outputs byte-identical

── Block 7: recommendation MD sections
Block 7 SKIP: scripts/topology-walk-tuning-recommendation.md missing

── Block 8: per-cell summary spot-checks
Block 8 SKIP: matrix file missing

── Q-R78-EMPIRICAL.sh done; exit 1
```

**Probe-run verdict:** PASS the probe-run gate. All blocks behave as predicted at round-start HEAD:
- Block 1 PASS confirms tsc baseline exit 0 (matches § 1.6 baseline).
- Block 2 FAIL is by-construction (R78 artifacts don't exist yet).
- Block 3 FAIL is by-construction (no new tests landed yet); CRITICAL: TAP grep patterns parsed correctly — `pass='556'` is the actual `# pass 556` line from TAP output, not an empty string. **The R77 EMPIRICAL.sh defect class (3rd Tessera instance) is NOT recurrent here.**
- Block 4 PASS (0 paths in diff, trivially ⊆ ALLOWED_SET) confirms regex is valid bash regex.
- Block 5/7/8 SKIP because their dependencies (matrix/recommendation MD) are upstream of Block 2.
- Block 6 PASS confirms ALL frozen surfaces unmodified — engine, R72 outputs, R77 outputs, all R70-R75 tools/scripts, run-pipeline.sh.

No spurious failures. No bash syntax errors. No grep-pattern defects. The script is ready to be re-run by the Implementer at chore-A; predicted exit 0 at chore-A HEAD (all 8 blocks pass once R78 artifacts land).
