# REVIEWER-REPORT — Fleet-Mode Scoping Memo v0.1

_From: Reviewer (cold-context audit). To: Architect (direct route per PROJECT-ROLES:25; NOT via TPM)._
_Date: 2026-05-15._
_Audit target: `coordination/ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md`._
_Scope: SCOPE-PROPOSAL fidelity verification + cross-cutting checks (P3 axis 2 coord-trail + axis 1 concrete-values + axis 3 file-opened) + Superpowers-phase-discipline retroactive application (brainstorm-pass + re-read-as-next-role)._
_Discipline anchors: DISCIPLINE-REFERENCE:185-196 (Reviewer audit cycle) + anchor `skills/01-pre-emit-grilling.md` (three-bucket adversarial pass)._

---

## Audit summary

| Class | Count | Items |
|---|---|---|
| **FAIL** | 2 | F1 Existing-architecture-coverage; F2 D4-causal-stance-conflict |
| **GAP** | 8 | G1-G8 (concrete-values; storage math; extension imbalance; counting; brainstorm-miss; overconfidence; missing anti-scope; aggregation-scope) |
| **PASS** | 6 | P1-P6 (SCOPE-PROPOSAL fidelity preserved; anti-scope load-bearing; Memorial D candidate-set anchored; preserved-clauses respected; dependency graph correct; all 5 requested sections covered) |

FAIL on core invariants (F1, F2) gates Phase F SLICE 1 spec-emit entry — architect MUST amend memo to v0.2 before TPM routes to Phase F SLICE 1. GAPs resolve in parallel (can ship in v0.2 alongside FAIL fixes, or carry-forward into spec-emit phase as documented open Qs).

---

## FAIL findings

### F1 — Existing architecture coverage missing for Addition #25 + #26

**Severity:** FAIL on core invariant (P3 axis 3 file-opened; axis 2 coord-trail).

**Finding:** Memo § 2.3 Extension 3 frames cross-shard correlation as "does not exist today; new ingestion surface" and "highest-novelty extension." This is wrong at the architectural-primitive level. Two primitives already shipped:

- **Addition #25 (ARCHITECT-REPLY-47) — L3b VerdictGroup aggregator** (`engine/types/verdict.ts:141-188`). Post-L3 incident-aggregation layer; consumes FusedVerdict per tick and produces VerdictGroup per incident. **This IS Extension 3 candidate (a) outer aggregator's natural extension point** — fleet-mode adds shard_id to the aggregation scope (currently scoped to `(deploy_id, window_start_ts)`).
- **Addition #26 (ARCHITECT-REPLY-48) — Topology overlay** (`engine/topology-overlay.ts:1-100+`; `engine/types/verdict.ts:190-260`). Post-#25 enrichment layer; pure-additive; VerdictGroup stays topology-agnostic (D5). **TopologySource IS an abstract interface (D1 Option E) explicitly designed so v2 can add Istio / K8s / Linkerd impls without schema churn** — fleet-mode's hardware-topology source (NVLink / rack / PSU / cooling-zone) would be another `v2 add` against the same `TopologySource` interface.

**Why it matters:**

1. **Q-cycle estimate is materially affected.** Phase G SLICE 1 in the memo is framed as "synthetic-cluster substrate generation + schema for cluster topology + mapper class scaffolding; no detector logic" — but the schema + mapper-class-scaffolding is already shipped at L3b + topology-overlay. Phase G SLICE 1 should be much smaller (1-2 Q-cycles, possibly absorbed into SLICE 2). Phase G total drops from 10-14 to ~8-12 Q-cycles.
2. **Architectural cleanliness improved.** Extension 3 (a) outer aggregator is no longer a new layer — it's a scoping extension of L3b VerdictGroup aggregator. The contract surface is the existing `VerdictGroup` interface plus a new `shard_id` scope field.
3. **Pair-review trigger conditions shift.** PR-F6 (topology-aware common-mode) no longer needs to validate the topology-source interface; it validates the new TopologyNode kind extension (`'gpu_shard' | 'rack' | 'psu' | 'cooling_zone'` extending the current `'service' | 'database' | 'queue' | 'external'` enum).

**Discipline class:** Memorial D 9th-CONFIRMATION-class candidate (architect-grilling-discipline-pre-empirical-mechanism-capture variant) — would have been caught at P3 axis 3 file-opened (architect opens every file mentioned in contract surfaces) at brief-drafting time. Acceptance-criterion-failure-precedent: Q58 line-38 Family E re-introduction class (LEDGER:19 — "Architect didn't open Q2.B.6.4 ADR before drafting Q58 Family E pool architecture"). Same class at fleet-mode scoping fidelity: architect didn't open `engine/types/verdict.ts` or `engine/topology-overlay.ts` before drafting Extension 3 framing.

**Architect required action for v0.2:**
- Amend § 2.3 Extension 3 recommended-approach to BUILD ON Addition #25 / #26 explicitly. Recommended approach text: "Extension 3 (a) extends L3b VerdictGroup aggregator with shard_id scope; (b) implements a HardwareTopologySource (NVLink / rack / PSU / cooling-zone) against the existing TopologySource interface, extending TopologyNode.kind enum; (c) extends VerdictGroupWithTopology with event-feed conditioning."
- Amend § 2.3 inventory-inputs to note "TopologySource interface ALREADY EXISTS at `engine/topology-overlay.ts`; new ingestion is the HardwareTopologySource concrete impl, NOT a new abstract interface."
- Amend § 2.4 dependency graph to clarify Phase G is layering on existing L3b + topology-overlay, not building from scratch.
- Re-tighten Q-cycle estimate: Phase G SLICE 1 collapses to 1-2 cycles; total Phase G drops from 10-14 to ~8-12.

---

### F2 — D4 correlational-not-causal stance conflicts with Extension 3 (c) framing

**Severity:** FAIL on core invariant (P3 axis 2 coord-trail; Memorial D architectural-layer-coverage).

**Finding:** Memo § 2.3 Extension 3 recommends candidate (c) "event-conditional causal attribution" as one of three sub-mechanisms in the hybrid cascade. The memo cites CausalImpact / synthetic control literature (Brodersen et al 2015; Abadie et al 2010) and frames the pitch claim as "DeploySignal can tell you it's the deploy, not the cluster" — a causal-attribution claim.

**Conflict:** Addition #26 (ARCHITECT-REPLY-48) D4 explicitly refuses causal framing for TopologyCandidate. From `engine/types/verdict.ts:237-240`:

> A correlational candidate surfaced for a VerdictGroup. Explicitly NOT a causal claim per D4 — `correlational_not_causal: true` is a required literal label on the wire.

The required-literal-label-on-the-wire is a load-bearing schema constraint. Extension 3 (c) as framed in the memo proposes a causal attribution layer; this either (a) requires reopening D4 (re-architecting Addition #26's correlational-only stance) or (b) requires re-framing (c) as **conditional-correlational** attribution rather than causal attribution — same statistical primitives, different epistemic claim, same `correlational_not_causal: true` schema discipline.

**Why it matters:** the "DeploySignal can tell you it's the deploy, not the cluster" pitch claim is the load-bearing pair-review-triggering outcome for PR-F7. If the architectural stance is correlational-only (per D4), the pitch claim must be **calibrated** — "elevated conditional-correlational evidence that drift is event-attributable" rather than "DeploySignal causally attributes drift to the deploy." This is exactly the calibrated-confidence honest-broker stance (NORTH-STAR Addition #11) the memo cites elsewhere; applying it consistently to Extension 3 (c) means the pitch claim shape changes.

**Discipline class:** Memorial D candidate — the architectural-layer-coverage discipline at hypothesis-tree time requires enumerating ALL architectural layers between calibration source and runtime consumption. The D4 stance IS a runtime-consumption-layer constraint (the wire-format schema); not enumerating it produced the conflict. Architect-grilling-pre-empirical-mechanism-capture variant; same 8th CONFIRMATION class lineage as Q66 LS-1 (LEDGER:142).

**Architect required action for v0.2:**
- Two options for resolution; architect picks at v0.2:
  - **Option α (recommended):** preserve D4; re-frame Extension 3 (c) as "event-conditional correlational attribution" rather than "causal attribution." All MD-F5 + PR-F7 framing updates from "causal" to "conditional-correlational". Pitch claim re-calibrates per NORTH-STAR Addition #11 stance.
  - **Option β (deferred):** re-open D4 at Phase G; architectural ADR reversal; spec-emit Phase G SLICE 1 includes a separate D4-reversal sub-track. Higher Q-cycle cost; load-bearing for ADR-anti-scope-preservation sub-rule discipline.
- Add applicable-ADR check to § 6 Memorial F sub-rule application: Addition #26 D4 clause is an active ADR clause; Memo § 2.3 sub-rule 3 application must explicitly enumerate "Addition #26 D4 correlational-not-causal" as a clause to PRESERVE-or-RETIRE.
- Cross-reference v0.2 in LEDGER entry: Addition #26 D4 clause goes from PRESERVED → either PRESERVED-RECONFIRMED (option α) or TAGGED-PENDING-RETIREMENT (option β).

---

## GAP findings (resolve in parallel; non-blocking for v0.2)

### G1 — Unverified tick-rate citation

Memo § 2.2 Extension 2 cites "the cluster's per-shard tick cadence (~5s in current ARCHITECTURE.md tick rate)." Verification: `ARCHITECTURE.md:12` says "Every tick, the orchestrator receives `{live, baseline, flags}`..." but **does not specify a tick rate.** Grep across `engine/` finds `DEFAULT_FETCH_TIMEOUT_MS = 5000` in `topology-overlay.ts:57` but this is the topology-fetch timeout, NOT the orchestrator tick rate. The "~5s" claim is fabricated.

**Architect required action:** P3 axis 1 (concrete-values) discipline — either (a) cite the actual tick rate from a verified source (grep `engine/core.ts` + scenario-pool tick generation), or (b) re-phrase to "the cluster's per-shard tick cadence (rate parameterized at deploy time; see `engine/core.ts:TICK_RATE_*` for current default)." Cold-start latency engineering target in Q-J2 depends on this; revise the architect-pre-prediction accordingly.

### G2 — Storage footprint estimate off by ~50×

Memo § 4 R-E1 states "at N=10000 shards × ~168 cells × 11-15 signal vector × covariance matrix, naive storage is ~O(N · cells · p²) ≈ 200GB+."

Reviewer sanity-check: N=10000 × cells=168 × p²=225 floats × 8 bytes = **3.36 GB**, NOT 200 GB. Even at full cell-matrix expansion with tenant_tier (×5) + workload_class (×4) dimensions = 3360 cells per shard: 10000 × 3360 × 225 × 8 ≈ 60 GB. Still under 200 GB by ~3-30×.

The "200GB+" claim is hand-wavy and undercuts the architect-pre-prediction "1.2-1.5× single-instance footprint" — if the naive estimate is wrong by 50×, the 1.5× prediction is comparing to a wrong baseline, and PR-F5's pair-review trigger condition is poorly specified.

**Architect required action:** P1 inline-derivation + P6 empirical-profile discipline. Replace the "200GB+" line with explicit derivation (N × cells × p² × bytes-per-float, with cell-matrix dimension count cited from NORTH-STAR Addition #2 + #23) at the naive end; preserve the architect-pre-prediction at sparse-residual-encoding end; make the comparison ratio meaningful. Memo § 4 should derive both endpoints with shown math.

### G3 — Extension 3 prose noticeably longer than Extensions 1 + 2

Word-count audit: Extension 1 ≈ 660 words; Extension 2 ≈ 880 words; Extension 3 ≈ 1100 words. Extension 3 is ~25% longer than Extension 2 and ~65% longer than Extension 1. Justification in the memo ("highest-novelty extension; three sub-mechanisms") is real, but the imbalance suggests Extensions 1 + 2 are under-developed relative to Extension 3.

**Architect required action:** at v0.2, decide whether to (a) expand Extensions 1 + 2 to symmetric depth, OR (b) compress Extension 3 to symmetric depth, OR (c) accept asymmetry with explicit "Extension 3 receives expanded treatment because [reason]" clause. Reviewer recommends (c) with explicit acknowledgment — the asymmetry is architecturally defensible given the F1 finding (Extensions 1 + 2 reuse existing primitives; Extension 3 even with F1 amendment is structurally newer).

### G4 — Pair-review trigger count inconsistent

Memo § 6 states "7 pair-review triggers identified: PR-F1 through PR-F7." But PR-F3 is labeled "PRE-EMPTED, not triggered." Actual triggered-firing count is 6 (PR-F1, PR-F2, PR-F4, PR-F5, PR-F6, PR-F7); identified-total count is 7.

**Architect required action:** clarify wording in § 6 — "7 pair-review trigger conditions enumerated; 6 trigger-firing, 1 pre-empted as sub-mechanism." Minor finding; cosmetic.

### G5 — Missing meta-level brainstorm (Superpowers brainstorm-phase miss)

Per the Superpowers brainstorm-phase discipline (enumerate 3 approaches with tradeoffs), the architect should have enumerated alternative MEMO STRUCTURES, not just alternative implementations within each extension. Candidates:

- **Memo structure (a):** single Phase F covering all three extensions [chosen]
- **Memo structure (b):** three separate phases F / G / H, one per extension
- **Memo structure (c):** fold fleet-mode into Phase E (production deployment hardening) rather than spawning new phase letters
- **Memo structure (d):** [the chosen] Phase F (Extensions 1 + 2 bundled) + Phase G (Extension 3) — the bundling reduces α-bookkeeping double-touch risk

**Architect required action:** at v0.2, add a § 1.5 "Memo structure options considered" sub-section with explicit P2 enumeration of (a)-(d) and justification for (d). This is meta-architectural cleanliness; load-bearing for future SCOPE-PROPOSAL-class artifacts to internalize the brainstorm discipline at the structural level.

### G6 — Architect-pre-prediction probability overconfidence at clean-close

Memo § 7 estimates (a) clean-close at ~55%. Reviewer flag: 6 architectural decision-points (Q-J1 through Q-J6) is a lot of decision surface. Probability that John dispositions cleanly on ALL 6 without amendment requests is plausibly lower (~35-45% if decisions are roughly independent and each has ~85-90% architect-aligned probability). 55% may be overconfident.

**Architect required action:** at v0.2, recalibrate § 7 probability bands. Reviewer pre-prediction: 40% (a) clean-close; 15% (b) decline-to-activate; 30% (c) partial-activation; 15% (d) memo-amend. Architect-side judgment call.

### G7 — Missing anti-scope: multi-region / cross-cluster federation

Memo § 2 enumerates 14 anti-scope clauses (A1-A14). Reviewer hunt for missing tempting-absorption candidate:

- **A15 (missing):** NO multi-region / cross-cluster federation. Fleet-mode is intra-cluster (one DC, one cluster, N shards). Cross-cluster federation (multi-DC, hierarchical fleet aggregator over multiple clusters) is a natural absorption candidate at Phase G ("we've solved cross-shard, why not cross-cluster?") and is explicitly out-of-scope. Tempting because the architectural pattern is symmetric (one more level of hierarchical aggregation); deferred because the operational surface is different (cross-cluster has network partition + clock-skew + cluster-federation-protocol concerns that intra-cluster doesn't).

**Architect required action:** add A15 to § 2.3 anti-scope. Minor; aligned with "scope creep prevention at the boundary" anti-scope-ledger discipline.

### G8 — VerdictGroup aggregation scope vs fleet-mode aggregation scope

Related to F1 but distinct: VerdictGroup is currently scoped to `(deploy_id, window_start_ts)` (verdict.ts:158). Fleet-mode's cross-shard aggregation scope is `(cluster_event_id, window_start_ts)` where `cluster_event_id` may span multiple `deploy_id`s (a fleet-level firmware push or env change applies to all shards in the cluster regardless of which deployment they serve). The scope re-architecture is NOT trivial — it touches close-trigger semantics (D2 default 300s window), late-arrival-verdicts (D5 grace_seconds), and group_id format (`group-{deploy_id}-{window_start_ts}`).

**Architect required action:** at v0.2, add to § 2.3 Extension 3 implementation-surface enumeration: "VerdictGroup scope extension from `(deploy_id, window_start_ts)` to `(cluster_event_id, window_start_ts)` is a load-bearing schema/scope amendment; Phase G SLICE 2 (outer aggregator) cost is dominated by this re-scoping, not by the aggregation algorithm itself." Cross-reference Addition #25 D2 close-trigger + D5 late-arrival clauses for preservation/amendment status.

---

## PASS findings (what holds up)

### P1 — SCOPE-PROPOSAL fidelity preserved

Memo follows Q-NN-SPEC-TEMPLATE frame at reduced fidelity correctly: no pseudo-code per file; no AC numbering; phase-letter granularity (not Q-cycle/ticket level); architect-pre-prediction probability bands present; discipline-archive significance section present. Self-classification as SCOPE-PROPOSAL is accurate.

### P2 — Anti-scope clauses are load-bearing, not boilerplate

14 anti-scope clauses (A1-A14). Spot-check:
- A1 (NO Bonferroni) — specific candidate-list-rejection with cited reasoning; not boilerplate.
- A2 (NO per-shard amplification-factor tuning) — cross-reference to Q58 clause 2 + Q59 clause 3 PRESERVED-PERMANENT-POST-PHASE-D; load-bearing carry-forward.
- A4 (NO single-scalar fleet verdict roll-up) — specific tempting-absorption candidate (operator-API-simplicity); load-bearing.
- A10 (NO hardware-diagnostic territory) — explicit boundary at NVIDIA-stack scope; pre-route grilling check #1 confirms.
- A13 (NO ML-based attribution model) — cross-reference to NORTH-STAR Addition #11 honest-broker stance; load-bearing.

PASS. (G7 adds A15 to the list as a missing case, but the existing 14 are all real.)

### P3 — Memorial D candidate-set additions correctly anchored

5 candidate-set additions (MD-F1 through MD-F5) all anchor to the 8th CONFIRMATION class lineage (architect-grilling-discipline-pre-empirical-mechanism-capture variant; Q63 Q1 Suggestion 1 sub-instance accumulation discipline anchor). Lineage is correctly cited (LEDGER:142; DISCIPLINE-REFERENCE:99-101). External-source verification triggers are correctly identified for each.

PASS. (F2 amendment may add MD-F6 covering Addition #26 D4 architectural-layer-coverage at hypothesis-tree time; architect picks at v0.2.)

### P4 — Q58 / Q59 PRESERVED-PERMANENT-POST-PHASE-D clauses correctly preserved

A2 in § 2.1 explicitly preserves Q58 close-with-CAVEAT clause 2 + Q59 H4 PERMANENT clause 3 per LEDGER:176/179. ADR walk in Memo § 6 sub-rule 3 application correctly identifies these as PRESERVED. No anti-scope-ledger violations introduced.

PASS.

### P5 — Dependency graph + circular-coupling structurally correct

§ 2.4 dependency graph identifies the Phase G → Phase F event-feed-to-freeze-hook coupling as a soft circular dependency, correctly noting Phase F is shippable with `freeze_hook_enabled: false` and Phase G activation promotes to `enabled: true`. The cross-phase contract surface (R-E5) is correctly flagged as a P3 axis 2 coord-trail + axis 10 firing-attribution-discipline concern. Phase-letter sequencing recommendation (Q-J6) follows from this graph.

PASS.

### P6 — All 5 user-requested sections covered

1. Executive summary with phase-letter estimate ✓
2. Per-extension scope (recommended approach + anti-scope + Memorial D candidates + pair-review triggers + dependency graph) ✓
3. Q-cycle estimate (count + rough per-cycle sizing) ✓
4. Risk register (statistical / engineering / anti-scope) ✓
5. Open architectural questions for John (decision points TPM routes back) ✓

PASS.

---

## Cross-cutting checks

Per DISCIPLINE-REFERENCE:189-195 (Reviewer audit cross-cutting checks):

| Check | Result | Notes |
|---|---|---|
| α-budget bookkeeping (Ville-bounded + classical-epoch-α split) | PASS (sub-rule discipline applied) | Memo § 2.1 A2 preserves Q58 clause 2 + Q59 clause 3; α-budget guarantee-space split explicit at fleet vs shard level. |
| No-skip policy on statistical-invariant tests | N/A at SCOPE-PROPOSAL fidelity | No test specifications at this fidelity; spec-emit phase will surface. |
| Memorial cross-references current at file-state | FAIL → see F1 + F2 | Architect didn't open `engine/types/verdict.ts` + `engine/topology-overlay.ts` at brief-drafting time; staleness vs file-state surfaced as F1 + F2. |
| Compiled artifact state opened (P3 axis #5) | N/A | No compiled-config claims in memo; spec-emit phase will exercise. |
| Test count drift (STATUS.md + CHEAT-SHEET.md) | N/A | No test deltas at SCOPE-PROPOSAL fidelity. |

---

## Discipline-archive significance

1. **Architect grilling-pre-empirical capture worked for Memorial D candidate-set enumeration but failed for P3 axis 3 file-opened.** The memo enumerates 5 new Memorial D candidates (MD-F1-MD-F5) at brief-drafting time — discipline applied. But the architect did NOT open `engine/types/verdict.ts` or `engine/topology-overlay.ts` to verify the existing Addition #25 + #26 surface — discipline missed. The two disciplines are paired: candidate-set enumeration is incomplete without file-opened verification of the existing architectural surface. **Memorial D candidate addition (post-Reviewer-report): file-opened-discipline-paired-with-candidate-set-enumeration as a refinement of the 9th CONFIRMATION class** — would have prevented F1.

2. **Superpowers brainstorm-phase miss is a load-bearing absence at SCOPE-PROPOSAL fidelity.** The meta-level brainstorm (alternative memo structures) was skipped because the architect was operating without the Superpowers phase prose inlined. This is the load-bearing argument for installing Superpowers MCP before Phase F SLICE 1 spec-emit — at SPEC fidelity, the brainstorm-phase miss would translate into "implementer doesn't know what alternative architectural shapes were considered" which is exactly the P2 option-enumeration failure mode (REPLY-31 class).

3. **SCOPE-PROPOSAL fidelity catches different failure classes than SPEC fidelity.** At SPEC fidelity, P3 axis 3 (file-opened) is enforced by spec-emit-discipline (architect opens every file mentioned in implementation surface). At SCOPE-PROPOSAL fidelity, the implementation-surface section doesn't exist, so the discipline trigger doesn't fire automatically — the architect has to apply it manually. F1 is the consequence. **Candidate refinement to the SCOPE-PROPOSAL-TEMPLATE proposal in v0.1 § 8 item 1: include a § "Existing architectural surface (Reviewer-anchor)" section that forces the architect to enumerate the existing primitives the proposal builds on, before listing what's new.** Single-observation; not yet memorial-accretion-ready, but inform the template draft.

---

## Routing

Per PROJECT-ROLES:25 + 2026-05-06 routing-path correction: this REVIEWER-REPORT flows DIRECTLY to Architect for disposition. Architect intakes; produces v0.2 amended memo + ARCHITECT-REPLY disposition covering F1 + F2 + G1-G8 findings. Architect output flows to TPM for John's routing.

**Architect required next-step:**
- Disposition each finding (PASS-confirm / FAIL-amend / GAP-amend / DEFER-with-reason).
- Amend memo to v0.2 with F1 + F2 minimum; G1-G8 batched into v0.2 or carried forward to spec-emit per architect judgment.
- Memorial D state evolution: pre-Reviewer-report at 20V/8C; post-Reviewer-report disposition will increment V count by 1-2 (F1 + F2 are both architect-side capture-misses at brief-drafting time) depending on whether they're classified as one CONFIRMATION class sub-instances or two distinct VIOLATIONS. Architect picks at disposition.

**TPM (downstream of architect):**
- Route v0.2 memo to John once architect closes disposition cycle.
- LEDGER update if F2 dispositions to option β (D4 re-opening) — add TAGGED-PENDING-RETIREMENT entry under Addition #26.

---

_Report authored: 2026-05-15. Audit duration: ~30 min cold-context Reviewer pass. Format consistent with REVIEWER-REPORT-NN.md project convention (DISCIPLINE-REFERENCE:185-196). For the v0.1 memo this report audits, see `coordination/ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md`._

_Methodology note: this audit was performed without Superpowers MCP installed; the re-read-as-next-role + adversarial-counterargument disciplines were inlined manually. Phase F SLICE 1 spec-emit (when activated post-John-disposition) will use Superpowers MCP per the agreed sequencing — install via `claude mcp add superpowers` before spec-emit kickoff._
