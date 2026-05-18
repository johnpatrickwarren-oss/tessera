# ROUND-R21-SUMMARY

**Round:** R21  
**Date:** 2026-05-17  
**Tier:** full  
**Scope:** Phase 2 SLICE 2.B — fleet-merge consumption layer  
**Status:** ROUND-COMPLETE

---

## Outcomes

| Metric | Value |
|---|---|
| ACs | 11 / 11 PASS (3 PASS-WITH-MINOR) |
| CRITICAL | 0 |
| MAJOR | 0 |
| MINOR | 4 |
| OBS | 4 |
| Test count (post-R21) | 201 / 0 (baseline 192 + 8 new) |
| 0-CRITICAL streak | 20 rounds (R02–R21) |
| RED→GREEN TDD streak | 16 rounds (R04–R21) |
| Right-reasons audit streak | 13 rounds (R08–R21) |

---

## What shipped

New Tessera-original module: `engine/fleet/verdict-consumer.ts`

Exports:
- `FleetTickInput` — per-shard ingest request shape (cluster_event_id optional)
- `FleetTickIngestResult` — per-shard ingest result with group membership
- `ClusterEventRollup` — per-cluster-event aggregation of deploy-level groups
- `fleetTickIngest(inputs, grouper)` — fan-out ingest through VerdictGrouper contract
- `rollupByClusterEvent(results)` — aggregate composite-keyed groups by cluster_event_id

Approach A selected (new Tessera-original module). Fleet-math files (combine.ts, detectors.ts, e-bh.ts) untouched. VerdictGrouper contract (engine/verdict-groups.ts) untouched — R20 deliverable frozen.

Anti-scope: `git diff 62e28d7..a5cae6d --name-only` → 4 paths ⊆ 8-entry allowed-set.  
GREEN SHA: `78fa38b` | MERGE-READY chore-A SHA: `a5cae6d` | chore-B SHA: `d313e80`

---

## Violations (all MINOR)

**MINOR-1 — Architect commit-discipline (role: ARCHITECT)**  
Spec files (Q-R21-SPEC.md, Q-R21-SPEC-AUDIT.md) were uncommitted before chore-A (a5cae6d). Committed in chore-B (d313e80) instead. Correct ordering requires spec artifacts committed before the NEXT-ROLE.md routing block that triggers chore-A. New REINFORCED line appended to CLAUDE-ARCHITECT.md.

**MINOR-2 — Branch-binding coverage gap, dedup guard (role: ARCHITECT + IMPLEMENTER)**  
Spec § 1 failure mode 6 (dedup-by-group_id) enumerated; no AC row exercises it. The `seen_group_ids.has()` guard at verdict-consumer.ts:87-94 is structurally unbound — removing it does not affect any test outcome. Spec-AC coverage gap at Architect; structural test gap at Implementer. New REINFORCED lines appended to CLAUDE-ARCHITECT.md and CLAUDE-IMPLEMENTER.md.

**MINOR-3 — Branch-binding coverage gap, short-circuit branch (role: ARCHITECT + IMPLEMENTER)**  
Spec § 2.4 prescribes empty-string short-circuit as load-bearing semantic. The guard at verdict-consumer.ts:77-79 is structurally unbound in AC-R21-8: under legacy mode, `undefined !== ''` suffices to return `[]` without the short-circuit. No AC row independently exercises this path. Same diagnosis as MINOR-2; both REINFORCED lines cover the combined pattern.

**MINOR-4 — Line citation drift in attestation (role: IMPLEMENTER)**  
NEXT-ROLE.md chore-A attestation citations were off by ±1-5 lines from actual `test()` declarations: AC-R21-1 cited :35 vs actual :34; AC-R21-3 :74 vs :73; AC-R21-4 :89 vs :85; AC-R21-5 :100 vs :97; AC-R21-8 :152 vs :155. Third tessera occurrence (R03 MINOR-4, R18 MINOR-2, R21 MINOR-4). New REINFORCED line appended to CLAUDE-IMPLEMENTER.md; cross-project reinforcement rule derived in CROSS-PROJECT-MEMORIAL.md (3-occurrence threshold).

---

## Observations (not violations)

**OBS-1** — Reviewer noted AC-R21-7 dedup scenario uses 3 distinct deploy_refs producing 3 distinct groups; the dedup guard never fires even in a "passing" run. (Subsumes MINOR-2 structural note.)

**OBS-2** — Reviewer noted AC-R21-8 and AC-R21-3 together do not fully disambiguate the legacy vs. cluster-event code paths. AC-R21-8 uses legacy mode (no cluster_event_id) which causes the outer match to fail before the short-circuit can fire distinctively.

**OBS-3** — Reviewer noted rollupByClusterEvent test (AC-R21-7) uses 3 deploys producing 3 groups; a 2-deploys-per-cluster-event scenario was not tested (low-priority gap).

**OBS-4** — Reviewer noted the q21 test file header narrative could be tightened (AC ownership claims mixed with implementation notes). Backlog for R22 in-passing cleanup.

---

## Confirmations

- **pre-emit-grilling:** Architect applied 5 of 7 grilling checks; missed spec-commit-sequencing gate (MINOR-1) and branch-binding coverage pass (MINOR-2, MINOR-3).
- **halt-discipline:** Zero diagnostic files; zero ESCALATE conditions. Implementer proceeded GREEN without ambiguity.
- **right-reasons-audit:** Reviewer audited 3 tests (AC-R21-2, AC-R21-6, AC-R21-11); none self-confirming. 13th consecutive right-reasons audit (R08–R21).
- **tdd-discipline:** RED commit 4274d9f (8 assert.fail stubs) → GREEN commit 78fa38b (real implementation). 16th consecutive RED→GREEN round (R04–R21). AC-R21-11 committed in chore-B per forward-protection exception.
- **anti-scope:** Both SHA-pinned end-bound check (62e28d7..a5cae6d) AND round-start-to-HEAD supplementary check (62e28d7..HEAD) verified by Reviewer. 0 violations.
- **role-boundary:** All roles confined to prescribed artifacts. Zero cross-role file modifications.
- **context-isolation:** Reviewer cold-read from prescribed inputs only; 19th consecutive boundary application (R02–R21). Memorial Updater read only prescribed inputs.

---

## Consolidation flag

**CLAUDE-IMPLEMENTER.md** now has 35 REINFORCED lines (pre-R21: 33; added this round: 2). This exceeds the 30-line threshold. Consolidation recommended at R22 close-walk or latest at SLICE 2 close (R23 expected close-walk). Architect at R22 should carry this flag forward to the Memorial Updater.

**CLAUDE-ARCHITECT.md** now has 21 REINFORCED lines (pre-R21: 19; added this round: 2). Within threshold.

---

## Carry-forward watch items for R22

- **MINOR-2 + MINOR-3 structural tests:** R22 spec should include AC rows that independently exercise (a) the dedup-by-group_id guard in rollupByClusterEvent and (b) the empty-string short-circuit in fleetTickIngest. These are open regression gaps in engine/fleet/verdict-consumer.ts.
- **OBS-1 (from R20, carried):** AC-R20-8 sub-case (c)/(d) thin coverage on VerdictGrouper. R21 did not deepen this coverage (as predicted). Backlog for R22 or SLICE 2 close-walk.
- **MINOR-1 (from R20, carried):** q20 test file header at lines 4-6 still describes AC-R20-12 as binding-command attestation. MINOR-1 not resolved in R21 (q20 was not touched). Backlog for R22 or SLICE 2 close-walk.
- **MINOR-2 (from R20, carried):** q01-no-at-pin-deltas.test.ts:7-8 stale arithmetic. Still open if no engine/fleet/* file transitioned in R21 (none did). Backlog.
- **CLAUDE-IMPLEMENTER.md consolidation:** Target R22 close-walk or SLICE 2 close-walk (R23).
- **Anchor PR cadence:** R11–R21 window now 11 rounds; PR #38 covered R06-R10. Next anchor contribution batch due (MEMORY.md notes "reminder fires at R20 close"). Operator should initiate PR for R11–R21 anchor contributions.

---

## Phase 2 SLICE 2 readiness state at R21 close

| Element | State |
|---|---|
| R18 type substrate (VerdictGroup.cluster_event_id? + topology enums + v9X) | ✅ |
| R20 VerdictGrouper contract (ingest opts; composite keying; late-arrival) | ✅ |
| R21 fleet-merge consumption layer (verdict-consumer.ts; fleetTickIngest; rollupByClusterEvent) | ✅ |
| Fleet-math files (combine.ts / detectors.ts / e-bh.ts) untouched | ✅ |
| 0-CRITICAL streak | 20 rounds (R02–R21) |
| Working tree | Clean post-chore-B |
| HEAD | d313e80 (R21 chore-B) |
| Test count | 201 / 0 |

SLICE 2 dominant cost complete. R22 = close-walk (structural test gap closure for MINOR-2/MINOR-3, open watch items, SLICE 2 polish) or next slice entry per operator direction.
