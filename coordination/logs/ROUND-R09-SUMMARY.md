# Round R09 Summary

**Round**: R09
**Date**: 2026-05-16
**Tier**: audit (S4 + S2; no separate Architect; Implementer self-spec)
**Scope**: 5 tactical follow-ups — AC-15 spec-premise fix + n_ticks_contaminated binding; AC-11 tightening; PRD trace; CLAUDE-COMMON.md Item 4 gate; reinforcement quality assessment
**Result**: MERGE-READY | 0 CRITICAL · 1 MAJOR · 3 MINOR · 6 OBS | 5/6 ACs PASS + 1 PARTIAL (AC-R09-1)
**Test totals at GREEN `59f2084`**: 93/0 grand total; typecheck exit 0

---

## 1. What worked

**Empirical verification before spec (R08 MAJOR-2 reinforcement correctly applied)**: Implementer ran the AC-15 fixture against production before writing the spec, confirming n_ticks_contaminated=6 (2 ticks × 3 runs; origLen=8, curatedLen=6; fcp1State.fired=false). This precluded any inherited-testimony risk in the self-spec.

**Anti-scope discipline (8 SAS clauses; zero violations)**: Reviewer independently verified all 8 R09-SAS clauses via git diff. CLAUDE-COMMON.md correctly absent from the Implementer's diff — Item 4 cleanly deferred to Memorial Updater. Production algorithm UNMODIFIED. Pre-R09 test regression sweep: 70/0 unchanged across 9 non-q07 test files.

**Audit-tier self-spec format proven workable**: 5-item tactical-followup round, zero halt conditions, 2-minute RED→GREEN wall clock. S4 + S2 criteria correctly identified this as audit-tier work. The brainstorm + design + AC + anti-scope format produced a well-bounded round.

**Right-reasons audit surfaced MAJOR-1**: The Reviewer's 3-test adversarial sample (AC-R09-3, AC-R09-2, AC-R09-1-grep-verifier) detected MAJOR-1 (incomplete spec correction scope) via the "SELF-CONFIRMING-ADJACENT" classification of the AC-R09-1 grep verifier. The audit functioning as a genuine finding-generator — 2nd consecutive tessera round.

**TDD two-commit RED → GREEN (7th consecutive verifiable round)**: RED `7d024de` (test changes only; both assertions pass at RED — test-redesign-only pattern); GREEN `59f2084` (Q-R08-SPEC.md documentation fix). Reviewer independently verified via git log + stat.

**Approach γ selection was sound**: Implementer correctly identified the arithmetic error in the operator's NEXT-ROLE.md instruction (`=== origLen - 6` for origLen=8 gives 2, not 6=curatedLen) and substituted approach γ — the brainstorm-authorized alternative. This is the correct application of tactical autonomy with disclosure.

**Binding-command verification (4th consecutive Reviewer-run)**: Reviewer independently ran `npm run typecheck` + `node --test` for all files at HEAD. 93/0 matched Implementer attestation exactly. R06+ standing policy unbroken.

---

## 2. What violated discipline

**MAJOR-1 — Implementer pre-emit-grilling: spec-premise correction incomplete across 5 Q-R08-SPEC.md surfaces**

When correcting Q-R08-SPEC.md § Mechanism primitive 11's false premise ("produces zero contamination flags"), the Implementer added an R09 EMPIRICAL CORRECTION addendum at line 74 and used the phrase "zero Stage 2a contamination flags" (not matching the AC-R09-1 grep's literal). The same false premise persisted at:
1. Line 24 (preamble bullet — "neither Stage 2a nor Stage 2b drops anything" parenthetical)
2. Line 94 (cross-section table row 11 — still references "tighten to `=== origLen`" + "Pseudocode uses `assert.strictEqual`")
3. Line 103 ("All 18 checks PASS at spec-emit time" — stale after row 11 correction fails)
4. Line 563 (Delta 11 final sentence — "MCD on the alternating-pattern signals produces zero flags")
5. Line 592 (AC-15 spec text — "clean fleet has no Stage 2a or Stage 2b drops; length === origLen exactly")

**Why this is MAJOR and not MINOR**: An auditor reading Q-R08-SPEC.md without finding the primitive 11 addendum will encounter four confident assertions of the wrong premise. The documentation-consistency failure recreates the chain condition that produced R08 MAJOR-1/MAJOR-2.

**Why this is not CRITICAL**: production code is correct; tests pass; q07 23/0; no behavioral issue.

---

## 3. Root cause analysis

**MAJOR-1 root cause**: The Implementer's brainstorm in Q-R09-SPEC.md §2 Decision A focused exclusively on the *binding form* for the AC-15 test assertion (approaches α/β/γ) — it did not enumerate the *propagation surfaces* in Q-R08-SPEC.md that cite or derive from the corrected primitive. The AC-R09-1 verification command (`grep -c "produces zero contamination flags" → 0`) was scoped to confirm the phrase was gone from the primary correction site, but was not designed to verify semantic-equivalent paraphrases or downstream sections.

**Secondary factor**: The Implementer's grilling (Q-R09-SPEC.md §7) noted the grep would fail if the phrase appeared in "the Q-R08-SPEC.md historical-record section" and fixed by removing the literal phrase entirely — but this was the wrong scope for the check. The right scope is: after correcting at the primary site, enumerate all sibling sections that state the premise or prescribe its consequences. The grilling caught one specific narrow risk (historical-record section) but not the general class (all citing sections).

---

## 4. Reinforcements added

**CLAUDE-IMPLEMENTER.md** — One new `# REINFORCED 2026-05-16` line added (13th total):
> When verifying removal or correction of a wrong factual claim in a multi-section document, check semantic paraphrases AND enumerate ALL downstream sections citing or deriving from the corrected primitive. A literal-exact grep returning 0 is not full-document consistency verification. Add a "correction propagation pass" to pre-emit grilling. Detected tessera R09 MAJOR-1.

**CLAUDE-COMMON.md** — One new `# REINFORCED 2026-05-16` line added (1st total; Item 4 from R09 round setup):
> A MEMORIAL entry authored by the violating role that characterizes its own discipline deviation as "correct" or "acceptable" in contradiction to established methodology reinforcements is an audit-trail inaccuracy. The Memorial Updater must identify and record explicit VIOLATION entries — not accept role-authored retroactive reframing. Detected tessera R08.

**~/.claude/CROSS-PROJECT-MEMORIAL.md** — tessera R09 sections appended: pre-emit-grilling violation + confirmations + new reinforcement rule ("multi-surface correction propagation"); halt-discipline confirmations; right-reasons-audit confirmations; tdd-discipline confirmations; role-boundary confirmations; anti-scope confirmations; context-isolation confirmations; emerging patterns.

**Consolidation check**: CLAUDE-COMMON.md = 1 line; CLAUDE-ARCHITECT.md = 12 lines; CLAUDE-IMPLEMENTER.md = 13 lines; CLAUDE-REVIEWER.md = 0 lines; CLAUDE-MEMORIAL.md = 0 lines. All below 30-line threshold. No consolidation action required.

---

## 5. Watch list for R10

**R10 MAJOR-1 disposition (Reviewer recommendation)**: audit-tier cleanup round to amend the 5 residual Q-R08-SPEC.md surfaces at lines 24, 94, 103, 563, 592. The correct claim at each site: MCD on the clean alternating-pattern fixture produces 2 ticks contamination per run (n_ticks_contaminated=6 across 3 runs; origLen=8/run, curatedLen=6/run). The AC-15 binding is `assert.ok(curatedLen <= origLen, ...)` — NOT `assert.strictEqual`.

**MINOR-1 watch**: test/q07-fleet-correlated.test.ts:364 message string drops the `q07-` prefix from `'q07-clean-fleet-v1'`. Low priority but watch for drift between fixture label and test message.

**MINOR-3 watch**: NEXT-ROLE.md attestation table does not record the HEAD SHA per row. Standing reinforcement (R02+) asks for this. Low impact but worth closing in R10 or a future attestation cleanup.

**Pattern watch — correction propagation**: When any R10 spec corrects a prior-round claim, the Architect/Implementer must enumerate ALL sections of the target document that cite or derive from that claim before emitting. Do not limit the correction to the primary site.

**Pattern watch — OBSERVED-binding on deterministic fixtures**: AC-R09-2 n_ticks_contaminated===6 was classified as borderline-acceptable under R07 MAJOR-2 scope (PRNG-drift class only). The Reviewer flagged this for future monitoring. If a future round binds another MCD output observation without a theoretical justification, the right-reasons audit should re-examine whether it's within scope.

---

## 6. Emerging cross-project patterns

**Correction rounds can be under-scoped**: A corrective round that fixes the primary site without enumerating sibling sites recreates documentation debt. The failure mode ("I corrected the claim where it was stated; I didn't check where it was cited or paraphrased") is predictable and preventable by adding a "correction propagation pass" to pre-emit grilling for any round whose purpose is fixing a prior wrong claim.

**Tessera 8-round 0-CRITICAL streak (R02–R09)**: All MAJOR findings in tessera's history are documentation-consistency or audit-trail violations — never a production correctness issue. The algorithm preservation constraint (R09-SAS-1) has been independently verified by Reviewer for every round since it was established.

**Audit-tier TDD "test-redesign-only" pattern (2nd occurrence)**: R08 and R09 both used a RED commit that modified only test files — with both assertions passing at RED because production already produces correct values. This is authorized for test-redesign-only rounds (no production behavior change). The pattern is now well-understood and reproducible.
