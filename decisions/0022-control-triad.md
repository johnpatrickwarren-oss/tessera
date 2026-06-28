# ADR 0022 — control triad: two control twins per treatment (PROPOSED — prototype-validated)

- **Date:** 2026-06-28
- **Status:** **Proposed — prototype-validated.** A synthetic prototype (`tools/control-triad.ts`, unit-
  tested, multi-seed) shows the triad recovers BOTH Mode B failure modes that the twin-PAIR detector could
  not (ADR 0021). Not yet built into the pipeline; the clustersynth second-twin + the wired detector + a
  mac-mini validation are the remaining work (§ Build plan).
- **Builds on:** ADR 0019 (Mode B spatial null); ADR 0021 (twin-PAIR validity detector — built, validated,
  found insufficient: κ misses the sustained-shift harm; contamination is undetectable by a twin pair
  because the contrast is sign-blind and the cohort reference hits the heterogeneous-loading wall of
  ADR 0012/0015).

## Idea

Give each treatment shard **two** independent control twins `c1, c2` — both share the treatment's common-mode
loadings (so within-triad contrasts cancel the common-mode exactly), with independent idiosyncratic noise,
both never faulted. Then **`c1 − c2` is a matched control-vs-control null** — the clean per-control reference
the heterogeneous cohort could not provide:

- **Contamination detection.** A fault reaching one control fires `c1 − c2` against its healthy sibling.
- **Sign-blind false positive (the ADR 0021 headline).** A control-only fault makes the pair `t − c1` fire
  even though the treatment is healthy. The triad disambiguates: `c1 − c2` flags `c1` as the culprit, and
  `t − c2` (the clean sibling) does not fire → the treatment is correctly judged healthy. No false positive.

## Prototype evidence (`tools/control-triad.ts`, 200 shards × T=400, heterogeneous loadings jitter 0.4, q=0.1, 5 seeds)

| | contaminated-control detection (Exp 1) | control-only false positive (Exp 2) |
|---|---|---|
| cohort `c1 − median` | FDP 0.25–0.82, recall 0.22–0.78 | — |
| **triad `c1 − c2`** | **FDP 0.000–0.025, recall 1.000** | — |
| pair `t − c1` (Mode B today) | — | **FDP ≈0.46–0.48** (false-fires on contaminated controls) |
| **triad (flag `c1` via `c1−c2` → use `c2`)** | — | **FDP 0.000–0.065, recall 1.000** |

The triad sibling cleanly detects a contaminated control where the cohort is defeated by heterogeneous
loadings, and triad-protected detection eliminates the sign-blind false positive while keeping full recall
on real treatment faults. Robust across all 5 seeds. This is the construction ADR 0021 pointed to, confirmed
worth building.

## Build plan (the remaining work)

1. **clustersynth:** emit a second matched twin per GPU (`#ctrl2`) under a `CS_TRIAD` / `CS_CONTROL2` flag —
   same factor instances + loadings as the treatment, independent noise, never faulted; `control.json` pairs
   become `{ treatment, controls: [c1, c2] }`. Reuse the existing `CS_CONTAMINATE` machinery (it already
   targets `#ctrl` = c1) for ground truth.
2. **Tessera triad detector** (`tools/clustersynth-mode-b.ts`): per shard, compute the control-vs-control
   e-value `c1 − c2`; e-BH the controls to flag contaminated ones; for a flagged shard route detection to
   the clean sibling (`t − c2`), else `t − c1` (or `t − median(c1,c2)` for the idio-noise power gain). Add
   the flagged-control count + a triad-contamination FDR line to the report.
3. **Validate** on the mini fixture (zero false flags on a clean triad arm; contaminated controls flagged +
   the sign-blind FP eliminated) + a mac-mini hourly ramp; confirm Mode B FDP stays ≤ q with the triad.

## Cost / tradeoff (honest)

- **Control overhead doubles** (2 canaries per treatment shard instead of 1). For a labeled control arm /
  canary cohort this is real spend; worth it only where control-twin contamination/comparability is a live
  risk (the comparative deployment/canary-gating setting Mode B targets, ADR 0019).
- The triad addresses CONTAMINATION + the sign-blind FP. NON-COMPARABILITY (treatment loadings diverging
  from the controls) is a separate axis the prototype does not stress; the within-triad contrast assumes the
  controls share the treatment's loadings. If real twins can't be loading-matched, that remains open.
- Still inherits the majority-healthy assumption at the FLEET level (a fleet-wide common-mode event cancels
  by design — ADR 0019); the triad only fixes the PER-CONTROL reference, not fleet-wide blind spots.

## Decision

Pursue the full build (steps 1–3) as the fix for ADR 0021's contamination + sign-blind-FP gaps. The
prototype + its unit test are kept as the validating artifact.
