# Product Requirements Document — Tessera

_Thin PRD pointing to canonical SCOPING-MEMO-v0.3.md as the load-bearing scoping artifact. The Anchor pipeline reads this file as the Architect's primary input; SCOPING-MEMO-v0.3.md fulfills the PRD role at SCOPE-PROPOSAL fidelity (anchor's `templates/Q-NN-SPEC-TEMPLATE.md` frame at reduced fidelity, since per-extension architectural decisions and Q-cycle estimates are upstream of formal AC tables)._
# Cluster scope — WU-00 L0-CONTRACT (Wave 1 / R25)

# Cluster scope — WU-01 SLURM-ADAPTER (Wave 2 / R28)

_PRD scope block for cluster `wu-01-slurm-adapter`, planted into the worktree's `coordination/PRD.md` by `scripts/multi-track-cluster-setup.sh --scope`. Cluster's Architect reads this + the CLUSTER-HANDOFF-1-WU00-WU01 contract + SCOPING-MEMO-v0.3 § 2.3 + § 3 SLICE 3.B row + WAVE-GATE-01 Pre-flags as primary inputs._

## Tier verdict

**`full`** (Architect + Implementer + Reviewer + Memorial-Updater per cluster).

Justification: A1 (new dependency on Slurm topology.conf format ingestion) + A2 (first Slurm-source TopologySource concrete impl in Tessera tree) + parallel-class pattern with WU-02 K8S + WU-03 NVLINK (file convention chosen by Coordinator OQ-W1-1 default A).

## PRD source

- `coordination/PRD.md` FR-E3b (cross-shard correlation: topology-aware spatial attribution; HardwareTopologySource concrete impl per Addition #26 TopologySource interface)
- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) "Cluster topology (HardwareTopologySource concrete impl)" + § 3 SLICE 3.B row
- `coordination/CLUSTER-HANDOFF-1-WU00-WU01.md` — L0 contract interface dependency (D2 MEDIUM); read FIRST as primary Architect input
- `coordination/WAVE-GATE-01.md` § Pre-flags to Wave 2 clusters — environmental pre-flags applicable

## Scope

Implement the **Slurm topology adapter**: a concrete `TopologySource` implementation that parses canonical Slurm `topology.conf` format and produces `TopologySnapshot` objects consumable by the inherited `engine/topology-overlay.ts` BFS layer.

**Architecturally novel surfaces:**

1. **Slurm `topology.conf` parser.** Canonical format: `SwitchName=switchA Switches=switchB,switchC` for hierarchical tree topology + `SwitchName=switchA Nodes=node[1-10]` for leaf bindings. Parser produces `TopologyNode` per switch/node + `TopologyEdge` (relationship: `'contains'` for switch→node; `'contains'` for switch→switch).
2. **TopologySource interface conformance.** Implements `fetchSnapshot(ctx?)` + `snapshotHash(snapshot)` per `engine/topology-overlay.ts:50-55`. Delegates hash to `computeSnapshotHash` per shared semantics (per Addition #26 D6 archaeological-render).
3. **Sparse / partial topology graceful handling.** Slurm `topology.conf` may omit rack-level or PSU-level metadata; adapter should produce the subset topology rather than throwing. Matches inherited BFS-on-undirected sparse-degradation pattern (validated at WU-04 R26 AC-R26-9; LS-4 forward-flag pre-cleared).

**L0 contract dependency: D2 MEDIUM (interface-only).** Slurm topology.conf is configuration data, not counter-typed telemetry — Slurm parser does NOT call `transformPair()` directly. The adapter knows the L0 contract exists (so Wave 3 close-walk audit confirms architectural coherence) but does not import the transform function in its hot path. If any gauge-valued metadata is exposed (e.g., switch capacity counts as gauge), pass-through value-domain is correct; opportunistic AC closing R25 MINOR-3 (gauge + missed_scrape combination) is welcome but not required.

**File location** (parallel-class per WAVE-PLAN-02 OQ-W1-1 Option A; matches `engine/topology-overlay.ts` neighbor convention):

- **Primary module:** `engine/topology/slurm-source.ts` (Tessera-original).
- **Test:** `test/q28-slurm-adapter.test.ts`.
- **Substrate:** NEW `test/_substrate/slurm-fixture-*.conf` (Tessera-original; one or more synthetic topology.conf files).

## Acceptance criteria

**AC enumeration is the Architect's job.** The Architect should enumerate ACs covering:

- Parser ACs: well-formed `topology.conf` → expected `TopologySnapshot` structure (switches, nodes, edges, relationship literals)
- Edge-relationship literal correctness: `'contains'` for switch→switch + switch→node (per R18 enum); reject other relationship literals at parse time
- Node-kind literal correctness: appropriate kind enum for Slurm switch vs Slurm node (likely `'rack'` or new `'switch'` extension — Architect picks; if new kind needed, transition `engine/types/verdict.ts` to wider vendored-with-deltas per established pattern, with manifest + AT_PIN_FILES maintenance)
- `TopologySource` interface conformance: `fetchSnapshot(ctx?)` returns `TopologySnapshot`; `snapshotHash(s)` delegates to `computeSnapshotHash(s)`
- Sparse-data graceful degradation: partial `topology.conf` (only switch hierarchy, no node bindings) produces subset snapshot without throwing
- `correlational_not_causal: true` invariant preserved at any output that reaches a `TopologyCandidate` wire boundary (defensive; A16)
- Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A)
- Typecheck + test count ACs (per R22 IMPL MINOR-1; **anchored to chore-A SHA explicitly**; **must encode actual `tsc` exit code and actual `node --test` pass/fail counts empirically** per WAVE-GATE-01 pre-flags + R26 MAJOR-1 / R25 MAJOR-1 reinforcement)

Target AC count: 10-14 (matches R20/R21/R23 full-tier precedent; bounded; split-decision applicable if scope exceeds 14).

## Anti-scope

- **A12 — NO modification of inherited vendored-at-pin engine internals.** `engine/topology-overlay.ts` BFS body frozen (READ-ONLY consumer of `TopologySource` interface at `:50-55` + `computeSnapshotHash` at `:69-78`). `engine/core.ts` frozen.
- **A10 — NO hardware diagnosis.** Adapter parses cluster topology configuration; does NOT generate or interpret per-GPU health metrics.
- **A11 — NO live Slurm endpoints.** Synthetic `topology.conf` fixtures only.
- **A16 — Addition #26 D4 preserved.**
- **NO modification of WU-00 deliverables** (`engine/l0/counter-rate-transform.ts` + `test/_substrate/synthetic-counter-generator.ts` frozen at Wave 1 close).
- **NO modification of WU-04 deliverables** (`engine/topology/common-mode-attribution.ts` + R26 q-test frozen at Wave 1 close).
- **NO modification of `engine/hardware-topology-source.ts`** (R23 frozen — verify its interface contract; do not modify).
- **NO modification of any pre-R28 test file** (q01..q26 + betting-e-process frozen). q01 AC-7 ENOENT environmental fail is acknowledged pre-existing per WAVE-GATE-01.
- **NO drafting of WU-02 K8S or WU-03 NVLINK scope** (parallel clusters; this Architect does not pre-empt their scope decisions).
- **NO new vendored-with-deltas transitions** unless Architect identifies one as load-bearing for Slurm parsing (then apply two-step maintenance pattern UPFRONT in spec component inventory).

## Reinforcements in scope (apply during cluster work)

**Cross-project (CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived"):**

- **NEW (R26-derived; threshold-crossed at Wave 1 gate):** `false-compliance-attestation` sub-class of halt-discipline. When a binding-command's actual exit code or output contradicts an AC's literal text (e.g., `npx tsc -p tsconfig.test.json` exits 2 when AC requires "exit 0"), the Implementer MUST HALT with a DIAGNOSTIC. Reframing the result as compliance (e.g., reclassifying errors as warnings, citing pre-existing infra) is itself a halt-discipline violation. **WU-01 Implementer attestation MUST encode actual exit code + actual pass/fail counts; do NOT reframe as compliance.**
- Line-citation-drift rule (R21 MINOR-4): every NEXT-ROLE.md attestation cites exact `test()` declaration line numbers via grep-verification.
- Architect spec-commit-sequencing (R21 ARCH MINOR-1): Q-R28-SPEC.md + Q-R28-SPEC-AUDIT.md committed BEFORE chore-A.
- AC-table preamble cross-check (R20 ARCH MINOR-1): § 5 AC-table classification claims must match § 4.x prescription claims.
- Count-AC chore-A SHA anchoring (R22 IMPL MINOR-1): explicitly anchored to chore-A SHA.
- Branch-binding coverage gate (R21 ARCH+IMPL MINOR-2/3): every guard / short-circuit has an AC that structurally exercises it.
- TDD separate-RED-commit (R23 IMPL MINOR-1).
- `.gitignore`-aware spec inventories (R23 ARCH MINOR-2).
- **NEW (R25-derived; first VIOLATION at Wave 1 gate; threshold 3 for derived rule):** `coordinator-applied-disposition-spec-amendment-omission` — when ESCALATE Option A dispositions are applied, the spec sections that the disposition changes must also be amended, not just the test/code. **WU-01 Architect: if any ESCALATE fires and Option A applies, spec amendment landed in same chain.**

**Cluster-worktree pre-flags from WAVE-GATE-01 § Pre-flags:**

- **Baseline test count at session entry:** expected `tests=230 / pass=229 / fail=1` (q01 AC-7 ENOENT environmental — `../deploysignal` sibling unavailable from cluster worktree). Architect MUST run `node --test test/*.test.js` empirically at session start and encode the ACTUAL baseline + the q01 ENOENT acknowledgment into the spec (per R25 MAJOR-1 lesson: do NOT cite cross-round attestations).
- **`tsc` exit code reality:** expected `npx tsc -p tsconfig.test.json` exits 2 (TS5107 moduleResolution + TS2688 `@types/node` — pre-existing infra). Architect MUST encode actual exit code. The substantive "no NEW typecheck regressions introduced by R28" is the load-bearing property; literal AC wording must accommodate the environment, not be silently reframed.
- **L0 contract surface stable:** `engine/l0/counter-rate-transform.ts` is the canonical L0 entry point per CLUSTER-HANDOFF-1-WU00-WU01. Adapter knows-of-but-typically-does-not-call.
- **R25 MINOR-3 advisory close (gauge + missed_scrape combination):** if any Slurm metadata field gets passed through `transformPair` as a gauge with a missed-scrape-shaped interval, opportunistic AC closes the gap. Not required.

## Cluster context

**Wave 2 of 5 (parallel to WU-02 K8S + WU-03 NVLINK).** Zero D-edges with WU-02/03 per WAVE-PLAN-02 Step 2 pairwise check (parallel-class architecture). Wave 2 cluster setup runs all three adapters concurrently.

**Downstream dependencies on this cluster's output:**

- WU-05 SLICE 3 close-walk (D1 HIGH — close-walk reads `engine/topology/slurm-source.ts` + Reviewer report)

**Wave 2 gate criteria** (Coordinator runs after all 3 Wave 2 clusters complete):

- Reviewer report MERGE-READY
- 0 CRITICAL findings
- Slurm parser handles canonical + sparse `topology.conf` fixtures correctly
- Anti-scope diff ⊆ allowed-set (parallel-class architecture preserved; no inherited engine modifications)
- TopologySource interface conformance verified

## Halt conditions for this cluster (escalate to Coordinator)

1. **Slurm topology.conf parsing requires modifying inherited `engine/topology-overlay.ts` BFS body** — A12 implication; route back via Coordinator.
2. **Slurm format requires new `TopologyNode.kind` literal beyond R18+R23 enums** — vendored-with-deltas transition for `engine/types/verdict.ts`; apply two-step maintenance UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern; if scope exceeds standard pattern, ESCALATE.
3. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per cross-project halt-discipline rule (R26-derived sub-class). DO NOT reframe as compliance.

## Round

`R28` (Wave 2, cluster 1 of 3).

## Branch

`cluster/wu-01-slurm-adapter-R28` (auto-created by `scripts/multi-track-cluster-setup.sh`).


_PRD scope block for cluster `wu-00-l0-contract`, planted into the worktree's `coordination/PRD.md` by `scripts/multi-track-cluster-setup.sh --scope`. Cluster's Architect reads this + the full `coordination/SCOPING-MEMO-v0.3.md` MR-1 amendment block as primary inputs. AC enumeration is the Architect's job per role boundary — the Coordinator does not pre-enumerate ACs._

## Tier verdict

**`full`** (Architect + Implementer + Reviewer + Memorial-Updater per cluster).

Justification: A1 (new dependency on counter-semantic metadata flow from `SchemaDescriptor.semantic_type`) + A2 (first L0 contract surface in Tessera's tree; novel architectural pattern) + A4 (novel data model — `slope_quality` / `missed_scrape_inferred` / `wraparound_handled` / `reset_detected` metadata propagation alongside rate values).

## PRD source

- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) "L0 contract for Tessera" sub-extension (MR-1 amendment, lines ~219-228)
- `coordination/SCOPING-MEMO-v0.3.md` § 3 Q-cycle row "Phase 2 SLICE 3.A.5 — L0 contract"
- `coordination/SCOPING-MEMO-v0.3.md` § 4.2 R-E7 risk row (the failure modes this WU addresses)
- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 A10 [MR-1 AMENDMENT] block (the anti-scope carve-out authorizing this WU)

## Scope

Define and implement the **L0 contract** for Tessera's ingestion layer: the explicit guarantees that L0 makes to downstream consumers (`TrendBuffer` at `engine/core.ts:27-100`; per-shard detector cascade; fleet-merge consumer at `engine/fleet/verdict-consumer.ts`) about every value pushed through L0.

The contract framing means downstream consumers (including the vendored-at-pin `TrendBuffer`) remain unmodified — they build against the L0 contract by interface, not against L0 internals.

**Six proposed invariants** (full enumeration in SCOPING-MEMO § 2.3 Extension 3 (b) "L0 contract for Tessera" sub-extension; cluster Architect spec'ies exact wording):

1. **Rate-domain output, not counter-domain.** Every value pushed downstream is a rate (units per second) computed over actual elapsed scrape interval. When `SchemaDescriptor.semantic_type === 'counter'`, L0 computes `delta / actual_elapsed_seconds` per scrape-pair; raw cumulative counters never reach downstream. Gauge / ratio / latency_quantile / categorical_rate pass through value-domain unchanged.
2. **Scrape interval is a first-class input.** Each downstream value carries an `actual_elapsed_seconds` field computed per-pair from sample timestamps. Comparable `slopeNorm` across configurable / variable scrape intervals follows from per-second-normalized inputs.
3. **Missed-scrape-then-catchup detection.** When `actual_elapsed_seconds > expected_scrape_interval × (1 + jitter_tolerance)`, emit the rate with `slope_quality: degraded` AND `missed_scrape_inferred: true`. Interpolation explicitly rejected (creates false structure that survives the degraded flag).
4. **DCGM 32-bit counter wraparound handling.** When `next < prev` AND `prev > UINT32_MAX × 0.9`, classify as wraparound; emit rate via `(width_max - prev + next) / actual_elapsed_seconds`. Counter-width awareness via `SchemaDescriptor` metadata. (NVLink error counters are the primary 32-bit-wrap exemplar.)
5. **Reset-vs-wrap disambiguation.** When `next < prev` AND wraparound-threshold not met, classify as counter reset (process restart); emit null + signal continuity-break to L0 schema-continuity layer per existing `breaking` classification.
6. **L0 metadata propagation.** `slope_quality`, `missed_scrape_inferred`, `wraparound_handled`, `reset_detected` flags propagate alongside the rate value so downstream detector audits can attribute firings or non-firings to L0 preprocessing decisions.

**File location** (per operator answer to OQ-W2-1, Option A — `2026-05-18`):

- **Primary module:** `engine/l0/counter-rate-transform.ts` (Tessera-original; matches existing `engine/l0/schema-continuity.ts` neighbor convention).

**Empirical validation in scope** (per the SCOPING-MEMO § 4.2 R-E7 row): synthetic counter generator exercising the missed-scrape, wrap, reset, and variable-interval cases. Lands as `test/_substrate/synthetic-counter-generator.ts` (Tessera-original) + comprehensive AC suite.

## Acceptance criteria

**AC enumeration is the Architect's job** (per role boundary; the Coordinator does not pre-enumerate ACs). The Architect should enumerate ACs covering:

- Per-invariant runtime ACs (one or more ACs binding each of the 6 invariants above)
- Synthetic-counter-generator ACs (substrate works as designed)
- Empirical validation ACs: missed-scrape-catchup case; 32-bit wrap case; reset-vs-wrap disambiguation; variable-interval comparable slopeNorm
- Integration AC: feeding L0 output into vendored TrendBuffer produces expected slope/slopeNorm semantics
- Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A)
- Typecheck + test count ACs (per R22 IMPL MINOR-1 reinforcement; anchored to chore-A SHA)

Target AC count: 10-15 (matches R20 / R21 / R23 precedent for full-tier Tessera rounds).

## Anti-scope

- **A10 — NO hardware *diagnosis*.** The MR-1 amendment carved out L0 measurement-domain preprocessing as in-scope. Hardware diagnosis (DCGM signal *generation*; per-GPU SDC attribution; NVIDIA-stack tooling) remains fenced.
- **A12 — NO modification of inherited vendored-at-pin engine internals.** `engine/core.ts` TrendBuffer body frozen; `engine/l0/schema-continuity.ts` body frozen (READ-ONLY consumer of `SchemaDescriptor.semantic_type` at line 44); no other engine/* modification beyond the new Tessera-original file at `engine/l0/counter-rate-transform.ts`.
- **A11 — NO live DCGM/NVML endpoints.** Synthetic counter generator only. Real-cluster integration is TAGGED-FUTURE per SCOPING-MEMO § 4.2 R-E3.
- **A16 — Addition #26 D4 `correlational_not_causal: true` preserved** (L0 contract operates upstream of attribution; does not touch the wire-format invariant).
- **NO modification of `engine/verdict-groups.ts`** (R20 frozen).
- **NO modification of `engine/fleet/verdict-consumer.ts`** (R21 frozen).
- **NO modification of `engine/hardware-topology-source.ts`** (R23 frozen).
- **NO modification of `test/_substrate/v9X-cluster.ts` or `test/_substrate/v9Y-multi-rack-cluster.ts`** (R18 + R23 frozen).
- **NO modification of any pre-R25 test file** (existing q-* test suite frozen).
- **NO drafting of WU-01/02/03 adapter ACs** (Wave 2 cluster Architects' job).
- **NO interpolation of missed-scrape values** (creates false structure; explicitly rejected per SCOPING-MEMO § 2.3 invariant 3).

## Reinforcements in scope (apply during cluster work)

**Cross-project (CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived"):**
- Line-citation-drift rule (R21 MINOR-4 derived; threshold crossed): every NEXT-ROLE.md attestation cites exact `test()` declaration line numbers via grep-verification (cite-then-verify; not from memory).
- Architect spec-commit-sequencing (R21 ARCH MINOR-1): Q-R25-SPEC.md + Q-R25-SPEC-AUDIT.md committed in own commit BEFORE chore-A.
- AC-table preamble cross-check (R20 ARCH MINOR-1): § 5 AC-table preamble classification claims must match § 4.x prescription claims.
- Count-AC chore-A SHA anchoring (R22 IMPL MINOR-1): test-count AC explicitly anchored to chore-A SHA, not "after R25 implementation commits".
- Branch-binding coverage gate (R21 ARCH+IMPL MINOR-2/3): every guard / short-circuit in production code must have an AC that structurally exercises it (test fails when guard removed).
- TDD separate-RED-commit (R23 IMPL MINOR-1): RED commit prefix required before combined test+impl commit.
- `.gitignore`-aware spec inventories (R23 ARCH MINOR-2 derived): verify spec commit-inventory / allowed-set paths via `git ls-files` to confirm git-trackability before routing.

**Tessera-local (CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER}.md REINFORCEMENTS):**
- All applicable to this cluster; the Architect's pre-route grilling should sweep these per existing protocol.

**Coordinator-level (this cluster operates inside a multi-cluster wave; new disciplines):**
- Cluster's MEMORIAL-fragment.md lands at `coordination/clusters/wu-00-l0-contract/MEMORIAL-fragment.md` (per CLAUDE-COORDINATOR.md § Memorial state). The Coordinator aggregates fragments at wave gate.

## Cluster context (where this WU sits)

**Wave 1 of 5 (parallel to WU-04 MD-F4).** This cluster is the SLICE 3.B foundation: WU-01 (Slurm) / WU-02 (K8s) / WU-03 (NVLink) adapters in Wave 2 consume this WU's L0-contract surface by interface. WU-03 NVLINK is the **exemplary L0-contract consumer** because NVLink error counters exemplify the 32-bit wraparound path; WU-03's tests must exercise this WU's wraparound / missed-scrape / variable-interval paths against the synthetic counter generator.

**Downstream dependencies on this cluster's output:**
- WU-01 SLURM (D2 MEDIUM — interface contract reference)
- WU-02 K8S (D2 MEDIUM — interface contract reference)
- WU-03 NVLINK (D1 HIGH — direct import + exercise of transformation surface)
- WU-05 SLICE 3 close-walk (D1 HIGH — reads this WU's file + Reviewer report; stamps R-E7 mitigation status)

**Wave gate criteria** (Coordinator runs at Wave 1 close, per WAVE-PLAN-02 § Wave gate discipline):
- Reviewer report MERGE-READY
- 0 CRITICAL findings
- L0 contract file exists at agreed location with all 6 invariants implemented
- Synthetic counter generator substrate exists + exercises all 4 failure-mode cases
- Wave 2 cluster handoff artifact (`CLUSTER-HANDOFF-1-WU00-WU01.md`, `-WU02.md`, `-WU03.md`) draftable from this cluster's Reviewer report's verified interface

## Halt conditions for this cluster (escalate to Coordinator)

1. The L0 contract surface cannot be defined without modifying inherited engine internals (e.g., `TrendBuffer` must gain elapsed-seconds awareness in its body) — A12 violation; route back via Coordinator for cross-cluster decision.
2. The synthetic counter generator substrate cannot exercise one of the 4 failure modes without ingestion-adapter-side support (which is Wave 2 scope) — route back; may need Coordinator re-decomposition.
3. The L0 contract surface needs to also cover gauge/ratio/latency_quantile/categorical_rate transformation policies beyond pass-through — that's scope expansion; route back rather than absorb silently.

## Round

`R25` (Wave 1, cluster 1 of 2). Cluster pipeline runs internally as R25 in this cluster's worktree.

## Branch

`cluster/wu-00-l0-contract-R25` (auto-created by `scripts/multi-track-cluster-setup.sh`).


# Cluster scope — WU-04 MD-F4 + PR-F6 (Wave 1 / R26)

_PRD scope block for cluster `wu-04-md-f4-common-mode`, planted into the worktree's `coordination/PRD.md` by `scripts/multi-track-cluster-setup.sh --scope`. Cluster's Architect reads this + the full `coordination/SCOPING-MEMO-v0.3.md` § 2.3 + § 3 SLICE 3.C row + § 4.2 R-S* rows as primary inputs. AC enumeration is the Architect's job per role boundary._

## Tier verdict

**`full`** (Architect + Implementer + Reviewer + Memorial-Updater per cluster).

Justification: A2 (new architectural pattern — first BFS-on-undirected attribution layer in Tessera's tree) + A4 (novel attribution data model — common-mode candidates surfaced from topology BFS) + A6 (blast-radius on consumers of `engine/topology-overlay.ts` BFS path).

PR-F6 hybrid Reviewer pair-review mandated at SLICE 3 close per SCOPING-MEMO § 2.3 (PR-F6 trigger condition) + close-walk § 3 line 165. This cluster ships the empirical evidence that PR-F6 evaluates.

## PRD source

- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) "MD-F4" reference (topology-aware spatial attribution; BFS-on-undirected; rack-localized PSU event simulation)
- `coordination/SCOPING-MEMO-v0.3.md` § 3 Q-cycle row "Phase 2 SLICE 3.C" (1 cycle; hybrid Reviewer at SLICE 3 close)
- `coordination/SCOPING-MEMO-v0.3.md` § 4.2 R-S* rows (common-mode failure-injection risk surfaces)
- `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md` § 3 SLICE 3 entry framing (PR-F6 trigger; v9Y substrate)

## Scope

Implement the **topology-aware spatial attribution layer (MD-F4)** consuming the R23 v9Y multi-rack cluster fixture. Common-mode failure-injection empirical test: rack-localized PSU event simulation on v9Y; assertion that the attribution layer surfaces "shards X, Y, Z share PSU P that experienced event E" as a single common-mode candidate rather than as N independent per-shard alerts.

**Architecturally novel surfaces:**

1. **BFS-on-undirected attribution.** Extends the inherited `engine/topology-overlay.ts:257+` BFS algorithm — which already treats edges as bidirectional in the topology-overlay code (per Q-R23-SPEC verification) — to surface common-mode candidates: for each fired per-shard verdict, walk the topology graph to find correlated peer verdicts within a topology-distance threshold.
2. **Common-mode candidate aggregation.** Group correlated per-shard verdicts into common-mode candidates keyed by the shared topology node (PSU / rack / cooling_zone) and the event-distance metric.
3. **`correlational_not_causal: true` preservation.** Inherited Addition #26 D4 wire-format invariant: every emitted common-mode candidate carries the `correlational_not_causal: true` label per `engine/types/verdict.ts:240`. Must be exercised by AC at the wire boundary.
4. **PR-F6 hybrid Reviewer evidence package.** 4-cell evidence matrix per SCOPING-MEMO § 2.3 PR-F6 trigger:
   - Cell (1): test-only PSU event injected → attribution surfaces correctly (positive sensitivity)
   - Cell (2): no event injected → attribution does NOT surface false common-mode (positive specificity)
   - Cell (3): non-PSU per-shard event injected → attribution correctly does NOT surface as PSU-attributed (negative specificity)
   - Cell (4): PSU event + concurrent unrelated per-shard event → attribution surfaces PSU-attributed correctly, ignores unrelated event (mixed-signal robustness)
5. **External literature citation evidence package** (PR-F6 requirement): Meta H100 SDC papers + MS/Google SDC postmortems cited at architect time per SCOPING-MEMO § 2.3 PR-F6 trigger.

**File location** (Tessera-original; no operator OQ needed at this WU):
- **Primary module:** `engine/topology/common-mode-attribution.ts` (Tessera-original; subdirectory mirrors anticipated future topology-related files).
- **Test:** `test/q-md-f4-common-mode-injection.test.ts`.
- **Substrate:** uses inherited `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen — extends but does NOT modify; if WU-04 needs different fixture geometry, ESCALATE rather than modify v9Y).

## Acceptance criteria

**AC enumeration is the Architect's job.** The Architect should enumerate ACs covering:

- Per-cell PR-F6 evidence ACs (4 separate ACs, one per cell above)
- BFS-on-undirected ACs: walk produces correct topology-distance-ordered candidate set
- Common-mode candidate aggregation ACs: shards sharing PSU are grouped under one candidate; shards in different racks are NOT grouped (cross-rack false positive guard)
- `correlational_not_causal: true` wire-format AC (literal-match against emitted candidate JSON)
- Sparse-topology degradation AC (LS-4 carry-forward from PHASE-2-SLICE-2-CLOSE-WALK § 3): when v9Y has rack-only data (no PSU edges), BFS degrades gracefully (no throw; subset attribution; null/empty fallback)
- Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A)
- Typecheck + test count ACs (per R22 IMPL MINOR-1; anchored to chore-A SHA)

Target AC count: 12-16 (slightly more than WU-00 because of PR-F6 4-cell matrix expanding the AC surface).

## Anti-scope

- **A12/A5 — NO modification of per-shard detector internals.** Common-mode attribution operates DOWNSTREAM of per-shard verdicts; consumes them as input; does not alter detector logic.
- **A12 — NO modification of `engine/topology-overlay.ts` body** beyond architecturally-anchored extension points. If BFS body modification proves load-bearing for MD-F4, ESCALATE (route back via Coordinator). Per Q-R23-SPEC § 0.5 Approach A precedent — R23 anti-scope prohibited BFS body modification.
- **A13 — NO ML-based attribution model.** Rule-based + statistical only (conflicts with inherited calibrated-confidence honest-broker stance per NORTH-STAR Addition #11).
- **A16 — Addition #26 D4 preserved.** `correlational_not_causal: true` literal label is mandatory on every emitted candidate; AC must exercise this at the wire boundary.
- **NO modification of `test/_substrate/v9Y-multi-rack-cluster.ts`** (R23 frozen).
- **NO modification of `engine/verdict-groups.ts`** (R20 frozen).
- **NO modification of `engine/fleet/verdict-consumer.ts`** (R21 frozen).
- **NO modification of `engine/hardware-topology-source.ts`** (R23 frozen — reads its type contract; does not modify).
- **NO dependency on WU-00 L0-contract surface.** This WU operates on the v9Y synthetic substrate which is value-domain by construction (per Q-R23-SPEC § 2.4 enumeration: nodes + edges only, no metric values flowing through). The fixture pre-supposes correct upstream metric handling; the cluster does not test counter ingestion.
- **NO drafting of SLICE 4 event-conditional attribution** (WU-06 scope; that requires deployment-event-feed ingestion which is SLICE 4 — out of scope here).

## Reinforcements in scope (apply during cluster work)

Same set as WU-00 cluster — cross-project rules + Tessera-local CLAUDE-*.md REINFORCEMENTS + Coordinator-level cluster-fragment discipline.

**Additionally for this cluster:**
- **PR-F6 evidence-package mandate** per SCOPING-MEMO § 2.3 + § 3 SLICE 3.C row: this cluster PRODUCES the 4-cell PR-F6 evidence matrix + external literature citation package + sparse-topology degradation evidence. The PR-F6 **hybrid Reviewer audit** itself fires at **SLICE 3 close** (WU-05), not at this cluster — per SCOPING-MEMO § 3 SLICE 3.C row final sentence "**Hybrid Reviewer pair-review-style at SLICE 3 close.**" This cluster runs standard full-tier Reviewer (Opus); the hybrid pass at WU-05 close-walk re-audits this cluster's evidence package + WU-00's L0-contract surface as the consolidated SLICE 3 deliverable. (Hybrid Reviewer is implemented at `run-pipeline.sh:1079-1115` `dispatch_hybrid_reviewer`; canonically fires at audit-tier rounds — WU-05 close-walk is audit-tier per WAVE-PLAN-02 Step 6.)
- **External literature citation discipline:** every external citation (Meta H100 SDC; MS/Google postmortems) must include URL + retrieval date + verbatim quote (architect-side responsibility; reviewer audits). The hybrid Reviewer at WU-05 re-validates citation evidence under both Opus + Sonnet readings.

## Cluster context (where this WU sits)

**Wave 1 of 5 (parallel to WU-00 L0-contract).** Coordinator placed this WU in Wave 1 (rather than Wave 2 with adapters) because v9Y substrate is value-domain by construction — no L0-contract dependency. Lands PR-F6 evidence in parallel with the L0-contract work, preserving operator fan-out preference.

**Downstream dependencies on this cluster's output:**
- WU-05 SLICE 3 close-walk (D1 HIGH — reads `engine/topology/common-mode-attribution.ts` + PR-F6 hybrid Reviewer evidence package; stamps as SLICE-3 deliverable).
- No other Wave-2+ WU depends on this WU directly.

**Wave gate criteria** (Coordinator runs at Wave 1 close):
- Reviewer report (standard full-tier Reviewer at this cluster — Opus) MERGE-READY
- 0 CRITICAL findings
- All 4 PR-F6 cells PASS (evidence package complete; hybrid Reviewer audit deferred to WU-05 SLICE 3 close-walk per SCOPING-MEMO § 3 SLICE 3.C row)
- `correlational_not_causal: true` wire-format invariant preserved (asserted at wire boundary)
- External literature citation evidence package complete (URLs + retrieval dates + verbatim quotes; re-audited at WU-05 hybrid Reviewer pass)
- LS-4 sparse-topology degradation handled gracefully (or ESCALATED with bounded question if BFS body modification proves load-bearing)

## Halt conditions for this cluster (escalate to Coordinator)

1. **BFS body modification proves load-bearing for MD-F4** — LS-4 forward-looking case. ESCALATE rather than absorb; this would be a vendored-with-deltas transition for `engine/topology-overlay.ts` with high blast radius (A12 implication).
2. **PR-F6 evidence cells reveal a structural false-positive surface in BFS-on-undirected attribution** — if the attribution layer surfaces false common-mode candidates that cannot be eliminated by AC tuning, route back to Coordinator with the failure-mode characterization.
3. **External literature for PR-F6 cannot be found or is insufficient** — if Meta H100 SDC + MS/Google postmortems do not provide the corroborating evidence the architect needs, surface as OQ rather than weakening the PR-F6 standard.

## Round

`R26` (Wave 1, cluster 2 of 2). Cluster pipeline runs internally as R26 in this cluster's worktree.

## Branch

`cluster/wu-04-md-f4-common-mode-R26` (auto-created by `scripts/multi-track-cluster-setup.sh`).

## Project goal

Tessera is a statistically-rigorous behavioral observation system for AI training/inference clusters. It detects deviations in per-shard and cluster-wide behavior at the per-shard level, surfacing issues before they cause impact. Reuses DeploySignal's statistical detector engine (Family A/C/D/E detectors, Ville-bounded e-process, hierarchical pooling) via **vendor-first sharing** (engine code copied into Tessera tree with per-file SHA pins at SHA `5a72371`); the shared subset extracts to a separate npm package at Tessera Phase 2 close.

Full project framing: see [`SCOPING-MEMO-v0.3.md`](./SCOPING-MEMO-v0.3.md) § 1 + § 1.5 (memo structure options) + § 2 (per-extension scope) + § 9 (engine vendoring policy).

## Users / personas

- **Cluster oncall** — receives real-time per-shard attribution alerts (alarm path).
- **AI infrastructure operator** — consumes post-hoc audit + topology-aware attribution (audit path).
- **Tessera architect** (John) — makes strategic Q-J architectural-decision picks; gates Q-cycle activation.

## User stories

US-01: As a cluster oncall, I want per-shard fault attribution that distinguishes "shard 47 has a bad accelerator" from "all shards drift because of a fleet event" so that I can route to the right remediation (hardware swap vs deploy rollback vs config rollback) without triaging N independent alerts.

US-02: As an AI infrastructure operator, I want topology-aware common-mode failure attribution (rack-localized PSU events; cooling-zone failures; NVLink-peer correlation) so that physical-substrate failures surface at the topology level rather than via shard-by-shard inspection.

US-03: As an AI infrastructure operator, I want event-conditional correlational attribution — drift correlated with a fleet-level deploy/firmware/config event — so that I can distinguish event-conditional drift from coincidental concurrent drift (preserving correlational-not-causal labeling per inherited Addition #26 D4).

US-04: As Tessera architect, I want a statistically-rigorous fleet-FPR guarantee (hybrid per-shard any-time Ville + fleet-level FDR via e-BH) so that Tessera's pitch claim of "statistically-rigorous fleet detector" is load-bearing against the alternative "N copies of a detector with broken FPR."

## Functional requirements (per-extension; full detail in SCOPING-MEMO-v0.3.md § 2)

| ID | Requirement | Traces to | Phase |
|---|---|---|---|
| FR-E1 | α budget arithmetic at fleet scale — hierarchical e-value combination + e-BH FDR operator surface | US-04 | Phase 1 |
| FR-E2 | Per-shard baseline calibration — hierarchical baseline (fleet prior + per-shard residual) extending Addition #2 | US-01 | Phase 1 |
| FR-E3a | Cross-shard correlation: outer aggregator (extends Addition #25 VerdictGroup scope from `(deploy_id, …)` to `(cluster_event_id, …)`) | US-01 | Phase 2 |
| FR-E3b | Cross-shard correlation: topology-aware spatial attribution (HardwareTopologySource impl against Addition #26 TopologySource interface) | US-02 | Phase 2 |
| FR-E3c | Cross-shard correlation: event-conditional correlational attribution (preserves Addition #26 D4 wire-format) | US-03 | Phase 2 |

## Acceptance criteria

Per-extension ACs at the spec level (not at PRD level — Tessera's per-phase specs in `coordination/specs/Q-RNN-SPEC.md` enumerate ACs exhaustively per anchor `templates/Q-NN-SPEC-TEMPLATE.md`). PRD-level acceptance is **Phase-close** acceptance:

| ID | Given / When / Then | Traces to |
|---|---|---|
| AC-P1 | Given a fleet of N=100-10000 shards under healthy traffic, when Tessera Phase 1 detector cascade runs, then per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH); empirical validation via PR-F1 + PR-F2 pair-review tests at Phase 1 SLICE 3-4. | FR-E1 |
| AC-P2 | Given freshly-provisioned shards, when their per-shard baseline cold-starts, then warm-start `cell_confidence` enables alerts within 20 per-shard samples (PR-F4 pair-review-derived threshold); strict-upgrade at 60 samples preserves inherited single-instance behavior. | FR-E2 |
| AC-P3 | Given fleet-level event (firmware push / deploy / config change), when Extension 2 freeze-hook is enabled (Phase 2 activation), then per-shard baselines do not absorb the event-driven drift into per-shard residual during the post-event window. | FR-E2 (with Phase 2 dependency) |
| AC-P4 | Given cluster topology + deployment-event feed inputs, when Tessera Phase 2 outer aggregator runs, then per-shard verdict attribution distinguishes (i) single-shard fault / (ii) topology-localized common-mode / (iii) fleet-level event-conditional drift; output preserves Addition #26 D4 `correlational_not_causal: true` wire-format constraint. | FR-E3a/b/c |

## Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Inherited per-tick latency baseline preserved at fleet scale: median 30 μs / p99 63 μs / max 194 μs per per-shard instance (per `deploysignal/runs/benchmarks/tick-latency-baseline.json` @ SHA `5a72371`); at N=1000 shards fleet-tick CPU budget ~30 ms total. Architect-pre-prediction: storage 1.2-1.5× single-instance footprint via sparse per-shard residual (PR-F5 empirical-validation at Phase 1 SLICE 2). **[R17 AMENDMENT: prediction empirically refuted — R14 PR-F5 measured 1237.7× at N=1000; ratio ≈ N; operator disposition (β) pitch-revise confirmed 2026-05-17. See `SCOPING-MEMO-v0.3.md` §§ 1.7, 1.8, 2.2, 4.2.]** |
| Security | Inherited enterprise-infrastructure boundary preserved (no real customer cluster telemetry; synthetic-cluster substrate only at Phase 1 + 2). |
| Reliability | Inherited Ville-bounded statistical guarantees preserved per Phase-3.d.D close (DeploySignal main @ SHA `5a72371` LEDGER:176/179 + PRESERVED-PERMANENT-POST-PHASE-D). |
| Compatibility | Engine vendored at SHA `5a72371`; re-pin policy at every Tessera close-walk; extract-to-npm-package commitment at Phase 2 close. |

## Anti-scope

Full A1-A17 enumeration in SCOPING-MEMO-v0.3.md § 2.1 / § 2.2 / § 2.3. Headline:

- A8/A11: NO real customer cluster telemetry (enterprise-infrastructure boundary inherited).
- A10: NO hardware-diagnostic territory (DCGM / NVML / per-GPU faults are NVIDIA-stack scope).
- A12/A5: NO modification to vendored detector internals (Phase-3.d.D inherited closure).
- A13: NO ML-based attribution model (conflicts with inherited honest-broker stance).
- A15: NO multi-region / cross-cluster federation (intra-cluster scope only).
- A16: NO Addition #26 D4 reversal (correlational-not-causal wire-format preserved).
- A17: NO DeploySignal-integration scope at Phase 1 + 2 (decoupled-for-now; Phase 3+ commitment).

## Success metrics

- Phase 1 SLICE 1 close: 10 ACs binary-met-or-not; spec at `coordination/specs/Q-R01-SPEC.md`.
- Phase 1 close: 5 SLICEs aggregated; α-budget formal-property regression evidence; PR-F1 + PR-F2 pair-review evidence matrices.
- Phase 2 close: HardwareTopologySource concrete impl; event-feed ingestion; PR-F6 + PR-F7 pair-review evidence matrices; Addition #26 D4 RECONFIRMED.
- Project close: Tessera v1 published to GitHub (`github.com/johnpatrickwarren-oss/tessera`); engine extracted to shared npm package (vendor-first commitment realized).

---

## Phase 3 Scope (added 2026-05-19 per operator-led PRD authoring; post-R51 close)

Phase 3 extends Tessera from Phase 2's synthetic-substrate completeness toward vendor-fungible deployment + real-cluster validation. Per operator answers to OQ-P3-1 through OQ-P3-6 (recorded in `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 6):

- **Vendor sequencing** (OQ-P3-1): AWS Trainium / Neuron Link FIRST — publicly-available Neuron SDK documentation + EC2 metadata + topology samples are materially better than Google TPU ICI public data. Google TPU adapter follows once the Trainium parallel-class pattern is proven.
- **Real-cluster validation environment** (OQ-P3-3): operator does not own a GPU cluster. **Real-cluster access is CONDITIONAL, not mandatory** — Phase 3 SLICE 1's substantive deliverables (vendor adapters against synthetic fixtures) proceed without any cluster access. A gating moment between SLICE 1 close and SLICE 2 dispatch evaluates whether to rent GPU instances for the live-DCGM L0 contract validation; if rental is declined, the corresponding ACs (AC-P6; live-cluster-fetch validation) become DEFERRED rather than blocking Phase 3 progress.
- **DeploySignal integration sequencing** (OQ-P3-4): SLICE 3 (sequential after SLICE 2 close). No fallback path needed — DS integration is decoupled from real-cluster-rental success.
- **Methodology + production parallel** (OQ-P3-6): no separate methodology-stabilization chain. Methodology updates fold into Phase 3 SLICE rounds when production work surfaces a gap.

### Phase 3 user stories

US-05: As an AWS-stack AI infrastructure operator, I want per-shard observation on Trainium / Inferentia chip arrays (Neuron Link topology) so that Tessera coverage extends to AWS-native silicon without requiring NVIDIA-specific topology assumptions.

US-06: As a Google-stack AI infrastructure operator (post-AWS), I want per-shard observation on TPU pods (ICI topology) so that Tessera coverage extends to Google Cloud TPU workloads. (Sequenced after US-05 per vendor-sequencing decision.)

US-07 (CONDITIONAL — operator-gated at SLICE 1/2 boundary): As Tessera architect (John), I want optional real-cluster DCGM validation via rented GPU instances (vast.ai / Lambda Labs / RunPod or equivalent) so that Tessera's L0 contract invariants (missed-scrape catchup; 32-bit wraparound; reset-vs-wrap distinction) can be validated against live DCGM scrapes when budget + value justify, without committing to enterprise GPU cluster ownership. If operator declines rental at the SLICE 1/2 gating moment, US-07 is DEFERRED (not blocking; the Trainium / Inferentia / TPU adapters all ship against synthetic fixtures from public-docs sources independently of US-07).

US-08 (sequenced; Phase 3 SLICE 3+): As a DeploySignal operator, I want bi-directional integration (Tessera per-shard observations → DS correlation layer; DS event feed → Tessera freeze-hook) so that fleet event-conditional attribution loops close against real deploy events rather than synthetic VerdictGroups.

### Phase 3 functional requirements

| ID | Requirement | Traces to | SLICE |
|---|---|---|---|
| FR-V1a | AWS Trainium / Neuron Link adapter — `engine/topology/trainium-source.ts` parses Neuron SDK topology output + emits `TopologySnapshot`; synthetic fixtures from Neuron SDK + AWS docs | US-05 | SLICE 1 |
| FR-V1b | AWS Inferentia adapter — bundles with Trainium if Neuron Link topology is shared across both chip families; OR independent module if Inferentia topology differs | US-05 | SLICE 1 |
| FR-V2 | Google TPU / ICI adapter — `engine/topology/tpu-source.ts` parses TPU pod topology; synthetic fixtures from JAX topology code + TPU v4/v5 papers | US-06 | SLICE 2 |
| FR-V3 (CONDITIONAL) | Real-cluster DCGM validation scaffolding — rental-provider scripts (vast.ai / Lambda Labs / RunPod or equivalent); DCGM smoke test against L0 contract invariants. Gated on operator decision at SLICE 1/2 boundary; deferred if operator declines rental | US-07 | SLICE 2 (conditional) |
| FR-V4 | Live cluster topology fetch — `TopologySource.fetchSnapshot(ctx)` interface design + sparse-data tests for Slurm / K8s / NVLink / Trainium / TPU adapters. Interface-design and sparse-data resilience are unconditional; real-cluster-validation of the fetch behavior is gated on US-07 | US-07 (validation portion) | SLICE 2 (interface); SLICE 2C (validation, conditional) |
| FR-D1 | DeploySignal npm engine extract — `@johnpatrickwarren-oss/deploysignal-engine` package; both Tessera + DS consume same package version (eliminates vendoring drift R-E6) | (project-close commitment) | SLICE 3 |
| FR-D2 | DS-integration: Tessera → DS — per-shard observations feed DS correlation layer (VerdictGroup → deploy-event context) | US-08 | SLICE 3 |
| FR-D3 | DS-integration: DS → Tessera — DS event feed gates the Phase 2 freeze-hook against real deploy events (replaces synthetic VerdictGroups in event-conditional attribution) | US-08 | SLICE 3 |

### Phase 3 acceptance criteria

| ID | Given / When / Then | Traces to |
|---|---|---|
| AC-P5 | Given an AWS Trainium synthetic topology fixture (constructed from public Neuron SDK + AWS docs), when `engine/topology/trainium-source.ts` runs, then `TopologySnapshot` produced is consumable by inherited `engine/topology-overlay.ts` BFS layer with `neuron_link_peer` edge relationship literal + `trainium_chip` node kind literal. | FR-V1a |
| AC-P6 (CONDITIONAL on US-07 activation) | Given a rented GPU instance (vast.ai OR Lambda Labs OR RunPod OR equivalent operator-controlled rental, multi-GPU node, DCGM accessible), when L0 contract smoke test runs against live DCGM scrapes, then missed-scrape catchup + 32-bit wraparound + reset-vs-wrap-distinction invariants hold against real-hardware counter behavior (validated empirically; ≥1 successful validation pass). If operator declined rental at SLICE 1/2 gating moment, AC-P6 is DEFERRED — not failing, not blocking Phase 3 close. | FR-V3 |
| AC-P7 | Given Phase 3 SLICE 1 close, when full Tessera fleet runs in synthetic-substrate mode WITH the AWS Trainium adapter activated for a synthetic AWS Trainium fleet (alongside the inherited NVIDIA-stack support), then all Phase 1 + Phase 2 ACs (AC-P1 through AC-P4) hold unchanged AND the AWS Trainium fleet exhibits expected per-shard observation behavior with the parallel-class topology adapter. | FR-V1a + cross-cutting |
| AC-P8 | Given the engine extracted to `@johnpatrickwarren-oss/deploysignal-engine` npm package, when both Tessera + DeploySignal repos consume the same version, then vendoring-drift R-E6 risk row is structurally eliminated (no per-file SHA-pin re-vendoring; package-version pin replaces). | FR-D1 |

### Phase 3 anti-scope (extends Phase 1/2)

All A1-A17 anti-scope items remain (inherited from SCOPING-MEMO-v0.3.md § 2.1). Phase 3 specific adjustments:

- **A10 carve-out (Phase 2 amendment preserved; Phase 3 extends):** L0 contract for Tessera (measurement-domain preprocessing) is in scope; Phase 3 extends to LIVE DCGM ingestion at real-cluster validation. Hardware-diagnostic territory (root-causing GPU failures, per-GPU fault attribution) remains anti-scope; Tessera observes counter behavior, does not diagnose hardware.
- **A8/A11 (no real customer telemetry):** Phase 3 introduces rented GPU validation environments. NOT customer telemetry; OPERATOR-rented infrastructure under operator control. Synthetic fleet-load on rented instance is permitted; real customer telemetry remains anti-scope.
- **NEW Phase 3 anti-scope:** No real-cluster integration that requires customer access to private clusters (per A8/A11). Only operator-controlled rental environments OR public-cloud trial accounts under operator account.
- **NEW Phase 3 anti-scope:** No vendor-locked code paths. AWS Trainium adapter MUST use the same `TopologySource` interface as Slurm/K8s/NVLink adapters; no AWS-SDK-internal hooks that prevent vendor-neutral testing. Same constraint applies to TPU adapter.

### Phase 3 SLICE structure (preliminary)

**SLICE 1 — Vendor expansion (AWS), synthetic-fixture-based (parallel-cluster wave; NO cluster access required)**

- WU-Phase3-1A: AWS Trainium adapter (`engine/topology/trainium-source.ts` + synthetic fixtures from Neuron SDK + AWS public docs). Parallel-class pattern matching Slurm/K8s/NVLink adapters. Tier: full. **No real cluster needed.**
- WU-Phase3-1B: AWS Inferentia adapter. Default expectation per OQ-P3-10: bundled with 1A if Neuron Link topology shared across both chip families (Architect confirms or splits at SLICE 1 dispatch). Tier: full. **No real cluster needed.**
- Coordinator wave plan applies (per CLAUDE-COORDINATOR.md). R47-R51 methodology framework (pipeline-mandatory; cold-eye Reviewer auto-fires; hybrid Reviewer at close-walk; wave-aggregate verifier; tier-aware consolidation Reviewer at wave-gate) is operational.
- WAVE-GATE-Phase3-01 closure: aggregate ALLOWED_SET union check via `scripts/verify-wave-aggregate.sh`; tier-aware consolidation Reviewer per R50 design (all sub-WUs full-tier; consolidation Reviewer OPTIONAL).

**Gating moment (SLICE 1 close → SLICE 2 dispatch):** operator decides whether to rent a GPU instance for the conditional US-07 validation path. Two paths forward:

- **Path A (US-07 ACTIVATED — operator rents):** SLICE 2 includes WU-Phase3-2C (real-cluster L0 contract validation; AC-P6 evaluated empirically).
- **Path B (US-07 DEFERRED — operator declines):** SLICE 2 proceeds without 2C; AC-P6 marked DEFERRED at Phase 3 close (not failing); FR-V4 ships interface + sparse-data resilience only (no live-cluster validation portion).

The Trainium / Inferentia adapters (SLICE 1) and Google TPU adapter (SLICE 2 2A) are independent of this gating decision — they ship in both paths.

**SLICE 2 — Vendor expansion (Google) + live topology fetch interface (sequential after SLICE 1; partially conditional)**

- WU-Phase3-2A: Google TPU / ICI adapter (`engine/topology/tpu-source.ts` + synthetic fixtures from JAX + TPU papers). Parallel-class pattern; uses lessons from SLICE 1 WU-1A. Tier: full. **No real cluster needed.**
- WU-Phase3-2B: Live topology fetch INTERFACE design. Extend Slurm/K8s/NVLink/Trainium/TPU adapters with `TopologySource.fetchSnapshot(ctx)` interface + sparse-data resilience tests (using synthetic partial-topology fixtures). Tier: full. **No real cluster needed for interface portion.**
- WU-Phase3-2C (CONDITIONAL — Path A only; gated on operator rental decision at SLICE 1/2 boundary): real-cluster L0 contract validation + real-cluster topology fetch validation. Rental-provider script (vast.ai-first per provider analysis); DCGM smoke test against L0 contract invariants; counter-behavior empirical evidence at real DCGM scale (missed-scrape catchup; 32-bit wraparound; reset-vs-wrap). Tier: full.

**SLICE 3 — DeploySignal integration (sequential after SLICE 2)**

- WU-Phase3-3A: Engine npm package extract (`@johnpatrickwarren-oss/deploysignal-engine`). Vendoring-drift R-E6 structural resolution. Tier: full (architectural restructure).
- WU-Phase3-3B: Bi-directional DS integration (Tessera → DS feeds correlation layer; DS → Tessera event feed). Tier: full.
- WU-Phase3-3C: Real-deploy-event freeze-hook (replaces synthetic VerdictGroups in event-conditional attribution). Tier: full.

### Phase 3 open questions

Carried forward from PHASE-3-CANDIDATES-PRELIMINARY.md § 8 (resolution status updated 2026-05-19) + new Phase 3-specific questions:

- **OQ-P3-9 (NEW; operator-decided at SLICE 1/2 gating moment):** Will operator rent a GPU instance for US-07 DCGM validation? Decision deferred until SLICE 1 close. Path A (rent) → SLICE 2 includes WU-Phase3-2C real-cluster validation. Path B (defer) → AC-P6 DEFERRED; SLICE 2 ships interface portions of FR-V4 only. Either path lets Phase 3 progress to SLICE 3 (DS integration) without blocking.
- **OQ-P3-10 (NEW):** Inferentia adapter — bundle with Trainium (SLICE 1 1A+1B combined) or sequential within SLICE 1? Architect decision at SLICE 1 dispatch once Neuron Link topology spec for both chip families is read. Default expectation: bundled, since Neuron Link is reportedly shared.
- **OQ-P3-11 (NEW):** SCOPING-MEMO v0.4 needed? Phase 3 introduces scope items (vendor expansion AWS + Google; live cluster integration; DS bi-directional) that materially extend SCOPING-MEMO v0.3. If the Reviewer at SLICE 1 dispatch flags this as scope-creep beyond v0.3 amendments, operator authorizes v0.4 authoring cycle. Suggested default: extend v0.3 with Phase 3 amendments rather than v0.4 unless Reviewer escalates.
- OQ-P3-1 → RESOLVED 2026-05-19 (operator: AWS Trainium first per better public data; Google TPU second).
- OQ-P3-2 → RESOLVED 2026-05-19 (operator: no Google Cloud access; relies on public data for synthetic fixture).
- OQ-P3-3 → REFRAMED as CONDITIONAL — rental is optional path A; tracked at SLICE 1/2 gating moment in OQ-P3-9 above. Phase 3 substantive progress does NOT require it (Trainium/Inferentia/TPU adapters ship from synthetic fixtures).
- OQ-P3-4 → RESOLVED 2026-05-19 (DS integration in SLICE 3, sequential after SLICE 2; no fallback path needed — DS integration is decoupled from real-cluster rental success).
- OQ-P3-5 → RESOLVED at R41 (Rule 7 canonical landing confirmed).
- OQ-P3-6 → RESOLVED 2026-05-19 (parallel methodology + production scope).

### Phase 3 success metrics

- **SLICE 1 close:** AWS Trainium adapter ships against synthetic Neuron Link fixtures; AWS Inferentia adapter ships (bundled with Trainium per default per OQ-P3-10); AC-P5 met; Phase 1/2 ACs unchanged. No real cluster needed.
- **Gating-moment outcome:** Path A or Path B selected per OQ-P3-9 operator decision.
- **SLICE 2 close:** Google TPU adapter ships against synthetic ICI fixtures (AC-P5 holds for TPU); `TopologySource.fetchSnapshot(ctx)` interface + sparse-data resilience operational across all 6 adapters (Slurm + K8s + NVLink + Trainium + Inferentia + TPU); IF Path A: AC-P6 validated against rented cluster (real DCGM scrapes confirm L0 contract invariants); IF Path B: AC-P6 marked DEFERRED.
- **SLICE 3 close:** Engine extracted to npm package; bi-directional DS integration operational; real-deploy-event freeze-hook validated; project-close success metric (npm package published) achieved.
- **Project close:** Tessera v1 published to `github.com/johnpatrickwarren-oss/tessera`; vendor coverage AWS Trainium + AWS Inferentia + Google TPU + NVIDIA NVLink + Slurm + K8s; real-cluster validation precedent set; engine npm package published.

---

## Open questions

Six architectural decision-points captured in `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:

- Q-J1 through Q-J5: architect-pre-prediction picks landed (confidence HIGH × 4 + MEDIUM × 1); subject to John override on first review.
- **Q-J6: ESCALATED** — cross-project sequencing (Tessera vs DeploySignal Phase E) is John's call; pipeline does not fire R01 until Q-J6 dispositioned. See `coordination/NEXT-ROLE.md` STATUS + escalation items.

## Update history

| Date | Change |
|------|--------|
| 2026-05-15 | Initial Tessera scoping cycle (v0.1 → Reviewer → v0.2 → project reframe → v0.3) |
| 2026-05-16 | Q1 spec emitted + Reviewer-amended (v0.2); Mode 2 retrofit (PRD.md / NEXT-ROLE.md / MEMORIAL.md / pipeline scripts) |
| 2026-05-19 | Phase 3 PRD authored post-R51 close per operator-led OQ-P3-1 through OQ-P3-6 resolution. Adds US-05 (AWS Trainium); US-06 (Google TPU); US-07 (rented-GPU DCGM validation); US-08 (DeploySignal bi-directional integration). FR-V1a/b (AWS); FR-V2 (Google); FR-V3 (validation scaffolding); FR-V4 (live cluster fetch); FR-D1/2/3 (DS integration). AC-P5 through AC-P8. SLICE 1-3 structure. 3 new open questions (OQ-P3-9/10/11). |

---

_PRD thin-pointer convention: full project framing in SCOPING-MEMO-v0.3.md; per-phase architectural commitments in coordination/specs/Q-RNN-SPEC.md; this file routes pipeline Architect to those artifacts as primary inputs._
