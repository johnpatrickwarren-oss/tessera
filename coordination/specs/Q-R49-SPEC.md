# Q-R49-SPEC — Pipeline-mandatory discipline + hybrid Reviewer formalization

**Round:** R49
**Tier:** audit (Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** R49 directive in `coordination/NEXT-ROLE.md` (SHA `356ff56`).

---

## § 1. Goal

Lock pipeline-as-default into the interactive-mode workflow and formalize the hybrid Reviewer
mandate at close-walk class waves. This closes the gap identified at R42-R47 where interactive
Implementer sessions bypassed the framework's auto-routing, allowing rounds to "complete" at
chore-A without running the cold-eye Reviewer or Memorial-Updater pipeline stages.

Four deliverables: (a) `scripts/finalize-round.sh` extended to auto-invoke
`run-pipeline.sh --start-at REVIEWER` after the two-commit attestation sequence; (b) CLAUDE-IMPLEMENTER.md
"On clean completion" narrative updated with explicit pipeline mandate instruction; (c)
`coordination/SPEC-AUTHORING-CHECKLIST.md` gains a `## Pipeline-mandatory discipline` section
codifying the sub-class canonical text; (d) `CLAUDE-COORDINATOR.md` gains a hybrid Reviewer
mandate section for close-walk class + `run-pipeline.sh` gains `--hybrid-reviewer` flag. All
self-verified via `coordination/specs/Q-R49-EMPIRICAL.sh`.

---

## § 2. Brainstorm

**Approach A — env-var recursion guard in finalize-round.sh + `--hybrid-reviewer` flag (SELECTED)**

Mechanism: After existing step 6 (integrity check), `finalize-round.sh` checks
`_FINALIZE_PIPELINE_ACTIVE`; if unset, exports it and invokes
`./run-pipeline.sh --round $ROUND --start-at REVIEWER [--hybrid-reviewer] [--tier <tier>]`.
The env-var guard prevents infinite recursion if anything inside the pipeline were to call
`finalize-round.sh` again. `run-pipeline.sh` gains `--hybrid-reviewer` flag that sets
`HYBRID_REVIEWER=true`. `finalize-round.sh` reads `CLOSE-WALK-CLASS: true` from NEXT-ROLE.md
to auto-pass `--hybrid-reviewer`. Also reads `TIER:` from NEXT-ROLE.md (default `full`).

Strengths: Non-recursive; additive (steps 1-6 unchanged); structural enforcement (machine-
enforced, not discipline-enforced); env-var guard pattern established at R47/R48
(`_PRE_COMMIT_RULE_SWEEP_ACTIVE`); `--hybrid-reviewer` is explicit and discoverable.

Weaknesses: Adds env-var pollution to pipeline process environment; finalize-round.sh now
has a network effect (calling it triggers a pipeline cascade that may be long-running).

Hidden assumption: `finalize-round.sh` is invoked from the project root (same relative-path
context as `run-pipeline.sh`). Holds for all existing interactive usage.

Risks: The env-var guard fails silently if `unset` is called inside a pipeline child process
(but `export` propagates across `exec`/subprocess; `unset` would have to be intentional).

**Approach B — NEXT-ROLE.md CLOSE-WALK-CLASS convention only (rejected)**

Mechanism: `run-pipeline.sh` reads `CLOSE-WALK-CLASS: true` from NEXT-ROLE.md at startup and
auto-sets `HYBRID_REVIEWER=true`. No change to `finalize-round.sh`.

Strengths: No new flag needed; purely convention-based.

Weaknesses: Does not satisfy item (a) (structural enforcement in `finalize-round.sh`). Relies
on operator discipline to set the field. `run-pipeline.sh` NEXT-ROLE.md parsing at startup adds
coupling between state file and script argument semantics.

**Approach C — Separate `fire-reviewer.sh` wrapper script (rejected)**

Mechanism: Leave `finalize-round.sh` unchanged; add `fire-reviewer.sh` that calls
`./run-pipeline.sh --start-at REVIEWER`.

Strengths: No mutation to existing script; clean separation.

Weaknesses: Explicitly ruled out by the R49 directive — item (a) says `finalize-round.sh`
SHALL invoke the pipeline. Wrapper still relies on operator discipline.

**Selection:** Approach A. Satisfies item (a) structurally; env-var guard pattern is
established; `--hybrid-reviewer` flag is cleaner than runtime NEXT-ROLE.md parsing.
Approaches B and C fail the structural-enforcement criterion of item (a).

---

## § 3. Design sketch

### Component boundaries

| File | Status | What changes |
|---|---|---|
| `scripts/finalize-round.sh` | Modified | Add step 7 after step 6: read TIER + CLOSE-WALK-CLASS from NEXT-ROLE.md; export `_FINALIZE_PIPELINE_ACTIVE=1`; invoke `./run-pipeline.sh --round $ROUND --start-at REVIEWER --tier $TIER_VAL [$HYBRID_FLAG]` |
| `CLAUDE-IMPLEMENTER.md` | Modified | Add pipeline mandate sentence in "On clean completion" section (after routing line; narrative section ONLY; REINFORCED count must stay at 37) |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | Modified | Add `## Pipeline-mandatory discipline` section with canonical sub-class text |
| `CLAUDE-COORDINATOR.md` | Modified | Add `### Hybrid Reviewer mandate at close-walk class` sub-section near § "Wave gate" |
| `run-pipeline.sh` | Modified | Add `--hybrid-reviewer` flag to argument parsing (sets `HYBRID_REVIEWER=true`) |
| `coordination/specs/Q-R49-SPEC.md` | Created | This file |
| `coordination/specs/Q-R49-EMPIRICAL.sh` | Created | Empirical verifier |
| `coordination/MEMORIAL.md` | Modified | Append R49 IMPLEMENTER entries |
| `coordination/NEXT-ROLE.md` | Modified | R49 routing + SHA-A |

Not modified: `engine/*`, `test/*`, `tools/*`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`,
`coordination/MEMORIAL-PHASE-*.md`, R42-R48 specs/empirical files, `coordination/SCOPING-MEMO-v0.3.md`,
`coordination/PRD.md`, CLAUDE-IMPLEMENTER.md REINFORCEMENTS section (freeze at 37 entries).

### Integration points and data flows

1. **finalize-round.sh → run-pipeline.sh**: After step 6 integrity-check succeeds, read `TIER:` field
   from NEXT-ROLE.md (default `full`). Read `CLOSE-WALK-CLASS: true` → set `HYBRID_FLAG=--hybrid-reviewer`.
   Export `_FINALIZE_PIPELINE_ACTIVE=1`. Invoke `./run-pipeline.sh --round $ROUND --start-at REVIEWER
   --tier $TIER_VAL $HYBRID_FLAG`. This is a subprocess call (not `exec`) so the finalize-round.sh
   success message prints first; pipeline is the final action.

2. **run-pipeline.sh `--hybrid-reviewer` flag**: New CLI flag in argument parser sets
   `HYBRID_REVIEWER=true`. Existing line 1645 (`$HYBRID_REVIEWER && [[ "$TIER" == "audit" ]]`)
   then fires the hybrid dispatch path. Backward-compatible: unset = prior behavior.

3. **CLAUDE-IMPLEMENTER.md narrative update**: One sentence appended after "Routing: NEXT-ROLE: REVIEWER"
   line. Does not touch REINFORCEMENTS section.

4. **SPEC-AUTHORING-CHECKLIST.md new section**: Appended at end of file as a new `---` separated
   section with the pipeline-mandatory sub-class canonical text.

5. **CLAUDE-COORDINATOR.md new sub-section**: Added near the wave-gate checklist or after the
   Memorial state section — covers close-walk class definition, `CLOSE-WALK-CLASS: true` convention,
   and mandatory hybrid Reviewer for named class.

### Failure modes

- Recursion (finalize-round.sh → pipeline → finalize-round.sh → ...): prevented by `_FINALIZE_PIPELINE_ACTIVE` guard.
- CLAUDE-IMPLEMENTER.md REINFORCED count drift: any edit outside the narrative section → halt condition 3.
- Test baseline drift: methodology round; no test files touched.
- Bash syntax regression: `bash -n` on both modified scripts.

---

## § 4. Acceptance criteria

All ACs verified in `coordination/specs/Q-R49-EMPIRICAL.sh`.

**AC-R49-1 (finalize-round.sh contains pipeline auto-fire invocation):**
Given `scripts/finalize-round.sh`, when grepped for the run-pipeline auto-fire line, then
`grep -cE "run-pipeline\.sh.*--start-at REVIEWER" scripts/finalize-round.sh` == 1.
(Note: `.*` not ` .+` because the invocation uses `"$PROJECT_ROOT/run-pipeline.sh"` with
a quote before the options — a space-then-dot-plus pattern would miss the quote character.)

**AC-R49-2 (finalize-round.sh has `_FINALIZE_PIPELINE_ACTIVE` recursion guard):**
Given `scripts/finalize-round.sh`, when grepped for the guard variable, then
`grep -cF "_FINALIZE_PIPELINE_ACTIVE" scripts/finalize-round.sh` == 2
(one check line and one export/set line).

**AC-R49-3 (finalize-round.sh bash syntax valid):**
Given `scripts/finalize-round.sh`, when `bash -n` is run, then exit code == 0.

**AC-R49-4 (CLAUDE-IMPLEMENTER.md "On clean completion" has pipeline mandate sentence):**
Given `CLAUDE-IMPLEMENTER.md`, when grepped for the distinctive phrase, then
`grep -cF "pipeline Reviewer + MU stages are required" CLAUDE-IMPLEMENTER.md` == 1.

**AC-R49-5 (CLAUDE-IMPLEMENTER.md REINFORCED count unchanged at 37):**
Given `CLAUDE-IMPLEMENTER.md`, when grepped for REINFORCED block entries, then
`grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md` == 37.

**AC-R49-6 (SPEC-AUTHORING-CHECKLIST.md has new Pipeline-mandatory discipline section):**
Given `coordination/SPEC-AUTHORING-CHECKLIST.md`, when grepped for the section header, then
`grep -cF "## Pipeline-mandatory discipline" coordination/SPEC-AUTHORING-CHECKLIST.md` == 1.

**AC-R49-7 (CLAUDE-COORDINATOR.md has hybrid Reviewer mandate at close-walk class):**
Given `CLAUDE-COORDINATOR.md`, when grepped for the mandate text, then
`grep -cF "close-walk class" CLAUDE-COORDINATOR.md` == 1.

**AC-R49-8 (run-pipeline.sh has `--hybrid-reviewer` flag parsing):**
Given `run-pipeline.sh`, when grepped for the new flag, then
`grep -cF "hybrid-reviewer" run-pipeline.sh` >= 2
(argument parsing entry + help text or HYBRID_REVIEWER assignment).

**AC-R49-9 (anti-scope: diff ⊆ ALLOWED_SET):**
Given `git diff --name-only <ROUND_START_SHA> HEAD`, when all paths are checked against
ALLOWED_SET = { `scripts/finalize-round.sh`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-COORDINATOR.md`,
`run-pipeline.sh`, `coordination/SPEC-AUTHORING-CHECKLIST.md`, `coordination/specs/Q-R49-SPEC.md`,
`coordination/specs/Q-R49-EMPIRICAL.sh`, `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`,
`coordination/reviews/REVIEWER-REPORT-R49*.md`, `coordination/diagnostics/DIAGNOSTIC-R49-*.md` },
then every path in the diff matches an entry in ALLOWED_SET.

**AC-R49-10 (test baseline preserved):**
Given `node --test --test-reporter=tap test/*.test.js`, when run at chore-A SHA, then
tests=361, pass=355, fail=3, skipped=3. `npx tsc -p tsconfig.test.json` exit == 0.

---

## § 5. Anti-scope

- **NO addition of REINFORCED entries to any `CLAUDE-*.md`.** CLAUDE-IMPLEMENTER.md is at 37 entries; R49 MUST NOT change the count. Modify ONLY the "On clean completion" narrative section.
- **NO modification of `engine/*`, `test/*`, `tools/*`** (zero production-code changes).
- **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`** (Rule 7 anchor-canonical-landing-deferred discipline).
- **NO modification of `coordination/MEMORIAL-PHASE-*.md`** (R42 frozen shards).
- **NO modification of R42-R48 specs / empirical files** (preserve historical baseline).
- **NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`**.
- **NO Phase 3 territory**.
- **NO GitHub PRs**.

---

## § 6. Open questions

None — all resolved by the R49 directive in `coordination/NEXT-ROLE.md`.

---

## § 7. Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names from `~/.claude/CROSS-PROJECT-MEMORIAL.md`.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — all empirical claims verified via `scripts/verify-empirical-acs.sh R49` at chore-A. Applies R47 Tightenings 1-4 + R48 corrections: no vacuous meta-ACs; stdout-grep for runtime claims; re-derive SHAs at citation time; exact counts.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches this round (methodology + tooling only).
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored (methodology round; R39-R48 precedent).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET enumerated in AC-R49-9 at spec-emit time. Matches the "ALLOWED modifications" list in NEXT-ROLE.md directive + standard carve-outs.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R49 codifies pipeline-mandatory discipline. Self-application: R49 itself runs through the pipeline (the directive says `./run-pipeline.sh --round R49 --tier audit`). The empirical claim "R49 was pipeline-executed" is verifiable via `git log` + pipeline log artifacts.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if `scripts/verify-empirical-acs.sh R49` exits non-zero at chore-A, HALT + DIAGNOSTIC. No silent workarounds. If finalize-round.sh modification breaks the two-commit attestation flow, HALT + DIAGNOSTIC.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (a) extension — the new `## Pipeline-mandatory discipline` section in SPEC-AUTHORING-CHECKLIST.md IS Rule 7 Surface (a) for this discipline. The auto-fire in `finalize-round.sh` IS Surface (b). Surface (c) is round-conditional: no new cross-project rule canonically derived this round; the pipeline-mandatory discipline extends an existing structural intent, not a new rule in CROSS-PROJECT-MEMORIAL.md.

---

## § 8. Halt conditions

1. `scripts/verify-empirical-acs.sh R49` exits non-zero at chore-A → HALT + DIAGNOSTIC.
2. `finalize-round.sh` modification breaks the existing two-commit attestation flow (steps 1-6) → HALT + DIAGNOSTIC.
3. `grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md` ≠ 37 → HALT + DIAGNOSTIC.
4. Test baseline drift from `361/355/3/3` → HALT + DIAGNOSTIC.
5. `bash -n scripts/finalize-round.sh` or `bash -n run-pipeline.sh` exits non-zero → HALT + DIAGNOSTIC.
6. Pipeline self-invocation regression (infinite loop) in modified `finalize-round.sh` → HALT + DIAGNOSTIC. Reference `_PRE_COMMIT_RULE_SWEEP_ACTIVE` R48 pattern for the guard shape.

---

## § 9. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R49 --tier audit
```
