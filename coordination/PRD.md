# Product Requirements Document — Tessera

_Thin PRD pointing to canonical SCOPING-MEMO-v0.3.md as the load-bearing scoping artifact. The Anchor pipeline reads this file as the Architect's primary input; SCOPING-MEMO-v0.3.md fulfills the PRD role at SCOPE-PROPOSAL fidelity (anchor's `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity, since per-extension architectural decisions and Q-cycle estimates are upstream of formal AC tables)._

## Project goal

Tessera is a statistically-rigorous behavioral observation system for AI training/inference clusters. It detects deviations in per-shard and cluster-wide behavior at the per-shard level, surfacing issues before they cause impact. Reuses DeploySignal's statistical detector engine (Family A/C/D/E detectors, Ville-bounded e-process, hierarchical pooling) via **vendor-first sharing** (engine code copied into Tessera tree with per-file SHA pins at SHA `5a72371`); the shared subset extracts to a separate npm package at Tessera Phase 2 close.

Full project framing: see [`SCOPING-MEMO-v0.3.md`](./SCOPING-MEMO-v0.3.md) § 1 + § 1.5 (memo structure options) + § 2 (per-extension scope) + § 9 (engine vendoring policy).

## Users / personas

- **Cluster oncall** — receives real-time per-shard attribution alerts (alarm path).
- **AI infrastructure operator** — consumes post-hoc audit + topology-aware attribution (audit path).
- **Tessera architect** (John) — makes strategic Q-J architectural-decision picks; gates Q-cycle activation.

## User stories

US-01: As a cluster oncall, I want per-shard fault attribution that distinguishes "shard 47 has a bad GPU" from "all shards drift because of a fleet event" so that I can route to the right remediation (hardware swap vs deploy rollback vs config rollback) without triaging N independent alerts.

US-02: As an AI infrastructure operator, I want topology-aware common-mode failure attribution (rack-localized PSU events; cooling-zone failures; NVLink-peer correlation) so that physical-substrate failures surface at the topology level rather than via shard-by-shard inspection.

US-03: As an AI infrastructure operator, I want event-conditional correlational attribution — drift correlated with a fleet-level deploy/firmware/config event — so that I can distinguish event-conditional drift from coincidental concurrent drift (preserving correlational-not-causal labeling per inherited Addition #26 D4).

US-04: As Tessera architect, I want a statistically-rigorous fleet-FPR guarantee (hybrid per-shard any-time Ville + fleet-level FDR via e-BH) so that Tessera's pitch claim of "statistically-rigorous fleet detector" is load-bearing against the alternative "N copies of a detector with broken FPR."

## Functional requirements (per-extension; full detail in SCOPING-MEMO-v0.3.md § 2)

| ID | Requirement | Traces to | Phase |
|---|---|---|---|
| FR-E1 | α budget arithmetic at fleet scale — hierarchical e-value combination + e-BH FDR operator surface | US-04 | Phase 1 |
| FR-E2 | Per-shard baseline calibration — hierarchical baseline (fleet prior + per-shard residual) extending Addition #2 | US-01 | Phase 1 |
| FR-E3a | Cross-shard correlation: outer aggregator (extends Addition #25 VerdictGroup scope from `(deploy_id, …)` to `(cluster_event_id, …)`) | US-01 | Phase 2 |
| FR-E3b | Cross-shard correlation: topology-aware spatial attribution (HardwareTopologySource impl against Addition #26 TopologySource interface) | US-02 | Phase 2 |
| FR-E3c | Cross-shard correlation: event-conditional correlational attribution (preserves Addition #26 D4 wire-format) | US-03 | Phase 2 |

## Acceptance criteria

Per-extension ACs at the spec level (not at PRD level — Tessera's per-phase specs in `coordination/specs/Q-RNN-SPEC.md` enumerate ACs exhaustively per anchor `templates/Q-NN-SPEC-TEMPLATE.md`). PRD-level acceptance is **Phase-close** acceptance:

| ID | Given / When / Then | Traces to |
|---|---|---|
| AC-P1 | Given a fleet of N=100-10000 shards under healthy traffic, when Tessera Phase 1 detector cascade runs, then per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4. | FR-E1 |
| AC-P2 | Given freshly-provisioned shards, when their per-shard baseline cold-starts, then warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold); strict-upgrade at 60 samples preserves inherited single-instance behavior. | FR-E2 |
| AC-P3 | Given fleet-level event (firmware push / deploy / config change), when Extension 2 freeze-hook is enabled (Phase 2 activation), then per-shard baselines do not absorb the event-driven drift into per-shard residual during the post-event window. | FR-E2 (with Phase 2 dependency) |
| AC-P4 | Given cluster topology + deployment-event feed inputs, when Tessera Phase 2 outer aggregator runs, then per-shard verdict attribution distinguishes (i) single-shard fault / (ii) topology-localized common-mode / (iii) fleet-level event-conditional drift; output preserves Addition #26 D4 `correlational_not_causal: true` wire-format constraint. | FR-E3a/b/c |

## Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Inherited per-tick latency baseline preserved at fleet scale: median 30 μs / p99 63 μs / max 194 μs per per-shard instance (per `deploysignal/runs/benchmarks/tick-latency-baseline.json` @ SHA `5a72371`); at N=1000 shards fleet-tick CPU budget ~30 ms total. Architect-pre-prediction: storage 1.2-1.5× single-instance footprint via sparse per-shard residual (PR-F5 empirical-validation at Phase 1 SLICE 2). **[R17 AMENDMENT: prediction empirically refuted — R14 PR-F5 measured 1237.7× at N=1000; ratio ≈ N; operator disposition (β) pitch-revise confirmed 2026-05-17. See `SCOPING-MEMO-v0.3.md` §§ 1.7, 1.8, 2.2, 4.2.]** |
| Security | Inherited enterprise-infrastructure boundary preserved (no real customer cluster telemetry; synthetic-cluster substrate only at Phase 1 + 2). |
| Reliability | Inherited Ville-bounded statistical guarantees preserved per Phase-3.d.D close (DeploySignal main @ SHA `5a72371` LEDGER:176/179 + PRESERVED-PERMANENT-POST-PHASE-D). |
| Compatibility | Engine vendored at SHA `5a72371`; re-pin policy at every Tessera close-walk; extract-to-npm-package commitment at Phase 2 close. |

## Anti-scope

Full A1-A17 enumeration in SCOPING-MEMO-v0.3.md § 2.1 / § 2.2 / § 2.3. Headline:

- A8/A11: NO real customer cluster telemetry (enterprise-infrastructure boundary inherited).
- A10: NO hardware-diagnostic territory (DCGM / NVML / per-GPU faults are NVIDIA-stack scope).
- A12/A5: NO modification to vendored detector internals (Phase-3.d.D inherited closure).
- A13: NO ML-based attribution model (conflicts with inherited honest-broker stance).
- A15: NO multi-region / cross-cluster federation (intra-cluster scope only).
- A16: NO Addition #26 D4 reversal (correlational-not-causal wire-format preserved).
- A17: NO DeploySignal-integration scope at Phase 1 + 2 (decoupled-for-now; Phase 3+ commitment).

## Success metrics

- Phase 1 SLICE 1 close: 10 ACs binary-met-or-not; spec at `coordination/specs/Q-R01-SPEC.md`.
- Phase 1 close: 5 SLICEs aggregated; α-budget formal-property regression evidence; PR-F1 + PR-F2 pair-review evidence matrices.
- Phase 2 close: HardwareTopologySource concrete impl; event-feed ingestion; PR-F6 + PR-F7 pair-review evidence matrices; Addition #26 D4 RECONFIRMED.
- Project close: Tessera v1 published to GitHub (`github.com/johnpatrickwarren-oss/tessera`); engine extracted to shared npm package (vendor-first commitment realized).

## Open questions

Six architectural decision-points captured in `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:

- Q-J1 through Q-J5: architect-pre-prediction picks landed (confidence HIGH × 4 + MEDIUM × 1); subject to John override on first review.
- **Q-J6: ESCALATED** — cross-project sequencing (Tessera vs DeploySignal Phase E) is John's call; pipeline does not fire R01 until Q-J6 dispositioned. See `coordination/NEXT-ROLE.md` STATUS + escalation items.

## Update history

| Date | Change |
|------|--------|
| 2026-05-15 | Initial Tessera scoping cycle (v0.1 → Reviewer → v0.2 → project reframe → v0.3) |
| 2026-05-16 | Q1 spec emitted + Reviewer-amended (v0.2); Mode 2 retrofit (PRD.md / NEXT-ROLE.md / MEMORIAL.md / pipeline scripts) |

---

_PRD thin-pointer convention: full project framing in SCOPING-MEMO-v0.3.md; per-phase architectural commitments in coordination/specs/Q-RNN-SPEC.md; this file routes pipeline Architect to those artifacts as primary inputs._
