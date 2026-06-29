# Deep research — anytime-valid serial-dependence/calibration testing & FDR-at-all-times

**Date:** 2026-06-28 · **Run:** `wf_ec62d949-67d` · 17 primary sources, 75 claims → 25 verified (3-vote
adversarial), **24 confirmed / 1 killed**. Motivated by ADR 0020 (serial-monitor wiring reverted: the
anytime-valid serial monitor could not match the whiteness check's short-window sensitivity at 1 Hz).

## Headline (bears directly on ADR 0020)

The literature does **not** resolve our crux in our favour, and the evidence that exists corroborates the
negative result. No surveyed source shows an anytime-valid construction matching the sensitivity of
short-window `ρ̂`-thresholding when **mild per-tick** dependence accumulates destructively over a **long**
horizon. The two most relevant quantitative results both show anytime-valid monitors paying a real power
penalty *precisely* in the mild regime:

- **SKIT** (Sequential Kernelized Independence Test; Podkopaev, Blöbaum, Kasiviswanathan, Ramdas, ICML 2023,
  **arXiv:2212.07383**): betting wealth grows at asymptotic rate `¼·√HSIC`, so detection time scales as
  `~log(1/α)/√HSIC` — weak dependence → slow accumulation → long delay. The formal analogue of "the
  calibration prefix is too short to accumulate the evidence the detection horizon does."
- **PITMonitor** (Farran 2026, **arXiv:2603.13156**, the paper our index flagged "pending"): anytime-valid
  calibration monitor via a mixture e-process, Type-I control over an unbounded horizon; matches the best
  baselines' detection *rate* but **detection delay is substantially longer under *local* (mild) drift.**

→ Hybrid **estimate-then-bet** (use `ρ̂` to size the bet) remains the open lever — **conjectured, not
proven** anywhere surveyed.

## Problem 1 — anytime-valid serial-dependence / conditional-calibration constructions (all Ville-based)

- **Pairwise-betting exchangeability** (Saha & Ramdas, AISTATS 2024, **arXiv:2310.14293**): single-observation
  betting is *provably powerless*; betting on **pairs** (slightly shrunk filtration) gives a nontrivial test
  martingale, power-one vs broad alternatives. Caveat: optional stopping valid only at **even** stopping times.
- **Conditional independence via betting** — Grünwald–Henzi–Lardy (**arXiv:2209.12637**, growth-rate-optimal
  e-statistics) and Shaer–Maman–Romano (AISTATS 2023, **arXiv:2210.00354**, model-X CRT × testing-by-betting).
  **Assumption cost:** both require knowing/approximating `P(X|Z)` (model-X). For us, the conditional residual
  null — non-trivial to discharge per shard.
- **e-detectors** (Shin–Ramdas–Rinaldo, NEJSDS 2023, **arXiv:2203.03532**): sums of e-processes → SR/CUSUM-style
  change detection with nonasymptotic ARL bounds. The family our `tools/e-detector.ts` already sits in.
- **Rank-based time-uniform independence test** (Henzi & Law, **arXiv:2305.13818**): nonparametric, no model-X.

## Problem 2 — FDR at all times under dependence

- **Stopped-e-BH** (Wang–Dandapanthula–Ramdas 2025, **arXiv:2502.08539**): e-BH controls FDR under arbitrary
  dependence, but **not** automatically at data-dependent stopping times — each stopped e-process is an
  e-value only in its *local* filtration. Recovered under a **causal "no past confounding" condition** that
  makes local e-processes global. **This is exactly our O5 / Assumption-3.1 / conditional-fleet-FDR route**,
  and it gives a concrete check: *does Tessera's common-mode covariate satisfy it?*
- **Carefree / FDR-sup** (**arXiv:2501.19360**): naive running-max e-BH leaks (~1.08α); maxima must pass an
  **adjuster** (`√E−1` or the log-based `A(E)=(E−1−log E)/log²E`); FDR-sup controlled at `K0·α/K`. Confirms our
  `tools/supfdr.ts` and confirms adjusters are **provably power-costly**.
- **Closed e-BH** (Xu–Fischer–Ramdas 2025, **arXiv:2504.11759**): strictly dominates e-BH under arbitrary
  dependence — a free power upgrade (proves e-BH inadmissible). ⚠️ The single **refuted** claim (0-3): a
  specific "rejection needs only `E_j ≥ 1/(α·k)`" threshold-relaxation mechanism — do **not** rely on it.
- **Adjust-then-combine across filtrations** (Choe & Ramdas 2024, **arXiv:2402.09698**): the *same* adjuster
  device unifies Problem 1's cross-filtration e-process combination with Problem 2's FDR-sup; adjusters shown
  *necessary*, not just sufficient.

## Open questions (Tessera-specific)

1. Can a hybrid estimate-then-bet / bet-weighting scheme provably recover short-window `ρ̂` sensitivity for
   mild (ρ≈0.1–0.2) serial dependence while keeping anytime validity? (No source benchmarks the two.)
2. Optimal allocation between calibration-feed length and detection-horizon length for an e-detector / PIT
   monitor so mild accumulating dependence is caught before it corrupts the per-shard e-process. ← this is the
   ADR 0020 "always-on-loop accumulates the cohort over the full duration" lever.
3. Does Tessera's GPU common-mode covariate meet the stopped-e-BH causal/no-past-confounding condition
   (Assumption 3.1 / Cor 3.4) so stopped-e-BH yields genuinely anytime-valid fleet FDR under time-varying
   drift + near-unit-root counters?
4. Closed-eBH vs adjust-then-combine: which is the more power-efficient path to FDR-at-all-times for our fleet?

**Caveat:** several sources are recent preprints (Carefree, stopped-e-BH, closed-eBH 2025; PITMonitor Mar
2026) — theorem numbering/constants may shift. Model-X CI tests carry a real `P(X|Z)` assumption cost.
