# PHASE-2-CLOSE-WALK.md
# Tessera Phase 2 Close-Walk — R36 (2026-05-18)
# Status: HARD STOP after this round. Phase 3 requires separate operator authorization.

---

## § 1 Phase 2 Scope Summary

Phase 2 extended the Tessera per-shard observation layer with: (a) fleet-topology structures + BFS attribution, (b) L0 contract invariants, and (c) event-conditional correlational attribution. Implemented across Rounds R20–R36 in 4 slices.

| Slice | Rounds | Key Deliverables |
|---|---|---|
| SLICE 1 | R20–R21 | VerdictGroup + cluster_event_id scoping (WU-01/02); VerdictGroup sort order; cluster_event_id threading |
| SLICE 2 | R22–R25 | NVLink topology adapter (WU-03); L0 contract (WU-00); topology graph structures; scrape-interval first-class input |
| SLICE 3 | R26–R32 | Common-mode attribution BFS (WU-04); Slurm topology adapter (WU-05); event-conditional attribution (WU-06); SLICE 3 close-walk |
| SLICE 4 | R33–R36 | Event-conditional attribution completion (WU-06); Phase 2 close-walk (WU-07); MR-2 consolidation; subprocess-hang fixes |

**Phase 2 total:** ~16 rounds; ~400 ACs across q20–q36 test suite; net ~0 Phase 1 regressions (inherited vendored suite preserved).

---

## § 2 Architectural-Assessment Retrospective

### Multi-cluster methodology (Waves 1–5)

Phase 2 was the first Tessera deployment of the multi-cluster Coordinator pattern (MR-1 vendored at Wave 1). Key observations:

- **Coordinator value confirmed:** Wave 1 (SLICE 1) demonstrated that independent WU scopes dispatch cleanly without merge conflicts. Wave 2–3 (SLICE 2/3) validated the wave-gate pattern for cross-cluster sequencing.
- **Subprocess-hang incident (R34):** q29 AC-R29-12 and q34 AC-R34-21 spawn `node --test` subprocesses. When these run as workers inside a parent `node --test --test-isolation=process`, transitive deadlock occurs. The `env: subEnv` strip prevents DIRECT self-recursion but NOT transitive recursion. **Fix applied at R36:** skip guards checking `NODE_TEST_CONTEXT || NODE_TEST_WORKER_ID`. **Anchor backflow:** see `coordination/ANCHOR-BACKFLOW-2026-05-18.md`.
- **Forward-protection test drift:** As HEAD advances across rounds, forward-protection tests using `..HEAD` fail due to files added in subsequent rounds. **Pattern established:** pin closed-round tests to their chore-B SHA (acknowledged as "frozen historical check" per REINFORCED 2026-05-17 R19 MAJOR-3).

### 6 cross-project rules derived across Phase 2

All 6 rules are canonical in `~/.claude/CROSS-PROJECT-MEMORIAL.md`:

| Rule | Tessera Origin | Description |
|---|---|---|
| 1. false-compliance-attestation | R03 MINOR-4, R26 MAJOR-1 | Report observed results verbatim; never reframe |
| 2. architect-branch-binding-coverage | R28+R29+R30 | Discriminating assertions per AC |
| 3. implementer-spec-test-assertion-coverage | R28+R29+R30 | All AC-listed fields asserted in every sub-case |
| 4. anti-scope-allowed-set-forward-coverage | R19+R25+R29 | ALLOWED_SET completeness across all emit categories |
| 5. rule-derivation-without-self-application | R32 | Apply newly derived rules to current round immediately |
| 6. halt-discipline-no-DIAGNOSTIC-for-workaround | R25+R34 | Silent workarounds without DIAGNOSTIC violate halt discipline |

### 14 friction surfaces catalogued

High-frequency friction patterns surfaced across Phase 2 rounds:

1. Spec-internal contradiction (boundary clauses mismatched across § 1.x / § 3.x / § 4 — R34 MINOR-2)
2. Forward-protection test churn as HEAD advances (R19→R25→R29→R32→R34→R36)
3. Subprocess hang (R34 incident; fix shipped R36)
4. ALLOWED_SET operator-commit coverage gap (R25, R29, R34 MAJOR-1 — three occurrences)
5. Regex invalidity in spec pseudocode (`\Z` → R34 MINOR-3)
6. False-compliance attestation (R03, R26, R18 — three instances)
7. execSync vs execFileSync churn (R26 MINOR-1, R29 MINOR-3, R36 cleanup)
8. Spec AC amendment without strikethrough (R32 MINOR-2)
9. Heading-inside-list structural defect (R32 MAJOR-1)
10. Rule-derivation-without-self-application (R32 MAJOR-2)
11. Test line citation off-by-N (R21 MINOR-4)
12. SHA-anchored count AC vs relative count (R22 MINOR-1)
13. MEMORIAL ordering / section-level correction propagation (R09, R17)
14. Chore-B header comment accuracy drift (R20 MINOR-1)

---

## § 3 Phase 3 Entry Framing

Phase 3 is NOT authorized. All TAGGED-FUTURE items require separate operator authorization before any implementation work begins.

**TAGGED-FUTURE items from SCOPING-MEMO-v0.3.md:**

- AMD (ROCm + Infinity Fabric / XGMI `xgmi_peer`) vendor adapter
- Google TPU (ICI `tpu_ici_peer`) vendor adapter
- AWS Trainium (Neuron Link `neuron_link_peer`) vendor adapter
- AWS Inferentia vendor adapter
- Cross-cluster federation / multi-region (A15)
- DeploySignal-integration scope (A17; John 2026-05-15 disposition: Phase 3+)
- Tailscale Phase 3 remote-execution capability (STAGED Item 4)
- Causal-attribution ADR reversal (A16; separate ADR proposal required)
- `FusedVerdict → FiredShardEvent` adapter consumer site (Phase 3+ orchestrator integration)

**Entry condition for Phase 3:** Separate PRD + operator authorization + HARD STOP lifted.

---

## § 4 ADR Walk

### Addition #25 D2 + D5 (inherited; preserved)

Addition #25 D2 (deterministic sort order for fleet-level aggregates) and D5 (statistical FDR operator surface) are preserved at Tessera Phase 2 without modification. Extension 3 builds ATOP the inherited combinatorial machinery; the combinatorial layer itself is untouched (A12 preserved). No ADR reversal proposed or executed.

### Addition #26 D4 — RECONFIRMED at Phase 2 close

`correlational_not_causal: true` wire-format constraint is RECONFIRMED at all Phase 2 emit sites:

| Emit site | File | TypeScript form |
|---|---|---|
| Common-mode attribution | `engine/topology/common-mode-attribution.ts` | `correlational_not_causal: true` (literal type in CommonModeCandidate) |
| Event-conditional attribution | `engine/events/event-conditional-attribution.ts` | `correlational_not_causal: true` (literal type in EventConditionalCandidate) |

Both emit sites carry the literal string type `true` (not `boolean`; not a generic field). The TypeScript compiler enforces the wire-format invariant at compile time. A16 is preserved: no Phase 2 sub-track for ADR reversal. Any future cycle needing causal-attribution semantics requires a separate ADR proposal subject to John disposition.

---

## § 5 Memorial State Stamp

### REINFORCED entry counts (post MR-2)

| File | Pre-MR-2 | Post-MR-2 | Method |
|---|---|---|---|
| CLAUDE-IMPLEMENTER.md | 54 | 30 | MR-2: 4 cross-project pointers + 6 composite headings + 3 CLAUDE-COMMON promotions |
| CLAUDE-ARCHITECT.md | 30 | 33 | R34 reinforcement appends (3 new entries) |
| CLAUDE-COMMON.md | (existing) | +3 entries | MR-2 Pass 3 promotions (encode-actual, data-flow, line-citation) |

### 6 cross-project rules in CROSS-PROJECT-MEMORIAL.md

Rules 1–6 canonical. Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) canonical landing at R36 Memorial-Updater stage.

### MR-2 post-consolidation state

CLAUDE-IMPLEMENTER.md structure after MR-2:
- 1 standalone anti-scope entry (R01)
- 4 composite headings (HALT-DISCIPLINE, MEMORIAL-AND-ATTESTATION-ACCURACY, SPEC-PRESCRIPTION-FIDELITY, AC-COVERAGE-COMPLETENESS, CORRECTION-PROPAGATION, MEMORIAL-ORDERING-AND-CITATION, CITATION-AND-ARITHMETIC-ACCURACY)
- 4 cross-project rule pointers
- 15 standalone entries (R14–R34 span)
- Total: 30 entries ≤ 30-entry threshold

---

## § 6 Phase 1 Freeze-Hook Activation Coupling Stamp

Per R34 (WU-06) deliverable and SCOPING-MEMO § 2.3 Extension 3 (b):

**R34 activation confirmed:** `engine/events/freeze-hook.ts` + `config.ts` `freeze_hook_enabled?: boolean` flag shipped at R34. The freeze-hook wrapper (`freezeAwareUpdatePerShardResidual`) activates the Phase 1 freeze-hook coupling when `freeze_hook_enabled: true` is set in the compiled config. This is the final Phase 1→Phase 2 coupling surface.

**Verification:** AC-R34-13 and AC-R34-14 in `test/q34-event-conditional-attribution.test.ts` confirm the freeze-hook wrapper executes correctly. The R34 Reviewer report (hybrid Opus + Sonnet) found no correctness defects in the freeze-hook implementation.

**Activation scope:** WU-07 ships with freeze-hook coupling confirmed. Phase 3 orchestration will wire the `freeze_hook_enabled` flag to the fleet-level event feed as a first-class config surface.

---

## § 7 Cross-References

### Phase 2 specifications

| Round | Spec | Key content |
|---|---|---|
| R20 | `coordination/specs/Q-R20-SPEC.md` | VerdictGroup + cluster_event_id |
| R21 | `coordination/specs/Q-R21-SPEC.md` | VerdictGroup sort order |
| R22 | `coordination/specs/Q-R22-SPEC.md` | NVLink adapter foundation |
| R23 | `coordination/specs/Q-R23-SPEC.md` | NVLink adapter + topology substrate |
| R24 | `coordination/specs/Q-R24-SPEC.md` | L0 contract (WU-00) |
| R25 | `coordination/specs/Q-R25-SPEC.md` | L0 contract completion |
| R26 | `coordination/specs/Q-R26-SPEC.md` | Common-mode attribution (WU-04) |
| R28 | `coordination/specs/Q-R28-SPEC.md` | Slurm adapter (WU-05) |
| R29 | `coordination/specs/Q-R29-SPEC.md` | K8s adapter (WU-05 continuation) |
| R30 | `coordination/specs/Q-R30-SPEC.md` | NVLink adapter refinement |
| R32 | `coordination/specs/Q-R32-SPEC.md` | SLICE 3 close-walk |
| R34 | `coordination/specs/Q-R34-SPEC.md` | Event-conditional attribution (WU-06) |
| R36 | `coordination/specs/Q-R36-SPEC.md` | Phase 2 close-walk (WU-07) — this round |

### Phase 2 Reviewer reports

- `coordination/reviews/REVIEWER-REPORT-R26.md` (WU-04 hybrid)
- `coordination/reviews/REVIEWER-REPORT-R28.md` (Slurm)
- `coordination/reviews/REVIEWER-REPORT-R29.md` (K8s)
- `coordination/reviews/REVIEWER-REPORT-R30.md` (NVLink refinement)
- `coordination/reviews/REVIEWER-REPORT-R32.md` (SLICE 3 close-walk; hybrid)
- `coordination/reviews/REVIEWER-REPORT-R34.md` (WU-06; hybrid Opus+Sonnet)
- `coordination/reviews/REVIEWER-REPORT-R36.md` (Phase 2 close-walk; hybrid) — pending

### Wave plans and gates

- `coordination/cluster-scopes/wave-1/` — SLICE 1 (WU-01/02)
- `coordination/cluster-scopes/wave-2/` — SLICE 2 (WU-00/03)
- `coordination/cluster-scopes/wave-3/` — SLICE 3 (WU-04/05)
- `coordination/cluster-scopes/wave-4/` — SLICE 3 continuation + close-walk
- `coordination/cluster-scopes/wave-5/wu-07-phase-2-close-walk.md` — Phase 2 close-walk scope

### PR-F7 Cell 4 disposition

Per AC-R36-26: Cell 4 (mixed-signal robustness; PSU fires alongside non-PSU cross-rack co-event; attribution discriminates correctly) was independently verified at R26 Reviewer stage via `test/q-md-f4-common-mode-injection.test.ts` AC-R26-4. The common-mode attribution implementation is UNCHANGED through Phase 2 (A12 preserved; engine/topology/common-mode-attribution.ts modified only for R26 MINOR-2 dedup fix at R36, not for behavioral changes to AC-R26-4 logic). Cell 4 disposition: **VERIFIED at R26 Reviewer stage; UNCHANGED at Phase 2 close.**

### SCOPING-MEMO

`coordination/SCOPING-MEMO-v0.3.md` — governing anti-scope document; A1–A17 preserved.
