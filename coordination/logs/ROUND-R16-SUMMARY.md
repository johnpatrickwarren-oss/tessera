# ROUND-R16-SUMMARY

_Audit-tier TQ-1 (γ) investigation round. Implementer self-specs + executes; Reviewer cold-audits. Memorial Updater pass: 2026-05-17._

---

## What worked

**Brainstorm discipline (Implementer):** Self-spec enumerated 4 distinct approaches (full N×K arrays / single-shard proxy + extrapolation / analytical-only / mixed) with strengths/weaknesses/hidden assumptions/risks for each. Selected Approach B with documented elimination reasoning: A eliminated by OOM at d=100 (halt condition), C by insufficient rigor for empirical round, D by inconsistent methodology. The pre-selected safe proxy approach correctly avoided the d=100 OOM halt condition listed in NEXT-ROLE.md.

**TDD discipline (Implementer + Reviewer):** RED `00a70f3` with genuine `assert.fail` placeholders in all 3 new tests (168 pass / 3 fail) precedes GREEN `9ccbb61` (171 pass / 0 fail). Reviewer independently verified commit ordering via `git show`. 13th consecutive Implementer-side TDD (R03–R16 unbroken); 13th consecutive Reviewer-side TDD attestation.

**Right-reasons audit (Reviewer):** 3/3 tests audited, none self-confirming. AC-R16-4 (cold-start reset via production `updatePerShardResidual`) is the strongest: expected values of n=26 and n=1 are mechanical consequences of the Welford recurrence + runtime.ts:101 cold-start branch — not test-controlled data. The investigation conclusion (d-mismatch hypothesis REFUTED; ratio ≥ 1000× at all d ∈ {10,25,50,100}) is empirically robust.

**Halt-discipline (Implementer):** Item 2 welford_state persistence correctly assessed as empirically testable (not an architectural ambiguity requiring operator gate). The narrower empirical question ("does current runtime require welford_state for cold-start to preserve history?") was distinguished from the deeper architectural question ("what warm-from-observations strategy is appropriate?"). Item 3 diagonal-only correctly routed to "future Architect round" per spec framing. Zero DIAGNOSTIC files generated.

**Anti-scope — major constraints:** Zero engine changes; zero schema changes; zero compression mechanism; AC-8/9/10 tests preserved verbatim (diff bounded to file-header note + appended new test only). All major anti-scope fences held; independently verified by Reviewer via `git diff --stat`.

**Reviewer grilling and cross-cutting checks:** 5-gate self-review before routing. Correction-propagation check (R09 MAJOR-1 reinforcement) applied — all 4 sites citing 1237.7× or d-mismatch hypothesis enumerated and assessed. Inherited-testimony empirical verification (R08 MAJOR-2 reinforcement) applied — R14 header hypothesis treated as testable claim, not established fact; AC-R16-1/2 empirically refuted it. Both reinforcements from prior rounds applied cleanly.

---

## What violated discipline (role, discipline, what happened)

| Role | Discipline | Finding | What happened |
|---|---|---|---|
| IMPLEMENTER | pre-emit-grilling | MINOR-1 | Proxy helper includes `last_observed_at: 1000000` (absent from AC-8 reference helper) and fixes `shard_id='shard-0'` (AC-8 uses variable lengths); two biases partially cancel (0.4% delta); findings doc states "matches AC-8 within 0.4%" without disclosing the compensating-bias structure |
| IMPLEMENTER | pre-emit-grilling | MINOR-2 | AC-R16-3 parenthetical says "Verifies welford_state survives the JSON persistence layer used by loadCompiledConfig"; test at q16:31 calls only `JSON.parse(JSON.stringify(...))` without invoking the production `engine/loader.ts:loadCompiledConfig` path |
| IMPLEMENTER | anti-scope | MINOR-3 | `coordination/PR-F5-INVESTIGATION-R16.md:127` contains "Recommendation from R16: Option 2 (sparse encoding by tier) is the least invasive…" — sub-α recommendation; spec § 4 anti-scope requires neutral framings; AC-R16-5(d) requires "disposition framings," not disposition recommendations |
| REVIEWER | memorial-accretion | (omission) | Found 3 Implementer MINORs and documented them in REVIEWER-REPORT-R16.md; did NOT append corresponding VIOLATION entries to coordination/MEMORIAL.md; 0 VIOLATION entries in R16 Reviewer MEMORIAL section |

---

## Root cause analysis

**IMPLEMENTER MINOR-1 — proxy construction fidelity:**
Root cause: The grilling checklist includes cross-section consistency, formula verification, and scope checks, but lacks a "proxy helper input construction vs reference helper input construction" gate. When building the proxy at lines 200-218, the `last_observed_at` field was added for realistic serialization without checking whether the AC-8 reference helper included it. The shard_id='shard-0' fix was chosen for consistency across d values, again without checking the reference. The two biases partially cancel numerically (0.4%), which made the divergence invisible at test-run time. Without an explicit field-by-field inventory comparison step in grilling, the discrepancy only surfaced when the Reviewer independently traced both helper implementations.

**IMPLEMENTER MINOR-2 — AC coverage-path claim:**
Root cause: The spec was authored with both a precise AC literal text ("when JSON.stringify → JSON.parse round-trips it") and an explanatory parenthetical that overpromised coverage ("Verifies welford_state survives the JSON persistence layer used by loadCompiledConfig"). The authoring session verified that the test satisfies the literal criterion but did not verify that the parenthetical's coverage claim is accurate — specifically, that `loadCompiledConfig` is called. Since the loader is a pass-through (loader.ts:33 calls JSON.parse directly), the functional behavior is identical, making the gap invisible during authoring. The grilling checklist had no "AC parenthetical names production function → test imports and calls it" gate.

**IMPLEMENTER MINOR-3 — sub-α recommendation:**
Root cause: The anti-scope gate at grilling ("scope beyond what was requested?") was applied at the coarse α/β/δ level, not at the sub-option level within each option. The Implementer's intent was to help the operator by flagging the analytically least-invasive sub-option within α — a helpfulness instinct that produced a soft scope creep. A grep-for-"recommend" gate in the grilling pass would have surfaced the specific line before routing.

**REVIEWER memorial-accretion omission:**
Root cause: The Reviewer's grilling checklist addresses report quality (findings have file:line evidence, ACs have OBSERVED values, right-reasons audit completed, cold-review boundary held) but does not explicitly include "count MINOR+ findings and verify a VIOLATION entry exists in MEMORIAL for each." The REVIEWER-REPORT and the MEMORIAL append are two separate writing tasks; without an explicit cross-check gate between them, the MEMORIAL entries were inadvertently left incomplete. The R15 precedent (Reviewer added 3 VIOLATION entries) was not explicitly consulted during R16 close.

---

## Reinforcements added (file path + content summary)

| File | REINFORCED line summary |
|---|---|
| `CLAUDE-IMPLEMENTER.md` | Proxy input-construction fidelity gate: field-by-field comparison vs reference helper required before writing findings or cross-check claims |
| `CLAUDE-IMPLEMENTER.md` | AC coverage-path gate: when AC parenthetical names a production function, test must import and call it; rewrite parenthetical if substrate-only is intended |
| `CLAUDE-IMPLEMENTER.md` | Framings-only anti-scope gate: grep findings doc for "recommend" before emitting; no sub-option rankings when spec says operator picks disposition |
| `CLAUDE-REVIEWER.md` | Memorial-accretion cross-check: count MINOR+ findings after writing REVIEWER-REPORT; verify VIOLATION entry exists in MEMORIAL for each before routing |

Post-R16 REINFORCED line counts: CLAUDE-COMMON.md=1, CLAUDE-ARCHITECT.md=17, CLAUDE-IMPLEMENTER.md=20, CLAUDE-REVIEWER.md=1, CLAUDE-MEMORIAL.md=0. No file exceeds 30; consolidation not triggered.

Additionally, reinforcement rules derived in CROSS-PROJECT-MEMORIAL.md under `### Discipline: pre-emit-grilling (tessera-R16 additions)` for the "spec-mechanism-vs-test-construction" sub-class (3rd+ occurrence at R14 + R16; 4 total violations in this sub-class).

---

## Watch list for next round (patterns to look for)

- **Proxy vs reference alignment:** If a future round builds any measurement proxy intended to cross-check an established reference test, verify the field inventory is aligned before writing findings or agreement claims.
- **Production-path coverage in investigation tests:** For any AC whose parenthetical names a specific production module or function, check the import list in the test file at grilling time.
- **Findings doc language in "framings-only" rounds:** If findings doc is produced under a "operator picks disposition" anti-scope, grep for "recommend" / "recommendation" before emitting.
- **Reviewer MEMORIAL append completeness:** After writing REVIEWER-REPORT, count MINOR+ findings and add corresponding VIOLATION entries to MEMORIAL before routing. This is now explicitly reinforced in CLAUDE-REVIEWER.md.
- **TQ-1 disposition pending:** Operator picks α/β/δ per `coordination/PR-F5-INVESTIGATION-R16.md` § Item 4. Key caveats for the operator decision: MINOR-1 (proxy cross-check with AC-8 is weaker than stated; 0.4% match is accidental compensation); OBS-1 (diagonal-only 26× ratio at d=100 is asymmetric — assumes per-shard diagonalized, fleet covariance full; symmetric application would not improve the ratio).

---

## Emerging cross-project patterns

- **Implementer pre-emit-grilling "spec-mechanism-vs-test-construction" sub-class: 4 occurrences across R14 + R16.** R14 introduced formula substitution (MINOR-1) and bound omission (MINOR-3). R16 adds proxy-construction fidelity (MINOR-1) and coverage-path accuracy (MINOR-2). All four violations share the same structure: a spec description implies one coverage intent, the implementation achieves a related but different coverage, and functional equivalence at observed scale makes the gap invisible during authoring. Reinforcement rules now cover all four sub-types.

- **Reviewer memorial-accretion omission: 1st tessera occurrence (R16).** The pattern where a Reviewer finds MINORs but omits corresponding MEMORIAL VIOLATION entries was not observed in R08–R15. The newly added REINFORCED line in CLAUDE-REVIEWER.md targets this gap. Watch for recurrence in R17+.

- **14th consecutive 0-CRITICAL round (R02–R16).** All violations across the 14-round streak are discipline-class (pre-emit-grilling, attestation, halt-discipline, memorial-accretion); none reached behavioral-correctness impact. The no-skip-policy + TDD combination continues to hold the correctness floor.

- **Halt-discipline streak extends to 8 consecutive clean rounds (R09–R16)** — the longest in tessera history. The R08 MAJOR-1 reinforcement (procedural halt-discipline + DIAGNOSTIC mandate) has held without exception for 8 rounds.
