# Q-R15-SPEC — Tessera Phase 1 close walk

_Round R15 — full tier. Phase 1 close walk per `coordination/SCOPING-MEMO-v0.3.md` § 3 "Phase 1 close walk" template + overnight pre-approved chain. **Final round of overnight chain; HARD STOP after R15 closes for operator review.**_

_Tier rationale: A3 (resolves multiple Phase-1 close items at architectural-assessment scope) + A6 (large blast radius — synthesis touches every R01-R14 deliverable). See `Q-R15-SPEC-AUDIT.md` for the brainstorm/design/grilling audit trail._

---

## Spec preamble

R15 is a **documentation + state-update round.** It produces ONE new synthesis artifact and modifies TWO authoritative ledgers in place, plus closes one in-passing operator-gate item (R10 MINOR-1 docblock). No new test files; no new engine modules; no algorithmic changes.

**R15 ships four deliverables** (per `coordination/NEXT-ROLE.md` R15 round scope):

1. **Phase 1 close-walk synthesis artifact** — `coordination/PHASE-1-CLOSE-WALK.md` (NEW).
2. **Memorial D state stamp evolution** — append section to `coordination/MEMORIAL.md`.
3. **Phase 2 TAGGED-FUTURE activation criteria** — section within `coordination/PHASE-1-CLOSE-WALK.md`; **operator-gate items documented but NOT dispositioned.**
4. **Vendored-at-pin SHA verification result** — append verification-log section to `coordination/VENDORING-MANIFEST.md`.

**Plus one in-passing fix** (closes R10 MINOR-1 from `coordination/reviews/REVIEWER-REPORT-R10.md` § 2):

5. `engine/per-shard/runtime.ts` file-level docblock updated to reflect SLICE 2b4 (R10) + SLICE 2 carry-forward (R14) contributions. Comment-only; zero runtime impact.

After R15: HARD STOP per overnight authority memory. Operator returns to triage:
- TQ-1 (PR-F5 storage-overhead finding; HIGH priority)
- TQ-2 (anchor PR #38 review/merge; LOW priority)
- All operator-gate items enumerated in PHASE-1-CLOSE-WALK.md § "Outstanding gaps"

---

## REVIEWER-ANCHOR (load-bearing types / files this round cites)

Inherited surfaces R15 references but does NOT modify. Reviewer verifies citations via `sed -n 'N,Mp' <file>` per the R11 citation-accuracy reinforcement.

| File | Line(s) | Anchor content | What R15 cites |
|---|---|---|---|
| `coordination/SCOPING-MEMO-v0.3.md` | 288-326 | § 3 Q-cycle estimate (Phase 1 close walk row at :302) | PHASE-1-CLOSE-WALK.md cites this row as the close-walk template anchor |
| `coordination/SCOPING-MEMO-v0.3.md` | 513-569 | § 9 Engine vendoring policy + § 9.3 Re-pinning policy | VENDORING-MANIFEST.md verification log cites § 9 + Re-pinning policy |
| `coordination/SCOPING-MEMO-v0.3.md` | 488-497 | § 7 Topic close framing | PHASE-1-CLOSE-WALK.md cites the close-framing options |
| `coordination/MEMORIAL.md` | 11-19 | § Inherited active Memorials table (Memorial D row at :13) | Memorial state-stamp delta cites this row's 22V/8C baseline |
| `coordination/MEMORIAL.md` | 22-34 | § Tessera-specific Memorial state lineage table (rows :28-:30) | Memorial state-stamp delta extends this table with the Phase 1 close row |
| `coordination/VENDORING-MANIFEST.md` | 6-48 | Manifest table (41 rows; 40 files currently on disk; 1 REMOVED-AT-R02) | Verification log cites each row by Target path |
| `coordination/OVERNIGHT-LOG-2026-05-17.md` | 9-39 | Morning triage queue (TQ-1 PR-F5; TQ-2 anchor PR #38) | PHASE-1-CLOSE-WALK.md cites TQ-1 + TQ-2 as outstanding-gap entries |
| `coordination/NEXT-ROLE.md` | 140-156 | Operator-gate items list | PHASE-1-CLOSE-WALK.md enumerates each operator-gate item with source reference |
| `engine/per-shard/runtime.ts` | 1-13 | File-level docblock (R03/R04-only narrative; R10 + R14 contributions absent) | Delivery 5 updates this header in-place |
| `engine/per-shard/runtime.ts` | 38-44 | `ExtendedSampleObservation` interface declaration | NOT modified; docblock update narrative cites this surface |
| `coordination/reviews/REVIEWER-REPORT-R10.md` | 82-92 | MINOR-1 description for the runtime.ts docblock gap | Delivery 5 closes this MINOR; spec text cites the finding |

---

## 1. Mechanism

### Deliverable 1 — `coordination/PHASE-1-CLOSE-WALK.md` (NEW)

A synthesis artifact retrospective of R01-R14. **Single source of truth for the Phase 1 close narrative**; references (does not duplicate) authoritative state in MEMORIAL.md and VENDORING-MANIFEST.md.

**WHY**: v0.3 § 3 close-walk template prescribes a single Phase 1 close-walk artifact per the SLICE template ("ADR walk; Memorial D state evolution stamp; Tessera Phase 2 TAGGED-FUTURE activation criterion. Per-file vendored-from-DeploySignal headers verified current at SHA `5a72371` or re-pinned to current DeploySignal main at close."). One artifact ties the four deliverables together; operator returning reads ONE file as the entry point.

### Deliverable 2 — `coordination/MEMORIAL.md` append (in-place update)

Append a section `## Phase 1 close — Memorial D state stamp (2026-05-17)` that:
- Tallies REINFORCED-line accretion by file (`grep -c "^# REINFORCED" <file>` per `CLAUDE-*.md`).
- Tallies CONFIRMATION + VIOLATION entries per round (R02-R14) by discipline class.
- Classifies each Tessera-Phase-1 violation as **Memorial-D class** (architectural-layer-coverage / MD-F6 sub-variant) OR **methodology class** (pre-emit-grilling, citation-accuracy, TDD, halt-discipline, etc.).
- Produces the Phase 1 close Memorial-D state cell: `(inherited 22V/8C pre-Tessera) + (Tessera-Phase-1 Memorial-D-class delta) = (Phase 1 close state)`.
- Extends the existing § Tessera-specific Memorial state lineage table at MEMORIAL.md:22-34 with a new row indexed `#3 | Phase 1 close walk (R15) | <new state>`.

**WHY**: MEMORIAL.md is the canonical project memorial ledger. Adding the state-stamp delta to PHASE-1-CLOSE-WALK.md alone would split authoritative state from the canonical ledger. In-place append preserves the ledger's historical narrative.

### Deliverable 3 — Phase 2 TAGGED-FUTURE activation criteria (within PHASE-1-CLOSE-WALK.md)

A section within PHASE-1-CLOSE-WALK.md documenting **what Phase 2 activation would look like** under each operator disposition of the gate items. **Architect-recommended interpretations only; the operator decides; this section does not pre-disposition any item.**

Covers (per `coordination/NEXT-ROLE.md` R15 round scope):

- **OQ-1 / Q-JC1** — `tools/calibrate.ts` vendoring decision (Phase 1 SLICE 6+ candidate OR defer to Phase 2).
- **OQ-R08-3** — Phase 2 transient detector scheduling.
- **Phase 2 SLICE 1 scope** — per v0.3 § 2.3 (Extension 3 cross-shard correlation; TopologyNode/Edge enum extensions; VerdictGroup scope extension; synthetic-cluster substrate v9X-class fixture).
- **TQ-1 PR-F5 storage finding** (HIGH priority morning-triage item) — Phase 2 activation gate vs Phase 2 entry blocker.

**WHY**: v0.3 § 7 "Topic close framing" frames Phase 2 activation as a post-Phase-1 operator decision (option (c) "partial-activation" per § 7). R15 must document the activation surface without picking the disposition, because the operator-gate items remain operator-decided per overnight authority.

### Deliverable 4 — `coordination/VENDORING-MANIFEST.md` append (in-place update)

Append a section `## Verification log` with a single entry `### 2026-05-17 — R15 Phase 1 close walk verification` that:
- Records the method (header-presence grep) for the 2026-05-17 verification pass.
- For each of the 40 currently-on-disk vendored files (manifest minus the 1 REMOVED-AT-R02 row), records the header-presence verification outcome.
- Documents the carry-forward verdict for `tools/vendor-from-deploysignal.sh` idempotency (per R01 AC-8 close — script idempotency tested at R01 close; not re-run at R15 per anti-scope).

**WHY**: VENDORING-MANIFEST.md is the canonical vendoring ledger per v0.3 § 9. Verification results recorded there preserve the ledger as the single source of truth for the vendoring policy commitment. Recording in PHASE-1-CLOSE-WALK.md alone would split the policy ledger.

### Deliverable 5 — `engine/per-shard/runtime.ts` docblock update (in-place; in-passing)

Closes R10 MINOR-1 (per `coordination/reviews/REVIEWER-REPORT-R10.md` § 2 MINOR-1 + `coordination/NEXT-ROLE.md` § Operator gate items :148 "R10 MINOR-1 — `engine/per-shard/runtime.ts` module-level docblock (may close in-passing at R15)").

The current docblock (lines 1-13) describes the file as "SLICE 2b3" runtime composition only. Post-R10 the file ALSO exports `projectTierGatedOutputs` (SLICE 2b4), and post-R14 `updatePerShardResidual` + `projectTierGatedOutputs` accept an optional `baselineCell` arg producing `mean_delta` at warm-start tier. The header now under-describes the surface.

**WHY**: in-passing closure removes one operator-gate item from the morning-triage queue. Zero runtime impact (comment-only). Anti-scope explicitly authorizes "minor in-passing docblock fixes (e.g., R10 MINOR-1)" per NEXT-ROLE.md :63.

---

## 2. Component inventory

| Path | Status | Scope of change |
|---|---|---|
| `coordination/PHASE-1-CLOSE-WALK.md` | **CREATED** | NEW synthesis artifact (Deliverable 1 + Deliverable 3 content; § 4 + § 5 reference summaries) |
| `coordination/MEMORIAL.md` | **MODIFIED** | APPEND Phase 1 close Memorial-D state stamp section (Deliverable 2). All R01-R14 history preserved unchanged. |
| `coordination/VENDORING-MANIFEST.md` | **MODIFIED** | APPEND verification-log section (Deliverable 4). All R01 manifest rows preserved unchanged. |
| `engine/per-shard/runtime.ts` | **MODIFIED** | UPDATE file-level docblock at lines 1-13 (Deliverable 5). All other code unchanged. |
| `coordination/NEXT-ROLE.md` | **MODIFIED** | Coordination chore at close (per R06+ two-commit attestation pattern). |
| `coordination/specs/Q-R15-SPEC.md` | **CREATED** | This spec (Architect-emit). |
| `coordination/specs/Q-R15-SPEC-AUDIT.md` | **CREATED** | Audit sidecar (Architect-emit). |
| All other files | **UNCHANGED** | No production code, test, schema, or tool changes. No prior coordination artifact modifications. |

Files patched here are documentation surfaces (close-walk synthesis + memorial state + vendoring ledger + runtime docblock) plus one comment-only production change. No algorithmic changes. No new exports. No new test files.

---

## 3. Per-file pseudocode / section structure

### 3.1 `coordination/PHASE-1-CLOSE-WALK.md` section structure

The Implementer writes prose under each section header. The Architect prescribes the section structure + scope of each section's content. Word/length budgets are guidance, not hard binding; the Reviewer audits content presence + cross-reference accuracy.

```
# Phase 1 Close Walk — Tessera

_2026-05-17. HEAD at R15 GREEN: <SHA recorded at Implementer attestation>. Phase 1 closes 14 rounds (R01-R14); 4 SLICEs + 1 baseline-curation track + 1 carry-forwards bundle. **HARD STOP after R15 closes for operator review.**_

## 0. Header

- Date: 2026-05-17
- HEAD at close: <SHA-A from R15 attestation>
- Scope reference: SCOPING-MEMO-v0.3.md § 3 Phase 1 close-walk template
- Anti-scope reference: NEXT-ROLE.md :57-63 R15 anti-scope
- Round chain: R01 → R14 closed with 0 CRITICAL streak across R02-R14 (13 consecutive rounds)

## 1. SLICE-by-SLICE retrospective

For each of the six sub-sections below, the Implementer writes 3-6 paragraphs covering: scope summary, ACs satisfied (cite spec file + total), outstanding gaps (cite MINOR/OBS items from the reviewer report), cross-references (spec + reviewer-report + GREEN-commit SHA). Inherited-testimony empirical-verification reinforcement (R08; CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 ON empirical-premise-verification) applies: every load-bearing factual claim about an R01-R14 outcome must cite the specific reviewer-report file:line OR GREEN commit SHA.

### 1.1 SLICE 1 (R01) — engine vendoring + schema additions
Files in scope: coordination/specs/Q-R01-SPEC.md; coordination/reviews/REVIEWER-REPORT-R01.md (+ R01-pre-implementation report); VENDORING-MANIFEST.md row 1-41.

### 1.2 SLICE 2 (R02-R05 + R10 + R14 Item 1 mean_delta + R14 Item 2 PR-F5) — per-shard residual runtime
Files in scope: Q-R02-SPEC through Q-R05-SPEC + Q-R10-SPEC + Q-R14-SPEC; REVIEWER-REPORT-R02 through R05 + R10 + R14. PR-F5 measurement narrative cross-references OVERNIGHT-LOG-2026-05-17.md § Morning triage queue TQ-1 (the OBSERVED 1237.7× ratio is recorded here but the architectural revision is § 5 outstanding-gap territory, not § 1.2 SLICE-close narrative).

### 1.3 Baseline curation track (R06-R09) — Tessera-native FCP-1 sustained-event detector
Files in scope: Q-R06-SPEC through Q-R09-SPEC; REVIEWER-REPORT-R06 through R09; SCOPING-MEMO-BASELINE-CURATION-v0.3.md.

### 1.4 SLICE 3 (R11-R12) — hierarchical e-value primitives + fleet-merged detector surfaces
Files in scope: Q-R11-SPEC + Q-R12-SPEC; REVIEWER-REPORT-R11 + R12; PR-F1 evidence-matrix verification at R11.

### 1.5 SLICE 4 (R13) — e-BH FDR operator surface
Files in scope: Q-R13-SPEC; REVIEWER-REPORT-R13; PR-F2 evidence-matrix verification at R13.

### 1.6 SLICE 2 carry-forwards (R14 Item 3 compiled-config JSON loader) — runtime can load CompiledConfig from disk
Files in scope: Q-R14-SPEC; REVIEWER-REPORT-R14. Bound to NEXT-ROLE.md :22 framing "SLICE 2 carry-forwards (R14 compiled-artifact JSON loader)". R14 Items 1 + 2 are narrated in § 1.2 above (they belong to SLICE 2 proper, not the carry-forward bucket); avoid duplication in § 1.6.

## 2. Aggregate Phase 1 metrics

Compose from per-round data already in the reviewer reports. The Implementer assembles a single table (this section's body is the table + 2-3 paragraphs of narrative around it):

- Per-round AC-pass-count (e.g., R01: 8/8; R02: 6/6; ...) — total ACs cleared / total ACs prescribed across R01-R14.
- Per-round Reviewer findings tally (CRITICAL / MAJOR / MINOR / OBS).
- TDD-discipline streak: 12 consecutive Implementer-side + N Reviewer-side TDD attestations (cite exact streak count from R14 Memorial Updater entry).
- Anti-scope streak: 8 consecutive clean anti-scope rounds (R02-R10 + R14 per R14 Reviewer report § 4).
- 0-CRITICAL streak: 13 consecutive rounds R02-R14 (per R14 OVERNIGHT-LOG-2026-05-17 entry).
- Total regression test count at R14 close: 168/0 (per Reviewer-attested R14 baseline at NEXT-ROLE.md :117).

## 3. Memorial D state-stamp delta (pointer to MEMORIAL.md)

A short summary section (~1-2 paragraphs + one table row) of the Memorial-D state stamp evolution. **DOES NOT duplicate the full state-cell content from MEMORIAL.md.** Just summarizes the verdict + cites the canonical location.

Body content:
- Verdict statement (e.g., "Memorial-D state at Phase 1 close = 22V/8C; Tessera-Phase-1 introduced N methodology-class violations + M confirmations, zero Memorial-D-class violations; the structural fix at anchor PR #35 prevented MD-F6 sub-variant recurrence.").
- Pointer: "Full state-cell update + accretion tally at `coordination/MEMORIAL.md` § Phase 1 close — Memorial D state stamp (2026-05-17)."
- Streak observation (e.g., "32 reinforcements accreted across R02-R14 / 0 Memorial-D-class violations").

## 4. Vendoring verification result (pointer to VENDORING-MANIFEST.md)

A short summary section (~1 paragraph + 1 line table summary) of the verification pass. **DOES NOT duplicate the full per-file table from VENDORING-MANIFEST.md.** Just summarizes the verdict + cites the canonical location.

Body content:
- Summary: "<N>/40 vendored-at-pin files verified at SHA `5a72371`; <M> file flagged as REMOVED-AT-R02 (test/ville-preservation-per-profile.test.ts; per R01 MINOR-7 disposition)."
- Drift outcome: "No drift surfaced; re-pin deferred to operator gate (per anti-scope NEXT-ROLE.md :61)."
- Idempotency outcome: "tools/vendor-from-deploysignal.sh idempotency carry-forward from R01 AC-8 close; not re-run at R15."
- Pointer: "Full verification log at `coordination/VENDORING-MANIFEST.md` § Verification log § 2026-05-17."

## 5. Outstanding gaps (operator triage queue carry-forward)

Enumerates every outstanding item at Phase 1 close that requires operator decision OR future-round work. **Each item: description (~1-2 sentences); recommended-action (NOT acted on); source reference (file:line).** No item dispositioned in R15.

Source coverage required (Architect-prescribed minimum to satisfy AC-9):

- All items in coordination/NEXT-ROLE.md :140-156 § Operator gate items (10 items including TQ-1, TQ-2, OQ-1, OQ-R08-3, R09 MINOR-3, R10 MINOR-1 — note R10 MINOR-1 marked CLOSED-IN-R15-DELIVERABLE-5, R11 MINOR-1, R11 OBS-1/-2, R12 OQ-2/3/4, R13 MINOR + 4 OBS, R14 MINOR-1/2/3 + OBS-1/2/3).
- TQ-1 PR-F5 storage finding from OVERNIGHT-LOG-2026-05-17.md :13-35 (HIGH priority; v0.3 § 2.2 storage-prediction empirically wrong by ~800-1000×).
- TQ-2 anchor PR #38 from OVERNIGHT-LOG-2026-05-17.md :37-39 (LOW priority informational).
- v0.3 § 2.2 storage-prediction architectural-revision candidate (related to TQ-1; cross-reference SCOPING-MEMO-v0.3.md § 2.2 + § R-E1).

## 6. Phase 2 TAGGED-FUTURE activation criteria

For each major operator-gate item listed in NEXT-ROLE.md § Deliverable 3 (OQ-1/Q-JC1 calibrate.ts; OQ-R08-3 Phase 2 transient detector; Phase 2 SLICE 1 scope per v0.3 § 2.3; TQ-1 PR-F5), the Implementer writes a sub-section answering: **what would Phase 2 activation look like under each candidate operator disposition?**

For OQ-1 / Q-JC1 (calibrate.ts):
- Disposition (a) "vendor at Phase 1 SLICE 6+": Phase 2 activation requires a new R16-R17 vendoring round before Phase 2 SLICE 1.
- Disposition (b) "defer to Phase 2": calibrate.ts vendoring scheduled as Phase 2 SLICE 1 prerequisite.
- Per-disposition, document what changes in NEXT-ROLE.md routing + which spec/file references must precede the next round.

For OQ-R08-3 (Phase 2 transient detector):
- Disposition (a) "schedule early in Phase 2": Phase 2 SLICE 1 carries transient-detector scope.
- Disposition (b) "schedule late in Phase 2": deferred to Phase 2 SLICE 3-4.

For Phase 2 SLICE 1 scope per v0.3 § 2.3:
- Disposition Q-J4(i): single-rack uniform topology + injected PSU/cooling events.
- Disposition Q-J4(ii)/(iii): broader substrate at SLICE 1 entry.

For TQ-1 (PR-F5):
- Disposition (α) "architecture-revising" per OVERNIGHT-LOG entry :30-33.
- Disposition (β) "pitch-revising".
- Disposition (γ) "investigation-first".
- Disposition (δ) "defer to Phase 2".
- For each: what Phase 2 activation looks like; whether it's an "activation gate" (Phase 2 must wait) or "entry blocker" (Phase 2 can begin but PR-F5 must close before SLICE-N).

Section closes with the v0.3 § 7 close-framing options reference (a/b/c/d at SCOPING-MEMO-v0.3.md :492-497); Implementer cites the Architect-prediction band but does NOT pick.

## 7. Open for operator (R15 close-walk surfaced)

Any temptation surfaced during R15 close-walk authoring that should have been HALTed per the halt conditions in NEXT-ROLE.md :81-85. Each entry: (a) what was tempting; (b) why HALT prescribed; (c) what was deferred.

Architect-pre-predicted entries (the Implementer should expect these specifically; record any others surfaced):

- PR-F5 v0.3 § 2.2 architectural-revision temptation (cite NEXT-ROLE.md halt condition :82 + TQ-1 in OVERNIGHT-LOG :13-35).
- Memorial-D state-stamp accounting drift if Tessera-Phase-1 delta can't be tallied unambiguously (cite NEXT-ROLE.md halt condition :84).
- Vendored-at-pin SHA drift if grep verification surfaces drift (cite NEXT-ROLE.md halt condition :81; auto-re-pin forbidden).

If no temptation surfaced beyond the expected list: write "None beyond the architect-pre-predicted entries above."
```

**Cross-section consistency requirement (R02; 10th-application reinforcement):** every numbered section heading above corresponds to one numbered section header in the produced PHASE-1-CLOSE-WALK.md file (§ 0 through § 7); SLICE sub-sections use § 1.1 through § 1.6 numbering.

### 3.2 `coordination/MEMORIAL.md` append (Deliverable 2)

Append the following section at the END of MEMORIAL.md (after the existing R14 Memorial Updater section at line 1402+):

```
---

## Phase 1 close — Memorial D state stamp (2026-05-17)

### Reinforcement accretion summary (R02-R14)

By file (run by Implementer at GREEN; record OBSERVED `grep -c "^# REINFORCED" <file>` counts):
- CLAUDE-COMMON.md: <count>
- CLAUDE-ARCHITECT.md: <count>
- CLAUDE-IMPLEMENTER.md: <count>
- CLAUDE-REVIEWER.md: <count>
- CLAUDE-MEMORIAL.md: <count>
- Total: <sum>

By round (Implementer enumerates from MEMORIAL.md round sections; cite each violation by the VIOLATION: <class> | <description> | <round> | <role> line):
- R02: <count violations> + <count confirmations>
- R03: <count violations> + <count confirmations>
- (and so on through R14)
- Aggregate: <N> violations / <M> confirmations across R02-R14

### Classification — Memorial-D class vs methodology class

Memorial-D class = MD-F6 sub-variant OR any other architectural-layer-coverage violation matching the 4-factor prior weighting framing.
Methodology class = pre-emit-grilling, citation-accuracy, TDD-discipline, halt-discipline, right-reasons-audit, anti-scope, attestation-verification, cold-review-boundary, role-boundary, context-isolation, MEMORIAL-UPDATER-process.

For each violation in the by-round list above, Implementer assigns Memorial-D OR methodology class. Architect-pre-prediction: Memorial-D class = 0 (the structural fix at anchor PR #35 + the mandatory § Existing architectural surface section in spec template prevented MD-F6 recurrence across R01-R14).

### Phase 1 close Memorial-D state cell

Inherited pre-Tessera state (per § Inherited active Memorials :13): 22V / 8C.
Tessera-Phase-1 Memorial-D class delta (from classification above): <X>V / <Y>C.
Phase 1 close Memorial-D state: <22 + X>V / <8 + Y>C.

### Lineage table extension

Append the following row to § Tessera-specific Memorial state lineage at MEMORIAL.md:22-34:

| # | Event | Memorial D state |
|---|---|---|
| 3 | Phase 1 close walk (R15) at 2026-05-17; R02-R14 produced <N> methodology-class violations + <M> methodology-class confirmations + <X> Memorial-D class violations + <Y> Memorial-D class confirmations | **<22+X>V / <8+Y>C** |

### Discipline-archive observations (R15-surfaced)

Aggregate observations from the R01-R14 reinforcement-class distribution that are candidate cross-project memorial entries (per inherited § Cross-project memorial cross-references convention). Implementer enumerates 3-5 observations supported by the by-round + by-class data above. Examples (the Implementer derives the actual list from the data, not from this hint):
- "Pre-emit-grilling sub-class dominance" if grilling violations are >50% of methodology class.
- "Citation-accuracy sub-class compounding" if citation-class violations recur across rounds.
- "Streak preservation" if 0-CRITICAL streak holds for 13+ consecutive rounds.
```

### 3.3 `coordination/VENDORING-MANIFEST.md` append (Deliverable 4)

Append at the END of VENDORING-MANIFEST.md (after manifest table row 48):

```
---

## Verification log

Per `coordination/SCOPING-MEMO-v0.3.md` § 9 Re-pinning policy: "At every Tessera close-walk (Phase 1 close + Phase 2 close), architect verifies all per-file vendored headers against current DeploySignal main."

### 2026-05-17 — R15 Phase 1 close walk verification

**Method:** `grep -l "VENDORED FROM DeploySignal main@5a72371" <file>` per manifest row.

**Scope:** 41 manifest rows; 40 files currently on disk (1 row REMOVED-AT-R02 per disposition at manifest row 45).

**Result:**

| Target | Header present at SHA `5a72371` | Notes |
|---|---|---|
(Implementer fills exactly 41 rows; one row per manifest entry. For each row: header-present = YES if grep returns 1; NO if grep returns 0. The REMOVED-AT-R02 row records header-present = N/A with note "removed per R01 MINOR-7 disposition.")

**Aggregate:**
- Headers verified at SHA `5a72371`: <N>/40 files on-disk.
- REMOVED-AT-R02 (no on-disk file): 1 (test/ville-preservation-per-profile.test.ts).
- Drift surfaced: <yes/no>.
- Re-pin disposition: deferred to operator gate (per R15 anti-scope at NEXT-ROLE.md :61; auto-re-pin forbidden).

**Idempotency of `tools/vendor-from-deploysignal.sh`:** carry-forward from R01 AC-8 close (idempotency tested at R01 close per Q-R01-SPEC; not re-run at R15 because re-running requires the DeploySignal sibling repository present at the expected path, which is outside R15 anti-scope per NEXT-ROLE.md :63 "no new production code").
```

If header verification surfaces ANY drift (one or more files missing the header OR carrying a different SHA), the Implementer HALTs per NEXT-ROLE.md halt condition :81 — does NOT silently re-pin; writes `coordination/diagnostics/DIAGNOSTIC-R15-vendoring-drift.md`.

### 3.4 `engine/per-shard/runtime.ts` docblock update (Deliverable 5)

Current docblock at runtime.ts:1-13:

```
// engine/per-shard/runtime.ts — Tessera SLICE 2b3: per-shard runtime composition.
//
// Composes the R03 state machine (observeSample) and R04 Welford accumulator
// (updateWelford) into a single pure-function update that threads accumulator
// state through PerShardResidual.welford_state across samples.
//
// Pure-function discipline (R03/R04 inherited): state in, state out, no mutation.
// The composition returns a NEW PerShardResidual per update; both input arguments
// are left unchanged. Internal calls to observeSample and updateWelford each
// preserve their own pure-function contracts.
//
// Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared
// npm package at Tessera Phase 2 close.
```

The Implementer replaces this with a docblock that adds (a) the SLICE 2b4 R10 emission contract and (b) the SLICE 2 R14 mean_delta carry-forward to the file-level narrative. **The Architect prescribes the structural requirements; the Implementer composes the exact prose subject to the grep-binding AC below.** The docblock retains the existing R03/R04/SLICE 2b3 composition narrative (do not delete prior content); appends new paragraphs describing R10 + R14 contributions.

**Structural requirements (load-bearing on Reviewer audit):**

1. The docblock retains the existing "Composes the R03 state machine (observeSample) and R04 Welford accumulator (updateWelford)…" narrative.
2. The docblock retains the existing "Pure-function discipline" narrative.
3. The docblock retains the existing "Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared npm package at Tessera Phase 2 close." narrative.
4. The docblock adds a paragraph naming `projectTierGatedOutputs` (R10 SLICE 2b4 emission contract; strict-tier mean_vector + covariance emission via welfordMean + welfordCovariance; sparse-encoding inverse-convention enforcement per R10 spec).
5. The docblock adds a paragraph naming the R14 SLICE 2 carry-forward (`updatePerShardResidual` and `projectTierGatedOutputs` accept an optional `baselineCell: BaselineCellEntry | undefined` argument; warm-start tier emits `mean_delta = welfordMean(welford_state) − baselineCell.family_C.mean_vector` when baselineCell + matching-length mean_vector are present).

**Binding ACs (per § 4 below):** AC-12 + AC-13 below assert that the post-update docblock contains specific anchor strings.

---

## 4. Acceptance criteria

Each AC is in "Given X, when Y, then Z" form; binding command + expected output specified. PASS = the expected output is observed at GREEN HEAD (or HEAD-with-runtime-docblock-fix-only); FAIL = expected output is not observed.

**Phase 1 close-walk artifact (Deliverable 1):**

- **AC-1**: Given the R15 GREEN state, when `git ls-files coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns exactly 1 line (the file exists and is tracked).
- **AC-2**: Given the R15 GREEN state, when `grep -c "^## " coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns ≥ 8 (matching at minimum sections § 0 through § 7).
- **AC-3**: Given the R15 GREEN state, when `grep -c "^### 1\." coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns exactly 6 (one sub-section per § 1.1 through § 1.6).
- **AC-4**: Given the R15 GREEN state, when `grep -c "REVIEWER-REPORT-R" coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns ≥ 14 (each of R01-R14 reviewer reports cross-referenced at least once).
- **AC-5**: Given the R15 GREEN state, when `grep -c "Q-R[0-9][0-9]-SPEC" coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns ≥ 14 (each of R01-R14 specs cross-referenced at least once).

**Memorial state stamp (Deliverable 2):**

- **AC-6**: Given the R15 GREEN state, when `grep -c "^## Phase 1 close — Memorial D state stamp" coordination/MEMORIAL.md` runs, then it returns exactly 1.
- **AC-7**: Given the R15 GREEN state, when the appended section is read, then it contains: (a) "Reinforcement accretion summary" subsection, (b) "Classification — Memorial-D class vs methodology class" subsection, (c) "Phase 1 close Memorial-D state cell" subsection, (d) "Lineage table extension" subsection. Verified by `grep -c "^### " coordination/MEMORIAL.md` returning ≥ 4 more than pre-R15 baseline (Implementer records pre-R15 baseline at attestation-block prep).
- **AC-8**: Given the R15 GREEN state, when the Memorial-D state cell in the appended section is read, then it states an explicit numeric state of the form `<N>V / <M>C` where N ≥ 22 and M ≥ 8 (Architect-pre-prediction: N = 22, M = 8; if Implementer-derived delta is non-zero, this AC PASSes with the new derived state AND triggers a HALT per § 6 halt condition (a) below).

**Phase 2 TAGGED-FUTURE activation criteria (Deliverable 3):**

- **AC-9**: Given the R15 GREEN state, when `grep -c "^## 5\. Outstanding gaps\|^## 6\. Phase 2 TAGGED-FUTURE" coordination/PHASE-1-CLOSE-WALK.md` runs, then it returns exactly 2.
- **AC-10**: Given the R15 GREEN state, when the § 5 Outstanding gaps section is read, then it enumerates at minimum these named items (one paragraph per item; verifiable via `grep -c "TQ-1\|TQ-2\|OQ-1\|OQ-R08-3\|R09 MINOR\|R11 MINOR\|R11 OBS\|R12 OQ\|R13 MINOR\|R14 MINOR" coordination/PHASE-1-CLOSE-WALK.md` returning ≥ 10).
- **AC-11**: Given the R15 GREEN state, when the § 6 Phase 2 TAGGED-FUTURE section is read, then it contains 4 sub-sections, one per operator-gate item enumerated in NEXT-ROLE.md § Deliverable 3 (OQ-1/Q-JC1; OQ-R08-3; Phase 2 SLICE 1 scope; TQ-1 PR-F5). Verified by `grep -cE "^### (OQ-1|OQ-R08-3|Phase 2 SLICE 1|TQ-1)" coordination/PHASE-1-CLOSE-WALK.md` returning ≥ 4. **No item dispositioned**: verified by `grep -c "ARCHITECT-PICK\|DISPOSITIONED-AT-R15" coordination/PHASE-1-CLOSE-WALK.md` returning 0.

**Vendoring verification result (Deliverable 4):**

- **AC-12**: Given the R15 GREEN state, when `grep -c "^## Verification log" coordination/VENDORING-MANIFEST.md` runs, then it returns exactly 1.
- **AC-13**: Given the R15 GREEN state, when `grep -c "^### 2026-05-17 — R15 Phase 1 close walk verification" coordination/VENDORING-MANIFEST.md` runs, then it returns exactly 1.
- **AC-14**: Given the R15 GREEN state, when the Implementer runs `grep -l "VENDORED FROM DeploySignal main@5a72371" <each file in manifest>` and tallies the count, then the count equals 40 (40 files on-disk; 1 REMOVED-AT-R02). The per-file outcome appears in the appended verification-log table.

**Runtime.ts docblock fix (Deliverable 5):**

- **AC-15**: Given the R15 GREEN state, when `grep -c "projectTierGatedOutputs\|SLICE 2b4" engine/per-shard/runtime.ts` is restricted to the file-level docblock (lines 1-30; Implementer verifies via `head -30 engine/per-shard/runtime.ts | grep -c "projectTierGatedOutputs\|SLICE 2b4"`), then it returns ≥ 1 (R10 SLICE 2b4 contribution named in docblock).
- **AC-16**: Given the R15 GREEN state, when `head -30 engine/per-shard/runtime.ts | grep -c "mean_delta\|baselineCell"` runs, then it returns ≥ 1 (R14 SLICE 2 carry-forward named in docblock).
- **AC-17**: Given the R15 GREEN state, when `head -30 engine/per-shard/runtime.ts | grep -c "Tessera-original code"` runs, then it returns 1 (the existing "Tessera-original code (NOT vendored from DeploySignal). Extracts to the shared npm package at Tessera Phase 2 close." sentinel is preserved).

**Aggregate regression (no-regression guarantee):**

- **AC-18**: Given the R15 GREEN state, when `npm run typecheck` runs, then it exits 0.
- **AC-19**: Given the R15 GREEN state, when `npm test` runs, then it reports 168 pass / 0 fail. **Note**: this asserts that the 17 pre-R15 test files preserve their R14-baseline counts (3 + 1 + 5 + 6 + 13 + 11 + 13 + 13 + 23 + 11 + 18 + 16 + 14 + 6 + 7 + 3 + 5 = 168 across q01-no-at-pin-deltas + q01-schema-additions + q01-vendoring-coverage + q02-schema-extension + q03-warm-start-runtime + q04-welford-stats + q05-per-shard-runtime + q06-baseline-pre-pass + q07-fleet-correlated + q10-per-shard-emission + q11-hierarchical-e-value-combination + q12-fleet-merged-detector-surfaces + q13-e-bh-fdr + q14-compiled-config-loader + q14-mean-delta + q14-pr-f5-storage + betting-e-process-class-dispatch). Per-file counts reported in NEXT-ROLE.md attestation block.

**Anti-scope verification (per § 5 below):**

- **AC-20**: Given the R15 GREEN state, when `git diff c8da715..HEAD --name-only` runs (where `c8da715` is the R14 attestation HEAD per OVERNIGHT-LOG-2026-05-17.md :173), then the result is a subset of: `coordination/specs/Q-R15-SPEC.md`, `coordination/specs/Q-R15-SPEC-AUDIT.md`, `coordination/PHASE-1-CLOSE-WALK.md`, `coordination/MEMORIAL.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/NEXT-ROLE.md`, `engine/per-shard/runtime.ts`. (Plus any `engine/per-shard/runtime.js` artifact produced by tsc if the typecheck step emits it; that is a build artifact not a hand-edit and acceptable per R02-R14 precedent.) Any additional path triggers a HALT per § 6 halt condition (c) below.

---

## 5. Anti-scope (R15-SAS clauses)

R15 explicitly does NOT modify or create:

- **R15-SAS-1** — No engine code change other than `engine/per-shard/runtime.ts` docblock (lines 1-30). Verified by `git diff c8da715..HEAD -- engine/ | grep -v "^diff --git\|^index \|^@@ \|^[+-]\{3\}\|^[+-]//"` returning only comment-line changes within the docblock range.
- **R15-SAS-2** — No `engine/per-shard/runtime.ts` change BEYOND the docblock. Verified by inspecting that the diff for runtime.ts is bounded to lines 1-30 (the docblock region; Implementer adjusts the range if final docblock extends further but no executable code line changes).
- **R15-SAS-3** — No test file change. `git diff c8da715..HEAD -- test/` empty.
- **R15-SAS-4** — No tools/ change. `git diff c8da715..HEAD -- tools/` empty.
- **R15-SAS-5** — No prior-round spec change. `git diff c8da715..HEAD -- coordination/specs/Q-R01*.md coordination/specs/Q-R02*.md ... coordination/specs/Q-R14*.md` empty for all 28 prior-round spec/audit files.
- **R15-SAS-6** — No new round-spec file other than Q-R15-SPEC.md + Q-R15-SPEC-AUDIT.md.
- **R15-SAS-7** — No PRD or SCOPING-MEMO modification. `git diff c8da715..HEAD -- coordination/PRD.md coordination/SCOPING-MEMO-v0.3.md coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` empty.
- **R15-SAS-8** — No prior-round Reviewer report modification. `git diff c8da715..HEAD -- coordination/reviews/` empty.
- **R15-SAS-9** — No OVERNIGHT-LOG modification (operator-owned). `git diff c8da715..HEAD -- coordination/OVERNIGHT-LOG-2026-05-17.md` empty.
- **R15-SAS-10** — No operator-gate item dispositioned. PHASE-1-CLOSE-WALK.md § 6 documents Phase 2 activation under each candidate disposition but PICKS NONE (verified by AC-11 grep for "ARCHITECT-PICK\|DISPOSITIONED-AT-R15" returning 0).
- **R15-SAS-11** — No PR-F5 architectural revision in v0.3 § 2.2 storage prediction. R15 documents TQ-1 in PHASE-1-CLOSE-WALK.md § 5 outstanding gaps + § 7 open-for-operator; does NOT amend SCOPING-MEMO-v0.3.md.
- **R15-SAS-12** — No vendored file SHA re-pin. Even if drift is surfaced, the Implementer HALTs per § 6 halt condition (b); does NOT silently re-pin.
- **R15-SAS-13** — No `tools/calibrate.ts` vendoring (OQ-1 / Q-JC1 stays operator-gated; documented in PHASE-1-CLOSE-WALK.md § 6 only).
- **R15-SAS-14** — No new test file. New q15 test file NOT created (documentation-only round per NEXT-ROLE.md :119).
- **R15-SAS-15** — No anchor PR #38 action (operator-owned per OVERNIGHT-LOG :37-39 + overnight authority memory).
- **R15-SAS-16** — No DeploySignal-side or cross-project change. R15 is Tessera-Phase-1-close scope only.

---

## 6. Halt conditions (forwarded to Implementer)

If any of the following surface during R15 Implementer execution, the Implementer HALTs + writes `coordination/diagnostics/DIAGNOSTIC-R15-<topic>.md` + sets NEXT-ROLE.md STATUS to ESCALATE. The Implementer does NOT attempt to resolve halt conditions unilaterally.

**(a) Memorial-D state-stamp accounting drift.** If the Tessera-Phase-1 reinforcement-class tally cannot be unambiguously classified into Memorial-D class vs methodology class — e.g., a R02-R14 violation that doesn't fit either bucket cleanly, or attribution between buckets is ambiguous for one or more entries — the Implementer HALTs (per NEXT-ROLE.md :84). Architect-pre-prediction: Memorial-D class = 0; if Implementer-derived classification shows ≥1 Memorial-D class violation, this is empirically valid and the Implementer documents it in the appended Memorial section (AC-8 still passes with the new derived state) AND records a DIAGNOSTIC so the architect-pre-prediction discrepancy is flagged for operator visibility.

**(b) Vendored-at-pin SHA drift surfaces.** If `grep -l "VENDORED FROM DeploySignal main@5a72371" <file>` returns 0 for any of the 40 on-disk vendored files (per VENDORING-MANIFEST.md row excluding REMOVED-AT-R02), OR the header is present but cites a different SHA, the Implementer HALTs (per NEXT-ROLE.md :81). Does NOT silently re-pin (re-pin is operator-gated per anti-scope R15-SAS-12).

**(c) Anti-scope drift surfaces.** If `git diff c8da715..HEAD --name-only` produces any path outside the AC-20 enumerated set, the Implementer HALTs (per anti-scope R15-SAS-1 through R15-SAS-16). Does NOT silently revert (operator-gate the drift instead).

**(d) PR-F5 architectural-revision temptation.** If the Implementer is tempted during R15 close-walk authoring to amend v0.3 § 2.2 storage prediction or revise the architectural framing, the Implementer HALTs the amendment (per NEXT-ROLE.md :82-83) AND records the temptation in PHASE-1-CLOSE-WALK.md § 7 "Open for operator". The amendment itself is anti-scope (R15-SAS-11); only the documentation of the temptation lands in R15.

**(e) Phase 2 activation criteria require operator input.** If the Implementer determines that Phase 2 activation under any operator-gate disposition cannot be documented without making the disposition pick (i.e., the operator-disposition is the precondition for the activation-scenario description), the Implementer HALTs (per NEXT-ROLE.md :85). Does NOT pick the disposition.

**(f) OPERATOR-PROTECTED ITEMS.** All morning-triage-queue items + parked operator-gate items remain operator-gate; R15 documents context but does NOT decide.

---

## 7. Open questions

**None — all resolved.** Architect decisions:

- **Approach to close-walk artifact location**: ONE new file `coordination/PHASE-1-CLOSE-WALK.md` (synthesis surface) + 2 in-place ledger updates (`MEMORIAL.md` Phase-1-close section append; `VENDORING-MANIFEST.md` verification-log section append). Rationale: each piece of data lives in its canonical location; synthesis artifact references canonical ledgers; matches v0.3 § 3 close-walk template + § 9 vendoring policy. See `Q-R15-SPEC-AUDIT.md` § Brainstorm + § Decision rationale for the three-approach analysis.
- **R10 MINOR-1 docblock fix**: INCLUDED as Deliverable 5 with binding ACs (AC-15 + AC-16 + AC-17). Rationale: NEXT-ROLE.md :148 explicitly authorizes "(may close in-passing at R15)"; closing removes one operator-gate item from the morning-triage queue; the fix is comment-only with zero runtime impact.
- **New q15 test file**: NOT created. Documentation-only round per NEXT-ROLE.md :119. Docblock-fix verification binds via head-of-file grep at attestation time (AC-15 + AC-16 + AC-17), not via a new TypeScript test. No regression risk because the change is comment-only.
- **TDD topology**: this round has no RED→GREEN cycle in the traditional sense (no new test file; docblock fix is comment-only). The "GREEN state" referenced in ACs is the runtime.ts post-docblock-fix HEAD plus the coordination artifacts. Per R14 Reviewer report § 4 (TDD discipline) the bundled-non-test-change-in-GREEN tactic is precedented and acceptable.
- **Memorial-D class classification rubric**: Architect-pre-prediction = 0 Tessera-Phase-1 Memorial-D class violations (the structural fix at anchor PR #35 + mandatory § Existing architectural surface section in spec template prevented MD-F6 recurrence). Implementer empirically validates by enumerating each R02-R14 violation; classification rubric specified in § 3.2 above. Empirical non-zero result is acceptable + HALTs to flag the architect-pre-prediction discrepancy (per halt condition (a)).
- **Vendoring verification method**: header-presence grep (`grep -l "VENDORED FROM DeploySignal main@5a72371" <file>`) per the v0.3 § 9 vendored-header convention. NOT content-hash verification (would require DeploySignal repo at SHA `5a72371` present locally, which is outside Tessera's working set). NOT script re-run (anti-scope; idempotency carry-forward from R01 AC-8 close).
- **Brainstorm re-evaluation**: None. R15 is the first close-walk round; no prior brainstorm to re-evaluate.

---

## 8. Coordination chore sequence (R14 final revision; same as R06-R14)

Per `coordination/NEXT-ROLE.md` § Coordination chore sequence at :87-95:

1. Run all binding commands at GREEN; record OBSERVED counts per AC-18, AC-19, AC-14 verification table.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts + the docblock fix to runtime.ts.
4. `git commit -m "chore(R15): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R15): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

Note: at step 3, the runtime.ts docblock fix is included in the same commit as the coordination artifacts (since the docblock fix has no test binding it; no separate RED state). Reviewer's step 7 check `git diff SHA-A HEAD -- engine/` will be empty (the docblock fix landed AT SHA-A, not after it).

If the Implementer prefers a separate GREEN commit for the runtime.ts docblock fix (R02-R14 commit-topology convention), that is also acceptable: GREEN commit (runtime.ts docblock fix only) → SHA-A (coordination artifacts) → SHA-B (attestation). Step 7 still holds.

---

## 9. Implementer note

- **Read first**: NEXT-ROLE.md § R15 round scope (lines 5-156); SCOPING-MEMO-v0.3.md § 3 + § 9; OVERNIGHT-LOG-2026-05-17.md § Morning triage queue; this spec in full + Q-R15-SPEC-AUDIT.md.
- **Read for each SLICE-walk sub-section**: the spec + Q-RXX-SPEC-AUDIT.md (if present) + reviewer report for that SLICE. Memorial.md round-section for each round. Do NOT summarize from memory — inherited-testimony empirical-verification reinforcement applies.
- **Halt cleanly**: any condition in § 6 above → write `coordination/diagnostics/DIAGNOSTIC-R15-<topic>.md` + set NEXT-ROLE.md STATUS to ESCALATE. Do NOT proceed past a halt condition.
- **Cross-section consistency at PHASE-1-CLOSE-WALK.md authoring time**: per CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 cross-section-consistency-pass (10th application this round), verify every numbered section heading matches the prescribed structure in § 3.1.
- **No round-budget overflow**: R15 is the FINAL round of the overnight chain per overnight authority memory. Hard stop after R15 closes regardless of outcome.

---

## 10. Routing

```
STATUS: READY
NEXT-ROLE: IMPLEMENTER
Inputs:
  - coordination/specs/Q-R15-SPEC.md
  - coordination/specs/Q-R15-SPEC-AUDIT.md
  - coordination/NEXT-ROLE.md (R15 round scope)
  - coordination/SCOPING-MEMO-v0.3.md (§ 3 + § 9)
  - coordination/OVERNIGHT-LOG-2026-05-17.md (morning triage queue)
  - coordination/MEMORIAL.md (§ Inherited active Memorials + § Tessera-specific Memorial state lineage)
  - coordination/VENDORING-MANIFEST.md (41 manifest rows; 40 on-disk + 1 REMOVED-AT-R02)
```
