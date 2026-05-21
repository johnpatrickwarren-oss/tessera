CURRENT-ROUND: R89
NEXT-ROLE: (operator decision)
STATUS: ROUND-COMPLETE
TIER: audit

---

## § R88 close attestation (2026-05-21)

R88 closed clean. Substantive deliverable sound: `tools/curate-baseline.ts` (387 lines) ships as the one-command operator entry point composing Stage 2a + Stage 2b curation pipeline. 16/16 ACs PASS (Reviewer-re-verified). 0 CRITICAL / 1 MAJOR / 4 MINOR / 3 OBS — all architect-class / spec-fidelity-class; no Implementer execution defects. 9th Tessera-instance of `architect-claim-without-empirical-walk` memorialized (sub-pattern: structurally-wrong-grep-semantics — Architect used `grep tools .gitignore` to verify `.gitignore` exclusion behavior, missing global `*.js` rule). Phase 5 SLICE 1 closed. Test baseline: `702/682-683/15-16/4` (AC-R84-14 stochastic flake band preserved).

---

## § R89 Round-scope directive (Architect — methodology hygiene: NEXT-ROLE/MEMORIAL archival + CLAUDE-*.md composite folding + sustaining mechanisms) (2026-05-21)

R89 is a **methodology hygiene round** consolidating four queued items from the post-R86 candidate scope (MEMORIAL.md:2679) plus R88-derived accretion. NOT a substantive product round. Pattern matches R42 (MEMORIAL sharding) + R51 (CLAUDE-IMPLEMENTER composite folding) + R86 (methodology consolidation). Phase 5 SLICE 2 = methodology consolidation interlude before Phase 5 SLICE 3 substantive work.

**Motivation:** Tessera's coordination surface has accreted to load-bearing scale:
- `coordination/NEXT-ROLE.md` = 7842 lines (was sub-200 at Phase 1; per-role default reads now load 7000+ lines uncacheable)
- `coordination/MEMORIAL.md` = 2825 lines active (Phase 3 R42-R72 + Phase 4 R73-R86 + Phase 5 R87-R88 all in active file; per-round default reads suffer same fate as R42 motivated for MEMORIAL → sharding)
- `CLAUDE-ARCHITECT.md` = 52 REINFORCED entries (well above 30-entry consolidation threshold; R86 noted "manual composite folding as primary deliverable" but did not execute)
- `CLAUDE-IMPLEMENTER.md` = 41 REINFORCED entries (above 30 threshold; R51 + R70 + R71 + R81 all flagged consolidation-recommended but deferred)
- No sustaining mechanism prevents re-accretion between methodology rounds (`scripts/consolidate-reinforcements.sh` is a 180-day-age script, R86-confirmed no-op at Tessera's current age; structural enforcement absent)

**Round-start SHA:** SHA of this commit (the directive commit itself); verify at Architect session entry.

### Primary deliverables (4 items)

1. **`coordination/NEXT-ROLE.md` archival (sharding by phase).** R42 strategy (a) applied: shard by phase boundaries. Suggested cuts (Architect picks final boundaries via cite-then-walk):
   - `NEXT-ROLE-PHASE-1.md` — R01-R19 entries
   - `NEXT-ROLE-PHASE-2.md` — R20-R41 entries
   - `NEXT-ROLE-PHASE-3.md` — R42-R72 entries (or natural phase-close boundary)
   - `NEXT-ROLE-PHASE-4.md` — R73-R86 entries (plus R87 if hygiene round groups with Phase 4)
   - Active `NEXT-ROLE.md` — header + phase shard index + read-protocol bullets + R88-R89 entries
   - Content preservation: byte-identical via `sed -n '<A>,<B>p'`; no paraphrase; no reorder. Same Rule 6 anti-workaround discipline as R42 — line-number back-references PRESERVED, not rewritten (resolution path documented in active-file phase-shard-index per R42 precedent).

2. **`coordination/MEMORIAL.md` archival (Phase 3 + Phase 4 shards).** Same R42 strategy. Active file currently holds R42-R88 (Phase 3 + 4 + 5). Roll Phase 3 (R42-R72 entries) → `MEMORIAL-PHASE-3.md`; roll Phase 4 (R73-R86 entries; or R73-R87 if hygiene grouped with Phase 4) → `MEMORIAL-PHASE-4.md`. Active file resets to header + updated phase shard index + R88-R89 entries. Architect picks exact phase boundary citations via direct Read of the phase-close attestations (R72/R86 close commits and PHASE-*-CLOSE-WALK.md files).

3. **`CLAUDE-ARCHITECT.md` + `CLAUDE-IMPLEMENTER.md` composite folding.** R43 / R51 / R70 / R71 / R81 precedent: thematic composite consolidation. Targets:
   - CLAUDE-ARCHITECT.md: 52 REINFORCED → ≤30 (R43-style target band [25, 30]).
   - CLAUDE-IMPLEMENTER.md: 41 REINFORCED → ≤30.
   - CLAUDE-COMMON.md (9 REINFORCED) + CLAUDE-REVIEWER.md (4) + CLAUDE-MEMORIAL.md (3): below threshold; consolidate only if Architect finds organic composite matches.
   - Fold accreted standalone REINFORCED lines into existing thematic composites (e.g., EMPIRICAL-PREMISE-VERIFICATION, CITATION-AND-ARITHMETIC-ACCURACY, ATTESTATION-SCOPE-FIDELITY, etc.). Update composite heading counts in same commit per R39 MAJOR-1 discipline. Anti-thrash: do NOT drop or paraphrase rule text — only fold accreted lines as sub-variants of existing composites, with heading-count increments.
   - **TDD attestation:** Q-R89-EMPIRICAL.sh Block N MUST verify post-R89 `grep -c '^# REINFORCED' CLAUDE-ARCHITECT.md` ≤ 30 and CLAUDE-IMPLEMENTER.md ≤ 30. AC-R36-21 (CLAUDE-IMPLEMENTER ≤30 entries) MUST flip FAIL → PASS as discipline-restoration (R43 + R51 precedent).

4. **Sustaining mechanism (NEW; Architect picks specific shape).** Goal: prevent re-accretion between methodology rounds without operator-initiative scheduling. Candidate shapes (Architect picks ONE; cite-then-walk over `scripts/`):
   - **Option α (Recommended for first pass):** Extend `scripts/pre-commit-rule-sweep.sh` (or add `scripts/check-claude-md-thresholds.sh`) — pre-commit hook OR CI-callable that prints WARN when `CLAUDE-*.md` REINFORCED count crosses 30/40/50 thresholds. Wired into pipeline (Memorial-Updater post-stage) so consolidation-recommended lines surface at the round close commit, not as deferred operator-flag accretion.
   - **Option β:** Add Architect-side check at SPEC-AUTHORING-CHECKLIST: pre-spec-emit verification that REINFORCED counts are within range (Architect halts at spec-emit if threshold exceeded).
   - **Option γ:** New `scripts/finalize-round.sh` post-MU hook that auto-runs `consolidate-reinforcements.sh` AND threshold check; fails the round close commit if threshold violated.
   - Architect picks ONE; documents trade-offs in spec § A1; per Rule 7 sub-pattern (`derived-rule-propagation-mechanism-required`) the mechanism MUST be load-bearing (i.e., a discipline that runs at every round close without operator intervention), not advisory-only.

5. **`test/q89-methodology-hygiene.test.ts`** (NEW; audit-tier minimal): ACs for archival completeness (Phase shard byte-identical against pre-R89 source) + composite folding count (ARCH ≤ 30; IMPL ≤ 30) + sustaining-mechanism active surface (Option-specific). At least 5 ACs.

6. **`Q-R89-EMPIRICAL.sh`** at chore-A pre-commit. **MUST use `--test-reporter=tap`** per R77.

### Tier rationale

**audit-tier** — Architect (Implementer-hat per R42 precedent) + Reviewer (cold-eye) + Memorial-Updater. No engine work; no substantive product code. R42 + R51 audit-tier precedent applies; methodology rounds with mechanical reorg + composite consolidation + new scripts fit audit-tier scope. The 4 deliverables are tightly coupled (re-accretion of the same surfaces) and bundle cleanly per memory feedback `feedback_bundled_pr_preferred` family.

### Anti-scope (R89 hard limits)

- NO modification of `engine/*` (frozen)
- NO modification of `tools/curate-baseline.ts` or any R88 deliverable (frozen)
- NO modification of `tools/curate-baseline-*.ts` / `tools/calibrators/*` (R88 anti-scope inherited)
- NO modification of R73-R88 substantive deliverables (frozen)
- NO modification of `demos/*` (frozen)
- NO new external dependencies
- NO modification of `run-pipeline.sh` core flow (only pipeline hook integration if Option α/γ requires it; document explicitly in spec)
- NO modification of pre-R89 carry-forward AC fail set (AC-R36-30/31 already dropped at R87; AC-R36-21 expected to flip FAIL→PASS as discipline-restoration; other carry-forwards untouched)
- NO real-cluster; NO DS-repo; NO `gh repo` operations beyond push to Tessera public
- NO content rewriting in MEMORIAL/NEXT-ROLE shards (byte-identical via sed/awk per R42; Rule 6 anti-workaround discipline)
- NO paraphrase of REINFORCED rule text during composite folding (only fold accreted lines into existing composites; heading-count increments only)

ALLOWED modifications:
- `coordination/NEXT-ROLE.md` (active reset to header + index + R88-R89 entries)
- `coordination/NEXT-ROLE-PHASE-{1,2,3,4}.md` (NEW shards)
- `coordination/MEMORIAL.md` (active reset)
- `coordination/MEMORIAL-PHASE-{3,4}.md` (NEW shards)
- `CLAUDE-ARCHITECT.md` + `CLAUDE-IMPLEMENTER.md` (composite folding only)
- `scripts/check-claude-md-thresholds.sh` OR equivalent per Architect choice (NEW)
- `scripts/finalize-round.sh` OR extension to existing script per Architect choice
- `templates/SPEC-AUTHORING-CHECKLIST.md` (if Option β chosen)
- `test/q89-methodology-hygiene.test.ts` (NEW)
- `coordination/specs/Q-R89-SPEC.md` + `Q-R89-SPEC-AUDIT.md` + `Q-R89-EMPIRICAL.sh` (NEW)
- `coordination/reviews/REVIEWER-REPORT-R89.md` (Reviewer)
- `package.json` (script alias for sustaining-mechanism entry point if Architect chooses)

### Apply all 7 cross-project rules UPFRONT

- Rules 1-7 ACTIVE. **Architect MUST use `--test-reporter=tap`** per R77.
- **R86 prophylactic + R87 sub-pattern variant + R88 sub-pattern-2 (grep-semantics) load-bearing:** Architect MUST verify any empirical premise about file state by direct Read or running the actual command (NOT inferred from grep result interpretation). For Option α/β/γ pre-commit hook: Architect MUST verify `.git/hooks/pre-commit` actual current state via direct Read — not assumed via convention.
- **R42 strategy (a) discipline:** content preservation via sed/awk; Q-R89-EMPIRICAL.sh MUST diff `<(sed reproducing pre-R89 source) <(tail -n +N concatenated shards)` → empty (byte-identical, per AC-R42-1 pattern).
- **R39 MAJOR-1 discipline:** composite-folding heading count + sub-variant body MUST update in same commit.
- **R83 routing discipline:** top-of-file `STATUS: READY` updates MUST land in the same commit as the routing block (not a follow-up `chore-A SHA-backfill` commit).
- **R85 stochastic-flake band [15,16] preserved.** AC-R84-14 unchanged; R89 introduces no fix.

### Halt conditions (R89 Implementer/Architect-hat)

1. Q-R89-EMPIRICAL.sh non-zero exit at chore-A
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit
3. Test baseline drift beyond R88 close (702/682-683/15-16/4) other than R89-additions + AC-R36-21 FAIL→PASS discipline-restoration
4. Phase-shard byte-identical check non-empty (any rewritten content)
5. CLAUDE-ARCHITECT.md or CLAUDE-IMPLEMENTER.md post-R89 count > 30 (failed consolidation target)
6. Sustaining-mechanism choice produces no executable surface (Option α/β/γ all require load-bearing enforcement; advisory-only HALTs the round)
7. New external dependency: HALT + DIAGNOSTIC + ESCALATE
8. Existing REINFORCED rule text paraphrased or dropped during folding: HALT + DIAGNOSTIC
9. R88-or-prior substantive deliverable modified (anti-scope violation): HALT + DIAGNOSTIC + ESCALATE
10. Pipeline-hook integration requires `run-pipeline.sh` core-flow modification beyond a single sourced helper script: HALT + ESCALATE for operator decision

### Predicted post-R89 active-file sizes

- `coordination/NEXT-ROLE.md` active: ~150-300 lines (header + phase index + R88 close + R89 directive + R89 routing blocks)
- `coordination/MEMORIAL.md` active: ~150-300 lines (header + phase index + R87 + R88 + R89 entries)
- `CLAUDE-ARCHITECT.md`: ≤30 REINFORCED entries
- `CLAUDE-IMPLEMENTER.md`: ≤30 REINFORCED entries
- Per-round default-read cost reduction (Architect/Reviewer/Memorial-Updater): NEXT-ROLE ~95% reduction; MEMORIAL ~85% reduction.

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R89 --tier audit
```

---


## Phase shard index (NEXT-ROLE archival; R89 sharding 2026-05-21)

Prior round directives and routing blocks are archived to phase-scoped shards. New round entries append to this active file. At each phase close, prior-phase directives and routing blocks roll to a new `NEXT-ROLE-PHASE-N.md` shard.

| Shard | Scope | Path | Status |
|---|---|---|---|
| Phase 4 shard | R73–R87 directives + Phase 3 directives + all routing blocks prior to R88 | [`NEXT-ROLE-PHASE-4.md`](NEXT-ROLE-PHASE-4.md) | CLOSED (R89 sharding 2026-05-21; includes Phase 3 directives for structural simplicity — no clean phase break existed in NEXT-ROLE.md prior to R89) |
| Active (Phase 5) | R88+ | (this file) | OPEN |

**Read protocol:**

- **Default per-round read:** Architect / Reviewer / Memorial-Updater read this active file in full.
- **Cross-phase reference:** read the relevant phase shard on demand (e.g., to locate a prior-round routing block or directive).
- **Back-reference resolution:** prior-round line numbers refer to pre-R89 NEXT-ROLE.md at SHA `db232d9`. Read `coordination/NEXT-ROLE-PHASE-4.md` starting from the matching `## §` heading.

---

## § R89 IMPLEMENTER routing block (2026-05-21)

NEXT-ROLE: REVIEWER
STATUS: READY
TIER: audit

Inputs:
- coordination/specs/Q-R89-SPEC.md
- coordination/specs/Q-R89-SPEC-AUDIT.md
- coordination/specs/Q-R89-EMPIRICAL.sh
- coordination/MEMORIAL.md (R89 IMPLEMENTER section — 5 CONFIRMATIONs + 1 VIOLATION)

### Binding-command attestation

- `pnpm exec tsc -p tsconfig.test.json` → exit 0
- `node --test test/*.test.js` → tests=710, pass=691, fail=15, skip=4 (within predicted band [691-692 pass, 14-15 fail]; stochastic flake AC-R84-14 in lower-band state)
- `bash coordination/specs/Q-R89-EMPIRICAL.sh` → 11 PASS / 0 FAIL, exit 0

### AC coverage summary

| AC | Result |
|---|---|
| AC-R89-1: MEMORIAL-PHASE-3.md byte-identical | PASS |
| AC-R89-2: MEMORIAL-PHASE-4.md byte-identical | PASS |
| AC-R89-3: NEXT-ROLE-PHASE-4.md byte-identical | PASS |
| AC-R89-4: CLAUDE-ARCHITECT.md ≤30 REINFORCED (actual: 24) | PASS |
| AC-R89-5: CLAUDE-IMPLEMENTER.md ≤30 REINFORCED (actual: 30) — AC-R36-21 FLIP | PASS |
| AC-R89-6: check-claude-md-thresholds.sh exits 0 | PASS |
| AC-R89-7: active MEMORIAL.md R88 entries preserved | PASS |
| AC-R89-8: active NEXT-ROLE.md first 126 lines byte-identical | PASS |

### Tactical deviations

**TD-1** (Q-R89-EMPIRICAL.sh Block 8 — prefix-continuity-invariant deviation): Original invocation `node --test test/*.test.js --test-reporter=tap` produces spec-reporter format (not TAP) in Node 25.9.0 with flags after test files. Fix: `node --test --test-reporter=tap test/*.test.js 2>&1 | tail -20` plus `|| echo "0"` grep guards. VIOLATION recorded in MEMORIAL.md. Reviewer to assess whether HALT+ESCALATE was required per R73 MAJOR-2 reinforcement.

**TD-2** (byte-identity test normalization): `tailLines()` produces trailing `\n` (file's trailing empty element after split); `sedLines()` does not. bash `$()` strips trailing newlines but JavaScript doesn't. Fix: `norm()` helper strips trailing newlines from both sides before `assert.equal`, matching bash `$()` semantics. Tactical fix to self-authored test; no spec content change.

SHA-A: dbc529d

### Anti-scope verification

`git diff db232d9 HEAD --name-only` at chore-A:
```
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
coordination/MEMORIAL-PHASE-3.md
coordination/MEMORIAL-PHASE-4.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE-PHASE-4.md
coordination/NEXT-ROLE.md
coordination/logs/ROUND-R89-ROUTING.md
coordination/specs/Q-R89-EMPIRICAL.sh
coordination/specs/Q-R89-SPEC-AUDIT.md
coordination/specs/Q-R89-SPEC.md
scripts/check-claude-md-thresholds.sh
scripts/finalize-round.sh
test/q89-methodology-hygiene.test.ts
```
All 14 paths within ALLOWED_SET. EMPIRICAL.sh Block 1: PASS.

---

## § R89 REVIEWER routing block (2026-05-21)

NEXT-ROLE: MEMORIAL-UPDATER
STATUS: MERGE-READY
TIER: audit
MODE: structural-only (R74 / CLAUDE-REVIEWER.md)

Inputs:
- coordination/reviews/REVIEWER-REPORT-R89.md (NEW; 0 CRITICAL / 1 MAJOR / 1 MINOR / 4 OBS)
- coordination/MEMORIAL.md (R89 REVIEWER section — 4 CONFIRMATIONs + 2 VIOLATIONs appended)

### Binding-command attestation at Reviewer HEAD (eca522f)

- `bash coordination/specs/Q-R89-EMPIRICAL.sh` → 11 PASS / 0 FAIL, exit 0
- `node --test --test-reporter=tap test/q89-methodology-hygiene.test.js` → tests=8, pass=8, fail=0, skip=0
- Block 8 (full suite TAP): tests=710, pass=691, fail=15, skip=4 (within predicted bands per spec § 3)

### AC coverage summary (structural-only walk)

| AC | Result | Evidence |
|---|---|---|
| AC-R89-1: MEMORIAL-PHASE-3.md byte-identical | PASS | EMPIRICAL Block 2 + test ok 1 |
| AC-R89-2: MEMORIAL-PHASE-4.md byte-identical | PASS | EMPIRICAL Block 3 + test ok 2 |
| AC-R89-3: NEXT-ROLE-PHASE-4.md byte-identical | PASS | EMPIRICAL Block 4 + test ok 3 |
| AC-R89-4: CLAUDE-ARCHITECT.md ≤30 (actual=24) | PASS | EMPIRICAL Block 5 + test ok 4 |
| AC-R89-5: CLAUDE-IMPLEMENTER.md ≤30 (actual=30; AC-R36-21 FLIP) | PASS | EMPIRICAL Block 6 + test ok 5 |
| AC-R89-6: check-claude-md-thresholds.sh exit 0 | PASS | EMPIRICAL Block 7 + test ok 6 |
| AC-R89-7: active MEMORIAL.md R88 entries preserved (.includes()) | PASS | test ok 7 (MINOR-1 flag: test uses .includes() vs AC literal "at same line positions") |
| AC-R89-8: active NEXT-ROLE.md first 126 lines byte-identical | PASS | test ok 8 |

### Findings summary

- **CRITICAL**: 0
- **MAJOR**: 2
  - MAJOR-1 prefix-continuity-invariant deviation (Q-R89-EMPIRICAL.sh Block 8 amended post-spec-commit 004cff6; Implementer self-disclosed via TD-1 + MEMORIAL VIOLATION). Substantive deliverable sound.
  - MAJOR-2 AC-R89-8 structurally unsatisfiable at Reviewer/MU routing-commit stage. R83 routing discipline (top-STATUS updates land in routing-commit) conflicts with AC-R89-8's "first 126 lines byte-identical" requirement. Spec design issue; no role-execution error. AC-R89-8 will continue to FAIL through MU close — this is expected, not an MU defect.
- **MINOR**: 1 — MINOR-1 AC-R89-7 test uses `.includes()` instead of AC literal "at same line positions" (line-shift acknowledged in spec audit § A5 but assertion form diverges).
- **OBS**: 4 — finalize-round.sh nested-guard structure (functionally equivalent); .js artifact gitignored; phase-shard naming asymmetry (intentional, documented); uncommitted modification to coordination/logs/ROUND-R89-ROUTING.md.

### Test baseline post-Reviewer-routing-commit

Reviewer HEAD `eca522f` (PRE this Reviewer's routing-commit edits): `node --test --test-reporter=tap test/q89-methodology-hygiene.test.js` → 8/8 PASS; Q-R89-EMPIRICAL.sh → 11 PASS / 0 FAIL, exit 0; full suite within band (pass=691, fail=15).

Post-this-routing-commit (AC-R89-8 flips per MAJOR-2): full suite expected `tests=710, pass=689-691, fail=16-17, skip=4` — explicitly OUT of the Implementer-chore-A `fail=[14,15]` band because of mandatory R83 top-STATUS update breaking AC-R89-8's "first 126 lines byte-identical" assertion. This is the MAJOR-2 spec-design-tension consequence, not an execution error. **Memorial Updater: do not interpret post-routing fail count as a halt condition.**

### Operator-decision flags

1. **MAJOR-1** (prefix-continuity-invariant deviation): Implementer self-disclosed via TD-1 and asked for Reviewer assessment of HALT+ESCALATE. Reviewer's structural-only assessment: deviation was necessary to make Block 8 verification work; substantive deliverable independent of Block 8 mechanics; audit trail preserved. Operator may consider retroactive ESCALATE handling.

2. **MAJOR-2** (AC-R89-8 vs R83 spec design tension): Future methodology rounds should not write "first N lines byte-identical" ACs at the working-tree level — either exclude lines 1–4 (top routing block) or anchor the AC to a specific chore-A SHA via `git show`.

### Right-reasons audit

SUSPENDED per structural-only mode (CLAUDE-REVIEWER.md "## Mode: Structural-only Reviewer"). AC-binding structural integrity walk (8/8 PASS) replaces this audit for the structural-only scope.

