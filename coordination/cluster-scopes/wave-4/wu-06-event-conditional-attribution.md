# Cluster scope — WU-06 SLICE 4 event-conditional attribution (Wave 4 / R34)

_PRD scope block for cluster `wu-06-event-conditional-attribution`. **Runs in main worktree** (single-cluster wave; no `multi-track-cluster-setup.sh`). Full tier (Architect + Implementer + Reviewer + Memorial-Updater). Architect reads this + the 6 `coordination/CLUSTER-HANDOFF-3-*-WU06.md` artifacts + WAVE-GATE-03 § Pre-flags + WAVE-PLAN-03 § Step 6 as primary inputs._

## Tier verdict

**`full`** per WAVE-PLAN-03 Step 6 Coordinator prior (A1+A2+A4+A6+PR-F7):
- A1 (new dependency surface: deployment-event-feed; genuinely novel ingestion per SCOPING-MEMO § 2.3)
- A2 (new architectural pattern: event-conditional attribution layer using CausalImpact/synthetic-control/interrupted-time-series methods)
- A4 (novel data model: cluster_event_id-scoped attribution candidates; FiredShardEvent → event-conditional candidate transform)
- A6 (blast radius: A16 wire-format invariant must be preserved at every event-conditional emit site — D4 reversal would invalidate the inherited Addition #26 honest-broker stance)
- PR-F7 hybrid Reviewer pair-review trigger condition (per SCOPING-MEMO § 2.3 + § 4.4 — but PR-F7 fires at Phase 2 CLOSE per § 4.4, WU-07 not WU-06; WU-06 PRODUCES the 4-cell evidence matrix that WU-07's hybrid Reviewer audits)

## PRD source

- `coordination/PRD.md` FR-E3c (cross-shard correlation: event-conditional correlational attribution per inherited Addition #26 D4)
- `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (c) "event-conditional correlational attribution" + § 3 SLICE 4 row + § 4.2 R-S3 (pre-Phase-2-activation freeze-hook hazard) + R-S5 (event-triggered-but-not-event-attributable drift) + § 4.4 PR-F7 mandate
- `coordination/CLUSTER-HANDOFF-3-WU05-WU06.md` — SLICE 4 entry framing supplement (R32 close-walk § 3 abbreviated; this handoff carries the framing)
- `coordination/CLUSTER-HANDOFF-3-WU04-WU06.md` — **D1 HIGH; A16 binding-precedent table; HIGHEST RELEVANCE — event-conditional attribution is highest-risk D4 reversal surface across all of Tessera. Match WU-04 + R32 binding precedent.**
- `coordination/CLUSTER-HANDOFF-3-WU{00,01,02,03}-WU06.md` — D2 MEDIUM interface-only edges (L0 contract + 3 vendor topology adapters)
- `coordination/WAVE-GATE-03.md` § Pre-flags table — all 5 dispatch pre-flags applicable
- `coordination/WAVE-PLAN-03.md` § Step 6 tier classification + § Open questions (3 NEW OQs with defaults)

## Scope (4 architectural surfaces; single cluster per WAVE-PLAN-03 Step 3 Judgment call 1 — D1 HIGH chains across 06a/06b/06c sub-candidates forbid clean fan-out)

### Surface 1 — Deployment-event-feed ingestion (NEW Tessera-original substrate)

New compile-time substrate addition (per SCOPING-MEMO § 2.3 Extension 3 (c)). Fleet-level deployment-pipeline event stream covering: model redeploy, firmware push, env change, config change, capacity change. Architecturally analogous to inherited `flags` input on the orchestrator (per `deploysignal/ARCHITECTURE.md` tick contract `{live, baseline, flags}` at SHA `5a72371`) but at **cluster-event scope rather than per-deploy scope**.

**Per OQ-W3-1 default A:** Single-file location `engine/events/event-feed.ts` (matches WU-00 + WU-04 single-file convention). Architect may override if Brainstorm phase surfaces structural reason; document deviation.

**Producer-side substrate.** Architect defines:
- Event schema (closed-set vs extensible per OQ-W3-4 forward-looking; Architect Brainstorm call)
- Event-source contract (caller provides events; Tessera consumes; mirrors inherited `flags` input pattern)
- Event-id assignment (relates to `cluster_event_id` field added at R18; needs Architect decision on whether event-id ≡ cluster_event_id or distinct)
- Synthetic test fixture per WAVE-GATE-03 pre-flag (NO live deployment-pipeline endpoints — A8/A11 anti-scope)

### Surface 2 — Event-conditional correlational attribution layer

CausalImpact-class methods (CausalImpact / synthetic control / interrupted time series — same statistical primitives as DeploySignal honest-broker per SCOPING-MEMO § 2.3 "Critical preservation: Addition #26 D4 correlational-not-causal stance"). Different epistemic claim: event-conditional drift is correlational-with-evidence, NOT causal.

**File location** (Tessera-original; sibling to `engine/topology/common-mode-attribution.ts`):

- **Primary module:** `engine/events/event-conditional-attribution.ts` (Tessera-original)

**Consumer surfaces:**
- WU-00 L0 contract for any counter-typed event metric ingestion (D2 MEDIUM; interface-only — Architect decides if attribution path itself ingests counters or only consumes already-attributed verdicts)
- WU-04 common-mode-attribution shape for parallel-class architectural pattern matching (D1 HIGH; A16 wire-format precedent)
- R20 VerdictGroup + cluster_event_id scope (consumes per-shard fused verdicts scoped to cluster_event_id)
- R21 fleet-merge consumer layer (consumes the fleet-merged verdict stream)
- R23/R28/R29/R30 topology adapters (D2 MEDIUM; interface-only — topology context may inform attribution if event correlates with topology subset)

### Surface 3 — Phase 1 freeze-hook activation coupling

Per SCOPING-MEMO § 4.2 R-S3 (pre-Phase-2 activation hazard: "Fleet-aggregate baseline staler than per-shard residual; drift mis-attribution under fleet-event-without-freeze-hook"). The freeze-hook was pre-engineered into Phase 1 SLICE 2-3 baseline-cells substrate (per SCOPING-MEMO carry-forward); Phase 2 SLICE 4 activates the coupling — when a fleet-level deployment event fires (via Surface 1 ingestion), the per-shard baseline-cells substrate freezes its accumulation for a post-event window so the event-driven drift is NOT absorbed into per-shard residual.

**Per OQ-W3-2 default A:** Vendored-with-deltas on inherited Phase 1 substrate (matches R20 verdict-groups.ts + R32 verdict.ts precedent). Architect applies the two-step maintenance pattern UPFRONT in spec component inventory (manifest + AT_PIN_FILES per PHASE-2-SLICE-1-CLOSE-WALK § 2).

**Inherited substrate path:** likely `engine/baseline-cells.ts` or `engine/per-shard-residual.ts` (Architect verifies at session entry per empirical-premise-verification reinforcement — do NOT cite from memory).

**Mechanism:** when event-feed emits a fleet-event, Surface 3 freezes per-shard baseline accumulation for `event_freeze_window_seconds` (Architect picks default; spec ships configuration knob via inherited `CompiledConfig` pattern).

### Surface 4 — PR-F7 4-cell evidence matrix (production for WU-07 close-walk hybrid Reviewer audit)

WU-06 produces the 4-cell evidence package; WU-07 SLICE 3 close-walk's hybrid Reviewer audits it. Cell shape:

| Cell | Event injection | Per-shard verdict pattern | Attribution outcome |
|---|---|---|---|
| 1 | YES fleet-event | YES correlated per-shard fires | event-conditional candidate surfaces correctly (positive sensitivity) |
| 2 | NO event | NO per-shard fires | no false attribution (positive specificity) |
| 3 | YES fleet-event | NO per-shard fires correlated with event | no false-positive event-attribution (negative specificity) |
| 4 | YES fleet-event + YES unrelated per-shard fires | mixed | event-conditional candidates surface for correlated subset; unrelated fires correctly NOT event-attributed (mixed-signal robustness) |

Each cell ships as an empirical AC against synthetic event-feed + synthetic per-shard verdict stream on the v9Y substrate (or v9Z if WU-06 Architect needs richer fixture).

**External literature citation package** (per PR-F7 trigger; mirrors WU-04 PR-F6 discipline):
- CausalImpact (Brodersen et al. 2015 "Inferring causal impact using Bayesian structural time-series models")
- Synthetic control (Abadie 2021 "Using synthetic controls: feasibility, data requirements, and methodological aspects")
- Interrupted time series (Bernal et al. 2017 "Interrupted time series regression for the evaluation of public health interventions")
- Each citation: URL + retrieval date + verbatim quote relevant to event-conditional attribution methodology

## Acceptance criteria

**AC enumeration is the Architect's job.** Architect spec'ies ACs covering:

- 4 PR-F7 cell ACs (one per cell; explicit empirical AC against synthetic substrate)
- Event-feed ingestion ACs (schema; producer-side contract; event-id semantics; synthetic fixture round-trip)
- Event-conditional attribution ACs (correlational-not-causal wire-format; CausalImpact-class method invocation; cluster_event_id scope correctness; topology-aware event scope optional)
- Freeze-hook activation ACs (event fires → baseline-cells freeze for window; window expires → freeze releases; non-event-driven drift NOT frozen)
- **A16 wire-format binding ACs (HIGHEST RELEVANCE per WAVE-GATE-03 pre-flag) — regex with /m anchor + JSON-serialized round-trip at every event-conditional emit site. Match WU-04 + R32 binding precedent.**
- External literature citation ACs (4 citations verified + verbatim quotes captured in evidence package)
- Anti-scope diff AC (SHA-pinned to chore-A SHA; TQ-4 γ pattern)
- Typecheck + test count ACs (per R22 IMPL MINOR-1; **anchored to chore-A SHA explicitly; encode actual baseline empirically per WAVE-GATE-03 pre-flag — main-worktree at HEAD `c503edb` shows tests=305/pass=299/fail=6**; do NOT reframe per false-compliance-attestation rule)

Target AC count: 18-24 (higher than typical full-tier round due to PR-F7 4-cell matrix + freeze-hook coupling + vendored-with-deltas pattern application).

## Apply all 5 cross-project rules UPFRONT (per WAVE-GATE-03 Rule 5 derivation)

1. **`false-compliance-attestation`** — actual binding-command results encoded verbatim (no reframing).
2. **`architect-branch-binding-coverage`** — trace data-flow not just syntax; every branch in pseudocode mapped to binding AC or § acknowledged-gap.
3. **`implementer-spec-test-assertion-coverage`** — for each AC, every Then-column field asserted one-for-one.
4. **`anti-scope-allowed-set-forward-coverage`** — chore-A allowed-set includes `^coordination\/reviews\/REVIEWER-REPORT-R34\.md$` + `^coordination\/MEMORIAL\.md$` regex carve-outs.
5. **`rule-derivation-without-self-application` (NEWLY DERIVED at R33 gate)** — Architect performs explicit self-audit at spec-emit time: grep test pseudocode for `content.includes(`, `.length > 0`, `typeof x ===`, `assert.ok(` patterns; apply mutation test to each (could production return a different-but-structurally-valid value and still pass?); record results inline in spec § 9-class sweep. First procedural application of Rule 5 at the dispatch layer per WAVE-GATE-03 routing.

## OQ defaults applied (per overnight authority + Coordinator recommendations)

- **OQ-W3-1 = A** (event-feed file at `engine/events/event-feed.ts`; single-file convention)
- **OQ-W3-2 = A** (freeze-hook = vendored-with-deltas on inherited Phase 1 substrate; two-step maintenance UPFRONT)
- **OQ-W3-3 = B** (SCOPING-MEMO MAJOR-1 surgery deferred to WU-07 close-walk; cleaner scope-bounding)
- **OQ-W3-4** (event-feed schema closed-set vs extensible) — Architect's Brainstorm-phase call; document in spec

Architect MAY override any default at spec-emit time IF Brainstorm surfaces structural reason; must document override rationale in spec preamble.

## Anti-scope (R34 hard limits)

- **A12 — NO modification of inherited vendored-at-pin engine internals** beyond architecturally-anchored extension points per OQ-W3-2 freeze-hook coupling.
- **A10 — NO hardware *diagnosis*** (event-feed ingests *deployment* events, not hardware-fault signals; the A10 carve-out is for measurement-domain L0 preprocessing — separate from event-feed scope).
- **A11 — NO live deployment-pipeline endpoints** — synthetic event-feed fixtures only.
- **A16 — Addition #26 D4 `correlational_not_causal: true` PRESERVED at every event-conditional emit site. HIGHEST RELEVANCE pre-flag.** Wire-format invariant must be regex-anchored AND JSON-round-trip tested.
- **A13 — NO ML-based attribution model** (rule-based + statistical only; conflicts with inherited calibrated-confidence honest-broker stance per NORTH-STAR Addition #11).
- **NO modification of Wave 1/2/3 deliverables** (R25 L0 contract + R26 MD-F4 + R28/29/30 topology adapters + R32 close-walk doc + R32 vendor-fungibility amendment all frozen).
- **NO modification of `engine/verdict-groups.ts`** (R20 frozen).
- **NO modification of `engine/fleet/verdict-consumer.ts`** (R21 frozen).
- **NO modification of `engine/topology/{common-mode-attribution,slurm-source,k8s-source,nvlink-source}.ts`** (frozen).
- **NO modification of `engine/l0/counter-rate-transform.ts`** (R25 frozen).
- **NO modification of any pre-R34 test file** OUTSIDE the canonical AC-Rxx-13 forward-protection update if needed.
- **NO SCOPING-MEMO MAJOR-1 surgery** — that's WU-07 close-walk scope per OQ-W3-3 = B.
- **NO PR-F7 hybrid Reviewer at R34** — fires at Phase 2 close (WU-07) per SCOPING-MEMO § 4.4. WU-06 PRODUCES the evidence; WU-07 audits.
- **NO opportunistic R32 carry-forward closures unless Architect identifies as in-scope** — R32 OBS-4 (R26 MINOR-2 deferred impl alignment) is the only one explicitly allowed by Coordinator (if WU-06 ships FusedVerdict → FiredShardEvent adapter consumer site; else carry to WU-07). All other R32 carry-forwards → WU-07.
- **NO modification of `multi-track-cluster-setup.sh` or other scripts** (operator-owned methodology backflow).
- **NO CLAUDE-IMPLEMENTER.md consolidation** (operator-triggered MR-2 staged for Phase 2 close per `coordination/STAGED-FOR-PHASE-2-CLOSE.md`).

## Reinforcements in scope (apply during cluster work)

Cross-project rules above (5 total) + standard Tessera-local CLAUDE-{ARCH,IMPL,REVIEWER,MEMORIAL}.md REINFORCEMENTS + R20 spec-internal-contradiction prevention + R21 spec-commit-sequencing + R22 count-AC SHA anchoring + R23 .gitignore-aware spec inventories + R32-hybrid-Reviewer-lessons (audit-tier pre-emit-grilling-gap — N/A here since full tier).

## Cluster context

**Wave 4 of 5 (single cluster).** Sequential per WAVE-PLAN-03 Step 3 Judgment call 1 (D1 HIGH chains across 06a/06b/06c sub-candidates forbid fan-out).

**Upstream dependencies (6 CLUSTER-HANDOFF-3 artifacts):**
- WU-05 SLICE 3 close-walk (D2 — entry-framing supplement)
- WU-04 MD-F4 (D1 HIGH — A16 binding precedent; HIGHEST RELEVANCE)
- WU-00 L0 contract (D2 MEDIUM — interface-only conditional)
- WU-01 SLURM (D2 MEDIUM — interface-only)
- WU-02 K8S (D2 MEDIUM — interface-only)
- WU-03 NVLINK (D2 MEDIUM — interface-only; R-E7 MITIGATED corroboration)

**Downstream dependencies on this cluster's output:**
- WU-07 SLICE 3.D / Phase 2 close-walk (D1 HIGH — hybrid Reviewer audits PR-F7 evidence package; consolidates SLICE 4 outputs into Phase 2 close stamp)

**Wave 4 gate criteria** (Coordinator runs at WU-06 close):
- Reviewer report MERGE-READY
- 0 CRITICAL findings
- All 4 PR-F7 cell ACs produce expected evidence (cell-by-cell pass)
- A16 wire-format invariant preserved (regex-anchored + JSON-round-trip)
- External literature citation evidence package complete
- Freeze-hook coupling activation correctly fires + releases per spec
- Vendored-with-deltas two-step maintenance pattern landed (manifest + AT_PIN_FILES)

## Halt conditions (escalate to Coordinator)

1. **A16 D4 reversal surface emerges** (any event-conditional emit path that cannot preserve `correlational_not_causal: true` literal under cold-Reviewer audit) — HALT + DIAGNOSTIC + ESCALATE. Highest-priority halt.
2. **Freeze-hook coupling requires modifying inherited Phase 1 substrate beyond vendored-with-deltas extension points** — A12 implication; route back via Coordinator.
3. **External literature for PR-F7 cells insufficient or contradictory** — surface as OQ rather than weakening the PR-F7 standard.
4. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per false-compliance-attestation rule.
5. **Event-conditional attribution surfaces a structural false-positive class that cannot be eliminated by AC tuning** — route back with failure-mode characterization.
6. **Rule 5 self-application sweep at spec-emit time identifies a non-discriminating AC the Architect cannot strengthen without scope expansion** — HALT for operator decision (don't ship the weak AC; don't expand scope unilaterally).

## Round

`R34` (Wave 4, single cluster).

## Branch

`main` (no worktree; runs in main project root).

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R34 --tier full
```

(NO `--coordinator`; NO `HYBRID_REVIEWER=true` — PR-F7 hybrid Reviewer fires at WU-07, not here.)
