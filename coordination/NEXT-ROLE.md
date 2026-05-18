CURRENT-ROUND: R34
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R34 — Wave 4 / WU-06 SLICE 4 event-conditional attribution)

**R34 = Wave 4 single-cluster dispatch: WU-06 SLICE 4 event-conditional attribution; full tier; main worktree.**

Architect spec emitted at `coordination/specs/Q-R34-SPEC.md` (21 ACs; target range 18-24 satisfied). Audit-sidecar at `coordination/specs/Q-R34-SPEC-AUDIT.md` (P3 ten-axis + decision rationale + Architect pre-predictions + brainstorm enumeration).

After this WU close + Wave 4 gate (R35; Coordinator emits `WAVE-GATE-04.md` + `CLUSTER-HANDOFF-4-WU06-WU07.md`) → Wave 5 dispatch (WU-07 Phase 2 close-walk; audit + `HYBRID_REVIEWER=true`) → Wave 5 gate (R37+ area): **HARD STOP at Phase 2 close milestone** per extended overnight authority [[project-overnight-authority-2026-05-18-morning]].

## OQ defaults / decisions (Architect spec-emit time)

| OQ | Default | Applied | Where |
|---|---|---|---|
| OQ-W3-1 (event-feed file layout) | A — single-file `engine/events/event-feed.ts` | **A accepted** | Q-R34-SPEC § 0.1 |
| OQ-W3-2 (freeze-hook coupling scope) | A — vendored-with-deltas on inherited Phase 1 substrate | **A REFINED to D (wrapper + config-flag combo)** | Q-R34-SPEC § 0.2 (empirical-premise correction: no inherited freeze-hook substrate exists; verified `grep -rn 'freeze_hook' engine/` = zero hits) + § 0.3 (5-approach brainstorm; D selected); audit-sidecar § 1 |
| OQ-W3-3 (SCOPING-MEMO MAJOR-1 surgery timing) | B — defer to WU-07 close-walk | **B accepted** | Q-R34-SPEC § 0.1, § 5.2 anti-scope hard limit |
| OQ-W3-4 (event-feed schema closed-set vs extensible) | Architect's Brainstorm-phase call | **Closed-set 5 event-classes** (firmware_push, model_redeploy, env_change, config_change, capacity_change per SCOPING-MEMO § 2.3 enumeration) | Q-R34-SPEC § 0.1, § 1.1 S1 |

## Inputs for next role (Implementer)

**Read in order:**

1. **`coordination/specs/Q-R34-SPEC.md`** — primary spec. 21 ACs; 4 architectural surfaces; full pseudocode; 5 cross-project rules applied UPFRONT; Rule 5 self-application sweep at § 9.5; ALLOWED_SET + regex carve-outs at § 5; halt conditions at § 7.
2. **(For audit-trail awareness; NOT required for chore-A authoring)** `coordination/specs/Q-R34-SPEC-AUDIT.md` — Architect pre-predictions; brainstorm decision rationale; P3 ten-axis verification.
3. **`coordination/cluster-scopes/wave-4/wu-06-event-conditional-attribution.md`** — original scope block.
4. **`coordination/CLUSTER-HANDOFF-3-WU04-WU06.md`** — HIGHEST RELEVANCE: A16 wire-format binding precedent (regex /m + JSON round-trip).
5. **`coordination/WAVE-GATE-03.md`** — § Pre-flags (baseline empirically verified at session entry; § 0.5 of spec).
6. **`~/.claude/CROSS-PROJECT-MEMORIAL.md`** — 5 cross-project rules active. Rule 5 self-application required at chore-B preparation per spec § 7 halt condition #6.

## Architect commit (this commit, BEFORE chore-A)

Per R21 ARCH MINOR-1 + tessera R21 MINOR-1 reinforcement: Q-R34-SPEC.md + Q-R34-SPEC-AUDIT.md committed in this Architect commit BEFORE the NEXT-ROLE.md routing block triggers Implementer chore-A. Implementer's chore-A SHA will be downstream of this commit; spec artifacts are within the chore-A diff range; AC-R34-19 anti-scope ALLOWED_SET includes both spec files as literal entries.

## Four architectural surfaces (per spec § 1.1)

1. **Surface 1 — Event-feed substrate** (`engine/events/event-feed.ts` NEW; Tessera-original)
   - Closed-set 5-event-class `ClusterEventKind` union
   - `ClusterEvent` interface with `event_id` (identity-threaded as `cluster_event_id`), `kind`, `event_ts`, optional `event_window_end_ts`, optional `metadata`
   - `EventFeed` interface; `SyntheticEventFeed` impl with canonical sort

2. **Surface 2 — Event-conditional correlational attribution layer** (`engine/events/event-conditional-attribution.ts` NEW; Tessera-original)
   - ITS-class pre/post window comparison (defaults 300/300/60 seconds)
   - `attributeEventConditional(input): EventConditionalAttributionResult` pure function
   - `EventConditionalCandidate` with `correlational_not_causal: true` literal (A16; three-way binding)
   - Cell 4 confounding-discrimination via `correlation_window_seconds` predicate

3. **Surface 3 — Phase 1 freeze-hook activation coupling** (combined approach per spec § 0.3 Approach D)
   - NEW `engine/events/freeze-hook.ts` (Tessera-original wrapper)
   - `freezeAwareUpdatePerShardResidual` wraps inherited `updatePerShardResidual` at `engine/per-shard/runtime.ts:82`
   - `engine/types/config.ts` Delta 5: `CompiledConfig.freeze_hook_enabled?: boolean` (header inventory updated 4→5 deltas)
   - Two-step maintenance UPFRONT: VENDORING-MANIFEST.md row update (notes column); AT_PIN_FILES exclusion already in place (verified at session entry; no edit required)

4. **Surface 4 — PR-F7 4-cell evidence matrix** (`coordination/evidence/PR-F7-EVIDENCE.md` NEW)
   - 3 external citations (Brodersen 2015 + Abadie 2010 + Bernal 2017) — URL + retrieval date 2026-05-18 + verbatim quote ≥30 chars each
   - 4 Reviewer-verified cell ACs (per R32 MINOR-4 reinforcement; avoid PR-F6 Cell 4 gap)
   - WU-07 close-walk audits this package under hybrid Reviewer (NOT at R34)

## Apply all 5 cross-project rules (Implementer self-discipline at chore-A + chore-B)

1. **false-compliance-attestation** (Rule 1) — encode actual binding-command results verbatim. AC-R34-20 tsc exit 0 + AC-R34-21 test count = baseline 305 + 21 R34 = 326 / pass 320 / fail 6.
2. **architect-branch-binding-coverage** (Rule 2) — spec § 1.3 F-table enumerates 21 failure modes mapped to ACs; verify each AC structurally exercises its bound branch at chore-B.
3. **implementer-spec-test-assertion-coverage** (Rule 3) — every Then-column field asserted one-for-one in test pseudocode.
4. **anti-scope-allowed-set-forward-coverage** (Rule 4) — spec § 5 ALLOWED_SET + regex carve-outs (REVIEWER-REPORT-R34*.md + DIAGNOSTIC-R34-*.md + MEMORIAL.md + ROUND-R34-SUMMARY.md).
5. **rule-derivation-without-self-application (NEW R33 gate)** (Rule 5) — Implementer re-runs grep + mutation sweep on `test/q34-event-conditional-attribution.test.ts` at chore-B preparation per spec § 7 halt condition #6 + § 9.5 procedure.

## Anti-scope (R34 hard limits — per spec § 5)

Headline (full enumeration in spec § 5.2):
- A12 (engine internals frozen; vendored-with-deltas ONLY at `engine/types/config.ts` Delta 5)
- A10 (hardware diagnosis fenced; event-feed ingests *deployment* events not hardware-fault signals)
- A11 (synthetic only — NO live deployment-pipeline endpoints; SyntheticEventFeed only)
- **A16 — Addition #26 D4 `correlational_not_causal: true` PRESERVED at every event-conditional emit site — HIGHEST RELEVANCE; three-way binding (regex /m anchor + JSON round-trip + two-sided absence)**
- A13 (rule-based + statistical only — ITS / pre-post comparison; NO ML)
- A17 (no DeploySignal-integration scope)
- NO modification of any Wave 1+2+3 deliverable
- NO modification of any pre-R34 test file
- NO modification of `engine/types/verdict.ts` (R18/R20/R23 frozen)
- NO modification of `engine/per-shard/{warm-start,runtime,welford}.ts` (Tessera-original; per § 0.3 Approach B rejected)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (R32 MAJOR-1 surgery deferred to WU-07 per OQ-W3-3 = B)
- NO modification of `coordination/PRD.md`
- NO modification of `multi-track-cluster-setup.sh` or any `scripts/*` (operator-owned)
- NO modification of `CLAUDE-IMPLEMENTER.md` (MR-2 consolidation staged for Phase 2 close)
- NO R32 carry-forward closures (WU-07 punch list per `STAGED-FOR-PHASE-2-CLOSE.md` Item 2). Specifically: SCOPING-MEMO MAJOR-1; 4 weak ACs (AC-R32-2/7/13/14); execSync at q25/q30; R26 MINOR-2 (carries forward per spec § 0.6 — WU-06 does NOT ship FusedVerdict → FiredShardEvent adapter site)
- NO PR-F7 hybrid Reviewer at R34 (fires at WU-07)

## Halt conditions

Per spec § 7 (6 halt conditions):

1. A16 D4 reversal surface emerges — HALT + DIAGNOSTIC + ESCALATE (highest priority)
2. Freeze-hook wrapper exposes a hole (re-run `grep -rn 'updatePerShardResidual' engine/`; if hits ≥2, interception incomplete) — HALT + DIAGNOSTIC; bounded options
3. PR-F7 external literature URL dead at chore-A SHA — HALT + DIAGNOSTIC; do NOT silently accept dead links
4. Binding-command output contradicts AC literal text — HALT per Rule 1 false-compliance-attestation; do NOT reframe
5. Event-conditional attribution surfaces structural false-positive (Cell 4 confounding-discrimination unfixable by AC tuning) — HALT + DIAGNOSTIC
6. Rule 5 self-application sweep at chore-B preparation identifies non-discriminating AC unstrengthenable without scope expansion — HALT for operator decision

## Escalation items

(none active)

## Routing notes

- Architect pre-prediction (per audit-sidecar § 3): all 21 R34 ACs PASS at chore-B SHA; tsc exits 0; anti-scope clean; 0 CRITICAL / 0 MAJOR / 0-2 MINOR / 0-5 OBS at Reviewer.
- 33rd consecutive 0-CRITICAL round target.
- Implementer tactical autonomy: spec pseudocode prescribes WHAT and WHY; tactical detail (exact JS idioms, glob syntax, regex end-of-string handling) is Implementer's call per 2026-05-10 spec-depth methodology.

## State at R34 Architect-emit

| Element | State |
|---|---|
| Wave 1+2+3 deliverables | ✅ all merged + close-walked at R32 |
| WAVE-PLAN-03 + WAVE-GATE-03 + 6 CLUSTER-HANDOFF-3 | ✅ emitted at R33 |
| 5 cross-project rules active | ✅ all in CROSS-PROJECT-MEMORIAL.md (Rule 5 NEW at R33 gate) |
| R34 spec + audit-sidecar | ✅ emitted at this commit (Architect, R34) |
| Empirical baseline verified at session entry | ✅ tests=305/pass=299/fail=6; tsc exit 0 at HEAD `e7547a0` |
| Empirical-premise correction (no inherited freeze-hook substrate) | ✅ documented at Q-R34-SPEC § 0.2 |
| Approach D selection (wrapper + config-flag combo) | ✅ documented at Q-R34-SPEC § 0.3 + audit § 1 |
| 0-CRITICAL streak | 32+ rounds (target 33 at R34 close) |
| Working tree | clean (this Architect commit is the first R34 commit) |
| HARD STOP | Phase 2 close milestone (Wave 5 gate; R37+ area) |
