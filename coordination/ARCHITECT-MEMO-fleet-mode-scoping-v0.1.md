# ARCHITECT-MEMO — Fleet-Mode Scoping (v0.1)

_From: Architect. To: John (decision-routing). Routed via: TPM._
_Date: 2026-05-15._
_Foundation: TPM intake 2026-05-15 (this-chat motivation); Phase-3.d.D BATCH close 2026-05-07; NORTH-STAR § Additions #2 / #12 / #23 (cell-matrix + per-pod + tenant-tier extension); DISCIPLINE-REFERENCE.md (Memorial D / Memorial F / pair-review 3-check)._
_Type: **SCOPE-PROPOSAL** (NOT spec). Per Q-NN-SPEC-TEMPLATE frame at reduced fidelity: phase-letter granularity, no pseudo-code, no AC numbering, no implementation-surface enumeration. Estimates Q-cycle count + Memorial D candidate-set additions + pair-review trigger conditions to inform John's phase-letter sequencing decision._
_Sequencing: Phase E (production deployment hardening) is currently TAGGED-FUTURE post-Phase-3.d.D close. Fleet-mode is a candidate **Phase F** (per-shard infrastructure) + possibly **Phase G** (cross-shard correlation) — separate from Phase E, not a Phase E extension. See § Q-cycle estimate for split rationale._

---

## 1. Executive summary

DeploySignal's current architecture is a single-deployment decision engine: one canary → one verdict, with per-cell baselines indexed over `(hour_of_day, day_of_week, workload_class, tenant_tier, …)` cell dimensions (NORTH-STAR Addition #2 / #23). Fleet-mode extends this to **N tightly-coupled shards of one workload** — exemplar: 100-10000 GPU shards in an AI training/inference cluster — where each shard's metrics flow through its own detector-family pipeline AND the cluster needs cross-shard attribution (one bad GPU vs fleet-wide event). The three architectural extensions requested are: (1) α-budget arithmetic at fleet scale (so naive replication doesn't multiply FPR by N); (2) per-shard baseline calibration (so cold-starts and correlated drift don't break Q70 calibration assumptions); (3) cross-shard correlation layer (so the operator sees "shard 47 is bad" instead of N independent alerts).

**Phase-letter estimate: Phase F + Phase G, sequenced.** Phase F (per-shard infrastructure) covers Extensions 1 + 2 — they reuse cell-matrix / e-process / hierarchical-pooling primitives already in the codebase and share a calibration substrate; bundling them in one phase reduces α-bookkeeping double-touch risk in the way Q57's anti-scope did (LEDGER:67). Phase G (cross-shard correlation) is a genuinely new ingestion surface (cluster topology, deployment-event feed) with no current architectural antecedent; isolating it in its own phase preserves the per-shard infrastructure as a known-coherent foundation against which Phase G is differentially validated. Estimated **18-26 Q-cycles** total across Phase F + G; Memorial D candidate-set additions on hierarchical e-process + FDR-style + topology-aware common-mode attribution; pair-review triggers on Extensions 1 (hierarchical e-merging), 2 (empirical-Bayes hierarchical baseline), and 3 (event-conditional causal attribution).

---

## 2. Per-extension scope

### Extension 1 — α budget arithmetic at fleet scale

**Architectural objective:** preserve a stated fleet-level FPR guarantee (any-time Ville analog of the current per-instance α-budget) across N shards without naive replication multiplying expected falsely-flagged shards by N. Operator-facing target: **per-shard any-time α bound + bounded expected falsely-flagged-shard count per evaluation window** — i.e., a hybrid Ville-at-shard / FDR-at-fleet target, with the fleet-level guarantee being the load-bearing pitch artifact.

**Recommended approach: (b) hierarchical e-value combination as the primary guarantee, with (c) FDR-style as the operator-facing fleet-level surface.**

Justification: candidate (a) Bonferroni is structurally the wrong shape for the Phase-3.d.D Ville-bounded architecture — Bonferroni divides α uniformly across N shards, which (i) defeats the any-time guarantee per shard, (ii) makes the per-shard α-budget vanishingly small at N=10000 (5·10⁻⁶ vs current 5·10⁻²), and (iii) cannot exploit the e-process composability that Phase-3.d.D specifically purchased. Candidate (b) hierarchical e-value combination (Vovk-Wang 2021 "E-values: calibration, combination, and applications"; Wang-Ramdas 2024 streaming combination work) **directly extends** the Family A mixture-supermartingale (Howard-Ramdas-McAuliffe-Sekhon 2021) and Family C MMD betting-e-process (Shekhar-Ramdas 2023) already shipped at Q66 / Q67 — fleet-merging is the product or average of per-shard e-values, which preserves Ville at the fleet level. Candidate (c) e-BH (Ren-Barber 2024 "Derandomized novelty detection with FDR control via e-values") gives the FDR-style operator surface; controlling **expected falsely-flagged-shard count** is more useful to a cluster oncall than any-time fleet-level FPR (the oncall can act on "K shards flagged; expected falsely-flagged ≤ q·K", but cannot act on "one of N shards was false-positive at some point in the past hour"). The hybrid is load-bearing: (b) provides the formal guarantee; (c) provides the operator interface. Candidate (d) streaming e-merging is a sub-mechanism of (b) at runtime; folded in, not a separate path.

**Cross-family α allocation:** per-shard within-shard cascade preserved unchanged (Family A + C + D + E share per-shard α as currently); fleet-level cross-shard cascade is a NEW allocation layer above the per-shard layer. The per-shard budget `α_shard` is the budget the per-shard cascade currently consumes; the fleet-level merged e-process consumes a fleet-level budget `α_fleet`; the two are NOT additive in the Bonferroni sense — they are different guarantees over different event spaces (per-shard at-some-time-in-window vs at-least-one-shard at-this-time). Spec-emit phase will need to make the guarantee-space explicit at the demo-narrative level so the pitch claim is honest (the existing `feedback_accuracy_first_pitch_demos_adapt` discipline applies).

**Anti-scope (lifted from candidate list + scope-drift surface):**

- **A1: NO Bonferroni at fleet scale.** Reason: structurally incompatible with Ville-bounded per-shard architecture (Phase-3.d.D close); divides α uniformly which defeats the any-time guarantee per shard. Candidate (a) declined.
- **A2: NO per-shard amplification-factor tuning of α-budget.** Reason: preserves Q58 close-with-CAVEAT clause 2 + Q59 H4 PERMANENT clause 3 (both PRESERVED-PERMANENT-POST-PHASE-D per LEDGER:176/179). Per-detector amplification-factor tuning would conflate statistical noise with methodology amplification at the fleet level; same conflation Phase D refused at the single-instance level.
- **A3: NO retiring Family B at fleet scale.** Family B (structural signals: security, artifact, provenance, contract — flag-based, doesn't depend on baselines per NORTH-STAR § Family B + LEDGER:107) remains per-shard pass-through; no α-budget interaction. Tempting to absorb because "everything else gets a fleet-level layer"; deferred.
- **A4: NO closing the per-shard fleet-merge to a single scalar fleet verdict.** Per-shard verdicts MUST survive the fleet aggregation; Extension 3 consumes them. A "fleet rolled up to one number" output is the opposite of what cluster oncall needs (which is per-shard attribution; see § 2.3 output semantics). Tempting because it's the simplest API; explicitly out-of-scope.
- **A5: NO modification to per-shard Ville-bounded internals.** Phase-3.d.D close (Q69) stamped every Family A + C detector as anytime-valid Ville-bounded with strict α-budget × 1.2 acceptance under all methodology-resampler modes. Fleet-merging is an OUTER layer that consumes per-shard e-values; internal mechanics unchanged.

**Memorial D candidate-set additions (novel-literature paths):**

- **MD-F1: Hierarchical e-value combination at fleet scale** (Vovk-Wang 2021 + Wang-Ramdas 2024). New architectural layer above per-shard e-process; load-bearing for the fleet Ville analog claim. Architect-grilling-pre-empirical-mechanism-capture variant (8th CONFIRMATION class lineage) applies: product-of-e-values preserves Ville iff per-shard e-processes are conditionally independent given the cluster-state history, which under correlated drift (firmware push, model redeploy) is **violated**. Memorial D 21st-VIOLATION-class candidate if architect picks product without enumerating the conditional-independence assumption explicitly.
- **MD-F2: e-BH / FDR via e-values at fleet scale** (Ren-Barber 2024). Different formal target from MD-F1 (expected-falsely-flagged-shard-count vs Ville); architectural layer is symmetric. Memorial D candidate-set: requires enumerating the "any-time guarantee on FDR" vs "fixed-time guarantee on FDR" architectural-layer distinction at hypothesis-tree drafting time. The literature is sharp on this — e-BH gives **fixed-time** FDR, not any-time. If architect cites e-BH as the operator-facing surface without enumerating that the any-time analog is e-BH with a multiple-test correction (Wang-Ramdas-Vovk 2022 "e-process selection under FDR"), candidate-set is incomplete.

**Pair-review triggers** (per Architect 3-check discipline; PROJECT-ROLES:24):

- **PR-F1:** TRIGGERED on MD-F1 (hierarchical e-value combination). External-source verification required per `feedback_pair_review_external_source_verification`: read Vovk-Wang 2021 §3-4 (product/average e-value combination) + Wang-Ramdas 2024 streaming combination § on conditional-independence assumption; draft empirical pair-review test analogous to `test/betting-e-process-class-dispatch.test.ts` but with N=100 simulated shards under (i) iid H₀, (ii) correlated drift H₀ (load-bearing for the conditional-independence break test); architect concur in ARCHITECT-REPLY disposition.
- **PR-F2:** TRIGGERED on MD-F2 (e-BH). External-source verification + empirical FDR-control regression test required; same 3-check shape.
- **PR-F3 (PRE-EMPTED, not triggered):** No pair-review on candidate (d) streaming e-merging — it's a sub-mechanism of (b) and the literature anchor is the same Wang-Ramdas 2024 already covered by PR-F1.

---

### Extension 2 — Per-shard baseline calibration

**Architectural objective:** N parallel baseline-learning regimes co-exist with the Q70 calibration regime (rolling-window recalibration + shadow-mode cutover, dispatch-table refactor per LEDGER:194-200), without (a) paging on every signal-during-learning at new-shard provisioning, (b) breaking independence assumptions under correlated drift events, or (c) inflating storage footprint linearly in N at the cell-matrix layer.

**Recommended approach: (b) hierarchical baseline (shared fleet prior + per-shard residual) extending Addition #2's existing hierarchical-pooling architecture, with (c) transfer learning from fleet baseline as the cold-start mechanism, and (d) per-shard shadow-mode cutover extending Q70 regime for cutover semantics.**

Justification: candidate (a) independent per-shard baselines is the simplest path but pays the cold-start tax N times — at N=10000 with current `min_samples_strict=60` (NORTH-STAR Addition #2), that's 600,000 cumulative samples before any shard is "trustworthy", which is multi-hour wall-clock on real-cluster signal rates and is the failure mode the user explicitly flagged. Candidate (b) is **the natural extension of Addition #2's hierarchical pooling already in compiled-config**: the fleet IS an additional cell dimension, the shared fleet prior IS the aggregate-fallback covariance (already shipped per Q2.B.6 binary `shrinkage_alpha ∈ {0,1}` decision), and per-shard residual IS the per-cell μ_vec + Σ_C decomposition already present. The compiler already emits `aggregate_fallback` for cells below `min_samples_strict`; fleet-mode extends this with `aggregate_fallback_fleet` (within-shard-class) + `aggregate_fallback_global` (cross-shard-class) at additional dimensions. Candidate (c) transfer learning warm-starts a new shard from the fleet aggregate at provisioning (`cell_confidence: warm_start` flag analogous to existing `low` / `none` flags), upgrading to `strict` after the shard's own n exceeds `min_samples_strict`. Candidate (d) inherits Q70's dispatch-table refactor + self-normalized fallback module for the cutover semantics — no new infrastructure required for the cutover; only per-shard parameterization.

**Cold-start latency target:** **bounded by sample-rate, not architecturally-fixed minutes.** At the cluster's per-shard tick cadence (~5s in current ARCHITECTURE.md `tick` rate), 60 samples = 5 minutes of wall-clock for `strict` upgrade. During the 0-60-sample warm-start window, the shard runs against the fleet-aggregate baseline (Families A + C + D are eligible; novelty Family E suppressed per existing `cell_confidence: none` semantics until per-shard Σ stabilizes — this is the existing Addition #2 behavior, unchanged at fleet scale). This is the Q70 calibration regime applied per-shard, with the calibration substrate being the fleet aggregate during warm-start. **Architect-side derivation pending** at spec-emit (P1 inline-derivation discipline): the `min_samples_strict` value may need tightening at fleet scale because the fleet aggregate has higher quality than a single-instance aggregate fallback (N×60 samples in the prior vs 60); architect-pre-prediction is that warm-start cell confidence is operationally trustworthy at ~20 per-shard samples, not 60, because the fleet prior provides the bulk of the information. Pair-review-triggering claim; see PR-F4 below.

**Correlated-drift handling:** the cluster needs a **"freeze fleet baselines during deployment events"** architectural coupling. When a fleet-level event happens (firmware push, model redeploy, env change), all per-shard baselines see correlated drift simultaneously; the hierarchical baseline's "shared fleet prior + per-shard residual" decomposition pushes ALL of the drift into the fleet prior, which is the wrong attribution (the shard isn't different from the fleet; the fleet has changed). Resolution: a deployment-event signal — sourced from the cluster's deployment pipeline (architectural coupling new in fleet-mode; see Extension 3 for the ingestion surface) — temporarily switches fleet-aggregate updates to `frozen` mode for a configurable post-event window (likely Q-cycle disposition: 30 min default, tuned by event class). Per-shard residual still updates; fleet prior held. This couples Extensions 2 and 3 (the event signal is Extension 3's input but consumed by Extension 2's calibration); see § 2.4 dependency graph.

**Storage footprint:** at fleet scale of N=10000 with the existing cell-matrix structure (~168 cells × hour×day + tenant_tier dims), the storage scales linearly in N × cell-count per shard. Mitigation: hierarchical-pooling **encoding** rather than storage — only the per-shard residual is stored; the fleet prior is shared. Per-shard residual is sparse (rank-deficient on most cells given per-shard `n` < `min_samples_strict` initially). Empirical storage profile is a P6 measurement at spec-emit, not estimable at SCOPE-PROPOSAL fidelity. **Architect-pre-prediction:** at N=10000, with sparse per-shard residual, fleet-aggregate full + per-shard residual ≈ 1.2-1.5× single-instance storage, NOT 10000×. This is pair-review-triggering and the load-bearing acceptance criterion for storage at scale.

**Cross-reference Q70 spec — what extends cleanly, what needs new SPEC drafting:**

- **Extends cleanly:** Q70 dispatch-table refactor + self-normalized fallback module + schema additions (LEDGER:200). The fleet-mode adds a new "fleet vs shard" dimension to the dispatch table; module surface unchanged. The Q66 `.γ → .γ.b → .γ.c` precedent for iterative-refinement-of-predicates applies — fleet-mode is anticipated to follow the same iterative-refinement pattern at SLICE 1 → SLICE 2 → SLICE N.
- **Needs new SPEC drafting:** the warm-start `cell_confidence` enum extension (`warm_start` new value); the deployment-event freeze hook (consumes Extension 3's event signal); the per-shard residual schema (new compiled-config field `per_shard_cells: Array<{shard_id, residual}>` parallel to existing `baseline_cells`); the dimension-priority extension to include `shard_id` between `tenant_tier` and `pod_id` in the hierarchical-pooling priority order (Addition #2's "tenant → workload → day → hour" extends to "fleet_class → tenant → workload → day → hour" with per-shard at leaf).

**Anti-scope:**

- **A6: NO modification to Addition #2 hierarchical-pooling algorithm.** Reason: the algorithm is load-bearing across all single-instance cell-matrix cycles (Q2.B.6 ADR clauses; Q60 Slice 1 anti-scope clause 6). Fleet-mode ADDS dimensions to the existing pool; doesn't change the pooling logic. Tempting to "improve while we're here"; explicitly deferred.
- **A7: NO per-shard novelty Family E re-engineering at fleet scale.** Per Q2.B.6.4 ADR clauses 1+2 (LEDGER:31-32 — Family E retains per-cell-preferred Mahalanobis source; aggregate-fallback structure); fleet-mode adds the per-shard layer but Family E's per-cell-preferred semantics propagate down without re-engineering. Pair-review trigger if architect picks otherwise at spec-emit; default-preserve.
- **A8: NO real customer telemetry at fleet scale.** Preserves John's Q1 disposition cross-cutting anti-scope (LEDGER:222-228 enterprise-infrastructure boundary). Fleet-mode validation uses synthetic-cluster substrate (new substrate-class — see § 4 Engineering risks); does not absorb real customer-cluster telemetry. This is the same boundary single-instance respects; fleet-mode does not modify it.
- **A9: NO new shrinkage decision for per-shard residual covariance.** Q2.B.6a binary `shrinkage_alpha ∈ {0,1}` decision (NORTH-STAR:206) preserved; per-shard residual rank-deficient cells use fleet aggregate, rank-sufficient cells use per-shard. Tempting to introduce a continuous-shrinkage Ledoit-Wolf for fleet-mode because of the N×60 prior data quality; declined; consistent with the architecturally-regressive-on-shrinkage-correct-on-coherence trade-off architect accepted at Q2.B.6 (NORTH-STAR:206).

**Memorial D candidate-set additions:**

- **MD-F3: Hierarchical / empirical-Bayes baseline at fleet scale.** Architectural-layer-coverage discipline applies at hypothesis-tree time: when fleet-aggregate drift surfaces, candidate set must enumerate (i) per-shard mechanism, (ii) fleet-prior mechanism, (iii) deployment-event mechanism, (iv) cross-shard-correlation mechanism. Memorial D candidate if architect narrows to one layer prematurely. The Q73 family_D fixture-rollback-short-circuit precedent (LEDGER:212-216 — actual mechanism at orchestrator/pipeline layer, not detector layer) is the lineage pattern; fleet-mode has FOUR layers above the detector instead of two.

**Pair-review triggers:**

- **PR-F4:** TRIGGERED on the `min_samples_strict` re-derivation at fleet scale (lowering from 60 → ~20 based on fleet-prior data quality). External-source verification: empirical-Bayes shrinkage threshold derivation literature (Efron-Morris 1973 lineage; modern empirical-Bayes covariance shrinkage); empirical pair-review test on synthetic N=1000 shard cluster with deliberate per-shard mean-shift injection; architect concur. Load-bearing because the cold-start latency claim depends on this re-derivation.
- **PR-F5:** TRIGGERED on the storage footprint architect-pre-prediction (~1.2-1.5× single-instance, NOT N×). External-source verification: hierarchical-Bayes sparse-residual literature; empirical P6 profile measurement on N=1000 simulated shard cluster. If the prediction is wrong by >2×, the pitch claim shifts materially.

---

### Extension 3 — Cross-shard correlation layer

**Architectural objective:** consume per-shard verdicts (the output of Extension 1's fleet-merge layer applied to Extension 2's per-shard calibration) plus cluster-state inputs (topology, deployment events) and emit attribution semantics distinguishing **single-shard fault** from **fleet-level event** from **topology-localized common-mode failure**. Output is consumed by cluster oncall (real-time pager) AND post-hoc audit (batch). Critically: this layer does NOT exist today; it is the highest-novelty extension and the largest new ingestion surface.

**Recommended approach: (d) hybrid — (a) outer aggregator at first-pass + (b) topology-aware spatial attribution + (c) event-conditional causal attribution, structured as a three-layer cascade.**

Justification: candidate (a) outer aggregator (proportion test / voting) is the load-bearing first-pass surface — it answers "how many shards flagged?" and is needed for the e-BH operator interface (Extension 1 PR-F2). Candidate (b) topology-aware attribution is required for the **NVLink-rack-PSU-cooling-zone common-mode failure** class that's the literature anchor (Meta-style 16K H100 SDC papers — Hu 2024 "Characterization of LLM Development in the Datacenter"; Microsoft Project Forge; Google's 2023 SDC public postmortems); without it, fleet-mode cannot distinguish "all shards in rack 7 show drift" (PSU or cooling event) from "47 random shards show drift" (firmware bug). Candidate (c) event-conditional causal attribution is required for the **deployment-event vs shard-fault** distinction, which IS the load-bearing pitch claim ("DeploySignal can tell you it's the deploy, not the cluster") — this is the interrupted-time-series / synthetic-control literature applied at fleet scale. Candidate (d) is the hybrid; the three layers are NOT alternatives, they are a cascade: (a) aggregates per-shard verdicts; (b) overlays topology to identify common-mode spatial patterns; (c) conditions on the event-feed to attribute fleet-level drift to cause. Output semantics: **both "this shard" attribution AND "K shards with this property" pattern** — the cascade emits at every layer; oncall consumes layer (b) or (c); audit consumes all three.

**Inventory inputs required (new ingestion surface):**

- **Cluster topology** — NVLink topology graph; rack / PSU / cooling-zone membership; node-to-shard mapping. Does NOT exist in current DeploySignal ingestion (verified by grep over `engine/` + `tools/` — current ingestion is per-(tenant_tier, hour, day, workload_class) only; topology is not a dimension). New compile-time substrate addition; analogous shape to the Q60 V2 real-trace mappers (LEDGER:101 — `mapBurstGPTRows` / `mapAzureLLMRows` / `mapMooncakeRows` / `mapGroundedSyntheticOverlay`) but for cluster topology instead of trace data. Likely a new mapper class `mapClusterTopology` consuming Slurm / Kubernetes / NVIDIA NVLink-topology output formats.
- **Deployment events** — fleet-level deployment-pipeline event stream: model redeploy, firmware push, env change, config change, capacity change. Does NOT exist; new ingestion surface. Architecturally analogous to the existing `flags` input on the orchestrator (per ARCHITECTURE.md tick contract `{live, baseline, flags}`) but at the cluster-event scope rather than per-deploy scope. Coupling to deployment pipeline is new (Extension 2 § correlated-drift handling consumes this; see dependency graph § 2.4).
- **Cluster state history** — used by (c) for the causal pre/post comparison; sourced from the same evaluation-window infrastructure that backs the per-shard tick stream. No new ingestion required for this input; reuses existing TrendBuffer / SignalSnapshot.

**Real-time vs batch:** layer (a) aggregator is **real-time** (oncall pager); layers (b) topology + (c) causal are **near-real-time** (within evaluation window, but tolerate latency for the topology join + event-feed lookup). Audit consumes all three at batch cadence. The cascade is sequential at first-pass but parallel within each evaluation window.

**Pair-review trigger condition (literature anchor):**

- **Meta H100 SDC papers** (Hu et al 2024 "Characterization of Large Language Model Development in the Datacenter"; Meta Llama 3 paper § hardware reliability) for the SDC-class fault claim and topology-aware common-mode literature.
- **Microsoft Project Forge / Google 2023 SDC postmortems** for cross-vendor common-mode failure mode catalog.
- **Hierarchical change-detection literature** (Tartakovsky-Polunchenko-Sokolov 2014 "Sequential Analysis: Hypothesis Testing and Changepoint Detection" Ch 9; recent fleet-monitoring work — Singh-Krishnamurthy 2023 if relevant) for the multi-stream changepoint detection framing.
- **Interrupted time series / synthetic control** (Brodersen-Gallusser-Koehler-Remy-Scott 2015 Bayesian Structural Time Series for CausalImpact; Abadie-Diamond-Hainmueller 2010 synthetic control method) for event-conditional attribution (c).

**Anti-scope:**

- **A10: NO hardware-diagnostic territory.** DCGM / NVML integration, per-GPU hardware-fault attribution, voltage-droop / ECC / NCCL-collective-error detection are NVIDIA-stack scope; DeploySignal consumes the resulting signals as inputs (existing MFU / HBM / collective signals per ARCHITECTURE.md detectors), does NOT generate them. Per TPM pre-route grilling check, this is explicitly out-of-scope (TPM intake 2026-05-15 PRE-ROUTE-GRILLING-APPLIED #1).
- **A11: NO live customer cluster telemetry.** Preserves enterprise-infrastructure boundary (LEDGER:222-228); fleet-mode topology + event-feed are validated against synthetic-cluster substrate, not real customer-cluster traffic. New synthetic-cluster substrate class is a Phase F deliverable, paralleling the existing v5/v7/v8X/v9X substrate-class evolution.
- **A12: NO modification to per-shard Family A-E detectors.** Extension 3 is an OUTER aggregator + attribution layer; it consumes per-shard verdicts but does not modify per-shard detector internals. Tempting at spec-emit because cross-shard correlation could be implemented as a "new detector family"; explicitly declined (architectural cleanliness; reuses Extension 1's fleet-merge layer; doesn't compete with per-shard detector cascade).
- **A13: NO ML-based attribution model.** Extension 3 is rule-based + statistical (topology join + event-condition); a learned attribution model is tempting because the literature has examples (Microsoft Project Forge has ML pieces) but introduces training-data dependence + interpretability gap that conflicts with DeploySignal's "calibrated-confidence honest-broker" stance (NORTH-STAR Addition #11 honest-framing precedent). Deferred to follow-on phase if rule-based proves insufficient.
- **A14: NO modification to the verdict shape at per-shard level.** Existing `verdict` / `reason` / `tripped` / `short_circuit` / `trend_snapshot` shape (ARCHITECTURE.md) preserved at per-shard level. Fleet-level OUTPUT is a NEW shape (`fleet_verdict` with per-shard children + attribution + topology + event-condition); does not replace the per-shard shape, layers on top. Audit-record per-pod precedent (Addition #12) is the structural model.

**Memorial D candidate-set additions:**

- **MD-F4: Topology-aware common-mode attribution.** Architectural-layer-coverage discipline at hypothesis-tree time: when cross-shard correlation surfaces, candidate set must enumerate (i) random-co-occurrence (proportion test rejects), (ii) topology-localized common-mode (rack / PSU / cooling), (iii) fleet-level event, (iv) sample-stream-attribution-error (Topic 52 lineage — verify firing-ID at fleet level BEFORE constructing hypothesis tree per P3 axis 10). Memorial D candidate if architect skips (iv); this is exactly the Topic-52-class failure mode at fleet scale.
- **MD-F5: Event-conditional causal attribution.** When fleet-level drift is observed and a deployment event is in the same window, candidate-set must enumerate (i) event-caused drift, (ii) coincidental concurrent drift, (iii) event-triggered-but-not-event-caused drift (event uncovered a latent fault). Conflating these is the standard interrupted-time-series confounding hazard; the literature is sharp on this distinction and the architect must enumerate it explicitly at hypothesis-tree drafting time.

**Pair-review triggers:**

- **PR-F6:** TRIGGERED on MD-F4 (topology-aware common-mode). External-source verification: Meta H100 SDC papers + Microsoft / Google SDC postmortems; empirical pair-review test on synthetic-cluster substrate with deliberate topology-localized failure injection (e.g., simulate PSU event affecting rack 7's 32 shards); architect concur. Load-bearing for the "DeploySignal sees rack-localized failures" pitch claim.
- **PR-F7:** TRIGGERED on MD-F5 (event-conditional causal attribution). External-source verification: CausalImpact / synthetic control literature + interrupted-time-series confounding hazards; empirical pair-review test on synthetic-cluster substrate with (i) event + drift, (ii) event + no-drift, (iii) no-event + drift, (iv) no-event + no-drift; 4-cell pair-review evidence matrix in the audit. Load-bearing for the "DeploySignal can tell it's the deploy, not the cluster" pitch claim.

### 2.4 Dependency graph between extensions

```
                                    ┌─────────────────────────────────┐
                                    │  Phase G (Extension 3)          │
                                    │  Cross-shard correlation        │
                                    │                                 │
                                    │  (a) Outer aggregator           │
                                    │      ◄── consumes per-shard     │
                                    │           verdicts via E1       │
                                    │  (b) Topology overlay           │
                                    │      ◄── new ingestion surface  │
                                    │  (c) Event-conditional          │
                                    │      ◄── new ingestion surface  │
                                    └────────┬────────────────────────┘
                                             │
                                             │ event-feed output
                                             │ consumed by E2's freeze hook
                                             ▼
              ┌──────────────────────────────────────────────────────┐
              │  Phase F (Extensions 1 + 2)                          │
              │                                                      │
              │   Extension 1 (α at fleet scale)                     │
              │     ├─ hierarchical e-value combination              │
              │     ├─ e-BH FDR operator surface                     │
              │     └─ produces fleet-merged per-shard verdicts      │
              │                                                      │
              │             ▲                                        │
              │             │ consumes per-shard verdicts            │
              │             │                                        │
              │   Extension 2 (per-shard baselines)                  │
              │     ├─ hierarchical baseline (fleet prior + residual)│
              │     ├─ warm-start cold-start mechanism               │
              │     ├─ deployment-event freeze hook  ◄───┐           │
              │     └─ produces per-shard calibrated baselines       │
              │                                          │           │
              └──────────────────────────────────────────│───────────┘
                                                         │
                                                         │ event-feed
                                                         │ (Phase G output
                                                         │  consumed by
                                                         │  Phase F)
                                                         │
                              CIRCULAR-COUPLING SURFACE ─┘
```

**Dependency conclusions:**

1. **Extension 2 → Extension 1.** Per-shard calibrated baselines feed per-shard detector cascade output, which feeds Extension 1's fleet-merge. Linear precedence.
2. **Extension 1 → Extension 3.** Fleet-merged per-shard verdicts (post-α-arithmetic) feed Extension 3's outer aggregator. Linear precedence.
3. **Extension 3 → Extension 2 (CIRCULAR-COUPLING).** Extension 3's deployment-event feed is consumed by Extension 2's freeze hook for correlated-drift handling. This is a soft dependency — Extension 2 can ship without the freeze hook (correlated drift mis-attributes to per-shard residual, observable as elevated FPR during fleet-events but not catastrophic); the freeze hook activates when Extension 3's event feed is online.

**Sequencing implication:** Phase F (Extensions 1 + 2) ships independently; Phase G (Extension 3) adds correlation + activates the freeze-hook coupling. This is **NOT** a "Phase F depends on Phase G" relationship; it's "Phase G's event-feed unlocks a Phase F feature". Phase F is shippable with `freeze_hook_enabled: false` flag; Phase G ship promotes to `enabled: true`. Architect-pre-prediction: split is correct; pair-review trigger on the event-feed schema since it's the cross-phase contract.

---

## 3. Q-cycle estimate

**Estimate: 18-26 Q-cycles total across Phase F + Phase G.** Confidence: pre-route (architect-pre-prediction at SCOPE-PROPOSAL fidelity); spec-emit refinement will tighten ranges and may split or merge Q-cycles per the Q66 `.γ → .γ.b → .γ.c` iterative-refinement precedent.

### Phase F — Extensions 1 + 2 (per-shard infrastructure)

**8-12 Q-cycles.** Roughly:

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase F SLICE 1 | 1-2 | Schema additions: `shard_id` cell dimension; `per_shard_cells` compiled-config field; `cell_confidence: warm_start` enum extension. Dispatch-table refactor extension for fleet-aware path. Self-normalized fallback module's fleet-aware variant. **NO** substantive per-shard predicate logic; **NO** fleet-merge e-process logic — analogous to Q70 SLICE 1's architectural-foundation-only approach (LEDGER:200). |
| Phase F SLICE 2 | 2-3 | Per-shard residual schema + compile-time hierarchical-pool extension. Warm-start cold-start mechanism. P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet. |
| Phase F SLICE 3 | 2-3 | Hierarchical e-value combination at fleet scale (MD-F1; PR-F1 pair-review). Fleet-merged Family A + Family C surfaces. Iid bootstrap regression test analogous to `test/betting-e-process-class-dispatch.test.ts` extended to N=100 shards. |
| Phase F SLICE 4 | 2-3 | e-BH FDR operator surface (MD-F2; PR-F2 pair-review). Empirical fleet-FDR regression test. |
| Phase F close walk | 1 | Sub-rule 3 INVERTED ADR walk + Memorial D state evolution stamp + Phase G TAGGED-FUTURE activation criterion. Architect-pre-prediction matches Phase-3.d.D Q69 close walk shape. |

LIKELY-SURFACES (LS) prediction: ~2 architect-pre-predicted iterative-refinement cycles within SLICE 3 or SLICE 4 per the Q66 `.γ → .γ.b → .γ.c` precedent — most likely surface is the conditional-independence break under correlated drift (MD-F1 architect-side capture variant). Architect-pre-prediction adds +1-2 Q-cycles to the SLICE 3-4 range above.

### Phase G — Extension 3 (cross-shard correlation)

**10-14 Q-cycles.** Higher Q-count than Phase F because:
- Two new ingestion surfaces (topology + event-feed) with no current architectural antecedent
- Three sub-mechanisms (outer aggregator + topology overlay + event-conditional) each with their own pair-review trigger
- Synthetic-cluster substrate generation analogous to Q60-class real-trace substrate work but for cluster topology (LEDGER:101 lineage)

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase G SLICE 1 | 2-3 | Synthetic-cluster substrate generation (topology + event-feed fixtures). Schema for cluster topology + deployment-event stream. Mapper class scaffolding. No detector logic. |
| Phase G SLICE 2 | 2-3 | Outer aggregator (proportion test / voting first-pass). Fleet-merge consumption layer. Per-shard verdict aggregation contract. |
| Phase G SLICE 3 | 3-4 | Topology-aware spatial attribution (MD-F4; PR-F6 pair-review). Topology-join logic. Common-mode failure-injection empirical test (rack-localized PSU event simulation). |
| Phase G SLICE 4 | 2-3 | Event-conditional causal attribution (MD-F5; PR-F7 pair-review). 4-cell evidence matrix regression test. Phase F freeze-hook activation coupling. |
| Phase G close walk | 1 | ADR walk; activates Phase F freeze-hook coupling; production deployment hardening (Phase H?) TAGGED-FUTURE. |

LIKELY-SURFACES prediction: ~2-3 architect-pre-predicted iterative-refinement cycles concentrated in SLICE 3 (topology-aware) — topology-join semantics under sparse topology data (small clusters; new shard provisioning before topology-feed catches up) likely produces empirical surprise. Pair-review evidence quality on PR-F6 + PR-F7 is the close-criterion.

### Total Q-cycle estimate

**Phase F: 8-12 Q-cycles** (architect-pre-prediction: 10 most-likely, with 2 LS cycles adding +1-2)
**Phase G: 10-14 Q-cycles** (architect-pre-prediction: 12 most-likely, with 2-3 LS cycles adding +1-2)
**Combined: 18-26 Q-cycles.**

Calibration check against Phase-3.d precedent: Phase-3.d ran .A through .E across Q66 + Q67 + Q68 + Q69 + Q70 + sub-cycles ≈ 15-18 effective Q-cycles for what was structurally a single-extension (Ville-bounded re-engineering); Phase F + G covering three structural extensions plus two new ingestion surfaces estimating to 18-26 Q-cycles is consistent with the precedent (per-extension Q-cycle density approximately matches; new-ingestion-surface adds +2-3 per surface).

---

## 4. Risk register

### 4.1 Statistical-correctness risks

| Risk | Class | Mitigation surface |
|---|---|---|
| **R-S1** — Conditional independence of per-shard e-processes is violated under correlated drift (firmware push, model redeploy). Product-of-e-values breaks Ville at fleet level. | Memorial D 21st-VIOLATION candidate (MD-F1 architect-grilling-pre-empirical-mechanism-capture variant). | PR-F1 pair-review with explicit correlated-drift H₀ in the empirical evidence matrix. Spec-emit P2 option-enumeration must include avg-of-e-values (Vovk-Wang 2021 §4) as the conditional-independence-robust alternative to product. |
| **R-S2** — `min_samples_strict` re-derivation at fleet scale (60 → ~20) is too aggressive; warm-start cells produce elevated FPR. | P1 inline-derivation discipline; pair-review-triggering (PR-F4). | Empirical-Bayes shrinkage threshold derivation + synthetic N=1000 shard cluster validation; conservative fall-back to 60 if empirical evidence contradicts pre-prediction. |
| **R-S3** — Fleet-aggregate baseline is staler than per-shard residual; drift mis-attribution under fleet-event-without-freeze-hook. | Pre-Phase-G activation hazard (freeze-hook not yet enabled). | Phase F SLICE-2-3 acceptance criterion: documented elevated-FPR-during-fleet-events as known-property with `methodology_note` clause; carry-forward to Phase G activation as CAVEAT-retirement criterion. |
| **R-S4** — Topology-aware common-mode attribution false-positives on coincidentally-co-located independent failures. | MD-F4 architect-side capture; pair-review-triggering (PR-F6). | Proportion-test baseline + topology-join significance threshold derivation; topology-join failure-injection empirical evidence matrix (random vs topology-localized). |
| **R-S5** — Event-conditional causal attribution confounded by event-triggered-but-not-event-caused drift (latent fault uncovered by event). | MD-F5 architect-side capture; pair-review-triggering (PR-F7). | 4-cell evidence matrix in PR-F7 (event-drift / event-no-drift / no-event-drift / no-event-no-drift); honest-framing for the "event-triggered-but-not-caused" cell as documented CAVEAT (NORTH-STAR Addition #11 precedent). |
| **R-S6** — α-budget conflation between per-shard within-shard cascade and fleet-level cross-shard cascade if architect doesn't make guarantee-space explicit. | Q58 / Q59 clause-2 / clause-3 lineage (per-detector amplification-factor conflation class). | Spec-emit must make guarantee-space split explicit at the demo-narrative level; `feedback_accuracy_first_pitch_demos_adapt` discipline applies. |

### 4.2 Engineering risks

| Risk | Class | Mitigation surface |
|---|---|---|
| **R-E1** — Memory at scale: at N=10000 shards × ~168 cells × 11-15 signal vector × covariance matrix, naive storage is ~O(N · cells · p²) ≈ 200GB+. | P6 measurement; pair-review-triggering (PR-F5). | Sparse per-shard residual encoding + hierarchical-pooling encoding-not-storage; empirical P6 profile at N=1000 simulated. Architect-pre-prediction: 1.2-1.5× single-instance footprint, NOT N×. Pre-prediction failure (>2×) is a load-bearing acceptance failure. |
| **R-E2** — Cold-start latency unacceptable for new-shard provisioning at scale; fleet adds shards faster than 60-sample warm-start absorbs. | P1 derivation surface; coupling to fleet-aggregate quality (PR-F4 lineage). | Warm-start at fleet-aggregate (cell_confidence: warm_start) eliminates the cold-start blocking dependency; architect-pre-prediction at 20-sample threshold. |
| **R-E3** — New ingestion surface (topology + event-feed) requires architectural coupling to cluster-management infrastructure (Slurm / Kubernetes / NVIDIA NVLink topology APIs) that isn't currently in DeploySignal's scope. | Cross-cutting anti-scope candidate (LEDGER:222-228 enterprise-infrastructure boundary tension). | Synthetic-cluster substrate (Phase G SLICE 1) decouples Phase G architectural work from real cluster-management integration; real-cluster integration is TAGGED-FUTURE post-Phase-G (analogous to Q60-class real-trace ingestion vs synthetic baseline; LEDGER:101 lineage). |
| **R-E4** — Storage of N-shard residual covariance is rank-deficient at warm-start; falling back to fleet-aggregate during warm-start increases compute at warm-start window. | P6 measurement; coupling to existing Q2.B.6 binary `shrinkage_alpha` decision. | Compute-budget envelope at warm-start window; architect-pre-prediction is ~10-20% inflation during warm-start, returning to single-instance compute envelope post-strict-upgrade. |
| **R-E5** — Per-shard verdict aggregation surface (Phase G SLICE 2 outer aggregator) is the inter-extension contract surface; schema drift between Phase F output and Phase G consumption is the cross-phase failure-attribution-discipline candidate. | P3 axis 2 (coord-trail) + P3 axis 10 (firing-attribution-discipline) at cross-phase boundary. | Phase F SLICE 1 emits the contract schema; Phase G SLICE 1 reads + tests against the contract; schema-version is a load-bearing field. |

### 4.3 Anti-scope risks (tempting absorptions to refuse)

| Risk | Tempting absorption | Why refuse |
|---|---|---|
| **R-A1** — Hardware-diagnostic territory absorption | "While we're here, integrate DCGM / NVML." | NVIDIA stack scope; explicit A10 anti-scope; pre-route grilling check #1 (TPM intake). DeploySignal consumes resulting signals as inputs (existing MFU / HBM / collective signals per ARCHITECTURE.md detectors), does not generate them. |
| **R-A2** — Real customer cluster telemetry absorption | "Validate against a real 16K H100 cluster's logs." | Enterprise-infrastructure boundary (LEDGER:222-228 John's Q1 disposition). Fleet-mode is validated against synthetic-cluster substrate; real-cluster integration is TAGGED-FUTURE. |
| **R-A3** — Per-shard detector internals re-engineering | "Since we're at fleet scale, optimize per-shard detector compute." | A5 + A12 anti-scope; Phase-3.d.D close stamped per-shard Ville-bounded internals as architecturally closed. Fleet-mode is an OUTER layer; per-shard internals preserved EXACTLY. |
| **R-A4** — Continuous-shrinkage covariance for per-shard residual | "Empirical-Bayes warrants Ledoit-Wolf continuous shrinkage." | A9 anti-scope; Q2.B.6a architecturally-regressive-on-shrinkage-correct-on-coherence trade-off preserved; introducing continuous shrinkage now would re-open Q2.B.6 closure. |
| **R-A5** — ML-based attribution model for Extension 3 | "Microsoft Project Forge has ML; we should match." | A13 anti-scope; conflicts with calibrated-confidence honest-broker stance (NORTH-STAR Addition #11). Rule-based + statistical first; ML deferred to post-Phase-G follow-on if insufficient. |
| **R-A6** — Single-scalar fleet verdict roll-up | "Operator wants one number." | A4 anti-scope; per-shard verdicts MUST survive fleet aggregation for Extension 3's attribution semantics. Single-scalar roll-up is the opposite of what cluster oncall needs. |
| **R-A7** — Single-tenant per-customer scope absorption at fleet level | "If we're doing fleet, fold in cross-customer aggregation." | Different problem space (cross-customer = different deployments; fleet-mode = same deployment N shards). Addition #23 tenant_tier cells already handle cross-customer; fleet-mode adds a NEW orthogonal dimension. Tempting because of cell-matrix symmetry; explicitly different scope. |

---

## 5. Open architectural questions for John

Decision-points the TPM should route back as routing artifacts. Architect-pre-prediction provided for each; John's disposition either confirms or amends, and the Phase F spec-emit consumes the disposition.

### Q-J1 — Operator-facing fleet guarantee target

**Question:** is the load-bearing fleet-level guarantee (i) per-shard any-time Ville (via hierarchical e-value combination), (ii) fleet-level FDR (expected falsely-flagged-shard count, via e-BH), or (iii) both, with (i) as the formal guarantee and (ii) as the operator interface?

**Architect-pre-prediction:** (iii) hybrid. (i) is what the pitch claim depends on (formal-property continuity with Phase-3.d.D Ville-bounded close); (ii) is what cluster oncall can act on. Bonferroni declined (A1).

**Why this is your call:** the demo narrative depends on the answer. Per the existing pedagogy-invalidation acceptance (TPM intake 2026-05-15 pre-route check #2 + `feedback_accuracy_first_pitch_demos_adapt`), demos adapt to architecture; but the **architectural commitment** to guarantee-space is a forking decision that affects the spec-emit fidelity at PR-F1 and PR-F2.

### Q-J2 — Cold-start latency engineering target

**Question:** what is the operator-facing cold-start latency target for a freshly-provisioned shard before it's "trustworthy"? Architect-pre-prediction: 20-shard-sample warm-start at ~5s tick rate = ~100s of wall-clock. Alternative targets: (i) immediate (warm-start cell_confidence: warm_start with fleet-aggregate; no per-shard sample threshold), (ii) ~5 min (60-sample strict upgrade matching existing single-instance threshold), (iii) ~100s (20-sample lowered threshold via fleet-prior data quality).

**Architect-pre-prediction:** (iii). Pair-review-triggering (PR-F4) on the threshold re-derivation; load-bearing for the "fleet-scale provisioning is operationally fast" pitch claim.

### Q-J3 — Cross-shard correlation output semantics

**Question:** is the Extension 3 output (i) "this shard" attribution only, (ii) "K shards with this property" pattern only, or (iii) both, with the cascade emitting at every layer?

**Architect-pre-prediction:** (iii) both. Per-shard attribution is needed for oncall pager; pattern attribution is needed for fleet-level event identification. The three-layer cascade naturally emits at every layer (a) aggregator outputs "K shards", (b) topology overlay outputs "K shards in rack 7", (c) event-conditional outputs "fleet drift conditional on deploy event at T₀". Audit consumes all; oncall consumes (b) or (c).

### Q-J4 — Synthetic-cluster substrate scope at Phase G SLICE 1

**Question:** what cluster topology + event-feed scenarios should Phase G SLICE 1 cover? Architect-pre-prediction: (i) single-rack uniform topology + injected PSU/cooling events; (ii) two-rack heterogeneous topology + injected firmware-push event; (iii) ~10-rack heterogeneous topology + injected mixed events. Each substrate is analogous to a Q60-class real-trace substrate (v9X+; LEDGER:101 lineage) but at cluster topology + event scope.

**Architect-pre-prediction:** start at (i) for SLICE 1 architectural-foundation-only; expand to (ii) at SLICE 2-3 for topology-aware empirical validation; (iii) at SLICE 4 for event-conditional empirical validation. Each substrate gets a substrate-class label parallel to v5/v7/v8X/v9X.

### Q-J5 — Phase F freeze-hook activation criterion

**Question:** Phase F ships with `freeze_hook_enabled: false` (Extension 3's event-feed not yet online). Phase G ship activates freeze-hook. **Should the freeze-hook be a Phase F SLICE-3 acceptance gate (Phase F doesn't close until Phase G is on the path) or a Phase G activation gate (Phase F closes independently; freeze-hook is post-close fix-forward when Phase G lands)?**

**Architect-pre-prediction:** Phase G activation gate. Phase F closes independently as the per-shard infrastructure foundation; freeze-hook is a documented CAVEAT in Phase F close (analogous to Q58 close-with-CAVEAT clause 1 / Q66 SLICE 1 RETIRE pattern — CAVEAT carries forward until Phase G activates and retires). This preserves shippability of Phase F as a standalone architectural step.

### Q-J6 — Phase-letter sequencing relative to Phase E

**Question:** Phase E (production deployment hardening) is currently TAGGED-FUTURE post-Phase-3.d.D close. Phase F + G as proposed are NOT a Phase E extension. **Is the intended sequencing: (i) Phase E → Phase F → Phase G, (ii) Phase F → Phase G → Phase E, (iii) Phase F → Phase E → Phase G, or (iv) Phase F and Phase E in parallel (independent tracks)?**

**Architect-pre-prediction:** (ii) Phase F → Phase G → Phase E. Phase E is production-deployment-hardening for the single-deployment decision engine, which has different stakeholders (production SRE) than fleet-mode (cluster oncall + AI infrastructure operators). Sequencing fleet-mode first preserves the architectural cleanliness of Phase E (no fleet-mode dependencies bleeding into production hardening). However: (iv) parallel is operationally plausible if independent tracks are funded; coordination overhead is the deciding factor.

**This is the highest-level decision and depends on John's pitch / market-positioning priorities** which are downstream of architect's scope.

---

## 6. Pre-route discipline application (architect-side)

### Architect grilling pass output (10 axes per DISCIPLINE-REFERENCE:154)

**CRITICAL: 0.** No items where architect should re-draft before emit. (SCOPE-PROPOSAL fidelity; no spec-emit-time CRITICALs by definition — those manifest at spec-emit fidelity not at scope-proposal.)

**LIKELY-SURFACES: 7.** Pre-flagged in spec § Open architectural questions OR § Anti-scope OR § Risk register:
- LS-1: conditional independence of per-shard e-processes under correlated drift (R-S1; PR-F1).
- LS-2: `min_samples_strict` re-derivation empirical validation outcome (R-S2; PR-F4).
- LS-3: storage footprint at scale empirical profile (R-E1; PR-F5).
- LS-4: topology-join semantics under sparse topology data (Phase G SLICE 3 iterative-refinement prediction).
- LS-5: event-conditional causal attribution confounding (R-S5; PR-F7).
- LS-6: schema drift across Phase F → Phase G contract surface (R-E5).
- LS-7: pedagogy-invalidation extent — fleet-mode pitch narrative restructuring (TPM intake pre-route check #2; `feedback_accuracy_first_pitch_demos_adapt`).

**PRE-EMPTABLE: 6.** Folded proactively into the memo:
- PE-1: cross-reference Q70 dispatch-table refactor for what extends cleanly vs needs new SPEC drafting (§ 2.2 sub-section).
- PE-2: cross-reference Addition #2 / #12 / #23 for hierarchical-pooling reuse (§ 2.2).
- PE-3: cross-reference Q58 clause-2 / Q59 clause-3 PRESERVED-PERMANENT-POST-PHASE-D (§ 2.1 A2).
- PE-4: hardware-diagnostic anti-scope (A10) at TPM pre-route grilling intake.
- PE-5: enterprise-infrastructure boundary preservation (A8 + A11) at cross-cutting anti-scope reminder level.
- PE-6: synthetic-cluster substrate vs real-cluster integration TAGGED-FUTURE pattern (LEDGER:101 lineage; Phase G SLICE 1 deliverable).

### Memorial D candidate-set enumeration (Memorial D 4-factor prior)

For this SCOPE-PROPOSAL, architectural-layer-coverage discipline applies at the meta-level: each of the three extensions enumerates its architectural-layer set at hypothesis-tree time. Memorial D candidate-set additions enumerated above (MD-F1 through MD-F5). Memorial D state evolution: 20V/8C pre-Phase-F; post-Phase-G close-walk, expected progression to ~22-24V / ~9-11C depending on architect-side discipline application across the 18-26 Q-cycles.

### Memorial F sub-rule application

| Sub-rule | Trigger fires? | Notes |
|---|---|---|
| Sub-rule 1 (P3.3 multiple-read-paths; compile-time substrate modifications) | YES, at Phase F SLICE 1 + 2 (schema additions) and Phase G SLICE 1 (new ingestion surface). Compile-time substrate modifications are load-bearing across both phases. |
| Sub-rule 2 (MERGE-vs-REPLACE substrate-stamped-fields-preservation) | YES, at Phase F SLICE 2 (per-shard residual schema extension on existing `baseline_cells` substrate). |
| Sub-rule 3 (ADR-anti-scope-preservation) | YES, at every spec-emit; this memo's § 2 Anti-scope sub-sections walk applicable ADRs. Notable: Q58 clause 2 + Q59 clause 3 PRESERVED-PERMANENT-POST-PHASE-D (A2); Q2.B.6.4 clauses 1-5 PRESERVED (A7). |
| Sub-rule 4 (Pre-existing-property-vs-new-acceptance-criterion coherence) | YES, at Phase F SLICE 3-4 (new α-budget acceptance criteria at fleet scale must cohere with existing Ville-bounded per-shard property); at Phase G SLICE 3-4 (topology + event-conditional ACs must cohere with per-shard verdict shape). |

### Pair-review trigger summary

7 pair-review triggers identified: PR-F1 through PR-F7. Per `feedback_pair_review_external_source_verification` (architect 3-check discipline; PROJECT-ROLES:24): each requires (1) external-source literature verification (cited literature read + assumptions verified), (2) empirical pair-review test (load-bearing validation analogous to `test/betting-e-process-class-dispatch.test.ts`), (3) architect concur in ARCHITECT-REPLY disposition. Total pair-review investment estimated at ~1 Q-cycle equivalent of architect-side work; included in the 18-26 Q-cycle estimate.

---

## 7. Topic close framing

How this scoping memo resolves drives next-cycle pick:

- **(a) Clean close (architect-pre-prediction ~55%):** John reviews + dispositions on Q-J1 through Q-J6; TPM routes to architect for Phase F SLICE 1 spec-emit; Phase F begins. Phase-letter sequencing per Q-J6 disposition.
- **(b) Decline-to-activate (architect-pre-prediction ~15%):** John dispositions that fleet-mode is not yet priority; memo lands as TAGGED-FUTURE in LEDGER (analogous to Phase-3.c.2 lineage; LEDGER:163-165). No Phase F spec-emit; revisit at later cycle.
- **(c) Partial-activation (architect-pre-prediction ~20%):** John dispositions Phase F as priority; Phase G TAGGED-FUTURE until Phase F closes. This is the "ship per-shard infrastructure first, defer cross-shard correlation" path. Phase F shippable with `freeze_hook_enabled: false` (Q-J5 architect-pre-prediction).
- **(d) Memo-amend (architect-pre-prediction ~10%):** John dispositions surface clarification or scope adjustment; architect re-drafts memo at v0.2.

---

## 8. Discipline-archive significance

Per architect-side honest accounting. What does this scoping cycle teach about the project's discipline state?

1. **SCOPE-PROPOSAL fidelity is a useful intermediate artifact.** The Q-NN-SPEC-TEMPLATE frame at reduced fidelity (no pseudo-code, no AC numbering, phase-letter granularity) is load-bearing for pre-commitment scoping. Candidate template addition: **anchor templates/SCOPE-PROPOSAL-TEMPLATE.md** as a sibling to Q-NN-SPEC-TEMPLATE.md (a fillable scaffold that codifies the 8-section structure this memo demonstrates: exec summary; per-extension scope; Q-cycle estimate; risk register; open Qs for decision-maker; pre-route discipline application; close framing; discipline-archive significance). The SCOPE-PROPOSAL fidelity level fills a gap between PRD (what + why; PM-owned) and SPEC (how, with full Architect six-practices + 10 P3 axes + pseudo-code; Architect-owned) — useful for any project where the scope itself needs architectural validation before committing Q-cycles to spec-emit. Memorial-accretion candidate; observed-once is too early to memorialize, but the next SCOPE-PROPOSAL-class artifact crystallizes the discipline.

2. **Memorial D candidate-set additions span all three extensions.** MD-F1 through MD-F5 represent five novel-literature-path candidates in a single scoping memo. This is high candidate-set density relative to single-extension Q-cycles (Phase-3.d had ~1-2 candidate-set additions per sub-track on average). Architect-pre-prediction: fleet-mode is a Memorial-D-dense phase; pair-review investment correspondingly larger.

3. **Anti-scope ledger growth predicted at Phase F + G close.** 14 new anti-scope clauses (A1-A14) identified pre-spec-emit. Estimated 8-12 will survive to ADR-clause status at Phase G close walk (analogous to Q60 V2's 8 anti-scope clauses + Q66 Phase-3.d.A's 5 ADR clauses pattern). Carry-forward to LEDGER post-close-PR-merge.

4. **Phase-letter scoping (F + G split) is the load-bearing architectural commitment.** The split between per-shard infrastructure (F) and cross-shard correlation (G) is the architectural decision John's Q-J6 disposition validates or amends. The circular-coupling surface between Phase G's event-feed and Phase F's freeze-hook is a cross-phase contract that requires explicit schema versioning (R-E5 hazard). Spec-emit phase will need to make the cross-phase contract concrete at Phase F SLICE 1 (contract emitter) and Phase G SLICE 1 (contract consumer).

5. **TPM pre-route grilling check (intake 2026-05-15) caught three structural issues pre-architect-engagement.** Scope-creep check (hardware-diagnostic territory) → A10 + R-A1 mitigated; pedagogy-invalidation check (demo narrative restructuring) → LS-7 surfaced for spec-emit; Memorial D check (hierarchical e-process + FDR are Memorial-D-candidate-territory) → MD-F1 + MD-F2 + PR-F1 + PR-F2 confirmed. Pre-route grilling at TPM intake is doing exactly what `skills/04-pre-route-checklist.md` intends; observation-confirmed.

---

_Memo authored: 2026-05-15. Format: SCOPE-PROPOSAL (anchor `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity). For full spec-emit, this memo is the foundation for Phase F SLICE 1 spec drafting; estimated lift from SCOPE-PROPOSAL to SPEC ~0.5-1 architect Q-cycle of additional fidelity work (P1 inline derivations + P5 pseudo-code + per-file implementation surface + worked test-case round-trips). Pair-review investment + Memorial D candidate-set walk-through happens at SPEC-emit fidelity, not SCOPE-PROPOSAL._

_Routing target: TPM packages for John; John dispositions on Q-J1 through Q-J6 (decision-points); TPM routes outcome back to architect for Phase F SLICE 1 spec-emit if (a) clean close picked. No Mac Claude routing emitted at this fidelity — implementation-time work begins post-Phase-F-SLICE-1 spec-emit._
