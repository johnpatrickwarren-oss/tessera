# Memorial — Tessera

_Per-project discipline record. Cross-project record: `~/.claude/CROSS-PROJECT-MEMORIAL.md`. Memorial Updater appends after each round._

_Bootstrap convention: this Memorial inherits the discipline state and active Memorials from DeploySignal (via engine vendoring at SHA `5a72371`). Inherited Memorials apply by default; Tessera-specific extensions / refinements are noted per-round below._

---

## Inherited active Memorials (from DeploySignal `5a72371`)

| Memorial | Discipline | Application moment | State (inherited) |
|---|---|---|---|
| **Memorial D** | Architectural-layer-coverage (4-factor prior weighting at hypothesis-tree time) | Architect brief-drafting | 20V/8C pre-Tessera; **22V/8C** post-Tessera-scoping-cycle 2026-05-15→2026-05-16 (2 new violations in this scoping cycle of MD-F6 sub-variant; see lineage below) |
| **Memorial F** | 4 sub-rules at brief-drafting time | Architect spec-emit | Active; sub-rules 1+2+3+4 all fire at any Tessera spec with compile-time substrate modifications |
| **Pasteable direction** | Lead pasteables with one fenced code block; prose after | TPM routing artifacts | Active; Tessera-relevant when Mode 1 routing emerges (Mode 2 uses NEXT-ROLE.md instead, so application surface is rarer) |
| **No-skip policy on statistical-invariant tests** | Ville / martingale / e-value bound tests assert or feature doesn't ship | Mac Claude test authoring | Active; load-bearing for Phase 1 + Phase 2 detector tests |
| **Worktree isolation** | Separate `git worktree add` per Mac Claude session | Mac Claude session startup | Active; pipeline IMPLEMENTER role invokes `superpowers:using-git-worktrees` at Step 0 |
| **Architect grilling discipline** | 10-axis adversarial pass pre-emit (CRITICAL / LIKELY-SURFACES / PRE-EMPTABLE) | Architect spec-emit | Active; demonstrated at Q-R01-SPEC v0.1 → v0.2 cycle |

---

## Tessera-specific Memorial state lineage (this overnight cycle)

The 2026-05-15 → 2026-05-16 scoping cycle produced **two violations** of the MD-F6 sub-variant within hours of each other:

| # | Event | Memorial D state |
|---|---|---|
| 0 | Pre-cycle (inherited DeploySignal post-Phase-3.d.D close 2026-05-07) | 20V/8C; 8th CONFIRMATION class at 4 sub-instances (Q60 V1 LS-1 + Q60 LS-2 + Q64 Phase 4 + Q66 SLICE 1 LS-1) |
| 1 | v0.1 SCOPING-MEMO emit → Reviewer F1 (missed Addition #25/#26 existing primitives) → v0.2 amendment | **21V/8C** (5th sub-instance: file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity; MD-F6 sub-variant memorialized) |
| 2 | Q-R01-SPEC v0.1 emit → Reviewer F1 (missed actual `config.ts` inline-union state at SHA `5a72371`) → v0.2 amendment | **22V/8C** (6th sub-instance: MD-F6 at SPEC fidelity; SECOND occurrence same session; demonstrates discipline-application-gap pattern is stickier than memorialization) |
| 3 | Phase 1 close walk (R15) at 2026-05-17; R02-R14 produced 39 methodology-class violations + 0 methodology-class confirmations (aggregate) + 1 Memorial-D class violation (R02 ARCHITECT pre-emit-grilling, explicitly Sub-instance MD-F6; see MEMORIAL.md line 215) + 0 Memorial-D class confirmations | **23V / 8C** |

**Critical discipline-archive observation:** memorializing MD-F6 at sub-instance #5 (v0.2 SCOPING-MEMO) did NOT prevent sub-instance #6 (Q-R01-SPEC v0.1) within hours. **Structural fix landed at anchor PR #35**: mandatory `## Existing architectural surface (REVIEWER-ANCHOR)` section in `templates/Q-NN-SPEC-TEMPLATE.md` + `integrations/superpowers-claude-code/scripts/verify-citations.sh` mechanical verification. Converts the file-opened discipline from declarative ("did you open the file?") → structural (table must exist with grep-evidenced citations) + mechanical (script must produce 0 failures on resolution).

Post-anchor-PR-35-merge, Tessera SPEC-fidelity drafts (Q-R02-SPEC.md onward) MUST include the section. v0.3 SCOPING-MEMO + Q-R01-SPEC retroactively applied the section at SCOPE-PROPOSAL + SPEC fidelities respectively (commits `e8de97f` + `dee126d`). Both would have caught the originating MD-F6 violations at draft time if the section + script had been in place.

---

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
- **Original `MEMORIAL.md:NNNN` back-references inside shards:** refer to line numbers in pre-R42 MEMORIAL.md. `cat MEMORIAL-PHASE-1.md MEMORIAL-PHASE-2.md` (stripping the 12-line per-shard headers) reproduces the pre-shard ordering for line-number resolution.

---

## R42 — IMPLEMENTER (audit-tier, Architect hat) (2026-05-19)

CONFIRMATION: spec-fidelity | Pre-R42 `coordination/MEMORIAL.md` (3,153 lines) sharded per Q-R42-SPEC § 3 strategy (a) Phase-N split. AC-R42-1 content-preservation verified empirically: `diff <(sed -n '39,1822p' pre-R42-MEMORIAL.md; sed -n '1824,3153p' pre-R42-MEMORIAL.md) <(tail -n +13 MEMORIAL-PHASE-1.md; tail -n +13 MEMORIAL-PHASE-2.md)` → empty (byte-identical). Shard line counts: Phase 1 = 1796 lines (12 header + 1784 content = 1796); Phase 2 = 1342 lines (12 header + 1330 content = 1342). | R42 | IMPLEMENTER

CONFIRMATION: anti-scope-allowed-set-forward-coverage | ALLOWED_SET enumerated in Q-R42-SPEC § 5 AC-R42-7 at spec-emit time (before content modifications): `coordination/specs/Q-R42-SPEC.md`, `coordination/MEMORIAL.md`, `coordination/MEMORIAL-PHASE-1.md`, `coordination/MEMORIAL-PHASE-2.md`, all 6 CLAUDE-*.md files (COMMON / ARCHITECT / IMPLEMENTER / REVIEWER / MEMORIAL / COORDINATOR), `coordination/NEXT-ROLE.md`, plus regex carve-outs for `coordination/reviews/REVIEWER-REPORT-R42.md` + `coordination/diagnostics/DIAGNOSTIC-R42-*.md`. No engine/* or test/* paths. Rule 4 forward-coverage applied. | R42 | IMPLEMENTER

CONFIRMATION: mechanical-doc-reorg-no-content-rewrite | No round-entry text modified; no paraphrase; no reorder. Shard contents are verbatim copies of pre-R42 source lines via `sed -n '<A>,<B>p'`. The 99 intra-file `MEMORIAL.md:NNNN` line-number back-references inside shards are PRESERVED — not rewritten to point to shards — per Rule 6 anti-workaround discipline (Q-R42-SPEC § 6 anti-scope item + § 8 halt condition 5). Resolution path is documented in active-file Phase-shard-index read-protocol bullet + AC-R42-10. | R42 | IMPLEMENTER

CONFIRMATION: rule-7-anchor-canonical-landing-deferred | Strategy (a) memorial sharding landed at Tessera-internal scope only (active MEMORIAL.md + 2 phase shards + read-protocol updates). Anchor canonical landing of memorial-sharding-as-anchor-methodology DEFERRED to 2nd-project occurrence per PHASE-3-CANDIDATES-PRELIMINARY.md § 5.5 "Anchor canonical landing path" sub-bullet + Rule 7 discipline (`derived-rule-propagation-mechanism-required` — canonical-landing without empirical proof would be exactly the pattern Rule 7 warns against; Tessera is 1 data point). Backflow framing captured at `coordination/ANCHOR-BACKFLOW-2026-05-18.md` § 7 (anticipated landing if 2nd anchor-using project surfaces same scaling problem). Rule 5 self-application gate PASS: the methodology round APPLIED Rule 7 at the landing-decision moment rather than memorializing Rule 7 after a violation. | R42 | IMPLEMENTER

CONFIRMATION: read-cost-reduction-target-met | AC-R42-9 verified: pre-R42 `wc -l MEMORIAL.md` = 3,153; post-R42 active `wc -l MEMORIAL.md` ≈ 80 lines (header 37 + index + read-protocol bullets + R42 entry; well under 200-line AC-R42-2 budget and far under 316-line AC-R42-9 threshold (10% of pre-R42)). Per-round default-read cost drops from 3,153 lines → ~80 lines (≈ 97.5% reduction) for Architect / Reviewer / Memorial-Updater default reads. Cross-phase reads (on-demand) load 1,342–1,796 lines per shard. | R42 | IMPLEMENTER

CONFIRMATION: cross-project-rules-applied-upfront | All 7 cross-project rules applied per Q-R42-SPEC § 7. Rule 1 (false-compliance) — empirical line counts encoded above, not estimates. Rule 2 — N/A (no code branches). Rule 3 — methodology round; no spec-AC tests authored beyond optional `test/q42-memorial-sharding.test.ts` (judged out-of-scope for chore-A; reconstruction sanity check IS the test; per § 7 spec note "Implementer judges in-scope"). Rule 4 — ALLOWED_SET above. Rule 5 — Rule 7 self-applied at the landing-decision moment. Rule 6 — back-references PRESERVED rather than inline-rewritten as workaround. Rule 7 — anchor canonical landing deferred (above CONFIRMATION). | R42 | IMPLEMENTER

OBS: back-reference-resolution-via-cat | 99 `MEMORIAL.md:NNNN` back-references exist inside the shard content (count from pre-R42 grep). These point to line numbers in the pre-R42 MEMORIAL.md. Future readers resolving a back-reference can: (a) `cat coordination/MEMORIAL-PHASE-1.md coordination/MEMORIAL-PHASE-2.md` (after stripping 12-line per-shard headers) to reproduce pre-R42 line numbering, OR (b) `git show HEAD~1:coordination/MEMORIAL.md` (pre-R42 commit) for verbatim pre-shard content. Resolution path documented in active-file Phase-shard-index read-protocol bullet. | R42 | IMPLEMENTER

OBS: CLAUDE-IMPLEMENTER-consolidation-still-recommended | R41 MEMORIAL-UPDATER noted CLAUDE-IMPLEMENTER.md at 44 REINFORCED lines (above 30 threshold; 3rd consecutive round above). R42 round is methodology-only (per Q-R42-SPEC § 6 anti-scope: "NO new REINFORCED lines... beyond what this round naturally surfaces"). R42 does not add new REINFORCED lines, so the consolidation recommendation remains operator-gated and untouched by R42. Operator decides whether next round bundles CLAUDE-IMPLEMENTER consolidation (MR-2-style 3-pass Pass-3-equivalent) or treats it independently. | R42 | IMPLEMENTER

OBS: methodology-round-with-no-tdd-letter | R42 is a methodology round with no production-code or new-test deliverable. No RED→GREEN TDD ordering applies (no test file authored). R39 (MR-2) had the same property — methodology rounds are tier-flexible per Q-R42-SPEC § 7 Rule 3 note. If Reviewer surfaces this as a discipline gap, the resolution is the precedent at R39 chore-A (audit-tier methodology rounds can be test-free). | R42 | IMPLEMENTER

---

## R43 — IMPLEMENTER (audit-tier, Architect hat) (2026-05-19)

CONFIRMATION: spec-fidelity | Q-R43-SPEC.md MR-2 Pass-3 redux executed cleanly. Pre-R43 CLAUDE-IMPLEMENTER.md = 44 REINFORCED entries; post-R43 = 30 entries (AC-R43-1 ✓ empirically verified: `grep -c "^# REINFORCED" CLAUDE-IMPLEMENTER.md` = 30). 16 standalones folded into 4 existing composite extensions + 2 new composites (ATTESTATION-SCOPE-FIDELITY + PRE-EMIT-GRILLING-COMPLETENESS-GATE). Net: -16 + 2 = -14 REINFORCED headings. | R43 | IMPLEMENTER

CONFIRMATION: composite-count-update-rule-applied | AC-R43-4 ✓ all 9 composite headings match body sub-variant counts post-R43. Stale-count fixes (Rule 5 self-application of R39 MAJOR-1) applied to 4 composites: HALT-DISCIPLINE 5→6 (pre-existing stale; no folds), MEMORIAL-AND-ATTESTATION-ACCURACY 4→8 (pre-existing stale 4→5 + 3 new folds), SPEC-PRESCRIPTION-FIDELITY 4→7 (pre-existing stale 4→5 + 2 new folds), AC-COVERAGE-COMPLETENESS 2→4 (pre-existing stale 2→3 + 1 new fold). New composites carry accurate counts at authoring (3 sub-variants each). Audit verified per-composite via `awk` range-based sub-variant pattern match. | R43 | IMPLEMENTER

CONFIRMATION: verbatim-preservation | AC-R43-3 + AC-R43-8 ✓. All 16 folded standalones' distinctive phrases verified present in post-R43 file via grep spot-check (17 phrases checked, all returned count=1). Lesson bodies preserved verbatim within sub-variants (allowing only the bullet-and-label transformation per § 3.3 mechanism). No silent paraphrasing, no lesson silently omitted. R39 MAJOR-2 self-application gate PASS. | R43 | IMPLEMENTER

CONFIRMATION: test-baseline-discipline-restoration | AC-R43-9 ✓. Pre-R43 baseline = 361/355/3/3; post-R43 = 361/356/2/3. The +1 pass / -1 fail is AC-R36-21 ("CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2") transitioning FAIL → PASS as a direct consequence of R43's consolidation work — exactly the discipline-restoration the R36 forward-protection guard was authored to detect. AC-R36-30 + AC-R36-31 continue to fail (forward-protection capturing post-R36 file additions; expected). `npx tsc -p tsconfig.test.json` exit = 0. Zero regression. | R43 | IMPLEMENTER

CONFIRMATION: anti-scope-allowed-set-forward-coverage | AC-R43-7 ✓. ALLOWED_SET enumerated in Q-R43-SPEC § 5 AC-R43-7 at spec-emit time: Q-R43-SPEC.md, CLAUDE-IMPLEMENTER.md, MEMORIAL.md, NEXT-ROLE.md, plus regex carve-outs for REVIEWER-REPORT-R43.md + DIAGNOSTIC-R43-*.md. No engine/*, test/*, tools/*, MEMORIAL-PHASE-*.md (R42 frozen shards untouched), other CLAUDE-*.md (R42 deliverables stable), CROSS-PROJECT-MEMORIAL.md (Rule 7 discipline; cross-project promotion gated on 2nd-project occurrence). Rule 4 forward-coverage applied. | R43 | IMPLEMENTER

CONFIRMATION: rule-7-anchor-canonical-landing-deferred | The 2 new composites (ATTESTATION-SCOPE-FIDELITY + PRE-EMIT-GRILLING-COMPLETENESS-GATE) are CLAUDE-IMPLEMENTER.md-local consolidations. They are NOT promoted to CROSS-PROJECT-MEMORIAL.md. Rule 7 discipline applied at landing: 1 Tessera-internal data point per pattern; cross-project canonical landing gated on 2nd-project occurrence per § 5.5 R42 anchor-canonical-landing precedent. The patterns may become cross-project rules if a 2nd anchor-using project surfaces the same recurring failure mode. | R43 | IMPLEMENTER

CONFIRMATION: cross-project-rules-applied-upfront | All 7 cross-project rules applied per Q-R43-SPEC § 7. Rule 1: AC-R43-1 + AC-R43-8 + AC-R43-9 require empirical verification (grep, diff, test-run). Rule 2: N/A no code branches. Rule 3: methodology round; no test file required (R39/R42 precedent). Rule 4: ALLOWED_SET above. Rule 5: R39 MAJOR-1 + R39 MAJOR-2 + R39 MINOR-2 self-applied to this round's own consolidation act (sub-variant count update; verbatim-preservation diff; trigger phrase preservation). Rule 6: no DIAGNOSTIC-as-workaround used; thematic fits were preserved. Rule 7: anchor canonical landing deferred (above). | R43 | IMPLEMENTER

OBS: line-count-side-effect | Pre-R43 CLAUDE-IMPLEMENTER.md = 554 lines; post-R43 = 571 lines (+17 lines net). The line-count increase despite removing 16 standalones reflects the sub-variant labeling overhead (each sub-variant prepends a `<Name> (R<NN>):` label + indentation). The REINFORCED HEADING count drops 44 → 30 (the canonical metric); line-count is a secondary measure. Read cost remains roughly proportional but with denser thematic grouping. | R43 | IMPLEMENTER

OBS: pre-existing-stale-composite-headings-uncovered | R43 audit of composite headings vs body content discovered 4 pre-existing stale counts (HALT 5→6; MEMORIAL 4→5; SPEC 4→5; AC-COV 2→3) where post-R39 sub-variant additions had violated R39 MAJOR-1 (count-update-in-same-commit) without being caught at the time. R43 fixed all 4. This is a delayed R39 MAJOR-1 self-application — the rule was authored at R39 but its first cross-composite audit happened at R43. Future composite extensions should grep `(composite; N sub-variants)` headings against actual sub-variant counts at each round-close as a pre-commit gate. | R43 | IMPLEMENTER

OBS: forward-protection-guard-correctness-confirmed | AC-R36-21 forward-protection guard ("CLAUDE-IMPLEMENTER.md ≤30 REINFORCED block entries after MR-2") fired correctly during R37-R41 accretion (FAIL → expected; signaled consolidation overdue) and now passes at R43 chore-A (PASS → consolidation completed). The R36 forward-protection mechanism is empirically validated end-to-end: it detected the accretion drift, the R41 MEMORIAL flagged the threshold, and R43 closed the loop. Pattern is sound. | R43 | IMPLEMENTER

---
