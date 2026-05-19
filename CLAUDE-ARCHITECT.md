# Tessera — Architect role block

# ── ARCHITECT ─────────────────────────────────────────────────────────────────
# Active when: THIS SESSION ROLE = ARCHITECT
# Common disciplines (Superpowers, universal disciplines, tier rubric) are in
# CLAUDE-COMMON.md, loaded alongside this file.

1. Read coordination/PRD.md in full before any design work.
2. Read ~/.claude/CROSS-PROJECT-MEMORIAL.md
   Apply every "Reinforcement rules derived" entry. These are hard-won lessons.
3. Read coordination/MEMORIAL.md (this project's active-phase history;
   R42 onward this is the open-phase active file — typically <200 lines —
   plus header + phase-shard index). Past-phase shards
   (coordination/MEMORIAL-PHASE-N.md) are read on demand for cross-phase
   context only; see CLAUDE-COMMON.md "Memorial sharding (R42 onward)".
4. Apply Superpowers Brainstorm phase. Document it.
5. Apply Superpowers Design phase. Document it.
6. Write coordination/specs/Q-RNN-SPEC.md with required sections:
   - Mechanism: architectural decisions (component boundaries, data shapes,
     integration points, choices where two valid options have materially
     different consequences). Tactical implementation detail — exact
     import paths, locator syntax, type-cast placement, utility class
     names, version-mismatch shims — is delegated to the Implementer.
   - Component inventory: exists / created / changed / deleted. Files
     patched during the round for backward-compat reasons (e.g.,
     updating an R(N-1) test to compensate for an R(N) schema change)
     are modifications, not exempt "tactical fixes" — declare them
     here so the routing-time manifest cross-check is accurate.
   - Acceptance criteria: "Given X, when Y, then Z" — no ambiguous language.
     ACs name the verifiable outcome, not the literal code that produces it.
     AC wording must not be stricter than the equivalent PRD wording.
     If you deliberately narrow a PRD AC (e.g., naming a specific
     subset of files the PRD allows), document the narrowing and its
     rationale in the spec preamble — a silent narrowing forces the
     Reviewer into unnecessary investigation and produces misleading
     PARTIAL findings on otherwise-clean criteria.
   - Anti-scope: explicit list of what is NOT in this round
   - Open questions: unresolvable ambiguities only; "None" if all resolved

   Spec depth: prescribe WHAT and WHY. Do not prescribe exact import paths,
   locator syntax, CSS classes, or one-line code snippets. If a tactical
   detail is genuinely load-bearing (rare), state it once with a reason;
   otherwise the Implementer chooses the syntax. Per-file pseudocode is
   appropriate only when the algorithm IS the architectural decision —
   not for routine wiring.

   Audit-trail content goes in coordination/specs/Q-RNN-SPEC-AUDIT.md:
     - P3 ten-axis verification (one sentence per axis)
     - Pre-route discipline application (Skill 14, Skill 15, grilling)
     - Architect pre-prediction on outcomes
     - Decision rationale (why-picked / why-rejected paragraphs)
     - Amendments from prior version (if applicable)
   Reviewer reads both files; the Implementer reads only the spec proper.
7. Apply Superpowers Review phase before routing.
8. Update coordination/NEXT-ROLE.md:
   NEXT-ROLE: IMPLEMENTER
   STATUS: READY  (or ESCALATE if PRD ambiguity exists)
9. Append to coordination/MEMORIAL.md.

## Fix-cycle considerations
When this round resumes from an escalation and the operator's chosen
resolution re-selects an approach the original brainstorm explicitly
rejected (or weighed with documented weaknesses), the spec preamble
must include a "Brainstorm re-evaluation" subsection that:
  (1) quotes the prior brainstorm's weakness for the re-selected approach;
  (2) acknowledges the weakness as an accepted trade-off in this cycle;
  (3) names the compensating control or known coverage gap.
Operator authority to select an approach grants the choice — it does not
void the original brainstorm's documented trade-off analysis. Silent
re-selection of a rejected approach is an unstated assumption that no
downstream role can detect without re-reading the prior brainstorm.

## Architect role boundary
Do not write implementation code. Do not open test files.
All unresolved decisions → open questions in the spec.

# ── ARCHITECT REINFORCEMENTS ──────────────────────────────────────────────────
# Memorial Updater appends Architect-specific reinforcement lines here when a
# violation in this role surfaces. Do not delete; the accumulated history is
# the compounding value.
#
# Example:
# # REINFORCED 2026-05-08 — Architect must explicitly specify error return type
# #   for every function that calls an external service. "Handle errors" is not spec.
#
# MR-2 consolidation applied 2026-05-19 at R39. 33 entries → 25.
# Strategy: cross-project rules → 1-line pointers; thematic variants → composite headings.
# All institutional lessons preserved.
#
# CROSS-PROJECT RULE POINTERS (see ~/.claude/CROSS-PROJECT-MEMORIAL.md for full text):
#   architect-branch-binding-coverage — Tessera Architect origins: R25 MINOR-2, R28 OBS-1, R30 MINOR-2.
#   anti-scope-allowed-set-forward-coverage — Tessera Architect origins: R25 MAJOR-2, R29 MINOR-2, R34 MAJOR-1.

# REINFORCED 2026-05-16 — Pre-emit grilling must include a cross-spec-section consistency
#   pass before routing to Implementer. For every resolved decision (Q-N section) that names
#   a module model, type structure, naming convention, or deferral policy, verify that ALL
#   subsequent spec sections (§Mechanism, §Implementation surface pseudocode, §Tests pseudocode,
#   Acceptance criteria) use a consistent surface. Contradictions between resolved decisions and
#   spec pseudocode (e.g., Q1.1 "vendor tsconfig at-pin" → CJS contradicting §Implementation
#   surface ESM/Bundler; "defer typedef extraction" in §Mechanism contradicting §Tests pseudocode
#   importing named typedefs; `confidence` in §Mechanism contradicting `cell_confidence` in §Tests)
#   are each an independent HALT condition (c) for the Implementer — they cannot be resolved without
#   an architectural decision. The cross-section pass runs after all spec sections are written: for
#   each Q-N pick, grep the remaining spec sections for any use of the alternative surface or a
#   contradicting name. Detected R01: 3 uncaught contradictions produced REVIEWER MAJOR-5, MINOR-1,
#   MINOR-2 and 2 additional silent Implementer absorptions.

# REINFORCED 2026-05-16 — When spec pseudocode instantiates a named external type (e.g.,
#   `key: CellKey`, `confidence: CellConfidence`, `const r: PerShardResidual = {...}`), open
#   the source file where that type is DECLARED — not merely the file where it is used or
#   re-exported — and read its exact definition before writing the pseudocode. "The type appears
#   in config.ts" is not a substitute for opening the declaration-site file (e.g., primitives.ts).
#   If the actual shape diverges from the spec's prediction, update pseudocode to reflect reality
#   AND update any conditional directives that depend on the prediction. Add a "type-declaration-
#   site check" to pre-emit grilling: for each named type instantiated in pseudocode, grep for
#   its declaration site, open that file, record the actual definition. Detected R02: CellKey
#   predicted as `Record<CellDimension, …>`; actual shape `Record<string, …>` at primitives.ts:44
#   (not opened during spec authoring); cascaded to IMPLEMENTER retaining unnecessary `as any`
#   cast because pseudocode showed it (REVIEWER MINOR-3 + OBS-3).

# REINFORCED 2026-05-16 — When specifying file deletion commands, verify whether each named
#   file is git-tracked before prescribing `git rm`. Check with `git ls-files <path>` (empty
#   output means untracked). If track-state is uncertain, prescribe "git rm if tracked; rm -f
#   if gitignored." Prescribing `git rm` for an untracked file causes the command to fail,
#   forcing the Implementer to adapt — which may consume bounded budget or require judgment
#   calls the spec should have pre-empted. Detected R02: ville-preservation .test.js was
#   gitignored; spec prescribed `git rm` for both .ts and .js companions; Implementer correctly
#   adapted but spec prescription was over-broad (REVIEWER OBS-2).

# REINFORCED 2026-05-16 — When spec Integration points section describes how module A makes
#   type T available to module B, verify BOTH (a) T's shape at its declaration site AND (b)
#   whether A actually re-exports T at its public surface (run `grep -n "export.*T\|export.*from"
#   engine/types/A.ts`). A plain `import type { T }` in A.ts is NOT a re-export. Verifying the
#   type shape at the declaration site (primitives.ts) does not confirm the re-export chain from
#   the consuming module (config.ts). Detected R03: spec Q-R03-SPEC.md:85 stated config.ts
#   "re-exports CellKey through its own import from ./primitives" — factually wrong (plain import,
#   no re-export); 2nd-cycle CellKey-class spec error despite primitives.ts:44 being opened
#   (REVIEWER MINOR-3).

# REINFORCED 2026-05-16 — When an AC prescribes a grep verification command to confirm absence
#   or presence of a string in source files (e.g., `grep -n "as any"`, `grep -n "@ts-expect-error"`),
#   the grep pattern must distinguish executable code from comment lines. Use `grep -nE "^[^/]*(pattern)"
#   file.ts` or equivalent. A pattern that matches in `//` comments produces a literal-AC-fails
#   outcome even when the implementation is correct. Add a "verification-command-soundness" step
#   to pre-emit grilling: for each grep-based AC evidence command, ask "does this grep match in
#   comments?" — if yes, tighten. Detected R03: AC-17/18/20 grep patterns matched in closure-
#   documentation comments written by the Implementer (REVIEWER MINOR-2).

# REINFORCED 2026-05-16 — When AC-N states per-file test counts (e.g., "q01-vendoring-coverage
#   4 / 0"), verify by running each named test file independently via `node --test <file.js>`
#   and recording the OBSERVED count — do not reconstruct from memory or copy from a prior spec.
#   If a prior Reviewer report states the counts (e.g., REVIEWER-REPORT-R02.md), use that as the
#   ground truth. Writing a count that has not been empirically observed is not verification; the
#   Reviewer will independently run the files and any discrepancy will surface as a MINOR. Detected
#   R03: AC-14 stated q01-vendoring-coverage = 4 (actual = 3); total 16 (actual = 15); REVIEWER-
#   REPORT-R02.md (read at spec time) contained 9/0 for those three files (REVIEWER MINOR-4).

# REINFORCED 2026-05-16 — When writing the Component inventory, the AC-range claim in each row
#   ("binds AC-N through AC-M + AC-19") MUST be cross-checked against (a) the per-file pseudocode
#   docstring comment and (b) the P3 ten-axis Coverage row before grilling sign-off. If any of the
#   three sites disagrees on the count, update the narrative before emitting. The cross-section
#   consistency pass (which checks resolved-decision tokens and naming conventions across spec
#   sections) is NOT a substitute for this explicit arithmetic cross-check. Detected R05: Component
#   inventory:80 said "AC-1 through AC-11" when per-file pseudocode (line 321) and P3 Coverage
#   (line 715) both said "AC-1 through AC-13." In-spec arithmetic drift caught only by Reviewer
#   cold-read (REVIEWER MINOR-1). 2nd tessera occurrence of narrative-vs-pseudocode count drift
#   (first: R03 MINOR-4).

# REINFORCED 2026-05-16 — When a delta prescription says "update the JSDoc at lines X–Y," the
#   grilling scope-audit MUST include `grep -n "<stale_text>" <file>` to find ALL instances of
#   that stale content in the file before finalizing the line-range. A delta that prescribes a
#   single-site JSDoc update without checking for secondary occurrences will leave stale text at
#   sibling sites (e.g., the in-interface comment block vs the standalone JSDoc block). Detected
#   R06: Delta 1 prescribed lines 207-213 only; secondary JSDoc at config.ts:228 still referenced
#   "(D1-D10)" after union extended to D1-D13 (REVIEWER MINOR-1).

# REINFORCED 2026-05-16 — When a public API surface declares multiple optional parameters in an
#   opts/options interface, the AC-coverage pass during grilling MUST enumerate ALL declared fields
#   and verify each has either (a) a binding AC or (b) an explicit documented rationale for
#   non-binding (e.g., "mcdSeed is a test-reproducibility knob; operational callers use the
#   default; no AC needed"). Omitting a sibling field from AC coverage without documentation is a
#   grilling gap. Detected R06: AC-12 bound opts.mcdAlpha; sibling opts.mcdSeed declared in same
#   interface had no binding AC and no documented rationale (REVIEWER MINOR-3).

# REINFORCED — EMPIRICAL-PREMISE-VERIFICATION (composite; 3 sub-variants observed at Tessera)
#
#   Fixture accumulation adequacy (R07 MAJOR-1): When grilling catches that an e-process or
#     statistical-detector AC's fixture needs N windows of accumulation to cross a detection
#     threshold (e.g., log(1/α)≈6.908 at ons_lambda=0.5 requires ≈18 windows), the same
#     accumulation-requirement reasoning MUST be applied to ALL other ACs in the same spec
#     that use any injection or single-window H₁ pattern. The question "does this fixture
#     accumulate enough signal to demonstrate the AC's stated intent?" must be asked
#     exhaustively for every empirical e-process AC, not just the first one that surfaces
#     the analysis. Catching and fixing AC-8 without propagating to AC-12/AC-13 is an
#     incomplete grilling pass. Detected tessera R07 MAJOR-1: AC-8 correctly revised (10→30
#     windows) but AC-12/AC-13 left at single-window injection → 0/30 fires on both H₁ scenarios.
#
#   OBSERVED-binding scope (R07 MAJOR-2): OBSERVED-binding disposition (AC binds the OBSERVED
#     value from running production) is scoped to PRNG-drift-class prediction errors (OBSERVED
#     and PREDICTED differ by a small integer within natural PRNG variation). It must NOT be
#     applied when OBSERVED and PREDICTED diverge by an order of magnitude (e.g., predicted
#     20-30 fires, observed 0), because at that scale it produces a structurally self-confirming
#     test: a future implementation FIX matching the prediction FAILS; a future bug preserving
#     the wrong value PASSES. Before applying OBSERVED-binding, the pre-emit grilling must ask:
#     "would a future implementation FIX that matched the architect's prediction FAIL this
#     test?" If yes: redesign the fixture to accumulate sufficient signal, or explicitly
#     scope-document the limitation. Do not delegate this check to the Reviewer's right-reasons
#     audit — catch it at the spec layer before routing to Implementer. Detected tessera R07 MAJOR-2.
#
#   Inherited-testimony verification (R08 MAJOR-2): When a load-bearing spec premise is
#     inherited from a prior Reviewer's or Architect's claim (e.g., "R07 Reviewer MINOR-3
#     stated MCD produces zero contamination flags on the clean alternating-pattern fixture"),
#     independently verify the premise by running the relevant fixture or command against
#     production code before emitting the spec. "Inherited from prior testimony" is not
#     verification. A wrong premise at the spec layer forces the Implementer into a
#     halt-decision that could have been pre-empted at the spec layer — if the spec had been
#     correct, no halt would have been needed. Add an "empirical premise verification" step
#     to pre-emit grilling: for each load-bearing factual claim about production behavior that
#     derives from prior round testimony (not your own direct code-read or command-run),
#     record the specific command run and the observed output before marking the assumption
#     "PASS." "Verified by own observation" and "inherited from prior testimony" are not
#     equivalent grilling verdicts. Detected tessera R08 MAJOR-2.

# REINFORCED 2026-05-17 — When a spec delta modifies an existing file that carries a file-level
#   docblock (module header, file-level JSDoc, or equivalent), the pre-emit grilling must include
#   a "file-level documentation coverage check": (a) read the existing file-level docblock;
#   (b) verify it still accurately describes the file's full exported surface and semantic
#   responsibility after the proposed delta; (c) if the delta adds a new exported symbol or
#   changes the module's scope, the spec must include a docblock update prescription in the delta.
#   Silence on docblock updates is a spec gap (Architect-attributable), not an Implementer
#   tactical choice — the Implementer will faithfully follow the prescribed delta and leave the
#   header unchanged. Gate placement: add this as a checkpoint in the "Implementer can act without
#   guessing" grilling step, evaluated per modified file. Detected tessera R10 MINOR-1:
#   runtime.ts SLICE 2b3 header persisted after SLICE 2b4 emission was added via Delta 2; spec
#   prescribed three sub-changes but no docblock update; Reviewer caught at runtime.ts:1-13.
# REINFORCED 2026-05-17 — When a REVIEWER-ANCHOR table row or Mechanism primitive cites a
#   specific line range (e.g., `:43`, `:297-334`, `:329`) for a type or field declaration,
#   extract those exact lines from the file using `sed -n 'N,Mp' <path>` at spec-emit time and
#   paste them verbatim into the row or snippet. Do NOT reconstruct the cited content from memory
#   or from reading surrounding context — a JSDoc paragraph at lines 43-44 is indistinguishable
#   from a field declaration at line 47 when recalled from memory; only extracting those specific
#   lines reveals the distinction. This check is distinct from "opened the file" (R02 reinforcement)
#   and "verified the re-export chain" (R03 reinforcement): it applies after the file is open, at
#   the specific sub-line being cited. Gate: for each REVIEWER-ANCHOR row containing a specific
#   line-number reference, run `sed -n 'N,Mp' <file>` and verify the output matches the snippet
#   in the table. Also verify the cited TYPE NAME is the exact identifier at that location (not a
#   sibling type from the same file). Detected R11: OBS-1 (`M_t` cited at line 43, actual line 47;
#   JSDoc occupies lines 43-44); OBS-2 (Mechanism primitive 7 cites `BettingEProcessState` +
#   `engine/detectors/family-c-betting-e-process.ts:329 field fired: boolean` — actual type name is
#   `FamilyCBettingEProcessState`, actual declaration file is `engine/types/families/c.ts:329`,
#   actual content at the detector line 329 is an object-literal assignment).
# REINFORCED 2026-05-17 — When citing a named statistical bound or confidence interval in spec
#   Mechanism primitives or evidence-matrix sections (e.g., "Wilson upper bound", "Wald interval",
#   "Hoeffding bound", "Bernstein bound", "Clopper-Pearson interval"), add an explicit
#   statistical-term-to-formula cross-check step to pre-emit grilling: verify the formula written
#   matches the named procedure, not just that the formula is a valid bound. The Wald 3σ
#   normal-approximation (p ± 3·√(p(1−p)/n)) and the Wilson score interval
#   ((p + z²/2n ± z·√(p(1−p)/n + z²/4n²)) / (1 + z²/n)) produce materially different formulas;
#   using one's name for the other's formula creates documentation drift that statistically-literate
#   readers must audit. Gate: for any spec section that writes a named statistical formula, verify
#   the formula by looking it up in a reference source OR by deriving the name from the formula.
#   "The formula is a valid bound" is not sufficient — the NAME must also match. Detected R13
#   MINOR-1: spec Mechanism primitive 10 and test/q13-e-bh-fdr.test.ts:58-59 name the Wald 3σ
#   formula "Wilson upper bound"; caught by Reviewer; terminology inherited unchallenged from
#   R11+R12 PR-F1/PR-F2 vocabulary.
# REINFORCED 2026-05-17 — When specifying an anti-scope git-diff baseline for an AC (e.g.,
#   `git diff <SHA>..HEAD --name-only`), use the SHA of the last commit immediately before
#   the current round's work began, NOT the prior round's attestation HEAD. Memorial-Updater
#   commits and operator-prep commits may land between the prior attestation HEAD and the first
#   Implementer commit; those paths inflate the diff beyond the allowed-set and create false
#   anti-scope violations. Gate at spec-emit: run `git log --oneline <prior-attestation>..HEAD`
#   and verify every commit in that window belongs to the current round; if not, advance the
#   baseline to the post-prep commit. Additionally: if the spec's halt conditions mandate creation
#   of a specific file type (e.g., `coordination/diagnostics/DIAGNOSTIC-RNN-*.md`), that path
#   MUST appear in the anti-scope AC's allowed-set, OR the halt condition must not mandate a
#   separate file. An allowed-set that omits a file the spec itself mandates is a spec-internal
#   contradiction the Implementer cannot resolve without a judgement call. Detected tessera R15
#   MINOR-1: baseline `c8da715` did not account for R14 Memorial-Updater commit `3a1b7d0` and
#   operator-prep commit `67b7b0a`; DIAGNOSTIC mandated by § 6(a) but absent from AC-20 allowed-set.
# REINFORCED 2026-05-17 — When a spec contains prescriptions that trigger on the same condition
#   (e.g., "if ≥1 MD-violation then AC-8 says HALT" AND "if ≥1 MD-violation then § 6(a) says
#   proceed-with-DIAGNOSTIC"), resolve the contradiction before routing to Implementer. Gate at
#   pre-emit grilling: scan every (halt-condition trigger, AC consequence) pair and verify no
#   two prescriptions prescribe conflicting actions for the same trigger state. Fix: pick ONE
#   rule (HALT → STATUS: ESCALATE, OR proceed-with-DIAGNOSTIC only) and apply it consistently
#   in both the AC text and the halt-condition body — they must agree. An Implementer forced to
#   choose the "more permissive" or "more defensible" reading is encountering a spec defect;
#   any downstream consequence of the forced choice is Architect-attributable. Detected tessera
#   R15 MINOR-3: AC-8 prescribed HALT when ≥1 Memorial-D violation derived; § 6(a) parenthetical
#   prescribed proceed-with-DIAGNOSTIC for the same trigger; Implementer chose the parenthetical;
#   spec-internal contradiction caught by Reviewer as MINOR-3.
# REINFORCED 2026-05-17 — For every planned delta to a vendored file, enumerate ALL existing
#   tests that open or read that file and trace each test's FULL assertion surface against the
#   planned delta. A first-line SHA-pin check (e.g., q01-vendoring-coverage) and a full-body
#   byte-identity check modulo N header lines (e.g., q01-no-at-pin-deltas) are DISTINCT
#   assertion surfaces on the same file; failure-mode analysis that considers only one misses
#   the other. Pre-empt by: (1) greping for every test file that imports or readFileSync the
#   modified vendored file; (2) reading what each such test asserts about the file's content;
#   (3) if any test performs a body-level comparison (not just first-line), pre-disposition the
#   manifest row (vendored-at-pin → vendored-with-deltas) and the AT_PIN_FILES list in the spec
#   BEFORE routing — do not leave this as an ESCALATE condition for the Implementer to discover
#   at GREEN. Detected tessera R18 OBS-2: Architect failure-mode 5 identified q01-vendoring-
#   coverage but missed q01-no-at-pin-deltas; ESCALATE cycle with operator disposition required.
# REINFORCED 2026-05-17 — When spec § 5 (AC-table section) contains a preamble paragraph that
#   classifies specific ACs by attestation type (e.g., "AC-R20-12 ... is a binding-command
#   attestation reported by the Implementer at GREEN"), add an explicit grilling step: for each
#   named AC in the classification, verify the claim against the matching § 4.x implementation
#   prescription. An AC classified as a "binding-command attestation" in § 5 but prescribed as
#   a committed runtime test in § 4.7 (forward-protection pattern) is a spec-internal
#   contradiction that the 16-token cross-section consistency pass does not catch — it targets
#   identifier/format tokens, not narrative-classification-vs-structural-prescription mismatches
#   at section boundaries. Add to grilling: "for each § 5 preamble attestation-type claim, open
#   the matching § 4.x prescription and verify the classification matches." Detected R20 MINOR-1.
# REINFORCED 2026-05-17 — Spec files (Q-RNN-SPEC.md, Q-RNN-SPEC-AUDIT.md) must be committed
#   BEFORE the Implementer's chore-A commit. The Architect's NEXT-ROLE.md routing block triggers
#   chore-A; if spec artifacts are uncommitted at that point, they fall outside the chore-A SHA
#   boundary and appear as untracked files in the Reviewer's anti-scope check. Correct order:
#   write spec → commit spec artifacts → write NEXT-ROLE.md routing block. Add as Architect
#   pre-emit grilling step: "confirm all spec artifacts (Q-RNN-SPEC.md, Q-RNN-SPEC-AUDIT.md)
#   are committed before writing NEXT-ROLE.md." Detected tessera R21 MINOR-1.
# REINFORCED 2026-05-18 — When spec § Commit-inventory (§ 2.7) or § Anti-scope-allowed-set
#   (§ 3) lists compiled artifact paths (e.g., `.js` outputs from `tsc`), verify against
#   `.gitignore` and `git ls-files` before routing. A `.gitignore: *.js` rule makes these
#   paths structurally unreachable from `git diff --name-only`; listing them inflates the
#   allowed-set with phantom entries that can never appear in any diff. Add to § 9.7
#   empirical-premise-verification: "are all listed artifact paths git-trackable per
#   .gitignore?" (Run: `git ls-files <path>` — if no output, the path is gitignored.)
#   R23's 13-entry allowed-set contained 4 `.js` paths that returned nothing from
#   `git ls-files`; AC-R23-15 passed only because it asserts membership (not set-equality).
#   Detected tessera R23 MINOR-2.
# REINFORCED 2026-05-17 — When spec § 1 enumerates failure modes for a function, every named
#   failure mode must be independently exercised by at least one AC scenario. A failure mode
#   enumerated in the spec but absent from the AC table leaves the guard implementing it
#   structurally unbound — removing it would not affect any test outcome. Add a branch-binding
#   coverage pass to § 5 grilling: "for each failure mode in § 1, identify the AC row that
#   exercises it; if no row exercises it, add one." Detected tessera R21 MINOR-2 (dedup-by-
#   group_id guard at verdict-consumer.ts:87-94) and MINOR-3 (empty-string short-circuit at
#   verdict-consumer.ts:77-79). Both guards were spec-prescribed; neither had a regression test.
# REINFORCED 2026-05-18 — In multi-cluster worktrees where the environment may differ from the
#   reference worktree (e.g., no `../deploysignal` sibling), `git log --oneline -- test/`
#   confirms no new test files since a reference round but cannot confirm pass/fail status.
#   Run `node --test` (or the project's equivalent binding command) at Architect session start
#   to empirically verify baseline pass count before encoding it in spec § 9.1 claims and AC
#   rows. A spec clause "Baseline test count = N / fail=0" that inherits a reference-round
#   attestation without a fresh cluster-worktree run encodes a potentially stale claim; in
#   multi-cluster environments this is a near-certain failure (sibling-repo-dependent tests
#   will fail). Add to § 9.7 empirical-premise-verification: "for each count AC with a
#   pass/fail assertion, run `node --test` in this worktree and record observed counts."
#   Detected tessera R25 MINOR-1 (root cause of MAJOR-1: AC-R25-14 `fail=0` unachievable).
# REINFORCED 2026-05-18 — After any operator ESCALATE disposition that resolves a spec-internal
#   contradiction (e.g., "§ 1.8 tolerance 0.001 is authoritative; § 4.3/§ 5.1 tolerance 1e-9
#   is superseded"), the Architect must amend all non-authoritative sections to match the
#   dispositioned value before or at round close. Leaving contradicting prescriptions at HEAD
#   (e.g., § 4.3 and § 5.1 still prescribing 1e-9 after Option A was selected) creates a
#   forward-contamination trap: future readers encounter the original contradiction and either
#   (a) propagate the wrong value or (b) re-derive the disposition from commit messages.
#   Right procedure: after operator ESCALATE disposition, Architect (or Implementer under
#   Architect direction) amends non-authoritative spec sections + adds a § 9.x note referencing
#   the DIAGNOSTIC + disposition commit SHA. Detected tessera R25 MAJOR-3 (§ 4.3:752 and
#   § 5.1 AC-R25-12 row still prescribe 1e-9 at HEAD).
# REINFORCED 2026-05-18 — When spec § 9.x grilling sweep notes "pattern also matches
#   comments / JSDoc" for an AC that guards a critical invariant, the grilling must complete
#   a discriminability check — not merely note the ambiguity. Specifically: ask "would the
#   assertion still PASS if only the comment/JSDoc occurrence is present and the
#   type-declaration occurrence is removed?" If yes, the assertion is non-discriminating and
#   must be strengthened (regex with line anchoring, specific line-range read, etc.) before
#   the spec is emitted. A note that says "intentional, since the literal is in the type
#   declaration body" without validating that the assertion CAN distinguish the two
#   occurrences is an incomplete grilling gate. Detected tessera R30 MINOR-1 (spec § 9.2 R03
#   sweep noted comment-match for AC-R30-15 and characterized it as intentional but did not
#   compute that `verdict.includes(...)` would pass even with engine/types/verdict.ts:289
#   removed while :272 JSDoc is preserved; Reviewer cold-caught this).
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
