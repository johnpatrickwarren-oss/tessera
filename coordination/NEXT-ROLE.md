CURRENT-ROUND: R34
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round-scope directive (R34 — Wave 4 / WU-06 SLICE 4 event-conditional attribution)

**R34 = Wave 4 single-cluster dispatch: WU-06 SLICE 4 event-conditional attribution; full tier.**

Per WAVE-PLAN-03 Step 3 Judgment call 1: D1 HIGH chains across sub-candidates (event-feed → attribution → freeze-hook) forbid clean fan-out; sequential single-cluster is correct decomposition. Per WAVE-GATE-03 § Wave 4 dispatch routing: this cluster runs in main worktree (no `multi-track-cluster-setup.sh`).

After this cluster + Coordinator Wave 4 gate (R35) + Wave 5 dispatch (WU-07 Phase 2 close-walk; HYBRID_REVIEWER=true) + Wave 5 gate (R37+): **HARD STOP at Phase 2 close milestone** per extended overnight authority [[project-overnight-authority-2026-05-18-morning]].

## OQ defaults applied (per overnight authority + Coordinator recommendations)

All 3 new OQs from WAVE-PLAN-03 take Coordinator-recommended defaults:
- **OQ-W3-1 = A** — `engine/events/event-feed.ts` single-file
- **OQ-W3-2 = A** — vendored-with-deltas on Phase 1 freeze-hook substrate
- **OQ-W3-3 = B** — SCOPING-MEMO MAJOR-1 surgery DEFERRED to WU-07 close-walk (cleaner scope-bounding)

OQ-W3-4 (event-feed schema closed-set vs extensible) is Architect's Brainstorm-phase call.

Architect MAY override any default at spec-emit time IF Brainstorm surfaces structural reason; document override rationale in spec preamble.

## Inputs for next role (Architect)

**Read in order:**

1. **`coordination/cluster-scopes/wave-4/wu-06-event-conditional-attribution.md`** — full scope block with 4 architectural surfaces + cross-project rule application + halt conditions. **Primary scope artifact.**
2. **`coordination/CLUSTER-HANDOFF-3-WU04-WU06.md`** — **HIGHEST RELEVANCE** — A16 binding-precedent table. Event-conditional attribution is highest-risk D4 reversal surface across all of Tessera.
3. **`coordination/CLUSTER-HANDOFF-3-WU05-WU06.md`** — SLICE 4 entry-framing supplement (R32 close-walk § 3 abbreviated; this handoff carries the framing).
4. **`coordination/CLUSTER-HANDOFF-3-WU{00,01,02,03}-WU06.md`** — 4 interface-only D2 MEDIUM edges.
5. **`coordination/WAVE-GATE-03.md`** — § Pre-flags (5 dispatch pre-flags) + Rule 5 derivation + R32 carry-forward routing.
6. **`coordination/WAVE-PLAN-03.md`** — § Step 6 tier classification + § Open questions.
7. **`coordination/SCOPING-MEMO-v0.3.md`** — § 2.3 Extension 3 (c) event-conditional correlational attribution + § 3 SLICE 4 row + § 4.2 R-S3/R-S5 + § 4.4 PR-F7 mandate + § 2.3 [R32 AMENDMENT] vendor-fungibility block (recently landed).
8. **`coordination/PRD.md`** — FR-E3c + AC-P4.
9. **`coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`** — § 3 SLICE 4 entry framing (abbreviated; complemented by WU-05 handoff).
10. **`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`** — **5 cross-project rules now active** (Rule 5 NEWLY DERIVED at R33 gate): apply UPFRONT.

**Wave 1+2+3 deliverables to reference (READ-ONLY):**
- `engine/l0/counter-rate-transform.ts` (R25)
- `engine/topology/{common-mode-attribution,slurm-source,k8s-source,nvlink-source}.ts` (R26/R28/R29/R30)
- `engine/verdict-groups.ts` (R20) + `engine/fleet/verdict-consumer.ts` (R21)
- `engine/types/verdict.ts` (vendored-with-deltas across R18+R20+R23)
- Inherited Phase 1 substrate at `engine/baseline-cells.ts` or equivalent (Architect verifies exact path at session entry per empirical-premise-verification reinforcement; OQ-W3-2 default A = vendored-with-deltas on this file)

## Four architectural surfaces (per scope block)

1. **Deployment-event-feed ingestion** — NEW Tessera-original substrate at `engine/events/event-feed.ts`
2. **Event-conditional correlational attribution layer** — NEW Tessera-original at `engine/events/event-conditional-attribution.ts`
3. **Phase 1 freeze-hook activation coupling** — vendored-with-deltas on inherited Phase 1 substrate (two-step maintenance UPFRONT)
4. **PR-F7 4-cell evidence matrix** — produced here; hybrid Reviewer audits at WU-07 (NOT here)

## Apply all 5 cross-project rules UPFRONT

1. `false-compliance-attestation` — actual binding-command results verbatim.
2. `architect-branch-binding-coverage` — trace data-flow not just syntax.
3. `implementer-spec-test-assertion-coverage` — every Then-column field asserted one-for-one.
4. `anti-scope-allowed-set-forward-coverage` — `^coordination\/reviews\/REVIEWER-REPORT-R34\.md$` + `^coordination\/MEMORIAL\.md$` regex carve-outs.
5. **`rule-derivation-without-self-application` (R33 gate; NEW)** — **Architect performs explicit self-audit at spec-emit time**: grep test pseudocode for `content.includes(`, `.length > 0`, `typeof x ===`, `assert.ok(` patterns; apply mutation test to each (could production return different-but-structurally-valid value and still pass?); record inline in spec § 9-class sweep. **First procedural application of Rule 5 at dispatch layer per WAVE-GATE-03 routing.**

## Anti-scope (R34 hard limits — see scope block § Anti-scope for full enumeration)

Headline:
- A12 (engine internals frozen; vendored-with-deltas only at OQ-W3-2 freeze-hook extension)
- A10 (hardware diagnosis fenced; event-feed ingests *deployment* events not hardware-fault signals)
- A11 (synthetic only — NO live deployment-pipeline endpoints)
- **A16 — Addition #26 D4 `correlational_not_causal: true` PRESERVED at every event-conditional emit site. HIGHEST RELEVANCE.** Regex-anchored + JSON-round-trip.
- A13 (rule-based + statistical only; NO ML)
- NO SCOPING-MEMO MAJOR-1 surgery (WU-07 close-walk per OQ-W3-3 = B)
- NO PR-F7 hybrid Reviewer here (fires at WU-07)
- NO R32 carry-forward closures (WU-07 punch list per `STAGED-FOR-PHASE-2-CLOSE.md` Item 2) EXCEPT R26 MINOR-2 deferred impl alignment IF FusedVerdict → FiredShardEvent adapter consumer site ships in WU-06

## Halt conditions

Per scope block:
1. A16 D4 reversal surface emerges — HALT + DIAGNOSTIC + ESCALATE (highest priority).
2. Freeze-hook coupling needs inherited substrate modification beyond vendored-with-deltas — A12; route back.
3. PR-F7 external literature insufficient — surface as OQ.
4. Binding-command contradicts AC literal — HALT (false-compliance-attestation).
5. Event-conditional structural false-positive class unfixable by AC tuning — route back.
6. Rule 5 self-application sweep identifies non-discriminating AC unstrengthenable without scope expansion — HALT for operator decision.

## Escalation items

(none active)

## Routing notes

- Per extended overnight authority full chain through Phase 2 close. WU-06 close + Wave 4 gate (R35) → Wave 5 dispatch (WU-07; audit + hybrid Reviewer) → Wave 5 gate (R37+) = HARD STOP.
- R26 MINOR-2 deferred impl alignment is Architect's call (if FusedVerdict → FiredShardEvent adapter consumer site ships in WU-06, close here; else carry to WU-07).

## State at R34 entry

| Element | State |
|---|---|
| Wave 1+2+3 deliverables | ✅ all merged + close-walked at R32 |
| WAVE-GATE-03 + WAVE-PLAN-03 + 6 CLUSTER-HANDOFF-3 | ✅ emitted at R33 |
| 5 cross-project rules active | ✅ all in CROSS-PROJECT-MEMORIAL.md (Rule 5 NEW at R33 gate) |
| Vendor-fungibility amendment | ✅ landed IN-PLACE in SCOPING-MEMO-v0.3 at R32 |
| 0-CRITICAL streak | 30+ rounds |
| 0-MAJOR streak | broken at R32 (audit-tier hybrid Reviewer surfaced 2 MAJOR; methodology absorbed) |
| Working tree | clean |
| HEAD | `2c35fb6` (R33 Coordinator outputs) |
| Main-worktree baseline | tests=305/pass=299/fail=6; tsc exit 0 (per WAVE-GATE-03 pre-flag — Architect verifies empirically at session entry) |
| CLAUDE-IMPLEMENTER.md | 51 lines (MR-2 consolidation staged for Phase 2 close per `STAGED-FOR-PHASE-2-CLOSE.md` Item 1) |
| Wave 5 (Phase 2 close-walk) readiness | conditional on Wave 4 gate ADVANCE |
| NEW HARD STOP | Phase 2 close milestone (Wave 5 gate; R37+ area) |
