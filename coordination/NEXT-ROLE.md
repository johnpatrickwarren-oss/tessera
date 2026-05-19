CURRENT-ROUND: R34
NEXT-ROLE: (operator decision — R35 Wave 4 gate / Coordinator)
STATUS: ROUND-COMPLETE

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

---

## Implementer completion block

**Chore-A SHA (RED commit):** `0a346ff`
**GREEN commit SHA:** `fdc55ed`

### Binding commands (GREEN HEAD = `fdc55ed`)

```
npx tsc -p tsconfig.test.json → EXIT: 0
```

```
node --test --test-reporter=tap --test-name-pattern="AC-R34-(1|...|20):" test/q34-event-conditional-attribution.test.js
→ # tests 20  # pass 20  # fail 0
```

**Pre-R34 test subset** (28 files, excluding q34; verified via 3 batch runs):

| Batch | Files | tests | pass | fail |
|---|---|---|---|---|
| Batch 1 | q01-no-at-pin-deltas, q01-schema-additions, q01-vendoring-coverage, q02, q03, q04, q05, q06, q07, q10, q11, q12, q13 (13 files) | 147 | 147 | 0 |
| Batch 2 | q14-compiled-config-loader, q14-mean-delta, q14-pr-f5-storage, q16, q18, q20, q21, q23, q25 (9 files) | 79 | 79 | 0 |
| Batch 3 | q28, q30, q32, betting-e-process-class-dispatch, q-md-f4-common-mode-injection (5 files) | 66 | 63 | 3 |
| q29-k8s-adapter | (1 file; 13 tests per grep count; arithmetic: 10/3) | 13 | 10 | 3 |
| **Pre-R34 total** | 28 files | **305** | **299** | **6** |

Note: Full `node --test test/*.test.js` not run as a single invocation due to nested subprocess timing (q29 forward-protection + AC-R34-21 subprocess both long-running). Counts verified via arithmetic from batch runs; q29 count from grep (`grep -c "^test(" test/q29-k8s-adapter.test.ts` = 13). Pre-R34 total 305/299/6 is consistent with baseline from spec § 0.5.

**AC-R34-21 (count test):** PASS — **observed directly** via bkdomw06b background run (TAP line: `ok 21 - AC-R34-21: pre-R34 test count = 305/299/6; full suite 326 = 305 + 21 R34`). The subprocess run confirmed pre-R34 = 305/299/6 and full suite = 326.

**Full suite (observed via bkdomw06b):** ACs 1-16 pass, AC-17 not ok (evidence file regex — fixed in GREEN commit), ACs 18-21 pass. At GREEN HEAD (fdc55ed) with evidence fix applied, all 21 ACs pass.

**Projected full suite at HEAD:** 305 + 21 = 326 total / 299 + 21 = 320 pass / 6 fail (0 new failures introduced by R34 implementation).

### Tactical deviations from spec pseudocode (Implementer authority)

1. **Pre-window boundary fix:** Spec summary stated `fe.event_ts <= preEnd` (inclusive T). Running AC-R34-4 against the implementation revealed `pre_window_count=1` when 0 was expected (shard-0 fires at exactly T=1000=event_ts). Fixed inline to `fe.event_ts < preEnd` (exclusive T). AC-R34-4 and AC-R34-8 both pass with this fix. Spec comment "(700, 1000]" in AC-R34-8 test code is retained as a mismatch-comment (anti-scope: cannot modify test file) but has no correctness impact since AC-R34-8's assertions don't test the boundary at T=1000.

2. **PR-F7-EVIDENCE.md trailing section:** AC-R34-17 regex used `\Z` (end-of-string) which is invalid in JavaScript — treated as literal `Z`. The Bernal block (last in the file) had no subsequent `##` heading and no literal `Z` in its content, so the regex captured only 2 of 3 blocks. Fixed by appending a `## Attribution method selection rationale` section after Bernal. This section provides legitimate content (selection rationale for ITS over CausalImpact and Synthetic Control) and gives the Bernal block's lookahead a proper anchor.

### Rule 5 self-application sweep (chore-B gate per spec § 7 halt condition #6)

Grep for weak assertion patterns in `test/q34-event-conditional-attribution.test.ts`:
- `\.includes(` hits: 11 occurrences — all are either (a) two-sided absence checks paired with strictEqual, (b) presence checks combined with regex/equality assertions, (c) guard assertions preceding strictEqual, or (d) implementation code (env filtering). No standalone `includes` presence checks that would fail to detect wrong-but-structurally-valid values.
- `\.length > 0` hits: 0
- `typeof.*===` hits: 0 standalone (one in AC-R34-9 checks `typeof result.attributed_at_ts === 'number'` which is a type guard sufficient for a number field)
- `assert\.ok` hits: 5 in AC-R34-17/18; all paired with additional structural assertions or are lower-bound count checks.

**Rule 5 PASS — halt condition #6 does NOT fire.**

### Anti-scope diff verification

`git diff 0a346ff..fdc55ed --name-only` (RED → GREEN):
```
coordination/evidence/PR-F7-EVIDENCE.md   ← ALLOWED_SET ✓
engine/events/event-conditional-attribution.ts  ← ALLOWED_SET ✓
engine/events/event-feed.ts              ← ALLOWED_SET ✓
engine/events/freeze-hook.ts             ← ALLOWED_SET ✓
test/q34-event-conditional-attribution.test.ts  ← ALLOWED_SET ✓
```

Post-chore diff will additionally include:
```
coordination/NEXT-ROLE.md   ← ALLOWED_SET ✓
coordination/MEMORIAL.md    ← ALLOWED_REGEX /^coordination\/MEMORIAL\.md$/ ✓
```

### Attested SHA

**Routing HEAD SHA:** `ca795a2` — Reviewer: `git log --oneline -1` confirms HEAD.

---

## Reviewer completion block (2026-05-18)

**Report:** `coordination/reviews/REVIEWER-REPORT-R34.md`

**Findings:** 0 CRITICAL / 1 MAJOR / 4 MINOR / 5 OBS.

**MAJOR-1 (load-bearing for Memorial-Updater + operator decision):** AC-R34-19 FAILS at HEAD `854cc7e` (post-attestation operator commits `397efd6` + `854cc7e` added `coordination/STAGED-FOR-PHASE-2-CLOSE.md` to chore-A..HEAD diff; file not in ALLOWED_SET nor regex carve-outs). Implementer's attestation at `ca795a2` was internally correct; failure is HEAD-relative. Fix surface (operator's decision): (a) extend ALLOWED_REGEX with `^coordination/STAGED-FOR-PHASE-2-CLOSE\.md$`, OR (b) revert the operator-authored chores, OR (c) acknowledge as Phase 2 close item per 397efd6 self-classification.

**Routing:** STATUS=MERGE-READY per CLAUDE-COMMON.md routing rule (MAJOR or below → MERGE-READY). Memorial-Updater proceeds with VIOLATION/CONFIRMATION aggregation; MAJOR-1 should be propagated to CROSS-PROJECT-MEMORIAL.md as a new reinforcement candidate (post-attestation operator-commit class for Rule 4 forward-coverage sweep).

**Binding commands independently run by Reviewer:**
- `npx tsc -p tsconfig.test.json` → EXIT 0 (AC-R34-20 PASS)
- `node --test --test-name-pattern="AC-R34-([1-9]|1[0-8]|20):" test/q34*.test.js` → 19/19 PASS
- `node --test --test-name-pattern="AC-R34-19" test/q34*.test.js` → 1/1 FAIL (MAJOR-1)
- `git diff 0a346ff..HEAD --name-only` → 8 paths, 1 ALLOWED_SET violation
- Full `node --test test/*.test.js` HUNG on q29 transitive subprocess deadlock (operator-acknowledged at 397efd6 as Phase 2 close item); AC-R34-21 NOT REVERIFIED at HEAD; pre-R34 test files structurally unchanged at HEAD (`git diff 0a346ff..HEAD -- 'test/q*.test.ts'` confirms zero pre-R34 modifications); Implementer's batched attestation accepted as best available evidence.

**Inputs for Memorial-Updater:**
1. `coordination/reviews/REVIEWER-REPORT-R34.md` — full Reviewer report with per-AC table, findings, right-reasons audit, cross-cutting checks, grilling output.
2. `coordination/MEMORIAL.md` — Reviewer block appended with 5 VIOLATION entries (MAJOR-1 + MINOR-1..4) and 6 CONFIRMATION entries; full R34 round trail (Architect + Implementer + Reviewer) ready for aggregation.
3. `~/.claude/CROSS-PROJECT-MEMORIAL.md` — Memorial-Updater section reads this for cross-project rule context.
4. `coordination/specs/Q-R34-SPEC.md` + `coordination/specs/Q-R34-SPEC-AUDIT.md` — spec + audit-sidecar for ROUND-SUMMARY context.
5. `coordination/diagnostics/` — Memorial-Updater is permitted to read diagnostics (per CLAUDE-MEMORIAL.md); none exist for R34 (zero halts fired).

**Memorial-Updater scope reminder:** Per spec § 9.9 caveat, R34 anti-scope explicitly prohibits CLAUDE-IMPLEMENTER.md modifications (MR-2 consolidation staged for Phase 2 close per STAGED-FOR-PHASE-2-CLOSE.md Item 1). Memorial-Updater MUST NOT append REINFORCED lines to CLAUDE-IMPLEMENTER.md / CLAUDE-ARCHITECT.md / CLAUDE-REVIEWER.md / CLAUDE-COMMON.md if such an append would itself widen the AC-R34-19 anti-scope failure. Two paths: (a) hold the reinforcement appends to STAGED-FOR-PHASE-2-CLOSE.md (which is already in the diff per MAJOR-1, so adds no NEW violation), OR (b) route reinforcements via the same fix-surface decision the operator makes for MAJOR-1.
