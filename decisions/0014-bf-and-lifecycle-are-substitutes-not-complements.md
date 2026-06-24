# ADR 0014 — the BF e-value and the lifecycle are substitutes, not complements (the production detector already mixes)

- **Status:** Accepted (honest negative; closes the BF+lifecycle question)
- **Date:** 2026-06-24

## Context

After ADR 0013 (nuisance-robust BF e-value), the plan was a "BF + lifecycle" integration to drive the
real-data fire rate toward α. An operator question — *"don't we already use a BF e-value in the detector
path?"* — prompted checking the engine: the **production Family-A detector IS a mixture e-value** (the
Howard-Ramdas Gaussian mixture supermartingale, `computeGaussianMixtureSupermartingale`). It mixes the
ALTERNATIVE shift and **plugs in the null baseline mean**. `tools/bf-lifecycle.ts` tests whether the BF
improves the lifecycle over this existing detector.

## Findings

**The production mixture shares the plug-in invalidity (verified directly, 3-way, under-powered null
m=300,n=680):** production mixSM E[e]=1700, P(fire)=2.0% ❌; betting e-process E[e]=437, 2.2% ❌;
nuisance-robust BF E[e]=0.03, 0% ✅. (The arc had tested the betting e-process as a proxy; this confirms
the *production* mixture detector has the same flaw, and the BF fixes it.)

**A. Horizon sweep — single e-value, no restart, fixed calibration m=150, growing test horizon n:**

| n | n/m | mixSM FP | BF FP | mixSM E[e\|H0] | BF E[e\|H0] | mixSM detect | BF detect |
|---|---|---|---|---|---|---|---|
| 30 | 0.2 | 0.0% | 0.0% | 1.02 | 0.13 | 72.8% | 50.4% |
| 75 | 0.5 | 0.8% | 0.0% | 22 | 0.17 | 100% | 99.6% |
| 150 | 1.0 | 1.4% | 0.0% | 1069 | 0.19 | 100% | 100% |
| 300 | 2.0 | 1.8% | 0.2% | ~3.7e7 | 0.44 | 100% | 100% |
| 600 | 4.0 | **8.4%** | **0.0%** | **~3.1e9** | 0.09 | 100% | 100% |

mixSM over-fires (invalid, ≫α) and rises with n; the BF stays ≤α; both keep detection. The invalidity is
explicit in **E[e\|H0]** (valid ⇒ ≤1): the BF holds (≤0.44) while the mixSM is already marginally >1 at the
smallest n and explodes to ~3×10⁹ by n/m=4.
**The BF's advantage is real but confined to large n** (a single e-value accumulated over a long horizon
WITHOUT restart/re-record).

**B. The lifecycle's regime — real GWDG, fresh calibration + small fixed test blocks (n small,
re-recorded every block):** mixSM FP **19.1%**, BF FP **11.2%**. With n kept small, estimation error is
controlled (m≫n) so the production mixSM is **already valid** (the E[e] explosion needs large n). The
corrected mixSM fires MORE than the BF here, but this is a **sensitivity tradeoff, not a validity gap**:
the plug-in mixSM is uniformly more reactive than the two-sample BF — it fires more on the REAL benign
mean change dominating these healthy windows AND **detects more** (Part A, n=30: 72.8% vs 50.4%). The BF's
lower FP is bought with lower detection (its split spends data); **neither dominates in-lifecycle**.

## Decision

**BF + lifecycle does NOT beat the production mixture + lifecycle.** The BF and the lifecycle are
**substitutes** for the plug-in/estimation-error problem: the BF is *valid at large n*; the lifecycle
*keeps n small* by re-recording. The lifecycle's short horizons keep the EXISTING production mixture
detector VALID, so the BF's estimation-error fix is moot there: in-lifecycle the corrected mixSM and the
BF differ only by the BF's uniform conservatism (lower FP, lower detection), not by validity. The BF's
genuine niche (Part A) is monitoring a long horizon WITHOUT restart/re-record — which a real monitor avoids.

## Why — and the recommendation

- **Not "BF upgrades the lifecycle"** — measured: it doesn't (Part B); they address the same problem two
  ways.
- **Recommendation:** keep the production mixture detector + add the lifecycle (ADR 0011) for drift;
  reserve the nuisance-robust BF (ADR 0013) for sparse-re-record / long-horizon settings (and as the
  rigorous proof, now extended to the production detector, that the plug-in invalidity is fixable). The
  end-to-end real-data guarantee's remaining lever is the **contamination-robust fleet common-mode**
  (ADR 0012), NOT a BF-lifecycle merge.

## Consequences — the constructive phase, honestly closed

The arc (0001–0014): detection/separation solvable and decomposed; the e-value invalidity (0008) is
fixable (0013) and confirmed to affect the real production detector (this ADR); but in the operational
lifecycle the existing mixture detector is already adequate (short horizons), so the practical remaining
work is the contamination-robust fleet common-mode, not the e-value. Honest artifact claim unchanged:
strong detection; a calibrated guarantee is not yet end-to-end on real data, with the remaining lever
identified.

## Ruled out / gotchas

- Part A synthetic; Part B real but FP-only (healthy, benign-change-dominated). σ²_prior = innovation
  variance for the mixSM; a different proper prior shifts constants, not the n-dependence.
- The substitute relationship assumes the monitor restarts/re-records (keeps n small); a monitor that
  accumulates indefinitely against a fixed short calibration would still need the BF.

## Addendum (2026-06-24) — production-parity variance correction

`mixWin` was passing the **marginal** sample variance to the mixture supermartingale where the production
engine standardizes whitened AR(1) residuals against the **innovation** variance σ²·(1−φ²)
(`estimateAr1(cal).sigma2`; `fit-production-substrate` stamps this as `baseline_sigma_squared` when
`ar1_phi` is set). Marginal over-scales σ² by 1/(1−φ²) and *under*-fires the mixSM. Effect of the fix
(numbers above are post-fix): (1) Part A E[e] explosion is sharper (the headline invalidity evidence,
now surfaced as an E[e|H0] column); (2) Part B real-data mixSM FP rose 7.6% → 19.1%, **above** BF's 11.2%
— previously below it. The conclusion is unchanged: this is the corrected (less-conservative) plug-in
mixSM's greater **sensitivity** (it also detects more, Part A), not a BF validity advantage in-lifecycle.
Cold-eye-reviewed (independent fresh-context audit): variance quantity, production parity, prevC=0
boundary (production-faithful, ≤1.1% Var inflation), and guards all confirmed correct.
