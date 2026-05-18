# WAVE-PLAN-03 — Wave Plan v3: Tessera Phase 2 SLICE 4 + Phase 2 Close (Wave 4 + Wave 5 Detailed Decomposition)

**From:** Coordinator TPM (R33 — Wave 3 gate + SLICE 4 decomposition)
**Date:** 2026-05-18
**Version:** v3 (NEW; extends v2 by detailing Wave 4 + Wave 5 — resolves WAVE-PLAN-02 OQ-W1-3 SLICE 4 decomposition deferral)
**Foundation:** `coordination/PRD.md` (thin pointer); `SCOPING-MEMO-v0.3.md` v0.3 @ HEAD `c503edb` (vendor-fungibility R32 amendment included); `coordination/WAVE-GATE-03.md`; `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`
**Type:** wave plan — SLICE 4 / Phase 2 close decomposition + tier classification + cluster handoff inventory
**Relationship to prior plans:** **Extension, NOT supersession.** WAVE-PLAN-02 v2 remains the canonical plan for Waves 1-3 (already executed cleanly). WAVE-PLAN-03 v3 is a sibling forward-plan covering Wave 4 (WU-06 SLICE 4) + Wave 5 (WU-07 Phase 2 close-walk). v1 + v2 preserved on disk per Coordinator versioning discipline.

---

## Plan summary

Two waves remain after SLICE 3 close (Wave 3). **Wave 4 is a single-cluster sequential decomposition of SLICE 4** (event-feed ingestion + event-conditional attribution + freeze-hook coupling, all delivered as one WU-06 cluster at full tier) — fan-out into WU-06a/06b/06c was evaluated and rejected because D1 HIGH edges chain through every candidate-pair (event-feed substrate is producer; attribution-layer is consumer; freeze-hook coupling consumes event-feed; no clean pairwise independence). **Wave 5 is a single-cluster Phase 2 close-walk** (WU-07; audit-tier with `HYBRID_REVIEWER=true`) — close-walks structurally cannot fan out (consolidation IS the work).

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 4 | 1 (sequential) | No | WU-06 SLICE 4 — event-feed ingestion + event-conditional correlational attribution (MD-F5; PR-F7 evidence) + Phase 1 freeze-hook activation coupling. Full tier. Single-cluster because D1 HIGH edges chain through all candidate sub-decompositions (Step 3 Judgment call 1 below). |
| 5 | 1 | No (integration / hardening) | WU-07 Phase 2 close-walk — audit-tier; HYBRID_REVIEWER=true per SCOPING-MEMO § 3 Phase 2 close-walk row. Inherited WAVE-PLAN-02 Step 5 row 5; fan-out structurally unavailable. **HARD STOP at Wave 5 gate per overnight authority 2026-05-18 mid-afternoon extension.** |

**Recommended operator action for Wave 4:** dispatch single-cluster via `scripts/run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera` (NOT `--coordinator`; not `multi-track-cluster-setup.sh` — no fan-out). Same dispatch pattern for Wave 5 with `--tier audit HYBRID_REVIEWER=true` (env-var equivalent per pipeline convention).

**Trade-off framing for single-cluster recommendation.** The operator preference for fan-out where independence is clean was carefully evaluated. Three candidate sub-decompositions of SLICE 4 (06a event-feed substrate; 06b attribution-layer; 06c freeze-hook coupling) all share D1 HIGH dependency edges in the same direction (06a → 06b, 06a → 06c, optionally 06b → 06c). Forcing a fan-out structure would either (a) produce two waves (Wave 4 = 06a alone; Wave 4.5 = 06b + 06c parallel) — adding a wave gate + operator review overhead for marginal benefit on what is a single architecturally-coherent slice — or (b) violate D1 HIGH by dispatching 06a + 06b in parallel (the consumer cannot stably run before its producer ships). Single-cluster WU-06 is the correct shape per the dispatch directive's "DO NOT force fan-out when scope is genuinely sequential" clause. See Step 3 Judgment call 1 for the full D-test analysis.

---

## PRD provenance

- **PRD source:** `coordination/PRD.md` (thin pointer to `SCOPING-MEMO-v0.3.md`)
- **PRD version at plan time:** v0.3 (SCOPING-MEMO) @ HEAD `c503edb` (vendor-fungibility R32 amendment landed; MAJOR-1 structural surgery PENDING — substantive content intact at SCOPING-MEMO-v0.3.md:267-289)
- **Anti-scope clauses referenced (headline; full enumeration in SCOPING-MEMO § 2.1/2.2/2.3):**
  - A8/A11: NO real customer cluster telemetry
  - A10: NO hardware-diagnostic territory (DCGM signal generation / NVML / per-GPU fault attribution); MR-1 carve-out for measurement-domain L0 preprocessing preserved
  - A12/A5: NO modification to vendored detector internals (TrendBuffer, Family A-E detectors)
  - A13: NO ML-based attribution (CausalImpact / synthetic control / ITS statistical methods only; rule-based + statistical per honest-broker stance)
  - A15: NO multi-region / cross-cluster federation
  - **A16: NO Addition #26 D4 reversal (`correlational_not_causal: true` REQUIRED at all WU-06 attribution-layer wire boundaries) — HIGHEST RELEVANCE FOR SLICE 4 because event-conditional attribution is the surface most likely to face causal-reversal pressure**
  - A17: NO DeploySignal-integration scope at Phase 1+2
- **Open PRD questions deferred to operator:** carry-forward OQ-W1-2 (WU-07 tier classification); carry-forward OQ-W1-4 (calibrate.ts vendoring; not blocking); carry-forward OQ-W1-5 (Phase 2 transient detector scheduling; not blocking); NEW OQ-W3-1 (WU-06 file layout); NEW OQ-W3-2 (WU-06 freeze-hook coupling scope boundary); NEW OQ-W3-3 (SCOPING-MEMO MAJOR-1 structural surgery timing). See § Open questions for operator below.

---

## Step 1 — Work unit extraction (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 1. WU extracted from PRD / SCOPING-MEMO structure (one PRD feature or one SCOPING-MEMO SLICE row per WU); no work unit invented; no merging beyond explicit reasoning logged below. **WU-06 + WU-07 numbering inherited from WAVE-PLAN-02 for diff readability.**

| WU ID | Source PRD feature | Acceptance criteria (frame; per-AC enumeration deferred to cluster Architect spec) | Bounding anti-scope | File tree scope |
|---|---|---|---|---|
| **WU-06** | FR-E3c / SCOPING-MEMO § 2.3 line 231 "Extension 3 (c)" + § 3 Phase 2 SLICE 4 row line 393 + AC-P4 | **SLICE 4: deployment-event-feed ingestion (new ingestion surface; producer-side) + event-conditional correlational attribution layer (MD-F5; consumer of event-feed + per-shard verdicts + topology) + Phase 1 freeze-hook activation coupling (Extension 2's freeze hook consumes event-feed per § 2.4 dependency graph circular-coupling) + PR-F7 evidence package (4-cell evidence matrix per § 2.3 PR-F7 trigger + external literature citation: CausalImpact / synthetic control / ITS literature).** Preserves Addition #26 D4 wire-format (`correlational_not_causal: true` REQUIRED at all attribution-layer wire boundaries; AC-bound at WU-06 spec). AC-suite enumeration is the cluster Architect's job; target AC count 14-18 (slightly more than R26 due to PR-F7 4-cell matrix + freeze-hook activation coupling AC density). Estimated 2-3 Q-cycles per SCOPING-MEMO § 3 SLICE 4 row (single-cluster sequential decomposition collapses what could have been 3 sub-rounds into 1 audit-tier-bundled set of deliverables; operator may split-decision at Architect spec time if AC count exceeds 18). | A10 (event-feed is cluster-operator-level event abstraction, NOT hardware fault diagnosis); A11 (synthetic event-feed substrate only; no live cluster deployment-pipeline ingestion); A12 (NO modification of `engine/core.ts` TrendBuffer body OR `engine/detectors/*` internals); A13 (rule-based + statistical only — CausalImpact / synthetic control / ITS — NO ML attribution model); **A16 (`correlational_not_causal: true` REQUIRED on every event-conditional attribution output — HIGHEST RELEVANCE for this WU);** A17 (no DeploySignal-integration scope) | NEW `engine/events/*` (event-feed substrate; Tessera-original; Architect-decided sub-layout per OQ-W3-1 — likely `engine/events/event-feed-types.ts` + parser + producer interface); NEW `engine/topology/event-conditional-attribution.ts` (Tessera-original; consumer of event-feed + per-shard verdicts; CausalImpact / synthetic-control / ITS method orchestration); freeze-hook activation in Phase 1 substrate (likely `engine/baselines/cell-confidence.ts` or `engine/baselines/freeze-hook.ts` — Architect MUST check whether existing inherited file requires vendored-with-deltas transition with manifest + AT_PIN_FILES maintenance UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern); NEW `test/q-event-conditional-attribution.test.ts` (or per-deliverable test file split if scope demands); NEW `test/_substrate/v9Z-event-cluster.ts` OR extension of v9Y for 4-cell evidence matrix (Architect's call; v9Y was R23-frozen for MD-F4 — extend without modifying, or new substrate per LS-4 / sparse-data carry-forward); READ-ONLY: `engine/l0/counter-rate-transform.ts`, `engine/topology/{slurm,k8s,nvlink}-source.ts`, `engine/topology/common-mode-attribution.ts`, `engine/topology-overlay.ts`, `engine/verdict-groups.ts`, `engine/fleet/verdict-consumer.ts`, `engine/hardware-topology-source.ts`, `engine/types/verdict.ts`, v9X/v9Y substrates |
| **WU-07** | (close-walk; mirrors R19/R22/R32 pattern; no PRD-level AC) — inherited from WAVE-PLAN-02 Step 5 row 5 | **Phase 2 close-walk document; Addition #25 D2 + D5 disposition stamp; Addition #26 D4 RECONFIRMED at Phase 2 close; Phase 1 freeze-hook activation coupling stamp; Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 3 Phase 2 close-walk row; final per-file vendored-from-DeploySignal headers re-pinning check per § 9.4 vendoring policy; Tessera Phase 3 candidate-list TAGGED-FUTURE.** Includes: aggregated SLICE 4 deliverable inventory; full Wave-1+2+3+4 carry-forward MINOR/MAJOR closure disposition; Tessera v1 publication readiness inventory; extract-to-npm commitment surfaced as ADR-class proposal per § 9 vendoring policy; engine extraction publisher-vs-consumer decision deferred to cross-project ADR (per § 9.4). AC count target: 16-22 (close-walks at audit tier; Hybrid Reviewer adds ~4-6 ACs for Reviewer-verified evidence per cell of PR-F7 + Addition #25 D2 + D5 stamps). Target SLICE 4 MAJOR/MINOR carry-forward closure + opportunistic SCOPING-MEMO MAJOR-1 structural surgery (if not closed at WU-06) + execSync carry-forward cleanup (q25 + q30 anti-scope tests). | A12; A17; NO modification of WU-06 deliverables (Wave-4-frozen post-merge); NO modification of pre-R-NN test files frozen at WU-06 close; final close-walk pattern per R19/R22/R32 precedent | NEW `coordination/PHASE-2-CLOSE-WALK.md`; **STRUCTURAL SURGERY candidates if not closed at WU-06:** SCOPING-MEMO-v0.3.md § 2.3 surgical relocation (MAJOR-1 carry from R32); `test/q25-l0-contract.test.ts:216` + `test/q30-nvlink-adapter.test.ts:230` execSync → execFileSync (OBS-5 carry from R32); MINOR refresh to `coordination/VENDORING-MANIFEST.md` notes column per R19/R22 precedent; Tessera-v1 readiness ADR scaffold |

### Merge reasoning

**WU-06 collapses three candidate sub-decompositions (06a EVENT-FEED-INGESTION + 06b ATTRIBUTION-LAYER + 06c FREEZE-HOOK-COUPLING) into one sequential cluster.** See Step 3 Judgment call 1 for full reasoning. Headline: D1 HIGH edges chain in same direction across all three (06a → 06b; 06a → 06c; optionally 06b → 06c) — no clean pairwise independence. Operator R24 fan-out directive ("PREFER fan-out when D1-D5 tests show clean independence; DO NOT force fan-out when scope is genuinely sequential") instructs single-cluster.

### Splitting reasoning

**SLICE 4 internal sequencing within WU-06 is the cluster Architect's job at spec time.** The Architect MAY internally split delivery into 06a-substrate / 06b-attribution-layer / 06c-freeze-hook subsections of the spec (analogous to R20's SLICE 2.A + R21's SLICE 2.B internal-spec split that was logged after-the-fact). The Coordinator does NOT pre-decompose internally because doing so would invent finer-grain ACs not yet traceable to specced architecture (per Step 1 discipline). If the WU-06 Architect determines at spec-write time that AC count exceeds 18 and a SCOPE-REDUCE-V1 split into two consecutive rounds (WU-06a + WU-06b/c) is warranted, that's a Coordinator-resequencing trigger per CLAUDE-COORDINATOR.md §Promotion mid-round — escalate via Coordinator-session WAVE-PLAN-v4 emission.

---

## Step 2 — Dependency edge identification (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 2. Each edge cites the dependency test that fired (D1–D5) and the confidence level.

### Outbound from WU-06 to WU-07 (Wave 4 → Wave 5)

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-06** | **WU-07** | **D1 (shared output ownership)** | **HIGH** | WU-07 Phase 2 close-walk reads `engine/events/*` + `engine/topology/event-conditional-attribution.ts` + Phase 1 freeze-hook activation deliverable + PR-F7 evidence package + WU-06 Reviewer report. Stamps Addition #26 D4 RECONFIRMED at Phase 2 close. Inherited from WAVE-PLAN-02 Step 2 row WU-06 → WU-07. |

### Inbound to WU-06 from Wave-1/Wave-2/Wave-3 deliverables (Wave 1+2+3 → Wave 4)

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-00 (L0-CONTRACT, R25)** | **WU-06** | **D2 (AC reference / interface contract)** | **MEDIUM** | Event-feed substrate is operator-level event abstraction (firmware push, model redeploy, config change, capacity change) — NOT counter-typed telemetry. WU-06 does NOT import `transformPair` in its hot path. However, IF the event-feed schema includes any counter-typed metadata fields (e.g., per-event resource-impact counts), WU-06 reads the L0 contract surface by interface to confirm pass-through value-domain semantics. Edge is interface-only; analogous to WU-01 SLURM and WU-02 K8S edges to WU-00 at Wave 2. |
| **WU-04 (MD-F4 common-mode-attribution, R26)** | **WU-06** | **D1 (shared output ownership)** | **HIGH** | Event-conditional attribution layer extends MD-F4's `attributeCommonMode` surface: where MD-F4 produces topology-localized common-mode candidates, WU-06 produces event-conditional correlational candidates. Both consume per-shard verdicts; both emit `TopologyCandidate`-shaped output (or a parallel-class extension thereof) with `correlational_not_causal: true` invariant preserved. WU-06 likely imports the attribution-candidate type + emits structurally-compatible output for downstream merge. **HIGHEST D1 confidence inbound to WU-06** because the architectural pattern (BFS-on-undirected + candidate aggregation) is the template WU-06 extends. |
| **WU-01 (SLURM-ADAPTER, R28)** | **WU-06** | **D2 (AC reference / interface contract)** | **MEDIUM** | Event-conditional attribution may topology-condition (e.g., "drift correlated with deployment event X in topology-localized region Y"); reads `TopologySource` interface + `TopologySnapshot` shape from inherited `engine/topology-overlay.ts:40-43`. Does NOT import SLURM-specific parser directly — adapter selection happens at operator/orchestrator layer. Edge is interface-only. |
| **WU-02 (K8S-ADAPTER, R29)** | **WU-06** | **D2** | **MEDIUM** | Same reasoning as WU-01 → WU-06 (interface-only; K8s adapter not directly imported by attribution layer). |
| **WU-03 (NVLINK-ADAPTER, R30)** | **WU-06** | **D2** | **MEDIUM** | Same reasoning as WU-01 → WU-06 (interface-only; NVLink adapter not directly imported by attribution layer). |
| **WU-05 (SLICE 3 close-walk, R32)** | **WU-06** | **D2 (AC reference / convention)** | **MEDIUM** | NOT a strict D1 — WU-06 does NOT read WU-05 outputs at runtime. Edge fires on project convention (SLICE-close documents land before next-SLICE entry; Phase 1 close → Phase 2 SLICE 1; SLICE 1 → SLICE 2; SLICE 2 → SLICE 3; SLICE 3 → SLICE 4 precedents). The close-walk document § 3 SLICE 4 entry framing IS the spec input the WU-06 Architect reads to brainstorm scope. Carry-forward from WAVE-PLAN-02 Step 2. |

### Pairwise check of candidate sub-decompositions for WU-06 internal structure (informational — single-cluster decision is made; this check documents why fan-out was rejected)

| Pair | D1 (shared output)? | D2 (AC reference)? | D5 (write-conflict)? | D4 (file-tree overlap)? |
|---|---|---|---|---|
| WU-06a (event-feed-substrate) ↔ WU-06b (attribution-layer) | **YES — D1 HIGH.** Attribution layer reads from event-feed substrate at runtime; imports event-type definitions; tests exercise event-conditional attribution against synthetic event-feed fixtures. | **YES — D2.** Attribution-layer ACs reference event-feed schema (per-event timestamp, event-class, event-scope). | N/A — Tessera has no migration surface. | YES if both touch `engine/events/*` (likely — attribution-layer reads event types from there). Resolvable via parallel-class architecture IF the dependency were not D1, but D1 dominates. |
| WU-06a (event-feed-substrate) ↔ WU-06c (freeze-hook-coupling) | **YES — D1 HIGH.** Freeze-hook consumes event-feed at runtime per SCOPING-MEMO § 2.4 dependency graph circular-coupling (Phase 1 freeze-hook reads Phase 2 event-feed; that's the entire purpose of the coupling). | **YES — D2.** Freeze-hook activation ACs reference event-feed types. | N/A | YES if both touch `engine/events/*`. Resolvable via parallel-class IF dependency were not D1, but D1 dominates. |
| WU-06b (attribution-layer) ↔ WU-06c (freeze-hook-coupling) | **POSSIBLE — D2 MEDIUM.** If event-conditional attribution emits a signal that the freeze-hook uses for cutover semantics, edge fires. If freeze-hook reads event-feed independently of attribution-layer output, edge does not fire. Architect's call at spec time. | POSSIBLE | N/A | NO — attribution at `engine/topology/event-conditional-attribution.ts`; freeze-hook at `engine/baselines/*`. |

**Verdict for fan-out availability inside SLICE 4:** ZERO clean-independence pairs. 06a → 06b D1 HIGH; 06a → 06c D1 HIGH; 06b ↔ 06c possibly D2 MEDIUM. The 2-of-3 D1 HIGH edges form a producer-consumer chain that CANNOT be parallelized. Single-cluster WU-06 is the correct shape. See Step 3 Judgment call 1 for the rejected alternatives.

### Contention risks (not dependencies)

| Work units | Shared files | Resolution |
|---|---|---|
| WU-06, WU-07 | `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `CLAUDE-*.md` reinforcement files | Sequential by wave (WU-06 in Wave 4; WU-07 in Wave 5; never concurrent). No cross-wave concurrent write risk; standard Memorial-Updater single-writer-per-round pattern. |
| WU-06 ↔ inherited Phase 1 substrate | `engine/baselines/*` (freeze-hook activation site; specific file TBD by Architect at spec time) | If freeze-hook activation requires vendored-with-deltas transition for an inherited Phase 1 file, apply the two-step maintenance pattern UPFRONT in spec component inventory (VENDORING-MANIFEST.md row + AT_PIN_FILES maintenance) per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern + R20 application precedent. If the transition is novel or scope-expanding (e.g., new dispatch-table refactor at inherited Q70 layer), ESCALATE via DIAGNOSTIC at spec time. |
| WU-06 ↔ inherited `engine/types/verdict.ts` | If event-conditional attribution requires a new `TopologyCandidate` variant or new `correlational_not_causal` qualifier field, vendored-with-deltas transition for `engine/types/verdict.ts` (R18-frozen for SLICE 1; potentially extended at SLICE 4) | Same two-step maintenance pattern; UPFRONT in spec component inventory. Coordinator does NOT pre-decide whether a type extension is needed — that's the Architect's brainstorm-phase output. |
| WU-07 ↔ Wave 1/2/3/4 deliverables | All Wave 1-4 production code | READ-ONLY by close-walk; no write contention. Standard close-walk pattern (R19/R22/R32 precedent). |

---

## Step 3 — Claude judgment at ambiguity boundaries

### Judgment call 1 — SLICE 4 decomposition: single-cluster WU-06 vs fan-out into WU-06a/06b/06c

- **Ambiguity:** NEXT-ROLE.md R33 round-scope directive surfaces the SLICE 4 decomposition as a Coordinator decision and pre-frames three candidate sub-decompositions (06a EVENT-FEED-INGESTION; 06b ATTRIBUTION-LAYER; 06c FREEZE-HOOK-COUPLING) — with the operator-preference reminder "PREFER fan-out when D1-D5 tests show clean independence; collapse only when proven dependent". The deterministic D-tests (Step 2 pairwise check above) reveal D1 HIGH chains through every candidate-pair. The question is: do we collapse to single-cluster WU-06 (sequential within cluster), OR force a 2-wave structure (Wave 4 = 06a alone; Wave 4.5 = 06b + 06c parallel since both are 06a-downstream), OR find some other structure that satisfies both the D-test reality and the fan-out preference?
- **Candidate resolutions:**
  - **(a) Single-cluster WU-06 — sequential within cluster (Coordinator's recommendation).** One Wave 4 cluster delivers all three sub-deliverables in spec-ordered sequence (event-feed substrate first; attribution-layer second; freeze-hook coupling third). Internal sequencing is the Architect's spec-time job. Operationally analogous to R20+R21 (SLICE 2.A + 2.B were originally framed as one R20 round delivering both layers; Architect at spec time recommended a split-decision because R20 AC count would have exceeded 12, and Reviewer R20 ratified the split into R20 aggregator-contract-only + R21 fleet-merge consumer). For SLICE 4, the Architect may apply the same split-decision pattern IF spec-time AC count exceeds 18; that's a Coordinator-resequencing event (WAVE-PLAN-v4 emission) at spec time, NOT a pre-commitment at this plan time.
  - **(b) Two-wave structure: Wave 4 = WU-06a alone; Wave 4.5 = WU-06b + WU-06c parallel.** Operationally honors the fan-out preference at the SLICE 4 layer. BUT: adds a wave gate + operator review overhead for marginal benefit — WU-06a (event-feed substrate) is approximately 1 Q-cycle scope; the wave-gate ceremony cost (CLUSTER-HANDOFF artifact + WAVE-GATE-04 ceremony + WAVE-GATE-04.5 ceremony) is comparable to the savings. WU-06b + WU-06c parallel saves marginal wall-clock IF both run independently of each other (which is POSSIBLY D2 MEDIUM — uncertain at this plan time per Architect spec input). The net Q-cycle and operator-attention cost is approximately wash; the wave-count cost is +1 wave. Not recommended.
  - **(c) Force-parallel WU-06a + WU-06b in same wave.** STRUCTURALLY UNSAFE — D1 HIGH forbids producer-consumer parallel dispatch (the consumer cannot stably build against a producer that's still being refined). Rejected.
- **Claude's judgment:** Option (a) — single-cluster WU-06 sequential within cluster.
- **Reasoning:** Three factors favor single-cluster:
  1. **D-test reality.** 2-of-3 candidate-pair edges are D1 HIGH (06a → 06b; 06a → 06c). Fan-out preference is conditional on "clean independence" — independence is structurally absent here. The dispatch directive's "DO NOT force fan-out when scope is genuinely sequential" clause directly applies.
  2. **Operator-attention cost analysis.** Wave gate ceremonies are not free (CLUSTER-HANDOFF artifact authoring + WAVE-GATE-NN ceremony + operator review at each gate). Two-wave (b) adds +1 wave gate vs single-cluster (a) for marginal Q-cycle wall-clock savings on what is approximately 1 Q-cycle worth of producer-consumer co-deliverables. Single-cluster also collapses operator review burden to 1 Wave 4 gate + 1 Wave 5 gate (= 2 remaining gates total to Phase 2 close).
  3. **R20+R21 precedent for in-cluster split-decision flexibility.** The Architect at spec time can split-decision an over-scoped cluster into two consecutive rounds (R20 originally one cluster → R20 aggregator-contract + R21 fleet-merge consumer, ratified by operator at Architect's spec recommendation, no Coordinator re-plan needed at that step because operator-as-pseudo-Coordinator handled it). Same flexibility applies here: if WU-06 Architect determines spec-time AC count > 18, escalate to Coordinator for WAVE-PLAN-v4 emission. **Pre-committing to fan-out at this plan time would forfeit Architect's spec-time judgment.**

  Single-cluster WU-06 is the recommended shape. The opposite choice (two-wave (b)) does not violate any discipline — it would just add +1 wave and +1 gate ceremony for marginal benefit. The decision honors the operator-preference framing's intent (fan-out where clean independence exists) WITHOUT forcing structure where independence is structurally absent.

- **Resulting placement:** WU-06 in Wave 4 as the sole cluster. Architect retains spec-time discretion to escalate for split-decision if AC count or scope complexity warrants.

### Judgment call 2 — WU-06 file layout (sub-extension of OQ-W3-1)

- **Ambiguity:** WAVE-PLAN-02 Step 1 row WU-06 listed file scope as "NEW `engine/events/*` (event-feed substrate); NEW `engine/topology/event-conditional-attribution.ts`; freeze-hook activation in inherited Phase 1 substrate (requires vendored-with-deltas check)". The specific layout under `engine/events/*` is not pre-decided (one file? Subdirectory expansion? Producer-vs-consumer split?). The freeze-hook activation file is not pre-identified (inherited Phase 1 substrate is at `engine/baselines/*` per inherited Addition #2; specific file TBD).
- **Candidate resolutions:**
  - **(a) Single file `engine/events/event-feed.ts` (Coordinator's prior; matches R25 WU-00 pattern of single-file).** Tightest blast radius; matches existing single-file convention used at WU-00 (counter-rate-transform.ts) and WU-04 (common-mode-attribution.ts).
  - **(b) Subdirectory expansion `engine/events/event-feed-types.ts` + `engine/events/event-feed-parser.ts` + `engine/events/event-feed-producer.ts`.** Anticipates future event-class additions (firmware producer; deploy producer; config producer; capacity producer). YAGNI risk if SLICE 4 ships with one synthetic event-feed substrate.
  - **(c) Defer to Architect.** Surface as OQ-W3-1 for operator answer before WU-06 dispatch. Coordinator default: (a) single-file unless Architect brainstorm surfaces concrete need for (b).
- **Claude's judgment:** Defer to Architect with default (a). The OQ-W2-1 precedent for WU-00 file layout was decided by operator (Option A: single-file `counter-rate-transform.ts`); same pattern likely fits WU-06. Surface as OQ-W3-1 below; operator answers before WU-06 dispatch; Architect spec-time discretion in absence of operator answer.
- **Resulting OQ:** OQ-W3-1 below.

### Judgment call 3 — WU-06 inclusion of opportunistic SCOPING-MEMO MAJOR-1 surgery (carry-forward from R32)

- **Ambiguity:** R32 MAJOR-1 (SCOPING-MEMO § 2.3 structural corruption) is a carry-forward documentation defect — substantive vendor-fungibility content is intact but structurally misplaced. WU-06 spec authoring MAY touch SCOPING-MEMO anyway (for SLICE 4 amendment if the spec adds a new § 3 SLICE 4 sub-row or extends § 2.3 Extension 3 (c) with implementation-revealed invariants). Should WU-06 close the MAJOR-1 surgery opportunistically, OR should it carry forward to WU-07 Phase 2 close-walk?
- **Candidate resolutions:**
  - **(a) WU-06 closes opportunistically IF Architect spec touches SCOPING-MEMO anyway.** Architect's call at spec time. Risk: spec-scope creep if Architect over-includes surgical scope.
  - **(b) Defer to WU-07 Phase 2 close-walk per default close-walk pattern.** Cleaner scope-bounding for WU-06; consistent with R32 disposition (MAJOR-1 was pre-flagged forward, not retro-fixed in R32).
- **Claude's judgment:** Option (b) by default; (a) opportunistically. WU-07 is the cleaner home for SCOPING-MEMO structural surgery (close-walk pattern matches the "spec/doc cleanup" deliverable class). If WU-06 Architect determines spec touches SCOPING-MEMO for a substantive reason (new § 3 SLICE 4 sub-row; updated R-S* risk row; etc.), opportunistic close is welcome but not required. Surface as OQ-W3-3 below for operator confirmation.
- **Resulting OQ:** OQ-W3-3 below.

---

## Step 4 — DAG validation

- [x] **Cycle check.** No circular dependencies. DAG continues feed-forward: WU-06 (Wave 4) → WU-07 (Wave 5). Inbound edges to WU-06 from Wave-1/2/3 deliverables (WU-00 D2; WU-01/02/03 D2; WU-04 D1; WU-05 D2/convention) all flow forward in wave order. No back-edges. Note re § 2.4 "circular-coupling" between Phase 1 freeze-hook + Phase 2 event-feed: that's a RUNTIME coupling (freeze-hook reads event-feed when activated), not a build-time DAG cycle. WU-06 ships both surfaces in one cluster, eliminating any build-time cycle concern.
- [x] **Island check.** Every work unit has at least one edge. WU-06 has 5 inbound (from WU-00 D2, WU-01/02/03 D2 each, WU-04 D1, WU-05 D2/convention) + 1 outbound (to WU-07 D1). WU-07 has 1 inbound (WU-06 D1) + 0 outbound (terminal; Phase 2 close).
- [x] **Foundation identification.** Per CLAUDE-COORDINATOR.md §Step 4 "Work units whose outputs are inputs to 3+ other work units **across 2+ domains/modules** are foundations." NO new foundations identified in WAVE-PLAN-03 — WU-06 has only 1 outbound (to WU-07; same `coordination/*` domain via close-walk). WU-07 has 0 outbound (terminal). Inherited foundation identification from WAVE-PLAN-02: **WU-00 (L0-CONTRACT)** was the SLICE 3.B foundation (4 outbound across `engine/topology/*` + `coordination/*` = 2 domains) — preserved as historical record; WU-00 already delivered and frozen at Wave 1.

---

## Step 5 — Wave sequencing

| Wave | Work units | Rationale |
|---|---|---|
| 4 | WU-06 SLICE 4 (event-feed ingestion + event-conditional attribution + freeze-hook coupling + PR-F7 evidence) | Convention-gated by WU-05 SLICE 3 close-walk completion (carry-forward from WAVE-PLAN-02 Step 5 row 4 / Judgment call 4 in v1). Full tier per Step 6. Single-cluster per Step 3 Judgment call 1 (D1 HIGH edges chain through all candidate sub-decompositions). May produce spec-time escalation if AC count > 18 (architect's split-decision flexibility per R20+R21 precedent → Coordinator-resequencing WAVE-PLAN-v4). |
| 5 | WU-07 Phase 2 close-walk (Hybrid Reviewer pair-review-style at close per SCOPING-MEMO § 3) | D1-gated by WU-06 SLICE 4 deliverables. Audit tier per Coordinator prior + HYBRID_REVIEWER=true per SCOPING-MEMO § 3 Phase 2 close-walk row commitment. Carry-forward from WAVE-PLAN-02 Step 5 row 5. **HARD STOP at Wave 5 gate** per extended overnight authority 2026-05-18 mid-afternoon — Tessera Phase 3 (TAGGED-FUTURE) requires separate operator authorization. |

### Wave dispatch order (within each wave, parallel)

Wave 4 single-cluster (no parallel dispatch within wave). Wave 5 single-cluster (no parallel dispatch within wave). Both use standard `scripts/run-pipeline.sh` from the main worktree at `~/concord/tessera`; neither uses `--coordinator` mode or `multi-track-cluster-setup.sh`.

CLUSTER-HANDOFF artifacts for Wave-1/Wave-2/Wave-3 → Wave 4 edges are authored at THIS gate (R33 WAVE-GATE-03) per "wave gate emits handoffs for the wave it's authorizing" convention. The CLUSTER-HANDOFF-4-WU06-WU07 artifact is authored at the FUTURE Wave 4 gate (R34 or successor).

---

## Step 6 — Tier classifications

Per the tier rubric inlined in `CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5). **Each cluster self-governs its own tier at session start; this column records the Coordinator's prior, not a binding instruction.**

| WU ID | Coordinator tier | Matched criteria | Rationale |
|---|---|---|---|
| **WU-06** | **full** | **A1 (new external dependency — deployment-event-feed ingestion: firmware/deploy/config/env/capacity producers — new ingestion surface per SCOPING-MEMO § 2.3 "genuinely novel"), A2 (new architectural pattern — event-conditional attribution; freeze-hook coupling activation; first CausalImpact/synthetic-control/ITS application in Tessera tree), A4 (novel data model — event-feed schema + 4-cell evidence matrix + Phase 1 freeze-hook activation state machine), A6 (blast radius — Phase 1 freeze-hook activation couples back into inherited Phase 1 substrate; vendored-with-deltas transition candidate for `engine/baselines/*`; high pre-existing-test ripple risk), PR-F7 pair-review trigger per SCOPING-MEMO § 2.3** | Architecturally novel surface (first event-feed; first event-conditional attribution; first freeze-hook activation); high blast radius via Phase 1 coupling; PR-F7 pair-review trigger fires at full-tier ONLY (hybrid Reviewer commitment deferred to WU-07 Phase 2 close-walk per SCOPING-MEMO § 3, but standard full-tier Reviewer at WU-06 audits the 4-cell evidence matrix + correlational-not-causal AC bindings). Audit-tier insufficient. |
| **WU-07** | **audit** (carry-forward from WAVE-PLAN-02 Step 6 row WU-07 = same Coordinator prior; OQ-W1-2 still open at operator level) | S4 (tactical follow-up to recent rounds; close-walk pattern), S3 (single bounded item — close-walk document + minor refresh); **BUT** Hybrid Reviewer pair-review-style at close is a full-tier commitment per SCOPING-MEMO § 3 Phase 2 close-walk row | **Tier classification ambiguity carry-forward from v1/v2 OQ-W1-2:** audit per close-walk pattern (R19/R22/R32 precedent) OR full if Hybrid Reviewer treated as architecturally novel. Coordinator prior is `audit + HYBRID_REVIEWER=true` (same shape as R32 WU-05). Cluster's Memorial-Updater + Reviewer can promote at session start; operator may answer OQ-W1-2 before WU-07 dispatch. R32 audit+hybrid Reviewer worked methodologically (caught 2 MAJORs that warm self-review missed); pattern-validates Coordinator's audit+hybrid prior for WU-07. |

### Tier prior discrepancies

(Carry-forward from WAVE-PLAN-02 — empty at v2 emission; v3 inherits empty + no new discrepancies surface at this plan time.)

| WU ID | Coordinator prior | Cluster self-assessed | Wave gate where surfaced |
|---|---|---|---|
| — | — | — | — |

---

## Cluster handoff inventory

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, handoff artifacts are created at dispatch of the target cluster (not pre-created at plan time). **CLUSTER-HANDOFF-3 artifacts authorizing Wave 4 dispatch are emitted at THIS WAVE-GATE-03** (R33). The CLUSTER-HANDOFF-4-WU06-WU07 artifact is authored at the FUTURE Wave 4 gate.

| Handoff artifact | From WU | To WU | Wave boundary | D-test that fired | Emitted at |
|---|---|---|---|---|---|
| `CLUSTER-HANDOFF-3-WU00-WU06.md` | WU-00 (Wave 1) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2 MEDIUM (event-feed schema may reference L0 contract for counter-typed metadata) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-3-WU01-WU06.md` | WU-01 (Wave 2) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2 MEDIUM (interface-only; TopologySource reads not vendor parser) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-3-WU02-WU06.md` | WU-02 (Wave 2) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2 MEDIUM (interface-only) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-3-WU03-WU06.md` | WU-03 (Wave 2) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2 MEDIUM (interface-only) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-3-WU04-WU06.md` | WU-04 (Wave 1) | WU-06 (Wave 4) | Wave 3 → 4 gate | D1 HIGH (event-conditional attribution extends MD-F4 common-mode attribution surface) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-3-WU05-WU06.md` | WU-05 (Wave 3) | WU-06 (Wave 4) | Wave 3 → 4 gate | D2/convention (close-walk § 3 SLICE 4 entry framing IS the spec input — abbreviated in R32 close-walk; this gate's § Pre-flags supplements) | R33 WAVE-GATE-03 |
| `CLUSTER-HANDOFF-4-WU06-WU07.md` | WU-06 (Wave 4) | WU-07 (Wave 5) | Wave 4 → 5 gate | D1 HIGH (Phase 2 close-walk reads SLICE 4 deliverables + PR-F7 evidence + freeze-hook activation state) | FUTURE Wave 4 gate (R34 or successor) |

Template: `templates/CLUSTER-HANDOFF-TEMPLATE.md`.

---

## Pre-emit grilling

Per `CLAUDE-COMMON.md` Superpowers Review block + Coordinator's pre-emit grilling discipline (CLAUDE-COORDINATOR.md):

- [x] **Every dependency edge is verifiable.** Step 2's tables each cite a specific D-test with concrete reasoning. The WU-04 → WU-06 D1 HIGH edge is recorded honestly (highest-confidence inbound edge to WU-06 because event-conditional attribution extends MD-F4 architectural pattern). The WU-00 → WU-06 D2 MEDIUM edge is recorded as interface-only (event-feed is operator-level abstraction, not counter-typed in hot path). The WU-05 → WU-06 D2/convention edge is explicitly flagged as not-strict-D1. The 06a/06b/06c pairwise check is documented (informational; single-cluster decision pre-empts).
- [x] **No unstated assumptions.** Single-cluster WU-06 vs fan-out is surfaced as Step 3 Judgment call 1 with full reasoning (D-test reality + operator-attention cost analysis + R20+R21 precedent for in-cluster split-decision flexibility). File layout deferral to Architect surfaced as OQ-W3-1. SCOPING-MEMO MAJOR-1 surgery timing surfaced as OQ-W3-3. WU-07 tier classification ambiguity carry-forward from OQ-W1-2 explicitly acknowledged.
- [x] **No scope added beyond PRD/SCOPING-MEMO.** WU-06 traces to SCOPING-MEMO § 2.3 Extension 3 (c) line 231 + § 3 Phase 2 SLICE 4 row line 393 + PRD FR-E3c + AC-P4. WU-07 traces to convention-anchored R19/R22/R32 close-walk precedent + SCOPING-MEMO § 3 Phase 2 close-walk row commitment for hybrid Reviewer. No invented WUs. The 06a/06b/06c sub-decomposition is internal Architect spec-time work, not pre-resolved by Coordinator (per Step 1 discipline; per WAVE-PLAN-02 v2 OQ-W1-3 deferral pattern).
- [x] **Cluster can act without guessing.** WU-06 has (a) PRD/SCOPING-MEMO trace, (b) frame-level AC scope (cluster Architect enumerates exhaustive AC list per spec), (c) bounding anti-scope (A10/A11/A12/A13/A16/A17 + SCOPING-MEMO carry-forwards + freeze-hook coupling A6 callout), (d) file tree scope (NEW / READ-ONLY annotations + Architect's vendored-with-deltas check directive for inherited Phase 1 substrate), (e) clear PR-F7 evidence package mandate (4-cell evidence matrix + external literature citation: CausalImpact / synthetic control / ITS literature).
- [x] **DAG is acyclic.** Step 4 cycle check passed (feed-forward graph: Wave 4 WU-06 → Wave 5 WU-07; runtime circular-coupling between Phase 1 freeze-hook + Phase 2 event-feed is RUNTIME not build-time and is resolved by shipping both in one cluster).
- [x] **Tier priors are defensible.** WU-06 full-tier prior cites A1+A2+A4+A6+PR-F7. WU-07 audit+hybrid-Reviewer prior carries forward from WAVE-PLAN-02 with R32 empirical validation noted.

Adversarial review notes (additional self-grilling):

- **Risk:** "Single-cluster WU-06 with 14-18 ACs could exceed spec-time review bandwidth, especially with the PR-F7 4-cell matrix + freeze-hook activation + event-feed substrate all in one spec. What if the Architect cannot author a coherent spec at this AC density?" Response: R20+R21 precedent applies — the Architect can split-decision at spec time (Coordinator-resequencing WAVE-PLAN-v4 emission). The plan explicitly flags this option in Step 1 splitting reasoning + Step 5 row Wave 4 rationale. Pre-committing to fan-out at this plan time would forfeit Architect's spec-time judgment; deferring the split-decision to spec time preserves it.
- **Risk:** "Phase 1 freeze-hook coupling requires modification of inherited `engine/baselines/*` substrate, which is potentially a vendored-with-deltas transition with high blast radius (inherited Phase 1 baseline-cell-matrix logic is referenced by multiple Phase 1 tests)." Response: Anti-scope clause A6 (high blast radius) is explicitly cited in the WU-06 tier classification (full-tier justification). The Architect's spec-time component inventory MUST identify whether freeze-hook activation requires vendored-with-deltas transition and apply the two-step manifest + AT_PIN_FILES maintenance pattern UPFRONT (PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern; R20 + R32 application precedent). If the transition is novel or scope-expanding, ESCALATE via DIAGNOSTIC at spec time. Pre-flag in WU-06 anti-scope and cluster handoff artifact.
- **Risk:** "A16 (correlational_not_causal preservation) at event-conditional attribution is the highest-risk surface for D4 reversal pressure across all of Tessera. What if the Architect spec under-binds A16 at the wire boundary?" Response: WU-06 anti-scope in this plan explicitly calls out "A16 REQUIRED on every event-conditional attribution output — HIGHEST RELEVANCE for this WU". WU-04 (MD-F4) set the precedent for A16 wire-format AC binding (AC-R26-8 strictEqual + JSON-serialized round-trip; ratified at R32 with /m-anchor regex per R30 MINOR-1 fix). WU-06 Architect MUST bind A16 with at least the WU-04-precedent rigor (regex with /m anchor; both type-declaration and wire-format checked). Pre-flag in CLUSTER-HANDOFF-3-WU04-WU06 (D1 HIGH edge from WU-04 explicitly cites the A16 binding pattern).
- **Risk:** "Wave 5 (WU-07) HYBRID_REVIEWER=true is a heavyweight commitment; the R32 hybrid pass had Opus + Sonnet + Merger producing 3 artifacts. Operator review burden at Phase 2 close gate is significant." Response: This is the operator-staged trade-off of the SCOPING-MEMO § 3 Phase 2 close-walk row commitment (hybrid Reviewer pair-review-style at close). The Coordinator's job is to surface the cost honestly (it IS a heavyweight pass), not to suppress it. Operator-attention budget at Wave 5 gate is the price of the Phase 2 close milestone with hybrid Reviewer evidence + Addition #26 D4 RECONFIRMED stamp.
- **Risk:** "PR-F7 external literature citation (CausalImpact / synthetic control / ITS) requires the Architect to author evidence package — there's no pre-existing project artifact like the WU-04 PR-F6 evidence package at `coordination/evidence/PR-F6-EVIDENCE.md` for WU-06 to read." Response: This is intrinsic to PR-F7 being the first event-conditional attribution literature anchor in Tessera. Pre-flag in WU-06 anti-scope: "External literature citation discipline — every external citation must include URL + retrieval date + verbatim quote (architect-side responsibility; reviewer audits). Hybrid Reviewer at WU-07 close-walk re-validates citation evidence under both Opus + Sonnet readings." Architect spec time includes the literature-citation work; no Coordinator-side pre-decision.

---

## Open questions for operator

The Coordinator does NOT resolve these — they require operator-level decisions before Wave 4 dispatch or are carry-forward from prior plans.

**OQ-W3-1 (NEW — load-bearing for WU-06 file layout under `engine/events/*`):** Event-feed substrate file layout.
- **Option A (Recommended):** `engine/events/event-feed.ts` (single-file; matches WU-00 `counter-rate-transform.ts` + WU-04 `common-mode-attribution.ts` neighbor conventions; tightest blast radius; YAGNI-friendly).
- **Option B:** Subdirectory expansion `engine/events/event-feed-types.ts` + `engine/events/event-feed-parser.ts` + `engine/events/event-feed-producer.ts` (anticipates future event-class adapter additions — firmware producer, deploy producer, config producer, capacity producer — analogous to Wave 2 topology adapter parallel-class pattern, but at producer-side rather than consumer-side).
- **Consequence of A:** Tightest blast radius; single-file maintenance; matches existing Tessera-original neighbor convention. If future event-class adapters land (Phase 3+), splitting then is a single-cluster refactor.
- **Consequence of B:** Premature directory split; YAGNI risk if Tessera stays single-source-of-event-feed for Phase 2.
- **Default if no operator answer:** Coordinator prior is A. WU-06 Architect can revisit at spec time but the file location is convention, not architectural — should not require operator escalation if Architect picks A.

**OQ-W3-2 (NEW — load-bearing for freeze-hook coupling scope):** Phase 1 freeze-hook activation file modification scope.
- **Option A (Recommended):** Architect identifies the inherited Phase 1 substrate file (likely `engine/baselines/cell-confidence.ts` or `engine/baselines/freeze-hook.ts` — Architect verifies via `git ls-files engine/baselines/`) and applies vendored-with-deltas transition UPFRONT in spec component inventory (VENDORING-MANIFEST.md row + AT_PIN_FILES maintenance per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern + R20 application precedent).
- **Option B:** Add a NEW Tessera-original file `engine/events/freeze-hook-activation.ts` that wraps the inherited Phase 1 substrate without modifying it (decorator/wrapper pattern; preserves A12 strictly).
- **Consequence of A:** Cleanest integration with inherited Phase 1 architecture; matches R20 + R32 vendored-with-deltas precedent; requires manifest + AT_PIN_FILES maintenance. Blast radius higher (inherited file modified).
- **Consequence of B:** Strict A12 preservation; lower blast radius; potentially weaker integration semantics (wrapper may not intercept all inherited freeze-hook call sites).
- **Default if no operator answer:** Coordinator prior is A (vendored-with-deltas pattern is project-established). Architect spec-time discretion in absence of operator answer; ESCALATE if Architect determines neither option works cleanly.

**OQ-W3-3 (NEW — load-bearing for R32 MAJOR-1 surgery timing):** SCOPING-MEMO § 2.3 structural surgery (carry-forward from R32 MAJOR-1).
- **Option A:** WU-06 closes opportunistically IF Architect spec touches SCOPING-MEMO anyway (for SLICE 4 amendment).
- **Option B (Recommended):** Defer to WU-07 Phase 2 close-walk; treat as close-walk cleanup deliverable consistent with R32 disposition pattern (MAJOR-1 was pre-flagged forward at R32, not retro-fixed).
- **Consequence of A:** MAJOR-1 closes ~2 rounds earlier (R34 instead of R36); requires WU-06 spec scope to accommodate the surgery.
- **Consequence of B:** Cleaner scope-bounding for WU-06; consistent with close-walk pattern; +1-2 rounds before MAJOR-1 closes.
- **Default if no operator answer:** Coordinator prior is B. WU-06 Architect's call at spec time if opportunistic close fits scope.

**OQ-W1-2 (carry-forward from v1+v2):** WU-07 tier classification.
- **Option A:** audit + HYBRID_REVIEWER=true (close-walk audit-tier per R19/R22/R32 precedent; Hybrid Reviewer is a commitment layered on top of the audit document; R32 empirically validated this pattern).
- **Option B:** full (Hybrid Reviewer pair-review-style at Phase 2 close treated as architecturally novel; warrants Architect + Implementer + Reviewer roles).
- **Default if no operator answer:** Coordinator prior is A (validated at R32). Cluster's Memorial-Updater + Reviewer can promote at session start.

**OQ-W1-4 (carry-forward; not blocking; from prior close-walks):** OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring still parked per Phase 1 close-walk § 6, SLICE 1 close-walk § 3, SLICE 2 close-walk § 3, SLICE 3 close-walk. Not needed for SLICE 4 event-feed work. Operator gate before activating; defer to Phase 3+ activation.

**OQ-W1-5 (carry-forward; not blocking; from prior close-walks):** OQ-R08-3 — Phase 2 transient detector scheduling still parked. Orthogonal to SLICE 4 event-feed + attribution-layer work. Operator gate; defer to Phase 3+ activation.

**OQ-W3-4 (forward-looking; surfaces during WU-06 cluster):** Event-feed schema scope.
- Should the event-feed schema be a closed set (firmware push / model redeploy / env change / config change / capacity change — 5 fixed event-classes per SCOPING-MEMO § 2.3 enumeration) OR an extensible schema (operator-configured event-class registry)? Architect's call at spec-time brainstorm phase. Pre-flag to WU-06 dispatch routing.

---

## Wave 4 dispatch authorization

**Plan verdict:** READY-TO-DISPATCH per WAVE-GATE-03 § Wave 4 dispatch authorization (gate verdict ADVANCE).

OQ-W3-1 (file layout) is not blocking — Architect spec-time discretion in absence of operator answer with Coordinator default A. OQ-W3-2 (freeze-hook coupling scope) is not blocking — Architect spec-time discretion with Coordinator default A. OQ-W3-3 (SCOPING-MEMO surgery timing) is not blocking — defer to WU-07 default; opportunistic close at WU-06 allowed. OQ-W1-2 (WU-07 tier) is not blocking for Wave 4; operator answers before Wave 5 dispatch. OQ-W1-4/5/W3-4 are not blocking.

Wave 4 cluster authorized for dispatch:

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| CL-04-A | WU-06 SLICE 4 (event-feed ingestion + event-conditional attribution + freeze-hook coupling) | full | `scripts/run-pipeline.sh --tier full` from `~/concord/tessera` main worktree |

**Pre-dispatch operator actions:**

1. (Optional) Answer OQ-W3-1 (event-feed file layout — recommended before WU-06 dispatch; Coordinator default A applies if no answer).
2. (Optional) Answer OQ-W3-2 (freeze-hook coupling scope — recommended before WU-06 dispatch; Coordinator default A applies if no answer).
3. (Recommended) Author per-cluster scope block at `coordination/cluster-scopes/wave-4/wu-06-event-conditional-attribution.md` referencing all 6 CLUSTER-HANDOFF-3 artifacts emitted with WAVE-GATE-03 + WAVE-GATE-03 § Pre-flags table + this plan's Step 6 tier classification.
4. Run `scripts/run-pipeline.sh --tier full` from the main worktree (single-cluster; no `--coordinator`; no `multi-track-cluster-setup.sh`).

**Post-Wave-4 actions (Coordinator-owned):**

5. At Wave 4 gate, Coordinator authors `coordination/WAVE-GATE-04.md` per `templates/WAVE-GATE-TEMPLATE.md`, applying the wave gate checklist to WU-06 Reviewer report.
6. If Wave 4 gate clean (zero CRITICAL findings; no MAJOR contract-shape issues; A16 wire-format preserved), Coordinator dispatches Wave 5 (WU-07 Phase 2 close-walk; audit-tier + HYBRID_REVIEWER=true).
7. If Wave 4 gate surfaces WU-06 contract-shape MAJOR or CRITICAL, Coordinator emits WAVE-PLAN-04.md with amended WU-06 + dependent-WU rescoping. Wave 5 dispatch holds.
8. CLUSTER-HANDOFF-4-WU06-WU07.md authored at Wave 4 gate per "wave gate emits handoffs for the wave it's authorizing" convention.

**Wave 5 dispatch (forward-looking):**

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| CL-05-A | WU-07 Phase 2 close-walk | audit + HYBRID_REVIEWER=true | `scripts/run-pipeline.sh --tier audit HYBRID_REVIEWER=true` (or equivalent env-var invocation) from `~/concord/tessera` main worktree |

**HARD STOP at Wave 5 gate** per extended overnight authority 2026-05-18 mid-afternoon. Phase 2 close milestone is the new HARD STOP (replaces the SLICE 3 milestone HARD STOP that was lifted). Tessera Phase 3 (TAGGED-FUTURE per SCOPING-MEMO § 7) requires separate operator authorization in a subsequent session.

---

## Version history

| Version | Date | Trigger | What changed |
|---|---|---|---|
| v1 | 2026-05-18 | Initial PRD decomposition; first Coordinator invocation post-MR-1 vendoring | Initial 7-WU / 4-wave plan covering Phase 2 SLICE 3.B through Phase 2 close. WAVE-PLAN-01.md preserved on disk. |
| v2 | 2026-05-18 | SCOPING-MEMO MR-1 amendment carved out L0 contract sub-extension at HEAD `4a4869e`; Coordinator re-invocation. | Added WU-00 L0-CONTRACT; resequenced Wave 1 + Wave 2 to 2+3 fan-out shape; deferred SLICE 4 decomposition to OQ-W1-3. WAVE-PLAN-02.md preserved on disk. |
| **v3** | **2026-05-18** | **Wave 3 close (R32 WU-05 MERGE-READY) + operator authority extension lifting SLICE 3 HARD STOP + WAVE-GATE-03 emission. Resolves WAVE-PLAN-02 OQ-W1-3 SLICE 4 decomposition deferral.** | **(1) Detailed Wave 4 decomposition: WU-06 single-cluster sequential per Step 3 Judgment call 1 (D1 HIGH chains forbid clean fan-out across 06a/06b/06c sub-candidates). (2) Detailed Wave 5 decomposition: WU-07 carry-forward from v2 with audit+HYBRID_REVIEWER=true Coordinator prior (R32 empirical validation noted). (3) Inbound D-edge analysis to WU-06 from Wave-1/Wave-2/Wave-3 deliverables documented (5 D2 MEDIUM + 1 D1 HIGH + 1 D2/convention = 6 CLUSTER-HANDOFF-3 artifacts emitted at WAVE-GATE-03). (4) Three new OQs surfaced (OQ-W3-1 file layout; OQ-W3-2 freeze-hook coupling scope; OQ-W3-3 SCOPING-MEMO surgery timing). (5) Carry-forward OQ-W1-2 (WU-07 tier) + OQ-W1-4 (calibrate.ts) + OQ-W1-5 (transient detector scheduling) acknowledged. (6) Total wave count unchanged from v2 (still 5 waves); WU count unchanged (still 8 WUs); v3 detail-completes the deferred v2 Wave-4/5 columns. (7) HARD STOP shift: original SLICE 3 milestone HARD STOP lifted per operator extension 2026-05-18 mid-afternoon; new HARD STOP at Phase 2 close (Wave 5 gate).** |
