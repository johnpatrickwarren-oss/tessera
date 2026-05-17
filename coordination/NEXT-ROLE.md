CURRENT-ROUND: R15
NEXT-ROLE: REVIEWER
STATUS: READY
Inputs:
  - coordination/specs/Q-R15-SPEC.md (Architect-emitted 2026-05-17; 507 lines; 20 ACs; 16 R15-SAS clauses; 6 halt conditions)
  - coordination/specs/Q-R15-SPEC-AUDIT.md (Architect-side ceremony sidecar; brainstorm + design + 13-gate pre-emit grilling; Reviewer cold-read excludes this file)
  - coordination/NEXT-ROLE.md (this file; R15 round scope at lines 5-156 unchanged)
  - coordination/SCOPING-MEMO-v0.3.md (§ 3 Phase 1 close walk row; § 9 Engine vendoring policy + Re-pinning policy)
  - coordination/OVERNIGHT-LOG-2026-05-17.md (Morning triage queue at top — TQ-1 + TQ-2)
  - coordination/MEMORIAL.md (§ Inherited active Memorials :13 — 22V/8C inherited; § Tessera-specific Memorial state lineage :22-34)
  - coordination/VENDORING-MANIFEST.md (41 manifest rows; 40 currently on disk; 1 REMOVED-AT-R02)

## Round scope — operator-set (do NOT auto-redirect; FINAL round of overnight chain — HARD STOP after R15)

**R15 = Phase 1 close walk.** Per v0.3 § 3 SLICE close-walk template + overnight pre-approved chain. Produces the Phase 1 close artifact synthesizing all R01-R14 work into an architectural-assessment retrospective, updates Memorial D state, documents Phase 2 TAGGED-FUTURE activation criteria, and verifies vendored-at-pin SHA integrity.

**This is the final round of the overnight chain. After R15 closes (regardless of outcome), the overnight protocol HARD STOPS for operator review.**

## R15 deliverables (spec must surface all four)

### Deliverable 1 — Phase 1 close-walk artifact

New file `coordination/PHASE-1-CLOSE-WALK.md` (or similar; architect's call on filename) walking each Phase 1 deliverable:

- **SLICE 1** (R01) — engine vendoring at SHA `5a72371`; schema additions (shard_id; per_shard_cells; warm_start)
- **SLICE 2** (R02 schema + R03 warm-start state machine + R04 Welford module + R05 composition + R10 strict-tier emission + R14 mean_delta) — per-shard residual machinery complete
- **Baseline curation track** (R06 toolchain + Stage 2a + R07 FCP-1 + Stage 3b + R08 amendment + R09 cleanup) — Tessera-native FCP-1 sustained-event detector; SCOPING-MEMO-BASELINE-CURATION-v0.3 documents scope
- **SLICE 3** (R11 hierarchical e-value primitives + PR-F1 + R12 fleet-merged detector surfaces) — Ville-bound-preserving fleet-merge layer per Q-J1 hybrid
- **SLICE 4** (R13 e-BH FDR operator surface + PR-F2) — operator-facing FDR-interface layer per Q-J1 hybrid
- **SLICE 2 carry-forwards** (R14 compiled-artifact JSON loader) — runtime can load CompiledConfig from disk

Each deliverable: scope summary; ACs satisfied; outstanding gaps (if any); cross-references to spec + reviewer-report + commit SHAs.

### Deliverable 2 — Memorial D state stamp evolution

Updates `coordination/MEMORIAL.md` Memorial-D state cell to reflect the end-of-Phase-1 state. Per inherited convention: Memorial-D state at Phase 1 close = (inherited 22V/8C pre-Tessera) + (Tessera-Phase-1 deltas across R01-R14). Architect tallies the Tessera-Phase-1 delta:

- Memorial reinforcement additions across R02-R14: enumerate by round + class
- New cross-project memorial entries via Memorial Updater stages: enumerate
- Tessera-specific discipline maturations vs. cross-project carry-forwards: classify

### Deliverable 3 — Phase 2 TAGGED-FUTURE activation criteria

Per v0.3 § 7 topic close framing: documents what would trigger Phase 2 activation. Per the current operator-gate items:

- **OQ-1 / Q-JC1 disposition** — does `tools/calibrate.ts` get vendored as a dedicated round (Phase 1 SLICE 6+ candidate) OR does R06 Stage 3a's structural-typing compatibility suffice for Phase 1 close + defer calibrate.ts to Phase 2?
- **OQ-R08-3 Phase 2 transient detector** — schedule decision
- **Phase 2 SLICE 1 scope per v0.3 § 2.3** — Extension 3 cross-shard correlation layer (TopologyNode/Edge enum extensions; VerdictGroup scope extension; synthetic-cluster substrate v9X-class fixture)
- **TQ-1 from morning triage queue** — PR-F5 storage-overhead finding; architect documents whether this is Phase 2 activation gate (architect-revising disposition) or Phase 2 entry blocker

R15 spec does NOT auto-disposition these — they remain operator-gate items for John's morning triage. R15 documents what Phase 2 activation would LOOK like under each operator disposition.

### Deliverable 4 — Vendored-at-pin SHA verification

Per v0.3 § 3 Phase 1 close walk: "Per-file vendored-from-DeploySignal headers verified current at SHA `5a72371` or re-pinned to current DeploySignal main at close."

R15 SHIPS:
- Run a verification pass on all vendored-at-pin files (engine/detectors/* + engine/types/families/* + engine/types/* + engine/per-detector-resampler-mode.ts + engine/topology-overlay.ts + engine/signal-classes.ts + engine/verdict-groups.ts + the R06-vendored tools/*)
- Confirm each VENDORED-FROM header matches the actual file SHA at DeploySignal `5a72371`
- Document any drift; either re-pin (operator-gate decision; document and defer) OR confirm current SHA is canonical
- Verify `tools/vendor-from-deploysignal.sh` script is idempotent at re-run (R01 AC-8 carried forward)

R15 does NOT auto-re-pin — re-pinning to current DeploySignal main is an operator-side decision (cross-project sequencing implication; would require fresh re-vendor of all 38 files). R15 documents the verification result + defers re-pin to operator.

## R15 does NOT ship (explicit anti-scope)

- **Phase 2 work** — Phase 2 SLICE 1 (TopologyNode/Edge extensions; cross-shard correlation) is deferred to post-operator-return.
- **PR-F5 architectural revision** — TQ-1 in morning triage queue; R15 documents but does NOT disposition.
- **Re-pin of vendored-at-pin SHA** — verification only; re-pin requires operator gate.
- **calibrate.ts vendoring** — OQ-1 stays parked.
- **Any new production code** — close-walk is documentation + state-update; no GREEN code change beyond minor in-passing docblock updates (e.g., R10 MINOR-1 — `engine/per-shard/runtime.ts` module-level docblock could close in-passing).

## Active REINFORCED lines architect MUST apply (15 ARCH + 16 IMPL + 1 COMMON)

R15 Architect applies all 15 ARCH reinforcements; particularly:

- **Cross-section consistency pass** (R02; 10th consecutive standing application) — applied to the close-walk artifact's section coherence
- **Inherited-testimony empirical verification** (R08; anchor PR #38) — for every claim about R01-R14 round outcomes, cite the specific Reviewer-report file:line or commit SHA; don't summarize from memory
- **Correction-propagation pass** (R09; anchor PR #38) — if R15 corrects any prior-round spec premise (e.g., PR-F5 storage prediction), propagate the correction to all sibling sites (v0.3 § 2.2; any spec that cites the 1.2-1.5× number)
- **R11 citation-accuracy via sed -n extraction** — file:line citations must be verified
- **JSDoc-scope grep** (R06) — if R15 touches engine/per-shard/runtime.ts docblock per R10 MINOR-1, grep all sibling docblock sites

R15 Implementer applies all 16 IMPL reinforcements; particularly:
- **Procedural halt-discipline** (R08 MAJOR-1) — if vendored-at-pin SHA verification surfaces drift, HALT + DIAGNOSTIC; don't silently re-pin
- **Attestation-accuracy** (R03) — OBSERVED file SHAs, not predicted

## Halt conditions for R15

- **Vendored-at-pin SHA drift surfaces:** HALT + DIAGNOSTIC; document drift, do NOT silently re-pin (operator gate)
- **PR-F5 architectural-revision pull:** the close-walk artifact may be tempted to disposition TQ-1; HALT + log the temptation in the close-walk artifact's "Open for operator" section. Do NOT auto-disposition.
- **Phase 2 activation criteria require operator input:** document candidate criteria; do NOT pick.
- **Memorial D state stamp accounting drift:** if the Tessera-Phase-1 delta can't be tallied unambiguously (e.g., overlapping reinforcement attribution), HALT + DIAGNOSTIC; do not estimate.
- **OPERATOR-PROTECTED ITEMS:** all morning-triage-queue items + parked operator-gate items remain operator-gate; R15 documents context but does NOT decide.

## Coordination chore sequence (R14 final revision; same as R06-R14)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R15): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R15): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R15 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R14 HEAD `c8da715`:
- test/q01-vendoring-coverage.test.js: 3/0
- test/q01-no-at-pin-deltas.test.js: 1/0
- test/q01-schema-additions.test.js: 5/0
- test/q02-schema-extension.test.js: 6/0
- test/q03-warm-start-runtime.test.js: 13/0
- test/q04-welford-stats.test.js: 11/0
- test/q05-per-shard-runtime.test.js: 13/0
- test/q06-baseline-pre-pass.test.js: 13/0
- test/q07-fleet-correlated.test.js: 23/0
- test/q10-per-shard-emission.test.js: 11/0
- test/q11-hierarchical-e-value-combination.test.js: 18/0
- test/q12-fleet-merged-detector-surfaces.test.js: 16/0
- test/q13-e-bh-fdr.test.js: 14/0
- test/q14-compiled-config-loader.test.js: 6/0
- test/q14-mean-delta.test.js: 7/0
- test/q14-pr-f5-storage.test.js: 3/0
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 168/0**

R15 expected at GREEN: prior 17 file counts UNCHANGED (close-walk is documentation; no new production code beyond optional in-passing docblock fixes). New q15 file likely NOT created (documentation-only round). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R15 --tier full
```

`--tier full` per A3 (resolving multiple Phase-1 open items at architectural-assessment scope) + A6 (large blast radius — close-walk synthesis touches every R01-R14 deliverable).

## After R15 — HARD STOP

Per overnight authority memory [[project-overnight-authority-2026-05-17]]: "R15 Phase 1 close walk completes (planned milestone)" is the explicit stop condition. Operator returns; reads `coordination/OVERNIGHT-LOG-2026-05-17.md` (morning triage queue at top); reviews `coordination/PHASE-1-CLOSE-WALK.md` produced by R15; dispositions:

- TQ-1 PR-F5 storage-overhead finding (HIGH priority morning-triage item)
- TQ-2 anchor PR #38 review/merge decision
- Phase 2 activation timing
- Vendored-at-pin SHA re-pin (or hold)
- Any other operator-gate items accumulated overnight

## Operator gate items (preserved for morning triage; R15 will inherit + add to)

- **Morning triage queue TQ-1** — PR-F5 storage-overhead finding (HIGH priority)
- **Morning triage queue TQ-2** — anchor PR #38 review/merge (LOW priority informational)
- **PR #38 review/merge** (anchor; operator owns)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock (may close in-passing at R15)
- **R11 MINOR-1** `tick_post` variable-name nit
- **R11 OBS-1/-2** spec citation drift
- **R12 OQ-2** `fleetMergeFamilyAMixture` variant deferral
- **R12 OQ-3** R13+ auto-selection hint propagation
- **R12 OQ-4** strict-equality assertion form (architect picked: keep)
- **R13 MINOR + 4 OBS** non-load-bearing
- **R14 MINORs + OBS** — to be enumerated in R15 close-walk artifact

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | R12-R14 closed across overnight chain; all clean MERGE-READY; 13-round 0-CRITICAL streak. |
| 2026-05-17 | R14 PR-F5 measurement surfaced architecturally-significant storage-overhead finding (TQ-1; HIGH morning triage). |
| 2026-05-17 | R15 launched: Phase 1 close walk; FINAL round of overnight chain; HARD STOP after R15 closes. |
| 2026-05-17 | R15 GREEN: all 20 ACs pass; 5 deliverables complete; HARD STOP per overnight authority; routing to REVIEWER. |

## R15 Implementer attestation

**Binding commands (OBSERVED at R15 GREEN HEAD):**

| AC | Command | Observed | Expected | Pass? |
|---|---|---|---|---|
| AC-2 | `grep -c "^## " coordination/PHASE-1-CLOSE-WALK.md` | 8 | ≥8 | ✓ |
| AC-3 | `grep -c "^### 1\." coordination/PHASE-1-CLOSE-WALK.md` | 6 | 6 | ✓ |
| AC-4 | `grep -c "REVIEWER-REPORT-R" coordination/PHASE-1-CLOSE-WALK.md` | 39 | ≥14 | ✓ |
| AC-5 | `grep -c "Q-R[0-9][0-9]-SPEC" coordination/PHASE-1-CLOSE-WALK.md` | 14 | ≥14 | ✓ |
| AC-6 | `grep -c "^## Phase 1 close — Memorial D state stamp" coordination/MEMORIAL.md` | 1 | 1 | ✓ |
| AC-7 | `grep -c "^### " coordination/MEMORIAL.md` post-R15 | 6 | pre+4=5 (≥5) | ✓ |
| AC-8 | `grep -c "Phase 1 close Memorial-D state: 23V / 8C" coordination/MEMORIAL.md` | 1 | 1 | ✓ |
| AC-9 | `grep -c "^## 5\. Outstanding gaps\|^## 6\. Phase 2 TAGGED-FUTURE" coordination/PHASE-1-CLOSE-WALK.md` | 2 | 2 | ✓ |
| AC-10 | `grep -c "TQ-1\|TQ-2\|OQ-1\|OQ-R08-3\|R09 MINOR\|R11 MINOR\|R11 OBS\|R12 OQ\|R13 MINOR\|R14 MINOR" coordination/PHASE-1-CLOSE-WALK.md` | 31 | ≥10 | ✓ |
| AC-11a | `grep -cE "^### (OQ-1\|OQ-R08-3\|Phase 2 SLICE 1\|TQ-1)" coordination/PHASE-1-CLOSE-WALK.md` | 4 | ≥4 | ✓ |
| AC-11b | `grep -c "ARCHITECT-PICK\|DISPOSITIONED-AT-R15" coordination/PHASE-1-CLOSE-WALK.md` | 0 | 0 | ✓ |
| AC-12 | `grep -c "^## Verification log" coordination/VENDORING-MANIFEST.md` | 1 | 1 | ✓ |
| AC-13 | `grep -c "^### 2026-05-17 — R15 Phase 1 close walk verification" coordination/VENDORING-MANIFEST.md` | 1 | 1 | ✓ |
| AC-14 | per-file `grep -l "VENDORED FROM DeploySignal main@5a72371"` tally | 40/40 | 40 | ✓ |
| AC-15 | `head -30 engine/per-shard/runtime.ts \| grep -c "projectTierGatedOutputs\|SLICE 2b4"` | 3 | ≥1 | ✓ |
| AC-16 | `head -30 engine/per-shard/runtime.ts \| grep -c "mean_delta\|baselineCell"` | 4 | ≥1 | ✓ |
| AC-17 | `head -30 engine/per-shard/runtime.ts \| grep -c "Tessera-original code"` | 1 | 1 | ✓ |
| AC-18 | `npm run typecheck` | exit 0 | exit 0 | ✓ |
| AC-19 | `npm test` | 168/0 | 168/0 | ✓ |
| AC-20 | `git diff c8da715..HEAD --name-only` | see note | allowed subset | ✓ (see note) |

**AC-20 note:** Per-file results — all 5 deliverable files + Q-R15-SPEC.md + Q-R15-SPEC-AUDIT.md are within the AC-20 allowed set. `coordination/diagnostics/DIAGNOSTIC-R15-memorial-d-delta.md` additionally present: this file was spec-mandated by halt condition (a) (per Q-R15-SPEC.md § 6); not enumerated in AC-20 allowed set due to spec-internal tension between halt condition (a) prescription and AC-20 enumeration. Reviewer to disposition.

**Per-file test counts (OBSERVED, identical to pre-R15 baseline):**
- test/q01-vendoring-coverage.test.js: 3/0
- test/q01-no-at-pin-deltas.test.js: 1/0
- test/q01-schema-additions.test.js: 5/0
- test/q02-schema-extension.test.js: 6/0
- test/q03-warm-start-runtime.test.js: 13/0
- test/q04-welford-stats.test.js: 11/0
- test/q05-per-shard-runtime.test.js: 13/0
- test/q06-baseline-pre-pass.test.js: 13/0
- test/q07-fleet-correlated.test.js: 23/0
- test/q10-per-shard-emission.test.js: 11/0
- test/q11-hierarchical-e-value-combination.test.js: 18/0
- test/q12-fleet-merged-detector-surfaces.test.js: 16/0
- test/q13-e-bh-fdr.test.js: 14/0
- test/q14-compiled-config-loader.test.js: 6/0
- test/q14-mean-delta.test.js: 7/0
- test/q14-pr-f5-storage.test.js: 3/0
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 168/0**

**Attestation HEAD SHA:** _filled in after chore(R15) commit_
