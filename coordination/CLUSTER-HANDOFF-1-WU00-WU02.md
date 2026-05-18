# CLUSTER-HANDOFF-1-WU00-WU02 — WU-00 L0-CONTRACT → WU-02 K8S-ADAPTER

**From:** Coordinator TPM (R27)
**Date:** 2026-05-18
**Wave:** Source cluster CL-01-A (Wave 1) → Target cluster CL-02-B (Wave 2)
**Foundation:** `WAVE-PLAN-02.md` §WU-00 + §WU-02; `coordination/reviews/REVIEWER-REPORT-R25.md`; `coordination/WAVE-GATE-01.md`
**Type:** cross-cluster dependency contract

---

## Purpose

WU-02 (Kubernetes node-label API adapter) consumes the L0 contract surface that WU-00 landed. This artifact is the interface WU-02's Architect builds against — not a pointer to go read WU-00's spec, but the concrete description of the function signature, types, and behavioral guarantees the K8S adapter receives.

The Coordinator verified at Wave 1 gate that the artifacts described below exist at the stated locations on main HEAD `3308681`.

---

## Dependency edge

- **Source cluster:** CL-01-A
- **Source work unit:** WU-00 — L0-CONTRACT (Tessera Phase 2 SLICE 3.A.5)
- **Target cluster:** CL-02-B
- **Target work unit:** WU-02 — K8S-ADAPTER
- **Dependency test that fired:** D2 (AC reference / interface contract)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** Per SCOPING-MEMO § 3 SLICE 3.B line 365 ("adapters know they receive rate-domain values with elapsed-seconds metadata; do not re-implement counter handling"), the K8S adapter consumes the L0 contract surface BY INTERFACE. The Kubernetes `corev1.NodeList` JSON shape is not counter-typed — it parses node labels — so the dependency is interface-only (not direct counter-arm exercise like WU-03). The L0 contract still binds because the K8S adapter is expected to construct `CounterMetadata` for any signals it forwards and pass them through `transformPair` rather than re-implementing per-adapter rate semantics.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `counter-rate-transform.ts` | `engine/l0/counter-rate-transform.ts` (158 lines; Tessera-original) | The L0 contract module. Exports `transformPair`, public types (`CounterSample`, `CounterMetadata`, `TransformOpts`, `RateSample`), and constants (`UINT32_MAX`, `UINT32_MOD`, `DEFAULT_JITTER_TOLERANCE`, `DEFAULT_WRAP_THRESHOLD_RATIO`). |
| `synthetic-counter-generator.ts` | `test/_substrate/synthetic-counter-generator.ts` (91 lines; Tessera-original) | Test substrate with 5 factories: `makeCleanPair`, `makeMissedScrapePair`, `makeWrap32Pair`, `makeResetPair`, `makeVariableIntervalSequence`. Adapter clusters MAY reuse these factories in their own test files. |
| `q25-l0-contract.test.ts` | `test/q25-l0-contract.test.ts` (204 lines) | Reference exercising all six invariants. Adapter clusters MAY read but MUST NOT modify (pre-R26 test file frozen per Wave 1 anti-scope). |

### Interface contract

**Pure-function signature** (`engine/l0/counter-rate-transform.ts:94`):

```typescript
export function transformPair(
  prev: CounterSample,
  next: CounterSample,
  meta: CounterMetadata,
  opts: TransformOpts,
): RateSample;
```

**Input types:**

```typescript
export interface CounterSample {
  value: number;                 // cumulative count for counters; instantaneous value otherwise
  ts_seconds: number;            // sample timestamp (epoch or relative; only differences matter)
}

export interface CounterMetadata {
  semantic_type: string;         // 'counter' | 'gauge' | 'ratio' | 'latency_quantile' | 'categorical_rate'
                                 // Mirrors engine/l0/schema-continuity.ts:44.
                                 // Only the literal 'counter' triggers rate-domain transform.
  counter_width?: 32 | 64;       // Used only when semantic_type === 'counter'.
                                 // Defaults to 64 (no wraparound expected).
                                 // DCGM 32-bit counters: pass 32.
}

export interface TransformOpts {
  expected_scrape_interval_seconds: number;   // required — adapter declares scheduling cadence
  jitter_tolerance?: number;                   // default 0.5 → degraded threshold = expected × 1.5
  wrap_threshold_ratio?: number;               // default 0.9 → wrap heuristic = 0.9 × UINT32_MAX
}
```

**Output type:**

```typescript
export interface RateSample {
  value: number | null;                          // per-second rate for counters; pass-through value for non-counter; null when reset_detected
  actual_elapsed_seconds: number;                // next.ts_seconds − prev.ts_seconds (always emitted; invariant 2)
  slope_quality: 'normal' | 'degraded';          // 'degraded' iff missed_scrape_inferred
  missed_scrape_inferred: boolean;               // true iff actual_elapsed_seconds > expected × (1 + jitter_tolerance)
  wraparound_handled: boolean;                   // true iff the 32-bit wraparound corrective path fired
  reset_detected: boolean;                       // true iff next < prev fell through to the reset path; value is null
}
```

**Behavioral guarantees (six invariants — full enumeration in `coordination/specs/Q-R25-SPEC.md` § 1.2):**

1. **Rate-domain output for counter signals.** `semantic_type === 'counter'` triggers `delta / actual_elapsed_seconds`; raw cumulative counters never reach downstream.
2. **`actual_elapsed_seconds` is first-class.** Always derived per-pair from sample timestamps and always emitted on the `RateSample`.
3. **Missed-scrape detection.** Elapsed > expected × (1 + jitter) flags `slope_quality: 'degraded'` + `missed_scrape_inferred: true`. No interpolation.
4. **32-bit wraparound handling.** Only fires when `counter_width === 32` AND `next.value < prev.value` AND `prev.value > wrap_threshold_ratio × UINT32_MAX`. Corrected rate via `(UINT32_MOD − prev.value + next.value) / actual_elapsed_seconds`.
5. **Reset-vs-wrap disambiguation.** Any other `next < prev` → `value: null`, `reset_detected: true`.
6. **Metadata propagation.** All four flags emitted on every `RateSample`.

**Caller responsibilities (NOT WU-00's scope):**

- Per-key prev-sample state management (adapters maintain their own `Map<series_key, CounterSample>` or equivalent).
- First-scrape edge case (signature requires non-optional `prev`; the adapter decides when to skip the first sample for a new key).
- Constructing `CounterMetadata` from the adapter's adapter-local knowledge of signal semantics + counter width.

---

## Verification status

Per `REVIEWER-REPORT-R25.md` § 2 + Coordinator gate § Findings by cluster CL-01-A:

- [x] Output artifact exists at the stated location (`engine/l0/counter-rate-transform.ts`, 158 lines; verified at gate via main HEAD `3308681`).
- [x] Interface contract matches the Reviewer's per-AC verification (12 PASS / 1 FAIL env / 2 PARTIAL spec-drift; transformPair functional surface confirmed correct by AC-R25-1 through AC-R25-12).
- [x] No CRITICAL findings in source cluster's Reviewer report affect this contract (3 MAJORs are spec/audit-trail drift, not behavioral defects in transformPair).
- [x] Anti-scope clauses from source cluster's scope do not unexpectedly bound this output. WU-00's allowed-set (7 entries + 1 DIAGNOSTIC) covers only the L0 transform module + its substrate + its test + Architect/Reviewer artifacts; no inherited file modified.

---

## What the target cluster must not assume

- WU-00 did NOT produce a `TopologySource` interface implementation — that is WU-02's scope.
- WU-00 did NOT produce any K8s-specific parsing code (no `corev1.NodeList` JSON shape mapping) — that is WU-02's scope.
- The interface contract does NOT include first-scrape state management — adapters maintain per-key prev-sample state themselves; `transformPair` requires a non-optional `prev`.
- The interface contract does NOT include `expected_scrape_interval_seconds` defaulting — the adapter MUST supply this in `TransformOpts`; there is no default.
- `transformPair`'s output is NOT guaranteed to handle multi-counter aggregation. If the K8S adapter produces multiple counters per scrape pair, it invokes `transformPair` once per counter; aggregation across counters (if any) is the adapter's responsibility.
- The L0 contract surface is NOT guaranteed to extend to vendored downstream consumers automatically. Pushing `RateSample.value` into `TrendBuffer` is the adapter's responsibility (see `test/q25-l0-contract.test.ts:155-175` AC-R25-12 for the reference pattern).
- Non-counter signals (`semantic_type !== 'counter'`) pass through value-domain UNCHANGED — adapter should NOT assume `transformPair` re-shapes gauge/ratio/latency_quantile values.

---

## Pre-flags from wave gate

- **L0 contract location is now Wave-1-frozen.** Any need to modify `engine/l0/counter-rate-transform.ts` body is a halt condition — route back to Coordinator, do NOT modify silently. The contract is functionally stable per Reviewer's per-AC verification.
- **Cluster worktree DeploySignal sibling unavailable.** `~/projects/tessera-clusters/<id>/` worktrees lack `../deploysignal`. `q01 AC-7` (`should fail when verdict.ts byte-identity broken`) WILL fail environmentally. Baseline test count at Wave 2 cluster session entry expected `tests=230 / pass=229 / fail=1` (post-Wave-1 merge); confirm empirically via `node --test test/*.test.js` at Architect session start. Spec must encode the actual baseline + the q01 ENOENT acknowledgment in its § 9.1-class claims; do NOT cite cross-round attestations from memory (see R25 MAJOR-1 / MINOR-1).
- **`tsc` exit code reality.** `npx tsc -p tsconfig.test.json` exits non-zero (= 2) at baseline due to TS5107 (`moduleResolution=node10` deprecation) + TS2688 (`@types/node` missing). Pre-existing infra, not Wave 1 introduced. Spec's typecheck binding-command AC MUST encode the actual exit code, not a literal "exit 0" that the environment cannot satisfy. If the AC's substantive intent is "no NEW typecheck regressions from this round's code", the AC text should be phrased that way and the Implementer's attestation must report the actual exit code honestly. Per R26 MAJOR-1: do NOT reframe errors as "warnings"; do NOT attest exit 0 if exit is 2.
- **R25 MINOR-3 advisory — gauge + missed_scrape combination not behaviorally bound.** If WU-02's adapter tests push any gauge value through `transformPair` with a missed-scrape-shaped interval (elapsed > expected × 1.5), they can incidentally close the R25 MINOR-3 coverage gap. Not load-bearing for WU-02 acceptance; optional.

---

## Halt conditions for target cluster

1. The L0 contract surface needs to be modified (e.g., adding fields to `RateSample`, adding parameters to `transformPair`) → route back to Coordinator; the surface is Wave-1-frozen.
2. The K8s `corev1.NodeList` parsing surface requires a contract type not present in WU-00's exports (`CounterSample` / `CounterMetadata` / `TransformOpts` / `RateSample` insufficient) → route back; the handoff artifact needs amendment, not a cluster-internal workaround.
3. The cluster's empirical baseline (`node --test` at chore-A SHA) differs from the expected 230/229/1 in ways not attributable to either q01 ENOENT or this round's own new tests → HALT with DIAGNOSTIC; this would indicate a Wave 1 merge issue not caught at gate.
4. The adapter spec needs `engine/topology-overlay.ts` body modification (read-only consumer pattern violated) → HALT; this is the same anti-scope class as R23 had with HardwareTopologySource.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 1 gate (R27) | 2026-05-18 | CURRENT | Emitted at Wave 1 gate authorizing Wave 2 dispatch. L0 contract surface verified at main HEAD `3308681`. |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 1 gate (R27) — authorizing Wave 2 dispatch of WU-02 K8S-ADAPTER |
