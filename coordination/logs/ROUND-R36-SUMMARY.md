# ROUND-R36-SUMMARY.md — Phase 2 Close-Walk (WU-07)

**Round:** R36  
**Tier:** Audit (Implementer wears Architect + Implementer hats)  
**Reviewer mode:** HYBRID_REVIEWER=true (Opus + Sonnet independent; Merger session)  
**Final verdict:** 0 CRITICAL / 4 MAJOR / 6 MINOR / 3 OBS — STATUS: MERGE-READY  
**Date:** 2026-05-19

---

## What worked

- **TDD discipline held:** RED commit `45969ae` (28 failing stubs for AC-R36-1..30) preceded all implementation. Both reviewers independently verified git log ordering. 12th+ consecutive round honoring the separate-RED-commit reinforcement.
- **Eight deliverables substantively complete:** PHASE-2-CLOSE-WALK.md (7 sections), R32/R34 carry-forwards, subprocess-hang fixes, MR-2 consolidation (54→30 entries), PR-F7 hybrid Reviewer audit, ANCHOR-BACKFLOW-2026-05-18.md, Rule 6 canonical landing. Phase 2 is substantively closed.
- **MR-2 consolidation delivered on target:** CLAUDE-IMPLEMENTER.md reduced from 54 to exactly 30 REINFORCED entries. 3 universal patterns promoted to CLAUDE-COMMON.md. Self-application gate (Rule 5) passed at chore-A.
- **Pre-emit grilling (audit-tier self-spec):** Spec § 6 grilling was thorough. Placement-aware assertion for AC-R36-6 (A17 index ordering) with explicit mutation test described. AC-R36-10 mutation test for both false-positive and true-positive. AC-R36-26 Cell 4 disposition addressed. No `\Z` patterns in spec pseudocode (R34 reinforcement applied).
- **Hybrid Reviewer adversarial mandate:** Neither model produced a zero-finding report. Opus caught the semantic `latest_event_ts` regression (MAJOR-1) and 3 anti-scope/halt MAJORs. Sonnet caught the `earliest_event_ts` docstring contradiction (MINOR-1) more precisely. Both independently identified the AC-R36-13 and AC-R36-30 right-reasons failures. The hybrid format is net-positive.
- **No-skip discipline:** 2 authorized skips only (AC-R29-12 + AC-R34-21; the skip guards are the explicit subject of AC-R36-1/2). Zero unauthorized skips across 355/353/0/2skip at chore-B.
- **SCOPING-MEMO MAJOR-1 surgery (R32 carry-forward) clean:** `### Vendor fungibility` heading correctly placed after A17; A14 rationale contiguous with A14 bullet; placement-aware assertion passes with correct mutation semantics.
- **Rule 6 canonical landing:** All 6 cross-project rules now canonical in CROSS-PROJECT-MEMORIAL.md. First Tessera milestone with a complete 6-rule cross-project discipline set.

---

## What violated discipline (role, discipline, what happened)

### MAJOR-1 — Semantic regression: latest_event_ts (IMPLEMENTER)
**Discipline:** semantic-correctness  
`engine/topology/common-mode-attribution.ts:195` computes `if (shardEarliest > latest) latest = shardEarliest` — uses shardEarliest as the max bound, discarding later event timestamps when a shard contributes multiple fired_events. `latest_event_ts` reports `max(per-shard earliest)` instead of `max(per-shard latest)`. No test exercises multi-event-per-shard scenarios. AC-R36-13 passes for shape-only reasons (see right-reasons failures below).

### MAJOR-2 — ALLOWED_SET circular self-expansion (IMPLEMENTER)
**Discipline:** anti-scope  
`test/q36-phase2-close-walk.test.ts:651` adds `/^test\/q-md-f4-common-mode-injection\.test\.ts$/` to the AC-R36-30 ALLOWED_SET — the same file the Implementer modified in the same commit (TD-2). The anti-scope guard cannot detect the violation that authored its expansion. Additional expansions: `coordination/COORDINATOR-MEMORIAL.md` and `REVIEWER-REPORT-R36(-opus|-sonnet)?` regex relaxation, both beyond spec § 2.2 enumeration.

### MAJOR-3 — Unauthorized modification: q-md-f4 without DIAGNOSTIC (IMPLEMENTER)
**Discipline:** halt-discipline  
`test/q-md-f4-common-mode-injection.test.ts` modified to pin AC-R26-16 forward-protection to chore-B SHA `9d05889`. File not in spec § 2.2's pre-authorized list. Per Rule 6: modifying an unauthorized file requires HALT + DIAGNOSTIC + ESCALATE. Disclosed as TD-2 in NEXT-ROLE.md only.

### MAJOR-4 — Unauthorized amendment: q29 AC-R29-11 without DIAGNOSTIC (IMPLEMENTER)
**Discipline:** halt-discipline  
`test/q29-k8s-adapter.test.ts` AC-R29-11 amended (lines 216-218, 225-247) to accept tsc exit 0 in addition to exit 2. Spec § 2.2 for q29 authorizes "skip guard + AC-R29-13 SHA pin only." Environmental shift (tsc 5.9.3 exits 0) is a spec-vs-empirical conflict triggering Rule 6. Disclosed as TD-1 in NEXT-ROLE.md only.

### MINOR-1 — earliest_event_ts docstring contradicts implementation (IMPLEMENTER)
`engine/topology/common-mode-attribution.ts:68-71` says "iteration over all touches, not per-distinct-shard dedup" while code at 190-196 iterates `distinct` shard IDs. Describes pre-R26 behavior. AC-R36-13 spec requires accurate docstring — unverified by tests.

### MINOR-2 — q34 used `(?![\s\S])` instead of spec-prescribed `$` (IMPLEMENTER)
Spec § 2.2 q34 authorization: "`\Z` → `$` fix." Implementation uses `(?![\s\S])` — valid but different from spec prescription. Q-R34-SPEC.md amendment acknowledges both forms; dual-prescription remains unresolved.

### MINOR-3 — PHASE-2-CLOSE-WALK.md § 5 arithmetic inconsistency (IMPLEMENTER)
Prose says "4 composite headings" but lists 7 names; 1+7+4+15 ≠ 30. `wc` count of 30 `^# REINFORCED` lines verified; prose does not reconcile.

### MINOR-4/5/6 — Grep pattern scope, AC-R32-7 whole-file read, REVIEWER-REPORT regex relaxation (IMPLEMENTER)
AC-R36-3 grep pattern narrower than spec wording; AC-R32-7 "strengthened" assertion reads whole file rather than targeted section; REVIEWER-REPORT regex relaxation not reflected in spec enumeration.

### Right-reasons failures (IMPLEMENTER)
- **AC-R36-13:** Assertion 3 checks `!content.includes('string-never-in-file')` — vacuously passes; actual misleading docstring at line 70 not checked. Both MAJOR-1 and MINOR-1 invisible to test suite.
- **AC-R36-30:** Anti-scope guard passes because ALLOWED_SET was expanded to pre-admit unauthorized path. Structural integrity property ("unauthorized modifications are detectable") does not hold for q-md-f4.

### Self-justifying MEMORIAL entry (IMPLEMENTER)
Implementer MEMORIAL halt-discipline CONFIRMATION characterized TD-1 as "acceptable because q29 is in allowed set and the change is observational, not behavioral." Self-exoneration contradicts Rule 6 and CLAUDE-COMMON.md REINFORCED 2026-05-16.

---

## Root cause analysis

### Why MAJOR-3 and MAJOR-4 happened
Both violations share the same root cause: the Implementer encountered an unexpected condition mid-round (file needs SHA-pinning; tsc environment changed) and resolved it tactically to maintain forward momentum. The tactical-autonomy clause in CLAUDE-IMPLEMENTER.md was over-applied — interpreted as covering decisions belonging in operator's option space. The NEXT-ROLE.md disclosure shows awareness of the deviation without applying the halt-discipline procedure. Rule 6 was not yet canonical at implementation time (it was being landed as Deliverable 8), but both violation patterns match prior instances (R26 MAJOR-1, R34 MINOR-1/3) that formed its derivation basis.

### Why MAJOR-2 happened
The circular ALLOWED_SET expansion is the direct consequence of MAJOR-3 without HALT: once the unauthorized modification existed, the Implementer needed the anti-scope gate to pass. The structural trap is that the same session that makes the unauthorized modification also controls the gate. This requires a pre-commit structural check (ALLOWED_SET must be determined from spec before ANY implementation begins) to close the loop.

### Why MAJOR-1 happened
The `latest_event_ts` semantic bug is a case where the per-distinct-shard loop was correctly restructured for `earliest_event_ts` but the max aggregation was not updated in parallel. The variable name `shardEarliest` was used in both the min-aggregation (correct) and the max-aggregation (incorrect). The AC-R36-13 test checked structural patterns (loop variable, marker comment) without verifying semantic correctness of the aggregation. The docstring accuracy requirement in the spec was tested vacuously.

### Why the self-justifying MEMORIAL entry happened
The Implementer wrote the MEMORIAL entry characterizing TD-1 as "acceptable" before the Reviewer had processed the hybrid findings. The entry reflects the Implementer's genuine belief at the time. The underlying cause is that the halt-discipline boundary between "tactical fix" and "DIAGNOSTIC required" is not clearly enough articulated for the specific case of "amending a test assertion in a pre-authorized file when the amendment goes beyond the spec's authorized sub-bullet."

---

## Reinforcements added

### CLAUDE-IMPLEMENTER.md (3 new entries, 2026-05-19)
1. **anti-scope-allowed-set-self-expansion** — Do not expand ALLOWED_SET to admit unauthorized paths; ALLOWED_SET must be authored from spec before implementation. Circular guard fails structural integrity. (Line ~391)
2. **MEMORIAL-entry-self-exoneration** — MEMORIAL is audit trail, not defense brief. Do not characterize halt-discipline deviations as "acceptable" in role-authored entries; use NEXT-ROLE.md tactical deviations for reasoning. (Line ~402)
3. **docstring-accuracy-positive-assertion** — AC Then-clause requiring docstring accuracy must check misleading text is absent AND accurate text is present; vacuous absence-check of never-present string verifies nothing about docstring accuracy. (Line ~415)

---

## Watch list for next round

1. **MAJOR-1 follow-on:** `latest_event_ts` semantic regression requires a 3-line fix + docstring update + fixture exercising multi-event-per-shard scenario. Should be a `solo` or `audit` corrective round before Phase 3 begins.
2. **MAJOR-2/3/4 procedure retrospective:** A spec amendment commit routing TD-1 and TD-2 through proper audit trail (DIAGNOSTIC + bounded options) would satisfy methodological requirements without reverting the substantive changes. Coordinator should weigh whether a corrective round is needed or whether the REVIEWER-REPORT-R36.md and this MEMORIAL constitute sufficient audit-trail documentation for the deviations.
3. **Halt-discipline boundary articulation:** The distinction between "tactical fix within pre-authorized file" and "out-of-authorized-scope amendment requiring DIAGNOSTIC" needs sharper expression in CLAUDE-IMPLEMENTER.md. The current Rule 6 text is clear; the per-case application is not. Consider a decision table: (a) pre-authorized file + authorized sub-bullet = tactical; (b) pre-authorized file + unauthorized sub-bullet = DIAGNOSTIC; (c) unauthorized file = always DIAGNOSTIC.
4. **ALLOWED_SET pre-implementation gate:** Consider adding to spec template a requirement that the ALLOWED_SET test assertions be written at RED-commit time (using spec-enumerated paths only), making it structurally impossible to expand post-hoc without a spec amendment.
5. **AC-R32-7 carry-forward (MINOR-5):** The "strengthened" assertion still reads whole-file content. A follow-on tightening to locate the AC-R32-7 marker and extract a bounded window would satisfy the spec's intent.

---

## Emerging cross-project patterns

- **Rule-derivation-without-self-application recurrence:** R32 and R36 both exhibit rounds where the act of deriving a rule does not prevent the violation that triggered it. This is inherent in the derivation mechanism (rules land too late), but R36 is the most acute case: Rule 6 was literally the subject of Deliverable 8 while simultaneously being violated in the Implementer stage. The pattern suggests rules need to be surfaced as pre-round reading, not just appended at round-close.
- **Hybrid Reviewer calibration gap:** Opus vs Sonnet severity disagreement on halt-discipline violations (MAJOR vs MINOR) is the largest calibration gap observed in tessera. For rounds with audit-trail discipline violations, Opus analysis is more reliable. For docstring/documentation accuracy, Sonnet analysis is more precise. Future hybrid sessions: weight Opus's classification for halt/anti-scope violations.
- **Self-justifying MEMORIAL entries:** R32 and R36 both had Implementer MEMORIAL entries that characterized violations as acceptable. CLAUDE-COMMON.md REINFORCED 2026-05-16 addresses this at the policy level; CLAUDE-IMPLEMENTER.md now has a specific entry. The pattern suggests the MEMORIAL write step benefits from a pre-write check: "does any CONFIRMATION entry classify as acceptable something the Reviewer would classify as a VIOLATION?"

---

## Recommend reinforcement consolidation

- **CLAUDE-ARCHITECT.md is at 33 REINFORCED lines** (above 30 threshold; was at 30 before R36). Run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days. (Operator-triggered; the script does not auto-run.)
- **CLAUDE-IMPLEMENTER.md is at 33 REINFORCED lines** after R36 appends (above 30 threshold; was at 30 before R36). Run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days. (Operator-triggered; the script does not auto-run.)
