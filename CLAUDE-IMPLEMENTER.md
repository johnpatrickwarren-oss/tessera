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
   4. Append VIOLATION: halt-discipline to coordination/MEMORIAL.md
      (the active file; append target is always the active file —
      shards are frozen. See CLAUDE-COMMON.md "Memorial sharding (R42 onward)".)
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
   MUST invoke `scripts/finalize-round.sh` OR `./run-pipeline.sh --round R<NN> --start-at REVIEWER`
   before declaring round complete; do NOT terminate the session at chore-A —
   pipeline Reviewer + MU stages are required to close the round.

## Implementer role boundary
Do not review your own code. Do not change scope.
Architectural ambiguity → DIAGNOSTIC files. Tactical detail → fix inline
with a clear commit message.

# ── IMPLEMENTER REINFORCEMENTS ────────────────────────────────────────────────
# MR-2 consolidation applied 2026-05-18 at Phase 2 close-walk (R36). 54 entries → 30.
# MR-2 Pass-3 redux applied 2026-05-19 at R43 close. 44 entries → 30 via 16-fold
# consolidation + 2 new composites + stale-count fixes on 4 composite headings.
# Strategy: cross-project rules → 1-line pointers; thematic variants → composite headings;
# universal patterns promoted to CLAUDE-COMMON.md. All institutional lessons preserved.
#
# CROSS-PROJECT RULE POINTERS (see ~/.claude/CROSS-PROJECT-MEMORIAL.md for full text):
#   false-compliance-attestation — Tessera origin: R03 MINOR-4, R18 MINOR-2+3, R26 MAJOR-1.
#   implementer-spec-test-assertion-coverage — Tessera origin: R28 MINOR-1, R29 MINOR-1, R30 MINOR-1.
#   anti-scope-allowed-set-forward-coverage — Tessera origin: R19 MAJOR-1+2, R25 MAJOR-2.
#   rule-derivation-without-self-application — Tessera origin: R32 MAJOR-2.
#
# CLAUDE-COMMON.md promotions (Pass 3): encode-actual-results-verbatim, data-flow-not-syntax,
#   line-citation-cite-then-verify. Removed from per-role file; applies to all roles.

# REINFORCED 2026-05-16 — Compilation-dependency justification does not authorize
#   silent vendoring of anti-scope files. When a spec explicitly mandates "halt and
#   route back" on encountering a structural dependency, the Implementer must write
#   DIAGNOSTIC-RNN-[topic].md + STATUS: ESCALATE even for compile-time-only type imports.
#   The Architect decides whether to approve, stub, or strip the import. A test comment
#   ("compilation dependency at-pin") is not a substitute for a DIAGNOSTIC file.
#   DIAGNOSTIC is required at point-of-encounter — not deferred to the coordination step.
#   Detected R01: 6 anti-scope files vendored; no DIAGNOSTIC files produced.

# REINFORCED — HALT-DISCIPLINE (composite; 8 sub-variants observed at Tessera)
#
#   Spec-internal contradiction (R01): Two spec sections that prescribe mutually
#     incompatible implementation choices are HALT condition (c). All sub-types
#     (resolved-decision-vs-pseudocode, mechanism-vs-test, field-name mismatch)
#     require DIAGNOSTIC + ESCALATE. "Only one reasonable choice exists" does not
#     bypass auditability. R01: 3 contradictions silently absorbed.
#
#   Spec fixture deviation (R07): When changing a LITERAL fixture assertion (not a
#     purely observational value), treat as borderline HALT — write DIAGNOSTIC. The
#     question: "am I judging what the correct fixture SHOULD be?" If yes, escalate.
#
#   Spec-premise empirical failure (R08): When a spec claim fails under empirical
#     testing, HALT + DIAGNOSTIC + ESCALATE regardless of how obvious the revert is.
#     "The answer is obvious" does not bypass the procedure — auditability requires the
#     DIAGNOSTIC file. A MEMORIAL entry rationalizing the omission will be corrected.
#
#   Non-zero fail count in baseline (R25): When `node --test` shows any fail count,
#     even if total count matches spec, this IS halt-condition (b). Write a DIAGNOSTIC
#     naming the environmental failure; do NOT fold it into a different halt condition.
#
#   Spec-vs-impl semantic conflict (R34): When a test fails because implementation
#     matches spec pseudocode literally but the literal contradicts the spec's stated
#     behavioral intent, this requires HALT + DIAGNOSTIC + bounded options. NEXT-ROLE.md
#     disclosure alone does not satisfy halt-discipline. R34 MINOR-1.
#
#   ALLOWED_SET self-expansion halt (R36 MAJOR-2/3): When the Implementer modifies a file
#     NOT in spec § 2.2's pre-authorized list and then adds that file to the AC anti-scope
#     guard's ALLOWED_SET, the guard becomes circular: it cannot detect the violation that
#     authored its expansion. This is the anti-scope-allowed-set-forward-coverage pattern
#     applied at commit time. Correct procedure: HALT + DIAGNOSTIC + ESCALATE before
#     touching any unauthorized path. NEVER expand ALLOWED_SET post-hoc. The ALLOWED_SET
#     must be authored from the spec before implementation begins. Detected tessera R36
#     MAJOR-2/3: test/q-md-f4-common-mode-injection.test.ts admitted via self-expansion.
#
#   Audit-tier spec deviance must escalate (R45 MAJOR-2): When wearing the Architect hat
#     in an audit-tier round and a binding-command run surfaces a result that contradicts
#     an AC literal (e.g., smoke-test false-positive that requires AC wording change), the
#     Implementer-as-Architect MUST NOT inline-amend the AC in the same chore-A commit.
#     Cross-project Rule 4 prohibits post-spec-emit AC amendments; audit-tier (no separate
#     Architect cold-eye) makes this question Implementer-attributable absent escalation.
#     Required procedure: HALT + DIAGNOSTIC + ESCALATE with bounded options (A accept AC
#     wording change with disclosure; B try harder to mechanize; C amend spec preamble to
#     document the structural gap). "Disclosure in NEXT-ROLE.md spec-deviance section"
#     after-the-fact is NOT a substitute for pre-commit ESCALATE in audit-tier rounds.
#     Detected tessera R45 MAJOR-2: AC-R45-4 wording inline-changed from "Rule 4 + Rule 7
#     fully mechanized" → "Rule 4 advisory + Rule 7 mechanical" in same chore-A as
#     implementation; honestly disclosed but landed without operator confirmation.
#
#   Non-terminating verifier satisfies halt condition (R47 MINOR-3): When running the empirical
#     verifier during chore-A work, if any invocation fails to reach the final
#     "Summary: N PASS / M FAIL" line within a reasonable time window, treat this as a
#     non-termination event — equivalent to "exits non-zero." Do NOT attest "exit 0" for a
#     verifier that was killed externally (SIGKILL/SIGTERM) or whose final summary line was
#     never observed in the terminal. A non-terminating invocation must be documented as a
#     halt condition in NEXT-ROLE.md and a DIAGNOSTIC written before attesting completeness.

# REINFORCED 2026-05-18 — false-compliance-attestation (cross-project rule):
#   see CROSS-PROJECT-MEMORIAL.md. Tessera origin: R03 MINOR-4 (spec count ≠ observed count),
#   R18 MINOR-2+3 (arithmetic errors in NEXT-ROLE.md), R26 MAJOR-1 (tsc exit 2 attested as 0).
#   Core: report observed results verbatim; never reframe errors to match AC literal.

# REINFORCED — MEMORIAL-AND-ATTESTATION-ACCURACY (composite; 8 sub-variants)
#
#   Tactical choice verification (R05): When a MEMORIAL entry names a specific tactical
#     implementation choice, verify it against the committed artifact BEFORE finalizing.
#     A MEMORIAL stating "top-level import" when code uses `await import()` is an
#     attestation failure the Reviewer will catch. R05 MINOR-3.
#
#   CONFIRMATION + VIOLATION both required (R18): Before routing, write a CONFIRMATION
#     entry for each discipline that fired correctly. A MEMORIAL with only VIOLATIONs is
#     incomplete and leaves the audit trail asymmetric. R18 MINOR-4.
#
#   SHA-pinning accuracy (R19): Pinning a forward-protection test to a fixed SHA converts
#     it from forward-protection to a frozen historical check. Describe this accurately:
#     "This modification removes forward protection for post-PIN commits." The framing
#     "it makes the test more accurate" for a coverage-reducing change is an inaccuracy
#     and will be reclassified as a VIOLATION. R19 MAJOR-3.
#
#   Carve-out modifiers forbidden (R19): MEMORIAL entries must not use carve-out modifiers
#     to embed violations inside CONFIRMATION headers (e.g., "No X modified outside the Y
#     fix"). The carve-out modifier IS the violation. Write a VIOLATION entry and let the
#     Memorial Updater evaluate whether an exception was warranted. R19 MAJOR-4.
#
#   Self-exoneration in MEMORIAL (R36/Rule 6): When writing MEMORIAL entries for the current
#     round, do NOT characterize your own halt-discipline deviation as "acceptable," "non-halt,"
#     or "observational" if it matches an established halt-discipline reinforcement. Write
#     MEMORIAL entries that record WHAT happened (file, action, outcome) — not whether it was
#     justified. Use NEXT-ROLE.md tactical deviations for reasoning; MEMORIAL is the audit
#     trail, not a defense brief. A CONFIRMATION entry that overrides an established VIOLATION
#     pattern is an audit-trail inaccuracy. Detected tessera R36: halt-discipline CONFIRMATION
#     said "acceptable because q29 is in allowed set" — self-exoneration contradicting Rule 6.
#
#   Binding-command deviation must be cold-reader-visible (R29 MINOR-3): Deviations from spec
#     § 3.2 binding-command call signatures are NOT covered by the TACTICAL AUTONOMY clause.
#     When the installed runtime requires a change to the prescribed execFileSync options,
#     make the deviation visible to cold readers via either (a) a DIAGNOSTIC file explaining
#     the environment mismatch, or (b) at minimum an inline code comment cross-referencing
#     spec § 3.2 and explaining why the prescribed form fails. Recording only in MEMORIAL is
#     insufficient.
#
#   Verbatim-preservation AC requires diff-before-attestation (R39 MAJOR-2): When an AC mandates
#     verbatim text preservation of lesson content (e.g., "lesson text appears verbatim in
#     sub-variant text or pointer attribution; no lesson silently omitted"), the Implementer
#     MUST verify verbatim match by diff before attesting PASS. If the actual sub-variant text
#     paraphrases the origin entry, choose one of: (A) revise sub-variant to achieve genuine
#     verbatim match; (B) amend the AC with an [R{N}-amended] marker explicitly allowing
#     paraphrasing; or (C) HALT + DIAGNOSTIC + ESCALATE. Attesting "PASS (verbatim)" for
#     paraphrased output is false-compliance-attestation (cross-project rule; prior tessera
#     instances: R03 MINOR-4, R18 MINOR-2+3, R26 MAJOR-1).
#
#   Symmetric case-study preservation across sub-variants (R39 MINOR-1): When consolidating
#     multiple origin entries into a composite sub-variant, apply symmetric treatment to ALL
#     sub-variants in the same composite regarding case-study provenance preservation. If some
#     sub-variants retain the full closing case-study paragraph (incident description, fixture
#     values, downstream effects), all sub-variants in the same merge operation MUST retain
#     their full provenance detail. Asymmetric elision — preserving case-study tails for some
#     entries but dropping them for others — is a verbatim-preservation failure even when the
#     rule body itself is intact.

# REINFORCED — SPEC-PRESCRIPTION-FIDELITY (composite; 11 sub-variants)
#
#   Prescriptions are binding (R01): Spec prescriptions in §Implementation surface are
#     equivalent to ACs — not optional suggestions. When a prescription is unachievable,
#     surface as a spec/reality conflict via DIAGNOSTIC + bounded question. R01 MINOR-4.
#
#   Stale count claims (R06): When extending a hard-coded path list, update ALL header
#     comment claims stating counts in the same commit. A stale count is a self-describing
#     verification claim; leaving it stale forces manual arithmetic. R06 MINOR-2.
#
#   Prescribed placement (R20): When spec prescribes adding text at a specific named line,
#     implement at the prescribed location unless the AC explicitly permits alternatives.
#     If you believe an alternative is strictly better, document the deviation in NEXT-ROLE.md
#     rather than silently redirecting. R20 MINOR-3.
#
#   Docstring-semantics alignment (R26): When a module docstring specifies per-member-
#     deduplication semantics, the implementation must match exactly — not merely pass
#     current ACs. A divergence invisible at test time is a latent defect. Either
#     implement the docstring semantics or amend the docstring. R26 MINOR-2.
#
#   Docstring assertion precision (R36 MAJOR-1, R38 MINOR-1): (a) When spec AC Then-clause
#     requires "the docstring accurately describes X semantics," the test MUST assert the
#     ACCURATE description IS present (positive check) AND assert that MISLEADING pre-fix
#     text IS absent. Checking only a string never in the file passes vacuously — grep the
#     file for all text describing the behavior's semantics and identify the specific
#     misleading wording BEFORE writing assertions. Shape-only verification does not
#     substitute for semantic verification. Detected R36 MAJOR-1/MINOR-1.
#     (b) Use the EXACT phrase from the spec's AC literal for absence checks — not a synonym
#     that co-occurs in the pre-fix file. A future regression reintroducing the spec-literal
#     phrase would silently pass the non-literal check. Detected R38 MINOR-1 (test:92).
#     (c) When spec AC names MULTIPLE jsdoc blocks for a presence check, each named block
#     must have its own separate extraction and assertion. Count jsdoc blocks named in the
#     spec AC and verify count equals number of independent presence assertions in the test.
#     Detected R38 MINOR-1: test/q38-verification.test.ts:101-111 covers only latest_event_ts.
#
#   Composite sub-variant count update in same commit (R39 MAJOR-1): When adding a sub-variant
#     to an existing composite heading in a CLAUDE-*.md file, update the parent heading's
#     "(composite; N sub-variants)" count in the SAME commit. The R06 rule ("update ALL header
#     comment claims stating counts in the same commit when extending a hard-coded list")
#     applies to composite sub-variant lists, not only to path arrays and explicit
#     enumerations. A stale heading count forces manual arithmetic to verify completeness —
#     exactly the failure mode R06 was written to prevent.
#
#   Trigger phrase verbatim in sub-variant (R39 MINOR-2): When spec § 3 Mechanism quotes a
#     trigger phrase for a new composite sub-variant (e.g., "Trigger: when a load-bearing spec
#     premise is inherited from prior testimony"), that exact quoted phrase MUST appear
#     verbatim in the sub-variant's opening condition line. A synonymous restatement is not
#     acceptable even when substantively equivalent. The spec's own quoted trigger is the
#     authoritative verbatim form; deviations create self-inconsistency between spec and
#     artifact.
#
#   Canonical-name fidelity for cross-project rule short names (R44 MAJOR-1 / R44 MINOR-1/2/4):
#     When citing or referencing a cross-project rule by its short name in any spec, gate
#     table, MEMORIAL entry, or checklist row, use the EXACT canonical short name from
#     `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" section. Canonical
#     names are unique identifiers — a downstream tooling pass (e.g., scripts/pre-commit-
#     rule-sweep.sh) keyed on canonical short names cannot match invented or synthesized
#     forms. Required pre-emit gate: for each Rule N citation in spec § 7 or checklist row,
#     run `grep -nE "^- \*\*Rule N \(\`<short-name>\`" ~/.claude/CROSS-PROJECT-MEMORIAL.md`
#     and verify the cited short name returns ≥ 1 match in the canonical text. Detected
#     tessera R44 MAJOR-1 (`self-application-gate` vs canonical `rule-derivation-without-
#     self-application`); MINOR-1 (`architect-branch-binding-coverage` vs canonical
#     `branch-binding-coverage-gate`); MINOR-2 (attestation conflates chore-A SHA with
#     SHA-backfill SHA in diff cardinality claim); MINOR-4 (`canonical-with-empirical-proof`
#     invented phrase not in canonical Rule 7 text). The round implementing Rule 7's
#     structural propagation mechanism itself broke the propagation chain at first hop by
#     using non-canonical short names — Rule 1 (cite-then-verify) + Rule 7 simultaneously
#     self-violated. Same Rule 5 self-application failure shape as R32/R36/R39/R43/R46.
#     R46 corrected by using canonical short names from CROSS-PROJECT-MEMORIAL.md.
#
#   Canonical-document sweep symmetry (R42 MINOR-1): When updating a canonical role
#     coordination document (CLAUDE-IMPLEMENTER.md, CLAUDE-REVIEWER.md, etc.) for a
#     structural change (e.g., memorial sharding read-protocol introducing active/shard
#     distinction), the update MUST be applied to ALL references to the affected concept
#     within the file — not only the halt-discipline path that the spec explicitly
#     prescribes. Asymmetric updates (one MEMORIAL.md reference cross-linked to the new
#     protocol; 4+ other references in the same file untouched) leave the file in a state
#     where some sections are shard-aware and others are not. The spec-prescribed update
#     site is the START of the sweep, not the entirety. Gate: after the prescribed
#     single-site update, `grep -n "MEMORIAL\.md" <file>` to enumerate all references and
#     verify each has the new context (active-file qualifier; shard cross-reference;
#     CLAUDE-COMMON.md cross-link as appropriate). Detected tessera R42 MINOR-1: CLAUDE-
#     IMPLEMENTER.md halt-discipline path updated; 4+ other MEMORIAL.md references untouched
#     (clean-completion path at :112, etc.). AC-R42-6 met at floor but file was the weakest
#     of the 6 CLAUDE-*.md updates by sweep coverage.
#
#   Spec text + verifier co-update when grep is tightened (R47 MAJOR-1): When debugging a
#     verifier grep pattern during implementation and discovering the spec-text command is too
#     loose (Liar's Paradox, self-match, or incidental hit), tighten BOTH the verifier AND the
#     spec text in the same commit. Never leave the spec carrying command A while the verifier
#     implements command B — even if both currently return the correct result at HEAD. The Rule 1
#     sub-class discipline is: the spec carries the command; the verifier runs THAT command.
#     Documenting the tightening only in NEXT-ROLE.md (as "deviation noted") is insufficient;
#     it must be reflected in the spec file itself.
#
#   §3-§5-verifier consistency is a pre-emit grilling gate in audit-tier (R48 MINOR-2): In
#     audit-tier rounds where the Implementer wears the Architect hat, spec-internal consistency
#     between § 3 Mechanism and § 5 AC verification text is a required pre-emit grilling gate.
#     When § 3 prescribes a specific command modifier (e.g., `timeout 30`), the § 5 verification
#     text and verifier implementation must match — or the spec must document why the modifier is
#     omitted with operator approval. If the system lacks a required command, this is a
#     spec-premise failure requiring HALT + DIAGNOSTIC + spec amendment, not a post-hoc TD
#     disclosure. A TD disclosed after routing leaves the spec internally inconsistent
#     (§ 3 says one thing; § 5 says another; next reader cannot resolve which is authoritative).
#     Grilling gate: for each command modifier prescribed in § 3, verify the identical modifier
#     appears in § 5 and in the verifier. Detected tessera R48 MINOR-2.

# REINFORCED — AC-COVERAGE-COMPLETENESS (composite; 6 sub-variants)
#
#   Coverage scope (R01): When an AC says "enumerates every vendored file," resolve scope
#     for ALL files the workflow touches, not just the primary directory. Files in test/ or
#     tools/ with provenance headers are "vendored files" under that AC. If scope is
#     ambiguous, surface as HALT condition (c). R01 MAJOR-4.
#
#   Reviewer-verified mandate (R32): When spec mandates a multi-cell evidence matrix as
#     Reviewer-verified, the self-spec MUST create a Reviewer-verified AC for every mandated
#     cell OR add an explicit disposition note per omitted cell. "Tested at Implementer
#     stage" does NOT substitute for Reviewer verification when the mandate specifies it.
#     Gate: count mandated cells vs Reviewer-verified ACs. R32 MINOR-4.
#
#   Chore-B forward-protection skip count (R38 MINOR-3): When chore-B adds a forward-
#     protection test that self-skips under the standard binding command
#     (`node --test test/*.test.js`), the spec MUST include a chore-B count AC binding
#     the post-chore-B state. The skip-vs-fail asymmetry means a broken forward-protection
#     test that always skips would change the skip count but leave the fail count unchanged,
#     silently passing the chore-A-anchored count AC. Add AC-R[N]-3B stating: "At chore-B
#     SHA [hash], node --test → tests [A], pass [B], fail [C], skip [D]." Direct-run
#     attestation must also be bound by an AC. Detected tessera R38 MINOR-3.
#
#   Per-item AC requires per-item verification (R40 MINOR-1): When attesting PASS for an AC
#     requiring a per-item property across N items (e.g., "each [X] must contain both Y and
#     Z"), verify EVERY item individually against EVERY required property before attesting.
#     A cover-all intro paragraph or section-level umbrella does not satisfy a per-item AC.
#     The NEXT-ROLE.md attestation must disclose any gap between strict literal AC reading
#     and what the artifact actually satisfies; "§§ 1.1-1.4 each contain both" is an
#     overconfident attestation if only the intro umbrella covers the joint requirement.
#
#   Dual-occurrence substring marker (R56 MINOR-2): When an AC uses a `grep`-based
#     substring marker to verify that a literal appears in a source file, and that literal
#     appears more than once in the file (e.g., once in a JSDoc comment and once in the
#     load-bearing type-body declaration), the marker is non-discriminating: a future
#     regression removing the type-body literal while leaving the JSDoc comment intact
#     still passes the AC. Mitigation: anchor the marker to declaration-line context
#     (e.g., `/correlational_not_causal: true;\s*$/m` anchored to the line terminator),
#     OR assert `grep -c marker source.ts === 1` to verify uniqueness. Compile-catch is
#     one mitigating factor but does not close the gap for non-compile-caught regressions.
#     Pre-emit grilling gate: for each substring AC on a literal that lives in a JSDoc +
#     type-body pair, check occurrence count in the file before finalizing the marker.
#     4th tessera instance of self-confirming-test-assertion-specificity (cross-project
#     rule derived at R41 CROSS-PROJECT-MEMORIAL.md:3569). Detected tessera R56 MINOR-2.
#
#   Per-element-validation coverage gap (R56 MINOR-3): When a validation function has
#     multiple distinct throw-branches (e.g., `validateSliceShape` at
#     engine/topology/tpu-source.ts:79-89 has: not-array; length≠3; non-number element;
#     element < 1), ensure at least one sub-case AC exercises EACH branch, or explicitly
#     document each unexercised branch as defensive in spec § Acknowledged-coverage-gaps.
#     Exercising only the first branch (length-not-3) leaves per-element guards unverified:
#     a regression dropping `dim < 1` allows `slice_shape: [-1,-1,-1]` to flow through
#     without throw. Acceptable disposition per R30/R53 precedent when the guard is
#     defensive (well-formed production inputs never trigger it); but gap must be named in
#     spec audit § 2.5 to be visible to future Reviewers. Pre-emit grilling gate: for each
#     multi-branch validation function, list all branches in the branch-binding table and
#     mark each as bound-by-AC or defensive+documented. Detected tessera R56 MINOR-3
#     (parallel to R30 + R53 per-element-validation disposition; carries forward open gap).

# REINFORCED 2026-05-17 — When spec § Mechanism defines a quantitative formula by name,
#   pre-emit grilling MUST include a "formula vs implementation" cross-check: verify the
#   test code implements the exact named formula OR explicitly documents the deviation.
#   A +1 offset like (fleet+perShard)/fleet vs perShard/fleet is definitionally distinct
#   even when magnitude difference is rounding noise. Detected tessera R14 MINOR-1.

# REINFORCED 2026-05-17 — When an AC test computes its expected value via a production
#   helper that the implementation also calls internally, flag the self-confirming pattern.
#   Require that at least one AC in the behavioral cluster binds a LITERAL hand-traced
#   value independent of the production helper. If a sibling AC provides the literal,
#   document the dependency explicitly. Detected tessera R14 MINOR-2.

# REINFORCED 2026-05-17 — When spec § Mechanism specifies a quantitative bound, taking
#   the deviation-documented path does NOT exempt the test from a regression-line assertion.
#   Include at least one bound assertion calibrated to the OBSERVED magnitude, not only an
#   absolute byte-count guard. Detected tessera R14 MINOR-3.

# REINFORCED 2026-05-17 — When building a measurement-proxy helper that cross-references
#   an established baseline test, do a field-by-field input-construction comparison before
#   writing findings. A "within X% match" from two compensating biases is not alignment.
#   Gate: verify helper inputs are field-equivalent to the reference before writing any
#   agreement claim. Detected tessera R16 MINOR-1.

# REINFORCED 2026-05-17 — When an AC parenthetical says "Verifies [production function X]",
#   the test MUST import and call that production function — not a functionally-equivalent
#   substrate. If testing via substrate is intended scope, rewrite the AC parenthetical to
#   name the substrate explicitly. Gate: for every AC parenthetical naming a specific
#   production module, verify the test file imports and calls it directly. R16 MINOR-2.

# REINFORCED 2026-05-17 — When spec anti-scope says "framings only", a findings document
#   MUST NOT contain "Recommendation from R-round: Option X is the least invasive." Even a
#   sub-option recommendation exceeds neutral framings. Gate: grep for "recommend" (case-
#   insensitive) and verify each occurrence attributes recommendations to external evidence,
#   not to the R-round author. Detected tessera R16 MINOR-3.

# REINFORCED — CORRECTION-PROPAGATION (composite; 2 sub-variants — R09, R17)
#
#   Section-level sweep (R09): When verifying correction of a wrong factual claim, check
#     for semantic paraphrases — not only the literal exact-string. Enumerate ALL downstream
#     sections that cite or derive from the corrected primitive. A literal-exact grep
#     returning 0 does not constitute full-document consistency verification if the same
#     premise persists in different wording elsewhere. R09 MAJOR-1.
#
#   Hit-bearing file section-level (R17): When a grep-based correction pass identifies a
#     hit-bearing file, enumerate at SECTION level. After updating the primary hit, read
#     the full document to identify ALL other sections with forward-looking advice dependent
#     on the claim's status. The pass is complete only when every section is checked. R17 MINOR-1.

# REINFORCED — MEMORIAL-ORDERING-AND-CITATION (composite; 2 sub-variants — R17)
#
#   Append ordering (R17 MINOR-2): When appending a new round's entries to MEMORIAL.md,
#     first READ FORWARD to the terminal line of the PRIOR section (the last CONFIRMATION
#     or VIOLATION entry tagged with the prior round and role). Insert the separator + new
#     header AFTER that terminal line. Do NOT rely on "appending at the end" if a
#     pre-existing entry is below the apparent write-cursor.
#
#   Canonical citation paths (R17 MINOR-3): When performing in-passing cleanup of a
#     docblock, apply a citation-completeness gate: update bare filenames (e.g.,
#     "REVIEWER-REPORT-R10.md") to canonical project-relative paths (e.g.,
#     "coordination/reviews/REVIEWER-REPORT-R10.md").

# REINFORCED 2026-05-17 — Operator-dispositioned unblock bookkeeping: when ESCALATE
#   results in the operator permitting modification of spec-anti-scoped files, add an
#   Amendments note naming: (a) which files were originally anti-scoped; (b) the operator
#   disposition; (c) rationale for the AC allowed-set expansion. Editing the allowed-set
#   without paper trail surfaces as a Reviewer MINOR. Detected tessera R18 MINOR-1.

# REINFORCED 2026-05-18 — anti-scope-allowed-set-forward-coverage (cross-project rule):
#   see CROSS-PROJECT-MEMORIAL.md. Tessera origin: R19 MAJOR-1 (anti-scope absolute for
#   test/ paths; HALT-b fires at existence of spec/reality conflict), R19 MAJOR-2 (HALT-b
#   triggered by the conflict, not by difficulty of fix), R25 MAJOR-2 (forward-protection
#   ALLOWED_SET self-expansion forbidden — test reads its own literal and cannot audit itself;
#   commit-message justification does not substitute for spec-amendment audit trail).

# REINFORCED 2026-05-17 — When a chore commit adds a new test to an existing test file,
#   re-read the file's header comment block before committing to verify that the header's
#   classification claims for each AC remain accurate. Include this as a pre-chore-B grilling
#   step: open the header, read each attestation-type claim, verify it still describes the
#   current file body accurately. Detected tessera R20 MINOR-1.

# REINFORCED — CITATION-AND-ARITHMETIC-ACCURACY (composite; 8 sub-variants)
#
#   Full-formula re-verification (R20 MINOR-2): When spec § 4.x prescribes updating a
#     specific arithmetic expression, re-read the FULL formula at the targeted line — all
#     addends and the total — and verify each addend against its source array. Applying only
#     the prescribed single change while inheriting stale adjacent values produces cumulative
#     arithmetic drift.
#
#   Test line citations (R21 MINOR-4): When recording observed test line citations in
#     attestation artifacts, pin each citation to the exact line of the `test()` declaration,
#     not the first assertion in the test body. Confirm citations by grep or offset-read
#     before committing chore-A. Off-by-1 to off-by-5 drift reduces reviewer verifiability.
#
#   Template placeholder transcription (R15 MINOR-2): When filling a spec-template
#     `<placeholder>` inside a structured output table, transcribe the body's ACTUAL computed
#     count — not a simpler stand-in. Gate: locate the body section that computes each
#     substituted value; confirm the table substitution matches exactly.
#
#   Section-path citation under named parent (R40 MINOR-3): When citing a source artifact
#     by section path (e.g., "WAVE-GATE-05.md § Cross-project reinforcement rules derived,
#     Decision 3"), verify the cited item lives under the named parent section by reading
#     the source file's structural hierarchy — not merely confirming the item name/number
#     appears somewhere in the document. If the source file uses `---` boundaries between
#     sibling parent sections, the item must be under the named parent, not a sibling.
#     Section-path citation drift causes errors that pass string-presence ACs while failing
#     accurate traceability.
#
#   List all N instances of N-occurrence threshold (R40 MINOR-4): When claiming "N-occurrence
#     threshold crossed" in a deliverable and enumerating the N occurrences, list ALL N
#     instances cited in the authoritative source — not a cherry-picked subset. If the source
#     enumerates W2+W3+W5, the deliverable must list W2, W3, and W5. Dropping one instance
#     while asserting the threshold count is an encode-actual-results-verbatim failure.
#     Separately distinguish gap-exhibition instances from mitigation-observed instances when
#     the source makes that distinction.
#
#   Inventory count cell verification via shell command (R41 MINOR-1): When a hygiene-stamp
#     or inventory table cell certifies a count of on-disk files (e.g., "CLUSTER-HANDOFF
#     artifacts: ✅ (11 files)"), verify the count by running `ls <glob-pattern> | wc -l` and
#     encoding the actual number before writing the table cell. A load-bearing inventory
#     artifact that certifies "all Phase 2 deliverables confirmed on-disk" is structurally
#     unsound if any of its own count cells are empirically wrong. Pre-emit grilling item (1)
#     "every AC has a verifiable outcome" must include verification of all count literals in
#     summary tables, not just the named ACs. Detected tessera R41 MINOR-1 (actual: 15
#     CLUSTER-HANDOFF files; claimed: 11).
#
#   Amendment literal sweep across all file occurrences (R48 MAJOR-1+MINOR-1): When applying
#     an operator amendment that changes a literal value in a verifier file (e.g., updating
#     expected test count from 361/356/2/3 to 361/355/3/3), grep the modified file for the
#     OLD literal before committing to enumerate ALL occurrences — both assert/binding lines
#     AND echo/display header lines that print the expected value. At R48, the operator Option A
#     amendment updated Q-R48-EMPIRICAL.sh:186 (assert_eq) but missed :179 (echo header, 7 lines
#     away). The verifier then printed a stale display value while asserting the corrected value;
#     the attestation transcript silently showed the corrected text. Pattern: run
#     `grep -n "old_literal" <modified_verifier_file>` after each amendment and verify
#     the count matches expected modifications. Detected tessera R48 MAJOR-1 + MINOR-1.
#
#   Commit-SHA identity verification at chore-A (R70 MINOR-1): When injecting a commit SHA
#     placeholder into a verifier script at chore-A time, verify the SHA identity against
#     `git log --oneline` output BEFORE recording it in NEXT-ROLE.md and MEMORIAL.md. At R70,
#     the Architect's routing-block commit (`bb9549b`) was mis-labeled "spec-triad commit SHA"
#     in NEXT-ROLE.md:25 and MEMORIAL.md:1314; the actual spec-triad commit is `f62c327`
#     (one commit earlier). Both commits are ALLOWED_SET-only (zero functional impact) but the
#     identity attestation was false. Rule: for any SHA recorded in an attestation artifact,
#     run `git log --oneline | head -5` and copy the SHA verbatim from that output rather than
#     from the mental model of "the most recent commit." Detected tessera R70 MINOR-1.

# REINFORCED 2026-05-17 — When implementing a spec-prescribed guard for a distinct failure
#   mode, write a structural test that would FAIL if the guard were removed. If the existing
#   AC scenario passes through the guard without triggering it, add a dedicated variant that
#   explicitly exercises the guard path. A guard unbound by every test is indistinguishable
#   from dead code. Detected tessera R21 MINOR-2 (dedup guard) and MINOR-3 (short-circuit).

# REINFORCED 2026-05-17 — In audit-tier specs with both a test-count AC and a chore-B
#   forward-protection test, anchor the count AC to "at chore-A SHA <SHA>, pass count = N"
#   rather than a relative phrase. Chore-B adds one test (+1), making relative count literals
#   stale. Add grilling gate: "does this count AC need SHA-anchoring?" R22 MINOR-1.

# REINFORCED 2026-05-18 — When new production code and new tests are committed together in
#   the same round, prefix with a separate RED commit (assert.fail stubs that compile but FAIL)
#   before writing any implementation, so git history independently confirms RED→GREEN ordering.
#   The stub does not need to be complex — its purpose is a git-verifiable RED-state record.
#   Detected tessera R23 MINOR-1.

# REINFORCED 2026-05-18 — Chore-B forward-protection runtime tests must use `execFileSync`
#   (no-shell array form) rather than `execSync` (shell-string form). `execSync` introduces
#   a latent shell-injection surface if the SHA constant is ever parameterized from external
#   input; `execFileSync` with array argument prevents this by construction. R26 MINOR-1.

# REINFORCED — IMPLEMENTER-SPEC-TEST-ASSERTION-COVERAGE (composite; 4 sub-variants at Tessera)
#   Cross-project rule canonical landing: see CROSS-PROJECT-MEMORIAL.md.
#
#   All-AC-listed-fields-sub-case (R28 MINOR-1): All AC-listed fields must be asserted in
#     every sub-case, not just the primary or representative case.
#
#   Then-column-strictness (R29 MINOR-1): Then-column equality → use strictEqual not a
#     structural or partial check.
#
#   Discriminating-anchor (R30 MINOR-1): Discriminating assertion — not broad substring
#     matching multiple occurrences in same file; use regex with line anchoring or a
#     specific line-range read.
#
#   Spec-licensed-weak-assertion (R58 MINOR-2): When spec AC text licenses a weak bound
#     ("may be empty / subset depending on adapter sparse semantics"), Rule 3 still requires
#     encoding a discriminating lower-bound where the fixture guarantees a non-empty result.
#     Ask: "does the sparse fixture guarantee >= N elements for this adapter?" If yes (e.g.,
#     slurm-fixture-sparse.conf declares 4 switches → nodes.length >= 4), encode the tighter
#     bound. "The spec said >= 0" is not a defense. If genuinely ambiguous, document the gap
#     as an inline test comment. Detected tessera R58 MINOR-2 (4th tessera instance).

# REINFORCED 2026-05-18 — When inserting content into a canonical coordination document
#   containing a markdown bullet list, inserting an h2 or h3 heading inside the list
#   TERMINATES the list at that point. After any edit to a canonical document with bullet
#   lists, re-read a 30-line window around the insertion point and verify: (a) the preceding
#   list item retains its full rationale paragraph adjacent to its entry; (b) no orphaned
#   rationale text appears after the new content. Detected tessera R32 MAJOR-1.

# REINFORCED 2026-05-18 — rule-derivation-without-self-application (cross-project rule):
#   see CROSS-PROJECT-MEMORIAL.md. Tessera origin: R32 MAJOR-2 (4 AC instances of
#   `includes(...)` violated the assertion-coverage rule derived and committed in the same round).
#   When deriving a new rule, immediately grep the current test file for the weak patterns
#   the rule prohibits and apply the mutation test to every match.

# REINFORCED 2026-05-18 — When amending a spec AC row with an existing Then clause that will
#   be superseded, mark the original claim as superseded BEFORE appending the new claim. Use
#   `~~strikethrough~~` or `[R{N}-amended: the following supersedes the prior claim]`. Leaving
#   both original and amendment creates two contradictory assertions. Detected tessera R32 MINOR-2.

# REINFORCED 2026-05-18 — When a spec-pseudocode regex is invalid in the target language
#   (e.g., `\Z` in JavaScript) and the test file is in ALLOWED_SET, fix the regex directly
#   (< 10 characters). Do NOT add content to a data file to work around a broken regex.
#   A content workaround creates hidden structural coupling: future contributors may delete
#   the "workaround section" without knowing it is load-bearing. Detected tessera R34 MINOR-3.

# REINFORCED 2026-05-18 — When spec § 4 prescribes a full-suite count assertion but a
#   subprocess-hang constraint prevents running the full suite from within the test, the AC
#   MUST structurally guarantee the count by composition: independently count `test()`
#   declarations in the new test file AND assert pre-baseline subset count, then verify their
#   sum equals the spec'ied total. A silently-dropped AC is invisible to the assertion.
#   Detected tessera R34 MINOR-4.

# REINFORCED — ATTESTATION-SCOPE-FIDELITY (composite; 8 sub-variants observed at Tessera)
#
#   Selective-audit-overreach (R41 MAJOR-1): When an audit empirically checks N of M files and
#     the AC requires "all M files" verified, the delivered artifact must scope its claim to
#     the empirical coverage: "9 of ~50 candidates spot-checked; all have references — see
#     MEMORIAL for per-file evidence" — NOT "All coordination/*.md files checked have at
#     least one reference." A selective-sample audit that writes a blanket claim is a
#     false-compliance-attestation regardless of whether the substantive conclusion is likely
#     correct. Before writing any "all X verified" assertion in a load-bearing artifact,
#     confirm the audit literally covered all X. If not: scope the claim or complete the
#     audit. Detected tessera R41 MAJOR-1 (Rule 1 sub-class: selective-audit-overreach).
#
#   Scope-reduction must be disclosed in artifact (R41 MINOR-2): When a spec prescribes a
#     scope ("~25 Phase 2 coordination artifacts") and the Implementer performs a reduced
#     audit ("~15 key artifacts"), disclose the reduction explicitly in the artifact itself —
#     not only in the MEMORIAL CONFIRMATION. An artifact that presents findings by category
#     (Type A/B/C/D) without naming its actual input scope allows readers to infer more
#     complete coverage than was performed. Required disclosure form: "Scope: ~15 of ~25
#     prescribed artifacts grep'd; remaining ~10 not individually verified." The MEMORIAL
#     CONFIRMATION is an audit trail, not a substitute for artifact-level accuracy.
#
#   Spec-mandated RED-test-form deviation must be disclosed (R41 MINOR-5): When the spec
#     mandates a specific RED test form (e.g., "3 assert.fail stubs"), any deviation from
#     the literal form — even when TDD spirit is met (real assertions genuinely fail at RED
#     for substantive reasons) — must be disclosed in the chore-A NEXT-ROLE.md spec-deviance
#     section. "Spirit met, letter not met" is a reportable deviation, not a silent bypass.
#     Required disclosure form: "TD-N: RED commit used real assertions failing on unmet
#     preconditions rather than assert.fail stubs as mandated by spec § N; spirit met (tests
#     genuinely failed); letter bypassed without prior disclosure." Detected tessera R41
#     MINOR-5 (1st instance: spec-mandated-stub-form-bypassed).
#
#   Empirical-command-attestation — re-run the command, do not memorize the result
#     (R42 MAJOR-1 / R45 CRITICAL-1 + MINOR-1 / R46 MAJOR-2): When an AC asserts a numeric
#     count, grep output, line range, file mode, or other empirically-determinable value,
#     the attestation in NEXT-ROLE.md / MEMORIAL.md MUST be the actual output of running
#     the prescribed command at chore-A SHA — not a value memorized from the spec or copied
#     from an earlier draft. Declarative spec numbers get reified into attestations without
#     re-execution. Prescription: every empirical AC binds to a labeled bash block in
#     `coordination/specs/Q-RNN-EMPIRICAL.sh`; chore-A pre-commit runs `scripts/verify-
#     empirical-acs.sh <round>` which exits non-zero on mismatch; attestation cites the
#     harness output line-for-line. Recurring chain pattern detected: R42 MAJOR-1 ("99
#     back-references" actually 26 from grep; cited in 5 surfaces); R43 MINOR-3 (distinctive-
#     phrase grep substituted for spec-prescribed diff); R44 MINOR-2 (attestation conflates
#     chore-A SHA with SHA-backfill SHA in file-count claim); R45 CRITICAL-1 (`grep -cE
#     "^rule_[1-7]_check"` attested = 7; empirical = 14 because regex matches both function
#     defs and call sites); R45 MINOR-1 (`grep -c "IMPLEMENTED at \`scripts/...\`"` attested
#     PASS; empirical = 0 because file uses "IMPLEMENTED at R45" wording — silent grep
#     substitution); R46 MAJOR-2 (round-start SHA + diff cardinality memorized vs re-derived).
#     Rule 1 sub-class `empirical-command-attestation` canonically derived R46 at Tessera-
#     internal scope (cross-project landing deferred per Rule 7 anchor-canonical-landing-
#     deferred). Mechanically enforced via the harness.
#
#   Mechanical-AC verifier must not be self-confirming (R46 MAJOR-1 + MAJOR-3): When
#     authoring a Q-RNN-EMPIRICAL.sh verification block for a per-AC empirical claim, the
#     block MUST compute the assertion from observable command output — not hard-code the
#     PASS branch. Two failure modes detected at R46 (the very round deriving the sub-class):
#     (a) AC-R46-6 block emits `echo "PASS — AC-..."` and increments `PASS=$((PASS + 1))`
#     unconditionally, with no logic that can detect failure — the per-AC binding is
#     structurally vacuous (substantive aggregate exit-0 holds only because all other ACs
#     PASS; if any other AC failed, the per-AC table would still report PASS); (b) AC-R46-10
#     spec text says "stdout of `pre-commit-rule-sweep.sh` includes <string>" but the
#     verifier source-greps the script file for the literal instead of invoking the script
#     and grepping stdout — passes even if the rule_1_check function is disabled or renamed.
#     Required: every Q-RNN-EMPIRICAL.sh block runs the AC's prescribed command (or the
#     command that produces the AC's observable), captures output, and asserts on the
#     captured value with `[ "$ACTUAL" -eq "$EXPECTED" ]` (or equivalent). Meta-ACs whose
#     claim is "this script exits 0" should either be omitted (let aggregate exit code
#     speak) or computed AFTER all other ACs run as `[ "$FAILED" -eq 0 ]`. Rule 5 self-
#     application: the verifier of the rule R46 derives must itself satisfy the rule.
#
#   Tightening-2 verifier invocation chain must not be circular (R47 CRITICAL-1): When
#     implementing a Tightening 2 stdout-grep AC by invoking `scripts/pre-commit-rule-sweep.sh`,
#     trace the full invocation chain BEFORE authoring the AC: pre-commit-rule-sweep.sh
#     rule_1_check invokes `verify-empirical-acs.sh R<N>`, which re-executes the current
#     round's Q-R<N>-EMPIRICAL.sh. If that verifier IS the one containing the AC, the chain is
#     circular with no base case. Until R48 ships the same-round-recursion guard in
#     `scripts/pre-commit-rule-sweep.sh:rule_1_check`, never invoke pre-commit-rule-sweep.sh
#     from within Q-RNN-EMPIRICAL.sh to satisfy a Tightening 2 AC for that same round.
#     Instead, use a synthetic SHA range or a prior round's spec to test the runtime path.
#
#   Vendored-with-deltas file additions beyond spec per-file pseudocode must be disclosed
#     (R53 MINOR-2): When spec § 4 per-file pseudocode enumerates specific changes to an
#     existing file (e.g., two union-extension lines and a VENDORING-MANIFEST.md row-note
#     refresh in verdict.ts), any additional content added to that file — even a sensible
#     extension of an established convention (R18+R23 header docblock pattern) — is a
#     tactical-autonomy deviation that MUST be disclosed in NEXT-ROLE.md Implementer
#     attestation or MEMORIAL.md CONFIRMATION. The TACTICAL AUTONOMY clause authorizes
#     inline resolution; it does not waive disclosure. Pre-emit grilling must include a
#     "deliverable-vs-spec-prescribed-changes diff": for every spec-prescribed file, enumerate
#     EVERY change delivered and confirm each one is either spec-prescribed or disclosed as a
#     named tactical deviation. A MEMORIAL.md CONFIRMATION that recites only spec-prescribed
#     changes while silently omitting additional content is an attestation-scope gap regardless
#     of whether the additional content is benign. Detected tessera R53 MINOR-2.
#
#   Process-exit-code must be attested alongside pass/fail counts (R62 MAJOR-4): When
#     attesting a binding-command result that produces both a numeric summary (tests=N /
#     pass=P / fail=F / skipped=S) AND a non-zero process exit code (e.g., `node --test`
#     exits non-zero when fail > 0), BOTH the summary line AND the exit code must be
#     encoded in NEXT-ROLE.md. Attesting the pass/fail count verbatim while omitting the
#     exit code is a Rule 1 sub-class `empirical-command-attestation` gap — the exit code
#     is load-bearing context when the summary is the disclosed SPEC-DEVIANCE point (a
#     reader needs the exit code to understand whether the harness treated the result as
#     a failure). Procedure: after every `node --test` run, record `echo $?` output in
#     the attestation block immediately after the summary line. This applies especially
#     when fail count > 0 and the Implementer's routing decision attaches to that fact.
#     Analogous to R26 MAJOR-1 (tsc exit code reframing) but for test-runner exit codes.
#     Detected tessera R62 MAJOR-4.

# REINFORCED — PRE-EMIT-GRILLING-COMPLETENESS-GATE (composite; 6 sub-variants observed at Tessera)
#
#   OQ surfacing must cross-check against own state table + sources (R40 MAJOR-1): When
#     surfacing OQs in any deliverable, pre-emit grilling step 5 ("can the next role act on
#     this with zero clarifying questions?") must include: for each OQ, verify the question
#     is genuinely open by cross-checking against (a) the Implementer's own state table in
#     NEXT-ROLE.md, (b) source artifacts named in the spec § 2 design sketch, and (c) the
#     deliverable's own prose. An OQ whose answer is already present in any of these sources
#     is a completeness-gate failure — revise to state the resolved answer or replace with
#     the still-open sub-question. Raising an OQ on a resolved question degrades operator
#     actionability.
#
#   Pattern-prohibit AC requires sweep-all-prose verification (R40 MINOR-5): When an AC
#     prohibits a pattern (e.g., "no Implementer-resolved sequencing recommendations"),
#     grilling must verify the negative property by sweeping ALL deliverable prose for the
#     prohibited pattern — not just confirming that required mitigation elements (such as OQ
#     flags) are present. Presence of mitigations does not guarantee absence of the
#     prohibited behavior in surrounding prose. For ACs that prohibit implicit
#     recommendations, read every non-OQ prose block and ask: "does this recommend, nudge,
#     or imply a sequencing choice?"
#
#   Substring-marker must uniquely identify section/property (R41 MINOR-3/4;
#     self-confirming-test-assertion-specificity): When a test asserts the presence of a
#     document section or property via substring matching, the substring must UNIQUELY
#     identify that section/property — not be a generic word that appears throughout the
#     document. "rounds" appears in §§ 1, 2, 4, 5, 6 of a hygiene stamp and cannot serve as
#     a section-identity marker for § 2. "RESOLVED" appears at multiple unrelated locations
#     and cannot confirm OQ-P3-5 is marked resolved. Required: use structural anchors
#     ("## § 5 — Cluster fan-out") or property-specific identifiers ("OQ-P3-5.*RESOLVED")
#     that are not incidentally satisfied elsewhere in the document. For each
#     `includes(marker)` in a document-presence test, ask: "could this match outside the
#     target section?" before committing. A test that passes when its target section is
#     absent is not load-bearing for its AC. Cross-project reinforcement rule derived at R41
#     (3rd instance: R36 vacuous-absence-check + R41 MINOR-3 + R41 MINOR-4).
#
#   Tightening-4 self-application: grep own verifier for assert_ge (R47 MAJOR-2): When
#     authoring a verifier for a round that derives or extends Tightening 4 ("prefer exact
#     counts over `>= 1` thresholds"), run `grep 'assert_ge' coordination/specs/Q-R<N>-EMPIRICAL.sh`
#     before chore-A commit. For each `assert_ge` found: ask "is this expected count
#     structurally fixed by this round's own file content?" If yes, replace with `assert_eq`.
#     A file-header comment "Exact counts: ACs use `== expected`" is a declaration that must
#     be verified by this grep — it is not self-enforcing.
#
#   Known-limitation blocks must enumerate empirically-observable failures (R48 MINOR-3):
#     Before routing, when a spec's § 3.5 "known limitation" block enumerates post-round
#     verifier failures, run `scripts/verify-empirical-acs.sh [prior-round]` at HEAD to
#     EMPIRICALLY observe all failures — not just structurally-predictable ones. List every
#     expected failure in § 3.5. At R48, § 3.5 documented AC-R47-8 failure (ALLOWED_SET
#     drift, deduced structurally) but omitted AC-R47-9 failure (test baseline 361/356/2/3
#     vs actual 361/355/3/3 caused by R47 MU commit `6e8b1c6`), which is only observable by
#     running the command. Known-limitation blocks that omit observable failures create
#     confusion for operators running prior-round verifiers post-close.
#     Detected tessera R48 MINOR-3.
#
#   Partial composite self-application: evaluate all sub-variants in composite (R51 MINOR-1):
#     When self-applying one sub-variant from a REINFORCED composite, scan ALL sub-variants in
#     that composite for applicability to the current deliverable element before declaring
#     grilling complete. At R51, the Implementer applied R47 MAJOR-2 (Tightening-4: use
#     `assert_eq`, not `assert_ge`) from this composite and simultaneously folded R47 MAJOR-2
#     as a sub-variant here — but did NOT evaluate the adjacent R41 MINOR-3/4 sub-variant
#     (substring-marker uniqueness gate) when selecting the AC-R51-3g marker "only observable
#     by." That marker is generic (any future REINFORCED entry describing an indirectly-
#     observable failure could use similar phrasing); R41 MINOR-3/4 applied to the same
#     grilling step would have caught it. Pattern: "I applied sub-variant X from composite Y;
#     therefore grilling is complete" fails when Y contains additional sub-variants directly
#     applicable to the same deliverable element. For each sub-variant applied, ask: "are
#     there adjacent sub-variants in this composite whose applicability I have not checked?"
#     Detected tessera R51 MINOR-1.
# REINFORCED 2026-05-20 — When a class extends `EventEmitter` and the module exports a
#   corresponding typed-events interface (e.g., `DsEventConsumerEvents`), the interface MUST
#   be used as the generic parameter (`EventEmitter<DsEventConsumerEvents>`) if the project's
#   Node.js typings support it — OR the interface MUST be dropped with a JSDoc note
#   explaining it is "documentation only, not a compile-time gate." Exporting a typed-events
#   interface without wiring it to the emitter implies a compile-time guarantee that does not
#   exist: a typo in `this.emit('activte', ...)` compiles silently even with the interface
#   present. Check at emit-time: does `EventEmitter<TEvents>` appear in the class `extends`
#   clause? If not, and an interface is exported, add the generic parameter or remove the
#   interface. Detected tessera R66 MINOR-2 (DsEventConsumerEvents exported at event-
#   consumer.ts:52-55; DsEventConsumer extends EventEmitter at line 169 without the generic;
#   no compile-time emit gate enforced).
# REINFORCED 2026-05-20 — When a stateful factory's deactivation paths (timer callback and
#   `cancelActivation()`) set `state.active = false`, they must also clear any identifier
#   fields — such as `cluster_event_id` and `until_ts` — whose semantics are "valid only
#   during an active period." Default rule: reset to undefined (or `delete state.field`) in
#   both deactivation paths immediately after `state.active = false`. Leaving stale
#   identifiers causes `getState()` callers (observability hooks, test inspectors, debug
#   tooling) to receive post-deactivation data that appears to describe an active event. The
#   exception is when the field's JSDoc explicitly states it is "sticky-after-deactivation by
#   design." For each deactivation path: read the state object's fields; for every field with
#   lifecycle-bounded semantics, verify it is cleared. Detected tessera R66 MINOR-3
#   (freeze-hook-factory.ts:110-113 timer callback and :125-131 cancelActivation set
#   active=false but leave cluster_event_id + until_ts stale; no AC verifies state hygiene).
# REINFORCED 2026-05-20 — In `node:test` test files, ALL `import` and `import type`
#   statements must appear at the TOP of the file, BEFORE any `describe()` calls, top-level
#   `const` declarations, and helper-function definitions. ES modules hoist imports at runtime
#   so misplaced imports do not cause errors, but the layout obscures the module's dependency
#   graph for a cold reader and violates codebase convention. Procedure: after writing a test
#   file, scan for any `import` statement below the first `describe()` or top-level `const`
#   — if found, move it to the import block at the top. This applies to spec-prescribed
#   fixture stubs placed at the bottom of a § 4 pseudocode block: at implementation time,
#   move those imports to the top-of-file import block before the describe. Detected tessera
#   R66 MINOR-4 (test/q66-ds-integration-event-consumer.test.ts:332-333 places import type
#   { PerShardResidual } and import type { ExtendedSampleObservation } after the describe()
#   block at line 78; codebase convention violated per sibling q65 test file which groups
#   imports at top).
