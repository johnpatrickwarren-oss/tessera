# REVIEWER-REPORT-R08 — Tessera Phase 1 SLICE 5 amendment (FCP-1 scope narrowing + AC-12/13 redesign + new sustained-injection power ACs + carry-forward MINOR closures)

_From: Reviewer (R08 cold review)._
_To: Operator / Memorial Updater._
_Date: 2026-05-16._
_HEAD audited: `24f945e` (chore(R08): record attestation SHA f27ad25 in NEXT-ROLE.md)._
_R08 GREEN audited: `4ba5e9e`._
_R08 RED audited: `f99e54c`._

---

## Audit inputs

- `coordination/PRD.md`
- `coordination/specs/Q-R08-SPEC.md` (full)
- `coordination/specs/Q-R08-SPEC-AUDIT.md` (Architect ceremony sidecar; § Brainstorm + Approach A picked)
- All source files at HEAD `24f945e`: `engine/types/config.ts` (Delta 9 target), `tools/curate-baseline-fleet-correlated.ts` (R08-SAS-1 — must be UNMODIFIED)
- All test files: `test/q07-fleet-correlated.test.ts` (primary modified target), pre-R08 test files (regression baseline)
- New documentation: `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` (Delta 1)
- Appended documentation: `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` (Delta 2)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section + halt-discipline reinforcements)
- `coordination/NEXT-ROLE.md` (R08 routing block; reviewed for deviation declarations)

NOT consulted (cold-review independence): `coordination/diagnostics/`, `coordination/logs/`, `.prompt-*.md`.

---

## 1. Per-AC verification table

R08 spec enumerates 31 ACs total: AC-1..AC-21 (q07 in-file, R07-inherited; 6 modified at R08) + AC-22..AC-26 (R07-inherited Reviewer-run commands; AC-23 binding value updated 21→23) + AC-27..AC-28 (R08-new q07 in-file power tests) + AC-29..AC-31 (R08-new Reviewer-run grep commands).

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-1 | Clean 1-run: n_runs_screened===1; D11+D12+D13 emitted | PASS | `test/q07-fleet-correlated.test.ts:131` — passes via `node --test` |
| AC-2 | Outlier bundle: n_ticks_contaminated≥1; outlier 100 excluded | PASS | `test/q07-fleet-correlated.test.ts:141` — passes |
| AC-3 | Insufficient samples: D11.n_runs_skipped_insufficient_samples===1; FCP-1 doesn't fire | PASS | `test/q07-fleet-correlated.test.ts:153` — passes |
| AC-4 | No-signals bundle: skipped; FCP-1 doesn't fire | PASS | `test/q07-fleet-correlated.test.ts:163` — passes |
| AC-5 (modified) | Wealth update step-trace matches within 1e-10 (xw element dropped per Delta 10) | PASS | `test/q07-fleet-correlated.test.ts:172` — passes; loop at line 185 uses `for (const wi of [2, 3, 4])` per Delta 10 |
| AC-6 (modified) | ONS bet step-trace matches within 1e-10 (xw element dropped per Delta 10) | PASS | `test/q07-fleet-correlated.test.ts:206` — passes; loop at line 215 uses `for (const wi of [2, 3, 4])` per Delta 10 |
| AC-7 | Bayesian shrinkage p_base===0.025 on [2,3,0] | PASS | `test/q07-fleet-correlated.test.ts:233` — passes |
| AC-8 | Fire condition: 32-elem [0,0,X=100×30] fires at window ∈ [3,25] | PASS | `test/q07-fleet-correlated.test.ts:246` — passes |
| AC-9 | No-fire on X_w===2 constant fixture | PASS | `test/q07-fleet-correlated.test.ts:261` — passes |
| AC-10 | Empty xCounts guard: n_windows_test===0; p_base===0.025 | PASS | `test/q07-fleet-correlated.test.ts:271` — passes |
| AC-11 | H₀ FPR: 30 trials × W=200 × p=0.025 → firedCount===0 strict | PASS | `test/q07-fleet-correlated.test.ts:281` — passes (OBSERVED firedCount=0; AC-11 strict-equality binding intentionally preserved per R08-SAS-17; surfaced as OQ-R08-1 for future cycle) |
| AC-12 (REDESIGNED) | FPR under strong transient perturbation: firedCount≤1 | PASS | `test/q07-fleet-correlated.test.ts:294` — passes; Delta 3 applied verbatim (lines 294-313 match spec § Delta 3 pseudocode exactly) |
| AC-13 (REDESIGNED) | FPR under weak transient perturbation: firedCount≤1 | PASS | `test/q07-fleet-correlated.test.ts:316` — passes; Delta 4 applied verbatim (lines 316-329 match spec § Delta 4 pseudocode exactly) |
| AC-14 | Martingale: first-test-window log_S===0 regardless of F_w | PASS | `test/q07-fleet-correlated.test.ts:332` — passes |
| AC-15 (modified per Delta 11) | Clean fleet: fcp1State.fired===false; D12 fire_window===-1; curatedLen=== origLen | **PARTIAL** | `test/q07-fleet-correlated.test.ts:345` passes, BUT the `curatedLen===origLen` tightening (Delta 11) was NOT applied. Line 363 still reads `assert.ok(curatedLen <= origLen, ...)`. See MAJOR-1. |
| AC-16 (modified per Delta 12) | Fleet-event bundle: fcp1 fires; comment disambiguated "X_w = N = 10 — all 10 shards flag..." | PASS | `test/q07-fleet-correlated.test.ts:368`; comment at line 372 matches Delta 12 wording exactly |
| AC-17 | Mixed bundle: 2 screened + 1 skipped; correct N_aligned | PASS | `test/q07-fleet-correlated.test.ts:393` — passes |
| AC-18 | result.decisions === {D11,D12,D13} | PASS | `test/q07-fleet-correlated.test.ts:413` — passes |
| AC-19 | D12 output_summary required literal fields | PASS | `test/q07-fleet-correlated.test.ts:419` — passes |
| AC-20 | D13 output_summary sentinel prefix; fired=false fields | PASS | `test/q07-fleet-correlated.test.ts:434` — passes |
| AC-21 | D13 sentinel deterministic across calls | PASS | `test/q07-fleet-correlated.test.ts:450` — passes |
| AC-22 | `npm run typecheck` → exit 0 | PASS | Reviewer-run: `npm run typecheck` → exit 0 (no output errors); only `> tsc -p tsconfig.test.json --noEmit` echoed |
| AC-23 (value updated 21→23) | `node --test test/q07-fleet-correlated.test.js` → pass===23, fail===0 | PASS | Reviewer-run output: `ℹ tests 23 / ℹ pass 23 / ℹ fail 0` |
| AC-24 | All other test files: counts match R07 baseline; grand total 93/0 | PASS | Reviewer-run per file: q01-vc=3/0, q01-no=1/0, q01-sa=5/0, q02-se=6/0, q03=13/0, q04=11/0, q05=13/0, q06=13/0, betting-class=5/0, q07=23/0. Grand total **93/0** (matches expected 91+2). |
| AC-25 | Two-commit RED→GREEN; RED touches only q07 | **PARTIAL** | RED `f99e54c` precedes GREEN `4ba5e9e` in `git log --oneline`. `git show f99e54c --stat` → only `test/q07-fleet-correlated.test.ts \| 110 +/-`. ✓ But the **RED commit applies Deltas 3,4,5,6,7,10,12** — Delta 11 missing (per RED commit message: "close R07 MINOR-2/4" — note absence of MINOR-3). See MAJOR-1. |
| AC-26 | Grep `^[^/*]*as any` in `tools/curate-baseline-fleet-correlated.ts` → 0 matches | PASS | Reviewer-run grep returns 0 matches |
| AC-27 (R08-new) | Sustained strong injection: firedCount ≥ 25 | PASS | `test/q07-fleet-correlated.test.ts:460` — passes; Implementer commit message reports OBSERVED firedCount=30/30 |
| AC-28 (R08-new) | Sustained weak injection: firedCount ≥ 15 | PASS | `test/q07-fleet-correlated.test.ts:485` — passes; Implementer commit message reports OBSERVED firedCount=30/30 |
| AC-29 (R08-new) | Grep "D1-D10" → 0; grep "D1-D13" → ≥1 in engine/types/config.ts | PASS | Reviewer-run: `grep -n "D1-D10"` → 0 matches; `grep -n "D1-D13"` → `228: /** Canonical decision identifier (D1-D13). */` (1 match) |
| AC-30 (R08-new) | v0.3 memo exists; pre-disposition contains "Q-JC4 scope narrowing (2026-05-16, operator-confirmed under authority-expansion)" | PASS | Reviewer-run: `ls coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` → present (32195 bytes); `grep -c "Q-JC4 scope narrowing (2026-05-16, operator-confirmed under authority-expansion)" coordination/ARCHITECT-REPLY-...md` → 1 match |
| AC-31 (R08-new) | `grep "assert.ok(firedCount"` in q07 → ≥4 matches | PASS | Reviewer-run: `grep -nE "^[^/]*assert\.ok\(firedCount" test/q07-fleet-correlated.test.ts \| wc -l` → 4 (AC-12, AC-13, AC-27, AC-28) |

**Status tally**: 29 PASS, 2 PARTIAL (AC-15, AC-25 — both downstream of Delta 11 not being applied), 0 FAIL.

---

## 2. Findings

### MAJOR-1 — Halt-discipline violation: Delta 11 deviation handled without DIAGNOSTIC + ESCALATE

**Severity**: MAJOR.
**Category**: Methodology / Implementer role discipline.
**Location**: `coordination/NEXT-ROLE.md:30-32` + RED commit `f99e54c` (test/q07-fleet-correlated.test.ts:363) + GREEN commit `4ba5e9e` body (note paragraph after the Delta enumeration).

**What happened**

Spec Delta 11 (Q-R08-SPEC.md § Per-file pseudocode Delta 11; cross-referenced at AC-15 + Mechanism primitive 11 + Cross-section consistency row 11) prescribed tightening the AC-15 length assertion from `assert.ok(curatedLen <= origLen, …)` to `assert.strictEqual(curatedLen, origLen, …)`. The spec's load-bearing premise: "the MCD on the clean alternating-pattern signal series produces zero contamination flags (no Stage 2a drop) — so post-curation length must equal original length exactly."

The Implementer applied Delta 11, observed the test failure (curated length 6 vs original length 8 — MCD flags 2 ticks per run on the clean fleet fixture), reverted to the pre-Delta-11 form, and documented the deviation in `coordination/NEXT-ROLE.md:30-32` + the GREEN commit message body.

**Why this is a discipline violation**

Per the cross-project memorial standing reinforcement at `~/.claude/CROSS-PROJECT-MEMORIAL.md` Discipline: halt-discipline (Reviewer-cited):

> "Procedural halt requirements apply even when the resolution is unambiguous. A spec-internal inconsistency with only one correct resolution still requires DIAGNOSTIC + ESCALATE — the discipline is calibrated by auditability, not by resolution difficulty. Documenting the deviation in NEXT-ROLE.md only is not a substitute for a DIAGNOSTIC file."

The Implementer hit a spec-internal factual error (the Architect-and-R07-Reviewer-attested claim about MCD producing zero contamination flags was empirically false). Per Tessera CLAUDE-IMPLEMENTER.md halt-discipline + the cross-project reinforcement, the correct response was: HALT + write `coordination/diagnostics/DIAGNOSTIC-R08-delta11-spec-premise-error.md` + STATUS: ESCALATE. Instead, the Implementer treated the deviation as "within tactical autonomy" and proceeded with silent revert + documentation in NEXT-ROLE.md.

This is the exact failure mode the cross-project reinforcement was authored to prevent. The NEXT-ROLE.md note (line 32) "This is within tactical autonomy — production behavior empirically determines the correct assertion; no design decision involved" mischaracterizes the situation: the issue is *not* whether the resolution is correct (it is — reverting was right); the issue is that procedural halt requirements apply regardless of resolution unambiguity.

**Empirical confirmation of the spec premise error (Reviewer-run)**

Reviewer ran the AC-15 fixture against the GREEN-HEAD production code (`tools/curate-baseline-fleet-correlated.js`) and confirmed:
- D11 `n_ticks_contaminated`: 6 (2 ticks × 3 runs)
- `fcp1State.fired`: false (Stage 2b doesn't fire — correct)
- Each run: `origLen=8`, `curatedLen=6` (Stage 2a drops 2 ticks per run via MCD)

So the spec's "zero contamination flags" claim at § Per-file pseudocode Delta 11 + § Cross-section consistency row 11 is empirically wrong by 2 ticks per run. The Architect's pre-emit grilling did not catch this; the R07 Reviewer's prior claim (cited by the Architect) was also incorrect.

**Impact**

- AC-15 status downgraded to PARTIAL (Delta 11 not applied).
- AC-25 status downgraded to PARTIAL (RED commit does not contain Delta 11 as spec prescribed).
- Spec § Cross-section consistency row 11 ("Pseudocode uses `assert.strictEqual`") now mismatches the implementation.
- Spec § Implementer note 1 mismatches: RED commit was supposed to apply Deltas 3, 4, 5, 6, 7, 8 (AC-23 constant — vacuous since count update is structural), 10, 11, 12; actual RED applied 3, 4, 5, 6, 7, 10, 12.

**Correct downstream remediation** (Reviewer documents; does not implement):
The Architect's next round (R09 or whoever next touches q07) should:
1. Confirm the empirical Stage 2a behavior (2 ticks flagged per run on the clean alternating-pattern fixture).
2. Either tighten AC-15 to `assert.strictEqual(curatedLen, origLen - 2)` per run, OR redesign the clean-fleet fixture so MCD truly flags zero ticks, OR keep `<= origLen` and document the looseness explicitly.
3. Update the spec premise at any place it claims "MCD produces zero flags on the clean alternating-pattern."
4. Write a Memorial entry noting the R07 Reviewer claim + R08 Architect spec relied on the false premise.

---

### MAJOR-2 — Spec § Cross-section consistency pass row 11 + Implementer note 1 + § Per-file pseudocode Delta 11 contain a factually wrong premise (Architect-side; surfaced for Memorial Updater)

**Severity**: MAJOR.
**Category**: Architect pre-emit grilling miss.
**Location**: `coordination/specs/Q-R08-SPEC.md`:
- § Mechanism primitive 11 (`D-R08-11 — Closes R07 MINOR-3`): "The clean fleet has NO Stage 2a contamination (low-value alternating signals) AND no Stage 2b fire (no contaminated ticks)."
- § Cross-section consistency row 11: "Pseudocode uses `assert.strictEqual`".
- § Per-file pseudocode Delta 11 closing rationale: "no Stage 2a contamination (MCD on the alternating-pattern signals produces zero flags) AND no Stage 2b fire (fcp1State.fired===false verified at line 332) → post-curation length must equal original length exactly."
- § Per-claim verifiability bullet citing "Inherited R07 q07 test code citations" (the Architect inherited the R07 Reviewer's MINOR-3 claim without independent empirical verification).

**Evidence**: Reviewer-run probe (Bash output above): D11 emits `n_ticks_contaminated: 6` on this fixture; 2 ticks dropped per run. The spec's "zero flags" claim is wrong.

**Architect-side miss**: § Grilling output → § Unstated assumptions surfaced and resolved → assumption 6 reads "R08's MINOR closures … are independently safe. Each is a single-character / 1-line edit; zero behavior risk." This assumption-statement is the place where the Architect should have caught the issue and grilled the underlying empirical claim. Instead the grilling output asserts "verdict: PASS" without ever running the AC-15 fixture against production code.

**Why MAJOR not MINOR**: the spec premise being wrong is the root cause of the MAJOR-1 halt-discipline violation. Without the wrong premise, the Implementer would have applied Delta 11 cleanly and routed MERGE-READY. The Architect-side miss directly forced the Implementer into a halt-decision they then handled incorrectly. Cross-project Architect-pre-emit-grilling reinforcement (CROSS-PROJECT-MEMORIAL.md Discipline: halt-discipline R07/R08 additions): the Architect should independently verify load-bearing factual premises before specifying changes that depend on them.

**Recommended remediation**: R09 Architect should:
1. Run the AC-15 fixture against `tools/curate-baseline-fleet-correlated` and record `n_ticks_contaminated` + per-run lengths empirically before writing the next AC-15 disposition.
2. Update Q-R08-SPEC.md § Mechanism primitive 11 + Cross-section consistency row 11 in retrospect if a retro-correction artifact is desirable (or simply document the correction at R09 + Memorial).

---

### MINOR-1 — Spec § Component inventory "Backward-compat file cross-check" paragraph predicts a diff inventory that does not exactly match the achieved diff

**Severity**: MINOR.
**Location**: `coordination/specs/Q-R08-SPEC.md` § Component inventory closing paragraph: "Confirmed via `git diff fd7e3a6..HEAD --name-only` at R08 GREEN expected to show: the 3 modified files + 1 created file (v0.3 memo) + coordination artifacts (NEXT-ROLE.md, MEMORIAL.md)."

**Reviewer-observed `git diff fd7e3a6..HEAD --name-only`**:
```
CLAUDE-ARCHITECT.md
CLAUDE-IMPLEMENTER.md
coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md
coordination/logs/ROUND-R07-SUMMARY.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/OVERNIGHT-LOG-2026-05-16.md
coordination/reviews/REVIEWER-REPORT-R07.md
coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md
coordination/specs/Q-R07-SPEC-AUDIT.md
coordination/specs/Q-R07-SPEC.md
engine/types/config.ts
test/q07-fleet-correlated.test.ts
```

The "extra" files (CLAUDE-ARCHITECT.md, CLAUDE-IMPLEMENTER.md, the R07 spec/audit/review/summary, OVERNIGHT-LOG, MEMORIAL.md, NEXT-ROLE.md) are all from commits `f30dfac` (R07 Memorial-Updater outputs) and `e03f00c` (R07 close halt), both of which predate R08-Architect's `8ca5e42` start point. The spec's pinned baseline of `fd7e3a6` is the R07 GREEN, not R07 close, so the spec's predicted name-only diff was always going to under-count. Cosmetic — does not invalidate R08 anti-scope (no R08-SAS clause was violated; verified file-by-file).

**Recommended remediation**: R09 Architect could use HEAD-at-spec-emit (e.g., `8ca5e42` for R08) as the diff baseline, not the prior-round-GREEN SHA. Cosmetic discipline improvement.

---

### MINOR-2 — Two-commit AC-25 binding wording inconsistency

**Severity**: MINOR.
**Location**: `coordination/specs/Q-R08-SPEC.md` § Per-file pseudocode Implementer note 1: "RED commit modifies `test/q07-fleet-correlated.test.ts` ONLY (Deltas 3, 4, 5, 6, 7, 8 [AC-23 constant update], 10, 11, 12)." But Delta 8 is documented in § Per-file pseudocode Delta 8 as "NOT a literal code edit … purely a consequence of Deltas 6 + 7." So Delta 8 cannot be applied "at RED" — it's not a discrete edit.

**Impact**: Cosmetic — no actual TDD-ordering ambiguity (Delta 8 has no body), but the Implementer's RED commit message correctly omits Delta 8. Recommend the Architect clarify in future specs.

---

### MINOR-3 — AC-31 spec wording contains a self-correction mid-paragraph (the spec author noticed during write-time)

**Severity**: MINOR.
**Location**: `coordination/specs/Q-R08-SPEC.md` AC-31 paragraph reads: "The grep MUST tolerate the AC-11 instance via the `[^/]*` non-comment prefix only matching non-AC-11 sites… actually wait, AC-11 also uses `assert.strictEqual(firedCount, 0)` in executable code. **Correction**: AC-31 binds the absence of strictEqual on `firedCount` in the AC-12, AC-13, AC-27, AC-28 LINE RANGES specifically. To make this reviewer-verifiable cleanly, AC-31 binds: `grep -n "assert.ok(firedCount" test/q07-fleet-correlated.test.ts | wc -l` returns >= 4 …".

The mid-paragraph self-correction reflects the Architect's grilling-time discovery, which is fine, but the final binding is the third reformulation in the paragraph. Reviewer applied the third (final) form and it passes (count=4 ≥ 4). Cosmetic — the architect should have edited the paragraph to its final form before emitting, rather than leaving the trail of corrections inline.

---

### MINOR-4 — AC-11 carry-forward (informational, not blocking)

**Severity**: MINOR.
**Location**: `test/q07-fleet-correlated.test.ts:281-291`, AC-11.
AC-11 still uses `assert.strictEqual(firedCount, 0)` strict-equality binding on H₀ FPR; identified at R07 MAJOR-2 + at R08 OQ-R08-1 as falling in the same self-confirming class as the AC-12/13 issue. R08 deliberately preserved it per operator-set scope (R08-SAS-17). Standing carry-forward to a future cycle. Reviewer notes this for memorial continuity.

---

### OBS-1 — v0.3 memo body completeness

Verified `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` is 273 lines (vs Architect prediction "~260 lines, similar to v0.2"). Sampled lines 1-100 confirm: header version-bump (v0.2 → v0.3), § 1 Executive summary with new § 1.1 Detection scope (sustained-event narrowing prose), § 2 Stage 2b prose updated with detection-scope-binding paragraph. v0.2 verbatim-copy sections present where prescribed. No inline-amendment-mark-up to v0.2 (R08-SAS-20 preserved). No observable defect.

### OBS-2 — Pre-disposition append body completeness

Verified `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` extended from 179 lines (per spec citation) to 217 lines via the appended "Q-JC4 scope narrowing (2026-05-16, operator-confirmed under authority-expansion)" section. All sub-sections enumerated at § Per-file pseudocode Delta 2 are present (Empirical PR-F8 evidence at R07 close; Operator-confirmed disposition; What changed; Where the narrowing is documented; Future-cycle trigger). Q-JC1-Q-JC6 disposition table preserved verbatim (Reviewer-spot-checked; no in-place edits to existing sections). Append-only operation verified clean.

### OBS-3 — Production algorithm preservation (R08-SAS-1)

`tools/curate-baseline-fleet-correlated.ts` UNMODIFIED at R08 confirmed via `git diff fd7e3a6..HEAD -- tools/curate-baseline-fleet-correlated.ts` returning empty (Reviewer-run). R08-SAS-1 + R08-SAS-2 (Q-JC4 framework preservation) honored.

### OBS-4 — Pre-R08 test files preservation (R08-SAS-12)

None of `test/q01-vendoring-coverage.test.ts`, `test/q01-no-at-pin-deltas.test.ts`, `test/q01-schema-additions.test.ts`, `test/q02-schema-extension.test.ts`, `test/q03-warm-start-runtime.test.ts`, `test/q04-welford-stats.test.ts`, `test/q05-per-shard-runtime.test.ts`, `test/q06-baseline-pre-pass.test.ts`, `test/betting-e-process-class-dispatch.test.ts` appear in `git diff fd7e3a6..HEAD --name-only`. R08-SAS-12 honored. All pre-R08 test counts unchanged (verified individually).

### OBS-5 — Architect's affirmative-discretion exercise on MINOR closures

The Architect closed R06 MINOR-1 (Delta 9; verified ✓), R07 MINOR-2 (Delta 10; verified ✓ — both AC-5 line 185 and AC-6 line 215 use `for (const wi of [2,3,4])`), R07 MINOR-4 (Delta 12; verified ✓ — comment at line 372 matches Delta 12 wording). Three of four carry-forwards closed cleanly. R07 MINOR-3 attempt-and-revert is the load-bearing finding (MAJOR-1).

---

## 3. Right-reasons audit

Three tests picked across R07-inherited + R08-new; each traced to a spec requirement and inspected for self-confirming structure.

### Test 1 — `R08 AC-12 — FPR under strong transient perturbation` (`test/q07-fleet-correlated.test.ts:294`)

**Spec requirement traced to**: Q-R08-SPEC.md § Mechanism primitive 3 (D-R08-3) + § Per-file pseudocode Delta 3 + the v0.3 scope claim at `SCOPING-MEMO-BASELINE-CURATION-v0.3.md` § 1.1 ("FCP-1 is a sustained-fleet-event detector; transient single-window contamination is OUT of scope for SLICE 5").

**Right-reasons evaluation**: The test invokes the production `runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 })` with externally-synthesized PRNG-driven inputs from the test-local `simulateH1` helper. No re-implementation of production logic in the test body. The assertion `firedCount <= 1` is a scope-claim-bound assertion: it derives from the v0.3 narrowed scope (FCP-1 should NOT fire on transient single-window events), not from observed production output. A future implementation change that began firing on transient events would (a) violate the v0.3 scope claim, AND (b) raise firedCount to ~25-30/30 (per the inline comment's right-reasons check at lines 303-309), causing this test to FAIL correctly. A future BUG preserving 0/30 is consistent with the v0.3 scope and PASSES correctly. **Not self-confirming.** ✓

**Caveat**: the test's correctness depends on the v0.3 scope claim being the canonical scope for SLICE 5. The scope claim is documented at `SCOPING-MEMO-BASELINE-CURATION-v0.3.md` § 1.1 + the pre-disposition append + operator-confirmed under authority-expansion per OVERNIGHT-LOG-2026-05-16. Auditability: ✓.

### Test 2 — `R08 AC-27 — sustained strong injection power (theory-derived bound)` (`test/q07-fleet-correlated.test.ts:460`)

**Spec requirement traced to**: Q-R08-SPEC.md § Mechanism primitive 6 (D-R08-6) + § Per-file pseudocode Delta 6 + § Per-file pseudocode Implementer note 5 (hand-trace) + § Grilling unstated assumption 1 (PRNG-variance bound).

**Right-reasons evaluation**: The test invokes production `runFleetCorrelatedEProcess` with externally-synthesized inputs from `simulateH1Sustained` (PRNG-driven Bernoulli synthesis; NO production code path duplicated in the synthesis). The assertion `firedCount >= 25` is theory-derived: the inline comment at lines 461-474 traces the ONS λ saturation trajectory + per-window log-factor accumulation + variance-bound + threshold-crossing analytically, predicting firedCount ≈ 28-30 of 30; bound `>= 25` provides 3-5 trials of margin. A future implementation FIX matching the architect prediction (28-30/30) PASSES (28+ ≥ 25). A future BUG returning 0/30 FAILS (0 < 25). A future BUG returning e.g. 20/30 FAILS (20 < 25). The OBSERVED at GREEN (30/30 per Implementer commit message) is consistent with the prediction. **Not self-confirming.** ✓

The right-reasons check is also documented inline at the test body (lines 472-474): "future FIX matching architect prediction would produce firedCount ≈ 28-30 ≥ 25 → PASS. A future BUG producing 0/30 would FAIL. A bug producing 24/30 would FAIL. NOT self-confirming." This is the R07 MAJOR-2 reinforcement applied correctly.

### Test 3 — `R07 AC-8 — fire condition: 32-element fixture` (`test/q07-fleet-correlated.test.ts:246`)

**Spec requirement traced to**: R07-spec-inherited (Q-R08 inherits unchanged); FCP-1 sustained-event detection capability EMPIRICALLY DEMONSTRATED per v0.3 § 1.1 + pre-disposition append "Empirical PR-F8 evidence at R07 close" section. R08-SAS-1 preserves the production algorithm bit-identical so AC-8 carry-forward is honored.

**Right-reasons evaluation**: The test constructs an explicit deterministic `xCounts: number[] = [0, 0, ...new Array<number>(30).fill(100)]` and invokes production `runFleetCorrelatedEProcess` directly. The bounds `fire_window >= 3` and `<= 25` derive from the spec's hand-trace at AC-8 inline comment lines 247-249: "~18 windows needed to cross log(1/1e-3)≈6.908; 30 windows provides margin." These bounds are derived from the analytical wealth-update + threshold-crossing analysis, not from observed production output. A future BUG that drove the algorithm's ONS λ trajectory into a degenerate state would shift fire_window outside [3, 25] OR cause `fired===false`, causing FAIL. **Not self-confirming.** ✓

### Right-reasons audit summary

3 tests sampled; all three trace to documented spec requirements; none re-implement production logic in the test body; none are self-confirming. The R07 MAJOR-2 reinforcement (architect-prediction-vs-self-confirming-test check) is uniformly applied at AC-27 + AC-28 inline comments.

---

## 4. Cross-cutting checks

### TDD discipline

Two-commit RED → GREEN observed in `git log --oneline`:
```
4ba5e9e feat(R08-GREEN): v0.3 scoping memo (FCP-1 sustained-event scope narrowing); pre-disposition append; config.ts JSDoc fix
f99e54c feat(R08-RED): redesign AC-12/13 as FPR-under-transient tests; add AC-27/28 sustained-injection power; close R07 MINOR-2/4
```

RED commit `f99e54c --stat` shows only `test/q07-fleet-correlated.test.ts` modified (110 +/- 18 deletions). GREEN commit `4ba5e9e --stat` shows the three remaining deltas (config.ts:228 JSDoc; v0.3 memo CREATED; pre-disposition APPENDED). The R02-R07 historical pattern is preserved.

R08 is the first Tessera round without behavior-changing production code; per spec § Per-file pseudocode Implementer note 1, RED's "all 23 tests pass" outcome is expected (because no production change separates RED-fail from GREEN-pass). The Implementer's commit message at GREEN documents this correctly.

**TDD discipline finding**: Two-commit pattern preserved AND the spec's tactical alternative (single-commit) was not exercised. ✓ — but Delta 11 absence from the RED commit (which would have been "test fails" if applied per spec) is the MAJOR-1 finding above.

### No-skip discipline

The Implementer did NOT write a DIAGNOSTIC + ESCALATE for the Delta 11 spec premise error. This is the MAJOR-1 finding. The expected halt-discipline outcome was:
- Detect spec-premise error (Implementer did this ✓).
- Write `coordination/diagnostics/DIAGNOSTIC-R08-delta11-spec-premise-error.md` describing the empirical evidence (Implementer did NOT do this ✗).
- Set STATUS: ESCALATE in NEXT-ROLE.md so the operator gates the resolution (Implementer set STATUS: READY ✗).

The cross-project memorial standing reinforcement explicitly addresses this case: "Procedural halt requirements apply even when the resolution is unambiguous … Documenting the deviation in NEXT-ROLE.md only is not a substitute for a DIAGNOSTIC file." The Implementer's "tactical autonomy" justification at NEXT-ROLE.md:32 is incorrect.

### Anti-scope discipline

R08-SAS-1 through R08-SAS-20 enforcement verified:

- R08-SAS-1: `tools/curate-baseline-fleet-correlated.ts` UNMODIFIED ✓ (verified via empty `git diff -- tools/curate-baseline-fleet-correlated.ts`).
- R08-SAS-2: Q-JC4 framework disposition table unmodified ✓ (verified in pre-disposition append spec).
- R08-SAS-3: No new OBSERVED-binding ACs ✓ (AC-27 + AC-28 use theory-derived bounds with inline right-reasons checks; AC-12 + AC-13 are scope-claim-bound).
- R08-SAS-4 through R08-SAS-7: PRD.md, SCOPING-MEMO-v0.3.md (top-level), VENDORING-MANIFEST.md, package.json, tsconfig*.json all UNMODIFIED ✓ (verified absent from `git diff fd7e3a6..HEAD --name-only`).
- R08-SAS-8: engine/per-shard/* UNMODIFIED ✓.
- R08-SAS-9: tools/calibrators/* + tools/curate-baseline-pipeline.ts + tools/curate-baseline-pre-pass.ts UNMODIFIED ✓.
- R08-SAS-10: No new npm deps (package.json unmodified) ✓.
- R08-SAS-11: test/_substrate/factories.ts UNMODIFIED ✓ (simulateH1Sustained is local to q07).
- R08-SAS-12: pre-R08 test files UNMODIFIED ✓ (regression sweep confirms counts unchanged).
- R08-SAS-13 through R08-SAS-16: framework constraints carry-forward; preserved.
- R08-SAS-17: AC-11 UNMODIFIED ✓ (strict-equality binding preserved).
- R08-SAS-18 + R08-SAS-19: MEMORIAL.md and NEXT-ROLE.md modified within the R14 coordination-chore sequence (commits `f27ad25` + `24f945e`); within scope.
- R08-SAS-20: v0.2 memo UNMODIFIED ✓ (Reviewer-verified `git diff fd7e3a6..HEAD -- coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` returns empty).

No anti-scope violations detected.

### Right-reasons-check propagation discipline (R07 reinforcement)

R08 explicitly applied the R07 MAJOR-2 reinforcement (CROSS-PROJECT-MEMORIAL.md OBSERVED-binding scope) to AC-27 + AC-28. Both new ACs use theory-derived bounds with inline right-reasons checks documenting "would a future FIX matching prediction FAIL this test?" The Implementer also preserved this discipline at the test body level (right-reasons checks remain inline in the test comments at lines 472-474 + 498-499). ✓

### Fixture-sizing propagation discipline (R07 reinforcement)

R07 fixture-sizing reinforcement (CROSS-PROJECT-MEMORIAL.md) explicitly applied at:
- AC-27: W=60 / L=50 / threshold-crossing at w≈43 → 17-window margin past crossing.
- AC-28: W=210 / L=200 / threshold-crossing at w≈202 → 7-window margin past crossing.

Both bounds are conservative (3-5 trials margin at AC-27; ~13 trials margin at AC-28). The Implementer's OBSERVED-binding 30/30 fire rates (commit message) confirm the margins are conservative. ✓

---

## 5. Grilling output (on this Reviewer report, before routing)

| Check | Result |
|---|---|
| Every finding has a file:line reference? | YES (MAJOR-1 cites NEXT-ROLE.md:30-32 + commit SHAs + Q-R08-SPEC.md sections; MAJOR-2 cites multiple spec sections by name + line numbers; MINOR-1/2/3/4 + OBS-1..5 all cite specific files and lines or commands) |
| Any AC marked PASS without actual verification? | NO. All 31 ACs cite either a Reviewer-run command (typecheck, node --test, grep, ls, git show), a test-name + line number in `test/q07-fleet-correlated.test.ts`, or a verified empirical probe |
| Right-reasons audit completed for 3+ tests? | YES (AC-12, AC-27, AC-8 audited; one redesigned + one new + one inherited covers the surface) |
| Cold-review independence preserved? | YES. Reviewer did NOT consult coordination/diagnostics/, coordination/logs/, or .prompt-*.md files. Q-R08-SPEC-AUDIT.md is the only Architect-emit artifact consulted (consultation is explicitly permitted at the Reviewer's discretion per CLAUDE-REVIEWER.md role block) |
| Adversarial mandate honored? | YES. The MAJOR-1 finding (halt-discipline violation) is a discipline-class finding that does not impact correctness but does impact auditability; flagged because zero findings = failed audit per the mandate. The MAJOR-2 (spec premise error) was found by independent empirical re-verification of the load-bearing factual claim |

---

## 6. Routing recommendation

**STATUS: MERGE-READY** with two MAJOR findings disclosed.

**Rationale**:
- Zero CRITICAL findings (no correctness, security, or data-integrity issues).
- All 31 ACs are PASS or PARTIAL with documented deviations:
  - 29 PASS.
  - 2 PARTIAL (AC-15 + AC-25) downstream of MAJOR-1.
- Production algorithm preserved bit-identical per Q-JC4 framework constraint (R08-SAS-1 + R08-SAS-2 honored).
- Tests pass (93/0 grand total at GREEN HEAD).
- Anti-scope clean (zero R08-SAS clause violations).

**MAJOR findings are documented for Memorial Updater + R09 Architect cycle:**
- MAJOR-1 (Implementer halt-discipline violation): the Implementer reverted Delta 11 silently rather than ESCALATING. The cross-project memorial reinforcement on halt-discipline applies directly. Memorial Updater should append a halt-discipline VIOLATION entry. R09 Architect should fix the spec premise + write the correct AC-15 disposition.
- MAJOR-2 (Architect pre-emit grilling miss): the spec's load-bearing factual claim ("MCD produces zero flags on the clean alternating-pattern signal series") is empirically wrong by 2 ticks per run. Memorial Updater should append an Architect-pre-emit-grilling VIOLATION entry. R09 Architect should run the AC-15 fixture against production code before specifying any further AC-15 disposition.

Per the role-block routing rule ("MAJOR or below → STATUS: MERGE-READY"), R08 routes to Memorial Updater. The two MAJOR findings are discipline-class findings (no functional defect; the Implementer's revert was the right behavioral outcome even though the procedural path was wrong); they belong in the Memorial accumulation, not in a merge-blocking ESCALATE.

---

## 7. Reviewer role boundary statement

Reviewer documented findings only. Did not modify any source/test/spec file, did not author DIAGNOSTIC or coordination artifacts outside this report file, did not fix any finding. MAJOR-1 + MAJOR-2 remediation is queued for Memorial Updater + R09 Architect cycle per role boundary.

---

_Report authored: 2026-05-16. Reviewer cold-review of R08 GREEN HEAD `4ba5e9e` (coordination HEAD `24f945e`). Routing: STATUS: MERGE-READY (two MAJOR discipline-class findings; zero CRITICAL; zero anti-scope violations; all functional ACs PASS or PARTIAL-with-documented-deviation)._
