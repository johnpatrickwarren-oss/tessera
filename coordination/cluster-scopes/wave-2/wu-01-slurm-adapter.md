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
