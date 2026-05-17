# ROUND-R14-SUMMARY — Tessera Phase 1 SLICE 2 carry-forwards bundle

_Memorial Updater close — 2026-05-17._
_Tier: audit (Implementer self-spec + Reviewer cold-audit + Memorial Updater). No separate Architect._
_GREEN HEAD: `949b03c`. Attestation chore: `965a260` (SHA-A) → `c8da715` (SHA-B)._

---

## What worked

- **All 18 ACs PASS** (168/168 tests; typecheck exit 0). First audit-tier multi-item bundle with zero CRITICAL and zero MAJOR.
- **Audit-tier self-spec with full brainstorm discipline**: Implementer produced a complete spec (Q-R14-SPEC.md, 271 lines) with ≥3 approaches per item, rejection rationale, design phase (component boundaries + integration points + failure modes), mechanism phase (cross-section consistency table), and pre-emit grilling.
- **TDD discipline**: 12th consecutive Implementer-side RED→GREEN (R02–R14 unbroken); 7th consecutive Reviewer-side verification. RED `add83eb` (TS2554 + TS2307 genuine compile failures on missing signatures/module); GREEN `949b03c` clean.
- **Halt-discipline**: 7th consecutive halt-discipline-clean round (R09–R14). All 3 items decided within audit-tier brainstorm scope; zero DIAGNOSTIC files; zero ESCALATE triggers. The split-condition (PR-F5 substrate-build expansion) did not fire.
- **Anti-scope**: All 9 R14-SAS clauses verified independently by Implementer and Reviewer. `git diff 8b4f0bf..HEAD --name-status` = exactly 6 production/test paths + 3 coordination artifacts.
- **Right-reasons audit**: 3/3 audited tests NOT self-confirming. AC-1 mean_delta literal [1,1], AC-4 'none' tier stripping, AC-11 loader round-trip all have independent binding. Reviewer additionally surfaced MINOR-2 self-confirming pattern at AC-6 outside the audit set (mitigated by AC-1 sibling).
- **Role boundaries**: All roles held. IMPLEMENTER: spec-only cold start. REVIEWER: no audit sidecar (audit-tier); no diagnostics; no logs; no source/test files modified. MEMORIAL-UPDATER: observes and records only.
- **Attestation chore clean**: `git diff 965a260 HEAD -- engine/ test/ coordination/specs/ tools/` empty. 8th consecutive tessera round applying R06+ two-commit attestation discipline.
- **SLICE 2 closure**: Three longstanding deferred items closed — mean_delta computation (R05 SAS-4/R10 SAS-4), PR-F5 storage profile (SCOPING-MEMO v0.3 § 2.2), and compiled-artifact JSON loader (R10 SAS-18). R02 MINOR-2 last open sub-item closed.

---

## What violated discipline (role, discipline, what happened)

### MINOR-1 — Implementer, pre-emit-grilling
**File**: `test/q14-pr-f5-storage.test.ts:95-96` vs `Q-R14-SPEC.md:137-138`.
**What happened**: Spec § Mechanism Item 2 explicitly names `ratio = perShardCells_bytes / fleetBaseline_bytes`. Test implements `(fleetBytes + perShardBytes) / fleetBytes`. At observed magnitudes (1237.7×) the +1 difference is rounding noise, but the formulas are definitionally distinct and the divergence is not acknowledged in the test. Implementer's 4-gate pre-emit grilling had no "spec § Mechanism named formula vs test arithmetic" cross-check axis.

### MINOR-2 — Implementer, right-reasons-audit
**File**: `test/q14-mean-delta.test.ts:139-140`.
**What happened**: AC-6 `expectedDelta` computed via `welfordMean(result.welford_state!).map((v,i) => v - [1,3][i])` — the same production helper called internally by `projectTierGatedOutputs`. A sign-flip mutation propagates identically to both sides; AC-6 as standalone test has self-confirming-pattern weakness. Implementer's audit-tier self-spec did not include a "literal-value vs production-helper cross-check" gate in the AC phase.

### MINOR-3 — Implementer, pre-emit-grilling
**File**: `test/q14-pr-f5-storage.test.ts:100` vs `Q-R14-SPEC.md:141`.
**What happened**: Spec § Mechanism Item 2 states "AC bounds: ratio ≤ 200 OR deviation documented if exceeded." Test took deviation-documented path but omitted all ratio bound assertions — only `perShardBytes < 500_000_000` absolute guard remains. A regression inflating ratio to 100,000× passes AC-8 if bytes stay under 500 MB. Implementer transcribed the qualitative deviation rationale but not a quantitative regression-line guard.

---

## Root cause analysis

### MINOR-1 + MINOR-3 (shared root cause)
**Root cause**: The Implementer's pre-emit grilling checklist operates at the AC-text level ("does the test satisfy the AC Given/When/Then?") but not at the spec § Mechanism level ("does the test's arithmetic match the mechanism's named formula/bound?"). For measurement-binding ACs, the AC text is often less precise than § Mechanism — AC-8 says "ratio computed and logged" (passes with any formula); § Mechanism says `ratio = perShardCells_bytes / fleetBaseline_bytes` (specific arithmetic). The Implementer crossed both gates separately but the gap between them was never bridged in the grilling checklist.

**Why the grilling didn't catch it**: Pre-emit grilling question 1 ("every claim verifiable?") and question 4 ("next role can act with zero clarifying questions?") focus on coverage and completeness, not on formula-faithfulness. A formula substitution that is "defensible as a natural reading" does not trigger coverage alarms or clarification alarms.

### MINOR-2 (root cause)
**Root cause**: The Implementer's AC authoring process focused on behavioral coverage (is this scenario exercised?) but not on test independence (does this AC's expected value compute independently from the production path?). In single-AC coverage for a behavior (AC-6 is the only multi-tick updatePerShardResidual + baselineCell test), self-confirming patterns are harder to spot because there is no "sibling with independent binding" already in the suite at the time of AC-6 authoring. The AC notes did not tag "relies on AC-1 for directional correctness."

---

## Reinforcements added (file path + line summary)

### CLAUDE-IMPLEMENTER.md
Three reinforcement lines appended (after line 272, pre-R14):

1. **REINFORCED 2026-05-17** (MINOR-1): Spec § Mechanism named formula must be cross-checked character-by-character against test arithmetic; silent formula reframing is a grilling failure even when magnitudes are equivalent. Gate: for every measurement-binding AC, compare spec § Mechanism formula expression to test code expression before signing PASS.

2. **REINFORCED 2026-05-17** (MINOR-2): When an AC's expected value uses a production helper called internally by the implementation, flag the self-confirming pattern and document dependency on sibling AC literal binding. Do not leave the dependency implicit.

3. **REINFORCED 2026-05-17** (MINOR-3): Spec § Mechanism numeric bound with "OR deviation documented" fallback requires a regression-line assertion calibrated to OBSERVED magnitude. Qualitative deviation documentation does not exempt the test from quantitative regression protection.

---

## Watch list for next round

- **R15 close-walk MINOR dispositions**: MINOR-1 ratio formula (tighten test to `perShard/fleet` or amend spec), MINOR-2 AC-6 literal expected vector (replace `welfordMean(result.welford_state!)` with hand-traced literal), MINOR-3 ratio bound assertion (add `overheadRatio < 5000` or similar at OBSERVED-magnitude regression line).
- **OBS-1 disposition candidate**: length-mismatch guard (runtime.ts:155 `perShardMean.length === baselineMean.length`) has no test coverage — trivial AC addition: warm_start + baselineCell with mismatched mean_vector length → mean_delta absent.
- **OBS-2 AC-1 fixture inconsistency**: `n_samples: 25` with `welford_state.n: 3` is not reachable through normal orchestration. Tighten fixture or update schema comment.
- **OBS-3 loader edge cases**: `loadCompiledConfig('null')`, array input, `alpha_budget` type errors — all defensive paths with no tests.
- **Implementer's new pre-emit grilling axes** (from R14 reinforcements): formula cross-check AND regression-line guard for measurement-binding ACs — watch for these to be applied at R15.
- **R10 MINOR-1** (runtime.ts module-level docblock) remains in operator gate items — still not closed.

---

## Emerging cross-project patterns

- **Spec § Mechanism formula vs test arithmetic gap (R14 new)**: First time tessera has seen a measurement-formula substitution make it past pre-emit grilling undetected. The gap is specifically at the intersection of audit-tier self-spec (no separate Architect to cross-check the mechanism against the test) and measurement-heavy ACs (where AC text and § Mechanism formula have different precision). This is more likely in audit-tier rounds where the Implementer is both the spec author and the test author — no cold-eye Architect catches the formula re-interpretation before the Reviewer sees it.
- **Halt-discipline streak (R09–R14, 7 rounds)**: The R08 MAJOR-1 reinforcement (procedural halt regardless of resolution clarity) has held for 6 consecutive rounds with zero violations. The reinforcement is producing durable behavioral change.
- **Right-reasons audit (R08–R14, 7 rounds)**: Every consecutive Reviewer-side audit has produced ≥1 observation-class or finding. The audit is not becoming rubber-stamp. R14 notably produced a MINOR (MINOR-2) from the right-reasons audit beyond the 3-mandated-tests scope — the adversarial discipline is compounding.

---

_Next-role: operator decision. Operator gate items for triage: MINOR-1/2/3 dispositions (R15 close-walk candidate); OBS-1/2/3 low-priority follow-up; PR #38 anchor contribution (R11–R15 window noted in memory)._
