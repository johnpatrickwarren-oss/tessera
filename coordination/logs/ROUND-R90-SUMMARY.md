# ROUND-R90-SUMMARY — Engine npm extract (Phase 5 SLICE 3 round 1)

## What worked

**Full-tier discipline execution.** Architect performed comprehensive 11-gate pre-emit grilling (§ 8.1-8.11 of Q-R90-SPEC.md); Implementer executed RED→GREEN TDD cycle with zero halt-condition violations; Reviewer reproduced all binding commands and 3 right-reasons audits cold-eye; all 14 ACs PASS at both Implementer chore-A and Reviewer HEAD. Empirical baseline (§ 0 P0.1-P0.14) recorded at round-start SHA `65edb85` before spec-emit per R86/R87/R88 sub-pattern lessons.

**Anti-scope preserved.** Implementer applied spec § 3 pseudocode verbatim across 6 files (engine/package.json, engine/README.md, tsconfig.json 1-line outDir delta, package.json 1-line script addition, .gitignore 1-line append, VENDORING-MANIFEST.md header note). No engine algorithm modifications; no Tessera-internal consumer modifications; git diff from round-start SHA shows 12 paths, all in ALLOWED_SET § 5.3 regex per R82 propagation discipline.

**Build pipeline verified end-to-end.** AC-R90-7/8 bind tsc build → engine/dist/ (252 artifacts); AC-R90-9 binds pnpm pack tarball content (255 entries, no raw .ts, no test/coordination/tools prefixes). Backwards-compat smoke: test suite passes within fail-count band [16,17] and pass-count band [702,707]; AC-R89-8 routing-flip + AC-R84-14 stochastic flake both active and predicted per R85 CRITICAL-1 discipline.

**Option A architectural decision defended.** Architect brainstormed 3 approaches (Option A standalone at engine/; Option B monorepo restructure; Option 3 decorative-only), identified 4 directive/empirical constraints eliminating B + 3 (backwards-compat goal, build-artifact deliverable, pnpm-workspace.yaml gitignore conflict per P0.8, directive halt condition 11), and documented selection rationale in § A1 + § A4. Design sketch (§ A2) enumerated 10 integration points + failure modes + PRD requirement cross-walk.

## What violated discipline (role, discipline, what happened)

**ARCHITECT — spec-literal-count-not-verified (MINOR-1).** Q-R90-SPEC.md § 0 P0.2 asserted "12 `export * from` lines" in engine/types/index.ts; actual file has 13. The same P0.2 row lists 13 items in prose, internally inconsistent. Violates Rule 1 sub-class empirical-command-attestation: integer claims in P0 rows must be verified via actual grep -c at spec-emit HEAD. Same pattern observed at R40 + R88. Inactive (exports map prescription is correct; AC-R90-4 covers fleet + self-normalized-fallback as explicit subpaths). Does not affect delivery.

**ARCHITECT — acknowledged-gap-completeness-incomplete (MINOR-2).** Q-R90-SPEC.md § 5.4 acknowledged-gap table listed 5 gaps but omitted 2 structural gaps: (a) AC-R90-4 binds 16+8 of ~35 prescribed exports; ~10 unenforced subpaths could be dropped without triggering AC; (b) AC-R90-12 asserts `'pack:engine' in scripts` but does not runtime-test script body — a broken script would pass. Discipline: R74 MINOR-2 pairing + SPEC-PRESCRIPTION-DISCIPLINE composite requires enumerating ALL known-structural gaps. Inactive this round (Implementer produced fully compliant artifact). Mitigations documented in spec § 5.4 rows but incomplete table.

**IMPLEMENTER — spec-pseudocode-widened-by-implementer (MINOR-3).** Spec § 4.2 step 6 prescribes ".gitignore +1 line (engine/*.tgz)"; Implementer added 2 lines (helpful comment `# R90: engine pack tarball...` + rule). Comment improves discoverability but was not part of prescribed pseudocode. Same class as spec-pseudocode-narrowing-or-widening observations (precedent tessera R02). Recorded at MINOR for verbatim-pseudocode discipline (minor deviation, no delivery impact).

**ARCHITECT — empirical-count-claim-does-not-reproduce (MINOR-4).** Q-R90-SPEC.md § 0 P0.13 asserts "56 distinct relative imports" from grep command; Reviewer-reproduced analogous engine-scoped grep returns 48. Grep-command variance possible (broader `\.\.` regex vs engine-anchored); load-bearing claim (exports map covers external surface) IS verified independently. Integer "56" itself is unverifiable from spec's cited command at Reviewer HEAD. Same class as MINOR-1. Inactive (external-consumption surface coverage IS independently audited).

## Root cause analysis (why each violation occurred)

1. **MINOR-1 (count mismatch):** Architect enumerated the re-export list in prose (13 items) but did not cross-validate the count "12" against actual file output via command run. Inferred the count from the prose list instead of executing the query. Root: no explicit `grep -E 'export \* from' | wc -l` at spec-emit; R88 false-compliance-attestation lesson (verbatim command output) was not applied to empirical integers in P0 rows.

2. **MINOR-2 (gap incompleteness):** Architect audited § 3.1 exports enumeration (~34 entries) but did NOT walk the gap-identification procedure systematically: for each AC "Then" clause, enumerate all branches of the spec-prescribed surface that the AC does NOT bind. Audit was visual/heuristic rather than structured. Root: § 5.4 table is a "soft" artifact (prose description, not executable); Architect relied on judgment rather than systematic enumeration per R74 MINOR-2 pairing discipline.

3. **MINOR-3 (pseudocode widening):** Implementer added context/documentation value (comment) beyond spec-prescribed verbatim text, treating the "1 line" as a soft suggestion rather than a byte-exact requirement. The comment improves clarity and is arguably good engineering; the violation is minimal and the delivery is sound. Root: spec pseudocode discipline is strict (Copy Verbatim; Do Not Interpret Or Extend); Implementer made a judgment call that the addition was beneficial.

4. **MINOR-4 (grep variance):** Architect cited a grep command output at spec-emit without re-running it or documenting the command structure precisely. When Reviewer re-ran the analogous query with different search scope (engine-scoped vs global ..), the count diverged. Root: Architect used the command as a qualitative reference ("confirm that imports span these modules") rather than as a quantitative attestation ("the count is 56"), but the spec text asserts the count numerically. Encoding a count claim requires encoding the command precisely + running it verbatim at spec-emit.

## Reinforcements added

**CLAUDE-ARCHITECT.md (3 new REINFORCED lines):**
1. 2026-05-21 — Empirical-baseline integer claims in § 0 P rows MUST cross-validate against files at spec-emit; run actual grep -c, record verbatim output.
2. 2026-05-21 — AC-scope and acknowledged-gap completeness: § 5.4 table must enumerate ALL uncovered branches, not examples.
3. 2026-05-21 — Empirical grep-count accuracy: commands sensitive to pattern/anchoring require Reviewer-verification result documentation.

**CLAUDE-ARCHITECT.md REINFORCED count: 24 → 27 (still well below 40-entry ERROR threshold).**

No new REINFORCED additions to CLAUDE-IMPLEMENTER.md (MINOR-3 is spec-pseudocode-widening; minor deviation; general pseudocode discipline reinforcements already in place from R74+). No new additions to CLAUDE-REVIEWER.md (all findings appropriately documented; no methodology violations). No new additions to CLAUDE-COMMON.md (all violations are role-specific).

## Watch list for next round

1. **Empirical-baseline integer reproducibility (P0 rows):** Watch for count claims in spec § 0 that omit the verifying command or use inferred counts. Future rounds should ALWAYS include the command that produced the integer. This is load-bearing for R88 false-compliance discipline when the integer is load-bearing for AC predictions or AC gap analysis.

2. **Acknowledged-gap closure timeline:** R90 documented two AC gaps (exports subpaths, script-body runtime test) as inactive but future-facing. R91 will consume the engine package (TESSERA-internal); R92 (DS-side adoption) will exercise the pack:engine script as the canonical entry. Consider whether R91/R92 should close these gaps proactively or accept forward-protection tests carry them.

3. **Grep-reproducibility across platforms:** The P0.13 divergence (56 vs 48) may reflect grep behavior differences across macOS, Linux, or grep implementation variants (GNU grep vs BSD grep). R90 was run on Darwin; future Reviewers on Linux could see further variance. Consider environment-agnostic assertions (e.g., "all observed `'../engine/...'` imports have matching exports subpaths") rather than count assertions ("56 imports").

4. **Scope-extension documentation at spec-emit:** R90 Architect added two scope extensions (pack:engine script, .gitignore line) and documented them as deliberate choices in § 8.3. This set a good precedent. Future rounds with scope extensions should similarly audit § 8.3 + mark extensions as [SCOPE-EXTENSION] in the assertion text so they're visible at quick read.

## Emerging cross-project patterns

No new cross-project reinforcement rules crossed the 3-instance threshold this round. The architect-claim-without-empirical-walk pattern remains at 9 tessera instances (R71, R72, R74, R86, R87, R88, plus 3 distinct variants from multiple rounds). R90 introduces a closely related but distinct pattern (empirical-baseline-integer not cross-validated) that may merit its own cross-project entry at next instance.

## Recommend reinforcement consolidation

**CLAUDE-IMPLEMENTER.md: 30 REINFORCED lines (at 30-entry threshold per R43 composite folding).** No immediate consolidation needed; count is at threshold but not exceeding. Monitor for next round; if additions exceed 32, consider:
- `scripts/consolidate-reinforcements.sh` (operator-gated; does not auto-run)
- Archive lines older than 180 days
- Re-index composite sub-variant headings if composite now has >15 sub-variants

All other CLAUDE-*.md files are well below 40-entry ERROR threshold. No action needed this round.

## Timeline

- **Round-start SHA:** `65edb85` (R90 directive commit)
- **Architect session:** 2026-05-21 (pre-emit grilling, spec-triad commit)
- **Implementer chore-A:** 2026-05-21 (GREEN commit `0353553`)
- **Reviewer HEAD:** 2026-05-21 (routing commit `7e9062b`)
- **Memorial-Updater (this session):** 2026-05-21
- **Phase 5 SLICE 3 chain budget:** R90 = package boundary; R91 = Tessera-internal consumption migration; R92 = DS-side adoption; R93 = SLICE 3 close + hygiene.

---

**STATUS: ROUND COMPLETE**

All 14 ACs PASS. 0 CRITICAL / 0 MAJOR findings. 4 MINOR violations all inactive (discipline-class; no delivery defects). All disciplines (pre-emit-grilling, halt-discipline, right-reasons-audit, role-boundary, anti-scope, TDD-discipline, context-isolation) confirmed across Architect, Implementer, Reviewer. Reinforcements appended. Next role: Operator (decision on R91 timing / wave planning).
