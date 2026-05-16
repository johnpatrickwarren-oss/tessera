# ARCHITECT-MEMO — Fleet-Mode Scoping (v0.2)

_From: Architect. To: John (decision-routing). Routed via: TPM._
_Date: 2026-05-15 (v0.2 same-day amendment post-Reviewer-pass)._
_Foundation: v0.1 memo (`coordination/ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md`) + Reviewer report (`coordination/REVIEWER-REPORT-fleet-mode-scoping-v0.1.md`) + brainstorm output via `superpowers:brainstorming` skill 2026-05-15 (per Reviewer G5 finding) + existing-architecture coverage from `engine/types/verdict.ts:141-260` + `engine/topology-overlay.ts:1-100` + anchor `skills/14-prd-conjunction-cross-check.md` + `skills/15-prescription-to-AC-coverage.md` + `case-studies/archfolio-coordinator-dryrun/HYBRID-REVIEWER-DESIGN.md` (anchor commits `c2a24dc` + `9aec8d7` pulled same-day 2026-05-15)._
_Type: **SCOPE-PROPOSAL v0.2** (amended). Per Q-NN-SPEC-TEMPLATE frame at reduced fidelity. Amendments dispositioned in § 9._
_Sequencing: unchanged from v0.1 — Phase F (per-shard infrastructure: Extensions 1 + 2) + Phase G (cross-shard correlation: Extension 3). v0.2 reaffirms Phase F + G commitment with retrospective P2 enumeration in § 1.5, post-Reviewer-pass correctness amendments, and Memorial D candidate-set refinement._

---

## 1. Executive summary

DeploySignal's current architecture is a single-deployment decision engine: one canary → one verdict, with per-cell baselines indexed over `(hour_of_day, day_of_week, workload_class, tenant_tier, …)` cell dimensions (NORTH-STAR Addition #2 / #23). **Important Reviewer-pass amendment:** an L3b VerdictGroup aggregation layer (Addition #25; `engine/types/verdict.ts:141-188`) AND a topology-overlay enrichment layer with abstract `TopologySource` interface (Addition #26; `engine/topology-overlay.ts`) already exist. Fleet-mode extends the single-deployment engine to **N tightly-coupled shards of one workload** — exemplar: 100-10000 GPU shards in an AI training/inference cluster. The three architectural extensions: (1) α-budget arithmetic at fleet scale; (2) per-shard baseline calibration; (3) cross-shard correlation — the last of which **builds on the existing Addition #25 + #26 primitives** rather than introducing them from scratch (this is the F1 amendment correction from v0.1).

**Phase-letter estimate: Phase F + Phase G, sequenced.** Unchanged from v0.1; reasoning enumerated retrospectively in § 1.5. Phase F bundles Extensions 1 + 2 (shared calibration substrate; reduces α-bookkeeping double-touch hazard). Phase G isolates Extension 3 (highest-novelty even after F1 amendment; layered on existing primitives but extends them materially). **Estimated 16-24 Q-cycles total** (down from v0.1's 18-26 per F1 collapsing Phase G SLICE 1 scope). Memorial D candidate-set additions on hierarchical e-process + FDR-style + topology-aware common-mode attribution; **Extension 3 (c) reframed as event-conditional correlational attribution (not causal)** per F2 amendment, preserving Addition #26 D4 `correlational_not_causal: true` wire-format constraint; pair-review triggers on Extensions 1 (hierarchical e-merging), 2 (empirical-Bayes hierarchical baseline), and 3 (event-conditional correlational attribution).

---

## 1.5 Memo structure options considered

Per `superpowers:brainstorming` skill discipline applied 2026-05-15 (filling Reviewer G5 gap; P2 option-space enumeration at meta-architectural level). Four memo-structure options enumerated; (d) selected.

### (d) Phase F (Extensions 1 + 2 bundled) + Phase G (Extension 3) — PICKED

**Why picked:** Extensions 1 + 2 share a calibration substrate (both touch per-cell/per-shard baselines AND the fleet-merge layer at the same compile-time surface). Bundling them in Phase F reduces α-bookkeeping double-touch hazard analogous to Q57 anti-scope (LEDGER:67). Extension 3 is the highest-novelty extension AND, even after F1 amendment building on Addition #25/#26 primitives, materially extends both (HardwareTopologySource impl + BFS-on-undirected-graph extension + VerdictGroup scope re-architecture from `(deploy_id, …)` to `(cluster_event_id, …)`). Isolating Extension 3 in Phase G preserves differential validation against a known-coherent Phase F foundation. Q-cycle balance: Phase F ~8-12, Phase G ~8-12 (post-F1) — each precedent-matching at Phase-3.d scale (15-18 Q-cycles for a single-extension phase). Matches the Q66 `.γ → .γ.b → .γ.c` iterative-refinement precedent at phase scale.

**Cost accepted:** two phase letters consumed; cross-phase contract surface (Phase F fleet-merged verdicts → Phase G outer aggregator consumption) needs explicit schema versioning per R-E5.

### (a) Single Phase F covering all three extensions — REJECTED

**Why rejected:** Phase F would be 16-24 internal Q-cycles, well past any prior phase precedent (Phase-3.d was 15-18 for a single-extension phase). Loses architectural isolation — Extension 3 stays bundled with the per-shard infrastructure foundation it should be differentially validated against. Risks compound-cycle drift (anti-scope skill 06 §3 citation): if Extension 3 doesn't close cleanly, the entire Phase F BATCH stays open. Creates the α-bookkeeping × verdict-aggregation-scope double-touch the Q57 anti-scope was specifically designed to prevent (LEDGER:67). Pros (one close-walk, one phase letter) insufficient to outweigh.

### (b) Three separate phases F / G / H, one per extension — REJECTED

**Why rejected:** Extension 2 → Extension 1 has a linear dependency (per-shard baselines feed per-shard detector cascade output, which feeds Extension 1's fleet-merge). Separating them creates an inter-phase contract surface for a coupling that's not load-bearing — they share a substrate. Inflates Q-cycle estimate (three close-walks at ~1 cycle each vs two), inflates coordination overhead, and loses the natural bundling rationale. Pros (maximum per-extension isolation) outweighed by the shared-substrate fact for Extensions 1 + 2.

### (c) Fold fleet-mode into Phase E (production deployment hardening) — REJECTED

**Why rejected:** Phase E's stakeholder is production SRE (single-deployment operational hardening); fleet-mode's stakeholder is cluster oncall + AI infrastructure operators. Bundling these creates demo-narrative awkwardness in both directions — pedagogy-invalidation extent inflates beyond what `feedback_accuracy_first_pitch_demos_adapt` accepts gracefully. Architecturally, Phase E is operational hardening of an already-complete system; fleet-mode is an architectural extension. Different problem classes; folding them loses both pitches. Pros (reuses existing phase letter) outweighed by stakeholder + problem-class mismatch.

---

## 2. Per-extension scope

### Extension 1 — α budget arithmetic at fleet scale

**Architectural objective:** preserve a stated fleet-level FPR guarantee (any-time Ville analog of the current per-instance α-budget) across N shards without naive replication multiplying expected falsely-flagged shards by N. Operator-facing target: **per-shard any-time α bound + bounded expected falsely-flagged-shard count per evaluation window** — hybrid Ville-at-shard / FDR-at-fleet target, with the fleet-level guarantee being the load-bearing pitch artifact.

**Recommended approach: (b) hierarchical e-value combination as the primary guarantee, with (c) FDR-style as the operator-facing fleet-level surface.**

(Reasoning unchanged from v0.1; candidate (a) Bonferroni structurally incompatible with Ville-bounded architecture; candidate (b) Vovk-Wang 2021 / Wang-Ramdas 2024 directly extends Phase-3.d.D Family A mixture-supermartingale + Family C MMD betting-e-process composability; candidate (c) Ren-Barber 2024 e-BH for operator-facing FDR; candidate (d) streaming e-merging folded into (b) as sub-mechanism.)

**Cross-family α allocation:** per-shard within-shard cascade preserved unchanged. Fleet-level cross-shard cascade is a NEW allocation layer above per-shard. The two are NOT additive — different guarantees over different event spaces (per-shard at-some-time-in-window vs at-least-one-shard at-this-time). Spec-emit phase makes guarantee-space explicit at demo-narrative level (`feedback_accuracy_first_pitch_demos_adapt` discipline).

**Anti-scope** (unchanged from v0.1):

- **A1: NO Bonferroni at fleet scale.** Structurally incompatible with Ville-bounded per-shard architecture.
- **A2: NO per-shard amplification-factor tuning of α-budget.** Preserves Q58 close-with-CAVEAT clause 2 + Q59 H4 PERMANENT clause 3 (PRESERVED-PERMANENT-POST-PHASE-D per LEDGER:176/179).
- **A3: NO retiring Family B at fleet scale.** Structural signals remain per-shard pass-through.
- **A4: NO closing per-shard fleet-merge to a single scalar fleet verdict.** Extension 3 consumes per-shard verdicts as-is.
- **A5: NO modification to per-shard Ville-bounded internals.** Phase-3.d.D close stamped these as architecturally closed.

**Memorial D candidate-set additions** (unchanged from v0.1):

- **MD-F1: Hierarchical e-value combination at fleet scale.** Conditional-independence assumption load-bearing under correlated drift.
- **MD-F2: e-BH / FDR via e-values at fleet scale.** Any-time vs fixed-time FDR distinction load-bearing.

**Pair-review triggers** (per Architect 3-check discipline; PROJECT-ROLES:24):

- **PR-F1:** TRIGGERED on MD-F1 (hierarchical e-value combination).
- **PR-F2:** TRIGGERED on MD-F2 (e-BH).
- **PR-F3:** PRE-EMPTED (not triggered) — sub-mechanism (d) streaming e-merging covered by PR-F1 literature anchor.

---

### Extension 2 — Per-shard baseline calibration

**Architectural objective:** N parallel baseline-learning regimes co-exist with the Q70 calibration regime (rolling-window recalibration + shadow-mode cutover, dispatch-table refactor per LEDGER:194-200), without (a) paging on every signal-during-learning at new-shard provisioning, (b) breaking independence assumptions under correlated drift events, or (c) inflating storage footprint linearly in N at the cell-matrix layer.

**Recommended approach: (b) hierarchical baseline (shared fleet prior + per-shard residual) extending Addition #2's existing hierarchical-pooling architecture, with (c) transfer learning from fleet baseline as cold-start mechanism, and (d) per-shard shadow-mode cutover extending Q70 regime for cutover semantics.**

(Reasoning unchanged from v0.1; candidate (a) independent per-shard pays cold-start tax N times; candidate (b) is natural extension of Addition #2's hierarchical pooling; candidate (c) transfer-learning warm-starts via `cell_confidence: warm_start`; candidate (d) inherits Q70's dispatch-table + self-normalized fallback.)

**Cold-start latency target:** bounded by sample-rate, not architecturally-fixed minutes. **G1 amendment** — the tick rate is parameterized per-deploy via `tick_seconds`, with default 5 seconds per `tools/ingest-real-trace.ts:106` (and 4 sibling locations: `:204`, `:278`, `:500`). At default 5s tick rate, 60 samples = 5 min wall-clock for `strict` upgrade; 20 samples = 100s wall-clock for warm-start upgrade (PR-F4 pair-review trigger condition). The tick rate is NOT a fixed engine constant — `engine/core.ts` consumes ticks at whatever rate they arrive — so cold-start latency engineering target is best-stated as "20 per-shard samples for warm-start upgrade; 60 for strict" rather than wall-clock seconds.

**Correlated-drift handling:** "freeze fleet baselines during deployment events" architectural coupling. Deployment-event signal sourced from cluster's deployment pipeline (Extension 3's event-feed ingestion); consumed by Extension 2's freeze hook for the post-event window (default 30 min, tuned by event class at spec-emit). Couples Extensions 2 and 3 via the circular-coupling surface in § 2.4.

**Storage footprint:** at fleet scale of N=10000, hierarchical-pooling **encoding** rather than storage — only per-shard residual is stored; fleet prior is shared. Per-shard residual sparse at warm-start. **G2 amendment** — both endpoints derived with shown math:

- **Naive endpoint** (independent per-shard baselines, candidate (a) reference): N=10000 × cells=168 (`hour_of_day × day_of_week` per Addition #2 default) × p=15 signals × covariance matrix p² + mean vector p × 8 bytes/float = 10000 × 168 × (225 + 15) × 8 = **3.22 GB**. At full cell-matrix expansion with tenant_tier (×5 per Addition #23) + workload_class (×4 per Addition #2): 10000 × 3360 × 240 × 8 = **64.5 GB**. (v0.1's "200GB+" claim was unsourced; corrected.)
- **Hierarchical-encoding endpoint** (candidate (b) PICKED, sparse per-shard residual): fleet aggregate ≈ 1 × full-cell-matrix footprint (~6.5 MB at default 168 cells; ~130 MB at full expansion); per-shard residual rank-deficient at warm-start, full only at `strict`-upgraded cells. Architect-pre-prediction: at N=10000 with sparse residual encoding, total ≈ **1.2-1.5× single-instance footprint** (PR-F5 pair-review trigger condition); empirical P6 measurement at Phase F SLICE 2 validates. Failure mode: prediction wrong by >2× signals load-bearing acceptance failure; revisit hierarchical-pooling decision.

**Cross-reference Q70 spec** (unchanged from v0.1): dispatch-table refactor + self-normalized fallback module extend cleanly; new SPEC drafting needed for `cell_confidence: warm_start` enum extension, deployment-event freeze hook, per-shard residual schema, dimension-priority ordering with `shard_id`.

**Anti-scope** (unchanged from v0.1):

- **A6: NO modification to Addition #2 hierarchical-pooling algorithm.** Load-bearing across single-instance cell-matrix cycles.
- **A7: NO per-shard novelty Family E re-engineering at fleet scale.** Per Q2.B.6.4 ADR clauses 1+2 (LEDGER:31-32).
- **A8: NO real customer telemetry at fleet scale.** Preserves enterprise-infrastructure boundary (LEDGER:222-228).
- **A9: NO new shrinkage decision for per-shard residual covariance.** Q2.B.6a binary `shrinkage_alpha ∈ {0,1}` decision (NORTH-STAR:206) preserved.

**Memorial D candidate-set additions** (unchanged from v0.1):

- **MD-F3: Hierarchical / empirical-Bayes baseline at fleet scale.** Architectural-layer-coverage discipline at hypothesis-tree time across (per-shard / fleet-prior / deployment-event / cross-shard-correlation) layers.

**Pair-review triggers**:

- **PR-F4:** TRIGGERED on `min_samples_strict` re-derivation at fleet scale (60 → ~20 for warm-start; 60 preserved for strict-upgrade).
- **PR-F5:** TRIGGERED on storage footprint architect-pre-prediction (~1.2-1.5× single-instance encoding-not-storage; empirical P6 validates at Phase F SLICE 2).

---

### Extension 3 — Cross-shard correlation layer **[F1 + F2 + G3 + G7 + G8 AMENDED]**

**Architectural objective:** consume per-shard verdicts (the output of Extension 1's fleet-merge layer applied to Extension 2's per-shard calibration) plus cluster-state inputs (topology, deployment events) and emit attribution semantics distinguishing **single-shard fault** from **fleet-level event** from **topology-localized common-mode failure**. Output consumed by cluster oncall (real-time pager) AND post-hoc audit (batch).

**Pre-existing architectural primitives (F1 amendment).** Two primitives ship in current main:

- **Addition #25 (ARCHITECT-REPLY-47) — L3b VerdictGroup aggregator** at `engine/types/verdict.ts:141-188`. Post-L3 incident-aggregation layer; consumes FusedVerdict per tick and produces VerdictGroup per incident. Currently scoped to `(deploy_id, window_start_ts)`. **Extension 3 (a) outer aggregator extends this scope to `(cluster_event_id, window_start_ts)` where `cluster_event_id` may span multiple `deploy_id`s** (G8 amendment; see below).
- **Addition #26 (ARCHITECT-REPLY-48) — Topology overlay** at `engine/topology-overlay.ts` + `engine/types/verdict.ts:190-260`. Post-#25 enrichment layer; pure-additive; VerdictGroup stays topology-agnostic (D5). `TopologySource` is an abstract interface (D1 Option E) explicitly designed so v2 can add custom impls without schema churn. **Extension 3 (b) implements a HardwareTopologySource against this existing interface** (NVLink topology / rack / PSU / cooling-zone) — NOT a new abstract interface. Current `TopologyNode.kind` enum is `'service' | 'database' | 'queue' | 'external'`; fleet-mode extends with `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`.

**Recommended approach: (d) hybrid — (a) extend L3b VerdictGroup aggregator with cluster-event scope + (b) implement HardwareTopologySource against existing interface + (c) event-conditional correlational attribution layer, structured as a three-layer cascade.**

Justification (revised from v0.1 to reflect existing primitives): (a) extends the existing VerdictGroup aggregator's scope; (b) implements a new concrete impl against the existing `TopologySource` interface; (c) extends `VerdictGroupWithTopology` with event-feed conditioning. The cascade is sequential at first-pass but parallel within each evaluation window.

**F2 amendment: (c) framing recalibrated from "causal" to "correlational."** Addition #26 D4 explicitly refuses causal framing for TopologyCandidate (`engine/types/verdict.ts:240`: "Explicitly NOT a causal claim per D4 — `correlational_not_causal: true` is a required literal label on the wire."). Extension 3 (c) is reframed as **event-conditional correlational attribution** — same statistical primitives (CausalImpact / synthetic control / interrupted time series), different epistemic claim. Pitch claim re-calibrates from "DeploySignal causally attributes drift to the deploy" to "DeploySignal surfaces evidence that drift is event-conditional, with conditional-correlational confidence labeled correlational_not_causal per Addition #26 D4." This matches NORTH-STAR Addition #11 honest-broker stance the v0.1 memo already cited; applied consistently to Extension 3 (c) per architect 2026-05-15 disposition.

**Interface refinement candidate.** Current TopologyEdge is directed (`from` / `to`) with `relationship: 'calls' | 'reads' | 'writes' | 'publishes'`; BFS visit logic at `engine/topology-overlay.ts` assumes directed-edge service-graph semantics. **NVLink hardware topology is dense and undirected** (peer-to-peer interconnect, no caller/callee semantics); rack membership is hierarchical-containment (also undirected). Phase G SLICE 1 includes an architect-grilling-level evaluation of whether (i) the existing TopologyEdge / BFS suffice with `relationship` enum extension to accommodate undirected semantics, OR (ii) the interface needs a SymmetricTopologyEdge variant. Architect-pre-prediction: (i) sufficient with relationship enum extension (`'co_located_in_rack' | 'shares_psu' | 'nvlink_peer'`); BFS treats these as bidirectional. Pair-review-triggering at PR-F6 includes this evaluation.

**Inventory inputs required** (revised per F1):

- **Cluster topology (HardwareTopologySource impl against existing TopologySource interface).** New concrete impl, NOT a new abstract interface. Consumes Slurm / Kubernetes / NVIDIA NVLink-topology output formats; produces TopologySnapshot with extended TopologyNode.kind enum. Analogous to OtelServiceGraphV1's role for service topology, but for hardware topology.
- **Deployment events (new ingestion surface).** Does NOT exist in current architecture; new compile-time substrate addition. Fleet-level deployment-pipeline event stream: model redeploy, firmware push, env change, config change, capacity change. Architecturally analogous to existing `flags` input on the orchestrator (per ARCHITECTURE.md tick contract `{live, baseline, flags}`) but at cluster-event scope rather than per-deploy scope.
- **Cluster state history** — reuses existing TrendBuffer / SignalSnapshot.

**VerdictGroup scope re-architecture (G8 amendment).** VerdictGroup currently scoped `(deploy_id, window_start_ts)` per `verdict.ts:158`. Fleet-mode needs `(cluster_event_id, window_start_ts)` where `cluster_event_id` may span multiple `deploy_id`s (a fleet-level firmware push or env change applies to all shards in the cluster regardless of which deployment they serve). **Scope re-architecture is non-trivial** — touches:

- Close-trigger semantics (`verdict.ts:149-153`: D2 default 300s window; D5 grace_seconds for late arrivals)
- Group_id format (currently `group-{deploy_id}-{window_start_ts}` per `verdict.ts:155-159`; fleet-mode candidate format: `group-{cluster_event_id}-{window_start_ts}` OR composite `group-{deploy_id}|{cluster_event_id}-{window_start_ts}` for cases where both scopes apply)
- Cross-deploy aggregation rules (currently any-pod-rollback per NORTH-STAR:797; fleet-mode candidate: any-shard rollback subject to event-conditioning)

Phase G SLICE 2 cost is dominated by this re-scoping, not by the aggregation algorithm itself. Cross-reference Addition #25 D2 + D5 clauses for preservation/amendment status at spec-emit.

**Pair-review trigger conditions** (literature anchor):

- **Meta H100 SDC papers** (Hu et al 2024 "Characterization of LLM Development in the Datacenter"; Meta Llama 3 paper § hardware reliability) for SDC-class fault claim and topology-aware common-mode literature.
- **Microsoft Project Forge / Google 2023 SDC postmortems** for cross-vendor common-mode failure mode catalog.
- **Hierarchical change-detection** (Tartakovsky-Polunchenko-Sokolov 2014; modern fleet-monitoring work) for multi-stream changepoint framing.
- **Interrupted time series / synthetic control / CausalImpact** (Brodersen-Gallusser-Koehler-Remy-Scott 2015 Bayesian Structural Time Series; Abadie-Diamond-Hainmueller 2010) — used for **conditional-correlational** event attribution per F2 amendment (not causal claim despite literature using "causal" terminology).

**G3 acknowledgment.** This extension's prose is intentionally longer than Extensions 1 + 2 — Extension 3 layers on existing primitives (Addition #25/#26) that require explicit cross-reference work, AND introduces the largest new ingestion surface (deployment events), AND has the most pair-review-trigger density (3 sub-mechanisms each with literature anchors). Asymmetry accepted per Reviewer recommendation; not load-bearing on memo fidelity claim.

**Anti-scope:**

- **A10: NO hardware-diagnostic territory.** DCGM / NVML integration, per-GPU hardware-fault attribution are NVIDIA-stack scope; DeploySignal consumes resulting signals as inputs.
- **A11: NO live customer cluster telemetry.** Preserves enterprise-infrastructure boundary; fleet-mode topology + event-feed validated against synthetic-cluster substrate.
- **A12: NO modification to per-shard Family A-E detectors.** Extension 3 is an OUTER aggregator + attribution layer.
- **A13: NO ML-based attribution model.** Extension 3 is rule-based + statistical; conflicts with calibrated-confidence honest-broker stance.
- **A14: NO modification to per-shard verdict shape.** Existing verdict shape preserved; fleet-level output is NEW shape layered on top.
- **A15: NO multi-region / cross-cluster federation (G7 NEW).** Fleet-mode is intra-cluster (one DC, one cluster, N shards). Cross-cluster federation (multi-DC, hierarchical fleet aggregator over multiple clusters) is a natural absorption candidate ("solved cross-shard, why not cross-cluster?") explicitly deferred. Tempting because architectural pattern is symmetric (one more level of hierarchical aggregation); deferred because operational surface is different (network partition + clock-skew + cluster-federation-protocol concerns intra-cluster doesn't have).
- **A16: NO Addition #26 D4 reversal (F2-α NEW).** D4 `correlational_not_causal: true` wire-format constraint preserved at Phase G; Extension 3 (c) framed as event-conditional correlational attribution. Reopening D4 (option F2-β) deferred indefinitely — no Phase G sub-track for ADR reversal. If a future cycle needs causal-attribution semantics (post-Phase G), it gets a separate ADR proposal.

**Memorial D candidate-set additions** (F2-α amended):

- **MD-F4: Topology-aware common-mode attribution.** Architectural-layer-coverage at hypothesis-tree time: candidate set enumerates (i) random-co-occurrence, (ii) topology-localized common-mode, (iii) fleet-level event, (iv) sample-stream-attribution-error (P3 axis 10 firing-attribution-discipline at fleet level).
- **MD-F5 (revised): Event-conditional correlational attribution** (was: "causal attribution" in v0.1). Candidate set enumerates (i) event-conditioned-drift, (ii) coincidental concurrent drift, (iii) event-triggered-but-not-event-attributable drift (event uncovered a latent fault). Conflating these is the standard interrupted-time-series confounding hazard; the literature is sharp on this and the architect must enumerate it explicitly. Confidence stays correlational-not-causal per Addition #26 D4.
- **MD-F6 (NEW per Reviewer disposition): File-opened-discipline-paired-with-candidate-set-enumeration** as a refinement of the 9th CONFIRMATION class. F1 was caught by Reviewer at file-opened-discipline gap (architect didn't open `engine/types/verdict.ts` + `engine/topology-overlay.ts` at brief-drafting time). At hypothesis-tree drafting time, candidate-set enumeration alone is insufficient — must be paired with file-opened verification of existing architectural surface. Memorial D candidate post-Reviewer-pass; would have prevented F1. Cross-reference: P3 axis 3 (file-opened) discipline.

**Pair-review triggers** (revised per F2-α):

- **PR-F6:** TRIGGERED on MD-F4 (topology-aware common-mode). Plus the TopologyEdge interface-refinement evaluation (directed-vs-undirected) per Interface refinement candidate above.
- **PR-F7 (revised):** TRIGGERED on MD-F5 (event-conditional **correlational** attribution; previously "causal"). External-source verification: CausalImpact / synthetic-control literature + interrupted-time-series confounding hazards; empirical pair-review test on synthetic-cluster substrate with 4-cell evidence matrix (event + drift / event + no-drift / no-event + drift / no-event + no-drift); architect concur. Load-bearing for "DeploySignal surfaces conditional-correlational evidence that drift is event-attributable" pitch claim (recalibrated from "causally attributes drift to the deploy").

### 2.4 Dependency graph between extensions (unchanged from v0.1)

Phase F (Extensions 1 + 2) ships independently with `freeze_hook_enabled: false`; Phase G (Extension 3) ship activates freeze-hook coupling. Circular-coupling surface: Phase G's event-feed → Phase F's freeze-hook (consumed by Extension 2's correlated-drift handling). Phase F → Phase G via per-shard verdicts and fleet-merge layer. Soft circular dependency; Phase F shippable independently. Phase G activation gate (Q-J5) makes the coupling explicit.

---

## 3. Q-cycle estimate (REVISED per F1)

**Estimate: 16-24 Q-cycles total across Phase F + Phase G** (down from v0.1's 18-26). Confidence: pre-route at SCOPE-PROPOSAL fidelity; spec-emit refinement will tighten.

### Phase F — Extensions 1 + 2 (per-shard infrastructure)

**8-12 Q-cycles** (unchanged from v0.1). Roughly:

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase F SLICE 1 | 1-2 | Schema additions; dispatch-table refactor extension; self-normalized fallback fleet-aware variant. Architectural-foundation-only. |
| Phase F SLICE 2 | 2-3 | Per-shard residual schema + compile-time hierarchical-pool extension. Warm-start cold-start mechanism. P3 axis 5 verification at synthetic N=100 shard fleet. **Empirical P6 storage profile (PR-F5) lands here.** |
| Phase F SLICE 3 | 2-3 | Hierarchical e-value combination at fleet scale (MD-F1; PR-F1 pair-review). Fleet-merged Family A + Family C surfaces. Iid bootstrap regression test extended to N=100 shards. |
| Phase F SLICE 4 | 2-3 | e-BH FDR operator surface (MD-F2; PR-F2 pair-review). Empirical fleet-FDR regression test. |
| Phase F close walk | 1 | Sub-rule 3 INVERTED ADR walk + Memorial D state evolution stamp + Phase G TAGGED-FUTURE activation criterion. |

LIKELY-SURFACES prediction: ~2 architect-pre-predicted iterative-refinement cycles within SLICE 3-4 per Q66 `.γ → .γ.b → .γ.c` precedent. Adds +1-2 Q-cycles within the SLICE 3-4 range above.

### Phase G — Extension 3 (cross-shard correlation) **[REVISED per F1]**

**8-12 Q-cycles** (down from v0.1's 10-14 per F1 collapsing SLICE 1 scope). Phase G SLICE 1 scope collapses because the abstract `TopologySource` interface + `VerdictGroup` schema already exist; SLICE 1 is now scoped to "extend existing primitives" rather than "build substrate from scratch."

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase G SLICE 1 | 1-2 (was 2-3) | TopologyNode.kind enum extension (`'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone'`); TopologyEdge `relationship` enum extension for undirected/peer semantics; VerdictGroup scope-extension contract (cluster_event_id field addition; preserved-vs-amended walk of Addition #25 D2 + D5 clauses); synthetic-cluster substrate v9X-class fixture generation. **NO** HardwareTopologySource concrete impl yet; **NO** deployment-event-feed ingestion yet. |
| Phase G SLICE 2 | 2-3 | Outer aggregator extending L3b VerdictGroup aggregator with cluster_event_id scope. Fleet-merge consumption layer. Per-shard verdict aggregation contract with `cluster_event_id` propagation. **VerdictGroup scope re-architecture cost dominates this slice (G8 amendment).** |
| Phase G SLICE 3 | 3-4 | HardwareTopologySource concrete impl (NVLink + rack + PSU + cooling-zone). Topology-aware spatial attribution (MD-F4; PR-F6 pair-review including BFS-on-undirected evaluation). Common-mode failure-injection empirical test (rack-localized PSU event simulation on synthetic v9X cluster substrate). |
| Phase G SLICE 4 | 2-3 | Deployment-event-feed ingestion. Event-conditional correlational attribution (MD-F5; PR-F7 pair-review). 4-cell evidence matrix regression test. Phase F freeze-hook activation coupling. |
| Phase G close walk | 1 | ADR walk; Addition #25 D2 + D5 disposition stamp; Addition #26 D4 RECONFIRMED (per F2-α + A16); activates Phase F freeze-hook coupling. |

LIKELY-SURFACES prediction: ~2-3 architect-pre-predicted iterative-refinement cycles concentrated in SLICE 3 (HardwareTopologySource impl) — BFS-on-undirected adaptation OR sparse-topology-data edge cases likely produce empirical surprise.

### Total Q-cycle estimate (REVISED)

**Phase F: 8-12 Q-cycles** (architect-pre-prediction: 10 most-likely, with 2 LS cycles adding +1-2)
**Phase G: 8-12 Q-cycles** (architect-pre-prediction: 10 most-likely, with 2-3 LS cycles adding +1-2; down from v0.1's 12 most-likely per F1)
**Combined: 16-24 Q-cycles.**

Calibration check: Phase-3.d precedent (~15-18 effective Q-cycles for single-extension Ville-bounded re-engineering). Phase F + G covering three structural extensions + one new ingestion surface (deployment events; topology+VerdictGroup primitives are reuse-not-new) at 16-24 Q-cycles is consistent — per-extension Q-cycle density approximately matches; new-ingestion-surface adds +2-3 per surface (vs v0.1's +4-6 estimate based on assuming two new surfaces).

---

## 4. Risk register

### 4.1 Statistical-correctness risks

(Unchanged from v0.1: R-S1 through R-S6. Mitigation surfaces unchanged.)

### 4.2 Engineering risks **[R-E1 + R-E5 AMENDED]**

| Risk | Class | Mitigation surface |
|---|---|---|
| **R-E1 (G2 AMENDED)** — Storage at scale. Naive endpoint: 3.22 GB at default 168 cells × N=10000; 64.5 GB at full cell-matrix expansion with tenant_tier + workload_class. Hierarchical-encoding endpoint: ~1.2-1.5× single-instance via sparse per-shard residual. | P6 measurement; PR-F5 pair-review trigger. | Empirical P6 profile at Phase F SLICE 2 (N=1000 simulated). Pre-prediction failure (>2× single-instance) is a load-bearing acceptance failure. |
| **R-E2** — Cold-start latency at scale. | (unchanged) | Warm-start at fleet-aggregate eliminates blocking; 20-sample threshold via PR-F4. |
| **R-E3** — New ingestion surface coupling (deployment events; HardwareTopologySource impl). | Cross-cutting anti-scope candidate. | Synthetic-cluster substrate (Phase G SLICE 1-3) decouples from real cluster-management integration; real-cluster integration TAGGED-FUTURE post-Phase-G. **F1 amendment**: TopologySource interface already exists; HardwareTopologySource is a concrete impl against the existing interface, NOT a new ingestion abstraction. |
| **R-E4** — Per-shard residual rank-deficient at warm-start. | (unchanged) | Architect-pre-prediction ~10-20% compute inflation during warm-start. |
| **R-E5 (G8 + F1 REVISED)** — Cross-phase contract: Phase F → Phase G fleet-merged-verdict schema, PLUS Phase G internal contract: VerdictGroup scope extension from `(deploy_id, window_start_ts)` to `(cluster_event_id, window_start_ts)`. Two contract surfaces, not one. | P3 axis 2 (coord-trail) + axis 10 (firing-attribution-discipline). | Phase F SLICE 1 emits the fleet-merged-verdict contract; Phase G SLICE 1 emits the VerdictGroup scope-extension contract (preserved-vs-amended walk of Addition #25 D2 + D5 clauses). Phase G SLICE 2 reads + tests against both. Schema-version load-bearing on both contracts. |

### 4.3 Anti-scope risks (R-A1 through R-A7)

(Unchanged from v0.1.) Plus **R-A8 (NEW per G7)**: multi-region / cross-cluster federation absorption tempting because architectural pattern is symmetric; deferred per A15.

---

## 5. Open architectural questions for John

(Q-J1 through Q-J6 unchanged from v0.1. Q-J5 phrasing slightly refined to reference Phase G's freeze-hook activation via the deployment-event-feed ingestion at SLICE 4.)

---

## 6. Pre-route discipline application (architect-side) **[REVISED per Reviewer pass]**

### Architect grilling pass output (10 axes per DISCIPLINE-REFERENCE:154)

**CRITICAL: 0.** No items where architect should re-draft before emit at v0.2 fidelity. v0.1 had 0 CRITICAL by SCOPE-PROPOSAL-fidelity convention; v0.2 maintains 0 CRITICAL after Reviewer pass (F1 + F2 dispositioned to amendments, not re-drafts).

**LIKELY-SURFACES: 8** (was 7 in v0.1; +LS-8). Pre-flagged in spec § Open architectural questions OR § Anti-scope OR § Risk register:

- LS-1 through LS-7 (unchanged from v0.1).
- **LS-8 (NEW per F1):** TopologyEdge directed-vs-undirected adaptation under NVLink hardware-topology use case (Phase G SLICE 3 iterative-refinement prediction).

**PRE-EMPTABLE: 8** (was 6 in v0.1; +PE-7, PE-8). Folded proactively:

- PE-1 through PE-6 (unchanged from v0.1).
- **PE-7 (NEW per F1):** Build on existing Addition #25 + #26 primitives explicitly; no new abstract ingestion interfaces (concrete impl + scope extension only).
- **PE-8 (NEW per F2):** Preserve Addition #26 D4 correlational-not-causal stance via A16 + Extension 3 (c) framing recalibration.

### Memorial D candidate-set enumeration

Memorial D state evolution: pre-Reviewer-pass at 20V/8C; post-Reviewer-pass disposition (this v0.2 emit) increments to **21V/8C** classifying F1 + F2 as a single sub-instance of the 8th CONFIRMATION class lineage (architect-grilling-discipline-pre-empirical-mechanism-capture variant; specifically the file-opened-discipline-paired-with-candidate-set-enumeration sub-variant per MD-F6). Architect-pre-prediction: post-Phase-G close-walk, expected progression to ~23-25V / ~9-11C depending on discipline application across the 16-24 Q-cycles.

(Alternative classification: F1 + F2 as two distinct violations → 22V/8C. Architect picks the single-sub-instance classification because both F1 + F2 surface the same architect-grilling-discipline gap class — file-opened verification of existing architectural surface — at the same brief-drafting moment. The Q66 LS-1 stationarity-assumption-violation sub-instance classification precedent applies; LEDGER:142.)

### Memorial F sub-rule application

(Unchanged from v0.1: sub-rules 1, 2, 3, 4 all fire at Phase F + G. Plus reaffirmed at v0.2 emit: sub-rule 3 (ADR-anti-scope-preservation) extended to Addition #25 D2 + D5 (preservation-or-amendment at Phase G SLICE 1) and Addition #26 D4 (RECONFIRMED at v0.2 via F2-α + A16).)

### Pair-review trigger summary (G4 WORDING FIX)

**7 pair-review trigger conditions enumerated; 6 trigger-firing (PR-F1, PR-F2, PR-F4, PR-F5, PR-F6, PR-F7), 1 pre-empted as sub-mechanism (PR-F3).** Per `feedback_pair_review_external_source_verification` (architect 3-check discipline): each of the 6 trigger-firing conditions requires (1) external-source literature verification, (2) empirical pair-review test, (3) architect concur in ARCHITECT-REPLY disposition. Total pair-review investment estimated at ~1 Q-cycle equivalent; included in the 16-24 Q-cycle estimate.

---

## 7. Topic close framing **[G6 RECALIBRATED]**

How this scoping memo (v0.2) resolves drives next-cycle pick. Probability bands recalibrated per Reviewer G6 finding accounting for 6-decision-point joint probability with partial coupling:

- **(a) Clean close (architect-pre-prediction ~45%; was 55% in v0.1):** John reviews + dispositions on Q-J1 through Q-J6; TPM routes to architect for Phase F SLICE 1 spec-emit; Phase F begins. Recalibration reflects 6-decision-point surface with partial coupling between Q-J4 / Q-J6 and between Q-J1 / Q-J5; pure-independence math would push lower (~35-40%); partial-coupling lifts to ~45%.
- **(b) Decline-to-activate (architect-pre-prediction ~15%; unchanged):** Memo lands as TAGGED-FUTURE in LEDGER.
- **(c) Partial-activation (architect-pre-prediction ~25%; was 20%):** Phase F as priority; Phase G TAGGED-FUTURE until Phase F closes. Ships with `freeze_hook_enabled: false`.
- **(d) Memo-amend (architect-pre-prediction ~15%; was 10%):** John surfaces clarification or scope adjustment; architect re-drafts v0.3.

Sum: 100%. Recalibration captures Reviewer G6 hazard while preserving the architect's coupling-aware adjustment above pure-independence baseline.

---

## 8. Discipline-archive significance

Per architect-side honest accounting. What does this scoping cycle teach about the project's discipline state? Items 1-5 re-emitted from v0.1 with v0.2-corrected counts; items 6-9 are post-Reviewer-pass observations.

1. **SCOPE-PROPOSAL fidelity is a useful intermediate artifact.** The Q-NN-SPEC-TEMPLATE frame at reduced fidelity (no pseudo-code, no AC numbering, phase-letter granularity) is load-bearing for pre-commitment scoping. Candidate template addition: **anchor `templates/SCOPE-PROPOSAL-TEMPLATE.md`** as a sibling to `Q-NN-SPEC-TEMPLATE.md`, codifying the 9-section structure this memo demonstrates (exec summary; memo structure options; per-extension scope; Q-cycle estimate; risk register; open Qs for decision-maker; pre-route discipline application; close framing; discipline-archive significance) + v0.2-revealed § "Existing architectural surface (Reviewer-anchor)" addition forcing architects to enumerate existing primitives before listing what's new. Memorial-accretion candidate; observed twice (v0.1 + v0.2) is still too early for full memorialization but pattern is crystallizing.

2. **Memorial D candidate-set additions span all three extensions.** MD-F1 through MD-F6 represent **six** novel-literature-path candidates in a single scoping memo (was 5 in v0.1; +MD-F6 added at v0.2 per Reviewer disposition — file-opened-discipline-paired-with-candidate-set-enumeration as 9th-CONFIRMATION-class refinement). High candidate-set density relative to single-extension Q-cycles (Phase-3.d had ~1-2 candidate-set additions per sub-track on average). Architect-pre-prediction: fleet-mode is a Memorial-D-dense phase; pair-review investment correspondingly larger.

3. **Anti-scope ledger growth predicted at Phase F + G close.** **16 anti-scope clauses (A1-A16)** identified pre-spec-emit (was 14 in v0.1; +A15 NO multi-region/cross-cluster federation per G7; +A16 NO Addition #26 D4 reversal per F2-α). Estimated 10-13 will survive to ADR-clause status at Phase G close walk (analogous to Q60 V2's 8 anti-scope clauses + Q66 Phase-3.d.A's 5 ADR clauses pattern, scaled). Carry-forward to LEDGER post-close-PR-merge.

4. **Phase-letter scoping (F + G split) is the load-bearing architectural commitment.** The split between per-shard infrastructure (F) and cross-shard correlation (G) is the architectural decision John's Q-J6 disposition validates or amends. The circular-coupling surface between Phase G's event-feed and Phase F's freeze-hook is a cross-phase contract requiring explicit schema versioning (R-E5 hazard). Spec-emit phase will make the cross-phase contract concrete at Phase F SLICE 1 (contract emitter) and Phase G SLICE 1 (contract consumer + VerdictGroup scope-extension contract per G8).

5. **TPM pre-route grilling check (intake 2026-05-15) caught three structural issues pre-architect-engagement.** Scope-creep check (hardware-diagnostic territory) → A10 + R-A1 mitigated; pedagogy-invalidation check (demo narrative restructuring) → LS-7 surfaced for spec-emit; Memorial D check (hierarchical e-process + FDR are Memorial-D-candidate-territory) → MD-F1 + MD-F2 + PR-F1 + PR-F2 confirmed. Pre-route grilling at TPM intake is doing exactly what `anchor/skills/04-pre-route-checklist.md` intends; observation-confirmed.

6. **Reviewer cold-context audit at SCOPE-PROPOSAL fidelity caught two FAIL-class findings (F1, F2) plus 8 GAPs.** F1 (existing-architecture-coverage missing) was a P3 axis 3 file-opened discipline gap at brief-drafting time — architect didn't open `engine/types/verdict.ts` + `engine/topology-overlay.ts` before drafting Extension 3 framing. F2 (D4 correlational-not-causal stance conflict) was a Memorial D architectural-layer-coverage gap — architect didn't enumerate the runtime-consumption-layer wire-format schema constraint at hypothesis-tree drafting time. Both fail-classes are the same architect-grilling-discipline gap class; Memorial D state increments by one sub-instance (20V/8C → 21V/8C per § 6 discipline application).

7. **SCOPE-PROPOSAL fidelity REVEALED a discipline-application gap that SPEC fidelity would have caught automatically.** At SPEC fidelity, P3 axis 3 (file-opened) is enforced by spec-emit-discipline (architect opens every file mentioned in implementation surface). At SCOPE-PROPOSAL fidelity, the implementation-surface section doesn't exist, so the discipline trigger doesn't fire automatically — the architect has to apply it manually, and at v0.1 didn't. **Candidate refinement to the SCOPE-PROPOSAL-TEMPLATE proposal in v0.1 § 8 item 1 (now reaffirmed in v0.2):** add a § "Existing architectural surface (Reviewer-anchor)" section to the template, forcing the architect to enumerate existing primitives the proposal builds on before listing what's new. This would have caught F1 at draft time.

8. **Superpowers `brainstorming` skill applied to § 1.5 closed Reviewer G5 finding.** Brainstorm output is itself memorialized as v0.2 § 1.5 — meta-architectural discipline at the SCOPE-PROPOSAL-artifact level, not just the implementation-spec level. First observation of `superpowers:brainstorming` use in DeploySignal coordination flow; pair-review-style validation precedent for future SCOPE-PROPOSAL cycles.

9. **`superpowers:receiving-code-review` discipline applied to v0.2 amendment cycle.** Per skill: "Verify before implementing; ask before assuming; technical correctness over social comfort." Each of the 10 Reviewer findings dispositioned with explicit codebase verification (verdict.ts open, topology-overlay.ts open, ingest-real-trace.ts:106 grep for tick_seconds, storage math derivation). F2 fork (α / β) surfaced for John's call via `AskUserQuestion` rather than architect-side auto-disposition. G5 fork (formal brainstorming-skill / inline P2 enumeration) surfaced similarly. Performative agreement avoided; technical-rigor preserved.

10. **Anchor `skills/14-prd-conjunction-cross-check.md` applied retroactively to v0.2 vs John's structured intake (post-update incorporation 2026-05-15).** Skill 14 (added to anchor in commit `9aec8d7` post-v0.1 emit) fires at any spec being authored, reviewed, or routed whose acceptance criteria derive from a PRD (or stakeholder-requirement document). At SCOPE-PROPOSAL fidelity the "PRD" is John's structured intake (REQUEST / CONTEXT / OUTPUT EXPECTED / DELIVERY / PRE-ROUTE GRILLING APPLIED) and the "AC analogs" are the per-extension recommended approach + anti-scope clauses + Memorial D candidate-set + pair-review triggers + Open Qs Q-J1..Q-J6. Verbatim-conjunct cross-check covering 54 conjuncts/qualifiers across John's intake; result PASS with two notable observations:

   - **Observation A (architect-introduced drift caught by Reviewer):** John's Extension 3 candidate (c) was framed verbatim as "Causal-inference style: did a fleet-level event happen (deployment, firmware push, config change)? **Conditional attribution given event.**" — the phrase "conditional attribution given event" is structurally correlational, NOT causal. v0.1 drifted this to "event-conditional causal attribution" expanding "conditional" into "causal." Reviewer F2 caught the drift via Addition #26 D4 wire-format constraint conflict. v0.2 F2-α reframing as "event-conditional correlational attribution" **restores John's original framing**, with the additional anchor of Addition #26 D4 preservation. This is the inverse of the canonical Skill-14 failure mode (PRD-narrowing-without-disclosure) — here the architect WIDENED the PRD, then the Reviewer audit caught the widening. Discipline-archive significance: Skill 14 catches BOTH narrowings and widenings of stakeholder-requirement language; the cross-check is symmetric.

   - **Observation B (stale-premise correction in stakeholder intake):** John's intake parenthetical on Extension 3 inventory inputs — "(Likely: nowhere — new ingestion surface.)" — was partially incorrect at the time of intake. Addition #25 (VerdictGroup at `engine/types/verdict.ts:141-188`) + Addition #26 (TopologySource interface at `engine/topology-overlay.ts:42-43`) had been shipped, so the new ingestion surface is materially narrower than John's intake scoped. v0.2 F1 amendment correctly narrows new ingestion to (i) HardwareTopologySource concrete impl against existing TopologySource interface + (ii) deployment-event-feed ingestion (genuinely new). Not a Skill-14 narrowing-without-disclosure — it's the architect catching a stale premise during file-opened-discipline application (or, in v0.1's case, NOT applying file-opened discipline and being caught at Reviewer). Pairs with MD-F6 (file-opened-discipline-paired-with-candidate-set-enumeration) as the discipline that would have caught this at draft time.

11. **Anchor `skills/15-prescription-to-AC-coverage.md` is forward-looking; fires at Phase F SLICE 1 spec-emit.** Skill 15 (added to anchor in same commit `9aec8d7`) catches "prescription-without-AC-binding" defects — cases where spec §3 (mechanism) or §4 (component inventory) prescribes a behavior that no §5 AC binds. At SCOPE-PROPOSAL fidelity there is no §3/§4/§5 formal structure, so Skill 15 doesn't fire retroactively. However: at Phase F SLICE 1 spec-emit, every prescription (hierarchical e-value combination algorithm, dispatch-table refactor for fleet-aware path, per-shard residual schema, `cell_confidence: warm_start` enum extension, etc.) must bind to a SLICE-1 acceptance criterion OR be moved to anti-scope. Architect commitment for Phase F SLICE 1 spec-emit: invoke Skill 15 as a mandatory pre-route gate alongside Memorial F sub-rules 1-4. Estimated 8-12 prescriptions per spec; per-prescription AC-binding verification ~5-10 min each.

12. **Anchor `case-studies/archfolio-coordinator-dryrun/HYBRID-REVIEWER-DESIGN.md` is structurally forward-applicable.** The hybrid Opus + Sonnet Reviewer pattern (added to anchor in commit `c2a24dc`) runs two parallel Reviewer sessions on the same artifact, then merges findings into a canonical report. The v0.2 cycle's Reviewer pass used a single-session cold-context audit (one Opus invocation auditing v0.1) — not hybrid. Skipping hybrid retroactively is acceptable at SCOPE-PROPOSAL fidelity where the artifact is decision-driving (not code-shipping) and the cost-benefit calculation differs. **Hybrid Reviewer becomes pair-review-style mandatory at:** (a) Phase F SLICE 3 spec-emit Reviewer pass for the hierarchical-e-value-combination empirical-evidence regression test (PR-F1 load-bearing), (b) Phase G SLICE 3 spec-emit Reviewer pass for the topology-aware common-mode failure-injection empirical-evidence (PR-F6 load-bearing), and (c) Phase G close walk Reviewer pass for the Addition #26 D4 RECONFIRMED disposition. Pair-review investment estimated +1 Q-cycle equivalent per hybrid invocation; included in the 16-24 Q-cycle estimate. Architect commitment: at Phase F SLICE 3 and Phase G SLICE 3 + close walks, TPM dispatches parallel Reviewer sessions per `HYBRID-REVIEWER-DESIGN.md` § Architecture.

---

## 9. Amendments from v0.1

| Finding | Class | Disposition | Sections affected |
|---|---|---|---|
| **F1** Existing-architecture-coverage missing | FAIL | AMENDED | § 1; § 2.3 (substantial rewrite); § 3 Phase G estimate; § 4 R-E5; § 6 PE-7; MD-F6 added |
| **F2** D4 correlational-not-causal conflict | FAIL | AMENDED (option α — preserve D4) | § 1; § 2.3 (c) reframing; A16 added; MD-F5 revised "causal" → "correlational"; PR-F7 revised; § 6 PE-8 |
| **G1** Unverified tick-rate citation | GAP | AMENDED | § 2.2 (tick rate cited correctly: 5s default per `tools/ingest-real-trace.ts:106`, per-deploy parameterized via `tick_seconds`; NOT a fixed engine constant) |
| **G2** Storage estimate off ~50× | GAP | AMENDED | § 2.2; § 4 R-E1 (both endpoints derived with shown math: 3.22 GB naive default; 64.5 GB naive full-expansion; 1.2-1.5× hierarchical-encoding) |
| **G3** Prose imbalance Extension 3 | GAP | AMENDED (option c per Reviewer recommendation) | § 2.3 explicit acknowledgment clause |
| **G4** Pair-review count wording | GAP | AMENDED | § 6 wording: "7 enumerated; 6 trigger-firing, 1 pre-empted" |
| **G5** Missing meta-level brainstorm | GAP | AMENDED via `superpowers:brainstorming` skill | NEW § 1.5 with (a)-(d) enumeration; (d) picked |
| **G6** Probability overconfidence | GAP | AMENDED | § 7 recalibrated 55/15/20/10 → 45/15/25/15 |
| **G7** Missing A15 anti-scope | GAP | AMENDED | A15 added (NO multi-region / cross-cluster federation) |
| **G8** VerdictGroup scope re-architecture | GAP | AMENDED | § 2.3 implementation-surface enumeration; § 4 R-E5 |

**Q-cycle estimate delta:** v0.1 18-26 → v0.2 16-24 (Phase G SLICE 1 collapses per F1; no other phase-letter changes).

**Memorial D state delta:** 20V/8C → 21V/8C (F1 + F2 classified as single sub-instance of 8th CONFIRMATION class per architect disposition; alternative two-sub-instance classification rejected; reasoning in § 6).

**No anti-scope-ledger updates needed at v0.2 emit.** Phase F / G commitments are not yet TAGGED in LEDGER; commitment lands in LEDGER post-John-disposition (clean-close path). Addition #26 D4 PRESERVED stance is implicitly reaffirmed at v0.2 via F2-α + A16; explicit LEDGER entry "Addition #26 D4 RECONFIRMED at v0.2 emit 2026-05-15" optional — architect recommends adding at Phase G close walk only if D4 has surfaced as a near-amendment-candidate in any intervening cycle.

---

_Memo v0.2 authored: 2026-05-15 (same-day amendment post-Reviewer-pass). Format: SCOPE-PROPOSAL (anchor `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity). Cross-references: v0.1 at `coordination/ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md`; Reviewer report at `coordination/REVIEWER-REPORT-fleet-mode-scoping-v0.1.md`. Routing target unchanged: TPM packages for John; John dispositions on Q-J1 through Q-J6._

_For full spec-emit (post-John-disposition clean-close): this v0.2 is the foundation for Phase F SLICE 1 spec drafting. Estimated lift v0.2 → SPEC ~0.5-1 architect Q-cycle of additional fidelity work (P1 inline derivations + P5 pseudo-code + per-file implementation surface + worked test-case round-trips). Phase F SLICE 1 spec-emit will invoke `superpowers:brainstorming` formally for the implementation-design layer (architect commitment per agreed sequencing with John 2026-05-15)._
