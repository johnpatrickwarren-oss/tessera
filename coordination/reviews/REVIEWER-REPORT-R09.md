# REVIEWER-REPORT-R09 — Tessera audit-tier cleanup round

_From: Reviewer (cold cold-context; CLAUDE-COMMON.md + CLAUDE-REVIEWER.md disciplines active)._
_Tier: audit (Implementer self-spec; no separate Architect)._
_HEAD at review: `c1116b9` (chore(R09): record attestation SHA 640c8e8 in NEXT-ROLE.md)._
_GREEN HEAD: `59f2084` (feat(R09-GREEN): fix Q-R08-SPEC.md primitive 11 wrong spec premise)._
_Attestation SHA: `640c8e8`._
_Inputs cold-read: PRD.md, Q-R09-SPEC.md (full), Q-R08-SPEC.md (full — load-bearing for AC-R09-1 verification), test/q07-fleet-correlated.test.ts (full), git log/diff `28fc4a1..HEAD`, CROSS-PROJECT-MEMORIAL.md (Reviewer section + tessera-R07/R08 history)._
_NOT consulted (cold-review boundary held)_: coordination/diagnostics/, coordination/logs/, any .prompt-*.md file, REVIEWER-REPORT-R08.md._

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line) |
|---|---|---|---|
| **AC-R09-1** | Q-R08-SPEC.md primitive 11 spec premise corrected | **PARTIAL** | `grep -c "produces zero contamination flags" coordination/specs/Q-R08-SPEC.md` → 0 (the literal phrase is gone); primitive 11 at Q-R08-SPEC.md:74 now contains the R09 EMPIRICAL CORRECTION addendum with n_ticks_contaminated=6 + origLen=8/curatedLen=6 documentation. **HOWEVER**: the same false premise still appears at Q-R08-SPEC.md:24 ("clean fleet should preserve full length exactly when neither Stage 2a nor Stage 2b drops anything"), :94 (cross-section consistency row 11 still asserts "tighten AC-15 `<= origLen` to `=== origLen`" + "Pseudocode uses `assert.strictEqual`"), :103 ("All 18 checks PASS at spec-emit time" is now stale), :563 ("MCD on the alternating-pattern signals produces zero flags" — equivalent false claim, just without the word "contamination"), :592 (AC-15 still bound as `length === bundle.runs[k].signal_series.a.length` exactly with parenthetical "clean fleet has no Stage 2a or Stage 2b drops"). See MAJOR-1. |
| **AC-R09-2** | AC-15 n_ticks_contaminated===6 binding added; existing loop preserved; 23/0 pass | **PASS** | `assert.strictEqual(result.decisions.D11!.output_summary.n_ticks_contaminated, 6, ...)` at test/q07-fleet-correlated.test.ts:363-364; `assert.ok(curatedLen <= origLen, ...)` loop preserved at :366-370. Reviewer-run `node --test test/q07-fleet-correlated.test.js` → tests 23 / pass 23 / fail 0. |
| **AC-R09-3** | AC-11 tightened from `=== 0` to `<= 1`; passes at GREEN | **PASS** | `grep -n "strictEqual(firedCount, 0)" test/q07-fleet-correlated.test.ts` → 0 matches (verified by Reviewer); `assert.ok(firedCount <= 1, ...)` at test/q07-fleet-correlated.test.ts:291; passes at GREEN (q07 23/0). |
| **AC-R09-4** | PRD trace documented in spec §2 Decision B | **PASS** | Q-R09-SPEC.md:56-70 (Decision B) reads "AC-P1's text … is a Type-I error bound claim with no detection-scope content. SCOPING-MEMO-BASELINE-CURATION-v0.3.md § 1.1 is the canonical detection-scope document; the two are orthogonal. No PRD amendment is correct." Cross-checked against PRD.md:43 (AC-P1 text: "per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)") — confirmed FPR-only; no detection-scope claim. |
| **AC-R09-5** | Implementer did NOT modify CLAUDE-COMMON.md | **PASS** | `git diff 28fc4a1..HEAD --name-only` → coordination/MEMORIAL.md, coordination/NEXT-ROLE.md, coordination/specs/Q-R08-SPEC.md, coordination/specs/Q-R09-SPEC.md, test/q07-fleet-correlated.test.ts. CLAUDE-COMMON.md NOT present. Item 4 correctly deferred to Memorial Updater. |
| **AC-R09-6** | Reinforcement quality assessment in NEXT-ROLE.md for all 7 R06+R07+R08 REINFORCED lines | **PASS** | NEXT-ROLE.md:42-59 contains per-line assessment for all 4 ARCHITECT + 3 IMPLEMENTER REINFORCED lines, with watch-list recommendation. No line marked "recommend-refinement" (all 7 assessed actionable). |

**Reviewer-independent binding-command verification** (Tessera R06+ standing policy; 4th consecutive Reviewer-side run):

| Surface | Command | OBSERVED | Implementer-reported | Match |
|---|---|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 | exit 0 | ✓ |
| q07 | `node --test test/q07-fleet-correlated.test.js` | 23 pass / 0 fail | 23 / 0 | ✓ |
| Pre-R09 files | `node --test test/q01-vendoring + q01-no-at-pin + q01-schema + q02-schema + q03-warm-start + q04-welford + q05-per-shard + q06-baseline + betting-e-process` | 70 pass / 0 fail | 70 / 0 | ✓ |
| Grand total | | **93 / 0** | 93 / 0 | ✓ |

All binding-command counts match Implementer attestation exactly. Attestation discipline preserved.

---

## 2. Findings

### MAJOR

**MAJOR-1 — Spec premise correction is incomplete; Q-R08-SPEC.md is now internally inconsistent across 5 surfaces.**

R09 AC-R09-1's verification command (`grep -c "produces zero contamination flags"` → 0) is too narrow. The literal phrase is gone from primitive 11 at Q-R08-SPEC.md:74, but the SAME load-bearing false premise (or its prescribed downstream consequences) persists at five other surfaces in the same file:

1. **Q-R08-SPEC.md:24 (spec preamble)** — "R07 MINOR-3: AC-15 `<= origLen` length assertion — tighten to `=== origLen` (clean fleet should preserve full length exactly when neither Stage 2a nor Stage 2b drops anything)." The parenthetical "neither Stage 2a nor Stage 2b drops anything" encodes the now-disproven premise.

2. **Q-R08-SPEC.md:94 (cross-section consistency table row 11)** — still asserts "R07 MINOR-3 closed: tighten AC-15 `<= origLen` to `=== origLen` — per D-R08-11" with "Verified absent from rejected form" column reading "Pseudocode uses `assert.strictEqual`". After R09's primitive 11 correction, the pseudocode no longer prescribes `assert.strictEqual` (the prescription was reverted), so this row's verification claim is stale.

3. **Q-R08-SPEC.md:103** — the immediately-following claim "All 18 checks PASS at spec-emit time" is now stale because row 11's "Verified absent from rejected form" no longer matches the corrected primitive 11.

4. **Q-R08-SPEC.md:563 (§ Per-file pseudocode Delta 11 final sentence)** — "The clean-fleet fixture (current lines 322-330) has no Stage 2a contamination (MCD on the alternating-pattern signals produces zero flags) AND no Stage 2b fire (fcp1State.fired===false verified at line 332) → post-curation length must equal original length exactly." This is the same factual claim as primitive 11's pre-correction premise, just paraphrased to say "produces zero flags" (without the word "contamination") — which slips past R09's narrow grep verification. The cited conclusion ("length must equal original length exactly") is also false (curatedLen=6 ≠ origLen=8).

5. **Q-R08-SPEC.md:592 (§ Acceptance criteria AC-15)** — still binds AC-15 to "for each run, `result.curatedBundle.runs[k].signal_series.a.length === bundle.runs[k].signal_series.a.length` exactly (length preserved exactly; clean fleet has no Stage 2a or Stage 2b drops). Tightened from R07's `<= origLen`." The actual test at q07-fleet-correlated.test.ts:369 binds `curatedLen <= origLen`, NOT strict equality. So Q-R08-SPEC.md's stated AC-15 acceptance binding diverges from what was actually implemented.

**Why this is MAJOR rather than MINOR**: a future round (or auditor) reading Q-R08-SPEC.md without specifically scrolling to primitive 11's R09 addendum will encounter four other locations that confidently assert the wrong premise and the wrong implemented binding. The same chain failure mode that produced R08 MAJOR-1/MAJOR-2 (wrong spec premise → downstream discipline violation) is now re-introduced one level removed: the spec is internally inconsistent, with the "corrected" addendum at one location and the "uncorrected" original premise at five others.

**Why this is not CRITICAL**: production code is unchanged and correct; tests pass; q07 23/0; no data-integrity or behavioral issue. The defect is documentation consistency in a closed prior-round spec.

**Root cause**: R09's brainstorm in Q-R09-SPEC.md § 2 Decision A only considered the binding form for AC-15 (approaches α/β/γ for the TEST file); it did not enumerate the propagation surfaces in Q-R08-SPEC.md (preamble bullet / cross-section table / Delta 11 pseudocode / AC-15 spec text / "All 18 checks PASS" summary). AC-R09-1's "grep → 0" verifier was tightly scoped to one literal string and did not extend to equivalent paraphrasings or downstream surfaces that cite the corrected primitive.

**Reviewer cannot fix per role boundary**. Recommended R10 disposition: amend Q-R08-SPEC.md at the 5 listed locations to (a) reflect the R09 empirical correction at each surface or (b) add cross-references pointing to the primitive-11 addendum.

### MINOR

**MINOR-1 — AC-R09-2 test-message wording is slightly imprecise.**

test/q07-fleet-correlated.test.ts:364 reads `'MCD flags 2 ticks per run on clean-fleet-v1 fixture: n_ticks_contaminated must be 6'`. The fixture is actually labeled `'q07-clean-fleet-v1'` (line 349) — the message drops the `q07-` prefix. Not a correctness issue; would not affect a failure message's usefulness. OBS-level if not for the slight precision gap.

**MINOR-2 — AC-R09-1 grep verifier is structurally too narrow.**

Q-R09-SPEC.md:105 specifies the AC-R09-1 verification as `grep -c "produces zero contamination flags" coordination/specs/Q-R08-SPEC.md → 0`. The R09 correction text at primitive 11 specifically uses the wording "zero Stage 2a contamination flags" (note the inserted "Stage 2a"). Two implications: (a) the grep would have returned 0 even if the Implementer had only added the correction addendum WITHOUT removing the original phrase (the addendum uses "zero Stage 2a contamination flags" which doesn't match the literal "produces zero contamination flags"), so the grep is a weak right-reasons binding; (b) the grep does not catch the line 563 paraphrase "produces zero flags" (MAJOR-1 finding 4 above). Spec verifier discipline reinforcement: when correcting a wrong factual claim, the verifier grep should also enumerate semantic paraphrases, not just the literal exact-string occurrence.

**MINOR-3 — NEXT-ROLE.md attestation table omits the version label for one binding-command count.**

NEXT-ROLE.md:14-25 reports the binding-command counts but does not record the HEAD SHA at which `node --test` was run (only the GREEN-HEAD reference is at line 11 prose). Standing R02+ reinforcement is to record per-table what HEAD the counts were observed at. Cosmetic; doesn't affect verifiability since SHA is in the prose immediately above.

### OBS

**OBS-1** — TDD ordering verified: RED `7d024de` (only `test/q07-fleet-correlated.test.ts` modified; 14 lines: 10 ins / 4 del) precedes GREEN `59f2084` (`coordination/specs/Q-R08-SPEC.md` only; 1 ins / 1 del) by ~2 min wall-clock. Test changes pass at RED because production already produces correct values for both AC-11 (FPR ≤ 1) and AC-15 (n_ticks_contaminated=6) — this is the R08-precedent "test-redesign-only round; no failing test required at RED" pattern, correctly identified in Q-R09-SPEC.md § 3 and MEMORIAL.md:897. 4th consecutive Tessera Reviewer-side TDD verification (R03/R04/R05/R06/R07/R08/R09 — actually 7th).

**OBS-2** — Role-boundary clean: Implementer modified exactly 2 files in scope (`test/q07-fleet-correlated.test.ts` + `coordination/specs/Q-R08-SPEC.md`) plus coordination artifacts. CLAUDE-COMMON.md correctly deferred to Memorial Updater per R09-SAS-2. All 8 R09-SAS clauses honored per `git diff 28fc4a1..HEAD --name-only`.

**OBS-3** — Reinforcement-quality assessment at NEXT-ROLE.md:42-59 is thorough and recommends no immediate sharpening. The Implementer correctly judged the R07 MAJOR-1 "fixture-sizing propagation" reinforcement as functionally clear but candidate for sharpening on recurrence — that judgment is sound. Memorial Updater inputs to consider: no action required this round.

**OBS-4** — The R09 round demonstrates that audit-tier self-spec is a workable mode for tactical-followup work (5 root-cause closures bundled). The brainstorm + design + ACs format produced a well-bounded round that took ~2 min between RED and GREEN with zero halt conditions. Methodological pattern worth memorializing.

**OBS-5** — AC-R09-6 documents that Implementer judges all 7 REINFORCED lines as actionable. Spot-check: each of the 7 lines does contain a "Why" + "How to apply" structure, and each is traceable to a specific prior violation. The assessment is sound.

**OBS-6** — Approach (γ) selected for AC-15 binding (per Q-R09-SPEC.md § 2 Decision A) is sound: decouples the "Stage 2b doesn't fire" claim (preserved as `<= origLen` loop) from the "MCD flags exactly 6 ticks total" claim (new n_ticks_contaminated assertion). The brainstorm correctly identified that the operator's NEXT-ROLE.md instruction (`=== origLen - 6`) contained an arithmetic error (origLen=8; 8-6=2, not 6=curatedLen) and substituted a sound alternative. This is exactly the tactical-autonomy-with-disclosure pattern the methodology authorizes.

---

## 3. Right-reasons audit

### Test 1 — AC-R09-3 / AC-11 `firedCount <= 1` (q07-fleet-correlated.test.ts:281-292)

- **Spec requirement traced to**: Q-R09-SPEC.md AC-R09-3 ("AC-11 tightened to `<= 1`; passes at GREEN").
- **Self-confirming analysis**: NOT self-confirming. The test runs 30 H₀ trials at p=0.025 with α_fleet=1e-3 and asserts `firedCount <= 1`. A future regression that broke the Ville bound and produced 5/30 fires at H₀ would FAIL this test (5 > 1). A future regression that produced 0/30 fires (correct behavior) would PASS. The bound is theoretically motivated (Ville bound: expected ≈ 0.03 fires per α=1e-3 × 30 trials), not OBSERVED-pinned, so a future implementation change that preserved the bound would pass even with PRNG-drift variation. ✓

### Test 2 — AC-R09-2 / AC-15 `n_ticks_contaminated === 6` (q07-fleet-correlated.test.ts:363-364)

- **Spec requirement traced to**: Q-R09-SPEC.md AC-R09-2 ("`assert.strictEqual(result.decisions.D11!.output_summary.n_ticks_contaminated, 6)` appears in the AC-15 test body and passes").
- **Self-confirming analysis**: PARTIALLY self-confirming, in the OBSERVED-binding sense. The value 6 was determined by the Implementer running `curateBaselineFleetCorrelated` against the clean-fleet-v1 fixture and reporting the observed output (Q-R09-SPEC.md § 2 Decision A "Empirical verification" block). However, this is exactly the OBSERVED-binding pattern that the tessera-R07 MAJOR-2 reinforcement (`OBSERVED-binding scope`) authorizes for low-variance-drift cases: MCD on a fixed deterministic fixture should produce the same count on repeated runs (no PRNG involved at MCD-screening time; the bundle is fixed at line 91-101). The right-reasons check from CLAUDE-COMMON.md asks "would a future implementation FIX matching architect prediction FAIL this test?" — but there is no architect-predicted alternative value here (the prior spec premise was "0", which is now disproven; "6" is the empirically-correct value, not a prediction-vs-observation mismatch). Spot-check: if MCD's behavior changed (e.g., shrinkage adjustment) and produced 8 ticks contaminated, the test would correctly fail. The assertion is a deterministic-fixture binding, not a power-curve OBSERVED-binding. Borderline-but-acceptable under the R07 MAJOR-2 scope ("PRNG-drift-class prediction errors" — not applicable here since no PRNG is involved at MCD time; the binding is to a fixed deterministic fixture). ✓ — flag for Memorial Updater consideration if a pattern emerges of OBSERVED-binding on fixed-fixture MCD outputs.

### Test 3 — AC-R09-1 / Q-R08-SPEC.md primitive 11 grep verification

- **Spec requirement traced to**: Q-R09-SPEC.md AC-R09-1 ("the phrase 'produces zero contamination flags' does NOT appear in Q-R08-SPEC.md; and the replacement text documents …").
- **Self-confirming analysis**: SELF-CONFIRMING-ADJACENT, surfaced as MINOR-2 above. The grep verifier matches only a literal exact-phrase substring. The Implementer wrote a correction at primitive 11 that uses semantically similar but not-literal-matching text ("zero Stage 2a contamination flags"), and the same false premise persists at line 563 in a different paraphrasing ("produces zero flags"). The grep test as worded would PASS on a "fix" that removed the literal phrase but added a new wrong claim. NOT NOT-self-confirming, but its scope is narrower than the AC's stated intent ("correct the wrong spec premise"). Surfaced separately as MAJOR-1 (incomplete correction) + MINOR-2 (narrow verifier). The right-reasons audit successfully surfaced the MAJOR-class incompleteness within its 3-test sample — the same pattern as tessera R07 right-reasons audit surfacing MAJOR-2 within its 3-test sample.

---

## 4. Cross-cutting checks

### TDD discipline

- RED commit `7d024de` modifies only `test/q07-fleet-correlated.test.ts` (10 ins / 4 del). Test changes pass at RED because production behavior already matches both new assertions (no algorithmic change required). This is the R08-precedent "test-redesign-only round; RED state without failing tests" pattern, explicitly authorized by the R09 spec's framing as a non-behavior-change round. Documented in MEMORIAL.md:897.
- GREEN commit `59f2084` modifies only `coordination/specs/Q-R08-SPEC.md` (1 ins / 1 del — the primitive 11 addendum). No behavior change. q07 23/0 + pre-R09 70/0 = 93/0 unchanged from R08 baseline.
- 7th consecutive Tessera round of Reviewer-independent TDD ordering verification (R03/R04/R05/R06/R07/R08/R09). Pattern is a permanent quality gate.

### Halt-discipline / no-skip

- Zero halt conditions encountered. Item 4 (CLAUDE-COMMON.md) correctly deferred to Memorial Updater per R09-SAS-2 — not silently absorbed, not silently skipped, explicitly routed.
- No DIAGNOSTIC files written (none required; no spec-reality conflicts that triggered halt protocol).
- The Implementer's brainstorm correctly identified the arithmetic error in the operator's NEXT-ROLE.md instruction (`=== origLen - 6` is wrong arithmetic for origLen=8) and selected a sound alternative (approach γ) instead of mechanically applying the wrong instruction. This is correctly classified as a brainstorm-level resolution (not a halt-trigger) because the operator's broader intent (close OQ-R08-1 via tighter AC-15 binding) was clear and approach γ achieves it.

### Anti-scope

- All 8 R09-SAS clauses honored per Reviewer's independent git diff:
  - R09-SAS-1 (no production algorithm modification): `tools/curate-baseline-fleet-correlated.ts` UNMODIFIED; `engine/per-shard/*` UNMODIFIED ✓
  - R09-SAS-2 (no CLAUDE-COMMON.md by Implementer): confirmed absent from diff ✓
  - R09-SAS-3 (no pre-R07 test file modifications): only `test/q07-fleet-correlated.test.ts` modified ✓
  - R09-SAS-4 (no PRD amendment): `coordination/PRD.md` UNMODIFIED ✓
  - R09-SAS-5 (no schema/tsconfig/package changes): all UNMODIFIED ✓
  - R09-SAS-6 (no new ACs/tests/modules): zero new tests added; q07 count remains 23 ✓
  - R09-SAS-7 (no v0.3 memo or pre-disposition changes): both UNMODIFIED ✓
  - R09-SAS-8 (operator gate items not addressed): OQ-1/Q-JC1, OQ-R08-3, Anchor PR #35/#37 not touched ✓

### Role boundary

- Implementer modified exactly 2 spec-listed files + 3 coordination artifacts (NEXT-ROLE.md, MEMORIAL.md, Q-R09-SPEC.md). Zero out-of-scope edits.
- Reviewer modifies zero files (this report only). MAJOR-1 disposition explicitly deferred to R10 / Memorial Updater per role boundary.
- Tessera role-boundary discipline preserved for the 9th consecutive round.

---

## 5. Grilling output (on this report, before routing)

| Check | Result |
|---|---|
| Every finding has a file:line reference? | YES — MAJOR-1 cites Q-R08-SPEC.md:24, :94, :103, :563, :592; MINOR-1 cites test/q07-fleet-correlated.test.ts:349, :364; MINOR-2 cites Q-R09-SPEC.md:105; MINOR-3 cites NEXT-ROLE.md:14-25; all OBS items cite specific commits/lines/SHAs. |
| Any AC marked PASS without actual verification? | NO — AC-R09-1 marked PARTIAL with explicit residual-defect enumeration; AC-R09-2 through AC-R09-6 marked PASS with Reviewer-run grep + test commands + file:line evidence; all 4 binding-command counts independently Reviewer-run and matched against Implementer attestation. |
| Right-reasons audit completed for 3+ tests? | YES — AC-R09-3 (NOT self-confirming), AC-R09-2 (PARTIALLY self-confirming on OBSERVED-binding-borderline; spot-checked as acceptable under R07 MAJOR-2 scope), AC-R09-1 grep verifier (SELF-CONFIRMING-ADJACENT; surfaced MAJOR-1 + MINOR-2). |
| Adversarial mandate honored? | YES — MAJOR-1 surfaced via independent grep + line-walk of Q-R08-SPEC.md beyond the AC-R09-1 verifier's literal-string scope; not a rubber-stamp report. |
| Cold-review boundary held? | YES — did NOT consult coordination/diagnostics/, coordination/logs/, .prompt-*.md files, or REVIEWER-REPORT-R08.md. |
| Reviewer-independent binding-command verification? | YES — `npm run typecheck` + `node --test` independently re-run; counts match attestation 100%. 4th consecutive R06+ standing-policy application. |

All grilling checks PASS. Routing safe.

---

## Routing

**STATUS: MERGE-READY**

CRITICAL findings: 0
MAJOR findings: 1 (Q-R08-SPEC.md incomplete spec-premise correction — documentation consistency issue in a closed prior-round spec; production behavior and tests are correct).
MINOR findings: 3
OBS findings: 6

Per CLAUDE-REVIEWER.md routing: "MAJOR or below → STATUS: MERGE-READY". MAJOR-1 is recommended for R10 disposition (audit-tier cleanup round to amend the 5 residual Q-R08-SPEC.md surfaces; bundle with any other R09 leftovers).

The R09 round itself is sound: production unchanged, tests passing, anti-scope clean, role boundaries held, TDD ordering verified. The MAJOR-1 finding reflects an incomplete correction scope — the corrected primitive 11 addendum is sound, but four sibling surfaces in the same spec file were not updated.

---

_Report authored: 2026-05-16. Reviewer cold-context audit. Next role: Memorial Updater._
