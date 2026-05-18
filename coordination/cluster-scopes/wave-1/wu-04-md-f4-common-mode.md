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
- **PR-F6 hybrid Reviewer mandate** per SCOPING-MEMO § 2.3: at this cluster's Reviewer stage, run hybrid Reviewer (Opus + Sonnet + Merger per `run-pipeline.sh:1079-1115` `dispatch_hybrid_reviewer`). This is the FIRST tessera invocation of hybrid Reviewer; preserve the Opus-Sonnet complementary-bias pattern documented in `coordination/EVAL-SONNET-REVIEWER-2026-05-15.md`.
- **External literature citation discipline:** every external citation (Meta H100 SDC; MS/Google postmortems) must include URL + retrieval date + verbatim quote (architect-side responsibility; reviewer audits).

## Cluster context (where this WU sits)

**Wave 1 of 5 (parallel to WU-00 L0-contract).** Coordinator placed this WU in Wave 1 (rather than Wave 2 with adapters) because v9Y substrate is value-domain by construction — no L0-contract dependency. Lands PR-F6 evidence in parallel with the L0-contract work, preserving operator fan-out preference.

**Downstream dependencies on this cluster's output:**
- WU-05 SLICE 3 close-walk (D1 HIGH — reads `engine/topology/common-mode-attribution.ts` + PR-F6 hybrid Reviewer evidence package; stamps as SLICE-3 deliverable).
- No other Wave-2+ WU depends on this WU directly.

**Wave gate criteria** (Coordinator runs at Wave 1 close):
- Reviewer report (hybrid: Opus + Sonnet + Merger) MERGE-READY
- 0 CRITICAL findings
- All 4 PR-F6 cells PASS
- `correlational_not_causal: true` wire-format invariant preserved (asserted at wire boundary)
- External literature citation evidence package complete (URLs + retrieval dates + verbatim quotes)
- LS-4 sparse-topology degradation handled gracefully (or ESCALATED with bounded question if BFS body modification proves load-bearing)

## Halt conditions for this cluster (escalate to Coordinator)

1. **BFS body modification proves load-bearing for MD-F4** — LS-4 forward-looking case. ESCALATE rather than absorb; this would be a vendored-with-deltas transition for `engine/topology-overlay.ts` with high blast radius (A12 implication).
2. **PR-F6 evidence cells reveal a structural false-positive surface in BFS-on-undirected attribution** — if the attribution layer surfaces false common-mode candidates that cannot be eliminated by AC tuning, route back to Coordinator with the failure-mode characterization.
3. **External literature for PR-F6 cannot be found or is insufficient** — if Meta H100 SDC + MS/Google postmortems do not provide the corroborating evidence the architect needs, surface as OQ rather than weakening the PR-F6 standard.

## Round

`R26` (Wave 1, cluster 2 of 2). Cluster pipeline runs internally as R26 in this cluster's worktree.

## Branch

`cluster/wu-04-md-f4-common-mode-R26` (auto-created by `scripts/multi-track-cluster-setup.sh`).
