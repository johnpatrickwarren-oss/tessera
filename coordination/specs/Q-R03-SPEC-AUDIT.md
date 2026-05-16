# Q-R03-SPEC AUDIT SIDECAR (v0.1)

_Sidecar to `Q-R03-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, and Q-R03 → Q-R04 sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_Reviewer reads BOTH this file and `Q-R03-SPEC.md`. Implementer reads ONLY `Q-R03-SPEC.md` (plus source files)._

---

## Brainstorm (Superpowers Brainstorm phase output)

Five distinct approaches were generated and evaluated before R03 spec authoring began. Each evaluated against strengths / weaknesses / hidden assumptions / risks; selection rationale documented at the end.

### Approach A — Full SLICE 2b per R02 audit-sidecar projection

**Scope:** Warm-start runtime mechanism + Compiled-artifact JSON loader at synthetic N=100 shard fleet + PR-F5 empirical storage profile measurement at N=1000 fleet + R02 MINOR-1/3/4/5 dispositions + R02 OQ-1/OQ-2 closures. Five deliverables plus five carry-forwards plus two open-question closures.

**Strengths:** Closes Phase 1 SLICE 2 atomically. Delivers AC-P2 user-facing capability (alerts at n≥20 + strict at n≥60) and validates the SCOPING-MEMO § 2.2 storage architect-pre-prediction empirically in one round. Maximally satisfying for operator-level "Phase 1 SLICE 2 done."

**Weaknesses:** Five deliverables in one round is the exact same R01 context-load pattern that crashed the R01 IMPLEMENTER session. Mixing pure-function runtime (state machine) + statistical-residual runtime (Welford or similar) + JSON serialization + empirical-measurement scripting in one round violates the architectural-layer boundary that R02 successfully exploited. Each layer has its own architectural decisions (residual-computation algorithm choice; JSON schema versioning; measurement methodology); bundling them dilutes architect-grilling effectiveness per layer.

**Hidden assumptions:** That the per-role CLAUDE.md split (commit `c8f8ba7`) plus the R02-successful right-sizing precedent are sufficient mitigation for the 5-deliverable context load. That residual-computation algorithm choice (Welford vs. naive mean+covariance) has enough architectural pre-clarity not to need its own brainstorm.

**Risks:** Session crash recurrence; multi-layer scope-creep; another R01-style "Implementer absorbs scope creep silently"; the residual-computation algorithm choice is non-trivially architectural (Welford for numerical stability vs. naive for simplicity; per-shard vs. shared accumulator) — bundling this with state-machine work conflates two distinct design decisions.

### Approach B — SLICE 2b1 (state machine only) + R02 MINOR-1/3/4/5 + R02 MINOR-2 (inverse-convention runtime assertion)

**Scope:** Warm-start confidence-tier state machine as pure function + test substrate factory + R02 MINOR-1/3/4/5 closures + R02 MINOR-2 closure via runtime-invariant assertion at `observeSample` boundary.

**Strengths:** Same core scope as Approach E (next) but extends to MINOR-2 closure. Discipline-clean against R02 carry-forwards.

**Weaknesses:** The runtime-invariant assertion (option (b) per R02 MINOR-2 disposition) becomes load-bearing only when statistical-residual computation lands at R04 — adding it at R03 is premature because the assertion would have nothing meaningful to validate against (SLICE 2b1 doesn't compute statistical fields; the inverse convention "warm_start → mean_delta present" can't be evaluated without a populated mean_delta path). The assertion would either be trivially satisfied (no-op until R04) or would force R03 to also implement statistical-residual computation (Approach A creep).

**Hidden assumptions:** That the inverse-convention assertion is meaningful at SLICE 2b1.

**Risks:** Forces premature design decision on assertion semantics (where does it live? `observeSample` boundary or a separate `assertResidualConvention` helper?). The R04 architect should pick when the convention becomes load-bearing.

### Approach C — Pure R02 fix-cycle (MINOR-1/3/4/5; defer all warm-start runtime)

**Scope:** Address all R02 MINOR-1/3/4/5 + OQ-1 vendoring-script hardening + OQ-2 test-iteration broadening; no SLICE 2b runtime work; defer warm-start runtime to R04.

**Strengths:** Smallest scope. Discipline-clean: prior round MINORs closed before new behavioral work. Validates the per-role CLAUDE.md split on simple work before adding runtime complexity.

**Weaknesses:** R02 was MERGE-READY at MINOR-count-5; no blocking debt. Pure fix-cycle work is ceremonial at this point — the R02 carry-forward MINORs are best closed opportunistically alongside the work that touches the same test files, which is precisely what Approach E does. Approach C produces no architectural progress.

**Hidden assumptions:** That R02 MINORs require ceremonial closure rounds. (They don't — bundling opportunistically is the discipline-correct path per R02 § Mechanism carry-forward bundling precedent.)

**Risks:** Pipeline overhead for ceremonial work; demoralizing pattern of "do the closures in their own round" when bundling is feasible.

### Approach D — SLICE 2b: compiled-artifact JSON loader only (no warm-start runtime)

**Scope:** Implement Tessera-side compiled-config JSON loader; verify serialization round-trip; populate a synthetic N=100 fixture JSON; bundle R02 MINOR-3 (`as any` strip via factory) opportunistically. Defer warm-start runtime + statistical-residual + PR-F5 to subsequent rounds.

**Strengths:** Lands the load-bearing P3 axis 5 compiled-artifact verification piece. Decouples loader from runtime architecturally.

**Weaknesses:** The loader without consumers is ceremonial — the loader-exit point is "config-loaded successfully" but no runtime reads from the config at this stage. AC-P2 user capability not delivered (no state machine = no alerting transitions). The loader's tests are essentially "round-trip JSON" which is a thin binding for an architect-grilling round. Tessera has no JSON schema validator vendored; the loader's correctness check is type-shape only, not value-range or schema-version validation.

**Hidden assumptions:** That the loader's value is meaningful without consumers. That JSON-round-trip is sufficient binding (or that a heavier schema validator should be vendored — which would be R02-SAS-4-class scope creep).

**Risks:** Round produces a piece of plumbing that doesn't tie to a user-facing AC; future rounds can't easily TDD against it without the consumers also landing.

### Approach E — SLICE 2b1: warm-start confidence-tier state machine as pure function + test substrate factory + R02 MINOR-1/3/4/5 opportunistic close

**Scope:** Create `engine/per-shard/warm-start.ts` (pure-function state machine: tier transitions + seed-mismatch reset + initializer); create `test/_substrate/factories.ts` (typed builders closing R02 MINOR-3); create `test/q03-warm-start-runtime.test.ts` (eleven state-machine ACs); update `test/q02-schema-extension.test.ts` to use factory + add MINOR-1 sibling + tighten cardinality MINOR-5; update `test/q01-schema-additions.test.ts` to use factory + revert MINOR-4 widening. Defer statistical-residual computation (Welford or similar) to R04 (SLICE 2b2); defer compiled-artifact loader to R05 (SLICE 2b3); defer PR-F5 measurement to R05+.

**Strengths:** Mirrors R02's successful right-sized + co-located-MINOR-close pattern. The compile-time / state-machine-runtime / statistical-runtime / loader split is a clean architectural-layer ladder; the cross-layer split mirrors the inherited DeploySignal Q66 `.γ → .γ.b → .γ.c` iterative-refinement precedent (cited in SCOPING-MEMO § 2.2). The state machine is the highest-information-content portion of SLICE 2b (PRD AC-P2 thresholds become concrete code; the pure function makes TDD trivial). Substrate factory is foundational for R04 + R05 and closes R02 MINOR-3 immediately. Five surfaces of change (down from Approach A's ~12), well under the R01 context-load threshold. TDD-verifiable via two-commit RED→GREEN. Three out of four R02 carry-forward MINORs (1/3/4/5) bundle naturally with the test files the substrate factory work already touches.

**Weaknesses:** Doesn't deliver compiled-artifact JSON loader (R05 work); doesn't deliver PR-F5 storage measurement (R05+ work); doesn't deliver statistical-residual computation (R04 work). Splits SCOPING-MEMO SLICE 2 into 2a + 2b1 + 2b2 + 2b3 (four sub-slices instead of two; operator cognitive overhead grows). PRD AC-P2 user-capability ("alerts within 20 samples") is delivered at the tier-transition layer but not at the alert-emission layer (orchestrator is anti-scope per R02-SAS-5).

**Hidden assumptions:** That R03 has appetite for the third sub-slice split (SLICE 2b1 vs. eventual 2b2/2b3). That residual-computation algorithm choice (Welford vs. naive) is genuinely worth its own architect round at R04 (not over-fragmentation). That the state-machine-only design's "preserve statistical fields verbatim" semantics is the right SLICE-2b1-vs-2b2 handoff.

**Risks:** Operator may want the warm-start runtime + statistical-residual landing in one round (the R03 audit sidecar's R02→R03 sequencing note implied a fuller scope). Mitigated by: R03 spec explicit anti-scope listing the deferral + § Open questions OQ-2 documents the R04 architect's design space.

### Selection — Approach E

**Rationale for selection:** Defense-in-depth from R02 wins again. The R02 brainstorm's selection rationale for Approach B (SLICE 2a) explicitly anticipated R03 = SLICE 2b; the R03 question is how tightly to scope SLICE 2b. Three signals point to "tightest viable":
1. R01's failure mode (session crash) is the dominant risk signal, and R02's successful narrowing proves the right-sizing discipline works.
2. The architectural-layer split (compile-time → state-machine → statistical-residual → loader) is natural and matches inherited DeploySignal Q66 iterative-refinement precedent — splitting along this axis produces clean cross-round handoffs.
3. The R02 carry-forward MINORs (1/3/4/5) co-locate naturally with the test files the substrate factory touches; bundling is opportunistic, not forced.

Approach E delivers the highest-information-content portion of SLICE 2b (the state-machine code makes PRD AC-P2 thresholds concrete + binds eleven test cases) while leaving algorithmic choices (Welford vs. naive at R04; JSON loader design at R05) to dedicated future rounds with their own architect-grilling discipline. The substrate factory is unambiguously load-bearing (closes a known R02 MINOR; will be reused R04 + R05+); bundling it now amortizes the work.

**Rejection rationales:**
- A rejected: 5-deliverable scope = R01-class failure mode risk + multi-layer architect-grilling dilution. Algorithmic choices (residual-computation) are non-trivial and need their own round.
- B rejected: R02 MINOR-2 inverse-convention assertion is premature at SLICE 2b1 (no statistical fields populated by R03's state machine). The assertion would either be no-op or force Approach A creep.
- C rejected: R02 was MERGE-READY; ceremonial fix-cycle is wasted pipeline overhead. MINOR closures bundle better opportunistically.
- D rejected: loader-without-consumers is plumbing with thin binding; not a satisfying architect round; future rounds can't easily TDD against it.

**Tier rubric verdict:** **full** tier. Factors fired:
- **A2** (new architectural pattern with no precedent in the codebase) — pure-function state-machine in `engine/per-shard/` is the first Tessera-original engine code; previously all engine code was vendored from DeploySignal. The Tessera-side originals pattern is novel.
- **A4** (novel data model) — the SampleObservation interface + the test substrate factory module are new data-model surfaces; the state machine's `(input residual + observation) → output residual` contract is a new architectural primitive.
- **A7** (first-time territory) — Tessera Phase 1 SLICE 2b has no precedent; SLICE 2a (R02) was the first runtime-adjacent round (still schema-only).

A2 + A4 + A7 firing is identical to R02's tier verdict; the analogous "first novel runtime piece" justification holds at R03.

**Q-cycle estimate:** ~3-4 hours of focused Implementer work. ~30 min creating warm-start.ts (pure function + JSDoc + constants); ~30 min creating factories.ts; ~45 min creating q03-warm-start-runtime.test.ts (11 tests); ~30 min updating q02 (3 sub-deltas: factory call + @ts-expect-error sibling + Record<typedef, true> exhaustiveness); ~20 min updating q01 (2 sub-deltas: factory call + Pick<…> revert); ~30 min coordination artifacts + binding-command attestation. Comfortably under R01's 2-day budget; on par with R02's ~3 hour actual.

---

## Q-R03 → Q-R04 sequencing context

R04 (SLICE 2b2) scope inferred from R03's narrowing:

- **Statistical-residual computation runtime.** Layered on top of R03's `observeSample` pure function. Adds: Welford's (or comparable) online algorithm for `mean_vector` + `covariance` computation at confidence='strict'; `mean_delta` computation at confidence='warm_start' (delta from `BaselineCellEntry`-supplied fleet-aggregate mean); accumulator semantics for the n<20 'none' tier where mean computation cannot yet emit but samples must accumulate. The accumulator-at-'none' question is a real R04 design decision: (a) extend schema with `_accumulator?` field (breaking change to R02 schema); (b) use mean_delta as transitional running-sum at 'none' (violates R02 documented convention); (c) maintain accumulator in caller state (spreads state to orchestrator). R04 architect picks.

- **R02 MINOR-2 inverse-convention enforcement.** Becomes load-bearing at R04 because statistical fields are populated. Two options (discriminated-union refactor; runtime-invariant assertion) — R04 architect picks. Trade-off: type-level strength vs. schema-stability.

- **Sample-data flow channel.** R03's `SampleObservation` carries metadata only; R04 likely introduces a richer observation packet (e.g., `{ observedAt, residualSeedHash, sampleVector: number[] }`). The naming convention (camelCase) is established at R03; R04 extends.

R05+ (SLICE 2b3 / Phase 1 SLICE 3 pivot) scope:

- **Compiled-artifact JSON loader.** Reads a synthetic-cluster Tessera-side compiled-config JSON; verifies serialization round-trip; minimal schema-version handling. May vendor a JSON schema validator if architect grills it through (currently anti-scope to keep the dependency tree clean).
- **PR-F5 empirical storage profile.** Measures populated `per_shard_cells` footprint vs single-instance baseline at N=1000 synthetic shards. Validates SCOPING-MEMO § 2.2 architect-pre-prediction ~1.2-1.5× single-instance.
- **P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet.** Pulls together loader + state machine + statistical-residual end-to-end.
- **OQ-1 (vendoring script hardening)** if SLICE 2b3 surface justifies (more vendored files arrive). Else its own standalone tooling round.
- **OQ-2 (q01-vendoring-coverage broaden to test/*)** as part of any round that adds vendored test files (currently the SLICE 2b3 round most likely).

R03 will NOT be a separate fix-cycle: the R02 MINOR-1/3/4/5 carry-forwards bundled at R03 close out four of five R02 MINORs; the remaining MINOR-2 is architecturally-load-bearing-only-at-R04 (correctly deferred).

The R01 MINOR-3/4/5/6/8/9 unbundled fence (R02-SAS-9 carry-forward) is also preserved: these were unbundled at R02 to keep scope tight and remain unbundled at R03 for the same reason. Each can be picked up at the next round that touches its parent surface (e.g., MINOR-3 HEADER_LINE_COUNT robustness when q01-no-at-pin-deltas.test.ts is next touched; MINOR-4/5/6 vendoring-script hardening when the script is next touched).

---

## Pre-route discipline application

### Skill 14 — PRD-conjunction-cross-check (symmetric)

PRD AC-P2 conjuncts: (i) "warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold)" + (ii) "strict-upgrade at 60 samples preserves inherited single-instance behavior."

R03 narrows AC-P2 delivery to the CONFIDENCE-TRANSITION-MECHANISM layer (the state machine produces `'warm_start'` at n≥20 and `'strict'` at n≥60). The PRD conjunct "enables ALERTS within 20 per-shard samples" requires alert-emission machinery that is orchestrator scope (R02-SAS-5 carry-forward = R03-SAS-2). The narrowing is explicit in three independent locations: § Spec preamble final paragraph; § Anti-scope R03-SAS-2; § Open questions OQ-1 indirectly. **Symmetric application:** R03 does NOT widen any PRD conjunct; the literal numeric thresholds 20 and 60 are preserved verbatim in `WARM_START_THRESHOLD` and `STRICT_UPGRADE_THRESHOLD` constants and bound by AC-3 + AC-4. PR-F4 pair-review derivation is acknowledged in the threshold JSDoc but is not load-bearing at R03 (the literals are taken as given from PRD).

PASS — no silent narrowing or widening.

### Skill 15 — Prescription-to-AC-coverage

Every § Mechanism Delta binds to one or more AC; every 'Created' entry in § Component inventory has an AC binding. Per the R57 + R61 prescription-to-AC reinforcement:

- Delta 1 (`engine/per-shard/warm-start.ts`) → AC-1 (initializer), AC-2 (observeSample first-call), AC-3 + AC-4 (threshold constants), AC-5 + AC-6 (warm_start transition + sub-threshold), AC-7 (strict transition), AC-8 (terminal preservation), AC-9 (seed-reset), AC-10 (first-seed), AC-11 (statistical preservation). Eleven ACs bind eleven semantic surfaces of the state machine.
- Delta 2 (`test/_substrate/factories.ts`) → indirectly via AC-13 (tsc clean) and via consumption in q01/q02/q03 tests. Direct binding via AC-17 (no `as any` casts remain — only possible via factory adoption).
- Delta 3 (`test/q03-warm-start-runtime.test.ts`) → AC-15 (test file passes 11/0).
- Delta 4 (`test/q02-schema-extension.test.ts` updates) → AC-14 (q02 passes 6/0; was 5 at R02), AC-17 (no `as any` in q02), AC-19 (Record<typedef, true> exists), AC-20 (`@ts-expect-error` exists).
- Delta 5 (`test/q01-schema-additions.test.ts` updates) → AC-14 (q01 passes 5/0), AC-17 (no `as any` in q01), AC-18 (no `as CompiledConfig` in q01).

Every R02 MINOR/OBS disposition cited in § Mechanism traces to a specific AC:
- MINOR-1 → AC-20 (grep for `@ts-expect-error`)
- MINOR-3 → AC-17 (grep for `as any`)
- MINOR-4 → AC-18 (grep for `as CompiledConfig`)
- MINOR-5 → AC-19 (grep for `Record<CellDimension, true>` + `Record<CellConfidence, true>`)
- MINOR-2 → DEFERRED to R04 per OQ-2; no R03 AC.
- OBS-1/2/3/4 → no R03 surface to repair; documented in § Mechanism carry-forward block.

Per the R59 + R64 anti-self-confirming-test reinforcement: each AC binding is checked for self-confirming risk. AC-5/6/7 (boundary tests) bind specific n_samples values + verify both n_samples increment AND confidence transition (two-axis assertion; not self-confirming). AC-9 (seed-reset) binds new n_samples + new confidence + statistical-fields-cleared (three-axis assertion). AC-10 (first-seed) is the contrapositive of AC-9 (no reset on undefined-prior-seed) — binding distinguishes the two code paths. The anti-self-confirming mutation test for AC-9: replace `seedChanged` body with `return current;` → AC-9 fails immediately on n_samples assertion. The state machine has no per-AC self-confirming risk because each test asserts shape changes, not the return type alone.

Per the R64 handler-code-path-unexercised reinforcement (body-content-gap sub-variant): the state machine's "body content" is the four output fields; AC-9 asserts the four fields plus three statistical-field clearings = seven assertions covering the reset body. AC-2/5/6/7/8/10/11 each cover specific other branches. The 200-empty-body-equivalent mutation here would be `return current;` (returns input verbatim) — AC-2 + AC-5 + AC-7 each fail on n_samples assertion. Body-content gap closed.

PASS — every prescription binds; no self-confirming or empty-body gap.

### Memorial sweep

Inherited active memorials + R02 carry-forwards + cross-project reinforcements applied:

- **Memorial D** (architectural-layer-coverage at hypothesis-tree time): brainstorm enumerated 5 candidates; 3 rejected with explicit weakness rationale; 1 selected (E); 1 weighed against E and rejected (B for premature MINOR-2 closure). Documented above. **Memorial D state delta:** no new violation expected at R03 close; the brainstorm-discipline application is canonical.

- **Memorial F** (4 sub-rules at brief-drafting time): applies to compile-time substrate changes. R03 modifies `test/q01-schema-additions.test.ts` + `test/q02-schema-extension.test.ts` which exercise compile-time substrate. Sub-rules 1+2+3+4 consulted:
  - File-opened: every external type's declaration site opened at HEAD `aab9d37`. (Per P3.3.)
  - Inherited type-state cited: CellKey at primitives.ts:44 (the R02 OBS-3 missed-file); CellConfidence at config.ts:850-852; CellDimension at config.ts:845-848; BaselineCellEntry at config.ts:417-435; CompiledConfig at config.ts:83+. All cited at line-range precision.
  - Candidate-set enumeration: 5 approaches above.
  - No narrowing of stakeholder requirements: SCOPING-MEMO SLICE 2 → SLICE 2b1 narrowing is explicitly documented (§ Spec preamble + § Mechanism Spec narrowing rationale + § Anti-scope R03-SAS-1/3/4 + § Open questions OQ-1/OQ-2). PRD AC-P2 literal thresholds 20 + 60 preserved verbatim. No silent narrowing.

- **No-skip-policy on statistical-invariant tests**: R03 adds no statistical-invariant tests (no Ville / martingale / e-value bound assertions). The state machine's tests are deterministic property tests on integer counts + enum tier values + reference-clearing semantics. No relevant surface; policy preserved by absence-of-violation.

- **R01 ARCHITECT cross-section consistency reinforcement** (from `CLAUDE-ARCHITECT.md` REINFORCED 2026-05-16): executed in dedicated § Cross-section consistency pass section of the spec, 13 resolved-decision checks all PASS. Third application after R02's 9 checks. The cross-section pass is now established discipline at Tessera.

- **R02 ARCHITECT type-declaration-site reinforcement** (REINFORCED 2026-05-16 from R02 OBS-3): executed in P3.3 — every external type referenced in pseudocode has its DECLARATION SITE (not just use site) opened and verified. CellKey at primitives.ts:44 (the R02-missed file) is the highest-value verification target; it was opened explicitly. No CellKey-shape-class drift at R03. **First post-R02-reinforcement application;** survives the test.

- **R02 ARCHITECT file-deletion track-state reinforcement** (REINFORCED 2026-05-16 from R02 OBS-2): R03 has no deletions. The parallel discipline (verify directory non-existence before prescribing creation paths) was applied — `git ls-files engine/per-shard test/_substrate` → empty output at HEAD `aab9d37`, verified before spec emission. Documented in § Component inventory directory-creation note and § Cross-section consistency pass file-creation-track-state row.

### Compilation-dependency enumeration (R01 MAJOR-3 lesson — applied this round)

Per R01 MAJOR-3 the Architect must enumerate compilation dependencies before declaring anti-scope on a target file. R03 creates `engine/per-shard/warm-start.ts` + `test/_substrate/factories.ts`. Compilation dependencies enumerated:

- `engine/per-shard/warm-start.ts` imports: `PerShardResidual` from `../types/config` (exactly one external dependency; no transitive compile-time concerns introduced).
- `test/_substrate/factories.ts` imports: `CellKey`, `CellDimension`, `PerShardResidual`, `PerShardCell`, `BaselineCellEntry` from `../../engine/types/config` (five type-only imports; no runtime dependencies introduced).
- `test/q03-warm-start-runtime.test.ts` imports: `observeSample`, `initialPerShardResidual`, `WARM_START_THRESHOLD`, `STRICT_UPGRADE_THRESHOLD` from `../engine/per-shard/warm-start`; `makePerShardResidual` from `./_substrate/factories` (six identifiers across two modules; both Tessera-original; no engine internals consumed).

No new dependencies on inherited vendored detector code, vendored l0 / o0 modules, or any external package. No anti-scope-vs-compilation-deps tension at R03. PASS.

### MEMORIAL.md attestation discipline

Per the R49 + R61 reinforcement "MEMORIAL.md is not an attestation artifact — tactical deviations must be in NEXT-ROLE.md." R03 spec does not pre-write Implementer MEMORIAL entries; those are emitted at IMPLEMENTER coordination time. The post-R03 MEMORIAL accretion is the MEMORIAL-UPDATER's responsibility.

### TDD discipline (per R57/R59/R62 reinforcements)

R03 prescribes two-commit TDD ordering (§ Per-file pseudocode Implementer note 6 + AC-12). The commit boundary is explicit:
- Commit 1 (RED): tests + factories (factories alone compile cleanly; tests fail because `engine/per-shard/warm-start.ts` doesn't exist).
- Commit 2 (GREEN): warm-start.ts + q01/q02 test updates (all imports resolve; all assertions pass).

This matches the R62-derived "schema-before-RED" discipline applied to R03's analog (Tessera-original code = no schema; pure-source-code RED) — the RED state is genuine because the new module doesn't exist; the GREEN commit lands the module. The bundling concern (R55 + R59 + R62 test-modification-bundling 8-occurrence pattern) is anticipated: q01 and q02 test updates are bundled into the GREEN commit because the test updates are co-located with the production code that satisfies them; if the Implementer discovers a fixture error in q01/q02 mid-implementation, the test-fix should be a standalone Commit 1.5 between RED and GREEN (per the 8-occurrence reinforcement). This nuance is documented implicitly by the two-commit prescription — explicit guidance added in Implementer note 6.

### Anti-self-confirming-test (per R57/R59/R64 reinforcements)

Each AC's anti-self-confirming-mutation analysis is recorded in the Skill 15 prescription-to-AC-coverage section above. Summary: no AC is fully self-confirming; the strongest binding is AC-9 (3-axis assertion on reset state); the weakest binding is AC-3 + AC-4 (single literal-value assertion) which is acceptable for constant-value bindings (the value IS the AC; mutation = wrong value = test fails).

---

## Architect pre-predictions on outcomes

Each prediction is committed before the round runs so the post-round Memorial Updater can grade prediction accuracy.

1. **AC outcome:** All 20 ACs PASS at first IMPLEMENTER pass (no fix-cycle required). State machine is mechanical and bounded; pure-function form makes test assertions deterministic; `tsc` clean is the only meaningful risk and is verifiable in <1 min.

2. **Halt conditions:** zero — schema unchanged from R02; pseudocode is line-by-line; Implementer notes are mandatory with verification commands. The most likely surprise (Implementer note 3: `'none' | 'warm_start' | 'strict'` not assignable to CellConfidence) is architect-pre-predicted as "no risk" and Implementer is instructed to HALT-with-mechanical-fix if wrong (the fix would be to widen the local type annotation to CellConfidence directly).

3. **TDD ordering:** verifiable via two-commit sequence (RED commit = test files + factories; GREEN commit = warm-start.ts + q01/q02 updates). 2nd Reviewer-side TDD verification for Tessera (R02 was the 1st; R03 establishes the pattern as standing discipline).

4. **Implementer Q-cycle:** ~3 hours total (per Q-cycle estimate above). Comfortably under the 2-day budget; on par with R02's ~3 hour actual.

5. **Reviewer findings:** ≤2 MINOR + 0 MAJOR expected. The bundle of R02 MINOR closures may produce a few small REVIEWER findings around factory-design hygiene (e.g., "factory's overrides-merge semantics should be deepMerge not shallow" — defensible MINOR), or around the corner-case documentation in § P3.1 (e.g., "the cold-start-direct-to-strict case should have an AC binding regardless of architect-pre-prediction" — defensible MINOR). Substrate is sound; findings will be hygiene-class.

6. **Memorial state delta:** No new Memorial D violations expected. Two CONFIRMATIONs expected: (a) first post-R02-reinforcement application of the type-declaration-site discipline (P3.3); (b) cross-section-consistency-pass discipline holds at third application. One CONFIRMATION expected for Memorial F compile-time-substrate-change sub-rule application.

7. **Session-crash risk:** low. Per-role CLAUDE.md split active; spec is right-sized at 5 file surfaces; pseudocode is concrete; no orchestration or multi-file compile coordination. Defense-in-depth via narrow architectural-layer scope is the load-bearing mitigation. Same risk-class as R02 (which did not crash).

8. **Bundled MINOR closure success:** all four R02 MINORs (1/3/4/5) close at R03. AC-17/18/19/20 grep-evidence ACs make this Implementer-attestable and Reviewer-verifiable mechanically. The bundling pattern (R02 MINORs into R03 schema-adjacent work) demonstrates the discipline pays off across rounds; expect Memorial-Updater confirmation.

9. **R02 MINOR-2 deferral validation:** the OQ-2 architect-pre-prediction (R04 architect picks discriminated-union vs. runtime-invariant assertion) is correct. The R04 round's actual selection will validate or refute the architect-pre-prediction.

10. **Tessera-original-engine-code pattern adoption:** `engine/per-shard/` becomes the canonical directory for Tessera-original engine code (vs. `engine/detectors/`, `engine/types/` etc. which are vendored). The naming convention extends cleanly to future Phase 2 work (`engine/cluster-event/` for event-feed; `engine/topology/` for HardwareTopologySource). R03 establishes the precedent.

---

## Decision rationale (per resolved decision)

### D1 — State-machine vs. statistical-residual scope at R03

**Picked:** State machine only (count + tier transition + seed-reset + initializer). Statistical-residual computation deferred to R04.

**Why state-machine-only picked:** The state-machine layer is naturally architecturally separable: count + tier transition + seed-reset are deterministic functions of (input residual + observation metadata) with no statistical-algorithm-choice dependency. Statistical-residual computation introduces Welford-vs-naive design decision + accumulator-at-n<20 design decision (three options per R04 sequencing note) + sample-data-flow design decision — three architectural decisions that warrant their own round. Bundling would dilute architect-grilling per layer and increase session-crash risk.

**Why bundle-statistical-residual-too rejected:** Approach A above; weaknesses + risks dominate.

**Why state-machine-without-thresholds rejected:** The thresholds (20, 60) are PRD AC-P2 literals; they are core to the state-machine semantic and cannot meaningfully be deferred. Including them is mandatory.

### D2 — Reset-on-seed-mismatch semantics

**Picked:** When `current.residual_seed_hash !== undefined && current.residual_seed_hash !== obs.residualSeedHash`, reset to `{n_samples=1, confidence='none', residual_seed_hash=new, last_observed_at=new}`. Statistical fields (`mean_vector`, `covariance`, `mean_delta`) explicitly cleared. First-time seed assignment (`current.residual_seed_hash === undefined`) is NOT reset — increment path runs.

**Why this reset semantic picked:** Counts as the new sample (n=1, not n=0). The new seed defines a new baseline reference; previously-accumulated statistics are computed against the OLD baseline and are stale + unsalvageable. Clearing statistical fields prevents stale-state survival across baseline-refresh boundaries (R02 § Mechanism primitive 2 intent). The first-time-undefined-vs-defined distinction matters because cold-start residuals carry `residual_seed_hash === undefined` (no seed adopted yet); treating these as "seed-mismatch" would mean every first observation triggers a reset (wasteful no-op + obscures the increment path's behavior).

**Why "n=0 then increment to 1 via separate code path" rejected:** The two-step reset-then-increment would require returning `{n_samples: 0, ...}` and then calling `observeSample` again — that's two function calls for one observation. The single-step `n=1` reset is cleaner. (Architect-pre-prediction: no observable behavioral difference; reviewer may flag this as a hygiene preference.)

**Why "preserve statistical fields on reset" rejected:** Stale-state survival is the explicit failure mode R02 § Mechanism primitive 2 was designed to address. Preserving the fields would defeat the architectural intent.

### D3 — Tessera-original code location (`engine/per-shard/` vs. alternatives)

**Picked:** `engine/per-shard/warm-start.ts` under a new top-level `engine/per-shard/` directory.

**Why `engine/per-shard/` picked:** The directory is semantically "per-shard runtime" — the canonical home for SLICE 2b state-machine + R04 statistical-residual + R05 compiled-config-loader Tessera-side code. Mirrors the inherited `engine/detectors/` pattern (one subdirectory per architectural concern). Extracts cleanly to the npm package at Phase 2 close (the directory boundary is the extract-unit).

**Why `tessera/` top-level rejected:** Would split engine code by provenance (vendored vs. Tessera-original) at the top level rather than by architectural concern. Mixing concerns at the directory level is harder to navigate; tooling (`npm test`, tsc paths) treats both directories identically anyway.

**Why `engine/runtime/` rejected:** Too broad; "runtime" doesn't communicate the per-shard architectural specificity. SLICE 2b is fundamentally about per-shard residual; future per-shard rounds will share the directory cleanly.

**Why no barrel `engine/per-shard/index.ts` rejected:** YAGNI at SLICE 2b1 (only one file in the directory). Add at R04 if/when a second file lands. Importers consume `engine/per-shard/warm-start.ts` directly at R03.

### D4 — Substrate factory location + naming convention

**Picked:** `test/_substrate/factories.ts` with `make<TypeName>` naming convention.

**Why `test/_substrate/` picked:** Underscore-prefix marks the directory as a non-test helper (Tessera test discovery is `test/*.test.js` top-level; `_substrate/` is invisible to the test runner). Parallel to inherited `engine/_q72-trace.ts` underscore-internal pattern. Future R04 + R05 test substrate (statistical fixtures, JSON fixtures) lands cleanly in the same directory.

**Why `test/substrate/` rejected:** No underscore = unclear whether it's a test directory. Test runners that recurse via glob (`test/**/*.test.js`) might pick up files in `test/substrate/` and try to run them as tests; the underscore prevents this even if the test-discovery pattern changes.

**Why `test/helpers/` rejected:** "Helpers" is generic; "substrate" is specifically the inherited terminology (per SCOPING-MEMO substrate v5/v7/v8X/v9X references). Aligning vocabulary reduces operator cognitive overhead.

**Why `make<TypeName>` naming convention picked:** Standard TypeScript/JavaScript test factory convention. Distinct from `build*` (which often implies a fluent builder pattern with chained methods); distinct from `create*` (which often suggests side-effectful construction like DB-inserts). `make*` is the canonical pure-function-returns-instance pattern.

### D5 — R02 MINOR carry-forward bundling decisions

**Picked:** Bundle MINOR-1, MINOR-3, MINOR-4, MINOR-5. Defer MINOR-2.

**Why MINOR-1/3/4/5 bundled:** All four directly affect the test files (`q01-schema-additions.test.ts`, `q02-schema-extension.test.ts`) that R03's substrate-factory work necessarily touches (to replace `as any` casts → MINOR-3). The four MINORs map 1:1 to specific R03 ACs (MINOR-1 → AC-20; MINOR-3 → AC-17; MINOR-4 → AC-18; MINOR-5 → AC-19). Bundling adds zero scope creep (the file is already being touched) and closes the dispositions immediately. Discipline-clean.

**Why MINOR-2 deferred:** The sparse-encoding inverse convention enforcement (option (a) discriminated union vs. option (b) runtime assertion) is load-bearing only when statistical-residual computation lands (R04). At SLICE 2b1, the state machine doesn't compute statistical fields; the convention has nothing meaningful to validate against. Premature enforcement at R03 would either force the architect to also implement statistical-residual computation (Approach A creep, rejected) or would land a no-op assertion (anti-pattern). R04 architect picks when the convention becomes load-bearing.

**Why MINOR-2 bundling as runtime-invariant assertion at `observeSample` rejected:** See Approach B above; the assertion would be no-op at SLICE 2b1.

**Why MINOR-2 bundling as discriminated-union refactor rejected:** Breaking change to R02-shipped schema; would require R02-SAS-9 violation (R02 schema is settled). Should be a deliberate R04 architectural decision, not a R03 absorption.

### D6 — TDD commit ordering (RED before GREEN)

**Picked:** Two-commit sequence. Commit 1 (RED): test files + factories. Commit 2 (GREEN): warm-start.ts + q01/q02 test updates.

**Why two-commit-RED-GREEN picked:** Standard TDD discipline; matches R02 successful pattern; AC-12 binds the git-history evidence; Reviewer-verifiable via `git log --oneline` + `git show`. The R55+R59+R62 test-modification-bundling 8-occurrence reinforcement is addressed by the explicit "if you discover a fixture error mid-implementation, commit the fix as a standalone Commit 1.5" guidance (Implementer note 6).

**Why three-commit-with-q01/q02-as-separate-RED rejected:** The q01/q02 test updates are GREEN-only (no RED for those — the tests are already passing at HEAD `aab9d37`; the updates are co-located refactoring with the new module's introduction). Splitting them into a separate commit would create a non-functional intermediate state where q01/q02 reference the factory module but `engine/per-shard/warm-start.ts` doesn't yet exist — non-functional intermediates are anti-pattern.

**Why single-commit-everything rejected:** R01 MINOR-9 / TDD ordering is unverifiable from artifact alone. Two-commit RED-GREEN is the minimum to establish temporal evidence.

### D7 — Eleven AC count for state machine

**Picked:** Eleven ACs (AC-1 through AC-11) on the state-machine surface, plus nine on cross-cutting + grep-evidence + carry-forward closure surfaces (AC-12 through AC-20). Twenty total.

**Why eleven state-machine ACs picked:** Each AC binds one distinct semantic of the state machine: cold-start initializer (AC-1); first-call increment (AC-2); two threshold constants (AC-3, AC-4); two threshold boundary cases for warm_start (AC-5, AC-6); threshold boundary for strict (AC-7); terminal preservation (AC-8); seed-mismatch reset (AC-9); first-seed non-reset (AC-10); statistical-field preservation under stable seed (AC-11). The state machine has eleven distinguishable behaviors; binding each makes the test suite a complete characterization.

**Why fewer-AC-via-test-consolidation rejected:** Combining boundary cases (e.g., one test for both n=19→20 and n=59→60) reduces test count but makes failure attribution harder — if a future PR breaks the warm_start boundary but not the strict boundary, two combined tests would both fail (or worse, only the asserted-first boundary fails and the second never runs). One AC per behavior is the discipline-preferred form.

**Why more-AC-for-corner-cases rejected:** § P3.1 documents one corner case (n>=60 with confidence='none' upgrades directly to 'strict'). Binding it as an AC would expand to 12. Architect-judged unnecessary because the only realistic path to that state (seed-mismatch reset then 60 stable observations) is bound by composition of AC-9 + AC-7. The corner case stands as documented-behavior, not AC-bound.

---

## Amendments from prior version

v0.1 — initial R03 spec emit, 2026-05-16. No prior version.
