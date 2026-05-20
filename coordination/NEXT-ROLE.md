CURRENT-ROUND: R52
NEXT-ROLE: OPERATOR (wave-plan review)
STATUS: WAVE-PLAN-READY
TIER: coordinator

## R52 close — Phase 3 SLICE 1 wave plan emitted

**Coordinator deliverable:** `coordination/WAVE-PLAN-Phase3-01.md` (v1; 2026-05-19; PRD-decomposition + DAG + wave sequencing for Phase 3 SLICE 1).

**Round-start SHA:** `620d0e2` (chore: Phase 3 PRD authored)

### Plan summary

**One work unit, one wave, one cluster.** WU-Phase3-1 bundles AWS Trainium adapter + AWS Inferentia adapter into a single full-tier cluster per OQ-P3-10 default condition (PRD:466 "bundled if Neuron Link topology is shared across both chip families") confirmed empirically via Neuron SDK public docs:

- Trainium + Inferentia2 share NeuronCore-v2 base architecture + NeuronLink-v2 interconnect family (`awsdocs-neuron.readthedocs-hosted.com/en/v2.26.0/general/nki/arch/trainium_inferentia2_arch.html`)
- Trainium = 2D Torus topology with 4 NeuronLinks per chip; Inferentia2 = ring topology with 2 NeuronLinks per chip (`awsdocs-neuron.readthedocs-hosted.com/en/latest/general/arch/neuron-hardware/trn1-arch.html`)
- Shared `'neuron_link_peer'` `TopologyEdge.relationship` literal (pre-anticipated at SCOPING-MEMO-v0.3.md:285 Vendor fungibility table); distinct `'trainium_chip'` + `'inferentia_chip'` `TopologyNode.kind` literals

**Fan-out NOT forced** because D5-strict write-conflict on shared `engine/types/verdict.ts` enum extension (both sub-WUs would add the same `'neuron_link_peer'` literal — duplicate-add merge conflict). Single-cluster bundle is the structurally correct shape per dispatch directive's "DO NOT force fan-out when scope is genuinely sequential" clause. Architect retains spec-time split-decision flexibility per R20+R21 precedent if AC count exceeds 18.

### Wave plan deliverable

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 1 | 1 (sequential bundled) | No | WU-Phase3-1 AWS Neuron adapter (Trainium 2D Torus + Inferentia2 ring; shared parser via OQ-P3-10 default; bundled per Coordinator empirical confirmation). Full tier (A1 + A2 + A4 + A7). |

### Open questions surfaced (operator review at this stage)

- **OQ-Phase3-W1-1 (NEW; not blocking; Coordinator default A):** File layout under `engine/topology/`. Option A `neuron-source.ts` (single unified parser; matches WU-03/WU-04 single-file precedent — Recommended). Option B `trainium-source.ts` + `inferentia-source.ts` (split per-chip-family; matches PRD:434 explicit FR-V1a filename).
- **OQ-Phase3-W1-2 (NEW; not blocking; Coordinator default B):** SCOPING-MEMO § 2.3 amendment timing. Option A opportunistic if WU-Phase3-1 spec touches anyway. Option B defer to future Phase 3 SLICE-close walk (matches Phase 2 R32 MAJOR-1 carry-forward pattern — Recommended).
- **OQ-P3-9 (CARRY-FORWARD; OPERATOR-DECIDED AT SLICE 1 CLOSE NOT THIS PLAN):** Rent GPU instance for US-07 DCGM validation Path A, or defer Path B. Decision at WAVE-GATE-Phase3-01 close.
- **OQ-P3-10 (RESOLVED AT THIS PLAN):** Bundled per Coordinator-empirical confirmation. Architect override discretion via OQ-Phase3-W1-1.
- **OQ-P3-11 (CARRY-FORWARD; DEFAULT EXTEND v0.3):** SCOPING-MEMO v0.4 needed? Default: extend v0.3 with Phase 3 amendments at future close-walks. Escalate to v0.4 only if Reviewer at SLICE 1 close flags scope-creep.

### Cross-project rule audit (per NEXT-ROLE.md R52 directive § "Apply all 7 cross-project rules UPFRONT")

| Rule | Status at R52 close |
|---|---|
| 1 (`false-compliance-attestation`) | ACTIVE GATE applied — Coordinator cited specific PRD line numbers (434-435, 447, 463-468) + Neuron SDK URLs verbatim + retrieval dates throughout WAVE-PLAN Step 1 merge reasoning. No memorized claims. |
| 2 (`branch-binding-coverage-gate`) | N/A — no production-code branches at Coordinator stage. |
| 3 (`implementer-spec-test-assertion-coverage`) | N/A — no test file authored. |
| 4 (`anti-scope-allowed-set-forward-coverage`) | ACTIVE GATE applied — Coordinator stayed within R52 NEXT-ROLE.md ALLOWED_SET (`coordination/WAVE-PLAN-Phase3-01.md` NEW; `coordination/COORDINATOR-MEMORIAL.md` append; this file STATUS update). |
| 5 (`rule-derivation-without-self-application`) | N/A — no new rule derived at R52. |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | ACTIVE GATE applied — no halt fired. PRD Phase 3 SLICE 1 sub-section internally consistent; Neuron SDK public docs sufficient to resolve OQ-P3-10 (default-condition empirically confirmed, NOT re-interpreted). |
| 7 (`derived-rule-propagation-mechanism-required`) | N/A as derivation surface — Coordinator does not derive new propagation surfaces. Pre-flag preserved in WAVE-PLAN-Phase3-01 § Pre-emit grilling for Architect dispatch propagation gate inheritance (`scripts/pre-commit-rule-sweep.sh` + `SPEC-AUTHORING-CHECKLIST.md` + R50 wave-aggregate verifier). |

### Wave 1 dispatch recommendation (post-operator-review)

After operator wave-plan review + (optional) answers to OQ-Phase3-W1-1 + OQ-Phase3-W1-2:

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

Standard single-pipeline dispatch (NOT `--coordinator`; NOT `multi-track-cluster-setup.sh`). Wave 1 = WU-Phase3-1 single-cluster full-tier round (nominally R53 per cluster pipeline next-round-after-R52 convention). After R53 cluster close, next Coordinator invocation authors `coordination/WAVE-GATE-Phase3-01.md` + (if applicable) WAVE-PLAN-Phase3-02 for SLICE 2 per OQ-P3-9 operator decision.

### Coordinator artifacts at R52 close

| Artifact | Location | Status |
|---|---|---|
| WAVE-PLAN-Phase3-01.md | `coordination/WAVE-PLAN-Phase3-01.md` | NEW v1 (this round) |
| COORDINATOR-MEMORIAL.md | `coordination/COORDINATOR-MEMORIAL.md` | APPENDED with R52 entries (Phase 3 SLICE 1 wave-plan emission section; 7 CONFIRMATION + 4 OBSERVATION entries) |
| NEXT-ROLE.md | `coordination/NEXT-ROLE.md` | THIS file; STATUS: WAVE-PLAN-READY |
| CLUSTER-HANDOFF-Phase3-*.md | (none) | Not emitted at v1 (single-cluster Wave 1; zero in-wave producer→consumer edges; Phase 2 inbound edges are informational pattern-references + interface-only — load-bearing context lives in `coordination/PHASE-2-CLOSE-WALK.md` + Reviewer reports referenced) |
| WAVE-GATE-Phase3-01.md | (deferred) | Emits at next Coordinator round (post-R53 cluster close) |

### Inputs for operator review

1. **`coordination/WAVE-PLAN-Phase3-01.md`** — primary Coordinator deliverable; READ FIRST
2. `coordination/PRD.md` § Phase 3 Scope (lines 411-510; PRD source provenance for WU extraction)
3. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility table (lines 270-289; parallel-class pattern authorization for Trainium/Inferentia adapters)
4. `coordination/COORDINATOR-MEMORIAL.md` § Phase 3 SLICE 1 wave-plan emission (R52 confirmation + observation entries)
5. `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 1.3 + § 1.4 (AWS Trainium + Inferentia candidate framing prior to PRD authoring)

### Halt conditions (R52 close; all clear)

1. **Neuron SDK public docs ambiguous on Inferentia topology relationship to Trainium** — NOT FIRED. 4 sources retrieved 2026-05-19 confirm shared NeuronCore-v2 + NeuronLink-v2 family; Inferentia2 ring vs Trainium 2D Torus differ in topology shape + per-chip connection count but use the same interconnect family.
2. **PRD Phase 3 SLICE 1 sub-section internally inconsistent** — NOT FIRED. PRD:434-435 (FR-V1a + FR-V1b), 447 (AC-P5), 463-468 (SLICE 1 sub-section) are internally consistent.
3. **D-test edge surfaces unexpected cross-WU dependency** — FIRED on D5-strict write-conflict between WU-Phase3-1A + 1B sub-WU candidates (shared `engine/types/verdict.ts` enum extension); RESOLVED via bundled single-cluster decision (Step 3 Judgment call 1 in WAVE-PLAN). No halt routed; Coordinator decision documented inline + structurally honored.

---

## Operator-decision flags (carried forward; updated post-R52)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (9+ tessera instances; below cross-project 2nd-project threshold).
3. Cross-project canonical landings (8+ items gated on 2nd-project occurrence).
4. Anchor PR backflog scheduling (R11-R52 contributions; expanded window).
5. **Phase 3 SLICE 1 wave plan READY** — R52 first Phase 3 Coordinator invocation complete; operator reviews `coordination/WAVE-PLAN-Phase3-01.md`; Wave 1 dispatch authorized post-review.
6. R49 MAJOR-1 hybrid-mandate-vs-full-tier mismatch — candidate for future round.
7. R50 MAJOR-1 + 6 MINOR findings — candidate for future round.
8. **OQ-P3-9 gating moment between SLICE 1 close and SLICE 2 dispatch** (operator decision Path A vs Path B on cluster rental) — carried forward; decision at WAVE-GATE-Phase3-01.
9. **OQ-Phase3-W1-1 (NEW R52):** File layout under `engine/topology/` — operator may answer pre-Wave-1-dispatch; Coordinator default A (single `neuron-source.ts`) applies absent answer.
10. **OQ-Phase3-W1-2 (NEW R52):** SCOPING-MEMO § 2.3 amendment timing — Coordinator default B (defer to close-walk) applies absent answer.
11. **OQ-P3-11 SCOPING-MEMO v0.4 needed** — default extend v0.3; escalate if SLICE 1 Reviewer flags scope-creep.
