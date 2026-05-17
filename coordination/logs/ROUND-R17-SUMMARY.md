# ROUND-R17-SUMMARY

_Memorial Updater summary for R17. Written 2026-05-17._

**Round:** R17 — TQ-1 (β) pitch-revise + shard definition + R10 MINOR-1 in-passing  
**Tier:** Audit (S4 + S2 follow-up to R14/R16)  
**Roles:** Implementer (self-spec + execute), Reviewer (cold-audit), Memorial Updater  
**Result:** 0 CRITICAL / 0 MAJOR / 3 MINOR / 4 OBS; 10/10 ACs PASS; 171/0 tests (R16 baseline unchanged)

---

## What worked

**Implementer pre-emit grilling (spec-internal consistency):** Grilling caught two real issues before commit — (1) topology table inconsistency (scalable_unit derivation produced 128 vs canonical 256 per NVIDIA NeMo; corrected by using canonical numbers); (2) AC-R17-3 strikethrough of old claim technically still "says" the value; replaced with clean amendment text. Both caught before commit; grilling discipline working for internal consistency checks.

**Reviewer adversarial audit despite 10/10 PASS:** Reviewer surfaced 3 MINOR + 4 OBS despite no critical or major failures and full AC pass. The adversarial mandate held: a clean round is not a zero-finding round.

**Reviewer memorial-accretion rule applied on first use:** Reviewer applied the R16-derived reinforcement (CLAUDE-REVIEWER.md REINFORCED 2026-05-17) — appended 3 VIOLATION entries to MEMORIAL.md for MINOR-1/2/3 before routing. This is the first tessera round where the Reviewer applied this rule correctly without requiring Memorial Updater reconstruction. The corrective loop (R16 VIOLATION → reinforcement → R17 CONFIRMATION) closed in exactly one round.

**Inherited-testimony empirical verification:** Reviewer re-ran `node --test test/q14-pr-f5-storage.test.js test/q16-pr-f5-investigation.test.js` independently to verify the R14/R16 figures cited in the [R17 AMENDMENT] block. Matches verbatim. R08 MAJOR-2 reinforcement applied correctly.

**Halt-discipline:** Implementer correctly assessed the 7-site enumeration against the ">5 sites" halt condition; counting interpretation (file-level for Item 1 = 2 files; section-level = 4 sections) cleared the threshold either way. No HALT required; no architectural ambiguity surfaced. 9th consecutive clean halt-discipline round (R09–R17).

**Anti-scope:** All 10 anti-scope clauses clean. Zero new test files, zero vendored engine changes, zero schema changes. Continues the unbroken tessera anti-scope streak.

**Right-reasons audit:** 3/3 tests audited; none self-confirming. 10th consecutive tessera round of Reviewer-side right-reasons audit (R08–R17).

---

## What violated discipline (role, discipline, what happened)

**MINOR-1 — Implementer, correction-propagation (section-granularity gap)**

The Implementer ran `grep -r "1\.2-1\.5"` across the full repo and correctly identified PHASE-1-CLOSE-WALK.md as a hit-bearing file. The enumeration was done at file level: the file appeared in the hit list and § 6 (TQ-1 sub-section) was updated with the (β) disposition. However, § 5 (outstanding-gaps section, line 175) was not updated. § 5 retains forward-looking advice: "recommended first step is (γ) investigation — verify measurement methodology before architectural revision" and "Recommended action: operator triages TQ-1 before Phase 2 launch." After R17's closure of TQ-1 with disposition (β), this advice is stale. The document now has internal inconsistency: § 5 says TQ-1 is outstanding; § 6 says TQ-1 is closed.

The Implementer's MEMORIAL at line 1628 asserted "All live claims updated; no semantic paraphrase of old claim left as current-state assertion in any of the 5 files modified." This assertion overstates correctness — the file-level enumeration missed a section within a hit file.

**MINOR-2 — Implementer, memorial-structure (insert-point ordering)**

The R17 Implementer appended the `---` separator + `## R17 — Implementer (2026-05-17)` header + 7 R17 CONFIRMATION entries, but this block was inserted BEFORE the pre-existing R16 Memorial Updater role-boundary CONFIRMATION (tagged `| R16 | MEMORIAL-UPDATER`), rather than AFTER it. The result: the R16 entry (tagged R16/MEMORIAL-UPDATER) appears physically inside the R17 Implementer section. The line-level round/role tag preserves attribution, but a reader scanning `## R17 — Implementer` for R17 entries encounters an R16 entry — misleading even though it is labeled.

**MINOR-3 — Implementer, docblock-citation-path (in-passing cleanup missed bare-path citations)**

`engine/per-shard/runtime.ts:17` and `:24` cite bare filenames `REVIEWER-REPORT-R10.md` and `REVIEWER-REPORT-R14.md` without the canonical `coordination/reviews/` prefix. These citations are pre-R17 (not introduced by R17). However, R17 explicitly opened this file to satisfy R10 MINOR-1 (docblock first-line slug update). An in-passing cleanup of the same file is the natural opportunity to fix bare-path citations. The opportunity was not taken.

---

## Root cause analysis

**MINOR-1 (correction-propagation section-granularity):** The correction-propagation reinforcement (CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-16) says "enumerate ALL downstream sections that cite or derive from the corrected primitive." The Implementer applied the reinforcement at file level: once a file appeared in the grep output, that file was treated as "handled" after updating its primary hit section. The reinforcement's "section" language was not implemented at section-level granularity. Root cause: the grep produces file-path results; the discipline requires iterating through ALL sections of each hit file, not just the section at the grep hit. The existing REINFORCED rule is correct but the Implementer stopped at file-level enumeration.

**MINOR-2 (memorial-structure ordering):** When appending a new round's section to MEMORIAL.md, the Implementer read the current file state and used an insertion point without verifying that the prior section's last line had already been reached. Because the R16 Memorial Updater's final entry appeared near the end of the file but AFTER the position the Implementer used as an insertion target, the new ## R17 header was inserted before the R16 entry. Root cause: the Implementer did not perform an explicit "what is the true terminal line of the prior section?" check before writing the separator and header.

**MINOR-3 (docblock-citation-path):** In-passing cleanups have a natural scope (the specific items listed in the spec for in-passing). The R17 spec scoped the in-passing to Item 5: "the first-line slug" of the docblock. The citation-path issue is in the body (lines 17 and 24), not the first line. The Implementer correctly scoped the change to the spec's "first-line slug" language and did not extend scope — but this also meant not noticing the path issue. Root cause: "in-passing cleanup" scope was read narrowly (only the prescribed line), not as "while in this file, apply a general quality pass."

---

## Reinforcements added

**CLAUDE-IMPLEMENTER.md (3 new REINFORCED lines appended, line ~357+):**

1. `# REINFORCED 2026-05-17` — correction-propagation section-granularity: When a grep-based pass identifies a file as a hit, enumerate ALL sections within that file for status-dependent advice and update each; updating one section is not a complete propagation pass. Detected tessera R17 MINOR-1.

2. `# REINFORCED 2026-05-17` — memorial-structure ordering: When appending a new round's section to MEMORIAL.md, read forward to locate the prior section's terminal line before inserting --- + ## header; do not rely on positional append without verifying prior block end. Detected tessera R17 MINOR-2.

3. `# REINFORCED 2026-05-17` — docblock-citation-path: When performing in-passing docblock cleanup, apply a citation-completeness gate: verify every bare filename cited has a canonical project-relative path and update it. Detected tessera R17 MINOR-3.

**No REINFORCED lines added to CLAUDE-REVIEWER.md, CLAUDE-ARCHITECT.md, CLAUDE-COMMON.md, CLAUDE-MEMORIAL.md** — no violations in those roles this round.

---

## Consolidation check

Post-R17 REINFORCED line counts:
- `CLAUDE-COMMON.md`: 1
- `CLAUDE-ARCHITECT.md`: 17
- `CLAUDE-IMPLEMENTER.md`: 23 (was 20; +3 this round)
- `CLAUDE-REVIEWER.md`: 1
- `CLAUDE-MEMORIAL.md`: 0

No file exceeds 30 REINFORCED lines. **Consolidation recommendation NOT triggered.**

---

## Watch list for next round

- **PHASE-1-CLOSE-WALK.md § 5 stale TQ-1 recommendation (MINOR-1 carryover):** The document inconsistency between § 5 (outstanding) and § 6 (closed) is non-load-bearing because § 6 is canonical, but a future reader consulting § 5's "outstanding items" list will see TQ-1 as open. Fix in a future in-passing window: add one line "**R17 UPDATE:** Closed with disposition (β); see § 6."

- **engine/per-shard/runtime.ts:17,24 bare-path citations (MINOR-3 carryover):** `REVIEWER-REPORT-R10.md` and `REVIEWER-REPORT-R14.md` lack `coordination/reviews/` prefix. Fix in a future in-passing cleanup.

- **Correction-propagation section-granularity pattern:** The section-level sub-class has now been added to CLAUDE-IMPLEMENTER.md. Next Implementer that touches a multi-section document should apply the new reinforcement explicitly: after updating a section, scan all other sections of the same document for stale status-dependent advice.

- **R18 is full-tier (A2 new architectural pattern + A4 novel data model):** The Architect spec is the load-bearing step. Architect should apply the R11/R13/R15 pre-emit-grilling sub-class reinforcements (spec-internal consistency, citation-accuracy, baseline-selection + AC/halt-condition consistency).

---

## Emerging cross-project patterns

**Reviewer memorial-accretion corrective loop:** R16 established the pattern "Reviewer finds MINOR but does not append VIOLATION to MEMORIAL." The R16-derived reinforcement was applied correctly at R17 in one round. This is the expected corrective loop cadence. No further pattern concern.

**Correction-propagation sub-class evolution (tessera only; not cross-project yet):** R09 sub-class = semantic-paraphrase miss within a document. R17 sub-class = file identified but section-level enumeration incomplete. These are distinct failure modes with the same root: correction-propagation discipline is applied as a binary (did I search for this string?) rather than as a systematic multi-section review of every hit file. Future rounds: after identifying hit files, explicitly list all sections in each hit file that reference the claim state and mark each as updated or confirmed-no-update-needed.

**No cross-project ≥3-violation pattern requiring new reinforcement rules:** Scanning all cross-project violation entries, the only discipline with a prior ≥3-violation "Reinforcement rules derived" block is pre-emit-grilling (tessera implementer; derived at R16). No new discipline crosses the 3-violation threshold with R17 additions.
