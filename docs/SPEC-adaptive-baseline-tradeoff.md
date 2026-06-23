# Spec — adaptive-baseline detection tradeoff (the masking study)

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** Adaptive (regime-aware) baselining cut false alarms ~5× on a NULL dataset (ADR 0005), but
  a rolling baseline can MASK a slow drift by tracking it. Before upstreaming an adaptive mode, gate
  it: does it keep detection on real anomalies, and **at what drift rate does it start masking?**

## Deliverables
- **D1 — `tools/adaptive-baseline.ts`** (shared): `replayFiresAdaptive` (trailing-window
  recalibration) extracted from `mit-replay` so the study + MIT + GWDG reuse one implementation.
- **D2 — `tools/adaptive-tradeoff.ts`** (`pnpm adaptive-tradeoff [gwdg-dir]`):
  - **A (controlled):** AR(1)+ramp sweep over drift slopes; static vs adaptive detection (fire after
    onset) + pre-onset FP → the masking threshold.
  - **B (real):** GWDG static vs adaptive detection + FP on labeled GPU faults.

## Acceptance criteria
- **AC-1** `ar1Ramp` produces a unit-variance AR(1) stream with a linear ramp added only from onset;
  pre-onset is identical across slopes (same noise), post-onset elevated ∝ slope.
- **AC-2** The sweep reports, per slope, static & adaptive detection rate (fire ≥ onset) and pre-onset
  FP rate, over a fixed trial count; deterministic (scramble-hashed seeds).
- **AC-3** The report states the tradeoff plainly: at slope 0 adaptive FP ≪ static (the win); for
  small slopes adaptive detection ≪ static (masking); both converge at large slopes — and names the
  upstreaming verdict (hybrid / only-where-slow-drift-not-needed).
- **AC-4** GWDG section reuses the date-matched window join (one incident per file) and reports
  static-vs-adaptive detection + FP; honest that GWDG is detachment-heavy/day-level (FP delta primary).
- **AC-5** Deterministic / byte-idempotent. Tests cover the generator + the shared adaptive primitive
  (adaptive ≪ static on a regime shift; no fire on flat). ADR + STATE.

## Anti-scope
- **AS-1** No engine change — `replayFiresAdaptive` stays a harness prototype; this study informs
  whether/how to upstream it.
- **AS-2** Single AR(1) ρ + linear ramps (not AR(p)/seasonal/step-vs-ramp taxonomy) — a first
  characterization, not exhaustive.
- **AS-3** GWDG detection is indicative only (detachment-heavy, day-level labels); the FP delta and
  the synthetic masking curve are the load-bearing results.
