# Spec — fleet-relative capstone (does the fleet close the calibrated guarantee?)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADRs 0007–0011 left fleet-relative comparison as the last lever for the residual
  (shard-specific fault vs fleet-wide workload/drift). Test whether fleet-relative + m≫n + whitening +
  e-BH delivers a calibrated FDR guarantee while detecting shard-specific faults.

## Deliverables
- **D1 — `tools/fleet-relative-capstone.ts`** (`pnpm capstone`): synthetic fleet (shared random-walk
  common-mode + per-shard level + AR(1) noise + shard-specific step faults); compare naive raw vs
  fleet-relative (residual = value − cross-shard median) e-values under e-BH; report FDP + power across
  q; sweep the fault fraction; and a null-fleet residual e-value validity diagnostic.

## Acceptance criteria
- **AC-1** Residual = per-tick cross-shard median removal; e-value = whitened plug-in terminal wealth
  over [m, m+n) with m≫n; no lookahead.
- **AC-2** Report power AND FDP (e-BH) for naive vs fleet-relative across q; honestly state separation
  works (power) but FDR does not (FDP ≫ q).
- **AC-3** Identify the mechanism with evidence: the null-fleet residual e-value is VALID (so the
  failure is NOT e-value invalidity), and FDP grows with the fault fraction (faults contaminate the
  common-mode estimate); note a trimmed-mean center does not fix it.
- **AC-4** Deterministic / byte-idempotent. Tests pin: power high + FDR uncontrolled; null residual
  valid; FDP grows with fault fraction. ADR 0012 + STATE.

## Anti-scope
- **AS-1** No engine change.
- **AS-2** Synthetic ground truth (FDP/power need labels). The e-value-invalidity wall was shown on real
  data in ADR 0008/0009.
- **AS-3** Does not implement the two fixes it points to (contamination-robust common-mode; nuisance-
  baseline-robust e-value, ADR 0008) — it locates them as the remaining levers.
