# CLUSTER-HANDOFF-2-WU02-WU05 — WU-02 K8S-ADAPTER → WU-05 SLICE 3 CLOSE-WALK

**From:** Coordinator TPM (R31)
**Date:** 2026-05-18
**Wave:** Source cluster CL-02-B (Wave 2) → Target cluster CL-03-A (Wave 3)
**Foundation:** `WAVE-PLAN-02.md` §WU-02 + §WU-05; `coordination/reviews/REVIEWER-REPORT-R29.md`; `coordination/WAVE-GATE-02.md` § Findings by cluster CL-02-B
**Type:** cross-cluster dependency contract

---

## Purpose

WU-05 (SLICE 3 close-walk; audit-tier with Hybrid Reviewer) audits WU-02's K8S-ADAPTER deliverable as one of three vendor-specific `TopologySource` impls consolidated at SLICE 3 close, plus closes the 3 R29 MINOR carry-forwards (test verification gap on AC-R29-6, ALLOWED_SET forward-coverage on AC-R29-13, tactical env-strip deviation on AC-R29-12).

The Coordinator verified at Wave 2 gate (R31) that WU-02's K8s node-label adapter is functionally correct (13 of 13 ACs PASS) and merged into main at `d1f8c9b`.

---

## Dependency edge

- **Source cluster:** CL-02-B
- **Source work unit:** WU-02 — K8S-ADAPTER (Tessera Phase 2 SLICE 3.B)
- **Target cluster:** CL-03-A
- **Target work unit:** WU-05 — SLICE 3 close-walk
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Per WAVE-PLAN-02 Step 2, WU-05 close-walk reads `engine/topology/k8s-source.ts` + `REVIEWER-REPORT-R29.md` directly to aggregate SLICE 3 state stamp + close the 3 R29 MINOR carry-forwards.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `k8s-source.ts` | `engine/topology/k8s-source.ts` (155 lines; Tessera-original) | `K8sNodeLabelSource` class implementing `TopologySource`. Parses Kubernetes `corev1.NodeList` JSON shape consuming well-known node labels (`topology.kubernetes.io/zone`, `node.kubernetes.io/instance-type`, `nvidia.com/gpu.count`, etc.). Emits `TopologyNode` (`kind: 'rack' \| 'cooling_zone' \| 'gpu_shard'`) + `TopologyEdge` (`relationship: 'contains'`). Helper `parseNodeListToSnapshot` exported for substrate-direct use. |
| 4 K8s fixtures | `test/_substrate/k8s-nodelist-fixture-*.json` | Tessera-original synthetic K8s NodeList JSON files exercising full-label parse + sparse no-region + sparse no-GPU + empty cases. |
| `q29-k8s-adapter.test.ts` | `test/q29-k8s-adapter.test.ts` (305 lines) | 13 ACs covering parser shapes + metadata + sparse handling + interface conformance + A16 wire-format absence (no correlational_not_causal in adapter source) + binding-command attestations + anti-scope. |
| `Q-R29-SPEC.md` | `coordination/specs/Q-R29-SPEC.md` (833 lines) | Architect spec. |
| `Q-R29-SPEC-AUDIT.md` | `coordination/specs/Q-R29-SPEC-AUDIT.md` (312 lines) | Architect ceremony sidecar. |
| `REVIEWER-REPORT-R29.md` | `coordination/reviews/REVIEWER-REPORT-R29.md` | Reviewer report: 13 of 13 ACs PASS / 0 CRITICAL / 0 MAJOR / 3 MINOR / 4 OBS. |

### Interface contract (TopologySource conformance)

`K8sNodeLabelSource` implements the `TopologySource` interface per `engine/topology-overlay.ts:50-55`:

```typescript
class K8sNodeLabelSource implements TopologySource {
  constructor(input: K8sNodeList, opts?: { id?: string; version?: string });
  readonly id: string;        // default 'k8s_node_label_source'
  readonly version: string;   // default 'k8s-1'
  fetchSnapshot(ctx?: FetchContext): TopologySnapshot;  // identity-equal across calls (parse-once at construction)
  snapshotHash(snapshot: TopologySnapshot): string;     // delegates to computeSnapshotHash per Addition #26 D6
}

// Helper exported for substrate-direct testing:
export function parseNodeListToSnapshot(input: K8sNodeList): TopologySnapshot;
```

**Parser behavior (verified empirically by R29 Reviewer):**

- Full-label 4-host × 8-GPU × 2-zone fixture → 4 rack + 2 cooling_zone + 32 gpu_shard (38 total nodes) + 4 zone→host + 32 host→gpu contains edges (36 total edges) (AC-R29-2/3/5).
- Deterministic GPU shard IDs as `gpu:host-NN:INDEX` (AC-R29-4).
- Per-kind metadata: host gets `instance_type` + `region`; gpu_shard gets `gpu_product` + `host`; cooling_zone gets `{}` (AC-R29-6 — see MINOR-1 below for verification gap).
- Sparse no-region fixture → 2 rack + 1 zone + 0 gpu_shard (AC-R29-7); sparse no-GPU fixture → 2 rack + 1 zone + 0 gpu_shard (AC-R29-8).
- A16 wire-format absence: adapter source contains zero `correlational_not_causal` literals (AC-R29-10).

---

## Verification status

Per `REVIEWER-REPORT-R29.md` § Per-AC verification table + WAVE-GATE-02 § Findings by cluster CL-02-B:

- [x] Output artifact exists at the stated location (`engine/topology/k8s-source.ts`; verified at gate via main HEAD `56ee259`; merged at `b88dea7` from cluster HEAD `d1f8c9b`).
- [x] Interface contract matches Reviewer per-AC verification (13 of 13 ACs PASS empirical).
- [x] No CRITICAL findings. Zero MAJOR.
- [x] Anti-scope clauses preserved. R29 chore-A diff = 10 mandatory allowed-set paths; round-start-to-HEAD supplementary check (per CLAUDE-COMMON REINFORCED 2026-05-17) confirmed no phantom modification. No inherited engine file modified.
- [x] TDD discipline VERIFIED: separate RED commit `241a882` (12 stub tests + 4 empty fixtures; no production code) precedes GREEN/chore-A `778cff8` (production + 12 ACs passing).
- [x] Architect commit sequencing (R21 ARCH MINOR-1): spec commit `4d44ef7` precedes routing commit `201a583`.

---

## Carry-forward items the close-walk MUST close (test/spec reconciliation in WU-05 cluster)

WU-05 is audit-tier and Wave-2-frozen on engine bodies. Close-walk does NOT modify `engine/topology/k8s-source.ts`.

### R29 MINOR-1 — AC-R29-6 test verification weaker than AC literal (Implementer spec-test-assertion-coverage class)

**Spec drift:** Q-R29-SPEC.md § 4.2 AC-R29-6 row prescribes `metadata.host === source host name` (equality). Test `test/q29-k8s-adapter.test.ts:128-132` asserts `metadata.host` is a non-empty string via `typeof gpu.metadata?.host === 'string' && gpu.metadata.host.length > 0`.

**Implementation status:** Correct — `k8s-source.ts:133` sets `gpuMeta.host = name`; empirical confirmation `gpu:host-03:5` carries `metadata.host === 'host-03'`. A hypothetical regression flipping `metadata.host` to `'wrong-name'` would still pass the current assertion.

**WU-05 close-walk action:** Same options as R28 MINOR-1 — either (a) spec relaxation acknowledging that strict equality is functionally bound via the surrounding ACs, or (b) test extension. Coordinator prior: (b) — strengthen to `assert.strictEqual(gpu.metadata?.host, expectedHost)` (extracting expectedHost from `gpu.id.match(/^gpu:([^:]+):\d+$/)?.[1]`) per Reviewer-R29's recommended mitigation. Test-extension closes the gap robustly; spec relaxation would weaken the AC. Close-walk Architect picks; document choice in close-walk doc § "Wave 2 MINOR closure".

**Cross-project pattern:** Second of three Wave-2 occurrences feeding `implementer-spec-test-assertion-coverage` derived rule (Rule 3 at WAVE-GATE-02).

### R29 MINOR-2 — AC-R29-13 ALLOWED_SET omits Reviewer-report path (anti-scope-allowed-set-forward-coverage class)

**Spec drift:** Q-R29-SPEC.md § 2.5 + test `test/q29-k8s-adapter.test.ts:275-286` enumerate 10 ALLOWED_SET entries; none include `coordination/reviews/REVIEWER-REPORT-R29.md` nor any glob/regex covering it. DIAGNOSTIC regex `^coordination/diagnostics/DIAGNOSTIC-R29-.+\.md$` is a different directory.

**Current status at WU-05 entry:** The R29 Reviewer report DID commit to main as part of the Wave 2 merge sequence (`d1f8c9b` was the Reviewer-attested HEAD). AC-R29-13 currently fails on `git diff 778cff8..HEAD` per the predicted forward-failure pattern. This recurs the R26 MINOR-1 / R25 MAJOR-2 class.

**WU-05 close-walk action:** This is the **third occurrence** that derives cross-project Rule 4 (`anti-scope-allowed-set-forward-coverage`) at WAVE-GATE-02. Close-walk doc:
- Records Rule 4 as derived + draft text as the canonical wording.
- Amends Q-R29-SPEC.md § 2.5 + test `test/q29-k8s-adapter.test.ts` ALLOWED_SET to include regex carve-out `^coordination/reviews/REVIEWER-REPORT-R29\.md$` (parallel to the DIAGNOSTIC regex pattern already present).
- Re-runs AC-R29-13 empirically to confirm the regex carve-out closes the forward-failure.
- WU-05 close-walk's OWN allowed-set MUST adopt the carve-out pattern proactively (Rule 4 says so).

### R29 MINOR-3 — AC-R29-12 implementation deviates from spec § 3.2 (tactical-deviation-transparency sub-class)

**Spec drift:** Q-R29-SPEC.md § 3.2 prescribes `execFileSync('node', ['--test', '--test-reporter=tap', ...preR29Files], { encoding: 'utf8' })`. Implementation `test/q29-k8s-adapter.test.ts:246-251` extends the options object with `env: subEnv` (stripping `NODE_TEST_CONTEXT` + `NODE_TEST_WORKER_ID`) to handle Node.js v25 subprocess recursive-test-detection.

**Implementation status:** Technically necessary — without env-strip, the subprocess silently no-ops and AC-R29-12's TAP regex assertions fail. Spec REQUIREMENT (assert 243/241/2 on pre-R29 surface) is satisfied. Documented in R29 MEMORIAL only.

**WU-05 close-walk action:** Amend Q-R29-SPEC.md § 3.2 to enumerate the env-strip prescription explicitly; add a § 7.2 entry permitting subprocess `env` modification as a non-halt tactical adjustment when Node.js v25 recursive-test-detection behavior would otherwise cause subprocess no-op. Bundle with the MINOR-2 amendment commit.

**Cross-project pattern:** Tactical-deviation-transparency is related to but distinct from the false-compliance-attestation halt-discipline sub-class (Rule 1 at WAVE-GATE-02). Where Rule 1 catches reframed/falsified binding-command attestations (RED → "actually GREEN-with-warnings"), MINOR-3 catches a substantively-correct implementation that under-documents a known-necessary deviation. The deviation here PRESERVED the spec REQUIREMENT; the gap is visibility, not honesty. Close-walk doc notes this as a related-but-not-same sub-class and may surface as a future cross-project rule candidate if recurrence is observed.

---

## What the target cluster must not assume

- WU-02 did NOT produce the L0-contract surface — that is WU-00 (Wave 1). WU-02's adapter does NOT import `engine/l0/counter-rate-transform.ts` (D2 MEDIUM interface-only stance preserved; verified by grep at R29 Reviewer cross-cutting checks).
- WU-02 did NOT produce SLURM or NVLINK adapter implementations.
- WU-02 did NOT modify `engine/topology-overlay.ts`, `engine/types/verdict.ts`, `engine/core.ts`, or any pre-R29 test file. Approach A1 architectural choice (use existing kind/relationship enums only) avoided the type-extension halt.
- WU-02's adapter does NOT support live Kubernetes API endpoints — synthetic JSON fixtures only per A11.
- WU-02's `parseNodeListToSnapshot` helper is exported but currently unused by AC tests (R29 OBS-1) — close-walk does NOT introduce helper-direct ACs unless hybrid Reviewer surfaces it as load-bearing.

---

## Pre-flags from wave gate (WAVE-GATE-02 § Pre-flags to Wave 3 cluster)

- **R29 MINOR-2 is the THIRD `anti-scope-allowed-set-forward-coverage` occurrence and derives cross-project Rule 4 at this gate.** WU-05 close-walk's own ALLOWED_SET MUST include the regex carve-out pattern for Reviewer-report + DIAGNOSTIC + MEMORIAL paths; close-walk doc records the rule as derived + confirmed.
- **R29 MINOR-1 is the SECOND of three `implementer-spec-test-assertion-coverage` occurrences** crossed cross-project at Wave 2 (Rule 3).
- **R29 MINOR-3 (`tactical-deviation-transparency`) is sub-class of false-compliance-attestation discipline but distinct.** Single Wave-2 occurrence; not 3-threshold yet. Close-walk records observation; cross-project promotion deferred until recurrence.

---

## Halt conditions for target cluster

1. The K8S adapter surface needs to be MODIFIED → HALT; route back to Coordinator. Wave-2-frozen.
2. Hybrid Reviewer's audit surfaces a behavioral CRITICAL or MAJOR → HALT with DIAGNOSTIC; promote audit-tier to full-tier mid-round.
3. The R29 MINOR-2 ALLOWED_SET regex amendment surfaces a cross-cluster discipline conflict (e.g., another Wave 2 spec's regex doesn't compose with R29's) → HALT; route back to Coordinator to harmonize the canonical regex pattern across all Wave-2 spec amendments simultaneously.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | CURRENT | Emitted at Wave 2 gate authorizing Wave 3 dispatch. K8S adapter verified at main HEAD `56ee259` (merge SHA `b88dea7` from cluster HEAD `d1f8c9b`). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 2 gate (R31) — authorizing Wave 3 dispatch of WU-05 SLICE 3 close-walk |
