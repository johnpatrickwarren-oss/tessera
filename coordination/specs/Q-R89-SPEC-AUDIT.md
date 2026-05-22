# Q-R89-SPEC-AUDIT — Pre-Emit Grilling (Implementer-as-Architect)

**Round:** R89 (audit-tier)
**Date:** 2026-05-21
**Spec SHA:** (committed with this file)

---

## § A1 — Brainstorm completeness

3 approaches documented for each of 3 key design decisions (NEXT-ROLE shard strategy, CLAUDE-ARCHITECT.md consolidation strategy, sustaining mechanism shape). Each approach has: strengths, weaknesses, hidden assumptions, risks. Selection rationale written for each (what was chosen AND what was rejected and why). ✓

## § A2 — Design sketch

Component boundaries:
- EXISTS: coordination/MEMORIAL.md (2,825 lines) → CHANGED (reset to header + index + R88 entries)
- EXISTS: coordination/NEXT-ROLE.md (7,961 lines) → CHANGED (reset to 126 lines + index section)
- EXISTS: CLAUDE-ARCHITECT.md (51 REINFORCED entries) → CHANGED (→ 24 entries via composite folding)
- EXISTS: CLAUDE-IMPLEMENTER.md (41 REINFORCED entries) → CHANGED (→ 30 entries via 11 folds)
- EXISTS: scripts/finalize-round.sh → CHANGED (+Step 7b threshold check)
- CREATED: coordination/MEMORIAL-PHASE-3.md (12-line header + sed-n '58,1720p' body)
- CREATED: coordination/MEMORIAL-PHASE-4.md (12-line header + sed-n '1721,2752p' body)
- CREATED: coordination/NEXT-ROLE-PHASE-4.md (12-line header + sed-n '127,7961p' body)
- CREATED: scripts/check-claude-md-thresholds.sh (threshold checker)
- CREATED: test/q89-methodology-hygiene.test.ts (8 ACs)
- CREATED: coordination/specs/Q-R89-EMPIRICAL.sh

Integration points:
1. sed extraction → shard files: verify `diff <(git show db232d9:coordination/MEMORIAL.md | sed -n '58,1720p') <(tail -n +13 coordination/MEMORIAL-PHASE-3.md)` → empty
2. Active MEMORIAL.md reset: lines 1–57 preserved; lines 2753–2825 preserved; new index rows inserted at lines 43–47 region
3. Active NEXT-ROLE.md reset: lines 1–126 preserved; new phase-shard-index section appended
4. CLAUDE-*.md composite folding: `^# REINFORCED` grep-counts verified at chore-A
5. check-claude-md-thresholds.sh exit code: 0 at post-R89 state (all counts below 40 threshold)
6. finalize-round.sh Step 7b: calls check-claude-md-thresholds.sh inside _FINALIZE_PIPELINE_ACTIVE guard
7. test/q89-methodology-hygiene.test.ts: imports execSync from child_process, uses git show db232d9:... to extract pre-R89 content for byte-identity diffs

Failure modes:
1. sed extraction: line-number boundaries off-by-one → verified by direct read at db232d9 (lines 1720 = last R72 content; 1721 = first R73 content; 126 = last R89 directive line; 127 = first prior-content line)
2. Active MEMORIAL.md reset: partial preservation (losing R88 entries) → AC-R89-7 catches this
3. Active NEXT-ROLE.md reset: losing lines 1–126 → AC-R89-8 catches this
4. CLAUDE-*.md folding: paraphrase or silent drop → HALT condition 8; pre-emit grilling verified below
5. check-claude-md-thresholds.sh: false 0 exit when counts are high → AC-R89-6 plus direct count verification (ACs 4+5)
6. finalize-round.sh integration: infinite recursion → _FINALIZE_PIPELINE_ACTIVE guard prevents it (per existing Step 7 pattern)
7. Test byte-identity: git show db232d9 fails (SHA not in repo) → verified: db232d9 is HEAD at round-start, present in repo

## § A3 — Pre-emit grilling (5 gates)

**Gate 1: Every claim is verifiable**
- Line 1720 = last R72 MEMORIAL entry: verified by `grep -n "^## R72\|^## R73" coordination/MEMORIAL.md` → R72 at 1611, R73 at 1721; line 1720 is the blank separator. ✓
- Line 2752 = last R87 MEMORIAL entry: verified by `grep -n "^## R87\|^## R88" coordination/MEMORIAL.md` → R87 at 2683, R88 at 2753; line 2752 is blank separator. ✓
- Line 126 = last line of active NEXT-ROLE directive block: verified by direct read (line 126 = `---`). ✓
- Line 127 = `## § R87 close attestation`: verified by direct read. ✓
- Pre-R89 REINFORCED count ARCH=51, IMPL=41: verified by `grep -c '^# REINFORCED'`. ✓

**Gate 2: No unstated assumptions**
- ASSUMED: git show db232d9 works in test context (it's a local repo commit, not a remote). No remote needed for this. ✓
- ASSUMED: shard header is exactly 12 lines (matches MEMORIAL-PHASE-2.md format — verified). ✓
- ASSUMED: CLAUDE-*.md files not in anti-scope of any currently-passing test. Checked: AC-R85-19 includes CLAUDE-ARCHITECT.md + CLAUDE-IMPLEMENTER.md in its ALLOWED_SET; test is currently FAILING (one of the 15 pre-existing fails). ✓

**Gate 3: No scope beyond request**
- No engine modifications.
- No substantive product code (only scripts + coordination files + CLAUDE files).
- 8 ACs is the minimum needed to cover all deliverables. ✓

**Gate 4: Next role can act with zero clarifying questions**
- CLAUDE-IMPLEMENTER.md fold: 11 specific entries named with target composite. ✓
- CLAUDE-ARCHITECT.md fold: specific 14+8+7 = 29 entries named with target composites. ✓
- MEMORIAL.md boundaries: exact line numbers provided. ✓
- NEXT-ROLE.md boundary: exact line number provided. ✓
- check-claude-md-thresholds.sh: behavior specified (WARN at [30,40), ERROR at ≥40). ✓

**Gate 5: Self-application of reinforcement rules**
- encode-actual-results-verbatim: test counts (710/691-692/14-15/4) derived from actual observed baseline (702/683/15/4) + mathematical calculation, not memorized from spec text. ✓
- R39 MAJOR-1 (heading count same commit): noted in § 2.3 and § 2.4 as explicit requirement. ✓
- R42 byte-identical (no paraphrase): shard body is `sed -n '...'` extract, not rewrite. ✓
- R77 --test-reporter=tap: EMPIRICAL.sh will use this. ✓
- spec commit before routing: spec files (SPEC.md + SPEC-AUDIT.md) committed before writing routing block in NEXT-ROLE.md. ✓

## § A4 — Design decisions and why-rejected

| Decision | Chosen | Rejected (and why) |
|---|---|---|
| NEXT-ROLE shard strategy | Single NEXT-ROLE-PHASE-4.md | B (routing blocks span both phases — false precision); C (naming convention mismatch) |
| CLAUDE-ARCHITECT consolidation | Expand existing + 2 new composites | B (EMPIRICAL-PREMISE-VERIFICATION unwieldy at 35 sub-variants, theme mismatch for non-empirical entries); C (over-grouping, premature) |
| Sustaining mechanism | Option α (check-claude-md-thresholds.sh in finalize-round.sh) | β (advisory-only, not load-bearing); γ (auto-consolidation risk, 180-day script is no-op) |

## § A5 — Known spec gaps / acknowledged limitations

- AC-R89-7 (R88 entries preserved) requires verification at a point BEFORE R89 entries are appended to MEMORIAL.md. In the test, we use `git show db232d9:coordination/MEMORIAL.md | sed -n '2753,2825p'` and compare against the current MEMORIAL.md at those same line numbers. This is valid before R89 MU appends but will NOT be byte-identical after MU appends (line numbers shift). Test is designed to run against the pre-MU state (chore-A attestation).
- The 21 remaining standalones in CLAUDE-ARCHITECT.md after consolidation is acceptable per the ≤30 target; further consolidation deferred to a future methodology round.
- NEXT-ROLE-PHASE-4.md contains Phase 3 directives (lines 3714–5979 of original NEXT-ROLE.md) under a "Phase 4" label. This imprecision is documented in the shard header and phase-shard-index. No semantic loss.
