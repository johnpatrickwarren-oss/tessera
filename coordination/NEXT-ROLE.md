CURRENT-ROUND: R41
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Round-scope directive (R41 — repo hygiene audit; audit-tier; main worktree) — FINAL safe-continuation round

R41 = fourth and **final** round of post-Phase-2-close safe-continuation chain per evening overnight authority [[project-overnight-authority-2026-05-18-morning]].

After R41: **HARD STOP at natural exhaustion of safe-continuation work.** Operator wakes to fully-closed Phase 2 + post-Phase-2-close hygiene complete + Phase 3 entry-prep inventory ready for review.

## Primary deliverable

**Comprehensive repo hygiene audit + fix-as-you-go for low-risk issues.** Audit-tier; Implementer authors thin spec inline. Scope:

### Surface 1 — Artifact link + reference validation

For each `coordination/*.md` artifact emitted this overnight session (~25 files: PHASE-2-SLICE-{1,2,3}-CLOSE-WALK.md + PHASE-2-CLOSE-WALK.md + WAVE-PLAN-{01,02,03}.md + WAVE-GATE-{01,02,03,04,05}.md + 11 CLUSTER-HANDOFF-*.md + COORDINATOR-MEMORIAL.md + STAGED-FOR-PHASE-2-CLOSE.md + ANCHOR-BACKFLOW-2026-05-18.md + PHASE-3-CANDIDATES-PRELIMINARY.md):

- Grep for relative file paths (`coordination/...`; `engine/...`; `test/...`); verify each path exists on disk
- Grep for `[[memory-name]]` references; verify memory files exist
- Grep for line-number citations (`file.ts:N`); spot-check accuracy for at least 5 random citations per artifact
- Flag orphan references (path doesn't exist) for FIX-AS-YOU-GO if doc-only OR HALT if structural

### Surface 2 — Orphan-file detection

- `find coordination/ -type f -name "*.md"`: cross-reference against `git log --diff-filter=A` for each path; flag any committed-but-never-referenced artifacts
- Same for `engine/events/`, `engine/topology/`, `test/_substrate/` (newer dirs from Phase 2)
- Flag genuinely orphaned files for operator review (do NOT auto-delete)

### Surface 3 — Test-pass verification + baseline encoding

- Run `node --test test/*.test.js` AND `npx tsc -p tsconfig.test.json` empirically at R41 session start (Rule 1 + Rule 6 compliance)
- Encode actual exit code + actual test counts verbatim in spec — do NOT cite from prior round attestations (lesson from R38 baseline-mismatch ESCALATE)
- Expected baseline approximate: ~360 tests, ~353 pass, ~2-4 fail (q36 forward-protection guards), ~3 skip (q29/q34/q36 subprocess-skip guards). Implementer encodes the actual numbers.
- Document any baseline drift in spec

### Surface 4 — Vendoring-manifest cross-check

- `coordination/VENDORING-MANIFEST.md` lists every vendored file with SHA + sync policy
- For each row: verify the target file exists on disk + first line matches `VENDORED FROM ... @<SHA>` header
- Same for anchor methodology vendoring rows (CLAUDE-COORDINATOR.md + 5 templates per MR-1)
- Flag any drift

### Surface 5 — STAGED-FOR-* artifact lifecycle audit

- `coordination/STAGED-FOR-PHASE-2-CLOSE.md` had Items 1-5; verify which were closed at WU-07 (R36) Deliverables vs which still apply post-Phase-2-close
- Items expected to be closed by R36: Item 1 (MR-2), Item 2 (R32 carry-forwards), Item 3 Tessera-local portion (subprocess-hang fixes), Item 5 (R34 reinforcement staging)
- Items expected to carry forward: Item 3 anchor backflow portion (now in ANCHOR-BACKFLOW-2026-05-18.md), Item 4 (Tailscale Phase 3 candidate)
- Mark STAGED file with which items are closed-and-when vs still-active
- If all Items closed/forwarded: rename `STAGED-FOR-PHASE-2-CLOSE.md` → `STAGED-PHASE-2-CLOSED-2026-05-19.md` for audit trail

### Surface 6 — R40 PHASE-3-CANDIDATES MAJOR-1 fix (fold-in opportunity per overnight authority)

R40 Reviewer flagged: §§ 5.1 + 6 + OQ-P3-5 of PHASE-3-CANDIDATES-PRELIMINARY.md treated Rule 7 canonical landing as "unknown" when it IS canonical-landed at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`. **Fix in-passing at R41:** correct the three references to acknowledge Rule 7 canonical status. Single-file doc edit; clear correctness criterion (cite the actual CROSS-PROJECT-MEMORIAL line); within R41 hygiene scope.

### Surface 7 — Final state summary commit

After Surfaces 1-6 complete, append a `coordination/PHASE-2-CLOSED-HYGIENE-STAMP.md` recording:
- Wall-clock chain duration (R20 SLICE 2.A start through R41 hygiene close)
- Total rounds + tasks completed (this session)
- 7 cross-project rules derivation lineage
- Phase 2 deliverable inventory cross-check
- Cluster fan-out statistics (5 multi-track clusters; ~3 hr aggregate wall-clock per parallel wave)
- Methodology friction surfaces total (14+ captured for backflow)
- "Operator wakes to..." next-session-startup snapshot

This is the operator's morning-of-2026-05-19 (or whenever) read-on-wake artifact.

## Tier rationale

**audit-tier** — hygiene audit is single-bounded scope (S3); tactical follow-up to recent rounds (S4); no novel architecture; no production code; minimal-risk doc edits. Implementer wears Architect hat; cold Reviewer audits hygiene completeness.

## Anti-scope (R41 hard limits)

- NO Phase 3 entry (this is HARD-STOP-imminent round)
- NO scoping decisions
- NO modification of engine/* (zero production-code changes)
- NO modification of any test file beyond optional R41 hygiene additions to NEW `test/q41-hygiene-audit.test.ts` if Implementer judges in-scope
- NO modification of CLAUDE-*.md (consolidation done at R39)
- NO modification of SCOPING-MEMO-v0.3.md or PRD.md
- NO writes to `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rules 1-7 canonical and frozen)
- NO new STAGED items beyond rename-if-all-closed
- NO operator-gate item dispositions
- NO opening any GitHub PRs (anchor backflow PRs remain operator-scheduled)

## Apply all 7 cross-project rules UPFRONT

- **Rule 1 (false-compliance-attestation):** Surface 3 actual baseline encoded verbatim; no reframing.
- **Rule 4 (anti-scope-allowed-set-forward-coverage):** R41 ALLOWED_SET written at RED-commit time including hygiene-stamp file + REVIEWER-REPORT-R41.md + DIAGNOSTIC-R41-* carve-outs (per established pattern).
- **Rule 5 (self-application gate):** the hygiene audit itself must produce actionable output, not just enumerate. Each finding has fix-applied OR documented-as-orphan-for-operator-review OR no-finding.
- **Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround):** any environmental mismatch (e.g., tsc version drift, test count drift) MUST produce DIAGNOSTIC; do NOT inline-absorb.
- **Rule 7 (derived-rule-propagation):** Surface 6 R40 MAJOR-1 fix IS an application of Rule 7 — the canonical landing of Rule 7 needs to propagate into the inventory artifact that referenced it.

## Halt conditions

1. **Orphan artifact reveals a missing deliverable** (e.g., a CLUSTER-HANDOFF referenced but never emitted) — HALT + DIAGNOSTIC; structural gap requires operator decision.
2. **Vendoring drift detected** (a vendored file's first-line SHA differs from manifest) — HALT + DIAGNOSTIC; do NOT auto-fix vendoring (operator-owned per existing discipline).
3. **Test baseline drift > ±3 fails** vs expected — HALT + DIAGNOSTIC (could indicate regression from R38-R40).
4. **STAGED Item lifecycle review reveals item that thought-was-closed is actually NOT closed** — HALT + DIAGNOSTIC.
5. **R40 MAJOR-1 fix-in-passing surfaces additional Rule 7 propagation gaps** — fix all if scope-bounded; HALT + ESCALATE if surfacing scope-creep risk.

## Inputs for Implementer

1. ALL `coordination/*.md` artifacts (audit surface)
2. `coordination/VENDORING-MANIFEST.md` (vendoring cross-check)
3. `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 canonical landing reference for Surface 6 fix)
4. `coordination/STAGED-FOR-PHASE-2-CLOSE.md` (lifecycle audit)
5. `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` (Surface 6 target)
6. ALL `coordination/WAVE-GATE-{01-05}.md` (audit-trail completeness)
7. `coordination/PHASE-2-CLOSE-WALK.md` (Phase 2 close state reference)

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R41 --tier audit
```

## State at R41 entry — final safe-continuation round

| Element | State |
|---|---|
| Phase 2 closed | ✅ R37 WAVE-GATE-05 stamp |
| R38 MAJOR-1 fix | ✅ verified at R38 |
| R39 consolidation | ✅ ARCH 33→25; IMPL 36→30 |
| R40 Phase 3 candidates DRAFT | ✅ emitted (MAJOR-1 content-correction folds in at R41 Surface 6) |
| 7 cross-project rules canonical | ✅ |
| 0-CRITICAL streak | 39+ rounds |
| Working tree | clean |
| HEAD | (current main post R40) |
| HARD STOP | after R41 close (natural exhaustion) — operator wakes to Phase 2 closed + hygiene complete |
