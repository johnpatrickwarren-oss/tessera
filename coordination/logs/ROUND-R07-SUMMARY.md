# ROUND-R07-SUMMARY — Tessera Phase 1 SLICE 5: Stage 2b FCP-1 + Stage 3b wire format + PR-F8

_Round: R07 | Date: 2026-05-16 | Tier: full (A2 + A7 + A5-partial)_
_Result: MERGE-READY | Score: 26/26 ACs PASS | 0 CRITICAL + 2 MAJOR + 4 MINOR + 4 OBS_

---

## What worked

**Architectural discipline:**
- Brainstorm applied fully: 5 distinct e-process formulations enumerated (Approach A: new file + sequential betting-adaptive; B: refactor pre-pass.ts; C: fixed-alternative LR; D: universal portfolio; E: conditional p_base). PR-F8 mandate (≥3 formulations) satisfied via A+C+D+E=4 formulations with documented rejection rationale for each.
- Cross-section consistency pass: 18 resolved-decision checks executed (7th consecutive Tessera application). All 18 PASS — no token contradictions propagated to Reviewer.
- All standing reinforcements applied: type-declaration-site (15 external symbols verified at declaration sites), re-export-chain-check (9 imports; all direct exports), grep-pattern-soundness (AC-26 pattern analyzed), empirically-verified-test-count (structural pre-determination documented), narrative-vs-pseudocode AC-count cross-check (all four sites agree on 21 ACs), JSDoc-scope-grep (R06 reinforcement; zero delta prescriptions with line-range scope needed — both files are new creates), public-opts-field-coverage (7 fields enumerated, each with binding AC or documented rationale).
- PRD conjunction cross-check: AC-P1 traced via AC-11/12/13 (fleet-FPR Ville bound); AC-P2 traced via AC-20/21 (warm-start wire format triggering R03 reset mechanism).
- Q-JC4b disjoint-data constraint preserved: p_base computed from windows [0,K) only; verified AC-7 + production code.
- Q-JC5 wire format preserved: tessera-fcp1-v1:: prefix + version|seed + fcp1_audit_token; AC-20/21 binding.
- Grilling pre-caught AC-8 fixture-sizing issue (assumption #0): original 10-test-window fixture would not cross the log(1/α_fleet)≈6.908 threshold; revised to 30-test-window fixture with bracket-bound.

**Implementation discipline:**
- Two-commit RED→GREEN sequence genuine: d51abb6 (test-only; TS2307 for missing production file) → 644b845 (production file created). 8th consecutive verifiable Tessera TDD round.
- Zero halt conditions encountered. Q-JC4b and Q-JC5 HALT-bound items had unambiguous implementations per spec pseudocode.
- AC-12/AC-13 OBSERVED=0 correctly surfaced in GREEN commit message with root-cause explanation (martingale property; single-injection accumulation failure). OBSERVED-binding applied per spec authorization.
- Anti-scope clean: 2 new files only; zero modifications to 20 R07-SAS fenced paths. R07-SAS-2 carry-forward (config.ts:228 stale JSDoc) preserved verbatim.
- Binding commands all OBSERVED and reported: typecheck exit 0; q07 pass 21/fail 0; pre-R07 aggregate 70/0; AC-26 grep 0 matches.

**Review discipline:**
- 26/26 ACs verified with direct evidence (named test + file:line or Reviewer-run command); zero PASS rows on "appears correct."
- Right-reasons audit successfully identified AC-12 as SELF-CONFIRMING (first Tessera MAJOR-class right-reasons finding).
- All 5 binding commands run independently at HEAD; 5th consecutive Tessera Reviewer-side execution.
- TDD ordering independently verified; 5th consecutive Tessera Reviewer-side TDD verification.
- Anti-scope independently verified via `git log` against full R07-SAS-1..20 fenced file list.
- Adversarial mandate honored: 10 findings surfaced (2 MAJOR + 4 MINOR + 4 OBS); no rubber-stamp.
- Cold-review boundary held; Reviewer's choice not to load Q-R07-SPEC-AUDIT.md explicitly disclosed.

---

## What violated discipline

| Role | Discipline | Finding | What happened |
|---|---|---|---|
| ARCHITECT | pre-emit-grilling | MAJOR-1 | Grilling corrected AC-8 fixture sizing (10→30 windows; assumption #0) after hand-trace showed the accumulation requirement. The same reasoning (martingale property: log_S unchanged at first post-injection window when λ≈0) applies identically to AC-12 and AC-13, which both use single-window injection at w_inject=100. Neither was revised. Empirical result: 0/30 fires on both H₁ scenarios. PR-F8 power-curve mandate per NEXT-ROLE.md:101 empirically unmet. |
| ARCHITECT | pre-emit-grilling (spec-level right-reasons) | MAJOR-2 | OBSERVED-binding disposition applied to AC-12 and AC-13 without asking whether an order-of-magnitude prediction mismatch (predicted 20-30, observed 0) produces a structurally self-confirming test. It does: a future FIX producing 25/30 fires FAILS; a future bug preserving 0/30 PASSES. The spec-level right-reasons check was not applied to OBSERVED-binding dispositions before routing. Surfaced by Reviewer's right-reasons audit as the SELF-CONFIRMING finding at AC-12. |
| IMPLEMENTER | halt-discipline | MINOR-1 | AC-7 xCounts changed from `[2,3]` → `[2,3,0]` to preserve K=2 intent without HALT + DIAGNOSTIC-R07-ac7-fixture.md. Spec HALT-condition list at Q-R07-SPEC.md:168 authorized tactical-fix precedent for this case. But: the deviation changed a literal fixture value being asserted in a test (not merely an observed-count binding), crossing the borderline where Architect confirmation via DIAGNOSTIC would be appropriate. |

---

## Root cause analysis

**MAJOR-1 (Architect — fixture-sizing not propagated):**
Root cause: The grilling's assumption #0 analysis (accumulation requirement for AC-8) was performed reactively for a specific AC during adversarial re-read. The Architect's grilling discipline found the problem by running a hand-trace for AC-8's fixture parameters. The gap is that no subsequent step asks "are there any OTHER ACs in this spec that use a similar injection pattern and face the same accumulation requirement?" The analysis was local to the triggering AC rather than exhaustive across all empirical e-process ACs. Structural gap: the grilling has no "propagate fixture-sizing reasoning to sibling empirical ACs" step.

**MAJOR-2 (Architect — OBSERVED-binding scope applied too broadly):**
Root cause: The "R06 OBS-1 precedent" was originally designed for small PRNG-drift deviations (fire_window=21 vs. predicted 20). The spec extended it to AC-12/AC-13 without recognizing that the deviation class had changed from "small PRNG drift" to "structural algorithmic gap (detector has no power against single-window injection)." The grilling's unstated-assumptions enumeration listed 9 assumptions but did not include a "right-reasons check on OBSERVED-binding dispositions" step. That check — "would a future FIX matching the prediction FAIL this test?" — is now a required grilling step for any OBSERVED-binding disposition.

**MINOR-1 (Implementer — AC-7 fixture deviation without DIAGNOSTIC):**
Root cause: The AC-7 case is on the boundary between two classes. The HALT-condition list (Q-JC4b, Q-JC5, Q-JC6) covers architectural and semantic violations. A fixture inconsistency where the spec's own math doesn't work out is formally outside that list. The R06 OBS-1 precedent (architect spec-prediction error → tactical fix) was designed for OBSERVED-count cases, but the Implementer applied it to a literal-value fixture case — a slight category drift. The Implementer's fix was correct; the question is whether a DIAGNOSTIC would have been cleaner. Attribution: borderline; the existing reinforcement lacked specific guidance for the literal-fixture-value sub-case.

---

## Reinforcements added

| File | What was added |
|---|---|
| `CLAUDE-ARCHITECT.md` | REINFORCED 2026-05-16: When grilling catches an e-process AC fixture-sizing issue, apply the same accumulation-requirement analysis to ALL other empirical e-process ACs in the same spec. Detected tessera R07 MAJOR-1. |
| `CLAUDE-ARCHITECT.md` | REINFORCED 2026-05-16: OBSERVED-binding disposition scoped to PRNG-drift-class only; must NOT be applied when OBSERVED and PREDICTED diverge by an order of magnitude. Pre-emit grilling must ask: "would a future FIX matching the prediction FAIL this test?" Detected tessera R07 MAJOR-2. |
| `CLAUDE-IMPLEMENTER.md` | REINFORCED 2026-05-16: When a spec fixture deviation changes a literal asserted fixture value (vs. binding OBSERVED output count), treat as borderline HALT — write DIAGNOSTIC for Architect confirmation. Detected tessera R07 MINOR-1. |
| `CROSS-PROJECT-MEMORIAL.md` | Two new reinforcement rules derived: fixture-sizing propagation (exhaustive application to all empirical e-process ACs); OBSERVED-binding scope (scoped to PRNG-drift; order-of-magnitude divergence requires redesign or explicit scope documentation). |

REINFORCED line counts after R07:
- CLAUDE-ARCHITECT.md: 11 lines (well under 30 — no consolidation needed)
- CLAUDE-IMPLEMENTER.md: 11 lines (well under 30 — no consolidation needed)
- CLAUDE-REVIEWER.md: 0 lines
- CLAUDE-COMMON.md: 0 lines
- CLAUDE-MEMORIAL.md: 0 lines

---

## Watch list for next round (R08+)

1. **MAJOR-1 residual (PR-F8 power gap):** FCP-1 demonstrates zero empirical power against single-window fleet events. AC-12/AC-13 bind OBSERVED=0. Before Phase 1 close, these fixtures must be redesigned using one of the Reviewer's four options: Option A (sustained multi-window injection, AC-8 style); Option B (add AC-12.5/AC-13.5 with sustained injection, preserve single-injection as FPR-under-perturbation); Option C (algorithmic redesign — GROW mixture or static λ; Phase 2 candidate); Option D (explicit scope documentation: FCP-1 detects sustained fleet events; transient single-window events out of scope for SLICE 5).

2. **MAJOR-2 residual (self-confirming AC-11/12/13):** AC-11 (`firedCount===0` via strict equality) is brittle — Ville-bound variation could produce 1 fire of 30; strict equality would fail despite being statistically correct. AC-12/AC-13 assertions bind OBSERVED=0 inversely (fix fails; bug passes). Future fix requires: AC-11 → `firedCount <= 1`; AC-12/AC-13 → `firedCount >= some_threshold` derived from theoretical power, NOT from observed value.

3. **MINOR-1 residual (spec fixture AC-7):** Spec Q-R07-SPEC.md:842 is now internally inconsistent with the implementation (spec says xCounts=[2,3], implementation uses [2,3,0]). Future Architect touching this spec section should correct the prose.

4. **MINOR-2 residual (AC-5/6 unused xw tuple element):** `test/q07-fleet-correlated.test.ts:168,198` destructures `[wi, xw]` but never uses `xw`. Minor clarity issue; fix: use `for (const wi of [2, 3, 4])`.

5. **MINOR-3 residual (AC-15 weak length assertion):** `curatedLen <= origLen` should be `=== origLen` for the clean-fleet scenario where no Stage 2a contamination exists and no Stage 2b drop should occur.

6. **OBS-2 residual (skipped_no_signals not in D11 audit):** `n_runs_skipped_no_signals` not exposed in D11 output_summary. Operator observability gap; risk assessed as low per spec authorization.

7. **R06 MINOR-1 carry-forward (config.ts:228 stale JSDoc):** `engine/types/config.ts:228` still reads "(D1-D10)" after R06 Delta 1 extended to D1-D13. Preserved as R07-SAS-2 carry-forward. First post-SLICE-5-close round should fix this.

8. **Architect: new OBSERVED-binding grilling step** — For any spec round that uses OBSERVED-binding dispositions, the grilling must include: "if this AC binds OBSERVED=X, would a future implementation FIX matching the architect prediction FAIL this test?" This is now a standing grilling requirement.

9. **Architect: fixture-sizing exhaustive propagation** — For any spec round with multiple empirical e-process ACs, after fixing any fixture-sizing issue for one AC, explicitly check all other ACs for the same accumulation requirement.

---

## Emerging cross-project patterns

1. **6-round 0-CRITICAL streak (Tessera R02–R07):** Continues. Both MAJOR findings are spec-design issues, not runtime correctness failures or implementation bugs. The quality bar for Implementer execution remains high.

2. **OBSERVED-binding misapplication risk:** This is the first tessera round where the OBSERVED-binding disposition, designed for a specific narrow use case (PRNG drift), was misapplied to a qualitatively different failure class (structural algorithmic gap). The pattern has no prior tessera history but mirrors the "tactic applied beyond its design scope" failure mode seen in other disciplines (e.g., "tactical-autonomy policy" scope boundary in R10 my-first-build). Two new reinforcements directly address this.

3. **Grilling-local-to-global gap:** The AC-8 grilling fix demonstrates that adversarial grilling can find fixture issues reactively (for the AC currently under analysis). What it doesn't do automatically is propagate the discovered reasoning to sibling ACs. This is a new structural gap in the grilling discipline: analysis findings should trigger an exhaustive scan for analogous cases. The new reinforcement addresses this explicitly.

4. **Reviewer cold-review vs. spec-audit sidecar:** First tessera round with disclosed choice to not load the sidecar. MAJOR findings surfaced without it. This confirms that cold adversarial review of spec + production code is sufficient for detecting MAJOR-class issues; the sidecar provides Architect reasoning context but is not load-bearing for the Reviewer's adversarial mandate.

5. **Reviewer-side binding-command execution** (R06+ standing policy): 5th consecutive Tessera round. Pattern is fully institutionalized and has never missed a discrepancy in this project.
