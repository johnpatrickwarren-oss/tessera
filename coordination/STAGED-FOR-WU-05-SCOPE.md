# Staged-for-WU-05-scope: items to fold into WU-05 SLICE 3 close-walk

_Durable staging artifact for items the operator has authorized to land in the WU-05 SLICE 3 close-walk scope block (Wave 3 dispatch). Survives session compaction. The Wave 3 dispatch step (current task #20) reads this file when authoring `coordination/cluster-scopes/wave-3/wu-05-slice-3-close-walk.md`._

---

## Item 1 — Vendor-fungibility SCOPING-MEMO amendment

**Operator-requested:** 2026-05-18 mid-Wave-2 ("stage that for review at SLICE 3 close").

**Origin question:** "We've made considerations for nvidia architecture, but is the way metrics are processed from the hardware by tessera fungible to AWS or GCP, for example? Architectures that are independent of nvidia..."

**Architectural assessment (already established mid-Wave-2):**

The methodology is fungible at every load-bearing surface (per-shard detector layer; fleet-merge; VerdictGroup; L0 contract; TopologySource interface; BFS-on-undirected attribution; common-mode attribution). The NVIDIA flavor lives at adapter/enum boundaries only — the implementation is NVIDIA-first because the launch market is NVIDIA, not because of architectural lock-in.

| Surface | Fungibility | Where vendor-specificity (if any) lives |
|---|---|---|
| Per-shard detector layer (`engine/detectors/*`, `engine/core.ts` TrendBuffer) | ✅ Vendor-agnostic by construction | None — "shard" is caller-declared |
| Fleet-merge (R11/R12/R13: combine, detectors, e-bh) | ✅ Vendor-agnostic | None — operates on per-shard verdicts |
| VerdictGroup + cluster_event_id scope (R20/R21) | ✅ Vendor-agnostic | None — operator-level event abstraction |
| L0 contract (R25 WU-00) | ✅ Vendor-agnostic | Triggers on `semantic_type === 'counter'`, not vendor; 32-bit wrap math is vendor-neutral |
| `TopologySource` interface (Addition #26 inherited) | ✅ Vendor-agnostic abstract | None — implementations are vendor-specific |
| BFS-on-undirected attribution (R26 WU-04) | ✅ Vendor-agnostic | None — operates on abstract graph |
| Common-mode attribution (R26) | ✅ Vendor-agnostic | None — topology claim |
| `TopologyEdge.relationship` enum | ⚠️ NVIDIA-flavored, extensible | `'nvlink_peer'` literal (R23); extensions for `xgmi_peer` / `neuron_link_peer` / `tpu_ici_peer` straightforward |
| `TopologyNode.kind` enum | ⚠️ NVIDIA-flavored, extensible | `'gpu_shard'` literal (R18); extensions for `tpu_shard` / `trainium_chip` straightforward |
| WU-03 NVLINK adapter (in flight R30) | ❌ NVIDIA-only | Parallel-class — future `rocm-source.ts` / `tpu-source.ts` / `trainium-source.ts` slot in beside |
| R-E7 mitigation evidence package | ❌ NVLink-counter-flavored | Pattern reusable — synthetic counter generator already parameterizes `counter_width` |
| SCOPING-MEMO § 2.3 A10 language | ❌ References "DCGM / NVML" by name | Generalization candidate — see amendment scope below |

## Amendment scope for WU-05 close-walk

1. **Generalize § 2.3 A10 language.** Current text fences "DCGM / NVML integration, per-GPU hardware-fault attribution" by NVIDIA name. The MR-1 amendment already established the principle ("hardware *diagnosis* fenced; measurement-domain preprocessing in-scope"); the literal wording should generalize across vendors. Candidate replacement: *"NO hardware-diagnostic territory. Vendor-stack diagnostic tooling (DCGM/NVML for NVIDIA; ROCm-SMI for AMD; Neuron SDK for AWS Trainium; TPU runtime libraries for Google TPU; equivalent for future accelerator vendors) is out of scope for Tessera. Tessera consumes the resulting telemetry as inputs via vendor-specific adapters implementing the `TopologySource` interface + the L0 contract surface for counter-typed metrics."*

2. **NEW section: § 2.4 "Vendor fungibility" (or appended to § 2.3).** Document explicitly which surfaces are vendor-fungible vs vendor-flavored vs vendor-specific. Use the table above as the source. Establish that the NVIDIA-first implementation is a launch-market choice, not an architectural lock-in.

3. **TAGGED-FUTURE for non-NVIDIA vendor adapters.** AMD (ROCm + Infinity Fabric / XGMI), Google TPU (ICI), AWS Trainium (Neuron Link), AWS Inferentia, future accelerator vendors. Each follows the established WU-03 NVLINK pattern: new parallel-class file at `engine/topology/<vendor>-source.ts`; new `TopologyEdge.relationship` enum literal; new vendor-specific test substrate; consumes L0 contract by interface. Phase 3+ candidates per established TAGGED-FUTURE convention.

4. **Update SCOPING-MEMO § 1.7 ("shard = 1 GPU rank") for vendor-neutrality.** Current definition explicitly cites NVIDIA FSDP convention. Should add a note: *"Vendor-equivalent: TPU pod slice = 1 TPU chip per rank; Trainium = 1 NeuronCore per rank; AMD ROCm = 1 GPU per rank (same as NVIDIA convention). The granularity-agnostic per-shard detector layer (§ 1.7 final paragraph) accommodates all vendor conventions; the caller declares granularity at fleet configuration time."*

5. **PRD US-01 wording generalization.** Current text says "shard 47 has a bad GPU"; should generalize to "accelerator" or "shard" (vendor-neutral). Minor edit; lands in same amendment.

## Amendment positioning in WU-05 close-walk

WU-05 is currently scoped (per WAVE-PLAN-02 + WAVE-GATE-01 forward-flags) to:

- Aggregate Wave 1 + Wave 2 outputs into the SLICE 3 close-walk doc
- Close all 9 carry-forward MINORs (R25/R26 MAJORs and MINORs pre-flagged from Wave 1 gate)
- Run hybrid Reviewer (Opus + Sonnet + Merger) pair-review per SCOPING-MEMO § 3 SLICE 3.C row
- Stamp SLICE 3 milestone
- Frame SLICE 4 entry

**This amendment adds:** vendor-fungibility SCOPING-MEMO amendment (1-2 hours of Architect spec work; lands as a separate deliverable from the close-walk doc itself but in the same close-walk cluster). WU-05 Architect produces:
- The amendment block for review (similar to how MR-1 amendment was drafted operator-side; this one drafted by WU-05 Architect for operator approval at SLICE 3 close)
- A short summary in the close-walk doc § "Vendor fungibility stance" referencing the amendment block

**This amendment does NOT:**
- Author new vendor adapters (those are TAGGED-FUTURE Phase 3+ candidates)
- Modify any in-flight Wave 2 work
- Change A10's fundamental intent (hardware diagnosis still fenced)

---

_When more items get staged for WU-05 scope, append below as Item 2, Item 3, etc._
