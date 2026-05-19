# Cluster scope — WU-07 SLICE 3.D Phase 2 close-walk (Wave 5 / R36)

_PRD scope block for cluster `wu-07-phase-2-close-walk`. **Runs in main worktree** (single-cluster final wave; no `multi-track-cluster-setup.sh`). Audit tier (Implementer authors thin spec inline; no separate Architect) + **HYBRID_REVIEWER=true** per SCOPING-MEMO § 3 SLICE 3.C row + § 4.4 PR-F7 mandate + WAVE-GATE-04 OQ-W1-2 default A._

**This is the LAST cluster before HARD STOP at Phase 2 close milestone.** All operator-authorized OQ defaults applied per overnight authority extended chain ([[project-overnight-authority-2026-05-18-morning]]).

## Tier verdict

**`audit` + HYBRID_REVIEWER=true** per OQ-W1-2 Option A (validated at R32; R32 hybrid Reviewer caught the rule-derivation-without-self-application pattern that single-Reviewer would have missed). PR-F7 hybrid Reviewer (Opus + Sonnet + Merger per `run-pipeline.sh:1079-1115`) audits the consolidated Phase 2 deliverable.

## OQ defaults applied (per overnight authority + Coordinator R35 recommendations)

| OQ | Default | Applied | Where |
|---|---|---|---|
| OQ-W4-1 (MR-2 bundling) | A — bundle MR-2 into WU-07 | **A accepted** | Deliverable 5 below |
| OQ-W1-2 (WU-07 tier) | A — audit + HYBRID_REVIEWER=true | **A accepted** | Tier verdict above |
| OQ-W4-2 (Tailscale Phase 3+) | A — defer to MR-3 candidate; NOT in WU-07 | **A accepted** | STAGED Item 4 stays as Phase 3 capability |
| OQ-W4-3 (anchor backflow scheduling) | A — bundle content into WU-07; operator-scheduled PR | **A accepted** | Deliverable 7 below |

## PRD source

- `coordination/PRD.md` Phase 2 close per SCOPING-MEMO § 3 Phase 2 close-walk row + § 4.4 PR-F7 mandate + Addition #26 D4 RECONFIRMED disposition
- `coordination/SCOPING-MEMO-v0.3.md` § 3 final Phase 2 close-walk row ("ADR walk; inherited Addition #25 D2 + D5 disposition stamp; inherited Addition #26 D4 RECONFIRMED; activates Phase 1 freeze-hook coupling. **Hybrid Reviewer pair-review-style at close walk.** Tessera Phase 3 candidate-list TAGGED-FUTURE")
- `coordination/CLUSTER-HANDOFF-4-WU06-WU07.md` (D1 HIGH; 16 LS pre-flag entries)
- `coordination/WAVE-GATE-04.md` (Wave 4 gate + Coordinator decisions + Rule 6 derivation)
- `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (5 Items: MR-2 consolidation, R32 carry-forwards, subprocess-hang backflow, Tailscale Phase 3 candidate, R34 reinforcement staging)

## Eight deliverables

### Deliverable 1 — `coordination/PHASE-2-CLOSE-WALK.md` (NEW; primary close-walk document)

Mirror the structural template from R15 (`PHASE-1-CLOSE-WALK.md`) + R19 (`PHASE-2-SLICE-1-CLOSE-WALK.md`) + R22 (`PHASE-2-SLICE-2-CLOSE-WALK.md`) + R32 (`PHASE-2-SLICE-3-CLOSE-WALK.md`). Required sections:

- **§ 1 Phase 2 scope summary** — All 4 SLICEs + their deliverables:
  - SLICE 1 (R18): TopologyNode.kind + TopologyEdge.relationship enum extensions + v9X fixture
  - SLICE 2 (R20+R21+R22): VerdictGrouper cluster_event_id scope + fleet-merge consumer + SLICE 2 close-walk
  - SLICE 3 (R23+R25+R26+R28+R29+R30+R32): HardwareTopologySource + L0 contract + MD-F4 + 3 vendor adapters + SLICE 3 close-walk + vendor-fungibility amendment
  - SLICE 4 (R34): Event-feed + event-conditional attribution + freeze-hook + PR-F7 evidence
- **§ 2 Architectural-assessment retrospective** — Multi-cluster methodology test outcomes; cross-project rule derivation summary (6 rules); 14 friction-surface observations from Coordinator; parallel-vs-sequential speedup quantification; A16 wire-format invariant preservation across all event-conditional emit sites
- **§ 3 Phase 3 entry framing (TAGGED-FUTURE)** — Vendor adapter expansion (AMD/TPU/Trainium per vendor-fungibility amendment); real-cluster integration; DeploySignal integration (Phase 3+ commitment); Tailscale + M4 Pro mini remote-execution infrastructure (STAGED Item 4); etc.
- **§ 4 ADR walk** — All architectural decisions made across Phase 2; inherited Addition #25 D2 + D5 disposition stamp (preserved through all SLICEs); Addition #26 D4 RECONFIRMED (event-conditional attribution preserves correlational-not-causal at every emit site)
- **§ 5 Memorial state stamp at Phase 2 close** — REINFORCED counts; 6 cross-project rules + canonical landing of Rule 6; CLAUDE-IMPLEMENTER.md post-MR-2-consolidation state
- **§ 6 Phase 1 freeze-hook activation coupling stamp** — Per SCOPING-MEMO § 4.2 R-S3: confirms freeze-hook activated at R34 + audited at this close-walk
- **§ 7 Cross-references** — All Phase 2 spec / Reviewer-report / round-summary / handoff / gate artifact pointers

### Deliverable 2 — R32 carry-forward closures (per STAGED Item 2)

Pre-authorized at file granularity:

- **R32 MAJOR-1 SCOPING-MEMO surgery** — Edit `coordination/SCOPING-MEMO-v0.3.md` only; per R32 REVIEWER-REPORT § MAJOR-1 specific amendment.
- **R32 4 weak ACs strengthening** — Edit Q-R32-SPEC.md only; spec-side amendments per R32 OBS surfaces.
- **R32 execSync carry-forward** — Edit `test/q25-l0-contract.test.ts:216` and `test/q30-nvlink-adapter.test.ts:230` only (specific lines); swap `execSync` → `execFileSync` per R26 MINOR-1.
- **R32 R26 MINOR-2 deferred impl alignment** — R34 confirmed WU-06 did NOT ship FusedVerdict → FiredShardEvent adapter site (per spec § 0.6); MINOR-2 closes HERE. Edit `engine/topology/common-mode-attribution.ts:186-191` AND module docstring lines 67-72 only.

### Deliverable 3 — R34 carry-forward closures (per WAVE-GATE-04 + STAGED Item 5)

Pre-authorized at file granularity:

- **R34 MAJOR-1 Architect spec template enhancement** — Edit `templates/` files OR add Architect-side checklist for operator-commit ALLOWED_REGEX carve-outs; NEW file `coordination/SPEC-AUTHORING-CHECKLIST.md` (or equivalent) to surface Rule 4 inline at AC-table authoring time.
- **R34 MINOR-1/2/3/4 reinforcement-line writes** (deferred from R34 per spec § 9.9 option b) — Append to `CLAUDE-ARCHITECT.md` + `CLAUDE-IMPLEMENTER.md` per STAGED Item 5 specific text staged. Coordinates with Deliverable 5 (MR-2 consolidation) — apply staging FIRST, then consolidation, so MR-2 sees the staged R34 lines + can absorb them into composite headings if appropriate.

### Deliverable 4 — Subprocess-hang Tessera-local fixes (per STAGED Item 3 Tessera portion)

Pre-authorized at file granularity:

- **q29 AC-R29-12 refactor** — Edit `test/q29-k8s-adapter.test.ts` AC-R29-12 only: move `execFileSync('node', '--test', ...)` invocation OUT of the test suite (to a sibling script invoked at chore-A level) OR add `if (process.env.NODE_TEST_CONTEXT) test.skip(...)` guard.
- **q34 AC-R34-21 refactor** — Same treatment for `test/q34-event-conditional-attribution.test.ts` AC-R34-21.
- **Audit all test files for `execFileSync('node', '--test', ...)` pattern** — grep all q*-test.ts; if any other file has the pattern, apply same fix.
- **Update spec templates** — add explicit anti-scope clause "AC must not spawn `node --test` from within a test file in the suite (transitive-hang risk under `--test-isolation=process`)" to spec template if exists, or add as Architect-side discipline note in `CLAUDE-ARCHITECT.md`.

### Deliverable 5 — MR-2 CLAUDE-IMPLEMENTER.md consolidation (per STAGED Item 1; OQ-W4-1 default A bundles here)

3-pass thematic consolidation per STAGED Item 1 strategy:

- **Pass 1** — De-duplicate cross-project-derived rules (6 rules in CROSS-PROJECT-MEMORIAL); replace originating per-role lines with 1-line pointers. Expected: ~6 line reduction.
- **Pass 2** — Thematic consolidation under composite headings (halt-discipline / branch-binding / spec-prescription-fidelity / etc.); preserves all institutional memory. Expected: ~14 line reduction.
- **Pass 3** — Promote universal patterns to `CLAUDE-COMMON.md` (line-citation cite-then-verify; data-flow-not-syntax; encode-actual-results-verbatim). Expected: ~6 line reduction in IMPLEMENTER; CLAUDE-COMMON gains them once.
- **Skip Pass 4** — Tessera too young for age-based archive.

**Target:** CLAUDE-IMPLEMENTER.md ~51+R34 → ~25-30 lines.
**Self-application gate** (per R32-derived Rule 5): the consolidation must not subsume rules into forms that make them LESS actionable. Implementer self-audits at chore-A: for each composite heading, verify trigger conditions remain discoverable.
**Commit shape**: 3 sequential commits (pass 1; pass 2; pass 3) so each pass is independently reviewable.

### Deliverable 6 — PR-F7 hybrid Reviewer audit (audit-mode finding by Reviewer stage)

Hybrid Reviewer (this cluster's Reviewer stage) audits the consolidated Phase 2 deliverable:
- WU-00 L0 contract surface (R-E7 mitigation foundation)
- WU-04 MD-F4 evidence package + WU-03 NVLINK adapter R-E7 mitigation evidence
- WU-06 event-feed + event-conditional attribution + freeze-hook + 4-cell PR-F7 evidence matrix
- Addition #26 D4 RECONFIRMED — `correlational_not_causal: true` preserved across all Phase 2 emit sites

PR-F7 audit finding lands in REVIEWER-REPORT-R36.md per hybrid Reviewer merger output.

### Deliverable 7 — Anchor backflow content compilation (per STAGED Item 3 + Item 4 references; OQ-W4-3 default A)

Compile a single `coordination/ANCHOR-BACKFLOW-2026-05-18.md` artifact for operator-scheduled PR landing. Bundles:

- **From STAGED Item 3** (subprocess-node-test transitive hang class):
  - Pre-emit grilling rule (test files spawning node --test are fragile)
  - Pipeline watchdog (no role-output-for-N-min detection)
  - Bash-tool orphan reaping (process tree SIGTERM on timeout)
  - Test-isolation failure-mode in spec template anti-scope
- **From STAGED Item 4** (Tailscale Phase 3 capability):
  - Multi-track-execution capability extension (--remote flag for Coordinator + cluster dispatch)
  - Pointer to Tessera-internal STAGED Item 4 for implementation details
- **From COORDINATOR-MEMORIAL.md Wave 1-5 gate observations** (14 friction surfaces; Coordinator decides which graduate to anchor-canonical PRs)

Format: PR-ready unified diffs OR proposed prose changes against `anchor/` canonical paths. Operator schedules actual PR submission.

### Deliverable 8 — Rule 6 canonical landing in CROSS-PROJECT-MEMORIAL.md (per WAVE-GATE-04 Coordinator decision 3)

Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) was derived at WAVE-GATE-04 with draft text. Canonical landing in `~/.claude/CROSS-PROJECT-MEMORIAL.md` deferred to this WU-07 close-walk Memorial-Updater backflow. Apply at Memorial-Updater stage of THIS round.

## Acceptance criteria

**AC enumeration is the Implementer's job at audit tier.** Implementer's thin spec covers:

- 1 AC per deliverable (8 total)
- ACs for each Deliverable 2/3/4 surgical edit (file-granularity verification)
- ACs for Deliverable 5's 3 MR-2 passes (line-count targets + self-application gate)
- ACs for Deliverable 6 hybrid Reviewer audit (4 PR-F7 cells re-audited + Addition #26 D4 RECONFIRMED)
- Anti-scope diff AC (SHA-pinned to chore-A; TQ-4 γ pattern)
- Typecheck + test count ACs (encode actual empirically per false-compliance-attestation Rule 1; anchored to chore-A SHA per Rule 4)
- ACs for Rule 6 canonical landing in CROSS-PROJECT-MEMORIAL

Target AC count: 25-35 (highest tessera round so far — close-walk consolidates many surfaces; bounded reviewability is preserved by clear deliverable boundaries).

## Apply all 6 cross-project rules UPFRONT (including Rule 6 NEW per WAVE-GATE-04)

1. **`false-compliance-attestation`** (Rule 1) — actual binding-command results verbatim.
2. **`architect-branch-binding-coverage`** (Rule 2) — Implementer at audit tier wears both hats; trace data-flow.
3. **`implementer-spec-test-assertion-coverage`** (Rule 3) — every Then-column field asserted one-for-one.
4. **`anti-scope-allowed-set-forward-coverage`** (Rule 4) — chore-A allowed-set includes `^coordination\/reviews\/REVIEWER-REPORT-R36\.md$` + `^coordination\/MEMORIAL\.md$` + `^~/.claude/CROSS-PROJECT-MEMORIAL\.md$` (for Rule 6 landing) + other operator-commit class paths.
5. **`rule-derivation-without-self-application`** (Rule 5) — self-audit at chore-A: grep + mutation test on every AC binding pattern; Deliverable 5's MR-2 self-application gate explicitly required.
6. **`halt-discipline-no-DIAGNOSTIC-for-workaround`** (Rule 6 NEW) — any workaround applied to handle environmental mismatch (e.g., env-strip, tactical deviation) MUST be documented in a DIAGNOSTIC file at point-of-encounter; recording in MEMORIAL alone is insufficient.

## Anti-scope (R36 hard limits)

- **A12** — engine internals frozen EXCEPT Deliverable 2 R26 MINOR-2 impl alignment AND Deliverable 4 q29/q34 test refactor (both pre-authorized at file granularity).
- **A10** — hardware diagnosis fenced (carve-out per MR-1 + R32 vendor-fungibility amendment preserved).
- **A11** — synthetic substrates only.
- **A16** — Addition #26 D4 PRESERVED across ALL Phase 2 emit sites + RECONFIRMED at this close-walk.
- **A13** — rule-based + statistical only.
- **A17** — NO DeploySignal-integration scope (Phase 3+ commitment per inherited boundary).
- **NO Phase 3 entry work** (this is the LAST Phase 2 round; Phase 3 candidates remain TAGGED-FUTURE).
- **NO modification of Wave 1/2/3/4 deliverables outside the pre-authorized cleanup list above**.
- **NO modification of cluster-scopes/wave-{1,2,3,4}/** (frozen).
- **NO modification of CLUSTER-HANDOFF-* artifacts** (frozen at their wave gates).
- **NO modification of WAVE-GATE-{01,02,03,04}.md** (frozen).
- **NO modification of WAVE-PLAN-{01,02,03}.md** (frozen).
- **NO new vendor adapter code** (TAGGED-FUTURE Phase 3+ candidates).
- **NO Tailscale infrastructure setup** (STAGED Item 4 = Phase 3 candidate; OQ-W4-2 default A).

## Halt conditions (escalate to Coordinator OR operator)

1. **PR-F7 hybrid audit reveals CRITICAL gap** — Phase 2 close should not proceed under CRITICAL findings.
2. **A16 D4 reversal surface emerges anywhere** in consolidated Phase 2 review — HALT + DIAGNOSTIC + ESCALATE (highest priority).
3. **MR-2 consolidation pass fails self-application gate** (R32 Rule 5: composite heading hides trigger conditions) — HALT for operator review; do not commit.
4. **Subprocess-hang refactor (Deliverable 4) cannot achieve clean refactor** without modifying a frozen file beyond pre-authorized edits — HALT + DIAGNOSTIC.
5. **Binding-command output contradicts AC literal** — HALT (Rule 1 + Rule 6).
6. **Anchor backflow content compilation surfaces new methodology question** the operator hasn't decided — HALT + ESCALATE (don't auto-disposition Phase 3-scoped questions).

## Round

`R36` (Wave 5; final cluster).

## Branch

`main` (no worktree; runs in main project root).

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
HYBRID_REVIEWER=true ./run-pipeline.sh --round R36 --tier audit
```

## After this round + Coordinator Wave 5 gate (R37)

**HARD STOP at Phase 2 close milestone.** Operator returns; reviews:
- `coordination/PHASE-2-CLOSE-WALK.md`
- `coordination/WAVE-GATE-05.md` (Coordinator's final Wave 5 gate)
- `coordination/COORDINATOR-MEMORIAL.md` final state
- `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (operator-scheduled PR landing)
- CLAUDE-IMPLEMENTER.md post-MR-2-consolidation state
- 6 cross-project rules + canonical landing

Phase 3 entry requires separate operator authorization (Tessera Phase 3 candidate-list TAGGED-FUTURE per SCOPING-MEMO § 3 + § 4.3).
