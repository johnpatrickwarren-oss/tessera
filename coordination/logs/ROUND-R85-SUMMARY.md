# ROUND-R85-SUMMARY.md

**Round:** R85 — Phase 4 SLICE 3 close + Phase 4 close memorialization (FINAL ROUND)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `f737877`
**Close SHA:** `d227457` (Coordinator Option A resolution)
**Date:** 2026-05-21

---

## What worked

**Substantive deliverables — all 5 landed clean:**
- `demos/demo.html` Canned-vs-Live mode toggle with `<fieldset id="mode-toggle">` radio group, `setMode()` + body[data-mode] + per-element disabled hybrid, loading spinner (`#engine-loading-indicator`), run-status affordance (`#engine-run-status` 5 stages), error banner polish.
- `demos/DEMO-SCRIPT.md` extended with `## Contents` ToC + `## Minute 10:00 – 12:00 — Live mode (interactive)` section including Run / Cancel / Worker demonstration beats.
- `README.md` Browser dashboard subsection extended with Live mode toggle paragraph + DEMO-SCRIPT cross-reference.
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` 3 Phase 4-derived promotions landed: `haiku-mu-status-field-disambiguation` (Rule 1 sub-class, 4-instance), `architect-encoded-regex-with-hardcoded-bounds` (Rule 1 sub-class, 6-instance), `vendored-at-pin → vendored-with-deltas reclassification precedent` (2-instance Rule 7 flag).
- `test/q85-slice-3-close.test.ts` 20 ACs; all 20 pass deterministically in isolation.

**In-test AC discipline — exemplary:** ZERO `{0,N}?` char-bounded quantifiers anywhere in the 20 R85 ACs. The round's own Rule 5 self-application gate was correctly applied to in-test ACs. Section-bounded extraction uses natural Markdown heading splits; slug presence checks use multi-word `.includes()`. The Architect correctly internalized the very rule R85 promotes for the in-test scope.

**TDD discipline — verified:** RED commit `0799441` with 20 `assert.fail` stubs precedes GREEN implementation in git history. 7th consecutive round of verifiable test-first discipline.

**Implementer halt discipline — exemplary:** Both halt conditions (HALT-1 awk defect; HALT-3 fail=17) triggered immediate DIAGNOSTIC writes and STATUS: ESCALATE. No silent EMPIRICAL.sh amendments. No reframed counts. The Implementer correctly identified that both faults originated in Architect-authored artifacts and declined to self-fix. This is exactly the discipline the halt system is designed to produce.

**Reviewer adversarial mandate — excellent:** 8-run independent full-suite characterization (not 1 run) directly refuted the Coordinator's "apparently resolved" framing. The 25% flake rate (~2/8 runs) was empirically measured, not assumed. Three right-reasons audits completed with mutation analysis + spec traceability. 1 CRITICAL + 3 MAJOR + 3 MINOR + 3 OBS = 10 findings. Zero-findings audit explicitly avoided.

**Anti-scope — clean:** All 12 diff paths within ALLOWED_SET; `demos/scenarios/*.json` byte-identical; `engine/*` + `engine-worker.js` + `run-pipeline.sh` all untouched. R71/R79/R80/R81/R82/R83/R84 markers all preserved per AC-R85-18.

---

## What violated discipline

### 1. CRITICAL-1 (ARCHITECT) — Strict fail-count prediction against known-flaky prior AC

**What happened:** Q-R85-SPEC.md § 5.2 encoded `# fail = 16 strict` and Q-R85-EMPIRICAL.sh Block 4 encoded `EXPECTED_FAIL=16` strict, despite AC-R84-14 being documented as structurally flaky at R84 REVIEWER MINOR-2 (MEMORIAL.md:2583; ~25% flake rate). The § 8.10 R84-AC non-regression walk predicted AC-R84-14 as "PASS" without noting its documented flake likelihood. Result: EMPIRICAL.sh trips Halt-3 in ~25% of runs at routing HEAD.

### 2. MAJOR-1 + MAJOR-3 (ARCHITECT/Coordinator) — Single-run attestation declared flake "resolved"

**What happened:** Coordinator-direct fix at SHA `d1b147d` ran the full suite once, observed `fail=16`, and attested "AC-R84-14 flakiness apparently resolved between R85 chore-A and Coordinator re-run. No code change needed." The Implementer ESCALATE block at `NEXT-ROLE.md:7011-7022` had explicitly enumerated Option B: "Operator directs Implementer to re-run full suite 3× and attest majority fail count." Neither Option A (band-amend spec + EMPIRICAL.sh) nor Option B (3× majority) was applied. A structural race condition in `engine-worker.js` (unchanged at R85) cannot self-resolve between commits. The Reviewer's 8-run characterization refuted the "resolved" framing directly.

### 3. MAJOR-2 (ARCHITECT) — Q.17 self-application gate scope gap: harness-script patterns not covered

**What happened:** Q-R85-SPEC.md § 8.17 Q.17 self-application gate walked in-test ACs and concluded "ZERO ACs in R85 use `{0,N}?` quantifier. PASS." But the canonical rule (`architect-encoded-regex-with-hardcoded-bounds`) applies to any architect-encoded pattern in any spec-triad artifact, including EMPIRICAL.sh. The `awk '/^### Browser dashboard/,/^### /'` range in Block 3 produced one-line output because the end-pattern matched the start line immediately. This is canonically the same `architect-encoded-pattern-not-verified-against-prescribed-implementation` failure mode, applied to an awk range instead of a regex quantifier. The gate did not walk EMPIRICAL.sh shell-command patterns against the prescribed README.md insertion.

### 4. MINOR-2 (ARCHITECT) — Pass-count band rationale cites PRNG variance; actual cause is structural race

**What happened:** Q-R85-SPEC.md § 5.2 documented the `pass` band [668, 670] as "±1 PRNG/environment margin." The actual cause of the band requirement is AC-R84-14 structural-race-condition flakiness. The band was fortunately wide enough to observe correctly (~25% of runs land at 668), but the cited a-priori rationale misframes the source of variance.

### 5. MINOR-3 (ARCHITECT) — Rule 7 sub-class cross-project derivation gate disambiguation undocumented

**What happened:** `haiku-mu-status-field-disambiguation` landed from 4 same-project (Tessera) instances while `vendored-at-pin → vendored-with-deltas` was explicitly deferred under Rule 7 from 2 same-project instances. The asymmetric treatment is internally consistent under the "sub-class is exempt from Rule 7's different-project gate" reading, but the spec did not cite Rule 7 § to justify the asymmetry. Future R86 housekeeping could add a Rule 7 "sub-class interpretation" addendum.

---

## Root cause analysis

**CRITICAL-1 / MAJOR-2 share a root cause:** The Architect's pre-emit grilling (§ 8) was comprehensive in scope but had a pattern-coverage gap. The Q.17 self-application gate and the § 8.10 R84-AC non-regression walk both covered the patterns they explicitly defined, but neither's definition was wide enough:

- Q.17 covered in-test ACs but not harness-script shell commands (MAJOR-2).
- § 8.10 predicted pass/flip outcomes but did not include a "flake-likelihood" column for ACs documented as stochastic (CRITICAL-1, OBS-1).

Both gaps share the same root: the Architect extended existing pre-emit grilling passes rather than freshly applying the canonically-promoted rule's FULL scope to all spec-triad artifacts. The rule R85 promotes is "any architect-encoded pattern in any spec-triad artifact must be empirically verified." The gate defined in § 8.17 constrained itself to "in-test regex patterns" — a narrower scope than the canonically-landed rule.

This is a recursive failure: the round promoting the rule exhibits the rule's failure mode in a different artifact type (count prediction, awk range). The grilling structure did not ask "where else in the spec triad could an architect-encoded pattern be under-verified?"

**MAJOR-1 / MAJOR-3 root cause:** The Coordinator took an expedient path — one run showed `fail=16`, which seemed to confirm the Implementer's "I think 17 was the flake" framing, so the Coordinator declared resolution. The ESCALATE block had the right procedure written: 3× majority. The Coordinator did not follow it. The pressure to close the round quickly (after two ESCALATE cycles) created an environment where a single confirming run felt sufficient. The Reviewer's discipline of running 8 independent times was precisely the adversarial check that caught this.

---

## Reinforcements added

| File | Entry summary |
|---|---|
| `CLAUDE-ARCHITECT.md` | `# REINFORCED 2026-05-21` — Fail-count prediction against known-flaky prior AC (CRITICAL-1 composite fold into R83 pass-count-arithmetic + R84 end-to-end-test-race-conditions) |
| `CLAUDE-ARCHITECT.md` | `# REINFORCED 2026-05-21` — Self-application gate must cover EMPIRICAL.sh shell-command patterns (MAJOR-2 composite fold into R75 self-application-gate series) |

Both new entries explicitly name the prior REINFORCED lines they extend (composite fold language). No new top-level rules derived; both are extensions of already-canonically-landed Rule 1 sub-classes.

---

## Watch list for next round (R86 candidates)

1. **EMPIRICAL.sh shell-command pattern verification at spec-emit:** Before routing, run each awk/sed/grep command in EMPIRICAL.sh against the prescribed implementation text verbatim. Awk range patterns require flag-toggling when start and end patterns can match the same line.

2. **Fail-count banding for known-flaky ACs:** Before writing EXPECTED_FAIL in EMPIRICAL.sh, grep MEMORIAL.md for prior-round flaky-AC documentation. AC-R84-14 structural flakiness remains in the suite; any round that inherits it should band fail prediction [16, 17], not strict 16.

3. **Q.17 self-application gate expanded scope:** The Q.17 walk should enumerate: (a) in-test ACs [current]; (b) EMPIRICAL.sh shell-command patterns [new]; (c) count/band predictions against stochastic prior-round ACs [new].

4. **Single-run attestations after ESCALATE:** If an operator resolves an ESCALATE via a single command run, the ESCALATE block's prescribed number of runs (Option B) must be honored or explicitly waived with rationale. "Apparently resolved" is not acceptable framing.

5. **README duplicate `## Quick demo` heading (R81 MAJOR-3 carry-forward defect):** README.md:73 and README.md:194 both contain `## Quick demo`. R85 explicitly deferred remediation. R86+ candidate.

6. **Spec Q-R84-SPEC.md § 1.6 amendment still incomplete (R84 REVIEWER MAJOR-1 carry-forward):** The Operator ESCALATE resolution for R84 AC-R84-9 prescribed amending Q-R84-SPEC.md § 1.6, but only the test file and EMPIRICAL.sh were updated. The spec diverges from its own test. R86 housekeeping candidate.

7. **Rule 7 "sub-class interpretation" addendum** to disambiguate when same-project-only instances qualify for cross-project canonical landing (MINOR-3). R86 methodology housekeeping candidate.

---

## Emerging cross-project patterns

**Pattern: Round promotes a rule while exhibiting the rule's failure mode in a different artifact type.** R85 promotes `architect-encoded-regex-with-hardcoded-bounds` (Rule 1 sub-class for in-test ACs) and simultaneously exhibits the same canonical failure mode in two other artifact types: awk range in EMPIRICAL.sh (MAJOR-2) and strict count prediction against a stochastic baseline (CRITICAL-1). The canonical rule's scope (`any architect-encoded pattern in any spec-triad artifact`) was correctly stated but the gate (Q.17) was implemented only for the in-test scope. The round of canonical landing is also the round of first application of the broadened scope.

Implication for future rounds: when canonically landing a Rule 1 sub-class, the Architect should explicitly enumerate ALL artifact types where the sub-class could manifest (in-test ACs; EMPIRICAL.sh commands; count predictions; NEXT-ROLE.md binding attestations) and apply the self-application gate to each type independently — not only the type the prior instances exemplified.

**Pattern: ESCALATE-cycle pressure produces single-run attestation shortcuts.** This is the third occurrence in Tessera (R79 MAJOR-1 had a similar single-run attestation pattern; R82 had a Coordinator-direct fix without full re-attestation). When multiple ESCALATE cycles occur in a single round, the natural pressure is to treat a confirming run as sufficient. The counter-discipline is Option B: 3× majority when the baseline is known to be stochastic.

---

## Recommend reinforcement consolidation

**CLAUDE-ARCHITECT.md is at 50 REINFORCED lines (48 pre-R85 + 2 added this round).**
**CLAUDE-IMPLEMENTER.md is at 41 REINFORCED lines.**

Both files exceed the 30-entry threshold. Run:

```
./scripts/consolidate-reinforcements.sh CLAUDE-ARCHITECT.md
./scripts/consolidate-reinforcements.sh CLAUDE-IMPLEMENTER.md
```

to archive entries older than 180 days. Operator-triggered; the script does not auto-run. Recommended as a standalone R86 housekeeping task (tier: solo / Z2 category per the rubric).
