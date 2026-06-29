# ADR 0021 — control-twin validity detector: built, validated, found INSUFFICIENT (negative result; control-triad is the real fix)

- **Date:** 2026-06-28
- **Status:** **Built + validated + NOT shipped as a gate (negative result).** The detector and its
  ground-truth fault modes were implemented and rigorously validated; the validation showed a twin-PAIR
  detector cannot restore the FDR guarantee, so it is **not wired into the Mode B gate** (Mode B is
  byte-identical to before). Kept as research artifacts: `tools/contamination-detector.ts` (the κ
  machinery), the clustersynth fault modes (`CS_CONTAMINATE` / `CS_DECORRELATE_FRAC`), and the
  `tools/contrast.ts` refactor. The real fix — a **control triad** — is proposed below (ADR 0022 candidate).
- **Builds on:** ADR 0019 (Mode B spatial null `d = treatment − control`); ADR 0020 (residual monitors);
  the 2026-06-28 deep research (`research/2026-06-28-concurrent-control-spatial-null.md`) that named the gap
  and the DiD-under-interference framing; ADR 0012/0015 (the fleet-relative heterogeneous-loading wall).

## Problem (unchanged — the gap is real)

Mode B assumes each treatment↔control pair is a MATCHED twin (shared common-mode loadings) and the control
is HEALTHY. The residual monitors (ADR 0020) operate on the standardized contrast AFTER the damage, so they
miss violations of either assumption. Two failure modes, and the contrast is **sign-blind** (it collapses
"which member moved" into one difference):

| treatment vs cohort | control vs cohort | meaning | contrast outcome |
|---|---|---|---|
| outlier | normal | genuine per-shard fault | fires correctly ✓ |
| normal | **outlier** | control contaminated | **FALSE POSITIVE** |
| **outlier** | **outlier (same dir)** | fault hit both (spillover) | **MISS** (cancels) |
| normal | normal | healthy / pure common-mode | correct |

Plus NON-COMPARABILITY: divergent loadings leave residual common-mode in `d` → false positives. The DiD
econometrics (Mealli–Viviens; Xiao–Sun) shows a nonzero control effect makes the estimand `TATT − ASC` —
uninterpretable.

## What was built (and is kept)

1. **clustersynth ground-truth modes** (committed `d2a5e0e`, env-only, off by default): `CS_DECORRELATE_FRAC`
   (twins use their own loadings → non-comparability), `CS_CONTAMINATE=both|control` (duplicate / move a
   fault onto the control); ground truth in `control.json`. A `faultId` seam on `counterTicks` lets a twin
   carry its treatment's fault with independent noise.
2. **`tools/contamination-detector.ts`** — the cancellation ratio `κ_i = Var(t_i−c_i) / avg(Var(t_i),Var(c_i))`
   + cohort thresholding (`max(absFloor, relMult·p25(κ))`, p25 robust to a contaminated cohort). Unit-tested.
3. **`tools/contrast.ts`** — extracted `fitContrast`/`applyContrast` (shared, no import cycle). A clean
   refactor kept regardless.

## Validation — why it does NOT ship (the negative result)

Generated matched clean / decorrelated / contaminated bundles and measured the existing Mode B harness, then
the κ gate. Evidence (1-rack hourly, q=0.1):

- **Non-comparability inflates FDR and the existing gates miss it:** decorrelated bundle **FDP 0.250** (e.g.
  power_w 0.667), whiteness/calibration pass → confirms a gap exists.
- **But κ-gating does NOT restore it.** A threshold sweep (absFloor 0.05–0.1 × relMult 3–6, up to 100 twins
  excluded) bottoms out at **FDP ≈ 0.20–0.21 — still > q** — because **the false positives come from
  LOW-κ pairs**. κ measures *variance* leak, but the harm is a **sustained shift** (un-cancelled
  non-stationary regime/ramp), which a pair leaks with small total-variance change. κ is the wrong statistic
  for the harm. Worse, it **over-excludes clean pairs**: ~6 healthy pair-counters dropped on a clean bundle
  (weak-common-mode counters have naturally high κ, e.g. sm_util clean κ up to 0.56). A gate that violates
  the guarantee AND costs coverage in the common case is net-negative → not shipped.
- **Contamination is undetectable by twin-pair statistics at all:** a SHARED fault cancels in the contrast
  (verified: `both`-contamination → recall 1.0→0.42 at FDP 0.000 — the structural blind spot, = fleet-wide
  common-mode by design); a CONTROL-ONLY fault fires the sign-blind contrast, and the only external
  reference (the control cohort) inherits the heterogeneous-loading wall (ADR 0012/0015) — level-demeaned
  `control_i − cohort-center` residual-std distributions for clean vs contaminated **overlap heavily**
  (clean med 4.18 / max 11.7 vs contaminated med 5.4 / min 1.6), so a cohort gate would over-exclude.

**Root cause (one sentence):** non-comparability re-introduces the temporal-null wall (the residual
common-mode differs across windows — exactly what the matched twin existed to avoid), and contamination
needs a clean per-control reference that a heterogeneous-loading cohort cannot provide.

## Decision

**Do not gate Mode B on a twin-pair validity detector.** Keep the κ machinery + ground-truth modes as
research artifacts. Mode B's construction-validity decision is unchanged (validity-class gate + ADR 0020
residual monitors). Non-comparability and contamination remain **characterized, not closed**.

## The real fix — a CONTROL TRIAD (→ ADR 0022, PROTOTYPE-VALIDATED 2026-06-28)

> **Update:** prototyped in `tools/control-triad.ts` and confirmed — the triad recovers BOTH failure modes
> below (contaminated-control detection FDP ≤ q where the cohort gets 0.25–0.82; sign-blind FP eliminated,
> FDP 0.47→≤0.065 at full recall, 5 seeds). See **ADR 0022**.


Both failure modes dissolve with **two independent control twins per treatment**. A matched
**control-vs-control** contrast is a clean per-control null (no cohort heterogeneity, no temporal wall):
- **Contamination:** a contaminated control fires against its *sibling* control (a matched null) — the clean
  per-control reference the cohort couldn't give. Disambiguates the sign-blind treatment-fault vs
  control-fault case directly.
- **Non-comparability:** the two controls' mutual contrast directly measures whether the twins track the
  common-mode, without the variance-ratio's weak-common-mode confound.
Cost: a second canary per shard (control overhead 1×→2×). Worth specifying + validating as ADR 0022.

## Consequences

- No behavior change to Mode B (gate not wired; suite green, mini FDP still 0.000).
- The deep-research gap is now precisely characterized: a twin-PAIR detector is insufficient; a control
  TRIAD is the construction that can close it.
- Reusable assets for ADR 0022: the clustersynth contamination/decorrelation modes (ground truth) and the
  κ machinery.
