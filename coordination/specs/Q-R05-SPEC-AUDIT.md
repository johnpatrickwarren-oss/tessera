# Q-R05-SPEC-AUDIT — Architect ceremony sidecar

_Sidecar to `Q-R05-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked / why-rejected, pre-route discipline application, architect pre-predictions, and Q-R05 → Q-R06 sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_HEAD at audit-sidecar emit: `aee274c` (operator-led baseline-curation scoping memo; R04-relevant code-tree state at `9e8304a` per REVIEWER-REPORT-R04.md HEAD)._

---

## Brainstorm

5 distinct R05 approaches enumerated and weighed.

### Approach A — Full SLICE 2b3 in one round (all 5 R04-deferred items)

**Strengths:** Closes the entire SLICE 2b3 envelope at once; satisfies the operator-level "complete a major boundary" reflex; produces a single spec the Reviewer audits end-to-end.

**Weaknesses:** Five architectural decisions in one round (accumulator-strategy + module-path + sparse-encoding-enforcement + ExtendedSampleObservation shape + mean_delta computation). Multi-decision dilution: the Reviewer's adversarial scan must check 5 independent surfaces against PRD AC-P2 conjuncts. The R01 session-crash class (per CROSS-PROJECT-MEMORIAL line 156-205 R01 entries — anti-scope vendoring + spec contradictions + multiple HALT conditions absorbed) is correlated with multi-decision spec breadth.

**Hidden assumptions:** That the 5 decisions are tightly coupled (they are NOT — mean_delta requires baseline injection orthogonally; sparse-encoding-enforcement requires emitting tier-specific fields which is downstream of accumulator integration).

**Risks:** Session-crash recurrence (R01 had 6+ files of anti-scope vendoring + 3 spec contradictions; this round would mirror that breadth). Cross-decision interaction errors at Reviewer time (e.g., sparse-encoding-enforcement assertion firing at the wrong layer because accumulator-strategy resolution changed the field set the assertion operates on).

**Verdict:** REJECTED. The R02/R03/R04 narrowing discipline (compile-time schema / state machine / algorithm / composition) is load-bearing for the 3-consecutive-round 0-CRITICAL-0-MAJOR streak. R05 maintains the discipline.

### Approach B — Schema extension (option a) + composition module + ExtendedSampleObservation; defer mean_delta + sparse-encoding-enforcement to R06

**Strengths:** Picks the central architectural decision (accumulator-strategy) and ships its enabling substrate. Implements the architect-pre-predicted-HIGH-confidence design (composition function in new module per R04 sidecar). Three deltas (config.ts + new module + new test) plus one OBS-5 closure (welford.ts JSDoc) = right-sized substrate equivalent to R02 (7 surfaces) / R03 (5) / R04 (3). Tests are bounded (13 ACs against the new module). Bundles the R04 OBS-5 JSDoc closure that naturally co-locates with the touched welford.ts.

**Weaknesses:** Does not close the SLICE 2b3 envelope (R06 still needs to ship mean_delta + sparse-encoding-enforcement). Reviewer may flag "consumer-less welford_state field" (precedent: R04 Reviewer adversarial scan flagged welfordCovariance defensive-copy as OBS-1; same pattern could fire for welford_state at R05 since no R05 production code reads back the accumulator after writing it).

**Hidden assumptions:** That the sparse-encoding-enforcement decision can be made independently of the accumulator-strategy decision. Verified: R02 MINOR-2 enforcement targets OUTPUT fields (mean_vector / covariance / mean_delta tier-gating); R05 accumulator-strategy targets INTERNAL state placement. They are orthogonal — R05 stores accumulator; R06 emits OUTPUTs and enforces sparse encoding on them.

**Risks:** R06 architect inheriting two architectural decisions instead of one (mean_delta computation + sparse-encoding-enforcement). Mitigated by the architectural-layer split rationale: each sub-slice is a single coherent decision.

**Verdict:** SELECTED. Full why-picked rationale below in § Decision rationale.

### Approach C — Caller-state accumulator (option c)

**Strengths:** Zero schema change. Existing PerShardResidual schema untouched. Reuses R03 + R04 modules verbatim — no new compile-time edges.

**Weaknesses:** The "where does accumulator state live" question is deferred indefinitely. The orchestrator (not yet built) must maintain a parallel `Map<(shard, cell), WelfordState>`. Serialization path: instead of `CompiledConfig.per_shard_cells[].residual` carrying the full state, an external map needs its own serialization treatment. At R06 mean_delta emission time, the orchestrator must thread the external map through every emission boundary.

**Hidden assumptions:** That orchestrator state is acceptable. Counter: SCOPING-MEMO § 2.2 R-E1 storage analysis assumes per-(shard, cell) state lives in `per_shard_cells` (the named serialization target); option (c) splits that across two storage locations.

**Risks:** Architectural decision actually NOT made — option (c) is "defer the decision to R06." This violates the brainstorm principle of picking the best tradeoff rather than the first option, and produces a R05 with no load-bearing architectural commitment.

**Verdict:** REJECTED. Deferring the decision masquerades as making it. R05's purpose is to MAKE the accumulator-strategy decision.

### Approach D — Modify observeSample inline (option similar to b)

**Strengths:** Single point of integration. observeSample becomes the canonical per-shard update entry point. No new module path.

**Weaknesses:** Modifying observeSample's signature (adding sampleVector parameter) changes the R03 contract that the q03 tests (and R04 q03 Delta 3 additions) are bound to. q03 AC-1 through AC-11 + R04 AC-12 + AC-13 all assume observeSample's pre-R05 signature. Breaking R03 contracts is a regression class the R04 review flagged proactively (R04 audit sidecar Approach C rejection at PRD-conjunction-cross-check time noted similar concern).

**Hidden assumptions:** That observeSample's current narrow responsibility (state-machine only) is the wrong design. Counter: R03 deliberately separated state-machine from statistical accumulation to keep both pure-function and testable in isolation. R04 reaffirmed by NOT bundling integration into welford.ts (kept welford.ts at zero imports). R05 inheriting both separations is the consistent next step.

**Risks:** Forced rework of q03 tests; potential silent semantic drift if Implementer "preserves" R03 tests by passing dummy sampleVectors.

**Verdict:** REJECTED. Compositional cleanliness preserved by the new module approach.

### Approach E — Pure R04 carry-forward cleanup (OBS-1 through OBS-7 closure round)

**Strengths:** Closes all 7 R04 OBS findings in a single hygiene round. Bumps test-coverage tightness for welford.ts (OBS-1 defensive-copy binding) and tightens JSDoc accuracy (OBS-5 + OBS-6). No architectural decisions.

**Weaknesses:** Ceremonial overhead — R04 already MERGE-READY at 0 CRITICAL + 0 MAJOR + 0 MINOR; all 7 OBS findings are explicitly architect-acknowledged residuals or cosmetic. A round dedicated to cleanup defers the central R05 architectural-decision question by a full round, increasing the risk that R07 / R08 inherit accumulating-architectural-debt instead of clean-substrate.

**Hidden assumptions:** That the OBS items represent load-bearing-pending closures. Counter: R04 Reviewer explicitly classified all 7 as non-binding ("R05 architect's call to decide whether to harden"; "accepted residual"; "wording-precision quibble").

**Risks:** Missed Q-cycle on the architectural decision (accumulator-strategy) that R04 explicitly handed forward as the load-bearing R05 work.

**Verdict:** REJECTED. R05's mandate per R04 sequencing context is the accumulator-strategy decision; OBS items are non-blocking and can be picked up by future rounds that naturally touch each surface.

### Tier-rubric verdict

Per anchor `templates/PRD-TEMPLATE.md` Round-Scaling skill 11 (anchor PR #34 — CLAUDE-COMMON.md `# ── TIER SELECTION` section) walked top-down:

1. Does any A1-A7 fire?
   - A2 (new architectural pattern with no precedent in the codebase): YES — Approach B introduces a new `engine/per-shard/runtime.ts` module establishing the composition-of-pure-functions pattern at the per-shard layer.
   - A4 (novel data model): YES — `welford_state?: WelfordState` is a novel schema field carrying internal accumulator state on a serializable record.
   - A7 (first-time territory): YES — Phase 1 SLICE 2b3 has no precedent at Tessera; this is the first integration of the R03 state machine with the R04 algorithm.
   - A1, A3, A5, A6: not firing.
2. **Verdict: full tier.** A2 + A4 + A7 fire; no Si or Zi consideration warranted. Same firing pattern as R02 + R03 + R04 (each round established a new architectural-layer surface).

Tier verdict recorded per CLAUDE-COMMON.md `## Recording the decision` requirement for full tier rounds (no record required for full, but recorded here for consistency with R02/R03/R04 audit sidecars).

---

## Q-R05 → Q-R06 sequencing context

R06 (SLICE 2b3 → SLICE 2c open) scope inferred from R05's narrowing:

- **`mean_delta` computation.** R05 lands the accumulator; R06 adds the baseline-injection orchestration boundary and computes `mean_delta = welfordMean(residual.welford_state) - baselineMean(baseline)`. Architect-pre-prediction (HIGH confidence): a new orchestration function `tickPerShardCell(cell: PerShardCell, baseline: BaselineCellEntry, obs: ExtendedSampleObservation): PerShardCell` that calls `updatePerShardResidual` and then applies the baseline-injection at the tier-emission boundary.

- **`mean_vector` / `covariance` emission at strict tier.** R06 projects `welford_state` to OUTPUT fields at the strict-tier transition: when newConfidence transitions to `'strict'`, emit `mean_vector = welfordMean(welford_state)` AND `covariance = welfordCovariance(welford_state)`. Architect-pre-prediction (MEDIUM confidence): emission happens at READ time (when consumer asks for the tier-gated output) rather than WRITE time (computed during updatePerShardResidual) — see Q-R05-SPEC.md OQ-2.

- **R02 MINOR-2 sparse-encoding inverse-convention enforcement.** R06 architect picks discriminated-union refactor vs. runtime-invariant assertion. Architect-pre-prediction (MEDIUM confidence): (b) runtime-invariant assertion at the orchestration boundary — checks `mean_vector` + `covariance` defined AND `mean_delta` undefined at strict tier; `mean_delta` defined AND `mean_vector` + `covariance` undefined at warm_start tier; all three undefined at none/pooled/aggregate. Non-breaking (no schema refactor); load-bearing once R06 emits.

- **welford_state read-back consumer.** R05 ships the accumulator with no production consumer (q05 tests are the only readers); R06 adds a consumer at the orchestration boundary that calls `welfordMean` + `welfordCovariance` on the threaded accumulator. The R04-Reviewer-style "consumer-less surface" finding class (R04 welfordCovariance OBS-1) may fire at R05 Reviewer time for welford_state if no q05 test exercises the round-trip; mitigated by AC-10 (welfordMean read-back over composed updates) + AC-11 (JSON round-trip).

R07+ (SLICE 2c close / SLICE 3 open) scope:

- **Compiled-artifact JSON loader.** Reads a synthetic-cluster Tessera-side compiled-config JSON; verifies serialization round-trip including welford_state; minimal schema-version handling.
- **PR-F5 empirical storage profile.** Measures populated `per_shard_cells` footprint (including welford_state's d² m2 matrices) vs single-instance baseline at N=1000 synthetic shards. Validates SCOPING-MEMO § 2.2 architect-pre-prediction ~1.2-1.5× single-instance.
- **P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet.** End-to-end loader + state machine + Welford + composition + emission + sparse-encoding-enforcement.

R05 will NOT be a separate fix-cycle: per R04 close (MERGE-READY at 0 CRITICAL + 0 MAJOR + 0 MINOR + 7 OBS), there are no R04-derived MINOR / MAJOR / CRITICAL items to repair. R05 bundles exactly one R04 OBS (OBS-5: welford.ts JSDoc refresh — naturally co-located with Delta 3). Remaining R04 OBS-1/2/3/4/6/7 are explicitly fenced per R05-SAS-13.

The R01 MINOR-3/4/5/6/8/9 unbundled fence (R02-SAS-9 → R03-SAS-11 → R04-SAS-21 → R05-SAS-13 carry-forward chain) is preserved: these were unbundled at R02 to keep scope tight and remain unbundled through R05 for the same reason.

---

## Pre-route discipline application

### Skill 14 — PRD-conjunction-cross-check (symmetric)

PRD AC-P2 conjuncts: (i) "warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold)" + (ii) "strict-upgrade at 60 samples preserves inherited single-instance behavior."

R05 narrows AC-P2 delivery to the COMPOSITION-SUBSTRATE layer. The PRD conjunct "preserves inherited single-instance behavior" requires accumulating from sample 1; R05's composition function (`updatePerShardResidual`) threads the Welford accumulator across every sample under stable seed, preserving the property. The PRD conjunct "enables ALERTS within 20 samples" requires alert-emission machinery that remains orchestrator scope (R05-SAS-4 → R06+); the literal numeric threshold 20 is preserved (R03-shipped WARM_START_THRESHOLD constant, unchanged at R05; verified at AC-3 fixture).

**Symmetric application:** R05 does NOT widen any PRD conjunct. The literal numeric threshold 20 (warm-start) and 60 (strict-upgrade) are preserved verbatim (R03-shipped constants imported at q05 test file; AC-3 + AC-9 reference them). PR-F4 pair-review derivation is acknowledged in upstream sequencing but is not load-bearing at R05.

PASS — no silent narrowing or widening of PRD conjuncts; the literal thresholds are preserved; the "preserves inherited single-instance behavior" property is bound at the composition layer.

### Skill 15 — Prescription-to-AC-coverage

Every § Mechanism Delta binds to one or more AC; every 'Created' entry in § Component inventory has an AC binding.

- Delta 1 (`engine/types/config.ts` PerShardResidual extension) → bound by AC-15 (typecheck exit 0 with new field declaration) + AC-1 (post-state literal includes welford_state field, type-checked at consumer call site) + AC-11 (JSON round-trip exercises serialization through the new optional field).
- Delta 2 (`engine/per-shard/runtime.ts` CREATED) → bound by AC-1 through AC-13 (13 ACs covering 13 semantic surfaces of the composition function) + AC-17 (file passes 13/0).
- Delta 3 (`engine/per-shard/welford.ts` JSDoc refresh) → bound by AC-19 (literal-content greps verifying the new wording is present and the old wording is removed).
- Delta 4 (`test/q05-per-shard-runtime.test.ts` CREATED) → bound by AC-17 (file exists and passes 13/0) + AC-14 (TDD ordering: q05 test file created at RED commit).

Every R04 carry-forward cited in § Mechanism / § Anti-scope traces to a specific AC OR an architect-discipline reinforcement OR explicit deferral:
- R04 OBS-5 (welford.ts JSDoc R03-pointer) → AC-19 (new wording verified).
- R04 OBS-1 (welfordCovariance defensive-copy unbound) → R05-SAS-13 (explicit defer; no q04 surface touched).
- R04 OBS-2 (AC-2 m2-zeros tautological) → R05-SAS-13 (explicit defer; architect-acknowledged residual; q04 untouched).
- R04 OBS-3 (AC-6 numerical-stability one-sided) → R05-SAS-13 (explicit defer; architect-acknowledged residual).
- R04 OBS-4 (AC-13 normal-increment-only) → R05-SAS-13 (architect-acknowledged residual; subsumed conceptually by R05 AC-7 which binds the new function's immutability; explicit defer of q03/warm-start.ts re-touching).
- R04 OBS-6 (welfordCovariance "defensive deep copy" wording) → R05-SAS-13 (cosmetic defer).
- R04 OBS-7 (AC-11 redundant tail assertion) → R05-SAS-13 (cosmetic defer).
- R02 MINOR-2 (sparse-encoding-enforcement) → R05-SAS-6 (premature without tier-specific output fields; R06 architect's call).

Per the R59 + R64 anti-self-confirming-test reinforcement: each AC binding is checked for self-confirming risk.

- AC-1: closed-form post-state with literal field values; not self-confirming (mutation of composition body would fail).
- AC-2: closed-form post-state inherited from R04 AC-3 hand-trace ([1,2] mean + [[2,4],[4,8]] m2 for [0,0]+[2,4] samples); not self-confirming (would require BOTH R04 AC-3 AND R05 AC-2 to have the same bug, but R04 AC-3 is already in the test substrate at HEAD `9e8304a` — any drift would surface at AC-16 regression check).
- AC-3: closed-form post-state at the boundary (n=20 → confidence='warm_start'; welford_state.n=20); not self-confirming (mutation to skip the increment OR skip the confidence transition would fail).
- AC-4: closed-form post-state with literal field values for the reset case ([7,9] mean + [[0,0],[0,0]] m2 + n=1); not self-confirming (spread-based reset that propagated stale welford_state would produce mean=[10,20] / m2=[[100,0],[0,200]] / n=51, all of which would fail).
- AC-5: closed-form post-state for first-time-seed-no-prior-accumulator ([4,6,8] mean + zeros m2 + n=1); not self-confirming.
- AC-6: assert.throws bind on /dimension mismatch/ regex; not self-confirming (no-throw or wrong-message implementation would fail).
- AC-7: JSON.stringify snapshot equality; not self-confirming (any in-place mutation would change the serialization).
- AC-8 + AC-9: closed-form post-state with both tier-transition AND welford_state presence asserted; not self-confirming (spread-form regression that cleared welford_state at tier transition would fail AC-8/AC-9).
- AC-10: explicit closed-form mean [3,3] from samples [[1,1],[3,3],[5,5]]; externally hand-derivable; not self-confirming.
- AC-11: JSON round-trip equality; not self-confirming (round-trip drift would fail).
- AC-12: literal `welford_state === undefined` assertion on cold-start; not self-confirming.
- AC-13: literal `welford_state === undefined` assertion on direct observeSample call; bidirectional binding with AC-1 (where the SAME input → DIFFERENT output via runtime.ts).
- AC-14 through AC-19: binding-command / git-history / grep evidence; not self-confirming by construction.

Per the R64 handler-code-path-unexercised reinforcement (body-content-gap sub-variant): the "200-status empty-body" equivalent mutation at the composition layer would be `return current;` (return input verbatim). AC-1 would fail (n_samples=1 expected; 0 in returned); AC-4 would fail (residual_seed_hash='sha:new' expected; 'sha:old' in returned); AC-5 + AC-10 + AC-11 would all fail by similar mechanism. Body-content gap closed.

PASS — every prescription binds; no self-confirming or empty-body gap.

### Memorial sweep

Inherited active memorials + R04 carry-forwards + cross-project reinforcements applied:

- **Memorial D** (architectural-layer-coverage at hypothesis-tree time): brainstorm enumerated 5 candidates; 4 rejected with explicit weakness rationale (A multi-decision-dilution; C deferral-masquerading-as-decision; D R03-contract-regression; E ceremonial-without-architectural-progress); 1 selected (B). Memorial D state delta: no new violation expected; brainstorm-discipline application canonical.

- **Memorial F** (4 sub-rules at brief-drafting time): applies to compile-time substrate changes. R05 modifies `engine/types/config.ts` (Delta 1 — PerShardResidual extension). Sub-rules 1+2+3+4 consulted:
  - **File-opened (1)**: PerShardResidual at config.ts:860-880 opened (R05 spec authoring read lines 410-470 + 830-890). WelfordState at welford.ts:33 opened (full welford.ts read). observeSample at warm-start.ts:69 opened (full warm-start.ts read).
  - **Inherited type-state cited (2)**: PerShardResidual (R02 + R03 + R04 verified); WelfordState (R04-verified); SampleObservation (R03-verified). No new external type instantiations.
  - **Candidate-set enumeration (3)**: 5 approaches above; symmetric application caught Approach D's contract-regression at brainstorm time.
  - **No narrowing of stakeholder requirements (4)**: SCOPING-MEMO SLICE 2 → SLICE 2b3 narrowing is explicitly documented (§ Spec preamble + § Anti-scope R05-SAS-4/5/6 + § Open questions OQ-2/3/4). PRD AC-P2 literal thresholds 20 + 60 preserved (R03-shipped). No silent narrowing.

- **No-skip-policy on statistical-invariant tests**: R05 adds composition tests (AC-1 through AC-13). These exercise pure-function composition + state-machine + accumulator threading — NOT Ville / martingale / e-value invariants. The no-skip policy specifically targets statistical-invariant tests. R05 introduces no such tests; policy preserved by absence-of-violation. No `.skip` / `xfail` / `it.todo` prescribed in any R05 test.

- **R01 ARCHITECT cross-section consistency reinforcement** (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16): executed in dedicated § Cross-section consistency pass section (15 resolved-decision checks; all PASS). 5th consecutive application after R02's 9, R03's 13, R04's 12. Now well-established standing discipline.

- **R02 ARCHITECT type-declaration-site reinforcement** (REINFORCED 2026-05-16 from R02 OBS-3): executed at § P3.3 grilling step 5. WelfordState at welford.ts:33 (already opened during R04 spec authoring; re-verified at R05); PerShardResidual at config.ts:860-880 (re-opened); SampleObservation at warm-start.ts:26 (re-opened). All declaration sites verified before instantiating types in pseudocode. 4th consecutive application after R02 (Architect originally missed CellKey site → cascaded to R03 MINOR-3); R03 (applied for CellKey at primitives.ts:44); R04 (applied trivially-by-absence since welford.ts had zero imports). R05 applies to one new external type instantiation (`WelfordState` in config.ts Delta 1).

- **R02 ARCHITECT file-deletion track-state reinforcement** (REINFORCED 2026-05-16 from R02 OBS-2): R05 has no deletions; parallel discipline (verify file existence before prescribing creation paths) applied — `git ls-files engine/per-shard/runtime.ts test/q05-per-shard-runtime.test.ts` → empty at HEAD `aee274c`. Documented in § Component inventory directory-creation track-state verification and § Cross-section consistency pass row 12.

- **R03 ARCHITECT re-export-chain-check reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-3): one new cross-module integration claim verified — "config.ts imports WelfordState from `../per-shard/welford`." Verification: WelfordState declared AND exported at welford.ts:33 with `export interface` (direct export; no re-export chain to traverse). 2nd application; pattern verified by reading the welford.ts source file during R05 spec authoring, not by relying on prior-round verification. Documented in § Integration points point 1 + § Grilling output step 5.

- **R03 ARCHITECT grep-pattern-soundness reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-2): applied at AC-design time. R05 spec has TWO grep-evidence ACs (Implementer note 1's field-declaration grep + AC-19's JSDoc-content greps). Each audited at § Grilling output step 5:
  - Note 1 grep was REVISED post-grilling from `grep -c "welford_state"` (which could match in docstrings) to `grep -nE "^\\s+welford_state\\?: "` (matches only field-declaration syntax; excludes docstring text). REVISION applied to spec.
  - AC-19 greps target JSDoc literal content (the new wording IS the verification target — comments ARE intended to match); the R03 MINOR-2 reinforcement targets "AC intent is no-executable-cast, grep matches in comment" patterns, which does NOT describe AC-19's intent (intent IS "JSDoc has the new wording"). The reinforcement aligns with intent; documented inline in AC-19.

- **R03 ARCHITECT empirically-verified-test-count reinforcement** (REINFORCED 2026-05-16 from R03 MINOR-4): applied at AC-design time. AC-16 directs Implementer to report OBSERVED counts; pre-R05 baseline counts (44 total at HEAD `9e8304a`) are INFORMATIONAL prose cited from REVIEWER-REPORT-R04.md, not AC-bound. AC-17 pre-states q05 = 13 because the spec STRUCTURALLY declares 13 in-file ACs; this is mechanically Implementer-verifiable (run the file, count tests) — the R03 MINOR-4 reinforcement targets UNVERIFIED-AT-SPEC-TIME counts, not structurally-pre-determined counts.

### Compilation-dependency enumeration (R01 MAJOR-3 lesson — applied this round)

Per R01 MAJOR-3 the Architect enumerates compilation dependencies before declaring anti-scope on a target file. R05 creates `engine/per-shard/runtime.ts` + `test/q05-per-shard-runtime.test.ts` and modifies `engine/types/config.ts` + `engine/per-shard/welford.ts` (JSDoc-only). Compilation dependencies enumerated:

- `engine/types/config.ts` (CHANGED) gains one import: `import type { WelfordState } from '../per-shard/welford'`. This creates a new cross-directory edge (types/ → per-shard/). welford.ts has zero imports (verified at R04 close), so no cycle. No other config.ts imports added/removed.

- `engine/per-shard/runtime.ts` (CREATED) imports:
  - `PerShardResidual` (type-only) from `../types/config` — single identifier
  - `observeSample`, `SampleObservation` (type-only on SampleObservation) from `./warm-start` — two identifiers
  - `initialWelfordState`, `updateWelford`, `WelfordState` (type-only on WelfordState) from `./welford` — three identifiers
  Total: 6 identifiers from 3 Tessera-original modules. ZERO inherited-vendored imports.

- `engine/per-shard/welford.ts` (CHANGED, JSDoc-only) — no new imports; zero-import invariant preserved.

- `test/q05-per-shard-runtime.test.ts` (CREATED) imports:
  - `updatePerShardResidual`, `ExtendedSampleObservation` (type-only) from `../engine/per-shard/runtime` — two identifiers
  - `initialPerShardResidual`, `WARM_START_THRESHOLD`, `STRICT_UPGRADE_THRESHOLD` from `../engine/per-shard/warm-start` — three identifiers at top-level
  - `welfordMean` from `../engine/per-shard/welford` — single identifier (only the mean read-back is exercised at R05; welfordCovariance read-back deferred to R06 per R05-SAS-13)
  - `makePerShardResidual` from `./_substrate/factories` — one identifier (R03-shipped factory)
  - `node:test` + `node:assert/strict` — standard library
  - PLUS one dynamic import inside AC-13: `observeSample` from `../engine/per-shard/warm-start` (one additional identifier from a module already in the top-level imports; Implementer may equivalently promote this to a top-level import — either form satisfies AC-13).
  Total: 8 application-identifier imports + 2 stdlib; ZERO inherited-vendored imports.

No new dependencies on inherited vendored detector code, vendored l0 / o0 modules, or any external npm package. No anti-scope-vs-compilation-deps tension at R05. PASS.

### MEMORIAL.md attestation discipline

Per the R49 + R61 reinforcement "MEMORIAL.md is not an attestation artifact — tactical deviations must be in NEXT-ROLE.md." R05 spec does not pre-write Implementer MEMORIAL entries; those are emitted at IMPLEMENTER coordination time. Post-R05 MEMORIAL accretion is the MEMORIAL-UPDATER's responsibility.

### TDD discipline (per R57/R59/R62 reinforcements)

R05 prescribes two-commit TDD ordering (Implementer note 4 + AC-14). The commit boundary is explicit:
- Commit 1 (RED): `test/q05-per-shard-runtime.test.ts` (runtime.ts doesn't exist; test imports fail with TS2307; tsc exits non-zero).
- Commit 2 (GREEN): `engine/per-shard/runtime.ts` + `engine/types/config.ts` Delta 1 + `engine/per-shard/welford.ts` Delta 3 (JSDoc-only). All imports resolve; all 13 q05 assertions pass; AC-16 binding-command confirms no R01/R02/R03/R04 regressions.

This matches the R02 + R03 + R04 successful pattern. The bundling concern (R55 + R59 + R62 test-modification-bundling 8-occurrence pattern) is addressed: the GREEN commit bundles two production files (runtime.ts + config.ts) + one JSDoc-only edit (welford.ts) — bundled because they are mutually-dependent (config.ts Delta 1 imports from welford.ts which is JSDoc-touched; runtime.ts imports from both). Splitting GREEN into three commits would create a transient RED state at the config.ts touch (where WelfordState is imported but the JSDoc-refreshed welford.ts is not yet present — same logical bundle).

Schema change at R05 (Delta 1) DOES touch the production schema; the "schema-before-RED" R62 reinforcement requires that the schema change land in a commit BEFORE the RED commit if the RED test fixtures depend on the schema. Audited: q05 test fixtures use `makePerShardResidual({ welford_state: {...} })` which DOES require the welford_state field on PerShardResidual. RESOLUTION: At RED commit time, `makePerShardResidual` accepts `Partial<PerShardResidual>` overrides, which TypeScript will reject if welford_state isn't on the type. This means the RED commit CANNOT typecheck without the schema delta. Implementer note 4 addresses this: the RED commit's TS2307 (Cannot find module '../engine/per-shard/runtime') is the primary RED signal; the schema-related TS errors are secondary. RESOLUTION (R62-aligned): the RED commit includes the test file ONLY; tsc fails on TS2307 (module not found) AND potentially TS2322 (welford_state not assignable to PerShardResidual) — both are GENUINE RED states because both block the test from running. The GREEN commit lands all three: runtime.ts + config.ts Delta 1 + welford.ts Delta 3. This is bundled GREEN and matches the R04 + R03 precedent (q03 Delta 3 changes bundled into R04 GREEN; q01/q02 Delta updates bundled into R03 GREEN; etc.).

Stricter alternative considered + rejected: Three-commit sequence (Commit 0: config.ts Delta 1 standalone — schema lands first; Commit 1 RED: q05 test; Commit 2 GREEN: runtime.ts + welford.ts JSDoc). This would honor R62 strict-schema-before-RED. Rejected because: (a) the schema delta is small (one field + one import); (b) it has no downstream consumers in the codebase at Delta 1 lands time (runtime.ts doesn't exist yet; q05 doesn't exist yet); (c) splitting creates additional commit-graph complexity for marginal discipline gain. The R62 reinforcement is observed by bundling the schema delta into GREEN (the only consumer-having commit) rather than into RED (where it would be dead substrate).

### Anti-self-confirming-test (per R57/R59/R64 reinforcements)

Per AC analysis recorded in the Skill 15 prescription-to-AC-coverage section above. Summary: 13 ACs against new code (AC-1 through AC-13), all non-self-confirming (closed-form post-state targets for AC-1/2/3/4/5/10; throw-binding for AC-6; JSON-snapshot equality for AC-7/11; tier-transition + presence binding for AC-8/9; cold-start undefined-binding for AC-12; cross-surface inverse-binding for AC-13). The strongest bindings are AC-2 (R04-derived closed-form M2 hand-trace; would require R04 AC-3 AND R05 AC-2 to have the same bug, which the AC-16 regression cross-check additionally guards against) and AC-19 (whole-file literal-content greps on three independent strings).

The "200-status empty-body" mutation equivalent at the composition layer (`return current;`) would fail AC-1 + AC-4 + AC-5 + AC-10 + AC-11 — body-content gap closed.

### Memorial-D structural fix (anchor PR #35) compliance

Per anchor PR #35, the `## Existing architectural surface (REVIEWER-ANCHOR)` section is mandatory at SPEC fidelity. R05's existing-architectural-surface citations:

- **PerShardResidual at `engine/types/config.ts:860-880`** (verified at HEAD `aee274c` via Read of lines 830-890); pre-R05 shape established at R02 Delta 5; AC-P2-traced fields `n_samples` + `confidence` preserved; new optional field `welford_state?` added per Delta 1.

- **WelfordState at `engine/per-shard/welford.ts:33`** (verified at HEAD `aee274c` via Read of full file); R04-shipped; signature `{ n: number; mean: number[]; m2: number[][] }`; export modifier present; zero internal imports.

- **observeSample + SampleObservation at `engine/per-shard/warm-start.ts:26 + 69`** (verified at HEAD `aee274c` via Read of full file); R03-shipped; observeSample signature `(current: PerShardResidual, obs: SampleObservation) => PerShardResidual`; SampleObservation = `{ observedAt: number; residualSeedHash: string }`.

- **initialPerShardResidual at `engine/per-shard/warm-start.ts:38`** (verified); cold-start factory; returns `{ n_samples: 0, confidence: 'none' }`.

- **WARM_START_THRESHOLD + STRICT_UPGRADE_THRESHOLD constants at `engine/per-shard/warm-start.ts:14 + 22`** (verified); R03-shipped; values 20 + 60 (PRD AC-P2 literals).

- **makePerShardResidual factory at `test/_substrate/factories.ts:42-46`** (verified); R02-shipped; signature `(overrides: Partial<PerShardResidual>) => PerShardResidual`; accepts welford_state via `Partial<>` once Delta 1 lands.

- **tsconfig.test.json include glob at `tsconfig.test.json:12-15`** (verified); patterns `engine/**/*.ts` + `test/**/*.ts` + `tools/**/*.ts`; new R05 files match.

Grep-evidenced citations applied per anchor PR #35 structural mandate. R05 is the 4th consecutive Tessera spec authoring with the section applied at SPEC fidelity (R02/R03/R04 prior).

---

## Architect pre-predictions on outcomes

Each prediction is committed before the round runs so the post-round Memorial Updater can grade prediction accuracy.

1. **AC outcome:** All 19 ACs PASS at first IMPLEMENTER pass (no fix-cycle required). The composition function is mechanical (replicate observeSample's seedChanged predicate; thread Welford accumulator forward); pure-function form makes test assertions deterministic; the hand-traceable cases (AC-1 cold-start; AC-2 inherited R04 AC-3 closed-form; AC-10 mean-of-3-samples) verify both composition correctness and accumulator threading.

2. **Halt conditions:** zero — schema change is bounded (single optional field + single type import); pseudocode is concrete and complete; the only architectural question (accumulator-strategy) is picked with full why-picked rationale; Implementer notes are mandatory with verification commands. The most likely surprise (Implementer note 5: hand-trace verification on cold-start sample composition) is architect-pre-predicted as "Implementer should run this hand-trace before committing GREEN" — explicit anti-shortcut guidance.

3. **TDD ordering:** verifiable via two-commit sequence (RED commit = `test/q05-per-shard-runtime.test.ts`; GREEN commit = `engine/per-shard/runtime.ts` + `engine/types/config.ts` Delta 1 + `engine/per-shard/welford.ts` Delta 3). 4th consecutive Reviewer-side TDD verification opportunity for Tessera (R02/R03/R04 prior — establishes the pattern as standing discipline; 5th overall counting R01 unverifiable-due-to-crash).

4. **Implementer Q-cycle:** ~2-3 hours total (smaller than R04 since the composition logic is the simplest of the three R03+R04+R05 modules: replicate a two-line predicate; thread an accumulator forward). Comfortably under the 2-day budget; on par with R03/R04 actuals.

5. **Reviewer findings:** ≤2 MINOR + ≤4 OBS expected; 0 MAJOR + 0 CRITICAL. Welford-composition layer is small + textbook + well-bound at 13 ACs. Likely Reviewer findings: (a) AC-3 fixture uses `welford_state.m2 = [[0,0],[0,0]]` initialized at n=19 (vacuous — but documented intentionally because the AC's binding target is the n→20 transition, not the m2 update); (b) AC-13's dynamic import inside the test is unusual style (could be top-level); (c) welford_state read-back coverage gap (only AC-10 reads welfordMean back; no test reads welfordCovariance back — same class as R04 OBS-1); (d) the welford_state JSDoc on PerShardResidual could mention "R06 emits OUTPUT fields" more directly. None blocking; substrate is sound.

6. **Memorial state delta:** No new Memorial D violations expected. Four CONFIRMATIONs expected: (a) 5th consecutive cross-section-consistency-pass application; (b) 4th successful "narrow architectural-layer scope" round (R02/R03/R04/R05 streak); (c) Skill 14 PRD-conjunction-cross-check maintained at brainstorm time (caught Approach D's R03-contract-regression); (d) Memorial F compile-time-substrate-change sub-rule application (Delta 1 PerShardResidual extension).

7. **Session-crash risk:** low. Per-role CLAUDE.md split active; spec is right-sized at 4 file surfaces (1 production created + 1 test created + 2 modified); pseudocode is concrete and complete; the only architectural complexity (accumulator-strategy decision + composition function) is fully described with hand-traceable verification. Same risk class as R02/R03/R04 (none crashed).

8. **R04 OBS-5 closure success:** Delta 3 (welford.ts JSDoc refresh) lands cleanly; AC-19 binds via literal-content greps. The bundling pattern (R04 OBS-5 into R05 algorithm-adjacent work) demonstrates the discipline pays off: natural co-location means single-touch closure.

9. **R03+R04 architect-discipline-consumption validation:** All 5 R03-derived + 1 R04-derived architect discipline reinforcements (cross-section consistency pass; type-declaration-site discipline; re-export-chain-check; grep-pattern-soundness; empirically-verified-test-counts; file-creation-track-state) applied at R05 spec-authoring time. R05 Reviewer will independently verify each. If all 6 Reviewer checks PASS, reinforcement compounding continues positively (5th consecutive round of compounding architecture-discipline application).

10. **R06 architectural decision space:** R05 explicitly defers mean_delta computation + sparse-encoding-enforcement to R06. R06 architect will pick both. Architect-pre-prediction for R06: mean_delta via baseline-injection at orchestration boundary (HIGH confidence); sparse-encoding-enforcement via runtime-invariant assertion option (b) (MEDIUM confidence). Both are R06 architect's calls and may differ from the prediction.

11. **welford_state field-name divergence from R04 sidecar pre-prediction:** R04 sidecar used `_accumulator?: WelfordState`; R05 picks `welford_state?: WelfordState`. The divergence is documented in § Cross-section consistency pass row 2 and § Mechanism primitive 1. R05 architect's call; R04 sidecar pre-prediction was MEDIUM confidence on (a) and explicitly said "field name not specified." Reviewer may flag the naming divergence as discussion item; pre-emptive defense in spec text.

12. **Module-path divergence from R04 sidecar pre-prediction:** R04 sidecar used `per-shard-runtime.ts`; R05 picks `runtime.ts` (in-directory-prefixed). Documented in § Cross-section consistency pass row 3. Reviewer may flag; pre-emptive defense.

---

## Decision rationale (per resolved decision)

### D1 — Accumulator-strategy: option (a) `welford_state?: WelfordState` schema extension on PerShardResidual

**Why picked:**
- **Serializability path alignment**: CompiledConfig.per_shard_cells is the named serialization target (per R02 Delta 4 establishing `per_shard_cells?: PerShardCell[]` on CompiledConfig). Carrying accumulator state INSIDE per_shard_cells via PerShardResidual.welford_state means single-pointer serialization. Option (c) caller-state would require an external map serialized separately.
- **Threading simplicity**: pure-function composition (`updatePerShardResidual(current, obs) → newResidual`) operates on a single argument and returns a single result. Option (c) would require either threading a Map through every call OR having the orchestrator maintain it externally — both increase coupling.
- **R04-sidecar-architect-pre-prediction alignment**: option (a) was the HIGH-confidence pre-prediction (R04 audit sidecar § Q-R04 → Q-R05 sequencing context).
- **Future-proof for R06 mean_delta computation**: with accumulator on residual, `mean_delta = welfordMean(residual.welford_state) - baselineMean(baseline)` becomes a one-liner. Option (c) would require an additional accumulator-Map lookup.

**Why rejected (option b — mean_delta overload):** Conflates OUTPUT (mean_delta as the sparse-encoding warm_start-tier output) with INTERNAL STATE (accumulator). Forces the orchestrator to interpret mean_delta differently per tier — at warm_start, it's the OUTPUT projection; at strict, it's stale accumulator data. The R02 sparse-encoding convention would need to be re-specified.

**Why rejected (option c — caller-state):** Defers the architectural decision indefinitely. The orchestrator must maintain a parallel Map<(shard, cell), WelfordState>. Storage footprint is identical (just in a different container) but serialization is harder. Doesn't actually answer "where does accumulator state live."

### D2 — Composition strategy: NEW module `engine/per-shard/runtime.ts` (not modifying observeSample)

**Why picked:**
- **observeSample's R03 contract preservation**: q03 AC-1 through R04 AC-13 are bound to observeSample's `(current: PerShardResidual, obs: SampleObservation) => PerShardResidual` signature. Modifying observeSample to accept `sampleVector` would either break the signature (forcing q03 fixture rework) or require an overload (complicating R03 contract).
- **Compositional discipline**: R03 deliberately separated state-machine (warm-start.ts) from statistical accumulation. R04 reaffirmed by NOT modifying warm-start.ts at all (R04-SAS-2). The composition pattern is established convention; R05 extends it rather than violating.
- **R04-sidecar-architect-pre-prediction alignment**: HIGH-confidence pre-prediction was a new module composing observeSample + updateWelford.

**Why rejected (modify observeSample inline — option similar to D in brainstorm):** Breaks the R03 contract; would force q03 rework; violates compositional discipline.

### D3 — Module path: `engine/per-shard/runtime.ts` (not `per-shard-runtime.ts`)

**Why picked:**
- **Concise + in-directory-prefixed**: import paths read `from '../engine/per-shard/runtime'` (qualified by directory; `runtime` qualifier sufficient).
- **No naming clash**: `engine/types/orchestration.ts` is in a different directory; no collision with `engine/per-shard/runtime.ts`.

**Why rejected (`per-shard-runtime.ts`, R04 sidecar pre-prediction):** Redundant — already in `per-shard/` directory. Verbose.

**Why rejected (`update.ts`):** Verb-named module; less descriptive than `runtime.ts` (which names the responsibility — "per-shard runtime composition").

**Why rejected (`orchestration.ts`):** Clashes with `engine/types/orchestration.ts` import-name-space at consumer sites.

### D4 — Composition function name: `updatePerShardResidual` (not `updatePerShardCell` or `tickPerShardCell`)

**Why picked:**
- **Operates on PerShardResidual** (matching observeSample's input/output type); name reflects argument type per JavaScript convention.
- **R04 sidecar architect-pre-prediction alignment** was `updatePerShardCell`; revised at R05 because the function operates on Residual, not Cell — Cell carries `{shard_id, key, residual}` and would imply the function also touches shard_id + key (which it does not).

**Why rejected (`updatePerShardCell`):** Misleading signature — the function does NOT modify shard_id or key, only residual. Naming would over-promise scope.

**Why rejected (`tickPerShardCell`):** "Tick" implies cluster-wide tick semantics (an orchestration concept); R05's function is per-sample, not per-tick. R06+ may rename to `tickPerShardCell` if absorbed into orchestration; R05 keeps narrow name (per OQ-5).

### D5 — ExtendedSampleObservation: extends-interface form, not intersection-type

**Why picked:**
- **Idiomatic TypeScript interface declaration merging**: future fields (e.g., sample timestamps, signal labels) can be added via interface declaration merging.
- **Clearer error messages at consumer call sites**: tsc's named-interface errors are easier to debug than intersection-type errors.

**Why rejected (intersection type `SampleObservation & { sampleVector: number[] }`):** Loses interface declaration merging path; equivalent at type level but less idiomatic.

**Why rejected (modify SampleObservation inline):** Violates R03-SAS-2 chain (R05-SAS-2); breaks R03 SampleObservation contract bound by q03 tests.

### D6 — welford_state field name: snake_case (not `_accumulator?` per R04 sidecar pre-prediction)

**Why picked:**
- **Alignment with PerShardResidual's snake_case convention**: `n_samples`, `mean_vector`, `covariance`, `mean_delta`, `residual_seed_hash`, `last_observed_at` — all snake_case.
- **JSON-serialization friendliness**: snake_case is the de-facto convention for serialized JSON keys in the existing codebase.

**Why rejected (`_accumulator?`, R04 sidecar pre-prediction):** Underscore-prefix convention is TypeScript "internal API" but has no operational meaning in JSON. The pre-prediction was MEDIUM confidence with explicit "R05 architect may pick differently." Snake_case is the more consistent choice given the existing field set.

**Why rejected (`welfordState?`, camelCase):** Breaks the snake_case convention for PerShardResidual fields.

### D7 — Bundle R04 OBS-5 (welford.ts JSDoc refresh); defer R04 OBS-1/2/3/4/6/7

**Why picked (OBS-5 bundle):**
- **Natural co-location**: R05 already touches welford.ts (the JSDoc references R03 → R04 sequencing context that R05 supersedes). Single-file-touch closure is the cheapest possible disposition.
- **AC-19 single-AC binding**: literal-content greps verify the new wording present + old wording removed; minimal test surface.

**Why rejected (bundle OBS-1 defensive-copy test):** Would require modifying test/q04-welford-stats.test.ts (a R04-shipped file), violating R05-SAS-12 (no modification to prior-round tests) AND R05-SAS-13 (no bundling of other R04 OBS items). The defensive-copy property holds by construction per R04 OBS-1 disposition; explicit test is non-blocking and defers cleanly to a future round that naturally touches q04.

**Why rejected (bundle OBS-2/3/4/6/7):** All architect-acknowledged residuals or cosmetic. Bundling would expand R05 surface area without architectural gain.

---

## End of audit sidecar

Spec at `Q-R05-SPEC.md`; this sidecar is the ceremony record. The Reviewer reads both files; the Implementer reads only the spec proper.
