# Q-R42-SPEC — MEMORIAL.md Sharding (MR-3 Strategy a)

**Round:** R42
**Tier:** audit (methodology round; Implementer wears Architect hat; Reviewer audits cold)
**Operator authority:** Post-R41-hygiene-close interactive operator selection (2026-05-19) of PHASE-3-CANDIDATES-PRELIMINARY.md § 5.5 "MR-3 memorial sharding only (strategy a)" candidate. HARD STOP applies to Phase 3 *scope* only; methodology rounds (MR-N class) are separately authorizable per CLAUDE.md operator-decision layer + § 7 dependency note "Methodology (§ 5) can precede everything — no production-code dependencies."

---

## § 1. Goal

Implement strategy (a) Phase-N sharding of `coordination/MEMORIAL.md` per PHASE-3-CANDIDATES-PRELIMINARY.md § 5.5. Active `MEMORIAL.md` retains: bootstrap header + inherited active Memorials table + Tessera-specific Memorial state lineage + new phase-shard index + active R42+ entries. Past-phase content splits into `coordination/MEMORIAL-PHASE-1.md` (R01–R19 = Phase 1 + calibration) and `coordination/MEMORIAL-PHASE-2.md` (R20–R41 = Phase 2 + post-Phase-2 hygiene). Update all CLAUDE-*.md read protocols to reference the active file as default + on-demand phase-shard reads. Memorial-Updater append behavior unchanged (appends to active file).

**Per-round read-cost reduction target:** active file ≤ 200 lines (vs. 3,153 pre-shard). Architect / Reviewer / Memorial-Updater per-round MEMORIAL read drops from 3,153 lines to ~200 by default; cross-phase reads are on-demand. Phase 3 forward read-volume scales with active-file growth, not historical accumulation.

---

## § 2. Brainstorm

**Option A — Phase-N split now (SELECTED):** Two shards (Phase 1 + Phase 2); active file retains header + lineage + index + R42+ space.
- Strengths: matches § 5.5 strategy (a) verbatim; matches § 5.5 recommended sequencing ("MR-3 at Phase 3 entry, BEFORE Phase 3 SLICE 1 dispatch"); reversible (`cat` shards back if needed); immediate per-round read-cost reduction; preserves audit-trail fidelity (no entry-text rewrites).
- Weaknesses: 99 intra-file `MEMORIAL.md:NNNN` line-number back-references break under sharding (Option A mitigation: document the convention in R42 round entry; readers concat shards or use `git log` to resolve historic line numbers).
- Constraint match: § 5.5 dependency note "Phase-N sharding can land at Phase 3 entry as a clean break (MEMORIAL-PHASE-1.md + MEMORIAL-PHASE-2.md already exist conceptually as historical content; just split the file)." Rule 7 discipline applied: Tessera-internal landing only; anchor canonical landing deferred to 2nd-project occurrence per § 5.5 "Anchor canonical landing path" sub-bullet.

**Option B — Defer to first Phase 3 round:** Skip MR-3; first Phase 3 SLICE 1 absorbs the sharding cost.
- Strengths: smaller R42 surface area.
- Weaknesses: violates § 5.5 recommended sequencing ("BEFORE Phase 3 SLICE 1 dispatch"); first Phase 3 round inherits ~3,200-line MEMORIAL read cost on top of SLICE 1 scope.
- Rejected: § 5.5 explicit recommendation; this round IS the recommended insertion point.

**Option C — Single archive shard (`MEMORIAL-PRE-R42.md`):** One frozen file containing all R01–R41 entries.
- Strengths: simpler; one file.
- Weaknesses: cross-phase queries still load 3,150+ lines as a single chunk; Phase-N grain (per § 5.5 strategy (a)) is operator-recommended; index format collapses.
- Rejected: § 5.5 explicitly specifies Phase-N grain.

**Option D — Age-based archive (strategy b):** Last N days in active; older content rolls to `archive/MEMORIAL-YYYY-Q.md`.
- Strengths: per § 5.5 strategy (b); date-based decay.
- Weaknesses: § 5.5 recommends strategy (a) Phase-N for Tessera at this round; date-based requires script work + cadence + rollover policy.
- Rejected: operator picked strategy (a) explicitly.

**Selected:** Option A.

---

## § 3. Mechanism

### 3.1 Identify Phase boundaries in pre-R42 MEMORIAL.md

Pre-R42 `coordination/MEMORIAL.md` = 3,153 lines, structured as:

| Original lines | Content | Destination |
|---|---|---|
| 1–37 | Header (bootstrap convention + Inherited Memorials table + Tessera-specific Memorial state lineage) | **active MEMORIAL.md** (retained) |
| 39–84 | Round R01 announcement + global meta-sections (Reinforcement rules accumulated; Strategic dispositions; Cross-project memorial cross-references; Memorial bootstrap note) | **MEMORIAL-PHASE-1.md** (Phase 1 era content) |
| 86–1822 | R01–R19 entries (Phase 1 work + Phase 1 close at R15 + calibration R16–R19) | **MEMORIAL-PHASE-1.md** |
| 1824–3153 | R20–R41 entries (Phase 2 work + Phase 2 close at R37 WAVE-GATE-05 + post-Phase-2 hygiene R38–R41) | **MEMORIAL-PHASE-2.md** |

Phase 1 / Phase 2 boundary verified at line 1822 (final `---` separator after R19 MEMORIAL-UPDATER context-isolation entry) immediately preceding line 1824 (`## R20 — Architect (2026-05-17)`).

Note on R37: R37 was a Coordinator wave-gate stamp (no Implementer / Reviewer / Memorial-Updater pair); R37 has no entries in MEMORIAL.md (recorded in `coordination/WAVE-GATE-05.md` + `coordination/COORDINATOR-MEMORIAL.md`). Phase 2 close at R37 is non-blocking for the shard split.

### 3.2 Create phase shard files

Each shard file gets a header:

```markdown
# Memorial — Tessera (Phase N shard, R<X>–R<Y>)

_This file is a frozen historical shard of `coordination/MEMORIAL.md`. Active file: `coordination/MEMORIAL.md`. Cross-phase reference: see active-file phase-shard index._

_Frozen at R42 sharding (2026-05-19). Do NOT append; new entries belong in active MEMORIAL.md._

_Original line-number back-references of form `MEMORIAL.md:NNNN` inside this shard refer to line numbers in the pre-R42 (R41-close) MEMORIAL.md. To resolve, `cat coordination/MEMORIAL-PHASE-1.md coordination/MEMORIAL-PHASE-2.md` reproduces the pre-shard content (modulo shard headers + active-file header)._

---

[verbatim content from original lines NN–NN]
```

Content is copied verbatim — no entry text is modified.

### 3.3 Trim active MEMORIAL.md

Active `MEMORIAL.md` post-R42 structure:

```markdown
# Memorial — Tessera

[bootstrap description paragraphs, lines 1-7 of original, verbatim]

---

## Inherited active Memorials (from DeploySignal `5a72371`)

[table from lines 9-19, verbatim]

---

## Tessera-specific Memorial state lineage (this overnight cycle)

[content from lines 21-37, verbatim]

---

## Phase shard index (R42 sharding 2026-05-19)

[new section — see § 3.4]

---

## R42 — IMPLEMENTER (audit-tier, Architect hat) (2026-05-19)

[R42 chore-A append entries]
```

### 3.4 Phase-shard-index section

Insert a new `## Phase shard index` section after the Tessera-specific Memorial lineage. Format:

```markdown
## Phase shard index (R42 sharding 2026-05-19)

Past-phase MEMORIAL entries live in phase-scoped shards. New round entries append to this active file under per-round headers. At each phase close, active-file content rolls to a new `MEMORIAL-PHASE-N.md` shard; the active file resets to header + index + open-phase entries.

| Shard | Round range | Path | Status |
|---|---|---|---|
| Phase 1 + calibration | R01–R19 | [`MEMORIAL-PHASE-1.md`](MEMORIAL-PHASE-1.md) | CLOSED (Phase 1 close at R15; calibration R16–R19) |
| Phase 2 + post-Phase-2 hygiene | R20–R41 | [`MEMORIAL-PHASE-2.md`](MEMORIAL-PHASE-2.md) | CLOSED (Phase 2 close at R37 WAVE-GATE-05; safe-continuation R38–R41) |
| Active | R42+ | (this file) | OPEN |

**Read protocol (effective R42):**
- **Default per-round read:** Architect / Reviewer / Memorial-Updater read this active file in full.
- **Cross-phase reference:** read the relevant phase shard on demand (e.g., to locate the canonical violation that derived a specific REINFORCED line; to verify a prior round's Memorial-D state cell; to resolve a `MEMORIAL.md:NNNN` line-number back-reference).
- **Memorial-Updater writes** new entries below the round header in this active file. Append behavior unchanged.
- **At next phase close:** active content rolls to a new `MEMORIAL-PHASE-N.md`; index gains one row; active file resets to header + index + new-phase rounds.
- **Original `MEMORIAL.md:NNNN` back-references inside shards:** refer to line numbers in pre-R42 MEMORIAL.md. `cat MEMORIAL-PHASE-1.md MEMORIAL-PHASE-2.md` reproduces the pre-shard ordering for line-number resolution.
```

### 3.5 Update CLAUDE-*.md read protocols

All 6 CLAUDE-*.md files reference `MEMORIAL.md`:
- `CLAUDE-COMMON.md`
- `CLAUDE-ARCHITECT.md`
- `CLAUDE-IMPLEMENTER.md`
- `CLAUDE-REVIEWER.md`
- `CLAUDE-MEMORIAL.md`
- `CLAUDE-COORDINATOR.md` (opt-in per project; loaded only in `--coordinator` mode)

For each file: locate the read-protocol or inputs directive that mentions reading MEMORIAL.md; update to:
- Reference active `coordination/MEMORIAL.md` as the per-round default read.
- Note that `coordination/MEMORIAL-PHASE-1.md` + `MEMORIAL-PHASE-2.md` are on-demand cross-phase shards (consult when resolving cross-phase context or line-number back-references).
- Memorial-Updater append behavior unchanged (writes go to active file).

Edits are content-preserving — only the read-target path/shape changes.

### 3.6 Update NEXT-ROLE.md for R42 routing

Update `coordination/NEXT-ROLE.md`:
- `CURRENT-ROUND: R42`
- `NEXT-ROLE: REVIEWER` (cold-eye pass on sharding completeness + content preservation)
- `STATUS: READY-FOR-REVIEWER`
- Implementer routing section: chore-A SHA + ALLOWED_SET + AC mapping summary.

---

## § 4. Component inventory

| File | Status | Note |
|---|---|---|
| `coordination/specs/Q-R42-SPEC.md` | Created | This file |
| `coordination/MEMORIAL-PHASE-1.md` | Created | Header + verbatim copy of pre-R42 MEMORIAL.md lines 39–1822 (R01–R19 entries + pre-R01 Phase-1-era meta) |
| `coordination/MEMORIAL-PHASE-2.md` | Created | Header + verbatim copy of pre-R42 MEMORIAL.md lines 1824–3153 (R20–R41 entries) |
| `coordination/MEMORIAL.md` | Modified | Trimmed to: header (lines 1–37 verbatim) + new phase-shard-index section + R42 chore-A append entry |
| `CLAUDE-COMMON.md` | Modified | Read-protocol update |
| `CLAUDE-ARCHITECT.md` | Modified | Read-protocol update |
| `CLAUDE-IMPLEMENTER.md` | Modified | Read-protocol update |
| `CLAUDE-REVIEWER.md` | Modified | Read-protocol update |
| `CLAUDE-MEMORIAL.md` | Modified | Read-protocol update; append behavior unchanged |
| `CLAUDE-COORDINATOR.md` | Modified | Read-protocol update (if MEMORIAL.md is in read inputs) |
| `coordination/NEXT-ROLE.md` | Modified | R42 routing |

Not modified: engine/*, test/*, coordination/SCOPING-MEMO-v0.3.md, coordination/PRD.md, ~/.claude/CROSS-PROJECT-MEMORIAL.md (strategy (a) is project-scope only; cross-project memorial sharding is § 5.5 strategy (e) deferred per Rule 7).

---

## § 5. Acceptance criteria

**AC-R42-1 (content preservation — round-entry text verbatim):** Given pre-R42 `coordination/MEMORIAL.md`, when shards are created, then `cat coordination/MEMORIAL-PHASE-1.md coordination/MEMORIAL-PHASE-2.md` (stripping the per-shard headers) reproduces the original lines 39–3153 verbatim. No round-entry content is paraphrased, reordered, or omitted.

**AC-R42-2 (active MEMORIAL.md size budget):** Post-R42 chore-A, `wc -l coordination/MEMORIAL.md` ≤ 200 lines (header ~37 + index section ~25 + R42 entry ~30 + separators ~10; budget 200 includes generous slack).

**AC-R42-3 (phase-shard-index correctness):** Active `coordination/MEMORIAL.md` contains a `## Phase shard index` section with exactly three table rows: Phase 1 (R01–R19), Phase 2 (R20–R41), Active (R42+). Each row links to the correct shard file (Phase 1 + 2) or to "(this file)" (Active).

**AC-R42-4 (Phase 1 shard scope correctness):** `coordination/MEMORIAL-PHASE-1.md` first round-entry header is `## Round R01 — Phase 1 SLICE 1 (engine vendoring + schema additions)`. Last round-entry is the R19 MEMORIAL-UPDATER context-isolation CONFIRMATION (matches pre-R42 line 1820 content). `grep -c "^## R20 " coordination/MEMORIAL-PHASE-1.md` = 0 (no R20+ leakage).

**AC-R42-5 (Phase 2 shard scope correctness):** `coordination/MEMORIAL-PHASE-2.md` first round-entry header is `## R20 — Architect (2026-05-17)`. Last round-entry is the R41 MEMORIAL-UPDATER role-boundary CONFIRMATION (matches pre-R42 line 3153 content). `grep -c "^## R01 \|^## R19 " coordination/MEMORIAL-PHASE-2.md` = 0 (no R01-R19 leakage).

**AC-R42-6 (CLAUDE-*.md read-protocol updates):** For each CLAUDE-*.md file in `[CLAUDE-COMMON.md, CLAUDE-ARCHITECT.md, CLAUDE-IMPLEMENTER.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md, CLAUDE-COORDINATOR.md]` that previously referenced reading `coordination/MEMORIAL.md`, the file now references the active file as default + phase shards as on-demand. Verification: `grep -l "MEMORIAL-PHASE" CLAUDE-*.md` returns at least 5 files (all 6 if all 6 had a relevant directive).

**AC-R42-7 (no engine/test modifications — ALLOWED_SET):** `git diff <ROUND-START-SHA>..HEAD --name-only` after chore-A includes ONLY paths in the ALLOWED_SET:

```
ALLOWED_SET:
coordination/specs/Q-R42-SPEC.md
coordination/MEMORIAL.md
coordination/MEMORIAL-PHASE-1.md
coordination/MEMORIAL-PHASE-2.md
CLAUDE-COMMON.md
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
CLAUDE-REVIEWER.md
CLAUDE-MEMORIAL.md
CLAUDE-COORDINATOR.md
coordination/NEXT-ROLE.md
coordination/reviews/REVIEWER-REPORT-R42.md   (post-chore-B Reviewer commit; regex carve-out)
coordination/diagnostics/DIAGNOSTIC-R42-*.md  (conditional; only if HALT fires)
```

No `engine/*`, `test/*`, `tools/*`, `SCOPING-MEMO-v0.3.md`, `PRD.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md`, or any other path appears.

**AC-R42-8 (Memorial-Updater append behavior preserved):** Active `coordination/MEMORIAL.md` includes a `## R42 — IMPLEMENTER (audit-tier, Architect hat) (2026-05-19)` section header below the index. The append pattern is identical to prior rounds (no schema change). Future Memorial-Updater appends continue to write below the most-recent round header in this file.

**AC-R42-9 (line-count regression — read-cost target):** Post-R42 chore-A, `wc -l coordination/MEMORIAL.md` < 0.10 × pre-R42 line count (i.e., < 316 lines vs. 3,153 pre-shard). Strong read-cost reduction verifiable at chore-A.

**AC-R42-10 (back-reference disclosure):** R42 round entry (in active MEMORIAL.md) documents that line-number back-references of form `MEMORIAL.md:NNNN` inside shards refer to pre-R42 line numbers; resolution path is `cat MEMORIAL-PHASE-1.md MEMORIAL-PHASE-2.md`. This is the documentation-of-known-limitation that the Reviewer can audit for completeness.

---

## § 6. Anti-scope

- NO modification of round-entry text (verbatim copy only; no paraphrase, no reorder, no omission)
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (cross-project sharding is § 5.5 strategy (e), deferred to 2nd-project occurrence per Rule 7 anchor-canonical-landing discipline)
- NO modification of `engine/*` or `test/*` files (zero production-code changes)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`
- NO new REINFORCED lines in any CLAUDE-*.md beyond what this round naturally surfaces in chore-A (this is methodology-only; R42 round entry may add CONFIRMATION/OBS for the shard split but no consolidated reinforcement is expected since the sharding work is mechanical)
- NO rewrite of `MEMORIAL.md:NNNN` line-number back-references inside shard content (audit-trail fidelity; resolution documented per AC-R42-10)
- NO change to Memorial-Updater append protocol (writes still go to active file)
- NO Phase 3 territory (HARD STOP on Phase 3 scope remains; this is methodology-only)
- NO anchor canonical landing (Rule 7 discipline: defer to 2nd-project occurrence; § 5.5 anchor-canonical-landing-path sub-bullet)
- NO opening any GitHub PRs

---

## § 7. Apply all 7 cross-project rules UPFRONT

- **Rule 1 (false-compliance-attestation):** AC-R42-1 + AC-R42-9 require empirical verification at chore-A (`cat` reconstruction; `wc -l` actual). Implementer encodes actual numbers, not estimates.
- **Rule 2 (architect-branch-binding-coverage):** No code branches in this round; pure file reorganization. N/A.
- **Rule 3 (implementer-spec-test-assertion-coverage):** No test file required for methodology round (precedent: R39 had no new tests; R41 had hygiene tests but methodology rounds are tier-flexible). If an optional `test/q42-memorial-sharding.test.ts` is judged in-scope by Implementer, it must assert AC-R42-1 (`cat` reconstruction) and AC-R42-4 + AC-R42-5 (shard scope). Implementer judges in-scope at chore-A.
- **Rule 4 (anti-scope-allowed-set-forward-coverage):** ALLOWED_SET enumerated in AC-R42-7 at spec-emit time (this commit), preceding RED/chore-A. Regex carve-out for Reviewer report + DIAGNOSTIC paths.
- **Rule 5 (self-application gate):** This is THE methodology round that applies Rule 7 discipline at landing. The discipline being applied: do NOT canonicalize memorial-sharding to anchor before 2nd-project empirical proof. § 6 anti-scope item explicitly enforces this. § 2 Option A weakness column documents the trade-off transparently.
- **Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround):** If line-number resolution mismatches surface (e.g., a back-reference `MEMORIAL.md:1234` resolves to a shard-irrelevant line), Implementer writes DIAGNOSTIC-R42-* rather than inline-rewriting the back-reference. Per anti-scope: NO rewrite of back-references.
- **Rule 7 (derived-rule-propagation):** This round's discipline IS the propagation of Rule 7 — § 5.5 "Anchor canonical landing path" explicitly applies Rule 7 framing to memorial-sharding canonical-landing. R42 round entry should append a CONFIRMATION confirming Rule 7 self-application at the methodology-canonical-landing decision point.

---

## § 8. Halt conditions

1. **Content reconstruction mismatch:** `cat MEMORIAL-PHASE-1.md MEMORIAL-PHASE-2.md` (after stripping shard headers) does not byte-match original lines 39–3153 → HALT + DIAGNOSTIC. Do not paper over with edits.
2. **Active file size budget exceeded:** Post-trim, `wc -l coordination/MEMORIAL.md` > 200 → HALT + DIAGNOSTIC; either header / index / R42 entry over-budget; recheck before committing.
3. **CLAUDE-*.md read-protocol mass-edit produces inconsistency:** If a CLAUDE-*.md file lacks any MEMORIAL read directive (was never edited) but is in the ALLOWED_SET edit list → HALT + DIAGNOSTIC; verify the file actually needed an edit.
4. **Phase boundary discovery:** If R20 boundary discovered to be at a different line than 1824 due to scan error → HALT + DIAGNOSTIC; re-verify boundary.
5. **Back-reference rewrite temptation:** If during shard creation, Implementer is tempted to rewrite a `MEMORIAL.md:NNNN` back-reference for clarity → HALT + DIAGNOSTIC per Rule 6 anti-workaround discipline; explicit anti-scope item forbids this.

---

## § 9. Open questions

None — operator already authorized strategy (a) selection per § 5.5 recommendation.

---

## § 10. Pipeline invocation

Operator decides routing mode:
- **Pipeline mode:** `cd /Users/johnwarren/concord/tessera && ./run-pipeline.sh --round R42 --tier audit`
- **Interactive mode:** Implementer executes chore-A in this session; Reviewer pass invoked by operator separately (interactive or `--round R42 --tier audit --skip-implementer`).

This spec is mode-agnostic; ACs and ALLOWED_SET apply identically.
