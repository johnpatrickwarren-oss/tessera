# ROUND-R20-SUMMARY.md — Phase 2 SLICE 2.A (VerdictGrouper cluster_event_id scope keying)

**Round:** R20 (full tier)
**HEAD at round close:** `7eb3a63`
**Result:** MERGE-READY — 0 CRITICAL / 0 MAJOR / 3 MINOR / 3 OBS; 192 pass / 0 fail
**0-CRITICAL streak:** 19 consecutive rounds (R02–R20)

---

## What worked

- **Architect brainstorm + design phase:** Three distinct approaches (A/B/C) documented with constraint elimination; Approach B eliminated via A14 anti-scope; Approach C eliminated via hidden-state hazard; Approach A selected with documented rejection rationale. 15 component boundaries enumerated, 6 integration points with failure modes.
- **Architect empirical-premise-verification:** All 14 load-bearing factual claims verified by direct file-open or grep at session start — not inherited testimony. R08 MAJOR-2 reinforcement applied correctly (13th round).
- **Architect vendored-file-delta-assertion-surface-enumeration:** 3 consumers of engine/verdict-groups.ts (q01-no-at-pin-deltas, q01-vendoring-coverage, q18 AC-R18-7 substring) pre-traced with full assertion surfaces; pre-dispositioned in spec before routing. R18 reinforcement applied on 1st full-tier use.
- **Architect anti-scope-diff end-bound:** AC-R20-12 SHA-pinned to chore-A SHA-A (23a497e), not HEAD. TQ-4 γ companion pattern applied.
- **Architect split-decision routing:** Fleet-merge consumption layer deferred to R21 per operator guidance (R20 capped at 15 ACs); avoids spec bloat and keeps R20 reviewable.
- **Implementer TDD discipline:** RED commit 222a856 (10 assert.fail placeholders) committed before any engine changes. GREEN commit cf9ddce applies all production deltas + real test bodies. chore-B AC-R20-12 follows § 4.7 structural exception (R18 AC-R18-10 precedent). 15th consecutive tessera RED→GREEN round.
- **Implementer anti-scope:** git diff cecd677..HEAD = 8 paths, all ⊂ 11-entry allowed-set. Fleet-merge layer untouched. FusedVerdict shape untouched (A14). v9X fixture untouched.
- **Implementer halt-discipline:** Zero halt conditions encountered. All 5 Architect-anticipated scenarios cleanly avoided.
- **Reviewer independent binding-commands:** npx tsc --noEmit (exit 0), node --test test/*.test.js (192/0), git diff cecd677..23a497e --name-only (8 paths), node --test q01-vendoring/q01-no-at-pin/q18 (14 PASS), diff deploysignal vs tessera verdict-groups.ts (24 hunks, all spec-prescribed). 20th consecutive round of Reviewer-side binding-command execution (R06+ standing policy).
- **Reviewer right-reasons-audit:** 3 tests audited; all NOT self-confirming. AC-R20-7 keying-transition test identified as a strong regression test for the load-bearing behavioral delta.
- **Reviewer anti-scope completeness gate:** Round-start-to-HEAD supplementary check run per CLAUDE-COMMON.md REINFORCED 2026-05-17. 8 paths confirmed; all ⊂ allowed-set.
- **Reviewer memorial-accretion:** 3 VIOLATION entries (MINOR-1/2/3) appended to MEMORIAL.md before routing per CLAUDE-REVIEWER.md REINFORCED 2026-05-17. 3rd consecutive tessera round of Reviewer-complete VIOLATION appends.
- **First tessera full-tier round with zero MAJOR findings.** All prior full-tier rounds had at least one MAJOR (R08, R18) or worse. R20 reaches MERGE-READY in a single cycle with only 3 documentation MINORs.

---

## What violated discipline (role, discipline, what happened)

| # | Role | Discipline | Severity | Summary |
|---|---|---|---|---|
| 1 | ARCHITECT | pre-emit-grilling | MINOR | Spec § 5 preamble paragraph classified AC-R20-12 as a "binding-command attestation" while spec § 4.7 prescribes it as a committed runtime test. The 11-gate grilling ran a spec-internal-contradiction check and a 16-token cross-section consistency pass, but neither was calibrated to catch narrative-classification-vs-structural-prescription mismatches at section boundaries. |
| 2 | IMPLEMENTER | pre-emit-grilling | MINOR | chore-B commit 7eb3a63 added AC-R20-12 as a runtime test but did not refresh the file header (test/q20…test.ts:4-6) which classifies AC-R20-12 as "a binding-command attestation." No file-header accuracy pass before chore-B commit. |
| 3 | IMPLEMENTER | pre-emit-grilling | MINOR | When updating test/q01-no-at-pin-deltas.test.ts per spec § 4.4 (decrement "(5)→(4)"), did not refresh the full file-header summary formula at lines 7-8. Adjacent stale arithmetic (R18 verdict.ts exclusion, R06 SLICE 4 tools) inherited without verification. |
| 4 | IMPLEMENTER | pre-emit-grilling | MINOR | Spec § 4.4 prescribed the parenthetical "(verdict-groups.ts excluded at R20)" inline at the "core orchestration (4)" line; Implementer placed equivalent text at line 10 instead. Equivalent information; different location; no behavioral impact; no AC binding. Low-severity spec-prescription deviation. |

---

## Root cause analysis

**MINOR-1 (Architect spec contradiction):** The § 5 AC-table preamble is a prose section written to summarize the attestation model. § 4.7 is a structural prescription block written to specify forward-protection mechanics. Both were authored by the same Architect session, but at different stages of spec writing — § 4.7 was written when the forward-protection pattern was being designed; § 5 preamble was written during the AC-table assembly phase. The 16-token cross-section consistency pass focused on identifier/format tokens (function names, field names, SHA placeholders, AC numbers) — not prose classification claims. No grilling step explicitly targets "§ 5 attestation-type claims vs. § 4.x prescriptions." The violation is a grilling-checklist gap, not a failure of the grilling pass that was performed.

**MINOR-1 (Implementer header-refresh):** The chore-B commit scope (§ 4.7: add SHA-pinned runtime test) was well-defined and correctly executed. The file header at lines 4-6 was accurate at GREEN commit time. When the chore-B commit changed the nature of AC-R20-12 from "binding-command attestation" to "runtime test", the header became inaccurate. No grilling step at chore-B specifically targets "re-read the file header to verify all classification claims remain accurate." Root cause: the chore-B pre-emit review was narrowly focused on the new test body, not on the downstream consistency of the file's header documentation.

**MINOR-2 (stale arithmetic):** The spec § 4.4 targeted directive is precise: update "(5)" to "(4)" at the core-orchestration entry. The Implementer followed the directive exactly. The surrounding formula drift (R06 SLICE 4 entries; R18 verdict.ts exclusion) predated R20 and was not caused by R20. The root cause is that touching one addend in a summary formula creates a natural opportunity to re-verify the whole formula, but the Implementer (and the spec § 4.4 directive) did not include a "full-formula re-verification" step. The drift is inherited, not introduced.

**MINOR-3 (parenthetical placement):** The spec § 4.4 prescribed inline placement. The Implementer assessed the top-of-file location as arguably clearer (it parallels the existing R18 verdict.ts note at line 9). The choice was defensible but did not match the spec verbatim. No AC binding the placement. Root cause: the Implementer applied subjective judgment about placement without explicitly acknowledging the spec-prescribed location as the default.

---

## Reinforcements added (file path + line summary)

| File | Lines added | Rule |
|---|---|---|
| `CLAUDE-ARCHITECT.md` | 1 REINFORCED block (~11 lines) | § 5 AC-table preamble attestation-type classification must be cross-checked against matching § 4.x prescription during spec-internal-contradiction gate. R20 MINOR-1. |
| `CLAUDE-IMPLEMENTER.md` | 3 REINFORCED blocks (~32 lines total) | (1) chore-B file-header accuracy pass: re-read header classification claims before chore commit. R20 MINOR-1. (2) Full summary formula re-verification when any addend updated. R20 MINOR-2. (3) Spec-prescribed inline parenthetical placement: implement at prescribed location or document deviation. R20 MINOR-3. |

---

## Watch list for next round (R21)

- **Fleet-merge consumption layer (R21 scope):** R20 wired the aggregator-contract-only half of SLICE 2. R21 will wire the fleet-merge consumption layer (engine/fleet/* consumer changes). Anti-scope must explicitly prohibit R21 from touching engine/verdict-groups.ts in ways outside the consumer interface. Expect an allowed-set with fleet/* paths added.
- **AC-R20-8 sub-case coverage (OBS-1 carry-forward):** Sub-cases (c) and (d) of AC-R20-8 only assert `late_arrival === false` — they do not verify that a NEW group was opened. A regression where the wrong group is used would not be caught. Architect for R21 (if touching related code) should consider tightening via a group_id-distinctness assertion. If not touched in R21, add to the carry-forward backlog.
- **q01-no-at-pin-deltas.test.ts:7-8 stale arithmetic (MINOR-2):** The file-header summary is now at known-stale state (actual = 36 entries; summary claims 30). The next round touching this file should apply the full-formula re-verification step.
- **test/q20-…test.ts:4-6 header narrative (MINOR-1):** The file header still describes AC-R20-12 as a binding-command attestation. A future round that reads or extends this file should correct lines 4-6 to acknowledge AC-R20-12 is a runtime test per § 4.7.
- **CLAUDE-IMPLEMENTER.md consolidation:** Now at 33 REINFORCED lines (> 30). See recommendation below.

---

## Emerging cross-project patterns

- **R20 is the first tessera full-tier round with 0 MAJOR findings.** Prior full-tier rounds: R08 (1 MAJOR + 3 Architect violations), R18 (0 MAJOR + 4 MINOR), R20 (0 MAJOR + 3 MINOR all doc-level). The accumulated reinforcement infrastructure (11-gate grilling, 14-claim empirical-verification, 3-consumer assertion-surface enumeration, AC-table preamble cross-check) is producing cleaner full-tier outputs.
- **Pre-emit grilling violations cross 3-occurrence threshold for tessera:** R18 (Architect: assertion-surface enumeration), R19 (Implementer: PRD-wording narrowing), R20 (Architect: narrative-vs-prescription; Implementer: 3 MINORs). Each miss was a "class-of-check not in the grilling checklist" rather than a "check skipped." The corrective pattern is working: each violation generates a REINFORCED line that adds the missing class.
- **Chore-B pre-emit review is an emerging blind spot.** chore-B commits are typically short (one test added) and reviewed less rigorously than GREEN commits. R20 MINOR-1 shows that a chore-B can introduce a documentation-consistency violation even when the code itself is correct. The new REINFORCED line adds a file-header accuracy pass specifically for chore-B commits.

---

## Recommend reinforcement consolidation

- **CLAUDE-IMPLEMENTER.md is at 33 REINFORCED lines** (exceeds 30-line threshold). Run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days. *(Operator-triggered; the script does not auto-run.)*
