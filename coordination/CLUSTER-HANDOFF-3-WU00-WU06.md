# CLUSTER-HANDOFF-3-WU00-WU06 — WU-00 L0-CONTRACT → WU-06 EVENT-CONDITIONAL ATTRIBUTION

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-01-A (Wave 1) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 Step 2 inbound edges; `coordination/reviews/REVIEWER-REPORT-R25.md`; `coordination/CLUSTER-HANDOFF-1-WU00-WU01.md` (precedent interface description); `WAVE-GATE-03.md`
**Type:** cross-cluster dependency contract (D2 MEDIUM — event-feed schema may reference L0 contract for counter-typed metadata; interface-only edge)

---

## Purpose

WU-06 (event-feed ingestion + event-conditional attribution) MAY consume the WU-00 L0 contract surface IF the event-feed schema includes any counter-typed metadata fields (e.g., per-event resource-impact counts; cumulative deploy-pipeline event counters). The dependency is INTERFACE-ONLY — WU-06 does NOT import `transformPair` in its hot path. Analogous in shape to the WU-00 → WU-01 SLURM and WU-00 → WU-02 K8S edges at Wave 2 (D2 MEDIUM precedent: adapter knows L0 contract exists by interface; does not exercise the wrap-handling path empirically).

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-1→Wave-4 cross-wave edge is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch.

---

## Dependency edge

- **Source cluster:** CL-01-A
- **Source work unit:** WU-00 — L0-CONTRACT (counter-rate transform; Tessera Phase 2 SLICE 3.A.5; R25)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (event-feed ingestion + event-conditional attribution; the event-feed substrate side of WU-06 is the load-bearing consumer IF event-feed schema includes counter-typed fields)
- **Dependency test that fired:** D2 (AC reference / interface contract)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** Event-feed substrate is operator-level event abstraction (firmware push, model redeploy, env change, config change, capacity change per SCOPING-MEMO § 2.3 5-class enumeration) — primarily timestamped event metadata, NOT counter-typed telemetry. The L0 contract dependency is conditional: IF event-feed schema includes counter-typed metadata fields (e.g., per-event resource-delta counters), WU-06 reads the L0 contract surface by interface to confirm pass-through value-domain semantics for the counter fields. If event-feed schema is purely event-metadata (no counter fields), the D2 edge degrades to "WU-06 knows L0 contract exists for architectural coherence" — comparable to WU-01 SLURM / WU-02 K8S Wave 2 precedent.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `counter-rate-transform.ts` | `engine/l0/counter-rate-transform.ts` (158 lines; Tessera-original) | Pure-function `transformPair(prev, next, meta, opts) → RateSample`. 6 behavioral invariants: rate-domain output for counter signals; `actual_elapsed_seconds` first-class; missed-scrape detection (`slope_quality: 'degraded'`, `missed_scrape_inferred: true`); 32-bit wraparound (only when `counter_width === 32` AND `next < prev` AND above wrap threshold); reset-vs-wrap disambiguation (`value: null`, `reset_detected: true`); metadata propagation (all four flags on every `RateSample`). |
| `synthetic-counter-generator.ts` | `test/_substrate/synthetic-counter-generator.ts` (91 lines; 5 factories) | `makeCleanPair()`, `makeMissedScrapePair()`, `makeWrap32Pair()`, `makeResetPair()`, `makeVariableIntervalSequence(...)`. Used at WU-03 NVLINK + R32 q25 + WU-06 IF event-feed schema includes counter-typed fields. |
| `q25-l0-contract.test.ts` | `test/q25-l0-contract.test.ts` | 14+ ACs covering all 6 invariants + R32 added AC for R25 MINOR-3 (gauge + missed_scrape combination). |
| `Q-R25-SPEC.md` | `coordination/specs/Q-R25-SPEC.md` | R25 Architect spec (R32 amended for R25 MAJOR-1/2/3 spec drift closures; AC-R25-12 tolerances 0.001/0.01; AC-R25-14 baseline 229/228/1; § 3 8th allowed-set DIAGNOSTIC). |
| `REVIEWER-REPORT-R25.md` | `coordination/reviews/REVIEWER-REPORT-R25.md` | R25 Reviewer report: 0 CRITICAL / 3 MAJOR (all CLOSED at R32) / 3 MINOR (MINOR-1 bundled; MINOR-2 closed at R30 + R32; MINOR-3 closed at R32). |

### Six L0 invariants (the contract surface WU-06 reads by interface)

1. **Rate-domain output for counter signals.** When `meta.semantic_type === 'counter'`, L0 emits rate (units / `actual_elapsed_seconds`). Raw cumulative counter values NEVER reach downstream consumers.
2. **`actual_elapsed_seconds` is first-class.** Every `RateSample` carries `actual_elapsed_seconds` computed from sample timestamps.
3. **Missed-scrape detection.** When `actual_elapsed_seconds > expected_scrape_interval × (1 + jitter_tolerance)`, emit with `slope_quality: 'degraded'` AND `missed_scrape_inferred: true`. No interpolation.
4. **32-bit wraparound (counter-width-aware).** When `counter_width === 32` AND `next < prev` AND above wrap threshold, classify as wraparound; emit rate via `(width_max - prev + next) / actual_elapsed_seconds` with `wraparound_handled: true`.
5. **Reset-vs-wrap disambiguation.** When `next < prev` AND wraparound threshold not met, classify as reset; emit `value: null` + `reset_detected: true`.
6. **L0 metadata propagation.** `slope_quality`, `missed_scrape_inferred`, `wraparound_handled`, `reset_detected` flags propagate alongside every rate value.

### Interface signature (TypeScript)

```typescript
// From engine/l0/counter-rate-transform.ts (READ-ONLY for WU-06)
export function transformPair(
  prev: CounterSample,
  next: CounterSample,
  meta: CounterMetadata,  // includes semantic_type, counter_width
  opts: TransformOpts     // includes expected_scrape_interval_seconds, jitter_tolerance
): RateSample;

export interface RateSample {
  value: number | null;  // null on reset
  actual_elapsed_seconds: number;
  slope_quality: 'normal' | 'degraded';
  missed_scrape_inferred: boolean;
  wraparound_handled: boolean;
  reset_detected: boolean;
}
```

WU-06's hot path likely does NOT call `transformPair`. IF event-feed schema includes counter-typed fields (e.g., a `cumulative_event_count` field that resets at process restart), WU-06 would import `transformPair` + the `RateSample` type and rely on the L0 contract's pass-through value-domain semantics for the counter fields. Most-likely outcome: event-feed schema is purely event-metadata (timestamp + event-class + event-scope + payload); D2 edge degrades to architectural coherence.

---

## Verification status

Per `REVIEWER-REPORT-R25.md` + R32 closure of R25 MAJORs + `WAVE-GATE-01.md`:

- [x] Output artifact (`counter-rate-transform.ts`) exists at the stated location; verified at gate via main HEAD `c503edb` (bit-identical to R25 merge HEAD `3308681`; unchanged across Wave 2 + Wave 3).
- [x] All 6 invariants implemented per spec § 3.1 and Reviewer per-AC verification.
- [x] R-E7 MITIGATED at Wave 2 close (WU-03 NVLINK empirically exercised all 4 failure-mode paths against the synthetic counter generator; AC-R30-10..14 PASS).
- [x] R25 MAJOR-1/2/3 spec drift CLOSED at R32 (spec amendments per PHASE-2-SLICE-3-CLOSE-WALK § 4).
- [x] R25 MINOR-1/2/3 CLOSED at R32 (MINOR-1 bundled with MAJOR-1; MINOR-2 closed via R30 AC-R30-14 + R32 OBS; MINOR-3 closed via R32 added gauge + missed_scrape AC at AC-R32-7).

---

## What the target cluster must not assume

- WU-00 did NOT design event-feed schema — WU-06 designs from scratch (Tessera-original).
- WU-00 did NOT validate any event-feed counter handling — the synthetic counter generator covers per-shard signal counters (DCGM-class); event-feed counters (if any) would need WU-06-specific synthetic fixtures.
- WU-00's `synthetic-counter-generator.ts` factories are reusable IF WU-06 ships counter-typed event-feed fields. If not, WU-06 does NOT need to import from the substrate.
- WU-00's L0 contract is PURE-FUNCTION at the boundary (no I/O; no state; no logging). WU-06's event-feed substrate is producer-side and may have I/O semantics — that's WU-06's design decision, not constrained by WU-00.
- WU-00 did NOT modify `engine/core.ts` TrendBuffer body OR `engine/l0/schema-continuity.ts` body. Both are READ-ONLY for WU-06.

---

## Pre-flags from wave gate (WAVE-GATE-03 § Pre-flags to Wave 4 cluster)

- **L0 contract surface stable at main HEAD `c503edb`** — WU-06 reads by interface. Most-likely outcome: event-feed schema is purely event-metadata; D2 edge degrades to architectural coherence.
- **Synthetic counter generator (5 factories) available for reuse** IF WU-06 ships counter-typed event-feed fields. WU-03 NVLINK + R32 q25 are the precedent consumers.
- **R25 MINOR-2 mutation-kill gap (default-64 counter_width)** acknowledged per R30 spec § 7.1 as future-round optional enhancement. NOT in WU-06 scope unless event-feed counter handling surfaces a related gap.

---

## Halt conditions for target cluster

1. WU-06 event-feed schema design requires modification of `engine/l0/counter-rate-transform.ts` body (e.g., new invariant for event-feed-specific counter semantics) — HALT; route back to Coordinator. Wave-1-frozen.
2. WU-06 event-feed counter handling requires extending the L0 contract invariants (a 7th invariant) — HALT; ESCALATE to Coordinator + Architect for cross-wave contract-shape decision.
3. WU-06's `transformPair` consumer-site usage surfaces a behavior diverging from R25 documented invariants — HALT with DIAGNOSTIC + concrete counter-example; route back via Coordinator with the failure-mode characterization (potential WU-00 amendment round).

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 1 gate (R27) | 2026-05-18 | DEFERRED | Cross-wave edge timing: handoff authored at wave gate that authorizes consuming wave (Wave 3 gate / R33). |
| Wave 2 gate (R31) | 2026-05-18 | DEFERRED | Continues deferred. |
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff emitted at Wave 3 gate authorizing Wave 4 dispatch. L0 contract surface verified at main HEAD `c503edb` (unchanged across Wave 2 + Wave 3 per R32 anti-scope verification). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation (deferred from Wave 1 + Wave 2 gates per cross-wave handoff timing convention) | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
