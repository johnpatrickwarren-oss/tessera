# REVIEWER-REPORT-R49

**Round:** R49 (audit-tier, Implementer-as-Architect)
**Reviewer:** REVIEWER (Opus 4.7, headless cold-eye pass)
**Inputs read:** `coordination/PRD.md`, `coordination/specs/Q-R49-SPEC.md`,
`coordination/specs/Q-R49-EMPIRICAL.sh`, `scripts/finalize-round.sh`,
`CLAUDE-IMPLEMENTER.md`, `CLAUDE-COORDINATOR.md`,
`coordination/SPEC-AUTHORING-CHECKLIST.md`, `run-pipeline.sh`,
`coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md` (R49 entries),
`~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section).
**Not read** (cold-review preserved): `coordination/diagnostics/`,
`coordination/logs/`, any `.prompt-*.md`.
**Round SHAs:** round-start `356ff56` → chore-A `4e62d99` → chore-B `72cab4c` (HEAD).
**Empirical harness:** `bash coordination/specs/Q-R49-EMPIRICAL.sh` → 14 PASS / 0 FAIL.

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R49-1 | finalize-round.sh contains pipeline auto-fire invocation | PASS | `scripts/finalize-round.sh:196` matches `grep -cE "run-pipeline\.sh.*--start-at REVIEWER"` = 1. Verifier line 50. |
| AC-R49-2 | finalize-round.sh has `_FINALIZE_PIPELINE_ACTIVE` guard (2 occurrences) | PASS | `scripts/finalize-round.sh:183` (check), `:194` (export). `grep -cF "_FINALIZE_PIPELINE_ACTIVE" scripts/finalize-round.sh` = 2. |
| AC-R49-3 | `bash -n scripts/finalize-round.sh` exit 0 | PASS | Verifier line 61 — bash syntax check passes. |
| AC-R49-4 | CLAUDE-IMPLEMENTER.md has pipeline mandate sentence | PASS | `CLAUDE-IMPLEMENTER.md:115` contains "pipeline Reviewer + MU stages are required"; appears in "On clean completion" routing block at `:113-115`. |
| AC-R49-5 | CLAUDE-IMPLEMENTER.md `^# REINFORCED` count = 37 | PASS | Manual grep verified 37 entries (lines 138, 147, 196, 201, 259, 345, 375, 381, 387, 392, 398, 404, 410, 423, 436, 442, 449, 455, 500, 506, 511, 517, 522, 528, 535, 541, 546, 552, 559, 629, 664, 675, 685, 694, 703, 714, 727). |
| AC-R49-6 | SPEC-AUTHORING-CHECKLIST.md has `## Pipeline-mandatory discipline` header | PASS | `coordination/SPEC-AUTHORING-CHECKLIST.md:372` matches. |
| AC-R49-7 | CLAUDE-COORDINATOR.md has "close-walk class" mention | PASS | `CLAUDE-COORDINATOR.md:349` "### Hybrid Reviewer mandate at close-walk class". Single literal match — see OBS-5 for thinness. |
| AC-R49-8 | run-pipeline.sh has `hybrid-reviewer` (≥ 2 occurrences) | PASS | `run-pipeline.sh:120` (flag parse), `:140` (help text). `grep -cF "hybrid-reviewer" run-pipeline.sh` = 2. See MINOR-1 re: `assert_ge` vs `assert_eq`. |
| AC-R49-9 | Anti-scope: diff ⊆ ALLOWED_SET | PASS | `git diff --name-only 356ff56 HEAD` → 9 files: `CLAUDE-COORDINATOR.md`, `CLAUDE-IMPLEMENTER.md`, `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/SPEC-AUTHORING-CHECKLIST.md`, `coordination/specs/Q-R49-EMPIRICAL.sh`, `coordination/specs/Q-R49-SPEC.md`, `run-pipeline.sh`, `scripts/finalize-round.sh`. All in ALLOWED_SET. |
| AC-R49-10 | Test baseline 361/355/3/3 + tsc exit 0 | PASS | `node --test test/*.test.js` → `tests=361 pass=355 fail=3 skipped=3`; `npx tsc -p tsconfig.test.json` exit 0. |

Overall: **10/10 PASS** structurally; the empirical harness exits 0 at chore-A HEAD.

---

## 2. Findings

### CRITICAL

None.

### MAJOR

**MAJOR-1 — Hybrid Reviewer mandate decoupled from structural enforcement; close-walk-class at full-tier silently bypasses the mandate.**

- The new `CLAUDE-COORDINATOR.md:349-371` § "Hybrid Reviewer mandate at close-walk class" states: *"Close-walk class rounds require hybrid Reviewer (Opus + Sonnet merged), not advisory."* and lists examples: *"Phase-close round (e.g., R15 Phase 1 close, R37 WAVE-GATE-05 Phase 2 close)"*, *"SLICE-close round"*, *"Multi-cluster wave-consolidation round"*.
- The structural enforcement at `run-pipeline.sh:1650` gates hybrid Reviewer behind `[[ "$role" == "REVIEWER" ]] && $HYBRID_REVIEWER && [[ "$TIER" == "audit" ]]`. The inline comment at `:1647-1649` explains: *"Only applies to audit-tier (full-tier already has Architect as the second set of eyes; hybridizing Reviewer there is over-engineering)."*
- `scripts/finalize-round.sh:191-196` will set `HYBRID_FLAG=--hybrid-reviewer` when `CLOSE-WALK-CLASS: true` AND pass `--tier "$TIER_VAL"` AND `$HYBRID_FLAG`. If `TIER_VAL=full` (which is the script's documented default at `:188`: `TIER_VAL="${TIER_VAL:-full}"`), `--hybrid-reviewer` is passed but the run-pipeline.sh dispatch at `:1650` silently no-ops on it.
- The `--hybrid-reviewer` help text at `run-pipeline.sh:140-143` says *"Mandatory for close-walk class rounds; see CLAUDE-COORDINATOR.md"* — with no audit-tier qualifier.
- The CLAUDE-COORDINATOR.md section also has no audit-tier qualifier.
- Net effect: the mandate's structural enforcement covers only `close-walk class ∩ audit-tier`. The two cited Phase-close examples (R15, R37) were historically full-tier, so the mandate would have silently no-opped on them. A future operator who reads CLAUDE-COORDINATOR.md, sets `CLOSE-WALK-CLASS: true`, and runs full-tier (the documented default) will pass `--hybrid-reviewer` and never observe hybrid Reviewer dispatch — false-compliance attestation is structurally invited.
- Resolution paths (Reviewer offers; does not pick): (i) Add explicit *"close-walk class implies audit-tier"* clause to CLAUDE-COORDINATOR.md + help text; or (ii) drop the `[[ "$TIER" == "audit" ]]` gate at run-pipeline.sh:1650 so `--hybrid-reviewer` honors the flag regardless of tier; or (iii) have finalize-round.sh halt-error when `CLOSE-WALK-CLASS=true` AND `TIER!=audit`. None of (i)/(ii)/(iii) ship in R49.
- Rule 7 propagation gap: Surface (a) (documentation) and Surface (b) (auto-fire) both exist but Surface (b) silently does nothing for the most-cited example contexts (Phase-close, SLICE-close at their historical tiers).

### MINOR

**MINOR-1 — Tightening 4 (exact counts over `>= 1`) not self-applied: AC-R49-8 uses `assert_ge` though count is structurally fixed.**

- `coordination/specs/Q-R49-EMPIRICAL.sh:6` header declares *"Tightenings applied (R47): no vacuous meta-ACs; stdout-grep for runtime claims; re-derive SHAs; exact counts."*
- `coordination/specs/Q-R49-EMPIRICAL.sh:92` for AC-R49-8: `assert_ge "AC-R49-8" "2" "$ACTUAL"`. All other ACs (R49-1 through R49-7, R49-10) use `assert_eq`. The R49 round's own additions to `run-pipeline.sh` (lines 120 + 140) make the count structurally fixed at 2. Per `CLAUDE-IMPLEMENTER.md:685-692` REINFORCED (R47 MAJOR-2): *"For each `assert_ge` found: ask 'is this expected count structurally fixed by this round's own file content?' If yes, replace with `assert_eq`."*
- Detected in the very round that re-iterates Tightening 4 in its checklist surface. Rule 5 (rule-derivation-without-self-application) anti-pattern, parallel to R47 MAJOR-2.

**MINOR-2 — TIER convention not self-applied: `TIER:` field missing from R49 NEXT-ROLE.md.**

- R49 is audit-tier (`Q-R49-SPEC.md:4`: *"Tier: audit"*; `NEXT-ROLE.md:96`: *"./run-pipeline.sh --round R49 --tier audit"*).
- `scripts/finalize-round.sh:187-188` reads `TIER:` from `NEXT-ROLE.md`, defaults to `full` when absent.
- `coordination/NEXT-ROLE.md` (current HEAD) has no `TIER:` field. If finalize-round.sh is invoked for R49 (which the new pipeline-mandatory discipline RECOMMENDS), step 7 would auto-fire `run-pipeline.sh --tier full` — disagreeing with the spec's intended audit-tier.
- The Implementer codified the field-read convention but did not populate the field in their own NEXT-ROLE.md. Future rounds inheriting R49 as exemplar will see TIER unset and may not learn the convention.
- Cleanup: add `TIER: audit` near the top of `coordination/NEXT-ROLE.md` (next to `CURRENT-ROUND:`).

**MINOR-3 — Verifier has a SKIP-counts-as-PASS branch (R46 MAJOR-1+3 anti-pattern recurrence).**

- `coordination/specs/Q-R49-EMPIRICAL.sh:97-100`:
  ```
  if [ -z "${ROUND_START_SHA:-}" ]; then
    echo "  SKIP — ROUND_START_SHA unavailable"
    PASS=$((PASS + 1))
  ```
- If `git rev-parse 356ff56` ever fails (rebase, repo state, manifest disconnect), `ROUND_START_SHA` is empty, AC-R49-9 is SKIPped *and counted as PASS*. The verifier's aggregate exit 0 then conceals an unverified AC.
- This is the R46 MAJOR-1+3 *"Mechanical-AC verifier must not be self-confirming"* pattern (referenced in CLAUDE-IMPLEMENTER.md:611-627). Specifically: the per-AC binding can return PASS via a branch that has *no logic detecting failure*.
- Currently dormant (the SHA resolves); the structural defect remains. Fix: replace the `PASS++` in the SKIP branch with `FAIL++` (or compute aggregate exit from `FAIL` count only and omit the AC from the PASS tally on SKIP).

**MINOR-4 — Variable name `CHORE_A_SHA` actually captures HEAD (= chore-B SHA-backfill commit) — R44 MINOR-2 echo.**

- `coordination/specs/Q-R49-EMPIRICAL.sh:101`: `CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null || true)`.
- At verifier-run time, HEAD = `72cab4c` (chore(R49): record attestation SHA — the chore-B / SHA-backfill commit), not chore-A `4e62d99`.
- Behavior is functionally correct (the diff range from `356ff56` to HEAD = `72cab4c` captures all R49 changes), but the name lies about content. CLAUDE-IMPLEMENTER.md:599-606 lists *"R44 MINOR-2 (attestation conflates chore-A SHA with SHA-backfill SHA in file-count claim)"* as a recurring `false-compliance-attestation` sub-pattern. The verifier reproduces the same naming defect at the variable layer.
- Fix: rename to `HEAD_SHA` or `CHORE_B_SHA` — neither claim is misleading.

**MINOR-5 — Line citation drift in spec § 3 ("Existing line 1645") off by 5 from actual `run-pipeline.sh:1650`.**

- `coordination/specs/Q-R49-SPEC.md` § 3 design sketch integration point 2: *"Existing line 1645 (`$HYBRID_REVIEWER && [[ \"$TIER\" == \"audit\" ]]`) then fires the hybrid dispatch path."*
- Actual line is `run-pipeline.sh:1650`. Off by 5.
- R21 MINOR-4 / R47 line-citation-drift pattern; established gate at `CLAUDE-IMPLEMENTER.md:463-466` is cite-then-verify before commit. Likely caused by adding the new `--hybrid-reviewer` flag block (~5 lines at `:117-120` and `:140-143`) shifting downstream line numbers without spec re-verification.

### OBS

**OBS-1 — Spec self-application claim is partial only.**

- Spec § 7 Rule 5 claim (`Q-R49-SPEC.md:209`): *"Self-application: R49 itself runs through the pipeline (the directive says `./run-pipeline.sh --round R49 --tier audit`). The empirical claim 'R49 was pipeline-executed' is verifiable via `git log` + pipeline log artifacts."*
- Reality: the Implementer's chore-A `4e62d99` was committed manually (audit-tier Implementer-as-Architect). The auto-fire mechanism that would have driven pipeline execution didn't exist until chore-A itself landed it (chicken-and-egg). The pipeline fires for R49 starting at REVIEWER stage (this report).
- Not a violation since the directive's pipeline invocation in `NEXT-ROLE.md:92-97` IS being honored by the current Reviewer + future Memorial-Updater stages. But *"R49 itself runs through the pipeline"* overstates the scope — only the post-chore-A stages do.
- Future similar founding rounds for new pipeline mechanisms should disclose this scope precisely.

**OBS-2 — No runtime test for the new step 7 (auto-fire + recursion guard).**

- AC-R49-1 verifies the auto-fire LINE exists. AC-R49-3 verifies bash syntax. No AC verifies that the recursion guard fires correctly when `_FINALIZE_PIPELINE_ACTIVE=1` is set in the environment, nor that the `--tier` / `--hybrid-reviewer` flags flow correctly into the spawned `run-pipeline.sh`.
- This is a known audit-tier methodology-round limitation (no production-code branches to test), but the new step 7 is the load-bearing structural surface for the pipeline-mandatory discipline. An untested recursion guard is a halt-condition-6 risk (explicitly named in `Q-R49-SPEC.md:222`).
- A minimal next-round test would be: `_FINALIZE_PIPELINE_ACTIVE=1 ./scripts/finalize-round.sh --round R49` — should print no "Step 7/7" line. Not implemented this round.

**OBS-3 — `set -euo pipefail` + post-success auto-fire creates confusing UX.**

- `scripts/finalize-round.sh:168-177` prints `"=== Round $ROUND finalized. ==="` and `"STATUS : READY"` BEFORE step 7 invokes the pipeline.
- If `run-pipeline.sh` later fails (Reviewer ESCALATEs, model error, rate-limit, etc.), `set -e` propagates non-zero exit — but operators reading the terminal see the success banner first.
- Suggestion: either defer the success banner to after step 7, or print a *"Pipeline Reviewer + MU stages launching; further output below…"* notice before step 7 begins.

**OBS-4 — Spec deviance discloses AC-R49-1 regex pattern change "in same session before commit"; iterates audit-tier R45 MAJOR-2 boundary.**

- `coordination/NEXT-ROLE.md:18` discloses the regex amendment from ` .+` → `.*`. Per `CLAUDE-IMPLEMENTER.md:182-194` REINFORCED (R45 MAJOR-2): *"When wearing the Architect hat in an audit-tier round and a binding-command run surfaces a result that contradicts an AC literal … the Implementer-as-Architect MUST NOT inline-amend the AC in the same chore-A commit."*
- The R45 MAJOR-2 rule covers post-spec-emit AC amendments. R49's spec was authored from scratch in chore-A — no prior committed spec text to "amend." The change was caught pre-commit during normal authoring iteration, not after a failing binding-command. Strict-reading R45 MAJOR-2 does not fire; the disclosure is best-effort transparency.
- Logged as OBS only — borderline case at the audit-tier authoring iteration boundary. The discipline test would be: "did the regex `.+` ever return FAIL during chore-A iteration and the response was to weaken the AC?" If yes, R45 MAJOR-2 fires. If no (the Implementer caught it before running the verifier), this is normal authoring. Both scenarios are consistent with the disclosure text and indistinguishable from the audit trail. Reviewer cannot disambiguate.

**OBS-5 — AC-R49-7 verifies header-only single-match presence; minimal coverage.**

- AC-R49-7 verifies `grep -cF "close-walk class" CLAUDE-COORDINATOR.md` == 1, and the single hit is `:349` (the section header itself).
- The body of the new section uses *"close-walk"* (without "class") variants: *"close-walk variants"*, *"close-walk class definition"* paraphrase. AC could pass with body wholly removed and only the header retained — verifies presence of one literal substring but does not bind the substantive content (mandate text, mechanical class definition, invocation block, canonical-text-landed-at line) the section actually carries.
- Not load-bearing — the actual content is rich and correct — but the AC is *minimum-coverage* per R46 mechanical-verifier discipline (CLAUDE-IMPLEMENTER.md:611-627). A future regression that strips the section body but retains the header would silently pass AC-R49-7.

---

## 3. Right-reasons audit

Three ACs picked for self-confirming-test analysis:

**AC-R49-1 (auto-fire invocation present in finalize-round.sh):**
- Spec requirement: structural enforcement of pipeline-mandatory discipline (Q-R49-SPEC.md:34, deliverable a).
- Test mechanism: `grep -cE "run-pipeline\.sh.*--start-at REVIEWER" scripts/finalize-round.sh` == 1.
- Self-confirming risk: low. The pattern requires both `run-pipeline.sh` AND `--start-at REVIEWER` on the same line. Removing the auto-fire line would FAIL. Comments mentioning "run-pipeline.sh" elsewhere (`:97, :113`) do NOT match because they lack `--start-at REVIEWER`. Pattern binds the structural property. **Not self-confirming.**

**AC-R49-5 (REINFORCED count = 37):**
- Spec requirement: anti-scope strict — no REINFORCED entries added (Q-R49-SPEC.md:184, anti-scope clause #1).
- Test mechanism: `grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md` == 37.
- Self-confirming risk: low. The `^# REINFORCED` anchor requires line-start; mid-line "REINFORCED" tokens do not match. Adding a REINFORCED line anywhere in the file would change the count. **Not self-confirming.**

**AC-R49-10 (test baseline preserved):**
- Spec requirement: methodology round must not perturb test surface (Q-R49-SPEC.md:178).
- Test mechanism: empirically run `node --test test/*.test.js` and `npx tsc -p tsconfig.test.json`; assert tests=361, pass=355, fail=3, skipped=3, tsc exit=0.
- Self-confirming risk: low. The verifier runs the actual binding command and parses its output. The expected values are spec-prescribed literals, not values computed by the implementation. **Not self-confirming.**

All three traceable to spec requirements; none self-confirming.

---

## 4. Cross-cutting checks

**TDD discipline.** Methodology round; no test files authored. Per Q-R49-EMPIRICAL.sh authorship before chore-A (NEXT-ROLE.md:20 disclosure): *"Verifier authored before implementation; run showed 6 FAILs (spirit of TDD RED state met). No separate git RED commit (methodology round; R42-R48 precedent; letter not met per R41 MINOR-5 disclosure form)."* Consistent with R39-R48 chain. Disclosed properly under R41 MINOR-5 spec-mandated-stub-form-bypassed discipline.

**Halt discipline / no-skip.** No halts encountered. Spec deviance disclosed in NEXT-ROLE.md:18 (regex pattern adjustment) — see OBS-4 for the R45 MAJOR-2 boundary analysis. Halt conditions 1-6 (Q-R49-SPEC.md:217-222) all evaluated false at chore-A: verifier exits 0; existing two-commit attestation flow unchanged; REINFORCED count = 37; test baseline 361/355/3/3; bash -n exit 0; no pipeline self-invocation observed.

**Anti-scope.** 9 files in `git diff --name-only 356ff56..HEAD`, all in ALLOWED_SET. No `engine/*`, `test/*`, `tools/*`, `CROSS-PROJECT-MEMORIAL.md`, `MEMORIAL-PHASE-*.md`, R42-R48 spec/empirical, `SCOPING-MEMO-v0.3.md`, or `PRD.md` modifications. **Clean.** Rule 4 forward-coverage held.

---

## 5. Grilling output (on this report, before routing)

- **Every finding has a file:line reference?** Yes. Every MAJOR/MINOR/OBS includes file paths and line numbers (or exact grep commands).
- **Any AC marked PASS without actual verification?** No. All 10 ACs confirmed via direct empirical invocation (`bash coordination/specs/Q-R49-EMPIRICAL.sh` ran end-to-end, output captured: 14 PASS / 0 FAIL) plus targeted re-reads of cited file:line ranges.
- **Right-reasons audit completed for 3+ tests?** Yes — AC-R49-1, AC-R49-5, AC-R49-10 traced to spec requirements and screened for self-confirming patterns. All three not self-confirming.
- **Cross-cutting checks complete?** Yes — TDD discipline (methodology-round caveat documented), halt discipline (no fires), anti-scope (diff ⊆ ALLOWED_SET) all addressed.
- **MAJOR-1 root cause vs symptom?** Treated as structural/documentation mismatch (root cause: dispatch-side gate at run-pipeline.sh:1650 vs documentation at CLAUDE-COORDINATOR.md), not as symptom-only. Three resolution paths offered without picking.
- **Re-readable by Memorial-Updater cold?** Yes — report names each artifact, cites a line range, and identifies what the next role would observe at HEAD.

---

## 6. Routing

**STATUS: MERGE-READY**

- 0 CRITICAL (the only material concern is MAJOR-1 documentation-vs-enforcement gap; not a correctness defect, no test break, no anti-scope violation).
- 1 MAJOR (documentation mandate without matching structural enforcement — close-walk class @ full-tier silently bypasses the mandate).
- 5 MINOR (Tightening 4 self-application; TIER convention self-application; SKIP-counts-as-PASS; CHORE_A_SHA naming; line citation drift).
- 5 OBS (self-application claim scope; runtime test gap; UX banner ordering; spec deviance boundary; AC-R49-7 thin coverage).

Per routing rules (`CLAUDE-REVIEWER.md:35`): *"MAJOR or below → STATUS: MERGE-READY."* No CRITICAL → not ESCALATE.

**Recommendation for Memorial-Updater + operator follow-up:**
- MAJOR-1: route to operator decision on resolution path (i/ii/iii) before next close-walk-class round invokes the auto-fire convention. Could become R50 candidate scope.
- MINOR-1, MINOR-3, MINOR-4: cheap follow-up tightenings to fold into the next methodology round (R50 or candidate R51 consolidation round).
- MINOR-2: trivial cleanup — add `TIER: audit` to `coordination/NEXT-ROLE.md`. Could be folded into the Memorial-Updater chore for this round if scope permits.
- MINOR-5: low-effort spec edit; consider whether to amend Q-R49-SPEC.md (Rule 4 anti-scope-allowed-set-forward-coverage allows post-chore-A spec amendments under operator disposition only — defer to operator).

---

_End of REVIEWER-REPORT-R49._
