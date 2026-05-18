# Q-R19-SPEC — Phase 2 SLICE 1 Close Walk + R18 MINOR In-Passing Cleanup

**Round:** R19  
**Tier:** audit (S4 tactical follow-up + S2 R18 spec + REVIEWER-REPORT describe the work)  
**Authored by:** Implementer (audit mode — one session, two hats)

---

## Brainstorm

**Approach A — Close-walk + MINOR-1 in-passing + OBS-3 cleanup**  
Strengths: Closes the bookkeeping gap (MINOR-1 spec amendment), removes the erroneous OBS-3 NEXT-ROLE instruction in one pass. MINOR-1 is a 1-paragraph amendment block — pure documentation, no code.  
Weaknesses: Three change surfaces (new CLOSE-WALK file, amended Q-R18-SPEC.md, NEXT-ROLE.md update).  
Risks: If Q-R18-SPEC.md amendment text requires an architectural decision, HALT.

**Approach B — Close-walk only**  
Strengths: Single new file, minimal surface.  
Weaknesses: Leaves MINOR-1 open when it can be closed with ~5 lines; leaves OBS-3 erroneous NEXT-ROLE instruction persisting to next Reviewer.  
Risks: None.

**Approach C — Close-walk + all possible in-passing fixes**  
Strengths: Maximum closure rate.  
Weaknesses: MINORs 2/3 are historical NEXT-ROLE.md attestation errors already corrected by Reviewer independent verification — nothing to edit. MINOR-4 is a Memorial-Updater role task. Approach C collapses to Approach A.

**Selection: Approach A.**  
MINOR-1 is a bookkeeping amendment (no design decision needed — the operator's Option A disposition is already recorded in commit `5aa8cf0` and DIAGNOSTIC; the amendment just adds a paper trail in the spec). OBS-3 cleanup is a template hygiene fix (1 line deletion in NEXT-ROLE.md). MINORs 2/3 are closed by the Reviewer's independent per-file count verification in REVIEWER-REPORT-R18.md — no code edit needed. MINOR-4 belongs to the Memorial-Updater.  
Rejection of Approaches B and C documented above.

---

## Design sketch

**Component inventory:**

| File | Action | Notes |
|---|---|---|
| `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` | CREATE | New — 6 sections per NEXT-ROLE.md prescription |
| `coordination/specs/Q-R18-SPEC.md` | AMEND | Add § Amendments block for MINOR-1 (AC-R18-10 allowed-set expansion) |
| `coordination/NEXT-ROLE.md` | UPDATE | Routing block: REVIEWER; remove OBS-3 "DO NOT read SPEC-AUDIT" line |
| `coordination/MEMORIAL.md` | APPEND | R19 CONFIRMATION + VIOLATION entries |

No `engine/`, `test/`, `tools/`, or `src/` files modified.

**Integration points:**

1. CLOSE-WALK § 4 cites Q-R18-SPEC.md § Amendments for MINOR-1 closure.
2. CLOSE-WALK § 6 cites REVIEWER-REPORT-R18.md + commit chain (`c9827a9` RED → `9012faa` final HEAD + `4564bf0` chore close).
3. NEXT-ROLE.md Attestation SHA block records the chore commit SHA per Coordination chore sequence.

**Failure modes:**

- Q-R18-SPEC.md amendment text spawns an architectural question → HALT + DIAGNOSTIC
- CLOSE-WALK § 3 SLICE 2 framing crosses into pre-dispositioning parked items → HALT

---

## 1. Goal

R19 delivers the Phase 2 SLICE 1 close-walk artifact (`coordination/PHASE-2-SLICE-1-CLOSE-WALK.md`), closing the SLICE 1 milestone. It addresses R18 MINOR-1 in-passing via a spec amendment, documents MINORs 2/3 as closed-by-Reviewer-verification, and defers MINOR-4 to the Memorial-Updater. R19 also removes the OBS-3 erroneous "DO NOT read SPEC-AUDIT" instruction from the NEXT-ROLE.md routing template. No production code, no test code, no new Q-cycle spec for future work.

---

## 2. Mechanism

**PHASE-2-SLICE-1-CLOSE-WALK.md** mirrors the PHASE-1-CLOSE-WALK.md pattern at 1-SLICE scale. Six sections per NEXT-ROLE.md R19 prescription.

**Q-R18-SPEC.md amendment (MINOR-1):** A `## Amendments (post-Reviewer)` section appended to Q-R18-SPEC.md records: the operator's Option A disposition that permitted q01-no-at-pin-deltas.test.ts + VENDORING-MANIFEST.md modification; the resulting AC-R18-10 allowed-set expansion from 10 to 15 entries; and the rationale. This is the spec-side paper trail the Reviewer identified as missing in MINOR-1. No AC table entries change; the implementation is already GREEN.

**OBS-3 cleanup:** Remove the single line in NEXT-ROLE.md operator-authored sections that said "DO NOT read Q-R18-SPEC-AUDIT.md." The R18 Reviewer correctly over-rode it per the system-prompt directive; R19 cleans the template so no future Reviewer is misled.

**REINFORCED counts at R19 close:**  
`grep -c "^# REINFORCED"` at session start (empirically verified):  
CLAUDE-COMMON.md = 1, CLAUDE-ARCHITECT.md = 18, CLAUDE-IMPLEMENTER.md = 26, CLAUDE-REVIEWER.md = 1, CLAUDE-MEMORIAL.md = 0  
**Total: 46**. R18 contributed: COMMON +0, ARCH +1 (failure-mode-enumeration gap), IMPL +3 (allowed-set expansion without amendment, per-file count obligation, aggregate decomposition accuracy), REVIEWER +0.

---

## 3. Acceptance criteria

**AC-R19-1** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 1, then the section names all four R18 delta classes (`TopologyNode.kind` extension, `TopologyEdge.relationship` extension, `VerdictGroup cluster_event_id?` field, v9X fixture) and states "12/12 ACs PASS per REVIEWER-REPORT-R18.md".

**AC-R19-2** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 2, then the section names both vendored-at-pin → vendored-with-deltas precedents (R01: `engine/types/config.ts`; R18: `engine/types/verdict.ts`) and states the two required steps when any vendored file receives Tessera-specific additive deltas: (a) update VENDORING-MANIFEST.md row status, (b) remove file path from AT_PIN_FILES in `test/q01-no-at-pin-deltas.test.js`.

**AC-R19-3** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 3, then the section frames Phase 2 SLICE 2 scope per `SCOPING-MEMO-v0.3.md` § 2.3 (outer aggregator + cluster_event_id scope re-architecture) and states the parked status of both OQ-1/Q-JC1 and OQ-R08-3 without picking a disposition.

**AC-R19-4** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 4, then all 4 R18 MINORs are enumerated with one of three dispositions: `closed-in-passing` (for MINOR-1), `closed-by-Reviewer-verification` (for MINORs 2 and 3), or `deferred-to-Memorial-Updater` (for MINOR-4).

**AC-R19-5** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 5, then REINFORCED counts are stated per CLAUDE file, match values verifiable by `grep -c "^# REINFORCED"` on each file at HEAD, and sum to 46.

**AC-R19-6** — Given `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` is read, when inspecting § 6, then the section cites `coordination/specs/Q-R18-SPEC.md`, `coordination/reviews/REVIEWER-REPORT-R18.md`, commit hash `c9827a9` (RED commit), and commit hash `9012faa` (MERGE-READY HEAD).

**AC-R19-7** — Given `coordination/specs/Q-R18-SPEC.md` is read, when searching for the string `Amendments`, then a section exists that records: (a) the operator Option A disposition permitting q01-no-at-pin-deltas.test.ts and VENDORING-MANIFEST.md modification; (b) the resulting AC-R18-10 allowed-set entry count (15, expanded from the spec-prescribed 10); (c) the commit `5aa8cf0` where the unblock was applied.

**AC-R19-8** — Given `npx tsc --noEmit` is run at HEAD, then exit code is 0.

**AC-R19-9** — Given `node --test test/*.test.js` is run at HEAD, then output shows pass 181 / fail 0; OBSERVED per-file counts match the pre-R19 baseline (19 files, unchanged by R19).

---

## 4. Anti-scope

- Phase 2 SLICE 2 implementation work of any kind.
- Modification to any file under `engine/`, `test/`, `tools/`, or `src/`.
- Any architectural decision in § 3 framing of CLOSE-WALK (framing only; no disposition of OQ-1/Q-JC1, OQ-R08-3, or any other parked item).
- Prescribing what future SLICEs MUST do (describe patterns; do not mandate).
- Vendoring verification (was a PHASE-1-CLOSE-WALK.md § 4 section; not required at SLICE 1 close).
- Modification to any prior-round spec beyond Q-R18-SPEC.md § Amendments block.
- PSU / cooling_zone TopologyNode.kind additions (Phase 2 SLICE 3).
- peer TopologyEdge.relationship additions (deferred).

---

## 5. Open questions

None — all resolved.

---

## Pre-emit grilling

1. **Every claim backed by verifiable evidence?** Yes — all cross-references cite file paths + section numbers; REINFORCED counts empirically derived via grep command stated in § 5; commit hashes cited are verifiable in git log.
2. **Unstated assumptions?** One: the R18 MEMORIAL-UPDATER's reconstruction of Implementer confirmations from commit history (MINOR-4 disposition) is assumed complete. Verified by reading MEMORIAL.md §R18-MEMORIAL-UPDATER section.
3. **Scope added beyond NEXT-ROLE.md prescription?** No — 1:1 mapping to NEXT-ROLE.md Deliverable 1 + Deliverable 2 MINOR cleanup + OBS-3.
4. **Reviewer can act on this with zero clarifying questions?** Yes — ACs are Given/When/Then with specific file:line resolution paths; anti-scope is explicit; no deferral of design decisions.
5. **Correction-propagation pass (R09 MAJOR-1):** Q-R18-SPEC.md amendment is a new section (not correction of existing text); no sibling sites with the same claim to propagate.
6. **Formula vs implementation check:** No formulas in this round.
7. **Halt-condition check:** Neither the spec amendment nor the § 3 framing requires an architectural decision. CLOSE-WALK § 3 describes SLICE 2 scope per SCOPING-MEMO-v0.3.md without picking dispositions. Within scope.
