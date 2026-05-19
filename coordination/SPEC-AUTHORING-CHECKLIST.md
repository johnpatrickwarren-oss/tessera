# SPEC-AUTHORING-CHECKLIST.md
# R34 MAJOR-1 closure — Architect ALLOWED_SET completeness gate
# Created at R36 Phase 2 close-walk (2026-05-18).

## Purpose

This checklist supplements the § 9.9 ALLOWED_SET completeness pass described in
CLAUDE-ARCHITECT.md. It captures failure modes discovered across Phase 2 rounds that the
original pass does not enumerate.

---

## ALLOWED_SET Completeness Gate

Before emitting any spec (§ 9.9 pass), verify all of the following file categories are
either represented by a regex carve-out OR explicitly documented as a coverage gap with
a recommended mitigation:

### Standard emit categories (established R25+)

- [ ] Architect-emitted spec + spec-audit sidecar
- [ ] Implementer chore-A files (production code + new test file)
- [ ] Reviewer post-chore-A files (REVIEWER-REPORT-RNN.md, REVIEWER-REPORT-RNN-*.md)
- [ ] Memorial-Updater post-Reviewer files (MEMORIAL.md updates, NEXT-ROLE.md)

### Operator-authored methodology backflow class (NEW — R34 MAJOR-1)

Files that an operator may commit at ANY point in the round pipeline — including between
Implementer STATUS=READY and Reviewer execution:

- [ ] `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (or equivalent staging artifact)
- [ ] `coordination/WAVE-PLAN-NN.md` (Coordinator wave planning)
- [ ] `coordination/WAVE-GATE-NN.md` (Coordinator wave gates)
- [ ] `coordination/cluster-scopes/*/CLUSTER-HANDOFF-*.md` (cluster handoff files)
- [ ] `coordination/SCOPING-MEMO-*.md` amendments (operator-authorized mid-round)
- [ ] Any PRD or scope amendment authorized mid-round by operator

**Resolution options** (choose one per spec emit):

**Option A (preferred):** Add regex carve-outs for all known operator-owned coordination
files to the ALLOWED_SET. Example carve-out:
```
/^coordination\/STAGED-FOR-[A-Z0-9\-]+\.md$/,
/^coordination\/WAVE-PLAN-\d+\.md$/,
/^coordination\/WAVE-GATE-\d+\.md$/,
```

**Option B (fallback):** Document the gap explicitly with a recommendation. Example:
```
# NOTE: Operator-authored methodology commits are NOT in the ALLOWED_SET.
# Operators should land methodology commits before STATUS=READY or after Reviewer routing.
# If a mid-round operator commit is expected, add a carve-out before emitting the spec.
```

> **Background:** R25 MAJOR-1 (DIAGNOSTIC files missed); R29 MINOR-2 (REVIEWER-REPORT
> file missed); R34 MAJOR-1 (operator post-READY commits missed). Three occurrences of
> the same Architect forward-coverage gap class across Phase 2. Each instance caused an
> AC-R{N}-19 forward-protection test to fail post-round because the operator commit
> appeared in the `git diff CHORE_A_SHA..HEAD` output outside the ALLOWED_SET.

### Diagnostic files (established R25)

- [ ] `coordination/diagnostics/DIAGNOSTIC-RNN-*.md` (if any HALT fires)

### Additional carve-outs needed when applicable

- [ ] `coordination/evidence/PR-F*-EVIDENCE.md` (if evidence package created mid-round)
- [ ] `coordination/logs/ROUND-R*-SUMMARY.md` (if round summary committed)
- [ ] `CLAUDE-*.md` files (if Memorial-Updater appends REINFORCED lines this round)

---

## Pre-emit grilling gate (self-application per Rule 5)

After completing the ALLOWED_SET completeness pass, apply the Rule 5 self-audit:

1. For each AC that guards a critical invariant (A16 D4 wire-format, anti-scope protection),
   apply the mutation test: "would the assertion still PASS if only a comment/JSDoc
   occurrence were present and the type-declaration were removed?"
2. For each ALLOWED_SET regex, verify it matches only intended paths (no over-matching).
3. For each algorithmic boundary clause in § 3.x pseudocode: grep all occurrences across
   § 1.x, § 3.x, § 4 AC Then-columns and verify consistent convention (inclusive vs exclusive).
4. For each regex literal in § 3.x pseudocode intended for use in test code: verify the
   regex is valid JavaScript (test in Node.js REPL; `\Z` → use `$` or `(?![\s\S])`).

---

## Rule 7 self-application gate (cross-project rule propagation surface a)

**Background.** Rule 7 (`derived-rule-propagation-mechanism-required`) canonically landed at
`~/.claude/CROSS-PROJECT-MEMORIAL.md:3478` (R38 Memorial-Updater stage, per OQ-W5-1 Option A
authorization). The canonical text mandates THREE propagation surfaces:

- **Surface (a) Spec template / spec-authoring-checklist gate** — IMPLEMENTED HERE (R44).
- **Surface (b) Implementer chore-A pre-commit grep gate** — `scripts/pre-commit-rule-sweep.sh`
  (deferred to R45 round per overnight authority chain methodology sequencing).
- **Surface (c) Round-of-derivation self-application** — when a round contains the canonical
  landing commit for a new rule, the Implementer at SAME-round chore-A MUST grep-sweep the
  round's own diff for the new rule's prohibited patterns before chore-B (hard gate, not soft
  expectation per canonical text).

Rationale: passive reinforcement-line accretion in `CLAUDE-{role}.md` files demonstrably fails
to prevent same-round-as-derivation violations (R36 MAJOR-3/4 Rule 6 self-application failure;
R34 MAJOR-1 Rule 4 re-violation on structurally distinct sub-class; R32 MAJOR-2 same-round
Rule 3 self-application failure). Active propagation surfaces are load-bearing.

### Per-rule self-application checklist

For every spec emission, the Architect (or Implementer wearing Architect hat in audit-tier rounds)
MUST enumerate each of the 7 canonical rules in the spec's `§ 7. Apply all 7 cross-project
rules UPFRONT` section. Each rule entry MUST state: (a) the rule's application to THIS round
(active gate / N/A / already-validated); (b) for active gates, the round-specific check command
or semantic verification path. Silent omission of any rule from § 7 is a Rule 7 violation per
the canonical "passive accretion is insufficient" language.

| # | Rule (short name) | Prohibited pattern | Mechanizable? | Default check |
|---|---|---|---|---|
| 1 | `false-compliance-attestation` | Attesting PASS / verbatim without empirical verification of the asserted observation | partial | semantic: cross-check each AC PASS claim against observed evidence (file:line, grep count, test summary). For verbatim-preservation ACs: run `diff` between origin and derived artifact and confirm byte-identical output before attesting PASS. |
| 2 | `architect-branch-binding-coverage` | Spec § Acknowledged-gap omits an unbound guard / default / fallback branch | partial | semantic: for each guard / default / fallback in production code touched by the round, verify either (a) an AC reaches and exercises it, OR (b) § Acknowledged-gap section names it with non-load-bearing rationale. |
| 3 | `implementer-spec-test-assertion-coverage` | Test omits assertion for an AC-listed field, branch, or condition | mechanizable | grep: for each AC Then-clause field/condition, `grep "<field>" test/qNN-*.test.<ext>` and verify a `strictEqual` / `deepStrictEqual` / `match` assertion covers it. Discriminating assertions only — broad substring matches don't bind. |
| 4 | `anti-scope-allowed-set-forward-coverage` | ALLOWED_SET expanded post-spec-emit (test reads its own literal; commit-message justification doesn't substitute for spec amendment) | mechanizable | grep: `git diff <spec-commit-SHA>..<chore-A-SHA> -- coordination/specs/Q-RNN-SPEC.md` should show ALLOWED_SET section stable (no post-spec-emit additions). If expansion needed: amend spec FIRST, then commit. |
| 5 | `self-application-gate` | A new rule derived in round N but Rule N's prohibited pattern present in the same round's chore-A diff | partial | semantic: for each new rule appended at Memorial-Updater stage in this round, grep `git diff round-start..chore-A` for the rule's prohibited pattern; record results inline in spec § 7 or MEMORIAL CONFIRMATION/VIOLATION entry. |
| 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | HALT condition triggered (per Implementer's halt conditions a-e) but Implementer applied a tactical workaround instead of writing DIAGNOSTIC + ESCALATE | partial | semantic: at each anticipated halt-condition trigger point, verify that DIAGNOSTIC file exists in `coordination/diagnostics/DIAGNOSTIC-R<NN>-*.md` AND `STATUS: ESCALATE` was set in NEXT-ROLE.md. If no halt condition was encountered: mark N/A. |
| 7 | `derived-rule-propagation-mechanism-required` | New rule canonically landed in CROSS-PROJECT-MEMORIAL.md without spec § 7 enumeration in the deriving round (Surface c failure) | mechanizable | grep: if `git diff round-start..chore-A -- ~/.claude/CROSS-PROJECT-MEMORIAL.md` shows a new "Reinforcement rules derived" entry, the round's spec § 7 MUST enumerate the new rule's grep gate. Verify spec § 7 mentions the new rule by name. |

### Spec § 7 enumeration directive

Every spec's `§ 7. Apply all 7 cross-project rules UPFRONT` section MUST list each of the 7 rules
above, with one of:

- **Active gate:** the round will perform the check (state the round-specific grep command or
  semantic check description; cite the AC that binds it where applicable).
- **N/A:** the round does not exercise the rule's surface (e.g., Rule 2 N/A for documentation-only
  rounds; Rule 6 N/A when no halt condition is encountered). Brief justification required.
- **Already-validated:** the round's nature precludes the prohibited pattern (e.g., Rule 4
  already-validated for rounds with zero file modifications). Brief justification required.

A spec § 7 that omits any rule, or labels all rules N/A without justification, is a Rule 7
violation. The Reviewer audits this at cold-eye time.

### Round-of-derivation Surface (c) special case

If the round's Memorial-Updater stage will append a new "Reinforcement rules derived" entry to
`~/.claude/CROSS-PROJECT-MEMORIAL.md`, the Implementer at SAME-round chore-A MUST:

1. **Identify the prohibited pattern** from the new rule's canonical text (drafted by Reviewer or
   Memorial-Updater at this round's findings).
2. **Grep-sweep the round's own diff:** `git diff <round-start-SHA>..<chore-A-SHA>` for the
   prohibited pattern, scoped to the round's diff (not the entire codebase).
3. **Record results inline:**
   - If zero matches: append `CONFIRMATION: rule-7-self-application | New rule <name> derived
     at this round; round diff swept for <prohibited pattern>; zero matches. Self-application
     gate PASS. | R<NN> | IMPLEMENTER` to MEMORIAL.md.
   - If matches found: write DIAGNOSTIC + escalate per Rule 6 (halt-discipline); do NOT
     silently absorb. The new rule's first cross-round audit failed; operator decision required
     on whether to amend spec to remediate vs. defer.

The round's spec § 7 should pre-anticipate Surface (c) when a derivation event is expected.

### Canonical reference

For the full Rule 7 text and derivation history (Trigger threshold; R32/R34/R36 occurrences
that crossed the 3-instance threshold), see `~/.claude/CROSS-PROJECT-MEMORIAL.md:3474-3478`.

> **Note:** This section implements Rule 7's Surface (a) only. Surface (b) — the mechanical
> pre-commit grep-sweep script — is deferred to a subsequent methodology round (planned R45)
> for dedicated bounded-scope tooling work. Surface (c) is documented above and is round-conditional
> (only triggers when a new rule lands in the round).
