# CLUSTER-HANDOFF-2-WU03-WU05 — WU-03 NVLINK-ADAPTER + R-E7 MITIGATION → WU-05 SLICE 3 CLOSE-WALK

**From:** Coordinator TPM (R31)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-C (Wave 2) → Target cluster CL-03-A (Wave 3)
**Foundation:** `WAVE-PLAN-02.md` §WU-03 + §WU-05; `coordination/reviews/REVIEWER-REPORT-R30.md`; `coordination/WAVE-GATE-02.md` § Findings by cluster CL-02-C; SCOPING-MEMO § 4.2 R-E7 row
**Type:** cross-cluster dependency contract (includes R-E7 mitigation evidence package as a SLICE 3 deliverable component)

---

## Purpose

WU-05 (SLICE 3 close-walk; audit-tier with Hybrid Reviewer) audits WU-03's NVLINK-ADAPTER deliverable as one of three vendor-specific `TopologySource` impls AND as the load-bearing R-E7 mitigation evidence package (32-bit wrap + missed-scrape catchup + variable-interval normalization + reset-vs-wrap disambiguation, all bound by AC against the synthetic counter generator from WU-00). The Hybrid Reviewer (Opus + Sonnet + Merger) at SLICE 3 close re-audits WU-03's R-E7 evidence package per SCOPING-MEMO § 3 SLICE 3.C row commitment, alongside WU-04's PR-F6 evidence package.

The Coordinator verified at Wave 2 gate (R31) that WU-03's NVLink adapter is functionally correct (18 of 18 ACs PASS) and merged into main at `b613549`. The D1 HIGH edge from WU-00 (declared at WAVE-PLAN-02 Step 2) paid off empirically — adapter-side exercise of all 6 L0 invariants is the strongest validation of the L0 contract surface to date.

---

## Dependency edge

- **Source cluster:** CL-02-C
- **Source work unit:** WU-03 — NVLINK-ADAPTER + R-E7 mitigation evidence (Tessera Phase 2 SLICE 3.B + § 4.2 R-E7)
- **Target cluster:** CL-03-A
- **Target work unit:** WU-05 — SLICE 3 close-walk (with Hybrid Reviewer pass at SLICE 3 close per SCOPING-MEMO § 3 SLICE 3.C row)
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Per WAVE-PLAN-02 Step 2 + § 4.2 R-E7 row, WU-05 close-walk reads `engine/topology/nvlink-source.ts` + `REVIEWER-REPORT-R30.md` directly to aggregate SLICE 3 state stamp + audit the R-E7 mitigation evidence package as a load-bearing SLICE 3 deliverable. The Hybrid Reviewer pass re-validates the R-E7 evidence under both Opus + Sonnet readings per SCOPING-MEMO § 3 SLICE 3.C row commitment.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `nvlink-source.ts` | `engine/topology/nvlink-source.ts` (≈170 lines; Tessera-original) | `NvlinkTopologySource` class implementing `TopologySource`. Parses canonical `nvidia-smi nvlink --status` text output: GPU header blocks + `Peer GPU` lines. Emits `TopologyNode` (`kind: 'gpu_shard'`) + `TopologyEdge` (`relationship: 'nvlink_peer'` per R23 enum; **canonical undirected dedup**: `from < to` lex ordering + Set-based dedup). Sparse handling: snapshot's `partial` flag set when `edges.length === 0`. |
| 2 NVLink fixtures | `test/_substrate/nvlink-fixture-{well-formed,sparse}.txt` | Tessera-original synthetic `nvidia-smi` output files. Well-formed = 4-GPU complete mesh (12 raw peer lines → 6 canonical pairs). Sparse = 2-GPU no-peer block. |
| `q30-nvlink-adapter.test.ts` | `test/q30-nvlink-adapter.test.ts` (≈230 lines) | 18 ACs covering parser shapes + canonical edge ordering + interface conformance + **R-E7 mitigation evidence (AC-R30-10..14)** + A16 wire-format + binding-command attestations + anti-scope. |
| `Q-R30-SPEC.md` | `coordination/specs/Q-R30-SPEC.md` | Architect spec. |
| `Q-R30-SPEC-AUDIT.md` | `coordination/specs/Q-R30-SPEC-AUDIT.md` | Architect ceremony sidecar. |
| `REVIEWER-REPORT-R30.md` | `coordination/reviews/REVIEWER-REPORT-R30.md` | Reviewer report: 18 of 18 ACs PASS / 0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS. |

### Interface contract (TopologySource conformance)

`NvlinkTopologySource` implements the `TopologySource` interface per `engine/topology-overlay.ts:50-55`:

```typescript
class NvlinkTopologySource implements TopologySource {
  constructor(input: string, opts?: { id?: string; version?: string });
  readonly id: string;        // default 'nvlink_topology_source'
  readonly version: string;   // default 'nvlink-1'
  fetchSnapshot(ctx?: FetchContext): TopologySnapshot;
  snapshotHash(snapshot: TopologySnapshot): string;     // delegates to computeSnapshotHash per Addition #26 D6
}
```

**Parser behavior (verified empirically by R30 Reviewer):**

- Well-formed fixture (4 GPUs, complete mesh) → 4 nodes + 6 edges + `partial: false` (AC-R30-1).
- Every node `kind === 'gpu_shard'`; every edge `relationship === 'nvlink_peer'` (AC-R30-2/3; R18+R23 enum literals consumed without modification).
- Canonical edge ordering: `from < to` lex; uniqueness via Set dedup; expected 6-pair set `{gpu-0|gpu-1, gpu-0|gpu-2, gpu-0|gpu-3, gpu-1|gpu-2, gpu-1|gpu-3, gpu-2|gpu-3}` (AC-R30-4).
- Sparse fixture (2 GPUs, no peer lines) → 2 nodes + 0 edges + `partial: true` (AC-R30-7).
- Empty / no-GPU-blocks throws `NVLINK_PARSE_NO_GPU_BLOCKS` (AC-R30-8).

### R-E7 mitigation evidence package (load-bearing SLICE 3 deliverable)

**This is the architecturally-novel component of WU-03 — exemplary L0-contract consumer.** Per SCOPING-MEMO § 4.2 R-E7, "each adapter's tests must exercise the missed-scrape, wrap, and variable-interval cases against a synthetic counter generator" — NVLink's 32-bit error counters make WU-03 the empirical exercise site for the entire L0 contract surface.

**4 of 4 R-E7 failure-mode paths exercised:**

| Path | AC binding | Evidence |
|---|---|---|
| 32-bit wraparound | AC-R30-10 | `transformPair(makeWrap32Pair())` → `wraparound_handled === true`, `reset_detected === false`, `value === (UINT32_MOD − 4_200_000_000 + 50) / 1.0`. |
| Missed-scrape catchup | AC-R30-11 | `transformPair(makeMissedScrapePair(), { jitter_tolerance: 0.5 })` → `slope_quality === 'degraded'`, `missed_scrape_inferred === true`, `actual_elapsed_seconds === 2.0` (vs expected 1.0 + jitter threshold 1.5). |
| Reset-vs-wrap disambiguation | AC-R30-12 | `transformPair(makeResetPair(), { counter_width: 32 })` → `reset_detected === true`, `wraparound_handled === false`, `value === null` (prev=5000 below wrap threshold so wrap branch skipped → reset arm). |
| Variable-interval normalization | AC-R30-13 | `transformPair(...makeVariableIntervalSequence([1.0, 1.2, 1.5, ...], rate=10))` → `|mean - 10| < 0.001`, `|slopeNorm| < 0.01`, every pair `slope_quality === 'normal'`. Tolerances per R25 MAJOR-3 disposition. |

**Plus opportunistic AC closing R25 MINOR-2 coverage gap (AC-R30-14):** `transformPair(prev, next, { semantic_type: 'counter' }, opts)` with `counter_width` omitted → reset arm fires (default-width=64 strict-equals to wrap threshold's 32 → false → reset). Mutation-kill gap acknowledged transparently per R30 spec § 7.1.

---

## Verification status

Per `REVIEWER-REPORT-R30.md` § Per-AC verification table + WAVE-GATE-02 § Findings by cluster CL-02-C:

- [x] Output artifact exists at the stated location (`engine/topology/nvlink-source.ts`; verified at gate via main HEAD `56ee259`; merged at `56ee259` from cluster HEAD `b613549`).
- [x] Interface contract matches Reviewer per-AC verification (18 of 18 ACs PASS empirical; functional surface confirmed correct).
- [x] No CRITICAL findings. Zero MAJOR. (R26 MAJOR-1 reinforcement validated: `tsc` exit=2 attested verbatim per NEXT-ROLE.md:12-21.)
- [x] **R-E7 mitigation evidence package complete: 4 of 4 failure-mode paths exercised against the synthetic counter generator.**
- [x] Anti-scope clauses preserved. Round-start-to-HEAD diff = exactly 8-entry allowed-set; zero unexpected paths. No inherited engine file modified.
- [x] TDD discipline VERIFIED: separate RED commit `0502ffd` (test + fixtures only) precedes GREEN/chore-A `82d1e5a` (impl only); no retrofit pattern.
- [x] L0-contract D1 HIGH consumption: imports `transformPair`, `CounterMetadata`, `CounterSample`, `RateSample`, `TransformOpts`, `UINT32_MOD` from `engine/l0/counter-rate-transform.ts` (R25 frozen); imports 4 of 5 factories from `test/_substrate/synthetic-counter-generator.ts` (R25 frozen).

---

## Carry-forward items the close-walk MUST close (test/spec reconciliation in WU-05 cluster)

WU-05 is audit-tier and Wave-2-frozen on engine bodies. Close-walk does NOT modify `engine/topology/nvlink-source.ts`.

### R30 MINOR-1 — AC-R30-15 substring-match weakness re A16 / D4 invariant (Implementer spec-test-assertion-coverage class)

**Spec drift:** AC-R30-15 asserts `verdict.includes('correlational_not_causal: true')` against the read `engine/types/verdict.ts` file contents. This matches BOTH the architecturally-binding type-declaration at line 289 (`correlational_not_causal: true;`) AND the JSDoc reference at line 272 (`` ` correlational_not_causal: true ` is a... ``). If a regressing edit removed the type-declaration but left the JSDoc intact, AC-R30-15 would still PASS — A16 anti-scope (Addition #26 D4 wire-format invariant) would be silently broken.

**Implementation status:** A16 invariant correctly enforced at the type-declaration body (verdict.ts:289). The test verification surface is the gap.

**WU-05 close-walk action:** **This is a load-bearing closure for SLICE 3 close** because A16 is the strongest cross-cutting invariant in Tessera Phase 2 and the test is the only round-local guard against D4 reversal. Two options:
- **(a)** Amend the test to use regex-anchor `/^\s*correlational_not_causal:\s*true\s*;/m` (close-walk allowed-set must include the test file).
- **(b)** Import a `TopologyCandidate` instance and assert the literal at the runtime type level (more architecturally rigorous; matches AC-R28-11 TopologyEnricher integration pattern).
- Coordinator prior: (b) — runtime type-level assertion is more durable than file-content regex. Close-walk Architect picks; document in close-walk doc § "Wave 2 MINOR closure". **Hybrid Reviewer at SLICE 3 close re-audits whichever option lands.**

**Cross-project pattern:** Third of three Wave-2 occurrences feeding `implementer-spec-test-assertion-coverage` derived rule (Rule 3 at WAVE-GATE-02). 3-occurrence threshold crossed at Wave 2; rule derivable.

### R30 MINOR-2 — NvlinkTopologySource constructor third-operand dead code (Architect branch-binding-coverage class)

**Spec drift:** Constructor at `engine/topology/nvlink-source.ts:133-134`: `opts.id ?? snapshot.source_id ?? 'nvlink_topology_source'` and parallel for version. The third operand is unreachable because `parseNvlinkStatus` always defaults `snapshot.source_id` at line 108 + `snapshot.source_version` at line 109, and `TopologySnapshot.source_id`/`source_version` are typed `string` (required). Spec § 9.2 R06 sweep's "all opts fields covered" claim is structurally unsatisfied for the third operand.

**Implementation status:** Idiomatic — matches `engine/hardware-topology-source.ts:91` precedent (R23 inherited). The pattern is acceptable; the spec-level binding claim is the gap.

**WU-05 close-walk action:** Amend Q-R30-SPEC.md § 9.2 R06 sweep entry to acknowledge that the third-operand fallback is structurally unreachable via `parseNvlinkStatus` upstream defaulting; reclassify as "idiomatic defensive code matching HardwareTopologySource precedent." Bundle with the R30 MINOR-1 amendment commit.

**Cross-project pattern:** Third of three+ Wave-2 occurrences feeding `architect-branch-binding-coverage` derived rule (Rule 2 at WAVE-GATE-02). The R30 case sharpened the rule by surfacing the **syntactic-vs-data-flow distinction**: syntactic "all opts fields covered" is insufficient; the sweep must walk data-flow.

---

## What the target cluster must not assume

- WU-03 did NOT produce the L0-contract surface — that is WU-00. WU-03 IMPORTS and EXERCISES the L0 contract; the contract body itself is Wave-1-frozen.
- WU-03 did NOT modify `test/_substrate/synthetic-counter-generator.ts` — R25-frozen substrate; consumed via import only.
- WU-03 did NOT produce SLURM or K8S adapter implementations — those are WU-01 and WU-02.
- WU-03 did NOT modify `engine/topology-overlay.ts`, `engine/types/verdict.ts`, `engine/core.ts`, `engine/hardware-topology-source.ts`, or `engine/topology/common-mode-attribution.ts` — all frozen. Anti-scope verified at R30 Reviewer cross-cutting checks.
- WU-03's adapter does NOT support live NVIDIA endpoints — synthetic `nvidia-smi nvlink --status` text fixtures only per A11.
- WU-03 did NOT introduce a new `TopologyNode.kind` or `TopologyEdge.relationship` literal — used R18 `'gpu_shard'` + R23 `'nvlink_peer'` enums.

---

## Pre-flags from wave gate (WAVE-GATE-02 § Pre-flags to Wave 3 cluster)

- **R-E7 mitigation evidence package is COMPLETE.** All 4 failure-mode paths empirically exercised against the synthetic counter generator. WU-05 close-walk can stamp R-E7 status as MITIGATED in the SCOPING-MEMO § 4.2 risk register update. The Hybrid Reviewer re-audits the evidence package per SCOPING-MEMO § 3 SLICE 3.C row commitment — pre-validates the audit by reading AC-R30-10..14 + the substrate factory implementations + the resulting `RateSample` field values.
- **R30 MINOR-1 closure is load-bearing for A16.** Test-side weakness on the single round-local guard against D4 reversal; Coordinator recommends option (b) runtime type-level assertion. Hybrid Reviewer should specifically audit the chosen closure.
- **R30 MINOR-2 is the THIRD `architect-branch-binding-coverage` occurrence and derives cross-project Rule 2 at this gate.** Close-walk doc records the rule as derived; subsequent rounds' Architect grilling protocols should walk data-flow per Rule 2.
- **L0-contract D1 HIGH consumption empirically validates WAVE-PLAN-02 Step 3 Judgment call 1** (asymmetric D1 HIGH for NVLINK vs D2 MEDIUM for SLURM/K8S). NVLINK adapter directly imports and exercises `transformPair` + 4 substrate factories; SLURM and K8S adapters do NOT import L0 (verified by grep at R28/R29 Reviewer cross-cutting checks). Coordinator confirmation logged at WAVE-GATE-02 MEM-C-W2-1.

---

## Halt conditions for target cluster

1. The NVLINK adapter surface needs to be MODIFIED → HALT; route back to Coordinator. Wave-2-frozen.
2. Hybrid Reviewer's audit of WU-03's R-E7 mitigation evidence package surfaces an insufficiency (e.g., a wraparound edge case not exercised by AC-R30-10; a missed-scrape interval boundary not bound by AC-R30-11) → HALT with DIAGNOSTIC; close-walk may need to introduce a follow-up AC OR route back for a full-tier WU-03 amendment round. Unlikely per the empirical 4-of-4 path coverage, but structurally possible.
3. R30 MINOR-1 closure approach picks option (a) regex-anchor and the Hybrid Reviewer judges the regex weak (e.g., doesn't catch a JSDoc-vs-type-declaration substitution attack) → HALT; route back to swap to option (b) runtime type-level assertion.
4. The cross-project Rule 2 (`architect-branch-binding-coverage`) draft text needs canonical wording that differs materially from the WAVE-GATE-02 draft → HALT with DIAGNOSTIC; Coordinator picks final wording.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | CURRENT | Emitted at Wave 2 gate authorizing Wave 3 dispatch. NVLINK adapter + R-E7 evidence package verified at main HEAD `56ee259` (merge SHA `56ee259` from cluster HEAD `b613549`). R-E7 status: MITIGATED (pending Hybrid Reviewer re-audit at SLICE 3 close). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 2 gate (R31) — authorizing Wave 3 dispatch of WU-05 SLICE 3 close-walk |
