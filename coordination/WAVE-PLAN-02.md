# WAVE-PLAN-02 — Wave Plan v2: Tessera Phase 2 SLICE 3.A.5 through Phase 2 close

**From:** Coordinator TPM (R24 re-invocation)
**Date:** 2026-05-18
**Version:** v2 (re-decomposition after SCOPING-MEMO MR-1 amendment carved out L0 contract sub-extension)
**Foundation:** `coordination/PRD.md` (thin pointer); `SCOPING-MEMO-v0.3.md` v0.3 @ HEAD `4a4869e` (MR-1 amendment included)
**Type:** wave plan — Phase 2 remainder DAG + wave sequencing (post-L0-CONTRACT amendment)
**Supersedes:** `coordination/WAVE-PLAN-01.md` (v1; preserved on disk per Coordinator versioning discipline)

---

## Plan summary

Eight work units extracted across five waves (v1 had 7 / 4; +1 WU and +1 wave from SCOPING-MEMO MR-1 amendment adding the L0-contract sub-extension as a SLICE 3.B precondition). **Wave 1 is a 2-cluster fan-out** (L0-CONTRACT foundation + MD-F4 empirical-validation, which is value-domain by construction on the v9Y substrate and independent of L0). **Wave 2 is a 3-cluster fan-out** of topology-ingestion adapters (Slurm / K8s / NVLink), each consuming the L0-contract surface by interface. Waves 3 / 4 / 5 are single-cluster (SLICE 3 close-walk → SLICE 4 → Phase 2 close-walk), each gated on the prior wave by D1 or close-walk convention.

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 1 | 2 (parallel) | **Yes — WU-00 (L0-CONTRACT) is the SLICE 3.B foundation** | WU-00 L0-CONTRACT + WU-04 MD-F4 hybrid Reviewer (independent of L0 by construction; uses synthetic value-domain v9Y substrate) |
| 2 | 3 (parallel) | No | WU-01 SLURM-ADAPTER + WU-02 K8S-ADAPTER + WU-03 NVLINK-ADAPTER — three topology-ingestion adapters consuming L0-contract surface; under the 5-cluster fan-out cap |
| 3 | 1 | No | WU-05 SLICE 3 close-walk (audit-tier); aggregates Wave 1 + Wave 2 outputs |
| 4 | 1 | No | WU-06 SLICE 4 event-conditional attribution (full-tier); convention-gated by SLICE 3 close |
| 5 | 1 | No | WU-07 Phase 2 close-walk (audit-tier; Hybrid Reviewer pair-review-style at close) |

**Recommended operator action for Wave 1:** dispatch two parallel clusters via `scripts/multi-track-cluster-setup.sh` per cluster, then `scripts/run-pipeline.sh --tier full` inside each worktree. Same dispatch pattern for Wave 2 (3 clusters). Single-cluster Waves 3 / 4 / 5 use standard `scripts/run-pipeline.sh` from the main worktree.

**Trade-off framing:** v1 collapsed adapters and MD-F4 into a single 4-cluster Wave 1 because the L0-contract precondition did not yet exist. v2 preserves Wave-1 fan-out (2 clusters: L0+MD-F4) and Wave-2 fan-out (3 clusters: adapters) rather than collapsing the adapters into a single sequential cluster. Total cluster-rounds (Waves 1+2) = 5, same as v1's Wave-1-only 5-cluster — but v1's Wave 1 would have exceeded the 5-cluster operational cap, so v2's 2+3 split is more conservative and lets L0-contract land before adapters consume it. MD-F4 is placed in Wave 1 (not Wave 2 with adapters) by Step 3 judgment to land PR-F6 evidence earlier without delaying adapter independence.

---

## PRD provenance

- **PRD source:** `coordination/PRD.md` (thin pointer to `SCOPING-MEMO-v0.3.md`)
- **PRD version at plan time:** v0.3 (SCOPING-MEMO) @ HEAD `4a4869e` (MR-1 amendment landed)
- **Amendment driver:** SCOPING-MEMO MR-1 amendment 2026-05-18 morning (operator-raised L0 counter-semantic preprocessing concern; A10 carve-out + new Extension 3 (b) L0 contract sub-extension + new § 3 SLICE 3.A.5 row + new § 4.2 R-E7 risk row). Operator authorization at HEAD `4a4869e`: "OK to draft and authorized to address the concerns I raised in the best path you can recommend."
- **Anti-scope clauses referenced (headline; full enumeration in SCOPING-MEMO § 2.1/2.2/2.3):**
  - A8/A11: NO real customer cluster telemetry
  - A10: NO hardware-diagnostic territory (DCGM signal generation / NVML / per-GPU fault attribution) — **but with MR-1 carve-out for measurement-domain L0 preprocessing**
  - A12/A5: NO modification to vendored detector internals (TrendBuffer, Family A-E detectors)
  - A13: NO ML-based attribution
  - A15: NO multi-region / cross-cluster federation
  - A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` preserved)
  - A17: NO DeploySignal-integration scope at Phase 1+2
- **Open PRD questions deferred to operator:** See `## Open questions for operator` below — OQ-1 (calibrate.ts) and OQ-R08-3 (transient detector scheduling) carry forward from prior close-walks; v1's OQ-W1-1 (adapter file-layout) carries forward but now applies to Wave 2 (not Wave 1); v2 surfaces 2 new OQs (OQ-W2-1 L0-contract file-layout; no MD-F4-placement OQ — Coordinator resolves via Step 3 judgment call below).

---

## Step 1 — Work unit extraction (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 1. WUs extracted from PRD / SCOPING-MEMO structure (one PRD feature or one SCOPING-MEMO SLICE row per WU); no work unit invented; no merging beyond explicit reasoning logged below. **v2 adds WU-00 (L0-CONTRACT) per SCOPING-MEMO § 3 SLICE 3.A.5 row + § 2.3 Extension 3 (b) L0 contract sub-extension (MR-1 amendment).** WU-01..WU-07 inherit v1 numbering for diff readability.

| WU ID | Source PRD feature | Acceptance criteria (frame; per-AC enumeration deferred to cluster Architect spec) | Bounding anti-scope | File tree scope |
|---|---|---|---|---|
| **WU-00 (NEW)** | SCOPING-MEMO § 2.3 Extension 3 (b) "L0 contract for Tessera" sub-extension (MR-1 amendment lines 219-228) + § 3 SLICE 3.A.5 row (MR-1 amendment line 364) + § 4.2 R-E7 risk row | Define L0 contract surface (Tessera-original file at `engine/l0/<TBD per OQ-W2-1>.ts`): (1) rate-domain output (counter→rate at L0; raw counters never reach `TrendBuffer`); (2) per-sample `actual_elapsed_seconds` first-class input; (3) missed-scrape-then-catchup detection with `slope_quality: degraded` + `missed_scrape_inferred: true`; (4) DCGM 32-bit wraparound heuristic (`next < prev` AND `prev > UINT32_MAX × 0.9`); (5) reset-vs-wrap disambiguation; (6) L0 metadata propagation (`slope_quality`, `missed_scrape_inferred`, `wraparound_handled`, `reset_detected`). Reads `SchemaDescriptor.semantic_type` from `engine/l0/schema-continuity.ts:44` (frozen vendored-at-pin). Empirical validation (counter wrap / missed-scrape catchup / variable-interval cases against a synthetic counter generator) lands in this WU as part of the contract definition; per-adapter exercises land in Wave 2. | A10 (DCGM signal *generation* / per-GPU fault attribution / NVIDIA-stack tooling remains fenced — only measurement-domain counter→rate transformation is in-scope per MR-1 carve-out); A12 (NO modification of `engine/core.ts` TrendBuffer / `engine/l0/schema-continuity.ts` internals); A11 (synthetic counter generator only — no live DCGM/NVML endpoints) | NEW `engine/l0/<TBD per OQ-W2-1>.ts` (Tessera-original); NEW `test/q-l0-contract-*.test.ts`; NEW `test/_substrate/synthetic-counter-generator.ts` (or sibling location per OQ-W2-1); READ-ONLY `engine/l0/schema-continuity.ts`, `engine/core.ts` (vendored-at-pin, must not be modified) |
| WU-01 | FR-E3b / SCOPING-MEMO § 2.3 line 218 ("HardwareTopologySource concrete impl") + § 3 SLICE 3.B row line 365 | Slurm topology file format ingestion → `TopologySnapshot`; class implements `TopologySource`; parses canonical Slurm `topology.conf` format; AC-suite to-be-enumerated by cluster Architect. Consumes WU-00 L0-contract surface by interface (per § 3 SLICE 3.B line 365 "adapters know they receive rate-domain values with elapsed-seconds metadata; do not re-implement counter handling"). | A10 (Slurm parses cluster topology, not GPU health); A11 (synthetic fixtures only — no live customer Slurm endpoint); A12 (no modification of `engine/topology-overlay.ts` body) | NEW `engine/topology/slurm-source.ts` (Tessera-original; parallel-class against `TopologySource`); NEW `test/q-slurm-adapter.test.ts`; NEW `test/_substrate/slurm-fixture-*.conf` |
| WU-02 | FR-E3b / SCOPING-MEMO § 2.3 line 218 + § 3 SLICE 3.B row line 365 | Kubernetes node-label API ingestion → `TopologySnapshot`; class implements `TopologySource`; parses K8s `corev1.NodeList` JSON shape; AC-suite to-be-enumerated by cluster Architect. Consumes WU-00 L0-contract surface by interface. | A10; A11 (synthetic K8s JSON fixtures only); A12 | NEW `engine/topology/k8s-source.ts`; NEW `test/q-k8s-adapter.test.ts`; NEW `test/_substrate/k8s-nodelist-fixture-*.json` |
| WU-03 | FR-E3b / SCOPING-MEMO § 2.3 line 218 + § 3 SLICE 3.B row line 365 + § 4.2 R-E7 | NVIDIA `nvidia-smi nvlink --status` output ingestion → `TopologySnapshot`; class implements `TopologySource`; parses canonical NVLink-topology text output. **Exemplary L0-contract consumer:** NVLink error counters are 32-bit and exemplify the wrap-handling path; this adapter's tests must exercise the WU-00 wraparound, missed-scrape, and variable-interval cases against the synthetic counter generator per R-E7 mitigation. AC-suite to-be-enumerated by cluster Architect. | A10 (parses NVLink topology + ingests NVLink error counters via L0-contract surface — NOT GPU SDC/health diagnosis); A11 (synthetic `nvidia-smi` output fixtures only); A12 | NEW `engine/topology/nvlink-source.ts`; NEW `test/q-nvlink-adapter.test.ts`; NEW `test/_substrate/nvlink-fixture-*.txt` |
| WU-04 | FR-E3b / SCOPING-MEMO § 2.3 line 267 (MD-F4) + § 3 SLICE 3.C row line 366 | Topology-aware spatial attribution layer (MD-F4): BFS-on-undirected attribution; common-mode failure-injection empirical test on v9Y fixture (rack-localized PSU event simulation); PR-F6 hybrid Reviewer pair-review (4-cell evidence matrix). AC-suite to-be-enumerated by cluster Architect; PR-F6 requires external literature citation evidence (Meta H100 SDC papers + MS/Google SDC postmortems) per SCOPING-MEMO § 2.3 PR-F6 trigger. **Value-domain by construction on v9Y synthetic substrate; does NOT ingest counter metrics; independent of WU-00 L0-contract.** | A12/A5 (NO modification to per-shard detector internals); A13 (rule-based + statistical attribution only, no ML); A16 (correlational_not_causal preserved at output) | NEW `engine/topology/common-mode-attribution.ts` (Tessera-original); NEW `test/q-md-f4-common-mode-injection.test.ts`; uses inherited `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen) |
| WU-05 | (close-walk; mirrors R19/R22 pattern; no PRD-level AC) | SLICE 3 close-walk document: aggregates Wave 1 + Wave 2 deliverables, dispositions MINORs from all five Wave-1/Wave-2 clusters, records Memorial state stamp, frames SLICE 4 entry; q01 vendoring header arithmetic refresh; carry-forward inventory. AC-suite mirrors R22 audit-tier close-walk scope. | A12; close-walk does NOT touch any production code outside the test-only header arithmetic refresh patterns established at R19/R22 | NEW `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`; minor refresh to `coordination/VENDORING-MANIFEST.md` notes column; possible R23 MINOR-3 carry-forward fix at `test/q23-hardware-topology-source.test.ts:154` per ROUND-R23-SUMMARY § Watch list |
| WU-06 | FR-E3c / SCOPING-MEMO § 2.3 line 231 + § 3 SLICE 4 row line 367; AC-P4 | Deployment-event-feed ingestion (genuinely new ingestion surface — firmware push / model redeploy / config change / env change); event-conditional **correlational** attribution (MD-F5; PR-F7 pair-review with 4-cell evidence matrix); Phase 1 freeze-hook coupling activation. Preserves Addition #26 D4 wire-format. AC-suite to-be-enumerated by cluster Architect (likely SLICE 4 sub-slicing required — see OQ-W1-3 carry-forward). | A10; A11; A13; A16 (`correlational_not_causal: true` REQUIRED on all event-conditional output); A17 (no DeploySignal-integration scope) | NEW `engine/events/*` (event-feed substrate); NEW `engine/topology/event-conditional-attribution.ts`; freeze-hook activation in inherited Phase 1 substrate (requires vendored-with-deltas check); NEW `test/q-event-feed-*.test.ts`; possible `test/_substrate/v9Z-*-cluster.ts` for 4-cell test matrix |
| WU-07 | (close-walk; mirrors R19/R22 pattern; no PRD-level AC) | Phase 2 close-walk document; Addition #25 D2 + D5 disposition stamp; Addition #26 D4 RECONFIRMED; Phase 1 freeze-hook activation coupling stamp; Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 2.3 row; Tessera Phase 3 candidate list TAGGED-FUTURE (DeploySignal integration; multi-region; etc.). | A12; A17 | NEW `coordination/PHASE-2-CLOSE-WALK.md`; final vendoring re-pin check (per SCOPING-MEMO § 9.4 vendoring policy); Tessera v1 readiness inventory |

### Merge reasoning

No merging applied. Each row above traces to one PRD feature ref or one SCOPING-MEMO SLICE row.

### Splitting reasoning

- **WU-00 split from prior single-WU SLICE 3.B framing:** v1 had no SLICE 3.A.5 row; v2 carves WU-00 as a separate WU per the MR-1 amendment which added § 3 SLICE 3.A.5 as a distinct 1-2 Q-cycle line item with its own scope (contract definition + empirical validation via synthetic counter generator) and its own R-E7 risk row. The carve-out lets WU-00 land before adapters consume the contract — preserving the operator-amended SCOPING-MEMO § 3 SLICE 3.B precondition.
- **SLICE 4 (WU-06) decomposition still deferred** per v1 reasoning (OQ-W1-3): SLICE 4 architecture (event-feed schema; freeze-hook activation pattern) is not yet specced; pre-decomposing it would invent WUs not traceable to PRD/SCOPING-MEMO at SLICE 3.A fidelity, violating Step 1 discipline.

---

## Step 2 — Dependency edge identification (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 2. Each edge cites the dependency test that fired (D1–D5) and the confidence level.

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-00** | **WU-01 (SLURM)** | **D2 (AC reference / interface contract)** | **MEDIUM** | SCOPING-MEMO § 3 SLICE 3.B row line 365: "adapters know they receive rate-domain values with elapsed-seconds metadata; do not re-implement counter handling." SLURM adapter's AC surface references WU-00 contract by interface even though SLURM topology format itself is not counter-typed; the dependency is on shared L0-contract surface so adapters don't drift their own per-adapter counter handling. See Step 3 Judgment call 1 for the asymmetry vs. NVLINK. |
| **WU-00** | **WU-02 (K8S)** | **D2** | **MEDIUM** | Same reasoning as WU-00 → WU-01 (interface-only dependency; K8s node-label API is not counter-typed but adapter's interface contract references WU-00). |
| **WU-00** | **WU-03 (NVLINK)** | **D1 (shared output ownership)** | **HIGH** | NVLink error counters are 32-bit (per SCOPING-MEMO § 4.2 R-E7 + § 2.3 line 225 "several NVLink error counters are 32-bit and can wrap on busy fabric over long runs"); the NVLINK adapter's test surface MUST exercise WU-00's wraparound, missed-scrape, and variable-interval paths against the synthetic counter generator (per WU-00 ACs above). The adapter directly imports and exercises WU-00's transformation surface, not just the interface contract. |
| WU-00 | WU-04 (MD-F4) | (no edge) | — | MD-F4 uses v9Y multi-rack cluster substrate (R23-frozen synthetic fixture); v9Y is value-domain by construction (per Q-R23-SPEC § 2.4 enumeration: nodes + edges only, no metric values flowing through); MD-F4 does not ingest counter metrics. D1/D2/D5 all do not fire. **WU-04 confirmed independent of WU-00.** |
| WU-01 | WU-05 | D1 (shared output ownership) | HIGH | WU-05 close-walk reads `engine/topology/slurm-source.ts` deliverable + its Reviewer report to aggregate SLICE 3 state stamp. |
| WU-02 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/k8s-source.ts` deliverable + Reviewer report. |
| WU-03 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/nvlink-source.ts` deliverable + Reviewer report. |
| WU-04 | WU-05 | D1 | HIGH | WU-05 reads `engine/topology/common-mode-attribution.ts` + PR-F6 hybrid Reviewer evidence package. |
| **WU-00** | **WU-05** | **D1** | **HIGH** | WU-05 close-walk reads WU-00's L0-contract file + its Reviewer report (audits R-E7 mitigation status; stamps L0 contract surface as SLICE-3 deliverable). |
| WU-05 | WU-06 | D2 (AC reference / convention) | MEDIUM | NOT a strict D1 — WU-06 (SLICE 4) does not read WU-05 outputs at runtime. Edge fires on project convention (SLICE-close documents land before next-SLICE entry, per Phase 1 close → Phase 2 SLICE 1, SLICE 1 close → SLICE 2, SLICE 2 close → SLICE 3 precedents). Step 3 Judgment call 4 retains this edge. |
| WU-06 | WU-07 | D1 | HIGH | Phase 2 close-walk reads SLICE 4 deliverables (event-feed substrate, event-conditional attribution layer, 4-cell test matrix evidence) + Hybrid Reviewer evidence. |

### Among Wave 1 candidates (WU-00, WU-04) — pairwise check

| Pair | D1 (shared output)? | D2 (AC reference)? | D5 (write-conflict)? | D4 (file-tree overlap)? |
|---|---|---|---|---|
| WU-00 ↔ WU-04 | NO — WU-00 writes `engine/l0/<TBD>.ts` + `test/q-l0-contract-*.test.ts` + counter generator fixture; WU-04 writes `engine/topology/common-mode-attribution.ts` + `test/q-md-f4-*.test.ts` and uses v9Y fixture (R23-frozen). Zero file overlap. | NO — WU-00's ACs reference counter-rate transformation; WU-04's ACs reference BFS-on-undirected + common-mode attribution shape. Disjoint AC surfaces. | N/A — Tessera has no migration surface. | NO — `engine/l0/*` ≠ `engine/topology/*`; test directories distinct. |

### Among Wave 2 candidates (WU-01, WU-02, WU-03) — pairwise check

| Pair | D1 (shared output)? | D2 (AC reference)? | D5 (write-conflict)? | D4 (file-tree overlap)? |
|---|---|---|---|---|
| WU-01 ↔ WU-02 | NO — each adapter produces its own `TopologySource` impl in its own file (parallel-class). Neither reads from the other. | NO — adapter ACs (parsing input format → `TopologySnapshot` shape) reference `engine/types/verdict.ts` types only (frozen at R23). Both consume WU-00 contract surface (Wave 1 deliverable, frozen at Wave 2 dispatch). | N/A | NO if parallel-class architecture followed (each in `engine/topology/<source>.ts`). YES if subclass adopted. **Resolution: parallel-class convention preserved from v1 OQ-W1-1.** |
| WU-01 ↔ WU-03 | NO | NO | N/A | Same as WU-01 ↔ WU-02 (resolvable via parallel-class). |
| WU-02 ↔ WU-03 | NO | NO | N/A | Same. |

**Verdict for Wave 1:** Zero D1/D2/D5 edges between the two candidates. D4 zero. Clean 2-cluster fan-out.
**Verdict for Wave 2:** Zero D1/D2/D5 edges between any pair. D4 contention resolvable via OQ-W1-1 parallel-class convention. Clean 3-cluster fan-out under the 5-cluster operational cap.

### Contention risks (not dependencies)

| Work units | Shared files | Resolution |
|---|---|---|
| WU-00, WU-01, WU-02, WU-03 | `engine/l0/schema-continuity.ts` (READ only — WU-00 reads `SchemaDescriptor.semantic_type` at line 44 to dispatch counter vs gauge handling; adapters do not touch this file directly) | Read-only across all four. Vendored-at-pin; no modification. |
| WU-00, WU-01, WU-02, WU-03, WU-04 | `engine/types/verdict.ts` (READ only — types imported; type-union extensions shipped at R18+R23; frozen) | Read-only; no write contention. |
| WU-01, WU-02, WU-03 | `engine/topology-overlay.ts` (READ only — adapters import `TopologySource` interface + `FetchContext` + `computeSnapshotHash`) | Read-only; vendored-at-pin and frozen. Any cluster requiring body modification HALTs and routes back. |
| WU-01, WU-02, WU-03 | `coordination/VENDORING-MANIFEST.md` | Tessera-original files do NOT appear in the manifest per R23 precedent (`engine/hardware-topology-source.ts` was Tessera-original and added no manifest entry). Adapters are Tessera-original → zero manifest contention. Same for WU-00 (Tessera-original new file). |
| All Wave-1 / Wave-2 clusters | `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `CLAUDE-*.md` reinforcement files | Arbitrated by Coordinator at wave gate per CLAUDE-COORDINATOR.md §"Shared-resource arbitration" — each cluster writes to `coordination/clusters/<cluster-id>/MEMORIAL-fragment.md`; Coordinator merges under `flock(2)` on `coordination/.MEMORIAL.lock` at wave gate. |
| WU-04 ↔ inherited engine | `engine/topology-overlay.ts` BFS (line 257+) | Read-only by adapters; potentially extended-by-pattern by WU-04. If WU-04 needs to MODIFY the inherited BFS body, that's a vendored-with-deltas transition for `engine/topology-overlay.ts` — high impact. Per Q-R23-SPEC § 0.5 Approach A, R23 anti-scope prohibited inherited BFS modification; same convention applies at R24/R25. Cluster WU-04's Architect HALTs if BFS body modification proves load-bearing for MD-F4 (escalation routes back to Coordinator per § "Wave gate failure handling"). |

---

## Step 3 — Claude judgment at ambiguity boundaries

### Judgment call 1 — D1 vs D2 asymmetry across L0-CONTRACT → adapter edges

- **Ambiguity:** SCOPING-MEMO § 3 SLICE 3.B line 365 reads "adapters know they receive rate-domain values with elapsed-seconds metadata; do not re-implement counter handling" — phrased uniformly across all three adapters. But Slurm `topology.conf` and K8s node-label API are not counter-typed surfaces — they parse cluster topology configuration. Only NVLink (per § 2.3 line 225 + § 4.2 R-E7) directly handles 32-bit counters at the wrap-handling surface. The question is whether all three adapters' edges to WU-00 are D1 HIGH (shared output ownership: adapter imports WU-00 transform function) or whether SLURM/K8S are only D2 MEDIUM (AC reference: adapter knows the contract by interface but doesn't import the transform function).
- **Candidate resolutions:**
  - **Uniform D1 HIGH:** Treat all three adapter edges identically; assume each adapter will import WU-00's transform surface even if Slurm/K8s only exercise the metadata-pass-through path. Conservative; preserves the "adapters consume L0 contract by interface" framing verbatim.
  - **Asymmetric (D1 HIGH for NVLINK; D2 MEDIUM for SLURM/K8S):** NVLINK clearly exercises the wrap-handling path empirically (32-bit error counters); SLURM/K8S only consume the interface (no counter ingestion at the topology-format layer). Honest about the dependency strength variation.
- **Claude's judgment:** Asymmetric — D1 HIGH for NVLINK; D2 MEDIUM for SLURM/K8S.
- **Reasoning:** The deterministic D-test framework distinguishes D1 (strict output-ownership) from D2 (AC-reference / interface contract) precisely so the Coordinator can record dependency strength honestly. NVLINK's R-E7 mitigation is load-bearing per § 4.2 ("each adapter's tests must exercise the missed-scrape, wrap, and variable-interval cases against a synthetic counter generator" — but only NVLINK has 32-bit counters to exercise; Slurm/K8s have no counter surface to wrap). Recording uniform D1 would overstate Slurm/K8s coupling and obscure the fact that those adapters could potentially run BEFORE WU-00 if only topology parsing is in scope. However — since v2 places all three adapters in Wave 2 after WU-00 lands in Wave 1, the operational outcome is identical to uniform D1. The asymmetric classification documents the dependency-strength variation for future cycle reference (e.g., if a future round splits SLURM/K8S from NVLINK by tier or scope).
- **Resulting edges:** WU-00 → WU-01 (D2 MEDIUM); WU-00 → WU-02 (D2 MEDIUM); WU-00 → WU-03 (D1 HIGH). All three place adapters in Wave 2.

### Judgment call 2 — MD-F4 placement (Wave 1 with WU-00 vs Wave 2 with adapters)

- **Ambiguity:** WU-04 (MD-F4 + PR-F6 hybrid Reviewer) is INDEPENDENT of WU-00 (Step 2 pairwise check confirmed zero edges) AND independent of adapters (v1 Step 2 confirmed zero edges; preserved at v2). MD-F4 could run in Wave 1 alongside WU-00, OR in Wave 2 alongside adapters, OR even in its own Wave 1.5 (operationally a 3-wave structure becomes 4). NEXT-ROLE.md framing surfaces both options: (a) WU-00 single-cluster Wave 1 + 4-cluster adapters+MD-F4 Wave 2; (b) WU-00 + MD-F4 in 2-cluster Wave 1 + 3-cluster adapters Wave 2.
- **Candidate resolutions:**
  - **Wave 1 (with WU-00):** Operator's option (b). 2-cluster fan-out at Wave 1 (still under 5-cluster cap). MD-F4's PR-F6 hybrid Reviewer evidence lands earlier; SLICE 3 close-walk (Wave 3) sees PR-F6 + L0-contract evidence together. Adapter Wave 2 dispatches cleanly with 3 clusters.
  - **Wave 2 (with adapters):** Operator's option (a). 1-cluster Wave 1 (WU-00 alone). 4-cluster Wave 2 (adapters + MD-F4). MD-F4 review competes with three adapter reviews at Wave 2 gate; PR-F6 hybrid Reviewer (heavyweight) bundled with three adapter Reviewer reports.
- **Claude's judgment:** Wave 1 (with WU-00) — option (b).
- **Reasoning:** Three factors favor Wave 1 placement:
  1. **Operator preference for fan-out where independence is clean.** WU-04 ↔ WU-00 independence is structurally clean (zero D-test edges). The R24 directive specifically calls out "do not collapse them into a single cluster for convenience or out of conservatism — if independence is clean, fan out." Placing WU-04 in Wave 2 (when it could land in Wave 1) is collapsing-for-convenience.
  2. **Operator review-capacity balancing.** PR-F6 hybrid Reviewer is heavyweight (4-cell evidence matrix + external literature citation per SCOPING-MEMO § 2.3 line 273); pairing it with a single co-cluster (WU-00) at Wave 1 gate keeps operator attention budget cleaner than bundling it with three adapter Reviewer reports at Wave 2 gate.
  3. **PR-F6 evidence landing parallel to L0-contract.** Both Wave 1 deliverables are SLICE 3 architectural foundations (MD-F4 = topology-aware attribution layer; L0-contract = counter-semantic preprocessing). Landing them together at Wave 1 close gives the SLICE 3 close-walk (Wave 3) clean separation: Wave 1 evidence (foundations) + Wave 2 evidence (adapters consuming both foundations).
  
  Wave 1 (with WU-00) is the Coordinator's recommendation. The opposite choice (Wave 2 with adapters) does not violate any discipline — it would just delay MD-F4 by one wave.
- **Resulting placement:** WU-04 in Wave 1; Wave 1 is a clean 2-cluster fan-out.

### Judgment call 3 — Adapter file-layout convention (parallel-class vs subclass) — carry-forward from v1

Same as v1 Judgment call 2 (now applies to Wave 2 instead of Wave 1). Coordinator pre-declares parallel-class architecture; surfaced as OQ-W1-1 (now applies to Wave 2). No change in reasoning.

### Judgment call 4 — Wave 3/4 sequencing (WU-05 close-walk before WU-06 SLICE 4 start) — carry-forward from v1

Same as v1 Judgment call 3. Sequential (separate Waves 3, 4). Three precedents (Phase 1 close → SLICE 1; SLICE 1 → SLICE 2; SLICE 2 → SLICE 3) all sequence close-walks before next-SLICE entry. Convention is load-bearing for spec-drafting quality.

---

## Step 4 — DAG validation

- [x] **Cycle check.** No circular dependencies. DAG is a feed-forward graph: WU-00 + WU-04 (Wave 1) → WU-01/02/03 (Wave 2) → WU-05 (Wave 3) → WU-06 (Wave 4) → WU-07 (Wave 5). WU-00 also has a direct edge to WU-05 (close-walk reads its contract definition). No back-edges.
- [x] **Island check.** No work units with zero edges in or out. WU-00 has 4 outbound (→ WU-01, WU-02, WU-03, WU-05). WU-04 has 1 outbound (→ WU-05). WU-01/02/03 each have 1 outbound (→ WU-05) and 1 inbound (from WU-00). WU-05 has 4 inbound (from WU-00, WU-01, WU-02, WU-03, WU-04 = 5 — corrected). Chain continues WU-05 → WU-06 → WU-07.
- [x] **Foundation identification.** Per CLAUDE-COORDINATOR.md §Step 4 "Work units whose outputs are inputs to 3+ other work units **across 2+ domains/modules** are foundations." **WU-00 (L0-CONTRACT) feeds 4 outbound WUs** (WU-01 SLURM, WU-02 K8S, WU-03 NVLINK in the `engine/topology/*` module; WU-05 close-walk in the `coordination/*` module) **across 2 domains** (engine/topology + coordination). **WU-00 is the SLICE 3.B foundation** and MUST land in Wave 1 regardless of its own dep-in count (zero inbound). WU-04 (MD-F4) feeds only WU-05 (1 outbound) — not a foundation under the strict ≥3-outbound × ≥2-domain test, but placed in Wave 1 by Step 3 Judgment call 2.

---

## Step 5 — Wave sequencing

| Wave | Work units | Rationale |
|---|---|---|
| 1 | WU-00 (L0-CONTRACT), WU-04 (MD-F4 + PR-F6 hybrid Reviewer) | WU-00 is the SLICE 3.B foundation (Step 4 foundation identification). WU-04 is independent of WU-00 (Step 2 pairwise; Step 3 Judgment call 2). 2-cluster fan-out under the 5-cluster cap. |
| 2 | WU-01 (SLURM-ADAPTER), WU-02 (K8S-ADAPTER), WU-03 (NVLINK-ADAPTER) | All three consume WU-00 L0-contract surface (Step 2 D1/D2 edges) and are independent of each other (Step 2 pairwise). 3-cluster fan-out under the cap. D4 contention resolved via OQ-W1-1 parallel-class convention. |
| 3 | WU-05 (SLICE 3 close-walk) | All Wave-1 + Wave-2 deliverables (5 source WUs) feed WU-05's close-walk inventory. D1 edges from each. Audit tier (mirrors R19/R22 close-walk pattern). |
| 4 | WU-06 (SLICE 4 event-conditional attribution) | Convention-gated by WU-05 close-walk completion (Judgment call 4). Full tier. May surface SLICE 4 sub-decomposition (OQ-W1-3 carry-forward) at cluster Architect's brainstorm phase. |
| 5 | WU-07 (Phase 2 close-walk) | D1-gated by WU-06 SLICE 4 deliverables. Audit tier (mirrors R19/R22 pattern); Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 2.3 commitment. See OQ-W1-2 carry-forward on tier classification. |

### Wave dispatch order (within each wave, parallel)

Within Wave 1, the two clusters dispatch in parallel as separate worktrees per `scripts/multi-track-cluster-setup.sh`. Within Wave 2, the three clusters dispatch in parallel similarly. Single-cluster Waves 3 / 4 / 5 use standard `scripts/run-pipeline.sh` from the main worktree.

No `CLUSTER-HANDOFF-*.md` artifacts are pre-created at plan time — those are authored at the dispatch of target clusters per CLAUDE-COORDINATOR.md §Cluster handoff inventory. The full handoff inventory (forward-looking) is recorded below.

---

## Step 6 — Tier classifications

Per the tier rubric inlined in `CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5). **Each cluster self-governs its own tier at session start; this column records the Coordinator's prior, not a binding instruction.**

| WU ID | Coordinator tier | Matched criteria | Rationale |
|---|---|---|---|
| **WU-00** | **full** | **A1 (new dependency on counter-semantic metadata flow), A2 (new architectural pattern — first L0 contract surface in Tessera tree), A4 (novel data model for `slope_quality` / `missed_scrape_inferred` / `wraparound_handled` / `reset_detected` metadata)** | **SLICE 3.B foundation per Step 4; per-spec L0 invariants are load-bearing for adapter correctness (R-E7); empirical validation surface (synthetic counter generator) is new architectural primitive. Warrants Architect pre-emit-grilling + Reviewer cold-audit.** |
| WU-01 | full | A1 (new external dependency — Slurm `topology.conf` parsing), A4 (novel data model — Slurm format shape mapping) | First ingestion adapter against `HardwareTopologySource` pattern; new external-format parser; warrants Architect + Reviewer cold-audit. |
| WU-02 | full | A1 (new external dependency — K8s `corev1.NodeList` JSON shape), A4 (novel data model — K8s shape mapping) | New external schema; warrants full-tier rigor. |
| WU-03 | full | A1 (new external dependency — NVLink CLI text output + NVLink error counter ingestion), A4 (novel data model — NVLink-topology text format parsing + L0-contract exercise surface) | Exemplary L0-contract consumer (32-bit wrap path); R-E7 mitigation lands here; warrants full-tier rigor including counter-handling Reviewer audit. |
| WU-04 | full | A2 (new architectural pattern — spatial attribution layer), A4 (novel data model — common-mode attribution shape), PR-F6 pair-review trigger (hybrid Reviewer commitment per SCOPING-MEMO § 2.3) | First implementation of MD-F4 attribution; PR-F6 hybrid Reviewer ONLY fires in full-tier; warrants Architect + Implementer + Hybrid Reviewer. |
| WU-05 | audit | S4 (tactical follow-up to recent rounds; close-walk pattern), S3 (single bounded item — close-walk document + minor refresh) | Mirrors R19 (SLICE 1 close-walk audit-tier) and R22 (SLICE 2 close-walk audit-tier) precedents. |
| WU-06 | full | A1 (new external dependency — deployment-event feed ingestion: firmware/deploy/config/env producers), A2 (new architectural pattern — event-conditional attribution; freeze-hook coupling), A4 (novel data model — event-feed schema; 4-cell evidence matrix), PR-F7 pair-review trigger | New ingestion surface (genuinely novel per SCOPING-MEMO § 2.3 line 231); MD-F5 pair-review trigger; freeze-hook activation couples back into Phase 1 (high blast radius A6 candidate); warrants full-tier rigor. |
| WU-07 | audit | S4 (tactical follow-up), S3 (single bounded item — close-walk document); BUT Hybrid Reviewer pair-review-style at close is a full-tier commitment per SCOPING-MEMO § 2.3 row | **Tier classification ambiguity carry-forward from v1 OQ-W1-2:** audit per close-walk pattern OR full if Hybrid Reviewer treated as architecturally novel. Coordinator prior is audit; cluster's Memorial-Updater + Reviewer can promote at session start. |

### Tier prior discrepancies

(Empty — v1 had no wave gates yet; v2 introduces no new data. Future wave gates will populate this table.)

| WU ID | Coordinator prior | Cluster self-assessed | Wave gate where surfaced |
|---|---|---|---|
| — | — | — | — |

---

## Cluster handoff inventory

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, handoff artifacts are created at dispatch of the target cluster (not pre-created at plan time). The list below is forward-looking — each row identifies a directed dependency edge that will produce a `CLUSTER-HANDOFF-NN-WUA-WUB.md` artifact at the appropriate wave gate.

| Handoff artifact (to be created) | From WU | To WU | Wave boundary | D-test that fired |
|---|---|---|---|---|
| `CLUSTER-HANDOFF-02-WU00-WU01.md` | WU-00 (Wave 1) | WU-01 (Wave 2) | Wave 1 → 2 gate | D2 MEDIUM (SLURM adapter consumes L0-contract surface by interface) |
| `CLUSTER-HANDOFF-02-WU00-WU02.md` | WU-00 (Wave 1) | WU-02 (Wave 2) | Wave 1 → 2 gate | D2 MEDIUM (K8S adapter consumes L0-contract surface by interface) |
| `CLUSTER-HANDOFF-02-WU00-WU03.md` | WU-00 (Wave 1) | WU-03 (Wave 2) | Wave 1 → 2 gate | D1 HIGH (NVLINK adapter directly exercises WU-00 wrap-handling path) |
| `CLUSTER-HANDOFF-03-WU00-WU05.md` | WU-00 (Wave 1) | WU-05 (Wave 3) | Wave 2 → 3 gate | D1 HIGH (close-walk reads L0-contract deliverable) |
| `CLUSTER-HANDOFF-03-WU01-WU05.md` | WU-01 (Wave 2) | WU-05 (Wave 3) | Wave 2 → 3 gate | D1 (close-walk reads SLURM adapter output) |
| `CLUSTER-HANDOFF-03-WU02-WU05.md` | WU-02 (Wave 2) | WU-05 (Wave 3) | Wave 2 → 3 gate | D1 (close-walk reads K8S adapter output) |
| `CLUSTER-HANDOFF-03-WU03-WU05.md` | WU-03 (Wave 2) | WU-05 (Wave 3) | Wave 2 → 3 gate | D1 (close-walk reads NVLINK adapter output) |
| `CLUSTER-HANDOFF-03-WU04-WU05.md` | WU-04 (Wave 1) | WU-05 (Wave 3) | Wave 2 → 3 gate | D1 (close-walk reads MD-F4 + PR-F6 evidence) |
| `CLUSTER-HANDOFF-04-WU05-WU06.md` | WU-05 (Wave 3) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2 / convention (close-walk entry-framing feeds SLICE 4 Architect spec input) |
| `CLUSTER-HANDOFF-05-WU06-WU07.md` | WU-06 (Wave 4) | WU-07 (Wave 5) | Wave 4 → 5 gate | D1 (Phase 2 close-walk reads SLICE 4 deliverables) |

Template: `templates/CLUSTER-HANDOFF-TEMPLATE.md`.

---

## Pre-emit grilling

Per `CLAUDE-COMMON.md` Superpowers Review block + Coordinator's pre-emit grilling discipline (CLAUDE-COORDINATOR.md):

- [x] **Every dependency edge is verifiable.** Step 2's table rows each cite a specific D-test with concrete reasoning. The L0-CONTRACT → adapter edges record D1/D2 asymmetry honestly (NVLINK D1 HIGH; SLURM/K8S D2 MEDIUM) per Step 3 Judgment call 1. The WU-05 → WU-06 MEDIUM edge is explicitly flagged in Step 3 Judgment call 4 (convention-based, not strict D1). No silent treatment.
- [x] **No unstated assumptions.** The WU-04 placement decision is surfaced as Judgment call 2 with reasoning (not silently placed). The L0-CONTRACT D1/D2 asymmetry is surfaced as Judgment call 1 rather than uniformly D1 (which would overstate Slurm/K8s coupling). The "parallel-class architecture" assumption for Wave 2 fan-out carries forward from v1 OQ-W1-1. The "SLICE 4 decomposition" deferral carries forward as OQ-W1-3.
- [x] **No scope added beyond PRD/SCOPING-MEMO.** Every WU traces to a SCOPING-MEMO § 2.3 / § 3 row or PRD FR-E3a/b/c row. WU-00 traces to SCOPING-MEMO § 2.3 Extension 3 (b) L0 contract sub-extension (MR-1 amendment lines 219-228) + § 3 SLICE 3.A.5 row (line 364) + § 4.2 R-E7 row (line 416). Close-walk WUs (WU-05, WU-07) trace to convention-anchored R19/R22 precedent.
- [x] **Cluster can act without guessing.** Each WU has (a) PRD/SCOPING-MEMO trace, (b) frame-level AC scope (cluster Architect enumerates exhaustive AC list per the cluster's spec), (c) bounding anti-scope, (d) file tree scope (NEW / READ-ONLY annotations). WU-00 explicitly cites the 6 invariants and the synthetic counter generator surface.
- [x] **DAG is acyclic.** Step 4 cycle check passed (feed-forward graph: Wave-1 → Wave-2 → ... → Wave-5).
- [x] **Tier priors are defensible.** Each tier classification cites specific A/S/Z criteria. WU-00's full-tier prior cites A1+A2+A4 (matches operator's NEXT-ROLE.md line 16 prior — confirmed independent agreement).

Adversarial review notes (additional self-grilling):

- **Risk:** "WU-00's file-layout (`engine/l0/<TBD>.ts`) is left as OQ-W2-1 — could three concurrent Wave-2 adapter clusters drift if each invents its own consumption pattern when WU-00 lands at Wave 1 close with file-layout decided by WU-00's cluster Architect (not the Coordinator)?" Response: WU-00 is a single Wave-1 cluster — its Architect makes the file-layout choice cleanly; no concurrent-cluster drift risk. The OQ-W2-1 surfaces the convention choice to the operator BEFORE WU-00 dispatches so the cluster doesn't have to invent it. If operator defers OQ-W2-1, WU-00's cluster Architect picks; downstream adapters in Wave 2 read whatever location is shipped.
- **Risk:** "WU-04's BFS-on-undirected adaptation surfaces a SCOPING-MEMO § 2.3 PR-F6 trigger 'including BFS-on-undirected evaluation.' Same risk as v1: if WU-04's Architect determines inherited BFS body modification is load-bearing, that's a vendored-with-deltas transition for `engine/topology-overlay.ts` invalidating the adapter-independence assumption." Response: Carry-forward from v1; same mitigation. WU-04's cluster Architect HALTs at spec time if BFS body modification proves load-bearing; routing back triggers wave-plan-v3 emission resequencing WU-04 to a post-adapter wave. CLAUDE-COORDINATOR.md §Wave gate failure handling table row "Spec ambiguity surfaced by Reviewer" governs.
- **Risk:** "WU-00 spec might surface architectural ambiguity about reset-vs-wrap disambiguation under degenerate inputs (e.g., counter at exactly `UINT32_MAX × 0.9` boundary; reset coinciding with delta wrap) requiring escalation." Response: WU-00 is full-tier; the Architect's brainstorm phase explores degenerate inputs and surfaces ambiguity as HALT-DIAGNOSTIC at spec time. The MR-1 amendment's invariant enumeration (rate-domain output; per-sample `actual_elapsed_seconds`; missed-scrape `slope_quality: degraded`; wrap heuristic threshold; reset disambiguation; metadata propagation) is exhaustive enough that ambiguity should be confined to threshold tuning (which is Implementation choice, not architectural).
- **Risk:** "Wave 2 fan-out (3 adapters) immediately consumes WU-00 — but WU-00's Reviewer report might surface a MAJOR finding requiring rework. Are we ready for Wave 2 to depend on a still-being-refined WU-00 contract?" Response: This is the wave gate's job. Wave 1 gate (Coordinator-owned) MUST be clean (zero CRITICAL findings; no MAJOR contract changes) before Wave 2 dispatches. If Wave 1 gate surfaces a MAJOR contract-shape issue, the Coordinator emits WAVE-PLAN-v3 amending the Wave-2 entry framing. CLAUDE-COORDINATOR.md § wave-gate-failure-handling table governs.
- **Risk:** "5 waves is one more than v1 (4). Is the +1 wave a cost the operator is willing to pay for the L0-contract precondition?" Response: This is the operator-level tradeoff of the MR-1 amendment itself (operator-authorized 2026-05-18 morning). The Coordinator's job is to surface the wave count honestly, not to suppress it by collapsing WU-00 into a SLICE-3.B cluster (which would re-invite the per-adapter counter-handling drift the L0-contract carve-out exists to prevent).

---

## Open questions for operator

The Coordinator does NOT resolve these — they require operator-level decisions before Wave 1 dispatch or are carry-forward from prior close-walks.

**OQ-W2-1 (NEW — load-bearing for WU-00 file layout):** L0-contract module location.
- **Option A (Recommended):** `engine/l0/counter-rate-transform.ts` (matches existing `engine/l0/schema-continuity.ts` neighbor convention; module name describes the transformation operation; surface-name-vs-location-name parallel to schema-continuity).
- **Option B:** `engine/l0/contract.ts` (module name describes the abstract role rather than the operation; closer to the "L0 contract" terminology in SCOPING-MEMO).
- **Option C:** `engine/l0/transform/index.ts` + subdirectory expansion (anticipates future per-source transforms — DCGM/Prometheus/OpenMetrics/etc.).
- **Consequence of A:** Single-file colocated with schema-continuity; matches existing convention; tightest blast radius.
- **Consequence of B:** Slightly more abstract naming; adapter imports read more naturally (`import { L0Contract } from 'engine/l0/contract'`).
- **Consequence of C:** Premature directory split; YAGNI risk if Tessera stays single-source for Phase 2.
- **Default if no operator answer:** Coordinator prior is A. WU-00's cluster Architect can revisit at spec time but the file location is convention, not architectural — should not require operator escalation if Architect picks A.

**OQ-W1-1 (carry-forward from v1; now applies to Wave 2 instead of Wave 1):** Adapter file-layout convention.
- **Option A (Recommended):** All three adapters MUST be parallel-class implementations against `TopologySource` interface, located at `engine/topology/slurm-source.ts`, `engine/topology/k8s-source.ts`, `engine/topology/nvlink-source.ts`. Mirrors inherited `engine/topology-overlay.ts:83-160` parallel-class precedent.
- **Option B:** Defer to each cluster's Architect; SLICE 3 close-walk (WU-05) audits convention drift; retroactive harmonization round if drift surfaces.
- **Consequence of A:** Wave 2 fan-out clean (zero D4 file overlap between adapters).
- **Consequence of B:** Latent drift risk; +0–1 retroactive rounds post-Wave-3 if drift surfaces.

**OQ-W1-2 (carry-forward from v1):** WU-07 tier classification.
- **Option A:** audit (close-walk audit-tier per R19/R22 precedent; Hybrid Reviewer is a commitment layered on top of the audit document).
- **Option B:** full (Hybrid Reviewer pair-review-style at Phase 2 close treated as architecturally novel; warrants Architect + Implementer + Reviewer roles).
- **Default if no operator answer:** Coordinator prior is A. Cluster's Memorial-Updater + Reviewer can promote at session start.

**OQ-W1-3 (carry-forward from v1):** SLICE 4 decomposition timing.
- **Option A (Recommended):** Defer SLICE 4 decomposition to a follow-up Coordinator invocation after WU-05 (SLICE 3 close-walk) completes. WU-06 in this plan is a single-cluster placeholder.
- **Option B:** Pre-decompose SLICE 4 now (e.g., event-feed-core / firmware-adapter / deploy-adapter / config-adapter / attribution-layer / freeze-hook-coupling) — violates Step 1 discipline (inventing WUs not yet traceable to specced architecture).
- **Default if no operator answer:** A. Follow-up Coordinator invocation emits WAVE-PLAN-03.md after WU-05 if SLICE 4 decomposition becomes load-bearing.

**OQ-W1-4 (carry-forward; not blocking; from prior close-walks):** OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring still parked per Phase 1 close-walk § 6, SLICE 1 close-walk § 3, SLICE 2 close-walk § 3. Not needed for SLICE 3.A.5/3.B/3.C/SLICE 4 work. Operator gate before activating.

**OQ-W1-5 (carry-forward; not blocking; from prior close-walks):** OQ-R08-3 — Phase 2 transient detector scheduling still parked. Orthogonal to SLICE 3.A.5/3.B/3.C/SLICE 4. Operator gate.

**OQ-W1-6 (forward-looking; surfaces during WU-04 cluster):** LS-4 — Topology join semantics under sparse topology data. Per Q-R23-SPEC § 0.6, WU-04's cluster Architect is expected to enumerate sparse-data failure modes at spec time. If sparse-data handling requires inherited BFS body modification, that escalates to Coordinator per the "Risk: BFS body modification" pre-emit-grilling note above. Operator should expect a potential mid-Wave-1 escalation from WU-04.

---

## Wave 1 dispatch authorization

**Plan verdict:** READY-TO-DISPATCH **conditional on operator answer to OQ-W2-1** (L0-contract module location). OQ-W1-1 (adapter file-layout) is not blocking for Wave 1 — it applies to Wave 2; operator can answer it at the Wave 1 → 2 gate. OQ-W1-2 / OQ-W1-3 / OQ-W1-4 / OQ-W1-5 / OQ-W1-6 are not blocking.

If operator selects OQ-W2-1 Option A (`engine/l0/counter-rate-transform.ts` — Coordinator's recommendation): Wave 1 dispatches as a 2-cluster fan-out without further coordination.

If operator selects OQ-W2-1 Option B or C: Wave 1 still dispatches as 2-cluster fan-out with the corresponding location override; WU-00's cluster Architect bakes the location into the spec.

If operator defers (selects Coordinator default A): Wave 1 dispatches as 2-cluster fan-out per Coordinator prior.

Wave 1 clusters authorized for dispatch (pending OQ-W2-1):

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| CL-01-A | WU-00 L0-CONTRACT | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-l0-contract`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |
| CL-01-B | WU-04 MD-F4 + PR-F6 | full | `scripts/multi-track-cluster-setup.sh` → worktree branch `r24-md-f4-common-mode`; cluster runs `scripts/run-pipeline.sh --tier full` inside the worktree |

**Pre-dispatch operator actions:**

1. Answer OQ-W2-1 (recommended before WU-00 dispatch — Coordinator default A applies if no answer).
2. (Recommended) Author per-cluster scope blocks at `coordination/cluster-scopes/wave-1/wu-00-l0-contract.md`, `wu-04-md-f4-common-mode.md` per `coordination/cluster-scopes/README.md` layout convention. The `multi-track-cluster-setup.sh --scope <PATH>` flag plants each into its cluster worktree's `coordination/PRD.md`.
3. Invoke `scripts/multi-track-cluster-setup.sh` once per Wave-1 cluster (2 invocations).
4. Cd into each cluster worktree and run `scripts/run-pipeline.sh --tier full` (2 pipeline runs; can be staggered or simultaneous).

**Post-Wave-1 actions (Coordinator-owned):**

5. At Wave 1 gate, Coordinator merges per-cluster MEMORIAL fragments to `coordination/MEMORIAL.md` under `flock(2)` per CLAUDE-COORDINATOR.md §Shared-resource arbitration.
6. Coordinator authors `coordination/WAVE-GATE-01.md` per `templates/WAVE-GATE-TEMPLATE.md`, applying the wave gate checklist to both Reviewer reports.
7. If Wave 1 gate clean (zero CRITICAL findings; WU-00 contract surface stable), operator answers OQ-W1-1 (adapter file-layout convention) and Coordinator dispatches Wave 2 (WU-01, WU-02, WU-03 in parallel via `scripts/multi-track-cluster-setup.sh` per cluster + `scripts/run-pipeline.sh --tier full` in each worktree).
8. If Wave 1 gate surfaces WU-00 contract-shape MAJOR or CRITICAL, Coordinator emits WAVE-PLAN-03.md with amended WU-00 + dependent-WU rescoping. Wave 2 dispatch holds.

**Wave 2 dispatch (forward-looking):**

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| CL-02-A | WU-01 SLURM-ADAPTER | full | worktree branch `r25-slurm-adapter`; `scripts/run-pipeline.sh --tier full` |
| CL-02-B | WU-02 K8S-ADAPTER | full | worktree branch `r25-k8s-adapter`; `scripts/run-pipeline.sh --tier full` |
| CL-02-C | WU-03 NVLINK-ADAPTER | full | worktree branch `r25-nvlink-adapter`; `scripts/run-pipeline.sh --tier full` |

---

## Version history

| Version | Date | Trigger | What changed |
|---|---|---|---|
| v1 | 2026-05-18 | Initial PRD decomposition; first Coordinator invocation post-MR-1 vendoring | Initial 7-WU / 4-wave plan covering Phase 2 SLICE 3.B through Phase 2 close. WAVE-PLAN-01.md preserved on disk. |
| v2 | 2026-05-18 | SCOPING-MEMO MR-1 amendment carved out L0 contract sub-extension (A10 carve-out + Extension 3 (b) sub-extension + § 3 SLICE 3.A.5 row + § 4.2 R-E7 row) at HEAD `4a4869e`. Re-invocation needed because v1 pre-dated the amendment. | (1) Added WU-00 L0-CONTRACT (NEW; full-tier; SLICE 3.B foundation per Step 4). (2) Added D2 MEDIUM edges WU-00 → WU-01/WU-02 and D1 HIGH edge WU-00 → WU-03 (per Step 3 Judgment call 1 asymmetric classification). (3) Added D1 HIGH edge WU-00 → WU-05 (close-walk reads contract). (4) Resequenced Wave 1 from v1's 4-cluster (adapters+MD-F4) to v2's 2-cluster (WU-00 + WU-04 MD-F4); resequenced Wave 2 from v1's close-walk to v2's 3-cluster adapter fan-out. (5) Total waves grew from 4 (v1) to 5 (v2). (6) MD-F4 placement decision (Wave 1 with WU-00 vs Wave 2 with adapters) resolved by Step 3 Judgment call 2 — Wave 1 (preserves PR-F6 evidence landing parallel to L0-contract; honors operator fan-out preference). (7) New OQ-W2-1 (L0-contract module location); v1 OQ-W1-1 carried forward (now applies to Wave 2). |
