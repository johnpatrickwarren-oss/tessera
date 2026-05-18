# CLUSTER-HANDOFF-2-WU01-WU05 — WU-01 SLURM-ADAPTER → WU-05 SLICE 3 CLOSE-WALK

**From:** Coordinator TPM (R31)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-A (Wave 2) → Target cluster CL-03-A (Wave 3)
**Foundation:** `WAVE-PLAN-02.md` §WU-01 + §WU-05; `coordination/reviews/REVIEWER-REPORT-R28.md`; `coordination/WAVE-GATE-02.md` § Findings by cluster CL-02-A
**Type:** cross-cluster dependency contract

---

## Purpose

WU-05 (SLICE 3 close-walk; audit-tier with Hybrid Reviewer) audits WU-01's SLURM-ADAPTER deliverable as one of three vendor-specific `TopologySource` impls consolidated at SLICE 3 close, plus closes the R28 MINOR-1 carry-forward (test under-asserts spec literal on AC-R28-9 source_id/source_version).

The Coordinator verified at Wave 2 gate (R31) that WU-01's SLURM topology-format adapter is functionally correct (14 of 14 ACs PASS; 1 PARTIAL — under-assertion not behavioral defect) and merged into main at `d432947`.

---

## Dependency edge

- **Source cluster:** CL-02-A
- **Source work unit:** WU-01 — SLURM-ADAPTER (Tessera Phase 2 SLICE 3.B)
- **Target cluster:** CL-03-A
- **Target work unit:** WU-05 — SLICE 3 close-walk
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Per WAVE-PLAN-02 Step 2, WU-05 close-walk reads `engine/topology/slurm-source.ts` + `REVIEWER-REPORT-R28.md` directly to aggregate SLICE 3 state stamp + close the R28 MINOR carry-forward. The audit-tier close-walk consolidates Wave 2's three adapter deliverables into the SLICE 3 milestone artifact.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `slurm-source.ts` | `engine/topology/slurm-source.ts` (≈230 lines; Tessera-original) | `SlurmTopologySource` class implementing `TopologySource`. Parses canonical Slurm `topology.conf` format: `SwitchName=switchA Switches=switchB,switchC` (hierarchical tree) + `SwitchName=switchA Nodes=node[1-3]` (leaf bindings). Emits `TopologyNode` (`kind: 'rack' \| 'gpu_shard'`) + `TopologyEdge` (`relationship: 'contains'`). Handles bracket-range zero-padding + multi-token brackets + sparse subtree placeholders. |
| 3 Slurm fixtures | `test/_substrate/slurm-fixture-{canonical,hierarchical,sparse}.conf` | Tessera-original synthetic `topology.conf` files exercising the 3 documented topology shapes. |
| `q28-slurm-adapter.test.ts` | `test/q28-slurm-adapter.test.ts` (≈260 lines) | 14 ACs covering parser shapes + bracket expansion + sparse handling + interface conformance + TopologyEnricher integration + anti-scope + binding-command attestations. |
| `Q-R28-SPEC.md` | `coordination/specs/Q-R28-SPEC.md` (925 lines) | Architect spec. |
| `Q-R28-SPEC-AUDIT.md` | `coordination/specs/Q-R28-SPEC-AUDIT.md` | Architect ceremony sidecar. |
| `REVIEWER-REPORT-R28.md` | `coordination/reviews/REVIEWER-REPORT-R28.md` | Reviewer report: 14 PASS (1 PARTIAL on AC-R28-9 under-assertion) / 0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS. |

### Interface contract (TopologySource conformance)

`SlurmTopologySource` implements the `TopologySource` interface per `engine/topology-overlay.ts:50-55`:

```typescript
class SlurmTopologySource implements TopologySource {
  constructor(input: string, opts?: { id?: string; version?: string });
  readonly id: string;        // default 'slurm_topology_source'
  readonly version: string;   // default 'slurm-1'
  fetchSnapshot(ctx?: FetchContext): TopologySnapshot;  // identity-equal across calls (caches private this.snapshot)
  snapshotHash(snapshot: TopologySnapshot): string;     // delegates to computeSnapshotHash per Addition #26 D6
}
```

**Parser behavior (verified empirically by R28 Reviewer):**

- Canonical `SwitchName=sw0 Nodes=node[1-3]` → 1 rack + 3 gpu_shard + 3 contains edges (AC-R28-1).
- Hierarchical 2-level tree (`top` → `mid0/mid1` → 4 leaves) → 3 rack + 4 gpu_shard + 6 edges (AC-R28-2).
- Bracket range `node[01-03]` preserves zero-padding (AC-R28-3); multi-token `node[1-3,5,7-9]` produces 7 leaves in declaration order (AC-R28-4).
- Sparse fixture (declared `top` references undeclared `child0`) → auto-creates `child0` as `kind: 'rack'` placeholder (AC-R28-5).
- 4 malformed-input sub-cases throw `SLURM_TOPOLOGY_PARSE_ERROR` (AC-R28-8): empty SwitchName / duplicate / malformed range / unclosed bracket.

**TopologyEnricher integration (AC-R28-11):** SlurmTopologySource feeds into the inherited BFS attribution layer at `engine/topology-overlay.ts:174-179` defaultDeployNodeResolver; emitted `TopologyCandidate` preserves `correlational_not_causal: true` literal per A16 anti-scope (Addition #26 D4).

---

## Verification status

Per `REVIEWER-REPORT-R28.md` § Per-AC verification table + WAVE-GATE-02 § Findings by cluster CL-02-A:

- [x] Output artifact exists at the stated location (`engine/topology/slurm-source.ts`; verified at gate via main HEAD `56ee259`; merged at `44e397b` from cluster HEAD `d432947`).
- [x] Interface contract matches Reviewer per-AC verification (14 of 14 ACs PASS empirical; functional surface confirmed correct).
- [x] No CRITICAL findings in Reviewer report. Zero MAJOR.
- [x] Anti-scope clauses preserved. R28 chore-A diff = exactly 8 mandatory allowed-set paths; chore-B = NEXT-ROLE.md + MEMORIAL.md + test substitution per Implementer chore-B append discipline. No inherited engine file modified.
- [x] TDD discipline VERIFIED: spec commit `8f7e797` precedes test/impl commits; RED commit `7783a89` (test + fixtures only, no impl); GREEN commit `6e5cc69` (impl + NEXT-ROLE); chore-B RED→GREEN cycle on AC-R28-12 SHA substitution.

---

## Carry-forward items the close-walk MUST close (test/spec reconciliation in WU-05 cluster)

WU-05 is audit-tier and Wave-2-frozen on engine bodies. Close-walk does NOT modify `engine/topology/slurm-source.ts`. Spec/test alignment items below are amended in the close-walk artifacts.

### R28 MINOR-1 — AC-R28-9 test under-asserts vs spec wording (Implementer spec-test-assertion-coverage class)

**Spec drift:** Q-R28-SPEC.md § 5.2 AC-R28-9 row line 764 requires `source_id: META.sourceId, source_version: META.sourceVersion` assertions on the empty-input snapshot. Test `test/q28-slurm-adapter.test.ts:158-166` asserts `nodes`/`edges`/`fetched_at_ts` only.

**Implementation status:** Correct — `slurm-source.ts:149-150` emits `source_id`/`source_version` unconditionally; AC-R28-10 indirectly covers the populated-input path. Empty-input path is structurally the same code, so functional coverage exists; the spec-literal-vs-test-binding is the gap.

**WU-05 close-walk action:** Two options for the close-walk Architect:
- **(a)** Amend Q-R28-SPEC.md § 5.2 AC-R28-9 row to acknowledge the empty-input source_id/source_version structural overlap with AC-R28-10 (spec text relaxation; no test change).
- **(b)** Add a follow-up AC in the close-walk doc that structurally binds the empty-input source_id/source_version (single-line test extension; close-walk allowed-set must include the test file).
- Coordinator prior: (a) preserves the Wave-2-frozen-test discipline; (b) closes the coverage gap more thoroughly. Close-walk Architect picks; either is acceptable.

**Cross-project pattern:** This is the first of three Wave-2 occurrences feeding the `implementer-spec-test-assertion-coverage` derived rule (Rule 3 at WAVE-GATE-02). The cross-project pattern is now derivable; close-walk doc records it as a confirmed reinforcement.

---

## What the target cluster must not assume

- WU-01 did NOT produce the L0-contract surface — that is WU-00 (Wave 1; consumed by WU-05 via `CLUSTER-HANDOFF-2-WU00-WU05.md`). WU-01 explicitly verified via grep that `slurm-source.ts` does NOT import `engine/l0/counter-rate-transform.ts` (D7 D2-MEDIUM interface-only stance preserved per Reviewer-R28 § Cross-cutting checks).
- WU-01 did NOT produce K8S or NVLINK adapter implementations — those are WU-02 and WU-03 (Wave 2; consumed via their respective handoff artifacts).
- WU-01 did NOT modify `engine/topology-overlay.ts` body — read-only consumer of `TopologySource` interface + `FetchContext` + `computeSnapshotHash`. Halt-condition #1 non-fire confirmed at Reviewer-R28 § Cross-cutting checks.
- WU-01 did NOT introduce new `TopologyNode.kind` or `TopologyEdge.relationship` literals — chose existing enums (`'rack'` + `'gpu_shard'` for kinds; `'contains'` for relationship). Halt-condition #2 non-fire confirmed.
- WU-01's parser does NOT handle multi-bracket-per-token (`r[1-2]n[1-4]`) — explicitly rejected at `slurm-source.ts:164-166` per spec § 1.2 out-of-scope; multi-bracket reject branch is Architect-acknowledged-not-bound per R28 OBS-1.
- WU-01's parser does NOT handle live Slurm endpoints — synthetic `topology.conf` fixtures only per A11 anti-scope.

---

## Pre-flags from wave gate (WAVE-GATE-02 § Pre-flags to Wave 3 cluster)

- **R28 MINOR-1 is the FIRST of three `implementer-spec-test-assertion-coverage` occurrences crossed cross-project at Wave 2.** Close-walk doc records the derived rule (Rule 3 at WAVE-GATE-02) as a confirmed reinforcement and bundles MINOR-1 closure with the rule confirmation.
- **R28 OBS-1 / OBS-2 / OBS-3 are Architect-acknowledged-not-bound branches** (multi-bracket reject; cross-set inconsistency check; structurally-unreachable defensive code at slurm-source.ts:170). Pattern is acceptable per spec convention; close-walk MAY note in § "Wave 2 OBS inventory" but does NOT amend without operator direction.
- **Cluster worktree environmental artifact recap (not load-bearing for main-worktree WU-05).** R28 cluster ran in `~/projects/tessera-clusters/wu-01-slurm-adapter-R28/`; q01 ENOENT environmental fail observed there but does NOT recur in main worktree where WU-05 runs.

---

## Halt conditions for target cluster

1. The SLURM adapter surface needs to be MODIFIED → HALT; route back to Coordinator. The adapter body is Wave-2-frozen per anti-scope verification.
2. Hybrid Reviewer's audit of WU-01 surfaces a behavioral CRITICAL or MAJOR (not just spec-drift) → HALT with DIAGNOSTIC; promote audit-tier to full-tier mid-round per CLAUDE-COMMON.md §"Promotion mid-round" rule.
3. R28 MINOR-1 closure approach (option (a) spec relaxation vs option (b) test extension) is ambiguous and the close-walk Architect cannot pick without operator guidance → HALT with DIAGNOSTIC framing both options + recommend; do NOT default silently.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | CURRENT | Emitted at Wave 2 gate authorizing Wave 3 dispatch. SLURM adapter verified at main HEAD `56ee259` (merge SHA `44e397b` from cluster HEAD `d432947`). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 2 gate (R31) — authorizing Wave 3 dispatch of WU-05 SLICE 3 close-walk |
