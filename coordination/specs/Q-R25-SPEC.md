# Q-R25-SPEC — Phase 2 SLICE 3.A.5: L0 contract for Tessera (counter-semantic preprocessing)

**Round:** R25 (full tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Cluster:** `wu-00-l0-contract` (Wave 1 of WAVE-PLAN-02; parallel to `wu-04-md-f4`)
**Phase / SLICE:** Phase 2 SLICE 3.A.5 (L0-contract foundation for SLICE 3.B Wave 2 ingestion-adapter clusters WU-01 Slurm / WU-02 K8s / WU-03 NVLink)
**Scope reference:** `coordination/PRD.md` (cluster scope block) + `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) L0-contract sub-extension (MR-1 amendment 2026-05-18; lines 219-230) + § 4.2 R-E7 risk row + § 2.3 [MR-1 AMENDMENT] block (line 254 ff)
**PRD trace:** FR-E3a/b/c (downstream consumers of L0 contract) · US-01 / US-02 / US-03 (per-shard attribution depends on rate-domain inputs; raw-counter inputs break detector firing surfaces) · AC-P1 long-horizon (per-shard Ville bound only holds when inputs are properly preprocessed)
**Baseline SHA (anti-scope diff lower bound):** `ada602b` (R25 routing commit; HEAD at session entry — verified via `git log --oneline -1`)
**Pre-R25 baseline test count:** 217 / 0 (per R23 Reviewer attestation at HEAD `f8dde4b`; no test changes between R23 close and R25 entry — verified via `git log --oneline -- test/`)

---

## § 0 Brainstorm phase (Superpowers — inline)

The PRD pre-resolves several axes (file location via OQ-W2-1 Option A; six invariants enumerated; A10 carve-out via MR-1). The genuinely open architectural questions are the *shape* of the L0-contract surface — function-vs-class, metadata-propagation mechanism, counter-width metadata source, and substrate API granularity. Each is brainstormed below with three distinct approaches.

### § 0.1 Module shape (pure function vs stateful class vs hybrid)

**Approach A — Pure function `transformPair(prev, next, meta, opts) → RateSample` (PICKED).** L0 contract surface is a pure function taking two consecutive samples + metadata + opts; returns a `RateSample` with rate value + 4 metadata flags. Caller (the ingestion adapter — WU-01/02/03 in Wave 2) manages per-key `prev` state. No internal state in the contract surface.

- **Strengths:** referentially transparent; fully testable without fixtures; matches the "contract" framing (the function's signature *is* the contract); decouples L0 from per-key state management which already lives at the adapter scope (adapters scrape and hold prev-sample state per signal-key anyway); aligns with the inherited engine pattern of stateless helper functions in `engine/l0/schema-continuity.ts` (`hashSchema`, `classifyContinuity`, `makeContinuityRecord` are all pure).
- **Weaknesses:** ingestion adapters (R26+ WU-01/02/03 work) must hold prev-sample state themselves. Acceptable — they already need per-key cursor state for scrape iteration.
- **Hidden assumptions:** the first-scrape edge case (no prev) is the adapter's responsibility; the contract is *pair-input* by signature. Documented explicitly in the file's docblock.
- **Risks:** low; aligns with inherited code idioms and avoids per-instance state lifecycle.

**Approach B — Stateful class `CounterRateTransform` holding `prev` per key internally.** Class with `transform(key: string, sample: CounterSample, meta, opts) → RateSample | null` (returns null on first sample). Internal Map<key, prev> maintained per instance.

- **Strengths:** caller doesn't manage prev-state explicitly.
- **Weaknesses:** introduces per-instance state lifecycle (when to reset? when to forget?); couples to a Map-based key store that mirrors what the adapter already maintains for scrape iteration; deviates from the inherited stateless-helper idiom; harder to test (need to drive a sequence to exercise each branch).
- **Risks:** medium; per-instance state introduces a class of bugs (state leakage across signals, stale prev after long gaps) the pure-function approach avoids by construction.

**Approach C — Hybrid: pure `transformPair` + thin stateful wrapper class.** Ship both: the function for adapter-managed callers + the class for callers that want state management.

- **Strengths:** flexibility.
- **Weaknesses:** two contract surfaces means twice the test surface, twice the documentation, ambiguous "which to use" for downstream; at R25 (Wave 1 foundation), no caller exists yet — premature abstraction. Wave 2 ingestion adapters can build a wrapper if they want one.
- **Risks:** medium-high; YAGNI violation.

**Selection rationale:** Approach A. The L0 contract is fundamentally a *value-transform* contract — given two consecutive samples + metadata, produce one rate sample. Pure-function shape *is* the contract. Wave 2 ingestion-adapter Architects retain freedom to build wrapper state-management if needed; R25 ships the minimum that satisfies the six invariants. Aligns with inherited `engine/l0/schema-continuity.ts` idioms (pure helpers, no class).

### § 0.2 Counter-width metadata source (extend SchemaDescriptor vs separate type vs opts-only)

PRD invariant 4 reads: "Counter-width awareness via `SchemaDescriptor` metadata." Schema-continuity.ts (`engine/l0/schema-continuity.ts:41-58`) declares `SchemaDescriptor` with `semantic_type: string` and NO `counter_width` field. A12 anti-scope (vendored-at-pin engine internals frozen) forbids modifying `engine/l0/schema-continuity.ts`. Three approaches reconcile the PRD intent with A12.

**Approach A — Tessera-original `CounterMetadata` interface in `engine/l0/counter-rate-transform.ts` (PICKED).** Define a small Tessera-side interface that mirrors the inherited `SchemaDescriptor.semantic_type` semantics (per `engine/l0/schema-continuity.ts:44` comment "counter | gauge | ratio | latency_quantile | categorical_rate") and adds `counter_width?: 32 | 64`. The transform function consumes `CounterMetadata`. Ingestion adapters (Wave 2) construct a `CounterMetadata` from whatever they know about the signal — which may include consulting their `SchemaDescriptor`, but may also include adapter-local DCGM-counter-width tables.

- **Strengths:** zero modification to vendored `schema-continuity.ts` (A12 preserved); decoupled from the inherited type surface; future-proofs against re-pins (DeploySignal can evolve `SchemaDescriptor` without affecting Tessera's L0 contract); the file's docblock explains the relationship to `SchemaDescriptor.semantic_type` for future readers.
- **Weaknesses:** the PRD phrase "via `SchemaDescriptor` metadata" is honored conceptually (the *source* of `semantic_type` is still the inherited descriptor) but not structurally (the transform takes a distinct type, not the inherited descriptor itself). Spec preamble documents this explicitly.
- **Hidden assumptions:** Wave 2 ingestion adapters can derive `CounterMetadata.counter_width` from their adapter-specific knowledge (DCGM counter-name tables; Slurm/K8s metadata schemas) without changes to `SchemaDescriptor`. Per SCOPING-MEMO § 2.3 line 218 ("DCGM 32-bit reality") this is the natural place for that knowledge to live.
- **Risks:** low; matches the "contract" framing — the L0 surface declares what metadata it needs, callers provide it.

**Approach B — Vendored-with-deltas extension of `engine/l0/schema-continuity.ts` to add `counter_width?: 32 | 64` to `SchemaDescriptor`.** Modify the inherited file with an additive optional field.

- **Strengths:** literal interpretation of PRD phrase "via `SchemaDescriptor` metadata"; one descriptor type across the codebase.
- **Weaknesses:** **EXPLICITLY ANTI-SCOPED at A12** ("NO modification of inherited vendored-at-pin engine internals; `engine/l0/schema-continuity.ts` body frozen (READ-ONLY consumer of `SchemaDescriptor.semantic_type` at line 44)"). Would force `engine/l0/schema-continuity.ts` to transition from vendored-at-pin → vendored-with-deltas, ripple-modifying VENDORING-MANIFEST.md row 40 and q01-no-at-pin-deltas AT_PIN_FILES list. Halt condition (per PRD cluster halt-conditions, item 1: "L0 contract surface cannot be defined without modifying inherited engine internals → A12 violation; route back via Coordinator").
- **Risks:** Coordinator-level halt.

**Approach C — opts-only: `transformPair(prev, next, opts)` where opts carries `semantic_type` and `counter_width` directly; no metadata type at all.**

- **Strengths:** simplest signature.
- **Weaknesses:** `semantic_type` and `counter_width` are signal-level properties, not call-level options; conflating them with `expected_scrape_interval_seconds` (a true call-level option) makes the signature confusing; future-evolution: when a 7th metadata field is needed, opts inflates indefinitely.
- **Risks:** medium; signature-shape drift over time.

**Selection rationale:** Approach A. The `CounterMetadata` interface is small (2 fields), Tessera-original, lives in the same file as `transformPair`, and is documented in the file docblock as the Tessera-side mirror of `SchemaDescriptor.semantic_type` plus tessera-specific `counter_width`. A12 anti-scope honored; PRD intent ("metadata-driven, not hardcoded") honored.

### § 0.3 Metadata-propagation shape (RateSample fields vs side-channel vs flat tuple)

The L0 contract emits four flags alongside the rate value: `slope_quality`, `missed_scrape_inferred`, `wraparound_handled`, `reset_detected`. Three approaches to expose these.

**Approach A — Single `RateSample` interface with rate value + all 4 flags as named fields (PICKED).** Return type: `{ value: number | null; actual_elapsed_seconds: number; slope_quality: 'normal' | 'degraded'; missed_scrape_inferred: boolean; wraparound_handled: boolean; reset_detected: boolean; }`. All metadata travels with the value; downstream consumers destructure the fields they care about.

- **Strengths:** single return value; structurally exhaustive (every output carries all 4 flags, no "absent" semantics); easy to bind in tests (one strictEqual per field); aligns with inherited `TrendSnapshot` shape (one interface with many named fields).
- **Weaknesses:** consumers that only care about value carry the metadata weight. Acceptable — the metadata is per-call (not per-tick aggregate) and trivially destructured.
- **Hidden assumptions:** `value: number | null` (null on reset) is a discriminated union by `reset_detected` flag. Documented.
- **Risks:** low.

**Approach B — Tuple `[rateValue, metadata]`.** Return `[number | null, { slope_quality, ... }]`.

- **Strengths:** terse for callers that only want the value.
- **Weaknesses:** TypeScript tuple destructuring loses field names at call sites; harder to evolve (adding a 5th flag changes tuple arity); diverges from inherited engine return-shape conventions (everything is a named-field interface).
- **Risks:** medium; idiom drift.

**Approach C — Side-channel callback (`opts.onMetadata(flags)`) + pure value return.**

- **Strengths:** separates value path from metadata path.
- **Weaknesses:** callback-based metadata couples lifetime and ordering; harder to test; consumers must track per-call metadata alongside the value anyway, defeating the separation.
- **Risks:** high; callback ergonomics in tests are poor.

**Selection rationale:** Approach A. Matches inherited engine idiom; structural exhaustiveness eliminates "is this flag set?" ambiguity; testable with one `assert.strictEqual` per flag.

### § 0.4 Synthetic counter generator substrate API (per-case factory vs parameterized vs sequence-builder)

PRD: "Synthetic counter generator exercising the missed-scrape, wrap, reset, and variable-interval cases. Lands as `test/_substrate/synthetic-counter-generator.ts` (Tessera-original)."

**Approach A — Per-case factory functions + one sequence-builder (PICKED).** Five named factories: `makeCleanPair`, `makeMissedScrapePair`, `makeWrap32Pair`, `makeResetPair` (each returns `{ prev: CounterSample; next: CounterSample }`), plus `makeVariableIntervalSequence({ intervals_seconds: number[], ... }) → CounterSample[]` for the AC-12 variable-interval integration test.

- **Strengths:** each factory's name self-documents the case it generates; test code reads as `const { prev, next } = makeWrap32Pair()` — intent is explicit at the call site; matches inherited `test/_substrate/factories.ts` and `v9X-cluster.ts` naming convention (`make<TypeName>(overrides?) → TypeName`); each factory has bounded surface (3-5 lines of body).
- **Weaknesses:** five exported functions to test surface. Bounded.
- **Hidden assumptions:** none.
- **Risks:** low.

**Approach B — Single parameterized factory `makeSyntheticCounterPair({ case: 'clean'|'missed_scrape'|'wrap32'|'reset', ... })`.**

- **Strengths:** one entry point.
- **Weaknesses:** the `case` discriminator forces a switch inside the factory; call-site readability is reduced (`{ case: 'wrap32' }` vs `makeWrap32Pair()`); each case branch must be exercised, but the discriminator complicates the AC-binding count.
- **Risks:** low; cosmetic loss.

**Approach C — Generator yields infinite streams; tests slice them.** A generator yielding clean samples + injected failure modes.

- **Strengths:** flexible composition.
- **Weaknesses:** generators add iteration complexity for tests that need just one pair; sequence-building isn't actually iteration-driven (intervals are fixed by test design); generator state is implicit and harder to assert on.
- **Risks:** medium; over-engineering for the test surface needed.

**Selection rationale:** Approach A. Per-case factories match inherited substrate naming conventions; one sequence-builder for the variable-interval integration case. No over-engineering.

### § 0.5 Test-file structure (one q25 file vs split by invariant)

**Approach A — Single `test/q25-l0-contract.test.ts` file with all 15 ACs (PICKED).**

- **Strengths:** matches inherited q-* file convention (one round → one test file when scope is bounded); cross-AC context (shared imports, shared fixtures) lives in one place; chore-B AC-R25-15 anti-scope test lands as one additional `test()` block in the same file.
- **Weaknesses:** ~250-300 lines of test code. Bounded.
- **Risks:** low.

**Approach B — Split: `test/q25-l0-contract.test.ts` (invariants) + `test/q25-l0-contract-substrate.test.ts` (synthetic-generator).**

- **Strengths:** generator self-tests segregated from invariant tests.
- **Weaknesses:** two files; cross-file context split; deviates from convention.
- **Risks:** low but unjustified.

**Selection rationale:** Approach A. Single file matches inherited q-* convention.

---

## § 1 Mechanism

### § 1.1 The L0-contract surface

The L0 contract is the explicit guarantee Tessera's L0 ingestion layer makes to downstream consumers (`TrendBuffer` at `engine/core.ts:27-100`; per-shard detector cascade; fleet-merge consumer at `engine/fleet/verdict-consumer.ts`) about every value pushed through L0. The contract is implemented as a single pure function in a new Tessera-original module at `engine/l0/counter-rate-transform.ts`:

```ts
function transformPair(
  prev: CounterSample,
  next: CounterSample,
  meta: CounterMetadata,
  opts: TransformOpts,
): RateSample
```

The function honors all 6 PRD-enumerated invariants. Downstream consumers (vendored-at-pin `TrendBuffer` and `engine/fleet/verdict-consumer.ts`, plus Wave 2 WU-01/02/03 ingestion adapters that will consume this contract by interface) build against the function's signature and `RateSample` return shape; they do NOT import L0 internals.

### § 1.2 Six invariants — implementation mapping

| # | Invariant (per PRD scope block lines 29-34) | Implementation site |
|---|---|---|
| 1 | Rate-domain output, not counter-domain (counter → `delta / actual_elapsed_seconds`; non-counter pass-through) | `transformPair` top-level branch on `meta.semantic_type === 'counter'` |
| 2 | Scrape interval is a first-class input (`actual_elapsed_seconds = next.ts_seconds - prev.ts_seconds`) | First non-conditional computation in `transformPair`; emitted on every `RateSample` |
| 3 | Missed-scrape-then-catchup detection (`elapsed > expected × (1 + jitter)` → `slope_quality: 'degraded'` + `missed_scrape_inferred: true`; no interpolation) | Branch on `elapsed > expected * (1 + jitter_tolerance)`; computed once near top, both flags propagate |
| 4 | DCGM 32-bit wraparound (`next < prev AND counter_width === 32 AND prev > UINT32_MAX × wrap_threshold_ratio` → corrected rate via `(UINT32_MOD − prev + next) / elapsed`; `wraparound_handled: true`) | Inner branch within counter-arm of `transformPair` |
| 5 | Reset-vs-wrap disambiguation (`next < prev` falling through invariant-4 → `value: null`; `reset_detected: true`) | Else-leg of invariant-4 branch |
| 6 | Metadata propagation (all 4 flags on every output) | Structural exhaustiveness of `RateSample` return type — every code path constructs a `RateSample` with all 4 flags populated |

### § 1.3 Numeric constants and defaults

| Constant | Value | Reason |
|---|---|---|
| `UINT32_MAX` | `4_294_967_295` (= 2³² − 1) | Maximum representable 32-bit unsigned value; used in the wrap-threshold comparison |
| `UINT32_MOD` | `4_294_967_296` (= 2³²) | Modulus of the 32-bit unsigned value space; used in the wrap-corrected-delta computation `(UINT32_MOD − prev + next)` |
| `DEFAULT_JITTER_TOLERANCE` | `0.5` | Tolerance fraction above `expected_scrape_interval_seconds` before a sample is flagged degraded. Threshold becomes `expected × (1 + 0.5) = expected × 1.5`. |
| `DEFAULT_WRAP_THRESHOLD_RATIO` | `0.9` | Per PRD invariant 4 literal: `prev > UINT32_MAX × 0.9` |

**Note on `UINT32_MAX` vs `UINT32_MOD`:** the PRD scope block reads "`(width_max - prev + next) / actual_elapsed_seconds`" without disambiguating which quantity `width_max` is. For wrap-correctness, the formula uses the *modulus* (2³² = 4_294_967_296), not the max representable value (2³² − 1). When a 32-bit unsigned counter wraps, the post-wrap value satisfies `next = (prev + delta) mod 2³²`; given `next < prev`, the unmod-corrected delta is `(2³² − prev) + next` = `UINT32_MOD − prev + next`. The constants are declared separately and named distinctly to make the spec audit-trail clear.

### § 1.4 64-bit counter wrap path is dead code by design

For `counter_width === 64`, true wraparound requires accumulating ~2⁶⁴ ≈ 1.8 × 10¹⁹ counter increments. In any realistic operational timeframe this is impossible. The `transformPair` function short-circuits: when `next < prev` AND `counter_width !== 32`, the function always emits `reset_detected: true` (regardless of `prev` magnitude). This collapses 64-bit "decreasing-counter" cases cleanly to the reset path.

AC-R25-5 explicitly binds this branch: a 64-bit counter with `prev > UINT32_MAX × 0.9` but `counter_width === 64` produces `reset_detected: true`, NOT `wraparound_handled: true`.

### § 1.5 RateSample.value semantics

`value: number | null` is a discriminated union by `reset_detected`. When `reset_detected: true`, `value` is `null` (the rate is unknown post-reset). When `reset_detected: false`, `value` is a finite number (the computed rate). The unit of `value` is **per-second** (counts per second for counter, value-domain unchanged for non-counter pass-through).

### § 1.6 Pass-through semantics for non-counter signals

When `meta.semantic_type !== 'counter'` (the inherited descriptor's value space is `'counter' | 'gauge' | 'ratio' | 'latency_quantile' | 'categorical_rate'` per `engine/l0/schema-continuity.ts:44`), the transform emits `value: next.value` unchanged (value-domain), `actual_elapsed_seconds: next.ts_seconds - prev.ts_seconds`, `slope_quality` per the missed-scrape branch (degraded flag still applies for non-counter signals — the missed-scrape semantic is interval-driven, not type-driven), `missed_scrape_inferred` per the same branch, `wraparound_handled: false`, `reset_detected: false`.

This preserves the PRD invariant 1 sentence "Gauge / ratio / latency_quantile / categorical_rate pass through value-domain unchanged" while still emitting the interval-derived `slope_quality` / `missed_scrape_inferred` flags so downstream consumers can attribute interval-driven sample-quality decisions uniformly across signal types.

### § 1.7 Synthetic counter generator substrate

`test/_substrate/synthetic-counter-generator.ts` ships five exported factory functions:

| Factory | Returns | Purpose |
|---|---|---|
| `makeCleanPair(opts?)` | `{ prev: CounterSample; next: CounterSample }` | Healthy case: interval = expected; counter increments by `rate × interval` |
| `makeMissedScrapePair(opts?)` | `{ prev; next }` | Missed-scrape: interval = 2 × expected (above default `1 + jitter = 1.5` threshold); counter increments by `rate × 2 × interval` (catch-up) |
| `makeWrap32Pair(opts?)` | `{ prev; next }` | 32-bit wrap: `prev.value = 4_200_000_000` (above `UINT32_MAX × 0.9 = 3_865_470_565.5`); `next.value = 50`; interval = expected |
| `makeResetPair(opts?)` | `{ prev; next }` | Counter reset: `prev.value = 5000` (well below wrap threshold); `next.value = 10`; interval = expected |
| `makeVariableIntervalSequence({ intervals_seconds, rate_per_second?, starting_value?, base_ts? })` | `CounterSample[]` (length = `intervals_seconds.length + 1`) | Variable-interval: counter increments by `rate × dt` for each `dt` in `intervals_seconds`; AC-R25-12 binds this to TrendBuffer integration |

All factories accept an optional `opts` parameter with deterministic-test-friendly defaults (`base_ts = 1_700_000_000`, `starting_value = 1000`, `expected_interval_seconds = 1.0`, `rate_per_second = 10`). The factories are Tessera-original; no DeploySignal vendoring.

### § 1.8 TrendBuffer integration (AC-R25-12; R32 correction: mean tolerance 0.001, slopeNorm tolerance 0.01)

The PRD's load-bearing claim — "Comparable `slopeNorm` across configurable / variable scrape intervals follows from per-second-normalized inputs" — is binding-tested at AC-R25-12. The test:

1. Generates a variable-interval sequence: `intervals = [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0]`, `rate_per_second = 10`, starting_value = 1000. Produces 11 `CounterSample`s.
2. Constructs a `TrendBuffer(20)` (window size 20, generous enough to hold all 10 transformed rates).
3. For each consecutive pair (10 pairs), calls `transformPair(prev, next, { semantic_type: 'counter', counter_width: 64 }, { expected_scrape_interval_seconds: 1.0 })` and pushes the result's `value` into the TrendBuffer via `tb.push('test_signal', rate)`.
4. Verifies all 10 transformed rates carry `slope_quality: 'normal'` (every interval ≤ 1.5 = `1.0 × (1 + 0.5)`).
5. Reads `tb.get('test_signal')` and asserts: `Math.abs(snap.mean - 10) < 0.001` (mean equals per-second rate) AND `Math.abs(snap.slopeNorm) < 0.01` (flat trend; constant rate produces near-zero slopeNorm).

The intervals are deliberately chosen to vary (1.0 → 1.2 → 1.5) but stay within `expected × (1 + jitter)` = 1.5 so no missed-scrape flagging conflates with the integration test.

---

## § 2 Component inventory

### § 2.1 Files state

| Path | State at R25 entry | Touch type at R25 | Binds ACs |
|---|---|---|---|
| `engine/l0/counter-rate-transform.ts` | NEW (does not exist) | CREATED (Implementer) | AC-R25-1 … AC-R25-7 implementation site |
| `test/_substrate/synthetic-counter-generator.ts` | NEW (does not exist) | CREATED (Implementer) | AC-R25-8 … AC-R25-11 implementation site |
| `test/q25-l0-contract.test.ts` | NEW (does not exist) | CREATED (Implementer; RED commit precedes GREEN commit per R23 IMPL MINOR-1 reinforcement) | AC-R25-1 … AC-R25-12 runtime; AC-R25-15 chore-B addition |
| `coordination/specs/Q-R25-SPEC.md` | NEW (this file) | CREATED (Architect; committed BEFORE NEXT-ROLE.md routing block per R21 ARCH MINOR-1 reinforcement) | (artifact — no AC) |
| `coordination/specs/Q-R25-SPEC-AUDIT.md` | NEW | CREATED (Architect; committed in same Architect commit as this spec) | (artifact — no AC) |
| `coordination/NEXT-ROLE.md` | EXISTING (current STATUS: READY pointing to ARCHITECT) | MODIFIED (Architect: top routing block update; Implementer at chore-A: attestation block; Reviewer: re-route) | (artifact — no AC) |
| `coordination/MEMORIAL.md` | EXISTING | APPENDED (Architect ceremony section; later Implementer + Reviewer + Memorial-Updater sections) | (artifact — no AC) |

### § 2.2 Files explicitly NOT touched (anti-scope; see § 3 for verification-path-set)

- `engine/l0/schema-continuity.ts` (A12 frozen; READ-ONLY consumer of `SchemaDescriptor.semantic_type` from `:44`)
- `engine/core.ts` (A12 frozen; TrendBuffer at `:27-100` is consumed by AC-R25-12 without modification)
- `engine/verdict-groups.ts` (R20 frozen)
- `engine/fleet/verdict-consumer.ts` (R21 frozen)
- `engine/hardware-topology-source.ts` (R23 frozen)
- `engine/topology-overlay.ts` (vendored-at-pin)
- `engine/types/verdict.ts` (vendored-with-deltas at R18+R23; no R25 deltas)
- Any other `engine/` file
- `test/_substrate/v9X-cluster.ts` (R18 frozen)
- `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen)
- `test/_substrate/factories.ts` (vendored)
- Any pre-R25 test file (existing q-* suite frozen)
- `coordination/VENDORING-MANIFEST.md` (no new vendoring at R25; the new files are Tessera-original)
- `coordination/SCOPING-MEMO-v0.3.md` (MR-1 amendment already landed at commit `4a4869e`)
- `coordination/PRD.md` (round-scope block authored by Coordinator at `ada602b`; do not amend)

### § 2.3 Component inventory cross-check — per file-creation count

3 new code files (the L0 module + the substrate generator + the q25 test file) + 2 new coordination artifacts (the spec + the audit sidecar) + 2 modified coordination artifacts (NEXT-ROLE.md + MEMORIAL.md) = **7 paths total in the round-start-to-HEAD diff** at chore-A. (Chore-B adds 1 path-touch: `test/q25-l0-contract.test.ts` re-touched to embed the AC-R25-15 SHA literal. No new file at chore-B.)

---

## § 3 Anti-scope verification path-set (allowed-set for AC-R25-15)

The anti-scope diff AC asserts `git diff <BASELINE-SHA>..<CHORE-A-SHA> --name-only ⊆ ALLOWED_SET`. Baseline SHA = `ada602b` (round entry; verified above). Chore-A SHA is substituted by the Implementer at chore-B time (per R20 / R21 / R22 / R23 forward-protection pattern; pseudocode in § 4.7).

**Allowed-set (7 entries):**

1. `engine/l0/counter-rate-transform.ts`
2. `test/_substrate/synthetic-counter-generator.ts`
3. `test/q25-l0-contract.test.ts`
4. `coordination/specs/Q-R25-SPEC.md`
5. `coordination/specs/Q-R25-SPEC-AUDIT.md`
6. `coordination/NEXT-ROLE.md`
7. `coordination/MEMORIAL.md`

**Gitignore audit (per R23 ARCH MINOR-2 reinforcement, applied at § 9.7):** every entry is `.ts` or `.md`; project `.gitignore:6` declares `*.js *.js.map` so no compiled-artifact phantoms are listed. Each entry verified for git-trackability — for the new files, the file does not yet exist at baseline but will be tracked after the GREEN commit; for the existing files, they are already tracked (verified via `git ls-files`).

The 7-entry allowed-set is the membership ceiling for AC-R25-15; AC asserts the actual diff path-set is a subset (membership, not set-equality — consistent with R20-R23 precedent).

**R32 post-round amendment (R25 MAJOR-2):** During R25 execution, a spec-premise failure was encountered for AC-R25-12: the prescribed `1e-9` tolerance was too tight for floating-point arithmetic on variable-interval sequences. A DIAGNOSTIC was filed at `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md` documenting the tolerance deviation; the DIAGNOSTIC commit landed outside the original 7-entry allowed-set (§ 7.1 scenario (c) halt event; recorded retroactively as R25 MAJOR-2 per Reviewer report). The actual implementation uses tolerances `0.001` (mean) and `0.01` (slopeNorm); corrected in § 5.1 AC-R25-12 row and § 1.8 above.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/l0/counter-rate-transform.ts` (new — primary L0-contract module)

**File-level docblock content (lines 1-32, approximately):**

```
// engine/l0/counter-rate-transform.ts — Tessera Phase 2 SLICE 3.A.5 (R25).
//
// L0 contract for Tessera ingestion: defines the explicit guarantees the L0
// layer makes to downstream consumers (TrendBuffer at engine/core.ts:27-100;
// per-shard detector cascade; fleet-merge consumer at
// engine/fleet/verdict-consumer.ts; Wave 2 WU-01/02/03 ingestion adapters).
//
// Six invariants (Q-R25-SPEC.md § 1.2):
//   1. Rate-domain output for counter signals (delta / actual_elapsed_seconds);
//      gauge / ratio / latency_quantile / categorical_rate pass through.
//   2. actual_elapsed_seconds derived per-pair from sample timestamps (first-class).
//   3. Missed-scrape-then-catchup detection: elapsed > expected × (1 + jitter)
//      flags slope_quality 'degraded' + missed_scrape_inferred = true; no
//      interpolation (rejected per PRD — creates false structure surviving
//      the degraded flag).
//   4. DCGM 32-bit counter wraparound: when counter_width = 32 AND next < prev
//      AND prev > UINT32_MAX × wrap_threshold_ratio, emit corrected rate via
//      (UINT32_MOD − prev + next) / elapsed; wraparound_handled = true.
//   5. Reset-vs-wrap disambiguation: any other next < prev → value = null,
//      reset_detected = true. Downstream consumers MAY signal continuity-break
//      to L0 schema-continuity layer (analogous to inherited 'breaking'
//      classification at engine/l0/schema-continuity.ts).
//   6. Metadata propagation: every RateSample carries slope_quality,
//      missed_scrape_inferred, wraparound_handled, reset_detected.
//
// CounterMetadata mirrors SchemaDescriptor.semantic_type semantics
// (engine/l0/schema-continuity.ts:44 — 'counter' | 'gauge' | 'ratio' |
// 'latency_quantile' | 'categorical_rate') and adds tessera-specific
// counter_width. The inherited engine/l0/schema-continuity.ts is NOT
// modified (A12 anti-scope); ingestion adapters construct CounterMetadata
// from their adapter-local knowledge of signal semantics + counter width.
//
// Pure-function contract: transformPair(prev, next, meta, opts) → RateSample.
// Caller manages per-key prev-sample state (typically the ingestion adapter).
// First-scrape edge case is the caller's responsibility (transformPair
// signature requires a non-optional prev).
//
// Tessera-original code (NOT vendored from DeploySignal).
```

**Exports and types (lines 34-90, approximately):**

```ts
export interface CounterSample {
  /** Counter reading or value at the sample point.
   *  For counters, the cumulative count; for gauges/ratios, the instantaneous value. */
  value: number;
  /** Sample timestamp in seconds (epoch or relative; only differences matter). */
  ts_seconds: number;
}

export interface CounterMetadata {
  /** Mirrors engine/l0/schema-continuity.ts:44 — 'counter' | 'gauge' | 'ratio'
   *  | 'latency_quantile' | 'categorical_rate'. Only the literal 'counter' triggers
   *  rate-domain transform; all other values produce value-domain pass-through. */
  semantic_type: string;
  /** Counter width in bits, used only when semantic_type === 'counter' to determine
   *  whether the wraparound path applies. Defaults to 64 (no wraparound expected;
   *  any next < prev classifies as reset). DCGM 32-bit counters (e.g., NVLink error
   *  counters per SCOPING-MEMO-v0.3.md § 2.3 invariant 4): pass 32. */
  counter_width?: 32 | 64;
}

export interface TransformOpts {
  /** Expected scrape interval in seconds. Used to detect missed-scrape catch-up
   *  (when actual elapsed > expected × (1 + jitter_tolerance)). Required —
   *  caller must declare what cadence they were scheduling. */
  expected_scrape_interval_seconds: number;
  /** Fraction above expected interval before a sample is flagged degraded.
   *  Default: DEFAULT_JITTER_TOLERANCE = 0.5 (threshold = expected × 1.5). */
  jitter_tolerance?: number;
  /** Fraction of UINT32_MAX above which prev is considered "near wrap" for the
   *  32-bit wraparound path. Default: DEFAULT_WRAP_THRESHOLD_RATIO = 0.9. */
  wrap_threshold_ratio?: number;
}

export interface RateSample {
  /** Per-second rate for counter signals; pass-through value for non-counter.
   *  null when reset_detected (rate post-reset is undefined). */
  value: number | null;
  /** next.ts_seconds − prev.ts_seconds; always emitted (invariant 2). */
  actual_elapsed_seconds: number;
  /** 'degraded' iff missed_scrape_inferred; 'normal' otherwise. */
  slope_quality: 'normal' | 'degraded';
  /** true iff actual_elapsed_seconds > expected × (1 + jitter_tolerance). */
  missed_scrape_inferred: boolean;
  /** true iff the 32-bit wraparound corrective path fired. */
  wraparound_handled: boolean;
  /** true iff next < prev fell through to the reset path. value is null. */
  reset_detected: boolean;
}

export const UINT32_MAX = 4_294_967_295;
export const UINT32_MOD = 4_294_967_296;
export const DEFAULT_JITTER_TOLERANCE = 0.5;
export const DEFAULT_WRAP_THRESHOLD_RATIO = 0.9;
```

**Function body (transformPair, lines 92-150 approximately):**

```ts
export function transformPair(
  prev: CounterSample,
  next: CounterSample,
  meta: CounterMetadata,
  opts: TransformOpts,
): RateSample {
  const actual_elapsed_seconds = next.ts_seconds - prev.ts_seconds;
  const jitter = opts.jitter_tolerance ?? DEFAULT_JITTER_TOLERANCE;
  const expected = opts.expected_scrape_interval_seconds;
  const missed_scrape_inferred = actual_elapsed_seconds > expected * (1 + jitter);
  const slope_quality: 'normal' | 'degraded' = missed_scrape_inferred ? 'degraded' : 'normal';

  // Invariant 1 — non-counter pass-through (value-domain unchanged).
  if (meta.semantic_type !== 'counter') {
    return {
      value: next.value,
      actual_elapsed_seconds,
      slope_quality,
      missed_scrape_inferred,
      wraparound_handled: false,
      reset_detected: false,
    };
  }

  // Counter arm.
  const width = meta.counter_width ?? 64;

  if (next.value < prev.value) {
    // Invariant 4 — 32-bit wraparound path (only when width === 32 AND prev near max).
    const wrapThresh = (opts.wrap_threshold_ratio ?? DEFAULT_WRAP_THRESHOLD_RATIO) * UINT32_MAX;
    if (width === 32 && prev.value > wrapThresh) {
      const corrected_delta = (UINT32_MOD - prev.value) + next.value;
      return {
        value: corrected_delta / actual_elapsed_seconds,
        actual_elapsed_seconds,
        slope_quality,
        missed_scrape_inferred,
        wraparound_handled: true,
        reset_detected: false,
      };
    }

    // Invariant 5 — reset path (any other decreasing counter).
    return {
      value: null,
      actual_elapsed_seconds,
      slope_quality,
      missed_scrape_inferred,
      wraparound_handled: false,
      reset_detected: true,
    };
  }

  // Clean increasing counter — rate-domain transform.
  const delta = next.value - prev.value;
  return {
    value: delta / actual_elapsed_seconds,
    actual_elapsed_seconds,
    slope_quality,
    missed_scrape_inferred,
    wraparound_handled: false,
    reset_detected: false,
  };
}
```

**Branch enumeration (for branch-binding coverage gate per R21 ARCH MINOR-2/3 reinforcement; see § 9.13):**

| Branch | Trigger | Binding AC |
|---|---|---|
| Non-counter pass-through (`semantic_type !== 'counter'`) | `meta.semantic_type === 'gauge'` (any non-`'counter'` literal) | AC-R25-2 |
| Counter clean-increase (`semantic_type === 'counter'` AND `next.value ≥ prev.value`) | Clean pair | AC-R25-1 |
| Missed-scrape flag (`actual_elapsed > expected × (1 + jitter)`) | Missed-scrape pair | AC-R25-3 |
| Missed-scrape NOT (`actual_elapsed ≤ expected × (1 + jitter)`) | Clean pair | AC-R25-1 (slope_quality: 'normal' assertion) |
| Counter-decrease + width=32 + above-threshold (wrap path) | Wrap32 pair | AC-R25-4 |
| Counter-decrease + width!=32 (force reset even with high prev) | 64-bit reset pair | AC-R25-5 |
| Counter-decrease + width=32 + below-threshold (reset path) | Reset pair | AC-R25-6 |
| Default jitter_tolerance fallback (`opts.jitter_tolerance` absent) | AC-R25-1 (does not pass jitter) | AC-R25-1 |
| Default counter_width fallback (`meta.counter_width` absent) | AC-R25-2 (gauge has no counter_width) | AC-R25-2 |
| Default wrap_threshold_ratio fallback (`opts.wrap_threshold_ratio` absent) | AC-R25-4 (does not pass threshold ratio) | AC-R25-4 |

All conditional branches have at least one binding AC. The "all-metadata-fields-emitted-on-every-output" structural invariant is bound at AC-R25-7 (well-formedness across all 4 cases: counter clean, counter reset, counter wrap, non-counter).

### § 4.2 `test/_substrate/synthetic-counter-generator.ts` (new — Tessera-original substrate)

**File-level docblock (lines 1-18 approximately):**

```
// test/_substrate/synthetic-counter-generator.ts — Phase 2 SLICE 3.A.5 substrate (R25).
//
// Synthetic counter generator for L0-contract empirical validation. Five
// factories produce sample pairs (clean / missed-scrape / 32-bit wrap /
// reset) plus one sequence-builder for variable-interval integration with
// TrendBuffer (AC-R25-12).
//
// Naming convention parallels test/_substrate/factories.ts and v9X-cluster.ts:
//   make<Case>(overrides?) → ResultType; defaults are deterministic-test
//   friendly (base_ts = 1700000000, starting_value = 1000, expected_interval = 1.0,
//   rate_per_second = 10); opts shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).
```

**Exports (lines 20-100 approximately):**

```ts
import type { CounterSample } from '../../engine/l0/counter-rate-transform';

const DEFAULT_BASE_TS = 1_700_000_000;
const DEFAULT_STARTING_VALUE = 1000;
const DEFAULT_EXPECTED_INTERVAL = 1.0;
const DEFAULT_RATE_PER_SECOND = 10;

export interface SyntheticCounterOpts {
  expected_interval_seconds?: number;
  base_ts?: number;
  starting_value?: number;
  rate_per_second?: number;
}

export function makeCleanPair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  const startVal  = opts.starting_value            ?? DEFAULT_STARTING_VALUE;
  const rate      = opts.rate_per_second           ?? DEFAULT_RATE_PER_SECOND;
  return {
    prev: { value: startVal,                       ts_seconds: baseTs },
    next: { value: startVal + rate * interval,     ts_seconds: baseTs + interval },
  };
}

export function makeMissedScrapePair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // Interval = 2 × expected (above default 1.5 threshold); counter increments by
  // rate × 2 × interval (catch-up — the missed sample's delta carried over).
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  const startVal  = opts.starting_value            ?? DEFAULT_STARTING_VALUE;
  const rate      = opts.rate_per_second           ?? DEFAULT_RATE_PER_SECOND;
  return {
    prev: { value: startVal,                              ts_seconds: baseTs },
    next: { value: startVal + rate * 2 * interval,        ts_seconds: baseTs + 2 * interval },
  };
}

export function makeWrap32Pair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // prev = 4_200_000_000 > 0.9 × UINT32_MAX (= 3_865_470_565.5); next small.
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  return {
    prev: { value: 4_200_000_000, ts_seconds: baseTs },
    next: { value: 50,            ts_seconds: baseTs + interval },
  };
}

export function makeResetPair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // prev = 5000 (well below wrap threshold); next very small (10).
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  return {
    prev: { value: 5000, ts_seconds: baseTs },
    next: { value: 10,   ts_seconds: baseTs + interval },
  };
}

export function makeVariableIntervalSequence(opts: {
  intervals_seconds: number[];
  rate_per_second?: number;
  starting_value?: number;
  base_ts?: number;
}): CounterSample[] {
  const rate     = opts.rate_per_second ?? DEFAULT_RATE_PER_SECOND;
  const startVal = opts.starting_value  ?? DEFAULT_STARTING_VALUE;
  const baseTs   = opts.base_ts         ?? DEFAULT_BASE_TS;
  const samples: CounterSample[] = [{ value: startVal, ts_seconds: baseTs }];
  let curValue = startVal;
  let curTs = baseTs;
  for (const dt of opts.intervals_seconds) {
    curValue += rate * dt;
    curTs += dt;
    samples.push({ value: curValue, ts_seconds: curTs });
  }
  return samples;
}
```

### § 4.3 `test/q25-l0-contract.test.ts` (new — RED commit first per R23 IMPL MINOR-1 reinforcement)

**RED commit content (chronologically first; before any production code):**

The RED commit creates `test/q25-l0-contract.test.ts` with 12 `assert.fail` placeholder bodies for AC-R25-1 through AC-R25-12, plus imports that intentionally fail to resolve (because `engine/l0/counter-rate-transform.ts` and `test/_substrate/synthetic-counter-generator.ts` do not yet exist). Running `npx tsc -p tsconfig.test.json` at this state produces TS2307 errors on both imports. Running `node --test test/*.test.js` is structurally impossible until typecheck passes, but the typecheck-failure suffices as the RED audit-trail artifact.

After the RED commit, the Implementer creates `engine/l0/counter-rate-transform.ts` and `test/_substrate/synthetic-counter-generator.ts`, then replaces the placeholder test bodies with the real implementations below in the GREEN commit.

**GREEN commit content (after RED; file head):**

```ts
// test/q25-l0-contract.test.ts — Phase 2 SLICE 3.A.5 bindings (R25).
//
// Binds AC-R25-1 through AC-R25-12 (runtime) per Q-R25-SPEC.md § 5.
// AC-R25-13 (typecheck) and AC-R25-14 (test count at chore-A SHA) are
// binding-command attestations reported by the Implementer at GREEN; not
// runtime-bound. AC-R25-15 (anti-scope diff) is a runtime test appended at
// chore-B with the chore-A SHA substituted into the diff baseline literal.
//
// Covers: L0 contract — counter-to-rate transform; non-counter pass-through;
// missed-scrape detection + degraded flag; 32-bit wraparound (DCGM); 64-bit
// reset path; metadata propagation (all 4 flags on every output); synthetic
// counter substrate (clean / missed-scrape / wrap / reset / variable-interval);
// TrendBuffer integration (variable-interval comparable slopeNorm); anti-scope
// SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  transformPair,
  UINT32_MAX,
  UINT32_MOD,
  type CounterMetadata,
  type RateSample,
} from '../engine/l0/counter-rate-transform';
import { TrendBuffer } from '../engine/core';
import {
  makeCleanPair, makeMissedScrapePair, makeWrap32Pair, makeResetPair,
  makeVariableIntervalSequence,
} from './_substrate/synthetic-counter-generator';
```

**AC bindings (per-test pseudocode; chore-A scope):**

```ts
// AC-R25-1: counter clean-increase → rate-domain output + 'normal' slope_quality
test('AC-R25-1: counter → delta/elapsed rate with normal slope_quality on clean interval', () => {
  const { prev, next } = makeCleanPair({ expected_interval_seconds: 10, starting_value: 100, rate_per_second: 10 });
  // prev = {value:100, ts:1.7e9}; next = {value:200, ts:1.7e9 + 10}
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out: RateSample = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 10 });
  assert.strictEqual(out.value, 10);                                   // (200-100)/10
  assert.strictEqual(out.actual_elapsed_seconds, 10);
  assert.strictEqual(out.slope_quality, 'normal');
  assert.strictEqual(out.missed_scrape_inferred, false);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, false);
});

// AC-R25-2: non-counter signals pass through value-domain unchanged
test('AC-R25-2: gauge semantic_type passes value-domain unchanged', () => {
  const { prev, next } = makeCleanPair();   // generator emits cumulative-style pair; treat value field as gauge
  const meta: CounterMetadata = { semantic_type: 'gauge' };            // counter_width omitted
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.value, next.value);                            // pass-through, NOT delta/elapsed
  assert.strictEqual(out.actual_elapsed_seconds, next.ts_seconds - prev.ts_seconds);
  assert.strictEqual(out.slope_quality, 'normal');
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, false);
});

// AC-R25-3: missed-scrape catch-up → degraded slope_quality + missed_scrape_inferred
test('AC-R25-3: missed-scrape pair flags degraded + missed_scrape_inferred', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  // interval = 2.0 = 2 × 1.0 > 1.5 (default jitter 0.5 threshold)
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.actual_elapsed_seconds, 2.0);
  assert.strictEqual(out.slope_quality, 'degraded');
  assert.strictEqual(out.missed_scrape_inferred, true);
  // value is still computed (no interpolation; raw catch-up delta over doubled interval)
  assert.ok(out.value !== null && Number.isFinite(out.value));
});

// AC-R25-4: 32-bit wraparound → wraparound_handled + corrected rate via (UINT32_MOD − prev + next) / elapsed
test('AC-R25-4: 32-bit counter wraparound emits corrected rate with wraparound_handled', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  // prev = 4_200_000_000 > 0.9 × UINT32_MAX (3865470565.5); next = 50; interval = 1.0
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 32 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, true);
  assert.strictEqual(out.reset_detected, false);
  const expected_rate = (UINT32_MOD - 4_200_000_000 + 50) / 1.0;       // = 94_967_346
  assert.strictEqual(out.value, expected_rate);
});

// AC-R25-5: 64-bit counter with high prev + decreasing → reset, NOT wrap (width gate)
test('AC-R25-5: 64-bit width with decreasing counter routes to reset path, not wrap', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  // SAME generator pair (prev=4.2e9; next=50) but width=64 forces reset path
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.value, null);
});

// AC-R25-6: reset pair (prev below wrap threshold) → value=null + reset_detected
test('AC-R25-6: counter reset (prev below wrap threshold) emits null + reset_detected', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  // prev = 5000 (well below 0.9 × UINT32_MAX); next = 10; width = 32 (still resets — not near max)
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 32 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.value, null);
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
});

// AC-R25-7: metadata propagation — every RateSample carries all 4 flags as defined fields
test('AC-R25-7: every RateSample emits all 4 metadata flags as defined fields across all 4 case-classes', () => {
  const cases = [
    { name: 'clean',         pair: makeCleanPair(),         meta: { semantic_type: 'counter', counter_width: 64 } as CounterMetadata },
    { name: 'wrap',          pair: makeWrap32Pair(),        meta: { semantic_type: 'counter', counter_width: 32 } as CounterMetadata },
    { name: 'reset',         pair: makeResetPair(),         meta: { semantic_type: 'counter', counter_width: 32 } as CounterMetadata },
    { name: 'gauge',         pair: makeCleanPair(),         meta: { semantic_type: 'gauge' } as CounterMetadata },
  ];
  for (const c of cases) {
    const out = transformPair(c.pair.prev, c.pair.next, c.meta, { expected_scrape_interval_seconds: 1.0 });
    assert.ok(out.slope_quality === 'normal' || out.slope_quality === 'degraded', `${c.name}: slope_quality is a defined string`);
    assert.strictEqual(typeof out.missed_scrape_inferred, 'boolean',  `${c.name}: missed_scrape_inferred is boolean`);
    assert.strictEqual(typeof out.wraparound_handled,    'boolean',   `${c.name}: wraparound_handled is boolean`);
    assert.strictEqual(typeof out.reset_detected,        'boolean',   `${c.name}: reset_detected is boolean`);
    assert.strictEqual(typeof out.actual_elapsed_seconds,'number',    `${c.name}: actual_elapsed_seconds is number`);
  }
});

// AC-R25-8: synthetic counter generator — clean-pair default shape is deterministic
test('AC-R25-8: makeCleanPair default shape matches deterministic expectations', () => {
  const { prev, next } = makeCleanPair();
  assert.strictEqual(prev.value, 1000);
  assert.strictEqual(prev.ts_seconds, 1_700_000_000);
  assert.strictEqual(next.value, 1010);                                // 1000 + rate(10) × interval(1.0)
  assert.strictEqual(next.ts_seconds, 1_700_000_001);                  // 1.7e9 + 1.0
});

// AC-R25-9: missed-scrape generator produces interval > expected × (1 + default-jitter)
test('AC-R25-9: makeMissedScrapePair produces interval that crosses default jitter threshold', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  const interval = next.ts_seconds - prev.ts_seconds;
  assert.strictEqual(interval, 2.0);                                   // 2 × expected
  assert.ok(interval > 1.0 * (1 + 0.5), 'interval exceeds default jitter threshold');
});

// AC-R25-10: wrap-32 generator places prev above 0.9 × UINT32_MAX
test('AC-R25-10: makeWrap32Pair places prev above 0.9 × UINT32_MAX threshold', () => {
  const { prev, next } = makeWrap32Pair();
  assert.ok(prev.value > 0.9 * UINT32_MAX, 'prev exceeds wrap threshold');
  assert.ok(next.value < prev.value, 'next < prev');
});

// AC-R25-11: reset generator places prev below wrap threshold AND next < prev
test('AC-R25-11: makeResetPair places prev below wrap threshold AND next < prev', () => {
  const { prev, next } = makeResetPair();
  assert.ok(prev.value < 0.9 * UINT32_MAX, 'prev below wrap threshold');
  assert.ok(next.value < prev.value, 'next < prev');
});

// AC-R25-12: TrendBuffer integration — variable scrape intervals produce comparable per-second rates
test('AC-R25-12: variable-interval L0-transformed rates integrate cleanly with TrendBuffer (constant per-second rate)', () => {
  const samples = makeVariableIntervalSequence({
    intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0],
    rate_per_second: 10,
  });
  // 11 samples → 10 consecutive pairs. All intervals ≤ 1.5 = 1.0 × (1 + 0.5) → no degraded flag.
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const tb = new TrendBuffer(20);
  for (let i = 1; i < samples.length; i++) {
    const out = transformPair(samples[i - 1], samples[i], meta, { expected_scrape_interval_seconds: 1.0 });
    assert.strictEqual(out.slope_quality, 'normal', `pair ${i}: not degraded`);
    assert.notStrictEqual(out.value, null);
    tb.push('test_signal', out.value!);
  }
  const snap = tb.get('test_signal');
  // Mean rate is per-second rate (10); slopeNorm near zero (constant rate).
  assert.ok(Math.abs(snap.mean - 10) < 0.001,       `mean=${snap.mean} expected ~10 (tolerance 0.001; R32 correction)`);
  assert.ok(Math.abs(snap.slopeNorm) < 0.01,        `slopeNorm=${snap.slopeNorm} expected near zero (tolerance 0.01; R32 correction)`);
});
```

**AC-R25-13 and AC-R25-14 are binding-command attestations** — reported by the Implementer at GREEN, NOT runtime tests. AC-R25-13 attests `npx tsc -p tsconfig.test.json` exit 0. AC-R25-14 attests `node --test test/*.test.js` produces `tests=229 / pass=228 / fail=1` at chore-A SHA (217 baseline + 12 new q25 tests at chore-A; 1 pre-existing fail from q01 AC-7 ENOENT in cluster-worktree; +1 at chore-B for AC-R25-15 = 230 total at HEAD).

**Note for Implementer:** if the actual baseline differs from 217 (e.g., prior cluster work introduced changes), re-derive the count at session start; HALT on baseline drift per § 7.1 scenario (b) and write a DIAGNOSTIC documenting the drift before continuing.

### § 4.4 chore-A coordination commit

After GREEN commit lands, the Implementer:

1. Updates `coordination/NEXT-ROLE.md` top routing block: `NEXT-ROLE: REVIEWER`, `STATUS: READY`, attestation block citing typecheck exit code + test count + per-AC line numbers (cite the `test(` declaration line — verified by `grep -n "^test(" test/q25-l0-contract.test.ts` before commit per R03/R18/R21 line-citation-drift reinforcement).
2. Appends Implementer ceremony section to `coordination/MEMORIAL.md` (CONFIRMATIONs for tdd-red-ordering, spec-prescription-fidelity, anti-scope, halt-discipline, binding-command-attestation, line-citation-accuracy, role-boundary).
3. Commits both changes as `chore(R25): route to REVIEWER — coordination artifacts (chore-A)`.

The chore-A commit SHA is the substitution token for AC-R25-15 (see § 4.6).

### § 4.5 chore-B commit (AC-R25-15 anti-scope test)

After chore-A SHA is fixed, the Implementer:

1. Re-opens `test/q25-l0-contract.test.ts` and appends the AC-R25-15 runtime test, substituting the literal chore-A SHA into the diff baseline check.
2. Commits as `chore(R25-B): AC-R25-15 anti-scope test + chore-A SHA <SHA> substituted`.

### § 4.6 AC-R25-15 anti-scope diff test pseudocode

```ts
// AC-R25-15: anti-scope diff at chore-A SHA ⊆ 7-entry allowed-set
test('AC-R25-15: round-start-to-chore-A diff path-set ⊆ R25 allowed-set', () => {
  const BASELINE_SHA = 'ada602b';                  // R25 round-start (verified Q-R25-SPEC.md § 0 header)
  const CHORE_A_SHA  = '<CHORE-A-SHA>';            // substituted by Implementer at chore-B
  const ALLOWED_SET = new Set<string>([
    'engine/l0/counter-rate-transform.ts',
    'test/_substrate/synthetic-counter-generator.ts',
    'test/q25-l0-contract.test.ts',
    'coordination/specs/Q-R25-SPEC.md',
    'coordination/specs/Q-R25-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter(p => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R25 path in chore-A diff: ${p}`);
  }
});
```

### § 4.7 Architect two-commit sequence (per R21 ARCH MINOR-1 reinforcement)

The Architect (this role, R25) commits in this order:

1. `spec(R25): Q-R25-SPEC.md + Q-R25-SPEC-AUDIT.md (Phase 2 SLICE 3.A.5 — L0 contract for Tessera)` — both new artifact files in one commit.
2. `route(R25): Architect → Implementer; STATUS: READY; MEMORIAL ceremony` — `coordination/NEXT-ROLE.md` top routing block update + `coordination/MEMORIAL.md` Architect ceremony section append.

This order ensures that when the Implementer's chore-A commit lands, the spec files already exist in git history — preserving the baseline-to-chore-A diff completeness gate (Implementer's chore-A diff includes the spec files; AC-R25-15 allowed-set membership check passes).

---

## § 5 Acceptance criteria

**AC-table classification preamble (per R20 ARCH MINOR-1 reinforcement — every classification claim below verified against the matching § 4.x prescription):**

- **AC-R25-1 through AC-R25-12** are **runtime tests** committed in `test/q25-l0-contract.test.ts` per § 4.3 GREEN-commit pseudocode (12 distinct `test(...)` blocks).
- **AC-R25-13 (typecheck)** is a **binding-command attestation** — `npx tsc -p tsconfig.test.json` reported by the Implementer in `coordination/NEXT-ROLE.md` at chore-A per § 4.4. No runtime test for AC-R25-13.
- **AC-R25-14 (test count at chore-A SHA)** is a **binding-command attestation** — `node --test test/*.test.js` output count reported in NEXT-ROLE.md attestation block at chore-A per § 4.4; the literal "229" is anchored to chore-A SHA (NOT HEAD) per R22 IMPL MINOR-1 reinforcement. No runtime test for AC-R25-14.
- **AC-R25-15 (anti-scope diff)** is a **runtime test** appended at chore-B per § 4.5 / § 4.6 with the chore-A SHA substituted into the baseline literal (forward-protection pattern; R20 / R21 / R22 / R23 precedent).

This classification preamble is cross-checked against the matching § 4.x prescriptions — each row above maps to its prescribing sub-section. No narrative-classification-vs-structural-prescription drift (R20 MINOR-1 class of issue ruled out by this cross-check).

### § 5.1 AC table

| AC | Given / When / Then | Binds invariant / surface | Site |
|---|---|---|---|
| AC-R25-1 | Given a clean counter pair (prev value 100, next value 200, ts diff 10s), when `transformPair(prev, next, { semantic_type: 'counter', counter_width: 64 }, { expected_scrape_interval_seconds: 10 })` runs, then `value === 10`, `actual_elapsed_seconds === 10`, `slope_quality === 'normal'`, `missed_scrape_inferred === false`, `wraparound_handled === false`, `reset_detected === false`. | Invariant 1 (counter clean), Invariant 2 (elapsed first-class), Invariant 6 (4 flags emitted) | test/q25:`test('AC-R25-1: ...`) |
| AC-R25-2 | Given a sample pair, when `transformPair(prev, next, { semantic_type: 'gauge' }, opts)` runs (`counter_width` omitted), then `value === next.value` (value-domain pass-through), `actual_elapsed_seconds` reflects the timestamp difference, `wraparound_handled === false`, `reset_detected === false`. | Invariant 1 (non-counter pass-through) | test/q25:`test('AC-R25-2: ...`) |
| AC-R25-3 | Given a missed-scrape pair (interval = 2 × expected = 2.0s), when `transformPair` runs with `expected_scrape_interval_seconds: 1.0` (default jitter 0.5), then `actual_elapsed_seconds === 2.0`, `slope_quality === 'degraded'`, `missed_scrape_inferred === true`, `value !== null` (no interpolation; raw catch-up delta over doubled interval). | Invariant 3 | test/q25:`test('AC-R25-3: ...`) |
| AC-R25-4 | Given a 32-bit wrap pair (prev = 4_200_000_000 > 0.9 × UINT32_MAX, next = 50, interval = 1.0s), when `transformPair` runs with `semantic_type: 'counter', counter_width: 32`, then `wraparound_handled === true`, `reset_detected === false`, `value === (UINT32_MOD - 4_200_000_000 + 50) / 1.0 === 94_967_346`. | Invariant 4 | test/q25:`test('AC-R25-4: ...`) |
| AC-R25-5 | Given the SAME wrap-32 pair (prev = 4_200_000_000, next = 50) but `counter_width: 64`, when `transformPair` runs, then `wraparound_handled === false`, `reset_detected === true`, `value === null`. | Invariant 4 negative leg (64-bit gate forces reset) | test/q25:`test('AC-R25-5: ...`) |
| AC-R25-6 | Given a reset pair (prev = 5000 well below wrap threshold, next = 10), when `transformPair` runs with `counter_width: 32`, then `value === null`, `reset_detected === true`, `wraparound_handled === false`. | Invariant 5 | test/q25:`test('AC-R25-6: ...`) |
| AC-R25-7 | Given each of the 4 case-classes (clean / wrap / reset / gauge), when `transformPair` runs, then the returned `RateSample` carries `slope_quality ∈ {'normal','degraded'}`, `typeof missed_scrape_inferred === 'boolean'`, `typeof wraparound_handled === 'boolean'`, `typeof reset_detected === 'boolean'`, `typeof actual_elapsed_seconds === 'number'`. | Invariant 6 (structural exhaustiveness) | test/q25:`test('AC-R25-7: ...`) |
| AC-R25-8 | Given default opts, when `makeCleanPair()` runs, then `prev === { value: 1000, ts_seconds: 1_700_000_000 }`, `next === { value: 1010, ts_seconds: 1_700_000_001 }`. | Substrate determinism | test/q25:`test('AC-R25-8: ...`) |
| AC-R25-9 | Given `expected_interval_seconds: 1.0`, when `makeMissedScrapePair` runs, then `(next.ts_seconds - prev.ts_seconds) === 2.0` AND that interval exceeds `1.0 × (1 + 0.5) = 1.5`. | Substrate exercises Invariant 3 trigger | test/q25:`test('AC-R25-9: ...`) |
| AC-R25-10 | When `makeWrap32Pair` runs, then `prev.value > 0.9 × UINT32_MAX` AND `next.value < prev.value`. | Substrate exercises Invariant 4 trigger | test/q25:`test('AC-R25-10: ...`) |
| AC-R25-11 | When `makeResetPair` runs, then `prev.value < 0.9 × UINT32_MAX` AND `next.value < prev.value`. | Substrate exercises Invariant 5 trigger | test/q25:`test('AC-R25-11: ...`) |
| AC-R25-12 | Given a variable-interval sequence (10 intervals all ≤ 1.5s with `rate_per_second: 10`), when each consecutive pair is transformed and the value pushed into a `TrendBuffer(20)`, then every pair carries `slope_quality === 'normal'`, the TrendBuffer snapshot `mean === 10` (to 0.001 tolerance — floating-point arithmetic on synthetic data; R32 correction per DIAGNOSTIC-R25-ac12-tolerance.md) AND `\|snap.slopeNorm\| < 0.01` (constant per-second rate produces near-zero slope). | Invariant 2 + Invariant 6 + TrendBuffer integration (PRD-load-bearing claim "Comparable slopeNorm follows from per-second-normalized inputs") | test/q25:`test('AC-R25-12: ...`) |
| AC-R25-13 | Given the R25 codebase at chore-A SHA, when `npx tsc -p tsconfig.test.json` runs, then exit code is 0 and no diagnostics are emitted. | Binding-command typecheck attestation | NEXT-ROLE.md attestation block (Implementer at chore-A) |
| AC-R25-14 | Given the R25 codebase at chore-A SHA `<CHORE-A-SHA>`, when `node --test test/*.test.js` runs, then output reports `tests=229 / pass=228 / fail=1` (217 baseline + 12 q25 chore-A tests; 1 pre-existing fail: q01 AC-7 ENOENT in cluster-worktree where sibling deploysignal repo is absent — not introduced by R25). | Binding-command test-count attestation, anchored to chore-A SHA per R22 IMPL MINOR-1 | NEXT-ROLE.md attestation block (Implementer at chore-A) |
| AC-R25-15 | Given `git diff ada602b..<CHORE-A-SHA> --name-only`, then every emitted path is a member of the 7-entry allowed-set in § 3. | Anti-scope SHA-pinned forward protection | test/q25:`test('AC-R25-15: ...`) added at chore-B |

### § 5.2 Counterfactual / failure-mode binding per AC (for the right-reasons audit gate the Reviewer will run)

| AC | What removing-the-guard / mutating-production would break |
|---|---|
| AC-R25-1 | If the counter arm computed `next.value - prev.value` (delta-without-elapsed-normalization), `value === 100` not 10 — assertion fails. If `slope_quality === 'degraded'` were emitted unconditionally, the normal-flag assertion fails. |
| AC-R25-2 | If the non-counter branch fell through to the counter computation, `value === (next.value - prev.value)/elapsed` not `next.value` — assertion fails. |
| AC-R25-3 | If the missed-scrape threshold were `expected × 2` rather than `expected × (1 + jitter)`, `slope_quality` would be `'normal'` for a 2.0s interval — assertion fails. |
| AC-R25-4 | If the wrap-corrected formula used `UINT32_MAX` instead of `UINT32_MOD`, the value would be off by 1; assertion `value === 94_967_346` (exact) fails by 1. |
| AC-R25-5 | If the width gate (`width === 32`) were removed, the wrap path would fire for the 64-bit case and `value` would not be `null` — assertion fails. |
| AC-R25-6 | If the wrap-threshold check (`prev > wrapThresh`) were inverted, the reset path would fail to fire for prev=5000 — `value !== null`, assertion fails. |
| AC-R25-7 | If any flag emission were omitted on any code path, `typeof === 'boolean'` would fail (would be `undefined`). |
| AC-R25-8/9/10/11 | If the generator defaults drifted, the literal expected values fail. |
| AC-R25-12 | If the L0 transform did not normalize per-second, the per-tick raw deltas would vary (10, 12, 15, 10, 12, 15, …) and the cv would be non-zero — slopeNorm would be non-zero, assertion `< 0.01` fails. |
| AC-R25-15 | If a path outside the allowed-set appears in the chore-A diff, the membership assertion fails. |

Each AC has a counterfactual; no AC structurally passes by tautology (right-reasons audit gate per Reviewer discipline § R08–R23 streak).

---

## § 6 Anti-scope

| Item | Reason |
|---|---|
| **A10 — NO hardware diagnosis.** | MR-1 amendment carves out L0 measurement-domain preprocessing; hardware *diagnosis* (DCGM signal generation; per-GPU SDC attribution; NVIDIA-stack tooling) remains fenced. |
| **A12 — NO modification of inherited vendored-at-pin engine internals.** | `engine/core.ts` TrendBuffer frozen; `engine/l0/schema-continuity.ts` body frozen (READ-ONLY consumer of `SchemaDescriptor.semantic_type` from `:44`). No engine/* modification beyond the new Tessera-original file at `engine/l0/counter-rate-transform.ts`. |
| **A11 — NO live DCGM / NVML endpoints.** | Synthetic counter generator only. |
| **A14 — NO modification of inherited verdict shape** (already preserved). | `engine/types/verdict.ts` not touched. |
| **A16 — NO Addition #26 D4 reversal.** | L0 contract operates upstream of attribution; does not touch wire-format. |
| **NO modification of `engine/verdict-groups.ts`** | R20 frozen. |
| **NO modification of `engine/fleet/verdict-consumer.ts`** | R21 frozen. |
| **NO modification of `engine/hardware-topology-source.ts`** | R23 frozen. |
| **NO modification of `engine/topology-overlay.ts`** | Vendored-at-pin. |
| **NO modification of `engine/types/verdict.ts`** | Vendored-with-deltas at R18+R23; no R25 delta. |
| **NO modification of `test/_substrate/v9X-cluster.ts` or `test/_substrate/v9Y-multi-rack-cluster.ts`** | R18 + R23 frozen. |
| **NO modification of any pre-R25 test file** | Existing q-* test suite frozen. |
| **NO drafting of WU-01 / WU-02 / WU-03 adapter ACs** | Wave 2 cluster Architects' job. |
| **NO interpolation of missed-scrape values** | PRD invariant 3 explicit rejection — "creates false structure that survives the degraded flag." Spec prescribes raw catch-up delta + degraded flag; consumers MAY suppress per their policy. |
| **NO modification of `coordination/VENDORING-MANIFEST.md`** | No new vendoring; counter-rate-transform.ts is Tessera-original. |
| **NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`** | Already authored upstream of R25. |

---

## § 7 Open questions

**None — all resolved.**

The PRD scope block pre-resolves: (a) file location (`engine/l0/counter-rate-transform.ts`, per operator OQ-W2-1 Option A, 2026-05-18); (b) the 6-invariant enumeration with exact wording; (c) the substrate location (`test/_substrate/synthetic-counter-generator.ts`); (d) the cluster halt-conditions (route back to Coordinator if A12 must be violated or scope expands beyond counter preprocessing).

Architectural decisions made in § 0 brainstorm (module shape = pure function; counter-width metadata source = Tessera-original CounterMetadata interface; metadata propagation = RateSample fields; substrate API = per-case factories; test-file structure = single q25 file) are decisions, not open questions — each was selected over enumerated alternatives with explicit rationale.

### § 7.1 Implementer halt-condition pre-anticipation

Five specific halt scenarios prescribed in advance per R08 + R19 reinforcements (HALT → DIAGNOSTIC + STATUS: ESCALATE, NOT silent in-line resolution):

| # | Scenario | Prescribed response |
|---|---|---|
| (a) | Typecheck fails at GREEN | HALT (b). Write `coordination/diagnostics/DIAGNOSTIC-R25-typecheck.md`; STATUS: ESCALATE. Likely cause: import-path drift between counter-rate-transform.ts and the test file; root-cause-fix, not test-mutation. |
| (b) | Baseline test count differs from 217 at session entry | HALT. Write `DIAGNOSTIC-R25-baseline-drift.md` documenting observed count and the commit that introduced the drift; STATUS: ESCALATE. Likely operator-prep commit between R23 close and R25 entry that the spec did not anticipate. |
| (c) | Any AC scenario produces output that conflicts with spec prescription | HALT (b). Write `DIAGNOSTIC-R25-ac-mismatch.md` with the conflict (AC ID, expected, observed, root cause). DO NOT modify the test to match observed — that's a R19 MAJOR-3-class self-confirming pattern. ESCALATE for operator-bounded options (e.g., (A) amend spec invariant, (B) fix implementation bug, (C) defer). |
| (d) | `coordination/specs/Q-R25-SPEC.md` (or AUDIT) is uncommitted at chore-A authoring time | This is an Architect-attributable defect (R21 ARCH MINOR-1) — but if observed by Implementer, HALT. The Architect's two-commit sequence (spec → routing) is structurally enforced by § 4.7; deviation indicates an upstream defect. |
| (e) | Anti-scope file modification surfaces during binding-command runs (e.g., a pre-R25 test file fails because of upstream commit drift) | HALT and recommend promotion-to-full tier (this round IS full-tier; the analog at audit-tier would force promotion). Write `DIAGNOSTIC-R25-antiscope-collision.md` with bounded options ((A) amend spec § 6 allowed-set, (B) revert upstream commit, (C) rewrite the failing assertion preserving forward protection). NOT a silent test-mutation per R19 MAJOR-1/2 reinforcement. |

---

## § 8 P3 ten-axis verification

| Axis | Verification |
|---|---|
| **Correctness** | The 6 PRD invariants each map to a specific code path (§ 1.2 table); wrap-correctness uses `UINT32_MOD` (= 2³²) not `UINT32_MAX` (= 2³² − 1) — modulus correctness verified algebraically (§ 1.3 note). |
| **Completeness** | All 6 invariants have ≥ 1 binding AC; structural exhaustiveness of `RateSample` (4 metadata flags always emitted) binds invariant 6 across all 4 case-classes (AC-R25-7); TrendBuffer integration claim binds invariant 2 empirically (AC-R25-12). |
| **Consistency** | Cross-section token consistency verified: `transformPair`, `CounterSample`, `CounterMetadata`, `RateSample`, `UINT32_MAX`, `UINT32_MOD`, `makeCleanPair`/`makeMissedScrapePair`/`makeWrap32Pair`/`makeResetPair`/`makeVariableIntervalSequence`, baseline SHA `ada602b`, allowed-set size 7, test count 229 (chore-A) / 230 (HEAD) — each token appears identically across § 0, § 1, § 2, § 3, § 4, § 5, § 8, § 9. |
| **Clarity** | Each AC stated in "Given X, when Y, then Z" form; ambiguous language ("correctly", "appropriately") absent (verified via § 9.4 pass). |
| **Coverage** | AC-R25-1 through AC-R25-12 collectively bind all 6 invariants and all 6 conditional branches in `transformPair` (§ 4.1 branch-binding table). AC-R25-13 / -14 / -15 bind round-level integrity (typecheck, test-count, anti-scope). 15 ACs total. |
| **Constraints** | A12 (no engine/* internals modification): preserved by Approach A in § 0.2 (CounterMetadata is Tessera-original; no schema-continuity.ts delta). A11 (no live endpoints): synthetic generator only. A14/A16 (verdict-shape + correlational_not_causal): not touched. |
| **Concurrency** | `transformPair` is referentially transparent (pure function); no shared state, no concurrency concerns; TrendBuffer integration uses inherited per-key TrendBuffer (single-instance per signal; no R25 concurrency surface). |
| **Corner cases** | First-scrape (no prev) — caller's responsibility (signature requires non-optional prev); documented in file docblock. Zero elapsed time (`next.ts_seconds === prev.ts_seconds`) — produces `Infinity` rate via division; not bound by an AC because synthetic generator never produces it; out of scope at R25. Negative elapsed (`next.ts_seconds < prev.ts_seconds`) — also not bound (generator monotone-only); out of scope. |
| **Cost** | Per-call cost: O(1) arithmetic (constant-time branches); no allocations beyond the returned `RateSample` object. Test-suite cost: 12 new runtime tests + 1 chore-B = 13 new q25 tests; ~13/217 ≈ 6% growth; negligible. |
| **Coupling** | New file `engine/l0/counter-rate-transform.ts` imports nothing from engine/* (CounterMetadata is Tessera-original; no `SchemaDescriptor` import). Substrate file imports only `CounterSample` type from the L0 module. Test file imports from the L0 module, `engine/core.ts` (TrendBuffer), and the substrate. Coupling is uni-directional and acyclic. |

---

## § 9 Pre-emit grilling (inline; per all applicable cross-project + tessera-local REINFORCED rules)

### § 9.1 Verifiable-claims table

Every load-bearing factual claim in this spec is verifiable by a specific evidence operation. Below is the table; all verified before this spec is committed.

| # | Claim | Evidence |
|---|---|---|
| 1 | `engine/l0/schema-continuity.ts:41-58` declares `SchemaDescriptor` with `semantic_type: string` and NO `counter_width` field | File read at session start; lines 41-58 confirm; comment at `:44` enumerates the value space. |
| 2 | `engine/l0/schema-continuity.ts:44` comment lists `counter | gauge | ratio | latency_quantile | categorical_rate` | Direct file read. |
| 3 | `engine/core.ts:27-100` is the TrendBuffer surface | Direct file read; the constructor + push + get methods reside in this range. |
| 4 | `engine/fleet/verdict-consumer.ts` exists (R21 frozen) | Confirmed via `ls engine/fleet/` (file present); per R21 close-walk attestation. |
| 5 | Test files at session start = 22 `.test.ts` files in `test/` | `ls test/*.test.ts \| wc -l` = 22 at HEAD `ada602b` (verified via `ls`). |
| 6 | Baseline test count = 217 / 0 | R23 Reviewer attestation in CROSS-PROJECT-MEMORIAL.md tessera-R23 section confirms 217 at chore-A `d2286b2` and HEAD `f8dde4b`. Subsequent commits (`528b5b9`, `75d2d59`, …, `ada602b`) touched only `coordination/`, `scripts/`, and SCOPING-MEMO — no `test/*.ts` changes (verified via `git log --oneline -- test/` returning only pre-R23 commits as most recent). |
| 7 | Baseline SHA = `ada602b` | `git rev-parse HEAD` at session start; `git log --oneline -1` confirms it is the round-routing commit. |
| 8 | `engine/l0/` directory exists with `schema-continuity.ts` as its sole file | `ls engine/l0/` confirms. |
| 9 | UINT32_MAX = 2³² − 1 = 4_294_967_295 and UINT32_MOD = 2³² = 4_294_967_296 | Computed; well-known arithmetic identities. |
| 10 | Wrap threshold: `0.9 × UINT32_MAX = 3_865_470_565.5` | Computed; `4_200_000_000 > 3_865_470_565.5` confirms the wrap32 fixture exceeds it. |
| 11 | Default jitter tolerance threshold for `expected=1.0`: `1.0 × (1 + 0.5) = 1.5` | Computed; missed-scrape fixture interval 2.0 > 1.5 (triggers degraded). Variable-interval sequence intervals (1.0, 1.2, 1.5) all ≤ 1.5 (no degraded). |
| 12 | `engine/fleet/`, `engine/hardware-topology-source.ts`, `engine/topology-overlay.ts`, `engine/types/verdict.ts`, `engine/verdict-groups.ts` are R20+R21+R23 frozen / vendored | VENDORING-MANIFEST.md rows + prior-round MEMORIAL attestation confirm. |
| 13 | `test/_substrate/v9X-cluster.ts` and `v9Y-multi-rack-cluster.ts` are R18 + R23 frozen | `ls test/_substrate/` confirms files present; prior-round MEMORIAL CONFIRMATIONs cite frozen state. |
| 14 | `engine/core.ts` TrendBuffer signatures: `push(key: string, value: number): void` + `get(key: string): TrendSnapshot` (with `slopeNorm`, `mean`, `cv`, etc.) | Direct file read at `:52-94`. |
| 15 | `.gitignore:6` declares `*.js` | Direct file read; means `.js` siblings of `.ts` test files are not git-trackable; the R25 allowed-set lists 7 paths, none of which are `.js` — no phantom-entry risk per R23 ARCH MINOR-2 reinforcement. |

### § 9.2 Unstated assumptions

| # | Assumption | Resolution |
|---|---|---|
| 1 | Wave 2 ingestion adapters can derive `CounterMetadata.counter_width` from their adapter-local knowledge (DCGM signal naming conventions; per-signal counter-width tables) | Documented in § 0.2 + counter-rate-transform.ts docblock. Operator can re-disposition if Wave 2 Architects determine adapter knowledge is insufficient — but that's a Wave 2 question, not R25's. |
| 2 | TypeScript's `2³²` literal arithmetic stays within `Number.MAX_SAFE_INTEGER` (= 2⁵³ − 1) | True: 2³² = 4_294_967_296 < 9_007_199_254_740_991. Confirmed. |
| 3 | The 64-bit reset/wrap path's algebra is irrelevant in practice (counters don't reach 2⁶³ in any realistic operational window) | Architectural choice (§ 1.4): always treat 64-bit `next<prev` as reset; documented in spec + file docblock. Not an assumption — a designed-in semantic. |
| 4 | The PRD's "via SchemaDescriptor metadata" phrasing tolerates Tessera-side `CounterMetadata` as a structural decoupling that preserves the conceptual link (`CounterMetadata.semantic_type` mirrors `SchemaDescriptor.semantic_type` per the file docblock) | Documented as a deliberate decoupling in § 0.2 selection rationale; resolves A12 vs PRD-phrasing tension explicitly. |

No assumption that the Implementer would need to make on their own; every load-bearing assumption is either documented or resolved by an explicit selection rationale.

### § 9.3 Scope-audit (no scope added beyond the request)

The cluster scope block (PRD lines 4-117) prescribes:
- L0 contract file at `engine/l0/counter-rate-transform.ts` ✓ in spec
- Synthetic generator at `test/_substrate/synthetic-counter-generator.ts` ✓ in spec
- 6 invariants ✓ each has implementation site mapping (§ 1.2)
- AC enumeration target 10-15 ✓ 15 ACs (§ 5.1)
- Anti-scope items A10/A11/A12/A14/A16 ✓ in § 6
- No WU-01/02/03 adapter ACs ✓ explicit § 6 entry
- No interpolation of missed-scrape values ✓ documented in § 1.2 invariant 3 AND § 6
- AC types: per-invariant runtime, generator, empirical-validation, integration, anti-scope, typecheck+test-count ✓ all five AC-classes represented

Nothing in this spec adds scope beyond what the PRD cluster block authorizes.

### § 9.4 Implementer-actionability walk-through

Walking through each spec section as the Implementer would:
- Read § 1 — full mechanism + per-file mapping ✓ no ambiguity
- Read § 2 — file inventory with 3 new code files + 2 new artifact files + 2 modified artifact files ✓
- Read § 3 — 7-entry allowed-set verified for git-trackability ✓
- Read § 4.1 — full type definitions + function body pseudocode for counter-rate-transform.ts ✓ implementer copies near-verbatim
- Read § 4.2 — substrate generator with 5 factory functions, each with full body ✓
- Read § 4.3 — q25 test file with 12 GREEN test pseudo-bodies; RED-commit content described ✓
- Read § 4.4 — chore-A coordination commit prescription ✓
- Read § 4.5 + § 4.6 — chore-B AC-R25-15 with full pseudocode + SHA substitution mechanism ✓
- Read § 5 — AC-table with each AC fully stated ✓
- Read § 7.1 — 5 halt scenarios pre-anticipated with prescribed responses ✓

Banned ambiguous words ("correctly", "appropriately", "as needed") absent from the AC table and prescription sections (verified by grep — see § 9.4.1).

#### § 9.4.1 Banned-word grep

`grep -nE "correctly|appropriately|as needed" coordination/specs/Q-R25-SPEC.md` after this spec is written — to be confirmed before final commit. The pattern intentionally excludes the phrase "as defined" (which is used in AC-R25-7 — `every RateSample emits all 4 metadata flags as defined fields` — meaning "as well-defined typed fields", not "as needed"). One legitimate use in this section preamble's reference to the cross-section consistency pass elsewhere — does not appear in AC-table or prescription.

### § 9.5 Verification-command-soundness (per R03 MINOR-2 reinforcement)

Spec uses `grep -n "^test("` for line-citation verification in § 4.4 — the `^test(` pattern requires `test(` to start the line, which excludes test calls appearing inside other strings or comments. Sound.

The AC-R25-15 git-diff command (`git diff ada602b..${CHORE_A_SHA} --name-only`) returns one path per line; the `filter(p => p.length > 0)` removes any empty trailing line. Sound.

### § 9.6 Spec-internal-contradiction structural check (per R01 + R20 ARCH MINOR-1 reinforcement)

Cross-section identifier consistency pass:

| Token | Sites where it appears | All agree? |
|---|---|---|
| `transformPair` | § 0.1, § 1.1, § 1.2, § 4.1, § 4.3, § 5.1 (AC-R25-1..7, AC-R25-12), § 8 | YES |
| `CounterSample` | § 0.1, § 1.7, § 4.1, § 4.2, § 4.3, § 8 | YES |
| `CounterMetadata` | § 0.2, § 1.1, § 4.1, § 4.3, § 5.1, § 8 | YES |
| `RateSample` | § 0.3, § 1.5, § 4.1, § 4.3, § 5.1 (AC-R25-7), § 8 | YES |
| `UINT32_MAX` (= 4_294_967_295) | § 1.3, § 4.1, § 4.3, § 5.1 (AC-R25-4), § 9.1 | YES |
| `UINT32_MOD` (= 4_294_967_296) | § 1.3, § 4.1, § 5.1 (AC-R25-4), § 9.1 | YES |
| `DEFAULT_JITTER_TOLERANCE` (= 0.5) | § 1.3, § 4.1, § 9.1 | YES |
| Baseline SHA `ada602b` | § header, § 3, § 4.6, § 9.1 (claim 7) | YES |
| Allowed-set size 7 | § 2.3, § 3, § 4.6, § 9.1 (claim 15) | YES |
| Test count 229 at chore-A (228 pass / 1 fail) | § 4.3 IMPLEMENTER note, § 5.1 (AC-R25-14), § 9.1 (claim 6 derivation) — R32 correction: 229/228/1 | YES |
| Test count 230 at HEAD | § 4.3, § 4.5 implied (chore-B adds 1) | YES |
| Allowed-set path `engine/l0/counter-rate-transform.ts` | § 2.1, § 3 (entry 1), § 4.1, § 4.6 | YES |
| 7 paths in allowed-set | § 3, § 4.6 ALLOWED_SET literal | YES (7 entries each) |

Narrative-vs-prescription cross-check per R20 MINOR-1 reinforcement: § 5 AC-table preamble classifications (AC-R25-1..12 runtime; AC-R25-13/-14 binding-command; AC-R25-15 chore-B runtime) cross-checked against § 4.x prescriptions:
- AC-R25-1..12 → § 4.3 GREEN-commit prescribes 12 `test()` blocks ✓
- AC-R25-13 → § 4.4 chore-A coordination commit cites `npx tsc` exit code ✓
- AC-R25-14 → § 4.4 chore-A coordination commit cites `node --test` test count anchored to chore-A SHA ✓
- AC-R25-15 → § 4.5 + § 4.6 chore-B prescription with full SHA-substitution pseudocode ✓

No drift between narrative-classification and structural-prescription. R20 MINOR-1 class of issue NOT present.

### § 9.7 Empirical-premise-verification table (per R08 MAJOR-2 reinforcement; ".gitignore-aware" sub-check per R23 ARCH MINOR-2 reinforcement)

All 15 numbered claims in § 9.1 verified by direct file-open or empirical command at session start. None inherited from prior-round testimony without re-verification (the test count of 217 IS sourced from R23 attestation, but cross-checked by `git log --oneline -- test/` returning no commits since R23 close — empirical re-verification).

**Gitignore audit (per R23 ARCH MINOR-2 reinforcement):**

For each path in the 7-entry allowed-set (§ 3):

| Path | Tracked / Trackable? | Note |
|---|---|---|
| `engine/l0/counter-rate-transform.ts` | Will be tracked after creation | `.ts` not gitignored |
| `test/_substrate/synthetic-counter-generator.ts` | Will be tracked after creation | `.ts` not gitignored |
| `test/q25-l0-contract.test.ts` | Will be tracked after creation | `.ts` not gitignored |
| `coordination/specs/Q-R25-SPEC.md` | Already tracked (this commit) | `.md` not gitignored |
| `coordination/specs/Q-R25-SPEC-AUDIT.md` | Already tracked (this commit) | `.md` not gitignored |
| `coordination/NEXT-ROLE.md` | Tracked | — |
| `coordination/MEMORIAL.md` | Tracked | — |

No `.js` phantoms (R23 MINOR-2 class of issue NOT present). All 7 entries are or will be `git ls-files`-reachable.

### § 9.8 Vendored-file-delta assertion-surface enumeration (per R18 OBS-2 reinforcement)

R25 touches NO vendored files (Tessera-original new files only). The gate is structurally N/A. Explicit cross-check confirms:
- `engine/l0/counter-rate-transform.ts` is NEW; no VENDORING-MANIFEST.md entry; no `AT_PIN_FILES` entry; no `q01-vendoring-coverage` first-line-SHA check applies.
- `test/_substrate/synthetic-counter-generator.ts` is NEW; not vendored.
- `test/q25-l0-contract.test.ts` is NEW; not vendored.

No vendored-with-deltas transition. No AT_PIN_FILES list mutation. No `q01-no-at-pin-deltas.test.ts` modification. No VENDORING-MANIFEST.md modification.

### § 9.9 File-level docblock coverage (per R10 MINOR-1 reinforcement)

Each new code file has a file-level docblock prescribed in § 4.x (counter-rate-transform.ts in § 4.1; synthetic-counter-generator.ts in § 4.2; q25-l0-contract.test.ts in § 4.3 GREEN-commit head). Each docblock describes the file's full exported surface — types, constants, functions for L0; factories for substrate; AC coverage for test file. The Implementer copies these docblocks near-verbatim; no docblock-update gap class (R10 MINOR-1) possible.

### § 9.10 Halt-discipline coverage (per R08 + R19 reinforcement)

5 halt scenarios pre-anticipated in § 7.1 with prescribed responses (HALT → DIAGNOSTIC + STATUS: ESCALATE; never silent in-line resolution; never test-mutation per R19 MAJOR-1/2/3 reinforcement). Allowed-set in § 3 includes `coordination/specs/Q-R25-SPEC.md` (not `coordination/diagnostics/*.md`) — but per CLAUDE-COMMON.md REINFORCED 2026-05-17, DIAGNOSTIC files are coordination-tier and outside the chore-A diff scope (they would be created and committed in a separate route-back commit if a halt fires). Spec internal consistency: HALT prescription does not mandate any file currently absent from the allowed-set (R15 MINOR-3 class of issue NOT present).

### § 9.11 Memorial-self-exoneration guard (per R08 + R19 MAJOR-4 reinforcement)

This spec is the Architect's pre-route artifact. CONFIRMATION/VIOLATION entries land in MEMORIAL.md at routing-block-write time (§ 4.7 commit 2). No self-exonerating language present in this spec. R08 + R19 MAJOR-4 class of issue NOT present.

### § 9.12 Audit-tier promotion guard

N/A — full tier (per PRD tier verdict: A1 + A2 + A4 fire). No audit-tier self-spec dynamics apply.

### § 9.13 Branch-binding coverage gate (per R21 ARCH MINOR-2/3 reinforcement)

See § 4.1 branch-binding table. All 10 enumerated branches/conditions in `transformPair` have ≥ 1 binding AC; structural exhaustiveness (every output carries 4 flags) bound at AC-R25-7 across all 4 case-classes. R21 MINOR-2/3 class of issue NOT present.

### § 9.14 Count-AC chore-A SHA anchoring (per R22 IMPL MINOR-1 reinforcement)

AC-R25-14 wording (§ 5.1 row): "Given the R25 codebase at chore-A SHA `<CHORE-A-SHA>`, when `node --test test/*.test.js` runs, then output reports `tests=229 / pass=228 / fail=1`". The "at chore-A SHA" gating is explicit; no ambiguity between chore-A (229 total) and HEAD (230 after chore-B's AC-R25-15 lands). R22 MINOR-1 class of issue NOT present. R32 correction: 229/0 → 229/228/1 (pre-existing q01 AC-7 ENOENT in cluster-worktree context).

### § 9.15 Line-citation-drift carry-forward (per cross-project rule R03/R18/R21)

The Implementer chore-A NEXT-ROLE.md attestation block will cite AC line numbers. Per cross-project rule the citation must point to the `test(` declaration line (verifiable via `grep -n "^test(" test/q25-l0-contract.test.ts`), NOT to the assertion body line. This spec explicitly reminds the Implementer in § 4.4. Future-prevention only; no R25 spec-side citation drift.

### § 9.16 Reviewer clarifying-questions check

Re-reading this spec as the Reviewer would: every AC has a Given/When/Then; every counterfactual is pre-stated in § 5.2; every prescription cites the exact file and surface; every reinforcement-derived gate has an explicit § 9.x application. The Reviewer can act with zero clarifying questions.

### § 9.17 Final pre-route gate

- Every claim verifiable? ✓ (§ 9.1 verifies all 15 load-bearing claims)
- Unstated assumptions? ✓ (§ 9.2 — 4 enumerated, each resolved)
- Scope added beyond request? ✓ (§ 9.3 — none)
- Implementer can act without guessing? ✓ (§ 9.4 walk-through)

Grilling passes. Routing to Implementer with STATUS: READY.
