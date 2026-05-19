# Staged-for-Phase-2-close: items to execute after Wave 5 gate lands

_Durable staging artifact for methodology work the operator has authorized to execute after Phase 2 close milestone (Wave 5 gate = NEW HARD STOP per extended overnight authority [[project-overnight-authority-2026-05-18-morning]]). Survives session compaction. The Phase 2 post-close step reads this file when authoring the next session's plan._

---

## Item 1 — MR-2 CLAUDE-IMPLEMENTER.md consolidation

**Status at R41:** CLOSED-AT-R39. MR-2 consolidation executed at R39 across 3 passes:
feat(R39-pass1) cross-project rule pointers in CLAUDE-ARCHITECT.md;
feat(R39-pass2) empirical-premise composite in CLAUDE-ARCHITECT.md;
feat(R39-pass3) CLAUDE-IMPLEMENTER.md fold of 6 post-MR-2 entries into composites.
CLAUDE-IMPLEMENTER.md at 30 entries post-MR-2 (AC-R36-21 count guard met).

**Operator-requested:** 2026-05-18 mid-afternoon ("agreed with recommendation, proceed").

**Origin question:** "how do we reduce the size of the claude-implementer.md file?"

**Context:** CLAUDE-IMPLEMENTER.md grew from 30 → 51+ lines across this overnight session (R20-R32). 8th consecutive round above the 30-line consolidation threshold. The existing `scripts/consolidate-reinforcements.sh` archives lines older than 180 days; Tessera began 2026-05-15 so the script produces zero candidates. Thematic consolidation is needed.

**Constraint:** CLAUDE.md "Do not delete prior reinforcements — accumulated history is the compounding value" must be honored. Passes preserve all lessons; only the form changes.

**Three-pass consolidation strategy:**

### Pass 1 — De-duplicate cross-project-derived rules

This session derived 4 cross-project rules now in `~/.claude/CROSS-PROJECT-MEMORIAL.md`:
1. `false-compliance-attestation` (R26-derived; validated R30)
2. `architect-branch-binding-coverage` (R28+R29+R30)
3. `implementer-spec-test-assertion-coverage` (R28+R29+R30)
4. `anti-scope-allowed-set-forward-coverage` (R25+R26+R29)

Per-role REINFORCED lines that originated these rules become redundant. Collapse to 1-line pointers like:

```
# REINFORCED 2026-05-18 — false-compliance-attestation:
#   see CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" section.
#   Tessera origin sites: R26 MAJOR-1 + R30 (validated).
```

Expected reduction: ~5 lines.

### Pass 2 — Thematic consolidation under composite headings

Group narrow variants under broader discipline headings. Example template:

```
# REINFORCED — HALT-DISCIPLINE (composite; 4 sub-variants observed)
#
#   Spec-premise empirical failure (R08 MAJOR-2):
#     When a spec claim ("exact arithmetic"; "exit code 0"; etc.) fails
#     under empirical testing, HALT + DIAGNOSTIC + ESCALATE. Do not
#     silently absorb. R25 ESCALATE-R25-01 instance.
#
#   False-compliance attestation (R26 MAJOR-1; cross-project rule):
#     When binding-command output contradicts AC literal, do not reframe
#     errors as warnings or report required exit code. See CROSS-PROJECT-MEMORIAL.
#
#   RED-state audit-trail discipline (R23 MINOR-1):
#     Separate RED commit before any production code in TDD rounds.
#
#   Anti-scope file modification under operator-resume rationale (R19 MAJOR cluster):
#     Even when fix is architecturally correct, anti-scope target requires
#     DIAGNOSTIC + ESCALATE. R08 reinforcement.
```

Expected reduction: ~14 lines (20 narrow → 6 composite).

### Pass 3 — Promote universal patterns to CLAUDE-COMMON.md

Move these from Implementer-specific to all-role common:

- **Line-citation discipline** (R03/R18/R21 + cross-project rule active): cite-then-verify via grep; applies to every role's attestation. Move to CLAUDE-COMMON.md "Pre-emit grilling" section.
- **Data-flow-not-syntax verification** (R30 MINOR-2): applies to any role making coverage claims. Move to CLAUDE-COMMON.md.
- **Encode-actual-results-verbatim** (R26 MAJOR-1 + R30 validation; cross-project rule active): applies to every role's attestation discipline. Move to CLAUDE-COMMON.md.

Expected reduction: ~6 lines from IMPLEMENTER (these gain CLAUDE-COMMON entries once; net positive on signal-to-noise).

### Pass 4 — SKIP (Tessera too young for age-based archive)

When Tessera ages past ~6 months, oldest R01-R10 reinforcements may have been subsumed by later composite rules and become candidates for archive-to-`CLAUDE-IMPLEMENTER-ARCHIVE.md`. Not applicable now.

## Execution mechanics

**When:** Between Phase 2 close (Wave 5 gate) and any Phase 3 work. Methodology round (call it MR-2; analogous to MR-1 vendoring round).

**Tier:** N/A — operator-driven (analogous to MR-1; the role-file content IS the methodology, so doing this through the existing pipeline is circular).

**Operator review point:** Operator reviews the proposed diff BEFORE commit. Per the "rule-derivation-without-self-application" pattern surfaced at R32: the consolidation must not subsume rules into forms that make them LESS actionable. If a composite heading hides the trigger conditions, it fails this gate.

**Target:** 51 → 25-30 lines (back under 30-line threshold). The 30-line threshold is itself a heuristic from anchor canonical; if final lands at 32-35 lines but signal-to-noise is much better, that's acceptable.

**Files modified:**
- `CLAUDE-IMPLEMENTER.md` (primary; consolidation)
- `CLAUDE-COMMON.md` (pass 3 promotion targets)
- `CLAUDE-ARCHITECT.md` + `CLAUDE-REVIEWER.md` (may receive 1 pointer each if pass 1 cross-project pointers added; depends on shared rule ownership)
- Possibly NEW `CLAUDE-IMPLEMENTER-ARCHIVE.md` (only if pass 4 fires; currently NO)

**Commit shape (suggested):**
- Commit A — pass 1 (cross-project rule de-duplication; pointer-replacements only; minimal churn)
- Commit B — pass 2 (thematic composite consolidation; the largest diff; needs operator review)
- Commit C — pass 3 (CLAUDE-COMMON.md promotions; multi-file touch)

## When more items get staged for Phase 2 close, append below as Item 2, Item 3, etc.

---

## Item 2 — R32 carry-forward punch list (per WAVE-GATE-03 Pre-flags + OQ-W3-3 default B)

**Status at R41:** CLOSED-AT-R36. WU-07 Phase 2 close-walk (feat(R36) commit c49df0e "8 deliverables GREEN") addressed the SCOPING-MEMO MAJOR-1 structural surgery, 4 weak ACs, execSync→execFileSync carry-forwards at q25 and q30, and R26 MINOR-2 PARTIALLY-CLOSED deferral per WU-07 scope. All sub-items resolved at Phase 2 close-walk.

**Per WAVE-GATE-03 § Pre-flags table + OQ-W3-3 default B** (SCOPING-MEMO MAJOR-1 surgery deferred to WU-07 close-walk for cleaner scope-bounding), the following R32 carry-forward items land at WU-07 (Phase 2 close-walk):

1. **SCOPING-MEMO MAJOR-1 structural surgery** (from R32 hybrid Reviewer) — specific spec amendment required; details in `coordination/reviews/REVIEWER-REPORT-R32.md` § MAJOR-1.
2. **4 weak ACs strengthening** (from R32 OBS surfaces) — per `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` § 4 carry-forward inventory.
3. **execSync carry-forward** at `test/q25-l0-contract.test.ts:216` and `test/q30-nvlink-adapter.test.ts:230` — both use `execSync` for git diff calls; R26 MINOR-1 reinforcement mandates `execFileSync`. WU-07 close-walk should pre-authorize touches at these specific lines.
4. **R26 MINOR-2 PARTIALLY-CLOSED deferral** — common-mode-attribution.ts impl alignment (Option A: distinct-member-shard iteration) deferred at R32 OBS-4 to WU-06 consumer context. If WU-06 ships FusedVerdict → FiredShardEvent adapter site (Architect's call), MINOR-2 closes there; else WU-07 closes it.

WU-07 Architect reads this file as part of close-walk scope authoring.

---

## Item 3 — Anchor backflow: subprocess-node-test transitive hang class

**Status at R41:** CLOSED/FORWARDED. Tessera-local portion (q29/q34/q36 subprocess-hang
skip guards + spec template guidance) CLOSED-AT-R36 per WU-07 deliverables. Anchor backflow
portion FORWARDED to `coordination/ANCHOR-BACKFLOW-2026-05-18.md` (4 PRs for anchor canonical
update — operator-scheduled). ANCHOR-BACKFLOW-2026-05-18.md file exists at disk.

**Surfaced:** 2026-05-18 mid-R34 (~6:24 PM commit chain + 7:15 PM hang start). Reviewer cold-binding-command session hung indefinitely on `test/q29-k8s-adapter.test.js` during its standard `node --test test/*.test.js` invocation. Pipeline shell PID 76989 alive + waiting on hung Reviewer; 1-2 orphan node-test processes accumulated; bg task notification never fired.

**Root cause:** q29 contains `execFileSync('node', ['--test', ...], { env: subEnv })` per R29 MINOR-3 reinforcement (Node v25 recursive-test-detection workaround). When q29 itself runs as a worker INSIDE a parent `node --test --test-isolation=process` invocation, q29's child node-test deadlocks. The `env: subEnv` strip protects against direct self-recursion (q29 inside q29) but not against transitive recursion (parent invokes q29 worker; q29 invokes child node-test; child node-test inherits some isolation state that hangs).

**Anchor backflow PR candidates** (operator-owned methodology change; capture here for next anchor canonical update window):

### Backflow 1 — Pre-emit grilling rule

**Proposed addition to `anchor/skills/01-pre-emit-grilling.md` or equivalent:** ANY test file that spawns `node --test` on the project suite (even with self-exclusion + env-strip) creates a transitive hang risk when that file is itself executed inside another `node --test` invocation. Architects must either:
- Move the subprocess invocation out of the test suite entirely (e.g., a separate `scripts/verify-count.sh` invoked from Reviewer's binding-command discipline, not from within a test file), OR
- Mark the test as skip-in-subprocess (e.g., `if (process.env.NODE_TEST_CONTEXT) test.skip(...)`)

Existing R29 MINOR-3 reinforcement (env: subEnv strip) is insufficient for transitive cases.

### Backflow 2 — Pipeline watchdog

**Proposed addition to `anchor/integrations/superpowers-claude-code/run-pipeline.sh`:** Watchdog detecting "role-session-with-no-output for >N minutes" (default 30 min). Currently the pipeline shell silently waits indefinitely if a child claude session blocks on a subprocess. Watchdog should:
- Detect via `tail -f $role_log` + idle-timer or via direct child-process polling
- On timeout: log warning; offer operator choice (kill + retry, kill + advance to next role, kill + ESCALATE)
- Default action on no-operator-response: log + kill + ESCALATE (don't silently hang overnight)

R34 incident: pipeline alive 4+ hours; Implementer hung at 5:19 PM, Reviewer hung at 7:15 PM, no warnings surfaced.

### Backflow 3 — Bash-tool orphan reaping

**Proposed Bash-tool change:** When the Bash tool times out (default 120s), send SIGTERM to the spawned process tree (not just the wrapper shell). Currently, `node --test` subprocesses survive Bash-tool timeout and accumulate as orphans, eating system resources + potentially holding locks. The R34 incident left 2-3 orphan node-test processes running for hours.

### Backflow 4 — Test isolation flag visibility

**Proposed addition to spec-template anti-scope:** When a spec includes an AC that spawns `node --test` (e.g., AC-RNN-NN test-count verification), spec must enumerate the failure mode "this AC will deadlock if Reviewer/Implementer runs `node --test --test-isolation=process` over the full suite" + prescribe the mitigation. Currently R29 spec didn't anticipate this and the pattern silently propagated to R34.

## Tessera-local items WU-07 close-walk should address

Beyond the anchor backflow (operator-owned), WU-07 close-walk should:

1. **Refactor q29 AC-R29-12 (and any equivalent in other test files) to NOT spawn `node --test` from within the suite.** Move the count-verification to a separate script invoked at the chore-A level OR mark the test as skip-in-subprocess.
2. **Check q34 AC-R34-21 (same pattern as q29).** Same refactor needed.
3. **Audit all test files for `execFileSync('node', '--test', ...)` pattern** + apply the skip-in-subprocess guard or move out of suite.
4. **Update spec templates** (per backflow 4) so future rounds don't reproduce this pattern.

This is real methodology learning + spec template work; should land at WU-07 close-walk regardless of whether the anchor backflow PRs land that round.

---

## Item 4 — Phase 3 capability candidate: Tailscale + M4 Pro mini remote-execution infrastructure

**Status at R41:** FORWARDED-TO-PHASE-3-CANDIDATES. Item forwarded to
`coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 4.1 "Tailscale + M4 Pro mini
remote-execution (MR-3 candidate)". No Phase 2 implementation required or expected.
Phase 3 entry authorization is operator-owned.

**Surfaced:** 2026-05-18 mid-R34 (operator mentioned during Reviewer-hang investigation).

**Capability:** Operator has a Mac mini (M4 Pro, 64GB RAM) accessible via Tailscale. Could be used to offload heavy compute from the M5 MacBook Pro.

**Where it'd genuinely help (Phase 3 onward):**
- Multi-cluster parallel Wave execution without local CPU contention (Wave 2 had 3 parallel clusters; future Phase 3 waves may have more)
- PR-F5-class storage/perf benchmarks (R14 PR-F5 burned real compute; Phase 2-amendment-flagged storage-compression candidates could revisit at scale)
- Background CI-style full-suite verification continuous on remote while local stays interactive
- Larger N synthetic cluster substrate testing (current v9X/v9Y are small; real-cluster-scale fixtures would benefit from headroom)

**Where it DOESN'T help:**
- Current R34 Reviewer hang (structural infinite loop in q29/q34 test code; more compute doesn't unblock logical deadlock)
- Anthropic API rate limits (same account; remote machine shares the limit)
- Methodology-level role discipline (Reviewer/Architect/etc. are claude-sided, not compute-sided)

**Setup magnitude (rough):** 1-2 methodology rounds of work (~MR-1 magnitude). Components needed:
- `coordination/remote-config.json` (Tailscale endpoint; SSH key paths; remote workdir convention)
- `scripts/run-pipeline-remote.sh` wrapper: sync repo state (git push-pull or rsync); ssh into mini; invoke run-pipeline.sh; pull results back; clean up
- Cleanup discipline (remote artifact lifecycle; cluster-worktree directories on mini)
- Wave-merge handling for results produced on remote (multi-track-verify-wave-merge.sh expects same-machine git operations; needs remote-aware variant)
- Documentation: when-to-use-remote vs when-to-stay-local decision matrix

**Decision recommendation:** Queue as Phase 3 capability candidate (or post-Phase-2 MR-3 if Phase 3 wave structure benefits enough). NOT a Phase 2 deliverable; current Phase 2 close is in sight (~3-5 rounds out) and setup cost only pays back across multiple future waves.

**Backflow potential:** If implemented well in Tessera, the `--remote` pattern could land in anchor canonical as a multi-track-execution capability extension. Coordinator role + cluster dispatch already have multi-machine-ready conceptual architecture; just needs the plumbing.

---

## Item 5 — R34 pending REINFORCED-line appends (spec § 9.9 anti-scope constraint)

**Status at R41:** CLOSED-AT-R39. The staged R34 reinforcement lines (for CLAUDE-ARCHITECT.md
and CLAUDE-IMPLEMENTER.md) were applied during the MR-2 consolidation passes at R39. The
`feat(R39-pass1)` through `feat(R39-pass3)` commits incorporated the R34-staged content into
the composite headings per Item 1 consolidation strategy. CLAUDE-IMPLEMENTER.md spec-vs-impl
semantic conflict and regex-fix sub-variants are present in the HALT-DISCIPLINE composite.

**Staged by:** Memorial-Updater (R34 close, 2026-05-18).

**Context:** Q-R34-SPEC § 9.9 explicitly constrains the Memorial-Updater from appending REINFORCED lines to CLAUDE-*.md files at R34 close (ALLOWED_SET anti-scope enforcement; none of the CLAUDE-*.md files appear in the ALLOWED_SET regex carve-outs). Per spec § 9.9 option (b), reinforcement text is staged here for application at MR-2 (Phase 2 close-walk), alongside Item 1 (CLAUDE-IMPLEMENTER.md consolidation).

**Apply BEFORE running Item 1 consolidation passes**, so all accumulated patterns are visible to the consolidation.

### For CLAUDE-ARCHITECT.md — append to REINFORCEMENTS section

```
# REINFORCED 2026-05-18 — Spec § 9.8 spec-internal-contradiction sweep MUST explicitly
#   cross-check algorithmic boundary clauses (pre-window / post-window, filter predicates,
#   interval endpoints) across ALL spec sections where they appear (§ 1.x prose, § 3.x
#   pseudocode, § 4 AC Then-columns). Listing one section's boundary convention and not
#   diffing it against the others produces internal contradictions that surface empirically
#   at chore-B. Procedure: for each algorithmic primitive with boundary semantics, grep
#   the spec for all occurrences and verify each uses the same convention (inclusive vs
#   exclusive; open vs closed). Detected tessera R34 MINOR-2 (pre/post window boundary
#   inconsistency across § 1.1, § 3.2 pseudocode, and § 4 AC-R34-8 text).
# REINFORCED 2026-05-18 — When spec § 3.x pseudocode contains regex literals intended for
#   test assertions, verify each regex is valid JavaScript BEFORE emitting the spec:
#   (1) `\Z` is not a JavaScript regex metacharacter (it is a Perl/Python construct; MDN
#   documents it as unsupported); use `$` with /m flag, end-of-string lookahead, or
#   restructure via split. (2) lookahead alternation `(?=X|Y)` where Y contains language-
#   specific anchors must be tested in a JS REPL before inclusion in spec pseudocode.
#   Copy-pasting from spec pseudocode to test code propagates language-specific bugs that
#   force content workarounds rather than code fixes. Detected tessera R34 MINOR-3.
# REINFORCED 2026-05-18 — When the § 9.9 ALLOWED_SET completeness pass enumerates file
#   categories, it MUST include the operator-authored methodology backflow class: commits
#   to coordination-tier durable artifacts (STAGED-FOR-PHASE-2-CLOSE.md, WAVE-PLAN-NN.md,
#   WAVE-GATE-NN.md, CLUSTER-HANDOFF files) that an operator may land at any point in the
#   round pipeline, including between STATUS=READY and Reviewer execution. Resolution:
#   either add regex carve-outs for all known operator-owned coordination files, OR
#   document the gap explicitly with the recommendation that operators land methodology
#   commits before STATUS=READY or after Reviewer routing. Third occurrence of this
#   Architect forward-coverage gap class (R25 = DIAGNOSTIC files; R29 = REVIEWER-REPORT
#   file; R34 = operator post-READY commits). Detected tessera R34 MAJOR-1.
```

### For CLAUDE-IMPLEMENTER.md — append to REINFORCEMENTS section

```
# REINFORCED 2026-05-18 — When a test fails because the implementation matches spec
#   pseudocode literally but the literal contradicts the spec's stated behavioral intent
#   (e.g., spec says "non-overlapping windows" but pseudocode uses `<=` which overlaps),
#   this is a spec-vs-impl semantic conflict requiring HALT + DIAGNOSTIC + bounded options
#   (A: amend spec pseudocode; B: adjust test fixture; C: accept impl divergence with
#   rationale). NEXT-ROLE.md disclosure alone does not satisfy halt-discipline; it records
#   the outcome but bypasses the operator's option space. Detected tessera R34 MINOR-1.
# REINFORCED 2026-05-18 — When a spec-pseudocode regex is invalid in the target language
#   (e.g., `\Z` in JavaScript) and the test file is in ALLOWED_SET, fix the regex directly
#   (< 10 characters). Do NOT add content to a data file to work around a broken regex.
#   A regex fix is self-contained; a content workaround creates hidden structural coupling:
#   future contributors may delete the "workaround section" without knowing it is load-
#   bearing, silently breaking the test. Prefer the minimal, local, code-only fix.
#   Detected tessera R34 MINOR-3.
# REINFORCED 2026-05-18 — When spec § 4 prescribes a full-suite count assertion
#   (tests=N_total; pass=N_pass; fail=N_fail) but a subprocess-hang constraint prevents
#   running the full suite from within the test, the AC MUST structurally guarantee the
#   full-suite count by composition: independently count `test()` declarations in the new
#   test file AND assert pre-baseline subset count, then verify their sum equals the
#   spec'ied total. An implementation that asserts only the pre-baseline subset no longer
#   guarantees `total = baseline + N_new`; a silently-dropped AC is invisible to the
#   assertion. Detected tessera R34 MINOR-4.
```

---
