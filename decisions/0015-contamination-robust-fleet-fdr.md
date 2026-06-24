# ADR 0015 — contamination-robust fleet-FDR: the BF e-value closes the FP/FDR guarantee (Lever A)

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye SHIP-WITH-FIXES — all findings addressed)
- **Builds on:** ADR 0012 (fleet-relative separates faults but FDP 0.72–0.77 ≫ q), ADR 0013 (the
  nuisance-robust BF e-value), ADR 0008 (e-BH needs valid marginal e-values).

## Context

ADR 0012 left a calibrated fleet-FDR guarantee blocked on two named, unbuilt pieces: (a) the cross-shard
common-mode center (per-tick MEDIAN) is contaminated by the faults' correlated onset, and (b) the
residual e-value was the PLUG-IN betting process, not the BF. This is the first of two levers to build
toward an end-to-end real-data FP/FDR guarantee using the BF e-value.

## Construction

On a fleet matrix `X[i][t]` (cal `[0,M)` assumed healthy, test `[M,M+N)`):
1. **Per-shard level** `ℓ̂_i = median_{t<M} X[i][t]` — removes the baseline level that confounded ADR
   0012's value-rank trimming (a faulty-but-low-level shard sat mid-pack).
2. **Level-adjusted cross-section** `Y[i][t] = X[i][t] − ℓ̂_i` — now faults ARE the cross-sectional
   outliers (verified by a rank-flip test).
3. **Redescending Tukey-biweight common-mode** `c_t = robustCenter({Y[i][t]})` — gives true outliers
   weight EXACTLY 0 (Huber's soft downweight leaked at heavy load: 42% FDP; the biweight → 1.6%).
4. **Robust residual** `R[i][t] = Y[i][t] − c_t`.
5. **BF e-value** `e_i = nuisanceRobustEValue(R[i], M, N)` — valid by construction (`E[BF|H0]≤1`).
6. **e-BH** `eBH({e_i}, q)`.

## Result (`pnpm crfleet`, `shadow-results/contamination-robust-fleet-report.md`)

- **Synthetic (60-shard fleet, heavy shared drift + shard-specific step faults):** realized FDP
  **0.72–0.77 → ≤ q** at full power. Ablation confirms BOTH pieces are necessary: median+plug-in 76.8%,
  median+BF 68.5%, robust+plug-in 11.3%, **robust+BF 1.6%**. Null-fleet residual e-value is valid
  (E[e]=0.067, P(fire)=0), so e-BH controls FDR by construction.
- **Breakdown (honest envelope):** the fine sweep shows FDP crosses q at **~12/60 (20% contamination)**
  — 10/60→2.0%, 12/60→13.7%, 14/60→57.7%. The margin above the default load is NARROW; the guarantee is
  conditional on the fault fraction staying well under ~20%.
- **FD is conditional:** detection is a power curve in the fault step δ (δ=1→10%, δ=2→99%, δ≥3→100%) —
  FDR≤q is guaranteed; detection is "≥ X for faults ≥ δ", not unconditional.
- **Real GWDG (FP-only, genuinely co-sampled cohort of 15 same-launch shards on the shared 600s grid):**
  the robust construction does NOT help — naive 5/15 → robust **7/15 (mildly worse)**. GWDG shards are
  heterogeneous exporters with little shared common-mode, so subtracting a per-tick center mostly removes
  noise. This is the key real-data finding: **fleet-relative is conditional on genuine common-mode
  coupling, not a free win** — and the residual firing is shard-SPECIFIC benign change → Lever B.

## Decision

**On a common-mode-coupled fleet, Lever A delivers the calibrated FP/FDR guarantee ADR 0012 could not**,
by construction (valid BF e-value + contamination-robust center + e-BH), within a bounded envelope:
fault fraction well under ~20% (the robust breakdown), scalar common-mode, stable variance (ADR 0013).
FD is characterized (power-vs-δ), not unconditionally guaranteed. On a low-common-mode fleet (real GWDG)
it gives no benefit and can mildly worsen FP — the shard-specific residual is Lever B's job.

## Honest bounds

- **Breakdown ~12/60 (20%)**, narrow margin above the default load.
- **FD conditional** on effect ≥ δ.
- **Scalar common-mode** (homogeneous loading); heterogeneous loadings → a multi-factor model is future.
- **Masked faults**: a shard faulted through its calibration window is absorbed into ℓ̂_i (cold-start).
- **Low-common-mode fleets**: fleet-relative removal can mildly INCREASE FP — apply only to coupled fleets.

## Ruled out / gotchas

- Synthetic ground truth for FDP/power (no real labels); real GWDG is FP-only.
- The real cross-section MUST be timestamp-aligned (`ts_epoch_ms`) — the 55 GWDG streams span 12 start
  dates across 2025–2026, so a position-index cross-section would be apples-to-oranges (a cold-eye fix).
- "Guaranteed by construction" is conditional on the three envelope conditions above — stated, not absolute.
