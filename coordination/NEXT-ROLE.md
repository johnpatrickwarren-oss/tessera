CURRENT-ROUND: R33
NEXT-ROLE: COORDINATOR
STATUS: READY

## Round-scope directive (R33 — Wave 3 gate + SLICE 4 decomposition)

**R33 = Coordinator wave-gate invocation aggregating Wave 3 (WU-05 SLICE 3 close-walk) outcomes + decomposing SLICE 4 (per WAVE-PLAN-02 OQ-W1-3) into WAVE-PLAN-03.md.**

**Operator authority extension (2026-05-18 mid-afternoon):** "do not stop at R33, keep moving forward." The original overnight-authority HARD STOP at SLICE 3 milestone has been **lifted**. Authority now extends through **Phase 2 close** (Wave 5 gate; R38+ area).

Per [[project-overnight-authority-2026-05-18-morning]] (updated authority): R33 chains forward to Wave 4 dispatch (SLICE 4) → Wave 4 gate → Wave 5 dispatch (WU-07 Phase 2 close-walk; HYBRID_REVIEWER=true per SCOPING-MEMO § 4.4) → Wave 5 gate = **NEW HARD STOP at Phase 2 close milestone**.

## Wave 3 cluster outcome (WU-05 R32)

**MERGE-READY** at HEAD `c503edb`. 305 / 297 / 8 tests (4 pre-existing fails + 4 new pre-Reviewer fails per spec design; chore-A 6466940 + chore-B SHA substitution at 7f737d6).

**5 deliverables landed (R32):**
1. ✅ `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`
2. ✅ **Vendor-fungibility SCOPING-MEMO amendment landed IN-PLACE** in `coordination/SCOPING-MEMO-v0.3.md` (§ 1.7 vendor-neutrality + § 2.3 A10 generalization + new vendor-fungibility surface table + § 1.8 amendment-history row + PRD.md US-01 "GPU" → "accelerator")
3. ✅ Wave 1 + Wave 2 MINOR cleanups (most landed; some carry forward — see R32 ROUND-SUMMARY for disposition)
4. ✅ PR-F6 hybrid Reviewer audit (REVIEWER-REPORT-R32.md; Opus + Sonnet + Merger output; surfaced rule-derivation-without-self-application sub-class)
5. (Deferred to this Coordinator gate) COORDINATOR-MEMORIAL augmentation

**Notable findings from R32 hybrid Reviewer (per ROUND-R32-SUMMARY.md):**
- New cross-project pattern surfaced: **rule-derivation-without-self-application** (the rule was understood — the round derived it — yet not applied to itself). Coordinator should evaluate for cross-project rule derivation at this gate.
- Hybrid Reviewer coverage split: Opus catches structural-analysis MAJORs; Sonnet catches carry-forward OBSs; Merger provides triple-verification.
- Audit-tier pre-emit-grilling gap: MAJOR-1 + MAJOR-2 would have been caught by cold-eye Architect at full tier; audit-tier checklist must be proportionally more thorough.
- execSync carry-forward (OBS-5): q25-l0-contract.test.ts:216 + q30-nvlink-adapter.test.ts:230 still use execSync vs R26 MINOR-1 reinforcement's execFileSync; queue for SLICE 4 entry cleanup.
- R26 MINOR-2 PARTIALLY-CLOSED (Option A deferred to WU-06 consumer context per OBS-4); ensure SLICE 4 spec authoring picks this up.
- CLAUDE-IMPLEMENTER.md at **51 lines** (up from 47; 8th consecutive round above threshold) — consolidation strongly recommended.

## Two-stage Coordinator invocation this round

This R33 invocation does BOTH:
1. **Wave 3 gate** — emit `WAVE-GATE-03.md` aggregating WU-05 R32 outcomes; SLICE 3 milestone stamp; close out Wave 3 ceremony.
2. **WAVE-PLAN-03 decomposition (SLICE 4)** — per WAVE-PLAN-02 OQ-W1-3 (deferred to post-WU-05): decompose SLICE 4 = WU-06 event-conditional attribution into work units. Coordinator decides single-cluster (full tier) OR fan-out per D1-D5 independence + operator preference (prefer fan-out where clean independence).

**Both can land in this single Coordinator session** since the gate aggregation feeds directly into the next-wave decomposition. Coordinator emits:
- WAVE-GATE-03.md
- COORDINATOR-MEMORIAL.md appends (Wave 3 gate confirmations + any new rules)
- WAVE-PLAN-03.md (or amendment to v2) for SLICE 4
- 1-N CLUSTER-HANDOFF-3-* artifacts (depending on SLICE 4 cluster count)

If Coordinator determines a separate second invocation is cleaner, that's a Coordinator judgment call; defer to a follow-up R34 Coordinator session if so. Either pattern fits the methodology.

## SLICE 4 scope reference (input for Coordinator decomposition)

Per `coordination/SCOPING-MEMO-v0.3.md` § 3 SLICE 4 row + § 2.3 Extension 3 (c):

> Phase 2 SLICE 4 | 2-3 | Deployment-event-feed ingestion (genuinely new ingestion). Event-conditional correlational attribution (MD-F5; PR-F7 pair-review). 4-cell evidence matrix regression test. Phase 1 freeze-hook activation coupling.

**Key axes for Coordinator's decomposition decision:**
1. **Event-feed ingestion substrate** — new Tessera-original substrate (deployment events; model redeploy, firmware push, env change, config change, capacity change). Producer-side; independent of attribution-layer consumer.
2. **Event-conditional attribution layer** — CausalImpact / synthetic control / interrupted time series methods applied to per-shard verdicts conditional on cluster_event_id (consumes both WU-00 L0 contract + R20/R21 VerdictGroup+fleet-merge + R23/R28-30 topology adapters).
3. **Phase 1 freeze-hook activation coupling** — per SCOPING-MEMO § 2 R-S3 row: pre-Phase-2 activation hazard; needs coupling to event-feed for fleet-event-driven baseline freeze.
4. **PR-F7 hybrid Reviewer evidence package** — 4-cell evidence matrix per SCOPING-MEMO § 2.3; honest-framing per inherited NORTH-STAR Addition #11 + Addition #26 D4 correlational-not-causal preserved.

**Coordinator candidate split (suggestion; final call is Coordinator's):**
- WU-06a EVENT-FEED-INGESTION (Tessera-original substrate; producer-side; could fan out parallel to WU-06b if D-edges permit)
- WU-06b ATTRIBUTION-LAYER (CausalImpact-class consumer of WU-06a + Wave 1/2 deliverables; full tier; PR-F7 evidence)
- WU-06c FREEZE-HOOK-COUPLING (Phase 1 freeze-hook activation; smaller; could be subsumed into 06b or fan out as 3rd cluster)

If D-edges permit fan-out (e.g., 06a independent of 06b at producer/consumer boundary; 06c independent of 06a if freeze-hook reads VerdictGroup state directly): operator-preference fan-out applies. Otherwise single-cluster WU-06.

## Inputs for next role (Coordinator)

**Read in order:**

1. **`CLAUDE-COMMON.md`** + **`CLAUDE-COORDINATOR.md`** — role discipline.
2. **`coordination/WAVE-PLAN-02.md`** — current plan; OQ-W1-3 is the SLICE 4 decomposition deferral; this R33 resolves it.
3. **`coordination/WAVE-GATE-02.md`** — prior gate; informs Wave 3 gate structure.
4. **`coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`** — Wave 3 deliverable; § 3 SLICE 4 entry framing.
5. **`coordination/reviews/REVIEWER-REPORT-R32.md`** — hybrid Reviewer R32 output; rule-derivation-without-self-application pattern.
6. **`coordination/logs/ROUND-R32-SUMMARY.md`** — round summary; carry-forward items for SLICE 4.
7. **`coordination/SCOPING-MEMO-v0.3.md`** — § 3 SLICE 4 row (line ~345); § 2.3 Extension 3 (c) event-conditional attribution; § 4.2 R-S3/R-S5 risks; **VENDOR-FUNGIBILITY AMENDMENT NEWLY LANDED at R32 — read § 2.3 A10 generalized + new vendor-fungibility table.**
8. **`coordination/COORDINATOR-MEMORIAL.md`** — append-only; record Wave 3 gate + SLICE 4 decomposition + new rule-derivation-without-self-application pattern (4th-5th gate-confirmed rule candidate).
9. **`templates/WAVE-GATE-TEMPLATE.md`** + **`templates/WAVE-PLAN-TEMPLATE.md`** + **`templates/CLUSTER-HANDOFF-TEMPLATE.md`** — scaffolds.

## Expected deliverables (this R33 invocation)

1. **`coordination/WAVE-GATE-03.md`** — Wave 3 gate artifact per template; SLICE 3 milestone stamp (not a chain stop per operator extension).
2. **`coordination/WAVE-PLAN-03.md`** (NEW; per template) — SLICE 4 decomposition; cluster count + tier per WU; D-edge analysis.
3. **1-N `coordination/CLUSTER-HANDOFF-3-WU<NN>-WU06*.md` artifacts** — handoffs from Wave 1/2/3 deliverables that WU-06 consumes (WU-00 L0 contract; VerdictGroup cluster_event_id surface; topology adapters; common-mode attribution layer; etc.).
4. **`coordination/COORDINATOR-MEMORIAL.md`** appends (Wave 3 gate confirmations; SLICE 4 decomposition record; new pattern derivations).
5. **`coordination/NEXT-ROLE.md`** update at end: `NEXT-ROLE: OPERATOR (Wave 4 dispatch authorization review — overnight-mode auto-proceeds)` / `STATUS: WAVE-GATE-READY`.

Auto-commit via `commit_coordinator_outputs` hook on clean completion.

## Operator-preference reminder (carry-forward)

PREFER fan-out when D1-D5 tests show clean independence; collapse only when proven dependent. Same bias that drove WAVE-PLAN-02's Wave 1 + Wave 2 fan-out shapes.

## Coordinator decisions to make at this invocation

1. **Wave 3 verdict:** ADVANCE (WU-05 MERGE-READY; no CRITICAL; new pattern observations not gating).
2. **Rule derivation evaluation:** Per R32 ROUND-SUMMARY, surfaced patterns: (a) rule-derivation-without-self-application; (b) hybrid Reviewer coverage split (Opus-vs-Sonnet); (c) audit-tier pre-emit-grilling gap. Coordinator decides which crosses 3+ threshold for cross-project rule derivation.
3. **SLICE 4 decomposition:** WU-06 single vs fan-out; tier per cluster.
4. **CLAUDE-IMPLEMENTER.md at 51 lines** — pre-flag for operator-triggered consolidation; do not auto-run.
5. **R26 MINOR-2 deferred-to-WU-06 contract:** ensure WU-06 spec authoring includes the impl alignment as a deliverable per OBS-4 forward-flag.
6. **execSync carry-forward (R32 OBS-5):** add to SLICE 4 cleanup punch list OR forward to WU-07 Phase 2 close-walk.

## Anti-scope (unchanged)

- NO modification of engine/* or test/* files
- NO drafting of WU-06 cluster spec (Architect's job at Wave 4 dispatch)
- NO modifying cluster-worktree NEXT-ROLE.md files
- NO pre-resolving operator OQs by assumption (surface as OQs in WAVE-PLAN-03)
- NO new WUs not traceable to PRD or SCOPING-MEMO
- NO Wave 4 dispatch via Coordinator-session direct action (operator-proxy in overnight mode authors scope blocks + invokes setup script)

## Routing notes

- Per extended overnight authority, after this R33 Coordinator invocation: overnight-mode workflow proceeds to Wave 4 dispatch (SLICE 4 cluster(s) per WAVE-PLAN-03). Operator-proxy authors per-cluster scope blocks + invokes `multi-track-cluster-setup.sh` × N + launches N pipelines in parallel.
- New HARD STOP: Phase 2 close milestone (Wave 5 gate; PR-F7 hybrid Reviewer evidence + Addition #26 D4 RECONFIRMED).

## State at R33 entry

| Element | State |
|---|---|
| WU-05 R32 SLICE 3 close-walk | ✅ MERGE-READY c503edb; merged into main |
| Vendor-fungibility amendment | ✅ landed IN-PLACE in SCOPING-MEMO-v0.3.md at R32 |
| PHASE-2-SLICE-3-CLOSE-WALK.md | ✅ emitted at R32 |
| REVIEWER-REPORT-R32.md (hybrid: Opus+Sonnet+Merger) | ✅ emitted |
| Wave 3 baseline tag | none required (single-cluster wave; no multi-track merge) |
| 0-CRITICAL streak | 28+ rounds |
| 0-MAJOR streak | broken at R32 (audit-tier surfaced 2 MAJOR per hybrid Reviewer; methodology absorbed; logged) |
| Working tree | clean |
| HEAD | `c503edb` |
| New patterns surfaced this round | 3 (rule-derivation-without-self-application; hybrid Reviewer coverage split; audit-tier grilling gap) |
| Wave 4 readiness | conditional on R33 Coordinator ADVANCE + WAVE-PLAN-03 emission |
| Phase 2 close (new HARD STOP) | ~R38+ area (3-5 rounds out) |
