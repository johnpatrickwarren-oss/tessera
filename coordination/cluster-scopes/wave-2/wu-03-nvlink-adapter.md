# Cluster scope — WU-03 NVLINK-ADAPTER (Wave 2 / R30)

_PRD scope block for cluster `wu-03-nvlink-adapter`, planted into the worktree's `coordination/PRD.md` by `scripts/multi-track-cluster-setup.sh --scope`. Cluster's Architect reads this + the CLUSTER-HANDOFF-1-WU00-WU03 contract + SCOPING-MEMO-v0.3 § 2.3 + § 3 SLICE 3.B row + § 4.2 R-E7 + WAVE-GATE-01 Pre-flags as primary inputs._

**This cluster is the canonical L0-contract D1 HIGH consumer.** WU-03 directly imports `engine/l0/counter-rate-transform.ts` to exercise the 32-bit wraparound, missed-scrape catchup, reset-vs-wrap disambiguation, and variable-interval normalization against the synthetic counter generator. WU-01 SLURM and WU-02 K8S are interface-only (D2 MEDIUM); WU-03 is hot-path (D1 HIGH).

## Tier verdict

**`full`** (Architect + Implementer + Reviewer + Memorial-Updater per cluster).

Justification: A1 (new dependency on NVIDIA `nvidia-smi nvlink --status` output format) + A2 (first NVLink-source TopologySource concrete impl) + A4 (novel data flow — L0 contract D1 HIGH consumer; first cluster to exercise the wraparound/missed-scrape/reset paths against real adapter scenarios) + A6 (blast-radius implication if R-E7 mitigation evidence reveals L0 contract gap, would route back to Coordinator for L0-contract amendment).

## PRD source

- `coordination/PRD.md` FR-E3b (cross-shard correlation: topology-aware spatial attribution)
- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) "Cluster topology" + § 3 SLICE 3.B row + **§ 2.3 L0 contract sub-extension (invariant 4: DCGM 32-bit wraparound) + § 4.2 R-E7 risk row (primary mitigation consumer)**
- `coordination/CLUSTER-HANDOFF-1-WU00-WU03.md` — **L0 contract direct dependency (D1 HIGH); read FIRST as primary Architect input. Documents the `transformPair` function signature, types, constants, and behavioral guarantees the adapter consumes.**
- `coordination/WAVE-GATE-01.md` § Pre-flags to Wave 2 clusters — environmental + WU-03-specific pre-flags

## Scope

Implement the **NVLink topology adapter**: a concrete `TopologySource` implementation that parses `nvidia-smi nvlink --status` output (or equivalent NVIDIA NVLink-topology format) AND exercises the L0 contract's R-E7 mitigation paths against real adapter scenarios.

**Two-part scope:**

### Part 1 — NVLink topology parser (TopologySource conformance)

1. **`nvidia-smi nvlink --status` parser.** Canonical format: per-GPU `GPU N:` blocks with `Link M:` sub-entries for each NVLink link (peer GPU id, bandwidth, status). Produces `TopologyNode` per GPU (kind: `'gpu_shard'`) + per NVLink-peer-group + `TopologyEdge` with `relationship: 'nvlink_peer'` (per R23 enum extension).
2. **TopologySource interface conformance.** Implements `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)` per `engine/topology-overlay.ts:50-55`. Delegates hash to `computeSnapshotHash`.
3. **Sparse/partial NVLink topology graceful handling.** Some clusters expose only `nvidia-smi` summary (no per-link detail); adapter produces partial topology rather than throwing. Matches WU-04 R26 AC-R26-9 sparse-degradation pattern.

### Part 2 — L0 contract D1 HIGH consumer (R-E7 mitigation evidence)

4. **NVLink error-counter ingestion via L0 contract.** NVLink exposes per-link error counters (`Replay Errors`, `Recovery Errors`, CRC errors) that are 32-bit cumulative values. The adapter MUST call `transformPair()` with `meta = { semantic_type: 'counter', counter_width: 32 }` to invoke the wraparound path. Caller-side per-key prev-sample state management per the L0 contract.
5. **R-E7 mitigation AC suite.** Adapter tests MUST exercise (via the synthetic counter generator at `test/_substrate/synthetic-counter-generator.ts` — frozen R25 deliverable):
   - **32-bit wraparound** via `makeWrap32Pair` → assert `wraparound_handled === true` + rate computed via `(UINT32_MOD - prev + next) / actual_elapsed_seconds`
   - **Missed-scrape catchup** via `makeMissedScrapePair` → assert `slope_quality === 'degraded'` + `missed_scrape_inferred === true`
   - **Variable-interval normalization** via `makeVariableIntervalSequence` → assert rate-per-second comparability across different elapsed-seconds values; **use § 1.8 Mechanism tolerances `< 0.001` for mean and `< 0.01` for slopeNorm (NOT 1e-9)** per R25 MAJOR-3 disposition and the empirical reality that float64 makes 1e-9 infeasible.
   - **Reset-vs-wrap disambiguation** via `makeResetPair` with `counter_width: 32` → assert `reset_detected === true` (when `next < prev` AND `prev` below wrap threshold)
   - **R25 MINOR-2 opportunistic close** — add an AC that calls `transformPair` with `meta = { semantic_type: 'counter' }` (omitting `counter_width`) and verifies the `?? 64` default fallback; with `prev.value > next.value` and `prev` below `UINT32_MAX × 0.9 × default` threshold, the `reset_detected` arm fires correctly.

**File location** (parallel-class per WAVE-PLAN-02 OQ-W1-1 Option A):

- **Primary module:** `engine/topology/nvlink-source.ts` (Tessera-original).
- **Test:** `test/q30-nvlink-adapter.test.ts`.
- **Substrate:** NEW `test/_substrate/nvlink-fixture-*.txt` (Tessera-original; synthetic `nvidia-smi nvlink --status` output fixtures). PLUS consumes existing `test/_substrate/synthetic-counter-generator.ts` (R25 frozen) for R-E7 mitigation tests.

## Acceptance criteria

**AC enumeration is the Architect's job.** The Architect should enumerate ACs covering BOTH parts:

**Part 1 (topology parser):**
- Parser ACs: well-formed `nvidia-smi nvlink --status` → expected `TopologySnapshot` structure
- Edge-relationship literal: `'nvlink_peer'` (per R23 enum extension)
- Node-kind literal: `'gpu_shard'` for GPUs (per R18 enum)
- TopologySource interface conformance
- Sparse-topology graceful degradation

**Part 2 (L0 contract D1 consumer / R-E7 mitigation):**
- 32-bit wraparound AC (via `makeWrap32Pair`)
- Missed-scrape catchup AC (via `makeMissedScrapePair`)
- Variable-interval normalization AC (via `makeVariableIntervalSequence`; use 0.001/0.01 tolerances)
- Reset-vs-wrap disambiguation AC (via `makeResetPair` with `counter_width: 32`)
- **R25 MINOR-2 opportunistic close:** counter-arm `?? 64` default fallback AC

**Cross-cutting:**
- `correlational_not_causal: true` invariant preserved at output wire boundary (A16)
- Anti-scope diff AC (TQ-4 γ; SHA-pinned to chore-A)
- Typecheck + test count ACs (R22 IMPL MINOR-1; **anchored to chore-A SHA explicitly**; **must encode actual `tsc` exit code and actual `node --test` pass/fail counts empirically** per WAVE-GATE-01 pre-flags + R26 MAJOR-1 / R25 MAJOR-1 reinforcement)

Target AC count: 14-18 (higher than WU-01/02 due to R-E7 mitigation expansion).

## Anti-scope

- **A12 — NO modification of inherited vendored-at-pin engine internals.** `engine/topology-overlay.ts`, `engine/core.ts`, `engine/types/verdict.ts` (beyond R18+R23 enum extensions already landed), `engine/l0/schema-continuity.ts`, **`engine/l0/counter-rate-transform.ts`** (R25 frozen — adapter CONSUMES, does NOT modify).
- **A10 — NO hardware *diagnosis*.** Adapter ingests NVLink error counters and topology; does NOT diagnose per-GPU SDC or attribute failures (R-E7 mitigation is measurement-domain preprocessing per MR-1 A10 carve-out).
- **A11 — NO live NVIDIA endpoints.** Synthetic `nvidia-smi` output fixtures only; synthetic counter generator only.
- **A16 — Addition #26 D4 preserved.**
- **NO modification of WU-00 deliverables** (`counter-rate-transform.ts` + `synthetic-counter-generator.ts` frozen at Wave 1 close).
- **NO modification of WU-04 deliverables** (R26 frozen).
- **NO modification of WU-01 SLURM or WU-02 K8S parallel-cluster scopes**.
- **NO modification of `engine/hardware-topology-source.ts`** (R23 frozen — verify interface; do not modify).
- **NO modification of any pre-R30 test file** (q01..q26 + betting-e-process frozen).
- **NO new vendored-with-deltas transitions** unless Architect identifies one as load-bearing for NVLink parsing.
- **NO modification of `test/_substrate/synthetic-counter-generator.ts`** — extend usage by importing factories; do not edit. Frozen R25 deliverable.

## Reinforcements in scope (apply during cluster work)

Same set as WU-01/02 plus additional emphasis for WU-03's D1 HIGH path:

- **NEW R26-derived false-compliance-attestation sub-class** of halt-discipline (especially load-bearing since R-E7 mitigation has many assertion surfaces; honest attestation is critical).
- Line-citation-drift rule (R21 MINOR-4).
- Architect spec-commit-sequencing (R21 ARCH MINOR-1).
- AC-table preamble cross-check (R20 ARCH MINOR-1).
- Count-AC chore-A SHA anchoring (R22 IMPL MINOR-1).
- Branch-binding coverage gate (R21 ARCH+IMPL MINOR-2/3) — **load-bearing here: the R-E7 mitigation ACs are themselves structural-coverage tests of the L0 contract paths; the Architect should enumerate exactly which `transformPair` branches each AC exercises**.
- TDD separate-RED-commit (R23 IMPL MINOR-1).
- `.gitignore`-aware spec inventories (R23 ARCH MINOR-2).
- **NEW R25-derived coordinator-applied-disposition-spec-amendment-omission** pattern.

**Cluster-worktree pre-flags from WAVE-GATE-01:**

- **Baseline test count + actual `tsc` exit code:** encode empirically; do NOT reframe as compliance.
- **§ 1.8 tolerances (0.001 / 0.01) for variable-interval AC** — NOT 1e-9 per R25 MAJOR-3 disposition.
- **R25 MINOR-2 opportunistic close:** add counter-arm `?? 64` default-fallback AC (see Part 2 AC bullet above).

## Cluster context

**Wave 2 of 5 (parallel to WU-01 SLURM + WU-02 K8S).** Zero D-edges with WU-01/02 per WAVE-PLAN-02 Step 2 pairwise check.

**Upstream dependencies on this cluster's input:**

- WU-00 L0-CONTRACT (D1 HIGH — `engine/l0/counter-rate-transform.ts` is hot-path; `test/_substrate/synthetic-counter-generator.ts` provides test substrate factories)

**Downstream dependencies on this cluster's output:**

- WU-05 SLICE 3 close-walk (D1 HIGH — close-walk reads `engine/topology/nvlink-source.ts` + R-E7 mitigation evidence + Reviewer report; this WU's R-E7 evidence is the canonical mitigation deliverable)

## Halt conditions for this cluster (escalate to Coordinator)

1. **L0 contract surface gap surfaces during R-E7 mitigation exercises** (e.g., a wraparound or missed-scrape scenario where `transformPair` produces unexpected output) — HALT + DIAGNOSTIC + ESCALATE to Coordinator (would route back for L0-contract amendment via re-decomposition).
2. **NVLink parsing requires modifying inherited `engine/topology-overlay.ts` BFS body** — A12; route back.
3. **NVLink format requires new `TopologyNode.kind` or `TopologyEdge.relationship` literal** beyond R18+R23 enums — vendored-with-deltas transition for `engine/types/verdict.ts`; apply two-step maintenance pattern UPFRONT; if scope exceeds standard pattern, ESCALATE.
4. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per cross-project halt-discipline rule.

## Round

`R30` (Wave 2, cluster 3 of 3).

## Branch

`cluster/wu-03-nvlink-adapter-R30`.
