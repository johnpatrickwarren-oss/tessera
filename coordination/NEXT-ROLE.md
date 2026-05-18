CURRENT-ROUND: R20
NEXT-ROLE: REVIEWER
STATUS: READY
Inputs: main branch, 191 pass / 0 fail (GREEN SHA cf9ddce; chore-A SHA below)
Attested chore-A SHA: 23a497e (MERGE-READY-SHA for AC-R20-12; substituted per § 4.6 step 3 + TQ-4 γ)

## Round-scope directive

**R20 = Phase 2 SLICE 2 — first round.**

SLICE 2 scope per `coordination/SCOPING-MEMO-v0.3.md` § 2.3 row "Phase 2 SLICE 2" (2-3 Q-cycle estimate; this is round 1 of that estimate):

> Outer aggregator extending vendored L3b VerdictGroup aggregator with cluster_event_id scope. Fleet-merge consumption layer. Per-shard verdict aggregation contract with `cluster_event_id` propagation. **VerdictGroup scope re-architecture cost dominates this slice.**

R18 (Phase 2 SLICE 1) landed the type-layer substrate: `VerdictGroup.cluster_event_id?: string` is in place but **non-load-bearing**. R20 SLICE 2 makes it load-bearing.

The R20 spec should identify which SLICE 2 sub-goals fit in one round vs which deferred to R21 / R22. Recommendation: scope re-architecture of the aggregation contract is the dominant cost; consider splitting fleet-merge consumption layer to a later slice round if R20 spec scope exceeds ~12 ACs.

**Tier: full.** Architect MUST run pre-emit grilling + cross-section consistency pass + OBSERVED-binding scope. Justification: A4 (novel data-model semantics for composite cluster-event scope) + A6 (blast-radius on `engine/verdict-groups.ts` consumers — every existing inherited consumer of VerdictGroup grouping).

## Inputs for next role (Architect)

**Read in order:**

1. **`coordination/PRD.md`** — thin PRD; FR-E3a (cross-shard correlation outer aggregator), US-01, AC-P4.
2. **`coordination/SCOPING-MEMO-v0.3.md`** — canonical scope. Specifically:
   - § 2.3 Phase 2 Extension 3 — full scope of cluster_event_id semantics
   - § 2.3 "VerdictGroup scope re-architecture" sub-section (around line 221) — the four bullets on what re-scoping touches
   - § 3 Q-cycle estimate table — SLICE 2 row (line 345)
   - § 9 vendoring policy (relevant if `engine/verdict-groups.ts` needs deltas)
   - R17 [R17 AMENDMENT] storage-ratio refutation context (§ 2.2)
3. **`coordination/PHASE-2-SLICE-1-CLOSE-WALK.md`** — close-walk of R18.
   - § 2 ESCALATE-and-unblock pattern + vendored-with-deltas two-step maintenance pattern
   - § 2 "Companion pattern — anti-scope diff-range SHA anchoring" (TQ-4 (γ) operator disposition)
   - § 3 Phase 2 SLICE 2 entry framing
4. **`coordination/specs/Q-R18-SPEC.md`** + **`coordination/specs/Q-R18-SPEC-AUDIT.md`** — R18 spec for vendoring-with-deltas precedent and ESCALATE-handling template.
5. **`engine/verdict-groups.ts`** — inherited L3b aggregator (THE extension target). Vendored-at-pin. Currently scoped `(deploy_id, window_start_ts)`. Note Addition #25 D2 (late-arrival semantics) + D5 (group_id format) clauses — preservation walk required.
6. **`engine/types/verdict.ts`** — vendored-with-deltas. R18 added `VerdictGroup.cluster_event_id?` at line 201-209. Confirm field exists; do not modify other fields.
7. **`test/_substrate/v9X-cluster.ts`** — R18 substrate. Architect does NOT modify; SLICE 2 may consume.
8. **`coordination/VENDORING-MANIFEST.md`** — current vendoring policy table; `engine/verdict-groups.ts` currently `vendored-at-pin`. Architect spec must determine whether R20 transitions it to `vendored-with-deltas` (apply two-step maintenance pattern from PHASE-2-SLICE-1-CLOSE-WALK § 2 upfront if so).
9. **`coordination/OVERNIGHT-LOG-2026-05-17.md`** — most-recent operator dispositions (TQ-1 β, TQ-3 A, TQ-4 α+γ).

## Anti-scope (R20 hard limits)

- **A12 — NO modification of inherited L3b aggregator internals** beyond architecturally-anchored extension points. If scope re-architecture requires touching `engine/verdict-groups.ts`, transition to `vendored-with-deltas` and apply the two-step maintenance pattern (manifest + AT_PIN_FILES) UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2. Spec failure-mode analysis MUST enumerate every q01-* test that asserts byte-identity on touched files.
- **NO `HardwareTopologySource` concrete impl** — that's SLICE 3 (R21+).
- **NO deployment-event-feed ingestion** — that's SLICE 4.
- **NO Addition #25 D2 reversal** (late-arrival semantics): inherited late-arrival → `late_arrival_verdicts` + `verdict_group_updated` event must be preserved. Spec must address: how do late arrivals classify under cluster-event scope (mismatched `cluster_event_id` → drop? new group? attached as "cross-event late arrival"?).
- **NO Addition #25 D5 reversal** beyond minimum: the inherited `group-{deploy_id}-{window_start_ts}` format may be extended (e.g., `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` or scoped variant), but the factory pattern + format-string discipline must be preserved.
- **NO modification of v9X fixture** (`test/_substrate/v9X-cluster.ts`) — R18 substrate is frozen for SLICE 2-4 consumers.
- **NO modification of fleet-merge layer** (`engine/fleet/combine.ts`, `engine/fleet/detectors.ts`, `engine/fleet/e-bh.ts` from R11/R12/R13) — SLICE 2 is consumer-only on these surfaces.
- **NO Addition #26 D4 reversal** — `correlational_not_causal: true` wire-format invariant preserved.

## Architectural questions for Architect's brainstorm phase

The Architect's brainstorm + recommendation should resolve at minimum:

1. **Cluster-event-id origination point.** Does `cluster_event_id` flow in via (a) parameter on ingest()? (b) per-call context object? (c) field on the incoming FusedVerdict? (d) aggregator config? Implication: SLICE 4 event-feed ingestion will be the producer; SLICE 2 contract design constrains SLICE 4's surface.
2. **group_id format under cluster-event scope.** Composite `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` OR scoped `group-{cluster_event_id}-{window_start_ts}` with deploy_id moved to group metadata, OR conditional (use cluster_event_id when present, fall back to deploy_id-only inherited format)? Trade-off: backward compat with inherited consumers vs single canonical format.
3. **Multi-deploy-per-event semantics.** A single `cluster_event_id` can span multiple `deploy_id`s per scope-memo § 2.2 line 204. How does the aggregator accumulate FusedVerdicts from different deploy_ids into one cluster-event group? Keying rule + window boundary handling.
4. **Backward-compat path.** SLICE 1 made `cluster_event_id?` optional. SLICE 2 question: does it become required in the consumer contract, or does an absent value preserve inherited deploy_id-only scope (legacy mode coexisting with cluster-event mode)? Affects all existing inherited consumers.
5. **Late-arrival classification under cluster-event scope** (Addition #25 D2 preservation). Specifically: a late-arriving verdict carrying cluster_event_id X arriving when the most-recently-closed group had cluster_event_id Y — drop? new group? attached as cross-event late arrival? Spec must pick one.
6. **Fleet-merge consumption layer split decision.** Spec scope: include fleet-merge consumer wiring in R20 (likely 12+ ACs), or scope R20 to aggregator-contract-only and defer fleet-merge consumption to R21? Recommend the split if R20 ACs > 12.

## Escalation items

(none active)

## Routing notes

- Operator authorized "go slice 2" 2026-05-17 evening. Overnight authority `project_overnight_authority_2026_05_17_evening.md` remains active; chain authority extends to SLICE 2.
- Anti-scope diff-range checks (`AC-R20-N: git diff <start-sha>..<end> --name-only ⊆ allowed-set`) MUST anchor `<end>` to round-MERGE-READY-SHA, NOT to HEAD, per PHASE-2-SLICE-1-CLOSE-WALK § 2 companion pattern (TQ-4 γ disposition). The Architect spec should include this anchor pattern explicitly in any anti-scope AC it writes.
- If R20 spec scope determines `engine/verdict-groups.ts` needs deltas, spec MUST include manifest + AT_PIN_FILES maintenance steps in component inventory upfront (avoids R18-style ESCALATE on routine vendoring-with-deltas bookkeeping).

## Phase 2 SLICE 2 readiness state

| Element | State |
|---|---|
| `VerdictGroup.cluster_event_id?` field exists | ✅ (R18, `engine/types/verdict.ts:201-209`) |
| v9X fixture exists | ✅ (R18, `test/_substrate/v9X-cluster.ts`) |
| `TopologyNode.kind`/`Edge.relationship` extensions | ✅ (R18) |
| Inherited L3b aggregator unmodified at extension points | ✅ (`engine/verdict-groups.ts`, vendored-at-pin) |
| Fleet-merge layer available for consumption | ✅ (R11/R12/R13: combine/detectors/e-bh) |
| 0-CRITICAL streak | 17 rounds (R02-R19) |
| Working tree clean | ✅ |
| HEAD | `d58d887` (R19 TQ-4 disposition; Phase 2 SLICE 1 closed) |
