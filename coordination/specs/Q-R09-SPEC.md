# Q-R09-SPEC — Tessera R09 audit-tier cleanup: AC-15 spec-premise fix + AC-11 tightening + PRD trace + Item 4 gate + reinforcement review

_From: Implementer (R09 audit-tier; self-spec)._
_To: Reviewer._
_Date: 2026-05-16._
_HEAD at spec emit: `28fc4a1` (chore(R09): prepare audit-tier cleanup round bundling 5 root-cause items)._
_Tier: audit (operator-set; S4 + S2; all A-factors false)._

---

## 1. Goal

This round delivers five tactical follow-ups that address the root causes of R07–R08 MAJOR findings:

1. Empirically verify the AC-15 fixture behavior, correct the wrong spec premise in Q-R08-SPEC.md § Mechanism primitive 11, and add a binding assertion that documents the MCD's actual behavior on the clean-fleet fixture.
2. Tighten the AC-11 H₀ FPR binding from strict-equality to `<= 1` (closes OQ-R08-1).
3. Verify PRD AC-P1 compatibility with the v0.3 sustained-event scope narrowing and document the trace.
4. Gate CLAUDE-COMMON.md Item 4 write to Memorial Updater (Implementer does NOT write CLAUDE-COMMON.md; this item is Memorial Updater scope only).
5. Review the R06+R07+R08 REINFORCED lines for actionability and document the assessment.

---

## 2. Brainstorm (per audit-tier discipline)

### Decision A — AC-15 binding form (Item 1)

Three distinct approaches considered:

**Approach (α): Keep existing `<= origLen` loop only.**
- Strength: already passing; zero PRNG risk; no new binding required.
- Weakness: doesn't document the actual MCD behavior (2 ticks dropped per run); doesn't advance from the weak form.
- Risk: leaves the spec premise correction without a corresponding test binding; the "spec premise wrong" finding persists as documentation-only.

**Approach (β): Tighten per-run loop to `=== origLen - 2`.**
- Strength: tight empirical binding per run.
- Weakness: PRNG/fixture fragile; if MCD behavior changes with different signal patterns the binding breaks.
- Note: NEXT-ROLE.md wrote `=== origLen - 6` which is incorrect arithmetic (origLen=8; `8-6=2 ≠ 6=curatedLen`). The correct form per empirical observation would be `=== origLen - 2` per run. The operator's description contains an arithmetic error in option (β).
- Risk: tight binding without strong theoretical justification for EXACTLY 2 ticks.

**Approach (γ): Keep `<= origLen` loop + add `n_ticks_contaminated === 6` assertion.**
- Strength: decouples the "Stage 2b doesn't fire" claim (loop, preserved as-is) from the "MCD flags exactly 6 ticks total" claim (new D11 assertion). The D11 assertion directly documents the empirical finding about MCD's behavior without per-run PRNG fragility.
- Weakness: one additional assertion line; slightly more coupling to exact MCD behavior count.
- Risk: if MCD behavior changes (e.g., different signal variance causes it to flag different ticks), the binding breaks — but that's the intended behavior of a binding.

**Selected: (γ).** The `n_ticks_contaminated === 6` assertion directly encodes the corrected spec premise as a verifiable binding. The `<= origLen` loop is preserved as the weaker-but-passing "no Stage 2b drop" evidence. Together they document both claims cleanly.

**Empirical verification (run before spec emit):**
```
node -e "const {curateBaselineFleetCorrelated} = require('./tools/curate-baseline-fleet-correlated.js'); ..."
```
Result: `fcp1State.fired: false`, `D11.n_ticks_contaminated: 6`, `origLen=8 curatedLen=6` per run.
OBSERVED binding is sound.

---

### Decision B — PRD AC-P1 amendment (Item 3)

Three approaches:

**Approach A: Amend AC-P1 prose to reference sustained-event scope.**
- Weakness: AC-P1 is a FPR-bounds AC ("Ville bound preserved AND e-BH fleet FPR ≤ q·K"). It makes no detection-scope claim. Inserting scope language into a FPR AC would conflate two orthogonal properties.

**Approach B: Leave AC-P1 unchanged; document trace in spec.**
- Strength: correct separation of concerns. FPR bounds hold regardless of whether FCP-1 detects transient or sustained events. The v0.3 narrowing is a detection-power claim, not a FPR claim. No conflict exists.
- Weakness: none — the trace documentation is the right artifact.

**Approach C: Add parenthetical reference to v0.3 in AC-P1.**
- Risk: introduces unnecessary coupling between a FPR AC and a detection-scope memo; PRD thin-pointer convention allows AC-P1 to point to pair-review tests without enumerating detection scope.

**Selected: Approach B.** AC-P1's text ("per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)") is a Type-I error bound claim with no detection-scope content. SCOPING-MEMO-BASELINE-CURATION-v0.3.md § 1.1 is the canonical detection-scope document; the two are orthogonal. No PRD amendment is correct. The trace is documented in §2 of this spec.

---

## 3. Design (component sketch)

**What exists:** `test/q07-fleet-correlated.test.ts` (23 tests at R08 GREEN); `coordination/specs/Q-R08-SPEC.md` (wrong premise at § Mechanism primitive 11); `CLAUDE-COMMON.md` (0 REINFORCED lines); `coordination/PRD.md` (AC-P1 is FPR-bounds only).

**What changes:**
- `test/q07-fleet-correlated.test.ts` — 2 edits: (a) AC-11 `strictEqual(firedCount, 0)` → `ok(firedCount <= 1, ...)` and (b) AC-15 adds `assert.strictEqual(result.decisions.D11!.output_summary.n_ticks_contaminated, 6)` assertion.
- `coordination/specs/Q-R08-SPEC.md` — 1 edit: § Mechanism primitive 11 corrects "produces zero contamination flags" to the empirically-correct claim.

**What is NOT changed:**
- `coordination/PRD.md` — no amendment needed (Item 3 resolved by documentation here)
- `CLAUDE-COMMON.md` — Memorial Updater writes Item 4; Implementer role boundary prohibits this edit
- Any production algorithm file

**Integration points:**
- AC-11 change: from `assert.strictEqual` to `assert.ok` — weaker assertion; currently-passing tests remain passing.
- AC-15 change: adds one new assertion using `result.decisions.D11!.output_summary.n_ticks_contaminated` — this field is already produced by production; empirically confirmed === 6.
- Q-R08-SPEC.md edit: documentation only; no code compilation affected.

**Failure modes at each integration point:**
- AC-11: none — loosening a passing assertion cannot fail.
- AC-15 new assertion: fails only if production MCD behavior changes and n_ticks_contaminated ≠ 6. Acceptable — that is the intended binding.
- Q-R08-SPEC.md: documentation edit; no runtime failure possible.

---

## 4. Acceptance criteria

**AC-R09-1 (Item 1 — spec premise corrected)**
Given: `coordination/specs/Q-R08-SPEC.md` § Mechanism primitive 11 (D-R08-11).
When: the text is searched for the false claim about MCD behavior.
Then: the phrase "produces zero contamination flags (no Stage 2a drop)" does NOT appear in Q-R08-SPEC.md; and the replacement text documents that MCD flags 2 ticks per run on the clean alternating-pattern fixture (n_ticks_contaminated=6 across 3 runs; origLen=8/run, curatedLen=6/run) as the empirically-correct premise.
_Verified by: `grep -c "produces zero contamination flags" coordination/specs/Q-R08-SPEC.md` → 0._

**AC-R09-2 (Item 1 — AC-15 n_ticks_contaminated binding added)**
Given: `test/q07-fleet-correlated.test.ts` AC-15 test body.
When: the `curateBaselineFleetCorrelated` clean-fleet-v1 bundle is run.
Then: `assert.strictEqual(result.decisions.D11!.output_summary.n_ticks_contaminated, 6)` appears in the AC-15 test body and passes; the existing `assert.ok(curatedLen <= origLen, ...)` loop is preserved.
_Verified by: grep for `n_ticks_contaminated.*6` in AC-15 test body; `node --test test/q07-fleet-correlated.test.js` → pass 23, fail 0._

**AC-R09-3 (Item 2 — AC-11 tightened to `<= 1`)**
Given: `test/q07-fleet-correlated.test.ts` AC-11 assertion.
When: the test is run with 30 H₀ trials.
Then: `assert.ok(firedCount <= 1, ...)` is the assertion (NOT `assert.strictEqual(firedCount, 0)`); passes at GREEN.
_Verified by: `grep -n "strictEqual(firedCount, 0)" test/q07-fleet-correlated.test.ts` → 0 matches; `grep -n "firedCount <= 1" test/q07-fleet-correlated.test.ts` → ≥ 1 match including AC-11._

**AC-R09-4 (Item 3 — PRD trace documented)**
Given: `coordination/PRD.md` AC-P1 ("per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)") and `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` § 1.1.
When: evaluated for compatibility.
Then: Q-R09-SPEC.md § 2 Decision B contains the explicit trace documentation: AC-P1 is a FPR-bounds AC (Type-I error); it makes no detection-scope claim; the v0.3 sustained-event narrowing is a detection-power claim; the two are orthogonal; no PRD amendment is required.
_Verified by: Reviewer reads this spec § 2 Decision B + PRD.md:43-45._

**AC-R09-5 (Item 4 — Implementer role boundary preserved)**
Given: the Implementer's R09 git diff.
When: `git diff 28fc4a1..HEAD --name-only` is inspected.
Then: `CLAUDE-COMMON.md` does NOT appear in the diff. Memorial Updater is responsible for Item 4.
_Verified by: Reviewer-run git diff name-only check._

**AC-R09-6 (Item 5 — reinforcement quality assessment in round summary)**
Given: the R06+R07+R08 REINFORCED lines in CLAUDE-ARCHITECT.md (4 additions) and CLAUDE-IMPLEMENTER.md (3 additions).
When: the Implementer reads each line during R09 execution.
Then: `coordination/NEXT-ROLE.md` Implementer-notes section contains a per-line quality assessment (actionable / ambiguous / recommend-refinement) for each of the 7 REINFORCED additions, concluding with a watch-list recommendation for Memorial Updater if any line needs sharpening.
_Verified by: Reviewer reads the NEXT-ROLE.md assessment section._

---

## 5. Anti-scope

- **R09-SAS-1**: NO modification to any production algorithm file (`tools/curate-baseline-fleet-correlated.ts`, `engine/per-shard/warm-start.ts`, `engine/per-shard/welford.ts`, etc.).
- **R09-SAS-2**: NO modification to `CLAUDE-COMMON.md` by the Implementer. This is Memorial Updater territory (Item 4). A HALT condition if attempted.
- **R09-SAS-3**: NO modification to any pre-R07 test files (q01–q06, q03-q05 substrate, betting-e-process smoke).
- **R09-SAS-4**: NO modification to `coordination/PRD.md` (Item 3 resolved by trace documentation in this spec).
- **R09-SAS-5**: NO modification to `engine/types/config.ts`, `tsconfig*.json`, `package.json`, or any schema file.
- **R09-SAS-6**: NO new ACs, no new test files, no new production modules — only targeted edits to the two files in scope.
- **R09-SAS-7**: NO modification to `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.3.md` or the pre-disposition document.
- **R09-SAS-8**: Operator gate items OQ-1 / Q-JC1 (calibrate.ts vendoring), OQ-R08-3 (Phase 2 transient detector scheduling), Anchor PR #35/#37 — all out of scope.

---

## 6. Open questions

None — all resolved:
- Item 1 AC-15 binding form: selected (γ) per brainstorm above.
- Item 3 PRD amendment: selected Approach B (no amendment; trace documented here).
- Item 4 role boundary: explicit — Memorial Updater only; Implementer does not touch CLAUDE-COMMON.md.
- Item 2 AC-11 `<= 1` form: operator-prescribed; no decision required.

---

## 7. Pre-emit grilling (self-review before executing)

| Check | Result |
|---|---|
| Every AC is verifiable by the Reviewer? | YES — AC-1 via grep; AC-2 via grep + test run; AC-3 via grep; AC-4 via reading this spec + PRD; AC-5 via git diff; AC-6 via reading NEXT-ROLE.md. |
| Any AC relies on unstated assumption? | AC-2 assumes production still produces n_ticks_contaminated=6 — empirically verified by running the fixture before spec-emit (confirmed above). |
| Any scope beyond the 5 requested items? | NO — anti-scope ledger explicitly fences all adjacent work. |
| Can Reviewer act with zero clarifying questions? | YES — all decisions made inline; no deferred ambiguities. |
| Does CLAUDE-COMMON.md edit correctly belong to Memorial Updater? | YES — NEXT-ROLE.md explicitly labels Item 4 as "Memorial Updater stage"; Implementer doesn't touch it. |
| Is Item 3 PRD trace documented in verifiable form? | YES — Decision B in §2 is the explicit trace; AC-R09-4 binds Reviewer verification of it. |

Grilling verdict: READY to execute.

---

_Spec authored: 2026-05-16. Implementer self-spec (audit tier). Routing: → Implementer (self)._
