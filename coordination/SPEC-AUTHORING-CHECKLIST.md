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
