# Phase 2 SLICE 2 Close Walk — Tessera

_2026-05-17. HEAD at R22 MERGE-READY: `<R22-MERGE-READY-SHA>` (substituted at chore-A). Phase 2 SLICE 2 closes at R22 (3 substantive rounds: R18 type substrate [SLICE 1]; R20 SLICE 2.A aggregator-contract; R21 SLICE 2.B fleet-merge consumer; R22 close-walk + MINOR cleanup). Late-evening overnight authority HARD STOP at SLICE 2 close per chain plan; SLICE 3 entry requires operator return._

---

## Header

- **Date:** 2026-05-17
- **HEAD at SLICE 2 close:** `<R22-MERGE-READY-SHA>` (R22 chore-A)
- **Scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 SLICE 2 row
- **Substantive rounds:** R18 (type substrate / SLICE 1), R20 (SLICE 2.A), R21 (SLICE 2.B); R22 (close-walk)
- **Anti-scope reference:** `coordination/NEXT-ROLE.md` R22 anti-scope lines 52-60

---

## § 1 Scope summary — SLICE 2 deliverables

**Context.** Phase 2 SLICE 2 per `SCOPING-MEMO-v0.3.md` § 2.3 delivers the outer aggregator extending the vendored L3b `VerdictGroup` aggregator with `cluster_event_id` scope, the fleet-merge consumption layer, and the per-shard verdict aggregation contract with `cluster_event_id` propagation. SLICE 2 entry framing (written at SLICE 1 close, `PHASE-2-SLICE-1-CLOSE-WALK.md` § 3) predicted VerdictGroup scope re-architecture cost dominates, estimated 2-3 Q-cycles.

**R18 — Phase 2 SLICE 1 type substrate** (entry into SLICE 2 precondition):
1. `TopologyNode.kind` union extension (`'gpu_shard' | 'rack'`).
2. `TopologyEdge.relationship` union extension (`'contains'`).
3. `VerdictGroup cluster_event_id?` optional field — makes `cluster_event_id` available for SLICE 2 scope re-architecture.
4. Synthetic-cluster v9X-class fixture (`test/_substrate/v9X-cluster.ts`): 1 rack + 10 gpu_shards.

**R20 — Phase 2 SLICE 2.A: VerdictGrouper cluster_event_id scope keying** (`engine/verdict-groups.ts`):
1. `ingest(verdict, ts, opts)` opts parameter: accepts `cluster_event_id?` + `terminal?`.
2. `openByGroupKey` internal map replaces `openByDeploy`: tuple key `${cluster_event_id_seg}|${deploy_id}`.
3. Composite `group_id` format when `cluster_event_id` present: `group-{cluster_event_id}-{deploy_id}-{ts}`.
4. Inherited `group_id` format preserved when absent (legacy mode).
5. `findRecentClosedForKey` tuple-equality late-arrival lookup.
6. Maintenance: `coordination/VENDORING-MANIFEST.md` row 28 → `vendored-with-deltas`; `AT_PIN_FILES` removal.

**R21 — Phase 2 SLICE 2.B: fleet-merge consumption layer** (`engine/fleet/verdict-consumer.ts`, Tessera-original):
1. `FleetTickInput` / `FleetTickIngestResult` / `ClusterEventRollup` interfaces.
2. `fleetTickIngest(input, grouper)`: fan-out per-shard ingest through VerdictGrouper contract; propagates `cluster_event_id` identically to all N shards.
3. `rollupByClusterEvent(results, cluster_event_id)`: consolidates IngestResults into per-cluster-event group rollup; dedupes by `group_id` (first-occurrence); empty-string short-circuit.

**R22 — Close-walk + MINOR cleanup:**
1. This document.
2. q20 header fix (AC-R20-12 classification corrected).
3. q21 dedup-guard structural test (AC-R22-3).
4. q21 short-circuit structural test (AC-R22-4).
5. q01 header arithmetic refresh (30 → 36 files).

**State at SLICE 2 close:**

| Metric | Value |
|---|---|
| Test count | 203 / 0 |
| 0-CRITICAL streak | 20 rounds (R02–R21); extended through R22 |
| 0-MAJOR full-tier streak | 2 consecutive rounds (R20–R21) |
| RED→GREEN TDD streak | 16 rounds (R04–R21); R22 is test-only (no production delta) |
| Right-reasons audit streak | 13 rounds (R08–R21) |
| Working tree | Clean at chore-A |

---

## § 2 Architectural-assessment retrospective

### 2.1 Vendoring-with-deltas pattern at scale

SLICE 2 applied the vendored-at-pin → vendored-with-deltas two-step pattern for the third time in the Tessera project history (first documented at `PHASE-2-SLICE-1-CLOSE-WALK.md` § 2):

| File | Round | Delta type | Trigger |
|---|---|---|---|
| `engine/types/config.ts` | R01 | Tessera schema additions (PerShardResidual, PerShardCell) | Phase 1 SLICE 1 |
| `engine/types/verdict.ts` | R18 | Phase 2 type extensions (kind/relationship/cluster_event_id) | SLICE 1 ESCALATE-and-unblock |
| `engine/verdict-groups.ts` | R20 | cluster_event_id scope keying + composite group_id | SLICE 2.A |

The key lesson from SLICE 1 (§ 2 there) was that this pattern required an ESCALATE at R18 because the spec under-anticipated `q01-no-at-pin-deltas` as a consumer of `engine/types/verdict.ts`. The R18 ESCALATE-and-unblock was correctly absorbed; the lesson was documented; and SLICE 1 close-walk § 2 explicitly stated: "Future SLICEs that touch vendored files should pre-handle this pattern: the Architect spec should explicitly identify any vendored file receiving Tessera-specific deltas and include the manifest + AT_PIN_FILES maintenance steps in the component inventory."

At R20, the Architect applied this lesson directly: spec § 4.3 + § 4.4 prescribed the two maintenance steps (`VENDORING-MANIFEST.md` row update; `AT_PIN_FILES` entry removal) as explicit deliverables; spec § 9.8 enumerated all 3 AT_PIN_FILES consumers of `engine/verdict-groups.ts` with their assertion surfaces pre-traced; spec § 9.10 pre-anticipated the maintenance-related halt scenarios with prescribed responses. **The R20 round had zero ESCALATE conditions.** The vendoring-with-deltas bookkeeping that triggered R18's ESCALATE was pre-handled as routine maintenance at R20, directly confirming the SLICE 1 close-walk's lesson-application directive.

The pattern is now three-applications-proven and documented at: (1) `PHASE-2-SLICE-1-CLOSE-WALK.md` § 2 (formal two-step definition + R18 precedent + R01 precedent); (2) `PHASE-2-SLICE-2-CLOSE-WALK.md` § 2.1 (R20 application + pre-handling confirmation).

### 2.2 Split-decision retrospective

The NEXT-ROLE.md R21 architectural question stated: "consider splitting fleet-merge consumption to a later slice round if R20 ACs > 12." R20's scope yielded 15 ACs (aggregator-contract-only: ingest opts, internal keying, composite group_id, late-arrival, manifest + AT_PIN_FILES maintenance, q20 test file). R21's scope yielded 11 ACs (fleet-merge consumer layer: FleetTickInput, fan-out semantics, rollup + dedup, binding commands, anti-scope diff).

The split produced:
- Clean separation of concerns: R20 = aggregator-contract boundary (what changes at the boundary); R21 = consumer layer (how external callers use the boundary).
- Two cleanly reviewable rounds vs one ~26-AC monster.
- No spec-coupling: R21 took R20 as a frozen input. The R20 `IngestResult` export at `engine/verdict-groups.ts:54` was the only R21 import surface.

The split call was correct. Both rounds fit Reviewer attention budget (R20 REVIEWER-REPORT: 8 pages; R21: 6.5 pages). Neither triggered a test count > 20. The fleet-merge consumer (`engine/fleet/verdict-consumer.ts`) is a natural unit (single-file module, orthogonal to the math in `combine.ts` / `detectors.ts` / `e-bh.ts`).

**Carry-forward observation:** The split threshold of ~12 ACs (as used here) is calibrated against the observed Reviewer-attention budget for full-tier rounds. Rounds with larger test matrices (R20 with 15 ACs across 11 test file rows) may still be cleanly reviewable if the ACs are tightly clustered in one file. The threshold is a heuristic, not a hard ceiling.

### 2.3 0-MAJOR streak emergence

**R20 was the first Tessera full-tier round with 0 MAJOR findings.** Prior full-tier rounds: R08 (MAJOR-1 + 3 ARCH violations), R18 (0 MAJOR + 4 MINOR). R20 broke the streak with 0 MAJOR + 3 doc-level MINOR.

R21 continued: also 0 MAJOR + 4 MINOR. This yields **2 consecutive full-tier 0-MAJOR rounds (R20–R21)**.

The factors that appear to have contributed:
1. **Architect empirical-premise-verification habit** (R08 MAJOR-2 reinforcement): 14 load-bearing claims verified by direct file-open at session start in both R20 and R21. Not inherited testimony.
2. **Architect vendored-file-delta-assertion-surface-enumeration** (R18 OBS-2 reinforcement): R20 pre-traced all 3 consumers of `engine/verdict-groups.ts` with assertion surfaces before routing. The ESCALATE-risk scenario that occurred at R18 was pre-handled at R20 with no ESCALATE needed.
3. **Architect halt-condition pre-anticipation** (R08 + R19 reinforcements): R20 and R21 each enumerated 5 specific halt scenarios with prescribed responses. Both Implementers navigated all scenarios cleanly with zero DIAGNOSTIC files.
4. **Split-decision routing**: R20's 15-AC scope and R21's 11-AC scope were both well within reviewable range. No spec-bloat that typically produces unbounded coverage gaps.

All 4 factors are reinforcement-compounded behaviors, not one-time fixes. The 0-MAJOR streak is a byproduct of the accumulated reinforcement infrastructure working correctly over 20+ rounds.

**Note:** The 0-MAJOR streak is a trailing indicator, not a target. The Memorial-Updater explicitly noted in R21 SUMMARY that the 4 MINOR findings were real — coverage gaps (MINOR-2/3) and procedural drift (MINOR-1/4). The streak surviving R22 would require the R22 Reviewer to find nothing MAJOR; this close-walk does not prejudge that.

### 2.4 Line-citation-drift pattern — 3rd tessera occurrence + cross-project threshold

**Pattern:** Implementer NEXT-ROLE.md attestation blocks cite line numbers for AC-binding tests that are off by ±1-5 from the actual `test()` declaration line. The citations point to the test body (first assertion) rather than the test declaration (`test('AC-N: ...'`, () => {`).

**Occurrences:**
| Round | Finding | Drifted citations |
|---|---|---|
| R03 | MINOR-4 | Per-file OBSERVED counts cited; no per-file line citations yet |
| R18 | MINOR-2 | Pattern reinforced but line-citation form not yet enforced |
| R21 | MINOR-4 | AC-R21-1 (35 vs 34), AC-R21-3 (74 vs 73), AC-R21-4 (89 vs 85), AC-R21-5 (100 vs 97), AC-R21-8 (152 vs 155) |

The 3-occurrence threshold triggered a cross-project reinforcement rule derivation in `~/.claude/CROSS-PROJECT-MEMORIAL.md` (R21 Memorial-Updater outputs). The rule: citations must pin to the `test()` declaration line, verified by grep or offset-read before committing chore-A.

**R22 application:** All NEXT-ROLE.md attestation citations in this chore-A block are verified against the actual `test()` line by grep before commit.

---

## § 3 Phase 2 SLICE 3 entry framing

### SLICE 3 scope per SCOPING-MEMO-v0.3.md § 2.3

SLICE 3 delivers **HardwareTopologySource concrete impl** (PRD FR-E3b): a new concrete implementation against the existing `TopologySource` interface at `engine/topology-overlay.ts:40-43`. Coverage: NVLink + rack + PSU + cooling-zone. Topology-aware spatial attribution (MD-F4; PR-F6 pair-review). Common-mode failure-injection empirical test on the v9X synthetic cluster substrate.

**Q-cycle estimate:** 3-4 rounds (SCOPING-MEMO § 2.3 table). Likely-surfaces prediction: ~2-3 architect-pre-predicted iterative-refinement cycles concentrated in SLICE 3 (BFS-on-undirected adaptation OR sparse-topology-data edge cases per LS-4). Potential for a SLICE 3a / SLICE 3b split if scope exceeds reviewable ACs — to be assessed at Architect spec time.

### Entry dependencies (already delivered)

| Component | State | Delivered |
|---|---|---|
| `TopologyNode.kind` enum (`'gpu_shard' \| 'rack'`) | ✅ | R18 `engine/types/verdict.ts:236` |
| `TopologyEdge.relationship` enum (`'contains'`) | ✅ | R18 `engine/types/verdict.ts:246` |
| `VerdictGroup.cluster_event_id?` field | ✅ | R18 `engine/types/verdict.ts:201-209` |
| v9X synthetic cluster fixture | ✅ | R18 `test/_substrate/v9X-cluster.ts` |
| `TopologySource` interface (inherited vendor) | ✅ | `engine/topology-overlay.ts:40-43` @ SHA `5a72371` |
| VerdictGrouper `cluster_event_id` scope keying | ✅ | R20 `engine/verdict-groups.ts` |
| Fleet-merge consumer layer | ✅ | R21 `engine/fleet/verdict-consumer.ts` |

### Architectural sketch

`HardwareTopologySource` is a new concrete class implementing `TopologySource` from `engine/topology-overlay.ts:40-43`. Key design choices inherited from the spec:
- Input formats: Slurm topology / Kubernetes node-label API / NVIDIA NVLink-topology output.
- Output: `TopologySnapshot` with `nodes: TopologyNode[]` (kind = `'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'`) + `edges: TopologyEdge[]` (relationship = `'contains'`).
- BFS-on-undirected graph: extends the inherited Addition #26 BFS algorithm to undirected relationship semantics (a `'contains'` edge flows both directions for ancestor/descendant queries).
- v9X fixture as test substrate: `makeV9XSingleRackCluster({ nShards? })` from R18 provides canonical single-rack topology for common-mode test injection.

The topology overlay integration surface: `engine/topology-overlay.ts` BFS implementation is vendored-at-pin; `HardwareTopologySource` is Tessera-original. The concrete impl should be placed at `engine/hardware-topology-source.ts` (Tessera-original; no AT_PIN_FILES entry needed).

### SLICE 3 open questions (for Architect at spec time)

**OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring (still parked)**
Not required for SLICE 3 HardwareTopologySource work. Remains parked per PHASE-1-CLOSE-WALK.md § 6 and PHASE-2-SLICE-1-CLOSE-WALK.md § 3 framings. Operator gate before activating.

**OQ-R08-3 — Phase 2 transient detector scheduling (still parked)**
Orthogonal to SLICE 3. HardwareTopologySource impl proceeds independently. Remains parked.

**LS-4 — Topology join semantics under sparse topology data**
Anticipated SLICE 3 surface: sparse topology (e.g., only rack-level containment known; no PSU or cooling-zone data yet) could affect common-mode attribution. The BFS-on-undirected implementation must degrade gracefully to subset-topology results rather than throwing or returning incorrect attribution. Architect should enumerate the sparse-data failure modes at spec time.

**Full-tier requirement**: SLICE 3 involves a new architectural pattern (A2: HardwareTopologySource against TopologySource interface; new BFS semantics) + a new dependency surface (Slurm / K8s / NVLink ingestion) (A1). Full-tier (Architect + Implementer + Reviewer) is the required tier for SLICE 3 entry. Hybrid Reviewer pair-review at SLICE 3 close per `SCOPING-MEMO-v0.3.md` § 2.3 row and anchor commitment.

---

## § 4 R20 + R21 MINOR disposition table

All MINOR findings from `coordination/reviews/REVIEWER-REPORT-R20.md` § 2 and `coordination/reviews/REVIEWER-REPORT-R21.md` § 2:

| Finding | Source | Description | R22 Disposition |
|---|---|---|---|
| R20 MINOR-1 | REVIEWER-REPORT-R20.md | `test/q20-…test.ts:4-6` header classifies AC-R20-12 as a binding-command attestation, but AC-R20-12 is a runtime test at `:186-205` per spec § 4.7. | **CLOSED** by Deliverable 2 (R22 Commit B: lines 4-6 corrected to acknowledge AC-R20-12 as a runtime test per § 4.7). |
| R20 MINOR-2 | REVIEWER-REPORT-R20.md | `test/q01-no-at-pin-deltas.test.ts:7-8` formula reads "detectors (11) + … type files at-pin (8 excl config.ts) + compilation deps (2) = 30 files" — stale since R06 + R18. Actual AT_PIN_FILES array has 36 entries. | **CLOSED** by Deliverable 5 (R22 Commit B: lines 7-8 refreshed to "…type files at-pin (7 excl config.ts, verdict.ts) + compilation deps (6) + SLICE 4 tools (3) = 36 files"). |
| R20 MINOR-3 | REVIEWER-REPORT-R20.md | Spec § 4.4 prescribed inline parenthetical "(verdict-groups.ts excluded at R20)" at line 7; Implementer placed equivalent text at line 10 instead. | **REINFORCEMENT-ONLY** — pattern in CLAUDE-IMPLEMENTER.md (R20 MINOR-3 reinforcement). Alternative placement preserved (info present; no behavioral impact; Reviewer noted "alternative placement preserves the audit-trail intent"). No code fix required. |
| R20 OBS-1 | REVIEWER-REPORT-R20.md | AC-R20-8 sub-cases (c)/(d) only assert `late_arrival === false`; do not verify a distinct group was opened. | **CARRY-FORWARD** — would require touching q20 test logic bodies (outside R22 pre-auth scope: "test logic + AC bindings frozen"). Backlog for SLICE 3 if related code is touched; else deferred. |
| R21 MINOR-1 | REVIEWER-REPORT-R21.md | Architect spec files (Q-R21-SPEC.md, Q-R21-SPEC-AUDIT.md) were not committed before Implementer chore-A; they entered git only at chore-B. Deviation from R20 precedent. | **REINFORCEMENT-APPLIED** — new REINFORCED line in CLAUDE-ARCHITECT.md. R22 applies the lesson: `coordination/specs/Q-R22-SPEC.md` committed in Commit A (before chore-A, before implementation commits). |
| R21 MINOR-2 | REVIEWER-REPORT-R21.md | AC-R21-7 does not exercise the `seen_group_ids.has()` dedup guard; removing the guard would not change test outcome. | **CLOSED** by Deliverable 3 (R22 Commit B: AC-R22-3 test row in q21; scenario with 2 results sharing the same `group_id`; fails if guard removed). |
| R21 MINOR-3 | REVIEWER-REPORT-R21.md | AC-R21-8 does not disambiguate the short-circuit at `:77-79` from the strict-equality filter; removing the short-circuit would not change test outcome. | **CLOSED** by Deliverable 4 (R22 Commit B: AC-R22-4 test row in q21; scenario with `cluster_event_id: ''` creating groups with `.cluster_event_id === ''`; fails if short-circuit removed). |
| R21 MINOR-4 | REVIEWER-REPORT-R21.md | NEXT-ROLE.md attestation line citations off by ±1-5 from actual `test()` declaration lines. Third tessera occurrence; cross-project rule derived. | **REINFORCEMENT-APPLIED** — cross-project rule active. R22 chore-A NEXT-ROLE.md attestations pin to `test()` declaration lines per grep verification. |

---

## § 5 Memorial state stamp — REINFORCED counts at Phase 2 SLICE 2 close

Empirically verified via `grep -c "^# REINFORCED"` on each CLAUDE-*.md file at R22 session start (HEAD `f7111c9`):

| File | REINFORCED count | Change from SLICE 1 close (R18) |
|---|---|---|
| `CLAUDE-COMMON.md` | 3 | +2 (R19: chore-sequence verification; R19/R20: audit-tier-promotion-mid-round) |
| `CLAUDE-ARCHITECT.md` | 21 | +3 (R20: § 5 preamble vs § 4.x narrative-vs-prescription; R21: spec-commit-sequencing + dedup/short-circuit branch binding) |
| `CLAUDE-IMPLEMENTER.md` | 35 | +9 (R19: 4 from R19 MAJOR-1/2/3/4 enforcements; R20: 3 from MINOR-1/2/3; R21: 2 from MINOR-1/4 — line-citation + chore-B-file-header) |
| `CLAUDE-REVIEWER.md` | 1 | +0 (unchanged since SLICE 1 close) |
| `CLAUDE-MEMORIAL.md` | 0 | +0 (unchanged) |
| **Total** | **60** | **+14 from SLICE 1 close (46 → 60)** |

**Symmetry note:** Both SLICE 1 (Phase 1 close → SLICE 1 close: 32 → 46 = +14) and SLICE 2 (SLICE 1 close → SLICE 2 close: 46 → 60 = +14) added exactly 14 reinforcements. This is coincidental (3 rounds at SLICE 2 vs 1 round at SLICE 1); the number of reinforcements is driven by finding density, not round count.

**CLAUDE-IMPLEMENTER.md consolidation flag:** 35 REINFORCED lines exceeds the 30-line threshold. The consolidation threshold was crossed at R20 (33 lines at R20 close). The script `scripts/consolidate-reinforcements.sh` archives lines older than 180 days; since Tessera began 2026-05-15 (< 180 days), NO entries are archive-eligible yet. Consolidation is not actionable until 2026-11-11 (180 days from Tessera start). This flag is carried forward to the Memorial-Updater but does not affect R22 deliverables.

For the full per-round violation/confirmation tally: `coordination/MEMORIAL.md` (per-round accretion) and `coordination/PHASE-1-CLOSE-WALK.md` § 3 + § 4 (Phase 1 close Memorial-D state stamp).

---

## § 6 Cross-references

- **R20 Spec:** `coordination/specs/Q-R20-SPEC.md` (750 lines; VerdictGrouper cluster_event_id scope keying)
- **R20 Spec Audit:** `coordination/specs/Q-R20-SPEC-AUDIT.md`
- **R21 Spec:** `coordination/specs/Q-R21-SPEC.md` (fleet-merge consumption layer)
- **R21 Spec Audit:** `coordination/specs/Q-R21-SPEC-AUDIT.md`
- **R22 Spec:** `coordination/specs/Q-R22-SPEC.md` (this round's audit-tier spec)
- **R20 Reviewer report:** `coordination/reviews/REVIEWER-REPORT-R20.md` (15/15 PASS, 0 CRITICAL, 0 MAJOR, 3 MINOR, 3 OBS)
- **R21 Reviewer report:** `coordination/reviews/REVIEWER-REPORT-R21.md` (11/11 PASS, 0 CRITICAL, 0 MAJOR, 4 MINOR, 4 OBS)
- **Round summaries:** `coordination/logs/ROUND-R20-SUMMARY.md` + `coordination/logs/ROUND-R21-SUMMARY.md`
- **SCOPING-MEMO scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 SLICE 2 row + § 2.3 SLICE 3 row
- **SLICE 1 close-walk:** `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` (R18 retrospective; vendored-with-deltas two-step definition; TQ-4 γ anti-scope diff-range pattern)
- **R22 commit chain:**
  - `<COMMIT-A-SHA>` — spec: Q-R22-SPEC.md
  - `<COMMIT-B-SHA>` — feat(R22): PHASE-2-SLICE-2-CLOSE-WALK.md + q20 header fix + q21 structural tests + q01 arithmetic fix
  - `<MERGE-READY-SHA>` — chore(R22): route to REVIEWER (chore-A)
  - `<CHORE-B-SHA>` — chore(R22-B): AC-R22-8 anti-scope runtime test + chore-A SHA substituted
- **Active outstanding items (preserved from SLICE 1 close-walk):**
  - OQ-1 / Q-JC1: calibrate.ts vendoring — still parked
  - OQ-R08-3: Phase 2 transient detector scheduling — still parked
  - Anchor PR #38 — LOW priority; still open (R11-R21 window: 11 rounds)
  - R09 MINOR-3, R11 MINOR-1, R12 OQ-2/3, R13 MINOR — non-load-bearing; deferrable
  - R20 OBS-1 (AC-R20-8 sub-case (c)/(d) thin coverage) — CARRY-FORWARD per § 4

---

_Phase 2 SLICE 2 closed. HARD STOP per late-evening overnight authority. Operator reads this document for Phase 2 SLICE 3 entry assessment before launching R23+._
