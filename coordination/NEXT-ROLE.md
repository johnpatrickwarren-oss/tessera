CURRENT-ROUND: R06
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R06 = Phase 1 SLICE 4: baseline curation toolchain vendoring + Stage 2a per-shard within-window screening + Stage 3a calibration handoff.**

This round is NOT continued SLICE 2b runtime work (the SLICE 2b series closed at R05 with the Welford-into-PerShardResidual composition; the natural-next pull toward SLICE 2b4 emission work is **deferred to R07+**). R06 pivots to the baseline-curation track per the operator-prepared scoping memo + pre-disposition committed at SHA `aee274c`.

If the Architect's brainstorm produces a strong case to defer the curation pivot and continue SLICE 2b4 instead, that is a HALT-and-route-back condition — write a DIAGNOSTIC explaining why and STATUS: ESCALATE. Do not silently absorb the scope into a different slice. The operator-set scope decision (curation-before-warm-start-caching is order-load-bearing — see SCOPING-MEMO-BASELINE-CURATION-v0.2.md § 1 executive summary) takes priority over natural-continuation inclination.

## Inputs for next role (load-bearing — READ ALL)

The R06 Architect MUST read these before brainstorming:

**Scoping artifacts for this round's pivot (canonical authorities for R06 scope):**
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` — full scoping memo for the baseline-curation track. § 1.6 Existing architectural surface is REVIEWER-ANCHOR-mandatory. § 2 Per-stage scope is the binding scope for R06 (Stage 1 + Stage 2a + Stage 3a; Stage 2b FCP-1 deferred to R07).
- `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` — all 9 Q-JC dispositions (Q-JC1 through Q-JC6 + Q-JC4a/b/c). John-confirmed; treat as load-bearing dispositions, not pre-predictions subject to revision.

**Tessera scoping context:**
- `coordination/SCOPING-MEMO-v0.3.md` — canonical Tessera scope; § 3 Phase 1 / Phase 2 boundary; § 9 vendoring policy (load-bearing for Q-JC1 vendoring decision).
- `coordination/PRD.md` — thin PRD pointing at v0.3 SCOPING-MEMO as the load-bearing scoping artifact.

**R05 close-state (the SLICE 2b series ends here; R06 builds atop this composition):**
- `coordination/specs/Q-R05-SPEC.md` + `coordination/specs/Q-R05-SPEC-AUDIT.md` — Welford-into-PerShardResidual composition spec + audit sidecar.
- `engine/per-shard/runtime.ts` (R05 GREEN: composition function `updatePerShardResidual`) + `engine/per-shard/warm-start.ts` (R03, untouched at R05) + `engine/per-shard/welford.ts` (R04, untouched at R05 except JSDoc refresh).

**Discipline memorials:**
- `coordination/MEMORIAL.md` — full project history; R01–R05 entries.
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` — apply every "Reinforcement rules derived" entry.

**Inherited engine surface at SHA `5a72371` (file-opened-discipline mandatory):**
- `engine/types/families/c.ts` (currently vendored at Tessera) — Family C robust covariance estimators (`covariance_method: 'mcd' | 'mrcd' | 'ledoit_wolf'`); declaration at lines 5–7; breakdown-point comment at line 374. Stage 2a uses these.
- `engine/types/config.ts` (currently vendored at Tessera) — `BaselineCurationDecisionId` union + `BaselineCurationDecision` interface + `baseline_curation_pipeline_diagnostics` field at lines 198–219. Stage 2a extends this enum with new decision IDs (D11 per Q-JC bindings) additively.
- `tools/calibrate.ts` (NOT yet vendored in Tessera; at DeploySignal main@`5a72371`) — calibration entry point; header at lines 1–30 states "reads a healthy BaselineBundle" assumption. Q-JC1 dispositions vendor-at-pin.
- `tools/calibrators/family-c.ts` (NOT yet vendored in Tessera) — per-cell Family C parameter fitting with robust covariance method dispatch. Q-JC1 dispositions vendor-at-pin.
- `tools/curate-baseline-pipeline.ts` (NOT yet vendored in Tessera) — audit-emission orchestrator; lines 23–25 confirm "pipeline does no calculation; just inspects state and stamps audit records" (this is audit-emission infrastructure, NOT contamination filtering — corrects an earlier conversational misimpression; see v0.2 memo § 1.6 for full correction).

## Methodology gap notice (for Memorial Updater + future-rounds learning)

R05 mis-targeted scope (produced SLICE 2b3 instead of operator-authorized SLICE 4 baseline curation) because the pipeline preflight auto-overwrote NEXT-ROLE.md at R05 launch, wiping the operator-prepared inputs section. Root cause: preflight auto-init runs when `CURRENT-ROUND: $ROUND` is absent, regardless of whether operator-prepared inputs are present in the file.

R05 work is being accepted as-is (clean MERGE-READY, closes the R04 accumulator-strategy pre-prediction, load-bearing for R06 anyway), but the methodology fix to the canonical anchor `run-pipeline.sh` preflight is now armed as a parallel anchor PR follow-up. Memorial Updater at R06 close should record this as a methodology-class entry (cross-role / methodology lesson → CLAUDE-COMMON.md).

## Escalation items

(none — Q-JC dispositions all confirmed; R06 Architect has cold-readable inputs)

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R06 --tier full
```

`--tier full` per A2 (new architectural pattern — first Tessera tools-vendoring round) + A7 (first-time architectural territory — first contamination-screening stage). Tier rubric does NOT justify a downshift to audit or solo.

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | Mode 2 retrofit; R01 IMPLEMENTER initial state. |
| 2026-05-16 | Per-role CLAUDE.md split + spec audit-sidecar pattern landed (anchor PR #36 merged). |
| 2026-05-16 | R01–R05 cycles complete: substrate sound (engine vendoring + schema deltas + warm-start runtime + Welford composition). |
| 2026-05-16 | Baseline curation scoping memo v0.2 + 9-Q-JC pre-disposition committed at `aee274c`. |
| 2026-05-16 | R05 produced SLICE 2b3 (Welford composition) instead of operator-authorized SLICE 4 baseline curation; root cause = pipeline preflight auto-overwrote NEXT-ROLE.md. R05 work accepted as-is. |
| 2026-05-16 | NEXT-ROLE.md manually prepared for R06 = SLICE 4 baseline curation with explicit input-surfacing + scope-direction language. |
