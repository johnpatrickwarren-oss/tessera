# Tessera — can fleet-level e-BH FDR rescue the guarantee? (No — and here is the root cause)

ADR 0007 left fleet-FDR as the one place a real guarantee could live. e-BH (Wang–Ramdas) controls FDR ≤ q under arbitrary dependence — BUT only if each e-value is marginally VALID (E[e|H0] ≤ 1). So the prior question is: are Tessera's e-values valid on real(istic) data? Target FDR q=0.1.

## A. Root cause — is the betting-e-process e-value VALID? (E[e|H0] ≤ 1?)

Terminal wealth on healthy nulls, for {iid, AR(1)} × {true baseline, plug-in (estimated) baseline}. A valid e-value needs E[e] ≤ 1 and P(fire) ≤ α.

| regime | baseline | E[e] | median e | P(e ≥ 1/α) | valid? |
|---|---|---|---|---|---|
| iid | true | 1.69e-1 | 0.065 | 0 | ✅ |
| iid | plug-in | 6.59e+8 | 0.197 | 0.12 | ❌ |
| AR(1) ρ=0.5 | true | 3.83e+3 | 0.141 | 0.025 | ❌ |
| AR(1) ρ=0.5 | plug-in | 8.43e+32 | 3.622 | 0.358 | ❌ |

**The e-value is valid ONLY with the true baseline AND iid data.** Plug-in baseline estimation (unavoidable — a real detector must estimate mean/variance) inflates E[e] by orders of magnitude; autocorrelation (ubiquitous in telemetry) breaks it independently; together they compound. Since e-BH *requires* valid marginal e-values, it cannot control FDR when fed these — **the failure is upstream of the fleet layer**, in the e-value itself.

## B. Consequence — real null: naive fleet e-BH on real healthy GWDG structural shards

55 real healthy shards (GWDG-structural-scrape_samples_scraped); all healthy → every rejection is a false discovery.

**Naive fleet e-BH rejected 34/55 shards** — all false discoveries. FDP among rejections = 100% ≫ q=10.0% (if any rejected). The per-shard e-value invalidity (drift) propagates: naive fleet e-BH does NOT control FDR on real data.

## C. Synthetic ground truth — naive vs fleet-relative e-BH (does removing common-mode help?)

60 shards sharing a common-mode random-walk drift + idiosyncratic AR(1) noise; 10 carry an injected step failure after onset. 150 trials. **Naive** = e-value on the raw shard; **fleet-relative** = e-value on the residual after subtracting the per-timestamp cross-shard median (common-mode removed).

| construction | mean FDP | target q | mean power | mean rejections |
|---|---|---|---|---|
| naive (raw) | 77.6% | 10.0% | 86.1% | 51.393 |
| **fleet-relative** | 73.9% | 10.0% | 100.0% | 38.633 |

Both fail to control FDP: naive 77.6%, **fleet-relative 73.9%** vs q=10.0% (relative power 100.0% — it finds the failures, but drowns them in false discoveries). Removing the common-mode does NOT rescue it, because the e-value is invalid for a reason the fleet layer can't touch: plug-in baseline + idiosyncratic per-shard offsets still inflate each healthy shard's wealth (Part A). e-BH faithfully propagates invalid inputs into an uncontrolled FDP.

## Verdict

**Fleet-level e-BH does NOT rescue the guarantee.** The root cause (Part A) is upstream: the betting-e-process terminal wealth is not a valid e-value under plug-in baselines or autocorrelation, and e-BH requires valid e-values. A real guarantee would require a **valid e-value construction** — one robust to an unknown/estimated baseline and to autocorrelation (e.g. a mixture / confidence-sequence martingale that integrates over the nuisance mean, with whitening) — i.e. a redesign of the per-shard test, not a fleet wrapper. That is the honest next direction; until then, Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry.

> **Scope:** ground-truth FDP needs failure labels (absent in real fleet telemetry), so Parts A & C are synthetic, parameterized to the *measured* real behavior (ADR 0007); Part B confirms the naive failure on actual healthy telemetry. A real labeled fleet remains the outstanding validation.
