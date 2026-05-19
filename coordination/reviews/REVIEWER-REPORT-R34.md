# REVIEWER-REPORT-R34 — Tessera Phase 2 SLICE 4 (WU-06)

**Round:** R34 (Wave 4, single cluster, full tier; main worktree).
**Reviewer:** Claude (Opus 4.7).
**Date:** 2026-05-18.
**Inputs consulted:** `coordination/PRD.md`; `coordination/specs/Q-R34-SPEC.md`; `coordination/specs/Q-R34-SPEC-AUDIT.md`; `coordination/NEXT-ROLE.md`; `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section); source files (`engine/events/event-feed.ts`, `engine/events/event-conditional-attribution.ts`, `engine/events/freeze-hook.ts`, `engine/types/config.ts` Delta 5 region, `engine/topology/common-mode-attribution.ts` for `FiredShardEvent` type contract, `coordination/VENDORING-MANIFEST.md` config row, `coordination/evidence/PR-F7-EVIDENCE.md`); test files (`test/q34-event-conditional-attribution.test.ts`, `test/_substrate/v9Z-event-cluster.ts`); recent git log (chore-A `0a346ff` → HEAD `854cc7e`).
**NOT consulted (cold-review independence preserved):** `coordination/diagnostics/`, `coordination/logs/`, any `.prompt-*.md`.
**Binding commands run independently** (per R06+ standing Reviewer policy):

```
npx tsc -p tsconfig.test.json
→ EXIT 0
```

```
node --test --test-reporter=tap --test-name-pattern="AC-R34-([1-9]|1[0-8]|20):" test/q34-event-conditional-attribution.test.js
→ # tests 19  # pass 19  # fail 0
```

```
node --test --test-reporter=tap --test-name-pattern="AC-R34-19" test/q34-event-conditional-attribution.test.js
→ # tests 1  # pass 0  # fail 1   (see MAJOR-1)
```

```
node --test --test-reporter=tap test/*.test.js
→ hang on q29 subprocess (operator-captured at 397efd6); killed. Implementer attested 326/320/6 via batched runs at ca795a2 SHA; pre-R34 test files unchanged at HEAD; structural carry preserved (see OBS-2).
```

```
git diff 0a346ff..HEAD --name-only
→ 8 paths; 1 violates ALLOWED_SET (coordination/STAGED-FOR-PHASE-2-CLOSE.md). See MAJOR-1.
```

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R34-1 | ClusterEvent.kind closed-set 5-class union | PASS | `engine/events/event-feed.ts:10-15`; test pass (`AC-R34-1: ClusterEvent.kind is closed-set 5-class union`, `q34*.test.js:40-51`) |
| AC-R34-2 | SyntheticEventFeed sorts; empty→[] | PASS | `engine/events/event-feed.ts:42-54`; test pass (`q34*.test.js:54-75`) |
| AC-R34-3 | `cluster_event_id` identity threading | PASS | `engine/events/event-conditional-attribution.ts:126`; test pass (`q34*.test.js:78-89`) |
| AC-R34-4 | PR-F7 Cell 1 — 1 candidate; member_count=3 | PASS | `engine/events/event-conditional-attribution.ts:125-134`; test pass (`q34*.test.js:92-105`); substrate `v9Z-event-cluster.ts:32-42` |
| AC-R34-5 | PR-F7 Cell 2 — empty inputs → 0 candidates | PASS | early-return path via empty `cluster_events`; test pass (`q34*.test.js:108-112`); substrate `v9Z-event-cluster.ts:48-50` |
| AC-R34-6 | PR-F7 Cell 3 — singleton excluded | PASS | filter `event-conditional-attribution.ts:122`; test pass (`q34*.test.js:115-119`); substrate `v9Z-event-cluster.ts:57-65` |
| AC-R34-7 | PR-F7 Cell 4 — confounding-discrimination excludes unrelated shards | PASS | correlation-window filter `event-conditional-attribution.ts:112-114`; test pass (`q34*.test.js:122-132`); substrate `v9Z-event-cluster.ts:76-87` |
| AC-R34-8 | DEFAULT constants 300/300/60; adjacent fires classified | PASS | constants `event-conditional-attribution.ts:73-75`; test pass (`q34*.test.js:135-157`). NOTE: AC text and test assertion do not exercise the exact-T boundary (see MINOR-1) |
| AC-R34-9 | Empty inputs → empty candidates (graceful) | PASS | `event-conditional-attribution.ts:95` for-loop early termination; test pass (`q34*.test.js:160-164`) |
| AC-R34-10 | A16 type-decl regex `/m` | PASS | `event-conditional-attribution.ts:38` literal `correlational_not_causal: true;`; test pass (`q34*.test.js:167-173`) |
| AC-R34-11 | A16 JSON round-trip | PASS | wire emit at `event-conditional-attribution.ts:133`; test pass (`q34*.test.js:176-186`) |
| AC-R34-12 | A16 two-sided absence of `: false` | PASS | grep over `engine/events/*.ts` shows no `correlational_not_causal: false`; test pass (`q34*.test.js:189-205`) |
| AC-R34-13 | Wrapper FREEZE branch | PASS | `engine/events/freeze-hook.ts:47-49`; test pass (`q34*.test.js:208-223`). NOTE: welford_state reference check non-discriminating under undefined (see OBS-1) |
| AC-R34-14 | Wrapper DELEGATE when flag=false | PASS | `freeze-hook.ts:50` delegate path; test pass (`q34*.test.js:226-235`) |
| AC-R34-15 | Wrapper DELEGATE when state.active=false | PASS | `freeze-hook.ts:47` condition AND-short-circuit; test pass (`q34*.test.js:238-247`) |
| AC-R34-16 | config.ts Delta 5 — header + field decl | PASS | `engine/types/config.ts:7-16` header; `:117-124` field decl; test pass (`q34*.test.js:250-260`) |
| AC-R34-17 | PR-F7 evidence — 3 citations + URL + date + verbatim quote ≥30 chars | PASS | `coordination/evidence/PR-F7-EVIDENCE.md:32-65`; test pass (`q34*.test.js:263-277`). NOTE: regex uses invalid `\Z`; fragile (see MINOR-3) |
| AC-R34-18 | VENDORING-MANIFEST.md config row reflects Delta 5 | PASS | `coordination/VENDORING-MANIFEST.md:41`; test pass (`q34*.test.js:280-291`) |
| **AC-R34-19** | **Anti-scope diff chore-A SHA..HEAD ⊆ ALLOWED_SET ∪ carve-outs** | **FAIL** | **`coordination/STAGED-FOR-PHASE-2-CLOSE.md` in diff at HEAD `854cc7e`; not in ALLOWED_SET nor regex carve-outs. Test fails. See MAJOR-1.** |
| AC-R34-20 | tsc exits 0 | PASS | Reviewer-side `npx tsc -p tsconfig.test.json` → exit 0; test pass (`q34*.test.js:335-347`) |
| AC-R34-21 | Test count baseline 305/299/6 + 21 R34 = 326/320/6 | NOT REVERIFIED | Subprocess hangs on q29 transitive recursion at HEAD (per 397efd6 captured incident). Implementer attested via batched runs at ca795a2; pre-R34 test files structurally unchanged at HEAD (`git diff 0a346ff..HEAD` shows 0 pre-R34 test modifications). See OBS-2. |

**Summary: 19 PASS / 1 FAIL / 1 NOT REVERIFIED of 21 ACs.**

---

## 2. Findings

### MAJOR

**MAJOR-1 — AC-R34-19 fails at HEAD; operator-authored post-attestation commits introduced anti-scope violation that spec ALLOWED_SET did not anticipate.**

- **File:line:** `test/q34-event-conditional-attribution.test.ts:293-332` (the AC test); `coordination/specs/Q-R34-SPEC.md:756-779` (ALLOWED_SET + regex carve-outs); commits `397efd6` and `854cc7e` (operator-authored post-attestation chores).
- **Evidence:** Independent Reviewer binding-command run produced:
  ```
  R34 anti-scope violations: coordination/STAGED-FOR-PHASE-2-CLOSE.md
  ```
  `git diff 0a346ff..HEAD --name-only` at HEAD `854cc7e` returns 8 paths; `coordination/STAGED-FOR-PHASE-2-CLOSE.md` is present and is neither in `ALLOWED_SET` (13 literal entries) nor matches any regex in `ALLOWED_REGEX` (4 patterns).
- **Cause analysis:** The Implementer's attestation at `ca795a2` was correct at that SHA. Two subsequent operator-authored commits (`397efd6` at 2026-05-18 20:06:05; `854cc7e` at 2026-05-18 20:41:01) added Items 3 and 4 to `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (Item 3 captures the q29 subprocess hang; Item 4 captures Tailscale + M4 mini remote-execution capability). Both commits land BEFORE Reviewer execution but AFTER the `STATUS=READY` routing block was set.
- **Methodology gap:** Architect § 9.9 ALLOWED_SET completeness pass enumerated Architect-emit / Implementer chore-A / Reviewer post-chore-B / Memorial-Updater post-Reviewer files. The pass did NOT enumerate "operator-authored methodology backflow commits landing between routing-READY and Reviewer execution." This is a coverage gap in Rule 4 (anti-scope-allowed-set-forward-coverage) sweep at spec-emit time. R29 MINOR-2 lessons covered post-chore-B Reviewer/Memorial files; R34 newly surfaces the operator-commit class.
- **Classification:** Per finding scale, this would be CRITICAL if it indicated implementation incorrectness blocking merge. It is MAJOR because: (a) the code is correct; (b) the failure is a methodology coverage gap, not a correctness bug; (c) fix surface is bounded (extend ALLOWED_REGEX with `^coordination/STAGED-FOR-PHASE-2-CLOSE\.md$` carve-out, OR revert the operator commits, OR re-tag the chore-A SHA env var to a post-operator-commit SHA — operator's decision space). Per CLAUDE-COMMON.md routing rule "CRITICAL exists → ESCALATE; MAJOR or below → MERGE-READY", routing remains MERGE-READY but the AC failure is a load-bearing artifact for WU-07 close-walk.

### MINOR

**MINOR-1 — Pre-window boundary deviation from spec pseudocode (Implementer changed `<= preEnd` to `< preEnd` without DIAGNOSTIC).**

- **File:line:** `engine/events/event-conditional-attribution.ts:101-106` (impl); `coordination/specs/Q-R34-SPEC.md:411-413` (spec § 3.2 pseudocode); `test/q34-event-conditional-attribution.test.ts:140` (test comment `pre-window: (700, 1000]`).
- **Evidence:** Spec § 3.2 pseudocode literally states `if (fe.event_ts > preStart && fe.event_ts <= preEnd) preCount += 1;` (inclusive at right). Implementation at line 105 reads `if (fe.event_ts > preStart && fe.event_ts < preEnd) preCount += 1;` (exclusive at right). Implementer disclosed in `NEXT-ROLE.md:163` as "Tactical deviation #1." The disclosure cites empirical AC-R34-4 failure as the trigger — Cell 1's `shard-0` fires at exactly `event_ts=1000`, classified under spec pseudocode as pre-window (pre_window_count=1), contradicting Cell 1's expected pre_window_count=0.
- **Why MINOR, not OBS:** The deviation is a spec-vs-impl semantic divergence on the literal comparison operator (not a tactical detail). Per cross-project halt-discipline (R03 spec-reality conflict; R08 borderline-HALT precedent), changing a pseudocode comparator from `<=` to `<` because empirical observation contradicts spec is a candidate for HALT + DIAGNOSTIC with bounded options (A: amend spec pseudocode; B: adjust Cell 1 substrate fire to t=1010; C: accept impl divergence). Implementer chose C inline without DIAGNOSTIC. Disclosure in NEXT-ROLE.md mitigates audit-trail loss but does not satisfy halt-discipline (per R08 lesson: "NEXT-ROLE.md disclosed the deviation; no DIAGNOSTIC with bounded options was written" was classified MAJOR-1 in R08). R34's analogous deviation is one severity tier lower because (a) the impl is functionally correct (matches the spec's stated non-overlap intent), (b) AC-R34-8 test comment retains the wrong `(700, 1000]` text but AC asserts fires at 999 and 1001 (not 1000) so the divergence is invisible to the test runner.
- **Downstream risk:** A future contributor reading the spec pseudocode literally (or copying spec § 1.1 step 2 `[event_ts - pre_window_seconds, event_ts]` for a different implementation) will choose `<=` and produce a different classification result for shards firing exactly at `event_ts`. Spec amendment at WU-07 close-walk should reconcile § 1.1 step 2 + § 3.2 pseudocode + § 4 AC-R34-8 text with the implemented `(T-300, T)` half-open pre / `[T, T+300)` half-open post convention.

**MINOR-2 — Spec § 1.1 / § 3.2 / § 4 AC-R34-8 contain internally contradictory window-boundary text.**

- **File:line:** `coordination/specs/Q-R34-SPEC.md:108` (§ 1.1 Surface 2 step 2); `coordination/specs/Q-R34-SPEC.md:411-419` (§ 3.2 pseudocode); `coordination/specs/Q-R34-SPEC.md:733` (§ 4 AC-R34-8 text).
- **Evidence:**
  - § 1.1 step 2 says: `[event_ts - pre_window_seconds, event_ts]` (pre, closed at both ends) AND `[event_ts, event_ts + post_window_seconds]` (post, closed at both ends). These intervals overlap at `event_ts`.
  - § 3.2 pseudocode uses `> preStart && <= preEnd` (pre half-open `(., T]`) and `>= postStart && < postEnd` (post half-open `[T, .)`). These still overlap at `T`.
  - § 4 AC-R34-8 text says: `pre window (T-300, T] and post window [T, T+300) are non-overlapping (post starts at T, pre ends at T; verified by constructing two adjacent FiredShardEvents and observing classification)`. The intervals `(T-300, T]` and `[T, T+300)` BOTH include `T`; they are overlapping by construction. The AC text self-contradicts.
- **Why MINOR:** Architect's § 9.8 spec-internal-contradiction sweep ("§ 1.1 S3 says wrapper returns current...; § 3.2 pseudocode confirms; § 4 AC-R34-13 confirms...") did NOT cross-check the pre/post window boundary clauses. The contradiction surfaced empirically at chore-B as Implementer-disclosed MINOR-1. Architect-attributable.
- **Mitigation:** WU-07 close-walk spec consolidation should pick one convention and propagate.

**MINOR-3 — AC-R34-17 regex uses `\Z` which is invalid in JavaScript (treated as literal `Z`); Implementer worked around by adding non-essential content to evidence package rather than fixing the regex.**

- **File:line:** `test/q34-event-conditional-attribution.test.ts:267` (the regex `/^##\s+(Brodersen|Abadie|Bernal)[\s\S]*?(?=^##\s|\Z)/gm`); `coordination/specs/Q-R34-SPEC.md:635` (same broken regex in spec § 3.6 pseudocode); `coordination/evidence/PR-F7-EVIDENCE.md:68-74` (the workaround section `## Attribution method selection rationale`).
- **Evidence:** JavaScript regular expressions do not support `\Z` (end-of-string anchor). MDN: "Lookaheads (?=…), lookbehinds (?<=…), and word boundaries (\b) are supported, but `\A` and `\Z` are NOT." The character is interpreted as literal `Z`. The regex therefore matches up to the next `##\s` heading OR up to the next literal character `Z`. Implementer's `NEXT-ROLE.md:165` disclosed this and chose to add a `## Attribution method selection rationale` section AFTER the Bernal block so the lookahead has a `##\s` anchor instead of needing the `Z`/end-of-string semantic.
- **Why MINOR:** The fix is fragile in three independent dimensions: (a) any reorder placing Bernal mid-file is fine, but moving Bernal to last with the new section absent would re-break the regex; (b) any future citation block containing `Z` (e.g., "Zhang et al." or content with `Z` characters) would truncate the previous block at the `Z` position, losing date / quote content and potentially failing the per-block `2026-05-18` and quote-length checks; (c) the workaround content (`## Attribution method selection rationale`) is incidentally load-bearing for AC-R34-17 capture but presents as a non-essential prose section to future contributors who may delete it as redundant. The Implementer's allowed-set permits modifying the test file (`test/q34-event-conditional-attribution.test.ts` is a R34-new file in ALLOWED_SET); a 4-character regex fix (`\Z` → `$(?![\s\S])` or restructure via `split('##')`) was directly available. Choosing a content workaround over a regex fix is suboptimal.
- **Spec defect mirror:** Spec § 3.6 pseudocode at line 635 contains the same broken `\Z`. Architect-attributable; Implementer copied it faithfully then worked around the bug. Both the spec pseudocode and the test code should be fixed at WU-07 spec consolidation.

**MINOR-4 — AC-R34-21 test semantics weakened relative to spec § 4 prescription (asserts pre-R34 subset count, not full-suite count) and could not be reverified at HEAD due to subprocess deadlock.**

- **File:line:** `coordination/specs/Q-R34-SPEC.md:746` (spec § 4 AC-R34-21 prescription `tests=326; pass=320; fail=6`); `test/q34-event-conditional-attribution.test.ts:350-390` (the implemented assertion: pre-R34 subset = 305/299/6, excludes q34 itself).
- **Evidence:** Spec § 4 AC-R34-21 prescribes the full-suite count `tests=326 (305 baseline + 21 R34); pass=320 (299 baseline + 21 R34 GREEN); fail=6 (baseline pre-existing)`. Implementation runs only the pre-R34 subset (`f !== 'q34-event-conditional-attribution.test.js'`) and asserts the subset = 305/299/6, with a code comment citing R29 precedent for excluding self-referential subprocess invocation. The Implementer's intent (avoid infinite recursion) is sound. The deviation is that the AC no longer structurally guarantees `total = pre + 21`; if the R34 test file's `test()` declarations were silently reduced from 21 to (say) 18, the pre-R34 assertion still passes 305/299/6 and the divergence is invisible to this AC. Outer binding command `node --test test/*.test.js` (Reviewer-side) would catch the divergence but cannot be run at HEAD due to OBS-2's hang.
- **Why MINOR:** Implementer's tactical autonomy on self-referential subprocess is reasonable (R29 precedent cited); the weakening is bounded; spec § 4's literal `326/320/6` count is preserved as comment guidance in the test body. Architect's § 9.5 mutation test for AC-R34-21 considered "ships only 20 R34 ACs" but assumed the count test would observe the full suite, which it does not in implementation. Should be amended at WU-07 close-walk to either (a) a stronger structural guarantee (e.g., parse + count `test()` declarations in `q34-*.test.ts` independently and add to pre-R34 subset) or (b) accept the subset-only assertion as the load-bearing property.

### OBS

**OBS-1 — AC-R34-13 welford_state strictEqual check is non-discriminating against FREEZE-with-clone mutation when `welford_state` is undefined.**

- **File:line:** `test/q34-event-conditional-attribution.test.ts:208-223` (AC-R34-13 test); `engine/per-shard/warm-start.ts` `initialPerShardResidual()` (produces fresh residual; welford_state is undefined at n=0 state).
- **Evidence:** The test constructs `current` via `{ ...initialPerShardResidual(), n_samples: 5, confidence: 'none' }`. Since `initialPerShardResidual()` returns no `welford_state` (undefined for cold residuals), `current.welford_state` is undefined. Under FREEZE-with-clone mutation (`return { ...current }`), `result.welford_state` would still be undefined, and `strictEqual(undefined, undefined)` passes. The reference-equality check is non-discriminating against the clone-mutation in the undefined case. Architect § 9.5.2 explicitly acknowledged this: "For undefined state (initial), both sides are `undefined` and pass — but n_samples + confidence still bind the FREEZE semantic. Acceptable."
- **Why OBS:** n_samples + confidence asserts still bind the FREEZE semantic regardless of welford_state state. Functionally, FREEZE-with-clone vs FREEZE-with-reference are observationally equivalent at the residual layer (no downstream consumer depends on reference identity). Acknowledged in spec; no required fix.

**OBS-2 — Full-suite `node --test test/*.test.js` could not be run at HEAD due to q29-subprocess transitive recursion deadlock; pre-R34 baseline carry verified structurally instead.**

- **File:line:** Operator commit `397efd6` (captured the incident at 2026-05-18 20:06:05); `test/q29-k8s-adapter.test.ts` (q29 AC-R29-12 spawns `node --test` per R29 MINOR-3 env workaround); `test/q34-event-conditional-attribution.test.ts:367` (q34 AC-R34-21 also spawns `node --test`).
- **Evidence:** Reviewer attempted `node --test --test-reporter=tap test/*.test.js` twice; both runs hung indefinitely (>30 minutes accumulated) producing zero output. Process inspection showed q29 and q34 nested subprocess invocations re-spawning `node --test` workers under `--test-isolation=process`, deadlocking the parent. Operator's `397efd6` commit documents this as a Phase 2 close item ("Refactor q29 + q34 to remove subprocess node --test pattern"). Pre-R34 test files (28 files; not including q34) are structurally unchanged at HEAD per `git diff 0a346ff..HEAD --name-only` (zero `test/*.test.ts` modifications outside q34 + v9Z substrate). Implementer's batched run attestation in `NEXT-ROLE.md:143-151` of 305/299/6 for the pre-R34 subset remains the best available evidence.
- **Why OBS, not MAJOR:** Reviewer cannot reverify the count assertion at HEAD due to a Tessera-local methodology defect (operator-acknowledged, Phase 2 close item). The structural carry (no pre-R34 test file modifications) is verifiable and provides indirect confirmation that pre-R34 baseline count is preserved at HEAD. R34's count assertion mode is the same as R29 / R30 / R32 (precedent class), and AC-R34-19's anti-scope check independently verifies no out-of-scope test files were added.

**OBS-3 — PR-F7 trailing section `## Attribution method selection rationale` is incidentally load-bearing for AC-R34-17 regex capture.**

- **File:line:** `coordination/evidence/PR-F7-EVIDENCE.md:68-74`.
- **Evidence:** Per MINOR-3, the AC-R34-17 regex relies on a `##\s` heading after the Bernal block to terminate the Bernal capture (since `\Z` is invalid). The Implementer-added "Attribution method selection rationale" section provides this anchor. A future contributor who reads the section as duplicative (it summarizes content already in the per-citation "Tessera relevance" paragraphs) may delete it, silently breaking AC-R34-17 (Bernal block's verbatim quote total length would fail since the truncated capture loses content past the next `Z` character somewhere in Bernal's body).
- **Why OBS:** Acknowledged dependency, not a defect per se. Should be fixed alongside MINOR-3 at WU-07.

**OBS-4 — AC-R34-19's design intrinsically captures post-attestation operator commits; methodology question for WU-07 close-walk.**

- **File:line:** `test/q34-event-conditional-attribution.test.ts:323-327` (the `git diff CHORE_A_SHA..HEAD` invocation).
- **Evidence:** The AC's diff range is `CHORE_A_SHA..HEAD` where HEAD is whatever the test runner observes at execution time. Operator commits landing AFTER `STATUS=READY` but BEFORE Reviewer execution are inherently captured. Three mitigation options: (a) tag the routing SHA at `STATUS=READY` time as `R34_ATTESTATION_SHA` and use `CHORE_A_SHA..R34_ATTESTATION_SHA`; (b) explicitly carve out operator-owned methodology files (`coordination/STAGED-FOR-PHASE-2-CLOSE.md`, future similar) in ALLOWED_REGEX; (c) require operator discipline to land all chores BEFORE `STATUS=READY` or AFTER Reviewer routing. Implementer cannot resolve unilaterally; this is an Architect / methodology question for WU-07 close-walk + anchor-backflow consideration.
- **Why OBS, not MINOR/MAJOR:** Architectural question, not a defect. MAJOR-1 captures the immediate test failure; OBS-4 captures the structural recurrence-prevention question.

**OBS-5 — `event_window_end_ts` field declared on ClusterEvent but unused by attribution logic; intentional acknowledged-gap A21.**

- **File:line:** `engine/events/event-feed.ts:26-28`; spec § 1.3 acknowledged gap A21.
- **Evidence:** `ClusterEvent.event_window_end_ts?: number` is declared with comment "interval-shaped events"; `attributeEventConditional` uses only `event_ts` for window computation. Architect § 1.3 acknowledged A21 as non-load-bearing forward-extensibility. No AC binds the interval-shaped path. Consistent with spec.
- **Why OBS:** Documented intentional gap; not a defect.

---

## 3. Right-reasons audit (3 tests)

Per Reviewer reinforcement: pick tests, trace to spec, verify not self-confirming.

### Test A — AC-R34-4 (PR-F7 Cell 1 confirmed elevation)

- **Spec requirement:** PR-F7 Cell 1 — 1 candidate; member_count=3; pre_window_count=0; post_window_count=3; correlational_not_causal=true (spec § 4 AC-R34-4 + § 1.1 Surface 2 + scope block PR-F7 trigger).
- **Test body** (`q34*.test.ts:92-105`): invokes production `attributeEventConditional` with substrate fixtures from `scenarioCell1()`. Asserts `candidates.length === 1`, `member_count === 3`, `member_shard_ids === ['shard-0','shard-1','shard-2']`, `pre_window_count === 0`, `post_window_count === 3`, `correlational_not_causal === true`, `cluster_event_id === 'evt-cell1'`, `event_ts === 1000`.
- **Self-confirming check:** The fixture values (event_ts=1000; fires at 1000, 1030, 1050) and expected outputs (member_count=3, pre_window_count=0) are externally defined in `v9Z-event-cluster.ts:32-42` and substrate docstring `:25-31`. The expected values do not re-implement production arithmetic; they are arithmetically derivable from the scenario specification (3 correlated fires in post-window → member_count=3; 0 fires in pre-window → pre_window_count=0).
- **Catches:** Implementation that drops correlated-fire counting; that misclassifies pre-window vs post-window; that emits `correlational_not_causal: false`; that fails the sort-determinism contract.
- **Verdict:** NOT self-confirming.

### Test B — AC-R34-13 (Wrapper FREEZE branch)

- **Spec requirement:** When `config.freeze_hook_enabled === true` AND `freezeState.active === true`, return `current` unchanged (spec § 1.1 Surface 3 + § 4 AC-R34-13).
- **Test body** (`q34*.test.ts:208-223`): constructs `current` with literal `n_samples: 5`, `confidence: 'none'`; calls wrapper with active=true and freeze_hook_enabled=true; asserts `result.n_samples === 5`, `result.confidence === 'none'`, `result.welford_state === current.welford_state`.
- **Self-confirming check:** The expected values (5, 'none') are literal inputs, not computed from the implementation. The test does not invoke the wrapper twice or otherwise re-derive expected values. Reference-equality check on welford_state is non-discriminating under undefined (OBS-1) but the n_samples + confidence asserts independently fire on DELEGATE mutation (n_samples would become 6).
- **Catches:** Implementation that calls `updatePerShardResidual` despite both flags being true (n_samples would increment to 6, failing assertion).
- **Verdict:** NOT self-confirming.

### Test C — AC-R34-12 (A16 two-sided absence of `: false`)

- **Spec requirement:** Rule 5 strong-binding — `correlational_not_causal: false` MUST be absent from every `engine/events/*.ts` file (regex AND substring; spec § 1.2 + § 4 AC-R34-12).
- **Test body** (`q34*.test.ts:189-205`): iterates over 3 file paths; reads each file content; asserts `/correlational_not_causal:\s*false/.test(content) === false` AND `content.includes('correlational_not_causal: false') === false`.
- **Self-confirming check:** Assertions are against the literal string `correlational_not_causal: false`; production code does not produce this string anywhere. Test reads actual file content and tests for absence; cannot re-implement what it negatively asserts.
- **Catches:** Any future code adding `correlational_not_causal: false` literal text (including in a comment block). Note: would also fail on a legitimate documentation comment such as `// correlational_not_causal: false would violate Addition #26 D4` — overly strict but consistent with Rule 5 intent.
- **Verdict:** NOT self-confirming.

---

## 4. Cross-cutting checks

**TDD discipline:** PASS. `git log --oneline 0a346ff fdc55ed` confirms RED commit (`0a346ff` test stubs + substrate + coordination artifacts at 2026-05-18 17:21:51) precedes GREEN commit (`fdc55ed` Surfaces 1-3 impl at 2026-05-18 17:37:02). Per R23 IMPL MINOR-1 reinforcement (separate-RED-commit). 14th+ consecutive round of verifiable TDD ordering.

**No-skip / halt-discipline:** PARTIAL. Two empirically-determinable spec-vs-reality conflicts encountered by the Implementer were absorbed inline with NEXT-ROLE.md disclosure instead of HALT + DIAGNOSTIC:
1. Pre-window boundary divergence from spec § 3.2 pseudocode (MINOR-1).
2. AC-R34-17 regex `\Z` JavaScript invalidity (MINOR-3).

Both deviations are functionally correct; both are disclosed. Per R08 borderline-HALT precedent (REINFORCED 2026-05-17 in CLAUDE-COMMON.md: "binding-command run surfaces a test-file failure whose passing fix requires modifying an anti-scoped file, this IS a halt-condition for spec promotion"), the analogous discipline for spec-pseudocode-vs-reality conflicts whose passing fix requires deviating from spec pseudocode is also a HALT candidate. Not enforced here because the analogue is one tier weaker (spec pseudocode is not literally "anti-scoped"; the Implementer's allowed-set includes inline tactical autonomy per the 2026-05-10 spec-depth methodology). Classifying these MINOR (not MAJOR) honors the established gradient while recording the discipline gap.

**Anti-scope (forward sweep on diff at HEAD):** FAIL on AC-R34-19 per MAJOR-1. Anti-scope reverse check (per spec § 5.2 hard limits READ-ONLY enumeration): VERIFIED no modification to `engine/topology-overlay.ts`, `engine/core.ts`, `engine/hardware-topology-source.ts`, `engine/types/verdict.ts`, `engine/verdict-groups.ts`, `engine/fleet/verdict-consumer.ts`, `engine/per-shard/{warm-start,runtime,welford}.ts`, any Wave 1+2+3 deliverable, any pre-R34 test file, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`, `multi-track-cluster-setup.sh`, `scripts/*`, `CLAUDE-IMPLEMENTER.md`. The R34 ALLOWED_SET membership for in-diff files (8 paths) is otherwise clean — only `STAGED-FOR-PHASE-2-CLOSE.md` violates.

**Architect pre-prediction reconciliation** (audit-sidecar § 3):
- Prediction #1 (all 21 ACs PASS at chore-B SHA): FALSIFIED at HEAD due to MAJOR-1 (post-attestation operator commits); was TRUE at attestation SHA `ca795a2`. Predicate ambiguity (which SHA?) — the Implementer-attested SHA was correct, the Reviewer-runs-at-HEAD SHA is not.
- Prediction #2 (tsc exits 0): VERIFIED.
- Prediction #3 (anti-scope clean): FALSIFIED at HEAD per MAJOR-1.
- Prediction #5 (Implementer halt count: 0): VERIFIED literally (zero DIAGNOSTIC files filed) but MINOR-1 + MINOR-3 argue that two halts SHOULD have fired.
- Prediction #6 (0 CRITICAL / 0 MAJOR / 0-2 MINOR / 0-5 OBS): FALSIFIED on MAJOR axis (1 MAJOR finding); MINOR within range (4 MINOR); OBS within range (5 OBS).

---

## 5. Grilling output (on this report; before routing)

| Question | Verdict |
|---|---|
| Every finding has file:line reference? | YES — MAJOR-1 / MINOR-1..4 / OBS-1..5 all cite specific paths + line ranges |
| Any AC marked PASS without actual verification? | NO — every PASS row cites either runtime test name (verified by independent Reviewer-side TAP output), structural file inspection (line range with literal content match), or `git diff` output. AC-R34-21 explicitly marked NOT REVERIFIED (not PASS). |
| Right-reasons audit completed for ≥3 tests? | YES — 3 tests audited (AC-R34-4 + AC-R34-13 + AC-R34-12); none self-confirming |
| Are MINOR-1 and OBS-1 (acknowledged in spec) double-classified? | OBS-1 acknowledged in spec § 9.5.2 as "Acceptable" — keeping as OBS, not MINOR, honors Architect's acknowledgment. MINOR-1 (pre-window deviation) is a discipline issue at the role level (Implementer-attributable lack of DIAGNOSTIC), separate from spec-internal contradiction (MINOR-2). |
| Is MAJOR-1 actually CRITICAL? | Considered. Per finding scale (`CRITICAL — blocks merge: correctness bug, security issue, data integrity problem`), the test failure does block merge under literal AC-R34-19 PASS interpretation — but the failure is methodology-coverage, not correctness. The implementation is empirically correct. Per cross-project convention, anti-scope-coverage failures have been MAJOR in prior rounds (R29 MINOR-2; R25 MAJOR-2 precedent). Keeping MAJOR. |
| Is the OBS-2 NOT-REVERIFIED on AC-R34-21 a Reviewer discipline gap? | The Reviewer is expected to run binding commands independently. The deadlock is a Tessera-local infrastructure issue (operator-acknowledged at 397efd6 as Phase 2 close item). Disclosing the limitation transparently is the discipline-preserving path (R02 audit-trail-inaccuracy precedent: Reviewer must distinguish what was empirically verified from what was attested). |
| Did the cold-review boundary hold? | YES — no `coordination/diagnostics/`, `coordination/logs/`, or `.prompt-*.md` files consulted. NEXT-ROLE.md disclosure block read (allowed per role) for cross-reference of Implementer-disclosed tactical deviations. |
| Memorial entries to append? | MAJOR-1 + MINOR-1..4 → 5 VIOLATION entries. CONFIRMATIONs for right-reasons audit + TDD discipline + anti-scope reverse + cold-review boundary + binding-command independent execution. |

---

## 6. Routing

- **CRITICAL findings:** 0.
- **MAJOR findings:** 1 (anti-scope AC failure at HEAD; methodology-coverage gap, not correctness).
- **MINOR findings:** 4.
- **OBS:** 5.

**STATUS: MERGE-READY** per CLAUDE-COMMON.md routing rule ("CRITICAL exists → ESCALATE; MAJOR or below → MERGE-READY"). The MAJOR-1 finding requires Memorial-Updater + operator attention to either (a) extend ALLOWED_REGEX, (b) revert the operator-authored `397efd6` + `854cc7e` commits, or (c) acknowledge as Phase 2 close item; Reviewer does not pre-empt that decision per role boundary.

Implementer attestation at `ca795a2` was internally consistent; the Reviewer-side AC-R34-19 failure is HEAD-relative due to post-attestation operator-authored commits the Implementer cannot constrain. Routing to Memorial-Updater for VIOLATION/CONFIRMATION aggregation + close-walk forward-coverage entry.

---

_End of REVIEWER-REPORT-R34.md._
