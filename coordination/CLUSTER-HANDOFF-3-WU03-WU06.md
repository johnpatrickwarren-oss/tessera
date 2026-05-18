# CLUSTER-HANDOFF-3-WU03-WU06 — WU-03 NVLINK-ADAPTER → WU-06 EVENT-CONDITIONAL ATTRIBUTION

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-C (Wave 2) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 Step 2 inbound edges; `coordination/reviews/REVIEWER-REPORT-R30.md`; `WAVE-GATE-03.md`
**Type:** cross-cluster dependency contract (D2 MEDIUM — interface-only; same shape as WU-01/02 → WU-06)

---

## Purpose

WU-06's event-conditional attribution layer may topology-condition. The topology side reads the abstract `TopologySource` interface + `TopologySnapshot` shape from inherited `engine/topology-overlay.ts:40-43`. WU-06 does NOT import NVLink-specific parser (`engine/topology/nvlink-source.ts`) directly — adapter selection happens at operator/orchestrator layer. Same INTERFACE-ONLY edge shape as WU-01 + WU-02 → WU-06.

**Note on WU-03's special role at Wave 2:** WU-03 was the D1 HIGH consumer of WU-00 L0 contract (NVLink 32-bit error counters exemplify the wrap-handling path; R-E7 mitigation evidence package landed here). That D1 HIGH was at the L0 ↔ NVLINK edge; the NVLINK ↔ WU-06 edge is at the topology interface boundary (NOT the L0 interface boundary), so the same INTERFACE-ONLY D2 MEDIUM shape applies as for SLURM + K8S.

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-2→Wave-4 cross-wave edge is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch.

---

## Dependency edge

- **Source cluster:** CL-02-C
- **Source work unit:** WU-03 — NVLINK-ADAPTER + R-E7 MITIGATION (Tessera Phase 2 SLICE 3.B; R30)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (interface-only at topology boundary — same shape as WU-01/02 → WU-06)
- **Dependency test that fired:** D2 (AC reference / interface contract)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** WU-06's topology-conditioning reads `TopologySource` interface + `TopologySnapshot` shape (specifically the `'nvlink_peer'` relationship literal for NVLink-topology conditioning). Does NOT import `NvlinkTopologySource` class directly.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `nvlink-source.ts` | `engine/topology/nvlink-source.ts` (~170 lines; Tessera-original) | `NvlinkTopologySource implements TopologySource`. Parses `nvidia-smi nvlink --status` text output. Canonical undirected-edge dedup (`from < to` lex). Emits `TopologyEdge.relationship = 'nvlink_peer'`. |
| `q30-nvlink-adapter.test.ts` | `test/q30-nvlink-adapter.test.ts` | 18 ACs PASS including AC-R30-10..14 R-E7 mitigation evidence (32-bit wraparound, missed-scrape catchup, reset-vs-wrap disambiguation, variable-interval normalization, R25 MINOR-2 opportunistic close). R30 MINOR-1 (AC-R30-15 substring-match weakness) CLOSED at R32 (regex with /m anchor; AC-R32-15). R30 MINOR-2 (constructor third-operand dead code) CLOSED at R32 (inline comment; AC-R32-16). |
| `nvlink-fixture-*.txt` | `test/_substrate/nvlink-fixture-*.txt` | Synthetic `nvidia-smi nvlink --status` text output fixtures. |
| `Q-R30-SPEC.md` | `coordination/specs/Q-R30-SPEC.md` | R30 Architect spec. |
| `REVIEWER-REPORT-R30.md` | `coordination/reviews/REVIEWER-REPORT-R30.md` | R30 Reviewer report: 0 CRITICAL / 0 MAJOR / 2 MINOR (both CLOSED at R32) / 4 OBS. |

### Interface contract

Same as WU-01/02 → WU-06 handoff. WU-06 reads only the abstract `TopologySource` interface + `TopologySnapshot` shape + `TopologyEdge.relationship` enum (including `'nvlink_peer'` literal for NVLink-topology conditioning); does NOT import NVLink parser or NVLink-specific text-output format types.

### R-E7 mitigation evidence (cross-edge corroboration; not a WU-06 dependency)

R-E7 MITIGATED status (per PHASE-2-SLICE-3-CLOSE-WALK § 7) was confirmed at WU-03 via AC-R30-10..14 empirical evidence against the synthetic counter generator. This is corroborating evidence for the L0 contract robustness, NOT a WU-06 input. WU-06 inherits R-E7 MITIGATED as part of the SLICE 3 milestone state stamp — does NOT need to re-validate.

---

## Verification status

Per `REVIEWER-REPORT-R30.md` + R32 closure of both R30 MINORs + `WAVE-GATE-02.md`:

- [x] Output artifact (`nvlink-source.ts`) exists at the stated location; verified at gate via main HEAD `c503edb` (bit-identical to R30 merge HEAD `56ee259` except for R32 inline comment at `:133-135`; comment-only change per R30 MINOR-2 closure).
- [x] Interface contract matches Reviewer per-AC verification (18 ACs PASS).
- [x] All R30 MINORs CLOSED at R32 (per PHASE-2-SLICE-3-CLOSE-WALK § 4 table).
- [x] R-E7 mitigation evidence complete (4 failure-mode paths exercised).
- [x] A16 wire-format invariant assertion strengthened at R32 (AC-R32-15 regex with /m anchor).
- [x] Parallel-class architecture preserved.

---

## What the target cluster must not assume

Same as WU-01/02 → WU-06 handoff (interface-only stance; no impl-detail imports; parallel-class architecture). WU-03's NVLink-specific text parsing internals + R-E7 mitigation evidence package are NOT WU-06's responsibility to re-validate or extend — both are SLICE 3 milestone-stamped.

---

## Pre-flags from wave gate

Same as WU-01/02 → WU-06 handoff. Additionally:
- **A16 wire-format binding precedent at AC-R32-15** (regex `/^\s*correlational_not_causal:\s*true\s*;/m`) is the binding-pattern WU-06 MUST match at its own attribution-layer emit sites (per WAVE-GATE-03 § Pre-flags + CLUSTER-HANDOFF-3-WU04-WU06 A16 precedent table).
- **R-E7 MITIGATED at WU-03**; WU-06 inherits as SLICE 3 milestone state stamp.

---

## Halt conditions for target cluster

Same shape as WU-01/02 → WU-06 handoff:
1. WU-06 requires modification of `nvlink-source.ts` body — HALT; Wave-2-frozen.
2. WU-06 requires extending `TopologySource` interface — HALT; ESCALATE.
3. WU-06 requires a new `TopologyNode.kind` or `TopologyEdge.relationship` enum literal — HALT; vendored-with-deltas transition.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | DEFERRED | Cross-wave edge timing. |
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff emitted at Wave 3 gate authorizing Wave 4 dispatch. NVLINK adapter surface verified at main HEAD `c503edb` (R32 inline comment-only change at `:133-135`). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation (deferred from Wave 2 gate per cross-wave handoff timing convention) | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
