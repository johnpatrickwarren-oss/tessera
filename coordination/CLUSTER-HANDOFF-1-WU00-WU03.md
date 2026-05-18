# CLUSTER-HANDOFF-1-WU00-WU03 — WU-00 L0-CONTRACT → WU-03 NVLINK-ADAPTER

**From:** Coordinator TPM (R27)
**Date:** 2026-05-18
**Wave:** Source cluster CL-01-A (Wave 1) → Target cluster CL-02-C (Wave 2)
**Foundation:** `WAVE-PLAN-02.md` §WU-00 + §WU-03; `coordination/reviews/REVIEWER-REPORT-R25.md`; `coordination/WAVE-GATE-01.md`
**Type:** cross-cluster dependency contract

---

## Purpose

WU-03 (NVIDIA `nvidia-smi nvlink --status` adapter) consumes the L0 contract surface that WU-00 landed AND is the exemplary L0-contract consumer for the 32-bit wraparound path. This artifact is the interface WU-03's Architect builds against — not a pointer to go read WU-00's spec, but the concrete description of the function signature, types, and behavioral guarantees the NVLINK adapter receives.

**WU-03 is structurally different from WU-01 SLURM and WU-02 K8S:** NVLink error counters are 32-bit (per SCOPING-MEMO § 2.3 invariant 4 + § 4.2 R-E7 risk row); the NVLINK adapter directly exercises WU-00's `counter_width === 32` wraparound path, missed-scrape catchup, and reset-vs-wrap disambiguation against the synthetic counter generator substrate. This is the load-bearing R-E7 mitigation.

The Coordinator verified at Wave 1 gate that the artifacts described below exist at the stated locations on main HEAD `3308681`.

---

## Dependency edge

- **Source cluster:** CL-01-A
- **Source work unit:** WU-00 — L0-CONTRACT (Tessera Phase 2 SLICE 3.A.5)
- **Target cluster:** CL-02-C
- **Target work unit:** WU-03 — NVLINK-ADAPTER
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Per SCOPING-MEMO § 4.2 R-E7 + § 2.3 invariant 4 ("several NVLink error counters are 32-bit and can wrap on busy fabric over long runs"), the NVLINK adapter's test surface MUST exercise WU-00's wraparound, missed-scrape, and variable-interval paths against the synthetic counter generator. The adapter directly imports and exercises WU-00's transformation surface — not just the interface contract. This is the asymmetric D1 HIGH edge per WAVE-PLAN-02 Step 3 Judgment call 1.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `counter-rate-transform.ts` | `engine/l0/counter-rate-transform.ts` (158 lines; Tessera-original) | The L0 contract module. Exports `transformPair`, public types (`CounterSample`, `CounterMetadata`, `TransformOpts`, `RateSample`), and constants (`UINT32_MAX`, `UINT32_MOD`, `DEFAULT_JITTER_TOLERANCE`, `DEFAULT_WRAP_THRESHOLD_RATIO`). |
| `synthetic-counter-generator.ts` | `test/_substrate/synthetic-counter-generator.ts` (91 lines; Tessera-original) | Test substrate with 5 factories. **WU-03 is the primary consumer** of `makeWrap32Pair`, `makeMissedScrapePair`, and `makeVariableIntervalSequence` for the R-E7 mitigation evidence package. |
| `q25-l0-contract.test.ts` | `test/q25-l0-contract.test.ts` (204 lines) | Reference exercising all six invariants. WU-03 MAY read for AC pattern reference but MUST NOT modify (pre-R26 test file frozen per Wave 1 anti-scope). |

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
                                 // ★ WU-03: NVLink error counters MUST pass counter_width: 32.
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
4. **32-bit wraparound handling.** Only fires when `counter_width === 32` AND `next.value < prev.value` AND `prev.value > wrap_threshold_ratio × UINT32_MAX`. Corrected rate via `(UINT32_MOD − prev.value + next.value) / actual_elapsed_seconds`. ★ **R-E7 mitigation path — WU-03's primary exercise surface.**
5. **Reset-vs-wrap disambiguation.** Any other `next < prev` → `value: null`, `reset_detected: true`.
6. **Metadata propagation.** All four flags emitted on every `RateSample`.

**WU-03 R-E7 mitigation responsibilities (load-bearing for adapter acceptance):**

WU-03's Architect spec MUST enumerate AC coverage for:

- **The 32-bit wrap path on NVLink error counters.** AC consumes `makeWrap32Pair` from `test/_substrate/synthetic-counter-generator.ts` (which produces `prev.value = 4_200_000_000` > 0.9 × UINT32_MAX with small `next.value = 50`) and asserts `wraparound_handled: true` + corrected rate per invariant 4.
- **Missed-scrape catchup on NVLink counters.** AC consumes `makeMissedScrapePair` and asserts `missed_scrape_inferred: true` + `slope_quality: 'degraded'` on a counter-typed call (NOT a gauge call).
- **Variable-interval rate normalization.** AC consumes `makeVariableIntervalSequence`, runs each adjacent pair through `transformPair`, and asserts that mean(RateSample.value) ≈ rate_per_second within reasonable tolerance (use 0.001 / 0.01 — see R25 MAJOR-3 for the empirical tolerance reality; the spec's prescribed 1e-9 is empirically infeasible on the synthetic substrate).
- **Reset-vs-wrap disambiguation for NVLink counters.** AC consumes `makeResetPair` (prev = 5000, below wrap threshold) with `counter_width: 32` and asserts `reset_detected: true` + `value: null`.

**Caller responsibilities (NOT WU-00's scope):**

- Per-key prev-sample state management (adapters maintain their own `Map<series_key, CounterSample>` or equivalent).
- First-scrape edge case (signature requires non-optional `prev`; the adapter decides when to skip the first sample for a new key).
- Constructing `CounterMetadata` from the adapter's adapter-local knowledge of signal semantics + counter width.
- ★ **For NVLink adapter specifically:** mapping `nvidia-smi nvlink --status` text output to typed records and constructing `CounterMetadata{ semantic_type: 'counter', counter_width: 32 }` for each NVLink error counter.

---

## Verification status

Per `REVIEWER-REPORT-R25.md` § 2 + Coordinator gate § Findings by cluster CL-01-A:

- [x] Output artifact exists at the stated location (`engine/l0/counter-rate-transform.ts`, 158 lines; verified at gate via main HEAD `3308681`).
- [x] Interface contract matches the Reviewer's per-AC verification (12 PASS / 1 FAIL env / 2 PARTIAL spec-drift; transformPair functional surface confirmed correct by AC-R25-1 through AC-R25-12). Specifically AC-R25-4 (32-bit wraparound) + AC-R25-3 (missed-scrape detection) + AC-R25-12 (variable-interval TrendBuffer integration) verify the R-E7 mitigation paths WU-03 will exercise.
- [x] No CRITICAL findings in source cluster's Reviewer report affect this contract (3 MAJORs are spec/audit-trail drift, not behavioral defects in transformPair).
- [x] Anti-scope clauses from source cluster's scope do not unexpectedly bound this output. WU-00's allowed-set (7 entries + 1 DIAGNOSTIC) covers only the L0 transform module + its substrate + its test + Architect/Reviewer artifacts; no inherited file modified.

---

## What the target cluster must not assume

- WU-00 did NOT produce a `TopologySource` interface implementation — that is WU-03's scope.
- WU-00 did NOT produce any NVLink-specific parsing code (no `nvidia-smi nvlink --status` text parser) — that is WU-03's scope.
- WU-00 did NOT produce hardware diagnosis tooling. Per A10 anti-scope (and the MR-1 carve-out), NVLink error counter ingestion is the measurement-domain L0 preprocessing; classification of the counter values as GPU-health attribution remains fenced.
- The interface contract does NOT include first-scrape state management — adapters maintain per-key prev-sample state themselves; `transformPair` requires a non-optional `prev`.
- The interface contract does NOT include `expected_scrape_interval_seconds` defaulting — the adapter MUST supply this in `TransformOpts`; there is no default.
- `transformPair`'s output is NOT guaranteed to handle multi-counter aggregation. The NVLINK adapter invokes `transformPair` once per NVLink error counter; aggregation across counters (if any) is the adapter's responsibility.
- The L0 contract surface is NOT guaranteed to extend to vendored downstream consumers automatically. Pushing `RateSample.value` into `TrendBuffer` is the adapter's responsibility (see `test/q25-l0-contract.test.ts:155-175` AC-R25-12 for the reference pattern).
- The wraparound path is NOT guaranteed to fire for 64-bit counters. NVLink adapters MUST pass `counter_width: 32` for error counters; defaulting to 64-bit silently re-classifies wrap events as resets (returns `value: null`) — this is the wrong behavior for NVLink and would NOT surface as a typecheck failure.

---

## Pre-flags from wave gate

- **L0 contract location is now Wave-1-frozen.** Any need to modify `engine/l0/counter-rate-transform.ts` body is a halt condition — route back to Coordinator, do NOT modify silently. The contract is functionally stable per Reviewer's per-AC verification.
- **Cluster worktree DeploySignal sibling unavailable.** `~/projects/tessera-clusters/<id>/` worktrees lack `../deploysignal`. `q01 AC-7` (`should fail when verdict.ts byte-identity broken`) WILL fail environmentally. Baseline test count at Wave 2 cluster session entry expected `tests=230 / pass=229 / fail=1` (post-Wave-1 merge); confirm empirically via `node --test test/*.test.js` at Architect session start. Spec must encode the actual baseline + the q01 ENOENT acknowledgment in its § 9.1-class claims; do NOT cite cross-round attestations from memory (see R25 MAJOR-1 / MINOR-1).
- **`tsc` exit code reality.** `npx tsc -p tsconfig.test.json` exits non-zero (= 2) at baseline due to TS5107 (`moduleResolution=node10` deprecation) + TS2688 (`@types/node` missing). Pre-existing infra, not Wave 1 introduced. Spec's typecheck binding-command AC MUST encode the actual exit code, not a literal "exit 0" that the environment cannot satisfy. If the AC's substantive intent is "no NEW typecheck regressions from this round's code", the AC text should be phrased that way and the Implementer's attestation must report the actual exit code honestly. Per R26 MAJOR-1: do NOT reframe errors as "warnings"; do NOT attest exit 0 if exit is 2.
- **★ R25 MINOR-2 — counter-arm default `?? 64` unbound by AC. WU-03 is the natural home to close this gap.** The `width = meta.counter_width ?? 64` default fallback in `engine/l0/counter-rate-transform.ts:119` is exercised only when `counter_width` is omitted. Since WU-03 deals with the 32-bit / 64-bit distinction explicitly (NVLink error counters are 32-bit; most other NVIDIA counters are 64-bit), the Architect can add a binding AC that calls `transformPair(prev, next, { semantic_type: 'counter' }, opts)` (no `counter_width` key) with `prev.value > next.value` and verifies `reset_detected === true` — this exercises the default-64 path and closes the R21 ARCH MINOR-2/3 branch-binding gap left open by R25. Not load-bearing for WU-03 acceptance; opportunistic.
- **R25 MAJOR-3 empirical tolerance reality.** The reference test `test/q25-l0-contract.test.ts:173-174` ships AC-R25-12 at 0.001 / 0.01 tolerance per operator-dispositioned Option A. The spec's prescribed 1e-9 in § 4.3 / § 5.1 is empirically infeasible on the synthetic substrate due to floating-point accumulation across 10+ TrendBuffer pushes. WU-03's variable-interval AC should likewise use 0.001 / 0.01-class tolerances rather than 1e-9.

---

## Halt conditions for target cluster

1. The L0 contract surface needs to be modified (e.g., adding fields to `RateSample`, adding parameters to `transformPair`, exposing additional constants) → route back to Coordinator; the surface is Wave-1-frozen.
2. The `nvidia-smi nvlink --status` parsing surface requires a contract type not present in WU-00's exports (`CounterSample` / `CounterMetadata` / `TransformOpts` / `RateSample` insufficient) → route back; the handoff artifact needs amendment, not a cluster-internal workaround.
3. The cluster's empirical baseline (`node --test` at chore-A SHA) differs from the expected 230/229/1 in ways not attributable to either q01 ENOENT or this round's own new tests → HALT with DIAGNOSTIC; this would indicate a Wave 1 merge issue not caught at gate.
4. The adapter spec needs `engine/topology-overlay.ts` body modification (read-only consumer pattern violated) → HALT; this is the same anti-scope class as R23 had with HardwareTopologySource.
5. ★ The R-E7 mitigation evidence (32-bit wrap / missed-scrape / variable-interval) cannot be constructed against the WU-00 synthetic counter generator substrate — e.g., the factories' parameter shape is insufficient for an NVLink-specific scenario — route back rather than write a parallel substrate; this would indicate a WU-00 substrate gap worth amending.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 1 gate (R27) | 2026-05-18 | CURRENT | Emitted at Wave 1 gate authorizing Wave 2 dispatch. L0 contract surface verified at main HEAD `3308681`. D1 HIGH edge from WAVE-PLAN-02 Step 2 + Step 3 Judgment call 1 affirmed: WU-03 is the load-bearing R-E7 mitigation consumer. |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 1 gate (R27) — authorizing Wave 2 dispatch of WU-03 NVLINK-ADAPTER |
