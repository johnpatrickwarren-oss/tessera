# WAVE-PLAN-01 — Wave Plan v1: Tessera Phase 2 SLICE 3.B through Phase 2 close

**From:** Coordinator TPM (R24 invocation)
**Date:** 2026-05-18
**Version:** v1 (initial PRD decomposition)
**Foundation:** `coordination/PRD.md` (thin pointer to `SCOPING-MEMO-v0.3.md`); `SCOPING-MEMO-v0.3.md` v0.3 @ HEAD `7890b36`
**Type:** wave plan — Phase 2 remainder DAG + wave sequencing

---

## Plan summary

Seven work units extracted across four waves. Wave 1 is a clean 4-cluster fan-out (three ingestion adapters + one empirical-validation cluster) — D1/D2/D5 tests fire zero edges between any pair, and D4 file-tree contention is resolvable via parallel-class architecture per the inherited `engine/topology-overlay.ts:83-160` precedent. Waves 2/3/4 are single-cluster (close-walk → SLICE 4 → Phase 2 close-walk), each gated on the prior wave by convention or by D1 edges.

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 1 | 4 (parallel) | Yes — WU-01, WU-02, WU-03, WU-04 are all SLICE 3 substrate consumers, each feeds WU-05 | SLICE 3.B adapters + SLICE 3.C empirical validation, dispatched in parallel |
| 2 | 1 | No | SLICE 3 close-walk (audit-tier); aggregates Wave 1 outputs |
| 3 | 1 | No | SLICE 4 event-conditional attribution (full-tier); sequentially gated by SLICE 3 close convention |
| 4 | 1 | No | Phase 2 close-walk (audit-tier) |

**Recommended operator action for Wave 1:** dispatch four parallel clusters via `scripts/multi-track-cluster-setup.sh` per cluster, then run `scripts/run-pipeline.sh` (standard mode, no `--coordinator`) inside each worktree. Single-cluster Waves 2/3/4 use standard `scripts/run-pipeline.sh` from the main worktree.

---

## PRD provenance

- **PRD source:** `coordination/PRD.md` (thin pointer to `SCOPING-MEMO-v0.3.md`)
- **PRD version at plan time:** v0.3 (SCOPING-MEMO) @ HEAD `7890b36`
- **Anti-scope clauses referenced (headline; full enumeration in SCOPING-MEMO § 2.1/2.2/2.3):**
  - A8/A11: NO real customer cluster telemetry
  - A10: NO hardware-diagnostic territory (DCGM / NVML)
  - A12/A5: NO modification to vendored detector internals
  - A13: NO ML-based attribution
  - A15: NO multi-region / cross-cluster federation
  - A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` preserved)
  - A17: NO DeploySignal-integration scope at Phase 1+2
- **Open PRD questions deferred to operator:** See `## Open questions for operator` below — OQ-1 (calibrate.ts), OQ-R08-3 (transient detector scheduling) remain parked from prior close-walks; this plan surfaces 3 new operator gates (OQ-W1-1 through OQ-W1-3).

---

## Step 1 — Work unit extraction (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 1. WUs extracted from PRD/SCOPING-MEMO structure (one PRD feature or one SCOPING-MEMO SLICE row per WU); no work unit invented; no merging beyond the explicit reasoning logged below.

| WU ID | Source PRD feature | Acceptance criteria (frame; per-AC enumeration deferred to cluster Architect spec) | Bounding anti-scope | File tree scope |
|---|---|---|---|---|
| WU-01 | FR-E3b / SCOPING-MEMO § 2.3 line 217 ("ingestion adapter against existing TopologySource"); SLICE 3.B (R24 Architect's deferred slice) | Slurm topology file format ingestion → `TopologySnapshot`; class implements `TopologySource`; parses canonical Slurm `topology.conf` format; AC-suite to-be-enumerated by cluster Architect. | A10 (NO hardware-diagnostic territory — Slurm parses cluster topology, not GPU health); A11 (synthetic fixtures only, no live customer Slurm endpoint); A12 (no modification of `engine/topology-overlay.ts` internals) | NEW `engine/topology/slurm-source.ts` (Tessera-original; parallel-class against `TopologySource`); NEW `test/q-slurm-adapter.test.ts`; NEW `test/_substrate/slurm-fixture-*.conf` |
| WU-02 | FR-E3b / SCOPING-MEMO § 2.3 line 217; SLICE 3.B | Kubernetes node-label API ingestion → `TopologySnapshot`; class implements `TopologySource`; parses K8s `corev1.NodeList` JSON shape; AC-suite to-be-enumerated by cluster Architect. | A10; A11 (synthetic K8s JSON fixtures only); A12 | NEW `engine/topology/k8s-source.ts`; NEW `test/q-k8s-adapter.test.ts`; NEW `test/_substrate/k8s-nodelist-fixture-*.json` |
| WU-03 | FR-E3b / SCOPING-MEMO § 2.3 line 217; SLICE 3.B | NVIDIA `nvidia-smi nvlink --status` output ingestion → `TopologySnapshot`; class implements `TopologySource`; parses canonical NVLink-topology text output; AC-suite to-be-enumerated by cluster Architect. | A10 (parses NVLink topology only — NOT GPU health/SDC); A11 (synthetic `nvidia-smi` output fixtures only); A12 | NEW `engine/topology/nvlink-source.ts`; NEW `test/q-nvlink-adapter.test.ts`; NEW `test/_substrate/nvlink-fixture-*.txt` |
| WU-04 | FR-E3b / SCOPING-MEMO § 2.3 line 220 (MD-F4); SLICE 3.C (R25 per Q-R23-SPEC.md § 0.1 line 16) | Topology-aware spatial attribution layer (MD-F4): BFS-on-undirected attribution; common-mode failure-injection empirical test on v9Y fixture (rack-localized PSU event simulation); PR-F6 hybrid Reviewer pair-review (4-cell evidence matrix). AC-suite to-be-enumerated by cluster Architect; PR-F6 requires external literature citation evidence (Meta H100 SDC papers + MS/Google SDC postmortems) per SCOPING-MEMO § 2.3 PR-F6 trigger. | A12/A5 (NO modification to per-shard detector internals); A13 (rule-based + statistical attribution only, no ML); A16 (correlational_not_causal preserved at output) | NEW `engine/topology/common-mode-attribution.ts` (Tessera-original); NEW `test/q-md-f4-common-mode-injection.test.ts`; uses inherited `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen) |
| WU-05 | (close-walk; mirrors R19/R22 pattern; no PRD-level AC) | SLICE 3 close-walk document: aggregates Wave 1 deliverables, dispositions Wave 1 MINORs, records Memorial state stamp, frames SLICE 4 entry; q01 vendoring header arithmetic refresh; carry-forward inventory. AC-suite mirrors R22 audit-tier close-walk scope. | A12; close-walk does NOT touch any production code outside the test-only header arithmetic refresh patterns established at R19/R22 | NEW `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`; minor refresh to `coordination/VENDORING-MANIFEST.md` notes column; possible R23 MINOR-3 carry-forward fix at `test/q23-hardware-topology-source.test.ts:154` per ROUND-R23-SUMMARY § Watch list |
| WU-06 | FR-E3c / SCOPING-MEMO § 2.3 line 232 + § 3 SLICE 4 row; AC-P4 | Deployment-event-feed ingestion (genuinely new ingestion surface — firmware push / model redeploy / config change / env change); event-conditional **correlational** attribution (MD-F5; PR-F7 pair-review with 4-cell evidence matrix); Phase 1 freeze-hook coupling activation. Preserves Addition #26 D4 wire-format. AC-suite to-be-enumerated by cluster Architect (likely SLICE 4 sub-slicing required — see OQ-W1-3). | A10; A11; A13; A16 (`correlational_not_causal: true` REQUIRED on all event-conditional output); A17 (no DeploySignal-integration scope) | NEW `engine/events/*` (event-feed substrate); NEW `engine/topology/event-conditional-attribution.ts`; freeze-hook activation in inherited Phase 1 substrate (requires vendored-with-deltas check); NEW `test/q-event-feed-*.test.ts`; possible `test/_substrate/v9Z-*-cluster.ts` for 4-cell test matrix |
| WU-07 | (close-walk; mirrors R19/R22 pattern; no PRD-level AC) | Phase 2 close-walk document; Addition #25 D2 + D5 disposition stamp; Addition #26 D4 RECONFIRMED; Phase 1 freeze-hook activation coupling stamp; Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 2.3 row; Tessera Phase 3 candidate list TAGGED-FUTURE (DeploySignal integration; multi-region; etc.). | A12; A17 | NEW `coordination/PHASE-2-CLOSE-WALK.md`; final vendoring re-pin check (per SCOPING-MEMO § 9.4 vendoring policy); Tessera v1 readiness inventory |

### Merge reasoning

No merging applied. Each row above traces to one PRD feature ref or one SCOPING-MEMO SLICE row.

**Splitting reasoning (one row note):** SLICE 4 (per SCOPING-MEMO § 3 estimate "2-3 Q-cycles") is **currently represented as a single WU (WU-06)**. NEXT-ROLE line 51 flagged SLICE 4 as "possibly fan-out candidates if event-feed has multiple producer types (firmware/deploy/config)." This decomposition is deferred to OQ-W1-3 below; a follow-up Coordinator invocation after WU-05 closes will revisit SLICE 4 decomposition with fresh state. Reasoning: SLICE 4 architecture (event-feed schema; freeze-hook activation pattern) is not yet specced; pre-decomposing it now would invent WUs not traceable to PRD/SCOPING-MEMO at SLICE 3.A fidelity, violating Step 1 discipline.

---

## Step 2 — Dependency edge identification (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 2. Each edge cites the dependency test that fired (D1–D5) and the confidence level.

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| WU-01 | WU-05 | D1 (shared output ownership) | HIGH | WU-05 close-walk reads `engine/topology/slurm-source.ts` deliverable + its Reviewer report to aggregate SLICE 3 state stamp. |
| WU-02 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/k8s-source.ts` deliverable + Reviewer report. |
| WU-03 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/nvlink-source.ts` deliverable + Reviewer report. |
| WU-04 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/common-mode-attribution.ts` + PR-F6 hybrid Reviewer evidence package. |
| WU-05 | WU-06 | D2 (AC reference / convention) | MEDIUM | NOT a strict D1 edge — WU-06 (SLICE 4) does not read WU-05's (close-walk) outputs at runtime. The edge fires on **project convention** that SLICE-close documents must land before next-SLICE entry (Phase 1 close-walk → Phase 2 SLICE 1 entry precedent; SLICE 1 close → SLICE 2; SLICE 2 close → SLICE 3). Surfaced for Step 3 Claude judgment below. |
| WU-06 | WU-07 | D1 | HIGH | Phase 2 close-walk reads SLICE 4 deliverables (event-feed substrate, event-conditional attribution layer, 4-cell test matrix evidence) + Hybrid Reviewer evidence. |

### Among Wave 1 candidates (WU-01, WU-02, WU-03, WU-04) — pairwise check

| Pair | D1 (shared output)? | D2 (AC reference)? | D5 (write-conflict)? | D4 (file-tree overlap)? |
|---|---|---|---|---|
| WU-01 ↔ WU-02 | NO — each adapter produces its own `TopologySource` impl in its own file (parallel-class). Neither reads from the other. | NO — adapter ACs (parsing input format → `TopologySnapshot` shape) reference `engine/types/verdict.ts` types only (frozen at R23). | N/A — Tessera has no migration surface. | NO if parallel-class architecture is followed (each in `engine/topology/<source>.ts`). YES if subclass architecture is adopted (all extend `engine/hardware-topology-source.ts`). **Resolution: parallel-class is the Coordinator's recommended convention; see OQ-W1-1.** |
| WU-01 ↔ WU-03 | NO | NO | N/A | Same as WU-01 ↔ WU-02 (resolvable via parallel-class). |
| WU-02 ↔ WU-03 | NO | NO | N/A | Same. |
| WU-01 ↔ WU-04 | NO — WU-04 consumes `TopologySnapshot` from any `TopologySource`; per Q-R23-SPEC § 0.6 the empirical test uses v9Y fixture, NOT live adapter output. | NO — WU-04's MD-F4 + PR-F6 ACs reference v9Y fixture + inherited BFS + node-kind attribution; no adapter behavior referenced. | N/A | NO — WU-04 writes `engine/topology/common-mode-attribution.ts` (or sibling), distinct from adapter files. |
| WU-02 ↔ WU-04 | NO | NO | N/A | NO (same reasoning). |
| WU-03 ↔ WU-04 | NO | NO | N/A | NO (same reasoning). |

**Verdict for Wave 1:** Zero D1/D2/D5 edges between any pair. D4 contention is resolvable via convention (parallel-class architecture). Wave 1 is a clean 4-cluster fan-out under the parallel-class architectural assumption.

### Contention risks (not dependencies)

| Work units | Shared files | Resolution |
|---|---|---|
| WU-01, WU-02, WU-03 | `engine/types/verdict.ts` (READ only — adapters import `TopologyNode`, `TopologyEdge`, `TopologySnapshot` types) | Read-only; no write contention. Type-union extensions shipped at R18+R23; adapters CONSUME, do not extend. If any cluster's Architect identifies a missing literal at spec time, that's a HALT condition routing back to Coordinator for amendment (not silent in-cluster expansion). |
| WU-01, WU-02, WU-03 | `engine/topology-overlay.ts` (READ only — adapters import `TopologySource` interface + `FetchContext` + `computeSnapshotHash`) | Read-only; file is vendored-at-pin (`5a72371`) and frozen. Any cluster requiring body modification HALTs and routes back. |
| WU-01, WU-02, WU-03 | `coordination/VENDORING-MANIFEST.md` (per-cluster: each cluster's pipeline may touch its own row note for the new adapter file — but adapters are TESSERA-ORIGINAL, not vendored, so manifest only needs an entry IF Tessera convention requires Tessera-original files to appear in the manifest; per R23 precedent, Tessera-original files (`engine/hardware-topology-source.ts`) do NOT appear in the manifest — so zero manifest contention) | No manifest contention expected. |
| WU-01, WU-02, WU-03, WU-04 | `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `CLAUDE-*.md` reinforcement files | Arbitrated by Coordinator at wave gate per CLAUDE-COORDINATOR.md §"Shared-resource arbitration" — each cluster writes to `coordination/clusters/<cluster-id>/MEMORIAL-fragment.md` (single-writer per cluster); Coordinator merges under `flock(2)` on `coordination/.MEMORIAL.lock` at wave gate. Reinforcement appends to `CLAUDE-*.md` go under the same lock. |
| WU-04 ↔ adapters | Inherited `engine/topology-overlay.ts` BFS (line 257+) | Read-only by adapters; potentially extended-by-pattern by WU-04 (MD-F4 attribution may write a sibling BFS-with-node-kind-awareness function). If WU-04 needs to MODIFY the inherited BFS body, that's a vendored-with-deltas transition for `engine/topology-overlay.ts` — high impact; would convert this to a strict D-edge to all adapters. **Per Q-R23-SPEC § 0.5 Approach A, R23 anti-scope prohibited inherited BFS modification; the same convention applies at R24/R25.** Cluster WU-04's Architect HALTs if BFS body modification proves load-bearing for MD-F4. |

---

## Step 3 — Claude judgment at ambiguity boundaries

### Judgment call 1 — WU-04 placement in Wave 1 (parallel to adapters)

- **Ambiguity:** Q-R23-SPEC.md § 0.1 line 16 prescribed "R24 = adapters; R25 = MD-F4 + empirical + PR-F6; R26 = SLICE 3 close-walk." A round-sequenced reading would place WU-04 in Wave 2 (after adapters). But Wave-plan-level decomposition (which is what the Coordinator emits) is not bound to round numbering — it's bound to D-test edges.
- **Candidate resolutions:**
  - **Parallel (Wave 1):** WU-04 dispatches alongside adapters as the 4th cluster. Independent fixture-driven (v9Y) work; zero D-test edges to adapters. Operator review at Wave 1 gate sees both adapters AND MD-F4 evidence simultaneously.
  - **Sequential (Wave 2):** WU-04 dispatches after adapters in Wave 2. Honors R24/R25 round-numbering convention; defers MD-F4 work until adapters complete (which they don't structurally need).
- **Claude's judgment:** Parallel (Wave 1).
- **Reasoning:** The R24/R25 round numbering originated in the R23 Architect's split-decision when the Coordinator role was not yet vendored (R23 predates MR-1). The split-decision was a single-pipeline sequencing optimization, not an architectural dependency. With the Coordinator role active, fan-out is the operator's stated preference where D-tests show independence — and WU-04's independence from adapters is structurally confirmed (fixture-driven empirical test; orthogonal file tree; orthogonal AC reference set). Sequential placement would conserve operator review burden but cost +1 wave of latency without architectural benefit. The 4-cluster fan-out (under cap of 5; CLAUDE-COORDINATOR.md operational cap) is the right call.
- **Resulting edge:** Confirmed independent (no edge); WU-04 placed in Wave 1.

### Judgment call 2 — Adapter file-layout convention (parallel-class vs subclass)

- **Ambiguity:** Q-R23-SPEC.md § 0.3 explicitly deferred this choice to R24 ("R24 inherits the architectural decision tree (subclass vs parallel) at its own spec time"). If three clusters dispatch in parallel and each independently picks a different architecture (one subclass, one parallel-class, one inline-extension of `engine/hardware-topology-source.ts`), the result is convention drift that catches at SLICE 3 close-walk (WU-05) and requires a retroactive harmonization round.
- **Candidate resolutions:**
  - **Coordinator pre-declares parallel-class:** All three adapters MUST be parallel classes against `TopologySource` interface, located at `engine/topology/<source>-source.ts`. Mirrors inherited `engine/topology-overlay.ts:83-160` precedent (StaticTopologySource + OtelServiceGraphV1 as parallel classes in one file). Enforces fan-out cleanliness.
  - **Defer to cluster Architects:** Each cluster's Architect decides independently. Risk of convention drift; mitigation via SLICE 3 close-walk audit.
- **Claude's judgment:** Coordinator pre-declares parallel-class as the architecture for Wave 1, surfaced as a recommendation in this plan + as OQ-W1-1 for operator ratification.
- **Reasoning:** Convention drift between three concurrent clusters is the canonical failure mode the Coordinator role exists to prevent (per CLAUDE-COORDINATOR.md §"Why a separate role"). Pre-declaring the architectural convention is within the Coordinator's program-level scope; the cluster's Architect still draws the spec, but the architectural prior is bounded. If operator overrides (selects "defer to cluster Architects"), SLICE 3 close-walk (WU-05) audits convention drift and a retroactive harmonization round is dispatched if needed.
- **Resulting edge:** Confirmed independent (no edge); fan-out remains valid under operator-ratified parallel-class architecture.

### Judgment call 3 — Wave 2/3 sequencing (WU-05 close-walk before WU-06 SLICE 4 start)

- **Ambiguity:** D-test (Step 2) flagged WU-05 → WU-06 as a D2 MEDIUM edge — convention-based, not strict D1. Could Waves 2 and 3 be merged (run WU-05 close-walk in parallel with WU-06 SLICE 4 spec)?
- **Candidate resolutions:**
  - **Parallel (merged Wave 2):** WU-05 (close-walk) + WU-06 (SLICE 4 start) dispatch in parallel. Saves one wave-gate cycle.
  - **Sequential (separate Waves 2, 3):** Close SLICE 3 in Wave 2; open SLICE 4 in Wave 3.
- **Claude's judgment:** Sequential (separate Waves 2, 3).
- **Reasoning:** Three precedents (Phase 1 close-walk → Phase 2 SLICE 1; SLICE 1 close → SLICE 2; SLICE 2 close → SLICE 3) all sequence close-walks before next-SLICE entry. The close-walk surfaces dispositions (MINOR carry-forward; OQ resolution; reinforcement counts; entry-framing for next SLICE) that the next-SLICE Architect reads as input. Merging them creates a chicken-and-egg state where SLICE 4's Architect would not have the SLICE 3 close-walk's entry-framing section available. The convention is load-bearing for spec-drafting quality, even though it's not a strict D1 edge.
- **Resulting edge:** WU-05 → WU-06 retained as MEDIUM-confidence sequencing edge.

---

## Step 4 — DAG validation

- [x] **Cycle check.** No circular dependencies. DAG is a feed-forward graph: 4 Wave-1 sources → WU-05 → WU-06 → WU-07.
- [x] **Island check.** No work units with zero edges in or out. WU-01/02/03/04 all have outbound edges to WU-05 (and inbound dependencies on the R23 deliverables, which are FROZEN-PRIOR-WAVE and thus not in this plan's edge set). WU-05/06/07 are chained.
- [x] **Foundation identification.** Per CLAUDE-COORDINATOR.md §Step 4 "Work units whose outputs are inputs to 3+ other work units **across 2+ domains/modules** are foundations." WU-01, WU-02, WU-03, WU-04 each feed only WU-05 (1 outbound) — they do not individually qualify as foundations under the strict ≥3-outbound × ≥2-domain test. **However**, the prior wave's deliverables (R23: `engine/hardware-topology-source.ts`, `engine/types/verdict.ts` extensions, `test/_substrate/v9Y-multi-rack-cluster.ts`) ARE the foundation for ALL of Wave 1 — they are frozen-prior and not in this plan's WU set. Wave 1 is "consumers of the R23 foundation"; the foundation itself is shipped.

---

## Step 5 — Wave sequencing

| Wave | Work units | Rationale |
|---|---|---|
| 1 | WU-01 (SLURM-ADAPTER), WU-02 (K8S-ADAPTER), WU-03 (NVLINK-ADAPTER), WU-04 (MD-F4 + common-mode + PR-F6 hybrid Reviewer) | All four are consumers of the R23-frozen substrate (HardwareTopologySource class, v9Y fixture, type-union extensions). Zero D1/D2/D5 edges among the four. D4 file-tree contention resolved via parallel-class architecture (OQ-W1-1). 4-cluster fan-out under the 5-cluster operational cap. |
| 2 | WU-05 (SLICE 3 close-walk) | All four Wave 1 deliverables feed WU-05's close-walk inventory. D1 edges from each Wave 1 WU. Audit tier (mirrors R19/R22 close-walk pattern). |
| 3 | WU-06 (SLICE 4 event-conditional attribution) | Convention-gated by WU-05 close-walk completion (Claude judgment call 3). Full tier. May surface SLICE 4 sub-decomposition (OQ-W1-3) at cluster Architect's brainstorm phase. |
| 4 | WU-07 (Phase 2 close-walk) | D1-gated by WU-06 SLICE 4 deliverables. Audit tier (mirrors R19/R22 pattern); Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 2.3 commitment. |

### Wave dispatch order (within each wave, parallel)

Within Wave 1, the four clusters dispatch in parallel as separate worktrees per `scripts/multi-track-cluster-setup.sh`. Each cluster receives its own scope block (deferred to operator-led scope-block authoring post-plan-approval; see Wave 1 dispatch authorization below). No `CLUSTER-HANDOFF-*.md` artifacts are pre-created at plan time — those are authored at the dispatch of target clusters per CLAUDE-COORDINATOR.md §Cluster handoff inventory.

---

## Step 6 — Tier classifications

Per the tier rubric inlined in `CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5). **Each cluster self-governs its own tier at session start; this column records the Coordinator's prior, not a binding instruction.**

| WU ID | Coordinator tier | Matched criteria | Rationale |
|---|---|---|---|
| WU-01 | full | A1 (new external dependency — Slurm topology format parsing), A4 (novel data model — Slurm `topology.conf` shape) | First ingestion adapter against `HardwareTopologySource` pattern (R23 scaffold); new external-format parser; warrants Architect pre-emit-grilling + Reviewer cold-audit. |
| WU-02 | full | A1 (new external dependency — K8s node-label API JSON shape), A4 (novel data model — `corev1.NodeList` shape mapping) | New external schema; warrants full-tier rigor. |
| WU-03 | full | A1 (new external dependency — NVLink CLI text output), A4 (novel data model — NVLink-topology text format parsing) | New external schema; warrants full-tier rigor. |
| WU-04 | full | A2 (new architectural pattern — spatial attribution layer), A4 (novel data model — common-mode attribution shape), PR-F6 pair-review trigger (hybrid Reviewer commitment per SCOPING-MEMO § 2.3) | First implementation of MD-F4 attribution; PR-F6 hybrid Reviewer is a SLICE 3 commitment that ONLY fires in full-tier; warrants Architect + Implementer + Hybrid Reviewer. |
| WU-05 | audit | S4 (tactical follow-up to recent rounds; close-walk pattern), S3 (single bounded item — close-walk document + minor refresh) | Mirrors R19 (SLICE 1 close-walk audit-tier) and R22 (SLICE 2 close-walk audit-tier) precedents. |
| WU-06 | full | A1 (new external dependency — deployment-event feed ingestion: firmware/deploy/config/env producers), A2 (new architectural pattern — event-conditional attribution; freeze-hook coupling), A4 (novel data model — event-feed schema; 4-cell evidence matrix), PR-F7 pair-review trigger | New ingestion surface (genuinely novel per SCOPING-MEMO § 2.3 line 232); MD-F5 pair-review trigger; freeze-hook activation couples back into Phase 1 (high blast radius A6 candidate); warrants full-tier rigor. |
| WU-07 | audit | S4 (tactical follow-up), S3 (single bounded item — close-walk document); BUT Hybrid Reviewer pair-review-style at close is a full-tier commitment per SCOPING-MEMO § 2.3 row | **Tier classification ambiguity: audit per close-walk pattern, OR full if Hybrid Reviewer is treated as an architecturally novel commitment.** Coordinator prior is audit (close-walk audit is the structural shape; the Hybrid Reviewer pair-review is an additional commitment layered on top of the audit document, not a replacement for it). Cluster's Memorial-Updater + Reviewer can promote to full at session-start if the Hybrid Reviewer commitment is reinterpreted as load-bearing for the Phase 2 close. |

### Tier prior discrepancies

(Empty — first Coordinator invocation; no prior wave-gate data to compare priors against cluster self-assessments. Future wave gates will populate this table.)

| WU ID | Coordinator prior | Cluster self-assessed | Wave gate where surfaced |
|---|---|---|---|
| — | — | — | — |

---

## Cluster handoff inventory

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, handoff artifacts are created at dispatch of the target cluster (not pre-created at plan time). The list below is forward-looking — each row identifies a directed dependency edge that will produce a `CLUSTER-HANDOFF-NN-WUA-WUB.md` artifact at the appropriate wave gate.

| Handoff artifact (to be created) | From WU | To WU | Wave boundary | D-test that fired |
|---|---|---|---|---|
| `CLUSTER-HANDOFF-02-WU01-WU05.md` | WU-01 (Wave 1) | WU-05 (Wave 2) | Wave 1 → 2 gate | D1 (close-walk reads SLURM adapter output) |
| `CLUSTER-HANDOFF-02-WU02-WU05.md` | WU-02 (Wave 1) | WU-05 (Wave 2) | Wave 1 → 2 gate | D1 (close-walk reads K8S adapter output) |
| `CLUSTER-HANDOFF-02-WU03-WU05.md` | WU-03 (Wave 1) | WU-05 (Wave 2) | Wave 1 → 2 gate | D1 (close-walk reads NVLINK adapter output) |
| `CLUSTER-HANDOFF-02-WU04-WU05.md` | WU-04 (Wave 1) | WU-05 (Wave 2) | Wave 1 → 2 gate | D1 (close-walk reads MD-F4 + PR-F6 evidence) |
| `CLUSTER-HANDOFF-03-WU05-WU06.md` | WU-05 (Wave 2) | WU-06 (Wave 3) | Wave 2 → 3 gate | D2 / convention (close-walk entry-framing feeds SLICE 4 Architect spec input) |
| `CLUSTER-HANDOFF-04-WU06-WU07.md` | WU-06 (Wave 3) | WU-07 (Wave 4) | Wave 3 → 4 gate | D1 (Phase 2 close-walk reads SLICE 4 deliverables) |

Template: `templates/CLUSTER-HANDOFF-TEMPLATE.md`.

---

## Pre-emit grilling

Per `CLAUDE-COMMON.md` Superpowers Review block + Coordinator's pre-emit grilling discipline (CLAUDE-COORDINATOR.md):

- [x] **Every dependency edge is verifiable.** Step 2's table rows each cite a specific D-test with concrete reasoning. The WU-05 → WU-06 MEDIUM edge is explicitly flagged in Step 3 Judgment call 3 (convention-based, not strict D1) — not silently treated as either independent or dependent.
- [x] **No unstated assumptions.** The "parallel-class architecture" assumption for Wave 1 fan-out is surfaced as OQ-W1-1 for operator ratification, not silently baked in. The "MD-F4 placement in Wave 1" decision is surfaced as Judgment call 1 with reasoning. The "SLICE 4 decomposition" deferral is surfaced as OQ-W1-3.
- [x] **No scope added beyond PRD/SCOPING-MEMO.** Every WU traces to a FR-E3a/b/c row in PRD § Functional requirements or a SLICE row in SCOPING-MEMO § 3. No invented WUs. Close-walk WUs (WU-05, WU-07) trace to convention-anchored R19/R22 precedent (no PRD row but explicit project-level methodology pattern).
- [x] **Cluster can act without guessing.** Each WU has (a) PRD/SCOPING-MEMO trace, (b) frame-level AC scope (cluster's Architect enumerates exhaustive AC list per the cluster's spec), (c) bounding anti-scope from PRD § Anti-scope, (d) file tree scope (NEW/READ-ONLY annotations).
- [x] **DAG is acyclic.** Step 4 cycle check passed (feed-forward graph: 4 Wave-1 → WU-05 → WU-06 → WU-07).
- [x] **Tier priors are defensible.** Each tier classification cites specific A/S/Z criteria from `CLAUDE-COMMON.md` rubric.

Adversarial review notes (additional self-grilling):

- **Risk:** "WU-04 (MD-F4 + PR-F6) is placed in Wave 1, but it carries a PR-F6 Hybrid Reviewer commitment that is a 'SLICE 3 close' commitment per SCOPING-MEMO. Is firing it BEFORE the close-walk premature?" Response: The PR-F6 commitment is "at SLICE 3 close" in the sense that SLICE 3 is closed once PR-F6 + MD-F4 + adapters are all shipped. The Hybrid Reviewer is the pair-review evidence layer for MD-F4 specifically; it fires within WU-04's full-tier cluster. The SLICE-level close-walk (WU-05) then aggregates Wave 1 evidence and stamps Memorial-D state. The two are sequential by waves, not by sub-events within WU-04.
- **Risk:** "WU-04's BFS-on-undirected adaptation surfaces a SCOPING-MEMO § 2.3 PR-F6 trigger 'including BFS-on-undirected evaluation.' Q-R23-SPEC § 0.5 deferred BFS-body modification to R25 (= WU-04). If WU-04's cluster Architect determines the inherited BFS body MUST be modified, that's a vendored-with-deltas transition for `engine/topology-overlay.ts` — a high-blast-radius change that would invalidate this plan's adapter-independence assumption." Response: This is a recognized scenario. WU-04's cluster Architect HALTs at spec time if BFS body modification proves load-bearing; the Coordinator-level mitigation is to route back as a Wave 1 gate escalation triggering a wave-plan revision (resequence WU-04 to a post-adapter wave). The Coordinator pre-commits to a wave-plan v2 emission in that case, per CLAUDE-COORDINATOR.md §Wave gate failure handling table row "Spec ambiguity surfaced by Reviewer."
- **Risk:** "Four-cluster fan-out may saturate operator review capacity at Wave 1 gate." Response: Under the 5-cluster operational cap per CLAUDE-COORDINATOR.md. Operator has stated preference for fan-out where independence is clean (NEXT-ROLE.md R24 directive). The MEMORIAL fragment merge at wave gate is mechanical (deterministic merge order; single `flock(2)` lock); the substantive review work is per-cluster Reviewer reports, which the operator can read sequentially without merge-state contention.

---

## Open questions for operator

The Coordinator does NOT resolve these — they require operator-level decisions before Wave 1 dispatch or are carry-forward from prior close-walks.

**OQ-W1-1 (NEW — load-bearing for Wave 1 fan-out cleanliness):** Adapter file-layout convention.
- **Option A (Recommended):** All three adapters MUST be parallel-class implementations against `TopologySource` interface, located at `engine/topology/slurm-source.ts`, `engine/topology/k8s-source.ts`, `engine/topology/nvlink-source.ts`. Mirrors inherited `engine/topology-overlay.ts:83-160` parallel-class precedent. Enforces clean fan-out independence (zero D4 file overlap between adapters).
- **Option B:** Defer to each cluster's Architect; SLICE 3 close-walk (WU-05) audits convention drift; retroactive harmonization round if drift surfaces.
- **Consequence of A:** Fan-out remains a true 4-cluster Wave 1; clusters self-spec inside the parallel-class envelope. Convention is enforced upfront.
- **Consequence of B:** Latent drift risk; +0–1 retroactive rounds post-Wave-2 if convention drifts; saves zero work upfront.

**OQ-W1-2 (NEW):** WU-07 tier classification.
- **Option A:** audit (close-walk audit-tier per R19/R22 precedent; Hybrid Reviewer is treated as a commitment layered on top of the audit document).
- **Option B:** full (Hybrid Reviewer pair-review-style at Phase 2 close is treated as an architecturally novel commitment warranting Architect + Implementer + Reviewer roles).
- **Consequence of A:** Lower-cost close-walk; cluster's Reviewer absorbs the Hybrid Reviewer pair-review scope.
- **Consequence of B:** Full-tier Phase-2-close round; Architect spec drafts the Hybrid Reviewer evidence package; Reviewer audits independently.
- **Default if no operator answer:** Coordinator prior is A (audit). Cluster's Memorial-Updater + Reviewer can promote to full at session start if the Hybrid Reviewer commitment is reinterpreted as load-bearing for the Phase 2 close.

**OQ-W1-3 (NEW):** SLICE 4 decomposition timing.
- **Option A (Recommended):** Defer SLICE 4 decomposition to a follow-up Coordinator invocation after WU-05 (SLICE 3 close-walk) completes. WU-06 in this plan is a single-cluster placeholder; the follow-up Coordinator call may decompose into multiple Wave-3 WUs (event-feed-core + producer-type adapters + attribution layer) after observing SLICE 3 learnings.
- **Option B:** Pre-decompose SLICE 4 into multiple WUs now (e.g., event-feed-core / firmware-adapter / deploy-adapter / config-adapter / attribution-layer / freeze-hook-coupling). Coordinator would have to invent WUs not yet traceable to a specced architecture — violating Step 1 discipline.
- **Consequence of A:** WU-06 remains a single-cluster WU at this plan's emit; follow-up Coordinator emits WAVE-PLAN-02.md after WU-05 if decomposition becomes load-bearing.
- **Consequence of B:** Wave plan invents structural assumptions about SLICE 4 architecture that should come from the Architect's spec, not the Coordinator's program-level decomposition.

**OQ-W1-4 (carry-forward; not blocking; from prior close-walks):** OQ-1 (Q-JC1) — `tools/calibrate.ts` vendoring still parked per Phase 1 close-walk § 6, SLICE 1 close-walk § 3, SLICE 2 close-walk § 3. Not needed for SLICE 3.B/3.C/SLICE 4 work. Operator gate before activating.

**OQ-W1-5 (carry-forward; not blocking; from prior close-walks):** OQ-R08-3 — Phase 2 transient detector scheduling still parked. Orthogonal to SLICE 3.B/3.C/SLICE 4. Operator gate.

**OQ-W1-6 (forward-looking; surfaces during WU-04 cluster):** LS-4 — Topology join semantics under sparse topology data. Per Q-R23-SPEC § 0.6, WU-04's cluster Architect is expected to enumerate sparse-data failure modes at spec time. If sparse-data handling requires inherited BFS body modification, that escalates to Coordinator per the "Risk: BFS body modification" pre-emit-grilling note above. Operator should expect a potential mid-Wave-1 escalation from WU-04.

---

## Wave 1 dispatch authorization

**Plan verdict:** READY-TO-DISPATCH **conditional on operator answer to OQ-W1-1** (adapter file-layout convention).

If operator selects OQ-W1-1 Option A (parallel-class — Coordinator's recommendation): Wave 1 dispatches as a 4-cluster fan-out without further coordination.

If operator selects OQ-W1-1 Option B (defer to cluster Architects): Wave 1 still dispatches as 4-cluster fan-out, but the convention-drift mitigation requires WU-05 close-walk to include an explicit "adapter convention audit" sub-section.

Wave 1 clusters authorized for dispatch (pending OQ-W1-1):

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| CL-01-A | WU-01 SLURM-ADAPTER | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-slurm-adapter`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |
| CL-01-B | WU-02 K8S-ADAPTER | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-k8s-adapter`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |
| CL-01-C | WU-03 NVLINK-ADAPTER | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-nvlink-adapter`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |
| CL-01-D | WU-04 MD-F4 + PR-F6 | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-md-f4-common-mode`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |

**Pre-dispatch operator actions:**

1. Answer OQ-W1-1 (mandatory before dispatch). OQ-W1-2 and OQ-W1-3 are not blocking — defaults apply.
2. (Recommended) Author per-cluster scope blocks at `coordination/cluster-scopes/wave-1/wu-01-slurm-adapter.md`, `wu-02-k8s-adapter.md`, `wu-03-nvlink-adapter.md`, `wu-04-md-f4-common-mode.md` per `coordination/cluster-scopes/README.md` layout convention. The `multi-track-cluster-setup.sh --scope <PATH>` flag plants each into its cluster worktree's `coordination/PRD.md`. (Coordinator did NOT author these in this invocation — they were not listed in NEXT-ROLE.md "Expected deliverables"; deferred to a follow-up Coordinator invocation OR to the operator's pre-dispatch step.)
3. Invoke `scripts/multi-track-cluster-setup.sh` once per cluster (4 invocations).
4. Cd into each cluster worktree and run `scripts/run-pipeline.sh --tier full` (4 pipeline runs; can be staggered or simultaneous).

**Post-Wave-1 actions (Coordinator-owned):**

5. At Wave 1 gate, Coordinator merges per-cluster MEMORIAL fragments to `coordination/MEMORIAL.md` under `flock(2)` per CLAUDE-COORDINATOR.md §Shared-resource arbitration.
6. Coordinator authors `coordination/WAVE-GATE-01.md` per `templates/WAVE-GATE-TEMPLATE.md`, applying the wave gate checklist to all four Reviewer reports.
7. If Wave 1 gate clean (zero CRITICAL findings across all four), Coordinator dispatches WU-05 as Wave 2 single-cluster via standard `scripts/run-pipeline.sh --tier audit`.
8. If Wave 1 gate reveals architectural convention drift (OQ-W1-1 Option B path), Coordinator emits WAVE-PLAN-02.md amending WU-05 scope to include explicit convention-audit + harmonization.

---

## Version history

| Version | Date | Trigger | What changed |
|---|---|---|---|
| v1 | 2026-05-18 | Initial PRD decomposition; first Coordinator invocation post-MR-1 vendoring | Initial 7-WU / 4-wave plan covering Phase 2 SLICE 3.B through Phase 2 close |
