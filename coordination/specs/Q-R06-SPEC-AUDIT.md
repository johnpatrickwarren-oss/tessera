# Q-R06-SPEC-AUDIT — Architect ceremony sidecar

_Sidecar to `Q-R06-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked / why-rejected, pre-route discipline application, architect pre-predictions, Q-JC1 brainstorm-re-evaluation per R12 reinforcement, and Q-R06 → Q-R07 sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_HEAD at audit-sidecar emit: `a75ebc4` (chore(R06) NEXT-ROLE.md preparation; R05 close-state code-tree at `8d724de`)._

---

## Brainstorm

5 distinct R06 approaches enumerated and weighed.

### Approach A — Full literal interpretation of Q-JC1 (vendor calibrate.ts + full dep closure)

**Strengths:** Honors the literal Q-JC1 (α) disposition for all three named files (curate-baseline-pipeline.ts + family-c.ts + calibrate.ts). Future-round wiring (R07+) can call `calibrate(curatedBundle, ...)` directly without re-vendoring. Single-round closure of "all inherited tools vendored."

**Weaknesses:** `tools/calibrate.ts` is 2937 lines with a transitive dependency closure including:
- `tools/profile-loader.ts` (~unknown lines; imports `js-yaml` — a new npm dep not currently in package.json)
- `tools/bundle-loader.ts`
- `tools/calibrators/{family-e, _shared, effective-config, bake-profiles, family-a}.ts` (5+ files; family-a alone is 15K)
- `engine/resamplers/ar1.ts`, `engine/resamplers/cholesky.ts` (not currently vendored)
- Plus js-yaml as a new npm devDependency

Cumulative scope estimate: ~15+ vendored files + 1 new npm dep + 4-6 new q01 list-extension entries + significant test substrate. This is **R01-class scope** (R01 vendored 32 files in a single round; the session crashed at the coordination step per MEMORIAL line 89 entry).

**Hidden assumptions:** That John's Q-JC1 disposition was issued with full knowledge of the dep closure. Counter: the disposition memo + the pre-disposition artifact both list the three named files without enumerating transitive deps; the closure scope was not surfaced. The disposition's INTENT is "vendor at-pin verbatim" (no inlined behavior changes, no Tessera-native rewrite) — this is preserved by Approach B equally well.

**Risks:** 
- Session-crash recurrence (R01-class scope, 15+ files in single GREEN commit).
- Anti-scope drift: vendoring chain may pull in even more transitive deps (e.g., bake-profiles → effective-config → ?); each additional file is another silent-vendoring violation if not pre-enumerated.
- npm dep addition violates the project's "zero external deps" status (only `@types/node` + `typescript` devDeps at R06 baseline).
- "Dead substrate" anti-pattern (R01 ville-preservation = REMOVED-AT-R02 per VENDORING-MANIFEST line 45): vendoring calibrate.ts without wiring it produces an unrunnable substrate that adds maintenance burden without behavioral value.

**Verdict:** REJECTED. R01 session-crash class is the dominant risk; the "literal Q-JC1 disposition" interpretation can be honored at R08+ when actual wiring naturally co-locates the vendoring effort. R06 narrows per Approach B with explicit brainstorm-re-evaluation surfacing for John's review at next operator gate.

### Approach B — Narrow Q-JC1 to compilation-tractable subset (curate-baseline-pipeline + family-c + _shared); defer calibrate.ts to R08+

**Strengths:** 
- Right-sized scope: 3 vendored files + 1 new Tessera-native file + 1 schema delta + 5 deltas to existing files + 1 new test file = roughly R02 scope (R02 = 7 surfaces; R06 = 10 surfaces but several are list-extensions of existing files).
- Honors Q-JC1 INTENT (vendor at-pin; no inlining; no rewrite) for the 2 files that are actually compilable at R06 (curate-baseline-pipeline only imports already-vendored config.ts; family-c needs only co-vendoring of _shared.ts).
- Stage 2a is fully implementable with the vendored estimators (`fastMCD`, `mahalanobisSqFromL`, `chiSqQuantile975`, `choleskyLocal` — all become callable after Delta 7a/b/c).
- Stage 3a satisfied by structural-typing format compatibility (BaselineBundle already vendored at engine/types/config.ts:394 — pre-pass output IS structurally a BaselineBundle).
- Q-JC2 (pre-pass only) honored: pre-pass is a pure function; no runtime / always-on behavior.
- Zero new npm dependencies.
- No "dead substrate": every vendored function is exercised by the q06 test fixtures (fastMCD via Stage 2a; choleskyLocal via Mahalanobis-computation; chiSqQuantile975 via cutoff comparison).
- No silent narrowing: Q-JC1 deviation explicitly documented in spec § Mechanism primitive 2 + audit sidecar Brainstorm re-evaluation block + Open Question OQ-1 (per R12 reinforcement).

**Weaknesses:** 
- Deviates from literal Q-JC1 disposition by deferring calibrate.ts vendoring.
- R12 reinforcement requires brainstorm-re-evaluation block whenever an approach is re-selected that the original brainstorm flagged with documented weaknesses. The Q-JC1 (α) disposition's pre-prediction was confidence HIGH for all three files; R06's narrowing is partial re-selection of (γ) "write Tessera-native equivalent" only for calibrate.ts's role at R06 (Stage 3a = format compatibility instead of wired handoff). Documented.
- Future R08+ round must include calibrate.ts vendoring + wiring; the brainstorm "deferral masquerading as decision" (Approach C of R05 brainstorm) lesson applies — R06's deferral has a clear future round commitment, mitigating the risk.

**Hidden assumptions:** 
- That John's Q-JC1 disposition tolerates "as feasible for compilation" narrowing when the closure scope is R01-class. Verified by surfacing as OQ-1.
- That Stage 3a "calibration handoff" can be satisfied at R06 by format compatibility instead of wired integration. Verified by reading the disposition memo: Q-JC1 (α) explicitly says "Stage 2 is a NEW Tessera-only file `tools/curate-baseline-pre-pass.ts` that runs BEFORE `tools/calibrate.ts`" — "runs BEFORE" is informal; there's no R06 implementation that calls calibrate. The pre-pass writes a bundle; future-round work wires.
- That the future R08+ calibrate.ts vendoring round will not regret the deferral. Counter: the deferral keeps R06 right-sized; if R08+ is also too large with the full closure, R08+ can split further; the deferral is not load-bearing for any future round to ship.

**Risks:** 
- Reviewer flags the Q-JC1 deviation as a discipline failure. Mitigated by explicit brainstorm-re-evaluation block (R12 reinforcement) + OQ-1 surfacing for John.
- Future R07 architect needs the deferred deps and re-opens the question. Mitigated by clear documentation of which files are deferred and why.

**Verdict:** SELECTED. The right-sized scope + zero-new-deps + zero-dead-substrate properties dominate; the Q-JC1 deviation is documented per R12 reinforcement and surfaced for operator review.

### Approach C — Vendor only the audit-pipeline orchestrator; implement Stage 2a with INLINE Mahalanobis (no MCD vendoring)

**Strengths:** Smallest possible vendoring scope (1 file: curate-baseline-pipeline.ts only).

**Weaknesses:** 
- Inline Mahalanobis replaces the inherited MCD-robust subset with sample-based covariance — substantially weaker statistical guarantee (sample covariance is contaminated by outliers; that's the whole reason the inherited estimators use MCD/MRCD/LW per Family C dispatch at engine/types/families/c.ts:39-45).
- Memorial F sub-rule 1 fires (parallel implementation of a statistically-load-bearing surface — Mahalanobis-cutoff screening). Pre-Phase 2 vendor-first commitment violated.
- The memo § 2 explicitly says "Run the INHERITED per-cell robust estimators (MCD/MRCD/LW) at the WINDOW level" — inline Mahalanobis is a different surface entirely.

**Hidden assumptions:** That sample-based Mahalanobis is "close enough" for R06's screening purpose. Counter: MCD's 0.5 breakdown point (engine/types/families/c.ts:374) is the load-bearing property — sample-based Mahalanobis has 0 breakdown point (a single outlier inflates the sample covariance, mass-flagging the entire window as non-contaminated).

**Verdict:** REJECTED. Parallel implementation of a statistically-load-bearing algorithm violates vendor-first discipline; non-robust Mahalanobis defeats the screening stage's purpose; memo Stage 2a binding explicitly names the inherited estimators.

### Approach D — Vendor toolchain at R06; ship Stage 2a STUB only; defer Stage 2a behavior implementation to R07

**Strengths:** Cleanest separation of vendoring concerns from algorithm concerns. R06 = "vendoring round" only.

**Weaknesses:** 
- Operator-set scope per NEXT-ROLE.md explicitly says Stage 2a is in R06. Silent deferral violates operator scope.
- "Vendoring only" round produces R01 ville-preservation anti-pattern (vendored tools not exercised by any q06 test → "dead substrate").
- R06's Q-cycle estimate (memo § 3 = "1 round full tier; ~45-60 min wall-clock") explicitly counts Stage 2a + Stage 3a in R06.

**Verdict:** REJECTED. Operator scope is firm; stub-only deferral is silent narrowing.

### Approach E — Run a fix-cycle on R05 instead

**Strengths:** R05 had 3 MINORs (per REVIEWER-REPORT-R05.md — MEMORIAL.md R05 Reviewer section). A fix-cycle could close them.

**Weaknesses:** 
- R05 was MERGE-READY at 0 CRITICAL + 0 MAJOR + 3 MINOR + 5 OBS. The MINORs are all non-blocking (architect-acknowledged residuals / disposition candidates for future rounds).
- Pure fix-cycle defers the operator-set R06 scope (Stage 1 + Stage 2a + Stage 3a) by a full round. Misses the critical-path commitment (memo § 1 executive summary: curation should be available before warm-start runtime is exercised against production-shape fleet data).

**Verdict:** REJECTED. R05 MINORs are non-blocking; R06's operator-set scope is the load-bearing work.

### Tier-rubric verdict

Per anchor `templates/PRD-TEMPLATE.md` Round-Scaling skill 11 (CLAUDE-COMMON.md `# ── TIER SELECTION` section) walked top-down:

1. Does any A1-A7 fire?
   - **A1 (new external dependency)**: NO — R06 introduces zero new npm deps; vendored files have zero new transitive deps beyond the engine/* + tools/_shared.ts already-vendored or co-vendored surfaces.
   - **A2 (new architectural pattern with no precedent)**: YES — R06 introduces the FIRST tools/ vendoring at Tessera (R01-R05 vendored under engine/ + test/). Also introduces the FIRST contamination-screening surface in Tessera (no precedent in R01-R05 substrate).
   - **A3 (unresolved open question this round must resolve)**: PARTIAL — Q-JC1 disposition deviation (calibrate.ts deferral) is surfaced via OQ-1 but does not BLOCK R06 implementation; R06 proceeds on the narrowing with audit-trail and operator-review-at-next-gate.
   - **A4 (novel data model)**: NO — `BaselineCurationDecision`/`BaselineCurationDecisionId`/`BaselineBundle` are all inherited types; R06 extends the enum union additively but doesn't introduce novel structure.
   - **A5 (critical NFR ties materially constrain design)**: NO — performance NFR (Phase 1 storage 1.2-1.5×) is non-binding at R06 (PR-F5 deferred to R07+ per memo § 4.2 R-E3 and R06-SAS-16).
   - **A6 (large blast radius)**: NO — touches 4 prior-rounds' production code paths (config.ts at R02; q01 tests at R01; vendor script at R01); the touches are additive (no behavior change to existing R01-R05 surfaces; q01 list extensions don't change test logic).
   - **A7 (first-time territory)**: YES — Phase 1 SLICE 4 has no precedent at Tessera; first Tessera-native tool atop inherited DeploySignal substrate (memo § 8 archive significance #1).
   - **Conclusion**: A2 + A7 fire; A3 partial. **Verdict: full tier.**

2. Tier verdict recorded per CLAUDE-COMMON.md `## Recording the decision` requirement (no record required for full but recorded here for consistency with R02/R03/R04/R05 audit sidecars).

---

## Brainstorm re-evaluation (R12 reinforcement)

Per the R12 reinforcement (CROSS-PROJECT-MEMORIAL.md line 386):

> "In T1 self-spec (Implementer-authored spec) contexts, fix-cycle preambles that re-select an approach the original brainstorm explicitly rejected must include a 'Brainstorm re-evaluation' subsection that (1) quotes the prior brainstorm's documented weakness for the re-selected approach, (2) explicitly acknowledges the weakness as an accepted trade-off, and (3) names the resulting coverage gap or compensating control."

CLAUDE-ARCHITECT.md "Fix-cycle considerations" extends the same discipline to non-T1 Architect rounds when the resolution re-selects an approach the original brainstorm rejected or flagged with documented weaknesses.

R06's Q-JC1 narrowing is precisely such a re-selection: John's pre-disposition picked Q-JC1 (α) "Vendor at-pin verbatim" for all three named files; R06 narrows the Vendor list to two of the three. The pre-disposition's confidence was HIGH for the pick; R06's deviation is a partial re-selection of (γ) "Tessera-native equivalent" only for calibrate.ts's role at R06 (Stage 3a = format compatibility instead of wired handoff via vendored calibrate.ts).

### (1) Quote the prior brainstorm's documented weakness for the re-selected approach

From `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` § 5 Q-JC1 disposition:

> **(γ) Write Tessera-native calibrate-equivalent from scratch** — maximal flexibility, maximal scope creep, rejected without strong reason.

R06 is not writing a Tessera-native calibrate-equivalent — R06 is deferring the vendoring of `tools/calibrate.ts`. The actual approach R06 selects is closer to (α) but narrowed. There is no exact equivalent in the original brainstorm; the closest analog is a partial-α with explicit deferral of one of the three named files.

### (2) Acknowledge the weakness as an accepted trade-off

**Accepted trade-off:** R06 does NOT make `tools/calibrate.ts` available in the Tessera tree at R06 close. Consequences:
- A future R08+ round must perform the calibrate.ts vendoring (plus dep closure: ~10+ files + js-yaml npm dep).
- Stage 3a "calibration handoff" at R06 is satisfied by structural format compatibility (curated bundle IS a BaselineBundle) rather than wired integration (call calibrate(curatedBundle)). Wired integration deferred to R08+.
- The 9-Q-JC pre-disposition's confidence-HIGH on Q-JC1 (α) is partially honored (2 of 3 files vendored; calibrate.ts deferred).

**Why accepted:** The alternative (Approach A) is R01-class scope (15+ vendored files + new npm dep + extensive test substrate, single GREEN commit). R01's outcome was operator-manual-rescue per MEMORIAL line 89 (session terminated at coordination step with 3 consecutive API 500 errors). Repeating that risk against an architectural decision that can be cleanly deferred (no R06 consumer of calibrate.ts; no R07 consumer either — R07 = Stage 2b FCP-1 which extends the pre-pass, not calibrate.ts) trades a known scope discipline for an unknown crash recovery cost.

### (3) Name the resulting coverage gap or compensating control

**Coverage gap:** No R06 test exercises `tools/calibrate.ts` directly (because the file is not in the Tessera tree at R06 close). Stage 3a's wired handoff is unverified at R06 close.

**Compensating control:** 
- Structural-typing AC-7 verifies the curated bundle output satisfies the `BaselineBundle` interface (Object.keys check + cell_dim preservation + version + generated_at + seed preservation). Any future calibrate.ts wiring at R08+ will receive a structurally-compatible bundle.
- AC-22 verifies no `as any` casts in the pre-pass code (executable lines), so the structural-typing guarantee is type-checked, not cast-bypassed.
- Open Question OQ-1 surfaces the deferral for John's review at next operator gate; the operator can re-direct R07 or R08 to perform the deferred vendoring if priority shifts.

---

## Q-R06 → Q-R07 sequencing context

R07 = SLICE 5 = Stage 2b FCP-1 + Stage 3b warm-start eligibility tagging scope per the pre-disposition memo:

- **Stage 2b FCP-1 fleet-correlated-pattern primitive** (Q-JC4 sequential e-process; Q-JC4a betting-adaptive `p_alt`; Q-JC4b Bayesian shrinkage `p_base` with disjoint-data constraint; Q-JC4c separate pipe from Q-J1 e-BH).
  - Architect-pre-prediction (HIGH confidence): a new function `applyFleetCorrelatedScreening(prePassResults: PrePassResult[], opts): FleetScreeningResult` that takes the R06-shipped per-shard masks (one per run) and computes the sequential e-process per fleet-time-window.
  - The R06 D11 audit summary's `n_runs_screened` + per-run mask data feeds the R07 FCP-1; R06's pre-pass output preserves the structural surface needed for R07 input.
  - PR-F8 (pair-review trigger; new for SLICE 5 per memo § 6).

- **Stage 3b warm-start eligibility tagging** (Q-JC5: reuse R03 `residual_seed_hash` sentinel mechanism).
  - Wire FCP-1-invalidated windows into the per-shard residual stale-flagging at the seed-hash level.
  - Couples to R03's `residual_seed_hash` (R03-shipped at warm-start.ts:32 + AC-2/4 bindings).
  - Architect-pre-prediction (HIGH confidence): a new function in `tools/curate-baseline-pre-pass.ts` (or sibling) that, given a FleetScreeningResult, produces a sentinel-tagged BaselineBundle whose per-run `tenant_id` carries a "stale" suffix or whose seed_hash derivation excludes the contaminated windows.

R08+ scope (post-R07):

- **`tools/calibrate.ts` vendoring + dep closure.** The Q-JC1 brainstorm re-evaluation deferral lands here. Estimated scope: ~10-15 vendored files + 1 npm dep (js-yaml) + q01 list extensions + test substrate. Likely full tier with explicit close-walk artifact.
- **Wired handoff at calibrate.ts main()**: `calibrate(curatedBundle, ...)` invocation; the structural-typing AC-7 at R06 is replaced by a wired-integration AC at R08+.
- **PR-F9 empirical-performance measurement** (per memo § 6): MCD per-window per-shard at fleet scale (N=10³ × M=30-day windows). Empirical CPU profile against the substrate that R06 + R07 produce.

R06 will NOT be a separate fix-cycle: R05 close was MERGE-READY at 0 CRITICAL + 0 MAJOR + 3 MINOR + 5 OBS — none of those MINORs block R06 substrate work (R05 MINORs are about welford_state read-back tightness + attestation-accuracy; orthogonal to R06's vendoring + screening work). R06 does NOT bundle R05 MINORs (the orthogonal R05-SAS-13 → R06-SAS-13 carry-forward fences them).

The R01 MINOR-3/4/5/6/8/9 unbundled fence (R02-SAS-9 → R03-SAS-11 → R04-SAS-21 → R05-SAS-13 → R06-SAS-13 carry-forward chain) is preserved: these were unbundled at R02 to keep scope tight and remain unbundled through R06 for the same reason.

---

## Pre-route discipline application

### Skill 14 — PRD-conjunction-cross-check (symmetric)

PRD AC-P1 conjuncts: (i) "per-shard any-time Ville bound is preserved" + (ii) "fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)". PRD AC-P2 conjuncts: (i) "warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold)" + (ii) "strict-upgrade at 60 samples preserves inherited single-instance behavior".

R06 narrows AC-P1 + AC-P2 delivery to the BASELINE-CURATION substrate. The PRD conjunct "preserves inherited single-instance behavior" requires the per-shard residual machinery to compute against an UNCONTAMINATED baseline; R06's Stage 2a drops contaminated baseline ticks (via MCD-robust screening) before the residual machinery consumes them. The literal numeric thresholds 20 + 60 (R03-shipped WARM_START_THRESHOLD + STRICT_UPGRADE_THRESHOLD) are preserved verbatim (R06 doesn't touch the per-shard runtime substrate — R06-SAS-8 fences it).

**Symmetric application:** R06 does NOT widen any PRD conjunct. The fleet-level e-BH FDR control (AC-P1 conjunct ii) is unaffected by R06's pre-calibration screening (Q-JC4c (α) separate pipe disposition explicitly preserves the disjoint-surface architecture). Stage 2a is calibration-time only (Q-JC2 (α) pre-pass only); runtime detector pipeline is untouched. The "any-time Ville bound" is preserved because the baseline-curation pre-pass operates upstream of the detector cascade.

### Skill 15 — Prescription-to-AC coverage

Every line in spec § Mechanism (primitives 1-8) traces to ≥1 AC:
- Primitive 1 (vendoring at-pin via extended script) → AC-14 + AC-15 + AC-16 + AC-18.
- Primitive 2 (Q-JC1 narrowing) → OQ-1; no AC directly binds the deferral (deferral is an absence; verified by NEXT-ROLE.md routing without DIAGNOSTIC for additional vendoring).
- Primitive 3 (Stage 2a pre-pass behavior) → AC-1 through AC-13 + AC-19.
- Primitive 4 (single-window-per-run granularity) → AC-1 + AC-2 + AC-6 (per-run iteration evident in fixture handling).
- Primitive 5 (shard identifier = tenant_id) → AC-6 (TWO_RUN_BUNDLE preserves tenant_id) + AC-7 (Object.keys check confirms tenant_id is preserved at the run level).
- Primitive 6 (Stage 3a structural-typing handoff) → AC-7.
- Primitive 7 (BaselineCurationDecisionId D11/D12/D13 extension) → AC-9 + AC-11 + AC-18 (typecheck binding) + AC-20 (R05 prior tests still pass under additive enum extension).
- Primitive 8 (vendoring infrastructure extension) → AC-14 + AC-15.

### Memorial F sub-rule application

- **F sub-rule 1 (compile-time-substrate multi-read-paths)**: Stage 2a adds new PRODUCER (D11) for `BaselineCurationDecision` audit records on the existing `baseline_curation_pipeline_diagnostics` field. Architect Step-0-grep: no other producers exist in Tessera tree (D1-D10 producers live in vendored `tools/curate-baseline-pipeline.ts` only; D5-D10 throw NotImplementedError at runtime). R06's D11 producer is the curate-baseline-pre-pass.ts function; lives in tools/ adjacent to the inherited orchestrator. Consumers of `baseline_curation_pipeline_diagnostics`: zero in Tessera tree at R06 (R07+ will add the wiring). No CONSUMER drift risk at R06.
- **F sub-rule 2 (MERGE-vs-REPLACE substrate-stamped-fields-preservation)**: D1-D10 audit record producers (in vendored `curate-baseline-pipeline.ts`) continue to populate per the inherited orchestrator. R06's D11 is additive (new field in the Partial<Record> map). No existing records modified.
- **F sub-rule 3 (ADR-anti-scope-preservation)**: all SCOPING-MEMO-v0.3 anti-scope clauses (A1-A17) preserved (R06-SAS-7 fences inherited engine internals; R06-SAS-3 fences always-on filtering; etc.). All 9 Q-JC dispositions either implemented (Q-JC1 narrowed per re-evaluation block) or deferred to R07+ (Q-JC4/4a/4b/4c, Q-JC5, Q-JC6).
- **F sub-rule 4 (Pre-existing-property-vs-new-AC coherence)**: The Ville-bounded per-shard FPR guarantee (Q-J1 hybrid disposition) is preserved at the curation layer; FCP-1 detection is calibration-input filter, not detector-output filter (Q-JC4c (α) separate pipe). R06 implements Stage 2a + Stage 3a only; Stage 2b FCP-1 is R07.

### Pair-review trigger summary

- **PR-F8 (new for SLICE 5; armed but not fired at R06)**: FCP-1 statistical-correctness pair-review. Fleet-correlated-detection on synthetic-fleet H₀ + injected-fleet-event H₁ evidence matrix. R07 close-walk.
- **PR-F9 (new for SLICE 4; armed but not fired at R06)**: Empirical performance pair-review. MCD per-window per-shard at N=10³ shards × M=30-day windows. Architecturally deferred per memo § 4.2 R-E3 — fires at R07 close-walk when fleet-scale substrate exists.
- **PR-F10 (conditional)**: SR / RPCA / BOCPD additions — Q-JC6 disposition explicitly defers; R08+ conditional on empirical-need trigger.

### Type-declaration-site discipline (R02 OBS-3 reinforcement; 5th consecutive application)

Every external type instantiated in pseudocode opened at its declaration site at HEAD `a75ebc4` or at vendored-source SHA `5a72371`:
- `BaselineBundle` at Tessera-vendored engine/types/config.ts:394.
- `BaselineCurationDecision` at Tessera-vendored engine/types/config.ts:222.
- `BaselineCurationDecisionId` at Tessera-vendored engine/types/config.ts:210 (extended at Delta 1 to add D11/D12/D13).
- `FastMCDResult` at deploysignal-source `tools/calibrators/family-c.ts:457` (will be vendored at R06 Delta 7c).
- `FASTMCD_DEFAULT_ALPHA` (number constant) at deploysignal-source `tools/calibrators/family-c.ts:449`.
- `FASTMCD_DEFAULT_SEED` (number constant) at deploysignal-source `tools/calibrators/family-c.ts:450`.
- `fastMCD` function at deploysignal-source `tools/calibrators/family-c.ts:538`.
- `mahalanobisSqFromL` function at deploysignal-source `tools/calibrators/family-c.ts:386`.
- `chiSqQuantile975` function at deploysignal-source `tools/calibrators/family-c.ts:356`.
- `choleskyLocal` function at deploysignal-source `tools/calibrators/_shared.ts:31`.

All declaration sites verified during spec authoring via file reads at the respective SHAs.

### Re-export-chain-check discipline (R03 MINOR-3 reinforcement; 3rd application)

R06 has multiple new cross-module imports; each verified for direct-export vs re-export chain:
- `BaselineBundle` from `../engine/types/config`: declared AND exported directly at config.ts:394 (`export interface BaselineBundle`).
- `BaselineCurationDecision`, `BaselineCurationDecisionId` from `../engine/types/config`: similarly direct exports.
- `fastMCD`, `mahalanobisSqFromL`, `chiSqQuantile975`, `FASTMCD_DEFAULT_ALPHA`, `FASTMCD_DEFAULT_SEED`, `FastMCDResult` from `./calibrators/family-c`: all direct exports at the named line numbers in the vendored source.
- `choleskyLocal` from `./calibrators/_shared`: direct export at `_shared.ts:31`.

No re-export chains to traverse; all imports are direct-from-declaration.

### Grep-pattern-soundness discipline (R03 MINOR-2 reinforcement; 3rd application)

R06 has one grep-evidence AC (AC-22):
- Pattern: `grep -nE "^[^/*]*as any" tools/curate-baseline-pre-pass.ts` → expect 0 matches.
- Soundness: the anchor `^[^/*]*` requires zero leading `/` or `*` characters before `as any` — comment lines (which start with `//`) and JSDoc continuation lines (which start with ` * `) are excluded. Executable code lines (which start with whitespace + identifier or whitespace + `const`/`let`/`return`/etc.) are matched.
- Edge case: a line like `  /* this contains "as any" */` would match the pattern (because the leading 2 spaces contain no `/` or `*`, then the `/*` comes after — but the `[^/*]*` is greedy so it consumes the spaces THEN sees `/`, fails, backtracks). This pattern is sound for typical code lines but has the documented edge case for inline block-comments mid-line; the R06 pre-pass code does not use such patterns, so the AC is sound.
- For a tighter pattern, the Implementer may use `grep -nE "^[[:space:]]*[a-zA-Z_].*as any" tools/curate-baseline-pre-pass.ts` (requires the line to start with whitespace+identifier-start char before `as any`). Either pattern produces 0 matches against the spec pseudocode (which uses no `as any`).

### Empirically-verified test-count discipline (R03 MINOR-4 reinforcement; 3rd application)

- AC-20 baseline counts (57 total at HEAD `8d724de`; per-file: q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, q03=13, q04=11, q05=13, smoke=5) cited from R05 close (MEMORIAL line 508 Implementer attestation + R05 Reviewer-verified line 526 entry). Provided as INFORMATIONAL prose; AC-20 directs Implementer to report OBSERVED output at R06 close (not pre-stated).
- AC-19 pre-states q06 = 13 because the spec ITSELF declares 13 in-file ACs against q06 (AC-1 through AC-13); structurally pre-determined by the spec.
- AC-14 pre-states q01-vendoring-coverage = 3 (3 in-file tests: header-format + SHA + manifest-row). Pre-existing count from R01; AC-14 verifies no regression.
- AC-15 pre-states q01-no-at-pin-deltas = 1 (1 in-file test). Pre-existing count from R01; AC-15 verifies no regression.

### File-creation track-state discipline (R02 OBS-2 reinforcement; 4th application; applied inversely)

`git ls-files` evidence at HEAD `a75ebc4`:
- `tools/curate-baseline-pre-pass.ts` → empty (does not exist; GREEN creates it).
- `tools/curate-baseline-pipeline.ts` → empty.
- `tools/calibrators/_shared.ts` → empty.
- `tools/calibrators/family-c.ts` → empty.
- `tools/calibrators/` directory → does not exist (verified by `git ls-files tools/calibrators/` → empty output).
- `test/q06-baseline-pre-pass.test.ts` → empty.
- `tools/vendor-from-deploysignal.sh` → exists (`git ls-files tools/` → only this entry).

The vendoring script's `mkdir -p "$(dirname "$target_abs")"` (line 73) auto-creates `tools/calibrators/` on first vendor-into-it run.

### Compilation-dependency enumeration discipline (R01-derived; 4th application)

R06's compilation-dependency surface enumerated explicitly:
- **`tools/curate-baseline-pipeline.ts`** (vendored at R06): imports `BaselineBundle`, `BaselineCurationDecision`, `BaselineCurationDecisionId`, `CompiledConfig` from `../engine/types/config.js`. All four declarations vendored at HEAD `a75ebc4` (config.ts is `vendored-with-deltas` with R01 Delta 1/2 + R02 Delta 5/6/7 + R05 Delta 1 + R06 Delta 1).
- **`tools/calibrators/_shared.ts`** (vendored at R06): ZERO engine imports; pure numerical primitives.
- **`tools/calibrators/family-c.ts`** (vendored at R06): imports from `../../engine/types` (already vendored — engine/types/index.ts row 36), `./_shared.js` (co-vendored at R06), `../../engine/detectors/sequential-mmd.js` (already vendored — manifest row 17), `../../engine/detectors/family-c-rff.js` (already vendored — manifest row 13).
- **`tools/curate-baseline-pre-pass.ts`** (Tessera-native at R06): imports from `../engine/types/config` (already vendored + R06 Delta 1), `./calibrators/family-c` (vendored at R06), `./calibrators/_shared` (vendored at R06). Total: 6 application identifiers across 3 modules.
- **`test/q06-baseline-pre-pass.test.ts`** (created at R06): imports from `../engine/types/config` (BaselineBundle + BaselineCurationDecision types), `../tools/curate-baseline-pre-pass` (function + 2 types), `node:test` + `node:assert/strict`. Total: 5 application identifiers + 2 stdlib.

Zero new dependencies on inherited vendored detector internals beyond the already-vendored sequential-mmd + family-c-rff (both consumed by the vendored family-c.ts only, not by the Tessera-native pre-pass).

Zero new npm dependencies (R06-SAS-2 binding).

### PRD-conjunction-cross-check-symmetric application result

Skill 14 demonstrated load-bearingly at brainstorm phase: Approach C's "inline Mahalanobis (non-robust)" REJECTED at brainstorm time because it violates the inherited-estimators-vendoring discipline AND substantively weakens the screening guarantee (sample-based covariance has 0 breakdown point vs MCD's 0.5 breakdown point). Verbatim PRD reading: AC-P1 + AC-P2 require Ville-bounded statistical guarantees; non-robust screening would silently inflate per-shard FPR by failing to detect contamination, which would inflate the residual machinery's false-flag rate downstream. Documented at Approach C rejection.

---

## Decision rationale

### D-R06-1 — Window granularity = run-level (one window per run)

**Picked:** Single window per BaselineBundle.run.

**Why-picked:** Smallest viable scope. The memo's "per-(shard, time-window) contamination mask" supports a single-window-per-shard interpretation at R06; multi-window-per-run time-windowing is a separate compile-time + behavior concern that orthogonally extends to R07+ when `time_window_index` semantics land. R06 ships the substrate; R07 extends.

**Why-rejected (multi-window-per-run):** Requires defining a window-size parameter, window-stride policy, window-boundary alignment with `hour_of_day`, etc. Each is a design decision; none are in the operator-set R06 scope; deferring all of them to R07 keeps R06 right-sized.

### D-R06-2 — Shard identifier = `run.tenant_id` (when present) or run-index

**Picked:** Use the inherited optional `BaselineBundle.runs[].tenant_id` as the shard identifier surrogate. Falls back to the run-array index when `tenant_id === undefined`.

**Why-picked:** No schema delta needed; reuses inherited surface. Per memo § 2 the "per-shard" granularity at Stage 2a maps to per-shard-window screening, and `tenant_id` is the closest existing identifier surface in BaselineBundle.

**Why-rejected (add explicit `shard_id` field to BaselineBundle):** Compile-time schema delta; R02-class scope at a single round. Deferred to R07+ when fleet-correlated FCP-1 binds the explicit shard semantics.

### D-R06-3 — Sample-matrix construction = sorted-signal-keys + min-length-truncation

**Picked:** Signal columns ordered by `Object.keys(signal_series).sort()` (lexicographic); row count = `min(signal_series[sig].length)` across signals in the run.

**Why-picked:** Deterministic column ordering enables fastMCD's mulberry32 PRNG to produce identical results given identical inputs (D-R06-4 binding); min-length truncation handles inherited-BaselineBundle's optionality on per-signal series lengths gracefully without throwing.

**Why-rejected (preserve insertion order):** `Object.keys` order is not guaranteed across all engines; sorted order is reproducible. Documented inline.

### D-R06-4 — MCD parameters = inherited defaults

**Picked:** `FASTMCD_DEFAULT_ALPHA` (0.75) + `FASTMCD_DEFAULT_SEED` (0xFA5DA), both from vendored family-c.ts.

**Why-picked:** Honors Q-JC1 INTENT (vendor at-pin; inherit defaults verbatim). Operator-tunable via `PrePassOpts.mcdAlpha` + `mcdSeed` (AC-12 binds override propagation).

**Why-rejected (Tessera-specific defaults):** Memorial F sub-rule 4 inherited-property-preservation. No empirical justification at R06 to deviate from inherited defaults.

### D-R06-5 — Curated bundle output = drop contaminated ticks from signal_series + hour_of_day + day_of_week

**Picked:** Filter all 3 per-tick arrays at non-contaminated indices.

**Why-picked:** Simplest possible semantic; Stage 3a format-compatible (the curated bundle IS a BaselineBundle with the same field set). Calibrate.ts (when wired at R08+) will consume the curated bundle exactly the same way as a clean bundle.

**Why-rejected (zero-out contaminated ticks):** Calibrate.ts would treat zeros as valid samples, polluting the calibration even after screening. Dropping ticks is the correct semantic.

**Why-rejected (parallel mask field):** Adding a `_contamination_mask: boolean[]` field to BaselineBundle is a compile-time schema delta. Deferred; not needed at R06 since the curated bundle is a clean handoff downstream.

### D-R06-6 — D11 output_summary fields = flat per-run aggregates

**Picked:** `n_runs_total`, `n_runs_screened`, `n_runs_skipped_insufficient_samples`, `n_runs_skipped_mcd_failed`, `n_ticks_total`, `n_ticks_contaminated`, `contamination_rate`, `mcd_method: 'mcd'`, `mcd_alpha`.

**Why-picked:** Operator-triage-friendly; each counter has distinct operational meaning; per BaselineCurationDecision.output_summary interface (Record<string, number | string | boolean>) — only string + number values are used.

**Why-rejected (per-run array of summaries):** Would violate the `Record<string, number | string | boolean>` value-type constraint of the inherited interface. R07+ may extend the interface to allow nested records; not in R06 scope.

### D-R06-7 — Skip-and-emit on MCD failure or insufficient samples

**Picked:** When `n < p+1` OR `fastMCD === null`, pass the run through unchanged and increment the relevant skip counter; do NOT throw.

**Why-picked:** Non-blocking failure mode preserves the substrate's ingestion path (some runs may genuinely have insufficient data; the pipeline shouldn't fail wholesale). Triage data exposed via the split skip counters (D-R06-6).

**Why-rejected (throw on insufficient samples):** Would prevent any bundle with a sparse run from being curated, blocking the Stage 3a handoff.

### D-R06-8 — Stage 3a calibration handoff = structural format compatibility

**Picked:** Verify via AC-7 that the curated bundle's field set matches the BaselineBundle interface; do NOT wire pre-pass into calibrate.ts main() at R06.

**Why-picked:** Q-JC1 brainstorm-re-evaluation (calibrate.ts deferred); compile-time format compatibility is the strongest available verification at R06 without vendoring calibrate.ts.

**Why-rejected (wired integration via stub-calibrate.ts):** Stubbing calibrate.ts is silent narrowing of Q-JC1; the structural-typing approach surfaces the deferral cleanly via OQ-1.

### D-R06-9 — BaselineCurationDecisionId extension = D11 + D12 + D13 (additive)

**Picked:** Extend the union to include all three at R06; reserve D12 + D13 for R07.

**Why-picked:** Single schema delta at R06 minimizes future churn; R07 spec consumes the reservations without re-editing config.ts; the additive-extension pattern (R02 reinforcement) supports this.

**Why-rejected (D11 only):** R07 architect would re-edit config.ts to add D12 + D13; doubled schema delta. The single-additive-extension at R06 is preferable.

### D-R06-10 — Vendoring infrastructure extension = sandbox + q01 list extension

**Picked:** Extend `vendor-from-deploysignal.sh` sandbox to allow `tools/*` targets; extend `q01-vendoring-coverage.test.ts` + `q01-no-at-pin-deltas.test.ts` path lists.

**Why-picked:** Smallest possible script change (single case-clause edit); the q01 test extensions are list-additions only (no logic change). Avoids bypassing the script (which would break the byte-identity discipline).

**Why-rejected (bypass script for tools/ vendoring):** Manual vendoring loses header-format guarantee, SHA-stamping consistency, and manifest auto-append; would force a future cleanup. The script extension is the right place to land the discipline.

---

## Architect pre-prediction record

For R07 (post-R06 close-walk) architect-side handoff:

**Pre-prediction 1 (HIGH confidence):** R07 ships Stage 2b FCP-1 by extending `tools/curate-baseline-pre-pass.ts` with a `applyFleetCorrelatedScreening(prePassResults: PrePassResult[], opts)` function (or a sibling `tools/curate-baseline-fleet-correlated.ts` file). The per-run mask data from R06 (currently aggregated into D11 counters) needs a richer structural surface for R07's e-process — likely a `PrePassResult.perRunMasks?: boolean[][]` field reservation at R06 OR a R07-introduced field. R06 architect's call to defer the field at R06 (keeps R06 right-sized; R07 adds when needed).

**Pre-prediction 2 (MEDIUM confidence):** R07 introduces `PrePassResultWithFleetScreening` extending `PrePassResult` with the FCP-1 e-process output + the D12 audit record. The current `decisions: Partial<Record<...>>` field on PrePassResult accommodates D12 additively (just populates a new key).

**Pre-prediction 3 (HIGH confidence):** R08+ vendoring of `tools/calibrate.ts` is feasible at a full-tier round when the dep-closure scope is the architect's explicit focus (no other Stage work in the round). Estimated: 1 round full tier; substantial test substrate for the wired-handoff AC.

**Pre-prediction 4 (HIGH confidence):** Operator at next gate (post-R06 close-walk) likely confirms R06 narrowing of Q-JC1 (per OQ-1 surfacing) or directs a R07 rescope to include calibrate.ts vendoring before FCP-1. Either resolution is mechanical; R06 substrate is sound for both paths.

---

## Memorial sweep

R06 architect verified all standing-reinforcement entries in `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" sections + Tessera-specific `coordination/MEMORIAL.md` REINFORCED entries:

- Cross-section consistency pass — 6th consecutive Tessera application (R02 → R03 → R04 → R05 → R06 — 16 checks at R06; R05 had 15, R04 had 12, R03 had 13, R02 had 9; pattern is now established standing discipline).
- Type-declaration-site discipline — 5th consecutive Tessera application; all 10 named external types/functions/constants opened at declaration sites during spec authoring (line numbers cited in audit sidecar § Pre-route discipline application).
- Re-export-chain-check discipline — 3rd Tessera application; verified all 6 cross-module imports in pre-pass.ts + 4 imports in q06 test file as direct exports (no re-export indirection).
- Grep-pattern-soundness discipline — 3rd Tessera application; AC-22 pattern documented with executable-vs-comment edge cases.
- Empirically-verified-test-count discipline — 3rd Tessera application; AC-20 baseline INFORMATIONAL only; structurally-pre-determined counts at AC-14 + AC-15 + AC-19.
- File-creation track-state discipline — 4th Tessera application; `git ls-files` evidence at HEAD `a75ebc4` for all 4 new file paths.
- Compilation-dependency enumeration — 4th Tessera application; documented in § Pre-route discipline application.
- Narrative-vs-pseudocode AC-count cross-check (R05 violation) — applied at R06: Component inventory states q06 binds 13 ACs; per-file pseudocode shows 13 named tests; AC-19 binds count===13; P3 axis 5 Coverage row enumerates the 13 ACs. All four sites agree.
- Brainstorm-re-evaluation when re-selecting (R12 reinforcement) — applied at R06 for Q-JC1 narrowing; dedicated audit sidecar section above.
- Backward-compat file check in §2 inventory (R12 reinforcement) — applied at R06: q01 list-extension files declared in Component inventory as CHANGED (test/q01-vendoring-coverage.test.ts + test/q01-no-at-pin-deltas.test.ts).
- Self-confirming test pattern (R09 + R15 reinforcements) — applied at R06: every q06 test CALLS the production `curateBaselinePrePass` function; no inline re-implementation of MCD or Mahalanobis in test bodies. Fixtures use externally-derived literal values + literal-value assertions on the production-computed output.

R06 architect-side pre-emit grilling caught zero spec-internal contradictions during the cross-section consistency pass + the per-claim verifiability sweep + the standing-reinforcement audit. The grilling output is documented inline in spec § Grilling output.

---

_Audit sidecar v0.1 emitted: 2026-05-16 by R06 Architect. Spec at `coordination/specs/Q-R06-SPEC.md`. Implementer routing to follow per NEXT-ROLE.md update._
