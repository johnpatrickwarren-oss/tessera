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

## Open questions

Six architectural decision-points captured in `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`:

- Q-J1 through Q-J5: architect-pre-prediction picks landed (confidence HIGH × 4 + MEDIUM × 1); subject to John override on first review.
- **Q-J6: ESCALATED** — cross-project sequencing (Tessera vs DeploySignal Phase E) is John's call; pipeline does not fire R01 until Q-J6 dispositioned. See `coordination/NEXT-ROLE.md` STATUS + escalation items.

## Update history

| Date | Change |
|------|--------|
| 2026-05-15 | Initial Tessera scoping cycle (v0.1 → Reviewer → v0.2 → project reframe → v0.3) |
| 2026-05-16 | Q1 spec emitted + Reviewer-amended (v0.2); Mode 2 retrofit (PRD.md / NEXT-ROLE.md / MEMORIAL.md / pipeline scripts) |

---

_PRD thin-pointer convention: full project framing in SCOPING-MEMO-v0.3.md; per-phase architectural commitments in coordination/specs/Q-RNN-SPEC.md; this file routes pipeline Architect to those artifacts as primary inputs._
