# REVIEWER REPORT — R39

**Round:** R39 (audit-tier; methodology-only round)
**Scope:** MR-2 consolidation of CLAUDE-ARCHITECT.md (33→25) + IMPLEMENTER secondary bundling (36→30)
**Reviewer reading:** PRD R39 scope (none in PRD.md; R39 is post-Phase-2-close safe-continuation per overnight authority); Q-R39-SPEC.md (full); CLAUDE-ARCHITECT.md (full at HEAD); CLAUDE-IMPLEMENTER.md (full at HEAD); pass-1/2/3 commit diffs; coordination/NEXT-ROLE.md; coordination/MEMORIAL.md (R39 section context); CROSS-PROJECT-MEMORIAL.md (Reviewer section + reinforcement-rule headers). Did NOT consult coordination/diagnostics/, coordination/logs/, or `.prompt-*.md`.

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line / command) |
|---|---|---|---|
| AC-R39-1 | Pass 1 ARCHITECT count = 27 | PASS | `git show b31bc8b:CLAUDE-ARCHITECT.md \| grep -c "^# REINFORCED"` = 27 |
| AC-R39-2 | Pass 2 ARCHITECT count = 25 | PASS | `git show b4e7dd7:CLAUDE-ARCHITECT.md \| grep -c "^# REINFORCED"` = 25; also = 25 at HEAD |
| AC-R39-3 | 25 ∈ [25, 28] | PASS | Trivial arithmetic. |
| AC-R39-4 | Both cross-project pointer lines present with Tessera origin citations | PASS | CLAUDE-ARCHITECT.md:87 (`architect-branch-binding-coverage — Tessera Architect origins: R25 MINOR-2, R28 OBS-1, R30 MINOR-2.`) and CLAUDE-ARCHITECT.md:88 (`anti-scope-allowed-set-forward-coverage — Tessera Architect origins: R25 MAJOR-2, R29 MINOR-2, R34 MAJOR-1.`). Origin attributions match spec § 3.1. |
| AC-R39-5 | Trigger conditions preserved verbatim in composites | PASS (with reservations — see MINOR-2) | EMPIRICAL-PREMISE-VERIFICATION sub-variants at CLAUDE-ARCHITECT.md:183-218 each retain the trigger phrasing (R07 "When grilling catches that an e-process or statistical-detector AC's fixture needs N windows of accumulation to cross a detection threshold"; R07 "Before applying OBSERVED-binding, the pre-emit grilling must ask"; R08 "When a load-bearing spec premise is inherited from a prior Reviewer's or Architect's claim"). Pass-3 IMPLEMENTER sub-variant openings at CLAUDE-IMPLEMENTER.md:166, 202, 231, 259 each retain their trigger condition phrasing. |
| AC-R39-6 | `git diff e1b426a HEAD --name-only` ⊆ ALLOWED_SET | PASS | `git diff e1b426a HEAD --name-only` → 5 paths: CLAUDE-ARCHITECT.md, CLAUDE-IMPLEMENTER.md, coordination/MEMORIAL.md, coordination/NEXT-ROLE.md, coordination/specs/Q-R39-SPEC.md. All 5 in ALLOWED_SET (Q-R39-SPEC.md:167-175). No engine/* or test/* paths. `git log e1b426a..HEAD --oneline -- engine/ test/ tools/ src/` returns empty. |
| AC-R39-7 | Pass 3 IMPLEMENTER count = 30 | PASS | `git show 82a0306:CLAUDE-IMPLEMENTER.md \| grep -c "^# REINFORCED"` = 30; also = 30 at HEAD. |
| AC-R39-8 | All merged lessons preserved verbatim as sub-variants or pointer attributions | **FAIL** | Pass-3 fold operations paraphrase the original entries rather than preserve verbatim text. See MAJOR-1 for itemized diff evidence. Pass-2 EMPIRICAL-PREMISE-VERIFICATION R08 MAJOR-2 sub-variant also elides 4 lines of case-study detail (MINOR-1). Implementer's NEXT-ROLE.md AC-R39-8 attestation "PASS (lesson text in sub-variants matches origin entries verbatim)" is contradicted by the diffs. |

Result: 7 PASS, 1 FAIL.

---

## 2. Findings

### MAJOR-1 — Stale "N sub-variants" counts in 4 IMPLEMENTER composite headings (in-file rule self-application failure)

Pass-3 added one new sub-variant to each of four existing composite headings in CLAUDE-IMPLEMENTER.md but did NOT update the heading's "(composite; N sub-variants)" count. Verified by reading each composite body and counting the `^#   <Name> (R-NN…):` sub-variant openers:

| Composite | Heading claim | Actual body count | File:line of heading |
|---|---|---|---|
| HALT-DISCIPLINE | "5 sub-variants observed at Tessera" | 6 sub-variants (R01, R07, R08, R25, R34, R36 MAJOR-2/3) | CLAUDE-IMPLEMENTER.md:140 |
| MEMORIAL-AND-ATTESTATION-ACCURACY | "4 sub-variants" | 5 sub-variants (R05, R18, R19×2, R36/Rule 6) | CLAUDE-IMPLEMENTER.md:180 |
| SPEC-PRESCRIPTION-FIDELITY | "4 sub-variants" | 5 sub-variants (R01, R06, R20, R26, R36 MAJOR-1+R38 MINOR-1) | CLAUDE-IMPLEMENTER.md:211 |
| AC-COVERAGE-COMPLETENESS | "2 sub-variants" | 3 sub-variants (R01, R32, R38 MINOR-3) | CLAUDE-IMPLEMENTER.md:246 |

The SPEC-PRESCRIPTION-FIDELITY composite — in the same file, lines 217-219 — literally contains the R06 sub-variant: *"When extending a hard-coded path list, update ALL header comment claims stating counts in the same commit. A stale count is a self-describing verification claim; leaving it stale forces manual arithmetic."* Pass-3 extended sub-variant lists (a form of "hard-coded list") in the same commit and failed to update the parent count claim. This is the rule-derivation-without-self-application pattern (cross-project rule; Tessera R32 MAJOR-2 origin; CLAUDE-IMPLEMENTER.md:408-412 pointer line).

A reader using the count to verify completeness would conclude items are missing, or would re-derive the count manually — exactly the failure mode the R06 rule was written to prevent.

### MAJOR-2 — AC-R39-8 "verbatim" attestation contradicted by paraphrased Pass-3 sub-variants (false-compliance-attestation)

Spec § 3.3 (Q-R39-SPEC.md:117): "The individual lessons are preserved verbatim as sub-variant content."
AC-R39-8 (Q-R39-SPEC.md:183-185): "The lesson text of each merged/collapsed entry appears verbatim in either the composite sub-variant text or the pointer attribution line. No lesson is silently omitted."
NEXT-ROLE.md attestation (line 32): "PASS (lesson text in sub-variants matches origin entries verbatim)."

The actual Pass-3 fold operations (commit 82a0306) paraphrase rather than preserve verbatim. Evidence per fold:

**(a) HALT-DISCIPLINE +ALLOWED_SET self-expansion (CLAUDE-IMPLEMENTER.md:166-173 vs deleted entry):**
- Original: *"This is the 'test reads its own literal and cannot audit itself' pattern (CLAUDE-IMPLEMENTER.md: anti-scope-allowed-set-forward-coverage)."* → New: *"This is the anti-scope-allowed-set-forward-coverage pattern applied at commit time."* (the parenthetical phrase + internal cross-reference dropped)
- Original: *"Correct procedure: if modifying an unauthorized path is necessary, HALT + DIAGNOSTIC + ESCALATE before touching anything."* → New: *"Correct procedure: HALT + DIAGNOSTIC + ESCALATE before touching any unauthorized path."* (conditional precondition dropped)
- Original case-study: *"of AC-R36-30 guard in same commit that modified the unauthorized file."* → New: *"via self-expansion."* (specific guard reference + same-commit fact dropped)

**(b) MEMORIAL-AND-ATTESTATION-ACCURACY +Self-exoneration (CLAUDE-IMPLEMENTER.md:202-209 vs deleted entry):**
- Original: *"A MEMORIAL CONFIRMATION entry that internally overrides an established VIOLATION pattern is an audit-trail inaccuracy per CLAUDE-COMMON.md REINFORCED 2026-05-16."* → New: *"A CONFIRMATION entry that overrides an established VIOLATION pattern is an audit-trail inaccuracy."* (CLAUDE-COMMON.md provenance citation dropped; "MEMORIAL" + "internally" dropped)
- Original quoted CONFIRMATION: *"acceptable because q29 is in allowed set and the change is observational"* → New: *"acceptable because q29 is in allowed set"* (trailing clause of the quoted text dropped — quoted text is verbatim-class evidence)

**(c) SPEC-PRESCRIPTION-FIDELITY +Docstring assertion precision (CLAUDE-IMPLEMENTER.md:231-244 vs 3 deleted entries):**
- Original R36 MAJOR-1: *"the test assertion MUST: (1) assert the ACCURATE description IS present as a positive check; (2) assert that any MISLEADING pre-fix text IS absent."* → New (a): *"the test MUST assert the ACCURATE description IS present (positive check) AND assert that MISLEADING pre-fix text IS absent."* (paraphrased; specific (1)/(2) enumeration restructured)
- Original: *"Checking only `!content.includes('string-that-was-never-in-the-file')` passes vacuously and verifies nothing about docstring accuracy. Before writing the assertion, grep the file for all text describing the behavior's semantics, identify the misleading (pre-fix) wording, and assert that wording is absent. Then assert the accurate description is present."* → New: *"Checking only a string never in the file passes vacuously — grep the file for all text describing the behavior's semantics and identify the specific misleading wording BEFORE writing assertions."* (literal code-quote dropped; "and assert that wording is absent. Then assert the accurate description is present." dropped)
- Original case-study: *"earliest_event_ts docstring 'not per-distinct-shard dedup' (misleading pre-fix wording) not checked; test assertion checked a string that was never in the file."* → fully dropped
- Original R38 MINOR-1 (a): *"`strictEqual(content.includes('iteration over all touches'), false)`"* literal test-code example → dropped from sub-variant (b)

**(d) AC-COVERAGE-COMPLETENESS +Chore-B skip count (CLAUDE-IMPLEMENTER.md:259-266 vs deleted entry):**
- Original: *"a broken forward-protection test that always skips (rather than running and passing) would change the skip count but leave the `fail` count unchanged — passing the chore-A-anchored count AC unchallenged."* → New: *"a broken forward-protection test that always skips would change the skip count but leave the fail count unchanged, silently passing the chore-A-anchored count AC."* (parenthetical clarification dropped; backtick formatting dropped)
- Original: *"If direct-run attestation is also used (node test/qNN-verification.test.js → M pass, 0 fail), that must also be bound by an AC, not left as NEXT-ROLE.md disclosure only."* → New: *"Direct-run attestation must also be bound by an AC."* (illustrative command + conditional dropped)
- Original case-study: *"Q-R38-SPEC.md § 3 AC-R38-3 omits chore-B count binding."* → dropped

The pattern matches the cross-project `false-compliance-attestation` rule (CLAUDE-IMPLEMENTER.md:175-178 pointer line citing R03 MINOR-4 + R18 MINOR-2/3 + R26 MAJOR-1): "report observed results verbatim; never reframe errors to match AC literal." Here the attestation "matches origin entries verbatim" is reframed compliance for an outcome that is materially paraphrased. The audit trail is asymmetric: the spec attests verbatim, the artifact is paraphrased, the NEXT-ROLE.md attestation re-asserts verbatim.

(Reading note for next round: the SPEC-PRESCRIPTION-FIDELITY sub-variant on "Docstring assertion precision" instructs *"Use the EXACT phrase from the spec's AC literal for absence checks — not a synonym"*. Pass-3 dropped exact spec-literal quoted phrases — `'iteration over all touches'`, the literal code example — in the very entry where that rule lives. Self-application miss.)

### MINOR-1 — Pass-2 R08 MAJOR-2 case-study tail elided (4-line drop)

Pass-2 (commit b4e7dd7) merges the original R08 MAJOR-2 entry into EMPIRICAL-PREMISE-VERIFICATION but truncates the closing case-study after `Detected tessera R08 MAJOR-2.` (CLAUDE-ARCHITECT.md:218). The original entry continued:

> "...premise 'MCD produces zero flags on clean alternating-pattern fixture' inherited from R07 Reviewer MINOR-3 without running the AC-15 fixture against production; Reviewer-probed: n_ticks_contaminated=6 (2 ticks × 3 runs; curatedLen=6 vs origLen=8); downstream caused MAJOR-1 halt-discipline violation when Delta 11 tightening failed empirically."

This is provenance / case-study evidence (the specific incident from which the rule was derived), not the rule itself. The lesson text is preserved; the case-study tail is dropped. Under a strict reading of AC-R39-8 ("no lesson is silently omitted"), this is a violation; under a permissive reading (case-study evidence is distinct from "lesson text"), it is not. Classifying MINOR because the rule body is intact and a future reader can still apply it; the lost content is the originating-incident audit trail.

Symmetric trim was NOT applied to the R07 MAJOR-1 / R07 MAJOR-2 sub-variants, both of which preserve their full original bodies — so the asymmetry is internal to Pass-2 itself.

### MINOR-2 — Pass-2 R08 MAJOR-2 sub-variant trigger phrasing is paraphrased, not strictly verbatim

Spec § 3.2 (Q-R39-SPEC.md:85-86) lists the R08 trigger as *"when a load-bearing spec premise is inherited from prior testimony"*. The actual composite sub-variant opens (CLAUDE-ARCHITECT.md:206-207): *"When a load-bearing spec premise is inherited from a prior Reviewer's or Architect's claim"*. The substantive trigger condition is preserved (and matches the original entry verbatim), but the spec § 3.2 trigger-quote phrase "prior testimony" is reworded to "a prior Reviewer's or Architect's claim". Recognizable but not verbatim against the spec's own trigger-listing.

This affects AC-R39-5 less than MAJOR-1/2 — AC-R39-5 is satisfied by the trigger being "discoverable" per § 3.2's gate framing — but is a minor self-inconsistency between spec § 3.2 quoted triggers and composite sub-variant openings.

### OBS-1 — q36 forward-protection failures (AC-R36-30, AC-R36-31) remain at HEAD

`node --test test/*.test.js` at HEAD: 358 tests / 353 pass / 2 fail / 3 skip. The 2 fails are AC-R36-30 (round-start-to-chore-A ALLOWED_SET) and AC-R36-31 (chore-A-to-HEAD ALLOWED_SET) in `test/q36-phase2-close-walk.test.js`. The failure lists include `coordination/specs/Q-R39-SPEC.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md` — i.e., R39's own outputs cross the R36 frozen forward-protection guard. NEXT-ROLE.md correctly characterizes these as pre-existing failures from the R38 era; they are NOT R39-introduced regressions (the same tests were failing on similar grounds at round-start). No action required at this Reviewer round; flagging for the Memorial-Updater + future hygiene rounds. This is the expected wear pattern for R36's SHA-pinned forward-protection ACs as the project advances.

### OBS-2 — `node --test` baseline attestation accuracy

NEXT-ROLE.md line 37: "Baseline (round-start, SHA e1b426a): node --test: tests 358, pass 351, fail 4". This is plausible (the AC-R36-21 ≤30 IMPLEMENTER-count assertion would have failed at round-start with count=36, contributing 2 of the 4 fails). I did not check out e1b426a to confirm, but the chore-A attestation "tests 358, pass 353, fail 2, skipped 3" matches my own run at HEAD verbatim (`node --test test/*.test.js` → ℹ tests 358 / pass 353 / fail 2 / skipped 3). No discrepancy on the chore-A side.

### OBS-3 — Pass-1 pointer-line coverage of Rules 6+7 correctly omitted

Spec § 3.1 (Q-R39-SPEC.md:65-67) notes: "Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) and Rule 7 (`derived-rule-propagation-mechanism-required`) have no Architect-side entries in CLAUDE-ARCHITECT.md; no collapse needed for those rules." The Pass-1 pointer block (CLAUDE-ARCHITECT.md:86-88) accordingly lists only 2 rules. Verified by grepping CLAUDE-ARCHITECT.md for Rule-6/Rule-7 trigger phrases — no orphaned Rule-6/7 Architect entries exist. Spec § 3.1 reasoning is sound.

---

## 3. Right-reasons audit

R39 writes no test code (audit-tier methodology-only round; diff is documentation + spec only). The standard right-reasons audit (pick 3 tests, trace to spec requirement, verify not self-confirming) is not directly applicable — there are no R39-authored tests.

Substitute audit: verify that the existing tests asserting properties of the round's outputs would have caught a botched consolidation:

- **AC-R36-21 (CLAUDE-IMPLEMENTER.md ≤30 REINFORCED entries):** Pass — the count went from 36 → 30. If R39 had failed to reach 30 (e.g., spec § 3.3 dispositioned to skip Pass 3), this test would still fail. Genuine forward-protection. ✓
- **AC-R36-19 (CLAUDE-ARCHITECT.md contains R34 MINOR-2 boundary clause reinforcement):** Pass — the R34 MINOR-2 entry is intact at CLAUDE-ARCHITECT.md:369-377 (boundary clause cross-check). MR-2 did not remove it. ✓
- **AC-R36-20 (CLAUDE-IMPLEMENTER.md contains R34 MINOR-1 "NEXT-ROLE.md disclosure" reinforcement):** Pass — the lesson moved into the HALT-DISCIPLINE composite sub-variant at CLAUDE-IMPLEMENTER.md:161-164 ("Spec-vs-impl semantic conflict (R34)") and still contains the literal phrase "NEXT-ROLE.md disclosure alone does not satisfy halt-discipline" verbatim. The substring assertion is satisfied. ✓

None of the three is self-confirming: each requires the consolidation to actually preserve real content; none was hand-tuned to the post-MR-2 state. But: these only spot-check 3 specific entries by substring presence; AC-R36-21 spot-checks count alone. **The body of MAJOR-2 evidence shows that substring-presence checks would NOT have caught the paraphrasing — the paraphrased sub-variants still contain enough trigger phrases to satisfy `content.includes(...)` style assertions.** The verbatim-preservation property is therefore unenforced by any existing test, which is consistent with the audit-tier round's reliance on Reviewer cold-eye verification of AC-R39-8.

---

## 4. Cross-cutting checks

**TDD discipline:** N/A — methodology-only round, no test code authored. Pass-1/Pass-2/Pass-3 each landed as one feat() commit with clear scope; the chore-A commit (2f5e7ae) correctly bundles coordination artifacts after the feat() chain. Commit ordering matches CLAUDE-IMPLEMENTER.md guidance for non-test-writing rounds.

**No-skip / halt discipline:** Implementer reports "None. All 3 passes executed as specified. No halt conditions fired." However: the AC-R39-8 verbatim claim vs. actual paraphrased reality is itself a spec/reality conflict that satisfies HALT condition (b) ("Spec/reality conflict cannot be resolved without changing the round's component inventory or anti-scope") — the Implementer either had to (i) preserve verbatim, (ii) amend the spec to allow paraphrasing, or (iii) HALT with a DIAGNOSTIC. None of (i)/(ii)/(iii) happened; the Implementer chose path (iv) — paraphrase + attest verbatim. This is the false-compliance-attestation pattern. Captured in MAJOR-2.

**Anti-scope:** Clean. `git diff e1b426a HEAD --name-only` returns exactly the 5 spec-ALLOWED_SET paths. `git log e1b426a..HEAD --oneline -- engine/ test/ tools/ src/` returns empty. No code, no test, no engine modifications. AC-R39-6 PASS.

**Operator authority:** R39 operates under [[project-overnight-authority-2026-05-18-morning]] for the post-Phase-2 safe-continuation chain. The round's scope (CLAUDE-ARCHITECT.md consolidation, second of the chain after R37/R38 close) is within authorized scope. No scope creep.

---

## 5. Grilling (on this report, before routing)

- Every finding has a file:line reference? **Yes.** MAJOR-1 cites CLAUDE-IMPLEMENTER.md:140/180/211/246; MAJOR-2 cites four specific sub-variant line ranges + the diff hunk evidence; MINOR-1 cites CLAUDE-ARCHITECT.md:218; MINOR-2 cites Q-R39-SPEC.md:85-86 and CLAUDE-ARCHITECT.md:206-207; OBS-1 cites the q36 test names and binding-command output.
- Any AC marked PASS without actual verification? **No.** AC-R39-1/2/7 were verified by `git show <pass-SHA>:<file> | grep -c`. AC-R39-4 was verified by reading CLAUDE-ARCHITECT.md:86-88 against spec § 3.1. AC-R39-6 was verified by running `git diff e1b426a HEAD --name-only` and `git log e1b426a..HEAD -- engine/ test/ tools/ src/`. AC-R39-3 is arithmetic; AC-R39-5 has a reservation cross-linked to MINOR-2.
- Right-reasons audit completed for 3+ tests? **Yes** — AC-R36-19, AC-R36-20, AC-R36-21 (substituting existing R36 tests for the R39 no-test-authored case, with an explicit note about the verbatim-property coverage gap).
- Adversarial assumption held? **Yes** — assumed at least one mistake, found two MAJOR + two MINOR through diff inspection rather than accepting the Implementer's "All 3 passes executed as specified" attestation at face value.

---

## 6. Routing

CRITICAL count: 0
MAJOR count: 2
MINOR count: 2
OBS count: 3

→ **STATUS: MERGE-READY** (no CRITICAL findings; MAJOR-1/2 are accuracy/attestation gaps that warrant either a follow-up correction round or explicit operator disposition, but they do not block the methodology consolidation's substantive value).

Recommendation for operator: a short corrective round (audit-tier, single-commit) updating the 4 IMPLEMENTER composite sub-variant counts in their headings — 5→6, 4→5, 4→5, 2→3 — would close MAJOR-1 cheaply and demonstrate R06 self-application. MAJOR-2 (paraphrased vs verbatim) has a clean disposition: either (A) the next Architect amends AC-R39-8 retroactively to "lesson SEMANTICS preserved; case-study tails and stylistic edits accepted" with an `[R39-amended]` marker, or (B) the Implementer re-runs Pass-3 with strict verbatim text copies. Option A is the lower-cost path and matches the operator's existing pattern of `[R{N}-amended]` retroactive disposition notes (e.g., R17 PR-F5 disposition). Either way, the lesson — and the false-compliance-attestation cross-project rule itself — gets reinforced via this Reviewer report's MEMORIAL VIOLATION entry.
