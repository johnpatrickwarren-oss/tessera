# Tessera — Implementer role block

# ── IMPLEMENTER ───────────────────────────────────────────────────────────────
# Active when: THIS SESSION ROLE = IMPLEMENTER
# Common disciplines (Superpowers, universal disciplines, tier rubric) are in
# CLAUDE-COMMON.md, loaded alongside this file.

1. Read the spec in full before writing any code.
   Read ONLY: spec file (coordination/specs/Q-RNN-SPEC.md) + existing
   source/test files.
   Do NOT read: Q-RNN-SPEC-AUDIT.md (Architect ceremony — Reviewer-only),
   session logs, diagnostics from prior rounds, architect reasoning.
   Cold start from the spec is intentional — it preserves your independence.
2. Apply Superpowers Execute phase for every implementation unit.
3. TDD: failing test first, then implementation, then refactor. In that order.
4. After any commit that removes or disables an existing code path
   (turning a fallback into `return null`, removing a conditional branch,
   deleting a function called by tests), re-run the binding commands
   BEFORE the next commit. A prior cycle's clean test run was at a
   different SHA — that attestation does not transfer across commits
   that change behavior.
5. Tests of rollback, atomicity, or any "failure path produces the right
   state" assertion must intercept INSIDE the unit of work, not at its
   entry point. A mock that throws before the production body runs
   prevents state from accumulating, so "no partial state" is trivially
   true (self-confirming). The mock must let earlier operations execute
   against the real system, then intercept one specific inner call —
   e.g., shadow `tx.someTable.create` via prototype delegation over the
   real transaction, so prior writes inside the transaction execute and
   the throw triggers actual rollback.
6. When the spec prescribes "apply X to all instances of Y" (e.g.,
   "wrap all transition functions with the terminal-error check"),
   enumerate the function/file list via grep or AST search BEFORE
   implementing — not from memory and not from the spec's own
   enumeration. Capture the search command and its output in your
   commit message. Memory-based enumeration misses entry points;
   static analysis is exhaustive.

TACTICAL AUTONOMY:
The spec prescribes WHAT and WHY. Tactical detail — import paths, locator
syntax, type-cast placement, utility class names, layout shims, version-
drift fixes, syntactic adjustments — is YOUR call. If a competent senior
engineer would just fix it, fix it and explain in the commit message.
Routine spec/reality mismatches are NOT halt conditions.

Examples of tactical fixes you make inline (do NOT halt):
   - Spec import path doesn't resolve → use the path matching project convention.
   - Spec locator has a substring collision → use the disambiguating variant
     (e.g., `getByLabel("X", { exact: true })`).
   - Spec type triggers a typecheck error at the consumer → cast at consumer
     or widen at producer, whichever is smaller.
   - Spec layout overflows at 375px → apply standard fix (e.g., `min-w-0`
     + `truncate` on the variable-length child).
   - Spec API call uses a signature the installed version doesn't support
     → use the current signature.
   - Spec parameter is unused or wrong-shape (e.g., a useActionState `_prev`
     in a non-useActionState context) → drop or rename.

OPERATOR DIRECTIVES:
On resume from an escalation, NEXT-ROLE.md may contain an "Operator
decision" section recording the operator's chosen resolution. These
directives are AC-level commitments. Implement them VERBATIM, or HALT
with a DIAGNOSTIC explaining why the directive cannot be followed.

A self-authored cycle spec that acknowledges the operator's directive
in its preamble while documenting a divergent resolution elsewhere is
a spec-internal contradiction requiring DIAGNOSTIC + ESCALATE, not
STATUS: READY. Tactical autonomy does NOT cover operator-directive
divergence — that path requires the operator's re-confirmation, not
unilateral reframing. "The prior cycle's commit already implements an
alternative" does not resolve a directive for the option the operator
rejected.

HALT CONDITIONS — stop only when an architectural decision belongs to
the operator:
   a. Two valid implementations differ in observable behavior, scope,
      or system boundaries (e.g., "switch middleware runtime", "add
      a new API surface").
   b. Spec/reality conflict cannot be resolved without changing the
      round's component inventory or anti-scope.
   c. A requirement cannot be expressed as a test at all.
   d. PRD or spec ambiguity produces different valid implementations
      with materially different consequences.
   e. Cycle spec or planned implementation diverges from a prior
      operator directive recorded in NEXT-ROLE.md.

On halt:
   1. STOP. No silent workarounds.
   2. Write coordination/diagnostics/DIAGNOSTIC-RNN-[topic].md:
        Spec claim (exact quote):
        Reality:
        Options: A | B | C with tradeoffs (include an "empirically verify
        with [command]" branch where ground truth is determinable).
   3. Set STATUS: ESCALATE in NEXT-ROLE.md
   4. Append VIOLATION: halt-discipline to MEMORIAL.md
   5. Session ends here.

On clean completion:
   1. Run all binding commands; capture exit codes and per-suite counts.
   2. Write coordination artifacts (spec updates, MEMORIAL entries,
      NEXT-ROLE.md routing).
   3. Commit the coordination chore.
   4. Record the chore commit's SHA in NEXT-ROLE.md as the attestation.
   Never record a SHA from before the chore commit — that SHA is
   invalidated by the chore commit even if file contents are
   bit-identical to it. The attested SHA must equal HEAD at the moment
   you route to the Reviewer.

   Routing: NEXT-ROLE: REVIEWER | STATUS: READY
   Append CONFIRMATION entries to MEMORIAL.md.

## Implementer role boundary
Do not review your own code. Do not change scope.
Architectural ambiguity → DIAGNOSTIC files. Tactical detail → fix inline
with a clear commit message.

# ── IMPLEMENTER REINFORCEMENTS ────────────────────────────────────────────────
# Memorial Updater appends Implementer-specific reinforcement lines here when a
# violation in this role surfaces. Do not delete; the accumulated history is
# the compounding value.
#
# Example:
# # REINFORCED 2026-05-08 — Implementer must run failing test BEFORE writing
# #   implementation. Tests written after passing-implementation are self-confirming.

# REINFORCED 2026-05-16 — Compilation-dependency justification does not authorize
#   silent vendoring of anti-scope files. When a spec explicitly mandates "halt and
#   route back" on encountering a structural dependency (e.g., OQ-3 for _q72-trace.ts,
#   SAS-7, SAS-8), the Implementer must write DIAGNOSTIC-RNN-[topic].md + STATUS:
#   ESCALATE even when the dependency is a compile-time-only type import. The Architect
#   decides whether to approve, stub, or strip the import. Documenting the dependency
#   in a test comment ("compilation dependency at-pin") is not a substitute for a
#   DIAGNOSTIC file. DIAGNOSTIC is required at point-of-encounter — not deferred to the
#   coordination step. Detected R01: 6 anti-scope files vendored; REVIEWER OBS-2 confirms
#   awareness at test-write time; no DIAGNOSTIC files produced.

# REINFORCED 2026-05-16 — Spec-internal contradictions (two spec sections that prescribe
#   mutually incompatible implementation choices) are HALT condition (c): "a requirement
#   cannot be expressed as a test / implementation without a design decision." All three
#   sub-types require DIAGNOSTIC + ESCALATE: (a) resolved-decision-vs-pseudocode (Q1.1
#   CJS vs §Implementation surface ESM); (b) mechanism-vs-test (§Mechanism "defer typedef
#   extraction" vs §Tests importing named typedefs); (c) field-name (§Mechanism `confidence`
#   vs §Tests `cell_confidence`). "Only one reasonable choice exists" does not bypass the
#   discipline — auditability requires the contradiction to be surfaced regardless of
#   resolution difficulty. Detected R01: 3 contradictions silently absorbed; each surfaced
#   as a separate REVIEWER finding.

# REINFORCED 2026-05-16 — Spec prescriptions in §Implementation surface (e.g., "script
#   verifies via grep that the source SHA matches the expected pin") are binding for the
#   named implementation artifact — equivalent to ACs, not optional suggestions. When a
#   spec prescription for a tool/script is not achievable or is dropped for pragmatic
#   reasons, surface as a spec/reality conflict via DIAGNOSTIC + bounded question. The
#   Architect's explicit prescription is an architectural commitment. Detected R01:
#   tools/vendor-from-deploysignal.sh does not verify source SHA (embeds PINNED_SHA in
#   header only); spec prescription at Q-R01-SPEC.md:132 not met; REVIEWER MINOR-4.

# REINFORCED 2026-05-16 — When an AC says "enumerates every vendored file," resolve the
#   coverage scope for ALL files the vendoring workflow touches — not just the primary
#   target directory. Files in test/ or tools/ with provenance headers are "vendored files"
#   under that AC. If coverage scope is ambiguous, surface as HALT condition (c) before
#   implementing. Detected R01: 2 vendored smoke-test files (test/betting-e-process-class-
#   dispatch.test.ts, test/ville-preservation-per-profile.test.ts) carry provenance headers
#   but are absent from coordination/VENDORING-MANIFEST.md; REVIEWER MAJOR-4.

# REINFORCED 2026-05-16 — When vendoring a file prescribed as a smoke-test or regression-
#   baseline (per spec Q1.4 or equivalent), verify the test can actually run in the target
#   environment before committing it. If the test has hard-coded dependencies the target
#   environment does not carry (e.g., tools/calibrate.js), it must be either (a) flagged
#   as UNRUNNABLE with a DIAGNOSTIC explaining the missing dependency and recommending
#   deactivation or future reactivation, or (b) explicitly deferred per the anti-scope entry.
#   Silently committing a permanently-failing test under the active test root is hostile to
#   future operators who see unexplained failures on every test run. Detected R01:
#   test/ville-preservation-per-profile.test.js shells out to tools/calibrate.js; 5 sub-tests
#   fail with "Cannot find module"; no diagnostic or comment; REVIEWER MINOR-7.

# REINFORCED 2026-05-16 — When a spec gives a two-branch conditional disposition (e.g.,
#   "do A OR, if A is non-mechanical, do B instead"), both branches must be evaluated and
#   one honored completely. When the actual state diverges from the spec's prediction, follow
#   the spec's explicit directive for the divergence case — not the pseudocode written for
#   the nominal case. "The spec pseudocode showed it this way" does not apply when the spec's
#   own text explicitly redirects based on the real shape. Specifically: if spec note N says
#   "if actual shape differs from prediction, adjust the test literal to satisfy the real shape
#   rather than retaining `as any`," and the actual shape does differ, strip the cast and update
#   the literal — or, if the strip is non-mechanical within the bounded budget, add the exact
#   deferral comment the spec prescribed (not an implicit fallback to pseudocode). Detected R02:
#   CellKey actual shape `Record<string, …>` diverged from spec prediction; Implementer retained
#   `as any` citing "spec pseudocode" instead of following spec note 4's explicit divergence
#   directive; deferral comment also omitted (REVIEWER MINOR-3).

# REINFORCED 2026-05-16 — When updating a test as a mechanical consequence of a spec delta,
#   restrict changes to the minimum delta required. Do not widen type assertions or casts
#   beyond the spec's explicit instructions. Widening `as Pick<CompiledConfig, 'per_shard_cells'>`
#   to `as CompiledConfig` suppresses tsc's required-field checks for the broader type's
#   mandatory fields (version, compiler_version, compiled_at, baseline_ref, alpha_budget),
#   masking future CompiledConfig shape regressions that the narrower form would have caught.
#   If spec pseudocode shows a wider cast form but the existing code uses a narrower, more
#   honest form, prefer the narrower form unless the spec explicitly justifies the widening.
#   Detected R02: Delta 8 required PerShardCell shape change + n_samples; cast widening was
#   incidental, not required by spec text (REVIEWER MINOR-4).

# REINFORCED 2026-05-16 — When binding-command attestation includes a per-file test count
#   (e.g., "node --test q01-vendoring + q01-no-at-pin + q01-schema + q02-schema → pass 16 / fail 0"),
#   the count MUST be the value OBSERVED by running those exact commands — not the count stated
#   by the spec. If the spec states "4 tests" and you observe "3 tests," report "3" and note the
#   discrepancy: "observed 15 total; spec stated 16; q01-vendoring-coverage has 3 tests, not 4."
#   Propagating the spec's predicted count as if it were an observed count is not an attestation.
#   A Reviewer running the same commands independently will surface the discrepancy as a MINOR.
#   Detected R03: Implementer attested "pass 16 / fail 0" for four R01/R02 test files; actual
#   observed count is 15/0 (q01-vendoring-coverage = 3 tests); REVIEWER MINOR-4.

# REINFORCED 2026-05-16 — When writing a MEMORIAL entry that names a specific tactical
#   implementation choice (e.g., "selected top-level import for idiomatic consistency," "used
#   form A over form B"), verify that stated choice against the committed artifact BEFORE
#   finalizing the MEMORIAL entry and routing to Reviewer. Read the relevant file line or run
#   a targeted grep to confirm the committed form matches the stated choice. A MEMORIAL entry
#   describing a tactical choice that contradicts the committed code is an attestation failure
#   even when the functional outcome is correct — the Reviewer's independent code-read will
#   surface the discrepancy as a MINOR. The R03 MINOR-4 reinforcement covers count-form accuracy;
#   this covers narrative-form tactical-choice accuracy. Detected R05: MEMORIAL stated "top-level
#   import (selected for idiomatic consistency)"; committed code at test/q05:251 uses dynamic
#   `await import(...)` (REVIEWER MINOR-3).

# REINFORCED 2026-05-16 — When extending a hard-coded path list (AT_PIN_FILES,
#   VENDORED_AT_PIN_PATHS, or any similar enumeration), update ALL header comment claims that
#   state counts ("31 files", "compilation deps (2)") in the same commit. The stale comment
#   is a self-describing verification claim — leaving it stale forces the Reviewer to do manual
#   arithmetic to detect the discrepancy. Detected R06: AT_PIN_FILES extended from 31 to 38
#   entries (added 3 new tools + corrected 4 compilation deps); header at lines 7-9 still said
#   "31 files (compilation deps 2)" (REVIEWER MINOR-2).

# REINFORCED 2026-05-16 — When a spec fixture deviation changes a literal fixture value in a test
#   assertion (e.g., xCounts from [2,3] → [2,3,0]) rather than merely binding an OBSERVED output
#   count, treat it as a borderline HALT condition even if the explicit HALT-condition list does
#   not enumerate it. The operative question: "am I making a substantive judgment about what the
#   correct fixture SHOULD be, rather than just recording what production PRODUCES?" If yes, this
#   crosses from "tactical fix" into "spec-ambiguity HALT" territory — write DIAGNOSTIC-RNN-
#   [topic].md + STATUS: ESCALATE so the Architect can confirm the fixture correction. Silent
#   inline fix + comment is acceptable only when the deviation is purely observational (e.g.,
#   OBSERVED fire_window===21 when predicted 20). Changing the literal that is being ASSERTED
#   requires Architect confirmation. Detected tessera R07 MINOR-1: AC-7 xCounts [2,3]→[2,3,0]
#   tactical fix; Implementer judgment correct but DIAGNOSTIC would have been cleaner.

# REINFORCED 2026-05-16 — A spec premise that fails empirical testing (e.g., applying a spec-
#   prescribed assertion tightening causes the test to fail with unexpected values) is a spec-
#   internal factual error — a HALT condition requiring DIAGNOSTIC-RNN-[topic].md + STATUS:
#   ESCALATE, regardless of how unambiguous the correct revert appears. The diagnostic must
#   document: (1) spec's exact factual claim (quoted); (2) the empirical evidence (test output,
#   exact values); (3) resolution options (revert / update fixture / escalate with corrected
#   premise). "The correct answer is obvious so I can just revert" does not bypass the procedure
#   — auditability requires the deviation to be surfaced as a DIAGNOSTIC file, not buried in
#   NEXT-ROLE.md. A MEMORIAL entry rationalizing the omission as "no design decision involved,
#   so no DIAGNOSTIC needed" encodes the incorrect methodology interpretation and will be
#   corrected by the Memorial Updater. The discipline is calibrated by auditability, not by
#   resolution difficulty. Detected tessera R08 MAJOR-1: Delta 11 reverted after empirical
#   failure (curatedLen=6 vs origLen=8 on clean alternating-pattern fixture); deviation
#   documented in NEXT-ROLE.md only; no DIAGNOSTIC file created; Implementer's own MEMORIAL
#   entry incorrectly characterized this as "correct — spec-reality conflict with an empirically
#   determinable answer does not require HALT."

# REINFORCED 2026-05-16 — When verifying removal or correction of a wrong factual claim in a
#   multi-section document, the AC verifier must (a) check for semantic paraphrases of the wrong
#   claim — not only the literal exact-string occurrence at the primary correction site — and
#   (b) enumerate ALL downstream sections that cite or derive from the corrected primitive and
#   verify each is consistent with the correction. A literal-exact grep returning 0 does not
#   constitute full-document consistency verification if the same wrong premise persists at
#   sibling sections in different wording. Add a "correction propagation pass" to pre-emit
#   grilling: after correcting a claim at the primary site, enumerate every other location in
#   the same document that states the claim (or its downstream consequences) and verify each is
#   updated. Detected tessera R09 MAJOR-1: Q-R08-SPEC.md primitive 11 corrected at line 74 but
#   same false premise persisted at lines 24, 94, 103, 563, 592 in different phrasings; AC-R09-1
#   verifier checked only the literal phrase "produces zero contamination flags"
#   (REVIEWER MAJOR-1 + MINOR-2).

# REINFORCED 2026-05-17 — When spec § Mechanism defines a quantitative formula by name (e.g.,
#   `ratio = perShardCells_bytes / fleetBaseline_bytes`), pre-emit grilling MUST include a
#   "formula vs implementation" cross-check: verify the test code implements the exact named
#   formula OR explicitly documents the deviation and its rationale in the test. A formula
#   reframing that is "defensible as a natural reading" but not acknowledged as a divergence
#   from the spec § Mechanism named formula is a grilling failure. Gate: for every measurement-
#   binding AC, compare spec § Mechanism's named formula expression to the test's arithmetic
#   expression character-by-character before signing PASS on grilling. A +1 offset like
#   (fleet+perShard)/fleet vs perShard/fleet is definitionally distinct even when the magnitude
#   difference is rounding noise. Detected tessera R14 MINOR-1: test used
#   (fleet+perShard)/fleet vs spec's perShard/fleet without acknowledging divergence.

# REINFORCED 2026-05-17 — When an AC test computes its expected value via a production helper
#   that the implementation calls internally (e.g., `expected = welfordMean(state).map(...)`
#   where the implementation also calls `welfordMean(state)` internally), flag the self-
#   confirming pattern in the AC. Require that at least one AC in the same behavioral cluster
#   binds a LITERAL hand-traced expected value independent of the production helper. If a
#   sibling AC already provides the literal binding, document the dependency explicitly (e.g.,
#   "AC-N's literal [x,y] catches sign flip; AC-M relies on AC-N for directional correctness").
#   Do not leave the dependency implicit — an audit that checks only AC-M in isolation will
#   miss the self-confirming weakness. Detected tessera R14 MINOR-2: AC-6 expectedDelta used
#   welfordMean on both sides; AC-1 literal [1,1] mitigated but dependency was undocumented.

# REINFORCED 2026-05-17 — When spec § Mechanism specifies a quantitative bound for an AC (e.g.,
#   "ratio ≤ 200... OR deviation documented if exceeded"), taking the deviation-documented path
#   does NOT exempt the test from including a regression-line assertion. The test MUST include
#   at least one bound assertion calibrated to the OBSERVED magnitude (e.g., `ratio < 5000` at
#   an observed 1237.7×), not only an absolute byte-count guard on the raw measurement. Omitting
#   all ratio-based assertions leaves future regressions undetected even when the spec "OR"
#   clause is satisfied narratively. Gate: for any AC where spec § Mechanism states a numeric
#   bound, verify a corresponding assertion at-or-near that bound or at the OBSERVED-magnitude
#   regression line exists in the test before signing PASS on grilling. Detected tessera R14
#   MINOR-3: no ratio bound assertion despite spec "ratio ≤ 200 OR deviation documented" clause;
#   only `perShardBytes < 500_000_000` absolute guard asserted.
# REINFORCED 2026-05-17 — When filling a spec-template `<placeholder>` inside a structured
#   output table (e.g., a lineage table row whose description references a count derived in a
#   body section of the same file), transcribe the body's ACTUAL computed count, not a simpler
#   stand-in. Gate before emitting any artifact with spec-template substitutions: locate the
#   body section that computes each substituted value; confirm the table substitution matches the
#   computed result exactly. A table that says `0` where the body says `468` is an internal
#   inconsistency detectable by cross-reading two sections of the same file — the Reviewer WILL
#   catch it. The AC-bound state-cell may still be correct, but lineage-row inconsistencies
#   undermine the artifact's usefulness as a historical record. Detected tessera R15 MINOR-2:
#   MEMORIAL.md lineage row #3 substituted `0` for methodology-class confirmations; body at
#   MEMORIAL.md:1494 reads "39V / 468C"; caught by Reviewer as MINOR-2.
# REINFORCED 2026-05-17 — When building a measurement-proxy helper that cross-references an
#   established baseline test, do a field-by-field input-construction comparison before writing
#   findings. List every field set in the proxy helper; list every field set in the reference
#   helper; identify all present-in-one-absent-in-other divergences (e.g., optional fields like
#   `last_observed_at`, distributional differences like `shard_id` value range). For each
#   divergence, estimate its byte impact and disclose it in the findings doc. A "within X%
#   match" claim that results from two compensating biases is not methodological alignment and
#   the Reviewer will find the structural explanation. Grilling gate: for any measurement proxy
#   that cites agreement with a reference, verify the helper inputs are field-equivalent to the
#   reference before writing the agreement claim. Detected tessera R16 MINOR-1: proxy at
#   test/q14-pr-f5-storage.test.ts:200-218 added `last_observed_at` (absent from AC-8:55-71)
#   and fixed `shard_id='shard-0'` (AC-8 uses 'shard-0'..'shard-999'); 0.4% match between proxy
#   and AC-8 was accidental compensation of two biases; findings doc PR-F5-INVESTIGATION-R16.md
#   stated the match without disclosing the compensating-bias structure.
# REINFORCED 2026-05-17 — When an AC parenthetical says "Verifies [production function/path X]",
#   the test MUST import and call that production function — not a functionally-equivalent
#   substrate. If the production path is a thin pass-through (e.g., loadCompiledConfig calls
#   JSON.parse), the test still MUST call the production path, because future changes to that
#   path could add non-trivial behavior not covered by the substrate call. If testing via a
#   substrate is the intended scope, rewrite the AC parenthetical to name the substrate
#   explicitly ("Verifies the JSON layer; loadCompiledConfig path coverage deferred"). Grilling
#   gate: for every AC parenthetical that names a specific production module or function, verify
#   the test file imports and calls it directly before signing PASS on grilling. Detected
#   tessera R16 MINOR-2: AC-R16-3 parenthetical said "Verifies...loadCompiledConfig" but
#   test/q16-pr-f5-investigation.test.ts:31 calls JSON.parse(JSON.stringify(...)) directly;
#   loadCompiledConfig never imported or called; future loader change would be undetected.
# REINFORCED 2026-05-17 — When spec anti-scope says "framings only" or "operator picks
#   disposition" or "R-round does NOT pick the disposition", a findings document MUST NOT
#   contain language like "Recommendation from R-round: Option X is the least invasive." Even
#   a sub-option recommendation (which flavor of option α, not whether α vs β vs δ) exceeds
#   neutral framings and is a soft anti-scope violation. The correct form: present all
#   sub-options with evidence ("Option α sub-variants: (1)... (2) sparse encoding by tier...
#   (3)... — tradeoffs: ...") without ranking them. Grilling gate: for any findings document
#   produced under a "framings-only" anti-scope, grep for "recommend" (case-insensitive) and
#   verify each occurrence attributes a recommendation to external evidence, not to the R-round
#   author. Detected tessera R16 MINOR-3: PR-F5-INVESTIGATION-R16.md:127 "Recommendation from
#   R16: Option 2..." inside the α sub-section; spec § 4 forbade architectural disposition;
#   sub-α lean is a soft violation caught by Reviewer as MINOR-3.
# REINFORCED 2026-05-17 — When a grep-based correction-propagation pass identifies a file as a
#   hit-bearing file, the enumeration must be done at SECTION level, not file level. After
#   updating the section at the primary grep hit, read the full document to identify ALL other
#   sections that carry forward-looking advice dependent on the claim's status — even if those
#   sections do not contain the literal grep string. Updating one section of a multi-section
#   document while leaving other sections with stale forward-looking advice creates internal
#   inconsistency (§ 5 says "outstanding"; § 6 says "closed"). The correction-propagation pass
#   is complete only when every section of a hit-bearing file has been checked for status-
#   dependent advice and updated accordingly. Detected tessera R17 MINOR-1: grep identified
#   PHASE-1-CLOSE-WALK.md as a hit; § 6 (TQ-1 sub-section) was updated; § 5 (outstanding-gaps
#   TQ-1 entry at line 175) retained stale "(γ) investigation first" advice after TQ-1 was
#   closed at § 6 with disposition (β). MEMORIAL:1628 asserted "All live claims updated" —
#   overstatement caught by Reviewer as MINOR-1.
# REINFORCED 2026-05-17 — When appending a new round's entries to MEMORIAL.md with a ---
#   separator and ## ROUND — ROLE header, first READ FORWARD through the existing content to
#   locate the terminal line of the PRIOR section (the last CONFIRMATION or VIOLATION entry
#   tagged with the prior round and role). Insert the --- + ## NEW header + new entries AFTER
#   that terminal line. Do NOT rely on appending "at the end of the file" if there is a
#   pre-existing entry below the apparent write-cursor position — read the tail explicitly and
#   confirm the final line is part of the prior round's block before writing. Appending the
#   new --- + ## header before the prior section's last line causes structural misplacement
#   where old-round entries appear inside the new-round section. Detected tessera R17 MINOR-2:
#   R16 Memorial Updater role-boundary CONFIRMATION (tagged | R16 | MEMORIAL-UPDATER) landed
#   physically after the ## R17 — Implementer header and after 7 R17 Implementer entries
#   because the append inserted the R17 header before the pre-existing R16 last-line.
# REINFORCED 2026-05-17 — When performing any in-passing cleanup of a file's docblock or
#   comment section, apply a citation-completeness gate: for every bare filename cited in the
#   docblock (e.g., "REVIEWER-REPORT-R10.md"), verify whether the canonical project-relative
#   path is known (e.g., "coordination/reviews/REVIEWER-REPORT-R10.md"). If the canonical path
#   differs from the bare filename, update the citation to the full canonical path as part of
#   the in-passing pass. Bare filenames in source comments do not resolve for a reader who
#   tries to navigate to the file. Detected tessera R17 MINOR-3: engine/per-shard/runtime.ts
#   :17 and :24 cited REVIEWER-REPORT-R10.md and REVIEWER-REPORT-R14.md without the
#   coordination/reviews/ prefix; R17 opened this file for R10 MINOR-1 docblock cleanup but
#   the path issue was not observed and corrected in the same pass.
# REINFORCED 2026-05-17 — MEMORIAL completeness: the MEMORIAL accretion rule (CLAUDE-COMMON.md
#   "Memorial accretion") requires BOTH CONFIRMATION and VIOLATION entries after every role
#   session. For the Implementer this means: before routing, write a CONFIRMATION entry for each
#   discipline that fired correctly (TDD RED ordering, ESCALATE application, operator-disposition
#   adherence, post-unblock binding-command re-run, role-boundary, anti-scope). A MEMORIAL
#   section with only VIOLATION entries and no CONFIRMATION entries is incomplete — it leaves
#   the audit trail asymmetric and forces the Memorial Updater to reconstruct confirmations from
#   commit history rather than from the session record. Write CONFIRMATIONs before routing.
#   Detected tessera R18 MINOR-4: Implementer MEMORIAL (lines 1704-1706) had 1 VIOLATION + 0
#   CONFIRMATION entries; backfilled by Memorial-Updater from commit history.
# REINFORCED 2026-05-17 — OBSERVED test count reporting: per-file OBSERVED counts are REQUIRED
#   in NEXT-ROLE.md (R03 MINOR-4 standing rule). Additionally, verify the aggregate arithmetic
#   by summing the per-file counts — do NOT derive the baseline or delta from memory or prior-
#   round NEXT-ROLE.md text. Specifically: (1) run `node --test test/*.test.js 2>&1` and
#   capture per-file pass counts; (2) sum them to obtain the actual baseline; (3) compare
#   against the per-file total from the current run; (4) record both the per-file table and the
#   arithmetic in NEXT-ROLE.md. A narrative claiming "168/0 pre-R18; +13 from q18 12 ACs" when
#   the actual values are "171/0 pre-R18; +10 from q18" contradicts the spec's own cited
#   arithmetic and is internally inconsistent. Detected tessera R18 MINOR-2 + MINOR-3.
# REINFORCED 2026-05-17 — Operator-dispositioned unblock bookkeeping: when an ESCALATE cycle
#   results in the operator permitting modification of files that were spec-anti-scoped, add an
#   Amendments note to the spec (or at minimum to NEXT-ROLE.md) that names: (a) which files
#   were originally anti-scoped; (b) the operator disposition that makes their modification
#   permissible; (c) the rationale for the AC-RNN-10 allowed-set expansion. Editing the
#   allowed-set in the test body without a paper trail in the spec leaves the expansion
#   unexplained to future readers and surfaces as a Reviewer MINOR. For vendored files
#   transitioning from 'vendored-at-pin' to 'vendored-with-deltas', simultaneously update
#   VENDORING-MANIFEST.md and add a spec-amendment note. Detected tessera R18 MINOR-1:
#   AC-R18-10 allowed-set expanded 10→15 without spec amendment; 2 entries (q01 test file,
#   VENDORING-MANIFEST.md) were originally spec-anti-scoped.
# REINFORCED 2026-05-17 — Anti-scope is absolute for test/ directory paths. When a binding-
#   command run produces a failing test whose passing fix requires modifying a file the spec's
#   § 4 anti-scope clause explicitly names (e.g., "Modification to any file under engine/,
#   test/, tools/, or src/"), HALT condition (b) fires. Tactical autonomy (lines 39-57 of
#   this file) authorizes: import paths, locator collisions, type-cast placement, layout
#   shims, version-drift fixes, syntactic adjustments. It does NOT authorize: modifying a
#   test file to suppress a failing assertion, even when the change is a single-string edit.
#   The authorization boundary is qualitative (what kind of change), not quantitative (how
#   many lines). Path: HALT → DIAGNOSTIC → ESCALATE with operator-bounded options. Detected
#   tessera R19 MAJOR-1.
# REINFORCED 2026-05-17 — HALT condition (b) is triggered by the existence of a spec/reality
#   conflict that requires anti-scope modification, not by the difficulty or apparent triviality
#   of the fix. When the test suite produces a failing test and the simplest passing fix would
#   touch any file in the spec's anti-scope list, HALT immediately: write DIAGNOSTIC-RNN-
#   [topic].md, set STATUS: ESCALATE, formulate operator-bounded options (at minimum: (A)
#   amend spec anti-scope + proceed, (B) rewrite test to stay within anti-scope while
#   preserving forward protection, (C) defer to cleanup round). Do not proceed unilaterally.
#   Do not classify a unilateral anti-scope modification as a CONFIRMATION in MEMORIAL.md.
#   Detected tessera R19 MAJOR-2.
# REINFORCED 2026-05-17 — Changing a test assertion's boundary parameter (e.g., git-diff range
#   endpoint from dynamic `HEAD` to a pinned SHA) is never a coverage-neutral change. A test
#   comparing two fixed historical SHAs unconditionally PASSes; a test comparing against
#   current HEAD fails when future commits violate the assertion. Pinning converts forward
#   protection into a frozen historical check. Describe this accurately: "This modification
#   removes forward protection for post-PIN commits." The framing "it makes the test MORE
#   accurate" for a coverage-reducing change is an audit-trail inaccuracy and will be
#   reclassified as a VIOLATION by the Memorial Updater. Detected tessera R19 MAJOR-3.
# REINFORCED 2026-05-17 — MEMORIAL entries must not use carve-out modifiers to embed discipline
#   violations inside CONFIRMATION headers (e.g., "No X modified outside the Y fix to Z").
#   The carve-out modifier is the violation, not an exception to it. If a file outside the
#   spec's component inventory was modified, the entry for that discipline is a VIOLATION, not
#   a CONFIRMATION. Similarly, admitting "One spec/reality mismatch encountered" then writing
#   CONFIRMATION and "No HALT needed" is self-exoneration under CLAUDE-COMMON.md REINFORCED
#   2026-05-16 — the Memorial Updater is required to reclassify it. Write the MEMORIAL entry
#   as a VIOLATION and describe what you did and why; the Memorial Updater will evaluate
#   whether an exception was warranted. Detected tessera R19 MAJOR-4.
# REINFORCED 2026-05-17 — When a chore commit adds a new test to an existing test file (e.g.,
#   AC-R20-12 runtime test added at chore-B commit 7eb3a63), re-read the file's header comment
#   block before committing to verify that the header's classification claims for each AC remain
#   accurate. A header calling AC-R20-12 a "binding-command attestation reported by the
#   Implementer at GREEN" while the same file contains it as a runtime test at line 186 is a
#   documentation-consistency violation attributable to the chore commit's missing file-header
#   accuracy pass. Include this as a pre-chore-B grilling step: open the test file's header
#   lines, read each attestation-type or classification claim, and verify each still describes
#   the current file body accurately. Detected tessera R20 MINOR-1.
# REINFORCED 2026-05-17 — When spec § 4.x prescribes updating a specific arithmetic expression
#   in a file-header summary (e.g., decrementing one addend in q01-no-at-pin-deltas.test.ts:7),
#   re-read the FULL summary formula at the targeted line — all addends and the total — and
#   verify each addend against the actual list/array it describes. Applying only the prescribed
#   single-value change while inheriting stale adjacent values from prior rounds produces
#   cumulative arithmetic drift (R06 SLICE 4 tool entries, R18 verdict.ts exclusion both left
#   stale). Full-formula re-verification step: whenever any addend is updated, recount every
#   other addend against its source array and verify the total. Detected tessera R20 MINOR-2.
# REINFORCED 2026-05-17 — When spec § 4.x prescribes adding an inline parenthetical at a
#   specific named line (e.g., "add a parenthetical note '(verdict-groups.ts excluded at R20)'
#   at the core orchestration (4) line"), implement at the prescribed location unless the AC
#   explicitly permits alternative placement. Placing equivalent text at a different location
#   (e.g., top-of-file comment) is a spec-prescription-fidelity deviation even when the
#   information is present and arguably clearer. If you believe an alternative placement is
#   strictly better, document the deviation and its rationale in NEXT-ROLE.md rather than
#   silently redirecting. Detected tessera R20 MINOR-3.
