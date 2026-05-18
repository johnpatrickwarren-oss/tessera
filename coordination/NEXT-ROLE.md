CURRENT-ROUND: R21
NEXT-ROLE: MEMORIAL-UPDATER
STATUS: ROUND-COMPLETE
Inputs: coordination/reviews/REVIEWER-REPORT-R21.md;
        Implementer attestation: a5cae6d (MERGE-READY chore-A)

## Reviewer attestation

- Report: coordination/reviews/REVIEWER-REPORT-R21.md
- 11/11 ACs PASS (3 with MINOR caveats: AC-R21-7, AC-R21-8, AC-R21-11)
- Findings: 0 CRITICAL / 0 MAJOR / 4 MINOR / 4 OBS
- Cold-verified binding commands:
    - `npx tsc --noEmit` → exit 0 (AC-R21-9)
    - `node --test test/*.test.js` → tests 201 / pass 201 / fail 0 (AC-R21-10)
- Cold-verified anti-scope:
    - `git diff 62e28d7..a5cae6d --name-only` → 4 paths ⊆ allowed-set (AC-R21-11)
    - `git diff 62e28d7..HEAD --name-only` → 6 paths ⊆ allowed-set (round-start completeness gate)
- Right-reasons audit: 3 tests (AC-R21-2, AC-R21-6, AC-R21-11) — none self-confirming
- 13th consecutive Tessera Reviewer right-reasons audit (R08–R21)
- 20-round 0-CRITICAL streak (R02–R21)

## Implementer attestation (chore-A)

- GREEN SHA: 78fa38b (feat(R21): GREEN — fleet-merge consumer layer)
- RED SHA: 4274d9f (test(R21-RED): q21 fleet-verdict-consumer stubs)
- MERGE-READY chore-A SHA: a5cae6d
- `npx tsc --noEmit` → exit 0 (AC-R21-9 PASS)
- `node --test test/*.test.js` → tests 200 / pass 200 / fail 0 (AC-R21-10 PASS)
- Per-file OBSERVED counts:
    betting-e-process-class-dispatch: 5
    q01-no-at-pin-deltas: 1, q01-schema-additions: 5, q01-vendoring-coverage: 3
    q02-schema-extension: 6, q03-warm-start-runtime: 13, q04-welford-stats: 11
    q05-per-shard-runtime: 13, q06-baseline-pre-pass: 13, q07-fleet-correlated: 23
    q10-per-shard-emission: 11, q11-hierarchical-e-value-combination: 18
    q12-fleet-merged-detector-surfaces: 16, q13-e-bh-fdr: 14
    q14-compiled-config-loader: 6, q14-mean-delta: 7, q14-pr-f5-storage: 4
    q16-pr-f5-investigation: 2, q18-phase2-slice1-topology-substrate: 10
    q20-verdict-grouper-cluster-event-scope: 11
    q21-fleet-verdict-consumer: 8 (NEW — GREEN commit)
    Total: 200 / 0 (baseline 192 + 8 new)
- AC-R21-1 PASS: ingest_results.length===N (test/q21:35)
- AC-R21-2 PASS: cluster_event_id propagated to all shards (test/q21:53)
- AC-R21-3 PASS: absent cluster_event_id → legacy mode (test/q21:74)
- AC-R21-4 PASS: empty per_shard_verdicts → [], no throw (test/q21:89)
- AC-R21-5 PASS: terminal=true closes all groups (test/q21:100)
- AC-R21-6 PASS: index-order preservation (test/q21:118)
- AC-R21-7 PASS: rollup 3 distinct groups for 3 deploys (test/q21:133)
- AC-R21-8 PASS: empty-string query short-circuits to [] (test/q21:152)
- AC-R21-11: added in chore-B with chore-A SHA substituted

## Round-scope directive

**R21 = Phase 2 SLICE 2.B — fleet-merge consumption layer (the deferred sub-goal from R20 split per Q-R20-SPEC.md § 0 + § 7 Q6 disposition).**

SLICE 2 was split at R20 per architect's split-decision into:
- **SLICE 2.A (R20, ✅ MERGE-READY at SHA `7eb3a63`)** — VerdictGrouper internal scope re-architecture: cluster_event_id ingest opts, `cluster_event_id|deploy_id` composite keying, group_id format extension, late-arrival semantics under cluster-event scope.
- **SLICE 2.B (R21, this round)** — fleet-merge consumption layer: wire `engine/fleet/combine.ts`, `engine/fleet/detectors.ts`, `engine/fleet/e-bh.ts` (the R11/R12/R13 fleet-merge surface) to consume the R20 VerdictGrouper contract and propagate `cluster_event_id` through the fleet-merge → VerdictGrouper consumer interface.

R20 delivered the aggregator contract; R21 makes it load-bearing at the fleet-merge consumer surface. After R21 the SLICE 2 dominant cost is complete; an R22 (close-walk or remaining SLICE 2 polish) closes the slice.

**Tier: full.** Justification: A6 (blast-radius on fleet-merge layer — R11/R12/R13 surfaces consumed by tessera fleet-tick path) + A2 (first consumer pattern for cluster_event_id propagation through fleet-merge → outer aggregator). Architect runs pre-emit grilling + cross-section consistency pass (with the calibration from R20 MINOR-1 reinforcement: § 5 AC-table preamble classification claims must be cross-checked against § 4.x prescriptions) + OBSERVED-binding scope.

## Inputs for next role (Architect)

**Read in order:**

1. **`coordination/PRD.md`** — thin PRD; FR-E3a (cross-shard correlation outer aggregator), US-01, AC-P4.
2. **`coordination/SCOPING-MEMO-v0.3.md`** — canonical scope.
   - § 2.3 Phase 2 Extension 3 — full scope; specifically the cluster_event_id semantics + fleet-merge consumption framing
   - § 3 Q-cycle table SLICE 2 row (line 345) — confirms fleet-merge consumption layer is in SLICE 2 scope
3. **`coordination/specs/Q-R20-SPEC.md`** + **`coordination/specs/Q-R20-SPEC-AUDIT.md`** — R20 spec; the contract you're now wiring consumers to. Specifically:
   - § 2 mechanism (VerdictGrouper internal-state surface; private `openByDeploy` map; ingest opts shape)
   - § 0 disposition table Q6 "Split — R20 = aggregator-contract-only; R21 = fleet-merge consumption layer wiring" (line 90)
   - § 6 anti-scope (fleet-merge layer untouched at R20; available as R21 surface)
   - § 7 split-decision rationale
4. **`coordination/reviews/REVIEWER-REPORT-R20.md`** + **`coordination/logs/ROUND-R20-SUMMARY.md`** — R20 outcomes:
   - 0/0/3/3; 15/15 ACs PASS; 192/0 tests; 19-round 0-CRITICAL streak
   - Watch items per R20 close-walk (apply if R21 touches relevant files): OBS-1 (AC-R20-8 sub-case c/d thin coverage); MINOR-1 (q20 file header narrative-vs-prescription); MINOR-2 (q01-no-at-pin-deltas.test.ts:7-8 stale arithmetic formula); MINOR-3 (parenthetical placement)
5. **`engine/verdict-groups.ts`** — R20 delivered. THE contract surface R21 consumes. Confirm `ingest()` and `openGroupForDeploy()` opts shape; do NOT modify.
6. **`engine/types/verdict.ts`** — confirm `VerdictGroup.cluster_event_id?: string` (R18 line 201-209); do NOT modify.
7. **`engine/fleet/combine.ts`** — Vovk-Wang 2021 §4 combine primitives (R11). Likely R21 modification target (consumer-side wiring).
8. **`engine/fleet/detectors.ts`** — fleet-merge Family A + Family C surfaces (R12). Likely R21 modification target.
9. **`engine/fleet/e-bh.ts`** — Ren-Barber 2024 e-BH (R13). Confirm if R21 touches; depends on architectural decision below.
10. **`coordination/PHASE-2-SLICE-1-CLOSE-WALK.md`** — companion patterns to apply upfront:
    - § 2 ESCALATE-and-unblock + vendored-with-deltas two-step maintenance pattern (if any engine/fleet/* file needs deltas)
    - § 2 anti-scope diff-range SHA anchoring (anchor AC-R21-N anti-scope diff to chore-A SHA, not HEAD — TQ-4 γ)
11. **`coordination/VENDORING-MANIFEST.md`** — current status of engine/fleet/* files; architect determines which (if any) transition to vendored-with-deltas at R21.
12. **`coordination/OVERNIGHT-LOG-2026-05-17.md`** — recent operator dispositions + R20 close entry.

## Anti-scope (R21 hard limits)

- **NO modification of `engine/verdict-groups.ts`** — R20's deliverable. R21 is consumer-side only. If R21 architect identifies an aggregator-side change needed, ESCALATE with bounded question; do NOT modify silently. (Mirrors R20's R18-substrate-frozen anti-scope.)
- **NO modification of `engine/types/verdict.ts`** — R18+R20 contract is frozen for SLICE 2.B consumers.
- **NO modification of `test/_substrate/v9X-cluster.ts`** — R18 substrate frozen.
- **NO modification of `test/q20-…test.ts`** — R20 deliverable frozen. (Exception: MINOR-1 q20 file-header correction at lines 4-6 IS authorized as in-passing cleanup if R21 touches q20 for any reason — per R20 close-walk watch list.)
- **NO `HardwareTopologySource` concrete impl** — SLICE 3.
- **NO deployment-event-feed ingestion** — SLICE 4.
- **NO Addition #25 D2/D5 reversal** — preserved through R20; R21 propagates, doesn't redefine.
- **NO Addition #26 D4 reversal** — `correlational_not_causal: true` invariant preserved.
- **NO new vendoring deltas at engine/fleet/* without applying two-step maintenance pattern UPFRONT** (manifest + AT_PIN_FILES per PHASE-2-SLICE-1-CLOSE-WALK § 2). Spec failure-mode analysis MUST enumerate q01-* test consumers of any touched fleet/* file.
- **NO modification of inherited detector internals** (A12/A5) — fleet-merge wrappers/wiring only; inherited Family A/C/E detector behavior preserved.

## Architectural questions for Architect's brainstorm phase

The R21 Architect's brainstorm + recommendation should resolve at minimum:

1. **Producer surface for `cluster_event_id` in fleet-merge.** Three candidates: (a) fleet-merge call signature gains a `clusterEventId?` parameter, propagated to VerdictGrouper.ingest opts; (b) fleet-merge config gains a `currentClusterEventId` field set by the caller before tick; (c) per-FusedVerdict context object carries cluster_event_id. SLICE 4 event-feed will be the upstream producer; SLICE 2.B contract design constrains SLICE 4's interface.
2. **Rollup-by-cluster-event semantics.** R20 keys groups by `cluster_event_id|deploy_id` (composite); a single cluster_event_id spanning multiple deploys produces multiple groups. Does fleet-merge consumption expose a new aggregation method (e.g., `rollupByClusterEvent()`) that consolidates per-deploy groups into a cluster-event roll-up? Or does the consumer get raw composite-keyed groups and roll up at its own layer?
3. **Fleet-tick-scope cluster_event vs per-verdict cluster_event.** Is there a fleet-tick-level "currently-active cluster events" concept, or is cluster_event_id always per-verdict? Affects fleet-merge config shape + tick-loop interface.
4. **e-BH consumer interaction.** Does e-BH (R13) consume cluster_event_id-scoped groups separately from deploy-id-scoped groups? Or is the e-BH FDR layer agnostic to cluster_event_id (treating each composite-keyed group as a separate per-shard verdict)? Determines whether engine/fleet/e-bh.ts gets a delta in R21.
5. **Backward-compat at fleet-merge consumers.** Legacy callers (no cluster_event_id) should be unaffected — R21 wiring is additive (mirrors R20's optional-field design at the aggregator).
6. **Test substrate for fleet-merge consumption.** Does R21 reuse v9X-cluster fixture, extend it with a fleet-tick wrapper, or introduce a v9Y fixture (per Q-R18-SPEC.md fixture-naming convention)? Architect should pick a fixture pattern that future SLICE 4 event-feed can also consume.

## Carry-forward watch items from R20 close

- **OBS-1** — AC-R20-8 sub-case (c)/(d) thin coverage: R21 spec should consider tightening via group_id-distinctness assertion if it touches verdict-groups consumer surface (it will, indirectly).
- **MINOR-1** — `test/q20-…test.ts:4-6` file header still describes AC-R20-12 as binding-command attestation; correct in-passing if R21 touches q20 (unlikely — q20 tests are R20 deliverable). Otherwise: backlog for R22.
- **MINOR-2** — `test/q01-no-at-pin-deltas.test.ts:7-8` stale arithmetic: if R21 transitions any engine/fleet/* file to vendored-with-deltas (which removes it from AT_PIN_FILES per the two-step pattern), R21 IS touching this file and MUST apply full-formula re-verification per R20 IMPLEMENTER MINOR-2 reinforcement. Spec should call this out as a planned touch in component inventory.
- **MINOR-3** — spec-prescribed inline parenthetical placement: R21 Implementer should default to spec-prescribed location or document deviation per R20 IMPLEMENTER MINOR-3 reinforcement.
- **CLAUDE-IMPLEMENTER.md at 33 REINFORCED lines** — consolidation deferred to SLICE 2 close-walk (likely R22 or R23). Not a R21 concern.

## Escalation items

(none active)

## Routing notes

- Late-evening overnight authority `project_overnight_authority_2026_05_17_late_evening.md` active. Chain extends through SLICE 2 close (R20 → R21 → R22 if needed → R23 close-walk → HARD STOP).
- Anti-scope diff-range checks (`AC-R21-N`) MUST anchor `<end>` to round-MERGE-READY chore-A SHA per TQ-4 γ pattern (R19) reinforced at R20 close. Architect spec should include explicit SHA-pin reference in any anti-scope AC.
- Vendored-with-deltas two-step maintenance pattern (manifest + AT_PIN_FILES) applied UPFRONT in component inventory if any fleet/* file gains deltas, per PHASE-2-SLICE-1-CLOSE-WALK § 2.
- R20 Architect's split-decision worked: R20 capped at 15 ACs (no spec bloat); R21 inherits the focused consumer-side scope. R21 Architect should apply same split discipline if SLICE 2.B scope itself exceeds ~12 ACs (defer remaining to R22).

## Phase 2 SLICE 2 readiness state at R21 entry

| Element | State |
|---|---|
| R18 type substrate (`VerdictGroup.cluster_event_id?` + topology enums + v9X) | ✅ |
| R20 VerdictGrouper contract (ingest opts; composite keying; late-arrival under cluster-event scope) | ✅ |
| Fleet-merge layer (combine.ts/detectors.ts/e-bh.ts from R11/R12/R13) untouched at extension points | ✅ |
| q20 test bindings (15 ACs PASS) | ✅ |
| 0-CRITICAL streak | 19 rounds (R02-R20) |
| Working tree clean | ✅ |
| HEAD | `4925ff6` (R20 Memorial Updater outputs) |
| Test count | 192 / 0 |
