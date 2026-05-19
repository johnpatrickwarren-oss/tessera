# ROUND-R38-SUMMARY.md — latest_event_ts MAJOR-1 Remediation

**Round:** R38  
**Tier:** Audit (Implementer wears Architect + Implementer hats; cold Reviewer)  
**Reviewer mode:** Standard (non-hybrid per OQ-W5-4 Coordinator prior B)  
**Final verdict:** 0 CRITICAL / 0 MAJOR / 3 MINOR / 4 OBS — STATUS: MERGE-READY  
**Date:** 2026-05-19  
**Streak:** 37th consecutive 0-CRITICAL round (R02–R38)

---

## What worked

**Halt discipline applied correctly.** The Implementer hit a genuine Rule 6 condition (baseline mismatch: expected 353 pass / 0 fail; actual 349 pass / 4 fail from pre-existing q36 forward-protection guard failures) and correctly filed `DIAGNOSTIC-R38-baseline-mismatch.md` with 3 bounded options + STATUS: ESCALATE. Did NOT absorb inline. This is the pattern that R36 violated twice at MAJOR-3 + MAJOR-4; R38 got it right.

**ALLOWED_SET authored pre-implementation (Rule 4 clean).** Q-R38-SPEC.md § 2.2 enumerates all 8 paths at spec commit aa0f7aa, before RED commit 41c1ff1. No post-implementation expansion detected. Reviewer independently verified: spec § 2.2 ALLOWED_SET byte-matches test ALLOWED_SET; no drift.

**Mutation-discriminating behavioral test (AC-R38-1).** Uses `strictEqual(cand.latest_event_ts, 1050)` against a fixture where gpu-0 contributes two events (1000, 1050) — deliberately constructed so max(per-shard latest) ≠ min(per-shard earliest). Reverting line 199 to `if (shardEarliest > latest) latest = shardEarliest` yields 1000 ≠ 1050 → test fails. Strong counterfactual; not a shape check.

**TDD discipline (13th+ consecutive round).** RED commit 41c1ff1 precedes GREEN commit 0b4d79f. Both AC-R38-1 (latest_event_ts returned 1000, not 1050) and AC-R38-2 ("not per-distinct-shard dedup" present in pre-fix file) fail at RED for substantively correct reasons. Reviewer verified independently via git log + git show aa0f7aa.

**Reviewer pre-emit grilling clean.** 6-gate self-grilling PASS: every finding cites file:line (MINOR-1: test:91-111; MINOR-2: Q-R38-SPEC.md § 3 + NEXT-ROLE.md:183 + test:8; MINOR-3: Q-R38-SPEC.md:158-168); no AC marked PASS without direct verification; right-reasons audit covers 3 tests (AC-R38-1 mutation-traced; AC-R38-2 pre-fix content verified at git aa0f7aa; AC-R38-4 external git diff reproduced independently). Adversarial mandate honored: 3 MINOR + 4 OBS. The Reviewer correctly distinguished substantive intent (met) from spec-literal fidelity (not met) for MINOR-1.

**Anti-scope verified empirically.** `git diff 41c1ff1..HEAD --name-only -- . ':!*.js'` → 6 paths, all ⊆ ALLOWED_SET. A16 `correlational_not_causal: true` preserved at line 209. No A12-anchored file modified beyond carved-out scope.

**Rule 7 self-applied before canonical landing.** Spec § 6 grilling items 4-6 enumerate Rule 4 (ALLOWED_SET pre-RED), Rule 2 (mutation test requirement), and Rule 3 (non-vacuous assertion coverage) compliance. The R38 Implementer applied the Rule 7 propagation surface (spec template gate) even before Rule 7 was canonically landed — recursive validation of Rule 7's mechanism at R38.

---

## What violated discipline (role, discipline, what happened)

### MINOR-1 — AC-R38-2 spec-literal divergence (IMPLEMENTER)
**Discipline:** spec-test-assertion-coverage / right-reasons  
`test/q38-verification.test.ts:91-111` diverges from spec § 2.4 / § 3 AC-R38-2 literal in two ways:
1. Absence check at line 92 uses `'not per-distinct-shard dedup'` instead of the spec-literal `'iteration over all touches'`. Both phrases co-occur in the pre-fix file at git aa0f7aa:68-70, so the check is non-vacuous — but it does not implement the AC's stated literal.
2. Presence-of-`'per-distinct-shard'` check at lines 101-111 covers only the `latest_event_ts` jsdoc. The `earliest_event_ts` jsdoc presence check is absent despite spec § 3 requiring both.

Substantive intent is met: post-fix file is accurate at both jsdocs (`engine/topology/common-mode-attribution.ts:69` for earliest; `:74` for latest). Risk: future regression reintroducing `'iteration over all touches'` without `'not per-distinct-shard dedup'` silently passes; future regression stripping `'per-distinct-shard'` from earliest_event_ts jsdoc silently passes.

### MINOR-2 — Chore-A SHA terminology contradiction (IMPLEMENTER)
**Discipline:** audit-trail-integrity  
Three R38 artifacts disagree on which SHA is "chore-A": Q-R38-SPEC.md § 3 says `0b4d79f` (GREEN/fix commit); NEXT-ROLE.md:183 says `8bf0247` (coordination commit); `test/q38-verification.test.ts:8` header says `8bf0247`. Substantively benign: no new tests landed between the two SHAs; 357/351/4/2 count holds at both. Independent reader cannot determine which SHA is canonical without reconciling across three artifacts.

### MINOR-3 — Count AC unspecified for chore-B state (IMPLEMENTER)
**Discipline:** count-AC-chore-B-coverage  
Q-R38-SPEC.md § 3 AC-R38-3 binds count only at chore-A SHA 0b4d79f (357/351/4/2). At chore-B 577b551, AC-R38-4 self-skips under `node --test` worker context, producing 358/351/4/3. No spec AC binds this state. Skip-vs-fail asymmetry: a broken AC-R38-4 that always skips would change skip count but not `fail=4`, passing AC-R38-3 unchallenged. NEXT-ROLE.md:190-194 correctly attests both SHAs — the gap is in the spec AC layer.

---

## Root cause analysis

**MINOR-1 root cause:** The Implementer applied the spirit of the `docstring-accuracy-positive-assertion` reinforcement (R36 CLAUDE-IMPLEMENTER.md) but not its letter. The reinforcement says "grep the file for all text describing the behavior's semantics, identify the misleading (pre-fix) wording." The Implementer identified `'not per-distinct-shard dedup'` as the misleading phrase — which IS present in the pre-fix file — but did not trace back to the spec-literal `'iteration over all touches'` that the AC explicitly names. The gap is between "a non-vacuous phrase" and "the exact spec-prescribed phrase." For the missing earliest_event_ts presence check: the spec clearly names both jsdoc blocks in AC-R38-2; a checklist of "spec names N blocks → test must have N assertions" was not applied.

**MINOR-2 root cause:** Two conventions for "chore-A" applied in the same round without cross-artifact reconciliation. The spec authored "chore-A" = GREEN/fix commit (matching R26/R28/R29/R30 precedent). The commit message convention for the subsequent coordination commit was `chore(R38): chore-A coordination artifacts` — which caused both NEXT-ROLE.md attestation and test file header to use that later SHA as "chore-A." No single artifact is internally wrong; cross-artifact naming is inconsistent.

**MINOR-3 root cause:** The spec is authored before chore-B (Rule 4 requires ALLOWED_SET pre-RED). At spec-authoring time, AC-R38-4's skip behavior under `node --test` was not yet known. When chore-B was implemented and the skip behavior was observed, the spec count AC was not retroactively updated. The discipline gap: the spec count AC should include a chore-B row whenever chore-B adds tests that change the count from chore-A.

---

## Reinforcements added

**CLAUDE-IMPLEMENTER.md** (`/Users/johnwarren/concord/tessera/CLAUDE-IMPLEMENTER.md`):
1. **REINFORCED 2026-05-19** — `spec-literal-absence-check-exactness`: When implementing an AC absence check on docstring text, use the EXACT spec-literal phrase, not a synonym that happens to co-occur in the pre-fix file. A future regression reintroducing the spec-literal phrase without the synonym would silently pass the non-literal check. Detected tessera R38 MINOR-1: `test/q38-verification.test.ts:92`.
2. **REINFORCED 2026-05-19** — `docstring-presence-check-completeness`: When a spec AC names multiple jsdoc blocks for presence checks, each named block must have its own extraction and its own separate assertion. Count spec-named blocks vs. test assertions before chore-A commit. Detected tessera R38 MINOR-1: `test/q38-verification.test.ts:101-111` covers only `latest_event_ts`.
3. **REINFORCED 2026-05-19** — `count-AC-chore-B-coverage`: When chore-B adds a forward-protection test that self-skips under the standard binding command, the spec must include a chore-B count AC binding the post-chore-B state. The skip-vs-fail asymmetry means a broken AC that always skips does not change `fail` count. Detected tessera R38 MINOR-3: `Q-R38-SPEC.md § 3 AC-R38-3` omits chore-B count binding.

**CLAUDE-IMPLEMENTER.md count after appends:** 36 REINFORCED lines (above 30 threshold).

**~/.claude/CROSS-PROJECT-MEMORIAL.md**:
- R38 tessera entries appended: 3 violations (MINOR-1/2/3 per above) + 5 confirmations (halt-discipline, tdd-discipline, anti-scope, right-reasons, pre-emit-grilling).
- **Rule 7 (`derived-rule-propagation-mechanism-required`) canonically landed** per OQ-W5-1 Option A operator authorization. Draft text from WAVE-GATE-05.md § Cross-project reinforcement rules derived this gate (Decision 3) used verbatim with 3-occurrence trigger enumeration (R32 MAJOR-2, R34 MAJOR-1, R36 MAJOR-3+4). This completes the 7-rule cross-project discipline set for Tessera.

---

## Watch list for next round

1. **MINOR-1 remediation candidate (R39):** `test/q38-verification.test.ts:91-111` uses wrong absence phrase and misses earliest_event_ts presence assertion. If R39 patches this file, ensure it is in R39 ALLOWED_SET pre-RED-commit.

2. **SHA naming convention:** Future rounds should establish which commit is "chore-A" in the spec before the first commit and maintain that usage across spec, NEXT-ROLE.md, and test file headers. The commit-message convention should not diverge from the spec-defined chore-A SHA.

3. **Chore-B count AC coverage:** When chore-B adds any test that self-skips under `node --test`, add a chore-B count AC to the spec at chore-B time. The NEXT-ROLE.md attestation is insufficient — the AC layer must bind it.

4. **q36 forward-protection guard failures (4 permanently-tripped):** AC-R36-21, AC-R36-23, AC-R36-30, AC-R36-31 remain tripped and cannot be fixed within R38 or R39 anti-scope without operator-authorized scope expansion. R40/R41 repo hygiene audit may address. Watch for additional tests sensitive to `CLAUDE-IMPLEMENTER.md` REINFORCED count (currently 36; above the ≤30 guard threshold from AC-R36-21).

5. **Rule 7 propagation surfaces (R39+ validation):** Rule 7 canonically landed at R38. The three required propagation surfaces — (a) spec template gate, (b) pre-commit grep script, (c) round-of-derivation self-application — should be validated at R39 entry. If `scripts/pre-commit-rule-sweep.sh` does not yet exist, R39 operator disposition will determine whether to create it.

---

## Emerging cross-project patterns

**spec-test-assertion-coverage (9th+ tessera instance):** R38 MINOR-1 adds a new sub-class: applying the docstring-accuracy-positive-assertion discipline but using a non-spec-literal phrase for the absence check. Rule 3 + CLAUDE-IMPLEMENTER.md reinforcements cover the general class; the phrase-exactness sub-class is now explicitly named in the R38 reinforcements.

**count-AC chore-B gap (1st tessera instance):** Skip-vs-fail asymmetry in `node --test` creates a structural blind spot for forward-protection tests that self-skip. The forward-protection test transitions from PASS to SKIP after chore-B; the chore-A-anchored count AC cannot detect that transition. Below 3-instance cross-project rule threshold; watch for recurrence.

**SHA terminology drift (1st tessera instance):** Spec-authored SHA names can diverge from commit-message conventions applied post-hoc. No cross-project rule derivation threshold yet; single-instance.

---

## Recommend reinforcement consolidation

**CLAUDE-IMPLEMENTER.md** is at **36 REINFORCED lines** after R38 appends (exceeds 30-line threshold).  
**CLAUDE-ARCHITECT.md** is at **33 REINFORCED lines** (pre-existing condition above threshold).

Run `./scripts/consolidate-reinforcements.sh` on both files to archive lines older than 180 days.  
*(Operator-triggered; the script does not auto-run.)*
