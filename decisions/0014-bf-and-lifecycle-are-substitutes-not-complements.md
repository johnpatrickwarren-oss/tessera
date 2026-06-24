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

| n | n/m | mixSM FP | BF FP | both detect |
|---|---|---|---|---|
| 30 | 0.2 | 0.0% | 0.0% | (power-limited, ~55%) |
| 150 | 1.0 | 0.6% | 0.0% | 100% |
| 300 | 2.0 | 1.0% | 0.2% | 100% |
| 600 | 4.0 | **4.6%** | **0.0%** | 100% |

mixSM over-fires (invalid, ≫α) and rises with n; the BF stays ≤α; both keep detection. **The BF's
advantage is real but confined to large n** (a single e-value accumulated over a long horizon WITHOUT
restart/re-record).

**B. The lifecycle's regime — real GWDG, fresh calibration + small fixed test blocks (n small,
re-recorded every block):** mixSM FP **7.6%**, BF FP **11.2%**. With n kept small, the production mixSM is
already valid; **BF ≈ mixSM (no improvement; BF slightly worse — its two-sample split spends data).**

## Decision

**BF + lifecycle does NOT beat the production mixture + lifecycle.** The BF and the lifecycle are
**substitutes** for the plug-in/estimation-error problem: the BF is *valid at large n*; the lifecycle
*keeps n small* by re-recording. The lifecycle's short horizons keep the EXISTING production mixture
detector valid, so the BF adds nothing there. The BF's genuine niche (Part A) is monitoring a long
horizon WITHOUT restart/re-record — which a real monitor avoids.

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
