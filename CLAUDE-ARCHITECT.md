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

# REINFORCED — EMPIRICAL-PREMISE-VERIFICATION (composite; 28 sub-variants observed at Tessera)
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
#
#   Future-state git-simulation verification (R62 CRITICAL-1 / MAJOR-2): When a spec includes
#     a two-state AC (chore-A failing / chore-B passing) whose chore-B PASS condition is a
#     git-diff emptiness assertion (`git diff CHORE_A_SHA..HEAD --name-only === []`), the
#     Architect MUST explicitly simulate the chore-B commit's actual diff AT SPEC-EMIT TIME:
#     walk through every file the chore-B commit will touch and ask "is that file inside the
#     diff window?". If chore-B's payload IS a modification of the test file containing the
#     diff assertion (e.g., SHA-placeholder injection), then the test file appears inside
#     `git diff CHORE_A_SHA..HEAD`, making the `=== []` assertion structurally unreachable
#     at any committed HEAD post-chore-B. Catching this at spec-emit time (vs at Reviewer
#     time) prevents an avoidable ESCALATE cycle. The audit-emit-time correction caught the
#     chore-A 4-fail arithmetic; the same scrutiny applied to the chore-B simulation would
#     have caught the chore-B structural impossibility in the same pass. Distinct from
#     R53 MINOR-1 (chore-A vs chore-B count distinction): that reinforcement ensures the
#     Architect names the SHA boundary; this sub-variant ensures the chore-B PASS state is
#     structurally reachable before the spec encodes it as a prediction. Detected tessera
#     R62 CRITICAL-1 / MAJOR-2 / MAJOR-3 (Reviewer CRITICAL-1; Operator Option 1 resolved
#     by dropping the structurally-vacuous AC).
#
#   Pre-authored narrative text verification (R71 MAJOR-1 + MAJOR-2): When spec § 4.x prescribes
#     prose strings that the Implementer copies verbatim into production artifacts (e.g., reasoning
#     strings, description fields, dashboard panel text), and those strings assert a specific
#     empirical property of the engine under the prescribed parameters (e.g., "too small to fire
#     alone," "surfaces ONE candidate"), the Architect MUST verify those claims before routing —
#     either (a) by running the engine with the prescribed seed and drift and checking the terminal
#     state empirically (for claims about whether/when shards fire), OR (b) by tracing the data
#     flow from the prescribed opts configuration through the engine's aggregation logic to verify
#     the claimed count (for claims like "ONE candidate" when candidate_node_kinds determines how
#     many nodes are eligible). A narrative string asserting an empirical property IS a P3
#     commitment even if it is not expressed as an AC — the § 9 commitment audit MUST treat
#     pre-authored narrative text as a load-bearing claim and verify it against the engine at
#     spec-emit time. Procedure: for each pre-authored narrative string in § 4.x, extract every
#     empirical claim ("fires before window N," "N candidates surface," "wealth stays below
#     threshold") and ask: "can I verify this by running the engine or tracing data flow right
#     now?" If yes and you haven't, run it. If the claim does not hold, revise either the narrative
#     or the prescribed parameters before routing. Detected tessera R71 MAJOR-1 (hierarchical-
#     evalue HIER_DRIFT=0.20 under seed 0x71F1E causes all 5 shards to fire individually by w=30;
#     reasoning text "too small to fire alone" empirically false) + MAJOR-2 (candidate_node_kinds
#     = ['cooling_zone', 'rack', 'psu'] causes engine to emit 3 candidates; reasoning text "ONE
#     cooling-zone-level candidate" empirically false).
#
#   Consumer-side enum value-space cite-then-verify (R72 MAJOR-1 + MAJOR-3): When spec § 2.x
#     prescribes a hard-coded literal set (e.g., TYPE3_EVENT_CLASSES = ['deploy', 'rollback',
#     ...]) that will be assigned to a TypeScript field typed as a closed-set string-union (e.g.,
#     DeployEventPayload['event_class']), the Architect MUST verify each prescribed literal appears
#     verbatim in the union's actual value set via direct read of the type declaration file — not
#     only verifying the function signatures that accept the type. R11 cite-then-verify applies to
#     ALL spec-prescribed literals that cross engine-type boundaries. Procedure: for each spec
#     § 2.x variation-grid constant, identify the engine type it must satisfy; open the type
#     declaration file; read the actual union/enum values; verify every spec-prescribed literal
#     appears verbatim. Pre-emit grilling gate: "are there spec-prescribed string literals I have
#     not verified against a closed-set engine type?" If yes, perform verification before routing.
#     Detected tessera R72 MAJOR-1 (spec § 2.1 TYPE3_EVENT_CLASSES = ['firmware_push', 'deploy',
#     'config_change', 'rollback']; engine closed-set per event-contract.ts:33-38 = 'firmware_push'
#     | 'model_redeploy' | 'env_change' | 'config_change' | 'capacity_change'; 'deploy' and
#     'rollback' absent; forced chore-A typecheck failure; resolved via Option B retroactive
#     DIAGNOSTIC). 3rd Architect-side instance; Rule 5 cross-project threshold crossed.
#
#   Self-verification-matrix coverage-claim without branch walk (R73 MINOR-1): When spec §7
#     (cross-project rule dispositions) includes a coverage-claim sentence of the form "Every
#     branch in <file> has an AC: rule 1→AC-N/P, rule 2→AC-Q/R, ...", the Architect MUST walk
#     EVERY branch individually before writing that sentence — not only the branches for which
#     positive-binding ACs exist. At R73, § 7 Rule 2 disposition stated "Every branch in
#     scripts/tier-router.ts has an AC: rules 1-4 → AC-R73-4/5/6/7 (rule fires for matching
#     fixture)." Reviewer walkthrough refuted this: rule 3 (implementer-only) has NO corpus
#     fixture triggering it positively (no fixture has mechanical/cosmetic/typo keyword + ≤3
#     ALLOWED paths + no risky surface); rule 4 (audit) fires on R49/R50/R51 but AC-R73-5
#     only asserts `tier !== 'implementer-only'`, leaving a regression routing R49 to 'full'
#     undetected. The §7 disposition claimed coverage that an AC-walkthrough would have refuted.
#     Procedure: before writing any "every branch has an AC" assertion in §7, enumerate each
#     branch individually with its AC ID and the specific assertion that would FAIL if that
#     branch were deleted or mutated. If any branch has no such AC, either add the AC or record
#     the gap in spec §5.3 (acknowledged gaps) with explicit rationale. Do NOT substitute
#     "≠ implementer-only" as a positive binding for a rule that routes to 'audit'. Detected
#     tessera R73 MINOR-1 (Reviewer-1); safety contract still held (fail-safe direction).
#
#   Incomplete alternation enumeration in "no-match" claim (R74 MINOR-1): When spec § 9.1
#     (or any pre-emit grilling table) claims "Class X fires: no (no '<pattern>' etc.)" for
#     a regex class that has MULTIPLE alternations, EVERY alternation must be individually
#     verified — not elided via "etc." The R74 Q.6 table enumerated only /cross-project
#     promotion/ for Class A and concluded "Class A: no" via shorthand "etc."; it missed
#     /cross-project canonical/i which matched the directive's Rule 4 disposition row at
#     NEXT-ROLE.md:305 ("cross-project canonical at R72"). Architect's § 10 prediction of
#     haiku for AC-R74-31 was empirically refuted at chore-A. Discriminability discipline:
#     for each regex alternation in a multi-pattern class (Class A has 5 patterns; Class B
#     has 5; Classes C and D are co-occurrence), test each one individually. Record "NO:
#     /pattern1/ — null, /pattern2/ — null, /pattern3/ — null, ..." per alternation; a
#     trailing "etc." is not a pass. Detected tessera R74 MINOR-1 (Reviewer-1).
#
#   AC regex must be self-consistent with spec pseudocode (R74 MINOR-5): When a spec § 5.x
#     AC prescribes a regex that tests for a pattern in a script's file text (e.g., AC-R74-16
#     /scripts\/mu-model-select\.js[\s\S]{0,400}--directive/), apply the Rule 3 self-application
#     gate: "would the spec's own § 2.x pseudocode pass this AC if implemented verbatim?" At R74,
#     the spec § 2.5 (c) pseudocode placed --directive first in an array (mu_select_args=("--directive"
#     ...) then ${mu_select_args[@]}), which would have placed --directive BEFORE the script path in
#     run-pipeline.sh — failing the AC's directional regex. The Implementer was forced to inline the
#     args (placing the script path first, then --directive) to satisfy the AC. The inline
#     substitution used ${MU_SONNET:+--mu-sonnet} which was semantically non-equivalent to the
#     spec's $MU_SONNET && ... form. Procedure: for each AC that asserts a regex pattern over a
#     script's source text, paste the spec's own pseudocode pattern into the regex and verify it
#     produces a match — before routing to Implementer. If it doesn't, either revise the regex to
#     match the pseudocode's actual output form, or revise the pseudocode to produce the regex's
#     expected form. Do NOT leave the Implementer to discover the mismatch as a forced deviation.
#     Detected tessera R74 MINOR-5 (Reviewer-1); proximate cause of CRITICAL-1.
#
#   Spec-acknowledged gap must pair with minimum mitigation, not just Reviewer-reliance (R74 MINOR-2):
#     When spec § 5.3 "Acknowledged AC gaps" documents an absence of verification coverage for a
#     load-bearing integration path (e.g., "End-to-end pipeline-dispatch AC absent"), the
#     acknowledgment MUST pair with a minimum mitigation specification — either (a) a concrete plan
#     for how the Reviewer verifies the uncovered path (e.g., "Reviewer must manually simulate the
#     bash expansion for both MU_SONNET=true and MU_SONNET=false"), or (b) a recommendation to add
#     a minimal end-to-end AC that can be implemented without the problematic dependency. Writing
#     only "Rule 3 self-application gate verified: the Reviewer is in a position to catch this gap"
#     accepts the gap as a permanent waiver. At R74, CRITICAL-1 (${MU_SONNET:+--mu-sonnet} always
#     expands) landed in exactly the acknowledged gap — the Reviewer DID catch it, confirming the
#     framing was structurally valid, but the gap-as-permanent-waiver pattern allows structural bugs
#     to accumulate across rounds without incentivizing closure. Pre-emit gate: for each § 5.3 entry,
#     specify the verification method the Reviewer will use to compensate, OR add a minimal AC.
#     Detected tessera R74 MINOR-2 (Reviewer-1; AC-R74-32 added post-fix to close the gap).
#
#   Pre-routing empirical validation gate — EMPIRICAL.sh probe-run AND visualization sanity
#     check (R77 OBS-4 + MINOR-2; 3rd Tessera EMPIRICAL.sh instance): Before routing to
#     Implementer, the Architect MUST execute two empirical validations:
#     (1) Run the spec-authored EMPIRICAL.sh against round-start HEAD: `bash Q-RNN-EMPIRICAL.sh`.
#         All blocks must pass for reasons OTHER than the pre-documented carry-forward baseline.
#         Common failure: a block uses `grep -E '^# pass '` (TAP format) but the invoked command
#         omits `--test-reporter=tap`; the grep returns empty and the block unconditionally fails
#         at chore-A. If ANY block fails at spec-emit time, fix BEFORE routing.
#     (2) Verify each prescribed visualization (ASCII curve, heat-map slice) produces
#         DISCRIMINATING output at the prescribed parameter slice. If the prescribed window_count
#         causes ALL cells to saturate (e.g., every cell = 5/5 at window_count=200), the curve
#         is entirely flat and conveys zero operator-visible information. The interesting boundary
#         lives at shorter windows; the prescription must name a window in the dynamic range
#         (≥50% of cells neither 0/5 nor 5/5). Procedure: mentally or empirically enumerate
#         representative cells at the prescribed slice and check for uniformity.
#     3rd Tessera EMPIRICAL.sh instance: R47 (self-recursive verifier), R72 (.gitignore
#     semantics), R77 (reporter-format mismatch). Cross-project reinforcement rule derived.
#     Detected tessera R77 OBS-4 (EMPIRICAL.sh Block 2 unconditionally failed at chore-A) +
#     MINOR-2 (ASCII curves at window_count=200 = 14×2×3 = 84 saturated cells, all #####).
#
#   Discriminating AC threshold must pad predicted value by ≥1 trial from prediction
#     (R77 MINOR-4; R71 MINOR-1 recurrence): When spec § 9 pre-predicts a detection rate for
#     a named Monte Carlo cell AND that prediction has significant uncertainty (5-trial PRNG
#     granularity = 20% steps), the AC threshold MUST be padded by at least one trial count
#     (20%) in the permissive direction from the pre-predicted value. If the Architect
#     pre-predicts ~0.0 ("essentially never detects") but the actual empirical value is 0.6
#     (3/5), an AC threshold of ≤0.6 passes with zero margin — any PRNG-path change (seed
#     formula, loop iteration order, LCG draw consumption order) flips the AC without any
#     engine change. Padding rules: predicted ≈ 0% → threshold ≤ 0.4 (not ≤ 0.6); predicted
#     ≈ 80% → threshold ≥ 0.6 (not ≥ 0.8); predicted ≈ 100% → threshold ≥ 0.8. Gate: at
#     spec § 9 grilling, for each named-cell AC, ask "what is the 1-trial-pad of my
#     pre-prediction?" and verify the AC threshold is no closer to the empirical boundary than
#     that. Detected tessera R77 MINOR-4 (AC-R77-9 at (mag=0.05, win=30, α=0.005, family-a):
#     predicted ~0.0, actual 3/5=0.60, threshold ≤0.60, zero-margin pass; first PRNG-path
#     change would flip without engine regression).
#
#   Spec-prescribed document-mutation instruction must verify target document state (R81 MAJOR-3):
#     When a spec prescribes an additive action on an existing human-readable document (e.g.,
#     "append a '## Quick demo' section to README.md"), the Architect MUST read that document's
#     current state at spec-emit time to check for structural collisions — specifically, whether
#     a section with that exact heading already exists. Prescribing "append after any existing
#     section" without verifying the target document produces a duplicate-heading defect when the
#     document already carries the same section name at a different location. Procedure: for any
#     spec § 2.x prescription that adds a named heading to an existing document, grep the document
#     for the exact heading string before finalizing the prescription: `grep -n "^## Quick demo"
#     README.md`. If an existing section is found, the spec must prescribe an EXTEND or MERGE
#     action (not a blind append), or flag the structural collision as a halt condition. Gate at
#     spec § 9.4 ("Implementer can act without guessing"): could the Implementer follow this
#     instruction verbatim without creating a document defect? If the target document's existing
#     structure could produce a defect, name it and resolve it in the spec. Detected tessera R81
#     MAJOR-3 (Reviewer; README.md already had `## Quick demo` at line 73; spec § 2.7 "append
#     after existing section" created duplicate heading at line 194; Implementer followed spec
#     verbatim without halting on the collision).
#
#   AC structural-boundary verification for sectioned documents (R81 MINOR-2): When an AC
#     prescribes that a structured document (with sections separated by `## ` headings) contains
#     specific content, the AC's regex must bind that content to the INTENDED section, not match
#     globally across the document. A global-presence match (`README.md matches /scrubber/i`)
#     passes vacuously when the scrubber text lives in a DIFFERENT same-named section than the one
#     the spec prescribes. Procedure: for each AC that checks README.md or any markdown file with
#     multiple `## ` headings, the regex must (a) locate the intended section by its exact heading,
#     and (b) assert the required content appears within that section's body (before the next `## `
#     heading). Pattern: extract the section with a bounded regex like
#     `/^## Quick demo\n([\s\S]*?)(?=\n## |\z)/m` and assert the target pattern appears in the
#     captured body. Gate at spec § 9.6 self-application: "if this document had two same-named
#     sections, would the AC correctly FAIL when the target content appears only in the wrong one?"
#     If no, the AC is too loose. Detected tessera R81 MINOR-2 (Architect; AC-R81-7 used three
#     global matches; passed vacuously across duplicate `## Quick demo` headings).
#
#   Prose-claim-about-post-edit-state (R87 MAJOR-1): When spec § 3.x prescribes a delta
#     (remove lines, add lines, modify text) AND § 3.y states the behavioral consequence as prose
#     ("After this edit, X will not occur because Y was removed"), the Architect MUST verify the
#     prose claim by applying the delta and reading the full post-edit content. Enumerate
#     exhaustively: where could the pattern you're claiming is "gone" actually appear? Spec prose
#     must not be an enumeration of EXPECTED locations; it must be grounded in ACTUAL post-edit
#     content. Procedure: when documenting a delta's behavioral consequence, mentally or locally
#     apply the delta, open the file, and search the entire post-edit content for any occurrence
#     of the pattern the spec claims is absent. If the pattern can appear in comment/assertion text
#     (error messages, debug strings, error templates), search for it there too. For grep-based
#     consequences, RUN the grep against the post-edit content at spec-emit time. For prose
#     enumerations ("all call sites are here, here, and here"), walk the file to verify no other
#     call sites exist. Detected tessera R87 MAJOR-1 (Architect prescribed Edit 3 removal of a
#     self-exclusion line, documented post-edit consequence as "AC-R36-3 pattern won't match
#     because remaining execFileSync references are only in AC-R36-11/12 string literals"; missed
#     execFileSync string in AC-R36-3's own assertion error message; empirically false at chore-A;
#     HALT condition 6 / Implementer DIAGNOSTIC; Reviewer caught as claim-without-empirical-walk
#     MAJOR-1).
#
#   Pre-emit grilling must include a cross-spec-section consistency
#     pass before routing to Implementer. For every resolved decision (Q-N section) that names
#     a module model, type structure, naming convention, or deferral policy, verify that ALL
#     subsequent spec sections (§Mechanism, §Implementation surface pseudocode, §Tests pseudocode,
#     Acceptance criteria) use a consistent surface. Contradictions between resolved decisions and
#     spec pseudocode (e.g., Q1.1 "vendor tsconfig at-pin" → CJS contradicting §Implementation
#     surface ESM/Bundler; "defer typedef extraction" in §Mechanism contradicting §Tests pseudocode
#     importing named typedefs; `confidence` in §Mechanism contradicting `cell_confidence` in §Tests)
#     are each an independent HALT condition (c) for the Implementer — they cannot be resolved without
#     an architectural decision. The cross-section pass runs after all spec sections are written: for
#     each Q-N pick, grep the remaining spec sections for any use of the alternative surface or a
#     contradicting name. Detected R01: 3 uncaught contradictions produced REVIEWER MAJOR-5, MINOR-1,
#     MINOR-2 and 2 additional silent Implementer absorptions.
#
#   When spec pseudocode instantiates a named external type (e.g.,
#     `key: CellKey`, `confidence: CellConfidence`, `const r: PerShardResidual = {...}`), open
#     the source file where that type is DECLARED — not merely the file where it is used or
#     re-exported — and read its exact definition before writing the pseudocode. "The type appears
#     in config.ts" is not a substitute for opening the declaration-site file (e.g., primitives.ts).
#     If the actual shape diverges from the spec's prediction, update pseudocode to reflect reality
#     AND update any conditional directives that depend on the prediction. Add a "type-declaration-
#     site check" to pre-emit grilling: for each named type instantiated in pseudocode, grep for
#     its declaration site, open that file, record the actual definition. Detected R02: CellKey
#     predicted as `Record<CellDimension, …>`; actual shape `Record<string, …>` at primitives.ts:44
#     (not opened during spec authoring); cascaded to IMPLEMENTER retaining unnecessary `as any`
#     cast because pseudocode showed it (REVIEWER MINOR-3 + OBS-3).
#
#   When specifying file deletion commands, verify whether each named
#     file is git-tracked before prescribing `git rm`. Check with `git ls-files <path>` (empty
#     output means untracked). If track-state is uncertain, prescribe "git rm if tracked; rm -f
#     if gitignored." Prescribing `git rm` for an untracked file causes the command to fail,
#     forcing the Implementer to adapt — which may consume bounded budget or require judgment
#     calls the spec should have pre-empted. Detected R02: ville-preservation .test.js was
#     gitignored; spec prescribed `git rm` for both .ts and .js companions; Implementer correctly
#     adapted but spec prescription was over-broad (REVIEWER OBS-2).
#
#   When spec Integration points section describes how module A makes
#     type T available to module B, verify BOTH (a) T's shape at its declaration site AND (b)
#     whether A actually re-exports T at its public surface (run `grep -n "export.*T\|export.*from"
#     engine/types/A.ts`). A plain `import type { T }` in A.ts is NOT a re-export. Verifying the
#     type shape at the declaration site (primitives.ts) does not confirm the re-export chain from
#     the consuming module (config.ts). Detected R03: spec Q-R03-SPEC.md:85 stated config.ts
#     "re-exports CellKey through its own import from ./primitives" — factually wrong (plain import,
#     no re-export); 2nd-cycle CellKey-class spec error despite primitives.ts:44 being opened
#     (REVIEWER MINOR-3).
#
#   When an AC prescribes a grep verification command to confirm absence
#     or presence of a string in source files (e.g., `grep -n "as any"`, `grep -n "@ts-expect-error"`),
#     the grep pattern must distinguish executable code from comment lines. Use `grep -nE "^[^/]*(pattern)"
#     file.ts` or equivalent. A pattern that matches in `//` comments produces a literal-AC-fails
#     outcome even when the implementation is correct. Add a "verification-command-soundness" step
#     to pre-emit grilling: for each grep-based AC evidence command, ask "does this grep match in
#     comments?" — if yes, tighten. Detected R03: AC-17/18/20 grep patterns matched in closure-
#     documentation comments written by the Implementer (REVIEWER MINOR-2).
#
#   When AC-N states per-file test counts (e.g., "q01-vendoring-coverage
#     4 / 0"), verify by running each named test file independently via `node --test <file.js>`
#     and recording the OBSERVED count — do not reconstruct from memory or copy from a prior spec.
#     If a prior Reviewer report states the counts (e.g., REVIEWER-REPORT-R02.md), use that as the
#     ground truth. Writing a count that has not been empirically observed is not verification; the
#     Reviewer will independently run the files and any discrepancy will surface as a MINOR. Detected
#     R03: AC-14 stated q01-vendoring-coverage = 4 (actual = 3); total 16 (actual = 15); REVIEWER-
#     REPORT-R02.md (read at spec time) contained 9/0 for those three files (REVIEWER MINOR-4).
#
#   When writing the Component inventory, the AC-range claim in each row
#     ("binds AC-N through AC-M + AC-19") MUST be cross-checked against (a) the per-file pseudocode
#     docstring comment and (b) the P3 ten-axis Coverage row before grilling sign-off. If any of the
#     three sites disagrees on the count, update the narrative before emitting. The cross-section
#     consistency pass (which checks resolved-decision tokens and naming conventions across spec
#     sections) is NOT a substitute for this explicit arithmetic cross-check. Detected R05: Component
#     inventory:80 said "AC-1 through AC-11" when per-file pseudocode (line 321) and P3 Coverage
#     (line 715) both said "AC-1 through AC-13." In-spec arithmetic drift caught only by Reviewer
#     cold-read (REVIEWER MINOR-1). 2nd tessera occurrence of narrative-vs-pseudocode count drift
#     (first: R03 MINOR-4).
#
#   When a delta prescription says "update the JSDoc at lines X–Y," the
#     grilling scope-audit MUST include `grep -n "<stale_text>" <file>` to find ALL instances of
#     that stale content in the file before finalizing the line-range. A delta that prescribes a
#     single-site JSDoc update without checking for secondary occurrences will leave stale text at
#     sibling sites (e.g., the in-interface comment block vs the standalone JSDoc block). Detected
#     R06: Delta 1 prescribed lines 207-213 only; secondary JSDoc at config.ts:228 still referenced
#     "(D1-D10)" after union extended to D1-D13 (REVIEWER MINOR-1).
#
#   When a public API surface declares multiple optional parameters in an
#     opts/options interface, the AC-coverage pass during grilling MUST enumerate ALL declared fields
#     and verify each has either (a) a binding AC or (b) an explicit documented rationale for
#     non-binding (e.g., "mcdSeed is a test-reproducibility knob; operational callers use the
#     default; no AC needed"). Omitting a sibling field from AC coverage without documentation is a
#     grilling gap. Detected R06: AC-12 bound opts.mcdAlpha; sibling opts.mcdSeed declared in same
#     interface had no binding AC and no documented rationale (REVIEWER MINOR-3).
#
#   When a REVIEWER-ANCHOR table row or Mechanism primitive cites a
#     specific line range (e.g., `:43`, `:297-334`, `:329`) for a type or field declaration,
#     extract those exact lines from the file using `sed -n 'N,Mp' <path>` at spec-emit time and
#     paste them verbatim into the row or snippet. Do NOT reconstruct the cited content from memory
#     or from reading surrounding context — a JSDoc paragraph at lines 43-44 is indistinguishable
#     from a field declaration at line 47 when recalled from memory; only extracting those specific
#     lines reveals the distinction. This check is distinct from "opened the file" (R02 reinforcement)
#     and "verified the re-export chain" (R03 reinforcement): it applies after the file is open, at
#     the specific sub-line being cited. Gate: for each REVIEWER-ANCHOR row containing a specific
#     line-number reference, run `sed -n 'N,Mp' <file>` and verify the output matches the snippet
#     in the table. Also verify the cited TYPE NAME is the exact identifier at that location (not a
#     sibling type from the same file). Detected R11: OBS-1 (`M_t` cited at line 43, actual line 47;
#     JSDoc occupies lines 43-44); OBS-2 (Mechanism primitive 7 cites `BettingEProcessState` +
#     `engine/detectors/family-c-betting-e-process.ts:329 field fired: boolean` — actual type name is
#     `FamilyCBettingEProcessState`, actual declaration file is `engine/types/families/c.ts:329`,
#     actual content at the detector line 329 is an object-literal assignment).
#
#   When citing a named statistical bound or confidence interval in spec
#     Mechanism primitives or evidence-matrix sections (e.g., "Wilson upper bound", "Wald interval",
#     "Hoeffding bound", "Bernstein bound", "Clopper-Pearson interval"), add an explicit
#     statistical-term-to-formula cross-check step to pre-emit grilling: verify the formula written
#     matches the named procedure, not just that the formula is a valid bound. The Wald 3σ
#     normal-approximation (p ± 3·√(p(1−p)/n)) and the Wilson score interval
#     ((p + z²/2n ± z·√(p(1−p)/n + z²/4n²)) / (1 + z²/n)) produce materially different formulas;
#     using one's name for the other's formula creates documentation drift that statistically-literate
#     readers must audit. Gate: for any spec section that writes a named statistical formula, verify
#     the formula by looking it up in a reference source OR by deriving the name from the formula.
#     "The formula is a valid bound" is not sufficient — the NAME must also match. Detected R13
#     MINOR-1: spec Mechanism primitive 10 and test/q13-e-bh-fdr.test.ts:58-59 name the Wald 3σ
#     formula "Wilson upper bound"; caught by Reviewer; terminology inherited unchallenged from
#     R11+R12 PR-F1/PR-F2 vocabulary.
#
#   In multi-cluster worktrees where the environment may differ from the
#     reference worktree (e.g., no `../deploysignal` sibling), `git log --oneline -- test/`
#     confirms no new test files since a reference round but cannot confirm pass/fail status.
#     Run `node --test` (or the project's equivalent binding command) at Architect session start
#     to empirically verify baseline pass count before encoding it in spec § 9.1 claims and AC
#     rows. A spec clause "Baseline test count = N / fail=0" that inherits a reference-round
#     attestation without a fresh cluster-worktree run encodes a potentially stale claim; in
#     multi-cluster environments this is a near-certain failure (sibling-repo-dependent tests
#     will fail). Add to § 9.7 empirical-premise-verification: "for each count AC with a
#     pass/fail assertion, run `node --test` in this worktree and record observed counts."
#     Detected tessera R25 MINOR-1 (root cause of MAJOR-1: AC-R25-14 `fail=0` unachievable).
#
#   Self-application gate must cover EMPIRICAL.sh shell-command patterns
#     (Tessera R85 MAJOR-2; composite fold of R75 self-application-gate series):
#     The § 8.17 Q.17 self-application gate walk is complete only when it covers ALL spec-triad
#     artifacts: (a) in-test regex patterns in `test/q*-*.test.ts` [already in Q.17]; AND (b) shell
#     command patterns in Q-RNN-EMPIRICAL.sh — awk range patterns, grep patterns, sed ranges, and
#     variable-assertion logic. Shell range-matching patterns (`awk '/start/,/end/'`) match BOTH the
#     start line and every subsequent line until (and including) a line matching the end pattern. If
#     start-pattern and end-pattern can both match the SAME line (e.g., `/^### Browser dashboard/`
#     and `/^### /` both match any `###`-prefixed heading), the range produces only the start line —
#     not the section body the block was intended to extract. Procedure: for each awk/sed range in
#     EMPIRICAL.sh, run the command against the prescribed implementation text verbatim at spec-emit;
#     verify the output is non-empty and contains the expected assertion target. If start and end
#     patterns can overlap on the same line, use flag-toggling awk (`/start/{flag=1;next} flag &&
#     /end/{exit} flag`) instead of a simple `/X/,/Y/` range. This sub-variant extends the R75
#     stdio-flush / bash-context / cross-module-import series: the self-application gate must walk
#     EACH type of executable prescription in the spec triad, not only in-test TypeScript patterns.
#     R85 MAJOR-2: `awk '/^### Browser dashboard/,/^### /'` in Block 3 produced one-line output;
#     Implementer HALT-1 at chore-A; Coordinator-direct fix required. 7th tessera instance of the
#     canonically-landed `architect-encoded-pattern-not-verified-against-prescribed-implementation`
#     Rule 1 sub-class (R62+R66+R68+R72+R83+R84+R85).
#
#   Empirical command verification must distinguish global vs. anchored patterns
#     in infrastructure files (Tessera R88 MAJOR-1; extension of architect-claim-without-empirical-walk):
#     When claiming that a codebase file (e.g., .gitignore) does or does not contain a pattern, the
#     Architect MUST run the actual tool that respects the pattern semantics (e.g., `git check-ignore`
#     for .gitignore matching, or `git ls-files` to verify file tracking). A partial check (e.g.,
#     `grep tools .gitignore`) that assumes the pattern is anchored or namespaced will miss global
#     patterns (e.g., `*.js` which matches all .js files, not just ones named "tools...js"). Procedure:
#     (1) identify the pattern language (glob, regex, sed, awk, shell glob); (2) run the COMMAND that
#     interprets that language correctly (git check-ignore for gitignore, not grep; git ls-files for
#     tracking status, not `test -f`); (3) record the OBSERVED output in § 9.7 empirical-premise row.
#     R88 MAJOR-1: Architect claimed ".gitignore does NOT exclude tools/*.js" and verified via
#     `grep tools .gitignore`; empirically false (global `*.js` pattern at line 8). The verification
#     method was structurally wrong — grep of "tools" does not capture global patterns. Correct method:
#     `git ls-files 'tools/*.js'` (empty output confirms exclusion) or `git check-ignore tools/foo.js`
#     (exit code confirms exclusion). 9th tessera instance of architect-claim-without-empirical-walk.


# REINFORCED — SPEC-PRESCRIPTION-DISCIPLINE (composite; 8 sub-variants)
#
#   When a spec delta modifies an existing file that carries a file-level
#     docblock (module header, file-level JSDoc, or equivalent), the pre-emit grilling must include
#     a "file-level documentation coverage check": (a) read the existing file-level docblock;
#     (b) verify it still accurately describes the file's full exported surface and semantic
#     responsibility after the proposed delta; (c) if the delta adds a new exported symbol or
#     changes the module's scope, the spec must include a docblock update prescription in the delta.
#     Silence on docblock updates is a spec gap (Architect-attributable), not an Implementer
#     tactical choice — the Implementer will faithfully follow the prescribed delta and leave the
#     header unchanged. Gate placement: add this as a checkpoint in the "Implementer can act without
#     guessing" grilling step, evaluated per modified file. Detected tessera R10 MINOR-1:
#     runtime.ts SLICE 2b3 header persisted after SLICE 2b4 emission was added via Delta 2; spec
#     prescribed three sub-changes but no docblock update; Reviewer caught at runtime.ts:1-13.
#
#   When specifying an anti-scope git-diff baseline for an AC (e.g.,
#     `git diff <SHA>..HEAD --name-only`), use the SHA of the last commit immediately before
#     the current round's work began, NOT the prior round's attestation HEAD. Memorial-Updater
#     commits and operator-prep commits may land between the prior attestation HEAD and the first
#     Implementer commit; those paths inflate the diff beyond the allowed-set and create false
#     anti-scope violations. Gate at spec-emit: run `git log --oneline <prior-attestation>..HEAD`
#     and verify every commit in that window belongs to the current round; if not, advance the
#     baseline to the post-prep commit. Additionally: if the spec's halt conditions mandate creation
#     of a specific file type (e.g., `coordination/diagnostics/DIAGNOSTIC-RNN-*.md`), that path
#     MUST appear in the anti-scope AC's allowed-set, OR the halt condition must not mandate a
#     separate file. An allowed-set that omits a file the spec itself mandates is a spec-internal
#     contradiction the Implementer cannot resolve without a judgement call. Detected tessera R15
#     MINOR-1: baseline `c8da715` did not account for R14 Memorial-Updater commit `3a1b7d0` and
#     operator-prep commit `67b7b0a`; DIAGNOSTIC mandated by § 6(a) but absent from AC-20 allowed-set.
#
#   For every planned delta to a vendored file, enumerate ALL existing
#     tests that open or read that file and trace each test's FULL assertion surface against the
#     planned delta. A first-line SHA-pin check (e.g., q01-vendoring-coverage) and a full-body
#     byte-identity check modulo N header lines (e.g., q01-no-at-pin-deltas) are DISTINCT
#     assertion surfaces on the same file; failure-mode analysis that considers only one misses
#     the other. Pre-empt by: (1) greping for every test file that imports or readFileSync the
#     modified vendored file; (2) reading what each such test asserts about the file's content;
#     (3) if any test performs a body-level comparison (not just first-line), pre-disposition the
#     manifest row (vendored-at-pin → vendored-with-deltas) and the AT_PIN_FILES list in the spec
#     BEFORE routing — do not leave this as an ESCALATE condition for the Implementer to discover
#     at GREEN. Detected tessera R18 OBS-2: Architect failure-mode 5 identified q01-vendoring-
#     coverage but missed q01-no-at-pin-deltas; ESCALATE cycle with operator disposition required.
#
#   When spec § 5 (AC-table section) contains a preamble paragraph that
#     classifies specific ACs by attestation type (e.g., "AC-R20-12 ... is a binding-command
#     attestation reported by the Implementer at GREEN"), add an explicit grilling step: for each
#     named AC in the classification, verify the claim against the matching § 4.x implementation
#     prescription. An AC classified as a "binding-command attestation" in § 5 but prescribed as
#     a committed runtime test in § 4.7 (forward-protection pattern) is a spec-internal
#     contradiction that the 16-token cross-section consistency pass does not catch — it targets
#     identifier/format tokens, not narrative-classification-vs-structural-prescription mismatches
#     at section boundaries. Add to grilling: "for each § 5 preamble attestation-type claim, open
#     the matching § 4.x prescription and verify the classification matches." Detected R20 MINOR-1.
#
#   Spec files (Q-RNN-SPEC.md, Q-RNN-SPEC-AUDIT.md) must be committed
#     BEFORE the Implementer's chore-A commit. The Architect's NEXT-ROLE.md routing block triggers
#     chore-A; if spec artifacts are uncommitted at that point, they fall outside the chore-A SHA
#     boundary and appear as untracked files in the Reviewer's anti-scope check. Correct order:
#     write spec → commit spec artifacts → write NEXT-ROLE.md routing block. Add as Architect
#     pre-emit grilling step: "confirm all spec artifacts (Q-RNN-SPEC.md, Q-RNN-SPEC-AUDIT.md)
#     are committed before writing NEXT-ROLE.md." Detected tessera R21 MINOR-1.
#
#   When spec § Commit-inventory (§ 2.7) or § Anti-scope-allowed-set
#     (§ 3) lists compiled artifact paths (e.g., `.js` outputs from `tsc`), verify against
#     `.gitignore` and `git ls-files` before routing. A `.gitignore: *.js` rule makes these
#     paths structurally unreachable from `git diff --name-only`; listing them inflates the
#     allowed-set with phantom entries that can never appear in any diff. Add to § 9.7
#     empirical-premise-verification: "are all listed artifact paths git-trackable per
#     .gitignore?" (Run: `git ls-files <path>` — if no output, the path is gitignored.)
#     R23's 13-entry allowed-set contained 4 `.js` paths that returned nothing from
#     `git ls-files`; AC-R23-15 passed only because it asserts membership (not set-equality).
#     Detected tessera R23 MINOR-2.
#
#   When spec § 1 enumerates failure modes for a function, every named
#     failure mode must be independently exercised by at least one AC scenario. A failure mode
#     enumerated in the spec but absent from the AC table leaves the guard implementing it
#     structurally unbound — removing it would not affect any test outcome. Add a branch-binding
#     coverage pass to § 5 grilling: "for each failure mode in § 1, identify the AC row that
#     exercises it; if no row exercises it, add one." Detected tessera R21 MINOR-2 (dedup-by-
#     group_id guard at verdict-consumer.ts:87-94) and MINOR-3 (empty-string short-circuit at
#     verdict-consumer.ts:77-79). Both guards were spec-prescribed; neither had a regression test.
#
#   When spec § 3.x pseudocode contains regex literals intended for
#     test assertions, verify each regex is valid JavaScript BEFORE emitting the spec:
#     (1) `\Z` is not a JavaScript regex metacharacter (it is a Perl/Python construct; MDN
#     documents it as unsupported); use `$` with /m flag, end-of-string lookahead, or
#     restructure via split. (2) lookahead alternation `(?=X|Y)` where Y contains language-
#     specific anchors must be tested in a JS REPL before inclusion in spec pseudocode.
#     Copy-pasting from spec pseudocode to test code propagates language-specific bugs that
#     force content workarounds rather than code fixes. Detected tessera R34 MINOR-3.
#   

# REINFORCED — SPEC-INTERNAL-CONSISTENCY (composite; 7 sub-variants)
#
#   When a spec contains prescriptions that trigger on the same condition
#     (e.g., "if ≥1 MD-violation then AC-8 says HALT" AND "if ≥1 MD-violation then § 6(a) says
#     proceed-with-DIAGNOSTIC"), resolve the contradiction before routing to Implementer. Gate at
#     pre-emit grilling: scan every (halt-condition trigger, AC consequence) pair and verify no
#     two prescriptions prescribe conflicting actions for the same trigger state. Fix: pick ONE
#     rule (HALT → STATUS: ESCALATE, OR proceed-with-DIAGNOSTIC only) and apply it consistently
#     in both the AC text and the halt-condition body — they must agree. An Implementer forced to
#     choose the "more permissive" or "more defensible" reading is encountering a spec defect;
#     any downstream consequence of the forced choice is Architect-attributable. Detected tessera
#     R15 MINOR-3: AC-8 prescribed HALT when ≥1 Memorial-D violation derived; § 6(a) parenthetical
#     prescribed proceed-with-DIAGNOSTIC for the same trigger; Implementer chose the parenthetical;
#     spec-internal contradiction caught by Reviewer as MINOR-3.
#
#   After any operator ESCALATE disposition that resolves a spec-internal
#     contradiction (e.g., "§ 1.8 tolerance 0.001 is authoritative; § 4.3/§ 5.1 tolerance 1e-9
#     is superseded"), the Architect must amend all non-authoritative sections to match the
#     dispositioned value before or at round close. Leaving contradicting prescriptions at HEAD
#     (e.g., § 4.3 and § 5.1 still prescribing 1e-9 after Option A was selected) creates a
#     forward-contamination trap: future readers encounter the original contradiction and either
#     (a) propagate the wrong value or (b) re-derive the disposition from commit messages.
#     Right procedure: after operator ESCALATE disposition, Architect (or Implementer under
#     Architect direction) amends non-authoritative spec sections + adds a § 9.x note referencing
#     the DIAGNOSTIC + disposition commit SHA. Detected tessera R25 MAJOR-3 (§ 4.3:752 and
#     § 5.1 AC-R25-12 row still prescribe 1e-9 at HEAD).
#
#   When spec § 9.x grilling sweep notes "pattern also matches
#     comments / JSDoc" for an AC that guards a critical invariant, the grilling must complete
#     a discriminability check — not merely note the ambiguity. Specifically: ask "would the
#     assertion still PASS if only the comment/JSDoc occurrence is present and the
#     type-declaration occurrence is removed?" If yes, the assertion is non-discriminating and
#     must be strengthened (regex with line anchoring, specific line-range read, etc.) before
#     the spec is emitted. A note that says "intentional, since the literal is in the type
#     declaration body" without validating that the assertion CAN distinguish the two
#     occurrences is an incomplete grilling gate. Detected tessera R30 MINOR-1 (spec § 9.2 R03
#     sweep noted comment-match for AC-R30-15 and characterized it as intentional but did not
#     compute that `verdict.includes(...)` would pass even with engine/types/verdict.ts:289
#     removed while :272 JSDoc is preserved; Reviewer cold-caught this).
#
#   Spec § 9.8 spec-internal-contradiction sweep MUST explicitly
#     cross-check algorithmic boundary clauses (pre-window / post-window, filter predicates,
#     interval endpoints) across ALL spec sections where they appear (§ 1.x prose, § 3.x
#     pseudocode, § 4 AC Then-columns). Listing one section's boundary convention and not
#     diffing it against the others produces internal contradictions that surface empirically
#     at chore-B. Procedure: for each algorithmic primitive with boundary semantics, grep
#     the spec for all occurrences and verify each uses the same convention (inclusive vs
#     exclusive; open vs closed). Detected tessera R34 MINOR-2 (pre/post window boundary
#     inconsistency across § 1.1, § 3.2 pseudocode, and § 4 AC-R34-8 text).
#
#   Spec § 9.8 spec-internal-contradiction sweep must also cross-check
#     type-shape definitions that appear in § 1.x scratch/type-pretest pseudocode against their
#     corresponding definitions in § 4.x prescriptive pseudocode. The R34 MINOR-2 reinforcement
#     (REINFORCED 2026-05-18) covers algorithmic boundary clause drift; this extends it to
#     type-definition shape evolution: when § 1.5 type-pretest authors a type as a discriminated
#     union with required fields on specific variants (e.g., status_code: number required on
#     http_4xx/http_5xx), and § 4.x later emits the same type as an interface with optional
#     fields (status_code?: number on all kinds), the § 10.8 sweep must explicitly diff the two.
#     Procedure: for each named type in § 1.x pseudocode, grep spec §§ 4.x for the same type
#     name and compare field optionality and variant structure. The drift is particularly likely
#     when § 4.x is written after § 1.x and the type shape is simplified for implementation
#     convenience. Detected tessera R65 MINOR-2 (FeedError § 1.5 discriminated union with
#     required status_code vs § 4.1 interface with optional status_code; § 10.8 sweep missed;
#     Implementer correctly followed § 4.1; weaker compile-time discrimination resulted).
#
#   Spec § 9 P3 ten-axis verification behavioral commitments (lines
#     that assert "corner case input Z → expected output W") must be cross-checked against the
#     AC table. For each P3 commitment, verify that at least one AC in § 5.1 structurally
#     exercises that (Z, W) pair — meaning the AC's assertion is ON output W for input Z, not
#     merely incidentally passing through it with assertions targeting other fields. Procedure:
#     for each P3 statement, grep spec § 5.1 for an AC whose Then-column asserts on output W
#     specifically. If none exists, either add the case to § 5.3 acknowledged-gaps with rationale
#     OR add a new AC for it. The existing Rule 2 / § 5.3 acknowledged-gaps workflow covers
#     implementation-derived gaps; this reinforcement ensures § 9 P3 commitments receive the
#     same coverage check. Detected tessera R65 MINOR-3 (§ 9 line 1491 commits "empty
#     firing_verdicts[] → firing_family_count === 0" but no AC asserts this; AC-R65-3/4/6 use
#     empty input incidentally with assertions on other fields; § 5.3 did not enumerate this
#     gap; a bug returning firing_family_count: 1 for empty input would pass all current ACs).
#
#   Spec-amendment-ALL-gate-artifacts-propagation (Tessera R82): When a spec amendment expands or modifies ALLOWED_SET (e.g., due to operator-authorized scope change during a dual-escalate window), Architect must update ALL four gate artifacts in lockstep: (a) spec § 3.2 or § 2.x ALLOWED_SET enumeration (narrative inventory table listing each file's authorization reason); (b) spec § 3.2 ALLOWED_SET regex (machine-checkable); (c) EMPIRICAL.sh Block 5 ALLOWED variable (script gate); (d) any AC that validates against the ALLOWED_SET (e.g., AC-R82-14). The narrative inventory table is a gate artifact — it provides the human-readable "why" for each file modification and is the first place future readers look to understand the round's scope. Omitting it from an amendment creates audit-trail confusion (machine gates pass but narrative lags reality). Procedure: before routing after any ALLOWED_SET amendment, grep the spec document for every occurrence of "§ 3.2", "ALLOWED_SET", and the new filename; verify at least 4 locations are updated (narrative table, regex, script, test AC). Detected tessera R82 MAJOR-1: narrative component inventory § 3.1 not updated when tools/build-canned-demos.ts was added to ALLOWED_SET (2nd instance; prior: R72).

# REINFORCED 2026-05-19 — Empirical-AC threshold binding tightness (R44 MINOR-3, R46
#   MINOR-1+2): When authoring an AC whose verification command is a `grep -c` count,
#   prefer tight equality (`= N`) or near-equality (`≥ N` with N close to the empirical
#   value at spec-emit time) over permissive `≥ 1`. A `≥ 1` threshold is incidentally-
#   satisfiable: a single comment mention, narrative prose reference, or unrelated occurrence
#   passes the AC without the canonical structural element being present. Stronger forms:
#   (a) anchor patterns to structural markers (e.g., `grep -cE '^> \*\*Rule 1 sub-class
#   .empirical-command-attestation' ≥ 1` vs bare `grep -c 'empirical-command-attestation'
#   ≥ 1`); (b) restrict file-wide patterns to section-scoped ranges via `awk '/^## section/,
#   /^---/'` filters before counting (file-wide `grep -cE 'Rule [1-7]' ≥ 7` is mechanically
#   discriminating only when the threshold sits far above the pre-emit baseline, by accident
#   not design — a future round adding rule mentions elsewhere inflates the count without
#   binding the intended structural location); (c) for empirical-command-attestation per
#   the Rule 1 sub-class (R46), bind to the SAME command the Implementer will run at chore-A
#   so attestation = command output verbatim. Pre-emit grilling gate: for each grep-count
#   AC, ask "could this threshold be satisfied without the canonical structural element
#   being present?" — if yes, tighten the pattern or anchor it. Detected tessera R44 MINOR-3
#   (Rule [1-7] file-wide grep) + R46 MINOR-1+2 (`≥ 1` thresholds on `empirical-command-
#   attestation` and `verify-empirical-acs.sh` mentions).

# REINFORCED 2026-05-19 — Chore-A vs chore-B test-count prediction (R53 MINOR-1): When a
#   round includes an anti-scope runtime test (AC-R53-15-class) whose placeholder SHA
#   `'<INJECTED-AT-CHORE-B>'` causes it to fail at chore-A by construction (the git object
#   is not valid until chore-B injects the actual SHA), the spec AC-R53-14-class test-count
#   prediction MUST distinguish two states explicitly: (a) "at chore-A state" — AC-R53-15
#   fails; predicted count = baseline + N_new_tests − 1 pass, N_fail + 1; (b) "at chore-B
#   state" — AC-R53-15 passes; predicted count = baseline + N_new_tests pass, N_fail.
#   Encoding the chore-B count as the chore-A prediction is structurally impossible and
#   forces the Implementer to choose between spec compliance and empirical accuracy (Rule 1
#   sub-class `empirical-command-attestation`). Fix: in spec § 5 AC-R53-14 row and § 1.4
#   Architect pre-prediction table, annotate each count with the SHA boundary it assumes.
#   Q-R53-EMPIRICAL.sh must also carry two separate assertion blocks — one for chore-A SHA
#   and one for chore-B HEAD. Detected tessera R53 MINOR-1.
# REINFORCED 2026-05-19 — Spec halt-condition triggers must carve out pre-documented
#   failure-by-construction states from the halt trigger (R56 MINOR-1). When spec § 1.4
#   Architect-prediction and § 5 AC table BOTH predict that a binding-command block will
#   exit non-zero at chore-A because a placeholder SHA is not a valid git object until
#   chore-B, spec § 6.1 halt-condition text MUST exclude that specific pre-documented
#   failure path — e.g., "exits non-zero for any reason OTHER THAN the pre-documented
#   AC-R56-14 two-state mismatch." Omitting the carve-out creates a spec-internal
#   contradiction (§ 6.1 says HALT; § 4.6 + § 5 describe the same non-zero exit as the
#   expected chore-A outcome) that forces the Implementer to bypass the literal halt-rule
#   without writing a DIAGNOSTIC. Pre-emit grilling § 9.8 R15 row "no conflicting
#   prescriptions for the same trigger state" MUST explicitly ask: does any prediction in
#   § 1.4 or § 5 describe a chore-A observable outcome that would also satisfy a § 6.1
#   halt trigger? If yes, the halt trigger must enumerate the exception. Detected tessera
#   R56 MINOR-1 (Architect § 10.2 R15 grilling row affirmatively claimed no conflict —
#   the affirmation was wrong; the conflict was not caught at spec-emit time).
# REINFORCED 2026-05-19 — When spec pseudocode uses a constructor options literal (e.g.,
#   `new SlurmTopologySource(data, { fetched_at_ts: ... })`), grep the actual opts interface
#   declaration at spec-emit time — not from memory. camelCase vs snake_case field names are
#   invisible without direct file read (e.g., `fetchedAtTs` vs `fetched_at_ts` at
#   `engine/topology/slurm-source.ts:SlurmTopologySourceOpts`). The type-declaration-site
#   check (REINFORCED 2026-05-16, R02) applies to TYPE shapes; this extends it to OPTS
#   INTERFACE field names used in pseudocode constructor calls. Procedure: for each
#   constructor-call pseudocode literal with an opts object, grep `interface.*Opts\|type.*Opts`
#   in the source file and read the exact field names before writing. Detected tessera R58
#   MINOR-1 (Implementer resolved at TD-1 via TACTICAL AUTONOMY; no runtime impact; first
#   constructor-options-symbol-drift sub-variant of cite-then-verify).
# REINFORCED 2026-05-19 — When spec § 5.x branch-binding table cites post-MOD line numbers
#   for guards that will be inserted INSIDE an existing method body, the insertion shifts all
#   subsequent lines by the number of inserted lines. Citing the pre-MOD absolute line number
#   as the "after-MOD guard location" produces off-by-N citations (N = inserted lines).
#   Procedure: cite via grep-anchor (e.g., "slurm-source.ts: search fetchSnapshot for
#   `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B`") OR note "predicted post-MOD: pre-MOD line + N_lines
#   inserted" (e.g., "pre-MOD :58-60; 3-line guard → post-MOD :60-62"). Never cite a
#   post-MOD absolute line number for an inline insertion without computing the offset.
#   A forward-flag in the spec-audit acknowledging the drift is not a substitute for providing
#   the correct post-MOD range in the spec itself. Detected tessera R58 MINOR-3 (spec-
#   readability impact only; first post-MOD-insertion-drift sub-variant).
# REINFORCED 2026-05-20 — When authoring a routing block in NEXT-ROLE.md (Architect's
#   handoff to Implementer), ANY specific AC number, file path, or section reference cited
#   in the block MUST be copied verbatim from the spec by grep — not re-typed from memory.
#   A routing-block copy-edit transposition (e.g., digits 16→10 and 18→12 — both off by 6)
#   has no deliverable consequence only because the Implementer used the spec proper as the
#   load-bearing input. Procedure: before committing the routing block, grep the spec for
#   every carve-out AC number cited and copy-paste verbatim from grep output. Sub-variant 3
#   of Architect cite-then-verify pattern: R58 MINOR-1 (constructor-opts field name); R58
#   MINOR-3 (post-MOD line numbers in branch-binding table); R65 MINOR-1 (routing-block
#   carve-out AC numbers in NEXT-ROLE.md:234 "AC-R65-10 + AC-R65-12" → correct "AC-R65-16
#   + AC-R65-18"). Detected tessera R65 MINOR-1.
# REINFORCED 2026-05-20 — When spec prescribes a hard-coded boolean or status literal in a
#   success-response field whose name makes a semantic claim about a downstream side-effect
#   the consumer cannot confirm (e.g., `freeze_hook_activated: true` when the consumer emits
#   an EventEmitter event with no return path from subscribers), the Architect must either
#   (a) choose a field name that is semantically accurate from the consumer's perspective
#   ("event_accepted" / "event_forwarded" rather than "freeze_hook_activated") OR (b) add a
#   JSDoc on the field interface clarifying that the value means "forwarded to wired
#   subscribers, not confirmed activated." Pre-emit grilling Q.1 ("every claim verifiable?")
#   must explicitly include: for each boolean status field in a success response, can the
#   emitting component actually assert that value from its own observable state? If not, the
#   field name is a semantic overclaim. Detected tessera R66 MINOR-1 (freeze_hook_activated:
#   true always returned by DsEventConsumer even when no factory subscriber is wired; spec
#   § 4.1 prescribed this literal; the consumer cannot verify the freeze hook fired).
# REINFORCED 2026-05-20 — When amending a binding-command prediction or test-count value in
#   a spec file (e.g., § 5.2 implicit AC), use SINGLE-VALUE replacement with an explanatory
#   annotation rather than strikethrough dual-value format. The strikethrough markdown
#   convention renders visually but the old literal text remains present in the file and is
#   parseable by future grep-based attestation-archeology (e.g., grepping "what did R66
#   predict?" finds both old and new values). Procedure: (a) replace old value with new value
#   in-line; (b) append an [Rnn-amended per Option X: reason] bracketed annotation on the
#   SAME line AFTER the new value. Full-disclosure intent is correct; the format must avoid
#   leaving the old literal as a primary grep target. Detected tessera R66 MINOR-5
#   (Q-R66-SPEC.md:1163 ~~444/439/2/3~~ alongside 444/438/3/3; old literal grep-parseable).
# REINFORCED 2026-05-20 — When a spec produces both a human-readable narrative pseudocode
#   section (e.g., § 11.2 spec.md block) AND a committed executable verification script
#   (e.g., Q-RNN-EMPIRICAL.sh) in the same spec-triad commit, the two must agree on every
#   grep pattern, anchor, and logic construct. A narrative that uses `grep "^not ok"` (anchored)
#   while the executable uses `grep "not ok"` (unanchored) produces divergent behavior for
#   indented subtest lines — the executable version is correct and the narrative version silently
#   misleads future readers about what the script actually checks. Pre-emit grilling must include
#   a line-by-line reconciliation between spec.md pseudocode and the EMPIRICAL.sh implementation
#   for every shared logic block. Detected tessera R70 MINOR-2 (spec § 11.2 Block 2 vs
#   Q-R70-EMPIRICAL.sh:56; unanchored grep correctly catches AC-R65-2 + AC-R66-14 indented
#   TAP lines that the anchored version would miss).
# REINFORCED 2026-05-20 — When writing an AC "Then" clause that names a specific metric (e.g.,
#   "not ok line count is exactly 5"), verify that the claimed metric is what the Block's actual
#   verification mechanism checks. If the verification mechanism uses a TAP summary field
#   (`# fail = 5`) rather than a direct line-count grep, the AC literal must describe the
#   TAP-summary mechanism — not a different observable that yields a different number at the same
#   test state. Pre-emit grilling must explicitly ask: "does the metric named in each AC 'Then'
#   clause match exactly what the EMPIRICAL.sh Block for that AC computes?" If not, revise either
#   the AC text or the script block before routing. Detected tessera R70 MINOR-3 (AC-R70-13
#   "not ok line count is exactly 5" vs Block 2 checking `# fail = 5`; empirical grep -c
#   not ok = 7 at Reviewer HEAD, not 5).
# REINFORCED 2026-05-20 — When prescribing a regex assertion in spec pseudocode, verify the
#   regex is strictly discriminating: it must NOT match any non-target line in the expected
#   output. If a candidate-listing regex also matches a static topology header or any other
#   always-present line, the test passes trivially even if the candidate-listing line is absent.
#   Procedure: mentally enumerate every line in the expected scenario output that could match the
#   regex; if any non-target line matches, narrow the regex (add start-of-line anchor, require a
#   distinguishing prefix, or use a more specific pattern). The presence of other discriminating
#   assertions in the same test does not justify a weakly-discriminating regex — each assertion
#   should independently discriminate. Detected tessera R70 MINOR-4 (spec § 4.2 line 808
#   `/shard-00.*shard-01.*shard-02/` matches topology header equally well as candidate-listing
#   line; passes even if candidate-listing line is elided).
# REINFORCED 2026-05-20 — When a scenario's primary pedagogical claim is "X causes Y to happen
#   DIFFERENTLY from Z" (e.g., "fleet fires BEFORE any per-shard fires," "ONE cooling-zone
#   candidate surfaces rather than N per-rack candidates"), the AC that binds that scenario's
#   terminal state MUST bind the DISCRIMINATING property — the one that proves the pedagogical
#   difference — not merely the MINIMUM property that indicates the feature functions at all.
#   An AC that binds only "fleet_fired === true" passes when the fleet fires at ANY point,
#   including AFTER individual shards fire, defeating the scenario's intended demonstration.
#   An AC that binds "cooling_zone candidate with member_count ≥ 4" passes even when 3 candidates
#   surface instead of ONE. Procedure: for each scenario that carries a narrative claim of the
#   form "X shows that Y differs from Z in situation W," write the AC's Then-clause to assert the
#   DIFFERENCE directly — e.g., "fleet_tick_at_first_fire < min(per-shard first-fire windows)"
#   or "candidates.length === 1 AND candidate.shared_node_kind === 'cooling_zone'." If the
#   discriminating assertion is not expressible as a deterministic predicate (e.g., because the
#   per-shard first-fire window depends on the LCG seed), revise the scenario parameters until
#   it is, or document the acknowledged gap in § 5.3 with rationale. The § 5.3
#   discriminating-assertion gate must ask: "would this AC FAIL if the implementation were
#   correct but the pedagogical property were violated?" If no, the AC is under-specified.
#   Detected tessera R71 MINOR-1 (AC-R71-9 passes even when all 5 shards fire individually;
#   AC-R71-11 passes even when 3 candidates surface; downstream: MAJOR-1 + MAJOR-2 narrative-
#   vs-data contradictions undetectable at chore-A because the ACs don't bind the narrative
#   claim). See also: R71 EMPIRICAL-PREMISE-VERIFICATION sub-variant 5 (same root cause).
# REINFORCED 2026-05-20 — Forward-protection-AC audit must be exhaustive across all prior rounds'
#   frozen-surface tests, not selective. At spec-emit time, Architect grilled the round's
#   ALLOWED_SET against the prior round's anti-scope test to predict AC-R(N-1)-14 flips. This
#   is correct per R25 MAJOR-2 precedent. However, also walk TWO ROUNDS BACK: if R(N-2) froze any
#   file that R(N) was authorized to modify, AC-R(N-2)-14 ALSO flips. Pattern: R79 modified
#   tools/build-canned-demos.ts (R78 anti-scope test predicted to flip ✓; R77 frozen-path list
#   ALSO includes it, not predicted ✗). Procedure at pre-emit grilling § 9.6: (a) enumerate all
#   anti-scope test numbers from prior 2 rounds; (b) read each test's frozen-path list (e.g.,
#   grep "frozenPaths =" from test/q77-*.test.ts and test/q78-*.test.ts); (c) for each frozen
#   path, check if round-to-spec ALLOWED_SET modifies it; (d) record all predicted flips in §
#   1.4 prediction table. The gap: R79 spec § 1.4 predicted 1 flip; actual 2. Detected tessera
#   R79 pre-emit-grilling gap (Architect). First instance.
# REINFORCED 2026-05-20 — Spec § 9.6 self-application gate must walk stdio-flush semantics for large outputs. The pseudocode `process.stdout.write(out); process.exit(0)` empirically truncates at exactly 65,536 bytes when stdout is a pipe. Before prescribing this pattern for outputs that may exceed 64 KB (estimated from the spec triad size + directive section), verify the actual buffer size under realistic conditions: `node -e "process.stdout.write('x'.repeat(500000)); process.exit(0);" | wc -c`. If the spec prescribes a flow that outputs >64 KB in a single write, either use `process.stdout.end(data)` (which drains the buffer) or document the acknowledged gap in § 5.3 with a minimum mitigation. First tessera instance: R75 MINOR-1 (prefix 177KB); second instance: R74 MINOR-5 (not caught until Implementer noticed AC-R75-3 would consume truncated test output). Threshold reached at R75; cross-project memory entry added.
# REINFORCED 2026-05-20 — Spec § 9.6 self-application gate must walk cross-module import execution paths. When a spec prescribes a TypeScript module with a bare `main();` call at module scope, and that module is imported by another module in the same spec, verify that the importing module's main() does not recursively execute the imported module's main(). Pattern: export the logic as a named export + guard the top-level execution with `if (require.main === module) { main(); }` so imports do not trigger execution at import-time. Before routing, simulate the import path: create a mental stack of which main() executes when module B imports module A that fires main() at script load. Procedure: grep for both bare `main();` calls and any `import/require` statements that span the imports. Spec R75 MINOR-2 (measure-cache-effect.ts importing build-role-context.ts would execute build-role-context's main() with wrong argv) caught by Implementer; specification gate gap. Third tessera instance (R74 MINOR-5 class); cross-project memory entry added.
# REINFORCED 2026-05-20 — Spec § 9.6 self-application gate must verify bash context for prescribed keywords. When prescribing an insertion of bash code at a specific location (e.g., "append the following block after line X"), verify the keyword semantics are valid in that context. The `local` keyword is only valid inside bash function bodies; prescribing `local VAR=""` to be inserted at script top level (post routing-log heredoc) will cause bash to error "local: can only be used in a function" on script load. Procedure: before routing, verify every bash keyword (local, declare, typeset) against the insertion-site context. If the site is outside a function (e.g., appending to the main script body), use plain assignment `VAR=""` instead. Spec R75 MINOR-3 (local prescribed at top level) caught by Implementer. Fourth tessera instance of spec-pseudocode-fails-verbatim class (R74/R75); Rule 7 threshold crossed for cross-project rule derivation.
# REINFORCED 2026-05-21 — AC-coverage-gap-mitigation-claim discipline (Tessera R83): When spec acknowledges an AC gap (e.g., "no live browser smoke test," "no assertion for X"), the mitigation claim must be specific and falsifiable. "ACs 10..13 bind the source-text patterns that runtime would invoke" is falsifiable only if every pattern-invocation path is enumerated and bound. If the spec later surfaces a 5-item set of listeners (ctrlDriftMag, ctrlWindowCount, ctrlAlphaThreshold, ctrlTargetShard, ctrlTopologySize) not covered by the named ACs, the mitigation claim was overstated. Procedure at pre-emit grilling: (a) for each acknowledged gap, enumerate ALL invocation paths of the pattern (e.g., "7 handler shapes: Run button, Reset button, 5 per-control listeners"); (b) verify each path has an AC binding; (c) if N paths are bound and M paths exist (N < M), the mitigation is incomplete — either extend the ACs or reword the gap to "static analysis catches N of M patterns; runtime mutation risk remains for M-N uncovered paths." Spec § 5.3 gap-acknowledgment + mitigation table pattern surfaced at R83; first tessera instance of this sub-variant (prior instances of "AC gap acknowledged without falsifiable mitigation" at R80 MINOR-1 + R81 MINOR-2, different structure).
# REINFORCED 2026-05-21 — Pass-count arithmetic when forward-protection-AC flips present (Tessera R83): When computing predicted test pass count at a round where a forward-protection-AC is expected to flip (i.e., EXPECTED_FAIL increases by 1), subtract that flip from BOTH the predicted pass count AND the predicted pass-count band lower edge. Predicted pass = (prior-close PASS) - (forward-protection flip count) + (new ACs passing). Predicted band = [prior-close PASS - flip - 1, prior-close PASS - flip + 1] accounting for the delta direction. At R83: R82-close = 620 pass, AC-R82-14 flips (predicted), R83 adds 16 ACs all passing → prediction should be 620 - 1 + 16 = 635, band [634, 636]. Spec predicted 636 (missing the -1), band [635, 637], which masked the arithmetic error. Observation 635 fell at band lower edge; the gap between prediction and observation was attributed to "PRNG/environment variance" when it was actually systematic arithmetic. Fix: carry the forward-protection flip through the entire pass arithmetic. First tessera instance (prior: R79 MINOR-3 had similar gap but different structure).
# REINFORCED 2026-05-21 — End-to-end-test-race-conditions: AC-R84-14 structurally flaky (Tessera R84 MINOR-2): When a spec prescribes an end-to-end test where an async operation (e.g., `worker.terminate()`) must halt a synchronous message stream, the test-harness timing is inherently racy: the worker thread may emit the final message between the async terminate() call and when the worker process is torn down. This is NOT an implementation bug; it is a fundamental concurrency property of async termination. When spectating this pattern, either (a) accept flakiness as a documented AC limitation in § 5.3 with explicit rationale ("terminate() is async; late-arriving messages are tolerated; AC asserts a lower bound not an exact count"), OR (b) restructure the test to not depend on race outcomes (e.g., measure the cumulative message count post-terminate across N test runs and assert a distribution, not a hard count). Procedure: if spec has a test of the form "invoke async operation X; assert that subsequent synchronous stream halts," audit whether X's completion is causally necessary for the halt assertion to be true. If the assertion is probabilistic (e.g., ">90% of runs observe ≤N messages"), document the flakiness as a known limitation; if the assertion is deterministic (e.g., "exactly K messages"), restructure. Spec R84 AC-R84-14 prescribed a deterministic assertion on an async race; observation: test passed in CI but exhibited transient local flakiness; Reviewer noted flakiness. Detected Tessera R84 MINOR-2 (first instance of this specific structure; related async-determinism pattern at R48 MINOR-3 / R53 MAJOR-2).
# REINFORCED 2026-05-21 — Spec-AC-count-consistency discipline (Tessera R84 MINOR-3): When spec § 5 (Acceptance criteria) enumerates AC count as N and quotes "N ACs" or "# fail = N" in predictions, all concrete assertions of "AC count = N" must be binding. At spec-emit time, verify: (a) count the actual test() blocks in the spec's verbatim test-file section; (b) count the assertions in the enumerated AC table; (c) count assertions in the anti-regression AC region (e.g., "AC-R84-15: 14 marker-regex matches" must have exactly 14 assert.match calls in the test file). When these counts diverge, update the spec documentation to match the actual code. Procedure: before pre-emit grilling, create a [AC-ID, assertion-count] table: for each AC that claims a specific count ("4 message types", "14 markers"), grep the test file's final version and count the matching assert calls. If assertion-count > claimed-count, update the spec. If assertion-count < claimed-count, decide whether to add missing asserts or reduce the spec claim. Spec R84 AC-R84-15 claimed "14 marker regex matches"; test file contained 16 assert.match calls (R71 markers: 2, R79: 2, R80: 1, R81: 1, R82: 2, R83: 8) — spec prediction undercounted by 2. Detected Tessera R84 MINOR-3 (first instance of this sub-variant; prior instance: R74 MINOR-3 similar structure but on timeout values).
# REINFORCED 2026-05-21 — Fail-count prediction against known-flaky prior AC (Tessera R85 CRITICAL-1;
#   composite fold of R83 pass-count-arithmetic + R84 end-to-end-test-race-conditions REINFORCED):
#   When encoding a fail-count prediction (`EXPECTED_FAIL=N` strict in EMPIRICAL.sh; `# fail = N`
#   in § 5.2), scan MEMORIAL.md for prior-round ACs documented as structurally flaky (grep for
#   "flaky", "race condition", "MINOR-2", or "non-deterministic" adjacent to any active AC ID). Any
#   such AC contributes stochastic variance to the fail count independent of the round's own changes.
#   If a flaky AC remains in the suite (not removed or restructured), EXPECTED_FAIL MUST be a band
#   (`EXPECTED_FAIL_MIN=N`/`EXPECTED_FAIL_MAX=N+1` in EMPIRICAL.sh; `fail: N–N+1 (band; ±1 for
#   AC-RXX-YY structural flakiness)` in § 5.2), never a strict value. The same band-accounting
#   principle applies for STOCHASTIC FLAKES as for deterministic forward-protection flips (R83
#   sub-variant). Procedure: before emitting § 5.2 prediction table, (a) grep MEMORIAL.md for flaky
#   AC patterns; (b) for each flaky AC still active, add +1 to EXPECTED_FAIL_MAX; (c) document the
#   AC name and historical flake rate in the rationale column. R85 CRITICAL-1: AC-R84-14 structural
#   flakiness (~25% rate; R84 REVIEWER MINOR-2 at MEMORIAL.md:2583) was not carried forward into
#   the § 5.2 fail-count prediction; EMPIRICAL.sh encoded `EXPECTED_FAIL=16` strict; ~25% of
#   full-suite runs at routing HEAD tripped Halt-3. Operator Option A resolution required post-Reviewer
#   ESCALATE. Second tessera instance of count-arithmetic-missing-flake-contribution (prior: R83
#   REINFORCED covered deterministic flips; R85 extends to stochastic flake variance).# REINFORCED 2026-05-21 — Empirical-baseline integer claims in spec § 0 P*.N rows
#   MUST be cross-validated against current files at spec-emit time (§ A5
#   empirical-premise-verification gate per CLAUDE-ARCHITECT.md § 4 binding-
#   command-run). "12 export * from lines" claims require a direct grep -c
#   or Read of the actual file — do not infer from prose listing. This is
#   a sub-case of Rule 1 empirical-command-attestation: the P0 row IS a
#   claim amenable to command-based verification; verbatim output must be
#   recorded. Detected R90 MINOR-1: P0.2 asserted 12 but enumeration lists
#   13; actual file has 13. Same pattern at R40 + R88 (architect-claim-
#   without-empirical-walk family). Procedure: before emitting spec-triad,
#   run the actual enumeration command (grep -E 'export \* from' | wc -l)
#   against the file at round-start HEAD; record observed count in P0 row.

# REINFORCED 2026-05-21 — AC-scope and acknowledged-gap completeness:
#   § 5.4 acknowledged-gap table is load-bearing when an AC does NOT bind
#   all branches of a prescribed surface (e.g., § 3.1 exports map has 34+
#   entries, AC-R90-4 binds 24, 10+ uncovered). The table entries must
#   enumerate ALL uncovered branches with brief "why mitigation" columns,
#   not just select examples. Audit procedure: for each AC, walk the spec
#   § 3.x prescription and list every branch/subpath/field that the AC's
#   "Then" clause does NOT bind. Cross-reference against test pseudocode.
#   Detected R90 MINOR-2: gap table listed 5 but spec analysis revealed
#   2 additional gaps (exports subpaths + script-body not runtime-tested).
#   Same class as gap-completeness discipline (R74 MINOR-2 pairing).

# REINFORCED 2026-05-21 — Empirical grep-count accuracy (Tessera R90):
#   When spec § 0 P*.N rows cite empirical grep output ("56 distinct relative
#   imports" from grep -hoE command), the command-result reproducibility is
#   load-bearing for R88 false-compliance-attestation discipline (empirical
#   output must be verbatim, not inferred). If the command is sensitive to
#   the grep pattern (anchored vs unanchored; regex operator variance), re-run
#   it at spec-emit HEAD alongside the authored command and document any
#   discrepancy. "56 imports found via grep X; verified-at-HEAD counts 48
#   via analogous engine-scoped grep [command]; variance documented as likely
#   due to broader \.\. pattern including non-engine parent-relative imports"
#   is acceptable attestation. Bare assertion of "56" followed by Reviewer-
#   reproduction yielding "48" is a violation (attestation-accuracy). Same
#   class as MINOR-1 (empirical-baseline integer not cross-validated). Detected
#   R90 MINOR-4; minor instance of R88 false-compliance-attestation extended
#   into grep-reproducibility variance.

# REINFORCED 2026-05-21 — R86 prophylactic walk must check new test files
#   against pre-existing forward-protection ACs (Tessera 10th instance of
#   architect-claim-without-empirical-walk pattern; see CROSS-PROJECT-MEMORIAL.md).
#   When spec § 8.5 (R86 self-application) prescribes a new test file
#   introducing a subprocess-spawn pattern, pattern-matching, or observable
#   side-effect, the walk must: (1) enumerate all pre-existing forward-
#   protection ACs in the project (e.g., AC-R36-3, AC-R89-7); (2) check if
#   the new test file introduces the guarded pattern; (3) either refactor to
#   avoid the pattern OR document carve-out amendment in spec's component
#   inventory § 2.x. Detected R91: spec prescribed q91 test with execFileSync
#   ('node',...) pattern, R86 walk checked self-consistency of q91 in isolation,
#   did NOT check against AC-R36-3 (q36 test file's "no other test files
#   carry this pattern" guard). Resulted in halt-condition-4 trigger (pre-
#   existing AC-R36-3 flipped PASS→FAIL). Procedure: R86 gate gate must add
#   a sub-step "Does this test introduce a guarded pattern (check forward-
#   protection ACs)?" before spec-emit.
