# Q-R44-SPEC — Rule 7 Structural Mechanism (Surface a: Spec-Template Gate)

**Round:** R44
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Overnight authority window 2026-05-19 LATE-MORNING (per [[project-overnight-authority-2026-05-19-late-morning]]); continuation chain pick within methodology candidates per PHASE-3-CANDIDATES-PRELIMINARY.md § 5.1.

---

## § 1. Goal

Implement **Surface (a)** of Rule 7's three propagation surfaces — the spec-template / spec-authoring-checklist gate — by extending `coordination/SPEC-AUTHORING-CHECKLIST.md` with a new "Rule 7 self-application gate" section enumerating all 7 cross-project rules with: short name, prohibited pattern (textual), and check mechanism (grep command / mutation test / structural verification).

**Surfaces deferred to subsequent rounds:**
- Surface (b) `scripts/pre-commit-rule-sweep.sh` mechanical script — deferred to R45 (bounded tooling work).
- Surface (c) round-of-derivation self-application enforcement — already happens organically when a round's spec § 7 enumerates the grep gates (precedent: Q-R36-SPEC, Q-R42-SPEC, Q-R43-SPEC each apply Rule 7 at landing). Surface (c) becomes load-bearing only when a new rule is derived during the round; for non-deriving rounds it remains advisory.

**Rule 7 canonical text reference:** `~/.claude/CROSS-PROJECT-MEMORIAL.md:3478`. Required propagation surfaces are explicit in the canonical text; this round implements Surface (a).

---

## § 2. Brainstorm

**Option A — Extend SPEC-AUTHORING-CHECKLIST.md only (SELECTED):** Add a new "Rule 7 self-application gate" section with the 7-rule enumerated checklist.
- Strengths: minimal scope; tackles the highest-leverage surface (spec template / checklist) first; bounded ~1 round; reversible. Defers the mechanical script (Surface b) to a subsequent round where it gets dedicated attention.
- Weaknesses: doesn't deliver Surface (b) in the same round. Some rules are not mechanically grep-able and require semantic verification — the checklist documents this honestly rather than promising mechanization that won't materialize.

**Option B — Implement Surfaces (a) + (b) bundled:** Extend SPEC-AUTHORING-CHECKLIST.md + author `scripts/pre-commit-rule-sweep.sh`.
- Strengths: complete Rule 7 surface (a)+(b) in one round.
- Weaknesses: scope doubles; mechanical script for the 7 rules is non-trivial (some rules don't mechanize cleanly; needs careful design); risk of half-finished script. Better to phase.
- Rejected: bounded R44 + deferred R45 is preferred; preserves overnight authority budget.

**Option C — Extend the Architect spec template at the anchor repo (cross-project canonical):** Modify `templates/Q-NN-SPEC-TEMPLATE.md` in anchor canonical.
- Strengths: cross-project leverage.
- Weaknesses: Rule 7 discipline: anchor canonical landing without 2nd-project occurrence is exactly what R42 § 5.5 anchor-canonical-landing-path warns against. Rule 7's own discipline (canonical-with-empirical-proof) gates against this.
- Rejected: Tessera-internal landing only at R44; anchor promotion gated on 2nd-project occurrence.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Extension target

Pre-R44 `coordination/SPEC-AUTHORING-CHECKLIST.md` = 84 lines, structured as:
- § Purpose (lines 5-9)
- § ALLOWED_SET Completeness Gate (lines 11-70)
  - Standard emit categories
  - Operator-authored methodology backflow class (R34 MAJOR-1)
  - Diagnostic files
  - Additional carve-outs
- § Pre-emit grilling gate (self-application per Rule 5) (lines 73-84)

R44 adds a new top-level section: `## Rule 7 self-application gate (cross-project rule propagation surface a)` after the existing Pre-emit grilling gate section.

### 3.2 Section content

The new section contains:

1. **Section preamble** explaining what Rule 7 is, why this gate exists (per canonical Rule 7 text at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3478`), and how to use the checklist.
2. **Per-rule checklist table** — one row per cross-project rule with columns:
   - Rule name (short identifier)
   - Prohibited pattern (textual description of what the rule prohibits)
   - Check mechanism (grep command if mechanizable; "semantic check" + description if not)
   - Where to apply (spec-emit time / chore-A time / both)
3. **Required spec § 7 enumeration directive** — the spec template's § 7 ("Apply all 7 cross-project rules UPFRONT") MUST enumerate each rule with the round-specific grep/check command.
4. **Round-of-derivation special case** — when this round derives a new rule (per Memorial-Updater conventions; appends new "Reinforcement rules derived" entry to CROSS-PROJECT-MEMORIAL.md), additional Surface (c) self-application is mandated: the Implementer at the SAME round must grep-sweep the round's own diff for the new rule's prohibited patterns.

### 3.3 Per-rule check mechanism table

For each of the 7 canonical rules:

| Rule | Prohibited pattern | Mechanizable? | Check |
|---|---|---|---|
| 1. `false-compliance-attestation` | Attesting PASS without verbatim verification of empirical observation | partial | semantic: cross-check each AC's PASS claim against observed evidence; grep: `git diff round-start..chore-A` for "PASS" attestations + verify each cites file:line evidence |
| 2. `architect-branch-binding-coverage` | Spec § Acknowledged-gap section omits unbound branches | partial | semantic: for each guard/default/fallback in production code, verify an AC reaches it OR § Acknowledged-gap names it |
| 3. `implementer-spec-test-assertion-coverage` | Test omits assertion for AC-listed field/branch | mechanizable | grep: `test/*.test.<ext>` for AC-listed fields; verify `strictEqual`/`deepStrictEqual` covers each |
| 4. `anti-scope-allowed-set-forward-coverage` | ALLOWED_SET added a path NOT pre-authorized at spec-emit time | mechanizable | grep: `git diff spec-commit..chore-A-commit -- coordination/specs/Q-RNN-SPEC.md` should show ALLOWED_SET stable (no post-spec-emit additions) |
| 5. `self-application-gate` | Rule N derived but Rule N's prohibited pattern present in same round | partial | semantic: for each rule appended at Memorial-Updater stage, grep round diff for that rule's prohibited pattern |
| 6. `halt-discipline-no-DIAGNOSTIC-for-workaround` | HALT condition triggered but no DIAGNOSTIC + ESCALATE | partial | semantic: check git log for "diagnostic" / "DIAGNOSTIC" file additions at each commit; cross-reference with MEMORIAL VIOLATION entries |
| 7. `derived-rule-propagation-mechanism-required` | New rule canonically landed without spec § 7 enumeration | mechanizable | grep: when CROSS-PROJECT-MEMORIAL.md gains a new "Reinforcement rules derived" entry, the round's spec § 7 MUST enumerate the rule's grep gate; verify presence in spec |

### 3.4 Spec § 7 enumeration directive

The SPEC-AUTHORING-CHECKLIST.md "Rule 7 self-application gate" section concludes with a directive:

> Every spec § 7 ("Apply all 7 cross-project rules UPFRONT") MUST list each of the 7 rules with its round-specific application. The application may be:
>
> - **Active gate:** the round will perform a check (mechanizable rules)
> - **N/A:** the round does not exercise the rule's surface (e.g., Rule 2 N/A for documentation-only rounds)
> - **Already-validated**: the round's nature precludes the prohibited pattern (e.g., Rule 6 N/A when no halt condition is encountered)
>
> Silent omission of a rule from § 7 is a Rule 7 violation per the canonical "passive accretion is insufficient" language.

### 3.5 Round-of-derivation Surface (c) special case

If a round's Memorial-Updater stage appends a new "Reinforcement rules derived" entry to `~/.claude/CROSS-PROJECT-MEMORIAL.md`, the round's Implementer at SAME-round chore-A MUST:

1. Identify the prohibited pattern from the new rule's canonical text.
2. Grep the round's own diff (`git diff round-start..chore-A-commit`) for the prohibited pattern.
3. Record results inline in the spec § 7 or MEMORIAL entries (CONFIRMATION or VIOLATION as appropriate).

This Surface (c) requirement is documented in the SPEC-AUTHORING-CHECKLIST.md section.

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R44-SPEC.md` | Created | This file |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | Modified | New "Rule 7 self-application gate" section appended |
| `coordination/MEMORIAL.md` | Modified | R44 IMPLEMENTER entry appended |
| `coordination/NEXT-ROLE.md` | Modified | R44 routing |

Not modified: `engine/*`, `test/*`, `tools/*`, `scripts/*`, `CLAUDE-*.md`, `MEMORIAL-PHASE-*.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`.

---

## § 5. Acceptance criteria

**AC-R44-1 (Rule 7 section present):** Post-R44, `grep -c "^## Rule 7 self-application gate" coordination/SPEC-AUTHORING-CHECKLIST.md` ≥ 1.

**AC-R44-2 (per-rule table completeness):** The Rule 7 section contains a table or per-rule subsection enumerating all 7 canonical rules by short name. `grep -c "Rule [1-7]" coordination/SPEC-AUTHORING-CHECKLIST.md` ≥ 7 (matches inside the new section).

**AC-R44-3 (check mechanism per rule):** For each of the 7 rules, the section names either a grep command (for mechanizable rules) OR a semantic check description (for non-mechanizable). No rule is silently omitted.

**AC-R44-4 (Surface a/b/c framing):** The Rule 7 section preamble references Rule 7's three propagation surfaces (a/b/c) and documents which surface this section implements (Surface a) and what is deferred (Surface b to R45; Surface c is round-conditional).

**AC-R44-5 (spec § 7 enumeration directive):** The Rule 7 section contains an explicit directive that every spec's § 7 MUST enumerate each rule with its round-specific application (active / N/A / already-validated).

**AC-R44-6 (round-of-derivation Surface c directive):** The Rule 7 section names the Surface (c) requirement for rounds that derive a new cross-project rule.

**AC-R44-7 (no engine/test/CROSS-PROJECT modifications — ALLOWED_SET):** `git diff <ROUND-START-SHA>..HEAD --name-only` after chore-A includes ONLY:

```
ALLOWED_SET:
coordination/specs/Q-R44-SPEC.md
coordination/SPEC-AUTHORING-CHECKLIST.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/reviews/REVIEWER-REPORT-R44.md   (post-chore-B Reviewer commit; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R44-*.md  (conditional; only if HALT fires)
```

No engine/*, test/*, scripts/* (script deferred to R45), CLAUDE-*.md (R43 deliverables frozen), MEMORIAL-PHASE-*.md, CROSS-PROJECT-MEMORIAL.md.

**AC-R44-8 (test baseline preserved):** Post-R44 baseline = R43 baseline = 361/356/2/3, tsc exit 0. Zero regression.

**AC-R44-9 (Rule 7 self-application demonstration):** This round itself applies Rule 7 surface (c) discipline: § 7 below enumerates the per-rule check; no new rule is derived at R44 (Surface c not triggered); Surface a is delivered as the round's primary work.

**AC-R44-10 (canonical reference cited):** The new SPEC-AUTHORING-CHECKLIST.md section cites Rule 7's canonical landing location (`~/.claude/CROSS-PROJECT-MEMORIAL.md:3478`) as the authoritative source.

---

## § 6. Anti-scope

- NO modification of `engine/*` or `test/*` files
- NO modification of `scripts/*` (Surface b script deferred to R45; explicit non-scope for R44)
- NO modification of `CLAUDE-*.md` files (R43 deliverables frozen)
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing deferred per § 5.5 R42 anchor-canonical-landing-path)
- NO modification of anchor methodology templates (`templates/Q-NN-SPEC-TEMPLATE.md`) — cross-project canonical surface; gated on 2nd-project occurrence per Rule 7's own discipline
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`
- NO new REINFORCED entries in CLAUDE-*.md (R43 just consolidated; do NOT accrete)
- NO Phase 3 territory (HARD STOP preserved)
- NO opening any GitHub PRs

---

## § 7. Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** AC-R44-1, AC-R44-2 require empirical verification via `grep -c`. Implementer encodes actual values.
- **Rule 2 (`architect-branch-binding-coverage`):** N/A — methodology round; no production-code branches authored.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** Methodology round; no test file required (R39/R42/R43 precedent). AC binding via grep commands.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ALLOWED_SET enumerated in AC-R44-7 at spec-emit time. Regex carve-out for Reviewer + DIAGNOSTIC.
- **Rule 5 (`self-application gate`):** This round implements Rule 7 Surface (a) and itself applies Rule 7 framing to its own scope decisions (Surface b/c deferred per documented rationale, not silently dropped).
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** N/A — no halt conditions anticipated. Mechanical doc extension only.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** This round IS Rule 7's structural implementation surface (a). No new rule derived at R44 (Surface c not triggered). The active spec § 7 is itself the Rule 7 enumeration template per AC-R44-5 directive.

---

## § 8. Halt conditions

1. **Section integration breaks existing checklist structure:** If the new section's insertion point disrupts existing § ALLOWED_SET Completeness Gate or § Pre-emit grilling gate readability, HALT + DIAGNOSTIC.
2. **Rule canonical text drift:** If `~/.claude/CROSS-PROJECT-MEMORIAL.md:3478` does not actually contain the Rule 7 canonical text (e.g., the line moved), HALT + DIAGNOSTIC; do not silently rewrite the citation.
3. **Per-rule check mechanism unclear:** If a rule's grep pattern cannot be defined cleanly, document the limitation honestly ("semantic check only; no mechanizable surface") rather than inventing a contrived grep.
4. **Test baseline drift:** Any change in `361/356/2/3` baseline → HALT + DIAGNOSTIC. Methodology round must not perturb tests.

---

## § 9. Open questions

None.

---

## § 10. Pipeline invocation

- **Pipeline mode:** `./run-pipeline.sh --round R44 --tier audit`
- **Interactive mode:** Implementer executes chore-A; Reviewer pass invoked separately.
