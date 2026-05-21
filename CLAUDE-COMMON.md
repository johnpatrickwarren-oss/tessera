# Tessera — Common discipline block

# ─────────────────────────────────────────────────────────────────────────────
# HOW THIS FILE WORKS
#
# This file holds disciplines that apply to EVERY role. The pipeline script
# (run-pipeline.sh) appends this file PLUS the role-specific CLAUDE-<ROLE>.md
# file PLUS coordination/.role-stamp (gitignored) to the system prompt.
#
# Splitting CLAUDE.md into COMMON + per-role files cuts the per-session prompt
# size roughly in half. Cross-worktree prompt-cache reuse is preserved as long
# as the common + per-role files are byte-identical across worktrees.
#
# To start a new project: cp CLAUDE.md.template CLAUDE.md (slim loader), then
# install the split files. Add coordination/.role-stamp to .gitignore.
# ─────────────────────────────────────────────────────────────────────────────

# ── SUPERPOWERS DISCIPLINES (inlined) ─────────────────────────────────────────
#
# Superpowers is installed as an MCP plugin and provides /brainstorm,
# /execute-plan, and related slash commands in interactive sessions.
#
# In headless sessions (run-pipeline.sh uses -p flag), MCP tools may not load.
# These inlined blocks reproduce the core discipline logic so it fires reliably
# in both modes. When Superpowers MCP is active, these complement it.
#
# The disciplines are: brainstorm → design → execute → review.
# Each role applies the phases relevant to its work.

## Superpowers: Brainstorm
Before committing to any approach:
  1. Generate at least 3 distinct approaches
  2. For each: strengths, weaknesses, hidden assumptions, risks
  3. Identify which constraints from the requirements eliminate options
  4. Select the best tradeoff — not the first option
  5. Document selection rationale: what you chose AND what you rejected and why
This documentation belongs in your artifact, not kept internal.

## Superpowers: Design
Before writing detailed specs or pseudocode:
  1. Sketch component boundaries: what exists / what gets created / what changes
  2. Identify all integration points and data flows
  3. Verify each integration point against requirements explicitly
  4. Identify failure modes at each integration point
  5. Write this sketch inline — it precedes the detailed pseudocode

## Superpowers: Execute
For each implementation unit (file, function, module):
  1. Write the test first. It MUST fail before writing any implementation.
  2. Write the minimal implementation that makes the test pass.
  3. Refactor only after green.
  4. Before the next unit: does this do exactly what the spec says?
     Not more. Not your interpretation. Exactly what it says.
  5. At each checkpoint: does anything not match the spec?
     If yes: HALT. Write a DIAGNOSTIC. Do not continue past a mismatch.

## Superpowers: Review
Before emitting any artifact to the next role:
  1. Re-read as if you are the next role receiving it cold
  2. Mark every place you assumed something the next role cannot verify
  3. Mark every place a decision was deferred rather than made
  4. Confirm no scope beyond the request was added
  5. Ask: can the next role act on this with zero clarifying questions?
     If no: revise first.

# ── UNIVERSAL DISCIPLINES (all roles) ─────────────────────────────────────────

## Role identity
Your role is set in the ROLE-STAMP block appended to the system prompt by
the pipeline (sourced from coordination/.role-stamp).
NEVER infer or claim your role from conversation context or prior messages.
NEVER write "THIS session = X" in any shared coordination file.
If uncertain of your role: stop, write an escalation, do not assume.

## Audit trail
All coordination artifacts are written to files in coordination/, not chat.
If it isn't in a file, it didn't happen.

Naming conventions:
  Specs:        coordination/specs/Q-RNN-SPEC.md
  Spec audit:   coordination/specs/Q-RNN-SPEC-AUDIT.md (Architect ceremony sidecar)
  Reviews:      coordination/reviews/REVIEWER-REPORT-RNN.md
  Diagnostics:  coordination/diagnostics/DIAGNOSTIC-RNN-[topic].md
  Memorial:     coordination/MEMORIAL.md         (active; current-phase rounds)
  Memorial shards:  coordination/MEMORIAL-PHASE-N.md  (frozen historical shards;
                R42 sharding 2026-05-19; see active-file phase-shard index)
  Next role:    coordination/NEXT-ROLE.md

## Memorial sharding (R42 onward)
The active `coordination/MEMORIAL.md` holds the current open-phase round
entries plus the bootstrap header, inherited-Memorials table, lineage table,
and phase-shard index. Past-phase content lives in `MEMORIAL-PHASE-N.md`
shards listed in the active file's phase-shard-index table:

  - Phase 1 (R01–R19): coordination/MEMORIAL-PHASE-1.md  (CLOSED)
  - Phase 2 (R20–R41): coordination/MEMORIAL-PHASE-2.md  (CLOSED)
  - Active (R42+):     coordination/MEMORIAL.md           (OPEN)

Read protocol:
  - Default per-round read = active file in full.
  - Cross-phase reference (locating a derived REINFORCED line, resolving a
    `MEMORIAL.md:NNNN` back-reference, verifying a prior Memorial-D cell) =
    read the relevant phase shard on demand.
  - Append target is always the active file. Shards are frozen.
  - Resolving a `MEMORIAL.md:NNNN` back-reference inside a shard:
    `cat coordination/MEMORIAL-PHASE-1.md coordination/MEMORIAL-PHASE-2.md`
    (after stripping the 12-line per-shard header) reproduces pre-R42 line
    numbering. Alternatively `git show <pre-R42-SHA>:coordination/MEMORIAL.md`.
  - At next phase close: active content rolls to a new `MEMORIAL-PHASE-N.md`;
    the active file resets to header + index + new-phase rounds.

## Cache-prefix mechanism (Mode docs — informational; not a REINFORCED rule)

The pipeline structures each role-session's appended system prompt as a stable
PREFIX + per-role TAIL so Anthropic's prompt cache hits the prefix across
sequential role sessions within a 5-minute TTL.

PREFIX (byte-identical across IMPLEMENTER / REVIEWER / MEMORIAL-UPDATER within
a single round):
  - CLAUDE-COMMON.md
  - coordination/specs/Q-${round}-SPEC.md
  - coordination/specs/Q-${round}-SPEC-AUDIT.md
  - coordination/specs/Q-${round}-EMPIRICAL.sh
  - The ## § R${round} Round-scope directive section of coordination/NEXT-ROLE.md

TAIL (varies per role):
  - CLAUDE-<ROLE>.md  (role-specific discipline file)
  - Role-stamp lines naming THIS SESSION ROLE + Round

Construction: scripts/build-role-context.ts is the single source of truth. The
pipeline invokes node scripts/build-role-context.js --emit full --role <ROLE>
--round R<N> at each role dispatch. If the compiled .js is absent (fresh
clone or first run of the round that introduces it), the pipeline falls back
to the legacy cat-bundle construction; correctness is preserved, cache
savings are not realized.

Architect session note: the spec triad does not exist at Architect-dispatch
time (the Architect creates it). The Architect's prefix omits those files,
so the Architect's bundle is not byte-identical to the Impl/Rev/MU prefix.
The cache benefit applies to the IMPL → REV → MU chain.

Within-round prefix-continuity invariant: once the Architect commits the
spec triad, no role may modify the contents of Q-${round}-SPEC.md,
Q-${round}-SPEC-AUDIT.md, Q-${round}-EMPIRICAL.sh (beyond pre-prescribed
placeholder substitutions such as SHA injection blocks), nor the
## § R${round} Round-scope directive section of NEXT-ROLE.md, nor
CLAUDE-COMMON.md itself. Routing blocks for downstream roles are appended
below the directive section, preserving its byte-identity.

This Mode docs section is informational. It is not a REINFORCED rule and
does not extend any prior REINFORCED rule.

## Pre-emit grilling (non-negotiable for all roles)
Before setting STATUS: READY in NEXT-ROLE.md, run adversarial self-review:
  1. Is every claim in my artifact backed by something verifiable?
  2. Does any part rely on an unstated assumption?
  3. Have I added scope beyond what was requested?
  4. Can the next role act on this without making decisions I should have made?
If any answer is yes: fix first. The grilling output is written inline in the
artifact itself — not kept internal.

## Memorial accretion
After completing your role's work, append to coordination/MEMORIAL.md:
  CONFIRMATION: [discipline] | [what worked, specifically] | [round] | [role]
  VIOLATION:    [discipline] | [what happened, specifically] | [round] | [role]
Be specific. "Grilling confirmed" is not useful. "Grilling caught missing error
handling for null input in AC-03 before routing to Implementer" is useful.

## Escalation protocol
Set STATUS: ESCALATE in coordination/NEXT-ROLE.md when you hit a condition
you cannot resolve without a design decision that belongs to the operator.
Write a bounded question:
  NOT: "What should I do?"
  YES: "Option A does X (consequence Y). Option B does Z (consequence W). Which?"
The pipeline surfaces this and pauses. You do not proceed unilaterally.

# ── TIER SELECTION (operator, applied before round start) ────────────────────
# Anchor scales — not every round needs the full 4-role cycle. The pipeline
# accepts --tier solo, audit, or full (full is default). Pick the cheapest tier the
# work genuinely warrants; pick full when in doubt.
#
# Canonical reference: skills/11-round-scaling.md in the anchor repo. The
# summary below is duplicated here so role sessions reading CLAUDE.md as
# system prompt can apply the rubric without reading the skill file.
#
# Naming note: Anchor's four-anchor pre-merge defense uses T0/T1/T2/T3 for
# temporally-ordered discipline checkpoints (see METHODOLOGY.md). The tier
# dial below uses verbal names (solo/audit/full) to avoid that collision.
# Backward-compat: --tier T0/T1/T3 still accepted with deprecation warning.
#
# full = Architect + Implementer + Reviewer + Memorial (full Anchor; ~4x baseline)
# audit = Implementer + Reviewer + Memorial (no separate Architect; ~3x baseline)
# solo = Implementer only (solo; spec, execute, memorial inline; ~1-2x baseline)
#
# Each tier-down is a real safety trade. audit drops the Architect's cold-eye
# spec discipline; solo also drops the Reviewer's cold-eye audit. The cost
# savings come at the cost of pre-merge bug-catching surface.
#
# MULTI-CLUSTER MODE (orthogonal to tier dial; OPT-IN). When PRD scope contains
# work units that are genuinely independent, the operator can invoke
# `run-pipeline.sh --coordinator` to produce a wave plan that decomposes the
# work across parallel clusters (worktrees). Each cluster then runs its own
# tier-scaled pipeline (solo/audit/full per cluster) against its work unit.
# Wave plans, cluster handoffs, wave gates, and Coordinator memorial are
# governed by CLAUDE-COORDINATOR.md (loaded only in --coordinator mode).
# Multi-cluster overhead is real — the Coordinator role pays for itself only
# when ≥2 clusters can dispatch concurrently in at least one wave. For
# linear-dependency scope (most Tessera Phase 1/2 slices to date), the wave
# plan correctly recommends single-cluster waves and standard single-pipeline
# execution proceeds.

## How to pick a tier (60-second decision tree)

Walk top-down; stop at the first match. Whoever picks the tier (operator
or Architect-advising-operator) records the verdict and the matched
criterion in the round's PRD scope block.

```
1. Does ANY of A1–A7 fire?
     YES → full (need the Architect's cold-eye spec discipline)
     NO  → continue

2. Is the entire diff pure-mechanical, matching ONE Z criterion (Z1–Z5)?
     YES → solo (visual diff inspection replaces cold-eye review)
     NO  → continue

3. Does ANY of S1–S5 fire?
     YES → audit (Implementer self-specs; Reviewer audits cold)
     NO  → full (default — the rubric did not justify a downshift)
```

Three forcing functions: A factors push UP to full; Z factors push DOWN
to solo; absence of justification stays at full default.

## Worked examples

| Round description | Tier | Matched criterion |
|---|---|---|
| Add a new entity + migration + admin UI | full | A4 (novel data model) |
| Switch middleware runtime (Edge → Node) | full | A2 (new pattern), A6 (blast radius) |
| Add a new external integration (Stripe, Sentry, etc.) | full | A1 (new dependency) |
| Resolve an open question from the PRD this round | full | A3 |
| Add a new admin page extending an existing list-view pattern | audit | S1, S2 |
| Add a sortable column to an existing table | audit | S1, S3 |
| Add an e2e test for a recently-shipped screen | audit | S4 (tactical follow-up) |
| Fix 3 leftover MINORs from a prior round's Reviewer report | audit | S4 |
| Add a feature-flag check (even one line of new behavior) | audit | new behavior — fails Z; S3 applies |
| Add 5 new unit tests against an existing pure function (no prod change) | solo | Z3 |
| Add 5 new integration tests closing a prior-round MINOR coverage gap | audit | Z3 disqualified (gap-closure + integration-tier); S4 applies |
| Bump Playwright timeout from 5s to 10s | solo | Z4 |
| Rename an internal helper function (no external callers) | solo | Z1 |
| Update `templates/PRD-TEMPLATE.md` docs | solo | Z2 |
| Fix typo in a user-facing button label | solo | Z5 |
| Bump a npm dev-dependency patch version | solo | Z1 |

When in doubt between two tiers, pick the higher one. The cost of an
unneeded extra role is one model call; the cost of a missed architectural
decision or a missed adversarial finding is a 2–4-cycle fix recovery.

## Criteria — A factors (any one → full)
  A1. New external dependency (npm lib, external service, new API)
  A2. New architectural pattern with no precedent in the codebase
  A3. Unresolved open question that this round must resolve
  A4. Novel data model (new entities or relationship patterns)
  A5. Critical NFR ties that materially constrain design choices
  A6. Large blast radius (touches ≥ 4 prior rounds' production code paths
      OR risks breaking backward compatibility for many existing tests)
  A7. First-time territory — the project has never done X before

## Criteria — S factors (all-A-false AND any-S → audit candidate)
  S1. Direct extension of a recent round's already-shipped pattern
  S2. Prior round artifacts (spec or Reviewer report) functionally describe
      the work
  S3. Single bounded item (one bug fix, one AC, one config change)
  S4. Tactical follow-up to a recent round (fixing leftover MINORs)
  S5. Tech-debt with empirical investigation where the investigation IS the
      design work

## Criteria — Z factors (audit candidate AND pure-mechanical → solo candidate)
  Z1. Single-file mechanical rename, version bump, or format change
      (no behavior change)
  Z2. Documentation-only change (no code or test behavior change)
  Z3. Test-only addition — adding new tests against existing production
      code (NOT modifying existing test assertions). Z3 applies cleanly to:
      unit tests against pure functions or well-bounded units; ≤3 simple
      additions; tests that don't close a prior-round MINOR/MAJOR gap.
      Z3 does NOT apply (use audit instead) when:
        (a) the tests are integration-tier or e2e-tier with non-trivial
            fixtures, multiple production-call paths, or DB/external state —
            cold-eye Reviewer is warranted for fixture-distinctiveness,
            action-signature-drift, and self-confirming-test risk that are
            harder for the Implementer to self-catch.
        (b) the round closes a prior-round MINOR/MAJOR coverage gap — the
            gap exists because someone already missed it once; the fix
            needs adversarial review, not self-review.
        (c) the fixtures or assertion shapes are non-obvious (e.g.,
            require careful distinctiveness analysis or snapshot-key
            cross-checks).
  Z4. Configuration value tweak (env var, port, timeout) where the value
      is the only change
  Z5. Cosmetic UI tweak (label text, color, padding) where visual review
      can substitute for code review

solo is explicitly NOT for:
  - Any new behavior, even small ("adds one feature flag check")
  - Any spec gap requiring a decision
  - Any modification of existing test assertions
  - Anything that touches schema, middleware, auth, or shared infrastructure
  - Anything where verifying correctness requires more than visual diff
    inspection

## Promotion mid-round (solo → audit, audit → full)
A solo round whose actual diff exceeds Z criteria → Implementer HALTs with
a DIAGNOSTIC and recommends operator re-run as audit (so the cold-eye
Reviewer audits the result). Silent expansion is a discipline failure.

A audit round where the Implementer's self-spec hits architectural ambiguity
→ HALT with a bounded DIAGNOSTIC, operator picks Option A/B/C. If the
chosen resolution is materially novel, operator can re-run as full for the
fix cycle.

A full round where the Architect finds the spec is trivial (no design
decisions to make) → Architect notes in NEXT-ROLE.md that a future
similar round could safely use audit. Current round still completes as full.

## Recording the decision
For audit and solo rounds, write the rubric verdict in the round's PRD scope
block before launching: which Ai factors are all false, which Si justify
skipping the Architect, which Zi justify also skipping the Reviewer. This
is the audit trail. If a audit round produces halts an Architect would have
caught, or a solo round merges a bug a Reviewer would have caught, compare
to the recorded verdict — the rubric needs sharpening.

full is the default; no record required for full rounds.

# ── COMMON REINFORCEMENTS ─────────────────────────────────────────────────────
# Memorial Updater writes here when a violation is cross-role / methodology-wide.
# Role-specific reinforcements go in the matching CLAUDE-<ROLE>.md file.
# Each line is a lesson derived from a real violation. Do not delete.
#
# Example:
# # REINFORCED 2026-05-08 — Every spec must cite source files at a pinned SHA;
# #   memory citations introduce type-state drift that downstream roles can't catch.

# REINFORCED 2026-05-16 — A MEMORIAL entry authored by the violating role that characterizes
#   its own discipline deviation as "correct" or "acceptable" in contradiction to established
#   methodology reinforcements is an audit-trail inaccuracy. The MEMORIAL is a shared
#   coordination artifact, not a defense brief. When a role's self-written MEMORIAL entry says
#   "No DIAGNOSTIC file written (correct — spec-reality conflict with an empirically
#   determinable answer does not require HALT)," that entry encodes a wrong methodology
#   interpretation and must not be left to stand. The Memorial Updater must identify these
#   self-justifying entries and record an explicit VIOLATION entry that names the incorrect
#   characterization — not silently accept the violating role's retroactive reframing.
#   Established reinforcement rules take precedence over role-authored self-exoneration.
#   Detected tessera R08: Implementer MEMORIAL entry incorrectly characterized a halt-
#   discipline deviation as "correct"; the R08 Reviewer report (MAJOR-1) and the Reviewer's
#   corrective MEMORIAL entry correctly classified the same event as a violation.
# REINFORCED 2026-05-17 — The coordination-chore-sequence verification step ("Reviewer
#   verifies: git diff SHA-A HEAD -- src/ tests/ tools/ engine/ ...") structurally cannot
#   catch anti-scope violations that occur inside SHA-A (the chore commit itself), because
#   SHA-A is the lower bound of the diff. The correct completeness gate is a round-start-to-
#   HEAD diff: "git diff ROUND-START-SHA HEAD --name-only -- src/ test/ engine/ tools/"
#   (note: project uses `test/` singular; the template's `tests/` typo silently skips the
#   real test directory). Add this as a supplementary check at chore-sequence step 7. The
#   existing post-coordination-commit check only catches modifications AFTER SHA-A. Detected
#   tessera R19 MINOR-3.
# REINFORCED 2026-05-17 — Audit-tier promotion-mid-round rule (§ "Promotion mid-round"):
#   when an audit-tier round's binding-command run surfaces a test-file failure whose passing
#   fix requires modifying an anti-scoped file, this IS a halt-condition for spec promotion.
#   The Implementer MUST HALT, write a DIAGNOSTIC that includes "recommend promotion to full
#   tier" as one of the bounded options, and set STATUS: ESCALATE. The risk: in audit-tier
#   self-spec rounds, the Implementer can breach their own anti-scope clause with no in-
#   session check — the Reviewer is the only post-hoc gate. Promotion-to-full ensures an
#   Architect reviews the spec amendment before the anti-scope modification is applied.
#   Detected tessera R19 OBS-4 / MAJOR-2.
# REINFORCED 2026-05-18 — encode-actual-results-verbatim (MR-2 Pass 3 promotion; all roles):
#   When a binding-command or test produces a result, record the ACTUAL observed value — never
#   reframe errors to match the AC literal, never propagate spec-predicted counts as observed.
#   This applies to: tsc exit codes, test pass/fail counts, git diff outputs, any attestation
#   in NEXT-ROLE.md. The discipline is the same across Architect, Implementer, and Reviewer
#   roles. Tessera origin: R03 MINOR-4 (count), R26 MAJOR-1 (exit code) — see CROSS-PROJECT-
#   MEMORIAL.md false-compliance-attestation rule.
# REINFORCED 2026-05-18 — data-flow-not-syntax (MR-2 Pass 3 promotion; all roles):
#   When making a coverage claim about a constructor, function, or fallback chain (`a ?? b ?? c`),
#   trace the coverage through FULL data flow — including values returned by any function called
#   before the chain is evaluated. If an upstream function always provides a non-nullable value
#   for field `b`, then the third operand `c` is structurally dead. The coverage claim "all opts
#   fields covered" is inaccurate for that operand. Ask: "under what actual inputs does each `??`
#   operand fire?" — not merely list the opts fields syntactically. Tessera origin: R30 MINOR-2.
# REINFORCED 2026-05-18 — line-citation-cite-then-verify (MR-2 Pass 3 promotion; all roles):
#   When citing a specific file:line in any coordination artifact (NEXT-ROLE.md, MEMORIAL.md,
#   spec AC tables, Reviewer reports), verify the citation points to the exact line BEFORE
#   writing it. Cite the `test()` declaration line (not the first assertion), the function
#   definition line (not a usage), the field declaration (not a comment). Off-by-1 to off-by-5
#   drift accumulates across roles and reduces independent verifiability. Confirm by grep or
#   offset-read. Tessera origin: R03 MINOR-4 (count), R21 MINOR-4 (test line citations).
# REINFORCED 2026-05-20 — spec-amendment-ALL-gate-artifacts-propagation (all roles):
#   When any role (Architect, Implementer, Coordinator, Operator) amends a spec to acknowledge
#   authorized path additions or changes (e.g., adding .gitignore to ALLOWED_SET narrative §
#   5.2), the amendment MUST propagate to ALL gate artifacts enforcing the same invariant: (a)
#   the spec § ALLOWED_SET enumeration (§ 5.1); (b) Q-RNN-EMPIRICAL.sh Block N allowed_set;
#   (c) any path-list or diff-check that validates the same surface. Amending only the
#   narrative description while leaving machine-checkable lists unchanged creates internal
#   spec inconsistency: the human-readable section acknowledges a change that the verification
#   harness flags as unauthorized — making an honest attestation structurally impossible.
#   Pre-routing gate (applies to all roles): after any ALLOWED_SET-adjacent amendment, run
#   EMPIRICAL.sh at HEAD and verify exit 0. If any Block fails, the amendment is incomplete.
#   Detected tessera R72 MAJOR-2 (Reviewer-2; Coordinator amended § 5.2 but not § 5.1 +
#   EMPIRICAL.sh; Coordinator-direct fix at commit 8b15549 completed the propagation).
# REINFORCED 2026-05-20 — attestation-supplementary-fields-verbatim (all roles):
#   The encode-actual-results-verbatim rule (REINFORCED 2026-05-18) applies to ALL cited
#   field values in a structured command output — not only the field bound by the AC.
#   When a binding-command result produces structured JSON (e.g., {model, rationale,
#   decision_path, matched_anchors}), any interpretive commentary citing a specific field
#   (e.g., "the selector matched Class C because Reviewer-2 + ESCALATE appear in the
#   directive") is also a binding-command observation and must be derived verbatim from
#   the actual JSON fields. Fabricating a rationale for WHY the result occurred — even
#   when the primary bound field (model value) is correct — violates the attestation
#   principle: the full JSON object is the observable, not just the AC-bound key.
#   Procedure: before writing any interpretive "because X" commentary on a structured
#   command result, read the corresponding field in the actual output and copy it verbatim.
#   If the rationale is unclear from the output fields, record "rationale unclear from
#   output — see matched_anchors: [...]" rather than fabricating an explanation.
#   Detected tessera R74 MAJOR-1 R1 (Implementer attested Class C rationale; actual
#   selector matched_anchors = ["cross-project canonical"] / decision_path = ["marker_match",
#   "class_A"]; Rule 1 sub-class attestation-supplementary-fields-must-be-verbatim).
