# CLUSTER-HANDOFF-3-WU04-WU06 — WU-04 MD-F4 COMMON-MODE ATTRIBUTION → WU-06 EVENT-CONDITIONAL ATTRIBUTION

**From:** Coordinator TPM (R33)
**Date:** 2026-05-18
**Wave:** Source cluster CL-01-B (Wave 1) → Target cluster CL-04-A (Wave 4)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 Step 2 inbound edges; `coordination/reviews/REVIEWER-REPORT-R26.md`; `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` § 3.2 A16/D4 cross-wave corroboration; `WAVE-GATE-03.md`
**Type:** cross-cluster dependency contract (D1 HIGH — event-conditional attribution architecturally extends MD-F4 common-mode-attribution surface)

---

## Purpose

WU-06 (event-conditional correlational attribution) extends the architectural pattern WU-04 established (BFS-on-undirected + candidate aggregation + A16 wire-format preservation). WU-06 emits `TopologyCandidate`-shaped output (or parallel-class extension thereof) keyed by `cluster_event_id` + topology-distance metric, with `correlational_not_causal: true` invariant preserved at every wire boundary. WU-04 set the A16 binding precedent (AC-R26-8 strictEqual + JSON-serialized round-trip; ratified at R32 AC-R32-15 with /m-anchor regex per R30 MINOR-1 fix); WU-06 inherits the precedent with at-least-the-same binding rigor.

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, this Wave-1→Wave-4 cross-wave edge crosses Wave 2 + Wave 3; the handoff artifact is authored at the Wave 3 gate (R33) that authorizes WU-06 dispatch (per "wave gate emits handoffs for the wave it's authorizing" convention).

---

## Dependency edge

- **Source cluster:** CL-01-B
- **Source work unit:** WU-04 — MD-F4 (topology-aware spatial attribution) + PR-F6 evidence package (Tessera Phase 2 SLICE 3.C; R26)
- **Target cluster:** CL-04-A
- **Target work unit:** WU-06 — SLICE 4 (event-conditional correlational attribution layer is the load-bearing consumer of this edge)
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Event-conditional attribution extends MD-F4 common-mode attribution architecturally. WU-06 likely imports the attribution-candidate type from `engine/topology/common-mode-attribution.ts` + emits structurally-compatible output for downstream merge OR ships a parallel-class extension `engine/topology/event-conditional-attribution.ts` that mirrors MD-F4's interface contract. Both consume per-shard verdicts; both emit `TopologyCandidate`-shaped output with `correlational_not_causal: true`. This is the HIGHEST D1 confidence inbound edge to WU-06 across all Wave-1/2/3 sources.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `common-mode-attribution.ts` | `engine/topology/common-mode-attribution.ts` (~350 lines; Tessera-original; R26 + R32 docstring relax) | Topology-aware spatial attribution layer. BFS-on-undirected attribution. Groups correlated per-shard verdicts into common-mode candidates keyed by shared topology node (PSU / rack / cooling_zone) and event-distance metric. Emits `TopologyCandidate` with `correlational_not_causal: true` per Addition #26 D4. |
| `q-md-f4-common-mode-injection.test.ts` | `test/q-md-f4-common-mode-injection.test.ts` | 16 ACs covering BFS-on-undirected + common-mode aggregation + cross-rack false-positive guard + sparse-topology degradation (LS-4 RESOLVED) + A16 wire-format + PR-F6 4-cell evidence + binding-command attestations + anti-scope. R26 MINOR-1 fixed at R32 (execFileSync; AC-R32-9). |
| `Q-R26-SPEC.md` | `coordination/specs/Q-R26-SPEC.md` | R26 Architect spec (R32 amended for MAJOR-1 attestation: exit=2 + TS2688/TS5107 reality). |
| `REVIEWER-REPORT-R26.md` | `coordination/reviews/REVIEWER-REPORT-R26.md` | R26 Reviewer report: 0 CRITICAL / 1 MAJOR (false tsc exit-code attestation — CLOSED at R32) / 2 MINOR (MINOR-1 CLOSED at R32; MINOR-2 PARTIALLY-CLOSED at R32 with docstring relax + impl alignment deferred to WU-06 consumer context) / 3 OBS. |
| `PR-F6-EVIDENCE.md` | `coordination/evidence/PR-F6-EVIDENCE.md` | External literature citation evidence package (Meta H100 SDC papers + MS/Google SDC postmortems). Re-audited by Hybrid Reviewer at R32 (Cells 1/2/3 only — Cell 4 carries forward to PR-F7 design per R32 MINOR-4). |

### A16 wire-format binding precedent (REQUIRED for WU-06 to match)

WU-04 established the A16 wire-format binding pattern. WU-06 inherits with at-least-the-same rigor:

| Binding site | WU-04 precedent | WU-06 requirement |
|---|---|---|
| Type-declaration site (`engine/types/verdict.ts:289`) | AC-R30-15 regex `/^\s*correlational_not_causal:\s*true\s*;/m` (ratified at R32 AC-R32-15 with /m anchor per R30 MINOR-1 fix) | WU-06 binds the same site with the same regex pattern; do NOT use `content.includes(...)` (Rule 5 self-application gate). |
| Wire-format / JSON-serialized origin (`engine/topology/common-mode-attribution.ts` candidate construction) | AC-R26-8 strictEqual + JSON-serialized round-trip check | WU-06 binds its emit site (`engine/topology/event-conditional-attribution.ts` or equivalent) with strictEqual + JSON round-trip. |

**A16 wire-format invariant in plain text:** Every `TopologyCandidate` (or event-conditional-attribution equivalent) emitted at any wire boundary MUST carry `correlational_not_causal: true` as a literal field with the literal value `true`. The wire-format check exercises serialization round-trip. The type-declaration check exercises the type-definition site cannot be quietly removed.

### MD-F4 architectural pattern (WU-06 extends)

- **BFS-on-undirected attribution.** WU-06 may use the same BFS pattern (extends inherited `engine/topology-overlay.ts:257+` body) for event-conditional topology conditioning, OR ship a different attribution algorithm (CausalImpact / synthetic control / ITS) that does NOT use BFS but consumes the same `TopologySnapshot` input shape.
- **Common-mode candidate aggregation.** WU-04 groups correlated per-shard verdicts into common-mode candidates keyed by shared topology node. WU-06 extends with event-conditional keying: groups correlated per-shard verdicts into event-conditional candidates keyed by `(cluster_event_id, topology-node?, event-distance-metric?)`.
- **Sparse-topology degradation (LS-4 RESOLVED at WU-04).** WU-06's event-conditional attribution inherits the graceful-degradation requirement: when topology snapshot has only `rack` + `gpu_shard` nodes (no PSU / cooling_zone), event-conditional attribution must degrade gracefully (no throw; subset attribution; null/empty fallback).

### Carry-forward: R26 MINOR-2 deferred impl alignment

**State:** Docstring at `engine/topology/common-mode-attribution.ts:65-72` relaxed at R32 (Option B disposition: relax docstring rather than tighten impl). Impl per-distinct-member-shard de-duplication for `earliest_event_ts` / `latest_event_ts` aggregation DEFERRED until WU-06 consumer context lands.

**WU-06 action:** If WU-06 ships a `FusedVerdict → FiredShardEvent` adapter that consumes the aggregation surface, the impl alignment becomes load-bearing — Architect MUST include in WU-06 spec as a deliverable (with vendored-with-deltas check on `common-mode-attribution.ts` for the impl change). If WU-06 does NOT ship that adapter, the deferral continues to WU-07 close-walk. Architect's call at spec time.

---

## Verification status

Per `REVIEWER-REPORT-R26.md` + `REVIEWER-REPORT-R32.md` (Hybrid Reviewer audit of WU-04 PR-F6 evidence) + `WAVE-GATE-03.md`:

- [x] Output artifact (`common-mode-attribution.ts`) exists at the stated location; verified at gate via main HEAD `c503edb` (bit-identical to R26 merge HEAD `9c3b53c` except for R32 docstring relax at `:65-72`).
- [x] Interface contract matches Reviewer + Hybrid Reviewer per-AC verification (16 R26 ACs PASS for behavior; R32 PR-F6 Cells 1/2/3 Reviewer-verified PASS).
- [x] R-E7 MITIGATED (cross-edge corroboration — R-E7 was WU-00's evidence but the A16/D4 cross-wave corroboration in PHASE-2-SLICE-3-CLOSE-WALK § 3.2 + § 3.3 + § 3.4 demonstrates the full SLICE 3 stack is sound).
- [x] All 4 PR-F6 cells PASS (Cell 4 caveat: tested at AC-R26-4, not Reviewer-verified; carry-forward to PR-F7 design at WU-06).
- [x] A16 wire-format invariant preserved at type-declaration + emit sites (cross-wave corroborated at R26 + R30 + R32).
- [x] LS-4 sparse-topology degradation RESOLVED (no BFS body modification needed; WU-06 inherits the same constraint).

---

## What the target cluster must not assume

- WU-04 did NOT consume the L0-contract surface (zero D-test edges with WU-00; v9Y substrate is value-domain by construction). WU-06 may or may not consume L0 contract — depends on event-feed schema design (OQ-W3-4).
- WU-04 did NOT produce per-shard detector internals — operates DOWNSTREAM of per-shard verdicts; consumes them as input. WU-06 inherits the same downstream-of-detectors stance.
- WU-04 did NOT modify `engine/topology-overlay.ts` body — extends-by-pattern at extension points only. WU-06 MUST NOT modify the BFS body either; A12 halt-condition #1 fires if BFS body modification proves load-bearing for event-conditional attribution.
- WU-04 did NOT include Cell 4 (mixed-signal robustness) as a Reviewer-verified AC; tested at Implementer layer only. WU-06's PR-F7 evidence MUST include all 4 cells as Reviewer-verified to avoid the same MINOR-4 class.
- WU-04 did NOT use ML-based attribution (A13). WU-06 inherits A13 — CausalImpact / synthetic control / ITS are rule-based + statistical methods, NOT ML attribution models.
- WU-04's external literature citation evidence is PR-F6-only. WU-06 produces a NEW PR-F7 evidence package with CausalImpact / synthetic control / ITS citations; PR-F6 evidence is not directly reusable.

---

## Pre-flags from wave gate (WAVE-GATE-03 § Pre-flags to Wave 4 cluster)

- **A16 wire-format binding is the HIGHEST-RELEVANCE constraint for WU-06.** Event-conditional attribution is the highest-risk surface for D4 reversal pressure across all of Tessera (statistical methods carry "causal" terminology in literature). Bind A16 at every emit site with WU-04-precedent rigor (regex /m anchor + JSON round-trip).
- **MD-F4 architectural pattern is the WU-06 template.** WU-06 Architect's brainstorm phase should explicitly enumerate which MD-F4 patterns extend cleanly (candidate aggregation; sparse-topology graceful degradation; correlational_not_causal preservation) vs which require WU-06-specific extensions (event-feed conditioning; CausalImpact/synthetic-control method orchestration).
- **R26 MINOR-2 deferred impl alignment is conditionally in WU-06 scope.** If WU-06 ships `FusedVerdict → FiredShardEvent` adapter context, close the deferral at WU-06; else carry forward.
- **PR-F7 evidence package includes all 4 cells as Reviewer-verified** (avoid R32 MINOR-4 class).

---

## Halt conditions for target cluster

1. WU-06 event-conditional attribution requires modification of `engine/topology/common-mode-attribution.ts` BODY (beyond opportunistic R26 MINOR-2 impl alignment) — HALT; route back to Coordinator for cross-wave impact assessment. Wave-1-frozen.
2. WU-06 event-conditional attribution requires modification of `engine/topology-overlay.ts` BFS body — HALT; A12 implication; same halt-condition as MD-F4's #1.
3. A16 binding at the event-conditional attribution wire boundary surfaces a structural reversal pressure (e.g., the statistical method's output shape doesn't naturally accommodate a literal-label field) — HALT with DIAGNOSTIC; Coordinator + Architect re-pick attribution method or amend A16 wire-format expectations.
4. PR-F7 evidence package cannot be authored to Reviewer-verified standard for any of the 4 cells — HALT; route back via Coordinator with the failure-mode characterization.
5. CausalImpact / synthetic control / ITS literature URLs no longer resolve at WU-06 spec time (link-rot) — HALT; route back so Architect can either find replacement citations OR weaken the spec's reliance on the cited material. Do NOT accept dead links silently (same discipline as WU-04 PR-F6 evidence at R26).

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 1 gate (R27) | 2026-05-18 | DEFERRED | Per CLAUDE-COORDINATOR.md §Cluster handoff inventory: Wave-1→Wave-4 edge crosses Wave 2 + Wave 3; handoff authored at the wave gate that authorizes consuming wave (Wave 3 gate / R33). |
| Wave 2 gate (R31) | 2026-05-18 | DEFERRED | Continues deferred (Wave 3 not yet authorized). |
| Wave 3 gate (R33) | 2026-05-18 | CURRENT | Handoff emitted at Wave 3 gate authorizing Wave 4 dispatch of WU-06. MD-F4 attribution layer + PR-F6 evidence verified at main HEAD `c503edb` (R32 docstring relax included). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation (deferred from Wave 1 + Wave 2 gates per cross-wave handoff timing convention) | Wave 3 gate (R33) — authorizing Wave 4 dispatch of WU-06 SLICE 4 |
