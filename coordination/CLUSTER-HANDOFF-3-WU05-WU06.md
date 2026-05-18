# CLUSTER-HANDOFF-3-WU05-WU06 — WU-05 SLICE 3 CLOSE-WALK → WU-06 SLICE 4 (event-conditional attribution)

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-03-A (Wave 3) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06; `WAVE-GATE-03.md` § Findings by cluster CL-03-A; `coordination/reviews/REVIEWER-REPORT-R32.md`; `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`
**Type:** cross-cluster dependency contract (convention edge — SLICE-close document feeds next-SLICE entry-framing)

---

## Purpose

WU-06 (SLICE 4 event-conditional attribution; full-tier) reads the WU-05 SLICE 3 close-walk document as primary spec input — the close-walk document's § 3 SLICE 4 entry framing (or equivalent in R32's abbreviated close-walk: pre-flags carried in WAVE-GATE-03 + this handoff) IS the architectural brief the WU-06 Architect uses to brainstorm SLICE 4 scope. Plus: the close-walk's MAJOR/MINOR carry-forward inventory + the R32 SLICE 3 milestone state stamp.

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-3→Wave-4 edge is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch.

---

## Dependency edge

- **Source cluster:** CL-03-A
- **Source work unit:** WU-05 — SLICE 3 close-walk (audit-tier with Hybrid Reviewer; R32)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (event-feed ingestion + event-conditional correlational attribution + freeze-hook coupling + PR-F7 evidence)
- **Dependency test that fired:** D2 (AC reference / convention)
- **Edge confidence:** MEDIUM
- **Edge reasoning:** WU-06 does NOT read WU-05 outputs at runtime — the close-walk document is a spec input, not a build-time dependency. Edge fires on project convention: SLICE-close documents land before next-SLICE entry per Phase 1 close → Phase 2 SLICE 1 + SLICE 1 → SLICE 2 + SLICE 2 → SLICE 3 + SLICE 3 → SLICE 4 precedents. The convention is load-bearing for spec-drafting quality.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `PHASE-2-SLICE-3-CLOSE-WALK.md` | `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` | SLICE 3 milestone close-walk: § 1 goal/scope; § 2 Wave 1/2 WU summary; § 3 architectural properties confirmed (parallel-class independence; A16/D4 cross-wave corroboration; D1 HIGH edge validation WU-00→WU-03; LS-4 sparse-topology degradation RESOLVED); § 4 carry-forward inventory (15 items dispositioned); § 5 cross-project reinforcement rules derived (Rules 1-4 + R32 Rule 5 sub-class); § 6 PR-F6 hybrid Reviewer evidence audit (Cells 1/2/3 + R-E7); § 7 SLICE 3 milestone verdict. **§ 3 SLICE 4 entry framing is ABBREVIATED in the R32 close-walk** — the WAVE-GATE-03 § Pre-flags table + this handoff supplement entry framing. |
| `Q-R32-SPEC.md` | `coordination/specs/Q-R32-SPEC.md` | Audit-tier Implementer self-spec for WU-05 close-walk. |
| `REVIEWER-REPORT-R32.md` | `coordination/reviews/REVIEWER-REPORT-R32.md` | Hybrid Reviewer (Opus + Sonnet + Merger) report: 0 CRITICAL / 2 MAJOR / 4 MINOR / 7 OBS. STATUS: MERGE-READY. |
| `REVIEWER-REPORT-R32-opus.md` + `-sonnet.md` | `coordination/reviews/` | Individual hybrid Reviewer outputs (Opus + Sonnet pre-Merger). |
| `ROUND-R32-SUMMARY.md` | `coordination/logs/ROUND-R32-SUMMARY.md` | Memorial-Updater round summary: what worked, what violated discipline, root causes, reinforcements added, watch list, emerging cross-project patterns. |
| `SCOPING-MEMO-v0.3.md` (amended) | `coordination/SCOPING-MEMO-v0.3.md` | Vendor-fungibility R32 amendment landed IN-PLACE: § 1.7 vendor-neutrality + § 2.3 A10 generalization + vendor-fungibility surface table + § 1.8 amendment-history row. **STRUCTURAL CAVEAT (MAJOR-1):** `### Vendor fungibility` h3 heading at `:267` is inside the A12-A17 bullet list; substantive content intact at `:275-285` but structural placement is broken. WU-06 inherits the corrupted structure unless OQ-W3-3 disposes opportunistic close. |
| `PRD.md` (amended) | `coordination/PRD.md` | US-01 generalized from "bad GPU" to "bad accelerator" per R32 vendor-fungibility amendment. |

### SLICE 4 entry framing (supplement; the R32 close-walk § 3 SLICE 4 entry framing is abbreviated — this section provides the entry frame WU-06 Architect needs)

**SLICE 4 scope per SCOPING-MEMO § 2.3 Extension 3 (c) + § 3 Phase 2 SLICE 4 row:**

> Phase 2 SLICE 4 | 2-3 cycles | Deployment-event-feed ingestion (genuinely new ingestion). Event-conditional correlational attribution (MD-F5; PR-F7 pair-review). 4-cell evidence matrix regression test. Phase 1 freeze-hook activation coupling.

**Three architectural sub-components (cluster Architect's internal spec-split discretion):**

1. **Event-feed substrate (producer-side; Tessera-original).** Deployment-pipeline event stream: model redeploy, firmware push, env change, config change, capacity change (5 event-classes per SCOPING-MEMO § 2.3 enumeration; OQ-W3-4 surfaces whether schema is closed-set or extensible). Synthetic event-feed fixture for empirical validation. Architecturally analogous to inherited `flags` input on the orchestrator (per `deploysignal/ARCHITECTURE.md` tick contract `{live, baseline, flags}` at SHA `5a72371`) but at cluster-event scope rather than per-deploy scope.

2. **Event-conditional correlational attribution layer (consumer-side; Tessera-original).** CausalImpact / synthetic control / interrupted-time-series methods applied to per-shard verdicts conditional on `cluster_event_id`. Consumes WU-00 L0 contract by interface + R20/R21 VerdictGroup `cluster_event_id` surface + R23/R28-30 topology adapters by interface + WU-04 common-mode attribution shape (D1 HIGH edge — extends MD-F4 attribution pattern). Emits `TopologyCandidate`-shaped output (or parallel-class extension) with `correlational_not_causal: true` invariant preserved.

3. **Phase 1 freeze-hook activation coupling.** Per SCOPING-MEMO § 2 R-S3 row pre-Phase-2 activation hazard + § 2.4 dependency-graph circular-coupling: Phase 1 freeze-hook reads Phase 2 event-feed to freeze per-shard baselines during the post-deploy-event window. Activation flag transitions `freeze_hook_enabled: false → true`. Requires vendored-with-deltas check on inherited Phase 1 substrate (OQ-W3-2).

**PR-F7 hybrid Reviewer evidence package (load-bearing for the WU-07 Phase 2 close-walk Hybrid Reviewer):**

- **Cell 1 — positive sensitivity:** event injected → attribution surfaces event-conditional drift correctly.
- **Cell 2 — positive specificity:** no event, no drift → attribution does NOT surface false event-conditional candidate.
- **Cell 3 — negative specificity:** event injected + concurrent unrelated per-shard drift → attribution surfaces event-conditional correctly, ignores unrelated drift.
- **Cell 4 — confounder discrimination:** event-triggered-but-not-event-attributable drift (event uncovered a latent fault; per SCOPING-MEMO § 4.2 R-S5) → attribution surfaces with calibrated correlational-not-causal evidence; does NOT mis-attribute as event-conditional when underlying drift was latent pre-event.

**External literature citation evidence package (PR-F7 requirement):** CausalImpact (Brodersen-Gallusser-Koehler-Remy-Scott 2015 BSTS) + synthetic control (Abadie-Diamond-Hainmueller 2010) + interrupted time series confounding hazards literature. Each citation: URL + retrieval date + verbatim quote.

**A16 wire-format invariant binding (CRITICAL for this WU):** `correlational_not_causal: true` REQUIRED on every event-conditional attribution output. Bind at AC level with WU-04-precedent rigor: regex with /m anchor on type-declaration site + JSON-serialized round-trip on wire-emission site (per R30 MINOR-1 fix pattern at AC-R32-15). Event-conditional attribution is the highest-risk Tessera surface for D4 reversal pressure because the statistical methods (CausalImpact / synthetic control / ITS) carry "causal" terminology in the literature. Architect MUST bind A16 at every emit site.

### R32 SLICE 3 milestone state (verified by Hybrid Reviewer)

- **0-CRITICAL streak:** 32 consecutive rounds (extended through R32).
- **R-E7 status:** MITIGATED (all 4 failure-mode paths empirically covered by AC suite against synthetic counter generator; per WU-03 AC-R30-10..14 evidence).
- **PR-F6 Cells 1/2/3:** Reviewer-verified PASS (Cell 4 tested at AC-R26-4 but not Reviewer-verified — MINOR-4 carry-forward).
- **Parallel-class architecture (Wave 2 topology adapters):** Confirmed structurally intact (slurm/k8s/nvlink adapters import only inherited interfaces; no cross-adapter imports; no `engine/topology-overlay.ts` body modification).
- **D1 HIGH edge WU-00 → WU-03 NVLINK:** Confirmed correct (WU-03 directly imports `transformPair` + 4 substrate factories; exercises L0 contract empirically).
- **A16 / D4 cross-wave corroboration:** `correlational_not_causal: true` set at exactly one origin (`engine/topology/common-mode-attribution.ts`); R26 + R30 + R32 verified at type-declaration + wire-format binding sites.
- **LS-4 sparse-topology degradation:** RESOLVED at R26.
- **Main HEAD at handoff:** `c503edb` (R32 Memorial-Updater outputs).

---

## Verification status

Per `REVIEWER-REPORT-R32.md` Merger output + `WAVE-GATE-03.md` § Findings by cluster CL-03-A:

- [x] Output artifact (`PHASE-2-SLICE-3-CLOSE-WALK.md`) exists at the stated location; verified at gate via main HEAD `c503edb`.
- [x] Interface contract matches Hybrid Reviewer per-AC verification (26 ACs PASS; PR-F6 Cells 1/2/3 + R-E7 evidence sound).
- [x] No CRITICAL findings; 2 MAJORs are documentation/audit-trail defects not behavioral defects (MAJOR-1 structural SCOPING-MEMO; MAJOR-2 weak AC binding pattern violating R32's own derived rule).
- [x] Anti-scope clauses from WU-05 spec scope do not unexpectedly bound this output — close-walk is convention-input for WU-06, not a runtime dependency.
- [x] SLICE 4 entry framing supplied (this handoff § "SLICE 4 entry framing (supplement)" above; R32 close-walk § 3 is abbreviated and this supplement fills the gap).

---

## Carry-forward items WU-06 MUST treat as inputs (not deliverables; pre-flags)

### R32 MAJOR-1 — SCOPING-MEMO § 2.3 structural corruption (carry-forward)

**State at handoff:** Substantive vendor-fungibility content intact at `SCOPING-MEMO-v0.3.md:275-285`; structural placement broken at `:267` (h3 heading inside A12-A17 bullet list).

**WU-06 action:** Per OQ-W3-3 (WAVE-PLAN-03), WU-06 spec authoring MAY close opportunistically IF spec touches SCOPING-MEMO anyway. Coordinator default: defer to WU-07 close-walk. Architect's call.

### R32 MAJOR-2 — 4 weak ACs (rule-derivation-without-self-application; carry-forward)

**State at handoff:** AC-R32-2, AC-R32-7, AC-R32-13, AC-R32-14 use `content.includes(...)` patterns. Implementations substantively correct; binding ACs weak.

**WU-06 action:** WU-06 Architect MUST self-apply the `rule-derivation-without-self-application` Rule 5 gate at spec-write time: for every AC binding R32-derived rules (Rules 1-5), grep WU-06 test file for weak patterns (`content.includes(`, `.length > 0`, `typeof x ===`, `assert.ok(` for equality-AC bindings) and apply mutation test. Strengthening the 4 R32 ACs themselves is NOT in WU-06 scope (closed-round artifacts); carry forward to WU-07 cleanup punch list.

### R32 MINOR-4 — PR-F6 Cell 4 not Reviewer-verified (carry-forward to PR-F7 design)

**State at handoff:** PR-F6 Cell 4 (mixed-signal robustness) tested at AC-R26-4 but not Reviewer-verified. PR-F7 must include ALL 4 cells as Reviewer-verified to avoid the same defect class.

**WU-06 action:** WU-06 Architect spec includes 4 Reviewer-verified ACs for the PR-F7 evidence package (one per cell above). The hybrid Reviewer at WU-07 Phase 2 close-walk audits PR-F7 evidence under both Opus + Sonnet readings.

### R26 MINOR-2 — `earliest_event_ts` / `latest_event_ts` aggregation deferred (carry-forward)

**State at handoff:** Docstring at `engine/topology/common-mode-attribution.ts:65-72` relaxed at R32 (Option B disposition); impl per-distinct-member-shard de-duplication DEFERRED until WU-06 consumer context.

**WU-06 action:** If WU-06's event-conditional attribution consumer site lands the FusedVerdict → FiredShardEvent adapter context, include the impl alignment as a deliverable in WU-06 spec. Otherwise carry forward to WU-07 close-walk. Architect's call.

### R32 OBS-5 — execSync carry-forward in q25 + q30 anti-scope tests

**State at handoff:** `test/q25-l0-contract.test.ts:216` + `test/q30-nvlink-adapter.test.ts:230` use `execSync` for git diff calls; R26 MINOR-1 mandates `execFileSync`.

**WU-06 action:** Pre-existing from R25 + R30; outside WU-06 authorized scope unless spec touches q25 or q30 (unlikely — both frozen). Carry forward to WU-07 cleanup punch list.

---

## What the target cluster must not assume

- WU-05 close-walk did NOT define WU-06's SLICE 4 architectural shape — the close-walk's § 3 entry framing is abbreviated; WU-06 Architect's brainstorm phase produces the architectural shape using the supplement section above + SCOPING-MEMO § 2.3 Extension 3 (c) + WAVE-PLAN-03 Step 1 frame.
- WU-05 close-walk did NOT pre-resolve OQ-W3-1 (file layout) OR OQ-W3-2 (freeze-hook coupling scope) OR OQ-W3-3 (SCOPING-MEMO surgery timing). All three are operator-or-Architect decisions.
- WU-05 close-walk did NOT modify `engine/topology/common-mode-attribution.ts` body (only docstring at `:65-72`). The impl is Wave-1-frozen for WU-06 consumption.
- WU-05 close-walk did NOT pre-decompose SLICE 4 into 06a/06b/06c sub-WUs — single-cluster WU-06 with internal Architect spec-time discretion to split-decision if AC count exceeds 18 (per WAVE-PLAN-03 Step 5 rationale).
- WU-05's PR-F6 evidence audit is PR-F6-only; PR-F7 evidence is WU-06's deliverable produced fresh.

---

## Pre-flags from wave gate (WAVE-GATE-03 § Pre-flags to Wave 4 cluster)

See WAVE-GATE-03 § Pre-flags table for the full set. Headline pre-flags:

- **Rule 5 (`rule-derivation-without-self-application`) is the headline new cross-project rule** — WU-06 self-applies at spec time.
- **A16 wire-format binding is HIGHEST RELEVANCE for this WU** — event-conditional attribution is the highest-risk surface for D4 reversal pressure across all of Tessera.
- **WU-06 baseline at session entry:** at main HEAD `c503edb`, expected `tests=305 / pass=299 / fail=6` (Architect empirically verifies; do NOT cite cross-round attestations per R25 MAJOR-1 reinforcement).
- **`tsc` exit code:** at main worktree, `npx tsc -p tsconfig.test.json` exits 0 (better than historical pre-flag exit=2; R32 confirmed; encode actual exit code per false-compliance-attestation rule).
- **Hybrid Reviewer pair-review-style at Phase 2 close (WU-07)** — WU-06 itself does NOT have hybrid Reviewer; standard full-tier Reviewer (Opus). Hybrid pass concentrated at WU-07 per SCOPING-MEMO § 3 Phase 2 close-walk row.

---

## Halt conditions for target cluster

1. WU-06 spec time surfaces architectural ambiguity that the SLICE 4 entry framing supplement (above) does not bound — HALT with DIAGNOSTIC; route back to Coordinator for entry-framing amendment.
2. The freeze-hook activation coupling requires vendored-with-deltas transition on `engine/baselines/*` that exceeds the two-step maintenance pattern (e.g., new dispatch-table refactor at inherited Q70 layer) — HALT; ESCALATE to Coordinator for cross-round impact assessment per WAVE-PLAN-03 Step 2 contention-risks table.
3. Event-feed schema cannot be designed without referencing inherited DeploySignal-side architecture (A17 violation pressure) — HALT; ESCALATE.
4. A16 (`correlational_not_causal: true`) binding at the event-conditional attribution wire boundary surfaces a structural reversal pressure that cannot be resolved by AC tuning — HALT; ESCALATE with failure-mode characterization.
5. WU-06 AC count exceeds 18 at spec time — HALT with DIAGNOSTIC; recommend SCOPE-REDUCE-V1 split into WU-06a (event-feed substrate + freeze-hook coupling) + WU-06b (attribution-layer + PR-F7 evidence) per R20+R21 split-decision precedent; Coordinator emits WAVE-PLAN-v4.
6. Binding-command output contradicts AC literal text (e.g., `tsc` exit code regression) — HALT + DIAGNOSTIC per cross-project Rule 1 (false-compliance-attestation). DO NOT reframe as compliance.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff artifact emitted at Wave 3 gate authorizing Wave 4 dispatch. WU-05 close-walk verified MERGE-READY at main HEAD `c503edb`. Entry-framing supplement inline because R32 close-walk § 3 is abbreviated. |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
