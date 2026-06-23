# Spec — fleet-level e-BH FDR validation (does it rescue the guarantee?)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0007 left fleet-FDR as the one place a real guarantee could survive: per-shard e-values
  are inflated by drift, but e-BH on the fleet might still bound the false-discovery proportion (FDP)
  if a fleet-relative construction cancels common-mode. e-BH controls FDR ≤ q under arbitrary
  dependence ONLY if each e-value is marginally valid (E[e|H0] ≤ 1) — so first test whether Tessera's
  e-values are valid on real(istic) data, then whether fleet e-BH (naive vs fleet-relative) controls
  FDP.

## Deliverables
- **D1 — `tools/fleet-fdr.ts`** (`pnpm fleet-fdr [gwdg-dir]`):
  - `terminalEValue` / `terminalEValueWith` (betting-e-process terminal wealth = e-value), `eBH`
    (Wang–Ramdas), `fleetResiduals` (per-timestamp cross-shard median removal).
  - `eValueValidity`: E[e], median, P(fire) on healthy nulls for {iid, AR(1)} × {true, plug-in}.
  - Real null: naive fleet e-BH on real healthy GWDG structural shards (every rejection = false
    discovery).
  - Synthetic ground truth: fleet with common-mode drift + injected failures; naive vs fleet-relative
    FDP + power.

## Acceptance criteria
- **AC-1** `eBH` implements k* = max{k : e_(k) ≥ N/(q·k)}; rejects none when no k qualifies.
- **AC-2** `eValueValidity` shows the e-value is valid (E[e]≤1, P(fire)≤α) ONLY for true-baseline+iid;
  plug-in estimation and autocorrelation each break validity.
- **AC-3** Real-null and synthetic both show fleet e-BH does NOT control FDP (the inputs are invalid);
  fleet-relative reduces but does not fix it.
- **AC-4** Honest verdict: fleet-FDR does not rescue the guarantee; the fix is a valid e-value
  construction (nuisance-robust + whitened), i.e. a per-shard redesign — not a fleet wrapper.
- **AC-5** Deterministic / byte-idempotent. Tests pin eBH, e-value validity (the root cause), and the
  fleet consequence. ADR + STATE.

## Anti-scope
- **AS-1** No engine change — diagnostic only; the valid-e-value redesign is future work.
- **AS-2** Ground-truth FDP requires labels (absent in real fleet telemetry) → synthetic, parameterized
  to the measured real drift; the real-null half uses actual healthy GWDG shards.
- **AS-3** Does not implement the nuisance-robust mixture e-value (the proposed fix) — only identifies
  it as the required direction.
