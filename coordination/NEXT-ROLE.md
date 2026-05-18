CURRENT-ROUND: R19
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R19 = Phase 2 SLICE 1 close-walk + R18 MINOR in-passing cleanup.** Audit tier per S4 + S2 framing. FINAL round of evening-overnight chain — HARD STOP after R19 per Phase 2 SLICE 1 milestone.

R18 closed MERGE-READY (12/12 ACs PASS; 4 MINORs + 5 OBS; 181/181 regression) including a meta-event: Tessera's first ESCALATE-and-unblock-in-overnight cycle (Implementer halt-discipline → operator (A) disposition → 3-file surgical unblock → Reviewer audit → MERGE-READY). The methodology worked end-to-end.

R19 produces the Phase 2 SLICE 1 close artifact, addresses R18 MINORs in-passing if natural, and frames Phase 2 SLICE 2 entry for operator review.

## Two deliverables

### Deliverable 1 — `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` (new)

Mirrors R15 PHASE-1-CLOSE-WALK.md pattern at smaller scale (1 SLICE, not 1 Phase). Sections:

- **§ 1 Scope summary** — R18 deliverables: VerdictGroup `cluster_event_id?` + TopologyNode.kind extension (`'gpu_shard' | 'rack'`) + TopologyEdge.relationship extension (`'contains'`) + v9X fixture + 12 ACs.
- **§ 2 ESCALATE-and-unblock pattern documentation** — capture the R18 ESCALATE event for future Phase 2 SLICEs that touch vendored files:
  - When a vendored file gets Tessera-specific additive deltas, it must transition from `vendored-at-pin` → `vendored-with-deltas` in VENDORING-MANIFEST.md AND be removed from q01-no-at-pin-deltas AT_PIN_FILES list
  - The R18 spec under-anticipated this; future SLICE specs touching vendored files should pre-handle (anti-scope explicitly permits the manifest + test maintenance)
  - R01 (config.ts) and R18 (verdict.ts) are the two precedent applications
- **§ 3 Phase 2 SLICE 2 entry framing** — per v0.3 § 3 + § 2.3, SLICE 2 = outer aggregator extending vendored L3b VerdictGroup aggregator with cluster_event_id scope; fleet-merge consumption layer; per-shard verdict aggregation contract with cluster_event_id propagation. R19 documents what SLICE 2 looks like under each parked operator-gate item disposition:
  - OQ-1 / Q-JC1 calibrate.ts vendoring (still parked; SLICE 2 doesn't strictly need it)
  - OQ-R08-3 Phase 2 transient detector (still parked; orthogonal to SLICE 2)
- **§ 4 R18 MINORs disposition** — enumerate the 4 R18 MINORs from REVIEWER-REPORT-R18.md; for each: in-passing-closed at R19, OR deferred to next cleanup window
- **§ 5 Memorial state stamp** — REINFORCED counts at SLICE 1 close (18 ARCH + 26 IMPL + 1 COMMON + 1 REVIEWER); note the R18 +1 ARCH + 3 IMPL deltas (likely related to ESCALATE-cycle discipline lessons)
- **§ 6 Cross-references** — Q-R18-SPEC.md + REVIEWER-REPORT-R18.md + commit chain (c9827a9 → ... → 4564bf0)

### Deliverable 2 — R18 MINOR in-passing cleanup (optional; Implementer's judgment)

Per R18's REVIEWER-REPORT-R18.md, 4 MINORs surfaced. For each:
- If the fix is a 1-2 line documentation/test-message change: close in-passing
- If the fix requires architectural-class judgment: defer to morning triage queue
- Either way, document the disposition in PHASE-2-SLICE-1-CLOSE-WALK.md § 4

## R19 does NOT ship (explicit anti-scope)

- **Phase 2 SLICE 2 work** — HARD STOP at SLICE 1 milestone per evening-overnight authority.
- **HardwareTopologySource concrete impl** — Phase 2 SLICE 3 per v0.3 § 3.
- **Deployment-event-feed ingestion** — Phase 2 SLICE 4 per v0.3 § 3.
- **PSU / cooling_zone TopologyNode.kind additions** — deferred to later Phase 2 SLICEs.
- **Peer TopologyEdge.relationship additions** — deferred.
- **Modification to R18 production code** — R18's `engine/types/verdict.ts` deltas + `test/_substrate/v9X-cluster.ts` + `test/q18-phase2-slice1-topology-substrate.test.ts` are CLOSED-AT-R18; R19 doesn't touch.

## Tier and audit-tier specifics

**Tier: audit.** S4 (tactical follow-up to R18 close) + S2 (R18 spec + REVIEWER-REPORT describe the work). No A-factors fire — close-walk is documentation + state-summary, not architectural decision.

Implementer self-specs + executes; Reviewer cold-audits; Memorial Updater records.

**Split condition:** if Deliverable 2 R18 MINOR cleanup surfaces an architectural question (unlikely for routine MINORs but possible), HALT + DIAGNOSTIC + log to morning triage queue. Operator-gate decision; do not silently disposition.

## Active REINFORCED lines Implementer MUST apply (26 IMPL + 1 COMMON + 1 REVIEWER + 18 ARCH-for-reference)

Particularly:

- **Correction-propagation pass (R09 MAJOR-1):** if PHASE-2-SLICE-1-CLOSE-WALK § 2 documents the vendored-with-deltas pattern, enumerate all sibling sites that could benefit from the pattern documentation (Phase 2 SLICE 2-4 prior framing, etc.)
- **Inherited-testimony empirical verification (R08 MAJOR-2):** for any claim about R18 behavior or earlier-round state, verify by reading the actual files/commits/Reviewer reports
- **Procedural halt-discipline (R08 MAJOR-1):** if Deliverable 2 surfaces architectural ambiguity, HALT + DIAGNOSTIC
- **Attestation-accuracy (R03 MINOR-4):** OBSERVED counts
- **Reviewer MEMORIAL.md violation entries (R16):** Reviewer writes VIOLATION entries to MEMORIAL.md for any MINOR+ findings

## Halt conditions for R19

- **R18 MINOR cleanup architectural surface:** unlikely but possible.
- **PHASE-2-SLICE-1-CLOSE-WALK content scope expansion:** if architect-level analysis of SLICE 2 entry needs more than framing-by-disposition (e.g., starts pre-dispositioning), HALT.
- **Vendored-with-deltas pattern documentation needs operator endorsement:** if § 2 documentation crosses from "describe what R01 + R18 did" to "prescribe what future SLICEs MUST do," HALT — the latter is operator-gate.

## Coordination chore sequence (R14 final revision)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R19): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R19): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/ coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is empty.

## Pre-R19 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R18 HEAD `4564bf0`:
- Total: 181/0 across 19 test files
- npm run typecheck: exit 0

R19 expected at GREEN: prior 19 file counts UNCHANGED (close-walk is documentation; in-passing MINOR cleanup may touch 1-2 test files marginally). No new q19 test file expected.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R19 --tier audit
```

`--tier audit` per S4 + S2 + close-walk-not-architecture framing.

## After R19 — HARD STOP

Per evening-overnight authority [[project-overnight-authority-2026-05-17-evening]]: "Phase 2 SLICE 1 close (planned milestone; operator review of Phase 2 entry quality)" is the explicit stop condition. Operator returns; reads `coordination/OVERNIGHT-LOG-2026-05-17.md` morning triage queue (currently empty for evening session — TQ-3 was operator-dispositioned + closed; all other items closed or LOW priority); reads `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` for Phase 2 SLICE 1 architectural assessment + SLICE 2 entry framing.

## Operator gate items preserved for morning

- **TQ-3 CLOSED with disposition (A)** — Unblock executed cleanly; chain resumed; SLICE 1 closed
- **TQ-1 CLOSED with disposition (β)**
- **TQ-2 anchor PR #38 open** (LOW)
- **OQ-1 / Q-JC1** calibrate.ts vendoring (parked)
- **OQ-R08-3** Phase 2 transient detector scheduling (parked)
- R09-R18 misc MINORs (non-load-bearing; deferrable)

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R18 closed MERGE-READY post-Option-A-unblock; Phase 2 SLICE 1 substantive work landed. |
| 2026-05-17 | R19 launched: Phase 2 SLICE 1 close-walk + R18 MINOR in-passing cleanup; FINAL round of evening-overnight chain. |
