# Q-R08-SPEC-AUDIT — Architect audit sidecar for Q-R08 (scope-narrowing + AC redesign + MINOR closures)

_From: Architect (R08 pipeline run)._
_To: Reviewer (cold-review boundary — Reviewer MAY consult this sidecar at their discretion per CLAUDE-REVIEWER.md; sidecar is NOT consulted by Implementer per cold-start discipline)._
_Date: 2026-05-16._
_Companion spec: `coordination/specs/Q-R08-SPEC.md`._

---

## Brainstorm — 6 approaches considered

### Approach A: minimal-touch redesign — preserve AC-12/13 as FPR-under-perturbation, add AC-27/28 with theory-derived bounds, amend memo via v0.3 + append pre-disposition — **PICKED**

**Strengths:**
- Matches operator-set scope exactly (NEXT-ROLE.md (B)+(D) disposition).
- Reuses R07's PRNG / simulator helpers in q07.test.ts; only adds simulateH1Sustained.
- Theory-derived bounds for new ACs sidestep the R07 MAJOR-2 OBSERVED-binding self-confirming pattern.
- AC-12/13 redesigned as scope-claim binding tests are sound under the v0.3 narrowing: they catch future scope violations (if algorithm starts firing on transient events).
- Zero modification to production algorithm — preserves Q-JC4 framework per operator-set HALT.
- Memo version bump (v0.3) preserves v0.2 as historical record (matches v0.1 → v0.2 precedent).
- Includes carry-forward MINOR closures (R06 MINOR-1, R07 MINOR-2/3/4) — all are 1-2 line edits with zero behavior risk.

**Weaknesses:**
- Theory-derived bounds at AC-27/AC-28 carry architect-prediction risk. If mulberry32 produces tail-anomalous samples on the new seeds, firedCount could fall below the bound and the Implementer would be forced into the right-reasons-check-protected tightening path (Implementer note 4).
- AC-23 binding value-update (21 → 23) without renumbering is a small auditability concern (Reviewer must check the value change matches the spec's declared count).

**Hidden assumptions:**
- mulberry32 variance-bound assumptions for AC-27/AC-28 (documented at § Grilling unstated assumptions 1+2).
- v0.3 scope claim is operator-confirmed and is the canonical SLICE 5 scope (documented at § Grilling unstated assumption 3).

**Risks:**
- AC-27 bound could fail at GREEN if PRNG tail-anomalous → Implementer applies R06 OBS-1 tightening protocol with right-reasons check → not a halt, but a spec-prediction-error class.
- AC-28 bound has much more margin so risk is very low.

### Approach B: memo amendment as v0.2 inline append (no v0.3 file) — **REJECTED**

**Strengths:**
- Less file proliferation; single canonical memo path.
- Easier to grep for "what is the current FCP-1 scope claim?" — only one file to inspect.

**Weaknesses:**
- Amendments to v0.2 mix R07-emit-time content with R08 amendments — harder to grep for "what was the v0.2 scope claim at R07 close?"
- Violates the v0.1 → v0.2 precedent (v0.2 was a NEW FILE bumping from v0.1, not an inline append).
- Future re-narrowings would compound the in-file amendment problem.

**Hidden assumption:** that "single canonical memo path" is more valuable than "version history preservation".

**Risk:** future architects must read the full v0.2 (~260 lines) plus the inline amendments to understand the current scope claim. With v0.3-as-new-file, future architects read v0.3 directly.

### Approach C: drop AC-12/13 entirely; add AC-27/AC-28 only — **REJECTED**

**Strengths:**
- Maximum simplicity; no false-positive risk on the FPR-under-perturbation interpretation.
- Removes the lingering OBSERVED-binding pattern altogether.

**Weaknesses:**
- Operator-set scope explicitly preserves AC-12/13 single-window injection tests, REPURPOSED as FPR-under-perturbation Type-I error checks (Option B per NEXT-ROLE.md). Dropping them violates the operator-set scope.
- Loses a meaningful Type-I error check (transient-perturbation FPR is a real property to test).

**Why rejected:** operator-set Option B explicitly mandates preserving AC-12/13.

### Approach D: modify AC-12/13 to use sustained injection (not preserve as FPR), and also add AC-27/28 — **REJECTED**

**Strengths:**
- Cleanest "all power tests use sustained injection" surface.
- Removes the AC-12/13 self-confirming concern by replacing the bindings entirely.

**Weaknesses:**
- This is operator-rejected Option A per Reviewer's watch list (REVIEWER-REPORT-R07.md MAJOR-1 disposition options).
- Operator explicitly chose Option B over Option A.
- Loses the Type-I error check at single-window perturbation (no test bounds "transient should not fire").

**Why rejected:** operator selected Option B, not Option A.

### Approach E: keep AC-12/13 as-is (still OBSERVED-binding firedCount===0), add new ACs only — **REJECTED**

**Strengths:**
- Zero spec changes to existing tests; minimal Implementer effort on the existing q07 file.
- The "OBSERVED===0" assertion is technically a valid binding at the current production state.

**Weaknesses:**
- Doesn't fix R07 MAJOR-2 (AC-12/13 remain structurally self-confirming).
- Future implementation FIX matching architect prediction would fail AC-12/AC-13 — preserves the inverse-stability anti-pattern.
- Operator-set scope explicitly requires AC-12/13 redesign.

**Why rejected:** doesn't close MAJOR-2; violates operator scope.

### Approach F: full algorithmic redesign (Option C from R07 Reviewer's watch list) — **REJECTED (operator-gated)**

**Strengths:**
- Would give FCP-1 buildup-independent power against transient events (a GROW mixture or static-λ formulation has different statistical properties).
- Addresses the "single-window transient" use case head-on.

**Weaknesses:**
- Requires Q-JC4 re-disposition (operator-gate per NEXT-ROLE.md HALT condition 1).
- Would fire a new PR-F10 pair-review-novel-literature trigger (Memorial D event).
- Substantial scope expansion; would consume the third autonomous-round budget without empirical justification (real GPU-cluster traces have not yet shown demand for transient-fleet-event detection).

**Why rejected:** explicit operator-set HALT condition. R08-SAS-2 fences this approach.

---

## Tier-rubric verdict

R08 launched at `--tier full` per `coordination/NEXT-ROLE.md` operator-set routing:
> `--tier full` per A3 (resolving open question — the R07 MAJORs) + A5 (critical NFR ties — FCP-1's scope claim).

**A-factor evaluation (from CLAUDE-COMMON.md tier rubric):**
- **A1 (new external dependency)**: NO — R08 adds zero new npm deps; zero new vendoring.
- **A2 (new architectural pattern)**: NO — the (D) scope narrowing is a SCOPE CLAIM change, not a new pattern. Q-JC4 framework is preserved.
- **A3 (unresolved open question this round must resolve)**: YES — R07 MAJOR-1 (PR-F8 empirical-power gap) + MAJOR-2 (self-confirming tests) are the open questions R08 closes. Operator-confirmed disposition (B)+(D).
- **A4 (novel data model)**: NO.
- **A5 (critical NFR ties)**: YES — FCP-1's scope claim is the critical NFR. The narrowing aligns the documented scope with the algorithm's empirically-demonstrated capability.
- **A6 (large blast radius)**: NO — R08 modifies 3 files + creates 1; zero production-code modification; zero pre-R08 test modification beyond q07.
- **A7 (first-time territory)**: PARTIAL — first Tessera scope-narrowing round; first Tessera round modifying a spec amendment via memo version bump.

Verdict: full-tier (operator-set) per A3 + A5. Confirmed by architect-side audit.

---

## Decision rationale — D-R08-1 through D-R08-14

### D-R08-1 — Memo amendment via v0.3 new file (vs inline edit to v0.2)

**Picked**: v0.3 new file. v0.2 preserved verbatim.

**Rationale**: matches v0.1 → v0.2 precedent (v0.2 was the K%-threshold correction; v0.1 was not edited in place). Preserves historical record. Future architects can grep "what was the scope claim at R07 close?" → read v0.2 unmodified.

**Rejected alternatives**: inline append to v0.2 (Approach B); inline edit of v0.2 § 1 in place (would erase v0.2's wording entirely).

### D-R08-2 — Pre-disposition append (vs in-place edit of Q-JC4 row)

**Picked**: APPEND a new section to the existing pre-disposition file.

**Rationale**: the Q-JC4 framework is PRESERVED (R08-SAS-2); the narrowing is a scope-claim addendum, not a re-disposition. In-place edit of the Q-JC4 row would suggest the framework changed — which would be misleading.

**Rejected alternative**: modify the Q-JC4 row in place to add "(narrowed at R08)" inline annotation. Rejected because the narrowing is at the scope-claim LEVEL, not the framework LEVEL.

### D-R08-3 + D-R08-4 — AC-12/AC-13 redesigned bound (`<= 1` vs `=== 0`)

**Picked**: `<= 1`.

**Rationale**: provides 1-trial margin against minor PRNG-platform-drift variation while preserving Type-I error bound (≤ 1 fire of 30 ≤ 3.3% empirical FPR, well above Ville's 10⁻³ but still very low). Reviewer's MAJOR-2 noted strict-equality is brittle. Loosening to `<= 1` is the methodologically-sound fix.

**Rejected alternative**: `=== 0` (strict). Brittle to platform variance; would re-introduce the same fragility class Reviewer flagged.

### D-R08-5 — simulateH1Sustained helper signature `(seed, W, N, p_base, w_inject_start, w_inject_end, p_alt)`

**Picked**: range-bounded `[w_inject_start, w_inject_end)` parameters.

**Rationale**: cleaner mental model than `(injection_length, injection_offset)` — matches AC-8's `[K, W)` style and the standard interval-notation convention. Local helper kept in q07 file (consistent with R07-SAS-13 carry-forward).

**Rejected alternatives**: pass `injection_length` only (assumes injection starts at K which the existing AC-8 pattern implies but is implicit); pass an array of injection-window indices (more flexible but unnecessary for AC-27/AC-28 use cases).

### D-R08-6 + D-R08-7 — AC-27 fixture (W=60, K=10, L=50, p_alt=0.5; bound `>= 25`) + AC-28 fixture (W=210, K=10, L=200, p_alt=0.1; bound `>= 15`)

**Picked**: those specific parameters.

**Rationale**:
- AC-27 W=60 / L=50: sustained injection over the full test window range; 49 saturated windows past first-test-window martingale; ~17-window margin past threshold-crossing at w≈43 (expected); firedCount expected 28-30 of 30. Bound `>= 25` provides 3-5 trial margin.
- AC-28 W=210 / L=200: weak-injection requires many more accumulated windows to cross threshold (≈188 vs ≈32 for strong); L=200 gives ~7-window margin; firedCount expected ~28/30. Bound `>= 15` provides ~13 trial margin (very conservative; weak signal has higher PRNG sensitivity).
- Both bounds NOT OBSERVED — derived from hand-trace at § Per-file pseudocode Implementer notes 5 + 6.

**Rejected alternatives**:
- W=60 / L=30: insufficient margin for strong injection (only crosses threshold near end of test window; PRNG tail could push some trials past W).
- W=210 / L=50 (weak): insufficient accumulation; firedCount would be ~0 (re-introduces the R07 MAJOR-1 problem class for weak).
- OBSERVED-binding for either bound: R08-SAS-3 fences; would re-introduce MAJOR-2.

### D-R08-8 — AC-23 binding value update (21 → 23) without renumbering

**Picked**: update the literal binding value in-place; preserve AC-23's ID and semantic meaning.

**Rationale**: AC-23's semantic ("q07 in-file test count matches the spec's declared count") is unchanged. The value is a SIDE-EFFECT of the spec's structural declaration of in-file ACs. Renumbering would be more confusing.

**Rejected alternatives**: introduce AC-29-as-q07-count-binding and mark AC-23 obsolete (would create dual-numbering confusion). Spec-Rev clearly handles in-place value updates (R03-R07 precedent updated this kind of value each time a new test was added without re-numbering AC-23).

### D-R08-9 — config.ts:228 JSDoc edit (closes R06 MINOR-1)

**Picked**: single-line edit `(D1-D10)` → `(D1-D13)`.

**Rationale**: closes a long-carry-forward debt with zero behavior risk. Documentation-only; no schema impact.

**Rejected alternatives**: leave the stale JSDoc (perpetuates the documentation gap); add an inline comment explaining "this used to say D1-D10" (clutter; not useful).

### D-R08-10 + D-R08-11 + D-R08-12 — R07 MINOR closures

**Picked**: close all three (MINOR-2 / MINOR-3 / MINOR-4) in passing.

**Rationale**: each is a 1-line edit; cumulative diff ~5 LOC; zero behavior risk; removes carry-forward debt. Operator-listed at NEXT-ROLE.md "Architect's discretion".

**Rejected alternative**: defer all three to a future round. Rejected because the cumulative debt across rounds compounds; closing in passing keeps the carry-forward list short.

### D-R08-13 — Two-commit TDD ordering (with single-commit alternative documented)

**Picked**: two-commit RED → GREEN as preferred path; single-commit landing acceptable.

**Rationale**: R02-R07 precedent has always used two-commit; preserves historical pattern. R08 is the FIRST Tessera round without behavior-changing production code; the conventional "RED state has failing test → GREEN state has passing test" semantic doesn't apply (no behavior changes; tests should already pass at RED because the algorithm is preserved). Two-commit form preserved for git-log readability; single-commit form documented as acceptable.

### D-R08-14 — File-creation track-state verification at HEAD `8ca5e42`

**Picked**: explicit verification per R02 OBS-2 reinforcement.

**Rationale**: standing discipline. Confirmed v0.3 memo path absent; v0.2 memo path present (unchanged); config.ts + q07 test file + pre-disposition file all present.

---

## Architect pre-predictions (for Reviewer audit)

| AC | Prediction | Confidence | Rationale |
|---|---|---|---|
| AC-1..AC-11, AC-14, AC-17..AC-21 (R07-inherited unchanged) | All pass at R08 GREEN (matching R07 GREEN state per Reviewer's pre-R07 verification) | VERY HIGH | Algorithm preserved bit-identical; tests unchanged |
| AC-5 + AC-6 (Delta 10 cleanup) | Pass; loop variable destructuring changed; loop body unchanged | VERY HIGH | Removes unused destructured element; loop body reads xCounts[wi] directly |
| AC-12 redesigned (Delta 3, `<= 1`) | Pass with firedCount=0 (R07 OBSERVED preserved by algorithm preservation; `<= 1` is satisfied by 0) | VERY HIGH | Algorithm unchanged → firedCount=0 inherited from R07 GREEN |
| AC-13 redesigned (Delta 4, `<= 1`) | Pass with firedCount=0 | VERY HIGH | Same as AC-12 |
| AC-15 (Delta 11, tightened to `===`) | Pass; clean fleet's MCD produces zero contamination; no Stage 2b fire → length preserved exactly | HIGH | Verified at R07 by Reviewer ("expected ≈ Stage-2a-only length"); R07 already showed curatedLen ≤ origLen passes; the tighter ` ===` claim requires "no Stage 2a flag on the clean alternating-pattern fixture" — likely but not 100% certain |
| AC-16 (Delta 12, comment disambiguation) | Pass; comment-only edit; no test-body change | VERY HIGH | Pure comment edit |
| AC-27 (sustained strong; `>= 25`) | Pass with firedCount = 28-30 of 30; fire_window ≈ 43 across most trials | HIGH | Hand-trace at § Per-file pseudocode Implementer note 5; 5-trial margin |
| AC-28 (sustained weak; `>= 15`) | Pass with firedCount ≈ 28 of 30; fire_window ≈ 202 across most trials | HIGH | Hand-trace at note 6; 13-trial margin |
| AC-22 (typecheck) | Pass (exit 0) | VERY HIGH | Zero source/type changes that could break typecheck (config.ts JSDoc is comment-only; q07 test file changes are pure value/comment edits + new tests) |
| AC-23 (q07 count===23) | Pass | VERY HIGH | Structurally pre-determined by R08's declared in-file AC count |
| AC-24 (no regressions) | Pass; q07 = 23/0; all other test files at R07-GREEN counts | VERY HIGH | Zero modification to any pre-R08 non-q07 test file |
| AC-25 (RED→GREEN) | Pass (two-commit ordering) OR informative single-commit log | HIGH | Implementer choice; both documented as acceptable |
| AC-26 (as any grep) | Pass; 0 matches | VERY HIGH | Zero modification to tools/curate-baseline-fleet-correlated.ts |
| AC-29 (config.ts D1-D13 grep) | Pass after Delta 9 lands | VERY HIGH | Single-line edit deterministic |
| AC-30 (v0.3 memo + pre-disposition append) | Pass | VERY HIGH | Both deltas deterministic |
| AC-31 (inequality bounds in AC-12/13/27/28) | Pass; ≥ 4 inequality-bound assertions on firedCount | VERY HIGH | Deltas 3+4+6+7 deterministically install the 4 inequality bounds |

**Highest-uncertainty predictions**: AC-15 (tighter `===`) and AC-27/AC-28 (theory-derived bounds). AC-15 risk: if the MCD on the clean alternating-pattern fixture finds any Stage 2a flags (which is unlikely given the no-outlier alternating-low-magnitude signals), the strict equality fails and the Implementer must either revert to `<=` (R06 OBS-1 tactical fix) or adjust the clean-fleet fixture. AC-27/AC-28 risk: PRNG tail-anomalous samples could push firedCount below the bound; Implementer applies right-reasons-check-protected tightening per Implementer note 4.

---

## Pre-route discipline application

### Skill 14: PRD-conjunction-cross-check (symmetric)

PRD AC-P1: "per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)". R08's narrowing of the FCP-1 detection scope does NOT modify either Ville bound or e-BH expectation. Ville bound is preserved by Q-JC4 framework stability (R08-SAS-2 fences Q-JC4 modification). PRD AC-P1 traces:
- AC-22 (typecheck) — load-bearing infrastructure.
- AC-23 (q07 count) — load-bearing test surface.
- AC-27 + AC-28 — empirical sustained-injection power evidence at the FCP-1 layer.
- AC-12 + AC-13 redesigned — FPR-under-perturbation Type-I evidence.

PRD AC-P2: "warm-start `cell_confidence` enables alerts within 20 per-shard samples; strict-upgrade at 60". Untouched at R08; R08 modifies zero per-shard runtime substrate.

**Symmetric check (R08 does not narrow any PRD conjunct)**: PRD AC-P1 fleet-FPR bound preserved (Ville bound). PRD AC-P2/P3/P4 untouched. The detection-scope narrowing at the FCP-1 level is independent of PRD-level claims (PRD is intentionally thin per "Per-extension ACs at the spec level (not at PRD level)" convention).

### Skill 15: prescription-to-AC coverage

Every prescription in § Mechanism + § Per-file pseudocode binds to ≥1 AC:
- D-R08-1 v0.3 memo creation → AC-30.
- D-R08-2 pre-disposition append → AC-30.
- D-R08-3 AC-12 redesigned → AC-12.
- D-R08-4 AC-13 redesigned → AC-13.
- D-R08-5 simulateH1Sustained helper → indirectly bound by AC-27 + AC-28 (which invoke the helper).
- D-R08-6 AC-27 → AC-27.
- D-R08-7 AC-28 → AC-28.
- D-R08-8 q07 count 23 → AC-23.
- D-R08-9 config.ts JSDoc fix → AC-29.
- D-R08-10 + D-R08-11 + D-R08-12 MINOR cleanups → respectively AC-5+AC-6 / AC-15 / AC-16 (carry inherited AC IDs with modified test bodies).
- D-R08-13 TDD ordering → AC-25.
- D-R08-14 file-creation track-state → § Component inventory paragraph (Reviewer-verifiable).

All prescriptions bound. **Skill 15 check: PASS.**

### Memorial sweep

Memorial D file-opened-discipline: applied via direct read of R07 spec / Reviewer report / overnight log + R06 + R07 entries in MEMORIAL.md + CROSS-PROJECT-MEMORIAL Reinforcement rules derived. R08 narrowing applies AT SPEC LEVEL (not algorithm level); Memorial D state preserved at 22V/8C (no novel-literature trigger fires — the narrowing is documentation of existing algorithm capability, not novel content).

Memorial F sub-rule application:
- F-1 (compile-time-substrate multi-read-paths): R08's config.ts:228 JSDoc fix is documentation-only; no new producer; no behavior change.
- F-2 (additive extension): R08 adds NO schema delta; AC-27/AC-28 are additive new tests; v0.3 memo is additive new file.
- F-3 (anti-scope-preservation): all 20 R08-SAS clauses + R07 / R06 / earlier-round carry-forward fences preserved.
- F-4 (pre-existing-property-vs-new-AC coherence): R08 preserves Ville-bound + e-BH per Q-JC4 framework stability.

### Compilation-dependency enumeration

Zero new compilation dependencies at R08. q07 test file's import surface unchanged. config.ts has no new export. No new module dependencies introduced.

---

## Memorial sweep — load-bearing reinforcements addressed

### From R07 reinforcements (LOAD-BEARING for R08)

1. **Fixture-sizing propagation** (R07 MAJOR-1 reinforcement): Applied to AC-27 + AC-28 design. The hand-trace at § Per-file pseudocode Implementer notes 5 + 6 verifies that each fixture provides margin past the analytically-derived threshold-crossing point (17 windows margin for AC-27; 7 windows margin for AC-28). The propagation across ALL new empirical e-process ACs is exhaustive (every new AC's fixture sized to accumulate sufficient signal).

2. **OBSERVED-binding scope** (R07 MAJOR-2 reinforcement): Applied to AC-27 + AC-28 + AC-12-redesigned + AC-13-redesigned. NO new OBSERVED-binding at R08. AC-27 + AC-28 use theory-derived bounds. AC-12 + AC-13 use scope-claim binding (`<= 1` derived from v0.3 narrowing, NOT from OBSERVED). The pre-emit grilling explicitly asks the right-reasons check at each new AC binding (documented at Delta 3 + Delta 4 + Delta 6 + Delta 7 inline comments).

### From R06 reinforcements

1. **JSDoc scope grep** (R06 MINOR-1 reinforcement): Applied at Delta 9. Verified via `grep -n "D1-D10" engine/types/config.ts` at HEAD `8ca5e42` that line 228 is the only stale occurrence. R06 Delta 1 already updated the other JSDoc + comment occurrences at lines 207-213.

2. **Public opts field coverage** (R06 MINOR-3 reinforcement): R08 does NOT modify any opts interface; coverage status inherited from R07 (standing-reinforcement table row 16).

### From R05 reinforcements

1. **Narrative-vs-pseudocode AC-count cross-check**: Applied at § P3 axis 5 + § Component inventory + § Mechanism primitive 8 + per-file pseudocode + AC-23 binding. All sites agree on q07 count===23 (R07's 21 + AC-27 + AC-28).

### From R03 reinforcements

1. **Empirically-verified-test-count**: AC-24 directs OBSERVED reporting. AC-23 binds q07 count===23 (structurally pre-determined per the spec's declared in-file AC count).
2. **Grep-pattern-soundness**: AC-29 (`grep -n "D1-D10"`) — literal range string; no comment-vs-executable distinction needed. AC-31 (`grep -n "assert.ok(firedCount"`) — pattern matches in-file executable assertion lines; soundness verified.
3. **Re-export-chain-check**: No new imports at R08; existing R07 import chains preserved (trivially).

### From R02 reinforcements

1. **Type-declaration-site discipline**: BaselineCurationDecisionId union at config.ts:214-218 opened at HEAD `8ca5e42` for Delta 9 JSDoc-fix verification (union shape unchanged; only inline JSDoc edited).
2. **File-creation track-state**: v0.3 memo absent verified at HEAD `8ca5e42`.

### From R01 reinforcements

1. **Cross-section consistency pass**: 18-row check executed; all PASS.
2. **Compilation-dependency enumeration**: Zero new deps at R08.

### From R12 reinforcements

1. **Brainstorm-re-evaluation when re-selecting an approach the original brainstorm rejected**: R08 does NOT re-select any prior-round rejected approach. Q-JC4 framework PRESERVED (R08-SAS-2). The scope-claim narrowing is documentation of the algorithm's existing capability, not a new algorithm choice. The R08 spec's approach (B)+(D) does not match any prior R07 brainstorm option exactly but is the operator-confirmed disposition surfaced at R07 close.
2. **Backward-compat file check**: R08 modifies 3 files (q07 test, config.ts JSDoc, pre-disposition append) + creates 1 (v0.3 memo). All modifications are either test-side, documentation-side, or scope-narrowing prose. Zero production-code modification → zero R02-R07 test regression risk. Explicit cross-check at § Component inventory paragraph.

### From R09 reinforcement

1. **Self-confirming integration tests**: Applied LOAD-BEARING at R08. AC-27 + AC-28 use theory-derived bounds (not OBSERVED-binding); right-reasons check documented inline. AC-12 + AC-13 redesigned use scope-claim binding (not OBSERVED-binding under v0.3 narrowing); right-reasons check documented inline.

---

## Anti-scope verification

| R08-SAS | Anti-scope claim | Verified via |
|---|---|---|
| R08-SAS-1 | NO modification to `tools/curate-baseline-fleet-correlated.ts` | Component inventory does NOT list this file |
| R08-SAS-2 | NO re-disposition of Q-JC4/4a/4b/4c/5 | Spec preamble explicit; § Anti-scope explicit; pre-disposition append preserves the Q-JC framework table |
| R08-SAS-3 | NO new OBSERVED-binding ACs | AC-27 + AC-28 + AC-12-redesigned + AC-13-redesigned all use theory-derived OR scope-claim bindings (NOT OBSERVED); right-reasons checks documented inline at each |
| R08-SAS-4 | NO modification to PRD.md | Component inventory does NOT list PRD.md |
| R08-SAS-5 | NO modification to SCOPING-MEMO-v0.3.md (top-level) | Component inventory does NOT list the top-level scoping memo |
| R08-SAS-6 | NO modification to VENDORING-MANIFEST.md | Component inventory does NOT list it |
| R08-SAS-7 | NO modification to package.json / tsconfig*.json | Component inventory does NOT list them |
| R08-SAS-8 | NO modification to engine/per-shard/* | Component inventory does NOT list any engine/per-shard file |
| R08-SAS-9 | NO modification to tools/calibrators/* or curate-baseline-pipeline.ts or curate-baseline-pre-pass.ts | Component inventory does NOT list any of those |
| R08-SAS-10 | NO new npm deps | Component inventory does NOT list package.json modification |
| R08-SAS-11 | NO modification to test/_substrate/factories.ts | Component inventory does NOT list it |
| R08-SAS-12 | NO modification to pre-R08 test files other than q07 | Component inventory lists ONLY q07 |
| R08-SAS-13 | NO SR/RPCA/BOCPD | Component inventory does NOT list any of those |
| R08-SAS-14 | NO always-on / streaming filter | Component inventory does NOT introduce any streaming surface |
| R08-SAS-15 | NO joint e-BH coupling | Component inventory does NOT touch the e-BH path |
| R08-SAS-16 | NO post-fire wealth reset | Component inventory does NOT modify the production file (algorithm preserved) |
| R08-SAS-17 | NO modification to AC-11 | Surfaced as OQ-R08-1; not in any Delta |
| R08-SAS-18 | NO modification to MEMORIAL.md beyond architect-close append | Architect appends only architect-side discipline confirmations at spec emit |
| R08-SAS-19 | NO modification to NEXT-ROLE.md beyond routing update | Architect updates routing only at spec emit |
| R08-SAS-20 | NO modification to BASELINE-CURATION-v0.2 memo | Delta 1 creates v0.3 as NEW FILE; v0.2 preserved verbatim |

All 20 R08-SAS clauses verified at spec-emit time.

---

## Reviewer-side checklist

For Reviewer cold review (post-Implementer GREEN), the spec audit sidecar prescribes the following checks:

1. **Verify all 4 file modifications happened**: `git diff fd7e3a6..HEAD --name-only` should show exactly: `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` (NEW); `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` (modified — append section); `engine/types/config.ts` (modified — single-line JSDoc); `test/q07-fleet-correlated.test.ts` (modified — Deltas 3-7, 8 implicit, 10-12). Plus coordination artifacts: `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md`, possibly `coordination/specs/Q-R08-SPEC.md` + `Q-R08-SPEC-AUDIT.md`.

2. **Verify production file UNMODIFIED**: `git diff fd7e3a6..HEAD -- tools/curate-baseline-fleet-correlated.ts` returns empty (R08-SAS-1).

3. **Verify v0.2 memo UNMODIFIED**: `git diff fd7e3a6..HEAD -- coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` returns empty (R08-SAS-20).

4. **Verify the Q-JC framework PRESERVED in pre-disposition file**: `git diff fd7e3a6..HEAD -- coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` shows ONLY the appended section AFTER the existing closing footer paragraph — NO modification to Q-JC1-Q-JC6 disposition table.

5. **Verify q07 GREEN passes**: `node --test test/q07-fleet-correlated.test.js` reports pass 23 / fail 0.

6. **Verify typecheck passes**: `npm run typecheck` exit 0.

7. **Verify pre-R08 regressions absent**: each pre-R08 test file at R07 GREEN count (q06=13, q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, q03=13, q04=11, q05=13, betting-class-dispatch=5; total 70). Plus new q07=23 → total 93.

8. **Verify config.ts:228 JSDoc fix**: `grep -n "D1-D10" engine/types/config.ts` returns 0 matches; `grep -n "D1-D13" engine/types/config.ts` returns ≥ 2 matches (the R06-Delta-1 union-definition JSDoc + the new line-228 fix).

9. **Right-reasons audit on new ACs**: AC-27 + AC-28 use theory-derived bounds; AC-12 + AC-13 redesigned use scope-claim bindings. For each, verify: (a) the expected value (`<= 1`, `>= 25`, `>= 15`) is NOT derived from running production at GREEN; (b) a future implementation FIX matching architect prediction would PASS the test; (c) a future implementation BUG would FAIL the test. Right-reasons check documented inline at each test body.

10. **Anti-scope verification**: `git log --oneline fd7e3a6..HEAD --` against the full R08-SAS-1..20 file list. Zero commits modify any fenced file.

---

_End of Q-R08-SPEC-AUDIT.md._
