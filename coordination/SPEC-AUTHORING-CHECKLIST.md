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

- **Surface (a) Spec template / spec-authoring-checklist gate** — IMPLEMENTED at R44 (this section).
- **Surface (b) Implementer chore-A pre-commit grep gate** — IMPLEMENTED at R45 via
  `scripts/pre-commit-rule-sweep.sh`. Runs grep gates for the mechanizable rules (Rule 7 spec § 7
  enumeration check is the primary mechanical finding); emits advisory output + SEMANTIC CHECK
  REQUIRED directives for the partial-semantic rules. Invocation:
  `scripts/pre-commit-rule-sweep.sh <round-start-SHA> <chore-A-SHA>` → exit 0 on clean sweep;
  exit 1 on mechanical-rule finding.
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
| 1 | `false-compliance-attestation` | Attesting PASS / verbatim without empirical verification of the asserted observation. **Sub-class `empirical-command-attestation` (R46):** citing numeric / grep-output values as memorized from spec text rather than re-running the verification command at chore-A. | mechanizable | mechanical: `scripts/verify-empirical-acs.sh <round>` exits 0 (invokes the round's `coordination/specs/Q-RNN-EMPIRICAL.sh`, which runs each AC's verification command and reports per-AC pass/fail). For verbatim-preservation ACs: also run `diff` between origin and derived artifact before attesting PASS. See § "Empirical-AC discipline (Rule 1 sub-class)" below. |
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

> **Note:** This section implements Rule 7's Surface (a). Surface (b) is IMPLEMENTED at
> `scripts/pre-commit-rule-sweep.sh` (landed R45). Surface (c) is documented above and is
> round-conditional (only triggers when a new rule lands in the round).

---

## Empirical-AC discipline (Rule 1 sub-class — landed R46)

**Sub-class canonical text:**

> **Rule 1 sub-class `empirical-command-attestation`:** Every AC that asserts a numeric
> value, grep output, count, line-number range, file existence / mode, or other
> empirically-determinable property MUST express the verification as an executable shell
> command in the spec. The attestation in NEXT-ROLE.md / MEMORIAL.md MUST be the actual
> output of running that command at chore-A SHA — not a memorized value re-quoted from
> the spec. A sibling file `coordination/specs/Q-RNN-EMPIRICAL.sh` houses one labeled
> bash block per empirical AC, exiting non-zero on mismatch. Rule 1 sub-class is
> mechanically enforceable via `scripts/verify-empirical-acs.sh <round>` invoked at
> chore-A pre-commit.

**Background (why this sub-class exists):** Pre-R46 Rule 1 (`false-compliance-attestation`)
prohibited attesting PASS without empirical verification, but did NOT specify the
verification *mechanism*. The R42-R45 methodology chain demonstrated 4 same-chain
instances of the failure mode (R42 MAJOR-1 "99 actually 26"; R43 MINOR-3 grep
substituted for diff; R44 MAJOR-1 non-canonical short-names; R45 CRITICAL-1
"grep returns 7 actually 14"). Root cause: the Implementer is both spec-author AND
attestation-author; declarative numbers ("returns N") get reified into attestations
without re-running the command. Sub-class mechanism: the spec carries the *command*,
not the *result*; attestations re-execute the command at chore-A. False-compliance
becomes structurally impossible because there is no memorized number to drift.

### Author-time requirements (at spec emit)

1. **Identify** every AC in the spec making an empirical claim (numeric value, count,
   grep output, line-number range, file existence / mode, command exit code,
   command stdout match).
2. **For each such AC**, write the exact shell command that verifies the claim.
   Test the regex against ≥ 1 positive line and ≥ 1 negative line before committing
   (catch "looks right but matches extras" bugs — R45 CRITICAL-1 pattern).
3. **Run the command** at spec-emit time and record the EXPECTED output literal.
4. **Author `coordination/specs/Q-RNN-EMPIRICAL.sh`** as an executable bash file
   with one labeled block per empirical AC. Use the convention from `Q-R46-EMPIRICAL.sh`
   (canonical reference). Set executable bit (`chmod +x`).
5. **The spec AC text** SHOULD say "Verification: see Q-RNN-EMPIRICAL.sh AC-RNN-N" rather
   than memorizing the number in the spec body.

### Tightening: Avoid vacuous meta-ACs (R47)

**Anti-pattern** (observed at R46 AC-R46-6; flagged as R46 Reviewer MAJOR-1):

```bash
echo "AC-R<N>-K: self-application — this file exits 0 (verified by harness aggregate)"
echo "  PASS — AC-R<N>-K (asserted by aggregate exit code below)"
PASS=$((PASS + 1))
```

The AC asserts a property — "this file exits 0" — that IS the aggregate of all
other ACs. Hard-coding PASS makes the AC vacuous; the real binding is the aggregate
exit code, which would happen regardless of this AC's presence. The block adds 1
to the PASS counter but verifies nothing independently.

**Tightened pattern:** eliminate self-referential meta-ACs. The aggregate exit code
IS the empirical-AC harness's binding; making it an AC of itself is structurally
circular. If "self-application demonstration" is a desired spec deliverable, make
it a SUBSTANTIVE check:

```bash
# Concrete, non-circular property:
echo "AC-R<N>-K: Q-R<N>-EMPIRICAL.sh syntax-validates"
SYNTAX_OK=$(bash -n coordination/specs/Q-R<N>-EMPIRICAL.sh 2>&1 && echo "ok" || echo "fail")
assert_eq "AC-R<N>-K" "ok" "$SYNTAX_OK"
```

**Rationale:** A vacuous AC inflates the PASS count and gives false confidence;
worse, it can mask a genuine bug where the harness aggregate is wrong. Concrete
ACs surface concrete failures.

### Tightening: Verify runtime behavior, not source presence (R47)

**Anti-pattern** (observed at R46 AC-R46-10; flagged as R46 Reviewer MAJOR-3):

```bash
ACTUAL=$(grep -c 'MECHANICAL CHECK via sub-class verifier' scripts/pre-commit-rule-sweep.sh)
```

This greps the SOURCE of `pre-commit-rule-sweep.sh` for the label "MECHANICAL CHECK
via sub-class verifier". The check passes if the label appears in the source — but
the function containing the label can be disabled, short-circuited via early
return, or never invoked at runtime, and the source-grep still passes.

**Tightened pattern:** for "runtime behavior active" claims, INVOKE the code path
and grep its STDOUT:

```bash
ACTUAL=$(scripts/pre-commit-rule-sweep.sh <SHA1> <SHA2> 2>&1 \
    | grep -c 'MECHANICAL CHECK via sub-class verifier')
```

This confirms the label appears in actual output — empirical proof the function
ran. The check is structurally stronger: any change that disables the function
will cause the stdout-grep to return 0, surfacing the regression.

**Rationale:** Source-presence checks pass even when the code is dead. A test that
passes when the code path is inert is not load-bearing. For every AC claiming
"runtime mode X is active," invoke the runtime and inspect the resulting output.

### Tightening: Re-derive SHAs from git at citation time (R47)

**Anti-pattern** (observed at R46 NEXT-ROLE.md round-start SHA citation; flagged
as R46 Reviewer MAJOR-2):

The Implementer cited "pre-R46 SHA = `439c1ff`" — but the actual pre-R46 SHA was
`7bc026f` after the R42-R45 Reviewer batch landed between R45 close and R46
authorship. The 7-file diff count conflated `<pre-R46>..<chore-A>` (6 files)
with `<pre-R46>..<HEAD-backfill>` (7 files). Both values were memorized from
prior session state rather than re-derived from `git` at attestation time.

**Tightened pattern:** every SHA + diff-count cited in a spec or attestation MUST
come with the `git` command that derived it. The command runs at citation time:

```bash
ROUND_START_SHA=$(git rev-parse <some-ref> 2>/dev/null)
CHORE_A_SHA=$(git rev-parse HEAD 2>/dev/null)
DIFF_FILES=$(git diff --name-only "$ROUND_START_SHA" "$CHORE_A_SHA" | wc -l | tr -d ' ')
```

Attestation cites: "round-start SHA = `$ROUND_START_SHA` (`git rev-parse <ref>`);
diff = $DIFF_FILES files (`git diff --name-only <ROUND_START>..<CHORE_A> | wc -l`)."

**Rationale:** SHAs from prior session state become stale the moment a new commit
lands. Memorized counts conflate ranges. The convention "cite the command that
produced the value" makes drift structurally impossible — the command is the
spec; the output is the attestation.

### Tightening: Prefer exact counts over `≥ 1` thresholds (R47)

**Anti-pattern:** `grep -c '...' file -ge 1` — passes on any non-zero count.
Incidental matches in prose silently satisfy the threshold.

**Tightened pattern:** use exact count where structural meaning supports it:

```bash
ACTUAL=$(grep -cE '^canonical_marker_at_line_start' file)
assert_eq "AC-R<N>-K" "expected_count" "$ACTUAL"
```

Use line-anchored grep (`^pattern`) to avoid matching incidental prose mentions.
If exact count is sensitive to formatting drift, use a discriminating regex
that uniquely identifies the structural location.

**Rationale:** `≥ 1` thresholds give false confidence — any incidental occurrence
of the searched token passes the check, even when the structural property the AC
intended to verify is absent. Exact counts surface structural drift immediately.

### Chore-A requirements (at Implementer commit)

1. **Run `scripts/verify-empirical-acs.sh <round>` BEFORE chore-A commit.**
2. Exit 0 → all empirical ACs verified; attestation in NEXT-ROLE.md / MEMORIAL.md
   can claim PASS, with the attestation text quoting the script's output rather
   than memorized values.
3. Exit non-zero → HALT + DIAGNOSTIC. Do NOT attest PASS on the failed AC. Per
   Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround), do NOT inline-fix the
   spec text to match a wrong number; surface the discrepancy via DIAGNOSTIC and
   ESCALATE so the operator decides whether the spec or the implementation is at
   fault.

### Reviewer cold-eye requirements

1. **Re-run `scripts/verify-empirical-acs.sh <round>` at HEAD** as part of the
   per-AC verification pass. Independent execution; same code path; same expected
   exit 0.
2. If the script exits non-zero at Reviewer-stage when the Implementer attested
   PASS → MAJOR finding (false-compliance-attestation sub-class instance).

### Pre-commit-rule-sweep integration

`scripts/pre-commit-rule-sweep.sh` `rule_1_check` (upgraded from SEMANTIC stub to
MECHANICAL at R46) invokes `scripts/verify-empirical-acs.sh` for the round's spec
and flags mismatches as Rule 1 violations. This closes the Surface (b) loop for
Rule 1 — the rule is no longer enforced by manual discipline alone.

### Cross-project canonical landing

The Rule 1 sub-class amendment to `~/.claude/CROSS-PROJECT-MEMORIAL.md` Rule 1
canonical text is DEFERRED to 2nd-project occurrence per Rule 7
anchor-canonical-landing-deferred discipline (established precedent: R42 § 5.5
memorial sharding; R44 Rule 7 Surface a; R45 Rule 7 Surface b). Tessera is 1
project data point for this sub-class; cross-project canonicalization without
2nd-project occurrence reproduces exactly the pattern Rule 7 warns against.
Operator decides cross-project promotion separately. Until then, the sub-class
applies at Tessera-internal scope only — but the mechanism is fully operational
within Tessera.

### Self-application demonstration

R46 itself derives this sub-class AND applies it to its own ACs via
`coordination/specs/Q-R46-EMPIRICAL.sh`. Per Rule 7 Surface (c)
round-of-derivation special case, the round MUST grep-sweep its own diff for
the new sub-class's prohibited pattern. R46's compliance is verifiable by
running `scripts/verify-empirical-acs.sh R46` — expected exit 0 at chore-A SHA.

---

## Pipeline-mandatory discipline

Every spec's `## Pipeline invocation` footer (`./run-pipeline.sh --round R<NN> --tier <tier>`) is
the canonical method for round execution. Interactive-mode single-session is the DEVIATION, not
the default. Any round that does not run through the pipeline (or document an explicit
operator-waiver with rationale) is a Rule 1 sub-class candidate violation: the Implementer
self-attestation chain bypasses the cold-eye Reviewer safety net the framework was designed around.

**Author-time requirements:**
1. Every spec MUST include a `## Pipeline invocation` (or `## § N. Pipeline invocation`) footer
   with the exact `./run-pipeline.sh --round R<NN> --tier <tier>` command.
2. For close-walk class rounds (Phase close, SLICE close, sub-Phase close, wave consolidation),
   add `CLOSE-WALK-CLASS: true` to `coordination/NEXT-ROLE.md` — `scripts/finalize-round.sh`
   reads this field and passes `--hybrid-reviewer` to `run-pipeline.sh` automatically.

**Chore-A requirements:**
- After committing coordination artifacts, invoke `scripts/finalize-round.sh` (preferred) or
  `./run-pipeline.sh --round R<NN> --start-at REVIEWER --tier <tier>` directly. Do NOT declare
  the round complete at chore-A without triggering the Reviewer + Memorial-Updater pipeline stages.
- `scripts/finalize-round.sh` auto-invokes the pipeline after its step 6 integrity check via the
  `_FINALIZE_PIPELINE_ACTIVE` guard (prevents recursion; exported env-var propagates to pipeline).

**Waiver path (exceptional only):**
If the pipeline cannot run (network outage, Claude API unavailable, operator-explicit exception),
document the waiver in `coordination/NEXT-ROLE.md` with rationale and manually invoke a cold-eye
Reviewer session before merging the round's artifacts.

> **Canonical text landed at:** R49 (2026-05-19). Rule 7 Surface (a) for pipeline-mandatory discipline.

---

## Wave-aggregate verification discipline

**Sub-class canonical text:**

> **Wave-aggregate verification discipline (R50):** Multi-cluster parallel waves where
> any constituent cluster ran `--tier solo` (no per-cluster Reviewer) MUST run a cold-eye
> consolidation Reviewer at wave-gate before STATUS: WAVE-COMPLETE. The Coordinator
> wave-gate aggregation is NOT a substitute for a Reviewer — it is bookkeeping.
> Cross-cluster contract drift, aggregate scope creep, and MEMORIAL fragment
> semantic-conflict are visible only at the consolidated layer.

**Background (why this discipline exists):** The R42-R47 design analysis identified that
when ≥1 cluster in a wave runs `--tier solo`, no cold-eye Reviewer audits that cluster's
work. The Coordinator wave-gate checklist (file-level bookkeeping) cannot catch semantic
integration gaps. A consolidation Reviewer provides the missing audit at the consolidated
layer before the wave advances.

**Three mechanical checks** (`scripts/verify-wave-aggregate.sh WAVE-NN`):

1. **Aggregate ALLOWED_SET union check** (mechanical where wave-level ALLOWED_SET is
   defined in the wave plan): verifies the union of all cluster diffs ⊆ wave-level allowed
   set. Detects aggregate scope creep invisible at per-cluster level.
2. **Cross-cluster contract drift check** (advisory): identifies files appearing in ≥2
   cluster diffs; flags for manual interface-shape verification. Cannot be mechanically
   verified without semantic understanding.
3. **MEMORIAL fragment semantic-conflict detection** (advisory): checks for the same
   discipline keyword appearing as CONFIRMATION in one cluster and VIOLATION in another.
   Flags for operator decision.

**Authoring requirements:**

At wave-plan authoring time (Coordinator):
- Add a `## Wave-level ALLOWED_SET` section to `coordination/WAVE-PLAN-NN.md` listing
  the union of all anticipated cluster ALLOWED_SETs plus coordination/ files.
- Classify each cluster's tier in the wave plan. If any cluster is classified `solo`,
  note that the wave-gate MUST run consolidation Reviewer.

At wave-gate close (Coordinator):
1. Run `./run-pipeline.sh --coordinator --wave-gate WAVE-NN` — this invokes
   `scripts/verify-wave-aggregate.sh`, detects solo-tier clusters, and fires the
   consolidation Reviewer if required.
2. Review advisory outputs from Checks 2 and 3 before stamping `STATUS: WAVE-COMPLETE`.

**Coordinator role-file reference:** See `CLAUDE-COORDINATOR.md` §
"Tier-aware consolidation Reviewer at wave-gate close" for the invocation pattern and
wave-gate close flow sequence.

> **Canonical text landed at:** R50 (2026-05-19). Closes "no cold-eye review at consolidation
> when clusters ran solo-tier" gap. Rule 7 Surface (a) for wave-aggregate verification discipline.
