# ADR 0021 — runtime control-twin validity detector (contamination + non-comparability)

- **Date:** 2026-06-28
- **Status:** **Proposed (design/spec).** Implementation + validation plan in §§ Implementation / Validation;
  no code yet. Closes the gap surfaced by the 2026-06-28 deep research (`research/2026-06-28-concurrent-
  control-spatial-null.md`) and named in ADR 0019 § Prior art.
- **Builds on:** ADR 0019 (Mode B spatial null: `d_i = treatment_i − control_i`); ADR 0020 (the runtime
  calibration monitor + whiteness gate, which watch the *standardized residual* of the contrast). This ADR
  adds a gate on the *raw twin pairing itself*, BEFORE the contrast destroys the evidence.

## Problem

Mode B's guarantee rests on two unchecked assumptions about each treatment↔control pair:
1. **The control twin is healthy** (no fault present in the control — neither its own, nor the treatment's
   fault spilling over).
2. **The twin is comparable** (shares the treatment's common-mode loadings, so the contrast actually
   cancels it).

ADR 0020's monitors operate on the *standardized residual* of `d_i`. They cannot see violations of either
assumption, because **the contrast is sign-blind**: `d_i = treatment_i − control_i` collapses "which member
moved" into a single difference. The deep-research DiD-under-interference result makes the cost precise — if
a fault contaminates the control, the contrast estimand becomes `τ_treatment − τ_control` (TATT − ASC), which
**identifies neither magnitude, direction, nor sign** (Mealli–Viviens arXiv:2512.21176; Xiao–Sun
arXiv:2509.24259). Concretely, contamination has TWO failure modes, and ADR 0019/0020 only named the first:

| treatment vs cohort | control vs cohort | meaning | contrast outcome |
|---|---|---|---|
| outlier | normal | genuine per-shard fault | **fires correctly** ✓ |
| normal | **outlier** | control contaminated (fault in control only) | **FALSE POSITIVE** — `d` shows a spurious shift |
| **outlier** | **outlier (same dir)** | fault hit both (spillover / shared sub-component) | **MISS** — `d` cancels the fault (false negative) |
| outlier | outlier (opp dir) | pathological | uninterpretable |
| normal | normal | healthy or pure common-mode | correct (no fire / cancels) |

So contamination is not only a *miss* risk (row 3, the only one ADR 0019 noted) — it is also a **false-positive
source** (row 2). Non-comparability is a separate, also-uncaught false-positive source: differing loadings
leave residual common-mode in `d` that the residual monitor may read as a shift.

## Decision

Add a **control-twin validity detector** — a construction-validity gate, like whiteness, that runs on the
RAW (pre-contrast) twin series over the healthy calibration feed, with two complementary tests. It is a
DIAGNOSTIC gate (threshold-based, not an FDR-bearing e-value), consistent with how ADR 0020 treats whiteness:
it can demote a pair/emitter to Mode A but never itself carries an FDR claim.

### Test A — cancellation quality (catches non-comparability / partial common-mode leak)

A well-matched twin shares the common-mode, so the contrast must have far smaller variance than either
member. Per pair `i`, on the healthy feed (members centered):

```
ρ_tc(i)  = Cov(treatment_i, control_i) / sqrt(Var(treatment_i)·Var(control_i))   # twin coupling
κ(i)     = Var(treatment_i − control_i) / ((Var(treatment_i)+Var(control_i))/2)  # = 2(1 − ρ_tc) at equal var
```

A good twin: `ρ_tc → 1`, `κ → 0` (in the clustersynth control arm the contrast collapsed gpu_temp_c variance
254 → 0.56, a >400× drop). Non-comparable: low coupling (`ρ_tc` small, `κ` large) → the spatial null does not
hold for this pair. **Gate: require `ρ_tc(i) ≥ ρ*` (default ρ* = 0.5, i.e. κ ≤ 1).** Measured on the
HEALTHY feed only (a real fault also inflates `Var(d)`; we must not read a fault as non-comparability — same
discipline as ADR 0020's calibration feed).

*Sharper refinement (Test A′, optional):* regress `d_i(t)` on the fleet common-mode estimate `X̂(t)` (robust
cohort center); a cancelled pair has residual loading `β_i ≈ 0`, a non-comparable pair has `β_i ≠ 0`. Test
`β_i = 0`. More principled (it targets the actual leak — residual common-mode in `d`) but needs `X̂`; the
variance-ratio gate is the cheap first line.

### Test B — control-cohort consistency (catches contamination)

The control twins must be mutually exchangeable and healthy. Run a SECOND spatial null *on the controls*:
standardize `control_i − robustCenter_j(control_j)` against the control cohort and apply the same
normalized-mixture e-value. **A control that fires against its own cohort is not healthy → its pair is
contaminated** (rows 2–4 above). This reuses the Mode B machinery, pointed sideways at the control arm, and
is exactly the disambiguation the sign-blind contrast cannot do.

### Action semantics

- **Per-pair exclusion (default).** A pair failing Test A or Test B is dropped from BOTH the detection set
  (e-BH input) and the calibration cohort for that cycle — its contrast is untrustworthy (false-positive or
  masked-miss source). Excluded pairs are logged (audit), not silently dropped.
- **Emitter-level demotion.** If the surviving-pair fraction falls below the construction-validity threshold
  (reuse `calibFrac ≥ 0.8`), the control arm is compromised fleet-wide → demote the emitter B→A (abstain).
  This composes with ADR 0019's gate and ADR 0020's monitors via AND (all must pass for Mode B).

## Honest scope / limitations

- **Diagnostic, not an e-value.** Tests A/B are thresholded gates (like whiteness); they tighten the
  construction-validity decision, they do not extend the FDR guarantee. State this in the renderer.
- **Majority-healthy blind spot (inherited).** Test B is a spatial null on the controls, so it inherits the
  same assumption as Mode B: if contamination is *identical across the whole control cohort*, it looks like
  common-mode and is invisible — exactly the structural blind spot the deep research documented for all
  peer-comparison methods. Name it; it is not fixable at this layer.
- **Test B vs a real per-shard fault that spills:** a fault hitting treatment AND control of one pair (row 3)
  is caught (control fires vs cohort) and the pair excluded — correctly trading a guaranteed-miss for an
  honest abstention on that pair, not a false guarantee.
- **Threshold ρ\* is a tuning knob**, to be set from the validation sweep, not asserted.

## Implementation (sketch)

- `tools/contamination-detector.ts` — `twinValidity(treatmentHealthy, controlHealthy, controlCohort)` →
  `{ rhoTc, kappa, controlFiresVsCohort, valid }` per pair; pure, unit-testable. Reuses `robustLocation` /
  MAD, `normalizedMixtureEValue`, and the cohort-center logic already in `clustersynth-mode-b.ts`.
- Wire into `scoreCounterModeB` (in-memory) and `reduceCmbCounter` (streaming): compute per-pair validity on
  the healthy/prefix feed, exclude failing pairs before e-BH, fold the surviving fraction into
  `monitorPassing`. Add a per-emitter `twinExcluded` count to `ModeBCounterResult` + the report.
- `mode-b-loop.ts`: extend `EmitterCycle` with the per-pair validity verdict (computed by the caller, like
  the calibration samples), exclude in `stepEmitter`.

## Validation plan (clustersynth)

Needs two NEW fault modes in the control arm (clustersynth side):
1. **Contaminated control** (`CS_CONTAMINATE`): inject a gpu fault into the *control* twin (control-only, and
   both-members) — to exercise Test B (rows 2–3). Expect: contaminated pairs flagged + excluded; without the
   detector, control-only contamination inflates FDP (false positives) and both-member contamination
   depresses recall (misses); with it, FDP/recall restored on the surviving pairs.
2. **Non-comparable twin** (`CS_DECORRELATE` / loading perturbation): give the control twin a perturbed
   loading on a common factor — to exercise Test A. Expect: low `ρ_tc`, pair excluded, FDP restored.

Re-run the mini fixture + a mac-mini hourly ramp; confirm (a) zero healthy pairs excluded (no false
exclusion on a clean control arm — the matched twins have `ρ_tc ≈ 1`), (b) contaminated/non-comparable pairs
excluded with the expected FDP/recall recovery, (c) FDP stays ≤ q. The 1 Hz run is not required for this ADR
(twin validity is cadence-agnostic) but should be spot-checked for false exclusions.

## Consequences

- Mode B gains an explicit guard for the assumption the DiD-interference theory proves is load-bearing, and
  the previously-unnamed contamination FALSE-POSITIVE mode (row 2) becomes detectable.
- The construction-validity decision becomes: `validity_class` gate (ADR 0019) AND calibration+whiteness on
  the residual (ADR 0020) AND twin validity on the raw pairing (this ADR) — three complementary layers,
  composed by AND, all per-emitter/per-pair and revocable.
