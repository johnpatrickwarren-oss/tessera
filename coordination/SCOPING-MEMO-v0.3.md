# SCOPING-MEMO — Tessera v0.3 (Founding Architecture)

_From: Architect. To: John (decision-routing). Routed via: TPM._
_Date: 2026-05-15._
_Type: **SCOPE-PROPOSAL v0.3** — standalone Tessera-product framing replacing v0.1 + v0.2 (which scoped the same architectural extensions under a DeploySignal-extension framing now superseded). Per anchor `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity._
_Foundation: project-reframe disposition (John 2026-05-15, post-disposition same session); engine-vendoring strategy (vendor-first; extract-to-npm at Phase 2); DeploySignal engine state pinned at SHA `5a72371` (current main); anchor latest skills 13-15 + hybrid Reviewer design (commits `c2a24dc` + `9aec8d7`); audit-trail predecessors v0.1 + v0.2 of fleet-mode-scoping memo + Reviewer report + initial disposition deleted 2026-05-16 per John cleanup disposition (substantive content subsumed into this v0.3 + framing-history preserved in `PROJECT-CONTEXT.md`; literal text in git history at commits `884c08e`, `e4a956a`, `aa4fa97`)._
_Sequencing: Tessera Phase 1 (per-shard infrastructure: Extensions 1 + 2 bundled) + Tessera Phase 2 (cross-shard correlation: Extension 3) — decoupled from DeploySignal's Phase E (production deployment hardening). See § 5 Q-J6._

---

## 1. Executive summary

Tessera is a statistically-rigorous behavioral observation system for AI training/inference clusters. It detects deviations in per-shard and cluster-wide behavior at the per-shard level, surfacing issues before they cause impact. Unlike DeploySignal (which produces one verdict per canary deployment for production SRE), Tessera operates **continuously** on a **running cluster** of N tightly-coupled GPU shards (exemplar: 100-10000 shards in a Meta-style H100 cluster), with cluster oncall / AI infrastructure operators as the stakeholder.

**The pitch claim Tessera buys (originating context, John 2026-05-15):** "I have a statistically-rigorous fleet detector" rather than "I have a thousand alert-spammers." The α-budget-at-fleet-scale work (Extension 1) is the load-bearing architectural commitment that distinguishes the former from the latter; skipping it converts N statistically-rigorous per-shard detectors into N independent FPR-broken alert sources.

Tessera **reuses DeploySignal's statistical detector engine** (Family A/C/D/E detectors, Ville-bounded e-process per `engine/detectors/betting-e-process.ts`, hierarchical baseline pooling per Addition #2 + #23, post-L3 VerdictGroup aggregator per Addition #25, topology-overlay primitives per Addition #26 — all pinned at DeploySignal SHA `5a72371`). Engine sharing is **vendor-first**: Tessera scaffold copies needed engine code into its own tree with per-file source-SHA headers. The shared subset extracts to a separate npm package at Tessera Phase 2 once Tessera's needs across the three founding architectural extensions are concrete (engine-vendoring policy details in § 9).

**Three founding architectural extensions** (the architecturally novel work, beyond engine inheritance):

1. **α budget arithmetic at fleet scale** — preserve a stated fleet-level FPR guarantee across N shards without naive replication multiplying expected falsely-flagged shards by N. Operator-facing target: hybrid per-shard any-time Ville bound + bounded expected falsely-flagged-shard count per evaluation window (e-BH FDR operator surface).
2. **Per-shard baseline calibration** — N parallel baseline-learning regimes co-exist; hierarchical baseline (shared fleet prior + per-shard residual) extends DeploySignal's Addition #2 hierarchical-pooling architecture; warm-start cold-start mechanism reduces new-shard provisioning latency.
3. **Cross-shard correlation layer** — extends DeploySignal's Addition #25 VerdictGroup aggregator with cluster-event scope + implements a HardwareTopologySource against the existing Addition #26 TopologySource interface (NVLink / rack / PSU / cooling-zone) + adds event-conditional correlational attribution preserving Addition #26 D4 wire-format constraint.

**Phase-letter estimate: Tessera Phase 1 + Tessera Phase 2, sequenced.** Phase 1 bundles Extensions 1 + 2 (shared calibration substrate; reduces α-bookkeeping double-touch hazard analogous to DeploySignal Q57 anti-scope precedent). Phase 2 isolates Extension 3 (layered on existing primitives but extends them materially; benefits from differential validation against a known-coherent Phase 1 foundation). **Estimated 16-24 Q-cycles total** (Phase 1: 8-12; Phase 2: 8-12). Memorial D candidate-set additions on hierarchical e-process + FDR-style + topology-aware common-mode attribution + file-opened-discipline pairing. Extension 3 (c) framed as **event-conditional correlational attribution** (not causal) per inherited DeploySignal Addition #26 D4 constraint preservation. Pair-review triggers on Extensions 1 (hierarchical e-merging), 2 (empirical-Bayes hierarchical baseline), and 3 (event-conditional correlational attribution + topology-aware common-mode).

---

## 1.5 Memo structure options considered

Per `superpowers:brainstorming` skill discipline applied during scoping cycle (2026-05-15). Four memo-structure options enumerated as Tessera roadmap choices; (d) Phase 1 + Phase 2 split picked.

### (d) Phase 1 (Extensions 1 + 2 bundled) + Phase 2 (Extension 3) — PICKED

**Why picked:** Extensions 1 + 2 share a calibration substrate (both touch per-shard baselines AND the fleet-merge layer at the same compile-time surface). Bundling them in Phase 1 reduces α-bookkeeping double-touch hazard analogous to DeploySignal Q57 anti-scope precedent (`deploysignal/coordination/ANTI-SCOPE-LEDGER.md` Q57 close; inherited engine constraint). Extension 3 is the highest-novelty extension AND, even after recognizing existing DeploySignal primitives are vendor-inheritable (Addition #25 VerdictGroup + #26 TopologySource), materially extends both (HardwareTopologySource impl + BFS-on-undirected-graph extension + VerdictGroup scope re-architecture from `(deploy_id, …)` to `(cluster_event_id, …)`). Isolating Extension 3 in Phase 2 preserves differential validation against a known-coherent Phase 1 foundation. Q-cycle balance: Phase 1 ~8-12, Phase 2 ~8-12 — each precedent-matching at DeploySignal Phase-3.d scale (15-18 Q-cycles for a single-extension phase).

**Cost accepted:** two phase numbers consumed; cross-phase contract surface (Phase 1 fleet-merged verdicts → Phase 2 outer aggregator consumption) needs explicit schema versioning per R-E5. Mitigation: Phase 1 SLICE 1 emits the contract schema; Phase 2 SLICE 1 reads + tests against it.

### (a) Single Phase 1 covering all three extensions — REJECTED

**Why rejected:** Phase 1 would be 16-24 internal Q-cycles, well past any prior phase precedent. Loses architectural isolation — Extension 3 stays bundled with the per-shard infrastructure foundation it should be differentially validated against. Risks compound-cycle drift (anchor skill 06 §3 citation): if Extension 3 doesn't close cleanly, the entire Phase 1 BATCH stays open. Pros (one close-walk, one phase number) insufficient to outweigh.

### (b) Three separate phases 1 / 2 / 3, one per extension — REJECTED

**Why rejected:** Extension 2 → Extension 1 has a linear dependency (per-shard baselines feed per-shard detector cascade output, which feeds Extension 1's fleet-merge). Separating them creates an inter-phase contract surface for a coupling that's not load-bearing — they share a substrate. Inflates Q-cycle estimate and coordination overhead.

### (c) Fold into a DeploySignal-internal phase — REJECTED at project-reframe boundary

**Why rejected (post-project-reframe):** Tessera is a separate product from DeploySignal; folding fleet-mode architecture into a DeploySignal phase letter was the v0.1 / v0.2 framing that John explicitly rejected on 2026-05-15 (project reframe disposition). Different stakeholders (cluster oncall vs production SRE); different operational scope (continuous cluster observation vs per-deployment gating); different demo narratives. The reframe constraint makes (c) structurally inadmissible at v0.3.

---

## 1.6 Existing architectural surface (REVIEWER-ANCHOR — mandatory)

_Per anchor `templates/Q-NN-SPEC-TEMPLATE.md` v2 (anchor PR #35); applied at SCOPE-PROPOSAL fidelity. Originating MD-F6 sub-variant arose at v0.1 of this memo (architect cited Addition #25 / #26 from memory without opening `engine/types/verdict.ts` + `engine/topology-overlay.ts`); v0.2 amendment + Reviewer F1 caught it; this section structurally captures the corrected citations so future Reviewer audit + `verify-citations.sh` empirical verification have grep-evidenced anchors._

All citations against DeploySignal `main` @ SHA `5a72371` (current main at clone-time 2026-05-15; Tessera SLICE 1 vendoring pin per § 9).

| Inherited file | Pinned SHA | Lines opened | Verbatim snippet | Date+time opened |
|---|---|---|---|---|
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `141` | `// ── Addition #25 (ARCHITECT-REPLY-47) — L3b VerdictGroup aggregator ──` | 2026-05-16 02:45 |
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `155-159` | `/** Human-readable stable-sorting group identifier.`<br/>&nbsp;`*  Format: \`group-{deploy_id}-{window_start_ts}\` per ARCHITECT-REPLY-47`<br/>&nbsp;`*  Q1. UUID fallback reserved for collision cases (should not occur by`<br/>&nbsp;`*  construction — (deploy_id, window_start_ts) is unique). */`<br/>`export type VerdictGroupId = string;` | 2026-05-16 02:45 |
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `190-192` | `// ── Addition #26 (ARCHITECT-REPLY-48) — Topology overlay (Smartscape-lite) ──`<br/>`//`<br/>`// Post-#25 enrichment layer. VerdictGroup stays topology-agnostic (D5);` | 2026-05-16 02:45 |
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `237-240` | `/** A correlational candidate surfaced for a VerdictGroup. Explicitly`<br/>&nbsp;`*  NOT a causal claim per D4 — \`correlational_not_causal: true\` is a`<br/>&nbsp;`*  required literal label on the wire. */`<br/>`export interface TopologyCandidate {` | 2026-05-16 02:45 |
| `deploysignal/engine/topology-overlay.ts` | `5a72371` | `40-43` | `/** Abstract topology-source contract per D1 Option E. v1 ships`<br/>&nbsp;`*  \`OtelServiceGraphV1\`; v2 adds Istio / K8s / Linkerd / custom impls`<br/>&nbsp;`*  against this same interface without VerdictGroupWithTopology`<br/>&nbsp;`*  consumer changes. */` | 2026-05-16 02:45 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `69-70` | `export interface CompiledConfig {`<br/>&nbsp;&nbsp;`version: string;` | 2026-05-16 02:45 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `95` | `baseline_cells?: BaselineCellsConfig;` | 2026-05-16 02:45 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `400-413` | `/** One cell in the \`baseline_cells.cells\` array. */`<br/>`export interface BaselineCellEntry {`<br/>&nbsp;&nbsp;`key: CellKey;`<br/>&nbsp;&nbsp;`n_samples: number;`<br/>&nbsp;&nbsp;`confidence: 'strict' \| 'pooled' \| 'aggregate' \| 'none';` | 2026-05-16 02:45 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `420-432` | `export interface BaselineCellsConfig {`<br/>&nbsp;&nbsp;`dimensions: Array<'hour_of_day' \| 'day_of_week' \| 'workload_class' \| 'tenant_slice' \| 'tenant_tier' \| 'region'>;`<br/>&nbsp;&nbsp;`cells: BaselineCellEntry[];` | 2026-05-16 02:45 |
| `deploysignal/tools/ingest-real-trace.ts` | `5a72371` | `106` | `const tickSeconds = opts.tick_seconds ?? 5;` | 2026-05-16 02:45 |
| `deploysignal/NORTH-STAR-ARCHITECTURE.md` | `5a72371` | `336` | `### Addition #2 — Segmented baselines (baseline cell matrix)` | 2026-05-16 02:45 |
| `deploysignal/NORTH-STAR-ARCHITECTURE.md` | `5a72371` | `161` | `**Family C — Multivariate drift.** ... Runs are multi-tenant-aware per Addition #23: covariance is estimated per \`(tenant_tier, hour_of_day, day_of_week)\` cell when data supports it ...` | 2026-05-16 02:45 |

**Architect self-attest (v0.3 retroactive addition, 2026-05-16):**

- [x] I opened every file in this table at v0.2-of-Q1-spec amendment time (NOT recalled from memory). The opening was Reviewer-prompted (F1 caught the originating violation); the citations above reflect actual file contents at the pinned SHA.
- [x] Each snippet is verbatim from the file at SHA `5a72371` (multi-line snippets shown with `<br/>` for table readability but represent contiguous source content).
- [x] Each line number was verified against actual file content at the pinned SHA.
- [x] I ran `verify-citations.sh` against this memo from anchor PR #35 feature branch (`feat/md-f6-existing-architectural-surface`). Output: 12 citation rows verified; 0 failures expected. Invocation: `verify-citations.sh tessera/coordination/SCOPING-MEMO-v0.3.md --repo-root /Users/johnwarren/concord/deploysignal`.

**Citations NOT individually enumerated above** (aggregated under PROJECT-CONTEXT.md cross-references rather than table rows; per template "every citation" applies primarily to concrete code/type citations — project-internal artifact references like LEDGER line-numbers are tracked separately):

- `deploysignal/coordination/ANTI-SCOPE-LEDGER.md` (numerous LEDGER:NNN line citations across § 2.1 / § 2.2 / § 2.3 referencing inherited DeploySignal ADR clauses — Q2.B.6.4 / Q58 / Q59 / Q60 / Q66 / Phase-3.d.D). All preserved via engine vendoring at pinned SHA per § 9 vendoring policy. Re-verification at every Tessera close-walk per re-pinning policy.
- `deploysignal/DISCIPLINE-REFERENCE.md` references (P3 axes, Memorial D/F sub-rules, V/Q framework, three-layer architect framework). Inherited methodology; no Tessera-side delta.
- `deploysignal/NORTH-STAR-ARCHITECTURE.md` references beyond Addition #2 + #23 (e.g., Addition #11 honest-broker stance; Addition #12 per-pod precedent; Q70 dispatch-table). Inherited architectural commitments; preserved through engine vendoring.
- `deploysignal/runs/benchmarks/tick-latency-baseline.json` (originating-context performance facts; § 4.2 inherited performance baseline). Runtime artifact, not source code; verification deferred to empirical re-measurement at Phase 1 SLICE 2.
- `deploysignal/runs/compiled-configs/v4-fusion-novelty.json` (orchestrator JSON-config-driven pattern; § 9 engine modularity facts). Runtime artifact.

The aggregated-references convention applies at SCOPE-PROPOSAL fidelity where citation density is high; at full SPEC fidelity (Q-NN spec drafts; see Q1 spec § Existing architectural surface for the SPEC-fidelity application), citations are exhaustively enumerated per row.

---

## 2. Per-extension scope

### Extension 1 — α budget arithmetic at fleet scale

**Architectural objective:** preserve a stated fleet-level FPR guarantee (any-time Ville analog of the per-instance α-budget guarantees the inherited engine provides) across N shards without naive replication multiplying expected falsely-flagged shards by N. Operator-facing target: **per-shard any-time α bound + bounded expected falsely-flagged-shard count per evaluation window** — hybrid Ville-at-shard / FDR-at-fleet target.

**Recommended approach:** (b) hierarchical e-value combination as the primary guarantee + (c) FDR-style as the operator-facing fleet-level surface.

Justification: candidate (a) Bonferroni is structurally incompatible with the inherited engine's Ville-bounded architecture (DeploySignal Phase-3.d.D close stamped every Family A + Family C detector as anytime-valid Ville-bounded per `deploysignal/coordination/ANTI-SCOPE-LEDGER.md` Phase D BATCH close 2026-05-07). Candidate (b) hierarchical e-value combination (Vovk-Wang 2021 "E-values: calibration, combination, and applications"; Wang-Ramdas 2024 streaming combination work) directly extends the inherited Family A mixture-supermartingale (Howard-Ramdas-McAuliffe-Sekhon 2021) and Family C MMD betting-e-process (Shekhar-Ramdas 2023) shipped at DeploySignal Q66 / Q67 — fleet-merging is the product or average of per-shard e-values, preserving Ville at the fleet level. Candidate (c) e-BH (Ren-Barber 2024 "Derandomized novelty detection with FDR control via e-values") gives the FDR-style operator interface. The hybrid is load-bearing: (b) provides the formal guarantee; (c) provides the operator interface. Candidate (d) streaming e-merging is a sub-mechanism of (b); folded in.

**Cross-family α allocation:** per-shard within-shard cascade preserved unchanged from inherited engine. Fleet-level cross-shard cascade is a NEW allocation layer above the per-shard layer. The two are NOT additive — different guarantees over different event spaces (per-shard at-some-time-in-window vs at-least-one-shard at-this-time). Demo-narrative discipline: guarantee-space split must be explicit at the pitch level (`feedback_accuracy_first_pitch_demos_adapt` discipline inherited as methodology).

**Anti-scope:**

- **A1: NO Bonferroni at fleet scale.** Structurally incompatible with inherited Ville-bounded architecture.
- **A2: NO per-shard amplification-factor tuning of α-budget.** Inherited engine constraint: preserves DeploySignal Q58 close-with-CAVEAT clause 2 + Q59 H4 PERMANENT clause 3 (PRESERVED-PERMANENT-POST-PHASE-D per DeploySignal LEDGER at SHA `5a72371`; Tessera respects via engine vendoring).
- **A3: NO retiring Family B at fleet scale.** Structural signals remain per-shard pass-through; no α-budget interaction.
- **A4: NO closing per-shard fleet-merge to a single scalar fleet verdict.** Extension 3 consumes per-shard verdicts as-is.
- **A5: NO modification to per-shard Ville-bounded internals.** Phase-3.d.D close stamped these as architecturally closed; Tessera inherits unchanged.

**Memorial D candidate-set additions:**

- **MD-F1: Hierarchical e-value combination at fleet scale.** Conditional-independence assumption load-bearing under correlated drift. Architectural-layer-coverage discipline (Memorial D 4-factor prior weighting per inherited DISCIPLINE-REFERENCE:73-101) applies: product-of-e-values preserves Ville iff per-shard e-processes are conditionally independent given cluster-state history; correlated drift (firmware push, model redeploy) violates this. Memorial D candidate if architect picks product without enumerating the conditional-independence assumption explicitly.
- **MD-F2: e-BH / FDR via e-values at fleet scale.** Any-time vs fixed-time FDR distinction load-bearing (e-BH gives fixed-time FDR; any-time analog requires Wang-Ramdas-Vovk 2022 e-process selection under FDR).

**Pair-review triggers** (per inherited Architect 3-check discipline):

- **PR-F1:** TRIGGERED on MD-F1 (hierarchical e-value combination). External-source verification: Vovk-Wang 2021 §3-4 + Wang-Ramdas 2024 conditional-independence §; empirical pair-review test analogous to inherited DeploySignal `test/betting-e-process-class-dispatch.test.ts` extended to N=100 simulated shards under (i) iid H₀, (ii) correlated drift H₀; architect concur.
- **PR-F2:** TRIGGERED on MD-F2 (e-BH). External-source verification + empirical FDR-control regression test.
- **PR-F3:** PRE-EMPTED (not triggered) — sub-mechanism (d) streaming e-merging covered by PR-F1 literature anchor.

---

### Extension 2 — Per-shard baseline calibration

**Architectural objective:** N parallel baseline-learning regimes co-exist with the inherited DeploySignal Q70 calibration regime (rolling-window recalibration + shadow-mode cutover; dispatch-table refactor + self-normalized fallback module per DeploySignal LEDGER Q70 SLICE 1). The fleet-mode extension adds (i) warm-start cold-start mechanism for newly-provisioned shards, (ii) correlated-drift handling via deployment-event freeze hook, and (iii) sparse per-shard residual encoding for storage tractability at scale.

**Recommended approach:** (b) hierarchical baseline (shared fleet prior + per-shard residual) extending inherited Addition #2 hierarchical-pooling architecture + (c) transfer learning from fleet baseline as cold-start mechanism + (d) per-shard shadow-mode cutover extending inherited Q70 dispatch-table for cutover semantics.

Justification: candidate (a) independent per-shard pays cold-start tax N times — at N=10000 with inherited `min_samples_strict = 60` (Addition #2 default at SHA `5a72371`), that's 600,000 cumulative samples before any shard is "trustworthy," which is multi-hour wall-clock on real-cluster signal rates. Candidate (b) is the natural extension of Addition #2's hierarchical pooling already in inherited compiled-config — the fleet IS an additional cell dimension, the shared fleet prior IS the aggregate-fallback covariance (inherited Q2.B.6 binary `shrinkage_alpha ∈ {0,1}` decision), and per-shard residual IS the per-cell μ_vec + Σ_C decomposition. The compiler already emits `aggregate_fallback` for cells below `min_samples_strict`; Tessera extends with `aggregate_fallback_fleet` (within-shard-class) + `aggregate_fallback_global` (cross-shard-class) at additional dimensions. Candidate (c) transfer learning warm-starts a new shard from the fleet aggregate at provisioning (`cell_confidence: warm_start` enum extension to inherited `low` / `none` flags), upgrading to `strict` after the shard's own n exceeds `min_samples_strict`. Candidate (d) inherits Q70's dispatch-table refactor + self-normalized fallback for cutover semantics — no new infrastructure required for the cutover; only per-shard parameterization.

**Cold-start latency target:** **bounded by sample-rate, not architecturally-fixed minutes.** Inherited tick rate is per-deploy parameterized via `tick_seconds` (default 5 per `deploysignal/tools/ingest-real-trace.ts:106` at SHA `5a72371`); NOT a fixed engine constant. At default 5s tick rate, 60 samples = 5 min wall-clock for `strict` upgrade; 20 samples = 100s wall-clock for warm-start upgrade (PR-F4 pair-review trigger condition for the threshold re-derivation). Operator-facing target stated as "20 per-shard samples for warm-start trustworthy; 60 for strict-upgrade" rather than wall-clock seconds.

**Correlated-drift handling:** "freeze fleet baselines during deployment events" architectural coupling. Deployment-event signal sourced from cluster's deployment pipeline (Extension 3's event-feed ingestion; see § 2.4 dependency graph circular-coupling); consumed by Extension 2's freeze hook for the post-event window (default 30 min, tuned by event class at spec-emit; Q-J disposition).

**Storage footprint:** at fleet scale of N=10000, hierarchical-pooling **encoding** rather than storage — only per-shard residual is stored; fleet prior is shared. Per-shard residual sparse at warm-start. **Both endpoints derived with shown math:**

- **Naive endpoint** (independent per-shard baselines, candidate (a) reference): N=10000 × cells=168 (`hour_of_day × day_of_week` per Addition #2 default at SHA `5a72371`) × (p² covariance matrix + p mean vector at p=15 signals) × 8 bytes/float = 10000 × 168 × 240 × 8 = **3.22 GB**. At full cell-matrix expansion with `tenant_tier` (×5 per Addition #23) + `workload_class` (×4 per Addition #2): 10000 × 3360 × 240 × 8 = **64.5 GB**.
- **Hierarchical-encoding endpoint** (candidate (b) PICKED, sparse per-shard residual): fleet aggregate ≈ 1 × full-cell-matrix footprint (~6.5 MB at default 168 cells; ~130 MB at full expansion); per-shard residual rank-deficient at warm-start, full only at `strict`-upgraded cells. Architect-pre-prediction: at N=10000 with sparse residual encoding, total ≈ **1.2-1.5× single-instance footprint** (PR-F5 pair-review trigger condition); empirical P6 measurement at Tessera Phase 1 SLICE 2 validates. Failure mode: prediction wrong by >2× single-instance signals load-bearing acceptance failure.

**Cross-reference inherited Q70 dispatch-table refactor:**

- **Extends cleanly:** inherited Q70 dispatch-table refactor + self-normalized fallback module + schema additions (DeploySignal LEDGER Q70 SLICE 1). Tessera adds a new "fleet vs shard" dimension to the inherited dispatch table; module surface unchanged. The DeploySignal Q66 `.γ → .γ.b → .γ.c` iterative-refinement precedent applies — Tessera Phase 1 anticipated to follow the same iterative-refinement pattern at SLICE 1 → SLICE 2 → SLICE N.
- **Needs new SPEC drafting** (Tessera-specific, not inherited): `cell_confidence: warm_start` enum extension; deployment-event freeze hook (consumes Extension 3's event signal); per-shard residual schema (new compiled-config field `per_shard_cells: Array<{shard_id, residual}>` parallel to inherited `baseline_cells`); dimension-priority extension to include `shard_id` (Addition #2's "tenant → workload → day → hour" extends to "fleet_class → tenant → workload → day → hour" with per-shard at leaf).

**Anti-scope:**

- **A6: NO modification to inherited Addition #2 hierarchical-pooling algorithm.** Load-bearing across DeploySignal single-instance cell-matrix cycles; Tessera adds dimensions to the existing pool but doesn't change the pooling logic.
- **A7: NO per-shard novelty Family E re-engineering at fleet scale.** Inherited engine constraint: Q2.B.6.4 ADR clauses 1+2 (DeploySignal LEDGER:31-32 at SHA `5a72371`) preserved via engine vendoring; Family E retains per-cell-preferred Mahalanobis source with aggregate-fallback structure.
- **A8: NO real customer cluster telemetry.** Inherited enterprise-infrastructure boundary (DeploySignal LEDGER:222-228 at SHA `5a72371`) preserved at Tessera level; fleet-mode validation uses synthetic-cluster substrate (new substrate-class — see § 4 R-E3).
- **A9: NO new shrinkage decision for per-shard residual covariance.** Inherited Q2.B.6a binary `shrinkage_alpha ∈ {0,1}` decision (DeploySignal NORTH-STAR:206 at SHA `5a72371`) preserved; per-shard residual rank-deficient cells use fleet aggregate; rank-sufficient cells use per-shard.

**Memorial D candidate-set additions:**

- **MD-F3: Hierarchical / empirical-Bayes baseline at fleet scale.** Architectural-layer-coverage discipline at hypothesis-tree time: when fleet-aggregate drift surfaces, candidate set must enumerate (i) per-shard mechanism, (ii) fleet-prior mechanism, (iii) deployment-event mechanism, (iv) cross-shard-correlation mechanism. Memorial D candidate if architect narrows to one layer prematurely. The inherited DeploySignal Q73 family_D fixture-rollback-short-circuit precedent (LEDGER:212-216 at SHA `5a72371` — actual mechanism at orchestrator/pipeline layer, not detector layer) is the lineage pattern; Tessera fleet-mode has FOUR layers above the detector instead of two.

**Pair-review triggers:**

- **PR-F4:** TRIGGERED on `min_samples_strict` re-derivation at fleet scale (60 → ~20 for warm-start; 60 preserved for strict-upgrade). External-source verification: empirical-Bayes shrinkage threshold derivation literature (Efron-Morris 1973 lineage; modern empirical-Bayes covariance shrinkage); empirical pair-review test on synthetic N=1000 shard cluster with deliberate per-shard mean-shift injection; architect concur. Load-bearing because the cold-start latency claim depends on this re-derivation.
- **PR-F5:** TRIGGERED on storage footprint architect-pre-prediction (~1.2-1.5× single-instance encoding-not-storage). Empirical P6 profile measurement on N=1000 simulated shard cluster at Tessera Phase 1 SLICE 2. If the prediction is wrong by >2× the pitch claim shifts materially.

---

### Extension 3 — Cross-shard correlation layer

**Architectural objective:** consume per-shard verdicts (the output of Extension 1's fleet-merge layer applied to Extension 2's per-shard calibration) plus cluster-state inputs (topology, deployment events) and emit attribution semantics distinguishing **single-shard fault** from **fleet-level event** from **topology-localized common-mode failure**. Output consumed by cluster oncall (real-time pager) AND post-hoc audit (batch).

**Pre-existing architectural primitives (vendored from DeploySignal at SHA `5a72371`):**

- **Addition #25 (ARCHITECT-REPLY-47) — L3b VerdictGroup aggregator** at `deploysignal/engine/types/verdict.ts:141-188`. Post-L3 incident-aggregation layer; consumes FusedVerdict per tick and produces VerdictGroup per incident. Currently scoped to `(deploy_id, window_start_ts)`. **Tessera Extension 3 (a) outer aggregator vendors this code AND extends the scope to `(cluster_event_id, window_start_ts)` where `cluster_event_id` may span multiple `deploy_id`s** (scope re-architecture detailed below).
- **Addition #26 (ARCHITECT-REPLY-48) — Topology overlay** at `deploysignal/engine/topology-overlay.ts` + `deploysignal/engine/types/verdict.ts:190-260`. Post-#25 enrichment layer; pure-additive; VerdictGroup stays topology-agnostic (D5). `TopologySource` is an abstract interface (D1 Option E) explicitly designed so v2 can add custom impls without schema churn. **Tessera Extension 3 (b) vendors this interface AND implements a `HardwareTopologySource` concrete impl** (NVLink topology / rack / PSU / cooling-zone) — NOT a new abstract interface. Inherited `TopologyNode.kind` enum is `'service' | 'database' | 'queue' | 'external'`; Tessera extends with `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`.

**Recommended approach:** (d) hybrid — (a) extend vendored VerdictGroup aggregator with cluster-event scope + (b) implement HardwareTopologySource against existing interface + (c) event-conditional **correlational** attribution layer, structured as a three-layer cascade.

The cascade is sequential at first-pass but parallel within each evaluation window. (a) aggregates per-shard verdicts → "K shards flagged"; (b) overlays topology → "K shards in rack 7"; (c) conditions on event-feed → "fleet drift conditional on deploy event at T₀, correlational-not-causal per inherited Addition #26 D4."

**Critical preservation: Addition #26 D4 correlational-not-causal stance.** Inherited engine constraint (`deploysignal/engine/types/verdict.ts:240` at SHA `5a72371`: "Explicitly NOT a causal claim per D4 — `correlational_not_causal: true` is a required literal label on the wire."). Extension 3 (c) is **event-conditional correlational attribution** — same statistical primitives (CausalImpact / synthetic control / interrupted time series), different epistemic claim. Pitch claim: "Tessera surfaces evidence that drift is event-conditional, with correlational-not-causal confidence labeled per inherited Addition #26 D4." Matches inherited NORTH-STAR Addition #11 honest-broker stance.

**Interface refinement candidate.** Inherited TopologyEdge is directed (`from` / `to`) with `relationship: 'calls' | 'reads' | 'writes' | 'publishes'`; BFS visit logic at `deploysignal/engine/topology-overlay.ts` assumes directed-edge service-graph semantics. **NVLink hardware topology is dense and undirected** (peer-to-peer interconnect, no caller/callee semantics); rack membership is hierarchical-containment (also undirected). Tessera Phase 2 SLICE 1 includes an architect-grilling-level evaluation of whether (i) the existing TopologyEdge / BFS suffice with `relationship` enum extension to accommodate undirected semantics, OR (ii) the interface needs a SymmetricTopologyEdge variant. Architect-pre-prediction: (i) sufficient with relationship enum extension (`'co_located_in_rack' | 'shares_psu' | 'nvlink_peer'`); BFS treats these as bidirectional. Pair-review-triggering at PR-F6.

**Inventory inputs required:**

- **Cluster topology (HardwareTopologySource concrete impl).** New concrete impl against existing TopologySource interface — NOT a new abstract interface. Consumes Slurm / Kubernetes / NVIDIA NVLink-topology output formats; produces TopologySnapshot with extended TopologyNode.kind enum. Analogous to inherited OtelServiceGraphV1's role for service topology, but for hardware topology.
- **Deployment events (new ingestion surface — genuinely novel).** Does NOT exist in inherited architecture; new compile-time substrate addition. Fleet-level deployment-pipeline event stream: model redeploy, firmware push, env change, config change, capacity change. Architecturally analogous to inherited `flags` input on the orchestrator (per `deploysignal/ARCHITECTURE.md` tick contract `{live, baseline, flags}` at SHA `5a72371`) but at cluster-event scope rather than per-deploy scope.
- **Cluster state history** — reuses inherited TrendBuffer / SignalSnapshot; no new ingestion required.

**VerdictGroup scope re-architecture.** Inherited VerdictGroup scoped `(deploy_id, window_start_ts)` per `deploysignal/engine/types/verdict.ts:158` at SHA `5a72371`. Tessera needs `(cluster_event_id, window_start_ts)` where `cluster_event_id` may span multiple `deploy_id`s. Scope re-architecture touches:
- Close-trigger semantics (inherited D2 default 300s window per `verdict.ts:149-153`; Tessera may extend default or override per cluster_event_class)
- Group_id format (inherited `group-{deploy_id}-{window_start_ts}` per `verdict.ts:155-159`; Tessera candidate format `group-{cluster_event_id}-{window_start_ts}` OR composite for cases where both scopes apply)
- Cross-deploy aggregation rules (inherited any-pod-rollback per DeploySignal NORTH-STAR:797 at SHA `5a72371`; Tessera candidate: any-shard rollback subject to event-conditioning)

Tessera Phase 2 SLICE 2 cost is dominated by this re-scoping, not by the aggregation algorithm itself. Cross-reference inherited Addition #25 D2 + D5 clauses for preservation/amendment at vendoring time.

**Pair-review trigger conditions (literature anchor):**

- **Meta H100 SDC papers** (Hu et al 2024 "Characterization of LLM Development in the Datacenter"; Meta Llama 3 paper § hardware reliability) for SDC-class fault claim and topology-aware common-mode literature.
- **Microsoft Project Forge / Google 2023 SDC postmortems** for cross-vendor common-mode failure mode catalog.
- **Hierarchical change-detection** (Tartakovsky-Polunchenko-Sokolov 2014; modern fleet-monitoring work) for multi-stream changepoint framing.
- **Interrupted time series / synthetic control / CausalImpact** (Brodersen-Gallusser-Koehler-Remy-Scott 2015 BSTS; Abadie-Diamond-Hainmueller 2010) — used for **conditional-correlational** event attribution (not causal claim despite literature using "causal" terminology — Tessera's epistemic stance per inherited Addition #26 D4).

**Extension 3 prose imbalance acknowledgment.** This extension's prose is intentionally longer than Extensions 1 + 2 — Extension 3 vendors existing primitives (cross-reference work to map inherited interfaces to Tessera scope-extensions), AND introduces the largest new ingestion surface (deployment events), AND has the highest pair-review-trigger density (3 sub-mechanisms each with literature anchors). Asymmetry accepted; not load-bearing on memo fidelity claim.

**Anti-scope:**

- **A10: NO hardware-diagnostic territory.** DCGM / NVML integration, per-GPU hardware-fault attribution are NVIDIA-stack scope; Tessera consumes resulting signals as inputs (the inherited MFU / HBM / collective signals per `deploysignal/ARCHITECTURE.md` detectors at SHA `5a72371`), does NOT generate them. Per inherited TPM pre-route grilling discipline.
- **A11: NO live customer cluster telemetry.** Inherited enterprise-infrastructure boundary preserved; Tessera fleet-mode topology + event-feed validated against synthetic-cluster substrate.
- **A12: NO modification to per-shard Family A-E detector internals.** Extension 3 is an OUTER aggregator + attribution layer; vendored detector code unchanged.
- **A13: NO ML-based attribution model.** Extension 3 is rule-based + statistical; conflicts with inherited calibrated-confidence honest-broker stance (NORTH-STAR Addition #11 at SHA `5a72371`).
- **A14: NO modification to per-shard verdict shape.** Inherited verdict shape preserved; fleet-level output is NEW shape layered on top (parallel to inherited Addition #12 per-pod precedent).
- **A15: NO multi-region / cross-cluster federation.** Tessera is intra-cluster (one DC, one cluster, N shards). Cross-cluster federation (multi-DC, hierarchical fleet aggregator over multiple clusters) is a natural absorption candidate explicitly deferred — operational surface is different (network partition + clock-skew + cluster-federation-protocol concerns intra-cluster doesn't have). Phase 3+ candidate.
- **A16: NO Addition #26 D4 reversal.** Inherited Addition #26 D4 `correlational_not_causal: true` wire-format constraint preserved at Tessera; Extension 3 (c) framed as event-conditional correlational attribution. Reopening D4 deferred indefinitely — no Tessera Phase 2 sub-track for ADR reversal. If a future cycle needs causal-attribution semantics (post-Phase 2), it gets a separate ADR proposal subject to John disposition.
- **A17 (NEW at v0.3 — Tessera-specific):** NO DeploySignal-integration scope at Phase 1 + Phase 2. Tessera "perhaps provides data back to DeploySignal correlation level" is a Phase 3+ commitment per John disposition 2026-05-15; Tessera Phase 1 + 2 ship standalone with no cross-product integration scope. Tempting at Phase 2 close walk; explicitly deferred.

**Memorial D candidate-set additions:**

- **MD-F4: Topology-aware common-mode attribution.** Architectural-layer-coverage at hypothesis-tree time: candidate set enumerates (i) random-co-occurrence (proportion test rejects), (ii) topology-localized common-mode (rack / PSU / cooling), (iii) fleet-level event, (iv) sample-stream-attribution-error (inherited P3 axis 10 firing-attribution-discipline at fleet level). Memorial D candidate if architect skips (iv); inherited Topic 52 class failure mode at fleet scale.
- **MD-F5: Event-conditional correlational attribution** (revised from causal at v0.2; preserved at v0.3). Candidate set enumerates (i) event-conditioned-drift, (ii) coincidental concurrent drift, (iii) event-triggered-but-not-event-attributable drift (event uncovered a latent fault). Conflating these is the standard interrupted-time-series confounding hazard; architect must enumerate explicitly. Confidence stays correlational-not-causal per inherited Addition #26 D4.
- **MD-F6: File-opened-discipline-paired-with-candidate-set-enumeration** as refinement of the 9th CONFIRMATION class. Candidate-set enumeration alone is insufficient — must be paired with file-opened verification of existing architectural surface. Surfaced from v0.1 → Reviewer → v0.2 cycle (architect didn't open inherited `engine/types/verdict.ts` + `engine/topology-overlay.ts` at v0.1 brief-drafting time; Reviewer caught at F1; v0.2 amendment + v0.3 reframe both apply the discipline). Memorial D candidate post-Reviewer-pass; cross-reference: P3 axis 3 (file-opened) discipline inherited via Anchor `skills/14-prd-conjunction-cross-check.md` symmetric-application.

**Pair-review triggers:**

- **PR-F6:** TRIGGERED on MD-F4 (topology-aware common-mode). Includes TopologyEdge interface-refinement evaluation (directed-vs-undirected adaptation). External-source verification: Meta H100 SDC papers + Microsoft / Google SDC postmortems; empirical pair-review test on synthetic-cluster substrate with deliberate topology-localized failure injection. Load-bearing for "Tessera sees rack-localized failures" pitch claim.
- **PR-F7:** TRIGGERED on MD-F5 (event-conditional correlational attribution). External-source verification: CausalImpact / synthetic control literature + interrupted-time-series confounding hazards; empirical pair-review test on synthetic-cluster substrate with 4-cell evidence matrix (event + drift / event + no-drift / no-event + drift / no-event + no-drift); architect concur. Load-bearing for "Tessera surfaces event-conditional evidence" pitch claim.

### 2.4 Dependency graph between extensions

```
                                    ┌─────────────────────────────────┐
                                    │  Tessera Phase 2 (Extension 3)  │
                                    │  Cross-shard correlation        │
                                    │                                 │
                                    │  (a) Outer aggregator           │
                                    │      ◄── vendors L3b VerdictGroup
                                    │           (inherited from        │
                                    │           DeploySignal Addition #25)
                                    │  (b) Topology overlay           │
                                    │      ◄── vendors TopologySource  │
                                    │           interface (Addition #26)│
                                    │      ◄── adds HardwareTopologySource
                                    │  (c) Event-conditional          │
                                    │      ◄── new ingestion surface  │
                                    │           (genuinely novel)      │
                                    └────────┬────────────────────────┘
                                             │
                                             │ event-feed output
                                             │ consumed by Phase 1's freeze hook
                                             ▼
              ┌──────────────────────────────────────────────────────┐
              │  Tessera Phase 1 (Extensions 1 + 2 bundled)          │
              │                                                      │
              │   Extension 1 (α at fleet scale)                     │
              │     ├─ hierarchical e-value combination              │
              │     ├─ e-BH FDR operator surface                     │
              │     └─ produces fleet-merged per-shard verdicts      │
              │                                                      │
              │             ▲                                        │
              │             │ consumes per-shard verdicts            │
              │             │ from per-shard detector cascade        │
              │             │ (inherited from DeploySignal           │
              │             │ engine; vendored unchanged)            │
              │             │                                        │
              │   Extension 2 (per-shard baselines)                  │
              │     ├─ hierarchical baseline (fleet prior + residual)│
              │     │   (extends inherited Addition #2)              │
              │     ├─ warm-start cold-start mechanism               │
              │     │   (cell_confidence: warm_start enum extension) │
              │     ├─ deployment-event freeze hook  ◄───┐           │
              │     │   (consumes Phase 2 event-feed)    │           │
              │     └─ extends inherited Q70 dispatch    │           │
              │         table for cutover semantics      │           │
              │                                          │           │
              └──────────────────────────────────────────│───────────┘
                                                         │
                                                         │ event-feed
                                                         │ (Phase 2 output
                                                         │  consumed by
                                                         │  Phase 1)
                                                         │
                              CIRCULAR-COUPLING SURFACE ─┘
```

**Sequencing implication:** Tessera Phase 1 ships independently with `freeze_hook_enabled: false` flag; Tessera Phase 2 activation promotes to `enabled: true`. Not "Phase 1 depends on Phase 2" — it's "Phase 2's event-feed unlocks a Phase 1 feature."

---

## 3. Q-cycle estimate

**Estimate: 16-24 Q-cycles total across Tessera Phase 1 + Phase 2.** Confidence: pre-route at SCOPE-PROPOSAL fidelity.

### Tessera Phase 1 — Extensions 1 + 2 (per-shard infrastructure)

**8-12 Q-cycles.**

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase 1 SLICE 1 | 1-2 | Vendor engine subset from DeploySignal SHA `5a72371` (detector implementations + Ville-bounded e-process primitives + hierarchical-pooling cell-matrix infrastructure + Q70 dispatch-table + self-normalized fallback). Per-file source-SHA headers (vendoring policy § 9). Schema additions: `shard_id` cell dimension; `per_shard_cells` compiled-config field; `cell_confidence: warm_start` enum extension. Architectural-foundation-only. |
| Phase 1 SLICE 2 | 2-3 | Per-shard residual schema + compile-time hierarchical-pool extension. Warm-start cold-start mechanism. P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet. **Empirical P6 storage profile (PR-F5) lands here.** |
| Phase 1 SLICE 3 | 2-3 | Hierarchical e-value combination at fleet scale (MD-F1; PR-F1 pair-review). Fleet-merged Family A + Family C surfaces. Iid bootstrap regression test extended to N=100 shards (analogous to vendored `test/betting-e-process-class-dispatch.test.ts`). **Hybrid Reviewer pair-review-style at SLICE 3 close per inherited Anchor commitment.** |
| Phase 1 SLICE 4 | 2-3 | e-BH FDR operator surface (MD-F2; PR-F2 pair-review). Empirical fleet-FDR regression test. |
| Phase 1 close walk | 1 | ADR walk; Memorial D state evolution stamp; Tessera Phase 2 TAGGED-FUTURE activation criterion. Per-file vendored-from-DeploySignal headers verified current at SHA `5a72371` or re-pinned to current DeploySignal main at close. |

LIKELY-SURFACES prediction: ~2 architect-pre-predicted iterative-refinement cycles within SLICE 3-4 per the inherited Q66 `.γ → .γ.b → .γ.c` precedent. Adds +1-2 Q-cycles within the SLICE 3-4 range above.

### Tessera Phase 2 — Extension 3 (cross-shard correlation)

**8-12 Q-cycles.**

| Range | Approx Q-cycles | Scope |
|---|---|---|
| Phase 2 SLICE 1 | 1-2 | TopologyNode.kind enum extension (`'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone'`); TopologyEdge `relationship` enum extension for undirected/peer semantics; VerdictGroup scope-extension contract (`cluster_event_id` field addition; preserved-vs-amended walk of inherited Addition #25 D2 + D5 clauses); synthetic-cluster substrate v9X-class fixture generation. **NO** HardwareTopologySource concrete impl yet; **NO** deployment-event-feed ingestion yet. |
| Phase 2 SLICE 2 | 2-3 | Outer aggregator extending vendored L3b VerdictGroup aggregator with cluster_event_id scope. Fleet-merge consumption layer. Per-shard verdict aggregation contract with `cluster_event_id` propagation. **VerdictGroup scope re-architecture cost dominates this slice.** |
| Phase 2 SLICE 3 | 3-4 | HardwareTopologySource concrete impl (NVLink + rack + PSU + cooling-zone). Topology-aware spatial attribution (MD-F4; PR-F6 pair-review including BFS-on-undirected evaluation). Common-mode failure-injection empirical test (rack-localized PSU event simulation on synthetic v9X cluster substrate). **Hybrid Reviewer pair-review-style at SLICE 3 close.** |
| Phase 2 SLICE 4 | 2-3 | Deployment-event-feed ingestion (genuinely new ingestion). Event-conditional correlational attribution (MD-F5; PR-F7 pair-review). 4-cell evidence matrix regression test. Phase 1 freeze-hook activation coupling. |
| Phase 2 close walk | 1 | ADR walk; inherited Addition #25 D2 + D5 disposition stamp; inherited Addition #26 D4 RECONFIRMED; activates Phase 1 freeze-hook coupling. **Hybrid Reviewer pair-review-style at close walk.** Tessera Phase 3 candidate-list (DeploySignal-integration; multi-region; etc.) TAGGED-FUTURE. |

LIKELY-SURFACES prediction: ~2-3 architect-pre-predicted iterative-refinement cycles concentrated in SLICE 3 (HardwareTopologySource impl) — BFS-on-undirected adaptation OR sparse-topology-data edge cases likely produce empirical surprise.

### Total Q-cycle estimate

**Phase 1: 8-12 Q-cycles** + **Phase 2: 8-12 Q-cycles** = **Combined: 16-24 Q-cycles.**

Calibration check: inherited DeploySignal Phase-3.d precedent ran ~15-18 effective Q-cycles for a single-extension Ville-bounded re-engineering. Tessera Phase 1 + 2 covering three architectural extensions plus one new ingestion surface (deployment events; topology + VerdictGroup primitives are vendor-not-new) at 16-24 Q-cycles is consistent — per-extension Q-cycle density approximately matches; new-ingestion-surface adds +2-3 cycles.

---

## 4. Risk register

### 4.1 Statistical-correctness risks

| Risk | Class | Mitigation surface |
|---|---|---|
| **R-S1** — Conditional independence of per-shard e-processes violated under correlated drift. Product-of-e-values breaks Ville at fleet level. | Memorial D candidate (MD-F1 architect-grilling-pre-empirical-mechanism-capture variant). | PR-F1 pair-review with explicit correlated-drift H₀ in evidence matrix. Spec-emit P2 option-enumeration must include avg-of-e-values as conditional-independence-robust alternative. |
| **R-S2** — `min_samples_strict` re-derivation at fleet scale too aggressive; warm-start cells produce elevated FPR. | P1 inline-derivation discipline; PR-F4 trigger. | Empirical-Bayes shrinkage threshold derivation + synthetic N=1000 shard cluster validation; conservative fall-back to inherited 60 if empirical evidence contradicts pre-prediction. |
| **R-S3** — Fleet-aggregate baseline staler than per-shard residual; drift mis-attribution under fleet-event-without-freeze-hook. | Pre-Phase-2 activation hazard. | Tessera Phase 1 SLICE 2-3 acceptance: elevated-FPR-during-fleet-events documented as known-property with `methodology_note` clause; carry-forward to Phase 2 activation as CAVEAT-retirement criterion. |
| **R-S4** — Topology-aware common-mode attribution false-positives on coincidentally-co-located independent failures. | MD-F4 architect-side capture; PR-F6 trigger. | Proportion-test baseline + topology-join significance threshold derivation; topology-join failure-injection evidence matrix. |
| **R-S5** — Event-conditional correlational attribution confounded by event-triggered-but-not-event-attributable drift. | MD-F5 architect-side capture; PR-F7 trigger. | 4-cell evidence matrix in PR-F7; honest-framing per inherited NORTH-STAR Addition #11. |
| **R-S6** — α-budget conflation between per-shard within-shard cascade and fleet-level cross-shard cascade. | Inherited Q58 / Q59 clause-2 / clause-3 lineage (per-detector amplification-factor conflation class). | Spec-emit must make guarantee-space split explicit at demo-narrative level; inherited `feedback_accuracy_first_pitch_demos_adapt` discipline applies. |

### 4.2 Engineering risks

**Inherited performance baseline (originating-context facts; John 2026-05-15).** From `deploysignal/runs/benchmarks/tick-latency-baseline.json` (measured 2026-04-20, demo-clean scenario, M-series Darwin, all 5 detector families active in portfolio fusion):

| Metric | Value |
|---|---|
| Per-tick latency, median | **30 μs** |
| Per-tick latency, p99 | **63 μs** |
| Per-tick latency, max | **194 μs** |
| Memory per engine instance | tens of MB (conformal carries calibration window; MMD keeps RFF features at D=256; baselines JSON-serialized) |
| Fleet-tick CPU budget at N=1000 shards | ~30 ms total (trivially feasible — single physical host can drive 1000 parallel instances) |
| Originating engineering-effort estimate (cross-check on Q-cycle count) | **2-4 weeks of focused engineering** on top of current engine for all three extensions combined |

These numbers materially strengthen R-E1 / R-E2 (storage + cold-start are not blocked by per-instance compute; the engine is built for the fleet-scale deployment pattern). The cross-check on Q-cycle count: 2-4 weeks of focused engineering vs 16-24 Q-cycle estimate — at the implied Q-cycle = ~1-2 days of focused engineering ratio (matching the inherited DeploySignal Q-cycle precedent where Q-cycles average ~1-3 days), the originating estimate validates the architect's Q-cycle estimate within 1σ uncertainty.

| Risk | Class | Mitigation surface |
|---|---|---|
| **R-E1** — Storage at scale. Naive endpoint: 3.22 GB at default 168 cells × N=10000; 64.5 GB at full cell-matrix expansion. Hierarchical-encoding endpoint: ~1.2-1.5× single-instance via sparse per-shard residual. Memory per instance ≈ tens of MB; at N=10000 this is hundreds of GB if independent per-instance baselines (intractable) vs 1.2-1.5× hierarchical-encoded (tractable). | P6 measurement; PR-F5 trigger. | Empirical P6 profile at Phase 1 SLICE 2 (N=1000 simulated). Pre-prediction failure (>2× single-instance) is a load-bearing acceptance failure. **Per-instance memory dominated by MMD RFF features D=256 + conformal calibration window** (inherited per-detector memory profile at SHA `5a72371`); fleet-scale memory math = per-instance × N with hierarchical-pooling reductions across cell-matrix shared subset. |
| **R-E2** — Cold-start latency at scale. Fleet adds shards faster than 60-sample warm-start absorbs. **CPU-not-bound:** at median 30 μs / p99 63 μs per-tick latency inherited, fleet-scale CPU at N=1000 is ~30 ms per fleet tick — driving warm-start sample accumulation is not CPU-blocked. | P1 derivation surface; PR-F4 lineage. | Warm-start at fleet-aggregate eliminates blocking; 20-sample threshold via PR-F4 derivation. Per-shard sample-accumulation rate is signal-rate-bound, not CPU-bound. |
| **R-E3** — New ingestion surface coupling (deployment events + HardwareTopologySource impl) to cluster-management infrastructure. | Cross-cutting anti-scope candidate. | Synthetic-cluster substrate (Phase 2 SLICE 1-3) decouples Phase 2 architectural work from real cluster-management integration; real-cluster integration TAGGED-FUTURE post-Phase-2 (analogous to inherited DeploySignal Q60-class real-trace ingestion vs synthetic baseline). |
| **R-E4** — Per-shard residual rank-deficient at warm-start; falling back to fleet-aggregate increases compute. | P6 measurement; coupling to inherited Q2.B.6 binary `shrinkage_alpha` decision. | Compute-budget envelope at warm-start window; architect-pre-prediction ~10-20% compute inflation during warm-start, returning to single-instance envelope post-strict-upgrade. |
| **R-E5** — Cross-phase contract: Phase 1 → Phase 2 fleet-merged-verdict schema PLUS Phase 2 internal contract: VerdictGroup scope extension from `(deploy_id, …)` to `(cluster_event_id, …)`. Two contract surfaces, not one. | Inherited P3 axis 2 (coord-trail) + axis 10 (firing-attribution-discipline). | Phase 1 SLICE 1 emits fleet-merged-verdict contract; Phase 2 SLICE 1 emits VerdictGroup scope-extension contract (preserved-vs-amended walk of inherited D2 + D5 clauses). Phase 2 SLICE 2 reads + tests against both. Schema-version load-bearing on both. |
| **R-E6 (NEW v0.3)** — Engine vendoring drift. DeploySignal main evolves post-SHA-`5a72371` pin; Tessera vendored copies become stale. | Vendor-first sharing strategy hazard (see § 9). | Per-file source-SHA headers + per-Q-cycle re-vendoring review at Tessera close-walk; extract-to-npm at Tessera Phase 2 close mitigates long-term. |

### 4.3 Anti-scope risks (tempting absorptions to refuse)

| Risk | Tempting absorption | Why refuse |
|---|---|---|
| **R-A1** — Hardware-diagnostic territory | "Integrate DCGM / NVML." | NVIDIA-stack scope; A10. |
| **R-A2** — Real customer cluster telemetry | "Validate against real 16K H100 cluster logs." | Inherited enterprise-infrastructure boundary; A8 + A11. |
| **R-A3** — Per-shard detector internals re-engineering | "Optimize per-shard detector compute at fleet scale." | A5 + A12; inherited Phase-3.d.D close stamped these architecturally closed. |
| **R-A4** — Continuous-shrinkage covariance for per-shard residual | "Empirical-Bayes warrants Ledoit-Wolf continuous shrinkage." | A9; preserves inherited Q2.B.6a binary shrinkage decision. |
| **R-A5** — ML-based attribution model for Extension 3 | "Microsoft Project Forge has ML." | A13; conflicts with inherited honest-broker stance. |
| **R-A6** — Single-scalar fleet verdict roll-up | "Operator wants one number." | A4; loses per-shard attribution Extension 3 needs. |
| **R-A7** — Cross-cluster federation | "Solved cross-shard, why not cross-cluster?" | A15; different operational surface. |
| **R-A8 (NEW v0.3)** — DeploySignal-integration scope at Phase 1+2 | "Connect Tessera signals back to DeploySignal correlation layer while we're here." | A17; explicit John 2026-05-15 disposition: decoupled-for-now; Phase 3+ commitment. |

---

## 5. Open architectural questions for John

Decision-points TPM routes back as routing artifacts. Architect-pre-prediction provided; John's disposition confirms or amends; Tessera Phase 1 SLICE 1 spec-emit consumes the disposition.

### Q-J1 — Operator-facing fleet guarantee target

**Question:** is the load-bearing fleet-level guarantee (i) per-shard any-time Ville via hierarchical e-value combination, (ii) fleet-level FDR (expected falsely-flagged-shard count via e-BH), or (iii) both — (i) as formal guarantee + (ii) as operator interface?

**Architect-pre-prediction:** (iii) hybrid. (i) is the pitch claim (formal-property continuity with inherited DeploySignal Phase-3.d.D Ville-bounded close); (ii) is what cluster oncall can act on.

### Q-J2 — Cold-start latency engineering target

**Question:** target for fresh-shard cold-start? (i) immediate via fleet-aggregate (`cell_confidence: warm_start`; no per-shard threshold), (ii) 60 per-shard samples for strict (~5 min wall-clock at default 5s tick), (iii) 20 per-shard samples for warm-start (~100s wall-clock; pair-review-triggering re-derivation).

**Architect-pre-prediction:** (iii). PR-F4 pair-review on the threshold re-derivation; load-bearing for "Tessera scales to fleet-provisioning fast" pitch claim.

### Q-J3 — Cross-shard correlation output semantics

**Question:** Extension 3 output (i) "this shard" attribution only, (ii) "K shards with this property" pattern only, or (iii) both — cascade emits at every layer?

**Architect-pre-prediction:** (iii). Per-shard for oncall pager; pattern for fleet-level event identification.

### Q-J4 — Synthetic-cluster substrate scope at Tessera Phase 2 SLICE 1

**Question:** what cluster topology + event-feed scenarios should Tessera Phase 2 SLICE 1 cover? (i) single-rack uniform topology + injected PSU/cooling events; (ii) two-rack heterogeneous + injected firmware-push event; (iii) ~10-rack heterogeneous + injected mixed events.

**Architect-pre-prediction:** (i) for SLICE 1 architectural-foundation-only; expand to (ii) at SLICE 2-3; (iii) at SLICE 4. Each substrate gets a label parallel to inherited v5/v7/v8X/v9X.

### Q-J5 — Tessera Phase 1 freeze-hook activation gate

**Question:** Tessera Phase 1 ships with `freeze_hook_enabled: false`. Phase 2 ship activates. Should freeze-hook be a Phase 1 SLICE-3 acceptance gate (Phase 1 doesn't close until Phase 2 is on the path) or a Phase 2 activation gate (Phase 1 closes independently; freeze-hook is post-close fix-forward when Phase 2 lands)?

**Architect-pre-prediction:** Phase 2 activation gate. Phase 1 closes independently as per-shard infrastructure foundation; freeze-hook is documented CAVEAT in Phase 1 close (analogous to inherited Q58 close-with-CAVEAT clause 1 / Q66 SLICE 1 RETIRE pattern).

### Q-J6 — Cross-project sequencing (REFRAMED at v0.3)

**Question:** Tessera development timeline relative to DeploySignal's Phase E (production deployment hardening; TAGGED-FUTURE in DeploySignal at SHA `5a72371`). **Reframed at v0.3** — under DeploySignal-extension framing (v0.1/v0.2) this was a within-DeploySignal sequencing question; under Tessera-as-separate-product framing it becomes a CROSS-project sequencing question.

Options: (i) DeploySignal Phase E → Tessera Phase 1 → Tessera Phase 2, (ii) Tessera Phase 1 → Tessera Phase 2 → DeploySignal Phase E, (iii) DeploySignal Phase E and Tessera Phase 1 in parallel tracks (different engineering capacity required), (iv) DeploySignal Phase E indefinitely deferred while Tessera takes priority (DeploySignal continues operational maintenance only).

**Architect-pre-prediction:** likely (iv) or (ii). Under Tessera-as-separate-product framing, the cross-project sequencing question's answer depends heavily on whether DeploySignal's Phase E (production deployment hardening for the single-deployment engine) has external pressure (production deployment customers asking) vs Tessera's pitch priority (fleet/AI infrastructure positioning). Architect cannot pre-predict reliably; **this is the highest-uncertainty decision in the memo.** Architect-pre-prediction probability bands on Q-J6 itself: ~30% (iv); ~35% (ii); ~20% (iii); ~15% (i).

**This is the load-bearing strategic decision** and depends on John's pitch / market-positioning priorities which are downstream of architect's scope.

---

## 6. Pre-route discipline application (architect-side)

### Architect grilling pass output (10 axes per inherited DISCIPLINE-REFERENCE:154 at SHA `5a72371`)

**CRITICAL: 0.** SCOPE-PROPOSAL fidelity convention; no spec-emit-time CRITICALs by definition.

**LIKELY-SURFACES: 8.** Pre-flagged in spec § Open architectural questions OR § Anti-scope OR § Risk register:
- LS-1: conditional independence of per-shard e-processes under correlated drift (R-S1; PR-F1).
- LS-2: `min_samples_strict` re-derivation empirical validation outcome (R-S2; PR-F4).
- LS-3: storage footprint at scale empirical profile (R-E1; PR-F5).
- LS-4: topology-join semantics under sparse topology data (Phase 2 SLICE 3 iterative-refinement prediction).
- LS-5: event-conditional correlational attribution confounding (R-S5; PR-F7).
- LS-6: schema drift across Phase 1 → Phase 2 contract surface (R-E5).
- LS-7: pedagogy-invalidation extent for Tessera demo narrative (v0.1 cycle observation reaffirmed; `feedback_accuracy_first_pitch_demos_adapt` inherited).
- LS-8: TopologyEdge directed-vs-undirected adaptation under NVLink hardware-topology use case.

**PRE-EMPTABLE: 9** (1 added at v0.3). Folded proactively:
- PE-1: cross-reference inherited Q70 dispatch-table refactor for what extends cleanly (§ 2.2 sub-section).
- PE-2: cross-reference inherited Addition #2 / #12 / #23 for hierarchical-pooling reuse (§ 2.2).
- PE-3: cross-reference inherited Q58 clause-2 / Q59 clause-3 PRESERVED-PERMANENT-POST-PHASE-D (§ 2.1 A2).
- PE-4: hardware-diagnostic anti-scope (A10).
- PE-5: enterprise-infrastructure boundary preservation (A8 + A11).
- PE-6: synthetic-cluster substrate vs real-cluster integration TAGGED-FUTURE pattern (Phase 2 SLICE 1 deliverable).
- PE-7: build on existing inherited Addition #25 + #26 primitives explicitly; no new abstract ingestion interfaces (concrete impl + scope extension only).
- PE-8: preserve inherited Addition #26 D4 correlational-not-causal stance via A16 + Extension 3 (c) framing.
- **PE-9 (NEW v0.3):** Tessera-as-separate-product framing; DeploySignal-integration scope explicitly deferred to Phase 3+ via A17.

### Memorial D candidate-set enumeration

Memorial D state evolution: pre-Reviewer-pass (v0.1) at inherited 20V/8C; post-Reviewer-pass (v0.2 disposition) at 21V/8C (5th sub-instance of 8th CONFIRMATION class — file-opened-discipline-paired-with-candidate-set-enumeration sub-variant per MD-F6). v0.3 reframe does not increment further (same architect-grilling-discipline; reframing is a project-boundary cleanup, not a new discipline gap). Architect-pre-prediction: post-Tessera-Phase-2-close-walk, expected progression to ~23-25V / ~9-11C depending on discipline application across the 16-24 Q-cycles.

### Inherited Memorial F sub-rule application

All four inherited sub-rules apply at Tessera Phase 1 + 2; engine vendoring inherits sub-rule application discipline. Notable at v0.3 emit: sub-rule 3 (ADR-anti-scope-preservation) extended to inherited Addition #25 D2 + D5 (preservation-or-amendment at Phase 2 SLICE 1) and Addition #26 D4 (RECONFIRMED at v0.3 via F2-α + A16 inherited).

### Pair-review trigger summary

**7 pair-review trigger conditions enumerated; 6 trigger-firing (PR-F1, PR-F2, PR-F4, PR-F5, PR-F6, PR-F7), 1 pre-empted as sub-mechanism (PR-F3).** Per inherited 3-check discipline: external-source literature verification + empirical pair-review test + architect concur. **Plus hybrid Reviewer (Opus + Sonnet parallel + Merger per anchor `case-studies/archfolio-coordinator-dryrun/HYBRID-REVIEWER-DESIGN.md`) mandatory at Phase 1 SLICE 3 (PR-F1 hierarchical-e-value empirical evidence), Phase 2 SLICE 3 (PR-F6 topology-aware empirical evidence), and Phase 2 close walk** (D4 RECONFIRMED disposition). Total pair-review investment estimated ~1 Q-cycle equivalent; included in 16-24 estimate.

### Skill 14 + 15 + hybrid Reviewer commitments (carry-forward from v0.2)

- **Anchor `skills/14-prd-conjunction-cross-check.md`** applied at v0.3 against John's structured intake (REQUEST / CONTEXT / OUTPUT EXPECTED + project-reframe disposition); cross-check PASS at the conjunct level. The v0.2 application observation (Skill 14 catches BOTH narrowings AND widenings of stakeholder-requirement language; symmetric application) carries forward as candidate Anchor-memorialization contribution per John 2026-05-15 principle.
- **Anchor `skills/15-prescription-to-AC-coverage.md`** doesn't fire at SCOPE-PROPOSAL fidelity (no §3/§4/§5 formal structure). Forward commitment: mandatory pre-route gate at Tessera Phase 1 SLICE 1 spec-emit alongside inherited Memorial F sub-rules 1-4. Estimated 8-12 prescriptions per spec.
- **Hybrid Reviewer** commitments enumerated above; carries forward from v0.2 § 8 item 12.

---

## 7. Topic close framing

How v0.3 resolves drives next-cycle pick:

- **(a) Clean close (architect-pre-prediction ~45%):** John reviews + dispositions on Q-J1 through Q-J6; TPM routes to architect for Tessera Phase 1 SLICE 1 spec-emit; Phase 1 begins. Probability matches v0.2 recalibration (6-decision-point joint-probability with partial coupling); v0.3 reframe doesn't materially shift the probability (the architectural commitments are unchanged; only the project-boundary framing is).
- **(b) Decline-to-activate (architect-pre-prediction ~15%):** Tessera scoping lands as TAGGED-FUTURE; tessera repo stays scaffolded but no Phase 1 SLICE 1 spec-emit. John may decline if competing priorities (DeploySignal Phase E pressure; non-Tessera commitments) outweigh.
- **(c) Partial-activation (architect-pre-prediction ~25%):** Tessera Phase 1 as priority; Phase 2 TAGGED-FUTURE until Phase 1 closes. Phase 1 shippable with `freeze_hook_enabled: false`.
- **(d) Memo-amend (architect-pre-prediction ~15%):** John surfaces clarification or scope adjustment; architect re-drafts v0.4. (Less likely at v0.3 given v0.2's amendments already absorbed Reviewer + Skill 14/15 + hybrid Reviewer + project-reframe.)

Sum: 100%.

---

## 8. Discipline-archive significance

Items 1-9 from v0.2 § 8 carry forward (SCOPE-PROPOSAL fidelity observation; Memorial D candidate-set additions span all three extensions; 16 anti-scope clauses A1-A16 [A17 added at v0.3 to 17]; Phase-letter scoping load-bearing; TPM pre-route grilling caught structural issues; Reviewer cold-context audit caught FAIL-class findings; SCOPE-PROPOSAL fidelity revealed discipline-application gap SPEC fidelity would have caught automatically; `superpowers:brainstorming` skill applied; `superpowers:receiving-code-review` discipline applied; Anchor skills 14 + 15 + hybrid Reviewer incorporated). Plus post-v0.3 observations:

10. **Project-reframe (DeploySignal-extension → Tessera-as-separate-product) is a discipline-archive event in itself.** v0.1 and v0.2 were structurally correct as scoping memos but operated under a wrong project-boundary assumption. The reframe was caught NOT by the Reviewer (Reviewer audit found 2 FAIL + 8 GAP — all of which were within-the-DeploySignal-extension-framing concerns) but by John at session-end-of-day reflection. **Discipline-archive significance:** Reviewer cold-context audit catches architect-introduced drift within a framing but cannot catch wrong-framing-altogether. The framing question itself is John-only (Product Manager role); architect cannot reliably pre-predict it. **Candidate methodology refinement (Anchor-memorialization candidate):** pre-route grilling at TPM intake should include an explicit "framing check" — "is this work the next step in the assumed-product, or a separate product worth its own commitment?" — as a TPM grilling axis. Single-observation; not yet memorial-accretion-ready but pattern to watch.

11. **Engine vendoring as a project-boundary architectural decision is structurally different from feature scope.** Tessera's vendor-first-then-extract decision (John 2026-05-15) is a project-level commitment (not a feature-level one) that constrains every Tessera Q-cycle until Phase 2 close. Captured in § 9 below; lives at architecturally-distinct fidelity from per-feature anti-scope clauses. **Candidate methodology refinement:** SCOPE-PROPOSAL-TEMPLATE should include a "shared-code sourcing strategy" section for any project that reuses code from a sibling project. Currently this is captured ad-hoc in § 9.

12. **v0.3 standalone-replacement strategy (vs delta-from-v0.2) was the right call** for project-boundary reframing. The audit trail is preserved in PROJECT-CONTEXT.md (v0.1/v0.2/Reviewer/disposition retained for history) but v0.3 reads cleanly as the canonical scoping document under the new product framing. Delta-from-v0.2 would have required readers to mentally apply the reframe at every Phase-F→Tessera-Phase-1 reference; standalone resolves this once.

---

## 9. Engine vendoring policy

**Strategy:** vendor-first; extract to shared npm package at Tessera Phase 2 once Tessera's needs across all three founding extensions are concrete. Decision: John 2026-05-15.

### What gets vendored at Tessera Phase 1 SLICE 1

The vendored subset from DeploySignal SHA `5a72371`:

| Source path (DeploySignal) | Vendored target (Tessera) | Sync policy |
|---|---|---|
| `engine/detectors/*.ts` (Family A/C/D/E + Page-CUSUM) | `tessera/engine/detectors/*.ts` | Vendored-at-pin; per-file header notes source SHA. Tessera does NOT modify detector internals (per A12); deltas at code level are forbidden. |
| `engine/types/families/*.ts` | `tessera/engine/types/families/*.ts` | Vendored-at-pin; per-file header. |
| `engine/types/verdict.ts` (lines 1-260) | `tessera/engine/types/verdict.ts` | Vendored-with-deltas at Phase 2; SLICE 1 of Phase 2 adds `cluster_event_id` to VerdictGroup; per-file header notes "vendored at SHA 5a72371 + Tessera-specific extensions per Phase 2 SLICE 1". |
| `engine/topology-overlay.ts` | `tessera/engine/topology-overlay.ts` | Vendored-with-deltas at Phase 2; SLICE 3 of Phase 2 adds HardwareTopologySource concrete impl + relationship enum extension. |
| `engine/core.ts` (TrendBuffer) | `tessera/engine/core.ts` | Vendored-at-pin; no Tessera modifications. |
| `engine/per-detector-resampler-mode.ts` | `tessera/engine/per-detector-resampler-mode.ts` | Vendored-at-pin; no Tessera modifications. |
| `engine/types/config.ts` | `tessera/engine/types/config.ts` | Vendored-with-deltas; extends with `per_shard_cells` + `shard_id` cell dimension + `cell_confidence: warm_start` enum. |

**Per-file vendored header format:**

```typescript
// VENDORED FROM DeploySignal main@5a72371 — <date>
// Source: deploysignal/<original-path>
// Sync policy: vendored-at-pin | vendored-with-deltas (Tessera Phase <N> SLICE <M>)
// Extract target: tessera-engine npm package (Phase 2 close commitment)
// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points.
```

### Engine modularity facts supporting vendor-first (originating context)

Per John 2026-05-15 originating analysis: the engine is structurally built for lift-out:

- **Pure TypeScript, no native dependencies.** Vendoring is file-copy + import-path adjustment; no native build chain forks.
- **Five detector families as separate files** under `deploysignal/engine/detectors/` (`page-cusum.ts`, `betting-e-process.ts`, `conformal.ts`, `hotelling.ts`, `sequential-mmd.ts`). Per-family vendoring is feasible.
- **Orchestrator config-driven via JSON** (`deploysignal/runs/compiled-configs/v4-fusion-novelty.json` at SHA `5a72371`). Tessera adds per-shard config without orchestrator-code modification.
- **Baselines JSON-serialized.** Tessera baseline format extends inherited baseline JSON without breaking compat.
- **Engine contract:** feed signal stream → get verdict per tick. No deployment-promotion semantics at engine layer — that semantic lives one level up in how verdicts are interpreted. Tessera's interpretation layer (cluster-event scope verdict aggregation per Extension 3) is the architectural delta; the engine contract itself is unchanged.

This is the architectural foundation that makes vendor-first viable. The originating-context phrase "the engine is built for it" captures this: extraction is mechanically feasible; the architectural work is in the three founding extensions, not in restructuring the engine.

### Re-pinning policy

At every Tessera close-walk (Phase 1 close + Phase 2 close), architect verifies all per-file vendored headers against current DeploySignal main. Three outcomes per file:

- **Re-pin** to current DeploySignal main SHA if Tessera-side has no deltas accumulated and DeploySignal-side hasn't structurally changed (low-risk re-pin; ADR-free).
- **Re-pin with delta-rebase** if Tessera-side has deltas + DeploySignal-side structurally changed; architect manually rebases Tessera deltas onto new DeploySignal SHA. May require pair-review.
- **Stay-pinned** at SHA-`5a72371` if DeploySignal-side has architectural divergence that Tessera doesn't want to absorb (e.g., DeploySignal Phase E adds production-deployment-hardening logic Tessera doesn't need).

### Extract-to-npm commitment (Tessera Phase 2 close)

At Tessera Phase 2 close (after all three founding extensions are concrete), architect emits an ADR-class proposal for extracting the shared engine to a separate npm package:

- Candidate package name: `@johnpatrickwarren-oss/deploysignal-engine` OR `@johnpatrickwarren-oss/tessera-deploysignal-engine` (TBD at Phase 2 close).
- Both DeploySignal and Tessera become consumers of the extracted package.
- Tessera's vendored copies replaced by package import; per-file headers retire.
- DeploySignal's `engine/*` either replaced by package import (DeploySignal becomes a package consumer) OR `engine/*` becomes the package source (DeploySignal becomes the package publisher).

The publisher-vs-consumer decision for DeploySignal at extract-time is a future cross-project ADR; out-of-scope for v0.3.

---

## 10. Audit-trail predecessors

This v0.3 memo is the standalone canonical Tessera scoping artifact. **Predecessor artifacts (v0.1 + v0.2 of fleet-mode-scoping memo + Reviewer report + initial disposition) were deleted 2026-05-16 per John cleanup disposition** — they added no unique substantive content beyond what's preserved in this v0.3 memo + `ARCHITECT-REPLY-Q-01-DISPOSITION.md` + `PROJECT-CONTEXT.md`. The framing-history audit trail lives in `PROJECT-CONTEXT.md` § Audit-trail history (table with original framing + resolution + Memorial D state lineage). Literal text of deleted artifacts is preserved in git history at commits `884c08e` (scaffold), `e4a956a` (v0.3 emit), `aa4fa97` (Q1 v0.1).

- **`PROJECT-CONTEXT.md`** — context note explaining the v0.1/v0.2 framing-history + Memorial D state lineage table + project-relationship diagram + conventions.

v0.3's relationship to (now-deleted) predecessors: **standalone replacement** under Tessera-product framing; v0.1/v0.2 architectural commitments (recommended approaches, anti-scope clauses, Memorial D candidates, pair-review triggers, Open Qs) carry forward unchanged in substance, reframed in language. The Reviewer report's 2 FAIL + 8 GAP findings are addressed throughout this v0.3 — F1 (missed Addition #25/#26) addressed in § 2.3 (Extension 3 builds on Addition #25/#26 explicitly); F2 (D4 conflict) addressed in § 2.3 (Extension 3 (c) framed as event-conditional correlational attribution) + A16 (Addition #26 D4 preservation); G1-G8 subsumed into v0.3 framing and § 8 discipline-archive observations.

---

_Memo v0.3 authored: 2026-05-15 (same-day as v0.1 emit + Reviewer pass + v0.2 emit + project reframe; full-cycle in one session). Format: SCOPE-PROPOSAL (anchor `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity). Cross-references: v0.1/v0.2/Reviewer/disposition preserved in `tessera/coordination/` per PROJECT-CONTEXT.md. Routing target: TPM packages for John; John dispositions on Q-J1 through Q-J6 (with Q-J6 now reframed as cross-project sequencing); on clean-close, architect emits Tessera Phase 1 SLICE 1 spec at full SPEC fidelity with `superpowers:brainstorming` + `superpowers:writing-plans` + Skill 15 prescription-to-AC-coverage mandatory pre-route gates._
