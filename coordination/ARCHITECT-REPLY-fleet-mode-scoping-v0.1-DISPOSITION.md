# ARCHITECT-REPLY — Fleet-Mode Scoping v0.1 Disposition

_From: Architect. To: TPM (downstream packaging for John)._
_Date: 2026-05-15._
_Foundation: REVIEWER-REPORT (`coordination/REVIEWER-REPORT-fleet-mode-scoping-v0.1.md`); architect amendment cycle produced v0.2 (`coordination/ARCHITECT-MEMO-fleet-mode-scoping-v0.2.md`)._
_Type: architect disposition closing the Reviewer→Architect intake loop per PROJECT-ROLES:53._
_Cycle: Reviewer cold-context audit of v0.1 → architect intake (this artifact) → v0.2 memo amendment (already emitted) → TPM packaging for John → John dispositions on Q-J1..Q-J6._

---

## Per-finding disposition

| Finding | Class | Disposition | Sections amended in v0.2 |
|---|---|---|---|
| **F1** Existing-architecture-coverage missing for Addition #25 + #26 | FAIL | **AMENDED.** Reviewer correct. Extension 3 builds on existing TopologySource (`engine/topology-overlay.ts:42-43`) + VerdictGroup (`engine/types/verdict.ts:141-188`) primitives — HardwareTopologySource is a concrete impl against the existing abstract interface, NOT a new abstraction. Phase G SLICE 1 scope collapses; Q-cycle estimate revises 10-14 → 8-12 for Phase G. Refinement noted: BFS + directed-edge interface mechanics may need extension for NVLink (dense, undirected) — relationship enum extension (`'co_located_in_rack' \| 'shares_psu' \| 'nvlink_peer'`) anchored architect-pre-prediction; PR-F6 pair-review evaluates. | § 1; § 2.3 substantial rewrite; § 3 Phase G SLICE 1-2 reorg; § 4 R-E5; § 6 PE-7; MD-F6 added |
| **F2** D4 correlational-not-causal stance conflict | FAIL | **AMENDED — Option α PICKED** (John dispositioned via `AskUserQuestion` 2026-05-15). Addition #26 D4 PRESERVED. Extension 3 (c) reframed as "event-conditional correlational attribution." Pitch claim recalibrates from "DeploySignal causally attributes drift to the deploy" to "DeploySignal surfaces evidence drift is event-conditional, with correlational-not-causal confidence per Addition #26 D4." MD-F5 revised "causal" → "correlational." PR-F7 revised similarly. **A16 NEW** preserves D4 stance via anti-scope. **Inverse-Skill-14 observation:** the F2 drift was architect-introduced widening of John's original "conditional attribution given event" framing (which was already correlational); F2-α RESTORES John's intake-level framing. | § 1; § 2.3 (c) reframing; A16 added; MD-F5 revised; PR-F7 revised; § 6 PE-8; § 8 item 10 Observation A |
| **G1** Unverified tick-rate citation | GAP | **AMENDED.** Reviewer correct that ARCHITECTURE.md doesn't specify a tick rate. Concrete-values verified: `tools/ingest-real-trace.ts:106` (and 4 sibling locations `:204`, `:278`, `:500`) default `tick_seconds ?? 5`; tick rate is per-deploy parameterized, NOT a fixed engine constant; `engine/core.ts` consumes ticks at whatever rate they arrive. Cold-start latency target re-stated as sample-count-driven (20 per-shard samples for warm-start, 60 for strict) rather than wall-clock. | § 2.2 cold-start latency target |
| **G2** Storage estimate off ~50× | GAP | **AMENDED.** Architect math verified: naive endpoint 3.22 GB at default 168 cells × N=10000; 64.5 GB at full cell-matrix expansion (× tenant_tier ×5 + workload_class ×4). v0.1's "200GB+" claim corrected. PR-F5 pair-review trigger condition preserved (~1.2-1.5× single-instance hierarchical-encoding); empirical P6 validation at Phase F SLICE 2. Failure-mode acceptance: prediction wrong by >2× signals load-bearing acceptance failure. | § 2.2 storage; § 4 R-E1 both endpoints derived |
| **G3** Prose imbalance Extension 3 | GAP | **AMENDED — Option c PICKED** (accept asymmetry with explicit acknowledgment). Extension 3 prose justifiably longer: layers on existing primitives (cross-reference work), introduces deployment-event new ingestion surface, has highest pair-review-trigger density (3 sub-mechanisms each with literature anchors). | § 2.3 G3 acknowledgment clause |
| **G4** Pair-review trigger count wording | GAP | **AMENDED.** "7 enumerated; 6 trigger-firing, 1 pre-empted as sub-mechanism." Cosmetic clarification. | § 6 pair-review trigger summary |
| **G5** Missing meta-level brainstorm | GAP | **AMENDED via `superpowers:brainstorming` skill** (John dispositioned "formal skill" option via `AskUserQuestion` 2026-05-15). § 1.5 enumerates (a)-(d) memo structures with tradeoffs; (d) Phase F + G PICKED retrospectively with justification anchored to shared-substrate + differential-validation reasoning. First observed application of `superpowers:brainstorming` in DeploySignal coordination flow; precedent for future SCOPE-PROPOSAL artifacts. | NEW § 1.5; § 8 item 8 |
| **G6** Probability overconfidence | GAP | **AMENDED.** v0.1 55/15/20/10 → v0.2 45/15/25/15. Recalibration reflects 6-decision-point joint-probability surface with partial coupling between Q-J4 / Q-J6 (sequencing-coupled) and Q-J1 / Q-J5 (guarantee-target-coupled to freeze-hook activation). Pure-independence math would push lower (~35-40%); partial-coupling lifts to ~45%. | § 7 close framing |
| **G7** Missing A15 anti-scope | GAP | **AMENDED.** A15 added: NO multi-region / cross-cluster federation. Fleet-mode is intra-cluster (one DC, one cluster, N shards); cross-cluster is operationally different (network partition + clock-skew + federation-protocol concerns intra-cluster doesn't have). Anti-scope clause count: 14 (A1-A14) → 16 (A1-A16). | § 2.3 A15 |
| **G8** VerdictGroup aggregation scope re-architecture | GAP | **AMENDED.** Phase G SLICE 2 scope explicitly notes "VerdictGroup scope re-architecture cost dominates this slice." Scope extension from `(deploy_id, window_start_ts)` to `(cluster_event_id, window_start_ts)` touches close-trigger semantics (D2 default 300s window), group_id format, cross-deploy aggregation rules. Preserved-vs-amended walk of Addition #25 D2 + D5 clauses lands at Phase G SLICE 1 contract emission; cross-references at spec-emit time. | § 2.3 implementation surface; § 4 R-E5 |

**Summary:** 2 FAIL + 8 GAP → 10/10 AMENDED in v0.2. Zero DEFER-with-reason; zero PASS-confirm-without-amendment (every PASS in the Reviewer report was structurally correct so no disposition needed). Zero retained-rejection of Reviewer findings.

---

## Memorial D state evolution

**Pre-Reviewer-pass (v0.1 emit):** 20V/8C (last archive snapshot per DISCIPLINE-REFERENCE:88 + LEDGER:142).

**Post-Reviewer-pass disposition (this v0.2 emit):** **21V/8C** — increment by 1 V (single sub-instance of 8th CONFIRMATION class lineage).

**Classification rationale (architect-pre-prediction was: single sub-instance vs two distinct VIOLATIONS):**

F1 (file-opened-discipline gap) + F2 (architectural-layer-coverage gap on Addition #26 D4 wire-format constraint) both surface the **same architect-grilling-discipline gap class** at the **same brief-drafting moment**:

- Class: architect-grilling-discipline-pre-empirical-mechanism-capture (8th CONFIRMATION class per DISCIPLINE-REFERENCE:96-101).
- Sub-variant: **file-opened-discipline-paired-with-candidate-set-enumeration** (named MD-F6 in v0.2 § 2.3 Memorial D candidate-set; new sub-variant per Reviewer disposition).

The Q66 LS-1 stationarity-assumption-violation sub-instance classification precedent applies (LEDGER:142 — "preserved at 20V/8C; Q66 LS-1 stationarity-assumption-violation classified as 4th sub-instance within already-counted 8th CONFIRMATION class"). At v0.2 emit: F1 + F2 classified as the 5th sub-instance within the 8th CONFIRMATION class lineage, NOT as two separate VIOLATIONS.

**Alternative classification considered + rejected:** two distinct VIOLATIONS → 22V/8C. Rejected because F1 + F2 share class character (file-opened + candidate-set-enumeration discipline at brief-drafting time); the discipline-class character is the load-bearing signal, not the specific mechanism variants per the Q63 Q1 Suggestion 1 sub-instance accumulation discipline anchor.

**8th CONFIRMATION class — 5 sub-instances post-formalization** (updated from DISCIPLINE-REFERENCE:93 4-row table):

| # | Cycle | Mechanism variant |
|---|---|---|
| 1 | Q60 V1 LS-1 | input-data-structure-semantic mismatch |
| 2 | Q60 LS-2 | LIKELY-SURFACES-prediction-validation multi-layer |
| 3 | Q64 Phase 4 | calibration-substrate-rationale-option-(γ) anticipation |
| 4 | Q66 SLICE 1 LS-1 (closed at .A.b via H1' pre-whitening) | stationarity-assumption-violation-from-AR(1)-correlation |
| **5** | **v0.1 → v0.2 cycle (this)** | **file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity** |

Cross-reference: full archive update at `.auto-memory/feedback_vq_framework_discipline.md` post-v0.2-emit; this disposition records the increment intent. Memorial D candidate-set archive (MD-F6) also lands via `.auto-memory/feedback_architect_cross_family_audit.md` post-John-disposition (clean-close path).

---

## Anti-scope-ledger updates

**No LEDGER updates at this v0.2 emit** (architect commitment in v0.2 § 9 footer). Phase F / G commitments are not yet TAGGED in LEDGER; commitment lands in LEDGER post-John-disposition (clean-close path), at which point:

- New TAGGED-FUTURE entry: "Phase F — Per-shard infrastructure (Extensions 1 + 2 bundled)" with anti-scope clauses A1-A9 carry-forward.
- New TAGGED-FUTURE entry: "Phase G — Cross-shard correlation (Extension 3)" with anti-scope clauses A10-A16 carry-forward.
- **Addition #26 D4 RECONFIRMED:** v0.2 F2-α + A16 implicitly reaffirm D4 `correlational_not_causal: true` wire-format stance. Architect recommends explicit LEDGER entry "Addition #26 D4 RECONFIRMED at v0.2 emit 2026-05-15" only if D4 surfaces as a near-amendment-candidate in any intervening cycle; otherwise carry forward implicitly until Phase G close walk.

**Pre-existing ADR clauses verified preserved at v0.2 emit** (per Memorial F sub-rule 3 ADR-anti-scope-preservation):

- Q2.B.6.4 ADR clauses 1-5 — PRESERVED (no Family E touch; no engine/detectors/* refactor; no TrendBuffer/orchestrator refactor; no row-pool data structure).
- Q58 close-with-CAVEAT clause 2 — PRESERVED-PERMANENT-POST-PHASE-D (per LEDGER:176; A2 in v0.2 § 2.1).
- Q59 H4 PERMANENT clause 3 — PRESERVED-PERMANENT-POST-PHASE-D (per LEDGER:179; A2 in v0.2 § 2.1).
- Q60 V2 anti-scope clauses 1-8 — PRESERVED (Phase F + G don't touch real-trace ingestion framework; v8X + v9X substrates unchanged at memo emit).
- Q70 SLICE 1 dispatch-table refactor architecture — PRESERVED + EXTENDED at Phase F SLICE 1 (fleet-aware path extension is additive).
- Addition #25 D2 (close-trigger 300s) + D5 (late-arrival grace_seconds) — TAGGED-PENDING-EXTENSION at Phase G SLICE 1 (VerdictGroup scope re-architecture from `(deploy_id, …)` to `(cluster_event_id, …)`; preserved-vs-amended walk at SLICE 1 spec-emit).
- Addition #26 D4 (correlational-not-causal wire-format) — PRESERVED-RECONFIRMED at v0.2 emit; PR-F7 empirical evidence at Phase G SLICE 4 reaffirms.

---

## Mac Claude pasteable inputs

**NONE at this fidelity.** No Mac Claude routing emitted at v0.2 SCOPE-PROPOSAL fidelity per the TPM intake commitment 2026-05-15 ("No Mac Claude routing emitted yet — this is scoping fidelity, not implementation"). Mac Claude pasteable inputs (scope, halt boundaries, anti-scope ledger updates, Memorial D candidate-set application points, acceptance criteria) draft at Phase F SLICE 1 spec-emit POST-John-disposition (clean-close path).

Architect commitment for Phase F SLICE 1 spec-emit Mac Claude pasteable:
- Spec scope: dispatch-table refactor extension + self-normalized fallback fleet-aware variant + `shard_id` cell dimension schema addition + `per_shard_cells` compiled-config field. NO substantive per-shard predicate logic; NO fleet-merge e-process logic yet (those land at SLICE 2-3).
- Halt boundaries: any encounter with anti-scope A1-A16 triggers halt-and-route-back per `anchor/skills/06-anti-scope-ledger.md` protocol.
- Memorial F P3.3 grep at Step 0: open all runtime read paths consuming the modified substrate; verify spec covers all.
- `superpowers:writing-plans` mandatory for the SLICE 1 spec's implementation plan; `superpowers:test-driven-development` mandatory for the Mac Claude execution; `superpowers:anti-self-confirming-tests` (anchor skill 13) + `superpowers:verification-before-completion` mandatory at Mac Claude completion.

---

## Acceptance criteria

**NONE at SCOPE-PROPOSAL fidelity** (no §5 AC table by definition at this fidelity per Q-NN-SPEC-TEMPLATE). Acceptance-criteria-equivalents at SCOPE-PROPOSAL fidelity are the architect-pre-prediction probability bands in v0.2 § 7 and the architect-pre-prediction acceptance gates in § 8 items 10-12 (pair-review investment, Skill 15 + hybrid Reviewer commitments at named SLICEs).

Phase F SLICE 1 acceptance criteria drafted at spec-emit per `anchor/skills/15-prescription-to-AC-coverage.md` discipline (mandatory pre-route gate per v0.2 § 8 item 11). Estimated 8-12 prescriptions per spec; per-prescription AC-binding verification ~5-10 min each.

---

## Routing

Architect output flows to TPM. TPM packages v0.2 memo + this disposition artifact + reference to Reviewer report for John. John reviews + dispositions on Q-J1 through Q-J6.

**TPM packaging checklist (pre-route grilling per `anchor/skills/04-pre-route-checklist.md`):**

- [ ] Canonical version verification: v0.2 (not v0.1) is the current memo state; Reviewer report references v0.1 explicitly.
- [ ] Routing pasteable leads with one fenced code block per `feedback_pasteable_direction`.
- [ ] Anti-scope-ledger walk verified preserved (this disposition § ADR clauses).
- [ ] Memorial D state evolution stamp visible to John (21V/8C; 5th sub-instance of 8th CONFIRMATION class).
- [ ] Q-J1 through Q-J6 surfaced as discrete decision points (not blended into prose).
- [ ] Forward-looking architect commitments (Skill 15 mandatory at SLICE 1; hybrid Reviewer at SLICE 3 + close walks) flagged so John can decline / amend.

---

_Disposition authored: 2026-05-15 (same-day as Reviewer pass + v0.2 emit). Cycle close: v0.1 emit → Reviewer cold-context audit → architect intake (this artifact) → v0.2 amended emit → TPM packaging → John disposition pending. Per PROJECT-ROLES:53 cycle ordering._
