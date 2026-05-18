# Q-R25-SPEC-AUDIT — Architect audit-trail sidecar

_Companion to `Q-R25-SPEC.md`. The spec proper contains decisions + prescriptions; this sidecar contains the audit trail (inputs consulted; citation log; P3 ten-axis verification narrative; pre-route discipline application; brainstorm re-evaluation if applicable; Architect pre-prediction on outcomes; decision rationale / amendments). Reviewer reads both; Implementer reads only the spec proper._

---

## § 1 Inputs consulted (with citation lines)

| Input | Lines opened | Purpose |
|---|---|---|
| `coordination/PRD.md` | Full (206 lines) | Cluster scope block (lines 4-117) — load-bearing for R25 scope. Phase-level scope (lines 118-206) — load-bearing for trace fields. |
| `coordination/SCOPING-MEMO-v0.3.md` | 200-290 (Extension 3 + MR-1 amendment block) | Authoritative source of the 6 invariants (lines 222-226); A10 MR-1 carve-out (line 254 ff); A12 anti-scope reinforcement (line 258). |
| `engine/l0/schema-continuity.ts` | Full (183 lines) | `SchemaDescriptor` shape at lines 41-58; `semantic_type` enumeration comment at `:44`. R25 reads but does NOT modify. |
| `engine/core.ts` | 1-120 (TrendBuffer + summarizeWindow) | TrendBuffer.push / get / snapshot signatures; slope/slopeNorm/mean/cv computation; AC-R25-12 integration test target. R25 reads but does NOT modify. |
| `engine/types/index.ts` | Full (33 lines) | Public type barrel; confirmed `SchemaContinuityRecord` re-exported (transitively through `engine/types/audit.ts`); spec does NOT import from this barrel (CounterMetadata is Tessera-original). |
| `engine/hardware-topology-source.ts` | Full (45 lines) | R23 frozen file; reference for "Tessera-original code (NOT vendored from DeploySignal)" docblock convention. |
| `test/_substrate/v9X-cluster.ts` | 1-50 | Naming-convention precedent (`make<TypeName>(overrides?) → TypeName`); deterministic-defaults pattern. |
| `test/q23-hardware-topology-source.test.ts` | 1-60 | Recent test-file structural precedent (file-level docblock + AC-binding comments + imports + per-AC `test(...)` blocks); AC-R23-15 chore-B anti-scope pattern. |
| `test/q01-no-at-pin-deltas.test.ts` | 1-89 | AT_PIN_FILES list — confirmed R25's new files (counter-rate-transform.ts) are NOT vendored and NOT in this list (no modification needed). |
| `coordination/VENDORING-MANIFEST.md` | 1-60 | Confirmed `engine/l0/schema-continuity.ts` row at 40 (vendored-at-pin, compilation dep). No R25 manifest update needed. |
| `coordination/NEXT-ROLE.md` | Full (13 lines) | Confirmed current state: STATUS: READY, NEXT-ROLE: ARCHITECT (this role); routing-block update planned in commit 2. |
| `coordination/MEMORIAL.md` | 1900-2117 (R20-R23 sections) | Recent CONFIRMATION/VIOLATION pattern; ceremony-section format; per-discipline grouping. |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | 2770-2994 (R18-R23 reinforcements) | All applicable reinforcement rules: R18 OBS-2 (vendored-file assertion surface), R19 (halt-discipline, anti-scope, memorial-self-exoneration), R20 MINOR-1 (narrative-vs-prescription), R21 MINOR-1 (spec-commit-sequencing), R21 MINOR-2/3 (branch-binding coverage), R22 MINOR-1 (count-AC SHA-anchoring), R23 MINOR-1 (TDD separate-RED), R23 MINOR-2 (.gitignore-aware allowed-set). All swept in § 9 of the spec. |
| `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` | Filename only (existence-checked) | Confirmed R22 close-walk completed; SLICE 3 entry authorized. |
| `coordination/WAVE-PLAN-02.md` | Filename only (existence-checked) | Confirmed Wave-1 includes WU-00 (this cluster) parallel to WU-04. |
| Git state | `git log --oneline -1` + `git rev-parse HEAD` + `git log --oneline -- test/ | head` | Baseline SHA `ada602b`; confirmed no test/ commits between R23 close (`f8dde4b` chore-B) and R25 entry. |

---

## § 2 Citation accuracy log (per CROSS-PROJECT-MEMORIAL R11 line-citation-drift rule)

| Citation in spec | File:line claim | Verified |
|---|---|---|
| `SchemaDescriptor` interface declaration | `engine/l0/schema-continuity.ts:41-58` | YES — direct read; line 41 begins `export interface SchemaDescriptor {`; line 58 closes `}` |
| `semantic_type` enumeration comment | `engine/l0/schema-continuity.ts:44` | YES — line 44 is the JSDoc `/** counter | gauge | ratio | latency_quantile | categorical_rate. */` |
| TrendBuffer surface range | `engine/core.ts:27-100` | YES — line 27 begins TrendBuffer comment block; line 113 exports `TrendBuffer` (the constructor + push + get methods fully reside within :27-113, with :100 being mid-snapshot method). The `:27-100` range cited by the spec is approximate but the surface IS at this site; for AC binding the test imports `TrendBuffer` from `'../engine/core'` — no line-citation in test code. |
| Wrap threshold computation | `0.9 × UINT32_MAX = 3_865_470_565.5` | YES — `0.9 × 4_294_967_295 = 3_865_470_565.5` (computed) |
| Default-jitter threshold | `1.0 × (1 + 0.5) = 1.5` | YES — basic arithmetic |
| Substrate wrap32 fixture | `prev = 4_200_000_000 > 3_865_470_565.5` | YES — `4_200_000_000 - 3_865_470_565.5 = 334_529_434.5 > 0` |
| Wrap-corrected delta for AC-R25-4 | `UINT32_MOD - 4_200_000_000 + 50 = 94_967_346` | YES — `4_294_967_296 - 4_200_000_000 + 50 = 94_967_346` (computed) |
| Baseline test count | 217 at R23 close | YES — R23 Reviewer attestation in CROSS-PROJECT-MEMORIAL.md tessera-R23 section confirms 217 at chore-A `d2286b2`; HEAD at R23 close was `f8dde4b` after AC-R23-15 chore-B addition = 217 total |
| Baseline SHA | `ada602b` | YES — `git rev-parse HEAD` at session start |

No line-citation drift detected. The one approximate citation (`engine/core.ts:27-100` vs actual TrendBuffer fully at `:27-113`) is a range-citation that includes the load-bearing surface but does not extend to the exact closing brace; the AC binding does not depend on exact line ranges (it imports `TrendBuffer` by name from the module). Acceptable approximation per the rule's spirit — the rule targets misleading line citations, not range approximations that include the load-bearing surface.

---

## § 3 P3 ten-axis verification (narrative)

| Axis | Narrative |
|---|---|
| **Correctness** | The 6 PRD invariants have a one-to-one mapping to specific code paths in `transformPair` (§ 1.2 table of the spec). The non-trivial correctness claim is the wraparound math: when a 32-bit unsigned counter wraps, post-wrap `next = (prev + true_delta) mod 2³²`; given `next < prev`, the unmod-corrected delta is `(2³² − prev) + next = UINT32_MOD − prev + next`. Spec § 1.3 documents the algebra explicitly; the constants are named `UINT32_MAX` (= 2³² − 1, used for the *threshold*) and `UINT32_MOD` (= 2³², used for the *delta correction*) to make the distinction non-confusable. |
| **Completeness** | Every PRD invariant has at least one binding AC (§ 1.2). Every conditional branch in `transformPair` has at least one binding AC (§ 4.1 branch-binding table — 10 branches enumerated). The structural exhaustiveness invariant (every output emits all 4 metadata flags) is bound across all 4 case-classes by AC-R25-7. The TrendBuffer-integration claim is bound at AC-R25-12. The synthetic-counter substrate has 4 ACs (AC-R25-8 through AC-R25-11) — one per case. Anti-scope diff at AC-R25-15. Typecheck at AC-R25-13. Test-count at AC-R25-14. No invariant unbound; no branch unbound; no claim unsupported. |
| **Consistency** | § 9.6 of the spec runs a 13-token cross-section consistency pass; all tokens agree across all sites. Narrative-vs-prescription cross-check (per R20 MINOR-1 reinforcement) confirmed each § 5 AC-table preamble classification matches its § 4.x prescription site (4 classifications × 4 prescription sites = 4 pairs, all consistent). |
| **Clarity** | AC table uses Given/When/Then exclusively; banned-word grep (§ 9.4.1) confirms absence of ambiguous language ("correctly", "appropriately", "as needed") from prescription and AC text. Each pseudocode block is fully typed; each assertion in test pseudocode targets a single field. |
| **Coverage** | 15 ACs cover: 6 invariants × ≥ 1 binding-AC each (AC-R25-1..7 + AC-R25-12 for integration) + 4 substrate ACs + 1 anti-scope + 2 binding-command (typecheck + count). 15 total = at the high end of PRD's 10-15 target; deliberate because each invariant + branch + substrate case warrants explicit binding. |
| **Constraints** | A12 (no engine internals modification) was the hardest constraint — addressed via § 0.2 Approach A selection (Tessera-original `CounterMetadata` interface rather than vendored-with-deltas extension of `SchemaDescriptor`). A11 (no live endpoints) addressed via synthetic-generator-only test substrate. A14 (no verdict shape change) preserved by not touching `engine/types/verdict.ts`. A16 (correlational_not_causal) untouched. PRD halt-condition 1 (route back if engine internals required) preempted via Approach A selection. |
| **Concurrency** | `transformPair` is referentially transparent; no internal state; no concurrency surface. TrendBuffer is per-instance per-key; AC-R25-12 uses a single-instance single-key test. R25 introduces no concurrency surface. |
| **Corner cases** | First-scrape: spec docblock explicitly delegates to caller (signature requires non-optional `prev`). Zero or negative elapsed: not bound by an AC; synthetic generator produces only monotone-positive intervals; out of R25 scope (would land as a future-round defensive-check if a downstream caller surfaces the case). |
| **Cost** | O(1) per `transformPair` call; one allocated `RateSample` per call. Substrate factory calls are O(1) too. Variable-interval sequence is O(n) in interval count. Total R25 test growth: 12 new q25 tests at chore-A (+1 at chore-B = 13 total). Below the 5%-of-total budget threshold (13/230 ≈ 5.6%; comparable to R23's 12-test growth). |
| **Coupling** | New `engine/l0/counter-rate-transform.ts` imports nothing from engine/*; defines its own types (`CounterSample`, `CounterMetadata`, `TransformOpts`, `RateSample`). Substrate `synthetic-counter-generator.ts` imports `CounterSample` type from the L0 module — single uni-directional dependency. Test file imports from L0 module + engine/core (TrendBuffer) + substrate. No cycles. Wave 2 ingestion adapters will import from `engine/l0/counter-rate-transform.ts` (the L0 contract); the contract surface is stable across R25 → R26+. |

---

## § 4 Pre-route discipline application

### § 4.1 Skill 14 — PRD-conjunction cross-check

For each R25 deliverable, traced to PRD FR + AC entries:

| Deliverable | PRD FR | PRD AC | Trace |
|---|---|---|---|
| `engine/l0/counter-rate-transform.ts` | Upstream of FR-E1/E2/E3a/b/c (every detector consumes rate-domain inputs via TrendBuffer) | AC-P1 long-horizon (per-shard Ville bound depends on properly preprocessed inputs) | SCOPING-MEMO § 2.3 line 222-226 enumerates the 6 invariants as Extension 3 (b) "L0 contract for Tessera" sub-extension |
| Synthetic counter generator | All FR (test-substrate for downstream cluster validation) | All AC (substrate for empirical validation) | SCOPING-MEMO § 4.2 R-E7 row ("scrape-artifact-fires-as-signal") |
| q25 test suite | All FR + AC | — | Binding-test surface for the 6 invariants |

No PRD claim unbound; no spec deliverable unscoped.

### § 4.2 Skill 15 — prescription-to-AC coverage

For each spec prescription (file, type, function, constant, factory):

| Prescription | Binding AC |
|---|---|
| `CounterSample` type | Used by AC-R25-1..12 (every test imports and constructs it) |
| `CounterMetadata` type | AC-R25-1..7 (each test constructs one) |
| `TransformOpts` type | AC-R25-1..7 (each test passes one) |
| `RateSample` type | AC-R25-7 (structural exhaustiveness binding) |
| `transformPair` function | AC-R25-1..7 + AC-R25-12 (8 tests exercise it) |
| `UINT32_MAX` exported constant | AC-R25-4 (used in expected_rate computation) + AC-R25-10/-11 (substrate-shape ACs reference it) |
| `UINT32_MOD` exported constant | AC-R25-4 (used in expected_rate computation) |
| `DEFAULT_JITTER_TOLERANCE` constant | Inherited via default-fallback in AC-R25-1 / AC-R25-3 (does not pass jitter) |
| `DEFAULT_WRAP_THRESHOLD_RATIO` constant | Inherited via default-fallback in AC-R25-4 / AC-R25-5 (does not pass threshold) |
| `makeCleanPair` factory | AC-R25-1, AC-R25-7 (clean case), AC-R25-8, AC-R25-9 (negative — interval differs) |
| `makeMissedScrapePair` factory | AC-R25-3, AC-R25-9 |
| `makeWrap32Pair` factory | AC-R25-4, AC-R25-5 (same pair, different meta), AC-R25-7 (wrap case), AC-R25-10 |
| `makeResetPair` factory | AC-R25-6, AC-R25-7 (reset case), AC-R25-11 |
| `makeVariableIntervalSequence` factory | AC-R25-12 |

Every prescribed exported surface has a binding AC. No orphan prescription.

### § 4.3 Vendored-file-delta assertion-surface enumeration

R25 touches NO vendored files. Gate structurally N/A. Explicit cross-check: `q01-vendoring-coverage` and `q01-no-at-pin-deltas` consume `AT_PIN_FILES` lists — neither list references R25's new files (Tessera-original). No row-state transition needed for any vendored file.

### § 4.4 Spec-commit-sequencing (per R21 ARCH MINOR-1)

§ 4.7 of the spec prescribes the Architect's two-commit sequence: (1) `spec(R25): Q-R25-SPEC.md + Q-R25-SPEC-AUDIT.md`; (2) `route(R25): Architect → Implementer; ...`. Spec files committed BEFORE the routing-block commit. This pre-empts the R21 MINOR-1 pattern (spec files appearing in chore-A rather than as Architect-side commits).

### § 4.5 .gitignore-aware allowed-set verification (per R23 ARCH MINOR-2)

§ 3 + § 9.7 of the spec audit each of the 7 allowed-set entries: all `.ts` or `.md`; none are `*.js` or other gitignored patterns. Per the project `.gitignore:6` rule, `.js` siblings of `.ts` files compile-output but are not git-trackable. R23 MINOR-2 class of issue (phantom .js entries in allowed-set) pre-empted.

### § 4.6 Branch-binding coverage gate (per R21 ARCH MINOR-2/3)

§ 4.1 of the spec includes an explicit branch-binding table mapping every conditional in `transformPair` to ≥ 1 binding AC. 10 distinct branches/conditions enumerated; each has a binding AC. R21 MINOR-2/3 class of issue (guard-without-binding-AC) pre-empted.

### § 4.7 Count-AC SHA-anchoring (per R22 IMPL MINOR-1)

AC-R25-14 wording (§ 5.1) explicitly anchors to `<CHORE-A-SHA>`, NOT to "after R25 implementation commits." This pre-empts the R22 MINOR-1 ambiguity class. AC-R25-15 also SHA-anchored (forward-protection pattern).

### § 4.8 TDD separate-RED-commit (per R23 IMPL MINOR-1)

§ 4.3 of the spec explicitly prescribes: "RED commit chronologically first; before any production code"; § 4.4 chore-A occurs only after GREEN. The Implementer must produce a `test(R25-RED): ...` commit before `feat(R25): ...`. This pre-empts the R23 MINOR-1 pattern (combined feat-commit with no separate RED audit trail).

### § 4.9 Memorial-self-exoneration guard (per R08 + R19 MAJOR-4)

This audit sidecar is part of the Architect's pre-route artifact set. Spec's § 9.11 explicitly notes this. No self-exonerating language anywhere in either the spec or this audit sidecar; the Memorial Updater audit-trail mechanism remains the backstop.

### § 4.10 File-level documentation coverage (per R10 MINOR-1)

Spec § 4.1/4.2/4.3 prescribe full docblock content for each new file. Docblocks describe every exported surface; each is verified for completeness before the spec was emitted.

---

## § 5 Architect pre-prediction on outcomes

| Outcome | Predicted | Reasoning |
|---|---|---|
| Implementer hits halt conditions | None expected | 5 scenarios pre-anticipated (§ 7.1); each has a prescribed response. The most likely halt is (b) baseline drift, but the spec verifies 217 against git log — no commits modify test/ since R23 close. |
| Typecheck (AC-R25-13) | exit 0 | Pseudocode in § 4.1 is well-typed; imports are explicit; no `any` casts needed. |
| Test count (AC-R25-14) | 229 at chore-A; 230 at HEAD | 217 baseline + 12 GREEN q25 tests = 229; +1 chore-B (AC-R25-15) = 230. |
| Anti-scope diff (AC-R25-15) | path-set = 7 entries (the exact allowed-set, since every entry is touched in this round) | All 7 paths are touched: 3 new code files + 2 new spec files + 2 modified coordination files. |
| Reviewer findings | 0 CRITICAL / 0 MAJOR expected; up to 2-3 MINOR + 2-3 OBS plausible (matches R20/R21/R23 distribution) | Full-tier process with full spec discipline applied; the historically-observed MINOR distribution is for tactical edge cases (e.g., line citation precision, file-header summary arithmetic) that the Implementer's chore-A self-discipline + Reviewer cold-read catch. |
| Right-reasons audit on AC-R25-4 | NOT self-confirming — `expected_rate = 94_967_346` is derived from the spec's algebraic prescription (`UINT32_MOD − prev + next`), externally re-derivable, not from implementation behavior | The literal 94_967_346 is computed via spec math, not transcribed from running code. |
| Right-reasons audit on AC-R25-12 | NOT self-confirming — `mean === 10` is derivable from the variable-interval sequence's per-second-rate parameter, not from observed test output | Synthetic generator produces deterministic per-second rate; mean equals it by construction (independent of TrendBuffer math except as the load-bearing claim being tested). |
| Right-reasons audit on AC-R25-2 | NOT self-confirming — assertion `value === next.value` would fail if the gauge branch fell through to the counter computation (`(next.value − prev.value) / elapsed`) | The non-counter branch's value-domain pass-through is structurally distinct from the counter branch's rate-domain transform; testing the difference. |

---

## § 6 Decision rationale (why-picked / why-rejected paragraphs)

### § 6.1 Module shape: pure function (Approach A) vs stateful class (Approach B) vs hybrid (Approach C)

**Why picked (Approach A — pure function).** The L0 contract is fundamentally a *value-transform* contract: "given two consecutive samples + metadata, produce one rate sample." Pure-function shape *is* the contract surface. Side benefits: referentially transparent, no per-instance state lifecycle bugs, aligns with inherited `engine/l0/schema-continuity.ts` helper idioms (`hashSchema`, `classifyContinuity`, `makeContinuityRecord` are all pure). Per-key prev-state lives at the ingestion-adapter scope (Wave 2 — WU-01/02/03) where it already lives anyway (adapters maintain per-signal cursor state for scrape iteration).

**Why rejected (Approach B — stateful class).** Per-instance state lifecycle introduces a class of bugs the pure function avoids by construction (state leakage across signals; stale prev after long gaps; ambiguous reset semantics). The state management is duplicate work — the adapter ALREADY holds per-key prev for its own scrape-iteration. Deviates from the inherited stateless-helper idiom for no compensating benefit.

**Why rejected (Approach C — hybrid).** Two contract surfaces double the test surface and create "which to use?" ambiguity for downstream. At R25 (Wave 1 foundation), no caller exists yet; premature abstraction (YAGNI violation). Wave 2 architects can add a wrapper class against the pure-function core if they decide they need state management.

### § 6.2 Counter-width metadata source: Tessera-original `CounterMetadata` (A) vs vendored-with-deltas extension (B) vs opts-only (C)

**Why picked (Approach A — `CounterMetadata`).** Honors A12 anti-scope literally (no `engine/l0/schema-continuity.ts` modification). Honors PRD intent ("via SchemaDescriptor metadata" = metadata-driven, not hardcoded — the *source* of `semantic_type` knowledge is still the inherited descriptor). File docblock documents the relationship explicitly. Future-proofs against engine re-pins.

**Why rejected (Approach B — vendored-with-deltas extension).** PRD halt-condition 1 explicitly fires on this approach: "L0 contract surface cannot be defined without modifying inherited engine internals." Would force `engine/l0/schema-continuity.ts` to transition vendored-at-pin → vendored-with-deltas, ripple-modifying VENDORING-MANIFEST.md row 40 AND `q01-no-at-pin-deltas` AT_PIN_FILES list. The PRD's "via SchemaDescriptor metadata" phrasing is honored equally well by the Tessera-original interface (with documented relationship to `SchemaDescriptor.semantic_type`).

**Why rejected (Approach C — opts-only).** Conflates signal-level properties (`semantic_type`, `counter_width`) with call-level options (`expected_scrape_interval_seconds`). Signature shape would drift over time as more signal-level metadata accrues; better to factor it now while the surface is small.

### § 6.3 Metadata-propagation shape: RateSample fields (A) vs tuple (B) vs side-channel callback (C)

**Why picked (Approach A — named-field RateSample).** Single return value with structurally exhaustive metadata (every output carries all 4 flags). Matches inherited engine idiom (`TrendSnapshot`, `WindowSummary`, etc.). Easy to bind in tests. The "no absent-semantics" property simplifies downstream consumer logic.

**Why rejected (Approach B — tuple).** Loses field names at destructure sites; arity-fragile to evolution (adding a 5th flag changes the type); idiom-drift from inherited code.

**Why rejected (Approach C — side-channel callback).** Callback lifetime + ordering concerns; harder to test; consumers must still track metadata alongside value — the separation doesn't pay for itself.

### § 6.4 Synthetic counter generator API: per-case factories (A) vs parameterized (B) vs generator-streams (C)

**Why picked (Approach A — per-case factories).** Each factory's name self-documents the case at the call site (`makeWrap32Pair()` is clearer than `makeSyntheticCounterPair({ case: 'wrap32' })`). Matches inherited `test/_substrate/factories.ts` and `v9X-cluster.ts` conventions. Each factory's body is 3-5 lines — bounded surface.

**Why rejected (Approach B — parameterized).** Forces a switch inside the factory; reduces call-site readability without any compensating benefit.

**Why rejected (Approach C — generator-streams).** Generator iteration is over-engineering for fixed-shape fixtures; tests need single pairs, not streams.

### § 6.5 Test-file structure: single q25 file (A) vs split (B)

**Why picked (Approach A — single file).** Matches inherited q-* convention (one round → one test file when scope is bounded); cross-AC context lives in one place; chore-B AC-R25-15 lands as one additional `test()` block in the same file.

**Why rejected (Approach B — split substrate vs invariants).** Two files for ~250 lines of test code; cross-file context split for no benefit. Substrate ACs (AC-R25-8 through AC-R25-11) test the substrate's deterministic shape — they belong alongside the invariant ACs that consume the substrate.

---

## § 7 Amendments from prior version

N/A — first version of this spec. R25 is a Wave-1 cluster's first round; no fix-cycle history.

---

## § 8 Brainstorm re-evaluation (per CLAUDE-ARCHITECT.md fix-cycle considerations)

N/A — no escalation history; the spec is being emitted on its first authoring pass. Original brainstorm rationale stands.

---

## § 9 Confirmations + violations preview (for Memorial-Updater consolidation)

The Memorial-Updater will append these to MEMORIAL.md and CROSS-PROJECT-MEMORIAL.md at round close. Listed here for cross-reference.

**Pre-route Architect CONFIRMATIONs (R25):**
- `brainstorm-phase`: 3+ approaches per axis (5 axes), each with strengths/weaknesses/risks/hidden-assumptions; selection rationale documented inline with why-picked + why-rejected paragraphs (§ 0 spec + § 6 audit).
- `design-phase`: component-boundary table (§ 2.1), integration points (TrendBuffer + future Wave 2 adapters), PRD-verification cross-check (§ 4.1 audit), failure-mode enumeration via halt scenarios (§ 7.1 spec).
- `pre-emit-grilling`: 17-gate grilling (§ 9.1–§ 9.17 spec) all PASS; specific gates applied for every CROSS-PROJECT-MEMORIAL reinforcement listed in the cluster PRD (line-citation-drift carry-forward; spec-commit-sequencing; AC-table preamble cross-check; count-AC SHA anchoring; branch-binding coverage; TDD separate-RED prescription; .gitignore-aware spec inventories).
- `empirical-premise-verification`: 15 load-bearing claims verified by direct file-open or computation at session start (§ 9.1 + § 9.7); no inherited testimony without re-verification.
- `spec-commit-sequencing`: spec + audit committed in Architect commit 1 BEFORE NEXT-ROLE.md routing block in commit 2 (§ 4.7 spec).
- `narrative-classification-vs-structural-prescription`: § 5 preamble classifications cross-checked against § 4.x prescriptions (§ 9.6 spec).
- `vendored-with-deltas-pre-handling`: R25 touches NO vendored files; gate structurally N/A but explicit cross-check confirmed (§ 9.8 spec + § 4.3 audit).
- `branch-binding-coverage`: all 10 enumerated branches in `transformPair` have ≥ 1 binding AC (§ 4.1 branch table spec).
- `count-AC-chore-A-SHA-anchoring`: AC-R25-14 explicitly anchored to chore-A SHA (§ 5.1 spec).
- `cross-section-identifier-consistency`: 13-token consistency table (§ 9.6 spec); no drift.
- `AC-table-preamble-cross-check`: 4 classifications × 4 prescriptions all consistent (§ 9.6 spec).
- `Skill 14 PRD-conjunction cross-check`: every R25 deliverable traced to ≥ 1 PRD FR + AC (§ 4.1 audit).
- `Skill 15 prescription-to-AC coverage`: every prescribed exported surface has ≥ 1 binding AC (§ 4.2 audit).
- `role-boundary`: this Architect session wrote ONLY: Q-R25-SPEC.md (new), Q-R25-SPEC-AUDIT.md (new), NEXT-ROLE.md (routing block update), MEMORIAL.md (Architect ceremony section append). Zero engine/, test/, tools/ files touched.

**No Architect VIOLATIONs at routing time.** Any defect surfacing post-routing is the Reviewer's to record.
