CURRENT-ROUND: R40
NEXT-ROLE: OPERATOR
STATUS: ROUND-COMPLETE

## R40 Reviewer routing (2026-05-19)

**Verdict:** MERGE-READY (0 CRITICAL; 1 MAJOR; 5 MINOR; 4 OBS).

**Report:** `coordination/reviews/REVIEWER-REPORT-R40.md`

**Headline finding (MAJOR-1):** § 5.1 + § 6 + OQ-P3-5 of `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` treat Rule 7 canonical landing as "unknown / depends on R38/R39 Memorial-Updater outputs". The status is in fact RESOLVED: Rule 7 IS canonically landed per `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` + the deliverable's own state table at NEXT-ROLE.md:127 "7 cross-project rules canonical ✅". OQ-P3-5 is operative on a resolved question; degrades inventory actionability for the operator. Inventory is a DRAFT for operator review — content-correctable; does NOT block merge.

**MINOR / OBS rollup:** 5 MINORs (AC-R40-2 strict-literal partial coverage; § 1.1 wrong fixture-file cite; § 5.1 wrong WAVE-GATE-05 section header; § 5.4 occurrence-count enumeration off; AC-R40-7 right-reasons gap on § 5.1 prose) + 4 OBS (anchor PR cadence drift; weak AC discriminating power; defensible § 3.2 sequencing cite; overconfident AC-R40-2 attestation). See report § 2.

**Memorial-Updater inputs:** ROUND-R40-SUMMARY.md should note (a) MAJOR-1 → operator handoff so deliverable carries the correction or operator amends inline; (b) cosmetic MINORs bundleable into future R41-style or Phase 3 SLICE 1 documentation pass; (c) OBS-2 forward-flag for future inventory-synthesis specs to tighten string-presence ACs.

## Round-scope directive (R40 — Phase 3 candidate synthesis; audit-tier; main worktree)

R40 = third round of post-Phase-2-close safe-continuation chain per evening overnight authority [[project-overnight-authority-2026-05-18-morning]].

**This is NOT a Phase 3 entry.** R40 produces a single DRAFT inventory artifact (`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`) consolidating all TAGGED-FUTURE items across Phase 2 deliverables for operator review next session. Phase 3 SLICE scoping requires explicit operator authorization (per inherited anti-scope A17 + overnight authority).

## Primary deliverable

**`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`** — DRAFT inventory. Suggested structure:

### § 1 Vendor adapter expansion candidates (highest direct fit)

Per `coordination/SCOPING-MEMO-v0.3.md` R32 AMENDMENT vendor-fungibility section:
- AMD ROCm + Infinity Fabric / XGMI (`xgmi_peer` edge literal; `engine/topology/rocm-source.ts`)
- Google TPU + ICI (`tpu_ici_peer`; `engine/topology/tpu-source.ts`)
- AWS Trainium + Neuron Link (`neuron_link_peer`; `engine/topology/trainium-source.ts`)
- AWS Inferentia (parallel)
- Each follows established WU-03 NVLink + WU-01 Slurm + WU-02 K8s parallel-class pattern.

### § 2 Real-cluster integration candidates

Per SCOPING-MEMO § 4.2 R-E3 (TAGGED-FUTURE post-Phase-2): real-cluster integration vs synthetic-cluster substrate. Specific surfaces:
- Live DCGM/NVML telemetry ingestion (per amended A10 carve-out for measurement-domain preprocessing)
- Live Slurm/K8s/NVLink topology fetch (vs synthetic fixtures)
- Operational deployment to real GPU cluster (vs CI/synthetic)

### § 3 DeploySignal integration candidates

Per SCOPING-MEMO § 2.3 A17 (NO DeploySignal-integration scope at Phase 1+2): Phase 3+ commitment. Specific surfaces:
- engine extract to shared npm package (`@johnpatrickwarren-oss/deploysignal-engine`) per vendor-first sharing strategy + project-close success metric
- Bi-directional integration (DeploySignal consumes Tessera per-shard observations; Tessera consumes DeploySignal deploy-event feed)
- Vendoring drift resolution (R-E6 risk row)

### § 4 Infrastructure capability candidates

Per `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 4:
- **Tailscale + M4 Pro mini remote-execution** (MR-3 candidate; ~1-2 methodology rounds of setup)

Per `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (operator-scheduled PR landing):
- 4 anchor backflow PR candidates (subprocess-hang class)
- Coordinator graduation candidates from COORDINATOR-MEMORIAL

### § 5 Methodology evolution candidates

Per cross-project rules Rules 1-7 + COORDINATOR-MEMORIAL friction-surface observations:
- Rule 7 propagation mechanism implementation (Architect spec template enhancement gate; Implementer chore-A pre-commit grep gate)
- Forward-protection mechanism redesign (recurring R25 MAJOR-2 + R34 MAJOR-1 + R36 MAJOR-2 pattern across 3 rounds)
- Pipeline watchdog implementation (anchor backflow Item 3)
- Hybrid Reviewer coverage-split formalization (Opus structural vs Sonnet OBS pattern observed at R32 + R36)

### § 6 Parked operator-gate items

Per all overnight authority memories:
- OQ-1 / Q-JC1 `tools/calibrate.ts` vendoring decision
- OQ-R08-3 Phase 2 transient detector scheduling
- Anchor PR #38 review/merge (operator-owned)
- CLAUDE-IMPLEMENTER.md ongoing consolidation discipline (30-line threshold heuristic — does it scale to Phase 3 round volume?)

### § 7 Phase 3 scope-sizing analysis

Rough Q-cycle estimate per § 1-§ 6 candidates; identify which subset Phase 3 would commit to (operator decision); flag dependencies (vendor adapters depend on real-cluster integration ordering; DeploySignal integration depends on engine npm extract; etc.).

### § 8 NOT recommended for Phase 3 entry (deferred or rejected)

Items captured for completeness but NOT recommended:
- A15 multi-region / cross-cluster federation (per inherited anti-scope; out of scope)
- A13 ML-based attribution (conflicts with honest-broker stance)
- ANY new scope that would require SCOPING-MEMO v0.4

## Tier rationale

**audit-tier** — synthesis is a single-bounded-doc deliverable (S3) + tactical follow-up to Phase 2 close (S4); no novel architecture (no A1-A7); no production code. Implementer wears Architect hat with own thin spec; cold Reviewer audits doc structure + completeness.

## Anti-scope (R40 hard limits)

- NO Phase 3 entry / NO Phase 3 SLICE spec authoring (the deliverable is a DRAFT inventory for operator review)
- NO new scoping decisions (the deliverable surfaces candidates; operator decides)
- NO modification of engine/* or test/* files
- NO modification of CLAUDE-*.md reinforcement files (R39 closed consolidation)
- NO modification of SCOPING-MEMO-v0.3.md or PRD.md
- NO modification of any Phase 2 deliverable (close-walks, gates, plans, handoffs all frozen)
- NO writes to `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-7 already canonical-landed)
- NO new ANCHOR-BACKFLOW content beyond verifying existing artifact references
- NO operator-gate item dispositions (OQ-1, OQ-R08-3, anchor PR #38 stay parked)

## Apply all 7 cross-project rules UPFRONT

All 7 rules active. Especially:
- **Rule 5 (self-application gate)** — the synthesis doc itself must be useful; not just an inventory dump. Each candidate has a 1-line "why this matters for Phase 3" + dependency note.
- **Rule 7 (derived-rule-propagation)** — the inventory's § 5 includes Rule 7 propagation mechanism as a candidate, which is itself an application of Rule 7.

## Halt conditions

1. **Candidate surfaces operator-decision-class question** (e.g., "should AMD adapter precede TPU adapter in Phase 3 sequencing?") — flag as OQ in the inventory artifact; do NOT auto-decide.
2. **Inventory completeness reveals a Phase 3 candidate that contradicts an in-scope Phase 2 deliverable** (e.g., a new candidate that would require re-opening Phase 2) — HALT + DIAGNOSTIC.
3. **External-reference candidate (e.g., anchor backflow PR landing) has changed status since R36 ANCHOR-BACKFLOW compilation** — note in inventory but don't act.

## Inputs for Implementer

1. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 + R32 AMENDMENT vendor-fungibility (§ 1)
2. `coordination/SCOPING-MEMO-v0.3.md` § 4.2 risk table (R-E3 + R-E6 for §§ 2-3)
3. `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (Items 1-5; especially Item 4 for § 4)
4. `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (§ 4)
5. `coordination/COORDINATOR-MEMORIAL.md` (Wave 1-5 gate observations + Rules 1-7 derivation history for § 5)
6. `coordination/PHASE-2-CLOSE-WALK.md` (Phase 2 close state; what's deferred to Phase 3)
7. `coordination/PRD.md` (success metrics for § 3 DeploySignal integration + project close)
8. `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-7 canonical state for § 5)
9. ALL `coordination/WAVE-GATE-{01-05}.md` (Coordinator decisions referencing Phase 3 candidates)

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R40 --tier audit
```

## State at R40 entry

| Element | State |
|---|---|
| Phase 2 closed | ✅ R37 WAVE-GATE-05 stamp |
| R38 MAJOR-1 fix verified | ✅ |
| R39 consolidation | ✅ ARCH 33→25; IMPL 36→30 |
| 7 cross-project rules canonical | ✅ |
| 0-CRITICAL streak | 38+ rounds |
| Working tree | clean |
| HEAD | (current main post R39) |
| Post-Phase-2-close chain | R40 (in flight) → R41 (hygiene audit) → HARD STOP |

---

## R40 Implementer attestation (routing to Reviewer)

**Implementation SHA (chore-A):** `a8654302ccb42e58e2321d7da62adde74af2fcbc`

**Deliverables produced:**
- `coordination/specs/Q-R40-SPEC.md` — R40 spec (audit-tier; Implementer-authored per protocol)
- `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` — primary deliverable (DRAFT inventory)

**AC verification summary (self-attestation; Reviewer verifies cold):**

| AC | Claim | Status |
|---|---|---|
| AC-R40-1 | All 8 sections present in order | PASS — §1-§8 all present |
| AC-R40-2 | All 4 TAGGED-FUTURE adapters (AMD/TPU/Trainium/Inferentia) with "why" + dependency notes | PASS — §§ 1.1-1.4 each contain both |
| AC-R40-3 | Rule 7 cites WAVE-GATE-05 Decision 3; framed as Phase 3 item | PASS — § 5.1 cites "WAVE-GATE-05.md § Cross-project reinforcement rules derived, Decision 3 forward-flag" |
| AC-R40-4 | Forward-protection redesign cites WAVE-GATE-05 Decision 6; 5th occurrence / 3rd sub-class | PASS — § 5.2 cites all three: "5th occurrence total; 3rd structurally distinct sub-class" |
| AC-R40-5 | § 7 estimates are ranges + dependency ordering note | PASS — all estimates are ranges ("3-5 rounds per adapter", etc.); dependency ordering section present |
| AC-R40-6 | § 8 contains A15, A13, SCOPING-MEMO v0.4 | PASS — all three present |
| AC-R40-7 | No sequencing decisions resolved; all flagged as OQ | PASS — OQ-P3-1 through OQ-P3-6; no author recommendation on sequencing |
| AC-R40-8 | Anti-scope diff from 0759eec to HEAD is empty (no engine/test/src/tools/CLAUDE-*.md) | PASS — `git diff 0759eec HEAD --name-only -- engine/ test/ src/ tools/ CLAUDE-*.md SCOPING-MEMO* PRD.md` output was empty |

**Tactical decisions (inline; no spec amendment needed):**
- § 1.4 Inferentia relationship literal noted as "same as Trainium or new literal — Architect decision" to avoid resolving a scoping question
- Market-level claims (AMD as "primary H100 competitor") are background framing, not verifiable ACs — Reviewer should treat these as context, not assertions

**Inputs for Reviewer (cold read):**
- `coordination/specs/Q-R40-SPEC.md` (spec)
- `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` (deliverable)
- Source artifacts named in § 2 Mechanism of spec (for provenance verification):
  - `coordination/SCOPING-MEMO-v0.3.md` lines 270-289 (vendor-fungibility table)
  - `coordination/WAVE-GATE-05.md` Decisions 3 + 6 (§ 5 provenance)
  - `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Items 3 + 4 (§ 4 provenance)
  - `coordination/ANCHOR-BACKFLOW-2026-05-18.md` §§ 1-6 (§ 4 provenance)
  - `coordination/PHASE-2-CLOSE-WALK.md` § 3 (§ 8 provenance)
