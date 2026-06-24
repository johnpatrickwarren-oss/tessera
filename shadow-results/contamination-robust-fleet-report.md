# Tessera — contamination-robust fleet-FDR: the BF e-value closes the FP/FDR guarantee (Lever A)

ADR 0012 left FDR uncontrolled (FDP 0.72–0.77 ≫ q) for two named reasons: the cross-shard center was contaminated by the faults, and the residual e-value was the plug-in (not the BF). This builds both: (1) remove each shard's calibration LEVEL, making faults the cross-sectional outliers; (2) a redescending Tukey-biweight common-mode (c=4.685) resists them; (3) the nuisance-robust BF e-value (ADR 0013) on the residual; (4) e-BH. Synthetic 60-shard fleet, heavy shared drift + shard-specific step faults, m=1500/n=300, 100 trials, q=0.1 unless noted.

## Ablation — which piece controls FDR? (default load, q=0.1)

| center | e-value | FDP | power |
|---|---|---|---|
| median (ADR 0012) | plug-in | 76.8% | 100.0% |
| median | BF | 68.5% | 100.0% |
| robust (Tukey+demean) | plug-in | 11.3% | 100.0% |
| robust (Tukey+demean) | BF | 1.6% | 100.0% |

**Both pieces are necessary.** The median center keeps FDP high under either e-value (the faults contaminate it); the robust demean+Tukey center is what makes the residual clean, and the BF e-value is what makes the residual e-value valid — only the bottom row (robust + BF) controls FDP at full power.

## FDR control vs the fault fraction (q=0.1) — old (ADR 0012: median+plug-in) vs new (robust+BF)

| faults / 60 | old FDP | old power | **new FDP** | **new power** |
|---|---|---|---|---|
| 2 | 14.5% | 100.0% | **0.0%** | **100.0%** |
| 5 | 53.1% | 100.0% | **0.0%** | **100.0%** |
| 10 | 78.9% | 100.0% | **2.0%** | **100.0%** |
| 12 | 78.7% | 100.0% | **13.7%** | **100.0%** |
| 14 | 76.2% | 100.0% | **57.7%** | **100.0%** |
| 16 | 73.3% | 100.0% | **72.5%** | **100.0%** |
| 20 | 66.7% | 100.0% | **66.7%** | **100.0%** |
| 30 | 50.0% | 100.0% | **50.0%** | **100.0%** |
| 40 | 33.3% | 100.0% | **33.3%** | **100.0%** |

The new construction holds **FDP ≤ q** while the old runs 0.6–0.8, at retained power — until the robust center's **breakdown at 12/60 faults** (20.0% contamination), past which a minority-robust center can no longer isolate the common-mode. **The margin above the default load is NARROW** — the default 10/60 is controlled (2.0%) but FDP crosses q just two faults later, and is steep beyond (14/60 → 57.7%). This is the honest envelope: FP/FDR is guaranteed only while the minority-fault assumption holds (fault fraction well under ~20%).

## FP/FDR is guaranteed by construction; FD is conditional on effect size

**FP/FDR:** the residual BF e-value is valid on the null fleet (no faults) — E[e]=0.067, median 0.016, P(e≥1/α)=0.0% ≤ α — so e-BH controls FDR ≤ q by construction (valid e-values in, FDR out). Two dependence subtleties are handled: e-BH (Wang–Ramdas) controls FDR under ARBITRARY cross-shard dependence, so the shared center c_t across shards is fine; and c_t is estimated IN-SAMPLE (shard i included), but its O(1/N) self-pull shrinks shard i's own residual toward 0 — CONSERVATIVE for false firing (the measured E[e]=0.067 ≪ 1 reflects this).

| q | new FDP | new power |
|---|---|---|
| 0.1 | 1.6% | 100.0% |
| 0.05 | 1.0% | 100.0% |
| 0.01 | 0.3% | 100.0% |

**FD (detection) is NOT unconditional** — it is a power curve in the fault step δ (default load, latency = the test window):

| fault step δ | detection |
|---|---|
| 1 | 10.1% |
| 2 | 98.9% |
| 3 | 100.0% |
| 5 | 100.0% |
| 8 | 100.0% |

So the honest claim is **FDR ≤ q guaranteed, AND detection ≥ X for faults of magnitude ≥ δ** — detection rises from 10.1% at δ=1 to 100.0% at δ=8; tiny faults below the noise are not guaranteed caught (no method can).

## Real fleet (FP-only) — GWDG healthy structural shards

A genuinely co-sampled cross-section: 15 healthy shards from the largest same-day co-sampled cohort (launch 2025-03-14, shared 600s grid, 800 aligned ticks), m=600/n=200; all healthy → every rejection is a false discovery. **Naive (per-shard, no cross-section) e-BH rejected 5/15; the contamination-robust construction rejected 7/15** — slightly WORSE, not better. (This naive baseline is recomputed on this cohort/window — it is NOT fleet-fdr's full-fleet 34/55.)

This is the **honest boundary of Lever A**, and it is the key real-data finding: removing a cross-shard common-mode only helps when there IS substantial common-mode. These same-day GWDG shards are heterogeneous exporters (node-exporter/dcgm/ipmi) with **little shared common-mode**, so the per-tick robust center is mostly tracking idiosyncratic noise — subtracting it does not reduce (here slightly increases) the false discoveries. The real firing is **shard-SPECIFIC benign change** (consistent with ADR 0013: real GWDG firing is benign mean drift growing with cal–test separation), which Lever A does not target and can mildly worsen. Lever A's guarantee is **conditional on genuine common-mode coupling** (the synthetic above; a real coupled cluster sharing workload/thermal/power) — NOT a free win on any fleet. The shard-specific residual is exactly what **Lever B** (the benign-change/fault discriminator) must address. (Scope: FP-only — no real fault labels; 15 shards is a small cohort.)

## Verdict

**On a common-mode-coupled fleet, Lever A delivers the calibrated FP/FDR guarantee ADR 0012 could not — within a bounded envelope.** The robust demean+Tukey-biweight common-mode + the nuisance-robust BF e-value drive realized FDP from 0.72–0.77 to **≤ q** at retained power (100.0%). The control is by construction (valid marginal e-values ⇒ e-BH FDR control) but **conditional**: it holds only while the fault fraction is well under the robust center's breakdown (~12/60, 20.0%), the common-mode is scalar, and the variance is stable (inherited from ADR 0013). The two ADR 0012 blockers are removed: the center is no longer contaminated (demean makes faults the outliers; the redescending estimator rejects them), and the e-value is valid (BF, not plug-in). **The win is contingent on the benign change being common-mode** — on the heterogeneous GWDG cohort (little shared common-mode) the real FP does NOT improve (5→7, mildly worse): there the residual is shard-SPECIFIC benign change → Lever B.

**Honest bounds (the guarantee's envelope):**
- **FP/FDR ≤ q** holds by construction only while the fault fraction stays well under ~12/60, 20.0%; the margin above the default 10/60 is narrow.
- **FD is conditional**: detection ≥ X for faults of magnitude ≥ δ (power curve above) — not an unconditional detection guarantee.
- **Scalar common-mode**: assumes a homogeneous factor loading. Heterogeneous loadings leave residual common-mode → a multi-factor model is the next lever if real data shows it.
- **Masked faults**: a shard faulted THROUGH its calibration window has the fault absorbed into ℓ̂_i (a cold-start/lifecycle case, not covered here).
- **Low-common-mode fleets**: when there is little shared common-mode, subtracting a per-tick center mostly removes noise and can mildly INCREASE FP (measured on the real GWDG cohort) — fleet-relative is not a free win; apply it only to genuinely coupled fleets.
- **Shard-specific BENIGN change** (not common-mode) still fires — that is Lever B (the benign-change/fault discriminator), the next increment.

> **Scope:** synthetic ground truth for FDP/power (labels needed); real GWDG is FP-only (healthy). The common-mode is a per-tick scalar; whitening + the BF handle autocorrelation + the unknown baseline.
