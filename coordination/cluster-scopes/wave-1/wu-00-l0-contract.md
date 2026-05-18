# Cluster scope — WU-00 L0-CONTRACT (Wave 1 / R25)

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
