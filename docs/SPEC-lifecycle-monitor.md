# Spec — operational baseline lifecycle (drift-triggered re-record)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0009/0010 left the residual over-firing (cross-epoch drift + legitimate workload
  change) to the operator's lifecycle: detect drift → re-record → shadow → cutover. Build + measure it:
  can drift-triggered epoch re-record control drift false-alarms WITHOUT the continuous-adaptation
  masking of ADR 0006, and where does it break?

## Deliverables
- **D1 — `tools/lifecycle-monitor.ts`** (`pnpm lifecycle`): `monitorLifecycle` (epoch-level drift
  trigger = sustained alarm RATE ⇒ re-record from a recent window, with cooldown), `monitorStatic`
  (= never re-record), reusing `replayFiresAdaptive` for the adaptive comparison. Synthetic ground-truth
  scenarios (slow drift / sharp fault / slow fault / continuous workload) comparing static vs adaptive
  vs lifecycle on false-alarm count and fault-detection rate.

## Acceptance criteria
- **AC-1** The drift trigger is the alarm RATE (≥ rateThresh alarms in a trailing window), NOT a
  per-fire signal — the per-fire run-length does NOT separate drift from faults (verified up front).
- **AC-2** Re-record calibrates a new baseline from a recent window, no lookahead, with a cooldown;
  `rateThresh=Infinity` reduces to the static monitor.
- **AC-3** Report measures, vs static and adaptive: drift FP, sharp-fault detection, slow-fault
  detection (in adaptive's masking zone), and continuous-workload FP — and states honestly where the
  lifecycle helps vs degenerates.
- **AC-4** Deterministic / byte-idempotent. Tests pin: drift ⇒ re-records ⇒ fewer alarms than static;
  a sharp fault is still detected; `rateThresh=Infinity` never re-records. ADR 0011 + STATE.

## Anti-scope
- **AS-1** No engine change.
- **AS-2** Synthetic ground truth (FP/detection need labels); the real within-epoch-workload limit was
  already shown on real data in ADR 0010.
- **AS-3** Shadow→cutover validation oracle (deciding a candidate baseline is healthy) is modeled as
  immediate cutover — the real oracle is operator/fleet, out of scope.
