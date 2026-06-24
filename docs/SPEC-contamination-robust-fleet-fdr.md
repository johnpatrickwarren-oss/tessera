# Spec — contamination-robust fleet-FDR (the BF e-value closes the FP/FDR guarantee)

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** ADR 0012 found fleet-relative comparison SEPARATES faults (power 1.0) but does NOT control
  FDR (FDP 0.72–0.77 ≫ q) for two named reasons: (a) the cross-shard common-mode center is itself
  **contaminated** by the faults (their correlated onset shifts the center, false-firing healthy
  shards), and (b) the residual e-value was the **plug-in** betting process, not the
  nuisance-baseline-robust BF (ADR 0013). This increment builds both missing pieces and tests whether
  they finally drive realized FDP ≤ q — i.e. whether the BF e-value, fed a contamination-robust
  residual, delivers the calibrated FP/FDR guarantee the arc has been chasing.

## The construction (Lever A)

Fleet matrix `X[i][t]` (shard i, time t); calibration `[0, M)` assumed healthy, test `[M, M+N)`,
faults (if any) onset at `FONSET ≥ M` (cal fault-free).

1. **Per-shard level (fixed effect)** `ℓ̂_i = median_{t∈[0,M)} X[i][t]`. Removes each shard's baseline
   level — the term that confounded ADR 0012's value-rank trimming.
2. **Level-adjusted matrix** `Y[i][t] = X[i][t] − ℓ̂_i`. Now the cross-section at each t is
   common-mode + idiosyncratic noise + (fault, shard-specific). A fault is a genuine cross-sectional
   **outlier** here (it was NOT, pre-demean, because a faulty-but-low-level shard sat mid-pack).
3. **Robust common-mode** `c_t = robustCenter({Y[i][t] : i})`, a **redescending Tukey-biweight
   M-estimator** (IRLS, median start, MAD scale). [Build note: the spec originally said Huber; Huber's
   SOFT downweight leaked at heavy load — a δ-σ outlier keeps weight k/δ — giving FDP 42% at the default
   load. The redescending biweight gives true outliers weight EXACTLY 0, pushing the breakdown from
   ~10/60 to ~12/60+ and the default-load FDP to ~1.6%.] Resists a minority of shifted shards up to its
   breakdown point — which now bites the FAULTS, because step 2 made them the outliers.
4. **Robust residual** `R[i][t] = Y[i][t] − c_t = X[i][t] − ℓ̂_i − c_t`. Common-mode removed (c_t),
   per-shard level removed (ℓ̂_i), shard-specific fault SURVIVES.
5. **Valid e-value** `e_i = nuisanceRobustEValue(R[i], M, N)` — the BF (ADR 0013): location-invariant,
   whitened, `E[BF|H0] ≤ 1` by construction. Under a healthy shard R[i] is stationary noise → P(fire)
   ≤ α; under a fault the test-window mean shifts → detects.
6. **FDR control** `reject = eBH({e_i}, q)` (Wang–Ramdas; valid under arbitrary dependence GIVEN valid
   marginal e-values — now true).

Side-by-side baseline: ADR 0012's `(per-tick median center) + (plug-in e-value)`, to show the delta is
the construction, not the substrate.

## Deliverables
- **D1 — `tools/contamination-robust-fleet.ts`** (`pnpm crfleet [gwdg-dir]`):
  - `robustCenter(xs, c?, tol?, maxIter?)` — redescending Tukey-biweight location (MAD scale, IRLS).
  - `perShardLevel(X, M)`, `robustResiduals(X, M)` — steps 1–4.
  - Reuse `nuisanceRobustEValue` (ADR 0013) + `eBH` (fleet-fdr) for steps 5–6.
  - `genFleet` reused from the capstone substrate (shared common-mode random walk + per-shard level +
    AR(1) noise + correlated step faults).
- **D2 — `shadow-results/contamination-robust-fleet-report.{json,md}`** (deterministic, idempotent).

## Acceptance criteria
- **AC-1** `robustCenter` (Tukey biweight) has bounded, REDESCENDING influence: equals the mean within
  tol on clean Gaussian data; a minority (k < n/2) of arbitrarily-large shifted points is given weight
  exactly 0, so the center barely moves. Converges.
- **AC-2** The demean mechanism: on a fleet where faulty shards have heterogeneous baseline levels,
  step 2 makes the faults the top-k of the cross-section (which they are NOT pre-demean) — the property
  ADR 0012's trimmed-mean lacked. Pinned by a test that checks fault rank pre- vs post-demean.
- **AC-3** Synthetic FDR: the new construction drives mean FDP **≤ q** at the default and low fault
  fractions where ADR 0012's `(median + plug-in)` gave FDP ≫ q (0.72–0.77), at retained power. The
  report shows old-vs-new side by side at matched load.
- **AC-4** Breakdown (honest): FDP stays ≤ q up to a fault fraction ε*, then climbs as contamination
  overwhelms the robust center; ε* is reported, not hidden.
- **AC-5** Conditional FD: a power-vs-effect-size (δ) curve at fixed latency — detection is guaranteed
  only for δ ≥ some minimum, characterized empirically (NOT an unconditional FD guarantee).
- **AC-6** Real fleet (gated on gwdg-dir): realized FP / e-BH rejections on a GENUINELY co-sampled cross
  section — the largest same-launch-day GWDG cohort aligned on the shared `ts_epoch_ms` 600s grid (the
  55 streams span 12 distinct start dates 2025–2026, so a position-index cross-section is
  apples-to-oranges and must NOT be used). naive vs robust on the SAME cohort/window. Note: this naive
  baseline (cohort, truncated window) is NOT fleet-fdr's full-fleet/full-window 34/55 — it is recomputed
  here for an apples-to-apples within-experiment comparison.
- **AC-7** Deterministic, byte-idempotent report. Tests pin `huberCenter`, the demean mechanism (AC-2),
  `eBH` wiring, synthetic FDP ≤ q (AC-3), and the breakdown direction (AC-4).
- **AC-8** Honest verdict separates the two guarantee halves: **FP/FDR ≤ q by construction**
  (valid BF + robust center + e-BH) vs **FD characterized, conditional on effect ≥ δ**. States the
  standing limits: scalar common-mode (homogeneous factor loading; heterogeneous loadings leave
  residual common-mode → a factor model is the next lever), the breakdown point ε*, and masked faults
  (a shard faulted through the calibration window is absorbed into ℓ̂_i — a cold-start/lifecycle case).

## Out of scope (named, not silently dropped)
- Multi-factor / loading-heterogeneous common-mode (PCA factor model) — the next lever if AC-6 shows
  residual common-mode FP on real data.
- The benign-change/fault discriminator for shard-SPECIFIC benign change (Lever B / Increment 2) —
  fleet-relative removes common-mode benign change; shard-specific benign change is the next increment.
- Real labeled fleet faults (none available) — synthetic ground truth for FDP/power, real data for FP
  only, consistent with ADRs 0007–0014.
