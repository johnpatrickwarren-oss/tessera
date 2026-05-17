CURRENT-ROUND: R16
NEXT-ROLE: REVIEWER
STATUS: READY

## R16 Implementer close — attestation

| Item | Result |
|------|--------|
| typecheck | exit 0 |
| test/q01-vendoring-coverage.test.js | 3/0 |
| test/q01-no-at-pin-deltas.test.js | 1/0 |
| test/q01-schema-additions.test.js | 5/0 |
| test/q02-schema-extension.test.js | 6/0 |
| test/q03-warm-start-runtime.test.js | 13/0 |
| test/q04-welford-stats.test.js | 11/0 |
| test/q05-per-shard-runtime.test.js | 13/0 |
| test/q06-baseline-pre-pass.test.js | 13/0 |
| test/q07-fleet-correlated.test.js | 23/0 |
| test/q10-per-shard-emission.test.js | 11/0 |
| test/q11-hierarchical-e-value-combination.test.js | 18/0 |
| test/q12-fleet-merged-detector-surfaces.test.js | 16/0 |
| test/q13-e-bh-fdr.test.js | 14/0 |
| test/q14-compiled-config-loader.test.js | 6/0 |
| test/q14-mean-delta.test.js | 7/0 |
| test/q14-pr-f5-storage.test.js | **4/0** (was 3; +1 R16 AC-R16-1/2) |
| test/q16-pr-f5-investigation.test.js | **2/0** (new) |
| test/betting-e-process-class-dispatch.test.js | 5/0 |
| **Total** | **171/0** (was 168) |

Attestation SHA: _to be filled after coordination commit_

## R16 Reviewer inputs

- `coordination/specs/Q-R16-SPEC.md` — spec with brainstorm + design inline
- `test/q14-pr-f5-storage.test.ts` — modified (4 tests; +1 AC-R16-1/2)
- `test/q16-pr-f5-investigation.test.ts` — new (2 tests; AC-R16-3/4)
- `coordination/PR-F5-INVESTIGATION-R16.md` — findings + operator options briefing

## R16 TDD evidence

- RED commit: `00a70f3` — q14 dimension test + q16 both with `assert.fail` placeholders; 168 pass / 3 fail
- GREEN commit: `9ccbb61` — complete test implementations; 171 pass / 0 fail

## Key findings (for operator decision)

- d-mismatch hypothesis **REFUTED**: ratio at d=100 = 1006.5×, not 1.2-1.5×
- Ratio converges toward N=1000 as d→∞ (not toward architect prediction)
- welford_state **IS load-bearing**: cold-start without it resets accumulator (n=1)
- Diagonal-only at d=100 would reduce ratio ~40× (to ~26×); still breaks Family C T² semantics
- Structural conclusion: 1.2-1.5× is incompatible with N=1000 shards storing per-shard cells
- Minimum achievable ratio for N=1000 with any per-shard encoding: ≈ N ≈ 1001

## Operator decision pending (post-R16)

TQ-1 disposition: (α) architecture-revise / (β) pitch-revise / (δ) defer

## Round scope — operator-set (do NOT auto-redirect)

**R16 = TQ-1 (γ) investigation round.** Verify the PR-F5 measurement methodology before any architectural revision. R14's own Implementer documented a candidate methodology gap in the test header at `test/q14-pr-f5-storage.test.ts:18-25`:

> "prediction assumed high-d (d≈50+) fleet baseline with proportionally larger family_C covariance matrices. At d=10, per-shard welford_state (n + mean[10] + m2[10×10] = 111 fields) dominates the fleet baseline per cell."

R16 verifies this lead, extends the analysis to surface additional measurement-dependent factors, and produces a findings document that lets the operator (John) make an informed architectural disposition (α architecture-revise / β pitch-revise / δ defer).

**R16 does NOT pick the architectural disposition.** It produces evidence + options. Operator decides on completion.

## Scope items

### Item 1 — Re-measure at multiple d values

R14 measured at d=10 only. Architect-pre-prediction (v0.3 § 2.2) implicitly assumed higher dimensionality. R16 SHIPS:
- Parameterized re-measurement at d ∈ {10, 25, 50, 100} (or operator-tuned set) with N=1000 × K=168
- Document the dimension-dependence of the overhead ratio
- Determine: does the ratio approach 1.2-1.5× at higher d (confirming the d-mismatch hypothesis), or stays >100× regardless (refuting it)?

### Item 2 — Welford-state persistence requirement investigation

R14's measurement includes `welford_state` (n + mean[d] + m2[d×d]) in the per-shard JSON serialization. **Open question**: does runtime actually require welford_state to be persisted in the compiled-config artifact, or can warm-start residuals rebuild it from observation history on cold-start?

R16 SHIPS:
- Trace `welford_state` usage in `engine/per-shard/runtime.ts` + `engine/per-shard/warm-start.ts` (consumed by which call paths?)
- Determine whether warm-start cold-start can reconstruct welford_state from observation history, OR whether welford_state is load-bearing for compiled-config persistence
- If welford_state is NOT persistence-required: storage estimate drops dramatically (just n + mean[d] per cell, no m2[d×d])

### Item 3 — Diagonal-only covariance feasibility check

Inherited engine Family C supports `'mcd' | 'mrcd' | 'ledoit_wolf'` covariance estimators. Architect-pre-prediction footnote (v0.3 § 2.2): "diagonal-only optimization deferrable to Phase 1 SLICE 3+ if PR-F5 evidence justifies."

R16 SHIPS:
- Storage estimate IF welford_state's m2 were diagonal-only (d fields instead of d×d)
- Architectural feasibility note: would diagonal-only break the Family C Hotelling T² semantics? (Likely yes; needs Architect investigation in a future round; R16 just documents the estimate)

### Item 4 — Findings document

`coordination/PR-F5-INVESTIGATION-R16.md` (new) — synthesizes Items 1-3 into a structured architectural-options briefing for operator. Each option from the morning triage queue (α architecture-revise / β pitch-revise / δ defer) gets a "decision under R16 findings" framing:

- **(α) architecture-revise:** which specific revision (welford_state non-persistence? diagonal-only? rank-reduced?) is supported by R16 evidence?
- **(β) pitch-revise:** updated empirical claim per d-dimension table
- **(γ-prime) investigation-complete:** R16 closes (γ); operator picks (α) or (β); R16 doesn't pre-dispose
- **(δ) defer:** still available; R16 informs the deferral framing

## Tier and audit-tier specifics

**Tier: audit.** S4 (tactical follow-up to R14) + S2 (R14 spec + test code describe the work). No A-factors fire genuinely (this is investigation, not architecture-design — operator picks architecture later). Implementer self-specs + executes; Reviewer cold-audits the investigation methodology + findings document; Memorial Updater records.

**Split condition:** if Item 2 (welford-state persistence investigation) surfaces a genuine architectural ambiguity (e.g., "warm-start cold-start was never specified at compiled-config-persistence layer"), HALT + DIAGNOSTIC. Operator-gate decision; do not silently disposition.

## Active REINFORCED lines Implementer MUST apply (17 IMPL + 1 COMMON)

R16 Implementer applies all 17 IMPL reinforcements per CLAUDE-IMPLEMENTER.md; particularly:

- **Procedural halt-discipline (R08 MAJOR-1):** if Item 2 surfaces architectural ambiguity, HALT + DIAGNOSTIC.
- **Attestation-accuracy (R03 MINOR-4):** OBSERVED measurement values per d; not predicted.
- **Inherited-testimony empirical verification (R08 MAJOR-2):** verify R14's commentary by running the actual test fixture; don't summarize from the comment text.
- **Correction-propagation pass (R09 MAJOR-1):** if R16 corrects R14's framing, enumerate sibling sites (PHASE-1-CLOSE-WALK.md if it cites the 1237.7× number; OVERNIGHT-LOG-2026-05-17.md TQ-1 entry; v0.3 § 2.2 if amendment recommended).

## Halt conditions for R16

- **Welford-state persistence architectural ambiguity:** Item 2 may surface that warm-start cold-start semantics were never specified at the compiled-config-persistence layer. HALT + DIAGNOSTIC; document the architectural question for operator gate.
- **Item 3 diagonal-only would break Family C semantics in a way R16 can't assess:** OK to document as "Architect investigation required in a future round" without HALT; this is the expected R16 finding.
- **Measurement at high d produces unrealistic values (memory exhaustion at d=100):** HALT + DIAGNOSTIC; document the d-ceiling.
- **R14 test code modification needed to instrument:** if so, MODIFY test/q14-pr-f5-storage.test.ts (in-scope per Item 1) AND log the modification clearly in the findings document.

## Coordination chore sequence (R14 final revision; same as R06-R15)

1. Run all binding commands at GREEN; record OBSERVED counts.
2. Write coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R16): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R16): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R16 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R15 HEAD `0f3508b`:
- test/q01-vendoring-coverage.test.js: 3/0
- test/q01-no-at-pin-deltas.test.js: 1/0
- test/q01-schema-additions.test.js: 5/0
- test/q02-schema-extension.test.js: 6/0
- test/q03-warm-start-runtime.test.js: 13/0
- test/q04-welford-stats.test.js: 11/0
- test/q05-per-shard-runtime.test.js: 13/0
- test/q06-baseline-pre-pass.test.js: 13/0
- test/q07-fleet-correlated.test.js: 23/0
- test/q10-per-shard-emission.test.js: 11/0
- test/q11-hierarchical-e-value-combination.test.js: 18/0
- test/q12-fleet-merged-detector-surfaces.test.js: 16/0
- test/q13-e-bh-fdr.test.js: 14/0
- test/q14-compiled-config-loader.test.js: 6/0
- test/q14-mean-delta.test.js: 7/0
- test/q14-pr-f5-storage.test.js: 3/0
- test/betting-e-process-class-dispatch.test.js: 5/0
- **Total: 168/0**

R16 expected at GREEN: prior 17 file counts may change at q14-pr-f5-storage if Item 1 modifies the test (parameterized re-measurement). New q16 file possible (investigation-specific tests). Findings document `coordination/PR-F5-INVESTIGATION-R16.md` lands at GREEN.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R16 --tier audit
```

`--tier audit` per S4 + S2 + investigation-not-architecture framing.

## Operator gate items (preserved)

- **PR #38 review/merge** (anchor; operator owns)
- **TQ-1** — currently being investigated via R16 (γ); resolves to (α) or (β) post-R16
- **TQ-2** — anchor PR #38 (LOW)
- **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision
- **OQ-R08-3** Phase 2 transient detector scheduling
- **R09 MINOR-3** NEXT-ROLE.md attestation table format
- **R10 MINOR-1** `engine/per-shard/runtime.ts` module-level docblock
- **R11/R12/R13/R14/R15 MINORs + OBS** non-load-bearing

## Update history

| Date | Event |
|---|---|
| 2026-05-17 | Phase 1 closed at R15; HARD STOP for operator review. |
| 2026-05-17 | John dispositioned TQ-1 → (γ) investigation-first. R16 launched as audit-tier investigation round. |
