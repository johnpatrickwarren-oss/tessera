# PR-F7 Evidence Package — Event-Conditional Correlational Attribution

**Round:** R34 (Wave 4 / WU-06 SLICE 4)
**Author:** Implementer (Tessera Phase 2 SLICE 4)
**Date:** 2026-05-18
**Attribution method:** ITS-class pre/post window comparison (Bernal 2017)
**Status:** Reviewer-verified (4-cell evidence matrix; AC-R34-4..7)

---

## PR-F7 4-Cell Evidence Matrix

Each cell is bound by a Reviewer-verified AC in `test/q34-event-conditional-attribution.test.ts`.
Scenarios are implemented in `test/_substrate/v9Z-event-cluster.ts`.

| Cell | Scenario | Input | Expected Output | Binding AC |
|---|---|---|---|---|
| Cell 1 — Confirmed elevation | scenarioCell1 | 1 ClusterEvent (firmware_push, t=1000); 3 correlated fires in post-window (within 60s); 0 pre-window fires | 1 candidate; member_count=3; pre_window_count=0; correlational_not_causal=true | AC-R34-4 |
| Cell 2 — True negative (no event) | scenarioCell2 | 0 ClusterEvents; 0 FiredShardEvents | candidates.length=0 | AC-R34-5 |
| Cell 3 — Singleton (negative specificity) | scenarioCell3 | 1 ClusterEvent (model_redeploy, t=2000); 1 singleton fire at t=2030 (below min_post_count=2) | candidates.length=0 (F4 branch exercised) | AC-R34-6 |
| Cell 4 — Confounding discrimination | scenarioCell4 | 1 ClusterEvent (config_change, t=3000); 2 correlated fires (within 60s); 2 unrelated fires (>60s from event, inside post-window) | 1 candidate; member_shard_ids=['shard-0','shard-1']; shard-2/shard-3 excluded | AC-R34-7 |

ITS primitive parameters (defaults per Q-R34-SPEC § 3.2 module constants):
- `DEFAULT_PRE_WINDOW_SECONDS = 300`
- `DEFAULT_POST_WINDOW_SECONDS = 300`
- `DEFAULT_CORRELATION_WINDOW_SECONDS = 60`
- `DEFAULT_MIN_POST_COUNT = 2`
- `DEFAULT_MIN_POST_MINUS_PRE_DELTA = 1`

---

## Brodersen et al. 2015 — Inferring causal impact using Bayesian structural time-series models

**URL:** https://doi.org/10.1214/14-AOAS788
**Retrieval date:** 2026-05-18
**Published in:** Annals of Applied Statistics, vol. 9, no. 1, pp. 247-274

> We use a state-space time series model to estimate the causal impact of a designed intervention on a response time series. Given a response time series and a set of control time series, the model is used to construct a Bayesian structural time-series model from which a counterfactual prediction is obtained.

**Tessera relevance:** CausalImpact (Bayesian structural time-series) was evaluated as an attribution method for WU-06. Rejected as overweight for binary per-shard verdict streams (fire/no-fire) — requires a control series; impedance-mismatched at fleet scope where all shards see the same event simultaneously (§ 0.4). The ITS approach (Bernal 2017) was selected instead. This citation completes the PR-F7 literature review per WU-04→WU-06 handoff § "External literature citation evidence package."

---

## Abadie et al. 2010 — Synthetic Control Methods for Comparative Case Studies

**URL:** https://doi.org/10.1198/jasa.2009.ap08746
**Retrieval date:** 2026-05-18
**Published in:** Journal of the American Statistical Association, vol. 105, no. 490, pp. 493-505

> We propose a procedure to construct synthetic control groups in comparative case studies. The synthetic control group is obtained as a weighted combination of potential control units that approximates the characteristics of the affected unit or units in the preintervention period.

**Tessera relevance:** Synthetic control was evaluated as an attribution method for WU-06. Rejected because the method requires a donor pool of non-treated units; all fleet shards see the same deployment event simultaneously, so the donor pool is empty by construction (§ 0.4). The ITS approach was selected. Citation completes PR-F7 literature review per SCOPING-MEMO § 4.4 + § 2.3 attribution-method requirement.

---

## Bernal et al. 2017 — Interrupted time series regression for the evaluation of public health interventions

**URL:** https://doi.org/10.1093/ije/dyw098
**Retrieval date:** 2026-05-18
**Published in:** International Journal of Epidemiology, vol. 46, no. 1, pp. 348-355

> Interrupted time series (ITS) analysis is a quasi-experimental design that can be used to evaluate the longitudinal effects of interventions at a population level. It is particularly useful when a randomized trial is not feasible or ethical. The key requirement is a clearly defined intervention point that interrupts the time series.

**Tessera relevance:** ITS pre/post window comparison is the statistical primitive selected for WU-06 event-conditional attribution (§ 0.4). The approach maps directly to the 4-cell PR-F7 evidence matrix: pre-window per-shard firing rate vs post-window firing rate, classified per shard. Operates on FiredShardEvent lists (the WU-04 input shape) — no new ingestion machinery required. The correlation_window_seconds discriminator (Cell 4) implements the confounding-discrimination step that distinguishes event-correlated from latent-fault-revealed post-window fires.
