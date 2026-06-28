# Deep research — concurrent-control / spatial-null methodology (prior art + pitfalls for Mode B)

**Date:** 2026-06-28 · **Run:** `wf_34494774-318` · 14 primary/blog sources, 69 claims → 25 verified
(3-vote adversarial), **23 confirmed / 2 killed**. Motivated by ADR 0019 Mode B (treatment − concurrent
control twin → spatial null cancels common-mode → FDR where the temporal null can't).

## Headline

Mode B's design is **established prior art**, and every pitfall it carries is documented elsewhere —
including one framing sharper than ADR 0019 states (control contamination → an *uninterpretable* estimand,
not merely a weakened one).

## The design is established practice

- **Canarying compares against a CONCURRENT control, not history, for exactly our reason.** Google SRE
  Workbook: *"Because time is one of the biggest sources of change in observed metrics, it is difficult to
  assess degradation … with before/after evaluation."* Spinnaker: *"Always compare the canary against an
  equivalent baseline, deployed at the same time."* (`sre.google/workbook/canarying-releases`,
  `spinnaker.io/docs/guides/user/canary`). = Mode B common-mode cancellation.
- **Comparison method: nonparametric two-sample + effect-size floor.** Netflix Kayenta / Spinnaker judge
  with **Mann-Whitney U / Wilcoxon rank-sum**, gated on **both** statistical significance **and** a minimum
  **effect size** (Kayenta `MannWhitneyClassifier`, confLevel 0.95). Precedent: pair the significance gate
  with an effect-size floor.
- **Peer/fleet "odd-one-out" detection is its own literature.** Hendrickx et al. (MSSP 2020,
  **arXiv:1912.12941**): compare each machine to a concurrent cohort, **no historical data needed**.
  **GREYHOUND** (USENIX ATC '25, GPU collective-comms): flags a comm group whose time exceeds the cohort
  **median by >10%**. Odd-One-Out (arXiv:2406.20099, 3D vision): cross-instance comparison. Three
  load-bearing assumptions, identical to ours: **majority-healthy, identical signature, comparable
  environment.**

  *Nuance:* GREYHOUND uses the peer-median contrast for **localization**; its **detection** stage is
  temporal (ACF + change-point). So the closest GPU-domain prior art uses contrast-for-localization +
  temporal-for-detection — Mode B is more aggressive (contrast for detection *and* FDR).

## Pitfalls map 1:1 onto Mode B (with one upgrade)

- **Control contamination — stronger than ADR 0019 states.** Google SRE documents it ("imperfect isolation
  means … bad behavior of the canary can negatively impact the control"; shared infra → both arms move in
  tandem). The DiD-under-interference econometrics (Mealli–Viviens **arXiv:2512.21176**; Xiao–Sun
  **arXiv:2509.24259**) **formalizes** it: the contrast estimand becomes **TATT − ASC** (treated effect
  *minus* control-spillover effect) and **identifies neither magnitude, direction, nor sign.** So a fault
  leaking into the control twin doesn't just weaken the contrast — it makes it **uninterpretable**.
- **Non-comparability / heterogeneous loadings** → "deviating behavior could arise due to a different
  environment instead of a machine's health" (Hendrickx comparability assumption).
- **Common-mode blind spot is structural and universally acknowledged** — when the whole fleet deviates the
  majority-healthy reference is destroyed and nothing flags. Exactly the cdu/pod-cancels-by-design tradeoff
  Mode B already accepts.

## Killed by the adversarial pass (guardrails)

- "Concurrent control *cleanly isolates / not influenced by external factors*" — **refuted 0-3**: necessary,
  not sufficient (shared infra, traffic skew, contamination remain).
- "A single straggler drops *all* GPUs so per-machine telemetry is useless" — **refuted 1-2**: overstated;
  per-machine signal doesn't fully vanish.

## Most actionable gap (next-ADR candidate)

**Runtime tests/contracts to detect control contamination or non-comparability before the contrast silently
goes invalid.** We monitor the *residual* (calibration + whiteness) but have no explicit detector for "the
fault leaked into the twin" or "the loadings diverged" — and the DiD result says that is exactly the failure
that makes the contrast meaningless (TATT − ASC). Candidate signals: pre-contrast level/scale divergence
between twins, a treatment↔control correlation drop, or a control-cohort internal-consistency test.

**Caveat:** the peer/fleet evidence (Hendrickx) is cross-domain (rotating machines, not GPUs) and does not
itself implement an explicit treatment-control contrast *with FDR control*; GREYHOUND is the closest GPU
analog but contrast = localization only. No surveyed source pre-validates Mode B's exact construct
(per-shard GPU fault, spatial null controlling FDR via e-BH) — the prior art validates the *mechanism* and
enumerates the *pitfalls*, by analogy, not the quantitative FDR guarantee.
