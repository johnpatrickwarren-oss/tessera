# Tessera — can fleet-level e-BH FDR rescue the guarantee? (No — and here is the root cause)

ADR 0007 left fleet-FDR as the one place a real guarantee could live. e-BH (Wang–Ramdas) controls FDR ≤ q under arbitrary dependence — BUT only if each e-value is marginally VALID (E[e|H0] ≤ 1). So the prior question is: are Tessera's e-values valid on real(istic) data? Target FDR q=0.1.

## A. Root cause — is the betting-e-process e-value VALID? (E[e|H0] ≤ 1?)

Terminal wealth on healthy nulls, for {iid, AR(1)} × {true baseline, plug-in (estimated) baseline}. A valid e-value needs E[e] ≤ 1 and P(fire) ≤ α.

| configuration | E[e] | median e | P(e ≥ 1/α) | valid? |
|---|---|---|---|---|
| iid · true baseline | 1.69e-1 | 0.065 | 0 | ✅ |
| iid · PLUG-IN baseline | 4.50e+11 | 0.204 | 0.108 | ❌ |
| AR(1) · true baseline · NO whitening (φ=0) | 2.51e+2 | 0.158 | 0.033 | ❌ |
| AR(1) · true baseline · WHITENED (est. φ) | 2.12e-1 | 0.065 | 0 | ✅ |
| AR(1) · PLUG-IN baseline · WHITENED (est. φ) | 2.02e+7 | 0.131 | 0.115 | ❌ |

**Whitening fixes autocorrelation; the plug-in baseline is the unavoidable invalidator.** Read the rows: AR(1) with *no* whitening is invalid, but AR(1) **whitened** (estimated φ — the production path we already ship) is **valid** — so autocorrelation is solved. What is NOT solved is the **plug-in baseline**: estimating mean/variance from a finite prefix invalidates the e-value even for iid data, and even with whitening applied. Since e-BH *requires* valid marginal e-values, it cannot control FDR when fed these — **the failure is upstream of the fleet layer, in the plug-in baseline of the e-value itself.**

## B. Consequence — real null: naive fleet e-BH on real healthy GWDG structural shards

55 real healthy shards (GWDG-structural-scrape_samples_scraped); all healthy → every rejection is a false discovery.

**Naive fleet e-BH rejected 34/55 shards** — all false discoveries. FDP among rejections = 100% ≫ q=10.0% (if any rejected). The per-shard e-value invalidity (drift) propagates: naive fleet e-BH does NOT control FDR on real data.

## C. Synthetic ground truth — naive vs fleet-relative e-BH (does removing common-mode help?)

60 shards sharing a common-mode random-walk drift + idiosyncratic AR(1) noise; 10 carry an injected step failure after onset. 150 trials. **Naive** = e-value on the raw shard; **fleet-relative** = e-value on the residual after subtracting the per-timestamp cross-shard median (common-mode removed).

| construction | mean FDP | target q | mean power |
|---|---|---|---|
| naive (raw) | 77.6% | 10.0% | 86.1% |
| fleet-relative (common-mode removed) | 73.9% | 10.0% | 100.0% |
| **fleet-relative + whitening** | 58.7% | 10.0% | — |

All three fail to control FDP vs q=10.0%: naive 77.6%, fleet-relative 73.9%, **fleet-relative + whitening 58.7%**. Removing common-mode AND whitening (every mitigation we have) does NOT rescue it — the plug-in baseline keeps each healthy shard's e-value invalid (Part A), and e-BH faithfully propagates invalid inputs into an uncontrolled FDP. Power stays high (100.0%): the failures are found, then drowned in false discoveries.

## Verdict

**Fleet-level e-BH does NOT rescue the guarantee.** The root cause (Part A) is upstream and specific: the betting-e-process terminal wealth is invalidated by the **plug-in baseline** (estimating mean/variance from a finite prefix). Autocorrelation is NOT the problem — the whitening we already ship makes the AR(1) case valid. So the one remaining fix is a **nuisance-baseline-robust e-value**: instead of plugging in a point estimate of mean/variance, integrate over the unknown baseline (a method-of-mixtures / confidence-sequence martingale), combined with the existing whitening. That is a redesign of the per-shard test, not a fleet wrapper, and it is the honest next direction (ADR 0008). Until then, Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry.

> **Scope:** ground-truth FDP needs failure labels (absent in real fleet telemetry), so Parts A & C are synthetic, parameterized to the *measured* real behavior (ADR 0007); Part B confirms the naive failure on actual healthy telemetry. A real labeled fleet remains the outstanding validation.
