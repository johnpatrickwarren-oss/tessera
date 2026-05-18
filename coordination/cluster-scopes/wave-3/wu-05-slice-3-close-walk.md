# Cluster scope — WU-05 SLICE 3 close-walk (Wave 3 / R32)

_PRD scope block for cluster `wu-05-slice-3-close-walk`. **Runs in main worktree** (no `multi-track-cluster-setup.sh` required per WAVE-GATE-02 § Wave 3 dispatch routing). Single-cluster wave; Architect reads this + the 5 `coordination/CLUSTER-HANDOFF-2-WU{00,01,02,03,04}-WU05.md` artifacts + `coordination/STAGED-FOR-WU-05-SCOPE.md` + WAVE-GATE-02 Pre-flags as primary inputs._

## Tier verdict

**`audit`** (Implementer + Reviewer + Memorial-Updater; **NO separate Architect** per close-walk pattern; Implementer authors thin spec inline).

**Hybrid Reviewer ENABLED** (`HYBRID_REVIEWER=true ./run-pipeline.sh --round R32 --tier audit`). Per SCOPING-MEMO § 3 SLICE 3.C row + WAVE-GATE-02 routing: hybrid Reviewer (Opus + Sonnet + Merger per `run-pipeline.sh:1079-1115` `dispatch_hybrid_reviewer`) pair-review audits the consolidated SLICE 3 deliverable.

Justification for audit tier (vs full): mirrors R19 + R22 close-walk precedent (S2 — close-walk doc + targeted carry-forward cleanups + scope-amendment deliverable; no novel architectural surface). The hybrid Reviewer compensates for the absent separate Architect via dual-Opus+Sonnet cold-audit pass.

## PRD source

- `coordination/PRD.md` Phase 2 SLICE 3 close-walk per SCOPING-MEMO § 3 SLICE 3.C row
- `coordination/SCOPING-MEMO-v0.3.md` § 3 Phase 2 SLICE 3.C row (close-walk content) + § 2.3 (consolidates Wave 1 + Wave 2 deliverables) + § 2.3 A10 [MR-1 AMENDMENT] block + § 4.2 R-E7 row
- `coordination/WAVE-PLAN-02.md` § Wave 3 (single-cluster WU-05) + § Step 6 tier classification
- `coordination/WAVE-GATE-02.md` — Wave 2 gate authorization + pre-flag inventory + 4 derived cross-project rules
- `coordination/STAGED-FOR-WU-05-SCOPE.md` — **Item 1: vendor-fungibility SCOPING-MEMO amendment (operator-authorized 2026-05-18; MUST land as WU-05 deliverable per task #22).**

## Scope (5 primary deliverables; mirrors PHASE-2-SLICE-1-CLOSE-WALK.md + PHASE-2-SLICE-2-CLOSE-WALK.md structure)

### Deliverable 1 — `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` (NEW; primary close-walk document)

Mirror the structural template established by R19 (`PHASE-2-SLICE-1-CLOSE-WALK.md`) and R22 (`PHASE-2-SLICE-2-CLOSE-WALK.md`). Required sections:

- **§ 1 Scope summary** — Wave 1 + Wave 2 deliverables enumerated:
  - WU-00 L0-CONTRACT (R25; `engine/l0/counter-rate-transform.ts` + synthetic counter generator substrate)
  - WU-04 MD-F4 + PR-F6 (R26; `engine/topology/common-mode-attribution.ts` + 4-cell evidence matrix + external literature citations)
  - WU-01 SLURM-ADAPTER (R28; `engine/topology/slurm-source.ts` + canonical/sparse fixtures)
  - WU-02 K8S-ADAPTER (R29; `engine/topology/k8s-source.ts` + corev1.NodeList fixtures)
  - WU-03 NVLINK-ADAPTER (R30; `engine/topology/nvlink-source.ts` + R-E7 mitigation evidence: 32-bit wrap + missed-scrape + variable-interval + reset-vs-wrap)
- **§ 2 Architectural-assessment retrospective.** Topics:
  - Multi-cluster methodology test outcomes (8 friction surfaces captured + 4 cross-project rules derived; quantify parallel-vs-sequential speedup if data permits)
  - L0 contract validation: did D1 HIGH consumer (WU-03 NVLINK) surface any contract gap? (per Wave 2 gate finding: NO — contract is stable)
  - PR-F6 hybrid Reviewer evidence package consolidation (WU-04 evidence + WU-03 R-E7 evidence audited together by THIS cluster's hybrid Reviewer)
  - Vendored-with-deltas pattern application count (R18, R20, R23 enum extensions — all clean; no Wave 2 transitions introduced)
- **§ 3 Phase 2 SLICE 4 entry framing.** WU-06 event-conditional attribution (FR-E3c; deployment-event-feed ingestion); SCOPING-MEMO § 3 SLICE 4 row; LS items from Wave 2 carry-forward (R26 MINOR-2 forward-flagged to SLICE 4).
- **§ 4 Wave 1 + Wave 2 MINOR disposition table.** All 11 MINORs (R25 × 3 + R26 × 2 + R28 × 2 + R29 × 3 + R30 × 2) listed with disposition per cluster handoff carry-forward inventory.
- **§ 5 Memorial state stamp at SLICE 3 close.** REINFORCED counts per CLAUDE-*.md; cross-project rule derivation summary (4 new rules this session); CLAUDE-IMPLEMENTER.md consolidation recommendation.
- **§ 6 Cross-references.** All Wave 1 + Wave 2 spec / Reviewer-report / round-summary / handoff artifact pointers.

### Deliverable 2 — Vendor-fungibility SCOPING-MEMO amendment (NEW; operator-authorized 2026-05-18)

**Per `coordination/STAGED-FOR-WU-05-SCOPE.md` Item 1.** This is a separate operator-reviewable artifact from the close-walk doc (analogous to how MR-1 amendment was operator-drafted; this one drafted by WU-05 Implementer for operator approval at SLICE 3 close).

Amendment scope (full detail in `STAGED-FOR-WU-05-SCOPE.md`):

1. **Generalize § 2.3 A10 language** — current text references "DCGM / NVML" by NVIDIA name; should generalize across vendor stacks (DCGM/NVML for NVIDIA; ROCm-SMI for AMD; Neuron SDK for AWS Trainium; TPU runtime libraries for Google TPU; equivalent for future accelerator vendors). The MR-1 amendment already established the *principle* (hardware *diagnosis* fenced; measurement-domain preprocessing in-scope); the wording should generalize.
2. **NEW § 2.4 "Vendor fungibility"** — explicitly document fungible vs vendor-flavored vs vendor-specific surfaces. Use the table in `STAGED-FOR-WU-05-SCOPE.md`. Establish that NVIDIA-first implementation is launch-market choice, not architectural lock-in.
3. **TAGGED-FUTURE for AMD/TPU/Trainium adapters** per established parallel-class WU-03 NVLINK pattern (Phase 3+ candidates).
4. **§ 1.7 shard definition vendor-neutrality** — current cites NVIDIA FSDP; add vendor-equivalent note.
5. **PRD US-01 wording generalization** — "GPU" → "accelerator" or "shard".

Lands as: amendment block appended to SCOPING-MEMO-v0.3.md § 1.8 amendment-history row + the 5 inline section amendments above. Operator approves at SLICE 3 close before WU-06 (SLICE 4) entry.

### Deliverable 3 — Wave 1 + Wave 2 MINOR cleanup (in-passing per spec § 4 disposition table)

Pre-authorize test-file touches at file granularity (per R22 close-walk precedent — avoid R19 anti-scope-on-close-walk incident class):

- **R25 MAJOR-1** — spec § 5.1 AC-R25-14 amendment to read `tests=229 / pass=228 / fail=1` with cluster-worktree baseline reconciliation note. **Edit `coordination/specs/Q-R25-SPEC.md` only** (no test file touch).
- **R25 MAJOR-2** — spec § 3 / § 4.6 / § 9.6 / § 9.7 / § 9.10 amendment to add 8th allowed-set entry. **Edit `coordination/specs/Q-R25-SPEC.md` only.**
- **R25 MAJOR-3** — spec § 4.3 + § 5.1 AC-R25-12 row amendment to match § 1.8 tolerances (0.001 / 0.01). **Edit `coordination/specs/Q-R25-SPEC.md` only.**
- **R25 MINOR-2** — counter-arm default `?? 64` binding AC (if WU-03 didn't close it). **Verify; if WU-03 closed: note in disposition table. If not: append minimal AC to `test/q25-l0-contract.test.ts` lines 200+ (append only; existing tests frozen).**
- **R25 MINOR-3** — gauge + missed_scrape combination AC. **Append minimal AC to `test/q25-l0-contract.test.ts` (append only).**
- **R26 MAJOR-1** — spec § wording amendment for `tsc` exit code reality. **Edit `coordination/specs/Q-R26-SPEC.md` only.** Infra fixes (install @types/node + `ignoreDeprecations: 6.0`) are operator-owned methodology backflow, NOT in WU-05 scope.
- **R26 MINOR-1** — swap `execSync` → `execFileSync` in AC-R26-16 test. **Edit `test/q-md-f4-common-mode-injection.test.ts` (or actual filename) lines containing AC-R26-16 only.**
- **R26 MINOR-2** — `earliest_event_ts` / `latest_event_ts` semantic alignment. **Edit `engine/topology/common-mode-attribution.ts:186-191` AND module docstring lines 67-72 to align.** (Tightening impl OR relaxing docstring — Implementer picks; tightening preferred since downstream WU-06 will surface the divergence.)
- **R28 MINOR-1** — append source_id/source_version assertions to AC-R28-9 test. **Edit `test/q28-slurm-adapter.test.ts` AC-R28-9 test only.**
- **R29 MINOR-1** — strengthen AC-R29-6 to strict-equality. **Edit `test/q29-k8s-adapter.test.ts` AC-R29-6 only.**
- **R29 MINOR-2** — add `^coordination\/reviews\/REVIEWER-REPORT-R\d+\.md$` regex carve-out to AC-R29-13. **Edit `test/q29-k8s-adapter.test.ts` AC-R29-13 only.**
- **R29 MINOR-3** — add inline code comment cross-referencing spec § 3.2 for the `env: subEnv` Node.js v25 workaround. **Edit `test/q29-k8s-adapter.test.ts` AC-R29-12 only.**
- **R30 MINOR-1** — strengthen AC-R30-15 `correlational_not_causal: true` assertion to regex with line anchoring. **Edit `test/q30-nvlink-adapter.test.ts` AC-R30-15 only.**
- **R30 MINOR-2** — document NvlinkTopologySource constructor third-operand dead code with inline comment OR remove. **Edit `engine/topology/nvlink-source.ts:133-134` only.**

Test-file touches at this file granularity are EXPLICITLY pre-authorized to avoid R19 close-walk-anti-scope-incident class.

### Deliverable 4 — PR-F6 hybrid Reviewer pair-review (audit-mode finding)

The hybrid Reviewer (THIS cluster's Reviewer stage) audits the consolidated SLICE 3 deliverable:
- WU-00 L0 contract surface (R-E7 mitigation foundation)
- WU-03 NVLINK adapter R-E7 mitigation evidence (32-bit wrap + missed-scrape + variable-interval + reset-vs-wrap)
- WU-04 MD-F4 evidence package (4-cell PR-F6 matrix + external literature)

PR-F6 evidence-package consolidation finding: did the cross-cluster evidence hold up under dual-Opus+Sonnet adversarial review? Lands in REVIEWER-REPORT-R32.md per hybrid Reviewer merger output.

### Deliverable 5 — `coordination/COORDINATOR-MEMORIAL.md` augmentation (deferred to Coordinator wave 3 gate)

WU-05 cluster Implementer does NOT write to COORDINATOR-MEMORIAL.md (that's Coordinator-only per CLAUDE-COORDINATOR.md role boundary). At Wave 3 gate (next Coordinator invocation after WU-05 closes), the Coordinator records SLICE 3 close memorial state. **Not a WU-05 deliverable — flagged so the Implementer doesn't accidentally cross the boundary.**

## Acceptance criteria

**AC enumeration is the Implementer's job at audit tier** (no separate Architect). Per CLAUDE-IMPLEMENTER.md audit-tier protocol: write thin spec inline, then execute. ACs should cover:

- 1 AC per primary deliverable (5 total)
- 1 AC per Wave 1 + Wave 2 MINOR cleanup (13 total — one per cleanup item above)
- 1 AC per hybrid Reviewer cell (4 PR-F6 cells re-audited)
- Anti-scope diff AC (SHA-pinned to chore-A; per TQ-4 γ pattern)
- Typecheck + test count ACs (per R22 IMPL MINOR-1; anchored to chore-A SHA explicitly; encode actual `tsc` exit code + actual `node --test` baseline empirically; do NOT reframe per R26 MAJOR-1 reinforcement)

Target total AC count: ~20-25 (close-walk rounds are higher-AC than implementation rounds because of breadth).

## Anti-scope

- **A12 — NO modification of inherited vendored-at-pin engine internals** (TrendBuffer body, schema-continuity body, topology-overlay BFS body, detector internals — all frozen).
- **A10 — NO hardware *diagnosis*** (carve-out language being amended per Deliverable 2; until amendment lands, the existing MR-1 carve-out applies).
- **NO modification of Wave 1 deliverables OUTSIDE the pre-authorized cleanup list above**:
  - `engine/l0/counter-rate-transform.ts` frozen (R25 deliverable)
  - `test/_substrate/synthetic-counter-generator.ts` frozen (R25 substrate)
  - `engine/topology/common-mode-attribution.ts` — **EXCEPT R26 MINOR-2 docstring + impl alignment per Deliverable 3**
- **NO modification of Wave 2 deliverables OUTSIDE the pre-authorized cleanup list above**:
  - `engine/topology/slurm-source.ts` frozen (R28 deliverable)
  - `engine/topology/k8s-source.ts` frozen (R29 deliverable)
  - `engine/topology/nvlink-source.ts` — **EXCEPT R30 MINOR-2 inline comment per Deliverable 3**
- **NO modification of pre-R25 test files** (q01..q23 + betting-e-process + q-md-f4 + q28/29/30 OUTSIDE pre-authorized cleanup items frozen).
- **NO SLICE 4 entry work** (Wave 4 / WU-06 is post-HARD-STOP; operator decision after SLICE 3 close).
- **NO drafting of vendor adapter code** (AMD/TPU/Trainium remain TAGGED-FUTURE; Deliverable 2 amendment only adds them to the documented scope, doesn't implement them).
- **NO modification of `multi-track-cluster-setup.sh` or other scripts** (methodology backflow items are operator-owned).
- **NO CLAUDE-IMPLEMENTER.md consolidation** (operator-triggered; deferred per memorial state).
- **NO modification of cluster-scopes/wave-{1,2}/ files** (frozen post-Wave-2 close).
- **NO modification of COORDINATOR-MEMORIAL.md by this cluster's Implementer** (Coordinator-only per role boundary; per Deliverable 5 framing).
- **NO modification of CLUSTER-HANDOFF-2-* artifacts** (frozen at Wave 2 gate).

## Reinforcements in scope (apply during cluster work)

**Cross-project rules now active (4 total derived this overnight session):**

1. **`false-compliance-attestation`** halt-discipline sub-class (R26-derived; validated Wave 2) — encode actual binding-command results verbatim; no reframing.
2. **`architect-branch-binding-coverage`** (R28/R29/R30 composite) — Implementer at audit tier wears both Architect+Implementer hat; trace data flow not just syntax when claiming "all branches covered."
3. **`implementer-spec-test-assertion-coverage`** (R28/R29/R30 composite) — for each AC, every Then-column field asserted one-for-one; no inferred-from-sibling-AC coverage.
4. **`anti-scope-allowed-set-forward-coverage`** (R25 MAJOR-2 + R26 MINOR-1 + R29 MINOR-2 composite) — Implementer's chore-A allowed-set MUST include all coordination paths that post-chore-A roles will commit (REVIEWER-REPORT, MEMORIAL appends, etc.). Standard regex carve-out: `^coordination\/reviews\/REVIEWER-REPORT-R\d+\.md$`.

**Tessera-local (CLAUDE-{IMPLEMENTER,REVIEWER,MEMORIAL}.md REINFORCEMENTS):** all applicable; especially:
- Line-citation-drift rule (R21 MINOR-4)
- Count-AC chore-A SHA anchoring (R22 IMPL MINOR-1)
- TDD separate-RED-commit (R23 IMPL MINOR-1) — for close-walk, RED state is the "before deliverables land" snapshot
- `.gitignore`-aware spec inventories (R23 ARCH MINOR-2)

**WAVE-GATE-02 pre-flags:**

- Baseline test count + `tsc` exit code: encode empirically; do NOT reframe.
- All 13 carry-forward items pre-flagged with surgical edit scope per Deliverable 3.
- Vendor-fungibility amendment is a NEW operator-reviewable deliverable per Deliverable 2.

## Cluster context

**Wave 3 of 5 (single cluster).** Aggregates Wave 1 + Wave 2 outputs into SLICE 3 milestone deliverables. SLICE 3 close after this cluster + Coordinator Wave 3 gate.

**Upstream dependencies (5 CLUSTER-HANDOFF-2 artifacts):**
- WU-00 L0 contract → close-walk audit (D1 HIGH)
- WU-01 Slurm adapter → close-walk (D1 HIGH)
- WU-02 K8s adapter → close-walk (D1 HIGH)
- WU-03 NVLink adapter + R-E7 evidence → close-walk + hybrid Reviewer audit (D1 HIGH)
- WU-04 MD-F4 + PR-F6 evidence → close-walk + hybrid Reviewer audit (D1 HIGH; Wave-1→Wave-3 cross-wave edge)

**Downstream dependencies on this cluster's output:**
- WU-06 SLICE 4 (Wave 4; pending operator return per HARD STOP) — close-walk doc enumerates Wave 4 entry framing
- Operator vendor-fungibility amendment review (Deliverable 2)

**Wave 3 gate criteria** (Coordinator runs at WU-05 close):
- Reviewer report (hybrid: Opus + Sonnet + Merger) MERGE-READY
- 0 CRITICAL findings
- All 5 primary deliverables landed
- All 13 MINOR carry-forward items dispositioned
- PR-F6 evidence package re-audit complete
- Vendor-fungibility amendment block staged for operator approval

**HARD STOP after Wave 3 gate per overnight authority** [[project-overnight-authority-2026-05-18-morning]]. SLICE 4 entry requires operator return.

## Halt conditions

1. **Hybrid Reviewer dispatch fails** (`dispatch_hybrid_reviewer` error; Opus or Sonnet Reviewer crashes) — HALT + DIAGNOSTIC + ESCALATE.
2. **Vendor-fungibility amendment scope blows up** (operator-authorized amendment scope per STAGED-FOR-WU-05-SCOPE.md is well-bounded; if Implementer determines amendment requires substantive architectural changes beyond the 5 enumerated items, HALT + ESCALATE).
3. **MINOR cleanup item requires modifying a frozen file beyond pre-authorized edits** — HALT + DIAGNOSTIC.
4. **Binding-command output contradicts AC literal text** — HALT + DIAGNOSTIC per `false-compliance-attestation` rule.
5. **PR-F6 hybrid Reviewer audit reveals a CRITICAL gap in the SLICE 3 consolidated evidence** — HALT + ESCALATE (Wave 4 entry should not proceed under CRITICAL).

## Round

`R32` (Wave 3, single cluster).

## Branch

`main` (no worktree; runs in main project root).

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
HYBRID_REVIEWER=true ./run-pipeline.sh --round R32 --tier audit
```
