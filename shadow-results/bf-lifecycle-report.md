# Tessera — BF + lifecycle: substitute, not complement (honest negative)

The production Family-A detector already IS a mixture e-value (Howard-Ramdas Gaussian mixture supermartingale). It shares the plug-in invalidity, but only in the UNDER-POWERED regime (test horizon n ≫ calibration m=150). The nuisance-robust BF (ADR 0013) is valid there. Question: does BF + lifecycle beat the production mixture + lifecycle? α=0.01.

## A. Horizon sweep — single e-value, NO restart, fixed calibration, growing test horizon n

| n (test horizon) | n/m | mixSM FP | BF FP | mixSM detect | BF detect |
|---|---|---|---|---|---|
| 30 | 0.2 | 0.0% | 0.0% | 57.0% | 50.4% |
| 75 | 0.5 | 0.6% | 0.0% | 99.8% | 99.6% |
| 150 | 1 | 0.6% | 0.0% | 100.0% | 100.0% |
| 300 | 2 | 1.0% | 0.2% | 100.0% | 100.0% |
| 600 | 4 | 4.6% | 0.0% | 100.0% | 100.0% |

As the un-restarted horizon n grows past the calibration m, the **production mixSM over-fires** (invalid) while the **BF stays ≤ α** — both keep ~full detection. So the BF's advantage is REAL but confined to large-n (long accumulation without restart/re-record).

## B. The lifecycle's regime — fresh calibration, small fixed n, on REAL GWDG

55 real healthy streams, 1277 windows (fresh cal=150 immediately preceding each test=50, i.e. re-recorded every block — the lifecycle keeping n small): **mixSM FP 7.6%, BF FP 11.2%.**

With the lifecycle keeping n small (fresh calibration), the production mixSM is already valid — **BF ≈ mixSM (no improvement; BF slightly worse, its two-sample split spends data).** The remaining firing is REAL benign change, not estimation error (a lifecycle/fleet concern).

## Verdict

**BF + lifecycle does NOT beat the production mixture + lifecycle.** The BF and the lifecycle are SUBSTITUTES for the plug-in/estimation-error problem: the BF is *valid at large n*; the lifecycle *keeps n small* (re-record). The lifecycle's short horizons keep the EXISTING production mixture detector valid, so the BF adds nothing there (Part B). The BF's genuine niche (Part A) is monitoring a long horizon WITHOUT restart/re-record — which a real monitor avoids.

**Recommendation:** keep the production mixture detector + add the lifecycle (ADR 0011) for drift; reserve the nuisance-robust BF (ADR 0013) for sparse-re-record / long-horizon settings (and as the rigorous proof that the plug-in invalidity is fixable). The end-to-end real-data guarantee's remaining lever is the contamination-robust fleet common-mode (ADR 0012), NOT a BF-lifecycle merge.

> **Scope:** Part A is synthetic (FP/detection need labels); Part B is real but FP-only (healthy). The mixSM uses σ²_prior = innovation variance; a different proper prior shifts constants, not the n-dependence.
