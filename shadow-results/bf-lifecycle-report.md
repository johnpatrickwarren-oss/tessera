# Tessera — BF + lifecycle: substitute, not complement (honest negative)

The production Family-A detector already IS a mixture e-value (Howard-Ramdas Gaussian mixture supermartingale). It shares the plug-in invalidity, but only in the UNDER-POWERED regime (test horizon n ≫ calibration m=150). The nuisance-robust BF (ADR 0013) is valid there. Question: does BF + lifecycle beat the production mixture + lifecycle? α=0.01.

## A. Horizon sweep — single e-value, NO restart, fixed calibration, growing test horizon n

| n (test horizon) | n/m | mixSM FP | BF FP | mixSM E[e\|H0] | BF E[e\|H0] | mixSM detect | BF detect |
|---|---|---|---|---|---|---|---|
| 30 | 0.2 | 0.0% | 0.0% | 1.023 | 0.133 | 72.8% | 50.4% |
| 75 | 0.5 | 0.8% | 0.0% | 22.397 | 0.166 | 100.0% | 99.6% |
| 150 | 1 | 1.4% | 0.0% | 1069.071 | 0.186 | 100.0% | 100.0% |
| 300 | 2 | 1.8% | 0.2% | 37303060.955 | 0.437 | 100.0% | 100.0% |
| 600 | 4 | 8.4% | 0.0% | 3069217410.49 | 0.091 | 100.0% | 100.0% |

As the un-restarted horizon n grows past the calibration m, the **production mixSM over-fires** (invalid) while the **BF stays ≤ α** — both keep ~full detection. So the BF's advantage is REAL but confined to large-n (long accumulation without restart/re-record). The mechanism is visible in **E[e|H0]**: a valid e-value has E[e|H0]≤1, and the BF holds (≤0.44 throughout) while the mixSM's is already marginally >1 at the smallest n and explodes to ~3×10⁹ by n/m=4 — the plug-in null-mean estimation error, present from the start, compounding without restart.

## B. The lifecycle's regime — fresh calibration, small fixed n, on REAL GWDG

55 real healthy streams, 1277 windows (fresh cal=150 immediately preceding each test=50, i.e. re-recorded every block — the lifecycle keeping n small): **mixSM FP 19.1%, BF FP 11.2%.**

With the lifecycle keeping n small, estimation error is controlled (m≫n) — the mixSM E[e] explosion (Part A) needs large n, so the production mixSM is **already valid here**. The corrected mixSM fires MORE than the BF on this real data (19.1% vs 11.2%), but this is a **sensitivity tradeoff, not a validity gap**: the plug-in mixSM is uniformly more reactive than the two-sample BF. It fires more on the REAL benign mean change that dominates these healthy windows — and it also **detects more** (Part A, n=30: mixSM 72.8% vs BF 50.4%). The BF's lower FP is bought with lower detection (its split "spends data"); neither dominates, and in-lifecycle neither needs the other.

## Verdict

**BF + lifecycle does NOT beat the production mixture + lifecycle.** The BF and the lifecycle are SUBSTITUTES for the plug-in/estimation-error problem: the BF is *valid at large n*; the lifecycle *keeps n small* (re-record). The lifecycle's short horizons keep the EXISTING production mixture detector VALID, so the BF's estimation-error fix is moot in-lifecycle (Part B): there the corrected mixSM and the BF differ only by the BF's uniform conservatism — lower real-data FP bought with lower detection — not by validity. The BF's genuine niche (Part A) is monitoring a long horizon WITHOUT restart/re-record — which a real monitor avoids.

**Recommendation:** keep the production mixture detector + add the lifecycle (ADR 0011) for drift; reserve the nuisance-robust BF (ADR 0013) for sparse-re-record / long-horizon settings (and as the rigorous proof that the plug-in invalidity is fixable). The end-to-end real-data guarantee's remaining lever is the contamination-robust fleet common-mode (ADR 0012), NOT a BF-lifecycle merge.

> **Scope:** Part A is synthetic (FP/detection need labels); Part B is real but FP-only (healthy). The mixSM uses σ²_prior = innovation variance; a different proper prior shifts constants, not the n-dependence.
