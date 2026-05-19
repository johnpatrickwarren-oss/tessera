CURRENT-ROUND: R36
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R36 — Wave 5 / WU-07 Phase 2 close-walk)

R36 = Wave 5 single-cluster final dispatch: WU-07 SLICE 3.D / Phase 2 close-walk; audit tier + HYBRID_REVIEWER=true. Runs in main worktree. **LAST cluster before HARD STOP at Phase 2 close milestone.**

All 4 R35-gate OQ defaults applied per overnight authority:
- **OQ-W4-1 = A** — MR-2 consolidation BUNDLED into WU-07 (Deliverable 5)
- **OQ-W1-2 = A** — audit + HYBRID_REVIEWER=true
- **OQ-W4-2 = A** — Tailscale defers to Phase 3+ MR-3 candidate (STAGED Item 4)
- **OQ-W4-3 = A** — Anchor backflow content compiled in WU-07 (Deliverable 7) for operator-scheduled PR landing

After WU-07 close + Coordinator R37 Wave 5 gate: **HARD STOP at Phase 2 close milestone.** Phase 3 entry requires separate operator authorization per inherited anti-scope A17.

## Eight deliverables (per scope block)

1. `coordination/PHASE-2-CLOSE-WALK.md` — primary close-walk document (mirrors R15+R19+R22+R32 structure)
2. R32 carry-forward closures (4 surgical items per STAGED Item 2)
3. R34 carry-forward closures (R34 MAJOR-1 spec template enhancement + 4 reinforcement-line writes per STAGED Item 5)
4. Subprocess-hang Tessera-local fixes (q29/q34 refactor; audit all test files; spec template anti-scope clause per STAGED Item 3 Tessera portion)
5. MR-2 CLAUDE-IMPLEMENTER.md consolidation (3-pass per STAGED Item 1; 51+R34 → 25-30 lines target; self-application gate per Rule 5)
6. PR-F7 hybrid Reviewer audit (Reviewer stage; consolidated Phase 2 deliverable; Addition #26 D4 RECONFIRMED)
7. `coordination/ANCHOR-BACKFLOW-2026-05-18.md` — operator-scheduled PR content compilation (per STAGED Item 3 + Item 4 references + Coordinator memorial graduation)
8. Rule 6 canonical landing in `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Memorial-Updater stage)

## Inputs for next role (Implementer at audit tier)

**Read in order:**

1. **`coordination/cluster-scopes/wave-5/wu-07-phase-2-close-walk.md`** — full scope block (8 deliverables + AC criteria + halt conditions + anti-scope). **Primary scope artifact.**
2. **`coordination/CLUSTER-HANDOFF-4-WU06-WU07.md`** — D1 HIGH; 16 LS pre-flag entries.
3. **`coordination/WAVE-GATE-04.md`** — Wave 4 gate + Coordinator decisions + Rule 6 derivation draft text.
4. **`coordination/STAGED-FOR-PHASE-2-CLOSE.md`** — 5 Items (MR-2 consolidation strategy; R32 carry-forwards; subprocess-hang backflow; Tailscale Phase 3 candidate; R34 reinforcement staging).
5. **`coordination/PHASE-2-SLICE-{1,2,3}-CLOSE-WALK.md`** — structural templates for Deliverable 1.
6. **`coordination/COORDINATOR-MEMORIAL.md`** — 14 friction surfaces + 6 cross-project rules + Wave 1-5 gate sections.
7. **All Wave 1-4 deliverables** (READ-ONLY except Deliverables 2 + 4 pre-authorized edits): engine/l0/counter-rate-transform.ts, engine/topology/*, engine/events/*, engine/verdict-groups.ts, engine/fleet/verdict-consumer.ts, engine/hardware-topology-source.ts.
8. **`~/.claude/CROSS-PROJECT-MEMORIAL.md`** — 5 cross-project rules currently active; Rule 6 lands here this round.

## Apply all 6 cross-project rules UPFRONT (Rule 6 NEW)

1. **`false-compliance-attestation`** — actual binding-command results verbatim.
2. **`architect-branch-binding-coverage`** — Implementer at audit tier wears both hats; trace data-flow.
3. **`implementer-spec-test-assertion-coverage`** — every Then-column field asserted one-for-one.
4. **`anti-scope-allowed-set-forward-coverage`** — chore-A allowed-set includes `^coordination\/reviews\/REVIEWER-REPORT-R36\.md$` + `^coordination\/MEMORIAL\.md$` + Rule 6 cross-project landing path.
5. **`rule-derivation-without-self-application`** — self-audit at chore-A; Deliverable 5 MR-2 self-application gate explicit.
6. **`halt-discipline-no-DIAGNOSTIC-for-workaround`** (NEW; canonical landing this round) — any workaround MUST be documented in DIAGNOSTIC at point-of-encounter; MEMORIAL-only is insufficient.

## Anti-scope (R36 hard limits)

Headline (full enumeration in scope block § Anti-scope):

- A12 (engine internals frozen EXCEPT pre-authorized R26 MINOR-2 impl alignment + q29/q34 test refactor)
- A10/A11/A13/A16/A17 (all preserved; A16 RECONFIRMED at this close-walk)
- NO Phase 3 entry work
- NO Wave 1-4 deliverable modifications outside pre-authorized cleanup
- NO new vendor adapters (TAGGED-FUTURE)
- NO Tailscale infrastructure setup (Phase 3 candidate)
- NO modification of WAVE-GATE-{01-04}.md or WAVE-PLAN-{01-03}.md
- NO modification of cluster-scopes/wave-{1,2,3,4}/

## Halt conditions

Per scope block:
1. PR-F7 hybrid audit reveals CRITICAL gap — HALT + ESCALATE (Phase 2 close should not proceed under CRITICAL).
2. A16 D4 reversal surface emerges — HALT + DIAGNOSTIC + ESCALATE (highest priority).
3. MR-2 consolidation pass fails self-application gate — HALT for operator review; do not commit.
4. Subprocess-hang refactor cannot achieve clean refactor — HALT + DIAGNOSTIC.
5. Binding-command output contradicts AC literal — HALT (Rule 1 + Rule 6).
6. Anchor backflow content surfaces new methodology question operator hasn't decided — HALT + ESCALATE.

## Escalation items

(none active)

## Routing notes

- Per extended overnight authority full SLICE 4 + Phase 2 close chain. WU-07 close + Coordinator R37 Wave 5 gate = HARD STOP at Phase 2 close milestone.
- R37 Coordinator emits WAVE-GATE-05.md + Phase 2 close milestone stamp + final morning hand-off section in OVERNIGHT-LOG with full chain summary.
- After R37: operator returns to clean repo + Phase 2 closed.

## State at R36 entry

| Element | State |
|---|---|
| Wave 4 (WU-06 R34) | ✅ MERGE-READY cfbc526; gate ADVANCED at R35 |
| 6 cross-project rules | ✅ active (Rule 6 canonical landing pending in this round) |
| 0-CRITICAL streak | 33 rounds |
| Working tree | clean |
| HEAD | (current main post R35 Coordinator) |
| CLAUDE-IMPLEMENTER.md | 51 lines (R34 reinforcements deferred + staged for this round per STAGED Item 5; MR-2 consolidation also this round per OQ-W4-1) |
| Wave 5 = LAST cluster | conditional on R36 close + R37 gate |
| HARD STOP | Phase 2 close milestone (R37 Coordinator wave gate) |

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
HYBRID_REVIEWER=true ./run-pipeline.sh --round R36 --tier audit
```
